# Fold and contrast sweep (W4-S0, 2026-10-20)

Driver: `tests/browser/fold-contrast-sweep.mjs`. Evidence: `docs/ux-audit/fold-contrast-readings.tsv` (2,036 readings; regenerate only by running the driver). Allowlist: `docs/ux-audit/fold-contrast-allowlist.tsv` (empty). Ledger: `docs/ux-audit/ledger.md` (42 rows decided; new section "S0 sweep: new findings").

Run one at a time (the machine has 8 GB): `node tests/browser/fold-contrast-sweep.mjs`. It takes about 10 minutes under load. `FOLD_SWEEP_ONLY=stats,zero` limits it to some catalog ids and writes no TSV unless `FOLD_SWEEP_TSV=<file>` is set; `FOLD_SWEEP_EDITOR=0` skips the editor.

Measured 2026-10-20 on the working tree over 45d6b1a, Chromium via Playwright, 1440x900 and 390x844, load factor 1.0, copy of the site served by the harness's local-development host. Every one of the 69 catalog routes loaded at both widths; the editor loaded at both widths in three states.

## What it measures (and what it does not)

| Check | Rule | How |
|---|---|---|
| fold | page height / viewport height <= 1.6 | scroll height of the mounted `[data-ark-page]` element (pages scroll inside their scene) or of the document, whichever is larger, over `innerHeight`. Same definition as `fold-disclosures.mjs` |
| text-contrast | WCAG 1.4.3: 4.5:1, or 3:1 for text >= 24px (>= 18.66px bold) | every visible text node, foreground composited over the first opaque background found walking up the ancestors; a gradient counts as each of its colour stops (worst wins); element opacity multiplies the text alpha |
| control-contrast | WCAG 1.4.11: 3:1 | button, input, select, textarea, summary, tab, switch, checkbox/radio roles, links styled `btn`; the best of border, 1px+ ring shadow or fill against the background beside the control must reach 3:1. A text field with no boundary at all is a violation; a button with none is "borderless" (text identifies it, and the text check holds it) and is counted, not failed |
| font-size | >= 12px rendered | computed size times the scale of every transformed ancestor; SVG drawings and `aria-hidden` subtrees are exempt |

Exclusions, all counted in the summary rows rather than dropped silently: `aria-hidden` text, disabled and inert controls, anything `display:none`, `visibility:hidden`, fully transparent, or clipped away by an `overflow:hidden` ancestor, native checkbox/radio/range/file/color inputs, and text over a `url()` image (reported "not measurable", never as a pass; none occurred). Known approximations: an ancestor's `opacity` is applied to the text alpha, not to the backgrounds inside that group; blend modes, filters, `backdrop-filter` glass and pseudo-element overlays are ignored; `<canvas>` backdrops behind the page are ignored (the page's own opaque background is used, as WCAG tools do).

