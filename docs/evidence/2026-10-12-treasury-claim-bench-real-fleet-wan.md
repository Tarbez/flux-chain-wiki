# 2026-10-12 — treasury-claim-bench against two real fleet nodes over WAN

Follow-up to `2026-10-12-quorum-zero-is-a-contract-not-a-durability-bug.md`,
whose own "Addendum" ran `treasury-claim-bench` against two replica
processes on the **same local box** (1174-1357 claims/s). This run replaces
that with two real, geographically-separate production VPS nodes
(`flx-hstgr1` 185.224.139.18, `flx-hstgr2` 187.126.123.90 — both already
part of the `nodes.defxn.com` fleet, InterServer x86_64), reached over the
real public internet from this machine, not localhost.

## What was actually run

Neither node normally runs a `Store`-replicate HTTP listener — production
`defxn-chain-server` durability is peer-to-peer record replication
(`CHAIN_SERVER_PEERS`), not this `Store::open(path, replicas, quorum)`
mechanism (see `stores_from_env()` in `chain_server.rs`, unconfigured in
production today, matching the earlier evidence doc's finding that this
Store-replicate path currently only exercises its own `quorum: 0` contract
in production). To get a REAL WAN number without touching the live
chain-server or inventing new architecture, the existing `defxn-defi-rs`
root binary (`src/main.rs`, which already serves `POST /replicate` —
written for a separate, unrelated local perf comparison) was built and run
**temporarily** on both nodes, bound to a throwaway port (18891), writing
to a scratch path (`/root/bench-replica-data/log.jsonl`), with no further
replicas of its own. Firewall rules scoped to this machine's IP and the two
nodes' IPs each other, added and removed in the same session. Both
processes and their firewall rules were torn down after this measurement;
nothing was left running or changed on either node beyond the Rust/cc
toolchain used to build the listener (also removed).

`treasury-claim-bench` ran from this machine (`defxn-defi-rs/dense-wire`),
pointed at both nodes via `TREASURY_CLAIM_BENCH_STORE_REPLICAS`, quorum 2
(both must confirm). Measured round trip to `flx-hstgr1`: 43-49ms. 3
threads, 10-leg representative run, `TREASURY_CLAIM_BENCH_COUNT` 300-1500.

## Result

| Mode | `claims/s` |
|---|---|
| Durable, no pipeline (real WAN, quorum 2-of-2) | **17** |
| Durable, `DEFXN_DEFI_RS_PIPELINE=1` | **17** — no measurable gain here |
| `PIPELINE=1` + `DEFXN_DEFI_RS_FINALITY=accepted` | **1003** |

Representative single end-to-end run (1 DAO founding, 5 signers/quorum 3, 1
treasury-init, 1 ten-leg spend, 10 claims submitted serially): 1857-1896ms
durable (≈185ms/claim), 33ms with `accepted` finality.

## Correction (same session): the 185ms/claim figure was mis-attributed

The first version of this doc said that per-claim cost was "almost entirely
the WAN round-trip cost" (measured ping RTT to `flx-hstgr1`: 43-49ms). That
claim was never actually isolated — it compared a wall-clock number against
a *different* measurement (ICMP ping) without controlling for anything else
in between, which is exactly the "measure against the dominant cost, state
what was held constant" discipline this project's own law requires and
which this doc failed to follow on first write.

Checked afterward, prompted by a direct question about whether this was
another fsync-shaped mistake:

- **Not fsync.** `writer_loop`'s own comment is explicit: "no fsync
  involved either way — the write below is an ordinary buffered append."
  Verified directly in `store.rs`, not inferred.
- **Not a hidden fixed-cost bug in the bench/store path either.** Re-ran the
  identical `treasury-claim-bench` representative case against two replica
  listeners on **localhost** (near-zero network RTT, same binary, same
  code path, same batching window): **5.9ms/claim**, clean and fast, no
  mystery tax.
- **Found, not just suspected: the "43-49ms" RTT figure only covered
  `flx-hstgr1`.** `flx-hstgr2`'s own ping RTT from this machine is
  **156-162ms**, over 3x farther — never checked individually before the
  first version of this doc was written, which silently assumed both
  replicas were similarly close. The bench requires BOTH replicas to
  confirm (quorum 2-of-2), so every claim's real floor is bounded by the
  SLOWER of the two — `flx-hstgr2`, not `flx-hstgr1`.
- **That fully accounts for the number.** 157ms (RTT to the slow replica)
  + roughly one more partial round trip for the HTTP request/response
  itself + small local processing ≈ the observed 185ms/claim. Separately
  confirmed a bare, no-TLS, fresh-connection HTTP request to either node
  costs about 2x its own ping RTT (one round trip to open the TCP
  connection, one more to send the request and get the response) — a real,
  ordinary network cost, not a bug in this bench or in `ureq`.
- **What this means for the headline numbers above:** the 17 claims/s
  durable / 1003 claims/s accepted-finality figures are real, measured,
  reproducible numbers from a real run against real remote machines, and
  the slowdown is real network distance to one specific node — not fsync,
  not a fabricated number, and not an unexplained mystery. The only error
  was in the first version's causal claim ("almost entirely WAN RTT" quoting
  only the faster node's ping) rather than in the measurement itself.

## Why pipelining didn't help here, and why that's not a contradiction

The local-box addendum measured a modest real gain from `PIPELINE=1`
(1174→1312-1357/s) because many writes queued up fast enough, from enough
concurrent callers, for the backlog-coalescing writer thread to batch them
into fewer replica round trips. Here, three threads each submitting claims
one at a time and blocking on each one's own `done_rx` before issuing the
next rarely produce more than one pending write at a time per `Store` — there
is no backlog to coalesce. This is not a new finding, just the same
mechanism's precondition (a real backlog) failing to hold at this
concurrency level — a different, correctly-explained "no effect" than the
fsync-masking case the measurement-discipline law warns about.

`accepted` finality's ~60x jump is the real, honest lever here: it is not
skipping durability, it is moving the real (if not yet fully decomposed)
remote round trip off the caller's critical path — replication still
happens, the ack just doesn't wait on it — exactly as designed. Over a real
WAN link this lever matters far more than it did on localhost, which is the
whole point of re-measuring against a real fleet instead of extrapolating
from two processes on one box, independent of exactly how that round trip's
~185ms is composed.

## Honest limits of this run

- Still only 2 of the 6 `nodes.defxn.com` nodes, and a quorum of 2 (K=N
  here, not K-of-N with real slack) — not the fleet's own real
  `CHAIN_SERVER_REPLICATE_REQUIRE=3`-of-9 shape.
- The listener used is a separate, unrelated binary (`defxn-defi-rs`'s root
  `main.rs`) temporarily run for this measurement, not the production
  `defxn-chain-server` binary itself — this measures the `Store` replicate
  mechanism's real WAN cost in isolation, not `defxn-chain-server`'s actual
  production durability path (p2p peer replication), which remains
  unmeasured by this document.
- No sustained/soak run — single bursts of 300-1500 claims, not a
  `TREASURY_CLAIM_BENCH_WINDOW_MS` long-run figure.
