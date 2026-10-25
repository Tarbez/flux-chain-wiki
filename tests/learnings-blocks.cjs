'use strict';
/* run-tests-timeout-ms: 1500000 -- three jsdom boots per route (eight routes) and two server renders. */
/* THE NOTES (/learnings and its seven articles) as pages of Ark blocks (DEFXN polish Wave 3,
   W3-LEARN): the index in js/pages/learnings.js, each note on the story template in
   js/pages/article.js. Run alone (owner test law); `node tests/learnings-blocks.cjs /learnings`
   checks one route.

   Named regressions it holds (docs/ux-audit/pages-ux-a.md /learnings, /learnings/*):
   - Four names for one section ("learnings", "Notes", "← TUTORIALS", "ALL LEARNINGS"): the
     breadcrumb, the index, the corner link and every pager say Notes.
   - The excerpt of card 06 said "25,232 ops/s" while its note said 51,065 and 279,269: every
     figure an excerpt quotes is one its note or the evidence registry states
     (LearningContent.ungrounded); a rounded figure says so ("about 25,000" for 24,908).
   - Read times were typed, up to three times the real one ("7 MIN READ" on a 487-word note):
     the index carries the read time derived from the words (LearningContent.readTime), and its
     review date, written by the serializer -- so the shown index is the serializer's output.
   - The question choices had no visible edge and the answer view's tabs were bare numbers
     "00-11": the questions are Ark's accordion, each row numbered and named, keyboard-operable
     by the primitive; the depth control is the one label set (The idea / Step by step / Evidence).
   - Choosing a question replaced the list with an empty panel for about a second: a row opens in
     place. The old ?q=<n> addresses still open their question.
   - The fold rule, by structure (measured 2026-10-19 in Chromium, docs in the W3-LEARN report):
     the index has no pager under its cards (1.71 screens at 1440x900 with one); a note's callout
     sits beside the questions wider than 900px (an 11-question note was 1.71 at 1440 with it
     under them); a question list longer than six rows keeps its first half in sight on a phone
     and folds the rest behind "Questions n-m" (11 rows were 1.91 at 390x844); the pager carries
     no summary lines that repeat its direction labels.
   - The hand-built reader mounted the particle canvas on every note at 2045x1278 behind an
     opacity of 0 (css/site-direction.css made notes the one route that put it back): the
     exception is gone.
   - Every word of each old page is on the converted page (its frozen census), and every old
     layout key still lands, or is reshaped / retired below with its reason
     (tests/lib/converted-page.cjs). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const converted = require('./lib/converted-page.cjs');
const checks = require('./lib/block-page-checks.cjs');

const ROOT = checks.ROOT;
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const DEPTH = ['The idea', 'Step by step', 'Evidence']; // 'Step by step' since 2026-10-22 (first-visit audit, P1): 'How it works' is the header's name for /how-deployment-works, so the tab and the nav link said the same words for two things
/* arrays made in the content's vm realm, as this realm's (assert.deepEqual compares prototypes) */
const host = (list) => Array.from(list);

/* ---- the content, as the site loads it ------------------------------------------------------ */
const content = vm.createContext({});
for (const file of ['js/content/learnings.js', 'js/content/article-index.js', 'js/content/evidence-registry.js']) vm.runInContext(read(file), content);
const LC = content.LearningContent;
const indexEntries = LC.articles.map((a) => Object.assign({}, a));
for (const a of LC.articles) vm.runInContext(read('js/content/articles/' + a.slug + '.js'), content);
const registry = Object.values(content.ArkEvidence.benchmarks).map((b) => b.claim + ' ' + b.evidence);

