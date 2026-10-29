/* =====================================================================
   DENSE-WIRE WALLET (defxn.com/account, Wallet tab)
   ---------------------------------------------------------------------
   Rebuilt 2026-10-16: the mechanism this used to call -- a real
   balance read (FXN_BALANCE) and a real five-leg transfer (VALUE_SUBMIT,
   the Intent/Offer/Agreement/Successor/Fulfillment custody chain) -- no
   longer exists on the server. Both were deleted during dense-wire's own
   "replace store.rs" migration (2026-10-15); this module was never
   updated to match, so the whole Wallet tab silently broke (confirmed
   live: "Unexpected balance reply: ERR grammar unknown payload tag").

   "Treat FXN like any other chain's native token" (the real replacement,
   same migration): FXN is now a sovereign chain's own `Payload::
   NativeMint`/`NativeTransfer` balance, exactly like every other
   launchpad token's native supply. The balance read is `NATIVE_BALANCE`;
   a send is ONE sender-signed `Payload::NativeTransfer` record
   (`NATIVE_SEND`), never six records split across two holders.

   THE OLD TWO-PARTY PROBLEM IS GONE
   ----------------------------------
   The previous version of this file spent ~250 lines on a "transfer
   slip" protocol (SLIP_HEADER/SLIP_LABELS/parseSlip/renderSlip/
   inspectSlip/advance/LEGS) because the old grammar needed two
   different holders to each sign two different legs, passed back and
   forth out of band. `NativeTransfer` needs none of that: the sender's
   own signature is the whole authorization (`G` is the account debited
   -- see `chain_server.rs`'s own doc comment on `NATIVE_SEND`), and the
   recipient does nothing at all. There is no slip to pass, so there is
   no slip code here anymore.

   Nothing here re-implements dense-wire. Records are built by the
   vendored builders in js/dense-wire/ (verbatim copies of
   defxn-defi-rs/dense-wire/web/ -- re-copy from there, never edit them
   here), sent by its WireClient, and signed by the v9 Auth Kit identity
   through flx-identity-bridge.mjs's authKitSigner(who). This file only
   sequences them, plus the full-review-before-signing wrapper every
   signing surface on this site uses. */
import { WireClient } from "../dense-wire/flx-wire.mjs";
import { authKitSigner, base64ToHex } from "../dense-wire/flx-identity-bridge.mjs";
import { BASE_CHAIN_ID } from "../dense-wire/flx-dao-builders.mjs";
import { nativeBalance, nativeHistory, buildNativeTransfer, parseNativeSendReply } from "../dense-wire/flx-native-transfer.mjs";
import { sha256Hex } from "../dense-wire/flx-crypto.mjs";
import { parseDecimalsReply, pow10 } from "../dense-wire/flx-amount.mjs";

const WIRE_TIMEOUT_MS = 15000;

/* ---- endpoint, and the networks a holder can point this wallet at ---
   Directed 2026-10-16 ("make sure the ability to change the networks").
   The FXN devnet is the default; anything else is an explicit, visible
   choice (a real UI control in account.js), never silently assumed --
   and still bounded by index.html's own CSP connect-src, so no choice
   here can reach a host that CSP does not already allow. */
export const KNOWN_NETWORKS = [
  /* The default (first entry): the fxn devnet on bk2 and mk2 (devnet-deploy-2026-10-23/DEPLOY.md), the chain that holds
     genesis, PVAs and skins. Owner, 2026-10-25: the defxn site names this one network as its devnet. */
  { id: "fxn-devnet", label: "FXN devnet", url: "wss://devnet.defxn.com/ws" },
  { id: "local-devnet", label: "Local devnet", url: "ws://127.0.0.1:19501/ws" },
  /* The older chain the other nodes still run (no network id, no genesis key, no mint). It moves to the fxn devnet when
     every node runs it (DEVNET-MAINNET-PLAN.md). The id stays "production": browsers saved it as their choice. */
  { id: "production", label: "Old public chain", url: "wss://nodes.defxn.com/ws" },
];
const NETWORK_STORAGE_KEY = "defxn.dense-wire.network.v1";

