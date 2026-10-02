# Flux: guided knowledge, visual storytelling, and redesign batches

Date: 2026-10-02 · Status: proposed direction and batch plan, awaiting user review. This document does not implement the redesign or start an implementation goal.

**Review sequence:** read this audit → confirm or revise the direction → set the implementation goal. The latest continuity requirement is part of the proposed foundation, not an optional animation polish batch.

## Goal and intended experience

The site should communicate its knowledge through a guided conversation. Show the primary answer first. Let the reader request complementary explanation and reference evidence through interactions and inner pages while retaining a recognizable layout. The object the reader chooses should become the place where its knowledge opens: a compact panel expands into its dashboard, and the dashboard holds the related inner pages. Colors and shapes should explain where the reader is, what changed, and which decision comes next. The target is zero information overload, with subtle rounded softness and the dense mesh retained in a smaller, purposeful region.

A visitor should be able to say: **“I understand the answer, I know its limits, I can see where this view came from, and I know what to inspect or do next.”** Each interaction should teach one distinction or advance one task. An animation earns its place by explaining a relationship, a change of state, or a consequence.

**Spatial continuity is a primary design rule:** preserve the selected box itself through navigation. Its position, dimensions, and softly rounded boundary change continuously; the box stays visible. Only its inner content may fade as new information replaces the old. This continuity explains movement from summary to detail; it must not imply protocol execution or verification.

Keep the technical precision and existing functionality. Simplify the visible surface by relocating information, not by discarding it or hiding a limitation needed for a decision. Preserve the source-backed/partial/unverified distinctions, local-only Auth Kit handling, bounded Miner reads, and fictional economy previews.

## Audit coverage and evidence

Reviewed the current catalog, all public page modules, manifests, article renderer, navigation, shared state, background, and layout/theme rules. Checked the default rendered state of **all 31 public routes** at **1280 × 800** and **390 × 844**, in the browser's existing theme. The route measurements and visible control inventories are saved in [route-scan.json](design-audit-2026-10-02/route-scan.json).

Also inspected representative rendered layouts and exercised Authority's Context and Evidence layers, an article question and its `?q=1` address, and About's expanded Context. Screenshots show [the mobile operating-model page](design-audit-2026-10-02/concept-mobile.png) and [the signed-out mobile account page](design-audit-2026-10-02/account-mobile.png).

Measurements describe document height and controls in the first viewport, excluding shared chrome. They do not establish cognitive load by themselves. Native collapsed reference content is excluded from control counts. Matching the route heading establishes the mounted page; these scans are not a frame-by-frame transition signoff.

Live Miner connection, authenticated account states, all article questions, every mechanism detail, every palette, browser zoom, and reduced-motion transitions have not received exhaustive visual verification in this audit. Those are explicit Batch 7 checks. No Auth Kit was opened and no financial operation or publication was performed.

Canonical Markdown documentation is included as the reference destination and content ownership layer, not counted as additional app routes. Admin/editor/publishing pages are separate operational tools; their workflow redesign is outside these public-site batches. Their content and theme controls must continue to work with the proposed system.

This plan builds on [the state and layer contract](ui-state-system.md), [the previous density audit](page-density-audit.md), and [the existing implementation plan](ux-copy-design-implementation-plan.md). Their historical “implemented” entries do not imply that the present experience meets this newer goal. Source ownership remains governed by [content-sources.md](content-sources.md).

## Findings that determine priority

1. **The main explanatory journey delays the decision.** Resolver, References, and How it works have no route-body continuation control fully inside the first desktop or phone viewport. At 1280 × 800 their documents measure 945, 879, and 989px respectively. All paragraphs are shown together. A short answer and one requested explanation would put the next movement beside the knowledge it depends on.
2. **The lifecycle has inner routes but no continuous guided journey.** Its overview is a five-section list, 1440px on desktop and 1684px on phone. Each stage has four fact selectors, but “Next” reveals a sentence rather than opening the next stage. Status and the full guide sit below the first screen. Keep the scenario; replace the list with a selectable trail and add actual previous/next-stage links.
3. **Operator interfaces disclose too much before the relevant state exists.** Offline Explorer is 1305px/1769px and exposes optional credentials, disabled controls, empty metrics, and future record sections. Signed-out Account is 1287px/2046px and exposes empty identity facts plus unavailable holdings, Credits, and standing. Start with connection or local unlock, then reveal the corresponding result surface.
4. **Existing disclosure is useful but sometimes just relocates a wall of text.** About's Context expands all five supporting sections. The operating-model hub becomes a 1488px stack on mobile; only one of its six destination links fits in the first screen. Both need a compact choice surface and one selected explanation.
5. **Mechanism layering is the strongest reusable pattern, with two gaps.** Core → How it works → Evidence already replaces rather than accumulates content. But `css/experience.css` hides the status explanation in non-core states; Authority's Context retained only “STATUS / PARTIAL” in the browser. Essential limits must remain intelligible. Mechanism inner state is session memory, rather than a directly addressable history state like article `?q=`.
6. **Color does not yet have a stable decision meaning.** Explorer uses `--accent` for a live connection, while that accent also marks editorial eyebrows, selected details, and illustrated motion. `css/settings.css` applies broad important heading/link/button colors. These choices can flatten the intended distinction between an action, a caution, and a verified observation.
7. **Shapes and motion often carry decoration instead of knowledge.** The operating-model cards reuse rings/planes and rotate or translate them on hover. Shared persistent geometry changes framing with route/layer state without naming a protocol consequence. The revised home restores a limited mesh region and a five-stage sequence, but still offers eleven route-body links and an autonomous demonstration alongside the main decision. Its smallest breakpoint uses 6–7px functional labels: fitting the viewport must not come at that readability cost.
8. **Reference destinations break the visual conversation.** Many guides open `docs/*.md` directly. They provide canonical content, but do not guarantee the same shell, an obvious originating-page return, or preserved inner state. Also, several mechanism back links say “THE SPEC” while going to “The operating model”; About's “SEE HOW FLUX WORKS” opens `/concept`, while the header's How it works opens `/how-deployment-works`.

