'use strict';
/* Regression: deleting the article (or page) the preview was showing logged "[ark] page failed
   to load: article/<slug> TypeError: Cannot read properties of undefined (reading 'title')".
   The delete re-rendered the forms -- and touch() posted the drafts to the preview -- BEFORE
   the preview was re-pointed at another route, so the page still on screen received a site
   that no longer held it and remounted itself from nothing. Seen only in a real browser
   (tests/browser/full-audit.mjs, "articles: create and delete").
   It was written against Content mode's own preview frame (#frame, js/admin/preview.js). That
   frame is gone (one workspace, 2026-10-18): every draft now reaches the one canvas through
   js/admin/bridge.js, so the same guarantee is asserted there -- the drafts are posted only
   while the canvas is on the route it shows; the new route's load (or, for a fragment-only
   navigation, its ready) posts them.
   Runs the real js/admin/bridge.js in a vm with a stand-in editor namespace. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const posted = [];
const listeners = {};
const cmsPreview = {
  src: '', attrs: {}, contentWindow: { postMessage: (msg) => posted.push(msg) },
  getAttribute(name) { return name === 'src' ? this.src || null : this.attrs[name]; },
  addEventListener(type, fn) { (listeners['frame:' + type] = listeners['frame:' + type] || []).push(fn); },
};
const el = () => ({ hidden: false });
const nodes = { cmsPreview, selToolbar: el(), selToolbarPop: el() };
const state = { cmsConnected: true, articlesReady: true, cmsSourceSite: null, cmsCurrentRoute: '/learnings/gone', cmsPreviewRoute: '',
  cmsRoutes: [], assetIds: [], versionPreviewSite: null, cmsExactSelections: [], cmsInsertPoints: [], lens: 'content', live: false };
let drafts = { articles: ['gone', 'kept'] };
const A = { state, $: (id) => nodes[id], toast() {}, anyDirty: () => false, saveEverything() {},
  siteFromState: () => JSON.parse(JSON.stringify(drafts)), studioRoutes: () => drafts.articles.map((slug) => ({ path: '/learnings/' + slug })).concat([{ path: '/' }]),
  provide(names) { Object.assign(A, names); },
  later(name) { return function () { if (typeof A[name] === 'function') return A[name].apply(this, arguments); }; } };
const context = { window: { ArkAdmin: A, location: { origin: 'http://x' }, addEventListener(type, fn) { (listeners['window:' + type] = listeners['window:' + type] || []).push(fn); } },
  document: { addEventListener() {} }, requestAnimationFrame: () => 0, setTimeout, clearTimeout, console, JSON, Object, Set, Array };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/admin/bridge.js', 'utf8'), context);
A.openRoute = (path) => { state.cmsCurrentRoute = path; };
const load = () => listeners['frame:load'].forEach((fn) => fn());
const states = () => posted.filter((m) => m.type === 'defxn-cms-preview-state');

/* the canvas is on /learnings/gone */
A.syncCmsPreview(true);
assert(/#\/learnings\/gone$/.test(cmsPreview.src), 'the canvas shows the route it was pointed at');
state.cmsSourceSite = A.siteFromState();
load();
assert.equal(states().length, 1, 'its load sends it the drafts');

/* the article is deleted: the drafts lose it and the canvas moves on, but the iframe has not
   navigated yet when the forms' touch() asks for the drafts to be sent */
drafts = { articles: ['kept'] };
state.cmsCurrentRoute = '/learnings/kept';
A.reloadPreview();
assert.equal(states().length, 1, 'the page being left (here: deleted) is not sent a site without it');

/* the canvas navigates to the new route; its load sends the drafts */
A.syncCmsPreview();
assert(/#\/learnings\/kept$/.test(cmsPreview.src), 'the canvas is pointed at the new route');
A.postCmsPreviewState();
assert.equal(states().length, 1, 'nothing is sent while the iframe is navigating');
load();
assert.equal(states().length, 2, 'once the canvas shows the new route, the drafts reach it');
assert.deepEqual(states()[1].site.articles, ['kept'], '... the drafts as they are now');
console.log('PASS: the canvas is only sent drafts for the route it is showing.');
