/* =====================================================================
   DENSE-WIRE WALLET (defxn.com/account, Wallet tab)
   ---------------------------------------------------------------------
   The Wallet tab's whole FXN surface: a real balance read (FXN_BALANCE)
   and the real five-leg transfer (VALUE_SUBMIT), over dense-wire's own
   line protocol. Replaces the GUN-backed js/ark/value-registries-client.js
   + js/ark/fabric-transfer-browser.js pair on this tab (those files stay
   in the repo; this tab no longer loads them).

   Nothing here re-implements dense-wire. Records are built by the
   vendored builders in js/dense-wire/ (verbatim copies of
   defxn-defi-rs/dense-wire/web/ -- re-copy from there, never edit them
   here), parsed by its Dumb Parser, sent by its WireClient, and signed by
   the v9 Auth Kit identity through flx-identity-bridge.mjs's
   authKitSigner(who). This file only sequences them.

   THE TWO-PARTY PROBLEM, AND THE CHOICE MADE HERE
   ------------------------------------------------
   A transfer between two holders is five records, and two of them can
   only be signed by the RECIPIENT's key (ground truth:
   defxn-defi-rs/dense-wire/src/chain_server.rs,
   value_submit_mints_and_transfers_real_fxn_over_the_wire, and
   src/lib.rs::handle):

     1. intent       sender     submitted         (needs: input it holds)
     2. offer        recipient  submitted         (needs: intent)
     3. agreement    sender signs a PROPOSAL      (needs: offer; NOT
                     submittable alone -- the server requires both
                     signatures, sender first, recipient over that)
        cosign       recipient  submitted         (needs: proposal)
     4. successor    recipient  submitted         (needs: agreement)
     5. fulfillment  sender     submitted         (needs: successor --
                     THIS is the leg that moves the value)

   This page holds exactly one key: whoever is signed in. No record in
   this grammar can be signed by one key on behalf of another, so the page
   never pretends to. The server also has no read-by-CID for these
   records (BLOB_GET reads a separate blob store), so a counterparty
   cannot fetch "the intent for this transfer" from the wire either.

   So v1 carries the records between the two holders out of band, as a
   TRANSFER SLIP: plain text, one labelled signed record per line,
   accumulated leg by leg. Each holder opens the Wallet tab in their own
   session, pastes the latest slip, and the page (a) re-derives every CID
   and checks every cross-reference itself -- who signed what, which
   record each one points at, what the agreement promised -- before
   offering anything to sign, then (b) offers only the step that is the
   SIGNED-IN key's turn, behind the full review modal, and (c) hands back
   the longer slip to send to the other holder. Four hand-offs, which is
   the minimum this grammar allows (each leg names the CID of the one
   before it). Sending to your own key is allowed by the grammar; then
   every turn is yours and the slip never leaves this tab.

   Deliberately not done: no inbox, no polling, no relay. A shared mailbox
   for slips would need a server-side store nobody has built for this;
   faking one in localStorage would only "work" inside one browser.

   Whole records only: a successor must carry exactly its predecessor's
   amount (lib.rs, ERR_AMOUNT "conservation or sequence"), so there is no
   partial send and no change output in this grammar today. The form says
   so rather than offering an amount field that could only fail.
   ===================================================================== */
import { admit, KIND_INTENT, KIND_OFFER, KIND_AGREEMENT, KIND_FULFILLMENT, KIND_VALUEOBJECT } from "../dense-wire/flx-dumb-parser.mjs";
import { sha256Hex, hexToBytes } from "../dense-wire/flx-crypto.mjs";
import { WireClient } from "../dense-wire/flx-wire.mjs";
import { authKitSigner, base64ToHex } from "../dense-wire/flx-identity-bridge.mjs";
import {
  DOCS, intent, offer, agreementProposal, agreementCosign, successor, fulfillment, planCid, outputDocCid,
} from "../dense-wire/flx-transfer-builders.mjs";

const WIRE_TIMEOUT_MS = 15000;
const SLIP_HEADER = "FXN-SLIP 1";
/* Slip line order is also the leg order. `proposal` is the sender-signed
   half of `agreement`; once `agreement` exists the proposal is implied by
   it (its signature prefix) and is not repeated. */
const SLIP_LABELS = ["to", "input", "intent", "offer", "proposal", "agreement", "successor", "fulfillment"];

