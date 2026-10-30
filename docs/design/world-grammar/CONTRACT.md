# World grammar: the build contract

> Moved 2026-10-29: `MESH.md`, the mesh library and the editor docs now live in the `fxn-3d` repo (`flux/fxn-3d/docs/design/world-grammar/MESH.md` and `flux/fxn-3d/docs/design/editor/`). This site imports the engine through `scripts/lib/fxn-3d.mjs`.

For the two builders: the encoder (Node, build side) and the decoder (browser). Both read this file and `README.md` first. The owner confirmed the design on 2026-10-29 ("Let's do that") and slice 1 on screen the same day ("we are good to go"). Slice 1 is the network seen on `/intro`, `/` (home) and the calm pose under every reading page, switched on with `?world=2`. The Three.js world stays as it is and still runs without that flag. Nothing is committed. `tests/world-grammar.cjs` locks what was confirmed: every record reads, the encoder is idempotent and matches what is under `world/`, every frame's bytes are its parts' instances x 64 with every part inside, the atlas audit has zero findings. After the confirmation the floor came in (the parts from `grid` down in the table below, the `LOGO` record, the shadow map).

## Files and owners

| Path | Owner | What |
| --- | --- | --- |
| `scripts/world-encode.mjs` | encoder | derives records and frames; writes everything under `world/` |
| `world/world.flx` | encoder | every record, one per line, `\n` separated, ASCII only |
| `world/<cid>.bin` | encoder | a frame blob, content-addressed: `cid` = sha256 hex of the bytes |
| `world/<cid>.png` | encoder | the DEFXN mark, from `js/ark/mark-data.js` (its data URI decoded once) |
| `world/<cid>.svg` | encoder | a chain mark as a white mask: the ARK polygon and the CR3TV stand-in letters, lifted from `js/world/chain-marks.js` (the one source the live world draws from), centred, SVG y down toward the camera; named by a `WLOGO` record |
| `js/world2/world-reader.mjs` | encoder | the reader, regenerated from the labels through the atlas on every run |
| `docs/design/world-grammar/*` | encoder | labels, reader copy, README table kept in step |
| `js/world2/*.mjs` except the reader | decoder | the browser side |
| `js/world/world-host.js` | decoder | one guard line only: with `?world=2` it returns before it touches anything |
| `index.html` | decoder | one `<script type="module" src="js/world2/world2-host.mjs">` tag |

The encoder has no dependencies: Node built-ins only, no Three.js, no JSON output. The decoder has no dependencies: WebGL2 and the generated reader. No WASM anywhere. No JSON anywhere on the wire or on disk.

## Records (the grammar in README.md, plus two labels added here)

Added labels, both number text: `J` fit height, and `V` reused on a VIEW record as the fill factor. The encoder adds `J` to `world-grammar.labels.json`, reruns the atlas audit, and regenerates the reader.

```
WRING-I<i>-K<kind>-X<px>-Y<py>-D<width px>-Q<tiles>-S<tone>[-P<parent>]
WCUBE-X<px>-Y<py>-S<tone>
WLABEL-F<kind>-X<px>-Y<py>
WKNOB-G<group>-N<name>-V<value>
WVIEW-R<view>-X<aim x>-Y<aim y>-Z<aim z>-D<fit width>-J<fit height>-V<fill>-H<elev deg>-U<yaw deg>-T<tilt>-B<step back>
WVIEW-R<view>-X-Y-Z-D<distance>-H-U-T-B          (no J: D is the camera distance itself)
WEXIT-R<view>-E<up|side|zoom>
WMARK-C<cid>
WLOGO-I<ring>-C<cid>                              (one per marked ring, in chain-marks.js MARKS order = the mark part's instance order)
WFRAME-R<view>-C<cid>-A<bytes>
WPART-R<view>-M<part>-O<byte offset>-A<instances>
```

