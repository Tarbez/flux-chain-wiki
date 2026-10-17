const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = vm.createContext({});
vm.runInContext(fs.readFileSync('js/content/layout.js', 'utf8'), context);
const ArkLayout = vm.runInContext('ArkLayout', context);

let layout = ArkLayout.sanitize({ version: 2, routes: {}, groups: {}, labels: {} });
layout = ArkLayout.set(layout, '/', 'copy:home.TITLE', 'desktop', { x: 24, y: -10, width: 640, height: 180, rotation: 3, scaleX: 1.1, scaleY: .9 });
layout = ArkLayout.set(layout, '/', 'copy:home.TITLE', 'phone', { x: 4, width: 320 });
assert.deepEqual(ArkLayout.merged(layout.routes['/']['copy:home.TITLE'], 1280), { x: 24, y: -10, width: 640, height: 180, rotation: 3, scaleX: 1.1, scaleY: .9 });
assert.equal(ArkLayout.merged(layout.routes['/']['copy:home.TITLE'], 390).x, 4, 'phone overrides desktop position');
assert.equal(ArkLayout.merged(layout.routes['/']['copy:home.TITLE'], 390).height, 180, 'phone inherits unspecified desktop size');
layout = ArkLayout.remove(layout, '/', 'copy:home.TITLE', 'phone');
assert(!layout.routes['/']['copy:home.TITLE'].phone, 'one responsive breakpoint can reset independently');
assert(ArkLayout.serialize(layout).includes('ArkLayout.define('), 'layout serializes as a loadable content module');
layout = ArkLayout.group(layout, '/', 'hero-group', ['copy:home.TITLE', 'copy:home.INTRO'], 'Hero group');
assert.deepEqual(layout.groups['/']['hero-group'].members, ['copy:home.TITLE', 'copy:home.INTRO'], 'selected sibling layers persist as a real group');
layout = ArkLayout.ungroup(layout, '/', 'hero-group');
assert(!layout.groups['/'], 'ungroup removes the wrapper definition');
assert.deepEqual(ArkLayout.sanitize({ routes: { bad: { x: {} }, '/': { key: { desktop: { x: Infinity, width: -2, rotation: 9999 } } } } }), { version: 2, routes: { '/': { key: { desktop: { width: 1, rotation: 360 } } } }, groups: {}, labels: {} }, 'invalid and unsafe layout data is removed or clamped');

/* Visual-style properties (spacing/typography/fill/effects) bind to the real site's own
   design tokens (css/themes.css), not an invented parallel palette -- see js/content/
   layout.js's TEXT_TOKENS/FILL_TOKENS/etc. A value outside the real token list is dropped
   silently by cleanFrame, the same way an out-of-range numeric frame value is clamped above. */
let styled = ArkLayout.set(ArkLayout.sanitize({ version: 2, routes: {}, groups: {}, labels: {} }), '/', 'copy:home.CARD', 'desktop', {
  pt: 24, pr: 16, pb: 24, pl: 16, mt: 8, mb: -4,
  font: 'display', textSize: 'h2', color: 'text-strong', bg: 'surface', radius: 'card', border: 'thin', borderColor: 'border-default',
  op: 80, overflow: 'hidden',
});
assert.deepEqual(ArkLayout.merged(styled.routes['/']['copy:home.CARD'], 1280), {
  pt: 24, pr: 16, pb: 24, pl: 16, mt: 8, mb: -4,
  font: 'display', textSize: 'h2', color: 'text-strong', bg: 'surface', radius: 'card', border: 'thin', borderColor: 'border-default',
  op: 80, overflow: 'hidden',
}, 'spacing, typography, fill, and effects properties persist and merge like frame properties');
assert.deepEqual(ArkLayout.sanitize({ routes: { '/': { key: { desktop: {
  font: 'comic-sans', textSize: 'giant', color: '#ff0000', bg: 'invented-hue', radius: 'squircle', border: 'medium', overflow: 'auto', op: 37,
} } } } }), { version: 2, routes: {}, groups: {}, labels: {} }, 'a property outside the real site\'s own token lists is dropped, never written as an invented value');
assert.deepEqual(ArkLayout.sanitize({ routes: { '/': { key: { desktop: { bg: 'none' } } } } }).routes['/'].key.desktop, { bg: 'none' }, "'none' is a valid explicit fill, distinct from an absent one");

/* Layout (flex/grid container) and the remaining typography/size properties: same real-vs-
   invented-value rule. None of these have a real site token (no gap or weight scale exists),
   so they persist as plain numbers/keywords, same as spacing already does above. */
