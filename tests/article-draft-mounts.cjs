/* Regression (2026-10-20): a brand-new note must mount from its draft.

   Why this exists: Wave 3 made a note an Ark-block page (js/pages/article.js on the story
   template). A new article from the CMS ("Add article") has no review date, no dated-history
   note, no evidence link, no related page and no action yet. The page put those empty values
   straight into Ark blocks -- an empty hero meta value, a callout with no body, a related link
   with no href -- and pinned layout keys onto elements the draft never draws. Ark refuses every
   one of those, an authored spec throws on a refusal, so the WHOLE page failed to mount and the
   editor's canvas could not show a new article before Save (tests/browser/cms-journeys.mjs
   "article", full-audit content/articles). Fixed in article.js: one `filled()` rule decides both
   what is drawn and what is pinned; an unreviewed or unlinked draft says so in words.

   This drives the real site in jsdom: the preview's own path (LearningContent.define + load, then
   ArkUI.catalogContentRoutes, then the router) with the exact blank draft
   js/admin/articles.js articleBlueprint() creates. */
'use strict';
const assert = require('node:assert/strict');
const { visit } = require('./lib/block-page-checks.cjs');

(async () => {
  const seen = await visit('/learnings', async (window) => {
    const errors = [];
    const original = window.console.error;
    window.console.error = (...args) => { errors.push(args.join(' ').slice(0, 300)); original.apply(window.console, args); };
    /* articleBlueprint('hello-world') from js/admin/articles.js, as the CMS creates it */
    const blank = { slug: 'hello-world', title: 'Hello world', category: 'NOTES / 008', minutes: '3 MIN READ',
      summary: 'Say what this note is about.', core: 'State the central idea clearly.', questions: ['What does this note explain?'],
      relevance: '', reviewed: '', evidenceLabel: '', evidenceHref: '', relatedPage: '', actionLabel: '', actionPage: '',
      sections: [['First heading', 'Write the first paragraph.']], numbers: false };
    const LC = window.LearningContent;
    LC.define(LC.articles.concat([blank]));
    LC.load('hello-world', blank);
    const added = window.ArkUI.catalogContentRoutes([LC.find('hello-world')], []);
    if (window.ArkUI.sceneState && window.ArkUI.sceneState.addPages) window.ArkUI.sceneState.addPages(added);
    await window.ArkUI.pageRouter.navigate('article/hello-world', { history: 'replace' });
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    const page = window.document.querySelector('[data-ark-page]:not([hidden])');
    const text = page ? page.textContent : '';
    return {
      path: window.ArkUI.route.path(),
      title: page && page.querySelector('[data-ark-block="hero"] h1') ? page.querySelector('[data-ark-block="hero"] h1').textContent : null,
      refused: page ? page.querySelectorAll('[data-ark-block-refused]').length : -1,
      emptyLinks: page ? [...page.querySelectorAll('a')].filter((a) => !a.getAttribute('href')).length : -1,
      notReviewed: /Not reviewed yet/.test(text),
      noEvidence: /No evidence linked yet/.test(text),
      errors
    };
  });
  assert.equal(seen.path, '/learnings/hello-world', 'the canvas opens the new note before it is saved');
  assert.equal(seen.title, 'Hello world', 'its title is drawn');
  assert.deepEqual(seen.errors.filter((e) => /page failed to load|refused/.test(e)), [], 'no block of the note is refused');
  assert.equal(seen.refused, 0, 'no refusal callout stands in for a block');
  assert.equal(seen.emptyLinks, 0, 'no link without a target');
  assert(seen.notReviewed && seen.noEvidence, 'an unreviewed, unlinked draft says so in words, never blank and never invented');
  console.log('PASS: a brand-new note mounts from its draft: title drawn, nothing refused, no empty link, "Not reviewed yet" / "No evidence linked yet" stated.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
