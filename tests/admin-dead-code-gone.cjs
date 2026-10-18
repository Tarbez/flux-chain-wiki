'use strict';
/* Dead state and stale pointers the full audit (tests/browser/full-audit.mjs) found in
   js/admin/admin.js, kept from coming back:

   - cmsComponentAnchors: assigned from three preview messages, read nowhere. The preview
     (js/main.js) computed ArkComponents.anchorsIn() for every ready/components/states message
     just to fill it. Insertion uses cmsInsertPoints; nothing else wanted the anchor list.
   - GROUP_KEYS and accordion()'s "N set at this size" count: the count read cell(id, PI[k]),
     a dense-canvas node table deleted with the dense engine -- neither cell nor PI is defined,
     and every caller left (the SEO pane) passed id -1, so the branch could never run. Had a
     caller passed a real id it would have thrown. (accordion() itself is gone since the SEO
     pane moved into popovers.)
   - placeSelToolbar()'s comments still described its math as mirroring placeOverlays() and
     #selTag, both deleted with the dense canvas: a reader following them finds nothing. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { ADMIN, functionSource } = require('./lib/admin-source.cjs');

const main = fs.readFileSync('js/main.js', 'utf8');
for (const file of fs.readdirSync('js', { recursive: true }).filter((f) => /\.m?js$/.test(f))) {
  assert(!fs.readFileSync('js/' + file, 'utf8').includes('cmsComponentAnchors'), `js/${file} names cmsComponentAnchors, which nothing reads`);
}
const messages = main.match(/postMessage\(\{ type: 'defxn-cms-preview-[^]*?\}, location\.origin\)/g) || [];
assert(messages.length > 5, 'found the preview\'s messages to the editor');
for (const m of messages) assert(!/\banchors:/.test(m), 'the preview sends an `anchors` list nobody reads: ' + m.slice(0, 80));

assert(!/\bGROUP_KEYS\b/.test(ADMIN), 'GROUP_KEYS is gone with the per-group count it fed');
assert(!/\bcell\(|\bPI\[/.test(ADMIN.replace(/\/\*[\s\S]*?\*\//g, '')), 'no code calls the deleted dense-canvas cell()/PI table');
/* accordion() itself went when the SEO pane (its last user) moved into popovers; if it comes
   back, it comes back without the dense node id */
if (/\n  function accordion\(/.test(ADMIN)) {
  assert.match(functionSource('accordion'), /^function accordion\(pane, key, title, icon\) \{/, 'accordion() takes no dense node id');
  for (const call of ADMIN.match(/\baccordion\(pane, [^;]*;/g) || []) assert(!/,\s*-1\)/.test(call), 'no caller passes the dead id argument: ' + call);
}

const at = ADMIN.indexOf('  function placeSelToolbar(');
const comment = ADMIN.slice(ADMIN.lastIndexOf('/*', ADMIN.indexOf('function rectOfSelectionRect(')), at);
for (const text of [comment, functionSource('placeSelToolbar')]) {
  assert(!/placeOverlays|#selTag/.test(text), 'placeSelToolbar() and its comment no longer point at the deleted placeOverlays()/#selTag');
}
console.log('PASS: cmsComponentAnchors, GROUP_KEYS and the dead accordion count are gone; placeSelToolbar() points at nothing deleted.');
