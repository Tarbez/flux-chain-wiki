# BENCH-013 · Every operation in its own unit

Measured 2026-10-10 on one Mac core set, `defi-operations-bench`, median
of 5 timed reps with 2 warm-ups discarded, spread printed.

**Why this record exists.** One headline number was being treated as "the
speed". Transfers, swaps, staking and replica storage are different
operations doing different amounts of work, and collapsing them hides
which one is slow. **TPS is the correct unit for a transfer** — what was
wrong was TPS detached from transfers, used as a universal figure or
applied to a swap.

## The matrix

| Operation | Rate | Unit | Per op | Spread |
|---|---:|---|---:|---:|
| Transfer, same-shard atomic | **13,476** | transfers/s | 0.074 ms | 1.02× |
| Transfer, cross-shard | **6,799** | transfers/s | 0.147 ms | 1.10× |
| Transfer, batched (1,024/root) | **362,776** | records/s | 0.003 ms | 1.02× |
| Stake lock | **13,492** | stakes/s | 0.074 ms | 1.16× |
| Swap, one per batch | **15,738** | swaps/s | 0.064 ms | 1.03× |
| Swap, batched auction | **46,178** | swaps/s | 0.022 ms | 1.01× |
| Replica store, per replica | **496,278** | signed results/s | 0.002 ms | 1.01× |
| **Swap, 8 shards in parallel** | **195,643** | swaps/s | 0.005 ms | 1.29× |

Excluded from every row: network, record construction. Additionally
excluded per row: replication (transfers, stake), root construction and
signing (batched transfers), broadcast, custody, cross-pool routing and
intent construction (swaps), network receive and disk (replica store).

## What each row says

**Transfers.** Same-shard atomic is one record per transfer; cross-shard
is two (send + receive), and comes in at roughly half the rate — 6,799
against 13,476. The ratio is the record count, which is the point: a
transfer's cost is how many records it takes.

**Batched transfers are 27× the unbatched rate** — 362,776 records/s
against 13,476 transfers/s — because one signature is verified per 1,024
records instead of per record. Note the unit changes to records/s: a
batch is not a transfer, and the two columns are not the same quantity.

**Staking** lands at 13,492/s, essentially the same as an atomic
transfer. Both are one signed record whose signature is verified
individually, which is the cost that dominates.

**Swaps.** One-per-batch is 15,738/s; the batched auction is **46,178/s,
2.9× faster**, because one signature-verify batch and one shard signature
cover the whole batch instead of each swap. The batched row also clears
every intent at one price, so matched flow pays zero curve slippage,
while the one-per-batch row pays full slippage with no counterparty.

**Replica store is the fastest operation in the system at 496,278/s**,
and it should be: a replica stores the signed result and does not verify,
execute or re-decide. Storing is cheap precisely because the authority
already happened upstream.

## Upgrading swaps: the lever that is not there, and the one that is

Two levers were measured rather than argued about.

**Batch size is not the lever.** Swept 64 → 4,096 swaps per batch:

| swaps/batch | swaps/s | verification share of batch |
|---:|---:|---:|
| 64 | 39,023 | 75.5% |
| 256 | 38,747 | 77.1% |
| 1,024 | 49,268 | 71.3% |
| 4,096 | 50,615 | 71.2% |

**A 64× increase in batch size bought 1.3×,** and signature verification
stayed at 71–77% of a batch throughout. Batched Ed25519 is near-linear in
signature count, so there is little left to amortise. Batching already
collapses the *shard's own* signature to one per batch, and that was
never the expensive part (0.3%).

**Why swaps cannot copy the transfer trick.** Batched transfers reach
362,776 records/s — 27× — because `apply_certified_segment` **skips
per-record signature verification entirely**: the shard already attested
at origin, so a replica re-verifying would be redoing the shard's work. A
resolver has no such luxury. **Checking the parties IS its job**, so a
swap is verification-bound by construction, not by implementation.

**Parallelism is the lever, and here is where it stops.** Pools are
independent, so verification is embarrassingly parallel across shards.
Swept 1 → 8 shards, each run rather than multiplied:

| shards | swaps/s | vs 1 shard | efficiency |
|---:|---:|---:|---:|
| 1 | 43,665 | 1.00× | 100% |
| 2 | 81,611 | 1.87× | **93% of linear** |
| 4 | 157,206 | 3.60× | **90% of linear** |
| 8 | 197,355 | 4.52× | 56% of linear |

**Scaling is near-linear to 4 shards and then falls off a cliff.** This
machine has 8 logical cores but 4 performance cores plus 4 efficiency
cores, and the knee sits exactly at the performance-core count. The 8-shard
row is not "parallelism running out" — it is efficiency cores doing
efficiency-core work on a verification-bound task.

**What that means for the route:** run one resolver shard per
*performance* core, and scale past that by adding **nodes**, not shards.
A shard beyond the performance-core count buys about half what the one
before it did.

A fleet figure is deliberately absent. Per-node scaling is measured here;
summing it across ten nodes would be the multiplication this record
refuses elsewhere, and it has not been run on the fleet.

## The fleet, measured — all ten nodes concurrently

