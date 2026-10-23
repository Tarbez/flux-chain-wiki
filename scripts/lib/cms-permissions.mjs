/* CMS permission is independent of identity proof and publishing connectivity.
   Who may edit a site is who OWNS its name on the dense-wire name chain, the one
   name system (docs/DEFXN-NAMES-ONE-SYSTEM.md): the name's DOM_PROOF is read from
   a name node and verified with the ONE shared verifier against the pinned genesis
   key, and the signed-in key must be the owner it names. Nothing here trusts the
   node, and nothing reads the retired Explorer `names` source (GUN names/*), which
   this file read until 2026-10-23.

   An empty chain is never a first-claim grant -- TO A STRANGER. The one exception
   is a pre-declared, operator-configured firstOwnerPublicKeyB64: the fleet
   operator's own key, set before the admin is ever exposed publicly, so the real
   owner can edit a site whose name is not claimed yet without a chicken-and-egg
   problem, while an unclaimed name still grants nothing to anyone else who happens
   to sign in first. Once the name is claimed, this bootstrap path never applies
   again: authority comes only from the verified chain from then on.

   Options: `nameNodes` (chain-server WebSocket URLs, asked in order; default
   DEFXN_NAME_NODES as a comma list, else DEFXN_NAME_NODE, else
   wss://nodes.defxn.com/native, the route for a client that sends no Origin header, as
   this Node process does) and `genesisPubHex` (default CHAIN_SERVER_GENESIS_KEY). Ask
   more than one node: one can withhold a newer transfer. `publicBase` is accepted and ignored:
   it named the retired Explorer, and scripts/publish-host.mjs still passes it.
   `dense` / `askProof` replace the loaded modules and the node round trip (tests). */
import { SessionRefusal } from './admin-session.mjs';
import { loadDenseWire, askDomainProof } from './dense-wire-modules.mjs';

export const DEFAULT_NAME_NODES = Object.freeze(['wss://nodes.defxn.com/native']);

export function nameNodesFromEnv(env = process.env) {
  const list = String(env.DEFXN_NAME_NODES || env.DEFXN_NAME_NODE || '').split(',').map((s) => s.trim()).filter((s) => /^wss?:\/\//.test(s));
  return list.length ? list : [...DEFAULT_NAME_NODES];
}
export const NAME_AUTHORITY_URL = 'https://domains.defxn.com';
const HEX64 = /^[0-9a-f]{64}$/;

/* A signed-in identity key (base64 of the raw 32-byte Ed25519 key) as the chain spells it. */
export function keyHexOf(publicKeyB64) {
  try {
    const bytes = Buffer.from(String(publicKeyB64 || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    return bytes.length === 32 ? bytes.toString('hex') : null;
  } catch {
    return null;
  }
}

export function createCmsPermissions({ name, firstOwnerPublicKeyB64 = null, nameNodes = nameNodesFromEnv(), genesisPubHex = process.env.CHAIN_SERVER_GENESIS_KEY || '', dense = null, askProof = null, publicBase = undefined } = {}) {
  void publicBase;
  /* The name RULE is the chain's own (isClaimableDomainName), applied once the modules load. */
  const normalized = String(name || '').trim().toLowerCase();
  const genesis = String(genesisPubHex || '').trim().toLowerCase();

  return async function authorize(key) {
    const keyHex = keyHexOf(key);
    if (!keyHex) throw new SessionRefusal('Signed in, but the identity key is not a raw Ed25519 public key.', 'a 32-byte public key as base64.', 'sign in with a Flux identity.', 403);
    if (!HEX64.test(genesis)) throw new SessionRefusal('Signed in, but site ownership cannot be verified: no genesis key is pinned.', "the chain's genesis public key (64 hex), the only key whose name claims count.", 'set CHAIN_SERVER_GENESIS_KEY (or pass genesisPubHex) to the key your chain-server runs with.', 503);

    let modules;
    try {
      modules = dense || await loadDenseWire();
    } catch (error) {
      throw new SessionRefusal(`Signed in, but site ownership cannot be read: ${error.failure || error.message}`, error.missing || "dense-wire's web modules.", error.remedy || 'check out defxn-defi-rs beside this repo.', 503);
    }
    if (!modules.isClaimableDomainName(normalized)) throw new SessionRefusal(`Signed in, but ${JSON.stringify(normalized)} is not a name the one name system carries.`, 'a flat site name: one label plus .fxn, .ark or .deadark.', 'start the host with a name such as defxn.fxn.', 503);
    const asked = askProof ? await askProof(normalized) : await askDomainProof({ nodes: nameNodes, fqdn: normalized, dense: modules });
    if (!asked?.reply) {
      const failures = Array.isArray(asked?.failures) && asked.failures.length ? asked.failures.join('; ') : 'no node answered';
      throw new SessionRefusal(`Signed in, but the name node did not answer for ${normalized} (${failures}).`, 'a reachable chain-server.', 'set DEFXN_NAME_NODES to chain-servers you can reach (wss://nodes.defxn.com/native, or ws://127.0.0.1:<port>/native locally).', 503);
    }
    const { node, reply } = asked;
    if (reply.kind === 'none') {
      /* No owner on the chain. Grant only to the operator's own pre-declared key -- never to
         "whoever signs in first", which would let a stranger squat the name on a public admin. */
      if (firstOwnerPublicKeyB64 && key === firstOwnerPublicKeyB64) {
        return { authorized: true, source: 'first-owner-bootstrap', firstClaim: true };
      }
      throw new SessionRefusal(`Signed in, but no such name: the dense-wire name chain holds no owner for ${normalized}.`, `a claim for ${normalized}.`, `claim it through ${NAME_AUTHORITY_URL} with the maintainer identity.`, 403);
    }
    if (reply.kind !== 'proof') {
      throw new SessionRefusal(`Signed in, but ${node} answered DOM_PROOF ${normalized} with something that is not a proof (${reply.reason || reply.kind}).`, 'a DOM_PROOF reply.', 'ask another node (DEFXN_NAME_NODES).', 503);
    }
    const verified = await modules.verifyDomainProof({ fqdn: normalized, entries: reply.entries, genesisPubHex: genesis });
    if (verified.kind !== 'verified') {
      /* Refused by name: a proof that does not verify authorizes nobody. */
      throw new SessionRefusal(`Signed in, but the ownership proof for ${normalized} does not verify (${verified.code}): ${verified.failure}`, verified.missing, verified.remedy, 403);
    }
    if (verified.owner !== keyHex) {
      throw new SessionRefusal(`Signed in, but the chain does not verify this identity as the site owner: ${normalized} is owned by ${verified.owner}.`, "the owner's own key, or a transfer of the name to this key.", `sign in as the verified owner, or transfer ${normalized} at ${NAME_AUTHORITY_URL}; do not use cached identity details as permission.`, 403);
    }
    return { authorized: true, source: 'dense-wire-domain-proof', ownerEntryCid: verified.ownerEntryCid, node };
  };
}
