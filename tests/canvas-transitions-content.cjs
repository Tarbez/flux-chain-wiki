const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
function load(context) {
  vm.runInContext(fs.readFileSync('js/content/canvas-transitions.js', 'utf8'), context);
}
const context = vm.createContext({ window: {} });
load(context);
const { ArkCanvasTransitions } = vm.runInContext('({ ArkCanvasTransitions })', context);

// The two small fixed enums this module exposes. Compared via JSON.stringify, not
// assert.deepEqual: these arrays are returned from a separate vm context, whose Array
// is a different realm's constructor than this file's own literals, which trips
// assert/strict's deepStrictEqual on prototype identity even when the contents match --
// the same reason settings-defaults-content.cjs compares its own vm-context results
// this way instead.
assert.equal(JSON.stringify(ArkCanvasTransitions.effects()), JSON.stringify(['fade', 'fade-scale']), 'effects() is the exact fixed pair');
assert.equal(JSON.stringify(ArkCanvasTransitions.easings()), JSON.stringify(['ease', 'ease-out', 'ease-in-out']), 'easings() is the exact fixed triple');

// defaults(): a real, intentional, subtle transition -- never "disabled" -- since there
// is no "today's behavior" this has to stay byte-identical to (no background transition
// existed before this module).
const defaults = ArkCanvasTransitions.defaults();
assert.equal(defaults.version, 1);
assert.equal(defaults.effect, 'fade', 'default effect is a plain fade, not fade-scale');
assert.equal(defaults.outDuration, 220, 'default fade-out is a quick, subtle 220ms');
assert.equal(defaults.inDuration, 260, 'default fade-in is a quick, subtle 260ms');
assert.equal(defaults.easing, 'ease', 'default easing is the platform ease curve');
assert(defaults.outDuration > 0 && defaults.inDuration > 0, 'defaults are a real, always-on transition, never defaulted to invisible (0ms)');

// get() before any define(): the module-level current already starts at defaults(),
// never null -- unlike settings-defaults.js, there is no separate hardcoded JS fallback
// elsewhere this module is only overriding, so there is nothing to defer to.
assert.equal(JSON.stringify(ArkCanvasTransitions.get()), JSON.stringify(defaults), 'get() starts at defaults() before any define() call');

// sanitize(): an invalid effect/easing falls back to the safe default; an out-of-range
// or non-finite duration is clamped/refused independently per field.
assert.equal(ArkCanvasTransitions.sanitize({ effect: 'not-a-real-effect' }).effect, 'fade', 'an unknown effect falls back to fade');
assert.equal(ArkCanvasTransitions.sanitize({ effect: 'fade-scale' }).effect, 'fade-scale', 'a known effect survives sanitize()');
assert.equal(ArkCanvasTransitions.sanitize({ easing: 'not-a-real-easing' }).easing, 'ease', 'an unknown easing falls back to ease');
assert.equal(ArkCanvasTransitions.sanitize({ easing: 'ease-in-out' }).easing, 'ease-in-out', 'a known easing survives sanitize()');

const clamped = ArkCanvasTransitions.sanitize({ outDuration: 99999, inDuration: -40, easing: 'ease-out' });
assert.equal(clamped.outDuration, 1200, 'outDuration is clamped to its max (1200ms)');
assert.equal(clamped.inDuration, 0, 'inDuration is clamped to its min (0ms)');
assert.equal(clamped.easing, 'ease-out', 'a valid easing survives alongside clamped durations');

const nonFinite = ArkCanvasTransitions.sanitize({ outDuration: NaN, inDuration: 'not-a-number' });
assert.equal(nonFinite.outDuration, 220, 'a non-finite outDuration falls back to its default (220ms)');
assert.equal(nonFinite.inDuration, 260, 'a non-finite inDuration falls back to its default (260ms)');

assert.equal(JSON.stringify(ArkCanvasTransitions.sanitize(null)), JSON.stringify(defaults), 'sanitize(null) is exactly defaults()');
assert.equal(JSON.stringify(ArkCanvasTransitions.sanitize({})), JSON.stringify(defaults), 'sanitize({}) is exactly defaults()');

