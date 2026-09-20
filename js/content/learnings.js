/* Small shared index; article bodies load only when their route is visited. */
var LearningContent = (function () {
  var articles = [
  {
    "slug": "from-points-to-form",
    "title": "From points to form",
    "category": "BUILD NOTES / 001",
    "minutes": "8 MIN READ",
    "summary": "Our first experiment: how a field of tiny points becomes a shape, a word, and a way to understand a page."
  },
  {
    "slug": "what-the-numbers-do",
    "title": "What the numbers do",
    "category": "FOUNDATIONS / 002",
    "minutes": "5 MIN READ",
    "summary": "A plain-language guide to density, dissolution, rotation, focus, and the cost of adding more."
  },
  {
    "slug": "motion-that-explains",
    "title": "Motion that explains",
    "category": "A WAY OF SEEING / 003",
    "minutes": "5 MIN READ",
    "summary": "Why keeping one thing in view can make a changing interface easier to follow."
  }
];
  function find(slug) { return articles.find(function (article) { return article.slug === slug; }); }
  function load(slug, body) { Object.assign(find(slug), body); }
  return { articles: articles, find: find, load: load };
})();
