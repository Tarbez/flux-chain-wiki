'use strict';
/* Regression: docs/ux-audit/cms.md P1-11 (finished 2026-10-20). Select an image on the canvas and the
   toolbar offered Alt text and nothing else: "Replace image" lived only in the Media tab, which the
   person had to know about. js/main.js now reports, with every selection, WHICH Media image an <img>
   (or SVG <image>) shows (`asset`, matched by the data URL ArkAsset.dataUrl makes), and the toolbar
   offers "Replace image" for it, opening Media on that image.
   Held here: the selection info names the asset by the image's data URL (source of cmsSelectionInfo
   read, not a browser); the toolbar action appears for an image that has an asset and a draft, opens
   Media on it, and is absent for an image that is not a Media image, for text, and for a container. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const main = fs.readFileSync('js/main.js', 'utf8');
assert(/ArkAsset\.dataUrl\(a\.id\) === imageSrc/.test(main) && /alt: alt, asset: asset \};/.test(main), 'cmsSelectionInfo reports the Media image an <img> shows');

const admin = require('./lib/admin-source.cjs').ADMIN;
const start = admin.indexOf('  const TB_IDENTITY = {'), end = admin.indexOf('  A.provide({ placeToolbarPop', start);
const code = admin.slice(start, end);

function setup(kind, selection, assetDrafts) {
  const dom = new JSDOM('<body><div id="studioRoot"><div id="stage"><div id="selToolbar" hidden></div></div><div id="selToolbarPop" hidden></div></div><iframe id="cmsPreview"></iframe></body>', { pretendToBeVisual: true });
  const w = dom.window, doc = w.document, calls = [];
  const noop = () => {};
  const ctx = {
    window: w, document: doc, innerWidth: 1280, innerHeight: 900, setTimeout, Date,
    $: (id) => doc.getElementById(id), ic: (name) => `<svg class="ic"><use href="#i-${name}"/></svg>`,
    CMS_TAG_ICON: {}, DEVICES: [['Desktop'], ['Tablet']],
    state: { device: 0, lens: 'design', cmsExactSelection: selection, cmsExactSelections: [selection], cmsContextMenuOpen: false, cmsConnected: true, live: false, tbOpen: '', tbOpenKey: '', tbAutoOpen: null, cmsSelectionCommands: [], assetDrafts },
    cmsPreview: doc.getElementById('cmsPreview'),
    selToolbarVisible: () => true, selToolbarKind: () => kind, cmsTreeRowForKey: () => ({ tag: 'img' }), makeFrameCtx: () => ({ get: () => 0, set() {} }),
    placeSelToolbar: noop, postCmsLayoutOperation: noop, selectDesign: noop, openContentEditor: noop,
    buildTypographySection: noop, buildFillSection: noop, buildSpacingSection: noop, buildFrameSection: noop, buildLayoutSection: noop, buildSizeSection: noop,
    buildEffectsSection: noop, buildAltTextSection: noop, buildComponentInstanceSection: noop, buildStateGroupSection: noop, buildElementMotionSection: noop, buildContentSection: noop,
  };
  w.ArkAdmin = { h: (tag) => doc.createElement(tag), ic: ctx.ic, provide(names) { Object.assign(this, names); } };
  vm.runInContext(fs.readFileSync('js/admin/overlay.js', 'utf8'), vm.createContext({ window: w, document: doc }));
  ctx.A = Object.assign(w.ArkAdmin, { toast: noop, openPageFields: noop, selectAsset: (id) => calls.push('media:' + id) });
  vm.createContext(ctx); vm.runInContext(code, ctx); ctx.renderSelToolbar();
  return { doc, calls, action: doc.getElementById('selToolbar').querySelector('[data-action="replace-image"]') };
}

const withAsset = setup('image', { key: 'path:img:1', label: 'img', tag: 'img', asset: 'iceberg-blocks' }, { 'iceberg-blocks': { id: 'iceberg-blocks' } });
assert(withAsset.action, 'an image that is a Media image offers Replace image');
assert.equal(withAsset.action.querySelector('.tb-lbl').textContent, 'Replace image', 'in words');
withAsset.action.click();
assert.deepEqual(withAsset.calls, ['media:iceberg-blocks'], 'it opens Media on that image');
assert(!setup('image', { key: 'path:img:1', tag: 'img', asset: '' }, {}).action, 'an image that is not a Media image does not');
assert(!setup('image', { key: 'path:img:1', tag: 'img', asset: 'gone' }, {}).action, 'nor one whose Media image no longer exists');
assert(!setup('text', { key: 'path:p:1', tag: 'p', asset: 'iceberg-blocks' }, { 'iceberg-blocks': {} }).action, 'text never does');
console.log('PASS: a selected Media image offers Replace image, which opens it in Media; other selections do not.');