9. **Whole-page presence currently prevents the requested box continuity.** `js/ark/page-router.js` hides the outgoing root through presence, removes outgoing mounts, and then reveals the destination. A mesh camera movement does not preserve the clicked panel. The new requirement needs a retained visual container with separately disposable page content, rather than only different fade timing. This is a source-derived architectural finding; continuous geometry has not yet been implemented or visually verified.

Priority key: **P1** materially obstructs understanding or the next decision; **P2** has usable structure but needs guidance/visual coherence; **P3** needs refinement. Batch 0 establishes the common contract before visual changes proliferate.

## Added bug audit — shared navigation overlays

Added 2026-10-02 after the supplied Understand and Read screenshots. These are defects in the shared navigation, not separate public routes. Reproduced on Home at 390 × 844; the same header/menu implementation serves Explorer and the other routes. The exact crops supplied by the user do not establish the original full viewport dimensions.

Evidence: [Understand screenshot](design-audit-2026-10-02/navigation-understand-user.png), [Read screenshot](design-audit-2026-10-02/navigation-read-user.png), and [browser card/row measurements](design-audit-2026-10-02/navigation-scan.json).

| ID / priority | Observed defect | Cause and effect | Planned correction |
| --- | --- | --- | --- |
| NAV-001 / P1 | Understand's Offer, Agreement, Fulfillment, and Receipt cards shrink into narrow strips; labels crowd the number/arrow region. | At 390px, `css/navigation.css` defines three explicit rows with an 88px minimum for a two-column body containing ten links. The two extra implicit rows resolve to 26px because cards have `min-height:0`. Measured row sizes: 88 / 88 / 88 / 26 / 26px. The panel is 467px high and its content extends to 487px, while the extra cards have no usable label region. | Give every generated row a content-safe minimum, including implicit rows. Separate the orientation area from the destination area; permit deliberate bounded scrolling when necessary. Put the lifecycle's five stages behind a clearly named lifecycle sublevel so Understand begins with principal choices. |
| NAV-002 / P1 | Read's article titles escape their cards and collide with ordinals and neighboring links. | The Notes card spans both columns. Read defines only two explicit rows with a 120px minimum; six links therefore require four rows. The extra rows resolve to 26px. Three article labels measure about 30.16px high before padding, already taller than their cards. Bottom-aligned labels and absolutely positioned numbers/arrows worsen the collision. | Size cards for complete wrapped titles plus separate ordinal/arrow space. Use a consistent compact destination treatment or a named Notes/article sublevel; preserve every article link and readable label. Do not fix this with smaller text, arbitrary clipping, or ellipsis as the only route identification. |
| NAV-003 / P1, source-derived regression risk | Evaluate and other content-heavy groups are vulnerable to the same layout failure. This follow-up did not visually reproduce Evaluate. | `js/resolvers/header.js` produces 13 Evaluate links, ten Understand links, six Read links, and two Run links. The fixed explicit-row rules do not adapt to those different counts or future additions. CSS includes lifecycle/stages layouts, but the current generator creates only the index and the four intent groups; that styling does not create the intended extra hierarchy. | Make row sizing depend on actual content, then implement explicit sublevels where they reduce choices. Test the live catalog and future count/label growth, not a hand-picked screenshot. |

**Scope and ownership:** `css/navigation.css` owns row sizing, card geometry, scrolling, and breakpoints; `js/resolvers/header.js` owns group membership and generated hierarchy. `tests/navigation-index.cjs` covers reachability but its passing result does not prove card readability or non-overlap. Add browser layout checks for the missing geometry contract.

**Batch placement:** treat this as the first B0 repair, before spreading the visual redesign. It is a shared navigation blocker affecting access to the proposed knowledge layers. The audit identifies the fix; these UI defects are not fixed by this documentation update.

