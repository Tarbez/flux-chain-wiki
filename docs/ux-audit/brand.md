# DEFXN brand unification audit: defxn.com, Flux Launch and the product kit

2026-10-19. A read-only audit. No product code was changed while writing it.

**Owner direction (2026-10-19).** This replaces the 2026-10-18 rule "never edit defxn or the launchpad for the kit":

> "unify our launchpad and the defxn to the subdomains direction, cause that is the one that unifies the launchpad branding and the defxn branding so that is the most recent."

The "subdomains direction" is `flux/defxn-product-kit`. The rest of this document calls it **the kit**.

**Evidence.**

- Screenshots and computed fingerprints of every surface that could be served were taken at 1440x900 and 390x844, in dark mode. They are in `/private/tmp/claude-501/-Volumes-PortableSSD/a51a7d03-a815-4ae1-960d-76c01ee0b2ce/scratchpad/ux/brand/`. Each file is `<surface>-desktop.png` or `<surface>-phone.png`. `fingerprint.json` records each surface's fonts, h1 treatment, header, theme attributes, palette channels, stylesheets, page-height ratio and page errors.
- That folder is session scratch. Copy it next to this file if it should outlive the session.
- Static reads covered the kit, `flux/defxn`, `flux/flux-launchpad` (and `-wt-v2`), `design/deadark-sdk` and `design/ark-ui`, plus the consumer HTML and CSS of all 23 kit consumers.
- `npm run check` in the kit returned `dist/ is current (24 products)` and `every consumer's kit copy is current (23 consumers)`.

---

## 0. Decisions that need the owner

1. **Palette home.** Two options:
   - Move the Ember family into the Dead Ark SDK as namespaced themes (`ember`, `ember-light`). The kit, defxn.com and Flux Launch all read it from there. This is the AGENTS.md path: "the SDK theme is the source of truth".
   - Keep the generator in a DEFXN-owned place, the kit.

   **Recommended:** the SDK, behind one gate. First run the SDK colour-law audit on the current Ember values (§7.2). If the SDK's Sixty-Thirty-Ten law rejects three vivid roles, the owner chooses between relaxing the law for role-ladder themes and keeping Ember in the kit.
2. **What Flux Launch looks like.** Launch moves from the SDK `ink` theme (monochrome plus cyan) to Ember, as the 2026-10-18 direction implies ("feels dead"). `ink` either stays available as a viewer theme or is retired. **Recommended:** Ember is the default, and `ink` stays selectable, because a redesign never removes a feature.
3. **Launch's place in the switcher.** Proposed id `defi`, name **DeFi** (it already brands itself "DEFXN DeFi"), lane **Assets**. That makes Assets five items, which is the cap. The alternative is a seventh lane, Markets, which makes the switcher wider.
4. **defxn.com's role.** defxn.com is the family **home**, not a product. The DEFXN mark on every product already links there. It wears the kit bar and switcher, and its CMS-driven nav moves into the bar. Its scene, hero and background patterns stay as its own presentation.
5. **defxn.com theme families.** Ember, Tide, Moss, Dune and Dusk (10 palettes) are a defxn.com viewer feature with CMS-saved overrides. Products offer only Ember dark/light. **Recommended:** keep all five on defxn.com, keep Ember-only on products, and make the kit honour the active theme attribute instead of forcing Ember (§5, D3).
6. **Pages on defxn.com that duplicate a product.** `/explore` vs Explore, `/deploy` vs Deploy, `/dao` vs DAO, `/treasury` vs Treasury, `/bundle-deployer` vs Bundles, and `/account/domains` vs Domains. These are naming collisions, as in the 2026-10-18 audit §2. Nothing should be removed. Each page should state its relation to the product (for example "preview of DAO" plus a link through the kit catalog), or the owner renames one side.
7. **Branch order for Launch.** `flux-launchpad-wt-v2` (branch `wave3-launchpad-v2`) forks before the ink redesign and has 20 dirty files. If the kit restyle lands on `wave1c-backed-launch` first, it will conflict with that branch's CSS edits. **Recommended:** merge v2 into the design-current tree before Launch adopts the kit. The user owns the merge.

---

## 1. Surface inventory

Column legend:

- **Kit:** the vendored `dist` copy. Every consumer is at the current kit (no `version` is published; it is `0.1.0`, unversioned, and drift is byte-compared by `sync.mjs --check`).
- **Bar / Sw / Hand / Foot:** kit app bar, product switcher, handoff strip, kit footer, measured live from the DOM.
- **Ratio:** page height ÷ viewport, desktop / phone. Budget is ≤ 1.6.

