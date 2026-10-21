# DEFXN UX audit: findings ledger (Wave 4)

Built 2026-10-20 by W4-LEDGER, read-only, from the working tree on disk (HEAD `45d6b1a` plus the uncommitted edits listed by `git status`). Baseline is `5a1ac71`; commits since: `3462ab4` wave 1, `2e1edea`, `05a936b`, `af33dc6` waves 2-3, `45d6b1a`. No test, browser, server, census or crawl was run: a status is FIXED only where a file:line or a named regression test shows it; anything that depends on rendered size, contrast, overflow or measured behaviour is **UNVERIFIED (needs browser)** and is for the Wave 4 browser sweep to decide.

Statuses: FIXED (cited), PARTIAL (what is left is said), OPEN (still true, cited), OWNER (needs an owner decision, named), OUT-OF-REPO (another repo, named), UNVERIFIED (needs browser). Severity is as each report gave it; `-` means the report gave none (brand.md, components.md and resolvers-content.md carry no P-levels). A row with no status is an informational line of the report (a measurement or a "what works" note) and is counted in the last column. Counts below are computed from the rows of each section, not copied from the section authors.

Method: CMS section by the coordinator; the other six reports were audited by one read-only sub-agent each (sonnet), each told to cite code and to prefer UNVERIFIED over guessing. Spot-checked by the coordinator: `finalized` at `js/pages/stats.js:84`, `js/pages/stats-ledger.js:99`, `js/content/manifests/spec.js:144`; `js/pages/account.js` and `js/pages/reference.js` diff against baseline; `seo-data.js:681`; `explorer.js:589`. A tail check of the rest is not claimed.

## Summary

| Report | FIXED | PARTIAL | OPEN | OWNER | OUT-OF-REPO | UNVERIFIED | Total | Rows with no finding |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| cms.md | 14 | 15 | 3 | 0 | 0 | 2 | 34 | 0 |
| pages.md | 83 | 14 | 12 | 0 | 0 | 0 | 109 | 8 |
| pages-crawl TSVs | 11 | 1 | 0 | 0 | 0 | 1 | 13 | 6 |
| pages-ux-a.md | 83 | 56 | 27 | 2 | 0 | 17 | 185 | 0 |
| pages-ux-b.md | 73 | 29 | 14 | 4 | 0 | 10 | 130 | 0 |
| components.md | 76 | 53 | 20 | 1 | 3 | 0 | 153 | 0 |
| brand.md | 46 | 29 | 10 | 6 | 41 | 2 | 134 | 0 |
| resolvers-content.md | 115 | 23 | 10 | 9 | 32 | 4 | 193 | 0 |
| S0 sweep (new, section below) | 4 | 0 | 3 | 0 | 0 | 0 | 7 | 0 |
| **Total** | **505** | **220** | **99** | **22** | **76** | **36** | **958** | |

**Updated 2026-10-20 by W4-S0** (`tests/browser/fold-contrast-sweep.mjs`, readings in `docs/ux-audit/fold-contrast-readings.tsv`, summary in `docs/ux-audit/fold-contrast.md`): 42 of the 78 UNVERIFIED rows were decided (41 FIXED, 1 PARTIAL), each carries a `S0 sweep` note citing the TSV line (`L<n>` = line n of the TSV). The 36 left are not decidable by a fold, text-contrast, control-boundary or font-size reading (tap targets, radii and size counts, empty bands, hover and layout, landmarks, other repos, live state). The sweep also found 7 new OPEN items (section "S0 sweep: new findings"). All fold, contrast and font readings are at rest (default tab, step and accordion).

Each report's per-finding rows follow; the consolidated "Next work" is at the end.

---

## cms.md (CMS gate + one-workspace editor)

