# Every view of the Three.js world, mapped

For the lanes porting the site off Three.js (`PORT.md`, step 1). Read from the code on 2026-10-30. The table has one row per view in `js/world/world-host.js` VIEW_OF, plus the calm pose. Sizes: S is a day's work, M a few days, L a week or more.

Ported under `?world=2`: `intro`, `home`, `calm`, `auth` (batch 1 added its glow, orbit rings, loose cubes and pieces, and status panels, 2026-10-30), and (batch 1, 2026-10-30) `chain`, `record`, `open`, `links`, `ring` (the ring view is the chosen ring's rise and the page slab), and (batch 2, 2026-10-30) `idstart`, `idsign`, `idsafe`, `idyou`, `idvalue`, and (batch 3, 2026-10-30) `movie`, `resolve`, `layers`, `life`, `trace`, and (batch 4, 2026-10-30) `resolvers`, `fxn`, `stats`, `download`. `kit` is not ported: the Kit page is the editor's canvas only (see its row). The routes of batch 3 are `/how-it-works`, `/how-it-works/resolve`, `/how-it-works/layers`, `/how-it-works/life` and `/trace`; the first map wrote them as `/works...` (the page keys), and the site's paths are these.

## The views

| View | Route(s) | Stage file | What it draws | State keys | Page hooks | What moves | Beyond today's renderer | Size |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| intro (ported) | `/intro`, fresh `/` | intro-stage.js | nothing of its own: the network at n 0 | none | none | welcome arrival (x1.7 distance, +12 elev, -16 yaw, 3.2 s) | none | done |
| home (ported, settled frame only) | `/` inside the site | chains-scene.js base(), home-descent.js | 27 rings (178 tiles + links), 10 cubes, slots, shade, hub plate and beam, ground logo, chain marks, halo | none | `on('pick')`, `on('pickRing')`, `on('hover')`, `tags('home')` | 4 s first-visit build-up, ring lift under pointer, ring focus dimming, hub sinks into logo | left out: hover lift, picks, labels, build-up, descent block, helix, site panes, motes | M left |
| calm (ported) | every other route | world-host.js CALM | the home network, stepped back | none | none | pointer lean | none | done |
| auth (ported 2026-10-30, batch 1; the card is the owner's mesh) | `/auth` | auth-stage.js | glass card (body, edge frame, face text), 2 orbit rings, loose cube bits, glass status panels with holes, warning mark | s (11 states), net, b, ic | `whenReady`, `owns`, `state`, `select`, `covered` (skin-site.js) | pose eased per state (lift, tip, build, glow, gather, orbit, beam) | done: glow frames, torus rings, glass cubes, loose pieces, panels with holes and lit beads; left: the beads' pulse and the cubes' spin | done |
| chain (ported and finished 2026-10-30, batch 1) | `/chain` | chains-scene.js 519 | your ring re-formed into 5 record tiles, 5 links, key, running bead, page slab, faint network | r | `state`, `select`, `on('pick')`, `on('hover')`, `hoverRecord`, `tags('chain')` | morphs m, j, kk, p in order; ring turn 420-870 ms; picks and lift | text plates on tiles, translucent slab, lit bead lines, metal key | L |
| record (ported and finished 2026-10-30, batch 1) | `/chain/record` | chains-scene.js 523, record-glass.js | chain ring of 5, chosen tile forward, 3 earlier-version panes with "Rev NN" plates, dark glass shell with ember edge, ember pool, status lines | r, tab | as chain, `tags('record')` | ghosts fan out, ring turn, ghost lift, warm light | clearcoat glass, additive ember edge, text plates, ember pool | L |
| open (ported and finished 2026-10-30, batch 1) | `/chain/open` | chains-scene.js 525, record-glass.js | chosen tile widens into the page card, 4 other tiles, 4 links, ember line | r | as chain | card widen (s), swing, hover lift | translucent glass card, alpha-map text face | M |
| links (ported and finished 2026-10-30, batch 1) | `/chain/links` | chains-scene.js 524 | ring unrolled to a row: 5 tiles, 4 links, ghosts behind, 2 related tiles, key, signature line | r | as chain, `tags('links')` | unroll (l), retarget 800 ms on select, dots draw by reveal | reveal-drawn dots and lines, text plates | M |
| ring (ported and finished 2026-10-30, batch 1) | `/ring` | ring-stage.js | nothing of its own: sets one ring's rise on the network | i | `state`, `select`, `on('pickRing')`, `tags('ring')` | chosen ring rises (240 ms), others settle; click a ring to open | per-ring rise (a frame per ring or a rise record), ring hover lift | M |
| fxn (ported, 2026-10-30; no entry sweep, hub mark and ring stay) | `/fxn` | stages.js 321 | 100 supply tiles round the mark; hub mark lifts, hub ring sinks | g, tab | `state`, `select`, `on('pick')`, `tags('fxn')` | tiles rise in a sweep; tab swaps supply and fee layouts (1.3 s); chosen part lifts and tints | moving the hub's own mark and ring, per-tile pick and hover label | M |
| resolvers (ported, 2026-10-30) | `/resolvers` | stages.js 187 | one cube per resolver, one small cube per capability, outline edges for unchecked ones, reference dots | id | `state`, `select`, `on('pick')`, `on('stagePick')`, `tags('resolvers')` | chosen cube forward 1.5 and turned 45 degrees, its capabilities rise, staggered grow | edge outlines, lit lines, per-instance hover, pick and tint | M |
| resolve (ported, 2026-10-30) | `/how-it-works/resolve` | stages.js 87 | 6 record tiles, 12 mini tiles + 12 links, 3 computer blocks, 1 clearcoat resolver cube with 4 rule-face planes, dots, 3 check lines, 3 bead seals | step | `state`, `select`, `tags('resolve')` | step clock 0 to 5 (intents slide, resolver turns, result grows, copies arc, checks draw back); camera leans per step | lit lines, clearcoat, alpha-map faces, glyph tiles | L |
| layers (ported, 2026-10-30) | `/how-it-works/layers` | concept-stages.js 80 | 3 plates, 30 mini blocks, 18 capability cubes, 15 resolver cubes (66 boxes), up to 5 lit lines | s | `state`, `select`, `tags('layers')` | plates part on first arrival, chosen plate slides +0.7, tint, staggered grow | per-instance tint animation, lit-line beads | M |
| life (ported, 2026-10-30) | `/how-it-works/life` | concept-stages.js 127 | 19 solids (cube, 4 capability cubes, 2 tiles, 10 ring tiles, node block, key disc), 12 dashed and 12 lit cube edges, 6 lines | s | `state`, `select`, `tags('life')` | one clock through 5 beats (cube turns, tile drops in, ring grows, key rises, tint to teal) | cylinder, segment lines, glyph tiles | M |
| movie (ported, 2026-10-30) | `/how-it-works` | minute-experience.js 128 | nothing of its own: the home network with ring focus per beat, lit lines at beats 4, 5, 9 (the first map also named a logo light at beats 3 and 9; the code calls `W.logo.lit` only when it exists and it does not, so nothing lights) | s (0-9) | `state`, `select`, `DEFXNScene.refresh`, `tags('movie')` | 9 camera poses (600-2200 ms), focus sets, line draws | per-ring dimming by id, lit lines | S |
| trace (ported, 2026-10-30) | `/trace` | home-descent.js 305 | ground logo, proof line, 5 near-black glass blocks (clearcoat, grain, ember additive shell), bending line, ember pool, motes | s (record id) | `state`, `select`, `on('pick')`, `tags('trace')` | descent along the line and back | sorted real transparency, additive back-face shells, lines, text on blocks (all built; left out: the ember point light on the floor, the proof line's bright head; the motes belong to home) | L |
| idstart (ported, 2026-10-30) | `/identity` | identity-stages.js 140 | key-file chip, 28 ring tiles, app window, 9 mini tiles, cube, 3 product tiles (46 boxes), 2 text plates, 1 edge, 4 dotted lines | none | `state`, `select`, `tags('idstart')` | 1.5 s intro tween: edge, ring tile by tile, groups, lines | text plates, edge-light frame, dotted lines | M |
| idsign (ported, 2026-10-30) | `/identity/sign` | identity-stages.js 187 | window, 2 turning text plates, chip, 3 rack boxes, 6 glow spheres, 5 glow torus arcs, glow cross, 2 edge frames, 2 lines | s (1-3) | as idstart, `tags('idsign')` | sub-step tween; fingerprint rings light in turn; plate flips; camera aims 10% per step | glow (unlit over bloom), tori, turning text plate, red cross | L |
| idsafe (ported, 2026-10-30) | `/identity/safe` | identity-stages.js 250 | plinth, transparent glass vault cube, chip, 3 face-icon text plates, edge, 10 dashed bars | s (0-2) | as idstart, `tags('idsafe')` | 1.3 s intro; chosen face lights (170 ms spring) | transparent cube sorted over the chip, alpha text plates, dashes | L |
| idyou (ported, 2026-10-30) | `/identity/you` | identity-stages.js 311 | extruded hex badge, name slab, laptop, phone, 3 text plates, 2 edge frames, 2 lines | none | as idstart, `tags('idyou')` | 1.5 s intro: rim, devices (stagger .1), lines, screens | one extruded bevelled mesh, text plates, rim glow | M |
| idvalue (ported, 2026-10-30) | `/account` | identity-stages.js 370 | hex badge over your ring, 3 lit arcs and 15 dotted arcs (beads), the home network | none | `state`, `select` | 1.6 s intro draws arcs in turn; focus dims other rings | per-ring focus dimming, curved bead lines, badge mesh | M |
| stats (ported, 2026-10-30) | `/stats/now`, `/stats/capabilities`, `/stats/ceiling` | stats-stage.js 178 | one pool of 1,151 bevelled cubes and a base slab; 4 dotted outlines or a 28-bead line; about 70 tags | s, c, pt, pb | `state`, `select`, `on('stagePick')`, `tags('stats')` | each cube flies to its slot in the next formation (60-380 ms stagger, 1.15 s); chosen group tints orange | 1,150 instances flying between formations, per-cube pick and hover lift, per-instance tint | L |
| download (ported, 2026-10-30) | `/download` | download-stage.js | one glass lens plate with 3 holes over the kernel; the network re-posed per step (rise wave, build clock, focus) | s (0-4) | `whenReady`, `scene.select`, `scene.refresh` | 5 camera poses, rings rise nearest first (55 ms each), build clock rewound per step | glass with holes, build clock per tile, per-ring rise and focus, 5 frames | L |
| kit (not ported: editor only) | `/kit` | kit-stage.js, object-kit.js | 30 object builders (9 shown in a 3 x 3 grid), 9 floor plates, 9 rim outlines | b, p, s | `scene.kit.built/screen/selected`, `tags('kit')` | grow per cell, chosen lifts and turns (620 ms), tones ease to the skin | almost everything: atlas text and icons, glass, additive edges, tori, extrusions, skin tones | L |

Dead stages, not reachable from VIEW_OF, not to port: `minute`, `products`, `identity`, `nodes`, `status` (concept-stages.js) and `measured` (stages.js; `/measured` redirects to stats). The week pages of stats were retired.

## Batches

Order follows PORT.md step 2. A batch's first view lands the new renderer part; the rest of the batch reuses it.

| Batch | Views | Count | Sizes |
| --- | --- | --- | --- |
| 0 Finish the ported four | home leftovers (hover lift, picks, labels, build-up), auth states | 2 | M, L |
| 1 Chain views | chain, record, open, links, ring | 5 | L, L, M, M, M |
| 2 Identity views | idstart, idsign, idsafe, idyou, idvalue | 5 | M, L, L, M, M |
| 3 How it works (done 2026-10-30) | movie, resolve, layers, life, trace | 5 | S, L, M, M, L |
| 4 Stats, resolvers, FXN, download (done 2026-10-30; kit left out) | stats, resolvers, fxn, download | 4 of 5 | L, M, M, L |

Total 16 of the 17 views are ported beyond the four (kit is not), plus the two leftovers. Cheapest first inside a batch: movie (S, only ring dimming and lines), ring, links, open.

## How batch 4 was built

Batch 4 reuses batch 3's way: `scripts/lib/world-how-scene.mjs` runs `stages.js` (resolvers, FXN), `stats-stage.js` and `download-stage.js` with the recorders of `world-stage-eval.mjs`. A weight that follows a choice is a channel for each item (a resolver, a capability, a supply tile, an operation group). A line that hangs on a choice is a row that depends on that choice's weight. The stats cubes fly between formations by two weights and a stagger: each cube has its own start and takes its own time, and the stage's weight grows the whole part by one scale derived from the stage. The download window writes no rows for the rings: it writes each ring's rise as a channel value for each step, the build clock's hold, the rings it lights and one glass lens with holes. Kit stays on Three.js: `/kit` is the editor's canvas (the address needs `cms-preview=1`), and on the site Three.js draws the calm pose there.

## How batch 3 was built

Batch 3 does not restate its stages. `scripts/lib/world-stage-eval.mjs` runs the stage files' own text (stages.js, concept-stages.js, minute-experience.js, home-descent.js) with recorders in place of Three.js, and `scripts/lib/world-how-scene.mjs` reads the placed forms back as rows. One group for each view (`world/<cid>.flx`, a blob and a words file), fetched on the first flight to the view. What is left out of each view is in PORT.md.

## What the grammar renderer lacks (names the sizes above)

1. Text on faces: canvas text plates (idstart to idyou, chain, record, open, links, trace, kit, auth card). The renderer has no per-instance texture or text atlas.
2. Lines: lit segment ribbons and beads that draw by a reveal fraction, curved arcs, edge outlines. Only `dot` sprite runs exist.
3. Glass and transparency order: clearcoat and environment light, additive back-face shells, translucent solids sorted over solids (idsafe, trace, record, download). Draw order is fixed today.
4. Glass plates with holes (download, auth, home halo ports already stencil).
5. Extra unit shapes: torus, cylinder, extruded polygons.
6. Several independent morphs at once (chain: m, j, kk, g, s, l, p plus the ring turn). The renderer blends two frames by one number; sampled animation records are needed.
7. Per-ring state on the network frame: focus dimming, rise, build clock (ring, download, movie, idvalue).
8. Picking and hover lift on parts that are not rings (stats, resolvers, fxn, kit).
9. A second sub-viewport (home helix) and motes.

## Parity harness

`scripts/world-parity.mjs` measures PORT.md rules 1, 2, 4 and 5 for a route; rules 3 (hooks) needs one script per route.
