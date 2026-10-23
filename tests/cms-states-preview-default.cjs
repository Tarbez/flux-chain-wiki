'use strict';
/* Regressions found driving the merged editor in Chromium (tests/browser/studio-flows.mjs,
   flow `statesui`), all about the difference between what a state group SHOWS and which state
   it shows FIRST:

   4. Previewing a state from the toolbar, then saving, made that state the public default.
      "Preview" was ArkStates.setCurrent on the very draft Save writes. Now what the editor (and
      a visitor's click) shows lives apart (js/main.js cmsStatesShowing, never saved); the
      default is an explicit "Default state" control, and stays state 0 until someone sets it.
   5. Live-mode clicks did not update the toolbar's "Showing" label: the click advanced the
      preview's own copy and told the editor nothing. Now every switch reports what is showing
      (defxn-cms-preview-states-showing), and the label reads that, not the saved default.
   6. The selection outline stayed drawn over a state-0 element the switch had just hidden --
      an outline around nothing. Now the selection moves to what the switch revealed (the
      showing state's content, or state 0's members), and the outline is only ever drawn
      around something that is rendered.

   Runs the real code extracted from js/main.js and js/admin/admin.js against the real
   ArkStates module in jsdom. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const { buildersSource } = require('./lib/admin-source.cjs');

const main = fs.readFileSync('js/main.js', 'utf8'), admin = require('./lib/admin-source.cjs').ADMIN;
function cut(src, from, to, what) {
  const a = src.indexOf(from), b = src.indexOf(to, a + 1);
  assert(a >= 0 && b > a, 'still extractable: ' + what);
  return src.slice(a, b);
}
const showingHelpers = cut(main, '  var cmsStatesShowing = {};', '  /* Canvas-only mode (Part G', 'the showing helpers');
const reconcileAndShow = cut(main, '  /* After a group switches state', '  /* Layered-state edits from Studio', 'cmsReconcileSelection + cmsShowState');
const statesCommand = cut(main, '  function cmsStatesCommand(data) {', "  /* Canvas-only mode's field edits", 'cmsStatesCommand');
const placeUi = cut(main, '  function placeCmsLayoutUi() {', '  /* Grouping lives entirely in ArkLayout', 'placeCmsLayoutUi');
const clickStart = main.indexOf("  document.addEventListener('click', function (event) {\n    if (!window.ArkStates) return;");
const clickListener = main.slice(clickStart, main.indexOf('  }, true);', clickStart) + '  }, true);'.length);
const plain = (x) => JSON.parse(JSON.stringify(x));

function preview({ edit = true } = {}) {
  const dom = new JSDOM('<body><div id="host"><header><nav data-ark-layout-key="k-nav"><a data-ark-layout-key="k-a">Overview</a><a data-ark-layout-key="k-b">How it works</a></nav></header></div></body>');
  const doc = dom.window.document, host = doc.getElementById('host'), posted = [];
  const shown = (el) => { for (let n = el; n && n !== doc; n = n.parentNode) if (n.style && n.style.display === 'none') return false; return !!el && el.isConnected; };
  const context = {
    document: doc, host, location: { origin: 'http://x' }, getComputedStyle: dom.window.getComputedStyle,
    window: { parent: { postMessage: (m) => posted.push(plain(m)) } },
    cmsPreviewQuery: true, cmsPreviewEdit: edit, cmsComponentsDraft: {}, cmsPreviewSelections: [], cmsPreviewSelected: null,
    cmsRoutePath: () => '/', cmsRealTree: () => [], cmsInsertionPoints: () => [], cmsGroupList: () => [],
    cmsIsShown: shown, placed: 0,
    /* ArkLayout as js/content/states.js uses it: the keys are already in the markup, so annotate()
       only lists the keyed elements, in document order, as the real one returns them */
    ArkLayout: { annotate: (root) => Array.from(root.querySelectorAll('[data-ark-layout-key]')) },
  };
  context.window.ArkStates = true;
  context.cmsSelectionList = () => context.cmsPreviewSelections.filter((el) => el && el.isConnected);
  context.placeCmsLayoutUi = () => { context.placed += 1; };
  context.emitCmsLayoutSelection = () => posted.push({ type: 'defxn-cms-preview-select', selected: context.cmsPreviewSelections.map((el) => el.getAttribute('data-ark-layout-key') || el.getAttribute('data-ark-insert')) });
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/content/states.js', 'utf8'), context);
  context.window.ArkStates = context.ArkStates;
  let draft = context.ArkStates.createStateGroup({}, '/', 'st1', ['k-a', 'k-b'], 'self');
  draft = context.ArkStates.addState(draft, '/', 'st1', 'State 1');
  draft = context.ArkStates.addState(draft, '/', 'st1', 'State 2');
  context.cmsStatesDraft = context.ArkStates.define(draft);
  vm.runInContext(showingHelpers + reconcileAndShow + statesCommand + '\nthis.command = cmsStatesCommand; this.view = cmsStatesView;', context);
  context.ArkStates.renderAll(host, '/', context.view('/'), {});
  return { context, doc, host, posted, shown, dom, member: (k) => doc.querySelector(`[data-ark-layout-key="${k}"]`), anchor: (i) => doc.querySelector(`[data-ark-state-anchor][data-ark-state-index="${i}"]`) };
}