/* ---- endpoint ------------------------------------------------------- */

/** Same resolution order as genesis/js/genesis-app.js: `?ws=` override,
 *  then a page global, then production. Any override is still bounded by
 *  index.html's CSP connect-src, so a crafted link cannot point the page
 *  at an arbitrary host. */
export function resolveWireUrl() {
  try {
    const explicit = new URLSearchParams(location.search).get("ws");
    if (explicit) return explicit;
  } catch (_error) { /* no location: fall through */ }
  if (typeof window !== "undefined" && window.DEFXN_WIRE_URL) return window.DEFXN_WIRE_URL;
  return "wss://nodes.defxn.com/ws";
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
  /** -> { kind: "balance", amount } | { kind: "unknown" } | { kind: "error", raw } */
  balance(pubHex) { return this._call((c) => c.fxnBalance(pubHex)); }
  /** -> { kind: "ok", cid } | { kind: "error", reason } | { kind: "error", raw } */
  submit(text) { return this._call((c) => c.valueSubmit(text)); }
  close() { if (this.client) this.client.close(); this.client = null; }
}

/** Every VALUE_ERR reason the server can send (chain_server.rs
 *  `value_err_name`), each with what it means for THIS flow. Shown by
 *  name, never folded into "something went wrong". */
const VALUE_ERR_MEANING = {
  grammar: "the record did not parse as dense-wire grammar.",
  type: "the record's kind (Y) is not one this command accepts.",
  signature: "a signature does not verify, or the agreement is not signed by the intent's sender and then the offer's recipient.",
  reference: "a record this one points at is not on that server yet. Ask the other holder to submit their step, then try again.",
  policy: "a field does not match what the grammar requires (wrong holder, wrong fixed document, or the agreement promised a different output).",
  not_live: "the record being spent is not a live holding on that server.",
  spent: "the record being spent already has a fulfillment. It has moved.",
  expired: "the intent or offer deadline passed (one hour after it was signed). Start a new transfer.",
  store: "that server could not write the record. Nothing was admitted. Try again.",
  issuer: "only the configured genesis authority may issue new FXN.",
  amount: "the successor's amount or sequence does not continue the record it replaces.",
  staked: "the record being spent is locked under a live stake.",
};

export function describeReply(reply) {
  if (reply && reply.kind === "ok") return `VALUE_OK ${reply.cid}`;
  if (reply && reply.reason) return `VALUE_ERR ${reply.reason}: ${VALUE_ERR_MEANING[reply.reason] || "a reason this page does not recognise."}`;
  return `Unexpected reply from the chain-server: ${reply && reply.raw != null ? reply.raw : String(reply)}`;
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

function utf8OfHex(hex) {
  try { return new TextDecoder().decode(hexToBytes(hex)); } catch (_error) { return ""; }
}

function short(hex) { return String(hex || "").slice(0, 12) + "…"; }

/* ---- slips ---------------------------------------------------------- */

/** Parse pasted slip text into `{ to, input, intent, ... }` (raw strings).
 *  Tolerant of what copy/paste does to text (CRLF, blank lines, indents);
 *  strict about everything else. A record line may also be pasted on its
 *  own with no header: a bare VALUEOBJECT is taken as the input. */
export function parseSlip(text) {
  const slip = {};
  const lines = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) throw new Error("The slip is empty. Paste the whole slip the other holder sent you.");
  if (lines[0] !== SLIP_HEADER) throw new Error(`That is not a transfer slip: its first line must be "${SLIP_HEADER}".`);
  for (const line of lines.slice(1)) {
    const space = line.search(/\s/);
    const label = space < 0 ? line : line.slice(0, space);
    const value = space < 0 ? "" : line.slice(space).trim();
    if (!SLIP_LABELS.includes(label)) throw new Error(`Unknown slip line "${label}". Expected one of: ${SLIP_LABELS.join(", ")}.`);
    if (!value) throw new Error(`Slip line "${label}" is empty.`);
    if (slip[label]) throw new Error(`Slip line "${label}" appears twice.`);
    slip[label] = value;
  }
  return slip;
}

