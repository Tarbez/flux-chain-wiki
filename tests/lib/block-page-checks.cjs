'use strict';
/* =====================================================================
   BLOCK PAGE CHECKS -- what every page converted to Ark blocks must hold,
   shared by the Wave 3 page tests (tests/stats-*-blocks.cjs,
   tests/resolvers-blocks.cjs, tests/resolver-math-blocks.cjs) so the
   rules are written once (tests/ssr-ark-blocks.cjs is the /palette pilot
   of the same checks).

     const checks = require('./lib/block-page-checks.cjs');
     const seen = await checks.visit('/stats/gpu', (window, page) => ({ ... }));
     await checks.assertServerRender('/stats/gpu', 'stats/gpu', { idPrefix: 'statsgpu-' });
     checks.assertSourceIsSpec(source, file);

   - visit(): boots the route through the real server render (jsdom, the real
     scripts, api/lib/render-core.mjs) and hands `inspect(window, page)` the
     mounted page root, plus the common facts every block page reports
     (blocks, refusals, missing glossary terms, the CMS anchor).
   - assertServerRender(): the crawler's HTML -- re-parsed with no scripts --
     holds every block, styled only by the static css/ark-blocks.css (no style
     attribute on a block element, no injected block rule), every tab and
     accordion panel's words present (closed is hidden, never absent), ids
     authored or the reserved ark-r- kind, every aria reference resolving, and
     two renders identical byte for byte.
   - assertSourceIsSpec(): the module is a spec built by ArkUI.page, with none
     of the hand-built helpers the conversion deleted.
   ===================================================================== */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');

async function core() { return import(path.join(ROOT, 'api/lib/render-core.mjs')); }

async function visit(route, inspect) {
  const { readIndexHtml, inspectDocument, createLocalResources } = await core();
  return inspectDocument({ html: await readIndexHtml(ROOT), url: 'https://defxn.com' + route, resources: createLocalResources(ROOT), root: ROOT, timeoutMs: 30000 }, async (window) => {
    const page = window.document.querySelector('[data-ark-page]:not([hidden])') || window.document.querySelector('[data-ark-page]');
    assert(page, route + ' mounted no page');
    const common = {
      blocks: [...page.querySelectorAll(':scope > [data-ark-block]')].map((el) => el.getAttribute('data-ark-block')),
      refused: [...page.querySelectorAll('[data-ark-block-refused]')].map((el) => el.getAttribute('data-ark-block-refused') + ': ' + el.textContent.slice(0, 200)),
      termsMissing: [...page.querySelectorAll('[data-ark-term-missing]')].map((el) => el.getAttribute('data-ark-term-missing')),
      terms: [...page.querySelectorAll('[data-ark-part="term"][data-term]')].map((el) => el.getAttribute('data-term')),
      inserts: page.querySelectorAll('[data-ark-insert="main"]').length,
      labelledBy: page.getAttribute('aria-labelledby'),
      h1: [...page.querySelectorAll('h1')].map((h) => h.id)
    };
    return Object.assign(common, inspect ? await inspect(window, page) : {});
  });
}

