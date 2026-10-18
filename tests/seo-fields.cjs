'use strict';
/* The SEO editor is DERIVED from js/content/seo.js's field definitions (ArkSEO.OVERRIDE_FIELDS /
   SITE_FIELDS), the same lists sanitize() walks to build the stored object.

   Why this test exists: the 2026-10-17 Studio merge rebuilt the SEO panels from a hand-written
   list of fields, and nine fields fell off it -- schemaType, aiSummary, canonical, noindex,
   lang, org, handle, llms and the per-bot AI-crawler policy stayed in seo-data.js (and kept
   driving robots.txt/llms.txt/JSON-LD) with no control anywhere to change them. Nothing
   failed: every count balanced, the file round-tripped, the panel rendered. The loss is only
   visible as "is there a control for every stored field", so that is what this asserts --
   both directions -- plus that moving sanitize() onto the definitions did not change one
   byte of the stored file (seo-data.js is the hashing-adjacent stored form; an inexact
   round trip rewrites it on the next Save). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const seoSource = fs.readFileSync('js/content/seo.js', 'utf8');
const admin = require('./lib/admin-source.cjs').ADMIN;
const context = vm.createContext({});
vm.runInContext(seoSource + ';this.ArkSEO = ArkSEO;', context, { filename: 'seo.js' });
const ArkSEO = context.ArkSEO;

// 1. Every stored key has exactly one definition, in stored order, and vice versa.
const site = ArkSEO.sanitize({}, [{ id: 'home', title: 'Home', fields: {} }], []);
assert.equal(JSON.stringify(Object.keys(site.site)), JSON.stringify(ArkSEO.SITE_FIELDS.map((f) => f.key)), 'the stored site object is exactly the SITE_FIELDS keys, in their order');
assert.equal(JSON.stringify(Object.keys(site.pages.home)), JSON.stringify(ArkSEO.OVERRIDE_FIELDS.map((f) => f.key)), 'a stored page override is exactly the OVERRIDE_FIELDS keys, in their order');
for (const f of ArkSEO.SITE_FIELDS.concat(ArkSEO.OVERRIDE_FIELDS)) {
  assert.ok(typeof f.label === 'string' && f.label, `${f.key} has a label for its control`);
  assert.doesNotThrow(() => ArkSEO.cleanField(f, undefined), `${f.key} (${f.kind}) has a cleaning rule`);
}
assert.ok(ArkSEO.SITE_FIELDS.every((f) => f.group === 'site' || f.group === 'ai'), 'every site field names the panel section it sits in');

// 2. The real seo-data.js re-serializes byte-for-byte (its own page/article ids as the registry).
let captured;
const dataContext = vm.createContext({ ArkSEO: { define: (whole) => { captured = whole; } } });
vm.runInContext(fs.readFileSync('js/content/seo-data.js', 'utf8'), dataContext);
const manifests = Object.keys(captured.pages).map((id) => ({ id, title: id, fields: {} }));
const articles = Object.keys(captured.articles).map((slug) => ({ slug }));
assert.equal(ArkSEO.serialize(captured, manifests, articles), fs.readFileSync('js/content/seo-data.js', 'utf8'), 'seo-data.js round-trips byte-identically through the definition-driven sanitize()');

// 3. The cleaning rules are the old hand-written ones, edge for edge.
const edge = ArkSEO.sanitize({
  site: { name: '', baseUrl: 'https://a.example/', lang: 'EN', org: 'Club', handle: ' @h ', bots: { GPTBot: 'block', Foo: 'block', CCBot: 'allow' }, llms: 0 },
  pages: { home: { title: 5, description: 'd', ogImage: ' /x.png ', canonical: ' https://c.example ', schemaType: 'FAQPage', noindex: 1, aiSummary: 's', aiBlocked: 'yes', extra: 1 } },
}, [{ id: 'home', title: 'Home', fields: {} }], []);
assert.deepEqual(JSON.parse(JSON.stringify(edge.site)), { name: 'DEFXN', baseUrl: 'https://a.example', defaultDescription: '', lang: 'en', org: 'Organization', handle: '@h', bots: { GPTBot: 'block' }, llms: 0 });
assert.deepEqual(JSON.parse(JSON.stringify(edge.pages.home)), { title: '', description: 'd', ogImage: '/x.png', canonical: 'https://c.example', schemaType: 'FAQPage', noindex: true, aiSummary: 's', aiBlocked: true });
assert.equal(ArkSEO.sanitize({ site: { baseUrl: 'ftp://x', llms: '0' } }).site.baseUrl, '', 'a non-http(s) base URL is dropped, never kept as typed');
assert.equal(ArkSEO.sanitize({ site: { llms: '0' } }).site.llms, 1, 'only the number 0 turns llms.txt off');

// 4. The admin builds SEO controls from the definitions and keeps no copy of its own.
/* Design mode's SEO is two homes since the fixed right panel went (2026-10-18): this page's
   override in the page picker's popover, the site-wide fields in Theme & defaults. */
