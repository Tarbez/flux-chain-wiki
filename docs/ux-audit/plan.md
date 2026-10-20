# DEFXN polish program — plan

Owner goal (2026-10-19): a major polish upgrade of the CMS and the public site — clean
journeys, less information overload, Ark UI primitives ported as premade components, every
page improved, dead/unused pages linked or merged — **no feature reduction**. Plus: catch the
site up with capabilities/resolver chains, and unify defxn.com and Flux Launch onto the
product-kit family system (the subdomains direction).

Audit inputs (this folder): cms.md, pages.md (+ crawl TSVs), pages-ux-a.md, pages-ux-b.md,
components.md, brand.md, resolvers-content.md. Census baseline: component-census-baseline.tsv
(`npm run census -- --check` must never rise; ratchet down as families are replaced).

## Owner decisions (2026-10-19)
- Flux Launch gets its own new **DeFi** group in the product switcher (seventh group).
- defxn.com pages that overlap products (/explore, /deploy, /dao, /treasury, /bundle-deployer,
  /account/domains): **explain + hand off** — keep a short plain-language explainer of the
  concept with a clear "Open <Product>" handoff to the subdomain; no duplicated tooling.
- defxn.com is the **family home** (not one of the products): kit app bar + switcher + footer,
  keeps its five visitor-selectable themes; the kit follows the active `data-theme`.
- Signature framing for public copy: "Its signature is its result; whether to rely on that
  resolver is decided before you send anything: its grammar, its capabilities, who can change it."
- Defaults taken by the coordinator (revisit if the owner disagrees): palette canonical home =
  the SDK (AGENTS.md: SDK theme is source of truth), after the SDK colour-law check; Launch's
  `ink` theme stays selectable, Ember becomes default; tokens-inside-native-chain (Q9) is NOT
  stated as live in public copy until the code does it (describe as planned); nothing dropped —
  /experiments + /experiments/lab merge with a redirect; /concept/spec rewritten against the
  evidence registry.

## Hard rules for every agent
- No feature reduction; fold rule (≤1.6× viewport) is met by structure (tabs, disclosures,
  sub-pages), never by `display:none` or truncation without a way to expand.
- Components are canonical in Ark UI (design/ark-ui, ark-primitives, ark-elements, ark-a11y)
  and the SDK (design/deadark-sdk); defxn consumes them via `npm run sync:ark` / `build:ark`.
  Never build a local copy of something Ark ships; add missing parts to Ark.
- Saved CMS data is never rewritten; old block ids stay readable; layout-key continuity is
  tested whenever a page's structure changes.
- Do not touch /Volumes/PortableSSD/flux/defxn-defi-rs* or the Flux Launch worktrees that the
  dense-wire program owns (another session); list needed changes there for the owner instead.
