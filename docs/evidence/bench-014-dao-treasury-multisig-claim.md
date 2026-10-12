# BENCH-014 · Real N-of-M multisig DAO treasury, and a durability measurement correction

Measured 2026-10-12. Local, single-process library benchmark plus a real
two-replica durability re-run — not yet deployed to the production fleet.

## The model

Three new ledger-entry kinds in `dense-wire`, each gated by a real N-of-M
quorum (not a bare keypair): DAO founding (`KDAO1`), treasury binding
(`KDAOTREAS1`, requires the founding DAO's own quorum), and treasury spend
(`KTSPEND1`, authorizes a split payment across destinations, requires the
same quorum, conserves the total exactly). A destination claims their leg
by signing their own ordinary FXN `VALUEOBJECT` issuance citing the spend —
nobody but the destination's own key can bring their leg into existence;
the resolver only verifies, never fabricates a signature on anyone's
behalf.

Implementation: `dense-wire/src/multisig_coord.rs`, `dense-wire/src/dao.rs`,
`dense-wire/src/treasury.rs`, `dense-wire/src/payment_split.rs`,
`dense-wire/src/bin/treasury_claim_bench.rs`. 427 crate tests pass,
including 22 new ones covering founding below/at quorum, forged/duplicate/
tampered signatures, cross-DAO authority confusion, double-claims, and
wrong-amount claims.

## A durability measurement correction, documented alongside the numbers

The first benchmark run opened its `Store` with zero replicas
(`quorum: 0`) and reported 1928-2999 claims/s. That number reflects zero
real replication cost, by the store's own explicit contract for
`quorum: 0` — not a defect, and not a production-representative figure.
Re-run against two real, independently-verified replica processes (both
logs confirmed byte-identical afterward, not just a claimed quorum).
Full account, including a wrong first attempt to "fix" the store and the
65 tests it broke before being reverted:
`dense-wire/docs/evidence/2026-10-12-quorum-zero-is-a-contract-not-a-durability-bug.md`.

## Result — real, durability-respecting throughput

```
Durable, no pipeline:                1174-1348 claims/s
Durable, DEFXN_DEFI_RS_PIPELINE=1:   1312-1357 claims/s
PIPELINE=1 + FINALITY=accepted:      2882-3017 claims/s
```

`accepted` finality acknowledges once the local log has the write;
replication still happens, just off the caller's critical path — a named,
honest mode, not a durability-skipping trick. Representative end-to-end
(1 DAO founding, 5 signers/quorum 3, 1 treasury-init, 1 ten-leg spend, 10
claims): 26-69 ms total depending on mode.

Limits (as of the original measurement): single machine, two local
replicas, one process. No TCP wire command wired into `chain_server.rs`
yet. No sovereign chain or DAO has launched on production. Not yet
re-measured against the real fleet.

## Update 2026-10-12 — wired, devnet-verified, and re-measured against two real fleet nodes

`TREASURY_CLAIM` (the only piece still at resolver-level only — founding,
treasury binding, and spend were already wired) is now reachable over the
real TCP/WS wire protocol, same `chain_server.rs` dispatch every other
record rides. Three follow-on checks, all against real processes, none
against a test harness:

1. **Devnet dry run.** A new standalone binary
   (`devnet-dao-treasury-dry-run`) drove the full sequence — found, bind
   treasury, mint, authorize a two-leg spend, both destinations claim, a
   forged claim refused — over a real `TcpStream` against a genuinely
   separate, independently-started `chain-server` process. All steps
   passed; the dry run itself caught two position-sequencing bugs in the
   driver (not the server), both correctly refused by the real chain-break/
   equivocation logic. Full record:
   `docs/evidence/2026-10-12-devnet-dao-treasury-dry-run.md`.
2. **Real-fleet WAN re-measurement.** Re-ran `treasury-claim-bench`
   against two real, geographically-separate `nodes.defxn.com` fleet nodes
   (temporarily, torn down afterward — production's own durability path is
   peer replication, not this `Store` mechanism, so nothing live was
   touched). Durable: **17 claims/s** (quorum 2-of-2, bottlenecked on
   whichever replica is farther — one of the two nodes picked turned out to
   be ~157ms away, not ~45ms, which fully explains the number once checked;
   not a defect). `accepted` finality: **~1003 claims/s**. Full record,
   including a correction of an initial mis-attributed cause:
   `docs/evidence/2026-10-12-treasury-claim-bench-real-fleet-wan.md`.
3. **Witness-loop chain-id auto-discovery.** Unrelated to durability, but
   closed the same day: the mobile/browser witness loop (Rust/Android,
   Swift/iOS, JS reference) previously required a chain id hardcoded at
   construction — now it auto-discovers via the same `CHAIN_LIST` call the
   balance panel already used. 428 Rust + 12 Swift + 15 JS tests passing.

**Still open:** only 2-of-2 fleet nodes measured, not the real 3-of-9
shape; production's actual durability path (p2p peer replication) remains
unmeasured for this feature; no sovereign chain or DAO has launched on
production.
