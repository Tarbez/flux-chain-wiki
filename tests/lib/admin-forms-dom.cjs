'use strict';
/* The real editor's content-form modules, booted in jsdom without the shell around them -- the
   way the shell itself now mounts them: a panel is handed a container and draws into it.
   Loads the real content modules the forms read (manifests, articles, images, encrypted items,
   SEO, mesh settings, theme, the page catalog, the reference docs) and the real editor files
   core -> notice -> state -> controls -> save -> editor -> articles -> assets -> secrets -> design -> seo ->
   shapes, in admin-app.html's order. What the SHELL's files would provide (the canvas bridge,
   the rail, the header popovers, versions) is a stub that records its calls, so a test can see
   what a form asked the canvas to do.
   Not a test itself (scripts/run-tests.mjs only runs tests/*.cjs|mjs at the top level). */
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
/* an index file writes a <script> per id while the page is read; here the ids are read from it */
const ids = (rel, name) => JSON.parse(new RegExp('var ' + name + ' = (\\[[^\\]]*\\])').exec(read(rel))[1]);

function bootForms() {
  const dom = new JSDOM('<!doctype html><body><header><button id="save" type="button">Save</button></header><div id="status"></div><div id="toast" hidden></div><main id="mount"></main></body>',
    { runScripts: 'outside-only', url: 'http://localhost/admin-app.html', pretendToBeVisual: true });
  const { window } = dom;
  /* the locked page above the editor (js/admin/core.js refuses to start without it) */
  Object.defineProperty(window, 'parent', { value: { ArkGate: { identity: () => null } }, configurable: true });
  if (!window.crypto || !window.crypto.subtle) Object.defineProperty(window, 'crypto', { value: require('node:crypto').webcrypto, configurable: true });
  const run = (rel) => window.eval(read(rel) + '\n//# sourceURL=' + rel);
  window.eval('var ArkUI = window.ArkUI || {};');
  for (const rel of ['js/content/manifest.js']) run(rel);
  window.eval('var ArkManifestIds = ' + JSON.stringify(ids('js/content/manifests/index.js', 'ArkManifestIds')) + ';');
  for (const id of window.ArkManifestIds) run('js/content/manifests/' + id + '.js');
  run('js/content/assets.js');
  window.eval('var ArkAssetIds = ' + JSON.stringify(ids('js/content/assets/index.js', 'ArkAssetIds')) + ';');
  for (const id of window.ArkAssetIds) run('js/content/assets/' + id + '.js');
  run('js/content/secrets.js');
  window.eval('var ArkSecretIds = ' + JSON.stringify(ids('js/content/secrets/index.js', 'ArkSecretIds')) + ';');
  for (const id of window.ArkSecretIds) run('js/content/secrets/' + id + '.js');
  for (const rel of ['js/content/theme.js', 'js/content/theme-data.js', 'js/content/settings-defaults.js', 'js/content/settings-defaults-data.js',
    'js/content/layout.js', 'js/content/layout-data.js', 'js/content/components.js', 'js/content/components-data.js',
    'js/content/states.js', 'js/content/states-data.js', 'js/content/canvas-transitions.js', 'js/content/canvas-transitions-data.js',
    'js/content/element-motion.js', 'js/content/element-motion-data.js', 'js/content/mesh-settings.js', 'js/content/mesh-settings-data.js',
    'js/content/learnings.js', 'js/content/article-index.js', 'js/content/site-pages.js', 'js/content/seo.js', 'js/content/seo-data.js', 'js/pages/catalog.js',
    'js/ark/reference-docs.js', 'js/admin/store.js', 'js/admin/primitives.js', 'js/admin/vendor/tweetnacl.js', 'js/admin/crypto.js']) run(rel);
  /* every article body, as loadBodies() would fetch them */
  for (const a of window.LearningContent.articles) if (!a.sections) run('js/content/articles/' + a.slug + '.js');

  const calls = [];
  const record = (name) => function () { calls.push({ name, args: Array.from(arguments) }); };
  run('js/admin/core.js');
  run('js/admin/notice.js');
  run('js/admin/overlay.js');
  /* what the shell, the bridge and the versions glue provide: recorded, never drawn */
  window.ArkAdmin.provide({
    notifyPreviewState: record('notifyPreviewState'), notifyPreviewMesh: record('notifyPreviewMesh'),
    notifyPreviewAssets: record('notifyPreviewAssets'), notifyPreviewTheme: record('notifyPreviewTheme'),
    reloadPreview: record('reloadPreview'), syncCmsPreview: record('syncCmsPreview'), refreshPanels: record('refreshPanels'),
    postCmsPreviewState: record('postCmsPreviewState'), setView: record('setView'), openPop: record('openPop'), closePop: record('closePop'),
    schedule: record('schedule'), studioRoutes: () => [], recordVersion: async () => '', writeSearchFiles: async () => [],
    removeRestoredExtras: async () => {}, writeRestoredOrder: async () => {}, restoreRemovalsPending: () => false, restoreReorderPending: () => false
  });
  for (const rel of ['js/admin/state.js', 'js/admin/controls.js', 'js/admin/save.js', 'js/admin/editor.js', 'js/admin/articles.js',
    'js/admin/assets.js', 'js/admin/secrets.js', 'js/admin/design.js', 'js/admin/seo.js', 'js/admin/shapes.js']) run(rel);
  window.ArkAdmin.adoptArticles(); window.ArkAdmin.state.articlesReady = true;
  return { dom, window, document: window.document, A: window.ArkAdmin, state: window.ArkAdmin.state, calls };
}

/* type into a control the way a person does: the value, then the event the control listens for */
function type(window, control, value) {
  control.focus();
  control.value = value;
  control.dispatchEvent(new window.Event('input', { bubbles: true }));
}
function choose(window, select, value) {
  select.value = value;
  select.dispatchEvent(new window.Event('change', { bubbles: true }));
}

module.exports = { bootForms, type, choose };
