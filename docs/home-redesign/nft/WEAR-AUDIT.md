# Why wears feel alike: 100 issues

Written for: the owner, the defxn site session (defxn-70) and the Ark UI owner. Status: 2026-10-24, by the NFT
session (defxn-30). Measured on the running site (`127.0.0.1:4640`) in headless Chrome at 1440x900, on `/`,
`/about`, `/palette`, `/account` and `/resolutions`, in the site's own look and under sample cards 27, 263 and 512.
Every card is a sample.

## The answer first

The owner's words: "most of the elements are not translated into the UI, and I do not feel the experience of changing
different wears. The idea is to transform content." The measurements agree. Six causes:

1. **Wears are alike.** Cards 27 and 512 bring the same rules to every page. A third of all cards share one structure, and every card gets the same marker.
2. **Little of the page is reached.** 8 to 11% of parts take a rule. The main reading panel, the headings and the footer never change.
3. **What changes is too small to see.** Pieces arrive at 72x16 px with 9 px words, in inks of 7.5 to 42% white on near-black.
4. **The art never reaches the site.** Background, glow, light and particles have no way onto a page, because the card world shows only where the ring world is off. That is 318 of 831 elements.
5. **Content does not transform.** Layout, density, type voice, images, numbers and icons stay the site's in every wear.
6. **Changing a wear has no moment.** The switch is a cut with nothing moving, it is reachable from one page, and a reload drops it.

| Measured | Result |
| --- | --- |
| Screen changed by wearing a card (5 pages, 1440x900) | 0.5 to 2%, and 5.5% on /account |
| Screen changed by switching between two cards | 0.5 to 2.1% |
| Parts that take any rule, per page | 7 to 23 of 89 to 203 |
| Cards whose marker is the icon (600 cards) | 600 of 600 |
| Cards that share the most common rule set | 34% |
| Born cards that may get a layout or a density | 0 of 600 |
| Animations while a wear goes on | 0, over 320 to 600 ms |
| Elements with no visible effect on a site page | 318 of 831 |

## Fix first

These ten change the most of what a visitor sees and feels:

- **A2.** Every card gets the same list marker. Derive the marker from the icon's shape: a count, an icon, or none.
- **A5.** No born card ever gets a layout or a density. Derive layout and density for every card from its traits, not only for full sets.
- **B4.** The page's main panel never changes. Make the page panel a skinned surface: frame, edge and a background pattern (D7).
- **C1.** The ornament strip is 72x16 px. Draw pieces at a UI scale with a minimum size per piece.
- **D7.** No 2D translation of the art exists. Map each background element to a generator and its settings, derived from the element, never by hand.
- **E1.** Content keeps its arrangement. Per-part layouts, reviewed once by the owner (B5).
- **E3.** Headings keep their voice. A type-voice rule from a closed set: which slot headings use, their case, their tracking.
- **F1.** The switch is a cut. One arrival timeline: pieces draw on, colours move, and it ends in under a second.
- **F3.** Wearing is reachable only from /account and a review address. A wear control in the identity zone, on every page.
- **G1.** A drawing covers words on /account. Ark UI's cover check must include this piece and take it back.

## The 100 issues

### A. Every wear looks alike (12)

The rules a card brings barely differ from card to card.

- **A1. Cards 27 and 512 dress every page with exactly the same rules.** Evidence: Ark UI's report on 5 pages: same rule counts and values. Card 263 differs only by a cut corner instead of a soft one. Fix: Derive more rule axes per card (A2 to A6).
- **A2. Every card gets the same list marker.** (fix first) Evidence: 600 of 600 cards derive marker: emblem, because every icon element draws something. Fix: Derive the marker from the icon's shape: a count, an icon, or none.
- **A3. Three rules are almost constant.** Evidence: Over 600 cards: frame full 74%, ornament strip 87%, header tag 86%. Fix: Measure more classes from the drawings: double line, dashed, notched, glowing, heavy.
- **A4. One structure covers a third of all cards.** Evidence: The top rule set covers 34% of 600 cards. The top two cover 48%. Fix: Widen the closed sets, and add axes that are derived from other layers.
- **A5. No born card ever gets a layout or a density.** (fix first) Evidence: 0 of 600 cards wear a whole set, and only a whole set may carry layout and density. Fix: Derive layout and density for every card from its traits, not only for full sets.
- **A6. Only 4 of 12 layers shape the structure.** Evidence: Rules come from frame, ornament, icon and tag. The other eight layers, from palette to divider, shape nothing. Fix: Map each layer to one axis: background to layout, particles to density, light to motion, corner to edge.
- **A7. The edge is the only rule that varies, and it shows as 2 to 4 px.** Evidence: Card 263 against 512: a cut corner instead of a soft one on buttons and panels. Fix: Give each edge value a scale per part kind, so a cut or a notch reads at a glance.
- **A8. A Legendary card and a Common card dress a site the same way.** Evidence: Rules never come from rarity (by design), and nothing else marks rarity on the site. Fix: Show rarity as content: a rarity badge in the identity zone, never as rules.
- **A9. Page backgrounds look the same for every card.** Evidence: Surface tokens keep saturation at 6.6 to 7.2% and lightness at 3.6 to 8.4%: near-black for all. Fix: Let surfaces take more of the card's hue, inside the contrast gate.
- **A10. Text and border colours never change.** Evidence: --text stays 0 0% 80% and --border-default stays white at 16% for every card. Fix: Tint muted text and borders with the card's hue, held by the contrast gate.
- **A11. A worn variant changes only accent colours.** Evidence: A Copper skin on card 263 changes the buttons and links, and no shape. Fix: A worn element must change what its layer shapes (A6).
- **A12. A two-hue palette shows mostly one hue.** Evidence: Buttons take --complement and links take --role. Headings, tabs and rules take no card hue. Fix: Give the second hue a fixed role: headings' accent, the active tab, the rules.

### B. Most of the page never changes (15)

Wearing reaches a small part of each page.

- **B1. Wearing a card changes 0.5 to 2% of the screen.** Evidence: Pixel difference at 1440x900 on /, /about, /palette and /resolutions. /account reaches 5.5% because the profile card shows there. Fix: Set a floor: a wear must visibly change the page's main surfaces (B4, D7).
- **B2. Switching from one card to another changes 0.5 to 2.1% of the screen.** Evidence: Pixel difference between cards 27, 263 and 512 on 5 pages. Fix: Measure wear distinctness as a test (I5), and raise it with A2 to A6.
- **B3. Only 8 to 11% of parts take any rule.** Evidence: Ark UI's report: 7 to 23 parts with rules, out of 89 to 203 parts per page. Fix: Open more parts in the site's table (B5, B6).
- **B4. The page's main panel never changes.** (fix first) Evidence: The large reading panel on /about takes no frame, edge or background in any wear. Fix: Make the page panel a skinned surface: frame, edge and a background pattern (D7).
- **B5. Layout and density are off for every part.** Evidence: DefxnSkinParts.ALLOW grants no layout or density. Ark UI's layouts sit unused. Fix: Turn on reviewed layouts part by part, starting with the mega dropdown and tabs.
- **B6. 13 of 31 Ark parts take colours only.** Evidence: The gallery: eyebrow, steps, quote, meter, table, breadcrumb, term, field, status line, choice, lane, band, toggle group. Fix: Give each a role from its part kind: rules for tables, marks for steps, frames for fields.
- **B7. The navbar keeps the site's look.** Evidence: It takes frame and edge only. The visible change is one corner cut and the 22 px avatar. Fix: Give the navbar a card layout, a card frame and the identity zone (see the earlier plan).
- **B8. The Products dropdown barely changes.** Evidence: Under card 263: a copper top line, copper dots and one copper link. Its feature cards take no frame. Fix: Frame the feature cards, mark the groups with the card's icon, and allow its tiles layout.
- **B9. "Run DEFXN" keeps the site's teal in every wear.** Evidence: Screenshots of /about under 27, 263 and 512: the button is unchanged. Fix: Map the kit button to a skinned part, or document why it is locked.
- **B10. The footer never changes.** Evidence: Footer bar identical in all four looks. Fix: Give the footer a divider and the card's small marks.
- **B11. Headings keep their type in every wear.** Evidence: h1 to h3: same face, size, weight and case under every card. Fix: Add a type-voice rule (E3).
- **B12. Tabs change only their underline colour.** Evidence: /about tabs under 263 and 512. Fix: Allow Ark UI's tab layouts: pills, rail, underline.
- **B13. Numbers and data keep the site's style.** Evidence: Stats, meters and tables are unchanged on /about and /palette. Fix: Style numbers in the card's mono voice, with its divider between rows.
- **B14. Form fields take colours only.** Evidence: Fields and choices on /account and /palette: no frame, edge or focus shape. Fix: Give fields the card's edge and a frame on focus.
- **B15. Most skin pieces sit in closed menus.** Evidence: 82 icon markers are drawn at 0x0 inside menus that are not open. Fix: Spend the card's pieces on what is visible first.

