'use strict';
/* The contextual toolbar's SHELL (owner request 2026-10-18: "redesign into horizontal bar with
   icons and those become popovers"). The old shell stacked every section as an accordion row
   -- up to 580px tall -- and covered the page it edited. This runs the real shell code from
   js/admin/admin.js (toolbarSection / setToolbarSection / renderSelToolbar / placeToolbarPop
   and their listeners) in jsdom, with stub section builders, and pins its behaviour:
     - one icon per section, named for screen readers and with a tooltip; actions after them
     - ONE popover: opening another closes the first, the same icon closes it, as do Esc and
       an outside click; focus goes into the popover and comes back to its icon
     - a re-render (every control edit re-renders) keeps the popover open and keeps the
       focused field and its uncommitted typed value -- it must never drop input mid-typing
     - selecting something else closes it; the preview's right-click menu only hides it
     - identity sections (States, Component instance) carry a mark and open by themselves
       when the group/instance was just created -- even when the new selection arrives after
       the "created" message -- and a stale request never opens on a later selection
     - one roving tab stop; arrows / Home / End walk the bar
   The real builders and the real preview are driven by tests/browser/toolbar-popovers.mjs. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const admin = fs.readFileSync('js/admin/admin.js', 'utf8');
const start = admin.indexOf('  const TB_IDENTITY = {'), end = admin.indexOf("  let libKey = '';", start);
assert(start >= 0 && end > start, 'js/admin/admin.js still declares the toolbar shell (TB_IDENTITY ... renderSelToolbar ... its listeners) before libKey');
const code = admin.slice(start, end);

const BUILDERS = {
  buildTypographySection: ['cms-type', 'Typography', 'type'],
  buildFillSection: ['cms-fill', 'Fill and border', 'fill'],
  buildSpacingSection: ['cms-spacing', 'Spacing', 'spacing'],
  buildFrameSection: ['cms-frame', 'Frame', 'move'],
  buildLayoutSection: ['cms-layout', 'Layout', 'grid'],
  buildSizeSection: ['cms-size', 'Size', 'size'],
  buildEffectsSection: ['cms-effects', 'Effects', 'sparkle'],
  buildAltTextSection: ['cms-alt', 'Alt text', 'image'],
  buildComponentInstanceSection: ['cms-component', 'Component instance', 'comp'],
  buildStateGroupSection: ['cms-states', 'States (2)', 'repeat'],
  buildElementMotionSection: ['cms-element-motion', 'In / out animation', 'play'],
};

function setup() {
  const dom = new JSDOM('<body><div id="studioRoot"><div id="stage"><div id="selToolbar" hidden></div></div><div id="selToolbarPop" hidden></div><p id="elsewhere">elsewhere</p></div><iframe id="cmsPreview"></iframe><button id="btnContentCms"></button></body>');
  const w = dom.window, doc = w.document;
  const calls = [];
  const ctx = {
    window: w, document: doc, innerWidth: 1280, innerHeight: 900, setTimeout, Date,
    $: (id) => doc.getElementById(id),
    ic: (name) => `<svg class="ic"><use href="#i-${name}"/></svg>`,
    CMS_TAG_ICON: { p: 'text', div: 'box', a: 'link' }, DEVICES: [['Desktop'], ['Tablet']], device: 0,
    cmsExactSelection: null, cmsExactSelections: [], cmsContextMenuOpen: false, cmsConnected: true,
    cmsPreview: doc.getElementById('cmsPreview'),
    selToolbarVisible: () => !ctx.live && !ctx.cmsContextMenuOpen && !!(ctx.cmsExactSelection && ctx.cmsExactSelection.key),
    selToolbarKind: (s) => s.key.indexOf('group:') === 0 ? 'group' : s.tag === 'p' || s.tag === 'a' ? 'text' : 'container',
    cmsTreeRowForKey: () => ({ tag: ctx.cmsExactSelection.tag }),
    makeFrameCtx: () => ({ get: () => 0, set() {} }),
    placeSelToolbar: () => ctx.placeToolbarPop(),
    postCmsLayoutOperation: (op) => calls.push('layout:' + op),
    selectDesign: () => calls.push('design'),
    live: false,
  };
  for (const [name, [key, title, icon]] of Object.entries(BUILDERS)) {
    ctx[name] = (pane) => {
      const body = ctx.toolbarSection(pane, key, title, icon);
      const input = doc.createElement('input'); input.setAttribute('aria-label', title + ' field'); body.appendChild(input);
      const button = doc.createElement('button'); button.type = 'button'; button.textContent = title + ' action'; body.appendChild(button);
    };
  }
  vm.createContext(ctx);
  vm.runInContext(code + '\nthis.tb = () => ({ tbOpen, tbOpenKey, tbAutoOpen }); this.setAutoOpen = (v) => { tbAutoOpen = v; };', ctx);
  const bar = doc.getElementById('selToolbar'), pop = doc.getElementById('selToolbarPop');
  const select = (sel) => { ctx.cmsExactSelection = sel; ctx.cmsExactSelections = sel ? [sel] : []; ctx.renderSelToolbar(); };
  const button = (name) => bar.querySelector(`[data-name="${name}"]`);
  const names = () => [...bar.querySelectorAll('[data-section]')].map((b) => b.dataset.name);
  const actions = () => [...bar.querySelectorAll('[data-action]')].map((b) => b.getAttribute('aria-label'));
  const expanded = () => [...bar.querySelectorAll('[aria-expanded="true"]')].map((b) => b.dataset.name);
  const key = (k) => (doc.activeElement || doc.body).dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true }));
  return { ctx, w, doc, bar, pop, calls, select, button, names, actions, expanded, key };
}
const P = { key: 'path:p:1', label: 'p', tag: 'p' };

/* the bar: one icon per section, named, with tooltips; then the actions */
{
  const t = setup();
  t.select(null);
  assert(t.bar.hidden && t.pop.hidden, 'nothing selected: no bar, no popover');
  t.select(P);
  assert(!t.bar.hidden && t.pop.hidden, 'a selection shows the bar with every popover closed');
  assert.deepEqual(t.names(), ['Typography', 'Fill and border', 'Spacing', 'Frame', 'In / out animation'], 'a text element gets the text sections, in the taxonomy\'s order');
  assert.deepEqual(t.actions(), ['Make into component', 'Open in Content', 'Theme & defaults'], 'then the actions');
  for (const b of t.bar.querySelectorAll('button')) {
    assert(b.getAttribute('aria-label'), 'every bar button has a name a screen reader reads');
    assert(b.dataset.tip, 'every bar button has a tooltip');
    assert(b.querySelector('svg use'), 'every bar button is an icon from the shared sprite');
  }
  assert.equal(t.bar.querySelector('.tb-chip-name').textContent, 'p', 'the chip names the element');
  assert.equal(t.bar.dataset.key, P.key, 'the bar says which key it edits');
  assert.equal([...t.bar.querySelectorAll('button')].filter((b) => b.tabIndex === 0).length, 1, 'one roving tab stop');
  console.log('PASS: the bar shows one named icon per section, then the actions, with one tab stop.');
}

