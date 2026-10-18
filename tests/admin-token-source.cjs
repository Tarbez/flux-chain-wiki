'use strict';
/* js/admin/admin.js must READ the design tokens and layout enums from js/content/layout.js
   (ArkLayout.TEXT_TOKENS, FILL_TOKENS, ...), never keep its own copy.

   Why this test exists: admin.js carried hand-copied CMS_TEXT_TOKENS/CMS_FILL_TOKENS/... arrays
   "because this document has no <script src>" -- true only of the deleted admin-studio.html.
   admin-app.html loads layout.js before admin.js, so the copies were just a second list to
   keep in sync with the one cleanFrame() validates against; when they drift, the toolbar
   offers a swatch the store silently drops (or hides one it accepts). One copy, read. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const admin = fs.readFileSync('js/admin/admin.js', 'utf8');
const app = fs.readFileSync('admin-app.html', 'utf8');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync('js/content/layout.js', 'utf8') + ';this.ArkLayout = ArkLayout;', context);
const L = context.ArkLayout;

const READS = {
  CMS_TEXT_TOKENS: 'TEXT_TOKENS', CMS_FILL_TOKENS: 'FILL_TOKENS', CMS_BORDER_TOKENS: 'BORDER_TOKENS', CMS_FONT_TOKENS: 'FONT_TOKENS',
  CMS_TYPE_SIZE_TOKENS: 'TYPE_SIZE_TOKENS', CMS_RADIUS_TOKENS: 'RADIUS_TOKENS', CMS_DISPLAY_TOKENS: 'DISPLAY_TOKENS',
  CMS_ALIGN_TOKENS: 'ALIGN_ITEMS_TOKENS', CMS_JUSTIFY_TOKENS: 'JUSTIFY_TOKENS', CMS_LINE_HEIGHT_TOKENS: 'LINE_HEIGHT_TOKENS',
};
for (const [name, source] of Object.entries(READS)) {
  assert.ok(Array.isArray(L[source]) || (L[source] && typeof L[source].length === 'number'), `ArkLayout exposes ${source}`);
  const defs = admin.match(new RegExp('\\b(?:const|let|var)\\s+' + name + '\\s*=\\s*([^;\\n]+)', 'g')) || [];
  assert.equal(defs.length, 1, `${name} is defined exactly once in admin.js`);
  assert.ok(defs[0].endsWith('= ArkLayout.' + source), `${name} reads ArkLayout.${source}, not a copy: ${defs[0]}`);
}
// No literal copy of either token list anywhere in admin.js, under any name.
for (const source of ['TEXT_TOKENS', 'FILL_TOKENS']) {
  const literal = '[' + Array.from(L[source], (t) => `'${t}'`).join(', ') + ']';
  assert.ok(!admin.includes(literal), `admin.js does not spell out ArkLayout.${source} as a literal (${literal.slice(0, 40)}...)`);
}
// The read only works because layout.js runs first.
assert.ok(app.indexOf('src="js/content/layout.js"') >= 0 && app.indexOf('src="js/content/layout.js"') < app.indexOf('src="js/admin/admin.js"'), 'admin-app.html loads js/content/layout.js before js/admin/admin.js');
console.log('PASS: admin.js reads every design-token and layout enum from ArkLayout and keeps no copy of its own.');
