/* Applications that read Flux records but are NOT resolver chains yet.

   These six entries were the whole /resolvers directory until 2026-10-19, written by hand on
   2026-10-08, before a resolver became a chain of its own. None of them is on the registry
   ledger, so they are not counted anywhere as resolvers: the resolver chains and capabilities
   on /resolvers come from js/content/registry-snapshot.js, which is generated.

   Kept, collapsed under their own heading, until the owner decides their fate
   (docs/ux-audit/resolvers-content.md Q5: keep as "applications, not resolver chains yet", or
   drop). Each figure stays dated where it was measured. The stream entry’s former number was
   the chain layer’s, from a retired metric family, and is withdrawn rather than repeated. */
(function () {
  "use strict";
  function freeze(value) {
    if (value && typeof value === "object") { Object.keys(value).forEach(function (k) { freeze(value[k]); }); Object.freeze(value); }
    return value;
  }
  window.ArkResolverApplications = freeze({
    updated: "2026-10-08",
    applications: [
      {
        "slug": "defi-transfer",
        "name": "DeFi · cross-shard transfer resolver",
        "domain": "finance",
        "status": "deployed",
        "author": "defxn.com",
        "shortSummary": "Interprets three transfer shapes: Lever A TransferAtomic (same-shard, 1 op), Lever B TransferSend/Receive (cross-shard, 2 ops; the production path), and the legacy 4-op PREPARE/ACCEPT/COMMIT/FINALIZE (still accepted). Timeouts clear reservations via Refund.", // ALLOW-DEPRECATED-TERM: FINALIZE is the legacy wire opcode name, an identifier
        "implementation": "dense-wire::cross_shard",
        "yCodes": [
          "1A w/ Payload=TransferSend/Receive (Lever B), TransferAtomic (Lever A, same-shard), Prepare/Accept/Commit/Finalize (legacy 4-op)" // ALLOW-DEPRECATED-TERM: Finalize is the legacy wire opcode name, an identifier
        ],
        "measured": {
          "label": "Swaps per batch auction · one resolver shard · 10 replicas",
          "rate": 256,
          "unit": "swaps/batch",
          "source": "BENCH-012 (2026-10-10): two parties sign their intent, the shard resolves a batch (batched Ed25519 verification, nonce screen, uniform-price auction, AMM math on the residual) and SIGNS the result — that signature is the truth. Replicas store it without re-verifying. 15,360 swaps across 60 batches, broadcast to 10 live replicas, 60/60 audits passed, zero refusals. 100% matched internally at one clearing price with zero curve slippage.",
          "secondary": [
            {
              "label": "Batch latency",
              "rate": 13.874,
              "unit": "ms"
            },
            {
              "label": "Verify latency (batched Ed25519, 75% of a batch)",
              "rate": 10.403,
              "unit": "ms"
            },
            {
              "label": "Resolve latency (auction + AMM residual)",
              "rate": 2.173,
              "unit": "ms"
            },
            {
              "label": "Sign latency (the shard signing the result)",
              "rate": 0.0403,
              "unit": "ms"
            },
            {
              "label": "Bytes per signed result (LZMA2 across a run)",
              "rate": 180,
              "unit": "bytes"
            },
            {
              "label": "Replication cost to 10 replicas, per batch",
              "rate": 1801,
              "unit": "bytes"
            },
            {
              "label": "Audit cost",
              "rate": 3,
              "unit": "x Ed25519 verify"
            }
          ]
        },
        "openIssues": [
          "No independent security review"
        ]
      },
      {
        "slug": "pva-books",
        "name": "PVA · signed books, citations and reviews",
        "domain": "knowledge",
        "status": "deployed",
        "author": "pva-cli",
        "shortSummary": "Interprets paper-asset LEDGERENTRYs: title + abstract, citations/cited-by graph, rating and reviews. Produces downloadable archive bundles (.book.zip) from a paper CID. Backs books.defxn.com.",
        "implementation": "pva-cli (Node, @deadark/pva-cli)",
        "yCodes": [
          "F-ASSET-ACADEMIA (paper record)"
        ],
        "measured": {
          "label": "Record lookups per second (local registry)",
          "rate": null,
          "unit": "reads/s",
          "source": "not yet published; the pva-registry is HTTP-serve under one process. A pulse is pending."
        },
        "openIssues": [
          "No published throughput benchmark",
          "In-browser signing not available (read-only browse)"
        ]
      },
      {
        "slug": "nft-collections",
        "name": "Collections · upgradeable NFT-style assets",
        "domain": "assets",
        "status": "draft",
        "author": "nft-cli",
        "shortSummary": "Collection creation, asset mint, in-place upgrade with reason + timestamp, ownership transfer, native listings. 24/24 tests passing locally; registry not yet deployed to the fleet.",
        "implementation": "nft-cli (Node, local registry on 18900)",
        "yCodes": [
          "Collection + Asset records (nft-cli grammar)"
        ],
        "measured": {
          "label": "Registry writes per second (local)",
          "rate": null,
          "unit": "writes/s",
          "source": "not measured on the fleet; the registry has not been deployed yet"
        },
        "openIssues": [
          "Registry not yet deployed to any flx-* node",
          "No signing in the browser; CLI-only mint/transfer",
          "Image content bytes not stored (CID shown as text)"
        ]
      },
      {
        "slug": "market-listings",
        "name": "Market · native marketplace listings",
        "domain": "commerce",
        "status": "draft",
        "author": "nft-cli",
        "shortSummary": "Lists active listings across collections; joins each listing with its referenced asset. Reads only — purchases happen through CLI-signed transactions, not browser.",
        "implementation": "nft-cli listings API",
        "yCodes": [
          "Listing records (nft-cli grammar)"
        ],
        "measured": {
          "label": null,
          "rate": null,
          "unit": null,
          "source": "read-only aggregator over nft-cli; speed is bounded by nft-cli, not by the chain."
        },
        "openIssues": [
          "Depends on nft-cli deployment"
        ]
      },
      {
        "slug": "stream",
        "name": "Stream · live media / radio hosting",
        "domain": "realtime",
        "status": "draft",
        "author": "stream-cli",
        "shortSummary": "Live media / radio hosting on the FXN mesh — real identity, signed invite flow, no central server. STREAM_OPEN declares a stream on the host’s chain; STREAM_INVITE grants listener access; STREAM_CLOSE ends it. Packet transport over Reticulum/RNS is planned.",
        "implementation": "stream-cli (Node, @deadark/stream-cli · 3/3 tests passing)",
        "yCodes": [
          "1A w/ payload kind=stream-open/invite/revoke/close"
        ],
        "measured": {
          "label": "Metadata path (chain-backed open/invite/close)",
          "rate": null,
          "unit": "records/s",
          "source": "Resolver semantics tests pass (3/3). No throughput of its own has been measured; the figure once shown here was the chain layer’s, from a retired metric family, and is withdrawn. Packet transport over Reticulum/RNS not yet wired."
        },
        "openIssues": [
          "Reticulum/RNS packet transport not yet integrated — HTTP fallback only",
          "Chain feeder (subscribe to flx-* chain-server for STREAM_* records) stubbed",
          "No payment integration with the DeFi resolver yet (planned: Spend records per listening tick)"
        ]
      },
      {
        "slug": "dao-governance",
        "name": "DAO · governance log and proposal resolution",
        "domain": "governance",
        "status": "deployed",
        "author": "ark-miner-cli",
        "shortSummary": "Interprets governance log entries pinned to IPFS: TLM proposals, signer rotations, roster changes. Backs dao.defxn.com. Resolver is HTTP-served; log is append-only and IPFS-pinned.",
        "implementation": "ark-miner-cli src/state/*-governance-log.js",
        "yCodes": [
          "TLM governance records, signer governance records"
        ],
        "measured": {
          "label": "Governance log appends per second",
          "rate": null,
          "unit": "appends/s",
          "source": "low-volume by design; not benchmarked."
        },
        "openIssues": [
          "Measured throughput not published (very low volume by design)"
        ],
        "note": "Not the dao resolver chain listed above: this is the governance log read by ark-miner-cli."
      }
    ]
  });
})();
