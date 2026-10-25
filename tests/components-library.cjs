'use strict';
/* The CMS Library is the Ark block registry (Wave 2, W2-LIBRARY; docs/ux-audit/components.md §5
   line 6, docs/ux-audit/cms.md P2-5). Each case names the defect it exists to catch.

   The Library used to offer six hand-built typed blocks from a list written out in
   js/content/components.js, edited through text boxes named after raw prop names (heading, body,
   align, size), with no validation: an Ark block could not be inserted at all, and a list, a link
   or a "no reading" value could not be edited. Now the insertable blocks are DERIVED from
   ArkKit.describeArkBlocks (plus the legacy blocks Ark has no successor for yet), their fields
   from the SDK's getCmsArkBlockEditorFields, and saving goes through the SDK's strict
   validateCmsArkBlock. Runs the real scripts in one jsdom window: engines, the full ArkKit, the
   glossary, the SDK block-check bundle, components.js, the ArkUI runtime and the blocks adapter,
   and the real js/admin/library.js with the shared ctl* builders cut from the editor source. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { buildersSource, functionSource, arkHostSource } = require('./lib/admin-source.cjs');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const plain = (x) => JSON.parse(JSON.stringify(x));

function windowWith(files, url) {
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="libPane"></div><main data-page="x"><div data-ark-insert="main"></div></main></body></html>', { runScripts: 'outside-only', url: url || 'https://defxn.com/x', pretendToBeVisual: true });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;   // the FLX grammar components are stored in turns text into bytes; jsdom has no codec
  w.eval('var ArkCopy = { isKey: function () { return false; }, resolve: function (v) { return v; }, text: function (k) { return k; } };');
  /* components are stored as FLX records: the grammar comes before the module that reads them, as in index.html */
  const order = files.includes('js/content/components.js') ? ['js/vendor/flx-state-grammar.js'].concat(files) : files;
  for (const file of order) w.eval(read(file) + '\n//# sourceURL=' + file);
  return { dom, w };
}
const KIT = ['js/ark/vendor/engines.js', 'js/ark/vendor/ark-kit.js', 'js/content/glossary.js', 'js/admin/vendor/cms-blocks.js'];
let passed = 0;
function test(name, fn) { try { fn(); passed += 1; } catch (error) { console.error('FAIL ' + name); throw error; } }

/* ---------------------------------------------------------------- the registry, derived */
const { w } = windowWith(KIT.concat(['js/content/components.js']));
const C = w.ArkComponents, kit = w.ArkKit, sdk = w.ArkCmsBlocks;
const described = kit.describeArkBlocks();

test('every Ark block is insertable, derived from the registry -- a block Ark adds appears without a line changing here', () => {
  const offered = C.blocks();
  for (const name of kit.ARK_BLOCK_NAMES) {
    assert(offered.some((b) => b.resolver === C.arkResolverFor(name) && b.name === name && !b.legacy), 'the Library offers the Ark block ' + name);
  }
  assert.equal(new Set(offered.map((b) => b.resolver)).size, offered.length, 'no block is offered twice');
  assert.equal(C.arkResolverFor('section-header'), 'ARK_BLOCK_SECTION_HEADER', 'the resolver id rule js/ark/blocks.js registers');
  assert.equal(C.arkBlockName('ARK_BLOCK_CARD_GRID'), 'card-grid');
});

test('a legacy block is offered for NEW components only while Ark has no block for its job', () => {
  const legacy = C.blocks().filter((b) => b.legacy).map((b) => b.resolver);
  const names = kit.ARK_BLOCK_NAMES;
  /* derived from the successor rule, not a list typed into this test */
  const expected = ['RBLOCK_TEXT_V1', 'RBLOCK_CTA_V1', 'RBLOCK_IMAGE_V1', 'RBLOCK_CARD_V1', 'RBLOCK_QUOTE_V1', 'RBLOCK_DIVIDER_V1']
    .filter((r) => !names.includes({ RBLOCK_TEXT_V1: 'text', RBLOCK_CTA_V1: 'actions', RBLOCK_IMAGE_V1: 'figure', RBLOCK_CARD_V1: 'card', RBLOCK_QUOTE_V1: 'quote', RBLOCK_DIVIDER_V1: 'divider' }[r]));
  assert.deepEqual(plain(legacy), expected, 'legacy blocks still offered');
  assert(!C.blocks().some((b) => b.resolver === C.CAPTURED), 'a captured component is made from a selection, never offered from nothing');
});

