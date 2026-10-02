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
  zero: { path: '/', title: arkSeoTitle('home', ''), seoId: 'home', module: 'zero', scripts: ['js/resolvers/step.js', 'js/pages/home.js'] },
  resolver: { path: '/what-is-a-resolver', title: arkSeoTitle('resolver', 'What is a resolver?'), seoId: 'resolver', module: 'resolverGuide', scripts: ['js/pages/resolver-guide.js'] },
  references: { path: '/start-from-something-real', title: arkSeoTitle('references', 'Start from something real'), seoId: 'references', module: 'resolverGuide', scripts: ['js/pages/resolver-guide.js'] },
  deployment: { path: '/how-deployment-works', title: arkSeoTitle('deployment', 'How Flux works'), seoId: 'deployment', module: 'deployment', scripts: ['js/pages/deployment.js'] },
  explorer: { path: '/explore', title: arkSeoTitle('explorer', 'Mesh Explorer'), seoId: 'explorer', module: 'explorer', scripts: ['js/pages/explorer.js'] },
  account: { path: '/account', title: arkSeoTitle('account', 'Your account'), seoId: 'account', module: 'account', scripts: ['js/admin/auth.js', 'js/pages/account.js'] },
  treasury: { path: '/treasury', title: arkSeoTitle('treasury', 'Treasury preview'), seoId: 'treasury', module: 'economyPreview', scripts: ['js/pages/economy-preview.js'] },
  deposits: { path: '/deposits', title: arkSeoTitle('deposits', 'Deposit preview'), seoId: 'deposits', module: 'economyPreview', scripts: ['js/pages/economy-preview.js'] },
  proximity: { path: '/experiments', title: arkSeoTitle('proximity', 'Interactive model'), seoId: 'proximity', module: 'proximity', scripts: ['js/resolvers/experiment.js', 'js/pages/experiments.js'] },
  lab: { path: '/experiments/lab', title: arkSeoTitle('lab', 'Interactive model'), seoId: 'lab', module: 'lab', scripts: ['js/studio.js', 'js/pages/lab.js'] },
  learnings: { path: '/learnings', title: arkSeoTitle('learnings', 'Notes'), seoId: 'learnings', module: 'learnings', scripts: ['js/resolvers/learnings.js', 'js/pages/learnings.js'] },
  about: { path: '/about', title: arkSeoTitle('about', 'Protocol overview'), seoId: 'about', module: 'about', scripts: ['js/pages/sheet.js', 'js/pages/about.js'] },
  concept: { path: '/concept', title: arkSeoTitle('concept', 'The Flux spec'), seoId: 'concept', module: 'concept', scripts: ['js/pages/concept.js'] },
  download: { path: '/download', title: arkSeoTitle('download', 'Run Flux from source'), seoId: 'download', module: 'download', scripts: ['js/ark/procedure-state.js', 'js/pages/sheet.js', 'js/pages/download.js'] },
  deploy: { path: '/deploy', title: arkSeoTitle('deploy', 'Create or join a network'), seoId: 'deploy', module: 'deploy', scripts: ['js/ark/procedure-state.js', 'js/pages/deploy.js'] },
  dao: { path: '/dao', title: arkSeoTitle('dao', 'Governance'), seoId: 'dao', module: 'dao', scripts: ['js/pages/sheet.js', 'js/pages/dao.js'] }
};
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
