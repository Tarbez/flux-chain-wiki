# DEFXN component audit: from hand-built DOM to Ark UI components

Audit date: 2026-10-19. Scope: `flux/defxn` (public site and CMS) against `design/ark-ui`,
`design/ark-primitives`, `design/ark-elements`, `design/ark-a11y` and `design/deadark-sdk`.
This is a read-only audit. No product code was changed.

Owner directive: *"port ark ui primitives as premade components to use ... turn our site into
real component rich instead of doing hard coded things."*

Laws this plan follows (see `/Volumes/PortableSSD/AGENTS.md`):
- **Centralize, don't duplicate.** A pattern that Ark UI lacks is added to Ark UI. It is never
  built locally in defxn.
- **SDK theme is the source of truth.** Consumers update through the SDK CLI, never by copying
  files by hand.
- **Derive, don't author.** The CMS block list and prop editors come from the block registry. They
  are not a second list typed out by hand.
- **Future law.** Saved CMS records are never rewritten.
- **Absent is not 0.**
- **The fold rule.**
- **Redesign dresses, never removes.**

---

## 0. Method and how far to trust the numbers

- **Use counts.** These are class tokens found inside string literals in `js/pages/*.js`,
  `js/resolvers/**`, `js/ark/dash-kit.js`, `js/ark/story-diagrams.js`,
  `js/ark/reference-docs.js`, `js/main.js`, `js/content/{learnings,resolutions,resolver-block}.js`,
  `api/lib/render-core.mjs` and `index.html`. A token was counted only if it matches a class
  selector defined in `css/*.css`.
- **They are lower bounds.** Classes built by string concatenation are partly missed. So are
  classes inside `innerHTML` strings that use double quotes. `stats-gpu.js`, `stats-ledger.js`
  and `resolvers.js` are mostly built that way.
- **"Distinct signatures".** For each pattern family I counted the distinct sets of visual
  declarations (radius, padding, size, tracking, colour and so on) across `css/*.css`. The
  generated `themes.css` and `flux-themes.css` were left out. This is a proxy for how many
  versions of the pattern look different on screen.
- **Fold ratios.** These come from the sibling crawl `docs/ux-audit/pages-crawl.tsv`
  (`fold1440` / `fold390`).
- **Reproducing the counts.** The scan scripts used for this audit are at
  `/private/tmp/claude-501/-Volumes-PortableSSD/a51a7d03-a815-4ae1-960d-76c01ee0b2ce/scratchpad/scan.mjs`
  and `.../variants.mjs`. They are temporary. Wave 0 below turns them into a repo script with a
  `--check` mode, so this document's numbers are derived rather than typed out.
- **`deadark-ui-lab` does not exist anywhere under `/Volumes/PortableSSD`.** I checked with a
  bounded `mdfind` and a two-level `ls`. Ark UI (`design/ark-ui`) is the de facto UI reference.
  AGENTS.md also asks you to check `write.deadark.com`, `articles.deadark.com` and `ark-app`
  before changing UI. Every new Ark part should be checked against those three.

---

## 1. What Ark UI already provides

### 1.1 Shape

| Layer | Entry | What it is |
|---|---|---|
| Runtime | `@deadark/ark-ui/runtime` (`ark-ui.runtime.ts`, 2,281 lines; dist 93 KB raw / 24 KB gz) | `createArkUI()`. It is a ref-based renderer for Flux pattern strings (`F-CARD-X-DARK-D-COLUMN .R-T-M-TITLE.`). Its key order is F R S D M A X C T P. It provides `update(ref, data)`, `configureRef(ref, {attrs})` and `onAction`. Styles are atomic and come from style objects. |
| Components pack | `@deadark/ark-ui/components` (`ark-ui.components.ts`, 4,093 lines; dist 178 KB / 35 KB gz) | Pure schema registrations (`registerArkComponents(ui, theme)`). The list follows this table. |
| Primitives | `@deadark/ark-primitives/*`, re-exported by `@deadark/ark-ui/primitives` | Behaviour factories: `createArkTabs`, `createArkAccordion`, `createArkDisclosure`, `createArkCollapsible`, `createArkCodeBlock` (with a copy action), `createArkAlert` / `createArkAlertDialog`, `createArkDialog`, `createArkPopover`, `createArkSheet` / `Drawer`, `createArkMenu`, `createArkMenubar`, `createArkNavigationMenu`, mega-menu, `createArkSelect`, `createArkCombobox`, `createArkField` / `Form`, `createArkCheckbox(Group)`, `createArkRadioGroup`, `createArkToggle(Group)`, `createArkButtonGroup`, `createArkBreadcrumbs`, `createArkPagination`, `createArkProgress` / `Spinner` / `Skeleton` / `LoadingMark`, `createArkSeparator`, `createArkAspectRatio`, `createArkScrollArea`, `createArkSidebar`, `createArkSlider`, `createArkCarousel`, `createArkResizablePanels`, `createArkChart` (line / bar / area), calendar, date picker, toast region, avatar, item, marker, message bubble and the command surface. |
| Core composites | `@deadark/ark-ui/core` | DataTable, DatePickerField, CommandPalette, AttachmentPanel, AppNav, NotificationCenter, SettingsForm. |
| Page builders | `@deadark/ark-ui/page-builders` | A schema-driven page assembler (`ArkPageSchema {chrome, sections[]}`). It accepts only a closed whitelist of 7 section kinds, all app-shaped (data-table, settings-form and so on). It has no content or marketing sections. |
| Native elements | `@deadark/ark-elements` (re-exported by `@deadark/ark-ui/elements`) | Custom elements: `flux-button`, `flux-dialog`, `flux-authorization-dialog`, `flux-menu`, `flux-tabs`, `flux-select`, `flux-combobox`, `flux-popover`, `flux-sheet`, `flux-drawer`, `flux-command`, `flux-date-picker`, `flux-calendar`, `flux-otp-field`. They use **light DOM and no shadow root**, and registration is opt-in. That makes them friendly to server-rendered markup. |
| a11y infrastructure | `@deadark/ark-a11y` | Roving focus, focus scope, dismissable layer, presence, live region, overlay and element-style (CSP) helpers. |
| CSS ahead of time | `ark-ui.build.ts` `buildArkCss()` | Extracts style objects into a static CSS file "you can serve without executing JS first — for SSR, a strict CSP". |
| Theme | `@deadark/sdk/theme` (`deadark-theme css` / `themes`) | Semantic HSL-channel tokens. The `deadark-chat` recipe in `ark-ui.components.ts:1697` already maps Ark tokens onto SDK variables (`hsl(var(--surface))` and so on). The `deadark-foundation` brand template sets label tracking to 0.08em, uppercase. |
| CMS schema | `@deadark/sdk/cms` (`src/cms/index.ts`) | `CMS_BLOCK_TYPES = hero, text, media, grid, cta, nav, footer, articleList, threadList`. Each has a zod schema; for example `hero {eyebrow, title, subtitle, media, actions[], align}`. `CMS_RENDERER_CONTRACT` forbids React code, custom CSS and scripts. |

