'use strict';
/* Every segmented and select control in js/admin/admin.js says what it writes.

   Why this test exists: the toolbar's Radius control showed None / Card / Pill / Panel and
   wrote ArkLayout's RADIUS_TOKENS, ['none', 'card', 'control', 'panel'] -- its third button read
   "Pill" and stored `control`. The labels were a second list typed out next to the values, and
   the two lists said different things; nothing could notice, because each looked right on its
   own (found by tests/browser/full-audit.mjs). Now a control takes a label FUNCTION of the value
   (ctlLabel by default: 'text-muted' -> "Text muted"), so a label cannot point at a neighbour's
   value.

   This walks every ctlSegField/ctlSelectField call in admin.js, evaluates its real option list
   (read from the real content modules) and, through the REAL builder in jsdom, checks:
     - no call passes a list of labels (an array literal where the label function goes);
     - an option list is a list the content modules own (an identifier or a member read), or a
       per-field literal of an SEO kind, never a hand-typed list of tokens;
     - each button/option shows labelOf(value) and writes exactly that value;
     - the module that stores the value KEEPS it (ArkLayout.sanitize for a frame property,
       ArkCanvasTransitions / ArkElementMotion / ArkSEO.cleanField for theirs) -- an offered
       value the store drops is the same lie in the other direction;
     - the labels in one control are distinct.
   Plus the named case: Radius offers "Control" for `control`, and no control anywhere says "Pill". */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const { ADMIN, buildersSource } = require('./lib/admin-source.cjs');

const dom = new JSDOM('<!doctype html><body></body>');
const context = vm.createContext({ document: dom.window.document, window: {} });
for (const file of ['js/content/layout.js', 'js/content/canvas-transitions.js', 'js/content/element-motion.js', 'js/content/components.js', 'js/content/site-pages.js', 'js/content/seo.js']) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context);
}
/* the option lists admin.js names: every `const CMS_... = <read>;` it defines */
const consts = ADMIN.match(/^  const CMS_[A-Z0-9_]+ = [^;\n]+;$/gm) || [];
assert(consts.length > 10, 'admin.js still names its option lists as CMS_* constants');
for (const line of consts) {
  assert(!/= \[/.test(line), 'an option list is read from its module, not typed out: ' + line.trim());
  vm.runInContext(line.trim().replace(/^const /, 'var '), context);
}
vm.runInContext(buildersSource() + '\nthis.ctlSegField = ctlSegField; this.ctlSelectField = ctlSelectField; this.ctlLabel = ctlLabel;', context);

/* each call's argument source, split at top-level commas */
function calls(name) {
  const out = [];
  const re = new RegExp('(?<!function )\\b' + name + '\\(', 'g');
  let m;
  while ((m = re.exec(ADMIN))) {
    let depth = 0, i = m.index + m[0].length - 1, args = [], from = i + 1, quote = '';
    for (; i < ADMIN.length; i++) {
      const c = ADMIN[i];
      if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; continue; }
      if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
      if ('([{'.includes(c)) depth++;
      else if (')]}'.includes(c)) { depth--; if (depth === 0) { args.push(ADMIN.slice(from, i).trim()); break; } }
      else if (c === ',' && depth === 1) { args.push(ADMIN.slice(from, i).trim()); from = i + 1; }
    }
    out.push({ name, args, line: ADMIN.slice(0, m.index).split('\n').length });
  }
  return out;
}
const all = [...calls('ctlSegField'), ...calls('ctlSelectField')];
assert(all.length >= 20, 'found the segmented/select controls (' + all.length + ')');

