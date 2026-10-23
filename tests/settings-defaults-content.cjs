const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
function load(context) {
  vm.runInContext(fs.readFileSync('js/content/settings-defaults.js', 'utf8'), context);
}
const context = vm.createContext({ window: {} });
// js/content/theme.js loads first on every page (index.html, admin-app.html) and owns the old-key -> published-id map
vm.runInContext(fs.readFileSync('js/content/theme.js', 'utf8'), context);
load(context);
const { ArkSiteDefaults } = vm.runInContext('({ ArkSiteDefaults })', context);

// Options mirror scripts/settings-entry.js's own lists exactly: theme options from the
// generated scripts/theme-options.js (read directly here, not re-guessed), and the 8 real
// motif names from scripts/settings-entry.js's own `motifs` array.
const settingsEntrySource = fs.readFileSync('scripts/settings-entry.js', 'utf8');
const motifsLiteral = settingsEntrySource.match(/const motifs=(\[[^\]]+\]);/);
assert(motifsLiteral, 'settings-entry.js still declares its motifs array literally (test needs updating if this moves)');
const realMotifs = new Function('return ' + motifsLiteral[1])();
assert.equal(JSON.stringify(ArkSiteDefaults.motifs()), JSON.stringify(realMotifs), 'motifs() is exactly settings-entry.js\'s own motifs list');

const themeOptionsSource = fs.readFileSync('scripts/theme-options.js', 'utf8');
const realThemeOptions = JSON.parse(themeOptionsSource.match(/export default (\[[^\]]+\]);/)[1]);
assert.equal(JSON.stringify(ArkSiteDefaults.themeOptions()), JSON.stringify(realThemeOptions), 'themeOptions() mirrors the generated scripts/theme-options.js exactly');

// controls() mirrors settings-entry.js's own `controls` object's min/max/default literals.
const controlsLiteral = settingsEntrySource.match(/const controls=(\{.+?\});/);
assert(controlsLiteral, 'settings-entry.js still declares its controls object literally (test needs updating if this moves)');
const realControls = new Function('return ' + controlsLiteral[1])();
const controls = ArkSiteDefaults.controls();
Object.keys(realControls).forEach((key) => {
  assert.equal(controls[key].min, realControls[key].min, key + ' min mirrors settings-entry.js');
  assert.equal(controls[key].max, realControls[key].max, key + ' max mirrors settings-entry.js');
  assert.equal(controls[key].def, realControls[key].value, key + ' default mirrors settings-entry.js');
  /* the editor names each slider as the visitor's panel does, never by its key (docs/ux-audit/cms.md P1-2) */
  assert.equal(controls[key].label, realControls[key].label, key + ' label mirrors settings-entry.js');
});

// get() is null before define() ever ran.
assert.equal(ArkSiteDefaults.get(), null, 'get() is null before a data file calls define()');

// defaults() is byte-identical to today's hardcoded fallbacks: an unconfigured site must
// behave exactly as it did before this module existed.
const defaults = ArkSiteDefaults.defaults();
assert.equal(defaults.theme, 'ember', 'default theme is ember (the SDK id for the old ghost), same literal as settings-entry.js');
assert.equal(defaults.motif, 'blocks', 'default motif is blocks, same literal as settings-entry.js');
realMotifs.forEach((motif) => {
  Object.keys(realControls).forEach((key) => {
    assert.equal(defaults.patternConfig[motif][key], realControls[key].value, motif + '.' + key + ' default matches settings-entry.js\'s shared literal');
  });
  assert.equal(defaults.patternConfig[motif].animated, true, motif + '.animated defaults true, same as settings-entry.js');
});

// sanitize(): an invalid theme/motif falls back to the safe default; an out-of-range or
// non-finite pattern-config number is clamped/refused per field, independently.
assert.equal(ArkSiteDefaults.sanitize({ theme: 'not-a-theme' }).theme, 'ember', 'an unknown theme falls back to ember');
assert.equal(ArkSiteDefaults.sanitize({ theme: 'defxn-dune' }).theme, 'defxn-dune', 'a known theme survives sanitize()');
assert.equal(ArkSiteDefaults.sanitize({ theme: 'marine' }).theme, 'defxn-dune', 'a saved OLD key reads as its published id (the saved record is not rewritten)');
assert.equal(ArkSiteDefaults.sanitize({ theme: 'moss' }).theme, 'defxn-moss-light', 'old moss is Moss light');
assert.equal(ArkSiteDefaults.sanitize({ motif: 'not-a-motif' }).motif, 'blocks', 'an unknown motif falls back to blocks');
assert.equal(ArkSiteDefaults.sanitize({ motif: 'traces' }).motif, 'traces', 'a known motif survives sanitize()');

const outOfRange = ArkSiteDefaults.sanitize({ patternConfig: { blocks: { structure: 999, visibility: -40, scale: 1, density: NaN, softness: 50, delay: 100, animated: false } } });
assert.equal(outOfRange.patternConfig.blocks.structure, 100, 'structure is clamped to its max (100)');
assert.equal(outOfRange.patternConfig.blocks.visibility, 0, 'visibility is clamped to its min (0)');
assert.equal(outOfRange.patternConfig.blocks.scale, 60, 'scale is clamped to its min (60)');
assert.equal(outOfRange.patternConfig.blocks.density, 60, 'a non-finite density falls back to its default (60)');
assert.equal(outOfRange.patternConfig.blocks.softness, 50, 'a valid softness survives sanitize()');
assert.equal(outOfRange.patternConfig.blocks.delay, 10, 'delay is clamped to its max (10)');
assert.equal(outOfRange.patternConfig.blocks.animated, false, 'an explicit false animated survives sanitize()');
// every motif not mentioned in the override still sanitizes to today's literal default.
realMotifs.filter((m) => m !== 'blocks').forEach((motif) => {
  assert.equal(outOfRange.patternConfig[motif].structure, 50, motif + ' with no override falls back to the default');
  assert.equal(outOfRange.patternConfig[motif].animated, true, motif + ' with no override defaults animated true');
});

// define()/get() round-trip through sanitize().
const partial = { theme: 'defxn-dune', motif: 'traces', patternConfig: { traces: { structure: 80, visibility: 10, scale: 140, density: 90, softness: 25, delay: 4, animated: false } } };
ArkSiteDefaults.define(partial);
assert.equal(JSON.stringify(ArkSiteDefaults.get()), JSON.stringify(ArkSiteDefaults.sanitize(partial)), 'get() returns exactly what define() sanitized');

// serialize()/define() round-trips the exact sanitized object.
const source = ArkSiteDefaults.serialize(partial);
const context2 = vm.createContext({ window: {} });
load(context2);
vm.runInContext(source, context2);
const roundTripped = vm.runInContext('ArkSiteDefaults.get()', context2);
assert.equal(JSON.stringify(roundTripped), JSON.stringify(ArkSiteDefaults.sanitize(partial)), 'serialize/define round-trips the exact sanitized object');

// problems() never blocks a well-formed object; only rejects a non-object.
assert.equal(ArkSiteDefaults.problems(partial).length, 0, 'a plain object has no problems');
assert(ArkSiteDefaults.problems(null).length, 'null is refused');

console.log('PASS: ArkSiteDefaults theme/motif/pattern-config sanitize/clamp/serialize round-trip, byte-identical to today\'s hardcoded defaults.');
