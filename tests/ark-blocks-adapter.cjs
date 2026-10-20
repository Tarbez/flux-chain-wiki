'use strict';
/* js/ark/blocks.js: every Ark block is a defxn ArkUI resolver, derived from the kit's registry.
   Each case names the defect it exists to catch.

   Runs the real classic scripts in one jsdom window, in the order a public page loads them
   (runtime, engines, then ArkUI.blockScripts), with ArkCopy reading a test manifest. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

const dom = new JSDOM('<!doctype html><html><head></head><body><div id="scene"></div></body></html>', { url: 'https://defxn.com/palette', runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
const run = (file) => window.eval(read(file) + '\n//# sourceURL=' + file);
// ArkCopy: the manifests' words. A real key resolves; anything else throws as the real one does.
window.eval(`var ArkCopy = { WORDS: { 'PALETTE.TITLE': 'Palette', 'PALETTE.LEDE': 'Three roles share one lightness.' },
  isKey: function (v) { return /^[A-Z][A-Z0-9]*(\\.[A-Z][A-Z0-9]*)+$/.test(v); },
  resolve: function (v) { return v; },
  text: function (k) { if (!(k in this.WORDS)) throw new Error('ArkCopy: ' + k + ' has no entry'); return this.WORDS[k]; } };`);
for (const file of ['js/ark/atomizer.js', 'js/ark/flux.js', 'js/ark/runtime.js', 'js/ark/vendor/engines.js', 'js/content/layout.js']) run(file);
window.eval(`ArkUI.pageCatalog = { palette: { path: '/palette' }, zero: { path: '/' }, about: { path: '/about' } };
  ArkUI.route = { href: function (p) { return p; } };`);
// The one list a route loads before blocks render, as js/pages/catalog.js declares it.
const catalog = read('js/pages/catalog.js');
const listed = /ArkUI\.blockScripts = (\[[^\]]+\]);/.exec(catalog);
assert(listed, 'js/pages/catalog.js declares ArkUI.blockScripts');
const blockScripts = JSON.parse(listed[1].replace(/'/g, '"'));
const glossaryScript = /ArkUI\.glossaryScript = '([^']+)';/.exec(catalog);
assert(glossaryScript, 'js/pages/catalog.js names ArkUI.glossaryScript');
assert(!blockScripts.includes(glossaryScript[1]), 'the glossary is not in every block route\'s bill (R2 budget): routes that use it add it');
window.eval('ArkUI.blockScripts = ' + JSON.stringify(blockScripts) + '; ArkUI.glossaryScript = ' + JSON.stringify(glossaryScript[1]) + ';');
for (const file of blockScripts.concat([glossaryScript[1]])) run(file);
const { ArkUI, ArkKit, document } = window;
// The live chunk is NOT in blockScripts (R2: only / and /stats patch live blocks); the update test loads it the way the page loader does.
assert(!blockScripts.includes(ArkUI.blocks.liveScript), 'the live morph is not in every block route\'s bill');
assert(ArkUI.blocks.liveScript === 'js/ark/vendor/ark-kit-live.js' && fs.existsSync(path.join(ROOT, ArkUI.blocks.liveScript)), 'the live chunk the adapter loads is built');
// The public kit leaves the blocks' demo examples out (R2 budget); the editor's kit has them.
const EXAMPLES = (() => {
  const vm = require('node:vm');
  const box = { ArkEngines: { setArkElementStyle() {}, getArkElementStyle() {}, setArkElementStyles() {}, setArkElementHidden() {} } };
  box.globalThis = box;
  vm.runInNewContext(read('js/ark/vendor/ark-kit.js') + ';globalThis.__kit = ArkKit;', box);
  return JSON.parse(JSON.stringify(Object.fromEntries(box.__kit.ARK_BLOCK_NAMES.map((name) => [name, box.__kit.ARK_BLOCKS[name].example]))));
})();

let passed = 0;
const pending = []; // async follow-ups (the live chunk arrives on a microtask); awaited before the verdict
function test(name, fn) { try { fn(); passed += 1; } catch (error) { console.error('FAIL ' + name); throw error; } }

test('the resolver id rule is the contract saved CMS masters store (never renamed)', () => {
  assert.equal(ArkUI.blocks.resolverId('hero'), 'ARK_BLOCK_HERO');
  assert.equal(ArkUI.blocks.resolverId('section-header'), 'ARK_BLOCK_SECTION_HEADER');
  assert.equal(ArkUI.blocks.resolverId('card-grid'), 'ARK_BLOCK_CARD_GRID');
  assert.equal(ArkUI.blocks.nameOf('ARK_BLOCK_SECTION_HEADER'), 'section-header');
  assert.equal(ArkUI.blocks.nameOf('RBLOCK_TEXT_V1'), null);
});

test('every block in the kit is a resolver -- derived from ArkKit.ARK_BLOCK_NAMES, none hand-listed', () => {
  // Defect guarded: a block Ark adds would be invisible to the CMS until someone typed it here.
  assert.deepEqual(JSON.parse(JSON.stringify(ArkUI.blocks.resolvers)), [...ArkKit.ARK_BLOCK_NAMES].map(ArkUI.blocks.resolverId));
  for (const file of ['scripts/ark-blocks-adapter.js', 'js/ark/blocks.js']) assert(!/['"]ARK_BLOCK_[A-Z]/.test(read(file)), file + ' names no block resolver by hand');
});

test('ArkUI.build renders every example as ArkComponents.render calls it: structured props, `from`, `tree`', () => {
  for (const name of ArkKit.ARK_BLOCK_NAMES) {
    assert(EXAMPLES[name], name + ' has an example in the editor kit');
    const props = Object.assign({}, EXAMPLES[name], { from: '/about', tree: [{ t: 'p' }] });
    const el = ArkUI.build({ name: 'i1', resolver: ArkUI.blocks.resolverId(name), props, children: [] }, { mounts: [], emerge: [] });
    assert(el, name + ' built');
    assert.equal(el.getAttribute('data-ark-block'), name, name + ' is the Ark block, not a wrapper');
    assert(!el.hasAttribute('data-ark-block-refused'), name + ': its own example was refused');
    assert(!el.hasAttribute('tree') && !el.hasAttribute('from'), name + ': from/tree are not block props');
  }
});

test('a saved record with invalid props renders Ark\'s refusal in place and never throws', () => {
  // A CMS master saved by an older editor must not take the page down with it.
  const el = ArkUI.build({ resolver: 'ARK_BLOCK_HERO', props: { from: '/about' }, children: [] }, { mounts: [], emerge: [] });
  assert(el.hasAttribute('data-ark-block-refused'), 'a hero with no title is shown as a refusal');
  assert.match(el.textContent, /title/, 'the refusal names the missing prop');
});

test('copy: keys resolve through ArkCopy and stamp data-ark-copy-keys on the element that shows them', () => {
  const el = ArkUI.blocks.render({ block: 'hero', id: 'palette-hero', props: { title: 'copy:PALETTE.TITLE', lede: 'copy:PALETTE.LEDE' } }, { from: '/palette' });
  const h1 = el.querySelector('h1');
  assert.equal(h1.textContent.trim(), 'Palette');
  assert.equal(h1.getAttribute('data-ark-copy-keys'), 'PALETTE.TITLE', 'the heading carries its copy key (layout key copy:PALETTE.TITLE)');
  assert(el.querySelector('[data-ark-copy-keys="PALETTE.LEDE"]'), 'so does the lede');
  assert.equal(el.id, 'palette-hero', 'an authored id is the root id');
});

test('a missing copy key in an authored page spec throws (a code defect), in a saved record it is a refusal', () => {
  assert.throws(() => ArkUI.page([{ block: 'hero', props: { title: 'copy:PALETTE.NOPE' } }], null, { page: 'palette' }), /PALETTE\.NOPE/);
  const el = ArkUI.build({ resolver: 'ARK_BLOCK_HERO', props: { title: 'copy:PALETTE.NOPE', from: '/palette' }, children: [] }, { mounts: [], emerge: [] });
  assert(el.hasAttribute('data-ark-block-refused'));
});

test('route:/doc:/url: links go through dash-kit resolveLinkField, with `from` as a doc link\'s return-to', () => {
  const el = ArkUI.blocks.render({ block: 'actions', props: { items: [
    { label: 'Home', href: 'route:zero', tone: 'primary' },
    { label: 'Glossary', href: 'doc:docs/glossary.md' },
    { label: 'Source', href: 'url:https://example.org/x' },
  ] } }, { from: '/palette' });
  const links = [...el.querySelectorAll('a')].map((a) => a.getAttribute('href'));
  assert.equal(links[0], '/');
  assert.equal(links[1], '/reference?doc=docs%2Fglossary.md&from=%2Fpalette');
  assert.equal(links[2], 'https://example.org/x');
});

test('[[term]] markup reads the glossary derived from docs/glossary.md', () => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/build-glossary.cjs'), '--check'], { stdio: 'pipe' });
  const el = ArkUI.blocks.render({ block: 'section-header', props: { title: 'Rules', lede: 'A [[resolver]] answers with a [[claim|claim]].' } }, {});
  const terms = [...el.querySelectorAll('[data-term]')].map((node) => node.getAttribute('data-term'));
  assert.deepEqual(terms, ['resolver', 'claim']);
  assert(!el.querySelector('[data-ark-term-missing]'), 'both terms are in the glossary');
  assert.match(el.querySelector('.ark-term__tip').textContent, /rulebook launched as its own chain/);
});

/* 2026-10-19 (W3-STORY, the story template): pages whose prose uses glossary words define them in
   place, derived from the glossary -- never a typed word list. Defects guarded: a term inside a
   heading or a button (a control inside a control), the same word marked twice on one page, and a
   copy key no longer stamped on its element once its words carry a term (the Content lens lost it). */