/* one popover: open, switch, toggle closed; focus in and back */
{
  const t = setup();
  t.select(P);
  t.button('Typography').click();
  assert(!t.pop.hidden, 'clicking an icon opens its popover');
  assert.equal(t.pop.getAttribute('aria-label'), 'Typography', 'the popover is labelled with its section');
  assert.deepEqual(t.expanded(), ['Typography'], 'its icon shows pressed');
  assert(t.pop.contains(t.doc.activeElement) && t.doc.activeElement.getAttribute('aria-label') === 'Typography field', 'focus moves to the first control in the popover');
  assert(t.pop.querySelector('[aria-label="Typography field"]') && !t.pop.querySelector('[aria-label="Spacing field"]'), 'the popover holds that section\'s controls only');
  t.button('Fill and border').click();
  assert.deepEqual(t.expanded(), ['Fill and border'], 'opening another section closes the first: one popover at a time');
  assert.equal(t.doc.querySelectorAll('#selToolbarPop').length, 1);
  assert(t.pop.querySelector('[aria-label="Fill and border field"]') && !t.pop.querySelector('[aria-label="Typography field"]'), 'the popover now holds the other section');
  t.button('Fill and border').click();
  assert(t.pop.hidden && t.expanded().length === 0, 'clicking the same icon closes it');
  assert.equal(t.doc.activeElement.dataset.name, 'Fill and border', 'focus goes back to the icon');
  console.log('PASS: one popover at a time; the same icon closes it; focus goes in and comes back.');
}

