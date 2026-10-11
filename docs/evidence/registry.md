# Evidence registry

This registry connects public claims to inspectable sources. Paths name the local source repository inspected during the 2026-09-30 audit; they are not public URLs.

## Record schema

Every capability, reference implementation, or benchmark record must contain:

- stable record ID and type (`CAP`, `REF`, or `BENCH`);
- claim and status;
- source repository, revision, and exact path;
- verification method and environment;
- observation date;
- artifact location or digest when applicable;
- limitations and next verification action.

## Source snapshot and method

These are local tracked revisions inspected on 2026-09-30, not public release identifiers. The inspection environment was macOS (`Darwin`) with Node.js `v24.9.0`. Source inspection alone establishes a command or policy contract, not a live deployment. The `flux-resolver` checkout also contained untracked design documents; the named source/test paths were inspected at the tracked revision below.

| Repository | Tracked revision | Method and durable local artifact |
| --- | --- | --- |
| `ark-miner-cli` | `ef685fbe5f83` | Read `package.json` and `README.md`; independent startup artifact pending. |
| `flux-network-cli` | `54f9a4f657a9` | Read `src/cli.js` and `src/cli-network.js`; live command output pending. |
| `flux-resolver` | `8f59718a953d` | Read `README.md` and run the focused source-model tests; [CAP-004 verification](cap-004-verification.md). |
| `flux-provider-runtime` | `5bcd1c05424b` | Read `README.md`; activation artifact pending. |

For each record below, `pending` means no verification artifact was established, not that the capability is absent. The source snapshot, method, and observation date above are part of the record keyed by its repository; record-specific limitations and next actions remain in the rows.

## Capability records

| ID | Claim | Status | Source inspected | Limitation / next action |
| --- | --- | --- | --- | --- |
| CAP-001 | Miner package exposes `flux-miner`; source start uses `npm start`; Node.js 22+ required. | Partial | `ark-miner-cli/package.json`, `ark-miner-cli/README.md` | Run on an independent host and attach startup/status artifacts. |
| CAP-002 | Network CLI contains identity, record, catalog, health, and topology commands. | Partial | `flux-network-cli/src/cli.js` | Record live command results from a named environment. |
| CAP-003 | `flux-network network create/list` exists and named-network scope is miner presence. | Partial | `flux-network-cli/src/cli.js`, `src/cli-network.js`, `CLAUDE.md` | Complete a multi-process or multi-host live run; preserve the non-security-boundary warning. |
| CAP-004 | Resolver source model defines addressed deterministic logic, claims, and publication/deployment distinction. | Live | `flux-resolver/src/reproducibleResolvers.mjs`, `src/resolverPublication.mjs` and [verification record](cap-004-verification.md) | Add CI artifact and independent deployment evidence; do not infer live provider capacity. |
| CAP-005 | Deployment requires an admitted active provider with fresh capacity; host installation remains manual. | Partial | `flux-resolver/README.md`, `flux-provider-runtime/README.md` | Demonstrate automatic admission, installation, activation, and fresh capacity. |
| CAP-006 | Intent-to-receipt lifecycle and agreement-fabric inspection contract exist. | Partial | `flux-resolver/README.md`, `ark-miner-cli/README.md` | Attach a complete live lifecycle and endpoint capture. |
| CAP-007 | Authority policy uses a seven-member roster and action-dependent thresholds. | Partial | `flux-provider-runtime/README.md` | Link exact active-policy mapping and activation record. |
| CAP-008 | Independent production activation has passed required gates. | Unverified | `flux-provider-runtime/README.md` describes the gates | Attach independent-host role readiness, hostile matrix, and signed soak. |
| CAP-009 | Canonical public repositories and packaged downloads are available. | Unverified | No durable public location established in this audit | Record owner-approved URLs and release artifacts. |

## Reference records

| ID | Reference | Status | Source inspected | Limitation / next action |
| --- | --- | --- | --- | --- |
| REF-001 | CLI miner implementation | Partial | `ark-miner-cli/package.json`, `README.md` | Public URL and independent run evidence unverified. |
| REF-002 | Network command implementation | Partial | `flux-network-cli/src/cli.js`, `src/cli-network.js` | Public URL and full live create flow unverified. |
| REF-003 | Resolver implementation model | Partial | `flux-resolver/README.md`, `src/reproducibleResolvers.mjs` | Public URL and active-provider deployment evidence unverified. |
| REF-004 | Provider runtime | Partial | `flux-provider-runtime/README.md` | Manual host-install boundary remains. |

