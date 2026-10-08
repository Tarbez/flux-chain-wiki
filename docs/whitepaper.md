# FXN — a chain made of grammar, with resolvers that own their own speed

Written 2026-10-08.

## Abstract

We built a chain that admits only one thing: records whose grammar is
well-formed, whose signature verifies, and whose position extends their
own holder's chain. The chain has no payload semantics; every semantic
domain (DeFi transfers, PVA books, NFT collections, DAO governance,
Stream media) is a **resolver** that interprets payload references on
top. This separation lets each resolver own its own throughput
measurement — the chain is a measured but domain-agnostic substrate,
and the headline tps of each resolver is the resolver's number, not
the chain's number.

Our six-node public mesh, running the DeFi transfer resolver, measured
**42,637 finalized cross-shard transfers per second**, each node
sustaining a ten-second window, zero errors (BENCH-008). Adding one Mac
locally pushes the total to **58,584 tps**. On a nine-node parallel
measurement with certified-segment application, the mesh delivered
**1,712,006 replica applications per second** against one 3-of-4
certificate. This paper explains the grammar math that makes those
numbers possible, how a resolver carries its own semantics on top, and
why the fleet number grows linearly as nodes join.

## 1. The chain is grammar, not meaning

A record admitted by the chain looks like this:

```
G<32+ hex key>-Y<type code>-V1-M<unix s>-H<hex-of-utf8 key>-J<pos>-C<prev CID>-C<payload CID>-S<ed25519 sig>
```

Every block begins with a single letter; the body of the block is on
the alphabet `[A-Za-z0-9~._:]`. The whole record is the signed covered
bytes; the signature at the end covers everything before `-S`.

The chain's resolver verifies five things and nothing else:

1. **Grammar** — split the record on `-`, run each letter's registered
   resolver (digit-check for `V`/`M`/`J`, hex for `G`/`S`, so on). ~3%
   of CPU on the hot path.
2. **Signature** — `verify_batch` across the burst, so the per-op
   signature cost falls to ~0.5 µs when the burst is large.
3. **Chain head** — look up the holder's current head CID, enforce
   that `C[0]` matches it and `J` matches `head.pos + 1`.
4. **Position collision** — `put_if_absent` on `(G, pos)` detects
   equivocation locally; the holder has produced evidence under their
   own key.
5. **Append** — push the record's bytes to K-of-N peers, then insert
   locally.

That's the whole chain. There is **no payload semantics in the chain
layer** — `C[1]`, `C[2]`, … are opaque content-addressed references
that the chain treats as strings.

## 2. The resolver layer

A **resolver** is a module that interprets payload references for its
own domain. The DeFi transfer resolver interprets `C[1]` as a
reservation marker and `C[2]` as the input CID; the Stream resolver
interprets `C[1]` as a stream CID and `C[2]` as an invite CID; the PVA
resolver interprets `C[1]` as a paper's title record and `C[2]` as its
abstract. The chain does not know and does not need to.

Each resolver has its own throughput. The chain's grammar-only admit
path on one Mac core is ~83,225 ops/s. The DeFi resolver's finalized
transfer rate on the same core is ~15,947 tps (four admitted ops per
transfer × ~4,000 transfers/s = ~16K-20K/s). The PVA resolver has no
published benchmark yet, which is listed honestly on
`defxn.com/resolvers` as `—`.

Three laws keep the separation honest:

- **Resolvers never share throughput numbers.** The DeFi tps is not
  the chain's tps; the Stream resolver's throughput is not the DeFi
  resolver's throughput.
- **The chain's throughput is always measured on grammar-only
  records.** We do not inflate the chain's number by counting
  resolver-interpreted ops as if the chain did the work.
- **Replica applications are reported separately from logical ops.**
  Replica apps is `logical × replicas_per_shard`; it describes the
  total work the committee does, not what a user submitted. See §5.

## 3. The grammar math

Why dense FLX grammar beats JSON for both wire size and parse cost.

### 3.1 Wire size

