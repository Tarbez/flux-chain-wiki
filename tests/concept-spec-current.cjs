/* /concept/spec ("Benchmark evidence and limits") states what the evidence registry states.

   Named regression (2026-10-19, docs/ux-audit/pages.md P4): the sheet still said "BENCH-001 has
   no complete public benchmark artifact" and "No current throughput, latency, scale ... is
   verified by the evidence registered here" after docs/evidence/registry.md had verified
   BENCH-006, -007, -009, -012, -013 and -015 and /stats was publishing them. A page that says
   nothing is verified while the registry says otherwise is the same defect as reporting a
   measured result as 0.

   The verified set is DERIVED from the registry's benchmark table, never listed here, so the
   test fails the day the registry verifies a record the sheet does not name. Every BENCH id the
   sheet names must carry the registry's own status for it, and every figure the sheet quotes
   for a record must appear in that record's registry row (no number the registry does not
   support). The evidence standard itself (POINT2-POINT5, the promotion rule) must survive. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// ---- the registry, parsed: benchmark rows are `| BENCH-nnn | claim | status | evidence |` ----
const registry = fs.readFileSync('docs/evidence/registry.md', 'utf8');
const rows = new Map();
for (const line of registry.split('\n')) {
  const m = /^\|\s*(BENCH-\d{3})\s*\|([^|]*)\|([^|]*)\|(.*)\|\s*$/.exec(line);
  if (m) rows.set(m[1], { status: m[3].trim(), row: line });
}
assert(rows.size >= 10, 'the registry benchmark table parsed (' + rows.size + ' rows)');
// "verified" as a word, and not "Unverified".
const isVerified = (status) => /\bverified\b/i.test(status) && !/\bunverified\b/i.test(status);
const verified = [...rows].filter(([, r]) => isVerified(r.status)).map(([id]) => id);
assert(verified.length > 0, 'the registry verifies at least one benchmark record');

// ---- the sheet, as its manifest defines it ----------------------------------------------------
const context = vm.createContext({ document: { write() {} } });
vm.runInContext(fs.readFileSync('js/content/manifest.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/content/manifests/spec.js', 'utf8'), context);
const sheet = JSON.parse(JSON.stringify(vm.runInContext('ArkManifest.get("spec")', context)));
const values = Object.entries(sheet.fields).filter(([, f]) => f.kind !== 'link').map(([role, f]) => [role, f.value]);
const all = values.map(([, v]) => v).join('\n');

// ---- it no longer claims that nothing is verified ----------------------------------------------
for (const stale of [
  /has no complete public benchmark artifact/i,
  /No canonical public benchmark artifact is registered/i,
  /No current throughput, latency, scale,? or external-chain comparison is verified/i,
  /Current conclusion: Unverified/i,
  /does not contain the complete reproducible artifacts/i
]) assert(!stale.test(all), 'the sheet no longer says ' + stale);
assert.notEqual(sheet.fields['STATUS.TITLE'].value.trim(), 'Status / Unverified', 'the status is not "Unverified" while the registry verifies records');

// ---- every id it names carries the registry's status; every quoted figure is in that row ------
const named = new Set();
for (const [role, value] of values) {
  const parts = value.split(/(?=BENCH-\d{3})/);
  for (const part of parts) {
    const id = (/^BENCH-\d{3}/.exec(part) || [])[0];
    if (!id) continue;
    named.add(id);
    const record = rows.get(id);
    assert(record, role + ' names ' + id + ', which is not in docs/evidence/registry.md');
    assert(part.toLowerCase().includes(record.status.toLowerCase()), role + ': ' + id + ' is stated with its registry status "' + record.status + '": ' + part.slice(0, 120));
    for (const figure of part.match(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\.\d+/g) || []) {
      assert(record.row.includes(figure), role + ': ' + id + ' quotes ' + figure + ', which its registry row does not carry');
    }
  }
}
for (const id of verified) assert(named.has(id), 'the sheet names ' + id + ', which the registry marks verified');

// ---- the evidence standard survives (no content reduction) ------------------------------------
for (const [role, phrase] of [
  ['POINT2.TEXT', 'must not be collapsed into one multiplier'],
  ['POINT3.TEXT', 'cannot be presented as sustained performance'],
  ['POINT4.TEXT', 'names hardware, operating system, network conditions'],
  ['POINT5.TEXT', 'must link the raw result and digest']
]) assert(sheet.fields[role].value.includes(phrase), role + ' keeps the evidence standard: ' + phrase);

// ---- it links onward to where the results are published --------------------------------------
const links = Object.values(sheet.fields).filter((f) => f.kind === 'link').map((f) => f.value);
for (const route of ['route:stats', 'route:stats/gpu', 'route:stats/ledger']) assert(links.includes(route), 'the sheet links ' + route);
assert(!/\bFLUX FROM SOURCE\b/i.test(sheet.fields.NEXT.value), 'the run CTA names the product DEFXN, as the nav does');

console.log('PASS: /concept/spec names every registry-verified BENCH record (' + verified.join(', ') + ') with its status and registry-backed figures, keeps the evidence standard, and links /stats.');
