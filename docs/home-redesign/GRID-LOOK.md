# Grid look: the dark glass grid, and how a worn card changes it

Written for: the owner, the ring-kit owner (`js/world`), the CMS owner (`js/content/world.js`) and the NFT session (`js/nft`). Status: design and prototype, 2026-10-24. Nothing here is integrated. The prototype is `docs/home-redesign/grid-look/index.html` and `grid-look.js`.

## What this decides

The owner's direction, 2026-10-24: a dark glass grid, and "the grid can finally transform, so the cube details and texture and lighting can be affected by the NFTs."

This replaces the rule "a card skin never recolours the grid" (`SKIN-CONTRACT.md`, 1b). The new rule has two halves.

1. The grid keeps its structure. Rings, positions and what each cube means do not change.
2. A worn card changes the cubes' detail, texture and lighting through one closed list of parameters, the grid look. A card never sets a colour directly, and its 2D art background still never covers the grid.

The NFT 3D engine stays separate from the ring kit. The card supplies parameters. The ring kit draws them. No NFT code goes into `ring-kit.js`.

## The default look

Two references from the owner: a cube outlined in glowing cyan, packed with voxel blocks and data panels, lit blue from inside with a magenta glow at the base. And a clear glass cube with soft blue, pink and amber lights and blurred shapes inside.

| Part | Default | How it is drawn |
| --- | --- | --- |
| Cube body | Dark glass. 60% see-through, tinted by the cube's kind | One shader per cube. The shader walks the ray through the box and adds light as it goes. No transmission pass |
| Edges | Azure (hue 200) lines on all 12 edges. The far edges show through at a third of the strength | Distance to the nearest edge on the entry face and on the exit face |
| Inner detail | Voxels, 55% density: a 3 to 8 cell grid per side, each cell filled by a seeded hash | Eight samples along the ray |
| Panels | The alternative to voxels: three to five thin sheets with rows of data bars | Each sheet is crossed analytically, so it never aliases |
| Texture | Frost, 35%: inner shapes soften | Wider smoothstep on the voxel and bar edges |
| Inner light | Three soft lights: blue (222), pink (318), amber (38) | Gaussian blobs at fixed places in the cube |
| Base glow | Pink (318), 60%: pools in the cube's lower half and on the floor under it | An exponential rise from the cube's floor, and one additive decal per cube |
| Rim | Fresnel in the edge colour, 50% | On the outside faces |
| Particles | 35%: small points in the light colours, above each cube | One `Points` draw. Still at rest |
| Fog and haze | The site's fog, tinted 20% toward the base hue | Fog colour only. Fog distances stay the existing `fogStart` and `fogEnd` knobs |
| Bloom | 55% | The ring kit's existing glow pass (a quarter, an eighth and a sixteenth of the screen) |

The kind pad. Every cube carries a slab of its kind's colour on its inner floor, and a small core of the same colour. The pad is the answer to "can I still tell identity, signal and other apart under any look". In the prototype's screenshots the pad reads clearly in the default and in card 27. In card 512, with 81% edge glow and bloom 61%, the bloom washes the pad. That is a tuning item for the ring-kit owner, listed below. The fix is a stronger pad, not a weaker look.

## What a look never moves

Colour carries meaning in this world. These stay outside the look, and the look cannot reach them.

| Locked | Why | How the look stays clear of it |
| --- | --- | --- |
| Chain kinds (`--chain-*`) and networks (`--net-*`) | They say what a ring is | Tiles keep their kind colour. A cube keeps its kind colour in its body, its core and its pad. `kindTint` has a floor of 0.35 and no card sets it |
| The chosen record's edge light and the signed light (`--signal`) | They say "chosen" and "signed" | The site draws them after the look, as outlines and pips the look has no uniform for. The look's edge hue is also kept 26 degrees away from the signal hue |
| `--ember`, the record descent's light | It says "you are on the record" | Edge hue stays 26 degrees away from it |
| The danger and live family | They say "wrong" and "running" | Edge hue stays 26 degrees away from both |
| The words and the page's contrast | The page sits over the grid | See "Readability" |

The edge is the only colour held to the 26 degree rule. It is the loudest line on a cube and the one that could pass for a state. Inner lights and the base glow can take any hue, because they sit inside the glass and carry no state. The prototype keeps the band centres as plain hues. The ring kit reads them from the theme (`k.C.signal`, `k.C.ember`, and the danger and live tokens), so a theme change moves the bands with it.

## Performance budget

The dominant cost is not the cube. It is the fixed passes: the 4x multisampled main target, and the three blur levels. A cube's material changes the frame by under 0.1 ms. The thing that does change it is how glass is made.

