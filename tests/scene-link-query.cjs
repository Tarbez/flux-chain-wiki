/* Every in-page document link must open THAT document, and the reader must return to the page
   the link was on.

   Named regression (2026-10-19, docs/ux-audit/pages.md P1): js/ark/dash-kit.js docHref() writes
   `/reference?doc=<path>&from=<route>` into the href and tags the link data-scene-link="reference",
   but js/hero-motion.js rewrote every scene link's href to router.url(key) + data-route-query --
   and no doc link sets data-route-query -- so the query was stripped, and the click passed
   `query: undefined`. The reader then fell back to docs/protocol/agreements.md with from='/':
   71 evidence links on 41 routes ("Full record · INFRA-001", "Read BENCH-005", the operator
   guide...) all opened "Agreements", and "Return to the explanation" went Home. Every counter
   balanced; only clicking a link showed it. The browser half of this check clicks real links:
   tests/browser/site-fixes.mjs. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

/* ArkUI.route.linkQuery: the one reader of a scene link's query */
const ctx = vm.createContext({ ArkUI: {}, location: { protocol: 'https:', pathname: '/stats', search: '', hash: '' }, history: {} });
vm.runInContext(fs.readFileSync('js/ark/route.js', 'utf8'), ctx);
const route = ctx.ArkUI.route;
const link = (href, routeQuery) => ({ dataset: routeQuery ? { routeQuery } : {}, getAttribute: (k) => (k === 'href' ? href : null) });
assert.equal(route.linkQuery(link('/reference?doc=docs%2Fevidence%2Fregistry.md&from=%2Fstats')), 'doc=docs%2Fevidence%2Fregistry.md&from=%2Fstats', 'a doc link keeps the query in its href');
assert.equal(route.linkQuery(link('#/reference?doc=docs%2Fa.md')), 'doc=docs%2Fa.md', 'the hash form (file:) too');
assert.equal(route.linkQuery(link('/concept?view=more', 'view=more')), 'view=more', 'an explicit data-route-query still wins');
assert.equal(route.linkQuery(link('/stats')), '', 'a plain route link has no query');
assert.equal(route.linkQuery(link('/reference?doc=x#part')), 'doc=x', 'a fragment is not part of the query');

/* docHref with no origin names none, so the click fills in the page it is on (not '/') */
const dash = vm.createContext({ ArkUI: { route: { href: (p) => p } }, document: { createElement: () => ({ dataset: {} }) } });
vm.runInContext(fs.readFileSync('js/ark/dash-kit.js', 'utf8'), dash);
assert.equal(dash.ArkUI.dash.docHref('docs/a.md'), '/reference?doc=docs%2Fa.md', 'no from: the link does not claim Home as its origin');
assert.equal(dash.ArkUI.dash.docHref('docs/a.md', '/stats'), '/reference?doc=docs%2Fa.md&from=%2Fstats');

/* hero-motion reads the query through linkQuery in BOTH places, and a reference click gets a from */
const hero = fs.readFileSync('js/hero-motion.js', 'utf8');
assert(/var sceneQuery = ArkUI\.route\.linkQuery;/.test(hero), 'hero-motion uses the one query reader');
assert(/querySelectorAll\('\[data-scene-link\]'\)\.forEach\(function \(link\) \{ var query = sceneQuery\(link\);/.test(hero), 'the href rewrite on mount keeps the query');
assert(/var query = source && source\.dataset \? sceneQuery\(source\) : '';/.test(hero), 'the click passes the query');
assert(/if \(page === 'reference'\) query = referenceQuery\(query\);/.test(hero) && /if \(ArkUI\.route\.path\(\) !== '\/reference' \|\| !params\.get\('from'\)\) params\.set\('from', ArkUI\.route\.current\(\)\)/.test(hero), 'a doc link returns to the page it was clicked on, whatever from it was built with');
assert(!/link\.dataset\.routeQuery\?'\?'\+link\.dataset\.routeQuery:''/.test(hero), 'the query-stripping rewrite is gone');

console.log('PASS: scene links keep their query on mount and on click; doc links return to the page they were clicked on.');
