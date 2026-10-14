# 2026-10-12 — devnet dry run: DAO founding through treasury claims, by hand

The plan's own end-to-end verification step 2 ("spin up a local devnet
chain-server, exercise the real wire sequence by hand") run for real,
against a genuinely separate, independently-started `chain-server`
process — not a `chain_server.rs` unit test's in-process fixture.

## What ran

```
CHAIN_SERVER_ADDR=127.0.0.1:19610 CHAIN_SERVER_WS_ADDR=127.0.0.1:19611 \
  ./target/release/chain-server &
TARGET_ADDR=127.0.0.1:19610 ./target/release/devnet-dao-treasury-dry-run
```

New binary: `src/bin/devnet_dao_treasury_dry_run.rs` (`devnet-dao-treasury-dry-run`),
sibling to the existing `devnet-seed-genesis`/`devnet-sign-segment`/
`devnet-seed-supporter` convenience binaries. Drives the exact sequence
`chain_server.rs`'s own
`treasury_claim_over_the_wire_pays_each_real_destination_their_own_leg` test
proves in-process, but over a real `TcpStream` to a real OS process: found a
DAO (`DAO_PROPOSE` → two independent `DAO_SIGN`s → `DAO_FOUND` admits),
bind its treasury (`TREASURY_INIT_PROPOSE` → sign → `DAO_TREASURY_INIT`
admits), mint a real FXN input, authorize a two-leg spend
(`TREASURY_SPEND_PROPOSE` → sign → `TREASURY_SPEND` admits), then have two
real destinations each claim their own leg (`TREASURY_CLAIM`), including the
idempotent-replay and forged-claim-refusal cases.

## Result

All 17 steps passed on the first clean run after fixing two bugs this dry
run itself caught (see below) — every `DAO_*`/`TREASURY_*` command, the
`KDAO1`/`KDAOTREAS1`/`KTSPEND1` admissions, both real claims (600 to one
destination, 400 to the other, matching the authorized split exactly), the
silent no-op replay, and the refused forged claim
(`WrongAmount { claimed: 600, authorized: 400 }` — Bob's own real refusal
reason, not a placeholder).

## What this dry run itself caught

Writing a standalone driver (rather than only ever running the existing
in-process tests) surfaced two bugs in the driver, not the server — exactly
the value of doing this by hand against a real process instead of trusting
the test suite's own fixtures alone:

1. First attempt passed `pos=1` for the `DAO_TREASURY_INIT` record instead
   of `pos=0` — the treasury-init submitter is a FRESH identity, so its own
   first record is position 0, not a continuation of the founding
   submitter's chain. Refused as `chain-break` ("expected pos 1 with prev
   `<found_cid>`") — the real server correctly refusing a malformed
   position, not a server defect.
2. Second attempt reused the SAME submitter identity for both `DAO_FOUND`
   and `DAO_TREASURY_INIT`. That identity already held a position-0 record
   (`DAO_FOUND` itself); submitting a second, different position-0 record
   was refused as `equivocation` ("fork at pos 0 vs existing `<found_cid>`")
   — again the real chain-break/fork-detection logic doing exactly its job
   against a genuine mistake, not a fixture quirk.

Both are the kind of position-sequencing error that is easy to get wrong
when hand-assembling a multi-identity ceremony and that a real server
correctly refuses rather than silently accepting — confirming the
`chain-break`/`equivocation` refusal paths are live and correct outside the
test harness too, not just inside it.

## Honest limits

- Single local process, default in-memory `ShardedLedger` (no
  `CHAIN_SERVER_PEERS`, no real replication) — this proves the wire grammar
  and ceremony logic end to end, not fleet-scale durability (see the
  separate `2026-10-12-treasury-claim-bench-real-fleet-wan.md` for that).
- No sovereign chain or DAO has launched on production; this remains a
  devnet-only exercise, per your own explicit instruction to leave that
  step for later.