The components pack covers these parts: BUTTON tones (PRIMARY, SECONDARY, GHOST, LINK, DANGER,
SUCCESS, WARNING, SUBMIT, CANCEL, DELETE), BADGE tones (SECONDARY, OUTLINE, GHOST, LINK, SUCCESS,
WARNING, DANGER), CARD (+ HEADER, TITLE, DESCRIPTION, BODY, FOOTER, ACTIONS; `radiusSm` by law),
STAT / STATLABEL / STATVALUE / STATTREND (UP / DOWN), STEPPER / STEP (CURRENT, DONE, PENDING),
TABS (LIST, TRIGGER, CONTENT, INDICATOR), ACCORDION (ITEM, HEADER, TRIGGER, CONTENT, CONTENTBODY),
COLLAPSIBLE, CODEBLOCK (+ TRIGGER, CONTENT, CODE), TABLE (WRAP, CAPTION, FOOTER, THEAD, TBODY, ROW,
CELL, HEADERCELL), ALERT, BREADCRUMBS (+ ELLIPSIS), PAGINATION, BUTTONGROUP, TOGGLEGROUP,
RADIOGROUP, FIELD / FIELDSET / INPUTGROUP / FORM, the text meanings (HEADING, TITLE, SUBTITLE,
LEAD, BODY, CAPTION, META, LABEL, HELPER, ERROR, KBD, CODE, NUMBER), SECTION, PANEL, TOOLBAR,
EMPTY, SKELETON, SPINNER, PROGRESS, SEPARATOR, MEDIA, MARKER, ITEM, POPOVER, MODAL, SHEET, DRAWER,
AVATAR and ARKMARK.

**Other properties:**
- **Framework-free.** Everything is vanilla DOM and ES modules. React and form adapters are
  optional add-ons.
- **SSR.** There is no HTML-string renderer. Server-side rendering works by running the DOM code,
  which is what defxn already does in jsdom, plus static CSS from `buildArkCss`.
- **a11y.** `PRIMITIVE_CONTRACT.md` requires ARIA, keyboard, focus and dismiss tests for every
  primitive.

### 1.2 How defxn consumes Ark UI today

| What | How it arrives | Path |
|---|---|---|
| `FluxMemoryStore`, `FluxAnimate`, element-style | Hand-run concatenation script. It strips `import` and `export` with a regex and records sha256 per source. | `scripts/sync-ark.cjs` → `js/ark/vendor/engines.js` (51 KB, dated 2026-09-22) |
| Backgrounds | Separate script | `scripts/sync-ark-backgrounds.cjs` → `js/ark/vendor/backgrounds.js` (75 KB) |
| Settings popover (`createArkUI`, headless component, `createArkPopover`, backgrounds) | esbuild IIFE. The entry imports **absolute** `/Volumes/PortableSSD/design/ark-ui/dist/...` paths. | `scripts/settings-entry.js` + `scripts/build-settings.cjs` → `js/settings/panel.js` (77 KB min) |
| `flux-authorization-dialog` | esbuild IIFE `ArkFluxElements` | `scripts/elements-entry.js` + `scripts/build-auth.cjs` → `js/admin/vendor/flux-elements.js` |
| SDK theme CSS | **Through the SDK CLI (correct)** | `build-settings.cjs` runs `deadark-theme css` and writes `css/themes.css` |
| Everything else on the site | **Not consumed.** defxn has its own 166-line `ArkUI` global (`js/ark/runtime.js`: `register` / `build` / atomizer / emergence over the local `ArkFlux.parse`). It shares the name with `@deadark/ark-ui` but is not the same runtime. | `js/ark/runtime.js`, `js/ark/flux.js`, `js/ark/atomizer.js` |

There are also local re-implementations of things Ark already ships:
- `js/admin/primitives.js` re-implements tabs and disclosure (109 lines). Its comment says it
  "mirror[s] the ARK primitives contract". (Deleted 2026-10-19, W3-EDITOR: `js/admin/ark-host.js`.)
- `js/ark/icons.js` is a 54-line icon sheet next to `@deadark/ark-ui/icons`.
- `js/ark/dash-kit.js` is a local stat, panel, table and bar kit (208 lines).

**Delivery is broken at the root.**
- `/Volumes/PortableSSD/shared/` is empty; the packages now live in `/Volumes/PortableSSD/design/`.
- `sync-ark.cjs` defaults to `/Volumes/PortableSSD/shared`.
- The canonical `design/deadark-sdk/bin/sync-shared-deps.mjs` reads `join(hubRoot, 'shared')`.
- `npm run workspace:route` still resolves `ark-ui` to `shared/ark-ui`.

So nothing defxn vendors can be refreshed by any sanctioned path today. The only build that works
(`build-settings.cjs`) does so by hard-coding absolute `design/` paths. None of defxn's
`package.json` dependencies is an `@deadark/*` package.

---

## 2. Hand-built UI in defxn: inventory

**Scale.**
- 33 page modules hold 10,197 lines of JS together with the resolvers.
- `index.html` loads 81 scripts (about 976 KB raw) and 51 stylesheets (about 750 KB raw;
  `css/` gzips to about 157 KB). Every stylesheet is loaded on every route.
- Across `css/` there are 117 `text-transform: uppercase` rules, 27 distinct px border-radius
  values and 64 distinct px font sizes.