/* ---- 4. Preview is not a default; Default state is */
{
  const p = preview();
  p.context.command({ action: 'preview', groupId: 'st1', index: 2 });
  assert(!p.shown(p.member('k-a')) && p.shown(p.anchor(2)), 'Preview state 2 shows state 2 in the editor');
  assert.equal(p.context.cmsStatesDraft.routes['/'].st1.current, 0, 'and leaves the saved default at state 0 -- it used to become 2, and Save published it');
  assert(!p.posted.some((m) => m.type === 'defxn-cms-preview-states-replace'), 'a preview sends no draft change to the editor at all');
  assert.deepEqual(p.posted.find((m) => m.type === 'defxn-cms-preview-states-showing').showing, { st1: 2 }, 'it reports what is showing instead');
  p.context.command({ action: 'set-default', groupId: 'st1', index: 1 });
  const replace = p.posted.filter((m) => m.type === 'defxn-cms-preview-states-replace').pop();
  assert.equal(replace.states.routes['/'].st1.current, 1, 'Default state is the one control that writes the saved default');
  assert.deepEqual(replace.showing, { st1: 1 }, 'and it also shows that state');
  p.context.command({ action: 'remove-state', groupId: 'st1', index: 1 });
  assert.equal(p.context.view('/').routes['/'].st1.current, 0, 'removing the showing state falls back to showing state 0');
  console.log('PASS: Preview changes only what is shown; the saved default changes only through Default state.');
}

/* ---- 5. a Live-mode click reports what it now shows */
{
  const p = preview({ edit: false });            /* the editor's Live mode */
  vm.runInContext(clickListener, p.context);
  p.member('k-a').dispatchEvent(new p.dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert(p.shown(p.anchor(1)), 'a Live click advances to state 1');
  assert.equal(p.context.cmsStatesDraft.routes['/'].st1.current, 0, 'without touching the saved default');
  assert.deepEqual(p.posted.filter((m) => m.type === 'defxn-cms-preview-states-showing').pop().showing, { st1: 1 }, 'and tells the editor, so its "Showing" label can follow');
  console.log('PASS: a Live-mode click reports what the group now shows.');
}

/* ---- 6. the selection (and so the outline) follows what a switch reveals */
{
  const p = preview();
  p.context.cmsPreviewSelections = [p.member('k-a')]; p.context.cmsPreviewSelected = p.member('k-a');
  p.context.command({ action: 'preview', groupId: 'st1', index: 1 });
  assert.deepEqual(p.context.cmsPreviewSelections.map((el) => el.getAttribute('data-ark-insert')), ['state-st1-1'], 'a selected state-0 link hidden by the switch is replaced by the state now showing');
  assert.deepEqual(p.posted.filter((m) => m.type === 'defxn-cms-preview-select').pop().selected, ['state-st1-1'], 'and the editor is told, so the toolbar follows');
  p.context.command({ action: 'preview', groupId: 'st1', index: 0 });
  assert.deepEqual(p.context.cmsPreviewSelections.map((el) => el.getAttribute('data-ark-layout-key')), ['k-a', 'k-b'], 'switching back selects state 0\'s members again');
  const before = p.posted.length;
  p.context.cmsPreviewSelections = [p.doc.querySelector('header')];
  p.context.command({ action: 'preview', groupId: 'st1', index: 2 });
  assert.deepEqual(p.context.cmsPreviewSelections.map((el) => el.tagName), ['HEADER'], 'a selection the switch did not hide is left alone');
  assert(!p.posted.slice(before).some((m) => m.type === 'defxn-cms-preview-select'), 'and not re-announced');
  console.log('PASS: a state switch moves a selection it hid onto what it revealed.');
}
{
  /* the outline itself is never drawn around something that is not rendered */
  const dom = new JSDOM('<body><a id="gone" style="display:none">x</a></body>');
  const doc = dom.window.document, el = doc.getElementById('gone');
  const box = doc.createElement('div'), label = doc.createElement('div');
  const context = { document: doc, cmsPreviewEdit: true, cmsMultiBoxes: [], cmsLayoutHandles: [], cmsLayoutBox: box, cmsLayoutLabel: label, cmsPreviewSelections: [el], cmsPreviewSelected: el,
    ensureCmsLayoutUi() {}, cmsSelectionList: () => [el], cmsIsShown: (e) => e.style.display !== 'none', cmsRectOf: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }), cmsUnionRect: () => ({}) };
  vm.createContext(context);
  vm.runInContext(placeUi + '\nthis.place = placeCmsLayoutUi;', context);
  context.place();
  assert.equal(box.hidden, true, 'a hidden selected element gets no outline (it used to keep one, drawn over the empty spot)');
  assert.equal(label.hidden, true);
  console.log('PASS: no outline around a hidden selection.');
}

