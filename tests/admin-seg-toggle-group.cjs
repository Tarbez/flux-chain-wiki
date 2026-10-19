'use strict';
/* Every segmented control in the editor (ctlSegField, js/admin/controls.js) is Ark's toggle group
   (ArkKit.createArkToggleGroup on a light-DOM host) -- docs/ux-audit/cms.md (c): the editor had
   five hand-made segmented controls, each with its own pressed state and none with keyboard
   support beyond Tab through every choice. Each case names the defect it exists to catch.
   Runs the real builders (cut from the editor source) in jsdom with the real ArkKit. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const { buildersSource } = require('./lib/admin-source.cjs');

const dom = new JSDOM('<body></body>', { runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window, doc = w.document;
w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
for (const file of ['js/ark/vendor/engines.js', 'js/ark/vendor/ark-kit.js']) w.eval(fs.readFileSync(file, 'utf8'));
w.eval(buildersSource());

const make = (value) => {
  const wrote = [], store = { v: value };
  const ctx = { get: () => store.v, set: (_k, v) => { wrote.push(v); store.v = v; } };
  const row = w.ctlSegField(ctx, 'Align', 'align', ['left', 'center', 'right'], null);
  doc.body.appendChild(row);
  return { row, wrote, seg: row.querySelector('.ctl-seg'), buttons: [...row.querySelectorAll('.ctl-seg button')] };
};
const key = (el, k) => el.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

{
  const t = make('center');
  assert.equal(t.seg.getAttribute('data-ark-part'), 'toggle-group', 'the segmented control is Ark\'s toggle group');
  assert.deepEqual(t.buttons.map((b) => b.getAttribute('aria-pressed')), ['false', 'true', 'false'], 'the current value is the pressed choice');
  assert.deepEqual(t.buttons.map((b) => b.tabIndex), [-1, 0, -1], 'one tab stop: the pressed choice (the old control was three)');
  assert.deepEqual(t.wrote, [], 'drawing the control writes nothing (Ark reports its starting selection; that is not a choice)');
  t.buttons[2].click();
  assert.deepEqual(t.wrote, ['right'], 'a click writes its value');
  assert.equal(t.buttons[2].getAttribute('aria-pressed'), 'true');
  t.buttons[2].click();
  assert.deepEqual(t.wrote, ['right'], 'clicking the pressed choice writes nothing again');
  t.buttons[2].focus(); key(t.buttons[2], 'ArrowLeft');
  assert.equal(doc.activeElement, t.buttons[1], 'arrows move between the choices');
  key(t.buttons[1], 'Enter');
  assert.deepEqual(t.wrote, ['right', 'center'], 'Enter picks the focused choice');
  console.log('PASS: a segmented control is one tab stop, arrows move, click/Enter write the value once.');
}
{
  const t = make(undefined);
  assert.deepEqual(t.buttons.map((b) => b.getAttribute('aria-pressed')), ['false', 'false', 'false'], 'no value: nothing is pressed (absent is not the first choice)');
  t.buttons[0].click();
  assert.deepEqual(t.wrote, ['left']);
}
{
  /* Ark's own contract (BLOCKS.md "The light-DOM host"): aria-selected only on roles that support
     it. A role="button" toggle carries aria-pressed; aria-selected on it is invalid ARIA and is
     announced inconsistently. Reported to Ark 2026-10-19 (W2-LIBRARY). */
  const t = make('left');
  const bad = t.buttons.filter((b) => b.getAttribute('role') === 'button' && b.hasAttribute('aria-selected'));
  assert.deepEqual(bad.map((b) => b.textContent), [], 'no role="button" choice carries aria-selected');
  console.log('PASS: the toggle group writes only ARIA its roles allow.');
}
{
  /* without the kit (a page or test that loads only the builders) the control still works by click */
  const bare = new JSDOM('<body></body>', { runScripts: 'outside-only' }).window;
  bare.eval(buildersSource());
  const wrote = [];
  const row = bare.ctlSegField({ get: () => 'left', set: (_k, v) => wrote.push(v) }, 'Align', 'align', ['left', 'center'], null);
  row.querySelectorAll('button')[1].click();
  assert.deepEqual(wrote, ['center']);
  console.log('PASS: without ArkKit the same control works by click.');
}
