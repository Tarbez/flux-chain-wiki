/* The dense-wire web modules this site's Node-side scripts read names with: the wire
   client (DOM_PROOF over a chain-server's WebSocket line protocol) and the ONE shared
   proof verifier. Loaded once, from the defxn-defi-rs checkout beside this repo (its
   fix/one-name-system branch until it merges), or from DENSE_WIRE_WEB. A missing
   checkout is a refusal that names it; nothing here is a second copy of the verifier.
   scripts/lib/publisher.mjs loads the same files its own way (another session's change,
   2026-10-22); point it here once both land. */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const CANDIDATES = [
  process.env.DENSE_WIRE_WEB ? pathToFileURL(process.env.DENSE_WIRE_WEB.replace(/\/?$/, '/')) : null,
  new URL('../../../defxn-defi-rs/dense-wire/web/', import.meta.url),
  new URL('../../../defxn-defi-rs-wt-names/dense-wire/web/', import.meta.url),
].filter(Boolean);

export class DenseWireMissing extends Error {
  constructor(failure, missing, remedy) {
    super(`${failure} Missing: ${missing} To fix: ${remedy}`);
    this.name = 'DenseWireMissing';
    this.failure = failure; this.missing = missing; this.remedy = remedy;
  }
}

/** The directory the modules are read from, or null. */
export function denseWireWebDir() {
  return CANDIDATES.find((dir) => fs.existsSync(new URL('flx-domain-proof.mjs', dir))) || null;
}

let loaded = null;
export async function loadDenseWire() {
  if (!loaded) {
    loaded = (async () => {
      const dir = denseWireWebDir();
      if (!dir) throw new DenseWireMissing('The one name system cannot be read from this checkout.', `dense-wire's web modules (flx-wire.mjs, flx-domain-proof.mjs, flx-builders.mjs) at ${CANDIDATES.map((c) => c.pathname).join(' or ')}.`, 'check out defxn-defi-rs beside this repo with the fix/one-name-system branch merged, or set DENSE_WIRE_WEB.');
      const [wire, proof, builders] = await Promise.all(['flx-wire.mjs', 'flx-domain-proof.mjs', 'flx-builders.mjs'].map((file) => import(new URL(file, dir).href)));
      return { dir, WireClient: wire.WireClient, verifyDomainProof: proof.verifyDomainProof, isClaimableDomainName: builders.isClaimableDomainName };
    })().catch((error) => { loaded = null; throw error; });
  }
  return loaded;
}

function describe(error) {
  if (error && typeof error.message === 'string' && error.message) return error.message;
  if (error && typeof error.type === 'string') return `${error.type} event`;
  return String(error);
}

/** Close a wire client, including a socket its reply timeout reopened (`_send`'s timeout
 *  reconnects, so `close()` alone would leave that new socket open). */
export function closeWireClient(client) {
  try { client.close(); } catch { /* already closed */ }
  const pending = client.ready;
  if (pending && typeof pending.then === 'function') pending.then(() => { try { client.close(); } catch { /* already closed */ } }, () => {});
}

/** Ask the nodes in order for a name's DOM_PROOF; the first answer wins (DOM_NONE is an
 *  answer). Checks nothing. -> { node, reply, failures } or { node: null, reply: null, failures } */
export async function askDomainProof({ nodes, fqdn, dense = null } = {}) {
  const { WireClient } = dense || await loadDenseWire();
  const failures = [];
  for (const url of nodes) {
    const client = new WireClient(url);
    try {
      await client.ready;
      const reply = await client.domProof(fqdn);
      return { node: url, reply, failures };
    } catch (error) {
      failures.push(`${url}: ${describe(error)}`);
    } finally {
      closeWireClient(client);
    }
  }
  return { node: null, reply: null, failures };
}
