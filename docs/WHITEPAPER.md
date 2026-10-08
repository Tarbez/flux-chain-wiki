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
**42,637 finalized cross-shard transfers per second** sustained for ten
seconds across all nodes concurrently, zero errors. Adding one Mac
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
- **Replica applications are not finalized transfers.** We refuse to
  conflate them even though the quoted peer numbers often do. If a
  future reader of this paper quotes 1.7 M as a tps, they are quoting
  wrong.

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
`/tmp/fleet-tx-bench.sh` which fans the same bench at all six nodes
concurrently and sums.

For the certified-segment ceiling, run the `certified-node-bench`
binary against the nine-node parallel-session configuration.

For the grammar-only chain throughput, run
`cargo test bench_chain_throughput`.

Every row above is reproducible from these commands; dates on
`defxn.com/stats` name when each result was recorded. If a row
changes, re-run the command and re-record the date.
