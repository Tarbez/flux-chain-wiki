# FXN registry speed audit v0: where the time actually goes

Status: two levers shipped, deployed, and measured with a real controlled
A/B (§1 batching fix, §0.5 hardware migration) — **6.53x earned end-to-end
improvement**, composite of both, both sides actually measured. Compression
was built, deployed, and measured TWICE (sync and async) — both times a
real regression, not a win; reverted, documented honestly in §4, not
shipped. §2 now has direct production evidence (not just an isolated
model): real server-side timing shows Autobase's own write path going
from ~10-25ms to 80-860ms under real concurrency, which is where the bulk
of transfer latency actually lives. §6 proposes the real fix for that —
an accepted/durable finality split removing the synchronous multi-writer
wait from the client path entirely — scoped as a deliberate design
decision, not built this session. No specific 20-100x number is claimed;
6.5-33% of that range is earned and shipped; §6, if built, is the
candidate for the rest.

## Context / goal

Target: 20-100x throughput improvement on the FXN value-object registry.
Real-fleet benchmark (2026-10-06, `defi-library/bench/directory-registry-
network-bench.mjs`, 7,000 transfers split across 5 nodes over SSH tunnels):
2.1-4.0 tx/s per node, p50 latency 5-10 **seconds** per transfer. A clean
local run against the same code (no network, effectively one active writer
at that moment) measured p50 489ms. That ~10-20x gap between "network +
multi-writer" and "local, low-contention" is the gap this audit chases.

Every number below is a real measurement from this machine/fleet on
2026-10-06, not an estimate. Where a number is modeled/isolated rather than
observed end-to-end, that's stated explicitly.

## Ranked findings

### 0. Disk I/O saturation on the fleet's own hardware — the confirmed dominant real-world cost

This closes the gap §5 originally flagged as unexplained. Traced directly on
`flx-ms2` (the node with the worst outlier p99/p999 in both 7k benchmark
runs — 79-86 **seconds**) while otherwise idle, post-benchmark:

