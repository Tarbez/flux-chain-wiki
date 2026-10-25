# Identity card pages: reduction test

These are the design laws' final reduction test (docs/PRODUCT-DESIGN-LAWS.md), answered for the three
review pages in this folder. They are review pages for the owner. Nothing on them is live.

## card.html: one card

1. **What is this page about?** One identity card, and the mix of layer elements it was made from.
2. **What is the one dominant action?** New card. It is the only filled button. PNG, 3D file, Rotate and Skin are outlined and yield to it.
3. **What does the user need to know right now?** The card itself, then which element each layer gave it.
4. **What can stay hidden?** The element files and their weights, which live on the elements page. The skin choices stay in a drawer until Skin is pressed, and the turning view replaces the card only while Rotate is on.
5. **What is repeated elsewhere?** The layer names repeat the elements page's headings. That is on purpose: they are the same layers.
6. **What exists only because the data has it?** The card record (DFXNCARD1-...). It is shown once, in the mix line, because it is the card in one line: number, identity, layer table, the mix it was born with and the mix it wears.
7. **What can be removed without changing the decision?** Nothing more. The Download PNG button is the second action and is drawn as a plain outline.
8. **Does leaving preserve state?** Yes. The record and the worn skin are in the address, so a reload or a shared link shows the same card. A skin that is only previewed is dropped when the drawer closes.
9. **Does returning preserve context?** Yes, for the same reason. The next sample number is remembered by this browser.
10. **What if the system is wrong or fails silently?** A missing bundle stops the page with an error that names the command to run. A missing builder logs the file that names it. With no WebGL, the art is drawn flat and the console says why.

## index.html: the sample cards

1. **What is this page about?** The nine sample records side by side, so the mixes can be compared.
2. **What is the one dominant action?** Opening a card. Each card is a link to its own page.
3. **What does the user need to know right now?** That the data is sample data, and that each number has its own mix.
4. **What can stay hidden?** The full mix of each card. The caption shows three layers, and the card page shows all twelve.
5. **What is repeated elsewhere?** The Sample data note. It is repeated on purpose on every page.
6. **What exists only because the data has it?** Nothing.
7. **What can be removed?** Nothing without losing the comparison.
8. **Does leaving preserve state?** There is no state on this page.
9. **Does returning preserve context?** Yes. The page is the same each time.
10. **What if it fails?** Each card fails on its own and logs why. The others still draw.

## elements.html: every element

1. **What is this page about?** Every element of every layer, each one swapped into the reference card.
2. **What is the one dominant action?** Reading. There is no action. The filters are in the address: `only`, `layer` and `palette`.
3. **What does the user need to know right now?** How many mixes the layers make, and that no mix is given twice.
4. **What can stay hidden?** The file names. A file name shows when the pointer rests on an element's name.
5. **What is repeated elsewhere?** The layer list repeats layers/README.md. The page is derived from the same bundle, so the two cannot disagree.
6. **What exists only because the data has it?** The share of each element. It is the rarity, so it stays.
7. **What can be removed?** Nothing. A card is drawn only when it scrolls into view, so the page stays fast with 329 elements.
8. **Does leaving preserve state?** The filters are in the address, so yes.
9. **Does returning preserve context?** Yes, through the address.
10. **What if it fails?** An element that cannot be built logs its file and draws the rest of the card.

## world.html: the site as one card shapes it

The owner's card reshapes the site's pieces (world.js). This page shows that for one record at a time.

1. **What is this page about?** How one card shapes the site, for its owner and for a visitor to the owner's profile.
2. **What is the one dominant action?** Next number. It is the only filled button in the page's own bar. Inside the site, View profile (owner) and Open card (visitor) are the filled buttons.
3. **What does the user need to know right now?** What the site looks like in this card's style. The first tab shows it, the second shows the profile, and the third names the element behind each piece.
4. **What can stay hidden?** The element files, the DNA and the way the frame and divider are cut. The element names live on the third tab, and the files show when the pointer rests on an element's name.
5. **What is repeated elsewhere?** The card appears small on the first two tabs, because it is the owner's object on both. The Sample data note repeats on every page on purpose.
6. **What exists only because the data has it?** The record fields: name, identity, genesis ID, network, joined, serial, role, status and the two footer lines. Nothing else is shown: no counts, no activity and no live state.
7. **What can be removed without changing the decision?** Nothing more. The footer row was cut. The divider now splits the two sections of the first tab, and the About panel holds the record facts under the divider.
8. **Does leaving preserve state?** Yes. The record, the skin and the open tab are in the address.
9. **Does returning preserve context?** Yes, for the same reason. A number alone (`world.html?genesisId=27`) gives the same sample record every time.
10. **What if the system is wrong or fails silently?** A view that fails to draw logs which view and why, and the other tabs still work. Art that fails to build logs its error and leaves the banner and avatar dark, with the words and chrome intact. A tag, ornament or divider named None leaves its piece plain: role and status badges become plain chips, and the divider becomes a hairline.