### C. What changes is too small or too faint (12)

The card's drawings arrive at a size and an ink that disappear.

- **C1. The ornament strip is 72x16 px.** (fix first) Evidence: Measured on /palette under card 512. Its drawing reads as a dotted line. Fix: Draw pieces at a UI scale with a minimum size per piece.
- **C2. The tag's words are 9 px and unreadable.** Evidence: Measured text height on /about and /account. Fix: Set a minimum text size for chrome words, or drop words below it.
- **C3. Dividers are 104x20 px.** Evidence: Measured on /palette. Fix: Let a divider run the width of its part.
- **C4. Most chrome lines vanish on dark surfaces.** Evidence: Chrome inks are white at 42%, 16% and 7.5% (line, rule, faint) on near-black. Fix: Use stronger inks for UI chrome, held at 3:1 like a control's edge.
- **C5. Fine detail collapses at UI size.** Evidence: Pieces are drawn for a 1000-unit card and shrunk onto parts: dots and hatching merge. Fix: Give each piece a UI drawing, or a simplified level of detail.
- **C6. The avatar is 22 px.** Evidence: The account button's avatar: the card's logo art is not recognisable at that size. Fix: Use a larger identity zone, or a simplified avatar cut.
- **C7. Corners show only when a frame falls back.** Evidence: Corner pieces appear only for frame corners or bracket: 2 parts on /about. Fix: Give corners their own rule, starting with the page panel and the cards.
- **C8. The icon marker is taken back on list rows.** Evidence: Ark UI: "it grows the part's box". Fix: Reserve the marker's room in the list's own layout when a skin is on.
- **C9. Wide frames read as a thin outline.** Evidence: A full frame across 900 px or more: the signature middle shapes stay small. Fix: Scale the kept bands with the part's size.
- **C10. The card's accent is spent on hairlines.** Evidence: Only buttons carry a large area of card colour. Fix: Spend the accent on one large area per view: the active state or the page panel's edge.
- **C11. Nothing on the page says a card is worn.** Evidence: Only the 22 px avatar shows it. Fix: Show the wearing state in the identity zone: the card's name, set and a way back.
- **C12. The tag shows sample words that mean nothing on a site.** Evidence: "SAMPLE" and "PROTOCOL" on a sign-in notice. Fix: Fill the tag with the part's own label, or the wearer's name.

### D. Card elements never reach the interface (14)

Five of twelve layers have no way onto a site page.

- **D1. Backgrounds never show on the site.** Evidence: 89 elements. The card world shows only where the ring world is off. Fix: Translate each background into a 2D pattern for the page panel (D7).
- **D2. Glows never show.** Evidence: 93 elements. Fix: Translate a glow into the focus halo and the active state's light.
- **D3. Lights never show.** Evidence: 55 elements. Fix: Translate a light into a divider beam and the loading line.
- **D4. Particles never show.** Evidence: 48 elements. Fix: Translate particles into a still texture on surfaces.
- **D5. The logo art shows only in the avatar and the profile card.** Evidence: 33 elements. Fix: Use it as a watermark in the page panel's corner and as the seal.
- **D6. 38% of the shop has no visible effect on a site.** Evidence: 318 of 831 elements are art layers. Fix: Give each art layer a 2D translation before it is sold for sites.
- **D7. No 2D translation of the art exists.** (fix first) Evidence: The site already ships Ark background generators (contours, fabric, lattice, rift, tiles, typefield), unused by skins. Fix: Map each background element to a generator and its settings, derived from the element, never by hand.
- **D8. Corners show only on fallback frames.** Evidence: 77 elements. Fix: See C7.
- **D9. Dividers show only on separators.** Evidence: 52 elements. Few pages have separator parts. Fix: Draw the divider on every rule line a part already has.
- **D10. Tags show on one to three parts per page.** Evidence: 75 elements. Only alert, panel and modal headers take a tag. Fix: Use the tag as the page title's label and the identity zone's nameplate.
- **D11. Icons never become icons.** Evidence: 77 elements. They appear only as list markers. Fix: Use the icon for bullets, the seal, empty states and the pointer over non-text areas.
- **D12. The card's own fields never appear on the site.** Evidence: Name, number, DNA, network and joined date show only on the profile card. Fix: Show the wearer's fields in the identity zone.
- **D13. The card's type voice never reaches the site.** Evidence: The site keeps its three font slots, and the card brings no type rule. Fix: A type-voice rule inside the three slots (E3).
- **D14. The 12 sets have no site expression of their own.** Evidence: A set changes only the same five rules. Fix: Give each set a signature: a layout, a density and a motion together.

### E. Content does not transform (12)

The site's content keeps its arrangement and voice in every wear.

- **E1. Content keeps its arrangement.** (fix first) Evidence: Grids, lists and cards keep their layout for every card. Fix: Per-part layouts, reviewed once by the owner (B5).
- **E2. Content keeps its density.** Evidence: No compact or airy wear exists. Fix: Derive density from particles (A6).
- **E3. Headings keep their voice.** (fix first) Evidence: No case, tracking or weight role comes from the card. Fix: A type-voice rule from a closed set: which slot headings use, their case, their tracking.
- **E4. Images and figures keep the site's treatment.** Evidence: The illustration on /about is unchanged apart from one accent tile. Fix: Frame figures with the card's frame, and tint line art with the card's inks.
- **E5. Numbers keep the site's style.** Evidence: Stats and tables are unchanged. Fix: See B13.
- **E6. Icons keep the site's set.** Evidence: Navigation and action icons are unchanged. Fix: Let the card's icon replace decorative icons only, never action icons.
- **E7. Section markers keep the site's style.** Evidence: Eyebrows and section numbers are unchanged. Fix: Give eyebrows the card's tag shape and its mono voice.
- **E8. Empty, loading and error states keep the site's look.** Evidence: No skin rule reaches them. Fix: Use the card's icon and light in empty and loading states.
- **E9. Links and focus rings change colour only.** Evidence: Focus rings take --reference. Fix: Give focus the card's edge shape, at 3:1.
- **E10. Dialogs are rarely dressed.** Evidence: MODAL is allowed, but few dialogs open on the pages audited. Fix: Add a dialog to the gallery and to the coverage test.
- **E11. A wearer cannot add any element to a site.** Evidence: A skin decorates existing parts only, by Ark UI's design. Fix: Allow a few new elements from a closed set: a nameplate, a banner and a seal in the identity zone.
- **E12. Every part is dressed with the same weight.** Evidence: The hero and a footnote take the same rules. Fix: Give the hero and the page panel the strongest pieces, and small parts the lightest.

### F. The moment of changing a wear (10)

Putting on a card does not feel like an event.

- **F1. The switch is a cut.** (fix first) Evidence: 0 animations run when a wear goes on. It takes 320 to 600 ms with nothing moving. Fix: One arrival timeline: pieces draw on, colours move, and it ends in under a second.
- **F2. The demo's arrival sequence never reached the site.** Evidence: nft-engine.js has a boot step. skin-site.js has none. Fix: Port the arrival as a site timeline that ends, and skips under reduced motion.
- **F3. Wearing is reachable only from /account and a review address.** (fix first) Evidence: No wear control in the navbar or the account menu. Fix: A wear control in the identity zone, on every page.
- **F4. There is no wardrobe.** Evidence: A visitor cannot try a worn variant or compare cards on the page. Fix: A wardrobe sheet: try on, compare, keep.
- **F5. A reload drops the wear.** Evidence: Nothing is kept. Fix: Keep the choice in the identity (the earlier plan).
- **F6. There is no try-on preview.** Evidence: The only states are on and off. Fix: Preview on hover or press, then confirm.
- **F7. The site does not say what changed.** Evidence: No message after wearing. Fix: One status line: "Wearing card 263, Copper".
- **F8. The site does not greet the wearer.** Evidence: No nameplate, no presence. Fix: Show the wearer's name and card in the identity zone.
- **F9. What a visitor wears does not lead to the shop.** Evidence: No link from a worn piece to its shop item. Fix: Each worn piece in the wardrobe opens its shop item.
- **F10. A wear does not carry to other DEFXN sites.** Evidence: Nothing is held by the identity. Fix: The skin package held by the identity (the earlier plan).