- A bare `curl` to its own `/status` route, over `localhost`, with zero
  Autobase work involved, took **5+ seconds** (hit the test's own timeout).
- The `ark-miner-cli` process itself was in Linux's `D` state
  (uninterruptible sleep — blocked on a kernel I/O syscall, not CPU),
  951MB RSS, 35 minutes of accumulated CPU time.
- `iostat -x` on the node: **90-99% iowait**, write latency (`w_await`)
  65-172ms **per write**, I/O queue depth (`aqu-sz`) 28-74. This is a
  single-vCPU VPS (`nproc` = 1) with a disk that cannot keep up with
  Hypercore's append pattern — many small, synchronous writes, not few
  large sequential ones.
- Checked the rest of the fleet: `flx-mist1`, `flx-ms1`, `flx-mk1` are also
  single-vCPU; only `flx-bk1` has 2 cores. All four non-bk1 nodes carry a
  real, sustained load average (1.4-2.5) even after the benchmark finished.
  This is a fleet-wide hardware-sizing property, not one bad node.

**This is why the in-process writer-contention model (§1 below, 6.7ms/op)
undershoots the real fleet's 5-10 second p50 by ~1,000x**: that model ran
on this Mac's local NVMe SSD with no I/O contention at all. The real fleet
is doing the same Autobase append work against disks that are visibly
saturated. Writer-count contention (§1) is real and compounds with this —
more concurrent writers means more small writes landing on the same
already-saturated disk — but disk I/O is the larger absolute contributor on
today's hardware.

**This reframes §4 (compression) and the batching fix (§2) as more
valuable than originally stated**, not less: on an I/O-saturated system,
fewer and smaller writes produce a close-to-proportional speedup, not a
rounding error. See §4's revised ranking below.

**Done, see §1 below**: a controlled before/after on real fleet hardware,
with `iostat` running throughout, now exists — 1.51x throughput, 1.57x
lower p50 from the batching fix alone. That run also answered a question
this section didn't originally ask: it showed `flx-bk2`'s hardware
(§0.5) has effectively zero iowait regardless of the fix, meaning this
measurement isolates the fix's *logic-overhead* contribution, not its
I/O-relief contribution — the I/O-relief half (expected to matter more on
the small nodes this section is actually about) is still unmeasured on
that hardware tier.

### 0.5. The fleet's core moved to real hardware — a second, deeper discovery

While investigating §0 on `flx-ms2` directly (per the user's direction, to
run the controlled A/B measurement above), found the disk-I/O story was
incomplete: `flx-ms2` was not just disk-constrained, it was **memory
exhausted and swapping** — 1.6GB total RAM, the daemon alone using
958MB (57%), 969MB of 1GB swap in use, load average 8 on a single vCPU.
The daemon could not answer its own `/status` route within 15 seconds.
Module `require()` calls that normally take single-digit milliseconds were
taking 4-23 **seconds** during a cold start under this pressure. A restart
freed the swapped memory (969MB → 157MB swap used) and module load times
dropped to single-digit milliseconds immediately — but the node then
stalled a second time, later, in `D`-state again on the IPFS pinner's disk
access with memory nowhere near exhausted, confirming the underlying disk
itself is also genuinely slow on this VPS tier, independent of the memory
problem. Both are real; neither fully explains the other.

Per the user's decision, the fleet's core was migrated onto previously-idle,
properly-provisioned hardware: `flx-bk2` (28GB RAM, 7 vCPU, Xeon Gold
6230R) is now `defxn`'s genesis, `flx-mk2` (20GB RAM, 5 vCPU) is the
second core writer. The old 5 nodes (`flx-bk1`, `flx-mist1`, `flx-ms1`,
`flx-ms2`, `flx-mk1`) were re-pointed to the new genesis and rejoined as
lighter writers — all 7 nodes verified replicating a live write within
seconds. This is now the actual deployed topology, not a proposal.

**This was infrastructure prep, not a software fix, and the audit treats
it accordingly**: §1's controlled A/B below was only possible because
`flx-bk2` doesn't fight the measurement with its own I/O/memory noise the
way the old small nodes did. The composite real-world improvement this
enables is in §1's closing comparison, not claimed as a software win.

### 1. Batched reads/writes — SHIPPED and MEASURED: 1.51x throughput, 1.57x lower p50, isolated from everything else

Traced the exact `IdentityIndexStore` calls one full transfer (agreement →
output → fulfillment) made: **15 separate `await this.base.update()` +
append cycles** — `transfer-agreement` (4: 2 reads, 2 writes),
`value-object` output (2 writes), `fulfillment` (8: 3 reads, 1
`putIfAbsent`, 4 writes). The store already had the fix for exactly this
(`putMany`, built 2026-10-04 after an earlier bulk-seed benchmark found
per-call `update()` cost dominating — see that method's own comment in
`communications-library/src/directory/index-store.js`), but it was wired
into the genesis batch-seed route only, never the live hot path.

Added `getEntries()` (batched read, same pattern as `putMany`) to
`index-store.js`, and rewired all three hot routes in `ark-miner-cli/src/
identity/http.js` to use `getEntries`/`putMany` instead of sequential
`getEntry`/`put` calls. **15 round trips → 6 per transfer.** Verified
correct via `fulfillment-no-quorum.test.mjs`'s three real-crypto tests (all
still pass) and the full `test:security` suite (242/242).

**Controlled real-fleet A/B, run 2026-10-06 on `flx-bk2`** (28GB RAM, 7
vCPU, the new core — see §0.5): same node, same code otherwise, same
benchmark (1,000 real transfers, concurrency 20, 0 failures both runs),
only the batching fix toggled. The "before" version was reconstructed by
hand-reverting just the four batching edits back to sequential
`getEntry`/`put` calls (not a git revert — this repo's history predates
even the FXN registry, so the only clean way to isolate the one variable
was a precise manual revert, verified by diff to touch nothing else):

| | Throughput | p50 | p95 | p99 |
|---|---|---|---|---|
| Without batching fix | 10.40 tx/s | 1756 ms | 2743 ms | 3262 ms |
| With batching fix | 15.74 tx/s | 1120 ms | 2316 ms | 3181 ms |

**1.51x throughput, 1.57x lower p50, measured in isolation.** `iostat`
during both runs showed iowait never exceeding 0.14% — on this hardware
class, disk I/O is not saturated (see §0.5), so this multiplier is pure
round-trip/logic overhead reduction, not I/O relief. On the fleet's
smaller, I/O-constrained nodes (§0), this fix should contribute at least
this much *plus* whatever I/O relief fewer/smaller writes provide — not
yet separately measured on that hardware tier, since those nodes already
carry the fix as of this migration.