| # | Pattern | Use sites (lower bound) | Class names | Distinct visual signatures | Representative files:lines |
|---|---|---|---|---|---|
| 1 | **Button / action** | 107 `button` / `a` creations in 21 files. There are 5 paint variants (solid, soft, quiet, choice, link), reached through **44 class names** listed in `css/components.css` selector lists with 34 `!important`. | solid 17, quiet 10, choice 11, soft 3, link 3 | 5 paints, but sizes and radii differ per page (e.g. `resolver-lab-next` overrides to a 999px radius) | `css/components.css:24-60`; `about.js:143`; `home.js:227`; `resolutions.js:192`; `sheet.js:79`; `deploy.js:156` |
| 2 | **Eyebrow / kicker** | 65 | 25 `*-kicker` / `*-eyebrow` names plus about 30 `*-label` eyebrows | **58 signatures in 31 CSS files.** Letter-spacing alone takes more than 20 values (.02em to .24em). | `explorer.js:112`; `deploy.js:13`; `sheet.js:36`; `economy-preview.js:29`; `lifecycle.js:101`; `resolutions.js:74`; `stats.js:79`; `bundle-deployer.js:11`; `resolver-lab.js:273` |
| 3 | **Page header / hero** (eyebrow, h1, lede, actions) | 25 `h1` sites in 22 files. The h1 uses 6 class conventions: none, `hl-title`, `learning-heading`, `dash-h1`, `article-title`, `visually-hidden`. | 23 hero / intro / lede names | **40** | `about.js:136-143`; `home.js:150-158`; `resolutions.js:72-75`; `stats.js:79-81`; `account.js:58`; `bundle-deployer.js:11-15`; `deploy.js:13-14`; `sheet.js:36-37`; `resolver-lab.js:273-275`; `palette.js:31-35` |
| 4 | **Tabs / choice pickers** | 25 class uses. `aria-pressed` appears on 41 lines in 18 files. There are 4 hand-built `role=tablist` and 6 hand-written arrow-key handlers, and `chain.js` has none. | 37 | **34** | `chain.js:46-77`; `home.js:214-241`; `resolutions.js:94-137,200-325`; `how-stories.js:44`; `account.js:75`; `economy-preview.js:40`; `explorer.js:180,602`; `learnings.js:234`; `js/admin/primitives.js:8` |
| 5 | **Note / callout** | 49 (`dash-note` alone is 30) | 28 | 21 | `resolver-math.js:290,579,626`; `explorer.js:625-642`; `economy-preview.js:32,143`; `bundle-deployer.js:44,57,64`; `palette.js:56` |
| 6 | **Stat tile** | 95 (inflated by grid-span helpers). There are 23 `stats-tile-copy`, plus `dash-stat`, `hl-metric` and `mesh-explorer-stat`. **Two parallel vocabularies:** `stats.css` (`stats-tile`) and `stats-dashboard.css` (`dash-stat`). **`function tile()` is copied into 3 pages** as `innerHTML` strings with copy written into the code. | 17 | 21 | `stats-gpu.js:37`; `stats-ledger.js:60`; `resolvers.js:19`; `dash-kit.js:52`; `home.js:283`; `explorer.js:815` |
| 7 | **Card / panel** | 43 | 29 | **29 in 15 files** | `rblock-card-v1.js`; `dash-kit.js:28`; `home-flow.js:273-353`; `how-stories.js:25`; `download.js:37`; `deployment.js:45-52`; `resolutions.js:96`; `resolvers.js:54` |
| 8 | **Next / continue links** | 40 | 21 | 24 | `about.js:189-216` (8); `lifecycle.js:154`; `resolver-guide.js:35`; `sheet.js:113`; `economy-preview.js:61-80,144`; `resolutions.js:345-352`; `learnings.js:140`; `resolver-lab.js:309` |
| 9 | **Section header** (label, title, plain line, note) | 17. `function section()` is duplicated in `about.js:119` and `home.js:126`, next to `dash-kit` `sectionHead`. | 9 | 11 | `about.js:121`; `home.js:128`; `explorer.js:112-120`; `resolutions.js:243-283`; `dash-kit.js:39-45` |
| 10 | **Step list** | 27 | 19 | 25 | `how-stories.js:29-33`; `download.js:76-82`; `deploy.js:64-74`; `bundle-deployer.js:26-28`; `resolutions.js:287-290`; `lifecycle.js:173`; `about.js:157,195`; `resolver-lab.js:326` |
| 11 | **Back link** | 18 sites in 8 files | 16 | 16 | `deploy.js:19,149`; `sheet.js:18`; `chain.js:36`; `account.js:94,105`; `bundle-deployer.js:65`; `explorer.js:480,637,686`; `header.js:560-621` |
| 12 | **Form field** | 45 | 42 | n/a | `account.js:23,94-112,384,712,1093`; `explorer.js:411,657-691`; `resolver-math.js:391-436,657-727`; `economy-preview.js:124`; `resolver-lab.js:333` |
| 13 | **Chip / pill / badge** | 17 in 9 files | 18 | 14 | `explorer.js:508-580`; `palette.js:19,59`; `resolutions.js:259`; `resolver-math.js:281,663,687`; `stats.js:85,553`; `home-flow.js:155`; `step.js:56` |
| 14 | **Table** | 20 | 6 | 4 (`border-collapse` collapse vs separate; 11 / 13 px) | `stats.js:124-488` (7 tables); `dash-kit.js:73`; `learnings.js:124,235`; `bundle-deployer.js:48`; `stats-ledger.js:141` |
| 15 | **Accordion / disclosure / FAQ** | 9 `details` / `summary` lines in 5 files; `hl-faq` 5 times; `aria-expanded` 7 times | 7 | n/a | `home.js:200,292`; `about.js:184`; `sheet.js:54,112`; `deploy.js`; `learnings.js`; `stats.js:545`; `js/admin/primitives.js:76` |
| 16 | **Popover / menu / nav toggle** | header: chain popover, products mega menu and nav toggle, with their own Escape and focus code; explorer: 2 popovers | 9 | n/a | `header.js:85-143,171-317,481-598`; `explorer.js:108,119-123,212` |
| 17 | **Live status / toast** | `aria-live` on 20 lines in 13 files, all hand-rolled; the `toast` class is defined but never used | n/a | n/a | spread across pages; admin uses `A.toast` |
| 18 | **Diagram / figure frame** | 7 class uses and 9 `figure`. `ArkUI.drafting` / `createStoryDiagram` is a local SVG vocabulary. | 5 | n/a | `resolver-guide.js:29`; `sheet.js:107`; `experiment.js:14`; `about.js:30,149`; `home.js:335`; `resolver-math.js:406`; `story-diagrams.js` |
| 19 | **Proportional bars** | `dash-bars*` 8 each | 4 | n/a | `dash-kit.js` `bar()`; `stats.js` |
| 20 | **Description list (facts)** | `dl` on 12 lines in 7 files | n/a | n/a | `economy-preview.js`; `explorer.js`; `account.js`; `how-stories.js`; `download.js` |
| 21 | **Empty state** | 12 | 6 | n/a | `stats.js:116-168` (`dash-empty`); `account.js:103`; `explorer.js:486` |
| 22 | **Code block** | 3 | 2 | n/a | `download.js:58`; `economy-preview.js:47,52` |

