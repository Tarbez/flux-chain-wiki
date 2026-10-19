# Per-page UX audit — first half of the routes (A)

Date: 2026-10-19. Scope: the first 35 of the 69 routes in `ArkUI.pageCatalog` (`js/pages/catalog.js`)
as the live page builds it (resolutions, articles, theory sheets and lifecycle stages included),
sorted by path: `/` through `/lifecycle/fulfillment`. The second half (`/lifecycle/intent` onward)
belongs to the companion audit. If that audit splits at 34, `/lifecycle/fulfillment` is covered twice.
Product code was not changed.

## How this was measured

- **Browser:** headless Chromium (Playwright), served by the repo's own harness
  (`tests/browser/harness.mjs` `copySite` + `startHost`) on a free port (never 3437). It served a
  scratch copy of the site. Each route was loaded directly and waited on the router's
  `routeSettled` signal.
- **Viewports:** 1440x900 and 390x844. Each viewport got a top screenshot, a scrolled-to-bottom
  screenshot, and a full-page screenshot. For the full-page shot the viewport was grown by the
  inner scroller's overflow, because pages scroll inside `section.ark-page`, not the document.
- **Fold ratio:** `(viewport + inner-scroller overflow) / viewport` in the initial state, with
  every disclosure closed. The owner budget is 1.6 or less.
- **Contrast:** WCAG text contrast was computed from composited colours. Background-image layers
  were skipped, which is a known blind spot. See /about P0 below: an overlay pseudo-element the
  computation cannot see buried a whole section, and it was found by looking at the screenshot.
- **Control boundary:** the button or link fill/border against its surroundings (WCAG 1.4.11
  wording), below 3:1.
- **Machine:** this Mac, 8 CPUs, load average 13–84 during the runs (other jobs were running).
  The harness scaled its timeouts by a load factor of 1.5–6.
- **rAF rates:** they were re-measured in a separate sequential pass (one tab, load about 17).
  The concurrent-pass rAF numbers are throttled and are not used.
- **Screenshots:** in `$SHOTS = /private/tmp/claude-501/-Volumes-PortableSSD/a51a7d03-a815-4ae1-960d-76c01ee0b2ce/scratchpad/ux/pages-a/`.
  Names follow `<route-slug>-<width>-{top,bottom,full}.png`, where the slug is the path with `/`
  turned into `_` and home is `home`. Interaction shots are `interact-*.png`. This is a scratchpad
  location, so copy anything worth keeping into `docs/ux-audit/` before the session ends.

### Per-route numbers

`fold D/M` = desktop / phone fold ratio (budget ≤ 1.6). `words` = visible words in the initial state.
`jargon` = protocol-term occurrences visible in the initial state (top terms). `ctl<3` = controls whose
boundary contrast is below 3:1 / total controls. `txt` = text contrast failures (desktop).
`tap<24` = phone tap targets smaller than 24px.

| route | fold D | fold M | words | jargon (top terms) | ctl<3 | txt | tap<24 |
|---|---|---|---|---|---|---|---|
| `/` | **2.53** | **2.88** | 158 | 18 (chain 7, signature 6, FXN 3, resolver 2) | 11/16 | 1 | 0 |
| `/about` | **2.23** | **2.81** | 131 | 16 (chain 5, mesh 4, FXN 3, signature 2) | 3/4 | 0* | 0 |
| `/account` | 1 | 1.16 | 51 | 1 (signature 1) | 2/3 | 0 | 0 |
| `/account/domains` | 1 | 1 | 53 | 2 (claim 1, mesh 1) | 1/2 | 0 | 1 |
| `/bundle-deployer` | 1.16 | **2.00** | 208 | 20 (bundle 7, mesh 6, signature 4, FXN 3) | 0/0 | 0 | 0 |
| `/chain` | 1 | 1 | 91 | 12 (signature 4, chain 3, grammar 2, resolver 1) | 4/5 | 0 | 0 |
| `/concept` | 1 | 1 | 66 | 0 | 1/2 | 0 | 1 |
| `/concept/depth` | 1 | 1 | 107 | 8 (receipt 2, chain 2, resolver 1, CID 1) | 7/8 | 0 | 0 |
| `/concept/notes` | 1 | 1 | 78 | 1 | 5/6 | 0 | 0 |
| `/concept/practice` | 1 | 1 | 80 | 0 | 6/7 | 0 | 0 |
| `/concept/purpose` | 1 | 1 | 100 | 0 | 5/6 | 0 | 0 |
| `/concept/spec` | 1 | 1 | 90 | 0 | 6/7 | 0 | 0 |
| `/concept/studio` | 1 | 1 | 93 | 1 (claim 1) | 6/7 | 0 | 0 |
| `/dao` | 1 | 1 | 95 | 5 (mesh 3, quorum 1, DAO 1) | 5/6 | 0 | 0 |
| `/deploy` | 1 | 1.41 | 120 | 4 (bundle 2, FXN 1, peer 1) | 6/8 | 0 | 0 |
| `/deposits` | 1 | 1.09 | 87 | 3 (FXN 2, ledger 1) | 2/3 | 0 | 1 |
| `/download` | 1 | 1 | 120 | 3 (node 2, bundle 1) | 6/7 | 0 | 1 |
| `/experiments` | 1 | 1 | 73 | 3 (quorum, ledger, node) | 0/0 | 0 | 0 |
| `/experiments/lab` | 1 | 1.08 | 65 | 2 (claim, quorum) | 4/4 | 0 | 1 |
| `/explore` | 1 | 1 | 127 | 6 (mesh 5, resolver 1) | 11/12 | 0 | 0 |
| `/how-deployment-works` | 1 | **2.02** | 105 | 1 | 0/0 | 0 | 0 |
| `/how-deployment-works/ask` | 1 | **1.63** | 151 | 5 (signature 5) | 6/6 | 8 | 1 |
| `/how-deployment-works/check` | 1 | **1.66** | 147 | 5 (signature, FXN, Ed25519, receipt) | 6/6 | 6 | 2 |
| `/how-deployment-works/work` | 1 | **1.68** | 146 | 5 (signature 4, FXN 1) | 6/6 | 8 | 2 |
| `/learnings` | 1.44 | **2.16** | 301 | 14 (chain 5, resolver 3, grammar 2) | 0/0 | 0 | 0 |
| `/learnings/a-resolver-by-construction` | 1.13 | **1.74** | 172 | 9 (chain 4, resolver 3) | 11/11 | 0 | 0 |
| `/learnings/governance-without-a-validator-set` | 1 | 1.18 | 95 | 5 (mesh 2, validator 2, DAO 1) | 4/4 | 0 | 0 |
| `/learnings/how-we-got-fast-and-what-we-got-wrong` | 1.08 | **1.76** | 177 | 2 (grammar 2) | 11/11 | 0 | 0 |
| `/learnings/one-substrate-many-networks` | 1 | 1.23 | 99 | 2 (DAO, chain) | 4/4 | 0 | 0 |
| `/learnings/the-chain-prototype-is-the-chosen-path` | 1.08 | **1.65** | 171 | 7 (node 2, chain 2) | 8/8 | 0 | 0 |
| `/learnings/the-grammar-does-almost-no-work` | 1 | 1.48 | 144 | 5 (grammar 3) | 8/8 | 0 | 0 |
| `/learnings/why-the-chain-was-retired` | 1 | 1.29 | 120 | 9 (chain 6) | 5/5 | 0 | 0 |
| `/lifecycle` | 1 | 1.05 | 106 | 10 (signature 3, resolver 2, receipt 2) | 2/3 | 0 | 0 |
| `/lifecycle/agreement` | 1 | 1 | 109 | 2 (settlement, receipt) | 4/5 | 0 | 0 |
| `/lifecycle/fulfillment` | 1 | 1 | 108 | 3 (receipt 2, signature 1) | 4/5 | 0 | 0 |