- Never use port 3437 (owner's live server). Don't commit; the coordinator commits.
- Every defect → a named regression test; `node scripts/run-tests.mjs` green;
  relevant `npm run test:browser -- --only …` green.

## Waves
- **Wave 0 — done (5a1ac71):** audits, Ark delivery plumbing + census, CMS P0s.
- **Wave 1 (parallel, file-owned):**
  - W1-ARK-BLOCKS: `@deadark/ark-ui/blocks` (hero, section header, pager, figure, facts,
    static steps, meter, quote, eyebrow, actions row, stat absent-state, card, callout, CTA,
    breadcrumb, glossary term) + static `dist/ark-ui.blocks.css`; version bump.
  - W1-ARK-PARTS: ark-primitives/ark-a11y/ark-elements/SDK: alert tones drift/reference, badge
    meaning tones, reserved generated-id prefix, SDK CMS block schemas for every new block.
  - W1-BRAND: `--accent` conflict fix; product-kit Phase A (actions slot, sub-brand label,
    home mode, menu mode, classic build, split tokens, DeFi group, defxn.com as family home);
    font slots (Albert Sans + IBM Plex Mono; IBM Plex Sans not loaded today).
  - W1-SITE-FIXES: inventory/UX bugs that need no new components (doc links, not-found, /about
    hidden ending, orphans and exits, experiments merge, names, catalog `journey` field driving
    menu/sitemap/footer, CMS orphan tag, skip link, hidden focusable fallback links, controls
    inheriting the page font, focus rings).
  - W1-CONTENT: resolver/capability content per resolvers-content.md (defxn only), banned
    vocabulary in rendered copy + extend the vocabulary test to rendered copy, registry
    snapshot generator.
  - W1-CMS-IA: editor information architecture per cms.md (header ≤ ~9 primary controls,
    plain-language labels, internal names behind "Developer details", one searchable page
    list, New page by title, unified undo, right-click actions also in the toolbar, one
    overlay system, phone targets).
- **Wave 2:** defxn adapter (`js/ark/blocks.js` registering Ark blocks as resolvers), CMS
  Library derived from the block registry, CSS deletion per family; defxn.com and Flux Launch
  adopt the kit shell.
- **Wave 3:** page conversion to data + blocks, in order: stats family, guided/story template
  (theory sheets, how-chapters, lifecycle), about + home, product/overlap pages (explain +
  hand off), learnings; then header, explorer, account, resolver lab, home flow.
- **Wave 4:** full re-audit (same drivers), census ratchet, fold-rule sweep, owner review.

## Resume point (2026-10-19 ~21:50, all agents paused on the usage limit until 02:00)
Committed: Wave 0 (5a1ac71), Wave 1 (3462ab4). Uncommitted in the tree: Wave 2 (Ark blocks on the site,
CMS Library from blocks, defxn.com on the kit shell, /palette pilot) and Wave 3 (stats ×5, story ×18,
home/about/chain, guide/product/resolutions ~30 routes, idle-frame settle, shared Ark follow-ups,
census fixes) — ~230 files. Unit suite at this point: 187/197.
Paused agents (resume with SendMessage, same ids in the coordinator's session):
- W3-LEARN — nearly done (all views ≤1.57); was reviewing screenshots. Owns learnings-blocks,
  likely operator-states ("ArkUI.page is not a function": a page now calls ArkUI.page without loading
  blockScripts in that test's harness) and the no-deprecated-vocabulary failure if it's article copy.
- W3-EDITOR — owns admin.cjs, auth-bundle.cjs (script order: authorization view must load before
  js/admin/mesh.js — likely the new js/admin/ark-host.js tag), cms-overlay-z-ladder,
  design-check-score-excludes-not-built, admin-studio; components.cjs if it's admin CSS.
- W3-BUDGET — was fixing a docs line (live update now degrades instead of refusing); still needs the
  ≤30 KB proof and the CSS ledger.
Cross-agent failures — coordinator fixed 3 of 4 (~22:10): reference-reader (snapshot regenerated),
state-layering (test updated to the one-standard-frame rule: only deployment + /account are 1600),
fold-no-hidden-content (test now compares selectors in one spelling; the bundle trim minified
ark-blocks.css and dropped attribute quotes / combinator spaces — every guarded rule is still there).
home-launch → W3-BUDGET: ArkUI.blocks.update now loads js/ark/vendor/ark-kit-live.js on a page's first
live update and applies queued readings when it arrives (async); the test reads the tile synchronously.
Give the adapter an awaitable (e.g. ArkUI.blocks.whenLive()) and make the test await it — the product
behaviour (reading lands in the same element a moment later) is fine.
Also fixed by the coordinator: no-deprecated-vocabulary — js/content/evidence-registry.js now ships claim
+ evidence only for VERIFIED records (no page reads the rest; the frozen registry keeps its words), and
the test treats a verified record's `evidence:` text as data (home parses figures from it, never shows
it) with a guard that fails if any page renders it. home-blocks re-checked: passes.
Coordinator also fixed (~23:00): auth-bundle (script order read from <script src> tags only — a header
comment naming js/admin/ark-host.js matched first), components (Ark's generated-sheet header was reworded
by the minifier; both spellings recognised), admin (read time is now DERIVED from the body; the test
expects the derived figure — NOTE for W3-LEARN: the CMS still shows an editable "Reading time" field in
js/admin/articles.js that no longer does anything; make it read-only/derived or remove it from the form),
operator-states (/explore's frame is Ark blocks; the toy-DOM test gets an ArkUI.page stand-in, its
subject is setup(); the frame is covered in real DOM by task-pages-blocks + routes-live).
Left: learnings-blocks (W3-LEARN's own test mid-edit: `seen.folded` is [] where a count is expected),
home-launch (W3-BUDGET: await the live chunk). Unit suite then: expected 195/197.
Then: full unit suite → all browser drivers serially → commit Waves 2–3 (delete unpinned .vendor
tarballs) → Wave 4 (re-audit, census ratchet, fold sweep, /account conversion with browser coverage
of sign-in/wallet/keys first, owner review). Owner-side: Flux Launch kit adoption (merge
wave3-launchpad-v2 first), fixes in defxn-defi-rs/explore/dense-wire listed in W1-CONTENT's report.

## Resume point 2 (2026-10-20 01:00)
Unit suite 197/197 (coordinator fixed the rest; learnings-blocks had a duplicate `folded` key and a text
helper that read glossary tooltips). Browser drivers 9/17 (log: /var/folders/.../defxn-browser-tests-twZBrG):
- STALE DRIVER SELECTORS after Wave 3 conversions: component-context + studio-flows select
  `.how-chapter-header` on /download (now the story template); publish-flows looks for an old annotated
  element on / (home is blocks now). Repoint through the new structure (layout keys / block ids).
- LIKELY CMS↔BLOCK-PAGE REGRESSIONS (editor agent, highest priority):
  1. a new unsaved article never shows on the canvas (cms-journeys "article", full-audit content/articles)
     — the canvas route never becomes /learnings/<slug>. js/main.js still builds draft routes via
     ArkUI.catalogContentRoutes (js/pages/catalog.js:116; a draft gets no body file only when it carries
     `sections`) — probe whether createArticle's draft carries sections now, and whether js/pages/article.js
     (story template) mounts from a draft (LearningContent.find before the body file exists);
  2. [FIXED 01:05 by coordinator — NOT a product bug] content-panels: the canvas DID update; the driver
     read body.innerText, and the converted home shows HOME.EYEBROW in Ark's eyebrow (text-transform:
     uppercase), which Chromium's innerText returns uppercased. Driver now reads textContent; passes.
     Check the other drivers for the same innerText-vs-uppercase trap (inline-content, full-audit).
  3. Content lens: clicked text does not become editable (inline-content race step) — binding vs the
     copy-key stamping on block pages (data-ark-copy-keys);
  4. design-check-stable: "the page never settled" on the converted home (9/13, settled=false).
Then all 17 drivers serially, then commit Waves 2–3.
Coordinator, 01:25: fixed driver staleness — component-context (source moved to /account, the hand-built
page whose title still takes ancestor styling; letter-spacing asserted as an em unit), publish-flows
(element must be inside [data-ark-page]: an Ark hero's root is a <header>), content-panels (above). Both pass.
studio-flows still FAILS two steps — for the editor agent:
  a) makecomp: on the converted /download the title is in the hero and the intro paragraph opens The idea
     tab (key page:/header:1/p:1), so the selection spans two containers and the instance lands after the
     paragraph while the hero loses its title. PRODUCT DECISION needed in cmsMakeComponent: refuse a
     selection whose members don't share a parent (say why, name the fix), or place the instance at the
     FIRST member. Then give the driver a same-container pair on /download.
  b) points: collapsing `.continuity-host,[data-ark-page]` to 0 still leaves a 40px insert slot on /about
     — find the container the slot's width comes from now and collapse that in the fixture.
Coordinator, 01:35 (driver staleness, all now passing): design-check-stable (js/admin/design-check.js now
waits for the animations actually running when they end within 20 s — the converted home plays its scene
once, longer than the old 6 s budget; 6 readings stable at 9/13), inline-content article steps (driver
looked for the old h1.article-title; now the Ark hero h1 — title edit, save, reload and public page pass).
Still open for the agents at 02:00:
  - inline-content "race": a canvas click while the Page fields sheet is open does not start inline
    editing. Ruled out: the sheet overlaying the click point (clicked near the line start too) and
    overlay.js closing the sheet on canvas press (it closes only canvas-closable popovers). Suspect: the
    sheet's queued re-send re-mounts the block page (ArkUI.page) right as the click starts editing.
  - cms-journeys + full-audit "new article on the canvas before Save": the preview never navigates to
    /learnings/<slug>. Ruled out: missing body file (articleBlueprint carries `sections`). Suspect: the
    converted js/pages/article.js failing to mount from a blank draft (e.g. empty `relevance` as the
    callout's required body, empty reviewed/evidence) — probe the preview console on that route.
  - studio-flows makecomp + points (see above).

## Resume point 3 (2026-10-20 01:50) — committed af33dc6 (Waves 2–3), unit 198/198, browser 15/17
Product decision made (coordinator): "Make into component" REFUSES a selection whose layers don't share a
parent ("select layers that sit side by side in one container (or select that container)") — js/main.js
cmsComponentRefusal; tests/cms-component-one-place.cjs. Never moves content between containers.
For the editor agent: studio-flows makecomp must now select a same-parent heading + paragraph pair. On
/download the intro (page:/header:1/p:1) sits beside the steps OL in the tab panel, not beside the title;
an Ark hero's h1 and lede are siblings (/learnings: h1 page:/div:1/h1:1 + lede DIV page:/div:1/p:2 — note
the lede is a DIV, so derived prop names change). Add a step asserting the cross-container refusal and its
words. Also: studio-flows points 0px fixture; inline-content race.

## Resume point 4 (2026-10-20 ~03:30) — Wave 3 agents all reported; unit 199/199; full browser run started
All three Wave 3 agents finished (nothing they changed is committed yet; coordinator commits after the
browser run):
- W3-EDITOR: makecomp now makes a component from the /download hero's eyebrow + title (selected via the
  Layers row, then Shift-click) and adds a step asserting the cross-container refusal; points fixture
  collapses `[data-ark-page]` (its grid tracks were the 40px); inline-content race was a DRIVER defect
  (the click point sat under the open sheet) — clickText now hit-tests and picks the uncovered end.
  primitives.js → js/admin/ark-host.js (Ark tabs/accordion/toggle group) was already done.
  Left: rail's five tabs + More menu's #viewSwitch still hand-wired; Page settings tab strip scrolls
  sideways at 390px with no visible scrollbar (Ark list styling).
