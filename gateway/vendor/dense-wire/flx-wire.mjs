// WebSocket client for the dense-wire line protocol.
//
// LAW: no WASM. The chain server speaks plain line-framed text; a
// Caddy terminates TLS and proxies to chain-server's dedicated RFC 6455
// listener. Raw TCP is a separate endpoint. Each submitted command is one
// WS text message; each reply is one WS text message and may contain lines.

import { signHex } from "./flx-crypto.mjs";
import { admit, utf8OfHex } from "./flx-dumb-parser.mjs";
import { readRecordEntry } from "./flx-builders.mjs";
import { parseDomainProofReply } from "./flx-domain-proof.mjs";

/** A signed KDOMREC2's own boxes, read back without verifying anything, or
 *  `null` when the entry does not read. */
function readRecordOrNull(entryText) {
  try {
    return readRecordEntry(admit(entryText));
  } catch {
    return null;
  }
}

const SIGNAL_AUTH_DOMAIN = "FLX-STRM-V1";

export function signalingCoveredText(action, fields, timestamp, nonceHex) {
  const all = [SIGNAL_AUTH_DOMAIN, action, ...fields, String(timestamp), nonceHex];
  if (all.some((field) => String(field).includes("\0"))) {
    throw new Error("signaling fields cannot contain NUL");
  }
  return all.join("\0");
}

function randomNonceHex() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let out = "";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return out;
}

/** How long `_send` waits for a reply before treating the connection as
 *  stale and forcing a reconnect. A WebSocket that goes idle for a while
 *  (e.g. a person sitting on a scoped-authorization review dialog for a
 *  couple of minutes before approving) can be silently killed by an
 *  intermediate proxy or NAT without the browser ever firing `onclose` --
 *  `ws.send()` on that socket succeeds locally and the request just hangs
 *  forever with no error. Found live 2026-10-13: a real mint hung on
 *  "submitting..." indefinitely after a real signing pause, while the
 *  identical record sent fresh over a brand-new connection replied in
 *  62ms. This is what turns that silent hang into a clear failure plus an
 *  automatic reconnect, instead of a dead page needing a manual reload. */
const REPLY_TIMEOUT_MS = 15000;

/** Wave 2D — the `CHAIN_PROVIDERS` row's proof column (its 5th field):
 *  `-` when the provider proved nothing, else `capability:sourcehash`
 *  entries joined by `,` (Rust: `capability_proof::render_proved_column`).
 *  A row without the column (a node from before wave 2D) reads as
 *  "nothing proved", never as an error. */
export function parseProvedColumn(column) {
  if (column === undefined || column === "" || column === "-") return [];
  return column.split(",").map((entry) => {
    const i = entry.indexOf(":");
    return i < 0 ? { capability: entry, sourceHash: "" } : { capability: entry.slice(0, i), sourceHash: entry.slice(i + 1) };
  });
}

/** `CHAIN_PROVIDERS`'s reply, parsed (see `WireClient.chainProviders`
 *  for the shape). Pure, so the explorer's row rendering is testable from
 *  a fixture reply without a connection. */
/** The pure parser behind `custodyCredits` (testable from a fixture).
 *  Rows come back as `{cid, amount: bigint, status: {kind, beneficiary?, deadline?}}`;
 *  a row the node rendered malformed makes the whole reply an error that
 *  names the row, never a silently shorter list. */
export function parseCustodyCreditsReply(reply) {
  const lines = String(reply ?? "").split("\n").filter((l) => l.length > 0);
  if (lines.length === 0) return { kind: "error", reason: "empty reply", raw: reply };
  const head = lines[0].split("\t");
  if (head[0] === "MANIFEST_CREDITS_ERR") {
    return { kind: "error", failure: head[1] ?? "", missing: head[2] ?? "", remedy: head[3] ?? "", reason: head.slice(1).join("\t"), raw: reply };
  }
  if (head[0] !== "MANIFEST_CREDITS" || head.length !== 3 || !/^\d+$/.test(head[2])) return { kind: "error", reason: `unrecognised reply head: ${lines[0]}`, raw: reply };
  const holder = head[1];
  const count = Number(head[2]);
  if (lines[lines.length - 1] !== "MANIFEST_CREDITS_END") return { kind: "error", reason: "listing without MANIFEST_CREDITS_END", raw: reply };
  const rows = lines.slice(1, -1);
  if (rows.length !== count) return { kind: "error", reason: `header says ${count} credits, ${rows.length} rows`, raw: reply };
  const credits = [];
  for (const row of rows) {
    const f = row.split("\t");
    if (f.length !== 4 || f[0] !== "CREDIT" || !/^[0-9a-f]{64}$/.test(f[1]) || !/^\d+$/.test(f[2])) return { kind: "error", reason: `malformed credit row: ${row}`, raw: reply };
    const status = parseCreditStatus(f[3]);
    if (!status) return { kind: "error", reason: `malformed credit status: ${row}`, raw: reply };
    credits.push({ cid: f[1], amount: BigInt(f[2]), status });
  }
  return { kind: "credits", holder, credits };
}

function parseCreditStatus(text) {
  if (text === "live" || text === "spent" || text === "forfeited") return { kind: text };
  const m = /^locked:([0-9a-f]{64}):(-?\d+)$/.exec(text);
  if (m) return { kind: "locked", beneficiary: m[1], deadline: Number(m[2]) };
  // Wave 3F (H8) -- `disputed:<signer>:<position>`: a credit a frozen chain's conflicting spends touched, unspendable
  // until a conviction or a release; the signer and position name the fork that holds it.
  const d = /^disputed:([0-9a-f]{64}):(\d+)$/.exec(text);
  return d ? { kind: "disputed", signer: d[1], position: Number(d[2]) } : null;
}

// --- Wave 3 (economy plan WP7-WP11): a launch's economy as the node answers it ------------------------------------
// One parser per reply, shared by every client (launchpad, explore, operator tools). Each returns every field the
// node wrote, or `{kind: "error", ...}` naming what it could not read -- never a shorter answer, and never a 0 for a
// figure the node did not state (`-` reads as null).

const KEY64 = /^[0-9a-f]{64}$/;
const WHOLE = /^\d+$/;
const firstLines = (reply) => String(reply ?? "").split("\n").filter((l) => l.length > 0);
const unreadable = (what, line) => ({ kind: "error", reason: `${what}: ${String(line ?? "").slice(0, 160)}` });

/** A `<HEAD>_ERR` / generic `ERR` line as failure / missing / remedy. Handles the three shapes the node writes: a tab
 *  triple (`failure TAB missing TAB remedy`, the `missing: ` / `remedy: ` prefixes some writers add are dropped), a
 *  coded triple (`code TAB failure TAB missing TAB remedy`), and one sentence (`failure. Missing: … To fix: …`, or
 *  `failure: …; missing: …; remedy: …`), which is split where it names its parts. */
function refusalOf(fields, { coded = false } = {}) {
  const strip = (s, word) => String(s ?? "").replace(new RegExp(`^${word}:\\s*`, "i"), "");
  const f = [...fields];
  const code = coded ? f.shift() ?? "" : undefined;
  let failure = f[0] ?? "", missing = f[1] ?? "", remedy = f[2] ?? "";
  if (f.length === 1) {
    const m = /^(?:failure:\s*)?(.*?)(?:\.|;)\s*Missing:\s*(.*?)(?:\.|;)\s*(?:To fix|remedy):\s*(.*)$/is.exec(f[0]);
    if (m) [failure, missing, remedy] = [m[1], m[2], m[3]];
  }
  const out = { kind: "error", failure: strip(failure, "failure"), missing: strip(missing, "missing"), remedy: strip(remedy, "remedy"), reason: fields.join("\t") };
  // An incomplete triple is not a refusal: a refusal with an empty failure, missing or remedy would show the reader a
  // blank where the node owed them a reason (v4p P6). It stays an error, kept as the node wrote it.
  if (!out.failure.trim() || !out.missing.trim() || !out.remedy.trim()) return unreadable("a refusal without failure, missing and remedy", fields.join("\t"));
  if (coded) out.code = code;
  return out;
}

/** The five fee accounts a fee-charging launch has (`flx_cap_custody::FeeAccount::tag`), in the node's order. */
export const FEE_ACCOUNTS = Object.freeze(["mm", "lp", "venue-providers", "venue-insurance", "venue-treasury"]);

/** `FEE_ACCOUNT<TAB><chain><TAB><account>` -> `FEE_ACCOUNT TAB chain TAB account TAB holder TAB held TAB claimable TAB
 *  credits TAB next maturity|- TAB rule:<legs>|none:<why> TAB pool-kept token0,token1|- TAB now TAB
 *  tokens:<held>:<claimable>:<entries>:(rule:<legs>|none)|-` (`fee_account.rs`, `FeeAccountView::line`, wave 4; the
 *  token side's own rule, round three). `held`/`claimable` are
 *  measured sums (a real 0 when the account holds nothing). The rule is who a claim pays, decided by the launch's
 *  records (`FeeRecipients::rule_line`): legs `role:holder:bps`, the holder a key, `waits` (the treasury's share
 *  while no DAO key is bound) or, for `providers`, the size of the provider set the share divides among; or null with
 *  `noRule` the node's reason. `poolKept` (lp only, on a migrated launch) is what the pool's math kept and custody has
 *  not yet received; `tokens` (lp only) the account's TOKEN side, a pool sell's tier fee held in the native ledger,
 *  with `tokens.rule` the legs a token claim pays (owner, seventh round: the insurance leg weighs 0 and a token fee is
 *  divided over the other legs' weights; checked to be the account's own rule with insurance at 0), or null when this
 *  node holds no recipients. */
