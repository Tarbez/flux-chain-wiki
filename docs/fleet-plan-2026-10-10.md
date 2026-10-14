# Fleet plan — one path, signed resolution

**Rewritten 2026-10-10** against `deprecated.md`. The previous revision of
this file carried the vocabulary this project is retiring, and reported
rates in units that do not describe what the system does. Its numbers are
not corrected here; they are withdrawn.

Enforced by `tests/no-deprecated-vocabulary.cjs`.

---

## 0. The one path

1. **Two parties sign** their intent (Block 9 each).
2. **A resolver shard resolves** — verify signatures (batched) → check
   nonces → batch auction → AMM math on the residual.
3. **The shard signs the result** (Block 9). **This signature IS the
   truth.**
4. **Replicas store** the signed result. No re-verification, no
   re-execution, no agreement step.
5. **Anyone can audit** by walking the signature chain.

There is no step six. See [resolver math](resolver-math.md) for why this
shape and not another.

---

## 1. Measured, as of 2026-10-10

Source: [BENCH-012](evidence/bench-012-defi-shard-signed-resolution.md).

| | |
|---|---:|
| Swaps resolved | 15,360 |
| Batches | 60 |
| **Swaps per batch auction** | **256** |
| **Batch latency** | **13.874 ms** |
| Verify latency (batched) | 10.403 ms |
| Resolve latency (auction + AMM) | 2.173 ms |
| Sign latency | 0.0403 ms |
| Signed result bytes | 180 |
| Peers reached | 10 |
| Replication cost | 1,801 bytes |
| Audit cost | 3 × Ed25519 verify |

Shard only, broadcast excluded: **153.7 batches/s, 39,349 swaps/s
resolved.**

### Where the time goes

| stage | latency | share |
|---|---:|---:|
| batched signature verification | 10.403 ms | **75.0%** |
| batch auction + AMM residual | 2.173 ms | 15.7% |
| the shard signs the result | 0.040 ms | **0.3%** |

Making a result true is nearly free. Establishing that the intents were
real is the entire cost, and it is already batched — 256 separate
verifications would be ~12.8 ms of verification alone.

### One price per batch

**15,360 of 15,360 swaps matched internally and paid zero curve
slippage.** Position inside a batch cannot change what anyone pays, so
ordering advantage is removed from the space rather than mitigated.

Proven by `internal_matching_beats_the_curve_for_the_same_order`, which
puts the same signed buy through a batch with a counterparty and alone
against the curve, and requires the matched fill to be strictly larger.

---

## 2. Resolvers

Full table: [resolver audit](resolver-audit.md). Signed manifests:
[`registry/resolver-audit-manifests.wire`](registry/resolver-audit-manifests.wire).

**20 resolvers — 6 measured, 14 not built.** Not built is recorded as
`NOT_BUILT`, never as zero, so missing work does not read as slow work.
`Traffic-Gossip` — the equivocation relay — moved into the measured set
on 2026-10-11, once `Ledger::on_fraud` was wired to a real `Broadcaster`
in production rather than existing only in tests.

The one structural finding: **signature placement separates fast
resolvers from slow ones.** A resolver that trusts an upstream
verification runs at ~0.001 ms per resolution; `Stake-Position` and
`Traffic-Gossip`, which verify a signature themselves per record (two,
for Traffic-Gossip — both halves of the fork), are orders of magnitude
slower. Resolution logic is not what costs.

---

## 3. The binding constraint

**Broadcast is unpipelined.** 449 ms to reach 10 replicas against 13.874
ms to resolve. Serialised, that caps the fleet at ~2.2 batches/s — about
553 swaps/s — regardless of how fast the resolver gets.

Nothing else in this plan matters until that moves. The resolver numbers
in §1 are resolution-only; **do not add broadcast to them by
assumption.**

Shape: one feed per pool, carrying signed results. One frame per batch,
never per swap. A replica subscribes and stores.

---

## 3a. The route forward, measured

| | |
|---|---:|
| Fleet swaps/s, parallel shards, 10 nodes / 37 cores | **643,632** |
| Fleet swaps/s, one shard per node | 274,840 |
| Gain from parallelism alone | **2.34×** |
| Fleet transfers/s (same run) | 69,895 |
| Fleet signed-result stores/s (same run) | 6,044,992 |

Per-node scaling: 93% of linear at 2 shards, 90% at 4, 56% at 8 — the
knee is the performance-core count. **Fast cores first, shard to the
performance-core count, then add nodes.** Batch size is not the lever: a
64× size increase bought 1.3×.

Full matrix and limits: [BENCH-013](evidence/bench-013-operation-matrix.md).

## 4. Work, in order

### P0 — pipeline the signed-result feed
Per-pool feed, signed results in order, replicas subscribe and store. The
measurement above is waiting on this and no other number should be quoted
as end-to-end until it lands.

### P0 — complete the swap resolver
`Liquidity-Add` and `Liquidity-Remove`: one signer each, pool mint and
burn, the burn respecting locks. Both are declared and not built.

### P1 — the lending family and governance
Lending, borrowing, liquidation, governance vote, treasury spend, group
membership, content publish, claim, vault. Nine resolvers, none built.

### P2 — search, geometric, AI/TLM
Three resolvers, none built.

### Fleet hygiene
* `bk1` and `mist1` have **no firewall active** — their admission port is
  world-open. Decide: enable with SSH allowed first, or accept.
* ~445 MB of unreadable local log files remain under
  `/var/lib/defxn-chain/`. Kept as evidence of the `GENESIS_PREV` format
  break; safe to delete once that is recorded elsewhere.
* Six pre-existing site test failures (`conversion-copy`,
  `operator-states`, `routes-live`, `seo-content`, `settings`,
  `state-layering`), unrelated to this work.

---

## 5. Laws now enforced by tests

| Law | Enforcement |
|---|---|
| No blockchain vocabulary in live docs | `tests/no-deprecated-vocabulary.cjs` |
| An acknowledgement waits on peers, never on a local disk write | `defxn-defi-rs/tests/ack_waits_only_on_peers.rs` |
| Durability is replication, never a disk-sync primitive | `defxn-defi-rs/tests/no_disk_sync_primitives.rs` |
| A modeled number is labelled modeled at the point of use | `tests/stats-page.cjs` |

Each was added after the same mistake recurred despite being written down
in prose. A comment is a convention; a failing test is a law.

---

## 6. What would change the plan

* If the pipelined feed does not bring end-to-end close to the 13.874 ms
  resolution figure, the bottleneck is transport rather than batching and
  the feed design needs revisiting before more resolvers are built.
* If per-pool swap volume caps a hot pool below a few hundred swaps per
  batch, one pool per batch is the wrong unit and pools need splitting
  before the lending family is started.
