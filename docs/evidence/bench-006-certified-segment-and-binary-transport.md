# BENCH-006 — certified segment application and binary transport

Measured 2026-10-08 on one local Apple M-series machine. These results are
local resolver measurements, not an eight-node fleet projection.

| Boundary | Corpus | Result |
|---|---:|---:|
| Full per-operation chain admission | 20,000 independent holders | 51,065 ops/s |
| Certified segment application | same 20,000 operations, 8 holder shards | 279,269 ops/s |
| Certified gain | same corpus and memory-only state | 5.47× |
| Binary segment transport + reconstruction | 1,024 operations, two libp2p peers | 812,268 effective ops/s |
| Compact segment size | 1,024 real-shaped 488-byte operations | 150.9 bytes/op |
| Reduction from former 976-byte `W<hex>` payload | same operation shape | 6.47× |

The certified path verifies the segment root and authorized K-of-N certificate
once, then partitions records across the existing deterministic holder workers.
Per-holder order is preserved. Replayed, skipped and wrong-parent segment
sequences are refused.

Traffic protocol v2 signs a binary envelope directly. It does not JSON-wrap or
hex-wrap the segment. Protocol-v1 dense manifests and segment-v1 frames remain
read-compatible.

The 812,268 result is transport and reconstruction, not accepted chain
throughput. The latest sustained public-fleet result remains BENCH-004 until the
authorized validator roster, group-commit segment emitter and eight-node rollout
exist and a sustained replicated run is recorded.
