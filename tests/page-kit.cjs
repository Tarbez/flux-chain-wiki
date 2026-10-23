'use strict';
/* run-tests-timeout-ms: 600000 -- one jsdom boot of the real site per route. */
/* js/ark/page-kit.js: the three things the guided pages share (DEFXN polish Wave 4, W4-S14).
   Run alone (owner test law); `node tests/page-kit.cjs /deploy` checks one route.

   Named regressions it holds:
   - /deploy and /download each drew their own Copy control (.deploy-copy and .download-copy: two
     looks, two clipboard fallbacks, one with a spoken result and one without): both are the one
     Ark `actions` button from ArkUI.copyCommand. Its label says "Copied"; a refusal is said in
     words and names the fix.
   - Story-sheet CTA casing: eleven sheets showed their manifest's capitals ("COMPARE GOVERNANCE
     ROSTERS") and /dao a hand-typed sentence-case label ("Inspect activation gates"). Every action
     label a sheet takes from a manifest goes through ArkUI.sentenceCase, which keeps what the
     site itself spells in capitals ("Run DEFXN from source", not "Run defxn from source") and
     leaves a label authored in mixed case alone. /dao leads on with the words of the page it
     leads to (NOTES.CTA), not words typed in sheet.js.
   - Dead ends: /lifecycle, its five stages and the sheets named no way out of their own journey.
     Each now has a "Where next" row derived from the site's journeys (ArkUI.nextSteps: the lead
     page of the next two journeys and of the last one, the model), naming no page by hand. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const continuity = require('./lib/layout-continuity.cjs');

const read = (file) => fs.readFileSync(path.join(path.resolve(__dirname, '..'), file), 'utf8');
const only = process.argv.slice(2);
const want = (route) => !only.length || only.includes(route);
const tick = (window, ms = 20) => new Promise((resolve) => window.setTimeout(resolve, ms));
const label = (el) => el.textContent.replace(/\s+/g, ' ').trim();
const words = (el) => label(el).replace(/\s*[→↗]$/, ''); // a link button draws its own arrow

(async () => {
  /* ---- source: one control, one case rule ----------------------------------------------- */
  for (const file of ['js/pages/deploy.js', 'js/pages/download.js']) {
    const source = read(file);
    assert(source.includes('ArkUI.copyCommand('), file + ' draws its Copy with ArkUI.copyCommand');
    assert(!/navigator\.clipboard|execCommand/.test(source), file + ' has no clipboard code of its own');
    assert(!/deploy-copy|download-copy/.test(source), file + ' no longer builds its own Copy class');
  }
  for (const css of ['css/download.css', 'css/page-layout.css']) assert(!/\.(deploy|download)-copy\b/.test(read(css)), css + ' no longer styles a page-owned Copy');
  assert(!/function sentence\(text\) \{ return text\.charAt/.test(read('js/pages/download.js')), 'no page keeps its own toLowerCase() sentence case: the rule is ArkUI.sentenceCase');
  assert(/Where next/.test(read('js/pages/sheet.js')) && /ArkUI\.nextSteps\(/.test(read('js/pages/sheet.js')) && /ArkUI\.nextSteps\(/.test(read('js/pages/lifecycle.js')), 'sheet.js and lifecycle.js take their ways on from ArkUI.nextSteps');
  const catalog = read('js/pages/catalog.js');
  for (const key of ['deploy', 'download', 'lifecycle', 'dao']) assert(new RegExp('  ' + key + ': \\{[^\\n]*js/ark/page-kit\\.js').test(catalog), key + ' lists the page kit');
  assert(/module: 'theory', scripts: [^\n]*js\/ark\/page-kit\.js/.test(catalog), 'derived theory routes list the page kit');

  /* ---- /deploy: the copy control, in a real page ---------------------------------------- */
  if (want('/deploy')) {
    const seen = await continuity.pageKeys('/deploy', { inspect: async (window) => {
      const { document, ArkUI } = window;
      // the pure helpers
      const sc = ArkUI.sentenceCase;
      const rule = {
        capitals: sc('RUN DEFXN FROM SOURCE'), plain: sc('COMPARE GOVERNANCE ROSTERS'), article: sc('CREATE OR JOIN A NETWORK'),
        mixed: sc('Inspect activation gates'), empty: sc(''), lowerOnly: sc('already lower')
      };
      const plain = (value) => JSON.parse(JSON.stringify(value)); // out of the window's realm, for deepStrictEqual
      const ways = plain(ArkUI.nextSteps('concept/practice'));
      const wrap = plain(ArkUI.nextSteps('palette')), none = plain(ArkUI.nextSteps('reference')), lastJourney = plain(ArkUI.nextSteps('proximity'));
      // the one Copy
      const copies = [...document.querySelectorAll('.copy-command')];
      const first = copies[0];
      const button = first.querySelector('[data-ark-part="button"]');
      const written = [];
      Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText: (value) => { written.push(value); return Promise.resolve(); } } });
      button.click(); await tick(window);
      const afterCopy = { label: label(button), aria: button.getAttribute('aria-label'), said: first.parentElement.querySelector('.copy-command-status').textContent, state: first.parentElement.querySelector('.copy-command-status').getAttribute('data-state') };
      // a refusal says so, in words
      Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } });
      window.document.execCommand = undefined;
      const second = copies[1] || first, button2 = second.querySelector('[data-ark-part="button"]');
      button2.click(); await tick(window);
      const refused = { said: second.parentElement.querySelector('.copy-command-status').textContent, state: second.parentElement.querySelector('.copy-command-status').getAttribute('data-state'), label: label(button2) };
      return { rule, ways, wrap, none, lastJourney, count: copies.length, written: plain(written), afterCopy, refused, oldClasses: document.querySelectorAll('.deploy-copy,.download-copy').length,
        isArk: !!first.closest('[data-ark-block="actions"]') || first.getAttribute('data-ark-block') === 'actions', tone: button.getAttribute('data-tone') };
    } });
    const s = seen.extra;
    assert.equal(s.rule.capitals, 'Run DEFXN from source', 'a token the site spells in capitals stays in capitals');
    assert.equal(s.rule.plain, 'Compare governance rosters');
    assert.equal(s.rule.article, 'Create or join a network');
    assert.equal(s.rule.mixed, 'Inspect activation gates', 'a label authored in mixed case is left alone');
    assert.equal(s.rule.empty, '');
    assert.equal(s.rule.lowerOnly, 'already lower');
    assert.deepEqual(s.ways.map((w) => w.href), ['route:resolutions', 'route:stats', 'route:proximity'], 'an understand page leads on to the lead of the next two journeys and of the model');
    assert.deepEqual(s.lastJourney, [], 'the last journey has nothing after it and names itself no way on');
    assert.deepEqual(s.none, [], 'a page in no journey (the reference reader) has no ways on');
    assert(s.wrap.every((w) => w.href !== 'route:palette'), 'a page never leads on to itself');
    assert.equal(s.count, 5, 'every command has the one Copy');
    assert.equal(s.oldClasses, 0, 'no page-owned Copy class is left');
    assert(s.isArk && s.tone === 'secondary', 'Copy is Ark\'s secondary actions button');
    assert.deepEqual(s.written, ['flux-network network list'], 'it copied the step\'s command');
    assert.equal(s.afterCopy.label, 'Copied', 'the button says it copied');
    assert.equal(s.afterCopy.aria, 'Copy command for Check discovery', 'the button is named for its step');
    assert.equal(s.afterCopy.state, 'done');
    assert(/refus|unavailable/i.test(s.refused.said) && /by hand/.test(s.refused.said) && s.refused.state === 'refused' && s.refused.label === 'Copy', 'a refused copy says so and names the fix: ' + s.refused.said);
  }

  /* ---- /download: the same control, hidden where a step has no commands ------------------ */
  if (want('/download')) {
    const seen = await continuity.pageKeys('/download', { inspect: async (window) => {
      const { document } = window;
      const copy = document.querySelector('.copy-command');
      const copies = document.querySelectorAll('.copy-command').length;
      const written = [];
      Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText: (value) => { written.push(value); return Promise.resolve(); } } });
      copy.querySelector('[data-ark-part="button"]').click(); await tick(window);
      const firstStep = { written: written.slice(), aria: copy.querySelector('[data-ark-part="button"]').getAttribute('aria-label'), hidden: copy.hidden };
      const checksStep = await (async () => { window.document.querySelector('[data-ark-page]').downloadSelect(2, false); return { hidden: copy.hidden }; })();
      return { copies, firstStep, checksStep, old: document.querySelectorAll('.download-copy,.deploy-copy').length,
        hero: [...document.querySelectorAll('[data-ark-part="hero"] [data-ark-part="button"], .story-page [data-ark-part="hero"] a')].map(label) };
    } });
    const s = seen.extra;
    assert.equal(s.copies, 1, '/download has the one Copy');
    assert.equal(s.old, 0);
    assert.deepEqual(s.firstStep.written, ['node --version\nnpm --version'], 'it copies the step\'s commands');
    assert(/^Copy commands for /.test(s.firstStep.aria), 'it is named for the step: ' + s.firstStep.aria);
    assert.equal(s.firstStep.hidden, false);
    assert.equal(s.checksStep.hidden, true, 'a step with no commands hides the control');
  }

  /* ---- the sheets: one case rule, and a way on ------------------------------------------- */
  for (const route of ['/concept/practice', '/dao', '/concept/spec'].filter(want)) {
    const seen = await continuity.pageKeys(route, { inspect: async (window) => {
      const { document, ArkCopy } = window;
      const page = document.querySelector('[data-ark-page]');
      const heroActions = [...page.querySelectorAll('[data-ark-block="hero"] [data-ark-part="button"]')].map(label);
      const sources = [...page.querySelectorAll('[data-ark-part="tabs-content"] [data-ark-block="actions"] [data-ark-part="button"]')].map(label);
      /* since 2026-10-22 (first-visit audit, P1) a question of the sequence carries its ways on in its pager's related row
         ("Where next"), under the previous / next question, so The idea holds one action; /dao keeps them in The idea */
      const where = [...page.querySelectorAll('[data-ark-block="actions"][aria-label="Where next"] [data-ark-part="button"], [data-ark-block="pager"] [data-ark-part="pager-related"] a')].map((a) => ({ text: words(a), href: a.getAttribute('href') }));
      const relatedLabel = (page.querySelector('[data-ark-block="pager"] .ark-pager__related-label') || {}).textContent || '';
      return { heroActions, sources, where, relatedLabel, notes: ArkCopy.text('NOTES.CTA') };
    } });
    const s = seen.extra;
    assert(s.heroActions.length >= 1, route + ' has its next step');
    for (const text of s.heroActions.concat(s.sources)) assert(text !== text.toUpperCase() || text.length < 4, route + ': "' + text + '" is not in capitals (one case rule for the sheet\'s actions)');
    if (route === '/dao') {
      /* since 2026-10-22 (first-visit audit, P1) the hero action is the product, "Open DAO" (the family kit's address), and the
         notes link it replaced leads the ways on, still in the words its destination authored (NOTES.CTA), in the one case */
      const notes = s.notes.charAt(0) + s.notes.slice(1).toLowerCase();
      assert(/^Open DAO/.test(s.heroActions[0]) || s.heroActions[0].replace(/\s*[→↗]$/, '') === notes, '/dao leads with "Open DAO" (or, with no family kit loaded, the notes link): ' + s.heroActions[0]);
      assert.equal(s.where.length && s.where[0].text, notes, '/dao: the notes link leads the ways on: ' + JSON.stringify(s.where));
      s.where.shift();
    } else assert.equal(s.relatedLabel.trim(), 'Where next', route + ': the pager\'s related row is named "Where next"');
    if (route === '/concept/spec') assert(s.heroActions.concat(s.sources).some((t) => /DEFXN/.test(t)), 'a token the site spells in capitals stays in capitals: ' + s.heroActions.join(' | '));
    assert.deepEqual(s.where.map((w) => w.text), ['Resolutions', 'Mesh performance', 'Interactive model'], route + ' has its ways on: ' + JSON.stringify(s.where));
    assert(s.where.some((w) => /experiments/.test(w.href)), route + ' links the interactive model');
  }

  /* ---- the lifecycle: out of it, not only along it ---------------------------------------- */
  for (const route of ['/lifecycle', '/lifecycle/receipt'].filter(want)) {
    const seen = await continuity.pageKeys(route, { inspect: async (window) => {
      const page = window.document.querySelector('[data-ark-page]');
      return [...page.querySelectorAll('[data-ark-block="actions"][aria-label="Where next"] [data-ark-part="button"]')].map((a) => ({ text: words(a), href: a.getAttribute('href') }));
    } });
    assert.deepEqual(seen.extra.map((w) => w.text), ['Resolutions', 'Mesh performance', 'Interactive model'], route + ' leads out of the lifecycle');
    assert(seen.extra.some((w) => /\/experiments/.test(w.href)), route + ' links /experiments');
  }
  console.log('PASS: one Copy, one case rule, and a way on from the lifecycle and the sheets.');
})().catch((error) => { console.error(error); process.exit(1); });
