/* Route metadata belongs to the shell; bodies and page modules do not.
   Every title (and the meta description js/ark/page-router.js applies on
   navigate) goes through ArkSEO, so each page editor's overrides reach
   every route without this file changing. seoId is the key ArkSEO.pages
   uses; 'zero' has none of its own -- its copy is the 'home' manifest, so
   its SEO entry is too. */
ArkUI.pageModules = Object.create(null);
function arkSeoTitle(id, fallbackLabel) { return typeof ArkSEO !== 'undefined' ? ArkSEO.pageTitle(id, fallbackLabel) : fallbackLabel; }
/* Which module draws each page and the scripts it needs: the loader's half of a page. Its path,
   name and journey are the other half and live in js/content/site-pages.js (ArkSitePages), the
   one table the menu, footer strip, sitemap and not-found page also read. `aliases` are old or
   alternative addresses that open the page: js/ark/page-router.js resolve() and
   scripts/lib/site-routes.mjs both read them here, so a retired path is retired in one place. */
var arkPageModules = {
  zero: { module: 'zero', scripts: ['js/resolvers/step.js', 'js/pages/home-flow.js', 'js/ark/dash-kit.js', 'js/ark/pulse-client.js', 'js/pages/home.js'] },
  chain: { module: 'chain', scripts: ['js/resolvers/step.js', 'js/pages/home-flow.js', 'js/ark/dash-kit.js', 'js/pages/chain.js'] },
  resolver: { module: 'resolverGuide', scripts: ['js/ark/dash-kit.js', 'js/pages/resolver-lab.js', 'js/pages/resolver-guide.js'] },
  references: { module: 'resolverGuide', scripts: ['js/ark/dash-kit.js', 'js/pages/resolver-guide.js'] },
  deployment: { module: 'deployment', scripts: ['js/ark/dash-kit.js', 'js/pages/deployment.js'] },
  /* the explorer used to live at /explorer; /explore is its address now */
  explorer: { module: 'explorer', aliases: ['/explorer'], scripts: ['js/ark/dash-kit.js', 'js/pages/explorer.js'] },
  palette: { module: 'palette', scripts: ['js/ark/dash-kit.js', 'js/pages/palette.js'] },
  /* /monitor was retired 2026-10-10; /stats carries the same live pulse now, plus the dated evidence the old page never had. */
  stats: { module: 'stats', aliases: ['/monitor'], scripts: ['js/ark/dash-kit.js', 'js/ark/pulse-client.js', 'js/ark/chain-pulse-client.js', 'js/ark/chain-fleet-capacity-client.js', 'js/pages/stats.js'] },
  'stats/gpu': { module: 'statsGpu', scripts: ['js/ark/dash-kit.js', 'js/pages/stats-gpu.js'] },
  'stats/ledger': { module: 'statsLedger', scripts: ['js/content/chain-sample.js', 'js/ark/dash-kit.js', 'js/pages/stats-ledger.js'] },
  'resolver-math': { module: 'resolverMath', scripts: ['js/ark/dash-kit.js', 'js/content/resolver-algebra.js', 'js/content/resolver-block.js', 'js/content/registry-snapshot.js', 'js/pages/resolver-math.js'] },
  resolvers: { module: 'resolvers', scripts: ['js/ark/dash-kit.js', 'js/content/registry-snapshot.js', 'js/content/resolver-applications.js', 'js/pages/resolvers.js'] },
  /* The Wallet tab's dense-wire modules (js/ark/dense-wire-wallet.mjs over
     js/dense-wire/*.mjs) are ES modules, which page-loader.js does not load:
     js/pages/account.js import()s them on first use instead. */
  account: { module: 'account', scripts: ['js/ark/ml-dsa.js', 'js/admin/vendor/auth-kit-create.js', 'js/ark/auth-kit-create-panel.js', 'js/admin/auth.js', 'js/ark/directory-transport.js', 'js/ark/mesh-directory-client.js', 'js/ark/ed25519-pem-browser.js', 'js/admin/vendor/flux-elements.js', 'js/admin/authorization-view.js', 'js/ark/authorization-dialog.js', 'js/ark/local-domains.js', 'js/ark/dash-kit.js', 'js/pages/account.js'] },
  'account/domains': { module: 'accountDomains', scripts: ['js/ark/local-domains.js', 'js/ark/dash-kit.js', 'js/pages/account-domains.js'] },
  treasury: { module: 'economyPreview', scripts: ['js/ark/dash-kit.js', 'js/pages/economy-preview.js'] },
  deposits: { module: 'economyPreview', scripts: ['js/ark/dash-kit.js', 'js/pages/economy-preview.js'] },
  /* /experiments and /experiments/lab were two pages for one interactive model, with the same
     h1 (docs/ux-audit/pages.md P3). They are one page now: the lab, introduced by the old entry
     page's lede and disclaimer (js/pages/lab.js). The old lab address and the retired Work page
     (`#work`, `#/work`) open it. */
  proximity: { module: 'lab', aliases: ['/experiments/lab', '/work', 'work'], scripts: ['js/studio.js', 'js/ark/dash-kit.js', 'js/pages/lab.js'] },
  learnings: { module: 'learnings', scripts: ['js/ark/dash-kit.js', 'js/resolvers/learnings.js', 'js/pages/learnings.js'] },
  about: { module: 'about', scripts: ['js/ark/dash-kit.js', 'js/pages/about.js'] },
  resolutions: { module: 'resolutions', scripts: ['js/ark/dash-kit.js', 'js/pages/resolutions.js'] },
  concept: { module: 'concept', scripts: ['js/ark/dash-kit.js', 'js/pages/concept.js'] },
  download: { module: 'download', scripts: ['js/ark/procedure-state.js', 'js/ark/dash-kit.js', 'js/pages/download.js'] },
  bundledeployer: { module: 'bundledeployer', scripts: ['js/ark/dash-kit.js', 'js/pages/bundle-deployer.js'] },
  deploy: { module: 'deploy', scripts: ['js/ark/procedure-state.js', 'js/ark/dash-kit.js', 'js/pages/deploy.js'] },
  dao: { module: 'dao', scripts: ['js/ark/dash-kit.js', 'js/pages/sheet.js', 'js/pages/dao.js'] },
  'how/ask': { module: 'howStory', scripts: ['js/ark/dash-kit.js', 'js/pages/how-stories.js'] },
  'how/work': { module: 'howStory', scripts: ['js/ark/dash-kit.js', 'js/pages/how-stories.js'] },
  'how/check': { module: 'howStory', scripts: ['js/ark/dash-kit.js', 'js/pages/how-stories.js'] },
  lifecycle: { module: 'lifecycle', scripts: ['js/ark/dash-kit.js', 'js/pages/lifecycle.js'] },
  'lifecycle/intent': { module: 'lifecycle', scripts: ['js/ark/dash-kit.js', 'js/pages/lifecycle.js'] },
  'lifecycle/offer': { module: 'lifecycle', scripts: ['js/ark/dash-kit.js', 'js/pages/lifecycle.js'] },
  'lifecycle/agreement': { module: 'lifecycle', scripts: ['js/ark/dash-kit.js', 'js/pages/lifecycle.js'] },
  'lifecycle/fulfillment': { module: 'lifecycle', scripts: ['js/ark/dash-kit.js', 'js/pages/lifecycle.js'] },
  'lifecycle/receipt': { module: 'lifecycle', scripts: ['js/ark/dash-kit.js', 'js/pages/lifecycle.js'] },
  reference: { module: 'reference', scripts: ['js/content/reference-text.js', 'js/pages/reference.js'] }
};
ArkUI.pageCatalog = {};
/* journey: which visitor path the page serves (ArkSitePages.journeys()); null keeps it out of
   every list. hiddenFromNavigation is the same fact for older readers: no journey, no menu. */