| Surface | Source | Local URL used | Kit | Bar | Sw | Hand | Foot | Type (h1) | Palette | Ratio |
|---|---|---|---|---|---|---|---|---|---|---|
| **defxn.com** public | `flux/defxn` (`index.html`, CMS runtime) | :3438 (`scripts/serve-site.mjs`) | **no** | own `.ark-header` (76px) | no (has "Resolutions" mega menu) | no | own `hl-footer-links` + "Powered… by FLX" | home: Albert Sans 80.6px/600/-0.065em; inner pages: `"IBM Plex Sans"` stack (not self-hosted, so it falls back to system-ui) | Ember `ghost` via `data-theme`, 10 palettes, CMS overrides | home 2.39 / 2.72 (inner scroller); `/stats` 12.6 / 20.7 |
| **defxn CMS** | `flux/defxn/admin-app.html` + `css/admin.css` | :4602 (static; publish host not touched) | **no** | own `gate-bar` / `#appBar` | no | no | no | Albert Sans 52px/**300** | SDK names aliased to Ember (§6) | 1.00 / 1.00 (locked gate) |
| **Flux Launch** (current) | `flux/flux-launchpad`, branch `wave1c-backed-launch` @ `dbfa811` | :4603 (`serve-dev.py`; the existing :8080 server accepts no connections) | **no** | own `.appbar` (65px, segmented nav) | no | no | own status line + "Design system" | Albert Sans 56px/600/-0.045em, two-tone | SDK **`ink`** (mono + cyan 188) via `theme-bridge.css` | home **2.19 / 4.87**; tokens 1.00 / 1.20; create 1.03 / 1.56 |
| Flux Launch v2 | `flux/flux-launchpad-wt-v2`, `wave3-launchpad-v2` @ `60b2349` | :19930 (existing) | no | old appbar | no | no | — | IBM Plex Sans 20px/800 | **stale** hand-copied Ember (`canvas 18 32.6% 5.3%`) | renders half-unstyled: `index.html` links `css/home.css`, which does not exist in that tree |
| Kit reference | `defxn-product-kit/docs/system.html` | :4590 | source | yes | yes | yes | yes | 56/600/-0.045em | Ember | (doc page) |
| Repo | `product-surfaces` (repo) | :4174 | yes | yes | yes | yes | yes | 32/600 | Ember | 1.25 / 1.33 |
| Code | `flux-code-app` | :3420 | yes (`src/app/defxn`) | yes | yes | yes | no foot at load | mono h1 13.5px | Ember + inline Ark UI auth sheet | 1.00 / 1.00 |
| DB Studio | `flux-db-studio` | :3430 | yes | yes | yes | **no** | yes | 32/600 | Ember | 1.34 / 1.39 |
| Grammar | `flux-grammar-atlas` | :4411 | yes | yes | yes | yes | yes | 32/600 | Ember | 1.27 / 1.47 |
| Domains | `product-surfaces` (domains) | :4173 | yes | yes | yes | yes | yes | 32/600 | Ember | 1.37 / 1.41 |
| Bundles | `bundle-deploy/bootstrap` | :17831 | yes | yes | yes | yes | yes | 32/600 | Ember | 1.06 / 1.18 |
| Bundles download site | `bundle-deploy/site` | (static) | **no** | own `header.site` | no | no | own | `-apple-system` | own hex palette (9 literals) | — |
| Packages | `mesh-registry/web` | :4175 | yes | yes | yes | yes | yes | 32/600 | Ember | 1.32 / 1.51 |
| Remote | `remote-env/public` | :4546 | yes | yes | yes | own board | yes | 56/600 | Ember (`preview.html` is off-kit: inline hex) | 1.00 / 1.40 |
| Deploy | `deploy` | :4544 | yes | yes | yes | yes | yes | 32/600 | Ember | 1.10 / 1.00 |
| Explore | `explore` | :4541 | yes | yes | yes | yes | yes | 32/600 | Ember | 1.15 / 1.46 |
| Node | `defxn-defi-rs/dense-wire/web` | :4539 | yes | yes | yes | yes | yes | 56/600 | Ember | 1.35 / 1.55 |
| Storage | `flux-storage-desktop` | :4564 | yes | yes | yes | yes | yes | **mono** 32/500 | Ember | 1.24 / 1.41 |
| Claims | `ark-explorer` | :4551 | yes | yes | yes | **no** | yes | 32/600 | Ember | 1.00 / 1.00 |
| DAO | `defxn-dao` | :4538 | yes | yes | yes | yes | yes | 32/600 | Ember | 1.00 / 1.25 |
| Treasury | `treasury` | :4540 | yes | yes | yes | yes | yes | 32/600 | Ember | 1.00 / 1.16 |
| Genesis | `genesis` | :4547 | yes | yes | yes | **no** | yes | 32/600 | Ember | 1.04 / 1.19 |
| Inbox | `flux-notify/web` | :4561 | yes | yes | yes | yes | no `.dx-title` | **28/700/normal** tracking | Ember | 1.00 / 1.20 |
| Posts | `flux-content/web` | :4563 | yes | yes | yes | yes | yes | 32/600 | Ember | 1.41 / 1.45 |
| Play | `flux-games/web` | :4562 | yes | yes | yes | yes | no h1 | — | Ember | 1.00 / 1.24 |
| Radio | `defxn-radio` | :7780 | yes | yes | yes | yes | yes | 32/600 | Ember | 1.00 / 1.07 |
| PVA | `pva-site` | :4550 | yes | yes | yes | **no** | yes | 32/600 | Ember | 1.08 / 1.52 |
| Collections | `collections-site` | :4548 | yes | yes | yes | **no** | yes | 32/600 | Ember | 1.00 / 1.00 |
| Market | `market-site` | :4542 | yes | yes | yes | **no** | yes | 32/600 | Ember | 1.00 / 1.46 |
| Books | `books-site` | :4549 | yes | yes | yes | **no** | no `.dx-title` | 20/600 | Ember | 1.00 / 1.25 |

Other web surfaces found with no `defxn` block in their `package.json`:

- `ark-gateway`: a Next UI for gateway.deadark.com. It is a Dead Ark surface, not DEFXN.
- `defxn-browser-mobile`: iOS/Android shells. It has no `package.json`, and its README names browse/nodes/radio.defxn.com.
- `ark-browser` and `ark-miner-desktop`: Electron renderers.
- `ark-pin-extension`: a browser extension.

None of these is in scope for the kit unless the owner says otherwise.

No page logged an error during capture. No kit consumer overflows horizontally on a phone.

### 1.1 Per-product deviations (kit consumers)

The 23 consumers are clean on the big things:

- Every main page loads `defxn-product.css` and calls `mountShell`.
- None links Google Fonts, Plex Mono or the SDK `theme.css`.
- None uses serif, Inter or JetBrains, and none sets its own `font-family`.
- None has raw hex in its page CSS, and none runs an idle animation.
- Identity terracotta is never used on an action.

What remains, worst first:

| # | Where | Deviation | Evidence |
|---|---|---|---|
| 1 | Repo and Domains, as served | **The running copy is stale.** The bar reads "SOURCE · Repo", but the lane is now "Build". `product-surfaces/scripts/serve.mjs` builds `dist/` once at start (server started 2026-10-18 17:19), and `sync.mjs --check` only checks the source vendor dirs, never built outputs. `dist/repo/shared/vendor/defxn/defxn-product.{css,mjs}` differ from the kit. | `repo-desktop.png` |
| 2 | Bundles download site | No kit. Its own `--bg:#0b0d10 … --accent:#5fb0ff`, `-apple-system`, own header and footer. | `bundle-deploy/site/css/site.css:3-20`, `index.html:17,56` |
| 3 | Code | Injects `@deadark/ark-ui`'s `ARK_AUTH_KIT_STYLES` inline. That sheet paints primary buttons with `--accent`, which the DEFXN aliases make terracotta, so `globals.css:154-185` carries 20 override rules to repaint it. A hand-copied theme boot snippet duplicates the kit's storage key. | `flux-code-app/src/app/layout.tsx:27,49` |
| 4 | DB Studio | 28 signing-dialog rules (the README says pages carry none), a 3px glow focus ring, `!important` overrides, and no handoff strip. | `flux-db-studio/src/styles.css:99-108,377` |
| 5 | Packages | Unscoped override of the kit's `.dx-input` with a 3px danger glow. | `mesh-registry/web/styles/app.css:47` |
| 6 | Claims, Books, Collections, Market, PVA, Genesis, DB Studio | No handoff strip, so the take/give chain is broken at seven products. Remote uses its own board instead. | `ark-explorer/src/app.js:12-15`, `genesis/genesis-app.js:141-144` |
| 7 | Collections, Market, DAO, Genesis, Radio, Treasury | 2-6 signing-dialog rules each, against the kit's `signing.css` single owner. | page CSS |
| 8 | Inbox, Books, Storage, Code, Play | Headline off the kit treatment: Inbox 28/700 with normal tracking; Books 20px; Storage and Code mono h1; Play has no h1. Allowed only where the signature visual leads (kit README) and the page uses `.dx-title--sm`; Inbox and Storage do not. | `fingerprint.json` |
| 9 | Explore, Remote, Genesis, Deploy | Inset box-shadow markers, a 3px canvas ring, and a primary-tinted background flash. These are small breaks of the "flat, primary is identity only" rules. | `explore.css:67,142`; `remote-env/public/style.css:125`; `genesis.css:98`; `deploy.css:140` |
| 10 | Grammar | 772-line page CSS that still carries pre-kit `.panel/.input/.chip/.btn-row`. | `flux-grammar-atlas/css/grammar.css:396,412` |
| 11 | Every consumer | The theme attribute is `data-dx-theme`, but the SDK, defxn.com and Launch use `data-theme`. Three storage keys exist for the same viewer choice: `defxn-product-theme` (kit), `flux-chain-theme` + `defxn-site-theme-default` (defxn.com), and none in Launch (fixed `ink`). | `defxn-product-kit/src/shell.mjs:120-151`, `defxn/js/bootstrap.js` |

---

## 2. Three systems, measured side by side

| Property | Kit (products) | defxn.com | Flux Launch (current) |
|---|---|---|---|
| Theme attribute / key | `data-dx-theme=dark\|light`, `defxn-product-theme` | `data-theme=<10 palettes>`, `flux-chain-theme`, CMS `theme-data.js` overrides | `data-theme="ink"` fixed, no toggle |
| Palette | Ember ghost/glacier, copied from `defxn/css/flux-themes.css` at kit build | Ember plus 4 families, from `scripts/build-flux-themes.cjs` (OKLCH, own generator) | SDK `ink`/`ink-light` (hand copy of SDK output) + `theme-bridge.css`. Its hand copy of `flux-themes.css` is **stale** (old saturated canvas `18 32.6% 5.3%`, primary `19 54.1% 67.2%`; current is `18 7.5% 3.6%` / `19 99.8% 67.5%`). |
| CTA colour | teal `--secondary` (`.dx-btn--solid`) | teal `--secondary` | cyan `--accent` (ink); `--secondary` bridged to accent |
| Identity colour use | mark, eyebrow tick, one `em`, one `sx-now` | J42 record, head marker, mark | none (monochrome) |
| Selection / focus | `--reference` blue | `--reference` | text-strong underline indicator (`nav-ind`) |
| Text face | Albert Sans self-hosted from kit dir; `--font-*` overridden to Albert | Albert Sans on home and in article copy; **inner page headings resolve to the SDK `--font-sans` ("IBM Plex Sans", not loaded)**; SDK `--font-display` is "Source Serif 4" in `css/themes.css:97` | Albert Sans (vendored `fonts.css`, path adjusted by hand) |
| Mono | `"IBM Plex Mono"` first, not loaded, so system mono | `ui-monospace` stack | system mono |
| Headline | `.dx-title` 32/40/56, 600, -0.045em, `.dx-dim` second sentence, ≤1 `em` | home 80.6px/600/-0.065em, two-tone (first sentence faint); inner h1 44-60px weight 500-600 | 56/600/-0.045em, two-tone; page heads 32px |
| Type scale | 21 sizes incl. half-pixels (10.5, 12.5, 13.5, 14.5) | ~35 distinct sizes, 7px-100px | **checked**: 11/12/14/16/20/32 (+40/56), 4px grid (`scripts/design-check.mjs`) |
| App bar | 64px: mark + "DEFXN" / lane·product switcher / page nav (segmented) / status pill + theme toggle | 76px: mark + "DEFXN · FXN CHAIN" / Resolutions mega menu / boxed link buttons / Account / Run DEFXN / network popover / Menu | 65px: mark + "DEFXN DeFi" / one segmented route nav with icons and sliding indicator / network pill + Sign in + Get started; menu mode < 1100px |
| Product switcher | 6 lanes × ≤5 products + Resolvers band | none (Resolutions mega menu is a different thing: resolver catalogue) | none; its home lists its own 7-item "suite" (Launchpad, Upcoming rounds, Airdrops, DEX, Staking, Treasuries, Bounties) |
| Handoff / footer | Takes / this / Gives strip; quiet footer from catalog | closing block + link row + "Powered, deployed and made by FLX" | status line ("Disconnected to ws://…") + "Design system" link |
| Panels | flat hairline, radius 8, no shadow | glass panels with blur, boxed nav pills, shadows in 12+ sheets (`components.css`, `navigation.css`, `home-swiss.css`) | flat hairline, radius 7-8, no shadow |
| Buttons | pill 999px; solid teal / soft / quiet reference | rectangular 6-8px boxed nav; teal CTA (`Browse the raw records`) with glow-like shadow | pill 999px; solid cyan, outline secondary |
| Icons | glyphs copied from `defxn/js/ark/icons.js` | `js/ark/icons.js` (DEFXN set, ~30 glyphs, only ~6 names shared with the Ark pack) | **different set**: Ark icon pack (`design/ark-ui/icons/ark`) + Lucide fallback (`scripts/vendor-icons.mjs`) |
| Mark | `defxn-mark.png` as a same-origin file (`--dx-mark`), because signing CSPs refuse `data:` | `css/brand-marks.css`: `data:` URI mask (must work on `file://`) | hand copy of defxn's `brand-marks.css` |
| Motion | none idle; transitions on interaction | scene runtime, hero motion, WebGL zero scene, **background patterns animate by default** (DEFXN.md "Backgrounds"), text scramble | panel drag/dock; no idle loops |
| Figures | `.dx-frame` + `svg.dx-sx` schematic grammar, one `sx-now` | `story-diagrams.js`, isometric landscape, transit map | `css/schematics.css` (the kit's source) |
| Signing dialog | `src/signing.css` (one owner) | `css/authorization-dialog.css` (source) | hand copy of defxn's dialog CSS/JS |
| Delivery | ES module + CSS, vendored by `sync.mjs` | classic scripts only (opens with a double-click on `file://`); SSR for bots via jsdom (`api/render.mjs`) | ES modules, no build |

---

## 3. defxn.com vs the kit: concrete differences

Screenshots: `defxn-home-*.png`, `defxn-explore-*.png`, `defxn-stats-*.png`, `defxn-resolutions-*.png`, `defxn-account-*.png`, `defxn-deploy-*.png`, `defxn-cms-*.png`. Compare with `kit-system-desktop.png`, `kit-switcher-open-desktop.png` and `repo-desktop.png`.

1. **Header structure.**
   - defxn: a 76px bar. It has a two-line lockup (`DEFXN` / `FXN CHAIN`), then a row of separately boxed link buttons (Overview, How it works, Mesh Explorer, Stats, Account with a "Signed out" sub-label, Run DEFXN), a network popover ("Production" / "Local devnet") and a "Menu" button.
   - Kit: a 64px bar. It has a one-line lockup, a `/` separator, the lane·product switcher, one *segmented* nav group, and the status pill plus theme toggle at the end.
2. **Nav source.** defxn's header text is CMS saved data (`js/content/manifests/nav.js`, edited in admin) and is built by `js/resolvers/header.js`, which also does one-row overflow management (`tests/browser/public-header.mjs`, 1024-1920px). The kit nav is moved DOM.
3. **Mega menu.** defxn has a "Resolutions" mega menu: 16 resolution categories, featured cards, and "How resolvers work" / "Browse all". The kit has the product switcher instead. Both are panels that hang under the bar, with different content and different visuals: defxn's are glass cards, the kit's are flat lane columns.
4. **No product switcher and no handoff on defxn.com.** The 24 products are not reachable from defxn.com's chrome. The kit's mark links *to* defxn.com, but defxn.com links to none of them.
5. **Type scale.** defxn uses ~35 sizes (7-100px). The home h1 is 80.6px with -0.065em tracking; inner h1s are 44-60px at weight 500, in the SDK `--font-sans` stack, which names "IBM Plex Sans" that the site never loads. The kit is 32/40/56 at 600 and -0.045em, in Albert Sans throughout.
6. **Headline treatment.** Both are two-tone. defxn dims the *first* sentence (the rejected idea, per DEFXN.md); the kit dims the *second* (`.dx-dim`). Both are deliberate, so keep defxn's as its home presentation.
7. **Panels and cards.** defxn has glass panels with backdrop blur, shadowed popovers and boxed nav pills. The kit is flat hairline with radius 8 and no shadows. The CMS defines `--shadow-lift/float/pop/dock` (`admin.css:36-39`).
8. **Buttons.**
   - defxn: rectangular 6-8px nav buttons, and a solid teal CTA with a lifted look.
   - Kit: pill 999px with `--solid` (teal, once per view), `--soft`, and quiet (reference).
   - Header buttons on defxn compute to **Arial 13.33px** (`Production`, `Menu`), because form controls there do not inherit the face. The kit fixes this with a zero-specificity `font: inherit` reset.
9. **Segmented controls.** defxn has none in the bar, and per-page tabs differ by page (`resolvers.css` "segmented1"). The kit uses `.dx-tabs` + `.dx-choice` everywhere.
10. **Footer.** defxn: a closing block, a link row (Protocol / Resolvers / Explorer / Run from source / Governance), "Powered, deployed and made by FLX", "© 2026 FLX" and a settings cog. Kit: one quiet footer from the catalog.
11. **Colour roles.** Same roles and the same Ember values: the kit copies them from defxn's `flux-themes.css` at build. The difference is scope. defxn exposes 10 palettes plus CMS per-theme overrides (`js/content/theme.js`, `THEME_KEYS`). The kit pins Ember with `:root:not([data-dx-theme="light"])` at specificity (0,2,0), which would **override** any non-Ember defxn palette if loaded as-is.
12. **CMS accent collision.** `admin.css` moved onto SDK names on 2026-10-18 and uses `--accent` for *selected / pressed / picked / active* states (`admin.css:104,120,247,268,387,473`). defxn's alias block maps `--accent` to `--primary` (terracotta), so the CMS paints selection in the **identity** colour. That breaks DEFXN.md ("never a hover/selected state") and the kit rule (selection is `--reference`). In the SDK, `--accent` is the action lane. Three meanings share one name.
13. **Iconography.** The same DEFXN set, which the kit copies from `js/ark/icons.js`, so there is no visual difference. It is still a second icon system next to the Ark pack that Launch uses.
14. **Motion.** defxn's scene runtime, hero motion, WebGL and background patterns animate by default (with a saved opt-out), within the house contract "animation must settle". The kit says nothing animates while idle. The background loop is the gap. Proposal: keep it as defxn.com home presentation, behind `[data-dx-product="home"]`, and never let it leak into products.
15. **Figure grammar.** defxn: `story-diagrams.js`, the transit map and the isometric landscape, with colour as data (J42 is the one identity mark). Kit: `.dx-frame` / `svg.dx-sx` with one `sx-now`. These are compatible in rule (one live identity mark) and different in drawing style. Keep defxn's drawings and frame them in `.dx-frame` chrome.
16. **Mark delivery.** defxn uses a `data:` mask, required for `file://`. The kit uses a same-origin PNG, required for `img-src 'self'` signing origins. Both come from `assets/brand/defxn-mark.png`.
17. **Fold.** The home inner scroller is 2.39 / 2.72 and `/about` is 2.08 / 2.65. `/stats` is 12.6 / 20.7, a dashboard with long sections. All are over budget by the owner rule. Other inner pages measure 1.0 to 1.23, but they scroll inside nested containers, so treat those figures as lower bounds.
18. **CMS look** (`defxn-cms-desktop.png`). This is a third visual language: a "Flux Protocol / ADMIN" letter-spaced lockup, weight-300 52px headline, step list, and a dotted-sphere background. It shares Albert Sans and the palette, nothing else.

## 4. Flux Launch vs the kit: concrete differences

Screenshots: `launch-home-*.png`, `launch-tokens-*.png`, `launch-create-*.png`, and `launchv2-home-*.png` for the stale branch.

1. **Colour.** This is the one big difference. Launch runs SDK `ink`: monochrome, with cyan `188 72% 56%` as the only accent and the CTA. The kit runs Ember: terracotta identity, teal CTA, blue reference. In practice, every Launch CTA ("Create an account", "Launch a token") is cyan where the family is teal, and Launch has no identity colour at all.
2. **App bar content.**
   - Launch: mark + "DEFXN **DeFi**" lockup, then one segmented route nav with an icon per item and a sliding `nav-ind` underline, then a segmented actions group (network pill "Local devnet", "Sign in", and a solid white "Get started").
   - Kit: mark + "DEFXN" / switcher / nav / pill + theme toggle.
   - The kit has no **actions slot** (account, sign in, primary header action), no **sub-brand** lockup, no **menu mode** (Launch collapses at < 1100px; defxn has "Menu"), and no **sliding indicator**.
3. **Switcher.** Launch has none and is absent from the kit catalog (no `defxn` block), so no product links to it and it links to no product. Its own home "suite" (Raise / Trade and stake / Fund the work) is a second product catalog. One entry, Treasuries, collides with the kit's Treasury product.
4. **Type.** Same face (Albert Sans) and the same display headline (56/600/-0.045em, two-tone). The kit copied it, and they agree. Launch enforces the scale 11/12/14/16/20/32/40/56 on a 4px grid with `design-check.mjs`. The kit uses 21 sizes including 10.5/12.5/13.5/14.5 and has no such check. **The kit is looser than its declared structure source.**
5. **Panels.** Both are flat hairline. Launch radius 7, kit radius 8. Launch's token page has the panel manager (drag, dock, float, persisted under `flux-launch-layout.v2`). That is a defining feature and must survive (owner rule 2026-10-16).
6. **Buttons.** Both are pills. Launch's header "Get started" is neutral solid white, and its page CTA is cyan solid. Kit solid is teal.
7. **Segmented controls.** Launch: pool-type tabs ("Curve pool / Liquidity pool / Service pool") and filter chips with counts ("All 0 · Fair launch 0 · On curve 0 · In a pool 0"). Kit `.dx-tabs` is the same shape. The count badge is not in the kit.
8. **Footer.** Launch: a connection line ("Disconnected to ws://127.0.0.1:19501/ws") plus a "Design system" link. Kit: the catalog footer. Launch's connection line belongs in the kit status pill.
9. **Figures.** Launch's `schematics.css` is the source of the kit's schematic grammar. On Launch the live mark is cyan; in the kit it is terracotta `sx-now`.
10. **Iconography.** Launch uses the Ark pack + Lucide (`coins`, `chart-candlestick`, `droplets`, `rocket`, `route`). The kit and defxn use DEFXN's `icons.js`. **Two icon sets in one family.**
11. **Mark.** The same PNG, through a stale hand copy of defxn's `brand-marks.css`.
12. **Vendoring.** Launch vendors defxn files **by hand** into `vendor/defxn-ark/` (`themes.css`, `flux-themes.css`, `fonts.css`, `color-system.css`, `brand-marks.css`, `authorization-dialog.*`, `icons.js`, `auth.js`, …). Against the current defxn sources: `flux-themes.css`, `fonts.css`, `icons.js` and `auth-kit-create-panel.js` have **drifted**. Launch also hand-copies the SDK's `theme-ink.css`. This breaks "SDK consumers sync via CLI, never hand copies" and "centralize, don't duplicate".
13. **Fold.** The signed-out home is **2.19 / 4.87**, over budget. Tokens and Create are within it.
14. **Two trees.**
    - `flux-launchpad` (`wave1c-backed-launch` @ `dbfa811`, 2026-10-18 19:13) is design-current: ink redesign `7d2aed3` plus a 101-item UX pass.
    - `flux-launchpad-wt-v2` (`wave3-launchpad-v2` @ `60b2349`) forks at `c67ccb2`, *before* the redesign. It carries the V2 trade-lane feature work, has 20 dirty files, and its served copy renders half-unstyled.
    - **Current = `flux-launchpad`.** v2 is a feature branch that still has to merge.

---

## 5. Canonical source per artifact

**The loop today:**

```
defxn/assets + defxn/scripts/build-flux-themes.cjs ──> defxn/css/flux-themes.css ──> kit build ──> kit dist ──> 23 products
design/deadark-sdk ──(deadark-theme CLI)──> defxn/css/themes.css (fonts/sizes only; colours redeclared by flux-themes.css)
defxn/* ──(hand copy)──> flux-launchpad/vendor/defxn-ark/*      design/deadark-sdk dist ──(hand copy)──> flux-launchpad/vendor/deadark-sdk/theme-ink.css
```

If defxn.com vendors kit dist as-is, the kit reads `flux/defxn/css/flux-themes.css` and defxn reads `flux/defxn/vendor/defxn/defxn-product.css`. At file level that is a DAG, not a cycle. It still makes one repo both the **brand source** and a **brand consumer**. Someone editing defxn.com would not know which palette file wins, and a page loading both gets two copies of every token.

**The fix is to move the brand sources out of the site and into the layer whose job they are.** Every arrow then points one way:

```
design/deadark-sdk  (palette generator + theme registry, font slots, semantic tokens, components.css)
        │  deadark-theme sync-consumer / publish-sdk (sha256-pinned)
        ▼
design/ark-ui       (behaviour primitives + elements; icon pack)
        │
        ▼
flux/defxn-product-kit  (DEFXN role layer, brand assets: mark/font/glyph selection, shell, components, catalog)
        │  npm run sync (byte-checked)
        ▼
defxn.com · Flux Launch · 24 products     (layout + unique presentation only)
```

| # | Artifact | Canonical source (target) | Today | Flow after | Notes |
|---|---|---|---|---|---|
| D1 | **Palette values** (Ember dark/light; also Tide, Moss, Dune, Dusk for defxn.com) | `design/deadark-sdk/src/theme/themes.ts`, as **namespaced** themes `ember`, `ember-light`, `tide`, `tide-light`, …, generated by a port of `build-flux-themes.cjs`'s OKLCH ladder | `flux/defxn/scripts/build-flux-themes.cjs` | SDK `dist/theme.css` → kit build reads the ember blocks → kit dist → everyone | The port must be **byte-exact**: generated channels diff to zero against today's `flux-themes.css`. Gate: SDK colour-law audit first (§0.1). Interim: the kit keeps reading `flux-themes.css`, but defxn.com does *not* load the kit's palette block (D3), so no file is both read and written by the same repo. |
| D2 | **Role layer** (secondary/CTA, shade ladders -100…-700, `-ink`, `-tone-*`, `--anchor`, `--*-scale`) | Emitted by the same SDK generator for role-ladder themes (one vocabulary), or the kit's role layer if the SDK refuses it (two layers, §6) | defxn generator | same as D1 | `tests/theme-color-contrast.cjs` and `tests/components.cjs` move or are mirrored with the generator, so no guard is lost. |
| D3 | **Theme attribute + storage key** | SDK mechanism: `html[data-theme="<palette>"]`. The kit stops inventing `data-dx-theme`. One viewer key, kept by the kit as `defxn-product-theme` | 3 keys, 2 attributes | kit `initTheme` reads the old keys once and writes forward | A persisted-state key is never silently changed. The migration reads `flux-chain-theme` / `data-dx-theme` once (future law). Kit palette selectors key on `[data-theme="ember"]` etc., so defxn's other families are not overridden. |
| D4 | **Font choice** (display = sans = Albert Sans; mono = system mono) | SDK typography preset for the DEFXN family (font slots) | kit overrides `--font-*`; defxn `themes.css` says IBM Plex Sans + Source Serif 4 | SDK → `--font-*` correct at the source; kit stops overriding | Fixes defxn's inner-page headings falling back to system-ui, and removes the latent serif `--font-display`. |
| D5 | **Font file** (`AlbertSans-latin-var.woff2` + unicode range) | `defxn-product-kit/brand/` (moved from `defxn/assets/fonts/`) | defxn | kit dist → all, same-origin | Launch's path-patched hand copy of `fonts.css` goes away. |
| D6 | **Mark** (`defxn-mark.png`, `fxn-mark.png`) | `defxn-product-kit/brand/` (moved from `defxn/assets/brand/`) | defxn | kit emits **both** encodings from the one PNG: `defxn-mark.png` (same-origin, signing CSPs) and `defxn-marks.data.css` (`data:` mask for `file://` pages) | defxn's `build-brand-marks.cjs` retires in favour of the kit output. defxn.com loads the `data:` variant (its CSP allows `img-src data:`; it must open on `file://`). |
| D7 | **Icons** | `design/ark-ui/icons/ark` (the shared Dead Ark pack). DEFXN's ~30 glyphs are promoted into it. The kit's catalog names icons from the pack | `defxn/js/ark/icons.js` (kit, defxn) vs Ark pack + Lucide (Launch) | ark-ui pack → kit (product glyphs) and → `defxn/js/ark/icons.js` (generated) and → Launch `js/icons.mjs` (already generated from the pack) | One icon language. Name collisions (`network`, `chain`, …) are resolved in the pack, not per app. |
| D8 | **Components** (buttons, fields, tabs, cards, refusal, steps, dialogs) | `defxn-product-kit/src/product.css`, **built on Ark UI behaviour** (`@deadark/ark-elements` / primitives) and SDK `components.css` structure where they agree (§8) | kit | kit dist → all | defxn's `components.css` and Launch's `app.css`/`shell.css` component rules retire as each page adopts. |
| D9 | **Shell** (bar, switcher, handoff, footer, refusal) | `defxn-product-kit/src/shell.mjs`; the kit also emits a **classic-script** build (`defxn-product.js`, IIFE, `window.DefxnKit`) from the same source | kit (ES module only) | kit dist → all | defxn.com is classic scripts on purpose (`file://`, and the jsdom SSR pass). The IIFE is generated, never a second hand-written shell. |
| D10 | **Product catalog** | each product's own `package.json` `defxn` block (unchanged); defxn.com declares itself as `home`, Launch as product `defi` | kit build | unchanged | Launch's "suite" list and defxn's footer link row should render from the catalog where they name family products. |
| D11 | **Signing dialog CSS** | `defxn/css/authorization-dialog.css` stays the *source* of the Scoped Claim Authorization dialog. The kit's `signing.css` is the *dress*. Long term the dialog element moves to `@deadark/ark-elements` `flux-authorization-dialog` (it is already listed there) | defxn source + kit dress + Launch hand copy | ark-elements → kit → all | Kills Launch's hand-copied dialog JS/CSS and the 2-28 per-page copies in §1.1. |
| D12 | **Design laws** (type scale, 4px grid, flat, one identity mark, fold) | Launch's `scripts/design-check.mjs` rules, **moved into the kit** as `npm run check:design`, which every consumer runs on its page CSS | Launch only | kit → all | Derive, don't author: the scale exists already, and the kit currently disagrees with its own structure source. |

---

## 6. One token vocabulary, or two layers

Today's facts (from `design/deadark-sdk/src/theme/{themes,css,color-law}.ts` and `defxn/css/flux-themes.css:210-232`):

- **These names already agree:** surfaces (`--canvas`, `--depth`, `--surface`, `--raised`, `--nested`, `--overlay`), text (`--text-strong`, `--text`, `--text-muted`, `--text-faint`, `--text-inverse`), borders (`--border-subtle/default/strong`), plus `--warning`, `--danger` and `--reference`. DEFXN `--success` = SDK `--trust`. The kit consumes about 90% of its token reads from this shared set.
- **DEFXN has these and the SDK does not:** the `--secondary` role, shade ladders `-100…-700`, `-ink`, `-tone-50…950`, `--anchor/-ink`, `--*-scale`, and `--signal`/`--info`.
- **The same name means a different colour:**
  - `ghost`, `glacier`, `clay`, `grove`, `ochre`, `moss`, `marine`, `bone` are palette keys in both systems with different values. defxn wins today only by load order.
  - `--primary`: structural hue (SDK) vs identity, never an action (DEFXN).
  - `--accent`: the action lane (SDK; `.dak-sdk-button--primary` paints it) vs an alias of `--primary` (DEFXN).
  - `--complement`, `--role`, `--live`, `--badge`, `--action-*`, `--accent-subtle/strong`, `--primary-light`, `--theme-glow` also differ.

**Decision: two layers now, one vocabulary as the end state, with no name that means two things at any point.**

1. **Base layer = SDK semantic tokens**, unchanged names: surfaces, text, borders, `--reference`, `--trust` (with `--success` as alias), `--warning`, `--danger`, `--drift`, `--hidden`, and fonts `--font-display/sans/mono`. Every DEFXN surface (kit, defxn.com, CMS, Launch) reads these names.
2. **DEFXN role layer**, owned by the kit's dist and generated in the SDK if D1/D2 land there:
   - `--primary` (identity) and its ladder; `--secondary` (CTA) and its ladder; `--reference-100…700`, `--trust/warning/danger-100…700`; `--anchor`; `--*-scale`.
   - Plus **one explicit action alias**: `--action-bg/fg/border/hover-bg` = secondary. This is the SDK's own action vocabulary pointed at the DEFXN CTA.
3. **Remove the colliding aliases from the DEFXN layer.** Stop re-pointing `--accent`, `--complement`, `--role`, `--live` and `--badge` (`flux-themes.css:213-216`). Inside an `ember` theme, the SDK generator sets each of these to its DEFXN meaning:
   - `--accent` = **the action colour** (teal), which is the SDK meaning (action lane), so SDK components and Ark UI sheets paint correctly with no override.
   - `--badge` = identity terracotta.
   - `--role` = reference.
   - `--live` = trust.

   As a result:
   - SDK and Ark UI components stop painting terracotta buttons. That deletes Code's 20 override rules (`globals.css:154-185`).
   - The CMS's `--accent` selection states turn teal. They should be **re-pointed to `--reference`** (selection is the reference role), which is a six-line change in `admin.css`.
4. **Namespace the palette keys** (`ember`, `ember-light`, `tide`, …). Read the old `ghost`/`glacier` attribute values once and write forward (D3). The CMS `theme-data.js` `activeTheme: "ghost"` is saved data, so it gets a read-time mapping and is never rewritten in place.
5. **End state (one vocabulary):** the SDK adds `--secondary` + ladders as first-class tokens for role-ladder themes. The DEFXN layer then contains only `--anchor`, `--*-scale` and the `--dx-*` layout tokens (`--dx-radius` → `--size-card-radius`, `--dx-bar-h` → `--size-nav-height`, `--dx-max` → `--size-page-width`).

## 7. Migration plan

Ordered. Each step names the repo and files it owns. Steps on one line marked ∥ can run in parallel. Nothing below has been started.

### Phase A: make the kit able to host the two big surfaces (kit only)

A1. **Kit shell gaps** (`defxn-product-kit/src/shell.mjs`, `src/product.css`, `test/kit.test.mjs`):

- an `actions` slot in `.dx-bar__end` (account, sign in, the header's one solid action, the network popover);
- a `brandSub` lockup ("DeFi", "FXN CHAIN");
- `home: true` mode, where the switcher shows "DEFXN" with no product and there is no handoff;
- a menu mode below a declared width, matching Launch's 1100px tiers and defxn's one-row overflow manager;
- an optional sliding current indicator for the nav (Launch `nav-ind`);
- a count badge in `.dx-choice`.

Each is a dress for an existing feature on one of the two surfaces.

A2. **Kit delivery** ∥ A1 (`scripts/build.mjs`, `scripts/sync.mjs`):

- emit `defxn-product.js` (IIFE, `window.DefxnKit`) from `shell.mjs`;
- emit `defxn-marks.data.css` (D6);
- split the palette block into `defxn-tokens.css`, keyed on `[data-theme="ember"|"ember-light"]` (D3);
- add a `boot.js` theme-boot snippet so Code's hand copy (`layout.tsx:27`) can import it;
- extend `sync --check` to name *built* outputs a consumer declares (for example `product-surfaces/dist/*/shared/vendor/defxn`), or have `serve.mjs` refuse a stale build. This closes §1.1 #1.

A3. **Design check** ∥ A1 (`defxn-product-kit/scripts/design-check.mjs`): port Launch's scale and grid rules, then fix the kit's half-pixel sizes (10.5/12.5/13.5/14.5 → 11/12/14), fold-budget-safe.

A4. **Catalog entries** ∥ A1:

- `flux/flux-launchpad/package.json` gets a `defxn` block: `{id:"defi", name:"DeFi", lane:"assets", local:"http://127.0.0.1:4603/", takes:[{what:"an Auth Kit identity", from:…}], gives:[…]}`. The lane, name and ports need owner sign-off (§0.3).
- `flux/defxn/package.json` gets `defxn.home` (site `https://defxn.com`, local `http://127.0.0.1:3438/`).