Views in slice 1: `intro`, `introtall` (the decoder picks it when the aspect is under 0.9), `home`, `calm`. Their numbers come from the stages: intro from `js/world/intro-stage.js` (`fit(66, 72·sin 72° + 2, asp, .96)`, aim `(0,0,9)`, tall `(0,0,24)` with dist × .62, elev 72, tilt 1.4), home from `chains-scene.js` `base()` (dist 99, elev 24, tilt 2.4, aim 0), calm from `world-host.js` CALM (dist 135, elev 30, tilt 1.2, n .6). `fit(w, h, asp, fill) = max(w / (fill·2·TAN·asp), h / (fill·2·TAN))`, FOV 12, `TAN = tan(6°)`.

Picture coordinates (`X`, `Y`, `D` on RING, CUBE, LABEL) are the owner's 601×436 picture. The encoder, not the browser, casts them into world units exactly as `ring-kit.js k.at(u, v, h)` does: a camera of FOV 12, aspect 601/436, placed by `place(cam, aim 0, dist 99, elev 24°, yaw 0)`:

```
position = aim + dist · (cos(elev)·sin(yaw), sin(elev), cos(elev)·cos(yaw)),  looking at aim, up +Y
```

and the ray through NDC `(u·2−1, 1−v·2)` meets the plane `y = h`. The ring cast iterates three times as `chains-scene.js` lines 53-61 (`R`, `t`, `h = t·MID`), with `SLOT = 1.28`, `HALF_D = .15`, `LIFT = .16`, `MID = LIFT + .5`. Rings float: every ring but the hub has `c.y = hoverOf(rank)`, `hoverOf(rank) = 1.7·(.62 + .76·((rank·.618034) mod 1))`, rank = order by distance from the hub centre. Children rings (`N.CHILDREN`) as lines 73-79.

## The frame blob

Little-endian Float32, one part after another, each instance 16 floats, 64 bytes:

```
[0..11]  the instance's affine matrix, column-major 3×4: c0.xyz, c1.xyz, c2.xyz, translation.xyz
[12]     tone      index into the palette below
[13]     family    index into the palette (0 = none)
[14]     mix       0..1: how far the tone leans to the family colour (.4 for a chain in a network, .9 for the network ring itself, 0 for none)
[15]     alpha     0..1 opacity (1 for solids)
```

Tones are indices, never RGB: the browser resolves them from the live theme tokens on paint, as `ring-kit.js readTheme()` does today, so a theme change repaints with no new blob.

