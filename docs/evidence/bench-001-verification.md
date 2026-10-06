# BENCH-001 throughput verification

Observed: 2026-10-05. This verifies real, reproduced throughput for TWO separate, unrelated
systems that both sign and move `fabricTransfer.mjs` value objects — they are not the same
capability and must not be quoted interchangeably:

1. **The mesh value-object/Credits directory registry** (`ark-miner-cli`'s `/directory/value-object*`
   HTTP routes, backed by `@deadark/communications`'s Autobase-backed `IdentityIndexStore`) — new
   this cycle, not previously benchmarked.
2. **The agreement-fabric authority-cell quorum protocol** (`flux-provider-runtime`'s
   `agreement-certifier` role + `defi-library`'s `fabricClient.mjs`) — an older, separate system,
   previously measured; re-verified locally here, with its most recent real-fleet numbers cited
   from their own prior verification record rather than re-run (see "What was not re-run" below).

Repositories were at **uncommitted working-tree state**, not a clean tracked revision — this
session's own in-progress edits (new HTTP routes, a new `IdentityIndexStore.putMany` batch
primitive) are part of what was measured. Tracked HEAD revisions, for reference only (do not
assume these describe what actually ran):

| Repository | Tracked HEAD | Uncommitted files at time of test |
| --- | --- | --- |
| `ark-miner-cli` | `8e54a073d3f8` | 9 |
| `defi-library` | `8b511d24bfdb` | 2 |
| `flux-provider-runtime` | `5bcd1c05424b` | 0 |
| `communications-library` | `2ffdf1fa6074` | uncommitted `putMany` addition |

Environment: macOS (`Darwin`), Node.js `v24.9.0`, Apple Silicon laptop, for every "local" number
below. "Real fleet" numbers are against the actual deployed InterServer VPS fleet
(`docs/VPS-FLEET.md`), reached over the real internet — a single core node (`flx-bk1`) for the
directory-registry numbers, SSH-tunnel ingress for both systems' fleet numbers.

## 1. Mesh value-object directory registry

Script: `defi-library/bench/directory-registry-network-bench.mjs` (new this cycle). Each
"transfer" is 3 real signed HTTP round trips (transfer-agreement, recipient-signed output,
fulfillment) against one real miner process — never a loopback/fake simulation.

| Target | Load shape | Result | Failures |
| --- | --- | --- | --- |
| Real fleet (`flx-bk1`, SSH tunnel) | 200 transfers, concurrency 25 | 21.73 tx/s | 0 |
| Real fleet (`flx-bk1`, SSH tunnel) | 300 transfers, concurrency 60 | 35.31 tx/s | 0 |
| Real fleet (`flx-bk1`, SSH tunnel) | 500 transfers, concurrency 70 | 23.49 tx/s | 0 |
| Real fleet (`flx-bk1`, SSH tunnel) | 400 transfers, concurrency 120 | 29.90 tx/s | 0 |
| Real fleet (`flx-bk1`, SSH tunnel) | **10,000 transfers, concurrency 70** | **did not complete — killed after sustained stall** | process hung, not a clean failure |
| Local miner (this Mac, same code) | 2,000 transfers, concurrency 70 | 93.44 tx/s | 0 |
| Local miner (this Mac, same code) | **10,000 transfers, concurrency 70** | 8.5 tx/s sustained average over the full run (started ~100 tx/s, degraded under load, one ~500s stall episode) | 10 of 10,000 (`unauthorized` — signed-challenge timestamps expired while requests queued behind the backlog) |

**Honest finding, not hidden:** light load (200–500 transfers) is fast and clean on both targets.
At 10,000 transfers, throughput degrades under sustained load on BOTH the real VPS and this Mac
— worse on the VPS (full stall, required killing the client) but present locally too (93 → ~20
→ 8.5 tx/s as the run progressed), so this is a real architectural characteristic of the
write path, not purely weak VPS hardware. Root cause: `IdentityIndexStore.put()`/`putIfAbsent()`
each independently call `base.update()` (an Autobase catch-up pass) — under high-concurrency bulk
writes this serializes and the per-call cost grows with backlog size. A secondary, compounding
failure mode was found: once the processing backlog exceeds the signed-request challenge's clock-
skew window, in-flight requests start failing as `unauthorized` rather than just slow.

**Fix implemented and verified this session**: `IdentityIndexStore.putMany()` (one `update()` call
per batch, not per item) + a new `POST /directory/value-objects-batch/:ownerKeyFingerprint` route.
Measured: seeding 10,000 genesis objects via the new batch route, locally, in 20 batches of 500 —
**277.47 objects/sec, zero failures**, vastly faster than the old per-item path at the same scale.
This fixes the *write* side of the bulk-load problem; it does not change the transfer-cycle (agreement
→ output → fulfillment) path, which still issues one call per step — that remains the next
scale-sensitive surface, unverified against 10,000 transfers post-fix.

**Known, disclosed limitation found during verification, not fixed**: the balance read
(`GET /directory/value-objects/:ownerKeyFingerprint`) silently caps at 500 live objects
(`IdentityIndexStore.scanPrefix`'s default `limit`) — an identity holding more than 500 unspent
value objects would see an undercounted balance, not an error. Flagged for a follow-up fix; not
corrected as part of this verification.

## 2. Agreement-fabric authority-cell quorum (the older "Flux chain" system)

Script: `flux-provider-runtime/bench/local-fabric-bench.mjs` for the local number (5 real
`ProviderRuntime` processes in one Node process, zero network — only validator-to-validator
traffic is real HTTP2 over loopback, same protocol code path as production). Real-fleet numbers
are cited from this system's own prior verification record
(`flux-provider-runtime/bench/FLUX_BENCHMARK_RESULTS_v1.md`, observed 2026-09-25 against the
same 5-6 node InterServer fleet, SSH-tunnel ingress, zero failures across all 12 measured
windows) rather than re-run here — see "What was not re-run" below for why.

| Target | Finality | Result | Failures |
| --- | --- | --- | --- |
| Local, zero-network (this Mac) | Full durable (3 attestations + durable commit-certificate + successor availability receipts) | **374.92 closures/sec** | 0 |
| Local, zero-network (this Mac) | Accepted (quorum-signed, no durable commit wait) | **891.67 closures/sec** | 0 |
| Real fleet (prior record, 2026-09-25) | Full durable, concurrency 75 | **28.75 closures/sec** (mean of 3×60s windows) | 0 |
| Real fleet (prior record, 2026-09-25) | Full durable, concurrency 20 | 8.57 closures/sec | 0 |
| Real fleet (prior record, 2026-09-25) | Full durable, concurrency 5 | 2.04 closures/sec | 0 |
| Real fleet (prior record, 2026-09-25) | Full durable, concurrency 1 | 0.665 closures/sec | 0 |

This system does not show the same bulk-load collapse the directory registry does — its own prior
record documents p50 latency staying roughly flat across a 75x concurrency increase and only
sublinear (not collapsing) throughput scaling. It is a structurally different write path (a
quorum/attestation protocol across dedicated role processes, not a single shared Autobase log).

## What was not re-run, and why

The real-fleet agreement-fabric numbers were not re-measured today: the `agreement-certifier`
provider role is not currently running anywhere on the deployed fleet (no registry file or
bearer credential was found on `flx-bk1` at verification time) — standing it back up is a
deployment task, not a benchmark task, and was out of scope for this verification pass. The
2026-09-25 record is cited as-is, dated, from the same fleet, using the same protocol code this
repository still ships.

## Scope and limitations

- Both "real fleet" surfaces were reached through an SSH tunnel to one node, not through the
  public internet-facing listener — ingress latency differs from a real public client's.
- The directory-registry's 10,000-transfer real-fleet run never completed; its row above
  documents a failure to complete, not a throughput number, and should never be quoted as one.
- The batching fix's 277/s number is for genesis-issuance writes only (the seeding path), not
  for the 3-step transfer cycle itself, which is unfixed and unverified past 500 transfers.
- Neither system's real-fleet cross-node replication (sender and recipient reaching genuinely
  different physical nodes) has ever been measured — every number above, local or fleet, is
  effectively single-node for the directory registry, and the agreement-fabric numbers (both
  local and fleet) DO exercise real multi-member quorum traffic but not a geographically/
  physically distinct client-ingress split.
