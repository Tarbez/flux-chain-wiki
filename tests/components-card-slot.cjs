'use strict';
/* The Card slot block (RBLOCK_CARD_SLOT_V1): a place the owner marks, filled by the card a visitor wears.
   js/content/components.js (the block and its store), js/resolvers/blocks/rblock-card-slot-v1.js (what a visitor sees),
   js/nft/card-components.js (the NFT session's slot grammar, used here as it is, never changed).

   Each case names the defect it exists to catch. The slot's text is the NFT session's FLX (DFXNCOMP1); the components store
   is FLX too, so the slot rides inside it as one hex string leaf, and the whole must come back byte for byte. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const plain = (x) => JSON.parse(JSON.stringify(x));
const tick = () => new Promise((r) => setTimeout(r, 0));
const ticks = async (n = 6) => { for (let i = 0; i < n; i++) await tick(); };
let passed = 0;
const test = async (name, fn) => { try { await fn(); passed += 1; } catch (error) { console.error('FAIL ' + name); throw error; } };

function windowWith(files, url) {
  const dom = new JSDOM('<!doctype html><html><head></head><body><main data-page="x"><div data-ark-insert="main"></div></main></body></html>', { runScripts: 'outside-only', url: url || 'https://defxn.com/about' });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  w.eval('var ArkCopy = { isKey: function () { return false; }, resolve: function (v) { return v; }, text: function (k) { return k; } };');
  w.ARK_FLX_STATE = require('../js/vendor/flx-state-grammar.js');   // lent to the sandbox, as index.html loads it before components.js
  for (const file of files) w.eval(read(file) + '\n//# sourceURL=' + file);
  return w;
}
const CORE = ['js/ark/atomizer.js', 'js/ark/flux.js', 'js/ark/runtime.js', 'js/content/components.js'];
const NFT = ['js/nft/timeline.js', 'js/nft/card-components.js'];

/* slot texts as the NFT session's own encoder writes them: a bare banner, and a stamp with motion of its own */
const nft = windowWith(['js/nft/timeline.js', 'js/nft/card-components.js']);
const K = nft.DefxnCardComponents;
const BANNER = K.encode({ kind: 'banner', timeline: null });
const MOVING = K.encode({ kind: 'stamp', timeline: { version: 1, tracks: [{ target: 'frame', prop: 'draw', from: 'left', easing: 'out', delay: 0, ms: 360, stagger: 40, most: 8 }] } });
const slotDraft = (C, slot, extra) => {
  let d = C.createMaster({}, 'm1', 'RBLOCK_CARD_SLOT_V1', slot === undefined ? {} : { slot }, 'Card slot');
  d = C.insertInstance(d, '/about', 'main', 'i1', 'm1');
  return extra ? extra(d) : d;
};

