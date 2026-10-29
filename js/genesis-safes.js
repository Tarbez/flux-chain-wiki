/* One genesis safe, built from the mint's plan (devnet genesis safes, 2026-10-23).

   The one place this page turns a planned safe into the records that create it: its configuration (the council, under
   the DAO's public treasury), its schedule (starting at the mint's M) and, for a ruled safe, its rule. The rule's
   values come from the plan (FXN_GENESIS_PLAN's last three columns), never from this page. The address is derived
   here and must equal the one the mint paid, so a page that builds another safe refuses before anything is signed.
   The Safes step (js/genesis-distribute.js) and the mint's read-back (js/genesis-readback.js) both use it, and so do
   the devnet scripts: this module touches no DOM, so it runs in Node too. The plan read (`readPlan`, `parsePlan`) lives
   here for the same reason.

   `plan` is `{ head: { daoId, threshold, signers, start } }`; `safe` is a PLAN_SAFE row as js/genesis-distribute.js
   parses it (`label, address, kind, amount, cliff, tranches, interval, capBps, windowSecs, recipientCap, upfront`).

   Every amount in the plan is FXN base units, held as BigInt (dense-wire docs/FXN-DECIMALS-DESIGN.md). `upfront` is the
   PLAN_SAFE column appended 2026-10-29 (owner ruling): the part of the safe vested at the mint's M. It is inside the
   safe's address, so `safeOf` must build the vesting with it; an older node that sends no such column reads as 0. */
import {
  DEFAULT_TREASURY_LABEL, KIND_SAFE_CREATE, KIND_VESTED_SAFE_CREATE,
  safeConfig, safeAddress, safeCreateCovered, safeCreatePayload,
  safeVesting, vestedSafeAddress, vestedSafeCreateCovered, vestedSafeCreatePayload,
  safeRuleOfKind, ruledSafeKind, checkRuledSafe, ruledSafeAddress, ruledSafeCreateCovered, ruledSafeCreatePayload,
} from "./dense-wire/flx-dao-gov-builders.mjs";

const dash = (v) => (v === undefined || v === "-" ? null : v);
const num = (v) => (dash(v) === null ? null : Number(v));
/** An amount column: base units as BigInt, or null for `-`. */
const units = (v) => (dash(v) === null ? null : BigInt(v));

// ---------------------------------------------------------------------------------------------------------------
// The plan read (pure parsing is exported so it can be checked without a browser)
// ---------------------------------------------------------------------------------------------------------------

/** `FXN_GENESIS_PLAN` reply -> `{ kind: "ok", head, safes, rules, transfers }`,
 *  `{ kind: "refused", failure, missing, remedy, why }` or `{ kind: "unavailable", why }`. */
export function parsePlan(reply) {
  const lines = String(reply ?? "").split("\n").filter((l) => l !== "");
  const head = (lines[0] || "").split("\t");
  if (head[0] === "DAO_GOV_ERR") {
    return { kind: "refused", failure: head[1] || "", missing: head[2] || "", remedy: head[3] || "", why: `${head[1]}. Missing: ${head[2]}. To fix: ${head[3]}.` };
  }
  if (head[0] !== "FXN_GENESIS_PLAN" || lines[lines.length - 1] !== "FXN_GENESIS_PLAN_END") {
    return { kind: "unavailable", why: "The node did not answer the plan read" };
  }
  const n = Number(head[10]);
  const rows = lines.slice(1, -1).map((l) => l.split("\t"));
  const safes = rows.filter((p) => p[0] === "PLAN_SAFE").map((p) => ({
    label: p[1], address: p[2], kind: p[3], amount: BigInt(p[4]),
    cliff: num(p[5]), tranches: num(p[6]), interval: num(p[7]),
    createdAt: num(p[8]), balance: units(p[9]), vestedNow: units(p[10]), moved: units(p[11]),
    capBps: dash(p[14]), windowSecs: dash(p[15]), recipientCap: dash(p[16]), upfront: units(p[17]) ?? 0n,
  }));
  const rules = rows.filter((p) => p[0] === "PLAN_RULE").map((p) => ({
    label: p[1], address: p[2], kind: "rule", amount: BigInt(p[3]), balance: units(p[4]), createdAt: null, vestedNow: null, moved: null, upfront: 0n,
  }));
  const transfers = rows.filter((p) => p[0] === "PLAN_TRANSFER").map((p) => ({ label: p[1], from: p[2], to: p[3], amount: BigInt(p[4]) }));
  if (safes.length !== n || transfers.length !== safes.length + rules.length) return { kind: "unavailable", why: "The plan read was cut short" };
  return {
    kind: "ok",
    head: {
      daoId: head[1], chainId: head[2], treasury: head[3], total: BigInt(head[4]), reserve: BigInt(head[5]), share: BigInt(head[6]),
      start: num(head[7]), threshold: Number(head[8]), signers: (head[9] || "").split(",").filter(Boolean),
    },
    safes,
    rules,
    transfers,
  };
}

