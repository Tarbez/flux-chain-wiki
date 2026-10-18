'use strict';
/* Regressions found driving the merged editor in Chromium (tests/browser/studio-flows.mjs,
   flow `points`):

   2. On /about an inserted block was invisible: the page's only declared insertion point
      sits in a section whose padding leaves it 0px of content width, so the block existed
      and could not be seen. Fixed by geometry, not by a page list: every place is measured
      (a declared slot by its own width, a spot or "after the selection" by its parent's
      content width), and a place too narrow to show anything is not offered -- but still
      named, with why, so a missing option does not read as a missing feature.
   3. Library > Insert offered a showing STATE's own slot as a place to insert (that content
      belongs to the state, and is managed in the States section), and chose among several
      places with prompt(), which wanted an anchor id typed exactly. Now state slots are never
      places, and several places open an in-panel picker whose options outline their place in
      the preview on hover/focus.

   Runs js/main.js's cmsInsertionPoints and js/admin/admin.js's renderLibrary, extracted
   verbatim, in jsdom (geometry stubbed per element: jsdom has no layout). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const main = fs.readFileSync('js/main.js', 'utf8'), admin = fs.readFileSync('js/admin/admin.js', 'utf8');
function cut(src, from, to, what) {
  const a = src.indexOf(from), b = src.indexOf(to, a + 1);
  assert(a >= 0 && b > a, 'still extractable: ' + what);
  return src.slice(a, b);
}
const plain = (x) => JSON.parse(JSON.stringify(x));

/* ---- the preview side: which places exist, and which would show a block */
{
  const dom = new JSDOM(`<body><main id="host">
      <section id="about"><div data-ark-insert="main"></div></section>
      <section id="wide"><h2 id="title" data-ark-layout-key="k-title">Title</h2><div data-ark-insert="side"></div></section>
      <nav id="nav" data-ark-state-group="st1"><a data-ark-layout-key="k-a">A</a></nav>
      <div data-ark-insert="state-st1-1" data-ark-state-anchor="" data-ark-state-group="st1"></div>
      <div id="inst" data-ark-component-key="i1"><p data-ark-layout-key="k-in">in a block</p></div>
    </main></body>`);
  const doc = dom.window.document, host = doc.getElementById('host');
  const geo = (id, width, clientWidth) => { const el = typeof id === 'string' ? doc.getElementById(id) || doc.querySelector(`[data-ark-insert="${id}"]`) : id; el.getBoundingClientRect = () => ({ left: 0, top: 0, right: width, bottom: 0, width, height: 0 }); Object.defineProperty(el, 'clientWidth', { value: clientWidth == null ? width : clientWidth }); };
  geo('main', 0); geo('side', 640); geo('wide', 700, 700); geo('about', 128, 128);
  doc.getElementById('about').style.paddingLeft = '64px'; doc.getElementById('about').style.paddingRight = '64px';
  const context = { host, getComputedStyle: dom.window.getComputedStyle, cmsIsShown: (el) => !!el && el.isConnected, cmsPreviewSelected: null, window: { ArkComponents: true } };
  vm.createContext(context);
  vm.runInContext(cut(main, '  var MIN_POINT_WIDTH', "  /* The Library's point picker hovers", 'cmsInsertionPoints') + '\nthis.points = cmsInsertionPoints;', context);

  let points = plain(context.points());
  assert.deepEqual(points.map((p) => p.id), ['main', 'side'], 'a state\'s own slot is never a place to insert (it used to be offered while the state showed)');
  const about = points.find((p) => p.id === 'main');
  assert.equal(about.usable, false, 'a 0px-wide slot is not offered: a block put there is invisible (/about)');
  assert.match(about.reason, /0px wide .* invisible/, 'and it says why');
  assert.equal(points.find((p) => p.id === 'side').usable, true, 'a slot with room is offered');

  context.cmsPreviewSelected = doc.getElementById('title');
  points = plain(context.points());
  const after = points.find((p) => p.kind === 'after');
  assert(after && after.after === 'k-title' && after.usable, '"after the selection" is a place, measured by the parent it would land in: ' + JSON.stringify(after));
  assert.match(after.label, /^After the selection: h2 "Title"/);

  /* the same rule, not a page list: after a selection inside the 0px section is not offered either */
  const inAbout = doc.createElement('p'); inAbout.setAttribute('data-ark-layout-key', 'k-about-p'); doc.getElementById('about').prepend(inAbout);
  context.cmsPreviewSelected = inAbout;
  const afterAbout = plain(context.points()).find((p) => p.kind === 'after');
  assert.equal(afterAbout.usable, false, 'after a selection in a 0px column is just as invisible: ' + JSON.stringify(afterAbout));

  context.cmsPreviewSelected = doc.querySelector('[data-ark-layout-key="k-in"]');
  assert(!plain(context.points()).some((p) => p.kind === 'after'), 'there is no "after" place inside an inserted block (it is rebuilt on every render)');
  console.log('PASS: places are measured; 0px places and state slots are never offered.');
}

