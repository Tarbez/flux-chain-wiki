# BENCH-009 · Fleet soak with approval on

Status: **run 2026-10-09/10.** Four configurations, six public nodes,
300 s each, zero failures in all four.

**Headline:** approval via K-of-N **certified segments** costs essentially
nothing — **11,318 accepted ops/s** with a 4-of-6 cross-node committee
signing, against **11,169 ops/s** with no approval at all. Approval at the
**per-record** boundary instead costs **27×** (414 ops/s), and the local
append cache in the acknowledgement path costs a further **4.7×**.

---

## 0. What the original plan assumed, and why it changed

The planned record defined durability as a per-record peer acknowledgement:
"an admission returns only after K peers acknowledge the record." That was
built and measured (configuration C below) and it is the wrong boundary for
this architecture:

* it **deadlocks** a symmetric fleet — every node's shard workers block
  waiting for peers whose workers are blocked waiting back;
* once that was fixed it still cost **27×**, because every admit waits on a
  cross-node round trip;
* and it pays for Byzantine independence **twice**. The providers are
  trusted — roster-admitted, staked, slashable, enforced by
  `RosterResolver` / `StakeResolver` / `SlashResolver` — so a per-record
  independent ack is redundant with the committee's attestation over a
  segment root.

The owner's design, measured as configuration D, is: **a provider appends
to its own chain, and approval is the K-of-N committee signature over a
segment root.** One consensus round per segment (up to 1,024 records), not
one per record.

Both paths are implemented and tested. D is the default.

## 1. Environment

| | |
|---|---|
| Nodes | the six BENCH-004 nodes: `bk2`, `mk2`, `bk1`, `mist1`, `eug-2c`, `eul-4c` (x86_64; 7, 5, 2, 1, 2, 4 cores) |
| Client | one Mac (arm64, 8 cores), six concurrent `fleet-many` processes — BENCH-004's client and load shape |
| Build | `dense-wire` `chain-server`, sha256 `409db13b3cc305a3…`, verified by hash on every node |
| Load | 32 holder chains × 500 entries per batch, chains **continue** across batches |
| Duration | 300 s per configuration |
| Date | 2026-10-09 / 2026-10-10 |

Record construction (~32k Ed25519 signatures per batch) is **outside** the
submit timer and reported separately as `build_ms_total`. `accepted_per_s_sustained`
is accepted ÷ total wall clock, which is the figure comparable to
BENCH-004's 12,403; `accepted_per_s_in_submit` excludes client-side
construction.

## 2. The four configurations

| | local cache in ack path | approval |
|---|---|---|
| **A** | yes (`cache.jsonl`) | none |
| **B** | no | none — control |
| **C** | no | per-record K-of-N peer ack, K=2 of 5 |
| **D** | no | **certified segment, 4-of-6 committee** |

## 3. Results

### Fleet totals, 300 s, six nodes concurrent

| | A cache+no approval | B control | C per-record K=2 | **D segment 4-of-6** |
|---|---:|---:|---:|---:|
| accepted | 752,000 | 3,376,000 | 192,000 | **3,424,000** |
| failures | 0 | 0 | 0 | **0** |
| acceptance | 100% | 100% | 100% | **100%** |
| accepted/s sustained | 2,375 | 11,169 | 414 | **11,318** |
| accepted/s in-submit | 3,974 | 18,171 | 423 | **18,962** |

### Per node, configuration D (the default)