/** Resolution order: `?ws=` override, then a page global, then whatever
 *  network this browser last chose (persisted locally, convenience
 *  only -- never trusted for anything security-relevant), then
 *  the FXN devnet. */
export function resolveWireUrl() {
  try {
    const explicit = new URLSearchParams(location.search).get("ws");
    if (explicit) return explicit;
  } catch (_error) { /* no location: fall through */ }
  if (typeof window !== "undefined" && window.DEFXN_WIRE_URL) return window.DEFXN_WIRE_URL;
  try {
    const saved = window.localStorage.getItem(NETWORK_STORAGE_KEY);
    if (saved) return saved;
  } catch (_error) { /* storage blocked: fall through */ }
  return KNOWN_NETWORKS[0].url;
}

/** Remember the holder's chosen network for next time -- this browser
 *  only, convenience only. Does not itself reconnect anything; the
 *  caller still needs a fresh `WalletWire`. */
export function rememberWireUrl(url) {
  try { window.localStorage.setItem(NETWORK_STORAGE_KEY, url); } catch (_error) { /* convenience only */ }
}

const NETWORK_CHANGE_EVENT = "defxn-network-changed";

/** Populates `listEl` (a plain container -- `<div>`/`<ul>`, caller's
 *  choice) with a real, themed listbox -- never a native `<select>`:
 *  the OPEN state of a native select is unstyleable OS chrome (confirmed
 *  live, 2026-10-16 -- it renders as a plain system popup even inside a
 *  custom glass-panel popover, nothing this site's CSS can reach). A
 *  short, fixed list of 1-3 networks doesn't need a combobox/dropdown
 *  pattern at all; this renders every option as its own real button,
 *  always visible, matching every other control on this site.
 *  Pre-selects whichever option matches `resolveWireUrl()` right now --
 *  a `?ws=` override is shown as its own "Current (...)" option rather
 *  than silently dropped (the value can come from an attacker-
 *  controlled query string, so it's set via `textContent`, never HTML).
 *  Wired two ways: choosing a network here remembers it and calls
 *  `onSwitch(url)`; another mounted listbox elsewhere on the SAME page
 *  (the account page's Wallet tab, the site-wide nav) choosing a
 *  different network updates this one to match and calls `onSwitch`
 *  too, so every network control a holder has open on one page stays
 *  showing the same, real, current choice -- never silently stale.
 *  Centralized here (not hand-copied per surface) so there is exactly
 *  one real implementation of this control, not a patched-up native
 *  select behind each surface's own styling. */
export function mountNetworkSelect(listEl, onSwitch) {
  if (!listEl || listEl.dataset.networkSelectMounted) return;
  listEl.dataset.networkSelectMounted = "1";
  listEl.setAttribute("role", "listbox");
  let currentUrl = null;
  function choose(url) {
    currentUrl = url;
    rememberWireUrl(url);
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(NETWORK_CHANGE_EVENT, { detail: { url } }));
    if (onSwitch) onSwitch(url);
  }
  function paint(current) {
    currentUrl = current;
    const known = KNOWN_NETWORKS.slice();
    if (!known.some((n) => n.url === current)) known.push({ id: "custom", label: `Current (${current})`, url: current });
    listEl.innerHTML = "";
    for (const n of known) {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "network-option";
      option.setAttribute("role", "option");
      const selected = n.url === current;
      option.setAttribute("aria-selected", String(selected));
      if (selected) option.classList.add("is-selected");
      option.textContent = n.label;
      option.addEventListener("click", () => {
        if (n.url === currentUrl) return;
        paint(n.url);
        choose(n.url);
      });
      listEl.appendChild(option);
    }
  }
  paint(resolveWireUrl());
  if (typeof window !== "undefined") {
    window.addEventListener(NETWORK_CHANGE_EVENT, (event) => {
      const url = event.detail && event.detail.url;
      if (!url || currentUrl === url) return;
      paint(url);
      if (onSwitch) onSwitch(url);
    });
  }
}