**Reproduction:** open All pages → Understand; inspect links 07–10. Return to the index → Read; inspect the three article links after Notes/Model/Interactive model. Check full text, number/arrow separation, and usable hit region after transitions settle.

**Acceptance:** every active route label is fully contained inside its own card, labels never intersect neighboring controls or their number/arrow region, and touch targets remain at least 44px high with adequate extra space for wrapped titles. Every destination is reachable by pointer and keyboard, with visible focus. The Back/title area stays usable. Test index, Understand, Evaluate, Run, Read, and any new sublevels at 320, 390, 620, and 1280px widths, short viewport heights, enlarged text, each palette, and reduced motion. Back/close/open restores the correct layer and focus. Retain all 31 route destinations. Where content cannot fit, use explicit inner pagination/sublevels or a clearly scrollable menu region; do not compress cards to force zero scrolling. The underlying homepage should retain its zero-scroll composition.

## Critical addition — the selected panel becomes the next page

Added 2026-10-02 from the user's direction. **The right-side agreement-cycle box must itself expand into the dashboard for its inner pages.** The surrounding box does not fade out and reappear as another box. Its contents may fade during replacement. Apply this approach to most related page journeys, with a visible origin and a reversible return.

### Agreement-cycle journey to prove first

1. **Choose:** the compact agreement-cycle panel shows its purpose and a clear stage/entry choice. Its mesh blocks remain in a smaller supporting region; the selected item uses the action color and a position marker.
2. **Open:** keep the actual panel visible while its bounds expand and move into the available main content region. Interpolate position, width, height, padding, border/fill, and soft radius without a corner snap. Keep the outer shape at full opacity. The surrounding introduction can yield space; inner text may fade, but must not stretch with the box.
3. **Arrive:** the expanded panel becomes the lifecycle dashboard: orientation, compact stage trail, one primary answer, an essential boundary, and the next decision. Selecting a stage opens the existing child route within this same host. Distinguish the enclosing dashboard from the illustrative agreement record inside it; enlargement is navigation, not acceptance of terms.
4. **Explore:** stage-to-stage and Focus → Context → Evidence changes replace the inner material while the dashboard boundary and orientation remain recognizable. Reveal one requested explanation at a time. Preserve real URLs, the scenario's reference identity, and accurate capability limits.
5. **Return:** Back restores the prior stage/depth. Returning to the originating page contracts the same host to the source panel's current bounds and restores its selection/focus. On mobile, measure the actual source and destination positions; do not reuse desktop coordinates or force unreadable content into a fixed box.

### Continuity across page families

| Journey | Persistent object and spatial story |
| --- | --- |
| Agreement-cycle entry → lifecycle → stage | The cycle panel expands into a dashboard; stage selections change its contents; parent return contracts it to its source. |
| Operating-model topic → mechanism → explanation/evidence | The chosen topic card expands into the mechanism frame; the frame retains topic orientation as inner depth changes. |
| Explorer record → exact record detail | The selected record surface becomes the detail workspace, keeping its identifier and source visible. Data freshness and verification remain separate meanings. |
| Account local unlock → identity dashboard | The local-unlock frame reveals the identity workspace after a real supported result. Motion does not stand in for authentication. |
| Notes preview → article → selected question/source | The chosen reading surface expands into the reader, preserving the article title and restoring the prior question on return. |
| Download/Deploy step → next step or help | One procedure frame persists; only the current step's contents change. A Next click is navigation, not execution. |
| Economy preview → draft review → edit | The local preview frame holds review and edit states, preserving the draft and its fictional/no-transaction boundary. |

These are proposed interaction patterns, not completed behavior. Unrelated header navigation should use the established destination frame without inventing a clicked-card origin. Direct links and reloads render the final dashboard immediately; they must remain complete without a preceding morph. A reference reader can keep the originating frame when that relationship is clear; full document reading still permits intentional scrolling.

### Required shared architecture and edge behavior

Prefer a persistent panel host in the shared shell, outside the page root that the router disposes. Mount and clean up related semantic contents inside that host. Reuse Ark UI's existing primitives where they fit, but separate container geometry from content presence. Changing only easing or fade duration cannot meet this requirement.

The current [state/layer contract](ui-state-system.md) describes exiting and removing the old page before revealing the next. Following review, B0 must revise that contract for retained containers while preserving its important invariant: **one active, readable, interactive content state**. Old contents become inert, their subscriptions/requests are disposed, and they cannot overlap or capture focus. Retaining a visual host is not retaining stale data or multiple active pages. Update the old contract and relevant router/presence checks as part of implementation; this audit does not silently change the runtime contract.

Prepare the destination before committing the transition. If loading fails, keep the usable source state and provide a recovery action inside its frame. Rapid navigation should retarget from the current geometry, not reset to the initial rectangle. Resize, zoom, history navigation, and interrupted transitions must resolve to current valid bounds and the latest selected route. Transfer focus when destination content is ready; restore the originating control on return. Honor pause and reduced motion with immediate geometry/content replacement in the same host and the same understandable final layout.