A typical AGREEMENT record carries 11 blocks (G, Y, V, M, H, J, C, C,
C, C, S) totalling ~674 bytes on the wire. The same record in JSON
would carry 11 field names (`"g":`, `"y":`, …), 11 pairs of quotes
around values, braces, commas, and two more layers of outer wrapping
if it's base64-encoded for safety — measured on fmtbench's 3,000-entry
corpus (project memory `flx_table_coded_not_hex.md`): **47.3% of the
JSON+base64 shape without the shared table, about 57% with it**. For a
chain that admits millions of records a day, every byte on the wire is
compute at the signature boundary.

### 3.2 Parse cost

A dense FLX record is a `split('-')` and a per-letter dispatch. One
real admission on bk2 (Xeon Gold 6230R, one core) measured:

- Split on the dash: **1,515 ns**
- + each block's resolver: **2,888 ns**
- Full admission checks: **5,028 ns**
- (Comparison) Decode every field into a tree: **13,279 ns**

The chain never decodes to a tree. The admit path's parse cost is
~2.6× below what a tree-decoder would cost even on the same input, and
the signature check is the whole mountain (~55% of CPU, see §4).

### 3.3 Signature math

Ed25519 single-op verify is ~160k/s on this silicon. `verify_batch`
amortises public-key setup across a batch; the measured curve
(dense-wire::chain::bench_batch_sig_curve):

| Batch size | Multiplier vs single-op |
|---:|---:|
| 1 | 0.76× |
| 2 | 1.16× |
| 6 | 1.46× |
| 12 | 2.16× |
| 30 | 1.77× |
| 60 | 1.93× |
| 96 | 2.12× |
| 192 | 2.25× |

The admit_burst path drains up to 64 pipelined records in one window
and runs one `verify_batch` across them. At that batch size, we buy
about 2× the per-op cost of single verify. The segmented path takes
this further: one certificate verify per 1,024 ops means the per-op
Ed25519 share falls to a tiny constant.

## 4. Where a server's CPU goes

Measured on bk2, one core, 20 s window, admit path with batch sig
checks on (bench-003 §7):

| Component | Share of CPU |
|---:|---|
| Signature checks | 54.7% |
| Storage: writer, queue, reads | 20.3% |
| Admission logic over stored records | 13.8% |
| Connection loop | 5.0% |
| sha256 of records | 3.5% |
| The grammar itself: split and resolvers | 2.1% |
| Everything else | 0.6% |

**The parser is 2% of the server's work.** Everything we do to make
the grammar cheaper is the wrong optimisation; everything we do to
amortise signatures across a bigger batch is the right one. That is
why segmented application (one cert per 1,024 ops) is the production
shape.

**What hardware matters.** Because signature checks dominate, the CPU
core is the whole speed story. One Ed25519 verify takes about 25 µs on
an AMD EPYC core and about 52 µs on the fleet's Intel Xeons, which is
why the EPYC nodes lead every per-node table. The protocol links no GPU
library and opens no GPU device: a rented RTX PRO 6000 box sat idle
throughout its benchmark (BENCH-003 §16). A validator needs plain CPU
cores, not an accelerator.

**Batching needs many chains.** One chain is strictly sequential:
position `n` cannot be checked until `n-1` is appended. A burst only
pays when it spans many holders, which is the natural production shape
(many identities, each short and sequential). With server-side burst
batching (`admit_burst` drains up to 64 pipelined records and runs one
`verify_batch`), one bk2 → mk2 connection carrying 128 interleaved
holders reached **22,559 admitted ops/s**, zero errors, with both sides
agreeing on every holder's head afterwards. The same link managed
14,963/s on a single chain before batching.

## 5. The three numbers (and why we always publish all three)

Design doc §1 insists on reporting these three together. We follow
that discipline on every page.

- **Finalized transfers / s.** The user-visible rate. For the DeFi
  resolver, a transfer is only counted when a FINALIZE record lands
  that references a real COMMIT that references a real ACCEPT that
  references a real PREPARE. On the six-node mesh today: **42,637 /s**.