| index | token | index | token |
| --- | --- | --- | --- |
| 0 | `--chain-identity` | 9 | `--text-muted` |
| 1 | `--chain-resolver` | 10 | `--canvas` |
| 2 | `--chain-token` | 11 | `--record` |
| 3 | `--chain-pool` | 12 | `--text-strong` |
| 4 | `--chain-network` | 13 | `--text` |
| 5 | `--chain-ledger` | 14 | `--net-fxn` |
| 6 | `--chain-other` | 15 | `--net-deark` |
| 7 | hub: identity mixed to strong by .25 | 16 | `--net-cr3tv` |
| 8 | `--signal` | 17 | `--ember` |
| 18 | `--primary` (the halo's glass) | 19 | `--primary-300` (its deep tone) |

Family: the ring's outermost network (`N.IDS` fxn → 14, deark → 15, cr3tv → 16); the DEFXN kernel has none.

## Parts and their unit geometry

The decoder builds each unit shape once, procedurally. The encoder only writes matrices.

| part `M` | unit shape in the decoder | encoder places it |
| --- | --- | --- |
| `tile` | box 1 × 1 × 0.28, centred, a 0.028 bevel faked in the shader by edge darkening | `ringFrame(c, R, θ, t)`: basis `bx=(sin θ,0,−cos θ)`, `by=(0,1,0)`, `bz=(cos θ,0,sin θ)`, scale `t`, position `c + (R cos θ, 0, R sin θ)`; one per tile, θ = π/2 + i·2π/n; tone = the ring's kind, family and mix as above |
| `link` | box 1 × 0.24 × 0.12 | the same frame at θ + half step, scale `t`, then x-length × .62 (`placeLink(.., .62)`); tone 6 (other) mixed to canvas .45 → write tone 6, family 10, mix .45 |
| `cube` | box 1 × 1 × 1 | at `k.at(x/W, y/H, 1.7 + .25)` with y = 1.7, scale .5, turned `.3·i` about Y; tone from the picture tone: L → 0, T → 8, D → 6 |
| `slot` | disc radius 1, thickness .12, facing +Z | at each outer ring's centre at `c.y + t·MID`, scale `sr` (`R·.17` for a network ring, else `min(R·.42, t·1.1)`), tilted to face the camera by the decoder (it rotates slots to the camera elevation each frame, as `chains-scene.js` 869-872); tone 10, alpha .62 |
| `dot` | a point sprite; size = scale.x | the dotted spokes, nearest-neighbour lines, cube stems and the two hub orbits, as `chains-scene.js` 293-325 and `ring-kit.js k.dots`: step .17 and size .055 for lines, step .3, size .045 for orbits; y + .02; tone 9, alpha = lit |
| `ring` | flat ring, radii .97..1, facing +Y | the echo under each floating ring: at `(c.x, .025, c.z)`, scale `outer`; tone = ring kind, alpha .4 |
| `shade` | disc radius 1, facing +Y | under each floating ring: `(c.x, .02, c.z)`, scale `outer·(1.05 + h·.04)`; tone 10, alpha .5 |
| `ground` | disc radius 1, thickness .06 | the kernel plate at the hub centre, y .03, scale `HUB.R·1.02`; tone 10 (the decoder draws rim, wall and the mark on top from `WMARK`) |
| `beam` | cylinder radius 1, height 1 from y 0 to 1 | at the hub centre, scale (.045, 7.5, .045) core and (.24, 7.5, .24) glow with alpha .28; tone 8 |
| `grid` | unit square facing +Y. the decoder draws the lines in the shader: one every 2 world units (`ring-kit.js k.floor line()`), .4 strong, fading from .4 R to R round the instance's centre | one instance: `k.floor(HUB.c, 46)`, at `(HUB.c.x, .004, HUB.c.z)`, scale 92 (2 R). tone 9, family 8, mix .25 (muted leaned to signal), alpha .2 |
| `orbit` | flat ring facing +Y. the vertex shader opens it half a unit either side of the instance's radius and the fragment draws a one-pixel line at the radius (the same `line()` on r / 6, as k.floor's rings) | one per radius 6 k inside R: 7 at R 46, at the floor's centre, scale 6 k. tone as the grid, alpha .75 x (1 - smoothstep(.4 R, R, 6 k)) x .2, the fade of its own radius |
| `pool` | unit square facing +Y. the fragment draws `home-descent.js radial()`: full at the centre, .467 at .35, gone at the edge | one instance, the kernel's glow on the floor (`logoPool`): `(HUB.c.x, .006, HUB.c.z)`, scale 4.8 RP (2 x RP x 2.4). tone 8, alpha .16 (signal x .16 at the settled logo). additive |
| `mark` | unit square facing +Y, textured by the ring's `WLOGO` mask. drawn three times as `glass-kit.js inlay` paints: the body cut dark (canvas x .42, plain), the glass sheet in its tone at .3 (plain), its lit edge (tone x 1.25, additive. the mask worn by .05 world units in the mask's pixels) | one per marked ring: `(c.x, .006, c.z)`, scale (R x span, 1, R x span x h / w) with span and the mask's w, h from chain-marks.js. tone = the ring's network (`--net-deark` 15, `--net-cr3tv` 16), alpha 1 |
| `catch` | unit square facing +Y. the fragment is black where the key light's shadow falls (`ShadowMaterial`) | one instance, `k.shadow(HUB.c, 120, .38)`: `(HUB.c.x, .003, HUB.c.z)`, scale 120. tone 10, alpha .38. drawn only when the decoder has a shadow map |
| `halo` | flat ring facing +Y, lit as a solid. its inner radius is the instance's y column over its x column (a flat ring has no height, so the column is free) | the glass halo over the kernel (`glass-kit.js`, R = the hub's outer radius, y 1.1): instance 0 the back ring, outer 2.25 R, inner 1.85 R, at `+(.12 R, -.08, .06 R)`, tone 19, alpha .32. instance 1 the front ring, outer 1.95 R, inner 1.16 R, tone 18, alpha .2. Drawn plain-blended after the echoes. the last instance only where no port is marked |
| `port` | disc radius 1 facing +Y. drawn into the stencil only, never in colour | the front ring's port holes, one per network chain, derived: on the line from the kernel to the chain, at 1.58 R, radius .24 R, y 1.1. tone 10, alpha 1 |

