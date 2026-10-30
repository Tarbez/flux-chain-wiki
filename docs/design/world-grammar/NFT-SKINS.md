# The NFT card and the skins: what draws with Three.js, and the port

For the owner and the lane that ports step 3 of `PORT.md`. Mapped 2026-10-30 from the code, nothing run, nothing changed. Numbers below are line counts and greps unless it says measured.

## Short answer

Only one file draws with Three.js: `js/nft/art3d.js`, lines 975 to 1268 (about 290 of its 1,268 lines). The other 980 lines of it, the 17 builder files (`js/nft/builders/s*.js`, 8,226 lines, 248 `register` calls), `card.js`, `scene.js`, `skin-site.js` and `skin-parts.js` use no Three.js call at all. `skin-site.js` only waits for the Three.js script tag before it loads `art3d.js`. `skin-parts.js` is Ark UI part naming and has no 3D. So the port replaces one drawing back end, `paint()`, and drops one load.

## 1. What each file does

| File | Draws with Three.js? | What it does |
| --- | --- | --- |
| `js/nft/art3d.js` | Yes, from line 975 | Part 1 (no GL): reads the DEFXN mark, builds a MODEL of seven primitive lists from a card's DNA (`cube`, `glass`, `point`, `line`, `quad`, `bar`, `sphere`), seeded, same card gives the same art. Part 2 (Three.js): `renderer()`, `makeMaterials()`, `sceneOf()`, `paint()`, `warm()`, `dispose()`, `release()`, `use()`. Then Canvas2D for the calm mask, quiet masks, haze and glow. |
| `js/nft/builders/s*.js` | No | Pure maths into the model through `m.cube/glass/point/line/quad/bar/rod/sphere`. Stay as they are. |
| `js/nft/card.js` | No | One card: HTML words and SVG chrome over two canvases (`.nft-art`, `.nft-glow`). Calls `Art3D.paint` for hover tilt (rest x .1, y .24, plus up to .2 and .36), the object view (drag to turn, coast, arrow keys by 15 degrees, double click resets), and the PNG export, which paints again at export size. No idle frame loop. |
| `js/nft/scene.js` | No | Calls `Art3D.paint` with `object: true` and a view (`world`, `banner`, `panel`) for the page background, an avatar cut and a panel behind a header. Paints once per size, frees the GPU scene after. |
| `js/ark/skin-site.js` | No | `art()` loads sheet, mark, waits for the `DEFXNDependencies` tag (Three.js), then the recipe, then `art3d.js`. Applies the skin on `#scene`, fires `defxn:skin`, mounts the world layer (`DefxnScene.world`, only where the ring world is off) and the avatar. |
| `js/ark/skin-parts.js` | No | Which Ark UI part each hand-built piece is (navbar, mega dropdown), the site's off switches and contrast rules. |
| `js/ark/profile-card.js` | No | `DefxnCard.mount` on `/account`. |

## 2. Where it is used

- `/account`: the card on the profile (`profile-card.js` to `card.js`), seal, trade, mint. Only with a sample in the address (`?skin-sample=27|263|512`), a held card (`DefxnWear`) or the identity's chain card.
- `/auth`: the card front. `auth.js` draws the card off screen, `DefxnCard.toCanvas(card, 1)` makes one picture, and the auth view lays it on the 3D plate. Both worlds do this; under `?world=2` the picture goes to the grammar card mesh.
- Every route, when a skin is worn: the Ark UI skin (no 3D), plus the world layer and avatar from `scene.js`. The world layer never paints where the ring world runs (`reading()` in `skin-site.js`).
- `pages/world-minute.js`: `DefxnScene.cardArt` per art layer, 760 wide, and `DefxnSkinSite.preview`.
- `pages/kit.js`, `admin/skin-lab.js`, `admin/kit.js`: pictures of cards and previews through `DefxnSkinSite`.
- `DefxnScene.panel` has no caller outside `scene.js`.
- `index.html` loads only `skin-site.js` (line 213). Everything else loads lazily.