**Continuity acceptance:** inspect start, midpoint, arrival, and reverse transition. The enclosing box never fades, disappears, duplicates, or jumps to hard corners; only inner contents may fade. Text remains unstretched and legible; no old control remains interactive, and incoming content stays within the soft boundary without clipping necessary information. Deep links, repeated clicks, load errors, Back/Forward, mobile, zoom, and reduced motion all retain correct route/state/focus. Home returns to its zero-scroll layout at normal scale. The mesh remains present in the agreed smaller region and never masquerades as live or verified data.

## The common page and interaction contract

### Three depths, one recognizable frame

| Depth | What remains visible | What the reader can request | Exit/return |
| --- | --- | --- | --- |
| Primary / Focus | One question, its direct answer, a short essential boundary, one dominant next movement | One clearly secondary “Understand why” or “Inspect how” entry | Continue to the next chapter or return to the parent |
| Complement / Context | Topic, position, boundary, one selected example or explanation, one purposeful diagram | A small set of named questions; one answer at a time | Return to the core in one action; continue the example |
| Reference / Evidence | Topic, originating claim, evidence state, date/source when known | Exact document, artifact, identifiers, or full procedure | Back to the same selected Context state |

The primary answer must be readable before interaction. Do not make the visitor select a tab to learn what the page is about. “One dominant action” permits secondary reading choices; they should not look like equally important commands. Index pages can offer two or three peer choices when choosing a topic is itself the task.

Keep consistent slots for orientation, answer/diagram, selected detail, and next movement. Opening Context replaces the inner answer surface while retaining its enclosing panel; it does not push all later content farther down. Preserve title/topic and enough context to understand the detail without repeating the full introduction.

Use real child routes for chapter changes, including lifecycle stages. Make within-page Context/Reference selections addressable with route query state, following the article precedent. Back/Forward must restore the selection and focus. A session-memory restore should show the chosen depth clearly rather than surprise the returning visitor.

Add an in-shell reference reader for approved canonical docs, with an explicit original Markdown link. A proposed `/reference/<document>` route family would be new work, not an existing audited route. Register exact allowed documents in the router/content map; retain canonical content ownership, handle unavailable files, and sanitize rendering. Do not replace durable source URLs with a visual dead end.

### Information and viewport budget

For a normal first state, aim for one heading, one concise answer, one essential qualifier, one primary movement, and at most two secondary entries. Aim for roughly 35–70 words of explanatory body copy; treat this as an editing prompt, not a reason to truncate a necessary boundary.

The home remains zero-scroll at normal text size. Other first-state narrative/task surfaces should also fit their decision within the initial viewport and hold the same frame through inner selections. Explicit full-reference reading, large records, all-step review, and accessibility text enlargement may scroll. This proposal must not silently turn the earlier home-only zero-scroll requirement into clipped reference content everywhere.

Default body reading text should remain about 16px; essential controls should remain readable and have usable hit targets (target 44px for primary touch controls). Microtype is for decorative registration marks, never the only label for a decision or capability limit. At 200% text enlargement and browser zoom, allow reflow/scroll instead of hiding content.

### Colors that guide decisions

Use the existing semantic token source and theme machinery. Do not hardcode one new palette per page or hand-fork generated SDK theme output. Verify semantic mappings in every supported palette; themes may change hue while retaining meaning.

| Semantic job | Token family to consume | Visible meaning and companion cue |
| --- | --- | --- |
| Next action / selected explanation | `--primary` | One dominant CTA; selected item also has a position marker and selected label/state |
| Complementary relationship | `--complement` | A linked participant, layer, or comparison; never a second competing primary CTA |
| Evidence destination | `--reference` | Document/link marker and explicit “Evidence” label; color does not certify truth |
| Verified result | `--trust` / `--success` | Check symbol and precise verification scope; shown only from supported data |
| Live observation | `--live` | Dot plus “Local Miner observation” and freshness/source; live does not imply verified |
| Partial / pending / unverified | `--warning` | Named limitation with an open/unfinished marker; distinguish the actual status words |
| Failure requiring recovery | `--danger` | Error label, brief cause, and one recovery action |
| Decorative mesh / inactive material | neutral text/border tokens | Low contrast, no success-like pulse, no fake state or interaction |

Use contrast and hierarchy before adding color. A selected Receipt in an illustration uses the action color and an “Illustration” label; it must not acquire a verified-result badge. In palettes where two token hues are similar, labels, icons, line style, and position still distinguish them. Check normal text at 4.5:1 and control/focus indicators at 3:1; this is a proposed acceptance gate, not a contrast result from this audit.

Restrict broad theme overrides to presentation defaults so semantic status, selected state, and inverse action text can retain their role. A strong heading is usually neutral. Reserve brighter color for a decision, relationship, evidence entry, or explicit state.