The CMS has its own typed blocks:
- 6 typed blocks plus one captured kind: `RBLOCK_TEXT_V1`, `CTA_V1`, `IMAGE_V1`, `CARD_V1`,
  `QUOTE_V1`, `DIVIDER_V1` and `RBLOCK_CAPTURED_V1`.
- Each is a defxn-local resolver with inline atom styles (`js/resolvers/blocks/*.js`).
- The whitelist, props and labels are written out by hand in `js/content/components.js:46-74`.
- `@deadark/sdk/cms` already defines a canonical block schema (`hero`, `text`, `media`, `grid`,
  `cta` and more) that defxn does not use. That is a second, smaller copy of the same idea.

### 2.1 Per-page density (where the patterns concentrate)

| Page module | Lines | Eyebrows | Buttons / links | Choice | Notes | Next | Steps | Fold 1440 / 390 |
|---|---|---|---|---|---|---|---|---|
| stats.js | 937 | 2 | 2 | 0 | 22 | 1 | 0 | **12.53 / 20.63** |
| stats-ledger.js | 214 | (innerHTML) | | | | | | **8.89 / 14.50** |
| resolver-math.js | 816 | 3 | 2 | 0 | 9 | 0 | 0 | **8.36 / 13.42** |
| resolvers.js | 112 | (innerHTML) | | | | | | **3.93 / 7.75** |
| stats-gpu.js | 101 | (innerHTML) | | | | | | **1.89 / 3.09** |
| palette.js | 91 | 1 | 9 | 1 | 2 | 0 | 0 | 2.67 / 4.41 |
| about.js | 292 | 6 | 2 | 1 | 0 | 7 | 3 | 2.08 / 2.65 |
| home.js | 364 | 8 | 4 | 3 | 1 | 7 | 0 | 2.39 / 2.72 |
| economy-preview.js | 173 | 12 | 15 | 4 | 3 | 6 | 0 | |
| resolutions.js | 370 | 12 | 6 | 5 | 1 | 4 | 3 | |
| resolver-lab.js | 514 | 11 | 13 | 2 | 0 | 3 | 4 | |
| sheet / deploy / resolver-guide / lifecycle / how-stories / download | 54–202 | 4–9 each | 4–12 | 1–4 | 0 | 1–3 | 2–11 | about 1.0 |
| explorer.js | 973 | 6 | 31 | 13 | 6 | 0 | 1 | |
| account.js | 1,126 | 1 | 1 | 10 | 0 | 0 | 0 | |
| header.js (resolver) | 672 | 14 | 20 | 0 | 1 | 2 | 1 | shell |

The stats family is both the most duplicated code (three copies of `tile()`, built with innerHTML
and copy written into the code) and the worst fold violation on the site (11 of 69 routes exceed
1.6x on phone). Components that bound height are what the fold rule asks for: tabs, an accordion
claim stack, and a data table with a capped, scrolling body.

---

## 3. Mapping: defxn pattern → Ark UI

| defxn pattern | Ark UI target (exact name) | Status |
|---|---|---|
| Button solid / soft / quiet / link | `PRIMARY\|BUTTON`, `SECONDARY\|BUTTON`, `GHOST\|BUTTON`, `LINK\|BUTTON`; `flux-button` element | **exists.** Map the paint to SDK tokens through the `deadark-sdk` recipe (gap G12). |
| Button "choice" (selected-state pickers) | `createArkToggleGroup` + `TOGGLEGROUP`; single choice is `createArkRadioGroup` | exists |
| Eyebrow / kicker | nearest are `META\|TEXT` and `LABEL\|TEXT`; SDK CSS has `.dak-sdk-eyebrow` | **missing as an Ark part:** add `EYEBROW\|TEXT` (G1) |
| Page header / hero | parts `HEADING` / `TITLE`, `LEAD`, `CARDACTIONS`; schema `@deadark/sdk/cms` `hero` | **missing composite:** add the `hero` block (G2) |
| CTA row | `CARDACTIONS` is card-scoped only; `BUTTONGROUP` means *joined* buttons, so it does not fit | **missing:** add an `ACTIONS` part (G3) |
| Tabs | `createArkTabs` + `TABS`, `TABSLIST`, `TABSTRIGGER`, `TABSCONTENT`, `TABSINDICATOR`; `flux-tabs` | exists |
| Note / callout | `createArkAlert` + `ALERT` (tones info, success, warning, danger); quiet notes use `HELPER\|TEXT` or `CAPTION\|TEXT` | exists. **Add tones `drift` and `reference`** (SDK meanings) (G9). |
| Stat tile | `STAT`, `STATLABEL`, `STATVALUE`, `STATTREND` (`UP\|` / `DOWN\|`) | exists. **Add `STATUNIT`, `STATDETAIL` and an `absent` state** that shows no number when the feed is down, never 0 (G8). |
| Card / panel | `CARD`, `CARDHEADER`, `CARDTITLE`, `CARDDESCRIPTION`, `CARDBODY`, `CARDFOOTER`, `CARDACTIONS`; `PANEL` | exists |
| Next / continue links | `PAGINATION` is numbered, so it does not fit | **missing:** add the `pager` block (prev/next with title and summary, driven by manifest `meta.next`) (G5) |
| Section header | parts `SECTION`, `HEADING`, `LEAD` | **missing composite:** add the `section-header` block (G4) |
| Step list (static how-to) | `STEPPER`, `STEP`, `CURRENT\|STEP`, `DONE\|STEP`, `PENDING\|STEP` (progress-shaped) | partly exists. **Add a static ordered mode to the `steps` block** (G10). Interactive "one active step" flows use `createArkTabs` / `STEPPER`. |
| Back link | `createArkBreadcrumbs` + `BREADCRUMBS` (a one-parent trail) | exists |
| Form field | `createArkField`, `FIELD`, `FIELDSET`, `INPUT\|TEXT`, `LABEL\|TEXT`, `HELPER\|TEXT`, `ERROR\|TEXT`; `createArkForm`; `createArkSelect` / `native-select` | exists |
| Chip / badge | `BADGE`, `*\|BADGE\|TEXT`; filter chips use `TOGGLEGROUP` | exists. **Add the SDK meaning tones** `trust`, `live`, `role`, `drift`, `reference` (G8). AGENTS.md says badges must mean something real. |
| Table | `TABLE`, `TABLEWRAP`, `THEAD`, `TBODY`, `CELL`, `HEADERCELL`, `TABLECAPTION`; `createArkCoreDataTable` for sort and search | exists. Numeric columns use `NUMBER\|TEXT`. |
| Accordion / FAQ / disclosure | `createArkAccordion` + `ACCORDION*`; `createArkDisclosure` / `createArkCollapsible` | exists |
| Popovers, mega menu, nav toggle | `createArkPopover` / `flux-popover`, `createArkNavigationMenu`, mega-menu (`MEGAMENU*`), `createArkSheet` (mobile nav), `createArkMenu` / `createArkSelect` (network picker) | exists |
| Live status / toast | `toast-region` + `createLiveRegion` (ark-a11y) | exists |
| Diagram / figure frame | `MEDIA`, `createArkAspectRatio` | **missing:** add the `figure` block with caption and accessible description (G6). Promoting `ArkUI.drafting` to `@deadark/ark-ui/drafting` comes later (G13). |
| Proportional bars | `createArkChart` (`type: "bar"`) or `PROGRESS` | partial. Check that the chart renders static bars under jsdom; otherwise **add `METER`** (`role=meter`) (G11). |
| Description list (facts) | none | **missing:** add the `facts` block (`dl` / `dt` / `dd`) (G7) |
| Empty state | `EMPTY`, `EMPTY\|TEXT`, `SKELETON` | exists |
| Code block | `createArkCodeBlock` + `CODEBLOCK*` (with copy) | exists |
| Quote (`RBLOCK_QUOTE_V1`) | none | **missing:** add the `quote` block (blockquote, cite) (G14) |
| Divider (`RBLOCK_DIVIDER_V1`) | `createArkSeparator` / `SEPARATOR` | exists |
| Icons (`js/ark/icons.js`) | `@deadark/ark-ui/icons` | exists. Migrate, and add any missing glyphs in Ark. |
| Admin tabs / disclosure (`js/admin/primitives.js`) | `createArkTabs`, `createArkDisclosure` | done 2026-10-19 (W3-EDITOR): deleted; `js/admin/ark-host.js` runs Ark's tabs, accordion (as the disclosure) and toggle group on `createArkDomHost`. |