### Phase B: canonical sources (SDK, ark-ui, kit)

B1. **SDK palette port** (`design/deadark-sdk/src/theme/themes.ts`, new `src/theme/role-ladder.ts`, `tests/theme-contract.test.mjs`, `color-law.ts`). Run `deadark-theme audit` on today's Ember channels **first**. The port is admitted only if every generated channel equals `flux-themes.css` byte for byte. Publish through `publish-sdk` with sha256 recorded.

B2. **Icon pack** ∥ B1 (`design/ark-ui/icons/ark/*.svg`): promote the DEFXN glyphs. Then `defxn/js/ark/icons.js` is generated from the pack (new script in `defxn/scripts/`), and the kit's `deriveIcons()` reads the pack.

B3. **Brand assets move** ∥ B1:

- `defxn/assets/brand/*.png` and `defxn/assets/fonts/AlbertSans-latin-var.woff2` → `defxn-product-kit/brand/`;
- `build.mjs` reads them there;
- defxn's `fonts.css` and `brand-marks.css` become kit outputs synced into defxn.

The move is atomic: the kit build and the defxn sync land in one change, or `build.mjs` refuses with a remedy naming the new path.

B4. **Kit reads the SDK** (after B1): `derivePalette()` reads the SDK's `dist/theme.css` ember blocks, delivered by `deadark-theme sync-consumer` into the kit. `flux-themes.css` is then generated from the SDK for defxn's other families, and `build-flux-themes.cjs` retires.