/* ---- continuity rules ----------------------------------------------------------------------- */
const INDEX = {
  page: 'learnings', ids: ['learnings-'],
  reshaped: [
    [/^page:\/div:1$/, 'the index wrapper became the hero (eyebrow, heading, intro); the list is the card grid after it'],
    [/^page:\/div:1\/ol:1$/, 'the list is Ark\'s card grid: the first three notes, then the rest (every card from 601px up, a press away on a phone)'],
    [/^page:\/div:1\/ol:1\/li:\d$/, 'a row is a card: its series, title, excerpt, read time and review date'],
    [/^page:\/div:1\/ol:1\/li:\d\/a:1$/, 'the row\'s link (number, title, read time, arrow) is the card\'s title link; the series label carries the number, the footer the read time'],
    [/^page:\/div:1\/ol:1\/li:\d\/a:1\/span:2$/, 'the read time is the card\'s footer, derived from the words ("2 min read") with the review date beside it'],
    [/^page:\/div:1\/ol:1\/li:\d\/a:1\/span:3$/, 'the hand-drawn arrow is the card\'s own arrow'],
    [/^page:\/div:1\/p:2$/, 'the hero lede says what the cards are ("7 notes from building DEFXN ..."): the cards are statements, so "Choose a question" sent the reader looking for one (first-visit audit 2026-10-22, P2)']
  ],
  retired: [
    [/^page:\/div:1\/ol:1\/li:\d\/a:1\/span:1$/, 'the row number ("01"): the card\'s series label says it ("BENCHMARKS / 001")']
  ],
  reworded: [
    [/^page:\/div:1\/ol:1\/li:\d\/a:1$/, 'the row read "01 From one chain... 7 MIN READ →"; the card shows its parts apart'],
    [/^page:\/div:1\/ol:1\/li:\d\/a:1\/span:1$/, 'the row number is the series label\'s'],
    [/^page:\/div:1\/ol:1\/li:\d\/a:1\/span:2$/, 'the read time is derived from the words now, not typed'],
    [/^page:\/div:1\/p:2$/, 'the lede names what the cards are, with their derived count (first-visit audit 2026-10-22, P2)']
  ]
};
const ARTICLE = {
  ids: ['article-'],
  reshaped: [
    [/^page:\/header:1$/, 'the header became the hero; the core opens The idea, the dated-history note is the callout'],
    [/^page:\/header:1\/div:1$/, 'the top line (back link, series and read time, Core button) is the hero\'s record: series, read time, review date'],
    [/^page:\/header:1\/div:1\/span:1$/, '"BENCHMARKS / 001 / 7 MIN READ" is two details: the series, and the read time derived from the words'],
    [/^page:\/header:1\/div:2$/, 'the core block is The idea\'s panel'],
    [/^page:\/div:1$/, 'the question nav and reading column are the story body'],
    [/^page:\/div:1\/div:1$/, 'the reading column is the story body\'s main column'],
    [/^page:\/div:1\/div:1\/div:1$/, 'the answer controls (← The core / Next question →) are the depth control'],
    [/^page:\/div:1\/div:1\/div:1\/button:1$/, '"← THE CORE" is The idea tab'],
    [/^page:\/div:1\/div:1\/div:1\/button:2$/, '"NEXT QUESTION →" is the Step by step tab, where every question is a row'],
    [/^page:\/div:1\/nav:1$/, 'the question list is Ark\'s accordion: the table of contents'],
    [/^page:\/div:1\/nav:2$/, 'the exits (related mechanism, next step) are the pager\'s related pages'],
    [/^page:\/div:1\/nav:2\/a:1$/, '"Related mechanism →" names its page now'],
    [/^page:\/div:1\/details:1$/, 'the evidence disclosure is Evidence\'s facts'],
    [/^page:\/div:1\/nav:1\/button:\d+\/span:2$/, 'the question is the row\'s label, with its number ("01 · Was there a real chain?")'],
    [/^page:\/div:1\/nav:1\/button:\d+\/span:1$/, 'the number was the row\'s marker; Ark\'s accordion marks the row with its chevron, which takes the marker\'s key'],
    [/^page:\/div:1\/nav:1\/p:1$/, 'the question count ("QUESTIONS / 08") is derived from the note\'s questions: the grammar note gained a ninth (W4-S13)'],
    /* first-visit audit 2026-10-22, P2 */
    [/^page:\/header:1\/div:2\/p:2$/, 'the dated-history note no longer prints the raw path "(/what-is-a-resolver)": its link is beside it'],
    [/^(id:why-the-chain-was-retired-section-3|page:\/div:1\/div:1\/section:4\/p:1)$/, 'From one chain to one per identity, "What the numbers say now": the internal lever and type names (Lever A+B+C, TransferAtomic, TransferSend/Receive) are a plain description of the three changes; every figure is the same']
  ],
  retired: [
    [/^page:\/header:1\/div:1\/button:1$/, 'the Core return button; The idea tab returns to the core'],
    [/^page:\/header:1\/div:2\/span:1$/, 'the "THE CORE" label; the view is The idea'],
    [/^page:\/div:1\/nav:1\/button:1$/, 'the "00" choice (return to the core); The idea tab'],
    [/^page:\/div:1\/div:1\/section:\d+\/span:1$/, 'the section index label (empty until a question opened); a row is numbered in its label'],
    [/^page:\/div:1\/div:1\/div:1\/span:1$/, 'the "01 / 05" counter; the open row says which question it is'],
    [/^page:\/div:1\/div:1\/a:1$/, 'the next note link that appeared on the last answer; the pager\'s next page is there on every view']
  ],
  reworded: [
    [/^page:\/header:1\/div:1\/span:1$/, 'the series and the read time are two details'],
    [/^page:\/header:1\/div:1\/button:1$/, '"CORE" reads "The idea"'],
    [/^page:\/header:1\/div:2\/span:1$/, '"THE CORE" reads "The idea"'],
    [/^page:\/div:1\/nav:1\/button:1$/, '"00" is The idea tab'],
    [/^page:\/div:1\/nav:1\/button:\d+\/span:1$/, 'the number is part of the row\'s label'],
    [/^page:\/div:1\/div:1\/div:1\/button:[12]$/, '"← THE CORE" / "NEXT QUESTION →" are the depth tabs'],
    [/^page:\/div:1\/div:1\/a:1$/, '"NEXT NOTE / <title> →" is the pager\'s next page, titled'],
    [/^page:\/div:1\/nav:1\/p:1$/, 'the question count ("QUESTIONS / 08") is derived from the note\'s questions: a note that gained a section says its new count (the grammar note, 09, W4-S13)']
  ]
};