---

## 4. Gaps to add to Ark UI (canonical locations)

| Id | Gap | Canonical path | Notes |
|---|---|---|---|
| G0 | **Blocks entry and registry** `@deadark/ark-ui/blocks`: `renderArkBlock(spec, ctx) → Element`, `ARK_BLOCKS` (name → `{parts, propSchema, render}`), and static CSS | `design/ark-ui/ark-ui.blocks.ts`, `design/ark-ui/blocks/*.ts`, `package.json` exports, `ark-ui.build.ts` → `dist/ark-ui.blocks.css` | Takes plain data and returns DOM. Does no I/O and keeps no global state. Prop schemas are taken from `@deadark/sdk/cms` zod schemas, so the CMS form is derived from the registry. Uses stable part classes and `data-ark-part`, never runtime atom classes (see risk R1). |
| G1 | `EYEBROW\|TEXT` part | `design/ark-ui/ark-ui.components.ts` | Mono, uppercase, tracking from `deadark-foundation.labelTracking`, colour `--text-faint`. Replaces 25+ names and 58 signatures. |
| G2 | `hero` block (page header): eyebrow, title (h1), lede, actions, optional media, `align`, `density` | `design/ark-ui/blocks/hero.ts` | Schema already exists: `cmsHeroBlockSchema`. |
| G3 | `ACTIONS` part (CTA row) | `ark-ui.components.ts` | Shared by hero, section-header, card and callout. |
| G4 | `section-header` block: eyebrow, title (h2), plain line, note | `blocks/section-header.ts` | Absorbs the `section()` copies in about.js and home.js and dash-kit `sectionHead`. |
| G5 | `pager` block: prev/next links with title and one-line summary | `blocks/pager.ts` | Driven by `meta.next` / `meta.back` from manifests. |
| G6 | `figure` block: frame, SVG or media slot, figcaption, `aria-describedby` long description | `blocks/figure.ts` | A diagram must be described rather than marked `aria-hidden` when it carries meaning. |
| G7 | `facts` block (description list) | `blocks/facts.ts` | |
| G8 | `STATUNIT`, `STATDETAIL`, `data-state="absent"` on STAT; BADGE meaning tones (`trust`, `live`, `role`, `drift`, `reference`) | `ark-ui.components.ts` | Absent-is-not-0 law. Badges follow SDK `.dak-sdk-badge--*`. |
| G9 | ALERT tones `drift` and `reference` | `design/ark-primitives/src/alert.js` (+ `.d.ts`) and `ark-ui.components.ts` | Drift (honey) means review or approval (AGENTS.md theme anatomy). |
| G10 | `steps` block with a static ordered-list mode | `blocks/steps.ts` | Reuses the STEPPER / STEP parts. |
| G11 | `METER` part, or confirm CHART bar SSR | `blocks/meter.ts` | Used by dash-kit `bar()`. |
| G12 | A `deadark-sdk` base recipe that maps every Ark token to SDK variables | `ark-ui.components.ts` `BUILTIN_STYLE_RECIPES` | Generalize the token block that `deadark-chat` already has, so every DeadArk consumer inherits it instead of repeating it. |
| G13 | `@deadark/ark-ui/drafting` (SVG drafting vocabulary: path, box, dot, word, story diagram) | `design/ark-ui/ark-ui.drafting.ts` | Promote from `defxn/js/ark/story-diagrams.js`. Second wave. |
| G14 | `quote` block | `blocks/quote.ts` | Needed to keep saved `RBLOCK_QUOTE_V1` masters working. |
| G15 | **A reserved prefix for generated ids** across ark-a11y and ark-elements (for example `ark-r-`) | `design/ark-a11y/src/dom.js`, `design/ark-elements/src/elements.js` (`flux-tabs-N`) | Counter-based ids must never become CMS layout keys (risk R4). |
| G16 | SDK CMS block types for every new block: `sectionHeader`, `callout`, `stats`, `steps`, `faq`, `tabs`, `table`, `code`, `figure`, `pager`, `facts`, `card`, `quote`, `divider` | `design/deadark-sdk/src/cms/index.ts` (`CMS_BLOCK_TYPES`, zod schemas, `CMS_RENDERER_CONTRACT`) | The schema lives in the SDK and the renderer lives in Ark UI. |
| G17 | **Delivery** | `design/deadark-sdk/bin/sync-shared-deps.mjs` (resolve the package directory from the workspace manifest, not the hard-coded `shared`); `deadark-theme sync-consumer` (also deliver the `@deadark/ark-ui` closure: ark-primitives, ark-elements, ark-a11y, ark-syntax, flux-state, as sha256-recorded tgz files); `.workspace/workspace-manifest.json` (`shared/ark-ui` → `design/ark-ui`, then `workspace:generate` and `workspace:doctor`) | Fix this once in the canonical tool, not in each consumer. |

