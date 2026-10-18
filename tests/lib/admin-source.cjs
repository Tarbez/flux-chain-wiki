'use strict';
/* The shared builders a jsdom test of an admin.js panel needs, cut from the REAL js/admin/admin.js
   by name -- refuse() and the ctl*Field builders every panel now draws its rows with. Several
   tests run one panel's code in a vm context; each used to stub what it needed by hand, so a
   panel that moved onto a shared builder broke every one of those stubs at once. One cutter,
   here: a test asks for the functions by name and gets their exact source.
   Not a test itself (scripts/run-tests.mjs only runs tests/*.cjs|mjs at the top level). */
const fs = require('node:fs');
const path = require('node:path');

const ADMIN = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'admin', 'admin.js'), 'utf8');

/* `function <name>(` (or `async function`) at the module's own indentation, through its balanced closing brace */
function functionSource(name, source = ADMIN) {
  const m = new RegExp('\\n  (?:async )?function ' + name + '\\(').exec(source);
  if (!m) throw new Error('js/admin/admin.js no longer defines function ' + name + '()');
  const start = m.index;
  let depth = 0, i = source.indexOf('{', start);
  for (; i < source.length; i++) { if (source[i] === '{') depth++; else if (source[i] === '}' && --depth === 0) break; }
  return source.slice(start + 1, i + 1);
}

/* the row builders and refuse(), ready to run in a vm context that has `document` */
const BUILDERS = ['refuse', 'ctlLabel', 'ctlField', 'ctlSegField', 'ctlSelectField', 'ctlSwatchField'];
function buildersSource(names = BUILDERS) { return names.map((name) => functionSource(name)).join('\n'); }

module.exports = { ADMIN, functionSource, buildersSource, BUILDERS };
