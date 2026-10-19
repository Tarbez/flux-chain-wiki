// The hand-built UI census (scripts/ux-component-census.mjs) is how each DEFXN polish wave proves it
// REDUCED duplication instead of adding a parallel copy (docs/ux-audit/components.md §0, §6).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

// 1. It runs, and every pattern family of the audit's §2 table is measured.
const run = spawnSync(process.execPath, ['scripts/ux-component-census.mjs', '--check'], { encoding: 'utf8' });
for (const family of ['hero', 'eyebrow', 'pill', 'button', 'card', 'stat', 'step', 'table', 'tabs', 'accordion', 'callout', 'sectionHead', 'breadcrumb', 'nextLinks', 'field', 'modal', 'empty']) {
  assert(new RegExp('^' + family + '\\s+\\d+', 'm').test(run.stdout), 'census measures ' + family);
}

// 2. No count rose above the recorded baseline. A wave that converts a page to Ark blocks must
//    delete the page-local classes it replaced; a count that rises means a parallel copy landed.
assert.equal(run.status, 0, 'census --check failed:\n' + run.stdout + run.stderr);

// 3. The baseline is TSV (AGENTS.md: no new JSON storage) and records "-" for families with no
//    signature definition: not measured is not zero.
const baseline = fs.readFileSync('docs/ux-audit/component-census-baseline.tsv', 'utf8');
assert(/^measure\tfamily\tvalue$/m.test(baseline), 'baseline has a measure/family/value header');
assert(/^signatures\tbutton\t-$/m.test(baseline), 'an unmeasured signature family is "-", never 0');

// 4. The baseline cannot be regenerated over itself: --init-baseline refuses when one exists.
const init = spawnSync(process.execPath, ['scripts/ux-component-census.mjs', '--init-baseline'], { encoding: 'utf8' });
assert.notEqual(init.status, 0, '--init-baseline must refuse to overwrite the frozen baseline');

console.log('ux component census ok: every family measured, nothing above the baseline');