### Phase C: adopt (defxn.com ∥ Flux Launch ∥ product clean-ups)

C1. **defxn.com public**. File ownership in `flux/defxn`:

- `index.html` loads `vendor/defxn/defxn-tokens.css`, `defxn-product.css`, `defxn-marks.data.css` and `defxn-product.js`.
- `js/resolvers/header.js` mounts `DefxnKit.mountShell({home:true, nav: <CMS nav>, actions: <account, Run DEFXN, network popover>})`. The CMS nav keys (`manifests/nav.js`) and the Resolutions mega menu stay; the menu moves into the bar's nav as a disclosure.
- `css/navigation.css` and `css/components.css`: header and button rules retire. Page presentation is scoped under `[data-dx-product="home"]`.
- `api/lib/render-core.mjs` must render the bar in the SSR pass, which needs the IIFE build.
- Fold work on `/`, `/about` and `/stats`.

C2. **defxn CMS** ∥ C1 (`flux/defxn/css/admin.css`, `admin-app.html`):

- `--accent` selection states → `--reference` (lines 104, 120, 247, 268, 387, 473);
- shadows reduced to popovers only (`--shadow-pop` kept for floating panels; cards flat);
- the gate bar wears the kit bar (`product` = home, nav = Content/Design modes).

Saved CMS data is not touched.