### G. Defects seen on the site (8)

Each was seen in a screenshot at 1440x900.

- **G1. A drawing covers words on /account.** (fix first) Evidence: Under card 263 a large network drawing sits on the second line of the sign-in notice. Fix: Ark UI's cover check must include this piece and take it back.
- **G2. A clipped label pokes out of the notice's top edge on /account.** Evidence: A small box with cut text above the tag. Fix: Keep a piece's words inside its own box, or drop them.
- **G3. An ornament strip floats above the profile card.** Evidence: /account under 263: a strip attached to nothing. Fix: Attach the strip to a heading, or remove it.
- **G4. The tag overlaps the notice's corner with unreadable words.** Evidence: /about and /account. Fix: See C2 and C12.
- **G5. Card 512 draws a double border on the figure.** Evidence: The card's frame runs inside the panel's own border on /about. Fix: A framed part drops its own border, as on the card.
- **G6. A menu frame line crosses text under card 512.** Evidence: Reported by the site session. Ark UI is fixing it. Fix: Re-check covering when a popover opens.
- **G7. A notch is drawn outside the mega panel under card 263.** Evidence: Reported by the site session. Ark UI is fixing it. Fix: Clip pieces to their part.
- **G8. The hero strip is not tied to its title.** Evidence: Reported by the site session. Ark UI is fixing it. Fix: Anchor the strip to the title's baseline.

### H. Names do not travel (6)

The owner's ask: real interface names that work outside the card.

- **H1. Piece names are card words.** Evidence: tag, ornament, emblem, sigil, strip and rule mean little to a site, a game or an app. Fix: Rename to interface roles (the name map below).
- **H2. Art layer names do not say what they do.** Evidence: backdrop, aura, signal and mark. Fix: background, glow, light and logo.
- **H3. One piece has several names.** Evidence: The icon is emblem (slot), Sigil (element) and marker (Ark rule). The strip is ornament and Strip. The divider is divider and Rule. Fix: One name per piece, everywhere.
- **H4. Old names are written into records.** Evidence: The review file, skin text and pins use layer keys. Fix: Keep old names readable as aliases. Nothing written is rewritten.
- **H5. The table version hashes folder and element names.** Evidence: make-layers.mjs tableVersion: a rename would change every card's table version. Fix: Hash stable ids, kept through the alias table.
- **H6. File order sets the DNA.** Evidence: Elements are read in sorted file order, so renaming a file can move it and change DNAs. Fix: Never rename element files. Rename the vocabulary, not the files.

### I. Tools and process (8)

Nothing measured how a wear feels until this audit.

- **I1. No test measures how much a wear changes a page.** Evidence: This audit's pixel difference was done by hand. Fix: A wear test with a floor per page.
- **I2. The Skin lab offers only 3 samples.** Evidence: The owner cannot try a born card or a worn variant there. Fix: Let the lab take any genesis number and any worn variant.
- **I3. The review page judges elements on the card only.** Evidence: Elements are never seen on site parts before they are kept. Fix: Add a site view to the review page.
- **I4. The 3 review samples hide the problem.** Evidence: Two of them derive identical rules. Fix: Pick review samples by rule distinctness, not by number.
- **I5. No metric for wear distinctness.** Evidence: No number says how different two cards make a page. Fix: Measure pairwise pixel difference over a set of cards and pages.
- **I6. The cover check runs only at apply and late mount.** Evidence: Popovers and resizes are not re-checked. Fix: Re-check on open and on resize (Ark UI is fixing it).
- **I7. The gallery shows parts at two thirds of their size.** Evidence: primitives.html zooms tiles to fit a group in view. Fix: Add a full-size view per part, side by side across wears.
- **I8. The owner cannot see what a card could add to a part.** Evidence: The Skin lab lists rules, not pictures. Fix: Show each candidate rule as a picture on the part, to approve or refuse.

### J. Real use (3)

Carried from the earlier audit.

- **J1. No real card exists.** Evidence: KASSET1 is on an uncommitted branch, so every wearer is a sample. Fix: Merge KASSET1 (the owner's call).
- **J2. The broker carries no card.** Evidence: It shares a public key and a display name only. Fix: Add the card to the broker's reply after the yes.
- **J3. There is no consent step for wearing.** Evidence: A review address applies a card without asking. Fix: One plain consent sheet before a site wears a card.

## Names for sites, games and apps

The owner's ask, relayed by the site session: "upgrade the NFT elements naming into real UI names that can be used in
websites, games and apps." A draft, sent to the site session before anything is renamed:

| Old name | New name | What it does | On a site | In a game | In an app |
| --- | --- | --- | --- | --- | --- |
| `palette` | `palette` | the colours every part reads | site theme tokens | team or player colours | app theme |
| `backdrop` | `background` | the scene behind content | a page panel pattern (2D), the world where 3D is off | skybox, level backdrop | wallpaper |
| `aura` | `glow` | light around what is in focus | focus halo, active state | selection glow | focus glow |
| `mark` | `logo` | the identity mark in the card's style | watermark, seal, avatar | emblem on gear | app icon art |
| `signal` | `light` | beams and flares | divider beam, loading line | VFX trails | progress light |
| `particles` | `particles` | small points of light | surface texture | particle effects | ambient texture |
| `corner` | `corner` | marks at a surface's corners | card and panel corners | HUD corner brackets | card corners |
| `frame` | `frame` | the outline around a surface | frames on panels and dialogs | window frames | card frames |
| `tag` | `badge` | a small labelled shape on a surface's top edge | section label, nameplate | nameplate, level badge | chip, label |
| `ornament` | `accent strip` | a decorative strip after a title or before items | under headings | title flourish | header accent |
| `divider` | `divider` | a rule between sections | section and row rules | HUD separators | list separators |
| `emblem` | `icon` | the card's own small symbol | list marker, bullet, seal, pointer | inventory icon | list icon |

How the rename stays safe:

- **Rename the vocabulary, never the files.** Element files keep their names, because their sorted order sets every card's
  DNA (H6). Display names come from the vocabulary.
- **Old names stay readable.** One alias table maps old layer keys and piece names to new ones. Records already written
  (review files, skin text, pins) resolve through it, and nothing written is rewritten (H4).
- **The table version hashes stable ids,** so a rename does not change any card's table version (H5).
- **One rename runs everywhere:** the recipe, Ark UI's piece and rule values (`tag` to `badge`, `ornament` to
  `accent strip`, `emblem` to `icon`), the Skin lab and the review file, with the old values accepted as aliases.

## How this was measured

- **Pixel difference:** two screenshots of the same page, counting pixels that differ by more than 24 in any channel.
- **Rules:** Ark UI's own report on each page (`DefxnSkinSite.report()`), and the recipe's rules for genesis numbers 1 to 600.
- **Sizes:** the bounding boxes of the skin's drawn pieces on the page.
- **The switch:** `DefxnSkinSite.apply()` timed, then the page's running animations counted.

## Fix loops

The owner's direction, 2026-10-24: fix, audit again, and repeat nine times, until nothing critical stands
between a card and a site that transforms, each card brings its own rules, and its 3D elements make a unique
experience. Each loop is measured by the same harness on the gallery (`primitives.html`, 123 parts, 1440x900):
screen change against the site's own look, distinctness between cards, parts with rules, cover defects (points
sampled along every drawn line, inside the letters of a line of text), and the arrival.

