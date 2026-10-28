'use strict';
/* run-tests-timeout-ms: 1500000 -- two jsdom boots of the real site per route, 18 routes. */
/* THE STORY TEMPLATE (js/pages/story.js): the theory sheets (/concept/*, /dao), the agreement
   chapters (/how-deployment-works/ask|work|check), the agreement lifecycle (/lifecycle and its five
   stages) and the /concept index, as pages of Ark blocks. Run alone (owner test law);
   `node tests/story-blocks.cjs /lifecycle /dao` checks some.

   2026-10-27, owner-confirmed: "Deploy a resolver" (/how-deployment-works, js/pages/deployment.js) is
   removed (b0dc2d7). Its source, catalog, words and figure-fold checks guarded a page that no longer
   exists and are dropped; the removal itself is locked below (no file, no catalog entry). Its frozen
   census (tests/fixtures/layout-keys/how-deployment-works.tsv) and its reasons in
   tests/fixtures/story-continuity.cjs stay as evidence of what the page held; REMOVED keeps the route
   out of the walk. The three agreement chapters it led to stay, with every check.

   Named regressions it holds:
   - Seven tab/depth controls with three ARIA models and three label sets for one idea ("The core
     idea / How it works / Evidence & limits", "How it works / Why this way / What it proves",
     "Answer / Understand why / Evidence"; docs/ux-audit/pages-ux-a.md #5): every story page has
     ONE depth control -- Ark tabs, segmented -- with ONE label set.
   - Arial depth buttons (the browser's default button font): the control is Ark's, which
     inherits the page font (css/ark-blocks.css `font:inherit`).
   - Three numberings for one stage ("HOME / 02 / AGREEMENT LIFECYCLE / 03 / INTENT" over the
     kicker "01 / INTENT" over a 01-05 trail): the breadcrumb carries no ordinals; the eyebrow
     alone says where the page sits ("Agreement lifecycle · 1 of 5").
   - Diagram labels drawn at 6-9px: every drawing sits in Ark's figure frame, whose labels are
     held at 12px or more (data-ark-label), and which pauses its drawing when scrolled away.
   - The illustration removed on phones (display:none): the figure folds behind "Show the
     illustration" at 900px and narrower (Ark's disclosure), never removed.
   - A story page that was a dead end: every one ends in a pager, a hand-off or the hero's next
     step.
   - Validate the payload, not the pipeline: every word the old page showed is still on the page
     (WORDS below, read from the same manifests and content the page reads).
   - Saved CMS data is never rewritten: every old layout key (frozen census,
     tests/fixtures/layout-keys/) still names an element with the same words, or is listed below
     as reshaped / retired with its reason, and a real saved edit on each lands. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const continuity = require('./lib/layout-continuity.cjs');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const DEPTH = ['The idea', 'Step by step', 'Evidence']; // 'Step by step' since 2026-10-22 (first-visit audit, P1): 'How it works' is the header's name for /how-deployment-works, so the tab and the nav link said the same words for two things
const STAGES = ['intent', 'offer', 'agreement', 'fulfillment', 'receipt'];
const SHEETS = ['purpose', 'depth', 'practice', 'notes', 'studio', 'spec'];

/* The icons js/hero-motion.js drew inside the old hand-built links and buttons, and the parts of
   each; Ark's blocks draw their own arrows (text), so nothing carries these keys. */
const icon = (key) => /\/(a|button|article):\d+\/svg:\d+(\/(path|circle|rect|line|polyline|g):\d+)*$/.test(key);
const ICON_REASON = 'an icon js/hero-motion.js (or the old /concept card) drew inside an old hand-built link, button or card; Ark\'s blocks draw their own arrows, so nothing carries it';

/* Per route: why each old key whose words changed shape still lands on its successor
   (`reshaped`), and why nothing carries the others now (`retired`). Filled from
   `node tests/lib/layout-continuity.cjs derive <route>`'s unresolved list, one reason each. */
const EXPECT = require('./fixtures/story-continuity.cjs');

/* routes removed on purpose (owner-confirmed 2026-10-27): their fixture entries are kept as evidence, not walked */
const REMOVED = ['/how-deployment-works'];
const ROUTES = Object.keys(EXPECT).filter((route) => !REMOVED.includes(route)).filter((route) => process.argv.length <= 2 || process.argv.slice(2).includes(route));

