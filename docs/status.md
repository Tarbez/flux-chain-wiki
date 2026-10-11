# Capability status

Observed: 2026-10-10. This matrix describes what the documentation audit could establish from the local source repositories plus the running fleet. It is not a release announcement.

## Current direction (2026-10-08)

The direction is **signed resolution**, and it is the only one:

1. **Two parties sign** their intent (Block 9 each).
2. **A resolver shard resolves** — verify signatures (batched) → check
   nonces → batch auction → AMM math on the residual.
3. **The shard signs the result** (Block 9). **This signature IS the truth.**
4. **Replicas store** the signed result. No re-verification, no re-execution.
5. **Anyone audits** by walking the signature chain.

The agreement-fabric path is retired and kept read-only for compatibility.

Measured (BENCH-012, 2026-10-10): **256 swaps per batch auction, 8.920 ms
batch latency, 180 bytes per signed result, 3 × Ed25519 verify to audit.**
Batched signature verification is 75% of a batch; the shard's own
signature is 0.3%. 100% of swaps matched internally at one clearing price
and paid zero curve slippage.

Vocabulary this project no longer uses: [deprecated.md](deprecated.md).
Capability overview: [overview.md](overview.md).
Why this shape: [resolver math](resolver-math.md). Per-resolver limits:
[resolver audit](resolver-audit.md).

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
| Agreement-fabric inspection endpoints | Retired | The agreement-fabric path is no longer the direction; signed resolution replaces it. The old endpoints are kept read-only for compatibility. | CAP-006 |
| Per-identity signed records | Live | Dense FLX records, one chain per identity, Ed25519 signed. The record is the unit a resolver reads and a replica stores. | BENCH-012 |
| Authority policy | Partial | Policy structure and thresholds exist; production activation is separate and unverified. | CAP-007 |
| Independent production activation | Unverified | Required readiness, hostile-matrix, and signed-soak artifacts are not registered here. | CAP-008 |
| Public repository URLs and packaged downloads | Unverified | No durable canonical public location was established in this audit. | CAP-009 |
| Public benchmark results | Live | BENCH-012, 2026-10-10: 15,360 swaps in 60 batches of 256, broadcast to 10 replicas, 60/60 audits passed. Reported as swaps per batch auction, batch latency, bytes per signed result and audit cost — never as a rate per second of anything. Historical figures from the retired direction are not quoted. | BENCH-012 |
| Local disk cache in the write path | Retired | Removed fleet-wide 2026-10-10. It cost 52.8x inside the acknowledgement path (300 vs 15,830 resolutions/s, same binary and load) and recovered nothing: `GENESIS_PREV` changed from a 17-character sentinel to 64 zeros, so every stored cache was unreplayable. Recovery here is p2p — peers holding the content-addressed CID, shard-signed results carried on a feed, CID pinning. Nodes that meet an unreplayable cache now quarantine it and start rather than crash-looping. | BENCH-009 §5 |
| A second copy of every signed result | Partial | A signed result is broadcast once per batch to replicas, which store it without re-verifying; 10 of 10 replicas reached in BENCH-012. The broadcast is **not pipelined** — 449 ms to reach 10 replicas against 8.920 ms to resolve — so it is the binding constraint on everything. | BENCH-012 |
| Peer-sync bootstrap for a node that starts empty | Not built | Nothing refills a node's chains from peers on startup. With no disk cache, a restarted node serves from empty until it re-acquires state. | — |

Evidence record details are in the [registry](evidence/registry.md). Change a status only when that record is updated with a reproducible source or artifact.

