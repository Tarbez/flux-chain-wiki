# CMS architecture (the merged editor)

How the DEFXN content editor is built, as of 2026-10-18. Every statement here names the file
that decides it; when this page and the code disagree, the code wins and this page is the
defect. The editor, once one ~4,600-line `js/admin/admin.js`, is now 27 files under
`js/admin/`, one per concern ([modules](#modules)).

## One app, two modes

`admin.html` is the locked page: it holds the identity's key and runs the sign-in
(`js/admin/gate.js`). Once signed in (or on loopback in local development), it shows the
editor, `admin-app.html`, in a same-origin frame `#app`. The editor reaches the identity
through `window.parent.ArkGate` and exchanges no messages with `admin.html`; opened on its own,
`js/admin/core.js` sends the browser back to `admin.html` and starts nothing.

Inside `admin-app.html` there is one header (`#appBar`) and two modes:

- **Content** (`#modeContentBtn`, shell `#cmsShell`): the sidebar list of pages, articles,
  images, encrypted items and page shapes, each edited as a form, with a preview of the
  real page in `#frame`. Owned by `js/admin/nav.js` (mode switch, item list), `editor.js`,
  `articles.js`, `assets.js`, `secrets.js`, `shapes.js`, `preview.js`.
- **Design** (`#modeDesignBtn`, root `#studioRoot`) with four views in one segmented control:
  - **Canvas** (`#designCanvasBtn`, `#designView`): the real site in `#cmsPreview`, selected
    and edited in place.
  - **Sitemap** (`#designMapBtn`, `#mapView`): every route as a card (`js/admin/sitemap.js`).
  - **Background** (`#designBackgroundBtn`): a popover for the page transition
    (`ArkCanvasTransitions`).
  - **Theme & defaults** (`#designThemeBtn`): colour theme, background, settings-gear
    defaults and the site-wide SEO section `#siteSeo` (`js/admin/design.js`, `seo.js`).

Canvas-only header controls (page picker `#btnPage`, page SEO `#btnPageSeo`, breakpoints
`#devices`, undo/redo, Design check `#btnCheck`, Edit/Live `#mode`) show only in Design ->
Canvas (`js/admin/header.js`). There is one `#save` for every mode, plus `#publish`,
`#versionsNav`, `#meshNav`, and `#accountMenu` behind `#accountBtn` (folder connect, who is
signed in, sign out; `js/admin/project.js`).

Studio used to be a second document (`admin-studio.html`) in an iframe with its own save
path; it was merged in and deleted, and the publish host no longer serves it (README,
"Studio").

## The one real iframe boundary: the canvas preview protocol

The canvas preview `#cmsPreview` loads `index.html?cms-preview=1#<route>` -- the production
renderer (`js/main.js`, page modules, CSS, components) -- so the canvas is the site, not an
approximation. It is the only two-way message boundary in the editor. Both directions check
`event.origin === location.origin` and the source window: the editor accepts only
`event.source === cmsPreview.contentWindow` (`js/admin/bridge.js`), the preview only
`event.source === window.parent` with the preview query present (`js/main.js`).

**Editor -> preview** (sent from `js/admin/bridge.js` unless noted; handled in `js/main.js`):

| type | carries | what the preview does |
|---|---|---|
| `defxn-cms-preview-state` | `site`: every draft (`siteFromState()`, or the version being previewed) | defines every content module from the drafts, remounts the route, annotates it, replies `ready` |
| `defxn-cms-preview-mode` | `mode`: `edit` / `live` | Edit: clicks select. Live: clicks behave as for a visitor |
| `defxn-cms-preview-site-defaults` | `settingsDefaults` (`js/admin/design.js`, also sent to `#frame`) | applies the settings-gear defaults without a remount |
| `defxn-cms-preview-layout-command` / `-layout-reset` / `-layout-undo` / `-layout-redo` / `-layout-operation` | frame values for a key; breakpoint; an operation (align, distribute, group) | edits the layout draft and replies `layout-change` / `layout-replace` / `layout-history` |
| `defxn-cms-preview-select-group` | `id` (a group) or `key` (any element) | selects it (Layers rows, Design check "Show") |
| `defxn-cms-preview-set-label` / `-set-alt` | `route`, `key`, `label` / `alt` | stores a layer name / an image's alt text |
| `defxn-cms-preview-remove-selection`, `-close-menu` | -- | removes an inserted block (real page content is refused with a `notice`); closes the right-click menu |
| `defxn-cms-preview-components-command` / `-states-command` | the command and its arguments | edits the components / states draft, replies `*-replace` |
| `defxn-cms-preview-canvas-transitions-command` / `-preview` | `patch` | edits / plays the page transition |
| `defxn-cms-preview-element-motion-command` / `-preview` | `patch` / `key` | edits / plays an element's in/out animation |
| `defxn-cms-preview-make-component` | -- (`js/admin/toolbar.js`) | captures the selection as a component |
| `defxn-cms-preview-highlight-point` | `id` (`js/admin/library.js`) | outlines an insertion point |

**Preview -> editor** (posted by `js/main.js`; handled in `js/admin/bridge.js`'s one listener):

| type | carries | what the editor does |
|---|---|---|
| `defxn-cms-preview-ready` | `path`, `groups`, `points`, `showing`, `tree`, and the selection after the remount | marks the preview ready (the Design check waits for it), adopts the selection, repaints |
| `defxn-cms-preview-error` | `message` | toast |
| `defxn-cms-preview-select` | `keys`, `selection(s)`, `groups`, `points`, `tree` | the selection the toolbar edits |
| `defxn-cms-preview-layout-change` / `-layout-replace` / `-layout-history` | a patch or the whole layout; undo/redo availability | applies it to the editor's layout draft |
| `defxn-cms-preview-components-replace` / `-states-replace` / `-states-showing` | the whole draft; which state each group shows | adopts the draft |
| `defxn-cms-preview-canvas-transitions-replace` / `-element-motion-replace` | the whole draft | adopts the draft |
| `defxn-cms-preview-notice` | `message` | toast (a refusal that says what it needs) |
| `defxn-cms-preview-context-menu` | `open` | hides the toolbar while the preview's menu is open |
| `defxn-cms-preview-enter-canvas-mode` | -- | opens the Background popover |
| `defxn-cms-preview-save` | -- | Ctrl/Cmd+S pressed with focus in the canvas: `saveEverything()` |

Which route the preview shows is `syncCmsPreview()` in `bridge.js`: a route change re-points
the iframe's `src`, and the iframe's `load` handler sends `state` and `mode` again.

Content mode's `#frame` (`index.html?preview=<time>#<route>`, `js/admin/preview.js`) is a
one-way feed, not a second protocol: the editor sends `flux-chain-preview-assets` and
`flux-chain-preview-mesh` (handled in `js/zero-webgl.js`), `flux-chain-preview-theme` and
`defxn-cms-preview-state` (handled in `js/main.js`). Whatever `#frame` posts back is ignored:
`bridge.js` only listens to `#cmsPreview`.

## The draft list

`ArkAdminStore.drafts()` in `js/admin/store.js` is the one list of what the editor saves,
in save order: 4 per-item drafts (`manifests`, `articles`, `assets`, `secrets`: one file per
id under `js/content/<dir>/` plus an index) and 9 single-object drafts (`meshSettings`,
`theme`, `settingsDefaults`, `seo`, `layout`, `components`, `states`, `canvasTransitions`,
`elementMotion`: one `js/content/<file>-data.js` each). Each entry names its content module
(`global`), its label, and -- for single drafts that key anything by page or route --
`byItem` / `byRoute`. It exists because Save once wrote 13 drafts while the publish archive,
built from its own list, carried 8.

Every consumer derives from it; none keeps a list of its own:

- **Save** -- `saveEverything()` in `js/admin/save.js`: every dirty draft, each attempted and
  reported on its own, then `sitemap.xml` / `robots.txt` / `llms.txt`, then a version record.
  It ends with one summary in `#status` ("Saved N items ...", "Nothing to save ...",
  "N failed: ..."). `anyDirty()` (`js/admin/state.js`) asks the same list. The header's
  Save, Ctrl/Cmd+S in the editor and the canvas's forwarded Ctrl/Cmd+S all call
  `saveEverything()`.
- **The site object** -- `siteFromState()` in `save.js`: every draft in list order; it is what
  the preview renders, what Publish sends, and `window.ArkAdminApp.site()`.
- **Publish and pull** -- `scripts/lib/site-bundle.mjs` reads the list out of `store.js`
  (`siteDrafts()`) to encode the archive (`encodeSite`), decode it (`decodeSite`), read a
  project (`readProject`) and write one (`projectFiles`, `writeProject`; `scripts/pull-site.mjs`).
- **Versions** -- `js/admin/versions-glue.js` snapshots and restores the single drafts in list
  order.
- **Delete pruning** -- a deleted page or article takes its entries out of every single draft
  that declares `byItem` / `byRoute` (`ArkAdminStore.forgetItem`, called by `forgetDeleted()`
  in `save.js`), in the draft and in the saved file, without saving unrelated unsaved edits
  (regression: `tests/delete-prunes-drafts.cjs`).

`tests/site-drafts.test.mjs` holds the list, Save, the archive and the pull to the same set;
`tests/browser/publish-flows.mjs` follows the five later drafts from the real editor through a
signed publish and a pull to a visitor's page.

## Selection and the contextual toolbar

A click in the canvas (Edit mode) selects the real element; `js/main.js` reports it with
`select` and the editor draws `#selToolbar` beside it -- one compact row: the element chip, one
icon per section, then the actions -- and at most one popover, `#selToolbarPop`, for the open
section (`js/admin/toolbar.js`; placement in `canvas.js`; the section builders in
`toolbar-sections.js`).

The sections are a taxonomy derived from the selected element's real tag, read from the
preview's Layers tree (`selToolbarKind()` in `toolbar-sections.js`):

| selection | sections |
|---|---|
| text (`h1`-`h6`, `p`, `a`, `button`, `span`, `strong`, `small`, `label`) | Typography, Fill and border, Spacing, Frame, In / out animation |
| image (`img`, `svg`, `canvas`, `video`, `picture`, `figure`) | Frame, Fill and border, Alt text, In / out animation |
| anything else (a box) | Layout, Fill and border, Spacing, Frame, Size, Effects, In / out animation |
| a layout group (`group:` key) | Frame, plus the Ungroup action |
| a component instance / a state-group member | its kind's sections plus Component instance / States |

The actions are Make into component, Open in Content and Theme & defaults; a disabled action
carries its reason in its title. Component instance and States are identity sections: they
open by themselves on the selection that created them. A control edit re-renders the open
popover in place, keeping focus and an uncommitted typed value. The browser drivers name a
section and act inside it; every assumption about how the shell is drawn lives in
`tests/browser/harness.mjs` (`openToolbarSection`, `toolbarSections`, `toolbarKey`).

## Components

`js/content/components.js` (`ArkComponents`). A master is
`{ resolver, props, label, tree?, detached? }`; an instance is a pointer
`{ key, masterId, overrides }` placed under `routes[route][anchorId]`. Page modules rebuild
their DOM on every mount, so an instance is rebuilt from the current master each time: a
definition edit shows everywhere on the next render, with no copy to resync. Detach gives an
instance its own master.

- **Typed blocks**: six whitelisted resolvers (`RBLOCK_TEXT_V1`, `_CTA_`, `_IMAGE_`, `_CARD_`,
  `_QUOTE_`, `_DIVIDER_V1`), each with its own prop names; anything else is dropped by
  `sanitize()`. Created from the Library tab (`js/admin/library.js`).
- **Captured components** ("Make into component"): a selection is stored as a master with
  resolver `RBLOCK_CAPTURED_V1` and `tree`, the selection's sanitized element structure. Its
  props are derived: every non-blank text node and every image `src`/`alt` in the tree is a
  slot. The instance takes the selection's place through a **spot**
  (`spots[route][anchorId] = { after, replaces }`): an anchor created after a real element, whose
  `replaces` are hidden while the spot has an instance.
- **Context-style pinning**: a captured element also took styling from its ancestors on the
  page it came from (`#scene .how-chapter-header h1`). `contextStyles()` resolves at capture
  what the context contributed and stores it on the tree node as `x`; `js/ark/atomizer.js`
  (`pin`) re-mints it as a pinned atom wherever the instance renders, including the server
  render. Proven by `tests/browser/component-context.mjs`.

Insertion points (`points` in the preview's messages) are measured, not listed: a place under
24px wide in the page's layout is not offered (`MIN_POINT_WIDTH`, `js/main.js`), and the Library
says why ("Not offered: ...").

## States

`js/content/states.js` (`ArkStates`): `routes[route][groupId] = { trigger, current, states }`.
State 0's `members` are real layout keys, hidden with `display: none` when another state
shows -- the same mechanism as the Layers eye. Every state >= 1 is content stored as a
component instance under the anchor `state:<groupId>:<i>`. `trigger` is `'self'` or a layout
key; a click on it cycles the states in place, on the public page as in Live mode. `current`
is the saved default; which state the editor is showing is a preview-only view
(`cmsStatesShowingFor()` in `js/main.js`, the toolbar's "Showing" label) and never becomes the
default. Created with "Make into states" in the preview's right-click menu.

## Layout keys

Every edit to a real element is stored against its layout key, the `data-ark-layout-key`
attribute `ArkLayout.annotate()` writes (`js/content/layout.js`, `baseKey()` / `keyedList()`).
The key is derived from structure, in this order: `group:<id>` for a group wrapper;
`component:<instance>/<path>` or `insert:<slot>/<path>` inside an inserted block; `page:/`
for a page root; `copy:<manifest key>` for manifest-bound copy; `id:<element id>`; otherwise
`page:/<tag:n/...>` within a page or `path:<tag:n/...>` in the shell. Repeats of a `copy:` or
`id:` key are numbered `#2`, `#3` per route scope. Keys are recomputed on every pass, never
kept from an earlier one.

`ArkLayout` stores `routes[route][key]` (per breakpoint: desktop, tablet, phone), plus
`groups`, `labels` (layer names) and `alts`. A key must name the same element in every
history of a route -- direct load, arrival from another route, phone width, after a live
insertion, and in the editor's preview; `tests/browser/layout-key-stability.mjs` checks that.
Layout keys were being reworked when this page was written; check `layout.js` before relying
on the exact prefixes.

## Versions

`js/admin/versions.js` (`ArkVersions`), with its panel in `versions-panel.js` and the glue to
the drafts in `versions-glue.js`. The history lives in the connected project folder,
`cms-history/`, never served or deployed:

- `versions/<hash>.flx` -- one immutable version record; `bodies/<hash>.flx` -- one draft body,
  shared by every version whose draft is equal; `heads/<hash>.flx` -- "this record is a head";
  `legacy/<hash>.flx` -- marks that the old `head.flx` pointer was carried into `heads/`.
- `head.flx` is legacy and read-only: histories before 2026-10-18 kept one mutable pointer.
- A `<hash>` is SHA-256 of the value's `JSON.stringify` form; files hold the value in ARK's
  structured-state FLX grammar (`js/admin/vendor/flx-state-grammar.js`), exact to the byte,
  so every read re-derives the address and refuses a mismatch.
- Records link backwards (`prev`, `joins`); a restore or an import is a new record
  (`restoredFrom`, `importedFrom`), never a rewrite. Heads are derived: a record nothing else
  names. Two writers can only fork, joined by the next Save.

Connecting a folder records a baseline ("The project as first connected"); every Save records
a version (`recordVersion()` in `versions-glue.js`). Preview sends an old version's site to the
canvas as `defxn-cms-preview-state` without writing anything; Restore puts its drafts back,
and the next Save writes them and records a version naming the restored one. A version's
per-draft summary is derived from the two bodies' shapes.

## SEO generation

`ArkSEO` (`js/content/seo.js`) defines every SEO field, and `ArkSEO.searchFiles(seo,
manifests, articles)` is the one generator of `sitemap.xml`, `robots.txt` and `llms.txt`
(`null` = do not write it: no base URL means no sitemap or llms.txt, never a guessed host).
Save and Delete write them through `writeSearchFiles()` (`js/admin/versions-glue.js`) and
`ArkAdminStore.saveSearchFiles()`, only when the text changed; publish and pull take them from
the same function (`scripts/lib/site-bundle.mjs`, `projectFiles`). The page `<head>` (title,
description, canonical, social image, robots, JSON-LD) is written by the page router from the
same module (`js/ark/page-router.js`), so the public page, the preview and the server render
(`api/lib/render-core.mjs`, which runs the real page) carry the same head. The editor's controls are derived from its field definitions
(`seoFieldRows`, `js/admin/seo.js`): this page's fields in the page SEO popover and the page's
Content-mode SEO tab, the site's in Theme & defaults.

## Design check

`js/admin/design-check.js`. The layout, colour, typography, search and AI rules measured on
the rendered canvas page: hierarchy (one H1; H1 > H2 > text), ghost buttons, calls to action,
text contrast, 60-30-10 colour balance, plain body font, scanning, leading with the point,
links and reachability, search, AI, and audience.

- **What it measures**: only the active route's content as a visitor is given it
  (`checkMeasurable()`): not `hidden`, `inert`, `aria-hidden`, the editor's own chrome,
  `visibility: hidden`, or clipped to 1px by an ancestor.
- **When**: after the preview's `ready` for what it was last sent, fonts loaded, the router's
  transition over and every finite animation ended (`previewSettled()`); a reading that never
  settles says so.
- **notBuilt**: a rule with nothing to measure -- the audience rule, since no draft stores an
  audience -- reports `notBuilt`, and one whose every candidate sits on an image or gradient
  reports `unmeasured`. Neither is a pass or a 0, and neither counts: the badge is passes /
  measured rules.
- Colours are the real computed colours composited over their real backdrop, and the real SDK
  tokens resolved inside the preview -- no palette or font list is kept here.

## Modules

The editor is 27 classic scripts loaded in order by `admin-app.html` (its `<script>` list is the exact order),
no bundler; `admin.js` is now only the 54-line entry point. The contract is
in `js/admin/core.js`: each file is an IIFE that takes what it uses from `window.ArkAdmin` at
its top and hands back its exports with `A.provide()`; a function from a file that loads later
is imported with `A.later(name)`. Shared mutable state is one object, `A.state`
(`js/admin/state.js`). `core.js` loads first, `admin.js` last.

| file | owns |
|---|---|
| `core.js` | the `ArkAdmin` namespace and its vocabulary (`$`, `h`, `status`, `toast`, `refuse`, ...); refuses to run outside `admin.html` |
| `state.js` | `A.state`: mode, current item, every draft and its saved copy, dirty checks (`anyDirty`) |
| `controls.js` | the control-row builders every panel draws with |
| `save.js` | `saveEverything`, `singleDraftHandle`, `siteFromState`, the one removal path |
| `nav.js`, `editor.js` | the mode switch and item list; the dispatcher that draws the current item |
| `articles.js`, `assets.js`, `secrets.js`, `shapes.js` | the article, image, encrypted-item and page-shape/mesh-tuning editors |
| `preview.js` | Content mode's `#frame` and its one-way feed |
| `design.js`, `seo.js` | Theme & defaults; every SEO control |
| `studio.js` | entering the canvas, its route list, applying the preview's draft replies |
| `bridge.js` | the canvas preview protocol (both directions) and `syncCmsPreview()` |
| `canvas.js`, `header.js`, `rail.js` | the device-sized stage; the header's canvas controls and popovers; the Layers / Pages rail |
| `toolbar-sections.js`, `toolbar.js` | the toolbar taxonomy and section builders; the toolbar shell |
| `library.js`, `sitemap.js`, `design-check.js` | the Library tab; the Sitemap view; the Design check |
| `mesh.js`, `project.js` | the Mesh view and Publish; the project folder and account menu |
| `versions-glue.js` | the drafts <-> `ArkVersions` / `versions-panel.js` glue, and the root search files |
| `admin.js` | starts the editor: the save shortcut, the unsaved-work warning, `window.ArkAdminApp`, the first load |

Loaded before them and not part of the split: `store.js` (`ArkAdminStore`), `versions.js`,
`versions-panel.js`, `publish.js` (`ArkPublish`), `primitives.js`, `crypto.js`; and in
`admin.html`, `auth.js` and `gate.js`.

`window.ArkAdminApp` is the editor's public test surface: `unsaved()`, `site()` (what Publish
would send now) and `designCheck()` (a settled Design check reading).

## Testing

Two suites, run separately.

**Unit suite** -- `npm test` (`node scripts/run-tests.mjs [prefix]`): every `tests/*.cjs` and
`tests/*.mjs` directly in `tests/`, one at a time; `*.test.mjs` run under `node --test`. Each
file has a 120 s hang guard unless it declares `run-tests-timeout-ms: <n>` in its first 4 KB.
It never reads `tests/browser/`.

**Browser suite** -- `npm run test:browser` (`node scripts/run-browser-tests.mjs`): the
Playwright drivers in `tests/browser/`, in a real Chromium (`npx playwright install
chromium`), one at a time -- each launches its own browser, and two at once on an 8 GB machine
is the out-of-memory pattern.

- `--list` lists the drivers; `--only a,b` runs some; `--verbose` streams their output. A
  driver is derived, not listed: a `.mjs` in `tests/browser/` that imports `./harness.mjs`.
- It prints one table: result, duration, and the 1-minute load average when each driver
  started and ended, plus the load factor the driver applied. Each driver's full output goes
  to a log folder it names. Exit code is non-zero if any driver failed or hung.
- Any driver also runs alone: `node tests/browser/<driver>.mjs` (most take `--only`,
  `--headed`, `--keep`).

`tests/browser/harness.mjs` is what every driver shares:

- **A scratch site**: `copySite()` copies the servable site to a temporary folder;
  `startHost()` serves it with the real publish host in local-development mode, on a free port
  unless `PORT` is set (never a hard-coded one: drivers collided, and 3437 is the owner's live
  server); `fakeFolder()` stands in for the File System Access picker so a real Save writes
  into the scratch copy.
- **Readiness from the app's own signals, never a fixed sleep**: `watchSignals()` records, in
  every document, the router's `ark:route-ready`, every preview message, and every `#status`
  message. On top of it: `waitForPreviewReady`, `waitForRouteReady`, `openRoute`,
  `setPreviewMode`, `waitForSave` / `saveAndWait`, `animationsSettled`, `routeSettled`,
  `nextFrames`, `untilStable` (a measurement read twice the same).
- **One load factor**: where a wait must end in a verdict, its budget is the unloaded time
  multiplied by `LOAD.factor` = 1-minute load average / CPU count, clamped to [1, 6], measured
  once per driver and printed (`BROWSER_LOAD_FACTOR` overrides it). `until()` applies it and
  says how long it really waited when it gives up.
- **The toolbar and header shells**: `openToolbarSection`, `toolbarSections`, `designView`,
  `openPageSeo`, `openSiteSeo`, `openBackground`, `clickHeader`.