- **Logical operations / s.** Every admitted ledger record. In the
  current cross-shard shape, four records per transfer. On the mesh:
  **170,553 ops/s**.
- **Replica applications / s.** Logical ops × replicas per shard. The
  total work the committee does. On the mesh at 4-replica committees:
  **682,213 ops/s**. On a nine-node certified-segment measurement with
  one 3-of-4 cert per 20,000-op segment: **1,712,006 /s**.

Collapsing these three into a single "TPS" number is the shortcut
every other chain takes. We don't, because the design doc says we
can't honestly, and because the three answer different questions:

- "How many transfers am I processing?" → finalized
- "How much work is the chain itself doing?" → logical ops
- "How much total compute does my committee burn?" → replica
  applications

Published competitor figures that say "1M+ TPS" almost always mean
replica applications. Solana's observed mainnet rate is ~400 finalized
transfers/s but its replica-applications number is in the millions.
Somnia's testnet claim of 1,050,000 is almost certainly a replica
figure. Our **1,712,006 replica applications** on nine nodes already
exceeds Somnia's claimed number, measured and reproducible.

## 6. Why the fleet number grows linearly

Each identity's chain lives on exactly one shard, and every shard runs
independently. Admission on shard A does not block admission on shard
B — not because of a batch-amortising committee, but because the
chains touched are literally disjoint. Adding a seventh node adds a
seventh shard, which adds a seventh independent admit pool.

Measured per-node sustained numbers from the six-node mesh (10 s
cross-shard segmented window, zero errors):

| Node | CPU | Cores | tps |
|---|---|---:|---:|
| eul-4c | AMD EPYC 9355P | 4 | 13,876 |
| bk2 | Xeon Gold 6230R | 7 | 9,210 |
| mk2 | AMD EPYC 7552 | 5 | 8,616 |
| eug-2c | AMD EPYC 9355P | 2 | 7,264 |
| bk1 | Xeon Gold 6230R | 2 | 2,346 |
| mist1 | Xeon Gold 6230R | 1 | 1,325 |
| **Sum** | | | **42,637** |

Add a seventh bk2-class node (same shape as current bk2) and the fleet
expects to see ~52,000 tps. Add a tenth and ~75,000. The ceiling is
the fleet size, not the architecture. The 1,712,006 replica-apps
number is already demonstrated on nine real replicas.

## 7. Durability by replication, not by disk sync

Durability in this stack is **K-of-N peer replication of
content-addressed CIDs**, not a `fsync` on local disk. The admit path
pushes the record's bytes to peers; the admit returns Ok only when K
peers have acknowledged. A node that cold-starts can rebuild its
chains by walking back from each chain's known head CID; the local
on-disk cache is a cold-start convenience, not the source of truth.

Measured recovery slack (dense-wire::chain::bench_replay):

- Fast replay (head-only sig verify + hash chain): **279,149 ops/s**
- Hot admission ceiling (fleet): **42,637 tps × 4 ops = 170,553 ops/s**
- Ratio: ~1.6× on logical ops; ~12× when the fleet is only reading
  back the per-chain head certificate instead of individual signatures

A peer that fell behind catches up faster than live traffic flows in,
which is the real durability story. We never need a disk-sync primitive
to make this work.

## 8. Equivocation is caught by the holder's own key

A holder who signs two different records at the same `(G, pos)` has
produced evidence of their own double-spend attempt. The chain checks
`put_if_absent` on the position before mutating memory; both signed
records are kept as fraud evidence. A third observer that sees the two
halves gossiped via `receive_fork_evidence(a, b)` freezes the chain
locally.

This replaces every mempool, consensus round, and fork-choice rule
with: the holder's own signatures prove the attempt. Attack suite
(29 chain tests + 5 cross-shard tests + 3 TCP tests + 3 stream
resolver tests) is 7-of-7 refused.

### 8.1 The attack suite, case by case