## 3. Three.js features the card depends on (all in `art3d.js`)

- Renderer: `WebGLRenderer` (antialias, alpha, `preserveDrawingBuffer`), `setPixelRatio(1)`, `setClearColor`, `outputColorSpace` sRGB, `toneMapping` none, `shadowMap` (PCFSoft), `setSize`, `render`, `dispose`, `forceContextLoss`. One shared renderer, read back with `ctx.drawImage(gl.domElement)`.
- Environment: `PMREMGenerator.fromScene(RoomEnvironment, 0.04)` (the only use of `RoomEnvironment`), `scene.environment`, `environmentIntensity` .5.
- Camera: `PerspectiveCamera` FOV 32 (zoom changes FOV for the object view), distance 350 / tan(16 degrees), aspect changed per view.
- Lights: `AmbientLight` .55, `DirectionalLight` key 2.6 with a 2048 shadow map over a box of 520 (bias -.0004, normal bias .8), and a rim 1.3 with no shadow.
- Geometry: `RoundedBoxGeometry(1,1,1,2,.14)`, `BoxGeometry`, `PlaneGeometry` shifted up .5, `SphereGeometry(1,48,32)`, `BufferGeometry` with `Float32BufferAttribute` and `InstancedBufferAttribute`.
- Objects: `InstancedMesh` (setMatrixAt, setColorAt, per-instance attributes), `Mesh`, `LineSegments`, `Points`, `Group`, `Object3D` as a matrix scratch, `Scene`, `renderOrder` 1 to 6.
- Materials: `MeshStandardMaterial` (rough .4, metal .08) for cubes with per-instance colour; `MeshPhysicalMaterial` for glass (opacity .12, rough .06, clearcoat 1, `envMapIntensity` 2.2, no depth write); five `ShaderMaterial`s with `CustomBlending` One/One additive and no depth write: lines (colour attribute), points (soft Gaussian or hard round, size in world units over depth), quads (fade, peak, bars along the streak, edge falloff), bars (fresnel pow 1.5 on a box), spheres (fresnel pow 2.6 rim, per-sphere colour and alpha). Output of each is `vec4(c, max(rgb))`.
- Math: `Color.setRGB`, `Vector3`, `Quaternion.setFromUnitVectors`.
- No textures, no render targets, no post-processing library, no bloom pass. The glow is Canvas2D: the art blurred at quarter size (5 px at .5 and 20 px at .35) and screened on in CSS or `compose()`.
- Not Three.js, stays: the mark read (`getImageData`), `raster()` of an element's SVG, the calm gradient mask, quiet ellipse masks, the haze gradient, the flat Canvas2D fallback `flat()`, the paint scheduler, the 2.6 million pixel cap, all pointer handling.

Interaction and animation: none run on their own. Tilt is one draw per pointer move, ease-back is 520 ms of frames that end, the object view coasts at most 1.2 s. Every draw is on demand, which the grammar renderer already does.

## 4. The grammar renderer today (what it has)

- Mesh pass (`fxn-3d/js/render/world2-mesh.mjs`): a PBR program (Lambert plus GGX, Smith, Schlick), key (shadowed), back, fill, hemisphere, flat env term, fog, exposure; material `{rgb, metal, rough, emission, opacity}` per draw; up to 8 point and spot lights; world from `WWORLD`; `drawPieces` draws opaque then sorted transparent; premultiplied output; textures (`uploadTexture`, sRGB with mipmaps, accepts any image source); `mountCard` with a yaw and an `opts.model` matrix.
- Renderer (`js/world2/world2-gl.mjs`): instanced solids, additive and blended passes, dots (`gl.POINTS`), flat modes (beam fade, textured, cut, grid, orbit), 2048 shadow map with a fitted box, offscreen targets (line 461), bloom (bright, blur, composite), draw on demand.
- Look grammar (`LOOK.md`): `WMATDEF`, `WMATUSE`, `WLIGHT`, `WWORLD`. Maps the card's cube material, key and ambient directly.

