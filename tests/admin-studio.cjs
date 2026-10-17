'use strict';

const assert = require('node:assert');
const fs = require('node:fs');

const app = fs.readFileSync('admin-app.html', 'utf8');
const admin = fs.readFileSync('js/admin/admin.js', 'utf8');
const studio = fs.readFileSync('admin-studio.html', 'utf8');
const main = fs.readFileSync('js/main.js', 'utf8');
const router = fs.readFileSync('js/ark/page-router.js', 'utf8');
const runtime = fs.readFileSync('js/ark/runtime.js', 'utf8');
const layout = fs.readFileSync('js/content/layout.js', 'utf8');
const host = fs.readFileSync('scripts/publish-host.mjs', 'utf8');
const ignored = fs.readFileSync('.vercelignore', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

assert(app.includes('id="studioNav"'), 'the CMS sidebar exposes Studio');
assert(admin.includes("state.kind = 'studio'"), 'Studio is a real CMS editor state');
assert(admin.includes("src: 'admin-studio.html'"), 'the CMS embeds the protected Studio document');
assert(admin.includes("type === 'defxn-cms-open-content'"), 'Studio can return to the existing content CMS');
assert(host.includes("relative === 'admin-studio.html'"), 'the publish host locks Studio behind the CMS gate');
assert(ignored.split(/\r?\n/).includes('admin-studio.html'), 'Studio is excluded from the public static deployment');

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
for (const id of ['tabLayers', 'tabPages', 'tabLib', 'designView', 'mapView', 'tabEl', 'tabTheme', 'tabSeo', 'devices', 'mode', 'btnUndo', 'btnRedo', 'btnCheck', 'btnCmsSave']) {
  assert(studio.includes(`id="${id}"`), `Studio keeps the ${id} feature surface`);
}
for (const id of ['btnAdd', 'tabVer', 'paneVer', 'btnPublish', 'btnNewPage', 'btnNewArticle', 'fileIn', 'askModal', 'modal']) {
  assert(!studio.includes(`id="${id}"`), `Step 1 removed the dead ${id} surface along with the standalone feature it only served`);
}
assert(!/<link[^>]+fonts\.googleapis\.com/.test(studio), 'the Studio shell uses local fonts under the CMS content policy');
assert(studio.includes('id="btnContentCms"'), 'the full-screen Studio exposes the existing DEFXN content CMS');
assert(admin.includes("type: 'defxn-studio-load'"), 'Content CMS sends its authoritative site model into Studio');
assert(admin.includes("type === 'defxn-studio-patch'"), 'Content CMS accepts typed Studio edits');
assert(admin.includes('saveStudioChanges'), 'Studio changes use the existing manifest/article/SEO writers');
assert(studio.includes('let cmsRoutes'), 'Studio keeps the real route list (admin.js\'s studioRoutes()) sent on defxn-studio-load/preview-state, replacing the deleted dense pages()/curPage');
assert(studio.includes('collectCmsPatches'), 'Studio keeps the patch-collection relay for btnCmsSave (now an empty stub -- Step 1 deleted the dense manifest/article/SEO text-editing panel it used to serve, since Content CMS already edits those fields directly)');
assert(studio.includes('69 real DEFXN routes') === false, 'the route total is data-driven, never hard-coded');
assert(studio.includes('id="cmsPreview"'), 'Studio embeds the real DEFXN application as its canvas');
assert(studio.includes('index.html?cms-preview=1#'), 'the exact preview opens the selected public route');
assert(studio.includes('defxn-cms-preview-mode'), 'Edit and Live modes are forwarded into the real renderer');
assert(studio.includes("Content, SEO, and routing for this page are edited through the authoritative CMS controls"), 'Step 1 replaces the deleted dense "Authoritative content" textarea/"Managed route" panel with an honest redirect to Content CMS, the same pattern Theme/Library/SEO already use');
assert(studio.includes("'DEFXN reusable components'"), 'connected Studio library describes the real runtime component system');
assert(admin.includes('notifyPreviewState'), 'Content CMS sends unsaved drafts to its real-page preview');
assert(admin.includes("type: 'defxn-studio-preview-state'"), 'Studio receives updated unsaved drafts from Content CMS');
assert(main.includes("data.type !== 'defxn-cms-preview-state'"), 'the public runtime accepts full preview state only in preview mode');
assert(main.includes('ArkUI.pageRouter.refresh()'), 'preview state remounts the real active route');
assert(router.includes('refresh: function'), 'the router exposes a preview remount without deployment');
assert(runtime.includes("data-ark-copy-keys"), 'real rendered components retain their authoritative copy keys for click-to-edit');
assert(main.includes('annotateCmsPreviewCopy(site.manifests)'), 'hand-authored page-module copy is also bound to its authoritative manifest field');
assert(main.includes('defxn-cms-preview-layout-change'), 'exact preview reports direct manipulation to Studio');
assert(main.includes("['nw', 'ne', 'se', 'sw']"), 'exact preview exposes four Figma-style corner resize handles');
assert(studio.includes('collapsedLayers'), 'Studio layer groups can collapse and expand');
assert(studio.includes("'cms-frame', 'Frame'"), 'connected inspector exposes numeric frame controls');
assert(admin.includes("type === 'defxn-studio-layout-patch'"), 'Content CMS accepts authoritative visual layout patches');
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
assert(studio.includes('let multiSel = []'), 'placeMultiOverlays() (kept for Step 4) still reads multiSel, which now stays empty forever');
assert(!studio.includes('function toggleMultiSelect') || studio.includes('function multiSelIds() { return multiSel; }'), 'if toggleMultiSelect-style selection ever comes back it is through Step 4\'s toolbar, not a revived standalone click handler');
assert(!studio.includes('function groupableSelection'), 'the standalone align/group precondition check is deleted, not reused for anything connected-mode');
assert(!studio.includes('function groupSelection'), 'the standalone group-into-Box/Section function is deleted with the dense tree it mutated');
assert(!studio.includes('function ungroupSelection'), 'the standalone ungroup function is deleted; connected-mode ungroup already goes through postCmsLayoutOperation(\'ungroup\')');
assert(!studio.includes('function multiAlign') && !studio.includes('function multiDistribute'), 'standalone align/distribute are deleted; connected-mode align/distribute already go through postCmsLayoutOperation');
assert(!studio.includes('function showSelectionContextMenu') && !studio.includes("siteEl.addEventListener"), 'the standalone canvas\'s right-click menu and every siteEl listener are deleted along with siteEl itself (the dense shadow-DOM host)');
assert(!studio.includes("groupSelection('box')"), 'Ctrl/Cmd+G no longer groups a standalone selection; the keydown handler has no g-key branch left to remove');

// Connected mode's visual-design sidebar: real ArkLayout style properties, bound to the
// real site's own design tokens (css/themes.css), not an invented parallel palette.
assert(studio.includes('CMS_TEXT_TOKENS') && studio.includes('CMS_FILL_TOKENS') && studio.includes('CMS_FONT_TOKENS') && studio.includes('CMS_TYPE_SIZE_TOKENS') && studio.includes('CMS_RADIUS_TOKENS') && studio.includes('CMS_BORDER_TOKENS'), 'the real site\'s own token names are mirrored as constants, not reinvented inline');
assert(studio.includes("accordion(pane, 'cms-spacing', 'Spacing'"), 'connected Studio exposes a real Spacing panel');
assert(studio.includes("accordion(pane, 'cms-type', 'Typography'"), 'connected Studio exposes a real Typography panel');
assert(studio.includes("accordion(pane, 'cms-fill', 'Fill and border'"), 'connected Studio exposes a real Fill panel');
assert(studio.includes("accordion(pane, 'cms-effects', 'Effects'"), 'connected Studio exposes a real Effects panel');
assert(studio.includes("segField('Font', 'font', CMS_FONT_TOKENS") && studio.includes("segField('Radius', 'radius', CMS_RADIUS_TOKENS"), 'typography and fill controls write the real font/radius tokens, not literal values');
assert((studio.match(/postCmsLayoutCommand\(draft\)/g) || []).length >= 5, 'field/segField/selectField/swatchField all write through the same real ArkLayout patch pipeline as the Frame panel, not a separate preview-only path');
assert(layout.includes('TEXT_TOKENS') && layout.includes('FILL_TOKENS') && layout.includes('var(--font-') && layout.includes("hsl(var(--' + "), 'ArkLayout itself writes the real site\'s CSS custom properties for the new style keys');

// Second enrichment pass: Layout (flex/grid container), the rest of Typography, and Size.
assert(studio.includes("accordion(pane, 'cms-layout', 'Layout'"), 'connected Studio exposes a real Layout panel (display/gap/align/justify/wrap)');
assert(studio.includes("accordion(pane, 'cms-size', 'Size'"), 'connected Studio exposes a real Size panel (max width/min height)');
assert(studio.includes("segField('Weight', 'fw'") && studio.includes("segField('Line height', 'lh'") && studio.includes("segField('Align', 'ta'"), 'Typography gained weight, line height, and text align controls');
assert(studio.includes("segField('Display', 'display', CMS_DISPLAY_TOKENS"), 'Layout writes the real display/flex-direction CSS, not an invented layout model');
assert(layout.includes('applyGroupDefault') && main.includes('cmsNearestCommonAncestor'), 'grouping and the group default survive the new owned style properties being reset on every apply()');

// Undo/redo for connected-mode layout/style edits (previously silently unavailable): the
// real history lives in the iframe next to cmsLayoutDraft, relayed through this page.
assert(main.includes('function cmsSnapshotLayout') && main.includes('function cmsUndoLayout') && main.includes('function cmsRedoLayout'), 'the preview iframe keeps a real undo/redo history for layout/style edits, not just content');
assert(main.includes('cmsSnapshotLayout();') && (main.match(/cmsSnapshotLayout\(\);/g) || []).length >= 5, 'every layout mutation site (field commit, drag, align, distribute, group, ungroup, reset) snapshots before mutating');
assert(studio.includes('function postCmsLayoutUndo') && studio.includes('function postCmsLayoutRedo'), 'Studio relays undo/redo requests into the preview iframe');
assert(studio.includes('function undo() { if (cmsLayoutCanUndo) postCmsLayoutUndo(); }') && studio.includes('function redo() { if (cmsLayoutCanRedo) postCmsLayoutRedo(); }'), 'Step 1 simplified undo()/redo() to the real layout history alone -- the local dense-tree undoStack/redoStack fallback is deleted along with the rest of the standalone engine, since cmsConnected is always true going forward');
assert(studio.includes("'defxn-cms-preview-layout-replace'") && studio.includes("'defxn-studio-layout-replace'"), 'a restored layout is relayed up to Content CMS so Save still writes the post-undo state');
assert(admin.includes('function applyStudioLayoutReplace'), 'Content CMS keeps its authoritative layoutDraft in sync with an undo/redo, the same way it does with a forward patch');

// llms.txt is now a real served file (js/content/seo.js generates it, scripts/lib/
// site-bundle.mjs writes it, this host serves it), not just a Studio "download" button.
assert(host.includes("'llms.txt'"), 'the publish host serves the real llms.txt file, not just robots.txt/sitemap.xml');

// Step 1 superseded the SEO sync bug fix: the dense renderSeoPane() editing UI
// (schemaType/noindex/aiSummary/aiBlocked/lang/org/handle/bots/llms/Canonical URL fields)
// and collectCmsPatches()'s seo branch that forwarded them both read/wrote the deleted
// dense tree, same as the deleted "Authoritative content" panel -- deleted with it, flagged
// plainly as a real, not-yet-ported capability loss (see admin-studio.html's own comment
// above renderSeoPane). admin.js's receiving side (untouched by Step 1) still accepts those
// same fields from any future sender, so a later port has nothing to rebuild there.
assert(admin.includes("typeof value === 'object'") && admin.includes('ArkSEO.sanitize'), 'Content CMS still accepts the non-string SEO fields (bots is an object, noindex/aiBlocked/llms are 0/1) and reconciles them at save time, ready for a future real port of this panel');
assert(studio.includes('cmsPageSeo(cmsSourceSite'), 'Studio\'s remaining SEO surface (the honest redirect panel and the ported search/AI design-checks) reads real per-route SEO through the same pure cmsPageSeo()/cmsSeoValue() functions cmsSiteSpec used to, not a reinvented lookup');

// Bug fixes from direct user report:
// 1) grouping must be reflected in the sidebar, not just on the canvas.
assert(main.includes('function cmsGroupList') && (main.match(/groups: cmsGroupList\(\)/g) || []).length >= 4, 'every selection/group/ungroup/ready message reports the current route\'s real groups');
assert(studio.includes("accordion(pane, 'cms-groups', `Groups on this page") && studio.includes('postCmsSelectGroup'), 'connected Studio shows a real, clickable list of the current page\'s groups');
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
{
  const applyStudioPatchesStart = admin.indexOf('function applyStudioPatches');
  const applyStudioPatchesEnd = admin.indexOf('\n  }', admin.indexOf("kind === 'manifest'", applyStudioPatchesStart));
  const manifestBranch = admin.slice(applyStudioPatchesStart, applyStudioPatchesEnd);
  assert(manifestBranch.includes("typeof patch.value === 'string'") && !manifestBranch.includes("kind === 'link'"),
    'applyStudioPatches\' manifest branch stays kind-agnostic: a link field\'s tagged string round-trips through the exact same guard every other field kind already used, with zero new plumbing');
}

// General component system (Part 3): masters/instances/overrides are real runtime state,
// round-tripped through the connected preview iframe with the same whole-draft-replace
// shape layout undo/redo already uses, never a second, visual-only component system.
assert(main.includes('window.ArkComponents') && main.includes('ArkComponents.renderAll'), 'the real site centrally renders every [data-ark-insert] anchor on each mount, not a per-page-module call');
assert(main.includes("function cmsComponentsCommand"), 'the preview iframe applies every component command through the real ArkComponents mutators');
assert(main.includes("'create-master'") && main.includes("'insert-instance'") && main.includes("'set-override'") && main.includes("'remove-instance'") && main.includes("'update-master'"), 'every ArkComponents mutator is reachable through the one components-command message');
assert(main.includes("'defxn-cms-preview-components-command'"), 'Studio posts component edits into the preview iframe through their own typed message');
assert(main.includes("'defxn-cms-preview-components-replace'"), 'the preview iframe relays the whole updated components draft back to Studio after every edit');
assert(studio.includes('function postCmsComponentsCommand'), 'Studio has one function that posts every component command, mirroring postCmsLayoutCommand');
assert(studio.includes("'defxn-studio-components-replace'"), 'Studio relays an updated components draft up to Content CMS, mirroring defxn-studio-layout-replace');
assert(admin.includes('function applyStudioComponentsReplace') && admin.includes("'defxn-studio-components-replace'"), 'Content CMS keeps an authoritative componentsDraft in sync with Studio edits, the same way it does for layout');
assert(admin.includes('ArkAdminStore.saveComponents') && admin.includes("download('components-data.js'"), 'Save writes components-data.js through the same connected-project/download split as layout-data.js');
assert(admin.includes('componentsDirty()'), 'unsaved component edits are tracked and surfaced the same way unsaved layout edits are');
assert(fs.readFileSync('js/admin/store.js', 'utf8').includes('async function saveComponents'), 'the store module gained a saveComponents writer alongside saveLayout');
assert(studio.includes('CMS_BLOCK_RESOLVERS') && studio.includes('RBLOCK_TEXT_V1') && studio.includes('RBLOCK_DIVIDER_V1'), 'Studio mirrors the real block resolver list and their real prop names, not an invented set');
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
assert(main.includes("add('Remove', cmsRemoveSelection") , 'the connected right-click menu gained a Remove entry wired to the same function');
assert((main.match(/document\.addEventListener\('keydown'/g) || []).length === 1, 'the preview iframe gained exactly one new keydown listener (none existed in this file before Part A)');
assert(/addEventListener\('keydown', function \(event\) \{[\s\S]{0,600}cmsRemoveSelection\(\);/.test(main), 'the new keydown listener calls cmsRemoveSelection on Delete/Backspace, guarded against typing the same way admin-studio.html\'s own handler already is');
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
assert(/function cmsRealTree[\s\S]{0,200}ArkLayout\.annotate\(host\)/.test(main), 'cmsRealTree re-annotates the host first, the same guarantee the click handler already relies on before resolving a pick');
assert(/tag === 'svg' \? \[\] : walk\(element\)/.test(main), 'a whole <svg> is treated as one leaf row, never recursed into -- its internals stay reachable only through the existing "Enter illustration" escape hatch');
assert(main.includes('function cmsElementForKey'), 'the hide toggle and rename resolve a tree row by its stable key, independent of whatever happens to be selected right now');
assert(main.includes('function setCmsLayoutFrameForKey'), 'the hide toggle reuses setCmsElementFrame (the exact ArkLayout.set() mechanism every Frame/Fill control already uses), keyed to an explicit element instead of cmsPreviewSelected');
assert(/data\.key\) setCmsLayoutFrameForKey\(data\.key, data\.frame, true\); else setCmsLayoutFrame\(data\.frame, true\)/.test(main), 'the layout-command handler dispatches to the keyed path only when a key is given, so every existing Frame/Fill caller (which never passes one) is unaffected');
assert(main.includes("data.type === 'defxn-cms-preview-select-group'") && /select-group[\s\S]{0,400}data\.id \|\| data\.key/.test(main), 'select-by-id (an existing layout group) and select-by-key (any annotated row) share the one message handler, generalized rather than duplicated into a sibling message type');
assert(main.includes("data.type === 'defxn-cms-preview-set-label'") && main.includes('ArkLayout.setLabel(cmsLayoutDraft'), 'renaming a row writes through ArkLayout.setLabel on the same cmsLayoutDraft every other layout edit already mutates');
assert((main.match(/tree: cmsRealTree\(host, ?[^)]*\)/g) || []).length >= 8, 'the real tree rides along on every message that already reports groups/selection state, not a second poll-based round trip');
assert(studio.includes('function renderConnectedLayers'), 'Studio gained the connected-mode equivalent of renderLayers(), reusing the same row markup conventions (.layer-toggle, role=treeitem, aria-selected, collapsedLayers)');
assert(studio.includes('function renderLayersPane') && studio.includes('renderLayersPane();'), 'the render loop switches between renderLayers()/renderConnectedLayers() the same if (cmsConnected) {...} else {...} way renderElementPane() already does, not a bespoke branch');
assert(/renderLayersPane\(\); renderPages\(\)/.test(studio), 'the main render loop now paints the connected-aware dispatcher, not renderLayers() unconditionally');
assert(studio.includes('let cmsTree = []'), 'Studio tracks the iframe-reported real tree the same way it already tracks cmsGroups/cmsComponentAnchors');
assert(studio.includes('function postCmsSelectKey'), 'a row click posts select-by-key, generalizing postCmsSelectGroup\'s existing message rather than a new one');
assert(studio.includes('function postCmsSetLabel') && studio.includes("'defxn-cms-preview-set-label'"), 'a row rename posts through its own typed message, mirroring postCmsSelectGroup/postCmsRemoveSelection\'s own shape');
assert(/function postCmsLayoutCommand\(frame, key\)/.test(studio), 'postCmsLayoutCommand gained an optional key parameter for the eye icon, so a hide toggle can target a row that is not the current selection -- every other caller omits it and is unaffected');
assert(studio.includes("postCmsLayoutCommand({ display: row.hidden ? null : 'hide' }, row.key)"), 'the eye icon toggles through the exact same postCmsLayoutCommand path the Frame/Fill accordion\'s own Display control already uses, not a parallel mechanism');
assert(admin.includes("patch.operation === 'set-label'") && admin.includes('ArkLayout.setLabel(layoutDraft'), 'Content CMS\'s authoritative layoutDraft gains the same set-label branch applyStudioLayoutPatch already dispatches group/ungroup/reset/frame-set through, so a rename actually persists on Save');

// Part F (new follow-up plan): restrictMode -- the shared scaffolding for two dedicated,
// narrowed Studio modes (canvas-only, anim-only) that Parts G/H plug real panels into.
// Mirrors editingComp's exact shape: one state variable, enter/exit/toggle, a floating
// banner, Escape-to-exit, mutual exclusion with editingComp/live/map, and the same guards
// already threaded through every interactive canvas path for `live`.
assert(studio.includes('let restrictMode = null'), 'restrictMode is a single state variable, mirroring editingComp (null/\'canvas\'/\'anim\' instead of -1/M)');
assert(studio.includes('function enterRestrictMode(mode)') && studio.includes('function exitRestrictMode()') && studio.includes('function toggleRestrictMode()'), 'restrictMode gets its own enter/exit/toggle functions, mirroring enterComp/exitComp');
assert(studio.includes('function renderRestrictBar()'), 'restrictMode gets its own floating banner function, mirroring renderCompBar()');
assert(studio.includes('id="restrictBar"') && studio.includes('id="restrictBarText"') && studio.includes('id="restrictSwitch"') && studio.includes('id="restrictDone"'), 'the restrict banner reuses the exact #compBar DOM/CSS shape (same .compbar class, same button styling) with its own ids');
assert(studio.includes("restrictSwitch').addEventListener('click', toggleRestrictMode)") && studio.includes("restrictDone').addEventListener('click', exitRestrictMode)"), 'the banner\'s switch/Done buttons call toggleRestrictMode/exitRestrictMode, mirroring #compDone -> exitComp');
assert(/renderCompBar\(\); renderRestrictBar\(\); renderLayersPane\(\)/.test(studio), 'renderRestrictBar() is called from the same render loop renderCompBar() already is (Step 1 dropped the leading render() call -- the dense tree -> shadow-DOM builder it rendered is deleted -- but kept both of these connected-mode repaints)');

// Mutual exclusion: Step 1 deleted enterComp/exitComp outright (the dense "edit main
// component on its own board" feature they drove), so restrictMode's own force-exits of
// THAT mode go with them -- there is nothing left to be mutually exclusive with. The
// live/map mutual exclusions that remain meaningful (restrictMode can't stay active while
// switching to Live or to the Sitemap) are kept, simplified now that editingComp never
// changes from -1.
assert(!studio.includes('function enterComp') && !studio.includes('function exitComp'), 'enterComp/exitComp (the dense "edit main component" feature) are deleted; editingComp stays -1 forever as a harmless leftover placeOverlays()/renderCompBar() (kept for Step 4) still read');
assert(/if \(live && restrictMode\) exitRestrictMode\(\);/.test(studio), 'the Live mode-toggle handler still force-exits restrictMode');
assert(/if \(v === 'map'\) \{ if \(restrictMode\) exitRestrictMode\(\);/.test(studio), "setView's map branch still force-exits restrictMode");
assert(!/function enterRestrictMode\(mode\) \{\s*if \(editingComp >= 0\) exitComp\(\);/.test(studio), 'enterRestrictMode no longer force-exits the deleted editingComp mode');

// Escape takes priority, ordered with the existing popover Escape check (the drag.active
// Escape check is gone with the rest of the standalone drag system; Step 1 also deleted the
// separate editingComp Escape handling further down the original handler since editingComp
// can no longer change).
assert(/if \(e\.key === 'Escape' && popEl\) \{[^}]*\}\s*if \(e\.key === 'Escape' && restrictMode\) \{ exitRestrictMode\(\); return; \}/.test(studio), 'Escape exits restrictMode, slotted in right after the popover Escape check and before everything else');

// Panel dispatch: restrictMode wins over every other branch in both renderElementPane and
// renderLayersPane. Step 1 dropped the "&& cmsConnected" guard both already carried --
// cmsConnected is always true now that the standalone canvas is gone -- without changing
// the dispatch order or priority itself.
assert(/function renderElementPane\(\) \{\s*const pane = \$\('paneEl'\);\s*if \(restrictMode\) \{/.test(studio), 'renderElementPane gets a restrictMode branch that takes priority over every other branch');
assert(/function renderLayersPane\(\) \{\s*if \(restrictMode === 'canvas'\) \{ renderRestrictLayersPane\(\); return; \}/.test(studio), "renderLayersPane's restrictMode branch is scoped to canvas mode only (Part H, below, needs the real connected-mode Layers tree to keep working in anim mode -- canvas mode has no use for it)");
assert(studio.includes('Canvas transition controls land here.'), 'the canvas-mode Layers-tab placeholder still renders (canvas mode hides the whole left rail via CSS, but the placeholder stays as a defensive fallback)');
assert(!studio.includes('Element animation controls land here'), "Part H's own panel replaces the placeholder entirely -- anim mode falls through to the real renderConnectedLayers() tree instead of a placeholder");

// Entry point: js/main.js posts an unconditional mode-level action up to Studio, which owns
// the actual mode state (the same up-relay pattern cmsRemoveSelection/cmsComponentsCommand
// already use for parent-owned state).
assert(/add\('Edit canvas', function \(\) \{ window\.parent\.postMessage\(\{ type: 'defxn-cms-preview-enter-canvas-mode' \}, location\.origin\); \}, false\)/.test(main), "showCmsContextMenu gains an unconditional 'Edit canvas' entry, never disabled and not gated on any selection");
assert(/function showCmsContextMenu[\s\S]{0,1200}add\('Edit canvas'[\s\S]{0,400}add\('Add this layer to selection'/.test(main), "'Edit canvas' is added near the top of the menu, before the 'Add this layer to selection' entry");
assert(studio.includes("'defxn-cms-preview-enter-canvas-mode') enterRestrictMode('canvas')"), "admin-studio.html's message handler for the connected preview iframe calls enterRestrictMode('canvas') on that message");

// Step 6: every existing `if (live) ...` / `if (live || ...) ...` interactive guard found
// this session also gets `restrictMode` added, so normal content/layout interaction is
// inert while a restrict mode is active, not just while live. Listed exhaustively so any
// guard silently dropped in a future edit is caught here.
// Step 1 deleted the standalone-only guard sites outright along with the functions/
// listeners they gated (siteEl's own click/pointerover/dblclick/pointerdown listeners,
// follow(), the library-drag frame.addEventListener('dragover', ...), the sel-driven
// setInterval placeOverlays() poll, and the drag.active/editingComp terms inside queueCheck
// -- queueCheck no longer needs to check a drag that can't happen or an editingComp that
// can't change). The ones that still gate real, reachable connected-mode code (placeOverlays/
// placeMultiOverlays, kept verbatim for Step 4; the keydown typing guard; renderCompBar/
// the device-breakpoint note) are listed here unchanged.
const liveGuardSites = [
  "if (live || restrictMode || view !== 'design' || drag.active || sel < 0 || !elOf[sel] || !elOf[sel].isConnected || sel === curPage)",
  "if (live || restrictMode || view !== 'design' || drag.active || hover < 0 || hover === sel || hover === curPage || !elOf[hover] || !elOf[hover].isConnected) hb.hidden = true;",
  "if (live || restrictMode || view !== 'design' || drag.active || cmsConnected || !el || !el.isConnected) multiBoxes[i].hidden = true;",
  "if (typing || live || restrictMode || view !== 'design') return;",
  "b.hidden = editingComp < 0 || view !== 'design' || live || restrictMode;",
  "bn.hidden = device === 0 || live || restrictMode || view !== 'design';",
];
for (const site of liveGuardSites) assert(studio.includes(site), `restrictMode is still threaded into the live-guard site: ${JSON.stringify(site.slice(0, 70))}`);
const deletedGuardSites = [
  "siteEl.addEventListener('pointerover'", "siteEl.addEventListener('dblclick'", "frame.addEventListener('dragover'",
  "setInterval(() => { if (sel >= 0 && !live && !restrictMode",
];
for (const site of deletedGuardSites) assert(!studio.includes(site), `Step 1 deleted the standalone-only guard site along with the listener it gated: ${JSON.stringify(site.slice(0, 50))}`);
assert(studio.includes("checkT = setTimeout(() => { if (view === 'design' && !restrictMode) {"), 'queueCheck() keeps the restrictMode guard; drag.active/editingComp < 0 are dropped since the drag system and editingComp mutation are both deleted');

// Part G (follow-up plan): canvas-only mode's real panel, replacing the placeholder in
// renderElementPane()'s restrictMode branch (renderLayersPane's own placeholder stays
// exactly as Part F left it -- canvas mode has nothing to do with the element tree).
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
assert(/scene\.dataset\.transition = 'running';\s*fadeCanvas\('out'\);\s*var outgoing = active;/.test(router), "fadeCanvas('out') runs at the same point scene.dataset.transition is set to 'running', strictly before presence.hide(outgoing, ...) is awaited");
assert(/\} else entering = presence\.show\(page, immediate\)\.then\(function \(\) \{\s*if \(stageRetention\) stageRetention\.activate\(mounted\[page\]\);\s*\}\);\s*\/\/ The background fade-in starts strictly after[\s\S]{0,400}fadeCanvas\('in'\);/.test(router), "fadeCanvas('in') runs strictly after presence.show()/enter() has already been invoked for the incoming page, never before");

// Studio's canvas-mode panel: real controls, not the Part G placeholder, reading
// cmsSourceSite.canvasTransitions and writing through postCmsCanvasTransitionsCommand /
// postCmsCanvasTransitionPreview -- never a parallel sanitize path of its own (this
// document has no <script src> for the content modules).
assert(studio.includes('function renderCanvasTransitionsPane(pane)'), 'renderElementPane\'s canvas-mode branch is filled in with a real panel function');
assert(/if \(restrictMode\) \{\s*if \(restrictMode === 'canvas'\) \{ renderCanvasTransitionsPane\(pane\); return; \}/.test(studio), 'renderElementPane dispatches to the real canvas panel only for restrictMode === \'canvas\'; anim mode\'s own branch (Part H, below) is the sibling fall-through');
assert(studio.includes('function postCmsCanvasTransitionsCommand(patch)') && studio.includes("type: 'defxn-cms-preview-canvas-transitions-command'"), 'field edits post a typed command into the connected preview iframe, mirroring postCmsStatesCommand\'s own shape');
assert(studio.includes('function postCmsCanvasTransitionPreview()') && studio.includes("type: 'defxn-cms-preview-canvas-transitions-preview'"), '"Preview this transition" posts its own one-shot message, never reusing the field-edit command type');
assert(studio.includes("preview.addEventListener('click', postCmsCanvasTransitionPreview)"), 'the panel\'s Preview button is wired to postCmsCanvasTransitionPreview');
assert(studio.includes("'defxn-cms-preview-canvas-transitions-replace'") && studio.includes('cmsSourceSite.canvasTransitions = event.data.canvasTransitions') && studio.includes("'defxn-studio-canvas-transitions-replace'"), 'Studio relays the live iframe\'s sanitized replace up to admin.js, the exact same two-hop relay shape as states/components/layout');
assert(studio.includes('const CMS_CANVAS_EFFECTS =') && studio.includes('const CMS_CANVAS_EASINGS ='), 'the two small fixed enums are mirrored here as literals (this document has no <script src> for js/content/canvas-transitions.js), the same pattern as CMS_FILL_TOKENS/CMS_DISPLAY_TOKENS etc.');

// js/main.js: the live preview iframe is the one document that actually has
// ArkCanvasTransitions loaded, so it computes every sanitize() for real and owns the
// one-shot preview against its own persistent layer.
assert(main.includes('var cmsCanvasTransitionsDraft') && main.includes('function cmsCanvasTransitionsCommand(data)') && main.includes('function cmsCanvasTransitionsPreview()'), 'js/main.js holds the live draft and both command handlers, mirroring cmsStatesDraft/cmsStatesCommand\'s shape');
assert(main.includes("data.type === 'defxn-cms-preview-canvas-transitions-command'") && main.includes("data.type === 'defxn-cms-preview-canvas-transitions-preview'"), 'both new message types are dispatched from the one big window message listener, the same as every other cmsXCommand');
assert(main.includes('ArkCanvasTransitions.define(site.canvasTransitions)'), 'the defxn-cms-preview-state handler seeds cmsCanvasTransitionsDraft from site.canvasTransitions, the same round trip layout/components/states already use');
assert(/ArkCanvasTransitions\.apply\(persistentEl, 'out'\)[\s\S]{0,200}setTimeout\(function \(\) \{ try \{ ArkCanvasTransitions\.apply\(persistentEl, 'in'\); \} catch \(e\) \{\} \}, outMs\)/.test(main), 'the preview handler applies out then schedules in after the real returned duration, reusing apply() exactly as navigate() does, never a separate preview-only animation path');

// js/admin/admin.js + js/admin/store.js: the save-path architecture decision -- the
// editing UI lives in admin-studio.html (per the plan), but persistence still goes
// through this exact draft/saved/dirty + saveStudioChanges() pipeline, mirroring
// statesDraft/applyStudioStatesReplace/ArkAdminStore.saveStates precisely.
assert(admin.includes('var canvasTransitionsDraft') && admin.includes('function canvasTransitionsDirty()'), 'admin.js keeps a canvasTransitionsDraft + dirty-check, the same shape as statesDraft/statesDirty');
assert(admin.includes('function applyStudioCanvasTransitionsReplace(whole)') && admin.includes("event.data.type === 'defxn-studio-canvas-transitions-replace') applyStudioCanvasTransitionsReplace"), 'admin.js applies a relayed replace the same way applyStudioStatesReplace does, dispatched from the same message listener');
assert(admin.includes('if (canvasTransitionsDirty())') && admin.includes('ArkAdminStore.saveCanvasTransitions(state.cdirs.content, canvasTransitionsDraft)') && admin.includes("download('canvas-transitions-data.js', ArkCanvasTransitions.serialize(canvasTransitionsDraft))"), 'saveStudioChanges() writes canvas-transitions-data.js on an explicit Save, the same connected-project-or-download branch every other Studio draft already uses');
assert(admin.includes('canvasTransitions: window.ArkCanvasTransitions ? clone(canvasTransitionsDraft) : null'), 'siteFromState() includes canvasTransitions, so admin-studio.html receives it on every defxn-studio-load/preview-state message');
const store = fs.readFileSync('js/admin/store.js', 'utf8');
assert(store.includes('async function saveCanvasTransitions(contentDir, whole)') && store.includes("write(contentDir, 'canvas-transitions-data.js', ArkCanvasTransitions.serialize(whole))") && store.includes('saveCanvasTransitions: saveCanvasTransitions'), 'ArkAdminStore gains saveCanvasTransitions, a single-file write exactly like saveMeshSettings/saveTheme/saveSettingsDefaults/saveStates');

// Part H (follow-up plan): animation-only mode's real panel, replacing the placeholder
// renderElementPane()'s restrictMode branch used to show for 'anim', and fixing the
// renderLayersPane dispatch conflict Part F's own comment flagged (anim mode needs the
// REAL connected-mode Layers tree to stay usable, since that's how an element is picked).
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

// Layers-tab dispatch fix: anim mode falls through to the REAL renderConnectedLayers()
// tree (Part B), the only way to pick an element to animate; canvas mode is unaffected.
assert(/function renderLayersPane\(\) \{\s*if \(restrictMode === 'canvas'\) \{ renderRestrictLayersPane\(\); return; \}\s*renderConnectedLayers\(\);\s*\}/.test(studio), "anim mode (restrictMode === 'anim') falls through to renderConnectedLayers() unconditionally now (Step 1 deleted the standalone renderLayers()/cmsConnected ternary it used to fall through to) -- it is never routed to a placeholder");
assert(!/\.anim-mode \.left/.test(studio.split('<script>')[0]) , "the CSS rule that used to hide the whole left rail in anim mode (.anim-mode .left { display: none; }) is gone -- the Layers tree must stay visible and usable while animating");
assert(/\.canvas-mode \.left \{ display: none; \}/.test(studio), 'canvas mode still hides the left rail (it has no use for the element tree), unaffected by the anim-mode fix');
assert(/function enterRestrictMode\(mode\) \{[\s\S]{0,900}showLeft\('layers'\); showTab\('tabEl', true\);/.test(studio), 'enterRestrictMode lands on the Layers tab and the Element tab on entry, mirroring enterComp\'s own showLeft/showTab calls, so anim mode always opens with the real tree in view');

// Selection still works in anim mode: the Layers tree's own click-to-select handler
// (postCmsSelectKey) and its receiving end in js/main.js are NOT among the ~14 sites
// restrictMode was threaded into for Part F -- selecting an element must stay live.
assert(/li\.addEventListener\('click', \(event\) => \{ if \(event\.target\.closest\('\.layer-toggle'\)[\s\S]{0,140}postCmsSelectKey\(row\.key\); \}\);/.test(studio), "renderConnectedLayers()'s row click handler calls postCmsSelectKey() unconditionally, with no restrictMode guard");
assert(studio.includes('function postCmsSelectKey(key) { if (!cmsConnected || !cmsPreview.contentWindow) return;') && !/function postCmsSelectKey\(key\) \{[^}]*restrictMode/.test(studio), 'postCmsSelectKey() itself is gated only on cmsConnected, never on restrictMode');
assert(main.includes("data.type === 'defxn-cms-preview-select-group'") && !/data\.type === 'defxn-cms-preview-select-group'[^\n]*restrictMode/.test(main), "js/main.js's receiving handler for a Layers-row click is not gated on restrictMode either");

// Studio's anim-mode panel: real controls for the CURRENTLY SELECTED element, gated on
// cmsExactSelection the same way every other selection-scoped panel already is, with the
// same honest empty-state convention this session uses throughout.
assert(studio.includes('function renderElementMotionPane(pane)'), 'renderElementPane\'s anim-mode branch is filled in with a real panel function');
assert(/if \(restrictMode === 'canvas'\) \{ renderCanvasTransitionsPane\(pane\); return; \}\s*renderElementMotionPane\(pane\);\s*return;/.test(studio), 'renderElementPane falls through to renderElementMotionPane for every restrictMode value that is not \'canvas\' (i.e. \'anim\')');
assert(studio.includes("'Select an element in the Layers panel to animate it.'"), 'with no element selected, the panel shows the plan\'s exact hint text instead of a broken or empty form');
assert(studio.includes('const CMS_ELEMENT_MOTION_DIRECTIONS =') , 'the direction enum is mirrored here as a literal (this document has no <script src> for js/content/element-motion.js), the same pattern as CMS_CANVAS_EFFECTS/CMS_FILL_TOKENS etc.');
assert(/segField\('Easing', 'easing', CMS_CANVAS_EASINGS,/.test(studio), 'the easing picker reuses Part G\'s own CMS_CANVAS_EASINGS constant directly, not a second copy of the same three strings');
assert(studio.includes('function postCmsElementMotionCommand(patch)') && studio.includes("type: 'defxn-cms-preview-element-motion-command'"), 'field edits post a typed command into the connected preview iframe, mirroring postCmsCanvasTransitionsCommand\'s own shape');
assert(studio.includes('function postCmsElementMotionPreview(key)') && studio.includes("type: 'defxn-cms-preview-element-motion-preview'"), '"Preview" posts its own one-shot message, never reusing the field-edit command type');
assert(studio.includes("postCmsElementMotionPreview(cmsExactSelection.key)"), 'the panel\'s Preview button targets the currently selected element\'s key');
assert(studio.includes("'defxn-cms-preview-element-motion-replace'") && studio.includes('cmsSourceSite.elementMotion = event.data.elementMotion') && studio.includes("'defxn-studio-element-motion-replace'"), 'Studio relays the live iframe\'s sanitized replace up to admin.js, the exact same two-hop relay shape as canvas-transitions/states/components/layout');

// js/main.js: the live preview iframe is the one document that actually has
// ArkElementMotion loaded, so it computes every set()/sanitize() for real and builds the
// one-shot Preview animation from the SAME vectorFor()/sign convention scene-state.js uses.
assert(main.includes('var cmsElementMotionDraft') && main.includes('function cmsElementMotionCommand(data)') && main.includes('function cmsElementMotionPreview(key)'), 'js/main.js holds the live draft and both command handlers, mirroring cmsCanvasTransitionsDraft/cmsCanvasTransitionsCommand\'s shape');
assert(main.includes("data.type === 'defxn-cms-preview-element-motion-command'") && main.includes("data.type === 'defxn-cms-preview-element-motion-preview'"), 'both new message types are dispatched from the one big window message listener, the same as every other cmsXCommand');
assert(main.includes('ArkElementMotion.define(site.elementMotion)'), 'the defxn-cms-preview-state handler seeds cmsElementMotionDraft from site.elementMotion, the same round trip canvasTransitions/layout/components/states already use');
assert(main.includes('ArkElementMotion.vectorFor(entry.direction)') && main.includes('ArkElementMotion.entryFor(cmsElementMotionDraft'), 'cmsElementMotionPreview reads the DRAFT\'s current value (not whatever is already saved) and resolves direction through the same vectorFor() table scene-state.js\'s own override branch uses, so the two can never describe a direction differently');

// js/admin/admin.js + js/admin/store.js: the save-path architecture decision -- the
// editing UI lives in admin-studio.html, but persistence still goes through this exact
// draft/saved/dirty + saveStudioChanges() pipeline, mirroring canvasTransitionsDraft/
// applyStudioCanvasTransitionsReplace/ArkAdminStore.saveCanvasTransitions precisely.
assert(admin.includes('var elementMotionDraft') && admin.includes('function elementMotionDirty()'), 'admin.js keeps an elementMotionDraft + dirty-check, the same shape as canvasTransitionsDraft/canvasTransitionsDirty');
assert(admin.includes('function applyStudioElementMotionReplace(whole)') && admin.includes("event.data.type === 'defxn-studio-element-motion-replace') applyStudioElementMotionReplace"), 'admin.js applies a relayed replace the same way applyStudioCanvasTransitionsReplace does, dispatched from the same message listener');
assert(admin.includes('if (elementMotionDirty())') && admin.includes('ArkAdminStore.saveElementMotion(state.cdirs.content, elementMotionDraft)') && admin.includes("download('element-motion-data.js', ArkElementMotion.serialize(elementMotionDraft))"), 'saveStudioChanges() writes element-motion-data.js on an explicit Save, the same connected-project-or-download branch every other Studio draft already uses');
assert(admin.includes('elementMotion: window.ArkElementMotion ? clone(elementMotionDraft) : null'), 'siteFromState() includes elementMotion, so admin-studio.html receives it on every defxn-studio-load/preview-state message');
assert(store.includes('async function saveElementMotion(contentDir, whole)') && store.includes("write(contentDir, 'element-motion-data.js', ArkElementMotion.serialize(whole))") && store.includes('saveElementMotion: saveElementMotion'), 'ArkAdminStore gains saveElementMotion, a single-file write exactly like saveCanvasTransitions/saveStates');

console.log('PASS: protected DEFXN Studio integration, feature surface, local persistence, publishing boundary, canvas-only mode\'s real background-transition panel, and animation-only mode\'s real per-element panel.');