### Shapes and motion that tell the story

Use softly rounded object tiles (about 5–6px) inside panels (about 8px), thin construction lines, selective arcs, and the retained dense mesh region. Reuse the established radius tokens where practical. Rounded participant dots, object tiles, and enclosing scope frames should have different jobs.

| Concept | Shape relationship | Meaningful change |
| --- | --- | --- |
| Network scope | Several rounded tiles on one substrate; a labelled presence frame | Selecting a network frames presence only; unrelated account/DAO tiles stay outside |
| Resolver | Input tile → addressed logic tile → claim tile | The reader supplies/chooses an illustrative input, then sees what the logic claims; acceptance is separately labelled |
| Lifecycle | The same illustrative snapshot object with linked record tiles | Intent is referenced by Offer, accepted terms form Agreement, evidence forms Fulfillment, and a scoped outcome forms Receipt |
| Authority | An object/transition tile and a bounded participant group | Show eligibility, threshold evidence, certificate, then dissolution; no implied standing validator set |
| Governance | Separate substrate and network frames | Selecting a change identifies the responsible roster without merging scopes |
| Activation | Approval record beside an explicit readiness gate | Show the distinction between consent and applying a change; unverified activation remains labelled |
| Evidence | Claim tile connected to a document/artifact | Reveal the source, date, and what it actually establishes |

Do not use unlabelled square rotation, random blinking, or moving rings as explanatory progress. Motion should follow a selected action, preserve the same object through the story, and settle into a readable result. Prefer brief transitions; if a longer demonstration is useful, provide Play/Pause/Replay and keep interaction immediately available. Reduced motion shows the same final state and explanation. Pause state must apply to every story component.

Decorative mesh is not telemetry. Limit its dense footprint to a deliberate portion of a page (starting target: roughly 15–25% of the visible composition), reduce it behind reading text, and retain it as an anchor between chapters. Choose placement by content geometry, not arbitrary page-wide opacity. Global mesh rotation controls belong in an explicitly opened illustration tool, rather than the reading page's default focus order.

## Route-by-route redesign disposition

All 31 existing routes are listed below. Destinations describe intended next movement, not an instruction to rename or remove existing paths. Preserve direct links and aliases.

