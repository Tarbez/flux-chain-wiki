/* PUBLISH CARRIES EVERY DRAFT SAVE WRITES.
   The defect this file exists for (found 2026-10-18): Save wrote 13 drafts, but the publish
   archive was built from its own hand-written list and carried 8. Settings defaults,
   components, states, canvas transitions and element motion worked in the editor and after a
   local Save, and were silently missing from every site published to the mesh. Nothing
   failed: the archive was valid, decoded cleanly, and every counter balanced.

   So this asserts on the payload, not the pipeline (AGENTS.md):
   1. there is ONE draft list (js/admin/store.js ArkAdminStore.drafts()), and Save's handles,
      Save's files and Publish's routes are each exactly that list -- a 14th draft added to
      the list without a handle fails here by name;
   2. all 13 drafts, the five populated NON-default (a dropped default reads back as the same
      default, so defaults alone cannot see the defect), survive encode -> decode deep-equal
      AND byte-identical under JSON.stringify (the hashing form);
   3. they survive the real reader path -- writeProject() (what `pull-site --write` runs) into
      a scratch project, read back the way the site loads them (readProject: each module plus
      its -data.js) -- with exact content;
   4. every one of the five changes the archive's address, i.e. is really in the bytes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { decodeArchive } from '../../../flx/flx-codec/src/index.js';
import { cidForBytes } from '../../../flx/flx-codec/src/blake3.js';
import { readProject, encodeSite, decodeSite, writeProject, siteProblems, siteDrafts, defaultProjectRoot } from '../scripts/lib/site-bundle.mjs';
import { populatedDrafts } from './browser/site-drafts-fixture.mjs';

const root = defaultProjectRoot;
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const clone = (v) => JSON.parse(JSON.stringify(v));
const FIVE = ['settingsDefaults', 'components', 'states', 'canvasTransitions', 'elementMotion'];

/* ---- 1. one list, and Save and Publish are each exactly it ---- */
const drafts = siteDrafts();
const keys = drafts.map((d) => d.key);
const singles = drafts.filter((d) => d.kind === 'single');
assert.equal(drafts.length, 13, 'the editor has 13 drafts');
assert.equal(new Set(keys).size, 13, 'no draft is listed twice');
assert.deepEqual(drafts.filter((d) => d.kind === 'items').map((d) => d.key), ['manifests', 'articles', 'assets', 'secrets'], 'the 4 per-id drafts');
for (const key of FIVE) assert(singles.some((d) => d.key === key), `${key} (one of the five once missing from publish) is in the one list`);
for (const d of singles) {
  for (const field of ['global', 'label', 'file', 'title']) assert(typeof d[field] === 'string' && d[field], `${d.key}.${field} is set`);
  for (const rel of [...(d.needs || []), `js/content/${d.file}.js`, `js/content/${d.file}-data.js`]) assert(fs.existsSync(path.join(root, rel)), `${d.key}: ${rel} exists`);
}

