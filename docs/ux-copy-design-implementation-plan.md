# Flux Protocol Site: UX, Copy, Design, and Documentation Implementation Plan

Status: implementation in progress — Batches 1–3 content gates passed with an evidence/editorial follow-up; Batch 4 interaction and visual pass implemented, final cross-theme review remains  
Approved writing direction: outcome-led, plain technical confidence, explicit `Live now / Not yet` boundaries  
Scope: public site, routed learning surfaces, navigation, responsive behavior, SEO, operator documentation, and evidence links

Implementation record:

- Local Explorer and financial preview follow-up (2026-09-30): added `/explorer` to the public navigation as a read-only consumer of the existing `/explorer/v1` contract. Its endpoint is fixed to the local Miner (`127.0.0.1:8766`) per owner direction; connection failure remains visibly offline, with no sample records. Added clearly fictional `/treasury` and `/deposits` design previews with `FXN / Tier 1` and identity-bound, non-transferable `Credits` kept distinct. No wallet, deposit, transfer, or balance API is connected. Route/SEO inventory is now 31. The account page can also check one signed-in identity by exact ID and, only when that signed record includes `accountId`, follow it to an exact `accounts` standing record. It never infers holdings or standing. The source-run guide reveals one step at a time with explicit review mode, matching the named-network guide. See `docs/page-density-audit.md`, `docs/explorer-local.md`, and `docs/economy-preview.md` for the current boundaries and remaining verification.
- Home layout correction (2026-09-30): restored the Agreement lifecycle preview to the right of the primary hero on desktop. It remains secondary in contrast and scale, while the primary CTA stays visually dominant. On narrow screens it follows the hero in a linear reading flow. Browser-verified at 1280px, 945px, and 390px with no horizontal overflow.
- Critical follow-up (2026-09-30): corrected production script order so all catalog routes receive scene state before navigation, and added a pre-handoff guard so a missing scene entry cannot blank the current page. Browser-verified the primary home CTA and resolver/reference routes. Restored 16px sans-serif reading copy, and kept article relevance in the core with evidence/review/related/next-action links inside a disclosure. Qualified unsupported benchmark and named-network claims; CAP-004 now has a dated, revision-bound source-model test record. These changes do not establish a public miner source URL or production deployment.
- Operator workflow follow-up: replaced the named-network page's default five-step wall of text with one active command and direct step navigation; retained an explicit all-steps review mode. Improved mobile type, Copy touch targets, and announced clipboard feedback. Verified 390px light/dark layouts and added state-transition regression checks. This is reading guidance, not an execution/completion tracker.
- Batch 6 verification pass: 39 test files pass in the current sandbox (34 CommonJS and 5 runnable ESM); two loopback suites remain environment-blocked by `EPERM`, and the live-Miner publish E2E remains unrun. Fixed real article data loss in editor drafts and serialization (`core`/`questions`), with save/load and bundle round-trip regression coverage. The shared Auth Kit and authorization-view bundles now rebuild from the current `design/` and `flux/` roots; the remaining open gates are live-Miner and visual/release checks. Full details and remaining gates: `docs/verification-status.md`.
- Batch 5 metadata pass: the original 27 public routes received distinct titles/descriptions; the four later routes are also covered, bringing the current inventory to 31. Static home tags match the approved copy. Browser navigation synchronizes social tags and clears stale image/canonical overrides. Automated tests cover metadata uniqueness, catalog parity, tag replacement, and removal. See `docs/public-readiness.md` for the unresolved production-origin, social-asset, and hash-route indexing gates. This is not a claim that route-specific crawler previews are complete.
- Follow-up QA: fixed the inverse Next detail button being overwritten by theme text rules. Verified computed foreground/background colors in Porcelain and Night Signal, and mobile (390px) next-step and evidence-level navigation without horizontal overflow. Full route-by-theme visual coverage remains open.
- Batch 5 started: lifecycle overview and all five stages now have editable SEO entries; the generated route inventory is tested against the complete live catalog. Fixed description leakage between route changes with a behavioral regression test. Production origin, route-specific metadata, social previews, and the hash-routing/indexability decision remain release gates; no production host has been invented or published.

