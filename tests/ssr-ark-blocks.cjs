'use strict';
/* run-tests-timeout-ms: 180000 */
/* A page built from Ark blocks (ArkUI.page, js/ark/blocks.js) server-renders styled, through the
   one real render path (api/lib/render-core.mjs, what api/render.mjs runs for a crawler):

   - the blocks are in the serialized HTML (they render synchronously, before ark:route-ready);
   - they are styled by the static css/ark-blocks.css the document links -- every Ark part class
     they carry has a rule there -- and by nothing injected at run time: no style attribute on a
     block element, no <style> element carrying a block rule (risk R1, components.md: jsdom's
     serializer drops rules inserted with insertRule / adoptedStyleSheets, so a crawler would get
     unstyled markup);
   - every word of every tab panel is in the HTML (closed panels are hidden, not absent);
   - generated ids are the reserved ark-r- kind, and two renders of the same route are identical
     byte for byte: the id counter restarts in every document (each jsdom window is its own
     globalThis), so a crawler's HTML is deterministic and cacheable.

   Hydration hazard (documented here and in docs/cms-architecture.md, "Pages as data"): that same
   restart means the ids in server HTML and in a browser's render differ by design. Nothing
   hydrates: a person is served the static index.html and the router mounts every page fresh, and
   only crawlers receive the server HTML. Any future reuse of server-rendered nodes in a browser
   must replace a block's whole subtree, never patch it. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');

(async () => {
  const { readIndexHtml, renderDocument, createLocalResources } = await import('../api/lib/render-core.mjs');
  const render = async () => renderDocument({ html: await readIndexHtml(ROOT), url: 'https://defxn.com/palette', resources: createLocalResources(ROOT), root: ROOT, timeoutMs: 30000 });
  const html = await render();

  assert(/<link rel="stylesheet" href="css\/ark-blocks\.css\?v=[^"]+"/.test(html), 'the document links the static block stylesheet');
  const doc = new JSDOM(html).window.document; // re-parsed with no scripts: what a crawler holds
  const page = doc.querySelector('[data-ark-page="palette"]');
  assert(page, 'the page is in the server HTML');
  for (const name of ['breadcrumb', 'hero', 'tabs', 'actions']) assert(page.querySelector(`[data-ark-block="${name}"]`), `the ${name} block is server-rendered`);

  // Styled by the static sheet only.
  const css = fs.readFileSync(path.join(ROOT, 'css/ark-blocks.css'), 'utf8');
  const blockEls = [...page.querySelectorAll('[data-ark-block], [data-ark-block] *')].filter((el) => !el.closest('[data-ark-slot]'));
  assert(blockEls.length > 50);
  const styled = blockEls.filter((el) => el.hasAttribute('style')).map((el) => el.tagName + '.' + el.className);
  assert.deepEqual(styled, [], 'no block element carries a style attribute (the page\'s own slot content may)');
  const unstyledParts = [...page.querySelectorAll('[data-ark-part]')].filter((el) => !el.closest('[data-ark-slot]'))
    .map((el) => [...el.classList].filter((cls) => cls.startsWith('ark-')))
    .filter((classes) => classes.length && !classes.some((cls) => css.includes('.' + cls)));
  assert.deepEqual(unstyledParts, [], 'every Ark part class in the server HTML has a rule in css/ark-blocks.css');
  const injected = [...doc.querySelectorAll('style')].filter((style) => /\.ark-(block|hero|tabs|breadcrumb|actions|figure|section-header|accordion|disclosure)\b/.test(style.textContent));
  assert.equal(injected.length, 0, 'no block rule was injected into a <style> element at run time');

  // Folded content is hidden, never missing: every swatch of every tab is in the HTML.
  /* Derived, never a typed count (2026-10-20: /palette now draws every SDK colour token, so the old
     "90" went stale): every colour token the SDK defines (js/content/palette-tokens.js, generated from
     @deadark/sdk/theme) is a swatch in the crawler's HTML, and every tab has its panel. */
  const tokenSrc = fs.readFileSync(path.join(ROOT, 'js/content/palette-tokens.js'), 'utf8');
  const sdkColors = JSON.parse(tokenSrc.slice(tokenSrc.indexOf('Object.freeze(') + 14, tokenSrc.lastIndexOf(');'))).colors;
  const swatchTokens = new Set([...page.querySelectorAll('.palette-swatch')].map((s) => s.getAttribute('title')));
  assert.deepEqual(sdkColors.filter((t) => !swatchTokens.has('--' + t)), [], 'every SDK colour token, in every tab panel, is a swatch in the crawler\'s HTML');
  const panels = [...page.querySelectorAll('#palette-views [role="tabpanel"]')];
  assert.equal(panels.length, page.querySelectorAll('#palette-views [role="tab"]').length, 'every tab has its panel in the HTML');
  assert.equal(panels.filter((p) => !p.hasAttribute('hidden')).length, 1, 'one tab panel shows; the others are hidden, not absent');

  // Generated ids: reserved, and deterministic per document.
  const ids = [...page.querySelectorAll('[id]')].map((el) => el.id);
  const generated = ids.filter((id) => /^ark-r-/.test(id));
  assert(generated.length > 10, 'blocks generate ids for aria-controls / aria-labelledby');
  assert(ids.filter((id) => !/^ark-r-/.test(id)).every((id) => /^palette-/.test(id)), 'every other id is an authored palette-* id');
  for (const el of page.querySelectorAll('[aria-controls], [aria-labelledby]')) {
    for (const ref of [el.getAttribute('aria-controls'), el.getAttribute('aria-labelledby')].filter(Boolean).flatMap((v) => v.split(/\s+/))) {
      assert(doc.getElementById(ref), `${ref} (referenced by ${el.tagName}) exists in the server HTML`);
    }
  }
  const again = await render();
  assert.equal(again, html, 'two server renders of /palette are identical: the id counter restarts per document');

  console.log(`PASS: /palette server-renders ${page.querySelectorAll('[data-ark-block]').length} Ark blocks styled only by css/ark-blocks.css, nothing injected, every panel's words present, ${generated.length} reserved ids, deterministic.`);
})().catch((error) => { console.error(error); process.exit(1); });
