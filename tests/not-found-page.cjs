/* An address no page answers gets a page that says so.

   Named regression (2026-10-19, docs/ux-audit/pages.md P8): js/ark/page-router.js resolve() fell
   back to 'zero', so a mistyped or retired URL silently showed Home and the visitor was never told
   that what they asked for is not here. Workspace law: a refusal names the failure, the missing
   thing and the remedy. The page must name the address verbatim, offer the closest real
   addresses, and every journey's way in -- all derived from the catalog and
   js/content/site-pages.js, never a hand list. The router half is in tests/page-router.cjs. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { loadCatalog } = require('./lib/site-catalog.cjs');

class Element {
  constructor(tag) { this.tagName = tag; this.className = ''; this.children = []; this.dataset = {}; this.attrs = {}; this._text = ''; }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(' '); }
  all() { return [this, ...this.children.flatMap((c) => (c.all ? c.all() : [c]))]; }
}
const { catalog, context } = loadCatalog();
assert(catalog.notfound && catalog.notfound.noindex && !catalog.notfound.journey, 'the not-found page exists, is noindex and is in no list');

function mountAt(path) {
  const ctx = vm.createContext({
    ArkSitePages: context.ArkSitePages,
    ArkUI: { pageModules: {}, pageCatalog: catalog, route: { href: (p) => p, path: () => path, search: () => '' } },
    document: { createElement: (t) => new Element(t), createTextNode: (t) => ({ textContent: t }) }
  });
  vm.runInContext(fs.readFileSync('js/ark/dash-kit.js', 'utf8'), ctx);
  vm.runInContext(fs.readFileSync('js/pages/not-found.js', 'utf8'), ctx);
  const page = ctx.ArkUI.pageModules.notFound.mount(new Element('main'));
  return { page, notFound: ctx.ArkUI.pageModules.notFound };
}

const { page, notFound } = mountAt('/stast');
const text = page.textContent;
assert(text.includes('/stast'), 'it names the address that was asked for, verbatim');
assert(/No page at this address/.test(text), 'and says plainly that no page answers it');
const hrefs = page.all().filter((e) => e.tagName === 'a').map((e) => e.href);
assert(hrefs.includes('/stats'), 'a one-letter typo offers the page that was meant');
assert(hrefs.includes('/'), 'Home is always a way on');
const leads = context.ArkSitePages.pages().filter((r) => r.lead).map((r) => r.path);
for (const lead of leads) assert(hrefs.includes(lead), 'every journey\'s way in is offered: ' + lead);
assert.deepEqual(Array.from(notFound.closest('/resolutions/finances', catalog)).slice(0, 1), ['resolutions/finance'], 'a near miss inside a family finds its page');
assert.equal(notFound.closest('/zzzz-qqqq-xxxx', catalog).length, 0, 'an address near nothing offers no false "did you mean"');

console.log('PASS: an unknown address gets a page that names it, offers the closest real pages and every journey\'s way in.');
