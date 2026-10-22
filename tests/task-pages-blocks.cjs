'use strict';
/* run-tests-timeout-ms: 1200000 -- three jsdom boots and two server renders per route. */
/* The task and product-overlap pages as pages of Ark blocks (DEFXN polish Wave 3, W3-GUIDE):
   /bundle-deployer, /deploy and /explore. Run alone (owner test law);
   `node tests/task-pages-blocks.cjs /deploy` checks one route.

   Named regressions it holds:
   - /bundle-deployer was 2.0x the viewport on a phone and its only way on was "Back to your
     account" (docs/ux-audit/pages-ux-a.md): its three parts are tabs, its release status is in
     sight (a press away on a phone, where the hero's status says it), and its pager leads on to
     /download and /resolutions/deployments. The Bundles hand-off (W2-SHELL, the family kit) stays.
   - /deploy set its deck in monospace, showed only "01-05" for its steps on a phone, and drew a
     Copy unlike /download's (pages-ux-a.md /deploy): the steps are Ark tabs named on every width,
     each with its command card; "Review all steps" is one table; the scope note folds as before.
   - /explore's ways on were display:none on a phone (W2-SHELL): they are Ark's actions, on every
     width; the live explorer (stepper, kinds, status, raw observatory) works as before.
   - Every word of each old page is on the converted page (its frozen census), and every old
     layout key still lands, or is reshaped / retired below with its reason
     (tests/lib/converted-page.cjs). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const converted = require('./lib/converted-page.cjs');
const checks = require('./lib/block-page-checks.cjs');

const read = (file) => fs.readFileSync(path.join(checks.ROOT, file), 'utf8');
const ROUTES = {
  '/bundle-deployer': { page: 'bundledeployer', ids: ['bundledeployer-'],
    reshaped: [
      [/^page:\/header:1$/, 'the header became the hero, with the eyebrow and the status from the row above it'],
      [/^page:\/div:2$/, 'the two-column layout is Ark tabs: the three steps, what becomes public, the flow'],
      [/^page:\/div:2\/section:1$/, 'the workflow section is the first tab panel; its heading is the tab'],
      [/^page:\/div:2\/section:2$/, 'the boundary section is the second tab panel; its heading is the tab'],
      [/^page:\/div:2\/section:1\/ol:1$/, 'the numbered steps are an Ark accordion: each step\'s name opens its text'],
      [/^page:\/div:2\/section:2\/figure:1$/, 'the flow figure is the third tab panel; its caption is the tab, its note the panel\'s first line'],
      [/^page:\/div:2\/section:2\/figure:1\/ol:1$/, 'the flow trail is Ark\'s steps'],
      [/^page:\/div:2\/section:2\/table:1$/, 'the same table, now captioned'],
      [/^page:\/aside:1$/, 'the release aside is Ark\'s callout (in sight from 601px, a press away on a phone); its back link is the pager\'s previous page']
    ],
    retired: [
      [/^page:\/div:1$/, 'the eyebrow and status row; both keep their keys in the hero'],
      [/^page:\/div:2\/section:1\/ol:1\/li:\d$/, 'the numbered row; its words are the accordion row, which keeps the row\'s copy key'],
      [/^page:\/div:2\/section:1\/ol:1\/li:\d\/span:1$/, 'the step number; an accordion row is numbered by its place']
    ],
    reworded: [] },
  '/deploy': { page: 'deploy', ids: ['deploy-'],
    reshaped: [
      [/^page:\/div:1$/, 'the page\'s content column became the hero (eyebrow, heading, deck); the rest are blocks after it'],
      [/^page:\/div:1\/p:3$/, 'the resolver note is the callout\'s first paragraph (in sight from 601px, behind "Deploying a resolver or a site instead?" on a phone); its links are the callout\'s actions'],
      [/^page:\/div:1\/p:4$/, 'the site note is the callout\'s second paragraph; its link is the callout\'s second action'],
      [/^page:\/div:1\/p:3\/a:2$/, 'the family\'s Open Deploy is Ark\'s link button (the product\'s address from the kit)'],
      [/^page:\/div:1\/div:1$/, 'the step list is Ark tabs: one step at a time'],
      [/^id:deploy-step-0\d$/, 'a step section is its tab panel: its text and its command card (the figure; the expected result is its caption); its heading is the tab'],
      [/^page:\/div:1\/div:1\/section:\d\/div:1$/, 'the step body is the step\'s figure: the command card with Copy, the expected result as its caption'],
      [/^page:\/div:1\/div:2$/, 'the controls: previous and next step stay; "Review all steps" is the review table\'s disclosure'],
      [/^page:\/div:1\/details:1$/, 'the scope note is Ark\'s disclosure ("Network scope and source guide"), folded as before'],
      [/^page:\/div:1\/nav:2$/, 'the footer is Ark\'s pager; "Run DEFXN from source" is its previous page'],
      [/^page:\/div:1\/p:2$/, 'the same deck, reworded (see reworded)'],
      [/^page:\/div:1\/p:3\/a:1$/, 'the same link, named for what it opens: "How deploying a resolver works" (first-visit audit 2026-10-22, see reworded)']
    ],
    retired: [
      [/^page:\/div:1\/p:3\/a:2\/span:1$/, 'the kit link\'s ↗ glyph; Ark\'s link button draws its own'],
      [/^page:\/div:1\/div:1\/section:\d\/span:1$/, 'the step number; the tab names the step ("01 / Check discovery")'],
      [/^page:\/div:1\/div:1\/section:\d\/div:1\/h2:1$/, 'the step heading; the tab carries it ("01 / Check discovery")'],
      [/^page:\/div:1\/p:5$/, 'the position line ("Step 1 of 5 / Check discovery"): the selected tab says which step is open']
    ],
    reworded: [[/^page:\/div:1\/p:5$/, 'the position is the selected tab'],
      [/^page:\/div:1\/p:2$/, 'the deck says what a named network does first, then that it is not a security boundary (ledger recheck 2026-10-21: it opened with a list of what networks do not do)'],
      /* first-visit audit 2026-10-22 (P0): the page joins a network; what deploys a resolver is said, not implied */
      [/^page:\/div:1\/p:3(\/a:1)?$/, 'the resolver note says what this page does ("This page joins your machine to a named network...") and its link names what it opens: "How deploying a resolver works"']] },
  '/explore': { page: 'explorer', ids: ['explore-', 'mesh-'],
    reshaped: [
      [/^page:\/div:1$/, 'the home: the same live parts, with Ark\'s crumbs, heading and ways on'],
      [/^page:\/div:2\/div:1\/header:1\/details:1(\/section:1(\/div:1(\/details:1)?)?)?$/, 'the connection control and its panel are Ark\'s popover (its button ends with Ark\'s arrow); "Operator access" is Ark\'s disclosure around the same key field, whose button follows the field in reading order'],
      [/^page:\/div:2\/div:1\/nav:1(\/details:[1-4])?$/, 'the dock and its four layers: each layer is an Ark popover (button with Ark\'s arrow, floating panel) in one exclusive group, opening upward'],
      [/^page:\/div:2(\/div:1(\/header:1)?)?$/, 'the raw view: its connection control is Ark\'s popover now (its button ends with Ark\'s arrow glyph), so the text of the masthead differs by that glyph'],
      [/^page:\/div:1\/div:2(\/article:1)?$/, 'the two cards: the how-it-works card\'s steps are Ark tabs now (below), so its words are in the tab labels and panels, not the old heading, sentence and numbered buttons'],
      [/^page:\/div:1\/div:2\/article:1\/div:3$/, 'the hand-built stepper is Ark\'s tab strip (the tablist, its panels after it): each numbered button is a tab, its heading and sentence the panel'],
      [/^page:\/div:1\/footer:1\/div:2$/, 'the footer\'s ways on are Ark\'s actions, shown on every width (they were display:none on a phone)'],
      [/^page:\/div:1\/footer:1\/div:2\/a:2$/, 'the family\'s Explore link is Ark\'s link button, which says it opens another site']
    ],
    retired: [
      [/^page:\/div:1\/header:1\/div:1$/, 'the heading\'s wrapper; the h1 keeps its id key'],
      [/^page:\/div:1\/footer:1$/, 'the footer row: its status line and its ways on keep their keys as parts of the home'],
      [/^page:\/div:1\/footer:1\/div:2\/a:2\/span:1$/, 'the kit link\'s ↗ glyph; Ark\'s link button draws its own'],
      [/^page:\/div:2\/div:1\/nav:1\/details:[1-4]\/summary:1\/span:1$/, 'the layer number ("03".."06"): part of the popover button\'s one label now ("03 Node pulse"), which keeps the summary\'s key'],
      [/^page:\/div:2\/div:1\/header:1\/details:1\/summary:1\/span:1$/, 'the connection button\'s status dot: Ark\'s popover button carries a label and an arrow; the Connection figure beside it says live or offline in words'],
      [/^page:\/div:1\/div:2\/article:1\/div:3\/button:\d\/span:1$/, 'the stop\'s number circle; an Ark tab is one label ("01 Shape"), which keeps the button\'s key']
    ],
    reworded: [] },
  '/treasury': { page: 'treasury', ids: ['treasury-'],
    reshaped: [
      [/^page:\/div:1\/header:1$/, 'the header became the hero; its warning line is the callout after it'],
      [/^page:\/div:1\/div:1$/, 'the asset picker (aria-pressed buttons styled as tabs) is Ark\'s tab list, with the sample movements as its third tab'],
      [/^page:\/div:1\/section:1$/, 'the asset overview is Ark tabs'],
      [/^page:\/div:1\/section:1\/div:[12]$/, 'an asset line is its tab panel: the line\'s text first, then the code and the amount as a fact'],
      [/^page:\/div:1\/section:1\/div:1\/p:1$/, 'the FXN line keeps its sentence and now ends with what "Tier 1" means (the label was unexplained: docs/ux-audit/ledger.md TR-3)'],
      [/^page:\/div:1\/section:2$/, 'the movement list is the third tab panel: its heading, then each movement as an accordion row'],
      [/^page:\/div:1\/nav:1$/, 'the way on is Ark\'s pager: Preview a deposit, and the related pages']
    ],
    retired: [
      [/^page:\/div:1$/, 'the page shell; a block page stacks its blocks in its root'],
      [/^page:\/div:1\/section:[23]\/button:1$/, 'the drill-down\'s back buttons: the movements are a tab, each an accordion row that opens in place'],
      [/^page:\/div:1\/section:2\/button:\d\/(span|strong):\d$/, 'the movement\'s reference, name and amount are one row title now, which keeps the row\'s key'],
      [/^page:\/div:1\/section:3(\/(h2|p:2|dl):?1?)?$/, 'the detail view, filled only once a movement was opened; each row now holds its own evidence (its eyebrow keeps the view\'s "03 / Evidence layer" key)']
    ],
    reworded: [[/^page:\/div:1\/section:[23]\/button:1$/, 'the back buttons of the old drill-down: nothing needs going back now']] },
  '/deposits': { page: 'deposits', ids: ['deposits-'],
    reshaped: [
      [/^page:\/div:1$/, 'the page shell holds the draft now (the form and its local result, the page\'s own); its header is the hero and the callout'],
      [/^page:\/div:1\/header:1$/, 'the header became the hero; its warning line is the callout after it'],
      [/^page:\/div:1\/form:1$/, 'the form is Ark\'s form block (W4-S14): the same two fields and button; the credit note is the amount\'s hint and the purpose list is Ark\'s select field'],
      [/^page:\/div:1\/nav:1$/, 'the way back is Ark\'s pager: Return to treasury preview, and a related page']
    ],
    retired: [], reworded: [[/^page:\/div:1\/section:1\/button:1$/, '"← Edit draft" is Ark\'s ghost button "Edit draft" (an arrow is not typed into a label; W4-S14)']] },
  '/experiments': { page: 'proximity', ids: ['lab-', 'work', 'experiments-title', 'study-', 'variable', 'range-'],
    reshaped: [
      [/^id:work$/, 'the model\'s section holds the model alone; its breadcrumb, heading and introduction are blocks before it'],
      [/^page:\/div:1\/section:1\/div:1$/, 'the heading block became the hero (its status line a detail); its introduction is the disclosure after it'],
      [/^page:\/div:1\/section:1\/div:2$/, 'the same model; only the whitespace between its parts changed (the census\'s 160-character cut falls later)'],
      [/^page:\/div:1\/section:1\/div:2\/div:1(\/div:1)?$/, 'the toolbar and its picker: Ark\'s choice (W4-S14) names itself with a visible legend ("Choose a model") before the three studies'],
      [/^page:\/div:1\/section:1\/div:2\/div:2(\/span:1)?$/, 'the stage\'s corner label leads with what the code is ("Figure 1 of 3 · FX—001"; FX—001 was unexplained), derived from the study\'s place'],
      [/^page:\/div:1\/section:1\/div:2\/div:3\/div:1$/, 'the slider\'s control now opens with one line saying how to use it ("Drag the slider ..."), between its label and the slider'],
      [/^page:\/div:1\/section:1\/p:1$/, 'the evidence line is the pager\'s related pages, under "↳ Evidence context"'],
      /* 2026-10-22 (first-visit audit 2026-10-22, P1): the page keeps one disclaimer in sight and one name */
      [/^id:experiments-title$/, 'the h1 is the page\'s fixed name ("Interactive model: authority, lifecycle and networks"); the study question it was rewritten to is the model\'s own heading (#study-title)'],
      [/^page:\/div:1\/section:1\/div:1\/p:1$/, 'the introduction is one sentence that says what to do; what the model is not moved into "Understand this analogy"'],
      [/^page:\/div:1\/section:1\/div:2\/div:2\/span:2$/, 'the stage footnote names what the figure shows ("THREE INDEPENDENT GROUPS"); its disclaimer is the hero\'s Status line and the analogy panel'],
      [/^page:\/div:1\/section:1\/div:2(\/div:3(\/details:1)?)?$/, 'the analogy panel also holds what the model does not do (the old introduction\'s caveats)']
    ],
    retired: [
      [/^page:\/div:1$/, 'the model\'s wrapper; a block page stacks its blocks in its root'],
      [/^page:\/div:1\/section:1\/div:1\/div:1$/, 'the heading\'s inner column; the hero has none'],
      [/^page:\/div:1\/section:1\/p:1\/span:1$/, 'the "↳" glyph is the related heading\'s ("↳ Evidence context")'],
      [/^page:\/div:1\/section:1\/div:2\/div:1\/div:1\/button:\d\/span:1$/, 'the study button\'s name span: the study picker is Ark\'s choice (W4-S14), whose option is one label ("01 Authority") that keeps the button\'s key'],
      [/^page:\/div:1\/section:1\/div:1\/div:1\/p:1$/, 'the eyebrow "01 / Interactive model" repeated the breadcrumb and the title (first-visit audit 2026-10-22, P1); nothing carries it'],
      [/^page:\/div:1\/section:1\/div:2\/div:1\/span:1$/, 'the toolbar\'s "INTERACTIVE MODEL" label was the page\'s name a third time (first-visit audit 2026-10-22, P1); nothing carries it']
    ],
    reworded: [[/^page:\/div:1\/section:1\/p:1$/, '"Evidence context: claim inventory and evidence registry." reads as the two related links under "↳ Evidence context"'],
      [/^page:\/div:1\/section:1\/div:1\/div:1\/p:1$/, 'the eyebrow is gone: it repeated the breadcrumb and the title (first-visit audit 2026-10-22, P1)'],
      [/^page:\/div:1\/section:1\/div:2\/div:2(\/span:2)?$/, 'the footnote names what the figure shows instead of a fourth disclaimer (first-visit audit 2026-10-22, P1)']] },
  '/account/domains': { page: 'account/domains', ids: ['account-domains-', 'domainsNameInput'],
    reshaped: [[/^page:\/div:1\/header:1$/, 'the header became the hero (its back link is the breadcrumb\'s "Your account"); the form and the hand-off are the block after it'],
      [/^page:\/div:1\/header:1\/form:1$/, 'the form is Ark\'s form block (2026-10-21): the same label and Track, with Ark\'s required mark'],
      [/^page:\/div:1\/section:1$/, 'the list is Ark\'s list block (2026-10-21); with no names it shows its empty state, why and what to do']],
    retired: [[/^page:\/div:1$/, 'the page shell; a block page stacks its blocks in its root'],
      [/^page:\/div:1\/section:1\/p:1(\/span:1)?$/, 'the "Tracked names (0)" caption and its count: they are the Ark list\'s name now'],
      [/^page:\/div:1\/section:1\/ul:1$/, 'the hand-built rows: Ark\'s list draws its own'],
      [/^page:\/div:1\/section:1\/p:2$/, 'the empty sentence: the Ark list\'s empty state (a reason and a remedy) replaces it']],
    /* the form and the list are Ark's since 2026-10-21 (ledger recheck T13/T16/W4c) */
    reworded: [
      [/^page:\/div:1\/section:1\/p:1\/span:1$/, 'the count "(0)" is in the Ark list\'s name ("Tracked names (0)")'],
      [/^page:\/div:1\/section:1\/p:2$/, 'the empty sentence is the Ark list\'s empty state: "No names tracked yet." and "Track one above to keep it one step from Domains."']
    ] },
  '/not-found': { page: 'notfound', ids: ['not-found-'],
    reshaped: [
      [/^page:\/div:1\/header:1$/, 'the header became the hero: the address asked for is its detail, Home its action'],
      [/^page:\/div:1\/section:1$/, 'the ways onward are a section header and the journeys\' cards (in sight from 601px, a press away on a phone)'],
      [/^page:\/div:1\/section:1\/ul:1$/, 'the list is Ark\'s card grid; its first row, Home, is the hero\'s action'],
      [/^page:\/div:1\/section:1\/ul:1\/li:\d$/, 'a journey\'s row is its card: the way in is the card\'s title link, the note its description']
    ],
    retired: [
      [/^page:\/div:1$/, 'the dashboard shell\'s column; a block page stacks its blocks in its root'],
      [/^page:\/div:1\/header:1\/div:1$/, 'the header\'s copy column; Ark\'s hero has none'],
      [/^page:\/div:1\/section:1\/ul:1\/li:1$/, 'the Home row; Home is the hero\'s action, which keeps its link\'s key']
    ],
    reworded: [] }
};

