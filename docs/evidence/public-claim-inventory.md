# Public claim inventory

Observed: 2026-09-30. This inventory assigns every public claim family to a canonical evidence record. It is the review queue for manifests, routed pages, and articles; it does not make an unverified claim true.

| Public surface | Claim family | Canonical record | Allowed public treatment |
| --- | --- | --- | --- |
| Home and protocol overview | Miner, directory, resolver, and agreement availability | CAP-001 through CAP-006 | Use the exact status from `docs/status.md`; source presence is normally `Partial`. |
| Resolver page | Resolver definition, publication, and deployment | CAP-004, CAP-005 | Keep `published` distinct from `deployed`; signatures establish attribution, not truth. |
| Reference resolvers | Named deployed examples | REF-001 through REF-004, CAP-009 | Say `Reference evidence pending` until an identifier, source, date, and artifact are registered. |
| Source-run page | Runtime, command name, and public distribution | CAP-001, CAP-009 | Document Node.js 22+ and source commands; public URLs and binaries remain `Unverified`. |
| Networks pages and network article | Create/list commands and isolation boundary | CAP-003 | State miner-presence scope and non-security-boundary warning every time status is summarized. |
| Agreement lifecycle pages | Intent-to-receipt model and inspection endpoints | CAP-006 | Describe implementation as `Partial`; do not imply settlement or full production automation. |
| Authority pages and authority article | Cell derivation and substrate policy | CAP-007, CAP-008 | Policy structure may be described; activation needs a separate record. |
| Governance pages and governance article | Mesh operations versus network DAO | CAP-007, CAP-008 | Separate the rosters; named live networks require reference evidence. |
| Benchmark page and retired-chain article | Throughput, release comparisons, and soak results | BENCH-001 | No number may be presented as verified until workload, environment, revision, raw artifact, and digest are registered. |
| Interactive model and lab | Authority, lifecycle, and network mental models | CAP-003, CAP-006, CAP-007 | Label prominently as illustrative and not live network data. |

## Review rule

Before publishing a changed claim, locate its row here, confirm the evidence record, and compare its status with `docs/status.md`. If the record is absent or incomplete, the public text must say `Unverified`, `Partial`, or `evidence pending` instead of implying live availability.

## Naming exception

`Flux Chain Admin.command`, `flux-chain.ark`, legacy storage keys, and compatibility identifiers retain their exact technical names. They are not product-name alternatives. The checked-in `js/admin/auth.js` bundle also contains an inert legacy default from an unavailable historical build path; the active admin passes `Flux Protocol admin` explicitly, and the authored bundle entry uses `Flux Protocol`. Rebuild the generated bundle when its shared build dependency is restored.

