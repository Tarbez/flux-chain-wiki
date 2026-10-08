# BENCH-008 · Six-node transfer bench (the /stats headline)

Measured 2026-10-08 on the six public flx-* nodes. This is the run behind the
headline on `/stats` and the home page: **42,637 finalized cross-shard
transfers per second**, with 170,553 logical operations/s and 682,213 replica
applications/s reported beside it (see whitepaper §5).

## Method

Each node ran the `transfer-bench` binary from `defxn-defi-rs/dense-wire`
locally, in segmented mode, cross-shard topology only, for a 10-second
sustained window. `/tmp/fleet-tx-bench.sh` on flx-bk2 started the bench on
every node and collected one JSON result per node:

```
cd defxn-defi-rs/dense-wire
cargo build --release --bin transfer-bench
TRANSFER_BENCH_MODE=segmented TRANSFER_BENCH_WINDOW_MS=10000 \
  TRANSFER_BENCH_TOPOLOGY=cross ./target/release/transfer-bench
```

Threads were set to the node's core count. A transfer counts as finalized only
when its FINALIZE record lands on a real COMMIT, ACCEPT and PREPARE, so each
transfer is four logical operations. Replica applications assume four replicas
per shard (the 3-of-4 committee shape).

## Per-node results

| Node | CPU | Cores | Submitted | Finalized | Elapsed (ms) | Finalized/s | Logical ops/s | Replica apps/s |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| eul-4c | AMD EPYC 9355P | 4 | 140,000 | 140,000 | 10,089 | 13,876 | 55,506 | 222,024 |
| bk2 | Xeon Gold 6230R | 7 | 92,092 | 92,092 | 9,999 | 9,210 | 36,840 | 147,362 |
| mk2 | AMD EPYC 7552 | 5 | 88,000 | 88,000 | 10,213 | 8,616 | 34,466 | 137,864 |
| eug-2c | AMD EPYC 9355P | 2 | 76,000 | 76,000 | 10,462 | 7,264 | 29,058 | 116,230 |
| bk1 | Xeon Gold 6230R | 2 | 24,000 | 24,000 | 10,230 | 2,346 | 9,384 | 37,537 |
| mist1 | Xeon Gold 6230R | 1 | 16,000 | 16,000 | 12,078 | 1,325 | 5,299 | 21,196 |
| **Fleet** | | **21** | **436,092** | **436,092** | | **42,637** | **170,553** | **682,213** |

Every node finalized everything it submitted; errors were zero on every node.
The fleet figures are the sums of the node rows, not an average and not a
projection. Each rate is that node's finalized count divided by its own
elapsed time.

A local Apple M-series machine (10 cores) ran the same bench in the same
window: 168,000 finalized, 15,947/s. It is not fleet hardware and is not part
of the headline.

## What this does not establish

- **Each node benchmarked itself.** The bench runs in-process on each node;
  transfers did not cross the network between nodes. This is per-node
  resolver capacity summed across the fleet, not client-to-fleet traffic.
- **Concurrent or sequential is not settled.** Site copy describes the six
  windows as running in parallel; the note recorded with the data says the
  script ran on each host in turn. Because each node benchmarks itself
  in-process, the sum is the same either way, but "all nodes at once" must
  not be claimed until the raw timestamps are attached.
- **Ten seconds is short.** BENCH-004 is the five-minute sustained run.
- **Replication was not under test.** See BENCH-009.

## Artifact status

The per-node figures above were transcribed from the run's JSON results into
`js/content/stats-highlights.js` on 2026-10-08, and `tests/stats-page.cjs`
checks that the fleet figures are the sums of these rows. The raw JSON files
and the exact `dense-wire` source revision are not yet attached to this
record. Attach both to promote it from `Partial`.