assert.ok(/function renderPageSeoPop\([^)]*\) \{[\s\S]*?ArkSEO\.OVERRIDE_FIELDS/.test(admin), "the canvas's page-SEO popover builds its rows from ArkSEO.OVERRIDE_FIELDS");
assert.ok(/function buildSiteSeoPanel\([^)]*\) \{[\s\S]*?ArkSEO\.SITE_FIELDS\.filter\(\(f\) => f\.group === 'site'\)[\s\S]*?ArkSEO\.SITE_FIELDS\.filter\(\(f\) => f\.group === 'ai'\)/.test(admin), 'Theme & defaults builds the site and AI-crawler rows from ArkSEO.SITE_FIELDS, both groups');
assert.ok(/function renderDesignEditor\(container\) \{[\s\S]*?buildSiteSeoPanel\(\)/.test(admin), 'Theme & defaults shows the site-wide SEO section');
assert.ok(/function buildPageSeoPanel\([^)]*\) \{[\s\S]*?ArkSEO\.OVERRIDE_FIELDS/.test(admin), 'the Content-mode page SEO tab builds its rows from ArkSEO.OVERRIDE_FIELDS');
assert.ok(!/const AI_BOTS\s*=/.test(admin), 'admin.js keeps no second AI-crawler list; it reads ArkSEO.AI_BOTS');
for (const f of ArkSEO.OVERRIDE_FIELDS.concat(ArkSEO.SITE_FIELDS)) {
  assert.ok(!new RegExp('[{,]\\s*' + f.key + "\\s*:\\s*(''|false|0|\\{\\})").test(admin), `admin.js does not hand-list the SEO field "${f.key}" in an object literal`);
}

// 5. The derived rows, in a real DOM: one control per field, and editing each one changes the
//    draft the way Save will store it.
function extract(source, signature) {
  const start = source.indexOf(signature);
  assert.ok(start >= 0, 'admin.js still has ' + signature);
  let depth = 0, i = source.indexOf('{', start + signature.length - 1);
  for (; i < source.length; i++) { if (source[i] === '{') depth++; else if (source[i] === '}' && --depth === 0) break; }
  return source.slice(start, i + 1);
}
(async () => {
  const { JSDOM } = (await import('jsdom')).default;
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' });
  const win = dom.window;
  win.eval(seoSource + ';window.ArkSEO = ArkSEO;');
  const kinds = /const SEO_TEXT_KINDS = \{[^}]*\};/.exec(admin)[0];
  win.eval([extract(admin, 'function h(tag, props)'), extract(admin, 'function ctlLabel(value)'), extract(admin, 'function ctlField(ctx, label, key, opts)'), extract(admin, 'function ctlSegField(ctx, label, key, options, labelOf)'),
    extract(admin, 'function ctlSelectField(ctx, label, key, options, labelOf, opts)'), kinds, extract(admin, 'function seoFieldRows(fields, target, onEdited)'),
    extract(admin, 'function seoFieldsPanel(fields, target, onEdited)'), 'window.seoFieldsPanel = seoFieldsPanel;'].join('\n'));
  const doc = win.document;
  const edited = [];
  const page = {}, siteDraft = JSON.parse(JSON.stringify(ArkSEO.defaults().site));
  const pagePanel = win.seoFieldsPanel(win.ArkSEO.OVERRIDE_FIELDS, page, (f) => edited.push(f.key));
  const sitePanel = win.seoFieldsPanel(win.ArkSEO.SITE_FIELDS, siteDraft, (f) => edited.push(f.key));
  doc.body.append(pagePanel, sitePanel);
  for (const f of ArkSEO.OVERRIDE_FIELDS) assert.ok(pagePanel.querySelector(`[data-seo-field="${f.key}"]`), `the page panel has a control for ${f.key}`);
  for (const f of ArkSEO.SITE_FIELDS) assert.ok(sitePanel.querySelector(`[data-seo-field="${f.key}"]`), `the site panel has a control for ${f.key}`);
  for (const bot of ArkSEO.AI_BOTS) assert.ok(sitePanel.querySelector(`[data-seo-bot="${bot[0]}"]`), `the site panel has an allow/block control for ${bot[0]}`);

  const field = (panel, key) => panel.querySelector(`[data-seo-field="${key}"]`);
  const type = (panel, key, value) => { const input = field(panel, key).querySelector('input, textarea'); input.value = value; input.dispatchEvent(new win.Event('change')); };
  const press = (panel, selector, label) => { [...panel.querySelector(selector).querySelectorAll('button')].find((b) => b.textContent === label).click(); };
  const choose = (panel, key, value) => { const s = field(panel, key).querySelector('select'); s.value = value; s.dispatchEvent(new win.Event('change')); };

  type(pagePanel, 'title', 'A page title for search');
  type(pagePanel, 'aiSummary', 'A quotable answer.');
  type(pagePanel, 'canonical', '/canonical');
  choose(pagePanel, 'schemaType', 'FAQPage');
  press(pagePanel, '[data-seo-field="noindex"]', 'Yes');
  press(pagePanel, '[data-seo-field="aiBlocked"]', 'Yes');
  assert.equal(field(pagePanel, 'noindex').querySelector('[aria-pressed="true"]').textContent, 'Yes', 'a segmented flag shows its new state after the click (the panel repaints)');
  type(sitePanel, 'lang', 'en-GB');
  type(sitePanel, 'handle', '@defxn');
  choose(sitePanel, 'org', 'Person');
  press(sitePanel, '[data-seo-bot="GPTBot"]', 'Block');
  press(sitePanel, '[data-seo-field="llms"]:not([data-seo-bot])', 'Off');
  const stored = ArkSEO.sanitize({ site: siteDraft, pages: { home: page } }, [{ id: 'home', title: 'Home', fields: {} }], []);
  assert.deepEqual(JSON.parse(JSON.stringify(stored.pages.home)), { title: 'A page title for search', description: '', ogImage: '', canonical: '/canonical', schemaType: 'FAQPage', noindex: true, aiSummary: 'A quotable answer.', aiBlocked: true });
  assert.equal(stored.site.lang, 'en-GB'); assert.equal(stored.site.handle, '@defxn'); assert.equal(stored.site.org, 'Person'); assert.equal(stored.site.llms, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(stored.site.bots)), { GPTBot: 'block' });
  assert.ok(ArkSEO.robots(stored, [{ id: 'home', title: 'Home', fields: {} }], []).includes('User-agent: GPTBot\nDisallow: /'), 'the Block control ends up in robots.txt');
  assert.ok(edited.includes('bots') && edited.includes('schemaType') && edited.includes('title'), 'every edit reports which field changed, so the panel owner can mark the draft dirty');

  // A value that cleans to something else says so instead of storing the fallback silently.
  type(sitePanel, 'baseUrl', 'example.com/path');
  const refusal = sitePanel.querySelector('.seo-refusal');
  assert.ok(refusal && /needs an http\(s\) origin/.test(refusal.textContent), 'an unusable base URL names what it needs: ' + (refusal && refusal.textContent));
  // Save replaces seoDraft with its sanitized copy while the panel stays on screen: a panel
  // given a getter must write into whatever object the getter returns NOW, not the old one.
  let live = { title: '' };
  const lazyPanel = win.seoFieldsPanel(win.ArkSEO.OVERRIDE_FIELDS, () => live, () => {});
  doc.body.append(lazyPanel);
  const before = live; live = { title: '' };
  type(lazyPanel, 'title', 'After save');
  assert.equal(live.title, 'After save', 'an edit after Save lands in the current draft');
  assert.equal(before.title, '', 'and not in the detached pre-Save copy');
  console.log('PASS: every stored SEO field has exactly one control (and every control one field), seo-data.js round-trips byte-identically, and each control edits the draft as Save stores it.');
})().catch((error) => { console.error(error); process.exit(1); });