(async () => {
  /* ---------------------------------------------------------------- the block, in the store */
  const w = windowWith(CORE);
  const C = w.ArkComponents;

  await test('the Card slot is always offered: no Ark block replaces it, so the successor rule that retires a legacy block never applies', () => {
    const offered = C.blocks().find((b) => b.resolver === 'RBLOCK_CARD_SLOT_V1');
    assert(offered, 'the Library offers it');
    assert.equal(offered.legacy, false, 'and does not call it legacy');
    assert.equal(offered.site, true, 'it says it is the site\'s own, so the Library draws no Ark thumbnail or example for it');
    assert.equal(offered.label, 'Card slot'); assert.equal(offered.group, 'media');
    assert.deepEqual(plain(offered.props), ['slot']);
    assert.match(offered.description, /^[^.]+\.[^.]+\.$/, 'a description of what a visitor sees, in two plain sentences');
    assert(/wears no card sees nothing/.test(offered.description), 'and says what a visitor with no card sees');
    assert.equal(C.groupOf('RBLOCK_CARD_SLOT_V1'), 'media'); assert.equal(C.labelOf('RBLOCK_CARD_SLOT_V1'), 'Card slot');
  });

  await test('its one field is a "cardslot" kind, described once (the editor draws the field from this, nothing else lists it)', () => {
    const fields = plain(C.fieldsOf({ resolver: 'RBLOCK_CARD_SLOT_V1', props: {} }));
    assert.equal(fields.length, 1); assert.equal(fields[0].prop, 'slot'); assert.equal(fields[0].kind, 'cardslot');
    assert.equal(fields[0].label, 'What the card makes here');
    assert.deepEqual(plain(C.starterProps('RBLOCK_CARD_SLOT_V1', 'Card slot')), {}, 'a new block starts with no slot: an empty block, which renders nothing');
  });

  await test('a slot survives sanitize byte for byte, newline and motion lines included, and a prop it does not own is dropped', () => {
    for (const slot of [BANNER, MOVING]) {
      const d = C.sanitize(slotDraft(C, slot));
      assert.equal(d.masters.m1.props.slot, slot, 'the slot text is kept exactly');
      assert.equal(JSON.stringify(C.sanitize(d)), JSON.stringify(d), 'and a second pass rewrites nothing');
    }
    assert.deepEqual(plain(C.sanitize(slotDraft(C, undefined)).masters.m1.props), {}, 'an absent slot stays absent (it is not turned into a banner)');
    const odd = C.sanitize({ masters: { m1: { resolver: 'RBLOCK_CARD_SLOT_V1', props: { slot: BANNER, colour: 'red' }, label: 'x' } }, routes: {} });
    assert.deepEqual(plain(odd.masters.m1.props), { slot: BANNER });
  });

  await test('the FLX store round trip is byte-exact with a slot in it, and the old JSON-literal form still loads (read once, written forward)', () => {
    const d = slotDraft(C, MOVING, (x) => C.setOverride(x, '/about', 'main', 'i1', 'slot', BANNER));
    const text = C.encode(d);
    assert(!/[{}"]/.test(text.replace(/\\n/g, '')), 'the stored form is FLX records, not JSON');
    assert.equal(C.encode(C.decode(text)), text, 'decode then encode returns the same bytes');
    assert.equal(JSON.stringify(C.decode(text)), JSON.stringify(C.sanitize(d)), 'and the same draft, the slot text and the instance override included');
    assert.equal(C.decode(text).masters.m1.props.slot, MOVING); assert.equal(C.decode(text).routes['/about'].main[0].overrides.slot, BANNER);
    const file = C.serialize(d);
    assert(file.startsWith('/*') && file.includes('ArkComponents.define("'), 'the data file is one define() call of the FLX text');
    w.eval(file);   // the file as the browser runs it
    assert.equal(JSON.stringify(C.get()), JSON.stringify(C.sanitize(d)), 'running it defines the same draft');
    C.define(plain(d));
    assert.equal(JSON.stringify(C.get()), JSON.stringify(C.sanitize(d)), 'a data file written as a JSON literal still defines the same draft');
  });

  /* ---------------------------------------------------------------- the save path */
  await test('a slot the card\'s decoder reads passes; an absent or empty slot is an empty block, which is allowed', () => {
    const win = windowWith(CORE.concat(NFT)), D = win.ArkComponents;
    for (const slot of [BANNER, MOVING, undefined, '']) assert.deepEqual(plain(D.problems(slotDraft(D, slot))), [], 'accepted: ' + JSON.stringify(slot));
  });

  await test('a slot text the decoder cannot read is refused on Save naming the field, the failure, the need and the remedy', () => {
    const win = windowWith(CORE.concat(NFT)), D = win.ArkComponents;
    for (const bad of ['{"kind":"banner"}', 'DFXNCOMP1-K' + Buffer.from('seal').toString('hex') + '\n', BANNER + 'DFXNTL1-garbage\n']) {
      const found = plain(D.problems(slotDraft(D, bad)));
      assert.equal(found.length, 1, JSON.stringify(found));
      assert.equal(found[0].path, 'props.slot'); assert.equal(found[0].field, 'What the card makes here', 'the field is named by its label, not "props.slot"');
      assert.match(found[0].failure, /^the slot text was not written by the Card slot editor \(/);
      assert.match(found[0].needs, /DFXNCOMP1/); assert.match(found[0].remedy, /^open the Card slot in the Library/);
      assert.match(found[0].sentence, /^Component "Card slot", What the card makes here: .*\. Needs .*\. Remedy: .*\.$/, 'worded like every other block refusal');
    }
  });

  await test('an instance\'s own slot is checked as it shows, and says where it is; a bad definition is said once', () => {
    const win = windowWith(CORE.concat(NFT)), D = win.ArkComponents;
    const found = plain(D.problems(slotDraft(D, BANNER, (x) => D.setOverride(x, '/about', 'main', 'i1', 'slot', 'not a slot'))));
    assert.equal(found.length, 1); assert.equal(found[0].route, '/about'); assert.equal(found[0].key, 'i1');
    assert.match(found[0].sentence, /^"Card slot" on \/about, What the card makes here: /);
    const both = plain(D.problems(slotDraft(D, 'not a slot', (x) => D.setOverride(x, '/about', 'main', 'i1', 'slot', 'not a slot'))));
    assert.equal(both.length, 1, 'the same bad text on the definition and on the instance is one refusal, on the definition');
  });

  await test('with no decoder loaded a slot is refused as UNCHECKED, never passed as checked', () => {
    const found = plain(C.problems(slotDraft(C, BANNER)));
    assert.equal(found.length, 1); assert.match(found[0].failure, /could not be checked/); assert.match(found[0].needs, /js\/nft\/card-components\.js/);
    assert.match(found[0].remedy, /open the Card slot in the Library/);
  });

  /* ---------------------------------------------------------------- what a visitor sees */
  function page(opts) {
    opts = opts || {};
    const win = windowWith(CORE.concat(['js/resolvers/blocks/rblock-card-slot-v1.js']), opts.url);
    const log = { asked: 0, filled: [], removed: 0, wear: 0, adds: 0, drops: 0, errors: [] };
    const doc = win.document, add = doc.addEventListener.bind(doc), drop = doc.removeEventListener.bind(doc);
    doc.addEventListener = (type, fn, o) => { if (type === 'defxn:wear') log.adds++; return add(type, fn, o); };
    doc.removeEventListener = (type, fn, o) => { if (type === 'defxn:wear') log.drops++; return drop(type, fn, o); };
    win.console.error = (m) => log.errors.push(String(m));
    win.DefxnSkinSite = {
      cardComponents: () => { log.asked++; return opts.fail ? Promise.reject(new Error(opts.fail)) : Promise.resolve({ fill: (host, text) => {
        log.filled.push(text); host.hidden = false; const card = doc.createElement('section'); card.className = 'defxn-comp'; host.appendChild(card);
        return { remove: () => { log.removed++; card.remove(); } }; } }); }
    };
    const hooks = [];
    win.ArkUI.pageRouter = { onMount: (hook) => hooks.push(hook) };
    const put = (card) => { win.DefxnWear = { current: card }; doc.dispatchEvent(new win.CustomEvent('defxn:wear', { detail: card })); };
    const mount = (slot) => {
      const host = doc.querySelector('[data-ark-insert="main"]');
      return win.ArkComponents.render(host, '/about', 'main', slotDraft(win.ArkComponents, slot))[0];
    };
    return { win, doc, log, hooks, put, mount };
  }
  const CARD = { number: '263', name: 'Ada', palette: 'dusk', held: false };

  await test('a visitor who wears no card gets a hidden, empty block, and nothing extra is asked for or loaded', async () => {
    const p = page(); p.win.DefxnWear = { current: null };
    const el = p.mount(BANNER);
    await ticks();
    assert(el.hasAttribute('data-card-slot') && el.hidden && el.textContent === '', 'hidden and empty');
    assert.equal(p.log.asked, 0, 'DefxnSkinSite.cardComponents() is never called, so no card script loads');
    const bare = page(); const e2 = bare.mount(BANNER);   // no DefxnWear at all: a page where the wear scripts never loaded
    assert(e2.hidden && bare.log.asked === 0, 'the same where DefxnWear is not even defined');
  });

  await test('a card put on fills the slot with the slot\'s own text; taking it off empties and hides it; putting it on again fills again', async () => {
    const p = page(); p.win.DefxnWear = { current: null };
    const el = p.mount(MOVING);
    p.put(CARD); await ticks();
    assert.equal(p.log.asked, 1, 'the card components load once a card is on');
    assert.deepEqual(p.log.filled, [MOVING], 'fill() is handed the slot text exactly as saved, motion lines and all');
    assert(!el.hidden && el.querySelector('.defxn-comp'), 'the card shows');
    p.put(null); await ticks();
    assert.equal(p.log.removed, 1, 'taking the card off removes what fill() drew');
    assert(el.hidden && el.textContent === '', 'and the block is hidden and empty again');
    p.put(CARD); await ticks();
    assert.equal(p.log.filled.length, 2, 'putting it on again fills again'); assert(!el.hidden);
  });

  await test('a card already on when the page draws the slot fills it at once', async () => {
    const p = page(); p.win.DefxnWear = { current: CARD };
    const el = p.mount(BANNER); await ticks();
    assert.deepEqual(p.log.filled, [BANNER]); assert(!el.hidden);
  });

  await test('a card taken off while the components are still loading never draws (a late fill would show a card nobody wears)', async () => {
    const p = page(); p.win.DefxnWear = { current: null };
    const el = p.mount(BANNER);
    p.put(CARD); p.put(null); await ticks();
    assert.equal(p.log.filled.length, 0, 'fill() is not called'); assert(el.hidden && el.textContent === '');
  });

  await test('an absent slot stays empty even when a card is worn, and asks for nothing', async () => {
    const p = page(); p.win.DefxnWear = { current: CARD };
    const el = p.mount(undefined); await ticks();
    assert(el.hidden && p.log.asked === 0 && p.log.filled.length === 0);
  });

  await test('a load that fails leaves the block hidden and says what failed, what it needs and the remedy', async () => {
    const p = page({ fail: 'could not load js/nft/card-components.js' }); p.win.DefxnWear = { current: CARD };
    const el = p.mount(BANNER); await ticks();
    assert(el.hidden, 'nothing half-drawn');
    assert.equal(p.log.errors.length, 1);
    assert.match(p.log.errors[0], /did not fill \(could not load js\/nft\/card-components\.js\)\. It needs slot text from the Card slot editor and js\/nft\/card-components\.js\. Edit it in DEFXN Studio/);
  });

  await test('one document listener serves every slot, and it goes when the last slot leaves the document (a Studio redraw leaks nothing)', async () => {
    const p = page(); p.win.DefxnWear = { current: CARD };
    const first = p.mount(BANNER); await ticks();
    assert.equal(p.log.adds, 1);
    const second = p.mount(BANNER); await ticks();   // render() replaces the host's children: the first slot is out of the document
    assert(!first.isConnected && second.isConnected);
    assert.equal(p.log.adds, 1, 'a second slot reuses the one listener');
    assert.equal(p.log.removed, 1, 'the slot that left the document had its fill removed when the new one mounted');
    p.doc.querySelector('[data-ark-insert="main"]').textContent = '';
    p.put(null); await ticks();
    assert.equal(p.log.drops, 1, 'the listener is removed once no slot is left');
    p.put(CARD); await ticks();
    assert.equal(p.log.filled.length, 2, 'nothing fills after that (no stale slot is kept alive)');
  });

  await test('the page router\'s cleanup drops a page\'s slots: its fill and the listener go when the page unmounts, though it is still in the document', async () => {
    const p = page(); p.win.DefxnWear = { current: CARD };
    const pageEl = p.doc.querySelector('main');
    const el = p.mount(BANNER); await ticks();
    assert.equal(p.hooks.length, 1, 'the block hooks the router once');
    const cleanup = p.hooks[0](pageEl, 'about');
    assert.equal(typeof cleanup, 'function', 'and hands the router a cleanup for the page');
    cleanup();
    assert.equal(p.log.removed, 1, 'its fill is removed'); assert.equal(p.log.drops, 1, 'its listener is removed');
    p.put(null); p.put(CARD); await ticks();
    assert.equal(p.log.filled.length, 1, 'a later wear change does not touch the unmounted slot'); assert(el.isConnected, 'proving the cleanup, not the removal, did it');
    p.mount(BANNER); p.mount(BANNER);
    assert.equal(p.hooks.length, 1, 'later slots do not hook the router again');
  });

  await test('while editing (?preview) the block shows a quiet note so the owner can find and select it; a visitor never sees it', async () => {
    const edit = page({ url: 'https://defxn.com/about?preview=1' }); edit.win.DefxnWear = { current: null };
    const b = edit.mount(undefined);
    assert(!b.hidden && /Choose what the card makes here in the Library/.test(b.textContent), 'an empty slot says what to do');
    const placed = edit.mount(BANNER);
    assert(!placed.hidden && /A visitor who wears a card sees it here/.test(placed.textContent), 'a placed slot says what a visitor sees');
    edit.put(CARD); await ticks();
    assert(!placed.textContent.includes('Card slot.'), 'the note gives way to the card');
    const visitor = page({ url: 'https://defxn.com/about' }); visitor.win.DefxnWear = { current: null };
    assert(visitor.mount(BANNER).hidden && visitor.mount(undefined).hidden, 'the public page shows nothing');
  });

  console.log('PASS: components-card-slot (' + passed + ' cases): the Card slot is always offered, stored as FLX byte for byte, refused on Save with a named reason, and a visitor sees a card only while one is on.');
})().catch((e) => { console.error(e); process.exit(1); });
