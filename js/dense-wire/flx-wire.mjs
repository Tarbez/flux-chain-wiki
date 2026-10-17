// WebSocket client for the dense-wire line protocol.
//
// LAW: no WASM. The chain server speaks plain line-framed text; a
// Caddy terminates TLS and proxies to chain-server's dedicated RFC 6455
// listener. Raw TCP is a separate endpoint. Each submitted command is one
// WS text message; each reply is one WS text message and may contain lines.

import { signHex } from "./flx-crypto.mjs";
import { utf8OfHex } from "./flx-dumb-parser.mjs";

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
      return {
        kind: "latest",
        root: parts[1],
        sequence: Number(parts[2]),
        linesCount: Number(parts[3]),
        votes: parseFraction(parts[4]),
      };
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
      return {
        kind: "snap",
        root: parts[1],
        sequence: Number(parts[2]),
        previousRoot: parts[3],
        linesCount: Number(parts[4]),
        votes: parseFraction(parts[5]),
      };
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
      return { kind: "accepted", votes: parseFraction(parts[1]), finalized: false };
    }
    if (parts[0] === "SEG_ACC_FIN") {
      return {
        kind: "accepted",
        finalized: true,
        root: parts[1],
        applied: Number(parts[2]),
        votes: parseFraction(parts[3]),
      };
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

  /** `DAO_PROPOSE<TAB><dao_id><TAB><signers csv><TAB><quorum_threshold><TAB><registered_at>`.
   *    -> DAO_OPEN<TAB><dao_id><TAB><signers_blob_cid><TAB><have>/<need>
   *    -> DAO_ERR<TAB><reason> */
  async daoPropose(daoId, signerHexes, quorumThreshold, registeredAt) {
    const reply = await this._send(
      `DAO_PROPOSE\t${daoId}\t${signerHexes.join(",")}\t${quorumThreshold}\t${registeredAt}`,
    );
    const parts = reply.split("\t");
    if (parts[0] === "DAO_OPEN") {
      return { kind: "open", daoId: parts[1], signersBlobCid: parts[2], votes: parseFraction(parts[3]) };
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
      return {
        kind: "accepted",
        finalized: true,
        votes: parseFraction(parts[1]),
        signersCid: parts[2],
        quorumCid: parts[3],
      };
    }
    if (parts[0] === "DAO_ACC") return { kind: "accepted", finalized: false, votes: parseFraction(parts[1]) };
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
      return {
        kind: "status",
        daoId: parts[1],
        signers: parts[2] ? parts[2].split(",") : [],
        quorumThreshold: Number(parts[3]),
        votes: parseFraction(parts[4]),
        finalized: parts[5] === "1",
      };
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
    if (parts[0] === "TI_OPEN") return { kind: "open", daoId: parts[1], votes: parseFraction(parts[2]) };
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
      return { kind: "accepted", finalized: true, votes: parseFraction(parts[1]), quorumCid: parts[2] };
    }
    if (parts[0] === "TI_ACC") return { kind: "accepted", finalized: false, votes: parseFraction(parts[1]) };
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
      return {
        kind: "status",
        daoId: parts[1],
        treasuryPubkey: parts[2],
        votes: parseFraction(parts[3]),
        finalized: parts[4] === "1",
      };
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
    if (parts[0] === "NS_OPEN") return { kind: "open", spendKey: parts[1], votes: parseFraction(parts[2]) };
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
      return { kind: "accepted", finalized: true, votes: parseFraction(parts[1]), quorumCid: parts[2] };
    }
    if (parts[0] === "NS_ACC") return { kind: "accepted", finalized: false, votes: parseFraction(parts[1]) };
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
      return {
        kind: "status",
        spendKey: parts[1],
        daoId: parts[2],
        chainId: parts[3],
        to: parts[4],
        amount: BigInt(parts[5]),
        spentAt: Number(parts[6]),
        votes: parseFraction(parts[7]),
        finalized: parts[8] === "1",
      };
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
      return { kind: "open", spendKey: parts[1], manifestCid: parts[2], votes: parseFraction(parts[3]) };
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
      return { kind: "accepted", finalized: true, votes: parseFraction(parts[1]), quorumCid: parts[2] };
    }
    if (parts[0] === "TS_ACC") return { kind: "accepted", finalized: false, votes: parseFraction(parts[1]) };
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
      return {
        kind: "status",
        spendKey: parts[1],
        daoId: parts[2],
        inputCid: parts[3],
        votes: parseFraction(parts[4]),
        finalized: parts[5] === "1",
      };
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
    const reply = await this._send(`BLOB_PUT\t${text}`);
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

  /** Submit a signed KDOMCLAIM1 (`buildDomainClaim`'s result). */
  domainClaim(body) {
    return this.submit("DOMAIN_CLAIM", body);
  }

  /** Submit a signed KDOMREC1 (`buildDomainRecordUpdate`'s result). */
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

  /** `DOM_WHO<TAB><fqdn>` — current owner of a claimed name.
   *    -> DOM_OWNER<TAB><fqdn><TAB><owner pubkey hex><TAB><head record cid><TAB><source>
   *    -> DOM_NONE<TAB><fqdn> */
  async domWho(fqdn) {
    const reply = await this._send(`DOM_WHO\t${fqdn}`);
    const parts = reply.split("\t");
    if (parts[0] === "DOM_OWNER") {
      return {
        kind: "owner",
        fqdn: parts[1],
        ownerPubHex: parts[2],
        recordCid: parts[3],
        source: parts[4],
      };
    }
    if (parts[0] === "DOM_NONE") return { kind: "none", fqdn: parts[1] };
    return { kind: "error", raw: reply };
  }

  /** `DOM_HIST<TAB><fqdn>` — full ownership history, oldest first.
   *    -> DOM_HIST_LINE<TAB><n><TAB><owner><TAB><cid><TAB><source> (per link)
   *    -> DOM_HIST_END<TAB><count> */
  async domHist(fqdn) {
    const reply = await this._send(`DOM_HIST\t${fqdn}`);
    const frames = reply.split("\n");
    const endIdx = frames.findIndex((f) => f.startsWith("DOM_HIST_END\t"));
    if (endIdx < 0) return { kind: "error", reason: "reply had no DOM_HIST_END sentinel" };
    const declared = Number(frames[endIdx].split("\t")[1]);
    const entries = frames.slice(0, endIdx).map((line) => {
      const p = line.split("\t");
      return { n: Number(p[1]), ownerPubHex: p[2], recordCid: p[3], source: p[4] };
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

  /** `DOM_RECORD<TAB><fqdn>` — current DNS/mesh record head for a name.
   *    -> DOM_RECORD_LINE<TAB><fqdn><TAB><record cid><TAB><hex-of-utf8 NameRecord JSON>
   *    -> DOM_NONE<TAB><fqdn> */
  async domRecord(fqdn) {
    const reply = await this._send(`DOM_RECORD\t${fqdn}`);
    const parts = reply.split("\t");
    if (parts[0] === "DOM_RECORD_LINE") {
      return {
        kind: "record",
        fqdn: parts[1],
        recordCid: parts[2],
        recordJson: utf8OfHex(parts[3]),
      };
    }
    if (parts[0] === "DOM_NONE") return { kind: "none", fqdn: parts[1] };
    return { kind: "error", raw: reply };
  }

  /** `DOM_RECORD_HIST<TAB><fqdn>` — full DNS/mesh record history, oldest first.
   *    -> DOM_RECORD_HIST_LINE<TAB><n><TAB><record cid><TAB><hex-of-utf8 NameRecord JSON>
   *    -> DOM_RECORD_HIST_END<TAB><count> */
  async domRecordHist(fqdn) {
    const reply = await this._send(`DOM_RECORD_HIST\t${fqdn}`);
    const frames = reply.split("\n");
    const endIdx = frames.findIndex((f) => f.startsWith("DOM_RECORD_HIST_END\t"));
    if (endIdx < 0) return { kind: "error", reason: "reply had no DOM_RECORD_HIST_END sentinel" };
    const declared = Number(frames[endIdx].split("\t")[1]);
    const entries = frames.slice(0, endIdx).map((line) => {
      const p = line.split("\t");
      return { n: Number(p[1]), recordCid: p[2], recordJson: utf8OfHex(p[3]) };
    });
    if (!Number.isInteger(declared) || entries.length !== declared) {
      return { kind: "error", reason: `declared ${frames[endIdx]} lines, received ${entries.length}` };
    }
    return { kind: "history", fqdn, entries };
  }

  close() {
    try { this.ws?.close(); } catch {}
  }
}

function parseFraction(s) {
  if (!s) return { have: 0, need: 0 };
  const [h, n] = s.split("/").map(Number);
  return { have: h || 0, need: n || 0 };
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
  return { kind: "raw", line };
}