export function renderSlip(slip) {
  const lines = [SLIP_HEADER];
  for (const label of SLIP_LABELS) {
    if (label === "proposal" && slip.agreement) continue;
    if (slip[label]) lines.push(`${label} ${slip[label]}`);
  }
  return lines.join("\n");
}

function admitAs(label, text, kind) {
  let raw;
  try { raw = admit(text); } catch (error) { throw new Error(`The slip's ${label} record does not parse: ${error.reason || error.message}.`); }
  if (raw.kind !== kind) throw new Error(`The slip's ${label} line holds a ${raw.kind} record, not ${kind}.`);
  return raw;
}

function expect(label, field, actual, wanted) {
  if (actual !== wanted) {
    throw new Error(`The slip's ${label} record does not match this transfer: its ${field} is ${short(actual)} where ${short(wanted)} was expected. ` +
      "Ask the other holder for their latest slip; do not sign over a mismatched one.");
  }
}

function signatureCount(raw) { return raw.blocks.filter((b) => b[0] === "S").length; }

const LEGS = [
  { id: "intent", label: "Intent", by: "sender", note: "Sender offers the record it holds" },
  { id: "offer", label: "Offer", by: "recipient", note: "Recipient answers that intent" },
  { id: "proposal", label: "Agreement · sender's half", by: "sender", note: "Sender signs what the recipient will receive" },
  { id: "agreement", label: "Agreement · recipient's cosign", by: "recipient", note: "Recipient countersigns; submitted" },
  { id: "successor", label: "Successor record", by: "recipient", note: "Recipient's new holding, pending" },
  { id: "fulfillment", label: "Fulfillment", by: "sender", note: "Sender completes it; the value moves" },
];

/** Re-derive everything a slip claims, from the records themselves.
 *  Throws (naming the failure and the remedy) on any inconsistency.
 *  Returns the transfer's facts, its legs, and whose turn it is. */