| Node | accepted | failures | acc/s sustained | acc/s in-submit | batch p50 | probe p50 | probe p99 |
|---|---:|---:|---:|---:|---:|---:|---:|
| bk1 | 496,000 | 0 | 1,643 | 3,032 | 4,635 ms | 148.4 ms | 434.3 ms |
| bk2 | 512,000 | 0 | 1,706 | 3,150 | 5,017 ms | 142.0 ms | 442.2 ms |
| eug-2c | 720,000 | 0 | 2,388 | 3,474 | 4,491 ms | 51.0 ms | 347.1 ms |
| eul-4c | 800,000 | 0 | 2,632 | 3,703 | 3,703 ms | 59.7 ms | 315.8 ms |
| mist1 | 400,000 | 0 | 1,302 | 2,218 | 6,289 ms | 172.4 ms | 435.8 ms |
| mk2 | 496,000 | 0 | 1,647 | 2,945 | 5,730 ms | 135.1 ms | 458.1 ms |
| **Fleet** | **3,424,000** | **0** | **11,318** | **18,962** | — | — | — |

`probe` is a **serial** single-record submit — send one, wait for its
reply — so it is one admit's latency including whatever cross-node work
that admit waited for. It is reported separately from `batch` latency
because a percentile over records inside a pipelined batch mostly measures
the queue.

### Committee activity during configuration D

| Node | signatures issued | finalizations completed | sign round trip p50 | p99 |
|---|---:|---:|---:|---:|
| bk2 | 4,338 | 196 | 11.3 ms | 888.5 ms |
| mk2 | 4,345 | 229 | 13.0 ms | 886.5 ms |
| bk1 | 4,333 | 241 | 12.1 ms | 895.4 ms |
| mist1 | 3,135 | 1,187 | 256.8 ms | 1,363.1 ms |
| eug-2c | 2,629 | 62 | 155.2 ms | 1,313.2 ms |
| eul-4c | 2,665 | 101 | 135.6 ms | 1,211.8 ms |
| **Total** | **21,445** | **2,016** | — | — |

Each node holds exactly one committee identity and runs one signer per
coordinator, so a segment proposed on node A is attested by keys held on
B…F's own machines. Every finalization observed carried `4/4` against a
required 4 — e.g.
`SEG_ACC_FIN 935f8289918d00ae…0079b 198 4/4`. A signer **rebuilds the
segment locally and refuses to sign a root it cannot reproduce**, so a
signature is an attestation to inspected content, not a rubber stamp.

### Configuration C: replication verification

C is the only configuration that replicates individual records, and it
passed the planned record's verification criterion with margin. Eight
holder chains were sampled per node after the soak and compared across all
six nodes by the read-only `HEAD` command:

> `replication verify: 8 holder chains sampled across 6 nodes; the
> least-replicated sampled chain is held by 6 node(s) with an identical
> head`

Required K was 2; the measured floor was **6 of 6**. Per-peer counters
agree: `162.35.27.39 ack=32040 fail=0  153.75.247.152 ack=32040 fail=0
162.35.188.138 ack=32040 fail=0  187.7.68.137 ack=32040 fail=0
191.215.44.220 ack=32040 fail=0`.

The verifier is **not vacuous**: the same check against a fleet with
replication off reports `held by 1 node(s)`.

## 4. The two costs that were hiding in the acknowledgement path

### The local cache costs 52.8× and is not the durability mechanism

Same binary, same host, same load, one variable — `CHAIN_SERVER_CACHE`:

| | accepted/s | one-admit probe |
|---|---:|---:|
| cache ON | 300 | 10.0 ms |
| cache OFF | **15,830** | **0.197 ms** |

`ChainLog::append` blocks each record until a group-commit thread advances
its durability ticket. Because a shard worker appends its batch serially,
there is almost nothing to batch, so each record waits a full ~3 ms commit
cycle alone. By this stack's own law the local append log is a **cold-start
cache, not the source of truth** — so it must not gate the acknowledgement.
It no longer does in configuration D.

### BENCH-004 is reproducible; there was no regression

The first measurement of this run produced 2,375 ops/s against BENCH-004's
12,403, which looked like a 5× regression. It was not. With the cache out
of the acknowledgement path the fleet returns **11,169 ops/s** — BENCH-004
within 10%. An older binary still running as a canary on the same node
measured 440 ops/s with the cache and so does not explain the gap either.
BENCH-004 stands.