## 5. Gaps and the smallest shared addition for each

Each addition is a feature of the one renderer, switched by a field in a record or a flag on a part, never code for one card.

| # | The card needs | The renderer lacks | Smallest addition |
| --- | --- | --- | --- |
| 1 | A colour per primitive (any rgb, alpha) | Instance colour is a palette index (floats 12 to 14: tone, family, mix) | A part flag "direct colour": floats 12 to 14 are linear rgb, 15 is alpha. One branch in `toneColor()`. |
| 2 | Rounded box (2 segments, radius .14) and a 48 by 32 sphere | Only boxes and cylinders | Two more unit meshes in the geometry table (derived, about 40 lines). |
| 3 | Instanced PBR cubes under per-instance matrices | The GGX program draws one mesh with one `uModel` | Feed `INSTANCE_IN` (already used by the lit program) into the card program, so a mesh part may be instanced. One shader. |
| 4 | Glass: opacity .12, clearcoat, env reflection x2.2, no depth write | No clearcoat, no specular environment | Opacity and no depth write exist (`drawPieces`). Add one clearcoat term (second GGX lobe, fixed rough .05) to the card program, gated by a material field `coat`. |
| 5 | An environment map (RoomEnvironment through PMREM) | A flat room term only | One derived environment: a small equirect drawn once by a shader from the look's sky, ground and key, mip-filtered by roughness, sampled for diffuse and specular. Shared by all meshes, and it is also what the grid look needs for cube glass. The picture will not equal PMREM; parity is a measured pixel score. |
| 6 | 12 bright edge lines per glass cube, free lines | No line primitive | A `lines` part: `gl.LINES`, additive, direct colour. Glass edges are derived in the shader or the part writer from the box, not stored. |
| 7 | Soft Gaussian points | `DOT_FRAG` is a smoothstep disc | A per-instance soft flag in the dot shader (float 13). |
| 8 | Streak quads: fade, peak, bars | `FLAT.beam` fades along height only | Three more modes of the flat program (`fade`, `peak`, `bars` with segment count), selected by float 13 and 14. |
| 9 | Glow bars and sphere rims (fresnel, additive) | No fresnel-additive mode | One `glow solid` mode on the box and sphere meshes (exponent 1.5 or 2.6 by a field). |
| 10 | Antialiasing | `antialias: false`, no MSAA anywhere | Multisampled colour renderbuffer (4 samples) and a resolve blit in the target creator (line 461). Off for the full-page world, on for a card target. |
| 11 | Many cards and cuts on one page | One full-page canvas | A shared offscreen card context (what `Art3D` does with its one `R`), sized per paint, read back with `drawImage`. Reuse `createRenderer` on an `OffscreenCanvas` or a hidden canvas with `preserveDrawingBuffer`. |
| 12 | Perspective at FOV 32 with aspect, zoom and a sideways shift | `FOV = 12` fixed in `world2-gl.mjs` | Already exported `projection()`: pass the card's FOV, aspect and shift. No new code in the renderer. |
| 13 | Rotation about x and y (tilt, turn) | `yaw` only | `opts.model` already takes a full matrix. Build it in the card module. No addition. |
| 14 | Shadow over a box of 520 at 2048, off while the art moves | Shadow fit and size are fixed to the world | `shadowFit(c, r)` exists. The key's near and far change with the card scene. The "no shadow pass while moving" rule is the existing `shadowDirty` flag. |
| 15 | The card front as a texture for the auth plate | A live canvas as a texture | `uploadTexture` takes any image source, so a canvas works as it is. Add the anisotropy extension (one line). |
| 16 | The 2D after-effects: calm mask, quiet masks, haze, glow blur | Not 3D | Stay Canvas2D in `art3d.js` (shared by every view, not per card). The renderer's bloom is not a drop-in for the two-blur glow, so reusing it would change the picture. |
| 17 | A rim light with no shadow, a key and one ambient | The key, back and fill are palette-derived | `WLIGHT` and `WWORLD` carry them. The card sets its own look records (key 2.6, rim 1.3, ambient .55), no new code. |