---

## 5. Migration architecture

**10-line summary**
1. **Schema lives in the SDK and rendering lives in Ark UI.** Block types and their prop schemas
   go in `@deadark/sdk/cms` (extending `hero`, `text`, `grid`, `cta` and the rest). One
   framework-free DOM renderer per block type goes in a new `@deadark/ark-ui/blocks` entry. That
   renderer is built on the existing parts and primitives (tabs, accordion, alert, breadcrumbs,
   field).
2. **Styles ship as static CSS.** `buildArkCss` produces `dist/ark-ui.blocks.css` from the
   `deadark-sdk` recipe. Blocks emit stable part classes and `data-ark-part`, never runtime
   atoms. The SSR HTML is therefore styled, CSP-safe and themed only by SDK variables.
3. **Delivery goes through the SDK CLI.** `deadark-theme sync-consumer` installs the pinned,
   sha256-recorded `@deadark/ark-ui` closure. One defxn script (`scripts/build-ark-vendor.cjs`)
   bundles only the used entries from `node_modules/@deadark/*` into a classic IIFE
   (`js/ark/vendor/ark-kit.js`, global `ArkKit`) and copies the CSS. It replaces `sync-ark.cjs`,
   `sync-ark-backgrounds.cjs` and the esbuild halves of `build-settings.cjs` / `build-auth.cjs`,
   and has a `--check` drift test.
4. **defxn keeps its resolver engine as the composition layer.** A new
   `js/ark/blocks.js` registers every Ark block as an `ArkUI` resolver. The registrations are
   derived by looping over `ArkKit.ARK_BLOCKS`, not written out per block.
5. **Pages become data.** A page module returns a spec like
   `[{block:'hero', props:{eyebrow:'copy:ABOUT.EYEBROW', title:'copy:ABOUT.TITLE', ...}}, {block:'tabs', ...}, {insert:'main'}]`.
   `ArkUI.page(spec, host)` builds it. Copy stays in manifests (copy keys). Bespoke scenes
   (hero motion, chain flow, explorer canvas) become `{block:'custom', mount:fn}`, the same escape
   hatch the Ark page builder uses.
6. **The CMS Library is derived.** In `js/content/components.js`, `RESOLVERS`, `RESOLVER_PROPS` and
   `RESOLVER_LABELS` come from the registry. `js/admin/library.js` and `controls.js` render prop
   editors from each prop's schema kind (line, text, link, icon, enum, list). Every Ark block is
   then a premade, insertable component with editable props, kept as the existing thin-pointer
   instances `{key, masterId, overrides}`.
7. **Saved data is never rewritten.** `RBLOCK_*_V1` stay registered as read aliases with prop
   adapters (for example CARD `{icon, title, text}` → card `{icon, title, description}`). Layout,
   state and motion keys that would move are carried forward by an append-only key-alias record
   (risk R3).
8. **a11y is inherited, not re-implemented.** Interactive blocks wrap
   `createArkTabs` / `createArkAccordion` / `createArkToggleGroup` / `createArkPopover` or the
   `flux-*` elements. Each block ships Ark's contract tests (ARIA, keyboard, focus, dismiss) plus
   a jsdom render test.
9. **Tokens.** Blocks read only SDK semantic tokens through the `deadark-sdk` recipe: `--canvas`,
   `--surface`, `--raised`, `--nested`, `--overlay`, `--text-*`, and the meaning tokens. Wrap
   them as `hsl(var(--token, fallback))`. They stay within the three font slots (display, sans,
   mono), and cards use `radiusSm`. `css/components.css`'s `!important` selector lists and the
   page-local family rules are deleted family by family as pages migrate.
10. **Order.** Plumbing first. Then Ark gaps (parallel, by file). Then the defxn adapter and
    Library. Then pages: stats family → guided/story template → about/home statics → product
    pages → learnings. Interactive-heavy modules (header, explorer, account, resolver-lab,
    home-flow) go last.

### 5.1 Data shape (fits the existing engine)

```js
// js/pages/about.js after migration (illustrative)
ArkUI.pageModules.about = { mount: function (host) {
  return ArkUI.page([
    { block: 'hero', id: 'about-hero', props: {
        eyebrow: 'copy:ABOUT.EYEBROW', title: 'copy:ABOUT.TITLE', lede: 'copy:ABOUT.DECK',
        actions: [{ label: 'copy:ABOUT.ACTION', href: 'route:concept', tone: 'primary' }] } },
    { block: 'section-header', id: 'about-model', props: { eyebrow: 'copy:ABOUT.MODEL.TITLE', plain: 'copy:ABOUT.MODEL.TEXT' } },
    { block: 'tabs', id: 'about-layers', props: { label: 'Layers', items: [/* ... */] } },
    { block: 'faq', id: 'about-faq', props: { items: [/* copy keys */] } },
    { insert: 'main' },                                   // the CMS anchor, owned by ArkUI.page
    { block: 'pager', id: 'about-next', props: { next: 'meta:next' } }
  ], host, { page: 'about', labelledBy: 'about-hero' });
} };
```

- **Value prefixes.** `copy:` values resolve through `ArkCopy` and stamp a public
  `data-ark-copy-keys` (not the editor-only `data-ark-copy-preview`), so text layout keys become
  `copy:about.TITLE`. `route:`, `doc:` and `meta:` go through the existing
  `ArkUI.dash.resolveLinkField`. That function moves into the adapter so it lives in one place.
- **Stable ids.** Each block's `id` becomes the root element id, so its layout key is
  `id:about-hero`, which is stable across restructuring.
- **The `insert` anchor** is emitted by `ArkUI.page`. The 30 hand-placed `data-ark-insert`
  anchors in 28 page modules collapse into one owner, and the anchor ids are kept.

### 5.2 SSR (`api/lib/render-core.mjs`)

Nothing about the SSR path changes. jsdom still runs the real client and waits for
`ark:route-ready`. For it to stay correct:
- Blocks render **synchronously** before `ark:route-ready`, with no lazy imports.
- Styles come from the static `ark-blocks.css`. Rules inserted with
  `adoptedStyleSheets` / `insertRule` are not serialized (R1).
