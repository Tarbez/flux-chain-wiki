# Resolvers, capabilities and deployment: content audit

Written 2026-10-19. This is a read-only audit. No page, manifest or doc was edited.

It covers how DEFXN (`flux/defxn`) and Flux Launch (`flux/flux-launchpad`) explain resolvers,
chains and deployment, measured against the code as it stands on `defxn-defi-rs` main
`473a69c` ("wave 3 round one merged").

Every claim about the system cites the design document that records it. Paths are given in short
form. `arch` means `flux/defxn-defi-rs/dense-wire/docs/design/architecture.md`, and `GR` means
`global-resolvers.md` in the same folder.

Line numbers drift under concurrent edits, so grep for the quoted text rather than trusting a
number.

**This audit does not claim anything is live on production.** "Built" means it is in the code on
main, with tests recorded in the design docs. "Devnet" means the design docs record it running on
the owner's local devnet. Neither was re-measured for this audit.

The page inventory (`docs/ux-audit/pages.md`) was not written yet when this file was. The inbound
and outbound link counts used in §5 come from the sibling `pages-crawl.tsv` and
`pages-crawl-links.tsv`.

---

## 0. Summary

- **The site describes a resolver from the agreement-fabric era.** It calls a resolver
  "addressed, deterministic logic", says it is deployed "when an admitted active provider reports
  fresh capacity", and defines a capability as "a declared operation a provider can perform".
  None of that is how the system works now.
- **Since 2026-10-18 the system has three layers:** kernel → capabilities → resolvers (`arch` §3).
  A resolver gets its own chain from one signed `ResolverLaunch` record. It composes capabilities
  that are launched and checkable on the registry ledger, and its own grammar is compiled at
  launch and enforced on every record.
- **No file on either site mentions any of this:**
  - capabilities;
  - `ResolverLaunch` or `ResolverUpgrade`;
  - the control key, or that a resolver is immutable by default;
  - grammar enforcement;
  - provider proof by vectors;
  - the 12 native resolver chains;
  - explore.defxn.com and deploy.defxn.com.

  There are no inbound links to the explorer or the deployer anywhere in `flux/defxn`.
- **Two different "resolver counts" circulate, and neither is the registry:**
  - 20 / 6 / 14 (`resolver-audit.md`, `whitepaper.md`, `/stats`);
  - 5 / 15 (`resolver-math.md`).

  The registry ledger lists 12 native resolver chains plus 5 bridge chains (`arch` §9.1).
- **"Capability", "registry" and "resolver" each carry two or three meanings on the site.** That
  collides directly with the new vocabulary.
- **Banned vocabulary is still on rendered pages.** The test only scans 12 docs, so it does not
  catch these:
  - "quorum" in `/how-deployment-works` and `/dao`;
  - "validator.fxn" in `/chain`;
  - "validators", "consensus", "finality", "accepted ops/s" and "replica applications" in five
    articles and `llms.txt`.
- **Recommended change.** Make `/what-is-a-resolver` (21 inbound links) the hub for the new model.
  Turn `/resolvers` into the registry and capability page. Rebuild `/how-deployment-works` (its URL
  promises deployment; its body is the retired agreement path) into "Deploy a resolver". This
  needs no orphan page. One new page, "Capabilities", is optional; §5 gives its inbound links.
- **Update order follows `docs/content-sources.md`:** evidence → `status.md` → `protocol/resolvers.md`
  and `glossary.md` → manifests → articles.
- **Flux Launch has three WRONG claims, and a fourth is now false:**
  - "bond slashed to holders on a rug attempt";
  - "selling locked allocation forfeits a quarter";
  - an optional "Unbacked" launch, which the node now refuses;
  - "Fee: none on the curve", which wave 3E made false.

  Most of the fixes already exist on the unmerged `wave3-launchpad-v2` worktree. Its Resolver tab
  never explains resolvers or capabilities, and the vendored signing dialog says "committee".
- **CMS:** add read-only typed blocks for a resolver card and a capability card. Derive the
  `/resolvers` data from a dated snapshot of the registry instead of the hand-written
  `resolver-registry.js` (last updated 2026-10-08).

---

## 1. The current system, in plain language (with citations)

### 1.1 One sentence

A resolver is a rulebook with its own chain. It is launched by one signed record, built from
shared capabilities that anyone can check, and it refuses any record that does not fit the grammar
it published at launch.

### 1.2 Three layers

`arch` §3 diagram and "one rule each":

| Layer | What it is | Its one rule | Status |
|---|---|---|---|
| **Kernel** | The base. Grammar and dumb parsing, per-signer chains and the equivocation freeze, K-of-N replication, the provider roster, blobs, and the **registry ledger** (`ChainLaunch`, `ResolverLaunch`/`Upgrade`, `CapabilityLaunch`/`Upgrade`, `ResolverRecord`). | "The kernel never learns a business record kind again." | Built as a target. The `Payload` enum still has 52 variants and is meant to shrink to ≤ 12 (`arch` §9, exit criteria). Moving kinds off it is **planned** (wave 5). |
| **Capabilities** | Pure mechanisms with no I/O and no process: multisig, signer, custody, ledger, escrow. | "Deterministic verify/apply over records; launched on chain with grammar + conformance vectors + impl hash; addressable by CID." | Five crates exist: `flx-cap-multisig`, `-signer`, `-custody`, `-ledger`, `-escrow` (repo root; `arch` §6 B3, §10 waves 1–3). `cap-split`, `-session`, `-witness`, `-signal`, `-match` and `-commit` are **planned** (`arch` §9.2, §9.4). |
| **Resolvers** | Processes, each on its own chain: dao, acl, custody, treasury, stake, balance, domain, records, payout, slash, compute, storage, and anything a builder ships. | "A resolver is a COMPOSITION of capabilities + its own grammar. It never contains a mechanism; it names them." | 12 run as separate processes on the devnet, all listed `native` (`GR` Phase 25, Phase 31). |

### 1.3 What a capability is

A capability is one shared mechanism, such as "N-of-M signatures" or "lock this credit until a
deadline". It is written once as a pure crate and declared on the registry ledger, so every
resolver uses the same checked code instead of its own copy (`arch` §1, §3).