export async function inspectSlip(slip) {
  if (!slip.input) throw new Error("The slip has no input record: the signed value record being sent.");
  if (!slip.to || !/^[0-9a-f]{64}$/.test(slip.to)) throw new Error("The slip names no recipient key (its \"to\" line).");
  const input = admitAs("input", slip.input, KIND_VALUEOBJECT);
  const amountMatch = /^(\d+)FXN$/.exec(input.payload("T") || "");
  if (!amountMatch) throw new Error(`The input record is not an FXN amount (T is "${input.payload("T")}").`);
  if (!/^\d+$/.test(input.payload("I") || "")) throw new Error(`The input record's sequence (I) is not a number.`);
  const facts = {
    sender: utf8OfHex(input.payload("H")),
    recipient: slip.to,
    // The server parses T as a u64 and re-renders it when it recomputes the
    // promised-output CID (lib.rs output_doc_cid), so "01000FXN" must
    // promise "1000", not "01000".
    amount: BigInt(amountMatch[1]).toString(),
    seq: Number(input.payload("I")),
    inputCid: await sha256Hex(slip.input),
  };
  expect("input", "signer (G)", input.g(), facts.sender);
  facts.nextSeq = facts.seq + 1;
  facts.expectedOutputDoc = await outputDocCid(facts.recipient, facts.amount, "FXN", facts.nextSeq);
  facts.plan = await planCid(facts.inputCid);
  const cids = {};

  if (slip.intent) {
    const r = admitAs("intent", slip.intent, KIND_INTENT);
    expect("intent", "signer", r.g(), facts.sender);
    expect("intent", "constraints document", r.c(0), DOCS.constraints);
    expect("intent", "input", r.c(1), facts.inputCid);
    cids.intent = await sha256Hex(slip.intent);
    facts.deadline = Number(r.payload("D"));
  }
  if (slip.offer) {
    if (!cids.intent) throw new Error("The slip has an offer but no intent before it.");
    const r = admitAs("offer", slip.offer, KIND_OFFER);
    expect("offer", "signer", r.g(), facts.recipient);
    expect("offer", "intent", r.c(0), cids.intent);
    expect("offer", "offer contract", r.c(1), DOCS.offerContract);
    expect("offer", "input", r.c(2), facts.inputCid);
    cids.offer = await sha256Hex(slip.offer);
    facts.deadline = Math.min(facts.deadline, Number(r.payload("D")));
  }
  // An agreement carries its own proposal: everything before its last -S.
  const proposalText = slip.agreement ? slip.agreement.slice(0, slip.agreement.lastIndexOf("-S")) : slip.proposal;
  if (slip.agreement && slip.proposal && slip.proposal !== proposalText) {
    throw new Error("The slip's agreement is not a cosign of its proposal line. Ask for the other holder's latest slip.");
  }
  if (proposalText) {
    if (!cids.offer) throw new Error("The slip has an agreement but no offer before it.");
    const r = admitAs("agreement proposal", proposalText, KIND_AGREEMENT);
    if (signatureCount(r) !== 1) throw new Error("The agreement proposal must carry exactly the sender's one signature.");
    expect("agreement", "signer", r.g(), facts.sender);
    expect("agreement", "intent", r.c(0), cids.intent);
    expect("agreement", "offer", r.c(1), cids.offer);
    expect("agreement", "policy document", r.c(2), DOCS.policy);
    expect("agreement", "resolver document", r.c(3), DOCS.resolver);
    // The one check that protects the recipient: the agreement promises
    // exactly this amount, at the next sequence, to the recipient's key.
    expect("agreement", "promised output", r.c(4), facts.expectedOutputDoc);
    cids.proposal = await sha256Hex(proposalText);
  }
  if (slip.agreement) {
    const r = admitAs("agreement", slip.agreement, KIND_AGREEMENT);
    if (signatureCount(r) !== 2) throw new Error("The agreement must carry two signatures: the sender's, then the recipient's.");
    cids.agreement = await sha256Hex(slip.agreement);
  }
  if (slip.successor) {
    if (!cids.agreement) throw new Error("The slip has a successor record but no cosigned agreement before it.");
    const r = admitAs("successor", slip.successor, KIND_VALUEOBJECT);
    expect("successor", "signer", r.g(), facts.recipient);
    expect("successor", "holder", utf8OfHex(r.payload("H")), facts.recipient);
    expect("successor", "sequence", r.payload("I"), String(facts.nextSeq));
    expect("successor", "amount", r.payload("T"), `${facts.amount}FXN`);
    expect("successor", "asset document", r.c(0), DOCS.asset);
    expect("successor", "predecessor", r.c(1), facts.inputCid);
    expect("successor", "agreement", r.c(2), cids.agreement);
    expect("successor", "plan", r.c(3), facts.plan);
    cids.successor = await sha256Hex(slip.successor);
  }
  if (slip.fulfillment) {
    if (!cids.successor) throw new Error("The slip has a fulfillment but no successor record before it.");
    const r = admitAs("fulfillment", slip.fulfillment, KIND_FULFILLMENT);
    expect("fulfillment", "signer", r.g(), facts.sender);
    expect("fulfillment", "agreement", r.c(0), cids.agreement);
    expect("fulfillment", "plan", r.c(1), facts.plan);
    expect("fulfillment", "successor", r.c(2), cids.successor);
    cids.fulfillment = await sha256Hex(slip.fulfillment);
  }

  const legs = LEGS.map((leg) => Object.assign({}, leg, { cid: cids[leg.id] || null, done: !!cids[leg.id] }));
  const next = legs.find((leg) => !leg.done) || null;
  return { facts, cids, legs, next, slip };
}

/* ---- review, then sign ---------------------------------------------- */

/** The exact bytes a builder will sign, obtained by running THE REAL
 *  BUILDER with a probe signer that records what it is asked to sign --
 *  so the review shows the builder's own bytes, never a hand-kept copy of
 *  its field list that could drift from what actually gets signed. */
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

/** Full scoped-authorization review (defxn.com's own
 *  js/ark/authorization-dialog.js over js/admin/authorization-view.js --
 *  the same modal every signer on this site uses), then the real signature.
 *  Refuses outright if that modal is not loaded: per the workspace law,
 *  every signing surface shows the full modal, so a missing modal means
 *  no signature, never a silent fallback. */
