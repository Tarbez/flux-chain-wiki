'use strict';
/* run-tests-timeout-ms: 900000 -- three jsdom boots and two server renders per route, three routes. */
/* The guided pages /what-is-a-resolver, /start-from-something-real and /download on the story
   template (js/pages/story.js; DEFXN polish Wave 3, W3-GUIDE). Run alone (owner test law);
   `node tests/resolver-guide-blocks.cjs /download` checks one route.

   Named regressions it holds:
   - A fourth hand-built depth control ("Answer / Understand why / Evidence", square buttons in
     the browser's Arial; docs/ux-audit/pages-ux-b.md /start-from-something-real P1) and two step
     pickers that showed only "01-05" on a phone (pages-ux-a.md /download): ONE depth control on
     every guide page, Ark tabs, segmented, The idea / How it works / Evidence.
   - Content deleted on phones to fit one screen: /what-is-a-resolver hid its definition, kicker,
     policy address, law bodies, breadcrumb and spec link with ~10 display:none rules (pages-ux-b.md
     P1); /download hid its deck, step names, guide link and progress; the reference resolvers'
     diagram was display:none. Every word of each old page is on the converted page (its frozen
     census) and the illustration folds behind "Show the illustration"/"Show the terminal" below
     900px -- a press away, never removed.
   - Dead-ish ends (pages-ux-b.md /what-is-a-resolver P2): the lab leads on to /resolvers,
     /resolver-math, /start-from-something-real and the products; every page ends in a pager.
   - Saved CMS data is never rewritten: every old layout key still lands, or is reshaped / retired
     below with its reason (tests/lib/converted-page.cjs). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const converted = require('./lib/converted-page.cjs');
const checks = require('./lib/block-page-checks.cjs');

const ROOT = checks.ROOT;
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const DEPTH = ['The idea', 'How it works', 'Evidence'];

const ROUTES = {
  '/what-is-a-resolver': { page: 'resolver', ids: ['resolver-'],
    reshaped: [
      [/^page:\/div:1\/div:1$/, 'the step caption box (its one line and its text): How it works\' first row; its line is also the illustration\'s caption'],
      [/^page:\/figure:1$/, 'the illustration is Ark\'s figure frame around the same scene, folded behind "Show the illustration" below 900px'],
      [/^page:\/figure:1\/ol:1$/, 'the laws are an Ark accordion in the Evidence view (Laws on the track opens it)'],
      [/^page:\/figure:1\/ol:1\/li:\d$/, 'a law is an accordion row: its number, name and status are the row\'s title, its text the row\'s'],
      [/^page:\/figure:1\/ol:1\/li:\d\/div:1$/, 'the law\'s number, name and status: the row\'s one title ("01 · One launch, one chain. · Partial")'],
      [/^page:\/figure:1\/ol:1\/li:\d\/p:1\/button:1$/, 'the law\'s "See it applied" opens the illustration at that step (an Ark action in the row)'],
      [/^id:resolver-law-\d$/, 'the law\'s text, now with its status said in words ("Status: Partial (docs/status.md · CAP-010)")'],
      [/^page:\/figure:1\/p:2\/a:[12]$/, 'the sources are the two links of the laws\' Sources row: "Wording from the resolver spec", "Status from the status page"'],
      [/^page:\/div:1\/div:2$/, 'the hub: its disclosure is Evidence\'s last row (with the products note), its links the pager\'s related pages'],
      [/^page:\/div:1\/div:2\/details:1$/, 'the "verified on chain" disclosure is that row\'s content: the three facts, what is planned, and the products note'],
      [/^page:\/div:1\/div:2\/nav:1$/, 'the hub\'s links are the pager\'s related pages; "Deploy a resolver" is its next page'],
      [/^page:\/div:1\/div:2\/nav:1\/a:2$/, '"Deploy a resolver" is the pager\'s next page'],
      [/^page:\/div:1\/div:2\/nav:1\/a:\d$/, 'a hub link is a related page in the pager'],
      [/^page:\/div:1\/nav:3\/a:1$/, 'the way on to the next step sits under the stage, beside the documents'],
      [/^page:\/figure:1\/div:2$/, 'the document picker\'s row also holds the way through (back, next)'],
      [/^id:resolver-lab-title$/, 'the same heading, reworded: "a claim" reads "an answer" (WR-4, see reworded)']
    ],
    retired: [
      [/^page:\/div:1$/, 'the left column; a block page stacks its blocks in its root'],
      [/^page:\/div:1\/nav:3$/, 'the footer row: its back and next buttons sit with the documents under the stage, its spec link is the laws\' "Wording from the resolver spec"'],
      [/^page:\/div:1\/nav:3\/a:2$/, '"Spec →": the laws\' "Wording from the resolver spec" opens the same spec'],
      [/^page:\/figure:1\/ol:1\/li:\d\/div:1\/(span|strong):\d$/, 'the law\'s number, name and status chip are one row title now, which keeps the top\'s key'],
      [/^page:\/figure:1\/ol:1\/li:\d\/button:1$/, 'the phone-only full-cover toggle; Ark\'s accordion trigger opens the law on every width'],
      [/^page:\/div:1\/div:2\/details:1\/ol:1$/, 'the facts list; each fact keeps its key as a paragraph of the row']
    ],
    reworded: [
      [/^page:\/div:1\/nav:3(\/a:2)?$/, '"Spec →" reads "Wording from the resolver spec" (and "Resolve→" is the illustration\'s next button)'],
      [/^page:\/figure:1\/p:2\/a:[12]$/, '"resolver spec" / "status page" read "Wording from the resolver spec" / "Status from the status page"'],
      [/^id:resolver-lab-title$/, '"Get a claim you can check" reads "Get an answer you can check": the heading used "claim" before the page defines it (ledger recheck 2026-10-21, WR-4)']
    ]
  },
  '/start-from-something-real': { page: 'references', ids: ['references-'],
    reshaped: [
      [/^page:\/div:1$/, 'the answer beside its figure: the story body'],
      [/^page:\/div:1\/div:1$/, 'the answer and its boundary: the story body\'s main column'],
      [/^page:\/div:1\/div:1\/div:1$/, 'the answer surface is The idea\'s panel'],
      [/^page:\/nav:2$/, 'the depth buttons are Ark tabs with the one label set: The idea / How it works / Evidence'],
      [/^page:\/nav:2\/button:1$/, '"Answer" is "The idea", the one label set on every guided page'],
      [/^page:\/nav:2\/button:2$/, '"Understand why" is "How it works", the one label set on every guided page'],
      [/^page:\/div:1\/figure:1$/, 'the figure is Ark\'s frame around the same drawing and legend, folded behind "Show the illustration" below 900px'],
      [/^page:\/div:1\/figure:1\/figcaption:1$/, 'the caption also names the drawing ("Source / revision / dated evidence"), which it drew inside itself at 8px'],
      [/^page:\/nav:3$/, 'the footer is Ark\'s pager: previous (What is a resolver) and next (See how DEFXN works)'],
      [/^page:\/div:1\/div:1\/aside:1$/, 'the boundary is Ark\'s callout: the same title and words after its tone mark (the census\'s 160-character cut falls one character earlier)']
    ],
    retired: [],
    reworded: [[/^page:\/nav:2\/button:[12]$/, '"Answer" / "Understand why" read "The idea" / "How it works": the one depth label set (the story template)']]
  },
  '/download': { page: 'download', ids: ['download-'],
    reshaped: [
      [/^page:\/header:1$/, 'the header became the hero (eyebrow, heading, the guide); the deck opens The idea'],
      [/^page:\/header:1\/div:1$/, 'the kicker row (eyebrow and the phone\'s guide link) is the hero\'s actions row: the one guide link for every width; the eyebrow keeps its own key'],
      [/^page:\/div:1$/, 'the terminal beside the steps: the story body'],
      [/^page:\/div:1\/section:1$/, 'the terminal card is the figure\'s slot; its way through (previous, step n of 5, next, the hand-off) moved into it'],
      [/^page:\/div:1\/section:2$/, 'the steps column is the How it works view'],
      [/^page:\/div:1\/section:2\/ol:1$/, 'the step list is Ark\'s accordion, in step with the terminal'],
      [/^page:\/div:1\/section:2\/ol:1\/li:\d$/, 'a step row (its number, name and text) is an accordion row (its name and text; the number is its place)'],
      [/^page:\/nav:1$/, 'the footer: its step controls are the terminal\'s way through; its two links are the hero\'s guide action and an Evidence link']
    ],
    retired: [
      [/^page:\/header:1\/div:1\/a:1$/, 'the phone-only duplicate of the guide link ("Operator guide →"); the hero\'s one guide action serves every width']
    ],
    reworded: [
      [/^page:\/header:1\/div:1\/a:1$/, '"Operator guide" reads "Open the full operator guide" (one link for every width)']
    ]
  }
};

(async () => {
  /* ---- the modules are story defs ---------------------------------------------------------- */
  const { catalog } = require('./lib/site-catalog.cjs').loadCatalog();
  for (const [key, file] of [['resolver', 'js/pages/resolver-guide.js'], ['references', 'js/pages/resolver-guide.js'], ['download', 'js/pages/download.js']]) {
    const scripts = [...catalog[key].scripts];
    assert(scripts.includes('js/pages/story.js') && scripts.indexOf('js/pages/story.js') < scripts.indexOf(file), key + ': the route loads the story template before its module');
  }
  for (const file of ['js/pages/resolver-guide.js', 'js/pages/resolver-lab.js', 'js/pages/download.js']) {
    const source = read(file);
    assert(!/story-depth|guided-step-picker|how-step-button|content-layer-path|lifecycle-boundary/.test(source), file + ' builds none of the old guide parts');
    assert(!/ArkUI\.el\('(section|header|h1|nav|figure)'/.test(source) && !/el\('(section|header|h1|nav|figure)'/.test(source), file + ': no hand-built page structure');
  }

  const lines = [];
  for (const route of Object.keys(ROUTES).filter((r) => process.argv.length <= 2 || process.argv.slice(2).includes(r))) {
    const spec = ROUTES[route];
    const seen = await converted.check(route, { reshaped: spec.reshaped, retired: spec.retired, reworded: spec.reworded, inspect: (window, page) => {
      const depth = page.querySelector('[data-story-depth]');
      return {
        depth: depth ? [...depth.querySelectorAll('[role="tab"]')].map((t) => t.textContent.trim()) : null,
        variant: depth && depth.getAttribute('data-variant'),
        tablists: page.querySelectorAll('[role="tablist"]').length,
        figureFold: [...page.querySelectorAll('[data-ark-block="disclosure"]')].filter((d) => d.querySelector('[data-ark-block="figure"]')).map((d) => d.getAttribute('data-fold-below')),
        pager: page.querySelectorAll('[data-ark-block="pager"] a').length,
        related: [...page.querySelectorAll('[data-ark-block="pager"] [data-ark-part="pager-related"] a')].map((a) => a.getAttribute('href'))
      };
    } });
    assert.deepEqual(seen.depth, DEPTH, route + ': the one depth label set');
    assert.equal(seen.variant, 'segmented', route + ': the depth control is segmented');
    assert.equal(seen.tablists, 1, route + ': one depth control, no second tab or pressed-button control');
    // /what-is-a-resolver also carries the manifest's layers and launched-vs-served figures (W4-S13, tests/resolver-page-parts.cjs): the same fold
    assert.deepEqual(seen.figureFold.slice().sort(), route === '/what-is-a-resolver' ? ['always', 'always', 'tablet'] : ['tablet'], route + ': the figure folds behind a button at 900px and narrower, never removed');
    assert(seen.pager > 0, route + ': the page ends in a pager');
    assert(seen.terms > 0, route + ': the first use of a glossary word is a term');
    if (route === '/what-is-a-resolver') {
      for (const to of ['/resolvers', '/resolver-math', '/start-from-something-real']) assert(seen.related.includes(to), '/what-is-a-resolver leads on to ' + to);
    }
    const { blocks, panels } = await checks.assertServerRender(route, spec.page, { idPrefix: spec.ids });
    lines.push(`${route} ${seen.tally.kept}/${seen.tally.reshaped}/${seen.tally.retired} (ssr ${blocks}/${panels})`);
  }
  console.log('PASS: the guide pages are the story template with one depth control and every word kept; old layout keys kept/reshaped/retired: ' + lines.join(', ') + '.');
})().catch((error) => { console.error(error); process.exit(1); });