- Batch 4 restores interactive mechanism levels, selectable detail and lifecycle facts, session memory, and keyboard return. Home has a responsive composition with a prominent operator path; the operating model uses interactive geometric cards. Shared grid framing responds to navigation, and reading typography has been updated. The invisible legacy lifecycle canvas no longer takes focus. Responsive browser review covers home at 390, 768, 1024, and 1440px and mechanism context at 390px; cross-theme review and the complete route screenshot matrix remain open.

- Batch 1 established and verified the canonical documentation topology, glossary, status vocabulary, evidence registry, public claim inventory, content ownership rules, and `Flux Protocol` naming. The only literal legacy-name residue is a documented inert default in a generated auth bundle whose historical build dependency is unavailable; active runtime and authored source use `Flux Protocol`.
- Batch 2 rewrote and verified the home-to-operator journey, intent-based navigation, protocol overview, resolver definition, reference-evidence boundary, source-run page, and named-network procedure.
- Batch 3 consolidated Networks content; rewrote Lifecycle, Authority, Governance, Activation, Network evidence, and Benchmarks; added shared status/limitation/evidence treatment; and reframed the lab as an illustrative model.
- The Slate state contract now maps Focus → Context → inner detail, keeps status visible, moves supporting mechanics and evidence behind explicit disclosure, and prevents legacy lifecycle-canvas labels from competing with route content. See `docs/ui-state-system.md`.
- Batch 0's catalog/scene parity and primary route handoff now pass locally. Independent command execution against an owner-approved public source and production hosting verification remain release gates; see `docs/verification-status.md`.

## 1. Product contract

### Primary

A new visitor can understand what Flux Protocol is, decide whether it is relevant, inspect the evidence, and reach a runnable operator path without learning internal vocabulary first.

### Complement

This work does not:

- invent capabilities, release status, repositories, measurements, or deployment paths;
- hide unfinished security boundaries;
- turn the site into generic SaaS marketing;
- replace the protocol specification with simplified copy;
- treat illustrative experiments as live network telemetry;
- redesign the admin or publishing system unless a public-site requirement depends on it;
- overwrite concurrent route/link work already present in the worktree.

### Reference

Implementation must be checked against:

- `js/content/manifests/*.js` for public page copy;
- `js/content/articles/*.js` and `js/content/article-index.js` for long-form evidence;
- `js/pages/catalog.js`, `js/ark/scene-state.js`, and `js/ark/page-router.js` for the route contract;
- `css/home.css`, `css/page-layout.css`, `css/navigation.css`, and `css/document-flow.css` for the current visual system;
- `/Volumes/PortableSSD/studio/RekIt/docs/unified-slate-threads-design-laws.md`;
- `/Volumes/PortableSSD/studio/RekIt/docs/design-doctrine.md`;
- `/Volumes/PortableSSD/studio/RekIt/must-follow-law.md`;
- live source or measured artifacts for every capability and benchmark claim.

## 2. North-star journey

The public journey is:

1. Understand Flux.
2. Decide whether it fits.
3. Inspect how it works.
4. Verify what is live.
5. Run the software.
6. Register or join a network.
7. Diagnose failure without leaving the documentation path.

Every public page must serve exactly one of those movements.

## 3. Audience and conversion model

### Primary audience

Technical operators and protocol teams evaluating infrastructure for an independently governed network.

### Secondary audiences

- DAO and institution infrastructure teams;
- application-specific network builders;
- bridge and interoperability builders;
- reviewers evaluating the protocol's authority and agreement model;
- contributors running or inspecting the source.

### Primary conversion

The primary conversion is not an account signup. It is a qualified visitor reaching a verified, runnable source path with correct expectations.

### Supporting conversions

- reading the protocol overview;
- inspecting a reference resolver;
- understanding the agreement lifecycle;
- reviewing authority and governance boundaries;
- opening the source repository;
- completing a documented local verification step.

## 4. Content rules