// Save: admin.js reaches each single draft through singleDraftHandle(); its keys must be the list's, exactly.
const admin = read('js/admin/admin.js');
const handleBody = admin.slice(admin.indexOf('function singleDraftHandle(key)'), admin.indexOf('async function saveEverything()'));
assert(handleBody.length > 0 && handleBody.length < 20000, 'singleDraftHandle() sits directly above saveEverything()');
const handles = [...handleBody.matchAll(/^ {6}(\w+): \{ draft: function \(\) \{ return (\w+); \}, set: function \(v\) \{ (\w+) = v; \}, saved: function \(\) \{ return (\w+); \}, dirty: (\w+), save:/gm)];
assert.deepEqual(handles.map((m) => m[1]).sort(), singles.map((d) => d.key).sort(), 'admin.js has editor handles for exactly the single drafts js/admin/store.js lists (no more, no fewer)');
for (const [, key, draftVar, setVar, savedVar] of handles) {
  assert.equal(setVar, draftVar, `${key}: set() replaces the same variable draft() reads`);
  assert.equal(savedVar, draftVar.replace(/Draft$/, 'Saved'), `${key}: saved() is that draft's own *Saved text (what the version history records)`);
}
const saveBody = admin.slice(admin.indexOf('async function saveEverything()'), admin.indexOf('\n  async function deleteCurrent()'));
assert(/var singles = ArkAdminStore\.drafts\('single'\);[\s\S]{0,300}await attempt\(single\.label, handle\.dirty\(\), handle\.save\);/.test(saveBody), 'saveEverything() saves the single drafts by iterating the one list');
for (const check of ['state.ids.filter(dirty)', 'state.slugs.filter(dirtyA)', 'state.assetIds.filter(dirtyI)', 'state.secretIds.filter(dirtyS)']) assert(saveBody.includes(check), `saveEverything() saves the per-id draft behind ${check}`);
assert(/function anyDirty\(\) \{[^\n]*ArkAdminStore\.drafts\('single'\)\.some\(/.test(admin), 'anyDirty() (the Publish gate) checks every single draft in the list');
assert(/function siteFromState\(\) \{[\s\S]{0,1500}ArkAdminStore\.drafts\(\)\.forEach/.test(admin), 'siteFromState() (what Publish sends) is built from the one list');
// Save's file for each single draft is the file a pull writes: same name, same serializer.
const store = read('js/admin/store.js');
for (const d of singles) assert(store.includes(`write(contentDir, '${d.file}-data.js', ${d.global}.serialize(`), `Save writes ${d.key} to js/content/${d.file}-data.js with ${d.global}.serialize -- the file and bytes writeProject() writes for a pull`);

/* ---- 2. all 13, five of them populated, survive the archive exactly ---- */
const site = readProject();
assert.deepEqual(Object.keys(site), keys, 'readProject() gives every draft, in the list order');
Object.assign(site, populatedDrafts(root));
assert.deepEqual(siteProblems(site), [], 'the populated site is publishable');
const bytes = encodeSite(site);
const raw = decodeArchive(bytes);
const routes = new Map(raw.routes.map((r) => [r.routeId, r]));
const entry = routes.get('site').payload;
for (const d of singles) {
  assert.equal(entry[d.key], true, `the archive's entry flags ${d.key} as present`);
  assert(routes.has(d.key), `the archive has a ${d.key} route`);
  assert.deepStrictEqual(routes.get(d.key).payload, site[d.key], `the ${d.key} route holds the draft itself`);
}
const decoded = decodeSite(bytes);
assert.deepEqual(Object.keys(decoded), keys, 'decodeSite() gives back all 13 drafts, in the list order');
assert.deepStrictEqual(decoded, site, 'decode(encode(site)) deep-equals the site');
assert.equal(JSON.stringify(decoded), JSON.stringify(site), 'and is byte-identical under JSON.stringify (the hashing form)');
for (const key of keys) assert.equal(JSON.stringify(decoded[key]), JSON.stringify(site[key]), `${key} is byte-identical after the round trip`);

/* ---- 3. the reader path: what a pull writes is what the site loads ---- */
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-site-drafts-'));
try {
  fs.cpSync(path.join(root, 'js/content'), path.join(scratch, 'js/content'), { recursive: true });
  for (const rel of ['js/admin/store.js', ...new Set(singles.flatMap((d) => d.needs || []))]) {
    fs.mkdirSync(path.dirname(path.join(scratch, rel)), { recursive: true });
    fs.copyFileSync(path.join(root, rel), path.join(scratch, rel));
  }
  const written = writeProject(decoded, scratch).map((c) => c.relative);
  for (const key of FIVE) {
    const d = singles.find((x) => x.key === key);
    assert(written.includes(`js/content/${d.file}-data.js`), `pulling the published site rewrites js/content/${d.file}-data.js (${key})`);
  }
  const loaded = readProject(scratch);
  for (const key of keys) {
    assert.deepStrictEqual(loaded[key], site[key], `${key}: the site loads exactly what was published`);
    assert.equal(JSON.stringify(loaded[key]), JSON.stringify(site[key]), `${key}: byte-identical as loaded`);
  }
} finally { fs.rmSync(scratch, { recursive: true, force: true }); }

/* ---- 4. each of the five is really in the bytes ---- */
const cid = cidForBytes(bytes);
for (const key of FIVE) {
  const without = clone(site); without[key] = null;
  assert.notEqual(cidForBytes(encodeSite(without)), cid, `${key} changes the archive's address: it is in the published bytes`);
}

/* ---- older archives, and refusals ---- */
// An archive written before these drafts were published has no flag for them: absent means
// "that module's defaults" (null), never a broken read.
const older = clone(site); for (const key of FIVE) older[key] = null;
const olderBack = decodeSite(encodeSite(older));
for (const key of FIVE) assert.equal(olderBack[key], null, `an archive without ${key} decodes it as null`);
const olderEntry = decodeArchive(encodeSite(older)).routes.find((r) => r.routeId === 'site').payload;
for (const key of FIVE) assert.equal(olderEntry[key], false, `and flags it absent`);
// A single draft that is not an object is refused by name, before anything is encoded.
for (const key of FIVE) {
  const bad = clone(site); bad[key] = ['not', 'an', 'object'];
  const label = singles.find((d) => d.key === key).label.toLowerCase();
  assert.throws(() => encodeSite(bad), new RegExp(`${label}: must be a settings object`), `${key} as a list is refused, naming it`);
}

console.log(`site drafts ok: ${keys.length} drafts, one list; Save handles, Save files and publish routes match it; ${FIVE.length} populated drafts survive encode/decode and pull->load byte-identically; ${bytes.length} bytes`);