/* Esc, outside click, close button */
{
  const t = setup();
  t.select(P);
  t.button('Frame').click();
  t.key('Escape');
  assert(t.pop.hidden, 'Esc closes the popover');
  assert.equal(t.doc.activeElement.dataset.name, 'Frame', 'Esc puts focus back on the icon');
  t.button('Frame').click();
  t.doc.getElementById('elsewhere').dispatchEvent(new t.w.Event('pointerdown', { bubbles: true }));
  assert(t.pop.hidden, 'a pointerdown outside the bar and the popover closes it');
  t.button('Frame').click();
  t.pop.querySelector('input').dispatchEvent(new t.w.Event('pointerdown', { bubbles: true }));
  assert(!t.pop.hidden, 'a pointerdown inside the popover keeps it');
  t.pop.querySelector('.tb-pop-x').click();
  assert(t.pop.hidden, 'the close button closes it');
  console.log('PASS: Esc, an outside click and the close button each close the popover.');
}

/* re-render while typing: the popover stays, focus and the typed value survive */
{
  const t = setup();
  t.select(P);
  t.button('Frame').click();
  const field = t.pop.querySelector('[aria-label="Frame field"]');
  field.focus(); field.value = 'typed, not committed';
  t.ctx.renderSelToolbar();
  const again = t.pop.querySelector('[aria-label="Frame field"]');
  assert(!t.pop.hidden && t.expanded()[0] === 'Frame', 'a re-render keeps the popover open');
  assert(again !== field, 'the popover really was rebuilt (the case being tested)');
  assert.equal(t.doc.activeElement, again, 'focus is back in the same field');
  assert.equal(again.value, 'typed, not committed', 'the uncommitted typed value survives the rebuild');
  t.select(Object.assign({}, P, { key: 'path:p:2' }));
  assert(t.pop.hidden, 'selecting something else closes the popover');
  console.log('PASS: a re-render keeps the popover, the focus and the typed value; a new selection closes it.');
}

/* the preview's right-click menu hides it (and gives it back); Live ends it */
{
  const t = setup();
  t.select(P);
  t.button('Spacing').click();
  t.ctx.cmsContextMenuOpen = true; t.ctx.renderSelToolbar();
  assert(t.bar.hidden && t.pop.hidden, 'while the preview\'s menu is open neither the bar nor the popover covers it');
  t.ctx.cmsContextMenuOpen = false; t.ctx.renderSelToolbar();
  assert(!t.pop.hidden && t.expanded()[0] === 'Spacing', 'the menu closing gives the popover back');
  t.ctx.live = true; t.ctx.renderSelToolbar();
  t.ctx.live = false; t.ctx.renderSelToolbar();
  assert(t.pop.hidden, 'leaving the editing view (Live) ends the popover instead of resurrecting it later');
  console.log('PASS: the right-click menu only hides the toolbar; Live closes the popover.');
}

