# Card layers

Each folder here is one layer of the DEFXN identity card. Each file in a folder is one element of
that layer. A card gets one element from every folder. That list is its DNA, and no two genesis
numbers get the same DNA.

After any change here, run this in `docs/home-redesign/nft/`:

```
node make-layers.mjs
```

It writes `layers-bundle.js` and `builders-bundle.js`, which the card pages read. It stops and
names the fix when a file breaks a rule below.

## File names

`<Name>#<weight>.svg` or `<Name>#<weight>.css`

- **Name** is shown on the card page. It must be unique in its layer, sub-folders included.
- **weight** sets how often the element is picked. A weight of 5 in a layer whose weights sum to 200
  is picked for 5 cards in 200.
- A layer folder may hold sub-folders, such as `03-aura/sheet-4/`. The files in them belong to the
  layer. Each contributor writes only in their own sub-folder.

## The layers

| Folder | What it is | Kind |
|---|---|---|
| 01-backdrop | far behind the mark | 3D |
| 02-palette | the colours: `--a` blocks, `--b` light, `--c` glow and accents | `.css` |
| 03-aura | a structure around the mark | 3D |
| 04-mark | how the DEFXN mark is built | 3D |
| 05-signal | light: streaks, beams, bursts | 3D |
| 06-particles | small things floating in front | 3D |
| 07-corner | the three corner marks | chrome |
| 08-frame | the inner frame | chrome |
| 09-tag | a tag under the name | chrome |
| 10-ornament | a strip between the facts and the divider | chrome |
| 11-divider | the line above the footer | chrome |
| 12-emblem | the small mark beside the footer lines | chrome |

## 3D elements

The root is `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" data-build="<builder>">`.
Extra `data-*` values on the root are the builder's settings.

- `data-build="extrude"` builds the drawing itself. Every filled cell of the SVG becomes a block.
  - `data-as`: `cubes`, `glass` or `points`.
  - `data-cell`: the cell size in card units.
  - `data-z`: the distance in front of the mark, or behind it when negative.
  - `data-depth`: the block depth.
  - `data-tint`: `a`, `b` or `c`.
  - A part marked `data-sketch` is a preview only, and is not built.
- Any other name is a builder: a function registered in `art3d.js` or in `builders/<file>.js` with
  `Art3D.register('<name>', function (m, ctx) { ... })`. The header of `art3d.js` lists what a
  builder can add: blocks, glass cubes, points, lines, streaks, glowing bars, rods and spheres.
- Builder names in `builders/` start with the file's prefix, such as `s4-orbit-dots` in `builders/s4.js`.
- The space is card units. The origin is the mark's centre, y runs up, and z runs toward the viewer.
  The mark spans x -200 to 200 and y -273 to 273. Left of x -240 is the text side, and everything
  there fades out.
- Those bounds are where a thing is SEEN, not where it sits. The card rests a little turned, and
  the view has depth, so far and near things move sideways. A point at z -200 is seen about 80
  units left of its x, and a point at z +100 about 40 units right. `ctx.seen(x, y, z)` gives the
  seen place, and `ctx.clearAt(x, y, z, pad)` says whether it is clear of the card's words.
- Every random choice uses `ctx.rnd()`. Never use `Math.random()`. The same card must always give
  the same art.

## Chrome elements

The root is `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 W H" data-slot="<slot>">`. One
viewBox unit is one card unit.

| Slot | viewBox | Where it sits on the card |
|---|---|---|
| corner | `0 0 120 120` | top-left corner at (28, 28). The card mirrors it to the top-right and bottom-left. Stay inside the outer 20 units of the box, so the words stay clear. |
| frame | `0 0 1000 700` | the whole card, and its EDGE: the card has no border of its own, so the frame draws it (an edge line near 0.5 to 2 units in, with rx about 30, or a deliberate open edge). Draw only in the band 0 to 26 units from the edge. On a site the frame is every panel's border, and the panel's own border is hidden. |
| tag | `0 0 360 50` | under the name, at (56, 282) |
| ornament | `0 0 360 80` | between the facts and the divider, at (56, 478) |
| divider | `0 0 360 24` | the line above the footer, at (56, 568) |
| emblem | `0 0 30 34` | beside the two footer lines |

Colours are only these names, written as `var(--name)` in an attribute or a style:

| Name | Colour |
|---|---|
| `--ink` | bright text white |
| `--dim` | the muted grey of the labels |
| `--line` | a hairline, white at 42% |
| `--faint` | a faint hairline, white at 7.5% |
| `--rule` | the divider line, white at 16% |
| `--acc` | the palette's accent (`--c`) |
| `--acc2` | the palette's light (`--b`) |
| `--state` | green when the status is Minted, grey otherwise |

For a 1-pixel line, use `stroke-width="1" vector-effect="non-scaling-stroke"`.

Text shows only fixed label words or a record field: `<text data-field="status">STATUS</text>`. The
card fills in the field. The fields are `genesisId`, `identity`, `name`, `status`, `role`,
`network`, `joined`, `serial`, `tagline1`, `tagline2`, `dna`, `number`, `mark` and `palette`.
Add `data-char="0"` to show only the first character of a field, `data-char="1"` the second, and so
on. Use `font-family="JetBrains Mono, monospace"` and a font size in card units: 13 matches the
labels.

## Review: keep elements that break the design out

`review.html` shows one category at a time, each element drawn alone, with warnings the page finds by
itself. It also shows two categories against each other in a grid of cards, one card per pair. Mark
an element **Hold** to keep it out, and click a pair's card to mark the two as a **Clash**.

Save the review file, put it here as `layers/review.flx`, and run `node make-layers.mjs`. New cards
are then never born with a held element or a clashing pair, and the shop and the skin picker refuse
them with the reason. The file is dense text, one record per line (`review-record.js`):

```
DFXNHOLD1-L<hex layer key>-E<hex element name>
DFXNCLASH1-L<hex layer>-E<hex name>-L<hex layer>-E<hex name>
```

A pinned card, such as the reference card, keeps its mix.

## Rules

- Nothing on a card is live. Never draw Online, Syncing, Live, Connected, latency, a progress
  percentage, a supply count, a block height, coordinates, a time of day, a version number, a file
  size or a "verified" badge. The card holds none of these facts.
- Names are flat `.fxn` names. To show a name, use `data-field="name"`.
- No word from `tests/no-deprecated-vocabulary.cjs`.
- No network calls, no `Math.random()`, and no animation that runs on its own.
