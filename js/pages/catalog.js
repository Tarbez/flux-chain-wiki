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
  zero: { path: '/', title: arkSeoTitle('home', ''), seoId: 'home', module: 'zero', scripts: ['js/resolvers/step.js', 'js/pages/home-flow.js', 'js/ark/pulse-client.js', 'js/pages/home.js'] },
  resolver: { path: '/what-is-a-resolver', title: arkSeoTitle('resolver', 'What is a resolver?'), seoId: 'resolver', module: 'resolverGuide', scripts: ['js/pages/resolver-lab.js', 'js/pages/resolver-guide.js'] },
  references: { path: '/start-from-something-real', title: arkSeoTitle('references', 'Start from something real'), seoId: 'references', module: 'resolverGuide', scripts: ['js/pages/resolver-guide.js'] },
  deployment: { path: '/how-deployment-works', title: arkSeoTitle('deployment', 'How Flux works'), seoId: 'deployment', module: 'deployment', scripts: ['js/pages/deployment.js'] },
  explorer: { path: '/explore', title: arkSeoTitle('explorer', 'Mesh Explorer'), seoId: 'explorer', module: 'explorer', scripts: ['js/pages/explorer.js'] },
  palette: { path: '/palette', title: arkSeoTitle('palette', 'Palette — DEFXN'), seoId: 'palette', module: 'palette', scripts: ['js/pages/palette.js'] },
  stats: { path: '/stats', title: arkSeoTitle('stats', 'Mesh performance — DEFXN'), seoId: 'stats', module: 'stats', scripts: ['js/content/stats-sample.js', 'js/ark/pulse-client.js', 'js/pages/stats.js'] },
  'stats/gpu': { path: '/stats/gpu', title: 'The GPU does nothing here — DEFXN', module: 'statsGpu', hiddenFromNavigation: true, scripts: ['js/pages/stats-gpu.js'] },
  'stats/ledger': { path: '/stats/ledger', title: 'A finance resolver by construction — DEFXN', module: 'statsLedger', hiddenFromNavigation: true, scripts: ['js/content/chain-sample.js', 'js/pages/stats-ledger.js'] },
  monitor: { path: '/monitor', title: arkSeoTitle('monitor', 'Mesh monitor — DEFXN'), seoId: 'monitor', module: 'monitor', scripts: ['js/ark/pulse-client.js', 'js/pages/monitor.js'] },
  account: { path: '/account', title: arkSeoTitle('account', 'Your account'), seoId: 'account', module: 'account', scripts: ['js/ark/ml-dsa.js', 'js/admin/vendor/auth-kit-create.js', 'js/ark/auth-kit-create-panel.js', 'js/admin/auth.js', 'js/ark/directory-transport.js', 'js/ark/mesh-directory-client.js', 'js/ark/ed25519-pem-browser.js', 'js/admin/vendor/flux-elements.js', 'js/admin/authorization-view.js', 'js/ark/authorization-dialog.js', 'js/ark/fabric-transfer-browser.js', 'js/ark/value-registries-client.js', 'js/ark/local-domains.js', 'js/pages/account.js'] },
  'account/domains': { path: '/account/domains', title: 'Your domains — DEFXN', seoId: 'account/domains', module: 'accountDomains', scripts: ['js/ark/local-domains.js', 'js/pages/account-domains.js'] },
  treasury: { path: '/treasury', title: arkSeoTitle('treasury', 'Treasury preview'), seoId: 'treasury', module: 'economyPreview', scripts: ['js/pages/economy-preview.js'] },
  deposits: { path: '/deposits', title: arkSeoTitle('deposits', 'Deposit preview'), seoId: 'deposits', module: 'economyPreview', scripts: ['js/pages/economy-preview.js'] },
  proximity: { path: '/experiments', title: arkSeoTitle('proximity', 'Interactive model'), seoId: 'proximity', module: 'proximity', scripts: ['js/resolvers/experiment.js', 'js/pages/experiments.js'] },
  lab: { path: '/experiments/lab', title: arkSeoTitle('lab', 'Interactive model'), seoId: 'lab', module: 'lab', scripts: ['js/studio.js', 'js/pages/lab.js'] },
  learnings: { path: '/learnings', title: arkSeoTitle('learnings', 'Notes'), seoId: 'learnings', module: 'learnings', scripts: ['js/resolvers/learnings.js', 'js/pages/learnings.js'] },
  about: { path: '/about', title: arkSeoTitle('about', 'Protocol overview'), seoId: 'about', module: 'about', scripts: ['js/pages/about.js'] },
  resolutions: { path: '/resolutions', title: arkSeoTitle('resolutions', 'Resolutions'), seoId: 'resolutions', module: 'resolutions', scripts: ['js/pages/resolutions.js'] },
  concept: { path: '/concept', title: arkSeoTitle('concept', 'The Flux spec'), seoId: 'concept', module: 'concept', scripts: ['js/pages/concept.js'] },
  download: { path: '/download', title: arkSeoTitle('download', 'Run DEFXN from source'), seoId: 'download', module: 'download', scripts: ['js/ark/procedure-state.js', 'js/pages/download.js'] },
  bundledeployer: { path: '/bundle-deployer', title: arkSeoTitle('bundledeployer', 'FXN Bundle Deployer'), seoId: 'bundledeployer', module: 'bundledeployer', scripts: ['js/pages/bundle-deployer.js'] },
  deploy: { path: '/deploy', title: arkSeoTitle('deploy', 'Create or join a network'), seoId: 'deploy', module: 'deploy', scripts: ['js/ark/procedure-state.js', 'js/pages/deploy.js'] },
  dao: { path: '/dao', title: arkSeoTitle('dao', 'Governance'), seoId: 'dao', module: 'dao', scripts: ['js/pages/sheet.js', 'js/pages/dao.js'] }
};
if (typeof ArkResolutions !== 'undefined') ArkResolutions.all().forEach(function (item) {
  ArkUI.pageCatalog['resolutions/' + item.slug] = {
    path: '/resolutions/' + item.slug,
    title: item.title + ' — DEFXN',
    seoId: 'resolutions/' + item.slug,
    module: 'resolutions',
    nestedNavigation: true,
    scripts: ['js/content/resolution-products.js', 'js/pages/resolutions.js']
  };
});
['ask','work','check'].forEach(function(id,i){
  ArkUI.pageCatalog['how/'+id]={path:'/how-deployment-works/'+id,title:['State the request','Agree on the terms','Verify the result'][i]+' — DEFXN',module:'howStory',hiddenFromNavigation:true,scripts:['js/pages/how-stories.js']};
});
ArkUI.pageCatalog.lifecycle = {
  path: '/lifecycle', title: arkSeoTitle('lifecycle', 'Agreement lifecycle'), seoId: 'lifecycle',
  module: 'lifecycle', scripts: ['js/pages/lifecycle.js']
};
ArkUI.lifecycleStages.forEach(function (stage) {
  var key = 'lifecycle/' + stage.id;
  ArkUI.pageCatalog[key] = {
    path: '/' + key,
    title: arkSeoTitle(key, stage.title + ' / Agreement lifecycle'),
    seoId: key,
    module: 'lifecycle',
    scripts: ['js/pages/lifecycle.js']
  };
});
LearningContent.articles.forEach(function (article) {
  ArkUI.pageCatalog['article/' + article.slug] = { path: '/learnings/' + article.slug, title: typeof ArkSEO !== 'undefined' ? ArkSEO.articleTitle(article.slug, article.title) : article.title, seoArticle: article.slug, module: 'article', scripts: ['js/content/articles/' + article.slug + '.js', 'js/resolvers/learnings.js', 'js/pages/article.js'] };
});
if (typeof ArkManifest !== 'undefined') ArkManifest.group('theory').forEach(function (m) {
  var label = ArkCopy.text(m.id.toUpperCase() + '.TITLE').replace(/\.$/, '');
  ArkUI.pageCatalog['concept/' + m.id] = { path: m.route, title: arkSeoTitle(m.id, label), seoId: m.id, module: 'theory', scripts: ['js/pages/sheet.js', 'js/pages/theory.js'] };
});

ArkUI.pageCatalog.reference = { path:'/reference', title:'Canonical reference — Flux Protocol', module:'reference', hiddenFromNavigation:true, scripts:['js/content/reference-text.js','js/pages/reference.js'] };
