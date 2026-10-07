# Flux Protocol documentation

Flux Protocol is a resolver-based system for publishing patterns, operating providers, and producing checkable claims. Start with the path that matches what you need to do.

## Choose a path

- **Understand the protocol:** read the [overview](overview.md), then the protocol guides for [resolvers](protocol/resolvers.md), [agreements](protocol/agreements.md), [authority](protocol/authority.md), and [governance](protocol/governance.md).
- **Run the software:** follow the [quickstart](quickstart.md), check the [prerequisites](operators/prerequisites.md), and use the complete [run-from-source procedure](operators/run-from-source.md).
- **Operate a named network:** read [networks](operators/networks.md) before creating one. A named network currently partitions miner-presence records; it is not a security boundary.
- **Evaluate readiness:** inspect [current status](status.md), [verification](operators/verification.md), the [evidence registry](evidence/registry.md), the [public claim inventory](evidence/public-claim-inventory.md), and the [mainnet readiness gap inventory](mainnet-readiness.md) (devnet/mainnet separation, governance, durability, ops).
- **Review the interface contract:** use the [state and layer system](ui-state-system.md) for Focus, Context, inner detail, and transition behavior.
- **Plan the public-site redesign:** read the [guided-knowledge audit and batch plan](ux-storytelling-redesign-audit.md) for all 31 routes, color/shape semantics, progressive disclosure, and batch acceptance checks.
- **Resolve a problem:** use [troubleshooting](operators/troubleshooting.md) and collect the evidence requested there.

## Documentation contract

Every capability statement uses one of four labels: `Live`, `Partial`, `Not built`, or `Unverified`. The definitions live in [status](status.md). Shared terminology lives in the [glossary](glossary.md). When a page and a canonical document disagree, the canonical owner listed in [content sources](content-sources.md) wins.

Repository URLs, packaged releases, production activation, and published benchmark artifacts remain `Unverified` until a durable public source is recorded. These docs do not turn source inspection into a production-readiness claim.