1. Lead with the user outcome, then name the Flux mechanism.
2. Define a term the first time it appears on a journey.
3. One paragraph should carry one claim.
4. Separate `Live now`, `Not yet`, and `How to verify`.
5. A CTA must describe the destination, not advertise an unavailable capability.
6. A status claim needs a timestamp or a source that establishes freshness.
7. A benchmark needs release, mode, environment, workload, and comparison limits.
8. A command needs prerequisites, exact syntax, expected result, and a recovery path.
9. A page must not require another broken or undefined page to explain its primary noun.
10. Technical precision is preserved in deeper sections; it is not front-loaded into the first sentence.

## 5. Terminology contract

| Term | First-use plain-language bridge | Technical definition location |
| --- | --- | --- |
| Flux Protocol | Shared infrastructure for independently governed networks | Protocol overview and spec |
| Resolver | The deployable definition of a network or protocol surface | Resolver page |
| Manifest | The signed document that declares the object and its rules | Resolver and lifecycle docs |
| Mesh | The peers that discover and process Flux objects | Protocol overview |
| FXN chain | One signed, append-only chain per identity; it checks grammar, signature and position, nothing else | Home, protocol overview, `docs/WHITEPAPER.md` |
| Agreements resolver | Reads intent, offer, agreement, fulfillment and receipt records across the participants' chains | Lifecycle overview |
| Authority cell | A short-lived signer group derived for one object and transition | Authority page |
| Network | An independently addressable Flux tenant; currently a presence boundary | Networks page |
| Mesh operations | Governance of the shared Flux substrate | Governance page |
| Network DAO | Governance belonging to one registered network | Governance page |

`Chain` means the FXN chain: one per identity, never one global chain. Call the earlier design `the retired block/validator chain`, and never describe resolver meaning (transfers, agreements) as something the chain itself checks. (Updated 2026-10-08 for the whitepaper direction; the earlier rule banned `chain` outright.)

## 6. Information architecture

### Persistent navigation

The persistent header should contain:

- Overview
- How it works
- Run Flux
- All pages

`Deploy` should not be the first-action label while public deployment requires source setup.

### Expanded navigation

The expanded index should group pages by visitor intent:

1. **Understand** — Overview, Resolver, Networks, Agreement lifecycle.
2. **Evaluate** — Reference resolvers, Governance, Authority, Benchmarks, Current status.
3. **Run** — Source setup, Create or join a network, Verify installation, Troubleshooting.
4. **Read** — Notes and long-form articles.

The index should not expose the internal manifest taxonomy as the visitor's first model of the site.

## 7. Page implementation matrix

### Home

Job: establish relevance and start one qualified journey.

Required structure:

1. Audience qualifier.
2. Outcome-led heading.
3. Two-sentence definition.
4. Primary CTA: `See how Flux works`.
5. Secondary CTA: `Run Flux from source`.
6. `Live now / Not yet` evidence strip.
7. A quieter lifecycle preview to the right of the hero on desktop; below the hero on narrow screens.

Approved copy direction:

- Eyebrow: `Protocol infrastructure for independent networks`
- Heading: `What if every identity had its own chain?`
- Intro: `DEFXN gives every identity its own signed, append-only chain. The chain checks only grammar, signature and position; resolvers for transfers, books, markets and governance decide what a record means. Chains never wait on each other, so capacity grows as nodes join.`
- Primary CTA: `See how Flux works`
- Secondary CTA: `Run Flux from source`

Remove or demote:

- unaudited live-looking status labels;
- the signal diagram from the decision path;
- lifecycle stage navigation that competes with the primary CTA; the right-side preview must remain visibly secondary;
- `Deploy parse resolve` as the primary proposition.

### Protocol overview (`/about`)

Job: establish the category, model, current capability, and trust boundary.

Rename the visitor-facing label to `Protocol overview`. Do not use the SEO fallback `About us` unless the page contains team/stewardship information.

Required sections:

1. What problem Flux addresses.
2. The three-part model: directory, FXN chain (one per identity, resolvers on top), governance.
3. What is live.
4. What is not yet a boundary.
5. How to verify the claims.
6. One next movement into `How it works`.

### Resolver

