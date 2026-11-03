/* Vendored dense-wire modules are copies, never edits. This test fails when one drifts from its source.

   Why it exists (audit round 11, council lane; the round-10 council verifier): this repo held 7 stale copies in
   js/dense-wire (flx-builders, flx-crypto, flx-dao-gov-builders, flx-launch-blobs, flx-native-transfer,
   flx-signing-guard, flx-wire) and 6 in gateway/vendor/dense-wire, behind the round-10 fixes (the network is required
   to sign or send, CNN-5 and CNN-6). No check covered the js/dense-wire folder as a whole: two older tests compared a
   hand-written list of files against the sibling checkout's working tree.

   The subjects are FOUND, not listed: every .mjs and .js file in each vendored folder is compared with its source
   (tests/lib/dense-wire-source.mjs, a commit read with git show). A copy that must stay behind goes in KNOWN_DRIFT
   with its reason, so the gap stays visible. A source that is not on this machine is skipped by name, never counted as
   a pass. Every relative import of a copy must resolve inside its own folder: a re-copied flx-builders.mjs that
   imports a file nobody vendored would load in no browser.

   2026-11-03 (round 11): both folders re-copied from audit-fix-all-r10 with git show. flx-attest-builders.mjs and
   flx-release-builders.mjs are new in both, because flx-builders.mjs now re-exports them. Every named import the site
   and the gateway make from these copies was checked: each still exists. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { ROOT, sourceName, sourceOf } from './lib/dense-wire-source.mjs';

const FOLDERS = ['js/dense-wire', 'gateway/vendor/dense-wire'];
/** name -> why it stays behind its source. Empty: every copy matches. */
const KNOWN_DRIFT = new Map([]);

const copiesIn = (folder) => fs.readdirSync(path.join(ROOT, folder)).filter((f) => /\.(mjs|js)$/.test(f)).sort();

test('every vendored dense-wire folder holds copies, and known drift names a real copy', () => {
  for (const folder of FOLDERS) assert.ok(copiesIn(folder).includes('flx-builders.mjs'), `${folder} vendors flx-builders.mjs`);
  for (const name of KNOWN_DRIFT.keys()) assert.ok(FOLDERS.some((folder) => copiesIn(folder).includes(name)), `${name} is listed as known drift and is not vendored`);
});

for (const folder of FOLDERS) {
  const copies = copiesIn(folder);
  for (const name of copies) {
    const from = sourceName(name);
    const bytes = KNOWN_DRIFT.has(name) ? null : sourceOf(name);
    const skip = KNOWN_DRIFT.has(name) ? `known drift: ${KNOWN_DRIFT.get(name)}` : bytes ? false : `source not on this machine: ${from}`;
    test(`${folder}/${name} is byte-identical to ${from}`, { skip }, () => {
      assert.ok(fs.readFileSync(path.join(ROOT, folder, name)).equals(bytes), `${folder}/${name} drifted from ${from}. To fix: re-copy it with git show (never edit the copy), then check every named import this repo makes from it`);
    });
  }
  test(`every relative import of a copy in ${folder} resolves inside ${folder}`, () => {
    const missing = [];
    for (const name of copies) {
      const text = fs.readFileSync(path.join(ROOT, folder, name), 'utf8');
      for (const m of text.matchAll(/(?:from|import)\s*\(?\s*['"](\.\/[^'"]+)['"]/g)) {
        if (!fs.existsSync(path.join(ROOT, folder, m[1]))) missing.push(`${name} imports ${m[1]}`);
      }
    }
    assert.deepEqual(missing, [], `copies import files this folder does not vendor. To fix: copy each missing file from ${sourceName('')} with git show`);
  });
}
