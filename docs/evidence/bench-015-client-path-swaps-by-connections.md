# BENCH-015 — client-path swaps over the wire, by concurrent connections (2026-10-15)

**What this is.** Accepted swaps per second a client population gets through the real WebSocket wire into **one**
`chain-server`, as the number of concurrent connections grows. It is **not** the fleet figure on the stats page
(BENCH-013: in-process Rust resolution, no network, summed over ten nodes) and the two must not be compared or added.

**What it is not.** Swaps here are **unbacked**: a curve swap reads and debits no ledger (three filled buys left
`FXN_BALANCE` at 0; roadmap Track 27, `dense-wire/docs/design/swap-custody-and-native-chain-ledgers.md`). Real custody will
lower every number. Not finalized, not replicated (store quorum 0), loopback (no network latency), one node, one client IP.

## Method (measurement law)

| | |
|---|---|
| metric | accepted swaps/s = `CURVE_SWAP_OK` replies / wall seconds |
| mode | swaps **pre-signed outside the timed window**; one signing key per connection (nonces are per party); all connections trade one curve (fresh token per rep); 1 swap in flight per connection; production limiter **off** (`CHAIN_SERVER_CMD_PER_SEC=0`); per-IP cap raised (`CHAIN_SERVER_MAX_CONN_PER_IP=4096`) and WebSocket cap raised (`CHAIN_SERVER_MAX_WS_CONNECTIONS`) on the **scratch node only** |
| server | local release `chain-server`, ack finality `accepted`, no peers, store quorum 0, store file on the internal SSD (OS temp dir). Points up to 128 connections: binary built 2026-10-13; 256+ points: scratch build 2026-10-15 (sha256 in the JSON). Different binaries; each point's raw file names its own. |
| machine | Apple M2, 8 cores (4 performance + 4 efficiency), 8 GB, macOS 25.0.0, Node v24.9.0 |
| reps | 5 timed reps per point, 2 warm-ups discarded, points interleaved across reps; 1-24 connections: two identical runs, mean of run medians shown |
| acceptance | every swap in every rep was `CURVE_SWAP_OK` (the run aborts otherwise); 20,000 swaps/rep for 128+ connections, 3,000 for 1-24 |
| load | **not a quiet machine**: an unrelated Electron app held 1-2 cores; load average 4.5-7.9 at starts (see `load-*.txt`) |
| date | 2026-10-14/15 |

## Result (accepted swaps/s, median)

| connections | 1 | 2 | 4 | 8 | 16 | 24 | 128 | 256 | 700 | 1000 | 1500 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| swaps/s | 299 | 610 | 1,170 | 2,140 | 3,230 | 4,100 | 12,151 | 14,990 | 15,382 | 15,330 | 14,907 |

256-1500 connections: ranges 13,320-16,875 over the timed reps; server **~1.0 core of 8** busy, client ~0.45.

## Findings

1. **Near-linear to ~4 connections; flat at ~15,000/s from ~256 to 1,500.** The connection cap (512 hard-coded before this record) was
   not the limit: with it raised, 1,500 connections opened and ran.
2. **One connection gets ~300/s because the server waits, not computes.** A lone pre-signed swap takes ~3.06 ms; a read command on
   the same connection takes 0.07 ms; server CPU is ~0.2 ms. The rest is the store group-commit window (2 ms, `store.rs`
   `BATCH_WINDOW`) plus the swap coordinator window (250 µs).
3. **The ceiling is a single thread.** `swap_coord.rs` runs one coordinator thread; per cycle it groups up to 256 requests by chain,
   and for each chain verifies the batch and writes the curve (a store write that waits on the 2 ms window). At the plateau the
   server uses ~1.0 core, consistent with one thread doing ~65 µs of verify and bookkeeping per swap. This is read from the code and
   the core counts; it was not profiled.
4. **Knobs that did not help** (256 connections, one curve, one run each): `SWAP_COORD_MAX_BATCH` 64 -> ~7,300/s (worse), 256 (default) ->
   ~13,400/s, 1024 -> ~8,500/s (machine noise suspected), `SWAP_COORD_WINDOW_US=0` -> ~400/s (no coalescing). Defaults sit at or near the best.
   An earlier sweep of these was discarded: a shell bug passed unparseable values, so every setting ran at the default.
5. **More tokens made it slower, not faster.** 256 connections over 1 / 4 / 16 curves: ~15,100 / ~8,200 / ~2,500 swaps/s, because each
   chain in a cycle adds a serial store write.
6. **Where more would come from:** parallel resolver shards and more nodes (BENCH-013: 1 shard 43,665 -> 4 shards 157,206 swaps/s
   in-process), not more connections. Not built for the wire path; not measured here.

## Reproduce

`flux/flux-auth/scripts/swaps-transfers/bench-swap-conns.mjs` (`--conns`, `--tokens`, `--max-conn-per-ip`, `--max-ws`; point
`SWAPS_CHAIN_SERVER_BIN` at a build). Raw JSON/logs: `flux/flux-auth/docs/measurements/swaps-transfers/conns/`.
Full report: `flux/flux-auth/docs/swaps-transfers-ed25519-measurements.md`.