async function reviewAndSign({ who, signer, wireUrl, leg, kindCode, title, description, claims, manifest, facts, run }) {
  const dialog = window.ArkUI && window.ArkUI.authorizationDialog;
  if (!dialog || !window.ArkAuthorizationView) {
    throw new Error("The signing review did not load (js/ark/authorization-dialog.js). Nothing was signed. Reload the page and try again.");
  }
  const unsigned = await bytesToSign(signer.pubHex, run);
  const digest = await sha256Hex(unsigned);
  const action = "value." + leg;
  const scope = "fxn.transfer." + leg;
  const view = window.ArkAuthorizationView.scopedAuthorizationView({
    title,
    description: description + " Review exactly what this signs before approving. Nothing is signed or sent until you approve.",
    requester: (who.displayName ? who.displayName + " · " : "") + signer.pubHex,
    network: "dense-wire · " + wireUrl,
    authority: "(none: a holder-signed FXN transfer, not a DAO action)",
    configuration: "dense-wire value grammar · Y" + kindCode,
    scope,
    action,
    manifestDigest: digest,
    claimStack: ["primary authorize " + action + " for exact manifest " + digest].concat(claims, [
      "scope does not authorize any other record, amount, holder or counterparty",
      "trust zero",
    ]).join("\n"),
    manifest,
    authorizationBytes: unsigned,
    actionPayloadBytes: unsigned,
    facts,
  });
  const approved = await dialog.confirm(view, { action, capability: scope });
  if (!approved) throw new Error("Signing cancelled. Nothing was signed or sent.");
  return run(approvedOnly(signer, unsigned));
}

function nowSecs() { return Math.floor(Date.now() / 1000); }

