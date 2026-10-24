# Skin contract v2: NFT skins across every Ark UI part

Written for: the NFT session (defxn-30), the genesis session, the Ark UI owner and the owner. Status: agreed by the NFT session (defxn-30) and the genesis session (genesis-b2), 2026-10-24. The NFT card's design and data fields are still unconfirmed by the owner, so every skin is sample-only.

Owner direction, the same day:
- "Fully integrate the NFT skinning, and make sure it supports all the Ark UI primitives, along with components such as menus, mega dropdowns and so on."
- "Keep the old navbar of defxn, but reskinned, and keep that mega dropdown, reskinned as well."
- Some skin elements need their own rules when they meet a part of the UI. Ark UI must adapt the structure to fit the skin, beyond its colours.

## Names (2026-10-24)

The card's pieces have UI names, so a site, a game and an app can place them without knowing they came from a card. Old names still work as aliases (Ark UI's `ARK_SKIN_CHROME_ALIASES` and `ARK_SKIN_VALUE_ALIASES`; the NFT session's `traits.js` `UI_NAMES`). Records keep their old keys, and nothing is rewritten.

| Old name | UI name |
| --- | --- |
| tag | nameplate |
| ornament (the piece) | accent strip |
| emblem | icon |
| backdrop | background |
| aura | glow |
| mark | logo |
| signal | beam |

The frame, corner, divider, palette and particles keep their names. Rule keys stay (`frame`, `edge`, `ornament`, `density`, `marker`, `header`, `layout`). Only rule values change: `header: nameplate`, `marker: icon`, `ornament: strip | icon`. This document still uses the old names in places written before the rename. Read them through this table.

## What a skin is

A skin is one Ark UI overlay recipe. It sits at precedence layer 3 of `design/ark-ui/STYLE_RECIPES.md`: after the provider theme and the starter recipe, before local overrides. It has three parts:

| Part | Holds | Reaches |
| --- | --- | --- |
| `tokens` | colour channels in the SDK's names | every primitive and every site style that reads a token |
| `chrome` | the card's drawn pieces as plain data: frame, corner, tag, ornament, divider, emblem | the parts whose rules ask for them |
| `rules` | per Ark UI part: which chrome it wears, and how its structure adapts | each part by its schema name |

A skin never carries CSS of its own. Every rule picks from a closed set (below), so a rule that would break a part cannot be written at all.

