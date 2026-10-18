/* Named regressions: the same main CTA was painted nine different ways across
   page stylesheets (solid, 8% and 9% alpha tints, outlines) and "Run DEFXN"
   changed per route; ~190 ad-hoc opacity tints stood in for shades; hover and
   selected states borrowed the identity color. The component layer is the one
   authority for interactive color, and pages use the shade ladders. */
const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('index.html', 'utf8');
const sheets = [...index.matchAll(/<link rel="stylesheet" href="(css\/[^"?]+)/g)].map(m => m[1]);
assert.equal(sheets[sheets.length - 1], 'css/components.css', 'components.css loads last, so it decides interactive paint');

const components = fs.readFileSync('css/components.css', 'utf8');
for (const variant of ['solid', 'soft', 'quiet', 'choice', 'link'])
  assert(components.includes(`/* ${variant} `), `components.css defines the ${variant} variant`);
for (const cls of ['.home-primary-cta', '.resolver-story-primary', '.about-primary-action', '.story-primary', '.mechanism-next', '.header-run-link', '.home-ghost-cta', '.resolutions-domain-tab'])
  assert(components.includes(cls), `${cls} is painted by the component layer`);

const exempt = new Set(['css/flux-themes.css', 'css/themes.css', 'css/components.css', 'css/palette.css', 'css/admin.css', 'css/studio-embed.css']);
const pageSheets = fs.readdirSync('css').map(f => 'css/' + f).filter(f => f.endsWith('.css') && !exempt.has(f));
for (const file of pageSheets) {
  const css = fs.readFileSync(file, 'utf8');
  // Action color belongs to components only (the --signal-* shorthand definitions excepted).
  const action = css.split('\n').filter(l => /var\(--(secondary|complement|action)[-)]/.test(l) && !/--signal-complement:/.test(l));
  assert.deepEqual(action, [], `${file} paints with the action color outside components.css`);
  // Tints come from the shade ladders, not ad-hoc opacity on a role ink.
  const tints = css.match(/hsl\(var\(--(primary|accent|complement|secondary|reference)\)\s*\/[^)]*\)/g) || [];
  assert.deepEqual(tints, [], `${file} uses ad-hoc role tints instead of shade tokens`);
  // Interaction states never borrow the identity color.
  for (const [, sel, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/:hover|:focus|:active|aria-pressed|aria-selected|aria-current|aria-expanded|data-active/.test(sel) || /primary-cta/.test(sel)) continue;
    assert(!/var\(--(primary|accent)(-\d00|-subtle|-strong)?\)/.test(body), `${file}: "${sel.trim().slice(0, 70)}" paints an interaction state with the identity color`);
  }
}
/* A grid span with no CSS rule silently becomes one column of twelve, and the
   panel renders one word per line. It looks like a broken page and passes every
   test that only checks the DOM, because the markup is correct. /resolver-math
   shipped exactly that on 2026-10-10 with dash-span-6 undefined. Every span a
   page asks for must exist in the sheet that owns the grid. */
const dashCss = fs.readFileSync('css/stats-dashboard.css', 'utf8');
const definedSpans = new Set([...dashCss.matchAll(/\.dash-span-(\d+)\s*\{/g)].map(m => m[1]));
const usingFiles = fs.readdirSync('js/pages').map(f => 'js/pages/' + f)
  .concat(fs.readdirSync('js/ark').map(f => 'js/ark/' + f))
  .filter(f => f.endsWith('.js'));
for (const file of usingFiles) {
  const used = new Set([...fs.readFileSync(file, 'utf8').matchAll(/dash-span-(\d+)/g)].map(m => m[1]));
  for (const span of used)
    assert(definedSpans.has(span),
      `${file} uses dash-span-${span}, which css/stats-dashboard.css does not define. ` +
      `It will occupy one column of twelve and the panel will render one word per line. ` +
      `Defined: ${[...definedSpans].sort((a, b) => a - b).join(', ')}.`);
}

console.log('PASS: one component layer paints every action and state; pages use shade tokens; interaction never borrows the identity color.');
