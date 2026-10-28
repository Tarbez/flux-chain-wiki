'use strict';
/* run-tests-timeout-ms: 240000 */
/* /reference as a page of Ark blocks around its Markdown renderer: a corrected outline, a breadcrumb where a raw path stood,
   a table of contents, and the phone fold -- and every layout key the old reader had still names the same words.

   Named regressions it holds:
   - Fold sweep S0-1 (2026-10-20): the default document was 1.69x the viewport at 390. Folding is done by Ark's disclosure
     (foldBelow 'phone': wider screens show everything), never by hiding text of our own.
   - Long documents (docs/ux-audit/ledger.md RF-1; fold sweep S7, 2026-10-20): the glossary was 4.6x and resolver-math 4.3x at
     390. The glossary's 4,400-character introduction sits before its first heading, so folding sections alone could not
     help; a long introduction now keeps its first lines and folds the rest, and a folded section's button shares its
     heading's row. Measured in a browser by tests/browser/fold-contrast-sweep.mjs (the default document) and by the one-off
     reading quoted in docs/ux-audit/ledger.md (the long ones); this test holds the STRUCTURE that makes those readings.
   - RF-2: the outline went h1 -> h3 because every document heading was pushed one level down. `##` is h2 now.
   - RF-3: a raw "Canonical reference / docs/protocol/agreements.md" line stood as the kicker; Ark's breadcrumb is there instead.
   - RF-6: a document with more than four headings gets a contents list derived from them; its links reach real headings, and
     on a phone open the section they name.
   - Saved CMS data is never rewritten. Nodes moved into a fold, headings retagged h3 -> h2, and the kicker that became the
     breadcrumb each carry the layout key they had (data-ark-layout-pin), checked against the census frozen before the
     conversion (tests/fixtures/layout-keys/reference.tsv).
   - A heading may run to 110 characters and Ark limits a button label to 48: a label built from the heading refused the WHOLE
     page (found booting every approved document, not the default). The label is fixed.
   - First-visit audit 2026-10-22 ("Open a current document by default"): with no ?doc= the reader opened Agreements, whose
     first line says it was written for a direction that is no longer the direction. The default is derived from the index
     now (js/pages/reference.js defaultDoc): the protocol's overview. Agreements is still checked here, by naming it: it is
     the document the census was taken on, and the one every edit saved under the old shared '/reference' scope was made on.
   - Saved edits are per document (js/content/layout.js, "a page's layout scope"): the continuity check boots Agreements
     and writes its edits under '/reference?doc=docs/protocol/agreements.md'. tests/layout-document-scope.cjs holds the
     rest (an edit on one document never shows on another; the old '/reference' edits land on Agreements only). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const continuity = require('./lib/layout-continuity.cjs');

const ROOT = path.resolve(__dirname, '..');
const ROUTE = '/reference';
/* the document the census (tests/fixtures/layout-keys/reference.tsv) was taken on, by name: it was the default then */
const AGREEMENTS = 'docs/protocol/agreements.md';
const AGREEMENTS_QUERY = 'doc=' + AGREEMENTS;
const AGREEMENTS_SCOPE = ROUTE + '?' + AGREEMENTS_QUERY;