**Chrome format** (from the NFT session's `js/nft/skin-recipe.js`, `DefxnSkin.recipe(record)`). Each piece is `{ svg, viewBox, keep?, mirror?, fields? }`.
- **The SVG:** it is first-party markup with no script, no event attributes and no external refs. Ark UI still sanitizes it against an allow-list.
- **Colours:** they come from `var(--w-ink)`, `--w-dim`, `--w-line`, `--w-faint`, `--w-rule`, `--w-acc`, `--w-acc2` and `--w-state`. The skin's tokens carry their values, so a contrast fallback recolours the chrome too.
- **Stretching:** `keep` names the bands that keep their shape, and only the bands between them stretch. Ark UI owns this stretching as the one implementation. The NFT's `world.js` switches to it and deletes its own copy.

**The wrapper:** a skin is one scoped style rule plus a `data-defxn-skin` (or `data-ark-skin`) attribute on the wrapper. Removing the skin removes both.

## 1. Tokens

A skin sets the SDK colour tokens on a wrapper, as today:
- surfaces: `--canvas --surface --raised --nested --overlay`
- text: `--text-strong --text --text-muted --text-faint --text-inverse`
- accents: `--primary --accent --complement --role --badge`
- borders: `--border-subtle --border-default --border-strong`

**Gap found in the defxn navbar and mega dropdown.** They also read `--reference` and its scale (`--reference-100` to `--reference-700`), `--secondary`, `--secondary-ink`, `--secondary-600` and `--border-control`. A skin sets none of these, so today the navbar would change only halfway. The fix is one derivation in the SDK theme (`@deadark/sdk/theme`), so every consumer gets the same answer:
- the reference scale comes from the skin's link and control colour
- `--secondary` comes from `--complement`
- `--border-control` comes from `--border-default`

**Never skinned:** the meaning tokens (`--live --trust --drift --warning --danger --hidden --success`), the chain kinds and the networks. Their colour says what a thing is. `--reference` is a role (the ink of links and controls), not a meaning token. The SDK derives it with its scale, and a product that needs it fixed locks it.

**Product locks.** Each product declares the tokens a skin may not set, through Ark UI's existing `locked` mechanism (STYLE_RECIPES.md, "Locking"). The skin layer skips them, and the console names each one it skipped.
- **Genesis** (genesis-b2): `--accent`, `--accent-strong` and `--action-ink` (the one action and its text), `--signal` (the record's light), `--chain-identity` and `--chain-pool` (they match the 3D bands), and `--reference` (focus and hover).
- **defxn:** the meaning tokens, the chain kinds, the networks, and `--ember` (the record descent's light).
- Covenant keys such as `ARKMARK|TEXT` stay locked, as they are today.

**Contrast gate:** before a skin lands, the SDK checks text against surfaces (the site's `tests/theme-color-contrast.cjs` rules). A pair that fails falls back to the site's own token for that pair, and the console names it.

## 1b. Canvas renderers

A 3D or 2D canvas reads its colours when it paints, so it cannot see a token change by itself. Every skin change, on or off, fires `defxn:skin` on the skin's wrapper (it bubbles to `document`), with `detail = { on, record, theme }` and `theme.vars` holding every value.
- A renderer listens for it, takes the values from `detail.theme.vars` (or from the wrapper's computed style), and repaints once.
- It never polls and never observes styles.
- The defxn ring world, the Genesis scene and any later canvas use this one event. Ark UI also fires `ark:skin`, and renderers take either one.
- **The grid transforms with a card, by design** (the owner, later on 2026-10-24: "the grid can finally transform, so the cube details and texture and lighting can be affected by the NFTs"). This replaces the earlier "never". The design is `docs/home-redesign/GRID-LOOK.md`, with a prototype in `docs/home-redesign/grid-look/`:
  - The rings, the cube positions and what each cube means stay. The meaning colours stay locked.
  - A worn card changes the cubes' glass, edge glow, inner detail, texture, inner lights, base glow, particles and bloom through 19 closed knobs (a new ArkWorld `grid` group, editable in the CMS).
  - The card supplies the values (`DefxnSkin.recipe(record).gridLook`, derived from its palette and art layers, never authored per card). The ring kit renders them through `k.setGridLook(params, ms)`. No NFT code enters the ring kit.
  - The card's 2D world still never covers the grid.
  - Until `setGridLook` lands, `js/world/ring-kit.js` reads the site's own theme from `body` and adds no skin listener: with sample 263 worn and then removed, the grid alone measured the same on every pixel, within one step of rounding.
- **A host that wants its world to follow a skin opts in.** It puts `data-world-skin="follow"` on an ancestor of the canvas. The kit then reads the nearest `data-defxn-skin` / `data-ark-skin` wrapper, and repaints once on either event. The Genesis scene copies this kit and may use it. Even then, the chain kinds, the networks and `--ember` are never skinned.

## 2. Parts

- Every Ark UI primitive already stamps `data-ark-part` with its schema key (`ark-ui.runtime.ts`). Examples: `MEGAMENU`, `MEGAMENUPANEL`, `POPOVER`, the `BUTTON` variants, `CARD`, `DIALOG`.
- Site parts built by hand, the defxn navbar (`js/resolvers/header.js`) and its Products mega dropdown (`products-mega`), add the matching `data-ark-part` keys, so the same rules reach them with no special case.
- The NFT engine's `data-nft` kinds map onto parts: `panel`→`CARD` or `POPOVER`, `button`→`BUTTON`, `heading`→`HEADING|TEXT`, `divider`→`DIVIDER`, `badge`→`BADGE`. New site work uses parts. `data-nft` stays only for the card-only pieces: `name`, `avatar`, `banner`, `card`.

## 3. Rules: how the structure adapts

Each rule key has a closed set of values, and Ark UI implements every value once, per part:

| Rule | Values | What changes |
| --- | --- | --- |
| `frame` | `none` `corners` `full` `ticket` `bracket` | a drawn frame on its own layer, over the part |
| `edge` | `keep` `square` `cut` `soft` | how the part's radius tokens map |
| `ornament` | `none` `strip` `emblem` | a decorative piece after a heading or before items |
| `density` | `keep` `compact` `airy` | the part's spacing step |
| `marker` | `none` `emblem` `index` | a decorative mark before each item of a menu or list |
| `header` | `none` `tag` | a panel, popover or dialog gets the card's tag strip on top |
| `layout` | per part, below | the part's arrangement |

Layouts are named per part, so each one is designed once:
- `MEGAMENUPANEL`: `columns` (today), `tiles` (each link a small card), `list`
- `MENU`: `list`, `tiles`
- `TABS`: `pills`, `rail`, `underline`
- `CARD`: `plain`, `framed`, `ticket`
- `DIALOG`: `centered`, `sheet`

**Invariants Ark UI enforces for every rule** (a test checks each one):
1. **No reorder.** DOM order, roles, names and focus order never change. A layout reflows with CSS only, and moves no nodes.
2. **Decoration stays decoration.** Chrome nodes are `aria-hidden`, `inert` and `pointer-events: none`.
3. **Exact undo.** Removing a skin gives back the part exactly: the same HTML, attribute for attribute.
4. **No inline styles** on the skin's wrapper.
5. **Hit areas and focus rings stay.** A frame never covers a control's hit area or its focus ring.
6. **Fit.** A layout that would overflow its part's box at 1280x720 falls back to the part's default, and says so.

## 4. Who builds what

| Who | Builds |
| --- | --- |
| SDK theme owner | the token derivation (palette to the reference and secondary scales), the contrast gate |
| Ark UI owner | the rule interpreter in the styler and runtime, the per-part layouts, the invariant tests |
| NFT session (defxn-30) | card traits to a skin recipe: tokens, chrome and a rule set per card family. The engine applies it through Ark UI and still fires `defxn:skin` |
| defxn site (defxn-70) | `data-ark-part` keys on the navbar and the mega dropdown; a coverage page with every primitive, the navbar and the mega dropdown, shown as a guest and in sample skins; the world's repaint on `defxn:skin` |

## 4b. On the defxn site (built 2026-10-24)

- **Ark UI 0.2.20 and SDK 0.2.48** (uncommitted, owner-approved) carry the skin layer and `deriveSkinTokens`. The site bundles both as a lazy chunk, `js/ark/vendor/ark-kit-skin.js` (60 KB gzipped), loaded only when a skin is applied.
  - The SDK sync changed no theme: each of the site's 12 themes carries identical token values before and after.
- **Fixed on the real navbar (2026-10-24):**
  - Decoration is out of flow and never moves a part's content.
  - Each list item gets one marker at most.
  - Theme colours go only to Ark UI's runtime-drawn parts, never to hand-built site parts.
  - The fit fallback reverts a rule that overflows or grows its part.
  - A popover's panel takes the rules, never its wrapper.
  - `edge: cut` is a corner-shape bevel that clips nothing (the copper card had hidden the mega dropdown).
- **`js/ark/skin-site.js`** is the one entry. It loads the recipe and the chunk, names the site's parts (`js/ark/skin-parts.js`), and applies the skin on `#scene` with the site's locks and its own limits. It then fires `defxn:skin`, and the ring world repaints.
- **The site's own limits per part** (`DefxnSkinParts.ALLOW`):
  - The dense navbar and its mega dropdown take a frame and an edge, never tags, strips or list markers.
  - The mega dropdown's link chips are not lists.
  - Reading panels may carry more.
  This is the product's rule for its parts, on top of Ark UI's rule-to-part table.
- **The recipe's home** (owner, 2026-10-24): the recipe pieces the site needs move to `js/nft/`, one copy, with a small palettes-and-chrome bundle. The full card art and 3D stay in `docs/home-redesign/nft/` until the NFT design is approved. The site's loader accepts only `js/` paths.
- **Review entry:** `?skin-sample=27|263|512`. Record 009 is refused. Nothing is stored.
- **Contrast on the site's own backgrounds.** The product rule has two parts. Every text level meets 4.5:1 on `--canvas` and `--surface`, the same rule as `tests/theme-color-contrast.cjs`. It also meets 4.5:1 on the mega dropdown's backgrounds: the `--primary-100` glow, and `--reference-100` on a focused or hovered card.
  - Before the second part, the product labels read 4.43 to 4.47:1 under the three samples. That was measured on rendered pixels, at 1440x900.
  - After it, they read 5.12 to 5.26:1.
- **The header's popover swap carries no skin marks.** On the first press, the header swaps in Ark's popover button. That copy used to carry the skin's attributes, and removing the skin left them behind. `js/resolvers/header-popover.js` now skips `data-ark-part`, `data-ark-skin-*` and `data-defxn-part`. `tests/header-ark-parts.cjs` holds this.
- **The skin report.** Ark UI reports each part, the rules it kept, skipped or took back, and the tokens the contrast rules moved. The report comes from `getArkSkinReport(root)`, the bubbling `ark:skin-report` event and `result.report`. The site reads it with `DefxnSkinSite.report()`.
- **The CMS skin policy.** `DefxnSkinParts.policy(given, family)` lays content over the code's limits.
  - Its `allow` replaces a part's rule list. A card family's `allow` replaces both lists for that family's cards.
  - Its `contrast` rules are added to the site's own rules. A policy can raise the floor but never lower it.
  - `DefxnSkinSite.apply(record, { policy })` previews a draft policy. The CMS skin lab edits it and saves it as FLX.

## 4d. Every element on the site's blocks (built 2026-10-24)

The site's pages are built from Ark blocks, such as the hero, the tabs, the facts and the callout. Before this round, only card, button, list and popover took any element. Ark UI 0.2.20 now lets a skin's rules name block parts, and gives each part a kind.

| Kind | Block parts | Elements it takes | Where they sit |
| --- | --- | --- | --- |
| surface | `card` `stat` `alert` `figure-frame` `list-empty` `term-tip` `popover-panel` | all | frame around it, tag on top, strip on the bottom edge |
| panel | `disclosure-panel` `accordion-content` `tabs-content` | frame, edge, ornament | the same, with no tag |
| heading | `hero` `section-header` | ornament | the strip after the title, taking no room |
| rule | `hero-meta` `pager` `list-row` `tabs-list` `fact` | ornament | the divider piece on the part's rule line |
| list | `list-rows` | marker | one emblem before each row |

- **One table decides what the site wears.** `DefxnSkinParts.ALLOW` names each part and the elements it takes. A part it does not name wears nothing. The recipe's own part table no longer decides on the site. The CMS skin lab edits this table as content.
- **One spelling.** Block parts are named in upper case with no hyphen: `tabs-list` is `TABSLIST`, `section-header` is `SECTIONHEADER`. `DefxnSkinSite.ruleKey(name)` turns a reported part into that spelling, so the lab's switches reach Ark UI's block parts.
- **A decoration never covers content.** Ark UI takes back a tag, strip, emblem or divider that would cover text or a control, and a full frame falls back to its corners. Each one shows as `reverted` in the report, with its reason, so the CMS skin lab shows it as a break. A tag stays on its part's top edge, and a piece's words are never stretched. This fixed three breaks:
  - the tag on callouts covered the tab strip on `/account`, and its words were stretched
  - the frame line on figures ran through the figure's label
  - the frame on tab panels crossed text and a button. Tab panels still take only an edge on this site.
- **The check follows changes.** A decorated part is checked again when its size changes, for example when a menu opens or a title wraps. On card 512 the page menu's full frame ran through its text once it opened; it now falls back to corners. Frames, corners and notches stay inside their part. A title's strip hangs from the title's last line, starting at its left edge.
- **Checked:** across all 50 component pages and the navbar, under the 3 samples, skins cause no contrast, overflow, focus, undo or idle-frame finding. The calendar's grid overflows with no skin too.

## 4e. The card's art around the page (built 2026-10-24)

The skin used the card's palette and its 6 chrome pieces. The card's 5 art layers (backdrop, aura, mark, signal, particles) now dress the page too. The NFT session's engine draws them (`js/nft/scene.js`, `DefxnScene`), never the ring kit.

- **The world:** the card's backdrop, aura, signal and particles, painted once per size as a still image, behind the page.
  - **It never covers the 3D grid.** The owner, the same day: "when adding the NFT background and elements, do not alter our core 3D illustrations of the grid." So it shows only on a page where the ring world is off (no WebGL, `?world=off`). Where the ring world runs, it is not painted at all. This replaces an earlier request, passed on the same day, to show it on every route.
  - It stands in the ring world's box with a solid base in the page's colour. It opens by a clip once its art has painted, and leaves by the clip. Nothing fades and nothing cuts.
  - If it ever shows over the ring world, a click on a hidden ring opens nothing (`ArkWorldHost.covered`), and home's ring labels wait under it.
- **The avatar:** the card's art cut square, in the account button's icon place. The button keeps its words and its name.
- **One loader:** `DefxnSkinSite.art()` loads the NFT engine for both the profile card and the scene. It waits on the ring world's own three.js tag, so the page holds one copy.
- **Measured** (1280x720, sample 263, on `/about`, `/` and `/intro`): the world shows once drawn and the avatar is 22x22 px. There are no idle frames once the arrival settles. Removing the skin leaves no layer, no avatar and no attribute, and logs no error.

## 4c. The card on the profile (built 2026-10-24)

- **Where:** `/account`, in the left column, in the slot of the "How it fits together" picture. It sits beside one line saying it is a sample and one switch: "Wear this card's look" or "Use the site's look". The card is `min(360px, 40vh)` wide, so the column keeps the picture's height at 1280x720. On a phone the card is full width.
- **When:** only for a review sample in the address (`?skin-sample=27|263|512`), because no card is linked to an FXN ID yet. With no sample, nothing shows and nothing loads.
- **Who draws what:**
  - The NFT session's renderer draws the card (`js/nft/card.js`, `DefxnCard.mount`).
  - `js/ark/profile-card.js` loads it in the NFT session's order. It shares three.js and the mark with the ring world: a tag the world is already loading is waited for, never loaded twice.
  - The card's sheet, `css/nft-card.css`, is linked only when a card shows (`ArkUI.loadSheet`). `scripts/page-styles.mjs` leaves a sheet linked that way out of every route list.
- **Leaving the page:** `page.arkDispose` closes the card. Its unmount frees the shared WebGL renderer, and the page stops listening to `defxn:skin`.

## 5. Coverage

One page renders every Ark UI helper in `PRIMITIVES.md`, plus the style-schema roles (Badge, Kbd, Switch, Skeleton), the defxn navbar and its mega dropdown. It shows each in the guest look and in at least three sample skins. For each one it checks:
- contrast
- overflow at 1280x720 and 1440x900
- focus order unchanged
- the exact undo
- no idle animation frames

A primitive missing from the page fails the check, so coverage cannot quietly shrink.

## Rules come from what a card wears

The NFT session's answer, agreed:
- A card's rules come from the elements it wears, never from its rarity tier. A rare card must not make a menu harder to use.
- The rules are derived by measuring each element's drawing, never authored:
  - `frame` follows continuous edges, corner marks or a tab
  - `edge` follows the corner geometry
  - `marker` is set when an emblem is worn
  - `ornament` is set when an ornament is worn
  - `header` is set when the tag fits a strip
- **Families** are the 12 matched sets: Arcade, Asterism, Bamboo, Brace, Cog, Foundry, Guilloche, Meander, Origami, Quadrant, Tide and Truss. Only a card that wears a whole set may carry `layout` and `density` rules.
- The owner's review file (`nft/layers/review.flx`) keeps held elements and clashing pairs out of every recipe.

## Open questions for the owner

1. **First version:** a skin changes only `frame`, `edge`, `ornament`, `marker` and `header`. `layout` and `density` stay `keep` until you review the whole sets on the coverage page. Agreed?
2. **Real cards:** decided by the owner, 2026-10-24. A real card is a `KASSET1` object:
   - its id is the mint record's CID;
   - its owner G is the identity's key;
   - its pointer C[1] is the card record's content address.
   There is no separate card kind and no second ownership model. `KASSET1` is still on the uncommitted branch caps-d, so nothing can be minted yet, and the site still wears samples only.