/* ---- wire ----------------------------------------------------------- */

/** WireClient hands replies out FIFO and never reconnects. A reply that
 *  never comes would leave every later call waiting behind it, and a late
 *  one would answer the wrong question -- so a call that times out or
 *  fails drops its client, and the next call opens a fresh one. */
export class WalletWire {
  constructor(url) { this.url = url; this.client = null; }
  _client() {
    if (!this.client || (this.client.ws && this.client.ws.readyState > 1)) {
      this.client = new WireClient(this.url);
      this.client.ready.catch(() => {});
    }
    return this.client;
  }
  async _call(fn) {
    const client = this._client();
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`No reply from ${this.url} within ${WIRE_TIMEOUT_MS / 1000} s.`)), WIRE_TIMEOUT_MS);
    });
    try {
      return await Promise.race([fn(client), timeout]);
    } catch (error) {
      if (this.client === client) { client.close(); this.client = null; }
      if (error instanceof Error) throw error;
      // WireClient.ready rejects with the raw WebSocket error Event, which
      // carries no reason a page is allowed to read.
      throw new Error(`Cannot reach the chain-server at ${this.url}: the WebSocket was refused or closed. ` +
        "If this persists, that server may not admit connections from this site's origin.");
    } finally {
      clearTimeout(timer);
    }
  }
  /** -> BigInt | null (null = this chain-server has no FXN ledger to
   *  answer from, told apart from a real, held zero). */
  balance(pubHex) { return this._call((c) => nativeBalance(c, BASE_CHAIN_ID, pubHex)); }
  /** -> `[{at, kind, counterparty, amount, reference}]` oldest first, or
   *  `null` when unknown. */
  history(pubHex, limit) { return this._call((c) => nativeHistory(c, BASE_CHAIN_ID, pubHex, limit)); }
  /** -> `HEAD<TAB>...` parsed by WireClient.chainHead. */
  chainHead(pubHex) { return this._call((c) => c.chainHead(pubHex)); }
  /** -> `{kind:'confirmed'|'waiting'|'error', ...}`: has K of the chain's lead nodes confirmed the record at
   *  `position` of `pubHex`'s list (`CONFIRMED`)? A payment is final only then. */
  confirmed(pubHex, position, cid) { return this._call((c) => c.confirmed(pubHex, null, position, cid)); }
  /** -> the raw `NATIVE_SEND_OK`/`NATIVE_SEND_ERR` reply line, parsed by
   *  the caller via `parseNativeSendReply`. */
  sendLine(line) { return this._call((c) => c.send(line)); }
  /** -> the parsed reply to `<tag> TAB <text>` (`{kind:'ok', cid}` or the node's refusal). With `chainHead`, this makes
   *  a WalletWire the `wire` flx-signing-guard.mjs's chainPosition / submitAtPosition take (the safe spend on /account). */
  submit(tag, text) { return this._call((c) => c.submit(tag, text)); }
  /** -> `{kind:'found', text} | {kind:'miss'} | {kind:'error', raw}` --
   *  read a content-addressed blob (e.g. a published FXN metadata
   *  document) by CID. Passthrough so `flx-token-meta.mjs::loadTokenMeta`
   *  can take a `WalletWire` directly, the same connection-management
   *  every other balance/send call here already gets. */
  blobGet(cid) { return this._call((c) => c.blobGet(cid)); }
  close() { if (this.client) this.client.close(); this.client = null; }
}

/* ---- the FXN price -------------------------------------------------- */

/** FXN's sale price in one currency, as the chain gives it (`FXN_SALE <currency>`, dense-wire
 *  docs/design/fxn-public-sale.md): its own currency (EUR) from the genesis table, any other through the
 *  DAO's price signers. -> `{currency, minor, fxn, basis}` (`minor` minor units buy `fxn` whole FXN) or
 *  `{absent}` naming why. A price the chain does not give is never worked out here. The node prices base units
 *  (90 cents buy 10^9 base units at 9 decimals), so the line is scaled by the decimals the node gives (`DECIMALS`). */