| Route | Priority / batch | Keep; redesign required; primary decision |
| --- | --- | --- |
| `/` | P2 / B1 | Keep outcome, limited mesh, lifecycle teaser, honest status. Reduce equally discoverable links; reader-controlled teaser, readable phone labels. Decide “Understand Flux” with source-run secondary. |
| `/about` | P2 / B1 | Keep direct answer. Replace five-section Context expansion with selected explanation; visible compact status. Choose the shared-substrate model or continue to How it works with an accurate label. |
| `/concept` | P1 / B1 | Keep three main questions and all six destinations. Replace tall mobile illustration cards with a compact selector and one diagram. Choose network scope, agreement path, or authority; evidence topics sit behind a named secondary entry. |
| `/what-is-a-resolver` | P1 / B1 | Keep definition and publishing/activation distinction. Show definition first, illustrative input/logic/claim on request, acceptance boundary visible. Continue to inspect evidence or the protocol flow. |
| `/start-from-something-real` | P1 / B1 | Keep CR3TV/DeArk evidence-pending disclosure. Use a compact evidence-status surface; publication requirements are Reference. Decide whether there is inspectable evidence, then continue with the mechanics. |
| `/how-deployment-works` | P1 / B1 | Keep all five movements. Show one selected movement on a persistent map, not five paragraphs before the CTA. Distinguish network setup from the five agreement stages. Continue to the source prerequisites. |
| `/download` | P2 / B2 | Keep one-step mode and full review. Add prerequisite-first start, readable named step controls, exact command context, expected result/recovery where relevant. “Next” means next guide step, not proof that software ran. |
| `/deploy` | P1 / B2 | Keep copyable five-step CLI contract and presence-only boundary. Shorten first heading; put active command, expected result, and next step in one frame. Reveal caveat details/review separately. Choose create/select only after discovery context. |
| `/explorer` | P1 / B2 | Keep bounded local reads and no synthetic data. Offline state shows Connect plus optional operator disclosure. Connected state shows one source, then one record. Metadata/topology are inner views. Make refresh/disconnect secondary after connection. |
| `/account` | P1 / B2 | Keep local Auth Kit verification and exact signed account binding. Signed-out state shows local unlock only; verified identity and optional Miner check appear next. Key/wallet facts and unavailable holdings explanation are named inner details. |
| `/lifecycle` | P1 / B3 | Keep replication scenario and all five child routes. Replace stacked summaries with a trail, one-sentence outcome, and selected stage preview. One clear “Follow Intent” entry; keep partial-production boundary visible. |
| `/lifecycle/intent` | P1 / B3 | Keep exact signed need and non-commitment boundary. Show the snapshot becoming an addressed request; actor/CID details on request. Add real next link to Offer. |
| `/lifecycle/offer` | P1 / B3 | Keep proposal-versus-agreement distinction. Visually link the same request to provider terms; details secondary. Add real previous/next links to Intent and Agreement. |
| `/lifecycle/agreement` | P1 / B3 | Keep accepted terms, not proof of performance. Merge matching request/offer into one terms tile. Next link opens Fulfillment; reference identity stays intact. |
| `/lifecycle/fulfillment` | P1 / B3 | Keep submission-versus-acceptance distinction. Attach evidence to the same agreement; checker details on request. Next link opens Receipt. |
| `/lifecycle/receipt` | P1 / B3 | Keep policy-bound verification and explicit non-finality/non-settlement limit. Close the visible references without claiming universal truth. Offer inspect evidence, then return to the full trail. |
| `/concept/purpose` | P2 / B4 | Keep three depths and presence-only answer. Replace repeated scope prose with labelled included/excluded objects. Choose inspect scope, then open the named-network procedure. |
| `/concept/depth` | P2 / B4 | Keep signed-trail overview. Orient to why references make one path inspectable; avoid repeating `/lifecycle`. Choose to follow the concrete scenario. |
| `/concept/practice` | P2 / B4 | Keep one-detail selection and bounded authority. Diagram one transition's participant selection and certificate; keep production limits visible at every depth. Continue to governance comparison. |
| `/concept/notes` | P2 / B4 | Keep approval-versus-activation distinction. Show approval and readiness as separate labelled states. Request gates/evidence; never animate an unverified production activation as complete. |
| `/concept/studio` | P2 / B4 | Keep exact evidence requirements. Show one concise verification question, then a selectable artifact checklist. Request registry/reference in-shell; continue to a documented observation procedure. |
| `/concept/spec` | P1 / B4 | Keep no unsupported performance figures. Simplify long heading/first state; show “No verified benchmark” and one inspect-standard entry. Method/environment/raw artifacts belong in Reference. |
| `/dao` | P2 / B4 | Keep separate authority scopes. Let the visitor choose a proposed change and see which roster is responsible. One complementary comparison at a time; no fake approval operation. |
| `/experiments` | P3 / B5 | Keep illustrative label and model entry. Make the question the main heading rather than “THRESHOLD”; preview a clear cause/effect with the same shape language as Authority. |
| `/experiments/lab` | P2 / B5 | Keep all three models and stored values. One question, one model, one control, one consequence explanation; canonical mechanism link per model. Treat spacing/percentage as an analogy, not a calculated quorum. |
| `/learnings` | P3 / B5 | Keep three-item index. Add a short relevance cue to each title and use “Notes” consistently. Choose an architectural question rather than an estimated reading time. |
| `/learnings/why-the-chain-was-retired` | P2 / B5 | Keep core, relevance, question routes, evidence disclosure. Preserve readable question labels in answer mode; a small history → agreement diagram supports the answer. Benchmark limits remain explicit. |
| `/learnings/one-substrate-many-networks` | P2 / B5 | Keep scope distinctions and question navigation. Reuse the same substrate/presence diagram as Networks rather than inventing another motif. Evidence opens in-shell and returns to the selected question. |
| `/learnings/governance-without-a-validator-set` | P2 / B5 | Keep authority/governance distinctions. Reuse bounded participant/scope shapes; keep current question named instead of number-only navigation. Link to Authority/Activation as an informed next step. |
| `/treasury` | P2 / B6 | Keep asset → movements → detail replacement and fictional labels. Reduce duplicated warnings to a persistent explicit preview boundary plus detail-specific notes. Fictional amount must remain labelled next to the number; no live/success cue. |
| `/deposits` | P2 / B6 | Keep local draft → review → edit, no transaction action. One compact draft frame; asset restrictions in requested context, essential “preview only” boundary visible. No “complete” badge implying a deposit happened. |

## Batch implementation plan

### B0 — Common guidance, visual semantics, and layout contract

**Outcome:** one persistent knowledge frame, continuous panel-to-dashboard navigation, and one consistent meaning for color, shape, depth, and next movement.

Repair NAV-001 and NAV-002 first and cover NAV-003: content-safe rows, wrapped-title geometry, accessible hit targets, and a real lifecycle/article navigation hierarchy where needed. Keep all current destinations reachable. Then define semantic action/status/reference treatments, modest radius scale, default information budget, and the page-region pattern. Consolidate overlapping home/page overrides into intentional ownership rather than appending another competing global sheet. Build shared components for orientation, current boundary, selected explanation, a primary next action, and named evidence entry. Map decorative versus explanatory canvas responsibilities.

Specify and then implement addressable inner state and the approved-doc reference reader. Reuse ARK shell/router/store/presence and vendored components; inspect their existing APIs before choosing additions. Preserve route-state cleanup, hidden/inert behavior, and content editor bindings while moving content disposal inside the retained panel host. Replace whole-root fade behavior for related journeys with measured container geometry and separate content presence. Update the state/layer contract to distinguish host lifetime from inner-page lifetime.