export function parseFeeAccountReply(reply) {
  const line = firstLines(reply)[0] ?? "";
  const f = line.split("\t");
  if (f[0] === "FEE_ACCOUNT_ERR" || f[0] === "ERR") return f[0] === "ERR" ? { ...refusalOf(f.slice(2)), class: f[1] } : refusalOf(f.slice(1));
  if (f[0] !== "FEE_ACCOUNT" || f.length !== 12) return unreadable("not a FEE_ACCOUNT line", line);
  const [, chainId, account, holder, held, claimable, credits, next, who, kept, now, tokens] = f;
  if (!FEE_ACCOUNTS.includes(account)) return unreadable(`'${account}' is not a fee account`, line);
  if (!KEY64.test(holder) || !WHOLE.test(held) || !WHOLE.test(claimable) || !WHOLE.test(credits) || !WHOLE.test(now)) return unreadable("a FEE_ACCOUNT field is not a key or a whole number", line);
  if (next !== "-" && !/^-?\d+$/.test(next)) return unreadable("the next maturity is not a time or -", line);
  const legsOf = (text) => text.split(",").map((leg) => {
    const [role, legHolder, bps, extra] = leg.split(":");
    const holderOk = role === "providers" ? WHOLE.test(legHolder ?? "") : KEY64.test(legHolder ?? "") || (role === "treasury" && legHolder === "waits");
    return extra === undefined && holderOk && WHOLE.test(bps ?? "") ? { role, holder: legHolder, bps: Number(bps) } : null;
  });
  let rule = null;
  if (who.startsWith("rule:")) {
    rule = legsOf(who.slice("rule:".length));
    if (rule.some((l) => l === null)) return unreadable("the rule is not role:holder:bps legs", line);
    if (rule.reduce((sum, l) => sum + l.bps, 0) !== 10_000) return unreadable("the rule's shares do not sum to 10000 bps", line);
  } else if (!who.startsWith("none:")) {
    return unreadable("the rule column is neither rule:<legs> nor none:<why>", line);
  }
  const keptM = /^(\d+),(\d+)$/.exec(kept);
  if (kept !== "-" && !keptM) return unreadable("pool-kept is not token0,token1 or -", line);
  // Round three (owner, seventh round): the token side carries its own rule, `rule:<legs>` (the account's rule with the
  // insurance leg at 0: insurance takes nothing from a fee paid in the launch's own token) or `none` (no recipients here).
  const tokensM = /^tokens:(\d+):(\d+):(\d+):(none|rule:(.+))$/.exec(tokens);
  if (tokens !== "-" && !tokensM) return unreadable("the token side is not tokens:held:claimable:entries:rule:<legs>|none or -", line);
  let tokenRule = null;
  if (tokensM && tokensM[5] !== undefined) {
    tokenRule = legsOf(tokensM[5]);
    if (tokenRule.some((l) => l === null)) return unreadable("the token side's rule is not role:holder:weight legs", line);
    const same = rule && rule.length === tokenRule.length && rule.every((l, i) => {
      const t = tokenRule[i];
      return t.role === l.role && t.holder === l.holder && t.bps === (l.role === "insurance" ? 0 : l.bps);
    });
    if (!same) return unreadable("the token side's rule is not the account's rule with the insurance leg at 0", line);
  }
  if (BigInt(claimable) > BigInt(held)) return unreadable("claimable is above held", line);
  if (tokensM && BigInt(tokensM[2]) > BigInt(tokensM[1])) return unreadable("the token side's claimable is above its held", line);
  return {
    kind: "account", chainId, account, holder, held: BigInt(held), claimable: BigInt(claimable), credits: Number(credits),
    nextMaturesAt: next === "-" ? null : Number(next),
    rule, noRule: rule ? null : who.slice("none:".length),
    poolKept: keptM ? { token0: BigInt(keptM[1]), token1: BigInt(keptM[2]) } : null,
    now: Number(now),
    tokens: tokensM ? { held: BigInt(tokensM[1]), claimable: BigInt(tokensM[2]), entries: Number(tokensM[3]), rule: tokenRule } : null,
  };
}

/** `INSURANCE_ACCOUNT<TAB><chain>` -> `INSURANCE_ACCOUNT TAB chain TAB holder TAB live FXN TAB n`, n `CREDIT TAB cid TAB
 *  amount TAB status` rows, `INSURANCE_ACCOUNT_END` (`chain_server_wave3f.rs`). The launch's own insurance custody
 *  account: release-only, funded by fees' insurance share and forfeits. `live` must equal the sum of the live rows. */
export function parseInsuranceAccountReply(reply) {
  const lines = firstLines(reply);
  const head = (lines[0] ?? "").split("\t");
  if (head[0] === "INSURANCE_ACCOUNT_ERR") return refusalOf(head.slice(1));
  if (head[0] === "ERR") return { ...refusalOf(head.slice(2)), class: head[1] };
  if (head[0] !== "INSURANCE_ACCOUNT" || head.length !== 5 || !KEY64.test(head[2]) || !WHOLE.test(head[3]) || !WHOLE.test(head[4])) return unreadable("not an INSURANCE_ACCOUNT head", lines[0]);
  if (lines[lines.length - 1] !== "INSURANCE_ACCOUNT_END") return unreadable("listing without INSURANCE_ACCOUNT_END", lines[lines.length - 1]);
  const rows = lines.slice(1, -1);
  if (rows.length !== Number(head[4])) return unreadable(`header says ${head[4]} credits, ${rows.length} rows`, lines[0]);
  const credits = [];
  for (const row of rows) {
    const f = row.split("\t");
    const status = f.length === 4 ? parseCreditStatus(f[3]) : null;
    if (f[0] !== "CREDIT" || !KEY64.test(f[1] ?? "") || !WHOLE.test(f[2] ?? "") || !status) return unreadable("malformed credit row", row);
    credits.push({ cid: f[1], amount: BigInt(f[2]), status });
  }
  const live = credits.filter((c) => c.status.kind === "live").reduce((s, c) => s + c.amount, 0n);
  if (live !== BigInt(head[3])) return unreadable(`live ${head[3]} is not the sum of the live rows (${live})`, lines[0]);
  return { kind: "insurance", chainId: head[1], holder: head[2], live, credits };
}

/** Round three (r3u) — `FEE_CLAIM<TAB><signed KFEECLM1 record>` (`chain_server.rs` `fee_claim_reply`, `fill_record.rs`
 *  `note_claim_outcome`) -> `FEE_CLAIM_OK TAB record cid TAB claimed TAB amount TAB role:holder:amount:credit,...`: the
 *  claim was applied and EVERY recipient of the account was paid its share by rule, one custody credit per payee (role
 *  `key`, `insurance`, or `waits:<account>` for a share held in another fee account until its recipient can be paid,
 *  e.g. the treasury's share while no DAO key is bound); the legs must sum to the amount. Or `… TAB pending TAB why`
 *  (a named credit is not folded here yet; retried after the next fold), `… TAB refused TAB why` (custody refused it
 *  for good; nothing moved), `… TAB admitted; not applied on this node yet`, `FEE_CLAIM_ERR TAB failure TAB missing TAB
 *  remedy` (refused before it took a chain position) or `ERR TAB class TAB …`. Only `claimed` is a payment. */
export function parseFeeClaimReply(reply) {
  const line = firstLines(reply)[0] ?? "";
  const f = line.split("\t");
  if (f[0] === "FEE_CLAIM_ERR") return f.length === 4 ? refusalOf(f.slice(1)) : unreadable("a FEE_CLAIM_ERR line has failure, missing and remedy", line);
  if (f[0] === "ERR") return { ...refusalOf(f.slice(2)), class: f[1] };
  if (f[0] !== "FEE_CLAIM_OK" || !KEY64.test(f[1] ?? "") || f.length < 3) return unreadable("not a FEE_CLAIM_OK line", line);
  const recordCid = f[1];
  const outcome = { kind: "claim", recordCid, amount: null, legs: [], why: null };
  if (f[2] === "pending" || f[2] === "refused") return f.length === 4 ? { ...outcome, state: f[2], why: f[3] } : unreadable(`a ${f[2]} claim names why`, line);
  if (f[2] !== "claimed") return f.length === 3 ? { ...outcome, state: "admitted", why: f[2] } : unreadable("not a claim outcome", line);
  if (f.length !== 5 || !WHOLE.test(f[3])) return unreadable("a claimed outcome is claimed TAB amount TAB legs", line);
  const roles = /^(key|insurance|waits:(?:mm|lp|venue-providers|venue-insurance|venue-treasury))$/;
  const legs = f[4].split(",").map((text) => {
    const m = /^(.+):([0-9a-f]{64}):(\d+):([0-9a-f]{64})$/.exec(text);
    return m && roles.test(m[1]) ? { role: m[1], holder: m[2], amount: BigInt(m[3]), credit: m[4] } : null;
  });
  if (legs.some((l) => l === null)) return unreadable("a claim leg is not role:holder:amount:credit", line);
  const amount = BigInt(f[3]);
  const paid = legs.reduce((s, l) => s + l.amount, 0n);
  if (paid !== amount) return unreadable(`the legs pay ${paid}, the claim names ${amount}`, line);
  return { ...outcome, state: "claimed", amount, legs };
}

/** `POOL_UNWIND<TAB><chain>` (Operator) -> `POOL_UNWOUND TAB chain TAB inflow TAB n`, n `REFUND TAB party TAB tokens TAB
 *  credit TAB amount`, `POOL_UNWOUND_END`; `POOL_UNWOUND_ALREADY TAB chain`; `POOL_UNWIND_ERR TAB code TAB …`. The D15
 *  terminal unwind's refunds are a conserved split of the inflow, so they must sum to it exactly. */
export function parsePoolUnwindReply(reply) {
  const lines = firstLines(reply);
  const head = (lines[0] ?? "").split("\t");
  if (head[0] === "POOL_UNWIND_ERR") return refusalOf(head.slice(1), { coded: true });
  if (head[0] === "POOL_UNWOUND_ALREADY" && head.length === 2) return { kind: "already", chainId: head[1] };
  if (head[0] !== "POOL_UNWOUND" || head.length !== 4 || !WHOLE.test(head[2]) || !WHOLE.test(head[3])) return unreadable("not a POOL_UNWOUND head", lines[0]);
  if (lines[lines.length - 1] !== "POOL_UNWOUND_END") return unreadable("refunds without POOL_UNWOUND_END", lines[lines.length - 1]);
  const rows = lines.slice(1, -1);
  if (rows.length !== Number(head[3])) return unreadable(`header says ${head[3]} refunds, ${rows.length} rows`, lines[0]);
  const refunds = [];
  for (const row of rows) {
    const f = row.split("\t");
    if (f.length !== 5 || f[0] !== "REFUND" || !KEY64.test(f[1]) || !WHOLE.test(f[2]) || !KEY64.test(f[3]) || !WHOLE.test(f[4])) return unreadable("malformed refund row", row);
    refunds.push({ party: f[1], tokens: BigInt(f[2]), credit: f[3], amount: BigInt(f[4]) });
  }
  const sum = refunds.reduce((s, r) => s + r.amount, 0n);
  if (sum !== BigInt(head[2])) return unreadable(`refunds sum to ${sum}, not the inflow ${head[2]}`, lines[0]);
  return { kind: "unwound", chainId: head[1], inflow: BigInt(head[2]), refunds };
}

/** `CREATOR_BOND<TAB><chain>` -> `CREATOR_BOND TAB chain TAB locked|returned|forfeited TAB credit TAB amount TAB opened_at
 *  TAB term_end`, and for a forfeited bond `TAB conviction cid TAB conviction at TAB custody step TAB holders' plan TAB
 *  legs TAB payout TAB note` (`chain_server_creator.rs`); `CREATOR_BOND_NONE TAB chain TAB code TAB failure TAB missing
 *  TAB remedy` when no bond is posted (an answer, never a 0); `CREATOR_BOND_ERR TAB code TAB …`. */
export function parseCreatorBondReply(reply) {
  const line = firstLines(reply)[0] ?? "";
  const f = line.split("\t");
  if (f[0] === "CREATOR_BOND_ERR") return refusalOf(f.slice(1), { coded: true });
  if (f[0] === "CREATOR_BOND_NONE" && f.length === 6) return { kind: "none", chainId: f[1], code: f[2], failure: f[3], missing: f[4], remedy: f[5] };
  if (f[0] !== "CREATOR_BOND") return unreadable("not a CREATOR_BOND line", line);
  const [, chainId, state, credit, amount, openedAt, termEnd] = f;
  const want = state === "forfeited" ? 14 : 7;
  if (!["locked", "returned", "forfeited"].includes(state) || f.length !== want) return unreadable(`a ${state} bond has ${want} fields`, line);
  if (!KEY64.test(credit) || !WHOLE.test(amount) || !/^-?\d+$/.test(openedAt) || !/^-?\d+$/.test(termEnd)) return unreadable("a CREATOR_BOND field is not a key or a number", line);
  let forfeit = null;
  if (state === "forfeited") {
    const [conviction, at, custody, plan, legs, payout, note] = f.slice(7);
    if (!KEY64.test(conviction) || !/^-?\d+$/.test(at) || (legs !== "-" && !WHOLE.test(legs))) return unreadable("a forfeited bond's conviction fields", line);
    forfeit = { conviction, convictionAt: Number(at), custody, plan, legs: legs === "-" ? null : Number(legs), payout: payout === "-" ? null : payout, note: note === "-" ? null : note };
  }
  return { kind: "bond", chainId, state, credit, amount: BigInt(amount), openedAt: Number(openedAt), termEnd: Number(termEnd), forfeit };
}

