// WARCH19 step 5: the launch blobs, each in ITS OWN grammar -- the JS twin of `src/launch_blobs.rs`. Both are pinned
// to `test/fixtures/launch-blobs.txt` byte for byte (web/test/launch-blobs.test.mjs here, `launch_blobs_tests.rs` there).
//
// A launch commits to each blob by CID (sha256 of the stored bytes), so a blob is stored exactly as rendered. Every
// blob is ONE line of TAB-separated fields (so `BLOB_PUT` publishes it), led by a header word naming the blob and its
// version:
//
//   FLX-PROVIDER-SET-V1  TAB <pubkey> {TAB <pubkey>}              lowercase hex, 64 chars each
//   FLX-STAKE-INPUTS-V1  TAB <cid> {TAB <cid>}                    lowercase hex, 64 chars each
//   FLX-SPEED-PARAMS-V1  TAB label TAB count ...                  requiredK, segmentIntervalSecs, maxLinesPerSegment, minBondTermSecs
//   FLX-TOKEN-SPEC-V1    TAB label TAB value ...                  symbol, totalSupply, distributedSupply, computeRewardResolverCid,
//                                                                 economyCid, fairLaunchSecs, walletCapBps, creatorBond, feePips, genesisCid
//   FLX-MINT-PARAMS-V1   TAB label TAB value ...                  treasuryKey, distributedSupply, computeReserveSupply
//
// Labels are closed and ordered, each at most once. A count is `0` or a decimal without leading zeros that fits u64; a
// hex field is exactly 64 lowercase hex characters; a symbol is A-Z and 0-9. No field is free text, so none is hex-of-
// UTF-8 (a grammar that gains a free-text field must carry it as hex-of-UTF-8). This is NOT the structured-state
// grammar: the owner's 2026-10-20 correction names that as the wrong tool for these.
//
// Readers read JSON (on chain forever, unchanged verdicts) AND the blob's own grammar, and refuse anything else by name:
// the failure, the missing thing, the remedy. Writers write only the new form.

export const PROVIDER_SET_HEADER = "FLX-PROVIDER-SET-V1";
export const STAKE_INPUTS_HEADER = "FLX-STAKE-INPUTS-V1";
export const SPEED_PARAMS_HEADER = "FLX-SPEED-PARAMS-V1";
export const TOKEN_SPEC_HEADER = "FLX-TOKEN-SPEC-V1";
export const MINT_PARAMS_HEADER = "FLX-MINT-PARAMS-V1";

const COUNT = "count";
const HEX64 = "hex64";
const SYMBOL = "symbol";

/** kind -> { header, noun, list: rule } | { header, noun, labels: [[label, rule], ...] } (the grammar's order). */
const KINDS = {
  providerSet: { header: PROVIDER_SET_HEADER, noun: "provider set", list: HEX64 },
  stakeInputs: { header: STAKE_INPUTS_HEADER, noun: "stake inputs", list: HEX64 },
  speedParams: {
    header: SPEED_PARAMS_HEADER,
    noun: "speed params",
    labels: [["requiredK", COUNT], ["segmentIntervalSecs", COUNT], ["maxLinesPerSegment", COUNT], ["minBondTermSecs", COUNT]],
  },
  tokenSpec: {
    header: TOKEN_SPEC_HEADER,
    noun: "token spec",
    labels: [
      ["symbol", SYMBOL], ["totalSupply", COUNT], ["distributedSupply", COUNT], ["computeRewardResolverCid", HEX64],
      ["economyCid", HEX64], ["fairLaunchSecs", COUNT], ["walletCapBps", COUNT], ["creatorBond", COUNT], ["feePips", COUNT], ["genesisCid", HEX64],
    ],
  },
  mintParams: {
    header: MINT_PARAMS_HEADER,
    noun: "base chain mint params",
    labels: [["treasuryKey", HEX64], ["distributedSupply", COUNT], ["computeReserveSupply", COUNT]],
  },
};

export const NATIVE_TOKEN_TOTAL_SUPPLY = 1_000_000_000;
export const MAX_DISTRIBUTED_TOKEN_SUPPLY = 300_000_000;
export const MAX_GENESIS_PROVIDERS = 256;
export const SEGMENT_WIRE_MAX_LINES = 65_536;
const U64_MAX = 18446744073709551615n;

export class LaunchBlobError extends Error {
  constructor(code, failure, missing, remedy) {
    super(`${failure}. Missing: ${missing}. To fix: ${remedy}.`);
    this.name = "LaunchBlobError";
    this.code = code;
  }
}