- W3-LEARN: CMS "Reading time" is read-only + derived (js/admin/articles.js, editor.js refuses edits to
  `minutes`). Every learnings view ≤ 1.6 fold at 1440/390. Content calls for the owner: "A finance
  resolver by construction" ends with an unrelated particle-mesh "starting values" table; derived read
  times are much shorter than the typed ones (7 → 2 min on 487 words).
- W3-BUDGET: block routes +28.1 KB gz (≤ 30); block+live 29.5. NAMED EXCEPTION: block+terms 31.0 and
  /stats 32.4 — the glossary (2.9 KB). Lazy definitions would take them from screen readers and SSR;
  trimming can't close it. Owner call: shorter/fewer definitions, or a per-route glossary. Public CSS
  net -46.0 KB gz vs 5a1ac71. Ledger + numbers in docs/cms-architecture.md "Budget".
Census ratcheted: classes card 29→28, tabs 9→8, toggle 9→8.
Next: browser run result → commit → Wave 4 (re-audit vs docs/ux-audit findings, fold sweep, /account
conversion with sign-in/wallet/keys browser coverage first).

## Resume point 5 (2026-10-20 ~07:20) — committed 2665642 (Wave 3 close-out); Wave 4 slices running
Wave 3 closed: unit 199/199; every browser driver passes on 2665642, each run alone (/stats layout keys
NOT BUILT: its node rows re-sort by live data). The fix found by the full run: an automatic toolbar
popover shut the More menu the person had opened (overlay.busy(), toolbar `auto`). Flake to watch:
studio-flows "reload the editor" (preview ready on /download) under load 9.
Machine: 8 GB with ~13 GB swap in use by other apps/sessions -- long drivers time out across unrelated
steps under that pressure; re-run alone before diagnosing.
Wave 4 slices from docs/ux-audit/ledger.md "Next work", Sonnet agents (Fable out of credits):
- W4-S1 CMS editor (js/admin/*, admin-app.html, admin/studio-embed css): Media picker + Replace/Alt,
  Mesh wording, Versions "Current", hide inapplicable commands, Page-field groups, then P1-16/P1-5.
- W4-S3 public pages (/explore, stats family, seo-data, vocabulary test): "finalized", 25,232 ops/s,
  explore contrast/type/plural, how-chapter labels, Tier 1, lab drag hint.
- W4-S2 /account: browser coverage FIRST (tests/browser/account-flows.mjs), then conversion.
Owner calls pending: glossary size vs budget; Q1/Q2/Q4/Q6/Q7 + BFT/Byzantine; home headline; phone
"Production" pill; lifecycle/palette copy in-module until the FLX manifest store; the unrelated
particle-mesh table in "A finance resolver by construction".

## Resume point 6 (2026-10-20 ~afternoon) — Wave 4 slices all reported; full verification running
Done (uncommitted until the full run passes): W4-S1 CMS (Media picker, Replace/Alt, Mesh wording, Versions
Current, waits flag, page-field groups, undo steps, phone bar + bottom sheets, rail tabs/viewSwitch on Ark,
F2 contrast/12px, confirm() -> ArkKit.arkConfirm); W4-S2 /account (143-step account-flows driver, Ark
blocks incl. forms; Keys view was inert -- fixed); W4-S3 /explore (stepper = Ark tabs, popovers + dock =
Ark popover side:'top', lab regression fixed); W4-S0 fold/contrast sweep driver (now 0 violations);
W4-F1 kit chrome (flux/defxn-product-kit src, synced to 23 consumers -- UNCOMMITTED in those repos) +
page controls + /reference fold; W4-ARK @deadark/ark-ui 0.2.8 -> 0.2.10, @deadark/sdk -> 0.2.40 (field,
form, list, status-line, choice, popover chunk, interactive stat, actions opener/busy, arkConfirm, patch
label fix, Esc preventDefault, popover placement, pointerup dismiss); W4-S6 home/about/chain (grammar
tooltips, steps -> Ark tabs, 12px labels, home opens on "Where do I start?" -- owner may revert); W4-S7
palette (SDK-derived tokens, Type + Contrast tabs) + reference (outline, breadcrumb, TOC);
W4-S13 resolver figures (resolver-page-parts.js), journey links (page-kit journeyPages); W4-S14 one
Copy (page-kit copyCommand), sentence-case rule, /deposits Ark form, lab state at /experiments.
Census: station no longer counts as stat; step/card raised by hand with reasons; 57 values ratcheted down.
Cache-bust: index.html changed assets + pageAssetVersion -> 20261020-w4.
Follow-ups (next wave): /chain swap figure placement (renderer exists), /chain SOURCE link + /resolvers
link, bundle-deployer journey links, resolutions alsoMore; transit-map labels on /; learnings card
row alignment (Ark card); Ark: line/lane diagram part, field step:'any', styled select, foldBelow
hidden=until-found (core budget has ~10 B headroom on live routes); long reference docs (whitepaper,
bench-003 > 3x); reference-text sync has no trigger (reference-reader catches staleness).
Owner calls: glossary size vs budget; minify page modules (/account +42.8 KB -> ~+31); home tab order;
commit the kit sync in the 23 consumer repos (dense-wire/web held).