/** `CREATOR_VESTING<TAB><chain>` -> `CREATOR_VESTING TAB chain TAB allocation TAB claimed TAB graduated_at|- TAB
 *  first,interval,tranches (seconds) TAB next tranche|- TAB unlocks at|- TAB held claims` (`chain_server_creator.rs`).
 *  `-` is "not scheduled" (before graduation, or every tranche claimed): null, never 0. */
export function parseCreatorVestingReply(reply) {
  const line = firstLines(reply)[0] ?? "";
  const f = line.split("\t");
  if (f[0] === "CREATOR_VESTING_ERR") return refusalOf(f.slice(1), { coded: true });
  if (f[0] !== "CREATOR_VESTING" || f.length !== 9) return unreadable("not a CREATOR_VESTING line", line);
  const [, chainId, allocation, claimed, graduated, rule, next, at, held] = f;
  const r = /^(\d+),(\d+),(\d+)$/.exec(rule);
  const opt = (s) => s === "-" || /^-?\d+$/.test(s);
  if (!WHOLE.test(allocation) || !WHOLE.test(claimed) || !r || !opt(graduated) || !opt(next) || !opt(at) || !WHOLE.test(held)) return unreadable("a CREATOR_VESTING field is not a number or -", line);
  if (BigInt(claimed) > BigInt(allocation)) return unreadable("claimed is above the allocation", line);
  const n = (s) => (s === "-" ? null : Number(s));
  return {
    kind: "vesting", chainId, allocation: BigInt(allocation), claimed: BigInt(claimed), graduatedAt: n(graduated),
    firstUnlockSecs: Number(r[1]), intervalSecs: Number(r[2]), tranches: Number(r[3]), nextTranche: n(next), unlocksAt: n(at), heldClaims: Number(held),
  };
}

/** The `mm` modes a launch's economy fixes (D3): one flat rate, the owner's schedule keyed on the share sold, or `none`
 *  (the launch's economy fixes no fee schedule). */
export const CURVE_MM_MODES = Object.freeze(["flat", "schedule", "none"]);

/** Round three (r3c) — `CURVE_SOLD<TAB><chain>` -> `CURVE_SOLD TAB chain TAB sold bps TAB mm bps charged now TAB next
 *  breakpoint bps|- TAB flat|schedule|none` (`chain_server_r3c.rs`, `CurveSold::line`): the share of the curve's
 *  sellable tokens sold (`BondingCurve::curve_sold_bps`, what the resolver reads before each row), the `mm` rate a row
 *  pays now, the share at which that rate next changes (`-`: it never changes again, or the mode has no tiers) and the
 *  launch's own mode. Or `CURVE_SOLD_ERR TAB failure TAB missing TAB remedy` (no such curve, a graduated curve, a
 *  malformed request). `none` is an answer (the launch charges no `mm`), never a guessed tier; a reply whose fields
 *  contradict each other (a breakpoint at or below the share sold, a flat or none mode with a breakpoint, a none mode
 *  charging something) is an error naming why. */
export function parseCurveSoldReply(reply) {
  const line = firstLines(reply)[0] ?? "";
  const f = line.split("\t");
  if (f[0] === "CURVE_SOLD_ERR") return f.length === 4 ? refusalOf(f.slice(1)) : unreadable("a CURVE_SOLD_ERR line has failure, missing and remedy", line);
  if (f[0] === "ERR") return { ...refusalOf(f.slice(2)), class: f[1] };
  if (f[0] !== "CURVE_SOLD" || f.length !== 6) return unreadable("not a CURVE_SOLD line", line);
  const [, chainId, sold, mm, next, mode] = f;
  if (chainId === "" || !WHOLE.test(sold) || !WHOLE.test(mm) || (next !== "-" && !WHOLE.test(next))) return unreadable("a CURVE_SOLD field is not a whole number or -", line);
  if (!CURVE_MM_MODES.includes(mode)) return unreadable(`'${mode}' is not an mm mode (flat, schedule, none)`, line);
  const soldBps = Number(sold);
  if (soldBps > 10_000) return unreadable("the share sold is above 10000 bps", line);
  const nextBreakpointBps = next === "-" ? null : Number(next);
  if (nextBreakpointBps !== null && (mode !== "schedule" || nextBreakpointBps <= soldBps || nextBreakpointBps > 10_000)) return unreadable("a next breakpoint belongs only to a schedule and lies above the share sold", line);
  if (mode === "none" && mm !== "0") return unreadable("a launch with no fee schedule charges no mm", line);
  return { kind: "sold", chainId, soldBps, mmBpsNow: Number(mm), nextBreakpointBps, mode };
}

/** Round four (r4a) — `TOKEN_FEES<TAB><chain>` -> `TOKEN_FEES TAB chain TAB n TAB hold secs TAB now`, n
 *  `TOKEN_FEE TAB entry cid TAB result cid TAB earned at TAB matures at TAB tokens TAB open|claimed:<claim cid>` rows
 *  (earned-at order), `TOKEN_FEES_END TAB chain` (`chain_server_r4a.rs`). Every token LP fee entry the node's lane
 *  holds for a launch: the entry cid is the name a `FEE_CLAIM` on the lp account uses, so a token-side claim can name
 *  any held entry, not only those of the results the page saw. `maturesAt` must be `earnedAt + holdSecs`: a row that
 *  says otherwise is unreadable, never a guessed maturity. */
export function parseTokenFeesReply(reply) {
  const lines = firstLines(reply);
  const head = (lines[0] ?? "").split("\t");
  if (head[0] === "TOKEN_FEES_ERR") return head.length === 4 ? refusalOf(head.slice(1)) : unreadable("a TOKEN_FEES_ERR line has failure, missing and remedy", lines[0]);
  if (head[0] === "ERR") return { ...refusalOf(head.slice(2)), class: head[1] };
  if (head[0] !== "TOKEN_FEES" || head.length !== 5 || head[1] === "" || !WHOLE.test(head[2]) || !WHOLE.test(head[3]) || !WHOLE.test(head[4])) return unreadable("not a TOKEN_FEES head", lines[0]);
  const [, chainId, count, hold, now] = head;
  if (lines[lines.length - 1] !== `TOKEN_FEES_END\t${chainId}`) return unreadable("listing without TOKEN_FEES_END", lines[lines.length - 1]);
  const rows = lines.slice(1, -1);
  if (rows.length !== Number(count)) return unreadable(`header says ${count} entries, ${rows.length} rows`, lines[0]);
  const holdSecs = Number(hold);
  const entries = [];
  let previous = null;
  for (const row of rows) {
    const f = row.split("\t");
    if (f[0] !== "TOKEN_FEE" || f.length !== 7) return unreadable("not a TOKEN_FEE row", row);
    const [, entryCid, resultCid, earned, matures, tokens, state] = f;
    if (!KEY64.test(entryCid) || resultCid === "" || !/^-?\d+$/.test(earned) || !/^-?\d+$/.test(matures) || !WHOLE.test(tokens)) return unreadable("a TOKEN_FEE field is not a cid, a time or a whole number", row);
    if (Number(matures) !== Number(earned) + holdSecs) return unreadable("the maturity is not the result's clock plus the launch's hold", row);
    const claimed = /^claimed:(.+)$/.exec(state);
    if (state !== "open" && !claimed) return unreadable("the state is neither open nor claimed:<claim cid>", row);
    if (previous !== null && Number(earned) < previous) return unreadable("entries are not in earned-at order", row);
    previous = Number(earned);
    entries.push({ entryCid, resultCid, earnedAt: Number(earned), maturesAt: Number(matures), tokens: BigInt(tokens), claimedBy: claimed ? claimed[1] : null });
  }
  return { kind: "tokenFees", chainId, holdSecs, now: Number(now), entries };
}

/** Round four (r4a) — `LAUNCH_PROVIDERS<TAB><chain>` -> `LAUNCH_PROVIDERS TAB chain TAB creator key TAB n`, n
 *  `LAUNCH_PROVIDER TAB key` rows in the provider-set blob's order (the order the fee rules pay them),
 *  `LAUNCH_PROVIDERS_END TAB chain`. The launch's GENESIS providers, the keys its venue-providers and lp shares pay;
 *  `CHAIN_PROVIDERS` answers who is seated and reachable now, a different question. */
export function parseLaunchProvidersReply(reply) {
  const lines = firstLines(reply);
  const head = (lines[0] ?? "").split("\t");
  if (head[0] === "LAUNCH_PROVIDERS_ERR") return head.length === 4 ? refusalOf(head.slice(1)) : unreadable("a LAUNCH_PROVIDERS_ERR line has failure, missing and remedy", lines[0]);
  if (head[0] === "ERR") return { ...refusalOf(head.slice(2)), class: head[1] };
  if (head[0] !== "LAUNCH_PROVIDERS" || head.length !== 4 || head[1] === "" || !KEY64.test(head[2]) || !WHOLE.test(head[3])) return unreadable("not a LAUNCH_PROVIDERS head", lines[0]);
  const [, chainId, creator, count] = head;
  if (lines[lines.length - 1] !== `LAUNCH_PROVIDERS_END\t${chainId}`) return unreadable("listing without LAUNCH_PROVIDERS_END", lines[lines.length - 1]);
  const rows = lines.slice(1, -1);
  if (rows.length !== Number(count)) return unreadable(`header says ${count} providers, ${rows.length} rows`, lines[0]);
  const providers = [];
  for (const row of rows) {
    const f = row.split("\t");
    if (f[0] !== "LAUNCH_PROVIDER" || f.length !== 2 || !KEY64.test(f[1])) return unreadable("not a LAUNCH_PROVIDER row", row);
    providers.push(f[1]);
  }
  return { kind: "launchProviders", chainId, creator, providers };
}

/** Round four (r4a) — `POOL_STATUS<TAB><chain>` -> `POOL_STATUS TAB chain TAB tick TAB fee pips TAB liquidity TAB
 *  locked liquidity TAB removable segments TAB locked segments`, each segment list `lo:hi:liquidity` comma-joined
 *  or `-` (the rows `POOL_LIQUIDITY` lists), or `POOL_UNKNOWN TAB chain`. The segments are what a quote walks: a
 *  swap's output over the pool's own liquidity, not an upper bound from the fee alone. Each list must sum to the
 *  total it accompanies, else the line is unreadable. */
export function parsePoolStatusReply(reply) {
  const line = firstLines(reply)[0] ?? "";
  const f = line.split("\t");
  if (f[0] === "POOL_UNKNOWN" && f.length === 2) return { kind: "unknown", chainId: f[1] };
  if (f[0] === "ERR") return { ...refusalOf(f.slice(2)), class: f[1] };
  if (f[0] !== "POOL_STATUS" || f.length !== 8) return unreadable("not a POOL_STATUS line with its segments", line);
  const [, chainId, tick, feePips, total, locked, removableList, lockedList] = f;
  if (chainId === "" || !/^-?\d+$/.test(tick) || !WHOLE.test(feePips) || !WHOLE.test(total) || !WHOLE.test(locked)) return unreadable("a POOL_STATUS field is not a whole number", line);
  const segmentsOf = (text) => {
    if (text === "-") return [];
    const out = [];
    for (const part of text.split(",")) {
      const m = /^(-?\d+):(-?\d+):(\d+)$/.exec(part);
      if (!m || Number(m[1]) >= Number(m[2]) || BigInt(m[3]) === 0n) return null;
      out.push({ tickLower: Number(m[1]), tickUpper: Number(m[2]), liquidity: BigInt(m[3]) });
    }
    return out;
  };
  const removable = segmentsOf(removableList);
  const lockedSegments = segmentsOf(lockedList);
  if (removable === null || lockedSegments === null) return unreadable("a segment is not lo:hi:liquidity with lo < hi and liquidity above 0", line);
  const sum = (segments) => segments.reduce((acc, s) => acc + s.liquidity, 0n);
  if (sum(removable) !== BigInt(total)) return unreadable("the removable segments do not sum to the pool's liquidity", line);
  if (sum(lockedSegments) !== BigInt(locked)) return unreadable("the locked segments do not sum to the pool's locked liquidity", line);
  return { kind: "pool", chainId, currentTick: Number(tick), feePips: Number(feePips), totalLiquidity: BigInt(total), totalLockedLiquidity: BigInt(locked), removable, locked: lockedSegments };
}

