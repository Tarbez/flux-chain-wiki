# BENCH-015 — client-path swaps over the wire, by concurrent connections (revised 2026-10-15)

**What this is.** Accepted swaps per second a client population gets through the real WebSocket wire into **one**
`chain-server`, as the number of concurrent connections grows. It is **not** the fleet figure on the stats page
(BENCH-013: in-process Rust resolution, no network, summed over ten nodes) and the two must not be compared or added.

**What it is not.** Swaps here are **unbacked**: a curve swap reads and debits no ledger (roadmap Track 27;
`dense-wire/docs/design/swap-custody-and-native-chain-ledgers.md`). Real custody will lower every number. Not finalized,
not replicated (store quorum 0), loopback (no network latency), one node, one client IP.

## What changed since the first version of this record

The first version measured the build **before** two changes landed, and its conclusions no longer hold:

1. **Every swap is now an entry on the signer's own chain** (`CurveSwapIntent` / `PoolSwapIntent` / `PoolPositionIntent` payloads: `J{pos}` must be the
   chain length, `C{prev}` the previous record's CID). A client therefore costs one extra `HEAD` read per swap, and a key that signs from two places at once
   is frozen by the node (see "Client position tracking").
2. **Coordinator pipelined, verify parallel, one commit per cycle, commit immediately when idle, `Store` removed** (the chain log is the durability path).

Previous build, for the record (superseded): 1 connection ~300/s; 256-1,500 connections ~15,000/s (flat, server ~1 core); a curve with
10,000 holders ~1,350/s; 256 connections over 16 tokens ~2,450/s.

## Method (measurement law)

