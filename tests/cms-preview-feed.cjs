'use strict';
/* The editor's coalesced site feed to the canvas (js/admin/bridge.js: notifyPreviewState,
   previewShowsDrafts) never swallows an edit.

   Why this exists: an inline commit tells the bridge "the canvas already shows the drafts"
   (previewShowsDrafts) so the page is not rebuilt under the words just typed. That call used to
   CANCEL the coalesced send waiting in its 180 ms window and mark the drafts as sent -- so a Page
   fields keystroke made a moment before the inline commit never reached the canvas: the sheet
   said one thing and the canvas another until some unrelated edit re-sent the site. A waiting
   send now goes at once (carrying the inline edit too; the canvas re-renders in place), and only
   with nothing waiting are the drafts marked as shown. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const bridge = fs.readFileSync('js/admin/bridge.js', 'utf8');
const from = bridge.indexOf('  const CANVAS_OWNED'), to = bridge.indexOf('  /* The site and routes the canvas will be sent');
assert(from > 0 && to > from, 'js/admin/bridge.js keeps the feed (CANVAS_OWNED .. previewShowsDrafts) together');

function setup() {
  const timers = [], posts = [];
  const drafts = { manifests: [{ id: 'home', fields: { TITLE: { value: 'A' }, EYEBROW: { value: 'E' } } }], layout: { n: 0 } };
  const ctx = {
    state: { cmsConnected: true, articlesReady: true, cmsSourceSite: null, cmsRoutes: [] },
    siteFromState: () => JSON.parse(JSON.stringify(drafts)), studioRoutes: () => [],
    schedule: () => {}, setTimeout: (fn) => { timers.push(fn); return timers.length; }, clearTimeout: (id) => { if (id) timers[id - 1] = null; },
  };
  /* the real postCmsPreviewState records what it sent the same way (sentSignature) */
  ctx.postCmsPreviewState = () => { posts.push(JSON.parse(JSON.stringify(ctx.state.cmsSourceSite))); vm.runInContext('sentSignature = contentSignature(state.cmsSourceSite)', ctx); };
  vm.createContext(ctx);
  vm.runInContext(bridge.slice(from, to).replace(/\bconst CANVAS_OWNED\b/, 'var CANVAS_OWNED').replace(/\blet (sentSignature|feedPending)\b/g, 'var $1'), ctx);
  const run = (code) => vm.runInContext(code, ctx);
  const fire = () => { const due = timers.splice(0).filter(Boolean); due.forEach((fn) => fn()); };
  return { drafts, posts, run, fire };
}

{
  /* the race: a sheet edit waiting in the window, then an inline commit */
  const t = setup();
  t.drafts.manifests[0].fields.EYEBROW.value = 'E (sheet)'; t.run('notifyPreviewState()');
  t.drafts.manifests[0].fields.TITLE.value = 'A, typed inline'; t.run('previewShowsDrafts()');
  assert.equal(t.posts.length, 1, 'the waiting send went at once instead of being cancelled');
  assert.equal(t.posts[0].manifests[0].fields.EYEBROW.value, 'E (sheet)', 'it carries the sheet edit');
  assert.equal(t.posts[0].manifests[0].fields.TITLE.value, 'A, typed inline', 'and the inline one');
  t.fire();
  assert.equal(t.posts.length, 1, 'nothing is sent twice');
}
{
  /* nothing waiting: the inline commit only marks the drafts as shown -- no re-send, no rebuild */
  const t = setup();
  t.drafts.manifests[0].fields.TITLE.value = 'A, typed inline'; t.run('previewShowsDrafts()');
  assert.equal(t.posts.length, 0, 'an inline commit alone re-sends nothing');
  t.run('notifyPreviewState()'); t.fire();
  assert.equal(t.posts.length, 0, 'and a later feed with the same content still sends nothing');
  t.drafts.manifests[0].fields.EYEBROW.value = 'E2'; t.run('notifyPreviewState()'); t.fire();
  assert.equal(t.posts.length, 1, 'a real change after it is sent');
}
{
  /* the editor half of the stale rule: a copy-edit that says the preview dropped a held site is
     never treated as "the canvas shows it" */
  assert(/canvasShows: !event\.data\.stale && /.test(bridge), 'a stale copy-edit makes the editor re-send the site');
  assert(/at\.kind === 'component'\) \{ if \(edit\.stale\) notifyPreviewState\(\);/.test(bridge), 'a stale component edit re-sends too');
}
console.log('PASS: the canvas feed sends a waiting edit instead of swallowing it, and re-sends nothing for an inline commit alone');