Likely files: `css/page-layout.css`, `css/experience.css`, `css/home-drafting.css`, `css/settings.css`, `css/navigation.css`, `js/ark/page-router.js`, `js/ark/scene-state.js`, `js/pages/sheet.js`, `js/lattice.js`, content/theme adapters. Canonical theme tokens remain sourced from the existing theme system.

**Exit:** all navigation groups pass the NAV-001–003 geometry/reachability checks, then the agreement panel → dashboard → child stage → Context/Reference → return prototype passes the continuity acceptance checks, including Back/Forward and keyboard return; essential status text survives every depth; action, caution, live, and verification are distinguishable; one mesh/story component responds to pause and reduced motion. Validate the pattern before applying it to every family.

### B1 — Entrance and the explanation journey (6 routes)

Routes: Home, About, Concept, Resolver, References, How it works.

Make the primary answer and next decision visible immediately. Reuse one illustrative network/snapshot throughout the explanatory journey. Keep References an optional evidence branch rather than forcing a missing-evidence page into every newcomer path. Fix ambiguous continuation labels. Move publication checklists and supporting paragraphs to inner depth; preserve the distinction between addressable logic and active execution.

Likely files: `js/pages/home.js`, `js/pages/about.js`, `js/pages/concept.js`, `js/pages/resolver-guide.js`, corresponding manifests; `css/home-drafting.css`, `css/resolver-guide.css`, shared layout styles.

**Exit:** at desktop and phone sizes, each default state shows its answer, necessary boundary, and one dominant next movement. The three explanation pages no longer require scrolling to find Continue. The hub reveals every principal topic without tall stacked cards. Home's functional labels remain readable and the mesh is retained. The compact agreement-cycle entry hands off to B3 through the retained host, and the selected Concept topic opens through the same continuity rule.

### B2 — Operator and identity states (4 routes)

Routes: Download, Deploy, Explorer, Account. Prioritize Explorer/Account state gating and Deploy's hidden continuation.

Show prerequisites/connection/local unlock before exposing dependent controls. Give Download and Deploy one persistent active-step frame: explanation, command if applicable, expected result, recover/help, next movement. Keep full procedure review as an explicit reader mode. Do not mark a guide step “executed” from a Next click.

Explorer states: disconnected → connecting → source selection → record list → exact record detail, with specific error/recovery states. Account states: signed out → kit verified locally → optional exact Miner observation → signed standing if supported. Verification scope and freshness stay beside the relevant result. Retain abort/disposal, memory-only credentials, bounded queries, local-only endpoint, and unsupported holdings boundaries.

Likely files: the four page modules and styles, Download/Deploy manifests, `js/admin/auth.js` integration points only where public UI depends on them.

**Exit:** connection/unlock and record-detail states retain their corresponding frame without implying success through motion. Disconnected/signed-out users see no wall of empty metrics or disabled future tasks. The next guide movement is visible beside the current step. Existing command Copy, auth disposal, request cancellation, exact-ID checks, no-synthetic-data behavior, and full review survive.

### B3 — A continuous lifecycle story (6 routes)

Routes: Lifecycle overview and all five stages.

Start from the right-side agreement-cycle panel: its existing box expands into the lifecycle dashboard without fading the container. Keep that host through overview, child stages, and requested details; parent return reverses its geometry. Carry the same snapshot and its growing reference trail through the story. Keep the five-stage map compact. Each child route answers what became true and what is still not established. Actor, references, and evidence are requested details. Separate fact selectors from actual Previous/Next-stage navigation. Receipt offers the evidence trail and a clear route back to overview.

Likely files: `js/pages/lifecycle.js`, `css/lifecycle.css`, lifecycle content/metadata, shared illustration layer, and relevant lattice camera integration.

**Exit:** the panel-to-dashboard and reverse transitions pass the continuity acceptance checks; the same enclosing host persists through the child routes. The visitor can traverse Intent through Receipt without returning to the index or interpreting “Next” as navigation when it is only a fact. No stage repeats the entire overview. Every illustration is labelled; semantic claim boundaries remain visible before progression.

### B4 — Mechanisms and governance as questions (7 routes)

Routes: six `/concept/*` pages and DAO.

Apply B0's retained frame to the existing strong three-depth system. Expand the selected topic card into that frame and replace only its inner material through related depths. Replace generic rotating motifs with the chapter-specific relationships above. Use question-led detail selection, one answer at a time, and an accurately named parent link. Simplify Benchmark's primary wording and preserve the no-artifact conclusion. Restore an intelligible short boundary in Context and Evidence, not just a status code.

Likely files: `js/pages/sheet.js`, `js/pages/theory.js`, `js/pages/dao.js`, six theory manifests and DAO, `css/experience.css`, `css/page-layout.css`, story components.

**Exit:** selected explanation changes a meaningful diagram; inner states can be addressed and restored; limits remain comprehensible; all core questions and next movements fit the default frame without shrinking reading text.