The halo is shown at 1 on intro, .6 on home and 0 elsewhere in the Three.js world. Slice 1 serves every view from one blob, so it shows at 1 everywhere until views carry their own blobs. The halo's glass also reads darker here than in Three.js (measured 2026-10-29 at the same spot, sRGB: 39/24/17 against 93/49/31): its MeshPhysicalMaterial takes diffuse light from the PMREM room environment, which this renderer carries as one flat term (`envstrength`), the model the owner confirmed on the tiles.

The floor parts (`grid` down to `catch`) are drawn before the solids, blended onto the cleared target with no depth write, so the plate and the tiles cover them where they stand. Depth-testing them against the plate's top instead showed as streaks: that top is .054 units up, a few 24-bit depth steps at the intro's 349 units of distance.

Left out, and why. The ember pool (`home-descent.js emberPool`) lights the floor under the record-descent block only while that card is open (`el` from the descent's reveal), which no slice-1 view has settled. The motes, the shaft and the logo's point light (`k.lights.logo`) are atmosphere on lit surfaces this renderer's Lambert terms do not carry yet. The DEFXN kernel's label and the rings' hover labels are words, not parts.

Hover lift, the first-visit build-up and the beam's rise stay in the decoder as time functions. Slice 1 draws every part in its settled state at once; the build-up is a later slice.

## The card (MESH.md)

The owner's 3D card stands on the kernel on `/auth`. Its pipeline is in `MESH.md`: `scripts/world-encode-card.mjs` reads the glTF once (outside the repo) and writes one mesh blob, its textures and `world/card.flx` (`WMESH`, `WTEX`, `WPLACE`; `W` carries the three kinds, no new letter). The records read through the one reader. The view is `WVIEW-Rauth` here (`js/world/auth-stage.js target()`: aim at the kernel's cast centre plus CY x .55, fit RH x 4.3 by RH x 3.1 at .96, `authtall` RH x 3.2 wide, elev 22, yaw -14, tilt 1.1, back .6) with `WEXIT-Rauth`. A view with a camera record and no frame of its own may carry a mesh: the host fetches `card.flx` on the first flight to it, mounts the mesh through `js/world2/world2-mesh.mjs`, and the renderer draws it opaque after the parts in the rings' light, turned to the camera's yaw, cast into the shadow map by an eighth program (`depthm`). The mesh is a rebuild of at most nine clean parts, each one extruded polygon derived from the model's own height map, levels, directions and chamfer (MESH.md "The fourth cut": nine parts, nine draws, 1,101 triangles, 33 KB); before it, the outer skin re-meshed as ONE closed shell (MESH.md "Defects found": the first cut simplified each of the 146 primitives alone and tore every seam; the second decimated the glued parts as they were, and the owner still saw pieces; the third voxelizes the welded body, floods the outside, meshes the solid's boundary by surface nets and projects it back onto the original skin: 1 component, 0 open edges, 0 non-manifold edges) with base colour, metal and roughness per material in its draw table (blob version 2). Its program is physically based (metal workflow, GGX, Schlick fresnel, the key, back and fill lights plus the hemisphere and room term as ambient) and it RECEIVES the key light's shadow: `R.meshLight()` carries `shadow` (the map's sampler, light matrix, normal offset, bias and tap spread) and `world2-mesh.mjs drawMesh()` reads the map with the same 3 x 3 compared taps as the lit program.

