# INFRA-001 · Platform resolver audit and benchmarks

Measured 2026-10-12, Mac mini (Apple M2, 8 GB RAM), Rust release build /
Node v24.9.0. Median of 5 timed reps, 2 warm-ups discarded, spread
printed. **Separate numbering track from the chain's own `BENCH-0XX`
records above — this covers internal platform/infrastructure systems
(the deployment and preview pipeline, repo storage, dev tooling), not the
FLX DeFi chain.** Nothing here is a chain metric and nothing here is
comparable to a swap, transfer, or stake rate.

## Why this record exists

The project's measurement discipline — a resolver is a function that
turns admitted records into a decision, and a system without one cannot
be "deployed" the way a chain resolver can — was applied to six
non-chain platform systems to ask the same two questions asked of every
chain resolver: does a real resolver exist, and if so, how fast is it.

## Resolver audit: six platform systems

| System | Resolver found? | Rate | Chain-deployable? |
|---|---|---:|---|
| flx-repo (repo storage) | yes — ref-chain accept/reject | 116,192–118,973 lines/s | no — unauthenticated, no consensus |
| remote-env (preview control plane) | yes — access decision | 12,106 decisions/s | not yet — stated gate, non-production |
| flx-db-studio (dev DB console) | yes — ACL evaluate | 1.8M–3.4M queries/s | no — client-local only |
| bundle-deploy | **none** | — | no — delegates to name-integrity |
| flux-code-host | **none of its own** | — | no — holds no signing authority |
| flx-blockstore | **none** | — | no — deliberately type-blind storage |

**Absent is not zero.** bundle-deploy, flux-code-host, and flx-blockstore
have no resolver by design — reported as absent, never averaged in as a
zero score. A missing resolver is a different, weaker claim than "measured
and scored nothing."

## Native resolver-deployment network: dispatch speed

The platform's own resolver-deployment protocol (manifest routing +
signature-verified admission, plus a worker-isolated execution runtime)
was benchmarked at its two real per-request hot paths — not its one-shot
publish/install/activate pipeline, which is administrative, not a
per-request cost.

| Path | Rate | Spread |
|---|---:|---:|
| Manifest routing (no I/O, no crypto) | 3,230,585 decisions/s | 1.95× |
| Signature-verified manifest fetch | 5,893 decisions/s | 2.72× |
| Worker dispatch, sequential | 52,265 round-trips/s | 1.90× |
| Worker dispatch, concurrent burst | 235,043 commands/s | 1.58× |

Routing is near-free; real ed25519 signature verification is the entire
cost of the gap between the two — the same shape every verified resolver
on this platform shows, chain or not.

## remote-env's access decision: concurrency-aware verification

remote-env's own access resolver was rebuilt to auto-switch between
inline and worker-pooled signature verification based on real-time
concurrent load, rather than forcing one fixed mode. Measured against
continuous (non-bursty) concurrent traffic:

| Concurrency | Fixed inline | Fixed pooled | Auto-switch |
|---:|---:|---:|---:|
| 1 | 4,363–4,672/s | 3,810–3,871/s | 4,491–4,510/s |
| 4 | — | 8,671–9,194/s | 10,447–10,801/s |
| 16 | — | 12,279–13,302/s | 14,485–18,238/s |
| 64 | — | 13,762–15,014/s | 14,780–17,536/s |

The auto-switching mode matches fixed-inline at concurrency 1 and
exceeds fixed-pooled at every higher concurrency level tested, with no
caller configuration required.

## Excluded from every row above

Network transport, record/manifest construction prior to the timed
region, and (for the deployment-network rows) the one-shot
publish/install/activate pipeline and the production economic/funded-
execution layer, which remains gated closed pending its own authority
ceremony and soak test — not benchmarked here because it is not yet a
live path.