C3. **Flux Launch** ∥ C1, after the v2 merge (§0.7). File ownership in `flux/flux-launchpad`:

- delete `vendor/defxn-ark/{themes,flux-themes,fonts,color-system,brand-marks}.css`, `vendor/deadark-sdk/theme-ink.css` and `css/theme-bridge.css`, replacing them with the kit sync (`kit: "vendor/defxn"`);
- `index.html` / `js/app.mjs`: `mountShell({product:"defi", nav:#routeNav, actions:[network pill, Sign in, Get started], brandSub:"DeFi"})`;
- `css/shell.css` keeps only Launch layout;
- `html[data-theme="ember"]` is the default, and `ink` stays selectable if the owner keeps it;
- `js/icons.mjs` regenerated from the pack after B2;
- `panel-manager.mjs` and `flux-launch-layout.v2` untouched;
- home fold from 2.19/4.87 to ≤ 1.6;
- `design-check.mjs` defers to the kit check (A3).

C4. **Product clean-ups** ∥ C1-C3, one owner per repo, following §1.1:

- `flux-code-app`: drop the inline Ark UI sheet override once §6.3 lands; import the kit boot.
- `flux-db-studio`, `collections-site`, `market-site`, `defxn-dao`, `genesis`, `defxn-radio`, `treasury`: delete signing-dialog copies.
- `mesh-registry`: scope the `.dx-input` glow away.
- `ark-explorer`, `books-site`, `collections-site`, `market-site`, `pva-site`, `genesis`, `flux-db-studio`: add `renderHandoff`.
- `bundle-deploy/site`: adopt the kit, adding `site/vendor/defxn` as a second kit dir.
- `remote-env/public/preview.html`: adopt the kit tokens.
- `flux-notify`, `flux-storage-desktop`, `books-site`: headline treatment, or `.dx-title--sm` where the signature leads.