## Camera and the frame of the page

The decoder keeps the Three.js host's contract with the pages (`world-host.js`, section "what a page tells the world"): `window.ArkWorldHost` with `version`, `ready`, `failed`, `owns()`, `whenReady(fn)`, `fly(key)`, `state()`, `select()`, `on()`, `tags()`, `viewFor()`, `keyOf()`, `calm`, `viewOf`; the `[data-stage]` box of the mounted page is the frame the camera fits (`hooks.frame`), via `camera.setViewOffset` semantics; the words' rise (`ArkUI.worldRise`) and `--rise-*` variables as today. The redirect of a fresh `/` to `/intro` stays. The canvas is the same `#chains` in a `.world-layer` before the persistent layer, and `root.dataset.world` goes `loading` → `on`.

Light: the knobs of `WKNOB-Glook-*` (key strength and direction, back, fill, sky, exposure, contrast, fog start and end as multiples of the view distance). Colours of the lights as `ring-kit.js paint()`: key = strong→record .45, fill = text→resolver .6, rim = text→signal .35, sky = text→resolver .55 with ground = canvas. Post: one quarter-size bright pass, one blur, one composite with exposure and contrast; no MSAA. Pixel ratio capped as today: `min(dpr, 1.5, sqrt(2.6e6 / (w·h)))`.

