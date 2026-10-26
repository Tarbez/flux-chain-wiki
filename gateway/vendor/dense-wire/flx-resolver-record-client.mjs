// A generic client for "launch my own resolver chain, then write/read
// one resolver-defined record kind on it via the fully generic
// Payload::ResolverRecord mechanism" — the exact shape
// flux-access-resolver's own dense-wire-client.mjs and mesh-registry's
// own dense-wire-client.mjs both hand-wrote independently for ACL
// evidence and PackageVersion respectively. Centralized here (WDS7,
// real deployment surfaces plan, "migrate the GUN-mesh products")
// because Bundle/Env/Repo/DB all need the IDENTICAL bootstrap/append/
// read mechanism, differing only in their own resolver chain id, kind
// marker, and what JSON they carry inline — writing that mechanism out
// by hand a fourth and fifth time would be exactly the "hand-patch the
// same logic in N repos" this workspace's own law forbids.
//
// mesh-registry's own dense-wire-client.mjs (Package, the first slice)
// was hand-written before this module existed; wave 4M moved it onto
// this factory, so all five product chains write, read and deploy
// through one mechanism.
//
// Wave 4M (the unified deployer and the GUN cutover) changed three things:
//
// 1. The payload is FLX, never JSON. `C[1]` is hex-of-UTF-8 of the
//    value's structured-state document (`flx-state-grammar.js`: one record
//    per leaf, the leaf's path as boxes, then one typed value box -- the
//    grammar derived from the value's own shape, the same one `.flx` kit
//    files write since `flx-kit-codec.mjs` v2). It is exact to the byte
//    against `JSON.stringify`, which every product needs: a name record's,
//    package version's or env record's own signature is computed over its
//    JSON serialization ("JSON is the hashing form, not the storage
//    form"). Hex-of-UTF-8 of a JSON document -- what every product bridge
//    wrote before the cutover -- is the retired `legacy-hex-json` envelope:
//    `decodeRecordPayload` still READS it (records are never rewritten),
//    and nothing here writes it.
// 2. A browser signer (`{pubHex, signText}`, `flx-identity-bridge.mjs`)
//    is accepted in place of a `CryptoKey`, so the deployer signs in the
//    page and holds no key.
// 3. The record admitted is the truth a product reads back: `readRecord`
//    recomputes the CID over the node's bytes, checks the record is this
//    chain's and this kind's, and decodes it; `prepareRecord` /
//    `submitRecord` are the deployer's path -- the chain must be launched
//    (`RESOLVER_LIST`) and the unsigned record must pass the chain's own
//    published grammar (`flx-record-grammar.mjs`, the node's rule) before
//    anything is signed, and what the node admitted is read back and
//    compared before success is reported.
//
// The grammar slot of the ResolverLaunch this client writes carries a
// REAL grammar manifest in its own grammar (`FLX-RESOLVER-GRAMMAR-V2`, published with
// BLOB_PUT_HEX because it spans lines; WARCH19), and the offer slot a real
// `FLX-RESOLVER-OFFER-V2` offer (`buildGenericRecordOfferManifest`), not the
// provider set it used to name. The provider-set and speed-params blobs are
// launch blobs another change is converting; they are written as before here. (B2, grammar-enforced
// ResolverRecord admission; `src/record_grammar.rs` and its mirror
// `flx-record-grammar.mjs`), built by `buildGenericRecordGrammarManifest`
// from the client's own `kindMarker` and the one record shape
// `buildResolverRecord` ever emits: the ledger-entry floor (G, Y, V, M,
// H, N, J, S), a `KK` closed set of exactly this client's kind, and two
// `C` blocks -- prev CID, then the inline payload as hex-of-UTF-8. Until
// B2 the slot held the speed-params blob as a placeholder, which the node
// reported as `unspecified` and enforced nothing against; now a node
// refuses any record on this chain that is not that shape. One
// consequence a consumer should know: `C` has the network's own 16-char
// floor, so a payload shorter than 8 bytes is refused -- a product's
// structured-state document is always far longer (one `K<hex key>` box per
// field).
//
// Relative imports, not the `@defxn/dense-wire-web` package name, same
// reasoning every other cross-repo dense-wire consumer in this
// workspace documents: no `npm install` runs across these sibling
// repos.
import { WireClient } from "./flx-wire.mjs";
import { buildGenesis, buildResolverLaunch, buildResolverRecordWithSigner, resolverRecordBody, isChainIdShape, GENESIS_PREV } from "./flx-builders.mjs";
import { cryptoKeySigner } from "./flx-identity-bridge.mjs";
import { sha256Hex } from "./flx-crypto.mjs";
import { hexOfUtf8, utf8OfHex } from "./flx-dumb-parser.mjs";
import { renderProviderSet, renderSpeedParams } from "./flx-launch-blobs.mjs";
import { compileGrammar, checkRecord, formatRefusal, grammarSummary } from "./flx-record-grammar.mjs";
import { grammarFromJson, offerFromJson } from "./flx-resolver-artifacts.mjs";
// Side-effect import: the vendored structured-state grammar (a UMD file
// shared byte-identical with ark-browser) sets `globalThis.ARK_FLX_STATE`
// -- the same way `flx-kit-codec.mjs` reaches it.
import "./flx-state-grammar.js";