C5. **Restart stale servers** after every sync. `product-surfaces` rebuilds only at start.

### Phase D: tokens to one vocabulary (after C)

D1. The SDK adds `--secondary` ladders as first-class tokens (§6.5). The kit's role layer shrinks to `--anchor`, `--*-scale` and layout. Code and the CMS lose their alias shims.

**Parallel lanes.** A1, A2, A3, A4, B1, B2 and B3 are independent. C1, C2 and C3 depend on A1, A2 and A4. C3 also depends on the v2 merge. B4 depends on B1. C4 can start at once for the items that do not need §6.

**Ownership by repo:**

| Repo | Steps |
|---|---|
| `design/deadark-sdk` | B1, D1 |
| `design/ark-ui` | B2, D11 |
| `flux/defxn-product-kit` | A1, A2, A3, B3 (receiving side), B4 |
| `flux/defxn` | A4, B2 (generated icons), B3 (sending side), C1, C2 |
| `flux/flux-launchpad` | A4, C3 |
| each product repo | its C4 line |

## 8. Fit with `docs/ux-audit/components.md` (Ark UI primitives → defxn components)

That document did not exist yet when this audit finished, so this section states the constraint it should meet rather than quoting it.

**Yes, the kit's component layer should be built on Ark UI, split by concern:**