\* /about's 0 is wrong: the closing section is buried under an overlay the contrast computation cannot see (P0 below).

**Fold with disclosures open:** opening the single "More" disclosure takes `/` from 2.53 to **4.95** and
`/about` from 2.23 to **4.08** (1440x900). Their "More" is one undivided wall, not progressive disclosure.

**Totals for this half:**
- 170 of 195 desktop controls (87%) have boundary contrast below 3:1. This matches the Design
  check's finding of 15 of 17 home buttons.
- 42 distinct rendered font sizes (0–100px).
- 60 distinct button signatures (radius, size, family, fill, case, height).
- 12 corner radii: 2, 3, 4, 5, 6, 7, 8, 9, 10 and 14px, plus 999px and 50%.
- Rendered families: Albert Sans, IBM Plex Sans, IBM Plex Mono, ui-monospace, monospace and **Arial**.

---

## Per route

Severity: **P0** = broken or invisible for every visitor. **P1** = a first-time visitor will
struggle, or a WCAG/owner-rule failure. **P2** = polish or consistency.
"Hand-built" lists the UI patterns the page assembles itself instead of taking them from a shared
component. Those lists feed the component library.

### `/` — Home (`js/pages/home.js`, `js/pages/home-flow.js`)
- **Purpose:** what DEFXN is (identity chains plus resolvers), and where to go next.
- **5-second verdict:** fails. The headline ("Not one chain. A world of them.") is evocative but
  does not say what the product does. Two competing diagrams (the subway map and the isometric
  landscape with a legend) fill the right half. The only primary action, "Follow the line", is a
  white bar with a mini-diagram inside and does not read as a button.
- **P1:**
  - Fold is 2.53 on desktop and 2.88 on phone. Opening "More" gives 4.95 (`home-1440-full.png`, `home-390-full.png`, `interact-home-more-open.png`).
  - Everything after the hero sits behind one `details`: "More: find your place, the architecture, measured evidence and open questions" (home.js:199-202). That one item holds the audience tabs, principles, evidence stats and FAQ. It hides the most useful wayfinding (Explore / Build / Operate) at the same time as making the page longer when opened.
  - 11 of 16 controls have boundary contrast below 3:1. The `hl-case` pickers and `home-cycle-step` are the ghost-on-black family.
  - The header on `/` is a different component from every other route. It has separately boxed, bordered nav items (`home-1440-top.png`), against the joined glass bar with an active underline on the other routes (`about-1440-top.png`).
- **P2:**
  - On the phone the header spends its space on a "Production" status pill and an account icon. No primary nav is visible (`home-390-top.png`).
  - The isometric labels are 6–9px at 390 and unreadable.
  - The closing "Start with the idea. Follow the evidence." repeats the hero CTA pattern 2,000px later.
  - The "Powered, deployed and made by FLX" corner text overlaps the canvas grid at both widths.
- **Fixes (no feature removed):**
  - Lead with one plain sentence ("Your own record of what you did, that apps can read and anyone can check").
  - Make "Follow the line" a real primary button and keep the mini-diagram beside it.
  - Keep one hero diagram and move the subway map to a tab inside the same frame.
  - Promote the Explore / Build / Operate tabs out of "More" to sit directly under the hero, since they are the next step.
  - Split "More" into three named accordions: Architecture, Evidence, Questions.
  - Use the shared header on `/`.
