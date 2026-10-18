'use strict';
/* Regression: a new article could never be saved from the CMS. LearningContent.problems()
   requires every article body to carry evidenceHref as `doc:docs/...md`, and the only way
   to set one is the link picker's "Reference doc" list -- docOptions(), which reads
   ArkUI.referenceDocs. admin-app.html never loaded js/ark/reference-docs.js (the file that
   defines it), so that list was always empty: the required field had no possible value, and
   an existing article's doc link showed as a blank select. Found by clicking it
   (tests/browser/full-audit.mjs, "articles: create and delete"); no logic test reads which
   scripts the editor page actually loads.
   Derived, not listed: every ArkUI.<name> that js/admin/admin.js READS must be assigned by a
   script admin-app.html loads -- so the next missing registry fails here too. */
const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync('admin-app.html', 'utf8');
const admin = require('./lib/admin-source.cjs').ADMIN;
const loaded = [...app.matchAll(/<script src="([^"?]+)/g)].map((m) => m[1]);
const sources = loaded.filter((src) => fs.existsSync(src)).map((src) => ({ src, text: fs.readFileSync(src, 'utf8') }));

const reads = [...new Set([...admin.matchAll(/ArkUI\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]))];
assert(reads.includes('referenceDocs') && reads.includes('pageCatalog'), 'admin.js still reads the reference-doc list and the page catalog');
for (const name of reads) {
  const definer = sources.find(({ text }) => new RegExp('ArkUI\\.' + name.replace(/\$/g, '\\$') + '\\s*=[^=]').test(text));
  assert(definer, `admin.js reads ArkUI.${name}, but no script admin-app.html loads assigns it`);
}
/* reference-docs.js assigns onto ArkUI, so it must come after the script that first uses ArkUI */
const order = (src) => loaded.indexOf(src);
assert(order('js/ark/reference-docs.js') > order('js/pages/catalog.js'), 'reference-docs.js loads after catalog.js (it extends the ArkUI object that is already in use)');
assert(/"docs\/[^"]+\.md"/.test(fs.readFileSync('js/ark/reference-docs.js', 'utf8')), 'the reference-doc list is not empty');
console.log('PASS: every ArkUI registry the editor reads is loaded by admin-app.html, including the reference-doc list.');
