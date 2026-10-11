# FXN — signed resolution over dense grammar

**Rewritten 2026-10-10.** The previous edition framed this system as a
chain. That framing is retired; it is preserved unedited as
[whitepaper-chain-era.md](whitepaper-chain-era.md) because it holds the
measurements that justified retiring it. Vocabulary this project no
longer uses: [deprecated.md](deprecated.md).

---

## Abstract

An unsigned intent is not yet anything. It becomes real by being signed,
and a **resolver shard** is what turns signed intents into a signed
result.

The protocol is five steps and has no sixth:

1. **Two parties sign** their intent — a dense FLX record whose final
   block is that party's signature.
2. **A resolver shard resolves** — verify signatures (batched), check
   nonces, run a batch auction, apply AMM math to the residual only.
3. **The shard signs the result.** *That signature IS the truth.*
4. **Replicas store** the signed result. No re-verification, no
   re-execution, no agreement step.
5. **Anyone audits** by walking the signature chain.

Measured on ten live replicas (BENCH-012, 2026-10-10): **256 swaps per
batch auction, 8.920 ms batch latency, 180 bytes per signed result, 1,801
bytes to reach ten replicas, 3 × Ed25519 verify to audit, 60 of 60 audits
passed.** Batched signature verification is 75% of a batch; the shard's
own signature — the thing that makes the result true — is 0.3%. All
15,360 swaps matched internally at one clearing price and paid zero curve
slippage.

This paper explains why that shape, what the grammar costs, where a
server's CPU actually goes, and what is not yet established.

## 1. Why a signature and not an agreement

A result produced by agreement is true once enough parties say so.
A result produced by a resolver is true the moment it is signed. The
second needs no rounds, no thresholds, and nothing that accumulates.

What keeps it honest is not a vote but an **audit**: the signed result
commits to the ordered set of intents it resolved, so a wrong resolution
is provable against the intents it claims to have resolved. The resolver
has authority; the audit makes that authority accountable after the fact.

This is a real trade and worth naming: a bad resolution is **detectable,
not prevented**. See §6.

The philosophical statement of the same point, with the axioms tied to
named tests, is [resolver math](resolver-math.md):
`imaginary × imaginary = imaginary`. An unsigned intent is imaginary; the
resolver is the operator that produces reality. **Your resolver's limits
are your limitations.**

## 2. The resolver layer

Everything in the system is a resolver: swaps, identity, device
enrollment, name ownership, stake. A resolver declares what it accepts,
what it verifies, what it computes, and what it costs — and publishes
that as a signed audit manifest.

**A resolver that does not publish its audit manifest is not
registered.** The current registry: [resolver audit](resolver-audit.md) —
**20 resolvers, 6 measured, 14 not built.**

Not built is recorded as `NOT_BUILT`, never as zero. Zero would mean
"measured, and scored nothing", which is a different and much stronger
claim; reporting absence as zero makes missing work read as slow work.

The one structural finding across the registry: **signature placement,
not resolution logic, separates fast resolvers from slow ones.** A
resolver that trusts an upstream verification runs at ~0.001 ms per
resolution. The two resolvers that verify a signature themselves per
record — `Stake-Position`, and `Traffic-Gossip`, which verifies both
signed halves of a fork — are orders of magnitude slower.

## 3. The grammar math

Why dense FLX grammar beats JSON for both wire size and parse cost.
This section is unchanged in substance from the previous edition; it was
never about agreement.

### 3.1 Wire size

A typical record carries 11 blocks (G, Y, V, M, H, J, C, C, C, C, S)
totalling ~674 bytes on the wire. The same record as JSON carries 11
field names, 11 pairs of quotes, braces, commas, and another layer if
base64-wrapped. Measured on fmtbench's 3,000-entry corpus: **47.3% of the
JSON+base64 shape without the shared table, about 57% with it.**

Every byte on the wire is compute at the signature boundary.

### 3.2 Parse cost

A dense record is a `split('-')` and a per-letter dispatch. One real
resolution on bk2 (Xeon Gold 6230R, one core):

| | |
|---|---:|
| split on the dash | 1,515 ns |
| + each block's resolver | 2,888 ns |
| full checks | 5,028 ns |
| (comparison) decode every field into a tree | 13,279 ns |

### 3.3 A signed result compresses only as a feed

A single signed result is 580 bytes of mostly unique hex — signature,
three CIDs, a key — with almost no internal redundancy. LZMA2 on one
result alone **loses**. Across a run, where the grammar skeleton repeats,
it gets 580 → **180 bytes, 3.22×**.

That is why replication is measured per feed, not per result: **1,801
bytes carries 256 swaps to 10 replicas**, about 0.7 bytes per swap per
replica.