- `flux-*` elements must not rebuild their children on upgrade. `FluxTabsElement` only sets
  attributes, which is correct.
- Add a parity test: render each converted route through `scripts/ssr-preview.mjs` and in the
  browser, then compare the text content and `data-ark-part` tree.

### 5.3 How components get into defxn

```
design/ark-ui (+ primitives/elements/a11y)  --npm run build-->  dist/
        |  deadark-theme publish-sdk / sync-consumer (sha256 tgz, manifest channel)
        v
defxn/node_modules/@deadark/{sdk,ark-ui,...}   (pinned in package.json; never hand-copied)
        |  node scripts/build-ark-vendor.cjs [--check]
        v
js/ark/vendor/ark-kit.js  (IIFE: blocks + used primitives + elements, source-hash header)
css/ark-blocks.css        (generated by buildArkCss; never hand-edited)
css/themes.css            (deadark-theme css, as today)
```

---

## 6. Ordered work plan (sized for parallel agents; disjoint file ownership)

### Wave 0: plumbing (2 agents; must land before Wave 2)

| Agent | Owns | Delivers |
|---|---|---|
| P0-1 | `design/deadark-sdk/bin/sync-shared-deps.mjs`, `design/deadark-sdk/bin/deadark-theme.mjs`, `/Volumes/PortableSSD/.workspace/workspace-manifest.json` (then `npm run workspace:generate` and `workspace:doctor`) | G17. The canonical sync resolves `design/`, and `sync-consumer` delivers the ark-ui closure with sha256. |
| P0-2 | `defxn/scripts/build-ark-vendor.cjs` (new); `defxn/scripts/{sync-ark.cjs, sync-ark-backgrounds.cjs, build-settings.cjs, build-auth.cjs, settings-entry.js, elements-entry.js}`; `defxn/package.json`; `defxn/js/ark/vendor/*`; `defxn/scripts/ux-component-census.mjs` (new, `--check`) | One vendor build from `node_modules`. The census script regenerates §2's counts so they are derived and checkable. |

### Wave 1: Ark UI canonical additions (7 agents, parallel)

U1 lands the registry interface on day one, and the others build against it.

| Agent | Owns | Delivers |
|---|---|---|
| U1 | `design/ark-ui/ark-ui.blocks.ts`, `ark-ui.build.ts`, `package.json` (exports), `tests/test-blocks-ssr.mjs` | G0: registry, `renderArkBlock`, static CSS build, jsdom render harness |
| U2 | `design/ark-ui/ark-ui.components.ts` (sole owner) | G1, G3, G8, G12 |
| U3 | `design/ark-ui/blocks/{hero,section-header,pager,back}.ts` | G2, G4, G5, and back-link on `createArkBreadcrumbs` |
| U4 | `blocks/{stat,stat-grid,table,facts,meter}.ts` | Stat, table, G7, G11 |
| U5 | `blocks/{callout,figure,code,quote}.ts`, `design/ark-primitives/src/alert.{js,d.ts}` | G6, G9, G14, code block |
| U6 | `blocks/{steps,tabs,faq}.ts`, `design/ark-a11y/src/dom.js`, `design/ark-elements/src/elements.js` | G10, G15; tabs and FAQ wrap the primitives |
| S1 | `design/deadark-sdk/src/cms/index.ts`, `design/deadark-sdk/tests/*` | G16 |

Every block needs Ark's testing minimum (PRIMITIVE_CONTRACT) plus a jsdom render snapshot.

### Wave 2: defxn integration (3 agents)

| Agent | Owns | Delivers |
|---|---|---|
| D1 | `js/ark/blocks.js` (new); `js/ark/dash-kit.js` (moves `resolveLinkField` into the adapter, the rest becomes a shim); `js/content/layout.js` (honour the G15 prefix and read the key-alias record); `tests/layout-key-continuity.cjs` (new) | Adapter, `ArkUI.page`, copy and link resolution, key continuity |
| D2 | `js/content/components.js`; `js/resolvers/blocks/*` (become alias shims); `js/admin/library.js`; `js/admin/controls.js`; `js/admin/primitives.js` (delete, use Ark tabs and disclosure) | A Library derived from the registry; RBLOCK read aliases |
| D3 | `css/ark-blocks.css` (generated), `css/components.css`, `index.html` (link and script order) | CSS cutover. Remove each `!important` selector list as its family migrates. |

### Wave 3: page conversions (5 agents, parallel)

Each agent owns its page modules, their CSS, their manifests and the tests that name their
classes.

| Agent | Pages (in this order) | CSS owned | Why this order |
|---|---|---|---|
| G1 **stats family (first)** | `stats-gpu.js`, `stats-ledger.js`, `resolvers.js`, then `stats.js` and `resolver-math.js` | `stats.css`, `stats-dashboard.css`, `resolver-math.css`, `resolvers.css` | Three copies of `tile()`, copy written into innerHTML, two stat vocabularies, and the worst fold ratios on the site (up to 12.5x / 20.6x). Tabs, an accordion and a capped table bring them within budget. |
| G2 guided/story template | `sheet.js`, `resolver-guide.js`, `deploy.js`, `lifecycle.js`, `how-stories.js`, `download.js`, `deployment.js`, `concept.js` | `guided-page.css`, `lifecycle.css`, `task-page.css`, `page-layout.css`, `site-direction.css`, `download.css`, `how-overview.css`, `experience.css` | Eight pages share one template: eyebrow, h1, lede, steps, diagram, next. One spec shape converts all of them. |
| G3 overview | `about.js`, then the **static sections only** of `home.js` (not the hero scene) | `about.css`, `home-swiss.css` | They share the `hl-*` vocabulary and the duplicated `section()`. Both are over budget (2.1–2.7x). |
| G4 product pages | `economy-preview.js`, `bundle-deployer.js`, `resolutions.js`, `reference.js`, `palette.js`, `chain.js` | `economy-preview.css`, `bundle-deployer.css`, `resolutions.css`, `reference.css`, `palette.css`, `chain.css` | High eyebrow and choice counts. `chain.js` has the tablist with no keyboard handling. |
| G5 learnings | `js/resolvers/learnings.js` | `learnings.css`, `article-reading.css` | Tables, back and next links, hand-rolled arrow keys |

### Wave 4: interactive-heavy (one agent each, sequential)

These go last because bespoke behaviour carries the highest risk of breaking a feature (the
"redesign dresses, never removes" law). Each gets the dedicated primitive:
- `js/resolvers/header.js`: `createArkNavigationMenu`, mega-menu, `createArkPopover`,
  `createArkSheet`.