export const BASE_CHAIN_ID = "defxn";

/**
 * The minimal grammar for a generic ResolverRecord chain, in its OWN grammar (`FLX-RESOLVER-GRAMMAR-V2`,
 * `flx-resolver-artifacts.mjs`; WARCH19: stored state is never JSON): one kind, the record shape
 * `buildResolverRecord` emits, nothing more. Payload classes and tighteners are the network registry's own for the
 * floor labels (G/Y/V/M/H/C/S as flux-spec's role-letters.json registers them; N and J as LEDGERENTRY's
 * letterExtensions narrow them, J simplified to `digits` the same way every derived resolver grammar in `resolvers/`
 * does). Returned as the V2 text, which spans lines: `WireClient.blobPut` publishes it with `BLOB_PUT_HEX`, so its
 * CID is the sha256 of exactly these bytes.
 * @param {{resolverChainId: string, kindMarker: string}} params
 * @returns {string}
 */
export function buildGenericRecordGrammarManifest({ resolverChainId, kindMarker }) {
  if (typeof kindMarker !== "string" || !/^K[A-Z0-9]+$/.test(kindMarker)) {
    throw new ResolverRecordClientError("RRC_BAD_KIND", `kindMarker must look like "KSOMETHING1" (got ${JSON.stringify(kindMarker)})`);
  }
  // The `KK` label is two characters (role K + the kind constant's own
  // leading K), so the closed-set value is the marker with that leading
  // K already consumed: "KBUNDLE1" -> "BUNDLE1". Same convention every
  // derived grammar in resolvers/ documents on its own KK entry.
  const kkValue = kindMarker.slice(1);
  return grammarFromJson({
    schema: "flx-resolver-grammar/1",
    resolver: resolverChainId,
    derivedBy: "dense-wire/web/flx-resolver-record-client.mjs",
    grammar: {
      own: true,
      profiles: {},
      actionVerbs: [],
      actionFlags: {},
      manifestTypes: [],
      roleTokens: [
        { letter: "G", payload: "opaque-alphanumeric", minLength: 32 },
        { letter: "Y", payload: "uppercase", pattern: "^[A-Z][A-Z0-9]*$" },
        { letter: "V", payload: "digits" },
        { letter: "M", payload: "digits" },
        { letter: "H", payload: "lowercase-hex", evenLength: true },
        { letter: "N", payload: "lowercase-alphanumeric", pattern: "^[a-z0-9]{3,32}$" },
        { letter: "KK", payload: "closed-set", values: [kkValue] },
        { letter: "J", payload: "digits" },
        { letter: "C", payload: "opaque-alphanumeric", minLength: 16 },
        { letter: "S", payload: "opaque-alphanumeric", minLength: 64 },
      ],
    },
    // prev CID + one inline payload: exactly two C blocks, no label
    // beyond the ledger-entry floor.
    kinds: { [kindMarker]: { cMin: 2, cMax: 2, requiredLabels: [] } },
  });
}

/**
 * The offer a generic ResolverRecord chain launches with, in its own grammar (`FLX-RESOLVER-OFFER-V2`): what the
 * chain's operator writes and what a reader can ask of it. A generic record chain composes no capability (no
 * `composes`, so nothing is audited), names no payee (it takes no payment) and declares no price. Before this the
 * launch committed the PROVIDER SET (a JSON array) as the offer, which no offer reader can read as an offer.
 * Deterministic: the same chain and kind give the same bytes and so the same CID (no date is written).
 * @param {{resolverChainId: string, kindMarker: string}} params
 * @returns {string}
 */