export async function fxnSalePrice(wire, currency) {
  const reply = String(await wire.sendLine(`FXN_SALE ${currency}`));
  const line = reply.split("\n").find((l) => l.startsWith("SALE_PRICE"));
  if (!line) return { absent: `the node gave no sale price: ${reply.split("\n")[0].slice(0, 80)}` };
  const f = line.split("\t");
  if (f[0] === "SALE_PRICE_NONE") return { absent: f.slice(2).join(" ") || `no ${currency} price` };
  if (!/^[1-9][0-9]*$/.test(f[2] || "") || !/^[1-9][0-9]*$/.test(f[3] || "")) return { absent: "the price line did not parse" };
  let decimals;
  try {
    const got = parseDecimalsReply(await wire.sendLine(`DECIMALS\t${BASE_CHAIN_ID}`));
    if (got.refused) return { absent: `the node gave no FXN decimals: ${got.refused.failure}` };
    decimals = got.decimals;
  } catch (error) {
    return { absent: `the node gave no FXN decimals (${error && error.message ? error.message : "no answer"})` };
  }
  // minor units per whole FXN = minor x 10^decimals / fxn base units, kept as the pair so nothing is rounded here
  return { currency: f[1], minor: Number(BigInt(f[2]) * pow10(decimals)), fxn: Number(f[3]), basis: f[4] };
}

/* ---- keys ----------------------------------------------------------- */

export function signerFor(who) { return authKitSigner(who); }

/** Accepts a 64-char hex key, or the base64 root key defxn.com shows as
 *  "Root key" (same 32 raw bytes, see flx-identity-bridge.mjs). */
export function normalizeKey(value) {
  const text = String(value || "").trim();
  if (/^[0-9a-fA-F]{64}$/.test(text)) return text.toLowerCase();
  if (/^[A-Za-z0-9+/]{43}=$/.test(text)) {
    try { const hex = base64ToHex(text); if (hex.length === 64) return hex; } catch (_error) { /* fall through */ }
  }
  throw new Error("That is not a public key. Paste the recipient's 64-character hex key, or their base64 root key from their own account page.");
}

function short(hex) { return String(hex || "").slice(0, 12) + "…"; }

/* ---- review, then sign ----------------------------------------------
   The same full-scoped-authorization modal every signing surface on
   this site uses (js/ark/authorization-dialog.js), kept verbatim from
   the old version of this file -- only the ONE thing it reviews
   changed (a NativeTransfer, not one of six possible legs). */

/** The exact bytes a builder will sign, obtained by running THE REAL
 *  BUILDER with a probe signer that records what it is asked to sign --
 *  so the review shows the builder's own bytes, never a hand-kept copy
 *  of its field list that could drift from what actually gets signed. */
async function bytesToSign(pubHex, run) {
  let seen = null;
  const probe = {
    pubHex,
    signText: async (text) => { if (seen === null) seen = text; return "0".repeat(128); },
    signBytes: async () => "0".repeat(128),
  };
  await run(probe);
  if (seen === null) throw new Error("Internal: the builder signed nothing.");
  return seen;
}

/** Wraps the real signer so the first signature it produces must cover
 *  exactly the bytes the holder approved. Cannot differ today (same
 *  builder, same inputs); this makes that a checked fact, not a hope. */
function approvedOnly(signer, approved) {
  let first = true;
  return {
    pubHex: signer.pubHex,
    signBytes: signer.signBytes,
    signText: async (text) => {
      if (first) {
        first = false;
        if (text !== approved) throw new Error("Refused: the bytes to sign differ from the bytes you approved. Nothing was signed.");
      }
      return signer.signText(text);
    },
  };
}

/** The full scoped-authorization review of `unsigned` (the exact text, or the hex of the exact bytes, about to be
 *  signed), then `run()` once the holder approves. Every signing surface on this site goes through it: an FXN send
 *  here, a skin mint in js/ark/chain-cards.mjs, a safe approval and a safe spend in js/ark/fxn-holdings.mjs.
 *  `action`, `scope`, `authority`, `configuration` and `denies` name what this one signature authorizes. Refuses
 *  outright if that modal is not loaded: per the workspace law, every signing surface shows the full modal, so a
 *  missing modal means no signature, never a silent fallback. */
