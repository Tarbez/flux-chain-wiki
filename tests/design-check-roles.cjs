'use strict';
/* The Design check's 60-30-10 rule counts roles by what they are, not by token names.

   Why this exists (W1-BRAND, 2026-10-19): the SDK's --accent now equals --complement -- the teal of
   actions. The rule mapped a painted colour to the ONE nearest token name, so the same teal counted
   as "accent" or "brand" depending on which token was listed first, and the balance it reported
   was an accident of declaration order. Now a colour keeps every token name it matches, and a fill
   the accent shares with the brand pair is the 10 on an action and the 30 anywhere else.
   Runs the real roleOf / nearest from js/admin/design-check.js. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const src = fs.readFileSync('js/admin/design-check.js', 'utf8');
const start = src.indexOf('    const isAction = (el) =>'), end = src.indexOf('    const area = { neutral: 0, brand: 0, accent: 0 };', start);
assert(start > 0 && end > start, 'design-check.js still decides a fill\'s role with isAction / roleOf / nearest');
const build = new Function('tokenRgb', src.slice(start, end) + '\nreturn { roleOf, nearest };');

const doc = new JSDOM('<body><a href="#">Go</a><button>Do</button><div>Panel</div></body>').window.document;
const link = doc.querySelector('a'), button = doc.querySelector('button'), panel = doc.querySelector('div');
const TEAL = [0, 160, 150], EMBER = [230, 110, 40], CANVAS = [12, 12, 14];

{
  /* accent == complement: one colour, two roles */
  const { roleOf, nearest } = build({ canvas: CANVAS, primary: EMBER, complement: TEAL, accent: TEAL });
  const names = nearest(TEAL).sort();
  assert.deepEqual(names, ['accent', 'complement'], 'a colour two tokens share keeps both names');
  assert.equal(roleOf(names, link), 'accent', 'teal on a link is the action colour (the 10)');
  assert.equal(roleOf(names, button), 'accent', 'teal on a button is the action colour (the 10)');
  assert.equal(roleOf(names, panel), 'brand', 'teal on a panel is the brand pair (the 30)');
  assert.equal(roleOf(nearest(EMBER), panel), 'brand');
  assert.equal(roleOf(nearest(CANVAS), panel), 'neutral');
  /* the answer does not depend on declaration order */
  const swapped = build({ accent: TEAL, complement: TEAL, primary: EMBER, canvas: CANVAS });
  assert.equal(swapped.roleOf(swapped.nearest(TEAL), panel), 'brand');
  assert.equal(swapped.roleOf(swapped.nearest(TEAL), link), 'accent');
}
{
  /* a palette whose accent has its own colour: it is the 10 wherever it is painted */
  const { roleOf, nearest } = build({ canvas: CANVAS, primary: EMBER, complement: TEAL, accent: [250, 200, 40] });
  assert.equal(roleOf(nearest([250, 200, 40]), panel), 'accent');
  assert.equal(roleOf(nearest(TEAL), link), 'brand', 'the complement on a link is still the brand pair when the accent has its own colour');
}
console.log('PASS: 60-30-10 counts a shared accent/complement teal as the 10 on actions and the 30 elsewhere, whatever the token order.');
