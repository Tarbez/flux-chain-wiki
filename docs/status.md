# Capability status

Observed: 2026-10-08. This matrix describes what the documentation audit could establish from the local source repositories plus the running fleet. It is not a release announcement.

## Current direction (2026-10-08)

The agreement-fabric certified-finality production path has been **retired** as the headline path. The headline is now the **per-identity signed chain** (`LEDGERENTRY`, Y=1A) with K-of-N peer replication of certified segments, measured at **82,863 finalized transfers/s** across the 10 flx-* mesh nodes (BENCH-011; Levers A+B+C: TransferAtomic for same-shard, TransferSend/Receive for cross-shard, hot-path cleanup). Combined with one local Mac: **108,362 finalized tps**. The agreement-fabric status rows below describe surfaces that are kept for compatibility but are no longer the direction.

## Status vocabulary

- `Live` — implemented and verified through a named path.
- `Partial` — implemented with a named missing boundary.
- `Not built` — no production capability exists.
- `Unverified` — the audit could not establish the current state.

Missing evidence is `Unverified`, not `Not built`.

| Capability | Status | Established boundary | Canonical evidence record |
| --- | --- | --- | --- |
| Miner daemon and local start command | Partial | Implemented in source; this audit did not perform a fresh independent-host run. | CAP-001 |
| `flux-miner` packaged command | Partial | Declared by the package; public binary distribution is unverified. | CAP-001 |
| Identity and record CLI commands | Partial | Command contracts exist in source; current public service availability is unverified. | CAP-002 |
| Named-network create/list | Partial | Command contract exists; scope is miner presence only and is not a security boundary. | CAP-003 |
| Resolver definition and deterministic claim model | Live | Implemented and documented in the resolver source model. | CAP-004 |
| Resolver publication | Partial | Addressable publication exists; publication does not prove deployed capacity. | CAP-004 |
| Resolver deployment | Partial | Requires an admitted active provider with fresh capacity; host installation remains manual. | CAP-005 |
| Agreement lifecycle | Partial | Intent through receipt is implemented; full production automation is not established. | CAP-006 |
| Agreement-fabric inspection endpoints | Retired | The agreement-fabric certified-finality path is no longer the headline direction; the per-identity signed chain replaces it. The old endpoints are kept read-only for compatibility. | CAP-006 |
| Per-identity signed chain + certified-segment replication | Live | 82,863 finalized tps across 10 flx-* nodes, 108,362 tps including Mac; zero errors across 852,152 transfers (BENCH-011, 2026-10-08). | BENCH-011 |
| Authority policy | Partial | Policy structure and thresholds exist; production activation is separate and unverified. | CAP-007 |
| Independent production activation | Unverified | Required readiness, hostile-matrix, and signed-soak artifacts are not registered here. | CAP-008 |
| Public repository URLs and packaged downloads | Unverified | No durable canonical public location was established in this audit. | CAP-009 |
| Public benchmark results | Live | Three-numbers rule applied (finalized / logical / replica apps). Fleet BENCH-011 2026-10-08: 82,863 finalized transfers/s across all 10 flx-* nodes under Lever A+B+C, zero errors over 852,152 finalized transfers, 160,532 logical ops/s, 642,128 replica applications/s. Reproducible via `transfer-bench TRANSFER_BENCH_MODE=segmented-v3`. | BENCH-011 |

Evidence record details are in the [registry](evidence/registry.md). Change a status only when that record is updated with a reproducible source or artifact.

