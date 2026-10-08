# BENCH-009 · Fleet soak with K-of-N replication on (planned)

Status: **planned, not run.** No number from this record may be quoted.

## Why it is needed

The whitepaper (§7) describes durability as K-of-N peer replication: an
admission returns only after K peers acknowledge the record. That path is
implemented and covered by tests, but the only sustained fleet measurement,
BENCH-004 (12,403 accepted ops/s for 303 seconds), ran with the local cache,
not with replication. Until this run exists, no published figure describes
the fleet with durability on.

## Method

Repeat BENCH-004 exactly, changing one thing: replication on.

- Same six public `chain-server` nodes, same build as BENCH-004 or a named
  later revision.
- Every node configured with the other five as peers, and a stated K (record
  the value; K = 2 and K = 3 are both worth running).
- Same client and load shape: one `fleet-many` process per node, 32 holder
  chains × 500 entries per batch, at least 300 seconds.
- Record per node: batches, accepted, failures, and the p50/p99 admission
  latency.
- After the run, on every node, compare chain heads for a sample of holders
  and confirm each sampled record is held by at least K peers.

## Pass criteria

- Zero failures, as in BENCH-004.
- Every sampled record present on at least K peers.
- Throughput and latency reported beside BENCH-004's 12,403 ops/s, as a
  separate figure. A drop is expected and is the point of the measurement.

## What to change when it lands

- `/stats` readiness: "K-of-N replication under load" moves to measured.
- Whitepaper §10: remove the "not yet measured on the fleet" line.
- `js/content/stats-highlights.js`: add the result next to `chainFleetSoak`,
  never in place of it.