Job: define the core noun with a concrete example.

Approved opening direction:

> A resolver is the deployable definition of a network or protocol surface on Flux. It is expressed as a manifest: a signed description of what the object is, how it is addressed, and which rules apply.

Required sections:

- familiar definition;
- smallest concrete example;
- what Flux does with it;
- what the resolver owner governs;
- what it does not guarantee;
- CTA to reference resolvers.

### Reference resolvers

Job: convert an architectural claim into inspectable proof.

Each reference needs:

- name and purpose;
- current status and observation date;
- network or resolver identifier;
- source or manifest link;
- what the example proves;
- what it does not prove;
- inspect, run, or fork action when one actually exists.

If those fields cannot be sourced, the page must say `Reference evidence pending` rather than `running today` without a path to inspect it.

### How Flux works

Job: explain the complete model before asking the visitor to operate it.

Use a five-movement overview:

1. Register an independently addressable network.
2. Publish or select the resolver rules.
3. Open an intent.
4. Close the signed agreement path.
5. Verify the receipt and governing authority.

End with two paths:

- `Understand the agreement lifecycle`
- `Run Flux from source`

### Run Flux from source

Job: get a qualified operator to a verified running process.

This replaces the ambiguous visitor-facing `Download` promise until a public binary channel exists.

Required content:

- supported platforms and versions;
- system prerequisites;
- canonical repository URL;
- exact checkout/install/start commands;
- configuration and required environment variables;
- expected first successful output;
- how to verify daemon health;
- how to stop and restart safely;
- known limitations;
- troubleshooting link;
- release and security verification when available.

### Create or join a network

Job: perform one operator task after Flux is already running.

This page should not pretend to install or deploy the full system.

Required flow:

1. Prerequisite check.
2. Create a network or choose an existing network ID.
3. Start the daemon against that network.
4. Inspect the result.
5. Explain the present boundary: network-scoped presence, not full account, identity, DAO, or treasury isolation.

Every command must include a copy control and expected output. Conflicting command forms such as `network create`, `flux-network create`, and `flux-network network create` must be resolved against the canonical CLI before publication.

### Agreement lifecycle

Job: make verifiability understandable through one example.

Use one continuous scenario across Intent, Offer, Agreement, Fulfillment, and Receipt. Each stage answers:

- who writes it;
- what it references;
- what becomes true;
- what is still not true;
- how the next stage continues the trail.

### Networks

Job: answer `What does a Flux network isolate today?`

Lead with the current boundary, then explain creation, joining, governance, and future isolation. Do not split the answer between `purpose` and `studio` pages with repeated copy.

### Authority

Job: answer `Who can approve this transition?`

Required order:

1. Direct answer.
2. Derivation inputs.
3. Threshold evidence.
4. Dissolution.
5. What the cell cannot authorize.

### Governance

Job: answer `Who can change what?`

Use a two-column comparison between mesh operations and a network DAO. Include scope, roster, threshold, activation rule, and explicit non-authority.

### Benchmarks

Job: communicate measured evidence without collapsing unlike tests.

Required hierarchy:

1. Executive conclusion.
2. Current best measured result.
3. Test conditions.
4. Comparable and non-comparable baselines.
5. Incomplete measurements.
6. Source artifacts.

### Interactive model

Job: help a reader form a mental model.

Rename `Demo`/`The open lab` to `Interactive model` unless real network data is connected. `Illustrative, not live network data` must appear beside the title, not only as a footnote.

### Notes and articles

Job: provide depth and durable evidence.

Add to every article:

- one-sentence relevance statement;
- source/evidence block;
- last reviewed date;
- related mechanism page;
- one appropriate operator or evaluation action.

## 8. Documentation architecture

Create a public documentation set under `docs/` without duplicating manifest copy.

### Required documents