// define()/get() round-trip through sanitize().
const partial = { effect: 'fade-scale', outDuration: 400, inDuration: 50, easing: 'ease-in-out' };
ArkCanvasTransitions.define(partial);
assert.equal(JSON.stringify(ArkCanvasTransitions.get()), JSON.stringify(ArkCanvasTransitions.sanitize(partial)), 'get() returns exactly what define() sanitized');

// serialize()/define() round-trips the exact sanitized object -- the Studio-driven edit
// and a hand edit produce the same bytes, the same contract every sibling content module
// (states.js/layout.js/components.js/settings-defaults.js) keeps.
const source = ArkCanvasTransitions.serialize(partial);
const context2 = vm.createContext({ window: {} });
load(context2);
vm.runInContext(source, context2);
const roundTripped = vm.runInContext('ArkCanvasTransitions.get()', context2);
assert.equal(JSON.stringify(roundTripped), JSON.stringify(ArkCanvasTransitions.sanitize(partial)), 'serialize/define round-trips the exact sanitized object');

// The checked-in canvas-transitions-data.js is itself exactly serialize(defaults()) --
// confirming the data file was actually generated by running the module, not hand-typed,
// and that it really is the graceful, subtle, always-on default the plan calls for.
const dataFileSource = fs.readFileSync('js/content/canvas-transitions-data.js', 'utf8');
assert.equal(dataFileSource, ArkCanvasTransitions.serialize(ArkCanvasTransitions.defaults()), 'canvas-transitions-data.js is byte-identical to serialize(defaults())');

// apply(): the one real runtime entry point. A non-element argument is a safe no-op,
// never throws.
assert.equal(ArkCanvasTransitions.apply(null, 'out'), 0, 'apply() with no element is a safe no-op');
assert.equal(ArkCanvasTransitions.apply({}, 'out'), 0, 'apply() with an element that has no .style is a safe no-op');

function fakeElement() { return { style: {} }; }
ArkCanvasTransitions.define({ effect: 'fade', outDuration: 220, inDuration: 260, easing: 'ease' });
const plain = fakeElement();
const outMs = ArkCanvasTransitions.apply(plain, 'out');
assert.equal(outMs, 220, 'apply() returns the duration (ms) it just applied, for a phase=out fade');
assert.equal(plain.style.opacity, '0', 'phase=out sets opacity to 0');
assert.equal(plain.style.transition, 'opacity 220ms ease', 'phase=out writes a plain opacity transition for effect=fade');
assert(!plain.style.transform, 'effect=fade never writes a transform');
const inMs = ArkCanvasTransitions.apply(plain, 'in');
assert.equal(inMs, 260, 'apply() returns inDuration for phase=in');
assert.equal(plain.style.opacity, '1', 'phase=in sets opacity to 1');
assert.equal(plain.style.transition, 'opacity 260ms ease', 'phase=in writes a plain opacity transition for effect=fade');

ArkCanvasTransitions.define({ effect: 'fade-scale', outDuration: 300, inDuration: 300, easing: 'ease-out' });
const scaled = fakeElement();
ArkCanvasTransitions.apply(scaled, 'out');
assert.equal(scaled.style.opacity, '0');
assert.equal(scaled.style.transform, 'scale(0.98)', 'effect=fade-scale eases the outgoing layer to a subtle 0.98 scale');
assert.equal(scaled.style.transition, 'opacity 300ms ease-out, transform 300ms ease-out', 'effect=fade-scale transitions both opacity and transform');
ArkCanvasTransitions.apply(scaled, 'in');
assert.equal(scaled.style.opacity, '1');
assert.equal(scaled.style.transform, 'scale(1)', 'effect=fade-scale eases the incoming layer back to its natural scale');

console.log('PASS: ArkCanvasTransitions sanitize/clamp/serialize round-trip and apply() CSS writes, byte-identical data file.');
