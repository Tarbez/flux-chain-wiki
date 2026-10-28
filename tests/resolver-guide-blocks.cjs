'use strict';
/* run-tests-timeout-ms: 900000 -- three jsdom boots and two server renders per route, three routes. */
/* The guided pages /what-is-a-resolver, /start-from-something-real and /download on the story
   template (js/pages/story.js; DEFXN polish Wave 3, W3-GUIDE). Run alone (owner test law);
   `node tests/resolver-guide-blocks.cjs /download` checks one route.

   Named regressions it holds:
   - A fourth hand-built depth control ("Answer / Understand why / Evidence", square buttons in
     the browser's Arial; docs/ux-audit/pages-ux-b.md /start-from-something-real P1) and two step
     pickers that showed only "01-05" on a phone (pages-ux-a.md /download): ONE depth control on
     every guide page, Ark tabs, segmented, The idea / Step by step / Evidence.
   - Content deleted on phones to fit one screen: /what-is-a-resolver hid its definition, kicker,
     policy address, law bodies, breadcrumb and spec link with ~10 display:none rules (pages-ux-b.md
     P1); /download hid its deck, step names, guide link and progress; the reference resolvers'
     diagram was display:none. Every word of each old page is on the converted page (its frozen
     census) and the illustration folds behind "Show the illustration"/"Show the terminal" below
     900px -- a press away, never removed.
   - Dead-ish ends (pages-ux-b.md /what-is-a-resolver P2): the lab leads on to /resolvers,
     /resolver-math, /start-from-something-real and the products; every page ends in a pager.
   - Saved CMS data is never rewritten: every old layout key still lands, or is reshaped / retired
     below with its reason (tests/lib/converted-page.cjs).
   - 2026-10-27, owner-confirmed: the /download redesign (b0dc2d7) is locked -- the terminal's step dots and tour
     button are its only hand-built buttons, its numbered terminal lines and reworded steps 1 and 3 are recorded below,
     and the old-parts matcher no longer mistakes the template's own [data-story-depth] attribute for the old
     story-depth part. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const converted = require('./lib/converted-page.cjs');
const checks = require('./lib/block-page-checks.cjs');

const ROOT = checks.ROOT;
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const DEPTH = ['The idea', 'Step by step', 'Evidence']; // 'Step by step' since 2026-10-22 (first-visit audit, P1): 'How it works' is the header's name for /how-deployment-works, so the tab and the nav link said the same words for two things

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
      [/^id:resolver-lab-title$/, 'the same heading, reworded: "a claim" reads "an answer" (WR-4, see reworded)'],
      /* 2026-10-21 (ledger W4d / P4): the illustration's controls are Ark blocks */
      [/^page:\/div:1\/nav:3$/, 'the footer row\'s back and next are the illustration\'s Ark actions row (Previous step / Next step)'],
      [/^page:\/div:1\/nav:3\/button:1$/, '"←" is Ark\'s "Previous step" button'],
      [/^page:\/div:1\/nav:3\/a:1\/span:1$/, 'the next step\'s name on the pill ("Resolve") is "Next step": the chosen step is named by the steps row above'],
      [/^page:\/figure:1\/figcaption:1\/button:1\/span:1$/, 'the "↻" glyph of Run again: the Ark button says "Run again"'],
      [/^page:\/figure:1\/div:2\/div:1\/button:\d\/span:1$/, 'a document\'s name is its Ark choice option, with its size: "Report · 3.2 MB"'],
      /* first-visit audit 2026-10-22 (P2): one page name */
      [/^page:\/div:1\/nav:1\/span:1$/, 'this page in the breadcrumb reads "What is a resolver?", the name the menu and /resolver-math\'s trail use (see reworded)'],
      [/^page:\/div:1\/nav:1$/, 'the same breadcrumb, its last item reworded'],
      [/^page:\/figure:1\/figcaption:1(\/span:1)?$/, 'the illustration\'s head names its rule in words, "Example rule: files up to 5 MB · runs in your browser"; the id policy.doc-size/v1 is in the caption (see reworded)']
    ],
    retired: [
      [/^page:\/div:1$/, 'the left column; a block page stacks its blocks in its root'],
      [/^page:\/div:1\/nav:3\/a:2$/, '"Spec →": the laws\' "Wording from the resolver spec" opens the same spec'],
      [/^page:\/figure:1\/ol:1\/li:\d\/div:1\/(span|strong):\d$/, 'the law\'s number, name and status chip are one row title now, which keeps the top\'s key'],
      [/^page:\/figure:1\/ol:1\/li:\d\/button:1$/, 'the phone-only full-cover toggle; Ark\'s accordion trigger opens the law on every width'],
      [/^page:\/div:1\/div:2\/details:1\/ol:1$/, 'the facts list; each fact keeps its key as a paragraph of the row'],
      /* 2026-10-21 (ledger W4d / P4) */
      [/^page:\/div:1\/nav:2\/button:\d\/span:1$/, 'a step\'s dot on the old track: Ark\'s choice option marks the chosen step itself'],
      [/^page:\/div:1\/nav:2\/button:\d\/span:2\/small:1$/, 'a step\'s number ("01"): it starts the step\'s Ark choice label ("01 Ask")'],
      [/^page:\/div:1\/nav:3\/a:1\/span:2$/, 'the pill\'s "→": Ark\'s Next step button needs no glyph'],
      [/^page:\/figure:1\/div:2\/div:1\/button:\d\/small:1$/, 'a document\'s size: it is in the document\'s Ark choice label ("Report · 3.2 MB")'],
      /* first-visit audit 2026-10-22 (P2): the eyebrow repeated the breadcrumb above it */
      [/^page:\/div:1\/p:1$/, 'the eyebrow ("FLUX PROTOCOL / RESOLVERS", then "DEFXN / RESOLVERS"): it repeated the breadcrumb, so the page has none (RESOLVER.EYEBROW is retired with it)']
    ],
    reworded: [
      [/^page:\/div:1\/nav:3(\/a:2)?$/, '"Spec →" reads "Wording from the resolver spec" (and "Resolve→" is the illustration\'s next button)'],
      [/^page:\/figure:1\/p:2\/a:[12]$/, '"resolver spec" / "status page" read "Wording from the resolver spec" / "Status from the status page"'],
      [/^id:resolver-lab-title$/, '"Get a claim you can check" reads "Get an answer you can check": the heading used "claim" before the page defines it (ledger recheck 2026-10-21, WR-4)'],
      [/^page:\/div:1\/p:1$/, 'the eyebrow is gone: it repeated the breadcrumb (first-visit audit 2026-10-22; before that it read "DEFXN / RESOLVERS", "FLUX PROTOCOL" never being introduced)'],
      [/^page:\/div:1\/nav:1(\/span:1)?$/, '"Resolver" reads "What is a resolver?": one page name (first-visit audit 2026-10-22)'],
      [/^page:\/div:1\/div:2\/nav:1\/a:6$/, '"Inspect reference evidence" reads "Reference resolvers", the name of the page it opens, which says no reference has public evidence yet (first-visit audit 2026-10-22, P1)'],
      [/^page:\/figure:1\/figcaption:1(\/span:1)?$/, '"policy.doc-size/v1 · runs in your browser" reads "Example rule: files up to 5 MB · runs in your browser": the head showed only an internal id (first-visit audit 2026-10-22)']
    ]
  },
  '/start-from-something-real': { page: 'references', ids: ['references-'],
    reshaped: [
      [/^page:\/div:1$/, 'the answer beside its figure: the story body'],
      [/^page:\/div:1\/div:1$/, 'the answer and its boundary: the story body\'s main column'],
      [/^page:\/div:1\/div:1\/div:1$/, 'the answer surface is The idea\'s panel'],
      [/^page:\/nav:2$/, 'the depth buttons are Ark tabs with the one label set: The idea / Step by step / Evidence'],
      [/^page:\/nav:2\/button:1$/, '"Answer" is "The idea", the one label set on every guided page'],
      [/^page:\/nav:2\/button:2$/, '"Understand why" is "Step by step", the one label set on every guided page'],
      [/^page:\/div:1\/figure:1$/, 'the figure is Ark\'s frame around the same drawing and legend, folded behind "Show the illustration" below 900px'],
      [/^page:\/div:1\/figure:1\/figcaption:1$/, 'the caption also names the drawing ("Source / revision / dated evidence"), which it drew inside itself at 8px'],
      [/^page:\/nav:3$/, 'the footer is Ark\'s pager: previous (What is a resolver) and next (Deploy a resolver, the page\'s one name since the first-visit audit 2026-10-22)'],
      [/^page:\/div:1\/div:1\/aside:1$/, 'the boundary is Ark\'s callout: the same title and words after its tone mark (the census\'s 160-character cut falls one character earlier)'],
      /* first-visit audit 2026-10-22 (P1): the page was rewritten for the visitor, each key on its successor */
      [/^id:references-title$/, 'the heading, reworded: "Reference resolvers are not published yet." (see reworded)'],
      [/^page:\/div:1\/div:1\/div:1\/p:1$/, 'the lede, reworded for the visitor: what a reference resolver is, that neither named one has a public record yet, and where to start today (it read "This audit did not establish...")'],
      [/^page:\/div:1\/div:1\/aside:1\/p:1$/, 'the boundary, reworded: it repeated the lede ("Reference evidence pending"); it now says what makes a name a reference'],
      [/^page:\/nav:3\/a:2$/, 'the next link, reworded: "Deploy a resolver" (see reworded)']
    ],
    retired: [
      /* first-visit audit 2026-10-22 (P2): "DEFXN / REFERENCE RESOLVERS" repeated the breadcrumb and the heading */
      [/^page:\/p:1$/, 'the eyebrow: it repeated the breadcrumb above it and the heading below it, so the page has none (REFERENCES.EYEBROW is retired with it)']
    ],
    reworded: [[/^page:\/p:1$/, 'the eyebrow is gone (see retired)'],
      [/^page:\/nav:2\/button:[12]$/, '"Answer" / "Understand why" read "The idea" / "Step by step": the one depth label set (the story template)'],
      /* first-visit audit 2026-10-22: the URL and heading promised what the page could not show */
      [/^id:references-title$/, '"Reference resolvers, without the leap of faith." reads "Reference resolvers are not published yet.": the heading promised checkable examples the page says do not exist yet'],
      [/^page:\/nav:3\/a:2$/, '"See how DEFXN works" reads "Deploy a resolver", the one name of the page it opens']]
  },
  '/download': { page: 'download', ids: ['download-'],
    reshaped: [
      [/^page:\/header:1$/, 'the header became the hero (eyebrow, heading, the guide); the deck opens The idea'],
      [/^page:\/header:1\/div:1$/, 'the kicker row (eyebrow and the phone\'s guide link) is the hero\'s actions row: the one guide link for every width (the eyebrow is gone since 2026-10-22, see retired)'],
      [/^page:\/div:1$/, 'the terminal beside the steps: the story body'],
      [/^page:\/div:1\/section:1$/, 'the terminal card is the figure\'s slot; its way through (previous, step n of 5, next, the hand-off) moved into it'],
      [/^page:\/div:1\/section:2$/, 'the steps column is the How it works view'],
      /* 2026-10-21: the step list was Ark's accordion, then became Ark tabs -- the step control /deploy
         uses (ledger recheck 2026-10-21, "/download fixes (one step component with /deploy)"). */
      [/^page:\/div:1\/section:2\/ol:1$/, 'the step list is Ark tabs (the step control /deploy uses), in step with the terminal'],
      [/^page:\/div:1\/section:2\/ol:1\/li:\d$/, 'a step row (its number, name and text) is a step tab (its name; the number is its place); the row\'s text is the tab\'s panel, which keeps the text\'s key'],
      [/^page:\/nav:1$/, 'the footer: its step controls are the terminal\'s way through; its two links are the hero\'s guide action and an Evidence link'],
      /* 2026-10-21 ("/download hand-built", DN7/P8): the hand-built step buttons became Ark's actions row,
         with /deploy's words and tones */
      [/^page:\/nav:1\/button:1(\/span:1)?$/, '"← Previous" is Ark\'s "Previous step" button (the words /deploy\'s way through uses); its label keeps the inner key'],
      [/^id:source-step-2$/, 'step 2 names the miner once (see reworded)'],
      /* journey audit 2026-10-24: the heading and deck lead with the browser (see reworded); the guide link is the hero's second action */
      [/^id:download-title$/, 'the heading names the browser state; its key stays on the h1'],
      [/^page:\/header:1\/p:1$/, 'the deck opens with the browser and the FXN ID; its key stays on the deck'],
      [/^page:\/nav:1\/a:1$/, 'the guide link keeps its key; "Create your FXN ID" is the hero\'s new primary action after it'],
      /* the /download redesign (b0dc2d7, 2026-10-25; owner-confirmed 2026-10-27) reworded steps 1 and 3 (see reworded) */
      [/^id:source-step-[13]$/, 'steps 1 and 3 say what to do in plainer words (see reworded); each keeps its key'],
      [/^page:\/div:1\/section:1\/div:2(\/pre:1\/code:\d+\/span:1)?$/, 'the terminal numbers its lines as an editor does ("1", "2") where it showed a "$" prompt (the number is not copied; Copy takes the commands alone): the same screen and lines, each keeping its key']
    ],
    retired: [
      [/^page:\/header:1\/div:1\/a:1$/, 'the phone-only duplicate of the guide link ("Operator guide →"); the hero\'s one guide action serves every width'],
      /* first-visit audit 2026-10-22 (P2): "RUN DEFXN / FROM SOURCE" repeated the breadcrumb ("Run DEFXN from source") above it */
      [/^page:\/header:1\/div:1\/p:1$/, 'the eyebrow: it repeated the breadcrumb above it, so the page has none (DOWNLOAD.EYEBROW is retired with it; tests/browser/studio-flows.mjs makes its component from the title and the guide action now)'],
      /* 2026-10-22: the first view shows the apps (the owner's download page) and no longer lists the five step names a
         second time; each step is How it works' tab and the terminal's step, which keep the step row and its text */
      [/^page:\/div:1\/section:2\/ol:1\/li:\d\/button:1(\/strong:1|\/span:1)?$/, 'a step row\'s button and its name: the first view\'s step list is gone; the step is its How it works tab']
    ],
    reworded: [
      /* 2026-10-22: the first view's step list (and its numbers) is gone; each step is How it works' tab, its number its place */
      [/^page:\/div:1\/section:2\/ol:1\/li:\d\/button:1\/span:1$/, 'a step\'s number ("02"): its place among How it works\' tabs'],
      [/^page:\/header:1\/div:1\/a:1$/, '"Operator guide" reads "Open the full operator guide" (one link for every width)'],
      [/^page:\/header:1\/div:1\/p:1$/, 'the eyebrow is gone (see retired); its words are the breadcrumb\'s last item, "Run DEFXN from source"'],
      /* first-visit audit 2026-10-22 (P1): one piece of software had three names (DEFXN, ark-miner-cli, flux-miner/ark-miner);
         step 2 says once that the DEFXN miner is the flux-miner command, and the legacy-alias sentence is gone */
      [/^id:source-step-2$/, 'step 2 ends "The DEFXN miner is the flux-miner command." (it ended "The package exposes flux-miner; ark-miner is a legacy alias.")'],
      /* journey audit 2026-10-24 (docs/journey/END-TO-END-2026-10-24.md): a newcomer arrives here to get the browser, and no download exists.
         The heading names that state; the miner steps stay below it, introduced by the deck as the page for people who run a miner. */
      [/^id:download-title$/, '"Start a local miner from a trusted checkout." reads "FXN Browser has no public download yet." (the owner named it DEFXN Grid, then settled on FXN Browser, 2026-10-24): the page leads with the browser, the miner steps follow in the deck'],
      [/^page:\/header:1\/p:1$/, 'the deck opens with the browser and the FXN ID, then points to the miner steps'],
      /* the /download redesign (b0dc2d7, 2026-10-25; owner-confirmed 2026-10-27): DOWNLOAD.POINT1.TEXT and POINT3.TEXT */
      [/^id:source-step-1$/, 'step 1 reads "Install Node.js 22 or newer with npm. The miner also needs a folder it can write to and a free status port." (it read "Use Node.js 22 or newer with npm. The storage directory must be writable and the status port free.")'],
      [/^id:source-step-3$/, 'step 3 ends "Note the source revision and package version. Keep a copy of the configuration you started with." (it ended "Write down the source revision, package version, configuration and when you looked.")']
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
    /* the old parts were class names; the story template's own [data-story-depth] attribute (which a page may query) is not one
       of them, so a name counts only where no letter, digit or "-" precedes it (it matched "data-story-depth" until 2026-10-27) */
    assert(!/(?<![\w-])(story-depth|guided-step-picker|how-step-button|content-layer-path|lifecycle-boundary)\b/.test(source), file + ' builds none of the old guide parts');
    assert(!/ArkUI\.el\('(section|header|h1|nav|figure)'/.test(source) && !/el\('(section|header|h1|nav|figure)'/.test(source), file + ': no hand-built page structure');
  }
  /* ledger recheck 2026-10-21, "/download hand-built" (T11, DN7/P8): the terminal's checks are Ark
     facts and its step buttons Ark actions; only the commands themselves stay the page's own (Ark
     has no command block, P22) */
  /* 2026-10-25 redesign (owner-confirmed 2026-10-27): the terminal's way through gained the step dots (a button per step) and
     the "play the five steps" tour button. Those two are the only hand-built buttons, each named by its class; Ark's actions
     row still carries Previous step / Next step and the hand-off. */
  const downloadSource = read('js/pages/download.js');
  assert(!/el\('(dl|dt|dd|a)'/.test(downloadSource) && !/linkEl\(/.test(downloadSource), 'js/pages/download.js: no hand-built key/value list or link');
  assert.deepEqual([...downloadSource.matchAll(/el\('button', '([^']*)'\)/g)].map((m) => m[1]), ['download-dot', 'download-play'], 'js/pages/download.js: the only hand-built buttons are the step dots and the tour button');
  assert.equal((downloadSource.match(/el\('button'/g) || []).length, 2, 'and no other hand-built button');

  const lines = [];
  for (const route of Object.keys(ROUTES).filter((r) => process.argv.length <= 2 || process.argv.slice(2).includes(r))) {
    const spec = ROUTES[route];
    const seen = await converted.check(route, { reshaped: spec.reshaped, retired: spec.retired, reworded: spec.reworded, inspect: (window, page) => {
      const depth = page.querySelector('[data-story-depth]');
      const ownList = depth && [...depth.children].find((n) => n.getAttribute('data-ark-part') === 'tabs-list');
      return {
        depth: ownList ? [...ownList.querySelectorAll('[role="tab"]')].map((t) => t.textContent.trim()) : null,
        variant: depth && depth.getAttribute('data-variant'),
        tablists: page.querySelectorAll('[role="tablist"]').length,
        /* every tab control that is not the depth control: where it sits, its look, its tab names */
        others: [...page.querySelectorAll('[role="tablist"]')].filter((list) => list !== ownList).map((list) => {
          const tabs = list.closest('[data-ark-block="tabs"]'), panel = tabs && tabs.parentElement && tabs.parentElement.closest('[data-ark-part="tabs-content"]');
          return { id: tabs && tabs.id, variant: tabs && tabs.getAttribute('data-variant'), inView: panel ? [...depth.children].filter((n) => n.getAttribute('data-ark-part') === 'tabs-content').indexOf(panel) : -1,
            names: [...list.querySelectorAll('[role="tab"]')].map((t) => t.textContent.trim()) };
        }),
        figureFold: [...page.querySelectorAll('[data-ark-block="disclosure"]')].filter((d) => d.querySelector('[data-ark-block="figure"]')).map((d) => d.getAttribute('data-fold-below')),
        pager: page.querySelectorAll('[data-ark-block="pager"] a').length,
        related: [...page.querySelectorAll('[data-ark-block="pager"] [data-ark-part="pager-related"] a')].map((a) => a.getAttribute('href'))
      };
    } });
    assert.deepEqual(seen.depth, DEPTH, route + ': the one depth label set');
    assert.equal(seen.variant, 'segmented', route + ': the depth control is segmented');
    /* One depth control, and no second depth or pressed-button control. The one other tab control
       allowed is /download's step tabs inside How it works: since 2026-10-21 its five steps use the
       step control /deploy uses (Ark tabs, the plain look; ledger recheck 2026-10-21, "/download fixes
       (one step component with /deploy)"), where they were an accordion. They are named by step, never
       "01-05" (the defect this check was written against). */
    if (route === '/download') {
      assert.equal(seen.tablists, 2, route + ': the depth control and the step tabs, no other tab or pressed-button control');
      assert.equal(seen.others.length, 1, route + ': one step control');
      const [stepTabs] = seen.others;
      assert.equal(stepTabs.id, 'download-steps', route + ': the step control is the How it works step tabs');
      assert.equal(stepTabs.variant, 'tabs', route + ': the step tabs have /deploy\'s look, not the depth control\'s');
      assert.equal(stepTabs.inView, 1, route + ': the step tabs sit in How it works');
      assert.equal(stepTabs.names.length, 5, route + ': five step tabs');
      assert(stepTabs.names.every((name) => /[a-z]{3}/i.test(name)), route + ': every step tab is named by its step, never only its number');
    } else assert.equal(seen.tablists, 1, route + ': one depth control, no second tab or pressed-button control');
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