test("ArkUI.page terms: 'first-use' marks a glossary word once per page, in prose (text props) only, and keeps the copy key", () => {
  window.ArkCopy.WORDS['PALETTE.LEDE'] = 'A resolver answers. Every resolver signs.';
  const page = ArkUI.page([
    { block: 'section-header', id: 'terms-head', props: { title: 'The resolver', lede: 'copy:PALETTE.LEDE' } },
    { block: 'callout', id: 'terms-note', props: { body: 'Resolvers again, and a claim.' } }
  ], null, { page: 'palette', terms: 'first-use' });
  const terms = [...page.querySelectorAll('[data-term]')].map((node) => node.getAttribute('data-term'));
  assert.deepEqual(terms, ['resolver', 'claim'], 'the first prose use of each word only (the plural finds its entry, the second use stays plain)');
  assert(!page.querySelector('[data-ark-part="section-title"] [data-term]'), 'never inside a title (a line prop)');
  const lede = page.querySelector('[data-ark-copy-keys="PALETTE.LEDE"]');
  assert(lede && lede.querySelector('[data-term="resolver"]'), 'the copy key is still stamped on the paragraph that carries the term');
  window.ArkCopy.WORDS['PALETTE.LEDE'] = 'Three roles share one lightness.';
});

test('ArkUI.page: blocks in order, the CMS insert anchor, the custom escape hatch', () => {
  const host = document.createElement('div');
  const root = ArkUI.page([
    { block: 'hero', id: 'palette-hero', props: { title: 'copy:PALETTE.TITLE' } },
    { block: 'custom', id: 'palette-live', mount: (ctx) => { const n = ctx.document.createElement('div'); n.className = 'live'; return n; } },
    { insert: 'main' },
  ], host, { page: 'palette', className: 'palette-page', labelledBy: 'palette-title' });
  assert.equal(root.parentNode, host);
  assert.equal(root.getAttribute('aria-labelledby'), 'palette-title');
  assert.deepEqual([...root.children].map((n) => n.id || n.getAttribute('data-ark-insert')), ['palette-hero', 'palette-live', 'main']);
  assert(root.classList.contains('ark-page') && root.classList.contains('palette-page'));
});