/* which store keeps a value written under `key`, judged by where the option list comes from */
const L = context.ArkLayout, CT = context.ArkCanvasTransitions, EM = context.ArkElementMotion, SEO = context.ArkSEO;
function kept(options, key, value, f) {
  if (/^CMS_CANVAS_/.test(options)) return CT.sanitize({ [key]: value })[key] === value;
  if (/^CMS_ELEMENT_MOTION_/.test(options)) return EM.sanitize({ routes: { '/': { k: { [key]: value } } } }).routes['/'].k[key] === value;
  if (f) return SEO.cleanField(f, value) === value || (value === '' && !f.fallback);
  if (/^ArkSEO\.BOT_POLICIES$/.test(options)) return SEO.cleanField({ kind: 'policy' }, { GPTBot: value }).GPTBot === (value === SEO.BOT_POLICIES[0] ? undefined : value);
  if (/^CMS_/.test(options)) { const frame = (L.sanitize({ routes: { '/': { k: { desktop: { [key]: value } } } } }).routes['/'] || { k: { desktop: {} } }).k.desktop; return frame[key] === value; }
  return null;
}
/* the SEO field definitions a call written in terms of `f` stands for */
const seoFields = [...SEO.OVERRIDE_FIELDS, ...SEO.SITE_FIELDS];
let checked = 0;
for (const call of all) {
  const [, , keyArg, optionsArg, labelArg] = call.args;
  const where = `${call.name} at js/admin/admin.js:${call.line} (${call.args[1]})`;
  assert(!labelArg || !labelArg.startsWith('['), `${where} passes a list of labels -- give a function of the value instead`);
  const literal = optionsArg.startsWith('[');
  const perField = /\bf\./.test(optionsArg) || /\bf\./.test(keyArg);
  const instances = perField
    ? seoFields.filter((f) => (literal ? (optionsArg === '[false, true]' ? f.kind === 'flag' : f.kind === 'onoff') : f.kind === 'enum'))
    : [null];
  if (literal) assert(perField, `${where} hand-types its option list ${optionsArg} -- read it from the module that validates it`);
  if (/^(group|cmsMasterProps|CMS_BLOCK_RESOLVERS|contentChoices)\b/.test(optionsArg) || /group\.states/.test(optionsArg)) continue; /* data-driven lists (states, blocks; the content forms' routes, reference docs and shape pages, values and labels from one list): covered by their own tests (tests/admin-content-panels.cjs for contentChoices) */
  for (const f of instances) {
    const scope = vm.createContext(Object.assign(Object.create(null), context, { f }));
    vm.runInContext('this.__opts = ' + optionsArg + '; this.__labelOf = ' + (labelArg || 'undefined') + ';', scope);
    const options = Array.from(scope.__opts), labelOf = scope.__labelOf || context.ctlLabel;
    const key = keyArg.startsWith("'") ? keyArg.slice(1, -1) : f ? f.key : 'policy';
    let wrote = [];
    const ctx = { get: () => undefined, set: (_k, v) => wrote.push(v) };
    const row = call.name === 'ctlSegField' ? context.ctlSegField(ctx, 'x', key, options, scope.__labelOf) : context.ctlSelectField(ctx, 'x', key, options, scope.__labelOf);
    const shown = call.name === 'ctlSegField' ? [...row.querySelectorAll('button')] : [...row.querySelectorAll('option')];
    assert.equal(shown.length, options.length, `${where}: one choice per value`);
    options.forEach((value, i) => {
      assert.equal(shown[i].textContent, labelOf(value), `${where}: the choice for ${JSON.stringify(value)} shows its own label`);
      wrote = [];
      if (call.name === 'ctlSegField') shown[i].click();
      else { const s = row.querySelector('select'); s.value = String(value); s.dispatchEvent(new dom.window.Event('change')); }
      if (call.name === 'ctlSegField') assert.deepEqual(wrote, [value], `${where}: "${shown[i].textContent}" writes ${JSON.stringify(value)}`);
      else assert.deepEqual(wrote, [String(value)], `${where}: "${shown[i].textContent}" writes ${JSON.stringify(value)}`);
      const keeps = kept(optionsArg, key, value, f);
      if (keeps !== null) assert(keeps, `${where}: offers ${JSON.stringify(value)}, which its store does not keep for ${key}`);
    });
    assert.equal(new Set(shown.map((b) => b.textContent)).size, shown.length, `${where}: labels are distinct`);
    checked++;
  }
}
assert(checked >= 20, 'walked the controls (' + checked + ')');

/* the named defect */
const radius = all.find((c) => c.args[2] === "'radius'");
assert(radius && radius.args[3] === 'CMS_RADIUS_TOKENS' && !radius.args[4], 'Radius offers ArkLayout.RADIUS_TOKENS with derived labels');
const row = context.ctlSegField({ get: () => '', set() {} }, 'Radius', 'radius', context.CMS_RADIUS_TOKENS);
assert.deepEqual([...row.querySelectorAll('button')].map((b) => b.textContent), Array.from(L.RADIUS_TOKENS, context.ctlLabel));
assert(!/'Pill'/.test(ADMIN), 'no control says "Pill": there is no pill radius token');
console.log(`PASS: ${checked} segmented/select controls show the label of the value they write, and offer only values their store keeps.`);
