'use strict';
/* THE EDITOR STAYS ONE FILE PER CONCERN.
   Why this file exists: js/admin/admin.js grew to 4,633 lines and 222 functions -- content
   editors, the Studio canvas, the toolbar, header, SEO, design check, Library, save, version
   glue and the preview protocol in one closure -- and the owner called the architecture
   chaotic. It was split (2026-10-18) into modules under js/admin/ (js/admin/core.js states the
   contract). Nothing stopped the monolith from regrowing in whichever file was handiest, and
   nothing stopped a module from importing a name nobody provides -- a mistake that only shows
   when that code path runs. So, statically:
     1. no js/admin/*.js file passes MAX_LINES (auth.js excepted: a generated bundle of
        scripts/auth-entry.js, not hand-written);
     2. every editor module opens with its header comment: its own path, what it Owns, and what
        it Must not do;
     3. every editor module is an IIFE that joins window.ArkAdmin, and core.js is the only one
        that creates it;
     4. no name is provided by two modules (core.js's A.provide refuses that at load as well);
     5. every import resolves to a name some module provides, and a direct import (`x = A.x`,
        read while the file loads) comes from a module loaded EARLIER -- a later one is only
        reachable through A.later('x'). A direct import of a later module's name is undefined
        at load: the code would run until the first call and then throw.
   Which files are editor modules is derived (tests/lib/admin-source.cjs), never listed here. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { EDITOR_FILES, SOURCES } = require('./lib/admin-source.cjs');

const MAX_LINES = 900;
const GENERATED = new Set(['js/admin/auth.js']);

/* 1. size, over every hand-written js/admin/*.js (vendor/ holds third-party copies) */
const all = fs.readdirSync('js/admin').filter((f) => f.endsWith('.js')).map((f) => 'js/admin/' + f).filter((rel) => !GENERATED.has(rel));
for (const rel of all) {
  const lines = fs.readFileSync(rel, 'utf8').split('\n').length;
  assert(lines <= MAX_LINES, `${rel} is ${lines} lines (limit ${MAX_LINES}). Split it by concern into another js/admin/ module instead of growing it -- js/admin/core.js states the module contract.`);
}
assert(EDITOR_FILES.length >= 20, 'the editor modules are found (tests/lib/admin-source.cjs derives them from admin-app.html)');
assert.equal(EDITOR_FILES[0], 'js/admin/core.js', 'core.js loads first: it creates the namespace every other module joins');
assert.equal(EDITOR_FILES[EDITOR_FILES.length - 1], 'js/admin/admin.js', 'admin.js loads last: it starts the editor once every module has provided its names');

const provided = new Map(); /* name -> module index */
const modules = SOURCES.map(({ rel, text }, index) => {
  /* 2. the header comment */
  const header = /^\/\* =+\n([\s\S]*?)\n\s*=+ \*\//.exec(text);
  assert(header, `${rel} opens with its header comment`);
  assert(header[1].includes(rel), `${rel}'s header names its own path`);
  assert(/Owns:|Edits /.test(header[1]) && /Must not/.test(header[1]), `${rel}'s header says what it owns and what it must not do`);
  /* 3. the wrapper */
  const body = text.slice(header[0].length);
  assert(/^\s*\(function \(\) \{\n  'use strict';/.test(body) && /\}\)\(\);\s*$/.test(body), `${rel} is one strict-mode IIFE`);
  if (index === 0) assert(/var A = window\.ArkAdmin = \{/.test(text), 'core.js creates the namespace');
  else {
    assert(/\n  var A = window\.ArkAdmin; if \(!A\) return;/.test(text), `${rel} joins the namespace (and stops when core.js did not start the editor)`);
    assert(!/window\.ArkAdmin\s*=(?!=)/.test(text), `${rel} does not create or replace the namespace`);
  }
  /* 4. what it provides */
  const provides = [...text.matchAll(/\n  A\.provide\(\{([\s\S]*?)\}\);/g)].flatMap((m) => [...m[1].matchAll(/(\w+):/g)].map((n) => n[1]));
  for (const name of provides) {
    assert(!provided.has(name), `${name} is provided by both ${provided.has(name) ? SOURCES[provided.get(name)].rel : ''} and ${rel}: keep one definition and import it`);
    provided.set(name, index);
  }
  const direct = [...text.matchAll(/(?:var |, *\n? *)(\w+) = A\.(\w+)(?=[,;])/g)].map((m) => ({ local: m[1], name: m[2] }));
  const later = [...text.matchAll(/A\.later\('(\w+)'\)/g)].map((m) => m[1]);
  return { rel, index, direct, later };
});
/* 5. every import resolves, in an order that works at load */
for (const m of modules) {
  for (const { local, name } of m.direct) {
    assert.equal(local, name, `${m.rel} imports A.${name} under its own name`);
    assert(provided.has(name), `${m.rel} imports ${name}, which no editor module provides`);
    assert(provided.get(name) < m.index, `${m.rel} reads A.${name} while it loads, but ${SOURCES[provided.get(name)].rel} (which provides it) loads later: import it with A.later('${name}')`);
  }
  for (const name of m.later) assert(provided.has(name), `${m.rel} imports ${name} with A.later(), but no editor module provides it -- the first call would throw`);
}
console.log(`PASS: ${all.length} js/admin files are at most ${MAX_LINES} lines; ${EDITOR_FILES.length} editor modules each carry their header, join one namespace, provide distinct names, and import only names that exist, in an order that works at load.`);