Each tab fits 1280x720 and 1440x900 with no scroll. Below 900 px wide the views stack and the page scrolls.

elements.html now shows, under each element, what that element shapes in the site (DefxnWorld.sample). The sample is drawn with its card, when it scrolls into view.

## engine-demo.html: a site that reskins to its visitor's card

1. **What is this page about?** An example site that loads nft-engine.js, and the same site seen by a guest and by visitors who bring a card.
2. **What is the one dominant action?** Choosing who visits. The pressed button in the bar is the visitor.
3. **What does the user need to know right now?** That the site's own look is what a guest sees, and that a card replaces it only where the site marks a place with data-nft.
4. **What can stay hidden?** How the engine dresses each piece. The About panel names the pieces, and nft-engine.js says how.
5. **What is repeated elsewhere?** The pieces repeat world.html's views. This page shows them on a site that is not DEFXN's, which is the point.
6. **What exists only because the data has it?** The visitor line in the bar names the card's palette, corners and frame, so a reader can match the look to the card.
7. **What can be removed without changing the decision?** Nothing more. The site has one row of three panels and one row with the card.
8. **Does leaving preserve state?** Leaving the visitor puts the site back exactly: the site's HTML after a restore is the same as before, character for character.
9. **Does returning preserve context?** A visitor's look is drawn from the card's record each time, so the same card always gives the same look.
10. **What if the system is wrong or fails silently?** If the engine cannot take a piece back it says so in the console, and the guest look is the site's own CSS, so a site never depends on the engine to be readable.

## shop.html: every element, by itself

1. **What is this page about?** Every element of every layer, each drawn alone, with its rarity tier and its proposed price.
2. **What is the one dominant action?** Try on. It is the filled button by the picked element. Once the loadout has a pick, Wear on card is the filled button under it. Mint as a skin sits beside it as a plain link: it leaves for /account, where the signature happens.
3. **What does the user need to know right now?** What the element looks like alone, what it costs, and how rare it is.
4. **What can stay hidden?** How the element looks on the card and in a site: two buttons above the large view show them on request.
5. **What is repeated elsewhere?** The elements page shows the same elements on the card. The shop shows them alone, which is what a buyer looks at first.
6. **What exists only because the data has it?** The share ("in 2% of cards"). It is the rarity a buyer pays for, so it stays.
7. **What can be removed without changing the decision?** Nothing more. The grid draws a tile only when it scrolls into view, so the page stays fast with every element.
8. **Does leaving preserve state?** Yes. The filters, the picked element, the card and the loadout are all in the address.
9. **Does returning preserve context?** Yes, through the address. Wear on card carries the loadout to the card page as its skin.
10. **What if the system is wrong or fails silently?** A loadout that copies a mix another number was born with is refused, and the refusal names that number. An element that cannot be drawn alone says so in the console, and the rest of the grid still draws.

## review.html: keep elements that break the design out

1. **What is this page about?** Which elements a new card may be born with, decided one category at a time, and which pairs never go together.
2. **What is the one dominant action?** Save review file. It is the only filled button. Keep and Hold on each element, and a click on a pair's card, are quieter decisions that feed it.
3. **What does the user need to know right now?** Each element alone, the warnings the page finds by itself, and how the element looks on three different cards.
4. **What can stay hidden?** The pair grid stays behind the Two layers tab. A corner closer view stays behind the Show menu.
5. **What is repeated elsewhere?** The tiles repeat the shop's isolated drawings. Here they carry the decisions instead of prices.
6. **What exists only because the data has it?** The share of each element, which says how often a held element would have been drawn.
7. **What can be removed without changing the decision?** Nothing more. The grid draws a card only when it comes into view.
8. **Does leaving preserve state?** Yes. Decisions are kept as a draft in this browser until the review file is saved, and the header says so.
9. **Does returning preserve context?** The category is in the address. The draft returns with the browser.
10. **What if the system is wrong or fails silently?** An element the page cannot measure says "Could not be measured". A review line that names an element no folder has any more is reported by make-layers.mjs and dropped, so a rename never stops the build. A review file this grammar did not write is refused with the reason.