| Loop | Changed | Screen change (card rules) | Distinctness (card rules) | Parts with rules |
| --- | --- | --- | --- | --- |
| Before | the site's table only | 7.3% | 2.0% | 18 of 123 |
| 1 | each card's own rules, and interface inks | 10.0% | 9.6% | 64 of 123 |
| 2 | frames keep their edge ring. Panel art and a grid look come from the card's 3D layers | 10.9% | 11.0% | 64 of 123 |
| 3 | the card's own arrival, in two beats | 10.5% | 10.2% | 60 of 123 |
| 4 | interface names, the claim check, and nameplates that name the wearer | 10.4% | 10.0% | 61 of 123 |
| 5 | the skin package: one text any site can wear | 10.4% | 10.0% | 61 of 123 |
| 6 | the page takes the card: canvas, text, rules, raised light and heading voice | 12.0% | 14.8% | 62 of 123 |
| 7 | the wearer keeps a card: try, consent, seal, back on after a reload | 12.0% | 14.8% | 62 of 123 |
| 8 | type from the card's nameplate, icon and edge, and the real pages swept | 12.2% | 14.8% | 62 of 123 |
| 9 | the final audit: the site's wear checked end to end, every issue placed | 12.1% | 14.9% | 62 of 123 |
| 10 | the goal's missing parts: the wearer's bar, the site check, card slots, the studio | 12.1% | 14.9% | 62 of 123 |
| 11 | reach into other products, and lighter small parts | 12.4% | 15.1% | 62 of 123 |
| 12 | the owner's choice live: the card's own rules on the real site | 12.4% | 15.1% | 62 of 123 |
| 13 | Ark UI 0.2.22 and the Card slot verified, and phone widths swept | 12.3% | 15.0% | 62 of 123 |

### Loop 1: each card brings its own rules

- **Fixed A2, A3, A4, A5, A6.** The recipe now measures more of each card's own drawings: the frame's inner
  margin, the icon's ink, the divider's pattern and the strip's repetition. From them it derives `density` (airy,
  keep, compact), a marker (icon or count), and a layout per part (`recipe.layouts`: cards, dialogs, tabs, menus).
  The cut points are the thirds of every element's measure, so no class takes almost every card. Over 600 cards:
  235 distinct rule sets (39 before); the most common covers 6% (34% before).
- **Fixed C4.** Chrome inks for an interface: the main line in the card's light at 86%, the rule and the faint
  line in white at 34% and 18% (42%, 16% and 7.5% before, which vanished on near-black).
- **New:** `DefxnSkin.arkSkin(recipe, { keys })` sends the whole rule set to every part, and Ark UI's kind table
  decides what each part takes. The gallery's "Card's own rules" switch shows it beside the site's table.
- **Found:** colours in raw drawings did not resolve inside an image, so dividers measured as broken (573 of 600
  cards got pill tabs). Every measure now resolves colours first. The audit's cover check first used boxes. It
  now samples drawn lines like Ark UI.

### Loop 2: the 3D elements enter the interface

- **Fixed G1 at its cause.** Card frames draw in their middle (the art's place). Over an interface part that
  middle was the part's words. A frame sent to a site now keeps only its 120-unit edge ring: shapes wholly inside
  it are dropped as geometry, because Ark UI's sanitizer strips clip paths. 471 of 471 pieces still pass the
  sanitizer, and no frame is emptied. Ark UI 0.2.20 now also draws corners instead of a full frame on a part
  with its own border (G5). Cover defects on the site's path: 0.
- **Fixed D1, D7 in part.** `DefxnScene.panel(host, record)`: the card's background, glow, beam and particles,
  painted once behind one panel (a page header, a hero, a profile), never over the ring world.
- **New for the ring world:** a census of what every 3D element builds (`make-census.mjs`, `layers/census.flx`,
  318 of 318 counted) and `DefxnGridLook.derive` (`js/nft/grid-look.js`), returned as `recipe.gridLook`, by the
  owner's new direction (`docs/home-redesign/GRID-LOOK.md`). 8 of 8 regression cases pass
  (`grid-look.test.mjs`).

### Loop 3: the moment of wearing

- **Fixed F1, F2.** `js/nft/timeline.js`: a timeline grammar (DFXNTL1) with closed targets, properties and
  easings, and a player on the browser's own animation engine. Each card derives its own arrival from its beam,
  particles and glow census and its edge rule: rise, pop or scan, a 20 to 70 ms stagger, a 420 to 780 ms art
  beat. It ends within 1.2 s, never fades, plays nothing under reduced motion, and leaves nothing behind
  (measured: 24 to 26 pieces animated, 0 inline styles left, 0 idle frames).
- **Found, critical:** putting a card on freezes the page. Ark UI's apply costs about 45 to 50 ms of main thread
  per dressed part (0.5 s on the site's table, 1.8 s for 38 parts under the card's own rules), and the 3D art
  load runs during the arrival. Sent to the site session for Ark UI: batch layout reads, time-slice the apply,
  dress visible parts first. The order that keeps the moment smooth is two beats: the pieces arrive, then the art
  loads and draws in. On the gallery the art beat now runs as designed (460 to 724 ms).

### Loop 4: names and claims

- **Fixed H1, H2, H3.** The interface names are live. Ark UI's pieces are frame, corner, nameplate, accent-strip,
  divider and icon, and the recipe now sends those names and rule values (icon, nameplate). `traits.js` names
  each layer by its interface name (`UI_NAMES`, `uiName`, `layerKeyOf`), and skin text or pins written with
  either name resolve. Records keep their keys, and no element file is renamed: DNA and card keys are identical
  to the backup for 3,000 cards.
- **New:** `js/nft/vocabulary.js`, the owner's eight groups of interface elements with the claim each makes,
  and each card piece with the elements it may dress and the claim it keeps.
- **New check, kept on every wear:** a skin changes no word, no value of a field, progress bar or meter, no
  meaning colour and nothing that takes focus, and every drawn piece is hidden from assistive technology and lets
  clicks through. All six looks keep every claim.
- **Fixed C12.** On a site the nameplate names its wearer: the card's name and number, not a sample's status and
  role.
- **Found and fixed:** under the card's own rules Ark UI put frames and corners inside inputs, where they never
  render. A part whose elements cannot hold children now gets only an edge (reported to Ark UI).
- **Found and fixed:** the timeline player kept one list for the whole page, so the site's own arrival cancelled
  the art's. It now keeps a list per root. Both beats run whole: the art beat 473 to 716 ms, 0 cancelled.
- **Still open:** the pieces' beat takes about 3 s, because Ark UI's apply freezes the page (loop 3).

### Loop 5: a skin any site can wear

- **Fixed F10 in part.** `js/nft/skin-package.js` writes a worn card's whole skin as one text of FLX records. It
  holds the colours, the drawn pieces, the rules, the layouts, the locks, the grid look and the arrival. A site
  needs Ark UI's skin layer, `js/nft/timeline.js` and this file. It needs no NFT engine, no layer table and no 3D.
  Measured on a bare page with Ark UI's public examples: card 263 wears from its package, with 38 parts dressed,
  0 errors and no NFT global loaded.
- **Exact.** For cards 27, 263 and 512 the package decodes to the same skin as the recipe. Ark UI dresses the same
  parts with the same rules either way. A package is 15 to 31 KB, or 2.6 to 3.0 KB with gzip. Decoding encodes the
  result again and refuses a package that does not give back the same text. A moved line, upper-case hex and an
  unknown record are each refused.
- **One copy.** The recipe's `arkSkin` now calls the package's `toArkSkin`. The site's path and a worn package
  share one copy of how rules reach parts.
- **Not yet:** a package carries no signature, so a valid edit (another colour) still decodes. Until real cards
  exist (KASSET1, J1), a reader treats every package as an unsigned sample. A node can audit a package: it derives
  the package again from the card record and the layer table that the header names.
- **Found and fixed in the audit:** Ark UI cuts a frame into nine slices of one template. The cover check read the
  uncut template, so it counted lines that are never drawn. That gave 5 false covers under card 27's own rules in
  loops 2 to 4. The check now samples each slice, cropped to what the slice shows. A control line drawn through a
  heading is caught on all seven looks. Real covers: 0.
- **Still open:** the pieces' beat takes 3.2 to 5.0 s, run to run (Ark UI's apply, loop 3).

### Loop 6: the content takes the card

- **Fixed A9, A10, A12.** The canvas takes the card's light hue. The background layer's census sets how strong
  the hue is, and the glow layer's census sets how light the canvas is. Surfaces hold half that colour. Text and
  borders take the hue faintly. A two-hue palette gives its headings and its rules the accent. A grey palette
  stays grey. Over 299 cards the canvas takes 0 to 46% saturation (median 25%).
