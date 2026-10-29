/* A name, as the dense-wire name chain holds it, verified. Pure: no DOM, so it is
   tested in Node (tests/gateway-name-resolve.test.mjs) and used by app.js.

   The shell asks a node `DOM_PROOF <name>` and verifies the answer with the ONE
   shared verifier (vendor/dense-wire/flx-domain-proof.mjs, vendored byte for byte;
   tests/gateway-dense-wire-vendor.test.mjs keeps it that way) against the pinned
   genesis key. The node is not trusted: a proof that does not verify is refused by
   name, a name the chain does not hold is "no such name", and nothing falls back to
   the retired names/* registry (the Explorer `names` source this shell read until
   2026-10-23).

   The network decides the ending (2026-10-29, docs/FXN-NAME-RENT-DESIGN.md): `.fxn` on
   fxn-mainnet, `.fxndev` on every test network, from the shared `nameEnding`. The network
   is name-config.js NETWORK when set, else the first node's BUILD_INFO. The verifier gets
   the network and the clock, so a name in its grace or lapsed is refused by name and its
   site is never shown. */
import { WireClient } from "./vendor/dense-wire/flx-wire.mjs";
import { verifyDomainProof } from "./vendor/dense-wire/flx-domain-proof.mjs";
import { isClaimableDomainName, nameEnding } from "./vendor/dense-wire/flx-builders.mjs";

export const NAME_AUTHORITY_URL = "https://domains.defxn.com";

function describe(error) {
  if (error && typeof error.message === "string" && error.message) return error.message;
  if (error && typeof error.type === "string") return `${error.type} event`;
  return String(error);
}

/** Close a wire client, including a socket its reply timeout reopened (`_send`'s timeout
 *  reconnects, so `close()` alone would leave that new socket open). */
export function closeWireClient(client) {
  try { client.close(); } catch {}
  const pending = client.ready;
  if (pending && typeof pending.then === "function") pending.then(() => { try { client.close(); } catch {} }, () => {});
}

/** The network this shell serves and its one ending: `network` when pinned, else the first node whose
 *  BUILD_INFO names one (its fifth field).
 *  -> { ok: true, network, ending, from } | { ok: false, reason: "NAME_UNRESOLVABLE", detail } */
export async function servedNetwork({ network = "", nodes = [], wireClient = (url) => new WireClient(url) } = {}) {
  if (network) return { ok: true, network, ending: nameEnding(network), from: "pin" };
  const failures = [];
  for (const url of nodes) {
    const client = wireClient(url);
    try {
      await client.ready;
      const fields = String(await client.send("BUILD_INFO\t")).trim().split("\t");
      if (fields[0] === "BUILD_INFO" && /^fxn-[a-z0-9-]+$/.test(fields[4] ?? "")) return { ok: true, network: fields[4], ending: nameEnding(fields[4]), from: url };
      failures.push(`${url}: names no network in BUILD_INFO`);
    } catch (error) {
      failures.push(`${url}: ${describe(error)}`);
    } finally {
      closeWireClient(client);
    }
  }
  return { ok: false, reason: "NAME_UNRESOLVABLE", detail: `No name node said which network it runs (${failures.join("; ") || "no node is configured"}). The gateway's operator can pin it in gateway/name-config.js (NETWORK).` };
}

/** Ask the nodes in order; the first that answers wins (DOM_NONE is an answer).
 *  Checks nothing. -> { node, reply, failures } or { node: null, reply: null, failures } */
export async function askDomainProof({ nodes, fqdn, wireClient = (url) => new WireClient(url) } = {}) {
  const failures = [];
  for (const url of nodes) {
    const client = wireClient(url);
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

/** -> { ok: true, name, owner, ownerEntryCid, record: { cid, targets, updatedAt } | null,
 *       source, notChecked }
 *    | { ok: false, reason, detail }   reason is one of app.js's FAILURE_MESSAGES keys */
export async function resolveName({ name, nodes, genesisPubHex, network, nowSec = Math.floor(Date.now() / 1000), askProof = null } = {}) {
  if (!isClaimableDomainName(name)) {
    return { ok: false, reason: "NAME_NOT_FOUND", detail: `${name} is not a name the chain carries: one label plus .fxn or .fxndev.` };
  }
  if (!network) {
    return { ok: false, reason: "GATEWAY_NOT_CONFIGURED", detail: "This gateway does not know which network it serves, so it cannot tell which ending is its own. Pin it in gateway/name-config.js (NETWORK)." };
  }
  if (!name.endsWith(`.${nameEnding(network)}`)) {
    return { ok: false, reason: "NAME_WRONG_ENDING", detail: `${name} is not a name of ${network}, which serves .${nameEnding(network)} names only. Open it on the network that serves its ending.` };
  }
  if (!/^[0-9a-f]{64}$/.test(genesisPubHex || "")) {
    return { ok: false, reason: "GATEWAY_NOT_CONFIGURED", detail: "This gateway has no genesis key pinned (gateway/name-config.js, GENESIS_PUB_HEX), so it cannot tell a real owner from a forged one." };
  }
  const asked = askProof ? await askProof(name) : await askDomainProof({ nodes, fqdn: name });
  if (!asked?.reply) {
    const failures = Array.isArray(asked?.failures) && asked.failures.length ? asked.failures.join("; ") : "no node answered";
    return { ok: false, reason: "NAME_UNRESOLVABLE", detail: `No name node answered (${failures}).` };
  }
  const { node, reply } = asked;
  if (reply.kind === "none") {
    return { ok: false, reason: "NAME_NOT_FOUND", detail: `The name chain holds no owner for ${name}. Claim it at ${NAME_AUTHORITY_URL}.` };
  }
  if (reply.kind !== "proof") {
    return { ok: false, reason: "NAME_UNRESOLVABLE", detail: `${node} answered with something that is not a proof (${reply.reason || reply.kind}).` };
  }
  const verified = await verifyDomainProof({ fqdn: name, entries: reply.entries, genesisPubHex, network, nowSec });
  if (verified.kind === "refused" && (verified.code === "InGrace" || verified.code === "Lapsed")) {
    /* Past its paid term: the page says so and who may act, and never renders the site. */
    const reason = verified.code === "InGrace" ? "NAME_UNPAID" : "NAME_LAPSED";
    return { ok: false, reason, detail: `${verified.failure} Missing: ${verified.missing} To fix: ${verified.remedy} (${NAME_AUTHORITY_URL})`, term: verified.term };
  }
  if (verified.kind !== "verified") {
    /* Refused by name: the page never renders what a bad proof points at. */
    return { ok: false, reason: "PROOF_INVALID", detail: `${verified.failure} Missing: ${verified.missing} To fix: ${verified.remedy}` };
  }
  return { ok: true, name, owner: verified.owner, ownerEntryCid: verified.ownerEntryCid, record: verified.record, term: verified.term, source: node, notChecked: verified.notChecked };
}
