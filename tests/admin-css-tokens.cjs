'use strict';
/* The editor's stylesheets speak ONE visual language: the SDK semantic tokens.

   Why this exists: after the Studio merge (2026-10-17) admin-app.html loaded two token
   systems. css/admin.css read the SDK tokens; css/studio-embed.css carried a palette of its own
   (--bg/--panel/--sunk/--rule/--ink/--muted/--accent/--ok/--warn/--danger/--override/--comp, in
   hex, switched by prefers-color-scheme). On a light-mode Mac the editor drew a dark Content
   header over a light Design canvas, and every colour decision had two answers. Worse, two of
   those private names (--accent, --danger) shadowed SDK channel tokens inside #studioRoot, so any
   admin.css rule reading hsl(var(--accent)) there computed hsl(#2448d8) -- invalid -- and the
   toolbar's own "accent" and "danger" fill swatches (hsl(var(--accent)) inline) painted nothing.

   The rules:
   1. No colour literal (hex, rgb()/hsl()/... with numbers, a named colour) in either sheet,
      except inside the one alias block at the top of css/admin.css. A fallback inside
      hsl(var(--x, ...)) is not a literal; mask-image/url() contents are alpha masks, not colour.
   2. Only that block defines custom properties (one token block, not two).
   3. No retired Studio-private token is read anywhere.
   4. The complete-colour names the scripts write into inline styles (--panel, --rule, --warn,
      --override) are never read by a CSS rule: rules read the SDK token itself.
   5. Every token a rule reads is defined: by the SDK sheets, the alias block, or the script
      that publishes it (a typo'd token is a silently transparent paint).
   6. Light and dark come from the SDK's mechanism (html[data-theme], applied before first paint
      by js/bootstrap.js), never from a prefers-color-scheme branch in an editor sheet. */
const assert = require('node:assert/strict');
const fs = require('node:fs');

const SHEETS = ['css/admin.css', 'css/studio-embed.css'];
const RETIRED = ['bg', 'sunk', 'ink', 'muted', 'accent-soft', 'accent-ink', 'ok', 'comp', 'font-ui', 'font-data'];
const SCRIPT_COLOURS = ['panel', 'rule', 'warn', 'override', 'cms-reference-color', 'cms-danger-color'];
/* custom properties a script sets at run time (js/admin/*: the header's measured height) */
const SCRIPT_SET = ['app-bar-h'];

const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const NAMED = /\b(black|white|red|green|blue|yellow|orange|purple|gray|grey|silver|navy|teal|maroon|olive|lime|aqua|fuchsia|pink)\b/i;