async function assertServerRender(route, pageId, { idPrefix } = {}) {
  const { JSDOM } = require('jsdom');
  const { readIndexHtml, renderDocument, createLocalResources } = await core();
  const render = async () => renderDocument({ html: await readIndexHtml(ROOT), url: 'https://defxn.com' + route, resources: createLocalResources(ROOT), root: ROOT, timeoutMs: 30000 });
  const html = await render();
  assert(/<link rel="stylesheet" href="css\/ark-blocks\.css\?v=[^"]+"/.test(html), route + ': the document links the static block stylesheet');
  const doc = new JSDOM(html).window.document; // what a crawler holds: no scripts ran here
  const page = doc.querySelector(`[data-ark-page="${pageId}"]`);
  assert(page, route + ': the page is in the server HTML');
  const css = fs.readFileSync(path.join(ROOT, 'css/ark-blocks.css'), 'utf8');
  const blockEls = [...page.querySelectorAll('[data-ark-block], [data-ark-block] *')].filter((el) => !el.closest('[data-ark-slot]'));
  assert(blockEls.length > 20, route + ': blocks are server-rendered');
  const styled = blockEls.filter((el) => el.hasAttribute('style')).map((el) => el.tagName + '.' + el.className);
  assert.deepEqual(styled, [], route + ': no block element carries a style attribute (its slot content may)');
  const unstyled = [...page.querySelectorAll('[data-ark-part]')].filter((el) => !el.closest('[data-ark-slot]'))
    .map((el) => [...el.classList].filter((cls) => cls.startsWith('ark-')))
    .filter((classes) => classes.length && !classes.some((cls) => css.includes('.' + cls)));
  assert.deepEqual(unstyled, [], route + ': every Ark part class in the server HTML has a rule in css/ark-blocks.css');
  // the block classes this page renders (not the site's own .ark-zero/.ark-background rules)
  const blockClasses = new Set(blockEls.flatMap((el) => [...el.classList].filter((cls) => cls.startsWith('ark-'))));
  const injected = [...doc.querySelectorAll('style')].filter((style) => [...blockClasses].some((cls) => new RegExp('\\.' + cls + '(?![\\w-])').test(style.textContent)));
  assert.equal(injected.length, 0, route + ': no block rule was injected into a <style> element at run time');
  for (const panel of page.querySelectorAll('[role="tabpanel"], [data-ark-part="accordion-content"]')) {
    assert(panel.textContent.trim().length > 0, route + ': a folded panel is in the HTML with its words (hidden, never absent)');
  }
  const ids = [...page.querySelectorAll('[id]')].map((el) => el.id);
  if (idPrefix) {
    const prefixes = [].concat(idPrefix);
    const foreign = ids.filter((id) => !/^ark-r-/.test(id) && !prefixes.some((prefix) => id.startsWith(prefix)));
    assert.deepEqual(foreign, [], route + ': every id is generated (ark-r-) or an authored ' + prefixes.join('* / ') + '* id');
  }
  for (const el of page.querySelectorAll('[aria-controls], [aria-labelledby]')) {
    for (const ref of [el.getAttribute('aria-controls'), el.getAttribute('aria-labelledby')].filter(Boolean).flatMap((v) => v.split(/\s+/))) {
      assert(doc.getElementById(ref), `${route}: ${ref} (referenced by ${el.tagName}) exists in the server HTML`);
    }
  }
  const again = await render();
  assert.equal(again, html, route + ': two server renders are identical (the id counter restarts per document)');
  return { blocks: page.querySelectorAll('[data-ark-block]').length, panels: page.querySelectorAll('[role="tabpanel"]').length };
}

/* The deleted helpers, by name: a converted page builds no tile, table, bar or tab of its own. */
const HAND_BUILT = [
  [/\binnerHTML\b/, 'an innerHTML page string'],
  [/function (esc|fmtCell|tile|headRow|row|bars|cpuBars|statusChip|chips|table)\s*\(/, 'a hand-built esc/tile/headRow/row/bars/table helper'],
  [/['"](stats-tile|stats-bento|stats-shell|stats-bar-row|dash-panel|dash-grid|dash-stat|dash-bars|dash-table)['" ]/, 'a hand-built stats-tile / dash-* class'],
  [/\bD\.(panel|stat|table|sectionHead|shell|bar)\(/, 'an ArkUI.dash layout builder (panel, stat, table, sectionHead, shell, bar)'],
  [/createElement\('(section|header|h1|h2|nav|table|article)'\)/, 'hand-built page structure']
];
function assertSourceIsSpec(source, file) {
  assert(/ArkUI\.page\(/.test(source), file + ': the page is built by ArkUI.page from its spec');
  for (const [re, what] of HAND_BUILT) assert(!re.test(source), file + ' still carries ' + what + ' (' + (source.match(re) || [''])[0] + ')');
}

module.exports = { visit, assertServerRender, assertSourceIsSpec, ROOT };
