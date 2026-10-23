#!/usr/bin/env node
/* Generates js/content/registry-snapshot.js: a dated snapshot of the
 * resolver chains and capabilities, for /resolvers and every page that
 * counts them.
 *
 * WHY THIS IS GENERATED. Two hand-typed resolver counts circulated on this
 * site at once (20/6/14 and 5/15) and neither was the registry. A count a
 * person types is a second corpus that drifts the day a resolver is
 * launched; so the count is read from the files that define the resolvers,
 * and the page states the commit and date it was read at.
 *
 * WHAT IT READS (read-only; this script never writes outside this repo).
 * The source is the `defxn-defi-rs` checkout beside this one, read through
 * `git show <commit>:<path>` so a snapshot is always a snapshot OF A
 * COMMIT, never of someone's uncommitted edits:
 *
 *   dense-wire/resolvers/<dir>/composition.txt   chain id, binary, composes,
 *                                                offer + grammar manifest CIDs
 *   dense-wire/resolvers/<dir>/offer-manifest.*  hashed: must equal its CID
 *   dense-wire/resolvers/<dir>/grammar-manifest.* hashed; `.json` with schema
 *                                                `flx-resolver-grammar/1` is a
 *                                                compiled, enforced grammar;
 *                                                legacy tab text is reported
 *                                                Unspecified by the node
 *   dense-wire/capabilities/<id>/capability-manifest.json
 *                                                version, crate, conformance
 *                                                vectors, source hash
 *   dense-wire/docs/design/architecture.md §9.1  the resolver table: names,
 *                                                record kinds, native vs bridge
 *                                                (markdown -- machine-read here
 *                                                by its table shape)
 *   dense-wire/docs/design/global-resolvers.md   the last devnet observation
 *                                                (Phase 31): what RESOLVER_LIST
 *                                                and CAPABILITY_LIST answered
 *
 * The node is NOT queried. What a live node holds belongs to
 * explore.defxn.com; this site stays static and says which commit and which
 * dated observation each number comes from. A fact the sources do not hold
 * (a resolver's control key, how many providers announce right now) is
 * recorded as absent (null), never as 0.
 *
 * GUARDED. Without `--write` it only checks, and exits non-zero on drift.
 *
 *   node scripts/snapshot-registry.mjs            check the committed snapshot
 *                                                 against its own pinned commit
 *   node scripts/snapshot-registry.mjs --write    re-derive from the source's
 *                                                 HEAD and rewrite the snapshot
 *   --source <path>                               another defxn-defi-rs checkout
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = path.join(ROOT, 'js', 'content', 'registry-snapshot.js');
export const DEFAULT_SOURCE = path.resolve(ROOT, '..', 'defxn-defi-rs');

const RESOLVERS = 'dense-wire/resolvers';
const CAPABILITIES = 'dense-wire/capabilities';
const ARCH = 'dense-wire/docs/design/architecture.md';
const GR = 'dense-wire/docs/design/global-resolvers.md';
const WATCHED = [RESOLVERS, CAPABILITIES, ARCH, GR];

function git(source, args, encoding = 'utf8') {
  return execFileSync('git', ['-C', source, ...args], { encoding, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
}

export function sourceAvailable(source = DEFAULT_SOURCE) {
  try { git(source, ['rev-parse', '--verify', 'HEAD']); return fs.existsSync(path.join(source, ARCH)); } catch { return false; }
}

function show(source, commit, file) { return git(source, ['show', `${commit}:${file}`], 'buffer'); }
function list(source, commit, dir) {
  return git(source, ['ls-tree', '--name-only', `${commit}`, `${dir}/`]).split('\n').filter(Boolean).map((p) => p.slice(dir.length + 1));
}
function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex'); }

/* A refusal names the failure, what is missing, and the remedy. */
function refuse(failure, missing, remedy) {
  const error = new Error(`${failure}\n  missing: ${missing}\n  remedy:  ${remedy}`);
  error.refusal = true;
  throw error;
}

function parseComposition(text, dir) {
  const out = { composes: [], commands: [] };
  const lines = text.split('\n').filter(Boolean);
  if (!/^FLX-RESOLVER-COMPOSITION-V1\t/.test(lines[0] || '')) {
    refuse(`${dir}/composition.txt does not open with FLX-RESOLVER-COMPOSITION-V1`, 'a composition header', 'regenerate the composition in defxn-defi-rs; this script reads, it does not repair');
  }
  for (const line of lines.slice(1)) {
    const [key, value] = line.split('\t');
    if (key === 'composes') { if (value && value !== '-') out.composes.push(value); }
    else if (key === 'command') out.commands.push(value);
    else if (['id', 'binary', 'offer', 'grammar'].includes(key)) out[key] = value;
  }
  return out;
}