ArkSitePages.pages().forEach(function (row) {
  var loader = arkPageModules[row.key];
  if (!loader) throw new Error('js/content/site-pages.js lists the page "' + row.key + '", but js/pages/catalog.js has no module for it: add one to arkPageModules, or remove the row.');
  var entry = { path: row.path, title: arkSeoTitle(row.seoId || row.key, row.label), seoId: row.seoId || row.key, journey: row.journey, module: loader.module, scripts: loader.scripts };
  if (row.short) entry.short = row.short;
  if (loader.aliases) entry.aliases = loader.aliases;
  if (!row.journey) entry.hiddenFromNavigation = true;
  ArkUI.pageCatalog[row.key] = entry;
});
/* The five lifecycle stages, derived from the table's lifecycle/* rows (js/pages/lifecycle.js and
   the scene state read this list). */
ArkUI.lifecycleStages = ArkSitePages.pages().filter(function (row) { return row.key.indexOf('lifecycle/') === 0; })
  .map(function (row) { return { id: row.key.split('/')[1], title: row.short || row.label }; });
/* An address no page answers. js/ark/page-router.js resolve() returns this instead of quietly
   showing Home (docs/ux-audit/pages.md P8): the page names the address it was asked for and
   offers the closest pages and every journey's way in (js/pages/not-found.js). noindex: it is
   never a page to list. */
