# Flux Protocol overview

Flux Protocol lets people publish deterministic resolution logic, run providers that can execute it, and record the claims and evidence produced by that work. Its central unit is a **resolver**: addressed logic that accepts a defined input and returns a defined claim.

The protocol separates several questions that conventional platforms often collapse:

1. What logic was requested?
2. Which provider offered to execute it?
3. What did the parties agree to?
4. What result and evidence were produced?
5. Which authority, checker, or governance rule accepts that result?

That separation makes a signed claim inspectable. A signature establishes who signed an artifact; it does not, by itself, establish that the artifact is semantically true.

## What exists

Source inspection establishes a miner daemon, a network CLI, identity and record commands, an agreement lifecycle, resolver definitions, and fixed agreement-fabric inspection endpoints. Some deployment and admission paths still require manual host installation, and independent production activation has not been established by this documentation audit.

See the dated [status matrix](status.md) for the exact boundary. See the [evidence registry](evidence/registry.md) for the source behind each statement.

## Core flow

`Intent → Offer → Agreement → Fulfillment → Receipt`

An intent states desired work. Providers may answer with offers. An accepted offer becomes an agreement. Execution produces a fulfillment, and verification records a receipt. The [agreements guide](protocol/agreements.md) describes the stages without implying that every automation and compensation path is production-complete.

## Next steps

- New operator: [Quickstart](quickstart.md)
- Protocol evaluator: [Resolvers](protocol/resolvers.md)
- Production-readiness review: [Current status](status.md)
- Terminology check: [Glossary](glossary.md)

