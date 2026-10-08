# Before the registered-grammar notebook goes to production

Written 2026-10-07, the same evening the prototype was measured (BENCH-003 §14-16).
This is a checklist, not a plan: it lists what stands between `defxn-defi-rs/dense-wire`
and something that can hold real value, ordered by whether it blocks. Status
vocabulary matches `docs/status.md` and `docs/mainnet-readiness.md`.

How each item is known, so none is mistaken for a result:

* **READ** found by reading the code. True today, not yet tried as an attack.
* **MEASURED** backed by a number in BENCH-003.
* **PEN-TEST** assigned to the isolated security test (scratch copy, `127.0.0.1` only);
  its findings are appended to `docs/prototype-pen-test.md` when it reports. Until then
  the item is a suspicion.
* **DECISION** needs an owner call, not engineering.

## 0a. The design that changes most of this list

See **`docs/finance-ledger-design.md`** (2026-10-07). It proposes a new
registered-grammar extension (`LEDGERENTRY` manifest type + `J` role letter
for chain-position) that makes double-spend unrepresentable rather than
prevented, removes the MEV surface by construction, and closes items §1.1
and §1.3's `RECEIPT` gap. The items below that it closes carry a
*design-ledger* marker. Owner decision owed in that doc §12 before the
first implementation step.

## 0. Decisions that change the list (answer these first)

1. **What does "prod" mean for it?** A new path next to the certified fabric, a
   replacement for the live FXN registry on `bk2:18890`, or a private service for
   one product? Everything below changes with the answer. *DECISION*
2. **Which finality does it promise?** Today it acks after one in-memory write:
   accepted, not replicated, not flushed (a crash loses it). If it must be durable,
   the replica path is a build item (§1.1), and the roughly 2.5x cost measured in
   §11-12 returns. *DECISION*
3. **Who may issue value?** One genesis key signs every issuance, so one key is the
   whole monetary policy. Single key, a roster, or the existing ceremony code? *DECISION*
4. **Does it stand beside the certified fabric or replace it?** The certified path has a
   threshold certificate and the prototype does not. Splitting by transfer size or by
   trust level is a legitimate design; silently swapping is not. *DECISION*
5. **Who can reach it?** The browser cannot speak raw TCP. The agreed shape is "the
   gateway (HTTP) is the only external entry point" with the miner on a raw socket.
   That gateway does not exist yet (§2.3). *DECISION*

## 1. Blocking: must close before any real value moves

### 1.1 Durability and recovery

* **No replica path over the wire** (TRANSFER path). *Not built.* A write is acked from
  memory plus an un-synced append. Kill the process and recent transfers vanish; if a
  spend marker is lost, **the same input can be spent again after restart**. *READ, PEN-TEST*
* **CHAIN path durability is CLOSED (2026-10-08).** `chain::Ledger` carries a
  `Replication` policy — `None`, `LocalCache` (cold-start convenience), or
  `Peers { require, among }` (K-of-N peer acks on content-addressed CIDs).
  Admit returns Ok only after replication succeeds; if fewer than K acks come
  back, admit returns `ChainErr::Replication { got_acks, need }` and nothing
  in memory changes. On cold-start, fast replay re-verifies the HEAD
  signature per chain and uses the hash chain to establish the tail —
  measured ~10x faster than strict replay for the same guarantee. 15 chain
  tests + 3 TCP tests pass. *MEASURED, see /stats/ledger*
* **The TRANSFER path still writes to a local log without peer replication.**
  Same shape as the chain's old gap; the fix is the same (K-of-N peer acks on
  CIDs). Still owed. *READ, PEN-TEST*
* **Chain replay correctness** covered by `cache_reopen_preserves_the_committed_entries`,
  `durable_tampered_head_is_refused_at_replay` (fast + strict),
  `durable_tampered_middle_is_caught_by_hash_chain`,
  `durable_tampered_first_sig_caught_only_by_strict`, and
  `durable_burst_round_trip`. TRANSFER path replay is still untested.
  *MEASURED (chain), PEN-TEST (transfer)*
* **State only grows.** The notebook keeps every record in an in-memory `BTreeMap`
  forever; there is no compaction, archive or eviction. Capacity per machine is
  RAM-bound and unmeasured past about 500,000 transfers. *READ*

### 1.2 Security of the listener

* **No transport security and no authentication.** Raw TCP in the clear. Signatures
  protect records, not the connection (no confidentiality, no peer identity, nothing
  stops a network observer replaying or suppressing lines). Needs TLS or a noise-style
  channel, or must sit behind the gateway on a private network. *Not built*
* **No resource limits on the socket.** `read_line` is unbounded, so a single line
  without a newline grows memory until the 64 KB manifest check runs *after* it is
  all buffered; one thread per connection with no cap; no idle timeout; no rate
  limit per peer; the verifier queue is unbounded. *READ, PEN-TEST*
* **A panic in the verifier pool poisons its mutex** (`lock().unwrap()`), which would
  fail every later connection in pool mode. *READ, PEN-TEST*
* **Batch signature verification is cofactored.** It can accept a signature that
  one-at-a-time `verify` rejects. Acceptable for one notebook only if nobody else needs
  to agree on validity; the moment a second party (a replica, an auditor, the
  certified fabric) verifies the same records, they must run one mode, or small-order
  keys must be rejected / `verify_strict` run on accepts. Default the production mode
  to `off` until this is closed. *MEASURED, PEN-TEST (concrete exploit requested)*
