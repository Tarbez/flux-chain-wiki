const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync('js/content/element-motion.js', 'utf8'), context);
const ArkElementMotion = vm.runInContext('ArkElementMotion', context);

// The two small fixed lists this module exposes. Compared via JSON.stringify, not
// assert.deepEqual: these arrays come back from a separate vm context, whose Array is a
// different realm's constructor than this file's own literals -- the same reason
// canvas-transitions-content.cjs compares its own vm-context results this way.
assert.equal(JSON.stringify(ArkElementMotion.directions()), JSON.stringify(['up', 'down', 'left', 'right', 'none']), 'directions() is the exact fixed five');
assert.equal(JSON.stringify(ArkElementMotion.easings()), JSON.stringify(['ease', 'ease-out', 'ease-in-out']), 'easings() reuses the exact same triple ArkCanvasTransitions already defined, for consistency across the two new Studio animation systems');
const vec = (direction) => JSON.stringify(ArkElementMotion.vectorFor(direction));
assert.equal(vec('up'), '[0,1]');
assert.equal(vec('down'), '[0,-1]');
assert.equal(vec('left'), '[1,0]');
assert.equal(vec('right'), '[-1,0]');
assert.equal(vec('none'), '[0,0]');
assert.equal(vec('not-a-real-direction'), '[0,1]', 'an unknown direction falls back to the same default vector (up) sanitize() falls back to');

// defaults()/defaultEntry(): empty routes, and a single entry's own real defaults.
assert.equal(JSON.stringify(ArkElementMotion.defaults()), JSON.stringify({ version: 1, routes: {} }), 'defaults() is an empty document -- no element has an override until Studio creates one');
assert.equal(JSON.stringify(ArkElementMotion.defaultEntry()), JSON.stringify({ direction: 'up', distance: 8, duration: 260, delay: 0, easing: 'ease' }), 'defaultEntry() matches createPresence\'s own existing hardcoded entering magnitude (8px) and duration (260ms), so a freshly opened panel starts from a sane, familiar point');

// get() before any define(): starts at defaults(), never null.
assert.equal(JSON.stringify(ArkElementMotion.get()), JSON.stringify(ArkElementMotion.defaults()), 'get() starts at defaults() before any define() call');

// sanitize(): per-field fallback/clamp, independent of every other field, the same
// per-field-not-whole-object-reject discipline ArkCanvasTransitions.sanitize() uses.
let motion = ArkElementMotion.sanitize({ version: 1, routes: {} });
motion = ArkElementMotion.set(motion, '/', 'copy:home.TITLE', { direction: 'down', distance: 20, duration: 500, delay: 111, easing: 'ease-out' });
assert.equal(JSON.stringify(motion.routes['/']['copy:home.TITLE']), JSON.stringify({ direction: 'down', distance: 20, duration: 500, delay: 111, easing: 'ease-out' }), 'a fully valid entry survives set()/sanitize() unchanged');

assert.equal(ArkElementMotion.entryFor(motion, '/', 'copy:home.TITLE').direction, 'down', 'entryFor() reads back the stored entry for its route+key');
assert.equal(ArkElementMotion.entryFor(motion, '/', 'copy:home.MISSING'), null, 'entryFor() returns null, never a default-filled entry, for an unstored key -- this is what createPresence checks to decide whether to override at all');
assert.equal(ArkElementMotion.entryFor(motion, '/missing-route', 'copy:home.TITLE'), null, 'entryFor() returns null for an unstored route too');

const invalidDirection = ArkElementMotion.set(ArkElementMotion.defaults(), '/', 'k', { direction: 'sideways' });
assert.equal(invalidDirection.routes['/'].k.direction, 'up', 'an invalid direction falls back to the default (up), the same per-field fallback ArkCanvasTransitions.sanitize() already uses for effect/easing');
const invalidEasing = ArkElementMotion.set(ArkElementMotion.defaults(), '/', 'k', { easing: 'bounce' });
assert.equal(invalidEasing.routes['/'].k.easing, 'ease', 'an invalid easing falls back to the default (ease)');

const clampedHigh = ArkElementMotion.set(ArkElementMotion.defaults(), '/', 'k', { distance: 99999, duration: 99999, delay: 99999 });
assert.equal(clampedHigh.routes['/'].k.distance, 60, 'distance is clamped to its max (60px)');
assert.equal(clampedHigh.routes['/'].k.duration, 1200, 'duration is clamped to its max (1200ms), the same ceiling ArkCanvasTransitions already uses');
assert.equal(clampedHigh.routes['/'].k.delay, 1200, 'delay is clamped to the same max');
const clampedLow = ArkElementMotion.set(ArkElementMotion.defaults(), '/', 'k', { distance: -40, duration: -5, delay: -5 });
assert.equal(clampedLow.routes['/'].k.distance, 0, 'distance is clamped to its min (0px)');
assert.equal(clampedLow.routes['/'].k.duration, 0, 'duration is clamped to its min (0ms)');
assert.equal(clampedLow.routes['/'].k.delay, 0, 'delay is clamped to its min');

