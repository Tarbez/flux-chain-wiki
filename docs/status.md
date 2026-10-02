# Capability status

Observed: 2026-09-30. This matrix describes what the documentation audit could establish from the local source repositories. It is not a release announcement.

## Status vocabulary

- `Live` — implemented and verified through a named path.
- `Partial` — implemented with a named missing boundary.
- `Not built` — no production capability exists.
- `Unverified` — the audit could not establish the current state.

Missing evidence is `Unverified`, not `Not built`.

| Capability | Status | Established boundary | Canonical evidence record |
| --- | --- | --- | --- |
| Miner daemon and local start command | Partial | Implemented in source; this audit did not perform a fresh independent-host run. | CAP-001 |
| `flux-miner` packaged command | Partial | Declared by the package; public binary distribution is unverified. | CAP-001 |
| Identity and record CLI commands | Partial | Command contracts exist in source; current public service availability is unverified. | CAP-002 |
| Named-network create/list | Partial | Command contract exists; scope is miner presence only and is not a security boundary. | CAP-003 |
| Resolver definition and deterministic claim model | Live | Implemented and documented in the resolver source model. | CAP-004 |
| Resolver publication | Partial | Addressable publication exists; publication does not prove deployed capacity. | CAP-004 |
| Resolver deployment | Partial | Requires an admitted active provider with fresh capacity; host installation remains manual. | CAP-005 |
| Agreement lifecycle | Partial | Intent through receipt is implemented; full production automation is not established. | CAP-006 |
| Agreement-fabric inspection endpoints | Partial | Fixed endpoints are defined; public availability is unverified. | CAP-006 |
| Authority policy | Partial | Policy structure and thresholds exist; production activation is separate and unverified. | CAP-007 |
| Independent production activation | Unverified | Required readiness, hostile-matrix, and signed-soak artifacts are not registered here. | CAP-008 |
| Public repository URLs and packaged downloads | Unverified | No durable canonical public location was established in this audit. | CAP-009 |
| Public benchmark results | Unverified | No complete benchmark record is registered. | BENCH-001 |

Evidence record details are in the [registry](evidence/registry.md). Change a status only when that record is updated with a reproducible source or artifact.

