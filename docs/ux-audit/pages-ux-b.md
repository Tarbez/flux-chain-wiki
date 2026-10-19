# DEFXN per-page UX audit — routes, second half

Audited 2026-10-19 against the Dead Ark UI System (`/Volumes/PortableSSD/AGENTS.md`: SDK tokens,
three font slots, glass panels, accent spent intentionally) and the owner's fold rule (a page is at
most 1.6x the viewport). The owner's brief is "reduce information overload, improve every page,
**no feature reduction**, make it component-rich". So every fix below keeps every feature: content
is moved behind tabs, accordions, glossary tips and "show more" controls. Nothing is deleted.

## Method (so the numbers can be re-run)

- **Route set:** `ArkUI.pageCatalog` as the live page builds it (69 routes, articles, resolutions
  and theory sheets included), sorted by `path`. This file covers indices 34–68, which is 35 routes.
  Index 34 (`/lifecycle/fulfillment`) may also appear in the first-half report if that agent took
  `ceil(69/2)`.
- **Browser:** real Chromium through `tests/browser/harness.mjs` (`copySite` + `startHost` on a free
  port, never 3437). Each route was loaded directly, waited on with `routeSettled`, then measured at
  **1440x900** and **390x844**. The machine load factor was 1.6–6 during the run, so waits were
  scaled. The driver is at
  `/private/tmp/claude-501/-Volumes-PortableSSD/a51a7d03-a815-4ae1-960d-76c01ee0b2ce/scratchpad/uxb/audit.mjs`.
  Raw metrics are in `.../scratchpad/uxb/metrics.json`.
- **Screenshots:** `/private/tmp/claude-501/-Volumes-PortableSSD/a51a7d03-a815-4ae1-960d-76c01ee0b2ce/scratchpad/ux/pages-b/`
  (shortened to `pages-b/` below). The naming is `<route>-<d|m>-top.png` and
  `<route>-<d|m>-full.png`, plus state shots (`-tab1`, `-tab2`, `-why`, `-laws`, `-movements`).
  Every page scrolls inside its own `section#scene-page-*`, not the document. For the full shot that
  scroller is unlocked, so the background frame differs from the live page.
