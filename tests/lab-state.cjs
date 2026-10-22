'use strict';
/* run-tests-timeout-ms: 300000 -- three jsdom boots of the real site. */
/* /experiments: the interactive model keeps its state in the address (js/studio.js; DEFXN polish
   Wave 4, S8). Run alone (owner test law).

   Named regressions:
   - /experiments and /experiments/lab were merged (js/pages/catalog.js, alias), but js/studio.js
     still wrote and read the model's state only at /experiments/lab: touching a study on the
     canonical page rewrote the address to the alias, and /experiments?model=rhythm&value=80
     restored nothing (docs/ux-audit/ledger.md P3 residual). The state is written to the page's
     own catalog path and restored from it and from every old address.
   - The three studies were a hand-built group of aria-pressed buttons; they are Ark's `choice`
     (one stage and one slider re-drawn, so not tabs: a tab owns a panel). A pick moves the model
     and the address; the picker's checked radio follows the address. */
const assert = require('node:assert/strict');
const continuity = require('./lib/layout-continuity.cjs');

const only = process.argv.slice(2);
const tick = (window, ms = 30) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function state(route, drive) {
  const { extra } = await continuity.pageKeys(route, { inspect: async (window) => {
    const { document } = window;
    const read = () => {
      const checked = document.querySelector('.study-tabs input[type="radio"]:checked');
      return { path: window.location.pathname, search: window.location.search, mode: checked && checked.value, range: document.getElementById('variable').value,
        /* the study's question is the model's own heading (#study-title); since 2026-10-22 the h1 stays the page's name
           (first-visit audit, P1: the h1 was rewritten to each study's question, so the page's name changed three times) */
        title: document.getElementById('study-title').textContent, h1: document.getElementById('experiments-title').textContent, corner: document.querySelector('.stage-corner').textContent };
    };
    const first = read();
    const later = drive ? await drive(window, document, read, tick) : null;
    return { first, later, radios: document.querySelectorAll('.study-tabs input[type="radio"]').length, oldButtons: document.querySelectorAll('.study-tabs button, [data-study]').length,
      group: (document.querySelector('.study-tabs [data-ark-block="choice"]') || {}).tagName, pressed: document.querySelectorAll('.lab [aria-pressed]').length };
  } });
  return extra;
}

(async () => {
  if (!only.length || only.includes('/experiments')) {
    /* the canonical address restores the state */
    const a = await state('/experiments?model=rhythm&value=80', async (window, document, read) => {
      document.querySelector('.study-tabs input[value="depth"]').click(); await tick(window);
      const picked = read();
      const range = document.getElementById('variable'); range.value = '20'; range.dispatchEvent(new window.Event('input', { bubbles: true })); await tick(window);
      return { picked, moved: read() };
    });
    assert.equal(a.first.mode, 'rhythm', 'the canonical link picks its study');
    assert.equal(a.first.range, '80', 'and its value');
    assert.equal(a.first.path, '/experiments', 'and stays on the canonical address');
    assert(/^How can one agreement lifecycle be pictured\?$/.test(a.first.title), 'the model names the study the address asked for: ' + a.first.title);
    assert.equal(a.first.h1, a.later.picked.h1, 'the page heading stays the page\'s name whichever study is picked');
    assert(/^Interactive model/.test(a.first.h1), 'the page heading names the page as the menu does: ' + a.first.h1);
    assert.equal(a.radios, 3, 'the studies are three radios of one Ark choice');
    assert.equal(a.oldButtons, 0, 'no hand-built study button is left');
    assert.equal(a.pressed, 0, 'and no aria-pressed group');
    assert.equal(a.group, 'FIELDSET', 'the picker is Ark\'s choice (a fieldset of radios)');
    assert.equal(a.later.picked.mode, 'depth', 'a pick moves the model');
    assert.equal(a.later.picked.path, '/experiments', 'and the address stays /experiments (it used to be rewritten to /experiments/lab)');
    assert(/Figure 3 of 3/.test(a.later.picked.corner), 'the stage follows: ' + a.later.picked.corner);
    assert.equal(a.later.moved.search, '?model=depth&value=20', 'the slider writes the state: ' + a.later.moved.search);
    assert.equal(a.later.moved.path, '/experiments');
  }
  if (!only.length || only.includes('/experiments/lab')) {
    /* the old address still restores, and the first change moves it to the canonical one */
    const b = await state('/experiments/lab?model=depth&value=10', async (window, document, read) => {
      const range = document.getElementById('variable'); range.value = '35'; range.dispatchEvent(new window.Event('input', { bubbles: true })); await tick(window);
      return { moved: read() };
    });
    assert.equal(b.first.mode, 'depth', 'the old address picks its study');
    assert.equal(b.first.range, '10', 'and its value');
    assert.equal(b.later.moved.path, '/experiments', 'touching the model moves the address to the canonical page');
    assert.equal(b.later.moved.search, '?model=depth&value=35');
  }
  console.log('PASS: the model\'s state lives at /experiments (and is restored from the old address), and its studies are one Ark choice.');
})().catch((error) => { console.error(error); process.exit(1); });
