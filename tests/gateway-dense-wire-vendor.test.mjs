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
const VENDOR = path.join(ROOT, 'gateway', 'vendor', 'dense-wire');
const FILES = ['flx-domain-proof.mjs', 'flx-dumb-parser.mjs', 'flx-builders.mjs', 'flx-crypto.mjs', 'flx-wire.mjs'];

function sourceDir() {
  return [process.env.DENSE_WIRE_WEB, path.resolve(ROOT, '..', 'defxn-defi-rs', 'dense-wire', 'web'), path.resolve(ROOT, '..', 'defxn-defi-rs-wt-names', 'dense-wire', 'web')]
    .filter(Boolean).find((dir) => fs.existsSync(path.join(dir, 'flx-domain-proof.mjs'))) || null;
}

test('the vendored dense-wire files are byte-identical to their source', () => {
  const source = sourceDir();
  assert.ok(source, 'no dense-wire/web with flx-domain-proof.mjs was found. Missing: flux/defxn-defi-rs (branch fix/one-name-system) beside this repo, or DENSE_WIRE_WEB. To fix: check it out, or set DENSE_WIRE_WEB.');
  for (const file of FILES) {
    assert.ok(fs.readFileSync(path.join(VENDOR, file)).equals(fs.readFileSync(path.join(source, file))), `${file} has drifted from ${path.join(source, file)}. To fix: copy the source file over the vendored one (never edit the copy).`);
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
