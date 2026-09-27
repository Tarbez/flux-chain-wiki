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
  deployment: { path: '/how-deployment-works', title: arkSeoTitle('deployment', 'How deployment works'), seoId: 'deployment', module: 'resolverGuide', scripts: ['js/pages/resolver-guide.js'] },
  proximity: { path: '/experiments', title: arkSeoTitle('proximity', 'Demo'), seoId: 'proximity', module: 'proximity', scripts: ['js/resolvers/experiment.js', 'js/pages/experiments.js'] },
  lab: { path: '/experiments/lab', title: arkSeoTitle('lab', 'The open lab'), seoId: 'lab', module: 'lab', scripts: ['js/studio.js', 'js/pages/lab.js'] },
  learnings: { path: '/learnings', title: arkSeoTitle('learnings', 'Notes'), seoId: 'learnings', module: 'learnings', scripts: ['js/resolvers/learnings.js', 'js/pages/learnings.js'] },
  about: { path: '/about', title: arkSeoTitle('about', 'About us'), seoId: 'about', module: 'about', scripts: ['js/pages/sheet.js', 'js/pages/about.js'] },
  concept: { path: '/concept', title: arkSeoTitle('concept', 'The Flux spec'), seoId: 'concept', module: 'concept', scripts: ['js/pages/concept.js'] },
  download: { path: '/download', title: arkSeoTitle('download', 'Download'), seoId: 'download', module: 'download', scripts: ['js/pages/sheet.js', 'js/pages/download.js'] },
  deploy: { path: '/deploy', title: arkSeoTitle('deploy', 'Deploy a network'), seoId: 'deploy', module: 'deploy', scripts: ['js/pages/deploy.js'] },
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
