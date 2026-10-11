# Resolver audit

**Generated 2026-10-11 by `dense-wire/src/bin/resolver-audit`.** Every row
is derived from a measurement or marked as not built — no latency in this
file was typed by hand.

Signed manifests: [`registry/resolver-audit-manifests.flx`](registry/resolver-audit-manifests.flx).
Each is signed by the registry key `2b2d9eb54c302444…` over fields 0–11,
so a manifest can be re-verified later against the same identity.

**A resolver that does not publish its audit manifest is not registered.**

## Why not-built is not zero

A missing resolver is emitted as `NOT_BUILT`, never as `0`. Zero means
"measured, and scored nothing"; absent means "there is nothing here yet".
Reporting a missing resolver as zero would make missing work look like
slow work, and any average over the column would be a lie. There is
deliberately no average in this file.

Count: **20 resolvers — 6 measured, 14 not built.**

## Measured

| Resolver | P | Parties | Verify | Resolve | Sign | Replication | Audit |
|---|---|---:|---:|---:|---:|---|---|
| **DeFi Swap AMM** | P0 | 2 | 0.0313ms | 0.0070ms | 0.0260ms | 180 bytes x peers | 3 signatures |
| **Identity Name Ownership** | P0 | 1 | 0.0011ms | 0.0011ms | NOT_MEASURED_SIGNED_UPSTREAM | UNMEASURED x peers | 1 signature |
| **Device Enrollment And Revocation** | P0 | 1 | 0.0579ms | 0.0579ms | NOT_MEASURED_SIGNED_UPSTREAM | UNMEASURED x peers | 1 signature |
| **Grammar Admission Floor** | P0 | 1 | 0.0025ms | 0.0025ms | NOT_BUILT | NOT APPLICABLE | 0 signatures |
| **Stake Position** | P1 | 1 | 0.1470ms | 0.1470ms | NOT_MEASURED_SIGNED_UPSTREAM | UNMEASURED x peers | 1 signature |
| **Traffic Gossip** | P0 | N | 1.2734ms | 1.2734ms | NOT_MEASURED_SIGNED_UPSTREAM | 985 bytes x peers | 2 signatures |

Latencies are **per resolution**, median of timed reps with warm-up
discarded. `NOT_MEASURED_SIGNED_UPSTREAM` means the party signed before
the resolver saw the record, so signing is not this resolver's cost.

### What the measured set says

* **DeFi-Swap-AMM** is the only resolver with all three latencies
  measured, and it is the canonical shape: two signers in, one signed
  result out. Verification is the dominant term at batch scale — 75% of a
  batch — while the shard's own signature is 0.3%.
* **Grammar-Admission-Floor** is the floor every other resolver sits on:
  shape only, no signature, so its sign latency is `NOT_BUILT` by
  definition rather than missing.
* **Stake-Position** is the one resolver that verifies a signature itself
  per record, and it is far slower than the resolvers that trust an
  upstream verification. Signature placement, not resolution logic, is
  what separates fast resolvers from slow ones.
* **Traffic-Gossip** verifies TWO signatures per resolution (both halves
  of the fork), not one, and is the slowest measured resolver as a
  result — consistent with Stake-Position's finding that per-record
  signature verification, not resolution logic, is what costs time. Its
  replication cost (985 bytes x peers) is a real wire-frame size, not a
  placeholder: one `GOSSIP\t<entry>\t<entry>\n` frame, measured, because
  the two conflicting entries it carries are bigger than any other
  resolver's payload.

## Not built

| Resolver | P | Parties | Input | Intended resolution |
|---|---|---:|---|---|
| Liquidity Add | P0 | 1 | 1 signed add intent | pool mint |
| Liquidity Remove | P0 | 1 | 1 signed remove intent | pool burn respecting lock |
| Lending | P1 | 2 | 2 signed loan intents | position creation |
| Borrowing | P1 | 2 | 2 signed borrow intents | collateral check |
| Liquidation | P1 | 1 | 1 signed liquidate intent | health check plus close |
| Governance Vote | P1 | 1 | 1 signed vote | tally plus threshold |
| Treasury Spend | P1 | N |  | multisig verification |
| Group Membership | P1 | 1 | 1 signed join or leave | roster update |
| Content Publish | P1 | 1 | 1 signed content | store plus index |
| Claim Sign Then Approve | P1 | 2 | 2 signed halves | verify both halves |
| Vault Encrypt Store | P1 | 1 | 1 signed store | encrypt plus pin |
| Search | P2 | 1 | 1 signed query |  |
| Geometric 6 Types | P2 | 1 | 1 signed query | compute |
| AI TLM | P2 | 1 | 1 signed query | grounding gate plus synthesis |

`Traffic-Gossip` moved out of this table on 2026-10-11: `Ledger::on_fraud`
is now wired to a real `Broadcaster` in
`chain_server::ShardedLedger::new_with_peers` (reusing the K-of-N
replication peer list), so a node that is gossiped a fork relays it to
its own peers, and the resolver is measured and signed above like any
other.

## Next, by priority

**P0, and the binding constraint:** pipeline the signed-result broadcast
as a per-pool feed. Resolution is 13.874 ms and broadcast is 449 ms
unpipelined, so nothing else in this table matters until that moves.

**P0:** Liquidity-Add and Liquidity-Remove — one signer each, pool mint
and burn, the burn respecting locks. These complete the swap resolver.

**P1:** the lending family, governance, and the remaining identity-shaped
resolvers. **P2:** search, geometric, AI/TLM.