1. `docs/index.md` — documentation map and audience routing.
2. `docs/overview.md` — canonical protocol definition and capability status.
3. `docs/quickstart.md` — shortest verified source-run path.
4. `docs/operators/prerequisites.md` — platforms, dependencies, ports, storage, keys, and environment.
5. `docs/operators/run-from-source.md` — canonical installation and start procedure.
6. `docs/operators/networks.md` — create, join, inspect, and current isolation boundary.
7. `docs/operators/verification.md` — health checks, expected outputs, signatures, and receipts.
8. `docs/operators/troubleshooting.md` — symptom, cause, evidence to collect, and remedy.
9. `docs/protocol/resolvers.md` — manifest/resolver reference.
10. `docs/protocol/agreements.md` — lifecycle and CID linkage.
11. `docs/protocol/authority.md` — authority-cell derivation and limits.
12. `docs/protocol/governance.md` — mesh operations versus network DAO.
13. `docs/protocol/benchmarks.md` — release-separated measurements and source artifacts.
14. `docs/status.md` — dated `Live / Partial / Not built` capability matrix.
15. `docs/glossary.md` — canonical terms and prohibited conflations.

### Documentation source law

- Public pages summarize; docs instruct; source/spec material proves.
- Shared facts must have one canonical source and be rendered or referenced elsewhere.
- Do not copy the same capability-status paragraph into multiple manifests and Markdown files.
- If automation is not yet practical, use explicit source comments and tests that compare critical phrases/status values.

### Command documentation template

Every command procedure uses:

1. Goal.
2. Preconditions.
3. Command.
4. Expected output.
5. Verification.
6. Common failure.
7. Recovery.
8. What this does not establish.

### Status vocabulary

Use only:

- `Live` — implemented and verified through a named path.
- `Partial` — implemented with a named missing boundary.
- `Not built` — no production capability exists.
- `Unverified` — the audit could not establish the current state.

Never express an absent capability as zero, and never turn `Unverified` into a negative product conclusion.

## 9. Visual implementation laws

1. One dominant movement in the first viewport.
2. Body copy uses content typography, not mono.
3. Mono is reserved for commands, identifiers, state labels, and compact metadata.
4. Default body text must be at least 16px on reading pages and 15px on compact explanatory surfaces.
5. Critical copy must meet WCAG AA contrast against its rendered background.
6. Decorative WebGL, grain, and diagrams must not lower text contrast or intercept input.
7. Mobile becomes a single linear document flow; desktop absolute positioning must not leak below the breakpoint.
8. Lifecycle, evidence, and status modules are subordinate to the primary promise. The home lifecycle preview may sit beside the promise on desktop when it does not compete with the primary action; narrow screens keep a linear order.
9. Motion communicates transition only; it must not delay access to copy or hide the primary action.
10. Reduced-motion mode and keyboard navigation remain release gates.

## 10. Implementation batches

### Batch 0 — Truth and route gate

Objective: every linked route loads, every CTA has a valid destination, and no public claim depends on an unknown source.

Work:

- reconcile `pageCatalog` and scene-state creation order;
- load every real route through the production script order;
- finish the route integration test so it exercises actual page modules;
- resolve canonical CLI command forms and repository URLs;
- inventory every `live`, `real`, `online`, `open`, `working`, and benchmark claim;
- mark each claim `verified`, `partial`, `not built`, or `unverified`;
- preserve and incorporate the existing uncommitted route/link changes.

Gate:

- every header, home, footer, and in-body link activates a real page;
- the production-load-order test passes;
- no implementation batch proceeds with unresolved command syntax.

### Batch 1 — Canonical content model and docs skeleton

Objective: create the single vocabulary, status model, and documentation topology that later copy consumes.

Work:

- create the documentation files listed above;
- establish glossary and status matrix;
- define evidence records for capabilities, references, and benchmarks;
- decide which facts are authored once versus referenced;
- align `Flux Protocol` naming across title, metadata, navigation, and docs.

Gate:

- every public claim has a canonical source location;
- the docs map routes each audience to a valid next page;
- brand terminology has no `Flux Chain`/`Flux Protocol` conflict.

### Batch 2 — Conversion path copy

Objective: implement the approved journey from understanding to a verified run path.

Work order:

1. Home.
2. Protocol overview.
3. Resolver.
4. Reference resolvers.
5. How Flux works.
6. Run from source.
7. Create or join a network.