test('generated ids (ark-r-) never become layout keys', () => {
  const scene = document.getElementById('scene');
  scene.replaceChildren();
  const page = ArkUI.page([{ block: 'tabs', id: 'demo-tabs', props: { label: 'Depth', items: [{ value: 'a', label: 'A', content: 'one' }, { value: 'b', label: 'B', content: 'two' }] } }], scene, { page: 'palette' });
  page.setAttribute('data-ark-page', 'palette');
  const generated = [...page.querySelectorAll('[id^="ark-r-"]')];
  assert(generated.length >= 2, 'tabs generate ids for aria-controls');
  for (const node of generated) assert(!/^id:ark-r-/.test(window.ArkLayout.keyFor(node, scene)), node.id + ' became a layout key');
  assert.equal(window.ArkLayout.keyFor(page.querySelector('#demo-tabs'), scene), 'id:demo-tabs', 'the authored id is the key');
});

test('the public kit drops the demo examples and still renders every block (R2 budget)', () => {
  assert(ArkKit.ARK_BLOCK_NAMES.every((name) => ArkKit.ARK_BLOCKS[name].example === undefined), 'no example data in the public kit');
  assert(!/Why trust a signed result/.test(read('js/ark/vendor/ark-kit-public.js')));
});

test('the public kit refuses what no block uses (createArkUI, createArkPopover, createArkToggleGroup) with the file to load; the editor kit has them', () => {
  for (const name of ['createArkUI', 'createArkPopover', 'createArkToggleGroup']) assert.throws(() => ArkKit[name](), /js\/ark\/vendor\/ark-kit\.js/, name);
  const full = read('js/ark/vendor/ark-kit.js');
  assert(!/createArkUI refused/.test(full), 'js/ark/vendor/ark-kit.js carries the real runtime');
});

/* ---- W3-ARK-FOLLOWUPS (2026-10-19): gaps the page agents found converting /stats, /resolvers and
   the story pages. Each case names the page defect it exists to catch. ---------------------------- */
