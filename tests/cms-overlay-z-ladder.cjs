'use strict';
/* ONE stacking order for everything that floats over the workspace (js/admin/overlay.js).

   Why this exists (W1 note, docs/ux-audit/plan.md Wave 3; W3-EDITOR 2026-10-19): on a phone the
   Page settings sheet (z-index 30, css/studio-embed.css) opened UNDER the Site style dock (z-index
   44, the same file, another rule): two surfaces each chose a number in its own rule and nothing
   saw the order. Now overlay.js publishes the ladder as --z-* custom properties on the root element
   and the sheets read them; a sheet asked for over the dock is above it. The dead rule that laid
   the sheet beside Version history (they share one slot, so both are never open) is gone too. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<body></body>', { runScripts: 'outside-only' });
const w = dom.window;
w.ArkAdmin = { h: () => w.document.createElement('div'), ic: () => '', provide(names) { Object.assign(this, names); } };
w.eval(fs.readFileSync('js/admin/overlay.js', 'utf8'));
const z = (name) => Number(w.document.documentElement.style.getPropertyValue('--z-' + name));
const layers = w.ArkAdmin.overlay.layers;
assert(Array.isArray(layers) && layers.length >= 10, 'overlay.js publishes the ladder (overlay.layers)');
for (const l of layers) assert.equal(z(l.token.replace(/^--z-/, '')), l.z, `${l.token} is on the root element`);
for (let i = 1; i < layers.length; i++) assert(layers[i].z >= layers[i - 1].z, `the ladder is listed lowest first (${layers[i - 1].token} ${layers[i - 1].z} -> ${layers[i].token} ${layers[i].z})`);

/* the order the numbers encode: what was asked for later is on top */
assert(z('sheet') > z('theme-dock'), 'a docked sheet (Page settings) opened while in Site style is over the dock, not under it');
assert(z('rail-scrim') > z('sheet') && z('rail-drawer') > z('rail-scrim'), 'the rail drawer and its scrim are over a docked sheet');
assert(z('popover') > z('rail-drawer') && z('popover') > z('sheet') && z('popover') > z('theme-dock'), 'a popover is over whatever opened it: the sheet, the dock, the drawer');
assert(z('workspace') > z('popover'), 'the workspace layers sit inside #studioRoot, itself one body-level layer');
assert(z('versions') > z('workspace') && z('header') > z('versions') && z('menu') > z('header'), 'Version history over the workspace, the header over it, its menu over all');
assert(z('notice-banner') > z('workspace') && z('notice-toast') > z('workspace'), 'notices are over the workspace');

/* the sheets read the ladder and keep no floating layer's number of their own */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const studio = strip(fs.readFileSync('css/studio-embed.css', 'utf8')), admin = strip(fs.readFileSync('css/admin.css', 'utf8'));
/* every rule (an @media wrapper unwrapped) as { selectors: [...], body } */
const rules = (css) => [...css.replace(/@media[^{]*\{/g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selectors: m[1].split(',').map((s) => s.trim()), body: m[2] }));
const studioRules = rules(studio), adminRules = rules(admin);
const expect = [[studioRules, '#studioRoot .theme-dock', 'theme-dock'], [studioRules, '#studioRoot .sheet', 'sheet'], [studioRules, '#studioRoot .rail-scrim', 'rail-scrim'], [studioRules, '#studioRoot .left', 'rail-drawer'],
  [studioRules, '#studioRoot .pop', 'popover'], [studioRules, '#studioRoot .tb-pop', 'popover'], [studioRules, '#studioRoot', 'workspace'],
  [adminRules, '.versions-panel', 'versions'], [adminRules, '#appBar', 'header'], [adminRules, '.account-menu', 'menu'], [adminRules, '.notice-floating', 'notice-banner'], [adminRules, '.notice-toasts', 'notice-toast'], [adminRules, '#appBar .status', 'status']];
for (const [list, selector, token] of expect) {
  /* the rule(s) naming exactly this selector that set a z-index: the layer's own rule */
  const own = list.filter((r) => r.selectors.includes(selector) && /z-index:/.test(r.body));
  assert(own.length, `a rule for ${selector} sets its z-index`);
  for (const r of own) assert(r.body.includes(`z-index: var(--z-${token})`), `${selector} reads var(--z-${token}) (got: ${/z-index:[^;]*/.exec(r.body)})`);
}
const published = new Set(layers.map((l) => l.token));
for (const [file, css] of [['css/studio-embed.css', studio], ['css/admin.css', admin]]) {
  for (const m of css.matchAll(/z-index:\s*var\((--z-[\w-]+)\)/g)) assert(published.has(m[1]), `${file} reads ${m[1]}, which overlay.js does not publish`);
  /* a literal z-index may remain only for a layer inside its own scrolling container (a sticky head, a tooltip): small numbers */
  for (const m of css.matchAll(/z-index:\s*(\d+)/g)) assert(Number(m[1]) <= 5, `${file} keeps a floating layer's literal z-index ${m[1]}: put it on the ladder in overlay.js`);
}
assert(!/#versionsPanel:not\(\[hidden\]\)\)[^{]*\.sheet/.test(studio), 'the "sheet beside Version history" rule is gone: they share one docked slot (overlay level sheet), so it never applied');
console.log('PASS: one stacking order, published by overlay.js and read by both sheets; a sheet is over the Site style dock, a popover over everything it opened from.');