- **Fixed D2.** Menus, popovers and dialogs cast the glow's colour, as strongly as the glow layer builds.
- **Fixed E3, D13 and B11 in part.** The frame's line sets the headings' voice, in one of the site's three
  faces. The share of the edge ring that curves, measured over all 123 frames, splits them in thirds: a straight
  line gives mono, a mixed line gives sans, a curving line keeps the display face. Over 299 cards: 90 mono,
  107 sans, 102 keep. Card 263 turns the headings of the real /about page to IBM Plex Mono. Case, tracking and
  weight need Ark UI tokens (sent).
- **Contrast held.** All 299 cards pass Ark UI's contrast gate: 0 colours dropped, 0 adjusted. One palette
  (Blood) had two mid reds that no button text could read on. Its fills now move their lightness until white
  text reads at 4.6:1. Their hue stays.
- **Ark UI fixed the freeze from loop 3.** It now dresses the parts on screen first, in slices. The arrival
  started before most pieces existed (3 of 26 played). The player now follows Ark UI: each piece plays the
  moment it is added, at its place in the card's rhythm, inside the 1.2 s window. Measured: 18 to 32 pieces in
  0.5 to 0.9 s (3.2 to 5.0 s before), 0 inline styles left, 0 idle frames. The site's own player gets the same.
- **Found and fixed:** the gallery loaded `timeline.js` twice. The second copy started a second list of running
  plays. The file now loads once.
- Distinctness between cards on the site's own path: 1.8% before, 9.4% now.
- **Still open, sent to Ark UI:** tokens for heading case, tracking and weight, for the number face, for the
  eyebrow, and for the focus ring's shape (B13, E5, E7, E9).
  Ark UI accepted all seven names for 0.2.21. The recipe sends no values until it lands.

### Loop 7: the wearer keeps a card

- **Fixed F5, F6, C11, F8 and J3 on the card's side.** `js/nft/wear.js` (DefxnWear). A wearer tries a card
  first, and nothing is kept. To keep it, Ark UI's confirm asks, with the focus on "Not now". A kept card is one
  FLX text on this device, for this address only: a DFXNWEAR1 line, then the skin package. A reload puts it back
  with no NFT engine, measured at 85 to 129 ms for 40 parts on `wear.html`. The seal in the identity zone shows
  the card's icon, number and name, and how to take it off.
- **A seal against copies of the site.** Another address cannot read this storage, so a copy of the site cannot
  know which card a wearer keeps. The confirm says it once: "If a page that asks for your keys does not show your
  card, close it." It is a seal, not a proof. The site's own key (dense-wire) stays the proof.
- **Refusals tested.** A kept text that this site did not write is dropped, and so is one whose number is not its
  skin's card. Neither is worn. Blocked storage still lets a card go on for the visit, and the result says it
  was not kept (`kept: false`).
- **New page:** `docs/home-redesign/nft/wear.html`. It fits 1280x720 and 1440x900 with no scroll. Its reduction
  test is in NOTES.md.
- **Still open, with the site session:** the seal in the real header, `restore()` on every page, and
  `?skin-sample` as a try-on instead of a kept wear (F3). A kept card on other DEFXN family addresses needs the
  identity broker to carry the package (J2). The numbers above did not move, because the gallery does not keep
  a wear.

### Loop 8: type from the card, and the real pages

- **Fixed B13, E5, E7, E9 and more of B11.** Ark UI 0.2.21 added seven tokens a card can reach. The recipe sends
  each value from a measure of the card's own drawings. The nameplate's letter spacing becomes the eyebrows'
  spacing and sets the headings' spacing (thirds at 0.138 and 0.2 em over 75 nameplates). The icon's ink sets the
  headings' weight (500 below 0.106, 700 above 0.22, over 77 icons). Numbers take the mono face, as on every card
  face. The edge sets the focus ring's corner. Case is not sent, because 131 of 132 nameplate words are upper
  case, so no card decides it. Over 299 cards: weight 84 light, 81 bold, 134 kept. Tracking 44 tight, 41 open,
  214 kept. Ark UI's gate drops 0 tokens.
- **The site wired the wear (F3, C11).** On the site's request, `wear.js` now wears through the site's own
  path (`DefxnWear.use`), so a kept card follows the site's own rules for parts and colours. It also takes
  the site's confirm, ends a try without forgetting a kept card (`stopTrying`), and removes a seal that leaves.
  The package carries the card's set (`family`) for the site's per-set policy.
- **The five real pages, swept** (`/`, `/about`, `/palette`, `/account`, `/resolutions`, 1440x900, in the site's
  look and under cards 27, 263 and 512): 0 covers, 0 errors, 0 idle frames, 0 sideways scroll, 0 tokens dropped.
  Every word is kept. /account adds the worn card's profile card, and removes nothing. The longest task was
  617 ms. One first run showed a 2.2 s task on /about under card 27, which two more runs did not repeat. Its
  profile points at the 3D art drawn in software (headless Chrome, no GPU).
- **Found and fixed in the sweep:** a corner seemed to cross the footer's words on /resolutions. The card was
  clipped by its scroll box, so that part is never drawn. The check now skips points a clipping box cuts, and
  words in a fixed layer the piece is not part of.
- **Found, not fixable by the card:** on the real site the display face and the sans face are both Albert Sans,
  so the "sans" voice changes nothing there. Mono changes a third of cards. Weight and tracking now separate
  the rest.
- **Still the limit on the real pages:** the site's table dresses 7 to 23 parts of 89 to 203. Screen change is
  1.4 to 1.7% on /, /about and /palette, 3.2% on /resolutions and 6.4% on /account. The card's own rules dress
  61 of 123 parts on the gallery with 0 covers and every claim kept. Opening them on the site is the owner's
  decision (B3, B5).

### Loop 9: the final audit

- **The site's wear works end to end** (checked on the real site at 1440x900). `/account?skin-sample=263` tries
  the card and keeps nothing. "Wear it" asks first, with the focus on "Not now". After a yes, a reload of `/`,
  `/about` and `/palette` puts card 263 back on with no NFT engine: the header shows its seal, the headings turn
  mono. "Take off" forgets it, and then a page loads no wear code at all. 0 errors.
- **Found and fixed:** the site now tries a sample as a package, so the gallery could no longer read a recipe
  from the site and stopped applying the card's own rules. The gallery now makes the sample's recipe itself. The
  claim check now skips the seal, which is the identity zone and adds the wearer's number and name by design.
- **Every check, last run:** the gallery's own-rules wear changes 12.1% of the screen and differs 14.9% between
  cards (7.3% and 2.0% before the loops). 0 covers, every claim kept, 18 to 32 pieces arrive in 0.5 to 1.1 s,
  nothing moves under reduced motion. 9 of 9 design pages load with 0 errors. 471 of 471 drawings pass Ark UI's
  sanitizer. 8 of 8 grid cases pass. 299 of 299 cards pass the contrast gate. The package decodes exactly for all
  three samples. The vocabulary test passes.
- **The owner's page:** `docs/home-redesign/nft/wear-loops.html` (local) has the answer first, the numbers, the
  one decision, and every issue below with its status.
- **The one decision left:** the site's table dresses 7 to 23 parts per page. The card's own rules dress 62 of
  123 on the gallery, safely. Letting them dress the site decides B1, B3, B5, B6, D9, D10, E1 and E2.

### Loop 10: the parts of the goal that were still missing

After loop 9 the owner's goal still had four parts with nothing built: the navbar as the wearer's bar, a site check
against copied sites, new elements made from the card, and timelines in the CMS studio. Each is now built in
`js/nft/`, to a contract agreed with the site session (2026-10-24), and checked in a browser.

- **The wearer's bar** (`js/nft/user-navbar.js`). The bar keeps the site's brand and links. It gains one control,
  the wearer's seal, which opens the wearer's menu: the card that is on, the site check, and the actions (Wear it,
  Stop trying, Take off). The menu is the header's own lazy Ark UI popover. Phones show the icon only. While a card
  is on, the bar carries the card's strong border line, never the site's action colour.
- **The site check** (`js/nft/site-check.js`). It shows what the gateway's `resolveName` returns: the one shared
  verifier, run in the wearer's browser, with no trust in a node, no store and no name rule of its own. It is a
  row of the wearer's menu. Through the real gateway code it reads "Check not set up" today and names what is
  missing: the chain's genesis key (`gateway/name-config.js`). It never judges a page's words. Every verified
  result says that it proves who owns the name, not that the page is true. `npm run names:check` passes.