/* ---- the editor side: Insert -- direct, picker, or disabled with a reason; never prompt() */
function library(points, masters) {
  const code = cut(admin, "  let libKey = '';", '     Theme pane: site and audience first', 'renderLibrary');
  const dom = new JSDOM('<body><div id="libPane"></div><button id="btnContentCms"></button></body>');
  const doc = dom.window.document, sent = [], highlights = [];
  const context = {
    document: doc, $: (id) => doc.getElementById(id), ic: () => '', toast() {}, selectDesign() {}, showLeft() {},
    cmsSourceSite: { components: { masters, routes: {} } }, cmsInsertPoints: points, cmsPreviewRoute: '/download', cmsConnected: true,
    cmsPreview: { contentWindow: { postMessage: (m) => highlights.push(m.id) } }, location: { origin: 'http://x' },
    CMS_BLOCK_RESOLVERS: [['RBLOCK_TEXT_V1', 'Text', ['heading', 'body']]], cmsBlockResolverLabel: () => 'Text', cmsBlockResolverProps: () => ['heading', 'body'],
    cmsMasterKind: () => 'Text', cmsMasterProps: (m) => Object.keys(m.props), cmsNextComponentId: (p) => p + 'X',
    postCmsComponentsCommand: (m) => sent.push(plain(m)),
    prompt: () => { throw new Error('prompt() was called'); },
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(code.replace(/\n  \/\* =+\s*$/, '') + '\nthis.render = renderLibrary;', context);
  context.render();
  const row = (label) => [...doc.querySelectorAll('#libPane .myrow')].find((r) => r.querySelector('span').textContent === label);
  const button = (r, text) => [...r.querySelectorAll('button')].find((b) => b.textContent === text);
  return { doc, dom, sent, highlights, row, button, pane: doc.getElementById('libPane') };
}
const MASTERS = { m1: { resolver: 'RBLOCK_TEXT_V1', label: 'Hello', props: { heading: 'Hi', body: 'There' } }, m2: { resolver: 'RBLOCK_TEXT_V1', label: 'Hello (detached)', props: { heading: 'x' }, detached: true } };
{
  const lib = library([{ id: 'main', anchorId: 'main', kind: 'anchor', label: 'Page slot "main"', width: 0, usable: false, reason: '0px wide in this page\'s layout -- a block inserted here would be invisible' }], MASTERS);
  const insert = lib.button(lib.row('Hello'), 'Insert');
  assert.equal(insert.disabled, true, 'with no visible place, Insert is disabled');
  assert.match(insert.title, /select an element/i, 'and says what it needs');
  assert.match(lib.pane.textContent, /Not offered: Page slot "main" \(0px wide/, 'the unoffered place is named, with why');
  assert(!lib.row('Hello (detached)'), 'a detached copy is not offered for reuse');
  console.log('PASS: no visible place -> Insert disabled, saying why and what to do.');
}
{
  const points = [{ id: 'main', anchorId: 'main', kind: 'anchor', label: 'Page slot "main"', width: 900, usable: true }, { id: 'after:k-h1', after: 'k-h1', kind: 'after', label: 'After the selection: h1 "Start"', width: 900, usable: true }];
  const lib = library(points, MASTERS);
  lib.button(lib.row('Hello'), 'Insert').click();
  const options = [...lib.pane.querySelectorAll('.lib-picker .lib-point')];
  assert.deepEqual(options.map((o) => o.textContent), ['Page slot "main"', 'After the selection: h1 "Start"'], 'two places open an in-panel picker (no prompt())');
  options[1].dispatchEvent(new lib.dom.window.Event('mouseenter'));
  assert.equal(lib.highlights.pop(), 'after:k-h1', 'hovering a place outlines it in the preview');
  options[1].dispatchEvent(new lib.dom.window.Event('mouseleave'));
  assert.equal(lib.highlights.pop(), '', 'and leaving it clears the outline');
  options[1].click();
  assert.deepEqual(lib.sent.pop(), { action: 'insert-instance', after: 'k-h1', key: 'iX', masterId: 'm1' }, 'choosing a place inserts there');
  assert(!lib.pane.querySelector('.lib-picker'), 'and closes the picker');
  console.log('PASS: several places -> an in-panel picker that outlines each place; never prompt().');
}
{
  const lib = library([{ id: 'main', anchorId: 'main', kind: 'anchor', label: 'Page slot "main"', width: 900, usable: true }], MASTERS);
  lib.button(lib.row('Hello'), 'Insert').click();
  assert.deepEqual(lib.sent.pop(), { action: 'insert-instance', anchorId: 'main', key: 'iX', masterId: 'm1' }, 'one place inserts at once');
  lib.button(lib.row('Hello'), 'Edit').click();
  const field = lib.pane.querySelector('.lib-definition input[aria-label="Definition heading"]');
  assert(field, 'Edit opens the definition\'s own fields');
  field.value = 'New'; field.dispatchEvent(new lib.dom.window.Event('change'));
  assert.deepEqual(lib.sent.pop(), { action: 'update-master', id: 'm1', patch: { props: { heading: 'New', body: 'There' } } }, 'a definition edit updates the master -- every instance follows');
  console.log('PASS: one place inserts directly; Edit edits the definition.');
}
