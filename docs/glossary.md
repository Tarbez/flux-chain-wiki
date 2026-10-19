# Glossary

These terms are canonical for public copy and operator documentation.

**Flux Protocol** — the product and protocol name. Use this in titles, navigation, metadata, and explanatory copy.

**Flux Chain** — a legacy or technical name that may remain in historical artifacts, file names, storage keys, or compatibility surfaces. Do not use it as the current product name.

**Pattern** — a definition of a recognizable request or statement shape.

**Object** — addressed data evaluated or referenced by protocol logic.

**Resolver** — a rulebook launched as its own chain: a composition of capabilities plus its own grammar. (Until 2026-10-19 this read "addressed deterministic logic that accepts defined input and produces a claim"; that was the `flux-resolver` source model, CAP-004.) See [resolvers](protocol/resolvers.md).

**Capability** — a shared mechanism (multisig, signer, custody, ledger, escrow) published once on the registry ledger with a derived manifest: version, seam, test vectors, source hash. A resolver composes capabilities; it never carries its own copy. (Replaces the earlier "a declared operation a provider can perform".)

**Base chain** — the chain whose launch log is the registry ledger. It records which chains, resolvers and capabilities exist.

**Chain id** — the name a launch record gives a resolver's chain (`[a-z0-9]{3,32}`). A resolver's records name it.

**Registry ledger** — the launch log on the base chain: `ChainLaunch`, `ResolverLaunch` and `ResolverUpgrade`, `CapabilityLaunch` and `CapabilityUpgrade`. "Registered" means launched here. (An audited resolver family — `docs/resolver-audit.md` — is a different list: say "audited", not "registered", for it.)

**Launch record** — the one signed `ResolverLaunch` (or `CapabilityLaunch`) that creates a resolver's chain (or declares a capability).

**Control key** — the one key named at launch that may sign an upgrade. A resolver with no control key is immutable.

**Immutable** — launched with no control key (`GENESIS_PREV`): nobody, including its creator, can ever change its manifests or provider set.

**Offer manifest** — the blob a launch names that says what a resolver offers and which capabilities it composes.

**Grammar manifest** — the blob a launch names that defines the resolver's own record grammar; compiled at launch and enforced on every record.

**Test vectors** (conformance vectors) — sample records with their expected verdicts, emitted by a capability crate's own tests and published in its manifest.

**Provider proof** — the CID of a passing run of a capability's test vectors, carried on a provider's announce. Without it, a provider gets no seat on a resolver that composes that capability.

**Signer** (of a launch) — the key that signs the launch record; the launch takes a position on that key's own chain.

**Unspecified grammar** — a legacy grammar the network admits and reports as unspecified, without checking records against it.

**Claim** — a resolver's stated result. Its signature is its result; whether to rely on that resolver is decided before you send anything: its grammar, its capabilities, who can change it.

**Provider** — a process that serves a resolver's chain: it announces an address for the chain and, if the resolver composes capabilities, proves it runs them by passing their test vectors.

**Checker** — logic that evaluates a claim against defined rules or evidence.

**Authority cell** — an identified roster and threshold authorized for a specified decision.

**Agreement** — accepted terms connecting requested work, provider, execution, and evidence.

**Replication receipt** — evidence that identified data or work was replicated under stated conditions.

**Relational acceptance** — acceptance under identified relationships and rules; not universal truth. (Renamed 2026-10-10; the earlier term used retired vocabulary. Nothing accumulates toward acceptance here — a resolver shard signs, and the signature is the result.)

**Named network** — currently a miner-presence namespace. It is not a security boundary, account namespace, identity namespace, DAO namespace, or authoritative membership list.

**Published** — addressable and discoverable as a definition.

**Launched** — on the registry ledger, with a chain of its own.

**Served** — launched, and a provider is announcing for its chain (with proofs for every capability it composes). Replaces **Deployed** (earlier: "backed by an admitted active provider with fresh execution capacity").

## Measurements and records

These are the words the evidence pages (/stats, /stats/ledger, /stats/gpu, /resolvers,
/resolver-math) mark as glossary terms on first use.

**Node** — one machine in the fleet. It runs a chain-server or a resolver shard, and each node is measured on its own hardware.

**Fleet** — the machines this project runs the network on (the flx-* nodes). A fleet figure is a sum of measurements taken on each node, never one node's figure multiplied.

**Shard** — one resolver process that resolves a batch of signed intents and signs the result. A resolver scales by running more shards, about one per performance core.

**Replica** — a node that stores a signed result as it is, without re-verifying or changing it.

**Ed25519** — the signature scheme every record and result here is signed with. Verifying these signatures is most of the work a resolver does.

**CID** — content identifier: a record's address, derived from a hash of its bytes, so the same bytes always have the same address.

**Equivocation** — signing two different records at the same position of one's own chain. Each of the two is evidence against the signer, and the chain is frozen.

**K-of-N replication** — a record counts as durable once K of N peers hold it by its CID. The acknowledgement waits on those peers, never on a local disk write.

**Batch auction** — a batch of swap intents cleared together at one price, so a place in the batch cannot change what anyone pays.

**Soak** — a load run sustained for minutes, as opposed to a short burst.

**Segment** — a block of chain lines that 6 of the 10 configured signers certify together.

**Grammar** — the rules a record must follow to be admitted: which labelled boxes it holds and what each box may contain.

**Box** — one field of a record: a label, usually one letter, followed by packed text.

**Role letter** — the label that opens a box and says what the box is.

**Type-scoped shape** — a letter whose meaning depends on the record's type: the type declares it, instead of one meaning fixed for every record.

## Prohibited conflations

- Do not use `published` to mean `deployed`.
- Do not use `launched` to mean `served`.
- Do not use `signed` to mean `trustworthy`: a resolver's signature is its result, and trust in the resolver is decided by its grammar, its capabilities and who can change it.
- Do not use `discovered` to mean `admitted` or `authorized`.
- Do not use `network created` to mean identities, accounts, DAOs, or records are isolated.
- Do not use `source exists` to mean a public binary or production service is live.