| Attack | What the chain does | Why |
|---|---|---|
| Replay: the same bytes twice | Idempotent: no second entry, no equivocation | Same bytes, same CID; the second call returns the first CID |
| Double-spend of one input | Refused by the payload check, which walks the holder's chain back to the input | Undoing an earlier spend would mean signing a fork |
| Two appends racing for one position | Exactly one wins; the other becomes `(G, pos) → (cidA, cidB)` fraud evidence | The per-holder lock serialises the race |
| Cross-chain confusion: B extends A's chain | Refused as `ChainBreak` on B's own chain | Chains are keyed by `G`, so a record always routes to its signer's chain |
| Wrong `prev`: forking from an older head | Refused as `ChainBreak`, naming the expected position and head | The head is the single source of truth |
| Tampered signature | Refused as `BadSignature` | Ed25519 under `G`; batch mode is not used on this path |
| Equivocation: two records at one `(G, pos)` | Second refused; the pair is kept as fraud evidence | Both carry the holder's own signature |

The one ordered operation in the system is `put_if_absent` on
`(G, pos)`, and it is ordered **per holder**: one lock per chain, no
cross-holder lock, nothing global to wait on.

### 8.2 No pending pool, so nothing to front-run

Front-running and sandwiching need a public queue of pending
transactions that someone can reorder before they settle. There is no
such queue here. A transfer is a conversation between two holders, each
appending to their own chain; the records become visible only after both
appends exist. MEV is not prevented by a rule; there is nothing for it
to act on.

The same structure limits who sees what. A holder's chain is visible to
the holder, to their counterparties, and to the watchers they publish
their head to, not to the whole network. There is no global tape to
index.

### 8.3 What a ledger entry can say

`LEDGERENTRY` (type code `1A`) carries one new letter, `J`, the chain
position. Its meaning comes from what `C[1+]` references, using types
the grammar already registers:

| Entry | References | Rule the resolver adds |
|---|---|---|
| Spend | a `CONSUMEDMARKER` | the holder's chain must prove it owns the input, with no earlier spend |
| Receive | the counterparty's `AGREEMENT` | its second signature must cover this entry's position (the join between two chains) |
| Issue | a `VALUEOBJECT` at sequence `I0` | `G` must be in the current issuance roster |
| Freeze | a `CELLEQUIVOCATION` built from two conflicting entries | both conflicting signatures must verify; that chain is frozen from that position |

A receive entry is also the receipt step the agreement lifecycle long
lacked; it now has a natural home on the payee's chain. The full design
is `docs/finance-ledger-design.md`; /stats/ledger shows a real five-entry
chain with valid signatures.

## 9. The resolver surface we expose to builders

A new resolver author declares three things:

1. **Grammar hooks.** Which `Y` code and which `C[i]` slots the
   resolver claims. These are registered in
   `flux-spec/registry/manifest-types.json`.
2. **Resolver logic.** A module (Rust crate or Node package) that
   interprets payload references and refuses invalid ones. Grammar
   admission is already handled by the chain.
3. **Measured throughput.** Each resolver reports its own number on
   `defxn.com/resolvers`, with its source and date. No resolver's
   throughput is merged into another's.

The Stream resolver (status: draft, `stream-cli`) is the newest
example: its records are dense FLX text with kind codes `STRMOPEN`,
`STRMINVT`, `STRMREVK`, `STRMCLSE`; its sidecar speaks raw TCP line-
framed on `:19503`; its benchmark will be bounded by the chain layer's
metadata admit path once the chain-feeder lands.

## 10. What this paper does not prove

Honesty requires calling this out:

- **No independent security review.** 7-of-7 attacks are refused by
  our own tests. Nobody external has looked.
- **Six nodes is small.** Linear scaling is the architectural claim;
  seven or ten or a hundred nodes have not been measured.
- **The DeFi resolver is a prototype.** No bridge to a public token
  economy; no production-grade issuance roster. See the DeFi row on
  `defxn.com/resolvers` for the open items.
- **Replication under load is not yet measured on the fleet.** §7
  describes K-of-N peer replication, and it is implemented and tested.
  The 303-second fleet soak (12,403 ops/s) ran with the local cache, not
  K-of-N acknowledgement; that run still has to be repeated with
  replication on (planned as BENCH-009).
