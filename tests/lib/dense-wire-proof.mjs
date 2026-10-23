/* Test helper (not a test; scripts/run-tests.mjs reads only files directly in tests/).
   Real, signed dense-wire name entries built with the gateway's VENDORED builders, so
   the name tests exercise the shared verifier on genuine and tampered proofs. */
import crypto from 'node:crypto';
import { buildDomainClaimWithSigner, buildDomainRecordUpdateWithSigner, buildDomainTransferWithSigner, GENESIS_PREV, RECORD_GENESIS_PREV } from '../../gateway/vendor/dense-wire/flx-builders.mjs';
import { sha256Hex } from '../../gateway/vendor/dense-wire/flx-crypto.mjs';
import { verifyDomainProof } from '../../gateway/vendor/dense-wire/flx-domain-proof.mjs';
import { isClaimableDomainName } from '../../gateway/vendor/dense-wire/flx-builders.mjs';
import { WireClient } from '../../gateway/vendor/dense-wire/flx-wire.mjs';

/** The vendored modules in the shape scripts/lib/dense-wire-modules.mjs loads them. */
export const dense = { WireClient, verifyDomainProof, isClaimableDomainName };

export function signer() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const pubHex = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex');
  const signBytes = async (bytes) => crypto.sign(null, Buffer.from(bytes), privateKey).toString('hex');
  return { pubHex, signBytes, signText: (text) => signBytes(new TextEncoder().encode(text)) };
}

/** A signer over a fxn-auth root handle (`publicKeyB64`, `sign(bytes)`), as dense-wire's builders expect. */
export function handleSigner(handle) {
  const pubHex = Buffer.from(handle.publicKeyB64, 'base64').toString('hex');
  const signBytes = async (bytes) => Buffer.from(await handle.sign(bytes)).toString('hex');
  return { pubHex, signBytes, signText: (text) => signBytes(new TextEncoder().encode(text)) };
}

/** A genesis claim for `fqdn`, then (with `transferTo`) a v1 transfer to that key, then
 *  (with `targets`) the current owner's record. Returns the entries, oldest first. */
export async function buildProof({ fqdn, genesis, targets = null, transferTo = null, nowSec = 1760000000 }) {
  const claim = await buildDomainClaimWithSigner({ signer: genesis, pos: 1, prevCid: GENESIS_PREV, fqdn, nowSec });
  const entries = [claim];
  let head = await sha256Hex(claim);
  let owner = genesis;
  if (transferTo) {
    const xfer = await buildDomainTransferWithSigner({ signer: genesis, pos: 2, prevCid: head, fqdn, priorEntryCid: head, newOwnerPubHex: transferTo.pubHex, nowSec: nowSec + 1 });
    entries.push(xfer);
    head = await sha256Hex(xfer);
    owner = transferTo;
  }
  if (targets) {
    entries.push(await buildDomainRecordUpdateWithSigner({ signer: owner, pos: 1, prevCid: GENESIS_PREV, fqdn, linkCid: head, priorRecordCid: RECORD_GENESIS_PREV, targets, nowSec: nowSec + 2 }));
  }
  return entries;
}

export const answers = {
  proof: (entries, node = 'ws://node-a') => async (fqdn) => ({ node, reply: { kind: 'proof', fqdn, entries }, failures: [] }),
  none: (node = 'ws://node-a') => async (fqdn) => ({ node, reply: { kind: 'none', fqdn }, failures: [] }),
  silent: () => async () => ({ node: null, reply: null, failures: ['ws://node-a: connection refused'] }),
};

export const tamper = (entry) => entry.replace(/-M(\d+)-/, (_, m) => `-M${Number(m) + 1}-`);