export function buildGenericRecordOfferManifest({ resolverChainId, kindMarker }) {
  if (typeof kindMarker !== "string" || !/^K[A-Z0-9]+$/.test(kindMarker)) {
    throw new ResolverRecordClientError("RRC_BAD_KIND", `kindMarker must look like "KSOMETHING1" (got ${JSON.stringify(kindMarker)})`);
  }
  return offerFromJson({
    schema: "flx-resolver-offer/1",
    resolver: resolverChainId,
    offers: [
      {
        name: "append-record",
        summary: `The chain's operator signs one ${kindMarker} record carrying a structured-state document; the node admits it only if it satisfies the chain's grammar.`,
        commands: ["RESOLVER_RECORD"],
        produces: kindMarker,
      },
      {
        name: "read-record",
        summary: "A record of this chain by its CID, or the chain's whole record list.",
        commands: ["RESOLVER_RECORD_GET", "RESOLVER_RECORDS"],
      },
    ],
    price: "none: a generic record chain declares no price",
  });
}

export class ResolverRecordClientError extends Error {
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.name = "ResolverRecordClientError";
    this.code = code;
  }
}

/** A refusal in the workspace's one shape -- the failure, what is
 *  missing, the remedy (`scripts/lib/refusal.mjs`'s law) -- under a code a
 *  caller can branch on. */
function refusal(code, failure, missing, remedy) {
  return new ResolverRecordClientError(code, formatRefusal({ failure, missing, remedy }));
}

function stateGrammar() {
  const g = globalThis.ARK_FLX_STATE;
  if (!g || typeof g.encodeState !== "function") {
    throw refusal("RRC_STATE_GRAMMAR_MISSING", "the structured-state grammar did not load", "flx-state-grammar.js beside this module", "vendor flx-state-grammar.js with flx-resolver-record-client.mjs (it is a side-effect import)");
  }
  return g;
}

/** A product value -> the FLX text carried (hex-of-UTF-8) in a record's
 *  `C[1]`: its structured-state document, one record per leaf. Exact to
 *  the byte against `JSON.stringify` (see the header, point 1). */
export function encodeRecordPayload(value) {
  const text = stateGrammar().encodeState(value);
  if (!text) {
    throw refusal("RRC_EMPTY_PAYLOAD", "there is nothing to carry", "a value JSON could serialize (an object, array, string, number, boolean or null)", "pass the product's canonical record");
  }
  return text;
}

/** The `C` blocks of a record, in order, excluding a `CHAIN` scope block
 *  (the Rust `Raw::c` rule). */
function cBlocks(text) {
  return String(text).split("-").filter((b) => b.startsWith("C") && !b.startsWith("CHAIN")).map((b) => b.slice(1));
}

function blockOf(text, prefix) {
  const block = String(text).split("-").find((b) => b.startsWith(prefix));
  return block === undefined ? null : block.slice(prefix.length);
}

/** A record's `C[1]` payload -> `{value, encoding}`. `encoding` is
 *  `"flx-state"` for everything this module writes, or
 *  `"legacy-hex-json"` for a record a product bridge wrote before the
 *  cutover (read, never written: records are never rewritten). Anything
 *  else is a refusal naming what was found. */
export function decodeRecordPayload(recordText) {
  const c1 = cBlocks(recordText)[1];
  if (c1 === undefined) {
    throw refusal("RRC_PAYLOAD_UNREADABLE", "the record carries no payload block", "a C[1] block (the payload, hex-of-UTF-8)", "read a ResolverRecord, not a launch or genesis entry");
  }
  let text;
  try {
    text = utf8OfHex(c1);
  } catch {
    throw refusal("RRC_PAYLOAD_UNREADABLE", "C[1] is not hex-of-UTF-8", "the payload's UTF-8 bytes, hex encoded", "write the record with this module's builder");
  }
  const first = text.trimStart()[0];
  if (first === "{" || first === "[" || first === '"') {
    try {
      return { value: JSON.parse(text), encoding: "legacy-hex-json" };
    } catch {
      // fall through: not JSON after all, so it must read as state records
    }
  }
  try {
    return { value: stateGrammar().decodeState(text), encoding: "flx-state" };
  } catch (e) {
    throw refusal("RRC_PAYLOAD_UNREADABLE", `the payload is neither structured-state FLX nor a pre-cutover JSON payload (${e.message})`, "a payload written by encodeRecordPayload", "write the record with this module's builder; a record is never rewritten, so a damaged one stays unreadable by name");
  }
}