export function parseChainProvidersReply(reply) {
  const frames = reply.split("\n");
  const head = (frames.shift() ?? "").split("\t");
  if (head[0] !== "CHAIN_PROVIDERS") return { kind: "error", raw: reply };
  // An empty or non-numeric count is unreadable, never 0 providers (v4p P4b).
  if (!WHOLE.test(head[2] ?? "")) return unreadable("the provider count is not a whole number", frames.length ? head.join("\t") : reply);
  const declared = Number(head[2]);
  const end = frames.lastIndexOf("CHAIN_PROVIDERS_END");
  if (end < 0) return { kind: "error", reason: "reply had no CHAIN_PROVIDERS_END sentinel" };
  const rows = frames.slice(0, end);
  const providers = [];
  for (const line of rows) {
    // A row that is not `PROVIDER TAB signer TAB reach TAB deadline TAB proved` is unreadable, never a provider (v4p P4).
    const [tag, signerHex, reachAddress, heartbeatDeadline, proved, ...extra] = line.split("\t");
    if (tag !== "PROVIDER" || extra.length || !KEY64.test(signerHex ?? "") || reachAddress === undefined || !/^-?\d+$/.test(heartbeatDeadline ?? "")) return unreadable("malformed provider row", line);
    providers.push({ signerHex, reachAddress, heartbeatDeadline: Number(heartbeatDeadline), proved: parseProvedColumn(proved) });
  }
  if (providers.length !== declared) {
    return { kind: "error", reason: `declared ${head[2]} providers, received ${providers.length}` };
  }
  return { kind: "providers", chainId: head[1], providers };
}

const hexOfText = (text) => Array.from(new TextEncoder().encode(text), (b) => b.toString(16).padStart(2, "0")).join("");