* **Independent security review.** *Not built.* A first automated pen-test pass was
  started on an isolated scratch copy (127.0.0.1 only) on 2026-10-07 but **did not
  finish** — it stopped on an account rate limit before writing findings, so it
  produced nothing usable. The scope it was given, kept here as the test plan for the
  next attempt: listener DoS (unbounded `read_line`, connection flood, slowloris, pool
  queue growth, memory growth under valid-but-useless records); authorization/logic
  (spend-not-owned, double-spend sequential and concurrent, cross-record and
  cross-agreement confusion, amount overflow, issuance by non-genesis, replay, check-then-act
  races, make-a-successor-live-twice); grammar differentials vs `flux-core::parse_manifest`
  and CID malleability; ed25519 non-strict vs strict and a concrete cofactored-batch exploit;
  crash/recovery (lost spend marker after kill -9, torn log line, reachable `unwrap()` panics);
  error-code oracles. None of this has been attempted yet. A human review is still required
  on top.

### 1.3 Conformance with the registry

* **Never run against the shipped vectors.** `flux-spec/vectors/agreement-lifecycle-vectors.json`
  carries canonical signed bytes and CIDs for these record types. The prototype's
  builders and admission have not been checked against it, so "registered grammar" is
  true of the *letters and roles* and unproven for the *bytes*. *READ*
* **The standing documents are invented strings.** The constraint document, offer
  contract, authority policy, resolver and asset policy CIDs are hashes of fixed text I
  chose (`flux.notebook.*`). They are not registered documents. Production needs real
  addressed documents, registered and versioned, or a spec-defined derivation.
  *DECISION, READ*
* **RECEIPT (`0K`) is not implemented**, so there is no closure evidence; conflict-as-data
  (spec 08), split/join, refund and expiry are absent; amounts are one unit (`FXN`).
  Which of these production needs is a scope call. *Not built, DECISION*
* **The holder block is the hex of a hex key** (the grammar's rule for holder ids),
  doubling the largest field. A digest holder is a spec question, not a tuning one. *MEASURED*

### 1.4 Correctness under load

* **Soak.** The longest run is 20 seconds. Needs hours at realistic concurrency, with
  growth, latency tail and failure rate recorded. *Not built*
* **Chaos.** Kill a shard writer, fill the disk, clock skew between machines (deadlines
  use `now`), a slow disk, a client that dies mid-write. *Not built*
* **Fuzzing the admission path** with a structure-aware fuzzer, including differential
  checks against `flux-core`'s own `parse_manifest`. *Not built*
* **Check-then-act races** in `handle` (reads, then writes, with one atomic step at the
  fulfillment). The attack suite covers two simultaneous spends of one input; it does
  not prove the rest. *PEN-TEST*

## 2. Should close before launch

### 2.1 Operations

* No systemd unit, no `LimitNOFILE`, no graceful shutdown, no health endpoint, no
  metrics, no alerting, no log rotation. The fleet monitor can poll a health route once
  one exists. *Not built*
* **Shares machines with production.** `bk2`, `mk2`, `bk1` also run the certified
  quorum. The prototype will take 90%+ of the CPU it is given, so it needs its own
  cores or its own machines (the readiness doc's gap #1: no devnet). *READ*
* **Deploy and rollback.** A scripted build on the target architecture (the Mac builds
  arm64; the fleet is x86_64), a previous-binary-by-path rollback, and a data
  migration or an explicit "fresh ledger" decision. *Not built*
* Seed and key custody: where the genesis seed lives, who can read it, how it rotates. *Not built*
* A runbook: what to do when a shard fills, the writer stalls, or the log is corrupt. *Not built*

### 2.2 Performance claims that must not travel

* **24,908 transfers/s is accepted finality, on a prototype, with fleet machines as
  clients.** It must never be quoted without that label next to 5,711-6,041/s
  (certified, accepted) and 676-827/s (certified, durable). *MEASURED*
* Per-write latency under batching is hundreds of milliseconds (it is a throughput
  configuration). A latency target needs its own measurement. *MEASURED*
* The numbers were taken with a dummy replica that is never contacted. A durable
  configuration has not been measured on this server. *MEASURED*

### 2.3 Product surface

* **The gateway** (HTTP in, grammar out), client libraries, and a way for a browser
  wallet to sign these records. The existing browser signing path is for a different
  record format. *Not built*
* A compatibility story for the live HTTP/JSON FXN registry's data and clients. *DECISION*
* Admission policy beyond "signed by the holder": rate limits per identity, dust
  limits, abuse handling. *Not built*

## 3. Can follow launch

* Standing intents and offers (spec allows; removes two of six signatures; a protocol
  choice, so it needs sign-off). Batch verification beyond the cofactored caveat.
* Multi-asset units, split and join, receipts, conflict containment.
* A threshold certificate on the grammar path, for transfers that need Byzantine
  tolerance.
* Compaction and archival of old records.

## What closes what

| Item | Closed by |
| --- | --- |
| Lost spend marker after crash | K-of-N peer replication of the marker CID + head gossip (§1.1) |
| Network observer / MITM | TLS or noise channel, or private network + gateway (§1.2) |
| Memory and connection exhaustion | line cap, connection cap, idle timeout, rate limits (§1.2) |
| "Registered grammar" claim | vector conformance + registered documents (§1.3) |
| Batch-mode validity disagreement | default off, or reject small-order keys / strict on accept (§1.2) |
| Operating blind | health route, metrics, systemd, runbook (§2.1) |