- **Card slots** (`js/nft/card-components.js`). A site author places a slot, not a card: a banner, a stamp or a
  nameplate. The card that is on fills it from its own pieces, and a visitor with no card sees nothing there.
  Words are real text in the site's faces. A slot is stored as FLX (`DFXNCOMP1`, then `DFXNTL1` for its motion).
- **The studio** (`js/nft/timeline-editor.js`, `docs/home-redesign/nft/studio.html`). A timeline editor with only
  the grammar's closed values and a live check: a track that runs past 1.2 s is refused with its reason and is not
  handed on. The CMS Skin lab mounts it through the site session as `DefxnCardComponents.editor(host, { value,
  onChange })`: FLX in, FLX out, and no change reported on mount.
- **Agreed with the site session:** one control in the bar, the check as a menu row, the site's name from the
  product catalog (never written in code), `check()` and the popover passed in by the site, and the editor mounted
  in the Skin lab by its owner. The decision about the card's own rules on the real site is with the owner.
- **Not built, and why:** warnings about scam and propaganda sites need signed reports about a site. No dense-wire
  record kind carries them, and a second store would break the one-name-system law. The proposal: a dense-wire
  record in which a reviewer's key signs a report about a name and the record it reviewed, with a closed kind and
  an evidence address, read with the one shared verifier. Who may sign one is an access decision, as claims are
  today. The check shows such reports as signed facts, never as its own verdict.
- **Wired by the site and checked** (1440x900, 1280x720, 390x844, 0 errors): the wearer's menu on /about, a kept
  card on / and /palette after reloads with no NFT engine, and Take off. On the site's request, the site check lost
  its own name rule: the site passes the page's name from the names system, so there is one rule.

### Loop 11: other products, and lighter small parts

