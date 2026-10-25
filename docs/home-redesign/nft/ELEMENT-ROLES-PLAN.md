# Card elements: colour roles and the missing categories

Written for: the owner, and the session that builds new element categories.
Status: 2026-10-25, a plan. Nothing in sections 3 to 6 is built. Section 2 is built and not yet confirmed by eye.
Every card here is a sample. No real card exists yet.

## 1. The answer first

- A card dresses the site through Ark UI's parts. Ark UI already sorts every part into a kind: heading, surface,
  panel, wrapper, rule, list, control, link, divider, text (`design/ark-ui/ark-ui.skin.ts`, `BLOCK_FAMILIES`).
- Today six drawn categories reach those parts: corner, frame, tag, ornament, divider, emblem.
  Four part kinds get no drawing at all: control (buttons), badge, wrapper and panel (menus, popovers), and link.
- The plan: one new category for each part kind that has none. Every category is drawn in three roles
  (primary, complementary, referential). A category that shows data names the one kind of data it shows.

## 2. Built today (shape rules, waiting for the owner's eye)

- A full frame or a ticket frame goes on the hero only (`DefxnSkinParts.FRAMED = ['HERO']`). Every other part that
  asks for one takes corners. A surface (card, stat, alert, popover panel) carries no strip under it.
  Code: `js/ark/skin-parts.js` `shapeRules`, called from `js/ark/skin-site.js` (apply and preview).
- Ark UI 0.2.26: one corner per point. Where a part's corner and its container's corner overlap, the container keeps
  its corner. A full frame needs the room that four corners need, so the 8 px meter bars take no frame.
- The skin gate after these fixes: corners 0 of 77 break a part, frames 2 of 123 (both on `card-grid`).

## 3. Roles: every category in three colours

Built 2026-10-25 (the role format): a drawing may write `var(--primary)`, `var(--complementary)` and
`var(--referential)`. The one list of colour names is `INKS` in `js/nft/card-chrome.js`; the card fills
them from its palette, and a site maps them to its role tokens (`js/nft/skin-recipe.js` `ROLE_TOKENS`).
Old drawings keep `--acc` and `--acc2` with their exact colours. `layers/README.md` documents the names.
Found while checking it: Ark UI's part-kind table gives a heading no frame, so the hero takes none today.
With the hero-only rule in section 2, no part shows a full frame until Ark UI lets the hero take one.

The design laws 71 to 77 name three colour roles. Each one is a token the SDK derives from the card:

| Role | Token | Where it goes |
| --- | --- | --- |
| Primary | `--primary` and its ladder | Identity: the hero, headings, the card's own name |
| Complementary | `--secondary` and its ladder | The one dominant action in a view (law 73) |
| Referential | `--reference` and its ladder | Data that points at something: a name, an id, a link |

Before the role format, a drawing painted with eight chrome inks (`--w-ink`, `--w-acc`, `--w-line` and the rest,
`js/nft/skin-recipe.js` `CHROME_KEYS`). The change: a drawing names a ROLE for each stroke, not an ink.
Then one drawing renders in all three roles, and the site picks the role from the part it dresses.
The meaning tokens (`--trust`, `--drift`, `--danger` and the rest) stay locked: no role replaces them.

## 4. Data: each category shows one kind of data

Drawings already carry data: a `data-field` in the SVG is filled from the card's record
(`js/nft/card-chrome.js` `fieldOf`: name, number, identity, dna). The plan gives every field a data kind,
and lets a category accept only its kind:

| Data kind | Example | Category that shows it | Role |
| --- | --- | --- | --- |
| Referential | a name, an id, a CID, a key | Tag | Referential |
| Status | live, held, devnet | Badge | Meaning token (locked) |
| Count | a number, a share | Tag or Badge | Primary |
| Action | "Explore the network" | Button | Complementary |

So wherever the site shows referential data, it can use the worn tag's shape directly.

## 5. The missing categories

Each row is one part kind with no drawing today. The parts come from Ark UI's own table, so a new block part
arrives already sorted.

| New category | Ark UI part kind | Parts it dresses | Shape it draws |
| --- | --- | --- | --- |
| Button | control | button, tabs-trigger, accordion-trigger, popover-trigger | The button's outline and cut |
| Badge | badge (schema `BADGE`) | badge, status | A small closed shape around a word |
| Menu | wrapper, panel | popover, popover-panel, MEGAMENUPANEL | The panel's edge and its pointer |
| Line | rule | hero-meta, tabs-list, list-row, fact, pager | One stroke along one edge |
| Grid | surface groups | card-grid, stats, list-rows | The lines between items, drawn once |
| Link | link | LINK, nav links | The underline |

Popovers sit under Menu: both are a panel that opens from a trigger.
Line is separate from Divider: a divider stands between two blocks; a line belongs to one part's edge.
Grid draws the lines between cards ONCE, for the group, so cards in a grid never stack corners again.

## 6. Production order

1. Roles in the drawing format: a stroke names primary, complementary or referential. Existing drawings map their
   eight inks to roles once, by rule, and keep working. (Every later step needs this.)
2. Data kinds on `data-field`: referential, status, count, action.
3. New categories, one at a time, each through the same path: a `layers/NN-name/` folder, `make-layers.mjs`, the
   recipe, Ark UI's part table, then the skin gate on every element before the shop.
   Order: Button, Badge, Line, Menu (with popovers), Grid, Link.
4. Every new category gets its own gate measures where the old five do not reach (a button must keep its label
   readable and its hit area whole).

## 7. Decisions for the owner

0. Where a new category lives. A card's DNA is one element per layer, drawn in layer order
   (`js/nft/traits.js` `draw`). A new birth layer changes the mix of every genesis number and unpins the
   sample cards. The other way: a WEAR-ONLY category, outside the DNA, that a card has only when its owner
   buys or wears one (born cards show none). Button waits on this choice.

1. Is the hero the only framed part, or do section headers keep frames too?
2. Do the 3D categories (backdrop, aura, mark, signal, particles) also take roles, or only the drawn ones?
3. The first new category: Button (the most visible) or Badge (the smallest)?