function refuse(kind, code, failure, missing, remedy) {
  return new LaunchBlobError(`LB_${code}`, `The ${KINDS[kind].noun} ${failure}`, missing, remedy);
}

const isHex64 = (t) => typeof t === "string" && /^[0-9a-f]{64}$/.test(t);
const isSymbol = (t) => typeof t === "string" && /^[A-Z0-9]+$/.test(t);
const isCountText = (t) => typeof t === "string" && /^(0|[1-9][0-9]*)$/.test(t) && BigInt(t) <= U64_MAX;

function fits(rule, token) {
  return rule === COUNT ? isCountText(token) : rule === HEX64 ? isHex64(token) : isSymbol(token);
}

/** A count as the JS number it is, or a BigInt past 2^53 (a u64 does not fit a double). */
function countValue(token) {
  const big = BigInt(token);
  return big <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(big) : big;
}

/** Which launch blob a body's first TAB-separated field names, or `null`. */
export function launchBlobKindOf(text) {
  const word = String(text).split("\n", 1)[0].split("\t", 1)[0];
  return Object.keys(KINDS).find((kind) => KINDS[kind].header === word) ?? null;
}

function render(kind, fields) {
  const spec = KINDS[kind];
  const bad = (what) => refuse(kind, "UNWRITABLE", `cannot be written: ${what}`, "values that fit the grammar's payload rules", "pass counts as whole numbers up to u64, hex as 64 lowercase hex characters, a symbol as A-Z and 0-9");
  if (spec.list) {
    if (!Array.isArray(fields)) throw bad("it needs a list");
    for (const item of fields) if (!fits(spec.list, String(item))) throw bad(`${JSON.stringify(item)} breaks the hex rule`);
    return [spec.header, ...fields].join("\t");
  }
  const parts = [spec.header];
  for (const [label, rule] of spec.labels) {
    const value = fields[label];
    if (value === undefined || value === null) continue;
    const token = typeof value === "bigint" ? value.toString() : String(value);
    if (!fits(rule, token)) throw bad(`${label} is ${JSON.stringify(token)}`);
    parts.push(label, token);
  }
  for (const key of Object.keys(fields)) if (!spec.labels.some(([label]) => label === key)) throw bad(`${key} is not a label of ${spec.header}`);
  return parts.join("\t");
}

export const renderProviderSet = (pubkeys) => render("providerSet", pubkeys);
export const renderStakeInputs = (cids) => render("stakeInputs", cids);
/** `minBondTermSecs` is omitted for a resolver chain's speed params (no bond to outlast). */
export const renderSpeedParams = ({ requiredK, segmentIntervalSecs, maxLinesPerSegment, minBondTermSecs }) =>
  render("speedParams", { requiredK, segmentIntervalSecs, maxLinesPerSegment, minBondTermSecs });
/** The terms and `economyCid` are optional; absent ones are absent from the blob (so the same launch keeps one CID). */
export const renderTokenSpec = ({ symbol, totalSupply = NATIVE_TOKEN_TOTAL_SUPPLY, distributedSupply, computeRewardResolverCid, economyCid, fairLaunchSecs, walletCapBps, creatorBond, feePips, genesisCid }) =>
  render("tokenSpec", { symbol, totalSupply, distributedSupply, computeRewardResolverCid, economyCid, fairLaunchSecs, walletCapBps, creatorBond, feePips, genesisCid });
export const renderBaseChainMintParams = (treasuryKey, distributedSupply, computeReserveSupply) =>
  render("mintParams", { treasuryKey, distributedSupply, computeReserveSupply });