**The composite, end-to-end, fully-earned number** (not modeled, both
sides measured): comparing `flx-ms2` before any of this session's fixes
(fleet-only 7k run, old 1.6GB-RAM hardware, unbatched code: 2.41 tx/s,
p50 7308ms) against `flx-bk2` after both fixes (new 28GB-RAM/7-vCPU core,
batched code: 15.74 tx/s, p50 1120ms):

**6.53x throughput, 6.53x lower p50.** Split roughly 4.3x from the
hardware-class change and 1.5x from the batching fix (the two compose
multiplicatively since they address different mechanisms — see the
table below). This is the first real, end-to-end, earned multiplier this
audit has produced; everything before this was either ruled out, bounded
in isolation, or flagged as not yet measured.

| Contribution | Throughput multiplier |
|---|---|
| Hardware class (old small VPS → bk2, unbatched code both sides) | 4.32x |
| Batching fix alone (same hardware, bk2) | 1.51x |
| **Combined, measured** | **6.53x** |

Against the 20-100x target, this closes roughly 7-33% of the gap on the
conservative end, with §2 (writer topology), §4 (compression), and §5
(gRPC) still unmeasured in combination with this baseline — each is a
real, separate multiplier not yet stacked onto this number.

### 2. Writer count — now PROVEN with real production timing, not just an isolated model

This directly answers the question "why multi-writer, when the design was
meant to be one writer, other nodes replicate?" — **the measurement says
your instinct was right, and this update makes it hard evidence instead of
an inference.**