- **The soak is five minutes.** No 30-minute or longer soak has run
  across the full mesh, and every client so far was operator-driven,
  not public traffic.
- **Replica applications are not finalized transfers.** We refuse to
  conflate them even though the quoted peer numbers often do. If a
  future reader of this paper quotes 1.7 M as a tps, they are quoting
  wrong.

## 11. Decisions still owed

The prototype implements the mechanisms below; what remains is policy,
and each is a choice for the owners rather than an engineering task.

- **Who may issue.** Issue entries are checked against an issuance
  roster (`IssuancePolicy::Roster`). Who is on it at genesis, and how it
  changes, is a monetary decision: a single genesis key, a fixed roster,
  or the registered authority-policy ceremony.
- **When a holder publishes their head.** A fork is only caught by
  someone who sees both halves. Heads and fork evidence are gossiped
  (`receive_fork_evidence`, the automatic broadcaster), but the rule for
  *when* a holder must publish is not fixed. The minimum useful rule:
  publish the head after every receive, so no counterparty can be shown
  a stale head.
- **How counterparties find each other.** Out of scope for the chain;
  the intent mesh is the existing answer.
- **Whether chains replace authority cells.** Cells and per-holder
  chains solve the same ordering problem. The recommendation on record
  is that chains subsume cells, so the registry carries one mechanism,
  not two.

Already built and tested in the prototype: refund by the sender after a
receiver misses its deadline (`Payload::Refund`, `M ≥ D` enforced),
chain compaction by snapshot and prune, the issuance roster, and the
fork broadcaster.

## 12. Before mainnet

These gaps come from `docs/mainnet-readiness.md`. That inventory was
written for the earlier fabric deployment, but the operational gaps
apply to the chain unchanged:

| Gap | State |
|---|---|
| A devnet on separate hosts, keys and domain, so experiments never share machines with production | Not built. A benchmark once took production down for 19 minutes. |
| Membership admission and removal beyond a shared secret | Partial. The 7-member authority ceremony exists in code but is not wired in. |
| Membership that survives a restart | Not built |
| TLS between clients and nodes, and between nodes | Not built. Records are signed, so tampering shows, but traffic is readable. |
| Every role under systemd, with restart and log capture | Partial |
| Monitoring and alerting | Partial. /monitor shows the hourly pulse; nothing alerts. |
| A deployment pipeline with rollback | Not built |
| Adversarial and chaos testing: partitions, crashes mid-append, conflicting signers | Not built beyond the attack suite in §8.1 |
| A spam and economic model; proposals cost nothing today | Not built |
| K-of-N replication measured under fleet load | Planned as BENCH-009 |
| Independent security review | Not started |

## Appendix A — How to re-run every number

Clone `defxn-defi-rs/dense-wire`:

```
cd defxn-defi-rs/dense-wire
cargo build --release --bin transfer-bench
TRANSFER_BENCH_MODE=segmented TRANSFER_BENCH_WINDOW_MS=10000 \
  TRANSFER_BENCH_THREADS=10 TRANSFER_BENCH_SHARDS=16 \
  TRANSFER_BENCH_TOPOLOGY=cross ./target/release/transfer-bench
```

For the fleet number, SSH to any flx-* node and run
`/tmp/fleet-tx-bench.sh`, which runs the same bench on all six nodes and
sums their results (BENCH-008 records the per-node output).

For the certified-segment ceiling, run the `certified-node-bench`
binary against the nine-node parallel-session configuration.

For the grammar-only chain throughput, run
`cargo test bench_chain_throughput`.

Every row above is reproducible from these commands; dates on
`defxn.com/stats` name when each result was recorded. If a row
changes, re-run the command and re-record the date.

## Appendix B — One real record, block by block

Every record is one line of text: blocks separated by `-`, each
starting with a registered letter. The sample transfer the cost
figures in §3 describe is five records (358 + 424 + 674 + 622 + 412
bytes, six signatures). Its AGREEMENT is 674 bytes in 11 blocks.

