/* Registry of FXN resolvers currently published or in registered design.
 *
 * The chain is agnostic grammar: a `LEDGERENTRY` carries a `Y` code (the
 * manifest type) plus content-addressed `C[]` references. Only one letter
 * (`J`, the chain position) and the signature are universal; everything
 * else is interpreted by the RESOLVER registered against that `Y` code.
 *
 * So speed is per-resolver, not per-chain. Transfer-finalization throughput
 * belongs to the DeFi resolver. Paper citation lookups belong to the PVA
 * resolver. The chain itself only promises grammar admission + per-identity
 * ordering + K-of-N peer replication of the CIDs.
 *
 * This file is the directory. /resolvers reads it. In production it will
 * also back resolve.defxn.com once the subdomain is wired through Caddy.
 */
(function () {
  'use strict';
  window.ArkResolverRegistry = Object.freeze({
    updated: '2026-10-08',
    note: 'Each entry carries its own measured throughput; the chain layer is listed only for context.',
    chain: Object.freeze({
      slug: 'chain',
      name: 'FXN chain (grammar + ordering only)',
      role: 'substrate',
      domain: 'universal',
      yCodes: ['1A LEDGERENTRY'],
      status: 'deployed',
      author: 'defxn.com',
      shortSummary: 'Admits any LEDGERENTRY whose grammar is well-formed, signature verifies under G, and position J is next on the holder\'s own chain. Carries no payload semantics.',
      measured: Object.freeze({
        label: 'Grammar-only admit path',
        rate: 83225,
        unit: 'ledger ops/s',
        source: 'one M-series Mac core, 8 threads, admit_burst with verify_batch, 2026-10-08'
      })
    }),
    resolvers: Object.freeze([
      Object.freeze({
        slug: 'defi-transfer',
        name: 'DeFi · cross-shard transfer resolver',
        role: 'resolver',
        domain: 'finance',
        yCodes: ['1A w/ Payload=TransferSend/Receive (Lever B), TransferAtomic (Lever A, same-shard), Prepare/Accept/Commit/Finalize (legacy 4-op)'],
        status: 'deployed',
        author: 'defxn.com',
        shortSummary: 'Interprets three transfer shapes: Lever A TransferAtomic (same-shard, 1 op), Lever B TransferSend/Receive (cross-shard, 2 ops; the production path), and the legacy 4-op PREPARE/ACCEPT/COMMIT/FINALIZE (still accepted). Timeouts clear reservations via Refund.',
        implementation: 'dense-wire::cross_shard',
        measured: Object.freeze({
          label: 'Swaps per batch auction \u00b7 one resolver shard \u00b7 10 replicas',
          rate: 256,
          unit: 'swaps/batch',
          source: 'BENCH-012 (2026-10-10): two parties sign their intent, the shard resolves a batch (batched Ed25519 verification, nonce screen, uniform-price auction, AMM math on the residual) and SIGNS the result \u2014 that signature is the truth. Replicas store it without re-verifying. 15,360 swaps across 60 batches, broadcast to 10 live replicas, 60/60 audits passed, zero refusals. 100% matched internally at one clearing price with zero curve slippage.',
          secondary: Object.freeze([
            { label: 'Batch latency', rate: 13.874, unit: 'ms' },
            { label: 'Verify latency (batched Ed25519, 75% of a batch)', rate: 10.403, unit: 'ms' },
            { label: 'Resolve latency (auction + AMM residual)', rate: 2.173, unit: 'ms' },
            { label: 'Sign latency (the shard signing the result)', rate: 0.0403, unit: 'ms' },
            { label: 'Bytes per signed result (LZMA2 across a run)', rate: 180, unit: 'bytes' },
            { label: 'Replication cost to 10 replicas, per batch', rate: 1801, unit: 'bytes' },
            { label: 'Audit cost', rate: 3, unit: 'x Ed25519 verify' }
          ])
        }),
        openIssues: ['No independent security review']
      }),
      Object.freeze({
        slug: 'pva-books',
        name: 'PVA · signed books, citations and reviews',
        role: 'resolver',
        domain: 'knowledge',
        yCodes: ['F-ASSET-ACADEMIA (paper record)'],
        status: 'deployed',
        author: 'pva-cli',
        shortSummary: 'Interprets paper-asset LEDGERENTRYs: title + abstract, citations/cited-by graph, rating and reviews. Produces downloadable archive bundles (.book.zip) from a paper CID. Backs books.defxn.com.',
        implementation: 'pva-cli (Node, @deadark/pva-cli)',
        measured: Object.freeze({
          label: 'Record lookups per second (local registry)',
          rate: null,
          unit: 'reads/s',
          source: 'not yet published; the pva-registry is HTTP-serve under one process. A pulse is pending.'
        }),
        openIssues: ['No published throughput benchmark', 'In-browser signing not available (read-only browse)']
      }),
      Object.freeze({
        slug: 'nft-collections',
        name: 'Collections · upgradeable NFT-style assets',
        role: 'resolver',
        domain: 'assets',
        yCodes: ['Collection + Asset records (nft-cli grammar)'],
        status: 'draft',
        author: 'nft-cli',
        shortSummary: 'Collection creation, asset mint, in-place upgrade with reason + timestamp, ownership transfer, native listings. 24/24 tests passing locally; registry not yet deployed to the fleet.',
        implementation: 'nft-cli (Node, local registry on 18900)',
        measured: Object.freeze({
          label: 'Registry writes per second (local)',
          rate: null,
          unit: 'writes/s',
          source: 'not measured on the fleet; the registry has not been deployed yet'
        }),
        openIssues: ['Registry not yet deployed to any flx-* node', 'No signing in the browser; CLI-only mint/transfer', 'Image content bytes not stored (CID shown as text)']
      }),
      Object.freeze({
        slug: 'market-listings',
        name: 'Market · native marketplace listings',
        role: 'resolver',
        domain: 'commerce',
        yCodes: ['Listing records (nft-cli grammar)'],
        status: 'draft',
        author: 'nft-cli',
        shortSummary: 'Lists active listings across collections; joins each listing with its referenced asset. Reads only — purchases happen through CLI-signed transactions, not browser.',
        implementation: 'nft-cli listings API',
        measured: Object.freeze({
          label: null,
          rate: null,
          unit: null,
          source: 'read-only aggregator over nft-cli; speed is bounded by nft-cli, not by the chain.'
        }),
        openIssues: ['Depends on nft-cli deployment']
      }),
      Object.freeze({
        slug: 'stream',
        name: 'Stream · live media / radio hosting',
        role: 'resolver',
        domain: 'realtime',
        yCodes: ['1A w/ payload kind=stream-open/invite/revoke/close'],
        status: 'draft',
        author: 'stream-cli',
        shortSummary: 'Live media / radio hosting that runs 100% on the FXN mesh — real identity, signed invite flow, no central server. STREAM_OPEN declares a stream on the host\'s chain; STREAM_INVITE grants listener access; STREAM_CLOSE ends it. Packet transport over Reticulum/RNS (planned); metadata uses the chain backed by the 1,712,006/s certified-segment ceiling.',
        implementation: 'stream-cli (Node, @deadark/stream-cli · 3/3 tests passing)',
        measured: Object.freeze({
          label: 'Metadata path (chain-backed open/invite/close)',
          rate: 82863,
          unit: 'records/s (bounded by chain)',
          source: 'Resolver semantics tests pass (3/3). Metadata throughput is bounded by the chain layer\'s finalized-record admit path — 82,863 finalized records/s today on the real 10-node mesh with Lever A + Lever B + Lever C. Packet transport over Reticulum/RNS not yet wired.'
        }),
        openIssues: [
          'Reticulum/RNS packet transport not yet integrated — HTTP fallback only',
          'Chain feeder (subscribe to flx-* chain-server for STREAM_* records) stubbed',
          'No payment integration with the DeFi resolver yet (planned: Spend records per listening tick)'
        ]
      }),
      Object.freeze({
        slug: 'dao-governance',
        name: 'DAO · governance log and proposal resolution',
        role: 'resolver',
        domain: 'governance',
        yCodes: ['TLM governance records, signer governance records'],
        status: 'deployed',
        author: 'ark-miner-cli',
        shortSummary: 'Interprets governance log entries pinned to IPFS: TLM proposals, signer rotations, roster changes. Backs dao.defxn.com. Resolver is HTTP-served; log is append-only and IPFS-pinned.',
        implementation: 'ark-miner-cli src/state/*-governance-log.js',
        measured: Object.freeze({
          label: 'Governance log appends per second',
          rate: null,
          unit: 'appends/s',
          source: 'low-volume by design; not benchmarked.'
        }),
        openIssues: ['Measured throughput not published (very low volume by design)']
      })
    ])
  });
})();
