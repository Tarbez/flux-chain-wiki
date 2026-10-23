'use strict';
/* /explore polish (DEFXN UX audit, W4-S3, 2026-10-20). Named regressions, each with its reason:
   - the live-kind tile read "1 MINERS": the count was joined to a plural noun typed in a table
     (js/pages/explorer.js). One plural rule now derives the singular from that plural.
   - the kind tiles and the controls beside them were drawn on --border-default (about 1.5:1 on
     the card), so a tile was not seen as pressable (WCAG 1.4.11 asks 3:1 of a control's edge):
     they use --border-control, which every theme defines at 3:1 or more.
   - captions were set at 8-11px (the mono labels at 9.5px and 8px): nothing on /explore or in
     the shared how-overview card is below 12px, and the size follows the SDK type scale.
   Run alone (owner test law). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const explorer = fs.readFileSync('js/pages/explorer.js', 'utf8');
const story = fs.readFileSync('css/explore-story.css', 'utf8');
const overview = fs.readFileSync('css/how-overview.css', 'utf8');

/* ---- the plural rule, taken from the page's own source (never a copy typed here) ---- */
const grab = (name) => {
  const start = explorer.indexOf('function ' + name + '(');
  assert(start > 0, 'explorer.js defines ' + name);
  let depth = 0, i = explorer.indexOf('{', start);
  for (let j = i; j < explorer.length; j++) {
    if (explorer[j] === '{') depth++;
    if (explorer[j] === '}' && --depth === 0) return explorer.slice(start, j + 1);
  }
  throw new Error('unterminated ' + name);
};
const rule = vm.runInNewContext(grab('singular') + '\n' + grab('countPhrase') + '\n({ singular, countPhrase })');
assert.equal(rule.countPhrase(1, false, 'miners'), '1 miner', 'exactly one miner is singular (it read "1 MINERS")');
assert.equal(rule.countPhrase(2, false, 'miners'), '2 miners');
assert.equal(rule.countPhrase(0, false, 'miners'), '0 miners', 'zero is plural');
assert.equal(rule.countPhrase(1, false, 'identities'), '1 identity', '-ies derives -y');
assert.equal(rule.countPhrase(1, false, 'publications'), '1 publication');
assert.equal(rule.countPhrase(1, true, 'networks'), '1+ networks', 'a capped count means "at least", so it stays plural');
assert.equal(rule.countPhrase(100, true, 'documents'), '100+ documents');
assert.equal(rule.singular('presence'), 'presence', 'a word with no plural ending is left alone');
assert.equal(rule.singular('address'), 'address', '-ss is not a plural');
assert(!/r\.count \+ \(r\.capped/.test(explorer), 'the tile no longer joins a count to a noun by hand');

/* ---- control edges ---- */
const rules = (css) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1].trim(), body: m[2] }));
const kind = rules(story).find((r) => /\.explore-kind$/.test(r.selector));
assert(kind && /border:1px solid hsl\(var\(--border-control\)\)/.test(kind.body), 'the kind tile is drawn on --border-control');
/* the phone's two-card switch is Ark's segmented tabs since 2026-10-21 (ledger recheck X5 / CP-6): its edge is the one
   segmented-tab rule in css/components.css, on --border-control, not a page rule */
assert(/segmented[^{]*\[aria-selected="true"\][^{]*\{[^}]*--border-control/.test(fs.readFileSync('css/components.css', 'utf8')), 'the segmented switch is drawn on --border-control');
assert(/block: 'tabs', id: 'explore-panes'/.test(explorer) && /variant: 'segmented'/.test(explorer), 'the two-card switch is Ark tabs');
const themes = fs.readFileSync('css/themes.css', 'utf8') + fs.readFileSync('css/flux-themes.css', 'utf8');
assert((themes.match(/--border-control:/g) || []).length >= 10, 'every theme defines --border-control');

/* ---- caption floor: no text under 12px in these two sheets ---- */
const small = [];
for (const [file, css] of [['css/explore-story.css', story], ['css/how-overview.css', overview]]) {
  css.split('\n').forEach((line, n) => {
    for (const m of line.matchAll(/(?:font:\s*[\w.]+\s+|font-size:\s*)(\d+(?:\.\d+)?)px/g)) if (Number(m[1]) < 12) small.push(file + ':' + (n + 1) + ' ' + m[0]);
  });
}
assert.deepEqual(small, [], 'no caption, label or number is set below 12px');
assert(/--caption-size:\s*max\(\.75rem,\s*var\(--type-metadata/.test(overview), 'the caption size is the SDK metadata size, never under .75rem');

console.log('PASS: /explore counts take one plural rule, its tiles and controls sit on --border-control, and nothing in its sheets is under 12px.');