const nonFinite = ArkElementMotion.set(ArkElementMotion.defaults(), '/', 'k', { distance: NaN, duration: 'not-a-number', delay: undefined });
assert.equal(nonFinite.routes['/'].k.distance, 8, 'a non-finite distance falls back to its default (8px)');
assert.equal(nonFinite.routes['/'].k.duration, 260, 'a non-finite duration falls back to its default (260ms)');
assert.equal(nonFinite.routes['/'].k.delay, 0, 'an undefined delay falls back to its default (0ms)');

assert.equal(JSON.stringify(ArkElementMotion.sanitize(null)), JSON.stringify(ArkElementMotion.defaults()), 'sanitize(null) is exactly defaults()');
assert.equal(JSON.stringify(ArkElementMotion.sanitize({})), JSON.stringify(ArkElementMotion.defaults()), 'sanitize({}) is exactly defaults()');

// remove(): drops a single key, and the whole route once it is the last key left --
// the same cleanup convention ArkLayout.remove()/ungroup() already use.
let two = ArkElementMotion.set(ArkElementMotion.defaults(), '/', 'a', { direction: 'left' });
two = ArkElementMotion.set(two, '/', 'b', { direction: 'right' });
let oneLeft = ArkElementMotion.remove(two, '/', 'a');
assert(!oneLeft.routes['/'].a && oneLeft.routes['/'].b, 'remove() drops exactly the named key, leaving sibling keys on the same route untouched');
let noneLeft = ArkElementMotion.remove(oneLeft, '/', 'b');
assert(!noneLeft.routes['/'], 'a route with no keys left is dropped entirely, the same cleanup ArkLayout.remove() already does');
assert.equal(JSON.stringify(ArkElementMotion.remove(ArkElementMotion.defaults(), '/nope', 'x')), JSON.stringify(ArkElementMotion.defaults()), 'remove() against a route/key that never existed is a safe no-op');

// Route/key caps: the EXACT SAME numbers ArkLayout.sanitize() uses (500 routes, 3000 keys
// per route, 300/500 char length limits) -- reused, not re-derived.
const manyRoutes = { version: 1, routes: {} };
for (let i = 0; i < 600; i++) manyRoutes.routes['/r' + i] = { k: { direction: 'up' } };
assert.equal(Object.keys(ArkElementMotion.sanitize(manyRoutes).routes).length, 500, 'routes are capped at 500, the same cap ArkLayout.sanitize() uses');
const manyKeys = { version: 1, routes: { '/': {} } };
for (let i = 0; i < 3500; i++) manyKeys.routes['/']['k' + i] = { direction: 'up' };
assert.equal(Object.keys(ArkElementMotion.sanitize(manyKeys).routes['/']).length, 3000, 'keys per route are capped at 3000, the same cap ArkLayout.sanitize() uses');
assert.equal(ArkElementMotion.sanitize({ routes: { bad: { k: { direction: 'up' } } } }).routes.bad, undefined, 'a route not starting with / is dropped entirely');
assert.equal(ArkElementMotion.sanitize({ routes: { '/': { ['x'.repeat(600)]: { direction: 'up' } } } }).routes['/'], undefined, 'a key longer than 500 chars is dropped, leaving the route empty and therefore dropped too');
assert.equal(ArkElementMotion.sanitize({ routes: { ['/' + 'x'.repeat(400)]: { k: { direction: 'up' } } } }).routes[Object.keys({ routes: {} })[0]], undefined, 'a route longer than 300 chars is dropped');

// serialize()/define() round-trips the exact sanitized object -- the Studio-driven edit
// and a hand edit produce the same bytes, the same contract every sibling content module
// keeps.
const partial = ArkElementMotion.set(ArkElementMotion.defaults(), '/about', 'copy:about.LEDE', { direction: 'left', distance: 24, duration: 340, delay: 40, easing: 'ease-in-out' });
ArkElementMotion.define(partial);
assert.equal(JSON.stringify(ArkElementMotion.get()), JSON.stringify(ArkElementMotion.sanitize(partial)), 'get() returns exactly what define() sanitized');
const source = ArkElementMotion.serialize(partial);
const context2 = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync('js/content/element-motion.js', 'utf8'), context2);
vm.runInContext(source, context2);
const roundTripped = vm.runInContext('ArkElementMotion.get()', context2);
assert.equal(JSON.stringify(roundTripped), JSON.stringify(ArkElementMotion.sanitize(partial)), 'serialize/define round-trips the exact sanitized object');

// The checked-in element-motion-data.js is itself exactly serialize(defaults()) --
// confirming the data file was actually generated by running the module, not hand-typed,
// and that "empty" really does mean "every element keeps today's exact existing
// createPresence behavior," never a half-written override.
const dataFileSource = fs.readFileSync('js/content/element-motion-data.js', 'utf8');
assert.equal(dataFileSource, ArkElementMotion.serialize(ArkElementMotion.defaults()), 'element-motion-data.js is byte-identical to serialize(defaults())');

console.log('PASS: ArkElementMotion sanitize/clamp/cap/serialize round-trip, byte-identical empty data file.');