/* identity sections: marked; open by themselves when just created */
{
  const t = setup();
  const INST = { key: 'path:div:9', label: 'div', tag: 'div', component: { masterId: 'm1', anchorId: 'a', key: 'i1' } };
  t.select(INST);
  assert(t.button('Component instance').classList.contains('identity'), 'the Component instance icon carries the identity mark');
  assert(!t.button('Frame').classList.contains('identity'), 'a property section does not');
  assert(t.pop.hidden, 'selecting an existing instance opens nothing by itself');
  t.ctx.setAutoOpen({ key: 'cms-component', at: Date.now() });
  t.ctx.renderSelToolbar();
  assert.deepEqual(t.expanded(), ['Component instance'], 'a just-made instance opens its section');
  assert(t.bar.contains(t.doc.activeElement) === false && t.pop.contains(t.doc.activeElement) === false, 'opening by itself does not pull focus out of where the person is working');

  /* "Make into states": the created message can arrive before the selection that has the group */
  const t2 = setup();
  t2.select(P);
  t2.ctx.setAutoOpen({ key: 'cms-states', at: Date.now() });
  t2.ctx.renderSelToolbar();
  assert(t2.pop.hidden, 'no States section yet: nothing opens');
  assert(t2.ctx.tb().tbAutoOpen, 'the request waits for the selection that has the group');
  t2.select(Object.assign({}, P, { stateGroup: { groupId: 'g1' } }));
  assert.deepEqual(t2.expanded(), ['States'], 'States opens as soon as the group\'s selection arrives');
  assert(t2.button('States').classList.contains('identity'), 'the States icon carries the identity mark');
  assert.equal(t2.button('States').querySelector('.tb-count').textContent, '2', 'the States icon counts the states');
  assert.equal(t2.ctx.tb().tbAutoOpen, null, 'the request is used up');
  t2.button('States').click();
  t2.select(Object.assign({}, P, { key: 'path:p:5', stateGroup: { groupId: 'g2' } }));
  assert(t2.pop.hidden, 'a later state group does not reopen States on its own');

  /* a stale request never opens on a later selection */
  const t3 = setup();
  t3.ctx.setAutoOpen({ key: 'cms-states', at: Date.now() - 6000 });
  t3.select(Object.assign({}, P, { stateGroup: { groupId: 'g1' } }));
  assert(t3.pop.hidden, 'a request older than a few seconds is dropped');
  console.log('PASS: identity sections are marked and open by themselves only when just created.');
}

/* keyboard: arrows, Home, End walk one roving stop; group: Ungroup is an action */
{
  const t = setup();
  t.select(P);
  t.button('Typography').focus();
  t.key('ArrowRight');
  assert.equal(t.doc.activeElement.dataset.name, 'Fill and border', 'ArrowRight moves to the next icon');
  t.key('ArrowLeft'); t.key('ArrowLeft');
  assert.equal(t.doc.activeElement.getAttribute('aria-label'), 'Theme & defaults', 'ArrowLeft from the first wraps to the last');
  t.key('Home');
  assert.equal(t.doc.activeElement.dataset.name, 'Typography', 'Home goes to the first');
  t.key('End');
  assert.equal(t.doc.activeElement.getAttribute('aria-label'), 'Theme & defaults', 'End goes to the last');
  assert.equal([...t.bar.querySelectorAll('button')].filter((b) => b.tabIndex === 0).length, 1, 'still one tab stop');
  assert.equal(t.doc.activeElement.tabIndex, 0, 'the tab stop follows focus');
  t.ctx.renderSelToolbar();
  assert.equal(t.doc.activeElement.getAttribute('aria-label'), 'Theme & defaults', 'a re-render keeps focus on the same bar button');

  const g = setup();
  g.select({ key: 'group:abc', label: 'Group', tag: '' });
  assert.deepEqual(g.names(), ['Frame'], 'a layout group shows Frame only');
  assert.deepEqual(g.actions(), ['Ungroup', 'Make into component', 'Open in Content', 'Theme & defaults'], 'Ungroup is an action in the bar');
  g.bar.querySelector('[data-action="ungroup"]').click();
  assert.deepEqual(g.calls, ['layout:ungroup'], 'Ungroup posts the ungroup operation');
  console.log('PASS: arrows/Home/End walk the bar with one tab stop; a group\'s Ungroup is a bar action.');
}

/* no accordion shell left behind for the toolbar */
{
  assert(!/accordion\(pane, 'cms-/.test(admin), 'no toolbar section is built as an accordion any more');
  const builders = [...admin.matchAll(/function (build\w+Section)\([^)]*\) \{\n([\s\S]*?)\n  \}\n/g)];
  assert(builders.length >= Object.keys(BUILDERS).length, 'found ' + builders.length + ' section builders');
  for (const m of builders) assert(m[2].includes('toolbarSection(pane, '), `${m[1]}() asks the shell for its body`);
  const css = fs.readFileSync('css/studio-embed.css', 'utf8');
  assert(!/\.ins-head|\.elhead/.test(admin + css), 'the old toolbar header chip markup and styles are gone');
  assert(!admin.includes("openGroups.add('cms-states')") && !admin.includes("openGroups.add('cms-component')"), 'identity sections no longer ride on the accordion open-set');
  console.log('PASS: the accordion shell is gone from the toolbar.');
}
