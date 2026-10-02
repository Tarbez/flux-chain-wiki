# Verification status — 2026-09-30

## Automated checks

The current workspace run has 34/34 CommonJS files passing and 5/7 runnable ESM files passing. `admin-session.test.mjs` and `miner-discovery.test.mjs` cannot bind loopback listeners in this sandbox (`EPERM`); those are environment blocks, not failed product assertions. `publish.e2e.test.mjs` was not run because it needs a live Miner. This is a test-suite count, not a percentage of design or release completion.

- 39 test files pass in the current sandbox (34 CommonJS + 5 ESM).
- The two loopback files passed in the earlier permission-enabled run; they remain an external verification gate here because the current escalation reviewer is unavailable.
- `auth-bundle.cjs` now passes. The shared Auth Kit build paths were corrected to the current `design/` and `flux/` ownership; the generated bundle matches its source exactly.

The account route now composes that same browser-only Auth Kit bundle, disposes its signer when the page exits, and performs an optional exact-ID identity read against the local Miner after unlock. When the signed identity record carries an `accountId`, it follows that exact binding to the `accounts` source and shows the returned standing/status; it never infers a binding. FXN holdings and Credits remain explicitly unavailable because no verified holdings read contract is exposed. It was inspected at desktop and 390px; the sign-in button contrast was corrected. The DAO apps now import one Ark UI scoped-consent view, with exact signed bytes visible; their 14 focused race/UI tests and type checks pass. The underlying dialog also passes focus-wrap and restoration tests.

## Fixed in this verification pass

### Shared transition flash cleanup

The reported lifecycle screenshot exposed outgoing home content restyled by the next route. The router now finishes the outgoing exit before changing route-dependent styling and removes stale pages before the switch. A root opacity envelope covers elements outside the stagger selector list, and scroll restoration occurs before the entry paints. The partial `lifecycle-departing` hero-hide rule is removed.

Regression checks verify a deferred exit retains its route styling, the incoming page stays hidden at the switch, all catalog routes dispose of outgoing DOM before changing scene state, and root fades cover unmatched children. Browser checks on a fresh preview covered home → lifecycle and interrupted lifecycle stage → home → overview navigation. This fixes the shared handoff; it does not claim frame-by-frame visual inspection of every route/theme combination.

The next audit found a second timing defect: the outgoing page had exited, but the incoming page waited for the mesh's late overlap marker. The router now starts the incoming fade as soon as the route-style switch is safe. The lifecycle regression checks both forward and reverse handoffs, including the absence of outgoing DOM at the switch and immediate entry relative to mesh motion.

Article serialization and editor drafts previously dropped `core` and `questions`. Saving or publishing could therefore discard the primary summary and interactive question labels. The content model now preserves these optional fields, validates their types, and copies draft question arrays without mutating loaded content. Save/load, registry update, editor-copy, and exact bundle round-trip checks cover this regression.

The article editor now exposes the layer-1 primary summary and each section's question prompt. Adding or removing a section keeps its prompt aligned; validation rejects orphaned prompts. New notes start with both primary and question layers. The experiment introduction and model page now each have a semantic `h1`; browser inspection confirmed both headings, working model controls, and no horizontal overflow at 390px on the model and lifecycle pages.

Updated outdated test assumptions for the approved home copy, page-owned shape choices, the quiet default on reading pages, the Night Signal fallback theme, and the complete bundle file inventory. Optional word-shape mode still has renderer and font-recovery coverage; its tests explicitly enable it rather than requiring it on reading pages.

### Route, editorial, and first-fold follow-up

The actual HTML load order now initializes the page catalog before scene state. A test reads that order from `index.html` instead of using a hand-picked test order, and checks catalog/scene parity. Browser navigation confirmed the home primary CTA reaches How it works and that the resolver and reference routes render. The router also rejects a missing scene entry before hiding the outgoing page; its regression test confirms the current page stays visible on failure.

The home hero remains the primary first-viewport action. At the owner's direction, the lifecycle panel is again beside it on desktop (browser-checked at 1280px and 945px), and follows it in the narrow-screen flow (checked at 390px). There was no horizontal overflow at those widths. Reading copy on the source-run page and article core is 16px sans-serif in the browser. The article editor and content model retain relevance, review date, evidence link, related route, and next action; the reader shows relevance at layer 1 and the supporting links in an expandable reference layer. The three published articles no longer present unverified benchmark comparisons or named-network activation as established fact.

The protocol overview now keeps its five supporting explanations behind a named `Context / inspect how Flux fits together` disclosure, so its first layer remains an answer rather than a long wall of detail. The route mount and copy checks pass for this layer boundary.

CAP-004 now has a dated source-model verification record: 9 resolver tests passed against tracked revision `8f59718a953d` on Node.js `v24.9.0`. This supports the source-model claim only, not public deployment. See `docs/evidence/cap-004-verification.md` and the registry.

## Still open

### Subsequent operator-workflow pass

The named-network setup page now shows one command at a time, with five direct step choices, Previous/Next controls, progress text, and an explicit all-steps review mode. Inactive steps are hidden and inert. Step selection transfers keyboard focus to the heading; returning from all-steps review restores the selected step. These controls describe reading progress, not successful execution of the commands.

Browser checks at 390px verified next-step selection, one visible step, 44px Copy buttons, successful copy feedback, light-theme review mode with all five steps, and no document-level horizontal overflow. Dark and light screenshots were inspected. Automated route checks cover direct selection, previous/next, the last-step boundary, review mode, and restoration of the selected step.

### Local Explorer and design-preview pass

All 31 route modules mount, have catalog/scene parity, and retain valid internal links. Security checks allow browser connections only to the loopback Miner listener; no remote Miner or sample-record fallback was introduced. The new Explorer was browser-checked at 390px in Night Signal and Porcelain, including readable filled actions and no horizontal overflow. It displayed the expected offline/CORS state because no approved Miner was connected. A successful live Explorer contract run remains open; see `docs/explorer-local.md`.

The treasury and deposit routes are fictional design previews, not financial capabilities. Their primary actions were checked in both themes at 390px. The source-run guide now exposes one setup step at a time and a compact numeric mobile selector; route tests cover selection, next/last-step boundaries, review mode, and restoration. The mobile page was browser-checked for no horizontal overflow. See `docs/economy-preview.md` and `docs/page-density-audit.md`.

### Remaining gates

- Complete route-by-theme visual review, including keyboard and reduced-motion journeys in the browser. Automated animation tests are not a substitute for this review.
- Review remaining editorial claims against dated live evidence and independently reproduce the operator path. The article review date records editorial review, not capability verification.
- Production domain, social assets, and crawler-visible route hosting described in `public-readiness.md`. The owner chose a local-only Miner connection for this stage; a public Explorer endpoint has neither been requested nor configured.
- Independent execution of operator commands against an approved source environment and verification of live production evidence.
- The wiki publish action now has an explicit scoped review: it shows the exact name-record bytes and SHA-256 digest, and its cancel path produces no signature or publish request. It still signs the existing Ed25519 name record; this must not be described as DAO-style hybrid ML-DSA authorization until the wiki receives that verifier contract. Account standing is now read only through a signed identity `accountId` followed by exact `accounts` lookup. Live FXN/Credits holdings read contracts remain absent, so those values stay unavailable.

Batches 4–6 are not fully closed by these automated results alone.
