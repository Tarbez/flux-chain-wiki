'use strict';
/* Alt text for plain images (ArkLayout.alts, js/content/layout.js).

   Why this test exists: after the Studio merge the toolbar's Image section showed an Alt
   text heading, but js/main.js's preview protocol had no message for it and no draft stored
   it -- an edit there could not reach the page, the file, or the server render. A plain
   <img>/<svg> is page-module markup with no manifest field, so its only stable identity is
   the layout key every other per-element edit is stored under; the alt lives next to them.
   Asserted here, end to end except for the browser (tests/browser/seo-alt-checks.mjs):
     - the store: cleaning, set/clear, and that a layout with no alts serializes exactly as it
       did before the field existed (layout-data.js must not churn);
     - the DOM: the override is applied, the page's own value comes back when it is cleared,
       and describing an aria-hidden <svg> also un-hides it (a label nobody reads is no label);
     - the wiring: js/main.js accepts 'defxn-cms-preview-set-alt', and applies saved alts in a
       SYNCHRONOUS mount hook -- the server render serializes at ark:route-ready, before the
       rAF layout pass, so a rAF-only apply would leave alt text out of the SSR HTML;
     - the server render itself: the real api/lib/render-core.mjs, with a layout-data.js
       carrying an alt for a real element of the home page, emits it. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const layoutSource = fs.readFileSync(path.join(ROOT, 'js/content/layout.js'), 'utf8');
const main = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');
const admin = fs.readFileSync(path.join(ROOT, 'js/admin/admin.js'), 'utf8');
const context = vm.createContext({});
vm.runInContext(layoutSource + ';this.ArkLayout = ArkLayout;', context);
const L = context.ArkLayout;
const plain = (value) => JSON.parse(JSON.stringify(value));

// The store.
let layout = L.setAlt({}, '/', 'path:img:1', '  A  red\n door ');
assert.equal(L.altFor(layout, '/', 'path:img:1'), 'A red door', 'whitespace is collapsed and trimmed');
assert.equal(L.altFor(L.setAlt(layout, '/', 'path:img:1', '   '), '/', 'path:img:1'), '', 'a blank alt clears the override');
assert.equal(plain(L.setAlt(layout, '/', 'path:img:1', '')).alts, undefined, 'clearing the last alt removes the alts map entirely');
assert.equal(L.altFor(L.setAlt({}, '/', 'k', 'x'.repeat(1000)), '/', 'k').length, L.ALT_MAX, 'alt text is capped');
assert.deepEqual(plain(L.sanitize({ alts: { '/': { a: 'ok', b: 7, c: '' }, 'nope': { a: 'x' } } })).alts, { '/': { a: 'ok' } }, 'non-strings, blanks and non-route keys are dropped');
layout = L.set(layout, '/', 'path:img:1', 'desktop', { width: 200 });
layout = L.setLabel(layout, '/', 'path:img:1', 'Door photo');
assert.equal(L.altFor(L.group(layout, '/', 'g1', ['a', 'b']), '/', 'path:img:1'), 'A red door', 'every other layout mutation keeps the alts');
const layoutData = fs.readFileSync(path.join(ROOT, 'js/content/layout-data.js'), 'utf8');
let saved; vm.runInContext(layoutData, vm.createContext({ ArkLayout: { define: (v) => { saved = v; } } }));
if (!saved.alts) assert.equal(L.serialize(saved), layoutData, 'a layout with no alt overrides serializes byte-for-byte as before (no empty "alts" key)');
assert.ok(L.serialize(layout).includes('"alts"'), 'a layout with an alt override serializes it');

// The wiring (admin.js -> js/main.js protocol, main.js mount hooks).
assert.ok(admin.includes("type: 'defxn-cms-preview-set-alt'") && admin.includes("patch.operation === 'set-alt'"), 'the toolbar posts set-alt and folds the echoed patch into its own layout draft (so Save writes it)');
assert.ok(main.includes("data.type === 'defxn-cms-preview-set-alt'") && /ArkLayout\.setAlt\(cmsLayoutDraft/.test(main) && /ArkLayout\.applyAlt\(altElement/.test(main), 'the preview stores and applies a set-alt at once');
const hook = /onMount\(function \(_pageElement, page\) \{\s*var entry = [^\n]*\n\s*ArkLayout\.applyAlts\(host[^\n]*\n\s*\}\);/.exec(main);
assert.ok(hook && !hook[0].includes('requestAnimationFrame'), 'saved alts are applied in a synchronous mount hook, before ark:route-ready, not only in the rAF layout pass');
assert.ok(/applyAlts\(root, route, layout, elements\);/.test(layoutSource), 'ArkLayout.apply() also applies alts, so preview refreshes and undo/redo restore them');

(async () => {
  // The DOM.
  const { JSDOM } = (await import('jsdom')).default;
  const dom = new JSDOM('<!doctype html><body><main><img src="a.png" alt="From the page"><img src="b.png"><svg aria-hidden="true" viewBox="0 0 1 1"></svg><p>text</p></main></body>');
  const win = dom.window;
  const scope = vm.createContext(win);
  vm.runInContext(layoutSource + ';window.ArkLayout = ArkLayout;', scope);
  const W = win.ArkLayout, root = win.document.querySelector('main');
  const [imgA, imgB] = root.querySelectorAll('img'), svg = root.querySelector('svg'), p = root.querySelector('p');
  W.annotate(root);
  const key = (el) => el.getAttribute('data-ark-layout-key');
  let draft = W.setAlt({}, '/', key(imgA), 'A red door');
  draft = W.setAlt(draft, '/', key(imgB), 'A blue window');
  draft = W.setAlt(draft, '/', key(svg), 'Signal diagram');
  draft = W.setAlt(draft, '/', key(p), 'ignored');
  W.apply(root, '/', 1200, draft);
  assert.equal(imgA.getAttribute('alt'), 'A red door');
  assert.equal(imgB.getAttribute('alt'), 'A blue window');
  assert.equal(svg.getAttribute('aria-label'), 'Signal diagram');
  assert.ok(!svg.hasAttribute('aria-hidden') && svg.getAttribute('role') === 'img', 'a described svg is no longer hidden from assistive technology');
  assert.ok(!p.hasAttribute('alt') && !p.hasAttribute('aria-label'), 'an element with no text alternative of its own is left alone');
  assert.deepEqual(plain(W.altOwn(imgA)), { attr: 'alt', own: 'From the page', decorative: false }, 'the page\'s own alt stays readable while overridden');
  assert.deepEqual(plain(W.altOwn(svg)), { attr: 'aria-label', own: null, decorative: true });
  W.apply(root, '/', 1200, {});
  assert.equal(imgA.getAttribute('alt'), 'From the page', 'clearing the override restores the page\'s own alt');
  assert.ok(!imgB.hasAttribute('alt'), 'an image that had no alt has none again');
  assert.ok(svg.getAttribute('aria-hidden') === 'true' && !svg.hasAttribute('aria-label') && !svg.hasAttribute('role'), 'the svg is decorative again, exactly as the page wrote it');
  assert.ok(![imgA, imgB, svg].some((el) => el.hasAttribute('data-ark-alt-base')), 'no bookkeeping attribute is left behind');

  // The server render: the real render pipeline, with only layout-data.js swapped for one that
  // carries an alt for a real element of the home page (found by a first, plain render).
  const { readIndexHtml, renderDocument } = await import('../api/lib/render-core.mjs');
  const { requestInterceptor } = (await import('jsdom')).default;
  const TYPES = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json' };
  const resources = (layoutText) => ({ interceptors: [requestInterceptor(async (request) => {
    const pathname = decodeURIComponent(new URL(request.url).pathname);
    if (pathname === '/js/content/layout-data.js' && layoutText) return new Response(layoutText, { status: 200, headers: { 'content-type': TYPES['.js'] } });
    const full = path.join(ROOT, path.normalize(pathname).replace(/^(\.\.[/\\])+/, ''));
    const body = full.startsWith(ROOT + path.sep) && fs.existsSync(full) && fs.statSync(full).isFile() ? fs.readFileSync(full) : Buffer.alloc(0);
    return new Response(body, { status: 200, headers: { 'content-type': TYPES[path.extname(full)] || 'application/octet-stream' } });
  })] });
  const html = await readIndexHtml(ROOT);
  const first = await renderDocument({ html, url: 'https://defxn.com/', resources: resources(null), timeoutMs: 15000 });
  const svgKey = (/<svg[^>]*data-ark-layout-key="([^"]+)"/.exec(first) || [])[1];
  assert.ok(svgKey, 'the server render annotates layout keys at mount (the synchronous alt hook does it), so a saved key can find its element');
  const withAlt = L.serialize(L.setAlt(saved, '/', svgKey, 'Server-rendered description'));
  const second = await renderDocument({ html, url: 'https://defxn.com/', resources: resources(withAlt), timeoutMs: 15000 });
  const tag = new RegExp('<svg[^>]*data-ark-layout-key="' + svgKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*>').exec(second);
  assert.ok(tag && tag[0].includes('aria-label="Server-rendered description"') && tag[0].includes('role="img"'), 'the server-rendered HTML carries the saved text alternative: ' + (tag && tag[0]));
  console.log('PASS: alt text is stored per layout key, applied (and un-applied) in the DOM, wired through the preview protocol, and present in the server-rendered HTML.');
  process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