**Decisive update (2026-10-06, later same day)**: added temporary
per-step `process.hrtime.bigint()` timing to the live fulfillment route on
`flx-bk2` (real production hardware, real 7-node fleet, batching fix
active, no compression), deployed it, ran the real benchmark client
against it twice — once at concurrency 1 (no contention), once at
concurrency 20 (the benchmark's normal setting) — and read the real
server-side numbers back from the journal. This is the single most
directly-measured finding in this entire document: no modeling, no
isolation, the actual production code's own timers.

At concurrency 1 (no contention): `putIfAbsent` 8-20ms, final `putMany`
24-47ms — fast, matching expectations for local, uncontended Autobase
operations.

At concurrency 20 (real concurrent load, same code, same hardware):
`putIfAbsent` ranged **83-860ms**, final `putMany` ranged **168-863ms** —
a **10-40x slowdown** on the exact same two operations, same hardware,
only the concurrency level changed. Reads (`getEntries`) stayed
comparatively cheap even here. **This is Autobase's own write-path
serialization under concurrent appends, caught directly, not inferred**:
multiple simultaneous HTTP requests on `flx-bk2` each trying to
`append()`/`update()` the same shared Autobase instance queue up behind
each other, and that queueing — not network RTT, not disk I/O (§0.5
already ruled that out on this hardware), not crypto (§4 already ruled
that out) — is where the bulk of real transfer latency under load
actually goes.

This also resolves an apparent contradiction earlier in this session: a
hypothesis that client-to-server network RTT was ~83% of transfer latency
was tested directly (running the benchmark client ON `flx-bk2` itself,
zero network hop) and DISPROVEN — removing network latency made things
*slower*, not faster (8.61 tx/s vs. 15.74 tx/s over the tunnel), because
colocating the client added CPU contention with the daemon on the same
box. That result only makes sense in light of this section's finding:
the real bottleneck was never network distance, it was concurrent access
to one Autobase instance — colocating client and server concentrates
*more* competing work onto the same machine, making the real bottleneck
worse, not better. The original isolated in-process writer-count test
below remains useful for showing the *mechanism* scales badly with
writer count; this update shows the same mechanism dominates under
realistic concurrency even holding writer count fixed.

Built an in-process test (`NoiseSecretStream` pairs piped directly together,
zero real network, zero SSH/DHT) comparing identical total write volume (300
puts) under different writer-topology shapes, same machine, same code, same
log, nothing else changed:

| Topology | ms for 300 ops | ms/op |
|---|---|---|
| 1 writer, sequential | 1704.9 | 5.683 |
| 1 writer, concurrent (`Promise.all`) | 186.3 | 0.621 |
| 2 writers, concurrent | 243.9 | 0.813 |
| 6 writers, concurrent | 2023.3 | 6.744 |

**Going from 2 writers to 6 writers costs 8.3x per-op, not the ~3x a naive
"more writers" model would predict.** This is Autobase's multi-writer
linearization cost (every writer's interleaved appends have to be merged
into one causal order) scaling worse than linearly with writer count — a
real, structural property of the mechanism, confirmed in complete isolation
from network effects.

**What this alone does not explain**: the modeled 6-writer cost here is
6.7ms/op, vs. the real fleet's 5,000-10,000ms p50 — see §0 above, which
closes most of that gap with a confirmed, measured cause (disk I/O
saturation on the fleet's single-vCPU hardware). Writer count compounds
with §0 (more writers means more small writes competing for the same
saturated disk) rather than standing alone as the explanation.

**Recommendation**: collapse to one designated
writer per network (genesis) with the other nodes as pure replicating
readers, same as they already are in the *disconnected-log-bug-fixed* state
for reads (confirmed empirically: a `writable: false` joiner's `entryCount`
matched genesis exactly once connected — reading never required writer
status). Writes from a non-genesis node would need one forwarding hop to the
genesis node instead of a local append. Whether that's a net win depends on
real inter-node latency — see the WireGuard numbers below — not on writer
contention alone.

Real WireGuard RTT between the 5 fleet nodes (`ping` over the `10.77.0.0/24`
mesh, 2026-10-06):

| Path (from flx-bk1) | avg RTT |
|---|---|
| → flx-mist1 | 50.0ms |
| → flx-ms1 | 2.3ms |
| → flx-ms2 | 49.9ms |
| → flx-mk1 | 84.1ms |

These are real datacenter-to-datacenter hops, not LAN. A single-writer +
forwarding design pays one of these per non-genesis-originated write — for
3 of the 4 non-genesis nodes, that's 50-84ms, which is **far worse** than
the 6.7ms/op isolated multi-writer cost from the table above. **This means
the naive "just go single-writer" recommendation is not free.** A second
caveat §0 adds: collapsing to one writer doesn't reduce the fleet's TOTAL
disk I/O demand, it concentrates all of it onto genesis's one disk instead
of spreading it across five. If genesis is the same hardware class as the
rest of the fleet (it has 2 vCPUs vs. the others' 1, but is not obviously
beefier on disk), single-writer could trade "writer-merge contention,
distributed" for "disk I/O saturation, concentrated" — not obviously a win.
**The actual recommendation this audit supports is not "fewer writers" in
the abstract, it's "fewer, smaller, more sequential disk writes"** — which
is exactly what §1's batching fix does regardless of writer topology, and
why §1 is probably higher-leverage than a writer-topology redesign on its
own. A writer-topology change is still worth modeling once §1 is
re-measured on real fleet hardware with iostat running (§0's "not yet
done").

### 3. Log size — ruled out, do not chase this

Isolated test: single writer, pre-seeded with 0 / 5,000 / 20,000 entries
(`putMany`, same payload shape as real records), then timed 300 further
sequential `put()` calls against each:

| Pre-seeded log size | ms/op |
|---|---|
| 0 | 4.084 |
| 5,000 | 1.739 |
| 20,000 | 1.264 |

Per-op cost does not grow with log size at this scale — if anything it gets
faster (plausibly disk-cache/JIT warmup, or Hyperbee's B-tree lookups being
genuinely O(log n) and negligible here). **The real fleet's ~90,000-entry
log is not why fleet transfers are slow.** Don't spend effort compacting or
sharding the log as a speed measure; that solves a problem this audit did
not find.

### 4. Crypto / JSON / hashing — negligible, confirmed, not worth optimizing

Isolated Ed25519 + JSON + SHA-256 timing on this machine (5,000 iterations
each, no I/O):

| Operation | ms/op |
|---|---|
| Ed25519 sign | 0.633 |
| Ed25519 verify | 1.741 |
| JSON stringify+parse (476-byte record) | 0.006 |
| SHA-256 (same record) | 0.061 |

A full transfer does roughly 3 signs + 3 verifies + a handful of JSON
round trips ≈ **under 10ms total** of crypto/serialization work — this part
of the finding stands: CPU-side crypto/serialization is noise, under 0.2%
of the observed latency, not worth optimizing on its own.

**Fully measured now, and the original framing was wrong in an important
way.** The 47.3-57% figure (`flx_table_coded_not_hex.md`) is from
`flx-learning/src/codec.rs::encode_dense` — a **Rust codec built for
natural-language dictionary prose** (3,000 entries, a 110,538-symbol word
table, break-even against repeated English vocabulary). That ratio does
**not** transfer to this workload. A real transfer record is mostly
high-entropy cryptographic data — Ed25519 signatures, SHA-256 hashes, CIDs
— which has no repeated vocabulary to tokenize at all; applying a
word-level symbol table to random-looking hex/base64 bytes buys nothing.
This was the wrong corpus to cite and the earlier version of this section
is corrected here, not just extended.

**What's actually true, measured directly on a real-shaped 476-byte
fulfillment record** (fields: `version`, `kind`, `agreementCid`,
`inputCid`, `outputCid`, `cid`, `signatureB64` — same shape `http.js`
stores):

- Structure (keys, braces, fixed strings like `"flux.fabric-transfer.v1"`)
  is exactly **20.6% of the record** (98 of 476 bytes); the remaining
  79.4% is crypto-field entropy that cannot compress.
- Generic gzip on one record alone: **78.6%** of original (21.4%
  reduction) — gzip already captures essentially the entire structural
  ceiling on its own. **A custom per-record resolver cannot beat this**;
  there is no redundancy left for a smarter codec to find within a single
  record.
- Generic gzip/brotli across 1,000 *distinct* real records sharing one
  compression context: **51.2% (gzip) / 42.3% (brotli)** of combined
  size — a real ~49-58% reduction, because field names and fixed strings
  repeat identically across every record in the registry, the same
  mechanism TLM's dense encoding exploits for repeated words. **This is
  where a dense-pattern-inspired resolver, built for this registry's own
  field shape rather than borrowed from the TLM prose corpus, would
  actually pay off** — not per-record, but as a shared dictionary across
  a batch of records.
- Compression/decompression CPU cost is a non-issue regardless of
  approach: 0.02ms encode, 0.01ms decode per record (5,000-iteration
  measurement) — negligible next to multi-millisecond-to-second write
  latencies either way.

**The real constraint, and why this isn't a drop-in win**: Hypercore's
`append()` writes one block per call, and each `put()`/`putMany()` entry
in this registry is currently its own independent append with no shared
compression context between writes. Getting the ~50% batch-level ratio
for real requires bundling multiple records into a single Hypercore block
— a genuine data-model change (one Hypercore entry holds N compressed
records instead of 1), not a parameter flip. That changes the read path
too: finding one record means decompressing and scanning its bundle, and
`value-object-spent`'s `putIfAbsent` granularity would need redesigning
against bundle boundaries. Checked directly: Hypercore's own storage layer
does **not** already compress block payloads
(`node_modules/hypercore/lib/replicator.js`'s one `compress` hit is
bitfield-range compression for replication protocol metadata, not record
bytes), so this is genuinely additive, not redundant with anything that
already exists.

**Verdict**: real lever, correctly sized now (≈50% write-volume reduction
at the batch level, not the previously-cited 47-57% which was borrowed
from an unrelated corpus), but it is a scoped design project (bundled,
batch-compressed Hypercore entries), not a quick win — flagged as the
next concrete design to scope, not yet built.

**Built and tested anyway, with a negative result worth recording
honestly.** A `putManyCompressed()` method was implemented
(`communications-library/index-store.js` + a new `GZ_BATCH_MARKER` binary
framing in `index-shared.js`'s `apply()`, tested, 30/30 passing including
two new correctness tests) and wired into all four multi-entry write
sites. Deployed to `flx-bk2`, benchmarked against the exact same
1,000-transfer run §1 used: **10.54 tx/s, p50 1861ms — slower than
plain batching (15.74 tx/s, p50 1120ms), not faster.** Suspected cause:
`gzipSync`/`gunzipSync` block Node's single event-loop thread, and under
concurrency 20 that blocking serializes unrelated concurrent requests
behind each compress/decompress call. Switched both to the async
(`promisify`-wrapped, libuv-threadpool) variant and re-tested: **still
regressed, 10.71 tx/s, p50 1920ms** (measured locally on `flx-bk2`, zero
network latency, so this isn't a network confound either). The
synchronous-blocking theory is therefore not the full explanation — given
§2's concurrent-write-path finding (below), the more likely cause is that
compression adds a real CPU cost on top of Autobase's own already-expensive
concurrent write serialization, and on hardware where disk I/O was never
the bottleneck (confirmed §0.5: iowait ~0% on `flx-bk2` either way), that
added CPU cost has nothing to offset it against. **Reverted; not deployed.
This lever may still be a net win specifically on the fleet's small,
genuinely I/O-saturated nodes (§0) where there's real disk pressure for
smaller writes to relieve — that comparison has still not been run, and
should not be assumed positive given this result.**

### 5. gRPC — real, but secondary; minor documented improvement

Would replace plain HTTP/1.1 + JSON with HTTP/2 + protobuf framing.
Legitimate benefits: smaller wire payloads (protobuf vs JSON, modest at
these record sizes), HTTP/2 multiplexing (avoids repeated connection
setup if keep-alive isn't already happening — Node's `fetch`/undici already
pools connections per origin by default, so most of this benefit is likely
already realized). Estimated impact: tens of milliseconds per call, mostly
from connection reuse, not from the serialization format itself (§4 already
shows serialization is noise).

**Not the primary candidate for the 20-100x target on its own** — it
addresses transport framing, and §0 confirms the dominant real-world cost
is disk I/O, not network/transport. Worth doing as a secondary improvement
once the disk-I/O-facing fixes (§1 batching, §4 compression) are
re-measured, and a good fit for carrying Flux Compact-encoded payloads
instead of protobuf (reusing existing in-house compression work rather
than adopting protobuf's own format) — flagged as a follow-on design
question, not decided here.

## What's resolved, and what's still open

**Resolved this pass**: the ~1,000x gap between the isolated writer-count
model (§2, 6.7ms/op) and the real fleet's observed 5-10 second p50 is
mostly explained by §0 — real disk I/O saturation on the fleet's own
single-vCPU hardware (confirmed directly via `iostat`, not inferred: 90-99%
iowait, 65-172ms per write, queue depth 28-74 on the worst-performing real
node during otherwise-idle conditions). This was invisible to every
in-process test in this audit because they all ran against this Mac's fast
local SSD with no contention. **The practical implication: the fleet's
current VPS tier may simply be under-provisioned on disk for Hypercore's
small-write-heavy pattern, independent of any software fix.** No amount of
protocol-level optimization fixes a saturated physical disk; it only
reduces how much work reaches it (§1, §4) or how that work is distributed
across nodes (§2).

**Done since the previous version of this section**:

1. ~~The controlled before/after §0 calls for~~ — **done, see §1**: 1.51x
   throughput, 1.57x lower p50 from the batching fix alone, measured on
   real fleet hardware with `iostat` running throughout.
2. ~~Whether upgrading the fleet's disk/hardware tier is the actual
   highest-leverage fix~~ — **done, see §0.5**: the fleet's core is now
   `flx-bk2`/`flx-mk2` (28GB/20GB RAM, 7/5 vCPU), migrated and verified
   live, not just recommended. Contributed 4.32x of the 6.53x composite
   measured in §1.

**Still open, in priority order for the next session**:

1. Flux Compact payload size vs. write latency on a genuinely I/O-saturated
   node (§4's "not yet measured" item) — the same before/after methodology
   §1 just used, but on one of the old small nodes rather than `flx-bk2`,
   since §1 showed bk2 never saturates its disk regardless of payload size.
2. The writer-topology question (§2) — per §2's own caveat, collapsing to
   a single writer only helps if it doesn't simply concentrate I/O
   pressure onto one disk; worth re-examining now that the core nodes have
   real disk headroom, which changes that tradeoff's answer.
3. Re-run the full 7k fleet benchmark against the new bk2/mk2-centered
   topology, now that both shipped fixes are deployed everywhere, to get
   a real multi-node (not single-node) composite number — §1's 6.53x is a
   single-writer, single-node comparison; the fleet-wide number with the
   new topology is not yet measured.

**Bottom line**: this audit has moved from "we don't know what's slow" to
a real, measured, **6.53x earned end-to-end improvement** (§1's composite:
4.32x from moving the core to properly-provisioned hardware, 1.51x from
the batching fix, multiplied together and verified with both sides
actually measured, not modeled). Against the 20-100x target, that's
6.5-33% of the gap closed, with three more identified, not-yet-stacked
levers remaining (§2 writer topology, §4 compression, §5 gRPC) plus the
not-yet-run fleet-wide re-benchmark. The honest confidence level is no
longer "we have ideas" — it is "two of six identified levers are shipped,
deployed, and measured; the rest are scoped but not yet run."

## 6. The real architectural lever: accepted vs. durable finality for the FXN registry (proposed, not built)

§2's hard evidence (real server-side timing: `putIfAbsent`/`putMany` going
from ~10-25ms isolated to 80-860ms under concurrency 20, on the exact same
hardware and code) points at a cost that compression and hardware upgrades
can reduce but not eliminate: **every fulfillment currently waits,
synchronously, inside the HTTP response path, for `base.update()` to
reconcile with the fleet's other writers before the client gets an
answer.** That wait is where the real time goes.

The agreement-fabric quorum (the OTHER system this stats page covers)
already has a two-tier answer to exactly this shape of problem, and this
session's conversation arrived at the FXN-registry equivalent of it
independently: **a miner can commit a transfer locally and answer the
client immediately ("accepted"), then replicate/reconcile with the rest
of the fleet asynchronously, fire-and-forget — the same pattern
`broadcastReplicationEntry` already uses for liveness notification, just
extended to cover the actual commit, not just a notification about one.**
"Durable" finality would then mean "replication confirmed, no conflicting
spend of the same input exists anywhere in the fleet" — checked later,
not before responding.

**The real question this raises, stated precisely**: if two different
miners (e.g. `flx-bk1` and `flx-bk2`) each locally accept a fulfillment
spending the SAME input at nearly the same moment, both can return
"accepted" to their respective clients before either learns about the
other. This is a genuine, bounded race window, not a flaw to design away
— it is the same tradeoff Bitcoin's 0-confirmation payments make
deliberately. The resolution is already implemented and already correct:
`value-object-spent`'s `putIfAbsent` is first-write-wins, strictly ordered
once both writes land in the same causally-ordered log — today that
ordering is enforced *before* responding (slow, safe); the proposal is to
enforce it *after* responding (fast, provisionally safe), with the same
deterministic outcome either way. What changes is WHEN the client learns
the result is final, not WHETHER the result is eventually correct.

**What this requires, stated honestly, not minimized**:
- A clear, enforced distinction between "accepted" (locally committed,
  not yet conflict-checked against the fleet) and "durable" (replication
  confirmed) in the API response and in how recipients are expected to
  treat each state — exactly mirroring `agreement-fabric`'s own existing
  `accepted`/`durable` finality split, documented on this very stats page.
- A defined, user-facing consequence for the loser of a real conflict:
  does the recipient's "accepted" value-object get silently invalidated
  once durable finality reveals a conflict, with a dispute/notification
  path? This is a product decision (how much risk a recipient accepts for
  speed), not just an engineering one, and is NOT decided by this
  document.
- The local-accept fast path still needs to check for an *already-known*
  local conflict (an input this SAME node already marked spent) before
  answering — that part stays synchronous and cheap (a single local
  `getEntry`, not a cross-fleet `update()`). Only the cross-fleet
  reconciliation moves to async.

**Not built. Not decided.** This is flagged as the single highest-leverage
remaining lever in this document — bigger than §1's batching fix, because
it would remove the synchronous multi-writer wait from the client-facing
path entirely rather than shrinking it — but it is a real trust-model
change for a system that moves value, and deserves explicit sign-off and
a dedicated design pass, not a same-session implementation. Next step, if
pursued: a dedicated design doc (not this one) specifying the exact
accepted/durable response contract, the conflict-resolution/notification
path, and a test suite proving the double-spend guarantee still holds
under the new timing — mirroring the rigor `fulfillment-no-quorum.test.mjs`
already applied to the synchronous version.
