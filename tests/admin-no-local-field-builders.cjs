'use strict';
/* No panel in js/admin/admin.js builds its own field row: every label + control row comes from
   the shared ctlField / ctlSegField / ctlSelectField / ctlSwatchField builders.

   Why this test exists: the builders were consolidated once (tests/admin-studio.cjs, Step 4)
   from three copy-pasted closures -- and a FOURTH copy survived in renderLibrary's definition
   form (`const field = (label, value, onChange) => { ...row... }`), with the New block form, a
   component instance's override fields and the state group's Default select still hand-building
   the same row beside it (found by tests/browser/full-audit.mjs). A hand-built row misses
   whatever the builders learn -- the derived labels of tests/admin-control-labels.cjs, a name
   for assistive technology -- and it looks right, so nobody notices. The row's shape is the
   signature: `<row>.append(<label>, <input|select|textarea>, document.createElement('span'))`.
   It may appear only inside the builders themselves. */
const assert = require('node:assert/strict');
const { ADMIN, functionSource, BUILDERS } = require('./lib/admin-source.cjs');

/* admin.js with the builders' own bodies blanked out */
let rest = ADMIN;
for (const name of BUILDERS) rest = rest.replace(functionSource(name), '/* ' + name + ' */');

const ROW = /(\w+)\.append\(\s*(\w+)\s*,\s*(\w+)\s*,\s*document\.createElement\('span'\)\s*\)/g;
const offenders = [];
for (const m of rest.matchAll(ROW)) {
  const control = m[3];
  /* what the middle piece is: a hand-made input/select/textarea makes this a field row */
  const made = new RegExp('\\b(?:const|let|var)\\s+' + control + "\\s*=\\s*document\\.createElement\\('(input|select|textarea)'\\)").exec(rest);
  if (made) offenders.push(`${m[0]} (its ${control} is a hand-made <${made[1]}>), at js/admin/admin.js:${rest.slice(0, m.index).split('\n').length} of the builder-stripped source`);
}
assert.deepEqual(offenders, [], 'field rows built by hand instead of with the shared ctl*Field builders:\n  ' + offenders.join('\n  '));

/* the closure shapes that were copied, under any name */
for (const shape of [/const \w+ = \((?:label|l)\b[^)]*\) => \{\s*const \w+ = document\.createElement\('div'\); \w+\.className = 'row'/, /function \w+\([^)]*\) \{\s*const \w+ = document\.createElement\('div'\); \w+\.className = 'row'/]) {
  const m = shape.exec(rest);
  assert(!m, 'a local field-builder closure is back: ' + (m && m[0]));
}
/* and the forms the audit named read through the builders */
const library = functionSource('renderLibrary');
assert(/ctlField\(labelCtx, 'label', 'label'/.test(library) && /ctlField\(propsCtx, prop, prop/.test(library), "renderLibrary's definition form uses ctlField");
assert(/ctlSelectField\(typeCtx, 'Block type'/.test(library) && /ctlField\(freshPropsCtx, prop, prop, \{ type: 'text', data: \{ prop \} \}\)/.test(library), "renderLibrary's New block form uses ctlSelectField/ctlField");
console.log('PASS: every field row in admin.js comes from the shared ctl*Field builders; no local field-builder closure is left.');
