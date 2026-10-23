'use strict';
/* Regression: "+ Add state" in the toolbar's States section added an EMPTY state and left
   the preview on state 0, so nothing visibly happened; previewing the new state then showed
   a zero-size, empty anchor -- and with the default 'self' trigger nothing was left to click,
   stranding the group there. Adding content to a state went through a prompt() that wanted
   the exact word "Text": "text block", a typo or Cancel silently did nothing. Found driving
   the real editor in Chromium (tests/browser/studio-flows.mjs).
   Now "+ Add state" adds the state WITH content reading its label and shows it. That content
   is derived in the preview from state 0's own markup ('seed-state', js/main.js's
   cmsSeedState -- tests/components-capture.cjs covers the derivation), and showing it is a
   transient 'preview', never a saved default (tests/cms-states-preview-default.cjs).
   "+ Add content block" is a block-type <select> + button. Also checked: each state row's
   Remove button shares the control cell with Preview (it used to sit in the narrow third
   column and was clipped to "Re").
   Runs the real addStateContent/buildStateGroupSection from js/admin/admin.js in jsdom,
   recording the commands it sends to the preview. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const { buildersSource } = require('./lib/admin-source.cjs');

const admin = require('./lib/admin-source.cjs').ADMIN;
const start = admin.indexOf('  function addStateContent(');
const end = admin.indexOf('  /* Element animation (Part H', start);
assert(start >= 0 && end > start, 'js/admin/admin.js still defines addStateContent + buildStateGroupSection before the element animation section');
const code = admin.slice(start, end);
assert(!/prompt\(['"`]/.test(code), 'the States section never asks for a block type through prompt()');

function build(states) {
  const dom = new JSDOM('<body><div id="pane"></div></body>');
  const doc = dom.window.document, sent = [];
  let n = 0;
  const context = {
    document: doc,
    /* what more than one editor file reads lives on the shared state object (js/admin/state.js) */
    state: {
      cmsExactSelection: { route: '/', key: 'k-btn', stateGroup: { groupId: 'st1' } },
      cmsStatesShowing: {},
      cmsSourceSite: { states: { version: 1, routes: { '/': { st1: { trigger: 'self', current: 0, states } } } } },
    },
    CMS_BLOCK_RESOLVERS: [{ resolver: 'RBLOCK_TEXT_V1', label: 'Text', props: ['heading', 'body', 'align', 'size'] }, { resolver: 'RBLOCK_CTA_V1', label: 'Button / link', props: ['label', 'href', 'variant'] }],
    cmsNextComponentId: (prefix) => prefix + (++n),
    cmsBlockResolverLabel: (r) => (r === 'RBLOCK_CTA_V1' ? 'Button / link' : 'Text'),
    cmsTreeRowForKey: () => null,
    accordion: (pane) => { const body = doc.createElement('div'); pane.appendChild(body); return body; },
    /* the toolbar shell's section builder (an accordion, now an icon-bar popover): the content goes in the body it returns */
    toolbarSection: (pane) => { const body = doc.createElement('div'); pane.appendChild(body); return body; },
    /* the one Developer details disclosure (js/admin/controls.js): ids and keys go there */
    devDetails: () => doc.createElement('div'),
    postCmsStatesCommand: (p) => sent.push(Object.assign({ to: 'states' }, JSON.parse(JSON.stringify(p)))),
    postCmsComponentsCommand: (p) => sent.push(Object.assign({ to: 'components' }, JSON.parse(JSON.stringify(p)))),
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/content/states.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('js/content/components.js', 'utf8'), context);
  vm.runInContext(buildersSource(), context);
  vm.runInContext(code + '\nthis.build = buildStateGroupSection;', context);
  const pane = doc.getElementById('pane');
  context.build(pane);
  const button = (text) => [...pane.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith(text));
  return { pane, sent, button, doc };
}

{
  const t = build([{ label: 'Default', members: ['k-nav'] }]);
  t.button('+ Add state').click();
  const [add, seed, show] = t.sent;
  assert.deepEqual([add.to, add.action, add.label], ['states', 'add-state', 'State 1'], '1. the state is added');
  assert.deepEqual([seed.to, seed.action, seed.groupId, seed.index, seed.label], ['components', 'seed-state', 'st1', 1, 'State 1'], '2. its content is derived from state 0 with the label as visible text, not props {}');
  assert(seed.id && seed.key, '3. the derived master and its instance get their ids here, like every other create');
  assert.deepEqual([show.to, show.action, show.index], ['states', 'preview', 1], '4. and the new state is shown -- as a preview, so the click visibly does something without changing the saved default');
  assert.equal(t.sent.length, 3);
  console.log('PASS: + Add state adds a state that already shows something, and shows it.');
}
{
  const t = build([{ label: 'Default', members: ['k-nav'] }, { label: 'State 1', members: [] }]);
  const select = t.pane.querySelector('select[aria-label="Block type for state 2"]');
  assert(select, 'state 1 has a block-type <select>');
  select.value = 'RBLOCK_CTA_V1';
  t.button('+ Add content block').click();
  const master = t.sent.find((m) => m.action === 'create-master');
  assert.equal(master.resolver, 'RBLOCK_CTA_V1', 'the chosen block type is used');
  assert.equal(master.props.label, 'State 1', 'with the state\'s label as its visible text');
  assert(t.sent.some((m) => m.action === 'insert-instance' && m.anchorId === 'state-st1-1'));
  assert(t.sent.some((m) => m.action === 'preview' && m.index === 1), 'and that state is shown (a preview, not a saved default)');
  const remove = t.button('Remove'), preview = remove.parentNode.querySelector('button');
  assert.match(preview.textContent, /Preview|Showing/, 'Remove shares its cell with the Preview button (it used to be clipped in the narrow third column)');
  console.log('PASS: + Add content block uses a <select>, not prompt(), and Remove sits beside Preview.');
}
