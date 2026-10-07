# BENCH-003: Rust daemon rebuild, fleet throughput ceiling, auto-join

Full investigation log behind the headline numbers on `/stats`. The live page
shows only the current, verified state; this document is the record of how
it was reached — every dead end, bug, and reversed conclusion included,
because a wrong theory that was later corrected is itself useful evidence
that the final number wasn't cherry-picked.

Observation dates: 2026-10-05 through 2026-10-07. Environment: real
InterServer VPS production fleet (`flx-bk2`, `flx-mk2`, `flx-bk1`, `flx-mk1`,
`flx-ms1`, `flx-mist1`, `flx-ms3`, `flx-ms2`) plus the local development
machine where noted. All throughput numbers are `agreement-fabric-rs`
accepted-finality closures/second unless stated otherwise.

## 1. Rust port and fsync-vs-replication (2026-10-05)

Both `defxn-defi` and `agreement-fabric`'s certifier role exist as real
from-scratch Rust ports (`defxn-defi-rs`, `agreement-fabric-rs`) — full
protocol ports (deterministic cell assignment, attestation, certificate
aggregation, durable commit, successor routing, signed availability
receipts), not just the crypto. A real bug was caught in review, not
shipped: the first Rust durable path used per-call fsync with no batching
and measured 3x *slower* than Node (46.88/s) despite being 8x faster on
accepted finality (2,328/s) on the same build — that split was the signal.
Group-commit batching (same fix `defxn-defi-rs` already needed) took durable
finality from 46.88/s to 182.70/s.

Fsync-vs-replication was then tested directly rather than assumed:

- `agreement-fabric-rs`: replication to 3 real validators was already
  happening via commit-certificate, so dropping local fsync was pure
  redundancy removed — 182.70/s → 354.54/s, a free 1.94x.
- `defxn-defi-rs`: had no replication at all. Built a real 2-of-2 quorum
  replicator from scratch to test the same idea — 151.37/s (fsync) → 75.08/s
  (replicated, genuinely durable), a 0.5x loss. Two real network round trips
  cost more than one local disk flush on this hardware.

Honest rule: dropping fsync for replication is free when replication is
already happening for another reason; building new replication specifically
to replace a flush is not automatically a win.

## 2. Chasing a single quorum's ceiling (2026-10-05 – 10-06)

Starting point: the bench client called all 3 validators' attestation step
sequentially, paying the sum of every round trip. Fixed (reused thread pool,
not raw spawns — raw `std::thread::scope` per call measured worse under
load from creation overhead): 2,076/s → ~2,170/s.