## 5. What this does and does not establish

**Establishes.** Six public nodes sustained 3,424,000 accepted signed
operations in 300 s with a live 4-of-6 cross-node committee signing
segment roots, zero failures, 100% acceptance — and the committee costs
within measurement noise of no approval at all. Per-record K-of-N
replication also works, reaches 6-of-6 held copies, and costs 27×.

**Does not establish.**

1. **Finality lags admission in this configuration.** The proposer emits at
   most one segment per second of up to 1,024 lines, so a node can propose
   at most ~1,024 lines/s — about 6,100/s fleet-wide — against 11,318/s
   admitted. 2,016 segments finalized, and roughly 56% of proposed roots
   reached quorum before being superseded. **A record being accepted in
   this run does not mean it was in a finalized segment.** The fix is
   proposer configuration (`CHAIN_SERVER_SEGMENT_MAX_LINES`,
   `CHAIN_SERVER_SEGMENT_INTERVAL_MS`) and has not been measured.
2. **Segments are not broadcast between nodes in this run.** Each node
   proposes and finalizes its own; nothing ships a finalized segment to
   peers. Cross-node *attestation* is real; cross-node *application* is
   not in this measurement.
3. **Configuration C ran on an earlier binary** whose connection read
   buffer was 8 KiB, which capped a replication burst at ~16 records and
   so paid one WAN round trip per 16 records. The 414 ops/s is therefore a
   measurement of that buffer as much as of replication. The buffer is now
   1 MiB with a 1,024-record burst; C has **not** been re-measured.
4. **The client is shared.** Six processes on one Mac over one network
   origin, as in BENCH-004. A single node measured in isolation gave the
   same throughput as under six-way load, so the client was not the binding
   constraint here — but it is part of the result.
5. **No cumulative-ledger claim.** These are sustained accepted-operation
   rates, not stored-ledger growth.
6. **The per-connection command-rate cap was lifted** for the measurement
   (`CHAIN_SERVER_CMD_PER_SEC`). Its production default of 100/s would
   throttle the load itself.

## 6. Configuration, for reproduction

Per node, `/etc/defxn-chain-server.env`:

```
CHAIN_SERVER_CMD_PER_SEC=100000000
CHAIN_SERVER_MAX_CONN_PER_IP=512
CHAIN_SERVER_CACHE=
CHAIN_SERVER_SEGMENT_REQUIRED=4
CHAIN_SERVER_SEGMENT_SIGNERS=<six committee pubkeys, csv>
CHAIN_SERVER_COORD_SEED=<this node's seed>
CHAIN_SERVER_SEGMENT_INTERVAL_MS=1000
CHAIN_SERVER_SEGMENT_MAX_LINES=1024
```

Committee seeds are derived deterministically as
`sha256("BENCH-009-committee-<node>")` so a node always carries the same
identity. Each node runs one `seg-signer` per coordinator
(`SIGNER_POLL_MS=80`).

Load, per node: `FLEET_HOLDERS=32 FLEET_PER=500 FLEET_SECONDS=300
FLEET_PROBES=20 FLEET_RESULT_LINE=1`.

Raw per-node `FLEET_RESULT` lines for all four configurations are the
durable artifact for this record.

## 7. What changes now that this has landed

- `/stats` readiness: "K-of-N replication under load" moves to **measured**,
  qualified by §5.1 — approval is measured, and finality coverage is not
  yet complete.
- Whitepaper §10: the "not yet measured on the fleet" line can go, with
  §5.1 and §5.2 carried over as stated limits.
- `js/content/stats-highlights.js`: add 11,318 ops/s with 4-of-6 committee
  approval **next to** `chainFleetSoak`, never in place of it.
- New follow-on, not covered here: raise the proposer's ceiling so finality
  keeps pace with admission, then re-measure §5.1.