**Limitation that matters:** all four checks are "at rest": the default tab, the default step, accordions closed, menus closed. Content a reader opens on purpose is not measured (the owner's rule allows it to exceed the fold), so a route's other tabs can still be tall, small or low-contrast; this sweep cannot say. The same applies to the Flux Launch fold rows and to the app bar with the switcher open (ledger `§9 risk`, still UNVERIFIED). Tap-target size, radii counts and distinct-font-size counts are not measured by this driver.

**The instrument is proven before it measures:** a self-test page with known answers (4.48 vs 4.54 grey on white, alpha text, text on a gradient, a dimmed paragraph, an 11px paragraph, a half-scaled 20px paragraph, SVG and aria-hidden exemptions, faint/strong/ring/fill/bare buttons, a boundary-less field, hidden and clipped text) must produce exactly the expected violations or the run stops with exit 2.

## Counts

Rows are per selector per route-viewport (a selector repeated on 69 routes is 69 rows); "x selectors" is the distinct count.

| Check | Violation rows | Route-viewports with one | Distinct selectors | Allowlisted |
|---|---:|---:|---:|---:|
| fold (route-viewports over 1.6) | 1 | 1 of 138 | 1 | 0 |
| text-contrast | 6 | 6 (editor only) | 1 | 0 |
| control-contrast | 764 | 144 | 40 | 0 |
| font-size | 696 | 144 | 28 | 0 |
| not loaded | 0 | | | |
| not measured | 0 | | | |
| **Total violations** | **1,467** | | | **0** |

The driver therefore **fails** (exit 1) today, as intended: the allowlist starts empty and nothing has been excused. It will pass when the items below are fixed or each is allowlisted with a reason.

Largest at-rest folds (limit 1.6): `/reference` 390 **1.69**, `/palette` 390 1.59, `/learnings` 1440 1.49, `/stats/gpu` 390 1.48, `/deploy` 1440 1.48, `/bundle-deployer` 1440 1.47. Every other route is <= 1.47. The 11 routes the audit named (was 1.8 to 20.6) are now 1.00 to 1.59: `/stats` 1.20/1.17, `/stats/ledger` 1.00/1.16, `/resolver-math` 1.41/1.00, `/resolvers` 1.41/1.38, `/palette` 1.03/1.59, `/` 1.39/1.23, `/about` 1.38/1.41, `/stats/gpu` 1.19/1.48, `/learnings` 1.49/1.34, `/how-deployment-works` 1.10/1.33, `/bundle-deployer` 1.47/1.40 (1440/390).

Text contrast: no catalog route has any text under its threshold. Lowest on any route is 5.00:1 (`/`, TSV L140, L215); 5,313 text runs measured on routes. The only text violation is in the editor (below).

## The worst offenders

1. **Kit app bar, every route (S0-2).** Six controls draw a boundary under 3:1: the Resolutions trigger fill 1.44 (`button#products-trigger`), Account link 1.69, and the Products trigger, Network pill, all-pages toggle and Run DEFXN link at 2.13 (border `#4a4644` on `#0a0908`, `#3b3735` for the account link).
2. **Editor "Connect project folder" button, 1.28:1 text (S0-3).** `#cfcdcc` on `#05cbc7` in the first-run notice, present in every editor state. The one text-contrast failure in the whole sweep.
3. **Editor header and strip, 1.10 to 1.67 (S0-6).** The Edit words / Edit style switch (1.10), page switcher (1.32), Edit/Preview and device switches (1.14), rail button (1.29 on phone), More (1.67).
4. **Fields with a faint boundary (S0-4).** `/deposits` amount and select 1.90, `/account/domains` name input 1.69.
5. **Kit footer strip and app-bar sub-labels, 10 to 11px on every route (S0-5).** 696 rows but 28 selectors, most of them the same footer strip on 69 routes. No page-body text is under 12px at rest.

## Proposed fixes, grouped by file (not applied: other agents own these files)

Each is a slice for the owner of the file named. Fix tokens first so one change repairs many selectors (centralize, don't duplicate).

### Slice F1: kit chrome (`assets/kit/defxn-components.css`, `assets/kit/defxn-product.js`, `css/navigation.css`) , S0-2 and S0-5
The app bar, switcher, footer strip and handoff card are the kit's, shared by every route; 6 of the 28 font selectors and 6 of the 40 control selectors repair all 69 routes.
- `.dx-btn`, `.dx-switch__trigger`, `#header-chain-trigger`, `.nav-toggle`, `.header-account-link`, `.header-run-link`, `#products-trigger`: raise the border colour to a token that is >= 3:1 on `--canvas` (today `#4a4644` is 2.13; roughly `#7a7471` reaches 3:1 on `#0a0908`). The Resolutions trigger is a fill (`#1d1c1c` on `#3b3735`, 1.44): give it a border at the same token, or a fill that differs by 3:1. Take the value from the SDK semantic tokens (`--border`/`--text-muted` family), not a new literal; check it against all five themes (the app bar follows `data-theme`).
- `.dx-bar__brand-sub`, `.header-account-status`, `.dx-foot__name`, `.site-footer-link`, `.site-credit`, `.site-copyright`, `.hero-motion-toggle` (the footer "back home" button), `.dx-onward__lane`, `.dx-onward__where`: raise 10 and 11px to 12px. `css/navigation.css` and `css/settings.css` set the footer-strip sizes; the footer strip is 148px of chrome so check the fold stays inside 1.6 (every route has >= 0.1 headroom except `/palette` and `/reference` at 390).
- `.dx-btn--soft` (handoff "Open <Product>" buttons on `/bundle-deployer`, `/treasury`, `/account/domains`, `/dao`, 1.82): give the soft variant a 3:1 border or fill.

### Slice F2: CMS editor (`css/admin.css`, `css/studio-embed.css`, `js/admin/notice.js`, `js/admin/rail.js`, `admin-app.html`), S0-3, S0-6, S0-7
- `.notice-actions .btn.small` (js/admin/notice.js, css/admin.css): the primary action in the banner paints `#cfcdcc` on `#05cbc7`; use the button's inverse text token on the teal fill (or the strong text token on a darker fill) and re-run; the same teal fill is probably used by other primary buttons, check them (none other failed here).
- Header `#lensContentBtn`/`#lensDesignBtn` (1.10), `#btnPage` (1.32), `#devices button`, `#mode button` (1.14), `#btnLeftRail` (1.29 phone), `#accountBtn` (1.67), `#btnNewItem` (2.34), `#viewCanvasBtn` (1.89), `#connect`/`#signOut` (2.25): give the segmented switches and header buttons a 3:1 border (one token in `css/admin.css`, also used by `studio-embed.css`), or a fill that reaches 3:1. Segmented controls need the boundary on the group and the selected state a >= 3:1 fill.
- Labels under 12px in `css/admin.css`/`css/studio-embed.css`: rail tab labels `#tabPages > span` etc. (10.5px), `.side-group` span/small (10px), `.tree-open .sub` (11px), `#devName`/`#devScale` (11px), `#studioStatus` (11px), `#accountMenu .menu-head` (10px). Raise to 12px; at 390 the rail tab strip is 5 labels wide, so check the tab strip still fits (cms.md P1-13 already notes it scrolls sideways).

### Slice F3: page controls (by file)
- `css/economy-preview.css` (`.economy-deposit-form` input and select, 1.90) and the `/account/domains` name input `#domainsNameInput` (1.69; set in `css/account-domains.css` or the Ark `field` block, S11): field border to the 3:1 token. Both are inputs with no other boundary, so they are the most visible instance of the rule.
- `css/explorer.css` / `css/explore-story.css` (`/explore` tabs 1.76 `button#ark-r-tab--2/4/6`, phone `.explore-panes` switch 1.14): selected/unselected tab boundary.
- `css/studio.css`, `css/focus.css` (`/experiments` `.study-tabs` buttons 1.41), `css/home-flow.css` (`.flow-toggle` on `/chain`, 1.15), `css/lifecycle.css` (`.stage-scene-choices` buttons on the five lifecycle pages, 1.76), `css/download.css` (`.download-copy` 1.92), `css/page-layout.css` (`.deploy-copy` 1.77), `/account` secondary link in `css/account.css` (2.07).
- `css/palette.css` demo buttons (`palette-soft`, `palette-quiet`, choices): these are specimens of the variants. Decide whether the specimens must pass 3:1 (then the variants themselves fail the rule, which is a finding for `.dx-btn--soft`/`quiet` in F1) or are documented specimens (allowlist with that reason).

### Slice F4: `/reference` fold (`js/pages/reference.js`, `css/reference.css`), S0-1
Hidden route, 390 only (1.69; 1428px of content). The reader was never converted to blocks (ledger S7). Folding its sections into the story template's tabs/disclosure on phone brings it under 1.6. Re-run for `/palette` (1.59 at 390) when touching shared block CSS: it has 0.01 of headroom.

## Rows left UNVERIFIED (36), and why

Not decidable by these four readings: tap-target sizes (M5, CP-10e), radii and distinct-font-size counts (M7, ST-6), empty bands and screenshots (LC-4, RD-5, RV-4, SR-4, SR-5, TR-6, Story sheets, `/download` terminal), hover/affordance rows, CMS popover behaviour (P2-8, "what already works" phone scroll), landmarks and canvases (CP-10b, CP-11b), link visibility (88 rows), other repos and live state (Launch fold, 8.y/8.z/8.w, 5.g), and the app bar with the switcher open (§9). A follow-up driver (tap targets, per-tab folds, app bar open, horizontal scroll) would decide most of them.

## After W4-F1 (2026-10-20): slices F1, F3 and F4 applied

Re-run of the whole driver on the working tree (default theme `ghost`, 1440x900 and 390x844, editor in three states): fold 0 violations (was 1), text-contrast 0 (was 6), control-contrast 0 (was 764), font-size 0 (was 696); not loaded 0, not measured 0; the driver passes. The editor rows (S0-3, S0-6, S0-7) were fixed by the CMS slice (F2) in the same tree.
What changed, by cause rather than by selector: one control-edge token (`--dx-edge`, the palette's `--border-control`) in the kit and the site's variants (`css/components.css` soft/quiet/choice); the kit's labels at a 12px floor; `/reference` sections folded behind Ark's disclosure on a phone (1.69 to 1.30).
The sweep measures the default theme only, so the other nine themes the site offers were measured separately with the same `measureDocument` (dark: ghost, clay, ochre, marine, dusk; light: glacier, grove, moss, bone, dawn): 12 routes at 1440 and 6 at 390 (5 themes). That found and fixed five light-theme findings the default theme hides: `.flow-record` upcoming steps (text-faint, 3.8:1), `.download-copy` and `.download-prompt` (primary, 4.2:1), Ark's link-tone button (primary, 4.2:1), the selected choice edge (2.5:1), `.flow-node[data-new]` words (3.0 to 3.75:1), and `.flow-toggle`'s ring (2.9:1). `/experiments` was not reachable by that script's route id; it is in the default-theme sweep. A theme dimension in the driver would keep this from needing a side script.

