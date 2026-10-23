'use strict';
/* run-tests-timeout-ms: 300000 -- one jsdom boot of the real site. */
/* /deposits: the draft form is Ark's `form` block, and keeps what the hand-built one did (DEFXN
   polish Wave 4, W4-S14). Run alone (owner test law).

   Named regressions:
   - The purpose list was a native <select> with the browser's own arrow (docs/ux-audit/ledger.md
     /deposits P2): it is Ark's select field in Ark's form, so no native control sits outside it.
   - An amount that was missing or not above zero moved focus and said nothing; the form refuses
     in words beside the field (what failed, what it needs, how to fix it) and keeps the result
     hidden. Decimal amounts stay valid: Ark's number field takes only a numeric step, so the
     page sets the browser's "no step" (any) on it; without that 12.5 would be refused.
   - A valid draft still shows only the local result (nothing is posted), and "Edit draft" returns
     to the form with the amount still in it. */
const assert = require('node:assert/strict');
const continuity = require('./lib/layout-continuity.cjs');

const tick = (window, ms = 30) => new Promise((resolve) => window.setTimeout(resolve, ms));

(async () => {
  const { extra } = await continuity.pageKeys('/deposits', { inspect: async (window) => {
    const { document } = window;
    const form = document.querySelector('form.ark-form');
    const amount = form.querySelector('[name="amount"]'), purpose = form.querySelector('[name="purpose"]');
    const result = document.querySelector('.economy-deposit-result');
    const submit = () => form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    const error = () => form.querySelector('.ark-field__error').textContent.replace(/\s+/g, ' ').trim();
    const out = { native: document.querySelectorAll('select:not(.ark-field__control)').length, step: amount.getAttribute('step'), options: [...purpose.options].map((o) => o.value), posted: false };
    form.addEventListener('submit', (event) => { out.posted = out.posted || !event.defaultPrevented; }, { once: false });
    // 1. nothing entered
    submit(); await tick(window);
    out.empty = { error: error(), invalid: amount.getAttribute('aria-invalid'), resultHidden: result.hidden, focused: document.activeElement === amount };
    // 2. zero is below the smallest
    amount.value = '0'; submit(); await tick(window);
    out.zero = { error: error(), resultHidden: result.hidden };
    // 3. a decimal amount is a deposit
    amount.value = '12.5'; purpose.value = 'service'; amount.dispatchEvent(new window.Event('input', { bubbles: true }));
    out.cleared = error();
    submit(); await tick(window);
    out.ok = { resultHidden: result.hidden, formHidden: form.hidden, facts: [...result.querySelectorAll('dd')].map((d) => d.textContent), focusedHeading: document.activeElement === result.querySelector('h2') };
    // 4. edit again
    result.querySelector('[data-action="deposit-edit"]').click(); await tick(window);
    out.edit = { formHidden: form.hidden, resultHidden: result.hidden, kept: amount.value, focused: document.activeElement === amount };
    return JSON.parse(JSON.stringify(out));
  } });
  assert.equal(extra.native, 0, 'no native select outside Ark\'s field');
  assert.deepEqual(extra.options, ['reserve', 'service', 'review'], 'the three purposes are the three options');
  assert.equal(extra.step, 'any', 'a decimal amount is allowed (the browser\'s "no step")');
  assert(/missing/.test(extra.empty.error) && /Needs: a value/.test(extra.empty.error) && /Fix:/.test(extra.empty.error), 'an empty amount is refused in words: ' + extra.empty.error);
  assert.equal(extra.empty.invalid, 'true');
  assert(extra.empty.resultHidden && extra.empty.focused, 'the result stays hidden and focus moves to the amount');
  assert(/below 0\.01/.test(extra.zero.error) && extra.zero.resultHidden, 'an amount of zero is refused as below the smallest: ' + extra.zero.error);
  assert.equal(extra.cleared, '', 'editing the amount clears the form\'s own refusal');
  assert.equal(extra.ok.resultHidden, false, 'a valid draft shows the local result');
  assert.equal(extra.ok.formHidden, true);
  assert(extra.ok.focusedHeading, 'focus moves to the result\'s heading');
  assert.deepEqual(extra.ok.facts, ['FXN / Tier 1', '12.5 FXN', 'Fund a service agreement', 'Not selected', 'Local mock draft'], 'the facts are the draft\'s');
  assert.equal(extra.posted, false, 'nothing is posted');
  assert(!extra.edit.formHidden && extra.edit.resultHidden && extra.edit.kept === '12.5' && extra.edit.focused, '"Edit draft" returns to the form with the amount kept');
  console.log('PASS: /deposits\' draft is Ark\'s form: its select, its refusals, its result, and Edit draft.');
})().catch((error) => { console.error(error); process.exit(1); });