/* ---- the editor side: the label reads what is showing, the default is its own control */
{
  const start = admin.indexOf('  function addStateContent(');
  const end = admin.indexOf('  /* Element animation (Part H', start);
  assert(start >= 0 && end > start, 'js/admin/admin.js still defines addStateContent + buildStateGroupSection');
  const dom = new JSDOM('<body><div id="pane"></div></body>');
  const doc = dom.window.document, sent = [];
  const context = {
    document: doc,
    /* what more than one editor file reads lives on the shared state object (js/admin/state.js) */
    state: {
      cmsExactSelection: { route: '/', key: 'k-a', stateGroup: { groupId: 'st1' } },
      cmsStatesShowing: { st1: 2 },
      cmsSourceSite: { states: { version: 1, routes: { '/': { st1: { trigger: 'self', current: 0, states: [{ label: 'Default', members: ['k-a'] }, { label: 'State 1', members: [] }, { label: 'State 2', members: [] }] } } } } },
    },
    CMS_BLOCK_RESOLVERS: [{ resolver: 'RBLOCK_TEXT_V1', label: 'Text', props: ['heading'] }],
    cmsNextComponentId: (prefix) => prefix + '1', cmsBlockResolverLabel: () => 'Text', cmsTreeRowForKey: () => null,
    accordion: (pane) => { const body = doc.createElement('div'); pane.appendChild(body); return body; },
    /* the toolbar shell's section builder (an accordion, now an icon-bar popover): the content goes in the body it returns */
    toolbarSection: (pane) => { const body = doc.createElement('div'); pane.appendChild(body); return body; },
    /* the one Developer details disclosure (js/admin/controls.js): ids and keys go there */
    devDetails: () => doc.createElement('div'),
    postCmsStatesCommand: (m) => sent.push(plain(m)), postCmsComponentsCommand: (m) => sent.push(plain(m)),
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/content/states.js', 'utf8'), context);
  vm.runInContext(buildersSource(), context);
  vm.runInContext(admin.slice(start, end) + '\nthis.build = buildStateGroupSection;', context);
  const pane = doc.getElementById('pane');
  context.build(pane);
  const rows = [...pane.querySelectorAll('.row')].filter((r) => /^\d ·/.test(r.querySelector('label').textContent));
  assert.equal(rows[2].querySelector('button').textContent, 'Showing', 'the row the preview reports as showing says Showing -- not the saved default\'s row');
  assert.equal(rows[0].querySelector('button').textContent, 'Preview');
  rows[1].querySelector('button').click();
  assert.deepEqual(sent.pop(), { action: 'preview', groupId: 'st1', index: 1 }, 'Preview sends a preview, never set-current');
  const select = pane.querySelector('select[aria-label="Default state"]');
  assert(select, 'there is an explicit Default state control');
  assert.equal(select.value, '0', 'showing the saved default, state 0');
  select.value = '2'; select.dispatchEvent(new dom.window.Event('change'));
  assert.deepEqual(sent.pop(), { action: 'set-default', groupId: 'st1', index: 2 });
  assert(/if \(event\.data\.showing\) state\.cmsStatesShowing = event\.data\.showing;/.test(admin) && /'defxn-cms-preview-states-showing'\) \{[\s\S]{0,200}renderInspector\(\)/.test(admin), 'the editor takes every "showing" report and repaints the toolbar');
  console.log('PASS: the toolbar labels what is showing and keeps the default as its own control.');
}
