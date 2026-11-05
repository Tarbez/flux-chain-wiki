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
import { connectSourcesFor } from '../gateway/vendor/dense-wire/flx-network-witnesses.mjs';
import { NETWORKS, PAGE_NETWORK } from '../gateway/vendor/dense-wire/fxn-network.mjs';

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
});

// Owner ruling 2026-11-05 (why this exists): round 14's witness change let these pages connect to wss://*.devnet.defxn.com
// so they could reach each seat's witness name. A wildcard admits every label under the domain, a user-published gateway
// site among them. Each page names the node host and each seat exactly, the list connectSourcesFor derives from the
// one network file, so a seat added there fails this test until the pages name it.
test('the shell and the site CSP name the network host and each witness seat exactly, with no wildcard', () => {
  const { sources } = connectSourcesFor(NETWORKS[PAGE_NETWORK].host);
  // The gateway shell left this list on 2026-11-05: it reaches no node at all (the assertion below).
  for (const file of ['index.html']) {
    const connect = (fs.readFileSync(path.join(ROOT, file), 'utf8').match(/connect-src ([^;]+);/) || [])[1] || '';
    assert.ok(!connect.includes('*'), `${file}: connect-src must never use a wildcard (${connect})`);
    for (const source of sources) assert.ok(connect.split(/\s+/).includes(source), `${file}: connect-src must name ${source} (${connect})`);
  }
  // Owner decision 2026-11-05: the shell reads names through the gateway's relay on its own origin, never the node.
  assert.match(fs.readFileSync(path.join(ROOT, 'gateway', 'index.html'), 'utf8'), /connect-src 'self';/, "the shell's CSP connects to its own origin only");
});