/* §9.1 is a markdown table. It is read by its SHAPE -- the section heading,
 * then pipe rows -- and each row is classified by what its own columns say
 * ("native" in the status column; "bridge" in the process column; "kernel"
 * as the process), never by a list of known resolver names. */
function parseResolverTable(markdown) {
  const start = markdown.indexOf('### 9.1 ');
  if (start < 0) refuse('architecture.md has no "### 9.1" section', 'the resolver inventory table (§9.1)', 'check that the design doc still carries §9.1, or update this reader to where the table moved');
  const section = markdown.slice(start, markdown.indexOf('\n### ', start + 8));
  const rows = section.split('\n').filter((line) => /^\|/.test(line)).slice(2);
  const strip = (cell) => cell.replace(/`/g, '').trim();
  return rows.map((row) => {
    const cells = row.split('|').slice(1, -1).map((cell) => cell.trim());
    const [name, chain, proc, records, status] = cells;
    const kind = /\bkernel\b/.test(proc) ? 'kernel' : /\bbridge\b/.test(proc) ? 'bridge' : /\bnative\b/.test(status) ? 'native' : 'unclassified';
    return {
      name: strip(name),
      chainId: strip(chain) === '—' ? null : strip(chain).split(/\s+/)[0],
      process: strip(proc),
      records: (records.match(/`([^`]+)`/g) || []).map((r) => r.replace(/`/g, '')),
      recordsText: strip(records),
      status: strip(status),
      kind
    };
  });
}

/* The last recorded devnet observation, read from the phase that recorded
 * it. Phase 31 is the newest record of what RESOLVER_LIST answered; when a
 * later phase records a newer read, point OBSERVATION at it. */
const OBSERVATION = { phase: 'Phase 31' };
function parseObservation(markdown) {
  const at = markdown.indexOf(`## ${OBSERVATION.phase} `);
  if (at < 0) refuse(`global-resolvers.md has no "## ${OBSERVATION.phase}" section`, 'the dated devnet observation', 'point OBSERVATION in scripts/snapshot-registry.mjs at the phase that records the newest RESOLVER_LIST read');
  const section = markdown.slice(at, markdown.indexOf('\n## ', at + 4));
  const date = /\((\d{4}-\d{2}-\d{2})/.exec(section);
  const resolverList = /`RESOLVER_LIST`\s+(\d+)\s+\((all native)?/.exec(section);
  const capabilityList = /`CAPABILITY_LIST`\s+(\d+)/.exec(section);
  const proved = /proved column\s*\(`-`,\s*nothing proved yet\)/.test(section);
  if (!date || !resolverList || !capabilityList) {
    refuse(`${OBSERVATION.phase} no longer states RESOLVER_LIST and CAPABILITY_LIST counts in the shape this reader expects`, 'a "`RESOLVER_LIST` <n>" and "`CAPABILITY_LIST` <n>" statement', 'read the phase and update parseObservation(); never type the numbers in');
  }
  return {
    record: `defxn-defi-rs ${GR} · ${OBSERVATION.phase}`,
    date: date[1],
    node: 'the owner’s development network (devnet)',
    resolverChainsListed: Number(resolverList[1]),
    allNative: Boolean(resolverList[2]),
    capabilitiesLaunched: Number(capabilityList[1]),
    providersWithProof: proved ? 0 : null
  };
}

export function build({ source = DEFAULT_SOURCE, commit } = {}) {
  if (!sourceAvailable(source)) {
    refuse(`defxn-defi-rs is not readable at ${source}`, `a git checkout of defxn-defi-rs with ${ARCH}`, 'check it out beside defxn, or pass --source <path>');
  }
  const rev = git(source, ['rev-parse', '--verify', `${commit || 'HEAD'}^{commit}`]).trim();
  const commitDate = git(source, ['show', '-s', '--format=%cs', rev]).trim();

  const table = parseResolverTable(show(source, rev, ARCH).toString('utf8'));
  const observation = parseObservation(show(source, rev, GR).toString('utf8'));

  const resolvers = list(source, rev, RESOLVERS).map((dir) => {
    const base = `${RESOLVERS}/${dir}`;
    const files = list(source, rev, base);
    const comp = parseComposition(show(source, rev, `${base}/composition.txt`).toString('utf8'), base);
    const pick = (stem) => files.find((f) => f === `${stem}.json`) || files.find((f) => f === `${stem}.txt`);
    const offerFile = pick('offer-manifest');
    const grammarFile = pick('grammar-manifest');
    if (!offerFile || !grammarFile) refuse(`${base} lacks an offer or grammar manifest`, 'offer-manifest.(json|txt) and grammar-manifest.(json|txt)', 'derive the manifests in defxn-defi-rs');
    const offerBytes = show(source, rev, `${base}/${offerFile}`);
    const grammarBytes = show(source, rev, `${base}/${grammarFile}`);
    // The composition names each manifest by CID; a manifest that does not hash to its CID is a
    // different manifest, so it is refused here exactly as the node would refuse it.
    if (sha256(offerBytes) !== comp.offer) refuse(`${base}/${offerFile} does not hash to the offer CID its composition names`, `sha256 = ${comp.offer}`, 're-derive the composition in defxn-defi-rs');
    if (sha256(grammarBytes) !== comp.grammar) refuse(`${base}/${grammarFile} does not hash to the grammar CID its composition names`, `sha256 = ${comp.grammar}`, 're-derive the composition in defxn-defi-rs');
    let grammar = 'unspecified';
    if (grammarFile.endsWith('.json')) {
      const parsed = JSON.parse(grammarBytes.toString('utf8'));
      grammar = parsed.schema === 'flx-resolver-grammar/1' ? 'enforced' : 'unspecified';
    }
    let offers = [];
    if (offerFile.endsWith('.json')) {
      offers = (JSON.parse(offerBytes.toString('utf8')).offers || []).map((o) => o.name).filter(Boolean);
    }
    const row = table.find((r) => r.chainId === comp.id);
    if (!row) refuse(`chain id "${comp.id}" (${base}) is not in architecture.md §9.1`, `a §9.1 row whose chain id is ${comp.id}`, 'the inventory and the resolver files disagree; fix the design doc in defxn-defi-rs');
    return {
      chainId: comp.id,
      name: row.name,
      origin: row.kind === 'native' ? 'native' : 'unclassified',
      process: comp.binary,
      records: row.records,
      composes: comp.composes,
      grammar,
      offers,
      offerCid: comp.offer,
      grammarCid: comp.grammar,
      control: null,
      providersAnnouncing: null
    };
  }).sort((a, b) => a.chainId.localeCompare(b.chainId));

  const nativeRows = table.filter((r) => r.kind === 'native');
  const missingFiles = nativeRows.filter((r) => !resolvers.some((x) => x.chainId === r.chainId));
  if (missingFiles.length) refuse(`architecture.md §9.1 lists native resolvers with no files: ${missingFiles.map((r) => r.chainId).join(', ')}`, 'dense-wire/resolvers/<dir>/composition.txt for each', 'the inventory and the resolver files disagree; fix one of them in defxn-defi-rs');

  const bridges = table.filter((r) => r.kind === 'bridge').map((r) => ({
    chainId: r.chainId,
    name: r.name,
    via: r.process,
    records: r.records,
    note: r.status
  }));

  const capabilities = list(source, rev, CAPABILITIES).map((dir) => {
    const file = `${CAPABILITIES}/${dir}/capability-manifest.json`;
    const bytes = show(source, rev, file);
    const m = JSON.parse(bytes.toString('utf8'));
    if (m.schema !== 'flx-capability-manifest/1') refuse(`${file} is not a flx-capability-manifest/1`, 'schema flx-capability-manifest/1', 'derive it with dense-wire/scripts/derive-capability-manifest.mjs');
    return {
      id: m.capability,
      version: m.version,
      crate: m.crate && m.crate.name,
      vectors: ((m.conformance && m.conformance.vectors) || []).length,
      sourceHash: m.implementation && m.implementation.sourceHash,
      manifestCid: sha256(bytes),
      derivedAt: m.derivedAt,
      usedBy: resolvers.filter((r) => r.composes.includes(m.capability)).map((r) => r.chainId),
      control: null
    };
  }).sort((a, b) => a.id.localeCompare(b.id));

  const unknown = resolvers.flatMap((r) => r.composes.filter((c) => !capabilities.some((cap) => cap.id === c)).map((c) => `${r.chainId} -> ${c}`));
  if (unknown.length) refuse(`resolvers compose capabilities with no manifest: ${unknown.join(', ')}`, 'dense-wire/capabilities/<id>/capability-manifest.json', 'derive the capability manifest; the node refuses such a launch too (CapabilityNotLaunched)');

  return {
    schema: 'defxn-registry-snapshot/1',
    generatedBy: 'scripts/snapshot-registry.mjs',
    source: {
      repo: 'flux/defxn-defi-rs',
      commit: rev,
      commitDate,
      read: WATCHED.slice()
    },
    observation,
    counts: {
      nativeResolverChains: resolvers.length,
      bridgeChains: bridges.length,
      capabilities: capabilities.length,
      grammarEnforced: resolvers.filter((r) => r.grammar === 'enforced').length,
      grammarUnspecified: resolvers.filter((r) => r.grammar === 'unspecified').length
    },
    resolvers,
    bridges,
    capabilities
  };
}

export function render(data) {
  const json = JSON.stringify(data, null, 2).split('\n').map((line, i) => (i === 0 ? line : '  ' + line)).join('\n');
  return `/* GENERATED by scripts/snapshot-registry.mjs -- do not edit by hand.
 *
 * A dated snapshot of the resolver chains and capabilities, read from
 * flux/defxn-defi-rs at commit ${data.source.commit.slice(0, 12)} (${data.source.commitDate}), plus the
 * last recorded devnet observation (${data.observation.record}, ${data.observation.date}).
 * It is not a live read: the live view is explore.defxn.com.
 * null means "not in the sources" (shown as a dash), never zero.
 *
 * Refresh: node scripts/snapshot-registry.mjs --write
 * Check:   node scripts/snapshot-registry.mjs
 */
(function () {
  'use strict';
  function freeze(value) {
    if (value && typeof value === 'object') { Object.keys(value).forEach(function (k) { freeze(value[k]); }); Object.freeze(value); }
    return value;
  }
  window.ArkRegistrySnapshot = freeze(${json});
})();
`;
}

/* The committed snapshot names its commit; reading it back is how --check
 * re-derives the SAME commit rather than whatever HEAD is today. */
export function committedCommit(text = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '') {
  const m = /"commit": "([0-9a-f]{40})"/.exec(text);
  return m ? m[1] : null;
}

/* How far the source has moved past the snapshot, in commits that touch
 * what this script reads. Information, not failure: a snapshot is dated by
 * design, and the page says so. */
export function drift(source, commit) {
  try {
    return Number(git(source, ['rev-list', '--count', `${commit}..HEAD`, '--', ...WATCHED]).trim());
  } catch { return null; }
}

function main(argv) {
  const write = argv.includes('--write');
  const at = argv.indexOf('--source');
  const source = at >= 0 ? path.resolve(argv[at + 1]) : DEFAULT_SOURCE;
  try {
    if (write) {
      const dirty = git(source, ['status', '--porcelain', '--', ...WATCHED]).trim();
      if (dirty) refuse('defxn-defi-rs has uncommitted changes under the paths this snapshot reads', `a clean tree at:\n${dirty}`, 'snapshot a commit: wait for those edits to be committed, or pass --source a clean checkout');
      const text = render(build({ source }));
      fs.writeFileSync(OUT, text);
      console.log(`wrote ${path.relative(ROOT, OUT)} from ${committedCommit(text).slice(0, 12)}`);
      return 0;
    }
    const pinned = committedCommit();
    if (!pinned) refuse(`${path.relative(ROOT, OUT)} is missing or names no commit`, 'a generated snapshot', 'node scripts/snapshot-registry.mjs --write');
    const expected = render(build({ source, commit: pinned }));
    if (expected !== fs.readFileSync(OUT, 'utf8')) {
      refuse(`${path.relative(ROOT, OUT)} differs from what commit ${pinned.slice(0, 12)} derives`, 'a snapshot that is a faithful derivation of its own pinned commit (it was hand-edited, or this script changed)', 'node scripts/snapshot-registry.mjs --write');
    }
    const moved = drift(source, pinned);
    console.log(`ok: snapshot matches defxn-defi-rs ${pinned.slice(0, 12)}` + (moved ? `; the source has ${moved} newer commit(s) touching what it reads -- refresh with --write when they should reach the site` : ''));
    return 0;
  } catch (error) {
    console.error(error.refusal ? `REFUSED: ${error.message}` : error.stack);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(main(process.argv.slice(2)));