Measured 2026-10-24 on an Apple M2 (Metal, through ANGLE, Chromium headless), the prototype scene with 19 cubes, 30 tiles and 418 particles. Each figure is the mean of 80 to 120 forced frames with the GPU synchronised after the run. Device pixel ratio is shown with the drawn pixel count, because the kit caps drawn pixels near 2.6 million (4.2 million above 3.2 million screen pixels).

| Viewport and ratio | Drawn pixels | Glass shader | Solid cube (today's material, no shadows) | Transmission glass |
| --- | --- | --- | --- | --- |
| 1440x900, ratio 1 | 1.30 million | 2.67 ms | 2.65 ms | 4.27 ms |
| 1440x900, ratio 2 (capped to 1.416) | 2.60 million | 4.44 ms | 4.37 ms | 7.98 ms |
| 2560x1440, ratio 1 | 3.69 million | 6.2 ms | 6.1 ms | not measured |

The same scene with bloom at 0 reads 2.31 ms against 2.36 ms at default, at 1440x900. The blur passes run at a quarter of the screen and smaller, so bloom strength is nearly free. A bloom pass that does not run costs the passes themselves, which the kit already pays.

What this means for the choices.

1. Glass is made in the cube's own shader. A transmission material adds 60% (1440x900, ratio 1) to 83% (the 2.6 million cap) to the frame, because three.js draws the scene a second time for it. The shader costs the same as a solid cube.
2. The shader samples the cube eight times per pixel. A cube is about 80 pixels wide at the home view, so this stays small. A close view of one cube, as in the record views, fills the screen with one cube and costs more. The ring-kit owner must measure that view before it ships. The prototype did not.
3. Real time budget on a slow device is unmeasured. This is one Apple M2. The first thing to measure on a 4x slower CPU and an integrated GPU is the 8-sample loop at the record view.
4. These numbers hold the 1.3 million, 2.6 million and 3.7 million pixel counts constant and change only the material. They exclude the shadow pass, which draws only while tiles move.
5. Nothing may add a frame at rest. In the prototype a settled world drew 0 frames in 2.5 seconds, before and after a look change. A look change drew 60 frames in about 1 second, then stopped. A 1.4 second camera flight drew 89 frames, then 0 idle.
6. Reduced motion. A look change is instant (5 frames to apply it and draw once). The particle clock stays at 0, so nothing drifts. Measured with the OS setting emulated.
7. Particle drift happens only while the world is already moving for another reason (a look change, a camera flight). At rest the particles are still. This is the only "drift" the look has, and it needs no idle frame.
8. The card's census is a build-time number. Counting what a card's layers build with `Art3D.build` took 36 to 229 ms per card in the prototype, on the main thread. The site must not run it. It is a table written by `make-layers.mjs` (see "What must change").

## The grid look parameter set

A closed list. It becomes a new group `grid` in `ArkWorld` (`js/content/world.js`), beside `look`, `motion` and `story`. Each row is `[min, max, default]` or a choice, so the CMS panel lists it with no other change. It is stored as FLX records like the rest of the draft.

| Knob | Range | Default | What it does | Set by a card |
| --- | --- | --- | --- | --- |
| `glass` | 0 to 1 | 0.6 | How see-through a cube is. 0 is solid, 1 is clear | Yes |
| `kindTint` | 0.35 to 1 | 0.7 | How strongly a cube shows its kind colour in its body, core and pad | No |
| `edgeGlow` | 0 to 1 | 0.75 | Strength of the glowing edges | Yes |
| `edgeHue` | 0 to 360 | 200 | Edge colour. Held 26 degrees clear of the locked hues | Yes |
| `detail` | voxels, panels, none | voxels | What fills the cube | Yes |
| `detailDensity` | 0 to 1 | 0.55 | How many cells or sheets | Yes |
| `texture` | clear, frost, scan, dots | frost | How the detail is drawn | Yes |
| `textureAmount` | 0 to 1 | 0.35 | How much of the texture shows | Yes |
| `lightAHue`, `lightBHue`, `lightCHue` | 0 to 360 | 222, 318, 38 | The three inner lights | Yes |
| `lightStrength` | 0 to 1 | 0.7 | Brightness of the inner lights and the detail | Yes |
| `baseHue` | 0 to 360 | 318 | Colour of the base glow | Yes |
| `baseGlow` | 0 to 1 | 0.6 | Strength of the base glow within the cube and on the floor | Yes |
| `rim` | 0 to 1 | 0.5 | Fresnel rim in the edge colour | Yes |
| `vivid` | 0.2 to 1 | 0.85 | Saturation of every look colour. A grey palette gives 0.2 | Yes |
| `particles` | 0 to 1 | 0.35 | Share of the particles shown | Yes |
| `hazeTint` | 0 to 1 | 0.2 | How much the fog and the background take the base hue | Yes |
| `bloom` | 0 to 1 | 0.55 | Strength of the glow pass | Yes |

That is 19 knobs. One more goes in `motion`: `lookEase`, 0 to 3000 ms, default 900, the time a look takes to arrive. Reduced motion ignores it and applies at once.

Both the CMS and a card write to the same set. The CMS value is the site's default look. A card's derived value replaces it while the card is worn, and the CMS value comes back when the card is removed.

## The card to grid mapping

The rule: every value derives from the card's palette and from a census of what its 3D layers build. Nothing is authored per card, and no rarity tier is read (the skin contract already says "a rare card must not make a menu harder to use").

The census. `Art3D.build` builds each 3D layer of a card as data (cubes, glass cubes and spheres, points, lines, streaks, bars). The prototype counts them layer by layer. For the three samples:

| Card | Backdrop | Aura | Mark | Signal | Particles |
| --- | --- | --- | --- | --- | --- |
| 27 (Acid) | Sky Islands: 2,093 cubes, 299 points, 51 thin | Glass Pyramid: 2 blocks, 50 points, 21 thin | Shatter: 1,946 cubes | None | Axis Globe: 343 points |
| 263 (Amber) | Dot Map: 2,059 points, 16 thin | Stack: 363 points | Relief: 1,906 cubes, 9 streaks | 83 points, 14 thin | Moons: 3 spheres |
| 512 (Glass) | Curtain: 652 points | None | Pour: 4,509 cubes, 206 streaks | Bars: 48 thin | Dust: 320 points |

"Thin" counts lines, streaks and bars.

| Parameter | Derived from | Rule |
| --- | --- | --- |
| `lightAHue` | Palette light (`--b`) | Its hue |
| `lightBHue` | Palette accent (`--c`) | Its hue. When it sits within 25 degrees of `--b`, the light takes `--b` plus 28 degrees |
| `lightCHue` | Palette tint (`--a`) | Its hue when `--a` is at least 30% saturated and 25 degrees from `--b`. Otherwise `--b` minus 28 degrees |
| `baseHue` | `lightBHue` | The same hue |
| `edgeHue` | Palette accent (`--c`) | Its hue, moved to the edge of any locked band it falls in |
| `vivid` | Saturation of `--b` and `--c` | 0.2 plus 0.85 of their mean, up to 1 |
| `lightStrength` | Lightness of `--b` | 0.45 plus 0.9 of its distance above 0.4, kept in 0.45 to 0.9 |
| `bloom` | Lightness of `--c` | 0.35 plus 0.8 of its distance above 0.4, kept in 0.35 to 0.75 |
| `glass` | Glass blocks and spheres over all blocks in the mark and aura | 0.35 plus 0.55 of the share (scaled by 1.6, capped at 1) |
| `edgeGlow` | Signal layer census | 0.5 for none, up to 0.9 as the count rises (log scale to 160 parts) |
| `baseGlow` | Aura census | 0.35 for none, up to 0.8 (log scale to 400 parts) |
| `rim`, `hazeTint` | Backdrop census | 0.35 to 0.75 and 0 to 0.3 (log scale to 4,000 parts). The backdrop is the card's atmosphere |
| `particles` | Particles layer census | A log scale to 3,000 parts. None gives 0 |
| `detail` | Blocks against thin parts across the mark, aura and signal | `none` below 12 parts. `panels` when thin parts are at least 5% of the blocks. Otherwise `voxels` |
| `detailDensity` | Blocks in the mark and aura | A log scale to 16,000 blocks |
| `texture` | The strongest of three scores: points in the ambient layers (dots), thin parts (scan), glass share (frost) | `clear` when the best score is under 0.45 |
| `textureAmount` | The winning score | 55% of it, kept in 0.2 to 0.55 |
| `kindTint` | Nothing | Stays at the site value |

Derived looks for the three samples (prototype output):

| Card | Detail | Texture | Edge hue | Light hues (A, B, C) | Base glow | Particles | Bloom |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 27 | voxels 0.78 | dots 0.43 | 60 | 84, 112, 56 | 0.67 at hue 112 | 0.73 | 0.48 |
| 263 | voxels 0.78 | dots 0.52 | 48 (accent 33 sat in the ember band, moved) | 38, 66, 10 | 0.79 at hue 66 | 0.20 | 0.47 |
| 512 | panels 0.87 | scan 0.53 | 190 | 190, 218, 162 | 0.35 at hue 218 | 0.72 | 0.61 |

What the prototype shows about the rule, honestly.

1. All three samples give `glass` 0.35 and `kindTint` 0.7. None builds glass blocks, so the card never moves `glass` here. Glass moves only for cards like 300 (Mono, Glass mark), which the census puts at 562 glass blocks and about 0.9. The range exists but three samples do not show it.
2. A one-hue palette spreads its lights by a fixed 28 degrees. For Amber that puts light B at 66 (yellow-green). The sign is a convention. A better rule picks the side that stays inside the palette's own family. The NFT session should choose it by measuring, not by taste.
3. The three texture scores are close together on dense cards (27 scored dots 0.79 and scan 0.75). The winner is stable for a card, because the count is fixed, but the margin is thin. A card with a margin under 0.05 should resolve the tie by layer order and say so.
4. The grid read as one family in all four looks, and a card is recognisable in its colour first. A viewer will not read "voxels or panels" from across the room. They read the colour and the texture.

## How the card reaches the grid

Three pieces.

1. **The source of params.** `DefxnSkin.recipe(record).gridLook` from the NFT session returns the derived set above. It is a plain object of the 19 knobs. It carries no three.js object and no colour value other than hues. If the NFT session has not shipped it, the site can derive it from the palette alone (hues, `vivid`, `lightStrength`, `bloom`) with the same rules, and leave the census-based knobs at the site default.
2. **The API on the ring kit.** `k.setGridLook(params, ms)`. It takes the closed set, clamps it (the same clamp as ArkWorld), eases from the current look to the new one over `ms` (default `lookEase`), and returns a promise that resolves when the world has settled. While the ease runs, particles drift. At the end it draws once more and stops. A categorical knob (`detail`, `texture`) never pops: its amount dips to zero at the midpoint, switches there, and comes back. Hues take the short way round. Reduced motion applies the look at once and draws one frame.
3. **The switch.** The site's skin code (`js/ark/skin-site.js`) calls `k.setGridLook(recipe.gridLook)` when a skin is applied and `k.setGridLook(null)` when it is removed. `null` means the CMS's site default.

What replaces what.

| Today | After |
| --- | --- |
| `data-world-skin="follow"` makes the kit read the skin's CSS tokens and repaint | Retired. The kit no longer reads a skin wrapper. It receives parameters |
| `defxn:skin` and `ark:skin` repaint a following world | The skin code listens to its own event and calls `setGridLook`. The kit has no skin listener |
| The grid never takes a card's colours | A card's palette hues reach the grid through the closed set only. The chain kinds, networks, `--ember`, `--signal`, danger and live stay as they are |
| A card's art background never covers the grid | Unchanged |

The Genesis scene copies the ring kit. It may keep `data-world-skin="follow"` until it takes the new kit, because that scene is the Genesis session's decision.

## Readability

The page's words sit over the grid. The look must not lift the area behind them.

The prototype puts the ring at about two thirds across the frame and a text column at the left, as on the home. It measures relative luminance (0 black, 1 white) of the rendered frame in two regions: the words' column (left 6% to 40%, top 12% to 62%), and a strip over the ring's left edge (42% to 60% across), where words could reach on a narrower screen.

| Look | Words' column, median | Words' column, 99th percentile | Over the ring, 99th percentile |
| --- | --- | --- | --- |
| Default | 0.0048 | 0.024 | 0.84 |
| Card 27 | 0.0054 | 0.030 | 0.90 |
| Card 263 | 0.0054 | 0.031 | 0.92 |
| Card 512 | 0.0048 | 0.029 | 0.84 |

The words' column stays near black in every look. Body text (`--text`, about 0.6 relative luminance) needs a background under 0.094 to hold 4.5 to 1. The column's 99th percentile is 0.031 or lower, which gives about 8 to 1, and its median gives 12 to 1. The column's single brightest pixel is 0.27 in card 27 (a particle), so the gate must read the 99th percentile and not the maximum.

Over the ring the grid is bright by design, so no page text may sit there. The rule for the ring kit is the one it already has: the design frame (`k.setFrame`) puts the subject outside the words' box, and the composite pass darkens outside the subject. The look adds no new frame logic. The ring-kit owner should add a gate to the kit's test: for each look in the closed set's extremes, the 99th percentile luminance in the words' box must stay under 0.094.

## What must change

### `js/world/ring-kit.js` (the ring-kit owner)

1. Add `k.setGridLook(params, ms)` and `k.gridLook()` (the current eased values, for the CMS preview).
2. Replace the cube material in `chains-scene.js` with the glass shader. Keep the existing `MeshPhysicalMaterial` as the `glass: 0` path, shown by toggling `visible` so no shader recompiles. The prototype's vertex and fragment shaders are the reference (`grid-look.js`, `cubeMat`). The per-instance data is the cube's matrix, its kind colour (`instanceColor`, already set by `paintCubes`) and one seed attribute.
3. Add uniforms for the knobs. Add the particle `Points` draw and the base-glow decals. Both read the same uniforms.
4. Run the look ease in the kit's existing frame loop. It must call `k.wake(ms)` for the ease and let the kit settle after it. No new loop.
5. Feed `bloom` to the existing glow pass's strength. Feed `hazeTint` to the fog colour in `paint()`.
6. Read the locked hues from the theme in `readTheme()` (signal, ember, danger, live) and clamp `edgeHue` to 26 degrees clear of them inside `setGridLook`. The clamp lives in one place, here, so a card and the CMS both pass through it.
7. Remove the `follows()` path, the `data-world-skin` read, and the two skin listeners from the default build. Update the header comment ("SKINS: a card skin never recolours the grid").
8. Strengthen the kind pad so it reads under card 512's edge glow and bloom (prototype finding).
9. Measure the record view (one cube filling the screen) and a 4x slower CPU with an integrated GPU, and report the numbers against the table above.

### `js/content/world.js` (the CMS owner)

1. Add `SCHEMA.grid` with the 19 knobs above, and `lookEase` in `SCHEMA.motion`. Add `grid` to `GROUPS`. The sanitiser needs a choice branch for `detail` and `texture`. `exit.words` already has one.
2. `knobs()` already lists a group by schema order, so the World panel needs no change beyond a group heading, and hue knobs should render as a hue slider with a swatch.
3. Keep `version` at 1 only if the empty draft changes nothing. The new defaults change the grid's look, so this is the owner's call: bump `version` to 2 and let `define()` accept 1.
4. The FLX serializer needs no change. The round-trip test (`tests/world-content.cjs`) gains the 19 knobs.
5. The preview message `defxn-cms-preview-world` already carries the whole draft. The world applies `grid` through `k.setGridLook` without a remount.

### The NFT recipe (the NFT session, `js/nft` and `docs/home-redesign/nft/make-layers.mjs`)

1. `make-layers.mjs` measures a census for every 3D element once, and writes it into `js/nft/skin-bundle.js` beside each element's name and weight: `census: { cubes, glass, pts, thin }`. The site then needs no 3D to derive a look. The prototype's census uses one card's seeded stream. The measured number should average a few seeds so it describes the element, not one card.
2. Add `DefxnSkin.gridLook(traits)`, the rules in the mapping table, and return it as `recipe.gridLook`. It is a pure function of the palette and the censuses, so the same card always gives the same grid.
3. The locked-hue clamp does not belong here. The recipe sends the card's own `edgeHue`, and the kit clamps it.
4. Decide the one-hue spread rule (finding 2 above) by measuring the palette, and the tie rule for texture (finding 3).
5. Add a regression case for each defect found: a Mono card must give `vivid` 0.2, an Ember card's edge must leave the ember band, and a card with no particles must give `particles` 0.
6. Record 009 is never used as a sample.

### Documents

`SKIN-CONTRACT.md`, section 1b, "The defxn grid never takes a card's colours", must be rewritten to the rule at the top of this file once the owner approves this design. This phase did not edit it.

## Screen reduction test (the prototype page)

1. What is this page about? How a card changes the grid's look.
2. The dominant action? Choosing a look: default or a card.
3. What does the user need to know right now? Which look is on, and its parameters.
4. What can stay hidden? Frame cost and the census. They are read through the page's test hooks, not shown.
5. What is repeated elsewhere? The parameter list lives here and in the CMS panel later, so the page shows only the values of the look on.
6. What exists only because the database has it? Nothing is shown from the census table.
7. What can be removed without changing the decision? The fly button. It is a key (`f`), not a control.
8. Does leaving preserve state? No. It is a prototype and stores nothing.
9. Does returning preserve context? `?look=27` opens card 27.
10. What if the system is wrong? Without WebGL 2 the canvas stays empty and the page shows its words and panel. The real kit bails the same way and keeps the particle fallback.

The page fits 1440x900 with no scroll. Screenshots are in `/private/tmp/claude-501/-Volumes-PortableSSD-flux-defxn/0413e07e-be2f-4f97-831d-5e0f918ebaa8/scratchpad/gridlook/`.