Shadows (after slice 1): one 2048 x 2048 depth map from the key light. Its camera is an orthographic box round the view's aim, half-width 40 for the network's views and 14 for the calm pose (`chains-scene.js shadowR`, `ring-kit.js key.shadow`: offset (-30, 26, -8), near 1, far 140, bias -.0004, normal offset .03, radius 9). The map is read with a 3 x 3 of hardware-compared taps (PCF). The casters are the box parts: tile, link, cube. The receivers are those boxes and the `catch` part. Only the key light's term is shadowed. The map is drawn again only when the box or the blob changed, so a settled frame draws no depth pass. The measurement's `__world2.redraw()` forces the pass so the number carries the whole cost. Eight programs: lit, dots, flat, depth, depthm (a mounted mesh's depth), bright, blur, comp.

## Renderer API (what a host or a card writer may call)

The renderer is `js/world2/world2-gl.mjs` (`createRenderer`, `createCardContext`) and the PBR mesh pass is `/fxn-3d/js/render/world2-mesh.mjs`. Both are proved scene by scene on `world/look-test.html` (scenes in `world/look-scenes.mjs`; `__look.scenes` lists them). Eight renderer programs and one mesh program. None was added for these features. Unit shapes are generated once by `/fxn-3d/js/render/world2-shapes.mjs` (rounded box, UV sphere, torus, prism) for both files.

**A part** is `{ part, offset, count, ...flags }` over the frame blob (16 floats per instance). Flags a part may carry:

| Flag | Meaning |
| --- | --- |
| `direct` | floats 12 to 14 are linear r g b and 15 is alpha, not palette indices (the card's own colours). A direct dot or line adds light. |
| `shape` | the unit shape for `solid`, `glow` and sorted parts: `cube sphere round torus`, or a name added with `R.addShape(name, { pos, nrm, uv, idx })` (`prism(outline)` for an extruded polygon). A plate with holes is a mesh blob from the encoder, not a unit shape. |
| `pass` | `blend` (lit, premultiplied, back then front faces) or `shell` (back faces only, fresnel glow, added). All such parts draw after the opaque world, sorted far to near across every part by their instances' centroid; `sort: true` also sorts the instances inside a part (up to 8192). |
| `state`, `morph` | GL buffers from `R.buffer(Float32Array)`: `state` is 3 floats per instance (dim 0..1, lift in world units, morph weight 0..1), `morph` is 16 floats per instance, the matrices to blend toward. `R.setDim(a)` sets the alpha a fully dimmed instance keeps. Both are the host's to drive. Update with `R.updateBuffer`. |
| `tex` | on a `text` part: the content id of a canvas the page drew once and gave to `R.setTexture(cid, canvas)`. One plate per part. It draws blended with a polygon offset so it wins a tie with the face it lies on. |
| `soft`, `drift` | on a `dot` part: `soft` 0 disc, 1 gaussian, 2 the card's hard disc; `drift = [amplitude, speed]` makes motes wander on `R.setTime(t)`. The renderer never schedules a frame: the host calls `render` again only while its view says it moves. |
| `reveal` | on a `line` part: draws the segments whose parameter is at most `reveal` (default `R.setReveal`). |

**Lines** (`part: 'line'`): one segment per instance, constant pixel width. `iC0` and `iC1` are the two ends, `iC2.x` the width in pixels (0 means 1), `iC2.y` and `iC2.z` the reveal parameter at each end. An arc, a bead string or an edge outline is a run of segments. Beads are `dot` instances on the same points.

**Other parts**: `solid` (opaque, lit, any shape, casts into the shadow map), `glow` (fresnel-additive solid, `glow = [base, gain, exponent]`, `front: true` for front faces only), `text`. Streak strips use the card path below.

**Sub-viewport**: `R.render(cam, fogDist, force, insets)`, each inset `{ rect: {x, y, w, h} in device pixels from the bottom left, cam, fogDist, list: R.makeList(cid, buffer, parts) }`, drawn into the main target over the main picture before the post pass, with no shadow read.

**MSAA**: `R.resize(w, h, 4)` makes the main target multisampled (`R.msaa` says how many samples the driver gave). The full-page world passes 0.

**The card path** (one shared context for all cards, `createCardContext()`, an OffscreenCanvas where the browser has WebGL2 on one): `R.cardScene([{ kind, data }])` with kinds `lines points soft streaks bars orbs` (direct colour, additive), `R.renderCard(scene, { proj, view, eye, fov, w, h, samples, mesh })` where `mesh()` calls `drawPieces` of the mesh pass for the cubes and the sorted glass. The page then calls `drawImage(R.canvas, 0, 0)`. Streak instances put `(mode 0 fade | 1 peak | 2 bars, bar count)` in the z column of the matrix. `R.cardShadow(items, lightVP, opts)` draws the key's map and returns the `light.shadow` record.

**The mesh pass**: a mesh draws instanced when `o.inst = uploadInstances(gl, up, Float32Array)` (matrices in natural size: the shader folds in the mesh's half extents). Material fields `coat`, `coatRough` (clearcoat lobe) and `env` (specular environment scale). `light.envMap = uploadEnvironment(gl, await fetchEnvironment())` lights every mesh from the baked room `world/room-env.bin` (written by `scripts/room-env-build.mjs` from three's RoomEnvironment source: diffuse as nine spherical-harmonic terms, specular as six roughness mips); `light.envInt` scales it. It does not equal PMREM exactly. Transparent instanced pieces are sorted back to front per view (`sortInstances`), and `o.faces = 'front'` draws one-sided.

## Measured targets (from README.md)

Boot requests, bytes of 3D code, frozen main thread, draw calls, triangles, frame time. The harness is the parent session's; the builders report what they measured themselves with the device and size.

## Stage records (2026-10-30, STAGE.md)

Nine record kinds join `W`: `STATE SET CHAN SPAN ITEM FOLD SPOT NAMES CAM`; `L` (the last free letter) is a key's curve on `CHAN` and the pick flag on `PART`. The stage writes the renderer's per-part `state` (dim, lift, morph) and `morph` streams through `R.buffer` and `R.updateBuffer`, reads them from items, and asks nothing of the draw code. The sampler is served at `/fxn-3d/scripts/lib/anim-sample.mjs` (serve-site.mjs and the pack name that one file).