test('groups are decided by structure, then by Ark\'s own category (cms.md: Text, Media, Layout, Data, Navigation, Captured)', () => {
  const group = (name) => C.blocks().find((b) => b.name === name).group;
  for (const d of described) {
    let nests = false, media = false;
    const walk = (s) => { if (!s || typeof s !== 'object') return; if (s.kind === 'blocks') nests = true; if (s.kind === 'slot' || (s.kind === 'object' && s.fields && s.fields.src)) media = true; walk(s.of); if (s.values && !Array.isArray(s.values)) walk(s.values); Object.values(s.fields || {}).forEach(walk); };
    Object.values(d.props).forEach(walk);
    const want = nests ? 'layout' : media ? 'media' : d.category === 'content' ? 'text' : d.category;
    assert.equal(group(d.name), want, d.name + ' is grouped by its structure');
  }
  assert.equal(group('tabs'), 'layout'); assert.equal(group('stat'), 'data'); assert.equal(group('breadcrumb'), 'navigation'); assert.equal(group('hero'), 'text');
  assert.deepEqual(plain(C.groups()).map((g) => g.label), ['Text', 'Media', 'Layout', 'Data', 'Navigation', 'Captured']);
});

test('the SDK\'s editor fields and the kit\'s registry describe the same blocks (two deliveries of one registry must not drift)', () => {
  assert.deepEqual(plain(sdk.CMS_ARK_BLOCK_NAMES).slice().sort(), plain(kit.ARK_BLOCK_NAMES).slice().sort(), 'the same block names');
  for (const d of described) {
    const fields = sdk.getCmsArkBlockEditorFields(d.name);
    assert.deepEqual(plain(fields.map((f) => f.prop + ':' + f.kind + (f.required ? '*' : ''))), Object.entries(d.props).map(([p, s]) => p + ':' + s.kind + (s.required ? '*' : '')), d.name + ': same props, kinds and required flags');
  }
});

/* ---------------------------------------------------------------- saved data: kept by shape */
test('an Ark master survives sanitize() with NO registry loaded (components-data.js loads before the kit on the site)', () => {
  const bare = windowWith(['js/content/components.js']).w.ArkComponents;
  const saved = { version: 1, masters: {
    m1: { resolver: 'ARK_BLOCK_HERO', label: 'Top', props: { title: 'Hi', actions: [{ label: 'Go', href: 'route:about', tone: 'primary' }], level: 1 } },
    m2: { resolver: 'ARK_BLOCK_FROM_A_NEWER_ARK', label: 'Later', props: { anything: { nested: [1, 'two', null, true] } } },
    m3: { resolver: 'ARK_BLOCK_STAT', label: 'Absent', props: { label: 'Swaps', value: null, futureProp: 'kept' } },
    m4: { resolver: 'HERO_SCENE_INTERNAL', label: 'No', props: {} },
  }, routes: { '/x': { main: [{ key: 'i1', masterId: 'm1', overrides: { title: 'Over', actions: [] } }] } } };
  const clean = plain(bare.sanitize(saved));
  assert.deepEqual(Object.keys(clean.masters), ['m1', 'm2', 'm3'], 'Ark masters are kept by the shape of their resolver; a non-block resolver is still dropped');
  assert.deepEqual(clean.masters.m1.props, saved.masters.m1.props, 'structured props (lists, objects) are kept as they are');
  assert.equal(clean.masters.m3.props.value, null, 'null is kept: it IS a stat\'s absent reading (absent is not 0)');
  assert.equal(clean.masters.m3.props.futureProp, 'kept', 'a prop this registry does not know is kept (future law); strict saving refuses it, sanitize never deletes it');
  assert.deepEqual(clean.routes['/x'].main[0].overrides, { title: 'Over', actions: [] }, 'structured overrides are kept');
  assert.equal(JSON.stringify(bare.sanitize(clean)), JSON.stringify(clean), 'and a second pass rewrites nothing');
});

test('a NEW master must name a block the loaded registry has (a typo would save a master that renders nothing)', () => {
  let draft = C.createMaster({}, 'm1', 'ARK_BLOCK_HEROO', { title: 'x' }, 'Typo');
  assert(!draft.masters.m1, 'an unknown block is not created');
  draft = C.createMaster({}, 'm1', 'ARK_BLOCK_HERO', { title: 'x' }, 'Hero');
  assert(draft.masters.m1, 'a known one is');
});