| Letter | Role | What its resolver checks |
|---|---|---|
| `G` | Signer | The signer's public key in hex; an unbroken run of at least 32 letters or digits. |
| `Y` | Kind | A registered code (`0G` intent, `0H` offer, `0I` agreement, `0J` fulfillment, `0L` value object, `1A` LEDGERENTRY). An unregistered code is refused at the door. |
| `V` | Version | Digits only. |
| `M` | Moment | When it was made, in unix seconds. |
| `D` | Deadline | When it stops being valid; an expired record is refused. |
| `I` | Sequence | How many hands this object has passed through; 0 means issued. |
| `R` | Object | The identity of this value object; no internal structure. |
| `H` | Holder | The hex of the holder's key text. |
| `J` | Position | The record's position on its holder's chain (LEDGERENTRY). |
| `T` | Amount | A whole number then its unit; no decimals, nothing to escape. |
| `C` | Reference | The SHA-256 id of another record. Order is meaningful. |
| `S` | Signature | Ed25519 over the exact text before this block; a second signature covers the first. |

The sample records live in `js/content/stats-sample.js`, and
`tests/stats-page.cjs` checks that every block uses a registered
letter and that the sizes and signature counts above hold.

## Appendix C — What made it fast

Measured on bk2's Xeon Gold 6230R, server pinned to four cores, client
on three others, accepted finality, 300 concurrent, three runs each
(BENCH-003 §14-15). Ranges are the lowest and highest run.

| Path | Runs (transfers/s) | Mean |
|---|---:|---:|
| HTTP + JSON, three requests | 1,718-2,082 | 1,926 |
| Registered grammar, one record per trip | 4,060-4,271 | 4,158 |
| Whole transfer in one write | 4,725-4,989 | 4,845 |
| + batch signature checks (burst) | 5,397-5,994 | 5,674 |
| + batch signature checks (pool, 1 thread) | 4,567-4,735 | 4,628 |
| **+ batch signature checks (pool, 2 threads)** | **5,793-6,081** | **5,891** |

Dropping HTTP and tree-building bought most of it. One verifier thread
made batching slower: batches passed 100 and that thread became the
bottleneck.

Where a server's CPU went, before and after (call-stack profiles):

| HTTP + JSON server | Share | Registered-grammar server | Share |
|---|---:|---|---:|
| HTTP layer and kernel network calls | 40.3% | Signature checks (6 per transfer) | 54.7% |
| Signatures and hashing | 20.8% | Storage: writer, queue, reads | 20.3% |
| Building, sorting and writing JSON | 15.1% | Admission logic over stored records | 13.8% |
| Storage | 11.1% | Connection loop | 5.0% |
| Everything else | 12.7% | sha256 of records | 3.5% |
| | | The grammar itself | 2.1% |
| | | Everything else | 0.6% |

Parse cost of one 674-byte AGREEMENT on one bk2 core: split on the dash
1,515 ns; with each block's resolver 2,888 ns; full admission checks
5,028 ns; decoding every field into a tree 13,279 ns; two signature
checks 113,432 ns. The signatures are the cost; the grammar is not.

**A caution that travels with batch checking.** Batch verification is
cofactored: it can accept a signature that checking one at a time
would reject, if the signer crafts it. That is safe within one chain,
but every party that must agree on validity has to run the same mode.

## Appendix D — The certified-segment run and compact transport

BENCH-007, 2026-10-08. One deterministic 20,000-operation segment with
one 3-of-4 certificate (root `1399e321…31575`) was applied concurrently
by eight VPS replicas plus one local node. Every node reported the same
root; zero errors.

| Node | Holder shards | Replica applications/s |
|---|---:|---:|
| eul-4c | 4 | 398,441 |
| eug-2c | 2 | 348,464 |
| local | 8 | 276,395 |
| mk2 | 5 | 236,893 |
| bk2 | 7 | 126,808 |
| mk1 | 1 | 120,502 |
| bk1 | 2 | 78,957 |
| ms3 | 1 | 64,147 |
| mist1 | 1 | 61,398 |
| **Summed** | | **1,712,006** |

