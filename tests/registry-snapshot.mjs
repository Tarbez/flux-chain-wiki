/* js/content/registry-snapshot.js is generated, and /resolvers renders only from it.
 *
 * Why this exists (2026-10-19): two hand-typed resolver counts circulated on the site at once
 * -- 20/6/14 and 5/15 -- and neither was the registry (docs/ux-audit/resolvers-content.md §0).
 * The registry's own inventory is 12 native resolver chains plus 5 bridge chains. A count a
 * person types drifts the day a resolver launches, so the counts are derived from the code
 * that defines each resolver (defxn-defi-rs) by scripts/snapshot-registry.mjs, and this test
 * holds the committed snapshot to its own pinned commit.
 *
 * Without the sibling checkout the derivation cannot be re-run; that is said out loud as a
 * REDUCED check, never counted as a pass, and every behaviour case below still runs against
 * the committed file. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, render, committedCommit, sourceAvailable, OUT } from '../scripts/snapshot-registry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const text = fs.readFileSync(OUT, 'utf8');
const pinned = committedCommit(text);
assert.match(pinned || '', /^[0-9a-f]{40}$/, 'the snapshot names the full commit it was derived from');

// 1. The committed file is exactly what its pinned commit derives (no hand edits).
if (sourceAvailable()) {
  assert.equal(text, render(build({ commit: pinned })),
    'js/content/registry-snapshot.js differs from what its pinned commit derives.\n' +
    '  remedy: node scripts/snapshot-registry.mjs --write\n' +
    '  why it matters: /resolvers, the hub and the counts on every page come from this file.');
} else {
  console.log('REDUCED: ../defxn-defi-rs is not readable, so the snapshot was not re-derived.\n' +
    '  missing: a git checkout of defxn-defi-rs beside defxn\n' +
    '  still checked: every behaviour case below, against the committed file.');
}

// 2. What the page reads.
const context = { window: {} };
vm.runInNewContext(text, context);
const snap = context.window.ArkRegistrySnapshot;
assert(Object.isFrozen(snap) && Object.isFrozen(snap.resolvers[0]), 'the snapshot is frozen all the way down');

// Counts are derived from the rows, never stored separately from them.
assert.equal(snap.counts.nativeResolverChains, snap.resolvers.length);
assert.equal(snap.counts.bridgeChains, snap.bridges.length);
assert.equal(snap.counts.capabilities, snap.capabilities.length);
assert.equal(snap.counts.grammarEnforced + snap.counts.grammarUnspecified, snap.resolvers.length);

// Every resolver is a launched chain with a 64-hex offer and grammar CID; every composed
// capability has a manifest (the node refuses such a launch too: CapabilityNotLaunched).
for (const r of snap.resolvers) {
  assert.match(r.chainId, /^[a-z0-9]{3,32}$/, `${r.chainId}: a chain id as a launch record names it`);
  assert.match(r.offerCid, /^[0-9a-f]{64}$/); assert.match(r.grammarCid, /^[0-9a-f]{64}$/);
  assert(['enforced', 'unspecified'].includes(r.grammar), `${r.chainId}: grammar state is one of two named states`);
  for (const c of r.composes) assert(snap.capabilities.some((cap) => cap.id === c), `${r.chainId} composes ${c}, which has a manifest`);
  // Absent is not zero: the sources do not hold a control key or a live provider count.
  assert.equal(r.control, null, `${r.chainId}: control is absent from the sources (null), never invented`);
  assert.equal(r.providersAnnouncing, null, `${r.chainId}: providers announcing is absent (null), never 0`);
}
for (const cap of snap.capabilities) {
  assert(cap.vectors > 0, `${cap.id}: a capability manifest carries the conformance vectors its own tests emitted`);
  assert.match(cap.sourceHash, /^[0-9a-f]{64}$/);
}

// The devnet observation is dated and cited, and a measured zero stays a number.
assert.match(snap.observation.date, /^\d{4}-\d{2}-\d{2}$/);
assert.match(snap.observation.record, /global-resolvers\.md · Phase \d+/);
assert.equal(typeof snap.observation.capabilitiesLaunched, 'number', 'the devnet capability count is a measured number (0 is a real reading here)');

// 3. No copy types a resolver chain count: the words say what is counted, the snapshot says how many.
const resolverManifest = fs.readFileSync(path.join(ROOT, 'js/content/manifests/resolver.js'), 'utf8');
const page = fs.readFileSync(path.join(ROOT, 'js/pages/resolvers.js'), 'utf8');
assert(!/\b(?:twelve|12)\s+(?:native\s+)?resolver/i.test(resolverManifest), 'the hub and registry copy do not hand-type the resolver chain count');
assert(page.includes('ArkRegistrySnapshot') && !/ArkResolverRegistry/.test(page), '/resolvers renders from the generated snapshot, not the retired hand-written directory');
assert(!fs.existsSync(path.join(ROOT, 'js/content/resolver-registry.js')), 'the hand-written resolver directory stays retired');

console.log(`PASS: registry snapshot ${pinned.slice(0, 12)} -- ${snap.counts.nativeResolverChains} native resolver chains, ${snap.counts.bridgeChains} bridge chains, ${snap.counts.capabilities} capabilities, all derived; absent facts stay null.`);
