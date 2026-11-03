/* Why this exists: the DOM_PROOF verifier has ONE home, dense-wire/web/flx-domain-proof.mjs
   (docs/DEFXN-NAMES-ONE-SYSTEM.md, "Never write a second verifier"). The gateway shell is
   deployed as a standalone directory (/srv/defxn-gateway), so it vendors that file and the
   files it imports under gateway/vendor/dense-wire. This test keeps the copy a copy, and
   keeps the retired name sources out of the gateway and the CMS permission check. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Round 11 (council lane): the byte check of every file in gateway/vendor/dense-wire moved to the one drift check,
// tests/vendored-dense-wire.test.mjs, which finds the files in the folder and reads the source from a commit
// (tests/lib/dense-wire-source.mjs). This test read a hand-written list against the sibling checkout's working tree.
test('the gateway entry files are vendored', () => {
  for (const file of ['flx-domain-proof.mjs', 'flx-wire.mjs', 'flx-resolver-record-client.mjs']) {
    assert.ok(fs.existsSync(path.join(ROOT, 'gateway', 'vendor', 'dense-wire', file)), `gateway/vendor/dense-wire/${file} is missing. To fix: copy it from dense-wire/web with git show`);
  }
});

test('the gateway shell and the CMS permission check read no retired name source', () => {
  const retired = [
    ['the miner name route', /debug\/name-record/],
    ['the Explorer names source', /sourceId:\s*['"]names['"]|explorer\/v1\/(query|record)/],
    ['the GUN names/* graph', /['"`]names\/|get\(['"`]names['"`]\)/],
    ['the retired self-signed record verifier', /verify-name-record|verifyNameRecord/],
  ];
  const files = [...fs.readdirSync(path.join(ROOT, 'gateway')).filter((f) => f.endsWith('.js')).map((f) => path.join('gateway', f)), 'scripts/lib/cms-permissions.mjs', 'scripts/lib/dense-wire-modules.mjs'];
  const offenders = [];
  for (const file of files) {
    // Comment lines may name what was retired; code may not read it.
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8').split('\n').filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line)).join('\n');
    for (const [what, pattern] of retired) if (pattern.test(text)) offenders.push(`${file} reads ${what}`);
  }
  assert.deepEqual(offenders, []);
  assert.equal(fs.existsSync(path.join(ROOT, 'gateway', 'verify-name-record.js')), false, 'the retired verifier is back');
  assert.match(fs.readFileSync(path.join(ROOT, 'gateway', 'index.html'), 'utf8'), /connect-src 'self' wss:\/\/nodes\.defxn\.com/, 'the CSP must let the shell reach the name node');
});