A caution that cost real time: the first measurement used a pure-Rust
LZMA encoder that achieved **no compression at all** (582 bytes from
581). That was the encoder's limit, not the format's. A compression
number measures the encoder as much as the data.

## 4. Where a server's CPU goes

Measured on bk2, one core, 20 s window, batch signature checks on:

| Component | Share of CPU |
|---|---:|
| signature checks | **54.7%** |
| storage: writer, queue, reads | 20.3% |
| logic over stored records | 13.8% |
| connection loop | 5.0% |
| sha256 of records | 3.5% |
| **the grammar itself: split and resolvers** | **2.1%** |
| everything else | 0.6% |

**The parser is 2% of the server's work.** Making the grammar cheaper is
the wrong optimisation; amortising signatures across a bigger batch is
the right one. The resolver measurement agrees from the other direction:
batched verification is 75% of a batch, and the shard's signature is
0.3%.

**What hardware matters.** Because signature checks dominate, the CPU
core is the whole speed story. One Ed25519 verify is ~25 µs on an AMD
EPYC core and ~52 µs on the fleet's Intel Xeons, which is why EPYC nodes
lead every per-node table. The protocol links no GPU path.

## 5. The metrics, and the ones we no longer report

A swap is not a transaction competing for block space, and a replica does
not apply anything — it stores one signed result per batch. So the
metrics are:

| Reported | Measured |
|---|---:|
| swaps per batch auction | 256 |
| batch latency | 8.920 ms |
| verify latency (batched) | 10.403 ms¹ |
| resolve latency (auction + AMM) | 2.173 ms¹ |
| sign latency | 0.0403 ms¹ |
| signed result bytes | 180 |
| peers reached | 10 |
| replication cost | 1,801 bytes |
| audit cost | 3 × Ed25519 verify |

¹ from the 13.874 ms run; the 8.920 ms run was the same code on a quieter
machine. Both are in [BENCH-012](evidence/bench-012-defi-shard-signed-resolution.md).

**No longer reported, and why:** rates per second of admissions or
transactions (a swap does not compete for block space), replica
applications (a replica stores; it applies nothing), and any comparison
to a chain. Those are listed with their replacements in
[deprecated.md](deprecated.md).

## 6. One price per batch

Every intent in a batch clears at one price. Position inside the batch
cannot change what anyone pays, so ordering advantage is **removed from
the space** rather than mitigated.

Matched flow pays no curve slippage at all; only a residual imbalance
touches the AMM. Each party's own `min_out` caps extraction, and an
intent that cannot be met is **refused by name**, not filled badly.

Proven rather than asserted: `internal_matching_beats_the_curve_for_the_same_order`
puts the same signed buy through a batch with a counterparty and alone
against the curve, and requires the matched fill to be strictly larger.

## 7. A signed result reaches replicas

One broadcast per **batch**, never per swap. Wire shape:
`SRES\t<signed result>` → `SRES_OK\t<cid>`. A replica stores it verbatim
and replies. Ten of ten replicas reached in BENCH-012.

**This is the binding constraint on the whole system.** The broadcast is
not pipelined: 449 ms to reach ten replicas against 8.920 ms to resolve.
Serialised, that caps the fleet at ~2.2 batches/s regardless of how fast
the resolver is. The resolver figures in §5 are resolution-only; **do not
add broadcast to them by assumption.**

The intended shape is one feed per pool carrying signed results in order,
with replicas subscribing. That is unbuilt, and it is the first item of
work.

Two things learned the expensive way, both now enforced by tests:

* **An acknowledgement waits on peers, never on a local disk write.** A
  local append log inside the acknowledgement path cost **52.8×** and
  recovered nothing. `defxn-defi-rs/tests/ack_waits_only_on_peers.rs`.
* **Replication is never a disk-sync primitive.**
  `defxn-defi-rs/tests/no_disk_sync_primitives.rs`.

Both are mutation-verified in both directions.

## 8. A holder's own key catches their double-signing

A holder who signs two different records at the same `(G, pos)` has
produced evidence of their own attempt. Both signed records are kept as
evidence, and a third observer that sees the two halves freezes that
holder locally — then relays the pair to its own peers, so one observer
is enough for the whole fleet to learn it (`Traffic-Gossip`,
[resolver audit](resolver-audit.md)).

This replaces every mempool and fork-choice rule with: the holder's own
signatures prove the attempt.

### 8.1 Attack suite