## Benchmark records

| ID | Claim | Status | Evidence |
| --- | --- | --- | --- |
| BENCH-001 | Mesh value-object registry and agreement-fabric throughput | Partial | [Verification record](bench-001-verification.md) — real numbers for both systems, local and real-fleet; a 10,000-transfer real-fleet run of the directory registry did not complete (stalled, killed) and a fix was implemented and verified for the bulk-write path only, not the transfer-cycle path. |
| BENCH-002 | FXN registry speed audit: ranked, measured levers toward a 20-100x throughput target | Partial | [Speed audit](fxn-speed-audit-v0.md) — real 7,000-transfer fleet numbers (fleet-only and fleet+local-machine), isolated writer-count contention measurement (8.3x cost going from 2 to 6 concurrent writers), log-size scaling ruled out, crypto/JSON cost ruled out, real inter-node WireGuard RTT measured (2-84ms). The gap between the isolated writer-contention model and the real fleet's multi-second p50 is not yet fully explained; re-measurement against the shipped batching fix has not yet run. |
| BENCH-003 | Rust daemon rebuild (`defxn-defi-rs`, `agreement-fabric-rs`): real fleet throughput, single-quorum ceiling, aggregate multi-quorum capacity, and auto-join | Partial | [Investigation log](bench-003-rust-fleet-ceiling.md) — single-quorum ceiling ~2,900-3,300/s (hardware-bound, confirmed via per-process CPU profiling); aggregate fleet capacity across 4 concurrently-run quorums audited at 5,711-6,041/s, two of five runs over 6,000/s; real auto-join (join + gossip + constant-time shared-secret gate) deployed and verified on the production fleet, membership not yet persisted across restarts; close-transfer (single-round-trip) opt-in, a real win on 2 of 4 shards and a real regression on a third, not made the default. Section 14-15 add a prototype on the registered FLX agreement-lifecycle grammar (`flux-core`) over raw TCP: grammar layer ~2% of server CPU, signature verification ~55%; whole fleet concurrent 21,199/s, then 24,908/s with batch signature verification, 0 failures, accepted finality only, no certificate, not deployed as a service; batch verification is cofactored and not safe for multi-party validity agreement until every verifier runs one mode. |

