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
