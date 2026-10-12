// WebSocket client for the dense-wire line protocol.
//
// LAW: no WASM. The chain server speaks plain line-framed text; a
// Caddy terminates TLS and proxies to chain-server's dedicated RFC 6455
// listener. Raw TCP is a separate endpoint. Each submitted command is one
// WS text message; each reply is one WS text message and may contain lines.

import { signHex } from "./flx-crypto.mjs";

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
    return new Promise((res, rej) => {
      const ws = new WebSocket(this.url);
      ws.onopen = () => { this.ws = ws; res(); };
      ws.onerror = (e) => rej(e);
      ws.onmessage = (ev) => {
        const line = String(ev.data).replace(/\r?\n$/, "");
        const waiter = this._pending.shift();
        if (waiter) waiter.res(line);
      };
      ws.onclose = () => {
        for (const w of this._pending) w.rej(new Error("ws closed"));
        this._pending = [];
      };
    });
  }

  async _send(frame) {
    await this.ready;
    const line = frame.endsWith("\n") ? frame : frame + "\n";
    return new Promise((res, rej) => {
      this._pending.push({ res, rej });
      this.ws.send(line);
    });
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

  /** `VALUE_SUBMIT<TAB><record text>` — one command for all five
   *  lifecycle kinds; chain_server.rs dispatches on the record's own `Y`.
   *    -> VALUE_OK<TAB><cid>
   *    -> VALUE_ERR<TAB><reason>  (reason is one of `value_err_name`'s
   *       fixed strings: grammar/type/signature/reference/policy/
   *       not_live/spent/expired/store/issuer/amount/staked) */
  async valueSubmit(text) {
    const reply = await this._send(`VALUE_SUBMIT\t${text}`);
    const parts = reply.split("\t");
    if (parts[0] === "VALUE_OK") return { kind: "ok", cid: parts[1] };
    if (parts[0] === "VALUE_ERR") return { kind: "error", reason: parts[1] };
    return { kind: "error", raw: reply };
  }

  /** `FXN_BALANCE<TAB><holder hex>`.
   *    -> FXN_BALANCE<TAB><holder hex><TAB><amount>  (a real, measured
   *       total; zero is a legitimate answer)
   *    -> FXN_BALANCE_UNKNOWN<TAB><holder hex>  (this backend has no real
   *       ledger to answer from — absent, not a measured zero) */
  async fxnBalance(pubHex) {
    const reply = await this._send(`FXN_BALANCE\t${pubHex}`);
    const parts = reply.split("\t");
    if (parts[0] === "FXN_BALANCE") return { kind: "balance", holder: parts[1], amount: parts[2] };
    if (parts[0] === "FXN_BALANCE_UNKNOWN") return { kind: "unknown", holder: parts[1] };
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

  /** `TREASURY_CLAIM<TAB><record text>`.
   *    -> TREASURY_CLAIMED<TAB><spend_cid><TAB><destination><TAB><amount><TAB><claim_cid>
   *    -> TREASURY_CLAIM_NOOP  (idempotent replay of an already-claimed record)
   *    -> TREASURY_CLAIM_ERR<TAB><reason> */
  async treasuryClaim(text) {
    const reply = await this._send(`TREASURY_CLAIM\t${text}`);
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
  return { kind: "raw", line };
}