| id / short title | severity | status | evidence |
|---|---|---|---|
| P0-1 New page/article not visible, "Page fields" opens Home, article named "New note" | P0 | PARTIAL | Create flow FIXED: `createPage`/`createArticle` take a typed title and land on the new item (`js/admin/editor.js:481-514`, `js/admin/articles.js:176-200`, `landOn` opens its Page fields); the full `createdNotice` toast with Save now (`editor.js:497-505`); article named from slug (`articles.js:176`); canvas fallback banner when a route cannot be drawn (`js/admin/bridge.js:107-120`); preview routes draft-only pages (`js/main.js` catalogContentRoutes, `tests/cms-draft-routes.cjs`); blank article mounts (`tests/article-draft-mounts.cjs`). Left: no canvas EmptyState card (banner only); that the canvas actually navigates to `/learnings/<slug>` before Save was failing in `tests/browser/cms-journeys.mjs` + `full-audit.mjs` at resume point 2/3 and its pass is UNVERIFIED (needs browser run now in progress) |
| P0-2 Escape discards inline edit; Enter corrupts heading | P0 | FIXED | Escape and Enter now finish and keep words: `js/main.js:495-540` (`cmsEnterBreaks`, `cmsFinishInline`, `cmsInlineKey`); visible Done button and key hint in the Content lens toolbar `js/admin/toolbar.js:211-221`; test `tests/cms-content-lens.cjs`. The caret-side hint chip (fix 3) is replaced by the toolbar hint text, not a chip |
| P0-3 Save without a folder downloads JS, Connect is buried | P0 | FIXED | Save with no folder writes nothing and shows a persistent banner with Connect + "Download changed files instead" `js/admin/save.js:106-131,222-236`; first-run banner `js/admin/project.js:73-90`; Versions has a Connect button `js/admin/versions-panel.js:51-52`; test `tests/cms-save-unconnected.cjs`. Not done: first-run 3-step checklist card and renaming Save to "Download changes" |
| P0-4 Publish disabled with no visible reason; "undefined" in Mesh header | P0 | FIXED | Publish stays clickable and opens a sheet with the blocker + remedy button `js/admin/mesh.js:227-249` (`publishBlocker`, `explainPublish`), `js/admin/core.js:60-77` (`refuse(..., explain)`); `siteName()` never prints undefined `mesh.js:233`; security essay folded `mesh.js:33-45`; tests `tests/cms-refusal-explains.cjs`, `tests/admin-disabled-says-why.cjs`. Left: the "start the miner" text names Ark Miner Desktop, not the "Flux Chain Admin.command" double-click the audit suggested (cosmetic) |
| P1-1 Header carries the whole product (23 controls) | P1 | FIXED | Header is now sidebar, page switcher, Page settings, Edit words/Edit style, Undo, Redo, status, Save, Publish, More = 10 controls `admin-app.html:40-106`; canvas tools moved to `#canvasTools` strip `admin-app.html:257-270`; status slot fixed width. Phone fit `tests/browser/header-reach.mjs`, `tests/header-row-fit.cjs` (browser pass UNVERIFIED) |
| P1-2 Jargon and internal identifiers on every surface | P1 | PARTIAL | Done: rail groups "Header & footer / Main pages / Guides / More pages" `js/admin/rail.js:162,198`; Edit words/Edit style `admin-app.html:54-55`; Developer details disclosure `js/admin/controls.js:183` used in editor/toolbar/library/versions; footer "69 routes / no undo" replaced by "N pages" `js/admin/canvas.js:222`; "Reset for this screen size" `toolbar-sections.js:105`; Publishing/Private naming `admin-app.html:85,193`. Left: Mesh sheet still shows "Deployment status", "Address (CID)", "Owner key", "P2P deployment" `js/admin/mesh.js:65,98-105`; HSL triplets are under Developer details (`design.js:177`) but no swatch+hex rewrite verified; nav-link refusal wording UNVERIFIED |
| P1-3 One page, three names | P1 | FIXED | One `siteList()` feeds rail and picker, name from draft title else catalog title else words `js/admin/rail.js:152-199`, `js/admin/header.js:95-104`; path shown as secondary text |
| P1-4 Two unsearchable page lists, add at the bottom | P1 | FIXED | Searchable picker `header.js:105-153` and rail `#pageSearch` `admin-app.html:201`; "More pages" folded by default `rail.js:201`; sticky "+ New" asks for a Title and shows the derived address `admin-app.html:202-229`, `rail.js:293-326`; Guide page/Article choice; test `tests/cms-new-by-title.cjs`. (Inline panel, not an Ark Dialog) |
| P1-5 Undo means different things | P1 | PARTIAL | One history for canvas edits + Page-settings field writes behind header Undo/Redo and Ctrl+Z `js/admin/history.js:1-86`, `header.js:164-170`; footer "no undo" removed `canvas.js:220-222`; test `tests/cms-one-history.cjs`. Left (stated in `history.js:18-22`): create, delete, theme colour and version restore are not undoable; canvas entries end when another page loads |
| P1-6 Two editors open on the same words | P1 | FIXED | The Content popover auto-opens only for text that cannot be edited in place (`contentNow && !contentNow.bound`) `js/admin/toolbar.js:154`; Done / All fields actions `toolbar.js:211-222`; test `tests/cms-toolbar-identity-sections-open.cjs` |
| P1-7 Selection toolbar icon-only, wrong actions per lens | P1 | FIXED | Labelled sections Text/Colour/Spacing/More `js/admin/toolbar.js:65`; lens-aware actions (Content: Done/All fields; Design: More) `toolbar.js:207-223`; tests `tests/cms-toolbar-taxonomy.cjs`, `cms-toolbar-shell.cjs`. Ark Tooltip not used (title attributes remain): minor |
| P1-8 Features reachable only by right-click | P1 | PARTIAL | Toolbar More lists every canvas command (Make into states, Group, Remove, Align/Distribute only with 2+ layers) `toolbar.js:98-135`; context menu now on SDK tokens `js/main.js:827`; "Edit canvas" renamed "Page transition…" `main.js:1059`. Left: inapplicable commands are still listed (disabled, with the reason under them) `toolbar.js:112-113`, not hidden |
| P1-9 "Background" names two features | P1 | FIXED | Header item is "Page transition" in More `admin-app.html:83`, popover title `header.js:205`; Site style keeps "Background" `design.js:187-189` |
| P1-10 Design check score in alarm colours on every page | P1 | FIXED | Shown only in Edit style `header.js:187`; neutral pill, warning tone only for `data-tone="worse"` `css/studio-embed.css:216-221`; label "Design tips" `admin-app.html:265` |
| P1-11 Media panel overflows rail; cannot replace image on canvas | P1 | OPEN | Native `<input type=file>` still used `js/admin/assets.js:51,115`; no "Replace image"/"Alt text" action on a selected `<img>` (grep of `js/admin` and `js/main.js` finds none); sheet-vs-rail overflow UNVERIFIED (needs browser) |
| P1-12 Overlays stack and do not dismiss together | P1 | FIXED | One dismissable-layer stack, Esc closes topmost, canvas press closes popovers `js/admin/overlay.js:94-160`, bridge relays canvas pointerdown; z-ladder `overlay.js:51-67`; sheets share one slot (level 'sheet'); tests `tests/cms-overlay-stack.cjs`, `cms-overlay-z-ladder.cjs`, `cms-account-menu-canvas-close.cjs`. Versions panel still docked separately but registered in the stack (`versions-glue.js:238`) |
| P1-13 Phone: desktop tool squeezed down | P1 | PARTIAL | 44 px targets and two-row header on phone `css/admin.css:285-313`; breakpoint note shows words `header.js:160-174`; rail is a drawer. Left: no bottom action bar, popovers are not bottom sheets, editor still opens on the Phone breakpoint on a phone (by design, `canvas.js`); Page settings tab strip scrolls sideways at 390 px with no scrollbar (plan.md resume point 4). Fit itself UNVERIFIED (needs browser: `tests/browser/header-reach.mjs`) |
| P1-14 Page fields shows everything | P1 | PARTIAL | Unused fields folded under "Unused fields (n)" `js/admin/editor.js:375-388`; tabs renamed Text / Search & sharing / Shapes / Advanced `editor.js:401-404`; copy keys and file path under Developer details `editor.js:390`. Left: no per-group accordion with "Show on page" (grep finds no such control) |
| P1-15 Versions reads like a commit log | P1 | PARTIAL | Human summary lines per version, rest folded, raw addresses/export under Developer details `js/admin/versions-panel.js:115-140`. Left: no row marked "Current" (grep finds none), Restore still uses `window.confirm` only when drafts are dirty `js/admin/versions-glue.js:177` and no "Restored as unsaved changes" toast verified |
| P1-16 Feedback goes to four places | P1 | PARTIAL | One notice component: toast stack + persistent banners with actions `js/admin/notice.js`, `core.js:103` (`toast()` now calls it); header `#status` kept to a fixed slot. Left: header `#status`, notices, footer `#studioStatus` (`canvas.js:222`) and rail dots all still exist; save-state text ("3 unsaved changes") UNVERIFIED |
| P1-17 Theme view is one long scroll | P1 | FIXED | Renamed "Site style", three Ark tabs (Colours & background, Visitor defaults, Search defaults), file names under Developer details `js/admin/design.js:314-325`; Page transition moved to More (`header.js:201-231`). Fonts/Motion are not separate tabs (audit's 6-tab list not copied) |
| P2-1 Gate wording, three credential names | P2 | OPEN | `admin.html:31-32` and `js/admin/gate.js:348-349,363-364` still say "Locked." and "DeadArk identity"; no "Don't have one?" link (grep) |
| P2-2 Three primary-button languages | P2 | FIXED | One `.btn` painted by `css/admin.css`; studio-embed only adjusts compactness `css/studio-embed.css:22-54`; in-panel primaries now `btn small` `js/admin/library.js:172-257`. Gate's text+circle primary `css/admin.css:489` remains (gate is a separate surface) |
| P2-3 Sitemap alarms; header changes with view | P2 | FIXED | "Not linked" is a fact, broken link stays danger `js/admin/sitemap.js:50`; canvas tools live on the canvas strip and the header does not change `header.js:181-190` |
| P2-4 Layers: implementation names, order, scroll | P2 | PARTIAL | Layer names reworked `js/admin/rail.js:80`, `tests/layer-names.cjs`; selected row scrolled into view for Pages `rail.js:98`. Layers background-group collapsed / tag toggle UNVERIFIED (needs browser) |
| P2-5 Library form raw prop names, empty state, edge | P2 | PARTIAL | Library rebuilt from the Ark block registry with search `js/admin/library.js:1-60`, `tests/components-library.cjs`; padding fix `css/studio-embed.css:357`. Labels/empty state wording UNVERIFIED (needs browser) |
| P2-6 Row indicators lack a legend | P2 | PARTIAL | Orphan tag has text + aria-label `js/admin/rail.js:218`; no one-line legend under group head found |
| P2-7 Keyboard: ~140 tab stops, skip link, mixed tab semantics | P2 | PARTIAL | Pages rows are buttons with one open target `tests/cms-pages-rows-are-buttons.cjs`, `rail.js:221`; toolbar roving tab stop `toolbar.js:226`; Ark tabs/toggle groups `js/admin/ark-host.js`. Left: no skip link to the canvas (grep of `admin-app.html`, `js/admin` finds none); rail five tabs + More menu `#viewSwitch` still hand-wired (plan.md resume point 4) |
| P2-8 Typography popover: Size shows "Hero", unit-less spacing, truncated labels | P2 | UNVERIFIED (needs browser) | Not decidable from code alone; `js/admin/toolbar-sections.js` Typography section was reworked in `3462ab4`/`af33dc6` but the inherited-value display is a runtime behaviour |
| P2-9 Account menu mixes five things | P2 | PARTIAL | Shortcuts folded into a "Keyboard shortcuts" disclosure `admin-app.html:97-100`; publish-host status moved to Publishing status item `admin-app.html:85`. Left: the menu still carries a "Publishing service" details block, identity, folder and sign-out together `admin-app.html:87-102` |
| P2-10 Page SEO popover | P2 | PARTIAL | Close button on every header popover `header.js:51-52`; Advanced fields folded (`js/admin/seo.js`, `tests/seo-fields.cjs`). Monospace textarea vs sans, and the "Site-wide SEO" jump: UNVERIFIED (needs browser) |
| P2-11 Delete uses native `confirm()` | P2 | OPEN | `window.confirm` in `js/admin/editor.js:544`, `articles.js:166`, `assets.js:136`, `secrets.js:167`, `gate.js:400,422`, `versions-glue.js:177`, `mesh.js:294` |
| (c) Pattern table: Button / Icon button / Toggle group / Tabs / Popover / Menu / Sheet / Dialog / Close button / Command / Field row / List row / Disclosure / Toast / Empty state / Badge / File input / Select / DOM builder h() | - | PARTIAL | Tabs, disclosure, accordion, toggle groups and popovers now run on Ark primitives via `js/admin/ark-host.js` and `js/admin/overlay.js` (local `primitives.js` deleted, `tests/admin-dead-code-gone.cjs`); one close button `overlay.js:163`; one `.btn`. Not ported: Ark Dialog/AlertDialog (native confirm), Ark Attachment (native file inputs), Ark Select (native `<select>`), Ark Command (hand-built picker `header.js:105`), Ark Tooltip, `h()` is still defined twice (`js/admin/gate.js:66`, `js/admin/core.js:36`) |
| "What already works" list (editing on the real page, honest refusals, one Save, shared field helpers, phone layout) | - | UNVERIFIED (needs browser) | Positive findings; nothing to fix. Phone horizontal scroll (`scrollWidth` = 390) needs the browser run |


---

## pages.md (page inventory and reachability audit, 2026-10-19)
Counts: FIXED 83, PARTIAL 14, OPEN 12, OWNER 0, OUT-OF-REPO 0, UNVERIFIED 0 (plus 8 n/a rows with no finding, not counted)

Ledger basis: code on disk (working tree over 45d6b1a). Nothing was run; the crawl numbers in the report were not re-measured. Rows whose
status depends on measured fold or live behaviour are UNVERIFIED (needs browser). The regression tests cited were read, not executed.
"n/a" rows (the report found nothing to fix) are listed but carry no status and are not counted.

| id / short title | severity | status | evidence |
|---|---|---|---|
| P1 in-page doc links all open "Agreements"; Return goes Home (71 links, 41 routes) | P0 (site-wide) | FIXED | js/ark/route.js:48 `linkQuery` + js/hero-motion.js:106 (href rewrite and click both keep the query), js/ark/dash-kit.js:49-52 (`docHref` no longer claims `from='/'`), js/pages/reference.js:24-31 (Return is a scene link with `routeQuery`); tests/scene-link-query.cjs, tests/reference-reader.cjs, tests/browser/site-fixes.mjs:44-65 (clicks real doc links on 5 routes) |
| P2 three orphans plus the unreachable /stats/gpu | P1 | FIXED | tests/site-exits.cjs asserts each inbound link: js/pages/stats.js:635 (-> /stats/gpu), js/pages/resolver-lab.js:497-500 (INSPECT.HREF -> /start-from-something-real), js/pages/resolvers.js:258-262 and js/pages/concept.js:59 (-> /resolver-math), settings panel "See the full palette" (scripts/settings-entry.js:132) |
| P3 two pages for one interactive model | P1 | PARTIAL | Merged: js/pages/catalog.js:51-55 (`proximity` module `lab`, alias `/experiments/lab`), js/content/site-pages.js:39, seo-data.js title "Interactive model"; tests/browser/site-fixes.mjs:116-120. Left: js/studio.js:55-56 still writes the model state to and restores it only at `/experiments/lab`, so on the canonical `/experiments` the URL is rewritten to the alias once a study is touched and `/experiments?model=..&value=..` is not restored |
| P4 stale /concept/spec ("no benchmark verified") | P1 | FIXED | tests/concept-spec-current.cjs derives the verified set from docs/evidence/registry.md and fails if the sheet disagrees; js/content/manifests/spec.js links /stats, /stats/gpu, /stats/ledger (lines 174ff); owner chose "rewrite", not the /stats merge |
| P5 fold budget broken on 11 routes (summary) | P1 | FIXED | Structure now tabs/accordions/disclosures per route (rows below); every number is an agent-reported measurement in a test header, not a gate. docs/ux-audit/plan.md:71 lists the Wave 4 fold sweep as still to do. No test asserts fold <= 1.6 across routes (tests/browser/fold-disclosures.mjs only checks reachability of folded content) **S0 sweep 2026-10-20:** Decided by `tests/browser/fold-contrast-sweep.mjs`: 68 of 69 catalog routes are <= 1.6x at rest at 1440x900 and 390x844; the one over is hidden `/reference` at 390 (1.69, fold-contrast-readings.tsv L94, new row S0-1 below). All eleven P5 routes pass (rows below). At rest (default tab/step/accordion); the other views a reader opens on purpose are not measured. |
| P5a fold: /stats (12.53/20.63) | P1 | FIXED | tests/stats-page.cjs:18 claims <= 1.6x per view at 1440x900 and 390x844 (W3-STATS report) **S0 sweep 2026-10-20:** fold-contrast-readings.tsv L18 (1440: 1.20), L87 (390: 1.17); was 12.53/20.63 |
| P5b fold: /stats/ledger (8.89/14.50) | P1 | FIXED | tests/stats-ledger-page.cjs:10 (tabs + accordions, claims <= 1.6) **S0 sweep 2026-10-20:** fold-contrast-readings.tsv L20 (1440: 1.00), L89 (390: 1.16); was 8.89/14.50 |
| P5c fold: /resolver-math (8.36/13.42) | P1 | FIXED | tests/resolver-math-blocks.cjs:8 (seven tabs, claims <= 1.6) **S0 sweep 2026-10-20:** fold-contrast-readings.tsv L10 (1440: 1.41), L79 (390: 1.00); was 8.36/13.42 |
| P5d fold: /resolvers (3.93/7.75) | P1 | FIXED | tests/resolvers-blocks.cjs:11 (one tab per question, claims <= 1.6) **S0 sweep 2026-10-20:** fold-contrast-readings.tsv L11 (1440: 1.41), L80 (390: 1.38); was 3.93/7.75 |
| P5e fold: /palette (2.67/4.41) | P2 | FIXED | js/pages/palette.js:9 states the fold fix (was 2.76x); no measuring test **S0 sweep 2026-10-20:** fold-contrast-readings.tsv L8 (1440: 1.03), L77 (390: 1.59, only 0.01 under the limit); was 2.67/4.41 |
| P5f fold: / (2.39/2.72) | P1 | FIXED | js/pages/home.js:7 and tests/home-blocks.cjs:9 (five tabs, "fold is measured per view by the browser check"); no measuring gate in tests/ **S0 sweep 2026-10-20:** fold-contrast-readings.tsv L2 (1440: 1.39), L71 (390: 1.23); was 2.39/2.72 |
| P5g fold: /about (2.08/2.65) | P1 | FIXED | js/pages/about.js:7, tests/about-page.cjs (tabs, views short) **S0 sweep 2026-10-20:** fold-contrast-readings.tsv L3 (1440: 1.38), L72 (390: 1.41); was 2.08/2.65 |
| P5h fold: /stats/gpu (1.89/3.09) | P2 | FIXED | tests/stats-gpu-blocks.cjs:8 (five tabs, claims <= 1.6) **S0 sweep 2026-10-20:** fold-contrast-readings.tsv L19 (1440: 1.19), L88 (390: 1.48); was 1.89/3.09 |
| P5i fold: /learnings (1.28/1.99) | P2 | FIXED | tests/learnings-blocks.cjs:22-26 (index rows folded on phone); docs/ux-audit/plan.md "Every learnings view <= 1.6 fold at 1440/390" **S0 sweep 2026-10-20:** fold-contrast-readings.tsv L6 (1440: 1.49), L75 (390: 1.34); was 1.28/1.99 |
| P5j fold: /how-deployment-works at 390 (1.84) | P2 | FIXED | on the story template (js/pages/catalog.js:34); no fold test names it **S0 sweep 2026-10-20:** fold-contrast-readings.tsv L21 (1440: 1.10), L90 (390: 1.33); was 1.00/1.84 |
| P5k fold: /bundle-deployer at 390 (1.83) | P2 | FIXED | js/pages/bundle-deployer.js:74 folds the release status on phone (`foldBelow: 'phone'`); no measurement **S0 sweep 2026-10-20:** fold-contrast-readings.tsv L15 (1440: 1.47), L84 (390: 1.40); was 1.00/1.83 |
| P6a /about has three names; h1 equals /resolutions h1 | P2 | FIXED | js/content/seo-data.js:88 title "Overview", js/content/manifests/about.js:17-22 h1 "Overview.", js/content/site-pages.js:34 label "Overview"; "Resolutions for the mesh." now only in manifests/resolutions.js:21 |
| P6b /stats/ledger and the article share a title | P2 | FIXED | js/content/seo-data.js:516-517 "Ledger benchmark detail"; site-pages.js label matches; the article keeps "A finance resolver by construction"; no duplicate title remains in seo-data.js (only the empty one) |
| P7a hand-written "All pages" menu with a catch-all | P1 | FIXED | js/resolvers/header.js:553-562, 689 derive groups from `journey`; js/content/site-pages.js is the one table; tests/site-journeys.cjs, tests/navigation-index.cjs; treasury/deposits/palette/proximity are journey `preview` |
| P7b sitemap `EXTRA_PAGES` second copy | P2 | FIXED | js/content/seo.js:128-136, 271-276 read `ArkSitePages`; sitemap.xml on disk (67 locs) lists /stats/gpu, /stats/ledger, /how-deployment-works/*, one /experiments, no /experiments/lab |
| P7c CMS Pages-tree "orphan" tag built only from manifest `link` fields | P2 | OPEN | js/admin/rail.js:137-154 (`realLinkIndex`) and :168-169 (`orphanOf`) unchanged; pages are Ark blocks now, so inbound links in page specs are even less visible to it. Still tags linked pages and cannot see real orphans |
| P8 unknown path silently shows Home (soft 404) | P1 | FIXED | js/ark/page-router.js:150-159 `resolve()` returns `notfound`; js/pages/catalog.js:96 and js/pages/not-found.js (names the address, closest pages, every journey's way in); tests/not-found-page.cjs, tests/page-router.cjs, tests/browser/site-fixes.mjs:75-85 |
| P9 /stats gets 404 from /api/chain-pulse, /api/chain-fleet-capacity (environment) | P3 (env) | PARTIAL | Page now refuses by name instead of 0 or "reachable: no" (tests/stats-unavailable-not-zero.cjs). Production routing is declared in ops/caddy/defxn-site.caddy:74-93 (not in vercel.json, which only rewrites to /api/render). Left: whether the live host answers is not decidable from code (UNVERIFIED, needs a probe of production) |
| P10 #fallback links point at raw docs/*.md | P2 | FIXED | index.html:100-107 (links /download, /what-is-a-resolver, /about); js/main.js:138 makes it inert; tests/browser/site-fixes.mjs:162 asserts no `docs/` hrefs |
| C1 Counts: 3 ORPHAN routes (/start-from-something-real, /resolver-math, /stats/gpu) | - | FIXED | see P2 |
| C2 Counts: DUPLICATE /experiments | - | FIXED | see P3 (the address-state residual is tracked there) |
| C3 Counts: DEAD (stale) /concept/spec | - | FIXED | see P4 |
| C4 Counts: DEMO/LAB (/palette orphan and dead end, lab reachable only from orphan, /treasury and /deposits filed under "live") | - | FIXED | js/content/site-pages.js:39,42,50-51 journey `preview`; palette Home + Theme settings actions (tests/site-exits.cjs palette block); economy-preview.js:92-93,146-147 exits |
| C5 Counts: REDIRECT candidates | - | PARTIAL | /experiments/lab -> alias done (catalog.js:55). /concept/spec -> /stats not done, by choice: the sheet was rewritten instead (owner decision recorded in the report as "either way") |
| C6 Counts: DROP = 0 | - | n/a | no finding |
| R1 strict orphans (5 routes, menu-only) | - | FIXED | footer strip (hero-motion.js:79-95, one lead link per journey incl. /experiments) + the P2 body links; /palette via the settings panel |
| R2 /stats/gpu unreachable | P1 | FIXED | stats.js:635; sitemap.xml; journey `prove` (site-pages.js:53) |
| R3 /experiments/lab orphan by chain; corner navigation invisible | P2 | FIXED | corner navigation removed (tests/site-journeys.cjs: `!corner-navigation`); the footer strip links /experiments on every route (tests/browser/site-fixes.mjs:124-132) |
| R4 dead ends (/palette, /resolvers, /reference) | P2 | FIXED | palette.js:119 + resolvers.js:258-262 exits; reference Return now goes to the origin (reference.js:24-31) |
| R5 near dead ends (/account/domains, /bundle-deployer, /treasury, /deposits) | P3 | FIXED | account-domains.js:60 (website + bundle deployer), bundle-deployer.js:79-80 (download + deployments), economy-preview.js:92-93,146-147 |
| R6 deepest path depth 5; articles reached at depth 4 with no Home/header entry | P3 | FIXED | footer strip links /learnings from every page (site-pages.js:40 `lead`), so an article is depth 2; menu groups "Read". Depth not re-crawled |
| /  (home) "Walk the chain", "Inspect the evidence" only behind "More" | P2 | PARTIAL | The "More" disclosure is gone (tests/home-blocks.cjs:7-9); the refs are in the "Where do I start?" tab actions (js/pages/home.js:35,263), a tab press away, not above the fold. Fold itself: P5f |
| /chain only inbound is Home's disclosure; link from /how-deployment-works, /explore, retired article | P3 | PARTIAL | Article link done (js/content/articles/why-the-chain-was-retired.js:8). Not linked from /how-deployment-works (manifests/deployment.js routes: how/*, lifecycle, resolver, resolvers, zero) or /explore (explorer.js:117-126) |
| /what-is-a-resolver exits: INSPECT.HREF, math, browse resolvers | P2 | FIXED | resolver-lab.js:497-500 (pager related = REGISTRY, MATH, EXPLORE, DEPLOYER + Inspect reference evidence); tests/site-exits.cjs |
| /start-from-something-real no inbound | P2 | FIXED | see P2 and resolvers.js:260 |
| /how-deployment-works fold at 390 | P2 | FIXED | see P5j **S0 sweep 2026-10-20:** see P5j: fold-contrast-readings.tsv L90 (390: 1.33) |
| /explore exits: reference (P1), "Walk one chain" -> /chain, "Measured performance" -> /stats | P3 | PARTIAL | P1 part fixed. js/pages/explorer.js:117-126 `onward` still only What is a resolver / family Explore / raw records; no /chain or /stats link. Fix edits js/pages/explorer.js |
| /palette keep; settings link; menu group; exits | P2 | FIXED | see C4 |
| /stats: link to /stats/gpu; 404s | P2 | PARTIAL | link fixed (stats.js:635); 404 environment: P9; fold: P5a |
| /stats/gpu links from /stats and the speed article | P2 | FIXED | stats.js:635; js/content/articles/how-we-got-fast-and-what-we-got-wrong.js:8 |
| /stats/ledger retitle; fold | P2 | FIXED | retitle: P6b. Fold: P5b (UNVERIFIED) |
| /resolver-math inbound + fold | P2 | FIXED | inbound: P2. Fold: P5c (UNVERIFIED) |
| /resolvers dead end + fold | P2 | FIXED | exits: resolvers.js:258-262 (what is a resolver, math, references, deploy, stats). Fold: P5d (UNVERIFIED) |
| /account (/admin link hidden unless publishing available) | - | n/a | report: not a defect; unchanged (js/pages/account.js:78) |
| /account/domains exits | P3 | FIXED | account-domains.js:60 |
| /treasury filed under "live"; one exit | P2 | FIXED | journey preview (site-pages.js:50-51); economy-preview.js:92-93 |
| /deposits only reachable from /treasury; exit to payments | P3 | FIXED | economy-preview.js:146-147 |
| /experiments merge; /experiments/lab redirect | P1 | PARTIAL | see P3 |
| /experiments/lab "link from /concept/practice, /lifecycle, /dao" | P3 | OPEN | no link to /experiments in js/pages/lifecycle.js, js/pages/sheet.js (dao/theory), manifests; only js/pages/lab.js:51 links back to /concept/practice. /experiments is reachable via the footer strip. Fix edits sheet.js / lifecycle.js / manifests |
| /learnings footer entry; fold at 390 | P3 | FIXED | entry: site-pages.js:40 (`lead`) -> footer strip. Fold: P5i (UNVERIFIED) |
| /about naming; fold | P2 | FIXED | naming: P6a. Fold: P5g (UNVERIFIED) |
| /concept link to /resolver-math in evidence tab | P3 | FIXED | js/pages/concept.js:59 |
| /download P1 | P3 | FIXED | see P1 (browser check on /download: site-fixes.mjs:44-65) |
| /bundle-deployer exits + fold 390 | P3 | FIXED | exits: bundle-deployer.js:79-80. Fold: P5k (UNVERIFIED) |
| /dao exits: resolve your governance, model analogy | P3 | OPEN | js/pages/sheet.js:494-496 gives only parent + "Inspect activation gates"; no /resolutions/governance or /experiments link. Fix edits js/pages/sheet.js (and js/content/manifests/dao) |
| /resolutions/* P1-only rows (website, content, files, deployments, payments, community, communications, collaborations, governance, intelligence, data, information, network, encryptions, automation, productivity, logistics) | P0 via P1 | FIXED | see P1 (tests/browser/site-fixes.mjs:44-65 includes /resolutions/website) |
| /resolutions/finance add /treasury | P3 | FIXED | js/content/resolutions.js:29 `FINANCE: 'treasury'`; rendered as related page, js/pages/resolutions.js:164 |
| /resolutions/algorithms add /resolvers and /resolver-math | P3 | FIXED | js/content/resolutions.js `alsoMore` (ALGORITHMS: resolvers), rendered as a second related link by `js/pages/resolutions.js` detailSpec; `also` stays a string; tests/site-exits.cjs, tests/resolutions-blocks.cjs (W5-PAGES) |
| /resolutions/rules add /resolver-math | P3 | FIXED | resolutions.js:29; tests/site-exits.cjs |
| /how-deployment-works/ask, /work | - | n/a | report: none |
| /how-deployment-works/check closing "Run it yourself" -> /download | P3 | OPEN | js/pages/how-stories.js:392 next is "Back to the lifecycle"; no /download. Fix edits js/pages/how-stories.js |
| /lifecycle link to /experiments after merge | P3 | OPEN | none in js/pages/lifecycle.js; see /experiments/lab row |
| /lifecycle/intent, offer, agreement, fulfillment | - | n/a | report: none |
| /lifecycle/receipt next step out (/explore or /download) | P3 | OPEN | js/pages/lifecycle.js:567-603: related are the other stages only. Fix edits js/pages/lifecycle.js |
| /learnings/why-the-chain-was-retired -> /chain | P3 | FIXED | js/content/articles/why-the-chain-was-retired.js:8 |
| /learnings/one-substrate, governance-without-a-validator-set, chain-prototype (P1 only) | P0 via P1 | FIXED | see P1 |
| /learnings/how-we-got-fast -> /stats/gpu | P2 | FIXED | articles/how-we-got-fast-and-what-we-got-wrong.js:8 |
| /learnings/the-grammar-does-almost-no-work -> /resolver-math | P3 | FIXED | articles/the-grammar-does-almost-no-work.js:8; tests/site-exits.cjs |
| /learnings/a-resolver-by-construction title collision | P2 | FIXED | see P6b (article title kept, ledger retitled) |
| /concept/purpose, depth, notes, studio | - | n/a | report: none |
| /concept/practice "See the analogy" -> /experiments | P3 | OPEN | js/pages/theory.js / sheet.js carry no /experiments link; see /experiments/lab row |
| /concept/spec rewrite or merge | P1 | FIXED | see P4 |
| /reference always agreements.md; Return -> Home | P0 | FIXED | see P1 |
| Remaining text after the table (no render failures; text overlap low; resolution family template is by design) | - | n/a | observations, no action |
| S1-S6 proposed site map: journeys Understand / Build / Prove / Run / Read / Previews, derived from one `journey` field | P2 | FIXED | js/content/site-pages.js:27 (JOURNEYS), 35 (PAGES), 74 (FAMILIES), FAMILIES for content routes; consumers: catalog.js:79-90, header.js:553+, hero-motion.js:79, seo.js:271, not-found.js:88; tests/site-journeys.cjs |
| Chrome: header keeps six core links + Resolutions mega menu; add a "Resolvers" column | P3 | PARTIAL | mega menu is resolutions only (js/resolvers/header.js:156-232); the four resolver pages are reached through the "Build" journey in the All-pages menu and in-page links instead. Optional |
| Chrome: "All pages" menu grouped by journey, no catch-all | P2 | FIXED | see P7a |
| Chrome: footer strip derived from the catalog groups; corner navigation not the only link | P2 | FIXED | js/hero-motion.js:70-95 (family footer, one link per journey lead), tests/site-journeys.cjs, tests/browser/site-fixes.mjs:124-132 (strip on screen at 1440 and 390). Footer height effect on one-screen pages is a browser check (UNVERIFIED) |
| N1 /what-is-a-resolver next steps (INSPECT, math, resolvers) | P2 | FIXED | resolver-lab.js:497-500 |
| N2 /start-from-something-real -> /how-deployment-works (meta.next) | - | n/a | report: keep; manifests/references.js `next: deployment` |
| N3 /resolver-math -> /resolvers | P3 | FIXED | resolver-math.js:792 |
| N4 /resolvers four exits | P2 | FIXED | resolvers.js:258-262 |
| N5 /palette Home + Theme settings | P2 | FIXED | palette.js:119 + `open-theme-settings` action (tests/site-exits.cjs) |
| N6 /stats -> /stats/gpu | P1 | FIXED | stats.js:635 |
| N7 /explore -> /chain, /stats | P3 | OPEN | see /explore row; edit js/pages/explorer.js:117 |
| N8 /account/domains exits | P3 | FIXED | account-domains.js:60 |
| N9 /bundle-deployer exits | P3 | FIXED | bundle-deployer.js:79-80 |
| N10 /treasury, /deposits exits | P3 | FIXED | economy-preview.js:92-93,146-147 |
| N11 /how-deployment-works/check -> /download | P3 | OPEN | see check row |
| N12 /lifecycle/receipt -> /explore | P3 | OPEN | see receipt row |
| N13 /concept/practice, /lifecycle, /dao -> /experiments | P3 | OPEN | see /experiments/lab row |
| N14 /how-deployment-works and why-chain article -> /chain | P3 | PARTIAL | article only (see /chain row) |
| N15 speed article -> /stats/gpu | P2 | FIXED | see above |
| N16 grammar article, /resolutions/rules, /resolutions/algorithms -> /resolver-math | P3 | FIXED | tests/site-exits.cjs |
| A1 (=P1) doc links carry their query + browser regression | P0 | FIXED | see P1; the fix went into hero-motion.js/route.js rather than dash-kit `data-route-query` (the report's alternative) |
| A2 (=P8) not-found state | P1 | FIXED | see P8 |
| A3 (=N6) /stats -> /stats/gpu | P1 | FIXED | see N6 |
| A4 (=N1) restore INSPECT.HREF inside resolver-lab | P2 | FIXED | see N1 |
| A5 (=N16, concept evidence tab) -> /resolver-math | P2 | FIXED | see N16 and concept row |
| A6 (=N4) /resolvers exits | P2 | FIXED | see N4 |
| A7 (=N5) /palette linked from settings and given exits | P2 | FIXED | see N5 |
| A8 remaining next-step links (chain, account/domains, bundle-deployer, treasury/deposits, how/check, lifecycle/receipt, explore, articles) | P3 | PARTIAL | done: account/domains, bundle-deployer, treasury/deposits, articles. Open: chain (from how-deployment-works, explore), how/check, lifecycle/receipt, explore |
| A9 (=chrome footer strip) visible footer strip | P2 | FIXED | see footer strip row |
| A10 (=P3) merge /experiments + lab, alias, one seo/llms entry | P1 | PARTIAL | see P3 (llms.txt:10 has one entry; the studio.js state address is left) |
| A11 (=P4) /concept/spec | P1 | FIXED | see P4 |
| A12 (=P6b) retitle /stats/ledger | P2 | FIXED | see P6b |
| A13 (=P6a) one name for /about | P2 | FIXED | see P6a |
| A14 `journey` field read by menu, sitemap, footer strip; retire hand lists | P2 | FIXED | see S1-S6 and P7a/P7b |
| A15 (=P7c) CMS orphan tag from the link graph | P2 | OPEN | js/admin/rail.js:137-169; edit js/admin/rail.js (derive from the rendered page links or the same resolver the pages use) |
| A16 (=P5) layer / fit the folds | P1 | FIXED | see P5a-P5k **S0 sweep 2026-10-20:** see P5a-P5k: all eleven pass at rest (fold-contrast-readings.tsv L2-L21, L71-L90). The sweep's one other fold failure is `/reference` at 390 (L94, 1.69), tracked as S0-1 |
| A17 Drop: none | - | n/a | no finding |
| A18 verify production routing of /api/chain-*; point #fallback links at routes | P2 | PARTIAL | fallback: done (P10). Production routing: Caddy rules exist (ops/caddy/defxn-site.caddy:74-93); live check not decidable from code |

## pages-crawl TSVs (docs/ux-audit/pages-crawl.tsv, pages-crawl-links.tsv)
Counts: FIXED 11, PARTIAL 1, OPEN 0, OWNER 0, OUT-OF-REPO 0, UNVERIFIED 1 (plus 6 n/a rows, not counted)

The TSVs are 69 route rows (31 columns, measured 2026-10-19 at baseline) and 544 link rows (kinds: 531 route, 11 file, 1 broken; regions header 7, mega 22, menu 43, page 450, page-footer 14, other 7). They are evidence for the findings above; the conclusions below are per class of row, derived from current code (js/content/site-pages.js, js/pages/catalog.js, sitemap.xml, llms.txt, js/hero-motion.js, js/ark/route.js, js/ark/page-router.js). The crawl was not re-run, so "resolved" means "the cause the row recorded no longer exists in code", not "re-measured".

| TSV class (column / rows) | rows affected at baseline | status | conclusion from current code |
|---|---|---|---|
| links: `to=reference` route links whose href carried `?doc=` but opened the default document (kind route, 71 rows on 41 `from` routes; 66 are a bare `/reference` after the rewrite) | 71 | FIXED | query kept by `ArkUI.route.linkQuery` (js/ark/route.js:48; hero-motion.js:106); `from` defaulted to the page clicked (dash-kit.js:49-52, hero-motion.js:111). tests/scene-link-query.cjs, tests/browser/site-fixes.mjs:44-65 |
| routes: `inboundCount=0` / `depth*=unreachable` (start-from-something-real, palette, resolver-math, experiments, stats/gpu; experiments/lab reachable only from experiments) | 5 + 1 | FIXED | each has a body or chrome inbound link now (P2 row above); /experiments + lab are one route (catalog.js:55); footer strip links /experiments from every route |
| routes: `chromePlacement=none` (stats/gpu, stats/ledger, how-deployment-works/ask,work,check, reference) | 6 | FIXED | all but /reference have a `journey` in site-pages.js so the menu lists them (header.js:562 filter); /reference is `journey: null` by design (site-pages.js:59) and stays a utility |
| routes: `outboundCount=0` dead ends (palette, resolvers) and `=1` near dead ends (account/domains, bundle-deployer, treasury, deposits) | 2 + 4 | FIXED | exits added (R4/R5 rows) |
| routes: `inSitemap=false` / `inLlms=false` (stats/gpu, stats/ledger, how-deployment-works/ask,work,check, reference) | 6 | FIXED | sitemap.xml:13-70 and llms.txt:24-29 list all but /reference (`journey: null`, excluded on purpose, seo.js:265-276); /experiments/lab no longer a separate entry. Sitemap is now derived (seo.js:271) so it cannot drift again |
| routes: `fold1440` / `fold390` over 1.6 (11 routes) | 11 | FIXED | structure converted to tabs/accordions per route (P5a-P5k); no gate measures it. Needs the Wave 4 fold sweep **S0 sweep 2026-10-20:** fold-contrast-readings.tsv: none of the 11 routes is over 1.6 now (largest 1.59 `/palette` at 390, L77); sweep total is 1 route over (`/reference` at 390, L94) |
| routes: `consoleErrors` / `failedRequests` (/stats: 404 x2 for /api/chain-pulse, /api/chain-fleet-capacity, at both widths) | 1 route | PARTIAL | same as P9: page degrades by name; production routing declared in Caddy, live answer not decidable here |
| routes: duplicate `h1` ("How can threshold agreement be pictured?" on /experiments and /experiments/lab; "Resolutions for the mesh." on /about and /resolutions) | 4 | FIXED | one lab page; /about h1 is "Overview." (manifests/about.js:17-22) |
| routes: duplicate `title` (/stats/ledger vs article) | 2 | FIXED | seo-data.js:516-517; no duplicate titles remain in seo-data.js |
| routes: `title`/`h1` values themselves (e.g. "Source evidence and current limits", "From network ID to receipt", "FXN resolvers") | 69 | n/a | titles were re-worded in seo-data.js after the crawl ("Reference resolvers", "Deploy a resolver", "Resolvers and capabilities"); the TSV `title`/`h1`/`metaDescription` columns are therefore stale snapshots and must not be read as current copy |
| routes: `inCmsPagesTree` = "yes (studioRoutes = every catalog path)" on all rows | 69 | FIXED | js/admin/studio.js:21-28 still lists every catalog path (now also `notfound` is a catalog entry with a path; it is `hiddenFromNavigation`, so check it is not offered as a page to edit: UNVERIFIED, needs the editor). The orphan tag over those rows is the open P7c |
| routes: `placeholderPhrases` (mock, not live, illustrative, unverified, design preview, not yet wired, in development, not registered, fictional) | 23 | n/a | text scan hits, not a defect class; the report raised no finding from them (treasury/deposits are labelled previews on purpose). Not decidable from code |
| routes: `staticRefFiles` | 69 | n/a | informational (files naming the route as a string). Useful as a rename checklist: `/experiments/lab` is still written by js/studio.js:55-56 and js/scene.flux.js:70 (see P3 residual) |
| links: `region=other` (7 rows: corner navigation Spec/Notes/Interactive model/theory invitation, invisible at 1440; 3 raw `docs/*.md` fallback links) | 7 | FIXED | corner navigation removed and replaced by the visible footer strip (hero-motion.js:70-95); fallback now site routes (index.html:100-107) |
| links: `kind=file` raw `docs/*.md` (11 rows: 3 in the fallback, 7 "Evidence & limits" after-click links on /dao and the concept sheets, 1 "Original Markdown" on /reference) | 11 | FIXED | fallback: P10. The 7 sheet links are `doc:` links now (js/pages/sheet.js:476 -> dash-kit `docHref` -> in-site reader); hero-motion.js:144-149 also routes a raw allowlisted `docs/` href into the reader. "Original Markdown" on /reference is intentional (reference.js `data-reference-original`) |
| links: `kind=broken` `/admin` from /account ("resolves to no catalog route (router silently shows Home)") | 1 | n/a | hidden link served by the host, not the router (js/pages/account.js:78); the router now returns not-found rather than Home for an unmapped address anyway (page-router.js:158) |
| links: `after-click:` rows (61 links found only after a click) | 61 | n/a | evidence that these count as inbound; no class to fix. Several are now ordinary tab contents (stories/tabs on the Ark blocks), so they still require a press |
| links: `region=page-footer` (14) / `header` (7) / `menu` (43) / `mega` (22) | 86 | n/a | chrome placement evidence. Menu rows are now generated from `journey` (header.js:553+), so any baseline row for a page filed under the old "Evaluate" catch-all is obsolete |
| links: `visible1440=false` (88 rows: mega-menu cards, menu layers, the invisible corner links) | 88 | UNVERIFIED (needs browser) | the corner links are gone; the mega and menu rows are hidden until opened by design. Visibility of the new footer strip is covered by tests/browser/site-fixes.mjs:124-132, which has not been re-run for this ledger |


---

## docs/ux-audit/pages-ux-a.md (first half of the routes, `/` through `/lifecycle/fulfillment`)
Counts: FIXED 83, PARTIAL 56, OPEN 27, OWNER 2, OUT-OF-REPO 0, UNVERIFIED 17 (185 rows)

Read-only ledger from the code on disk (baseline 5a1ac71, waves 1-3 committed, working tree has only admin/CMS edits that do not touch these routes). Fold ratios, contrast, tap targets and rAF rates are measured browser behaviour: they are UNVERIFIED unless a regression test pins them; where the structure that fixes them is in the code, the evidence cell says so. No test in the repo asserts a fold ratio of 1.6 or less (tests/browser/route-sweep.mjs and layout-key-stability.mjs were "Not run (Wave 4)" per commit af33dc6), so every fold row stays UNVERIFIED until the Wave 4 re-audit.

### Measurement rows (per-route table, totals, "More" open numbers)

| id / short title | severity | status | evidence |
|---|---|---|---|
| M1 fold D/M over 1.6 on 13 of 35 routes (/ 2.53/2.88, /about 2.23/2.81, /bundle-deployer M 2.00, /how-deployment-works M 2.02, /learnings M 2.16, 4 articles M 1.65-1.76, 3 how chapters M 1.63-1.68) | P1 | FIXED | Structure that fixes it is in place on every named route (tabs/accordion/disclosure: home.js:247-303, about.js:276, story.js, learnings.js:69-73, article.js:40 LONG_TOC) and commit af33dc6 claims every view at 1.6 or less, but no test asserts it; Wave 4 fold sweep pending (docs/ux-audit/plan.md "Resume point 4") **S0 sweep 2026-10-20:** fold-contrast-readings.tsv: `/` L2/L71 (1.39/1.23), `/about` L3/L72 (1.38/1.41), `/bundle-deployer` L15/L84 (1.47/1.40), `/how-deployment-works` L21/L90 (1.10/1.33), `/learnings` L6/L75 (1.49/1.34), the four articles at most 1.36 (L127-L133), the three how chapters 1.16-1.38 (L22-L24, L91-L93). At rest (default tab/step/accordion); the other views a reader opens on purpose are not measured. |
| M2 "More" open takes / to 4.95 and /about to 4.08 (one undivided wall) | P1 | FIXED | The single "More" details no longer exists: home.js:247-303 and about.js:276 are one Ark tabs control, one view at a time; regressions tests/home-blocks.cjs, tests/about-page.cjs. (Re-measured numbers UNVERIFIED) |
| M3 ctl<3: 170 of 195 desktop controls (87%) below 3:1 boundary contrast | P1 | PARTIAL | Ark controls use --border-control (css/ark-blocks.css `.ark-btn`, segmented tabs, accordion icon; css/flux-themes.css:10 etc.). Left: hand-built controls still on --border-default (css/explore-story.css:60 `.explore-kind`; css/download.css:7 and css/page-layout.css:168 copy buttons; css/story-diagrams.css:20 `.story-record`; account.js tabs). No defxn test asserts the 3:1 ratio |
| M4 txt contrast failures (/ 1, how chapters 8/6/8) | P1 | FIXED | Record card is Ark `facts` now (how-stories.js:403-407) so the 1.91:1 opacity-dimmed dt/dd rows are gone from the markup, but no test measures text contrast on these routes **S0 sweep 2026-10-20:** fold-contrast-readings.tsv: `/` lowest text contrast 5.00 (L140 at 1440, L215 at 390); how chapters 6.03 / 7.52 (L160-L162, L235-L237). No text under 4.5:1 on any catalog route (only the editor has one, S0-3) |
| M5 phone tap targets under 24px (/account/domains, /concept, /deposits, /download, /experiments/lab, how/ask, check, work) | P2 | UNVERIFIED (needs browser) | Pages rebuilt from Ark blocks (min 2.5rem buttons in css/ark-blocks.css `.ark-btn`); not measured |
| M6 jargon counts per route (chain, signature, FXN, resolver ...) | P1 | PARTIAL | See X6: glossary-term component exists and is wired on 8 page modules, not on the others |
| M7 totals: 42 distinct font sizes, 60 button signatures, 12 corner radii | P2 | UNVERIFIED (needs browser) | Census ratchet exists (docs/ux-audit/component-census-baseline.tsv, tests/ux-component-census.cjs) but the audit's rendered-style counts were not re-run; hard-coded CSS font-size px declarations fell from 485 to 266 and !important from 323 to 244 across css/*.css since 5a1ac71 (grep count) |
| M8 rendered families include Arial as a fourth typeface; Albert Sans vs IBM Plex Sans competing | P1 | FIXED | css/page-layout.css:11 `:where(button,input,select,textarea){font:inherit}`; tests/browser/site-fixes.mjs:164-166 and 197-211 assert body is Albert Sans and no visible control on any route is Arial/Times; IBM Plex Sans is not loaded (assets/kit/defxn-fonts.css:50) |
| M9 /about contrast "0" footnote (the checker could not see the overlay) | P0 | FIXED | Same defect as /about P0 below (tests/browser/site-fixes.mjs:89-111 hit-tests the heading, which a contrast computation cannot) |

### Per route

| id / short title | severity | status | evidence |
|---|---|---|---|
| `/` P1 fold 2.53/2.88 | P1 | FIXED | See M1; hero + five Ark tabs, home.js:243-303 **S0 sweep 2026-10-20:** see M1: fold-contrast-readings.tsv L2 (1440: 1.39), L71 (390: 1.23) |
| `/` P1 everything behind one "More" (hides Explore/Build/Operate) | P1 | FIXED | home.js:247-303 (five tabs: See it work, Where do I start?, How it fits together, What is measured?, Questions); tests/home-blocks.cjs |
| `/` P1 11 of 16 controls below 3:1 (hl-case, home-cycle-step) | P1 | PARTIAL | hl-case replaced by Ark segmented tabs (home.js:252, 260, 283); the scene step buttons `home-cycle-step`/`flow-record` (home-flow.js:499) are still hand-built, css/home-flow.css:94; see M3 |
| `/` P1 header on `/` is a different component | P1 | FIXED | js/resolvers/header.js:492-493 mounts the kit family bar the same way for every route; tests/browser/public-header.mjs and tests/kit-home-shell.cjs |
| `/` P2 phone header spends space on "Production" pill and account icon; no primary nav | P2 | OWNER | The network pill sits beside MENU by owner call (css/navigation.css:52-53, 2026-10-16); decision: keep the pill on phone widths and what label ("Production") a newcomer sees |
| `/` P2 isometric labels 6-9px unreadable at 390 | P2 | OPEN | css/home-swiss.css:49 (`.land-index` 8px), :53 (`.land-meta` 9px), :80 (`.land-tag-text` 9px) unchanged; the drawing is aria-hidden (home-flow.js:517) and the steps are listed as text, so it is decorative, but not raised to a 12px floor |
| `/` P2 closing "Start with the idea" repeats the hero CTA 2000px later | P2 | FIXED | Folded into the "Not sure yet" tab, home.js:265-270 |
| `/` P2 "Powered, deployed and made by FLX" overlaps canvas grid | P2 | UNVERIFIED (needs browser) | The credit now sits in the footer-strip row (css/navigation.css:249) and is hidden under 1280px (:260) and on phones (css/settings.css:34); overlap not measured |
| `/` Fix lead with one plain sentence ("Your own record of what you did...") | P2 | OWNER | Copy unchanged: js/content/manifests/home.js:15-31 ("Not one chain. A world of them."); decision: approve the plain headline/intro wording |
| `/` Fix "Follow the line" as a real primary button | P2 | FIXED | home.js:245 (Ark hero action, tone primary) |
| `/` Fix one hero diagram, subway map in a tab | P2 | FIXED | home.js:251-256 (scene under "See it work") and 273-278 (map under "How it fits together") |
| `/` Fix promote Explore/Build/Operate out of "More" directly under hero | P2 | PARTIAL | Now its own tab "Where do I start?" (home.js:258-271) but second of five tabs, not the first view under the hero |
| `/` Fix split "More" into named accordions; shared header | P2 | FIXED | home.js:273-303 (Architecture/Evidence/Questions views, accordions); header see above |
| `/` Hand-built list (hero, case picker, More, tabs, principle grid, stat cards, FAQ, closing, 2 SVG diagrams, local helpers) | - | PARTIAL | All but the drawings are Ark blocks (home.js:243-303); audience/principle/question copy still hard-coded in JS (home.js:34-48); the two SVG drawings stay imperative (home-flow.js drawLandscape/buildChainWorld) |
| `/about` P0 closing section invisible under hl-closing overlay | P0 | FIXED | No `hl-closing` anywhere in js/ or css/ (grep); ending is Ark callout + pager (about.js:264-265, 275); hit-test tests/browser/site-fixes.mjs:89-111; tests/about-page.cjs header |
| `/about` P1 fold 2.23/2.81 (4.08 open) | P1 | FIXED | See M1/M2; one Ark tabs control about.js:276 **S0 sweep 2026-10-20:** see M1/M2: fold-contrast-readings.tsv L3 (1440: 1.38), L72 (390: 1.41); the 4.08 open state is not measured (a reader opens it on purpose) |
| `/about` P1 "More." set as 49px H2 to label one disclosure | P1 | FIXED | Disclosure removed; tab list replaces it (about.js:276), tests/about-page.cjs |
| `/about` P1 "See how DEFXN works" external-link icon on internal route | P1 | FIXED | Ark derives the arrow from the href (tests/about-page.cjs header); tests/browser/site-fixes.mjs:179-225 asserts the arrow only on leaving links on all routes |
| `/about` P2 phone layer picker and diagram push CTA explanation below fold | P2 | UNVERIFIED (needs browser) | Layer picker is Ark segmented tabs (about.js:227); phone layout not measured |
| `/about` P2 continuous rAF 83-109/s | P2 | FIXED | about.js header ("no idle frame loop"); tests/browser/idle-frames.mjs lists /about (ROUTES line 46) and requires 0 rAF/s; commit af33dc6. (Driver result not re-run here) |
| `/about` Fix own closing component / drop 820px min-height; More to tabs; pause loop | P1 | FIXED | Same evidence as P0, P1 and rAF rows |
| `/about` Hand-built list (hero, instrument, More, step/pillar/tile cards, closing footer, own helpers) | - | FIXED | about.js:223-277 is Ark hero/callout/tabs/steps/facts/card-grid/pager; only the layer drawing (about.js:38) is the page's own |
| `/account` P1 two H1-scale headings (H1 "Your keys. Your world." and H2 "Choose your Auth Kit."); primary says "Choose Auth Kit" | P1 | OPEN | js/pages/account.js:59 (h1), :75 (h2 `account-session-title`), :993-994 (button text); account.js unchanged since 5a1ac71; account conversion is Wave 4 (plan.md) |
| `/account` P1 jargon: Auth Kit, Ghost ID, Root key, FXN, Credits "Coming soon" | P1 | OPEN | account.js:62-63, 90, 656; no glossary wiring (no `terms:` on this page) |
| `/account` P1 phone primary button cut at the fold | P1 | UNVERIFIED (needs browser) | account.css changed in wave 1 but hero layout not measured |
| `/account` P1 whole page is one HTML string | P1 | OPEN | account.js:58-99 `page.innerHTML = ...` (1126 lines) |
| `/account` P2 two different tab styles (segmented Sign in/Create, role=tab account-tabs) | P2 | OPEN | account.js:68-75 (role=tab) vs :75 (aria-pressed buttons) |
| `/account` Fixes: one H1 "Sign in to DEFXN"; "What's an Auth Kit?" tooltip; button "Sign in with your Auth Kit" | P1 | OPEN | None applied in account.js:59-75, 993 |
| `/account` Hand-built list (hero+SVG map, profile, key/value dl, tablist, tabs, balances, wallet form, network) | - | OPEN | All still in account.js:58-99 innerHTML |
| `/account/domains` P2 "CMS" jargon in "Claim a new name from the CMS" | P2 | FIXED | No "CMS" text in js/pages/account-domains.js (grep); copy at :43-44, :75 |
| `/account/domains` P2 empty state floats with no anchor | P2 | OPEN | account-domains.js:55 plain `<p class="account-domains-empty">`; css/account-domains.css:19; no empty card with ghost example row |
| `/account/domains` P2 fourth back-link style ("← Your account" in blue) | P2 | FIXED | Ark breadcrumb + pager (account-domains.js:42, 59) |
| `/account/domains` P2 one phone tap target under 24px | P2 | UNVERIFIED (needs browser) | Not measured |
| `/account/domains` Fixes (copy; empty card) | P2 | PARTIAL | Copy fixed (see CMS row); empty card still open |
| `/account/domains` Hand-built (form row, status line, domain cards) | - | PARTIAL | Crumbs/hero/pager are Ark blocks (account-domains.js:42-60); form and cards remain hand-built `custom` blocks (:45-57, :90-92), justified in-file as the page's live parts |
| `/bundle-deployer` P1 phone fold 2.00 | P1 | FIXED | Tabs + accordion + phone-folded disclosure, bundle-deployer.js:60-77; not measured **S0 sweep 2026-10-20:** see M1: fold-contrast-readings.tsv L15 (1440: 1.47), L84 (390: 1.40) |
| `/bundle-deployer` P2 only action is "Back to your account"; no next step | P2 | FIXED | bundle-deployer.js:79 pager `next: Run DEFXN from source -> route:download`, plus Bundles hand-off :60 |
| `/bundle-deployer` P2 accent spent on "Becomes public" table header | P2 | UNVERIFIED (needs browser) | Table is Ark `table` block (bundle-deployer.js:70-72); header colour not measured |
| `/bundle-deployer` Fixes (phone accordion; add /download step) | P1 | FIXED | Accordion/tabs/disclosure foldBelow 'phone' (bundle-deployer.js:62, 75) and pager next (:79) |
| `/bundle-deployer` Hand-built list | - | FIXED | Whole page is Ark blocks (bundle-deployer.js:56-84); tests/task-pages-blocks.cjs |
| `/chain` P1 grammar letters unexplained | P1 | PARTIAL | Each box has a plain caption (home-flow.js:85-91 who/what kind/version/when/position/extends/signature) and glossary has grammar/box/role letter, but chain.js passes no `terms:` and no per-box tooltip |
| `/chain` P1 record boxes about 6px at 390 | P1 | FIXED | Scene is HTML, no rule under 12px; tests/chain-blocks.cjs:56-61 asserts it (css/home-flow.css:6) |
| `/chain` P1 scene auto-advances, 60 rAF/s idle | P1 | FIXED | Plays once and settles (chain.js header, home-flow.js:9-12); tests/home-hero-scene.cjs:211-218; tests/browser/idle-frames.mjs lists /chain |
| `/chain` P1/verdict H1 is visually-hidden (no title) | P1 | FIXED | chain.js:78 Ark hero with visible title + lede; tests/chain-blocks.cjs:52, 94-96 |
| `/chain` P2 back link "← HOME" third style | P2 | FIXED | chain.js: Ark breadcrumb (chain-crumbs) |
| `/chain` Fixes: tooltip per box; stack boxes on phone; stop loop | P1 | PARTIAL | Loop stops (above); H1 and intro added; per-box tooltip not added; vertical stacking on phone not verifiable from code (grid in css/home-flow.css:33) |
| `/chain` Hand-built list (tablist, stepper, grammar diagram, caption, pause) | - | PARTIAL | tablist is Ark tabs (chain.js:79); scene and stepper still hand-built (home-flow.js buildChainFlow) |
| `/concept` P1 toggle buttons fall back to Arial (4th font) | P1 | FIXED | Ark tabs (concept.js:66); global `font:inherit` css/page-layout.css:11; tests/browser/site-fixes.mjs:164-166 |
| `/concept` P2 cards say "open explanation →" grey, no hover affordance | P2 | UNVERIFIED (needs browser) | Cards are Ark card-grid (concept.js:66-68), description text unchanged (concept.js:60); hover not measured |
| `/concept` Fix shared segmented control | P1 | FIXED | concept.js:66 (Ark tabs, bound to the address by ArkUI.story.bindTabs :71) |
| `/concept` Fix show both groups at once on desktop, toggle on phone only | P2 | OPEN | concept.js:66 still hides one group behind the toggle at every width |
| `/concept` Hand-built list | - | FIXED | concept.js:63-69 Ark breadcrumb/hero/tabs/card-grid |
| Story sheets (/concept/depth, notes, practice, purpose, spec, studio, /dao) P1 depth buttons render in Arial; labels wrap on phone | P1 | FIXED | One Ark tabs depth control (js/pages/story.js:59-63 DEPTH); no Arial: tests/browser/site-fixes.mjs:164-166; tests/story-blocks.cjs |
| Story sheets P1 unexplained terms: CID, FXN chain, substrate, quorum, DAO, roster | P1 | PARTIAL | Story pages pass `terms: first-use` (story.js:184) and the glossary has CID and Ed25519 (js/content/glossary.js); it has no entry for quorum, DAO, roster, substrate or FXN chain (44 terms, docs/glossary.md) |
| Story sheets P1 diagram captions 6-7px | P1 | FIXED | Labels carry data-ark-label and the figure frame holds them at 12px (js/ark/story-diagrams.js:31-33; tests/story-diagrams.cjs, tests/story-blocks.cjs:154) |
| Story sheets P2 CTA casing inconsistent between siblings | P2 | OPEN | Manifest CTAs are literal uppercase (js/content/manifests/depth.js:132, dao.js:166, spec.js:156) while js/pages/sheet.js:496 passes sentence-case "Inspect activation gates"; Ark button does not normalise case |
| Story sheets P2 "RUN FLUX FROM SOURCE" vs "Run DEFXN" | P2 | FIXED | js/content/manifests/spec.js:156 reads "RUN DEFXN FROM SOURCE"; no "Run Flux"/"Operate Flux" left in js/ or css/ (grep) |
| Story sheets P2 /concept/spec "no public benchmark artifact" contradicts / stat cards | P2 | FIXED | spec.js:30 cites the six verified registry records; home tiles read the same registry (home.js:20-25, 177-207); tests/concept-spec-current.cjs |
| Story sheets P2 bottom third of panel empty on desktop | P2 | UNVERIFIED (needs browser) | Two-column story body in css/block-page.css; not measured |
| Story sheets Fixes: shared segmented tab, glossary tooltips, diagram text, CTA case once, reconcile benchmark wording | P1 | PARTIAL | Tabs, diagram text, benchmark wording done; glossary lacks quorum/DAO/roster; CTA case open (rows above) |
| Story sheets Hand-built list (breadcrumb chip, H1+depth row, guided answer, figure, status, CTA, step pickers, ArkUI.sheet variant) | - | FIXED | js/pages/sheet.js:451-534 feeds ArkUI.story.mount; story.js builds it from Ark blocks |
| `/deploy` P1 step tabs only "01-05" on phone, no labels | P1 | UNVERIFIED (needs browser) | Tab labels are now "01 / Check discovery" (deploy.js:138 `step.n + ' / ' + step.title`); whether the tab strip shows them at 390px not measured |
| `/deploy` P1 forward links use "←" | P1 | FIXED | Both are Ark callout actions tone link (deploy.js:133) whose arrow Ark derives from the href; no "←" literal in deploy.js; pager next is "FXN Bundle Deployer" |
| `/deploy` P2 deck in monospace at body size, opens with negations | P2 | PARTIAL | Deck is the Ark hero lede (sans) so the mono block is fixed; copy still opens with the negation: js/content/manifests/deploy.js:27 |
| `/deploy` P2 Copy button differs from /download's | P2 | OPEN | `.deploy-copy` css/page-layout.css:168 vs `.download-copy` css/download.css:7 (two Copy styles, two implementations deploy.js commandCard, download.js:67-90) |
| `/deploy` P2 "miner presence" unexplained | P2 | PARTIAL | `terms: first-use` wired (deploy.js:178) and glossary has "named network" (miner-presence namespace), but "miner presence" itself is no term |
| `/deploy` P2 step copy hard-coded in JS | P2 | OPEN | js/pages/deploy.js:17-53 STEPS and :54 SCOPE |
| `/deploy` Fixes (deck to sans; lead with benefit; not-a-boundary callout; step title on phone; one Copy) | P1 | PARTIAL | Sans deck and callout done (deploy.js scope disclosure); lead-with-benefit, phone step title (unverified) and one Copy component open |
| `/deploy` Hand-built list | - | PARTIAL | Hero/tabs/table/callouts/pager are Ark (deploy.js:125-170); the command card with Copy stays hand-built (deploy.js:89-113 commandCard, documented: Ark ships no command block) |
| `/deposits` P2 native `<select>` arrow unstyled | P2 | OPEN | js/pages/economy-preview.js:105 `node('select')` |
| `/deposits` P2 "Return to treasury preview ↗" external arrow on internal route | P2 | FIXED | Ark pager prev (economy-preview.js:146); tests/browser/site-fixes.mjs:179-225 |
| `/deposits` P2 demo data and copy hard-coded in JS | P2 | OPEN | economy-preview.js:16-23 `movements`, KICKER, MOCK |
| `/deposits` P2 one small phone tap target | P2 | UNVERIFIED (needs browser) | Not measured |
| `/deposits` Fix shared select + internal-link icon | P2 | PARTIAL | Link icon done, select not (rows above) |
| `/deposits` Hand-built list (header, FXN/Credits toggle, movement list, fact dl, input, result panel) | - | PARTIAL | Header, toggle (Ark tabs economy-preview.js:76), movements (Ark accordion/facts) are blocks; the draft form and result are the page's own (:98-135) |
| `/download` P1 step buttons render in Arial | P1 | FIXED | Now Ark accordion + steps (download.js:133-134, 143); no Arial (tests/browser/site-fixes.mjs:164-166, 197-211) |
| `/download` P1 phone step tabs numbers only | P1 | FIXED | Steps are named accordion rows (download.js:134 `stepTitle(i)`); terminal folded behind "Show the terminal" under 900px |
| `/download` P2 terminal card ~60% empty at 1440 | P2 | UNVERIFIED (needs browser) | Terminal card still hand-built `.download-terminal` (download.js:67); sizing not measured |
| `/download` P2 Copy button style differs from /deploy | P2 | OPEN | Same as /deploy Copy row (css/download.css:7) |
| `/download` Fixes (size terminal to content; share step-tab component with /deploy) | P2 | PARTIAL | Steps use the story template's Ark accordion; /deploy uses Ark tabs, not the same component |
| `/download` Hand-built list (terminal card, pre+copy, ordered list, step data in JS) | - | PARTIAL | Story template around it (download.js:135-165); terminal and TERMINAL data (download.js:22-28) remain in JS |
| `/experiments` verdict/P1 same H1 as /experiments/lab, near-duplicate route adds a click | P1 | FIXED | One page: catalog.js proximity entry with aliases ['/experiments/lab','/work','work']; tests/browser/site-fixes.mjs:115-120; tests/page-router.cjs, tests/mechanism-evidence.cjs |
| `/experiments` Fix fold intro/callout into lab header, keep redirect | P1 | FIXED | lab.js:50-70 (hero status line + introduction disclosure); alias in js/pages/catalog.js |
| `/experiments` Hand-built (REXPERIMENT_V1 template) | - | FIXED | Template retired with the page; lab.js uses Ark blocks |
| `/experiments/lab` P1 tab strip overflows at 390 with no scroll affordance | P1 | UNVERIFIED (needs browser) | `.study-tabs` markup in lab.js:~38; css/focus.css:14-16, css/studio.css:31 unchanged in kind; not measured |
| `/experiments/lab` P1 caption overlaps dot row on phone | P1 | UNVERIFIED (needs browser) | `.stage-corner` 9px absolute, css/studio.css:39-40; not measured |
| `/experiments/lab` P2 "FX-001" unexplained code | P2 | OPEN | js/pages/lab.js:38 `<span class="stage-corner">FX—001</span>` still there |
| `/experiments/lab` P2 page is one innerHTML string | P2 | PARTIAL | Crumbs, hero, intro, pager are Ark blocks (lab.js:52-63); the model stays one hand-built string (lab.js:~34-46), driven by js/studio.js |
| `/experiments/lab` Fix one-line instruction ("Drag to bring the groups together") | P1 | OPEN | No such instruction in js/pages/lab.js or js/studio.js (grep for "drag" finds none); "Visual convergence" label unchanged |
| `/experiments/lab` Fix tab strip wrap/scroll-snap; caption below stage on phone | P1 | UNVERIFIED (needs browser) | See the two P1 rows above |
| `/experiments/lab` Hand-built (eyebrow, H1, pill, tablist, stage, slider, footnote) | - | PARTIAL | Eyebrow/H1/status are Ark hero (lab.js:55); tablist, stage, slider remain the model |
| `/explore` P1 11 of 12 controls below 3:1; kind tiles near-invisible | P1 | OPEN | css/explore-story.css:60 `.explore-kind` border is `--border-default`, not `--border-control` |
| `/explore` P1 tile captions 9-10px mono at low contrast | P1 | OPEN | css/explore-story.css:72 (`.explore-kind small` 9.5px, `--text-faint`) |
| `/explore` P1 how-work-mesh grid labels unreadable | P1 | OPEN | css/how-overview.css:123 (`.how-work-mesh-label` 8px) |
| `/explore` P2 "1 MINERS" grammar | P2 | OPEN | js/pages/explorer.js:589 `r.count + ' ' + COUNT_WORDS[id]` always plural (COUNT_WORDS :67) |
| `/explore` P2 pane switch only on the phone | P2 | OPEN | css/explore-story.css:19 hides `.explore-panes` on desktop by design; the audit asked for nothing more, so only a note (kept as described) |
| `/explore` Fixes (border-strong tokens, 12px sans captions, pluralise) | P1 | OPEN | None applied (rows above) |
| `/explore` Hand-built list (innerHTML template, pane toggle, kind tiles, chips, record list, own stat card, node rows) | - | PARTIAL | Crumbs, hero, ways-on are Ark (explorer.js:117-140); live cards, tiles and the raw view stay hand-built `custom` blocks, own `mesh-explorer-stat` still duplicates dash-kit stat |
| `/how-deployment-works` P1 phone fold 2.02 | P1 | FIXED | The page is now "Deploy a resolver" on the story template (deployment.js:1-14); six-step accordion one open at a time (deployment.js:~200 accordion); not measured **S0 sweep 2026-10-20:** see M1: fold-contrast-readings.tsv L21 (1440: 1.10), L90 (390: 1.33) |
| `/how-deployment-works` P2 grid diagram labels 6px | P2 | FIXED | css/lifecycle.css:157-159 mesh names and signals at 12px |
| `/how-deployment-works` P2 three canvases per page | P2 | PARTIAL | Still three canvases (deployment.js:171 STAGES), now paused off screen via onFigureVisibility (:219) and behind "Show the three meshes" under 900px |
| `/how-deployment-works` Fix phone cards as carousel/tabs | P1 | FIXED | Replaced by the story template depth control and accordion (deployment.js depth) |
| `/how-deployment-works` Hand-built list | - | FIXED | story.mount with Ark blocks (deployment.js:~175-212) |
| how chapters (/ask, /check, /work) P1 text contrast failures 8/6/8 (unlit dt/dd 1.91:1) | P1 | FIXED | See M4; rows are Ark facts (how-stories.js:403-407) **S0 sweep 2026-10-20:** see M4: fold-contrast-readings.tsv L160-L162 and L235-L237 (lowest 6.03 at 1440, 7.52 at 390) |
| how chapters P1 phone record fields expose raw identifiers (inputCid, recipientId, nextSequence) | P1 | OPEN | Still the manifest term: js/content/manifests/deployment.js:619, 643 ("[1] inputCid: What you asked to move"); at least folded on a phone behind "Show the record's fields" (how-stories.js:407) |
| how chapters P1 step buttons render in Arial | P1 | FIXED | Ark steps (how-stories.js:401); global font inherit; tests/browser/site-fixes.mjs |
| how chapters P1 phone fold 1.63-1.68 | P1 | FIXED | See M1 **S0 sweep 2026-10-20:** see M1: fold-contrast-readings.tsv L91 (ask 1.28), L92 (work 1.33), L93 (check 1.38) at 390 |
| how chapters P2 view tabs a third segmented look | P2 | FIXED | One depth control (story.js:59-63); tests/story-blocks.cjs |
| how chapters Fixes (muted token not opacity; friendly names; shared components) | P1 | PARTIAL | Shared components done; friendly names with raw key as hint not done; contrast unverified |
| how chapters Hand-built list | - | FIXED | how-stories.js:392-420 builds a story def |
| `/learnings` P1 phone fold 2.16 | P1 | FIXED | First 3 cards in sight, rest behind a phone-only disclosure (learnings.js:64-67); tests/learnings-blocks.cjs:193; W3-LEARN reports 1.57 or less, not asserted **S0 sweep 2026-10-20:** see M1: fold-contrast-readings.tsv L75 (390: 1.34) |
| `/learnings` P1 card shows excerpt above title on phone | P1 | UNVERIFIED (needs browser) | Cards are Ark `card-grid` (learnings.js:34-36) with one DOM order (eyebrow, title, description, meta); rendered order not measured |
| `/learnings` P1 section has four names | P1 | PARTIAL | "Notes" everywhere visitor-facing (learnings.js:3-8, js/content/manifests/nav.js:138 BACK.TUTORIALS = "NOTES", site-pages.js:40); the fixed corner button text is still built from key `NAV.BACK.TUTORIALS` (js/hero-motion.js:192) and the URL stays /learnings by design |
| `/learnings` P2 card excerpts misalign when titles wrap | P2 | UNVERIFIED (needs browser) | Ark card layout (flex column); not measured |
| `/learnings` P2 intro line set in mono | P2 | FIXED | Ark hero lede (learnings.js:57) |
| `/learnings` P2 excerpt says 25,232 ops/s against article's 51,065/279,269 | P2 | PARTIAL | Index summary now quotes 51,065 (js/content/article-index.js:48) and tests/learnings-blocks.cjs:120-126 grounds every excerpt figure; the SEO description for the same article still says 25,232 (js/content/seo-data.js:681) |
| `/learnings` Fixes (one name; card component; paginate/filter) | P1 | PARTIAL | Name and card done, fold by disclosure not pagination/filter; see rows above |
| `/learnings` Hand-built list (eyebrow/H1/intro; card list; H1 copy in JS) | - | PARTIAL | Ark hero/card-grid/disclosure (learnings.js:56-72); title and lede strings still literal in JS (learnings.js:58-59) |
| `/learnings/*` articles P1 H1 and body in uppercase/mono | P1 | FIXED | Story template with Ark hero (js/pages/article.js header); tests/learnings-blocks.cjs |
| `/learnings/*` P1 choosing a question shows an empty panel ~1s | P1 | FIXED | Questions are an Ark accordion, no exit-then-enter transition (article.js header); tests/learnings-blocks.cjs |
| `/learnings/*` P1 question tabs numbers only (00-11) | P1 | FIXED | Rows show the question title, numbered by position (article.js header) |
| `/learnings/*` P1 phone folds 1.65-1.76 on four articles | P1 | FIXED | LONG_TOC halves long lists on phone (article.js:40); not asserted **S0 sweep 2026-10-20:** fold-contrast-readings.tsv L127-L133: the seven articles at 390 are 1.18-1.36 |
| `/learnings/*` P2 native ▶ evidence disclosure (third style) | P2 | FIXED | Evidence is Ark facts/accordion (article.js header) |
| `/learnings/*` P2 "Related mechanism ↗" underlined blue | P2 | FIXED | Related mechanism is a pager related link (article.js header); ↗ only on leaving links per tests/browser/site-fixes.mjs |
| `/learnings/*` Fixes (display font, immediate answer, question titles, shared accordion) | P1 | FIXED | Same evidence |
| `/learnings/*` Hand-built list | - | FIXED | article.js on story template |
| `/lifecycle`, `/lifecycle/agreement`, `/lifecycle/fulfillment` P1 breadcrumb duplicates "03 / AGREEMENT" as eyebrow | P1 | FIXED | story.js header: breadcrumb has no ordinals, eyebrow is the position (lifecycle.js:570-571); tests/story-blocks.cjs |
| lifecycle P1 "the 02 has no 01" | P1 | FIXED | Same (ordinals removed) |
| lifecycle P2 three vocabularies for depth | P2 | FIXED | One label set "The idea / How it works / Evidence" (story.js:59-63) |
| lifecycle P2 status callout starts lowercase | P2 | PARTIAL | Now "What is still not true: accepted terms ..." (lifecycle.js:38) with a capital, but the sentence after the colon starts lowercase by design |
| lifecycle P2 stage diagram labels 6px | P2 | FIXED | data-ark-label 12px floor (js/ark/story-diagrams.js:31-33; css/lifecycle.css:72) |
| lifecycle Fixes (one breadcrumb, drop duplicate eyebrow, one depth vocabulary) | P1 | FIXED | Same evidence |
| lifecycle Hand-built list (stage copy in JS, H1, strip, figure, depth controls, mechanism buttons, callout, CTA) | - | PARTIAL | Template is Ark blocks (lifecycle.js:570+); stage copy still hard-coded in JS (lifecycle.js:8-55, ArkUI.lifecycleContent) |

### Cross-page findings (ranked)

| id / short title | severity | status | evidence |
|---|---|---|---|
| X1 /about closing invisible (borrowed class with z-index contract; needs one closing component) | P0 | FIXED | See /about P0 row |
| X2 ghost controls, 87% below 3:1 (article-choice, depth buttons, story-record, how-step-button, how-view-tab, hl-case, chain-case) | P1 | PARTIAL | article-choice, how-step-button, how-view-tab, hl-case, chain-case, depth buttons are gone (replaced by Ark tabs/accordion, which use --border-control: css/ark-blocks.css `.ark-btn`, segmented tabs). `story-record` still borderless (css/story-diagrams.css:20); hand-built tiles and Copy buttons as in M3; no defxn test asserts 3:1 |
| X3 Arial as fourth typeface; two sans faces | P1 | FIXED | See M8 |
| X4 fold budget missed on 13 of 35 routes | P1 | FIXED | See M1 **S0 sweep 2026-10-20:** see M1: fold-contrast-readings.tsv; 0 of those 13 routes is over 1.6 now |
| X5 same control built 7+ ways (3 ARIA models, 4 looks, 3 depth vocabularies) | P1 | PARTIAL | Ark tabs now drive home, about, chain, concept, story depth, lifecycle, economy, deploy; still hand-built: account sign-in tabs (account.js:68-75), lab study-tabs, explore pane switch (explore-story.css:149), story-record legend buttons (sheet.js:467) |
| X6 jargon with no glossary on page (abbr/dfn/tooltip aids 0 on non-article pages) | P1 | PARTIAL | Glossary-term mechanism shipped (js/content/glossary.js, 44 terms; `terms: 'first-use'` on story, deploy, bundle-deployer, concept, resolutions). Not wired on home, about, chain, explorer, account, lab, learnings, economy; no entries for mesh, quorum, DAO, roster, substrate, Auth Kit, Ghost ID, miner presence, CMS |
| X7 keyboard focus enters invisible fallback links; no skip link | P1 | FIXED | js/main.js:133-138 sets the fallback inert as well as aria-hidden; skip link index.html:84; tests/browser/site-fixes.mjs:152-163 |
| X8a naming drift: DEFXN / Flux / FXN ("Run Flux from source") | P1 | FIXED | No "Run Flux" or "Operate Flux" remain in js/ or css/; spec.js:156 |
| X8b naming drift: Notes / Learnings / Tutorials | P1 | PARTIAL | See /learnings names row (hero-motion.js:192 key name only; visible text is "NOTES") |
| X8c benchmark claims on / vs /concept/spec "no canonical public benchmark artifact" | P1 | FIXED | tests/concept-spec-current.cjs; home tiles from the verified registry (home.js:177-207) |
| X8d article excerpt vs article body ops/s | P1 | PARTIAL | See /learnings excerpt row (SEO description residual js/content/seo-data.js:681) |
| X9 four back-link/breadcrumb styles; three link-arrow meanings | P2 | PARTIAL | Ark breadcrumb and pager on every converted page; "↗ only on leaving links" enforced for all routes by tests/browser/site-fixes.mjs:179-225. Still: the fixed corner "← BACK HOME/NOTES" button (js/hero-motion.js:192), `.content-layer-path` chips in the explorer raw view, account.js "← All contacts" |
| X10 hard-coded scale: font sizes, 12 radii, 322 !important, 60 button signatures, CTA case | P2 | PARTIAL | Reduced (font-size px 485 to 266, !important 323 to 244 by grep; census ratchet, tests/ux-component-census.cjs) but not eliminated; CTA case open (story sheets row) |
| X11 tiny diagram text (story, how-cards, lifecycle, explorer grid, home isometric) | P2 | PARTIAL | Story/lifecycle/how-deploy fixed to 12px (story-diagrams.js:31, lifecycle.css:157); home isometric (home-swiss.css:49-80) and explorer grid label (how-overview.css:123, 8px) open |
| X12 performance: three full-viewport canvases per route; article extra canvases; about and chain rAF loops | P2 | PARTIAL | rAF loops settled (tests/browser/idle-frames.mjs, commit af33dc6); reduced-motion honoured (unchanged); canvas counts per route are asserted by no test (UNVERIFIED) |
| X13 markup as strings; copy in JS; ten `node()/el()` helpers | P2 | PARTIAL | account.js, lab.js model and explorer live parts still innerHTML; copy hard-coded in home.js:34-48, deploy.js:17-53, download.js:22-28, lifecycle.js:8-55, economy-preview.js:16-23, learnings.js:58-59 |

### Pattern frequency table (hand-built patterns, one row per pattern)

| id / short title | severity | status | evidence |
|---|---|---|---|
| T1 page hero (9 implementations) | - | PARTIAL | Ark `hero` on about, home, chain, concept, story pages, bundle-deployer, deploy, economy, learnings, lab, explore, account/domains; `account-hero` (account.js:58) is still its own |
| T2 eyebrow/kicker label (6) | - | PARTIAL | Ark `eyebrow` part used by blocks; `account-card-caption` (account.js), `how-work-signal` (explorer cards) remain |
| T3 segmented control/tabs (9, 3 ARIA models) | - | PARTIAL | See X5 |
| T4 back link/breadcrumb (5) | - | PARTIAL | See X9 |
| T5 CTA row (6+) | - | FIXED | Ark `actions` and `pager` blocks on converted pages (about.js:264, deploy.js, learnings.js); `download-way` previous/next buttons (download.js:83-86) are the page's own procedure controls |
| T6 diagram/illustration frame (8) | - | FIXED | Ark `figure` frame with 12px label floor and offscreen pause (story.js figure; home.js:253, chain.js:84) |
| T7 status/boundary callout (7) | - | FIXED | Ark `callout` (about.js:275, story.js boundary, deploy.js scope, economy-preview.js:62-70) |
| T8 step list/stepper (7) | - | PARTIAL | Ark `steps` and accordion on about, bundle-deployer, download, how chapters; chain stepper and account flow remain hand-built |
| T9 disclosure/accordion (3 looks) | - | PARTIAL | Ark `disclosure`/`accordion` on converted pages; native `<details>` remains in explorer raw view (explorer.js rawView) and account.js |
| T10 card grid (5) | - | FIXED | Ark `card-grid`/`card` (concept.js:67, learnings.js:34, about.js:255); `.explore-kind` tiles are live data cards (explorer) |
| T11 key/value record dl (4) | - | PARTIAL | Ark `facts` on how chapters, economy, deploy; account.js:61-65 and explorer detail dl remain |
| T12 stat tile (`dash-kit stat()` unused) | - | PARTIAL | Home uses Ark `stats` with absent state (home.js:285-288); explorer's own `mesh-explorer-stat` (explorer.js:857-927) remains |
| T13 form field + inline status (3) | - | OPEN | account.js, account-domains.js:47, economy-preview.js:99-135 still page-local forms |
| T14 code/terminal block + Copy (2 Copy styles) | - | OPEN | deploy.js commandCard vs download.js terminal; two Copy styles (css/page-layout.css:168, css/download.css:7) |
| T15 comparison/data table (2) | - | FIXED | Ark `table` (bundle-deployer.js:70, deploy.js review, article.js STARTING_VALUES) |
| T16 empty state (2) | - | OPEN | account-domains.js:55 and explorer empty states are still bespoke paragraphs |

### Component library order (reach x defect load)

| id / short title | severity | status | evidence |
|---|---|---|---|
| C1 button and segmented tabs | - | PARTIAL | Ark `tabs`/`actions`/toggle group adopted (see X5); CTA case and Copy variants open |
| C2 page hero | - | PARTIAL | Ark `hero` block (see T1); account page not converted |
| C3 breadcrumb / back link | - | PARTIAL | Ark `breadcrumb` (see X9) |
| C4 status callout | - | FIXED | Ark `callout` (see T7) |
| C5 diagram frame (min caption size, offscreen pause) | - | FIXED | Ark `figure` with data-ark-label floor; story.js onFigureVisibility |
| C6 disclosure/accordion | - | PARTIAL | See T9 |
| C7 stepper | - | PARTIAL | See T8 |
| C8 linked card | - | FIXED | Ark `card` (see T10) |
| C9 key/value record | - | PARTIAL | See T11 |
| C10 closing-section component | - | FIXED | Obviated by the Ark `pager` block (about.js:264); no `hl-closing` remains |
| C11 glossary-term tooltip | - | PARTIAL | Component and glossary exist (js/content/glossary.js, `terms: 'first-use'`); wired on a subset of pages, glossary missing the terms in X6 |


---

## docs/ux-audit/pages-ux-b.md (per-page UX audit, routes second half)

Audited against the working tree (baseline 5a1ac71, plus 3462ab4, af33dc6 and uncommitted edits). Paths are relative to /Volumes/PortableSSD/flux/defxn.
Almost every page in this report was converted to Ark blocks in Wave 3 (W3-GUIDE / W3-STATS); the fold-by-deletion rule is now a unit test (tests/fold-no-hidden-content.cjs).
"UNVERIFIED" means a measured number (fold ratio, pixel gap, contrast) that only a browser can decide; the structural cause is cited where the code removes it.

### Method + summary table (report preamble, lines 1-59)
Counts: FIXED 0, PARTIAL 0, OPEN 0, OWNER 0, OUT-OF-REPO 0, UNVERIFIED 0
(No findings of its own: the summary table's per-route fold/jargon/focus numbers are restated by each route's rows below. Every page "has no skip link / no contentinfo landmark / 4-9 nav landmarks" is graded under cross-page #10.)

### /lifecycle/intent, /offer, /fulfillment, /receipt (and /agreement, same module)
Counts: FIXED 6, PARTIAL 0, OPEN 0, OWNER 1, OUT-OF-REPO 0, UNVERIFIED 1
| id / short title | severity | status | evidence |
|---|---|---|---|
| LC-1 mobile layout removes the illustration (`.stage-scene{display:none}`) | P1 | FIXED | story.js folds every story figure in Ark disclosure "Show the illustration" (foldBelow tablet) `js/pages/story.js:166` (block('disclosure','figure'...)); no `display:none` on `.stage-scene` in `css/lifecycle.css`; asserted `tests/fold-no-hidden-content.cjs:56-71`; `tests/story-blocks.cjs` header |
| LC-2 conflicting numbering (crumb 02/03, kicker 01, trail 01-05) | P1 | FIXED | crumbs carry no ordinals `js/pages/lifecycle.js:570`, eyebrow is `ArkUI.story.position` "Agreement lifecycle . n of 5" (`js/pages/lifecycle.js:571`, `js/pages/story.js:204`); the 01-05 trail is now the pager's "other stages" row; named in `tests/story-blocks.cjs` header |
| LC-3 layout shift on "Understand why" + 15 selector controls | P1 | FIXED | one Ark segmented tabs control with panels below the tab row (`js/pages/story.js:145` block('tabs','depth')); the five fact chips are now one Ark accordion in "How it works" (`js/pages/lifecycle.js:579` accordion); the 57px shift itself was not re-measured |
| LC-4 ~180px void above the "Not yet established" box | P2 | UNVERIFIED (needs browser) | boundary is now an Ark callout under the depth control (`story.js` boundary holder); `.lifecycle-boundary{margin-top:auto}` (`css/lifecycle.css:17`) is no longer used by any page (`grep lifecycle-boundary js` = 0); the remaining gap on desktop needs a screenshot |
| LC-5 "Read the agreement guide ↗" internal link looks external | P2 | FIXED | label has no glyph, Ark action tone link (`js/pages/lifecycle.js:562` `guide`); `tests/site-exits.cjs:57-58` forbids `Read the agreement guide ↗`; `dash.linkIcon` gives in-site links an arrow (`site-exits.cjs`) |
| LC-6 17 text elements under 12px | P2 | FIXED | illustration labels sit in Ark's figure frame which holds `data-ark-label` at 12px+ (`tests/story-blocks.cjs` header); stage-scene labels `css/lifecycle.css:77-78` 12px; `createMeshFabric(..., {labelMin: 12})` `js/pages/lifecycle.js` trailFigure. Count itself not re-measured; dead `.how-work-number` 11px / `.how-chapter-label` 9px rules at `css/lifecycle.css:54,111` belong to /how-deployment-works (report B does not cover) |
| LC-7 copy hard-coded in `ArkUI.lifecycleContent`, not a manifest | P2 | OWNER | still in-module `js/pages/lifecycle.js:8-76`; header comment says a manifest now would grow a JSON-in-JS store (`docs/ux-audit/components.md` R12, AGENTS.md "No more JSON storage"). Decision needed: write lifecycle copy as FLX-grammar records, or accept in-module copy until the manifest store moves |
| LC-8 hand-built patterns (breadcrumb, kicker, depth tabs, callout, figure frame, stepper, fact chips, prev/continue nav) | - | FIXED | all are Ark blocks via the story template: `js/pages/story.js` spec() (breadcrumb, hero, tabs, accordion, callout, disclosure+figure, pager); `tests/story-blocks.cjs` asserts "no hand-built page structure is left" for lifecycle.js |

### /palette
Counts: FIXED 5, PARTIAL 1, OPEN 3, OWNER 1, OUT-OF-REPO 0, UNVERIFIED 0
| id / short title | severity | status | evidence |
|---|---|---|---|
| PA-1 over the fold: 2.76x desktop / 4.51x mobile | P1 | FIXED | structure is the fix: six Ark tabs (Components / Primary / Secondary / Reference / States / Neutrals) and a States accordion, `js/pages/palette.js:126-141` (spec 'palette-views'); header comment `palette.js:7-10` claims it is inside the rule; no test asserts the ratio **S0 sweep 2026-10-20:** fold-contrast-readings.tsv L8 (1440: 1.03), L77 (390: 1.59, only 0.01 under the limit) |
| PA-2 page omits the SDK semantic tokens (`--overlay`, `--drift`, `--trust`, `--live`, `--role`, `--badge`, `--hidden`) | P1 | OPEN | `ROLES` and `NEUTRALS` still list only primary/secondary/reference/success/warning/danger and canvas/depth/surface/raised/nested/text-* `js/pages/palette.js:22-30`; fix edits `js/pages/palette.js` (+ `css/palette.css` if the grid changes) |
| PA-3 rule shown here broken elsewhere (primary "Never a button" vs Ready painted `--primary`) | P1 | FIXED | status is now said in words, no hue: `js/pages/resolutions.js:31-36` (STATUS = ready/building labels); `css/resolutions.css` has no page rules (header, lines 1-4); `tests/resolutions-blocks.cjs` |
| PA-4 wrong kicker class (`account-kicker` renders sans) | P2 | FIXED | hero block's own eyebrow replaces it, `js/pages/palette.js:121-124`; `account-kicker` no longer in `palette.js` |
| PA-5 147 text elements under 12px (swatch captions) | P2 | FIXED | swatch label 12px mono / caption 12px `css/palette.css:9-10`, component caption 12px `:13`; the 147 count was not re-measured |
| PA-6 theme-name map hard-coded (`palette.js:80`) | P2 | OWNER | still a literal `THEME_NAMES` `js/pages/palette.js:31`; header comment `:12-14` defers it: a manifest now would grow a JSON-in-JS store (AGENTS.md "No more JSON storage", `docs/ux-audit/components.md` R12). Decision: when and in what FLX grammar the page copy stores move |
| PA-7 no typography section (three font slots, type scale) | P2 | OPEN | no tab or section for fonts/type in the spec `js/pages/palette.js:119-148`; fix edits `js/pages/palette.js` (new tab + slot) |
| PA-8 fixes: swatch contrast ratio vs `--canvas` | - | OPEN | `swatch()` `js/pages/palette.js:34-39` renders token + name only, no ratio |
| PA-9 fix: link the page from the footer as "Design system" (orphan, 0 inbound) | - | FIXED | in the `preview` journey (`js/content/site-pages.js:42`, which drives menu/footer/sitemap) and linked from the theme settings panel ("See the full palette"): `tests/site-exits.cjs:42-44`; label there is "Interface palette", not "Design system" |
| PA-10 hand-built patterns (header, swatch, button grid, choice group, role section) | - | PARTIAL | header, sections, tabs, accordion, figure are Ark blocks (`palette.js:119-148`); swatch grids and the button demo remain page-owned slots by design (they ARE the live theme, `palette.js:6-7`) |

### /reference (hidden, `?doc=...&from=...`)
Counts: FIXED 1, PARTIAL 1, OPEN 5, OWNER 0, OUT-OF-REPO 0, UNVERIFIED 0
| id / short title | severity | status | evidence |
|---|---|---|---|
| RF-1 mobile fold 1.68x on a reading surface | P2 | OPEN | no TOC accordion, no explicit fold-rule exemption for readers; module unchanged in this respect `js/pages/reference.js:73-86`. Needs owner wording if the fold rule should exempt long-form readers (edits `js/pages/reference.js`, `docs/ux-audit/plan.md`) |
| RF-2 heading levels skip H2 (H1 -> H3) | P2 | OPEN | `js/pages/reference.js:74-76` still `'h'+Math.min(6, level+1)`; the doc's `#` that equals the title is dropped (`:74`), so its `##` render as `h3` under the page `h1` |
| RF-3 raw repo-path kicker ("Canonical reference / docs/protocol/agreements.md") in body sans | P2 | OPEN | `js/pages/reference.js:86` `ArkUI.el('p','story-kicker','Canonical reference / '+current.doc)` unchanged |
| RF-4 tables are bare `<table>`, no wrapper, overflow on mobile | P2 | PARTIAL | no `DataTable` wrapper (`js/pages/reference.js:66` builds `table` directly), but `css/reference.css:15` `.reference-body table{display:block;overflow-x:auto}` scrolls it (that rule is unchanged from baseline) |
| RF-5 fixed back target ("Return to the explanation" even from /stats) | P2 | FIXED | `backLink()` labels by the `from` page's catalog title `js/pages/reference.js:24-35`; `tests/reference-reader.cjs` asserts "Return to Offer: propose the terms" |
| RF-6 fixes: auto TOC when > 4 headings | - | OPEN | not built (no TOC in `js/pages/reference.js`); same files as RF-1 |
| RF-7 hand-built patterns (Markdown renderer, back nav, kicker, provenance callout) | - | OPEN | all still hand-built `js/pages/reference.js:54-86`; the report itself says keep the renderer and emit shared `DataTable`/`CodeBlock` (neither exists) |

### /resolutions (index)
Counts: FIXED 6, PARTIAL 1, OPEN 0, OWNER 0, OUT-OF-REPO 0, UNVERIFIED 0
| id / short title | severity | status | evidence |
|---|---|---|---|
| RS-1 deck and footer note truncated with no way to read (line-clamp) | P1 | FIXED | deck and note are Ark disclosures: whole from 601px, one line + "More" on a phone `js/pages/resolutions.js:129,142`; no clamp or `display:none` in `css/resolutions.css`; `tests/fold-no-hidden-content.cjs:91-108`; `tests/resolutions-blocks.cjs:181` |
| RS-2 mobile domain tabs show only 01..05, card descriptions hidden | P1 | FIXED | tab labels are `group.title . count` at every width, cards carry description `js/pages/resolutions.js:131-139`; `tests/resolutions-blocks.cjs:180` (all 20 cards present) |
| RS-3 tabpanel focus ring missing | P1 | FIXED | `css/focus.css:19-23` ring on any non-control `[tabindex]`; and the tabs are Ark's; `tests/a11y-chrome.cjs:36` |
| RS-4 vanity stat triplet `20 / 05 / 01 MESH` | P2 | FIXED | folded into the eyebrow's tail, counted from the structure `js/pages/resolutions.js:122-126` (the literal "01 mesh" remains in that string); report's own fix |
| RS-5 undefined jargon ("mesh" x6, "resolution" vs "resolver") | P2 | PARTIAL | page uses `terms: 'first-use'` (`js/pages/resolutions.js:222`) so glossary words get a tip; but `docs/glossary.md`/`js/content/glossary.js` have no "mesh" or "resolution" entry, and the one-line "a resolution is... a resolver is..." definition was not added (DECK copy unchanged, `js/content/manifests/resolutions.js:23-26`). Fix edits `docs/glossary.md` (then `node scripts/build-glossary.cjs`) and the DECK copy |
| RS-6 fix: mobile tab strip scroll / names | - | FIXED | same as RS-2 |
| RS-7 hand-built patterns (breadcrumb, hero+stat, ARIA tablist #1, card-link grid, footer note) | - | FIXED | all Ark blocks: breadcrumb, hero, tabs, card-grid, disclosure+actions `js/pages/resolutions.js:117-144`; only `tests` keep the layout-key pins |

### /resolutions/* (20 detail pages, one template)
Counts: FIXED 5, PARTIAL 2, OPEN 0, OWNER 0, OUT-OF-REPO 0, UNVERIFIED 1
| id / short title | severity | status | evidence |
|---|---|---|---|
| RD-1 mobile feature reduction (lede, Problem row, CTA, legend gone; product lines clamped) | P1 | FIXED | lede and main action are the hero's; "who it is for + problem" is a phone-only Ark disclosure "Who it is for, and the problem", never `display:none`; products are accordion rows; legend is the "Ready now" tab's first line `js/pages/resolutions.js:175-182`; `tests/resolutions-blocks.cjs:193` (all 20 routes); `tests/fold-no-hidden-content.cjs:91-108` (`css/resolutions.css` clamps/hides nothing) |
| RD-2 invisible focus on the tabpanel (40 checks) | P1 | FIXED | `css/focus.css:19-23`; `tests/a11y-chrome.cjs:36`. The hand-built tablists are Ark tabs now |
| RD-3 "Ready" drawn in `--primary` (two meanings of "available") | P1 | FIXED | state is said in words beside the product name (`STATUS`, `js/pages/resolutions.js:31-36`, row title `product.name . Ready/Building`); `css/resolutions.css` has no status rule |
| RD-4 jargon density (3-14 unexplained hits; deployments 14, website 13, content 11) | P2 | PARTIAL | `terms: 'first-use'` is on (`js/pages/resolutions.js:221`) so glossary words get tips; "FXN", "mesh", "bundle" are not in `docs/glossary.md`/`js/content/glossary.js` (44 terms), so they stay bare. Fix edits `docs/glossary.md` then `scripts/build-glossary.cjs` |
| RD-5 empty tabpanel space (~140px above/below the three steps) | P2 | UNVERIFIED (needs browser) | the fixed-height panel is gone (Ark tabs size to content, `css/resolutions.css` has no page rules) but the gap itself needs a screenshot |
| RD-6 nested selection model (idea rail inside a tabpanel) | P2 | FIXED | product ideas are an accordion in the "Product ideas" tab `js/pages/resolutions.js:193-199`; no `aria-pressed` rail left |
| RD-7 fixes: map Ready/Building/Idea to `--success`/`--drift`/`--reference` (status colours) | - | PARTIAL | words, not colours: `STATUS` has only `label`; no tone mapping (the Ark card status/badge tones from W1-ARK-PARTS are not used here). Fix edits `js/pages/resolutions.js:31-36,188` |
| RD-8 hand-built patterns (breadcrumb, hero, tablist #2, product tile, status mark+legend, idea rail, step list, pager) | - | FIXED | Ark breadcrumb/hero/disclosure/tabs/accordion/steps/pager `js/pages/resolutions.js:173-207` |

### /resolver-math
Counts: FIXED 4, PARTIAL 2, OPEN 1, OWNER 0, OUT-OF-REPO 0, UNVERIFIED 0
| id / short title | severity | status | evidence |
|---|---|---|---|
| RM-1 fold and length: 8.45x / 13.52x, 2,068 words, 21 buttons, 45 chips (keep equation hero; six sections into Tabs/Accordion) | P0 | FIXED | structure done: hero states the sum, equation is the first of seven Ark tabs, tables/drawings in accordions `js/pages/resolver-math.js:21-30,697-796`; `tests/resolver-math-blocks.cjs:6-9` states each view <= 1.6x but only from the W3-STATS agent's measurement; no test asserts a ratio **S0 sweep 2026-10-20:** fold part decided: fold-contrast-readings.tsv L10 (1440: 1.41), L79 (390: 1.00); At rest (default tab/step/accordion); the other views a reader opens on purpose are not measured. |
| RM-2 type-scale drift: 22 font sizes, 86 elements under 12px | P1 | PARTIAL | shell/tables/notes are Ark's now, but `css/resolver-math.css` still has ~14 distinct sizes (rem steps `:38-168`, 15px `:195`) and drawing text at 7.5/9px `:196-202` (SVG units, so rendered size unmeasured); no shared SDK scale yet |
| RM-3 jargon: 82 hits on 14 terms; glosses only in the equation | P1 | OPEN | `ArkUI.page` options carry no `terms: 'first-use'` (`js/pages/resolver-math.js:827`), only 2 hand `[[...]]` marks; equation glosses still live in one array (the "glossary source" fix is not built). Fix edits `js/pages/resolver-math.js` (+ `docs/glossary.md` for role letter/box/type-scoped shape, which are already there) |
| RM-4 orphaned (0 inbound; /what-is-a-resolver does not link) | P1 | FIXED | /what-is-a-resolver pager related includes MATH `js/pages/resolver-lab.js:499` (`MATH.HREF` = `route:resolver-math`, `js/content/manifests/resolver.js:394`); also /concept and /resolutions/rules,/algorithms: `tests/site-exits.cjs:27-35`; the page leads on to /resolvers `resolver-math.js:793` |
| RM-5 low-contrast small text (kicker 4.44:1 at 9px, captions 4.44:1) | P2 | FIXED | kicker is the hero eyebrow (Ark) and caption sizes are Ark's figure caption; contrast of the Ark tokens not computed here **S0 sweep 2026-10-20:** fold-contrast-readings.tsv L148/L223: lowest text contrast on `/resolver-math` is 5.71 (1440) and 8.30 (390), so no 4.44:1 text remains; no text under 12px in the page body, only the kit footer strip (L1262-L1269) |
| RM-6 hand-built patterns (shell, figure frame, status tag, callout, equation grid, builder, D.table x5, chips, code list, D.stat, link panel) | - | PARTIAL | shell/hero, figures, tables, stats, callout, pager are Ark blocks; the equation, builder and explorer stay page-owned slots by design `js/pages/resolver-math.js:818-836`; the builder's `.rm-chips` buttons are not a shared component |
| RM-7 fix: "Next: the math behind it ->" link from the Laws step | - | FIXED | same as RM-4 (`js/pages/resolver-lab.js:499`) |

### /resolvers
Counts: FIXED 4, PARTIAL 2, OPEN 0, OWNER 0, OUT-OF-REPO 0, UNVERIFIED 1
| id / short title | severity | status | evidence |
|---|---|---|---|
| RV-1 dead end: 0 links, 0 buttons, no breadcrumb | P0 | FIXED | breadcrumb + pager of six links (what is a resolver, resolver math, reference resolvers, create a network, /stats throughput, Explore) `js/pages/resolvers.js:257-266`; named in `tests/resolvers-blocks.cjs:6-8`; `tests/site-exits.cjs:26` |
| RV-2 jargon wall: 93 hits on 22 terms, `LEDGERENTRY`/`G`/`J`/`Y` identifiers up front | P0 | PARTIAL | page was rewritten as a registry snapshot with a plain lede (`copy:RESOLVER.REGISTRY.LEDE`, `js/content/manifests/resolver.js:408`), no `LEDGERENTRY` in `js/pages/resolvers.js`; resolver/capability/provider glossed by hand `resolvers.js:51-58,181,196,242`. Chain ids, source hashes and `dense-wire` names remain in the tables by design; hit counts not re-measured. The lede still does not say "a resolver is the logic that turns signed records into an answer" in one sentence |
| RV-3 fold: 4.02x / 7.85x (DeFi card ~1.3 viewports) | P1 | FIXED | one Ark tab per question (chains, capabilities, bridges, deploy, applications) `js/pages/resolvers.js:176-226,254`; `tests/resolvers-blocks.cjs:11` says each view <= 1.6x (agent report only) **S0 sweep 2026-10-20:** fold-contrast-readings.tsv L11 (1440: 1.41), L80 (390: 1.38) |
| RV-4 empty right half of the hero tile | P1 | UNVERIFIED (needs browser) | the 7-of-12 `stats-tile` hero is gone (Ark hero with details, `resolvers.js:241-252`); the first screen was not screenshotted |
| RV-5 second tile system; `esc`/`fmt`/`tile` re-implemented | P2 | FIXED | no `stats-tile`/`css/stats.css` left (`git grep stats-tile` empty), page is Ark blocks (`js/pages/resolvers.js:1-22`); `tests/resolvers-blocks.cjs:9-10`. A one-line local `fmt()` remains (`resolvers.js:43`) |
| RV-6 fixes: compact resolver cards with Details disclosures; add links | - | PARTIAL | links added (RV-1); the six applications are an accordion `resolvers.js:219-226`; the "card with headline number" shape was not built (chains are a table row each) |
| RV-7 hand-built patterns (tile, statusChip, measuredRow, resolver card, accordion, hero+chips, step list) | - | FIXED | Ark hero details, table, accordion, steps `js/pages/resolvers.js:241-266` |

### /start-from-something-real (catalog id `references`)
Counts: FIXED 4, PARTIAL 1, OPEN 0, OWNER 0, OUT-OF-REPO 0, UNVERIFIED 2
| id / short title | severity | status | evidence |
|---|---|---|---|
| SR-1 naming mismatch (three names) and 0 inbound links | P1 | FIXED | one name "Reference resolvers" in catalog `js/content/site-pages.js:46`, breadcrumb (`manifest.title`, `js/content/manifests/references.js:4`) and H1 ("Reference resolvers, without the leap of faith", `:22`); inbound from /what-is-a-resolver `INSPECT.HREF`: `tests/site-exits.cjs:23-24` |
| SR-2 square Arial 13.33px depth buttons | P1 | FIXED | one Ark tabs control with `font:inherit` (`css/page-layout.css`, `tests/a11y-chrome.cjs:31-34`); `tests/story-blocks.cjs` header |
| SR-3 mobile hides the diagram | P1 | FIXED | figure folds behind "Show the illustration" below 900px `js/pages/story.js:166`; `tests/resolver-guide-blocks.cjs:122-130` asserts the `tablet` fold |
| SR-4 mobile eyebrow promoted to a large sans line | P1 | UNVERIFIED (needs browser) | eyebrow is now the Ark hero eyebrow (`js/pages/resolver-guide.js:60` `copy('EYEBROW')`); rendered mono-uppercase on a phone not screenshotted |
| SR-5 ~170px empty band on desktop | P2 | UNVERIFIED (needs browser) | layout is the story template's two columns (`css/block-page.css`); no screenshot |
| SR-6 fix: add "What would make this real" as the next step | - | PARTIAL | the missing record is named: boundary says evidence is pending and "How it works" lists what a publishable reference needs (`js/pages/resolver-guide.js:69`, `BODY3`), but How it works and Evidence both show the same `BODY3` text (`:63,65`) and there is no dedicated step |
| SR-7 hand-built patterns (breadcrumb, kicker, depth tabs duplicate, diagram frame, boundary, continue nav, step picker) | - | FIXED | story template: `js/pages/story.js` (`tests/story-blocks.cjs` asserts no hand-built structure) |

### /stats
Counts: FIXED 3, PARTIAL 4, OPEN 0, OWNER 0, OUT-OF-REPO 0, UNVERIFIED 1
| id / short title | severity | status | evidence |
|---|---|---|---|
| ST-1 information overload: 12.62x / 20.73x, 3,387 words, 20 H2, one button, no in-page nav | P0 | FIXED | hero answers; seven Ark tabs (Live / Chain / Throughput / Client path / Platform / Evidence / Readiness), each dated run an accordion `js/pages/stats.js:12-24,670-710`; Refresh is the hero's second action `:670-679`; `tests/stats-page.cjs:15-18` records <= 1.6x from the W3-STATS agent only; engineering detail moved to `docs/whitepaper.md` appendices B-F (stats.js:21-24) **S0 sweep 2026-10-20:** fold part decided: fold-contrast-readings.tsv L18 (1440: 1.20), L87 (390: 1.17); At rest (default tab/step/accordion); the other views a reader opens on purpose are not measured. |
| ST-2 jargon: 236 hits on 23 terms | P0 | PARTIAL | hand-marked glossary tips (node, segment, shard, replica, batch auction) `js/pages/stats.js:501-528`; no `terms: 'first-use'` on the page (`:707`); host names and fleet jargon remain. Fix edits `js/pages/stats.js` |
| ST-3 type-scale drift: 16 sizes, 171 elements under 12px | P1 | PARTIAL | tiles/tables/bars are Ark blocks (no `innerHTML`/`el('table')` in `js/pages/stats.js`); `css/stats-dashboard.css` is now 26 lines and only the shared dash-kit shell uses it; sizes not re-measured **S0 sweep 2026-10-20:** fold-contrast-readings.tsv L1332-L1339: at rest the `/stats` body has no text under 12px (the 171 are gone); what remains under 12px is the kit header/footer strip (10-11px, S0-5). The count of distinct sizes (16) was not re-measured |
| ST-4 failed API calls locally: check the unavailable state | P1 | FIXED | `feedUnavailable()` names failure, missing thing and remedy, tiles say "No reading" (never 0 or a dash) `js/pages/stats.js:60-77`; `tests/stats-unavailable-not-zero.cjs` |
| ST-5 1s clock keeps running when the tab is hidden | P2 | FIXED | clock runs only while visible `js/pages/stats.js:891-919`; asserted `tests/stats-page.cjs:12` |
| ST-6 bar-row asymmetric radii, 8 radius values | P2 | UNVERIFIED (needs browser) | hand-built bar rows are gone (Ark `meter`, 2 uses in `js/pages/stats.js`); the radii of Ark's meter/tiles not measured |
| ST-7 fixes 1-5 (tabs, BENCH summary rows, glossary tips, shared BarList/DataTable, SDK scale) | - | PARTIAL | tabs + accordion per run done, `table`/`meter` blocks used (10 tables, 2 meters); glossary tips partial (ST-2); no SDK type scale (see CP-7) |
| ST-8 hand-built patterns (header shell, stat value, 7+ bar lists, 7 tables, node cards, readiness list, polling loops) | - | PARTIAL | header, tables and bars are Ark blocks; the polling loops stay page-owned (`stats.js:787,823,899`) and there is no shared `LiveStatus` component |

### /stats/gpu (hidden)
Counts: FIXED 6, PARTIAL 0, OPEN 0, OWNER 0, OUT-OF-REPO 0, UNVERIFIED 0
| id / short title | severity | status | evidence |
|---|---|---|---|
| GP-1 orphan: unreachable | P1 | FIXED | /stats links it (`{ label: 'The GPU, and why it is not compute-bound', href: 'route:stats/gpu' }`, `js/pages/stats.js:635`); in the `prove` journey `js/content/site-pages.js:53`; `tests/site-exits.cjs:21` |
| GP-2 fold 1.98x / 3.19x, half-width hero | P1 | FIXED | answer first, detail in five Ark tabs `js/pages/stats-gpu.js:8-14,89`; `tests/stats-gpu-blocks.cjs:6-10` (<= 1.6x from the agent report) **S0 sweep 2026-10-20:** fold part decided: fold-contrast-readings.tsv L19 (1440: 1.19), L88 (390: 1.48); the half-width hero was not measured |
| GP-3 non-interactive `<li>` bar rows are Tab stops | P1 | FIXED | bars are Ark `meter`, nothing sets a tabindex: `tests/a11y-chrome.cjs:43-48`; each bar names its CPU in text `stats-gpu.js` |
| GP-4 tables in monospace | P2 | FIXED | Ark table; one mono column only (`How`, `js/pages/stats-gpu.js:92`) |
| GP-5 duplicated helpers `esc/fmt/pct/tile/headRow/row/bars` | P2 | FIXED | deleted, per header `js/pages/stats-gpu.js:11-13`; `git grep "function esc\|function headRow"` empty in these pages |
| GP-6 hand-built patterns (`tile`, `headRow/row`, `bars`, hero) | - | FIXED | Ark hero/table/meter/tabs |

### /stats/ledger (hidden)
Counts: FIXED 3, PARTIAL 4, OPEN 0, OWNER 0, OUT-OF-REPO 0, UNVERIFIED 0
| id / short title | severity | status | evidence |
|---|---|---|---|
| LG-1 overload: 8.98x / 14.6x, 2,636 words, raw-number H2s | P0 | FIXED | plain hero + three numbers, seven Ark tabs, dated runs in accordions `js/pages/stats-ledger.js:6-14,206-310`; raw-number headings gone (tab labels are plain: How it works / What it closes / On the wire / Fleet runs / One machine / Attacks / Durability); `tests/stats-ledger-page.cjs:6-10` (<= 1.6x from the agent report) **S0 sweep 2026-10-20:** fold-contrast-readings.tsv L20 (1440: 1.00), L89 (390: 1.16) |
| LG-2 jargon: 158 hits on 22 terms, inline `code` identifiers | P0 | PARTIAL | 4 hand glossary marks `js/pages/stats-ledger.js` (glossary has equivocation, CID, K-of-N); no `terms: 'first-use'` (`js/pages/stats-ledger.js:316`); code identifiers (`admit_burst`, ...) remain in the evidence tabs by design |
| LG-3 focusable bar rows; 142 elements under 12px on mobile | P1 | PARTIAL | focus half FIXED (Ark meter, `tests/a11y-chrome.cjs:43-48`); text-size count UNVERIFIED (needs browser) |
| LG-4 duplicated helpers | P2 | FIXED | helpers and `css/stats.css` classes gone (`js/pages/stats-ledger.js:12-14`) |
| LG-5 fix: lead with the "Problems that stop being problems" table | - | PARTIAL | the table is the second tab ("What it closes"), `js/pages/stats-ledger.js:225`; the first tab is "How it works" |
| LG-6 fix: BenchmarkCard + glossary for equivocation, CID, K-of-N | - | PARTIAL | dated runs are accordion rows (no BenchmarkCard block exists); glossary entries exist (`docs/glossary.md`) but are applied only where hand-marked (LG-2) |
| LG-7 hand-built patterns (tile, 6 tables, cpuBars, chain-entry sample, hero, spec cards) | - | FIXED | Ark table/meter/hero/facts/accordion |

### /treasury
Counts: FIXED 5, PARTIAL 0, OPEN 1, OWNER 0, OUT-OF-REPO 0, UNVERIFIED 1
| id / short title | severity | status | evidence |
|---|---|---|---|
| TR-1 fourth font (Albert Sans hard-coded instead of `var(--font-sans)`) | P1 | FIXED | `css/economy-preview.css` uses only `var(--font-sans/--font-mono)`; Albert Sans is itself the sans slot now (`assets/kit/defxn-fonts.css:49-51`, "display = sans = Albert Sans; mono = IBM Plex Mono") |
| TR-2 no breadcrumb / no way back | P1 | FIXED | Ark breadcrumb Home > Treasury preview `js/pages/economy-preview.js:60,71`, pager with Preview a deposit / Resolve your payments / Your account `:92-93`, Treasury hand-off `:73-75` |
| TR-3 "FXN / Tier 1" unexplained | P1 | OPEN | still the bare term `FXN / TIER 1` / tab label `js/pages/economy-preview.js:77-78`; the page passes no `terms` option (`js/pages/economy-preview.js:155`) and `docs/glossary.md` has no "tier" entry. Fix edits `docs/glossary.md` + `js/pages/economy-preview.js` |
| TR-4 "Preview a deposit ↗" internal link | P2 | FIXED | now the pager's next link with no glyph `js/pages/economy-preview.js:92`; `tests/site-exits.cjs:57-58` forbids `label + ' ↗'` |
| TR-5 asset tabs are a pressed-button group | P2 | FIXED | Ark tabs `js/pages/economy-preview.js:76-90` |
| TR-6 ~40% empty frame below content | P2 | UNVERIFIED (needs browser) | frame is the shared block page; no screenshot |
| TR-7 hand-built patterns | - | FIXED | Ark hero/callout/tabs/accordion/facts/pager; only the deposit form is page-owned by design `economy-preview.js:97-137` |

### /what-is-a-resolver (catalog id `resolver`)
Counts: FIXED 2, PARTIAL 2, OPEN 1, OWNER 1, OUT-OF-REPO 0, UNVERIFIED 0
| id / short title | severity | status | evidence |
|---|---|---|---|
| WR-1 mobile hides the definition, kicker, policy address, law bodies, breadcrumb, spec, mesh labels (~10 `display:none`) | P1 | FIXED | story template (lede, eyebrow, breadcrumb, spec/status links = blocks), laws are an Ark accordion, figure folds under "Show the illustration"; `css/resolver-lab.css` hides only the run's own back/next/again controls: `tests/fold-no-hidden-content.cjs:73-89`; `tests/resolver-guide-blocks.cjs`; `tests/browser/fold-disclosures.mjs` (browser driver, not run here) |
| WR-2 "3.2 MB" label 4.44:1 at 10.5px | P2 | FIXED | labels are 12px now (`css/resolver-lab.css:31,56`); contrast of the label colour not computed **S0 sweep 2026-10-20:** fold-contrast-readings.tsv L147/L222: lowest text contrast on `/what-is-a-resolver` is 5.71 (1440) and 7.52 (390); no "3.2 MB" label exists in js/ or css/ any more |
| WR-3 dead-ish end: Laws step does not link to /resolver-math, /resolvers, /resolutions | P2 | PARTIAL | pager related: REGISTRY (/resolvers), MATH, EXPLORE, DEPLOYER plus reference resolvers `js/pages/resolver-lab.js:497-499`; no link to /resolutions. Fix edits `js/pages/resolver-lab.js` and the RESOLVER manifest |
| WR-4 "claim" in the H1 before it is defined | P2 | OPEN | the first-use marker glosses only `text`-kind props (`scripts/ark-blocks-adapter.js:134`), so the hero title is not marked; no tip on the H1 word |
| WR-5 fix: promote this page's stepper/demo frame as the reference implementation | - | OWNER | advisory, no code change; decision: whether the lab's step track and demo figure become the shared `Stepper`/`FigureFrame` (the track is still page-owned in `css/resolver-lab.css`) |
| WR-6 hand-built patterns | - | PARTIAL | breadcrumb, hero, laws accordion, pager, figure frame are Ark; the stepper track and segmented input picker stay page-owned inside the live figure |

### Cross-page findings (ranked 1-11)
Counts: FIXED 9, PARTIAL 3, OPEN 0, OWNER 1, OUT-OF-REPO 0, UNVERIFIED 3
| id / short title | severity | status | evidence |
|---|---|---|---|
| CP-1 four pages hold ~9,000 words of research log (/stats, /stats/ledger, /resolver-math, /resolvers); no in-page nav; one `<details>` | P0 | FIXED | all four are now hero + Ark tabs + accordions (`js/pages/stats.js:670-680`, `stats-ledger.js:214`, `resolver-math.js:697-796`, `resolvers.js:254`); 38 `disclosure` and 36 `accordion` uses across `js/pages`; no `BenchmarkCard` block was built (accordion rows instead). The <= 1.6x claims in the tests are agent-reported, not asserted **S0 sweep 2026-10-20:** fold part decided: fold-contrast-readings.tsv L18/L87 (`/stats` 1.20/1.17), L20/L89 (`/stats/ledger` 1.00/1.16), L10/L79 (`/resolver-math` 1.41/1.00), L11/L80 (`/resolvers` 1.41/1.38) |
| CP-2 fold rule met by deletion and clamping, not structure | P1 | FIXED | `tests/fold-no-hidden-content.cjs` reads the stylesheets as rules and fails on `display:none`/`line-clamp` on lifecycle, resolver-lab and resolutions content; the "Disclosure" primitive is Ark's `disclosure` block (`css/ark-blocks.css`); `tests/browser/fold-disclosures.mjs` proves reachability (browser driver, not run here) |
| CP-3 two tile systems and copied helpers (/resolvers, /stats/gpu, /stats/ledger) | P1 | FIXED | `css/stats.css` and every `stats-tile` are gone (`git grep stats-tile` empty); the three pages are Ark blocks; `esc/fmt/pct/tile/headRow/row` deleted (`js/pages/stats-gpu.js:11-13`, `stats-ledger.js:12-14`). `D.barList()`/`D.benchmark()` were not added: Ark `meter`/`table` are used instead |
| CP-4 three page-frame widths (1080 / 1352 / full-bleed) | P1 | FIXED | one standard 1080 frame; only deployment and /account keep 1600: `js/ark/panel-continuity.js:34-36`; `tests/state-layering.cjs:30-39`. No `PageFrame narrow/wide/dashboard` component, and `/reference` keeps its own 1080 (`css/reference.css:2`) |
| CP-5 no glossary mechanism anywhere | P1 | PARTIAL | built: `docs/glossary.md` -> `scripts/build-glossary.cjs` -> `js/content/glossary.js` (44 terms) -> Ark `term` block and first-use marking (`scripts/ark-blocks-adapter.js:96-134`, `terms: 'first-use'`). Left: terms the pages use but the glossary lacks (mesh, resolution, FXN, bundle, tier, ops/s, DAO, attest, ...); first-use is on only for story, resolutions, concept, deploy and bundle-deployer pages, while /stats, /stats/gpu, /stats/ledger, /resolvers mark by hand and /resolver-math barely at all. Fix edits `docs/glossary.md`, `js/pages/resolver-math.js`, `stats.js`, `stats-gpu.js`, `stats-ledger.js` |
| CP-6 four selector models built by hand eight times; Arial; tabpanel without focus ring | P1 | PARTIAL | ARIA tablists, pressed groups, depth chips are Ark tabs/accordion with `font:inherit` and one ring (`css/focus.css:19-27`, `tests/a11y-chrome.cjs:31-37`, `tests/story-blocks.cjs`). Left: /what-is-a-resolver's stepper track and input picker (`css/resolver-lab.css`) and /resolver-math's builder chips are page-owned inside live figures; no shared `Stepper` |
| CP-7 type and font-slot drift (22/16/13 sizes, <12px counts, four families, 14 kicker classes) | P1 | PARTIAL | Arial leak fixed (`tests/a11y-chrome.cjs:33`); Albert Sans is now the sans slot, not a fourth family (`assets/kit/defxn-fonts.css:49-51`, loads after `css/themes.css:99` which still names IBM Plex Sans for `--font-sans`); converted pages use Ark's hero eyebrow instead of the kicker classes. Left: no ~6-step SDK type scale; `css/resolver-math.css` sizes (RM-2); a duplicate `--font-sans` definition (`css/themes.css:99` vs `assets/kit/defxn-fonts.css:50`, load order decides). Counts of sizes/<12px not re-measured |
| CP-8 status colour has two meanings (Ready = primary vs Deployed = green; palette rule) | P1 | FIXED | /resolutions says state in words with no hue (`js/pages/resolutions.js:31-36`); the rewritten /resolvers carries no deployed/green chip; `StatusChip` with an SDK meaning map was not built (see RD-7, FQ-11) |
| CP-9 wayfinding: breadcrumbs missing, numbering/name conflicts, ↗ on internal routes, orphans, dead end | P1 | FIXED | Ark breadcrumb on /stats, /resolvers, /stats/gpu, /stats/ledger, /treasury, /palette (`grep "block: 'breadcrumb'"` = 1 each) and every page here ends in a pager (RelatedLinks); numbering/name fixed (LC-2, SR-1); `tests/site-exits.cjs:42-58` (↗ only for leaving the site; orphans /palette, /resolver-math, /start-from-something-real, /stats/gpu linked); /resolvers dead end fixed (RV-1). `/reference` still has no breadcrumb (RF-7) |
| CP-10a no skip link | P2 | FIXED | `index.html:84` `class="skip"`; `tests/a11y-chrome.cjs:22-27` |
| CP-10b no `contentinfo` landmark; 4-9 unlabeled or duplicate `nav` landmarks | P2 | UNVERIFIED (needs browser) | the kit draws a `<footer>` (`assets/kit/defxn-product.js:643`) but whether it lands as a top-level `contentinfo`, and how many `nav`s carry distinct labels, needs a DOM check |
| CP-10c non-interactive `<li>` bar rows are Tab stops | P2 | FIXED | `tests/a11y-chrome.cjs:43-48` |
| CP-10d content scrolls inside `section#scene-page-*`, not the document | P2 | OWNER | unchanged architecture (`#scene` panel frame `css/block-page.css:14`, `js/ark/panel-continuity.js`); decision: move to document scroll, or accept the find-in-page / iOS toolbar-collapse cost |
| CP-10e tap targets under 32px (13 on /stats, 16 on /resolver-math mobile, 4-5 per resolution page) | P2 | UNVERIFIED (needs browser) | Ark blocks set their own control sizes; needs a per-route measurement |
| CP-11a 1s clock interval keeps running in a hidden tab | P2 | FIXED | `js/pages/stats.js:891-919`; `tests/stats-page.cjs:12` |
| CP-11b three full-viewport background canvases on every route | P2 | UNVERIFIED (needs browser) | the lattice/hero canvases (`js/lattice.js`, `css/lattice.css`) are outside this wave's edits; the count needs a DOM check |

### Hand-built pattern frequency table (feeds the component library)
Counts: FIXED 10, PARTIAL 6, OPEN 3, OWNER 0, OUT-OF-REPO 0, UNVERIFIED 0
| id / short title | severity | status | evidence |
|---|---|---|---|
| FQ-1 PageHeader + Eyebrow (9 impls, 14 class names) | - | FIXED | Ark `hero` (21 uses) and `eyebrow` blocks in `js/pages`; only `/reference` keeps a hand kicker (RF-3) |
| FQ-2 DataTable (3 impls, 21 tables) | - | PARTIAL | Ark `table` (30 uses; stats 10, ledger 7, gpu 2); `/reference` tables remain bare (RF-4) |
| FQ-3 Tabs / SegmentedControl / DepthTabs (8 impls) | - | PARTIAL | Ark `tabs` (20 uses, segmented variant for depth); lab input picker and math chips remain page-owned (CP-6) |
| FQ-4 BarList (4 impls, 10+ sites) | - | FIXED | Ark `meter` block (`js/pages/stats.js`, `stats-gpu.js`, `stats-ledger.js`) |
| FQ-5 StatTile / StatRow (5 impls, ~35 tiles) | - | FIXED | Ark `stats`/`stat` blocks and hero details (`js/pages/stats.js`, `resolvers.js`, `economy-preview.js` facts) |
| FQ-6 Card / CardGrid (6 impls) | - | FIXED | Ark `card-grid` (`js/pages/resolutions.js:134`), `card`, `facts` |
| FQ-7 PrevNext / RelatedLinks (6 impls) | - | FIXED | Ark `pager` (14 uses) on every page in this report except `/reference` |
| FQ-8 Callout (5 impls) | - | PARTIAL | Ark `callout` (8 uses; story boundary, treasury mock); `/reference`'s provenance line is hand-built (`js/pages/reference.js:87`) |
| FQ-9 FigureFrame (5 impls) | - | FIXED | Ark `figure` (16 uses) wrapped in `disclosure` on story pages (`js/pages/story.js:166`) |
| FQ-10 Breadcrumb (4 + kit) | - | PARTIAL | Ark `breadcrumb` (19 uses); `/reference` has an orientation nav instead (`js/pages/reference.js:81-84`) |
| FQ-11 StatusChip + legend | - | OPEN | no status block exists; pages say state in words (RD-3). Needs a `StatusChip` in Ark (`design/ark-ui`) and then `js/pages/resolutions.js` |
| FQ-12 Stepper / StepList | - | PARTIAL | Ark `steps` (8 uses) for static lists; the interactive stepper track remains in `js/pages/resolver-lab.js` |
| FQ-13 MetaChips row | - | FIXED | Ark hero `meta`/details (`js/pages/resolvers.js:241`, `stats-ledger.js:206`) |
| FQ-14 CodeChip / CodeBlock | - | OPEN | no code block/chip block on these pages; identifiers are `mono: true` table columns/facts (`js/pages/stats-gpu.js:92`, `economy-preview.js:78`) and `reference.js` `pre` |
| FQ-15 Accordion / details (1 impl, 6 sites) | - | FIXED | Ark `accordion` (36 uses) + `disclosure` (38) |
| FQ-16 LiveStatus (poll + refresh) | - | PARTIAL | hero details patched in place + a Refresh action (`js/pages/stats.js:670-679,707-715`), no shared `LiveStatus` component |
| FQ-17 Markdown renderer | - | OPEN | `js/pages/reference.js:54-78` unchanged; the report says keep it and emit shared `DataTable`/`CodeBlock` |
| FQ-18 Glossary Term (new) | - | FIXED | Ark `term` block + derived `js/content/glossary.js` (coverage left: CP-5) |
| FQ-19 "Existing component system": add typed blocks to `js/content/components.js` / `ArkUI.dash` | - | FIXED | Wave 2 put the Ark blocks on the site and derived the CMS Library from the block registry (`docs/ux-audit/plan.md` Waves 2-3, `tests/components-library.cjs`); `PageHeader/Tabs/Accordion/Callout/StatTile/DataTable/BarList/Breadcrumb/PrevNext` all exist as Ark blocks; `StatusChip` does not (FQ-11) |


---

## components.md (component duplication / Ark port audit)
Counts: FIXED 76, PARTIAL 56, OPEN 20, OWNER 1, OUT-OF-REPO 3, UNVERIFIED 0

Basis: code on disk at the current working tree (HEAD 45d6b1a plus uncommitted edits); census numbers are `docs/ux-audit/component-census-baseline.tsv` (5a1ac71 -> current, ratcheted through plan.md Resume point 4), cross-checked by grep on css/ and js/ (the census was not run). The report states no severities, so the severity column is "-". Ids: M = method, S = shape, D/L/X = delivery and local copies, SC = scale, P = the 22 pattern rows, C = CMS typed blocks, DN = per-page density, MP = section 3 mapping rows, G = gaps G0-G17, A = architecture summary 1-10, DS = data shape, SS = SSR, PL = pipeline, W = work-plan waves, PR = priority list, R = risks.

| id / short title | severity | status | evidence |
|---|---|---|---|
| M1 §0 method: counts are lower bounds; distinct-signature proxy | - | FIXED | Instrument is now repo code, not scratch: `scripts/ux-component-census.mjs:1-30` (USE_FAMILIES / SIGNATURE_FAMILIES), baseline `docs/ux-audit/component-census-baseline.tsv`, guard `tests/ux-component-census.cjs:8` runs `--check`. Baseline at 5a1ac71 reproduces this report's tables; the current tsv (ratcheted, Resume point 4) is the comparison used below. |
| M2 §0 "reproducing the counts": scan scripts are temporary; Wave 0 turns them into a repo script with `--check` | - | FIXED | `scripts/ux-component-census.mjs` (`--check`, `--ratchet`, `--init-baseline`); `package.json` script `census`. |
| M3 §0 fold ratios come from `pages-crawl.tsv` (`fold1440`/`fold390`) | - | FIXED | The TSV is the 5a1ac71 crawl; no later whole-site fold re-measure is in the tree (plan.md "Wave 4: fold-rule sweep" not yet run; only W3-LEARN reports learnings views <= 1.6, plan.md Resume point 4). **S0 sweep 2026-10-20:** re-measured after the conversion: fold-contrast-readings.tsv (fold rows L2-L139) replaces the 5a1ac71 crawl numbers |
| M4 §0 `deadark-ui-lab` does not exist under /Volumes/PortableSSD | - | OUT-OF-REPO | Still absent from `/Volumes/PortableSSD/design/` listing; Ark UI stays the reference. Nothing to do in this repo. |
| M5 §0 check new Ark parts against write.deadark.com, articles.deadark.com, ark-app (AGENTS.md) | - | OUT-OF-REPO | Those are other repos; no evidence in the tree that the new blocks were compared (no note in docs/cms-architecture.md). Owner/process item. |
| S1 §1.1 shape table (runtime, components pack, primitives, core, page-builders "no content sections", elements, a11y, CSS AOT, theme, CMS schema) | - | FIXED | Descriptive. The "no content/marketing sections" finding is answered: `@deadark/ark-ui/blocks` now exists (`design/ark-ui/package.json:128-136`, `ark-ui.blocks.ts:113` `ARK_BLOCKS`, 21 blocks), plus `./blocks/patch`. Components-pack part list unchanged (see G1/G3/G8). |
| S2 §1.1 "Other properties" (framework-free, SSR = run the DOM, a11y contract) | - | FIXED | Descriptive; relied on, not changed. `tests/ssr-ark-blocks.cjs` proves the SSR path; Ark side `design/ark-ui/tests/test-blocks.mjs`. |
| D1 §1.2 `FluxMemoryStore`/`FluxAnimate`/element-style arrive by hand-run regex concatenation (`sync-ark.cjs`) | - | FIXED | `scripts/sync-ark.cjs` is gone; `js/ark/vendor/engines.js` is a TARGET of `scripts/build-ark-vendor.cjs:15-40` built from `node_modules/@deadark/*`; drift test `tests/ark-vendor.cjs` (+ `tests/ark-vendor-provenance.cjs`). |
| D2 §1.2 backgrounds via `sync-ark-backgrounds.cjs` | - | FIXED | Same: `js/ark/vendor/backgrounds.js` built by `build-ark-vendor.cjs` header lines 20-21; the old script no longer exists. |
| D3 §1.2 settings popover esbuild entry imports absolute `/Volumes/PortableSSD/design/ark-ui/dist/...` | - | FIXED | `grep Volumes scripts/*.js scripts/*.cjs` finds nothing; `js/settings/panel.js` is built from `scripts/settings-entry.js` via node_modules (build-ark-vendor.cjs:22-23). |
| D4 §1.2 `flux-authorization-dialog` esbuild IIFE via `build-auth.cjs` | - | FIXED | `js/admin/vendor/flux-elements.js` is a build-ark-vendor TARGET (header line 24). `scripts/build-auth.cjs` remains only for `js/admin/auth.js` (flux-auth sibling repos, not Ark packages; header lines 52-56 say why). |
| D5 §1.2 SDK theme CSS through the SDK CLI (already correct) | - | FIXED | `css/themes.css` + `scripts/theme-options.js` still produced via `deadark-theme`, now inside build-ark-vendor.cjs (header line 19). |
| D6 §1.2 "Everything else on the site: not consumed; local 166-line `ArkUI` global is not `@deadark/ark-ui`" | - | PARTIAL | Consumed now: `ArkKit` (`js/ark/vendor/ark-kit-public.js`, 24.0 KB gz) via adapter `js/ark/blocks.js`; 27+ page modules call `ArkUI.page`/`ArkUI.story.mount`. The local `ArkUI` engine (`js/ark/runtime.js`, 171 lines) stays on purpose (R13, `docs/cms-architecture.md:504-506`). Hand-built and not on blocks: `js/pages/account.js` (1126 lines), `js/pages/resolver-lab.js`, `js/pages/reference.js`, `js/resolvers/header.js`, `js/pages/home-flow.js` (scene custom by design), most of `js/pages/explorer.js`. |
| L1 §1.2 `js/admin/primitives.js` re-implements tabs/disclosure | - | PARTIAL | Deleted (not in `git ls-files`); `js/admin/ark-host.js` (202 lines) runs Ark tabs/accordion/toggle group. Left per plan.md Resume point 4: rail's five tabs and More menu's `#viewSwitch` still hand-wired; Page-settings tab strip scrolls sideways at 390px. |
| L2 §1.2 `js/ark/icons.js` 54-line icon sheet next to `@deadark/ark-ui/icons` | - | OPEN | `js/ark/icons.js` still 54 lines (`ArkUI.icon`, used by `js/resolvers/header.js:234`, `js/resolvers/blocks/rblock-card-v1.js:23`); Ark exports `./icons` (`design/ark-ui/package.json:56`). Fix edits: `js/ark/icons.js`, header.js, rblock-card-v1.js, Ark icons if a glyph is missing. |
| L3 §1.2 `js/ark/dash-kit.js` local stat/panel/table/bar kit (208 lines) | - | PARTIAL | `stat`, `table`, `bar`, `sectionHead` deleted (header lines 14-16). Still 188 lines: `panel`, `shell`, `productHandoff`, `resolveLinkField` (:79), `ArkUI.dash` (:178). Its own header says no page calls `shell()`/`panel()` any more; `css/stats-dashboard.css` (26 lines) is dead rules for them. Dead code left to delete. |
| X1 §1.2 delivery broken: `shared/` empty; canonical `sync-shared-deps.mjs` reads `join(hubRoot,'shared')`; `workspace:route` resolves `ark-ui` to `shared/ark-ui` | - | FIXED | `design/deadark-sdk/bin/sync-shared-deps.mjs:23-34,96-100` reads each member's `currentPath` from the manifest; `.workspace/workspace-manifest.json:584-585` has `ark-ui` -> `design/ark-ui`; test `design/deadark-sdk/tests/sync-shared-deps.test.mjs`. Only `.workspace/domain-plan.proposed.json:223` (a proposal file) still names `shared/ark-ui`. |
| X2 §1.2 `sync-ark.cjs` defaults to `/Volumes/PortableSSD/shared`; "nothing defxn vendors can be refreshed by any sanctioned path" | - | FIXED | `package.json` scripts `sync:ark` (`deadark-theme sync-consumer . --no-build`), `build:ark`, `check:ark`; `.vendor/*.tgz` with manifests (sha256) present. |
| X3 §1.2 none of defxn `package.json` deps is an `@deadark/*` package | - | FIXED | `package.json:10-19` pins 10 `@deadark/*` packages to `.vendor/*.tgz`; `node_modules/@deadark/` installed. |
| SC1 §2 scale: 33 page modules / 10,197 lines; 81 scripts (~976 KB); 51 stylesheets (~750 KB), every stylesheet on every route | - | PARTIAL | Now `js/pages` 34 files / 10,718 lines (grew: block specs and layout pins), `index.html` 83 `<script src>`, 47 stylesheet links (44 `css/*.css`, 494 KB raw), still all loaded on every route (no per-route CSS). Raw CSS down ~34% vs the audit; per-file-gzip sum 114.3 KB vs 160.4 (docs/ux-audit/components.md R2 row). Per-route CSS loading is OPEN. |
| SC2 §2 scale: 117 `text-transform: uppercase` rules, 27 distinct px radii, 64 distinct px font sizes | - | PARTIAL | Census baseline (css only): uppercase 117 -> 77 (grep of non-theme css: 78 lines), px radii 17 -> 15, px font sizes 66 -> 57 (`component-census-baseline.tsv` last lines; the 5a1ac71 baseline already read 17/66 because it excludes generated sheets). Not converged. |
| P1 §2 #1 Button / action: 107 creations in 21 files; 5 paints, 44 class names, 34 `!important` | - | PARTIAL | Census button classes 38 -> 23, uses 21 -> 5, css-files 23 -> 18. `css/components.css` `!important` lines 34 -> 30 (63 occurrences), solid/soft/quiet selector lists still at `css/components.css:24-60`; radius 999px overrides `css/resolver-lab.css:74,81`. Hand-built buttons left: `js/pages/account.js` (29 `<button`), `explorer.js` (5), `header.js` (2), `account-domains.js` (2). |
| P2 §2 #2 Eyebrow / kicker: 65 uses, 25+30 names, 58 signatures in 31 css files, >20 letter-spacings | - | PARTIAL | Census eyebrow classes 62 -> 42, signatures 58 -> 35, css-files 36 -> 25. 14 non-Ark `*-kicker`/`*-eyebrow` selectors remain across 17 sheets (`.account-kicker .dash-kicker .gate-eyebrow .hero-experiment-kicker .home-title-kicker .kicker .learning-eyebrow .mesh-explorer-kicker .reference-kicker .rm-eq-kicker .sheet-kicker .story-kicker .versions-kicker`); uses in `explorer.js`, `header.js`, `account.js`, `resolver-math.js` (`rm-eq-kicker`, plus the known undercount in the tsv header), `reference.js:86` (`story-kicker`). |
| P3 §2 #3 Page header / hero: 25 `h1` sites, 6 h1 conventions, 40 signatures | - | PARTIAL | Census hero classes 44 -> 28, uses 34 -> 7, signatures 40 -> 22. Hand-built `<h1` left: `js/pages/account.js` (1) and `js/resolvers/body.js` (1). Other routes render Ark `hero` (e.g. `js/pages/story.js:5-30`). Fold effect UNVERIFIED (needs browser). |
| P4 §2 #4 Tabs / choice pickers: 4 hand-built tablists, 6 arrow-key handlers, `chain.js` none, `aria-pressed` 41 lines | - | PARTIAL | Census tabs classes 31 -> 8, signatures 34 -> 7. Hand-built `role="tablist"` left: `js/pages/account.js:68`, `js/pages/explorer.js:79`. Hand-written arrow handlers left: `explorer.js:223`, `resolver-lab.js:321` (was 6). `chain.js` no longer has a tablist (Ark tabs, `tests/chain-blocks.cjs`). `aria-pressed` still in palette/economy-preview/account/sheet/lab/explorer/resolver-lab/home-flow/concept. |
| P5 §2 #5 Note / callout: 49 uses (30 `dash-note`), 28 names, 21 signatures | - | PARTIAL | Census callout classes 39 -> 23, uses 49 -> 9, signatures 22 -> 13. `dash-note` is gone from css/js. Left: `explore-browse-note` x6 (`explorer.js`), `account-storage-notice` (`account.js`), `economy-warning`/`economy-credit-note` (`economy-preview.js`), `nav-layer-note` (`header.js`), `rm-eq-note` (`resolver-math.js`). |
| P6 §2 #6 Stat tile: 95 uses, two vocabularies (`stats-tile`, `dash-stat`), `function tile()` copied into 3 pages as innerHTML | - | PARTIAL | `grep "function tile" js/` finds none; `js/pages/stats*.js`, `resolvers.js`, `resolver-math.js` have 0 `innerHTML` and render Ark `stat`/`stats` (`tests/stats-page.cjs`, `stats-gpu-blocks.cjs`, `stats-ledger-page.cjs`, `resolvers-blocks.cjs`). Census stat classes 107 -> 8, uses 95 -> 7. Left: `mesh-explorer-stat(s)` (`explorer.js`), `flow-record-num` (`home-flow.js`), dead `css/stats-dashboard.css`. |
| P7 §2 #7 Card / panel: 43 uses, 29 names, 29 signatures in 15 files | - | PARTIAL | Census card classes 38 -> 28, uses 43 -> 9, signatures 29 -> 21, css-files 19 -> 15. Left: `explorer.js` (9 uses: `explore-cards`, `explore-how-card`, `explore-live-card`), `home-flow.js` (7: `flow-panel`, `land-panel`), `account.js`, `account-domains.js`, `dash-kit.js panel`. |
| P8 §2 #8 Next / continue links: 40 uses, 21 names, 24 signatures | - | PARTIAL | Census nextLinks classes 27 -> 14, uses 40 -> 8, signatures 24 -> 15. Left: `js/pages/download.js:85-86` (`download-next mechanism-next`, `download-onward`), `resolver-lab.js` (`resolver-lab-next`), `economy-preview.js:120` (`economy-return`), `header.js` (`products-mega-more`), `account.js`. Ark `pager` block carries the rest. |
| P9 §2 #9 Section header: 17 uses; `function section()` duplicated in `about.js:119` and `home.js:126` | - | PARTIAL | `function section(` no longer exists in js/pages (only `js/halo/iceberg.js:6`, unrelated). Census sectionHead classes 11 -> 6, uses 17 -> 6, signatures 11 -> 3. Left: `mesh-explorer-section-head` (`explorer.js` x3), `products-mega-heading` (`header.js`), `account-heading`. |
| P10 §2 #10 Step list: 27 uses, 19 names, 25 signatures | - | PARTIAL | Census step classes 36 -> 20, uses 27 -> 4, signatures 25 -> 7. Left: `stage` (`lifecycle.js` x3), `resolver-lab-stage`, `explore-stepper` (`explorer.js`), `lab.js`, `deployment.js`, `home-flow.js`. |
| P11 §2 #11 Back link: 18 sites in 8 files, 16 names, 16 signatures | - | PARTIAL | Census breadcrumb classes 13 -> 9, uses 21 -> 13, signatures 16 -> 7. Left: `nav-layer-*-back` (`js/resolvers/header.js` x7), `mesh-explorer-back`/`explore-record-back` (`explorer.js` x4), `account-back` (`account.js`). Elsewhere Ark `breadcrumb`. |
| P12 §2 #12 Form field: 45 uses, 42 names | - | OPEN | Census field classes 42 -> 38, uses 45 -> 35, css-files 23 -> 17 (barely moved). Left: `js/main.js` x10, `account.js` x8, `resolver-math.js` x8 (term builder), `explorer.js` x6, `home-flow.js`, `how-stories.js`, `resolver-lab.js`. No Ark `field`/`form` block exists in `ARK_BLOCK_NAMES` (`ark-ui.blocks.ts:77-96`). Wave 4 (account, explorer) + an Ark field block. |
| P13 §2 #13 Chip / pill / badge: 17 in 9 files, 18 names, 14 signatures | - | PARTIAL | Census pill classes 27 -> 17, uses 18 -> 12, signatures 14 -> 6. Left: `explorer.js` x4 (`explore-chip`, `mesh-source-chip`), `palette.js` (`palette-chip`), `home-flow.js` (`land-tag`), `resolver-math.js` (`rm-chip`), `step.js`, `account.js`, `header.js`. Ark status badge schema exists (`design/ark-ui/blocks/card.ts:23,53`). |
| P14 §2 #14 Table: 20 uses, 6 names, 4 signatures | - | FIXED | Census table classes 9 -> 0, uses 20 -> 0, css-files 5 -> 0; `grep "<table\\|createElement('table')"` over pages/resolvers finds none; Ark `table` block (`tests/stats-page.cjs`). |
| P15 §2 #15 Accordion / disclosure / FAQ: 9 details/summary lines, `hl-faq` x5, 7 `aria-expanded` | - | PARTIAL | Census accordion classes 7 -> 2, uses 8 -> 0. `hl-faq` gone. `<details>` left: `js/pages/explorer.js` x6, `js/pages/lab.js` x1. |
| P16 §2 #16 Popover / menu / nav toggle (header chain popover, products mega menu, nav toggle, explorer popovers) | - | OPEN | `js/resolvers/header.js:129,317` own Escape/focus code (713 lines); `js/pages/explorer.js:263` same. Census modal 9 -> 9, toggle 12 -> 8. The public kit refuses `createArkPopover` (`ark-kit-public.js`, `docs/cms-architecture.md:511`). Wave 4 `header`, `explorer`; fix edits `js/resolvers/header.js`, `js/pages/explorer.js`, `css/navigation.css`, `css/explorer*.css`. |
| P17 §2 #17 Live status / toast: `aria-live` 20 lines in 13 files, hand-rolled; `toast` class defined, unused | - | OPEN | `aria-live` 20 -> 13 lines in 7 files (`account.js` x3, `explorer.js` x4, `resolver-lab.js` x2, `download.js:68`, `account-domains.js`, `resolver-math.js:562`, `header.js`); census toast 1 -> 1, uses 0. No Ark `toast-region`/live-region use on the public site. |
| P18 §2 #18 Diagram / figure frame: 7 class uses, 9 `figure`; `ArkUI.drafting`/`createStoryDiagram` local SVG | - | PARTIAL | Census diagram classes 6 -> 3, uses 7 -> 2. Story pages use Ark `figure` (`js/pages/story.js` header "figure"). Left: `about-layers-figure` (`about.js`), `rm-field-svg` (`resolver-math.js`), `js/ark/story-diagrams.js` (107 lines, G13 not done). |
| P19 §2 #19 Proportional bars (`dash-bars*`) | - | FIXED | `dash-bars` absent from css/js (only `tests/` mention the retired names); `js/pages/stats.js` uses the Ark `meter` block (82 `meter` hits); `dash-kit.js` `bar()` deleted (header line 14). |
| P20 §2 #20 Description list (facts): `dl` on 12 lines in 7 files | - | PARTIAL | Ark `facts` block exists (`design/ark-ui/blocks/facts.ts:51`). Hand-built `<dl` left: `js/pages/account.js:61-64`, `js/pages/explorer.js` (1). |
| P21 §2 #21 Empty state: 12 uses, 6 names | - | PARTIAL | Census empty classes 6 -> 5, uses 12 -> 6. Left: `account-contacts-empty` x9 (`account.js`), `explorer.js` x2, `account-domains.js`, `learnings.js`, `resolver-block.js`. No Ark empty block. |
| P22 §2 #22 Code block: 3 uses (`download.js:58`, `economy-preview.js:47,52`) | - | OPEN | Census code classes 4 -> 3, uses 3 -> 1. `js/pages/download.js:98` (`pre.download-code`), `js/pages/deploy.js:88` (`deploy-command`), `js/pages/reference.js:59` still hand-built; no `code` block in the Ark registry (the plan's U5 "code block" is not in `ark-ui.blocks.ts`). |
| C1 §2 CMS typed blocks: 6 typed + captured, defxn-local, inline atom styles (`js/resolvers/blocks/*.js`) | - | PARTIAL | Kept deliberately as read aliases, byte-pinned (`tests/components-legacy-continuity.cjs`; `js/content/components.js:66-84` `LEGACY`). Still offered for NEW components: Text and Divider, because Ark has no `text`/`divider` block (components.js comment above `LEGACY`). Other four step aside when the registry has the successor block. |
| C2 §2 whitelist/props/labels hand-written at `components.js:46-74` | - | FIXED | Ark blocks are recognised by name shape and described from the registry (`js/content/components.js:92-110` `registry()`/`descriptorOf`), prop editors drawn from schema (`js/admin/controls.js:48-53`, `js/admin/library.js`); `tests/components-library.cjs`. The six legacy descriptions remain as one `LEGACY` table by design. |
| C3 §2 `@deadark/sdk/cms` canonical block schema unused by defxn | - | FIXED | Editor bundles `ArkCmsBlocks` (`js/admin/vendor/cms-blocks.js`, entry `scripts/cms-blocks-entry.js`) and `js/admin/controls.js:48-53` calls `getCmsArkBlockEditorFields`; SDK side `design/deadark-sdk/src/cms/ark-blocks.ts`. |
| DN1 §2.1 density: stats.js, stats-ledger.js, resolvers.js, stats-gpu.js (duplicated `tile()`, innerHTML copy) | - | FIXED | All four are `ArkUI.page` block specs with 0 `innerHTML`; regression `tests/stats-page.cjs`, `stats-ledger-page.cjs`, `resolvers-blocks.cjs`, `stats-gpu-blocks.cjs`, `stats-unavailable-not-zero.cjs`. |
| DN2 §2.1 density: resolver-math.js (3 eyebrows, 9 notes, fold 8.36/13.42) | - | PARTIAL | Page is blocks (`tests/resolver-math-blocks.cjs`) but the term builder stays hand-built, pinned whole for layout-key continuity: `rm-eq-kicker`, `rm-eq-note`, 8 field uses, `aria-live` at `js/pages/resolver-math.js:562`; tsv header calls this a known undercount. Needs: convert the builder (field block + eyebrow/callout). |
| DN3 §2.1 fold ratios of the stats family (12.53/20.63, 8.89/14.50, 8.36/13.42, 3.93/7.75, 1.89/3.09) and "11 of 69 routes exceed 1.6x on phone" | - | FIXED | Structure now bounds height (Ark tabs/accordion/meter, `tests/fold-no-hidden-content.cjs`, `tests/browser/fold-disclosures.mjs`) but no post-conversion whole-site fold sweep exists; plan.md names it Wave 4. **S0 sweep 2026-10-20:** fold-contrast-readings.tsv L18/L87, L20/L89, L10/L79, L11/L80, L19/L88: 1.00-1.48; phone routes over 1.6 are now 1 of 69 (`/reference`, L94) |
| DN4 §2.1 density: palette.js | - | FIXED | Pilot conversion, `tests/palette-blocks.cjs`; `js/pages/palette.js` calls `ArkUI.page`. Fold UNVERIFIED. |
| DN5 §2.1 density: about.js, home.js (6-8 eyebrows, 7 next links, fold 2.1-2.7) | - | PARTIAL | Both `ArkUI.page` (`tests/about-page.cjs`, `tests/home-blocks.cjs`); hero scene stays custom by design. Left: `about-layers-figure` (`about.js`), `home-flow.js` cards/tags. Fold UNVERIFIED. |
| DN6 §2.1 density: economy-preview.js (12 eyebrows, 15 buttons), resolutions.js, resolver-lab.js | - | PARTIAL | `economy-preview.js` and `resolutions.js` are blocks (`tests/resolutions-blocks.cjs`) with residual `economy-return` (:120), `economy-warning`, `economy-credit-note`; `resolver-lab.js` (559 lines) is hand-built: own arrow keys (:321), `aria-live` (:328,:357), `resolver-lab-next` pill CSS. Resolver-lab is OPEN (Wave 4). |
| DN7 §2.1 density: sheet / deploy / resolver-guide / lifecycle / how-stories / download | - | PARTIAL | All mount through `ArkUI.story.mount` (`js/pages/story.js:206`; `tests/story-blocks.cjs`, `task-pages-blocks.cjs`, `resolver-guide-blocks.cjs`). `lifecycle.js` still has `stage` classes (x3); `download.js:85-86` still hand-builds next/onward buttons and `:98` a `pre`. |
| DN8 §2.1 density: explorer.js (31 buttons, 13 choice, 6 eyebrows), account.js (1126 lines, 10 choice), header.js (14 eyebrows, 20 links) | - | OPEN | Wave 4 not started (plan.md Resume point 4 "Next"). `explorer.js` 1016 lines, `account.js` 1126, `header.js` 713 -- all still hand-built DOM (see P1-P16). |
| MP1 §3 Button solid/soft/quiet/link -> `PRIMARY/SECONDARY/GHOST/LINK\|BUTTON`, `flux-button`; map paint to SDK tokens (G12) | - | PARTIAL | Delivered as the Ark `actions` block (`design/ark-ui/blocks/actions.ts`, `ARK_ACTION_TONES`), not the BUTTON part; legacy `components.css` paint lists remain (P1); G12 not done. |
| MP2 §3 Button "choice" -> `createArkToggleGroup`/`createArkRadioGroup` | - | PARTIAL | `js/admin/ark-host.js` runs Ark's toggle group in the editor; the public kit refuses `createArkToggleGroup` (`docs/cms-architecture.md:511`) so public pickers are Ark tabs where converted; palette/economy/explorer/account pickers remain hand-built (P4). |
| MP3 §3 Eyebrow -> add `EYEBROW\|TEXT` part (G1) | - | PARTIAL | Added as the `eyebrow` block (`design/ark-ui/blocks/eyebrow.ts`, `ARK_EYEBROW_TONES`); no `EYEBROW\|TEXT` part in `ark-ui.components.ts` (grep empty). See G1. |
| MP4 §3 Page header / hero -> add `hero` block (G2) | - | FIXED | `design/ark-ui/blocks/hero.ts`; used by every converted page (`js/pages/story.js`). |
| MP5 §3 CTA row -> add `ACTIONS` part (G3) | - | PARTIAL | `actions` block exists (`blocks/actions.ts`); no `ACTIONS` part in the components pack. See G3. |
| MP6 §3 Tabs -> `createArkTabs`/`TABS*`/`flux-tabs` | - | PARTIAL | Ark `tabs` block used on converted pages (`blocks/tabs.ts`, story depth control `js/pages/story.js:186`); hand-built left at `account.js:68`, `explorer.js:79`. |
| MP7 §3 Note / callout -> `createArkAlert`; add tones `drift`/`reference` (G9) | - | FIXED | `design/ark-primitives/src/alert.js:38-43` tones; `design/ark-ui/blocks/callout.ts:40`. |
| MP8 §3 Stat tile -> `STAT*`; add `STATUNIT`, `STATDETAIL`, `absent` state (G8) | - | FIXED | `design/ark-ui/blocks/stat.ts:6-72` (`unit`, `detail`, `absent`; absent is not 0); defxn `tests/stats-unavailable-not-zero.cjs`. Done in the block, not as STAT parts (see G8). |
| MP9 §3 Card / panel -> `CARD*` | - | PARTIAL | Ark `card`/`card-grid` blocks; hand-built cards remain in `explorer.js`, `home-flow.js`, `account.js` (P7). |
| MP10 §3 Next / continue -> add `pager` block (G5) | - | FIXED | `design/ark-ui/blocks/pager.ts:2-18`; used by story template. Hand-built leftovers listed in P8. |
| MP11 §3 Section header -> add `section-header` block (G4) | - | FIXED | `design/ark-ui/blocks/section-header.ts`; `section()` copies gone (P9). |
| MP12 §3 Step list -> add static ordered mode (G10) | - | FIXED | `design/ark-ui/blocks/steps.ts:2-21` (`mode: "static"` default). |
| MP13 §3 Back link -> `createArkBreadcrumbs` | - | PARTIAL | Ark `breadcrumb` block on converted pages; `header.js`, `explorer.js`, `account.js` keep their own (P11). |
| MP14 §3 Form field -> `createArkField`, `FIELD*`, `createArkForm` | - | OPEN | Exists in Ark's components pack but the block registry has no field/form block and defxn forms are hand-built (P12). |
| MP15 §3 Chip / badge -> `BADGE`, add SDK meaning tones (G8) | - | PARTIAL | Meaning tones exist on the card/status schema (`blocks/card.ts:23` `ARK_STATUS_TONES` = live, trust, drift, warning, reference, danger, hidden); `BADGE` part tones in `ark-ui.components.ts` not added. defxn chips remain (P13). |
| MP16 §3 Table -> `TABLE*`, `createArkCoreDataTable` | - | FIXED | Ark `table` block (`blocks/table.ts`); defxn has no hand-built table (P14). |
| MP17 §3 Accordion / FAQ -> `createArkAccordion` | - | FIXED | `accordion` and `disclosure` blocks (`ark-ui.blocks.ts:77-96`); `<details>` leftovers only on explorer/lab (P15). |
| MP18 §3 Popovers / mega menu / nav toggle -> `createArkPopover`, navigation menu, sheet, select | - | OPEN | Not converted (P16). |
| MP19 §3 Live status / toast -> `toast-region` + `createLiveRegion` | - | OPEN | Not used on the public site (P17). |
| MP20 §3 Diagram / figure frame -> add `figure` block (G6); promote drafting later (G13) | - | PARTIAL | `figure` block done (`blocks/figure.ts:3-29`); drafting promotion not started (G13). |
| MP21 §3 Proportional bars -> `createArkChart` or `PROGRESS`, else add `METER` (G11) | - | FIXED | `meter` block (`blocks/meter.ts:3,31-35`, `role="meter"`); used by `js/pages/stats.js`. |
| MP22 §3 Description list -> add `facts` block (G7) | - | FIXED | `blocks/facts.ts:51` (`dl`/`dt`). Leftover hand-built `dl` in P20. |
| MP23 §3 Empty state -> `EMPTY`, `SKELETON` | - | OPEN | Exists as parts but no empty block, defxn still hand-builds (P21). |
| MP24 §3 Code block -> `createArkCodeBlock` + `CODEBLOCK*` | - | OPEN | No Ark `code` block; defxn pre blocks hand-built (P22). |
| MP25 §3 Quote (`RBLOCK_QUOTE_V1`) -> add `quote` block (G14) | - | FIXED | `design/ark-ui/blocks/quote.ts`; legacy QUOTE kept as read alias with `successor: 'quote'` (`js/content/components.js:80`). |
| MP26 §3 Divider -> `createArkSeparator`/`SEPARATOR` | - | PARTIAL | Part exists but there is no `divider` block in the registry, so the CMS Library still offers legacy `RBLOCK_DIVIDER_V1` (`components.js:66-84` `successor: 'divider'` unmet). Needs an Ark `divider` (and `text`) block. |
| MP27 §3 Icons (`js/ark/icons.js`) -> `@deadark/ark-ui/icons` | - | OPEN | See L2. |
| MP28 §3 Admin tabs/disclosure -> Ark tabs/disclosure | - | PARTIAL | See L1 (done except rail tabs, `#viewSwitch`, sideways tab strip at 390px). |
| G0 §4 Blocks entry and registry (`renderArkBlock`, `ARK_BLOCKS`, static CSS) | - | FIXED | `design/ark-ui/ark-ui.blocks.ts:113,285`; `package.json:128-136,288` (`./blocks`, `./blocks.css`, build emits `dist/ark-ui.blocks.css`); `design/ark-ui/tests/test-blocks.mjs`. |
| G1 §4 `EYEBROW\|TEXT` part | - | PARTIAL | Shipped as the `eyebrow` block only (`blocks/eyebrow.ts`); the components-pack part is absent (`ark-ui.components.ts` grep empty). Matters only to `createArkUI` consumers, not defxn. |
| G2 §4 `hero` block | - | FIXED | `design/ark-ui/blocks/hero.ts`. |
| G3 §4 `ACTIONS` part (CTA row) | - | PARTIAL | `actions` block only (`blocks/actions.ts`); no part. |
| G4 §4 `section-header` block | - | FIXED | `blocks/section-header.ts`. |
| G5 §4 `pager` block | - | FIXED | `blocks/pager.ts`. |
| G6 §4 `figure` block | - | FIXED | `blocks/figure.ts:3-4` (caption + `aria-describedby` description). |
| G7 §4 `facts` block | - | FIXED | `blocks/facts.ts`. |
| G8 §4 `STATUNIT`/`STATDETAIL`, `data-state="absent"`, BADGE meaning tones | - | PARTIAL | Block-level done (`blocks/stat.ts:31-72`, `blocks/card.ts:23`); `ark-ui.components.ts` has none of STATUNIT/STATDETAIL/absent and BADGE has no meaning tones. SDK `badge-meanings.test.mjs` exists. |
| G9 §4 ALERT tones `drift`/`reference` | - | FIXED | `design/ark-primitives/src/alert.js:30-43`, `design/ark-ui/blocks/callout.ts`. |
| G10 §4 `steps` static ordered mode | - | FIXED | `blocks/steps.ts:2-21`. |
| G11 §4 `METER` part or CHART bar SSR | - | FIXED | `blocks/meter.ts`. |
| G12 §4 base `deadark-sdk` recipe mapping every Ark token to SDK variables | - | OPEN | `BUILTIN_STYLE_RECIPES` in `design/ark-ui/ark-ui.components.ts` still only has `deadark-foundation` (:1559) and `deadark-chat` (:1697); no generic `deadark-sdk` recipe. Blocks sidestep it via static CSS on SDK tokens. Fix edits `design/ark-ui/ark-ui.components.ts`. |
| G13 §4 `@deadark/ark-ui/drafting` (promote `story-diagrams.js`) | - | OPEN | `design/ark-ui/ark-ui.drafting.ts` does not exist; `js/ark/story-diagrams.js` (107 lines) still local. Plan marked it second wave. |
| G14 §4 `quote` block | - | FIXED | `blocks/quote.ts`. |
| G15 §4 reserved prefix for generated ids (ark-a11y, ark-elements) | - | FIXED | `design/ark-a11y/src/ids.js:30` (`ARK_GENERATED_ID_PREFIX = "ark-r-"`, exported `./ids`), `design/ark-elements/src/elements.js:411` uses `createArkGeneratedId`; honoured by `js/content/layout.js:300`. Landed in `ids.js`, not `dom.js`. |
| G16 §4 SDK CMS block types for every new block | - | FIXED | Derived rather than typed: `design/deadark-sdk/src/cms/ark-blocks.ts:100` (`CMS_ARK_BLOCK_NAMES` from generated ark-ui descriptors), `src/cms/index.ts:891-899` (`CMS_RENDERER_CONTRACT.arkBlocks`), test `tests/cms-ark-blocks.test.mjs`. `CMS_BLOCK_TYPES` (index.ts:18) is unchanged (9 old types) by design. |
| G17 §4 Delivery (`sync-shared-deps`, `sync-consumer` ships the ark-ui closure, manifest path) | - | FIXED | See X1-X3. |
| A1 §5 summary 1: schema in SDK, rendering in `@deadark/ark-ui/blocks` | - | FIXED | G0 + G16. |
| A2 §5 summary 2: styles as static CSS, stable part classes, SSR styled | - | FIXED | `css/ark-blocks.css` (generated, 7.3 KB gz), `tests/ssr-ark-blocks.cjs:1-12` (no style attr, no injected rule). |
| A3 §5 summary 3: delivery via SDK CLI; one `build-ark-vendor.cjs` with `--check` replaces the sync/build scripts | - | FIXED | `scripts/build-ark-vendor.cjs` (+ `--check`), `package.json:6-9`, `tests/ark-vendor.cjs`; old `sync-ark.cjs`, `sync-ark-backgrounds.cjs`, `build-settings.cjs` are gone, `build-auth.cjs` kept for `js/admin/auth.js` only. |
| A4 §5 summary 4: `js/ark/blocks.js` registers every block by looping `ARK_BLOCKS` | - | FIXED | `scripts/ark-blocks-adapter.js:349` (`ArkUI.blocks`, `resolvers` from `ARK_BLOCK_NAMES`), shipped minified as `js/ark/blocks.js`; `tests/ark-blocks-adapter.cjs`. |
| A5 §5 summary 5: pages become data (`ArkUI.page(spec, host)`, copy keys, `block:'custom'` escape) | - | PARTIAL | `ArkUI.page` at `scripts/ark-blocks-adapter.js:371`; about 27 page modules use it or `ArkUI.story.mount`. Not converted: `account.js`, `resolver-lab.js`, `reference.js`, `header.js`; `explorer.js` and `home-flow.js` only partly (custom scenes). |
| A6 §5 summary 6: CMS Library derived from the registry | - | FIXED | `js/content/components.js:92-110`, `js/admin/library.js`, `js/admin/controls.js:48-53`; `tests/components-library.cjs`. |
| A7 §5 summary 7: saved data never rewritten; `RBLOCK_*_V1` read aliases; append-only key-alias record | - | PARTIAL | Aliases and byte-pins done (`tests/components-legacy-continuity.cjs`). The planned alias record that `ArkLayout.find` consults was NOT built: continuity is instead carried by per-block `was` pins (`data-ark-layout-pin`, `js/ark/blocks.js`) and frozen census fixtures (`tests/lib/layout-continuity.cjs`, `tests/fixtures/layout-keys/`, 68 files). Deliberate deviation; no JSON store added (R12). |
| A8 §5 summary 8: a11y inherited from Ark primitives | - | FIXED | Blocks run Ark tabs/accordion/disclosure through `createArkDomHost` (`design/ark-ui/ark-ui.blocks.ts:9-14,54`); Ark's contract tests live in `design/ark-ui/tests/test-blocks.mjs`. Hand-built interactive pages are Wave 4 (P4, P16). |
| A9 §5 summary 9: tokens via SDK recipe; `components.css` `!important` lists and page-local family rules deleted family by family | - | PARTIAL | Public CSS linked is down (see SC1) and `components.css` is 130 -> 113 lines, `!important` lines 34 -> 30 (`css/components.css:24-60` lists remain). Remaining sheets not deleted: `explorer*.css`, `account*.css`, `home-flow.css`, `resolver-lab.css`, dead `css/stats-dashboard.css`. |
| A10 §5 summary 10: order (plumbing, Ark gaps, adapter+Library, pages, interactive last) | - | PARTIAL | Followed through Wave 3; Wave 4 pending (plan.md Resume point 4). |
| DS1 §5.1 value prefixes: `copy:` via `ArkCopy` stamping public `data-ark-copy-keys`; `route:`/`doc:`/`meta:` through `resolveLinkField`, which "moves into the adapter" | - | PARTIAL | `copy:` stamped (adapter `resolveText`, `data-ark-copy-keys`; `js/content/layout.js:299`). `resolveLinkField` still lives in `js/ark/dash-kit.js:79` and the adapter calls `ArkUI.dash.resolveLinkField` (so dash-kit cannot be deleted until it moves). |
| DS2 §5.1 stable ids: block `id` becomes root id, layout key `id:<id>` | - | FIXED | `js/content/layout.js:300`; Ark `checkAuthoredId`; `tests/layout-keys.cjs`. |
| DS3 §5.1 `insert` anchor emitted by `ArkUI.page`; 30 hand-placed anchors collapse into one owner | - | FIXED | Hand-placed `data-ark-insert` left only in `js/pages/explorer.js:163`, `account.js:125`, `reference.js:90` (the unconverted pages); the rest come from `ArkUI.page`. Anchor ids asserted in `tests/components-capture.cjs`. |
| SS1 §5.2 blocks render synchronously before `ark:route-ready`, no lazy imports | - | FIXED | `tests/ssr-ark-blocks.cjs`; exception by design: `ArkUI.blocks.update` loads `ark-kit-live.js` lazily on a live update only (not on first render). |
| SS2 §5.2 styles from static `ark-blocks.css`; no `adoptedStyleSheets`/`insertRule` | - | FIXED | `tests/ssr-ark-blocks.cjs:1-12`. |
| SS3 §5.2 `flux-*` elements must not rebuild children on upgrade | - | FIXED | Blocks do not use `flux-*` elements; `FluxTabsElement` only sets attributes (`design/ark-elements/src/elements.js:409-420`). |
| SS4 §5.2 parity test: render each converted route via `scripts/ssr-preview.mjs` and in a browser, compare text and `data-ark-part` tree | - | PARTIAL | Server-side tests exist (`tests/ssr-ark-blocks.cjs`, `story-ssr.cjs`, `home-ssr.cjs`, `resolutions-ssr.cjs`); no test compares server HTML to a browser render (ids differ by design, `docs/cms-architecture.md` "Server render"). |
| PL1 §5.3 pipeline: `ark-ui` -> sync-consumer -> `node_modules` -> `build-ark-vendor.cjs` -> `js/ark/vendor/ark-kit.js` + `css/ark-blocks.css` with source-hash header | - | FIXED | `scripts/build-ark-vendor.cjs` header lines 28-48; `tests/ark-vendor-provenance.cjs`. |
| W0a §6 Wave 0 P0-1 (G17: canonical sync resolves `design/`; sync-consumer delivers ark-ui closure with sha256; manifest) | - | FIXED | X1-X3. |
| W0b §6 Wave 0 P0-2 (`build-ark-vendor.cjs`, old scripts replaced, `package.json`, `js/ark/vendor/*`, census script with `--check`) | - | FIXED | A3, M2. |
| W1a §6 Wave 1 U1 (registry, `renderArkBlock`, CSS build, jsdom harness) | - | FIXED | G0. |
| W1b §6 Wave 1 U2 (`ark-ui.components.ts`: G1, G3, G8, G12) | - | OPEN | None of the four landed in the components pack (see G1, G3, G8, G12); the same needs were met as blocks. Fix edits `design/ark-ui/ark-ui.components.ts` only. |
| W1c §6 Wave 1 U3 (hero, section-header, pager, back) | - | FIXED | G2, G4, G5, MP13 (`breadcrumb` block). |
| W1d §6 Wave 1 U4 (stat, stat-grid, table, facts, meter) | - | FIXED | `blocks/stat.ts` (`stat`, `stats`), `table.ts`, `facts.ts`, `meter.ts`. |
| W1e §6 Wave 1 U5 (callout, figure, code, quote; alert tones) | - | PARTIAL | callout, figure, quote, alert tones done; the `code` block is missing from the registry (P22). |
| W1f §6 Wave 1 U6 (steps, tabs, faq; a11y/elements id prefix) | - | FIXED | `blocks/steps.ts`, `tabs.ts`, `accordion.ts`; ids G15. |
| W1g §6 Wave 1 S1 (SDK CMS schemas for new blocks) | - | FIXED | G16. |
| W2a §6 Wave 2 D1 (`js/ark/blocks.js`; `dash-kit.js` moves `resolveLinkField`; `layout.js` honours prefix and key-alias record; `tests/layout-key-continuity.cjs`) | - | PARTIAL | Adapter and prefix done; `resolveLinkField` not moved (DS1); no key-alias record and no `tests/layout-key-continuity.cjs` by that name (replaced by `tests/lib/layout-continuity.cjs` + per-page tests, A7). |
| W2b §6 Wave 2 D2 (components.js, resolvers/blocks become alias shims, library.js, controls.js, delete primitives.js) | - | FIXED | A6, L1 (deleted), C1-C2. `js/resolvers/blocks/*` were kept as-is rather than turned into shims, byte-pinned by `tests/components-legacy-continuity.cjs`. |
| W2c §6 Wave 2 D3 (generated `ark-blocks.css`, `components.css` cutover, `index.html` order) | - | PARTIAL | `css/ark-blocks.css` linked in `index.html`; `components.css` `!important` lists remain (A9). |
| W3a §6 Wave 3 G1 stats family (stats-gpu, stats-ledger, resolvers, stats, resolver-math) | - | PARTIAL | Converted (DN1, DN2); resolver-math term builder and fold outcome (DN3) remain. |
| W3b §6 Wave 3 G2 guided/story template (sheet, resolver-guide, deploy, lifecycle, how-stories, download, deployment, concept) | - | FIXED | `js/pages/story.js` template; callers `sheet.js`, `resolver-guide.js`, `lifecycle.js`, `how-stories.js`, `download.js`, `deployment.js` use `ArkUI.story.mount`, `deploy.js`/`concept.js` use `ArkUI.page`; `tests/story-blocks.cjs`, `task-pages-blocks.cjs`. Residual hand-built bits listed in DN7. |
| W3c §6 Wave 3 G3 overview (about; static sections of home) | - | FIXED | `about.js`, `home.js` on `ArkUI.page`; `tests/about-page.cjs`, `home-blocks.cjs`. Fold UNVERIFIED (DN3). |
| W3d §6 Wave 3 G4 product pages (economy-preview, bundle-deployer, resolutions, reference, palette, chain) | - | PARTIAL | economy-preview, bundle-deployer, resolutions, palette, chain are `ArkUI.page`; `js/pages/reference.js` is not (hand-built `ArkUI.el` at :83-90, `story-kicker` :86). Needs: convert reference.js (it renders Markdown docs; a `custom` mount inside a hero + breadcrumb frame is enough). |
| W3e §6 Wave 3 G5 learnings (`js/resolvers/learnings.js`) | - | FIXED | `js/pages/learnings.js` on `ArkUI.page`, article via `story.mount`; `tests/learnings-blocks.cjs`; plan.md Resume point 4 (W3-LEARN: every view <= 1.6 fold). The old `js/resolvers/learnings.js` was removed (commit 2e1edea). |
| W4a §6 Wave 4 `header.js` (navigation menu, mega menu, popover, sheet) | - | OPEN | `js/resolvers/header.js` 713 lines, own Escape/focus (:129,:317). |
| W4b §6 Wave 4 `explorer.js` (popovers, toggle groups, fields) | - | OPEN | 1016 lines; `explorer.js:79,223,263`. |
| W4c §6 Wave 4 `account.js` + `account-domains.js` (field, form, tabs, toast) | - | OPEN | `account.js:50-125` all innerHTML. Plan: sign-in/wallet/keys browser coverage first. |
| W4d §6 Wave 4 `resolver-lab.js` (steps, toggle) | - | OPEN | 559 lines hand-built. |
| W4e §6 Wave 4 `home-flow.js` (cards only; scene stays custom) | - | OPEN | `flow-panel`, `land-panel`, `land-tag` (`home-flow.js`). |
| PR1 §6 component priority list (button, eyebrow, hero, tabs, callout, stat, card, pager, section header, steps, back link, field, badge, table, accordion, then popover, live region, figure, meter, facts, empty, code) | - | PARTIAL | Through "accordion" mostly done on blocks; after-list: figure/meter/facts done; popover, live region, empty, code, field still open (P12, P16, P17, P21, P22). |
| R1 §7 SSR loses Ark styles (adoptedStyleSheets/insertRule dropped) | - | FIXED | Static CSS only; `tests/ssr-ark-blocks.cjs:1-12`. |
| R2 §7 Bundle size: +30 KB gz JS max; CSS net-negative per wave; per-route measurement stating device | - | PARTIAL | Rechecked with `gzip -9` on this Mac: kit-public 24.0 + adapter 4.0 = 28.1 KB gz (<= 30); live chunk 1.4; `css/ark-blocks.css` 7.3; glossary `js/content/glossary.js` 2.9. CSS net -46.0 KB gz (per-file) vs 5a1ac71 per `docs/ux-audit/components.md` R2 row. Named exception: glossary routes 31.0 and /stats 32.4 (over by 1.0 / 2.4). OWNER decision: shorter/fewer definitions, or per-route glossary (plan.md Resume point 4; `docs/cms-architecture.md` Budget). |
| R3 §7 Saved CMS edits orphaned by restructuring (list saved keys, stable ids/copy keys, alias record, `tests/layout-key-continuity.cjs`) | - | PARTIAL | Mechanism built differently: capture/derive/assert workflow `tests/lib/layout-continuity.cjs` + `tests/lib/converted-page.cjs`, 68 frozen census fixtures, `assertSavedEditsLand`; `docs/cms-architecture.md:703-725`. Not done: step (a) surveying real drafts/published mesh bundles outside the repo (the in-repo `*-data.js` are 124-451 bytes, empty), and the alias record (c). Remaining: OUT-OF-REPO survey of owner drafts. |
| R4 §7 Generated ids become layout keys | - | FIXED | G15; `js/content/layout.js:300`; `primitives.js` `uid()` deleted with the file. |
| R5 §7 Saved component masters (`RBLOCK_*_V1`) dropped by `sanitize()` | - | FIXED | `tests/components-legacy-continuity.cjs` (sha256 pins of every legacy block); `js/content/components.js:60-84`. |
| R6 §7 `data-ark-insert` anchors key `ArkComponents.routes` | - | FIXED | `ArkUI.page` emits them (`scripts/ark-blocks-adapter.js` insert branch); `tests/components-capture.cjs`, `tests/resolutions-blocks.cjs`, `tests/palette-blocks.cjs` assert anchor ids. |
| R7 §7 Fold rule: blocks take `density`; measure scrollHeight/innerHeight per route per state after each wave | - | FIXED | Structural guards exist (`tests/fold-no-hidden-content.cjs`, `tests/browser/fold-disclosures.mjs`, `docs/cms-architecture.md:649-653`); no committed whole-site per-wave measurement later than the 5a1ac71 crawl. Wave 4 fold sweep owns it. **S0 sweep 2026-10-20:** `tests/browser/fold-contrast-sweep.mjs` is the whole-site per-route measurement (fold-contrast-readings.tsv); rerun it after each wave. Measured at rest, not per tab |
| R8 §7 Cascade collisions with `#scene :is(...)` `!important` lists | - | PARTIAL | See A9/P1: 30 `!important` lines left in `css/components.css`. Ark parts use their own `ark-*` classes (`css/ark-blocks.css`). |
| R9 §7 Test coupling: 25 test files assert page class names | - | PARTIAL | Each converted family has its own `*-blocks.cjs` that replaced class-name asserts (e.g. `tests/stats-gpu-blocks.cjs`, `story-blocks.cjs`); plan.md records unit 199/199 at Resume point 4 (not re-run here). Wave 4 pages will repeat this. |
| R10 §7 Feature loss in bespoke pages (stats absent state, explorer popovers, resolutions keyboard tabs) | - | FIXED | Stats absent state: `tests/stats-unavailable-not-zero.cjs`; resolutions tabs/disclosures: `tests/resolutions-blocks.cjs`; explorer untouched (Wave 4). |
| R11 §7 Delivery drift (`shared/` empty, hard-coded paths) | - | FIXED | X1-X3; `tests/ark-vendor.cjs` `--check`. |
| R12 §7 Storage law: no new JSON store (e.g. key-alias record); existing `*-data.js` must not grow | - | FIXED | No alias store was added; continuity fixtures are TSV (`tests/fixtures/layout-keys/`). Existing JSON-wrapped stores unchanged and empty (`js/content/layout-data.js` 144 B; `layout.js:165` still serialises JSON). Migrating them stays out of scope (OWNER if wanted). |
| R13 §7 Two runtimes called "ArkUI" | - | FIXED | Documented: `docs/cms-architecture.md:504-506` ("Two runtimes, one adapter"); Ark exposed as `ArkKit`. |
| R2b §7 R2 (split out) glossary pushes routes over the +30 KB JS budget | - | OWNER | Owner call: shorter/fewer glossary definitions, or a per-route glossary (lazy loading would drop each term's accessible description at mount and from SSR). Routes: block+terms 31.0 KB gz, /stats 32.4 (`js/content/glossary.js` 2.9 KB gz, rechecked). Decision recorded as pending in plan.md Resume point 4; `docs/cms-architecture.md` Budget. |
| R3b §7 R3 (split out) survey saved layout keys in real connected-folder drafts and published mesh bundles before each conversion | - | OUT-OF-REPO | The repo's `js/content/*-data.js` are empty; the owner's drafts and published bundles are not in this repo. Conversions were checked against synthetic saved drafts only (`assertSavedEditsLand`, `tests/lib/layout-continuity.cjs`). |


---

## docs/ux-audit/brand.md (brand / tokens / product-kit audit)
Counts: FIXED 46, PARTIAL 29, OPEN 10, OWNER 6, OUT-OF-REPO 41, UNVERIFIED 2 (134 rows)

Notes on how to read this ledger.
- The report gave no severities, so the severity column is "-" for every row. Section 1.1 is ordered "worst first" by the report; that order is kept.
- Code on disk is the truth (working tree). Baseline 5a1ac71; brand work landed mostly in 3462ab4 (wave 1) and af33dc6 (waves 2-3).
- Sibling repos were read (not edited) only to name the repo and confirm whether the cited thing is still there. "OUT-OF-REPO" rows say which repo; where a sibling repo already contains the fix, the row says so.
- `K:` = /Volumes/PortableSSD/flux/defxn-product-kit (the kit). `SDK:` = /Volumes/PortableSSD/design/deadark-sdk. `LP:` = /Volumes/PortableSSD/flux/flux-launchpad.
- Fold ratios and any "looks like" claim are UNVERIFIED (needs browser). Browser tests are cited as regression tests but were not run by this audit.

| id / short title | severity | status | evidence |
|---|---|---|---|
| §0.1 Palette home (SDK vs kit) | - | FIXED | Owner chose the SDK path. SDK: `SDK:src/theme/role-ladder.ts:11-24` (colour-law gate "passed", owner call "measure chroma, not HSL") and `role-ladder-palette.ts:65-69` (ids ember/tide/moss/dune/dusk). defxn: `css/flux-themes.css` is generated by `scripts/build-flux-themes.cjs` from the SDK; guarded by `tests/flux-themes-from-sdk.cjs`. |
| §0.2 Launch moves to Ember, `ink` stays selectable | - | OUT-OF-REPO | Decision recorded in `docs/ux-audit/plan.md:22-24`. Not done: `LP:index.html:2` still `data-theme="ink"`, `LP:index.html:16-23` loads hand-copied vendor sheets. Repo: flux-launchpad. |
| §0.3 Launch in the switcher (id `defi`, lane Assets vs 7th lane) | - | PARTIAL | Owner chose a seventh group (`plan.md:15`). Kit has the `defi` lane (`K:dist/products.json` lanes: code, ship, resolve, govern, social, assets, defi; `tests/kit-home-shell.cjs` asserts it). Left: Launch is only a pending declaration (`K:catalog/pending/flux-launchpad.json`, id `launch`, name "Flux Launch", not "DeFi"); `LP:package.json` has no `defxn` block. Repo: flux-launchpad. |
| §0.4 defxn.com is the family home, not a product | - | FIXED | `package.json:56-70` `defxn.home`; bar mounted in home mode `js/resolvers/header.js:493`; `tests/kit-home-shell.cjs`. |
| §0.5 Keep the five theme families on defxn.com; kit honours active theme | - | FIXED | `tests/kit-home-shell.cjs` ("home mode leaves the page palette alone", no `data-dx-theme` set); kit palette keyed `:where(:not([data-theme]))` / `[data-theme="ember"]` at `K:dist/defxn-tokens.css:4,8`. |
| §0.6 Overlap pages (/explore /deploy /dao /treasury /bundle-deployer /account/domains): explain + hand off | - | FIXED | `DefxnKit.productHandoff/productLink` used in `js/pages/explorer.js:92`, `deploy.js:113`, `dao.js`, `economy-preview.js`, `bundle-deployer.js`, `account-domains.js`; owner decision `plan.md:16-18`; `tests/kit-home-shell.cjs` ("Open Explore"). |
| §0.7 Branch order for Launch (merge v2 before kit restyle) | - | OWNER | Owner must merge `wave3-launchpad-v2` into the design-current tree (plan.md:110 says "Owner-side"). v2 still renders unstyled: `flux-launchpad-wt-v2/index.html:41` links `css/home.css`, which does not exist there. |
| §1 inv: defxn.com public chrome (kit bar, switcher, footer, fonts) | - | FIXED | Kit loaded `index.html:22-27,67,183`; bar `js/resolvers/header.js:493`; footer `js/hero-motion.js:91-98`; inner-heading face now Albert via `assets/kit/defxn-fonts.css` (`tests/browser/site-fixes.mjs:204-217`). |
| §1 inv: defxn.com page-height ratios (home 2.39/2.72, /stats 12.6/20.7, /about 2.08/2.65) | - | FIXED | Waves 2-3 converted home/about/stats to blocks (`plan.md:75-76`, `tests/fold-no-hidden-content.cjs`), but no measured ratio is in the tree. Needs a viewport measurement. **S0 sweep 2026-10-20:** fold-contrast-readings.tsv L2/L71 (home 1.39/1.23), L18/L87 (`/stats` 1.20/1.17), L3/L72 (`/about` 1.38/1.41) |
| §1 inv: defxn CMS (own gate-bar, no switcher/footer) | - | PARTIAL | Fonts + SDK tokens now (`admin-app.html:14-18`, `css/admin.css:1-60`, `tests/admin-css-tokens.cjs`). Left: still its own bar `admin-app.html:40` `<header class="bar" id="appBar">`, no kit bar/switcher. |
| §1 inv: Flux Launch current (`ink`, own bar, no kit, home 2.19/4.87) | - | OUT-OF-REPO | flux-launchpad: `LP:index.html:2,16-28`; `LP:vendor/defxn-ark/flux-themes.css` still holds the stale canvas `18 32.6% 5.3%` (7 hits). Fold part UNVERIFIED. |
| §1 inv: Flux Launch v2 (stale Ember, half-unstyled) | - | OUT-OF-REPO | flux-launchpad-wt-v2: `css/home.css` missing (`ls` fails) while `index.html:41` links it. |
| §1 inv: 23 kit consumers (Repo ... Books) rows and per-product page ratios | - | OUT-OF-REPO | Repos: product-surfaces, flux-code-app, flux-db-studio, flux-grammar-atlas, bundle-deploy, mesh-registry, remote-env, deploy, explore, defxn-defi-rs (dense-wire/web), flux-storage-desktop, ark-explorer, defxn-dao, treasury, genesis, flux-notify, flux-content, flux-games, defxn-radio, pva-site, collections-site, market-site, books-site. Ratios are UNVERIFIED (needs browser); the specific deviations are rows §1.1 #1-#11. |
| §1 inv: Bundles download site (off-kit, 9 hex literals) | - | OUT-OF-REPO | bundle-deploy: `bundle-deploy/site/css/site.css:3-6` still `--bg:#0b0d10 ...`. |
| §1 inv: Remote `preview.html` off-kit (inline hex) | - | OUT-OF-REPO | remote-env: `remote-env/public/preview.html` (not re-verified here). |
| §1 inv: other web surfaces (ark-gateway, defxn-browser-mobile, ark-browser, ark-miner-desktop, ark-pin-extension) | - | OWNER | Report says out of scope "unless the owner says otherwise"; no owner statement in plan.md. Decision: are any of these brought under the kit? |
| §1.1 #1 Repo/Domains served copy stale; `sync --check` blind to built output | - | OUT-OF-REPO | Kit side fixed: `K:scripts/sync.mjs:46-102` (`builtCopies`, refreshes built copies and `--check` compares them). Left in product-surfaces: `product-surfaces/scripts/serve.mjs` unchanged (Oct 18), still builds `dist/` once at start; server restart needed. |
| §1.1 #2 Bundles download site has no kit | - | OUT-OF-REPO | bundle-deploy (`site/css/site.css:3-20`, `index.html:17,56`). Same as the inventory row. |
| §1.1 #3 Code: inline Ark UI auth sheet + 20 override rules + hand-copied theme boot | - | OUT-OF-REPO | flux-code-app: `src/app/layout.tsx:44` still injects `ARK_AUTH_KIT_STYLES`; `src/app/globals.css:~150-185` overrides still there. Now deletable because `--accent` is the action colour (`css/flux-themes.css:213`). Kit `boot.js` not built (see §7 A2). |
| §1.1 #4 DB Studio: 28 signing-dialog rules, 3px glow ring, `!important`, no handoff | - | OUT-OF-REPO | flux-db-studio: `src/styles.css:99-108,377` (rules still present); no `renderHandoff` call in app code. |
| §1.1 #5 Packages: unscoped `.dx-input` 3px danger glow | - | OUT-OF-REPO | mesh-registry: `web/styles/app.css:47` still `.dx-input.is-invalid { ... box-shadow: 0 0 0 3px ...}`. |
| §1.1 #6 No handoff strip at Claims, Books, Collections, Market, PVA, Genesis, DB Studio | - | OUT-OF-REPO | ark-explorer (`src/app.js:12-15`), genesis (`genesis-app.js:141-144`), books-site, collections-site, market-site, pva-site, flux-db-studio: grep finds `renderHandoff` only in their vendored kit copy, no call in app code. |
| §1.1 #7 Per-page signing-dialog rule copies (2-6 each) | - | OUT-OF-REPO | collections-site, market-site, defxn-dao, genesis, defxn-radio, treasury (not re-verified here). Needs D11 first. |
| §1.1 #8 Headline off-kit treatment (Inbox 28/700, Books 20px, Storage/Code mono, Play none) | - | OUT-OF-REPO | flux-notify, books-site, flux-storage-desktop, flux-code-app, flux-games (not re-verified here). |
| §1.1 #9 Inset shadow markers / canvas ring / primary flash (Explore, Remote, Genesis, Deploy) | - | OUT-OF-REPO | explore (`explore.css:67,142`), remote-env (`public/style.css:125`), genesis (`genesis.css:98`), deploy (`deploy.css:140`). |
| §1.1 #10 Grammar 772-line page CSS with pre-kit `.panel/.input/.chip` | - | OUT-OF-REPO | flux-grammar-atlas `css/grammar.css:396,412`. |
| §1.1 #11 Theme attribute and three storage keys | - | PARTIAL | Done: kit palette now also keyed on the SDK attribute (`K:dist/defxn-tokens.css:4,8` `[data-theme="ember"\|"ember-light"]`), home mode writes no kit attribute (`tests/kit-home-shell.cjs`). Left: kit still sets `data-dx-theme` + key `defxn-product-theme` (`K:src/shell.mjs:33,191,212`); defxn still uses legacy keys `ghost/glacier...` and `flux-chain-theme`/`defxn-site-theme-default` (`js/bootstrap.js:6-11`); no one-time read-forward migration exists. |
| §2 Theme attribute / key (table row) | - | PARTIAL | Same as §1.1 #11. |
| §2 Palette (defxn side) | - | FIXED | `css/flux-themes.css` generated from the SDK (`scripts/build-flux-themes.cjs:1-20`, `tests/flux-themes-from-sdk.cjs`); kit reads the SDK too (`K:scripts/build.mjs:15-20,140-157`). |
| §2 Palette (Launch stale hand copy) | - | OUT-OF-REPO | flux-launchpad `vendor/defxn-ark/flux-themes.css` (stale canvas value still present). |
| §2 CTA colour (Launch cyan `--accent` bridged to `--secondary`) | - | OUT-OF-REPO | flux-launchpad `css/theme-bridge.css`, `vendor/deadark-sdk/theme-ink.css`. |
| §2 Identity colour use + Selection/focus (rows 4-5) | - | FIXED | Descriptive on the kit/Launch side. On defxn: identity is `--primary` only, selection is `--reference` (`docs/brand/DEFXN.md` role table; `css/admin.css:129,161,367,611`). |
| §2 Text face (inner pages named an unloaded IBM Plex Sans; display was Source Serif) | - | FIXED | Slots remapped to Albert Sans by `assets/kit/defxn-fonts.css:46-62`, loaded after `css/themes.css` (`index.html:20-22`, also `admin.html`, `admin-app.html`, `broker.html`); `tests/browser/site-fixes.mjs:204-217`. `css/themes.css:97-109` still declares the old faces (SDK output) but is overridden by cascade; see §5 D4. |
| §2 Mono (IBM Plex Mono declared, not loaded) | - | FIXED | Self-hosted: `assets/kit/plex-mono-{400,500,600}.woff2`, `assets/kit/defxn-fonts.css:16-39`. |
| §2 Headline (home 80.6px/-0.065em vs kit 56/-0.045em) | - | FIXED | Nothing to change: report §3.6 says keep defxn's home presentation; no code was asked for. (If the owner wants one headline, that is a new decision.) |
| §2 Type scale (kit 21 sizes, defxn ~35, Launch checked) | - | PARTIAL | Kit has the Launch rules as `K:scripts/design-check.mjs` (`npm run check:design`) but ratchets the half-pixel sizes from `K:test/design-baseline.json:14-19` instead of removing them. defxn.com has no such gate: `css/*.css` still holds 40 distinct px font sizes and no design-check is wired into `scripts/run-tests.mjs`. |
| §2 App bar (kit vs defxn vs Launch) | - | PARTIAL | defxn now wears the kit bar with actions slot, `brandSub`, home mode, menu mode (`K:src/shell.mjs:419-520`, `js/resolvers/header.js:493`, `tests/kit-home-shell.cjs`). Not built: sliding current indicator (no `nav-ind` in `K:src`). Launch not adopted (OUT-OF-REPO flux-launchpad). |
| §2 Product switcher | - | FIXED | defxn.com now has the switcher with all 7 lanes (`js/resolvers/header.js:477-478`; `tests/kit-home-shell.cjs` lanes + switcher assertions). Launch's own 7-item "suite" is a separate catalog in flux-launchpad (see §4.3). |
| §2 Handoff / footer | - | FIXED | Family footer on defxn.com: `js/hero-motion.js:91-98`, `tests/kit-home-shell.cjs` (footer block). Home has no handoff by design. Launch status line is flux-launchpad's (§4.8). |
| §2 Panels (kit flat vs defxn glass/blur/shadow) | - | OPEN | `box-shadow`/`backdrop-filter` still in 21 sheets (`css/components.css` 8, `css/studio-embed.css` 13, `css/admin.css` 11, `css/resolver-lab.css` 9, `css/home-drafting.css` 8, `css/account.css` 7, ...). Baseline had 12 each in components/navigation; no flatten pass has been made. |
| §2 Buttons (pill vs rectangular; header controls Arial) | - | PARTIAL | Arial reset fixed (`assets/kit/defxn-components.css:61,78` `font-family: inherit`; `tests/browser/site-fixes.mjs:204-217`); header buttons are kit `dx-btn` (`js/resolvers/header.js:487`). Left: page-level CTA glow / rectangular nav pills in site sheets (`css/components.css`, `css/navigation.css`) not re-checked: UNVERIFIED visually. |
| §2 Icons (DEFXN set vs Ark pack + Lucide) | - | OPEN | `js/ark/icons.js` is still the hand-written DEFXN path set (header lines 1-13); `design/ark-ui/icons/ark` (75 svg) holds none of the DEFXN-only glyphs (no network/chain/resolver icons). See §5 D7. |
| §2 Mark (`data:` mask vs PNG) | - | FIXED | One source: `assets/kit/defxn-mark.png` + `assets/kit/defxn-marks.data.css` (byte-equal to kit dist; `index.html:67`); `css/brand-marks.css`, `scripts/build-brand-marks.cjs`, `assets/brand/` deleted in 3462ab4. |
| §2 Motion (background patterns animate by default) | - | PARTIAL | Idle rAF loops gone: `js/zero-webgl.js:362,568` (settles), `tests/browser/idle-frames.mjs`; patterns still `animated:true` by default (`js/content/settings-defaults-data.js:17`) but settle after a 3.2 s scan. Left: report's proposal to scope them to `[data-dx-product="home"]` is not implemented (no such attribute in repo). |
| §2 Figures (`story-diagrams.js` vs `.dx-frame`) | - | OPEN | No `dx-frame` in `js/` or `css/`; defxn drawings are not framed in kit chrome. Low impact. |
| §2 Signing dialog CSS | - | OUT-OF-REPO | Source stays `css/authorization-dialog.css` (correct per D11). Launch's hand-copied dialog CSS/JS is in flux-launchpad `vendor/defxn-ark/authorization-dialog.*`. |
| §2 Delivery (ES module vs classic scripts, SSR) | - | FIXED | Kit emits a classic IIFE (`K:dist/defxn-product.js`, byte-equal to `assets/kit/defxn-product.js`); runs under jsdom in `tests/kit-home-shell.cjs` header comment + body (SSR pass). |
| §3.1 Header structure (76px boxed buttons vs 64px segmented kit bar) | - | FIXED | Bar is the kit's `.dx-bar` mounted on the CMS header element (`js/resolvers/header.js:492-493`); `tests/kit-home-shell.cjs` ("existing element became the bar"). Pixel height UNVERIFIED but structure is the kit's (`--dx-bar-h:64px`, `assets/kit/defxn-components.css:36`). |
| §3.2 Nav source is CMS data with a one-row overflow manager | - | FIXED | Kept by design: CMS nav moved (not cloned) into the bar (`tests/kit-home-shell.cjs`), overflow in `tests/header-row-fit.cjs`, `tests/browser/public-header.mjs`. |
| §3.3 Resolutions mega menu vs switcher (two hanging panels, different visuals) | - | PARTIAL | Both exist: mega menu still built at `js/resolvers/header.js:10,168-192`; opening the switcher closes the all-pages menu (`header.js:~505`). Not unified into one popover primitive (report §8: flux-popover). |
| §3.4 No switcher/handoff on defxn.com; products unreachable | - | FIXED | Switcher with all products in the bar (`header.js:477-478`), footer family row (`hero-motion.js:91-98`), handoffs on overlap pages (see §0.6). |
| §3.5 Type scale and inner h1 face | - | PARTIAL | Face fixed (§2 Text face). Size sprawl remains: 40 px sizes in `css/*.css` (see §2 Type scale). |
| §3.6 Headline treatment (first vs second sentence dimmed) | - | FIXED | Nothing to change; report says keep defxn's as home presentation. |
| §3.7 Panels and cards (glass, blur, shadows) | - | OPEN | Same as §2 Panels. |
| §3.8 Buttons (rectangular vs pill; Arial controls) | - | PARTIAL | Same as §2 Buttons. |
| §3.9 Segmented controls (per-page tabs differ) | - | PARTIAL | Census ratchet only: tabs 9->8, toggle 9->8 (`plan.md` resume point 4; `docs/ux-audit/component-census-baseline.tsv`); Ark tabs in CMS (`js/admin/ark-host.js`). Public per-page tab styles still differ (`css/resolvers.css`-era sheets). |
| §3.10 Footer | - | FIXED | Kit home footer with the site's link row + FLX credit (`js/hero-motion.js:91-98`, `tests/kit-home-shell.cjs`). |
| §3.11 Colour roles scope (kit would override non-Ember palettes) | - | FIXED | Kit tokens use `:where(:not([data-theme]))` so a set `data-theme` wins (`K:dist/defxn-tokens.css:4,8`); `tests/kit-home-shell.cjs` with `data-theme="clay"`/`"moss"`. |
| §3.12 CMS paints selection in identity colour via `--accent` alias | - | FIXED | `--accent` now = `--secondary` (`css/flux-themes.css:213`); `css/admin.css` no longer reads `--accent` (selection uses `--reference-100/-300`, lines 129,161,367,611); `tests/admin-css-tokens.cjs` (comment lines 77-78). `docs/brand/DEFXN.md` role table updated. |
| §3.13 Iconography (second icon system next to Ark pack) | - | OPEN | Same as §2 Icons. |
| §3.14 Motion (background loop gap) | - | PARTIAL | Same as §2 Motion. |
| §3.15 Figure grammar (frame defxn drawings in `.dx-frame`) | - | OPEN | Same as §2 Figures. |
| §3.16 Mark delivery (two encodings from one PNG) | - | FIXED | Kit emits both; defxn loads the `data:` variant (`index.html:67`), PNG also synced (`assets/kit/defxn-mark.png`). |
| §3.17 Fold (home 2.39/2.72, /about 2.08/2.65, /stats 12.6/20.7) | - | FIXED | Pages were converted (`plan.md:75-76`); there is no measured post-conversion figure. Needs the fold sweep (Wave 4). **S0 sweep 2026-10-20:** fold-contrast-readings.tsv L2/L71, L3/L72, L18/L87 (same readings as §1 inv) |
| §3.18 CMS look = third visual language | - | PARTIAL | Shares fonts, palette and SDK tokens only (`css/admin.css:1-60`). Not on the kit bar; weight-300 lockup and gate styling unchanged (`admin-app.html:40`). |
| §4.1 Launch colour: `ink` mono+cyan vs Ember | - | OUT-OF-REPO | flux-launchpad (`index.html:2`). |
| §4.2 Launch bar content vs kit (actions slot, sub-brand, menu mode, sliding indicator) | - | OUT-OF-REPO | Kit gained actions slot / `brandSub` / menu mode (`K:src/shell.mjs:419-520`); sliding indicator absent in kit. Launch adoption not started in flux-launchpad. |
| §4.3 Launch has no switcher/catalog entry; own "suite" list is a second catalog | - | OUT-OF-REPO | flux-launchpad: no `defxn` block in `LP:package.json`; kit carries a pending stand-in `K:catalog/pending/flux-launchpad.json` (which the kit says to delete when Launch adopts). |
| §4.4 Type: kit looser than Launch's checked scale | - | OUT-OF-REPO | Kit: `K:scripts/design-check.mjs` exists (D12) but half-pixel sizes baselined `K:test/design-baseline.json`. Repo: defxn-product-kit. |
| §4.5 Panels: Launch panel manager must survive | - | OUT-OF-REPO | Constraint on the future Launch change (flux-launchpad `panel-manager.mjs`, key `flux-launch-layout.v2`). Nothing to do in defxn. |
| §4.6 Buttons (Launch header neutral white vs teal) | - | OUT-OF-REPO | flux-launchpad. |
| §4.7 Segmented count badge not in kit | - | OUT-OF-REPO | defxn-product-kit: no `.dx-choice` count class in `K:src/product.css` (grep finds none). |
| §4.8 Launch connection line belongs in the kit status pill | - | OUT-OF-REPO | flux-launchpad. |
| §4.9 Launch live mark cyan vs kit terracotta `sx-now` | - | OUT-OF-REPO | flux-launchpad `css/schematics.css`. |
| §4.10 Launch icon set differs | - | OUT-OF-REPO | flux-launchpad `js/icons.mjs` vs defxn `js/ark/icons.js`; resolve via §5 D7. |
| §4.11 Launch mark via stale hand copy | - | OUT-OF-REPO | `LP:vendor/defxn-ark/brand-marks.css`. |
| §4.12 Launch vendors defxn files by hand and has drifted | - | OUT-OF-REPO | `LP:vendor/defxn-ark/*` and `vendor/deadark-sdk/theme-ink.css` still hand copies. |
| §4.13 Launch signed-out home fold 2.19/4.87 | - | UNVERIFIED (needs browser) | flux-launchpad; needs a viewport measurement. |
| §4.14 Two Launch trees (current vs v2) | - | OWNER | Owner merges `wave3-launchpad-v2` (see §0.7). |
| §5 D1 Palette values -> SDK | - | FIXED | `SDK:src/theme/themes.ts:1704`, `role-ladder-palette.ts:65-69`; byte-exact check `tests/flux-themes-from-sdk.cjs`; sha-gated in `scripts/build-flux-themes.cjs:61-65`. |
| §5 D2 Role layer (secondary, ladders, -ink, -tone, anchor, scale) | - | FIXED | Generated with the palette (`css/flux-themes.css:8-24`); `tests/theme-color-contrast.cjs` kept. |
| §5 D3 Theme attribute + storage key (one SDK mechanism, read old keys once) | - | PARTIAL | Same as §1.1 #11. SDK offers namespaced ids with legacy keys (`role-ladder-palette.ts:65-69`); defxn and kit have not migrated. |
| §5 D4 Font choice in an SDK typography preset | - | PARTIAL | Works by cascade: kit `assets/kit/defxn-fonts.css:46-62` overrides after `css/themes.css`. Not in the SDK: `SDK:src` has no "Albert" preset (grep empty), and `css/themes.css:97-109` still carries IBM Plex Sans + Source Serif 4. Repo: design/deadark-sdk. |
| §5 D5 Font file lives in kit `brand/` | - | FIXED | `K:brand/fonts`; `assets/kit/albert-sans.woff2` synced byte-equal; old `assets/fonts` copy no longer referenced. |
| §5 D6 Mark in kit, both encodings | - | FIXED | `K:brand/marks`; `K:dist/defxn-mark.png` + `defxn-marks.data.css`; synced to `assets/kit/`. |
| §5 D7 Icons: one language, DEFXN glyphs promoted into Ark pack | - | OPEN | OUT-OF-REPO design/ark-ui (`icons/ark`, 75 svgs, none of the DEFXN-only glyphs) and defxn would then generate `js/ark/icons.js` from the pack (no generator script exists in `scripts/`). |
| §5 D8 Components built on Ark UI behaviour, kit supplies look | - | PARTIAL | Public blocks are Ark blocks reading tokens only (`css/ark-blocks.css`, `css/block-page.css`: zero colour literals); `plan.md` rules. Kit shell is its own 667-line implementation, no `@deadark/ark-elements` import (`K:src/shell.mjs`). Repo: defxn-product-kit. |
| §5 D9 Shell as classic IIFE from the same source | - | FIXED | `K:dist/defxn-product.js` (46 KB) beside `.mjs`; `assets/kit/defxn-product.js` byte-equal; `tests/kit-home-shell.cjs` (final byte check). |
| §5 D10 Product catalog (home + Launch declared; link rows from catalog) | - | PARTIAL | Home declared (`package.json:56-70`); footer links derive from `js/content/site-pages.js` (`hero-motion.js:75-85`). Launch still pending in kit (`K:catalog/pending/flux-launchpad.json`); Launch's "suite" not rendered from the catalog (flux-launchpad). |
| §5 D11 Signing dialog -> `flux-authorization-dialog` element | - | OUT-OF-REPO | design/ark-ui + flux-launchpad hand copy + per-page copies (§1.1 #7). defxn's `css/authorization-dialog.css` stays the source, as the report wants. |
| §5 D12 Design laws moved into the kit, run by consumers | - | PARTIAL | `K:scripts/design-check.mjs` + `npm run check:design` exist. Left: no consumer runs it (not in `scripts/run-tests.mjs` for defxn); half-pixel sizes baselined. |
| §6 facts: shared names agree / DEFXN-only names / same name different colour | - | FIXED | Colliding aliases removed on defxn: `--accent`=`--secondary`, `--badge`=`--primary`, `--role`=`--reference`, `--live`=`--trust` (`css/flux-themes.css:210-216`); SDK now owns palette ids so `ghost`/`glacier` key collision is resolved by the SDK generator. |
| §6.1 Base layer = SDK semantic tokens | - | FIXED | All defxn sheets read them; `tests/admin-css-tokens.cjs`; `tests/theme-color-contrast.cjs`. |
| §6.2 DEFXN role layer + explicit action alias | - | FIXED | `css/flux-themes.css:211-236` (`--action`, `--action-bg/fg/border/hover-bg`, `--secondary` ladders). |
| §6.3a Remove colliding aliases; `--accent` = action; CMS re-pointed to `--reference` | - | FIXED | `css/flux-themes.css:213-216`; `css/admin.css` (no `--accent` reads; `tests/admin-css-tokens.cjs`). |
| §6.3b Code's 20 terracotta-repaint override rules deleted | - | OUT-OF-REPO | flux-code-app `src/app/globals.css:~150-185` still present (now deletable). |
| §6.4 Namespace palette keys; read old keys once; CMS `activeTheme:"ghost"` mapped on read | - | PARTIAL | SDK has `ember/ember-light/tide/...` (`role-ladder-palette.ts:65-69`) but defxn emits only legacy keys (`css/flux-themes.css:8,27,46...`), `js/bootstrap.js:6`, `js/content/theme.js:26`, `js/content/theme-data.js` `activeTheme:"ghost"`, `js/content/settings-defaults-data.js:8`. No read-forward map. |
| §6.5 End state: SDK first-class `--secondary` ladders; DEFXN layer shrinks to `--anchor`, `--*-scale`, `--dx-*` | - | PARTIAL | SDK resolves the whole role layer for ember themes (`role-ladder.ts:41-60`) but the kit still carries the role layer and `--dx-*` tokens (`K:dist/defxn-tokens.css`, `assets/kit/defxn-components.css:36`); `--dx-radius`/`--dx-bar-h`/`--dx-max` not mapped to `--size-*`. Repos: design/deadark-sdk, defxn-product-kit. |
| §7 A1 Kit shell gaps (actions slot, brandSub, home mode, menu mode, sliding indicator, count badge) | - | PARTIAL | Built: `K:src/shell.mjs:419-520` (`actions`, `brandSub`, `mode:'home'`, `menuAt`). Not built: sliding `nav-ind` indicator and `.dx-choice` count badge (no matches in `K:src`). Repo: defxn-product-kit. |
| §7 A2 Kit delivery (classic IIFE, data marks css, split tokens, `boot.js`, built-output check) | - | PARTIAL | Built: `defxn-product.js`, `defxn-marks.data.css`, `defxn-tokens.css`, `sync.mjs:46-102` built-copy check (all in `K:dist/`, `K:scripts/sync.mjs`). Not built: theme-boot snippet `boot.js` (no match in `K:scripts/build.mjs` or `K:dist/`). Repo: defxn-product-kit. |
| §7 A3 Design check ported; fix half-pixel sizes | - | PARTIAL | Ported (`K:scripts/design-check.mjs`); half-pixel sizes still allowed via baseline (`K:test/design-baseline.json:14-19`). Repo: defxn-product-kit. |
| §7 A4 Catalog entries (Launch `defxn` block; defxn `defxn.home`) | - | PARTIAL | defxn done (`package.json:56-70`). Launch: `LP:package.json` has no block (OUT-OF-REPO flux-launchpad; kit uses a pending file instead). |
| §7 B1 SDK palette port (byte-exact, audit first, publish sha-pinned) | - | FIXED | SDK `0.2.37` (`SDK:package.json:3`); defxn consumes `.vendor/deadark-sdk-0.2.37.tgz` (`package.json`); `tests/role-ladder.test.mjs` in the SDK pins the pass; defxn `tests/flux-themes-from-sdk.cjs`. |
| §7 B2 Icon pack promotion; `icons.js` generated from the pack; kit `deriveIcons()` reads the pack | - | OPEN | design/ark-ui `icons/ark` lacks the glyphs; defxn `js/ark/icons.js` still hand-written; no generator in `scripts/`. |
| §7 B3 Brand assets move to the kit | - | FIXED | `K:brand/{fonts,marks}`; `assets/brand/` and `scripts/build-brand-marks.cjs` removed; `assets/kit/*` synced. |
| §7 B4 Kit reads the SDK; `build-flux-themes.cjs` retires | - | FIXED | `K:scripts/build.mjs:15-20,140-157` reads `deadark-theme role-ladder`. `scripts/build-flux-themes.cjs` is kept but is now a thin SDK reader (no generator), as `tests/flux-themes-from-sdk.cjs` guards. |
| §7 C1 defxn.com adopts the kit (head loads, header mount, retire header/button rules, SSR, fold work) | - | PARTIAL | Done: kit CSS/JS/marks/fonts loaded (`index.html:22-27,67,183`), header mounted (`js/resolvers/header.js:493`), SSR pass (`tests/kit-home-shell.cjs`). Left: site header/button rules not retired (`css/navigation.css`, `css/components.css` still dress the bar and carry shadows); fold on `/`, `/about`, `/stats` UNVERIFIED (needs browser); page presentation not scoped under `[data-dx-product="home"]`. |
| §7 C2 CMS: `--accent`->`--reference`; shadows to popovers only; gate bar wears kit bar | - | PARTIAL | `--accent` change done (`css/admin.css`, `tests/admin-css-tokens.cjs`). Shadows: glows remain on `.btn.primary` (`css/admin.css:185`), `.dot` ring (`:202`), `.who` ring (`:536`); cards flat. Gate/app bar still own (`admin-app.html:40`). |
| §7 C3 Flux Launch adopts the kit (delete vendor copies, mount shell, Ember default, fold, icons) | - | OUT-OF-REPO | flux-launchpad (blocked on v2 merge, §0.7). Not started: `LP:vendor/defxn-ark/*`, `LP:index.html`. |
| §7 C4 Product clean-ups (bullets: flux-code-app; signing copies in 7 products; mesh-registry `.dx-input`; handoff in 7 products; bundle-deploy/site; remote-env preview.html; headline in notify/storage/books) | - | OUT-OF-REPO | One row for the 7 bullets; repos as in §1.1 #2-#10. |
| §7 C5 Restart stale servers after every sync | - | OUT-OF-REPO | Process step; kit `sync.mjs:46-102` now also refreshes built copies, but `product-surfaces/scripts/serve.mjs` still builds once at start. |
| §7 D1 SDK adds `--secondary` ladders first-class; shims removed | - | OPEN | Future Phase D; see §6.5. Repos: design/deadark-sdk, defxn-product-kit, flux-code-app. |
| §8.1 Kit behaviours built on `@deadark/ark-elements` (popover/menu/tabs/dialog) | - | OPEN | `K:src/shell.mjs` has no Ark import (grep empty); switcher, network popover, tabs still bespoke. Repo: defxn-product-kit. |
| §8.2 Ark UI styler reads CSS tokens, not hard-coded hex | - | OUT-OF-REPO | design/ark-ui: `ark-ui.chrome.ts:24-31` still hex (`#f5f1e8`, `#fbf8f1`, ...). |
| §8.3 `--accent` collision fixed before Ark UI buttons render | - | FIXED | defxn: `css/flux-themes.css:213`. (Code's leftover overrides: §6.3b.) |
| §8.4 Ark elements loadable without an import map / classic scripts | - | FIXED | `js/ark/vendor/ark-kit.js` and `ark-kit-live.js` IIFE bundles, built by `scripts/build-ark-vendor.cjs` (`package.json` `build:ark`, `check:ark`). |
| §8.5 Conflict: components.md styled Ark components with own colours | - | FIXED | `css/ark-blocks.css` and `css/block-page.css` contain no colour literals (grep: 0 hex), fonts via `var(--font-sans)`: look stays token-driven. |
| §9 risk: SSR (classic scripts, Next client import) | - | FIXED | defxn: kit classic build runs in jsdom (`tests/kit-home-shell.cjs`). Next side is flux-code-app (not re-verified). |
| §9 risk: CMS saved data (nav keys, theme-data, hex `colors` overrides applied after tokens) | - | OWNER | Saved files untouched (no diff to `js/content/theme-data.js`). Open decision: whether the CMS keeps palette authority over kit tokens on defxn.com (report recommends yes, scoped to the home). |
| §9 risk: persisted keys stay readable | - | FIXED | `js/bootstrap.js:6-11` still reads both keys; kit home mode writes none (`tests/kit-home-shell.cjs`). |
| §9 risk: signing origins and same-origin assets; Bundles broker whitelist | - | PARTIAL | Both mark encodings from one source (D6, FIXED). Left in bundle-deploy: broker whitelist/security test for the new kit files `defxn-tokens.css`, `defxn-product.js` (not verified here). |
| §9 risk: palette precedence (kit would repaint other families as Ember) | - | FIXED | `K:dist/defxn-tokens.css:4,8` (`:where(:not([data-theme]))`); `tests/kit-home-shell.cjs` with clay/moss. |
| §9 risk: SDK colour law may reject vivid roles | - | FIXED | Audit run, owner rule change, pass pinned: `SDK:src/theme/role-ladder.ts:11-24`, `SDK:tests/role-ladder.test.mjs`. Ember values untouched. |
| §9 risk: fold rule (bar must not push pages over budget) | - | UNVERIFIED (needs browser) | No post-adoption measurement in tree; needs the Wave 4 fold sweep with switcher and phone menu open. |
| §9 risk: motion (default-on patterns vs "nothing animates idle") | - | PARTIAL | Same as §2 Motion. |
| §9 risk: concurrent sessions / v2 dirty tree | - | OWNER | Process risk: Launch work waits on the owner's v2 merge. |
| §9 risk: stale running copies | - | OUT-OF-REPO | Same as §1.1 #1 and §7 C5. |
| §9 risk: naming collisions (Market, Treasury, Deploy, Explore vs Launch/defxn pages) | - | OWNER | Catalog still names the Launch product "Flux Launch" (`K:catalog/pending/flux-launchpad.json`), not "DeFi"; owner must settle the names before Launch joins the switcher. Overlap pages already say "Open <Product>" (§0.6). |
| §10.1 product-surfaces built output stale and invisible to `sync --check` | - | OUT-OF-REPO | Kit check fixed (`K:scripts/sync.mjs:46-102`); product-surfaces server restart/`serve.mjs` still open. |
| §10.2 Launch hand-vendored files drifted | - | OUT-OF-REPO | flux-launchpad (stale canvas value still in `LP:vendor/defxn-ark/flux-themes.css`). |
| §10.3 CMS selection painted in identity colour | - | FIXED | Same as §3.12. |
| §10.4 Inner headings name unloaded "IBM Plex Sans"; `themes.css` has serif display | - | FIXED | Slot override `assets/kit/defxn-fonts.css:46-62`; `tests/browser/site-fixes.mjs:204-217`. Residual dead declarations in `css/themes.css:97-109` are SDK output (D4). |
| §10.5 defxn.com header form controls render in Arial | - | FIXED | `assets/kit/defxn-components.css:61,78`; `tests/browser/site-fixes.mjs:204-217`. |
| §10.6 `flux-launchpad-wt-v2/index.html` links missing `css/home.css` | - | OUT-OF-REPO | flux-launchpad-wt-v2 (confirmed missing). |


---

## resolvers-content (docs/ux-audit/resolvers-content.md)

Read-only status check against the working tree on 2026-10-20. Wave 1 (3462ab4) did nearly all in-repo W1-CONTENT work; later commits and the uncommitted edits (js/admin/*, tests/browser/*, docs/cms-architecture.md, docs/ux-audit/*) do not touch resolver content. No W1-CONTENT out-of-repo report exists in docs/ (grep W1-CONTENT finds only plan.md); the out-of-repo list is therefore still only the audit's own §2.15, §2.16, §7 step 7, so this ledger carries it. Severity column = the report's verdict label (WRONG / STALE / BANNED / MISSING / CONFLICT), since the report gave no P-levels. "Counts" are tallied from the rows below. The report's §1 is the system description used as the source of truth; it contains no findings of its own and is grouped in row 1.x.

Evidence short forms: `RM` = js/content/manifests/resolver.js; `DM` = js/content/manifests/deployment.js; `snap` = js/content/registry-snapshot.js; `vocab` = tests/no-deprecated-vocabulary.cjs; `PR` = docs/protocol/resolvers.md.

Counts: FIXED 115, PARTIAL 23, OPEN 10, OWNER 9, OUT-OF-REPO 32, UNVERIFIED 4

| id / short title | severity | status | evidence |
|---|---|---|---|
| 0.a Site describes the agreement-fabric-era resolver (summary headline) | STALE | FIXED | Hub rewritten: RM:90 DISPLAY.LEDE, RM:96 BODY1; detail rows 2.1-* |
| 0.b Nothing mentions capabilities, ResolverLaunch/Upgrade, control key, grammar enforcement, provider proof, 12 chains, explore/deploy | MISSING | FIXED | RM LAW1-4, VERIFIED.FACT1-3, REGISTRY.*, EXPLORE.HREF/DEPLOYER.HREF (RM:364,376); PR §1-§8 |
| 0.c No inbound links to explorer/deployer | MISSING | FIXED | RM:364,376; DM:289,301; js/pages/resolvers.js:263. Published with a "development network" note (RM PRODUCTS.NOTE); see Q2 |
| 0.d Two circulating resolver counts (20/6/14 and 5/15), neither is the registry | WRONG | FIXED | docs/resolver-math.md table (12 + 5 chains, 5 capabilities, families named apart); js/content/stats-highlights.js:254 "Resolver families audited"; counts from snap |
| 0.e "capability" / "registry" / "resolver" carry 2-3 meanings | collision | PARTIAL | Fixed in glossary.md:13-39, PR, resolver-math.md, resolver-math.js (visible text "things can be said"). Left: js/pages/stats.js:535,643,690 still call the audit "Resolver registry" (row 2.11-a); docs/resolver-audit.md:11 "not registered" (row 2.12-i) |
| 0.f Banned vocabulary still on rendered pages (quorum, validator.fxn, validators/consensus/finality/accepted ops/s/replica applications) | BANNED | PARTIAL | Cleared: grep of js/content, js/pages, js/resolvers, llms.txt finds none of committee/validator/quorum/consensus/finality in rendered copy except an identifier slug (seo-data.js:649, article-index.js:20, llms.txt URL). Left: "finalized" (not in vocab FORBIDDEN, vocab:57-77) at js/pages/stats.js:84, js/pages/stats-ledger.js:99, js/content/manifests/spec.js:144 |
| 0.g Recommended structure: hub = /what-is-a-resolver; /resolvers = registry; /how-deployment-works = Deploy a resolver; no orphan | - | FIXED | RM title; js/pages/resolvers.js; DM:TITLE "From a grammar to a chain."; js/content/manifests/nav.js (DEPLOYMENT label "Deploy a resolver"); site-pages.js:45 |
| 0.h Update order follows docs/content-sources.md | - | FIXED | 3462ab4 touched evidence registry (CAP-010..016, docs/evidence/registry.md:58-64), status.md, PR, glossary, manifests, articles in that order |
| 0.i Flux Launch: three WRONG claims plus fee claim now false | WRONG | OUT-OF-REPO | flux/flux-launchpad (branch wave3-launchpad-v2); detail rows 2.15-* |
| 0.j CMS: read-only typed resolver/capability blocks; derive /resolvers from dated snapshot | - | PARTIAL | Snapshot half FIXED (scripts/snapshot-registry.mjs, snap, tests/registry-snapshot.mjs, js/content/resolver-registry.js deleted). Typed blocks OPEN (rows 6.1, 6.2) |
| 1.x System description (three layers, capability, launch, deploy steps, upgrades, verified-on-chain, DeFi frame, state table, vocabulary table) | - | FIXED | Reference section; its content is now carried by PR §1-§9, glossary.md:13-61, status.md CAP-010..016. Items it flags are tracked in 1.y-1.z |
| 1.y Model vs code: "every token is its own chain" must not be stated as the model | - | FIXED | js/pages/stats.js:518 states the code derives a chain per launch and the planned model keeps tokens inside a native chain, not built yet (plan.md owner defaults) |
| 1.z Gap: deploy form has no capability picker; announce has no periodic re-announce | - | OUT-OF-REPO | flux/deploy (flx-resolver-launch-panel.mjs, vendored from defxn-defi-rs/dense-wire/web); re-announce built in flx-resolver-host per status.md CAP-016, not observed running |
| 2.1-a /what-is-a-resolver DISPLAY.LEDE "named, deterministic logic" | STALE | FIXED | RM:90 |
| 2.1-b BODY1 / LAW1.TEXT "addressed, deterministic logic" | STALE | FIXED | RM:96, LAW1 |
| 2.1-c BODY2 checker/authority cell | STALE | FIXED | RM BODY2 (capabilities composed, own grammar) |
| 2.1-d BODY3 / LAW3 "deployed only when admitted active provider reports fresh capacity" | STALE | FIXED | RM:108 BODY3 "Launched is not served"; LAW3 "Its grammar is the gate" |
| 2.1-e LAW4, BOUNDARY, CHECK.BODY "signature is not a verdict / checker decides" vs owner law | CONFLICT | FIXED | RM:174 BOUNDARY, RM:234 CHECK.BODY, LAW4 (immutable by default); owner framing in plan.md; PR §7; glossary.md:41 |
| 2.1-f resolver-lab.js :357-360 status rows Live/Partial CAP-004/005 | STALE | FIXED | js/pages/resolver-lab.js:273 STATUS = Partial CAP-010/011/012/010 (rendered at :365) |
| 2.1-g resolver-lab.js :193/:210/:212 "signed · provider P-3", "acceptance · checker decides" | STALE | FIXED | resolver-lab.js:225 "signed · provider P-3" now means the provider signs the result; :226 "trust · decided before sending"; no checker step left (grep "checker" = none) |
| 2.1-h Whole page MISSING own chain / capabilities / grammar / control key / links to Explore & Deploy | MISSING | FIXED | RM LAW1-4, VERIFIED.*, REGISTRY.LINK, DEPLOY.LINK, EXPLORE.LINK, DEPLOYER.LINK, MATH.LINK, PRODUCTS.NOTE |
| 2.2-a /resolvers resolvers.js :79 LEDGERENTRY "Y code" registration | STALE | FIXED | js/pages/resolvers.js rewritten on Ark blocks; no "Y code" text (grep of file) |
| 2.2-b :94 "free Y code ... manifest-types.json" | WRONG | FIXED | gone from resolvers.js; REGISTRY.DEPLOY.STEPS says "Write your grammar" (RM) |
| 2.2-c :95 "Grammar admission is already handled by the chain" | STALE | FIXED | REGISTRY.CHAINS.BODY explains enforced vs Unspecified (RM) |
| 2.2-d :96 publish signed manifest as LEDGERENTRY | STALE | FIXED | REGISTRY.DEPLOY.STEPS (RM): sign one launch record at deploy.defxn.com |
| 2.2-e :97 "Register with directory ... resolve.defxn.com" | STALE | FIXED | grep resolve.defxn.com in js = none |
| 2.2-f :104 "CLI deployer and resolve.defxn.com are the next step" | STALE | FIXED | replaced by Deploy your own tab, resolvers.js views() |
| 2.2-g resolver-registry.js header "Only one letter (J)" | STALE | FIXED | file deleted in 3462ab4; git ls-files shows js/content/resolver-registry.js absent |
| 2.2-h resolver-registry.js hand-authored, 6 apps, not chains, dao-governance -> ark-miner-cli | STALE | FIXED | snap (generated); apps moved to js/content/resolver-applications.js, own tab; dao-governance note at resolver-applications.js:188 says it is not the dao chain |
| 2.2-i stream entry "1,712,006/s ceiling", "82,863 finalized records/s" | STALE/BANNED | FIXED | grep "ceiling\|finalized\|1,712" in resolver-applications.js = none |
| 2.2-j Whole page MISSING capabilities, chain ids, control, grammar status, proved providers, explorer link per row | MISSING | PARTIAL | Table has chain id, built-from, grammar, control (resolvers.js:views), capabilities tab, per-chain Explore links in accordion. Left: control shows "not in the sources" for all rows and there is no providers/proved column (snapshot holds no node read; Q10 chose snapshot-only). Needs a node read or stays in Explore |
| 2.3-a /how-deployment-works route title/SUMMARY "network ID to verifiable receipt" | STALE | FIXED | DM TITLE/SUMMARY "From a grammar to a chain."; nav label "Deploy a resolver" |
| 2.3-b BODY1/FABRIC.NETWORK/BOUNDARY named network (wrong topic) | STALE | FIXED | replaced by six-step deploy copy (DM STEP1-6); named networks live on /deploy |
| 2.3-c BODY2 "Publication alone does not establish active execution capacity" | STALE | FIXED | DM BOUNDARY / SIMPLE.BOUNDARY "Launched is not served" |
| 2.3-d BODY4/FABRIC.FULFILLMENT agreements resolver links | STALE | PARTIAL | Agreement chapters kept but labelled "The earlier agreement path ... kept read-only" (DM SIMPLE.AGREEMENT.*, DM:433 banner text). Q4 (move to /lifecycle) undecided |
| 2.3-e CHAPTER.WORK.WHY1 per-signer chains vs "blockchain" | CURRENT | FIXED | grep "blockchain" in DM = none |
| 2.3-f CHAPTER.CHECK.WHY3 "quorum signs ... 375 times a second" | WRONG+BANNED | FIXED | DM CHAPTER.CHECK.WHY3.TITLE = "Signed, then stored"; grep quorum/375/attestation in DM = none |
| 2.3-g CHAPTER.CHECK.DETAIL3/WHY2 approvers/mandate | STALE | PARTIAL | DM:769 still describes approvers whose mandate ends; sits under the earlier-agreement-path chapters (labelled). Retire/keep is Q4 |
| 2.3-h CHAPTER.WORK.RECORD "flux.fabric-transfer.v1" labelled REAL FXN TRANSFER | STALE | FIXED | DM:609-619 label now "AN EARLIER-PATH TRANSFER RECORD"; record text kept as history |
| 2.3-i Whole MISSING how a resolver is deployed | MISSING | FIXED | DM STEP1-6, SIMPLE.CAUTION (DM:261), SIMPLE.PLANNED (DM:273), actions to deploy.defxn.com / explore.defxn.com (DM:289,301) |
| 2.4-a /chain TITLE/LEDE incomplete (resolver chains, base chain) | MISSING | FIXED | js/content/manifests/chain.js:39 LEDE |
| 2.4-b home-flow.js :43 Check step "Meaning is not checked" | STALE | FIXED | home-flow.js BASE_STEPS 'check' says base grammar plus the resolver's published grammar |
| 2.4-c home-flow.js :45 Replicate "9 of 12 peers" | CURRENT | FIXED | unchanged and correct (illustrative K-of-N) |
| 2.4-d home-flow.js :27 Swaps case "DeFi resolver reads the payload" | STALE | FIXED | home-flow.js CASES swaps: "The launch's signer resolves the batch and signs the result" |
| 2.4-e home-flow.js :29/:474 party "validator.fxn" | BANNED | FIXED | home-flow.js:31 and :435 use provider.fxn; grep validator = none |
| 2.4-f chain.js NEXT -> /what-is-a-resolver | CURRENT | FIXED | unchanged |
| 3.4-x /chain proposed detail "Where do resolver chains come from? -> What is a resolver" | MISSING | FIXED | manifest fields CHAIN.SOURCE.LINK / CHAIN.SOURCE.HREF, rendered by `js/pages/chain.js` (chain-onward); tests/site-exits.cjs, tests/chain-blocks.cjs (W5-PAGES) |
| 2.5-a /about POINT2 admission rule | MISSING | FIXED | js/content/manifests/about.js:89 |
| 2.5-b /about POINT4 agreements resolver "implemented in source" | STALE | FIXED | about.js:113 |
| 2.5-c /about FLOW2 "network's published rules" | STALE | FIXED | about.js:347 |
| 2.6-a /dao DECK "neither quorum" | BANNED | FIXED | js/content/manifests/dao.js:42 "neither threshold acts for the other" |
| 2.6-b /dao POINT1 seven operators 4-of-7... | STALE | PARTIAL | dao.js POINT1 now says "An earlier substrate policy in source ... not how a resolver changes" (the report's "mark as earlier design" option). Where that policy lives today is owner question Q6 |
| 2.6-c /dao POINT2 each network defines roster | STALE | FIXED | dao.js POINT2 names dao resolver chain on multisig (min 2 signers, threshold >= 2) |
| 2.6-d /dao STATUS | STALE | FIXED | dao.js STATUS.TEXT mentions resolver chain on the development network |
| 2.6-e /dao MISSING who can change a resolver / capability | MISSING | FIXED | dao.js:114 POINT6 and POINT7 |
| 2.7 /deploy: one line sending resolver deployers elsewhere | MISSING | FIXED | js/content/manifests/deploy.js:29 RESOLVER.NOTE/LINK/HREF; rendered at js/pages/deploy.js:134-135 |
| 2.8-a /bundle-deployer POINT4 CLI not available | CURRENT | FIXED | unchanged |
| 2.8-b POINT3 mesh ownership record (bundle chain bridge) | STALE | FIXED | bundledeployer.js POINT3 mentions bundle resolver chain, mesh path still the one in use |
| 2.8-c MISSING planned: sites/apps deploy from deploy.defxn.com | MISSING | FIXED | bundledeployer.js RELEASE.NOTE "Planned ... Not built yet", rendered js/pages/bundle-deployer.js:75 |
| 2.9-a download.js POINT4 | CURRENT | FIXED | js/content/manifests/download.js:71 "does not mean any resolver is served" |
| 2.9-b operators/troubleshooting.md :21-25 | STALE | FIXED | docs/operators/troubleshooting.md "A resolver is launched but nothing answers" (3462ab4) |
| 2.9-c operators/verification.md :21-27 | STALE | FIXED | docs/operators/verification.md "Resolver launch and serving" |
| 2.9-d operators/verification.md :29-39 agreement endpoints | STALE | FIXED | heading "Agreement fabric (retired, read-only)" |
| 2.9-e operators/prerequisites.md :15 flux-provider-runtime | STALE | FIXED | prerequisites.md reworded to the announce + capability proof path |
| 2.9-f operators/networks.md :3 add "not a resolver chain" | CURRENT | FIXED | docs/operators/networks.md |
| 2.10-a resolver-math.md :27 "5 resolvers" | WRONG | FIXED | docs/resolver-math.md table: 12 + 5 resolver chains, 5 capabilities, 95 record types |
| 2.10-b resolver-math.md :22-26 93 types / 10 shapes | STALE | FIXED | now 95 / 12 (same table) |
| 2.10-c :155 "exactly one letter" | WRONG | FIXED | heading now "for five letters" |
| 2.10-d :82-84, :293-296 "not registered", "Fifteen further resolvers" | STALE/WRONG | FIXED | "not audited"; list trimmed, governance/treasury noted as launched dao/treasury chains |
| 2.10-e :313 "Runtime self-registration not built" | STALE | FIXED | now "not built for the shared registry; a resolver's own grammar ... is built" |
| 2.10-f resolver-math.js hard-coded RESOLVERS (6 built/14 not built; Governance-Vote, Treasury-Spend NOT BUILT) | STALE | PARTIAL | list kept but now labelled the audit's families, not chains (resolver-math.js:40-46 comment); chain count comes from snap (:293). Left: list is still hand-typed and Governance-Vote/Treasury-Spend still read NOT BUILT (:59-60) although dao/treasury chains exist - they are different audit "families" but the page does not say so beside the rows. File: js/pages/resolver-math.js |
| 2.10-g "capabilities disappear" collision (resolver-math.js, resolver-block.js :472) | collision | FIXED | visible text "sayable things"/"things can be said" (resolver-math.js:12,:512-515); resolver-block.js:472 is only a comment. Internal var CAPABILITIES (resolver-math.js:251) is not shown |
| 2.10-h manifests/resolvermath.js | CURRENT | FIXED | kept; capability summand added as a count row (resolver-math.js:294) |
| 2.11-a /stats highlights :242 "Resolver registry - 20 resolvers" | STALE | PARTIAL | js/content/stats-highlights.js:254 fixed ("Resolver families audited", not chains). Left: js/pages/stats.js:535 title "Resolver registry · 20 resolvers", :643 term "Resolver registry", :690 row "Resolver registry" still use the colliding name |
| 2.11-b stats.js :165 "Sovereign chains ... 1B-unit native token" model vs code | model != code | FIXED | stats.js:518 adds "Today the code gives each launch a chain of its own; the planned model keeps launched tokens as assets inside a native chain, and is not built yet" |
| 2.11-c stats.js READINESS "certified-segment path" | STALE | FIXED | stats.js:89 reworded to chain, launch/grammar checks, capability crates |
| 2.12-a protocol/resolvers.md :3 definition | STALE | FIXED | docs/protocol/resolvers.md fully rewritten (PR, 9 sections) |
| 2.12-b protocol/resolvers.md :9 "capability states what a provider can perform" | WRONG | FIXED | PR §1, §3 |
| 2.12-c protocol/resolvers.md :14 deployed only when ... fresh capacity | STALE | FIXED | PR §6 "Launched is not served" |
| 2.12-d protocol/resolvers.md :18 checker/authority acceptance | CONFLICT | FIXED | PR §7 trust boundary |
| 2.12-e glossary.md :13,17,19,35 Resolver/Capability/Provider/Deployed | STALE/WRONG | FIXED | docs/glossary.md:13 (Resolver), :15 (Capability), :43 (Provider), :59-61 (Launched/Served replaces Deployed) |
| 2.12-f glossary.md :15 vs :29 contradiction | contradiction | FIXED | glossary.md:41 Claim and :53 now agree (signature is the result) |
| 2.12-g status.md :44-46 resolver definition/publication/deployment Live/Partial | STALE | FIXED | docs/status.md rows now Retired + CAP-010..016 Partial |
| 2.12-h status.md :57 peer-sync Not built; missing rows | STALE/MISSING | FIXED | status.md peer-sync row Partial (observed 2026-10-19); new rows for capability registry, grammar, provider proof, explorer/deployer, first-party chains, host; planned items "Not built" |
| 2.12-i resolver-audit.md :7-11 "does not publish its audit manifest is not registered" | collision | OUT-OF-REPO | docs/resolver-audit.md is generated by defxn-defi-rs `dense-wire/src/bin/resolver-audit` (header line 3); wording must change in the generator then regenerate. Unedited here (git diff 5a1ac71 stat shows no change) |
| 2.12-j overview.md :17, :23-25 certified segments / core flow | STALE | FIXED | docs/overview.md:17 reworded to resolver chains; core-flow banner at :23 |
| 2.12-k whitepaper.md :61-68, :248, :297, :301 | STALE | PARTIAL | banner only at top (docs/whitepaper.md, "Written before resolver chains and capabilities"); body "20 resolvers, 6 measured, 14 not built" and "deploy and rollback owed" (:303) left as history per future-law |
| 2.12-l protocol/agreements.md, authority.md banner | STALE | FIXED | banner line at top of both |
| 2.12-m prototype-to-production.md :147-149 "Deploy and rollback Not built" and :179 Byzantine | STALE/BANNED | PARTIAL | banner added (line 3); body :147 and :181 "Byzantine tolerance" left as frozen history. Not in vocab LIVE_DOCS scope for "Byzantine" (not in FORBIDDEN) |
| 2.12-n index.md :3, quickstart.md MISSING explorer/deployer/capabilities | MISSING | PARTIAL | docs/index.md updated (Deploy a resolver bullet); docs/quickstart.md unchanged (git diff 5a1ac71 stat) |
| 2.13-a a-resolver-by-construction :3,:42 "each letter's resolver" | STALE | PARTIAL | banner via `relevance` (articles/*.js:4) rendered by js/pages/article.js:170 with a link to /what-is-a-resolver; body :42 wording kept as dated history |
| 2.13-b a-resolver-by-construction :27, :56, :72-74 validators/quorum | BANNED | FIXED | grep of articles for validator/quorum/finality/consensus/committee = none |
| 2.13-c a-resolver-by-construction :37 "code 1A under the agreement-fabric group" | STALE | PARTIAL | still present at articles/why-the-chain-was-retired.js:37 (dated history under banner) |
| 2.13-d governance-without-a-validator-set (slug, :3, :20, :25) | BANNED/STALE | PARTIAL | words removed from body/description; slug kept (identifier exemption in vocab). Rename+redirect is Q7 (OWNER, row Q7) |
| 2.13-e one-substrate-many-networks :3,:20,:30 | STALE | PARTIAL | banner added; body :3, :20 ("DAO Chain ... anyone can deploy") still the old framing |
| 2.13-f the-chain-prototype :25,:34 "no central registry" | WRONG | FIXED | grep "central registry" in the article = none |
| 2.13-g the-chain-prototype :3,:55,:59 "12,403 accepted ops/s", quorum roster | BANNED | FIXED | grep accepted ops/quorum/validator in article = none; description in seo-data/llms.txt:76 clean |
| 2.13-h the-grammar-does-almost-no-work :3,:34,:25 "each block's own resolver" / validator | collision/BANNED | FIXED | validator gone; banner covers the "resolver" word |
| 2.13-i the-grammar-does-almost-no-work MISSING second grammar layer | MISSING | OPEN | no mention of a resolver's own grammar (grep "own grammar|published at launch" = none). File: js/content/articles/the-grammar-does-almost-no-work.js |
| 2.13-j why-the-chain-was-retired :3, :36-37 | STALE/BANNED | PARTIAL | finalized/replica applications removed; :3 "resolvers on top" left as dated history under banner |
| 2.13-k how-we-got-fast-and-what-we-got-wrong | BANNED | FIXED | grep banned terms = none; banner in `relevance` |
| 2.13-l all seven articles: dated-history banner | - | FIXED | `relevance` field in all 7 article files; article.js:170 renders it |
| 2.14-a llms.txt /resolvers description | STALE | FIXED | seo-data.js:449; llms.txt:16 |
| 2.14-b llms.txt /what-is-a-resolver + aiSummary | STALE | FIXED | seo-data.js:39,44; llms.txt:14 |
| 2.14-c llms.txt /how-deployment-works | STALE | FIXED | seo-data.js:68-74; llms.txt:26 |
| 2.14-d llms.txt /chain "grammar and signature only" | STALE | FIXED | seo-data.js:29; llms.txt:36 |
| 2.14-e article the-chain-prototype "12,403 accepted ops/s" | BANNED | FIXED | llms.txt:76 clean |
| 2.14-f governance slug in llms.txt | BANNED | OWNER | Q7: URL still carries "validator" (llms.txt:72, seo-data.js:649); rename needs a redirect and owner say-so |
| 2.15-a Flux Launch index.html :235/:452 "prices come straight from the node" | STALE | OUT-OF-REPO | flux/flux-launchpad (copy proposed in audit §3.12 row 1); not re-read here |
| 2.15-b index.html :291/:822 "Balances signed by the network" | STALE | OUT-OF-REPO | flux/flux-launchpad |
| 2.15-c "committee"/"bridge committee" (index.html, app.mjs, bridge.mjs) | BANNED | OUT-OF-REPO | flux/flux-launchpad |
| 2.15-d index.html :536 bond / backed launch | STALE | OUT-OF-REPO | flux/flux-launchpad (wave3-launchpad-v2 partly fixed per audit) |
| 2.15-e fair-launch "clear at one price" incomplete | CURRENT | OUT-OF-REPO | flux/flux-launchpad |
| 2.15-f index.html :538-539, schematics.mjs "filled at once / node's price" | STALE | OUT-OF-REPO | flux/flux-launchpad |
| 2.15-g "slashed to holders on a rug attempt" (index.html :554, app.mjs :1322/:1356) | WRONG | OUT-OF-REPO | flux/flux-launchpad; owner must apply on/after wave3-launchpad-v2 |
| 2.15-h create.html :178 / refusals.mjs :81 "forfeits a quarter" | WRONG | OUT-OF-REPO | flux/flux-launchpad |
| 2.15-i fee wording index.html :581/:597, app.mjs :1331 | STALE | OUT-OF-REPO | flux/flux-launchpad |
| 2.15-j app.mjs :1486/:1511/:1518 "Fee - none on the curve" | STALE (false) | OUT-OF-REPO | flux/flux-launchpad |
| 2.15-k create.html optional "Backed launch"/"Unbacked" | WRONG | OUT-OF-REPO | flux/flux-launchpad (audit says fixed on wave3-launchpad-v2 60b2349) |
| 2.15-l create.html :202 swap signer note incomplete | CURRENT | OUT-OF-REPO | flux/flux-launchpad |
| 2.15-m "chain itself only records ticker and supply" | STALE | OUT-OF-REPO | flux/flux-launchpad |
| 2.15-n "Chain status"/"launches the chain" token = chain | model != code | OUT-OF-REPO | flux/flux-launchpad; interim title "Launch status" proposed (Q9 default in plan.md: do not state as live) |
| 2.15-o CUSTODY_NOTE / holdings / README "not escrowed money" | STALE | OUT-OF-REPO | flux/flux-launchpad |
| 2.15-p "Not backed" chip collision | collision | OUT-OF-REPO | flux/flux-launchpad (holdings.mjs, index.html:851) |
| 2.15-q safety.mjs :19 "Creator bond intact" | STALE | OUT-OF-REPO | flux/flux-launchpad |
| 2.15-r records.mjs :36 sends FLX-CSWAP-TERMS-V1 (functional) | defect | OUT-OF-REPO | flux/flux-launchpad (audit: fixed on wave3-launchpad-v2 86f82b2) |
| 2.15-s index.html :799 Resolver tab lede | STALE | OUT-OF-REPO | flux/flux-launchpad |
| 2.15-t Resolver tab panel missing composes/proof explanation | MISSING | OUT-OF-REPO | defxn-defi-rs dense-wire/web/flx-resolver-launch-panel.mjs (vendored into deploy, dao, treasury, Flux Launch) |
| 2.15-u roadmap index.html :305-313 | CURRENT | FIXED | audit judged correct; nothing to do |
| 2.15-v service pools "In development" add revenue-routing caveat | CURRENT | OUT-OF-REPO | flux/flux-launchpad index.html:506,612-623 |
| 2.15-w README :88-125, :415-419 launch flow | STALE/WRONG | OUT-OF-REPO | flux/flux-launchpad/README.md |
| 2.15-x concepts/f-service-pools.html "Protocol fee 0.00 / ZERO CUT" | WRONG | OUT-OF-REPO | flux/flux-launchpad concepts (mark mockup, do not ship) |
| 2.15-y docs/BRIDGE.md committee/quorum/validator/consensus/finality | BANNED | OUT-OF-REPO | flux/flux-launchpad/docs/BRIDGE.md |
| 2.16-a `describeLaunch` "committee" in signing dialog (flx-resolver-launch-panel.mjs) | BANNED | OUT-OF-REPO | defxn-defi-rs dense-wire/web, then re-vendor into deploy, dao, treasury, flux-launchpad (centralize). Not vendored into this repo (git ls-files js/dense-wire has no launch-panel) |
| 2.16-b explore-app.js :521 dossier label "Committee" | BANNED | OUT-OF-REPO | flux/explore (js/explore-app.js, README) |
| 2.16-c Explore reads "not active" for every resolver chain (CHAIN_STATUS CHAIN_UNKNOWN) | misleading | OUT-OF-REPO | flux/explore label; defxn-defi-rs GR Phase 25 |
| 3.1 Hub copy table (TITLE ... SOURCE.HREF, Evidence-depth status rows) | - | FIXED | RM fields as proposed (RM:90-288, EXPLORE/DEPLOY hrefs); resolver-lab.js:273,365 evidence rows with CAP ids |
| 3.2 /resolvers proposed copy (kicker, H1, chips, cards, Capabilities tile, Deploy your own, old apps collapsed) | - | PARTIAL | All copy in RM REGISTRY.*; js/pages/resolvers.js tabs chains/capabilities/bridges/deploy/applications; node+date chips as disclosure + hero meta. Left: per-resolver "providers announcing" and real control value are absent (see 2.2-j); cards are table rows, not cards (design choice) |
| 3.3 /how-deployment-works proposed copy (EYEBROW ... ACTION, CAUTION, PLANNED) | - | FIXED | DM STEP1-6, SIMPLE.CAUTION:261, SIMPLE.PLANNED:273, actions DM:289,301 |
| 3.3-b Must remove CHECK.WHY3 regardless of Q4 | WRONG | FIXED | see 2.3-f |
| 3.4 /chain copy (LEDE, Check step, Staking party, Swaps says, link line) | - | PARTIAL | LEDE, Check, Staking, Swaps done (rows 2.4-*); link line "Where do resolver chains come from?" absent (row 3.4-x) |
| 3.5 /about copy | - | FIXED | rows 2.5-* |
| 3.6 /dao copy (DECK, two new POINTs, POINT1) | - | FIXED | rows 2.6-*; new POINT is "Who can change a resolver?" dao.js:114 |
| 3.7 /deploy disambiguation line | - | FIXED | row 2.7 |
| 3.8 /bundle-deployer Planned line | - | FIXED | row 2.8-c |
| 3.9 /download and operator docs copy | - | FIXED | rows 2.9-* |
| 3.10 /resolver-math: derived counts, two rows, summand, rename, heading | - | PARTIAL | counts split and derived (resolver-math.md; resolver-math.js:293-294), rename and heading done; the RESOLVERS family list is still hand-typed (row 2.10-f) |
| 3.11-a docs/protocol/resolvers.md full replacement outline | - | FIXED | PR sections 1-9 match the outline |
| 3.11-b docs/glossary.md term table (14 terms) | - | FIXED | glossary.md:13-61 all 14 present |
| 3.11-c docs/status.md rows + evidence records filed first | - | FIXED | status.md CAP-010..016 rows; docs/evidence/registry.md:58-64 |
| 3.11-d Rename status.md column `Capability` -> `Feature` | collision | OWNER | Q1. docs/status.md:34 header still "Capability" |
| 3.11-e Banners on agreements.md, authority.md, overview.md core flow, prototype-to-production.md, whitepaper.md | - | FIXED | banner lines present in all five |
| 3.12 Flux Launch copy table (11 rows) | - | OUT-OF-REPO | flux/flux-launchpad on wave3-launchpad-v2; rows 2.15-* |
| 4.1 Diagram: layers kernel -> capabilities -> resolver chains | - | OPEN | spec only: RM meta.diagrams[resolver-layers] (RM:10-50) and PR "Diagrams" section; no renderer (grep "resolver-layers" in js/ outside manifests = none; resolver-guide.js uses generic createStoryDiagram). Files: js/pages/resolver-guide.js, js/pages/resolvers.js, new Ark/SDK diagram part |
| 4.2 Diagram: deploy flow, six stations, two refusal exits | - | OPEN | spec only in DM meta.diagrams[deploy-flow] (DM:12); not rendered. Files: js/pages/deployment.js |
| 4.3 Diagram: launched vs served | - | OPEN | spec only RM meta.diagrams[launched-vs-served]; not rendered. Files: js/pages/resolver-guide.js |
| 4.4 Diagram: upgrade supersedes | - | OPEN | spec only js/content/manifests/dao.js meta; not rendered. Files: js/pages/dao.js (story template) |
| 4.5 Diagram: swap as signed resolution | - | FIXED | drawn by `ArkUI.resolverPageParts.figureBlock('chain','swap-signed-resolution')` in the Swaps tab behind a disclosure (`#chain-swap`, foldBelow always), `js/pages/chain.js`; the second copy in home-flow.js is deleted; tests/chain-blocks.cjs, tests/resolver-page-parts.cjs (W5-PAGES) |
| 5.a /what-is-a-resolver hub with outbound links | - | FIXED | RM REGISTRY/DEPLOY/EXPLORE/DEPLOYER/MATH links (RM:340-394) |
| 5.b /resolvers inbound links (stats, hub, deployment, resolver-math, chain, header menu) | - | PARTIAL | Inbound now: RM:340, DM:313, js/pages/resolver-math.js:782,792, js/content/manifests/home.js:229, js/pages/stats.js:631, menu via site-pages.js:45 (journey 'build'). Left: /chain does not link it |
| 5.c /how-deployment-works inbound (hub, registry, /deploy, /bundle-deployer, /dao) | - | PARTIAL | Linked from RM:352, deploy.js:45 (RESOLVER.HREF), about.js:159, home.js:193. Left: /bundle-deployer and /dao carry no link to it. Files: js/content/manifests/bundledeployer.js, dao.js |
| 5.d /resolver-math inbound (was 0) | - | FIXED | RM:394 MATH.HREF; js/pages/resolvers.js:259; concept.js:59; article the-grammar-does-almost-no-work relatedPage |
| 5.e Optional new page /capabilities | - | FIXED | not created; absorbed in /resolvers as the report recommended |
| 5.f External links to explore/deploy only once hosting is real | - | OWNER | Q2: links are live with a "development network; public hosting not established" note (RM PRODUCTS.NOTE; status.md CAP-014 records both names resolve but neither answered HTTPS). Owner decides whether to keep them public |
| 5.g pages.md should list renamed titles / new inbound links | - | UNVERIFIED (needs browser) | docs/ux-audit/pages.md is a sibling audit file, not edited here; whether it was refreshed after wave 1 was not checked beyond file listing |
| 6.1 CMS typed block RBLOCK_RESOLVER_V1 | - | OPEN | no such block (grep RBLOCK_RESOLVER / rblock-resolver in js/tests = none; js/resolvers/blocks has only captured, card, cta, divider, image, quote, text). Files: js/content/components.js sanitize whitelist, js/admin/library.js, new js/resolvers/blocks/rblock-resolver-v1.js reading ArkRegistrySnapshot |
| 6.2 CMS typed block RBLOCK_CAPABILITY_V1 | - | OPEN | same; Files as 6.1 |
| 6.3 Derived snapshot replaces hand-written registry | - | FIXED | scripts/snapshot-registry.mjs (--write / default check), snap, tests/registry-snapshot.mjs (re-derives from pinned commit; REDUCED when sibling repo unreadable) |
| 6.3-b Snapshot verifies manifest hashes like Explore and stamps BUILD_INFO | - | PARTIAL | snapshot stamps source repo+commit+commitDate and a devnet observation record (snap:21-37); it reads source files, not RESOLVER_LIST/CAPABILITY_LIST/CHAIN_PROVIDERS over the wire, so no manifest-hash verification and no BUILD_INFO. Q10 chose snapshot-only; a node read would be an owner decision |
| 6.4 Diagram component driven by snapshot | - | OPEN | see 4.1; specs name `from: ArkRegistrySnapshot.*` (RM:27,35) but nothing consumes them |
| 6.5 Copy guard: scan manifests, articles, seo-data, home-flow CASES, rendered strings | - | FIXED | vocab "RENDERED COPY" half (tests/no-deprecated-vocabulary.cjs:~245-340) scans manifests, articles+index, seo-data, llms.txt, string literals in js/pages, js/resolvers, js/content (reference-index.js and the js/content/reference/ text files excluded as frozen) |
| 6.5-b Add BFT/Byzantine to docs/deprecated.md | - | OWNER | needs owner go-ahead per report; docs/deprecated.md and vocab FORBIDDEN lack it (grep Byzantine in deprecated.md = none); residual: docs/prototype-to-production.md:181, js/ark/value-registries-client.js:95 |
| 7.1 File evidence records first | - | FIXED | docs/evidence/registry.md:58-64 CAP-010..016 |
| 7.2 status.md, protocol/resolvers.md, glossary.md | - | FIXED | rows 3.11-* |
| 7.3 Manifests (resolver, deployment, chain, about, dao, deploy, bundledeployer, download) | - | FIXED | rows 2.x |
| 7.4 /resolvers with derived snapshot | - | FIXED | row 6.3 |
| 7.5 seo-data descriptions, aiSummary, article descriptions | - | FIXED | rows 2.14-* |
| 7.6 Article banners; resolver-math counts | - | FIXED | rows 2.13-l, 2.10-* |
| 7.7 Upstream: "committee" string in launch panel and Explore "Committee" label | - | OUT-OF-REPO | rows 2.16-a, 2.16-b; defxn-defi-rs/dense-wire and flux/explore. No W1-CONTENT hand-off report was written to docs/ |
| Q1 Status column name Capability -> Feature | - | OWNER | decision: rename? status.md:34 unchanged |
| Q2 Link to explorer/deployer before hosting is real | - | OWNER | decision: keep public links with the development-network note (current), or hide behind a flag. Current default recorded at RM PRODUCTS.NOTE |
| Q3 Signature and trust reconciliation | - | FIXED | owner decision recorded in plan.md ("Signature framing"); applied RM BOUNDARY, PR §7, glossary.md:41, troubleshooting.md |
| Q4 Agreement lifecycle (/lifecycle, how chapters) | - | OWNER | decision: keep with banner / retire to /learnings / keep and move off /how-deployment-works (recommended). Current: chapters stay under /how-deployment-works labelled "earlier agreement path" (DM SIMPLE.AGREEMENT.*); js/pages/lifecycle.js carries no retired/earlier-path note (grep = none), so /lifecycle still presents the retired path unbannered |
| Q5 Old directory entries (six apps) | - | FIXED | report option 1 taken: kept under an "Applications" tab labelled not-resolver-chains (resolvers.js views(), resolver-applications.js); owner may still choose to drop them |
| Q6 Where the seven-operator policy lives | - | OWNER | answer needed; dao.js POINT1 currently says "an earlier substrate policy in source" |
| Q7 governance-without-a-validator-set slug | - | OWNER | same item as 2.14-f; vocab exempts identifiers (vocab ~line 250) |
| Q8 Which resolver count is public | - | FIXED | both shown, labelled (stats-highlights.js:254; resolver-math.md; /resolvers hero meta). Note residual label in row 2.11-a |
| Q9 Token chains: state discrepancy now or wait | - | FIXED | plan.md default: not stated as live, described as planned; stats.js:518 does so. Flux Launch copy remains out-of-repo (2.15-n) |
| Q10 CMS blocks read live node or snapshot only | - | FIXED | snapshot only (snap, no live reads in resolvers.js) |
| 8.x UNVERIFIED: that /resolvers, /what-is-a-resolver and /how-deployment-works meet the fold rule (<= 1.6x viewport) after conversion | - | FIXED | converted to tabs/disclosures (resolvers.js, story template); measured fold height not checkable from code (tests/story-blocks.cjs, resolvers-blocks.cjs cover structure) **S0 sweep 2026-10-20:** fold-contrast-readings.tsv L11/L80 (`/resolvers` 1.41/1.38), L9/L78 (`/what-is-a-resolver` 1.39/1.25), L21/L90 (`/how-deployment-works` 1.10/1.33) |
| 8.y UNVERIFIED: owner-facing claim that explore.defxn.com / deploy.defxn.com are reachable | - | UNVERIFIED (needs browser) | status.md CAP-014 records neither answered HTTPS on 2026-10-19; not re-measured |
| 8.z UNVERIFIED: whether capabilities are now launched on the devnet (snapshot says 0 at 2026-10-18) | - | UNVERIFIED (needs browser) | snap observation.capabilitiesLaunched = 0; needs a node read; page says so honestly (RM REGISTRY.CAPS.EMPTY) |
| 8.w UNVERIFIED: whether the per-resolver "Open in Explore" deep links (EXPLORE + '/#' + chainId, resolvers.js) resolve to a dossier | - | UNVERIFIED (needs browser) | requires the explorer's routing; flux/explore not read |


## S0 sweep: new findings (W4-S0, 2026-10-20)
Counts: FIXED 4, PARTIAL 0, OPEN 3, OWNER 0, OUT-OF-REPO 0, UNVERIFIED 0

Source: `fold-contrast-readings.tsv` (L<n> = TSV line). Every row below is a violation the driver reports and `docs/ux-audit/fold-contrast-allowlist.tsv` (empty) does not excuse. Proposed fixes by file are in `docs/ux-audit/fold-contrast.md`.

| id / short title | severity | status | evidence |
|---|---|---|---|
| S0-1 fold: hidden `/reference` is 1.69x on a phone | P2 | FIXED | **W4-F1 2026-10-20:** fold-contrast-readings.tsv L94 (390: 1.30, was 1.69), L25 (1440: 1.09). Each section of a document folds behind Ark's disclosure on a phone (`foldBelow: 'phone'`; `js/pages/reference.js` foldSections, `js/pages/catalog.js` loads the blocks, `css/reference.css` phone rhythm); every layout key kept by pin, none reshaped or retired (`tests/reference-fold.cjs` against the census frozen first, `tests/fixtures/layout-keys/reference.tsv`). The other approved documents are long by nature (a whitepaper is 3 to 4x at 390 even folded, 40x open on desktop) and are not at-rest routes; not measured by the sweep |
| S0-2 kit app bar: six controls draw a boundary under 3:1 on every route | P1 | FIXED | **W4-F1 2026-10-20:** `control-contrast` has no violation on any of the 69 routes at either width (summary-pass rows, e.g. L284 `/` 1440, L356 `/` 390; lowest control 4.29:1 on `/`, was 1.44). One token, `--dx-edge` = the palette's `--border-control`, in the kit (`defxn-product-kit/src/product.css`: switch trigger, nav group, theme toggle, menu toggle, pill, `.dx-btn` default/soft/ghost, inputs, copy, tabs, file) and in `css/navigation.css` (network pill, MENU). Held to 3:1 on canvas and surface in all 10 site themes by `defxn-product-kit/test/kit.test.mjs`, and measured in a browser across the 10 themes (1440) and 5 (390) |
| S0-3 editor: "Connect project folder" notice button is 1.28:1 | P1 | OPEN | fold-contrast-readings.tsv L210-L214 (1440), L285-L289 (390): text `#cfcdcc` on fill `#05cbc7` in `div.notice-actions > button.btn.small`, in all three editor states. The first-run banner's primary action is unreadable |
| S0-4 page controls under 3:1 outside the app bar | P1 | FIXED | **W4-F1 2026-10-20:** no `control-contrast` violation on `/deposits` (L299, L371), `/account/domains` (L296, L368), `/account`, `/bundle-deployer` (L297), `/treasury` (L298), `/dao` (L316), `/explore` (L289, L361), `/experiments` (L287, L359), `/chain` (L314), the five lifecycle pages, `/download` (L317), `/deploy` (L318), `/palette` (L290, L362). Fixed in the variant, not the page: `css/components.css` (soft, quiet, choice take `--border-control`; selected choice `--reference-700`; segmented Ark tab strips; the account links no longer repainted by the link rule), the kit's `.dx-btn--soft`; fields in `css/economy-preview.css`, `css/account-domains.css`; ring on a selected `.study-tabs` / `.explore-panes` button, `.flow-toggle`; `css/download.css`, `css/page-layout.css` copy buttons. /palette specimens need no override: they are the variants. Found by the theme sweep and fixed with them: light-theme text on `.flow-record`, `.download-copy`, `.download-prompt`, Ark link-tone buttons, the selected choice edge |
| S0-5 font size: kit header/footer strip and handoff labels under 12px | P2 | FIXED | **W4-F1 2026-10-20:** `font-size` has no violation on any route at either width (summary-pass rows, e.g. L428 `/` 1440, L500 `/` 390; smallest text on every route is 12.00px). Kit labels raised to 12px at the source (`defxn-product-kit/src/product.css`: brand sub-label, lane and product labels, `dx-onward` lane and where, footer strip, pills, badges, copy, eyebrow, field labels, refusal and frame labels; the SVG diagram label is a drawing and keeps its size; held by `kit.test.mjs` "no kit label is set under 12px"), `css/navigation.css` (account status, back home), `css/settings.css` (credit, copyright), `css/home-drafting.css` (question links) |
| S0-6 editor chrome: header and strip controls under 3:1 | P1 | OPEN | Edit words/Edit style switch 1.10 (L797), page switcher 1.32 (L796), canvas size and Edit/Preview switches 1.14 (L799, L800), rail button 1.29 at 390 (L1183), More 1.67 (L810), New 2.34 (L798), sign out/connect 2.25 (L812, L813), Canvas view 1.89 (L811); 45 of 53 editor controls are borderless (identified by text only) |
| S0-7 editor chrome: labels under 12px | P2 | OPEN | rail tab labels 10.5px (L1759-L1763), group labels 10px (L1764-L1765), page-row sub-labels 11px (L1766), size note 11px (L1767-L1768), status bar 11px (L1769-L1770), More menu group heads 10px (L1785) |

---

# Next work

Ordered by user impact. **No P0 finding is OPEN** in any report: every P0 is FIXED, except two that still have a residual (cms P0-1, whose "new article shows on the canvas before Save" check was failing in the browser drivers and is UNVERIFIED now; and the three UNVERIFIED P0 jargon walls /resolvers, /stats, /stats/ledger, which are PARTIAL on glossary wiring).

Slices below are owned by files, so agents can run in parallel without editing the same file. Where two slices need one file it is stated and one of them goes second. All Wave 4 browser checks stay UNVERIFIED until the full browser run in progress has finished; nothing here was decided by running anything.

## Step 0 (read-only, do first or alongside): measure what the code cannot decide
- **S0 Fold and contrast sweep. DONE 2026-10-20 (W4-S0).** `tests/browser/fold-contrast-sweep.mjs` measures every catalog route at 1440x900 and 390x844 plus the CMS editor; readings in `docs/ux-audit/fold-contrast-readings.tsv`, summary and fix slices in `docs/ux-audit/fold-contrast.md`. 42 UNVERIFIED rows decided; the 7 new OPEN items (S0-1..S0-7) are in the section above. Rerun after each wave; the run fails until the findings are fixed or allowlisted with a reason.

## Tier 1: P0/P1 OPEN or PARTIAL, by user impact
- **S1 CMS editor residuals (js/admin, admin-app.html, css/admin.css, css/studio-embed.css).** Own all of these files; nothing else edits them.
  - P0-1 residual: canvas EmptyState / confirm the new article reaches the canvas before Save (`js/admin/bridge.js`, `js/pages/article.js` is S6's file: coordinate, probe only). Needs the current browser run (`cms-journeys`, `full-audit`).
  - P1-11 Media: "Replace image" and "Alt text" on a selected image; styled file input / dropzone (`js/admin/assets.js`, `js/admin/toolbar.js`, `js/admin/toolbar-sections.js`; selection info lives in `js/main.js`, see S8).
  - P1-13 phone: bottom action bar, bottom-sheet popovers, Page settings tab strip scroll (`css/admin.css`, `css/studio-embed.css`, `js/admin/toolbar.js`).
  - P1-14 Page fields grouped accordion + "Show on page" (`js/admin/editor.js`); P1-15 Versions "Current" marker and Restore wording (`js/admin/versions-panel.js`, `versions-glue.js`).
  - P1-16 feedback channels (header `#status`, footer, rail dots), P1-5 create/delete/theme/restore not undoable (`js/admin/history.js`), P1-8 hide inapplicable commands (`js/admin/toolbar.js`), P1-2 Mesh sheet wording (`js/admin/mesh.js`).
  - P2: gate wording (`admin.html`, `js/admin/gate.js`), native `confirm()` -> Ark AlertDialog (`editor.js`, `articles.js`, `assets.js`, `secrets.js`, `versions-glue.js`, `mesh.js`), skip link, row-indicator legend, rail tabs and `#viewSwitch` on Ark (`js/admin/rail.js`, `ark-host.js`), `h()` defined twice (`gate.js`, `core.js`).
- **S2 /account conversion (P1, all OPEN; file unchanged since 5a1ac71).** Files: `js/pages/account.js`, `js/pages/account-domains.js`, `css/account.css`, `css/account-domains.css`, `tests/account-session.cjs`, `tests/account-keys-dom.mjs`. Per plan.md, browser coverage of sign-in, wallet and keys comes first. Depends on the Ark `field`/`form` block (S11).
- **S3 /explore (P1).** Files: `js/pages/explorer.js` (the "1 MINERS" plural at `:589`, `COUNT_WORDS :67`, hand-built tablist `:79`), `css/explore-story.css` (`:60` border, `:72` 9.5px captions), `css/how-overview.css:123` (8px mesh labels), `css/explorer.css`, `css/explorer-observatory.css`. Glossary wiring in `explorer.js:170` goes with this slice.
- **S4 stats family, resolver-math, resolvers (P0 jargon, P1 type, vocabulary).** Files: `js/pages/stats.js`, `stats-ledger.js`, `stats-gpu.js`, `resolver-math.js`, `resolvers.js`, `css/resolver-math.css`, `js/content/manifests/spec.js`, `js/content/manifests/resolver.js`, `tests/no-deprecated-vocabulary.cjs`.
  - Residual banned word "finalized" at `js/pages/stats.js:84`, `js/pages/stats-ledger.js:99`, `js/content/manifests/spec.js:144`; the vocabulary test matches only "finality", so add `finalized` (owner-approved per resolvers-content §6.5).
  - "Resolver registry" tab/term at `stats.js:535,643,690`.
  - `terms: 'first-use'` is not passed by `/resolver-math`, `/stats`, `/stats/ledger`; only a few hand marks.
  - `resolver-math.css` has ~14 font sizes and 7.5/9 px drawing text; two `--font-sans` definitions (`css/themes.css:99`, `assets/kit/defxn-fonts.css:50`; the second file belongs to S9).
  - Hand-typed family list in `resolver-math.js`; no control-key / announcing-provider column on `/resolvers` (`scripts/snapshot-registry.mjs`).
- **S5 glossary content (runs BEFORE the page wiring in S3, S4, S6, S7).** Files: `docs/glossary.md`, `scripts/build-glossary.cjs`, `js/content/glossary.js` (generated), `scripts/ark-blocks-adapter.js` (first-use marks only `text` props, so hero titles are never glossed). Add mesh, resolution, FXN, bundle, tier, ops/s, DAO, quorum, roster, substrate, Auth Kit, Ghost ID, miner presence. Blocked by the OWNER glossary-size call (below).
- **S6 home, about, chain, learnings, how chapters (P1).** Files: `js/pages/home.js`, `about.js`, `chain.js`, `home-flow.js`, `css/home-flow.css`, `css/home-swiss.css`, `learnings.js`, `js/pages/how-stories.js`, `js/content/manifests/deployment.js` (`:619,:643` raw `inputCid` etc. shown as the primary label), `js/content/seo-data.js:681` (still quotes 25,232 ops/s; correct by appending, never rewrite history), `js/pages/article.js`. Items: per-box grammar tooltips on /chain, `home-cycle-step` / `flow-record` still hand-built on `--border-default` (`css/home-flow.css:94`), isometric 8-9 px labels, Learnings corner-button key `NAV.BACK.TUTORIA...`.
- **S7 palette and reference reader (P1/P2).** Files: `js/pages/palette.js` (`ROLES`/`NEUTRALS` omit `--overlay --drift --trust --live --role --badge --hidden`, no type or contrast tab), `css/palette.css`, `js/pages/reference.js` (never converted; heading levels, raw path kicker, no TOC), `css/reference.css`, `tests/reference-reader.cjs`.
- **S8 experiments / lab (P1).** Files: `js/pages/lab.js`, `js/studio.js` (`:55-56` still reads and writes the model state at `/experiments/lab`, so the canonical `/experiments?model=..&value=..` link is not restored), `js/scene.flux.js:70`, `css/studio.css:39-40`, `css/focus.css:14-16`. Drag instruction, "FX-001" code, phone tab strip. `js/main.js` selection plumbing for S1's image action is a separate, later edit.

## Tier 2: P2 and polish
- **S9 css-wide / brand (run after S2-S8 land; they all edit `css/*.css`).** Files: `css/components.css` (30 `!important`, solid/soft/quiet lists `:24-60`), `css/navigation.css`, `css/home-swiss.css`, `css/home-drafting.css`, `css/resolver-lab.css`, `css/experience.css`, `css/explorer-observatory.css`, `css/stats-dashboard.css` (dead), `assets/kit/defxn-fonts.css`; flatten glass/blur/shadows; a type-scale gate (40 distinct px sizes; wire the kit's `check:design` into `scripts/run-tests.mjs`); scope default-on animated backgrounds to the home (`js/content/settings-defaults-data.js`, `js/ark/vendor/backgrounds.js`, `css/hero-motion.css`); ratchet `docs/ux-audit/component-census-baseline.tsv` down.
- **S10 storage-key / palette-id migration (brand §1.1/§5 D3).** Files: `js/bootstrap.js`, `js/content/theme.js`, `js/content/theme-data.js` (map on read only), `js/content/settings-defaults-data.js`, `scripts/build-flux-themes.cjs`, `tests/theme-content.cjs`, `tests/browser/theme-owner.mjs`. Needs the SDK to emit namespaced selectors first. Also: put the CMS app bar on the kit bar (`admin-app.html`, `css/admin.css`, `js/admin/header.js`: conflicts with S1, so S1 goes first).
- **S12 header / mega menu on Ark (components W4a).** Files: `js/resolvers/header.js`, `css/navigation.css`, `assets/kit/defxn-components.css`, `tests/header-*.cjs`, `tests/browser/header-reach.mjs`, `tests/browser/public-header.mjs`. Blocked on the public kit accepting `createArkPopover` (`scripts/ark-kit-entry.js`, `scripts/ark-kit-public-refused.js`).
- **S13 resolver content in repo.** Files: `js/pages/resolver-guide.js`, `js/pages/deployment.js`, `js/pages/dao.js` (the five diagrams specified but not rendered), `js/resolvers/blocks/` (typed resolver-card and capability-card CMS blocks; also `js/content/components.js`, `js/admin/library.js`: coordinate with S1), `js/content/manifests/chain.js`, `dao.js`, `bundledeployer.js` (missing inbound links), `js/content/articles/the-grammar-does-almost-no-work.js`, `docs/quickstart.md`.
- **S14 small page items.** `/deploy`, `/download` (two Copy components, `js/pages/deploy.js`, `download.js`, `css/download.css`, `css/page-layout.css`); story-sheet CTA casing (`js/pages/sheet.js:496` vs uppercase manifests); `/deposits` native select (`js/pages/economy-preview.js`); `/treasury` "Tier 1" explanation (same file); `/account/domains` empty state (belongs to S2); `/what-is-a-resolver` pager link (`js/pages/resolver-lab.js`); missing next-step links (`explorer.js`, `how-stories.js`, `lifecycle.js`, `sheet.js`, manifests `dao.js`, `deployment.js`, `js/content/resolutions.js`); CMS Pages-tree orphan tag (`js/admin/rail.js`, S1's file); wrong test pointer in the `js/pages/stats-ledger.js` header comment (cites `tests/stats-ledger-blocks.cjs`, real test is `stats-ledger-page.cjs`; S4's file).
- **S15 build plumbing.** Per-route CSS (all 44 sheets load on every route: `index.html`, `js/ark/page-loader.js`, `js/pages/catalog.js`); move `resolveLinkField` out of `js/ark/dash-kit.js` (`scripts/ark-blocks-adapter.js`, rebuild `js/ark/blocks.js` with `npm run build:ark`); `js/ark/icons.js` -> generated from the Ark pack; server-vs-browser render parity test (new `tests/browser/ssr-parity.mjs`).

## Ark-side / outside this repo's files
- **S11 Ark UI and SDK (design/ark-ui, design/deadark-sdk).** Missing blocks: `field`/`form`, `code`, `empty`, `divider`, `text`; StatusChip; components-pack parts (G1, G3, G8, G12); drafting promotion (G13: `js/ark/story-diagrams.js`); icon glyphs; typography preset (Albert Sans / Plex Mono) and type scale. Several defxn slices (S2, S7, S14) wait on these.
- **Flux Launch (flux/flux-launchpad, branch `wave3-launchpad-v2`, owner-gated).** False money-surface claims: "slashed to holders on a rug attempt", "forfeits a quarter", "Fee: none on the curve", optional Unbacked launch; also the kit adoption and handoff. Files: `index.html`, `create.html`, `js/app.mjs`, `js/refusals.mjs`, `js/create.mjs`, `js/token-meta.mjs`, `css/shell.css`, `vendor/defxn-ark/*`.
- **defxn-defi-rs / dense-wire:** "committee" in the vendored signing dialog (`dense-wire/web/flx-resolver-launch-panel.mjs`, then re-vendor into deploy, dao, treasury, flux-launchpad); `docs/resolver-audit.md` "is not registered" wording is generated by `dense-wire/src/bin/resolver-audit`.
- **flux/explore:** "Committee" label and "not active" wording (`js/explore-app.js`, README).
- **defxn-product-kit:** sliding indicator, count badge, `boot.js`, half-pixel sizes, popover/menu/tabs on ark-elements.
- **Products:** handoff missing in ark-explorer, genesis, books-site, collections-site, market-site, pva-site, flux-db-studio; remove signing-dialog copies; mesh-registry `app.css:47`; bundle-deploy/site adopt the kit.

## OWNER decisions pending
- Glossary size: glossary routes are 31.0 KB gz and /stats 32.4 against the 30 KB budget (shorter/fewer definitions, or a per-route glossary). Blocks S5.
- Resolver copy: Q1 (rename the status column, `docs/status.md:34`), Q2 (public links to Explore and Deploy), Q4 (`/lifecycle` retired-path note), Q6, Q7; adding BFT/Byzantine to `docs/deprecated.md` and the vocabulary FORBIDDEN list.
- Home: plain-sentence headline copy (`js/content/manifests/home.js:15-31`); keep or drop the "Production" network pill at phone widths (`css/navigation.css:52`).
- Whether lifecycle and palette copy stay in-module until the FLX manifest store exists; whether content keeps scrolling inside `section#scene-page-*`; whether the lab's stepper becomes the shared Stepper.
- "A finance resolver by construction" ends with an unrelated "starting values" table; derived read times are much shorter than the typed ones (plan.md resume point 4).

## W5-GLOSS (2026-10-20): per-route glossary
- R2b (glossary vs the +30 KB budget): FIXED for every block+terms route -- the glossary is per route (`js/content/glossary/<route>.js`, 58 files, derived by rendering each route, drift-checked by `node scripts/build-glossary.cjs --check --routes`); numbers and the routes still over for their chunks (`/stats`, `/explore`, `/account`) in `docs/cms-architecture.md` Budget. The named exceptions are removed there.
- CP-5 / X6 / RS-5 / RD-4 / TR-3 / story-sheet terms: 14 terms added (mesh, resolution, FXN, FXN chain, bundle, tier, ops/s, DAO, roster, threshold, substrate, Auth Kit, Ghost ID, miner presence). "Quorum" is deliberately NOT defined (retired vocabulary, docs/deprecated.md); threshold and roster say the current thing.
- ST-2, LG-2, RV-2, RM-3: `terms: 'first-use'` on /stats, /stats/ledger, /resolvers, /resolver-math, /explore, /account; /resolvers' hand `gloss()` and the hand `[[...]]` marks are gone. Hero titles stay unglossed (WR-4 unchanged).

## Recheck 2026-10-21 (main 8e40c2c)
The rows above are as of Wave 4 and are not rewritten. A read-only recheck of every OPEN, PARTIAL and UNVERIFIED row
against main 8e40c2c is in `docs/ux-audit/ledger-recheck-2026-10-21.md`: 116 now FIXED, 172 STILL OPEN, 37 OWNER,
34 NEEDS-BROWSER, each with a HEAD citation, and a "Top fixes" list per part. Work after that point is ordered from it.