- **A card's colours already reach other products.** Measured by matching the `var(--…)` names in each product's
  source files against the tokens that samples 27, 263 and 512 send (25 in all, without the pieces' own inks).
  Nothing was run or changed. Dead Ark's articles and write sites read 11 of them, public-ark 12, ark-app 14, and
  the CR3TV desktop 11. They read the same SDK tokens as DEFXN (canvas, text, borders, the display face). So the skin
  package's tokens dress them as soon as they load it. Their drawn pieces need Ark UI parts, which only ark-app
  has (in 5 files). Carrying a kept card between addresses still needs the identity broker (J2) and real cards.
- **Fixed E12 in part.** Ark UI draws every nameplate at one fixed size: 230x32 px on real pages, so its words are
  9 px on every part (measured on /about and /account under card 263). The package now sends no nameplate to a
  part narrower than 346 px, the width at which the drawing's words read at 12 px. On the gallery, which shows
  parts at 68% and so applies the rule more strictly, 4 of 5 nameplates went. Covers stay 0 and every claim is
  kept. Sent to Ark UI: draw the nameplate at least 48 px tall (C2). A first message said 6 px, measured on the
  shrunk gallery. It was corrected the same day.
- **Signed site reports:** the genesis session reads dense-wire but does not own it, and no running session owns
  it. The record kind is the owner's call first, then a dense-wire session's work.
- **The claim check now skips the wearer's own zone** (the seal and its menu), as the one control a card adds
  by design. Every other word, value and control is still checked.
- **Fixed E4.** Figures take the card's frame corners, its edge and its icon marker, under the site's table and
  under the card's rules. The /about illustration's lines take the card's tint, because loop 6 tints the text
  tokens they use: grey in the site's look, warm under card 263, green under card 27 (measured colours).
- **Fixed I7.** The gallery has a Real size switch (`?size=real`), so parts can be judged as a page draws them.
- **A kept card can move between addresses (the card's side of J2).** `DefxnWear.accept(root, text)` takes a kept
  card's text from another address of the family. It refuses a copy this grammar did not write, then asks once
  with the same confirm, as every address does. Tested with two browsers that share no storage: a copy with a
  changed number was refused, and the real one was asked about and kept. The identity broker carrying the text
  is the site session's part.
- **Proposed to the site session:** hold the owner's open choices as CMS content, so no code waits on them. A
  Skin lab switch for the card's own rules (default off), a Card slot block in the Studio library that the owner
  places on any page, and the broker carrying a kept card.
- **Where the grid against fake sites belongs: the browser.** A page cannot warn on a fake site, because the fake
  site does not run our code. The FXN Browser (`flux/ark-browser`) already verifies names with DOM_PROOF and the
  shared verifier, and already carries the NFT engine, but its address bar shows neither. The design: show the name
  check in the browser's own chrome, worded by `DefxnSiteCheck.stateOf`, and the kept card only on a verified name.
  A fake page cannot draw there. The browser's owner deferred it (the owner asked for the rename and the install
  first), so it went to the site session for the owner's review.

### Loop 12: the owner's choices, live on the real site

- **The owner chose the card's own rules for the real site, and the site session built it.** The site's narrower
  table is retired. The CMS Skin lab can switch rules off. Swept on 8 real pages at 1440x900 (`/`, `/about`,
  `/palette`, `/account`, `/resolutions`, `/stats/now`, `/chain`, `/explore`), in the site's look and under cards
  27, 263 and 512: 25 to 84 parts per page take rules (7 to 23 before), 0 covers, 0 tokens dropped, 0 idle frames,
  0 sideways scroll. Every word is kept, except two expected changes: /account adds the worn card's profile card,
  and /explore's node timings differ on every load, with or without a card.
- **What a card changes on a real page now:** 1.1 to 11.5% of the screen (0.5 to 2% before the loops), and two
  cards differ by 3.2 to 9.5% (1.3 to 5.4%). Layouts reach cards, lists, menus and popovers. Card 27's density
  reaches 32 to 63 parts. The Products menu takes layout, frame, nameplate, strip and markers. Tabs take frames and
  strips, but no layout was applied on the pages measured, and the footer takes nothing.
- **The owner chose the card slot.** The site session is building a Card slot block for the Studio library. It
  uses `DefxnCardComponents.editor` and `fill` as they are. Carrying a kept card between addresses, and the
  browser's own site check, wait by the owner's choice (the check until the genesis key is pinned).
- **Fixed H5, H6.** `make-layers.mjs` records the DNA order in `layers/order.flx`, append only (FLX,
  `DFXNORDER1-F<hex folder>-N<hex name>`). A new element goes last in its layer, and a removed or renamed one is
  refused with its remedy. Tested on six cases, then seeded: all 831 elements, every generated file byte-identical,
  table `e196847c` unchanged. Before this, adding one file in the middle of the alphabet would have changed what
  every born card's DNA means.
- The status page is `docs/home-redesign/nft/wear-loops.html`.
- **Found, an Ark UI defect (B12):** Ark UI offers three tab layouts for `TABSLIST`, but files `tabs-list` as a
  rule part, and rule parts refuse layout. So no tab layout can apply, although each card derives one (27 pills,
  263 underline, 512 rail). Reported with the measurement.
- **Fixed I4.** The three review samples no longer share a rule set. Each pair differs in six of
  their measured values (edge, density, marker, heading voice and weight among them). Alerts take the card's pieces under its own rules, and error words keep their meaning
  colours (E8, in part).
- **Fixed B10.** The site session made the footer strip a part. Under card 263 it takes the card's cut edge and
  frame corners (checked on /about).
- **G3 and G4, checked by eye** on /account under card 263. The nameplate sits on the notice's top edge as
  designed (G4), and only its small words remain. The hero's accent strip still sits at the hero's bottom, 86 px
  below its title and just above the profile card, so it reads as a divider (G3, open, reported to Ark UI).
- **Ark UI 0.2.22 is in progress** with the tab layout (B12) and the larger nameplate (C2). When it lands, the
  package's own 346 px nameplate rule goes, so that one check decides the fit: Ark UI's.
- **Found (E10): dialogs are never dressed by the card.** Opened under cards 263 and 27, on the gallery and on the
  real /about: Ark UI's confirm dialog, the wear consent included, keeps the site's own background and gets no
  pieces. The card's tokens and rules go on the page's skinned element, and the dialog mounts on the body, outside
  it. Ark UI already dresses its portal containers, and this dialog does not use one. Reported, with the fix.

### Loop 13: Ark UI 0.2.22, the Card slot, and phone widths

- **The Card slot works end to end on the real site.** The site session built a Card slot block for the Studio
  library, with my slot editor as its field. Mounted through the site's own block builder, with no page or
  content changed: no card leaves it hidden and empty, a tried card 263 draws its banner (its name, "Card 263 ·
  Copper" and 3 pieces), a kept card draws it again after a reload with no NFT engine loaded, and Take off empties
  it. 0 errors.
- **Ark UI 0.2.22, verified.** Tabs take the card's layout (B12). A nameplate is drawn 48 px tall with 14 px words,
  or taken back where there is no room (C2, G4): readable or absent, never unreadable. On most pages measured none
  fits, so few show (D10). The hero's strip sits under its title (G3). Dialogs mount in Ark UI's portal and take
  the card's colours and pieces (E10). The package's own 346 px nameplate rule is gone, so one check decides the
  fit: Ark UI's.
- **Swept again:** 8 real pages at 1440x900 and 4 at 390x844, under cards 27, 263 and 512. 0 covers, every word
  kept (except the profile card on /account and the live node timings on /explore). The phone sweep first showed
  crossings that were measuring errors: words inside a closed panel, and a menu button's screen-reader label.
  Both checks now skip what nobody can see, and each fix was confirmed against the page itself.
- **Two faults, reported to the site session:** the footer strip's corner pieces catch clicks
  (`pointer-events: auto`), and the header button still says "Get DEFXN Grid" after the browser's rename to FXN
  Browser.
- **A flat page background from the card's art is ruled out (D4, D7).** Ark UI ships background generators, and
  the site's theme could use them. But the site never mounts one on the public site (`js/main.js`: the grid is the
  one background), and the owner chose never to change the grid's 3D. So the art reaches the page behind one
  panel only, as built in loop 2.
- **Correction (J1, and loop 10's report design).** Earlier entries and reports said KASSET1 waits to be merged.
  It is merged: `flux/defxn-defi-rs` main holds `flx-cap-object` (commit d9d474a, 2026-10-23); only its pending
  design note still says "uncommitted". What real cards still need is a browser reader and mint path for it in
  dense-wire's web client, then the site's wiring. And signed reports need no new record kind: dense-wire's
  attestations (`KATTEST1`, built 2026-10-20) already say "k keys of a named roster hold this word about this
  subject". A site report is that claim, with the site's name as the subject and a word such as phishing or scam.
  What it needs is the owner's roster of who may sign, and a browser reader with the shared verifier in
  `dense-wire/web`. The original issue text above is left as it was written.

### The vision, piece by piece

| Part of the goal | State | What exists | What it still needs |
| --- | --- | --- | --- |
| Click your identity to wear a card | Built and wired on the site | Try first, keep after a yes, and the card is back on every page after a reload, with no NFT engine. | Nothing |
| The site transforms and takes the card's elements | Built and live on the real site | Colours, type, rules, layouts, density, motion and art all come from the card's own layers. You chose the card's own rules: 25 to 84 parts per real page take them, with 0 covers. | Ark UI drawing nameplates larger (C2), and a tab layout. |
| New elements made from the card | Built and live | A Card slot block in the Studio library: you place it on any page, and the card that is on fills it with its banner, stamp or nameplate. Tested on the real site: no card shows nothing, a tried or kept card fills it. | Your placing slots on pages. |
| Timelines in the CMS studio | Built and live | The Card slot's field in the Studio library mounts the timeline editor: closed values, a live check, FLX in and out, one undo step per change. | Nothing |
| The navbar becomes the wearer's navbar | Built and wired on the site | One control in the bar, the seal, opens the wearer's menu: the card, the site check and the actions. The site's links stay. Checked from phone width to 1440 px. | Nothing |
| A seal against copied sites | Built and wired on the site | Only this address can show the card a wearer keeps here. | Nothing |
| Every page checked, fake ones too | Not built | The FXN Browser already verifies names with the shared verifier and carries the NFT engine. Only the browser can mark a fake page, because a fake page does not run our code. | The browser's address bar showing the name check (DefxnSiteCheck.stateOf is ready for it) and the kept card only on verified names. The browser's owner deferred it, and it waits for your review. |
| A self-certified grid of verified sites | Built and wired, waits on a key | The site check asks the gateway's resolveName, the one shared verifier, in the wearer's browser. It never trusts a node, and it has no name rule of its own. | The chain's genesis key in gateway/name-config.js. Until then it says "Check not set up". |
| Warnings about scam and propaganda sites | Not built, no new record needed | dense-wire already has signed attestations (KATTEST1, built 2026-10-20): k keys of a named roster hold a word, such as phishing or scam, about a subject, such as a site's name. The site check never judges content on its own. | Your roster of who may sign, and a browser reader for attestations with the shared verifier in dense-wire/web. No running session owns dense-wire. |
| One wear across DEFXN, DeArk and CR3TV | In part | A skin is one portable FLX text. Its colours already reach other products: Dead Ark's articles and write sites read 11 of its 25 tokens, public-ark 12, ark-app 14, CR3TV desktop 11. | Ark UI parts in those products for the drawn pieces, the identity broker carrying the kept card between addresses (J2, waiting by your choice), and a browser reader for KASSET1 objects, which are merged. |

### Where the 100 stand

67 fixed, 20 in part, 13 open. "Holds" names who has what is left: the NFT session, the site session, Ark UI, or the owner.

| Issue | Status | Holds | Where it stands |
| --- | --- | --- | --- |
| A1 | Fixed |  | Each card brings its own rules (loop 1). Distinctness between cards: 1.8% to 9.4% on the site's path. |
| A2 | Fixed |  | The marker comes from the icon's ink: icon or count (loop 1). |
| A3 | Fixed |  | Cut points at the thirds of every element's measure (loop 1). |
| A4 | Fixed |  | The most common rule set covers 6% of 600 cards, 34% before (loop 1). |
| A5 | Fixed |  | Every card's layouts and density now reach the real site (loop 12, the owner's choice: the card's own rules on the real site). Card 27's density reaches 32 to 63 parts per page. |
| A6 | Fixed |  | Nine layers now shape the page: background, glow, beam, particles, frame, nameplate, accent strip, divider and icon (loops 1, 3, 6, 8). |
| A7 | Fixed |  | Rules, colours, type and motion all vary by card now, not the edge alone. |
| A8 | Open | your decision | By design, rules never come from rarity. A rarity mark in the identity zone is the owner's call. |
| A9 | Fixed |  | The canvas takes the card's hue, as strongly as its background layer builds (loop 6). |
| A10 | Fixed |  | Text and borders take the hue faintly. All 299 cards pass Ark UI's contrast gate (loop 6). |
| A11 | Fixed |  | A worn variant changes the picks, and every value is derived from the picks (loop 6). |
| A12 | Fixed |  | A two-hue palette gives its headings and rules the accent (loop 6). |
| B1 | In part |  | A card now changes 1.1 to 11.5% of a real page, from 0.5 to 2% before (loop 12, the owner's choice: the card's own rules on the real site). Dark cards near the site's own colours change least (card 263 on /: 1.3%). |
| B2 | Fixed |  | Two cards now differ by 3.2 to 9.5% on the real pages, from 1.3 to 5.4% (loop 12, the owner's choice: the card's own rules on the real site). |
| B3 | Fixed |  | 25 to 84 parts per real page take rules, from 7 to 23 (loop 12, the owner's choice: the card's own rules on the real site). 0 covers, every word kept. |
| B4 | In part | site session | The card's art can sit behind one panel (DefxnScene.panel, loop 2), and the canvas takes the card's hue (loop 6). |
| B5 | Fixed |  | Layouts reach cards, lists, menus and popovers on the real pages, and density reaches parts (loop 12, the owner's choice: the card's own rules on the real site). |
| B6 | Fixed |  | Ark UI's kind table decides what each part takes, and the site's narrower table is retired (loop 12, the owner's choice: the card's own rules on the real site). |
| B7 | Fixed |  | The navbar takes the card's frame and edge and holds the wearer's zone (loops 10, 12). Ark UI has no navbar layout to send. |
| B8 | Fixed |  | The Products menu takes the card's layout, frame, nameplate, strip and markers (loop 12, the owner's choice: the card's own rules on the real site). |
| B9 | Open | site session | The kit button is the site's. |
| B10 | Fixed |  | The footer strip is a part now, and takes the card's edge and frame corners (built by the site session, checked on /about under card 263, loop 12). |
| B11 | Fixed |  | Headings take the card's voice, weight and tracking (loops 6, 8). Card 263 turns the real /about h1 to IBM Plex Mono. |
| B12 | Fixed |  | Tabs take the card's layout (pills, underline or rail), frame, edge and strip (Ark UI 0.2.22, verified in loop 13). |
| B13 | Fixed |  | Numbers take the mono face, as on every card face (loop 8, Ark UI 0.2.21). |
| B14 | In part |  | Fields take an edge only, never pieces that cannot render inside them (loop 4). |
| B15 | In part | Ark UI | Ark UI now dresses parts as they come near the screen (0.2.20 slices). Not re-measured in closed menus. |
| C1 | Open | Ark UI | Piece scale is Ark UI's. |
| C2 | Fixed |  | A nameplate is drawn 48 px tall, words 14 px, and is taken back where there is no room (Ark UI 0.2.22, verified in loop 13). Readable or absent, never unreadable. |
| C3 | Open | Ark UI | Divider length is Ark UI's. |
| C4 | Fixed |  | Inks for an interface: the card's light at 86%, white at 34% and 18% (loop 1). |
| C5 | Open | Ark UI | Fine detail at small sizes. |
| C6 | In part |  | The seal shows the card's icon and number at a readable size, and phones show the icon only (loops 7, 10). |
| C7 | Fixed |  | Ark UI 0.2.20 draws corners on parts with their own border. |
| C8 | Open | Ark UI | Ark UI takes the icon marker back on list rows. |
| C9 | In part |  | A frame keeps its 120-unit edge ring (loop 2), and Ark UI draws corners instead where a full frame would cover words. |
| C10 | In part |  | The accent now also colours the rules and the raised light (loop 6). |
| C11 | Fixed |  | The seal says a card is on, in the header and on /account (loop 7, wired by the site). |
| C12 | Fixed |  | The nameplate names the wearer: name and number (loop 4). |
| D1 | Fixed |  | The background layer sets the canvas (loop 6) and paints behind a panel (loop 2). |
| D2 | Fixed |  | The glow colours the raised parts' light and sets how light the page is (loop 6). |
| D3 | In part |  | The beam sets how pieces arrive: scan, pop or rise (loop 3). A loading line is not built. |
| D4 | In part | your decision | Particles set the arrival's stagger (loop 3). A still texture on surfaces would be a page background, which the site rules out (see D7). |
| D5 | Open | NFT session | The logo art shows in the avatar and the profile only. |
| D6 | Fixed |  | Every art layer now has an effect on a site page (loops 2, 3, 6). |
| D7 | In part | your decision | The art reaches a panel as a 3D still (loop 2). A flat page background is ruled out: the site keeps the grid as its one background (js/main.js), and the owner chose never to change the grid's 3D. |
| D8 | Fixed |  | See C7. |
| D9 | Open | your decision | Dividers go where the site's table allows. |
| D10 | In part |  | Nameplates now show only where they fit (Ark UI 0.2.22, verified in loop 13). On most pages measured, none fits, so few show. |
| D11 | In part |  | The icon marks the seal and the stamp (loops 7, 10). Empty states do not use it yet. |
| D12 | Fixed |  | The seal shows the wearer's number and name on every page (loop 7). |
| D13 | Fixed |  | Type voice inside the site's three faces (loops 6, 8). |
| D14 | In part | site session | The package carries the set (family) for the site's per-set policy (loop 8). |
| E1 | Fixed |  | Per-part layouts reach the real site (loop 12, the owner's choice: the card's own rules on the real site). |
| E2 | Fixed |  | Density reaches the real site for cards whose drawings call for it (loop 12, the owner's choice: the card's own rules on the real site). |
| E3 | Fixed |  | Heading voice, weight and tracking from the card (loops 6, 8). |
| E4 | Fixed |  | Figures take the card's frame corners, its edge and its icon marker, and the /about illustration's lines take the card's tint: grey in the site's look, warm under card 263, green under card 27 (measured, loop 11). |
| E5 | Fixed |  | See B13. |
| E6 | Open | your decision | Action icons never change, by the claim rule. Decorative icons are not mapped yet. |
| E7 | Fixed |  | Eyebrows take the nameplate's own letter spacing (loop 8). |
| E8 | In part |  | Under the card's own rules, alerts take its frame, edge, nameplate, strip and icon, and status lines its frame and edge. Error words keep the site's meaning colours. No empty or loading example exists to measure (loop 12). |
| E9 | Fixed |  | The focus ring's corner follows the card's edge (loop 8). |
| E10 | Fixed |  | Ark UI's dialogs mount in its portal and take the card's colours and pieces: the wear confirm shows a Copper-tinted panel and 2 pieces under card 263 (Ark UI 0.2.22, verified in loop 13). |
| E11 | Fixed |  | A site places card slots, and the card that is on fills them: banner, stamp and nameplate, plus the seal (loop 10). |
| E12 | In part |  | Ark UI draws each piece only where it fits and takes back the rest (0.2.22), so small parts carry fewer pieces. No rule yet gives the hero the strongest pieces on purpose. |
| F1 | Fixed |  | Each card arrives its own way, in 0.5 to 0.9 s, and follows Ark UI's slices (loops 3, 6). |
| F2 | Fixed |  | The site plays the card's arrival (wired by the site). |
| F3 | Fixed |  | The seal is in the header on every page. Checked after a reload on /, /about and /palette (loop 9). |
| F4 | In part | your decision | The wearer's menu tries and keeps cards (loop 10). Until real cards exist (J1), it offers the samples only. |
| F5 | Fixed |  | A kept card goes back on after a reload, with no NFT engine. Checked on the real site in loop 9. |
| F6 | Fixed |  | Try on first. Nothing is kept until the wearer says yes (loop 7). |
| F7 | Fixed |  | The wearer's menu says which card is on and whether this device keeps it (loop 10). |
| F8 | Fixed |  | The seal greets the wearer by number and name (loop 7). |
| F9 | Open | NFT session | No link from a worn piece to its shop item. |
| F10 | In part | site session | One portable FLX package (loop 5). A kept card's text can move to another address: DefxnWear.accept refuses a changed copy and asks once (loop 11, tested). The broker must carry it (J2). |
| G1 | Fixed |  | A frame keeps its edge ring only (loop 2). 0 covers on 5 real pages and the gallery. |
| G2 | Fixed |  | 0 covers on /account in the loop 8 sweep. |
| G3 | Fixed |  | The hero's strip sits under its title, not at the hero's bottom (Ark UI 0.2.22, verified in loop 13). |
| G4 | Fixed |  | The nameplate on the notice is drawn readable, or taken back for lack of room (Ark UI 0.2.22, verified in loop 13). |
| G5 | Fixed |  | Ark UI 0.2.20. |
| G6 | Fixed |  | Ark UI. |
| G7 | Fixed |  | Ark UI. |
| G8 | Fixed |  | Ark UI. |
| H1 | Fixed |  | Interface names (loop 4). |
| H2 | Fixed |  | Interface names (loop 4). |
| H3 | Fixed |  | One name per piece (loop 4). |
| H4 | Fixed |  | Records keep their keys, and either name resolves (loop 4). |
| H5 | Fixed |  | A renamed element no longer changes the table silently: layers/order.flx refuses it, and names the remedy (loop 12). |
| H6 | Fixed |  | The DNA order is recorded in layers/order.flx, append only. A new element goes last, and a removed one is refused (loop 12, tested). |
| I1 | Fixed |  | A harness measures each loop: how much a card changes, and what it must never break. |
| I2 | Open | site session | The site's skin lab offers 3 samples. |
| I3 | In part |  | The gallery shows every part under a card. The review page does not. |
| I4 | Fixed |  | The three review samples no longer share a rule set: each pair differs in six measured values (loop 12). |
| I5 | Fixed |  | Distinctness is measured every loop. |
| I6 | In part | Ark UI | Ark UI re-dresses parts on resize (0.2.20 slices). |
| I7 | Fixed |  | The gallery has a Real size switch: every part as a page draws it (loop 11). |
| I8 | Open | site session | The skin lab lists rules, not pictures. |
| J1 | In part | a dense-wire session | KASSET1 is merged: flux/defxn-defi-rs main, flx-cap-object, commit d9d474a (2026-10-23). Missing: a browser reader and mint path for it in dense-wire's web client (dense-wire/web), then the site's wiring. |
| J2 | Open | site session | The identity broker carries no card yet. |
| J3 | Fixed |  | Wearing asks first (loop 7). |
