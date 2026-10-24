/* Writes capabilities-data.js for the mockup's Measured rail, derived from the launched capabilities.

   A capability is what dense-wire launches on chain with a derived manifest
   (flux/defxn-defi-rs/dense-wire/capabilities/<name>/capability-manifest.flx, grammar
   FLX-CAPABILITY-MANIFEST-V1). Products and resolvers are not capabilities: a resolver composes
   capabilities, and a product is a surface. Nothing in the list is written by hand:
     name, version, crate      the manifest's own lines
     functions                 the manifest's `function` lines
     count, cases              the manifest's `vector` lines: each one is a conformance vector, a
                               named behaviour the capability is checked against. `count` is all of
                               them; `cases` leaves out any name the site's banned vocabulary forbids
                               (tests/no-deprecated-vocabulary.cjs), so the page never shows one
     line                      the crate's own one-line name for itself (its lib.rs heading, or
                               the first clause of its Cargo description)
     plain                     the designer brief's own plain words for it (defxn-concept.html,
                               table "The 13 capabilities launched today"), read, not retyped
   The four fleet figures are BENCH-013's own numbers (one dated run on 10 nodes), the only
   throughput measured today. No capability has its own throughput yet; the rail says so.
   FLEET's "Fleet-wide 71,249 ops/s" is NOT in the BENCH-013 record (checked 2026-10-23: the record's
   fleet row has swaps/s, 1-shard swaps/s, transfers/s and stores/s only). It stays for the home rail
   until the owner decides; the Measured page reads RUNS, where every figure names its record line.

   Run from this folder:  node make-capabilities.mjs
   Run it again when a capability is launched or its manifest is re-derived. */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const KERNEL = join(HERE, '../../../defxn-defi-rs');
const CAPS = join(KERNEL, 'dense-wire/capabilities');
const OUT = join(HERE, '../../js/content/capabilities-data.js');
/* the site's banned vocabulary, read from the test that enforces it (docs/deprecated.md) */
const VOCAB_TEST = join(HERE, '../../tests/no-deprecated-vocabulary.cjs');

export function bannedWords() {
  if (!existsSync(VOCAB_TEST)) return [];
  const t = readFileSync(VOCAB_TEST, 'utf8');
  const block = t.slice(t.indexOf('const FORBIDDEN'), t.indexOf('];', t.indexOf('const FORBIDDEN')));
  return [...block.matchAll(/\[\s*'((?:[^'\\]|\\.)*)'\s*,/g)].map((m) => new RegExp(m[1].replace(/\\\\/g, '\\'), 'i'));
}

const FLEET = { run: 'BENCH-013', nodes: 10, figures: [
  { name: 'Fleet-wide', value: 71249, unit: 'ops/s' },
  { name: 'Swaps', value: 643632, unit: 'swaps/s' },
  { name: 'Transfers', value: 69895, unit: 'transfers/s' },
  { name: 'Records', value: 6044992, unit: 'records/s' }
] };

/* the two dated runs the Measured page shows, copied from their records (never multiplied) */
const RUNS = [
  { id: 'BENCH-013', date: '10 Oct 2026', what: 'The fleet: all 10 nodes at once, 37 cores',
    source: 'flux/defxn/docs/evidence/bench-013-operation-matrix.md, row FLEET',
    note: 'A sum of runs made at the same time on each node. Never one node multiplied.',
    figures: [
      { name: 'Swaps', value: '643,632', unit: 'swaps/s' },
      { name: 'Transfers', value: '69,895', unit: 'transfers/s' },
      { name: 'Stored results', value: '6,044,992', unit: 'records/s' }
    ] },
  { id: 'BENCH-012', date: '10 Oct 2026', what: 'One resolver, 60 batches of swaps, copies to 10 computers',
    source: 'flux/defxn/docs/evidence/bench-012-defi-shard-signed-resolution.md, "Result"',
    note: 'All 60 of 60 checks passed. Every swap in a batch cleared at one price.',
    figures: [
      { name: 'Swaps per batch', value: '256', unit: 'swaps' },
      { name: 'Time per batch', value: '13.874', unit: 'ms' },
      { name: 'One signed result', value: '180', unit: 'bytes' },
      { name: 'To check one', value: '3', unit: 'signature checks' }
    ] }
];
const LIMIT = 'No network time is inside these runs. They measure how fast the nodes resolve. Sending a result to 10 computers takes 449 ms today.';