(async () => {
  for (const file of ['js/pages/bundle-deployer.js', 'js/pages/deploy.js']) checks.assertSourceIsSpec(read(file), file);
  assert(/ArkUI\.page\(spec\(\), host, \{ page: 'explorer'/.test(read('js/pages/explorer.js')), '/explore is built by ArkUI.page around its live parts');
  assert(!fs.existsSync(path.join(checks.ROOT, 'css/bundle-deployer.css')), 'the bundle deployer\'s page CSS is gone');

  const lines = [];
  for (const route of Object.keys(ROUTES).filter((r) => process.argv.length <= 2 || process.argv.slice(2).includes(r))) {
    const spec = ROUTES[route];
    const seen = await converted.check(route, { reshaped: spec.reshaped, retired: spec.retired, reworded: spec.reworded, inspect: (window, page) => ({
      tabs: [...page.querySelectorAll('[data-ark-block="tabs"] [role="tab"]')].map((t) => t.textContent.trim()),
      handoff: page.querySelectorAll('.dx-onward').length,
      copies: page.querySelectorAll('.copy-command').length,
      nativeSelects: page.querySelectorAll('select:not(.ark-field__control)').length, fieldSelects: page.querySelectorAll('[data-ark-block="form"] select.ark-field__control, form.ark-form select.ark-field__control').length,
      reviewRows: page.querySelectorAll('#deploy-review tbody tr').length,
      pager: [...page.querySelectorAll('[data-ark-block="pager"] a')].map((a) => a.getAttribute('href')),
      /* read without a glossed term's tip (since 2026-10-21 /treasury marks terms on first use, and "Tier" is one) */
      tierExplained: /“Tier 1” is this preview’s label for FXN/.test((() => { const c = page.cloneNode(true); c.querySelectorAll('[data-ark-part="term-tip"]').forEach((t) => t.remove()); return c.textContent; })()),
      hint: (page.querySelector('#variable-hint') || {}).textContent || '',
      hintDescribes: ((page.querySelector('#variable') || { getAttribute() { return ''; } }).getAttribute('aria-describedby') || '').split(' ').includes('variable-hint'),
      rawOpen: page.querySelectorAll('[data-explore-raw-open]').length,
      onward: [...page.querySelectorAll('#explore-onward [data-ark-part="button"]')].map((b) => b.textContent.replace(/\s+/g, ' ').trim()),
      liveParts: ['[data-explore-kinds]', '[data-explore-fabric]', '[data-explorer-status]', '[data-explore-raw]', '[data-explorer-connect]'].filter((sel) => page.querySelector(sel)).length
    }) });
    if (route === '/bundle-deployer') {
      assert.equal(seen.tabs.length, 3, 'the three parts are tabs');
      assert.equal(seen.handoff, 1, 'the Bundles hand-off (the family kit) stays');
      for (const to of ['/account', '/download', '/resolutions/deployments', '/how-deployment-works']) assert(seen.pager.includes(to), '/bundle-deployer leads on to ' + to);
    }
    if (route === '/deploy') {
      assert.deepEqual(seen.tabs, ['01 / Check discovery', '02 / Create or select', '03 / Start the miner', '04 / Verify health', '05 / Inspect topology'], 'every step is a named tab');
      assert.equal(seen.copies, 5, 'every command keeps its Copy');
      assert.equal(seen.reviewRows, 5, '"Review all steps" shows every command');
    }
    /* Regression (W4-S14, 2026-10-20): the deposit draft's purpose list was a native <select> with the browser's own arrow
       (ledger /deposits P2); it is Ark's select field in Ark's form, in the forms chunk the route lists. */
    if (route === '/deposits') {
      assert.equal(seen.nativeSelects, 0, '/deposits has no native select outside Ark\'s field');
      assert.equal(seen.fieldSelects, 1, 'the purpose list is Ark\'s select field');
      assert(/ark-kit-forms\.js/.test(/deposits: \{[^\n]*\}/.exec(read('js/pages/catalog.js'))[0]), 'the /deposits route lists the forms chunk (a literal path)');
    }
    /* Regression (W4-S14): /deploy and /download drew two Copy controls (.deploy-copy, .download-copy). */
    if (route === '/deploy') assert(!read('js/pages/deploy.js').includes("'deploy-copy'") && read('js/pages/deploy.js').includes('ArkUI.copyCommand('), '/deploy uses the one Copy (ArkUI.copyCommand)');
    /* Regression (2026-10-20): the lab's slider had no instruction (docs/ux-audit/ledger.md, /experiments/lab P1): one line,
       derived from the study's own end labels, and the slider is described by it. */
    if (route === '/treasury') assert(seen.tierExplained, '/treasury says what "Tier 1" means beside the label (it was a bare term: ledger TR-3)');
    if (route === '/experiments') {
      assert(/^Drag the slider.* from apart to together\.$/.test(seen.hint) || /^Drag the slider.*to move from apart to together\.$/.test(seen.hint), 'the model says how to use it: ' + seen.hint);
      assert(seen.hintDescribes, 'the slider is described by that instruction');
    }
    if (route === '/explore') {
      assert.equal(seen.liveParts, 5, 'the live explorer is all there');
      assert.equal(seen.rawOpen, 1, '"Browse the raw records" opens the raw view');
      assert(seen.onward.some((label) => /What is a resolver/.test(label)), 'the ways on include What is a resolver');
    }
    const { blocks, panels } = await checks.assertServerRender(route, spec.page, { idPrefix: spec.ids });
    lines.push(`${route} ${seen.tally.kept}/${seen.tally.reshaped}/${seen.tally.retired} (ssr ${blocks}/${panels})`);
  }
  console.log('PASS: the task pages are Ark blocks with every word kept; old layout keys kept/reshaped/retired: ' + lines.join(', ') + '.');
})().catch((error) => { console.error(error); process.exit(1); });
