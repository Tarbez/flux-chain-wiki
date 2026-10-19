'use strict';

const assert = require('node:assert');
const fs = require('node:fs');

const app = fs.readFileSync('admin-app.html', 'utf8');
const admin = require('./lib/admin-source.cjs').ADMIN;
const main = fs.readFileSync('js/main.js', 'utf8');
const router = fs.readFileSync('js/ark/page-router.js', 'utf8');
const runtime = fs.readFileSync('js/ark/runtime.js', 'utf8');
const layout = fs.readFileSync('js/content/layout.js', 'utf8');
const host = fs.readFileSync('scripts/publish-host.mjs', 'utf8');
const ignored = fs.readFileSync('.vercelignore', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const studioCss = fs.readFileSync('css/studio-embed.css', 'utf8');
/* Step 2 merge (2026-10-17, flickering-juggling-donut.md): admin-studio.html's entire
   connected-mode script/markup moved into js/admin/admin.js + admin-app.html's own
   #studioRoot container, in the SAME document/script scope -- there is no more separate
   Studio document to read. `studio` below is redefined as the concatenation of the two
   files that logic actually landed in, so every assertion that used to extract a function
   body, a DOM id, or a code snippet out of admin-studio.html's text still finds it,
   wherever it now lives (HTML ids moved into `app`, the ported functions/logic moved into
   `admin`) -- without this file guessing, assertion by assertion, which of the two a given
   snippet landed in. The emptied admin-studio.html itself was deleted afterwards
   (2026-10-18); the assertions below about it check that it STAYS deleted and that
   nothing still serves, ignores, or links to the name. */
const studio = app + '\n' + admin;

// The old standalone #studioNav/#designNav sidebar buttons are gone; since the one workspace
// (2026-10-18) the canvas is not a mode to enter at all: it is always there, and Canvas /
// Sitemap / Theme are views of it (#viewSwitch, see the dedicated block far below).
assert(!app.includes('id="studioNav"') && !app.includes('id="designNav"'), 'the old separate Studio/Design nav buttons stay gone');
assert(app.includes('id="viewCanvasBtn"'), 'the canvas is a view of the one workspace, not a standalone nav button');
// The one header (2026-10-18, owner: "No more one cms for content and one cms for design. Only
// one merged."): Studio's own second header bar is gone -- its controls live in the app header,
// each exactly once, and there is no fixed right panel. These fail if a second bar, a second
// Save or the right inspector comes back.
assert.equal((app.match(/<header\b/g) || []).length, 1, 'the editor has exactly one header');
assert(!app.includes('DEFXN Studio') && !app.includes('id="btnContentCms"'), 'no Studio title and no "Content CMS" button duplicating the mode switch');
assert(!app.includes('id="btnCmsSave"') && (app.match(/id="save"/g) || []).length === 1 && !admin.includes("id: 'save'"), 'one Save button (#save, in the header); no editor builds a Save of its own');
assert(!app.includes('class="right"') && !app.includes('id="tabTheme"') && !app.includes('id="tabSeo"') && !app.includes('id="paneTheme"') && !app.includes('id="paneSeo"'), 'no fixed right panel: its Theme tab was a link to Theme & defaults, its SEO tab moved (page -> #btnPageSeo popover, site -> Theme & defaults)');
assert(!app.includes('id="btnMore"') && !app.includes('id="view"'), 'the More menu (only a shortcuts hint, now in #accountMenu) and the separate Design/Sitemap toggle (now the Design views) are gone');
{
  /* Three tiers since 2026-10-19 (docs/ux-audit/cms.md (b)): the header holds what is used on every
     screen, the More menu (#accountMenu, inside the header) the occasional, and the canvas's own
     strip (#canvasTools, above the canvas) the canvas's controls. Every control exists once. */
  const header = app.slice(app.indexOf('<header class="bar" id="appBar">'), app.indexOf('</header>'));
  const menu = header.slice(header.indexOf('id="accountMenu"'));
  const strip = app.slice(app.indexOf('id="canvasTools"'), app.indexOf('id="stage"'));
  for (const id of ['lensContentBtn', 'lensDesignBtn', 'btnLeftRail', 'btnPage', 'btnPageFields', 'btnUndo', 'btnRedo', 'save', 'publish', 'accountBtn', 'status']) {
    assert.equal((app.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1, '#' + id + ' exists once');
    assert(header.includes('id="' + id + '"') && !menu.includes('id="' + id + '"'), '#' + id + ' is always in the one header');
  }
  for (const id of ['viewCanvasBtn', 'viewMapBtn', 'viewThemeBtn', 'btnPageSeo', 'backgroundBtn', 'versionsNav', 'meshNav', 'connect', 'signOut', 'who']) {
    assert.equal((app.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1, '#' + id + ' exists once');
    assert(menu.includes('id="' + id + '"'), '#' + id + ' lives in the header\'s More menu');
  }
  for (const id of ['devices', 'bpNote', 'btnCheck', 'mode']) {
    assert.equal((app.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1, '#' + id + ' exists once');
    assert(strip.includes('id="' + id + '"'), '#' + id + ' lives on the canvas strip');
  }
}
assert(/function syncHeader\(\) \{[\s\S]*?\$\('canvasTools'\)\.hidden = state\.view === 'map';/.test(admin) && !app.includes('id="canvasNav"'), 'the canvas tools show whenever a canvas is on screen (Canvas and Theme views); the page picker, its fields and its SEO show in every view');
assert(/function renderList\(\) \{[\s\S]*?syncHeader\(\); refreshSaveButton\(\);/.test(admin) && /function setView\(v\) \{[\s\S]*?syncHeader\(\)/.test(admin), 'the header re-syncs on every kind change and every canvas/sitemap switch');
assert(!admin.includes("state.kind = 'studio'") && admin.includes('function connectCanvas()'), 'the canvas is not an editor state to enter: it is connected once, at startup (connectCanvas), and always shown');
assert(!admin.includes("src: 'admin-studio.html'"), 'Step 2: Studio is no longer a separate document loaded into an <iframe> -- renderStudioEditor() builds it directly into #studioRoot, in this same document');
assert(app.includes('id="studioRoot"') && !app.includes('id="studioRoot" hidden') && admin.includes("$('studioRoot')"), 'the workspace lives in one always-shown container in this document, not a second document and not a mode to toggle');
assert(!admin.includes("type === 'defxn-cms-open-content'"), 'Step 2: there is no more postMessage for "open Content CMS" -- Studio\'s own button now calls select(state.current) directly, in the same scope');
assert(admin.includes("function openContentEditor() { setLens('content'); openPageFields({ transient: true }); }"), '"Open in Content" lands on the current page: the Content lens and its every field, by a direct call');
assert(!fs.existsSync('admin-studio.html'), 'admin-studio.html was deleted once Studio merged into admin-app.html; nothing may recreate it as a second editor document');
// The publish host serves root files from an allowlist, so dropping the name there is what
// makes /admin-studio.html a 404 even if a stale copy is left in a deployed root
// (tests/admin-session.test.mjs proves that over HTTP). The gate still locks the editor
// that replaced it: admin-app.html and everything under js/admin/.
assert(!host.includes('admin-studio'), 'the publish host neither serves nor special-cases the retired admin-studio.html');
assert(host.includes("relative === 'admin-app.html' || relative.startsWith('js/admin/')"), 'the publish host still locks the merged editor (admin-app.html + js/admin/*) behind the CMS gate');
assert(!ignored.includes('admin-studio'), '.vercelignore no longer lists a file that does not exist');
assert(ignored.split(/\r?\n/).includes('admin-app.html') && ignored.split(/\r?\n/).includes('js/admin'), 'the merged editor (admin-app.html + js/admin) is still excluded from the public static deployment');
assert(!/(?:src|href)=["'][^"']*admin-studio/.test(app + index), 'no page links to or loads the deleted admin-studio.html');

// Step 1 (admin-studio.html standalone-canvas deletion, see flickering-juggling-donut.md):
// the dense typed-array engine, its CSS compiler, the standalone component/instance system,
// the dense Layers walker, the standalone Library branch, the standalone-only drag/select/
// overlay code, sample seed data, and the dense-encoding "Versions"/export feature are all
// deleted outright -- the owner confirmed deleting the standalone canvas entirely. Sitemap
// and design-checks are ported to read real data (cmsRoutes/cmsSourceSite/realLinkIndex)
// instead of the deleted dense pages()/linkIndex(). Assertions below that exercised deleted
// standalone-only internals are removed, not left failing; assertions about real connected-
// mode mechanisms (js/main.js, admin.js, js/content/*.js -- none of which this step
// touched) are unchanged.
for (const id of ['tabLayers', 'tabPages', 'tabLib', 'tabMedia', 'tabVault', 'designView', 'mapView', 'devices', 'mode', 'btnUndo', 'btnRedo', 'btnCheck', 'save']) {
  assert(studio.includes(`id="${id}"`), `Studio keeps the ${id} feature surface`);
}
// Step 4 (flickering-juggling-donut.md): the Element tab/#paneEl (the fixed property-
// editing accordions) is deleted outright -- #selToolbar (the new floating contextual
// toolbar) is the only property-editing UI now. Theme becomes the default-selected tab.
assert(!app.includes('id="tabEl"') && !app.includes('id="paneEl"'), 'Step 4: the old fixed Element tab/pane is gone, replaced by the floating toolbar');
for (const id of ['btnAdd', 'tabVer', 'paneVer', 'btnPublish', 'btnNewPage', 'btnNewArticle', 'fileIn', 'askModal', 'modal']) {
  assert(!studio.includes(`id="${id}"`), `Step 1 removed the dead ${id} surface along with the standalone feature it only served`);
}
// Full audit (2026-10-18, tests/browser/full-audit.mjs): the dense canvas's own overlays and
// its "editing main component" bar were still in the markup, CSS and placeOverlays(), driven
// by selection state (sel/hover/multiSel/elOf/drag/editingComp) that nothing ever set -- dead
// code that read as live to every text search. Deleted; the preview draws its own selection.
for (const id of ['selBox', 'hoverBox', 'selTag', 'padT', 'tagGrip', 'compBar', 'studioFrameBox']) {
  assert(!app.includes(`id="${id}"`), `the dead dense-canvas surface #${id} stays deleted`);
}
assert(!/\b(?:multiSel|elOf|editingComp|placeMultiOverlays|renderCompBar|studioDenseBox|applyStudioPatches)\b/.test(admin.replace(/\/\*[\s\S]*?\*\//g, '')), 'no executable reference to the dense-canvas selection leftovers remains (comments may name them)');
assert(!/<link[^>]+fonts\.googleapis\.com/.test(studio), 'the Studio shell uses local fonts under the CMS content policy');
assert(admin.includes('function openContentEditor()') && !app.includes('id="btnContentCms"'), 'the canvas still reaches the current page\'s fields (toolbar/Library "Open in Content"), by a direct call instead of a duplicate header button');
// Step 2: 'defxn-studio-load'/'defxn-studio-patch' (and collectCmsPatches()/queueCmsSync(),
// the dead stub that fed the latter) are deleted outright -- there is no more document
// boundary for them to cross. renderStudioEditor() (admin.js) reads siteFromState()/
// studioRoutes() directly on every entry instead of receiving a 'defxn-studio-load'
// message, and Studio's own edits call applyStudioPatches's sibling functions directly.
assert(!admin.includes("type: 'defxn-studio-load'"), 'Step 2: no more message carries the site model across a document boundary -- renderStudioEditor() reads siteFromState() directly');
assert(!admin.includes("type === 'defxn-studio-patch'") && !admin.includes('function collectCmsPatches') && !admin.includes('function queueCmsSync'), 'Step 2: the dead collectCmsPatches()/queueCmsSync() stub and its message type are deleted, not carried forward (a code comment may still name them, explaining why)');
assert(admin.includes('function connectCanvas') && !admin.includes('function renderStudioEditor'), 'the merged app has one function that connects the canvas, in place of the old iframe injection and the later "enter Studio" refresh');
// Step 5 (flickering-juggling-donut.md): saveStudioChanges() (which used to cover Studio
// changes here) is deleted outright and superseded by saveEverything() -- see the dedicated
// Step 5 block far below for the full assertion set on the unified save model.
assert(admin.includes('async function saveEverything()') && !admin.includes('async function saveStudioChanges'), 'Studio changes save through saveEverything() now, not a separate saveStudioChanges() function');
assert(studio.includes('state.cmsRoutes = []'), 'Studio keeps the real route list (studioRoutes()), now read directly by renderStudioEditor() instead of arriving in a defxn-studio-load/preview-state message, replacing the deleted dense pages()/curPage');
assert(studio.includes('69 real DEFXN routes') === false, 'the route total is data-driven, never hard-coded');
assert(studio.includes('id="cmsPreview"'), 'Studio embeds the real DEFXN application as its canvas');
assert(studio.includes('index.html?cms-preview=1#'), 'the exact preview opens the selected public route');
assert(studio.includes('defxn-cms-preview-mode'), 'Edit and Live modes are forwarded into the real renderer');
// Step 4: this unconditional note (and its "Search & AI" shortcut button) lived at the top
// of the now-deleted #paneEl -- it explained why that panel had no content/SEO editing of
// its own. With #paneEl gone, the note has nothing left to be attached to and no audience:
// the Theme/SEO tabs are directly visible, one click away, same as the "Content CMS" button
// already was. Dropped, not silently -- Content CMS and the SEO tab are unaffected and
// still reachable exactly as before (#btnContentCms, #tabSeo).
assert(!admin.includes('Content, SEO, and routing for this page are edited through the authoritative CMS controls'), 'Step 4: the redirect note that used to sit above the (now-deleted) accordions is gone with them, not orphaned');
assert(app.includes('id="lensContentBtn"') && app.includes('id="btnPageFields"') && app.includes('id="btnPageSeo"') && admin.includes('function buildSiteSeoPanel'), 'the Content lens, a page\'s every field (#btnPageFields sheet) and SEO (page: #btnPageSeo popover; site: the Theme view) stay reachable -- only the redundant redirect note pointing at them is gone');
assert(studio.includes("h('h4', { text: 'Components' })") && studio.includes('ArkComponents.groups()'), 'connected Studio library lists the real runtime component system, grouped (tests/components-library.cjs covers it in depth)');
assert(admin.includes('function notifyPreviewState()') && !app.includes('id="frame"') && (app.match(/<iframe\b/g) || []).length === 1, 'every unsaved content draft reaches the ONE canvas (js/admin/bridge.js notifyPreviewState); Content mode\'s second preview iframe (#frame) is gone');
assert(!admin.includes("type: 'defxn-studio-preview-state'"), "Step 2: there is no more 'defxn-studio-preview-state' message -- renderStudioEditor() re-reads siteFromState() directly on every entry instead of being pushed a copy");
assert(main.includes("data.type !== 'defxn-cms-preview-state'"), 'the public runtime accepts full preview state only in preview mode');
/* The re-render is IN PLACE since 2026-10-18 (a same-route draft re-send is not a navigation: the
   route-change transition flashed the canvas blank on every edit). It still rebuilds the active
   route from the new registries -- tests/page-router-refresh-in-place.cjs proves the rebuild. */
assert(main.includes('ArkUI.pageRouter.refresh({ inPlace: true })'), 'preview state re-renders the real active route, in place');
assert(router.includes('refresh: function'), 'the router exposes a preview remount without deployment');
assert(runtime.includes("data-ark-copy-keys"), 'real rendered components retain their authoritative copy keys for click-to-edit');
assert(main.includes('annotateCmsPreviewCopy(site.manifests)'), 'hand-authored page-module copy is also bound to its authoritative manifest field');
assert(main.includes('defxn-cms-preview-layout-change'), 'exact preview reports direct manipulation to Studio');
assert(main.includes("['nw', 'ne', 'se', 'sw']"), 'exact preview exposes four Figma-style corner resize handles');
assert(studio.includes('collapsedLayers'), 'Studio layer groups can collapse and expand');
assert(studio.includes("'cms-frame', 'Frame'"), 'connected inspector exposes numeric frame controls');
assert(admin.includes('function applyStudioLayoutPatch') && !admin.includes("type === 'defxn-studio-layout-patch'"), "Step 2: applyStudioLayoutPatch is called directly from the merged cmsPreview message handler now, not dispatched from a 'defxn-studio-layout-patch' message");
assert(main.includes('cmsGroupSelection'), 'right-click grouping persists selected siblings in a wrapper');
assert(main.includes('cmsAlign'), 'multi-selection can align by edges or centers');
assert(main.includes('cmsDistribute'), 'three or more selected layers can distribute evenly');
assert(layout.includes('canvas,svg,g,path,rect,circle,ellipse,line,polyline,polygon,text'), 'illustration and SVG primitives are selectable layout layers');
assert(studio.includes('Group selection') && studio.includes('Center X'), 'multi-selection alignment and grouping are also available in the inspector');

// Standalone builder (the dense-node canvas, not the connected cmsPreview iframe): its own
// multi-select, right-click grouping into a real Section/Box node, and align/distribute --
// deleted outright in Step 1, along with the rest of the standalone drag/selection system.
// sel/multiSel/elOf/drag.active are kept as permanently-unset leftovers only because
// rectOf()/placeOverlays()/placeMultiOverlays() (the #selTag positioning math) are
// EXPLICITLY not deleted -- confirmed reusable for Step 4's contextual toolbar -- so they
// degrade to a harmless no-op (sel stays -1 forever) instead of being rewritten here.
assert(!studio.includes('function toggleMultiSelect') && !studio.includes('let multiSel'), 'the standalone multi-select is gone; multi-selection lives in the preview (cmsPreviewSelections) and reaches the toolbar as cmsExactSelections');
assert(!studio.includes('function groupableSelection'), 'the standalone align/group precondition check is deleted, not reused for anything connected-mode');
assert(!studio.includes('function groupSelection'), 'the standalone group-into-Box/Section function is deleted with the dense tree it mutated');
assert(!studio.includes('function ungroupSelection'), 'the standalone ungroup function is deleted; connected-mode ungroup already goes through postCmsLayoutOperation(\'ungroup\')');
assert(!studio.includes('function multiAlign') && !studio.includes('function multiDistribute'), 'standalone align/distribute are deleted; connected-mode align/distribute already go through postCmsLayoutOperation');
assert(!studio.includes('function showSelectionContextMenu') && !studio.includes("siteEl.addEventListener"), 'the standalone canvas\'s right-click menu and every siteEl listener are deleted along with siteEl itself (the dense shadow-DOM host)');
assert(!studio.includes("groupSelection('box')"), 'Ctrl/Cmd+G no longer groups a standalone selection; the keydown handler has no g-key branch left to remove');

// Connected mode's visual-design sidebar: real ArkLayout style properties, bound to the
// real site's own design tokens (css/themes.css), not an invented parallel palette.
assert(studio.includes('CMS_TEXT_TOKENS') && studio.includes('CMS_FILL_TOKENS') && studio.includes('CMS_FONT_TOKENS') && studio.includes('CMS_TYPE_SIZE_TOKENS') && studio.includes('CMS_RADIUS_TOKENS') && studio.includes('CMS_BORDER_TOKENS'), 'the real site\'s own token names are mirrored as constants, not reinvented inline');
assert(studio.includes("toolbarSection(pane, 'cms-spacing', 'Spacing'"), 'connected Studio exposes a real Spacing panel');
assert(studio.includes("toolbarSection(pane, 'cms-type', 'Typography'"), 'connected Studio exposes a real Typography panel');
assert(studio.includes("toolbarSection(pane, 'cms-fill', 'Fill and border'"), 'connected Studio exposes a real Fill panel');
assert(studio.includes("toolbarSection(pane, 'cms-effects', 'Effects'"), 'connected Studio exposes a real Effects panel');
assert(studio.includes("ctlSegField(ctx, 'Font', 'font', CMS_FONT_TOKENS") && studio.includes("ctlSegField(ctx, 'Radius', 'radius', CMS_RADIUS_TOKENS"), 'typography and fill controls write the real font/radius tokens, not literal values');
// Step 4: field/segField/selectField/swatchField are consolidated into ONE shared set
// (ctlField/ctlSegField/ctlSelectField/ctlSwatchField), each taking a `ctx` ({get,set})
// instead of closing over its own copy of `draft` -- so postCmsLayoutCommand(draft) now
// appears exactly ONCE (inside makeFrameCtx()'s single ctx.set), not >=5 times across 3
// copy-pasted closures. Assert the consolidation landed: one ctx constructor, one patch
// call site, and every control builder routes through ctx.set/ctx.get rather than posting
// (or reading a draft) on its own.
assert((admin.match(/postCmsLayoutCommand\(draft\)/g) || []).length === 1, 'postCmsLayoutCommand(draft) now has exactly one call site (makeFrameCtx()\'s ctx.set), not one per copy-pasted control closure');
assert(admin.includes('function makeFrameCtx()') && /set: \(key, value\) => \{ draft\[key\] = value; state\.cmsExactSelection\.frame = \{ \.\.\.draft \}; postCmsLayoutCommand\(draft\); renderSelToolbar\(\); \}/.test(admin), 'makeFrameCtx() is the one place a Frame/Layout/Spacing/Typography/Fill/Size/Effects edit patches the real layout and re-renders');
assert(admin.includes('function ctlField(ctx, label, key, opts)') && admin.includes('function ctlSegField(ctx, label, key, options, labelOf)') && admin.includes('function ctlSelectField(ctx, label, key, options, labelOf, opts)') && admin.includes('function ctlSwatchField(ctx, label, key, tokens, allowNone)'), 'the 4 control-builder functions are declared once at module scope, parameterized by ctx, not redeclared per panel');
assert((admin.match(/function ctlField\(/g) || []).length === 1 && (admin.match(/function ctlSegField\(/g) || []).length === 1 && (admin.match(/function ctlSelectField\(/g) || []).length === 1 && (admin.match(/function ctlSwatchField\(/g) || []).length === 1, 'each control-builder function is declared exactly once -- the 3 old copy-pasted closures (canvas-transitions pane, element-motion pane, the big per-element Frame block) are gone');
// The 3 old closures themselves (the exact shapes this file's earlier assertions tested
// for) must no longer exist as closures re-declared per call site.
assert(!/const field = \(label, key, step\) => \{/.test(admin) && !/const segField = \(label, key, options, labels\) => \{\s*const row = document\.createElement\('div'\); row\.className = 'row'; const l = document\.createElement\('label'\); l\.textContent = label;\s*const seg = document\.createElement\('div'\); seg\.className = 'ctl-seg';\s*options\.forEach\(\(opt, i\) => \{ const b = document\.createElement\('button'\); b\.type = 'button'; b\.textContent = \(labels && labels\[i\]\) \|\| opt; b\.setAttribute\('aria-pressed', String\(draft\[key\] === opt\)\);/.test(admin), 'the old per-panel field()/segField() closures (reading/writing a locally-scoped draft) are gone, replaced by the shared ctx-based builders');
assert(layout.includes('TEXT_TOKENS') && layout.includes('FILL_TOKENS') && layout.includes('var(--font-') && layout.includes("hsl(var(--' + "), 'ArkLayout itself writes the real site\'s CSS custom properties for the new style keys');

// Second enrichment pass: Layout (flex/grid container), the rest of Typography, and Size.
assert(studio.includes("toolbarSection(pane, 'cms-layout', 'Layout'"), 'connected Studio exposes a real Layout panel (display/gap/align/justify/wrap)');
assert(studio.includes("toolbarSection(pane, 'cms-size', 'Size'"), 'connected Studio exposes a real Size panel (max width/min height)');
assert(studio.includes("ctlSegField(ctx, 'Weight', 'fw'") && studio.includes("ctlSegField(ctx, 'Line height', 'lh'") && studio.includes("ctlSegField(ctx, 'Align', 'ta'"), 'Typography gained weight, line height, and text align controls');
assert(studio.includes("ctlSegField(ctx, 'Display', 'display', CMS_DISPLAY_TOKENS"), 'Layout writes the real display/flex-direction CSS, not an invented layout model');
assert(layout.includes('applyGroupDefault') && main.includes('cmsNearestCommonAncestor'), 'grouping and the group default survive the new owned style properties being reset on every apply()');

// Undo/redo for connected-mode layout/style edits (previously silently unavailable): the
// real history lives in the iframe next to cmsLayoutDraft, relayed through this page.
assert(main.includes('function cmsSnapshotLayout') && main.includes('function cmsUndoLayout') && main.includes('function cmsRedoLayout'), 'the preview iframe keeps a real undo/redo history for layout/style edits, not just content');
assert(main.includes('cmsSnapshotLayout();') && (main.match(/cmsSnapshotLayout\(\);/g) || []).length >= 5, 'every layout mutation site (field commit, drag, align, distribute, group, ungroup, reset) snapshots before mutating');
assert(studio.includes('function postCmsLayoutUndo') && studio.includes('function postCmsLayoutRedo'), 'Studio relays undo/redo requests into the preview iframe');
/* ONE history since 2026-10-19 (docs/ux-audit/cms.md P1-5): js/admin/history.js interleaves the
   canvas's own entries (reported as 'push') with edits made in the editor's forms, and undo()/redo()
   ask the canvas only when the edit to take back is one of its own */
assert(studio.includes("if (entry.kind === 'canvas') { if (side === 'before') postCmsLayoutUndo(); else postCmsLayoutRedo(); return; }") && studio.includes("if (event.data.reason === 'push') historyCanvasPush(event.data.label);"), 'undo()/redo() are the one history: canvas entries go back to the canvas, form edits through setItemField');
// Step 2: the real preview iframe still reports 'defxn-cms-preview-layout-replace' (that
// boundary is unchanged), but the old second hop -- Studio relaying it up to admin.js via
// 'defxn-studio-layout-replace' -- is gone; the SAME handler calls applyStudioLayoutReplace
// directly, in one hop instead of two.
assert(studio.includes("'defxn-cms-preview-layout-replace'") && !admin.includes("'defxn-studio-layout-replace'"), 'a restored layout reaches admin.js in one hop (the real iframe message), not via a second relayed message');
assert(admin.includes('function applyStudioLayoutReplace') && admin.includes('applyStudioLayoutReplace(event.data.layout)'), 'Content CMS keeps its authoritative layoutDraft in sync with an undo/redo via a direct call from the merged iframe-message handler, the same way it does with a forward patch');

// llms.txt is now a real served file (js/content/seo.js generates it, scripts/lib/
// site-bundle.mjs writes it, this host serves it), not just a Studio "download" button.
assert(host.includes("'llms.txt'"), 'the publish host serves the real llms.txt file, not just robots.txt/sitemap.xml');

// Step 1 superseded the SEO sync bug fix: the dense renderSeoPane() editing UI
// (schemaType/noindex/aiSummary/aiBlocked/lang/org/handle/bots/llms/Canonical URL fields)
// and collectCmsPatches()'s seo branch that forwarded them both read/wrote the deleted
// dense tree, same as the deleted "Authoritative content" panel -- deleted with it.
// Ported 2026-10-18: renderSeoPane() now edits the real seoDraft, one control per ArkSEO
// field definition (tests/seo-fields.cjs). admin.js's receiving side still accepts those
// same fields from any sender.
assert(admin.includes('ArkSEO.sanitize') && admin.includes('function seoFieldRows'), 'the SEO panels edit every field kind (bots is an object, noindex/aiBlocked/llms are 0/1) through seoFieldRows, reconciled by ArkSEO.sanitize at save time -- the old applyStudioPatches relay that also accepted them is deleted with the Studio document');
assert(studio.includes('cmsPageSeo(state.cmsSourceSite'), 'Studio\'s remaining SEO surface (the honest redirect panel and the ported search/AI design-checks) reads real per-route SEO through the same pure cmsPageSeo()/cmsSeoValue() functions cmsSiteSpec used to, not a reinvented lookup');

// Bug fixes from direct user report:
// 1) grouping must be reflected in the sidebar, not just on the canvas.
assert(main.includes('function cmsGroupList') && (main.match(/groups: cmsGroupList\(\)/g) || []).length >= 4, 'every selection/group/ungroup/ready message reports the current route\'s real groups');
// Step 4: "Groups on this page" moved out of the (now-deleted) fixed accordion panel into
// its own persistent block above the Layers tree (#groupsBrowse/renderGroupsBrowse()) --
// it needs no current selection to make sense, unlike every #selToolbar taxonomy section.
assert(app.includes('id="groupsBrowse"'), 'the Layers tab gained a persistent #groupsBrowse container, above the Layers tree');
assert(admin.includes('function renderGroupsBrowse()') && admin.includes("head.textContent = `Groups on this page (${state.cmsGroups.length})`") && admin.includes('postCmsSelectGroup'), 'connected Studio shows a real, clickable list of the current page\'s groups, now rendered into #groupsBrowse');
assert(/function renderLayersPane\(\) \{\s*renderGroupsBrowse\(\);\s*renderConnectedLayers\(\);\s*\}/.test(admin), 'renderLayersPane() paints renderGroupsBrowse() every time it repaints the Layers tree, so the group list never goes stale relative to it');
assert(main.includes("data.type === 'defxn-cms-preview-select-group'"), 'the preview iframe can select a group by id on request from the sidebar list');
// 2) dragging right after grouping must move the group, not reach into a member -- covered
// in depth by tests/cms-group-pick.cjs; this just confirms the fix is wired into both
// interaction entry points (click and right-click), not just one.
assert(main.includes('function cmsResolvePick') && (main.match(/cmsResolvePick\(/g) || []).length >= 3, 'both the click handler and the context-menu handler resolve a raw pick through the group-aware cmsResolvePick, not a plain closest() lookup');

// Link-editing retrofit: a manifest field of kind 'link' gets its own three-way picker
// (Internal page / Reference doc / External URL), reusing the existing routeOptions() route
// picker rather than reinventing it, and Studio's existing generic manifest-patch path
// (typeof patch.value === 'string') already accepts a tagged link value with no special
// case of its own -- that is the whole point of keeping the value a plain string.
assert(admin.includes("field.kind === 'link'"), 'fieldEl renders the link picker for kind \'link\'');
assert(admin.includes('function linkPickerEl'), 'the link picker is one shared function, not duplicated per call site');
assert(admin.includes('function docOptions'), 'reference-doc choices come from a routeOptions()-shaped helper sourced from ArkUI.referenceDocs');
assert(admin.includes('routeOptions()') && (admin.match(/routeOptions\(\)/g) || []).length >= 2, 'the link picker\'s Internal-page control reuses routeOptions(), the same list manifest.meta.next already uses');
assert(admin.includes('function articleLinkField'), 'LearningContent\'s relatedPage/actionPage/evidenceHref get the same tagged picker for consistency');
// applyStudioPatches() (the receiver of the deleted Studio document's patch relay) had no
// caller after the merge and is deleted; a link field's tagged string is edited directly by
// fieldEl()'s link picker, asserted above.

// General component system (Part 3): masters/instances/overrides are real runtime state,
// round-tripped through the connected preview iframe with the same whole-draft-replace
// shape layout undo/redo already uses, never a second, visual-only component system.
assert(main.includes('window.ArkComponents') && main.includes('ArkComponents.renderAll'), 'the real site centrally renders every [data-ark-insert] anchor on each mount, not a per-page-module call');
assert(main.includes("function cmsComponentsCommand"), 'the preview iframe applies every component command through the real ArkComponents mutators');
assert(main.includes("'create-master'") && main.includes("'insert-instance'") && main.includes("'set-override'") && main.includes("'remove-instance'") && main.includes("'update-master'"), 'every ArkComponents mutator is reachable through the one components-command message');
assert(main.includes("'defxn-cms-preview-components-command'"), 'Studio posts component edits into the preview iframe through their own typed message');
assert(main.includes("'defxn-cms-preview-components-replace'"), 'the preview iframe relays the whole updated components draft back to Studio after every edit');
assert(studio.includes('function postCmsComponentsCommand'), 'Studio has one function that posts every component command, mirroring postCmsLayoutCommand');
// Step 2: no more 'defxn-studio-components-replace' relay message -- the merged
// 'defxn-cms-preview-components-replace' handler calls applyStudioComponentsReplace directly.
assert(!admin.includes("'defxn-studio-components-replace'"), 'Step 2: the Studio-document-to-admin.js relay message for components is deleted');
assert(admin.includes('function applyStudioComponentsReplace') && admin.includes('applyStudioComponentsReplace(event.data.components)'), 'Content CMS keeps an authoritative componentsDraft in sync with Studio edits via a direct call, the same way it does for layout');
assert(admin.includes('ArkAdminStore.saveComponents') && admin.includes("download('components-data.js'"), 'Save writes components-data.js through the same connected-project/download split as layout-data.js');
assert(admin.includes('componentsDirty()'), 'unsaved component edits are tracked and surfaced the same way unsaved layout edits are');
assert(fs.readFileSync('js/admin/store.js', 'utf8').includes('async function saveComponents'), 'the store module gained a saveComponents writer alongside saveLayout');
assert(studio.includes('const CMS_BLOCK_RESOLVERS = ArkComponents.blocks();'), 'Studio reads the real block resolver list, labels and prop names from js/content/components.js, not a copy (tests/admin-token-source.cjs forbids the copy)');
assert(studio.includes("action: 'create-master'") && studio.includes("action: 'insert-instance'") && studio.includes("action: 'set-override'") && studio.includes("action: 'remove-instance'"), 'the Library pane and inspector cover the full create/insert/override/remove flow');
assert(studio.includes("'Component instance'") && studio.includes('cmsExactSelection.component'), 'a selected component instance gets its own override panel in the connected inspector, alongside Frame/Spacing/etc.');
assert(fs.readFileSync('js/content/components.js', 'utf8').includes("ArkUI.build"), 'ArkComponents.render reuses the real resolver builder (js/ark/runtime.js), never a second builder');
assert(fs.readFileSync('js/ark/runtime.js', 'utf8').includes('build: build'), 'ArkUI exposes its internal build() for js/content/components.js to reuse');

// Part A (follow-up plan): Delete via keyboard and right-click, connected mode. "Delete" can
// only ever mean remove-a-component-instance, ungroup-a-group, or (for anything else) a
// notice -- never destroying arbitrary real page content. cmsRemoveSelection must reuse the
// SAME mechanisms those already have (cmsComponentsCommand's 'remove-instance' action, the
// same cmsUngroupSelection() the right-click "Ungroup" entry already calls), not a parallel
// path -- the behavioral proof of that lives in tests/cms-remove-selection.cjs.
assert(main.includes('function cmsRemoveSelection'), 'the preview iframe gained one function implementing the three-way delete rule for connected mode');
assert(/function cmsRemoveSelection[\s\S]{0,1200}cmsComponentsCommand\(\{ action: 'remove-instance'/.test(main), 'a component-instance selection removes through the existing remove-instance command, not a new removal mechanism');
assert(/function cmsRemoveSelection[\s\S]{0,1200}cmsUngroupSelection\(\)/.test(main), 'a group selection removes through the existing cmsUngroupSelection(), not a new removal mechanism');
assert(/function cmsRemoveSelection[\s\S]{0,1200}defxn-cms-preview-notice/.test(main), 'a plain real element gets the existing notice postMessage, never a silent no-op or a crash');
assert(main.includes("add('remove', 'Remove', cmsRemoveSelection"), 'the connected right-click menu (and the toolbar\'s More, the same list: cmsSelectionCommands) has a Remove entry wired to the same function');
assert((main.match(/document\.addEventListener\('keydown'/g) || []).length === 1, 'the preview iframe gained exactly one new keydown listener (none existed in this file before Part A)');
assert(/addEventListener\('keydown', function \(event\) \{[\s\S]{0,600}cmsRemoveSelection\(\);/.test(main), 'the new keydown listener calls cmsRemoveSelection on Delete/Backspace, guarded against typing the same way Studio\'s own handler (now in js/admin/admin.js) already is');
assert(main.includes("data.type === 'defxn-cms-preview-remove-selection'"), 'the iframe also accepts a forwarded remove request from the parent document, for the case where keyboard focus stayed there');
assert(studio.includes('function postCmsRemoveSelection'), 'Studio has one function that forwards a remove request into the preview iframe, mirroring postCmsSelectGroup');
assert(studio.includes("e.preventDefault(); postCmsRemoveSelection(); }") && !studio.includes('removeSel()'), 'Step 1 simplified the keydown handler\'s Delete/Backspace branch to always forward into the connected iframe -- the standalone-only removeSel() fallback is deleted along with the rest of the standalone engine, since cmsConnected is always true going forward');

// Part B (follow-up plan): a real layers tree for connected mode. renderLayers() walked the
// standalone dense-node tree unconditionally -- meaningless while connected -- so a parallel
// renderConnectedLayers(), driven by the iframe's own real-DOM report (cmsRealTree), replaces
// it there; the behavioral proof of cmsRealTree's own shape lives in tests/cms-real-tree.cjs.
assert(layout.includes('function setLabel') && layout.includes('function labelFor'), 'ArkLayout gained setLabel/labelFor for a real element\'s editable display name, mirroring group()/sanitize()\'s own style');
assert(layout.includes('out.labels[route] = cleanLabels'), 'sanitize() produces a labels map alongside routes/groups, capped and cleaned the same way, not a separate unsanitized shape');
assert(main.includes('function cmsRealTree'), 'the preview iframe gained one function that walks the real DOM into a layers tree, mirroring the standalone tree\'s own shape');
assert(/function cmsRealTree[\s\S]{0,200}ArkLayout\.annotate\(host(, route)?\)/.test(main), 'cmsRealTree re-annotates the host first, the same guarantee the click handler already relies on before resolving a pick');
assert(/tag === 'svg' \? \[\] : walk\(element\)/.test(main), 'a whole <svg> is treated as one leaf row, never recursed into -- its internals stay reachable only through the existing "Enter illustration" escape hatch');
assert(main.includes('function cmsElementForKey'), 'the hide toggle and rename resolve a tree row by its stable key, independent of whatever happens to be selected right now');
assert(main.includes('function setCmsLayoutFrameForKey'), 'the hide toggle reuses setCmsElementFrame (the exact ArkLayout.set() mechanism every Frame/Fill control already uses), keyed to an explicit element instead of cmsPreviewSelected');
assert(/data\.key\) setCmsLayoutFrameForKey\(data\.key, data\.frame, true\); else setCmsLayoutFrame\(data\.frame, true\)/.test(main), 'the layout-command handler dispatches to the keyed path only when a key is given, so every existing Frame/Fill caller (which never passes one) is unaffected');
assert(main.includes("data.type === 'defxn-cms-preview-select-group'") && /select-group[\s\S]{0,400}data\.id \|\| data\.key/.test(main), 'select-by-id (an existing layout group) and select-by-key (any annotated row) share the one message handler, generalized rather than duplicated into a sibling message type');
assert(main.includes("data.type === 'defxn-cms-preview-set-label'") && main.includes('ArkLayout.setLabel(cmsLayoutDraft'), 'renaming a row writes through ArkLayout.setLabel on the same cmsLayoutDraft every other layout edit already mutates');
assert((main.match(/tree: cmsRealTree\(host, ?[^)]*\)/g) || []).length >= 8, 'the real tree rides along on every message that already reports groups/selection state, not a second poll-based round trip');
assert(studio.includes('function renderConnectedLayers'), 'Studio gained the connected-mode equivalent of renderLayers(), reusing the same row markup conventions (.layer-toggle, role=treeitem, aria-selected, collapsedLayers)');
assert(studio.includes('function renderLayersPane') && studio.includes('renderLayersPane();'), 'the render loop goes through one renderLayersPane() dispatcher rather than calling renderConnectedLayers() directly at each call site');
assert(/renderLayersPane\(\); renderPages\(\)/.test(studio), 'the main render loop now paints the connected-aware dispatcher, not renderLayers() unconditionally');
assert(studio.includes('state.cmsTree = []'), 'Studio tracks the iframe-reported real tree the same way it already tracks cmsGroups/cmsComponentAnchors');
assert(studio.includes('function postCmsSelectKey'), 'a row click posts select-by-key, generalizing postCmsSelectGroup\'s existing message rather than a new one');
assert(studio.includes('function postCmsSetLabel') && studio.includes("'defxn-cms-preview-set-label'"), 'a row rename posts through its own typed message, mirroring postCmsSelectGroup/postCmsRemoveSelection\'s own shape');
assert(/function postCmsLayoutCommand\(frame, key\)/.test(studio), 'postCmsLayoutCommand gained an optional key parameter for the eye icon, so a hide toggle can target a row that is not the current selection -- every other caller omits it and is unaffected');
assert(studio.includes("postCmsLayoutCommand({ display: row.hidden ? null : 'hide' }, row.key)"), 'the eye icon toggles through the exact same postCmsLayoutCommand path the Frame/Fill accordion\'s own Display control already uses, not a parallel mechanism');
assert(admin.includes("patch.operation === 'set-label'") && admin.includes('ArkLayout.setLabel(state.layoutDraft'), 'Content CMS\'s authoritative layoutDraft gains the same set-label branch applyStudioLayoutPatch already dispatches group/ungroup/reset/frame-set through, so a rename actually persists on Save');

// Part F (earlier follow-up plan) built restrictMode as shared scaffolding for two
// dedicated, narrowed Studio modes (canvas-only, anim-only). Step 4 (flickering-juggling-
// donut.md) retires it OUTRIGHT -- a deliberate decision, not a default -- because the
// plan explicitly asked for "ONE toolbar, not a toolbar PLUS a separate restricted-mode
// system bolted on the side": canvas-transitions became a selection-independent popover
// (openCanvasTransitionsPopover(), reachable from #btnCanvasTransitions above the canvas),
// and element-motion folded into #selToolbar as one more accordion section
// (buildElementMotionSection()), shown for any real element selection. Assert the retirement
// is complete: the variable, its enter/exit/toggle, its banner, and its DOM are all gone.
assert(!admin.includes('let restrictMode') && !admin.includes('function enterRestrictMode') && !admin.includes('function exitRestrictMode') && !admin.includes('function toggleRestrictMode') && !admin.includes('function renderRestrictBar') && !admin.includes('function renderRestrictLayersPane'), 'Step 4: restrictMode and its whole enter/exit/toggle/banner/placeholder scaffolding are deleted outright, not merely unused');
assert(!app.includes('id="restrictBar"') && !app.includes('id="restrictBarText"') && !app.includes('id="restrictSwitch"') && !app.includes('id="restrictDone"'), 'Step 4: the restrict banner DOM is deleted along with the state it displayed');
assert(!/\brestrictMode\b/.test(admin.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')), 'Step 4: no executable reference to restrictMode remains anywhere in admin.js (comments may still name it, explaining the retirement)');

// enterComp/exitComp (the dense "edit main component" feature) were already deleted in an
// earlier step; editingComp stays -1 forever as a harmless leftover placeOverlays()/
// renderCompBar() still read -- unaffected by restrictMode's own retirement here.
assert(!admin.includes('function enterComp') && !admin.includes('function exitComp'), 'enterComp/exitComp remain deleted; editingComp still stays -1 forever');

// Canvas-transitions: a small popover (reusing openPop()'s own positioning), not a mode.
// Since the one header (2026-10-18) its button is the Background segment of the views.
assert(app.includes('id="backgroundBtn"') && !app.includes('id="btnCanvasTransitions"'), 'the site-wide, selection-independent background-transition panel opens from the header\'s Background segment');
assert(/function openCanvasTransitionsPopover\(\) \{[\s\S]{0,400}openPop\(anchor, renderCanvasTransitionsPopoverContent, 'left'\);/.test(admin), 'openCanvasTransitionsPopover() reuses openPop() directly rather than a second positioning system');
assert(/function openCanvasTransitionsPopover\(\) \{\s*const anchor = \$\('backgroundBtn'\);[\s\S]{0,200}if \(state\.view === 'map'\) setView\('design'\);/.test(admin), 'Background brings the canvas back first from the sitemap (it previews on the real page; the Theme view already shows the canvas)');
assert(admin.includes("$('backgroundBtn').addEventListener('click', openCanvasTransitionsPopover);"), 'the Background segment opens the popover anchored to itself');

// Entry point: js/main.js posts the SAME unconditional mode-level action up to Studio
// (that protocol boundary is untouched, per this step's scope) -- only the receiving side
// changed, from enterRestrictMode('canvas') to the new popover.
/* "Edit canvas" opened the page-transition popover, which its name did not say: it is "Page
   transition…" since 2026-10-19 (docs/ux-audit/cms.md P1-8), still unconditional, never disabled,
   in the one command list both menus draw (cmsSelectionCommands) */
assert(/add\('page-transition', 'Page transition…', function \(\) \{ window\.parent\.postMessage\(\{ type: 'defxn-cms-preview-enter-canvas-mode' \}, location\.origin\); \}, '', 'site'\)/.test(main), "the selection commands end with an unconditional 'Page transition…' entry that is never disabled and not gated on any selection");
assert(admin.includes("else if (event.data.type === 'defxn-cms-preview-enter-canvas-mode') openCanvasTransitionsPopover();"), "admin.js's message handler for the connected preview iframe now opens the popover on that message, instead of entering the deleted restrictMode");

// Step 4: restrictMode is retired, so every "Step 6" live-guard site that used to thread
// `|| restrictMode` into its condition loses that term too -- asserted exhaustively here
// (the same discipline the original Step 6 pass used in reverse) so a future edit that
// silently reintroduces the term, or drops one of the OTHER terms in the same guard by
// mistake while touching it, is caught.
const liveGuardSites = [
  "if (typing || state.live || state.view === 'map') return;",
  "bn.hidden = state.device === 0 || state.live || state.view === 'map' || state.lens !== 'design';",
];
for (const site of liveGuardSites) assert(admin.includes(site), `restrictMode's removal left this live-guard site intact otherwise: ${JSON.stringify(site.slice(0, 70))}`);
const deletedGuardSites = [
  "siteEl.addEventListener('pointerover'", "siteEl.addEventListener('dblclick'", "frame.addEventListener('dragover'",
  "setInterval(() => { if (sel >= 0 && !live && !restrictMode",
];
for (const site of deletedGuardSites) assert(!admin.includes(site), `the standalone-only guard site should stay gone: ${JSON.stringify(site.slice(0, 50))}`);
assert(admin.includes("checkT = setTimeout(() => { if (state.view === 'design') measureChecks()"), 'queueCheck() drops the restrictMode guard along with restrictMode itself; drag.active/editingComp < 0 stay dropped from the earlier step');

// Part G (earlier follow-up plan): canvas-transitions' real panel/content module (Step 4
// retired the restrictMode branch it used to be dispatched from -- see above -- but the
// content module, its runtime wiring, and the save pipeline below are unaffected).
assert(fs.existsSync('js/content/canvas-transitions.js') && fs.existsSync('js/content/canvas-transitions-data.js'), 'the site-wide background-transition content module and its data file exist');
const canvasTransitions = fs.readFileSync('js/content/canvas-transitions.js', 'utf8');
assert(canvasTransitions.includes('var ArkCanvasTransitions') && canvasTransitions.includes('function sanitize(') && canvasTransitions.includes('function define(') && canvasTransitions.includes('function get(') && canvasTransitions.includes('function serialize('), 'ArkCanvasTransitions follows the same sanitize/define/get/serialize convention as every other content module');
assert(canvasTransitions.includes('function apply(element, phase)'), 'ArkCanvasTransitions exposes the one real runtime entry point the plan specifies: apply(element, phase)');
assert(index.includes('src="js/content/canvas-transitions.js"') && index.includes('src="js/content/canvas-transitions-data.js"'), 'index.html loads the new content module and its data file');
assert(app.includes('src="js/content/canvas-transitions.js"') && app.includes('src="js/content/canvas-transitions-data.js"'), 'admin-app.html loads the new content module and its data file, the same as every other Studio-editable content module');
assert(index.indexOf('src="js/content/canvas-transitions.js"') > index.indexOf('src="js/content/states-data.js"'), 'canvas-transitions.js loads right after the most recently added *-data.js pair (states), the same slot the plan specifies');
assert(index.indexOf('src="js/content/canvas-transitions-data.js"') < index.indexOf('src="js/ark/page-router.js'), 'canvas-transitions-data.js loads before page-router.js, which reads window.ArkCanvasTransitions at runtime');

// Real runtime wiring: js/ark/page-router.js's navigate() calls a small guarded
// fadeCanvas() helper at the two sequencing points the plan specifies, never touching
// js/lattice.js's camera-pan code or js/zero-webgl.js (neither file is referenced here).
assert(router.includes('function fadeCanvas(phase)') && router.includes("if (!window.ArkCanvasTransitions) return;") && router.includes("scene.querySelector('[data-ark-layer=\"persistent\"]')"), 'page-router.js gains a small, defensively-guarded fadeCanvas() helper against the same persistent-layer element js/lattice.js/js/hero-motion.js already append into');
/* both fades are skipped by an in-place refresh (the same route re-rendered, not a navigation:
   tests/page-router-refresh-in-place.cjs); for a navigation the order is unchanged */
assert(/if \(!inPlace\) \{ scene\.dataset\.transition = 'running'; fadeCanvas\('out'\); \}\s*var outgoing = active;/.test(router), "fadeCanvas('out') runs at the same point scene.dataset.transition is set to 'running', strictly before presence.hide(outgoing, ...) is awaited");
assert(/\} else entering = presence\.show\(page, immediate\)\.then\(function \(\) \{\s*if \(stageRetention\) stageRetention\.activate\(mounted\[page\]\);\s*\}\);\s*\/\/ The background fade-in starts strictly after[\s\S]{0,400}if \(!inPlace\) fadeCanvas\('in'\);/.test(router), "fadeCanvas('in') runs strictly after presence.show()/enter() has already been invoked for the incoming page, never before");

// Studio's canvas-transitions panel: real controls, reading cmsSourceSite.canvasTransitions
// and writing through postCmsCanvasTransitionsCommand/postCmsCanvasTransitionPreview --
// never a parallel sanitize path of its own (this document has no <script src> for the
// content modules). Step 4: it is now content for a popover, not a restrictMode branch.
assert(studio.includes('function renderCanvasTransitionsPopoverContent(pane)'), 'the canvas-transitions panel is a real function building a popover\'s content, not a restrictMode-dispatched pane');
assert(studio.includes("openPop(anchor, renderCanvasTransitionsPopoverContent, 'left')"), 'openCanvasTransitionsPopover() opens it as a popover anchored to the header\'s Background segment');
assert(studio.includes('function postCmsCanvasTransitionsCommand(patch)') && studio.includes("type: 'defxn-cms-preview-canvas-transitions-command'"), 'field edits post a typed command into the connected preview iframe, mirroring postCmsStatesCommand\'s own shape');
assert(studio.includes('function postCmsCanvasTransitionPreview()') && studio.includes("type: 'defxn-cms-preview-canvas-transitions-preview'"), '"Preview this transition" posts its own one-shot message, never reusing the field-edit command type');
assert(studio.includes("preview.addEventListener('click', postCmsCanvasTransitionPreview)"), 'the panel\'s Preview button is wired to postCmsCanvasTransitionPreview');
// Step 2: the real iframe still reports 'defxn-cms-preview-canvas-transitions-replace'
// (unchanged boundary), but the old second hop ('defxn-studio-canvas-transitions-replace',
// Studio relaying up to admin.js) is gone -- the same handler updates cmsSourceSite AND
// calls applyStudioCanvasTransitionsReplace directly, one hop instead of two.
assert(studio.includes("'defxn-cms-preview-canvas-transitions-replace'") && studio.includes('cmsSourceSite.canvasTransitions = event.data.canvasTransitions') && !admin.includes("'defxn-studio-canvas-transitions-replace'"), 'canvas-transitions reaches admin.js in one hop (the real iframe message), not via a second relayed message');
assert(studio.includes('const CMS_CANVAS_EFFECTS = ArkCanvasTransitions.effects();') && studio.includes('const CMS_CANVAS_EASINGS = ArkCanvasTransitions.easings();'), 'the two option lists are read from js/content/canvas-transitions.js (admin-app.html loads it), the same as CMS_FILL_TOKENS/CMS_DISPLAY_TOKENS read ArkLayout');

// js/main.js: the live preview iframe is the one document that actually has
// ArkCanvasTransitions loaded, so it computes every sanitize() for real and owns the
// one-shot preview against its own persistent layer.
assert(main.includes('var cmsCanvasTransitionsDraft') && main.includes('function cmsCanvasTransitionsCommand(data)') && main.includes('function cmsCanvasTransitionsPreview()'), 'js/main.js holds the live draft and both command handlers, mirroring cmsStatesDraft/cmsStatesCommand\'s shape');
assert(main.includes("data.type === 'defxn-cms-preview-canvas-transitions-command'") && main.includes("data.type === 'defxn-cms-preview-canvas-transitions-preview'"), 'both new message types are dispatched from the one big window message listener, the same as every other cmsXCommand');
assert(main.includes('ArkCanvasTransitions.define(site.canvasTransitions)'), 'the defxn-cms-preview-state handler seeds cmsCanvasTransitionsDraft from site.canvasTransitions, the same round trip layout/components/states already use');
assert(/ArkCanvasTransitions\.apply\(persistentEl, 'out'\)[\s\S]{0,200}setTimeout\(function \(\) \{ try \{ ArkCanvasTransitions\.apply\(persistentEl, 'in'\); \} catch \(e\) \{\} \}, outMs\)/.test(main), 'the preview handler applies out then schedules in after the real returned duration, reusing apply() exactly as navigate() does, never a separate preview-only animation path');

// js/admin/admin.js + js/admin/store.js: the save-path architecture decision -- the
// editing UI lives in Studio (merged into js/admin/admin.js), and persistence still goes
// through this exact draft/saved/dirty + saveEverything() pipeline (Step 5,
// flickering-juggling-donut.md -- saveEverything() supersedes the old saveStudioChanges(),
// which only covered 8 of the 13 real drafts and aborted the whole batch on one draft's
// error; see the dedicated Step 5 block far below), mirroring
// statesDraft/applyStudioStatesReplace/ArkAdminStore.saveStates precisely.
assert(admin.includes('state.canvasTransitionsDraft = ') && admin.includes('function canvasTransitionsDirty()'), 'admin.js keeps a canvasTransitionsDraft + dirty-check, the same shape as statesDraft/statesDirty');
assert(admin.includes('function applyStudioCanvasTransitionsReplace(whole)') && admin.includes('applyStudioCanvasTransitionsReplace(event.data.canvasTransitions)'), 'admin.js applies the replace via a direct call from the merged cmsPreview-message handler, the same way it does for applyStudioStatesReplace');
assert(admin.includes("canvasTransitions: { draft: function () { return state.canvasTransitionsDraft; }") && admin.includes('dirty: canvasTransitionsDirty, save:') && fs.readFileSync('js/admin/store.js', 'utf8').includes("{ key: 'canvasTransitions', kind: 'single', global: 'ArkCanvasTransitions', label: 'Canvas transitions'") && admin.includes('ArkAdminStore.saveCanvasTransitions(state.cdirs.content, state.canvasTransitionsDraft)') && admin.includes("download('canvas-transitions-data.js', ArkCanvasTransitions.serialize(state.canvasTransitionsDraft))"), 'saveEverything() writes canvas-transitions-data.js on an explicit Save, the same connected-project-or-download branch every other draft already uses');
assert(/function siteFromState\(\) \{[\s\S]{0,1200}ArkAdminStore\.drafts\(\)\.forEach[\s\S]{0,900}else if \(d\.kind === 'single'\) site\[d\.key\] = window\[d\.global\] \? clone\(singleDraftHandle\(d\.key\)\.draft\(\)\) : null;/.test(admin), 'siteFromState() includes canvasTransitions (every single draft js/admin/store.js lists; tests/site-drafts.test.mjs checks the list), so Studio and the connected preview receive it with every site snapshot');
const store = fs.readFileSync('js/admin/store.js', 'utf8');
assert(store.includes('async function saveCanvasTransitions(contentDir, whole)') && store.includes("write(contentDir, 'canvas-transitions-data.js', ArkCanvasTransitions.serialize(whole))") && store.includes('saveCanvasTransitions: saveCanvasTransitions'), 'ArkAdminStore gains saveCanvasTransitions, a single-file write exactly like saveMeshSettings/saveTheme/saveSettingsDefaults/saveStates');

// Part H (earlier follow-up plan): the per-element animation-override content module and
// its runtime wiring (Step 4 folded the Studio-side panel that used to be dispatched from
// restrictMode === 'anim' into #selToolbar as buildElementMotionSection() -- see above --
// but the content module itself and the save pipeline below are unaffected).
assert(fs.existsSync('js/content/element-motion.js') && fs.existsSync('js/content/element-motion-data.js'), 'the per-element animation-override content module and its data file exist');
const elementMotion = fs.readFileSync('js/content/element-motion.js', 'utf8');
assert(elementMotion.includes('var ArkElementMotion') && elementMotion.includes('function sanitize(') && elementMotion.includes('function define(') && elementMotion.includes('function get(') && elementMotion.includes('function serialize('), 'ArkElementMotion follows the same sanitize/define/get/serialize convention as every other content module');
assert(elementMotion.includes('function entryFor(') && elementMotion.includes('function set(') && elementMotion.includes('function remove('), 'ArkElementMotion exposes a pure single-entry lookup plus set()/remove(), the per-key equivalents of ArkLayout.labelFor()/set()/remove()');
assert(elementMotion.includes("var ROUTE_CAP = 500, KEY_CAP = 3000, ROUTE_LEN = 300, KEY_LEN = 500;"), 'ArkElementMotion reuses the exact SAME route/key caps ArkLayout.sanitize() uses, not a second set of limits');
assert(elementMotion.includes("var EASINGS = ['ease', 'ease-out', 'ease-in-out'];"), 'ArkElementMotion reuses the exact same easing enum ArkCanvasTransitions already defined, for consistency across the two new Studio animation systems');
assert(elementMotion.includes('MIN_MS = 0, MAX_MS = 1200') && elementMotion.includes('MIN_DISTANCE = 0, MAX_DISTANCE = 60'), 'duration/delay are clamped 0-1200ms (the same ceiling ArkCanvasTransitions already uses) and distance is clamped 0-60px (the same rough magnitude family as createPresence\'s own hardcoded 8px/6px translate, never an unrelated scale)');
assert(index.includes('src="js/content/element-motion.js"') && index.includes('src="js/content/element-motion-data.js"'), 'index.html loads the new content module and its data file');
assert(app.includes('src="js/content/element-motion.js"') && app.includes('src="js/content/element-motion-data.js"'), 'admin-app.html loads the new content module and its data file, the same as every other Studio-editable content module');
assert(index.indexOf('src="js/content/element-motion.js"') > index.indexOf('src="js/content/canvas-transitions-data.js"'), 'element-motion.js loads right after the canvas-transitions pair (Part G), the slot the plan specifies');
assert(index.indexOf('src="js/content/element-motion-data.js"') < index.indexOf('src="js/ark/scene-state.js') && index.indexOf('src="js/content/element-motion-data.js"') < index.indexOf('src="js/main.js'), 'element-motion-data.js loads before scene-state.js (which reads window.ArkElementMotion at runtime) and before main.js');

// Real runtime wiring: ArkUI.createPresence's per-item stagger (js/ark/scene-state.js)
// gains one additive override check per item -- never a restructure of the surrounding
// computation -- guarded the same defensively as page-router.js's own fadeCanvas().
const sceneState = fs.readFileSync('js/ark/scene-state.js', 'utf8');
assert(sceneState.includes('function elementMotionOverride(pageEl, item)') && sceneState.includes('if (!window.ArkElementMotion'), 'scene-state.js gains a small, defensively-guarded elementMotionOverride() helper, mirroring fadeCanvas()\'s own "missing script degrades to no override, never a throw" shape');
assert(/var override = elementMotionOverride\(el, item\);[\s\S]{0,40}var shifted, delay, duration, easing;[\s\S]{0,40}if \(override\) \{/.test(sceneState), 'the per-item stagger map computes the override check first, then branches -- additive, not a restructure of the default computation below it');
assert(/\} else \{\s*shifted = 'translate3d\(0,' \+ \(active \? 8 : -6\) \+ 'px,0\)' \+ \(base === 'none' \? '' : ' ' \+ base\);\s*delay = step \* \(active \? index : items\.length - index - 1\);/.test(sceneState), "the default (no-override) branch is copied verbatim from today's existing computation -- byte-identical when no override is stored, the critical regression bar for this part");
assert(sceneState.includes('window.ArkElementMotion.vectorFor(override.direction)'), 'the override branch resolves a direction to a translate vector through ArkElementMotion.vectorFor(), never a second hand-written direction table');

// Layers-tab dispatch: a plain, un-dispatched renderLayersPane() now -- Step 4 removed the
// restrictMode === 'canvas' branch that used to override it (renderRestrictLayersPane() is
// gone), and there is no anim-mode-vs-canvas-mode distinction left for it to make. The real
// Layers tree is simply always there, which is also how selecting an element to animate
// works now (no separate "anim mode" needs to land on it first).
assert(/function renderLayersPane\(\) \{\s*renderGroupsBrowse\(\);\s*renderConnectedLayers\(\);\s*\}/.test(admin), 'renderLayersPane() is a plain dispatcher now: renderGroupsBrowse() then renderConnectedLayers(), no restrictMode branch left to take priority over it');
// Step 2: Studio's own CSS is no longer an inline <style> block inside admin-studio.html --
// it is css/studio-embed.css, scoped under #studioRoot (see that file's own header comment).
assert(!/\.anim-mode \.left/.test(studioCss) && !/\.canvas-mode \.left/.test(studioCss), 'Step 4: both the anim-mode and canvas-mode left-rail CSS rules are gone along with the classes that drove them -- the Layers tree is unconditionally visible now');

// Selection still works for any real element (there is no more "anim mode" to have carved
// out an exception for it): the Layers tree's own click-to-select handler (postCmsSelectKey)
// and its receiving end in js/main.js were never gated on restrictMode, and still aren't.
assert(/li\.addEventListener\('click', \(event\) => \{ if \(event\.target\.closest\('\.layer-toggle'\)[\s\S]{0,140}postCmsSelectKey\(row\.key\); \}\);/.test(studio), "renderConnectedLayers()'s row click handler calls postCmsSelectKey() unconditionally");
assert(studio.includes('function postCmsSelectKey(key) { if (!state.cmsConnected || !cmsPreview.contentWindow) return;'), 'postCmsSelectKey() is gated only on cmsConnected');
assert(main.includes("data.type === 'defxn-cms-preview-select-group'"), "js/main.js's receiving handler for a Layers-row click is unchanged");

// Element-motion: folded into #selToolbar as one more accordion section
// (buildElementMotionSection()), shown for any real (non-group) selection ALONGSIDE the
// taxonomy section(s) for that selection's kind -- not a restrictMode-dispatched pane, and
// not gated behind a separate "pick something first" hint, since the WHOLE toolbar (per
// selToolbarVisible()) already does not render at all with nothing selected.
assert(admin.includes('function buildElementMotionSection(pane)'), 'the element-motion panel is a toolbar SECTION builder now, not a restrictMode-dispatched pane');
assert(/if \(state\.cmsExactSelection\.component\) buildComponentInstanceSection\(box\);\s*if \(state\.cmsExactSelection\.stateGroup\) buildStateGroupSection\(box\);\s*buildElementMotionSection\(box\);/.test(admin), 'renderSelToolbar() always calls buildElementMotionSection() for a real element selection (the kind !== \'group\' branch), unconditionally -- it is one more section, not a mode');
assert(!admin.includes("'Select an element in the Layers panel to animate it.'"), 'the old "pick something first" hint is gone -- renderSelToolbar()\'s own selToolbarVisible() guard already keeps the whole toolbar (animation section included) from rendering with nothing selected, so the hint text is now dead code, not a safety net');
assert(admin.includes('const CMS_ELEMENT_MOTION_DIRECTIONS = ArkElementMotion.directions();'), 'the direction enum is read from js/content/element-motion.js, the module that validates it');
assert(/ctlSegField\(ctx, 'Easing', 'easing', CMS_ELEMENT_MOTION_EASINGS\)/.test(admin) && admin.includes('const CMS_ELEMENT_MOTION_EASINGS = ArkElementMotion.easings();'), 'the element-animation easing picker offers what ArkElementMotion.sanitize() keeps -- its own easings(), not the canvas-transitions list it happens to equal today');
assert(admin.includes('function postCmsElementMotionCommand(patch)') && admin.includes("type: 'defxn-cms-preview-element-motion-command'"), 'field edits post a typed command into the connected preview iframe, mirroring postCmsCanvasTransitionsCommand\'s own shape');
assert(admin.includes('function postCmsElementMotionPreview(key)') && admin.includes("type: 'defxn-cms-preview-element-motion-preview'"), '"Preview" posts its own one-shot message, never reusing the field-edit command type');
assert(admin.includes("postCmsElementMotionPreview(state.cmsExactSelection.key)"), 'the section\'s Preview button targets the currently selected element\'s key');
// Step 2: same one-hop collapse as canvas-transitions above.
assert(studio.includes("'defxn-cms-preview-element-motion-replace'") && studio.includes('cmsSourceSite.elementMotion = event.data.elementMotion') && !admin.includes("'defxn-studio-element-motion-replace'"), 'element-motion reaches admin.js in one hop (the real iframe message), not via a second relayed message');

// js/main.js: the live preview iframe is the one document that actually has
// ArkElementMotion loaded, so it computes every set()/sanitize() for real and builds the
// one-shot Preview animation from the SAME vectorFor()/sign convention scene-state.js uses.
assert(main.includes('var cmsElementMotionDraft') && main.includes('function cmsElementMotionCommand(data)') && main.includes('function cmsElementMotionPreview(key)'), 'js/main.js holds the live draft and both command handlers, mirroring cmsCanvasTransitionsDraft/cmsCanvasTransitionsCommand\'s shape');
assert(main.includes("data.type === 'defxn-cms-preview-element-motion-command'") && main.includes("data.type === 'defxn-cms-preview-element-motion-preview'"), 'both new message types are dispatched from the one big window message listener, the same as every other cmsXCommand');
assert(main.includes('ArkElementMotion.define(site.elementMotion)'), 'the defxn-cms-preview-state handler seeds cmsElementMotionDraft from site.elementMotion, the same round trip canvasTransitions/layout/components/states already use');
assert(main.includes('ArkElementMotion.vectorFor(entry.direction)') && main.includes('ArkElementMotion.entryFor(cmsElementMotionDraft'), 'cmsElementMotionPreview reads the DRAFT\'s current value (not whatever is already saved) and resolves direction through the same vectorFor() table scene-state.js\'s own override branch uses, so the two can never describe a direction differently');

// js/admin/admin.js + js/admin/store.js: the save-path architecture decision -- the
// editing UI lives in Studio (merged into js/admin/admin.js), and persistence still goes through this exact
// draft/saved/dirty + saveEverything() pipeline (Step 5 -- see the matching
// canvasTransitions comment above), mirroring canvasTransitionsDraft/
// applyStudioCanvasTransitionsReplace/ArkAdminStore.saveCanvasTransitions precisely.
assert(admin.includes('state.elementMotionDraft = ') && admin.includes('function elementMotionDirty()'), 'admin.js keeps an elementMotionDraft + dirty-check, the same shape as canvasTransitionsDraft/canvasTransitionsDirty');
assert(admin.includes('function applyStudioElementMotionReplace(whole)') && admin.includes('applyStudioElementMotionReplace(event.data.elementMotion)'), 'admin.js applies the replace via a direct call from the merged cmsPreview-message handler, the same way it does for applyStudioCanvasTransitionsReplace');
assert(admin.includes("elementMotion: { draft: function () { return state.elementMotionDraft; }") && admin.includes('dirty: elementMotionDirty, save:') && fs.readFileSync('js/admin/store.js', 'utf8').includes("{ key: 'elementMotion', kind: 'single', global: 'ArkElementMotion', label: 'Element animation'") && admin.includes('ArkAdminStore.saveElementMotion(state.cdirs.content, state.elementMotionDraft)') && admin.includes("download('element-motion-data.js', ArkElementMotion.serialize(state.elementMotionDraft))"), 'saveEverything() writes element-motion-data.js on an explicit Save, the same connected-project-or-download branch every other draft already uses');
assert(/function siteFromState\(\) \{[\s\S]{0,1200}ArkAdminStore\.drafts\(\)\.forEach[\s\S]{0,900}else if \(d\.kind === 'single'\) site\[d\.key\] = window\[d\.global\] \? clone\(singleDraftHandle\(d\.key\)\.draft\(\)\) : null;/.test(admin), 'siteFromState() includes elementMotion (every single draft js/admin/store.js lists; tests/site-drafts.test.mjs checks the list), so Studio and the connected preview receive it with every site snapshot');
assert(store.includes('async function saveElementMotion(contentDir, whole)') && store.includes("write(contentDir, 'element-motion-data.js', ArkElementMotion.serialize(whole))") && store.includes('saveElementMotion: saveElementMotion'), 'ArkAdminStore gains saveElementMotion, a single-file write exactly like saveCanvasTransitions/saveStates');

// One workspace (2026-10-18, owner: "I only want to see ONE CMS, unified."): the Content |
// Design switch used to change APPS (state.mode over state.kind: a page list + form + its own
// preview frame, or the canvas). It is now a LENS on the one canvas -- what a click there edits
// -- and nothing is torn down or swapped when it changes.
assert(!/\bstate\.mode\b/.test(admin) && !admin.includes('function kindMode') && !admin.includes('function syncMode') && !admin.includes('function setMode'), 'no app mode is left: no state.mode, kindMode(), syncMode() or setMode()');
assert(/state\.lens = 'content';/.test(admin) && admin.includes("localStorage.getItem('defxn-cms-lens')"), "the lens opens on 'content' (most edits are text) and is remembered per browser");
/* the lens is Ark's toggle group (js/admin/ark-host.js arkSegGroup) since W3-EDITOR: one pressed, one tab stop, a pick calls setLens */
assert(admin.includes('function setLens(lens)') && /A\.arkSegGroup\(\$\('lensSwitch'\), \[\$\('lensContentBtn'\), \$\('lensDesignBtn'\)\],\s*\{ selected: LENSES\.indexOf\(state\.lens\), onPick: function \(i\) \{ setLens\(LENSES\[i\]\); \} \}\)/.test(admin), 'both lens buttons are one Ark toggle group whose pick calls setLens()');
assert(/function setLens\(lens\) \{[\s\S]*?postCmsPreviewLens\(\)/.test(admin) && admin.includes("type: 'defxn-cms-preview-lens', lens: state.lens"), 'a lens change is posted to the canvas (defxn-cms-preview-lens)');
assert(/addEventListener\('load', \(\) => \{[^}]*postCmsPreviewLens\(\)/.test(admin) && /'defxn-cms-preview-ready'\) \{[\s\S]{0,900}postCmsPreviewLens\(\);/.test(admin), 'the lens is re-sent on every canvas load and after every ready, like Edit/Live');
assert(app.includes('id="lensSwitch"') && app.includes('id="viewSwitch"') && !app.includes('id="modeSwitch"') && !app.includes('id="designSubSwitch"'), 'the header has a lens switch and a view switch, not a mode switch and a Design-only sub-switch');
assert(app.includes('id="viewCanvasBtn"') && app.includes('id="viewMapBtn"') && app.includes('id="viewThemeBtn"') && app.includes('id="backgroundBtn"'), 'the views of the one site -- Canvas, Sitemap, Theme -- and the Background popover are ONE segmented control, in either lens');
/* one segmented-control convention: the lens is the same .seg as the canvas strip's screen size and
   Edit / Preview groups (the editor's .ark-tab class collided with Ark's own tab classes and went
   with js/admin/primitives.js, W3-EDITOR 2026-10-19) */
assert(/<div class="seg seg-text lens-switch" id="lensSwitch"/.test(app) && !/class="ark-tab"/.test(app) && !/primitives\.js/.test(app) && !/ArkAdminPrimitives/.test(admin), 'the lens buttons are a .seg group like the strip\'s, and the editor neither loads nor calls local tabs/disclosure primitives');
assert(/for \(const b of \$\('viewSwitch'\)\.querySelectorAll\('\[data-view\]'\)\) b\.addEventListener\('click', \(\) => setView\(b\.dataset\.view\)\);/.test(admin) && /function setView\(v\) \{[\s\S]*?\$\('themeView'\)\.hidden = v !== 'theme';/.test(admin), 'every view button calls the one setView(), which also shows the Theme dock beside the live canvas');
// One rail and one site list: Content's sidebar list (#pageList, #contentNav) and Studio's
// Pages tab merged into the rail's Pages tab; images and encrypted items are its Media / Vault.
assert(!app.includes('id="contentNav"') && !app.includes('id="pageList"') && !app.includes('id="cmsShell"') && !app.includes('id="editor"'), 'the old Content layout (#cmsShell, its #pageList sidebar and #editor column) is gone');
assert(app.includes('id="mediaPanel"') && app.includes('id="vaultPanel"') && admin.includes("mountPanel($('mediaPanel'), 'renderMediaPanel'") && admin.includes("mountPanel($('vaultPanel'), 'renderVaultPanel'") && /id="pagesPane"[\s\S]*?id="newForm"[\s\S]*?id="newArticleForm"/.test(app), 'New page / New article live in the Pages tab; Media and Vault mount their forms\' own panels (each with its New form)');
// The page's every field: a sheet on demand, never a fixed right column (owner: "remove the right bar").
assert(/<aside class="sheet" id="sheet"[^>]* hidden>/.test(app) && admin.includes('function openPageFields(opts)') && admin.includes("$('btnPageFields').addEventListener('click', togglePageFields);"), 'Page fields is a sheet that starts closed and opens from the page picker\'s icon');

// Mesh: not a mode or a view, a header action -- its deploy status opens in the sheet on demand.
assert(/<header class="bar" id="appBar">[\s\S]*?id="meshNav"[\s\S]*?<\/header>/.test(app), 'Mesh is reachable from the one header, which no part of the workspace hides');
assert(admin.includes("$('meshNav').addEventListener('click', selectMesh);") && admin.includes('function selectMesh() { openMeshSheet(); }'), 'the Mesh button opens the Mesh view (renderMeshEditor) in the sheet');
assert(admin.includes('function renderMeshEditor(root)') && /function openMeshSheet\(\) \{[\s\S]*?name: 'renderMeshEditor'/.test(admin), 'Mesh\'s own view (deployment status, local-vs-published diff, live list, security note) draws into the sheet the Mesh button opens');

// Step 4 (flickering-juggling-donut.md): the smart contextual floating toolbar itself --
// its DOM container, its positioning (reusing rectOf()/placeOverlays()'s exact math per
// the plan, extending placeOverlays() itself rather than a second system), and the
// type-dispatch taxonomy (text-bearing / container / image / layout group, plus
// component-instance / state-group / element-motion as additional sections).
assert(app.includes('id="selToolbar"'), '#selToolbar is a real floating container inside #stage');
assert(admin.includes('function rectOfSelectionRect(infoRect)') && admin.includes('const base = rectOf(cmsPreview)'), 'the toolbar\'s positioning is built on rectOf() directly -- cmsExactSelection.rect (reported from inside the cross-document preview iframe) is combined with rectOf(cmsPreview)\'s own same-document offset, not a reimplementation of the stage/scale math');
// Updated 2026-10-18 (real-browser click-through): the old last resort `Math.max(2, r.y + 2)`
// put the toolbar ON TOP of the element being edited whenever it was taller than the room
// above and below -- which, at ~580px, is most of the time -- so prop edits and new states
// changed the preview where nobody could see them. Above/below still come first; the
// fallback is now beside the selection. Behavior: tests/cms-toolbar-placement.cjs.
assert(admin.includes('function placeSelToolbar()') && /if \(r\.y > bh \+ gap\) \{ top = r\.y - bh - gap;/.test(admin) && /else if \(r\.y \+ r\.h \+ gap \+ bh < fh\) \{ top = r\.y \+ r\.h \+ gap;/.test(admin), 'placeSelToolbar() still tries #selTag\'s above-then-below flip first, with a measured size instead of a fixed 26px');
assert(!/Math\.max\(2, r\.y \+ 2\)/.test(admin.slice(admin.indexOf('function placeSelToolbar()'), admin.indexOf('function placeSelToolbar()') + 2500)), 'placeSelToolbar() no longer falls back to overlaying the selection itself');
assert(/placeSelToolbar\(\);\s*\}/.test(admin.slice(admin.indexOf('function layoutStage()'), admin.indexOf('function rectOf('))) && admin.includes("wrap.addEventListener('scroll', () => placeSelToolbar()"), 'layoutStage() (every resize/zoom/device change) and a canvas scroll reposition the toolbar without a selection change');
assert(admin.includes('function selToolbarVisible()'), 'a single function decides whether the toolbar should be showing at all (not live, in Design view, something selected)');
assert(admin.includes('function selToolbarKind(selection)') && admin.includes("if (selection.key.indexOf('group:') === 0) return 'group';") && admin.includes('const TOOLBAR_TEXT_TAGS =') && admin.includes('const TOOLBAR_IMAGE_TAGS ='), 'the type-dispatch reads cmsTree\'s own reported tag (via cmsTreeRowForKey) to classify the selection, with a group: key taking priority over any tag classification');
assert(admin.includes('function cmsTreeRowForKey(key)'), 'the tag lookup walks the existing cmsTree payload rather than adding new selection-reporting plumbing, per the plan\'s own instruction');
const taxonomyDispatch = [
  "if (kind === 'text') { buildTypographySection(box, ctx); buildFillSection(box, ctx); buildSpacingSection(box, ctx); buildFrameSection(box, ctx, false); }",
  "else if (kind === 'image') { buildFrameSection(box, ctx, false); buildFillSection(box, ctx); buildAltTextSection(box); }",
];
for (const site of taxonomyDispatch) assert(admin.includes(site), `renderSelToolbar()'s taxonomy dispatch matches the plan's own section lists: ${JSON.stringify(site.slice(0, 60))}`);
assert(admin.includes('buildLayoutSection(box, ctx); buildFillSection(box, ctx); buildSpacingSection(box, ctx); buildFrameSection(box, ctx, false); buildSizeSection(box, ctx); buildEffectsSection(box, ctx);'), 'the container branch (the taxonomy\'s default/fallback kind) shows Layout + Fill + Spacing + Frame + Size + Effects (Size was ported and never called: tests/cms-toolbar-taxonomy.cjs)');
assert(/if \(kind === 'group'\) \{\s*buildFrameSection\(box, ctx, true\);\s*\} else \{/.test(admin), 'a layout-group selection shows ONLY Frame + Ungroup (buildFrameSection\'s isGroup=true branch) -- no Typography/Layout/Fill/Size/Effects, since a group key has no real tag of its own for those to style');
assert(admin.includes('function buildComponentInstanceSection(pane)') && admin.includes('function buildStateGroupSection(pane)'), 'component-instance and state-group each get their own section builder');
assert(/if \(state\.cmsExactSelection\.component\) buildComponentInstanceSection\(box\);/.test(admin) && !/if \(kind === 'group'\)[\s\S]{0,50}if \(state\.cmsExactSelection\.component\)/.test(admin.slice(admin.indexOf('function renderSelToolbar'))), 'component-instance/state-group sections render ALONGSIDE whichever taxonomy section applies (never for the group kind, which has no .component/.stateGroup of its own) -- preserving the old accordion\'s "alongside, not instead of" behavior');
// Superseded 2026-10-18: Image's alt-text section was an honest "edited elsewhere" note; it is
// now a real control. It posts js/main.js's 'defxn-cms-preview-set-alt' and the edit lands in
// ArkLayout.alts (tests/layout-alt.cjs covers the store and apply; tests/browser/seo-alt-checks.mjs
// the full edit -> Save -> public page round trip).
assert(admin.includes('function buildAltTextSection(pane)') && admin.includes('postCmsSetAlt(state.cmsExactSelection.key, value)') && main.includes("data.type === 'defxn-cms-preview-set-alt'"), 'Image\'s alt-text section edits the alt through the preview protocol, not an "edited elsewhere" note');

// Step 5 (flickering-juggling-donut.md, the final step): the two confirmed save/dirty
// coordination bugs this step fixes, plus the "one save model" it builds on top of them.

// Bug fix 1: anyDirty() was missing 3 of the app's 13 real drafts (states/canvas-
// transitions/element-motion), each of which already has its own real dirty-check function
// (statesDirty()/canvasTransitionsDirty()/elementMotionDirty()) -- just never OR'd into
// anyDirty() or into currentDirty()'s 'studio' branch (the same defect, same cause, in the
// second of its only two readers).
assert(/function anyDirty\(\) \{ return [^}]*\.some\(dirty\) \|\| [^}]*\.some\(dirtyA\) \|\| [^}]*\.some\(dirtyI\) \|\| [^}]*\.some\(dirtyS\) \|\| ArkAdminStore\.drafts\('single'\)\.some\(function \(d\) \{ return singleDraftHandle\(d\.key\)\.dirty\(\); \}\)/.test(admin) && ['reliefDirty', 'themeDirty', 'settingsDefaultsDirty', 'layoutDirty', 'componentsDirty', 'statesDirty', 'canvasTransitionsDirty', 'elementMotionDirty', 'seoDirty'].every((fn) => admin.includes('dirty: ' + fn + ',')), 'anyDirty() now ORs in all 13 real drafts -- the 4 per-id lists, and every single draft js/admin/store.js lists through its handle, including the 3 that were once missing: statesDirty()/canvasTransitionsDirty()/elementMotionDirty()');
assert(/state\.kind === 'studio' \? \(layoutDirty\(\) \|\| componentsDirty\(\) \|\| statesDirty\(\) \|\| canvasTransitionsDirty\(\) \|\| elementMotionDirty\(\)\)/.test(admin), "currentDirty()'s 'studio' branch gets the same 3-missing-checks fix as anyDirty() (its only other reader, the Revert button, had the identical defect)");

// Bug fix 2: saveCurrent()/Ctrl+S had no branch for Studio's drafts at all, so Ctrl+S while
// editing the canvas fell through to the generic single-page-save path using a stale
// state.current id. saveCurrent() is deleted outright (superseded by saveEverything(), the
// unified save model below) and Ctrl+S now gates on the fixed anyDirty() and calls
// saveEverything() unconditionally -- "always does the right thing regardless of which
// mode/kind is active", per the plan's own end-state wording.
assert(!admin.includes('async function saveCurrent()') && !admin.includes('function saveCurrent ('), 'the old per-state.kind saveCurrent() dispatcher (no branch for Studio\'s drafts) is deleted outright, not left as dead code alongside saveEverything()');
assert(/if \(\(event\.metaKey \|\| event\.ctrlKey\) && event\.key === 's'\) \{ event\.preventDefault\(\); if \(anyDirty\(\)\) saveEverything\(\); \}/.test(admin), 'Ctrl/Cmd+S gates on the fixed anyDirty() (true for ANY of the 13 drafts, not just whatever state.kind happens to be) and calls saveEverything(), so it saves Studio\'s drafts correctly instead of silently falling through to a stale-id page save');

// The one save model: saveEverything() is aware of every one of the 13 drafts, checks each
// one's own real dirty-check (never force-writing a clean draft), saves it through its own
// matching ArkAdminStore.save* call, and reports success/failure per draft rather than
// aborting the whole batch on one draft's error.
assert(admin.includes('async function saveEverything()'), 'there is exactly one save function aware of every draft, not a per-kind dispatcher');
// The single-object drafts' handles (singleDraftHandle(), directly above saveEverything()) are
// part of the save: saveEverything() loops over js/admin/store.js's draft list and calls them.
const saveEverythingBody = admin.slice(admin.indexOf('function singleDraftHandle(key)'), admin.indexOf('\n  async function deleteCurrent()'));
const everyDirtyCheck = ['state.ids.filter(dirty)', 'state.slugs.filter(dirtyA)', 'state.assetIds.filter(dirtyI)', 'state.secretIds.filter(dirtyS)', 'dirty: reliefDirty,', 'dirty: themeDirty,', 'dirty: settingsDefaultsDirty,', 'dirty: seoDirty,', 'dirty: layoutDirty,', 'dirty: componentsDirty,', 'dirty: statesDirty,', 'dirty: canvasTransitionsDirty,', 'dirty: elementMotionDirty,', "ArkAdminStore.drafts('single')", 'await attempt(single.label, handle.dirty(), handle.save);'];
for (const check of everyDirtyCheck) assert(saveEverythingBody.includes(check), `saveEverything() checks all 13 drafts, including ${JSON.stringify(check)}, not just whichever one is on screen`);
assert(/catch \(error\) \{ record\(label, false,/.test(saveEverythingBody), 'each draft\'s save attempt is caught and recorded against that one draft by name (the shared attempt() helper\'s own catch), not a single try/catch around the whole batch');
assert((saveEverythingBody.match(/await attempt\(/g) || []).length >= 5 && /for \(var n = 0; n < singles\.length; n\+\+\) \{[\s\S]{0,250}await attempt\(single\.label, handle\.dirty\(\), handle\.save\);/.test(saveEverythingBody), 'saveEverything() makes one separate attempt() call per draft -- one per per-id item, and one per single draft inside the loop over js/admin/store.js\'s list -- one isolated try/catch per draft (via the shared helper), not one try/catch wrapping the whole batch the way the old saveStudioChanges() did');
assert(saveEverythingBody.includes('succeeded') && saveEverythingBody.includes('failed') && saveEverythingBody.includes("results.filter(function (r) { return r.ok; })") && saveEverythingBody.includes("results.filter(function (r) { return !r.ok; })"), 'saveEverything() reports succeeded vs failed drafts separately, so a partial failure still reports what DID succeed instead of collapsing into one generic pass/fail');
assert(saveEverythingBody.includes("'Nothing to save: every draft already matches its saved copy.'"), 'saveEverything() never force-writes a clean draft -- a call with nothing dirty reports that plainly instead of a silent no-op or a fabricated success');

// Exactly one function behind every Save entry point: the generic per-section Save button
// (page/article/asset/secret/design editors share one `id="save"` button built the same
// way), the SEO panel's own Save button, the mesh/shape tuning panel's own inline Save
// button, Studio's own #btnCmsSave, and Ctrl/Cmd+S -- all call saveEverything(), not a mix
// of saveCurrent()/saveStudioChanges()/saveSeoDraft()/saveMeshDraft() each covering a
// different subset of the 13 drafts. Per-section Save buttons are kept (per the plan's own
// Step 3/4 precedent of keeping chrome and fixing the mechanism underneath it), not
// collapsed into a single global button -- but every one of them now saves every dirty
// draft, not just whatever is on screen, so none can under-save relative to any other.
// The one header (2026-10-18) then collapsed those per-section buttons into ONE: #save in the
// header, in every mode. Nothing else builds a Save button, so nothing can under-save.
assert(admin.includes("$('save').addEventListener('click', function () { saveEverything(); });"), 'the header\'s one Save button calls saveEverything()');
assert(!/onclick: saveEverything|text: 'Save'/.test(admin) && !/\bsave\.addEventListener\(/.test(admin) && !admin.includes("$('btnCmsSave')"), 'no editor, panel or canvas builds a Save button of its own any more');
assert(admin.includes('async function saveThemeDraft(button)') && admin.includes('async function saveSettingsDefaultsDraft(button)') && admin.includes('async function saveSeoDraft(button)') && admin.includes('async function saveMeshDraft(button)'), 'the 4 single-draft writers (theme/settings-defaults/SEO/mesh) still exist as saveEverything()\'s own building blocks, not reinlined into one giant function body');
for (const callers of [
  { fn: 'saveThemeDraft(null)', count: 1 }, { fn: 'saveSettingsDefaultsDraft(null)', count: 1 }, { fn: 'saveSeoDraft(null)', count: 1 }, { fn: 'saveMeshDraft(null)', count: 1 },
]) assert(admin.includes(callers.fn), `${callers.fn} is called from saveEverything()`);
// (a code comment may still name the old saveMeshDraft(save)/saveSeoDraft(save) direct
// calls, explaining what Step 5 changed -- the onclick-wiring assertions above already
// confirm neither panel's button actually calls them any more.)
// Each of the 4 single-draft writers re-throws on error instead of swallowing it -- they
// used to catch-and-return internally (fine when each was its own panel\'s whole save
// action), but saveEverything()\'s attempt() wrapper needs the rejection to tell a failed
// draft from a succeeded one; swallowed, every one of these 4 would always report "ok".
assert((admin.match(/\} catch \(error\) \{ status\(error\.message, 'error'\); throw error; \}/g) || []).length === 4, 'all 4 single-draft writers (theme/settings-defaults/SEO/mesh) re-throw their error after reporting status(), instead of swallowing it and returning -- otherwise saveEverything() would always record them as succeeded even when the underlying write failed');
assert(!/saveThemeDraft[\s\S]{0,400}catch \(error\) \{ status\(error\.message, 'error'\); return; \}/.test(admin), 'saveThemeDraft() no longer swallows its own error (verified by its absence, not just the presence of the re-throw form elsewhere)');

// touch(): the visible Save button's enabled state now reflects anyDirty() (saveEverything()
// saves every dirty draft, so the button must enable for a dirty draft anywhere, not only
// for whatever section happens to be on screen); Revert stays scoped to the current section
// (it only ever reverts what's on screen), so it keeps using currentDirty().
assert(admin.includes("function refreshSaveButton() { refuse($('save'), anyDirty() ? '' : NOTHING_TO_SAVE); }") && /function touch\([^)]*\) \{[\s\S]{0,600}refreshSaveButton\(\);/.test(admin), "the Save button's disabled state uses the fixed anyDirty(), not currentDirty() -- a dirty theme/canvas draft must not leave the Save button looking disabled just because the page on screen is clean");
// Since the one-workspace unification each form panel carries its own Revert (data-revert="kind:id"),
// so "scoped to the current section" now means scoped to that panel's item: itemDirty(kind, id).
assert(/refuse\(revert, neverSaved\(kind, id\) \? '[^']+' : itemDirty\(kind, id\) \? '' : /.test(admin), "Revert's disabled state is scoped to its own item (itemDirty(kind, id)) -- Revert only reverts the item its panel edits, unlike the unified Save button");

console.log('PASS: protected DEFXN Studio integration, feature surface, local persistence, publishing boundary, the Step 3 Design/Content mode switch, Step 4\'s contextual floating toolbar, and Step 5\'s save/dirty bug fixes (anyDirty()\'s 3 missing checks, Ctrl+S\'s Studio blind spot) plus the one unified saveEverything() save model covering all 13 real drafts with per-draft success/failure reporting.');
