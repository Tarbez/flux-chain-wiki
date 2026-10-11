# BENCH-012 · FLX DeFi as signed resolution

Measured 2026-10-10. **This record replaces every chain-shaped DeFi
measurement.** FLX DeFi is not a blockchain and must not be measured as
one.

## The model

1. Two parties sign their **intent**; each intent carries its own
   signature in its final block.
2. A **shard resolves**: one batched Ed25519 verification, nonce screen,
   uniform-price batch auction, AMM math on the residual only.
3. The shard **signs the result**. *That signature is the truth.*
4. **Replicas store the signed result.** No re-verify, no re-execute, no
   re-consensus.
5. Anyone **audits** by walking the signature chain.

Implementation: `dense-wire/src/defi_shard.rs`,
`dense-wire/src/bin/defi_shard_bench.rs`, and the `SRES` command in
`chain_server.rs` (a replica's whole job).

## Result — 10 live replicas, broadcast on

```
Swaps resolved: 15360
Batches: 60
Average swaps/batch: 256.0
Average batch latency: 13.874 ms
Average verify latency: 10.403 ms (batched)
Average sign latency: 0.0403 ms
Signed result bytes: 180
Peers reached: 10
Replication cost: 1801 bytes
Audit cost: 3 × Ed25519_verify
```

Shard-only, same shape, no broadcast (200 batches):

```
Average batch latency: 6.506 ms
Average verify latency: 4.846 ms (batched)
Average sign latency: 0.0195 ms
batches/s: 153.7      swaps/s resolved: 39,349
```

## Attribution — where the time goes

| stage | latency | share of batch |
|---|---:|---:|
| batched signature verify | 10.403 ms | **75.0%** |
| batch auction + AMM | 2.173 ms | 15.7% |
| shard signs the result | 0.040 ms | **0.3%** |

**Signature verification is three quarters of a batch.** It is already
batched; without batching, 256 individual verifies at ~50 µs would be
~12.8 ms of pure verify per batch and would dominate completely. The
shard's own signature — the thing that makes the result true — costs
**0.3%**. Authority is nearly free; checking the parties is the work.

## The batch auction is real, not decorative

**15,360 of 15,360 swaps (100%) matched internally** and paid **zero
curve slippage**. Only a residual imbalance would touch the AMM, and a
balanced batch leaves none.

Proven, not asserted: `internal_matching_beats_the_curve_for_the_same_order`
puts the same signed buy through a batch with a counterparty and alone
against the curve, and requires the matched fill to be strictly larger.

Because every intent in a batch clears at **one price**, position inside
the batch cannot change what anyone pays. That removes intra-batch
ordering advantage outright rather than mitigating it.

## Replication cost

| | bytes/result | ratio |
|---|---:|---:|
| raw FLX dense | 580 | 1.00× |
| LZMA2, one result alone | 472 | 1.23× |
| **LZMA2, in a run (the feed shape)** | **180** | **3.22×** |

**1,801 bytes to replicate 256 swaps to 10 replicas** — about **0.7 bytes
per swap per replica**.

Two measurement notes that changed the number:

* A single signed result barely compresses: it is mostly unique hex
  (signature, three CIDs, key) with no internal redundancy. LZMA2 pays
  only across a **run**, where the grammar skeleton repeats. Quoting the
  single-record figure would have understated the format by 2.6×.
* The first measurement used `lzma-rs`, whose pure-Rust encoder achieved
  **no compression at all** (582 bytes from 581). That was the encoder's
  limit, not LZMA2's — reference `xz -9e` on the same shape gets 184
  bytes/result. The bench now uses liblzma via `xz2`. **A compression
  number is a measurement of the encoder as much as the format.**

## Audit

**3 × Ed25519_verify**, plus one hash:

1. the shard's signature on this result,
2. the shard's signature on the result it links back to,
3. one sampled party intent, proving the batch held real orders,
4. `intents_root` re-derived from the intent CIDs.

60/60 audits passed. A genesis result has nothing earlier to verify, so
it reports 2 verifies rather than claiming a check it did not perform.

`a_reordered_batch_fails_the_audit` shows the root check earns its place:
a batch whose signatures are all genuine but whose order was changed does
**not** audit clean.

## What this does not establish

1. **Broadcast dominates end to end and is not yet pipelined.** 449 ms
   for 10 peers, against 13.9 ms to resolve. Serialised, that caps the
   fleet at ~2.2 batches/s (~553 swaps/s) regardless of resolver speed.
   The resolver figures above are resolution-only; **do not add broadcast
   to them by assumption.**
2. **The pool is held constant** across batches. Carrying reserves
   forward for 200 batches of 256 swaps drifts the pool far from spot,
   and a skewed pool stops matching internally — so a drifting run
   measures depletion, not the resolver. `SHARD_BENCH_DRIFT=1` measures
   depletion as its own question; it has not been run to completion.
3. **Custody is not modelled.** An intent references escrowed input by
   CID; nothing here moves value.
4. **One pool per batch.** No cross-pool routing.
5. **Intent transport is excluded.** Intents are built in-process, so the
   party→shard leg is in no timing here. Intent construction (730 ms
   total) is the party's cost and is excluded by design.
6. **The shard is trusted within a batch.** The audit path proves a bad
   resolution after the fact; it does not prevent one, and no slashing is
   wired.
7. **`Block 9`** is read as *the signature block of a dense FLX record* —
   `G-Y-V-M-H-K-W-J-C…-S`, where `S` is final. If that reading is wrong
   the grammar here needs revisiting, not the measurements.

## Metrics retired by this record

Stop reporting these **for DeFi**: accepted/s, TPS, replica
applications/s, `nodesHoldingEachRecord`, durability-via-segment-shipping,
and any comparison to Autobase, agreement-fabric, or a chain. A swap is
not a transaction competing for block space, and a replica does not apply
anything — it stores one signed result per batch.