- **Hand-built:**
  - hero with eyebrow, H1, intro and CTA (home.js:150-158)
  - instrument frame with case picker (home.js:163-177)
  - catch-all "More" details (home.js:199-202)
  - audience tablist with tab copy hard-coded in JS (home.js:214-236; copy at 216-218)
  - principle card grid (home.js:254-263)
  - stat cards with hard-coded labels and explanatory text (home.js:269-309)
  - FAQ details list (home.js:324-329)
  - closing CTA scene (home.js:340, art at 53-118)
  - two SVG diagrams drawn imperatively (home-flow.js:130-312 `drawLandscape`, 328-451 `drawScene`)
  - a local `node`/`label`/`section` helper set (home.js:125-131)

### `/about` — Overview (`js/pages/about.js`)
- **Purpose:** the protocol overview (three layers, what you can resolve, who it is for).
- **5-second verdict:** partial pass. The H1 "Resolutions for the mesh." uses two undefined terms
  ("resolutions", "mesh"). The deck sentence does explain it ("the mesh is the database, the host
  and the cloud"). The primary CTA is clear.
- **P0:**
  - The closing section is invisible: "See what resolves on the mesh.", the source-boundary text and the "Evidence & verification" disclosure.
  - Cause: about.js:252 reuses the home closing class `hl-closing`. Its `::after` overlay (css/home-swiss.css:687-696, `z-index:1`, canvas at 98% to 48% opacity) is meant to sit under `.hl-closing-copy` (`z-index:2`). About's children are not in that wrapper, so the overlay covers them.
  - Combined with `min-height:820px` (home-swiss.css:678), this leaves an 800px near-black void (`about-1440-full.png`, `about-1440-bottom-wait3s.png`, `about-390-full.png`).
  - The computed text colour is `rgb(246,245,244)` on `rgb(10,9,8)`, so the contrast checker passes it. Only the screenshot shows the defect.
- **P1:**
  - Fold is 2.23 / 2.81, and 4.08 with "More" open.
  - "More." is set as a 49px H2 only to label one disclosure.
  - "See how DEFXN works" carries an external-link icon although it is an internal route.
- **P2:**
  - The phone layer picker and diagram push the CTA's explanation below the fold.
  - The page continuously requests animation frames: about 83–109 rAF/s at the top and at the bottom of the page. It is the only idle page besides `/chain` that does.
- **Fixes:**
  - Give the closing its own component, or wrap its children in `.hl-closing-copy`, and drop the 820px min-height.
  - Turn "More" into tabs (How it works / Promise / What you can resolve / Who it's for), so opening it does not quadruple the page.
  - Pause the layer figure loop when it is offscreen or after it settles.
- **Hand-built:**
  - hero (about.js:136-142)
  - instrument with layer picker (149-169)
  - "More" details (184-186)
  - step cards (191-195), "no database / hosting / fees / cloud" cards (205-210), group tiles (218-224) and pillar cards (234-241)
  - closing boundary footer (252-256), reference details (257-269), footer link row (273)
  - its own copy of home's `node`/`label`/`section` helpers (104-125)

### `/account` — Your account (`js/pages/account.js`)
- **Purpose:** sign in or create an identity, then the wallet, keys, contacts and network.
- **5-second verdict:** fails for newcomers. There are two H1-scale headings: H1 "Your keys. Your
  world." and H2 "Choose your Auth Kit.", which is set at the same size. "Auth Kit" is never
  explained, and the primary button says "Choose Auth Kit", not "Sign in".
- **P1:**
  - Jargon on the first screen and in later tabs: Auth Kit, Ghost ID, Root key, FXN, Credits "Coming soon".
  - On the phone the primary button is cut at the fold (`account-390-top.png`).
  - The whole page is one HTML string (account.js:58-99+), so none of it is CMS-editable or a component.
- **P2:**
  - The "Sign in / Create identity" segmented control and the later `account-tabs` (role=tab) are two different tab styles on one page.
- **Fixes:**
  - One H1 ("Sign in to DEFXN"), with "Your keys. Your world." as the eyebrow or intro.
  - A one-line "What's an Auth Kit? A small file that holds your keys on this device" behind an info tooltip.
  - Label the primary button "Sign in with your Auth Kit".
- **Hand-built:** account hero with SVG map, profile, key/value identity `dl` with copy buttons,
  tablist, sign-in tabs, balance tiles, wallet form and network options. All in account.js:58-99
  `innerHTML`.

### `/account/domains` — Your domains (`js/pages/account-domains.js`)
- **Purpose:** track `.fxn` names and verify them live.
- **5-second verdict:** pass. The title, intro, single input and "Track & verify" are clear.
- **P2:**
  - "Claim a new name from the CMS on your account" uses "CMS" jargon.
  - The empty state floats mid-right with no visual anchor (`account_domains-1440-top.png`).
  - This is a fourth back-link style ("← Your account" in blue).
  - One phone tap target is under 24px.
- **Fixes:** use "Claim a new name in your account"; anchor the empty state as an empty card with a
  ghost example row.
- **Hand-built:** form row, status line, domain cards — HTML strings in account-domains.js:30-50,
  cards at 64-98.

### `/bundle-deployer` — FXN Bundle Deployer (`js/pages/bundle-deployer.js`)
- **Purpose:** explain the planned local CLI that publishes a site, and what stays private.
- **5-second verdict:** pass. It has a clear H1, a status chip ("CLI in development"), three
  steps and a public/private table.
- **P1:** phone fold is 2.00 (`bundle_deployer-390-full.png`).
- **P2:**
  - The page explains a tool that does not exist yet, but the only action is "Back to your account". There is no "notify me" and no link to `/download`.
  - "Becomes public" uses the accent colour while "Stays on your machine" does not, so the accent is spent on a table header.
- **Fixes:**
  - On the phone, put "Choose what you share" in an accordion under the steps.
  - Add a next step ("Run DEFXN from source" → `/download`).
- **Hand-built:**
  - header with eyebrow and status pill (bundle-deployer.js:11-15)
  - numbered step list (26-34)
  - flow figure (40-45)
  - comparison table (48-56)
  - release callout (62)

### `/chain` — Every identity, its own chain (`js/pages/chain.js`)
- **Purpose:** show one record joining a holder's chain, step by step.
- **5-second verdict:** fails. The H1 is `visually-hidden` (chain.js:41), so a visitor lands on a
  tab row (Swaps / Transfers / Staking / Governance) with no title. The record is shown as wire
  grammar (`G – YLEDGERENTRY – V3 – M1760… – J42 – C2b9d… – S9f1…`) with tiny captions.
- **P1:**
  - The grammar letters are unexplained. "the record shape is the real wire grammar" is the only gloss.
  - At 390 the record boxes are about 6px type and unreadable (`chain-390-top.png`).
  - The scene auto-advances, holding a steady 60 rAF/s while idle.
- **P2:** the back link "← HOME" is an underlined mono link, a third back-link style.
- **Fixes:**
  - Show the H1 and a one-line plain intro.
  - Add a tooltip per box ("who: the holder's name", "position: the 42nd record").
  - On the phone, stack the boxes vertically as a key/value list.
  - Stop the loop after one cycle or when the page is offscreen. The pause button stays.
- **Hand-built:** tablist (chain.js:46-76), stepper and record-grammar diagram (from home-flow.js
  `drawScene`), quote caption, and a pause button.

### `/concept` — The operating model (`js/pages/concept.js`)
- **Purpose:** an index of the "operating model" questions.
- **5-second verdict:** partial. The three question cards are clear. The toggle "Start with a
  question / Inspect evidence & activation" renders as unstyled, Arial-set browser buttons
  (`concept-1440-top.png`). Half the panel is empty.
- **P1:**
  - The toggle buttons fall back to Arial (concept.js:7-8) — a 4th font, outside the three-slot rule.
- **P2:** cards say "open explanation →" in grey with no hover affordance visible at rest.
- **Fixes:**
  - Use the shared segmented control.
  - Show both groups at once on desktop (row plus rail), since the space is there. Keep the toggle only on the phone.
- **Hand-built:** breadcrumb chip, H1 with deck, toggle (concept.js:7-8), and question cards with
  icon, number, link and purpose line (concept.js:10).

### `/concept/depth`, `/concept/notes`, `/concept/practice`, `/concept/purpose`, `/concept/spec`, `/concept/studio`, `/dao` — story sheets (`js/pages/sheet.js` `ArkUI.storySheet`)
- **Purpose:** one question each, for example:
  - "How does one agreement become verifiable?"
  - "When does an approved change become active?"
  - "What is actually measured?"
  - "Who can change what?"
- **5-second verdict:** pass. The question as the H1 is good. A short answer, a status callout and
  one primary CTA make this the best progressive-disclosure template in this half (depth tabs:
  The core idea / How it works / Evidence & limits).
- **P1:**
  - The depth buttons render in **Arial** (sheet.js:104-105 `button` without `font: inherit`). They look like raw browser buttons, and on the phone their labels wrap to two lines (`concept_depth-390-top.png`).
  - Unexplained terms in the answers: CID, FXN chain, substrate, quorum, DAO, roster.
  - The diagram captions inside the illustration are 6–7px mono and unreadable at both widths.
- **P2:**
  - CTA casing is inconsistent between siblings: "FOLLOW THE FIVE STAGES" and "COMPARE GOVERNANCE ROSTERS" are uppercase, "Inspect activation gates" is sentence case (`dao-1440-top.png`).
  - "RUN FLUX FROM SOURCE" (`/concept/spec`) names the product "Flux" while the nav says "Run DEFXN".
  - `/concept/spec` states that no public benchmark artifact is registered, while `/` shows benchmark stat cards. A newcomer reads this as a contradiction.
  - The bottom third of the panel is empty on desktop.
  - Screenshots: `concept_*-1440-top.png`, `dao-1440-top.png`, `interact-concept-depth-how.png`.
- **Fixes:**
  - Use the shared segmented-tab component, with inherited font and role=tablist.
  - Add glossary tooltips on first use of CID, quorum and DAO.
  - Raise diagram text to at least 11px or drop the in-diagram captions, since the numbered legend under the diagram already carries them.
  - Set CTA case once in the button component.
  - Reconcile the benchmark wording with `/stats` and `/`, for example "Measured on the fleet; independent public artifact pending".
- **Hand-built (one shared builder, good):**
  - breadcrumb chip (sheet.js:102)
  - H1 and depth button row (sheet.js:103-105)
  - guided answer, diagram figure with numbered record buttons and a hard-coded label dictionary (sheet.js:106-110)
  - status aside callout (sheet.js:112)
  - footer CTA (sheet.js:113-114)
  - step-picker buttons (sheet.js:121-122)
  - the non-story `ArkUI.sheet` variant: eyebrow, H1, deck, numbered principles inside a "Context" details, limit/evidence details and a footer (sheet.js:3-90)

### `/deploy` — Create or join a network (`js/pages/deploy.js`)
- **Purpose:** five CLI steps to choose or create a named network and start a miner.
- **5-second verdict:** partial. The stepper, the command card with Copy, and "Next step / Review
  all steps" are good. The deck paragraph is set in **monospace at body size**, so it reads as a
  code block, and it opens with negations ("partition miner presence only… not a security boundary").
- **P1:**
  - At 390 the step tabs show only "01–05" with no labels (`deploy-390-top.png`).
  - Two links use a left-pointing "←" arrow for forward destinations: "CLI status and public bundle guidance" and "RUN FLUX FROM SOURCE".
- **P2:**
  - The Copy button style (uppercase navy, deploy.js) differs from `/download`'s Copy (small orange outline).
  - "miner presence" is unexplained.
  - Step copy is hard-coded in JS (deploy.js:28-49), not CMS.
- **Fixes:**
  - Move the deck to the sans body.
  - Lead with what the reader gets ("Pick a network for your miner to announce itself on").
  - Put the "not a security boundary" note in a callout.
  - Show the current step's title next to the numeric tabs on the phone.
  - Use one Copy component.
- **Hand-built:** eyebrow, H1 and back link (deploy.js:13-19); step tabs and step sections
  (63-75); command card with Copy and expected output; progress line ("Step 1 of 5").

### `/deposits` — Deposit preview (`js/pages/economy-preview.js`)
- **Purpose:** a design mock of a future FXN deposit.
- **5-second verdict:** pass. "DESIGN PREVIEW / NOT LIVE" plus the callout makes the status honest
  and clear.
- **P2:**
  - The native `<select>` arrow is unstyled.
  - "Return to treasury preview ↗" uses the external-link arrow for an internal route.
  - Demo data and copy are hard-coded in JS (economy-preview.js:6-8).
  - One small phone tap target.
- **Fixes:** use the shared select component and a "→" internal-link icon.
- **Hand-built:** header (economy-preview.js:30), FXN/Credits toggle with aria-pressed (41-42),
  movement list (63), fact `dl` (111), amount input (126), result panel (140).

### `/download` — Run DEFXN from source (`js/pages/download.js`)
- **Purpose:** five steps to start a local miner.
- **5-second verdict:** pass. The terminal card, step list and "Next step" are clear.
- **P1:**
  - The step buttons (`how-step-button`) render in Arial.
  - On the phone the step tabs are numbers only (`download-390-full.png`).
- **P2:**
  - The terminal card is about 60% empty space at 1440 (`download-1440-top.png`).
  - The Copy button style differs from `/deploy`'s.
- **Fixes:** let the terminal card size to its content; share the step-tab component with `/deploy`.
- **Hand-built:** terminal card (download.js:37-45), `pre` with prompt lines and copy (58-59),
  ordered step list (76), and step data hard-coded in JS (17-25).

### `/experiments` — Interactive model intro (`js/resolvers/experiment.js`)
- **Purpose:** an intro to the threshold-agreement visual analogy.
- **5-second verdict:** fails as a stand-alone page. It has the **same H1** as `/experiments/lab`
  ("How can threshold agreement be pictured?"). The diagram labels "Input A/B/C" look interactive
  but are not. The page exists only to hand off to "Explore the model".
- **P1:** a near-duplicate route adds a click with no information gain.
- **Fixes:** fold the intro and the "Illustrative, not live" callout into `/experiments/lab`'s
  header. Keep `/experiments` as a redirect or anchor, so no feature is lost.
- **Hand-built:** back chip, H1, diagram frame, callout and CTA row (the `REXPERIMENT_V1` template).

### `/experiments/lab` — Interactive model (`js/pages/lab.js`)
- **Purpose:** three analogies (Authority, Lifecycle, Networks) with a convergence slider.
- **5-second verdict:** partial. "Visual convergence 50%" does not tell the reader what to do or
  why.
- **P1:**
  - At 390 the tab strip overflows with no scroll affordance ("Netw…" is cut).
  - The caption "A VISUAL ANALOGY FOR DERIVED, TEMPORARY AUTHORITY." overlaps the dot row (`experiments_lab-390-full.png`).
- **P2:** "FX-001" is an unexplained code. The page is built from one `innerHTML` string (lab.js:15).
- **Fixes:**
  - Add a one-line instruction ("Drag to bring the groups together").
  - Make the tab strip wrap or scroll-snap with a fade edge.
  - Move the caption below the stage on the phone.
- **Hand-built:** eyebrow, H1, status pill, tablist, stage, slider with labels, and an evidence
  footnote (lab.js:15).

### `/explore` — Mesh Explorer (`js/pages/explorer.js`)
- **Purpose:** a plain intro plus a live browser of what is on the public mesh.
- **5-second verdict:** pass. "Your idea, live on the mesh." with a plain deck, an auto-cycling
  "How it works" card, and "Running on the mesh now" tiles.
- **P1:**
  - 11 of 12 controls have boundary contrast below 3:1. The tiles are near-invisible boxes.
  - Tile captions ("OPEN TO BROWSE", "1 MINERS · 2 NETWORKS") are 9–10px mono at low contrast.
  - The `how-work-mesh` grid's internal labels are unreadable.
- **P2:**
  - "1 MINERS" grammar.
  - The "How it works / Live now" pane switch exists only on the phone. On desktop both panes show.
- **Fixes:** raise tile borders to the `--border-strong` token; make captions 12px sans; pluralise
  counts.
- **Hand-built:**
  - the whole page from one `innerHTML` template (explorer.js:77, 103)
  - pane toggle, kind tiles (554-558), filter chips (509)
  - a record list and detail `dl` (691, 766)
  - its own stat card `mesh-explorer-stat` (815), which duplicates `dash-kit` `stat()`
  - node rows (891)

### `/how-deployment-works` — How it works (`js/pages/deployment.js`)
- **Purpose:** three steps to an agreement: state the request, agree on terms, verify the result.
- **5-second verdict:** pass. This is the clearest page in this half: a three-part H1, three cards
  each with a link, and one primary CTA.
- **P1:** phone fold is 2.02, with three stacked tall cards (`how_deployment_works-390-full.png`).
- **P2:**
  - The grid diagrams carry 6px labels.
  - Three canvases (`how-work-mesh`) per page.
- **Fixes:** on the phone make the cards a swipeable carousel or tabs with a dot indicator, so the
  page fits 1.6.
- **Hand-built:** breadcrumb (deployment.js:26), H1 and side deck, linked card grid with canvas
  (45-67), and a "CURRENT IMPLEMENTATION" boundary row (92).

### `/how-deployment-works/ask`, `/check`, `/work` — chapters (`js/pages/how-stories.js`)
- **Purpose:** one chapter per stage, showing the record it produces plus three steps, with
  Why / What it proves.
- **5-second verdict:** pass. The headlines are plain ("Tell them what you need."), and so are the
  record card and the next-chapter CTA.
- **P1:**
  - Text contrast failures: 8 / 6 / 8. The "unlit" `dt`/`dd` rows in the record card measure 1.91:1 at 11px (for example "Outcome", "Policy").
  - On the phone the record fields expose raw identifiers (`inputCid`, `recipientId`, `nextSequence`) (`how_deployment_works_work-390-full.png`).
  - The step buttons render in Arial.
  - Phone fold is 1.63–1.68, just over budget.
- **P2:** the view tabs are a third segmented-control look (`how-view-tab`).
- **Fixes:**
  - Dim with the `--text-muted` token, not opacity; keep at least 4.5:1.
  - Show friendly field names with the raw key in a tooltip or `code` hint.
  - Use the shared step and tab components.
- **Hand-built:**
  - breadcrumb and header (how-stories.js:14-15)
  - record card with a key/value `dl` and canvas (23-26)
  - expandable step list (29-40)
  - view tabs with aria-pressed (44-47)
  - footer CTA row (51)

### `/learnings` — Notes from the work (`js/resolvers/learnings.js`)
- **Purpose:** an index of seven long-form notes.
- **5-second verdict:** pass for intent; the cards are clear.
- **P1:**
  - Phone fold is 2.16.
  - On the phone each card shows the excerpt **above** the title (`learnings-390-full.png`). On desktop it sits below, so the visual order flips.
  - The section has four names: URL "learnings", H1 and eyebrow "Notes", the article corner link "← TUTORIALS", and the article link "ALL LEARNINGS".
- **P2:**
  - Card excerpts misalign when titles wrap (`learnings-1440-top.png`).
  - The intro line is set in mono.
  - The excerpt for card 06 says "25,232 ops/s on the author's Mac", while the article's core says 51,065 and 279,269 ops/s. The numbers disagree.
- **Fixes:**
  - Pick one name.
  - Use the card component with title, then meta, then excerpt, and a fixed excerpt clamp of 3 lines.
  - Paginate or filter by category, so the list fits 1.6 on the phone.
- **Hand-built:** eyebrow, H1 and intro (learnings.js:48-51), and a card list with number, H2,
  duration, purpose and arrow (53-61). The H1 copy is hard-coded in JS.

### `/learnings/*` — 7 articles (`js/resolvers/learnings.js` `RARTICLE_V1`)
Routes: `a-resolver-by-construction`, `governance-without-a-validator-set`,
`how-we-got-fast-and-what-we-got-wrong`, `one-substrate-many-networks`,
`the-chain-prototype-is-the-chosen-path`, `the-grammar-does-almost-no-work`,
`why-the-chain-was-retired`.
- **Purpose:** a core answer, then 11 or so question-led sections, then evidence.
- **5-second verdict:** pass for structure (the core plus a question list is good progressive
  disclosure).
- **P1:**
  - The H1 and body are set in **uppercase / regular monospace** (`learnings_*-1440-top.png`). Long-form paragraphs in mono are hard to read, and no other page sets its H1 this way.
  - Choosing a question replaces the list with an empty panel for about 1s before the answer appears (`interact-article-question-open.png` at 1.2s against `-3s.png`).
  - The answer view's question tabs are numbers only (00–11).
  - Phone folds are 1.65–1.76 on four articles.
- **P2:**
  - "Evidence & editorial review" uses the native ▶ disclosure, a third disclosure style.
  - The "Related mechanism ↗" links are underlined blue, unlike the CTA links elsewhere.
- **Fixes:**
  - Display font for the H1; sans for the body; mono only for metadata.
  - Show the answer immediately, without an exit-then-enter transition.
  - Use question titles as tooltips or labels on the numeric tabs.
  - Use the shared accordion.
- **Hand-built:**
  - article header with position, core-return button and H1 (learnings.js:76-84)
  - core block (85-88)
  - question nav with numbered choices (92-107)
  - reading sections (116-120), an inline table (124-128) and prev/next controls (133-135)

### `/lifecycle`, `/lifecycle/agreement`, `/lifecycle/fulfillment` (`js/pages/lifecycle.js`)
- **Purpose:** five stages of an agreement; one page per stage.
- **5-second verdict:** pass. The H1, the five-stage strip and the "Continue to …" CTA are clear.
- **P1:**
  - The breadcrumb reads "HOME / 02 / AGREEMENT LIFECYCLE / 03 / AGREEMENT", and the same "03 / AGREEMENT" is repeated as an eyebrow underneath (`lifecycle_agreement-1440-top.png`).
  - The "02" has no 01.
- **P2:**
  - The depth buttons (Answer / Understand why / Evidence) use a third vocabulary for the same idea as the story sheets (The core idea / How it works / Evidence & limits) and the how-chapters (How it works / Why this way / What it proves).
  - A status callout starts lowercase ("accepted terms do not…").
  - The stage diagram labels are 6px.
- **Fixes:**
  - One breadcrumb component with no ordinal numbers.
  - Drop the duplicate eyebrow.
  - One depth vocabulary site-wide, for example "Short answer / How it works / Evidence".
- **Hand-built:**
  - stage copy hard-coded in JS (lifecycle.js:26-63)
  - H1 (89), stage strip (96)
  - figure with caption and counter (123-149)
  - depth controls with aria-pressed (160), mechanism-step buttons (173)
  - status callout and CTA row

---

## Cross-page findings (ranked)

1. **P0 — /about's closing section is invisible.** `hl-closing` is reused without the
   `.hl-closing-copy` wrapper, so home-swiss.css:687's 98% overlay covers it, and the 820px
   min-height leaves a void. The general lesson: a class carrying page-specific layering (`::after`
   plus z-index contract) was borrowed as if it were a component. It needs one closing-section
   component with its slot structure enforced.
2. **P1 — ghost controls with no visible boundary.** 170 of 195 controls (87%) are below 3:1
   boundary contrast. The worst families are `article-choice` (33), `has-native-icon` depth
   buttons (23), `story-record` (21), `how-step-button`, `how-view-tab`, `hl-case` and
   `chain-case`. Fix it once in the button and segmented-control components, with a
   `--border-strong` token at 3:1 or better.
3. **P1 — Arial leaks in as a fourth typeface.** Story-sheet depth buttons (7 routes), concept
   toggles, and `how-step-button` (`/download`, 3 how-chapters) do not inherit the font. Six
   families render in total (Albert Sans, IBM Plex Sans, IBM Plex Mono, ui-monospace, monospace,
   Arial). The owner rule is 3 slots. Albert Sans (home/about/explore) and IBM Plex Sans
   (everything else) are two sans faces competing for one slot. Fix: `button, input, select
   { font: inherit }` in the base layer, and pick one sans.
4. **P1 — fold budget missed on 13 of 35 routes.**
   - Desktop: `/` 2.53, `/about` 2.23.
   - Phone: `/` 2.88, `/about` 2.81, `/learnings` 2.16, `/how-deployment-works` 2.02, `/bundle-deployer` 2.00, 4 articles at 1.65–1.76, and 3 how-chapters at 1.63–1.68.
   - The "More" disclosures on `/` and `/about` open to 4.95 and 4.08, because one disclosure holds everything.
5. **P1 — the same control is built 7+ ways.** Segmented controls and tabs:
   - `hl-audience-tab` (role=tab)
   - `chain-case` (role=tab plus aria-selected)
   - `account-tabs` (role=tab)
   - story-depth (aria-pressed buttons)
   - `how-view-tab` (aria-pressed)
   - lifecycle depth (aria-pressed)
   - economy FXN/Credits (aria-pressed)
   - lab tabs
   - article numeric choices

   That is three ARIA models and at least four looks. The depth control alone has three label
   vocabularies.
6. **P1 — jargon with no glossary on page.** `docs/glossary.md` exists, but `abbr`/`dfn`/tooltip
   aids are 0 on every non-article page. First-screen undefined terms include:
   - mesh, resolver, resolutions
   - FXN / FXN chain, Auth Kit, Ghost ID, CID
   - substrate, quorum, DAO, roster
   - miner presence, grammar letters (G/Y/V/M/J/C/S), CMS
   - "Production" (a header pill on every page, including the phone)

   A glossary-term component, wired once to the glossary, fixes all of them.
7. **P1 — keyboard focus enters invisible links.** `#fallback` (index.html:81-97) is visually
   clipped and `aria-hidden="true"` (js/main.js:134) but not `inert`. Tab lands on "Read the
   source / What is a resolver? / Read the protocol overview", which are invisible, on `/account`,
   `/deposits`, `/experiments` and `/how-deployment-works` (detected), and presumably on every
   route once page controls run out. Also, there is no skip link before the ~10 header controls.
8. **P1 — naming drift erodes trust.**
   - Product: DEFXN / Flux ("Run Flux from source", "Operate Flux") / FXN.
   - Notes / Learnings / Tutorials for one section.
   - Benchmark claims on `/` against `/concept/spec`'s "no canonical public benchmark artifact".
   - Article excerpt against article body ops/s.
9. **P2 — four back-link and breadcrumb styles, three link-arrow meanings.**
   - Back links: the boxed chip with `content-layer-path` (10 modules), "← HOME" underlined mono (`/chain`), "← Your account" blue (`/account/domains`), "← ALL LEARNINGS" plus a corner "← TUTORIALS" (articles), and the fixed corner "← BACK HOME" on every page.
   - Arrows: "↗" is used for internal routes (theory sheets, deposits, learnings cards), "←" for forward links (`/deploy`), and an external-link icon for internal routes (`/about`).
10. **P2 — hard-coded scale.**
    - 42 rendered font sizes in this half.
    - In CSS, 449 hard-coded `font-size: Npx` against 57 token or `clamp` uses, and 141 distinct font-size declarations.
    - 12 corner radii (tokens `--radius-sm`/`--radius-md` used about 18 times).
    - 322 `!important`.
    - 60 distinct button signatures. CTA text-transform varies between sibling pages.
11. **P2 — tiny diagram text.** Story-sheet illustrations, how-cards, lifecycle and explorer grid
    diagrams and the home isometric labels all use 6–9px mono labels. At 390 they are decorative
    noise; the legends under the diagrams already carry the information.
12. **P2 — performance.**
    - Every route keeps three full-viewport canvases (2 × `lattice` + `defxn-brand-mesh`, 1440x900 each) for a static background.
    - Articles additionally mount a `zero-webgl` canvas at 2045x1278 and a 320x320 canvas.
    - `/about` (83–109 rAF/s) and `/chain` (60 rAF/s) run frame loops continuously while idle, including when scrolled away.
    - Every other route idles at 2–15 rAF/s.
    - `prefers-reduced-motion: reduce` is honoured: 0 running animations and 0 rAF/s on all 35 routes.
13. **P2 — markup as strings, copy in JS.** `account.js`, `account-domains.js`, `explorer.js` and
    `lab.js` build pages from `innerHTML` strings. Visitor-facing copy is hard-coded in JS in
    `home.js` (audience tabs, stat labels, FAQ), `deploy.js`, `download.js`, `lifecycle.js`,
    `economy-preview.js` and `learnings.js`. Ten modules each define their own `node()`/`el()`
    helper. None of this is reachable from the CMS or a component registry.

### Pattern frequency (routes in this half that hand-build the pattern; 35 routes)

| pattern | routes | distinct implementations seen | where (examples) |
|---|---|---|---|
| Page hero (eyebrow/breadcrumb + H1 + deck ± CTA) | 35 | 9 (`hl-hero`, `learning-heading`+`concept-deck`, storySheet H1, `account-hero`, `how-chapter-header`, economy header, bundle top, lifecycle, `article-header`) | home.js:150, about.js:136, sheet.js:36/103, account.js:58, how-stories.js:15, learnings.js:48/76 |
| Eyebrow / kicker label | ~30 | 6 (`hl-label`, `learning-eyebrow`, `bundle-eyebrow`, `account-card-caption`, `how-chapter-label`, `article-position`) | home.js:125, about.js:112, deploy.js:13, bundle-deployer.js:11 |
| Segmented control / tabs | 30 | 9 (3 ARIA models) | home.js:214-236, chain.js:46-76, sheet.js:104, how-stories.js:44-47, lifecycle.js:160, economy-preview.js:41, account.js:68-75, lab.js:15, learnings.js:92-107 |
| Back link / breadcrumb | 25 | 5 | concept.js:4, sheet.js:28/102, deployment.js:26, how-stories.js:14, chain.js, account-domains.js:30, learnings.js:76 |
| CTA row (primary + secondary/back) | ~25 | 6+ (`story-primary`, `hl-actions`, `theory-cta`, `how-chapter-footer`, `lifecycle-next`, `article-answer-controls`) | sheet.js:113, about.js:142, how-stories.js:51, learnings.js:133 |
| Diagram / illustration frame | 22 | 8 (SVG isometric, story-diagram, how-work-mesh canvas, lifecycle figure, record grammar, layer stack, account map, bundle flow) | home-flow.js:130/328, sheet.js:106-110, deployment.js:63, lifecycle.js:123, bundle-deployer.js:40 |
| Status / boundary callout | 16 | 7 (`about-boundary`, `mechanism-status-summary`, `lifecycle-boundary`, `how-boundary`, economy notice, experiment note, `bundle-status`) | about.js:252, sheet.js:112, deployment.js:92, economy-preview.js |
| Step list / stepper | 14 | 7 (home flow steps, chain stepper, `about-steps`, `bundle-steps`, `deploy-steps`, `how-steps`, lifecycle stage strip) | home-flow.js, about.js:191, bundle-deployer.js:26, deploy.js:63, how-stories.js:29, download.js:76, lifecycle.js:96 |
| Disclosure / accordion | 9 | 3 looks ("+" `hl-faq`, native ▶, `content-layer`) | home.js:199/295/324, about.js:184/257, learnings.js (evidence), sheet.js:49/61 |
| Card grid (linked cards) | 6 | 5 (`hl-principles`, `story-topic`, `how-work-card`, explore kind tiles, learning cards) | home.js:254, about.js:205/234, concept.js:8, deployment.js:45, learnings.js:53 |
| Key/value record (`dl`) | 6 | 4 | how-stories.js:23, account.js:61-65, economy-preview.js:111, explorer.js:691 |
| Stat tile | 4 | 3 (`hl-metric`, `mesh-explorer-stat`, lifecycle big count) — `dash-kit` `stat()` exists but is unused here | home.js:280-284, explorer.js:815, lifecycle.js:149 |
| Form field + inline status | 3 | 3 | account.js:94, account-domains.js:30-50, economy-preview.js:126 |
| Code / terminal block + Copy | 2 | 2 (two Copy button styles) | deploy.js, download.js:37-59 |
| Comparison / data table | 2 | 2 | bundle-deployer.js:48-56, learnings.js:124-128 |
| Empty state | 2 | 2 | account-domains.js:39, explorer.js:282 |

**Component library order, by reach multiplied by defect load:**
1. Button and segmented-tabs. This fixes the ARIA models, Arial, boundary contrast, CTA casing and the depth vocabulary across 30 routes.
2. Page-hero (eyebrow + H1 + deck + glossary-aware intro).
3. Breadcrumb / back link.
4. Status callout.
5. Diagram frame (with a minimum caption size and an offscreen pause).
6. Disclosure / accordion.
7. Stepper.
8. Linked card.
9. Key/value record.
10. Closing-section (fixes the /about P0 structurally).
11. Glossary-term tooltip.
