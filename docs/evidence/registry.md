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

## Promotion rule

A record moves to `Live` only when its named verification path succeeds and the resulting artifact is durable enough for another operator to inspect. Source presence alone normally supports `Partial`, not a production claim.
