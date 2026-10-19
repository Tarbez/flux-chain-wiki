'use strict';
/* The editor's source as the tests read it, and the shared builders a jsdom test of one panel
   needs, cut from it by name -- refuse() and the ctl*Field builders every panel draws its rows
   with. Several tests run one panel's code in a vm context; each used to stub what it needed by
   hand, so a panel that moved onto a shared builder broke every one of those stubs at once. One
   cutter, here: a test asks for the functions by name and gets their exact source.

   The editor was one file, js/admin/admin.js, until it was split into one file per concern
   (2026-10-18; js/admin/core.js states the module contract). ADMIN is now every editor module,
   in the order admin-app.html loads them, joined -- so "the editor defines X" and "the editor
   never contains Y" are asked of the whole editor, never of one file that X or Y could simply
   have moved out of. Which files are editor modules is DERIVED, not listed: the js/admin/
   scripts admin-app.html loads that join the window.ArkAdmin namespace. A function is still
   cut from inside one module (each is a contiguous block of the original order).
   Not a test itself (scripts/run-tests.mjs only runs tests/*.cjs|mjs at the top level). */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const APP = fs.readFileSync(path.join(ROOT, 'admin-app.html'), 'utf8');

/* every js/admin/ script admin-app.html loads, in load order, that joins the editor's namespace */
const EDITOR_FILES = [...APP.matchAll(/<script src="(js\/admin\/[^"]+\.js)"/g)].map((m) => m[1])
  .filter((rel) => /\bwindow\.ArkAdmin\b/.test(fs.readFileSync(path.join(ROOT, rel), 'utf8')));
if (!EDITOR_FILES.includes('js/admin/admin.js') || !EDITOR_FILES.includes('js/admin/core.js')) throw new Error('admin-app.html no longer loads the editor modules js/admin/core.js ... js/admin/admin.js');

const SOURCES = EDITOR_FILES.map((rel) => ({ rel, text: fs.readFileSync(path.join(ROOT, rel), 'utf8') }));
const SEPARATOR = '\n';
const ADMIN = SOURCES.map((s) => s.text).join(SEPARATOR);

/* "js/admin/<file>.js:<line>" for an offset into ADMIN -- what a failure message should name */
function locate(offset) {
  let at = 0;
  for (const s of SOURCES) {
    if (offset < at + s.text.length) return s.rel + ':' + s.text.slice(0, offset - at).split('\n').length;
    at += s.text.length + SEPARATOR.length;
  }
  return 'past the end of the editor source';
}

/* `function <name>(` (or `async function`) at a module's own indentation, through its balanced closing brace */
function functionSource(name, source = ADMIN) {
  const m = new RegExp('\\n  (?:async )?function ' + name + '\\(').exec(source);
  if (!m) throw new Error('the editor (js/admin/*.js, ' + EDITOR_FILES.length + ' modules) no longer defines function ' + name + '()');
  const start = m.index;
  let depth = 0, i = source.indexOf('{', start);
  for (; i < source.length; i++) { if (source[i] === '{') depth++; else if (source[i] === '}' && --depth === 0) break; }
  return source.slice(start + 1, i + 1);
}

/* the row builders and refuse(), ready to run in a vm context that has `document` */
const BUILDERS = ['refuse', 'ctlLabel', 'ctlField', 'ctlSegField', 'ctlSelectField', 'ctlSwatchField'];
function buildersSource(names = BUILDERS) { return names.map((name) => functionSource(name)).join('\n'); }
/* the Ark behaviour primitives on the light-DOM host (js/admin/ark-host.js): each reads only `h`,
   window.ArkKit (absent: the click fallback) and the two helpers listed first */
const ARK_HOST = ['fallbackId', 'arkHost', 'arkTabs', 'arkDisclosure', 'arkSegGroup', 'arkAccordion'];
function arkHostSource(names = ARK_HOST) { return names.map((name) => functionSource(name)).join('\n'); }

module.exports = { ADMIN, EDITOR_FILES, SOURCES, locate, functionSource, buildersSource, BUILDERS, arkHostSource, ARK_HOST };
