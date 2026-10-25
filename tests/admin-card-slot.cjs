'use strict';
/* The Card slot block in DEFXN Studio: the Library offers it, its one field mounts the NFT session's slot editor
   (DefxnCardComponents.editor, js/nft/card-components.js), and Save refuses a slot the card's own decoder cannot read.
   Runs the real js/admin/library.js and js/admin/save.js in jsdom (tests/lib/admin-forms-dom.cjs); the NFT scripts are the
   real files, brought in by the same loader the Studio uses (A.loadCardKit), with the browser's script fetch played by the test.

   Each case names the defect it exists to catch. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { bootForms } = require('./lib/admin-forms-dom.cjs');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const plain = (x) => JSON.parse(JSON.stringify(x));
const tick = () => new Promise((r) => setTimeout(r, 0));
const ticks = async (n = 8) => { for (let i = 0; i < n; i++) await tick(); };
let passed = 0;
const test = async (name, fn) => { try { await fn(); passed += 1; } catch (error) { console.error('FAIL ' + name); throw error; } };

/* the Studio window, library.js in it, and a script fetch the test controls: `fail` lists files that do not arrive */
function studio(masters, fail) {
  const { window, document, A, state } = bootForms();
  const sent = [], loads = [], destroys = [], failing = new Set(fail || []);
  window.TextEncoder = TextEncoder; window.TextDecoder = TextDecoder;
  /* the browser fetching a <script src>: runs the real file, or errors, in the order the loader asked */
  const append = document.head.appendChild.bind(document.head);
  document.head.appendChild = (el) => {
    if (el.tagName === 'SCRIPT' && el.src) {
      const file = el.getAttribute('src'); loads.push(file);
      setTimeout(() => { if (failing.has(file)) el.onerror && el.onerror(); else { window.eval(read(file) + '\n//# sourceURL=' + file); el.onload && el.onload(); } }, 0);
      return el;
    }
    return append(el);
  };
  const doc = document;
  document.body.insertAdjacentHTML('beforeend', '<div id="libPane"></div>');
  state.cmsSourceSite = { components: { masters: masters || {}, routes: {} } };
  state.cmsInsertPoints = [{ id: 'main', anchorId: 'main', kind: 'anchor', label: 'Page slot "main"', width: 900, usable: true }];
  state.cmsPreviewRoute = '/about'; state.cmsConnected = true; state.libKey = '';
  /* what the shell and the canvas bridge give library.js, only where the booted editor has not already */
  const lent = {
    showLeft() {}, cmsPreview: { contentWindow: { postMessage() {} } }, ic: () => '', toast() {},
    postCmsComponentsCommand: (m) => sent.push(plain(m)), cmsNextComponentId: (p) => p + (sent.length + 1),
    linkPickerEl: () => doc.createElement('div'), devDetails: () => doc.createElement('details'),
  };
  A.provide(Object.fromEntries(Object.entries(lent).filter(([name]) => !(name in A))));
  if (!A.postCmsComponentsCommand || A.postCmsComponentsCommand !== lent.postCmsComponentsCommand) A.postCmsComponentsCommand = lent.postCmsComponentsCommand;
  window.eval(read('js/admin/library.js') + '\n//# sourceURL=js/admin/library.js');
  /* count the editor's destroy() calls by wrapping the real editor once it is loaded */
  const wrap = () => {
    const K = window.DefxnCardComponents;
    if (K && !K.__counted) { const real = K.editor; K.editor = (host, o) => { const e = real(host, o); const d = e.destroy; e.destroy = () => { destroys.push(host); return d(); }; return e; }; K.__counted = true; }
  };
  return { window, document, A, state, sent, loads, destroys, wrap, failing, pane: doc.getElementById('libPane') };
}
const MOVING = (() => {
  const s = studio(); const win = s.window;
  win.eval(read('js/nft/timeline.js')); win.eval(read('js/nft/card-components.js'));
  return win.DefxnCardComponents.encode({ kind: 'stamp', timeline: { version: 1, tracks: [{ target: 'frame', prop: 'draw', from: 'left', easing: 'out', delay: 0, ms: 360, stagger: 40, most: 8 }] } });
})();
const press = (root, text) => [...root.querySelectorAll('button')].find((b) => b.textContent === text);

