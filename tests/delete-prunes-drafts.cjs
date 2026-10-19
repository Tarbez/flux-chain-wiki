'use strict';
/* A Delete takes the deleted page's (or article's) entries in every other draft with it.

   Why this test exists: after deleting a page, the SEO draft showed as unsaved -- it still held
   that page's override until the next Save, and the saved seo-data.js kept the orphan entry for
   good if nobody saved (found by tests/browser/full-audit.mjs). The same orphaning waited in
   every draft keyed by the page's route: layout frames, groups, labels and alt text, state
   groups, component instances, element animation. Which drafts key by page or route is
   declared ONCE, as byItem/byRoute on js/admin/store.js's draft list, and admin.js's
   forgetDeleted() walks that list -- so this checks three things:
     1. the declaration is complete: every route-taking writer each content module exports, run
        on a route, leaves nothing under that route once ArkAdminStore.forgetItem() prunes it
        (a new route-keyed field the list forgot fails here), while another route keeps its own;
     2. a module function taking (value, route, ...) that this file does not know about fails
        the test until it is exercised here -- a new writer cannot slip past (1);
     3. forgetDeleted() in admin.js: the draft loses the entries, the SAVED copy is written
        without them (through the draft's own save()), an unrelated unsaved edit in the same
        draft stays unsaved, and a route the site still has is not pruned. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { functionSource } = require('./lib/admin-source.cjs');

const context = vm.createContext({ window: {} });
for (const file of ['js/content/layout.js', 'js/content/states.js', 'js/content/components.js', 'js/content/element-motion.js', 'js/content/canvas-transitions.js', 'js/content/site-pages.js', 'js/content/seo.js', 'js/admin/store.js']) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context);
}
const run = (code) => vm.runInContext(code, context);
const Store = run('ArkAdminStore');
const drafts = Object.fromEntries(Store.drafts('single').map((d) => [d.key, d]));

/* ---- 1 + 2: every route-taking writer, on '/gone' and '/kept' ---- */
const WRITERS = {
  'js/content/layout.js': { global: 'ArkLayout', draft: 'layout', start: 'ArkLayout.sanitize({})', calls: {
    set: (r) => `v = ArkLayout.set(v, '${r}', 'k1', 'desktop', { pt: 8 });`,
    setLabel: (r) => `v = ArkLayout.setLabel(v, '${r}', 'k1', 'A label');`,
    setAlt: (r) => `v = ArkLayout.setAlt(v, '${r}', 'k1', 'Alt text');`,
    group: (r) => `v = ArkLayout.group(v, '${r}', 'g1', ['k1', 'k2'], 'Group');`,
  }, readersAndRemovers: ['altFor', 'remove', 'labelFor', 'ungroup', 'entryFor', 'groupsFor'] },
  'js/content/states.js': { global: 'ArkStates', draft: 'states', start: 'ArkStates.sanitize({})', calls: {
    createStateGroup: (r) => `v = ArkStates.createStateGroup(v, '${r}', 'st1', ['k1'], 'self');`,
    addState: (r) => `v = ArkStates.addState(v, '${r}', 'st1', 'Two');`,
    setTrigger: (r) => `v = ArkStates.setTrigger(v, '${r}', 'st1', 'k1');`,
    setCurrent: (r) => `v = ArkStates.setCurrent(v, '${r}', 'st1', 1);`,
    advance: (r) => `v = ArkStates.advance(v, '${r}', 'st1');`,
  }, readersAndRemovers: ['removeState', 'removeGroup', 'scopeOfGroup', 'groupIn', 'groupFor', 'groupIdsOn'] },
  'js/content/components.js': { global: 'ArkComponents', draft: 'components', start: "ArkComponents.createMaster(ArkComponents.sanitize({}), 'm1', 'RBLOCK_TEXT_V1', { heading: 'Hi' }, 'Hello')", calls: {
    insertInstance: (r) => `v = ArkComponents.insertInstance(v, '${r}', 'main', 'i1', 'm1');`,
    placeInstance: (r) => `v = ArkComponents.placeInstance(v, '${r}', 'spot1', 'k1', [], 'i2', 'm1');`,
    setOverride: (r) => `v = ArkComponents.setOverride(v, '${r}', 'main', 'i1', 'heading', 'Over');`,
    detachInstance: (r) => `v = ArkComponents.detachInstance(v, '${r}', 'main', 'i1', 'm2');`,
  }, readersAndRemovers: ['removeInstance', 'scopeHolding', 'instancesAt'] },
  'js/content/element-motion.js': { global: 'ArkElementMotion', draft: 'elementMotion', start: 'ArkElementMotion.sanitize({})', calls: {
    set: (r) => `v = ArkElementMotion.set(v, '${r}', 'k1', { direction: 'left' });`,
  }, readersAndRemovers: ['entryFor', 'remove'] },
};
for (const [file, spec] of Object.entries(WRITERS)) {
  const source = fs.readFileSync(file, 'utf8');
  const routeTaking = [...source.matchAll(/^  function (\w+)\((?:value|whole|draft), route\b/gm)].map((m) => m[1]);
  for (const name of routeTaking) {
    assert(name in spec.calls || spec.readersAndRemovers.includes(name), `${file} has a new function ${name}(value, route, ...): exercise it here, so a route-keyed field it writes is checked against store.js's byRoute`);
  }
  const d = drafts[spec.draft];
  assert(d && d.byRoute, `store.js declares where ${spec.draft} keys entries by route (byRoute)`);
  let program = 'var v = ' + spec.start + ';';
  for (const call of Object.values(spec.calls)) program += call('/gone') + call('/kept');
  const value = JSON.parse(JSON.stringify(run('(function () { ' + program + ' return ' + spec.global + '.sanitize(v); })()')));
  assert(JSON.stringify(value).includes('"/gone"'), `${spec.global}'s writers did write under /gone (the fixture is live)`);
  const pruned = Store.forgetItem(d, value, { key: 'manifests', id: 'gone', routes: ['/gone'] });
  assert.equal(pruned.changed, true);
  assert(!JSON.stringify(pruned.value).includes('"/gone"'), `${spec.draft}: after the delete nothing is left under /gone -- every route-keyed field is in its byRoute: ${JSON.stringify(pruned.value)}`);
  assert.equal(JSON.stringify(pruned.value).split('"/kept"').length, JSON.stringify(value).split('"/kept"').length, `${spec.draft}: a route the site still has keeps every entry`);
  assert(JSON.stringify(value).includes('"/gone"'), 'forgetItem() returns a copy and leaves its input alone');
  /* what the pruned draft is once its module cleans it: a detached copy whose one instance was on
     the deleted route goes too (ArkComponents.sanitize drops an unused detached master) */
  const clean = JSON.stringify(run(spec.global + '.sanitize(' + JSON.stringify(pruned.value) + ')'));
  assert(!clean.includes('"/gone"') && !(spec.draft === 'components' && clean.includes('"m2"') && !JSON.stringify(pruned.value.routes).includes('"m2"')), `${spec.draft}: nothing of the deleted route survives its own sanitize(): ${clean}`);
}
/* SEO keys its overrides by page id and article slug, not by route */
{
  const seo = { site: {}, pages: { gone: { title: 'Gone' }, kept: { title: 'Kept' } }, articles: { 'a-note': { title: 'Note' } } };
  const page = Store.forgetItem(drafts.seo, seo, { key: 'manifests', id: 'gone', routes: ['/gone'] });
  assert.deepEqual(Object.keys(page.value.pages), ['kept'], 'a deleted page loses its SEO override, by id');
  assert.deepEqual(Object.keys(page.value.articles), ['a-note'], 'an article of the same name space is untouched');
  const article = Store.forgetItem(drafts.seo, seo, { key: 'articles', id: 'a-note', routes: ['/learnings/a-note'] });
  assert.deepEqual(Object.keys(article.value.articles), [], 'a deleted article loses its SEO override, by slug');
  assert.equal(Store.forgetItem(drafts.seo, seo, { key: 'assets', id: 'gone', routes: [] }).changed, false, 'an image id is not a page id');
}
assert(!drafts.canvasTransitions.byRoute && !drafts.canvasTransitions.byItem, 'a site-wide draft declares nothing to prune');

/* ---- 3: forgetDeleted() in admin.js, with the real store and fake draft handles ---- */
(async () => {
  const writes = [];
  function handle(key, draft, saved) {
    const h = { value: draft, savedText: JSON.stringify(saved) };
    return { draft: () => h.value, set: (v) => { h.value = v; }, saved: () => h.savedText,
      save: async () => { writes.push({ key, value: JSON.parse(JSON.stringify(h.value)) }); h.savedText = JSON.stringify(h.value); }, h };
  }
  const seo = handle('seo', { site: { name: 'Edited, unsaved' }, pages: { gone: { title: 'Gone' }, kept: { title: 'Kept' } }, articles: {} },
    { site: { name: 'Saved' }, pages: { gone: { title: 'Gone' }, kept: { title: 'Kept' } }, articles: {} });
  const layout = handle('layout', { version: 2, routes: { '/gone': { k1: { desktop: { pt: 8 } } }, '/still': { k1: { desktop: { pt: 4 } } } }, groups: {}, labels: {} },
    { version: 2, routes: { '/gone': { k1: { desktop: { pt: 8 } } }, '/still': { k1: { desktop: { pt: 4 } } } }, groups: {}, labels: {} });
  const states = handle('states', { version: 1, routes: {} }, { version: 1, routes: {} });
  const handles = { seo, layout, states, components: handle('components', { version: 1, masters: {}, routes: {} }, { version: 1, masters: {}, routes: {} }), elementMotion: handle('elementMotion', { version: 1, routes: {} }, { version: 1, routes: {} }) };
  const admin = vm.createContext({
    ArkAdminStore: Store, window: { ArkSEO: 1, ArkLayout: 1, ArkStates: 1, ArkComponents: 1, ArkElementMotion: 1 },
    singleDraftHandle: (key) => handles[key],
    /* '/still' is a route both before and after: only '/gone' went with the page */
    studioRoutes: () => [{ path: '/' }, { path: '/still' }],
  });
  vm.runInContext(functionSource('forgetDeleted') + '\nthis.forgetDeleted = forgetDeleted;', admin);
  const note = await admin.forgetDeleted('manifests', 'gone', ['/', '/gone', '/still']);
  assert.deepEqual(Object.keys(seo.h.value.pages), ['kept'], 'the SEO draft no longer holds the deleted page');
  assert.equal(seo.h.value.site.name, 'Edited, unsaved', 'an unrelated unsaved SEO edit is kept as a draft');
  const seoWrite = writes.find((w) => w.key === 'seo');
  assert(seoWrite, 'the saved seo-data.js is rewritten without the orphan, in the Delete');
  assert.equal(seoWrite.value.site.name, 'Saved', 'and what is written is the SAVED copy pruned -- a Delete never saves an unrelated edit');
  assert.deepEqual(Object.keys(JSON.parse(seo.h.savedText).pages), ['kept']);
  assert.deepEqual(Object.keys(layout.h.value.routes), ['/still'], 'the deleted route\'s layout goes; a route the site still has stays');
  assert.equal(JSON.stringify(layout.h.value), layout.h.savedText, 'a draft with nothing else changed is clean after the Delete -- nothing shows unsaved');
  assert(!writes.some((w) => w.key === 'states'), 'a draft with nothing under the deleted page is not rewritten');
  assert.match(note, /Removed its entries from seo-data\.js, layout-data\.js\./, 'the status line says which files the Delete cleaned');
  console.log('PASS: a Delete prunes the page from every draft store.js says keys by page or route, saved copy included, and leaves nothing unsaved.');
})().catch((error) => { console.error(error); process.exit(1); });