/** The mint's own plan for `daoId`. Nothing is chosen at read time, so the
 *  treasury and start fields are always `-`. */
export async function readPlan(wire, daoId) {
  try {
    await wire.ready;
    return parsePlan(await wire.send(`FXN_GENESIS_PLAN\t${daoId}\t-\t-`));
  } catch (error) {
    return { kind: "unavailable", why: error?.message ? `The node did not answer: ${error.message}` : "The node did not answer" };
  }
}

/** One planned safe as the records build it: `{ kind, config, vesting, rule }`, from the plan. Its address is
 *  derived here from the council, the mint's start and the rule, and must equal the address the mint paid. A rule or
 *  schedule the chain would refuse is refused here, in the chain's words, before anything is signed. */
export async function safeOf(plan, safe) {
  const config = safeConfig({ daoId: plan.head.daoId, treasury: DEFAULT_TREASURY_LABEL, label: safe.label, threshold: plan.head.threshold, signers: plan.head.signers });
  const vesting = safe.kind === KIND_SAFE_CREATE
    ? null
    : safeVesting({ total: safe.amount, start: plan.head.start, cliff: safe.cliff, tranches: safe.tranches, interval: safe.interval, upfront: safe.upfront ?? 0n });
  const rule = safeRuleOfKind(safe.kind, safe);
  if (!rule && safe.kind !== KIND_VESTED_SAFE_CREATE && safe.kind !== KIND_SAFE_CREATE) {
    throw new Error(`The safe ${safe.label} is a ${safe.kind}, a kind this page does not build. Missing: a builder for ${safe.kind} in flx-dao-gov-builders.mjs. To fix: re-vendor the builders from dense-wire.`);
  }
  if (rule) checkRuledSafe(vesting, rule);
  const address = rule ? await ruledSafeAddress(config, vesting, rule) : vesting ? await vestedSafeAddress(config, vesting) : await safeAddress(config);
  if (address !== safe.address) {
    throw new Error(`The safe ${safe.label} derives to ${address.slice(0, 12)}…, and the network's plan names ${safe.address.slice(0, 12)}…. Missing: one plan both agree on. To fix: reload the page, so it reads the plan again.`);
  }
  return { kind: rule ? ruledSafeKind(rule) : vesting ? KIND_VESTED_SAFE_CREATE : KIND_SAFE_CREATE, config, vesting, rule };
}

/** The bytes the council approves to create `built` (from `safeOf`). */
export function createCovered(built, foundingCid) {
  const { config, vesting, rule } = built;
  if (rule) return ruledSafeCreateCovered(config, foundingCid, vesting, rule);
  return vesting ? vestedSafeCreateCovered(config, foundingCid, vesting) : safeCreateCovered(config, foundingCid);
}

/** The create record's payload for `built`, carrying `approvals`. */
export function createPayload(built, foundingCid, approvals) {
  const { config, vesting, rule } = built;
  if (rule) return ruledSafeCreatePayload({ foundingCid, config, vesting, rule, approvals });
  return vesting ? vestedSafeCreatePayload({ foundingCid, config, vesting, approvals }) : safeCreatePayload({ foundingCid, config, approvals });
}