(async () => {
  await test('the Library lists the Card slot among the media blocks, with a description that says what a visitor sees', async () => {
    const s = studio(); s.A.renderLibrary();
    const row = s.pane.querySelector('.lib-block[data-resolver="RBLOCK_CARD_SLOT_V1"]');
    assert(row, 'a row for the Card slot'); assert.equal(row.closest('.lib-group').dataset.group, 'media');
    assert.match(row.querySelector('.lib-words small').textContent, /A visitor who wears no card sees nothing here\./);
    assert(!row.querySelector('.lib-thumb-inner'), 'no Ark mini-render: there is no Ark block behind it, only the icon');
    assert.deepEqual(s.loads, [], 'listing it loads none of the card scripts');
  });

  await test('Insert creates an empty block (no slot saved) and puts it on the page: one create, one insert', async () => {
    const s = studio(); s.A.renderLibrary();
    press(s.pane.querySelector('.lib-block[data-resolver="RBLOCK_CARD_SLOT_V1"]'), 'Insert').click();
    assert.equal(s.sent.length, 2);
    assert.equal(s.sent[0].action, 'create-master'); assert.equal(s.sent[0].resolver, 'RBLOCK_CARD_SLOT_V1'); assert.deepEqual(s.sent[0].props, {}, 'no slot until the owner chooses one');
    assert.equal(s.sent[0].label, 'Card slot'); assert.equal(s.sent[1].action, 'insert-instance'); assert.equal(s.sent[1].masterId, s.sent[0].id);
  });

  await test('with no slot saved the field offers one button, and mounts nothing: absent is not a banner nobody chose', async () => {
    const s = studio(); s.A.renderLibrary();
    press(s.pane.querySelector('.lib-block[data-resolver="RBLOCK_CARD_SLOT_V1"]'), 'Customize').click();
    const field = s.pane.querySelector('[data-prop="slot"]');
    assert(field && field.tagName === 'FIELDSET', 'the Card slot field is drawn');
    assert.match(field.querySelector('legend').textContent, /What the card makes here/);
    assert(press(field, 'Choose what the card makes'), 'with its one way in');
    assert(!field.querySelector('select'), 'and no editor yet'); assert.deepEqual(s.loads, [], 'and nothing loaded');
  });

  await test('choosing loads the NFT scripts in order, mounts the slot editor, and writes the default slot as one change', async () => {
    const s = studio(); s.A.renderLibrary();
    press(s.pane.querySelector('.lib-block[data-resolver="RBLOCK_CARD_SLOT_V1"]'), 'Customize').click();
    const field = s.pane.querySelector('[data-prop="slot"]');
    press(field, 'Choose what the card makes').click();
    await ticks();
    assert.deepEqual(s.loads, ['js/nft/timeline.js', 'js/nft/timeline-editor.js', 'js/nft/card-components.js'], 'the timeline first, then its editor, then the slot editor that needs both');
    assert(s.document.querySelector('link[data-card-kit][href="css/nft-card.css"]'), 'with the editor\'s styles');
    const select = field.querySelector('.defxn-slot-editor select');
    assert(select && select.value === 'banner', 'the editor shows what the card makes, a banner to begin with');
    const K = s.window.DefxnCardComponents;
    const form = s.pane.querySelector('.lib-new');
    assert(form, 'in the Customize form');
    /* Create block takes the form's working copy: the default slot is in it, exactly the editor's text */
    press(form, 'Create block').click();
    assert.equal(s.sent.length, 1); assert.equal(s.sent[0].props.slot, K.encode({ kind: 'banner', timeline: null }), 'the default slot, as the NFT encoder writes it');
  });

  await test('a saved slot opens in the editor, and one change in it is one update (one undoable step), carrying the whole slot text', async () => {
    const masters = { m1: { resolver: 'RBLOCK_CARD_SLOT_V1', label: 'Banner for visitors', props: { slot: MOVING } } };
    const s = studio(masters); s.A.cmsOpenMasterInLibrary('m1');
    await ticks();
    const field = s.pane.querySelector('.lib-definition [data-prop="slot"]');
    const select = field.querySelector('.defxn-slot-editor select');
    assert(select && select.value === 'stamp', 'the saved kind is shown');
    assert(field.querySelector('.defxn-tle__tracks li'), 'and its motion track');
    assert.equal(s.sent.length, 0, 'mounting reports no change');
    select.value = 'nameplate'; select.dispatchEvent(new s.window.Event('change'));
    assert.equal(s.sent.length, 1, 'one change, one command, so one undoable step: ' + JSON.stringify(s.sent));
    const K = s.window.DefxnCardComponents, was = K.decode(MOVING);
    assert.equal(s.sent[0].action, 'update-master'); assert.equal(s.sent[0].id, 'm1');
    assert.equal(s.sent[0].patch.props.slot, K.encode({ kind: 'nameplate', timeline: was.timeline }), 'the new kind with the motion kept, as the NFT encoder writes it');
  });

  await test('a repaint destroys the editor it replaces (no editor outlives its field)', async () => {
    const masters = { m1: { resolver: 'RBLOCK_CARD_SLOT_V1', label: 'Banner for visitors', props: { slot: MOVING } } };
    const s = studio(masters); await s.A.loadCardKit(); s.wrap();
    s.A.cmsOpenMasterInLibrary('m1'); await ticks();
    const body = s.pane.querySelector('.defxn-slot-editor').parentNode;
    assert.equal(s.destroys.length, 0, 'the editor on screen is alive');
    s.state.libKey = ''; s.A.renderLibrary(); await ticks();   // a repaint, as the preview's relay of an edit causes
    assert.deepEqual(s.destroys, [body], 'the editor of the field the repaint replaced was destroyed');
    assert(!body.isConnected, 'its field is gone from the document');
    assert.equal(s.pane.querySelectorAll('.defxn-slot-editor').length, 1, 'and one editor is on screen, the new field\'s');
  });

  await test('if the scripts do not load the field says what failed, what it needs and the remedy, and Try again works', async () => {
    const masters = { m1: { resolver: 'RBLOCK_CARD_SLOT_V1', label: 'Banner for visitors', props: { slot: MOVING } } };
    const s = studio(masters, ['js/nft/timeline-editor.js']); s.A.cmsOpenMasterInLibrary('m1'); await ticks();
    const field = s.pane.querySelector('[data-prop="slot"]');
    assert.match(field.textContent, /The card slot editor did not load: could not load js\/nft\/timeline-editor\.js\./, 'what failed');
    assert.match(field.textContent, /It needs js\/nft\/timeline\.js, js\/nft\/timeline-editor\.js and js\/nft\/card-components\.js from this site\./, 'what it needs');
    assert.match(field.textContent, /Check the connection, then try again, or reload the editor\./, 'the remedy');
    assert(!field.querySelector('select'), 'no half-built editor');
    s.failing.clear();
    press(field, 'Try again').click(); await ticks();
    assert(s.pane.querySelector('[data-prop="slot"] .defxn-slot-editor select'), 'a retry after the files arrive mounts the editor');
  });

  await test('a saved slot the NFT decoder refuses is not mounted over: the field says why and offers to start again', async () => {
    const masters = { m1: { resolver: 'RBLOCK_CARD_SLOT_V1', label: 'Banner for visitors', props: { slot: '{"kind":"banner"}' } } };
    const s = studio(masters); s.A.cmsOpenMasterInLibrary('m1'); await ticks();
    const field = s.pane.querySelector('[data-prop="slot"]');
    assert.match(field.textContent, /The saved slot text cannot be read \(A card slot starts with DFXNCOMP1-K/);
    assert.match(field.textContent, /It needs slot text written by this editor\. Start again to replace it with a new slot\./);
    assert(!field.querySelector('select')); assert.equal(s.sent.length, 0, 'nothing is rewritten until the owner asks');
    press(field, 'Start again').click(); await ticks();
    assert.equal(s.sent.length, 1, 'starting again is one change'); assert.match(s.sent[0].patch.props.slot, /^DFXNCOMP1-K[0-9a-f]+\n$/);
  });

  await test('Save loads the card\'s decoder, then refuses a slot it cannot read, naming the field, the failure, the need and the remedy', async () => {
    const s = studio();
    const bad = { version: 1, masters: { m1: { resolver: 'RBLOCK_CARD_SLOT_V1', label: 'Banner for visitors', props: { slot: 'not a slot' } } }, routes: {} };
    s.state.componentsDraft = bad;
    assert(!s.window.DefxnCardComponents, 'the decoder is not loaded before Save');
    const handle = s.A.singleDraftHandle('components');
    await assert.rejects(handle.save(), (error) => {
      assert.match(error.message, /^Not saved: 1 thing to fix in your components/);
      assert.match(error.message, /Component "Banner for visitors", What the card makes here: the slot text was not written by the Card slot editor \(A card slot starts with DFXNCOMP1-K/);
      assert.match(error.message, /Needs slot text from the Card slot editor: a DFXNCOMP1 line, then any DFXNTL1 lines it wrote\. Remedy: open the Card slot in the Library and choose what the card makes there again, or clear the field\./);
      return true;
    });
    assert(s.window.DefxnCardComponents, 'Save brought the decoder in itself, so the refusal is the decoder\'s reason, not "could not be checked"');
  });

  await test('Save writes a draft whose slot the decoder reads, as FLX', async () => {
    const s = studio(); s.state.cdirs = { content: {} };
    const written = [];
    s.window.ArkAdminStore.saveComponents = async (dir, draft) => { written.push(s.window.ArkComponents.serialize(draft)); };
    s.state.componentsDraft = { version: 1, masters: { m1: { resolver: 'RBLOCK_CARD_SLOT_V1', label: 'Banner', props: { slot: MOVING } } }, routes: {} };
    await s.A.singleDraftHandle('components').save();
    assert.equal(written.length, 1);
    assert(written[0].includes('ArkComponents.define("') && !/"masters"/.test(written[0]), 'the file is FLX, not a JSON literal');
  });

  console.log('PASS: admin-card-slot (' + passed + ' cases): the Library offers the Card slot, its field mounts the slot editor one step at a time, and Save refuses a slot the card cannot read.');
})().catch((e) => { console.error(e); process.exit(1); });
