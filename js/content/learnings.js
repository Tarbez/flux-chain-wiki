/* =====================================================================
   THE ARTICLES AND THE WORDS THEY OWN
   ---------------------------------------------------------------------
   The index (slug, title, category, reading time, summary) lives in
   js/content/articles/index.js; each body lives in js/content/articles/<slug>.js
   and loads only when its route is visited. This file holds no words: it
   defines the shape, validates it, and writes both files back out, so the
   admin page, the publisher and a hand edit all produce the same bytes.

     slug      lowercase letters, digits and hyphens; it is the route
     sections  [[heading, paragraph, ...], ...]
     core      optional primary summary for the first reading layer
     questions optional prompts, one for each section/inner reading layer
     relevance, reviewed, evidenceLabel/evidenceHref, relatedPage, actionLabel/actionPage
               required editorial context on a complete article body
     numbers   true adds the table of starting values after the last section
   ===================================================================== */
var LearningContent = (function () {
  'use strict';

  var SLUG = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
  var META = ['slug', 'title', 'category', 'minutes', 'summary'];
  var articles = [];

  function problems(a) {
    var out = [];
    if (!a || typeof a !== 'object') return ['an article is an object'];
    if (!SLUG.test(a.slug || '')) out.push('slug must be lowercase letters, digits and single hyphens, starting with a letter');
    META.slice(1).forEach(function (key) { if (typeof a[key] !== 'string' || !a[key]) out.push(key + ' is missing'); });
    if (a.core !== undefined && (typeof a.core !== 'string' || !a.core.trim())) out.push('core must be a non-empty summary');
    if (a.questions !== undefined && (!Array.isArray(a.questions) || a.questions.some(function (q) { return typeof q !== 'string' || !q.trim(); }))) out.push('questions must be an array of non-empty prompts');
    if (a.sections !== undefined) {
      ['relevance', 'evidenceLabel', 'evidenceHref', 'relatedPage', 'actionLabel', 'actionPage'].forEach(function (key) {
        if (typeof a[key] !== 'string' || !a[key].trim()) out.push(key + ' is required for an article body');
      });
      if (typeof a.reviewed !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(a.reviewed) || Number.isNaN(Date.parse(a.reviewed))) out.push('reviewed needs a valid YYYY-MM-DD date');
      if (a.evidenceHref && !/^docs\/[a-z0-9/_-]+\.md(?:#[a-z0-9_-]+)?$/.test(a.evidenceHref)) out.push('evidenceHref must be a local documentation link');
      ['relatedPage', 'actionPage'].forEach(function (key) {
        if (a[key] && !/^[a-z][a-z0-9/-]*$/.test(a[key])) out.push(key + ' must name a page key');
      });
      if (!Array.isArray(a.sections) || !a.sections.length) out.push('an article needs at least one section');
      else a.sections.forEach(function (section, i) {
        if (!Array.isArray(section) || section.length < 2) out.push('section ' + (i + 1) + ' needs a heading and a paragraph');
        else if (section.some(function (part) { return typeof part !== 'string' || !part; })) out.push('section ' + (i + 1) + ' has an empty heading or paragraph');
      });
      if (typeof a.numbers !== 'boolean') out.push('numbers must be true or false');
      if (Array.isArray(a.questions) && Array.isArray(a.sections) && a.questions.length !== a.sections.length) out.push('questions must match the number of sections');
    }
    return out;
  }

  function index(a) { var out = {}; META.forEach(function (key) { out[key] = a[key]; }); return out; }
  function body(a) {
    var out = {};
    if (a.core !== undefined) out.core = a.core;
    ['relevance', 'reviewed', 'evidenceLabel', 'evidenceHref', 'relatedPage', 'actionLabel', 'actionPage'].forEach(function (key) { out[key] = a[key]; });
    if (a.questions !== undefined) out.questions = a.questions.slice();
    out.sections = a.sections; out.numbers = a.numbers;
    return out;
  }

  /* replace the index with `list`; bodies arrive separately, through load() */
  function define(list) {
    list.forEach(function (a) {
      var bad = problems(index(a));
      if (bad.length) throw new Error('LearningContent: ' + (a && a.slug) + ': ' + bad.join('; '));
    });
    articles.length = 0;
    list.forEach(function (a) { articles.push(index(a)); });
    return articles;
  }
  function find(slug) { return articles.find(function (article) { return article.slug === slug; }); }
  function load(slug, content) { Object.assign(find(slug), content); }

  /* add a complete article, or replace the one with the same slug */
  function put(a) {
    var bad = problems(a);
    if (bad.length) throw new Error('LearningContent: ' + (a && a.slug) + ': ' + bad.join('; '));
    var at = articles.findIndex(function (article) { return article.slug === a.slug; });
    var copy = Object.assign(index(a), body(a));
    if (at < 0) articles.push(copy); else articles[at] = copy;
    return copy;
  }
  function remove(slug) {
    var at = articles.findIndex(function (article) { return article.slug === slug; });
    if (at >= 0) articles.splice(at, 1);
  }

  /* the exact file text of js/content/articles/index.js */
  function serializeIndex(list) {
    return '/* The article index, in reading order. admin.html rewrites this list; edit it by hand only to reorder. */\n' +
      'LearningContent.define(' + JSON.stringify(list.map(index), null, 2) + ');\n';
  }
  /* the exact file text of js/content/articles/<slug>.js */
  function serializeBody(a) {
    return '/* Loaded only when this article is requested. */\n' +
      'LearningContent.load(' + JSON.stringify(a.slug) + ', ' + JSON.stringify(body(a), null, 2) + ');\n';
  }

  return { articles: articles, define: define, find: find, load: load, put: put, remove: remove,
           problems: problems, serializeIndex: serializeIndex, serializeBody: serializeBody };
})();