/* The headings of a Markdown document outside code fences, by level: what the page must derive its contents from. */
function headingsOf(doc) {
  let fenced = false; const out = [];
  for (const line of fs.readFileSync(path.join(ROOT, doc), 'utf8').split(/\r?\n/)) {
    if (/^```/.test(line)) { fenced = !fenced; continue; }
    const m = !fenced && /^(#{1,6})\s+(.+)/.exec(line);
    if (m) out.push({ level: m[1].length, text: m[2] });
  }
  return out;
}

(async () => {
  const { readIndexHtml, inspectDocument, createLocalResources } = await import('../api/lib/render-core.mjs');
  const boot = async (query, read) => inspectDocument({ html: await readIndexHtml(ROOT), url: 'https://defxn.com' + ROUTE + query, resources: createLocalResources(ROOT), root: ROOT, timeoutMs: 30000 }, read);
  const clean = (text) => text.replace(/\s+/g, ' ').trim();

  /* ---- with no ?doc=, a current document: the protocol's overview, derived from the index ---- */
  const opened = await boot('', (window) => {
    const page = window.document.querySelector('[data-ark-page="reference"]');
    const index = window.ArkUI.referenceIndex;
    return { doc: page && page.dataset.referenceDoc, scope: page && page.getAttribute('data-ark-layout-scope'),
      overviews: Array.from(window.ArkUI.referenceDocs.filter((doc) => index[doc] && /\boverview\b/i.test(index[doc].title))),   // out of the window's realm, so deepEqual compares values
      title: clean((page.querySelector('h1') || { textContent: '' }).textContent), text: page ? page.textContent : '' };
  });
  assert.deepEqual(opened.overviews, ['docs/overview.md'], 'the index names one overview document: ' + opened.overviews.join(' | '));
  assert.equal(opened.doc, 'docs/overview.md', 'with no ?doc=, /reference opens the protocol\'s overview');
  assert.equal(opened.title, 'Flux Protocol overview', 'titled as the index titles it');
  const opening = fs.readFileSync(path.join(ROOT, opened.doc), 'utf8').split(/\r?\n/).filter((line) => line.trim()).slice(0, 4).join(' ');
  assert(!/no longer the direction|superseded|historical|retired/i.test(opening), 'and it is current: it does not open on a note that it was written for another direction');
  assert(!/no longer the direction/.test(opened.text.slice(0, 600)), 'the first thing a visitor reads is not that the document is out of date');
  assert.equal(opened.scope, 'doc=docs/overview.md', 'the page declares the document it shows as its layout scope');

  /* ---- Agreements (the old default, opened by name): its two sections are folds, their words are all still on the page ---- */
  const seen = await boot('?' + AGREEMENTS_QUERY, (window) => {
    const page = window.document.querySelector('[data-ark-page="reference"]');
    const folds = [...page.querySelectorAll('.ark-disclosure.reference-fold[data-fold-below="phone"]')];
    return {
      folds: folds.length,
      labels: folds.map((fold) => clean(fold.querySelector('.ark-disclosure__trigger').textContent)),
      names: folds.map((fold) => fold.querySelector('.ark-disclosure__trigger').getAttribute('aria-label')),
      outline: [...page.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => h.tagName),
      headings: [...page.querySelectorAll('article > h2')].map((h) => h.textContent),
      beforeEachFold: folds.map((fold) => fold.previousElementSibling && fold.previousElementSibling.tagName),
      inside: folds.map((fold) => clean(fold.querySelector('.ark-disclosure__panel').textContent).slice(0, 40)),
      intro: [...page.querySelectorAll('article > p, article > ol')].filter((n) => !n.closest('.ark-disclosure')).length,
      introFolds: page.querySelectorAll('.reference-intro-fold').length,
      contents: page.querySelectorAll('.reference-contents').length,
      crumbs: clean((page.querySelector('.ark-breadcrumb') || { textContent: '' }).textContent),
      crumbsTag: (page.querySelector('.ark-breadcrumb') || {}).tagName,
      crumbsBeforeTitle: !!(page.querySelector('.ark-breadcrumb') && page.querySelector('h1') && (page.querySelector('.ark-breadcrumb').compareDocumentPosition(page.querySelector('h1')) & 4)),
      refused: page.querySelectorAll('[data-ark-block-refused]').length,
      quotes: [...page.querySelectorAll('article > blockquote')].map((q) => clean(q.textContent).slice(0, 20)),
      literalQuote: [...page.querySelectorAll('article p')].filter((p) => /^>/.test(p.textContent.trim())).length,
      backLinks: [...page.querySelectorAll('.reference-orientation a')].filter((a) => /Return to/.test(a.textContent)).length,
      text: page.textContent
    };
  });
  /* first-visit audit 2026-10-22 (P2): the document's `> ` note showed as a paragraph starting with a literal ">", and
     "← Return to Home" stood above a breadcrumb that already goes back */
  assert.deepEqual(seen.quotes, ['Written for the agre'], 'a `> ` line is a quote: ' + seen.quotes.join(' | '));
  assert.equal(seen.literalQuote, 0, 'no paragraph starts with a literal ">"');
  assert.equal(seen.backLinks, 0, 'with the breadcrumb drawn, no "Return to" link is stacked above it');
  assert.equal(seen.folds, 2, 'Evidence and Interpretation each fold');
  assert.deepEqual(seen.outline, ['H1', 'H2', 'H2'], 'the outline is the title, then the document\'s `##` as h2: no level skipped (RF-2)');
  assert.deepEqual(seen.headings, ['Evidence', 'Interpretation'], 'the headings stay where they were, outside the folds');
  assert.deepEqual(seen.beforeEachFold, ['H2', 'H2'], 'each fold follows the heading it belongs to');
  assert(seen.labels.every((label) => /^Show/.test(label)), 'the button says what it does: ' + seen.labels.join(' | '));
  assert(seen.names.every((name, i) => name.includes(seen.headings[i])), 'and its accessible name carries the heading it opens: ' + seen.names.join(' | '));
  assert(/^Agreement-fabric status/.test(seen.inside[0]) && /^A receipt records/.test(seen.inside[1]), 'each section\'s words are inside its fold: ' + seen.inside.join(' | '));
  assert(seen.intro >= 3, 'the intro before the first heading is always in sight');
  assert.equal(seen.introFolds, 0, 'a short introduction is not folded');
  assert.equal(seen.contents, 0, 'two headings need no contents');
  assert.equal(seen.crumbsTag, 'NAV', 'the breadcrumb is Ark\'s navigation block (RF-3)');
  assert(/^Home\s*\/?\s*Agreements$/.test(seen.crumbs.replace(/[›»→]/g, '/')) || (/Home/.test(seen.crumbs) && /Agreements$/.test(seen.crumbs)), 'it reads Home, then the document: ' + seen.crumbs);
  assert(seen.crumbsBeforeTitle, 'and stands above the title');
  assert(!/Canonical reference/.test(seen.text) && !/docs\/protocol\/agreements\.md/.test(seen.text.replace(/Original Markdown/, '')), 'the raw path kicker is gone');
  assert.equal(seen.refused, 0, 'no block was refused');
  assert(/an addressed agreement/.test(seen.text) && /universal truth/.test(seen.text), 'no word of the document went missing');

  /* ---- a long document: contents, a folded introduction, section folds, nothing lost ---- */
  const longDoc = 'docs/resolver-math.md';
  const headings = headingsOf(longDoc).filter((h) => h.level >= 2);
  const topLevel = headings.filter((h) => h.level === 2);
  const math = await boot('?doc=' + encodeURIComponent(longDoc), (window) => {
    const page = window.document.querySelector('[data-ark-page="reference"]');
    const links = [...page.querySelectorAll('.reference-contents a[data-reference-heading]')];
    const lead = page.querySelector('.reference-intro-fold');
    const folds = [...page.querySelectorAll('.reference-fold')];
    /* a phone, for the contents link: matchMedia is the one thing jsdom lacks */
    window.matchMedia = (query) => ({ matches: /max-width:\s*600px/.test(query), media: query });
    const target = links.length ? links[links.length - 1] : null;
    const head = target && window.document.getElementById(target.dataset.referenceHeading);
    const owner = head && head.closest('article') && [...head.closest('article').children].find((n) => n.classList.contains('reference-fold') && n.previousElementSibling === head);
    const before = owner ? owner.getAttribute('data-state') : null;
    const event = new window.MouseEvent('click', { bubbles: true, cancelable: true });
    if (target) target.dispatchEvent(event);
    return {
      linkTexts: links.map((a) => a.textContent),
      resolve: links.every((a) => { const h = window.document.getElementById(a.dataset.referenceHeading); return h && /^H[2-6]$/.test(h.tagName) && h.textContent === a.textContent && a.getAttribute('href') === '#' + h.id; }),
      ids: new Set(links.map((a) => a.dataset.referenceHeading)).size,
      contentsClosed: page.querySelector('.reference-contents-fold').getAttribute('data-state'),
      contentsPrecedesArticle: !!(page.querySelector('.reference-contents-fold').compareDocumentPosition(page.querySelector('article')) & 4),
      leadPreview: lead && lead.getAttribute('data-preview'),
      leadFold: lead && lead.getAttribute('data-fold-below'),
      leadFirst: lead && clean(lead.textContent).slice(0, 30),
      folds: folds.length,
      stateBefore: before, stateAfter: owner ? owner.getAttribute('data-state') : null,
      defaultPrevented: event.defaultPrevented,
      h3InFold: [...page.querySelectorAll('.reference-fold h3')].length,
      outline: [...page.querySelectorAll('h2,h3')].map((h) => h.tagName + ':' + h.textContent),
      refused: page.querySelectorAll('[data-ark-block-refused]').length,
      text: page.textContent
    };
  });
  assert.equal(math.refused, 0, 'no block was refused');
  assert.equal(math.linkTexts.length, headings.length, 'one contents link per heading of the document, h2 and h3 (derived from the headings, not listed): ' + math.linkTexts.length + ' of ' + headings.length);
  assert(math.resolve && math.ids === headings.length, 'every contents link reaches a real heading with the same words, and no two share an id');
  assert.equal(math.contentsClosed, 'closed', 'the contents are closed until asked for');
  assert(math.contentsPrecedesArticle, 'and stand above the document');
  assert.equal(math.leadPreview, '3', 'a long introduction keeps its first three lines in view');
  assert.equal(math.leadFold, 'phone', 'and folds the rest on a phone only');
  assert.equal(math.folds, topLevel.length, 'every top-level section is a fold: ' + math.folds + ' of ' + topLevel.length);
  assert(math.h3InFold > 0, 'the sub-headings stay inside their section\'s fold');
  assert.equal(math.defaultPrevented, true, 'a contents link is handled in the page (a bare #fragment would re-enter the router)');
  assert.equal(math.stateBefore, 'closed', 'the last section starts folded');
  assert.equal(math.stateAfter, 'open', 'and following its contents link on a phone opens it');
  for (const phrase of ['Resolver Math', 'The observer is not a person', 'What this page does not claim', 'Imaginary × Imaginary']) assert(math.text.includes(phrase), 'no word of the document went missing: ' + phrase);

  /* ---- the glossary: its 60 definitions sit before the first heading; every one must still be on the page ---- */
  const glossaryText = fs.readFileSync(path.join(ROOT, 'docs/glossary.md'), 'utf8');
  const terms = [...glossaryText.matchAll(/^\*\*([^*]+)\*\*/gm)].map((m) => m[1]);
  const glossary = await boot('?doc=' + encodeURIComponent('docs/glossary.md'), (window) => {
    const page = window.document.querySelector('[data-ark-page="reference"]');
    const lead = page.querySelector('.reference-intro-fold');
    return { lead: !!lead, preview: lead && lead.getAttribute('data-preview'), inLead: lead ? lead.querySelectorAll('strong').length : 0, refused: page.querySelectorAll('[data-ark-block-refused]').length, text: page.textContent };
  });
  assert(terms.length > 40, 'the glossary has its definitions (' + terms.length + ')');
  assert(glossary.lead && glossary.preview === '3', 'the glossary\'s long introduction is a folded lead with three lines in view');
  const introTerms = [...glossaryText.slice(0, glossaryText.search(/^## /m)).matchAll(/^\*\*([^*]+)\*\*/gm)].length;
  assert(glossary.inLead >= introTerms, 'every definition before the first heading is inside that lead (' + glossary.inLead + ' of ' + introTerms + '), rendered, not dropped');
  assert.equal(glossary.refused, 0, 'no block was refused');
  for (const term of terms) assert(glossary.text.includes(term), 'glossary term still on the page: ' + term);

  /* ---- the longest heading of any approved document (110 characters) must not refuse the page ---- */
  const long = await boot('?doc=' + encodeURIComponent('docs/evidence/fxn-speed-audit-v0.md'), (window) => {
    const page = window.document.querySelector('[data-ark-page="reference"]');
    return { mounted: !!page, folds: page ? page.querySelectorAll('.ark-disclosure[data-fold-below="phone"]').length : 0, refused: page ? page.querySelectorAll('[data-ark-block-refused]').length : -1, crumb: page ? clean((page.querySelector('.ark-breadcrumb') || { textContent: '' }).textContent) : '' };
  });
  assert(long.mounted && long.folds > 0 && long.refused === 0, 'a document with a 110-character heading mounts with its folds: ' + JSON.stringify(long));
  assert(/Home/.test(long.crumb) && /…$|FXN/.test(long.crumb), 'and its breadcrumb keeps within Ark\'s 48-character label (the title is in full in the h1): ' + long.crumb);

  /* ---- a document that was opened from another page: Home, that page, then the document ---- */
  const from = await boot('?doc=' + encodeURIComponent('docs/protocol/agreements.md') + '&from=' + encodeURIComponent('/lifecycle/offer?view=reference'), (window) => {
    const page = window.document.querySelector('[data-ark-page="reference"]');
    return { crumbs: [...page.querySelectorAll('.ark-breadcrumb a')].map((a) => clean(a.textContent) + '>' + a.getAttribute('data-scene-link')), origin: (page.querySelector('.ark-breadcrumb a[data-scene-link="lifecycle/offer"]') || { dataset: {} }).dataset.routeQuery,
      backLinks: [...page.querySelectorAll('.reference-orientation a')].filter((a) => /Return to/.test(a.textContent)).length };
  });
  assert.deepEqual(from.crumbs, ['Home>zero', 'Offer: propose the terms>lifecycle/offer'], 'the breadcrumb leads to the page the reader came from: ' + from.crumbs.join(' | '));
  /* the Return link this replaced carried the page's exact query (2026-10-19, tests/reference-reader.cjs); the breadcrumb's link does now */
  assert.equal(from.origin, 'view=reference', 'and its link to that page carries the exact query the Return link carried');
  assert.equal(from.backLinks, 0, 'with no "Return to" link stacked above the breadcrumb');

  /* ---- saved CMS edits still land: every old key, none retired ---------------------------------------- */
  /* The raw path kicker became the breadcrumb: the same slot on the page, and it takes the kicker's key (a saved edit on the
     kicker lands on the breadcrumb). Everything else keeps its words as well as its key. */
  const reshaped = { 'page:/p:1': 'the raw "Canonical reference / <path>" kicker became Ark\'s breadcrumb (Home / document), pinned to its key',
    /* first-visit audit 2026-10-22: "the detailed contract" named the retired agreement direction */
    'page:/p:2': 'the provenance line says what the document is: "This is the source document." (it said "This source provides the detailed contract.")',
    'page:/nav:1': 'the orientation row holds Original Markdown alone: the breadcrumb is the way back',
    /* the census cut the article's words at 160 characters; the quote's ">" is no longer text, so the cut falls one later */
    'page:/article:1': 'the same document: its `> ` note is a quote now, not a paragraph starting with ">"',
    'page:/article:1/p:1': 'the same note, inside its quote: the paragraph keeps its key; its words no longer start with a literal ">"' };
  /* first-visit audit 2026-10-22 (P2): two ways back were stacked; the breadcrumb stays (its link to the page the reader came
     from carries that page's query), so the Return link and its icon are retired. Original Markdown keeps its key by pin. */
  const retired = {};
  for (const key of ['page:/nav:1/a:1', 'page:/nav:1/a:1/svg:1', 'page:/nav:1/a:1/svg:1/path:1', 'page:/nav:1/a:1/svg:1/path:2']) retired[key] = 'the "← Return to Home" link (and its icon): the breadcrumb above the title is the way back';
  const census = continuity.readCensus(ROUTE);
  const onAgreements = { query: AGREEMENTS_QUERY, scope: AGREEMENTS_SCOPE };
  const after = await continuity.pageKeys(ROUTE, onAgreements);
  const tally = continuity.assertContinuity(census, after, { reshaped, retired });
  assert.equal(tally.kept + tally.reshaped + tally.retired, census.length, 'every old key is accounted for');
  const landed = await continuity.assertSavedEditsLand(ROUTE, census, Object.assign({ reshaped, retired }, onAgreements));
  assert.equal(landed, census.length - 1 - Object.keys(retired).length, 'a saved frame on every old key but page:/ and the retired ones landed');
  assert(after.every((entry) => !/^id:ark-r-/.test(entry.key)), 'no generated (ark-r-) id became a layout key');
  assert(after.every((entry) => !/^id:reference-/.test(entry.key)), 'and no heading id (the contents\' targets) became one: each heading is pinned');

  console.log(`PASS: /reference opens ${opened.doc} by default and has a corrected outline, a breadcrumb and (above four headings) a contents list; folds ${seen.folds} sections of Agreements and ${math.folds} of resolver-math on a phone, with the glossary's ${terms.length} definitions in a folded lead; ${tally.kept + tally.reshaped} layout keys kept, ${landed} saved edits land.`);
})().catch((error) => { console.error(error); process.exit(1); });