const ROUTES = ['/learnings'].concat(LC.articles.map((a) => '/learnings/' + a.slug));
const asked = ROUTES.filter((r) => process.argv.length <= 2 || process.argv.slice(2).includes(r));

(async () => {
  /* ---- the content: derived, never typed twice ---------------------------------------------- */
  for (const a of LC.articles) {
    const entry = indexEntries.find((e) => e.slug === a.slug);
    assert.deepEqual(Array.from(LC.ungrounded(a.summary, [LC.bodyText(a)].concat(registry))), [], a.slug + ': every figure the excerpt quotes is one the note or the evidence registry states');
    assert.equal(entry.minutes, LC.readTime(a), a.slug + ': the index carries the read time derived from the words (' + LC.wordCount(a) + ' words)');
    assert.equal(entry.reviewed, a.reviewed, a.slug + ': the index carries the body\'s review date');
  }
  assert.equal(read('js/content/article-index.js'), LC.serializeIndex(LC.articles), 'js/content/article-index.js is exactly what LearningContent.serializeIndex writes (derived read times, review dates)');
  assert(LC.figures('about 25,000')[0].approx && !LC.figures('25,000')[0].approx, 'a rounded figure is recognised by its qualifier');
  assert.deepEqual(Array.from(LC.ungrounded('25,232 ops/s', ['51,065 ops/s and 279,269 ops/s'])), ['25,232'], 'a figure the note never states is named');

  /* ---- the modules are specs ---------------------------------------------------------------- */
  const indexSource = read('js/pages/learnings.js'), articleSource = read('js/pages/article.js');
  checks.assertSourceIsSpec(indexSource, 'js/pages/learnings.js');
  assert(articleSource.includes('ArkUI.story.mount(def'), 'js/pages/article.js is built by the story template');
  for (const old of ['article-choice', 'article-core-return', 'article-contents', 'learning-eyebrow', 'story-topic', 'aria-pressed', 'RARTICLE_V1', 'RLEARNINGS_V1']) {
    assert(!indexSource.includes(old) && !articleSource.includes(old), 'no module builds ' + old + ' any more');
  }
  assert(!fs.existsSync(path.join(ROOT, 'js/resolvers/learnings.js')), 'the hand-built reader (js/resolvers/learnings.js) is gone');
  for (const file of ['css/article-reading.css', 'css/learnings.css', 'css/document-flow.css']) assert(!fs.existsSync(path.join(ROOT, file)), file + ' is gone');
  assert(!/\.(learning|article)-[a-z-]+/.test(read('css/page-layout.css') + read('css/site-direction.css') + read('css/settings.css') + read('css/color-system.css')), 'no learning-* / article-* rule is left in the shared stylesheets');
  assert(!/data-page\^="article\/"\][^{]*canvas/.test(read('css/site-direction.css')), 'no rule puts the particle canvas back on a note');
  /* Named regression (docs/ux-audit/ledger.md, /learnings "four names", 2026-10-20): the fixed corner button said NOTES
     but was built from the copy key NAV.BACK.TUTORIALS -- the fourth name survived in the key an editor sees in the Content
     lens. The key is named for what it says. */
  assert(read('js/hero-motion.js').includes("'NAV.BACK.NOTES'"), 'the corner button on a note reads the key NAV.BACK.NOTES');
  assert(!/BACK\.TUTORIALS/.test(read('js/hero-motion.js') + read('js/content/manifests/nav.js')), 'no TUTORIALS key is left in the corner button or the nav manifest');
  assert(/"BACK\.NOTES": \{\s*"label": "Back to the notes",\s*"kind": "line",\s*"section": "Back button",\s*"value": "NOTES"/.test(read('js/content/manifests/nav.js')), 'the nav manifest holds BACK.NOTES = NOTES');
  const { catalog } = require('./lib/site-catalog.cjs').loadCatalog();
  assert(catalog.learnings.scripts.includes('js/ark/blocks.js') && !catalog.learnings.scripts.includes('js/resolvers/learnings.js'), '/learnings loads the blocks, not the old reader');
  const first = catalog['article/' + LC.articles[0].slug].scripts;
  assert(first.includes('js/pages/story.js') && first.indexOf('js/pages/story.js') < first.indexOf('js/pages/article.js') && first.includes('js/content/glossary/article-' + LC.articles[0].slug + '.js'), 'a note loads the story template and its own glossary before its module');

  /* ---- every route: the page, its words, its keys ------------------------------------------- */
  const lines = [];
  for (const route of asked) {
    const isIndex = route === '/learnings';
    const slug = route.split('/').pop(), article = isIndex ? null : LC.find(slug);
    const rules = isIndex ? INDEX : ARTICLE;
    const seen = await converted.check(route, { reshaped: rules.reshaped, retired: rules.retired, reworded: rules.reworded, inspect: (window, page) => {
      const depth = page.querySelector('[data-story-depth]');
      // A block's own arrow glyph is not its words, and neither is a glossary term's hidden tooltip (its
      // definition sits inside the element: "resolver" in "Written before resolver chains" carries one).
      const text = (el) => { if (!el.cloneNode) return String(el.textContent || '').trim(); const copy = el.cloneNode(true); copy.querySelectorAll('[data-ark-part="term-tip"]').forEach((t) => t.remove());
        return copy.textContent.replace(/[\u2190\u2192]/g, '').replace(/\s+/g, ' ').trim(); };
      return {
        cards: [...page.querySelectorAll('[data-ark-block="card-grid"] [data-ark-part="card"]')].map((c) => ({ title: text(c.querySelector('[data-ark-part="card-title"]')), meta: text(c.querySelector('[data-ark-part="card-footer"]') || c), eyebrow: text(c.querySelector('[data-ark-part="eyebrow"]') || c) })),
        // index only: cards a press away on a phone. Named apart from the article's `folded` below -- one
        // object literal held both under `folded`, and the later key silently replaced the count.
        foldedCards: page.querySelectorAll('[data-ark-block="disclosure"][data-fold-below="phone"] [data-ark-part="card"]').length,
        eyebrow: text(page.querySelector('[data-ark-block="hero"] [data-ark-part="eyebrow"]') || { textContent: '' }),
        meta: [...page.querySelectorAll('[data-ark-block="hero"] [data-ark-part="hero-meta"] dd')].map(text),
        crumbs: [...page.querySelectorAll('[data-ark-block="breadcrumb"] [data-ark-part="breadcrumb-item"]')].map(text),
        depth: depth ? [...depth.querySelectorAll('[role="tab"]')].map(text) : null,
        variant: depth && depth.getAttribute('data-variant'),
        tablists: page.querySelectorAll('[role="tablist"]').length,
        rows: [...page.querySelectorAll('#article-questions [data-ark-part="accordion-trigger"], #article-questions-rest [data-ark-part="accordion-trigger"]')].map(text),
        inSight: page.querySelectorAll('#article-questions [data-ark-part="accordion-trigger"]').length,
        folded: [...page.querySelectorAll('#article-questions-more')].map((d) => ({ below: d.getAttribute('data-fold-below'), rows: d.querySelectorAll('[data-ark-part="accordion-trigger"]').length, trigger: text(d.querySelector('[data-ark-part="disclosure-trigger"]')) })),
        panels: [...page.querySelectorAll('#article-questions [data-ark-part="accordion-content"], #article-questions-rest [data-ark-part="accordion-content"]')].map((p) => p.querySelectorAll('p').length),
        aside: !!page.querySelector('.story-body[data-split] .story-side #article-status'),
        summaries: page.querySelectorAll('[data-ark-block="pager"] .ark-pager__summary').length,
        pagers: page.querySelectorAll('[data-ark-block="pager"]').length,
        table: page.querySelectorAll('#article-table tbody tr').length,
        facts: [...page.querySelectorAll('#article-evidence [data-ark-part="fact"]')].map((f) => ({ text: text(f), href: f.querySelector('a') && f.querySelector('a').getAttribute('href') })),
        callout: text(page.querySelector('[data-ark-block="callout"]') || { textContent: '' }),
        pager: [...page.querySelectorAll('[data-ark-block="pager"] a')].map((a) => ({ href: a.getAttribute('href'), text: text(a) })),
        terms: page.querySelectorAll('[data-ark-part="term"][data-term]').length,
        oldNames: /TUTORIALS|LEARNINGS/.test(page.textContent) ? page.textContent.match(/\S*(TUTORIALS|LEARNINGS)\S*/)[0] : null,
        canvasRules: [...window.document.styleSheets].length
      };
    } });
    assert.equal(seen.oldNames, null, route + ': the section is called Notes everywhere');
    assert(seen.crumbs.length >= 2 && seen.crumbs[0] === 'Home' && seen.crumbs[1] === 'Notes', route + ': the breadcrumb is Home / Notes / ...');
    if (isIndex) {
      assert.equal(seen.cards.length, LC.articles.length, 'one card per note');
      assert.deepEqual(seen.cards.map((c) => c.title), host(LC.articles.map((a) => a.title)), 'the cards are the notes in reading order');
      seen.cards.forEach((c, i) => {
        const a = LC.articles[i];
        assert(c.meta.includes(LC.readTime(a).toLowerCase()) && c.meta.includes(a.reviewed), a.slug + ': the card shows the derived read time and the review date (' + c.meta + ')');
        assert(c.eyebrow.includes(a.category), a.slug + ': the card shows its series');
      });
      assert.equal(seen.foldedCards, LC.articles.length - 3, 'on a phone the first three cards are in sight and the rest a press away (every card from 601px up)');
      assert.equal(seen.eyebrow, 'Notes / ' + String(LC.articles.length).padStart(2, '0'), 'the hero counts the notes');
      assert.equal(seen.pagers, 0, 'no pager under the cards: every card leads on (the fold rule at 1440x900)');
    } else {
      const index = LC.articles.indexOf(article), questions = article.questions || article.sections.map((s) => s[0]);
      assert.deepEqual(seen.depth, DEPTH, route + ': the one depth label set');
      assert.equal(seen.variant, 'segmented', route + ': the depth control is segmented');
      assert.equal(seen.tablists, 1, route + ': one depth control');
      assert.equal(seen.eyebrow, 'Notes · ' + (index + 1) + ' of ' + LC.articles.length, route + ': the eyebrow says where the note sits');
      assert.deepEqual(seen.meta, [article.category, LC.readTime(article).toLowerCase(), article.reviewed], route + ': the hero\'s record is the series, the derived read time and the review date');
      assert.deepEqual(seen.rows, host(questions.map((q, i) => String(i + 1).padStart(2, '0') + ' · ' + q)), route + ': every question is a numbered, named accordion row');
      assert.deepEqual(seen.panels, host(article.sections.map((s) => s.length)), route + ': every row holds its section (heading, then every paragraph)');
      const n = questions.length, k = n > 6 ? Math.ceil(n / 2) : n;
      assert.equal(seen.inSight, k, route + ': ' + k + ' of ' + n + ' questions in sight on every width');
      assert.deepEqual(seen.folded, k < n ? [{ below: 'phone', rows: n - k, trigger: 'Questions ' + String(k + 1).padStart(2, '0') + '\u2013' + String(n).padStart(2, '0') }] : [], route + ': a list longer than six rows folds its second half on a phone only');
      assert(seen.aside, route + ': the dated-history callout sits beside the questions (the story body\'s side column)');
      assert.equal(seen.summaries, 0, route + ': the pager repeats no direction label as a summary');
      assert.equal(seen.table, article.numbers ? 6 : 0, route + ': the starting-values table is there exactly when the note has one');
      assert.equal(seen.facts.length, 2, route + ': the editorial review and the evidence document are facts');
      assert(seen.facts[0].text.includes(article.reviewed) && seen.facts[1].text.includes(article.evidenceLabel), route + ': the facts carry the review date and the evidence label');
      assert(/^(\/|#\/)reference\?doc=/.test(seen.facts[1].href), route + ': the evidence doc link resolves through the one link resolver (' + seen.facts[1].href + ')');
      assert(seen.callout.includes('When this was written') && seen.callout.includes('Written before resolver chains'), route + ': the dated-history note is the callout');
      const next = LC.articles[(index + 1) % LC.articles.length];
      assert(seen.pager.some((p) => p.href === '/learnings/' + next.slug), route + ': the pager\'s next page is the next note');
      assert(seen.pager.some((p) => p.href === '/learnings'), route + ': the pager leads back to all notes');
      assert(seen.pager.some((p) => p.text === article.actionLabel), route + ': the note\'s own next step is in the pager');
      assert(seen.terms > 0, route + ': the first use of a glossary word is a term');
    }
    lines.push(`${route} ${seen.tally.kept}/${seen.tally.reshaped}/${seen.tally.retired}`);
  }

  /* ---- the old ?q=<n> address opens its question; a row writes the address ----------------- */
  if (asked.some((r) => r !== '/learnings')) {
    const slug = asked.find((r) => r !== '/learnings').split('/').pop(), article = LC.find(slug);
    const deep = await checks.visit('/learnings/' + slug + '?q=' + article.sections.length, (window, page) => {
      const open = [...page.querySelectorAll('#article-questions [data-ark-part="accordion-trigger"], #article-questions-rest [data-ark-part="accordion-trigger"]')].map((t) => t.getAttribute('aria-expanded') === 'true');
      const view = [...page.querySelectorAll('[data-story-depth] [role="tab"]')].find((t) => t.getAttribute('aria-selected') === 'true');
      return { open, view: view && view.textContent.trim(), search: window.location.search };
    });
    assert.equal(deep.view, 'Step by step', slug + '?q=n: the old address opens the questions view (Step by step)');
    assert.deepEqual(deep.open.map((o, i) => o ? i + 1 : 0).filter(Boolean), [article.sections.length], slug + '?q=n: the old address opens question n');
    const viewed = await checks.visit('/learnings/' + slug + '?view=reference', (window, page) => ({
      view: ([...page.querySelectorAll('[data-story-depth] [role="tab"]')].find((t) => t.getAttribute('aria-selected') === 'true') || {}).textContent
    }));
    assert.equal((viewed.view || '').trim(), 'Evidence', slug + '?view=reference opens Evidence');
  }

  /* ---- the server render ---------------------------------------------------------------- */
  if (asked.includes('/learnings')) await checks.assertServerRender('/learnings', 'learnings', { idPrefix: INDEX.ids });
  const firstArticle = asked.find((r) => r !== '/learnings');
  if (firstArticle) await checks.assertServerRender(firstArticle, 'article/' + firstArticle.split('/').pop(), { idPrefix: ARTICLE.ids });

  console.log(`PASS: the notes index and ${asked.length - (asked.includes('/learnings') ? 1 : 0)} note(s) are Ark blocks; excerpt figures grounded, read times derived; old layout keys kept/reshaped/retired: ${lines.join(', ')}.`);
})().catch((error) => { console.error(error); process.exit(1); });