- `explorer.js`: popovers, toggle groups, fields.
- `account.js` and `account-domains.js`: field, form, tabs, toast.
- `resolver-lab.js`: steps and toggle.
- `home-flow.js`: cards only; the scene stays custom.

**Component priority (occurrence × visible inconsistency):** button → eyebrow → hero → tabs and
pickers → callout → stat → card → pager → section header → steps → back link → field → badge →
table → accordion. After those: popover and menus → live region and toast → figure → meter →
facts → empty → code.

---

## 7. Risks

| Id | Risk | Evidence | Mitigation |
|---|---|---|---|
| R1 | **SSR loses Ark styles.** The `@deadark/ark-ui` runtime injects CSS through `adoptedStyleSheets` and `insertRule` (`ark-ui.runtime.ts:998-1037`). jsdom serialization drops both, so bots would get unstyled HTML. defxn's own atomizer appends text nodes, which serialize. | code read | Blocks use only static `ark-blocks.css` (`buildArkCss`) with part classes. Do not use `createArkUI` atoms on SSR'd pages. Add an SSR parity test (§5.2). |
| R2 | **Bundle size.** 51 stylesheets (about 750 KB raw) and 81 scripts (about 976 KB) load on every route. The full Ark components pack is 35 KB gz and the runtime 24 KB gz. | measured file sizes, 2026-10-19 | Bundle only `blocks` plus the primitives actually used (tree-shaken IIFE). Budget is +30 KB gz of JS at most. CSS must be **net-negative** per wave, because each family's page-local rules are deleted when it migrates. Measure per-route gzip transfer before and after at the same commit, and state the device. **Standing 2026-10-19 (W3-BUDGET, `gzip -9 -c | wc -c` of the shipped files, this Mac):** a block route adds kit 24.0 + adapter 4.0 (served minified) = 28.0 KB gz (was 33.0 after W3-ARK-FOLLOWUPS), +1.4 only where a page updates a live block (`js/ark/vendor/ark-kit-live.js`), +2.9 with the glossary (so /stats, live + terms, is 32.3: over by the glossary's 2.3), +0 on a route with no block. Public CSS linked by `index.html`: 160.4 -> 121.7 KB gz against 5a1ac71, **-38.7 net**. Ledger and what moved: `docs/cms-architecture.md` "Pages as data", Budget. |
| R3 | **Saved CMS edits orphaned.** ArkLayout, ArkStates, ArkComponents spots and ArkElementMotion key elements by structural path (`page:/section:0/div:2`, `layout.js:245-283`) unless the element has an `id` or a *public* copy key. Page modules call `ArkCopy.text()` without stamping copy keys, so nearly every page element has a path key. **Any restructuring re-keys them.** | `js/content/layout.js` `baseKey` / `segment` | (a) Before converting each page, list every saved key in all drafts (connected folders) and published mesh bundles. The in-repo `*-data.js` files are all empty as of 2026-10-19, but unpublished drafts and mesh bundles may not be. (b) Converted blocks carry stable `id:` and `copy:` keys. (c) A converter renders the old and new DOM in jsdom and writes an **append-only** alias record (`{supersedes, key}`, future law) that `ArkLayout.find` consults. (d) Add `tests/layout-key-continuity.cjs`. |
| R4 | **Generated ids become layout keys.** `baseKey` ignores only `/^ark-r-/` ids. `flux-tabs-N-*` and the admin `uid()` (`Math.random`) would become unstable `id:` keys that depend on mount order. | `layout.js:281`, `elements.js:412`, `primitives.js:6` | G15: one reserved prefix for generated ids, honoured by ArkLayout. |
| R5 | **Saved component masters.** Masters name `RBLOCK_*_V1` and `RBLOCK_CAPTURED_V1`. `sanitize()` drops unknown resolvers, so renaming the whitelist would silently delete masters. | `components.js:46-74` | Keep the `RBLOCK_*_V1` ids as permanent read aliases with prop adapters. Write new masters under new block ids. Never rewrite stored masters. `RBLOCK_CAPTURED_V1` is unchanged. |
| R6 | **Insert anchors.** `data-ark-insert` ids (30 sites) key `ArkComponents.routes[route][anchorId]`. | `components.js`, page modules | `ArkUI.page` emits the same anchor ids. Assert this in `tests/components-*.cjs`. |
| R7 | **Fold rule.** A hero or section header can grow a page. 11 of 69 routes are already over 1.6x on phone. | `pages-crawl.tsv` | Blocks take a `density` prop (compact or standard). Long content goes behind `faq` / `tabs` (the claim stack). Tables cap their height and scroll inside. After each wave, measure `scrollHeight / innerHeight` at 1440x900 and 390x844, per route and per inner state. A wave that pushes any route over 1.6x does not land. |
| R8 | **Cascade collisions.** `css/components.css` paints through `#scene :is(...)` lists with `!important`, and the base link rule targets `#scene a`. | `components.css` | Ark parts never reuse legacy class names. Remove each `!important` list in the same change that migrates its last user. |
| R9 | **Test coupling.** 25 test files assert page class names (`hl-`, `dash-`, `learning-heading`, ...). | grep `tests/` | Each page agent updates its own tests in the same batch. Every behavioural assertion is kept (the redesign law). |
| R10 | **Feature loss in bespoke pages.** | stats "no number when the feed is down", explorer live popovers, resolutions keyboard tabs | The `absent` stat state (G8). Every conversion keeps each interaction. Interactive modules go last (Wave 4). |
| R11 | **Delivery drift.** `shared/` is empty, the manifest points to `shared/ark-ui`, and the settings entry hard-codes absolute paths. Two consumers could build from different Ark sources. | §1.2 | Wave 0. One version resolves to one tarball, sha256-recorded, through the SDK CLI. |
| R12 | **Storage law.** The CMS stores `*-data.js` as JSON wrapped in JS. | AGENTS.md "No more JSON storage" | No new store (for example the key-alias record) may be JSON. Write it in the local store's own FLX grammar. Migrating the existing stores is out of scope for this audit, but they must not grow. |
| R13 | **Two runtimes called "ArkUI".** defxn's `ArkUI` global (166-line resolver engine) is not `@deadark/ark-ui`'s `createArkUI`. | `js/ark/runtime.js` | Keep defxn's engine as the composition layer and expose Ark under `ArkKit`. Document the split in `docs/cms-architecture.md` so the next agent does not "merge" them by copying. |
