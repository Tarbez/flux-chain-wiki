# Local Mesh Explorer contract

The public-site route `#/explorer` is a read-only observer of one local Flux Miner. It is not a global block explorer, consensus height, proof of network membership, or production monitoring service. The owner selected **local Miner only for now**; the endpoint is fixed to `http://127.0.0.1:8766`. No public URL or fallback data is configured.

## Connection and data boundary

- The page calls the existing Explorer API v1 endpoints: `GET /catalog`, `GET /health`, `POST /query`, `POST /record`, and `GET /topology`, all under `/explorer/v1`.
- It lists only returned sources that permit enumeration; records are bounded to 20 per observation. Exact-ID lookup and record detail are separate inner actions. Operator topology is behind a disclosure and requires an operator key.
- The `accounts` source is exact-ID-only. The account page may query it only after an identity record returns a signed `accountId`; it never enumerates accounts or guesses a binding.
- The key is held in the page input only, used solely in requests to the fixed local Miner, and cleared on disconnect or route cleanup. Do not paste a production credential into a preview origin unless that origin is trusted.
- A failed request leaves the page visibly disconnected. No fixture records, synthetic heights, or guessed peers replace live data. Returned partial/verification states remain visible.
- The site's Content Security Policy permits connections only to `127.0.0.1:8766` and `localhost:8766`. The browser's same-origin/CORS and mixed-content rules still apply.

The Miner currently allows browser origins `http://127.0.0.1:4173` and `http://localhost:4173` by default. A different local preview origin, such as port 4177, must be explicitly added to the Miner's `explorerAllowedOrigins` configuration. The site does not loosen the Miner's policy. Source: `ark-miner-cli/docs/flux-explorer-api-v1.md` in the local Flux workspace.

## Verification and next gate

The route, navigation entry, and SEO metadata are covered by the site route tests. Browser QA confirmed a legible mobile connection surface and an honest offline/CORS message. A successful live contract run remains open until an approved Miner is running with this preview origin allowed. Before making the explorer public, decide what operator-only source classes and credentials may be exposed from a public origin; do not simply change the fixed URL to a remote host.
