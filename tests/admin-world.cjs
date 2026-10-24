'use strict';
/* The 3D world is an editor draft: Save writes it, Publish carries it, versions record it, the
   canvas previews it, and Design > World edits it.

   Why this test exists (2026-10-24, the home redesign merge): the world's light, camera per page,
   motion, first-visit story and exits are owner-editable content (js/content/world.js). A draft
   the editor lists but Save, Publish or the version history do not reach is the defect that once
   dropped 5 of 13 drafts from every publish, so each way a draft is reached is asked of this one.
   Each block names the defect it catches.

     1. the row: DRAFTS lists 'world' with the fields the other single drafts have, and the
        editor has handles for it (Save, dirty, versions all go through singleDraftHandle)
     2. Save: saveWorld writes exactly ArkWorld.serialize(draft) to js/content/world-data.js, and
        what it writes is FLX records (never a JSON object) that read back as the same world
     3. Publish: the site bundle loads the module with its needs, archives a non-default world and
        writes js/content/world-data.js back byte-identically
     4. Preview: the sender posts the plain value as defxn-cms-preview-world, the canvas handler
        checks origin and source, and a world edit never re-sends (remounts) the whole site
     5. The panel: its controls are ArkWorld.knobs() in number and order, nothing written by hand;
        a change updates the draft, marks it dirty and previews; Reset and Clear work */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ADMIN } = require('./lib/admin-source.cjs');
const { bootForms } = require('./lib/admin-forms-dom.cjs');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const ArkWorld = require('../js/content/world.js');
const clone = (v) => JSON.parse(JSON.stringify(v));

class FakeFile { constructor() { this.text = ''; } async createWritable() { const f = this; let buf = ''; return { async write(t) { buf += t; }, async close() { f.text = buf; } }; } }
class FakeDir { constructor() { this.files = new Map(); }
  async getFileHandle(n, o) { if (!this.files.has(n)) { if (!(o && o.create)) throw new Error('NotFound'); this.files.set(n, new FakeFile()); } return this.files.get(n); } }

