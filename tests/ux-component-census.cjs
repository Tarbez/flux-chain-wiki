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

// 5. Regression (2026-10-19): a property access is not a class use. The literal tokenizer used to
//    split every token on dots, so `stage.title` inside a string-delimited span of
//    js/pages/lifecycle.js counted as a use of the step-family class .stage and the census
//    reported a rise no UI caused. Only a selector-shaped token ('.stage', 'div.card') names a class.
const os = require('node:os');
const path = require('node:path');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'census-fixture-'));
fs.mkdirSync(path.join(fixture, 'css'));
fs.mkdirSync(path.join(fixture, 'js', 'pages'), { recursive: true });
fs.writeFileSync(path.join(fixture, 'css', 'a.css'), '.stage{color:red}.card{color:blue}\n');
fs.writeFileSync(path.join(fixture, 'js', 'pages', 'p.js'), [
  "label(', id ? stage.title : ');",  // property access between two string delimiters: no use
  "find('.stage');",                   // selector: one use of .stage
  "el('div.card');",                   // tag.class: one use of .card
].join('\n'));
// 6. Regression (2026-10-19, W2-ADAPTER): a site rule over an Ark block is a per-page VARIANT of
//    a shared block, counted on its own (ark-overrides, ark-override-files) -- not a hand-built
//    family member (it read as two new "accordion" classes), and never invisible. A spec's
//    `block: 'tabs'` names a block, not a use of a .tabs class.
fs.writeFileSync(path.join(fixture, 'css', 'ark-blocks.css'), '.ark-disclosure:where(.ark-block){display:grid}.ark-disclosure__panel{width:100%}\n');
fs.writeFileSync(path.join(fixture, 'css', 'b.css'), '#x .ark-disclosure__panel{flex:1}#deck p{color:red}.tabs{display:grid}\n');
fs.writeFileSync(path.join(fixture, 'js', 'pages', 'q.js'), "ArkUI.page([{ block: 'tabs', id: 'deck', props: {} }]);\n" +
  // 7. Regression (2026-10-19, W3-STORY): a `was` map's refs name Ark parts, not classes.
  "var WAS = { 'deck': { \"eyebrow\": \"page:/div:1/p:1\", 'tabs-list': { key: 'page:/nav:2', self: true } } };\nfind('.eyebrow');\n");
fs.appendFileSync(path.join(fixture, 'css', 'a.css'), '.eyebrow{color:green}\n');
import(path.resolve('scripts/ux-component-census.mjs')).then(({ census }) => {
  const rows = census(fixture);
  const value = (measure, family) => rows.find((r) => r[0] === measure && r[1] === family)[2];
  assert.equal(value('uses', 'step'), 1, 'stage.title is a property access, not a use of .stage');
  assert.equal(value('uses', 'card'), 1, "'div.card' still counts as a use of .card");
  assert.equal(value('classes', 'accordion'), 0, 'an Ark class a site sheet adjusts is not a hand-built family member');
  assert.equal(value('ark-overrides', 'css'), 2, 'it is an override: the Ark class rule, and the rule on a block spec\'s id');
  assert.equal(value('ark-override-files', 'css'), 1);
  assert.equal(value('uses', 'tabs'), 0, "block: 'tabs' names a block, not a use of .tabs");
  assert.equal(value('uses', 'eyebrow'), 1, "a was ref (\"eyebrow\": \"page:/...\") names an Ark part, not a use of .eyebrow; find('.eyebrow') still counts");
  // 8. Regression (2026-10-19): --ratchet rewrote the baseline header from a template and dropped the
  //    hand-written notes that record WHY values were raised or are undercounted. Those notes are the
  //    evidence the frozen numbers rest on; a ratchet may lower data rows but must keep every comment.
  const { spawnSync: spawn } = require('node:child_process');
  const base = path.join(fixture, 'docs', 'ux-audit');
  fs.mkdirSync(base, { recursive: true });
  const censusBefore = census(fixture);
  const note = '# Raised by hand: a reason future readers must keep seeing.';
  fs.writeFileSync(path.join(base, 'component-census-baseline.tsv'), '# header line one\n' + note + '\nmeasure\tfamily\tvalue\n' +
    censusBefore.map(([m, f, v]) => m + '\t' + f + '\t' + (v === null ? '-' : (m === 'uses' && f === 'card' ? v + 1 : v))).join('\n') + '\n');
  const ratchet = spawn(process.execPath, [path.resolve('scripts/ux-component-census.mjs'), '--ratchet', '--only=card', '--site=' + fixture], { encoding: 'utf8' });
  const after = fs.readFileSync(path.join(base, 'component-census-baseline.tsv'), 'utf8');
  assert.ok(after.includes(note), '--ratchet keeps the baseline\'s comment lines verbatim:\n' + ratchet.stdout + ratchet.stderr);
  assert.match(after, /^uses\tcard\t1$/m, 'and still lowers the data row it was asked to (card uses 2 -> 1)');
  fs.rmSync(fixture, { recursive: true, force: true });
  console.log('ux component census ok: every family measured, nothing above the baseline, property access is not a class use, Ark overrides counted apart');
});

/* Regression (2026-10-20): `stat(?!e|us|ic)` counted "station" (a transit-map stop, .world-station) as a
   statistic, so a diagram of stations read as hand-built stat UI. A family is decided by what the
   name means, never by a substring it happens to contain. */
import('../scripts/ux-component-census.mjs').then(({ USE_FAMILIES }) => {
  assert(!USE_FAMILIES.stat.test('world-station') && !USE_FAMILIES.stat.test('mfig-stations'), 'station is not a stat');
  assert(USE_FAMILIES.stat.test('hero-stat') && USE_FAMILIES.stat.test('stats-grid'), 'stat and stats still count');
  console.log('PASS: the stat family does not count stations.');
});

/* Regressions (2026-10-20): the census measures what a rule styles and what a name means.
   - `rel = 'stylesheet'` (the per-route CSS loader) is not a modal sheet;
   - an Ark class inside :not()/:has() excludes Ark or reads its state, it does not restyle it. */
import('../scripts/ux-component-census.mjs').then(({ USE_FAMILIES }) => {
  assert(!USE_FAMILIES.modal.test('stylesheet') && USE_FAMILIES.modal.test('bottom-sheet') && USE_FAMILIES.modal.test('ark-dialog'), 'stylesheet is not a modal; a sheet or dialog still is');
  const styled = (sel) => sel.replace(/:(?:not|has)\((?:[^()]|\([^()]*\))*\)/g, '');
  assert(!/ark-term__trigger/.test(styled('#scene .x button:where(:not(.ark-term__trigger))')) && !/ark-popover/.test(styled('.ark-header:has(.ark-popover[data-state="open"])')) && /ark-btn/.test(styled('.page .ark-btn')), 'only the styled subject counts as an Ark override');
  console.log('PASS: the census does not count a stylesheet as a modal or an Ark exclusion as an override.');
});