| | |
|---|---|
| metric | accepted swaps/s = `CURVE_SWAP_OK` replies / wall seconds |
| mode | swaps **pre-signed outside the timed window**, each connection owning one key and its chain (position `i-1`, previous CID = sha256 of the previous record's text); all connections trade one curve (fresh token per rep) unless a row says otherwise; 1 swap in flight per connection; production limiter **off**; per-IP cap and WebSocket cap raised on the **scratch node only** (`CHAIN_SERVER_MAX_CONN_PER_IP=4096`, `CHAIN_SERVER_MAX_WS_CONNECTIONS=3000`) |
| server | local release `chain-server` built from the working tree of 2026-10-15 (sha256 in `chain-position-build/binary.txt`), ack finality `accepted`, no peers, store quorum 0 |
| machine | Apple M2, 8 cores (4 performance + 4 efficiency), 8 GB, macOS 25.0.0, Node v24.9.0 |
| reps | 5 timed reps per point, 2 warm-ups discarded, points interleaved across reps; 256 and 1,000 connections: three separate runs of the same binary |
| acceptance | every swap in every rep was `CURVE_SWAP_OK` (the run aborts otherwise); 20,000 swaps/rep for 256+ connections, 6,000 for 1-128 |
| load | **not a quiet machine**: other applications (a browser, an Electron app earlier in the session) used CPU; load average 3.8-10 across the runs |
| date | 2026-10-15 |

## Result (accepted swaps/s, median of the timed reps)

| connections | 1 | 4 | 24 | 128 | 256 | 1,000 |
|---|---|---|---|---|---|---|
| swaps/s | 4,425 | 5,345 | 12,197 | 18,397 | 26,754 | 31,009 |
| server cores busy | 0.7 | 0.8 | 1.7 | 2.4 | 3.3-4.2 | 3.9-4.6 |

256 connections, three runs: 24,985 / 26,754 / 33,981 (min..max over all reps 17,715-34,719). 1,000 connections: 28,612 / 31,009 / 34,104 (12,610-35,148).
**The spread between runs of one binary is machine load, not code.** Other axes, same node: 256 connections over 16 tokens ~16,500/s;
64 connections on a curve with 0 / 1,000 / 10,000 holders: ~23,400 / ~22,700 / ~20,000.

## Findings

1. **A lone client is 15x faster** (4,425 vs ~300): it no longer sits out two batching windows.
2. **Holder count and token count no longer collapse throughput** (previously 10,000 holders -> ~1,350/s and 16 tokens -> ~2,450/s).
3. **The ceiling moved from a thread to the machine.** At 1,000 connections the server uses about four of eight cores (and one in four of those are efficiency cores),
   with a client process using ~0.9 core; the run-to-run drift tracks other applications' load. More headroom is more cores or more nodes.
4. **Client position tracking costs a `HEAD` read per swap** (the safe default). It is free on loopback and a network round trip on a real network;
   an opt-in cross-tab broadcast removes it for single-device use (see below), at the risk described there.

## Client position tracking (`flux-launchpad/js/chain-heads.mjs`)

A signed record at an already-occupied chain position is **equivocation evidence** and the node **freezes that key's whole chain**
(`chain is frozen (fork evidence held)`), reproduced on the real node. So the launchpad's tracker reads `HEAD` fresh before every signature, takes a per-key
lock that spans tabs (Web Locks), and never retries after equivocation. A refused swap still lands on the chain and consumes a position. Opt-in fast
path: a `BroadcastChannel` shares each accepted head between tabs, with a validity window; it is unsafe if a second **device** writes the same key,
so it is off by default. Verified live (`verify-launchpad-chain.mjs`, 17 checks incl. the real session-delegate module) and by 21 unit tests.

## Reproduce

`flux/flux-auth/scripts/swaps-transfers/bench-swap-conns.mjs` (`--conns`, `--tokens`, `--max-conn-per-ip`, `--max-ws`; `SWAPS_CHAIN_SERVER_BIN` selects a build)
and `bench-swap-holders.mjs`. Raw: `flux/flux-auth/docs/measurements/swaps-transfers/chain-position-build/`. Report:
`flux/flux-auth/docs/swaps-transfers-ed25519-measurements.md`.

## Native-token transfers (Phase 2, added 2026-10-15)

Same node, machine and method; `NATIVE_SEND` accepted transfers/s, each transfer **signed at send time by one client process** (client signing is inside the timed window),
256 senders x 100 transfers of 1 unit, every sender funded by a genuine operator-signed credit; 3 timed reps + 1 warm-up per point; three full runs of one binary; every transfer
applied and every balance checked every rep.

| connections | 1 | 8 | 64 | 256 |
|---|---|---|---|---|
| run medians | 5,888 / 6,704 / 5,851 | 12,992 / 15,747 / 15,193 | 13,282 / 15,286 / 15,787 | 14,877 / 15,846 / 15,447 |
| server cores busy | 0.5 | 1.2-1.4 | 1.3-1.4 | 1.4-1.5 |

The ~15,000/s plateau is bounded by the single signing client (server ~1.4 of 8 cores). It is not a swap and swaps still move no balance. Two defects in the first versions were found by this
measurement and fixed (a ledger index that rebuilt on every out-of-order arrival, ~390/s; a benchmark that pre-assigned timestamps, making many connections ~10x slower than one); see
`flux/flux-auth/docs/swaps-transfers-ed25519-measurements.md`. New `NATIVE_SEND` timestamps must be within +-10 s of the node's clock.

## Transfers with the client split over processes (added 2026-10-15)
`flux-auth/scripts/swaps-transfers/bench-native-transfer.mjs --procs K`: one node, real chain-server binary, 64 connections, 256 senders x 100 transfers, signed at send time, median of 3 after one warm-up, Apple M2 8 cores, load average 4-12 (other apps and compiles running).
1 client process 16,049/s | 2: 24,508 | 4: 25,523 | 6: 25,844 (server ~2.9 of 8 cores). Server before vs after the ledger mid-order-insert fix, 4 client processes, run twice: 22,496 / 23,095 vs 26,261 / 26,013 (+13-15%, ranges do not overlap).
Past 2 processes the clients and the server share one saturated machine, so ~25,000/s is that machine's limit, not necessarily the server's. In-process (no network, pre-signed) the same fix took 8 concurrent callers from ~13-15k to ~25-26k/s; end to end the gain is smaller because real clients arrive close to timestamp order. Raw: `flux-auth/docs/measurements/swaps-transfers/phase3/native-transfer-procs*`.