function readOwn(kind, text) {
  const spec = KINDS[kind];
  const line = text.endsWith("\n") ? text.slice(0, -1) : text;
  if (line.includes("\n") || line.includes("\r")) {
    throw refuse(kind, "LAYOUT", `(${spec.header}) is not one line`, "a single line with no carriage return", "render it with web/flx-launch-blobs.mjs or launch_blobs::render_*");
  }
  const [header, ...rest] = line.split("\t");
  if (header !== spec.header) {
    throw refuse(kind, "WRONG_KIND", `names a different launch blob's header, not ${spec.header}`, `a blob whose first field is ${spec.header}`, "publish it under its own header");
  }
  if (rest.some((f) => f === "")) {
    throw refuse(kind, "LAYOUT", `(${spec.header}) has an empty field`, "no empty field", "render it with web/flx-launch-blobs.mjs or launch_blobs::render_*");
  }
  if (spec.list) {
    for (const token of rest) {
      if (!fits(spec.list, token)) throw refuse(kind, "PAYLOAD", `(${spec.header}) has ${JSON.stringify(token)}, which breaks its payload rule`, "exactly 64 lowercase hex characters", "correct the value");
    }
    return rest;
  }
  if (rest.length % 2 === 1) throw refuse(kind, "UNPAIRED", `(${spec.header}) ends on a label with no value`, "a value after every label", "give the label its value, or drop the label");
  const doc = {};
  let next = 0;
  for (let i = 0; i < rest.length; i += 2) {
    const at = spec.labels.findIndex(([label]) => label === rest[i]);
    if (at < 0) throw refuse(kind, "UNKNOWN_LABEL", `(${spec.header}) names the label ${JSON.stringify(rest[i])}, which this grammar does not have`, `only the labels ${spec.labels.map(([l]) => l).join(", ")}`, "drop the label");
    if (at < next) throw refuse(kind, "OUT_OF_ORDER", `(${spec.header}) repeats or reorders the label ${rest[i]}`, "each label at most once, in the grammar's order", "render it with web/flx-launch-blobs.mjs or launch_blobs::render_*");
    next = at + 1;
    const [label, rule] = spec.labels[at];
    if (!fits(rule, rest[i + 1])) throw refuse(kind, "PAYLOAD", `(${spec.header}) has ${JSON.stringify(rest[i + 1])} for ${label}, which breaks its payload rule`, "counts as plain decimals without leading zeros that fit u64, hex as 64 lowercase hex characters, symbols as A-Z and 0-9", "correct the value");
    doc[label] = rule === COUNT ? countValue(rest[i + 1]) : rest[i + 1];
  }
  return doc;
}

/** The typed document of a launch blob of `kind`: an array (lists) or an object (field sets), from the blob's own
 *  grammar OR from JSON (on chain forever). Anything else is refused by name. */
export function readLaunchBlob(kind, text) {
  if (!KINDS[kind]) throw new Error(`unknown launch blob kind ${JSON.stringify(kind)}`);
  const body = String(text ?? "");
  const own = launchBlobKindOf(body);
  if (own !== null) {
    if (own !== kind) throw refuse(kind, "WRONG_KIND", `names a different launch blob's header, not ${KINDS[kind].header}`, `a blob whose first field is ${KINDS[kind].header}`, "publish it under its own header");
    return readOwn(kind, body);
  }
  const first = body.trimStart()[0];
  if (first === "{" || first === "[") {
    try {
      return JSON.parse(body);
    } catch {
      throw refuse(kind, "NOT_JSON", "starts like JSON but is not valid JSON", `a well-formed ${KINDS[kind].header} line`, "re-publish it in that grammar");
    }
  }
  throw refuse(kind, "NO_FORM", `is neither JSON already on chain nor ${KINDS[kind].header}`, `the ${KINDS[kind].noun} in its own grammar, ${KINDS[kind].header}`, `publish it as ${KINDS[kind].header}`);
}

const positive = (v) => (typeof v === "bigint" ? v > 0n : Number.isSafeInteger(v) && v > 0);
const asNumber = (v) => (typeof v === "bigint" ? Number(v) : v);

/** `[pubkey, ...]`, with the registry's checks: non-empty, at most 256, each 64 lowercase hex, no duplicates. */
export function parseProviderSet(text) {
  const rows = readLaunchBlob("providerSet", text);
  if (!Array.isArray(rows)) throw refuse("providerSet", "SHAPE", "is not a list", "a list of 64-hex pubkeys", "publish a list");
  if (rows.length === 0) throw refuse("providerSet", "EMPTY", "is empty", "at least one provider", "name the chain's genesis providers");
  if (rows.length > MAX_GENESIS_PROVIDERS) throw refuse("providerSet", "TOO_MANY", "has too many genesis providers", `at most ${MAX_GENESIS_PROVIDERS}`, "name fewer");
  if (rows.some((row) => !isHex64(row))) throw refuse("providerSet", "PAYLOAD", "has a provider that is not a 64-char lowercase-hex pubkey", "64 lowercase hex characters each", "correct the key");
  if (new Set(rows).size !== rows.length) throw refuse("providerSet", "DUPLICATE", "has a duplicate genesis provider", "each provider once", "drop the duplicate");
  return rows;
}

