'use strict';
/* A new page or article is asked for by its TITLE; its address is derived from the title and can
   be changed under Developer details.

   Why this exists (docs/ux-audit/cms.md P1-4): "New theory page" was a slug field under the last
   of 70 rows, a name with a space was refused with "A page name is lowercase letters and digits,
   starting with a letter.", and what was typed never became the page's name. Runs the real
   editor.js / articles.js (createPage, createArticle) in jsdom, and the real New panel of
   js/admin/rail.js against admin-app.html's own markup for it. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { bootForms } = require('./lib/admin-forms-dom.cjs');

const { A, state, window, document } = bootForms();

/* the one create path takes the title as the name and the heading */
const page = A.createPage('pricingplans', { title: 'Pricing plans' });
assert.equal(page.ok, true);
assert.equal(state.drafts.pricingplans.title, 'Pricing plans', 'the page is called what was typed');
assert.equal(state.drafts.pricingplans.fields.TITLE.value, 'Pricing plans', 'and that is its heading');
const art = A.createArticle('hello-world', { title: 'Hello, world' });
assert.equal(art.ok, true);
assert.equal(state.aDrafts['hello-world'].title, 'Hello, world', 'the article is called what was typed');
/* a refusal names the address and the remedy, in words a person can act on */
const twice = A.createPage('pricingplans', { title: 'Pricing plans' });
assert.equal(twice.ok, false);
assert.match(twice.refusal, /already a page at \/concept\/pricingplans/);
assert.match(twice.refusal, /Change the title, or the address under Developer details/);
const none = A.createPage('', { title: '2026' });
assert.match(none.refusal, /gives no address: it needs at least one letter/);
console.log('PASS: createPage / createArticle take the title as the name; refusals say what to change.');

/* the panel: the address follows the title until the person types one of their own */
const app = fs.readFileSync('admin-app.html', 'utf8');
const panel = app.slice(app.indexOf('<div class="pages-top">'), app.indexOf('<ul class="list site-tree" id="pages"'));
assert(panel.includes('id="newTitle"') && panel.includes('id="newItemCreate"') && panel.includes('data-new-kind="article"'), 'the New panel asks what kind and a title');
assert(!/New theory page/.test(app), 'no slug-only "New theory page" form is left');
const rail = fs.readFileSync('js/admin/rail.js', 'utf8');
const start = rail.indexOf('  const slugFor = (kind, title) => {'), end = rail.indexOf('  let newKind', start);
assert(start > 0 && end > start, 'rail.js derives the address from the title (slugFor)');
const slugFor = new Function(rail.slice(start, end) + '\nreturn slugFor;')();
assert.equal(slugFor('page', 'Pricing plans'), 'pricingplans', 'a guide page address: letters and digits');
assert.equal(slugFor('article', 'Hello, world!'), 'hello-world', 'an article address: words joined by hyphens');
assert.equal(slugFor('article', 'Café déjà vu'), 'cafe-deja-vu', 'accents fold to plain letters');
assert.equal(slugFor('page', '2026 roadmap'), 'roadmap', 'an address starts with a letter');
console.log('PASS: the address is derived from the title, readable, and valid for the kind.');
void window; void document;