| Attack | What happens |
|---|---|
| replay the same bytes | idempotent — same bytes, same CID, no second entry |
| double-spend of one input | refused by the payload check, which walks the holder's records back to the input |
| two appends racing one position | exactly one wins; the other becomes fraud evidence |
| forged intent in a batch | the **whole batch** fails; the shard does not hunt the culprit, because doing so would let one forgery impose N verifications |
| replayed nonce | refused by name |
| unmeetable `min_out` | refused, not filled badly |
| batch reordered after signing | fails the audit, even though every signature in it is genuine |

## 9. What this paper does not prove

1. **Broadcast is unpipelined and dominates end to end** (§7). No
   end-to-end figure should be quoted until that lands.
2. **The resolver is trusted within a batch.** The audit proves a bad
   resolution after the fact; it does not prevent one, and no penalty is
   wired.
3. **Fourteen of twenty resolvers are not built**, including liquidity add
   and remove, which are needed to complete the swap resolver.
4. **The pool is held constant** across measured batches. Carrying
   reserves forward drifts the pool from spot and stops internal
   matching, so a drifting run measures depletion rather than the
   resolver. Depletion is a real and separate question.
5. **Custody is not modelled.** An intent references escrowed input by
   CID; nothing moves value.
6. **One pool per batch.** No cross-pool routing.
7. **Intent transport is excluded.** Intents are built in-process, so the
   party → shard leg is in no timing.
8. **No independent review.** The attack suite is ours.
9. **Nothing refills a restarted node.** There is no peer-sync bootstrap,
   and there is deliberately no local disk cache.
10. **`Block 9`** is read as the signature block of a dense record. If
    that reading is wrong the grammar needs revisiting, not the
    measurements.

## 10. The route forward, measured

**Parallelism is the lever, and the fleet confirms it.** All ten nodes
ran concurrently with shards set to each node's core count:
**643,632 swaps/s across 37 cores**, against 274,840 with one shard per
node — a **2.34× gain from parallelism alone**. The same run measured
69,895 transfers/s and 6,044,992 signed-result stores/s fleet-wide. A sum
of concurrent measurements, never one node multiplied by ten
(BENCH-013).

Batch size is *not* the lever: a 64× increase in batch size bought 1.3×,
with signature verification at 71–77% of a batch throughout. A swap is
verification-bound and, unlike a transfer, its verification cannot be
skipped — a replica may skip it because the shard already attested, but
the shard cannot, because checking the parties is its job.

**Core count does not predict the result.** `hel1` has 8 cores and
reached 88,482; `eul-4c` has 4 and reached 127,960. Verifying Ed25519 is
single-core-speed work, so **fast cores first**, shard to the
performance-core count, then add nodes.

Per-node scaling holds at 93% of linear at 2 shards and 90% at 4, then
falls to 56% at 8 — the knee is the performance-core count, not the
logical-core count.

## 11. Work owed

**First, and ahead of everything:** pipeline the signed-result feed. The
fleet can resolve 643,632 swaps/s and deliver a tiny fraction of that,
because broadcast is 449 ms per batch unpipelined.

Then: liquidity add and remove; the lending family and governance (nine
resolvers, none built); search, geometric and AI/TLM (three, none built).
Then custody, and cross-pool routing.

Operationally: seed and key custody, a runbook, deploy and rollback,
monitoring, a devnet separate from production machines, and independent
review. Those were listed in the retired readiness inventory and carry
forward unchanged.

## Appendix A — Re-running every number

```sh
cd defxn-defi-rs/dense-wire
cargo test --release                            # 265 lib + 7 end-to-end
cargo run --release --bin defi-shard-bench      # §5
cargo run --release --bin resolver-audit        # §2 manifests
SHARD_BENCH_PEERS=host:port,… cargo run --release --bin defi-shard-bench
```

Every figure in §5 comes from the third command; §2's manifests from the
fourth. No latency in the resolver audit was typed by hand.

## Appendix B — One real record, block by block

```
G<party pubkey>      who signs
Y LEDGERENTRY        kind
V 1                  version
M <unix seconds>     when
H <hex-of-utf8 G>    holder, bound to G
K KSWAPI1            what kind of thing this is
W <hex-of-utf8 id>   the address it concerns
J <position>         position in this holder's own sequence
C <prev>             what it extends
C <terms cid>        what it commits to
S <signature>        Block 9 — the signature over everything before it
```

`W` is hex-of-utf8 because the dense charset is `[A-Za-z0-9-]`, so an
arbitrary string cannot appear literally.

## Appendix C — Retired paths, kept for history

* [whitepaper-chain-era.md](whitepaper-chain-era.md) — the previous
  edition, unedited.
* [mainnet-readiness.md](mainnet-readiness.md) — a readiness inventory of
  the retired direction; its operational gaps still stand.
* [deprecated.md](deprecated.md) — the ledger, with the measured
  consequences that justified each retirement.
