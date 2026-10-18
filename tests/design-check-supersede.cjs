'use strict';
/* A Design check reading is never empty because another run started.
   Why this exists: measureChecks() (js/admin/design-check.js) numbers its runs and drops one that
   a newer run superseded -- but it handed that dropped run's CALLER lastChecks as they stood,
   which on a fresh page is []. The preview's ready message starts a run (queueCheck) while
   ArkAdminApp.designCheck()'s run is still settling, so the first reading of a page came back
   "0/0, settled" (tests/browser/design-check-stable.mjs failed twice the same way). A superseded
   caller now gets the reading of the run that superseded it.
   Runs the real measureChecks() from the editor source with previewSettled()/runChecks() stubbed,
   so the order of the two runs is decided here, not by timing. */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { ADMIN } = require('./lib/admin-source.cjs');

const start = ADMIN.indexOf('  let lastChecks = [], checkRun = 0');
const end = ADMIN.indexOf('  function runChecks() {', start);
assert(start >= 0 && end > start, 'js/admin/design-check.js still declares the run counter right before measureChecks() and runChecks()');
const code = ADMIN.slice(start, end);

function setup() {
  const settles = [];   /* one resolver per previewSettled() call, in call order */
  let measured = 0;
  const context = {
    state: { lastChecksSettled: true, popAnchor: null }, $: () => null, refreshPop() {},
    previewSettled: () => new Promise((resolve) => settles.push(resolve)),
    runChecks: () => { measured += 1; context.setChecks([{ title: 'rule ' + measured, status: 'pass' }]); },
  };
  vm.createContext(context);
  vm.runInContext(code + '\nthis.measureChecks = measureChecks; this.setChecks = (v) => { lastChecks = v; };', context);
  return { context, settles, measured: () => measured };
}
const flush = () => new Promise((r) => setImmediate(r));

(async () => {
  /* the defect: the caller's run is superseded before it settles */
  {
    const t = setup();
    const caller = t.context.measureChecks();          /* ArkAdminApp.designCheck() */
    const newer = t.context.measureChecks();           /* the preview's ready -> queueCheck() */
    t.settles[0](true); await flush();                 /* the caller's run settles first: superseded */
    t.settles[1](true);
    const [a, b] = await Promise.all([caller, newer]);
    assert.equal(a.length, 1, 'the superseded caller gets a reading, not the empty one lastChecks held before any run finished');
    assert.deepEqual(a, b, 'and it is the newer run\'s reading');
    assert.equal(t.measured(), 1, 'only the newest run measured');
  }
  /* the newer run settles first; the older one, finishing late, still reports the newer reading */
  {
    const t = setup();
    const caller = t.context.measureChecks();
    const newer = t.context.measureChecks();
    t.settles[1](true); await flush();
    t.settles[0](false);
    const [a, b] = await Promise.all([caller, newer]);
    assert.deepEqual(a, b, 'a late superseded run returns the newest reading');
    assert.equal(t.context.state.lastChecksSettled, true, 'and does not overwrite whether that reading was settled');
    assert.equal(t.measured(), 1);
  }
  /* three in a row: every caller gets the last run's reading */
  {
    const t = setup();
    const runs = [t.context.measureChecks(), t.context.measureChecks(), t.context.measureChecks()];
    t.settles.forEach((resolve) => resolve(true));
    const readings = await Promise.all(runs);
    assert(readings.every((r) => r.length === 1 && r[0].title === 'rule 1'), 'a chain of superseded runs all resolve to the newest one');
    assert.equal(t.measured(), 1);
  }
  /* an unsuperseded run is unchanged */
  {
    const t = setup();
    const only = t.context.measureChecks();
    t.settles[0](false);
    assert.equal((await only).length, 1);
    assert.equal(t.context.state.lastChecksSettled, false, 'a lone run records whether the page had settled');
  }
  console.log('PASS: a Design check caller whose run was superseded gets the newer run\'s reading, never an empty one.');
})().catch((error) => { console.error(error); process.exit(1); });
