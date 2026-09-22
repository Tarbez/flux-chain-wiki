/* Route metadata belongs to the shell; bodies and page modules do not. */
ArkUI.pageModules = Object.create(null);
ArkUI.pageCatalog = {
  zero: { path: '/', title: 'SUBZERO', module: 'zero', scripts: ['js/resolvers/step.js', 'js/pages/home.js'] },
  proximity: { path: '/experiments', title: 'Experiments — SUBZERO', module: 'proximity', scripts: ['js/resolvers/experiment.js', 'js/pages/experiments.js'] },
  lab: { path: '/experiments/lab', title: 'The open lab — SUBZERO', module: 'lab', scripts: ['js/studio.js', 'js/pages/lab.js'] },
  learnings: { path: '/learnings', title: 'Learnings — SUBZERO', module: 'learnings', scripts: ['js/resolvers/learnings.js', 'js/pages/learnings.js'] },
  about: { path: '/about', title: 'About us — SUBZERO', module: 'about', scripts: ['js/pages/sheet.js', 'js/pages/about.js'] },
  concept: { path: '/concept', title: 'The Subzero theory — SUBZERO', module: 'concept', scripts: ['js/pages/concept.js'] }
};
LearningContent.articles.forEach(function (article) {
  ArkUI.pageCatalog['article/' + article.slug] = { path: '/learnings/' + article.slug, title: article.title + ' — SUBZERO', module: 'article', scripts: ['js/content/articles/' + article.slug + '.js', 'js/resolvers/learnings.js', 'js/pages/article.js'] };
});
if (typeof ArkManifest !== 'undefined') ArkManifest.group('theory').forEach(function (m) {
  ArkUI.pageCatalog['concept/' + m.id] = { path: m.route, title: ArkCopy.text(m.id.toUpperCase() + '.TITLE').replace(/\.$/, '') + ' — SUBZERO', module: 'theory', scripts: ['js/pages/sheet.js', 'js/pages/theory.js'] };
});