export class WireClient {
  /** @param {string} url - wss://nodes.defxn.com/ws (default). */
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.ready = this._connect();
    /** Replies arrive in order; we hand them out FIFO. */
    this._pending = [];
  }

  _connect() {
    let promise;
    promise = new Promise((res, rej) => {
      const ws = new WebSocket(this.url);
      ws.onopen = () => { this.ws = ws; res(); };
      ws.onerror = (e) => {
        // A connection that never opened must not leave `this.ready`
        // pinned to this rejected promise forever -- the next call needs
        // a fresh attempt, not an immediate replay of this one failure.
        if (this.ready === promise) this.ready = null;
        rej(e);
      };
      ws.onmessage = (ev) => {
        const line = String(ev.data).replace(/\r?\n$/, "");
        const waiter = this._pending.shift();
        if (waiter) waiter.res(line);
      };
      ws.onclose = () => {
        for (const w of this._pending) w.rej(new Error("ws closed"));
        this._pending = [];
        // A dead connection must not keep answering `ready` with a promise
        // that already resolved -- the next call reconnects instead of
        // reusing a socket that will never deliver anything again.
        if (this.ws === ws) { this.ws = null; this.ready = null; }
      };
    });
    return promise;
  }

  /** Reconnects only if this is still the live connection -- a timeout
   *  racing a real reply (which already resolved and shifted itself off
   *  `_pending`) must not tear down a connection that just came good. */
  _reconnectIfStale(ws) {
    if (this.ws !== ws) return;
    try { ws.close(); } catch (_) { /* already going away */ }
    this.ws = null;
    this.ready = this._connect();
  }

  async _send(frame) {
    if (!this.ready) this.ready = this._connect();
    await this.ready;
    const ws = this.ws;
    const line = frame.endsWith("\n") ? frame : frame + "\n";
    return new Promise((res, rej) => {
      const waiter = { res, rej };
      this._pending.push(waiter);
      const timer = setTimeout(() => {
        const i = this._pending.indexOf(waiter);
        if (i === -1) return; // a reply already arrived and resolved this
        this._pending.splice(i, 1);
        this._reconnectIfStale(ws);
        rej(new Error(`no reply after ${REPLY_TIMEOUT_MS}ms -- connection looked stale and was reconnected; try again`));
      }, REPLY_TIMEOUT_MS);
      const clearAnd = (fn) => (value) => { clearTimeout(timer); fn(value); };
      waiter.res = clearAnd(res);
      waiter.rej = clearAnd(rej);
      ws.send(line);
    });
  }

  /** Public alias for [`_send`] — a real, previously-missing gap, found
   *  while wiring the base-chain FXN mint page: `flx-native-transfer.mjs`'s
   *  `nativeBalance`/`nativeHistory` are written against a `wire.send(...)`
   *  interface (its own test mocks a plain `{ send }` object), but this
   *  class never exposed one — only the underscore-prefixed `_send`,
   *  which every method on this class itself already calls. Nothing in
   *  production ever called those two functions against a REAL
   *  `WireClient` before now (confirmed by grep), so the mismatch never
   *  threw. This makes a real `WireClient` instance usable with that
   *  module for the first time, rather than quietly duplicating its
   *  one-line query in a second place. */
  send(frame) {
    return this._send(frame);
  }

  async _signedSignal(action, identity, fields) {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = randomNonceHex();
    const covered = signalingCoveredText(action, fields, timestamp, nonce);
    const signature = await signHex(identity.privateKey, covered);
    return this._send(
      `STRM_${action}\t${fields.join("\t")}\t${timestamp}\t${nonce}\t${signature}`,
    );
  }

  strmSub(streamId, identity) {
    return this._signedSignal("SUB", identity, [streamId, identity.pubHex]);
  }

  strmPull(streamId, identity) {
    return this._signedSignal("PULL", identity, [streamId, identity.pubHex]);
  }

  strmSend(streamId, identity, toSignerHex, kind, payload) {
    return this._signedSignal(
      "SEND",
      identity,
      [streamId, identity.pubHex, toSignerHex, kind, payload],
    );
  }

  strmLeave(streamId, identity) {
    return this._signedSignal("LEAVE", identity, [streamId, identity.pubHex]);
  }

  strmStat(streamId, identity) {
    return this._signedSignal("STAT", identity, [streamId, identity.pubHex]);
  }

  /** Submit a signed LEDGERENTRY. `tag` is a PayloadTag string (e.g.
   *  "PEER_ANNOUNCE", "EARN_SIGNER"). Returns parsed Reply. */
  async submit(tag, text) {
    const reply = await this._send(`${tag}\t${text}`);
    return parseReply(reply);
  }

  /** SEG_SUB → latest unfinalized segment snapshot (or idle). */
  async segSub() {
    const reply = await this._send("SEG_SUB\t");
    if (reply === "SEG_IDLE") return { kind: "idle" };
    const parts = reply.split("\t");
    if (parts[0] === "SEG_LATEST") {
      // F2 fix: parts[3] is lines_count, parts[4] is votes fraction.
      return voted({
        kind: "latest",
        root: parts[1],
        sequence: Number(parts[2]),
        linesCount: Number(parts[3]),
        votes: parseFraction(parts[4]),
      }, reply);
    }
    return { kind: "error", raw: reply };
  }

  /** SEG_PULL <root> → full snapshot of the segment at that root. */
  async segPull(root) {
    const reply = await this._send(`SEG_PULL\t${root}`);
    if (reply === "SEG_MISS") return { kind: "miss" };
    const parts = reply.split("\t");
    if (parts[0] === "SEG_SNAP") {
      // F2 fix: parts[4] is lines_count, parts[5] is votes fraction.
      return voted({
        kind: "snap",
        root: parts[1],
        sequence: Number(parts[2]),
        previousRoot: parts[3],
        linesCount: Number(parts[4]),
        votes: parseFraction(parts[5]),
      }, reply);
    }
    return { kind: "error", raw: reply };
  }

  /** SEG_PULL_LINES <root> → the raw lines of that segment.
   *
   *  F4: the whole reply arrives as one frame with embedded newlines —
   *  `SEG_LINES\t<root>\t<count>` then one line per LF, then `SEG_END`.
   *  The sentinel is what distinguishes a complete reply from a truncated
   *  one; a signer must never sign over a partial set of lines. */
  async segPullLines(root) {
    const reply = await this._send(`SEG_PULL_LINES\t${root}`);
    if (reply === "SEG_MISS") return { kind: "miss" };
    const frames = reply.split("\n");
    const head = (frames.shift() ?? "").split("\t");
    if (head[0] === "SEG_ERR") {
      return { kind: "error", reason: head.slice(1).join(" ") };
    }
    if (head[0] !== "SEG_LINES") return { kind: "error", reason: reply };
    const declared = Number(head[2]);
    const end = frames.lastIndexOf("SEG_END");
    if (end < 0) {
      return { kind: "error", reason: "reply had no SEG_END sentinel" };
    }
    const lines = frames.slice(0, end);
    if (!Number.isInteger(declared) || lines.length !== declared) {
      return {
        kind: "error",
        reason: `declared ${head[2]} lines, received ${lines.length}`,
      };
    }
    return { kind: "lines", root: head[1], lines };
  }

  /** SEG_SIG <root>\t<signer>\t<sig> → ACC/ACC_FIN/REJ. */
  async segSig(root, signerHex, signatureHex) {
    const reply = await this._send(`SEG_SIG\t${root}\t${signerHex}\t${signatureHex}`);
    const parts = reply.split("\t");
    if (parts[0] === "SEG_ACC") {
      return voted({ kind: "accepted", votes: parseFraction(parts[1]), finalized: false }, reply);
    }
    if (parts[0] === "SEG_ACC_FIN") {
      return voted({
        kind: "accepted",
        finalized: true,
        root: parts[1],
        applied: Number(parts[2]),
        votes: parseFraction(parts[3]),
      }, reply);
    }
    if (parts[0] === "SEG_REJ") {
      return { kind: "rejected", reason: parts[1] ?? "unknown" };
    }
    return { kind: "error", raw: reply };
  }

  // --------------------------------------------------------------------
  // Transfer-lifecycle / DAO / treasury commands.
  //
  // Reply shapes ported directly from `src/chain_server.rs`'s own doc
  // comments and wire tests (anchors cited per method). Every reply is
  // parsed by splitting on `\t` and branching on `parts[0]`, same
  // discipline as `segSig`/`segSub` above.
  // --------------------------------------------------------------------

  /** `MANIFEST_SUBMIT<TAB><record text>` — submits a `manifest_custody`
   *  record (`R-`/`T-`/`LOCK-`/`SLASH-`) through the real admission path
   *  (`chain.rs::Payload::ManifestReceipt` and its three siblings),
   *  dispatching on the record's own `K`. A `SLASH-`'s forfeiture
   *  destination now rides in the record's own signed `W` block (see
   *  `flx-transfer-builders.mjs::buildSlash`'s own doc comment for why) —
   *  this command no longer takes a second tab field for it. Success
   *  returns the SUBMITTED MANIFEST'S OWN CID, not a derived credit
   *  address — for a `T-`, derive the recipient/change credit CIDs locally
   *  via `recipientCreditCid`/`changeCreditCid` (`flx-transfer-builders.mjs`).
   *    -> MANIFEST_OK<TAB><cid>
   *    -> MANIFEST_ERR<TAB><reason> */
  async manifestSubmit(text) {
    const reply = await this._send(`MANIFEST_SUBMIT\t${text}`);
    const parts = reply.split("\t");
    if (parts[0] === "MANIFEST_OK") return { kind: "ok", cid: parts[1] };
    if (parts[0] === "MANIFEST_ERR") return { kind: "error", reason: parts[1] };
    return { kind: "error", raw: reply };
  }

  /** `HEAD<TAB><holder hex>` — the holder's own chain head, which is what a
   *  new record's `J` position and `C[0]` prev ref must extend
   *  (`chain.rs`'s admit: pos 0 needs `GENESIS_PREV` on an empty chain,
   *  every later pos must equal the chain's length with prev = its head
   *  CID, else `ERR chain-break`). Port of `chain_server.rs`'s
   *  `write_chain_head`.
   *    -> HEAD<TAB><holder><TAB><length><TAB><head cid>
   *    -> HEAD_NONE<TAB><holder>  (this node holds no chain for that holder:
   *       the next record goes at pos 0 citing GENESIS_PREV)
   *    -> HEAD_ERR<TAB><code><TAB><reason> */
  async chainHead(holderHex) {
    const reply = await this._send(`HEAD\t${holderHex}`);
    const parts = reply.split("\t");
    if (parts[0] === "HEAD") return { kind: "head", holder: parts[1], length: Number(parts[2]), headCid: parts[3] };
    if (parts[0] === "HEAD_NONE") return { kind: "none", holder: parts[1] };
    return { kind: "error", raw: reply };
  }

  /** `DAO_LIST<TAB>` — a multi-line reply arriving as one WS frame:
   *    DAO_LIST<TAB><count>\n
   *    DAO<TAB><dao_id><TAB><quorum_threshold><TAB><signer_count><TAB><treasury_pubkey|->\n
   *    ... (one per DAO) ...
   *    DAO_LIST_END
   *  Same "declared count + sentinel" discipline as `segPullLines`: a
   *  signer must never act on a truncated list. */
  async daoList() {
    const reply = await this._send("DAO_LIST\t");
    const frames = reply.split("\n");
    const head = (frames.shift() ?? "").split("\t");
    if (head[0] !== "DAO_LIST") return { kind: "error", raw: reply };
    const declared = Number(head[1]);
    const end = frames.lastIndexOf("DAO_LIST_END");
    if (end < 0) return { kind: "error", reason: "reply had no DAO_LIST_END sentinel" };
    const rows = frames.slice(0, end);
    const daos = rows.map((line) => {
      const parts = line.split("\t");
      return {
        daoId: parts[1],
        quorumThreshold: Number(parts[2]),
        signerCount: Number(parts[3]),
        treasuryPubkey: parts[4] === "-" ? null : parts[4],
      };
    });
    if (!Number.isInteger(declared) || daos.length !== declared) {
      return { kind: "error", reason: `declared ${head[1]} daos, received ${daos.length}` };
    }
    return { kind: "list", daos };
  }

  /** `RESOLVER_LIST<TAB>` — every resolver this node has activated, as one
   *  WS frame (same "declared count + sentinel" discipline as `daoList`):
   *    RESOLVER_LIST<TAB><count>\n
   *    RESOLVER<TAB><chain_id><TAB><offer_manifest_cid><TAB><grammar_manifest_cid>
   *      <TAB><control_key|-><TAB><declaration_head_cid><TAB><native|third-party>\n
   *    ... (one per resolver) ...
   *    RESOLVER_LIST_END
   *  An empty list (count 0) is the honest answer when nothing has
   *  launched here, not an error -- mirrors `chain_server.rs`'s own
   *  `resolver_list_reply` doc comment. */
  async resolverList() {
    const reply = await this._send("RESOLVER_LIST\t");
    const frames = reply.split("\n");
    const head = (frames.shift() ?? "").split("\t");
    if (head[0] !== "RESOLVER_LIST") return { kind: "error", raw: reply };
    const declared = Number(head[1]);
    const end = frames.lastIndexOf("RESOLVER_LIST_END");
    if (end < 0) return { kind: "error", reason: "reply had no RESOLVER_LIST_END sentinel" };
    const rows = frames.slice(0, end);
    const resolvers = rows.map((line) => {
      const [, chainId, offerManifestCid, grammarManifestCid, controlKey, declarationHeadCid, origin] = line.split("\t");
      return {
        chainId, offerManifestCid, grammarManifestCid,
        controlKey: controlKey === "-" ? null : controlKey,
        declarationHeadCid,
        native: origin === "native",
      };
    });
    if (!Number.isInteger(declared) || resolvers.length !== declared) {
      return { kind: "error", reason: `declared ${head[1]} resolvers, received ${resolvers.length}` };
    }
    return { kind: "list", resolvers };
  }

  /** `CHAIN_PROVIDERS<TAB><chain-id>` — who is live for this chain-id
   *  right now, and where to reach them (same sentinel discipline):
   *    CHAIN_PROVIDERS<TAB><chain-id><TAB><count>\n
   *    PROVIDER<TAB><signer-hex><TAB><reach-address><TAB><heartbeat-deadline>[<TAB><proved>]\n
   *    ... (one per provider) ...
   *    CHAIN_PROVIDERS_END
   *  `proved` (wave 2D) is the proof column -- `parseProvedColumn` -- and
   *  comes back as `providers[].proved: [{capability, sourceHash}]`.
   *  An empty list is the honest answer when nobody is currently
   *  announcing for this chain-id, never an error -- it says nothing
   *  about whether the chain-id itself is real (that is `resolverList`'s
   *  job). `reachAddress` is whatever transport that resolver actually
   *  listens on (a plain `host:port`, not necessarily a `ws://` URL this
   *  browser could dial directly -- the caller checks before using it). */
  async chainProviders(chainId) {
    return parseChainProvidersReply(await this._send(`CHAIN_PROVIDERS\t${chainId}`));
  }

  /** `MANIFEST_CREDITS<TAB><holder key hex>[<TAB><limit>]` (WP11, 2026-10-18): the
   *  holder's FXN custody credits with their status -- what a BUY on a
   *  backed launch must name one of (terms V2 `fund_credit`).
   *    MANIFEST_CREDITS<TAB><holder><TAB><count>\n
   *    CREDIT<TAB><cid><TAB><amount><TAB><status>\n   (status: live | locked:<beneficiary>:<deadline> | spent | forfeited)
   *    MANIFEST_CREDITS_END
   *    MANIFEST_CREDITS_ERR<TAB><failure><TAB><missing><TAB><remedy>
   *  Zero rows is an answer ("this key holds nothing"), never an error;
   *  a malformed holder is the error, named. */
  async custodyCredits(holderHex, limit) {
    const line = limit === undefined ? `MANIFEST_CREDITS\t${holderHex}` : `MANIFEST_CREDITS\t${holderHex}\t${limit}`;
    return parseCustodyCreditsReply(await this._send(line));
  }

  /** Wave 3E — `FEE_ACCOUNT<TAB><chain><TAB><account>`: one of a launch's fee accounts (`parseFeeAccountReply`). */
  async feeAccount(chainId, account) {
    return parseFeeAccountReply(await this._send(`FEE_ACCOUNT\t${chainId}\t${account}`));
  }

  /** Wave 3F — `INSURANCE_ACCOUNT<TAB><chain>`: the launch's own insurance custody account (`parseInsuranceAccountReply`). */
  async insuranceAccount(chainId) {
    return parseInsuranceAccountReply(await this._send(`INSURANCE_ACCOUNT\t${chainId}`));
  }

  /** Round three (r3c) — `CURVE_SOLD<TAB><chain>`: the share of a launch's curve sold, the `mm` rate a row pays now,
   *  the next breakpoint and the launch's mm mode (`parseCurveSoldReply`), what a tiered quote reads. */
  async curveSold(chainId) {
    return parseCurveSoldReply(await this._send(`CURVE_SOLD\t${chainId}`));
  }

  /** Round four (r4a) — `TOKEN_FEES<TAB><chain>`: every token LP fee entry of a launch (`parseTokenFeesReply`). */
  async tokenFees(chainId) {
    return parseTokenFeesReply(await this._send(`TOKEN_FEES\t${chainId}`));
  }

  /** Round four (r4a) — `LAUNCH_PROVIDERS<TAB><chain>`: a launch's creator and genesis provider keys (`parseLaunchProvidersReply`). */
  async launchProviders(chainId) {
    return parseLaunchProvidersReply(await this._send(`LAUNCH_PROVIDERS\t${chainId}`));
  }

  /** Round four (r4a) — `POOL_STATUS<TAB><chain>`: the pool's tick, fee and liquidity with its segments (`parsePoolStatusReply`). */
  async poolStatus(chainId) {
    return parsePoolStatusReply(await this._send(`POOL_STATUS\t${chainId}`));
  }

  /** Wave 3G — `CREATOR_BOND<TAB><chain>`: the creator bond's custody lock and its state (`parseCreatorBondReply`). */
  async creatorBond(chainId) {
    return parseCreatorBondReply(await this._send(`CREATOR_BOND\t${chainId}`));
  }

  /** Wave 3G — `CREATOR_VESTING<TAB><chain>`: the creator allocation's vesting (`parseCreatorVestingReply`). */
  async creatorVesting(chainId) {
    return parseCreatorVestingReply(await this._send(`CREATOR_VESTING\t${chainId}`));
  }

  /** Round three (r3u) — `FEE_CLAIM<TAB><record>`: submit a claimant-signed `KFEECLM1` record (`buildFeeClaimWithSigner`)
   *  and read what the node did with it (`parseFeeClaimReply`). */
  async feeClaim(recordText) {
    return parseFeeClaimReply(await this._send(`FEE_CLAIM\t${recordText}`));
  }

  /** `DAO_PROPOSE<TAB><dao_id><TAB><signers csv><TAB><quorum_threshold><TAB><registered_at>`.
   *    -> DAO_OPEN<TAB><dao_id><TAB><signers_blob_cid><TAB><have>/<need>
   *    -> DAO_ERR<TAB><reason> */
  async daoPropose(daoId, signerHexes, quorumThreshold, registeredAt) {
    const reply = await this._send(
      `DAO_PROPOSE\t${daoId}\t${signerHexes.join(",")}\t${quorumThreshold}\t${registeredAt}`,
    );
    const parts = reply.split("\t");
    if (parts[0] === "DAO_OPEN") {
      return voted({ kind: "open", daoId: parts[1], signersBlobCid: parts[2], votes: parseFraction(parts[3]) }, reply);
    }
    if (parts[0] === "DAO_ERR") return { kind: "error", reason: parts.slice(1).join("\t") };
    return { kind: "error", raw: reply };
  }

  /** `DAO_SIGN<TAB><dao_id><TAB><signer hex><TAB><signature hex>`.
   *    -> DAO_ACC_FIN<TAB><have>/<need><TAB><signers_cid><TAB><quorum_cid>
   *    -> DAO_ACC<TAB><have>/<need>
   *    -> DAO_REJ<TAB><reason> */
  async daoSign(daoId, signerHex, signatureHex) {
    const reply = await this._send(`DAO_SIGN\t${daoId}\t${signerHex}\t${signatureHex}`);
    const parts = reply.split("\t");
    if (parts[0] === "DAO_ACC_FIN") {
      return voted({
        kind: "accepted",
        finalized: true,
        votes: parseFraction(parts[1]),
        signersCid: parts[2],
        quorumCid: parts[3],
      }, reply);
    }
    if (parts[0] === "DAO_ACC") return voted({ kind: "accepted", finalized: false, votes: parseFraction(parts[1]) }, reply);
    if (parts[0] === "DAO_REJ") return { kind: "rejected", reason: parts.slice(1).join("\t") };
    return { kind: "error", raw: reply };
  }

  /** `DAO_STATUS<TAB><dao_id>`.
   *    -> DAO_STAT<TAB><dao_id><TAB><signers csv><TAB><quorum_threshold><TAB><have>/<need><TAB><0|1>
   *    -> DAO_UNKNOWN<TAB><dao_id> */
  async daoStatus(daoId) {
    const reply = await this._send(`DAO_STATUS\t${daoId}`);
    const parts = reply.split("\t");
    if (parts[0] === "DAO_STAT") {
      return voted({
        kind: "status",
        daoId: parts[1],
        signers: parts[2] ? parts[2].split(",") : [],
        quorumThreshold: Number(parts[3]),
        votes: parseFraction(parts[4]),
        finalized: parts[5] === "1",
      }, reply);
    }
    if (parts[0] === "DAO_UNKNOWN") return { kind: "unknown", daoId: parts[1] };
    return { kind: "error", raw: reply };
  }

  /** `TREASURY_INIT_PROPOSE<TAB><dao_id><TAB><treasury_pubkey><TAB><bound_at>`.
   *    -> TI_OPEN<TAB><dao_id><TAB><have>/<need>
   *    -> TI_ERR<TAB><reason> */
  async treasuryInitPropose(daoId, treasuryPubkey, boundAt) {
    const reply = await this._send(`TREASURY_INIT_PROPOSE\t${daoId}\t${treasuryPubkey}\t${boundAt}`);
    const parts = reply.split("\t");
    if (parts[0] === "TI_OPEN") return voted({ kind: "open", daoId: parts[1], votes: parseFraction(parts[2]) }, reply);
    if (parts[0] === "TI_ERR") return { kind: "error", reason: parts.slice(1).join("\t") };
    return { kind: "error", raw: reply };
  }

  /** `TREASURY_INIT_SIGN<TAB><dao_id><TAB><signer hex><TAB><signature hex>`.
   *    -> TI_ACC_FIN<TAB><have>/<need><TAB><quorum_cid>
   *    -> TI_ACC<TAB><have>/<need>
   *    -> TI_REJ<TAB><reason> */
  async treasuryInitSign(daoId, signerHex, signatureHex) {
    const reply = await this._send(`TREASURY_INIT_SIGN\t${daoId}\t${signerHex}\t${signatureHex}`);
    const parts = reply.split("\t");
    if (parts[0] === "TI_ACC_FIN") {
      return voted({ kind: "accepted", finalized: true, votes: parseFraction(parts[1]), quorumCid: parts[2] }, reply);
    }
    if (parts[0] === "TI_ACC") return voted({ kind: "accepted", finalized: false, votes: parseFraction(parts[1]) }, reply);
    if (parts[0] === "TI_REJ") return { kind: "rejected", reason: parts.slice(1).join("\t") };
    return { kind: "error", raw: reply };
  }

  /** `TREASURY_INIT_STATUS<TAB><dao_id>`.
   *    -> TI_STAT<TAB><dao_id><TAB><treasury_pubkey><TAB><have>/<need><TAB><0|1>
   *    -> TI_UNKNOWN<TAB><dao_id> */
  async treasuryInitStatus(daoId) {
    const reply = await this._send(`TREASURY_INIT_STATUS\t${daoId}`);
    const parts = reply.split("\t");
    if (parts[0] === "TI_STAT") {
      return voted({
        kind: "status",
        daoId: parts[1],
        treasuryPubkey: parts[2],
        votes: parseFraction(parts[3]),
        finalized: parts[4] === "1",
      }, reply);
    }
    if (parts[0] === "TI_UNKNOWN") return { kind: "unknown", daoId: parts[1] };
    return { kind: "error", raw: reply };
  }

  /** `NATIVE_SPEND_PROPOSE<TAB><dao_id><TAB><chain_id><TAB><recipient><TAB><amount><TAB><spent_at_ms>`.
   *  Opens a quorum ceremony to move native tokens out of the DAO's bound
   *  treasury. Each signer then signs `nativeTreasurySpendVoteCoveredBytes`.
   *    -> NS_OPEN<TAB><spend_key><TAB><have>/<need>
   *    -> NS_ERR<TAB><reason> */
  async nativeSpendPropose(daoId, chainId, toKeyHex, amount, spentAt) {
    const reply = await this._send(
      `NATIVE_SPEND_PROPOSE\t${daoId}\t${chainId}\t${toKeyHex}\t${BigInt(amount)}\t${spentAt}`,
    );
    const parts = reply.split("\t");
    if (parts[0] === "NS_OPEN") return voted({ kind: "open", spendKey: parts[1], votes: parseFraction(parts[2]) }, reply);
    if (parts[0] === "NS_ERR") return { kind: "error", reason: parts.slice(1).join("\t") };
    return { kind: "error", raw: reply };
  }

  /** `NATIVE_SPEND_SIGN<TAB><spend_key><TAB><signer hex><TAB><signature hex>`.
   *    -> NS_ACC_FIN<TAB><have>/<need><TAB><quorum_cid>
   *    -> NS_ACC<TAB><have>/<need>
   *    -> NS_REJ<TAB><reason> */
  async nativeSpendSign(spendKey, signerHex, signatureHex) {
    const reply = await this._send(`NATIVE_SPEND_SIGN\t${spendKey}\t${signerHex}\t${signatureHex}`);
    const parts = reply.split("\t");
    if (parts[0] === "NS_ACC_FIN") {
      return voted({ kind: "accepted", finalized: true, votes: parseFraction(parts[1]), quorumCid: parts[2] }, reply);
    }
    if (parts[0] === "NS_ACC") return voted({ kind: "accepted", finalized: false, votes: parseFraction(parts[1]) }, reply);
    if (parts[0] === "NS_REJ") return { kind: "rejected", reason: parts.slice(1).join("\t") };
    return { kind: "error", raw: reply };
  }

  /** `NATIVE_SPEND_STATUS<TAB><spend_key>`.
   *    -> NS_STAT<TAB><spend_key><TAB><dao_id><TAB><chain_id><TAB><recipient><TAB><amount><TAB><spent_at_ms><TAB><have>/<need><TAB><0|1>
   *    -> NS_UNKNOWN<TAB><spend_key> */
  async nativeSpendStatus(spendKey) {
    const reply = await this._send(`NATIVE_SPEND_STATUS\t${spendKey}`);
    const parts = reply.split("\t");
    if (parts[0] === "NS_STAT") {
      return voted({
        kind: "status",
        spendKey: parts[1],
        daoId: parts[2],
        chainId: parts[3],
        to: parts[4],
        amount: BigInt(parts[5]),
        spentAt: Number(parts[6]),
        votes: parseFraction(parts[7]),
        finalized: parts[8] === "1",
      }, reply);
    }
    if (parts[0] === "NS_UNKNOWN") return { kind: "unknown", spendKey: parts[1] };
    return { kind: "error", raw: reply };
  }

  /** `TREASURY_SPEND_PROPOSE<TAB><dao_id><TAB><input_cid><TAB><nonce><TAB><dest>:<amount>,...`.
   *  `legs` is `[destination, amount][]`.
   *    -> TS_OPEN<TAB><spend_key><TAB><manifest_cid><TAB><have>/<need>
   *    -> TS_ERR<TAB><reason> */
  async treasurySpendPropose(daoId, inputCid, nonce, legs) {
    const legsCsv = legs.map(([destination, amount]) => `${destination}:${amount}`).join(",");
    const reply = await this._send(`TREASURY_SPEND_PROPOSE\t${daoId}\t${inputCid}\t${nonce}\t${legsCsv}`);
    const parts = reply.split("\t");
    if (parts[0] === "TS_OPEN") {
      return voted({ kind: "open", spendKey: parts[1], manifestCid: parts[2], votes: parseFraction(parts[3]) }, reply);
    }
    if (parts[0] === "TS_ERR") return { kind: "error", reason: parts.slice(1).join("\t") };
    return { kind: "error", raw: reply };
  }

  /** `TREASURY_SPEND_SIGN<TAB><spend_key><TAB><signer hex><TAB><signature hex>`.
   *    -> TS_ACC_FIN<TAB><have>/<need><TAB><quorum_cid>
   *    -> TS_ACC<TAB><have>/<need>
   *    -> TS_REJ<TAB><reason> */
  async treasurySpendSign(spendKey, signerHex, signatureHex) {
    const reply = await this._send(`TREASURY_SPEND_SIGN\t${spendKey}\t${signerHex}\t${signatureHex}`);
    const parts = reply.split("\t");
    if (parts[0] === "TS_ACC_FIN") {
      return voted({ kind: "accepted", finalized: true, votes: parseFraction(parts[1]), quorumCid: parts[2] }, reply);
    }
    if (parts[0] === "TS_ACC") return voted({ kind: "accepted", finalized: false, votes: parseFraction(parts[1]) }, reply);
    if (parts[0] === "TS_REJ") return { kind: "rejected", reason: parts.slice(1).join("\t") };
    return { kind: "error", raw: reply };
  }

  /** `TREASURY_SPEND_STATUS<TAB><spend_key>`.
   *    -> TS_STAT<TAB><spend_key><TAB><dao_id><TAB><input_cid><TAB><have>/<need><TAB><0|1>
   *    -> TS_UNKNOWN<TAB><spend_key> */
  async treasurySpendStatus(spendKey) {
    const reply = await this._send(`TREASURY_SPEND_STATUS\t${spendKey}`);
    const parts = reply.split("\t");
    if (parts[0] === "TS_STAT") {
      return voted({
        kind: "status",
        spendKey: parts[1],
        daoId: parts[2],
        inputCid: parts[3],
        votes: parseFraction(parts[4]),
        finalized: parts[5] === "1",
      }, reply);
    }
    if (parts[0] === "TS_UNKNOWN") return { kind: "unknown", spendKey: parts[1] };
    return { kind: "error", raw: reply };
  }

  /** `TREASURY_CLAIM<TAB><spend_cid><TAB><claimTreasuryLeg receipt text>`.
   *  `spendCid` is its own leading field now (cut over to a
   *  `manifest_custody` `R-` receipt, src/treasury.rs::claim_leg — an
   *  `R-`'s fixed grammar has no field of its own for "which spend is this
   *  a leg of").
   *    -> TREASURY_CLAIMED<TAB><spend_cid><TAB><destination><TAB><amount><TAB><claim_cid>
   *    -> TREASURY_CLAIM_NOOP  (idempotent replay of an already-claimed record)
   *    -> TREASURY_CLAIM_ERR<TAB><reason> */
  async treasuryClaim(spendCid, text) {
    const reply = await this._send(`TREASURY_CLAIM\t${spendCid}\t${text}`);
    if (reply === "TREASURY_CLAIM_NOOP") return { kind: "noop" };
    const parts = reply.split("\t");
    if (parts[0] === "TREASURY_CLAIMED") {
      return { kind: "claimed", spendCid: parts[1], destination: parts[2], amount: parts[3], claimCid: parts[4] };
    }
    if (parts[0] === "TREASURY_CLAIM_ERR") return { kind: "error", reason: parts.slice(1).join("\t") };
    return { kind: "error", raw: reply };
  }

  /** `BLOB_PUT<TAB><text>` — publish arbitrary content-addressed text
   *  (e.g. a real FXN issuance record used as a treasury's input).
   *    -> BLOB_OK<TAB><cid>
   *    -> BLOB_ERR<TAB><reason> */
  async blobPut(text) {
    // A text that spans lines (a manifest in its own grammar, WARCH19 steps 2-4) cannot ride a line transport:
    // BLOB_PUT_HEX carries its UTF-8 bytes as hex (same bytes, same CID).
    const spansLines = /[\r\n]/.test(text);
    const reply = await this._send(spansLines ? `BLOB_PUT_HEX\t${hexOfText(text)}` : `BLOB_PUT\t${text}`);
    const parts = reply.split("\t");
    if (parts[0] === "BLOB_OK") return { kind: "ok", cid: parts[1] };
    if (parts[0] === "BLOB_ERR") return { kind: "error", reason: parts.slice(1).join("\t") };
    return { kind: "error", raw: reply };
  }

  /** `BLOB_GET<TAB><cid>` — read back content-addressed text by CID.
   *    -> BLOB_FOUND<TAB><text>
   *    -> BLOB_MISS  (this node does not hold it yet -- defer, not refuse;
   *       the same contract `ContentBlobs::fetch` documents server-side) */
  async blobGet(cid) {
    const reply = await this._send(`BLOB_GET\t${cid}`);
    if (reply === "BLOB_MISS") return { kind: "miss" };
    if (reply.startsWith("BLOB_FOUND\t")) return { kind: "found", text: reply.slice("BLOB_FOUND\t".length) };
    return { kind: "error", raw: reply };
  }

  /** `BLOB_GET_HEX<TAB><cid>` — read back content-addressed text that may span lines.
   *    -> BLOB_FOUND_HEX<TAB><hex of the UTF-8 bytes>
   *    -> BLOB_MISS */
  async blobGetHex(cid) {
    const reply = await this._send(`BLOB_GET_HEX\t${cid}`);
    if (reply === "BLOB_MISS") return { kind: "miss" };
    if (reply.startsWith("BLOB_FOUND_HEX\t")) {
      const hex = reply.slice("BLOB_FOUND_HEX\t".length).trim();
      if (hex.length % 2 === 0 && /^[0-9a-f]*$/.test(hex)) {
        try {
          return { kind: "found", text: new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(hex.match(/../g) ?? [], (b) => parseInt(b, 16))) };
        } catch {
          // falls through to the error below
        }
      }
    }
    return { kind: "error", raw: reply };
  }

  /** A blob's text by CID, whether or not it spans lines: `BLOB_GET_HEX` first, `BLOB_GET` when the node does not
   *  answer it with the blob (a node that predates it, or a one-line blob it holds the other way). */
  async blobGetText(cid) {
    const hexed = await this.blobGetHex(cid).catch(() => ({ kind: "error" }));
    if (hexed.kind === "found") return hexed;
    return this.blobGet(cid);
  }

  /** `RESOLVER_RECORD_GET<TAB><cid>` — fetch any `ResolverLaunch`/
   *  `ResolverUpgrade`/`ResolverRecord` this node holds by its own CID
   *  (the cross-resolver fetch primitive, Phase 1 of global resolvers).
   *  A miss means this node holds nothing at that address, never a
   *  refusal of the CID itself — same contract `blobGet` already has.
   *  The caller recomputes the CID over `text` and verifies the
   *  record's own signature itself; this method does neither.
   *    -> RESOLVER_RECORD_FOUND<TAB><chain-id><TAB><text>
   *    -> RESOLVER_RECORD_MISS */
  async resolverRecordGet(cid) {
    const reply = await this._send(`RESOLVER_RECORD_GET\t${cid}`);
    if (reply === "RESOLVER_RECORD_MISS") return { kind: "miss" };
    if (reply.startsWith("RESOLVER_RECORD_FOUND\t")) {
      const rest = reply.slice("RESOLVER_RECORD_FOUND\t".length);
      const tab = rest.indexOf("\t");
      if (tab < 0) return { kind: "error", raw: reply };
      return { kind: "found", chainId: rest.slice(0, tab), text: rest.slice(tab + 1) };
    }
    return { kind: "error", raw: reply };
  }

  /** `RESOLVER_RECORDS<TAB><chain-id>` — one resolver chain's whole
   *  admitted history (its launch, every upgrade, every record), oldest
   *  first. The explorer's drill-down from a `RESOLVER_LIST` row. Every
   *  row is `{cid, text}`; the caller re-verifies each text against its
   *  cid and signature itself, as with `resolverRecordGet`. A chain this
   *  node holds nothing for is an empty list, never an error.
   *    -> RESOLVER_RECORDS<TAB><chain-id><TAB><count>
   *       RECORD<TAB><cid><TAB><text> (repeated)
   *       RESOLVER_RECORDS_END */
  async resolverRecords(chainId) {
    const reply = await this._send(`RESOLVER_RECORDS\t${chainId}`);
    const frames = reply.split("\n");
    if (!frames[0]?.startsWith("RESOLVER_RECORDS\t")) return { kind: "error", raw: reply };
    const declared = Number(frames[0].split("\t")[2]);
    const rows = [];
    for (const frame of frames.slice(1)) {
      if (!frame.startsWith("RECORD\t")) continue;
      const rest = frame.slice("RECORD\t".length);
      const tab = rest.indexOf("\t");
      if (tab < 0) continue;
      rows.push({ cid: rest.slice(0, tab), text: rest.slice(tab + 1) });
    }
    if (rows.length !== declared) return { kind: "error", reason: `declared ${declared} records, got ${rows.length}` };
    return { kind: "records", chainId, rows };
  }

  /** `CAPABILITY_LIST<TAB>` (architecture batch 1, B3 — capability
   *  registry on chain) — every capability launched on this node's
   *  registry ledger, same "declared count + END sentinel" discipline as
   *  `resolverList`:
   *    CAPABILITY_LIST<TAB><count>\n
   *    CAPABILITY<TAB><id><TAB><manifest_cid><TAB><control_key|->
   *      <TAB><declaration_head_cid><TAB><version><TAB><vector_count><TAB><source_hash>\n
   *    ... (one per capability) ...
   *    CAPABILITY_LIST_END
   *  `-` for control means immutable (the `GENESIS_PREV` sentinel at
   *  launch) and is reported as `controlKey: null`, exactly as
   *  `resolverList` does. `version`/`vectorCount`/`sourceHash` are what
   *  the node decoded from the manifest it admitted (`flx-capability-
   *  manifest/1`); the caller fetches the manifest by `manifestCid` and
   *  hash-verifies it itself before trusting any of them further. An
   *  empty list is the honest answer when nothing has launched here. */
  async capabilityList() {
    const reply = await this._send("CAPABILITY_LIST\t");
    const frames = reply.split("\n");
    const head = (frames.shift() ?? "").split("\t");
    if (head[0] !== "CAPABILITY_LIST") return { kind: "error", raw: reply };
    const declared = Number(head[1]);
    const end = frames.lastIndexOf("CAPABILITY_LIST_END");
    if (end < 0) return { kind: "error", reason: "reply had no CAPABILITY_LIST_END sentinel" };
    const rows = frames.slice(0, end);
    const capabilities = rows.map((line) => {
      const [, id, manifestCid, controlKey, declarationHeadCid, version, vectorCount, sourceHash] = line.split("\t");
      return {
        id,
        manifestCid,
        controlKey: controlKey === "-" ? null : controlKey,
        declarationHeadCid,
        version,
        vectorCount: Number(vectorCount),
        sourceHash,
      };
    });
    if (!Number.isInteger(declared) || capabilities.length !== declared) {
      return { kind: "error", reason: `declared ${head[1]} capabilities, received ${capabilities.length}` };
    }
    return { kind: "list", capabilities };
  }

  /** `CAPABILITY_RECORDS<TAB><id>` (B3) — one capability's whole
   *  declaration history (its launch, every upgrade), oldest first; the
   *  explorer's drill-down from a `CAPABILITY_LIST` row, same row shape
   *  and same caller-verifies contract as `resolverRecords`. A capability
   *  this node holds nothing for is an empty list, never an error.
   *    -> CAPABILITY_RECORDS<TAB><id><TAB><count>
   *       RECORD<TAB><cid><TAB><text> (repeated)
   *       CAPABILITY_RECORDS_END */
  async capabilityRecords(id) {
    const reply = await this._send(`CAPABILITY_RECORDS\t${id}`);
    const frames = reply.split("\n");
    if (!frames[0]?.startsWith("CAPABILITY_RECORDS\t")) return { kind: "error", raw: reply };
    const declared = Number(frames[0].split("\t")[2]);
    const end = frames.lastIndexOf("CAPABILITY_RECORDS_END");
    if (end < 0) return { kind: "error", reason: "reply had no CAPABILITY_RECORDS_END sentinel" };
    const rows = [];
    for (const frame of frames.slice(1, end)) {
      if (!frame.startsWith("RECORD\t")) continue;
      const rest = frame.slice("RECORD\t".length);
      const tab = rest.indexOf("\t");
      if (tab < 0) continue;
      rows.push({ cid: rest.slice(0, tab), text: rest.slice(tab + 1) });
    }
    if (rows.length !== declared) return { kind: "error", reason: `declared ${declared} records, got ${rows.length}` };
    return { kind: "records", id, rows };
  }

  /** `HEAD<TAB><holder pubkey hex>` — this node's view of one holder's
   *  chain head, `(length, head cid)`, or none if it holds no chain for
   *  that holder yet (a fresh identity that hasn't submitted a genesis).
   *    -> HEAD<TAB><holder><TAB><length><TAB><cid>
   *    -> HEAD_NONE<TAB><holder> */
  async head(pubHex) {
    const reply = await this._send(`HEAD\t${pubHex}`);
    const parts = reply.split("\t");
    if (parts[0] === "HEAD") {
      return { kind: "head", holder: parts[1], length: Number(parts[2]), cid: parts[3] };
    }
    if (parts[0] === "HEAD_NONE") return { kind: "none", holder: parts[1] };
    return { kind: "error", raw: reply };
  }

  /** Resolver-auto-chain — `ACL_FOR<TAB><subject>` — latest ACL grant
   *  evidence for a subject.
   *    -> ACL_GRANT<TAB><subject><TAB><record_cid><TAB><observed_at><TAB><hex acl json>
   *    -> ACL_NONE<TAB><subject> */
  async aclFor(subject) {
    const reply = await this._send(`ACL_FOR\t${subject}`);
    const parts = reply.split("\t");
    if (parts[0] === "ACL_GRANT") {
      return {
        kind: "grant",
        subject: parts[1],
        recordCid: parts[2],
        observedAt: Number(parts[3]),
        aclJson: utf8OfHex(parts[4]),
      };
    }
    if (parts[0] === "ACL_NONE") return { kind: "none", subject: parts[1] };
    return { kind: "error", raw: reply };
  }

  /** Resolver-auto-chain — `ACL_HIST<TAB><subject>` — full grant history,
   *  oldest first. Same "whole reply is one frame with embedded
   *  newlines, sentinel count" discipline as `segPullLines`. */
  async aclHist(subject) {
    const reply = await this._send(`ACL_HIST\t${subject}`);
    const frames = reply.split("\n");
    const endIdx = frames.findIndex((f) => f.startsWith("ACL_HIST_END\t"));
    if (endIdx < 0) return { kind: "error", reason: "reply had no ACL_HIST_END sentinel" };
    const declared = Number(frames[endIdx].split("\t")[1]);
    const lines = frames.slice(0, endIdx).map((line) => {
      const p = line.split("\t");
      return {
        n: Number(p[1]),
        recordCid: p[2],
        observedAt: Number(p[3]),
        aclJson: utf8OfHex(p[4]),
      };
    });
    if (!Number.isInteger(declared) || lines.length !== declared) {
      return { kind: "error", reason: `declared ${frames[endIdx]} lines, received ${lines.length}` };
    }
    return { kind: "history", subject, entries: lines };
  }

  // --- Domain protocol: writes go through `submit(tag, body)` with the
  // PayloadTag wire string the server's `PayloadTag::from_str` (and the
  // `else if let Some(tag) = PayloadTag::from_str(head)` fallback arm in
  // the WS dispatch) expects -- NOT the `K...1` grammar constant the
  // builders embed inside the body itself. Those two are deliberately
  // different strings at two different layers (outer command vs. inner
  // payload-kind field); getting this tag wrong is the single easiest way
  // for a working `buildDomain*` body to go nowhere. Mirrors how
  // `app.mjs`/`ark-mode.mjs` already call `submit("PEER_ANNOUNCE", ...)`
  // for the roster payload. ---

  /** Submit a signed KDOMCLAIM2 (`buildDomainClaim`'s result). A claim by
   *  a key other than the chain's genesis key is admitted onto its signer's
   *  chain but allocates nothing: the reply is
   *  `{ kind: "domain-refused", cid, reason }`. Same for the other four name
   *  kinds below (purchase keeps its own `domain-purchase-refused`). */
  domainClaim(body) {
    return this.submit("DOMAIN_CLAIM", body);
  }

  /** Submit a signed KDOMREC2 (`buildDomainRecordUpdate`'s result). */
  domainRecordUpdate(body) {
    return this.submit("DOMAIN_RECORD_UPDATE", body);
  }

  /** Submit a signed KDOMXFER1 (`buildDomainTransfer`'s result). */
  domainTransfer(body) {
    return this.submit("DOMAIN_TRANSFER", body);
  }

  /** Submit a signed KDOMXFER2 (`buildDomainTransferV2`'s result). */
  domainTransferV2(body) {
    return this.submit("DOMAIN_TRANSFER_V2", body);
  }

  /** Submit a signed KDOMBUY1 (`buildDomainPurchase`'s result).
   *
   *  Resolves to one of:
   *    { kind: "ok", cid }                          — admitted AND settled; ownership moved.
   *    { kind: "domain-purchase-refused", cid, reason } — admitted (the record
   *      is on the chain), but the real settlement check refused: the
   *      referenced `manifest_custody` credit was not live/held/unspent for
   *      the agreed price, so ownership did NOT move. `reason` is a human-
   *      readable explanation (what failed, what was missing, the remedy).
   *    { kind: "err", code, reason }                — admission itself was refused
   *      (malformed shape, bad signature, chain break, ...); never submitted.
   *
   *  Before this reply shape existed, a shape-valid-but-unsettled purchase
   *  replied `{ kind: "ok" }` indistinguishably from a real success — the
   *  only way to tell was reading ownership back with `domWho()`/
   *  `domHist()`. Callers should check `kind` directly now rather than
   *  reading ownership back. */
  domainPurchase(body) {
    return this.submit("DOMAIN_PURCHASE", body);
  }

  // --- Domain protocol: reads. Mirrors `chain_server.rs::handle_domain_command`'s
  // doc comment exactly -- see that comment before changing any of these. ---

  /** `DOM_WHO<TAB><fqdn>` — current owner of a claimed name, as this node
   *  asserts it (use `domProof` + `verifyDomainProof` to check it yourself).
   *    -> DOM_OWNER<TAB><fqdn><TAB><owner pubkey hex><TAB><head entry cid><TAB><claim|transfer|purchase>
   *    -> DOM_NONE<TAB><fqdn> */
  async domWho(fqdn) {
    const reply = await this._send(`DOM_WHO\t${fqdn}`);
    const parts = reply.split("\t");
    if (parts[0] === "DOM_OWNER") {
      return {
        kind: "owner",
        fqdn: parts[1],
        ownerPubHex: parts[2],
        entryCid: parts[3],
        source: parts[4],
      };
    }
    if (parts[0] === "DOM_NONE") return { kind: "none", fqdn: parts[1] };
    return { kind: "error", raw: reply };
  }

  /** `DOM_HIST<TAB><fqdn>` — full ownership history, oldest first.
   *    -> DOM_HIST_LINE<TAB><n><TAB><owner><TAB><entry cid><TAB><claim|transfer|purchase> (per link)
   *    -> DOM_HIST_END<TAB><count> */
  async domHist(fqdn) {
    const reply = await this._send(`DOM_HIST\t${fqdn}`);
    const frames = reply.split("\n");
    const endIdx = frames.findIndex((f) => f.startsWith("DOM_HIST_END\t"));
    if (endIdx < 0) return { kind: "error", reason: "reply had no DOM_HIST_END sentinel" };
    const declared = Number(frames[endIdx].split("\t")[1]);
    const entries = frames.slice(0, endIdx).map((line) => {
      const p = line.split("\t");
      return { n: Number(p[1]), ownerPubHex: p[2], entryCid: p[3], source: p[4] };
    });
    if (!Number.isInteger(declared) || entries.length !== declared) {
      return { kind: "error", reason: `declared ${frames[endIdx]} lines, received ${entries.length}` };
    }
    return { kind: "history", fqdn, entries };
  }

  /** `DOM_NAMES` — every name this node knows an owner for.
   *    -> DOM_NAME<TAB><fqdn> (per name), then DOM_NAMES_END<TAB><count> */
  async domNames() {
    const reply = await this._send("DOM_NAMES\t");
    const frames = reply.split("\n");
    const endIdx = frames.findIndex((f) => f.startsWith("DOM_NAMES_END\t"));
    if (endIdx < 0) return { kind: "error", reason: "reply had no DOM_NAMES_END sentinel" };
    const declared = Number(frames[endIdx].split("\t")[1]);
    const names = frames.slice(0, endIdx).map((line) => line.split("\t")[1]);
    if (!Number.isInteger(declared) || names.length !== declared) {
      return { kind: "error", reason: `declared ${frames[endIdx]} lines, received ${names.length}` };
    }
    return { kind: "names", names };
  }

  /** `DOM_RECORD<TAB><fqdn>` — the current owner's current record, as its
   *  signed KDOMREC2 entry. `record` is the entry's own boxes read back
   *  (`readRecordEntry`), NOT verified: verify with `domProof` +
   *  `verifyDomainProof` before trusting it.
   *    -> DOM_RECORD_LINE<TAB><fqdn><TAB><record entry cid><TAB><signed entry>
   *    -> DOM_NONE<TAB><fqdn>  (no owner, or the current owner wrote no record) */
  async domRecord(fqdn) {
    const reply = await this._send(`DOM_RECORD\t${fqdn}`);
    const parts = reply.split("\t");
    if (parts[0] === "DOM_RECORD_LINE") {
      return { kind: "record", fqdn: parts[1], recordCid: parts[2], entryText: parts[3], record: readRecordOrNull(parts[3]) };
    }
    if (parts[0] === "DOM_NONE") return { kind: "none", fqdn: parts[1] };
    return { kind: "error", raw: reply };
  }

  /** `DOM_RECORD_HIST<TAB><fqdn>` — every record under the current owner,
   *  oldest first, each as its signed entry (unverified, as `domRecord`).
   *    -> DOM_RECORD_HIST_LINE<TAB><n><TAB><record entry cid><TAB><signed entry>
   *    -> DOM_RECORD_HIST_END<TAB><count> */
  async domRecordHist(fqdn) {
    const reply = await this._send(`DOM_RECORD_HIST\t${fqdn}`);
    const frames = reply.split("\n");
    const endIdx = frames.findIndex((f) => f.startsWith("DOM_RECORD_HIST_END\t"));
    if (endIdx < 0) return { kind: "error", reason: "reply had no DOM_RECORD_HIST_END sentinel" };
    const declared = Number(frames[endIdx].split("\t")[1]);
    const entries = frames.slice(0, endIdx).map((line) => {
      const [, n, recordCid, entryText] = line.split("\t");
      return { n: Number(n), recordCid, entryText, record: readRecordOrNull(entryText) };
    });
    if (!Number.isInteger(declared) || entries.length !== declared) {
      return { kind: "error", reason: `declared ${frames[endIdx]} lines, received ${entries.length}` };
    }
    return { kind: "history", fqdn, entries };
  }

  /** `DOM_PROOF<TAB><fqdn>` — the signed entries behind the name's current
   *  owner (claim, transfers, purchases, oldest first) and its current
   *  record, if any. Hand the result to `verifyDomainProof` from
   *  `flx-domain-proof.mjs` with your pinned genesis key; this method checks
   *  nothing itself.
   *    -> { kind: "proof", fqdn, entries } | { kind: "none", fqdn } | { kind: "error", reason } */
  async domProof(fqdn) {
    return parseDomainProofReply(await this._send(`DOM_PROOF\t${fqdn}`));
  }

  close() {
    try { this.ws?.close(); } catch {}
  }
}

