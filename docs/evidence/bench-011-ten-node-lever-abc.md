# BENCH-011 · Ten-node transfer bench, Lever A+B+C

Measured 2026-10-08 on all ten public flx-* nodes. This is the run behind
the current headline on `/stats`, `/home` and the whitepaper:
**82,863 finalized cross-shard transfers per second**, with 160,532
logical operations/s and 642,128 replica applications/s reported beside
it. Combined with one Mac locally: **108,362 finalized tps**.

## Context: what changed since BENCH-008 (42,637 tps)

Three structural levers and one fleet-growth step raised the headline by
**+94%** on the same core hardware:

| Lever | What it changes | Measured effect |
|---|---|---:|
| **Lever B** (TransferSend/TransferReceive) | Cross-shard transfer collapses 4 phases (PREPARE/ACCEPT/COMMIT/FINALIZE) to 2 ops | 42,637 → 67,563 (+58%) |
| **Lever C-1** (grammar re-parse skip) | Certified-segment replica path uses `Raw::trusted` (committee cert already attested grammar) | small cleanup |
| **Lever C-2** (FxHash) | Admit `HashMap<(G-key, pos), cid>` switched from SipHash to inlined FxHash | combined with C-1 = +4.5% over Lever B |
| **Lever A** (TransferAtomic) | Same-shard transfer collapses to 1 op (sender's chain only) | +~6% of workload runs at halved op count |
| **4 new fleet nodes** (mk1, ms1, ms2, ms3) | Previously unmeasured; each adds its own capacity | +10,890 tps |

Final fleet sum under Lever A+B+C with all 10 nodes: **82,863**.

Levers that were tried and did NOT pay off (documented so the next
person doesn't re-run them):
- **Lever D** — swap system allocator for mimalloc. Mac -12%, fleet
  +1.6% (noise). Reverted.
- **Lever F** — pipelined segment packaging (dedicated producer thread
  signs the next segment while the main thread applies the current
  one, bounded 1-slot channel). Mac ~flat, fleet -0.03%. Pipelining
  only helps when the two stages are of comparable duration; sign
  cost is ~0.5 ms, apply cost is ~30-50 ms, so overlapping saves
  nothing measurable. Reverted.
- **Lever E** — predicted to be in the same ~0.03% regime based on
  channel-op accounting (16 shards × 200 segments × ~1 µs = ~3 ms over
  a 10 s window). Not shipped.

## Method

Each node ran the `transfer-bench` binary from `defxn-defi-rs/dense-wire`
locally, in segmented-v3 mode (mixed topology — the production shape),
for a 10-second sustained window. The binary was built once on flx-bk2
with `cargo build --release` and `scp`'d to the other nine nodes. All
ten were started in parallel and the per-node JSON results collected:

```
cd defxn-defi-rs/dense-wire
cargo build --release --bin transfer-bench
TRANSFER_BENCH_MODE=segmented-v3 TRANSFER_BENCH_WINDOW_MS=10000 \
  TRANSFER_BENCH_THREADS=$(nproc) ./target/release/transfer-bench
```

Threads were set to the node's core count. A transfer counts as
finalized only when either a TransferReceive record lands on a real
TransferSend (cross-shard, 2 ops), or a TransferAtomic record lands with
a valid reservation marker and output pledge (same-shard, 1 op). The
legacy 4-step shape still works and is still accepted but is no longer
the production path.

Replica applications assume four replicas per shard (the 3-of-4
committee shape).

## Per-node results

| Node | CPU | Cores | Submitted | Finalized | Elapsed (ms) | Finalized/s | Logical ops/s | Replica apps/s |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| eul-4c | AMD EPYC 9355P | 4 | 228,000 | 228,000 | 10,088 | 22,601 | 43,785 | 175,140 |
| bk2 | Xeon Gold 6230R | 7 | 152,152 | 152,152 | 10,156 | 14,981 | 29,016 | 116,065 |
| mk2 | AMD EPYC 7552 | 5 | 148,000 | 148,000 | 10,029 | 14,757 | 28,592 | 114,370 |
| eug-2c | AMD EPYC 9355P | 2 | 132,000 | 132,000 | 10,196 | 12,946 | 25,088 | 100,351 |
| bk1 | Xeon Gold 6230R | 2 | 44,000 | 44,000 | 10,354 | 4,250 | 8,233 | 32,933 |
| mk1 | AMD EPYC 7552 | 1 | 36,000 | 36,000 | 11,146 | 3,230 | 6,254 | 25,016 |
| ms3 | Xeon Gold 6230R | 1 | 28,000 | 28,000 | 10,903 | 2,568 | 4,973 | 19,892 |
| ms2 | Xeon Gold 6230R | 1 | 28,000 | 28,000 | 10,938 | 2,560 | 4,960 | 19,840 |
| ms1 | Xeon Gold 6230R | 1 | 28,000 | 28,000 | 11,035 | 2,537 | 4,915 | 19,660 |
| mist1 | Xeon Gold 6230R | 1 | 28,000 | 28,000 | 11,509 | 2,433 | 4,716 | 18,865 |
| **Fleet** | | **25** | **852,152** | **852,152** | | **82,863** | **160,532** | **642,128** |

Every node finalized everything it submitted; errors were zero on every
node. The fleet figures are the sums of the node rows, not averages and
not projections.

A local Apple M-series machine (10 cores) ran the same bench in the
same window, mean of 5 × 10 s runs: **25,499 finalized tps**. Added to
the fleet sum (hardware-honest, not a projection): **108,362 finalized
tps total**.

## Path to 1,000,000 finalized tps

Per-node mix on the current fleet:
- bk2-class: ~15,000 tps
- Average across all 10: 8,286 tps

Arithmetic:
- To hit 1M at the current fleet average: **~121 mixed-class nodes**
- To hit 1M at bk2-class only: **~67 bk2-class nodes**

Compare to BENCH-008's implied path: ~140 nodes under the pre-Lever-B
4-op shape. The levers cut the required fleet size by ~40%.

## What this does not establish

- **Each node benchmarked itself.** Transfers did not cross the network
  between nodes within the timed window. This is per-node resolver
  capacity summed across the fleet, not client-to-fleet traffic.
- **Ten seconds is short.** BENCH-004 is the five-minute sustained run.
  BENCH-011 adds the lever changes on top of the shape BENCH-004 proved
  stable.
- **Replication across physical nodes was not inside the timed
  interval.** The segmented replica path models the K-of-N committee
  shape (one Ed25519 verify per segment root), but each node applied
  its own locally-signed segments; cross-node committee broadcast is
  separately measured in BENCH-007.
- **The honest-code ceiling has been reached for the current
  correctness contract.** See the whitepaper §8 "The ceiling we
  actually hit (and the directions past it)" for which directions
  remain for a real 2× — all architectural, none incremental.

## Artifact status

The per-node figures above were transcribed from the run's JSON results
into `js/content/stats-highlights.js` and `js/content/resolver-registry.js`
on 2026-10-08. `tests/stats-page.cjs` checks that the fleet figures are
the sums of these rows. The raw JSON files and the exact `dense-wire`
source revision (containing the TransferAtomic/TransferSend/
TransferReceive payload variants plus the FxHasher and Raw::trusted
cleanup) are kept in the dense-wire crate's test suite; 44/44 lib
tests pass.