ArkUI.pageCatalog.notfound = { path: '/not-found', title: arkSeoTitle('notfound', 'Page not found'), journey: null, hiddenFromNavigation: true, noindex: true, module: 'notFound', scripts: ['js/ark/dash-kit.js', 'js/pages/not-found.js'] };
if (typeof ArkResolutions !== 'undefined') ArkResolutions.all().forEach(function (item) {
  ArkUI.pageCatalog['resolutions/' + item.slug] = {
    path: '/resolutions/' + item.slug,
    title: item.title + ' — DEFXN',
    seoId: 'resolutions/' + item.slug,
    module: 'resolutions',
    nestedNavigation: true,
    journey: ArkSitePages.journeyOf('resolutions/' + item.slug),
    scripts: ['js/ark/dash-kit.js', 'js/content/resolution-products.js', 'js/pages/resolutions.js']
  };
});
/* Articles and theory pages are routes DERIVED from the content registries, never listed: one
   function, so the editor's canvas derives an unsaved page's route exactly as the site derives a
   saved one (js/main.js, the CMS preview's 'defxn-cms-preview-state': a new page or article was
   invisible on the canvas until Save, because its route existed only here, at load --
   docs/ux-audit/cms.md P0-1; regression: tests/cms-draft-routes.cjs). Returns the keys it added.
   An article whose body is already in LearningContent (a draft the editor sent) is not given its
   body file, which does not exist until the draft is saved. */
ArkUI.catalogContentRoutes = function (articles, theoryManifests) {
  var added = [];
  (articles || []).forEach(function (article) {
    var key = 'article/' + article.slug, body = article.sections ? [] : ['js/content/articles/' + article.slug + '.js'];
    if (!ArkUI.pageCatalog[key]) added.push(key);
    ArkUI.pageCatalog[key] = { path: '/learnings/' + article.slug, title: typeof ArkSEO !== 'undefined' ? ArkSEO.articleTitle(article.slug, article.title) : article.title, seoArticle: article.slug, journey: ArkSitePages.journeyOf(key), module: 'article', scripts: ['js/ark/dash-kit.js'].concat(body, ['js/resolvers/learnings.js', 'js/pages/article.js']) };
  });
  (theoryManifests || []).forEach(function (m) {
    var key = 'concept/' + m.id, label = ArkCopy.text(m.id.toUpperCase() + '.TITLE').replace(/\.$/, '');
    if (!ArkUI.pageCatalog[key]) added.push(key);
    ArkUI.pageCatalog[key] = { path: m.route, title: arkSeoTitle(m.id, label), seoId: m.id, journey: ArkSitePages.journeyOf(key), module: 'theory', scripts: ['js/ark/dash-kit.js', 'js/pages/sheet.js', 'js/pages/theory.js'] };
  });
  return added;
};
ArkUI.catalogContentRoutes(LearningContent.articles, typeof ArkManifest !== 'undefined' ? ArkManifest.group('theory') : []);

