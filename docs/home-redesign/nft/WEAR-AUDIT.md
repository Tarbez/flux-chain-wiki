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
| 1 | each card's own rules; interface inks | 10.0% | 9.6% | 64 of 123 |
| 2 | frames keep their edge ring; panel art from the card's 3D layers; grid look | 10.9% | 11.0% | 64 of 123 |
| 3 | the card's own arrival, in two beats | 10.5% | 10.2% | 60 of 123 |
| 4 | interface names; the claim check; nameplates name the wearer | 10.4% | 10.0% | 61 of 123 |

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
  cards got pill tabs). Every measure now resolves colours first. The audit's cover check first used boxes; it
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