/* the brief's plain words per capability, read from its table (first cell name, second cell words) */
const BRIEF = join(HERE, 'defxn-concept.html');
export function plainWords() {
  if (!existsSync(BRIEF)) return {};
  const t = readFileSync(BRIEF, 'utf8'), at = t.indexOf('The 13 capabilities launched today');
  const body = t.slice(t.indexOf('<tbody>', at), t.indexOf('</tbody>', at));
  const out = {};
  for (const m of body.matchAll(/<tr><td>([^<]+)<\/td><td>([^<]+)<\/td>/g)) out[m[1].trim().toLowerCase()] = m[2].trim();
  return out;
}

function sentence(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

/* the crate's own name for itself: "(K2: the attestation envelope)" in its heading, or the first
   clause of its Cargo description after the reference list */
export function lineOf(crateDir) {
  const lib = join(crateDir, 'src/lib.rs');
  if (existsSync(lib)) {
    const head = readFileSync(lib, 'utf8').split('\n').find((l) => l.startsWith('//! #')) || '';
    const k = head.match(/\(K\d+:\s*([^)]+)\)/);
    if (k) return sentence(k[1].trim());
  }
  const cargo = join(crateDir, 'Cargo.toml');
  if (existsSync(cargo)) {
    const d = (readFileSync(cargo, 'utf8').match(/^description\s*=\s*"(.*)"$/m) || [])[1] || '';
    const after = d.slice(d.indexOf('): ') + 3);
    const cut = after.split(/ \(|\. |, moved| -- |;/)[0];
    return sentence(cut.trim());
  }
  return null;
}

export function parseManifest(text) {
  const out = { functions: 0, cases: [] };
  for (const line of text.split('\n')) {
    const f = line.split('\t');
    if (f[0] === 'FLX-CAPABILITY-MANIFEST-V1') out.name = f[1];
    else if (f[0] === 'version') out.version = f[1];
    else if (f[0] === 'crate') { out.crate = f[1]; out.cratePath = f[2]; }
    else if (f[0] === 'function') out.functions++;
    else if (f[0] === 'vector') out.cases.push(sentence(f[2].replace(/_/g, ' ')));
  }
  return out;
}

export function build() {
  const banned = bannedWords(), plain = plainWords();
  const clean = (s) => !banned.some((re) => re.test(s));
  const caps = readdirSync(CAPS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  const list = [];
  for (const id of caps) {
    const file = join(CAPS, id, 'capability-manifest.flx');
    if (!existsSync(file)) continue;
    const m = parseManifest(readFileSync(file, 'utf8'));
    const crateDir = join(KERNEL, m.crate || 'flx-cap-' + id);
    list.push({ id: m.name || id, version: m.version || null, crate: m.crate || null, line: lineOf(crateDir), plain: plain[(m.name || id).toLowerCase()] || null,
      functions: m.functions, count: m.cases.length, cases: m.cases.filter(clean), throughput: null });
  }
  return { fleet: FLEET, runs: RUNS, limit: LIMIT, capabilities: list };
}

function main() {
  const data = build();
  const cases = data.capabilities.reduce((s, c) => s + c.count, 0);
  const text = '/* GENERATED by make-capabilities.mjs from flux/defxn-defi-rs/dense-wire/capabilities/<name>/capability-manifest.flx.\n' +
    '   Do not edit by hand: run `node make-capabilities.mjs` in this folder. */\n' +
    'window.DEFXN_CAPABILITIES = ' + JSON.stringify(data, null, 1) + ';\n';
  writeFileSync(OUT, text);
  console.log('wrote ' + OUT + ': ' + data.capabilities.length + ' capabilities, ' + cases + ' checked cases');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
