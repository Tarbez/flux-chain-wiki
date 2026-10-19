/* Route metadata belongs to the shell; bodies and page modules do not.
   Every title (and the meta description js/ark/page-router.js applies on
   navigate) goes through ArkSEO, so each page editor's overrides reach
   every route without this file changing. seoId is the key ArkSEO.pages
   uses; 'zero' has none of its own -- its copy is the 'home' manifest, so
   its SEO entry is too. */
ArkUI.pageModules = Object.create(null);
function arkSeoTitle(id, fallbackLabel) { return typeof ArkSEO !== 'undefined' ? ArkSEO.pageTitle(id, fallbackLabel) : fallbackLabel; }
ArkUI.lifecycleStages = [
  { id: 'intent', title: 'Intent' },
  { id: 'offer', title: 'Offer' },
  { id: 'agreement', title: 'Agreement' },
  { id: 'fulfillment', title: 'Fulfillment' },
  { id: 'receipt', title: 'Receipt' }
];
ArkUI.pageCatalog = {
  zero: { path: '/', title: arkSeoTitle('home', ''), seoId: 'home', module: 'zero', scripts: ['js/resolvers/step.js', 'js/pages/home-flow.js', 'js/ark/dash-kit.js', 'js/ark/pulse-client.js', 'js/pages/home.js'] },
  chain: { path: '/chain', title: arkSeoTitle('chain', 'Every identity, its own chain'), seoId: 'chain', module: 'chain', scripts: ['js/resolvers/step.js', 'js/pages/home-flow.js', 'js/ark/dash-kit.js', 'js/pages/chain.js'] },
  resolver: { path: '/what-is-a-resolver', title: arkSeoTitle('resolver', 'What is a resolver?'), seoId: 'resolver', module: 'resolverGuide', scripts: ['js/ark/dash-kit.js', 'js/pages/resolver-lab.js', 'js/pages/resolver-guide.js'] },
  references: { path: '/start-from-something-real', title: arkSeoTitle('references', 'Start from something real'), seoId: 'references', module: 'resolverGuide', scripts: ['js/ark/dash-kit.js', 'js/pages/resolver-guide.js'] },
  deployment: { path: '/how-deployment-works', title: arkSeoTitle('deployment', 'How Flux works'), seoId: 'deployment', module: 'deployment', scripts: ['js/ark/dash-kit.js', 'js/pages/deployment.js'] },
  explorer: { path: '/explore', title: arkSeoTitle('explorer', 'Mesh Explorer'), seoId: 'explorer', module: 'explorer', scripts: ['js/ark/dash-kit.js', 'js/pages/explorer.js'] },
  palette: { path: '/palette', title: arkSeoTitle('palette', 'Palette'), seoId: 'palette', module: 'palette', scripts: ['js/pages/palette.js'] },
  stats: { path: '/stats', title: arkSeoTitle('stats', 'Mesh performance'), seoId: 'stats', module: 'stats', scripts: ['js/ark/dash-kit.js', 'js/content/resolver-registry.js', 'js/ark/pulse-client.js', 'js/ark/chain-pulse-client.js', 'js/ark/chain-fleet-capacity-client.js', 'js/pages/stats.js'] },
  'stats/gpu': { path: '/stats/gpu', title: arkSeoTitle('stats/gpu', 'The GPU does nothing here'), seoId: 'stats/gpu', module: 'statsGpu', hiddenFromNavigation: true, scripts: ['js/ark/dash-kit.js', 'js/pages/stats-gpu.js'] },
  'stats/ledger': { path: '/stats/ledger', title: arkSeoTitle('stats/ledger', 'A finance resolver by construction'), seoId: 'stats/ledger', module: 'statsLedger', hiddenFromNavigation: true, scripts: ['js/content/chain-sample.js', 'js/ark/dash-kit.js', 'js/pages/stats-ledger.js'] },
  'resolver-math': { path: '/resolver-math', title: arkSeoTitle('resolvermath', 'Resolver Math — DEFXN'), seoId: 'resolvermath', module: 'resolverMath', scripts: ['js/ark/dash-kit.js', 'js/content/resolver-algebra.js', 'js/content/resolver-block.js', 'js/pages/resolver-math.js'] },
  resolvers: { path: '/resolvers', title: arkSeoTitle('resolvers', 'FXN resolvers'), seoId: 'resolvers', module: 'resolvers', scripts: ['js/content/resolver-registry.js', 'js/pages/resolvers.js'] },
  /* The Wallet tab's dense-wire modules (js/ark/dense-wire-wallet.mjs over
     js/dense-wire/*.mjs) are ES modules, which page-loader.js does not load:
     js/pages/account.js import()s them on first use instead. */
  account: { path: '/account', title: arkSeoTitle('account', 'Your account'), seoId: 'account', module: 'account', scripts: ['js/ark/ml-dsa.js', 'js/admin/vendor/auth-kit-create.js', 'js/ark/auth-kit-create-panel.js', 'js/admin/auth.js', 'js/ark/directory-transport.js', 'js/ark/mesh-directory-client.js', 'js/ark/ed25519-pem-browser.js', 'js/admin/vendor/flux-elements.js', 'js/admin/authorization-view.js', 'js/ark/authorization-dialog.js', 'js/ark/local-domains.js', 'js/ark/dash-kit.js', 'js/pages/account.js'] },
  'account/domains': { path: '/account/domains', title: arkSeoTitle('account/domains', 'Your domains'), seoId: 'account/domains', module: 'accountDomains', scripts: ['js/ark/local-domains.js', 'js/ark/dash-kit.js', 'js/pages/account-domains.js'] },
  treasury: { path: '/treasury', title: arkSeoTitle('treasury', 'Treasury preview'), seoId: 'treasury', module: 'economyPreview', scripts: ['js/ark/dash-kit.js', 'js/pages/economy-preview.js'] },
  deposits: { path: '/deposits', title: arkSeoTitle('deposits', 'Deposit preview'), seoId: 'deposits', module: 'economyPreview', scripts: ['js/ark/dash-kit.js', 'js/pages/economy-preview.js'] },
  proximity: { path: '/experiments', title: arkSeoTitle('proximity', 'Interactive model'), seoId: 'proximity', module: 'proximity', scripts: ['js/ark/dash-kit.js', 'js/resolvers/experiment.js', 'js/pages/experiments.js'] },
  lab: { path: '/experiments/lab', title: arkSeoTitle('lab', 'Interactive model'), seoId: 'lab', module: 'lab', scripts: ['js/studio.js', 'js/ark/dash-kit.js', 'js/pages/lab.js'] },
  learnings: { path: '/learnings', title: arkSeoTitle('learnings', 'Notes'), seoId: 'learnings', module: 'learnings', scripts: ['js/ark/dash-kit.js', 'js/resolvers/learnings.js', 'js/pages/learnings.js'] },
  about: { path: '/about', title: arkSeoTitle('about', 'Protocol overview'), seoId: 'about', module: 'about', scripts: ['js/ark/dash-kit.js', 'js/pages/about.js'] },
  resolutions: { path: '/resolutions', title: arkSeoTitle('resolutions', 'Resolutions'), seoId: 'resolutions', module: 'resolutions', scripts: ['js/ark/dash-kit.js', 'js/pages/resolutions.js'] },
  concept: { path: '/concept', title: arkSeoTitle('concept', 'The Flux spec'), seoId: 'concept', module: 'concept', scripts: ['js/ark/dash-kit.js', 'js/pages/concept.js'] },
  download: { path: '/download', title: arkSeoTitle('download', 'Run DEFXN from source'), seoId: 'download', module: 'download', scripts: ['js/ark/procedure-state.js', 'js/ark/dash-kit.js', 'js/pages/download.js'] },
  bundledeployer: { path: '/bundle-deployer', title: arkSeoTitle('bundledeployer', 'FXN Bundle Deployer'), seoId: 'bundledeployer', module: 'bundledeployer', scripts: ['js/ark/dash-kit.js', 'js/pages/bundle-deployer.js'] },
  deploy: { path: '/deploy', title: arkSeoTitle('deploy', 'Create or join a network'), seoId: 'deploy', module: 'deploy', scripts: ['js/ark/procedure-state.js', 'js/ark/dash-kit.js', 'js/pages/deploy.js'] },
  dao: { path: '/dao', title: arkSeoTitle('dao', 'Governance'), seoId: 'dao', module: 'dao', scripts: ['js/ark/dash-kit.js', 'js/pages/sheet.js', 'js/pages/dao.js'] }
};
if (typeof ArkResolutions !== 'undefined') ArkResolutions.all().forEach(function (item) {
  ArkUI.pageCatalog['resolutions/' + item.slug] = {
    path: '/resolutions/' + item.slug,
    title: item.title + ' — DEFXN',
    seoId: 'resolutions/' + item.slug,
    module: 'resolutions',
    nestedNavigation: true,
    scripts: ['js/ark/dash-kit.js', 'js/content/resolution-products.js', 'js/pages/resolutions.js']
  };
});
['ask','work','check'].forEach(function(id,i){
  ArkUI.pageCatalog['how/'+id]={path:'/how-deployment-works/'+id,title:arkSeoTitle('how/'+id,['State the request','Agree on the terms','Verify the result'][i]),seoId:'how/'+id,module:'howStory',hiddenFromNavigation:true,scripts:['js/ark/dash-kit.js','js/pages/how-stories.js']};
});
ArkUI.pageCatalog.lifecycle = {
  path: '/lifecycle', title: arkSeoTitle('lifecycle', 'Agreement lifecycle'), seoId: 'lifecycle',
  module: 'lifecycle', scripts: ['js/ark/dash-kit.js', 'js/pages/lifecycle.js']
};
ArkUI.lifecycleStages.forEach(function (stage) {
  var key = 'lifecycle/' + stage.id;
  ArkUI.pageCatalog[key] = {
    path: '/' + key,
    title: arkSeoTitle(key, stage.title + ' / Agreement lifecycle'),
    seoId: key,
    module: 'lifecycle',
    scripts: ['js/ark/dash-kit.js', 'js/pages/lifecycle.js']
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
    ArkUI.pageCatalog[key] = { path: '/learnings/' + article.slug, title: typeof ArkSEO !== 'undefined' ? ArkSEO.articleTitle(article.slug, article.title) : article.title, seoArticle: article.slug, module: 'article', scripts: ['js/ark/dash-kit.js'].concat(body, ['js/resolvers/learnings.js', 'js/pages/article.js']) };
  });
  (theoryManifests || []).forEach(function (m) {
    var key = 'concept/' + m.id, label = ArkCopy.text(m.id.toUpperCase() + '.TITLE').replace(/\.$/, '');
    if (!ArkUI.pageCatalog[key]) added.push(key);
    ArkUI.pageCatalog[key] = { path: m.route, title: arkSeoTitle(m.id, label), seoId: m.id, module: 'theory', scripts: ['js/ark/dash-kit.js', 'js/pages/sheet.js', 'js/pages/theory.js'] };
  });
  return added;
};
ArkUI.catalogContentRoutes(LearningContent.articles, typeof ArkManifest !== 'undefined' ? ArkManifest.group('theory') : []);

ArkUI.pageCatalog.reference = { path:'/reference', title:arkSeoTitle('reference', 'Canonical reference'), seoId:'reference', module:'reference', hiddenFromNavigation:true, scripts:['js/content/reference-text.js','js/pages/reference.js'] };