/** A `have/need` vote count, or null when the field is missing or not two whole numbers: a count the node did not
 *  state is never read as 0/0 (v4p P5). */
function parseFraction(s) {
  const m = /^(\d+)\/(\d+)$/.exec(String(s ?? "").trim());
  return m ? { have: Number(m[1]), need: Number(m[2]) } : null;
}

/** A vote-bearing reply whose `have/need` field is unreadable is unreadable as a whole, never a reply with no votes. */
function voted(out, reply) {
  return out.votes ? out : unreadable("the reply does not state its votes as have/need", reply);
}

function parseReply(line) {
  const parts = line.split("\t");
  if (parts[0] === "OK") return { kind: "ok", cid: parts[1] };
  if (parts[0] === "ERR") return { kind: "err", code: parts[1], reason: parts[2] };
  // `DomainPurchase`-only: admission succeeded (the record is on the
  // chain, see `chain_server.rs::flush_batch_into`'s own comment — this
  // is NOT an admission `ERR`), but the real settlement check
  // (`domain_claims.rs::DomainResolver::observe`, the thing that verifies
  // the referenced `manifest_custody` credit was actually live/held/
  // unspent for the agreed price) refused, so ownership never moved.
  // `reason` is `DomainError::explain()`'s text: what failed, what was
  // missing, and the remedy. Before this reply shape existed, a caller
  // had no way to learn this except reading ownership back with
  // `domWho()`/`domHist()` — see that integration test's old file-level
  // comment for the gap this closes.
  if (parts[0] === "DOMAIN_PURCHASE_REFUSED") {
    return { kind: "domain-purchase-refused", cid: parts[1], reason: parts[2] };
  }
  // The other four name kinds (claim, transfer v1/v2, record): admitted
  // onto the signer's chain, but the resolver refused it, so it changed
  // nothing (e.g. a claim not signed by the genesis key). `reason` names
  // the failure, what is missing and the remedy.
  if (parts[0] === "DOMAIN_REFUSED") {
    return { kind: "domain-refused", cid: parts[1], reason: parts[2] };
  }
  return { kind: "raw", line };
}
