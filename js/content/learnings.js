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

   Derived, never typed (2026-10-19, W3-LEARN; workspace law "derive it, don't author it"):
     minutes   the read time, from the body's word count at 200 words a minute (readTime()).
               The index carried typed read times that were up to three times the real one
               ("7 MIN READ" on a 463-word note). An index entry keeps its typed value only
               until its body exists; serializeIndex() writes the derived one.
     reviewed  the editorial review date lives on the body and is copied onto the index entry
               when the index is written, so the notes index can show each note's date (and the
               sitemap its lastmod) without loading seven bodies.
     figures() / ungrounded(): every number an excerpt (summary) quotes must be one the body or
               the evidence registry states (a rounded figure may be qualified: "about 25,000"
               for 24,908). Card 06 said "25,232 ops/s" while its note said 51,065 and 279,269
               (docs/ux-audit/pages-ux-a.md /learnings P2). tests/learnings-blocks.cjs holds it.
   ===================================================================== */
var LearningContent = (function () {
  'use strict';

  var SLUG = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
  var META = ['slug', 'title', 'category', 'minutes', 'summary'];
  var DATE = /^\d{4}-\d{2}-\d{2}$/;
  var WORDS_PER_MINUTE = 200;
  var articles = [];

  /* The words a reader reads: the core, the note, every question and every section. */
  function bodyText(a) {
    return [a.core, a.relevance].concat(a.questions || [], (a.sections || []).reduce(function (all, section) { return all.concat(section); }, [])).filter(Boolean).join(' ');
  }
  function wordCount(a) { return bodyText(a).split(/\s+/).filter(Boolean).length; }
  /* "N MIN READ", derived from the body; an index entry whose body is not loaded keeps its typed value. */
  function readTime(a) {
    if (!Array.isArray(a.sections)) return a.minutes;
    return Math.max(1, Math.round(wordCount(a) / WORDS_PER_MINUTE)) + ' MIN READ';
  }

  /* Every figure a text states, as numbers: "12,403" -> 12403, "3.76 million" -> 3760000,
     "6,000–24,000" -> 6000 and 24000. `approx` marks a figure the text itself rounds ("about
     25,000", "under 7"), which may stand for a stated figure within 5 percent. */
  var FIGURE = /(\b(?:about|around|roughly|under|over|nearly|almost|some|approximately)\s+)?(\d[\d,]*(?:\.\d+)?)(\s*(?:million|thousand|billion))?/gi;
  var SCALE = { million: 1e6, thousand: 1e3, billion: 1e9 };
  function figures(text) {
    var out = [], m;
    FIGURE.lastIndex = 0;
    while ((m = FIGURE.exec(String(text || '')))) {
      var value = Number(m[2].replace(/,/g, '')) * (m[3] ? SCALE[m[3].trim().toLowerCase()] : 1);
      if (Number.isFinite(value)) out.push({ value: value, text: m[0].trim(), approx: !!m[1] });
    }
    return out;
  }
  /* The figures of `text` that none of `sources` states (exactly, or within 5 percent where the
     text rounds): [] when every number is grounded. */
  function ungrounded(text, sources) {
    var stated = figures(sources.join(' ')).map(function (f) { return f.value; });
    return figures(text).filter(function (f) {
      return !stated.some(function (s) { return s === f.value || (f.approx && s && Math.abs(s - f.value) / s <= .05); });
    }).map(function (f) { return f.text; });
  }

  function problems(a) {
    var out = [];
    if (!a || typeof a !== 'object') return ['an article is an object'];
    if (!SLUG.test(a.slug || '')) out.push('slug must be lowercase letters, digits and single hyphens, starting with a letter');
    META.slice(1).forEach(function (key) { if (typeof a[key] !== 'string' || !a[key]) out.push(key + ' is missing'); });
    if (a.reviewed !== undefined && a.sections === undefined && (typeof a.reviewed !== 'string' || !DATE.test(a.reviewed) || Number.isNaN(Date.parse(a.reviewed)))) out.push('reviewed needs a valid YYYY-MM-DD date');
    if (a.core !== undefined && (typeof a.core !== 'string' || !a.core.trim())) out.push('core must be a non-empty summary');
    if (a.questions !== undefined && (!Array.isArray(a.questions) || a.questions.some(function (q) { return typeof q !== 'string' || !q.trim(); }))) out.push('questions must be an array of non-empty prompts');
    if (a.sections !== undefined) {
      ['relevance', 'evidenceLabel', 'evidenceHref', 'relatedPage', 'actionLabel', 'actionPage'].forEach(function (key) {
        if (typeof a[key] !== 'string' || !a[key].trim()) out.push(key + ' is required for an article body');
      });
      if (typeof a.reviewed !== 'string' || !DATE.test(a.reviewed) || Number.isNaN(Date.parse(a.reviewed))) out.push('reviewed needs a valid YYYY-MM-DD date');
      /* evidenceHref/relatedPage/actionPage are link data (js/ark/dash-kit.js's
         resolveLinkField reads them), tagged the same way an ArkManifest
         'link' field is: doc:<path> / route:<key>. */
      if (a.evidenceHref && !/^doc:docs\/[a-z0-9/_-]+\.md(?:#[a-z0-9_-]+)?$/.test(a.evidenceHref)) out.push('evidenceHref must be doc:<a local documentation link>');
      ['relatedPage', 'actionPage'].forEach(function (key) {
        if (a[key] && !/^route:[a-z][a-z0-9/-]*$/.test(a[key])) out.push(key + ' must be route:<a page key>');
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

  /* The index entry: the typed fields, the read time derived from the body when it is present,
     and the body's review date so the index can show it. */
  function index(a) {
    var out = {};
    META.forEach(function (key) { out[key] = a[key]; });
    out.minutes = readTime(a);
    if (typeof a.reviewed === 'string' && a.reviewed) out.reviewed = a.reviewed;
    return out;
  }
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
           problems: problems, serializeIndex: serializeIndex, serializeBody: serializeBody,
           bodyText: bodyText, wordCount: wordCount, readTime: readTime, figures: figures, ungrounded: ungrounded,
           WORDS_PER_MINUTE: WORDS_PER_MINUTE };
})();