test('a tab label may be a copy: key: Ark measures the words it shows, not the key ("copy:RESOLVER.REGISTRY.CHAINS.LABEL" is 35 characters)', () => {
  // /resolvers typed its tab names out because a 32-character tab label refused the key itself.
  window.ArkCopy.WORDS['RESOLVER.REGISTRY.CHAINS.LABEL'] = 'Chains';
  const el = ArkUI.blocks.render({ block: 'tabs', id: 'registry-views', props: { label: 'Registry views', items: [
    { label: 'copy:RESOLVER.REGISTRY.CHAINS.LABEL', content: 'Every chain.' }, { label: 'Capabilities', content: 'Every capability.' }] } }, { from: '/palette', onInvalid: 'throw' });
  const tab = el.querySelector('[role="tab"]');
  assert.equal(tab.textContent, 'Chains');
  assert.equal(tab.getAttribute('data-ark-copy-keys'), 'RESOLVER.REGISTRY.CHAINS.LABEL', 'the copy key is stamped on the tab (its layout key is copy:...)');
  window.ArkCopy.WORDS['PALETTE.LONG'] = 'A tab name much longer than thirty-two characters';
  assert.throws(() => ArkUI.blocks.render({ block: 'tabs', props: { label: 'V', items: [{ label: 'copy:PALETTE.LONG', content: 'a' }, { label: 'B', content: 'b' }] } }, { onInvalid: 'throw' }),
    /is 49 characters \("A tab name/, 'words that are too long are still refused, quoting the words');
  delete window.ArkCopy.WORDS['RESOLVER.REGISTRY.CHAINS.LABEL'];
  delete window.ArkCopy.WORDS['PALETTE.LONG'];
});

test("terms: 'first-use' glosses whole words only -- a hyphen joins words -- and only in the entry's sense (\"HTTP-served\", \"same-shard\", \"signer rotations\")", () => {
  // /resolvers stopped using first-use marking: it glossed "served" inside "HTTP-served", "shard"
  // inside "same-shard", and "signer" (of a launch) in "signer rotations" (a governance note).
  const page = ArkUI.page([
    { block: 'callout', id: 'sense-a', props: { body: 'The resolver is HTTP-served; its log is append-only. TLM proposals, signer rotations, roster changes. Transfer, same-shard atomic.' } },
    { block: 'callout', id: 'sense-b', props: { body: 'A shard signs a batch, and the chain is served. The signer of a launch signs its record. Its type-scoped shape is declared.' } }
  ], null, { page: 'palette', terms: 'first-use' });
  const termsIn = (id) => [...page.querySelector('#' + id).querySelectorAll('[data-term]')].map((node) => node.getAttribute('data-term'));
  assert.deepEqual(termsIn('sense-a'), ['resolver', 'roster'], 'no word inside a hyphenated compound, and "signer" is not glossed where no launch is meant; a governance "roster" is the roster the glossary defines (added 2026-10-20)');
  assert.deepEqual(termsIn('sense-b'), ['shard', 'served', 'signer', 'type-scoped shape'], 'the standalone words are glossed at their first use; a key with a hyphen still matches whole');
  assert.match(page.querySelector('#sense-a').textContent, /HTTP-served/, 'the compound reads as written');
  // An entry may declare phrases it never applies inside.
  const glossary = { box: { term: 'Box', definition: 'One field of a record.', except: ['black box'] } };
  const own = ArkUI.page([{ block: 'callout', id: 'sense-c', props: { body: 'It is not a black box: every box is checked.' } }], null, { page: 'palette', terms: 'first-use', glossary });
  const terms = [...own.querySelectorAll('[data-term]')];
  assert.equal(terms.length, 1);
  assert.match(terms[0].previousSibling.textContent, /every $/, 'the gloss lands on "every box", not "black box"');
  assert.match(own.querySelector('.ark-term__tip').textContent, /One field of a record/, "the page's glossary is the one the tooltip reads");
});

test("a page that renders its blocks in several calls shares one first-use state (ArkUI.blocks.termMarker), so a word is glossed once on the page", () => {
  // Defect guarded: /account renders each view in its own ArkUI.blocks.render call; with a state per call, "Auth Kit" was glossed in every view.
  const state = ArkUI.blocks.termMarker();
  const one = ArkUI.blocks.render({ block: 'callout', props: { body: 'A resolver signs.' } }, { terms: 'first-use', termState: state });
  const two = ArkUI.blocks.render({ block: 'callout', props: { body: 'Another resolver, and a claim.' } }, { terms: 'first-use', termState: state });
  assert.deepEqual([...one.querySelectorAll('[data-term]')].map((n) => n.getAttribute('data-term')), ['resolver']);
  assert.deepEqual([...two.querySelectorAll('[data-term]')].map((n) => n.getAttribute('data-term')), ['claim'], 'the second call glosses only what the first did not');
  const apart = ArkUI.blocks.render({ block: 'callout', props: { body: 'A resolver signs.' } }, { terms: 'first-use' });
  assert.equal(apart.querySelectorAll('[data-term]').length, 1, 'without a shared state a call starts fresh');
  const own = ArkUI.page([{ block: 'callout', id: 'shared-state', props: { body: 'The resolver again.' } }], null, { page: 'palette', terms: 'first-use', termState: ArkUI.blocks.termMarker() });
  assert.equal(own.querySelectorAll('[data-term="resolver"]').length, 1, "ArkUI.page takes the page's state from its options");
});

test('`was` pins reach nested blocks with ids (a table moved into a tab panel keeps its old keys)', () => {
  // The adapter applied `was` only to top-level entries, so a nested block's pins had to be
  // written against the tab block as fragile part counts ('table-wrap#6').
  const page = ArkUI.page([{ block: 'tabs', id: 'pin-views', props: { label: 'Views', items: [
    { label: 'Runs', blocks: [{ block: 'table', id: 'pin-table', was: { ':root': 'page:/div:1/section:2/div:1', 'table-caption': 'page:/div:1/section:2/h2:1' },
      props: { caption: 'Runs', columns: [{ key: 'a', label: 'A' }], rows: [{ a: 1 }] } }] },
    { label: 'Notes', content: 'b' }] } }], null, { page: 'palette' });
  const table = page.querySelector('#pin-table');
  assert.equal(table.getAttribute('data-ark-layout-pin'), 'page:/div:1/section:2/div:1');
  assert.equal(table.querySelector('caption').getAttribute('data-ark-layout-pin'), 'page:/div:1/section:2/h2:1');
  assert.throws(() => ArkUI.page([{ block: 'tabs', props: { label: 'V', items: [{ label: 'A', blocks: [{ block: 'stat', was: { ':root': 'page:/x' }, props: { label: 'x', value: 1 } }] }, { label: 'B', content: 'b' }] } }], null, { page: 'palette' }),
    /nested "stat" block: it has no id\. Needs: an authored id.*Remedy/);
});

test('a table caption is a layout key, so it can carry an edit or a pin (js/content/layout.js KEY_TAGS)', () => {
  // Converted pages moved a panel heading into Ark's table caption; with no key, five page tests
  // had to retire those headings' saved edits.
  const scene = document.getElementById('scene');
  scene.replaceChildren();
  const props = { caption: 'Runs', columns: [{ key: 'a', label: 'A' }], rows: [{ a: 1 }] };
  const page = ArkUI.page([{ block: 'table', id: 'cap-pinned', was: { 'table-caption': 'page:/div:1/section:9/h2:1' }, props }, { block: 'table', id: 'cap-plain', props }], scene, { page: 'palette' });
  page.setAttribute('data-ark-page', 'palette');
  window.ArkLayout.annotate(scene, '/palette');
  const key = (selector) => page.querySelector(selector).getAttribute('data-ark-layout-key');
  assert.equal(key('#cap-pinned caption'), 'page:/div:1/section:9/h2:1', 'a pin lands on a caption');
  assert.match(key('#cap-plain caption') || '', /^page:\/.*\/caption:1$/, 'an unpinned caption has its path key');
  assert.equal(key('#cap-plain'), 'id:cap-plain', 'the table keeps its key');
  assert.match(key('#cap-plain thead th'), /\/table:1\/thead:1\/tr:1\/th:1$/, 'paths count siblings by tag: a keyed caption moves no other key');
});

test('ArkUI.blocks.update on the public kit loads the live chunk once, on the first update, and lands the queued refresh when it arrives (W3-BUDGET)', () => {
  assert.equal(ArkKit.PUBLIC_KIT, true, 'the public kit is what the page loads');
  const errors = [];
  const consoleError = window.console.error;
  window.console.error = (message) => errors.push(String(message));
  // 1. No loader on the page: a live tile never breaks it -- the reading shows, by replacement, and the console names what is missing.
  const host = document.createElement('div');
  const orphan = ArkUI.blocks.render({ block: 'stat', props: { label: 'Nodes', value: 9 } });
  host.appendChild(orphan);
  delete window.ArkUI.loadScript;
  assert.equal(ArkUI.blocks.update(orphan, { label: 'Nodes', value: 10 }), orphan, 'the update does not throw');
  pending.push(Promise.resolve().then(() => new Promise((resolve) => setTimeout(resolve, 0))).then(() => {
    assert.notEqual(host.firstChild, orphan, 'the block was replaced...');
    assert.equal(host.firstChild.querySelector('.ark-stat__number').textContent, '10', '...and shows the new reading');
    assert(errors.some((e) => /replaced, not patched.*ark-kit-live\.js did not load.*Needs: .*Remedy: load js\/ark\/page-loader\.js/.test(e)), 'the console names the failure, the need and the remedy');
    // 2. With the page loader's ArkUI.loadScript: the first update queues, the chunk runs, the latest props land in place; later updates are in place at once.
    // A fresh page: the synchronous in-place test below has meanwhile run the chunk itself (as a route's scripts could).
    window.ArkKitLive = undefined;
    const loads = [];
    window.ArkUI.loadScript = (url) => { loads.push(url); return Promise.resolve().then(() => run(url)); };
    const el = ArkUI.blocks.render({ block: 'stat', props: { label: 'Nodes', value: 9 } });
    const number = el.querySelector('.ark-stat__number');
    assert.equal(ArkUI.blocks.update(el, { label: 'Nodes', value: 10 }), el, 'the same root comes back before the chunk arrives');
    assert.equal(ArkUI.blocks.update(el, { label: 'Nodes', value: 11 }), el);
    assert.equal(number.textContent, '9', 'nothing is patched before the morph is here');
    assert.deepEqual(loads, ['js/ark/vendor/ark-kit-live.js'], 'one load for two updates');
    return new Promise((resolve) => setTimeout(resolve, 0)).then(() => {
      assert.equal(el.querySelector('.ark-stat__number'), number, 'the element kept its identity');
      assert.equal(number.textContent, '11', 'the latest props landed, once');
      assert.equal(typeof window.ArkKitLive.patchArkBlock, 'function');
      assert.equal(ArkUI.blocks.update(el, { label: 'Nodes', value: 12 }), el);
      assert.equal(number.textContent, '12', 'after the chunk, updates are in place at once');
      assert.deepEqual(loads, ['js/ark/vendor/ark-kit-live.js'], 'the chunk is loaded once');
    });
  }).finally(() => { window.console.error = consoleError; }));
});

test('ArkUI.blocks.update patches a live block in place: a CMS edit, a pin and a copy key survive the refresh (W3-STATS)', () => {
  // /stats re-rendered each live block every minute; a remount dropped the CMS edit on a tile.
  run(ArkUI.blocks.liveScript); // the morph, as the loader delivers it on a live route
  window.ArkCopy.WORDS['PALETTE.NODES'] = 'Nodes online';
  const specProps = (nodes, swaps) => ({ label: 'Live', items: [{ label: 'copy:PALETTE.NODES', value: nodes }, swaps === null ? { label: 'Swaps', value: null, absent: { reason: 'The pulse is late.' } } : { label: 'Swaps', value: swaps }] });
  const el = ArkUI.blocks.render({ block: 'stats', id: 'live-tiles', was: { 'stat#2': { key: 'page:/div:1/article:2', self: true } }, props: specProps(9, 100) }, { from: '/palette' });
  const host = document.createElement('div');
  host.appendChild(el);
  const number = el.querySelector('.ark-stat__number');
  const second = el.querySelectorAll('[data-ark-part="stat"]')[1];
  number.setAttribute('style', 'color: red');
  number.setAttribute('data-ark-layout-key', 'copy:PALETTE.NODES/span:1');
  assert.equal(ArkUI.blocks.update(el, specProps(10, null), { from: '/palette' }), el, 'the same root comes back');
  assert.equal(el.querySelector('.ark-stat__number'), number, 'an unchanged part keeps its identity');
  assert.equal(number.textContent, '10');
  assert.equal(number.getAttribute('style'), 'color: red', 'a CMS style edit survives');
  assert.equal(number.getAttribute('data-ark-layout-key'), 'copy:PALETTE.NODES/span:1');
  assert.equal(el.querySelectorAll('[data-ark-part="stat"]')[1], second, 'a tile whose reading went absent is the same tile');
  assert.equal(second.getAttribute('data-state'), 'absent', 'absent is not 0 after an update');
  assert.equal(second.getAttribute('data-ark-layout-pin'), 'page:/div:1/article:2', 'its pin survives');
  assert(el.querySelector('[data-ark-copy-keys="PALETTE.NODES"]'), 'copy keys are stamped by the update as by the first render');
  assert.throws(() => ArkUI.blocks.update(document.createElement('div'), {}), /not a rendered Ark block\. Needs: .*Remedy/);
  const tabs = ArkUI.blocks.render({ block: 'tabs', props: { label: 'V', items: [{ label: 'A', content: 'a' }, { label: 'B', content: 'b' }] } });
  assert.throws(() => ArkUI.blocks.update(tabs, { label: 'V', items: [{ label: 'A', content: 'a' }, { label: 'C', content: 'c' }] }), /a primitive holds its open state.*Remedy: update the blocks inside its panels/);
  const refused = ArkUI.blocks.update(el, { items: 'no list' });
  assert(refused.hasAttribute('data-ark-block-refused'), 'invalid props in a live update render the refusal...');
  assert.equal(refused.parentNode, host, '...in the block\'s place, never a thrown page');
  const stats = read('js/pages/stats.js');
  assert(/ArkUI\.blocks\.update\(/.test(stats) && !/function morph\(/.test(stats), '/stats refreshes through ArkUI.blocks.update, with no local copy of the morph');
  delete window.ArkCopy.WORDS['PALETTE.NODES'];
});

test('dash-kit carries no dead builders: stat, table, bar and sectionHead had no caller once the pages became Ark blocks', () => {
  for (const name of ['stat', 'table', 'bar', 'sectionHead']) assert.equal(ArkUI.dash[name], undefined, 'ArkUI.dash.' + name + ' is back');
  for (const name of ['panel', 'pageLink', 'docLink', 'resolveLinkField', 'linkEl']) assert.equal(typeof ArkUI.dash[name], 'function', name + ' still has callers (not-found, link fields)');
});

test('the optional blocks are chunks: absent from the public kit and its resolvers, present after their chunk, whichever of it and the adapter loaded first (W4-ARK)', () => {
  // Defect guarded: the six cost +3.8 KB gz in the public kit (every block route paid); as chunks they cost the routes that use them
  // only (the popover alone, 3.2 KB, for a page that takes no input). A chunk that registered its blocks but not their resolvers would
  // render nothing on the page ("[ArkUI] unresolved resolver") with every block route's tests green.
  const FORM = ['field', 'form', 'list', 'status-line', 'choice'], POPOVER = ['popover'];
  assert.equal(ArkKit.ARK_BLOCK_NAMES.length, 21, 'the public kit holds the 21 core blocks');
  for (const name of FORM.concat(POPOVER)) assert.equal(ArkUI.blocks.resolvers.includes(ArkUI.blocks.resolverId(name)), false, name + ' is not a resolver before its chunk');
  assert.equal(ArkUI.blocks.formsScript, 'js/ark/vendor/ark-kit-forms.js');
  assert.equal(ArkUI.blocks.popoverScript, 'js/ark/vendor/ark-kit-popover.js');
  const before = ArkUI.build({ resolver: 'ARK_BLOCK_FORM', props: {}, children: [] }, { mounts: [], emerge: [] });
  assert.equal(before, null, 'without the chunk a saved form block is unresolved, not a thrown page');
  run(ArkUI.blocks.popoverScript);
  assert.equal(ArkKit.ARK_BLOCK_NAMES.length, 22, 'the popover chunk adds the popover and no form block');
  assert(ArkUI.blocks.resolvers.includes('ARK_BLOCK_POPOVER') && !ArkUI.blocks.resolvers.includes('ARK_BLOCK_FORM'));
  run(ArkUI.blocks.formsScript);
  assert.equal(ArkKit.ARK_BLOCK_NAMES.length, 27);
  assert.equal(window.ArkKitForms.FORM_BLOCK_NAMES.length, 5);
  for (const name of FORM.concat(POPOVER)) assert(ArkUI.blocks.resolvers.includes(ArkUI.blocks.resolverId(name)), name + ' is a resolver after its chunk (ArkUI.blocks.sync)');
  assert.deepEqual(JSON.parse(JSON.stringify(ArkUI.blocks.resolvers)), [...ArkKit.ARK_BLOCK_NAMES].map(ArkUI.blocks.resolverId), 'and the list is still the kit\'s, derived');
  for (const name of FORM.concat(POPOVER)) {
    const el = ArkUI.build({ name: 'i1', resolver: ArkUI.blocks.resolverId(name), props: Object.assign({}, EXAMPLES[name], { from: '/about' }), children: [] }, { mounts: [], emerge: [] });
    assert(el && el.getAttribute('data-ark-block') === name, name + ' builds through the adapter');
    assert(!el.hasAttribute('data-ark-block-refused'), name + ': its own example was refused');
  }
  assert.equal(ArkKit.ARK_BLOCKS.form.example, undefined, 'the public kit carries no demo data, chunks included');
  // A form on a page: its press reaches the page handler through ArkUI.page options.actions with the values.
  const heard = [];
  const root = ArkUI.page([{ block: 'form', id: 'lookup', props: { label: 'Look up', fields: [{ name: 'name', label: 'Name', value: 'radio.fxn' }], submit: { label: 'Look up', action: 'lookup' } } }], document.body, { page: 'palette', actions: { lookup: (detail) => heard.push(detail) } });
  root.querySelector('form').requestSubmit();
  assert.deepEqual(heard.map((d) => [d.action, d.values.name, d.block]), [['lookup', 'radio.fxn', 'form']], 'the page handler gets { action, values } and nothing posts');
  // Loaded again (a route lists it and the loader adds it): harmless.
  run(ArkUI.blocks.formsScript); run(ArkUI.blocks.popoverScript);
  assert.equal(ArkKit.ARK_BLOCK_NAMES.length, 27);
  root.remove();
});

{
  // The page loader adds the forms chunk where nothing in the code can say so: the editor's canvas, and a saved block the loaded kit
  // does not know. Derived from the preview flag and the kit's own resolvers, never from a list of block names.
  const source = read('js/ark/page-loader.js');
  assert(/ark-kit-forms\.js/.test(source) && /inPreview\(\) \|\| unknownSaved\(definition\)/.test(source), 'the loader derives the need');
  const vm = require('node:vm');
  const loadRoute = async (known, resolver, search, learns) => {
    const loads = [];
    const sandbox = { ArkUI: { blockScripts: ['js/ark/dash-kit.js', 'js/ark/vendor/ark-kit-public.js', 'js/ark/blocks.js'], pageModules: { m: {} }, blocks: { resolvers: known } }, location: { search: search || '', protocol: 'https:' },
      ArkComponents: { SHELL: '*', get: () => ({ routes: resolver ? { '/x': { main: [{ masterId: 'a' }] } } : {}, masters: { a: { resolver } } }) },
      setTimeout, document: { createElement: () => { const el = { remove() {} }; setTimeout(() => { const name = el.src.replace(/^\//, '').replace(/\?.*/, ''); loads.push(name); if (learns && learns[name]) sandbox.ArkUI.blocks.resolvers.push(learns[name]); el.onload(); }, 0); return el; }, head: { appendChild() {} } } };
    sandbox.window = sandbox;
    vm.runInNewContext(source, sandbox);
    await sandbox.ArkUI.loadPage('x', { path: '/x', module: 'm', scripts: ['js/pages/x.js'] });
    return loads;
  };
  const CHUNK = 'js/ark/vendor/ark-kit-forms.js', POP = 'js/ark/vendor/ark-kit-popover.js', FIG = 'js/ark/vendor/ark-kit-figures.js';
  pending.push((async () => {
    const saved = await loadRoute(['ARK_BLOCK_HERO'], 'ARK_BLOCK_FORM');
    assert.deepEqual(saved, ['js/ark/dash-kit.js', 'js/ark/vendor/ark-kit-public.js', 'js/ark/blocks.js', CHUNK, POP, FIG, 'js/pages/x.js'], 'a saved block the kit has no resolver for: the chunks come after the adapter, before the page (a fake kit here: it never learns the name)');
    const learnt = await loadRoute(['ARK_BLOCK_HERO'], 'ARK_BLOCK_FORM', '', { [CHUNK]: 'ARK_BLOCK_FORM' });
    assert(learnt.includes(CHUNK) && !learnt.includes(POP), 'once the forms chunk teaches the kit the resolver, the popover chunk is not loaded: derived from the kit, not from names');
    const popOnly = await loadRoute(['ARK_BLOCK_HERO'], 'ARK_BLOCK_POPOVER', '', { [POP]: 'ARK_BLOCK_POPOVER' });
    assert(popOnly.includes(POP), 'a saved popover loads the popover chunk (after the forms chunk, which does not know it)');
    const known = await loadRoute(['ARK_BLOCK_HERO', 'ARK_BLOCK_FORM'], 'ARK_BLOCK_FORM');
    assert(!known.includes(CHUNK), 'a resolver the kit already knows adds nothing');
    const core = await loadRoute(['ARK_BLOCK_HERO'], 'ARK_BLOCK_HERO');
    assert(!core.includes(CHUNK), 'a saved core block adds nothing');
    const canvas = await loadRoute(['ARK_BLOCK_HERO'], null, '?cms-preview=1');
    assert(canvas.includes(CHUNK) && canvas.includes(POP) && canvas.indexOf(POP) < canvas.indexOf('js/pages/x.js'), 'the editor\'s canvas gets both chunks: the Library can insert any block anywhere');
    const plain = await loadRoute([], null);
    assert.deepEqual(plain, ['js/pages/x.js'], 'a route with no blocks loads nothing extra');
    passed += 1;
  })());
}

Promise.all(pending).then(() => console.log('PASS: ark-blocks-adapter (' + passed + ' cases)'), (error) => { console.error('FAIL (async)'); console.error(error); process.exit(1); });