export async function reviewThen({ who, pubHex, wireUrl, title, description, claims, manifest, facts, unsigned, run,
  action = "native.transfer", scope = "fxn.transfer", authority = "(none: a holder-signed FXN transfer, not a DAO action)",
  configuration = "dense-wire native-token grammar · KNXFER1", denies = "scope does not authorize any other amount, recipient or chain" }) {
  const dialog = window.ArkUI && window.ArkUI.authorizationDialog;
  if (!dialog || !window.ArkAuthorizationView) {
    throw new Error("The signing review did not load (js/ark/authorization-dialog.js). Nothing was signed. Reload the page and try again.");
  }
  const digest = await sha256Hex(unsigned);
  const view = window.ArkAuthorizationView.scopedAuthorizationView({
    title,
    description: description + " Review exactly what this signs before approving. Nothing is signed or sent until you approve.",
    requester: (who.displayName ? who.displayName + " · " : "") + pubHex,
    network: "dense-wire · " + wireUrl,
    authority,
    configuration,
    scope,
    action,
    manifestDigest: digest,
    claimStack: ["primary authorize " + action + " for exact manifest " + digest].concat(claims, [
      denies,
      "trust zero",
    ]).join("\n"),
    manifest,
    authorizationBytes: unsigned,
    actionPayloadBytes: unsigned,
    facts,
  });
  const approved = await dialog.confirm(view, { action, capability: scope });
  if (!approved) throw new Error("Signing cancelled. Nothing was signed or sent.");
  return run();
}

/** `reviewThen` for a builder that signs text itself: the bytes shown are the builder's own (`bytesToSign`), and the
 *  signature after approval must cover exactly them (`approvedOnly`). */
export async function reviewAndSign({ signer, run, ...review }) {
  const unsigned = await bytesToSign(signer.pubHex, run);
  return reviewThen({ ...review, pubHex: signer.pubHex, unsigned, run: () => run(approvedOnly(signer, unsigned)) });
}

/* ---- send ------------------------------------------------------------- */

/** Every NATIVE_SEND failure the server can send (native_ledger.rs's own
 *  `NativeLedgerError`, via `chain_server.rs`'s refusal naming), each
 *  with what it means for THIS flow. Shown by name, never folded into
 *  "something went wrong". */
const SEND_FAILURE_MEANING = {
  NotLaunched: "this chain-server has no FXN ledger to send from yet.",
  InsufficientBalance: "you do not hold enough FXN for this send, at this point in your own transfer order.",
  SelfTransfer: "the recipient is the same key you're signed in as -- nothing would move.",
  AmountTooLarge: "that amount is too large for a signed balance on this ledger.",
};

/** `show` prints base units with their unit (js/ark/fxn-holdings.mjs `fxnText`); without it, base units are named as such. */
export function describeSendReply(reply, show = (n) => `${n} base units`) {
  if (reply.kind === "ok") return `Sent. Waiting for the chain's lead nodes to confirm it. Your balance is now ${show(reply.senderBalance)}.`;
  if (reply.kind === "refused") {
    return `${reply.failure}: ${SEND_FAILURE_MEANING[reply.failure] || "a reason this page does not recognise."} (${reply.remedy})`;
  }
  return `Unexpected reply from the chain-server: ${reply.raw}`;
}

/** Send `amount` base units (a BigInt: the page reads the typed FXN with js/ark/fxn-holdings.mjs `parseFxn`, at the
 *  node's decimals) to `recipientKey`, shown in the review by `show` (`fxnText`), reviewed and signed by `who`,
 *  submitted over `wire`. Resolves to the parsed NATIVE_SEND reply
 *  (`{kind:'ok', cid, senderBalance}` on success) -- never throws for an
 *  ordinary refusal, only for a real failure to even ask (bad key, no
 *  chain head, cancelled review, network error). */
