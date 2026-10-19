# Resolvers

A resolver is a rulebook with its own chain. It is launched by one signed record, built from shared capabilities that anyone can check, and it refuses any record that does not fit the grammar it published at launch.

Observed 2026-10-19 from `defxn-defi-rs` at `e167065`. Evidence: CAP-010 to CAP-016 in the [evidence registry](../evidence/registry.md); state labels in [status](../status.md). "Built" below means in the code with tests; nothing here is a production claim. Design sources (in `defxn-defi-rs/dense-wire/docs/design/`): `architecture.md` (`arch`) and `global-resolvers.md` (`GR`).

This page replaces the 2026-09-30 definition ("addressed, deterministic logic that accepts defined input and produces a claim", CAP-004). That definition described the `flux-resolver` source model; it is kept in the evidence registry as recorded and no longer describes current resolver semantics.

## 1. Three layers

| Layer | What it is | Its one rule |
| --- | --- | --- |
| Kernel (the base chain) | Grammar and parsing, per-signer chains, replication to K of N providers, the provider roster, blobs, and the **registry ledger**: the launch log of chains, resolvers and capabilities. | It never learns a business record kind. |
| Capabilities | Pure shared mechanisms with no I/O: multisig (N-of-M signatures), signer, custody, ledger, escrow. | Deterministic verify/apply over records; launched on the base chain with grammar, conformance vectors and a source hash; addressable by CID. |
| Resolvers | Processes, each on its own chain: dao, acl, custody, treasury, stake, balance, domain, records, payout, slash, compute, storage, and anything a builder ships. | A resolver is a composition of capabilities plus its own grammar. It names its mechanisms; it never contains them. |

Source: `arch` §3. Moving the remaining business kinds off the kernel is planned (`arch` §9, §10 wave 5).

The current list of resolver chains and capabilities is generated, not written: `js/content/registry-snapshot.js` (by `scripts/snapshot-registry.mjs`), shown on [/resolvers](/resolvers). Do not copy its counts into prose; link to it.

## 2. Launch: one record, one chain

A resolver is launched by one signed `ResolverLaunch` (`KRESOLV1`) on the base chain (`GR` Phase 0, 21; `arch` §6 B2–B3). Before signing, the launch publishes four content-addressed blobs:

- a provider set (default: the launcher's key);
- speed parameters (default `requiredK 1`);
- an **offer manifest**: what the resolver offers, and which capabilities it composes (`composes`);
- a **grammar manifest** (`flx-resolver-grammar/1`).

The record names a new chain id (`[a-z0-9]{3,32}`), those four CIDs, and a **control authority**: one key, or `GENESIS_PREV` for immutable. The resolver's chain gets its own chain id, its own provider set and its own history; `RESOLVER_RECORDS` returns that history oldest first (`GR` Phase 24). A resolver chain has no native economy; its stake floor is 0.

`RESOLVER_LIST` reads the registry: every resolver with its manifests, its control key (or `-` for immutable), its declaration head, and `native` or `third-party`, decided by the node's own allowlist and never by the resolver's claim (`GR` Phase 1, 1.5).

**Hazard.** A launch is a position on the launcher's own signer chain. Signing a second, different record at the same position is equivocation and freezes that key for good (`GR` Phase 21, 25). Launch once per key, or use a fresh key.

## 3. Composition and what "verified on chain" means

A capability is declared on the base chain by a signed `CapabilityLaunch` (`KCAP1`): its id, the CID of its manifest, and a control key or `GENESIS_PREV`. The manifest (`flx-capability-manifest/1`) is derived from the crate, never written by hand: version, seam, **conformance vectors** emitted by the crate's own tests, and the source hash (`arch` §3, §6 B3).

"Verified on chain" means three checkable facts (`arch` §3):

| Fact | Meaning | State |
| --- | --- | --- |
| (a) | The manifest's vectors come from the crate's own test suite. | Built |
| (b) | A provider serving a resolver that composes capability X must pass X's vectors (`cap-prove`); the roster records the proof CID. | Built |
| (c) | A resolver launch that composes a capability that is not launched, or is pinned to a stale manifest, is refused (`CapabilityNotLaunched`, `CapabilityManifestMismatch`). | Built |

At the 2026-10-18 devnet restart, `CAPABILITY_LIST` returned 0: launching the capabilities is the owner's step (`GR` Phase 31).

## 4. Grammar enforcement

A resolver's grammar is compiled at launch and enforced on every `ResolverRecord` after the signature check and **before the record goes to peers**. A record naming an unknown chain is refused; a record that violates the grammar is refused with the failure, what is missing, and the remedy (`arch` §6 B2).

A grammar that claims the schema but cannot be compiled refuses the launch. A legacy tab-text grammar is admitted and reported as `Unspecified`: the network admits its records without checking them. The snapshot on /resolvers shows which resolvers are which, and from which commit.

## 5. Upgrades and immutability

- A resolver is **immutable by default**. With no control key, nobody can ever change its manifests or provider set.
- With a control key, only that key can sign a `ResolverUpgrade` (`KRESOLVUP1`). An upgrade **supersedes** the declaration head and never rewrites it; every record signed under the old grammar stays valid (`GR` §4).
- Whether a resolver can change, and who can change it, is a public fact in `RESOLVER_LIST`.
- Capabilities follow the same rule (`KCAPUP1`). A capability controlled by a DAO is refused for now (`arch` §6 B3).

## 6. Launched is not served

Launching a resolver does not make it answer. A resolver is served only while a provider announces an address for its chain (`PROVIDER_ANNOUNCE`) and appears in `CHAIN_PROVIDERS`. If the resolver composes capabilities, the announce must carry a proof CID for each of them, or the provider gets no seat (`arch` §3 fact (b)).

The announce has a one-hour deadline. The generic resolver host (`flx-resolver-host`, merged 2026-10-19, CAP-016) re-announces periodically; it has not yet been observed on a running network.

Use `launched` and `served`; do not use one to mean the other. (This replaces the earlier rule "published is not deployed".)

## 7. Trust boundary

A resolver's signature is its result. Whether to rely on that resolver is decided before you send anything: its grammar, its capabilities, and who can change it. Each of those is a public, checkable fact — the grammar manifest, the composed capabilities and their vectors, and the control field in `RESOLVER_LIST`.

A signature does not make a resolver trustworthy; reading what it is, before relying on it, does. Explore re-checks every CID and Ed25519 signature in the browser, so the reading does not depend on trusting the page.

## 8. Deploying and inspecting

- Deploy: deploy.defxn.com (the `deploy` repository) builds, previews and signs launch and upgrade records after you review the exact unsigned record; or a resolver's own CLI (`<x>-resolver register|upgrade`). Walkthrough: [/how-deployment-works](/how-deployment-works).
- Inspect: explore.defxn.com (the `explore` repository) shows each resolver's control, manifests, providers with the proved column, and its whole history.
- Both run locally on the development network; public hosting is not established (CAP-014).

Operator checks: [verification](../operators/verification.md), [troubleshooting](../operators/troubleshooting.md). Consult [current status](../status.md) before presenting a resolver as available to the public.

## 9. Planned, not built

- One deployer for sites, apps, databases, packages, modules and repositories, each as records on its own resolver chain (`arch` §10 wave 4).
- Audit and bounty resolvers, and "require audited capabilities" on a launch.
- Service pools.
- Moving business record kinds off the kernel; per-file size budgets (wave 5).
- Gaming capabilities (`cap-match`, `cap-commit`) and the fee and anti-spam model for records (wave 6).

Each is `Not built` in [status](../status.md) until its evidence record says otherwise.

## Diagrams (specs for the page blocks)

The page manifests carry these as `meta.diagrams` (`js/content/manifests/resolver.js`, `deployment.js`, `dao.js`, `chain.js`), for the block that draws them. Each is captioned "Illustration · relationships, not live state", and every capability or resolver it names is read from the registry snapshot, so a picture cannot claim a capability the snapshot does not hold.

1. **Layers** (`resolver-layers`): base chain band (launch a resolver, upgrade it, launch a capability, records) → capabilities band (one tile per capability, a vectors badge and a source-hash stub) → resolver chains band (`dao`, `treasury`, `your-resolver`, with lines down to what each composes). One rule per band as caption. On phones the bands stack and the lines become chips.
2. **Deploy flow** (`deploy-flow`): grammar → capabilities → control (immutable / one key) → review and sign → serve (provider with a proof badge) → explorer, with two refusal exits carrying their exact names: "grammar does not compile" (before signing) and `CapabilityNotLaunched` (at the node).
3. **Launched vs served** (`launched-vs-served`): a dashed resolver chain with no provider, then a solid one with a provider carrying a proof badge.
4. **Upgrade supersedes** (`upgrade-supersedes`): the declaration head moves right; the old declaration stays on the line, greyed but present; a lock replaces the key for the immutable case.
5. **Swap as signed resolution** (`swap-signed-resolution`): two intents enter, one signer resolves the batch, one signed result goes to peers; a second node's arrow ends in a refusal tag naming the signer.