/**
 * @param {object} params
 * @param {string} [params.wsUrl] - e.g. "ws://127.0.0.1:19501/native" for a
 *   non-browser (Node) caller, "/ws" for a real browser
 * @param {object} [params.wire] - an already-open `WireClient` (the
 *   deployer shares one connection across its forms); `wsUrl` otherwise
 * @param {string} [params.pubHex] - this resolver's own identity, with
 * @param {CryptoKey} [params.signingKey] - its own WebCrypto signing key
 *   (Node processes) -- OR
 * @param {{pubHex: string, signText: (text: string) => Promise<string>}} [params.signer]
 *   - a browser signer (`authKitSigner`), which never yields its key
 * @param {string} params.resolverChainId - 3-32 lowercase alphanumeric
 * @param {string} params.kindMarker - the `K` block value every record
 *   this client writes carries (e.g. "KBUNDLE1") — must be unique
 *   across every resolver kind this node will ever see. It is the one
 *   kind the chain's published grammar declares (see the header), so a
 *   node refuses any record on this chain carrying a different marker
 * @param {string} [params.carrierChainId] - defaults to the base chain
 */
export function createResolverRecordClient({
  wsUrl,
  wire: givenWire,
  pubHex,
  signingKey,
  signer: givenSigner,
  resolverChainId,
  kindMarker,
  carrierChainId = BASE_CHAIN_ID,
}) {
  if (!isChainIdShape(resolverChainId)) {
    throw new ResolverRecordClientError(
      "RRC_BAD_CHAIN_ID",
      `resolverChainId must be 3-32 lowercase alphanumeric (got ${JSON.stringify(resolverChainId)})`,
    );
  }
  if (typeof kindMarker !== "string" || !/^K[A-Z0-9]+$/.test(kindMarker)) {
    throw new ResolverRecordClientError("RRC_BAD_KIND", `kindMarker must look like "KSOMETHING1" (got ${JSON.stringify(kindMarker)})`);
  }
  const wire = givenWire ?? new WireClient(wsUrl);
  // One signer shape inside: a CryptoKey is adapted, a browser signer is
  // used as given. `null` when the caller only reads.
  const signer = givenSigner ?? (signingKey ? cryptoKeySigner({ privateKey: signingKey, pubHex }) : null);
  const signerPubHex = givenSigner ? givenSigner.pubHex : pubHex;

  function requireSigner(what) {
    if (!signer) {
      throw refusal("RRC_NO_SIGNER", `cannot ${what} without a signer`, "a signer ({pubHex, signText}) or a signingKey with its pubHex", "sign in, or construct the client with the resolver's own key");
    }
    return signer;
  }

  // Single writer per identity -- pos/prevCid tracked in-process,
  // seeded once from the live HEAD. Two processes sharing one identity
  // would race this; explicitly out of scope for a first working
  // version, same as every other client built on this program.
  let pos = null;
  let prevCid = null;
  let bootstrapped = false;

  async function nextWrite(buildText) {
    const text = await buildText(pos, prevCid);
    const reply = await wire.submit(tagFor(text, kindMarker), text);
    if (reply.kind !== "ok") {
      throw new ResolverRecordClientError(
        "RRC_WRITE_REFUSED",
        `dense-wire refused the write: ${reply.code ?? ""} ${reply.reason ?? JSON.stringify(reply)}`.trim(),
      );
    }
    pos += 1;
    prevCid = reply.cid;
    return reply;
  }

  /** Ensure this identity has a genesis entry and its own resolver
   *  chain is launched. Idempotent — an already-launched chain's own
   *  repeat ResolverLaunch is refused (ChainIdTaken) and treated as
   *  success. A product's operator process does this; the deployer never
   *  launches a product chain (it refuses an unlaunched one instead). */
  async function bootstrap({ nowSec = () => Math.floor(Date.now() / 1000) } = {}) {
    if (bootstrapped) return;
    if (!signingKey) {
      throw refusal("RRC_NO_SIGNER", "only the chain's operator launches it", "the operator's signingKey (a WebCrypto CryptoKey)", "launch the product chain from its own process; the deployer only writes to launched chains");
    }
    const headReply = await wire.head(pubHex);
    if (headReply.kind === "none") {
      pos = 0;
      prevCid = GENESIS_PREV;
      await nextWrite(() => buildGenesis({ privateKey: signingKey, pubHex, nowSec: nowSec() }));
    } else {
      pos = headReply.length;
      prevCid = headReply.cid;
    }

    // WARCH19 step 5: each launch blob is written in its own grammar (flx-launch-blobs.mjs), one line for BLOB_PUT.
    const providerSetCid = (await wire.blobPut(renderProviderSet([pubHex]))).cid;
    const speedParamsCid = (
      await wire.blobPut(renderSpeedParams({ requiredK: 1, segmentIntervalSecs: 30, maxLinesPerSegment: 256 }))
    ).cid;
    // The real grammar this chain's records are admitted against (see
    // the header): the node compiles it at launch and refuses anything
    // off-shape; the explorer compiles the same bytes and shows the
    // same verdict per row.
    const grammarManifestCid = (await wire.blobPut(buildGenericRecordGrammarManifest({ resolverChainId, kindMarker }))).cid;
    // The offer in ITS grammar too (it used to be the provider set, a JSON array, which no offer reader reads as an offer).
    const offerManifestCid = (await wire.blobPut(buildGenericRecordOfferManifest({ resolverChainId, kindMarker }))).cid;
    await nextWrite((p, prev) =>
      buildResolverLaunch({
        privateKey: signingKey,
        pubHex,
        pos: p,
        prevCid: prev,
        carrierChainId,
        newChainId: resolverChainId,
        providerSetCid,
        speedParamsCid,
        offerManifestCid,
        grammarManifestCid,
        controlKeyHex: pubHex,
        nowSec: nowSec(),
      }),
    ).catch((err) => {
      if (/already activated|replay|ChainIdTaken/i.test(err.message)) return;
      throw err;
    });

    bootstrapped = true;
  }

  /** Write one record, `payload` carried inline as its structured-state
   *  FLX document (hex-of-UTF-8 in `C[1]`; see the header). The operator
   *  path: bootstraps first. Returns the node's reply (`{kind:"ok", cid}`);
   *  a product reads the admitted record back with `readRecord(cid)`. */
  async function appendRecord(payload, { nowSec = () => Math.floor(Date.now() / 1000) } = {}) {
    await bootstrap();
    const inlinePayload = encodeRecordPayload(payload);
    return nextWrite((p, prev) =>
      buildResolverRecordWithSigner({
        signer: requireSigner("write a record"),
        pos: p,
        prevCid: prev,
        resolverChainId,
        kindMarker,
        inlinePayload,
        nowSec: nowSec(),
      }),
    );
  }

  /** Fetch a previously-written record back by its own cid. Returns
   *  `{chainId, text}` or `null` on a miss — never trusted as true on
   *  its own; the caller re-verifies whatever signature/authorization
   *  its own record shape carries. */
  async function getRecord(cid) {
    const reply = await wire.resolverRecordGet(cid);
    if (reply.kind !== "found") return null;
    return { chainId: reply.chainId, text: reply.text };
  }

  /** Check one record text is this chain's and this kind's, and decode it. */
  async function decodeOwn(cid, chainId, text) {
    if ((await sha256Hex(text)) !== cid) {
      throw refusal("RRC_READBACK_MISMATCH", `the node's copy of ${cid} does not hash to that cid`, "the exact bytes the cid addresses", "read it from another node; never trust a record whose bytes do not match its address");
    }
    const n = blockOf(text, "N");
    const k = blockOf(text, "KK");
    if (chainId !== resolverChainId || n !== resolverChainId || `K${k}` !== kindMarker) {
      throw refusal("RRC_FOREIGN_RECORD", `${cid} is a ${k === null ? "non-record" : `K${k}`} record of chain ${n ?? chainId}`, `a ${kindMarker} record of chain ${resolverChainId}`, "read it with the client of the chain and kind it belongs to");
    }
    const { value, encoding } = decodeRecordPayload(text);
    return { cid, chainId, text, value, encoding, signer: blockOf(text, "G"), atSec: Number(blockOf(text, "M")), pos: Number(blockOf(text, "J")) };
  }

  /** The record at `cid` as the product's truth: `{cid, chainId, text,
   *  value, encoding, signer, atSec, pos}`, or `null` when this node holds
   *  nothing there. Refuses (never returns) a record whose bytes do not
   *  hash to `cid`, or that belongs to another chain or kind. The record's
   *  outer signature is the node's admission check; a product verifies its
   *  own inner proof on `value`. */
  async function readRecord(cid) {
    const reply = await wire.resolverRecordGet(cid);
    if (reply.kind === "miss") return null;
    if (reply.kind !== "found") {
      throw refusal("RRC_READ_FAILED", `the node did not answer RESOLVER_RECORD_GET for ${cid}`, "a RESOLVER_RECORD_FOUND or RESOLVER_RECORD_MISS reply", "check the node is reachable and runs RESOLVER_RECORD_GET");
    }
    return decodeOwn(cid, reply.chainId, reply.text);
  }

  /** Every record of this kind on this chain, oldest first, decoded (the
   *  chain's launch and any other kind are skipped, not refused). The node
   *  orders by each record's own `M` second; inside one second its order is
   *  not a time order, so ties are broken by the signer's own position `J`
   *  (exact for one signer; for two signers in one second nothing orders
   *  them, and this picks one deterministically rather than claim one). */
  async function listRecords() {
    const reply = await wire.resolverRecords(resolverChainId);
    if (reply.kind !== "records") {
      throw refusal("RRC_READ_FAILED", `the node did not list chain ${resolverChainId}`, "a RESOLVER_RECORDS reply with its declared count", "check the node runs RESOLVER_RECORDS");
    }
    const out = [];
    for (const row of reply.rows) {
      if (blockOf(row.text, "KK") !== kindMarker.slice(1)) continue;
      out.push(await decodeOwn(row.cid, resolverChainId, row.text));
    }
    return out.sort((a, b) => a.atSec - b.atSec || a.pos - b.pos);
  }

  let compiled = null;
  /** The chain's launched declaration and its compiled grammar, from the
   *  node's own RESOLVER_LIST and BLOB_GET; refusals name what is missing. */
  async function targetGrammar() {
    const list = await wire.resolverList();
    if (list.kind !== "list") {
      throw refusal("RRC_READ_FAILED", "the node did not answer RESOLVER_LIST", "the registry's list of launched resolvers", "check the node is reachable");
    }
    const row = list.resolvers.find((r) => r.chainId === resolverChainId);
    if (!row) {
      throw refusal("RRC_CHAIN_NOT_LAUNCHED", `chain ${resolverChainId} is not launched on this node`, `a ResolverLaunch for ${resolverChainId} (RESOLVER_LIST lists ${list.resolvers.length} chain(s), none of them it)`, `launch ${resolverChainId} from the product's own process, or pick a launched chain whose grammar declares ${kindMarker}`);
    }
    const blob = await (wire.blobGetText ?? wire.blobGet).call(wire, row.grammarManifestCid);
    if (blob.kind !== "found") {
      throw refusal("RRC_GRAMMAR_MISSING", `this node does not hold chain ${resolverChainId}'s grammar manifest ${row.grammarManifestCid}`, "the grammar blob the launch names", "ask the chain's operator to re-publish it (BLOB_PUT), or use a node that holds it");
    }
    let grammar;
    try {
      grammar = compileGrammar(blob.text);
    } catch (e) {
      throw refusal("RRC_GRAMMAR_REFUSED", `chain ${resolverChainId}'s grammar manifest does not compile (${e.message})`, "a readable flx-resolver-grammar/1 manifest", "upgrade the resolver with a grammar derived by scripts/derive-resolver-grammar.mjs");
    }
    if (grammar.kind === "unspecified") {
      throw refusal("RRC_GRAMMAR_UNSPECIFIED", `chain ${resolverChainId}'s grammar is unspecified (${grammar.reason}): the node would admit any record unchecked, so nothing can be checked before signing`, `an flx-resolver-grammar/1 manifest declaring ${kindMarker}`, `upgrade ${resolverChainId} with a grammar that declares ${kindMarker}, or deploy to a chain launched with one`);
    }
    compiled = { cid: row.grammarManifestCid, grammar, summary: grammarSummary(grammar) };
    return compiled;
  }

  function checkAgainst({ grammar }, text) {
    const verdict = checkRecord(grammar, text);
    if (!verdict.ok) {
      throw refusal("RRC_GRAMMAR_REFUSED", `chain ${resolverChainId}'s grammar refuses this record: ${verdict.failure}`, verdict.missing, verdict.remedy);
    }
  }

  /** The deployer's first step: check the chain is launched and its own
   *  grammar admits this record, then return the exact unsigned body at
   *  the signer's next position and a `sign()` that signs that body and
   *  nothing else. Nothing is signed or sent here. */
  async function prepareRecord(value, { nowSec = Math.floor(Date.now() / 1000) } = {}) {
    const who = requireSigner("prepare a record");
    const target = await targetGrammar();
    const headReply = await wire.head(who.pubHex);
    if (headReply.kind !== "none" && headReply.kind !== "head") {
      throw refusal("RRC_READ_FAILED", `the node did not answer HEAD for ${who.pubHex}`, "the signer's own chain head (its next position)", "check the node is reachable");
    }
    const at = headReply.kind === "head" ? { pos: headReply.length, prevCid: headReply.cid } : { pos: 0, prevCid: GENESIS_PREV };
    const payloadText = encodeRecordPayload(value);
    const args = { pos: at.pos, prevCid: at.prevCid, resolverChainId, kindMarker, inlinePayload: payloadText, nowSec };
    const unsignedBody = resolverRecordBody({ pubHex: who.pubHex, ...args });
    // The signature is not known yet; the S rule (opaque, at least 64
    // characters) is checked with a placeholder of a real signature's
    // length, every other block exactly as it will be signed.
    checkAgainst(target, `${unsignedBody}-S${"0".repeat(128)}`);
    return {
      chainId: resolverChainId,
      kindMarker,
      grammar: { cid: target.cid, summary: target.summary },
      pos: at.pos,
      prevCid: at.prevCid,
      payloadText,
      unsignedBody,
      sign: () => buildResolverRecordWithSigner({ signer: who, ...args }),
    };
  }

  /** The deployer's last step: check the signed record against the same
   *  grammar, submit it as a RESOLVER_RECORD, then read what the node
   *  admitted back by cid and (with `expectValue`) refuse unless it decodes
   *  to exactly that value. Returns `readRecord`'s shape. */
  async function submitRecord(signedText, { expectValue } = {}) {
    checkAgainst(compiled ?? (await targetGrammar()), signedText);
    const reply = await wire.submit("RESOLVER_RECORD", signedText);
    if (reply.kind !== "ok") {
      throw refusal("RRC_WRITE_REFUSED", `the node refused the record: ${`${reply.code ?? ""} ${reply.reason ?? reply.raw ?? ""}`.trim()}`, "a record the node admits", "read the node's reason above; prepare again if your chain position moved");
    }
    let admitted;
    try {
      admitted = await readRecord(reply.cid);
    } catch (e) {
      if (e instanceof ResolverRecordClientError && e.code === "RRC_FOREIGN_RECORD") {
        throw refusal("RRC_READBACK_MISMATCH", `the record the node holds at ${reply.cid} is not the one submitted (${e.message})`, "the submitted record at the cid the node answered with", "read it from another node before relying on it");
      }
      throw e;
    }
    if (!admitted || admitted.text !== signedText) {
      throw refusal("RRC_READBACK_MISMATCH", `the node answered ${reply.cid} but does not return the submitted record there`, "the admitted record, byte for byte", "read it from another node before relying on it");
    }
    if (expectValue !== undefined && JSON.stringify(admitted.value) !== JSON.stringify(expectValue)) {
      throw refusal("RRC_READBACK_MISMATCH", "the admitted record decodes to a different value than the one signed", "a payload exact to the byte against JSON.stringify", "this is a codec defect; report it with the record's cid");
    }
    return admitted;
  }

  function close() {
    wire.close();
  }

  return { bootstrap, appendRecord, getRecord, readRecord, listRecords, prepareRecord, submitRecord, close, kindMarker, resolverChainId, signerPubHex, _wire: wire };
}

function tagFor(text, kindMarker) {
  if (/-KKRESOLV1-/.test(text)) return "RESOLVER_LAUNCH";
  if (new RegExp(`-K${kindMarker}-`).test(text)) return "RESOLVER_RECORD";
  if (!/-K[A-Z]/.test(text)) return "GENESIS";
  throw new ResolverRecordClientError("RRC_UNKNOWN_TAG", "could not infer PayloadTag from built record");
}