let laidOut = ArkLayout.set(ArkLayout.sanitize({ version: 2, routes: {}, groups: {}, labels: {} }), '/', 'copy:home.ROW', 'desktop', {
  display: 'row', gap: 12, align: 'center', justify: 'between', wrap: 'yes', fw: 600, lh: 'snug', ta: 'center', maxw: 640, minh: 80,
});
assert.deepEqual(ArkLayout.merged(laidOut.routes['/']['copy:home.ROW'], 1280), {
  display: 'row', gap: 12, align: 'center', justify: 'between', wrap: 'yes', fw: 600, lh: 'snug', ta: 'center', maxw: 640, minh: 80,
}, 'layout, weight, line height, text align, max width, and min height all persist and merge like frame properties');
assert.deepEqual(ArkLayout.sanitize({ routes: { '/': { key: { desktop: {
  display: 'flexbox', align: 'middle', justify: 'spread', wrap: 'true', fw: 450, lh: 'cozy', ta: 'justify',
} } } } }), { version: 2, routes: {}, groups: {}, labels: {} }, 'a layout/typography value outside the real fixed option list is dropped, never written as an invented value');

/* Part B of the follow-up Studio plan: labels (a real element's editable display name in
   the Layers panel), sanitized/capped exactly like groups' own label field, keyed the same
   way routes already are -- same route cap (500) and per-route key cap (3000) routes
   itself uses, not groups' separate 1000-id cap. */
let labeled = ArkLayout.setLabel(ArkLayout.sanitize({ version: 2, routes: {}, groups: {}, labels: {} }), '/', 'copy:home.TITLE', 'Hero heading');
assert.equal(ArkLayout.labelFor(labeled, '/', 'copy:home.TITLE'), 'Hero heading', 'a set label round-trips through labelFor');
assert.equal(ArkLayout.labelFor(labeled, '/', 'copy:home.MISSING'), '', 'an unset key has no label, never undefined leaking into a UI string');
assert(ArkLayout.serialize(labeled).includes('"labels"'), 'labels survive serialize alongside routes/groups');
labeled = ArkLayout.setLabel(labeled, '/', 'copy:home.TITLE', '   ');
assert.equal(ArkLayout.labelFor(labeled, '/', 'copy:home.TITLE'), '', 'setting a blank/whitespace-only label clears it, the same "falls back to the tag name" state as never having set one');
assert(!labeled.labels['/'], 'a route with no labels left is dropped entirely, same cleanup groups() already does for an emptied route');
let longLabel = ArkLayout.setLabel(ArkLayout.sanitize({ version: 2, routes: {}, groups: {}, labels: {} }), '/', 'copy:home.CARD', 'x'.repeat(400));
assert.equal(ArkLayout.labelFor(longLabel, '/', 'copy:home.CARD').length, 120, 'a label is capped at 120 chars, the same cap group()\'s own label field already uses');
assert.deepEqual(ArkLayout.sanitize({ labels: { bad: { x: 'nope' }, '/': { ok: 'Fine', dropped: 42, '': 'no key' } } }).labels, { '/': { ok: 'Fine' } }, 'a non-/ route, a non-string label value, and an empty key are all dropped by sanitize directly, not just by setLabel');
assert.equal(Object.keys(ArkLayout.sanitize({ labels: { '/': Object.fromEntries(Array.from({ length: 3500 }, (_, i) => ['k' + i, 'v']).slice(0, 3500)) } }).labels['/']).length, 3000, 'labels per route are capped at 3000 keys, the same cap the routes map itself already uses');

/* The hide toggle (Layers panel eye icon) must be reversible through the exact same
   ArkLayout.set() mechanism every other Frame/Fill control already uses -- not a parallel
   persistence path. Un-hiding has to remove the 'display' override entirely (an element's
   natural CSS display, not a second guessed enum value), so set() treats an explicit `null`
   on a recognized field as "delete this field," distinct from an absent field (leave alone). */
let hidden = ArkLayout.set(ArkLayout.sanitize({ version: 2, routes: {}, groups: {}, labels: {} }), '/', 'copy:home.CARD', 'desktop', { x: 10, display: 'hide' });
assert.equal(ArkLayout.merged(hidden.routes['/']['copy:home.CARD'], 1280).display, 'hide', 'the hide toggle writes frame.display === \'hide\', the exact same value the Layout accordion\'s own Display segmented control already writes for its \'Hide\' option');
let unhidden = ArkLayout.set(hidden, '/', 'copy:home.CARD', 'desktop', { display: null });
assert.equal(ArkLayout.merged(unhidden.routes['/']['copy:home.CARD'], 1280).display, undefined, 'un-hiding removes the display override entirely');
assert.equal(ArkLayout.merged(unhidden.routes['/']['copy:home.CARD'], 1280).x, 10, 'un-hiding never disturbs the element\'s other frame properties (position, size, etc.)');

console.log('PASS: responsive layout overrides sanitize, inherit, reset, and serialize.');