- **Behaviour** (dialog, popover, menu, tabs, select, combobox, sheet, drawer, otp-field, date-picker, toast, and the authorization dialog) comes from `@deadark/ark-elements` / `@deadark/ark-primitives`. These are unstyled, framework-free, and CSP-safe for styles: `adoptedStyleSheets`, or a nonce-carrying `<style>`.
- **Look** comes from the kit's `product.css`, reading the shared token layer (§6).

This is the "centralize" answer:

- The bar's switcher, the network popover, defxn's Resolutions mega menu and Launch's menu mode become one `flux-popover`/`flux-menu`.
- The kit's `.dx-tabs` becomes `flux-tabs`.
- The signing dialog becomes `flux-authorization-dialog`.

Then the 2-28 per-page dialog rule copies and Launch's hand-copied dialog JS go away.

**What must stay true:**

- Ark UI ships no CSS and holds its own JS token object (`ArkTokens`). `ark-ui.chrome.ts:16,48,70` hard-codes SDK bone/ghost hex. Before the kit leans on Ark UI, its styler must read CSS tokens. Otherwise Ark UI becomes a third palette.
- The `--accent` collision (§6.3) must be fixed first. Otherwise every Ark UI or SDK primary button on a DEFXN page renders terracotta, as Code's does today.
- defxn.com loads classic scripts. Ark elements must be loadable without an import map on `file://`, or defxn keeps its own pre-built bundle. That is the same constraint as D9.