## 6. Port plan

1. Split `art3d.js`: lines 1 to 974 stay as the model builder (no GL). Lines 975 to 1268 become a call into the grammar renderer. The model is the card's own derivation at run time from the record, so it is not stored and not authored; the seven lists are already the instance format in spirit.
2. Add a `card scene` writer in the card grammar (`card-reader.mjs`, same one-grammar rule): it turns the model into parts, one per primitive kind (cube, glass, line, point, quad, bar, sphere) in the 16-float instance format with the direct-colour flag. Its output is bytes handed to the renderer, never JSON.
3. Add gaps 1 to 11 as shared renderer features. Gaps 12 to 15 and 17 need no renderer change.
4. `paint(target, model, w, h, tilt, opts)` keeps its signature. `card.js`, `scene.js` and the three pages do not change. The signature is the seam.
5. `skin-site.js` `art()`: delete the `DEFXNDependencies` wait. `art3d.js` header and `profile-card.js` comments change from "needs three.js" to "needs the grammar renderer".
6. Parity, per the rule in `PORT.md`: card 263, 512 and 27, at rest, in the object view, hovered, at 1440x900 and in an avatar cut. Side-by-side pairs and a pixel score for a person to review. First frame, frame median and idle frames not worse. 0 page errors. `tests/nft-object-card.cjs`, `profile-card.cjs`, `skin-site.cjs`, `admin-skin-lab.cjs` exist; they are locked to the old back end and are rerun, not rewritten, after the owner confirms the look.

## 7. The skin rule

- SKIN-CONTRACT 1b was changed by the owner on 2026-10-24: the grid may transform with a worn card through 19 closed knobs, supplied by `DefxnSkin.recipe(record).gridLook`, drawn by the ring kit as `k.setGridLook`. The meaning colours, the chain kinds, the networks and `--ember` stay locked. `grep` finds no `setGridLook` in `js/`, so this is unbuilt.
- Section 4e still holds: the card's 2D world and art never cover the grid, and they show only where the ring world is off.
- The port keeps both structurally: the card draws into its own shared offscreen context (gap 11), never into the world's canvas, never with the world's palette or look records. A card skin cannot recolour the grid through this port. The grid look, when built, goes through a world record, not through card code.
- Check to add to the harness: with sample 263 worn, the grammar world's pixels outside the card's box equal the same frame with no skin, to one step of rounding.

## 8. Size

- Removed: about 290 lines of Three.js code in `art3d.js`, one script wait in `skin-site.js`. Three.js itself (724 KB) leaves only when the other 20 views are ported.
- Added, estimated not measured: about 400 to 500 lines across `world2-mesh.mjs` and `world2-gl.mjs` (card program instancing and clearcoat 60, geometries 40, lines, dots, quads, glow solids 150, environment 80, MSAA target 30, direct colour 20), plus about 120 lines for the card scene writer and its labels. Primitive counts per card are not measured; they need a browser run of `Art3D.build` on the three samples, which is the first task of the lane.

## 9. Open points for the owner

- The card design and data fields are unconfirmed (SKIN-CONTRACT header), so the lane builds and hands over; no tests until you confirm.
- Gap 5: the grammar environment will not equal Three's PMREM room. If you want the exact room look, the lane can instead bake the room's light layout once, at build time, into a mip chain.
- `ArkWorldHost.owns()` and `covered` under `?world=2`: `reading()` in `skin-site.js` assumes the Three.js host. Whether the grammar host answers them was not checked.