export async function sendFxn({ who, wire, amount, recipient, signer = signerFor(who), show = (n) => `${n} base units` }) {
  const toKeyHex = normalizeKey(recipient);
  if (toKeyHex === signer.pubHex) throw new Error("The recipient is the key you send from. Nothing would move. Pick another recipient, or send from another of your keys.");
  if (typeof amount !== "bigint") throw new Error("The amount was not read as base units. Missing: the typed amount at FXN's decimals. To fix: reload the page and enter the amount again.");
  const units = amount;
  if (!(units > 0n)) throw new Error("The amount is 0. Missing: an amount of FXN above 0. To fix: enter the amount again.");
  // Owner, 2026-10-25: a send between two of your own public ids (or one and your root) is public forever, and it
  // shows anyone that both are you. The review says so first. `linkRisk` reads the opened file only; it sends nothing.
  const risk = who.linkRisk ? await who.linkRisk(signer.pubHex, toKeyHex) : null;
  const warning = risk ? `This send links ${risk.from} and ${risk.to} in public. Anyone who reads the chain can tell both are you. It cannot be undone.` : "";
  const head = await wire.chainHead(signer.pubHex);
  const pos = head.kind === "head" ? head.length : 0;
  const prev = head.kind === "head" ? head.headCid : "0".repeat(64);
  // Captured ONCE, before `run` is built: `run` is called TWICE by
  // `reviewAndSign` (a probe pass to show the bytes, then the real
  // signing pass after approval) -- `Date.now()` inside the closure
  // itself would give each pass a different `M`, so the second pass's
  // real bytes would never match what was shown and approved, and
  // `approvedOnly`'s own "bytes differ" guard would refuse every send.
  // Found before this ever shipped, not live.
  const now = Date.now();
  const signed = await reviewAndSign({
    who, signer, wireUrl: wire.url,
    title: risk ? `Warning: send ${show(units)} to your own ${risk.to}` : `Send ${show(units)} to ${short(toKeyHex)}`,
    description: (warning ? warning + " " : "") + "This is the whole action: your signature alone moves the value, the recipient does nothing.",
    claims: [`evidence recipient ${toKeyHex}`, `evidence amount ${units} base units`, `evidence chain ${BASE_CHAIN_ID}`],
    manifest: { schema: "dense-wire.native-transfer/1", sender: signer.pubHex, recipient: toKeyHex, amount: units.toString(), unit: "base units", chainId: BASE_CHAIN_ID, at: now },
    facts: (warning ? [{ label: "Links your ids", value: warning }] : []).concat([{ label: "Amount", value: `${show(units)} (${units} base units)` }, { label: "Recipient", value: toKeyHex }]),
    run: (s) => buildNativeTransfer(s, { pos, prev, toKeyHex, chainId: BASE_CHAIN_ID, amount: units, now }).then((r) => r.text),
  });
  const reply = parseNativeSendReply(await wire.sendLine(`NATIVE_SEND\t${signed}`));
  // The record's place on the sender's list, so the page can ask when the payment is final (`watchSendConfirmed`).
  return reply.kind === "ok" ? { ...reply, holder: signer.pubHex, position: pos } : reply;
}

/** Ask every `everyMs` until the chain's lead nodes confirm a sent payment (dense-wire, owner rule 2026-10-27: a
 *  payment is final only when they confirm it). Asked for this exact record (`reply.cid`). Resolves "confirmed",
 *  "conflict" (they confirmed a different record in its place: it will never be final) or "waiting" when `timeoutMs`
 *  passes first (it may still confirm later). A failed ask is retried; it never throws. */
export async function watchSendConfirmed(wire, reply, { everyMs = 3000, timeoutMs = 5 * 60 * 1000 } = {}) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const status = await wire.confirmed(reply.holder, reply.position, reply.cid).catch(() => null);
    if (status && (status.kind === "confirmed" || status.kind === "conflict")) return status.kind;
    await new Promise((resolve) => setTimeout(resolve, everyMs));
  }
  return "waiting";
}
