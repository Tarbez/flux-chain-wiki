# BENCH-007 — nine-node certified resolver fleet

Measured 2026-10-08 on eight VPS nodes plus one local Apple arm64 node.

Every node applied the same deterministic 20,000-operation segment with root
`1399e3219df2ec37e1b0c5d1e4fb37d420418a7ed9b8e799d01f7c9902731575`.
Each node verified one 3-of-4 Ed25519 certificate, partitioned the operations
by holder, and applied them through its long-lived shard workers.

| Node | Shards | Replica applications/s |
| --- | ---: | ---: |
| bk2 | 7 | 126,808 |
| mk2 | 5 | 236,893 |
| bk1 | 2 | 78,957 |
| mist1 | 1 | 61,398 |
| eug-2c | 2 | 348,464 |
| eul-4c | 4 | 398,441 |
| mk1 | 1 | 120,502 |
| ms3 | 1 | 64,147 |
| local | 8 | 276,395 |

- Combined resolver capacity: **1,712,006 replica-applications/s**.
- Synchronized replica work: **552,583 replica-applications/s**.
- All-nine logical throughput: **61,398 ops/s**, bounded by the slowest
  required replica.
- Applied: **180,000/180,000**, zero errors.

This measures certificate verification and state application. Segment
broadcast, peer discovery, network receipt, and durable segment commit were
not inside the timed interval.