function randomRecordId() {
  // No '-': the grammar splits on it (flx-transfer-builders.mjs assertNoDash).
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function submitLeg(wire, label, text, report) {
  report(`Submitting ${label}…`);
  const reply = await wire.submit(text);
  if (reply.kind !== "ok") throw new Error(`${label} not admitted. ${describeReply(reply)}`);
  report(`${label} admitted: ${describeReply(reply)}`);
  return reply.cid;
}

/** Sender, step 1: name the record you hold and who receives it; sign and
 *  submit the intent. Returns the new slip text. */
export async function startTransfer({ who, wire, inputText, recipient, report }) {
  const signer = signerFor(who);
  const slip = { to: normalizeKey(recipient), input: String(inputText || "").trim() };
  const state = await inspectSlip(slip);
  if (state.facts.sender !== signer.pubHex) {
    throw new Error("That record is held by " + short(state.facts.sender) + ", not by the identity signed in here. You can only send a record you hold.");
  }
  return advance({ who, wire, slip, report });
}

/** Whatever the slip's next leg is, if it is the signed-in key's turn:
 *  review, sign, submit. Refuses -- naming whose turn it is -- otherwise.
 *  A leg joins the returned slip only once the server admitted it (the
 *  unsubmittable proposal excepted), so a slip never hands the other
 *  holder a record they would get VALUE_ERR reference for. If a later
 *  part fails (the recipient's cosign is admitted, then their successor
 *  review is cancelled), the error carries `.slip` with the progress
 *  that did land. */
export async function advance({ who, wire, slip, report }) {
  const next = Object.assign({}, slip);
  try {
    return await advanceInto(next, { who, wire, report });
  } catch (error) {
    if (renderSlip(next) !== renderSlip(slip)) error.slip = next;
    throw error;
  }
}

async function advanceInto(next, { who, wire, report }) {
  const signer = signerFor(who);
  const say = typeof report === "function" ? report : () => {};
  let state = await inspectSlip(next);
  if (!state.next) return { slip: next, state, done: true };
  const turnKey = state.next.by === "sender" ? state.facts.sender : state.facts.recipient;
  if (turnKey !== signer.pubHex) {
    throw new Error(`The next step (${state.next.label}) is the ${state.next.by}'s to sign, with key ${short(turnKey)}. ` +
      `This identity is ${short(signer.pubHex)}. Send them this slip.`);
  }
  const f = state.facts;
  const common = { who, signer, wireUrl: wire.url };
  const amountFact = { label: "Amount", value: f.amount + " FXN (the whole record)" };
  const deadlineFact = f.deadline ? [{ label: "Offer deadline", value: new Date(f.deadline * 1000).toLocaleString() }] : [];
  let signed;

  if (state.next.id === "intent") {
    const now = nowSecs();
    signed = await reviewAndSign(Object.assign({}, common, {
      leg: "intent", kindCode: "0G",
      title: "Offer " + f.amount + " FXN to " + short(f.recipient),
      description: "Step 1 of 5. Declares that you intend to spend the record you hold. This alone moves nothing; the recipient answers it next.",
      claims: ["evidence input " + f.inputCid, "evidence amount " + f.amount + "FXN", "evidence recipient " + f.recipient, "constraint deadline one hour from now"],
      manifest: { schema: "dense-wire.intent/1", sender: signer.pubHex, inputCid: f.inputCid, amount: f.amount + "FXN", recipient: f.recipient, signedAt: now, deadline: now + 3600 },
      facts: [amountFact, { label: "Recipient", value: f.recipient }, { label: "Record spent", value: f.inputCid }],
      run: (s) => intent(s, f.inputCid, now),
    }));
    await submitLeg(wire, "Intent", signed, say);
    next.intent = signed;
    say("Intent admitted. Send this slip to the recipient so they can answer it (within the hour).");
  } else if (state.next.id === "offer") {
    const now = nowSecs();
    signed = await reviewAndSign(Object.assign({}, common, {
      leg: "offer", kindCode: "0H",
      title: "Accept " + f.amount + " FXN from " + short(f.sender),
      description: "Step 2 of 5. Answers the sender's intent. You will countersign the agreement and record your new holding in step 4.",
      claims: ["evidence intent " + state.cids.intent, "evidence input " + f.inputCid, "evidence sender " + f.sender],
      manifest: { schema: "dense-wire.offer/1", recipient: signer.pubHex, intentCid: state.cids.intent, inputCid: f.inputCid, signedAt: now, deadline: now + 3600 },
      facts: [amountFact, { label: "From", value: f.sender }].concat(deadlineFact),
      run: (s) => offer(s, state.cids.intent, f.inputCid, now),
    }));
    await submitLeg(wire, "Offer", signed, say);
    next.offer = signed;
    say("Offer admitted. Send this slip back to the sender so they can sign the agreement.");
  } else if (state.next.id === "proposal") {
    const now = nowSecs();
    next.proposal = await reviewAndSign(Object.assign({}, common, {
      leg: "agreement", kindCode: "0I",
      title: "Agree to send " + f.amount + " FXN to " + short(f.recipient),
      description: "Step 3 of 5. Your half of the agreement. It is not submitted yet: the server only admits it once the recipient countersigns.",
      claims: ["evidence intent " + state.cids.intent, "evidence offer " + state.cids.offer, "evidence promised output " + f.expectedOutputDoc + " = " + f.amount + "FXN to " + f.recipient + " at sequence " + f.nextSeq],
      manifest: { schema: "dense-wire.agreement-proposal/1", sender: signer.pubHex, intentCid: state.cids.intent, offerCid: state.cids.offer, promisedOutput: { holder: f.recipient, amount: f.amount + "FXN", sequence: f.nextSeq, doc: f.expectedOutputDoc }, signedAt: now },
      facts: [amountFact, { label: "Recipient", value: f.recipient }].concat(deadlineFact),
      run: (s) => agreementProposal(s, state.cids.intent, state.cids.offer, f.expectedOutputDoc, now),
    }));
    say("Your half of the agreement is signed. Send this slip to the recipient to countersign.");
  } else if (state.next.id === "agreement" || state.next.id === "successor") {
    if (state.next.id === "agreement") {
      const proposalText = next.proposal;
      signed = await reviewAndSign(Object.assign({}, common, {
        leg: "agreement", kindCode: "0I",
        title: "Countersign: receive " + f.amount + " FXN",
        description: "Step 4 of 5, part 1. Countersigns the sender's agreement, which promises " + f.amount + " FXN to your key at sequence " + f.nextSeq + ". Checked against your key before this review opened.",
        claims: ["evidence proposal " + state.cids.proposal, "evidence promised output " + f.expectedOutputDoc + " = " + f.amount + "FXN to " + f.recipient, "constraint sender " + f.sender],
        manifest: { schema: "dense-wire.agreement-cosign/1", recipient: signer.pubHex, proposalCid: state.cids.proposal, sender: f.sender, promisedOutput: { holder: f.recipient, amount: f.amount + "FXN", sequence: f.nextSeq } },
        facts: [amountFact, { label: "From", value: f.sender }].concat(deadlineFact),
        run: (s) => agreementCosign(proposalText, s),
      }));
      await submitLeg(wire, "Agreement", signed, say);
      next.agreement = signed;
      delete next.proposal;
      state = await inspectSlip(next);
    }
    const now = nowSecs();
    const id = randomRecordId();
    signed = await reviewAndSign(Object.assign({}, common, {
      leg: "successor", kindCode: "0L",
      title: "Record your new " + f.amount + " FXN holding",
      description: "Step 4 of 5, part 2. Your new value record, replacing the sender's. It becomes yours when the sender submits the fulfillment (step 5).",
      claims: ["evidence predecessor " + f.inputCid, "evidence agreement " + state.cids.agreement, "evidence amount " + f.amount + "FXN", "evidence sequence " + f.nextSeq, "evidence id " + id],
      manifest: { schema: "dense-wire.value-object/1", holder: signer.pubHex, id, sequence: f.nextSeq, amount: f.amount + "FXN", predecessorCid: f.inputCid, agreementCid: state.cids.agreement, signedAt: now },
      facts: [amountFact, { label: "Sequence", value: String(f.nextSeq) }, { label: "Record id", value: id }],
      run: (s) => successor(s, id, f.nextSeq, f.amount, f.inputCid, state.cids.agreement, now),
    }));
    await submitLeg(wire, "Successor record", signed, say);
    next.successor = signed;
    rememberRecord(signer.pubHex, signed);
    say("Your side is done. Send this slip back to the sender to complete the transfer.");
  } else if (state.next.id === "fulfillment") {
    const now = nowSecs();
    signed = await reviewAndSign(Object.assign({}, common, {
      leg: "fulfillment", kindCode: "0J",
      title: "Complete: send " + f.amount + " FXN to " + short(f.recipient),
      description: "Step 5 of 5. This is the step that moves the value: your record is spent, and the recipient's successor record becomes their live holding.",
      claims: ["evidence agreement " + state.cids.agreement, "evidence spends " + f.inputCid, "evidence successor " + state.cids.successor + " held by " + f.recipient],
      manifest: { schema: "dense-wire.fulfillment/1", sender: signer.pubHex, agreementCid: state.cids.agreement, spends: f.inputCid, successorCid: state.cids.successor, signedAt: now },
      facts: [amountFact, { label: "Recipient", value: f.recipient }],
      run: (s) => fulfillment(s, state.cids.agreement, f.inputCid, state.cids.successor, now),
    }));
    await submitLeg(wire, "Fulfillment", signed, say);
    next.fulfillment = signed;
    forgetRecord(signer.pubHex, next.input);
    say("Transfer complete: " + f.amount + " FXN moved to " + short(f.recipient) + ".");
  }
  state = await inspectSlip(next);
  return { slip: next, state, done: !state.next };
}

/* ---- records this browser has seen you hold ------------------------- */

/* A per-viewer convenience only: the signed text of value records this
   browser built for you (successors), so "Send FXN" can offer them
   instead of asking you to paste one. Public data (signed records, no
   key material). The server stays the only truth: a record listed here
   that is no longer yours fails its intent with VALUE_ERR spent/not_live,
   by name. Every access is guarded; blocked storage just means no list. */
const HELD_PREFIX = "defxn.dense-wire.held.v1.";

export function savedRecords(pubHex) {
  try {
    const list = JSON.parse(window.localStorage.getItem(HELD_PREFIX + pubHex) || "[]");
    return Array.isArray(list) ? list.filter((t) => typeof t === "string") : [];
  } catch (_error) { return []; }
}

function writeSaved(pubHex, list) {
  try { window.localStorage.setItem(HELD_PREFIX + pubHex, JSON.stringify(list.slice(-20))); } catch (_error) { /* convenience only */ }
}

export function rememberRecord(pubHex, text) {
  const list = savedRecords(pubHex).filter((t) => t !== text);
  list.push(text);
  writeSaved(pubHex, list);
}

export function forgetRecord(pubHex, text) {
  writeSaved(pubHex, savedRecords(pubHex).filter((t) => t !== text));
}

/** `{ amount, seq, cid }` of a held record, for labelling the list. */
export async function describeRecord(text) {
  const raw = admit(text);
  return { amount: (/^(\d+)FXN$/.exec(raw.payload("T") || "") || [])[1] || "?", seq: raw.payload("I"), cid: await sha256Hex(text) };
}