- **All-replica logical rate: 61,398 ops/s**, bounded by the slowest
  replica, because all nine must finish the same segment.
- **Synchronized replica work: 552,583/s**, the 180,000 applications
  divided by the slowest completion time.

How the certified path works: each replica verifies the segment root
and its K-of-N certificate **once**, then splits the operations by
holder across its long-lived shard workers. Order within each holder is
preserved, and a segment that is replayed, skips a sequence number, or
names the wrong parent segment is refused.

**Not inside the timed interval:** broadcasting the segment, peer
discovery, network receipt, and durable commit of the segment. The
figure is certificate verification plus state application, nothing
more.

Segments travel in a signed binary envelope (traffic protocol v2),
signed directly rather than wrapped in JSON or hex. Version-1 frames
remain readable.

Local measurements from the same implementation (BENCH-006), never
multiplied into a fleet projection:

| Measurement | Result |
|---|---:|
| Hot chain admission, full per-operation verification | 51,065 ops/s |
| Certified holder-sharded application (8 shards) | 279,269 ops/s (5.47×) |
| Compact segment transport, two peers, 1,024 ops per envelope | 812,268 ops/s |
| Binary segment wire size | 150.9 bytes/op (6.47× below 976) |

Transport throughput is not admission throughput, and summed replica
work is not finalized transfers; see §5.

## Appendix E — Every number and its source

| Number | Value | Run | Date |
|---|---:|---|---|
| Finalized transfers/s, 6-node mesh | 42,637 | `/tmp/fleet-tx-bench.sh`, 10 s per node, cross-shard segmented (BENCH-008) | 2026-10-08 |
| Logical operations/s, 6-node mesh | 170,553 | Same run; four records per transfer | 2026-10-08 |
| Replica applications/s, 6-node mesh | 682,213 | Same run; logical × 4 replicas per shard | 2026-10-08 |
| Finalized transfers/s, one Mac (M-series, 10 cores) | 15,947 | `transfer-bench`, same settings | 2026-10-08 |
| Sustained accepted records/s, 6 nodes, 303 s | 12,403 | Five-minute soak, one client, 3,760,000 accepted, 0 failures (BENCH-004) | 2026-10-08 |
| Grammar-only admit path, one Mac core | 83,225 ops/s | `cargo test bench_chain_throughput` | 2026-10-08 |
| Certified-segment replica applications, 9 nodes | 1,712,006 | `certified-node-bench` (BENCH-007) | 2026-10-08 |
| Fast replay | 279,149 ops/s | `dense-wire::chain::bench_replay` | 2026-10-08 |
| Attack suite | 7 of 7 refused | 29 chain + 5 cross-shard + 3 TCP + 3 stream tests | 2026-10-08 |
| PVA resolver, Stream resolver | not measured | No published benchmark yet | — |

## Appendix F — Retired paths, kept for history

Before the per-identity chain, the same fleet ran the **certified
agreement fabric**: quorums of validators issuing threshold
certificates. It is no longer the chosen path, and its numbers are not
comparable with the chain's.

| | Certified fabric | Grammar prototype (pre-chain) |
|---|---|---|
| What it measured | 4 quorums, 2 validators each | 4 servers, 6 clients |
| Finality | Accepted (certificate); durable measured separately | Accepted only |
| Throughput | 5,711-6,041/s accepted; 676-827/s durable per quorum | 24,908/s accepted (21,199 before batch checks) |
| Date | 2026-10-07 | 2026-10-07 |

The grammar-prototype fleet run moved 503,225 transfers in 20 s with
zero failures: eul-4c 11,358/s, bk2 7,823/s, mk2 3,439/s, bk1 2,288/s.

The full account of how the numbers moved, including the wrong turns
(a GPU detour, a refuted pipelining idea, a benchmark of the wrong
codec, and harness bugs that once took production down for 19
minutes), is in BENCH-003 and the site article *How we got fast, and
what we got wrong*.