- **Fold ratio** = (the page scroller's `scrollHeight` + its top offset) / viewport height.
- **Jargon** = case-insensitive hits on a fixed term list in the page's visible `innerText`. The
  list covers resolver, resolution, claim, CID, grammar, FXN, FLX, mesh, shard, quorum, K-of-N,
  ledger, Ed25519, signature, hash, anchor, DAO, payload, registry, attest, validator, canonical,
  box, label, fleet, node, ops/s, latency, commit, equivocation, custody, bundle, manifest,
  dense-wire, .ark and .fxn. No page in this half has a glossary, `<abbr>`, `<dfn>` or term tooltip
  (grep of every module: 0). So every hit is an unexplained term.
- **Contrast** is a WCAG ratio of text colour against the nearest background that is ≥85% opaque.
  The glass panels are translucent, so this is an approximation and should be read as a lower bound
  on problems, not a clean bill.
- **Focus** = four Tab presses from page load, each checked for a visible `outline` or `box-shadow`.
- **Inbound/outbound links and depth** come from the existing crawl
  `docs/ux-audit/pages-crawl.tsv` (written by the sibling audit) where cited.

### Summary table (desktop / mobile)

| Route | Fold d / m | Words | H2+ | Jargon hits (terms) | Focus | Notes |
|---|---|---|---|---|---|---|
| /lifecycle/fulfillment, /intent, /offer, /receipt | 1.0 / 1.0 | 111–116 | 0 | 1 | ok | illustration removed on mobile |
| /palette | **2.76 / 4.51** | 332 | 8 | 0 | ok | 0 inbound page links |
| /reference | 1.07 / **1.68** | 166 | 2 | 2 | ok | doc reader |
| /resolutions | 1.0 / 1.0 | 171 | 1 | 12 (3) | **tabpanel no ring** | text clamped |
| /resolutions/* (20 pages) | 1.0 / 1.0 | 117–171 | 0 | 3–14 (1–8) | **tabpanel no ring** | mobile drops lede/problem/CTA |
| /resolver-math | **8.45 / 13.52** | 2,068 | 7 | 82 (14) | ok | 22 font sizes, 0 inbound page links |
| /resolvers | **4.02 / 7.85** | 946 | 9 | 93 (22) | ok | **0 links, 0 buttons** |
| /start-from-something-real | 1.0 / 0.95 | 100 | 0 | 6 (3) | ok | 0 inbound page links |
| /stats | **12.62 / 20.73** | 3,387 | 20 | 236 (23) | ok | 2 failed API calls locally |
| /stats/gpu | **1.98 / 3.19** | 468 | 4 | 19 (9) | LI stops | unreachable (crawl) |
| /stats/ledger | **8.98 / 14.6** | 2,636 | 12 | 158 (22) | LI stops | hidden |
| /treasury | 1.0 / 1.0 | 66 | 0 | 4 (2) | ok | mock |
| /what-is-a-resolver | 1.0 / 1.0 | 130 | 1 | 8 (3) | ok | mobile hides the definition |

Every page has exactly one visible H1. No page has a skip link or a `contentinfo` landmark, and
every page exposes 4–9 `nav` landmarks.

---

## /lifecycle/intent, /lifecycle/offer, /lifecycle/fulfillment, /lifecycle/receipt
Module: `js/pages/lifecycle.js` (copy in `ArkUI.lifecycleContent`, lines 5–66). Stage scenes come
from `js/ark/stage-scenes.js`. Styles: `css/lifecycle.css`.

**Purpose.** One stage of the five-record agreement story (intent → offer → agreement →
fulfillment → receipt), shown on a worked example: copying a dataset snapshot.

**5-second verdict: mostly clear on desktop.** The H1 ("Say what you need.") plus the one-line
example works. The numbering then fights the reader. The breadcrumb reads
`HOME › 02 / AGREEMENT LIFECYCLE › 03 / INTENT`, while the kicker directly below reads
`01 / INTENT`. Two different "steps" are both numbered, and the trail at the bottom numbers the
stages 01–05 a third way.

Screenshots: `pages-b/lifecycle_intent-d-top.png`, `pages-b/lifecycle_intent-m-top.png`,
`pages-b/lifecycle_intent-d-why.png`, and the same pattern for offer, fulfillment and receipt.

**Issues**
- **P1 — The mobile layout removes the illustration.** `css/lifecycle.css:142`
  `@media(max-width:900px){.stage-scene{display:none}}` removes the whole stage scene ("The request
  brief", the job and rules box, the mesh strip, and the "Who asks / What travels" inspect chips).
  That is feature reduction on phones (`pages-b/lifecycle_intent-m-full.png`).
- **P1 — Conflicting numbering.** Breadcrumb `02 /` and `03 /` (`lifecycle.js:85-86`), kicker
  `01 / INTENT` (`:101`), and trail `01–05` (`:94`).
- **P1 — Layout shift and nested controls.** Choosing "Understand why" inserts five fact chips
  (*Why it matters / Who writes it / References / Becomes true / What follows*, `:169-176`) **above**
  the depth switch. The switch the user just clicked jumps about 57px down. The page then carries
  15 selector controls at once: 3 depth buttons, 5 fact chips, 2 illustration chips and 5 stage
  links.
- **P2 — Empty space with the answer pushed away.** On desktop a void of about 180px sits between
  the depth switch and the "Not yet established" box, because the box is pinned to the bottom.
- **P2 — An internal link looks external.** "Read the agreement guide ↗" (`:180`) opens the
  in-site `/reference` reader, but `↗` means "leaves the site".
- **P2 — Text size.** 17 text elements are under 12px on desktop (labels in the illustration and
  the trail).
- **P2 — Content is hard-coded in the module** (`ArkUI.lifecycleContent`), not in a manifest, so
  the CMS cannot edit it (comment at `:75-79`).

**Fixes (no feature loss)**
- Keep the scene on mobile as a collapsed "See the illustration" disclosure under the answer. Put
  the inspect chips inside it.
- Use one numbering system: breadcrumb `Home › Agreement lifecycle › Intent` with no numbers, and
  keep `01 / INTENT` only in the trail and kicker.
- Make Answer / Understand why / Evidence a real `Tabs` component whose panel sits *below* a fixed
  tab row. Render the five facts as a definition list inside the "Understand why" panel instead of
  a second chip row.
- Use `→` for in-site links and `↗` only for links that leave the site. Move the copy into a
  manifest.

**Hand-built patterns:** breadcrumb (`lifecycle.js:83-87`), kicker (`:101`), depth tabs
(`:104-110`), boundary callout (`:111-114`), figure frame with canvas (`:123-134`), stage
trail/stepper (`:90-98`), fact chips as pseudo-tabs (`:169-176`), prev/continue nav (`:154-157`).

---

## /palette
Module: `js/pages/palette.js`. Styles: `css/palette.css`.

**Purpose.** A live design-system reference: button variants, six colour roles with shades, and
neutrals for the active theme.

**5-second verdict: clear to designers, opaque to everyone else.** This is internal tooling on the
public site. The crawl shows 0 inbound page links (menu only).

Screenshots: `pages-b/palette-d-top.png`, `pages-b/palette-d-full.png`,
`pages-b/palette-m-full.png`.

**Issues**
- **P1 — Over the fold rule:** 2.76x desktop and 4.51x mobile.
- **P1 — The page does not show the SDK tokens it should document.** AGENTS.md names `--canvas`,
  `--surface`, `--raised`, `--nested`, `--overlay` and the meaning tokens `--trust`, `--live`,
  `--role`, `--badge`, `--drift`, `--hidden` and `--reference`. The page shows `primary`,
  `secondary` and `reference`, then success/warning/danger and 9 neutrals. `--overlay`, `--drift`,
  `--trust`, `--live`, `--role`, `--badge` and `--hidden` are absent.
- **P1 — The rule shown here is broken elsewhere on the site.** The primary role is documented as
  "Identity … Never a button" and success as "State only" (`palette.js:7,10`). Resolution pages
  colour the "Ready" state with `--primary` (`css/resolutions.css:75-76`).
- **P2 — Wrong kicker class.** The kicker reuses `account-kicker` (`palette.js:31`) and renders
  "// DESIGN SYSTEM" in sans, not the mono uppercase metadata style.
- **P2 — Text size.** 147 text elements are under 12px (swatch captions).
- **P2 — Copy is hard-coded.** The theme-name map is hard-coded at `palette.js:80`.
- **P2 — No typography section.** The three font slots and the type scale, which this audit found
  drifting, are not shown.

**Fixes.** Put role groups behind tabs (Components / Roles / Neutrals / Type), which brings the page
under 1.6x. Add the missing SDK semantic tokens and a type-scale and font-slot section. Show each
swatch's contrast ratio against `--canvas`. Link the page from the footer as "Design system" so it
is not orphaned.

**Hand-built patterns:** page header (`palette.js:30-36`), swatch (`:17-23`), button demo grid
(`:41-49`), choice/segmented group (`:44-45`), role section (`:52-68`).

---

## /reference (hidden; reached with `?doc=…&from=…`)
Module: `js/pages/reference.js` (its own Markdown renderer). Styles: `css/reference.css`.

**Purpose.** An in-site reader for canonical protocol docs, so a reader never lands on a raw `.md`
file.

**5-second verdict: clear.** It reads like a document. "Return to the explanation" is the right
first action.

Screenshots: `pages-b/reference-d-top.png`, `pages-b/reference-m-top.png`.

**Issues**
- **P2 — Mobile fold** is 1.68x, but this is a reading surface. The fold rule should exempt
  long-form readers explicitly, or add a table of contents.
- **P2 — Heading levels.** Headings start at H2 when the doc's H1 is consumed, but the rendered
  outline was H1 → H3 ("Evidence", "Interpretation"), skipping H2 (`reference.js:55` maps `#`+1).
- **P2 — Raw kicker.** The kicker shows a repo path ("Canonical reference /
  docs/protocol/agreements.md") in body sans. It reads like a developer path, not a title.
- **P2 — Uncontained tables.** Markdown tables render as bare `<table>` with no wrapper, so long
  tables can overflow on mobile (`:43-48`).
- **P2 — Fixed back target.** "Return to the explanation" always says "explanation", even when the
  `from` page is /stats.

**Fixes.** Render H2s for the doc's `##` (keep levels continuous). Wrap tables in the shared
`DataTable` overflow wrapper. Add an auto TOC (an "On this page" accordion) when there are more
than 4 headings. Label the back link from the `from` route's title.

**Hand-built patterns:** Markdown → DOM renderer (`reference.js:33-57`), orientation/back nav
(`:60-62`), kicker (`:65`), provenance callout (`:67`).

---

## /resolutions (index)
Module: `js/pages/resolutions.js` `mountIndex()` (`:66-160`). Styles: `css/resolutions.css`.

**Purpose.** A catalogue of 20 "resolutions" (product use cases) in 5 domains.

**5-second verdict: good on desktop.** The left domain rail plus a 2x2 card grid is the clearest
layout in this half. The deck sentence ("Everyone is our business partner …") is cut off with "…".

Screenshots: `pages-b/resolutions-d-top.png`, `pages-b/resolutions-m-top.png`.

**Issues**
- **P1 — Truncated text with no way to read it.** The deck is clamped to 2 lines
  (`css/resolutions.css:14`) and the footer note to 1 line (`:40`): "The current status page lists
  what runs today and what is…". The "1.0x fold" is achieved by cutting copy, not by structuring it.
- **P1 — Mobile domain tabs lose their names.** The tabs show only `01 02 03 04 05`, so a phone user
  cannot tell what a domain is without tapping each one. Card descriptions are also hidden on
  mobile.
- **P1 — Focus ring missing.** The tabpanel (`role=tabpanel`, `tabIndex=0`, `:98-99`) receives focus
  with `outline: none` and no shadow (confirmed in a probe).
- **P2 — Vanity stat.** The stat triplet `20 / 05 / 01 MESH` (`:80-87`) is decoration. "01 mesh"
  carries no information.
- **P2 — Undefined jargon.** "mesh" appears 6 times with no definition. "resolution" is never
  defined, and neither is how it differs from "resolver".

**Fixes.** Replace clamping with a "More" disclosure, or give the deck its full length and drop the
stat triplet into the eyebrow. On mobile use a horizontally scrollable tab strip with names, or a
`<select>`. Add a `:focus-visible` ring to the panel. Add a one-line plain-language definition
("A resolution is a thing you can do on DEFXN; a resolver is the logic that does it") with a
glossary tip.

**Hand-built patterns:** breadcrumb (`:34-49`), hero with eyebrow, H1, deck and stat triplet
(`:72-88`), ARIA tablist with keyboard handling #1 (`:93-145`), card-link grid (`:51-64`), footer
note with a status link.

---

## /resolutions/* — 20 detail pages (one template)
Routes: algorithms, automation, collaborations, communications, community, content, data,
deployments, encryptions, files, finance, governance, information, intelligence, logistics,
network, payments, productivity, rules, website. Module: `resolutions.js` `mountDetail()`
(`:161-358`).

**Purpose.** For one use case: who it is for, the problem, which products are ready, the product
ideas, and "how it resolves" in three steps.

**5-second verdict: clear on desktop.** For example "Resolve your personal finance" with For and
Problem rows, a CTA and a three-tab product panel. Mobile loses most of the framing.

Screenshots: `pages-b/resolutions_finance-d-top.png`, `pages-b/resolutions_finance-d-tab1.png`
(Product ideas), `pages-b/resolutions_finance-d-tab2.png` (How it resolves),
`pages-b/resolutions_finance-m-top.png`. All 20 have `-d-top`, `-d-full`, `-m-top` and `-m-full`.

**Issues**
- **P1 — Mobile feature reduction.** At 390px the lede ("Keep your own books…"), the Problem row,
  the primary CTA "How resolvers work →" and the Ready/Building/Ideas legend are all gone. Product
  descriptions are clamped to one line with "…" (`css/resolutions.css:166,174,179`). The page shows
  86 words on mobile against 135 on desktop. The same holds for all 20 pages.
- **P1 — Invisible focus on the tabpanel**, on all 40 page/viewport checks (`:204-205`).
- **P1 — Status colour breaks the palette rule.** "READY" is drawn in `--primary` orange
  (`css/resolutions.css:75-76`), while `/resolvers` uses green for "Deployed" and the palette page
  says primary is identity, never state. Users learn two meanings for "available".
- **P2 — Jargon density.** 3–14 unexplained term hits on 117–171 words. The densest pages are
  deployments (14), website (13, including FXN×3, mesh×3, bundle×2 and `.fxn`) and content (11).
- **P2 — Empty tabpanel space.** The "How it resolves" tab leaves about 140px empty above and below
  the three steps (`-tab2.png`), so the fixed-height panel is half empty.
- **P2 — Nested selection model.** The "Product ideas" tab is a second selection model (aria-pressed
  idea rail, `:229-279`) inside a tabpanel.

**Fixes.** On mobile, stack the brief (For, Problem, CTA) above the tabs and let the page scroll.
One extra screen is within the 1.6x rule. Replace clamping with an expandable product row
(accordion). Map Ready → `--success` (or `--live`), Building → `--drift`, Idea → `--reference`. Add
glossary tips for FXN, mesh and bundle. Size the tabpanel to its content.

**Hand-built patterns:** breadcrumb (`:34-49`), detail hero with eyebrow `06 / 20 · VALUE &
FINANCE` and an H1, brief definition list For/Problem (`:183-190`), primary CTA, ARIA tablist #2
with its own keyboard handling (`:199-330`), product tile card (`:213-222`), status mark plus
legend (`:209-212`), idea rail selector (`:229-279`), three-step list (`:280-300`), prev/all/next
pager (`:346-357`).

---

## /resolver-math
Module: `js/pages/resolver-math.js` (uses `ArkUI.dash.shell/panel/table/stat`). Styles:
`css/resolver-math.css`.

**Purpose.** It teaches that "everything the system can do is the sum of what somebody defined",
using an equation (role letters + labels + verbs + record types + shapes + resolvers = 156
definitions), a removal demo, a block explorer, four rules with tests, and limits.

**5-second verdict: the hero is clear and striking.** The equation with its cell grid is the best
explanatory graphic in this half. The page then turns into a 2,000-word technical paper.

Screenshots: `pages-b/resolver_math-d-top.png`, `pages-b/resolver_math-d-full.png`,
`pages-b/resolver_math-m-full.png`.

**Issues**
- **P0 — Fold and length.** 8.45x desktop and 13.52x mobile, 2,068 words, and 7 H2 sections each
  holding panels, tables and figures. It has 21 buttons and 45 chip/pill elements.
- **P1 — Type-scale drift.** 22 distinct font sizes (9px … 46px, including 11.52, 11.84, 12.16,
  12.48, 12.8 and 13.12px), from fluid `clamp()`s with no shared scale. 86 text elements are under
  12px.
- **P1 — Jargon.** 82 hits on 14 terms (manifest×12, label×9, registry×8, box×7, payload×5). "Role
  letter", "type-scoped shape" and "box" each get a gloss in the equation, but nowhere else on the
  page.
- **P1 — Orphaned.** The crawl shows 0 inbound page links (menu only). `/what-is-a-resolver` does
  not link here, although this page's breadcrumb claims it as the parent.
- **P2 — Low-contrast small text.** "The equation" kicker is 4.44:1 at 9px, and figure captions are
  4.44:1 at 12–13px.

**Fixes.** Keep the equation hero above the fold. Turn the six sections below into a `Tabs` or
`Accordion` set (Remove a term · Fixed vs bends · Resolve a block · Four rules · Totals · Limits),
each opened on demand. Adopt the SDK type scale (snap the clamps to about 6 steps). Turn the
equation glosses into the glossary source used site-wide. Add a "Next: the math behind it →" link
from the Laws step of `/what-is-a-resolver`.

**Hand-built patterns:** `D.shell` hero with crumbs (`resolver-math.js:302-315`; the only page in
this half on the kit's shell), SVG figure frame `figure()` (`:163-171`) and signing/record figures
(`:173-279`), status tag (`:280-287`), unavailable callout (`:288-295`), equation and cell grid
(`:345-500`), builder/controls panel (`:507-600`), `D.table` ×5 (`:620`, `:633`, `:702`, `:762`,
`:778`), chip buttons (`:687`), algebra code list (`:720-730`), `D.stat` tiles (`:744-746`), "Keep
reading" link panel (`:790`).

---

## /resolvers
Module: `js/pages/resolvers.js`, one `innerHTML` string. Styles: `css/resolvers.css` plus
`css/stats.css` (`stats-tile`).

**Purpose.** A directory of FXN resolvers (DeFi, PVA, Collections, Market, Stream, DAO) with
status, Y codes, implementation, measured throughput and open issues.

**5-second verdict: unclear.** The first sentence a visitor reads is "A LEDGERENTRY is admitted by
the chain if its grammar is well-formed, the signature verifies under G, and the position J
extends…". That is protocol internals before any explanation of what a resolver is for.

Screenshots: `pages-b/resolvers-d-top.png`, `pages-b/resolvers-d-full.png`,
`pages-b/resolvers-m-full.png`.

**Issues**
- **P0 — Dead end.** The page has **0 links and 0 buttons** in 946 words (crawl: out=0). The
  only interactive elements are six "Open issues" `<details>`. No breadcrumb, no "What is a
  resolver", no link to /stats for the benchmark, no link to each resolver's source or route.
- **P0 — Jargon wall.** 93 hits on 22 terms (resolver×25, grammar×10, payload×8, registry×7,
  shard×7), plus raw identifiers: `LEDGERENTRY`, `G`, `J`, `Y`, `1A`, `F-ASSET-ACADEMIA`,
  `dense-wire::cross_shard`, `flux-spec/registry/manifest-types.json`.
- **P1 — Fold.** 4.02x desktop and 7.85x mobile. The DeFi card alone is about 1.3 viewports: 7
  latency rows plus a 90-word BENCH-012 paragraph.
- **P1 — Empty half of the hero.** The hero tile takes 7 of 12 columns, leaving an empty right half
  above the fold (`-d-top.png`). The same happens on /stats/gpu and /stats/ledger.
- **P2 — A second tile system.** Uses `stats-tile` built from strings, not `ArkUI.dash.panel`.
  `esc()`, `fmt()` and `tile()` are re-implemented here (`:13-23`) and again in stats-gpu.js and
  stats-ledger.js.

**Fixes.** Open with a plain-language lede ("A resolver is the logic that turns signed records into
an answer; here are the ones that exist and how fast each is") and move the chain admission rule
into a "How admission works" accordion. Render each resolver as a compact card (name, domain,
status chip, headline number) whose spec, latency breakdown and open issues sit behind
"Details" disclosures. Add links: breadcrumb (Home › Resolvers), "What is a resolver?",
"Benchmark on /stats", "Resolver math". Move to the dash-kit panel.

**Hand-built patterns (all string HTML):** `tile()` (`resolvers.js:19-23`), `statusChip()`
(`:24-32`), `measuredRow()` stat row (`:33-50`), resolver card (`:51-66`), accordion for open
issues (`:64`, the only accordion in this half), hero with kicker and chips (`:76-80`), step list
"How a resolver gets published" (`:92-99`).

---

## /start-from-something-real (catalog id `references`)
Module: `js/pages/resolver-guide.js` (non-`resolver` branch). Styles: `css/guided-page.css`.

**Purpose.** It states honestly that the named reference resolvers (CR3TV, DeArk) have no
inspectable public record yet.

**5-second verdict: confusing.** One page has three names: catalog/nav "Start from something real",
breadcrumb "Reference resolvers", and H1 "Reference evidence, without the leap of faith". The
answer itself is "these don't exist publicly yet", which is honest. But the page's title promises a
starting point, and the page never offers one.

Screenshots: `pages-b/start_from_something_real-d-top.png`,
`pages-b/start_from_something_real-m-top.png`.

**Issues**
- **P1 — Naming mismatch.** See the 5-second verdict. The crawl shows 0 inbound page links.
- **P1 — Different depth-tab styling.** The depth buttons here are square and use **Arial
  13.33px** (the measured font family). The lifecycle depth buttons are rounded IBM Plex. These are
  the same component in two looks: the browser's default button font is leaking.
- **P1 — Mobile hides the diagram.** The mobile layout also promotes the eyebrow into a large sans
  line, "FLUX PROTOCOL / REFERENCE RESOLVERS", which is not mono uppercase (`-m-top.png`).
- **P2 — Large empty band** on desktop between the boundary box and the footer CTAs (about 170px).

**Fixes.** Use one name ("Reference resolvers") across catalog, breadcrumb and H1, or make the H1
the name and keep the subtitle line. Use the shared `DepthTabs` component, which inherits
`font: inherit`. Collapse the diagram behind "See the illustration" on mobile. Add "What would make
this real" (what record is missing) as the next step, per the refusal law: name the missing thing
and the remedy.

**Hand-built patterns:** breadcrumb (`resolver-guide.js:23`), kicker (`:24`), depth tabs
(`:26-27`, a duplicate of `lifecycle.js:104-110`), diagram frame with numbered records (`:29-32`),
boundary callout (`:33-34`, reusing the `lifecycle-boundary` class), continue nav (`:35-37`),
step picker (`:44-45`).

---

## /stats
Module: `js/pages/stats.js` (937 lines), using `ArkUI.dash.stat`/`sectionHead`. Styles:
`css/stats-dashboard.css` and `css/stats.css`.

**Purpose.** A fleet dashboard: live hourly self-bench (nodes, admission, swaps, transfers,
stores, stakes), chain status, sovereign chains, contributors, fleet capacity, audited benchmarks
and production readiness.

**5-second verdict: the top is excellent** ("Fleet dashboard", "All systems normal", "Measured 30
min ago", 9 big numbers). **Everything after the first screen is a research log.**

Screenshots: `pages-b/stats-d-top.png`, `pages-b/stats-d-full.png`, `pages-b/stats-m-top.png`,
`pages-b/stats-m-full.png`.

**Issues**
- **P0 — Information overload.** 12.62x desktop and **20.73x mobile**, 3,387 words, 20 H2s, 5
  tables, about 8 bar charts and 31 stat tiles. Section titles mix a dashboard with essay headlines
  ("Core count does NOT predict the result", "A 64x increase in batch size bought 1.3x",
  "BENCH-015 (chain-position build). Accepted swaps/s into ONE node. Not …"). Only one button
  (Refresh) on the whole page, and no table of contents or in-page navigation.
- **P0 — Jargon.** 236 hits on 23 terms (node×57, shard×29, resolver×28, fleet×24, signature×17,
  claim×13, ops/s×11, FLX×9, DAO×8, plus host names such as flx-bk2).
- **P1 — Type-scale drift.** 16 distinct font sizes (10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14,
  14.5px …) and 171 text elements under 12px.
- **P1 — Failed API calls locally.** `/api/chain-pulse` and `/api/chain-fleet-capacity` return 404
  under the local publish host. Check that the "Chain · dense-wire" and "Fleet capacity" tiles show
  an honest *unavailable* state (named failure, missing thing, remedy) and not dashes.
- **P2 — Polling.** Polling is responsible: 60s `setTimeout`, paused when hidden
  (`stats.js:24,897,916`). A 1s clock `setInterval` (`:920`) keeps running when the tab is hidden.
  It is cheap, but it should pause too.
- **P2 — Bar-row radii.** Bar rows use asymmetric radii (`10px 0 0 10px` / `0 10px 10px 0`) and
  `999px` pills next to 16px and 12px tiles: 8 radius values on one page.

**Fixes (keep every number).**
1. Split the page into **Live** (first screen, unchanged), **Fleet**, **Benchmarks** and
   **Readiness** tabs, or a sticky in-page section nav.
2. In Benchmarks, give each BENCH entry one summary row (claim, headline number, date) with an
   accordion for the method, tables and bars.
3. Put a glossary tip on node, shard, fleet and signature on first use.
4. Use a shared `BarList` and `DataTable` instead of the hand-rolled lists and tables.
5. Snap sizes to the SDK scale.

**Hand-built patterns:** header shell and live status block, hand-built rather than `D.shell`
(`stats.js:71-90`); `D.stat` tile rows (`:103-111`, `:142-147`, `:194-197`, `:215`, `:307`);
hand-built stat value (`:245`); bar lists hand-built **7+ times** (`:222`, `:312`, `:332`, `:352`,
`:375`, `:390`, `:404`); tables hand-built **7 times** instead of `D.table` (`:268`, `:453`, `:488`,
`:512`, `:643`, `:748`, `:818`); node cards (`dash-node`); readiness checklist (`dash-ready-item`);
polling loops (`:719`, `:776`, `:899`, `:920`).

---

## /stats/gpu (hidden)
Module: `js/pages/stats-gpu.js`, string HTML.

**Purpose.** It explains a measured result: a rented RTX PRO 6000 box was fast because of its CPU;
the protocol never touches the GPU.

**5-second verdict: clear.** "The GPU does nothing here" plus a two-sentence intro and a "Back to
the measurements" button. It is also **unreachable**: the crawl found 0 inbound links and the route
is not in the sitemap.

Screenshots: `pages-b/stats_gpu-d-top.png`, `pages-b/stats_gpu-d-full.png`,
`pages-b/stats_gpu-m-full.png`.

**Issues**
- **P1 — Orphan.** /stats should link it from the relevant benchmark.
- **P1 — Fold.** 1.98x desktop and 3.19x mobile. The hero tile is half width with an empty right
  column.
- **P1 — Non-interactive tab stops.** Six bar-row `<li>`s are focusable: they are the 2nd–4th Tab
  stops and do nothing.
- **P2 — Tables in monospace.** Table body text is mono (`ui-monospace`, 46 elements), which reads
  as code rather than results.
- **P2 — Duplicated helpers.** `esc`, `fmt`, `pct`, `tile`, `headRow`, `row` and `bars` are copied
  (`stats-gpu.js:26-56`). This is the third copy, after resolvers.js and stats-ledger.js.

**Fixes.** Link it from /stats ("Why not a GPU? →"). Use a full-width hero, or put the "So why was
it fast?" panel in the right column. Make bar rows non-focusable, or give them a real tooltip
interaction. Use the shared dash-kit helpers.

**Hand-built patterns:** `tile()` (`:37-40`), `headRow/row` tables (`:41-42`, `:68`, `:84`),
`bars()` (`:44-56`), hero with kicker, chips and back button (`:62-64`).

---

## /stats/ledger (hidden)
Module: `js/pages/stats-ledger.js`, string HTML.

**Purpose.** It argues that a finance resolver is safe by construction (per-identity append-only
chains, no mempool) and collects the ledger benchmark history.

**5-second verdict: the H1 is clear.** The intro immediately uses `(G, pos)`, "self-signed
equivocation" and "fork choice".

Screenshots: `pages-b/stats_ledger-d-top.png`, `pages-b/stats_ledger-d-full.png`,
`pages-b/stats_ledger-m-full.png`.

**Issues**
- **P0 — Overload.** 8.98x desktop and 14.6x mobile, 2,636 words, 54 tile/card elements and 6
  tables. Five H2s are raw numbers ("1,712,006 combined replica-applications/s · 61,398 all-replica
  logical", "12,403 accepted ops/s · …").
- **P0 — Jargon.** 158 hits on 22 terms (CID×23, FLX×16, fleet×16, signature×13, equivocation×10)
  and dozens of inline `code` identifiers (`admit_burst`, `chain::tests::bench_replication_cost`).
- **P1 — Focus and type.** Same focusable `<li>` bar rows as /stats/gpu. 142 text elements are
  under 12px on mobile.
- **P2 — Duplicated helpers.** `esc`, `fmt`, `pct`, `tile`, `headRow`, `row` (`:51-65`) again.

**Fixes.** Lead with the "Problems that stop being problems" table, which is the real point (good
plain framing). Put each historical run in a `BenchmarkCard` (headline, date, one-line meaning)
with an accordion for method, node table and code references. Add a glossary for equivocation,
CID and K-of-N.

**Hand-built patterns:** `tile()` (`:60-63`), tables (`:102`, `:129`, `:141`, `:154`, `:165`,
`:172`), `cpuBars()` (`:67-76`), chain-entry code sample (`:77-95`), hero with chips (`:96-98`),
"where this lives in the spec" definition cards.

---

## /treasury
Module: `js/pages/economy-preview.js` `treasury()`. Styles: `css/economy-preview.css`.

**Purpose.** A design mock of treasury inspection: pick an asset (FXN / Credits), inspect sample
movements, open one.

**5-second verdict: clear.** "DESIGN PREVIEW / NOT LIVE", the H1 and a warning callout. The primary
action "Inspect sample movements" is obvious.

Screenshots: `pages-b/treasury-d-top.png`, `pages-b/treasury-d-movements.png`,
`pages-b/treasury-m-top.png`.

**Issues**
- **P1 — Fourth font.** The page renders in **Albert Sans** (8 of 11 text elements) while the rest
  of the site's body is IBM Plex Sans. A fourth family breaks the three-slot rule
  (`css/economy-preview.css` hard-codes the family instead of `var(--font-sans)`).
- **P1 — Unexplained term and no way back.** "FXN / Tier 1" is not explained (what is a tier?), and
  there is no breadcrumb or route back to the economy context.
- **P2 — Internal link looks external.** "Preview a deposit ↗" uses the external-link glyph for an
  internal route (`economy-preview.js:21`).
- **P2 — Tabs that are not tabs.** The asset tabs are an `aria-pressed` button group styled as
  tabs (`:40-44`), and the movement list replaces the overview in place. Both are fine, but they are
  a third tab look.
- **P2 — Wasted space.** About 40% of the desktop frame is empty below the content.

**Fixes.** Use the SDK sans token. Add a breadcrumb (Home › Economy › Treasury preview). Explain
"Tier 1" in a glossary tip. Use `→` for internal links. Use the shared `SegmentedControl`.

**Hand-built patterns:** hero with kicker, deck and warning callout `buildBase()` (`:23-35`),
segmented asset picker (`:40-44`), asset stat line (`:46-55`), primary CTA (`:57`), selectable list
with detail view (`:59-110`).

---

## /what-is-a-resolver (catalog id `resolver`)
Module: `js/pages/resolver-lab.js` via `resolver-guide.js:17-21`. Styles: `css/resolver-lab.css`.

**Purpose.** It teaches "resolver" in four steps (Ask, Resolve, Check, Laws) beside a live
illustration that runs a real 5 MB size policy on three sample documents.

**5-second verdict: the best page in this half.** It has a crisp H1 ("Ask the mesh. Get a claim you
can check."), a one-sentence definition, a visible four-step stepper, one primary action
("Resolve →") and a hands-on demo. Motion is finite, never an idle loop (header comment
`:1-15`).

Screenshots: `pages-b/what_is_a_resolver-d-top.png`, `pages-b/what_is_a_resolver-d-laws.png`,
`pages-b/what_is_a_resolver-m-top.png`.

**Issues**
- **P1 — Mobile hides the definition.** The sentence "A resolver is named, deterministic logic…"
  (`css/resolver-lab.css:150,162` hide `.resolver-lab-lede`) is the most important sentence on the
  page. Mobile also hides the kicker, the policy address (`:177`), the law bodies (`:181,195`), the
  breadcrumb (`:203`), the spec (`:211`) and the mesh labels (`:187,221`). That is about 10
  `display:none` rules removing content on phones.
- **P2 — Low contrast.** The size label "3.2 MB" is 4.44:1 at 10.5px.
- **P2 — Dead-ish end.** The Laws step ends in "Follow the resolver flow" but does not link to
  /resolver-math, /resolvers or /resolutions, the three pages that continue this topic.
- **P2 — Undefined term in the H1.** "claim" appears in the H1 before it is defined. The Check step
  defines it, but a glossary tip on the H1 word would help at second 1.

**Fixes.** Keep the lede on mobile (it is one sentence) and move the law bodies into an accordion
instead of hiding them. Add a "Where next" row on the Laws step: Resolver math · Resolver directory
· Resolutions. Promote this page's stepper and demo frame as the reference implementation for the
other explainers.

**Hand-built patterns:** breadcrumb (`resolver-lab.js:269`), hero (`:270-276`), stepper/track
(`:277-300`), step caption (`:303`), prev/next footer (`:307-316`), demo figure with canvas and
address bar (`:318-332`), segmented input picker (`:333-345`), laws card list with status chips
(`:356-395`).

---

# Cross-page findings (ranked)

1. **P0 — Four pages hold about 9,000 words of research log behind a dashboard or explainer
   title.** /stats (12.6x/20.7x), /stats/ledger (9.0x/14.6x), /resolver-math (8.5x/13.5x) and
   /resolvers (4.0x/7.9x) carry 9,037 words between them and 569 unexplained jargon hits. None has
   in-page navigation, tabs or a TOC. The whole half has **one** `<details>` pattern
   (resolvers.js:64). *Fix:* a shared `Tabs` + `Accordion` + `BenchmarkCard` set. Keep the first
   screen and fold the rest into labelled sections.

2. **P1 — The fold rule is being met by deletion and clamping, not by structure.** Every page that
   measures 1.0x does it inside a fixed-height frame, and the frame gets there by:
   - removing content on mobile: `css/lifecycle.css:142`; about 10 rules in `css/resolver-lab.css`;
     the resolution detail brief, CTA and legend;
   - line-clamping copy with no way to expand it: `css/resolutions.css:14,40,134,144,166,174,179`.

   This conflicts directly with "no feature reduction". *Fix:* a `Disclosure` primitive ("Show the
   illustration", "More") replaces every `display:none` and every `line-clamp`. Treat 1.6x as the
   budget, not 1.0x.

3. **P1 — Two tile systems and copied helpers.**
   - `ArkUI.dash` (`js/ark/dash-kit.js`: panel, stat, table, bar, shell) exists precisely to stop
     drift, per its own header.
   - /resolvers, /stats/gpu and /stats/ledger still build `stats-tile` HTML strings, each with its
     own copy of `esc`/`fmt`/`tile`/`headRow`/`row` (three copies).
   - /stats uses the kit's `stat` but hand-builds 7 tables and 7+ bar lists.

   This is the "centralize, don't duplicate" law. *Fix:* add `D.barList()` and `D.benchmark()`,
   move the three string pages onto the kit, and delete `stats-tile`.

4. **P1 — Three page-frame widths.**
   - Framed card at about 1080px: lifecycle, guide, lab, math, treasury, reference.
   - About 1352px: resolutions.
   - Full-bleed edge-to-edge: stats, resolvers, gpu, ledger. On the full-bleed pages the hero tile
     spans 7 of 12 columns and leaves an empty right half on the first screen.

   *Fix:* one `PageFrame` with `narrow | wide | dashboard` widths, and a hero that either spans the
   full width or fills its aside.

5. **P1 — No glossary mechanism exists anywhere.** There are 0 `abbr`/`dfn`/tooltips. Unexplained
   terms run from 1 per 100 words (lifecycle) to 7 per 100 (/stats, /stats/ledger, /resolvers).
   resolver-math already writes glosses ("role letters = what a box can be"), but they live in one
   array. *Fix:* a `Term` component fed by a glossary derived from the manifests and the equation
   glosses (derive, don't author). It renders a dotted underline and a popover, and every page uses
   it on first occurrence.

6. **P1 — Four selector models built by hand, eight times.** Each has its own keyboard and ARIA
   code:
   - ARIA tablists in `resolutions.js:93-145` and `:199-330`;
   - aria-pressed groups in `lifecycle.js:104-110` and `:169-176`, `resolver-guide.js:26-27` and
     `:44-45`, and `economy-preview.js:40-44`;
   - a stepper in `resolver-lab.js:277-300`;
   - chip buttons in `resolver-math.js:687`.

   They also look different: rounded IBM Plex (lifecycle), square **Arial 13.33px**
   (start-from-something-real, so the font is not inherited), an underline tab (treasury) and a
   filled block (resolutions). The resolutions tabpanel has **no focus ring** on 21 routes. *Fix:*
   `Tabs`, `SegmentedControl`, `DepthTabs` (Answer / Understand why / Evidence) and `Stepper`, all
   with `font: inherit` and a shared `:focus-visible` ring.

7. **P1 — Type and font-slot drift.**
   - Distinct font sizes per page: 22 on /resolver-math, 16 on /stats, 13 on /what-is-a-resolver.
   - Text elements under 12px: 171 on /stats, 147 on /palette, 142 on /stats/ledger (mobile).
   - Four families render: IBM Plex Sans, ui-monospace/monospace, **Albert Sans** (treasury, and
     hard-coded in 8 CSS rules site-wide) and **Arial** (default button font on the guide pages).
     The rule is three slots.
   - Fourteen kicker/eyebrow class names (`story-kicker`, `dash-kicker`, `stats-kicker`,
     `economy-kicker`, `resolutions-eyebrow`, `account-kicker` on palette, `resolver-lab-kicker`,
     `rm-eq-kicker`, …), and one of them renders in sans instead of mono.

   *Fix:* an `Eyebrow`/`PageHeader` component and an SDK type scale of about 6 steps with a 12px
   floor.

8. **P1 — Status colour has two meanings.** Resolutions colour "Ready" with `--primary`
   (`css/resolutions.css:75-76`), /resolvers colours "Deployed" green, and /palette says primary is
   identity only and success is state. *Fix:* a `StatusChip` with an SDK meaning map: ready/deployed
   → `--live` or `--success`, building/draft → `--drift`, idea/planned → `--reference`.

9. **P1 — Wayfinding.**
   - Breadcrumbs exist on 6 modules (four separate implementations) and are absent on /stats,
     /resolvers, /stats/gpu, /stats/ledger, /treasury and /palette.
   - Numbering conflicts (lifecycle `02/03` breadcrumb vs `01` kicker).
   - Name conflicts (start-from-something-real has 3 names).
   - `↗` is used for internal routes (treasury, lifecycle).
   - Orphans with 0 inbound page links (crawl): /palette, /resolver-math,
     /start-from-something-real, and /stats/gpu, which is unreachable even from the menu.
   - Dead end: /resolvers (0 outbound).

   *Fix:* `Breadcrumb` driven by the catalog (one implementation), `PrevNext`, a `RelatedLinks`
   footer on every page, and a link rule (`→` internal, `↗` external only).

10. **P2 — Accessibility chrome.**
    - No skip link and no `contentinfo` landmark, while every page has 4–9 unlabeled or duplicate
      `nav` landmarks.
    - Non-interactive `<li>` bar rows are Tab stops (/stats/gpu, /stats/ledger).
    - Content scrolls in `section#scene-page-*` rather than the document, which hurts browser
      find-in-page anchoring, iOS toolbar collapse and keyboard scrolling until focus is inside.
    - Small tap targets (<32px): 13 on /stats, 16 on /resolver-math (mobile), 4–5 on every
      resolution page.

11. **P2 — Performance is good.** No infinite CSS animations on any page in this half. The
    background lattice and the resolver scene are finite `requestAnimationFrame` choreographies
    that settle (`js/lattice.js`, `resolver-lab.js:217-239`). /stats polls every 60s and pauses
    when hidden. Small leftovers: three full-viewport background canvases on every route (two at
    1440x900 and one 0x0) and the 1s clock interval on /stats.

## Hand-built pattern frequency (feeds the component library)

Counted across the 12 page modules behind these 35 routes. "Impls" = distinct hand-rolled
implementations; "Sites" = call sites or instances in code.

| Pattern | Impls | Sites | Where (file:line) | Proposed component |
|---|---|---|---|---|
| Page hero (eyebrow + H1 + lede ± chips/stats) | 9 | 12 | `dash-kit shell`, `stats.js:71-90`, `resolvers.js:76-80`, `stats-gpu.js:62-64`, `stats-ledger.js:96-98`, `resolutions.js:72-88`, `economy-preview.js:23-35`, `palette.js:30-36`, `resolver-guide.js:24-25`, `lifecycle.js:99-102`, `resolver-lab.js:270-276` | `PageHeader` |
| Eyebrow / kicker | 14 class names | 12 | see cross-page #7 | `Eyebrow` |
| Data table | 3 (D.table, `el('table')`, string) | 21 | `stats.js` ×7, `stats-gpu.js` ×2, `stats-ledger.js` ×6, `resolver-math.js` ×5 (kit), `reference.js:43-48` | `DataTable` (overflow wrapper, numeric columns, sans body) |
| Tab / segmented / pressed-group selector | 8 | 9 | `resolutions.js:93-145`, `:199-330`; `lifecycle.js:104-110`, `:169-176`; `resolver-guide.js:26-27`, `:44-45`; `economy-preview.js:40-44`; `resolver-math.js:687` | `Tabs`, `SegmentedControl`, `DepthTabs` |
| Bar list (ranked bars) | 4 | 10+ | `stats.js:222,312,332,352,375,390,404`; `stats-gpu.js:44`; `stats-ledger.js:67`; (`D.bar` primitive only) | `BarList` |
| Stat tile / figure | 5 | ~35 tiles | `D.stat` (`stats.js` ×27, `resolver-math.js:744`), `stats.js:245`, `resolvers.js:33-50`, `economy-preview.js:46-55`, `resolutions.js:80-87` | `StatTile`, `StatRow` |
| Card / card grid | 6 | ~40 cards | `resolvers.js:51-66`, `resolutions.js:51-64`, `:213-222`, `stats.js` (`dash-node`), `palette.js:47-49`, `resolver-lab.js:356-395` | `Card`, `CardGrid` |
| Prev / next / continue nav | 6 | 6 | `lifecycle.js:154-157`, `resolver-guide.js:35-37`, `resolver-lab.js:307-316`, `resolutions.js:346-357`, gpu/ledger back button, `economy-preview.js:20-22` | `PrevNext`, `RelatedLinks` |
| Callout (boundary / warning / provenance / unavailable) | 5 | 6 | `lifecycle.js:111-114`, `resolver-guide.js:33-34`, `reference.js:67`, `economy-preview.js:32`, `resolver-math.js:288-295` | `Callout` (tone: boundary, warning, unavailable with failure/missing/remedy slots) |
| Figure / diagram frame | 5 | 5 | `lifecycle.js:123-134` + `stage-scenes.js`, `resolver-guide.js:29-32`, `resolver-lab.js:318-332`, `resolver-math.js:163-171`, `palette.js:17-23` | `FigureFrame` (caption, "illustration / not live" label, mobile disclosure) |
| Breadcrumb | 4 (+1 kit) | 6 | `lifecycle.js:83-87`, `resolver-guide.js:23`, `resolver-lab.js:269`, `resolutions.js:34-49`, kit `shell` crumbs | `Breadcrumb` (from catalog) |
| Status chip + legend | 5 | 5 | `resolvers.js:24-32`, `resolutions.js:209-212` + legend, `resolver-lab.js:368`, `stats.js` `dash-badge`, stats "All systems normal" | `StatusChip` (SDK meaning map) |
| Step list / stepper | 3 interactive + 2 static | 5 | `lifecycle.js:90-98`, `resolver-lab.js:277-300`, `resolver-guide.js:44-45`; static `resolutions.js:280-300`, `resolvers.js:92-99` | `Stepper`, `StepList` |
| Meta chips row | 2 | 4 | `stats-chips` in `resolvers.js:80`, `stats-gpu.js:64`, `stats-ledger.js:98`; `resolutions.js:80-87` dl | `MetaChips` |
| Code / identifier chips | 3 | many | `resolvers.js` Y codes, `stats-ledger.js` inline code, `resolver-math.js:551,720-730` | `CodeChip`, `CodeBlock` |
| Accordion / details | 1 | 6 | `resolvers.js:64` only | `Accordion` (the most under-used primitive) |
| Live status header (poll + refresh) | 1 | 1 | `stats.js:83-90,897-920` | `LiveStatus` |
| Markdown renderer | 1 | 1 | `reference.js:33-57` | keep, emit shared `DataTable`/`CodeBlock` |
| Glossary term | 0 | 0 | — | `Term` (new; derived glossary) |

**Existing component system to build on.** `js/content/components.js` already defines typed CMS
blocks (`RBLOCK_TEXT_V1`, `RBLOCK_CTA_V1`, `RBLOCK_IMAGE_V1`, `RBLOCK_CARD_V1`, `RBLOCK_QUOTE_V1`,
`RBLOCK_DIVIDER_V1`, plus captured blocks), and every page exposes a `data-ark-insert="main"`
anchor. Page structure itself does not use these blocks. The patterns above are the missing typed
blocks: `PageHeader`, `Tabs`, `Accordion`, `Callout`, `StatTile`, `DataTable`, `BarList`,
`StatusChip`, `Breadcrumb` and `PrevNext`. They should be added there, and in `ArkUI.dash`, so that
the CMS and the page modules render the same thing. Per AGENTS.md, promote them through
`deadark-ui-lab` and the SDK.