(async () => {
  /* ---- 1. the row ---- */
  const storeContext = vm.createContext({ ArkWorld });
  vm.runInContext(read('js/admin/store.js'), storeContext);
  const Store = vm.runInContext('ArkAdminStore', storeContext);
  const row = clone(Store.drafts().find((d) => d.key === 'world'));
  assert.deepEqual(row, { key: 'world', kind: 'single', global: 'ArkWorld', label: 'World', file: 'world', title: '3D world', needs: ['js/vendor/flx-state-grammar.js'], byRoute: ['views', 'exits'] }, 'DRAFTS lists the world with the fields the other single drafts have');
  assert.equal(Store.drafts().length, 15, 'the world was the 14th draft; the skin policy (tests/admin-skin-lab.cjs) is the 15th');
  assert(fs.existsSync(path.join(ROOT, row.needs[0])), 'its need exists');
  const handleBody = ADMIN.slice(ADMIN.indexOf('function singleDraftHandle(key)'), ADMIN.indexOf('async function saveEverything()'));
  assert(/\n\s+world: \{ draft: function \(\) \{ return state\.worldDraft; \}/.test(handleBody) && handleBody.includes('dirty: worldDirty') && handleBody.includes('ArkAdminStore.saveWorld(state.cdirs.content, state.worldDraft)'), 'the editor reaches the world draft through singleDraftHandle: draft, set, saved, dirty, save');
  assert(ADMIN.includes('function worldDirty()') && ADMIN.includes('state.worldDraft = ') && ADMIN.includes('statesDirty: statesDirty, worldDirty: worldDirty'), 'the editor keeps a world draft and its dirty check');
  assert(fs.readFileSync(path.join(ROOT, 'js/admin/versions-panel.js'), 'utf8').includes("world: '3D world'"), 'the version history names the draft in words');

  /* ---- 2. Save: exactly ArkWorld.serialize(draft), and FLX ---- */
  const draft = ArkWorld.sanitize({ look: { exposure: 1.5, keyStrength: 3.25, dust: 220 }, motion: { flight: 2400 }, story: { on: false },
    views: { '/chain': { dist: 55.5, yaw: 20 } }, exits: { '/chain': { words: 'zoom' }, '/': { words: 'side' } } });
  assert.notEqual(JSON.stringify(draft), JSON.stringify(ArkWorld.defaults()), 'the fixture is not the defaults (a default round trip proves nothing)');
  const dir = new FakeDir();
  await Store.saveWorld(dir, draft);
  const text = dir.files.get('world-data.js').text;
  assert.equal(text, ArkWorld.serialize(draft), 'saveWorld writes exactly ArkWorld.serialize(draft)');
  assert(/^ArkWorld\.define\("[^"]*"\);\n$/m.test(text.slice(text.indexOf('ArkWorld.define'))), 'the data is one define() call holding one string');
  const records = JSON.parse(/ArkWorld\.define\(("[^"]*")\);/.exec(text)[1]);
  assert(!/^\s*[{[]/.test(records), 'the stored text is FLX records, never a JSON object (workspace law: stored state is FLX)');
  assert(records.includes('-'), 'it is split into records on -');
  const back = vm.createContext({ TextEncoder, TextDecoder });
  vm.runInContext(read('js/vendor/flx-state-grammar.js'), back); vm.runInContext(read('js/content/world.js'), back); vm.runInContext(text, back);
  assert.deepEqual(clone(vm.runInContext('ArkWorld.get()', back)), draft, 'what Save wrote reads back as the same world');
  assert.equal(fs.readFileSync(path.join(ROOT, 'js/content/world-data.js'), 'utf8'), ArkWorld.serialize(ArkWorld.defaults()), 'the shipped file is the defaults, written the same way');

  /* ---- 3. Publish: the bundle carries it ---- */
  const bundle = await import('../scripts/lib/site-bundle.mjs');
  assert(bundle.siteDrafts().some((d) => d.key === 'world'), 'the site bundle reads the draft list from store.js and so lists the world');
  const site = bundle.readProject();
  assert.deepEqual(clone(site.world), ArkWorld.defaults(), 'the bundle loads js/content/world.js with its needs and reads the saved world');
  site.world = draft;
  assert.deepEqual(bundle.siteProblems(site), [], 'a site with a world is publishable');
  const files = bundle.projectFiles(site);
  assert.equal(files['js/content/world-data.js'], ArkWorld.serialize(draft), 'the bundle includes js/content/world-data.js, the bytes Save writes');
  const decoded = bundle.decodeSite(bundle.encodeSite(site));
  assert.equal(JSON.stringify(decoded.world), JSON.stringify(draft), 'the world survives the archive byte-identically under JSON.stringify (the hashing form)');

  /* ---- 4. the preview ---- */
  const bridge = read('js/admin/bridge.js');
  assert(bridge.includes("type: 'defxn-cms-preview-world', world"), 'the editor posts defxn-cms-preview-world with the world');
  assert(bridge.includes('ArkWorld.sanitize(value)'), 'it posts the plain sanitized value, not text');
  assert(bridge.includes("const LIVE_ONLY = new Set(['world', 'skinPolicy'])") && bridge.includes('if (CANVAS_OWNED.has(key) || LIVE_ONLY.has(key)) return;'), 'a world edit is not part of the content signature, so it never re-sends the whole site (a remount) under a slider');
  assert(/postCmsPreviewLens\(\);\s*postWorldNow\(\);/.test(bridge) && bridge.includes('postCmsPreviewLens(); postWorldNow();'), 'the draft is sent again on load and after every ready (a remount rebuilt the world from the saved file)');
  const main = read('js/main.js');
  const handler = /if \(data\.type === 'defxn-cms-preview-world'[^\n]*\{\n([\s\S]*?)\n    \}\n/.exec(main);
  assert(handler, 'js/main.js handles defxn-cms-preview-world');
  assert(/event\.source === window\.parent && cmsPreviewQuery/.test(handler[0]), 'only from the parent, only in a preview iframe');
  assert(handler[1].includes('ArkWorld.define(data.world)'), 'it defines the world in place; ArkWorld.onChange tells the world to repaint');
  assert(/function cmsOnMessage\(event\) \{\s*if \(event\.origin !== location\.origin\) return;/.test(main), 'and only from this origin (the guard every preview message passes first)');

  /* ---- 5. the panel ---- */
  const app = bootForms();
  const { window, document, A, state, calls } = app;
  state.cmsCurrentRoute = '/chain';
  state.cmsRoutes = [{ path: '/', title: 'Home' }, { path: '/chain', title: 'Chain' }];
  const mount = document.createElement('div'); mount.id = 'worldPanel'; document.body.appendChild(mount);
  A.renderWorldPanel(mount);
  const knobs = ArkWorld.knobs();
  const controls = [...mount.querySelectorAll('[data-knob]')];
  /* the panel draws the site-wide groups and "This page": every knob, once, in the schema's order */
  assert.deepEqual(controls.map((c) => c.dataset.knob), knobs.map((k) => k.group + '.' + k.key), 'the panel has one control per knob, in the schema order (' + knobs.length + ')');
  knobs.forEach((k) => {
    const el = mount.querySelector('[data-knob="' + k.group + '.' + k.key + '"]');
    if (k.kind === 'number') {
      const range = el.querySelector('input[type="range"]'), num = el.querySelector('input[type="number"]');
      assert(range && num, k.label + ': a slider and a number field');
      assert.deepEqual([range.min, range.max, range.step].map(Number), [k.min, k.max, k.step], k.label + ': the slider takes min, max, step from the schema');
      assert.deepEqual([num.min, num.max, num.step].map(Number), [k.min, k.max, k.step], k.label + ': so does the number field');
    } else if (k.kind === 'toggle') {
      const sw = el.querySelector('input[type="checkbox"][role="switch"]'); assert(sw, k.label + ': a switch');
    } else {
      const buttons = [...el.querySelectorAll('.ctl-seg button')];
      assert.deepEqual(buttons.map((b) => b.textContent.toLowerCase()), k.choices, k.label + ': a segmented control with the schema\'s choices');
    }
    assert(el.textContent.includes(k.label), k.label + ': the label is the schema\'s');
  });
  const tabs = [...mount.querySelectorAll('[role="tab"]')].map((t) => t.textContent);
  assert.deepEqual(tabs, ['Look', 'Motion', 'Story', 'This page'], 'Look, Motion, Story, This page');

  /* a change: the draft, dirty, preview */
  const slider = mount.querySelector('[data-knob="look.exposure"] input[type="range"]');
  assert.equal(A.worldDirty(), false, 'clean at the start');
  const before = calls.filter((c) => c.name === 'notifyPreviewWorld').length;
  slider.value = '1.7'; slider.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(state.worldDraft.look.exposure, 1.7, 'the slider writes the draft');
  assert.equal(A.worldDirty(), true, 'and marks it dirty');
  assert(calls.filter((c) => c.name === 'notifyPreviewWorld').length > before, 'and previews it live');
  assert.equal(A.singleDraftHandle('world').dirty(), true, 'Save sees it');
  const num = mount.querySelector('[data-knob="look.exposure"] input[type="number"]');
  num.value = '99'; num.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(state.worldDraft.look.exposure, 2.4, 'a number past the range is clamped to the schema');
  assert.equal(num.value, '2.4', 'and the field shows the clamped value');
  const sw = mount.querySelector('[data-knob="story.on"] input'); sw.checked = false; sw.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(state.worldDraft.story.on, false, 'a switch writes a boolean');
  mount.querySelector('[data-knob="motion.flight"] input[type="number"]').value = '2000';
  mount.querySelector('[data-knob="motion.flight"] input[type="number"]').dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(state.worldDraft.motion.flight, 2000);

  /* This page: a camera field for the route on the canvas; empty keeps the page's own camera */
  const dist = mount.querySelector('[data-knob="view.dist"] input[type="range"]');
  assert.equal(dist.classList.contains('unset'), true, 'a camera field nobody set shows as built in');
  dist.value = '60'; dist.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.deepEqual(clone(state.worldDraft.views), { '/chain': { dist: 60 } }, 'the view knob is keyed by the route on the canvas');
  const seg = [...mount.querySelectorAll('[data-knob="exit.words"] .ctl-seg button')].find((b) => /zoom/i.test(b.textContent)); seg.click();
  assert.deepEqual(clone(state.worldDraft.exits), { '/chain': { words: 'zoom' } }, 'the exit is keyed by the route too');
  const builtIn = mount.querySelector('[data-knob="view.dist"] button'); builtIn.click();
  assert.equal(state.worldDraft.views['/chain'], undefined, '"Use built-in" clears the setting (and an empty view is dropped)');
  const pick = mount.querySelector('#world-route'); pick.value = '/'; pick.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.deepEqual(clone(calls.filter((c) => c.name === 'openRoute').pop().args), ['/'], 'the route picker asks the editor to open that page on the canvas');
  const clear = mount.querySelector('[data-reset="page"]');
  assert.equal(clear.disabled, false, 'this page has an exit, so it can be cleared');
  clear.click();
  assert.deepEqual(clone([state.worldDraft.views, state.worldDraft.exits]), [{}, {}], 'Clear removes the page\'s overrides');
  assert.equal(mount.querySelector('[data-reset="page"]').disabled, true, 'and then says why it cannot clear again');
  assert(mount.querySelector('[data-reset="page"]').title.length > 10, 'with a reason');

  /* Reset per group */
  const looks = ArkWorld.defaults().look;
  mount.querySelector('[data-reset="look"]').click();
  assert.deepEqual(clone(state.worldDraft.look), looks, 'Reset look returns the look to the defaults');
  assert.equal(state.worldDraft.motion.flight, 2000, 'and touches nothing else');
  assert.equal(state.worldDraft.story.on, false);
  mount.querySelector('[data-reset="story"]').click();
  assert.equal(state.worldDraft.story.on, true, 'Reset story');

  /* Revert: the draft goes back to what is saved */
  assert.equal(A.worldDirty(), true, 'the flight change is still unsaved');
  A.revertWorld();
  assert.equal(A.worldDirty(), false, 'Revert puts the draft back to the saved world');
  assert.deepEqual(clone(state.worldDraft), ArkWorld.defaults(), 'which is the shipped one');
  console.log('PASS: admin-world: the World draft is listed, saved as FLX, published, previewed live and edited from the schema (' + knobs.length + ' knobs)');
})().catch((e) => { console.error(e); process.exit(1); });