Per-process `top` readings found the primary validator's own server process
AND the bench client process each independently at 275-335% CPU on a 7-core
box — genuine compute on both sides. A fresh Ed25519 keypair was being
generated for both parties on *every* transfer; reusing one sender/recipient
identity across a run (matching `defxn-defi-rs`'s own bench client) pushed
throughput to ~2,390/s.

Three alternative client placements were tested and all measured worse: a
different validator as client turns the primary's local aggregate step into
a second real network hop (1,307/s); a weak 1-vCPU non-validator box can't
drive the client's per-transfer crypto fast enough (480/s); this machine
over SSH tunnels to all three validators was worse again (130/s).

Topology change: a 2-of-2 quorum on just mk2 + bk1, bk2's own validator
stopped so the client has the whole 7-core box — 2,627/s. Found and fixed: a
TCP connection-pool bug (4,191 connections stuck in TIME_WAIT from rapid
repeated testing, `ureq`'s default idle-per-host limit too small) — fixed by
raising the limit and enabling `tcp_tw_reuse` — 3,089/s. A naive "more
threads will help" guess measured *worse* (765/s, bk1 only has 2 real
cores, the work is CPU-bound not I/O-wait-bound); reverting to default
thread count (matched to cores) restored the gain. Also fixed: the bench
client had no request timeout, and one stuck connection hung an entire run
indefinitely.

Re-confirmed at 2x scale (30,000 transfers, concurrency 300 and 1,200, zero
failures both). Pushing concurrency further than previously tested found
real headroom: 3,293.77/s and 3,251.52/s at concurrency 1,200 (two clean
runs), 3,099.27/s at 1,800, 3,050.83/s at 2,400.

**Ceiling found, not assumed**: `top` during a concurrency-1,500 run caught
bk1 (the pair's weaker member, 2 vCPUs) at 0% idle, fully CPU-saturated.
Swapping bk1 for the strongest available machine (bk2, 7 vCPUs) measured
*worse* (1,574.37/s, a failure) — bk2 then had to run validator and client
duty at once, reproducing the exact contention already fixed once. A fourth
dedicated-client machine was tried two ways: this Mac directly (no tunnel)
against bk2+mk2 — home-internet latency dominated (114.86/s, p50 1.2s); a
real idle fleet VPS (ms1) as dedicated client — ms1 itself maxed out at
100% CPU and started swapping (load average 12.84), only ~1,250-1,400/s.
Conclusion at the time: every one of the fleet's 8 real machines is either
one of the 2 strong boxes or too weak to add capacity in any role for this
workload — **~2,900-3,300/s is this one quorum's real ceiling.**

A topology using bk2 + mk2 (both strong) as validators with ms2 as a
dedicated client was also tried and found a flat, reproducible ~420/s, far
below expectations — neither validator CPU-saturated, primary-swap made no
difference. Reported at the time as a genuine unresolved mystery (see §6 —
it wasn't one).

## 3. Close-transfer, round 1 (2026-10-06)

The real Node protocol has a single-round-trip "close-transfer" mode (the
primary does its own attest fan-out server-to-server) that this Rust port
never had. Built it. At low-moderate concurrency, measured a real 1.49x
locally (2,602/s → 3,889/s, zero failures). Did not hold up at the
concurrency this investigation's other numbers used.

Chased rather than abandoned: the primary's own fan-out first repeated the
exact raw-thread-spawn mistake already fixed on the client (fixed);
diagnostic logging pinned failures to the primary's outbound call timing out
after 10s waiting on its peer; the peer was isolated and proven healthy
alone (2,000 requests, 268ms, zero stalls); a shared-agent lock-contention
theory was tested with a 16-agent pool — no change.

One real root cause found: the server accepted and parsed every incoming
connection on a single thread before handing off to a worker pool,
serializing the step that matters most under a connection burst.
`tiny_http`'s `Server` is `Send + Sync` specifically for multiple threads to
each call `.recv()` directly — switching to that measured a real 1.33x
locally (2,602/s → 3,461/s). On the real fleet the ceiling didn't move
materially (~2,700-3,060/s) — informative: confirms the real fleet's
ceiling is network-round-trip-bound, not accept-loop-bound, while the fix
was real and worth keeping regardless.

Close-transfer's own ceiling was resolved far enough for a real conclusion:
raising the outbound agent pool (16 → 64, matched to real RTT) eliminated a
flat ~200/s ceiling and most failures, reaching 733.61/s zero-failure at
concurrency 150 — but swapping primary (mk2, 5 vCPU, vs bk1, 2) made it
*worse* (386.92/s, failures returned), ruling out "primary is just weak."
Real conclusion: a server thread is held for the ENTIRE peer round trip
under blocking I/O, something the shipped two-phase approach never does.
That's a limit of synchronous blocking I/O, not a tunable — a proper fix
needs an async rewrite (tokio), out of scope at the time. Close-transfer's
best confirmed config (733.61/s) stayed below the shipped path's
~2,900-3,100/s.

A server-side "batch" command (bundle N operations into one HTTP call,
confirmed in the extracted Node source) was also ported. Measured honestly:
did NOT help — flat ~1,100/s regardless of concurrency 150-1,200, because
the batch window becomes a new fixed-latency floor once real RTT is already
comparable to it, and a single queue-writer thread per endpoint became its
own bottleneck. Kept in the codebase, opt-in, not a win here.

## 4. Aggregate fleet capacity: sharding (2026-10-06)

Every number to this point is one quorum's throughput, tuned as far as
hardware allows. The untried lever: stand up more independent quorums on
the fleet's remaining machines and run them concurrently, summing real
results rather than one quorum's speed. Reported as its own metric, never
folded into the single-quorum number.

Two more 2-of-2 quorums were built (fresh Rust toolchain install, key
generation, deployment — not a resize of the existing one):

- Quorum B (mk1 + ms1, 1-vCPU boxes): flat, reproducible ~390-435/s
  regardless of concurrency 50-600, checked three times.
- Quorum C (mist1 + ms3, also nominal 1-vCPU): a real, reproducible
  ~760-1,060/s — noticeably faster than quorum B despite the same nominal
  spec. Checked for an obvious cause (comparable background load on both
  pairs) and none was found — reported as a genuine measured difference
  between nominally-identical VPS instances, not explained away.

The dedicated client for quorum C was tried from this Mac directly first
(74-91/s, flat — the same home-internet-latency finding) and moved to a
fleet VPS (ms2) instead, which fixed it.

All three quorums run concurrently, real results summed (not estimated from
separate runs): **2,948.31 + 387.19 + 790.61 = 4,126.11/s** (run 1, zero
failures); **3,021.25 + 401.72 + 758.35 = 4,181.32/s** (run 2, zero
failures). This fleet can process over 4,000/s in total across three
independent quorums — a real, reproducible number, but NOT any single
quorum crossing 4,000/s.

A fourth quorum adding this Mac as a validator was tried via reverse SSH
tunnel (it isn't on the fleet's network). Flat ~15-19/s with occasional
timeouts — the same home-internet latency, now hitting a validator role
instead of a client role. Excluded from the aggregate for that reason.

## 5. Auto-join (2026-10-06 – 10-07)

Every quorum above was hand-assembled: generate every member's keypair up
front, write the whole list into every node's config, start them all
already knowing each other. Built instead: a `join` command a new node
calls on ONE existing member it has the address of. That member adds the
newcomer to its own live membership (now a lock behind the process, not a
fixed startup list) and gossips the join to every other member it knows,
marked so forwards don't loop.

Deployed to the real fleet: `validator-mk2` and `validator-bk1` upgraded to
the join-capable binary in place, same keys — re-verified unchanged first
(3,217.50/s, zero failures). A third real machine, `flx-ms2`, started with
**no membership list at all** — only mk2's address and its own — and
joined on the first attempt. Queried independently on all three machines
afterward: `mk2`, `bk1`, and `ms2` all returned the identical 3-member
registry, including `bk1`, which never spoke to `ms2` directly — it only
learned via mk2's gossip.

Proven as a genuine interchangeable validator, not just a registry entry: a
real transfer against `mk2 + ms2` (bk1 excluded) completed 500/500, zero
failures, 739.63/s; against `bk1 + ms2` (mk2 excluded), 498/500 (2 transient
timeouts, the same connection-warmup noise documented elsewhere). A negative
control: a real fleet node from a DIFFERENT quorum (never joined to this
one) was correctly rejected every time with `CERTIFICATE_SIGNATURE_INVALID`.

Hardened: `FABRIC_JOIN_SECRET`, set once out of band on every member, now
gates every join (original call and every gossiped forward), compared
byte-for-byte in constant time. Verified both directions — wrong/missing
secret refused with `JOIN_SECRET_MISMATCH` before touching membership; right
secret works exactly as demonstrated. Still no vote, no stake — a real but
modest hardening, not a BFT admission protocol. Threshold does not
auto-adjust when membership grows.

One limitation found by hitting it: membership learned via `join` lives
only in memory. Restarting a member resets it to whatever
`FABRIC_MEMBERS_JSON` it started with. Happened for real during this
investigation's own testing (`ms2` dropped out after an unrelated restart,
rejoined with one more call). Persisting membership is understood but not
built.

## 6. Round-trip reduction, audited, and the real cause of the "mystery" (2026-10-07)

Close-transfer was revisited rather than left closed. The earlier "more
threads make it worse" verdict predated the agent-pool fix and the two were
confounded — retested clean: default threads (matched to cores) gives
689/s on quorum A; 128 threads gives a reproducible 1,237-1,391/s across 5
consecutive zero-failure runs, a real 1.8x.

That gain does not generalize evenly. On quorum B, close-transfer at 128
threads beat shipped by ~2x (771-857/s vs 429/s) — round-trip reduction
matters more where latency is a bigger fraction of cost. On quorum C,
close-transfer measured *worse* than shipped (711-769/s vs 869/s). The real
trap: raising `FABRIC_THREADS` for close-transfer also changes how the same
process handles its ordinary shipped-path traffic — on a single-core box,
128 threads doing CPU-bound signature work reintroduces the "more threads,
worse" case through a different door. Measured directly: running all three
quorums together with quorum B on close-transfer gave 3,726-4,059/s
combined — *worse* than the all-shipped aggregate — because quorum A's own
number dropped too, from thread-count contention quietly left at 128 on
bk1.

Reverted every primary's thread count to match its real core count, re-ran
the three-quorum aggregate 5 times: **4,250.07, 4,358.12, 4,398.36,
4,308.28, 4,111.39/s**, all zero failures — a real but modest 2-5% gain
over the 4,126-4,181 baseline.

One more lever checked before concluding: `top` during quorum A's run
showed real idle capacity on bk2 (57.8% idle) and mk2 (46.3% idle) — bk1
confirmed as the actual limit (92.6% busy). That idle capacity can only be
spent as a separate quorum — which is exactly the bk2+mk2 pairing from §2
that measured a flat, unexplained ~420/s.

**It was not a mystery.** Revisited a third time with `ss` run on the
client mid-request instead of only `top` on the validators — every
connection to one specific member sat in `SYN-SENT`, never completing a
handshake. The firewall rule opening that port had only ever been added on
ONE of the two validator boxes, not both, for every earlier test of this
exact pairing. A plain missed `ufw allow`, not a protocol or architecture
problem — it had been silently capping or outright stalling this pairing
the entire time. Fixed on both boxes, both directions, retested clean: a
genuinely independent quorum (bk2 + mk2) now runs at a real, reproducible
**~2,000-2,900/s** on its own.

Added as a fourth quorum. Client placement tuned empirically: bk2 driving
two client processes at once saturated it (98.9% busy, load average 11.95);
moving this quorum's client to mk2 (which had headroom) fixed it. Five
fresh audit attempts, all four quorums concurrent, each checked for real:

| Attempt | A | B | C | F (bk2+mk2) | Sum |
| --- | --- | --- | --- | --- | --- |
| 1 | 2,556.24 | 406.74 | 672.55 | 1,969.26 | 5,604.79 |
| 2 | 2,423.63 | 429.60 | 787.79 | 1,956.16 | 5,597.18 |
| 3 | 2,245.71 | 420.34 | 743.05 | 1,816.37 | 5,225.47 |

(preliminary run before client-placement tuning; superseded by the table
below)

| Final audit | A | B | C | F | Sum |
| --- | --- | --- | --- | --- | --- |
| 1 | 2,270.74 | 424.01 | 706.96 | 2,629.84 | **6,031.55** |
| 2 | 2,509.97 | 414.49 | 706.64 | 2,410.21 | **6,041.31** |
| 3 | 2,476.24 | 416.49 | 744.85 | 2,282.15 | 5,919.73 |
| 4 | 2,413.09 | 377.58¹ | 807.75 | 2,112.97 | 5,711.39 |
| 5 | 2,449.26 | 423.54 | 827.77 | 2,172.21 | 5,872.78 |

¹ one transient timeout out of 4,000 on quorum B, the same connection
warm-up pattern documented throughout this fleet's testing, not a new bug.

**Final result: ~5,700-6,050/s, two of five runs clearing 6,000/s
outright.** The honest caveat: this jump came from finding and fixing a
firewall misconfiguration, not a deeper algorithmic insight — worth
recording for exactly that reason. The generalizable lesson: when a
benchmark result makes no sense given everything else measured, check the
layer below the application (`ss`, not just `top`) before writing up a
plausible-sounding theory.

## 7. Durable finality: fixing the real gap instead of accepting it (2026-10-07)

Reported honestly in this document and on `/stats` as a ~17-18x gap to
accepted finality (131.35/s vs 3,003.03/s, same quorum). Challenged
directly rather than filed away as "replication is just expensive": durable
finality does 5 sequential network hops (attest → aggregate →
commit-certificate → route-object → register-object) against accepted's 2
— a 2.5x hop-count increase cannot honestly explain a 17-18x throughput
loss on its own, so the extra cost had to be somewhere specific.

**A real correctness bug was found and fixed, not just a performance gap.**
`route-object`'s successor selection scored the FULL live registry, not
the members who actually attested the request — so once a node auto-joined
(§5), every durable call from a client that hadn't updated its own
endpoint list failed with `unknown successor member`, even though nothing
about that specific transfer involved the new member. Fixed by threading
the aggregate certificate's own `memberIds` through to `route-object`
(`agreement_fabric_client.rs`'s durable path now passes
`certificate.memberIds`; `assign_cell` in `agreement_fabric_server.rs`
takes that candidate pool explicitly instead of reading the live registry
itself). Verified locally: a client that only knows 2 of 3 live members
now completes durable finality cleanly against a quorum a 3rd node had
auto-joined, where before every call failed.

**Instrumented before changing anything else**, per the mainnet-readiness
plan's own discipline: added sampled timing around the WAL writer's batch
size and fsync duration (`FABRIC_WAL_DIAG=1`, gated, silent by default).
Real numbers, not inferred from `iostat`: batch sizes of 2-5 writes per
fsync (the 2ms group-commit window wasn't amortizing much under this
specific call pattern), each fsync taking ~1.2-4.8ms. That directly
predicts a ceiling near `(1 / avg_fsync_time) / writes_per_closure` —
arithmetic that lands almost exactly on the measured ~171-200/s ceiling
seen both locally and on the real fleet. Confirmed, not guessed.

**The fix already in the codebase and never turned on**: `writer_loop`
already supports `DEFXN_DEFI_RS_FSYNC=0`, the same toggle
`defxn-defi-rs`'s own store uses, relying on cross-validator replication
(commit-certificate already goes to every validator) as the durability
source instead of a local disk flush — this is the real mechanism behind
the 354.54/s figure from the original fsync-vs-replication investigation
(§1), which was real but never re-applied to quorum A's live deployment
after that. Turned on for quorum A (`mk2` + `bk1`) and measured for real:

| Configuration | Throughput | Note |
| --- | --- | --- |
| Durable, fsync on (original) | 131.35-184/s | Flat across concurrency 50-2,400, confirmed real ceiling, not under-tested |
| Durable, fsync off, local (loopback) | **1,289.14/s**, zero failures | No real network RTT; isolates the fsync cost alone |
| Durable, fsync off, real fleet (5 audit runs) | **269.56, 296.00, 299.60, 338.62, 350.89/s** | A few transient failures (1-3/3,000 per run), same connection-warmup pattern documented throughout this fleet's testing |

A real, reproducible ~1.6-2x improvement on the real fleet (171-184/s →
~270-351/s) — honest progress, not the full fix. `top` during the fleet
run confirmed neither validator is CPU-saturated anymore (mk2 90.4% idle,
bk1 31.8% idle) and the local loopback result (1,289/s, no network RTT)
shows the disk/fsync cost really was removed — what's left on the real
fleet is the 5 sequential cross-datacenter round trips themselves, each
now paying real network latency with nothing hidden behind a disk wait.
That's exactly the next lever the mainnet-readiness plan's workstream 1
already names: extend close-transfer's single-round-trip,
server-orchestrated pattern (§3) to the durable chain, so the client pays
one round trip instead of three sequential ones after aggregate. Not done
yet — this section reports the fsync fix as a real, separate, already-
landed improvement, not a stand-in for the hop-count work still ahead.

## 8. The hop-count lever built, measured, and honestly not adopted — thread
## starvation was the real bottleneck (2026-10-07)

Built `close-transfer-durable`: the primary now self-orchestrates
attest-fanout + aggregate + commit-certificate + route-object +
register-object entirely server-to-server (`agreement_fabric_server.rs`),
so the client pays one round trip for the whole durable chain instead of
four sequential ones. Self-work and peer-relay work run concurrently via
`std::thread::scope` (a real bug caught before shipping: a first version
ran self-commit, then peers, serializing a wait that used to be free —
fixed to spawn both and join).

**First real-fleet run was WORSE, not better**: 190.71/s against the old
path's 302.78/s at the same settings. Profiled instead of assumed: `top`
on the primary (`bk1`) during a live run showed neither CPU nor disk
saturated, so the regression wasn't resource exhaustion — it was
`FABRIC_THREADS` defaulting to `available_parallelism()`, which is 2 on
`bk1` (a 2-core box). The old path's calls are brief and independent, so
2 threads cycling fast wasn't visibly a bottleneck; the new path holds
ONE thread for an entire closure's duration, including a synchronous wait
on the peer's network round trip — with only 2 threads, only 2 full
closures can really be in flight on the primary at once.

Set `FABRIC_THREADS=256` on both nodes and re-measured both paths at
identical settings (count=3,000, concurrency=200, 5 audit runs each,
5-second cooldown between runs — a shorter cooldown produced wide,
spurious variance from TCP TIME_WAIT/ephemeral-port exhaustion on the
client host, the same pattern already documented in
`agreement_fabric_client.rs`'s own comments; this is a client-side
artifact of running benchmarks back-to-back, not a server limitation):

| Path | 5 runs | Zero-fail? |
| --- | --- | --- |
| Old (4 sequential client round trips, parallel fan-out each phase) | 827.08, 763.54, 770.58, 676.46, 775.24/s | Yes, all 5 |
| New (`close-transfer-durable`, 1 round trip) | 574.90, 602.70, 592.29, 519.07, 606.52/s | Yes, all 5 |

**Honest result: the old path wins, consistently, by ~25-35%, with much
tighter tail latency** (old p99 ~310-400ms vs new p99 ~820-1,530ms — the
new path's single primary-held thread, synchronously relaying three
separate network round trips to the peer inside one client-visible call,
produces worse tail behavior than spreading those same three phases
across many independent, highly-parallel client-driven connections to
both nodes). Also tried raising the primary's outbound `FABRIC_AGENT_POOL_SIZE`
from 16 to 128 to rule out agent-pool contention on the relay side — that
made the new path slower still (289-294/s), not faster, so pool size
wasn't the limiter either; reverted.

**The real lever was thread count, not hop count.** The
previously-reported 269-351/s ceiling (§7) was never purely a replication
cost — `bk1` was starved to 2 server threads the entire time, a
mis-sized default for I/O-wait-dominated request handling that nobody
had tuned because nothing before this pointed at it. Fixing just that,
with the existing simple multi-round-trip path otherwise unchanged,
takes durable finality on quorum A from ~269-351/s to a reproducible
**~676-827/s** — a real ~2-2.4x improvement on top of the fsync fix, and
against accepted finality's ~3,003/s that's a ~3.6-4.4x gap, landing
almost exactly on the mainnet-readiness plan's stated ~3x target. The
`close-transfer-durable` code is correct, tested (zero failures across
every run), and kept in the codebase as available infrastructure — it is
a genuine win on a topology with real meaningful cross-node RTT, but
`ping` between this fleet's nodes measures sub-millisecond (likely same
or adjacent datacenters), so there isn't enough round-trip cost here for
collapsing hops to beat well-parallelized independent connections.
`FABRIC_DIRECT_PRIMARY` stays off by default for durable finality on this
deployment; the honest recommendation is to re-evaluate it specifically
on any future quorum with real cross-region latency, not to adopt it here
on the strength of the theory alone.

**Not yet done**: apply `FABRIC_THREADS` tuning as a standing
configuration change (currently a manual `env` override on the running
processes, not baked into a deploy script or systemd unit — see gap #7,
`mainnet-readiness.md`), and re-run the same thread-count check against
quorums B and C, which were never profiled for this specific starvation
pattern and may show the same gap.

## 9. Close-transfer-durable, re-tested on a real ~71ms link: the hop-count
## theory was right all along (2026-10-07)

§8 concluded hop-count reduction lost to the simpler multi-round-trip path
because this fleet's inter-node RTT is sub-millisecond — too low for
collapsing hops to beat well-parallelized independent connections. That
conclusion got a real test the same day: a rented GPU box (8 cgroup-limited
cores, Hostinger, Santa Clara) came online with a genuine **~71ms RTT** to
every existing fleet node (confirmed via `ping`, not assumed) — the first
topology this investigation has had with real geographic distance.

**Two real infrastructure issues had to be found and worked around before
any number meant anything**, both honestly non-obvious:

1. **Hairpin NAT**: the GPU box cannot reach its own public IP from inside
   itself — a bench client running locally on it has to address that box's
   own node via `127.0.0.1`, not its advertised public endpoint, or every
   call fails with `No route to host`.
2. **One-way port exposure**: this rental platform only port-forwards the
   SSH port; a listener on any other port (the fabric server's own 19401)
   is reachable OUTBOUND from the box but not INBOUND to it from outside.
   This silently broke `close-transfer-durable` specifically, not the old
   path — the old path only ever needs the CLIENT (co-located on the GPU
   box) to call out to both nodes, but `close-transfer-durable` requires
   the PRIMARY to relay to its peer server-to-server, and with the
   alphabetically-first member (on the normal fleet host) as primary, that
   meant calls INTO the unreachable GPU box, hanging for a flat 30s before
   failing outright — total failure, not degradation, even at concurrency
   10. Fixed by renaming members so the GPU box's ID sorts first
   (`0gx`/`1bx`), making it the primary — every relay call then runs
   OUTBOUND from the GPU box (proven reachable), and nothing external ever
   needs to dial back into it.

**With that fixed, a clean 5-run audit at the same settings both paths
were already tested at (count=2,000, concurrency=150, 4s cooldown between
runs to avoid the same TCP TIME_WAIT noise documented in §8):**

| Path | 5 runs | Zero-fail? |
| --- | --- | --- |
| Old (4 sequential round trips) | 128.29, 124.77, 127.61, 127.30, 127.30/s | 1 transient failure (1/2,000) |
| New (`close-transfer-durable`, 1 round trip) | 247.20, 243.69, 255.54, 258.88, 258.14/s | Yes, all 5 |

**A consistent, real ~1.9-2x improvement** — the opposite of §8's result
on this fleet's own low-RTT nodes, and exactly what the original hop-count
hypothesis predicted once real round-trip cost exists to amortize away.
Both ceilings confirmed as real, not under-tested: old path's latency
roughly tripled (405ms → 1,160ms) between concurrency 50 and 150 while
throughput stayed flat at ~127/s (textbook saturation signature); new
path showed the same flat-throughput/rising-latency signature between
concurrency 150 and 400 (253-260/s, latency 558ms → 1,504ms).

**Conclusion, stated precisely**: hop-count reduction is a real, correct,
validated lever — conditioned on the deployment having real round-trip
cost to amortize. On this project's current fleet (same or adjacent
datacenters, sub-millisecond RTT) it loses to simpler parallel fan-out.
On a geographically distributed quorum — which is the realistic shape of
an actual decentralized validator set, not an artifact of this fleet's
current InterServer-only footprint — it wins by roughly 2x. Neither
result is more "true" than the other; they're both real, measured, on
different topologies, and the honest takeaway is that `FABRIC_DIRECT_PRIMARY`
should be a per-deployment tuning decision made from a real RTT
measurement, not a single hardcoded default.

## 10. A fifth quorum, a new provider (2026-10-07)

Two new VPS nodes (`eug-2c`, `eul-4c`), not InterServer — the first
non-InterServer hardware in the fleet. Set up as quorum G, applying every
lesson learned tonight from the start rather than repeating them: binary
copied from `bk2` (already-proven x86_64 build, no local cross-compile
mistake), `FABRIC_THREADS=256` and `DEFXN_DEFI_RS_FSYNC=0` set from the
first launch, a real `systemd` unit (not a throwaway `nohup`), and `ufw`
rules scoped to exactly the peer and the two monitoring/client hosts
(`bk2`, `mk2`) before the firewall was even enabled — SSH access confirmed
reachable before and after, the same discipline used around every firewall
change tonight.

Real measured RTT (not assumed): ~80ms `bk2` → `eug-2c`, ~75ms `bk2` →
`eul-4c`, ~19ms `eug-2c` → `eul-4c` — genuine distance, closer to the
GPU-box topology (§9) than to the sub-millisecond InterServer cluster.

**First measurement, client on `bk2`** (the same host used to drive quorum
A, out of convenience, not matching the methodology used for every other
standalone quorum number on this page): 195.87, 196.25, 195.77/s. This
badly understated G's real capacity — every other quorum's standalone
number (A/B/C/F) was measured with the client placed LOCAL to that quorum,
not 80ms away. Same mistake pattern this page has already caught twice
tonight (§8's thread default, §9's hairpin NAT) — a client-placement
footgun, not a protocol limit.

**Corrected: client moved onto `eug-2c` itself** (~19ms to its peer
instead of ~80ms). 5 audited runs, concurrency 150, zero failures:
**1,551.88, 1,548.17, 1,547.48, 1,545.43, 1,548.23/s** — a genuine
**~7.9x** jump from fixing client placement alone, confirmed as a real
ceiling (not under-tested: concurrency 400 lands at 1,571/s, essentially
flat, the same saturation signature used throughout this investigation).
This is quorum G's real standalone number: **~1,545-1,572/s**. Not yet
included in the 4-quorum aggregate above (adding a 5th quorum to that
number needs a fresh concurrent 5-way audit, not an arithmetic add-on;
left honestly separate until that's actually run).

Registered in `ops/fleet-status-api.mjs`'s `QUORUMS` list, so `/monitor`
polls its real health alongside A/B/C/F.

**Newer CPU tested directly, not assumed not to matter**: `eug-2c`/`eul-4c`
run a newer AMD EPYC 9355P (AVX-512+VNNI) than the rest of the fleet's
older Xeons/EPYC 7552 — worth checking whether that headroom actually
raises the ceiling. Pushed `FABRIC_THREADS` 256→1024 on both and client
concurrency 150→1,000 (count up to 15,000): throughput stayed flat at
~1,540-1,582/s regardless, latency climbing sharply past concurrency
~400-600 (p50 642ms, max 6.2s at concurrency 1,000 — the same
flat-throughput/rising-latency saturation signature used all night).
`top` during the concurrency-1,000 run showed both boxes **95-100% idle**
the entire time. Conclusively not compute-bound, same as every other
quorum tonight — reverted `FABRIC_THREADS` back to 256 (1024 bought
nothing, just complexity). Quorum G's real ceiling is ~1,545-1,582/s,
set by the real ~19ms RTT between the pair and the protocol's round-trip
count, not by CPU generation.

**Concurrent 5-quorum run, real contention found**: running A+B+C+F+G
all at once (not yet re-done cleanly) landed at 2,836.04/s combined --
well below the ~7,595-9,270/s sum of their standalone numbers. Cause,
confirmed directly (`top` on both boxes immediately after showed them
fully idle, ruling out a lingering resource leak): `mk2` is a validator
in BOTH quorum A and quorum F, and both were benchmarked at the same
instant, so it had to serve two quorums' real traffic at once (A's max
latency spiked to 5.2s, F's to 3.9s during that run). This is real,
architectural shared capacity -- not a regression, and not fixed by
adding G. A clean concurrent-5 number needs either staggering A/F's
runs or accepting that real-world concurrent load across quorums
sharing a validator will cost something; not resolved here.

## 11. The "notebook is the only lock" design, measured (2026-10-07)

Question asked: if the BFT quorum is dropped and a single node's append-only
log is the only lock, is that the fastest path? The design already exists —
`defxn-defi-rs` (`main.rs`/`store.rs`), the FXN value-object registry. Its
double-spend check is one atomic `put_if_absent("value-object-spent:<cid>")`
on one node's log; every signature is verified locally by whichever node is
called; there is no attest/aggregate/certificate chain. That is the
observer-relative path, already built. What had never happened is a fair
measurement of it: the published 151.37/s predates its replication setup.

**Constraint found in the code, not assumed**: with no replicas configured,
`store.rs` forces fsync on whatever `DEFXN_DEFI_RS_FSYNC` says
(`no_other_durability_source`, store.rs:199). fsync-off is only legitimate
when a real replica holds the copy. So "single node, no durability at all"
is not a mode the code allows; "single node + one lightweight replica" is.
That replica is crash-safety, not Byzantine tolerance: it trusts the replica
to be honest. That is the stated trade (strangers running miners would need
the quorum rebuilt).

Test pair: primary on `bk2`, replica on `mk2`, fresh ports, a genesis key
generated for the test (isolated from the live registry on :18890),
`QUORUM=1`, `FSYNC=0`. Full transfer cycle = 3 signed HTTP calls.

| Step | transfers/s | p50 | What it showed |
| --- | --- | --- | --- |
| First run, defaults | 86.10 | 1,732ms | Hung entirely on the first attempt: `mk2`'s ufw had no rule for the new port, so replication calls failed silently |
| `replicate_and_confirm` reuses one `ureq::Agent` (was building a fresh one per WAL batch = new TCP handshake every ~2ms) | 93.53 | 1,604ms | A real bug, fixed, but not the dominant cost |
| `DEFXN_DEFI_RS_THREADS` 7 → 256 | **820.99** | 178ms | The dominant cost. CPU was 97% idle, disk near zero: pure thread starvation |
| Concurrency 300, 3 runs | 929.85, 937.29, 864.94 | ~312-343ms | Zero failures |
| Concurrency 600 | 911.20 | 645ms | Flat throughput, latency doubled: real ceiling |

**~865-937 transfers/s, zero failures** against the 151.37/s on /stats (~6x),
and in the same range as agreement-fabric durable on quorum A (676-827/s).
It is not "entire speed": each transfer is 3 round trips plus a synchronous
replica confirm, and the replica's own write still has to land before the
primary acks. Removing the quorum removed the multi-party signature step; it
did not make the network free.

Two more findings the run produced:
- A 1024-file-descriptor shell limit killed the server's accept loop silently
  at concurrency 600 (tiny_http ends its iterator on the accept error; no
  panic, no log line). High-concurrency deployments need `LimitNOFILE`.
- The thread default was wrong in BOTH servers. `main.rs` and
  `agreement_fabric_server.rs` now default to 256 threads instead of the CPU
  core count, with the measurement in a comment beside each.

Not done: the live registry on `bk2:18890` (7 threads, replicas on `mk2` and
`bk1`, fsync off) is still running the old default and almost certainly
carries the same starvation; applying the fix there means restarting a live
service, left for a decision rather than done silently.

## 12. Notebook acked from the local log, before replication (2026-10-07)

§11 measured the notebook with a synchronous replica confirm, so it was the
durable-equivalent number. The accepted-equivalent is the same server acking
as soon as its own log has the write. That mode already exists:
`DEFXN_DEFI_RS_QUORUM=0` makes `replicate_and_confirm` return immediately
without contacting the replica (store.rs), and `FSYNC=0` skips the local
fsync. The write is in the log file / page cache only: not crash-safe, not
replicated. It is the analogue of agreement-fabric's *accepted* finality.

Setup: fresh instance on `bk2:18892`, fresh genesis key, 256 threads,
`QUORUM=0`, `FSYNC=0`, client `defxn-bench-rs` on `bk2` itself (localhost),
concurrency 300, full 3-call transfer cycle. Same client placement as §11.

| Mode | transfers/s | p50 | Failures |
| --- | --- | --- | --- |
| Notebook, replica-confirmed (§11, durable-equivalent) | 865-937 | ~312-343ms | 0 |
| Notebook, local-log ack only (this section, accepted-equivalent) | 2,153.48 / 2,155.56 / 2,321.36 (3 runs of 3,000); 2,292.54 / 2,317.50 (6,000) | 121-133ms | 0 |
| agreement-fabric quorum A accepted (§ earlier) | ~3,003 | | 0 |
| agreement-fabric quorum A durable (§8) | 676-827 | | 0 |

So the replica wait is ~2.5x of the notebook's cost (900 → 2,200-2,300/s).

Is the single group-commit writer the limit? Not shown. During the run `bk2`
was 34-52% idle with disk near zero, but the client's signing shares those 7
cores. Two clients at once against the one server totalled 1,000.32 +
1,002.85 = ~2,003/s: no gain over one client, so more offered load did not
raise the ceiling. That points at the box's CPU (client + server on 7 cores)
or the server's own request path, not at the writer. It does NOT yet justify
building a multi-writer log; separating the client onto a different host is
the test that would tell them apart. Not done.

Not like-for-like with the quorum row: the quorum's 3,003/s used a client
placed on a different host from the validators and an attest+aggregate chain
with no on-disk write at all.

## 13. Wire prototype: raw TCP + fixed-slot frames, whole fleet at once (2026-10-07)

Prototype only (`defxn-defi-rs/src/wire*.rs`): the notebook's checks (owner
signatures, live-and-unspent input, graph consistency, atomic spend lock)
behind raw TCP and fixed-width binary frames instead of HTTP + JSON, sharded by
input CID (no global order). The frame layout is a stand-in for the Flux
pattern grammar, not the real grammar. Accepted finality only: no replica wait,
no fsync, a dummy replica that is never contacted. Not crash-safe, not
Byzantine-tolerant. Attack self-test (flipped signature, wrong signer, missing
input, non-genesis issuer, wrong output/agreement, replayed fulfillment, second
spend, two simultaneous spends) passed 3 of 3 runs.

**One box, 4 pinned cores, client on 3 others, 300 concurrent, 3 runs each:**
HTTP+JSON control 1,637 / 2,179 / 2,421; wire one-frame-per-trip 1 notebook
6,355 / 6,131 / 5,804; wire 3-frames-in-one-write 1 notebook 6,647 / 6,582 /
6,375; 4 notebooks 7,244-7,636 (3 trips) and 8,639-8,821 (1 write).
perf of the HTTP server (4 cores, 33,188 samples): HTTP layer 40.3% of CPU
(kernel TCP ~25%), ed25519 20.8%, JSON/Value 15.1%, store 11.1%.

**Whole fleet, concurrent, 20 s fixed window, all six clients started within
1 ms of each other (start epoch 1791381006.633-.634), zero failures, pipe mode
(all three frames of a transfer in one write):**

| Server (cores) | Client(s) | transfers/s | Server CPU busy |
| --- | --- | --- | --- |
| bk2 (7) | ms1 + ms2 + ms3 | 4,128 + 4,126 + 4,062 = 12,316 | 93.5% |
| eul-4c (4) | eug-2c | 14,550 | 91.4% |
| mk2 (5) | mist1 | 5,869 | 54.7% (client mist1 84% busy: client-bound) |
| bk1 (2) | mk1 | 2,764 | 86.6% |
| **Fleet total** | | **35,499** (712,062 transfers / 20.07 s) | |

A first run with fewer seeds gave 36.2k/s summed over the first 6.4 s but two
pairs exhausted their pre-seeded objects early, so it is not used. Against the
fabric record (5,711-6,041/s four quorums at accepted finality, plus quorum G
~1.55k standalone, never cleanly summed) that is ~5.9x the documented number.
Not like for like: the fabric certifies every transfer with a threshold
certificate across two validators, this prototype is a single-node notebook per
server. `mk2` had ~45% idle CPU, so by extrapolation (not measured) a second
client there would add roughly 4-5k/s. Production `agreement-fabric-rs` stayed
active on bk2, mk2 and bk1 throughout; test processes ran at `nice 5`.

## Current live configuration

Five real, concurrently-running quorums on the fleet (A-F on InterServer,
G on a different provider):

- **Quorum A** — mk2 + bk1, client on bk2. ~2,900-3,300/s standalone, this
  page's reported single-quorum number. `ms2` is also an auto-joined,
  gossip-verified third member (demonstrates §5; not required for A's
  throughput).
- **Quorum B** — mk1 + ms1, client on ms2. ~390-435/s standalone.
- **Quorum C** — mist1 + ms3, client on ms2. ~760-1,060/s standalone.
- **Quorum F** — bk2 + mk2 (reusing their idle capacity from quorum A/B
  duty), client on mk2. ~2,000-2,900/s standalone.
- **Quorum G** — eug-2c + eul-4c, client on eug-2c itself. ~1,545-1,572/s
  standalone (§10, corrected after an initial badly-placed-client
  measurement) — not yet in the aggregate total above.

Production (`agreement-fabric-rs.service`, port 18993, 3-of-3 on bk2/mk2/
bk1) is untouched by any of this — separate port, separate process,
separate registry, verified `active` on all three nodes throughout.