### B5 — Interactive learning and notes (6 routes)

Routes: Experiments, Lab, Notes index, three articles.

Connect each model to the matching canonical mechanism. Use the same visual vocabulary and show the consequence of the control, not just the percentage. Expand the selected Notes preview into the reading frame and reverse on parent return. Keep the article core-first design and `?q=` navigation; preserve readable current-question orientation when the question list becomes a compact rail. Make evidence/review/action separate named choices where useful instead of one vague disclosure containing unrelated exits.

Likely files: `js/resolvers/experiment.js`, `js/pages/lab.js`, `js/studio.js`, `js/resolvers/learnings.js`, article data/index, `css/article-reading.css`, lab styles.

**Exit:** one model/control/consequence is visible at a time; a reader can say which question an article is answering without decoding a number; returning from evidence restores that answer; no illustration claims measurement or live operation.

### B6 — Economy previews follow the same language (2 routes)

Routes: Treasury and Deposits.

Keep the existing replacement-state flows, fictional amounts, and no-transaction boundary. Retain the preview frame through review/edit transitions. Apply consistent selection/reference colors and subtle rounding. Shorten duplicated explanatory warnings while retaining an explicit preview label next to any apparent balance or result. Give validation, draft preview, and edit clear states without introducing a wallet, signature, transfer, or submit-to-network operation.

Likely files: `js/pages/economy-preview.js`, `css/economy-preview.css`.

**Exit:** a visitor cannot mistake fictional amounts, selected draft terms, or a local preview for holdings, settlement, or a completed deposit. Return/edit works and preserves the local draft.

### B7 — Full experience verification and closeout

Run after each batch's local exit checks and once across the complete site. Review default, complementary, reference, empty, error, loading, and successful states where available. Keep live-data integration gates separate from illustrative UI checks.

Check 1280 × 800 and 390 × 844 as the audit baseline; add 1440 × 900, 768 × 1024, 320 × 568, and a short desktop viewport for framing. Test original plus all curated palettes (`bone`, `glacier`, `moss`, `ghost`, `grove`, `marine`), reduced motion, pause, keyboard-only operation, and text enlargement. Capture representative family/state screenshots and every exception.

Include the expanded navigation in the screenshot/state matrix, not just default route bodies. Reproduce the user-supplied Understand/Read failures, inspect Evaluate, and measure link/label bounds after transitions. Add cases with extra destinations and long titles so implicit rows cannot silently collapse.

Capture start/midpoint/arrival/reverse frames for representative panel expansions and verify that the outer host never fades or duplicates. Exercise interrupted transitions, repeated clicks, destination load failure, direct links, resize/zoom, history return, and reduced motion. Verify cleanup of inner contents independently of the retained host.

Behavioral checks should cover substantive risks: route and query-state restoration, parent/child returns, inactive-panel focus, source/detail replacing each other, persistent boundaries, accurate preview/verification badges, command copy feedback, request cancellation, and preserved editor manifest data. Start from the existing route, state-layering, navigation, copy, settings/style-isolation, and mechanism-evidence tests; add tests for new state contracts rather than snapshots mirroring CSS.

**Exit:** every route has a clear primary answer and next decision; no critical next action is buried in its default state; every layer has an obvious return; labels and state remain clear without color or motion; the reference reader retains provenance and originating context; home passes zero-scroll at normal scale without microtype-dependent controls. Deliberate long readers and accessibility reflow are documented exceptions.

## How to review each batch

After the direction is confirmed and an implementation goal is set, use a reviewable before/after slice: one first state, the panel expansion, one requested explanation, and one evidence/return path. Record what remains visible, what moved inward, and why. Review screenshots together with the interaction; a static attractive poster is insufficient.

Acceptance questions:

1. Can a new reader identify the page's question and answer before touching a control?
2. Can they distinguish “understand more,” “inspect evidence,” and “do the next step”?
3. Does the selected box visibly become the next workspace without fading or losing its soft boundary, and does that movement explain the actual relationship?
4. Is the essential capability boundary still present when the reader makes a decision?
5. Can they return to the prior context without losing their place or repeating unrelated introductions?
6. Does the page remain readable and operable on a phone, with text enlargement, without motion, and without relying on hue?

**Proposed first implementation slice, after review:** repair the shared navigation blockers in B0, then prove **Home agreement-cycle panel → lifecycle dashboard → one child stage → Context/Evidence → Back to the same compact panel**, across the relevant B0/B1/B3 pieces. This tests the user's defining continuity requirement before propagating the frame system across 31 pages. Then complete the Resolver → How it works explanation path and Explorer/Account state gating, followed by the remaining batches.

**Current handoff:** the audit and batch plan are ready for the user to read. Confirm or revise the goal, persistent-box behavior, color/shape meanings, information budget, and first slice before setting the implementation goal. No redesign batch is authorized to begin by this document alone.
