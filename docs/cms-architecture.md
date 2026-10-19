# CMS architecture (the merged editor)

How the DEFXN content editor is built, as of 2026-10-18. Every statement here names the file
that decides it; when this page and the code disagree, the code wins and this page is the
defect. The editor, once one ~4,600-line `js/admin/admin.js`, is now 28 files under
`js/admin/`, one per concern ([modules](#modules)).

## One workspace

`admin.html` is the locked page: it holds the identity's key and runs the sign-in
(`js/admin/gate.js`). Once signed in (or on loopback in local development), it shows the
editor, `admin-app.html`, in a same-origin frame `#app`. The editor reaches the identity
through `window.parent.ArkGate` and exchanges no messages with `admin.html`; opened on its own,
`js/admin/core.js` sends the browser back to `admin.html` and starts nothing.

Inside `admin-app.html` there is ONE workspace (owner, 2026-10-18: "I only want to see ONE CMS,
unified."): one header, one rail, one canvas, one selection. Until then there were two apps
behind a Content | Design switch -- Content was a page list, a form column and a preview iframe
of its own (`#cmsShell`, `#editor`, `#frame`, `js/admin/preview.js`); Design was the canvas.
All four are deleted. Exactly one site iframe exists in the document: `#cmsPreview`.

**Three tiers** (2026-10-19, docs/ux-audit/cms.md (b): 23 header controls, 16 of them bare icons,
became 11): what is used on every screen is in the header and labelled; what belongs to the
canvas is on the canvas's own strip; what is occasional is one click away in **More**. Every
feature kept its id and its behaviour; only where it sits changed.

**Header** (`#appBar`, one row from 1100px; `js/admin/header.js`, `nav.js`): `#btnLeftRail` (the
side panel), `#btnPage` (the page switcher: a search over the one page list, below),
`#btnPageFields` ("Page settings": the sheet with the page's every field), the lens
(`#lensSwitch`: **Edit words** `#lensContentBtn` / **Edit style** `#lensDesignBtn`; `setLens()` in
`nav.js`; `state.lens` stays `content` / `design`, remembered per browser as `defxn-cms-lens`),
`#btnUndo` / `#btnRedo` (the ONE history, `js/admin/history.js`, below), `#status` (a slot of its
own width: a message never moves a control), `#save`, `#publish`, and `#accountBtn` -- **More** --
whose menu `#accountMenu` holds:

- the views of the one site (`#viewSwitch`; `setView()`, `js/admin/sitemap.js`): **The page**
  (`#viewCanvasBtn`), **Site map** (`#viewMapBtn`, `#mapView`, with its own "Back to the page") and
  **Site style** (`#viewThemeBtn`, `#themeView`, docked beside the live canvas; tabs Colours &
  background / Visitor defaults / Search defaults; its own close button);
- **Search & sharing for this page** (`#btnPageSeo`, the page SEO popover, `seo.js`; canonical
  URL and structured data under its Advanced), **Page transition** (`#backgroundBtn`, the
  `ArkCanvasTransitions` popover -- it was called "Background", which is the backdrop layer in
  Site style), **Version history** (`#versionsNav`) and **Publishing status** (`#meshNav`, the
  sheet);
- the account: who is signed in (`#who`), `#connect` (`connectProject()`, the one connect flow
  behind every Connect button: the menu, the banner, Save's refusal, Versions), the publishing
  service's status (`#mesh`), keyboard shortcuts, `#signOut` (`js/admin/project.js`, `mesh.js`).

While no project folder is connected, a banner above the canvas says what connecting does, with
the button. `#publish` refused (no publishing service, a copy opened from disk) stays clickable:
a click opens the Publish sheet with the reason (`refuse(button, reason, explain)`,
`js/admin/core.js`; `tests/cms-refusal-explains.cjs`).

**The canvas strip** (`#canvasTools`, above the stage, also in Preview -- it is the way back to
Edit): screen size `#devices`; the size note `#bpNote` (Edit style at tablet or phone size only,
in words: "Phone only" / "Tablet and phone only"); the page's name and size (`#devName`,
`#devScale`); **Design tips** `#btnCheck` (`.ibtn.score`; Edit style only: a quiet count of tips, the score in
`#scoreBadge`'s `data-score`, warning tone only when the reading just got worse on that page);
Edit / Preview (`#mode`). It is hidden in the Site map, where there is no canvas.

On a phone (below 600px) the header is two rows -- the side panel, the page, Save, Publish, More;
then Page settings, the lens, undo, redo -- every control at least 44px; the status line takes the
screen's bottom strip while it has something to say. `tests/browser/header-reach.mjs` measures it
(at most 11 header controls, two phone rows, 44px targets, a status message moving nothing).

**Overlays** (`js/admin/overlay.js`): everything that floats over the workspace registers with
ONE dismissable-layer stack -- the header popovers (`openPop`), the More menu and the toolbar's
section popover (level `popover`: one at a time; Esc, a press outside, leaving the window, or a
press on the canvas closes them -- the canvas reports the press, `defxn-cms-preview-pointerdown`,
because losing focus to it is not enough: it also takes focus by itself), and the sheet and
Versions (level `sheet`: one docked slot, opening one closes the other; Esc or their close
button). Choosing **Site style** closes them as well: its dock is on the edge they float over,
and chosen under an open Versions it showed as a 20px sliver (`setView()`, `js/admin/sitemap.js`;
`tests/cms-site-style-not-under-sheet.cjs`). The page and the Site map leave them open. A closed
Versions panel is not refreshed by a Save; opening it lists the history again. Esc closes the
topmost only. One close button (`overlay.closeButton`, `.ov-close`). It
mirrors Ark UI's popover / dismissable-layer shape; `js/ark/vendor/ark-kit.js` exports
`createArkPopover` but not the `createArkUI` runtime it runs on, so that swap waits for the kit
to carry the runtime.

**The canvas** (`js/admin/canvas.js`, `layoutStage()`): the stage is the breakpoint's width,
zoomed down when the area is narrower, and exactly as tall as the area under its size label --
the page scrolls inside the canvas, nothing is left blank below it. The breakpoint it opens on is
the last one chosen in this browser (`defxn-cms-device`; a press on `#devices` is remembered),
else the one the editor's own screen is by the site's thresholds (`ArkLayout.breakpoint`): a
phone opens on the phone layout at 100%, a 760px window on tablet, a desktop on desktop. A resize
afterwards never switches it.

**Rail** (`#studioLeft`, `js/admin/rail.js`): tabs **Pages**, **Layers**, **Blocks** (`#tabLib`,
`library.js`), **Images** (`#tabMedia`) and **Private** (`#tabVault`, encrypted content). Pages
draws THE page list, `siteList()`: every page named once -- its draft's title, else its catalog
title, else its address in words, never a raw slug -- in the groups a person looks for: Main
pages, Guides (the theory pages, `/concept/...`), Articles, Header & footer (the site chrome),
More pages (routes with no fields, folded). The header's page switcher searches the same list and
the canvas strip, Page settings and the page SEO popover use the same names
(`tests/cms-pages-rows-are-buttons.cjs`). `#pageSearch` filters it; **+ New** (`#btnNewItem`) asks
"Guide page or Article?" and a **title**; the address is derived and shown, and can be changed
under Developer details (`#newForm` / `#newId`, `#newArticleForm` / `#newSlug`, the forms
`editor.js` already handles). A row opens its page on the canvas; its Page settings and Delete
buttons are not extra tab stops (the arrow keys walk the rows). **Layers** is the page's real
element tree; each row is named by `ArkLayout.layerName` in `js/content/layout.js`, and a typed
name wins (`tests/layer-names.cjs`). The Content lens opens on Pages and the Design lens on
Layers; the last tab used in each lens is remembered (`defxn-cms-rail-tab`). Below 860px the rail
is a drawer over the canvas (`#railScrim`; Esc or choosing a page closes it).

**The sheet** (`#sheet`, `js/admin/panels.js`): one form panel at a time, on demand -- a page's
or an article's every field (**Page settings**: every manifest field including those the canvas
does not show, called by its label; fields whose label says the page no longer shows them wait
under "Unused fields"; the copy keys and the file are its Developer details; tabs Text / Shapes /
Search & sharing / Advanced), or **Publishing status**. It is never open on
load or on a selection, and never a fixed right column: it overlays the canvas's right edge (the
canvas keeps its width) and closes on Esc or its close button. Opened from the header or a Pages
row it follows the canvas to the next page; opened transiently (the toolbar's and the Library's
"Open in Content", `openContentEditor()` in `studio.js`) it closes when the canvas moves on. A
route with no manifest and no article gets a refusal naming where its words live.

**Panels** are mounted by `panels.js` (`mountPanel`): `#mediaPanel` (`renderMediaPanel`),
`#vaultPanel` (`renderVaultPanel`), `#themePanel` (`renderThemePanel`), `#shapesPanel`
(`renderShapesPanel`), and the sheet's body (`renderPageFields`, `renderArticleFields`,
`renderMeshEditor`). A panel function no file provides is mounted as a placeholder naming it
and draws itself on the next `refreshPanels()`.

Studio used to be a second document (`admin-studio.html`) in an iframe with its own save
path; it was merged in and deleted, and the publish host no longer serves it (README,
"Studio"). The workspace container keeps its old id, `#studioRoot` (every rule in
`css/studio-embed.css` is scoped under it).

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
| `defxn-cms-preview-state` | `site`: every draft (`siteFromState()`, or the version being previewed); `route`: the page the editor wants shown | defines every content module from the drafts, adds the routes only the drafts have (`ArkUI.catalogContentRoutes`), re-renders the route IN PLACE (`pageRouter.refresh({ inPlace: true })`: no transition, no blank frame) -- or, when this message made `route` routable, navigates there -- annotates it, replies `ready` |
| `defxn-cms-preview-mode` | `mode`: `edit` / `live` | Edit: clicks select. Live: clicks behave as for a visitor |
| `defxn-cms-preview-lens` | `lens`: `content` / `design` (sent on every change, load and ready) | what an Edit-mode click does: Content edits the text in place ([Content lens](#the-content-lens)), Design selects and styles |
| `defxn-cms-preview-site-defaults` | `settingsDefaults` (`js/admin/design.js`) | applies the settings-gear defaults without a remount |
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
| `defxn-cms-preview-select` | `keys`, `content` (the selection's binding or refusal), `selection(s)`, `groups`, `points`, `tree` | the selection the toolbar edits (`state.cmsContent` for the Content section) |
| `defxn-cms-preview-layout-change` / `-layout-replace` / `-layout-history` | a patch or the whole layout; undo/redo availability | applies it to the editor's layout draft |
| `defxn-cms-preview-components-replace` / `-states-replace` / `-states-showing` | the whole draft; which state each group shows | adopts the draft |
| `defxn-cms-preview-canvas-transitions-replace` / `-element-motion-replace` | the whole draft | adopts the draft |
| `defxn-cms-preview-notice` | `message` | toast (a refusal that says what it needs) |
| `defxn-cms-preview-context-menu` | `open` | hides the toolbar while the preview's menu is open |
| `defxn-cms-preview-enter-canvas-mode` | -- | opens the Background popover |
| `defxn-cms-preview-save` | -- | Ctrl/Cmd+S pressed with focus in the canvas: `saveEverything()` |
| `defxn-cms-preview-copy-edit` | `route`, `key` (layout key), `field` (the source field's address), `value`, `final`, `history` (`''` / `revert` / `undo` / `redo`) | `applyCmsCopyEdit()`: the draft through `setItemField()`. Typed or reverted on the canvas (`history` `''` / `revert`): no re-send, the canvas already shows it (`previewShowsDrafts()`); an undo/redo re-sends the site |

Which route the preview shows is `syncCmsPreview()` in `bridge.js`: a route change re-points
the iframe's `src`, and the iframe's `load` handler sends `state`, `mode` and `lens` again. While
the iframe is being re-pointed, no `state` is posted to the page still in it (after a delete it
would receive a site without itself; `tests/cms-preview-state-route.cjs`): the new route's load
-- or, for a fragment-only navigation, its first ready -- sends it.

**The drafts the canvas shows** (`bridge.js`, replacing Content mode's `#frame` feed):
`notifyPreviewState()` (what `touch()` calls) re-sends `siteFromState()` coalesced over 180 ms,
and only when the CONTENT differs from what the canvas last received (`contentSignature`: every
draft but the canvas-owned layout, components, states, transitions and element motion, which the
preview computes itself and relays up -- re-sending them remounted the page under the edit that
made them). `previewShowsDrafts()` adopts the drafts as sent (an edit typed into the canvas);
`refreshCanvasSite()` rebuilds the site before the canvas is pointed at a draft-only page;
`reloadPreview()` re-derives the routes after a structural change (create, delete, Revert, Save).
`notifyPreviewTheme` / `-Mesh` / `-Assets` post `flux-chain-preview-theme` (`js/main.js`) and
`flux-chain-preview-mesh` / `-assets` (`js/zero-webgl.js`) to the canvas for an instant update
without a remount. A page or article that exists only as an unsaved draft is routed from the
drafts: every `defxn-cms-preview-state` carries the `route` the editor wants, the preview derives
the draft routes with the catalog's own function (`ArkUI.catalogContentRoutes`,
`js/pages/catalog.js`), gives them scene state (`ArkUI.sceneState.addPages`) and navigates there
when that message made the route routable (`tests/cms-draft-routes.cjs`). Creating a page or an
article lands on it: the canvas, its own Page fields, a notice naming it. Should a draft still not
render, the canvas falls back;
the ready's `path` shows it, the status line says why and what fixes it, and the next Save opens
the page on the canvas by itself (`routeRefused`, `state.cmsWantedRoute`).

## Content forms and the one field write

Every content form is a panel drawn into whatever container the shell gives it
(`js/admin/editor.js` and the files it names); none owns a place on screen.

| on `window.ArkAdmin` | draws / does | mounted by the shell in |
|---|---|---|
| `renderPageFields(container, id, {tab})` | every manifest field of a page or the site chrome (`nav`), tabs Content / Shape / SEO / Code, Revert, Delete (theory pages) | the Page fields sheet |
| `renderArticleFields(container, slug)` (`articles.js`) | an article's card, core, editorial evidence and next move, sections and questions, Revert, Delete | the Page fields sheet on an article route |
| `renderMediaPanel(container)` (`assets.js`) | images: list with thumbnails and dots, New image, and per image a detail (preview, label, replace file, Revert, Delete) | rail Media tab |
| `renderVaultPanel(container)` (`secrets.js`) | encrypted items: list, New encrypted item, and per item a detail (label, your key, decrypt, re-encrypt, Revert, Delete) | rail Vault tab |
| `renderShapesPanel(container, pageId?)` (`shapes.js`) | the shared shape tuning (site-wide) and one shape page's images and placement, with a picker for every shape page (Demo and Lab have no manifest) | Theme view |
| `renderThemePanel(container)` = `renderDesignEditor(container)` (`design.js`) | Theme & defaults: colour theme, background, settings-gear defaults, site-wide SEO | Theme view |

**The field write.** `setItemField(kind, id, fieldKey, value, opts)` is the one path a page or
article edit takes into its draft: the form inputs call it, and so do the canvas's inline edits.
It returns `{ ok: true, changed }` or `{ ok: false, refusal }` (the refusal names what it needs: an
unknown id, a field the manifest does not have, a non-string value). `kind` `page`: `fieldKey` is a
manifest field role (`TITLE`, `NAV.PRODUCTS`) or `meta.placement` / `meta.next`; `kind` `article`:
`title`, `category`, `minutes`, `summary`, `core`, `relevance`, `reviewed`, `evidenceLabel`,
`evidenceHref`, `relatedPage`, `actionLabel`, `actionPage`, `sections.<i>.<j>`, `questions.<i>`, or
`numbers` (a boolean). It then runs `touch()` -- the Save button, every panel's Revert, every
`[data-cms-item]` dot, an `ark-cms-drafts` event on `document` (`{ kind, id, change }`) -- and
asks the bridge to send the drafts to the canvas (`notifyPreviewState()`). An edit made ON the
canvas passes `{ canvas: false }`: the canvas already shows it, so the item is folded into
`state.cmsSourceSite` without remounting the page under the caret. Each form control carries its
address, `data-cms-field="<kind>:<id>:<key>"`, and shows a new value from elsewhere unless it has
focus.

**Repaint without losing the caret.** A panel is drawn by `paintInto()`, which records it; a
structural edit (add a point or section, encrypt, a shape mode) repaints every panel showing that
item, and a repaint keeps the focused control, its selection and the scroll position. Typing
never rebuilds a form (`touch()` only refreshes state around it).

**Items.** `createPage(id)`, `createArticle(slug)` -> `{ ok, id }` or `{ ok: false, refusal }`;
`deleteItem(kind, id)` (async; asks first; file, index, other drafts' entries, root files, a
version); `revertItem(kind, id)`. The New page / New article / New image / New encrypted item
forms (`#newForm`, `#newArticleForm`, `#newAssetForm`, `#newSecretForm`) are handled by a
delegated submit listener, wherever they are drawn (the Media and Vault panels draw their own).
The old centre-column dispatcher, `renderEditor()`, is deleted: the shell mounts every panel
(`js/admin/panels.js`) and re-draws the mounted ones with `refreshPanels()`.

**Where the page shapes went.** Decided by what they affect, one home per control: the shared
tuning applies to every page's shape images (site-wide), so it is a section of the Theme view; a
page's shapes are its WebGL background layer (not the page transition the Background popover
edits), so they are its Page fields -> Shape tab. Demo and Lab have shapes but no manifest and so
no Page fields: the Theme view's section edits them, and links every other shape page to its
Page fields (`openPageFields({ kind: 'page', id, tab: 'shape' })`) instead of drawing a second
editor. With every surface open at once no id appears twice (`tests/admin-content-panels.cjs`).

Field rows come from the shared `ctlField` / `ctlSelectField` (`js/admin/controls.js`; options
`id`, `live`, `rows`, `note`, `readOnly`), so every form row is the same row.

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

## The Content lens

The lens (`state.lens`, the header's Content | Design) decides what an Edit-mode click on the
canvas does. In the Content lens a click on text that is the value of exactly one source field
makes that text editable where it stands (`contentEditable="plaintext-only"`), and the toolbar
shows one section, **Content**. The preview half is one delimited block in `js/main.js`
("CONTENT LENS"); the editor half is `applyCmsCopyEdit()` / `cmsCopyAddress()` in
`js/admin/bridge.js` and `buildContentSection()` in `js/admin/toolbar-sections.js`.

**Which field a text shows is derived** (`cmsCopyCandidates`, `cmsPickBinding`): an element is
bound to a field when its rendered text equals the field's value, whitespace ignored -- the rule
the preview's copy annotation already used. Sources, and the address each field travels under:

| source | address | written by |
|---|---|---|
| a component instance's prop (a Library block, a captured component, a state >= 1) -- the only source searched inside an instance | `component:<anchor>/<instance>/<prop>` | the preview itself (`set-override`), relayed as `components-replace` |
| a manifest field (pages, Site chrome) | its copy key `AREA.ROLE` (`HOME.TITLE`, `NAV.OVERVIEW`) | `setItemField('page', id, ROLE, value)` |
| an article field, from the article's own shape | `article:<slug>/<path>` (`title`, `sections.0.1`, `questions.2`) | `setItemField('article', slug, path, value)` |

Equal values are narrowed by structure, in order: a runtime copy key on the element itself
(`js/ark/runtime.js` wrote it from the pattern); the source that owns where the element sits (Site
chrome for the shell, the page's manifest or the article for the route); the key code read by
name while rendering (`ArkCopy.text`, recorded in the preview only -- the header's links read
`NAV.OVERVIEW`, which holds the same word as the pattern's `NAV.ABOUT`). Still more than one is
refused, naming every candidate. A link's target is the `link` field of the same source whose
resolved href is the link's (two: the one sharing the label's prefix); a target written in code
is refused with its source.

**Unbound text says why** (`cmsContentInfo`): no text of its own, several separate pieces, a
component's markup rather than one of its fields, or "not read from any field: it is written by"
the page module (its file, from the catalog), the site shell, or the component -- and what would
make it editable. The hover affordance is dashed where a click edits, dotted grey where it
explains.

**The edit.** Every keystroke posts `copy-edit` (`final` false); Enter (a one-line field) or
Ctrl/Cmd+Enter, Escape, or a click elsewhere, commits (`final` true) and KEEPS the words -- Escape
used to restore them silently (docs/ux-audit/cms.md P0-2); the way back is Undo or the Content
section's "Revert to saved" (`tests/cms-field-revert.cjs`). Plain Enter finishes unless the field
is a paragraph whose breaks the page shows (`cmsEnterBreaks`); Shift+Enter breaks a line only in a
field that stores breaks. (Before 2026-10-19 Escape restored the words and posted the original
value.) The value is the element's `textContent` with a `<br>` or a child laid out
as a block read as a line break -- never `innerText`, which applies `text-transform` -- and a
one-line field never stores a break. A state the editor sends while words are being typed is held
until the edit ends, so the element under the caret is not rebuilt. A commit is not re-sent at
all: the canvas already shows the words, so the editor takes them with `{ canvas: false }` and
`previewShowsDrafts()`, and the preview writes them into its own copy of the source
(`cmsAdoptCopyValue`) so the next click still finds the field. Every other element on the page
bound to the same field (found the way a click finds a binding, innermost only) takes the words
at once (`cmsSyncCopies`). A send already waiting in the bridge's 180 ms window (a Page fields
keystroke just before) is not cancelled by that: `previewShowsDrafts()` sends it at once,
carrying both edits. A site the editor sent while words were being typed carries half-typed
words, so once anything was typed it is never applied: the final copy-edit says `stale` and the
editor re-sends the current site (regression: `tests/cms-preview-feed.cjs`). Every re-send -- a Page fields keystroke, a toolbar
edit, an undo -- re-renders the route in place: the page router's `refresh({ inPlace: true })`
keeps the page showing until its rebuilt replacement is shown in the same task, with no exit or
entrance, no background fade and the scroll kept. A same-route re-render is not a navigation; it
replayed the route-change transition and flashed the canvas blank on every edit (regression:
`tests/page-router-refresh-in-place.cjs`; the browser driver samples every frame for a blank one). A committed edit is an entry
in the canvas's undo history (`cmsLayoutUndo`, beside layout snapshots), which reports each new
entry (`layout-history`, reason `push`) to the editor's ONE history (`js/admin/history.js`). It
interleaves those entries with fields written from the editor's own forms (`setItemField`, one
entry per field until a pause) and owns Undo / Redo and Ctrl/Cmd+Z in the editor and on the canvas
(the canvas forwards the key, `defxn-cms-preview-undo-key`): a canvas entry is undone by the
canvas, a form entry through `setItemField`. The canvas's snapshots end when it loads another page
(`historyCanvasReset`); form entries stay. Ctrl/Cmd+S commits first.

**The Content section** shows the field's label, address, kind and file; its value (a textarea
for a paragraph field) carries the form's `data-cms-field` address, so the canvas, the Page fields
sheet and the section show one value; a link's target picker (`linkPickerEl`); the refusal for
unbound text; and "Open all page fields" (`openPageFields({ kind, id })`). Style sections are the
Design lens's; an image's Alt text, Component instance and States stay.
Regression: `tests/cms-content-lens.cjs`, `tests/browser/inline-content.mjs`.

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

The bar is lens-aware (docs/ux-audit/cms.md P1-6, P1-7, P1-8). **Edit style**: the sections --
the three used most labelled (Text, Colour, Spacing), the rest icons named by tooltip and
aria-label -- then **More** (`data-section="tb-more"`): the selection's commands, the SAME list the
canvas's right-click menu draws (`cmsSelectionCommands()` in `js/main.js`, reported with every
selection as `commands` and run by `defxn-cms-preview-selection-command`): Make into states, Make
into component, Group, Ungroup, Remove, Align and Distribute once two layers are selected, Page
transition. A command that cannot apply stays listed with the reason under it. Then the editor's
own: Edit its words, Site style. A group's Ungroup is also a bar button. **Edit words**: nothing
opens over the words being edited; the chip names the field ("Heading"), the bar says how an edit
ends ("Enter or Esc to finish") and offers Done and All fields; the field's Details (its words in
a box, its link target, Revert to saved, its key under Developer details) open on demand -- and by
themselves only for text that cannot be edited in place, whose explanation is the answer. The
right-click menu reads SDK tokens and is placed from its measured size, so the canvas edge never
cuts it off. Frame, Component instance and States show ids and keys only under Developer details
(`devDetails()`, `js/admin/controls.js`).

The bar is placed in the stage's own (zoomed) coordinates and moves with it by CSS; the popover
is `position: fixed` and placed from the bar's on-screen box. `canvas.js` re-places the bar on
a window resize, a canvas resize or scroll, and a change of the bar's own size, and the popover
whenever the bar's box moves for any reason (`watchPopAnchor`: while a popover is open, each
frame compares the bar's box with the one the popover was placed from) -- a resize moves the
stage again one frame later, when the header's new height reaches the canvas.

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

`ArkLayout` stores `routes[scope][key]` (per breakpoint: desktop, tablet, phone), plus
`groups`, `labels` (layer names) and `alts`; `ArkStates.routes`, `ArkComponents.routes` /
`spots` and `ArkElementMotion.routes` are keyed the same way. A **scope** is a route (`/about`)
for that route's page content, or `ArkLayout.SHELL` (`'*'`) for the persistent shell -- header,
nav, background layers -- which every route shows: an edit to a header link, a group or state
group of header links, or a component placed after one is stored once and applies on every
route. `ArkLayout.scopeOf(element, route)` decides it by structure (inside a page root or
not); a set (group members, a captured selection) is SHELL only when every member is shell.
The preview reports the scope as `selection.route` and the route shown as `selection.page`.
Rendering a route applies its own scope and SHELL; SHELL entries apply to shell elements only,
and where both hold the same key SHELL wins field by field. Data saved under a route before
SHELL existed is never rewritten and still applies on that route. Regression:
`tests/layout-shell-scope.cjs`. An unchanged group keeps its wrapper element across
`ArkLayout.apply()` passes (a header group's wrapper used to be rebuilt on every pass, which
emptied the selected one and dropped the selection). A key must name the same element in every
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

The editor is 28 classic scripts loaded in order by `admin-app.html` (its `<script>` list is the exact order),
no bundler; `admin.js` is now only the 54-line entry point. The contract is
in `js/admin/core.js`: each file is an IIFE that takes what it uses from `window.ArkAdmin` at
its top and hands back its exports with `A.provide()`; a function from a file that loads later
is imported with `A.later(name)`. Shared mutable state is one object, `A.state`
(`js/admin/state.js`). `core.js` loads first, `admin.js` last.

| file | owns |
|---|---|
| `core.js` | the `ArkAdmin` namespace and its vocabulary (`$`, `h`, `status`, `toast`, `refuse`, ...); refuses to run outside `admin.html` |
| `overlay.js` | the one dismissable-layer stack (`overlay.open/close/forget/closeLevel/isOpen`) and the one close button |
| `history.js` | the ONE undo history: canvas entries and form-field entries, in order; `undo()`, `redo()`, `historyState()` |
| `notice.js` | `notice({ tone, title, body, actions, persist, key, into })`: the one toast / banner / inline alert (Ark UI's alert and toast-region shape, so a later wave swaps its internals); `toast()` is a notice; `tests/cms-notice.cjs` |
| `state.js` | `A.state`: the lens and its rail tabs, the view, the item a form edits, every draft and its saved copy, dirty checks (`anyDirty`) |
| `controls.js` | the control-row builders every panel draws with, and `devDetails()` -- the one "Developer details" disclosure where keys, files, ids and raw values live |
| `save.js` | `saveEverything`, `singleDraftHandle`, `siteFromState`, the one removal path |
| `nav.js` | the lens (`setLens`), the `select*()` entry points (a page or article is also shown on the canvas), `renderList()` (the repaint after a draft change: header dots, Save, the Pages tree), `--app-bar-h` |
| `editor.js` | page fields (`renderPageFields`), the one field write (`setItemField`), touch / Revert / create / delete, the panel registry ([Content forms](#content-forms-and-the-one-field-write)) |
| `articles.js`, `assets.js`, `secrets.js`, `shapes.js` | the article form, the Media panel, the Vault panel, the page-shape/mesh-tuning panel -- each drawn into a given container |
| `design.js`, `seo.js` | Theme & defaults; every SEO control |
| `studio.js` | connecting the one canvas at startup (`connectCanvas`), its route list, applying the preview's draft replies, `openContentEditor()` |
| `bridge.js` | the canvas preview protocol (both directions), `syncCmsPreview()`, and the drafts the canvas shows (`notifyPreview*`, `previewShowsDrafts`, `refreshCanvasSite`, `reloadPreview`) |
| `canvas.js`, `header.js`, `rail.js` | the device-sized stage and `openRoute()`; the header's views, canvas tools and popovers; the rail (Pages site tree, Layers, tabs, fold / drawer) |
| `panels.js` | where every form panel is mounted (Media, Vault, Theme view, the sheet: Page fields and Mesh), `refreshPanels()`, `openPageFields()`, `openMeshSheet()`, `itemForRoute()` |
| `toolbar-sections.js`, `toolbar.js` | the toolbar taxonomy and section builders; the toolbar shell |
| `library.js`, `sitemap.js`, `design-check.js` | the Library tab; the Sitemap view; the Design check |
| `mesh.js`, `project.js` | the Mesh view (drawn into the sheet) and Publish; the project folder and account menu |
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

- `--list` lists the drivers; `--only a,b` runs some; `--verbose` streams their output. Each driver
  has a 30 min hang guard (times the load factor) unless it declares `browser-timeout-ms: <n>`
  in its first 4 KB. A
  driver is derived, not listed: a `.mjs` in `tests/browser/` that imports `./harness.mjs`.
- It prints one table: result, duration, and the 1-minute load average when each driver
  started and ended, plus the load factor the driver applied. A driver that measured a missing
  capability prints `[harness] NOT BUILT <n>: ...` (`reportNotBuilt`); its result is NOTBUILT,
  counted neither as a pass nor as a failure (`layout-key-stability`: saved edits on content a
  page rebuilds, reorders or places by live data -- derived from two direct loads of each route
  with identical code, not from a list of routes). Each driver's full output goes
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
- **The toolbar and workspace shells**: `openToolbarSection`, `toolbarSections`, `setLens`
  (Content / Design), `designView` (Canvas / Sitemap / Theme), `openRailTab`, `routeRow` /
  `pageRow` (a Pages-tree row), `openPageFields` / `sheetBody` / `closeSheet`, `openPageSeo`,
  `openSiteSeo`, `openBackground`, `clickHeader`. `appFrame` waits for `#lensDesignBtn` and
  `window.ArkAdminApp`.