/* ---------------------------------------------------------------- validation (the save path) */
const probe = (resolver, props, overrides) => ({ version: 1, masters: { m1: { resolver, label: 'Pricing hero', props } }, routes: overrides ? { '/about': { main: [{ key: 'i1', masterId: 'm1', overrides }] } } : {} });
test('every block\'s starter (its registry example) passes the SDK\'s strict check', () => {
  for (const b of C.blocks().filter((x) => !x.legacy)) {
    assert.deepEqual(plain(C.problems(probe(b.resolver, C.starterProps(b.resolver, '')))), [], b.name + ': its starter is valid as saved');
    const withText = C.starterProps(b.resolver, 'State 1');
    if (Object.keys(withText).length) assert(JSON.stringify(withText).includes('State 1') || !Object.values(described.find((d) => d.name === b.name).props).some((s) => (s.kind === 'line' || s.kind === 'text')), b.name + ': a new state\'s text lands in a visible prop');
  }
});
test('a refusal names the component, the field by its LABEL path, what is missing and the remedy', () => {
  const missing = plain(C.problems(probe('ARK_BLOCK_HERO', { actions: [{ label: 'Go', tone: 'loud' }] })));
  const title = missing.find((p) => p.path === 'props.title');
  assert(title && title.field === 'Title' && /missing/.test(title.failure) && title.needs && title.remedy, 'the missing required title: ' + JSON.stringify(missing));
  assert.match(title.sentence, /^Component "Pricing hero", Title: title is missing\. Needs one line of text\. Remedy: /);
  const tone = missing.find((p) => p.path === 'props.actions[0].tone');
  assert(tone && tone.field === 'Actions #1 › Emphasis', 'a nested field is named by its labels, not props.actions[0].tone: ' + JSON.stringify(tone));
  const extra = plain(C.problems(probe('ARK_BLOCK_QUOTE', { text: 'Words', colour: 'red' })));
  assert(extra.some((p) => p.path === 'props.colour' && /not a prop/.test(p.failure)), 'strict: a prop the block does not define is refused on save');
});
test('an instance is checked as it SHOWS (definition + overrides), and says where it is', () => {
  const found = plain(C.problems(probe('ARK_BLOCK_QUOTE', { text: 'Words' }, { text: '' })));
  assert.equal(found.length, 1, JSON.stringify(found));
  assert.equal(found[0].route, '/about'); assert.equal(found[0].key, 'i1');
  assert.match(found[0].sentence, /^"Pricing hero" on \/about, Quote: /);
  const both = plain(C.problems(probe('ARK_BLOCK_QUOTE', {}, { name: 'Ada' })));
  assert.equal(both.filter((p) => p.path === 'props.text').length, 1, 'what the definition already refuses is said once, on the definition');
});
test('with no block check loaded, an Ark master is refused as UNCHECKED -- never passed as checked', () => {
  const bare = windowWith(['js/content/components.js']).w.ArkComponents;
  const found = plain(bare.problems(probe('ARK_BLOCK_QUOTE', { text: 'Fine' })));
  assert.equal(found.length, 1); assert.match(found[0].failure, /could not be checked/); assert.match(found[0].needs, /cms-blocks\.js/);
  assert.deepEqual(plain(bare.problems(probe('RBLOCK_TEXT_V1', { heading: 'x' }))), [], 'a legacy block has no Ark schema: nothing to check');
});
test('Save refuses the components draft while any refusal stands (js/admin/save.js)', () => {
  const save = functionSource('singleDraftHandle');
  assert(/components: \{[\s\S]*?ArkComponents\.problems\(state\.componentsDraft\)[\s\S]*?throw new Error\('Not saved: '[\s\S]*?ArkAdminStore\.saveComponents/.test(save), 'components.save() checks before it writes');
});

/* ---------------------------------------------------------------- an Ark master on the page */
test('an Ark-block instance renders through ArkComponents.render -> ArkUI.build -> the adapter -> the real Ark block', () => {
  const { w: site } = windowWith(['js/ark/atomizer.js', 'js/ark/flux.js', 'js/ark/runtime.js', 'js/ark/vendor/engines.js', 'js/content/components.js']);
  site.eval("ArkUI.pageCatalog = { about: { path: '/about' } }; ArkUI.route = { href: function (p) { return p; } };");
  const scripts = JSON.parse(/ArkUI\.blockScripts = (\[[^\]]+\]);/.exec(read('js/pages/catalog.js'))[1].replace(/'/g, '"'));
  for (const file of scripts) site.eval(read(file) + '\n//# sourceURL=' + file);
  let draft = site.ArkComponents.createMaster({}, 'm1', 'ARK_BLOCK_STAT', { label: 'Swaps per second', value: null, absent: { reason: 'the feed is down' } }, 'Swaps');
  draft = site.ArkComponents.insertInstance(draft, '/x', 'main', 'i1', 'm1');
  const host = site.document.querySelector('[data-ark-insert="main"]');
  const built = site.ArkComponents.render(host, '/x', 'main', draft);
  assert.equal(built.length, 1);
  assert.equal(built[0].getAttribute('data-ark-block'), 'stat', 'the Ark stat block itself is the instance root');
  assert.equal(built[0].getAttribute('data-ark-component-key'), 'i1', 'tagged for the editor\'s inspector like every instance');
  assert(!/\b0\b/.test(built[0].textContent) && /No reading|feed is down/i.test(built[0].textContent), 'an absent reading shows as absent, never as 0: ' + built[0].textContent);
});

/* ---------------------------------------------------------------- the Library panel */
function library(points, masters) {
  const { dom, w: ed } = windowWith(KIT.concat(['js/content/components.js']), 'http://x/');
  const doc = ed.document, sent = [], toasts = [];
  ed.eval("var ArkUI = { pageCatalog: { about: { path: '/about' }, resolvers: { path: '/resolvers' } } };");
  ed.eval(buildersSource() + '\n' + functionSource('h') + '\n' + arkHostSource());
  ed.ArkAdmin = {
    state: { cmsSourceSite: { components: { masters: masters || {}, routes: {} } }, cmsInsertPoints: points, cmsPreviewRoute: '/download', cmsConnected: true, libKey: '' },
    showLeft() {}, $: (id) => doc.getElementById(id), cmsPreview: { contentWindow: { postMessage() {} } }, h: ed.h,
    postCmsComponentsCommand: (m) => sent.push(plain(m)), cmsNextComponentId: (p) => p + (sent.length + 1), toast: (t) => toasts.push(t), ic: () => '',
    cmsMasterKind: (m) => ed.ArkComponents.labelOf(m && m.resolver), ctlField: ed.ctlField, ctlSelectField: ed.ctlSelectField, ctlSegField: ed.ctlSegField, refuse: ed.refuse,
    CMS_BLOCK_RESOLVERS: ed.ArkComponents.blocks(),
    linkPickerEl: (label, keyHint, value, onchange) => { const box = doc.createElement('div'); box.className = 'field-link'; const i = doc.createElement('input'); i.value = value; i.setAttribute('aria-label', label); i.addEventListener('change', () => onchange(i.value)); box.appendChild(i); return box; },
    devDetails: () => doc.createElement('details'),
    arkAccordion: ed.arkAccordion,   /* the groups' fold (js/admin/ark-host.js); with the kit loaded it is Ark's accordion */
    provide(names) { Object.assign(this, names); },
  };
  ed.eval(read('js/admin/library.js'));
  ed.ArkAdmin.renderLibrary();
  const pane = doc.getElementById('libPane');
  const rowOf = (resolver) => pane.querySelector(`.lib-block[data-resolver="${resolver}"]`);
  const button = (root, text) => [...root.querySelectorAll('button')].find((b) => b.textContent === text);
  const change = (el, value) => { el.value = value; el.dispatchEvent(new ed.Event(el.tagName === 'SELECT' ? 'change' : 'change')); };
  return { ed, dom, doc, pane, sent, toasts, rowOf, button, change };
}
const ONE = [{ id: 'main', anchorId: 'main', kind: 'anchor', label: 'Page slot "main"', width: 900, usable: true }];

test('the panel: grouped in the IA\'s order, every block with a live mini-render of the real Ark block, plain names', () => {
  const lib = library(ONE);
  const groups = [...lib.pane.querySelectorAll('.lib-group')].map((g) => g.dataset.group);
  assert.deepEqual(groups, ['text', 'media', 'layout', 'data', 'navigation', 'captured'], 'groups in order');
  for (const name of lib.ed.ArkKit.ARK_BLOCK_NAMES) {
    const row = lib.rowOf('ARK_BLOCK_' + name.toUpperCase().replace(/[^A-Z0-9]+/g, '_'));
    assert(row, 'a row for ' + name);
    assert(row.querySelector('.lib-thumb-inner .ark-block'), name + ': its thumbnail is the real Ark render');
    assert(!row.querySelector('.lib-thumb [id]'), name + ': a thumbnail repeats no id');
    assert(!/[A-Z_]{6,}|[a-z]+[A-Z][a-z]+/.test(row.querySelector('.lib-words span').textContent), name + ': a plain name, not an id');
  }
  assert.match(lib.pane.querySelector('[data-group="captured"] .lib-empty').textContent, /More → Make component/, 'Captured says how to fill it (cms.md onboarding 5)');
  assert(!/Open in Content|Theme & defaults/.test(lib.pane.textContent), 'no unrelated buttons (P2-5): Edit its words and Site style live in the toolbar and header');
});

test('search filters by name and description; nothing found says so', () => {
  const lib = library(ONE);
  const box = lib.pane.querySelector('#libSearch');
  box.value = 'table'; box.dispatchEvent(new lib.ed.Event('input'));
  const visible = [...lib.pane.querySelectorAll('[data-find]')].filter((r) => !r.hidden).map((r) => r.dataset.resolver);
  assert(visible.includes('ARK_BLOCK_TABLE') && visible.every((r) => lib.rowOf(r).dataset.find.includes('table')), 'only matches show: ' + visible);
  assert(lib.pane.querySelector('[data-group="captured"]').hidden, 'a group with no match hides');
  box.value = 'zzzz'; box.dispatchEvent(new lib.ed.Event('input'));
  assert(!lib.pane.querySelector('.lib-no-match').hidden && /Nothing matches "zzzz"/.test(lib.pane.querySelector('.lib-no-match').textContent));
});

test('Insert puts a block in as it comes: created from its registry example, then inserted at the one place', () => {
  const lib = library(ONE);
  lib.button(lib.rowOf('ARK_BLOCK_CARD'), 'Insert').click();
  const [create, insert] = lib.sent;
  assert.equal(create.action, 'create-master'); assert.equal(create.resolver, 'ARK_BLOCK_CARD'); assert.equal(create.label, 'Card');
  assert.deepEqual(plain(lib.ed.ArkComponents.problems({ version: 1, masters: { m: { resolver: 'ARK_BLOCK_CARD', props: create.props, label: 'x' } }, routes: {} })), [], 'what it creates passes the strict check');
  assert.deepEqual(insert, { action: 'insert-instance', anchorId: 'main', key: insert.key, masterId: create.id }, 'and inserts THAT master');
});

test('Customize: fields from the schema with plain labels, a live preview, refusals as they change, and Create refused until valid', () => {
  const lib = library(ONE);
  lib.button(lib.rowOf('ARK_BLOCK_HERO'), 'Customize').click();
  const form = lib.pane.querySelector('.lib-new[data-resolver="ARK_BLOCK_HERO"]');
  assert(form && form.querySelector('.lib-preview .ark-block'), 'a live preview of the block being configured');
  const title = form.querySelector('[data-prop="title"]');
  assert.equal(title.getAttribute('aria-label'), 'Title', 'the field is named by its schema label, not "title"');
  assert(form.querySelector('[data-prop="lede"]').tagName === 'TEXTAREA', 'a text prop is a multi-line box');
  assert.match(form.querySelector('.lib-glossary-hint').textContent, /\[\[/, 'glossary markup is explained where text is typed');
  /* an action's link went through the site's link picker, and the example's /about became a route */
  const create = lib.button(form, 'Create block');
  lib.change(title, '');
  assert(!form.querySelector('.lib-refusals').hidden && /Title: Title is missing\. Needs one line of text/.test(form.querySelector('.lib-refusals').textContent), 'the refusal shows as soon as the title is cleared: ' + form.querySelector('.lib-refusals').textContent);
  assert(create.disabled && /Title — title is missing/.test(create.title), 'Create is refused, naming what to fix');
  create.click();
  assert.equal(lib.sent.length, 0, 'nothing is created while refused');
  lib.change(form.querySelector('[data-prop="title"]'), 'Every answer carries its proof');
  /* a choice of two is a segmented control; Default means absent */
  const align = form.querySelector('.ctl-seg[data-prop="align"]');
  assert.deepEqual([...align.querySelectorAll('button')].map((b) => b.textContent), ['Default', 'Start', 'Center']);
  [...align.querySelectorAll('button')].find((b) => b.textContent === 'Center').click();
  /* a number left empty is absent, never 0 */
  const level = form.querySelector('[data-prop="level"]');
  assert.equal(level.type, 'number'); assert.equal(level.value, '', 'an unset number shows empty, not 0');
  lib.change(level, '2'); lib.change(level, '');
  lib.button(form, 'Create block').click();
  const made = lib.sent.pop();
  assert.equal(made.action, 'create-master'); assert.equal(made.resolver, 'ARK_BLOCK_HERO');
  assert.equal(made.props.title, 'Every answer carries its proof'); assert.equal(made.props.align, 'center');
  assert(!('level' in made.props), 'the emptied number is absent, not 0');
  const example = lib.ed.ArkKit.describeArkBlocks().find((d) => d.name === 'hero').example.actions;
  example.forEach((a, i) => assert.equal(made.props.actions[i].href, a.href === '/about' ? 'route:about' : a.href === '/resolvers' ? 'route:resolvers' : a.href,
    'an example link to a page the catalogue knows is stored as a route: link (the router opens it in place): ' + JSON.stringify(made.props.actions)));
});

test('lists: add, remove and reorder items; a table row\'s cells come from its own columns', () => {
  const lib = library(ONE);
  lib.button(lib.rowOf('ARK_BLOCK_TABLE'), 'Customize').click();
  const form = () => lib.pane.querySelector('.lib-new');
  const rows = () => form().querySelector('fieldset[data-prop="rows"]');
  const cols = lib.ed.ArkKit.describeArkBlocks().find((d) => d.name === 'table').example.columns;
  const firstRow = rows().querySelector('.lib-item');
  assert.deepEqual([...firstRow.querySelectorAll('[data-prop^="rows.0."]')].map((el) => el.dataset.prop), plain(cols.map((c) => 'rows.0.' + c.key)), 'one cell per column key, derived from the sibling columns list');
  const before = rows().querySelectorAll('.lib-item').length;
  lib.button(rows(), '+ Add row').click();
  assert.equal(rows().querySelectorAll('.lib-item').length, before + 1, 'Add appends an item');
  const last = [...rows().querySelectorAll('.lib-item')].pop();
  last.querySelector('[aria-label^="Remove"]').click();
  assert.equal(rows().querySelectorAll('.lib-item').length, before, 'Remove takes it out');
  const up = [...rows().querySelectorAll('.lib-item')][1].querySelector('[aria-label^="Move up"]');
  up.click();
  assert.equal(rows().querySelector('[data-prop="rows.0.mode"]').value, lib.ed.ArkKit.describeArkBlocks().find((d) => d.name === 'table').example.rows[1].mode, 'Move up reorders');
  /* "absent is not 0" inside a row: a cell emptied is no reading */
  const cell = rows().querySelector('[data-prop="rows.0.ops"]');
  lib.change(cell, '');
  lib.button(form(), 'Create block').click();
  const made = lib.sent.pop();
  assert(!('ops' in made.props.rows[0]), 'the emptied cell is absent, not 0: ' + JSON.stringify(made.props.rows[0]));
});

test('Edit a saved definition: its fields, its refusals, and a prop no longer in the block shown with Remove (never hidden)', () => {
  const lib = library(ONE, { m1: { resolver: 'ARK_BLOCK_QUOTE', label: 'Founder quote', props: { text: 'Words', colour: 'red' } } });
  const row = lib.pane.querySelector('.myrow[data-master="m1"]');
  assert(row && row.closest('[data-group="text"]'), 'a saved Ark component is listed in its block\'s group');
  lib.button(row, 'Edit').click();
  const def = lib.pane.querySelector('.lib-definition');
  assert(def.querySelector('[aria-label="Definition Quote"]'), 'the definition\'s own fields');
  assert.match(def.querySelector('.lib-refusals').textContent, /"colour" is not a prop/, 'the strict refusal is listed');
  def.querySelector('.lib-extra button').click();
  assert.deepEqual(lib.sent.pop(), { action: 'update-master', id: 'm1', patch: { props: { text: 'Words' } } }, 'Remove drops the stray prop');
});

console.log(`PASS: components-library (${passed} cases): the Library is the Ark registry -- derived, grouped, searchable, rendered; fields from the SDK schema; strict validation names what is missing; saved Ark masters survive sanitize by shape.`);
