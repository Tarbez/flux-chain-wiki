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

// /stats, /resolvers and /resolver-math are pages of Ark blocks since 2026-10-19 (W3-STATS): their
// exits are route: links in the spec (tests/stats-page.cjs, tests/resolvers-blocks.cjs and
// tests/resolver-math-blocks.cjs check they render as router links).
assert(read('js/pages/stats.js').includes("href: 'route:stats/gpu'"), '/stats links /stats/gpu');
// /what-is-a-resolver is the story template since 2026-10-19 (W3-GUIDE): the link is a related page in its pager.
assert(/\{ label: ArkSitePages\.row\('references'\)\.label, href: words\('INSPECT\.HREF'\) \}/.test(read('js/pages/resolver-lab.js')), '/what-is-a-resolver renders INSPECT.HREF (-> /start-from-something-real), named by that page\'s label');
assert(/"INSPECT\.HREF"[\s\S]{0,200}"value": "route:references"/.test(read('js/content/manifests/resolver.js')), 'and INSPECT.HREF still points at the reference resolvers');
const resolvers = read('js/pages/resolvers.js');
for (const target of ['resolver', 'resolver-math', 'references', 'deploy']) assert(resolvers.includes("'route:" + target + "'"), '/resolvers leads on to ' + target);
assert(/\{ label: 'Browse resolvers', href: 'route:resolvers' \}/.test(read('js/pages/resolver-math.js')), '/resolver-math leads on to /resolvers');
// /concept is a page of Ark blocks since 2026-10-19 (tests/story-blocks.cjs): the evidence group's last card.
assert(/if \(group === 'more'\) items\.push\(\{ title: 'The math behind a resolver', description: 'Resolver math \/ open the page', href: 'route:resolver-math' \}\);/.test(read('js/pages/concept.js')), '/concept\'s evidence group opens /resolver-math');
assert(read('js/content/articles/the-grammar-does-almost-no-work.js').includes('"relatedPage": "route:resolver-math"'), 'the grammar article leads to /resolver-math');
assert(read('js/content/articles/how-we-got-fast-and-what-we-got-wrong.js').includes('"relatedPage": "route:stats/gpu"'), 'the speed article leads to /stats/gpu');
{
  const ctx = vm.createContext({ ArkCopy: { text: (k) => k } }); vm.runInContext(read('js/content/resolutions.js'), ctx);
  const byKey = Object.fromEntries(ctx.ArkResolutions.all().map((r) => [r.key, r]));
  assert.equal(byKey.RULES.also, 'resolver-math', '/resolutions/rules leads to /resolver-math');
  assert.equal(byKey.ALGORITHMS.also, 'resolver-math', '/resolutions/algorithms leads to /resolver-math');
  assert(/item\.also && ArkUI\.pageCatalog\[item\.also\]/.test(read('js/pages/resolutions.js')), 'and the detail page renders that link');
  // W5-PAGES: a second page (`alsoMore`) is its own map, and `also` stays one page (a string)
  assert.equal(typeof byKey.ALGORITHMS.also, 'string', '`also` is still one page');
  assert.equal(byKey.ALGORITHMS.alsoMore, 'resolvers', '/resolutions/algorithms also leads to /resolvers (what resolves it)');
  assert(/item\.alsoMore/.test(read('js/pages/resolutions.js')), 'and the detail page renders that link');
}
// W5-PAGES (ledger 3.4-x): /chain's two ways on are manifest fields AND rendered (a field nothing reads is a dead field)
{
  const chainManifest = read('js/content/manifests/chain.js'), chainPage = read('js/pages/chain.js');
  for (const [field, value] of [['SOURCE.LINK', 'Where do resolver chains come from?'], ['SOURCE.HREF', 'route:resolver'], ['NEXT.HREF', 'route:resolvers']])
    assert(new RegExp('"' + field.replace('.', '\\.') + '"[\\s\\S]{0,160}"value": "' + value.replace(/[?]/g, '\\?') + '"').test(chainManifest), '/chain manifest holds ' + field);
  assert(chainPage.includes("'copy:CHAIN.SOURCE.LINK'") && chainPage.includes("ArkCopy.text('CHAIN.SOURCE.HREF')") && chainPage.includes("ArkCopy.text('CHAIN.NEXT.HREF')"), '/chain renders all three: the page keeps no copy of the words or routes');
  assert(!/href: 'route:resolvers?'/.test(chainPage), 'and types no route of its own for them');
}
const palette = read('js/pages/palette.js');
// /palette is a spec of Ark blocks since 2026-10-19: its way home is an actions item routed to
// zero, and Theme settings an action the page opens (tests/palette-blocks.cjs renders both).
assert(/\{ label: 'Home', href: 'route:zero'/.test(palette) && /label: 'Theme settings', action: 'open-theme-settings'/.test(palette) && palette.includes("'open-theme-settings': function") && palette.includes(".settings-trigger"), '/palette has a way home and to the theme settings');
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

// W4-S14 (2026-10-20, ledger WR-3 and the lifecycle / sheet next-step rows): the Laws step led to the registry, the math and the examples but
// not to the list of what resolves; the lifecycle and the sheets named no way out of their own journey. Both are derived from the journey
// table (js/ark/page-kit.js), never typed: no page is named in the code that renders them.
{
  assert(/ArkUI\.journeyLead\(page\)/.test(read('js/pages/resolver-lab.js')) && /concat\(\[\{ label: ArkSitePages\.row\('references'\)\.label[^\n]*resolutions\) \}/.test(read('js/pages/resolver-lab.js')), '/what-is-a-resolver\'s pager leads on to the journey\'s start (Resolutions)');
  const kit = read('js/ark/page-kit.js');
  assert(!/route:(resolutions|stats|proximity|download)/.test(kit.replace(/\/\*[\s\S]*?\*\//g, '')), 'the page kit names no page: its links come from ArkSitePages');
  const ctx = vm.createContext({ ArkUI: { el: () => ({}) }, window: {} });
  vm.runInContext(read('js/content/site-pages.js') + '\n;this.ArkSitePages = ArkSitePages;', ctx);
  vm.runInContext(kit, ctx);
  const hrefs = (key) => JSON.parse(JSON.stringify(ctx.ArkUI.nextSteps(key).map((item) => item.href))); // out of the vm realm, for deepStrictEqual
  assert.deepEqual(hrefs('lifecycle/receipt'), ['route:resolutions', 'route:stats', 'route:proximity'], '/lifecycle/receipt leads out: resolve something, the evidence, the model');
  assert.deepEqual(hrefs('lifecycle'), hrefs('concept/practice'), 'the lifecycle and the sheets share one rule');
  assert(hrefs('dao').includes('route:proximity') && hrefs('concept/practice').includes('route:proximity'), '/dao and /concept/practice lead to the interactive model (/experiments)');
  assert.deepEqual(hrefs('proximity'), [], 'the last journey has no journey after it');
  assert.equal(ctx.ArkUI.journeyLead('resolver').href, 'route:resolutions', 'the start of the build journey is Resolutions');
  assert.equal(ctx.ArkUI.journeyLead('resolutions'), null, 'a journey\'s own start does not lead to itself');
  for (const file of ['js/pages/lifecycle.js', 'js/pages/sheet.js']) assert(/ArkUI\.nextSteps\(/.test(read(file)), file + ' takes its ways on from ArkUI.nextSteps');
}
// S8 (ledger /experiments P3): the model's state is written to and restored from its catalog address, not the alias.
{
  const studio = read('js/studio.js');
  assert(!/'\/experiments\/lab'/.test(studio), 'js/studio.js names no address of its own: the model\'s path is its catalog entry\'s');
  assert(/module === 'lab'/.test(studio) && /ArkUI\.route\.write\(home\.path,/.test(studio) && /home\.paths\.indexOf\(ArkUI\.route\.path\(\)\)<0/.test(studio), 'it writes to the canonical path and restores from it and its old addresses');
  assert(!/-H-#\/experiments\/lab/.test(read('js/scene.flux.js')), 'the shell pattern links /experiments, not the merged-away address');
}

console.log('PASS: the former orphans have inbound links, the former dead ends lead on, and ↗ marks only links that leave the site.');
