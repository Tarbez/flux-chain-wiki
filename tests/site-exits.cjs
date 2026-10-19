/* Every page can be reached from another page's body, and every page leaves somewhere.

   Named regressions (2026-10-19, docs/ux-audit/pages.md P2 and "Next-step links"):
   - /stats/gpu had no inbound link anywhere (its own comment said "Reached from /stats").
   - /start-from-something-real lost its only inbound link when /what-is-a-resolver moved onto
     js/pages/resolver-lab.js: the manifest's INSPECT.HREF survived, but only resolver-guide.js
     rendered it, in a branch that page never reached.
   - /resolver-math and /palette had no inbound link; /resolvers and /palette had no way out.
   - "↗" / the external-link icon sat on internal routes ("See how DEFXN works" on /about).
   The rendered check (real pages, real links) is tests/browser/site-fixes.mjs; this one holds
   the code that renders each link, so a refactor that drops one fails here first. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const read = (f) => fs.readFileSync(f, 'utf8');

assert(/pageLink\([^)]*'stats\/gpu'\)/.test(read('js/pages/stats.js')), '/stats links /stats/gpu');
assert(/linkEl\('Inspect reference evidence →', words\('INSPECT\.HREF'\)/.test(read('js/pages/resolver-lab.js')), '/what-is-a-resolver renders INSPECT.HREF (-> /start-from-something-real)');
assert(/"INSPECT\.HREF"[\s\S]{0,200}"value": "route:references"/.test(read('js/content/manifests/resolver.js')), 'and INSPECT.HREF still points at the reference resolvers');
const resolvers = read('js/pages/resolvers.js');
for (const target of ['resolver', 'resolver-math', 'references', 'deploy']) assert(resolvers.includes("'route:" + target + "'"), '/resolvers leads on to ' + target);
assert(/pageLink\('Browse resolvers →', 'resolvers'/.test(read('js/pages/resolver-math.js')), '/resolver-math leads on to /resolvers');
assert(/linkEl\('The math behind a resolver','route:resolver-math'\)/.test(read('js/pages/concept.js')), '/concept\'s evidence group opens /resolver-math');
assert(read('js/content/articles/the-grammar-does-almost-no-work.js').includes('"relatedPage": "route:resolver-math"'), 'the grammar article leads to /resolver-math');
assert(read('js/content/articles/how-we-got-fast-and-what-we-got-wrong.js').includes('"relatedPage": "route:stats/gpu"'), 'the speed article leads to /stats/gpu');
{
  const ctx = vm.createContext({ ArkCopy: { text: (k) => k } }); vm.runInContext(read('js/content/resolutions.js'), ctx);
  const byKey = Object.fromEntries(ctx.ArkResolutions.all().map((r) => [r.key, r]));
  assert.equal(byKey.RULES.also, 'resolver-math', '/resolutions/rules leads to /resolver-math');
  assert.equal(byKey.ALGORITHMS.also, 'resolver-math', '/resolutions/algorithms leads to /resolver-math');
  assert(/item\.also && ArkUI\.pageCatalog\[item\.also\]/.test(read('js/pages/resolutions.js')), 'and the detail page renders that link');
}
const palette = read('js/pages/palette.js');
assert(palette.includes("linkEl('← Home', 'route:zero'") && palette.includes("'Theme settings →'") && palette.includes(".settings-trigger"), '/palette has a way home and to the theme settings');
assert(/bind\('palette',\(\)=>\{const router=window\.ArkUI&&ArkUI\.pageRouter;[^}]*router\.navigate\('palette'\)/.test(read('scripts/settings-entry.js')), 'the theme settings panel links /palette');
assert(read('js/settings/panel.js').includes('See the full palette'), 'and the built panel carries it (node scripts/build-ark-vendor.cjs)');

// the external glyph only where a link leaves the site
const dash = vm.createContext({ URL, ArkUI: {}, location: { origin: 'https://defxn.com' }, document: { createElement: () => ({ dataset: {} }) } });
vm.runInContext(read('js/ark/dash-kit.js'), dash);
const icon = dash.ArkUI.dash.linkIcon;
const a = (href, target) => ({ target: target || '', getAttribute: () => href });
assert.equal(icon(a('/how-deployment-works')), 'arrow-right', 'an in-site route gets an arrow');
assert.equal(icon(a('/reference?doc=docs%2Fa.md')), 'arrow-right', 'the in-site reader gets an arrow');
assert.equal(icon(a('https://defxn.com/stats')), 'arrow-right', 'an absolute address on this origin is in-site');
assert.equal(icon(a('https://explore.defxn.com/')), 'open', 'another origin gets the leave-the-site glyph');
assert.equal(icon(a('/x', '_blank')), 'open', 'and so does a new tab');
for (const file of ['js/pages/about.js', 'js/pages/home.js']) assert(!/,\s*'open',\s*true\)/.test(read(file)), file + ' never hard-codes the external icon on a link');
for (const [file, re] of [['css/navigation.css', /\.ark-link::after \{ content:"↗"/], ['css/home.css', /home-question-links a::after \{ content:"↗"/], ['js/pages/lifecycle.js', /Read the agreement guide ↗/], ['js/pages/economy-preview.js', /label \+ ' ↗'/]])
  assert(!re.test(read(file)), file + ': internal links do not carry ↗');

console.log('PASS: the former orphans have inbound links, the former dead ends lead on, and ↗ marks only links that leave the site.');