/** `[cid, ...]`: non-empty, each 64 lowercase hex, no duplicates. */
export function parseStakeInputs(text) {
  const rows = readLaunchBlob("stakeInputs", text);
  if (!Array.isArray(rows)) throw refuse("stakeInputs", "SHAPE", "is not a list", "a list of 64-hex CIDs", "publish a list");
  if (rows.length === 0) throw refuse("stakeInputs", "EMPTY", "is empty", "at least one input", "omit the blob for a stake with one input");
  if (rows.some((row) => !isHex64(row))) throw refuse("stakeInputs", "PAYLOAD", "has an input that is not a 64-char lowercase-hex CID", "64 lowercase hex characters each", "correct the CID");
  if (new Set(rows).size !== rows.length) throw refuse("stakeInputs", "DUPLICATE", "has a duplicate stake input", "each input once", "drop the duplicate");
  return rows;
}

/** `{requiredK, segmentIntervalSecs, maxLinesPerSegment, minBondTermSecs?}` with the registry's bounds. A token chain's
 *  speed params need `minBondTermSecs`; pass `{ resolver: true }` for a resolver chain's, which carry none. */
export function parseSpeedParams(text, { resolver = false } = {}) {
  const doc = readLaunchBlob("speedParams", text);
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) throw refuse("speedParams", "SHAPE", "is not a document of labels", "requiredK, segmentIntervalSecs, maxLinesPerSegment", "publish the labels");
  const need = (key, ok, why) => {
    if (!ok(doc[key])) throw refuse("speedParams", "FIELD", `needs ${key} ${why}`, key, "give it a value in range");
    return asNumber(doc[key]);
  };
  const requiredK = need("requiredK", positive, ">= 1");
  const segmentIntervalSecs = need("segmentIntervalSecs", positive, ">= 1");
  const maxLinesPerSegment = need("maxLinesPerSegment", (v) => positive(v) && asNumber(v) <= SEGMENT_WIRE_MAX_LINES, "within SEGMENT_WIRE_MAX_LINES");
  if (resolver) return { requiredK, segmentIntervalSecs, maxLinesPerSegment };
  const minBondTermSecs = need("minBondTermSecs", positive, ">= 1, the minimum a bond must outlast the launch by");
  return { requiredK, segmentIntervalSecs, maxLinesPerSegment, minBondTermSecs };
}

/** `{symbol, totalSupply, distributedSupply, computeRewardResolverCid, economyCid?, fairLaunchSecs?, ...}`. The canonical
 *  compute-reward resolver CID is the Rust side's `resolvers::resolver_cid(NATIVE_COMPUTE_REWARD_RESOLVER)`: a caller
 *  that knows it passes `{ computeRewardResolverCid }` to have it checked; otherwise only its shape is. */
export function parseTokenSpec(text, { computeRewardResolverCid } = {}) {
  const doc = readLaunchBlob("tokenSpec", text);
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) throw refuse("tokenSpec", "SHAPE", "is not a document of labels", "symbol, totalSupply, distributedSupply, computeRewardResolverCid", "publish the labels");
  if (typeof doc.symbol !== "string" || !/^[A-Z0-9]{2,8}$/.test(doc.symbol)) throw refuse("tokenSpec", "FIELD", "needs a symbol of 2-8 uppercase alphanumeric characters", "symbol", "choose one");
  if (asNumber(doc.totalSupply) !== NATIVE_TOKEN_TOTAL_SUPPLY) throw refuse("tokenSpec", "FIELD", "needs totalSupply exactly 1000000000", "totalSupply", "set it");
  if (!(asNumber(doc.distributedSupply) <= MAX_DISTRIBUTED_TOKEN_SUPPLY)) throw refuse("tokenSpec", "FIELD", "needs distributedSupply at most 300000000", "distributedSupply", "lower it");
  if (!isHex64(doc.computeRewardResolverCid) || (computeRewardResolverCid && doc.computeRewardResolverCid !== computeRewardResolverCid)) {
    throw refuse("tokenSpec", "FIELD", "must name the canonical native compute reward resolver", "computeRewardResolverCid", "name it");
  }
  return doc;
}

/** `{treasuryKey, distributedSupply, computeReserveSupply}`. */
export function parseBaseChainMintParams(text) {
  const doc = readLaunchBlob("mintParams", text);
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) throw refuse("mintParams", "SHAPE", "is not a document of labels", "treasuryKey, distributedSupply, computeReserveSupply", "publish the labels");
  if (!isHex64(doc.treasuryKey)) throw refuse("mintParams", "FIELD", "needs treasuryKey as a 64-lowercase-hex pubkey", "treasuryKey", "set it");
  for (const key of ["distributedSupply", "computeReserveSupply"]) {
    if (!(typeof doc[key] === "bigint" || Number.isSafeInteger(doc[key])) || doc[key] < 0) throw refuse("mintParams", "FIELD", `needs ${key} as a non-negative integer`, key, "set it");
  }
  return doc;
}