It is declared by a signed `CapabilityLaunch` (`KCAP1`) on the base chain (`arch` §3 "Capability on
chain", §6 B3):

- `W` is the capability id.
- `C[1]` is the CID of its manifest.
- `C[2]` is a control key, or `GENESIS_PREV` for immutable.

The manifest (`flx-capability-manifest/1`) is **derived, never hand-written**, by
`scripts/derive-capability-manifest.mjs`. It contains:

- the version;
- the seam (trait and function names, wire commands);
- the **conformance vectors**: sample records with their expected verdicts, emitted by the crate's
  own tests;
- the **source hash**.

`CAPABILITY_LIST` and `CAPABILITY_RECORDS` read capabilities back over the wire (`arch` §6 B3).

**Devnet state.** After the 2026-10-18 restart, `CAPABILITY_LIST` returned 0 (`GR` Phase 31).
Launching the capabilities is recorded as the owner's step through deploy.defxn.com. This audit did
not re-query the node.

### 1.4 What a resolver is

A resolver is a composition of capabilities plus its own grammar (`arch` §3). Its records are
generic `ResolverRecord`s that name the resolver's chain in `N`. Its meaning lives in its grammar
and in the capabilities it calls. Nothing about it is added to the kernel (`arch` §3, "The generic
admission path").

### 1.5 How a resolver gets its own chain

One signed `ResolverLaunch` (`KRESOLV1`) is submitted to the base chain. The deployer's carrier
chain defaults to `defxn` (`flx-resolver-launch-panel.mjs`, `launchResolver`).

Before signing, the launch publishes four content-addressed blobs:

- a provider set (default: the launcher's key);
- speed parameters (default `requiredK 1`);
- an **offer manifest** (what the resolver offers, plus an optional `composes: [...]`);
- a **grammar manifest** (`flx-resolver-grammar/1`).

The record then names:

- a new **chain id** (`[a-z0-9]{3,32}`, no hyphens; `GR` Phase 25);
- those four CIDs;
- a **control authority**: a key, or `GENESIS_PREV` for immutable.

The node activates it through `consider_resolver_launch` (`GR` "The five pieces" §1, Phase 21;
`arch` §6 B2–B3).

What the chain gets:

- its own `chain_id`;
- its own provider set;
- its own history, which `RESOLVER_RECORDS` returns oldest first (`GR` Phase 24).

It gets none of a token chain's bond or escrow machinery. A resolver chain has no native economy,
and its stake floor is 0 (`GR` §1; `arch` §10 wave 3B "resolver chains stay at 0").

The registry is a richer read over the base chain's own launch log, not a separate service.
`RESOLVER_LIST` returns every resolver with:

- its manifests;
- its control key, or `-` for immutable;
- its declaration head;
- `native` or `third-party`, decided by the node's own allowlist and never by the resolver's claim
  (`GR` Phase 1, 1.5).

**Hazard worth telling every deployer.** The launch is a position on the launcher's own signer
chain. Signing a second launch from the same key at the same position is equivocation, and it
**freezes that key forever** (`GR` Phase 21, Phase 25).

### 1.6 Deploying a resolver today, step by step

The surfaces are deploy.defxn.com (`flux/deploy`, port 4544) and the per-resolver CLI binaries
(`<x>-resolver register|upgrade`).

1. **Derive the grammar** from your own sample records (`scripts/derive-resolver-grammar.mjs`).
   Deploy compiles it in the browser with the node's own compiler before anything is published.
   - A grammar that claims the schema but does not compile is refused.
   - Legacy tab text launches as **Unspecified**, with a warning (`flux/deploy/README.md`, "The
     grammar is compiled…").
2. **Write the offer manifest.** List the capabilities it composes (`composes`).
   - The node refuses the launch if one of them is not launched, or is pinned to a stale manifest
     (`CapabilityNotLaunched` / `CapabilityManifestMismatch`; `arch` §6 B3).
   - **Gap:** the deploy form is a free-text offer box. It has no capability picker
     (`flx-resolver-launch-panel.mjs`; no `composes` field).
3. **Sign in.** Use an Auth Kit, or an unlocked defxn.com identity.
4. **Review the exact unsigned record** in the full Scoped Claim Authorization dialog, then sign.
   The previewed body and the signed body come from the same function (`flux/deploy/README.md`).
5. **Submit.** The node answers `OK <cid>` or a named refusal. The new chain appears in
   `RESOLVER_LIST` (`GR` Phase 21, 24).
6. **Serve it.** A provider announces a reach address for the chain (`PROVIDER_ANNOUNCE`) and
   shows up in `CHAIN_PROVIDERS`.
   - If the resolver composes capabilities, the announce must carry a **proof CID**: a passing
     `cap-prove` run of every composed capability's vectors at the launched source hash.
     Otherwise there is no seat (`arch` §3 fact (b), wave 2D/2B).
   - **Known gap:** the announce has a one-hour deadline, and no serve loop re-announces. Periodic
     re-announce is **planned** with `flx-resolver-host` (`GR` Phase 25; `arch` §9.4 step 5).
7. **Use it.** Records are `ResolverRecord`s with `N=<chain id>`. Every node enforces the
   resolver's grammar after the signature check and **before the record goes to peers**:
   - an unknown `N` is refused;
   - a violation is refused, naming the failure, what is missing and the remedy (`arch` §6 B2).
8. **See it.** explore.defxn.com (`flux/explore`, port 4541) shows, for each resolver:
   - its control authority;
   - its manifests, hash-verified;
   - its providers, with the proved-capabilities column;
   - its whole history, with every CID recomputed and every Ed25519 signature re-verified in the
     browser (`flux/explore/README.md`).

**Production hosting.** `GR` Phase 24 recorded hosting and DNS for explore.defxn.com and
deploy.defxn.com as "untouched". It has not been re-verified since.

### 1.7 Upgrades and immutability

- A resolver is **immutable by default.** If no control key was declared, nobody can ever change
  its manifests or provider set (`GR` §4).
- With a control key, only that key can sign a `ResolverUpgrade` (`KRESOLVUP1`). The upgrade
  **supersedes** the declaration head and never rewrites it. Every record signed under the old
  grammar stays valid (`GR` §4).
- Whether a resolver can change, and who can change it, is a public fact in `RESOLVER_LIST`.
- Capabilities follow the same rule (`KCAPUP1`). DAO-controlled capabilities are refused for now
  (`arch` §6 B3, "Deviation").

### 1.8 What "verified on chain" means

`arch` §3 defines it as three checkable facts:

| Fact | Meaning | Status |
|---|---|---|
| (a) | The manifest's vectors are generated from the crate's own test suite. | Built (derive script; `arch` §6 B3) |
| (b) | A provider serving a resolver that composes capability X must pass X's vectors. The roster records the proof. | Built (wave 2D, wired in 2B; `arch` §3, §10) |
| (c) | A resolver launch that composes an unlaunched or stale capability is refused. | Built (`arch` §6 B3) |

**Planned, not built:**

- the audit resolver (`KAUDIT1`; auto audits by providers, manual audits by reviewers);
- the bounty resolver;
- "require audited capabilities" on a resolver launch.

Source: `arch` §10 wave 4 and `service-pools-audits-bounties.md` §2–§3.

### 1.9 Where DeFi fits: signed resolution, not a chain

The owner's frame (memory `flx_forward_directive_locked`; `docs/status.md` "Current direction"):

1. Two parties sign an intent.
2. A resolver shard resolves.
3. The shard signs the result, and that signature is the truth.
4. Replicas store it.
5. Anyone audits.

The waves made this concrete for launches:

- **One signer per launch.** Every backed token launch has exactly one current signer. It resolves
  the launch's curve swaps, and after graduation its pool swaps.
- **Other nodes refuse,** naming `CHAIN_PROVIDERS` (`arch` §10 wave 2B, 3H).
- **The signed result is the truth replicas read.** That is `KCVSR2`/`KCSWR2` plus a fills blob.
  Each result rides the signer's chain as a `ResolverRecord` envelope. A replica re-derives the
  result or refuses it; it never signs (`arch` §10 wave 2B, 2C, close-out).
- **Value moves only through capabilities** (custody fold, ledger, escrow).
  - A V2 buy names a custody credit.
  - Fees are fill-row columns.
  - Each launch has an insurance account.
  - The creator bond is an escrow lock.

  Sources: `arch` §10 waves 2C, 3E–3G; `launchpad-service-economy-plan.md` §10.
- **Launches must be backed.** A new unbacked launch is refused at submission (`arch` §10 wave 3B).

**Model and code differ, and the docs must say so.** The owner's model is "chain-of-chains is for
native coins". FXN is the `defxn` chain; DARO is the ark chain; launchpad tokens are assets inside a
native chain (memory `chain_model_native_chains_and_custody`). The code still derives a chain id
per token launch (`ChainLaunch`). Public copy must not say "every token is its own chain" as the
model, and must not hide that the code does this today.

### 1.10 Built, devnet or planned (for any page that says "now")

| Item | State | Source |
|---|---|---|
| `ResolverLaunch` / `ResolverUpgrade`, control key, immutable by default | Built | `GR` Phase 0, 21 |
| `RESOLVER_LIST` (native vs third-party), `RESOLVER_RECORDS`, `CHAIN_PROVIDERS` | Built | `GR` Phase 1, 1.5, 2, 24 |
| 12 first-party resolvers as separate processes, all `native` | Devnet | `GR` Phase 25, 31 |
| Package, Bundle, Env, Repo and DB as resolver chains (bridges) | Built, additive; GUN paths still live | `arch` §9.1; `GR` Phase 22–23 |
| Resolver grammar compiled at launch, enforced on every record | Built; 7 of 12 resolvers still Unspecified (legacy grammar) | `arch` §6 B2, §9.3 item 9 |
| `CapabilityLaunch`/`Upgrade`, `CAPABILITY_LIST`, composition check | Built | `arch` §6 B3 |
| 5 capability crates with derived manifests | Built | `arch` §6, §10 |
| Capabilities launched on the devnet | 0 at the Phase 31 restart; owner's step | `GR` Phase 31 |
| Provider proof by vectors (`cap-prove`, proved column) | Built | `arch` §3 (b), §10 |
| explore.defxn.com, deploy.defxn.com | Built; run locally on 4541/4544; production hosting untouched as of Phase 24 | `GR` Phase 24 |
| Backed launches, one signer per launch, signed fills, custody fold, fees, insurance, creator escrow | Built (waves 1–3 round one) | `arch` §10 |
| `flx-resolver-host` (one generic binary plus periodic re-announce) | **Planned** (wave 4; worktrees exist, not merged) | `arch` §9.4 step 5, §10 wave 4 |
| Unified deployer for eight kinds (resolver, capability, site, app, DB, package, module, repo) | **Planned**; resolver and capability only today | `service-pools-audits-bounties.md` §4; `arch` §10 wave 4 |
| Audit and bounty resolvers; "require audited capabilities" | **Planned** | same, §2–§3 |
| Service pools | **Planned** | same, §1 |
| Kinds off the kernel enum; file budget ≤ 1,500 lines | **Planned** (wave 5) | `arch` §10 |
| Gaming (`cap-match`, `cap-commit`), fee and anti-spam model for records | **Planned** (wave 6) | `arch` §5, §10 |

### 1.11 Vocabulary for public copy

| Say | Do not say | Why |
|---|---|---|
| providers, K-of-N providers, provider set | committee, validator(s) | Banned list (`docs/deprecated.md`, `tests/no-deprecated-vocabulary.cjs`). The design docs still say "committee" internally (`arch` §3 diagram, `GR`); public copy must not inherit it. |
| threshold, N-of-M signers | quorum | Banned. Multisig is "N-of-M". |
| the signed result, the signer's signature | finality, finalized | Banned. |
| registry ledger (the launch log on the base chain) | "registered" meaning "has an audit manifest" | Collision. See the audit table: `resolver-audit.md`. |
| capability = a shared, checked mechanism (multisig, custody…) | capability = "an operation a provider can perform", or "a thing that can be said" | Collision in `glossary.md`, `protocol/resolvers.md`, `resolver-math.js` and `resolver-block.js`. |
| resolver = a launched rulebook with its own chain | resolver = "each block's resolver" (per-letter grammar logic) | Collision in the grammar articles. Say "the letter's rule" there. |
| signed resolution | transaction, block, on-chain | Directive. The economy plan uses "signed and replicated" for "on-chain". |

---

## 2. Statement-by-statement audit

Legend:

- **CURRENT**: matches the code.
- **STALE**: was true; says what changed and where.
- **WRONG**: false now and was never the model.
- **MISSING**: the page should introduce this.
- **BANNED**: carries a forward-directive term.

The DEFXN path prefix is `flux/defxn/`.

### 2.1 `/what-is-a-resolver`

Files: `js/content/manifests/resolver.js` (copy), `js/pages/resolver-lab.js`,
`js/pages/resolver-guide.js`. This is the hub, with 21 inbound links.

| Field / line | Statement (short) | Verdict | What changed / source |
|---|---|---|---|
| DISPLAY.LEDE | "A resolver is named, deterministic logic…" | STALE | It is now a composition of capabilities plus its own grammar, on its own chain (`arch` §3). |
| BODY1, LAW1.TEXT | "addressed, deterministic logic on Flux…" | STALE | Same. The "address" is a chain id from a `ResolverLaunch`. |
| BODY2 | "Its address identifies the logic; a checker and authority rule determine whether a result is accepted." | STALE | The checker and authority cell belong to the agreement-fabric model (retired, `status.md`). Acceptance now comes from the resolver's grammar, its capabilities and its signer. |
| BODY3, LAW3 | "Published is not deployed… deployed only when an admitted active provider reports fresh capacity." | STALE, but the idea survives | Today's form: launched is not served. A chain is served only while a provider announces for it, and, if it composes capabilities, only by a provider that passed their vectors (`arch` §3 (b); `GR` Phase 25). |
| LAW4, BOUNDARY, CHECK.BODY | "A signature is not a verdict… Acceptance comes from the checker, authority cell…" | CONFLICT with owner law | The owner's frame: the resolver shard's signature IS the result. A reconciliation is proposed in §3.1; owner question Q3. |
| resolver-lab.js :357-360 | status rows definition Live / publication Partial / deployment Partial (CAP-004/005) | STALE | Mirrors `status.md` of 2026-10-10. Launch, upgrade, explorer and deployer are built since (`GR` Phase 21, 24). |
| resolver-lab.js :193, :210, :212 | "signed · provider P-3", "acceptance · checker decides" | STALE | The resolver's signer signs; there is no separate checker step. |
| (whole page) | — | MISSING | Own chain via one launch record; capabilities; grammar enforced; control key and immutability; links to Explore and Deploy. |

### 2.2 `/resolvers`

Files: `js/pages/resolvers.js`, `js/content/resolver-registry.js`. 2 inbound links, 0 outbound.

| Line | Statement | Verdict | Change / source |
|---|---|---|---|
| resolvers.js :79 | "A LEDGERENTRY is admitted… Nothing else about the payload is interpreted at the chain level. Each resolver… registers against a `Y` code" | STALE | A resolver now registers with a `ResolverLaunch` and gets its own chain id. Its records name it in `N`, and its grammar **is** enforced at admission (`arch` §6 B2). |
| :94 | "Pick a free `Y` code… The registered grammar lives in `flux-spec/registry/manifest-types.json`." | WRONG now | That registry is the chain resolver's grammar only. Your resolver publishes its own grammar manifest at launch (memory `registry_is_chain_resolver_grammar`; `arch` §3 step 2). |
| :95 | "Grammar admission is already handled by the chain." | STALE | Admission checks **your** grammar, compiled from your manifest (`arch` §6 B2). |
| :96 | "Publish a signed resolver manifest… a LEDGERENTRY on a resolver-registry chain" | STALE | It is a `KRESOLV1` launch naming offer and grammar manifests, plus an optional control key (`GR` Phase 0). |
| :97 | "Register with the directory so `/resolvers` (and in time `resolve.defxn.com`) can list it" | STALE | The directory is `RESOLVER_LIST`, shown at explore.defxn.com (`GR` Phase 1, 24). `resolve.defxn.com` appears in no design doc. |
| :104 | "A command-line deployer and the `resolve.defxn.com` landing surface are the next step." | STALE | Per-resolver CLIs (`register`/`upgrade`) and deploy.defxn.com exist (`GR` Phase 21, 24). |
| resolver-registry.js header | "Only one letter (`J`)… everything else is interpreted by the RESOLVER registered against that `Y` code" | STALE | As above. |
| resolver-registry.js, `updated: '2026-10-08'`, 6 entries | defi-transfer, pva-books, nft-collections, market-listings, stream, dao-governance | STALE | None is a chain on the registry ledger. The 12 native resolvers and 5 bridge chains are absent. `dao-governance` points at `ark-miner-cli`, not the `dao` resolver (`arch` §9.1). Hand-authored, so it violates "derive, don't author". |
| stream entry | "1,712,006/s certified-segment ceiling", "82,863 finalized records/s" | STALE / BANNED | Retired metric family. "finalized" is banned. |
| (whole page) | — | MISSING | Capabilities list, chain ids, control and immutability, grammar status (enforced or Unspecified), proved providers, a link per row into Explore. |

### 2.3 `/how-deployment-works` and `/how-deployment-works/{ask,work,check}`

Files: `js/content/manifests/deployment.js`, `js/pages/deployment.js`, `js/pages/how-stories.js`.
6 inbound links.

| Field | Statement | Verdict | Change / source |
|---|---|---|---|
| route title, SUMMARY | "From a network ID to a verifiable receipt"; register a named network → choose a resolver → agree → evidence → receipt | STALE | This is the agreement-fabric path, which `status.md` marks Retired. The URL promises deployment, and resolver deployment is now a different, built flow (§1.6). |
| BODY1, FABRIC.NETWORK, BOUNDARY | "named network ID… miner-presence namespace" | CURRENT for named networks, but the wrong topic | Named networks (flux-network CLI) are not resolver chains. |
| BODY2 | "Publish or select the addressed resolver logic… Publication alone does not establish active execution capacity." | STALE | See §2.1, BODY3. |
| BODY4, FABRIC.FULFILLMENT | "signed records on your own chain; the agreements resolver links them" | STALE | The agreements resolver is not on the registry ledger (`arch` §9.1). |
| CHAPTER.WORK.WHY1 | "Each party writes to its own chain… unlike a blockchain where every transaction shares one block order" | CURRENT | Per-signer chains (`GR` "governing idea"). Keep it, but the word "blockchain" invites the gravity; consider "unlike one shared queue". |
| **CHAPTER.CHECK.WHY3** | "A result is accepted once the **quorum** signs it, and durable after three attestations and a commit certificate. Locally that full path closed about 375 times a second." | **WRONG + BANNED** | That is the retired certified-fabric path. Signed resolution says the signer's signature is the result and replicas store it (`status.md` direction). "quorum" is banned; the rate is a retired metric. |
| CHAPTER.CHECK.DETAIL3, WHY2 | "approvers chosen by the active policy… once a threshold is met… their mandate ends" | STALE | Authority-cell model (retired fabric). |
| CHAPTER.WORK.RECORD | "kind: agreement, flux.fabric-transfer.v1" (labelled "A REAL FXN TRANSFER RECORD") | STALE | A fabric record shape. Today's transfer is a `NATIVE_SEND` on the ledger capability (`arch` §10 wave 2A). |
| (whole) | — | MISSING | How a resolver is deployed: launch → serve → prove → records → upgrade. |

### 2.4 `/chain`

Files: `js/content/manifests/chain.js`, `js/pages/chain.js`, `js/pages/home-flow.js` (CASES and
STEPS).

| Location | Statement | Verdict | Change / source |
|---|---|---|---|
| chain.js TITLE, LEDE | "Not one chain. A chain of chains. Every identity signs its own append-only chain." | CURRENT, but incomplete | MISSING: every resolver also runs its own chain, and one base chain records which resolvers and capabilities exist (`arch` §3 kernel; `GR` §1). |
| home-flow.js :43 (step Check) | "Grammar parses and the signature verifies. Meaning is not checked." | STALE | A resolver's own grammar is enforced at admission: its closed kind set and payload rules (`arch` §6 B2). Meaning stays with the resolver and its capabilities. |
| home-flow.js :45 (Replicate) | "Copied to 9 of 12 peers in this example." | CURRENT (illustrative) | K-of-N replication. |
| home-flow.js :27 (Swaps case) | "The DeFi resolver reads the payload: 36 FXN to studio.fxn." | STALE | A swap is an intent that the launch's one signer resolves in a batch and signs (`arch` §10 wave 2B). It is not a payload read off the holder's chain. |
| home-flow.js :29, :474 | party "**validator**.fxn" | BANNED | Use `provider.fxn`. |
| chain.js NEXT | "See what each resolver reads from the chain" | CURRENT | Points to `/what-is-a-resolver`. |

### 2.5 `/about`

File: `js/content/manifests/about.js`.

| Field | Statement | Verdict | Change / source |
|---|---|---|---|
| POINT2.TEXT | "A record is admitted if its grammar is valid, its signature verifies and it extends that holder's head. Resolvers decide what it means." | CURRENT for base records; MISSING the resolver's own grammar | `arch` §6 B2 |
| POINT4.TEXT | "resolver model… agreements resolver are implemented in source… Automated provider activation remains partial" | STALE | The agreements resolver is not among the registry chains. The current resolver model (launch, capabilities, proof) is unnamed. |
| FLOW2.TEXT | "A resolver applies the network's published rules to your request and signs what it did." | STALE (close) | The rules are the resolver's own: its grammar and capabilities, published at launch. "Network" conflates named networks with resolver chains. |

### 2.6 `/dao`

Files: `js/content/manifests/dao.js`, `docs/protocol/governance.md`, `docs/protocol/authority.md`.

| Field | Statement | Verdict | Change / source |
|---|---|---|---|
| DECK | "…neither **quorum** acts for the other." | BANNED | Use "threshold". |
| POINT1.TEXT | "seven operators: 4-of-7… 5-of-7…" | STALE (legacy substrate policy) | No such roster appears in `arch`. The registry's resolver control is a key or immutable; DAO-controlled upgrades go through the `dao` resolver's multisig (`arch` §6 B3; `GR` §4). |
| POINT2.TEXT | "Each network defines its own roster… named deployments remain unverified." | STALE | `dao` is a native resolver chain on the devnet, composing multisig (at least 2 signers, threshold at least 2; `arch` §1, §9.1). |
| STATUS.TEXT | "A public governance interface… not established" | STALE-ish | dao.defxn.com has a Resolver tab (`GR` Phase 21). Production is unverified. |
| (whole) | — | MISSING | "Who can change a resolver?" (control key or nobody) and "Who can change a capability?" |

### 2.7 `/deploy` (Create or join a network)

Files: `js/content/manifests/deploy.js`, `js/pages/deploy.js`.

| Statement | Verdict | Note |
|---|---|---|
| "Named networks partition miner presence only…" plus the flux-network CLI steps | CURRENT for that feature | The menu label "Create or join" sits beside "Deploy". MISSING: one line telling a reader who wants to **deploy a resolver** that this is the wrong page, with a link. |

### 2.8 `/bundle-deployer`

File: `js/content/manifests/bundledeployer.js`.

| Statement | Verdict | Change / source |
|---|---|---|
| POINT4 "The lightweight FXN Bundle Deployer is not available yet." | CURRENT for the CLI | — |
| POINT3 "Sign the site's mesh ownership record." | STALE (partly) | Bundles also write `KBUNDLE1` records to a bundle resolver chain via a bridge; the GUN path is still live (`arch` §9.1; `GR` Phase 23). |
| (whole) | MISSING (planned) | Sites and apps become a deploy.defxn.com kind on the bundle resolver chain. This is **planned**, wave 4 (`service-pools-audits-bounties.md` §4). Mark it planned. |

### 2.9 `/download` (Run from source) and `docs/operators/*`

| Location | Statement | Verdict | Change |
|---|---|---|---|
| download.js POINT4 | "says nothing yet about… resolver capacity" | CURRENT in spirit | Reword to "serving a resolver" (§3.9). |
| operators/troubleshooting.md :21-25 | "Execution requires an admitted active provider with fresh capacity" | STALE | Today's checklist: the chain is on `RESOLVER_LIST`; a provider appears in `CHAIN_PROVIDERS` before its deadline; the proved column covers every composed capability; the grammar is enforced. |
| operators/verification.md :21-27 | "Resolver deployment — identify the pattern and resolver address… fresh capacity" | STALE | Verify by chain id, launch CID, control field, proof CID, and grammar state in Explore. |
| operators/verification.md :29-39 | Agreement-fabric endpoints | STALE | Retired; read-only. |
| operators/prerequisites.md :15 | `flux-provider-runtime` for provider activation | STALE (likely) | Provider seat = stake (launched chains) plus capability proof (`arch` §10 3B, 2D). |
| operators/networks.md :3 | named network = miner-presence namespace | CURRENT | Add: "not a resolver chain". |

### 2.10 `/resolver-math`

Files: `docs/resolver-math.md`, `js/pages/resolver-math.js`, `js/content/resolver-algebra.js`,
`js/content/resolver-block.js`, `js/content/manifests/resolvermath.js`. 0 inbound page links.

| Location | Statement | Verdict | Change / source |
|---|---|---|---|
| resolver-math.md :27 | "5 \| resolvers \| what can be worked out and signed" | WRONG | The page's own JS computes 6. The audit says 20/6/14. The registry has 12 native. |
| resolver-math.md :22-26 | 93 record types, 10 type-scoped shapes | STALE | The generated census now says 95 and 12. |
| resolver-math.md :155 | "Observer-relative meaning, built — for exactly one letter" | WRONG | The census has 12 type-scoped entries over A, J, O, N and K (`resolver-algebra.js` :396-479). |
| resolver-math.md :82-84, :293-296 | "one that does not publish its manifest is not registered"; "Fifteen further resolvers… not built — … traffic" | STALE / WRONG | Registration is now `KRESOLV1`. Traffic-Gossip was measured (`resolver-audit.md` :79). |
| resolver-math.md :313 | "Runtime self-registration — not built" | STALE | A resolver publishes and launches its own grammar with no kernel change (`arch` §6 B2). |
| resolver-math.js :32-55, :739-746 | hard-coded RESOLVERS list (6 built, 14 NOT BUILT; Treasury-Spend and Governance-Vote "NOT BUILT") | STALE | `treasury` and `dao` are native chains (`arch` §9.1). |
| resolver-math.js :11-14, :252-273; resolver-block.js :472 | "capabilities disappear" (meaning sayable verbs) | Collision | Rename to "sayable things", "what can be said". |
| manifests/resolvermath.js | "the observer is the resolver", "Your resolver's limits are your limitations" | CURRENT | Keep. Add the capability summand (§3.10). |

### 2.11 `/stats` and `/stats/ledger` (resolver-related lines only)

| Location | Statement | Verdict | Change |
|---|---|---|---|
| stats-highlights.js :242 | "Resolver registry · 20 resolvers, 6 measured, 14 not built… Every resolver publishes a signed audit manifest, or it is not registered." | STALE / collision | Two registries. Label this one "resolver families audited" and add "resolver chains launched: 12 native (devnet)" from a dated snapshot. |
| stats.js :165 | "Sovereign chains… each with its own 1B-unit native token and its own compute-reward reserve" | Model ≠ code (state it) | The code mints per launch. The owner's model puts launchpad tokens inside a native chain (memory `chain_model_native_chains_and_custody`). |
| stats.js READINESS "Independent security review… certified-segment path" | STALE wording | Retired framing. |

### 2.12 Canonical docs that pages render or cite

| Doc : line | Statement | Verdict | Change / source |
|---|---|---|---|
| protocol/resolvers.md :3 | "addressed, deterministic logic that accepts defined input and produces a claim" | STALE | `arch` §3 |
| protocol/resolvers.md :9 | "A **capability** states what a provider can perform." | WRONG now | `arch` §3, §9.2 |
| protocol/resolvers.md :14 | "deployed only when an admitted active provider reports fresh capacity" | STALE | §1.6 steps 5–6 |
| protocol/resolvers.md :18 | "Semantic acceptance comes from the… checker, authority cell, agreement, and governance rules" | CONFLICT (owner law) | Q3 |
| glossary.md :13, :17, :19, :35 | Resolver / Capability / Provider / Deployed | STALE / WRONG (Capability) | §3.11 |
| glossary.md :15 vs :29 | "A signed claim… is not automatically true" vs "a resolver shard signs, and the signature is the result" | Internal contradiction | Q3 |
| status.md :44-46 | Resolver definition Live / publication Partial / deployment Partial, "host installation remains manual" | STALE | §1.10 |
| status.md :57 | "Peer-sync bootstrap for a node that starts empty — Not built" | STALE | Startup recovery from an IPFS CID plus `catch_up_from_providers` for signed swap results (`arch` §10 wave 2 close-out, H7). Scope it precisely: this does not refill every chain. |
| status.md (table) | — | MISSING rows | Capability registry; grammar enforcement; provider proof; Explorer and Deployer (local); backed launches; one signer per launch. Planned items as `Not built`, never as 0. |
| overview.md :17, :23-25 | "certified segments"; core flow Intent→…→Receipt | STALE, and contradicts :17's own "signed resolution" | `status.md` direction |
| whitepaper.md :61-68, :248, :297 | "Everything in the system is a resolver… 20 resolvers, 6 measured, 14 not built", governance "none built" | STALE | Three layers; `dao`/`treasury` native (`arch` §3, §9.1) |
| whitepaper.md :301 | "deploy and rollback… owed" | STALE (partly) | Launch and upgrade exist; rollback is a supersede |
| resolver-audit.md :7-11 | "signed by the registry key… A resolver that does not publish its audit manifest is not registered." | STALE / collision | "Registered" now means launched on the registry ledger. |
| protocol/agreements.md, protocol/authority.md | five-stage lifecycle "implemented in source"; seven-member roster | STALE | Retired fabric (`status.md` row "Agreement-fabric inspection endpoints — Retired"). Needs a banner. |
| prototype-to-production.md :147-149 | "Deploy and rollback… Not built" | STALE | `GR` Phase 21 |
| prototype-to-production.md :179 | "Byzantine tolerance" | BANNED (BFT family) | — |
| index.md :3, quickstart.md | resolver-based system…; miner-only quickstart | MISSING | Explorer, Deployer, capabilities |

### 2.13 Articles (`js/content/articles/*.js`)

All seven predate 2026-10-18. Recommendation: keep them as dated history, but give each a "Written
before resolver chains and capabilities — read the current model" banner. Fix the banned words in
each article's `description` field, because `llms.txt` repeats them.

| Article : line | Statement | Verdict |
|---|---|---|
| a-resolver-by-construction :3, :42 | "the chain decides"; "each letter's resolver runs… wait for K-of-N acks" | STALE (resolver = per-letter rule; now per-resolver grammar) |
| a-resolver-by-construction :27 | "Validators, mempools, consensus rounds" | BANNED (used as contrast; still banned) |
| a-resolver-by-construction :37 | "LEDGERENTRY, with code 1A under the agreement-fabric group" | STALE (fabric retired) |
| a-resolver-by-construction :56, :72-74 | "certified… segment root and quorum" | BANNED / STALE |
| governance-without-a-validator-set (slug, :3, :20, :25) | "validator", "committee", "proof-of-authority"; authority cells, 4-of-7 | BANNED (the slug too) / STALE |
| one-substrate-many-networks :3, :20, :30 | "DAO Chain… intended network examples… not claimed active"; "anyone can deploy its own contracts… registering a network works the same way" | STALE: `dao` is a resolver chain, and "deploy your own" is now `ResolverLaunch`, not a named network |
| the-chain-prototype-is-the-chosen-path :25, :34 | "There is no central registry; each chain lives on exactly one server" | WRONG now: a registry ledger exists on the base chain, and each resolver chain has its own provider set (`arch` §9.1) |
| the-chain-prototype… :3, :55, :59 | "12,403 accepted ops/s"; "validator key source, quorum roster" | BANNED |
| the-grammar-does-almost-no-work :3, :34 | "each block's own resolver decides what it means" | CURRENT for the kernel; collision on the word "resolver" |
| the-grammar-does-almost-no-work :25 | "a block, a height, or a validator" | BANNED |
| the-grammar-does-almost-no-work | — | MISSING: the second grammar layer (the resolver's own grammar, compiled at launch) |
| why-the-chain-was-retired :3 | "one grammar-only chain per identity, with resolvers on top" | STALE: resolvers now have their own chains, and the grammar is not only the base grammar |
| why-the-chain-was-retired :36-37 | "finalized… accepted chain records per second… replica applications" | BANNED |
| how-we-got-fast-and-what-we-got-wrong (whole) | retired-direction history; "quorum", "finality", "Byzantine" | BANNED in many places; history banner |

### 2.14 `llms.txt` (generated from `js/content/seo-data.js` and article metadata)

| Entry | Verdict | Fix at the source |
|---|---|---|
| `/resolvers` "Browse the available resolver families… before choosing logic for a network" | STALE | `seo-data.js` → `resolvers.description` |
| `/what-is-a-resolver` "resolver logic turns inputs into checkable claims" | STALE | `resolver.description`; set `aiSummary` |
| `/how-deployment-works` "From network ID to receipt… network discovery, signed agreements" | STALE | `deployment.title`/`description` |
| `/chain` "checked for grammar and signature only" | STALE | Add "and the resolver's own grammar" |
| article `the-chain-prototype…` "12,403 accepted operations per second" | BANNED | The article's description |
| article `governance-without-a-validator-set` (slug) | BANNED | The slug is a URL; renaming it needs a redirect (owner question Q7) |

### 2.15 Flux Launch (`flux/flux-launchpad`)

**Which checkout this covers.** The main checkout `flux/flux-launchpad` is on branch
`wave1c-backed-launch`. The newer launchpad copy is unmerged, in worktree
`flux/flux-launchpad-wt-v2`, branch `wave3-launchpad-v2` (8ddcec3: "every new launch is backed",
"V2 trade lane", "fees in the quote, Fees panel, V3 caps…").

That branch already rewrites the `create.html` economy copy, so the "unbacked" and "fee" rows
below are fixed there and nowhere else. **Copy changes must land on, or after, that branch.** Do
not edit the wave1c checkout in parallel; it would fork the copy.

Economy facts used below come from `launchpad-service-economy-plan.md`: §4 (lines ~120-126), and
the owner answers of rounds 4 to 6 (§10).

| Location | Statement | Verdict | Change / source |
|---|---|---|---|
| index.html :235, :452 | "Prices and balances come straight from the node…", "Every price here comes from the node" | STALE | A trade's truth is the signed result of the launch's one signer (`KCVSR2`/`KCSWR2` + fills blob; `arch` §10 2B/2C/3H). |
| index.html :291, :822 | "Balances signed by the network" | STALE wording | The balance resolver signs (index.html :851 says so correctly). |
| index.html :290, :811; js/app.mjs :2355, :2379; js/bridge.mjs (13 lines) | "held by a committee", "bridge committee" | BANNED | Use "k-of-m bridge signers" (bridge.mjs :305 already says "k of m members must sign"). |
| index.html :536 | "They pick a ticker and supply and post a creator bond…" | STALE | Every new launch must be backed: an economy blob naming the signer and recovery key (`arch` §10 3B). The bond is an escrow lock with a 90-day term (economy plan §10, round 5; `arch` §10 3G). |
| index.html :537, js/app.mjs :1647 | fair-launch buys "clear at one price" | CURRENT, but incomplete | The clear is itself a signed result, `KCVSC2` (`arch` §10 close-out). |
| index.html :538-539; js/schematics.mjs :289, :305, :320 | "filled at once…", "the node checks them again before it fills", "Filled at the node's price" | STALE | One signer per launch resolves and signs. Any other node refuses, naming `CHAIN_PROVIDERS`. Replicas derive the result or refuse it (`arch` §10 2B). |
| **index.html :554; js/app.mjs :1322, :1356** | "creator's bond is… slashed to holders on a rug attempt"; "Slashed to holders" | **WRONG** | A rug attempt is refused and counted; it moves no money. The bond is forfeited only on a checkable conviction, split 50% holders / 30% treasury / 20% checker (economy plan §4, round 6). |
| **create.html :178; js/refusals.mjs :81** | "selling locked allocation forfeits a quarter of what remains" | **WRONG** | Same. The 25% cut "stays a refusal plus a counter… no longer pretends to move money it never held" (economy plan §4). |
| index.html :581, :597; js/app.mjs :1331 | "Each swap pays the pool's fee, the same for every trader", "One fee for everyone" | STALE | There are now three named fees as fill-row columns: `lp` (≤ 1%); `venue` 0.20% split 40 providers / 30 insurance / 30 treasury; `mm` on the curve, 1% flat or tiered 2 / 1 / 0.30%. Hard caps are mm ≤ 2%, venue ≤ 0.20%, lp ≤ 1% (round 4, round 6; `arch` §10 3E). "Same for every trader" still holds. |
| **js/app.mjs :1486, :1511, :1518** | "Fee — none on the curve" | **STALE (now false)** | Curve trades on backed launches pay `mm` and `venue` (wave 3E, merged at 473a69c). |
| **create.html :183, :204; js/create.mjs :204; js/token-meta.mjs :215** | an optional "Backed launch" checkbox; "Unbacked… Choose it only for a test token." | **WRONG** | A new unbacked launch is refused before admission (`UNBACKED_LAUNCH_REFUSAL`, `arch` §10 3B). Fixed on `wave3-launchpad-v2` (60b2349). |
| create.html :202; js/create.mjs :469 | "The swap signer is the node's own key and the recovery key is the operator's offline key" | CURRENT, but incomplete | Add: that one signer alone resolves this token's trades and signs each result. |
| create.html :35, :7; js/app.mjs :846 | "the chain itself only records the ticker and supply" | STALE | A backed launch's chain also carries its economy blob, its signed results and their envelopes (`arch` §10 2B/close-out). Also see the next row. |
| index.html :705 "Chain status"; js/create.mjs :539, :581 "launches the chain", "The chain is launched and tradeable"; js/app.mjs :1318 | each token is a chain | Model ≠ code (state it) | The code derives a chain id per launch. The owner's model is a token as an asset inside a native chain (memory `chain_model_native_chains_and_custody`). Q9. |
| js/app.mjs :1315 CUSTODY_NOTE; js/holdings.mjs :36, :92; README :51-63 | "not escrowed money", "swaps do not move balances yet" | STALE for backed launches | Trades fold through custody (Terms V2 fund credit; `arch` §10 2C). The note is still true for legacy unbacked curves, so say which. |
| index.html :851; js/holdings.mjs :87-96 | "Not backed" chip, meaning a curve position | Collision | "Backed launch" now means something else. Rename the chip to "Curve position (no FXN moved)". |
| js/safety.mjs :19 | "Creator bond intact… % of the bond left" | STALE | It reads the counter, which the plan calls "a counter, not money". On backed launches, read the escrow lock. |
| js/records.mjs :36 | the trade builder sends `FLX-CSWAP-TERMS-V1` | Functional defect, not copy | A backed launch refuses V1 by name (`arch` §10 2C). Fixed on `wave3-launchpad-v2` (86f82b2). |
| **index.html :799** (Resolver tab lede) | "A resolver answers questions for one kind of record. Publishing one signs a launch or upgrade with your key and adds it to this node's registry." | STALE / incomplete | The launch is a signed record on the base chain, not "this node's registry". It gives the resolver its own chain; the resolver is built from capabilities and its grammar is enforced. |
| Resolver tab panel (vendored `flx-resolver-launch-panel.mjs`) | Launch / Upgrade / Capability forms | MISSING | No "composes" field or explanation. No warning that an unlaunched capability is refused. No mention of provider proof. The provider set and speed params are silently defaulted. The claim dialog says "committee" (§2.16). |
| index.html :305-313 (roadmap) | Launchpad/DEX Live; Bridge, Service pools, Rounds "Next"; Airdrops, Staking, Treasuries, Bounties "Planned" | CURRENT | Planned items are correctly not live. The resolver host, unified deployer and audits are absent; fine for a launchpad roadmap. |
| index.html :506, :612-623 (service pools, "In development") | — | CURRENT as plan | Add: revenue sharing is enforceable only when revenue is routed to the pool's custody account; otherwise it is voluntary (`service-pools-audits-bounties.md` §1). |
| README :88-125, :415-419 | launch flow without an economy blob; "What is NOT a per-token option: creator bond… fee tier" | STALE / WRONG | The create page sends bond, fee tier and economy (`arch` §10 1C). |
| concepts/f-service-pools.html :341, :370, :390 | "Protocol fee 0.00", "ZERO CUT" | WRONG (mockup) | A venue fee exists. The owner said the "zero protocol cut" wording does not ship (economy plan §10). These are mockups, so mark them, don't ship them. |
| docs/BRIDGE.md | committee, quorum, validator, consensus, finality | BANNED | User-facing reference; rewrite in the k-of-m signer vocabulary. |

### 2.16 Outside both sites, but seen by every deployer

These are not files in scope for edits here. The owners of the dense-wire, explore and deploy repos
should hear about them.

| Location | Statement | Verdict |
|---|---|---|
| `dense-wire/web/flx-resolver-launch-panel.mjs` `describeLaunch` (vendored into deploy, dao, treasury and Flux Launch) | "Immutable forever: nothing… will ever be able to change this resolver's manifests or **committee** again." This text is in the signing dialog. | BANNED word in user-facing signing copy. Use "provider set". Fix once in dense-wire and re-vendor (centralize, don't duplicate). |
| `flux/explore/js/explore-app.js` :521 | dossier label "**Committee**" (`K=… of … provider(s)`) and "Committee: not active on this node" (README) | BANNED. Use "Providers (K-of-N)". |
| `flux/explore/js/explore-app.js` :521 and README | `CHAIN_STATUS` answers `CHAIN_UNKNOWN` for every resolver chain ("launched, not activated", `GR` Phase 25), so Explore reads "not active" for every resolver | Misleading next to "Providers: 1 announcing now". The label should say the K-of-N stake set is not activated, not that the resolver is inactive. |

---

## 3. Proposed copy, page by page

Voice: the site's own. Short declaratives, one idea per sentence, a boundary stated plainly.

Disclosure follows the site's existing three depths (Answer → Understand why → Evidence, in
`resolver-guide.js`; Focus → Context → Reference, in `ui-state-system.md`). The one-sentence version
always comes first; detail sits behind the depth toggle or a link.

No banned term appears in any proposed string.

### 3.1 `/what-is-a-resolver`: the hub (manifest `resolver.js`)

| Field | Replace with |
|---|---|
| TITLE | A rulebook with its own chain. |
| DISPLAY.TITLE | Ask the mesh. Get a claim you can check. (keep) |
| DISPLAY.LEDE | A resolver is launched with one signed record. It gets its own chain, it is built from shared capabilities anyone can check, and it refuses any record that does not fit its grammar. |
| BODY1 (Answer) | A resolver is a rulebook that runs as its own chain. One signed launch record gives it a chain id, names the capabilities it is built from, and publishes the grammar every one of its records must follow. |
| BODY2 (Understand why) | Capabilities are the shared mechanisms: N-of-M signatures, custody, a ledger, escrow, a signer. Each is published once, with test vectors anyone can run. A resolver composes them and adds its own grammar; it never carries its own copy. So two resolvers that both hold funds hold them the same, checked way. |
| BODY3 (boundary) | Launched is not served. A resolver answers only while a provider announces for it. If it is built from capabilities, only a provider that passed their test vectors gets a seat. |
| BOUNDARY | Its signature is its result. Whether to rely on that resolver is decided before you send anything: read its grammar, its capabilities, and who can change it. |
| LAWS.BODY | Four rules every resolver follows on the network. |
| LAW1 / .TEXT | One launch, one chain. / A single signed record gives a resolver its chain id, its providers and its manifests. Its whole history is readable, oldest first. |
| LAW2 / .TEXT | Built from checked parts. / A resolver names the capabilities it composes. The network refuses a launch that names a capability that is not launched, or not the current version. |
| LAW3 / .TEXT | Its grammar is the gate. / Every record is checked against the grammar the resolver published at launch, before it reaches any peer. A record that does not fit is refused, with the reason. |
| LAW4 / .TEXT | Fixed unless you said otherwise. / A resolver is immutable by default. Only the control key named at launch can upgrade it, and an upgrade adds a new declaration; it never rewrites the old one. |
| ASK.BODY | A resolver only accepts records in its own grammar. Send one that fits. |
| RESOLVE.BODY | A provider of that resolver applies its capabilities to the record. The same capability, at the same version, gives the same answer on every provider. |
| CHECK.BODY | The result is signed. Open it in the explorer: the page re-checks the hash and the signature itself. |
| new: EXPLORE.HREF | `url:https://explore.defxn.com` "See every resolver and capability →" |
| new: DEPLOY.HREF | `route:deployment` "Deploy a resolver →" (after §3.3) |
| SOURCE.HREF | keep `doc:docs/protocol/resolvers.md` (rewritten, §3.11) |

The Evidence depth (third tab) shows a four-row status list derived from `status.md` (§3.11):

- Launch and upgrade: Built.
- Capability registry: Built, none launched on the devnet at the last restart.
- Grammar enforcement: Built, 7 of 12 Unspecified.
- Provider proof: Built.

Each row carries its record ID. None says "Live" without an evidence record.

### 3.2 `/resolvers`: becomes "Resolvers and capabilities" (the registry page)

- **Hero kicker:** "Every resolver runs its own chain · built from shared capabilities".
- **H1:** "Resolvers and capabilities".
- **Hero p:** "This is a snapshot of the registry ledger: every resolver launched on the network and
  every capability it can be built from. Each row links to the explorer, which re-checks it for
  you."
- **Chips:** "Snapshot of `<node>` · `<date>`" and "Live view · explore.defxn.com". The date and
  node are always shown; the snapshot is never presented as live.
- **Cards** (one per resolver), drawn from the snapshot with these facts:
  - chain id;
  - native or third-party;
  - control (a key, or "immutable");
  - composes (capability ids, or "—");
  - grammar ("enforced" or "unspecified (legacy)");
  - providers announcing (count, or "—" when not read; never 0 for unread);
  - link: "Open in explorer ↗".
- **New tile, "Capabilities":** one card per capability, with id, version, vector count, source
  hash (short) and control. Body: "A capability is one shared mechanism, published with the tests
  that define it. A provider must pass those tests before it may serve any resolver that uses it."
  - Empty state (current devnet): "No capability is launched on this node yet." This is a real
  measured empty and is not shown as 0 of anything.
- **Replace the "How a resolver gets published" tile** with "Deploy your own" (short version; the
  long version lives on §3.3):
  1. Write your grammar. Derive it from your own sample records.
  2. Name the capabilities you build on.
  3. Choose: immutable, or upgradeable by one key.
  4. Review the exact record and sign it at deploy.defxn.com.
  5. Run a provider for it. If you compose capabilities, prove them first.

  Link: "Full walkthrough →" `route:deployment`.
- **Keep the old six entries** (PVA, NFT, stream…) only under a separate, collapsed heading:
  "Applications that read records but are not resolver chains yet". Owner question Q5.

### 3.3 `/how-deployment-works`: rebuilt as "Deploy a resolver"

Recommended: keep the route key and URL (6 inbound links; the URL already says deployment) and
replace the body. The agreement path moves to `/lifecycle` under a "retired direction, read-only"
note (owner question Q4).

| Field | Copy |
|---|---|
| EYEBROW | DEFXN / DEPLOY A RESOLVER |
| TITLE | From a grammar to a chain. |
| SUMMARY (Answer) | You deploy a resolver by signing one launch record. It gives your resolver its own chain, names the capabilities it uses, and publishes the grammar every record must follow. Then a provider serves it. |
| SIMPLE.TITLE | One record launches it. One key, or none, can change it. |
| Step 1 / Write the grammar | Say exactly what your records look like: their kinds, their fields, and which fields every record carries. Derive it from real sample records, not by hand. The deployer compiles it with the network's own compiler before you sign. |
| Step 2 / Name your capabilities | List the shared mechanisms your resolver uses: signatures, custody, a ledger, escrow. The network refuses a launch that names one it does not know. |
| Step 3 / Choose who can change it | Immutable: nobody, ever, including you. Or one control key: only that key can sign an upgrade, and every upgrade is a new record that sits beside the old one. |
| Step 4 / Review and sign | The deployer shows the exact unsigned record. You sign only after you have read it. The network answers with the record's ID, or a refusal that says what is missing. |
| Step 5 / Serve it | A provider announces an address for your chain. If your resolver uses capabilities, the provider first proves it runs them by passing their test vectors. |
| Step 6 / Watch it | Every record your resolver admits appears in the explorer, oldest first, re-checked in your browser. |
| BOUNDARY | Launched is not served: a resolver with no announcing provider answers nothing. The explorer and deployer run on the development network today; public hosting is not established. |
| CAUTION (new, behind "Before you sign") | A launch uses a position on your own key's chain. Signing two different records at the same position freezes that key for good. Launch once per key, or use a fresh key. |
| PLANNED (new, behind "What's next", labelled Planned) | One deployer for sites, apps, databases, packages, modules and code repos, each as records on its own resolver chain. Audits and bounties for capabilities. One standard host for every resolver. None of these is built yet. |
| ACTION | "Open the deployer ↗" `url:https://deploy.defxn.com` · "See launched resolvers ↗" `url:https://explore.defxn.com` |

**Must be removed regardless of Q4:** CHAPTER.CHECK.WHY3 ("quorum… durable after three
attestations… 375 times a second").

If the owner keeps the agreement story on this URL, the interim replacement is:

> **Signed, then stored.** The resolver signs the result. That signature is the result. Copies go
> to other peers, which store it without redoing the work. Anyone can check it later by walking the
> signatures.

### 3.4 `/chain`

| Field | Copy |
|---|---|
| LEDE | Every identity signs its own chain. Every resolver runs its own chain. One base chain records which resolvers and capabilities exist. No record waits on anyone else's. |
| Step "Check" `says` | The signature verifies and the record fits its grammar: the base grammar, and, for a resolver's record, the grammar that resolver published at launch. What it means is the resolver's job. |
| Case "Staking" | Party `provider.fxn`; `says`: "The stake resolver locks 500 FXN for provider.fxn's seat." |
| Case "Swaps" | `says`: "An intent to swap. The launch's signer resolves the batch and signs the result. That signed result is what peers store." |
| New detail behind the scene (one line + link) | "Where do resolver chains come from? → What is a resolver" |

### 3.5 `/about`

- **POINT2.TEXT:** "Every identity writes to its own append-only chain, and every resolver runs its
  own. A record is admitted if its signature verifies, it extends the signer's head, and it fits
  the grammar of the resolver it names."
- **POINT4.TEXT:** "The resolver model is implemented in source: launch and upgrade, shared
  capabilities with test vectors, grammar checks, and provider proofs. It runs on the development
  network. Packaged releases and production activation remain unverified."
- **FLOW2.TEXT:** "A resolver applies its own published grammar and capabilities to your request
  and signs the result."

### 3.6 `/dao`

- **DECK:** "…Their rosters, thresholds, activation rules, and evidence are separate; neither
  threshold acts for the other."
- **New POINT, "Who can change a resolver?":** "The key its creator named at launch, or nobody. A
  resolver launched immutable can never change. An upgrade is a new signed declaration that sits
  beside the old one; records signed under the old rules stay valid."
- **New POINT, "The DAO is a resolver":** "On the development network, the DAO runs as its own
  resolver chain, built on the shared N-of-M signature capability: at least two signers, and a
  threshold of at least two."
- **POINT1 (seven operators):** owner question Q6. Either cite where that policy lives today, or
  mark it as the earlier substrate design.

### 3.7 `/deploy` (named networks)

Add one line above the procedure:

> Deploying a resolver is a different action. A named network scopes miner presence; a resolver
> gets its own chain. → Deploy a resolver

### 3.8 `/bundle-deployer`

Add one boundary line, labelled **Planned**:

> Sites and apps will deploy from deploy.defxn.com as signed records on the bundle resolver chain.
> Not built yet.

### 3.9 `/download` and the operator docs

- **POINT4.TEXT:** "A clean local start proves your miner starts. It does not mean any resolver is
  served, and says nothing about the public network or production."
- **operators/verification.md, "Resolver deployment" section:** record these facts:
  - chain id;
  - launch CID;
  - control field;
  - grammar state;
  - providers announcing, with their proof CID;
  - observation time and node.

  Read them in the explorer and paste its verified rows.
- **operators/troubleshooting.md:** "A resolver is launched but nothing answers" → check
  `CHAIN_PROVIDERS` (deadline passed? re-announce is not automatic yet), the proved column, and
  whether its capabilities are launched at the pinned version.

### 3.10 `/resolver-math`

- Replace the hand-written counts with derived ones, and split them into two rows:
  - "resolver chains launched on the registry: N (snapshot date)";
  - "resolver families audited: 20 (6 measured)".
- Add a summand row: "capabilities launched: N · the mechanisms resolvers can be built from".
- Rename "capabilities" (sayable things) to "sayable things" in `resolver-math.js` and
  `resolver-block.js`.
- Fix the heading at :155 ("for exactly one letter" → "for five letters") from the generated
  census.

### 3.11 Canonical docs (edit these first, per `content-sources.md`)

**`docs/protocol/resolvers.md`**, full replacement outline:

1. What a resolver is (§1.1 sentence).
2. Three layers (§1.2, short).
3. Launch: the record and its fields (§1.5).
4. Composition and the three facts (§1.8).
5. Grammar enforcement, including the Unspecified legacy state.
6. Upgrades and immutability (§1.7).
7. Launched vs served.
8. Trust boundary, as reconciled in Q3.
9. Planned (§1.10 rows marked Planned).

Keep the content-sources rule "published ≠ deployed" as "launched ≠ served".

**`docs/glossary.md`** terms:

| Term | Definition |
|---|---|
| Capability | A shared mechanism (multisig, custody, ledger, escrow, signer) published once on the registry ledger with a derived manifest: version, seam, test vectors, source hash. |
| Resolver | A rulebook launched as its own chain: capabilities plus its own grammar. |
| Base chain | — |
| Chain id | — |
| Registry ledger | — |
| Launch record | — |
| Control key | — |
| Immutable | — |
| Offer manifest | — |
| Grammar manifest | — |
| Test vectors | — |
| Provider proof | — |
| Launched / Served | Replaces "Deployed". |
| Signer (of a launch) | — |
| Unspecified grammar | — |

Delete the old "Capability" line. Reconcile :15 and :29 (Q3).

**`docs/status.md`:** new observed date. Rows from §1.10, each with an evidence record ID that must
be filed first in `evidence/registry.md`. Planned rows are `Not built`. Rows for capabilities
launched on the devnet are `Unverified` until re-read.

**Rename the column `Capability` → `Feature`** in `status.md`. Otherwise the word means two things
on one page. Owner question Q1.

**Banners** (one line each): `protocol/agreements.md`, `protocol/authority.md`, `overview.md`
core-flow section, `prototype-to-production.md` and `whitepaper.md` §resolvers:

> Written for the agreement-fabric direction. For resolvers today, read
> [resolvers](protocol/resolvers.md).

This follows "you do not change the past": banner, not rewrite, for the frozen ones.

### 3.12 Flux Launch

Apply these on `wave3-launchpad-v2`, or after it merges. That branch already carries "Backed
launch, required" and the fee panel.

| Location | Copy |
|---|---|
| index.html :235 / :452 | Every price here is from a signed result: the launch's signer resolves each batch and signs it, and your browser checks the signature. Your own limits run before anything is signed. |
| index.html :536 | They pick a ticker and supply, choose the fees within fixed caps, and lock a creator bond in escrow for at least 90 days. Every launch names the one key that will resolve its trades. |
| index.html :538-539 | During the curve, each buy is resolved by the launch's signer, filled in order and signed. Your FXN moves through custody, and the signed result is what every other node stores. Another node asked to fill it refuses and points you to the signer. |
| index.html :554, app.mjs :1322 | **A bonded creator.** The bond is locked when the token launches. A rug attempt is simply refused. The bond is forfeited only on a proven violation: half to holders, 30% to the treasury, 20% to whoever proved it. |
| create.html :178 | The bond is locked in escrow for its term and returned after it if nothing was proven against the launch. Trying to sell the locked allocation is refused; it does not cost the bond. |
| index.html :581 / :597, app.mjs :1331 | Three named fees, the same for every trader: the market fee on the curve (1%, or 2 → 1 → 0.30% as the curve sells), the pool fee after graduation (your tier, at most 1%), and the venue fee (0.20%: 40% providers, 30% insurance, 30% treasury). No fee can exceed its cap. |
| app.mjs :1486 / :1518 | Fee: market fee `<mm>` + venue 0.20% (shown in the quote). |
| app.mjs :1315 CUSTODY_NOTE | Backed launch: trades, the bond and the insurance account are real FXN in custody, read from signed records. Older unbacked tokens: figures are the curve's own record and no FXN moved. |
| holdings.mjs chip "Not backed" | Curve position (no FXN moved). |
| index.html :799 (Resolver tab) | A resolver is a rulebook with its own chain. Launching one signs a single record on the base chain: its chain id, the capabilities it is built from, its grammar, and who (if anyone) may upgrade it. → What is a resolver (defxn.com) |
| Resolver panel (upstream, in dense-wire) | Add a "Built from" picker filled from `CAPABILITY_LIST`. It writes `composes` into the offer manifest. Show inline: "The network refuses a launch that names a capability it has not launched." Surface the provider-set and speed defaults as read-only facts in the review. Replace "committee" with "provider set". |
| "Chain status" panel title (Q9) | Interim: "Launch status". This avoids teaching "every token is a chain" while the code and the model differ. |

---

## 4. Diagrams

Draw these as inline SVG in the existing schematic grammar (`dx-sx` / `ArkUI.createStoryDiagram`).
They are illustrations, captioned "Illustration · relationships, not live state", like the
existing guided diagrams.

1. **Layers: kernel → capabilities → resolver chains**, for `/what-is-a-resolver` "Understand why"
   and `/resolvers`.
   - **Bottom band, "Base chain":** four kinds of record shown as small ticks: launch a resolver,
     upgrade it, launch a capability, records.
   - **Middle band, "Capabilities":** five tiles (multisig, signer, custody, ledger, escrow). Each
     carries a small "vectors ✓" badge and a source-hash stub.
   - **Top band:** three resolver chains drawn as horizontal tick lines with their own ids (`dao`,
     `treasury`, `your-resolver`). Each draws thin lines down to the capabilities it composes (dao
     → multisig; treasury → multisig + custody).
   - **One rule per band, as caption:** "never learns a business kind" / "published with its
     tests" / "composes, never copies".
   - Phone width: the bands stack and the composition lines become chips under each resolver.
2. **Deploy flow (six stations)**, for `/how-deployment-works`.
   - Stations: grammar → capabilities → control (fork: immutable / key) → review & sign → serve
     (provider + proof badge) → explorer.
   - Under the line, two refusal branches drawn as short side exits with their exact refusal
     names: "grammar does not compile" (before signing) and "capability not launched" (at the
     node).
   - This shows that refusals name the problem rather than failing silently.
3. **Launched vs served**, small, for `/what-is-a-resolver` BODY3.
   - One resolver chain with a dashed outline (launched, no provider), then a solid one with a
     provider dot carrying a proof badge.
4. **Upgrade supersedes**, for `/dao` "Who can change a resolver?".
   - A declaration head moves right; the old declaration stays on the line, greyed but present.
   - A lock icon replaces the key for the immutable case.
5. **Swap as signed resolution**, a variant of `/chain`'s Swaps case.
   - Two intents enter, one signer resolves the batch, and one signed result goes to peers.
   - A second node's arrow ends in a refusal tag: "resolved by `<signer>`".

---

## 5. Page structure, new pages and inbound links (no orphans)

| Change | Inbound links it needs | Notes |
|---|---|---|
| `/what-is-a-resolver` becomes the hub (rewrite) | Already 21 inbound. Add outbound to `/resolvers`, `route:deployment`, explore.defxn.com, deploy.defxn.com. | No new page. |
| `/resolvers` → "Resolvers and capabilities" (rewrite) | Today 2 inbound (stats, zero). Add: `/what-is-a-resolver` (LAW2 and Evidence depth), `/how-deployment-works` step 2, `/resolver-math` (counts row), `/chain` LEDE detail, header menu `REFERENCES` slot (Q8). | Outbound today: 0. Every card links to Explore. |
| `/how-deployment-works` → "Deploy a resolver" (rewrite, same URL) | Keeps its 6 inbound. Add: `/what-is-a-resolver`, `/resolvers`, `/deploy` (disambiguation line), `/bundle-deployer` (Planned line), `/dao` (new point). Nav label `DEPLOYMENT` ("How it works") becomes "Deploy a resolver". | `how/ask`, `how/work` and `how/check` (agreement chapters) move with the agreement story to `/lifecycle` or stay hidden. Q4. |
| `/resolver-math` | Has **0 inbound page links** today. Add from `/what-is-a-resolver` Evidence depth ("Why your resolver's limits are yours") and from `/resolvers`. | Independent of this audit, but it is the foundation page. |
| Optional new page `/capabilities` | Only if the `/resolvers` capability tile grows past one screen (fold budget: page ≤ 1.6x viewport). Inbound from `/resolvers`, `/what-is-a-resolver` LAW2, `/how-deployment-works` step 2, glossary link. | Not recommended now. Absorb into `/resolvers` first. |
| External links to explore.defxn.com and deploy.defxn.com | Use `url:` link fields in the manifests. They are editable in the CMS and resolved by `ArkUI.dash.linkEl`. | Do not publish these until their production hosting is real. Until then, use `url:` with a "development network" label, or hide them behind a flag. Q2. |

The page-inventory agent's `pages.md` should list the renamed titles and the new inbound links
from this table once they land.

---

## 6. What the CMS should expose

1. **Typed block `RBLOCK_RESOLVER_V1`.**
   - Props: `chainId`, `snapshot` (CID or date key), `show` (control / composes / grammar /
     providers).
   - It renders from the dated registry snapshot (item 3), never from a hand-typed fact, and links
     to Explore.
   - Authors drop it into any page that names a resolver: dao, resolutions/governance,
     resolutions/payments.
   - It goes in the `sanitize()` whitelist in `js/content/components.js` and the Library tab
     (`js/admin/library.js`).
2. **Typed block `RBLOCK_CAPABILITY_V1`.**
   - Props: `capabilityId`, `snapshot`.
   - It renders version, vector count, source hash (short), control and "providers that proved it".
3. **A derived snapshot, not an authored registry.**
   - Replace `js/content/resolver-registry.js` (hand-written, 2026-10-08) with a generated
     `js/content/registry-snapshot.js`.
   - A script, for example `scripts/snapshot-registry.mjs --node <ws> --write | --check`, reads
     `RESOLVER_LIST`, `CAPABILITY_LIST` and `CHAIN_PROVIDERS`.
   - It verifies manifest hashes the same way Explore does.
   - It stamps node, time and binary (`BUILD_INFO`).
   - `--check` fails a test when the file and its source disagree. This is the
     `gen-resolver-algebra.cjs` pattern already used for `resolver-algebra.js`.
   - Absent facts stay absent ("—"), never 0.
4. **A diagram component** for the layers figure (§4.1). Its labels come from the snapshot (which
   capabilities exist), so the picture cannot claim a capability that is not launched.
5. **Copy guard.** Extend `tests/no-deprecated-vocabulary.cjs`, or add a sibling test, to scan:
   - rendered manifest values (`js/content/manifests/*.js`);
   - article bodies and descriptions;
   - `seo-data.js`;
   - `home-flow.js` CASES.

   Today only 12 docs are scanned, which is why "quorum" survives on `/dao` and
   `/how-deployment-works`. The ledger `docs/deprecated.md` should also gain "BFT/Byzantine" (memory
   `flx_forward_directive_locked`). This is a test change and needs the owner's go-ahead.

---

## 7. Order of work

Follows the `docs/content-sources.md` update rule:

1. File evidence records: launch/upgrade live proof (`GR` Phase 21), capability registry (`arch`
   §6 B3), grammar enforcement (B2), provider proof (2D/2B), Explorer/Deployer (Phase 24).
2. `docs/status.md` rows, then `protocol/resolvers.md` and `glossary.md` (§3.11).
3. Manifests: `resolver.js`, `deployment.js`, `chain.js` (plus `home-flow.js`), `about.js`,
   `dao.js`, `deploy.js`, `bundledeployer.js`, `download.js`.
4. `/resolvers` with the derived snapshot and CMS blocks (§6).
5. `seo-data.js` descriptions and `aiSummary` (which regenerates `llms.txt`), and article
   descriptions.
6. Article banners; `resolver-math` counts.
7. Upstream (not this repo): the "committee" string in `flx-resolver-launch-panel.mjs` (fix in
   dense-wire, then re-vendor) and the Explore "Committee" label.

---

## 8. Open questions for the owner

- **Q1. Status column name.** Rename `docs/status.md`'s "Capability" column to "Feature", so that
  "capability" means only the shared mechanism on the registry ledger?
- **Q2. Linking to the explorer and deployer.** May public pages link to explore.defxn.com and
  deploy.defxn.com before production hosting is confirmed? Phase 24 said hosting and DNS were
  untouched. If not, should the links point at a "development network" note instead?
- **Q3. Signature and trust.** The site says "a signature is not a verdict; a checker decides".
  The forward directive says "the shard signs the result; that signature is the truth". Proposed
  reconciliation, used in §3.1: "Its signature is its result. Whether to rely on that resolver is
  decided before: its grammar, its capabilities, who can change it." Accept?
- **Q4. The agreement lifecycle.** `/lifecycle` (intent → offer → agreement → fulfillment →
  receipt) and the agreement chapters are the agreement-fabric path that `status.md` marks Retired,
  but they are still a main nav story. Options:
  - keep them, with a banner, as how agreements between parties work;
  - retire them to `/learnings`;
  - or keep them and move them off `/how-deployment-works`.

  The recommendation is the third.
- **Q5. Old directory entries.** What happens to the six `resolver-registry.js` entries (PVA books,
  NFT collections, market, stream, dao-governance on ark-miner-cli, defi-transfer)? None is a
  registry-ledger chain. Options: keep them under "applications, not resolver chains yet", or drop
  them.
- **Q6. The seven-operator policy.** Where does `/dao`'s seven-operator substrate policy (4/5/3/5
  of 7) live today? Should it stay on the page?
- **Q7. The `governance-without-a-validator-set` slug.** Its URL contains a banned word. Should it
  be renamed with a redirect, or kept as a historical URL?
- **Q8. Public resolver count.** Which count is the public one: resolver chains launched (12
  native on the devnet), or resolver families audited (20, 6 measured)? The recommendation is to
  show both, labelled.
- **Q9. Token chains.** Should public pages state the token-chain discrepancy (code: one chain id
  per launch; model: tokens inside a native chain) now, or wait until the code matches the model?
  `/stats`'s "Sovereign chains" section is the visible instance.
- **Q10. CMS scope.** Should the CMS blocks (§6) read a live node, or only the derived snapshot?
  The recommendation is snapshot only: the site stays static, and "live" lives in Explore.