**Order of work implied:**

1. §6.3, the alias fix (SDK + `flux-themes.css`).
2. Phase A kit gaps, built **directly on ark-elements** wherever the gap is a behaviour (popover, menu, tabs). This avoids building the shell twice.
3. The components.md migration of the remaining `.dx-*` behaviours.
4. Phase C adoption.

If components.md proposes styled Ark UI components with their own colours, it conflicts with D8. The look stays in the kit.

## 9. Risks

- **SSR.**
  - defxn.com's bot render (`api/render.mjs` → `api/lib/render-core.mjs`, jsdom) runs classic scripts off disk. An ES-module-only shell would vanish from SSR output and from `file://` opens, hence D9.
  - Next's SSR on Code already handles the kit through a client import. Keep the theme boot inline-first to avoid a flash.
- **CMS saved data.**
  - `js/content/manifests/nav.js` (header copy), `theme-data.js` (`activeTheme: "ghost"`, hex `colors` overrides, `themes:{}` per-palette overrides) and `settings-defaults-data.js` are saved by the CMS.
  - Renaming palette keys or nav keys must map on read and never rewrite those files (future law).
  - CMS hex `colors` overrides (`canvas #050507`, …) are applied *after* tokens by cascade order (`theme.js` header). After adoption they would also override kit tokens on defxn.com. Decide whether the CMS keeps palette authority on defxn.com. **Recommended:** keep it, but limit it to the `[data-dx-product="home"]` scope.
- **Persisted keys.** `flux-chain-theme`, `defxn-site-theme-default`, `defxn-product-theme`, `flux-launch-layout.v2` and `flux-launch-session-pref.v1` all stay readable. Only additive migrations are allowed.
- **Signing origins and same-origin assets.**
  - Kit consumers with `img-src 'self'` need the PNG mark. defxn.com and the CMS need `data:` (`file://`).
  - Ship both from one source (D6), and never inline the PNG into the shared CSS.
  - Bundles' broker serves kit files from a fixed whitelist pinned by its security test. Adding `defxn-tokens.css` / `defxn-product.js` / `boot.js` (A2) means updating that whitelist and test.
  - Any page with a hashed importmap (Bundles) must not gain new inline scripts.
- **Palette precedence.** The kit's palette uses (0,2,0) selectors to beat a stray SDK `theme.css`. Loaded unchanged on defxn.com, it would silently repaint Tide/Moss/Dune/Dusk users as Ember. D3 (keying on `data-theme`) is a prerequisite for C1.
- **SDK colour law.** The SDK's Sixty-Thirty-Ten law may reject three vivid roles. Run the audit before B1, and do not tune Ember to pass it: Ember's values are guarded by defxn's own contrast tests.
- **Fold rule.** These surfaces are already over budget before any change: defxn home 2.39/2.72, `/about` 2.08/2.65, `/stats` 12.6/20.7, and Launch home 2.19/4.87. Adding a 64px bar must not push any page further. Measure every inner state, the switcher open and the phone menu.
- **Motion.** defxn's default-on background patterns conflict with the kit's "nothing animates while idle". Scope them to defxn.com home so they cannot leak into products through the shared CSS.
- **Concurrent sessions.**
  - `flux-launchpad-wt-v2` has 20 dirty files from another session.
  - `defxn` is being edited for the CMS (the `admin.css` move happened on 2026-10-18).
  - Stage C3 behind the v2 merge, and check `git status` before every write.
  - The user owns commits.
- **Stale running copies.**
  - Servers that build once at start (`product-surfaces`) show old chrome after a sync, as Repo's "SOURCE" lane label does now. The :8080 Launch server accepts no connections.
  - Screenshots and acceptance checks must restart the server they measure.
- **Naming.**
  - "Market" (NFT listings) vs Launch's markets/Trade.
  - "Treasury" (product) vs Launch's "Treasuries" (suite item) and defxn `/treasury` (preview).
  - "Deploy" (resolver launcher) vs defxn `/deploy` (create or join a network).
  - "Explore" vs defxn "Mesh Explorer".
  - Resolve these in the catalog before C1/C3 put them side by side in one switcher.

## 10. Found along the way (not fixed, read-only audit)

- `product-surfaces` built output is stale against the kit, and `sync --check` cannot see it (§1.1 #1).
- Launch's hand-vendored `flux-themes.css`, `fonts.css`, `icons.js` and `auth-kit-create-panel.js` have drifted from defxn. Launch has been rendering an old Ember wherever the ink bridge does not cover a token.
- The defxn CMS paints selection states in the identity colour through the `--accent` alias (§3.12).
- defxn inner-page headings name "IBM Plex Sans", which is never loaded, and `css/themes.css` still declares `--font-display: "Source Serif 4"`. Neither is used on purpose.
- defxn.com header form controls render in Arial (`Production`, `Menu`).
- `flux-launchpad-wt-v2/index.html` links a `css/home.css` that its tree does not contain.
