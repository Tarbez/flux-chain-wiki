# Category conflict audit

Written for: the owner, deciding which elements to hold or mark as clashing.
Measured 2026-10-27. The owner took all five proposals the same day ("go with your picks"). Section 7 says what was done.
This page lists every element that collided with another category.

## How it was measured

- **On the card:** every chrome element (473 of them, in 6 categories) was drawn alone in the place the card puts it, on a 1000 × 700 card, in 4-unit cells. Two elements from different categories conflict when their ink lands on the same cells (3 cells or more).
- **Stray ink:** ink outside an element's own place, inside another category's place.
- **Jobs:** shape and words read from each drawing. Examples are a frame that is only corners, or an ornament that prints record fields.
- **On a site:** Ark UI's own tables (`ARK_SKIN_FAMILY_RULES`, `ARK_SKIN_PART_EXTRA_RULES`) list which categories reach each part.
- **3D:** builders that two categories share.

The script is read-only. Its full output is the session's `clash-audit.json`.

## 1. Elements that draw over each other on the card: frame against corner

140 pairs, all of them a frame drawn over a corner. These are the only ink collisions on the card. No other two categories touch.

| Frame | Corners it draws over | Odds |
|---|---|---|
| Dot Hatch | 76 of 77 | 3 in 414 frames |
| Fine Bevel | 48 of 77 | 4 in 414 |
| Facet | 16 of 77 | 4 in 414 |

Two frames also draw well inside the card instead of in their 26-unit edge band: Asterism Frame (44 % of its ink) and Outer Bars (31 %).

**Proposal:** `layers/review-proposed.flx` holds the 140 clash records, in the review file's own grammar. To adopt them:
1. Rename the file to `layers/review.flx`, or merge it with the review page's file.
2. Run `node make-layers.mjs`.

No new card is then born with a clashing pair. The other choice is to hold the three frames.

## 2. Elements that do another category's job

**Frames that are only corners.** A card wearing one of these gets two sets of corners: the frame's, and the corner category's.

| Frame | Ink at the card's corners | Odds |
|---|---|---|
| Crop Marks | 95 % | 3 in 414 |
| Big Brackets | 100 % | 4 in 414 |
| Double L | 100 % | 3 in 414 |
| Chamfered | 100 % | 4 in 414 |

On a site the effect is smaller: every frame becomes corners except on the hero.

**Ornaments that print the card's record.** 24 of 69 ornaments print record fields, which is the tag's job. Examples:
- Fine Print prints 11 fields.
- DNA Matrix prints 34 DNA cells.
- Others include Autograph, Milestones, Ledger, Spec and Rails.

On a site, an ornament is the strip under a hero or section title. It still prints the card's words there (its identity, number or DNA). That is the same problem the nameplate had ("mira.fxn #27"), which is now fixed for nameplates only.

**Dividers that print words.** Serial Gate, Pin Span, Genesistab, Idstrip and ID Rule print record fields on what should be a plain line. The other 17 tall dividers only decorate the line, and are fine.

## 3. Words that name another category

12 tags and 9 ornaments print the name of the card's mark or palette. Examples: Grid Mark prints "MARK GLITCH", and Swatch and Palette Pill print the palette name. The mark and the palette are categories of their own. These words repeat them, and on a site they mean nothing to the reader.

## 4. Categories that dress the same part of a site

From Ark UI's tables, which decide what each part takes:

