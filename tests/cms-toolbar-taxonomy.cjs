'use strict';
/* Regression: the contextual toolbar's Size section (max width / min height) was ported into
   js/admin/admin.js as buildSizeSection() and then never called by renderSelToolbar(), so
   two frame keys that ArkLayout still stores and applies (maxw/minh -> max-width/min-height)
   had no control anywhere -- while tests/admin-studio.cjs asserted "connected Studio exposes a
   real Size panel" because the builder's text was in the file. A defined-but-uncalled builder
   reads as a feature to every text search and is invisible to a user. Found by walking the
   toolbar in a real browser (tests/browser/full-audit.mjs, the container surface).
   Derived, not listed: every build*Section the file declares must be called by it, and the
   container branch shows Size beside Frame. */
const assert = require('node:assert/strict');
const fs = require('node:fs');

const admin = require('./lib/admin-source.cjs').ADMIN;
const builders = [...admin.matchAll(/function (build\w+Section)\(/g)].map((m) => m[1]);
assert(builders.includes('buildSizeSection') && builders.length >= 8, 'the toolbar is still built from build*Section functions: ' + builders.join(', '));
for (const name of builders) {
  const calls = admin.split(name + '(').length - 1 - 1; /* minus the declaration */
  assert(calls >= 1, `${name}() is declared but never called: its controls exist in the file and nowhere on screen`);
}
const start = admin.indexOf('  function renderSelToolbar() {');
const body = admin.slice(start, admin.indexOf('\n  }\n', start));
const containerLine = body.split('\n').find((line) => line.includes('buildLayoutSection(box, ctx)'));
assert(containerLine, 'renderSelToolbar still has a container branch');
const order = ['buildLayoutSection', 'buildFillSection', 'buildSpacingSection', 'buildFrameSection', 'buildSizeSection', 'buildEffectsSection'].map((n) => containerLine.indexOf(n + '('));
assert(order.every((i) => i >= 0), 'a container shows Layout, Fill, Spacing, Frame, Size and Effects');
assert(order.every((i, k) => k === 0 || i > order[k - 1]), 'in that order -- Size right after the Frame section its hint refers to ("in the Frame section above")');
console.log('PASS: every toolbar section builder is reachable; a container shows Size.');