| BENCH-004 | Chain prototype five-minute public-fleet soak | Partial | [Soak record](bench-004-chain-fleet-soak.md) — six public nodes accepted 3,760,000/3,760,000 signed operations over 303.152 seconds, 12,403 ops/s, zero failures. This is sustained accepted-operation throughput from one arm64 client, not cumulative growth or replica-certified durability. |
| BENCH-005 | Audit the path to one million accepted operations a second | Superseded in part | [Million-ops audit](bench-005-million-ops-audit.md) — the original 40,836 ops/s/global-mutex bottleneck is historical; BENCH-006 measures the implemented holder-sharded and certified path. One million accepted durable ops/s remains unverified. |
| BENCH-006 | Certified segment application and binary transport | Local, verified | [Current resolver evidence](bench-006-certified-segment-and-binary-transport.md) — 51,065 ops/s hot admission, 279,269 certified sharded application (5.47×), 812,268 effective compact-segment transport, and 150.9 bytes/op (6.47× below the former outer-hex payload). Local boundaries only; no eight-node projection. |
| BENCH-007 | Nine-node certified resolver fleet | Fleet, verified application boundary | [Nine-node certified resolver](bench-007-nine-node-certified-resolver.md) — the same 20,000-operation root and 3-of-4 certificate applied on eight VPS replicas plus local: 1,712,006 summed replica-applications/s, 552,583 synchronized replica-applications/s, and 61,398 all-replica logical ops/s; 180,000/180,000 applied, zero errors. Broadcast and durable segment commit excluded. |
| BENCH-008 | Six-node transfer bench · pre-Lever-B baseline | Historical | [Transfer bench record](bench-008-six-node-transfer-bench.md) — six public nodes, 10 s segmented cross-shard window each: 436,092 transfers finalized, 42,637 finalized transfers/s, 170,553 logical ops/s, 682,213 replica applications/s, zero errors. Each node benchmarked itself in-process. Superseded by BENCH-011 under Lever A+B+C on the full 10-node fleet. |
| BENCH-011 | Ten-node transfer bench · Lever A+B+C · current headline | Partial | [Ten-node Lever A+B+C record](bench-011-ten-node-lever-abc.md) — all 10 flx-* nodes, 10 s mixed-topology segmented-v3 window each: 852,152 transfers finalized, **82,863 finalized tps**, 160,532 logical ops/s, 642,128 replica apps/s, zero errors. With one Mac: 108,362 tps combined. Lever A (same-shard atomic) + Lever B (2-op cross-shard) + Lever C (grammar re-parse skip + FxHash). Also documents Lever D (mimalloc, reverted) and Lever F (pipelined segments, reverted) as negative results. Raw JSON files and dense-wire source revision still to be attached. |
| BENCH-013 | Every operation in its own unit | Local, verified | [Operation matrix](bench-013-operation-matrix.md) — median of 5 reps, warm-up discarded, one machine, no network in any row. **Transfer same-shard atomic 13,476 transfers/s; transfer cross-shard 6,799 transfers/s; transfer batched (1,024/root) 362,776 records/s; stake lock 13,492 stakes/s; swap one-per-batch 15,738 swaps/s; swap batched auction 46,178 swaps/s; replica store 496,278 signed results/s per replica.** `transfers/s` is the correct unit for a transfer; rows are NOT comparable across units because they count different work. **Replaces the fabricated 642,128 "replica applications/s"** (logical ops x 4, never run) with the real quantity it stood for: measured per-replica storage. Not built, named rather than reported as zero: split payment, batched split payment, lending position, liquidation. Refuses any multiplication by node or replica count. |
| BENCH-012 | FLX DeFi as signed resolution (not a chain) | Fleet, verified | [Signed-resolution record](bench-012-defi-shard-signed-resolution.md) — **15,360 swaps in 60 batches, 256 swaps/batch, broadcast to 10 live replicas, 60/60 audits passed.** Batch latency 13.874 ms (batched verify 10.403 ms = 75%, auction 2.173 ms, shard sign 0.040 ms = 0.3%). Signed result 180 bytes LZMA2-in-a-run (580 raw); replication 1,801 bytes to reach 10 replicas for 256 swaps, ~0.7 bytes/swap/replica. Audit 3 x Ed25519_verify. **100% of swaps matched internally at one clearing price and paid zero curve slippage.** Shard-only: 153.7 batches/s, 39,349 swaps/s resolved. Limits: broadcast is unpipelined and dominates end-to-end (449 ms vs 13.9 ms to resolve, capping ~2.2 batches/s serialised); pool held constant; custody, cross-pool routing and intent transport excluded; shard trusted within a batch with no slashing. **Retires accepted/s, TPS, replica apps/s and all chain comparisons for DeFi.** |
| BENCH-009 | Fleet soak with approval on | Fleet, verified | [Soak record](bench-009-replicated-fleet-soak.md) — six public nodes, 300 s per configuration, zero failures in all four. **11,318 accepted ops/s with a live 4-of-6 cross-node certified-segment committee**, against 11,169 ops/s with no approval: segment approval costs within measurement noise. Per-record K-of-N peer replication also works (every sampled chain held by 6 of 6 nodes with an identical head, K required 2) but costs 27x at 414 ops/s. Two costs found in the acknowledgement path: the local append cache is 52.8x (300 vs 15,830 ops/s, same binary and load) and is a cold-start cache rather than the durability mechanism; with it removed BENCH-004's 12,403 ops/s reproduces at 11,169, so there was no regression. Limits: finality lags admission (proposer capped near 6,100 lines/s fleet-wide vs 11,318 admitted; ~56% of proposed roots reached quorum, so acceptance here does not imply inclusion in a finalized segment), finalized segments are not broadcast between nodes, and the 414 figure was measured on an earlier 8 KiB read buffer and has not been re-measured. |

## Promotion rule

A record moves to `Live` only when its named verification path succeeds and the resulting artifact is durable enough for another operator to inspect. Source presence alone normally supports `Partial`, not a production claim.
