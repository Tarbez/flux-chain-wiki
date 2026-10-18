'use strict';
/* Regression: deleting the article (or page, image, encrypted item) that the Content preview
   was showing logged "[ark] page failed to load: article/<slug> TypeError: Cannot read
   properties of undefined (reading 'title')". deleteArticle() re-renders the editor -- and
   touch() posts the drafts to the preview -- BEFORE reloadPreview() re-points the frame, so
   the page still on screen received a site that no longer held it and remounted itself from
   nothing. Seen only in a real browser (tests/browser/full-audit.mjs, "articles: create and
   delete"). The same ordering also made every select() remount the page being LEFT once,
   for nothing. Now the drafts are posted only while the editor is on the route the frame
   shows; the reload's own load handler posts them for the new route.
   Runs the real reloadPreview()/notifyPreviewState() from js/admin/admin.js. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const admin = fs.readFileSync('js/admin/admin.js', 'utf8');
function slice(from, to) {
  const start = admin.indexOf(from), end = admin.indexOf(to, start);
  assert(start >= 0 && end > start, 'js/admin/admin.js still has ' + from.trim());
  return admin.slice(start, end);
}
const code = slice('  function reloadPreview() {', '\n  /* Unsaved image edits') + '\n' + slice('  function notifyPreviewState() {', '  function themeDirty()');

const posted = [];
const el = () => ({ hidden: false, textContent: '', href: '', src: '' });
const nodes = { frame: Object.assign(el(), { contentWindow: { postMessage: (msg) => posted.push(msg) } }), previewPath: el(), open: el(), previewNote: el() };
const context = {
  $: (id) => nodes[id], window: { location: { origin: 'http://x' } }, Date,
  state: { kind: 'article', aCurrent: 'kept', aSaved: { kept: '{}', gone: '{}' } },
  articlesReady: true, siteFromState: () => ({ articles: ['kept'] }),
  previewRoute: () => '/learnings/' + context.state.aCurrent, previewUrl: () => 'index.html',
};
vm.createContext(context);
vm.runInContext(code + '\nthis.reloadPreview = reloadPreview; this.notifyPreviewState = notifyPreviewState;', context);

context.state.aCurrent = 'gone';
context.reloadPreview();                         /* the frame shows /learnings/gone */
context.notifyPreviewState();
assert.equal(posted.length, 1, 'an edit on the route the frame shows reaches the preview');

context.state.aCurrent = 'kept';                 /* deleteArticle: the selection moved on ... */
context.notifyPreviewState();                    /* ... and renderEditor()'s touch() runs first */
assert.equal(posted.length, 1, 'the page being left (here: deleted) is not sent a site without it');

context.reloadPreview();                         /* the frame is re-pointed at /learnings/kept */
assert(/#\/learnings\/kept$/.test(nodes.frame.src), 'the preview reloads on the new route');
context.notifyPreviewState();                    /* what the frame's load handler does */
assert.equal(posted.length, 2, 'once the frame shows the new route, the drafts reach it');
console.log('PASS: the Content preview is only sent drafts for the route it is showing.');