Gate:

- a new reader can state what Flux is, who it is for, what is live, and the next action after reading only the home page;
- CTAs describe their destination accurately;
- no first-use paragraph contains an undefined protocol term.

### Batch 3 — Mechanism and evidence pages

Objective: make the spec understandable without losing precision.

Work:

- consolidate repeated Networks/Register content;
- rewrite Lifecycle, Authority, Governance, and Benchmarks around visitor questions;
- add evidence, status, and limitation blocks;
- connect mechanism pages to canonical docs;
- reframe the lab as an illustrative model.

Gate:

- each mechanism page answers one named question;
- every measurement and authority claim links to evidence or is marked unverified;
- repeated copy does not drift across manifests.

### Batch 4 — Visual hierarchy and responsive redesign

Objective: apply Slate laws to the approved content structure.

Work:

- rebuild the home first viewport around one movement;
- keep the lifecycle preview beside the home hero on desktop, but subordinate in emphasis; linearize it below the hero on narrow screens;
- replace mono body treatment with content typography;
- increase text size and contrast;
- linearize mobile layout;
- simplify the expanded navigation around visitor intent;
- preserve the distinctive Flux atmosphere as a supporting layer.

Gate:

- the primary page purpose is identifiable within three seconds;
- desktop and mobile have one obvious first action;
- 390px, 768px, 1024px, and wide-desktop screenshots pass visual review;
- no copy is hidden, overlapped, clipped, or delayed behind motion.

### Batch 5 — SEO, metadata, and public readiness

Objective: make the approved information architecture discoverable and shareable.

Work:

- set the canonical site name;
- write unique titles and descriptions for every public route;
- include every public route in the SEO route inventory;
- configure the production base URL;
- generate and verify sitemap and robots output;
- define canonical and social-image behavior;
- decide whether hash routing is acceptable for the deployment target or needs static route generation/rewrites.

Gate:

- every route has a unique title and description;
- sitemap coverage matches the public route catalog;
- direct entry and refresh behavior is verified for every public URL.

### Batch 6 — Full verification and editorial QA

Objective: prove the delivered experience, not only the component pipeline.

Work:

- run automated route, copy, SEO, security, accessibility, and content-presence tests;
- execute every published command in a clean supported environment where feasible;
- verify every internal and external link;
- verify keyboard-only and reduced-motion journeys;
- visually inspect all routes in dark and light themes when supported;
- conduct a terminology drift scan;
- conduct a claim-to-source audit;
- record known gaps without converting them into implied capability.

Gate:

- all required automated tests pass;
- all primary journeys pass in a real browser;
- every command is verified or explicitly marked unverified;
- the final status matrix matches the shipped product.

## 11. Test changes required

Add or extend tests for:

- route catalog ↔ scene state parity under the real browser load order;
- every public CTA target;
- unique page purpose, primary CTA, and required capability-status block;
- prohibited first-use jargon on home and overview;
- `Flux Chain` naming drift outside historical contexts;
- sitemap route parity;
- required repository URLs and expected-output sections in operator docs;
- command syntax consistency across manifests, renderers, README, and docs;
- mobile content presence at 390px;
- reduced-motion content presence;
- minimum body-size and semantic token use where static inspection is reliable.

Do not update assertions merely to match new copy. Each changed assertion must state the user-facing failure it prevents.

## 12. Definition of done

The implementation is complete when:

- all public routes load and can be entered directly;
- the home page communicates audience, outcome, current capability, boundary, and next step;
- the operator path can be followed from source setup through network inspection;
- public pages, docs, and source use one terminology contract;
- every status and benchmark claim is sourced or marked unverified;
- mobile and desktop preserve the same content hierarchy;
- the site passes the applicable Slate public-readiness gates;
- no existing user-owned worktree changes are lost;
- final verification results and known limitations are recorded in the repository.

## 13. Execution rule

Begin with Batch 0. Do not start visual redesign or broad copy replacement until route behavior, command truth, repository locations, and evidence ownership are resolved. The approved voice governs writing, but verified product truth governs every sentence.