Every node ran `defi-operations-bench` **at the same time**, with shards
set to its own core count. The totals below are a **sum of concurrent
measurements**, not a per-node figure multiplied by ten.

| node | cores | parallel swaps/s | 1-shard swaps/s | transfers/s | stores/s |
|---|---:|---:|---:|---:|---:|
| eul-4c | 4 | 127,960 | 59,028 | 13,828 | 1,453,429 |
| eug-2c | 2 | 109,197 | 60,703 | 14,752 | 1,585,196 |
| bk2 | 7 | 94,673 | 21,941 | 6,726 | 155,253 |
| hel1 | 8 | 88,482 | 12,243 | 2,924 | 306,930 |
| mk2 | 5 | 82,517 | 29,858 | 7,069 | 642,048 |
| ash1 | 2 | 44,851 | 32,601 | 8,906 | 833,332 |
| hel2 | 4 | 44,231 | 12,294 | 2,934 | 325,632 |
| sg1 | 2 | 26,404 | 23,101 | 5,959 | 571,210 |
| bk1 | 2 | 15,829 | 13,374 | 3,835 | 83,672 |
| mist1 | 1 | 9,488 | 9,697 | 2,962 | 88,290 |
| **FLEET** | **37** | **643,632** | **274,840** | **69,895** | **6,044,992** |

**643,632 swaps/s across ten nodes with parallel shards**, against
274,840 with one shard per node — a **2.34× fleet-wide gain** from
parallelism alone. 17,395 swaps/s per core.

Also measured on the same run: **69,895 transfers/s** and **6,044,992
signed-result stores/s** fleet-wide.

### What this says about the route

The per-node curve said scaling holds to the performance-core count. The
fleet confirms it with a twist worth seeing: **core count does not
predict the result.** `hel1` has 8 cores and reached 88,482; `eul-4c` has
4 and reached 127,960. `eug-2c` has 2 cores and beat `bk2`'s 7. Verifying
Ed25519 is single-core-speed work, so a few fast cores beat many slow
ones — which is the same finding the chain-era CPU attribution reached
from the other direction.

**So the route is: fast cores first, shard to the performance-core count,
then add nodes.** Buying wide-but-slow hardware does not help a
verification-bound resolver.

### What this fleet figure does not establish

1. **No network inside the timed window.** Each node drove its own shards
   in-process. This is the fleet's *resolution* capacity, not an
   end-to-end rate — getting results out is still 449 ms per batch
   unpipelined (BENCH-012), which caps delivery far below this.
2. **Nothing was replicated during the run.** The stores/s column is each
   node storing locally, measured independently.
3. **Shards were set to `nproc`,** which on these VPSes means logical
   cores. The per-node curve suggests some nodes would do better with
   fewer shards; that was not swept per node.

## The figure this replaces

A previously published **642,128 "replica applications/s" was arithmetic,
not a measurement** — logical operations × 4 replicas. No replica ran and
no record was stored to produce it.

The real quantity it was standing in for is the **replica store** row:
**496,278 signed results/s, per replica, measured.** The fabricated
number was in the same order of magnitude, which is exactly why it went
unchallenged.

## What the replica-store rate is useful for

At 0.002 ms per signed result, a replica is nowhere near being the
constraint, and that enables features rather than just headroom:

1. **One replica can back many shards.** At ~500k stores/s against a
   resolver producing 46k swaps/s in 180-byte batched results, a single
   replica can absorb the output of many resolver shards at once. Replica
   count is driven by durability and geography, not by throughput.
2. **Read-side services need no re-verification.** Explorers, indexers,
   audit services and analytics can all run off a replica's store, since
   the shard's signature is the truth and the store holds it verbatim.
3. **Catch-up is fast.** A replica that fell behind absorbs a backlog at
   ~500k/s, so a restart or a partition heals in the time it takes to
   transfer the bytes — the storing is not the slow part. The transfer is
   (see §below).
4. **Fan-out to clients is cheap.** A replica serving many subscribers
   spends its budget on transport, not on deciding anything.

## One multiplication this record refuses

A fleet of N replicas each storing the same signed result does N times
the work, but **no pipeline moves N × rate**, and that multiplication is
exactly how the 642,128 figure came to exist. This record reports
per-replica storage only. A fleet figure requires running the storers.

## Not built, named rather than reported as zero

**Split payment**, **batched split payment**, **lending position**,
**liquidation**. Zero would mean "measured, and scored nothing"; these
have not been built, which is a different and weaker claim.

## Limits

1. **No network in any row.** Every figure is in-process on one machine.
   The networked constraint is separate and known: broadcast of a signed
   result to 10 replicas is 449 ms unpipelined against 8.9 ms to resolve
   (BENCH-012), which caps a fleet near 2.2 batches/s regardless of
   anything in this table.
2. **One machine, one core set.** No fleet sum, and no node-count
   multiplication.
3. **No custody.** No row moves value.
4. **Swap rows hold the pool constant.** A drifting pool measures
   depletion rather than the resolver.
5. **Rows are not comparable across units.** A transfer rate and a swap
   rate count different work. Do not rank them against each other.