| Site part | Categories that both draw there | Result |
|---|---|---|
| Row lines (list row, fact, pager, tab strip) | divider and line (wear-only) | two drawings on one line |
| Buttons | corner (as the button's frame) and button (wear-only) | corners over a button outline |
| Menu and popover panels | corner and menu (wear-only) | corners over a menu outline |
| Cards and surfaces | corner and tag | the nameplate and the top-left corner sit on the same spot |

These conflicts come from the categories themselves, not from single elements, so a clash record cannot fix them. Each needs a rule. For example: a part that wears a worn outline takes no corners, and a row that wears a line takes no divider.

## 5. 3D builders shared by categories

The chain builder `s10-chain` is used by three categories:

| Category | Element | Odds |
|---|---|---|
| backdrop | Hex Chain | 3 in 358 |
| aura | Chain Loop | 4 in 377 |
| particles | Chain Arc | 3 in 218 |

A card can be born with the same chain drawn two or three times.

## 6. Not a conflict

- Every divider and every emblem sits inside the bottom-left corner's 120-unit box. No corner draws there today, because corners keep to the outer 20 units, as the layer rules ask. So this is not a collision now. A future corner that uses its whole box would collide with all of them.
- The tag "None" and the ornament "None" draw nothing, on purpose.

## What you decide

1. **Frame against corner (section 1):** adopt the 140 clash records, or hold Dot Hatch, Fine Bevel and Facet.
2. **The four corner-only frames:** hold them, or mark each as clashing with every corner.
3. **Card words on a site (sections 2 and 3):** have ornaments and dividers stop printing card words on a site, as the nameplate now does. This is a site rule, so the cards themselves keep their words.
4. **Shared site parts (section 4):** choose the rule for each of the four parts.
5. **The chain builder:** clash the three chain elements with each other, so a card gets at most one chain.

## 7. Decided and done (2026-10-27)

1. **Frame against corner:** the 140 clash records are in `layers/review.flx`, and `make-layers.mjs` has rebuilt the bundles. No new card is born with a frame and a corner that draw over each other, and no card can wear both.
2. **The four corner-only frames** (Crop Marks, Big Brackets, Double L, Chamfered) are held. No new card is born with one, and none can be worn.
3. **No card words on a site.** A drawn piece on a site carries no words except a nameplate's title and index, which Ark UI fills with the part's own header.
   - New recipes: `js/nft/skin-recipe.js` `chromeData`.
   - Held packages: `js/nft/skin-package.js` `toArkSkin` reads past their stored words and never rewrites them.
   - The card itself keeps its words.
4. **One drawing per edge** (Ark UI 0.2.46, `SKINS.md` "One drawing per edge"):
   - A part that wears a drawn button, badge or menu outline takes no frame or corners.
   - A row that wears a drawn line takes no divider.
   - A part that wears a nameplate has no top-left corner.
5. **The chain:** Hex Chain, Chain Loop and Chain Arc clash with each other, so a card is born with at most one chain.

**Checked in a browser** with the three sample cards on the Kit and on /about:
- No piece prints a card word.
- No top-left corner sits under a nameplate.
- Nameplates carry the section headers.
- None of the samples wears a held element.

**Not yet seen working:** the outline and line rules. No sample card wears a button, badge, menu or line drawing, so those two rules have not been seen on screen.

## 8. Round 2 (2026-10-27): what the owner asked, and the second audit

**Asked and done:**
- **Accent strips:** every strip now carries the card's data. 47 strips gained data. 7 that named the mark or palette now print identity data instead. Five drawings changed to make room: Packet Strip, Barcode, Pegs, Cluster and Ridge, worth a look by eye. "None" stays empty, as no strip. Moving the data strips to a new category was not done, because a new card category changes every card's DNA.
- **Buttons:** 30 new, in `layers/worn/01-button/kit-2026-10-27/`. 12 of them are family buttons ("Arcade Button" and so on).
- **Badges:** 30 new, in label shapes (tags, stamps, ribbons, seals, tickets), in `layers/worn/02-badge/kit-2026-10-27/`. They never use the action colour. Four old badges that copied buttons are held: Bracket, Double, Chip and Pill.
- **Popovers and dropdowns:** two new wear-only categories beside menu, with 30 drawings each (`layers/worn/07-popover`, `layers/worn/08-dropdown`). Ark UI 0.2.47 puts exactly one outline on each panel:
  - a menu wears the menu,
  - a floating panel or tooltip wears the popover,
  - the panel a select, combobox or dropdown menu opens wears the dropdown.

**The second audit found, and fixed:**
- Menu "Pointer" was a popover: a menu panel with a pointer nub. It is held.
- Dropdown "Plain", the common dropdown, looked exactly like menu "Plain". It now has a seam band at the top where it hangs from its trigger.

**The second audit confirms:**
- On the card, all 140 overlaps are covered by a clash or a hold.
- No corner-only frame is still in play.
- Every strip carries data.
- On the Kit and on /about, with all three sample cards, no drawn piece prints a card word, and nameplates carry the section headers.

**Still open:**
- **12 tags name the mark or palette.** Examples: Grid Mark, Swatch, Palette Pill, Mark Pill and Tint. So do the strips Traitblock and Fine Print, whose drawings are built around those words.
- **Dividers:** 5 print words (Serial Gate, Pin Span, Genesistab, Idstrip, ID Rule) and 47 do not. This is the same question the strips had: all with data, or none.
- **Facet** (frame) touches the card's serial number. **Asterism Frame** (a family frame) and **Outer Bars** draw deep inside the card, not in the edge band.
- **Button "Bevel" and badge "Stitched Label"** both use a double outline. They are kept: the sizes and inner lines differ.
- **23 palettes** have an identity or action colour within 8 degrees of a meaning colour. The worst cases:
  - an action colour that reads as danger: Ember, Bone, Reef, Slate;
  - an action colour that reads as the green "Minted" state: Mauve, Ultraviolet, Cherry;
  - Mint's identity colour is exactly the Minted green.

  A fix would be a meaning-distance rule in Ark UI: nudge a card colour away from a meaning colour, as the contrast rule already nudges lightness. Not done; it changes card colours.
- **3D:** the chain builder clash is recorded. The 3D-over-words measurement is in section 9.

## 9. Round 3 (2026-10-27): the owner's picks, and the final audit

**Done:**
- **No drawing names another category.** 12 tags and 2 strips that printed the mark or palette name now print the role, network, status or genesis number. Swatches, accent rings and pixel swatches stay as decoration.
- **Dividers are plain lines.** The 5 that printed words (Serial Gate, Pin Span, Genesistab, Idstrip, ID Rule) carry none now, and the gaps are closed. Data lives in the strips.
- **Frames keep to their band.** Facet and Outer Bars are held. Asterism Frame is redrawn: all of its ink now sits within 21 units of the edge, and it keeps its constellations.
- **Meaning distance** (Ark UI 0.2.48, `SKINS.md` "Meaning distance"):
  - A skin's identity and action colours keep 12 degrees of hue from the site's meaning colours. A colour too close turns away, with its whole ladder.
  - On DEFXN's ember theme this turns 15 role colours in 15 palettes, by 1 to 11 degrees.
  - Seen on /about: sample card 27's action colour and its ladder turned 5 degrees.

**The final audit:**

| Check | Result |
|---|---|
| Card: overlaps not covered by a clash or hold | 0 of 140 |
| Card: drawn pieces over the card's words | 0 |
| Card: frames outside their edge band | 0 |
| Card: drawings naming the mark or palette | 0 |
| Card: dividers with words | 0 |
| Card: strips without data | 0 |
| 3D: elements putting light on the card's words (314 measured, each alone with the mark) | 0 |
| 3D: elements with more than 15 % of their light in the text column | 0 |
| Site (/kit, /about, three cards): drawn pieces printing a card word | 0 |
| Site: top-left corners under a nameplate | 0 |
| Site: page errors | 0 |

The 3D result rests on the card's own design: the card fades its art out of the text column. Every element was detected, at a median of about 5,600 pixels.

The review file (`layers/review.flx`) now holds 11 elements and 143 clashing pairs.

**Not measured yet:**
- **The outline and line rules on screen.** No sample card wears a button, badge, menu, popover, dropdown or line drawing, so these have only been checked in code.
- **The new site drawings: 30 buttons, 30 badges, 30 popovers and 30 dropdowns.** Only button against badge, and menu against popover against dropdown, were compared. The rest have not been tried on real site parts. The skin gate (`skin-gate.js`) can do that once a sample card wears them.


## 10. Round 4 (2026-10-27): worn pieces on real pages, and section layouts per card

**Worn pieces, seen on screen.** A test card wore one piece from each wear-only category on /about and /palette: button, badge, menu, line, link, grid, popover and dropdown.
- Every category drew, except the dropdown. No dropdown was open on those pages.
- No part had a worn outline and a frame or corners together.
- No drawn piece printed a card word.
- The skin took back 1 to 4 pieces per page and said why. Examples: a line that would cover the tab strip's labels, and a button outline on an input that has no inside to draw in.

**Held pieces were still drawn. Fixed.** The recipe noted a held or clashing piece but still sent it to the site. Now `js/nft/skin-recipe.js` `recipe()` follows the review:
- A held worn piece is left off.
- In a clashing pair, the worn piece is left off.
- A birth slot that the skin changed to a held piece goes back to the element the card was born with.
- Each one gets a note, for example "Bracket (badge) is not drawn: the owner's review holds it."

**Section layouts per card** (Ark UI 0.2.49 to 0.2.54; `layoutsOf` in `js/nft/skin-recipe.js`).
- 18 page sections take a layout from the card's own pieces: hero, section header, card grid, stats, facts, list rows, steps, alert, figure, quote, pager, accordion, disclosure, table, lane, meter list, tab panel and card.
- Measured over cards 1 to 300:
  - 222 different layout sets. Using one measure per section gave 170.
  - Every section uses at least 2 of its values. The largest share of one value is 87%, for the dialog panel.
- Checked on /about, /palette and /works with the three sample cards: no overflow, nothing wider than its parent, no layout taken back, no page errors.

**Nameplate words** stop where the plate's drawing ends, and a title too long for the plate ends in "…" (owner's pick). Assistive technology still reads the full title.

## 11. Round 5 (2026-10-27): the four open items, closed

- **Dropdown piece, seen.** No DEFXN page opens a dropdown list today: the /deposits select is the browser's own, and its list cannot be drawn on. A test copy of /about gained a pick list (an Ark combobox popup) and a menu that a button opens. Each of the three test cards drew its own dropdown piece on both panels, with one exception. Cog Dropdown was taken back on the menu, because it would cover the menu's words, and the report says so.
- **Bug found and fixed.** The pick list wore nothing at first. Ark UI's list of part names (`arkSkinPartKeys`) left out the runtime parts that the worn table names, so no product could send them rules. Ark UI 0.2.56 lists them.
- **Phone width (390 px).** With three cards on /about and /palette, the page never scrolls sideways, no section sits outside the screen, and no nameplate passes the edge. Heroes fall back to one column.
- **Alert edge.** A `boxed` or `banner` alert under a full or ticket frame clears its own border, so the frame is the only edge (Ark UI 0.2.55).
- **Lopsided sections, spread.** Over cards 1 to 300, no section gives more than 63 % of cards the same look. Before: dialogs 87 %, popovers and lists 79 %, lanes 69 %, tab strips 64 %.
