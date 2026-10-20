'use strict';
/* run-tests-timeout-ms: 1500000 -- three jsdom boots of the real site per route, 21 routes. */
/* /resolutions and its 20 detail pages as pages of Ark blocks (js/pages/resolutions.js, DEFXN
   polish Wave 3, W3-GUIDE): one index spec and ONE detail template for all 20. Run alone (owner
   test law); `node tests/resolutions-blocks.cjs /resolutions/finance /resolutions` checks some.

   Named regressions it holds:
   - Mobile feature reduction (docs/ux-audit/pages-ux-b.md "/resolutions/*" P1): at 390px the lede,
     the Problem row, the main action and the Ready/Building/Ideas legend were display:none and
     every product line was clamped to one line with "...". Every word of the old page is on the
     converted page (WORDS below, plus every leaf of the frozen census), nothing is hidden by a
     style, and what folds is an Ark disclosure, tab or accordion -- a press away.
   - Two hand-built ARIA tablists, one with no focus ring on 21 routes (P1): the domains and the
     product shelf are Ark tabs (their panel ring is Ark's), and the idea rail -- a second
     selection model inside a tab panel (P2) -- is an accordion.
   - "Ready" painted in --primary, the identity colour (cross-page #8): a product's state is said
     in words in its row, and no block on these pages paints a state with --primary.
   - Truncated deck and note with no way to read them (index P1): Ark disclosures that offer "More".
   - Phone domain tabs reduced to "01 02 03 04 05" (index P1): every tab is named.
   - The stat triplet as a row of its own (index P2): the eyebrow's tail, counted from the structure.
   - Saved CMS data is never rewritten: every old layout key of every page (frozen censuses,
     tests/fixtures/layout-keys/resolutions*.tsv) still names an element with the same words, or
     is listed below as reshaped / retired with its reason, a real saved edit on each lands, and
     no new element takes a retired key (it would inherit an edit saved for something else). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const continuity = require('./lib/layout-continuity.cjs');
const checks = require('./lib/block-page-checks.cjs');

const ROOT = checks.ROOT;
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const { catalog } = require('./lib/site-catalog.cjs').loadCatalog();
const SLUGS = Object.keys(catalog).filter((key) => key.startsWith('resolutions/')).map((key) => key.slice('resolutions/'.length));
const ALL = ['/resolutions', ...SLUGS.map((slug) => '/resolutions/' + slug)];
const ROUTES = ALL.filter((route) => process.argv.length <= 2 || process.argv.slice(2).includes(route));
const loose = continuity.loose;

/* ---- why each old key changed: one rule table for all 20 detail pages, one for the index ---- */
const ICON = /\/(a|button):\d+\/svg:\d+(\/(path|circle|rect|line|polyline|g):\d+)*$/;
const ICON_REASON = 'an icon js/hero-motion.js drew inside the old breadcrumb link; Ark\'s breadcrumb draws none';
const T = 'page:/div:1/section:1/div:2/div:1/(a|div):\\d+';
const DETAIL = [
  ['reshaped', /^page:\/div:1\/header:1$/, 'the intro became the hero; who it is for and the problem moved to the facts below it'],
  ['reshaped', /^page:\/div:1\/header:1\/p:1$/, 'the position "06 / 20 · Value & finance" reads "Resolution 6 of 20 · Value & finance" (the story pages\' "<sequence> · n of N")'],
  ['reshaped', /^page:\/div:1\/header:1\/div:1$/, 'the actions row keeps the main action; the deeper page beside it is a related page in the pager now, so the hero keeps one row of buttons on a phone'],
  ['reshaped', /^page:\/div:1\/section:1$/, 'the product shelf is Ark tabs'],
  ['reshaped', /^id:resolution-level-[a-z]+$/, 'the one panel that changed in place is the first tab\'s panel; every tab\'s content is in the page now'],
  ['reshaped', /^page:\/div:1\/section:1\/p:1$/, 'the legend is the first line of the tabs it explains ("Ready: ..., Building: ..." opens Ready now, "Ideas: ..." opens Product ideas) and the status link is a related page in the pager'],
  ['reshaped', /^page:\/div:1\/section:1\/div:2\/div:1$/, 'the product tiles are rows of an Ark accordion: each opens to its line and its page'],
  ['reshaped', new RegExp('^' + T + '$'), 'the product tile is an accordion row; a product with a page says "Open <name>" inside it'],
  ['reshaped', new RegExp('^' + T + '/span:3$'), '"Open →" names what it opens: "Open <product>"'],
  ['reshaped', /^page:\/nav:2$/, 'the prev / all / next footer is Ark\'s pager: previous, next, and the related pages (the deeper page, All 20, Current status)'],
  ['reshaped', /^page:\/nav:2\/a:[13]$/, 'the pager link says the direction first: "Previous Payments", "Next Community"'],
  ['retired', /^page:\/div:1$/, 'the two-column workspace wrapper; a block page stacks its blocks in the page root'],
  ['retired', /^page:\/div:1\/section:1\/div:1\/button:[12]\/span:1$/, 'the count is part of the tab\'s one label now ("Ready · 3"); an Ark tab has no inner element to carry it'],
  ['retired', new RegExp('^' + T + '/span:1/(strong|span):1$'), 'the name and the state are one row title now ("Auth Kit · Ready"), which keeps the head\'s key'],
  ['retired', /^page:\/div:1\/section:1\/p:1\/span:[12]$/, 'its words ("Ready: usable today", "Building: in source, not released") are one line, the Ready now tab\'s first, which keeps the legend\'s key']
];
const INDEX = [
  ['reshaped', /^page:\/header:1$/, 'the header became the hero; the deck is the disclosure after it'],
  ['reshaped', /^page:\/header:1\/div:1\/p:1$/, 'the eyebrow ends with the stat triplet now: "DEFXN / RESOLUTIONS · 20 resolutions · 05 domains · 01 mesh"'],
  ['reshaped', /^page:\/header:1\/dl:1$/, 'the stat triplet (pages-ux-b.md /resolutions P2, a row of its own) is the eyebrow\'s tail, whose text carries this key'],
  ['reshaped', /^page:\/section:1$/, 'the domain browser is Ark tabs'],
  ['reshaped', /^page:\/section:1\/div:1$/, 'the domain tab list: each tab is the domain\'s name and its count ("Build & publish · 4"); the number was its place in the list'],
  ['reshaped', /^id:resolution-domain-[a-z]+$/, 'the domain tab: "01Build & publish04" reads "Build & publish · 4"'],
  ['reshaped', /^id:resolution-domain-panel$/, 'the one panel that changed in place is the first domain\'s tab panel'],
  ['reshaped', /^page:\/section:1\/div:2\/div:2$/, 'the entry list is Ark\'s card grid'],
  ['reshaped', /^page:\/section:1\/div:2\/div:2\/a:\d$/, 'the numbered entry link is a card in the grid (its number was its place in the list)'],
  ['reshaped', /^page:\/aside:1$/, 'the status note and its link are one disclosure: whole from 601px up, its first line and "More" on a phone'],
  ['retired', /^page:\/header:1\/div:1$/, 'the hero\'s copy column; Ark\'s hero has no inner column'],
  ['retired', /^page:\/header:1\/dl:1\/div:\d(\/(dt|dd):1)?$/, 'each count is a phrase of the eyebrow now ("20 resolutions"), which carries the row\'s key'],
  ['retired', /^page:\/section:1\/div:1\/button:\d\/span:[123]$/, 'the tab\'s number, name and count are its one label now; an Ark tab has no inner element to carry them'],
  ['retired', /^page:\/section:1\/div:2\/div:1(\/div:1(\/(p|h2):1)?)?$/, 'the panel head ("01 / 05" over the domain\'s name): the tab names the domain and its place is its order; the intro keeps its key as the panel\'s first line'],
  ['retired', /^page:\/section:1\/div:2\/div:2\/a:\d\/span:[13]$/, 'the entry\'s number and hand-drawn arrow: the card\'s title is its link and draws its own arrow']
];
function expectFor(route, census) {
  const table = route === '/resolutions' ? INDEX : DETAIL;
  const reshaped = {}, retired = {};
  for (const old of census) {
    if (ICON.test(old.key)) { retired[old.key] = ICON_REASON; continue; }
    const rule = table.find(([, re]) => re.test(old.key));
    if (rule) (rule[0] === 'reshaped' ? reshaped : retired)[old.key] = rule[2];
  }
  return { reshaped, retired };
}
/* Leaf words of the old page that are on the new page in another form, with the reason (every
   other leaf's words must be in the new page's text). */
