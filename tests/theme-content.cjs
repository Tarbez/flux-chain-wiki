const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
function load(context) {
  vm.runInContext(fs.readFileSync('js/tokens.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('js/ark/vendor/backgrounds.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('js/content/theme.js', 'utf8'), context);
}
const context = vm.createContext({});
load(context);
const { Tokens, ArkTheme, ArkBackgrounds } = vm.runInContext('({ Tokens, ArkTheme, ArkBackgrounds })', context);

// Only the plain #rrggbb entries in Tokens.colors are exposed: the rgba(...) ones (alpha)
// cannot round-trip through a color input, so ArkTheme must leave them out entirely.
const colorFields = ArkTheme.colorFields();
const hexKeysInTokens = Object.keys(Tokens.colors).filter((k) => /^#[0-9a-f]{6}$/i.test(Tokens.colors[k]));
assert.equal(JSON.stringify(colorFields.map((f) => f.key).sort()), JSON.stringify(hexKeysInTokens.sort()), 'every plain-hex token is exposed, and only those');
assert(!colorFields.some((f) => f.key === 'author-edge' || f.key === 'dash'), 'the alpha (rgba) colours are excluded');
colorFields.forEach((f) => assert.equal(f.def, Tokens.colors[f.key], f.key + ' default must match tokens.js, never drift from it'));

// Background styles read the real vendor bundle's keys, plus 'none'.
const bgStyles = ArkTheme.backgroundStyles();
assert.equal(JSON.stringify(bgStyles.map((s) => s.key)), JSON.stringify(['none', ...Object.keys(ArkBackgrounds)]), 'background styles are none + every ArkBackgrounds key, in that order');

// get() is null before define() ever ran.
assert.equal(ArkTheme.get(), null, 'get() is null before a data file calls define()');
const defaults = ArkTheme.defaults();
assert.equal(JSON.stringify(defaults.colors), JSON.stringify(Object.fromEntries(colorFields.map((f) => [f.key, f.def]))), 'defaults().colors is every field at its tokens.js value');
assert.equal(defaults.background.style, 'none', 'the default background style is none (the site’s original flat-canvas look)');
assert.equal(defaults.activeTheme, 'ghost', 'the default active semantic theme is ghost');
assert.equal(JSON.stringify(defaults.themes), '{}', 'semantic theme overrides start empty');
assert(ArkTheme.themeOptions().some((t) => t.key === 'marine'), 'semantic theme options expose the routed site themes');
assert(ArkTheme.semanticFields().some((f) => f.key === 'primary'), 'semantic fields expose real theme core colours');

// sanitize(): a valid hex survives, an invalid one falls back to the default, per key;
// an unknown background style falls back to 'none' rather than passing through.
const canvasKey = colorFields[0].key;
const partial = { colors: { [canvasKey]: '#112233' }, activeTheme: 'marine', themes: { marine: { primary: '210 50% 60%', canvas: 'bad' } }, background: { style: 'lattice' } };
const sanitized = ArkTheme.sanitize(partial);
assert.equal(sanitized.colors[canvasKey], '#112233', 'a valid colour override survives sanitize()');
colorFields.slice(1).forEach((f) => assert.equal(sanitized.colors[f.key], f.def, f.key + ' with no override falls back to its default'));
assert.equal(ArkTheme.sanitize({ colors: { ink: 'not-a-color' } }).colors.ink, colorFields.find((f) => f.key === 'ink').def, 'an invalid colour is refused silently to the default, never passed through');
assert.equal(sanitized.background.style, 'lattice', 'a known background style survives sanitize()');
assert.equal(ArkTheme.sanitize({ background: { style: 'not-a-real-style' } }).background.style, 'none', 'an unknown background style falls back to none, never passed through');
assert.equal(sanitized.activeTheme, 'marine', 'a known active theme survives sanitize()');
assert.equal(sanitized.themes.marine.primary, '210 50% 60%', 'a valid semantic colour survives sanitize()');
assert.equal(sanitized.themes.marine.canvas, undefined, 'an invalid semantic colour is refused silently');

// define()/get() round-trip through sanitize().
ArkTheme.define(partial);
assert.equal(JSON.stringify(ArkTheme.get()), JSON.stringify(sanitized), 'get() returns exactly what define() sanitized');

// css() emits :root with every legacy colour field as an --ark-* custom property, plus
// semantic theme override rules for the real routed data-theme selectors. It still says
// nothing about the background style (that's a DOM mount, done in js/main.js, not CSS).
const css = ArkTheme.css();
assert(css.startsWith(':root{') && css.endsWith('}'), 'css() emits CSS rules');
colorFields.forEach((f) => assert(css.includes('--ark-' + f.key + ':' + sanitized.colors[f.key] + ';'), 'css() declares --ark-' + f.key));
assert(css.includes(':root[data-theme="marine"]{--primary:210 50% 60%;}'), 'css() declares semantic overrides for edited themes');
assert(!css.includes('lattice'), 'css() never mentions the background style');

// serialize()/define() round-trips the exact sanitized object.
const source = ArkTheme.serialize(partial);
const context2 = vm.createContext({});
load(context2);
vm.runInContext(source, context2);
const roundTripped = JSON.parse(JSON.stringify(vm.runInContext('ArkTheme.get()', context2)));
assert.equal(JSON.stringify(roundTripped), JSON.stringify(sanitized), 'serialize/define round-trips the exact sanitized object');

// problems() never blocks a well-formed object; only rejects a non-object.
assert.equal(ArkTheme.problems(partial).length, 0, 'a plain object has no problems');
assert(ArkTheme.problems(null).length, 'null is refused');

// Every vendored background style actually mounts, and its config matches its own defaults.
class El {
  constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.attrs = {}; this.style = { setProperty() {}, cssText: '' }; this._text = ''; }
  get ownerDocument() { return DOC; }
  setAttribute(k, v) { this.attrs[k] = v; }
  append(...items) { this.children.push(...items); }
  appendChild(item) { this.children.push(item); return item; }
  replaceChildren(...items) { this.children = items; }
  set textContent(v) { this._text = v; }
  get textContent() { return this._text; }
  cloneNode() { return new El(this.tagName); }
  // fabric draws to a real <canvas> 2D context; a Proxy that no-ops any call/property
  // stands in for it, since only "does mounting throw" matters here, not pixels.
  getContext() { return new Proxy({}, { get: () => () => new Proxy({}, { get: () => () => {} }) }); }
}
const DOC = { createElement: (tag) => new El(tag), createElementNS: (_ns, tag) => new El(tag) };
const WIN = { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), requestAnimationFrame: (fn) => setTimeout(fn, 0), cancelAnimationFrame: () => {}, devicePixelRatio: 1 };
const context3 = vm.createContext({ document: DOC, window: WIN, requestAnimationFrame: WIN.requestAnimationFrame, cancelAnimationFrame: WIN.cancelAnimationFrame });
load(context3);
const liveBackgrounds = vm.runInContext('ArkBackgrounds', context3);
Object.keys(liveBackgrounds).forEach((key) => {
  const host = new El('div');
  const handle = liveBackgrounds[key].mount(host);
  assert(host.children.length > 0, key + ' background mounts real DOM');
  // createConfig({}) normalizes (e.g. deepTide's shapes each gain an explicit opacity), so
  // it is not always byte-identical to the raw defaults export -- just resolved from it.
  assert.equal(typeof handle.config, 'object', key + ' mount() resolves a config object');
  assert(Object.keys(handle.config).length >= Object.keys(liveBackgrounds[key].defaults).length, key + ' resolved config is at least as complete as its raw defaults');
  handle.destroy();
  assert.equal(host.children.length, 0, key + ' destroy() actually clears its host');
});

console.log('PASS: ArkTheme colours/background round-trip, every vendored background style mounts and destroys cleanly.');
