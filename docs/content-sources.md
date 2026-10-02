# Canonical content sources

Shared facts are authored once and referenced elsewhere. Public pages may summarize them but must not silently fork their meaning or status.

| Fact family | Canonical owner | Public-page rule |
| --- | --- | --- |
| Product name and terminology | `docs/glossary.md` | Use `Flux Protocol`; preserve legacy technical identifiers only when exact compatibility requires them. |
| Capability state | `docs/status.md` | Copy the status label and link to the matrix; do not invent softer equivalents such as “basically live.” |
| Evidence and observation date | `docs/evidence/registry.md` | Reference a record ID. Measurements require a benchmark record. |
| Public claim-to-evidence assignment | `docs/evidence/public-claim-inventory.md` | Locate the claim family before changing status or availability language. |
| Public-site state and content layers | `docs/ui-state-system.md` | Preserve Focus → Context → inner detail; never allow transition and reading layers to compete. |
| Miner prerequisites and start procedure | `docs/operators/prerequisites.md`, `docs/operators/run-from-source.md` | Do not publish a repository URL until CAP-009 is verified. |
| Named-network semantics and commands | `docs/operators/networks.md` | Always state that scope is miner presence only and not a security boundary. |
| Resolver semantics | `docs/protocol/resolvers.md` | Keep `published` and `deployed` distinct. |
| Agreement lifecycle | `docs/protocol/agreements.md` | Use the five canonical stages in order. |
| Authority and governance | `docs/protocol/authority.md`, `docs/protocol/governance.md` | Separate policy definition from activation evidence. |
| Benchmark method and result | `docs/protocol/benchmarks.md` plus a `BENCH-*` record | No unsupported numbers in manifests or marketing copy. |
| Route-specific presentation copy | `js/content/manifests/*.js` | Summarize canonical facts; do not become their source of truth. |
| Article-specific narrative | `js/content/articles/*.js` | Link evidence and avoid redefining status vocabulary. |

## Update rule

When implementation changes, update the evidence record first, then the status matrix, then any summaries in manifests or articles. A status-changing change is incomplete until all three agree.