const REWORDED = [
  [/^page:\/div:1\/header:1\/p:1$/, 'the position reads "Resolution 6 of 20" instead of "06 / 20"'],
  [/^page:\/section:1\/div:2\/div:1\/div:1\/p:1$/, 'the domain\'s "01 / 05" is its place in the tab list'],
  [/^(page:\/section:1\/div:1\/button:\d\/span:1|page:\/section:1\/div:2\/div:2\/a:\d\/span:1)$/, 'a list number: the place of the tab or card in its list'],
  [/^page:\/header:1\/dl:1/, 'the stat triplet reads "20 resolutions · 05 domains · 01 mesh" in the eyebrow (value before its name, as it was drawn)'],
  [/^page:\/section:1\/div:1\/button:\d\/span:3$/, 'the domain\'s count reads "· 4" in its tab label']
];

(async () => {
  /* ---- the module is a spec of Ark blocks -------------------------------------------------- */
  const source = read('js/pages/resolutions.js');
  checks.assertSourceIsSpec(source, 'js/pages/resolutions.js');
  assert(!/\bel\('(section|header|h1|h2|nav|article|aside)'/.test(source) && !/role', 'tab/.test(source) && !/aria-pressed/.test(source), 'no hand-built page structure, tablist or pressed-button group is left');
  assert(/function detailSpec\(item\)/.test(source) && (source.match(/ArkUI\.page\(/g) || []).length === 2, 'one index spec and ONE detail template (two ArkUI.page calls)');
  for (const key of ['resolutions', 'resolutions/finance']) {
    const scripts = [...catalog[key].scripts];
    assert(scripts.includes('js/ark/blocks.js') && scripts.indexOf('js/ark/blocks.js') < scripts.indexOf('js/pages/resolutions.js'), key + ': the route loads the blocks before its module');
    assert(scripts.includes('js/content/glossary.js'), key + ': the route loads the glossary (first-use terms)');
  }
  const css = read('css/resolutions.css');
  assert(!/\.resolution(s-(page|hero|deck|domain|note|list|browser|measure)|-(detail|product|idea|level|legend|next|brief|status|chip))/.test(css), 'the hand-built resolution page CSS is gone (css/resolutions.css keeps the header\'s Products menu)');

  const lines = [];
  for (const route of ROUTES) {
    const census = continuity.readCensus(route);
    const expect = expectFor(route, census);
    const { keys, extra: seen } = await continuity.pageKeys(route, { inspect: (window) => {
      const { document, ArkCopy, ArkResolutions, ArkResolutionProducts } = window;
      const page = document.querySelector('[data-ark-page]');
      const own = (el) => { const copy = el.cloneNode(true); copy.querySelectorAll('[data-ark-part="term-tip"]').forEach((tip) => tip.remove()); return copy.textContent.replace(/\s+/g, ' '); };
      const text = own(page).toLowerCase();
      const words = [];
      const lc = (w) => String(w);
      if (route === '/resolutions') {
        ['EYEBROW', 'TITLE', 'DECK', 'NOTE', 'NOTE.LINK'].forEach((k) => words.push(ArkCopy.text('RESOLUTIONS.' + k)));
        words.push('Home', 'Resolutions', '20 resolutions', '05 domains', '01 mesh');
        for (const group of ArkResolutions.list()) {
          words.push(group.title);
          for (const item of group.items) words.push(ArkResolutions.shortName(item.title), item.text);
        }
      } else {
        const item = ArkResolutions.find(route.split('/').pop()), shelf = ArkResolutionProducts.forResolution(item.key);
        const all = ArkResolutions.all(), at = all.findIndex((x) => x.slug === item.slug);
        words.push(item.title, item.text, ArkResolutions.shortName(item.title), ArkResolutions.groupFor(item.group).title, 'All resolutions');
        words.push(shelf.audience, shelf.problem, 'For', 'Problem', 'Ready now', 'usable today', 'Building', 'in source, not released', 'Product ideas', 'proposed, not built');
        for (const p of shelf.ready) { words.push(p.name, p.line, p.status === 'ready' ? 'Ready' : 'Building'); if (p.page && window.ArkUI.pageCatalog[p.page]) words.push('Open ' + p.name); }
        shelf.ideas.forEach((idea, i) => words.push(idea.name, 'Idea 0' + (i + 1), 'not built yet', idea.audience.slice(1), idea.problem, idea.product, ...idea.builds.map((b) => b.name)));
        words.push('How it resolves', 'The shift', item.shift.slice(1), 'Instead of', item.old.slice(1), ...item.steps, 'Define', 'Publish', 'Resolve');
        words.push(item.start && window.ArkUI.pageCatalog[item.start] ? ArkCopy.text('RESOLUTIONS.START') : 'How resolvers work');
        for (const more of [item.also, item.alsoMore]) if (more && window.ArkUI.pageCatalog[more]) words.push(String(window.ArkUI.pageCatalog[more].title).split(' — ')[0]);
        words.push(ArkResolutions.shortName(all[(at - 1 + all.length) % all.length].title), ArkResolutions.shortName(all[(at + 1) % all.length].title), 'Previous', 'Next', 'All 20', ArkCopy.text('RESOLUTIONS.NOTE.LINK'));
      }
      const missing = words.filter((w) => w && !text.includes(lc(w).replace(/\s+/g, ' ').toLowerCase()));
      const tabs = (id) => [...page.querySelectorAll('#' + id + ' [role="tab"]')].map((t) => t.textContent.trim());
      return {
        missing, text,
        blocks: [...page.children].map((el) => el.getAttribute('data-ark-block') || (el.hasAttribute('data-ark-insert') ? 'insert' : el.tagName)),
        domainTabs: tabs('resolutions-domains'),
        shelfTabs: [...page.querySelectorAll('[id$="-shelf"] [role="tab"]')].map((t) => t.textContent.trim()),
        rows: page.querySelectorAll('[id$="-shelf"] [data-ark-block="accordion"]').length ? [...page.querySelectorAll('[id$="-shelf"] [data-ark-block="accordion"]')].map((a) => a.querySelectorAll(':scope > [data-ark-part="accordion-item"]').length) : [],
        steps: page.querySelectorAll('[data-ark-part="step"]').length,
        cards: page.querySelectorAll('[data-ark-part="card"]').length,
        tablists: page.querySelectorAll('[role="tablist"]').length,
        pressed: page.querySelectorAll('[aria-pressed]').length,
        h1: [...page.querySelectorAll('h1')].map((h) => h.id),
        labelledBy: page.getAttribute('aria-labelledby'),
        refused: page.querySelectorAll('[data-ark-block-refused]').length,
        insert: page.querySelectorAll('[data-ark-insert="main"]').length,
        hiddenByStyle: page.querySelectorAll('[style*="display: none"], [style*="display:none"]').length,
        badHrefs: [...page.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => !/^(\/|#|https?:\/\/)/.test(h)),
        related: [...page.querySelectorAll('[data-ark-block="pager"] [data-ark-part="pager-related"] a')].map((a) => a.getAttribute('href')),
        pager: page.querySelectorAll('[data-ark-block="pager"] a[rel="prev"], [data-ark-block="pager"] a[rel="next"]').length,
        unfolded: [...page.querySelectorAll('[data-ark-block="disclosure"]')].map((d) => d.id + ':' + (d.getAttribute('data-fold-below') || 'always') + ':' + (d.getAttribute('data-preview') || '0'))
      };
    } });
    assert.deepEqual(seen.missing, [], route + ': every word the old page showed is still on the page');
    /* the payload, from the frozen census itself: every leaf the old page showed */
    /* a leaf: its next row (the census is in document order, so a container's first child follows
       it) is not part of its words -- id-keyed containers share no key prefix with their children */
    const leaves = census.filter((old, i) => old.text && old.text.length < 160 && !(census[i + 1] && census[i + 1].text && old.text.includes(census[i + 1].text)));
    const lost = leaves.filter((old) => !REWORDED.some(([re]) => re.test(old.key)) && !loose(seen.text).includes(loose(old.text))).map((old) => old.key + ' "' + old.text + '"');
    assert.deepEqual(lost, [], route + ': every leaf of the old page (frozen census) is in the new page\'s words');
    assert.equal(seen.refused, 0, route + ': no block was refused');
    assert.deepEqual(seen.badHrefs, [], route + ': every link opens a real address');
    assert.equal(seen.insert, 1, route + ': the CMS insertion anchor is still there');
    assert.equal(seen.hiddenByStyle, 0, route + ': nothing is hidden by an inline style');
    assert.equal(seen.pressed, 0, route + ': no hand-built pressed-button selector (the idea rail is an accordion)');
    if (route === '/resolutions') {
      assert.deepEqual(seen.h1, ['resolutions-title']);
      assert.deepEqual(seen.blocks, ['breadcrumb', 'hero', 'disclosure', 'tabs', 'disclosure', 'insert']);
      assert.equal(seen.domainTabs.length, 5, 'five domain tabs');
      assert(seen.domainTabs.every((label) => /^[A-Z][a-z]+ & [a-z]+ · \d$/.test(label)), 'every domain tab is named, with its count (phones showed only "01 02 03 04 05")');
      assert.equal(seen.cards, 20, 'all 20 resolutions are cards, folded in their domain\'s tab (closed is hidden, never absent)');
      assert.deepEqual(seen.unfolded, ['resolutions-deck:phone:1', 'resolutions-note-text:phone:1'], 'the deck and the note are whole from 601px up and keep a line with "More" on a phone');
    } else {
      const slug = route.split('/').pop();
      assert.deepEqual(seen.h1, ['resolution-title-' + slug], route + ': the h1 keeps its old id');
      assert.equal(seen.labelledBy, 'resolution-title-' + slug);
      assert.deepEqual(seen.blocks, ['breadcrumb', 'hero', 'disclosure', 'tabs', 'insert', 'pager'], route + ': crumbs, hero, who it is for, the shelf, the CMS anchor, the pager');
      assert.equal(seen.shelfTabs.length, 3, route + ': ready, ideas, how it resolves');
      assert(/^Ready now · \d$/.test(seen.shelfTabs[0]) && seen.shelfTabs[1] === 'Product ideas · 3' && seen.shelfTabs[2] === 'How it resolves', route + ': the shelf tabs keep their labels and counts');
      assert.equal(seen.rows[1], 3, route + ': three ideas, each an accordion row');
      assert(seen.rows[0] >= 2, route + ': every ready product is a row');
      assert.equal(seen.steps, 3, route + ': three movements');
      assert.equal(seen.pager, 2, route + ': previous and next');
      /* W5-PAGES: `also` stays one page; a second (`alsoMore`) is its own related link, so publishing an algorithm leads to the math AND to what resolves it */
      if (slug === 'algorithms') assert(seen.related.includes('/resolver-math') && seen.related.includes('/resolvers'), route + ': leads to /resolver-math and /resolvers: ' + seen.related.join(' '));
      if (slug === 'rules') assert(seen.related.includes('/resolver-math') && !seen.related.includes('/resolvers'), route + ': only algorithms has a second page');
      assert.deepEqual(seen.unfolded, ['resolution-' + slug + '-brief:phone:0'], route + ': who it is for folds only on a phone, behind a button that names it');
    }
    assert(keys.every((entry) => !/^id:ark-r-/.test(entry.key)), route + ': no generated (ark-r-) id became a layout key');
    const tally = continuity.assertContinuity(census, keys, expect);
    assert.equal(tally.kept + tally.reshaped + tally.retired, census.length, route + ': every old key is accounted for');
    const taken = keys.filter((entry) => expect.retired[entry.key]).map((entry) => entry.key);
    assert.deepEqual(taken, [], route + ': no new element carries a retired key (it would take an edit saved for something else)');
    const landed = await continuity.assertSavedEditsLand(route, census, expect);
    assert.equal(landed, census.length - 1 - Object.keys(expect.retired).length, route + ': a saved frame on every old key but page:/ and the retired ones landed');
    lines.push(`${route.replace('/resolutions/', '')} ${tally.kept}/${tally.reshaped}/${tally.retired}`);
  }
  console.log(`PASS: ${ROUTES.length} resolution pages are Ark blocks (one index, one detail template) with every word kept; old layout keys kept/reshaped/retired: ${lines.join(', ')}.`);
})().catch((error) => { console.error(error); process.exit(1); });