function literals(css) {
  const found = [];
  for (const [, prop, value] of strip(css).matchAll(/([-\w]+)\s*:\s*([^;{}]+)/g)) {
    if (/^-?-?(webkit-)?mask/.test(prop) || prop.startsWith('--')) continue;
    const v = value.replace(/url\((?:"[^"]*"|'[^']*'|[^)]*)\)/g, 'url()').replace(/"[^"]*"|'[^']*'/g, '""');
    if (/#[0-9a-f]{3,8}\b/i.test(v) || /\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(\s*(?!var\()/i.test(v) || NAMED.test(v)) found.push(`${prop}: ${value.trim()}`);
  }
  return found;
}
/* split admin.css into its alias block (the first :root rule) and everything else */
function aliasBlock(css) {
  const m = /:root\s*\{([^{}]*)\}/.exec(strip(css));
  assert(m, 'css/admin.css opens with its :root alias block');
  return { body: m[1], rest: strip(css).slice(0, m.index) + strip(css).slice(m.index + m[0].length) };
}
const defined = (css) => new Set([...strip(css).matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
const reads = (css) => [...strip(css).matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)].map((m) => ({ name: m[1], fallback: !!m[2] }));

/* the checker itself */
assert.deepEqual(literals('.a { color: #fff; } .b { background: rgb(0 0 0 / .1); } .c { border-color: white; }').length, 3, 'hex, rgb() and a named colour are literals');
assert.deepEqual(literals('.a { color: hsl(var(--text, 0 0% 50%)); background: hsl(var(--surface) / .5); mask-image: url("data:image/svg+xml,<svg stroke=\'black\'/>"); font-family: "Albert Sans"; }'), [], 'a token, a token fallback, a mask and a font name are not');

const admin = fs.readFileSync('css/admin.css', 'utf8');
const studio = fs.readFileSync('css/studio-embed.css', 'utf8');
const { body: alias, rest: adminRules } = aliasBlock(admin);

// 1. no colour literal outside the alias block
for (const [file, css] of [['css/admin.css', adminRules], ['css/studio-embed.css', studio]]) {
  const bad = literals(css);
  assert.deepEqual(bad, [], `${file} spells a colour out instead of reading an SDK token (or one alias at the top of css/admin.css): ${bad.join(' | ')}`);
}
assert.deepEqual(literals(`.x{${alias}}`).filter((l) => !l.startsWith('--')), [], 'the alias block derives from SDK tokens too');

// 2. one token block: only admin.css's :root block defines tokens -- apart from the two scoped
//    re-points of --reference/--danger for elements whose own inline style names them (scripts write
//    var(--reference) for selection: --accent is the action colour since 2026-10-19, not a selection)
const outside = [...defined(adminRules)].filter((n) => !['--reference', '--danger'].includes(n));
assert.deepEqual(outside, [], 'css/admin.css defines tokens outside its alias block: ' + outside.join(', '));
assert.deepEqual([...defined(studio)], [], 'css/studio-embed.css defines tokens of its own: ' + [...defined(studio)].join(', ') + ' -- the editor has one token block, at the top of css/admin.css');
for (const name of ['--reference', '--danger']) {
  const lines = adminRules.split('}').filter((r) => new RegExp(name + '\\s*:').test(r));
  assert.equal(lines.length, 1, `exactly one rule re-points ${name}`);
  assert(/\[style\*="var\(/.test(lines[0]) && /:not\(\[style\*="\(var\(/.test(lines[0]), `${name} is re-pointed only on elements whose inline style writes var(${name}) as a colour, never on a swatch writing hsl(var(${name})): ${lines[0].trim()}`);
}

// 3 + 4. no retired Studio token, no script-colour name read by a rule
for (const [file, css] of [['css/admin.css', adminRules], ['css/studio-embed.css', studio]]) {
  const names = reads(css).map((r) => r.name.slice(2));
  const retired = names.filter((n) => RETIRED.includes(n));
  assert.deepEqual(retired, [], `${file} reads retired Studio tokens: ${retired.join(', ')}`);
  const scriptOnly = names.filter((n) => SCRIPT_COLOURS.includes(n));
  /* the re-point rules read --cms-*-color by design */
  const allowed = file === 'css/admin.css' ? ['cms-reference-color', 'cms-danger-color'] : [];
  assert.deepEqual(scriptOnly.filter((n) => !allowed.includes(n)), [], `${file} reads a script-facing complete colour (${scriptOnly.join(', ')}); read the SDK token instead`);
}

// 5. every token read is defined somewhere
const sdk = new Set([...defined(fs.readFileSync('css/themes.css', 'utf8')), ...defined(fs.readFileSync('css/flux-themes.css', 'utf8'))]);
const own = defined(`.x{${alias}}`);
for (const [file, css] of [['css/admin.css', admin], ['css/studio-embed.css', studio]]) {
  const missing = [...new Set(reads(css).filter((r) => !r.fallback && !sdk.has(r.name) && !own.has(r.name) && !SCRIPT_SET.includes(r.name.slice(2))).map((r) => r.name))];
  assert.deepEqual(missing, [], `${file} reads tokens nothing defines: ${missing.join(', ')}`);
}

// 6. one theme mechanism
for (const [file, css] of [['css/admin.css', admin], ['css/studio-embed.css', studio]]) {
  assert(!/prefers-color-scheme/.test(strip(css)), `${file} branches on prefers-color-scheme; the palette comes from html[data-theme]`);
  assert(!/\[data-theme/.test(strip(css)), `${file} styles a data-theme of its own; palettes live in css/flux-themes.css`);
}
for (const page of ['admin-app.html', 'admin.html']) {
  const html = fs.readFileSync(page, 'utf8');
  const boot = html.indexOf('<script src="js/bootstrap.js"></script>');
  assert(boot > 0 && boot < html.indexOf('css/admin.css'), `${page} applies the saved palette (js/bootstrap.js, not deferred) before its stylesheets`);
}

/* 7. A rule that paints both its own text and its own opaque background is readable (WCAG AA
   small text, 4.5:1) on EVERY palette, light and dark. The palette contract
   (tests/theme-color-contrast.cjs) guarantees text tokens on canvas and surface only; the
   editor also paints on --depth, --raised, --nested, --overlay, --accent-subtle and filled
   meaning colours, and light palettes became reachable here only with html[data-theme]. The
   pairs are read from the sheets, not listed: a new rule is checked the day it is written.
   (Text over an inherited background is measured in a real browser instead -- see the
   contrast audit in the token-unification notes; a stylesheet cannot know its ancestors.) */
{
  const curated = fs.readFileSync('css/flux-themes.css', 'utf8');
  const decl = (b) => Object.fromEntries([...b.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  const rules = [...curated.matchAll(/([^{}]+)\{([^}]+)\}/g)].map((m) => ({ sel: m[1].replace(/\/\*[\s\S]*?\*\//g, '').split(',').map((s) => s.trim()), d: decl(m[2]) }));
  const palettes = [...new Set([...curated.matchAll(/:root\[data-theme="([^"]+)"\]/g)].map((m) => m[1]))];
  const vars = (name) => { const v = {}; for (const r of rules) if (r.sel.some((s) => s === ':root' || s === `:root[data-theme="${name}"]`)) Object.assign(v, r.d); return v; };
  const resolve = (v, k, d = 0) => { assert(d < 8 && v[k] !== undefined, `--${k} resolves`); return v[k].replace(/var\(--([\w-]+)\)/g, (_, r) => resolve(v, r, d + 1)); };
  const rgb = (s) => { const [h, sa, l] = s.split(/[\s/%]+/).filter(Boolean).map(Number); const L = l / 100, S = sa / 100, c = (1 - Math.abs(2 * L - 1)) * S, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = L - c / 2; return (h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]).map((q) => q + m); };
  const lum = (c) => c.map((v) => (v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const pairs = new Map();
  for (const [file, css] of [['css/admin.css', adminRules], ['css/studio-embed.css', studio]]) {
    for (const [, sel, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const fg = /(?:^|;)\s*color:\s*hsl\(var\(--([\w-]+)\)\)/.exec(body), bg = /(?:^|;)\s*background(?:-color)?:\s*hsl\(var\(--([\w-]+)\)\)\s*(?:;|$)/.exec(body);
      if (fg && bg) pairs.set(`${fg[1]} on ${bg[1]}`, `${file} ${sel.trim().split('\n').pop().slice(0, 60)}`);
    }
  }
  assert(pairs.size >= 5, 'the pair reader finds the sheets\' text-on-fill rules (found ' + pairs.size + ')');
  const low = [];
  for (const name of palettes) {
    const v = vars(name);
    for (const [pair, where] of pairs) {
      const [fg, bg] = pair.split(' on ');
      const ratio = contrast(rgb(resolve(v, fg)), rgb(resolve(v, bg)));
      if (ratio < 4.5) low.push(`${name}: ${pair} ${ratio.toFixed(2)}:1 (${where})`);
    }
  }
  assert.deepEqual(low, [], 'editor text below WCAG AA on a palette:\n  ' + low.join('\n  '));
}

console.log(`PASS: the editor's two sheets read SDK tokens only (${new Set([...reads(admin), ...reads(studio)].map((r) => r.name)).size} distinct), one alias block, no colour literal, html[data-theme] for light and dark.`);