(async () => {
  /* ---- the modules are story specs of Ark blocks ------------------------------------------- */
  const story = read('js/pages/story.js');
  assert(/var DEPTH = \[\s*\{ value: 'focus', label: 'The idea' \},\s*\{ value: 'context', label: 'Step by step' \},\s*\{ value: 'reference', label: 'Evidence' \}\s*\];/.test(story), 'ONE depth label set, defined once');
  assert(/block\('tabs', 'depth', \{\s*label: 'Explanation depth', variant: 'segmented'/.test(story), 'the depth control is Ark tabs, segmented');
  assert(!fs.existsSync(path.join(ROOT, 'js/pages/deployment.js')), 'the deployment page (js/pages/deployment.js) is removed');
  for (const file of ['js/pages/lifecycle.js', 'js/pages/sheet.js', 'js/pages/how-stories.js']) {
    const source = read(file);
    assert(source.includes('ArkUI.story.mount(def'), file + ' is built by the story template');
    assert(!/ArkUI\.el\('(section|header|h1|nav|aside|figure)'/.test(source), file + ': no hand-built page structure is left (sections, headers, h1, navs, asides, figures are blocks)');
    for (const old of ['story-depth', 'how-view-tab', 'lifecycle-trail', 'content-layer-path', 'story-kicker', 'guided-step-picker', 'mechanism-step', 'aria-pressed\', String(i === depth']) assert(!source.includes(old), file + ' no longer builds ' + old);
  }
  const concept = read('js/pages/concept.js');
  assert(concept.includes('ArkUI.page([') && concept.includes('ArkUI.story.bindTabs('), '/concept is a page of Ark blocks, its question groups bound to the address like the depth control');
  const catalog = read('js/pages/catalog.js');
  assert(/ArkUI\.storyScripts = ArkUI\.blockScripts\.concat\(\[ArkUI\.glossaryScript, 'js\/pages\/story\.js'\]\);/.test(catalog), 'a story route loads the blocks, the glossary and the template');
  for (const [key, file] of [['lifecycle', 'lifecycle.js'], ["'lifecycle/intent'", 'lifecycle.js'], ["'how/ask'", 'how-stories.js'], ['concept', 'concept.js'], ['dao', 'sheet.js']]) {
    assert(new RegExp('  ' + key.replace(/[/']/g, (c) => '\\' + c) + ": \\{ module: '[a-zA-Z]+', scripts: ArkUI\\.storyScripts\\.concat\\(\\[(?:'[^']+', )*'js/pages/" + file.replace('.', '\\.')).test(catalog), key + ' loads the story scripts');
  }
  assert(!/^\s+deployment: \{/m.test(catalog), 'the catalog has no deployment entry');
  assert(catalog.includes("module: 'theory', scripts: ArkUI.storyScripts.concat(['js/pages/sheet.js', 'js/pages/theory.js', 'js/ark/page-kit.js'])"), 'derived theory routes load the story scripts (and the page kit, W4-S14: the case rule and the ways on)');

  /* ---- every route: the page, its words, its keys ------------------------------------------- */
  const lines = [];
  for (const route of ROUTES) {
    const expect = EXPECT[route];
    const census = continuity.readCensus(route);
    const { keys, extra: seen } = await continuity.pageKeys(route, { inspect: (window) => {
      const { document, ArkCopy, ArkManifest, ArkUI } = window;
      const page = document.querySelector('[data-ark-page]');
      const own = (el) => { let text = el.textContent; for (const tip of el.querySelectorAll('[data-ark-part="term-tip"]')) text = text.replace(tip.textContent, ''); return text.replace(/\s+/g, ' '); };
      const text = own(page).toLowerCase();
      /* WORDS: what the old page showed, from the same sources the page reads. */
      const words = [];
      const copy = (key) => words.push(ArkCopy.text(key));
      const id = route.split('/').pop();
      if (route.startsWith('/lifecycle')) {
        const stage = route === '/lifecycle' ? null : id;
        if (stage) {
          const c = ArkUI.lifecycleContent[stage];
          words.push(c.heading, c.lead, c.body, c.note.replace('What is still not true: ', ''), ...c.facts.flat().filter((w) => w !== 'Next'));
          words.push('The diagram does not supply real CIDs or result artifacts. Inspect actual signed records before drawing a verification conclusion.');
        } else {
          words.push('From request to receipt.', 'One snapshot / five signed records', 'Five records. One reference trail.', 'Each signed record adds a reference to the same agreement.', 'Status / Partial', 'Implemented in source. Full public production automation and economic settlement remain unverified.');
        }
        words.push('Read the agreement guide', ...STAGES.map((s) => ArkUI.lifecycleStages.find((x) => x.id === s).title));
      } else if (route.startsWith('/how-deployment-works/')) {
        const area = 'DEPLOYMENT.CHAPTER.' + id.toUpperCase();
        ['TITLE', 'INTRO', 'NOW', 'NOT', 'RECORD.LABEL', ...[1, 2, 3].flatMap((n) => ['CHOICE' + n, 'DETAIL' + n, 'WHY' + n + '.TITLE', 'WHY' + n + '.TEXT'])].forEach((k) => copy(area + '.' + k));
        copy(area + '.' + { ask: 'JOB', work: 'JOIN', check: 'RESULT' }[id]);
        copy('DEPLOYMENT.CHAPTER.BANNER');
        ArkCopy.text(area + '.RECORD').split('\n').forEach((line) => { const row = line.replace(/^\[[\d,\s]+\]\s*/, ''), cut = row.indexOf(': '); if (cut > 0) words.push(row.slice(0, cut), row.slice(cut + 2)); });
        words.push('True after this step', 'Not yet true', 'Explore the signed record', 'What is a resolver');
      } else if (route === '/concept') {
        copy('CONCEPT.TITLE'); copy('CONCEPT.DECK');
        ArkManifest.group('theory').forEach((m) => { copy(m.id.toUpperCase() + '.TITLE'); words.push(m.title + ' / open explanation'); });
        // 'Evidence & activation' since 2026-10-22 (first-visit audit, P2): 'Inspect evidence & activation' was cut off at 390px
        words.push('Start with a question', 'Evidence & activation', 'The math behind a resolver', 'Resolver math / open the page');
      } else {
        const area = id.toUpperCase(), m = ArkManifest.get(id);
        Object.keys(m.fields).filter((k) => /^(TITLE|DECK|NEXT|EVIDENCE|STATUS\.(TITLE|TEXT)|LIMIT\.(TITLE|TEXT)|POINT\d+\.(TITLE|TEXT))$/.test(k) || (m.fields[k + '.HREF'] && m.fields[k + '.HREF'].kind === 'link')).forEach((k) => copy(area + '.' + k));
        if (id === 'dao') copy('NOTES.CTA'); // /dao leads on with the words its destination authored for the link (W4-S14), not the hand-typed "Inspect activation gates"
      }
      const missing = words.filter((w) => w && !text.includes(String(w).replace(/\s+/g, ' ').toLowerCase()));
      const depth = page.querySelector('[data-story-depth]');
      return {
        missing,
        blocks: [...page.children].map((el) => el.getAttribute('data-ark-block') || (el.hasAttribute('data-ark-insert') ? 'insert' : el.className)),
        depth: depth ? [...depth.querySelectorAll('[role="tab"]')].map((t) => t.textContent.trim()) : null,
        variant: depth ? depth.getAttribute('data-variant') : null,
        tablists: page.querySelectorAll('[role="tablist"]').length,
        figureFold: [...page.querySelectorAll('[data-ark-block="disclosure"]')].filter((d) => d.querySelector('[data-ark-block="figure"]')).map((d) => d.getAttribute('data-fold-below')),
        unlabelled: [...page.querySelectorAll('[data-ark-block="figure"] svg text')].filter((t) => !t.hasAttribute('data-ark-label')).length,
        h1: page.querySelectorAll('h1').length,
        crumbs: [...page.querySelectorAll('[data-ark-block="breadcrumb"] [data-ark-part="breadcrumb-item"]')].map((a) => a.textContent.trim()),
        eyebrow: (page.querySelector('[data-ark-block="hero"] [data-ark-part="eyebrow"]') || {}).textContent || '',
        onward: page.querySelectorAll('[data-ark-block="pager"] a, [data-ark-block="hero"] a[data-ark-part="button"], .dx-onward a, [data-ark-block="card-grid"] a').length,
        pager: [...page.querySelectorAll('[data-ark-block="pager"] a')].map((a) => ({ text: a.textContent.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href') })),
        terms: page.querySelectorAll('[data-ark-part="term"][data-term]').length,
        refused: page.querySelectorAll('[data-ark-block-refused]').length,
        /* every link opens a real address: a copy: key in an href opened nothing */
        badHrefs: [...page.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => !/^(\/|#|https?:\/\/)/.test(h)),
        insert: page.querySelectorAll('[data-ark-insert="main"]').length,
        hiddenByStyle: page.querySelectorAll('[style*="display: none"], [style*="display:none"]').length,
        /* a chapter's record fields (inside the "Show the record's fields" disclosure): { term, value, mono } */
        recordFacts: [...page.querySelectorAll('[data-ark-block="disclosure"] [data-ark-block="facts"] [data-ark-part="fact"]')].map((f) => ({
          term: (f.querySelector('[data-ark-part="fact-term"]') || {}).textContent || '', value: (f.querySelector('[data-ark-part="fact-value"]') || {}).textContent || '', mono: (f.querySelector('[data-ark-part="fact-value"]') || { getAttribute() {} }).getAttribute('data-mono') === 'true'
        }))
      };
    } });
    assert.deepEqual(seen.missing, [], route + ': every word the old page showed is still on the page');
    assert.equal(seen.refused, 0, route + ': no block was refused');
    assert.deepEqual(seen.badHrefs, [], route + ': every link opens a real address (a copy: key is not an href)');
    assert.equal(seen.insert, 1, route + ': the CMS insertion anchor is still there');
    assert.equal(seen.h1, 1, route + ': one h1');
    assert.equal(seen.hiddenByStyle, 0, route + ': nothing is hidden by an inline style');
    assert(seen.onward > 0, route + ': the page is not a dead end');
    assert(seen.crumbs.length >= 2 && seen.crumbs.every((c) => !/^\d\d \//.test(c)), route + ': a breadcrumb with no ordinals');
    /* Regression (2026-10-20): /how-deployment-works/work and /check led each record row with the raw field
       name ("inputCid", "recipientId", "signatureB64"). A field name is the secondary, mono label under a
       plain-language one; a person's own label (the ask chapter's "Snapshot") stays as it was. */
    if (/^\/how-deployment-works\/(ask|work|check)$/.test(route)) {
      assert(seen.recordFacts.length >= 5, route + ': the record shows its fields');
      for (const fact of seen.recordFacts) {
        const raw = /^[a-z][A-Za-z0-9_]*(, [a-z][A-Za-z0-9_]*)*$/.test(fact.term);
        assert(!raw, route + ': "' + fact.term + '" is a raw field name used as the primary label');
        assert.equal(fact.mono, /^[a-z][A-Za-z0-9_]*(, [a-z][A-Za-z0-9_]*)*$/.test(fact.value), route + ': a field name is set in mono and nothing else is (' + fact.value + ')');
      }
      if (route !== '/how-deployment-works/ask') {
        assert(seen.recordFacts.some((f) => f.mono && /Cid$|Id$/.test(f.value)), route + ': the field names are kept, as the secondary line');
        assert(seen.recordFacts.some((f) => f.term.startsWith('What you asked to move') || f.term.startsWith('The terms it is checked against')), route + ': the plain meaning leads');
      }
    }
    /* Regression (docs/ux-audit/ledger.md, 2026-10-20): the last chapter closed on "Back to the lifecycle" and never said how to do it
       for real; "Run it yourself" leads on to /download. */
    if (route === '/how-deployment-works/check') assert(seen.pager.some((p) => /^Run it yourself/.test(p.text) && /^\/download/.test(p.href)), route + ': the closing leads on to /download ("Run it yourself")');
    if (route === '/concept') {
      assert.equal(seen.tablists, 1, '/concept: one question-group control');
    } else {
      assert.deepEqual(seen.depth, DEPTH, route + ': the one depth label set');
      assert.equal(seen.variant, 'segmented', route + ': the depth control is segmented');
      assert.equal(seen.tablists, 1, route + ': one depth control, no second segmented control');
      // /dao also carries the manifest's deploy-flow figure (W4-S13, tests/resolver-page-parts.cjs): a second fold, closed at every width (open it ran to 1.9 screens).
      // /how-deployment-works carried it too until that page was removed (owner-confirmed 2026-10-27).
      assert.deepEqual(seen.figureFold.slice().sort(), route === '/dao' ? ['always', 'tablet'] : ['tablet'], route + ': the figure folds behind a button at 900px and narrower, never removed');
      assert.equal(seen.unlabelled, 0, route + ': every drawn label is held at 12px or more');
      assert(seen.terms > 0, route + ': the first use of a glossary word is a term');
    }
    if (route.startsWith('/lifecycle/')) assert.equal(seen.eyebrow, 'Agreement lifecycle · ' + (STAGES.indexOf(route.split('/').pop()) + 1) + ' of 5', route + ': the eyebrow alone says where the stage sits');
    assert(keys.every((entry) => !/^id:ark-r-/.test(entry.key)), route + ': no generated (ark-r-) id became a layout key');

    const retired = { ...expect.retired };
    census.filter((old) => icon(old.key) && !retired[old.key]).forEach((old) => { retired[old.key] = ICON_REASON; });
    const tally = continuity.assertContinuity(census, keys, { reshaped: expect.reshaped, retired });
    assert.equal(tally.kept + tally.reshaped + tally.retired, census.length, route + ': every old key is accounted for');
    const landed = await continuity.assertSavedEditsLand(route, census, { reshaped: expect.reshaped, retired });
    assert.equal(landed, census.length - 1 - Object.keys(retired).length, route + ': a saved frame on every old key but page:/ and the retired ones landed');
    lines.push(`${route} ${tally.kept}/${tally.reshaped}/${tally.retired}`);
  }
  console.log(`PASS: ${ROUTES.length} story pages are Ark blocks with one depth control and nothing dropped; old layout keys kept/reshaped/retired: ${lines.join(', ')}.`);
})().catch((error) => { console.error(error); process.exit(1); });