## primitives.html: every Ark UI part in a card's skin

1. **What is this page about?** How a card's skin changes every Ark UI part the defxn site ships: the 29 blocks of Ark UI's registry and its two behaviour pieces.
2. **What is the one dominant action?** Pick who visits: the site's own look or one of the three sample cards. The picked choice is the only filled button.
3. **What does the user need to know right now?** Each part as Ark UI draws it, and under it what it took from the card and what Ark UI took back.
4. **What can stay hidden?** The other groups. The rail shows one of Ark UI's own groups at a time, or all parts.
5. **What is repeated elsewhere?** The world and the avatar also show on the site's pages and on the profile. Here they sit behind every part at once.
6. **What exists only because the data has it?** The rule line under each part. It reads Ark UI's own report, so it says what happened, not what was asked for.
7. **What can be removed without changing the decision?** Nothing more. The parts are drawn at two thirds of their size so a group fits in view. The Real size switch shows them as a page draws them.
8. **Does leaving preserve state?** The card is in the address (?skin-sample=263). The group is not.
9. **Does returning preserve context?** Yes for the card, through the address.
10. **What if the system is wrong or fails silently?** A block Ark UI refuses says so in its tile. A card that does not go on says why in the status line. A rule Ark UI takes back is named under the part, with nothing hidden.

## wear.html: a card the wearer keeps on a site

1. **What is this page about?** Keeping a card on a site: try it, say yes, and every page shows it after a reload.
2. **What is the one dominant action?** Wear it. It is the main button in the wearer's menu, and it asks first.
3. **What does the user need to know right now?** Which card is on, and whether this device keeps it. The status line says both. The bar's one control, the seal, shows the card's number. Its menu shows the name, the site check and the actions.
4. **What can stay hidden?** Why the seal guards against copies of the site. The confirm says it once, at the moment of choosing.
5. **What is repeated elsewhere?** The parts. They are Ark UI's own examples, as on primitives.html.
6. **What exists only because the data has it?** The seal. It shows only while a card is on, and only that card's own icon, number and name.
7. **What can be removed without changing the decision?** Nothing more. Steps, stats and the tool bar's try buttons were removed: trying a card lives in the wearer's menu, as on the site. The page fits 1280x720 and 1440x900 with no scroll.
8. **Does leaving preserve state?** Yes. A worn card is kept on this device, for this address. A tried card is not, and the status line says so.
9. **Does returning preserve context?** Yes. The kept card goes back on before anything else loads, with no NFT engine.
10. **What if the system is wrong or fails silently?** A kept text that this site did not write, or whose number is not its skin's card, is dropped and never worn. Blocked storage still lets a card go on for the visit, and `kept: false` says it was not kept. A card that does not go on says why in the status line.

## studio.html: a card slot and its motion

1. **What is this page about?** A site author's card slot: what the card makes there (a banner, a stamp or a nameplate) and how it moves.
2. **What is the one dominant action?** Preview. It is the only filled button.
3. **What does the user need to know right now?** What each kind looks like with a real card, and whether the motion keeps the rails. A track that breaks them says which one and why, and is not handed on.
4. **What can stay hidden?** The FLX text. It sits below the pieces, for the person who wires the CMS.
5. **What is repeated elsewhere?** The pieces. They are the card's own drawings, as on the site.
6. **What exists only because the data has it?** The three kinds. Each is drawn from the picked card's own pieces, and a card without a piece draws less.
7. **What can be removed without changing the decision?** Nothing more. The page fits 1280x720 and 1440x900 with no scroll. The track list scrolls in its own column.
8. **Does leaving preserve state?** No. The CMS keeps a slot as its draft. This page is the editor's design surface.
9. **Does returning preserve context?** It opens on card 263 and the card's own arrival every time.
10. **What if the system is wrong or fails silently?** A refused track is named with its reason. A card that does not load says so in the status line. A slot text this grammar did not write is refused.

