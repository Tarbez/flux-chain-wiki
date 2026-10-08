# BENCH-005: path to one million accepted operations a second

Observed 2026-10-08. This is an audit and implementation boundary, not a
one-million-ops/s result.

## Operation counted

One operation means one signed LEDGERENTRY admitted by the chain resolver:
grammar accepted, signature verified, holder and position checked, payload
law checked, content address computed, replication policy satisfied, and
chain state advanced. A parsed manifest, decoded symbol, signature, replayed
record, or batch is not counted as an accepted operation.

## What the hot path actually uses

The chain-server hot path does not parse or serialize JSON. Its frame is:

    <PAYLOAD_TAG><TAB><DENSE_FLX_MANIFEST><LF>

The local cold-start cache appends that same dense text. It does not wrap the
manifest in JSON and does not call fsync per operation; flush() only hands
buffered bytes to the kernel. JSON remains in control-plane surfaces such as
the monitor response and optional IPFS pin request, and JSON serialization is
still the sealed hashing form in stores that use stable_content_cid. None of
those is the measured chain admission loop.

Flux Compact is also not currently in this loop. The table-coded codec in
flx-learning/src/codec.rs encodes typed language CompactEntry references such
as W392 and verifies their table-pinned expansion. It is not a generic
compressor for signed LEDGERENTRY manifests. Applying it unchanged would
change the object being encoded and would not remove signature verification,
chain-state checks, hashing, or replication. The chain manifest is already a
dense role-letter form, and most of its bytes are high-entropy identities,
content addresses, and signatures that a shared vocabulary cannot collapse.

## Measurements

Device: Apple M2, 8 physical/logical cores, 8 GiB RAM. Release builds. Inputs
were pre-built before each timed admission loop. No live ingest job was
running on the measured volume.

| Layer | Measured result | Scope |
| --- | ---: | --- |
| Bare grammar split, 674-byte two-signature AGREEMENT | 680 ns/op | Parser primitive only |
| Role resolvers, same AGREEMENT | 1,293 ns/op | Resolver primitive only |
| Full grammar admission, same AGREEMENT | 2,024 ns/op | No signature verification |
| Two Ed25519 verifications, same AGREEMENT | 69,117 ns/op | Crypto only |
| Canonical DenseManifest::parse | 306,665 ops/s, 3.3 µs/op | One core, parse only |
| Chain parse/admit without signature | 7,786 ns/op | One core |
| Chain admission, per-operation verify | 21,609 ops/s, 46,277 ns/op | One core, memory ledger |
| Chain admission, burst 128 across 64 holders | 40,836 ops/s, 24,488 ns/op | One core, memory ledger |
| Burst memory baseline | 45,059 ops/s | 32 holders × 500 |
| Burst local cold-start cache | 42,871 ops/s | 4.9% below memory |
| Simulated peer handoff, 2-of-3 | 46,105 ops/s | In-process callbacks; no network RTT |
| Six-node public soak | 12,403 ops/s | 303 s, 3,760,000 accepted, zero failures |
| Six-node public short burst | 79,654 ops/s | 868 ms, historical peak only |

Commands:

    cargo run --release --bin dense-wire-micro
    CHAIN_BENCH_N=50000 CHAIN_BENCH_HOLDERS=64 \
      CHAIN_BENCH_PER_HOLDER=1000 CHAIN_BENCH_BURST=128 \
      cargo test --release --lib bench_chain_throughput -- --ignored --nocapture
    cargo test --release --lib chain::tests::bench_replication_cost \
      -- --ignored --nocapture --exact
    cargo test --release -p flux-protocols --test defi_throughput_bench \
      defi_manifest_parse_only_cost -- --ignored --nocapture --exact --test-threads=1

## Finding

The parser is not the accepted-operation ceiling. The canonical parser already
does about 306,665 ops/s on one core, so four equally efficient parser workers
could cross one million parsed manifests a second. That is not one million
accepted operations.

At the measured 24,488 ns/op burst admission cost, one million fully admitted
operations a second requires at least 24.5 continuously saturated
core-equivalents before network or real replication overhead. The eight-core
M2's arithmetic ceiling at that per-core rate is about 327,000 ops/s. This is
a capacity calculation from a measured per-core cost, not a benchmark result.

The first scaling blocker is architectural: chain_server::flush_batch holds
one Arc<Mutex<Ledger>> guard around the complete admit_burst. Independent
holders therefore serialize at the server boundary even though the ledger
contains per-holder locks. Adding nodes exposes more single-core lanes; it
does not make one node use all of its cores.

The second cost is Ed25519 verification. On this device, batch verification
settles around 15.5–17.3 µs per signature before parser, hashing, state, or
storage work. FLX table coding can reduce repeated vocabulary and bytes where
a real shared table exists; it cannot compress away a fresh signature or make
its verification free.

## Scoped implementation

1. Move LEDGERENTRY parsing and role law into the canonical
   flux-protocols/flux-core path. Remove the prototype's hand-built
   Y=LEDGERENTRY/J exception once the registered parser accepts it. Keep one
   parser and one resolver implementation.
2. Replace the server-wide ledger mutex with deterministic holder sharding.
   Route by G to a bounded worker queue; each shard owns its chain state and
   append stream. Preserve strict order inside one holder while different
   holders run in parallel.
3. Batch verification inside each worker and run independent batches across
   cores. Use one signature-validity rule in per-operation and batch modes;
   do not promote the optimization while their acceptance sets differ.
4. Reuse the canonical raw dense-manifest store and its bulk
   append_raw_lines/group-commit boundary. Do not add JSON wrapping, hex
   envelopes, or per-operation fsync.
5. Treat compact transport as a separate measured experiment. First record
   bytes/op, encode ns/op, decode ns/op, and end-to-end ops/s for the identical
   signed payload. Promote it only if it improves the dominant cost; do not
   substitute the language CompactEntry codec for a financial record.
6. Add stage counters and histograms for queue wait, decode, parse/resolve,
   batch verify, state transition, append, replication wait, and reply. The
   fleet monitor should display accepted ops/s and failures, with stage detail
   available to operators.
7. Re-run the six-node test for at least five minutes with one signed
   LEDGERENTRY per operation, real configured replication, zero failures,
   and replay equality after restart. Only that result may replace 12,403
   ops/s on the public site.

## Promotion gate

The million-ops claim remains unverified until the full definition above
measures at or above 1,000,000 ops/s. Parser-only, replay, short-burst,
unsigned, stub-verifier, and calculated aggregate figures must remain labeled
as such.
