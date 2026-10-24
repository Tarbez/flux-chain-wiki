// Why this exists (2026-10-22 second review, rows 6 and 7): this repo's copy of dense-wire's parser kept
// the lenient "cut at the last -S" rule. Blocks appended AFTER a record's signature (`-C<target>`, `-D1`)
// verified though nobody signed them: a node, or anything on the wire, could add a record target the
// owner never set, or give an entry a second CID. The one rule: exactly ONE S block, and it is the LAST
// block (`text === prefix + "-S" + sig`). This file is a byte-for-byte copy of the shared parser with that
// rule (out/daemons-dense-wire-js-signature-final.patch on fix/one-name-system), never a second version.
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { signaturePrefix } from '../js/dense-wire/flx-dumb-parser.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// DENSE_WIRE_WEB points at a dense-wire/web checkout carrying the strict rule (until fix/one-name-system merges with the patch).
const WEB = process.env.DENSE_WIRE_WEB || path.resolve(HERE, '..', '..', 'defxn-defi-rs', 'dense-wire', 'web');

test('js/dense-wire/flx-dumb-parser.mjs is byte-identical to the shared parser', () => {
  const canonical = path.join(WEB, 'flx-dumb-parser.mjs');
  let source = null;
  try { source = readFileSync(canonical); } catch {}
  assert.ok(source, `${canonical} is missing. Missing: dense-wire's web parser. To fix: check out defxn-defi-rs beside this repo, or set DENSE_WIRE_WEB.`);
  assert.ok(readFileSync(new URL('../js/dense-wire/flx-dumb-parser.mjs', import.meta.url)).equals(source),
    `js/dense-wire/flx-dumb-parser.mjs differs from ${canonical}. Missing: the strict single-signature rule in the shared parser (out/daemons-dense-wire-js-signature-final.patch, applied on fix/one-name-system and merged). To fix: land that patch, then set DENSE_WIRE_WEB to that checkout or copy the canonical file over this one (never edit the copy).`);
});

test('a_block_after_the_signature_never_verifies', () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const g = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex');
  const unsigned = `G${g}-YROW-V1-M1700000000-H726f77-J7b7d-C${'0'.repeat(64)}`;
  const sig = sign(null, Buffer.from(unsigned), privateKey).toString('hex');
  const record = `${unsigned}-S${sig}`;
  const verifies = (text) => { try { return verify(null, Buffer.from(signaturePrefix(text)), publicKey, Buffer.from(sig, 'hex')); } catch { return false; } };
  assert.equal(signaturePrefix(record), unsigned);
  assert.equal(verifies(record), true);
  for (const appended of [`${record}-Xdeadbeef`, `${record}-D1`, `${record}-C${'ab'.repeat(32)}`, `${record}-S${sig}`]) {
    assert.equal(verifies(appended), false, appended.slice(-40));
    assert.throws(() => signaturePrefix(appended), /final block|S blocks/);
  }
});
