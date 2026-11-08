Layer: app. Row: "App: a product a person opens: its pages, plus any backend an operator runs. It serves a person, and the network does not need to agree on what happens inside it." A film is a records file a person makes and plays. No node reads it. Inside fxn-3d's own engine table (`engine/layers.mjs`) its pieces sit at grammar, sim, render, adapters and apps, named below.

# Motion: 2D motion on the fxn-3d clock

Reader: the engineer who builds it. Status: a plan, 2026-11-07. Nothing here is built, tested or confirmed. The owner's words: "build 2d motions like hyperframes but using our own dense wired grammar resolvers, like fxn 3d but for motion, so we can reach true cinema combined with our 3d fxn engine."

What it is: a film is one records file in its own grammar. It holds 2D layers (words, shapes, solids) and 3D shots (exported fxn-3d documents) on one timeline of frames. One sampler gives every layer's state at a frame. One renderer draws the 3D shot, then the 2D layers over it in the same canvas. One tool writes the frames out as PNG files named by the hash of their pixels, so the same file gives the same frames.

## Home

All code lives in `flux/fxn-3d`. Nothing is copied into defxn: defxn imports from fxn-3d and holds no copy (fxn-3d README, "What defxn takes from here"). This document lives here because the owner asked for it here. The code's design notes grow in this one file.

Why fxn-3d: every part a film needs is already there, and a second home would duplicate each one.

| Need | What fxn-3d has | Where |
| --- | --- | --- |
| the grammar engine | one engine reads every `.fxn` grammar. `npm run grammars` finds grammar files by reading the folder | `engine/grammar/grammars.mjs`, `scripts/grammars-check.mjs` |
| the key law | one sampler: hold, ease into a key, step, clamp before the first and after the last key | `scripts/lib/anim-sample.mjs` (`channel`, `easeOf`) |
| which frames a name means | `framesToRender(anim, which)`: a shot, `sequence`, or the range | `scripts/lib/anim-sample.mjs` |
| 2D vector fill on the GPU | made maps: outlines filled by the nonzero rule through the stencil, 4 samples a pixel on edges, byte-space source-over blending as a 2D canvas blends | `engine/render/paint-maps.mjs`, ops in `scripts/lib/paint-ops.mjs` |
| letter outlines | the font reader the mesh builder uses: glyph outlines in thousandths of an em | `scripts/lib/mesh/font.mjs`, `outline.mjs` |
| constant-width lines with a reveal | the world look's `line` part: one segment per instance, reveal at each end | `js/render/world2-look.mjs` (CONTRACT.md "Lines") |
| a scene drawn at a frame on demand | the web player, `drive: 'seek'`: it redraws only on `seek(frame)` | `engine/adapters/web-player.mjs` |
| a frame to a texture | `frame.mjs` draws into an offscreen target and resolves it | `engine/render/frame.mjs` line 310 |
| frames out, named by hash | F13: `world/render/<doc>/<shot>/<sha256>.png` and a `frames` list. A second run gave the same list | `engine/adapters/headless-render.mjs`, `scripts/render-helper.mjs`, PLAN.md F13 |
| a video from frames | `writeVideo` pipes raw RGBA into ffmpeg | `scripts/lib/video-export.mjs` |
| an exact scene state by cid | a pack is the document's snapshot plus every blob it draws, hashed | `scripts/lib/embed-export.mjs` `packOf`, `engine/sources/cid-store.mjs` |

Modules to add, each at its engine layer:

| Module | Layer | Job |
| --- | --- | --- |
| `engine/grammar/motion.fxn` | grammar | the grammar, found by the folder walk |
| `engine/sim/motion-sample.mjs` | sim | `readFilm(text)` and `sampleFilm(film, frame)`. Pure: no page, no fs |
| `engine/render/motion-draw.mjs` | render | the 2D pass over the finished picture |
| `engine/adapters/web-motion.mjs` | adapters | mounts the shot packs, drives the player's `seek`, runs the pass each frame |
| `world/motion.html` | apps | the film page, as `world/video.html` is the video page |
| `scripts/lib/motion-export.mjs` | apps | frames out, then video out through `video-export.mjs` |

One change to a file that exists: `scripts/lib/anim-sample.mjs` exports `channel`. It is the key law, and the 2D sampler must not hold a second copy.

Not reused: the cinema grammar (`world/cinema/cinema.fxn`, `engine/runtime/cinema.mjs`). It is a game cutscene runner on a millisecond clock with actors and walks. A film runs on frames. A game cinematic is not a shot source in v1. Debt seen, not fixed here: `cinema.fxn` sits outside `engine/grammar`, so `npm run grammars` does not find it.

## The grammar

File: `engine/grammar/motion.fxn`, grammar `MOTION` version 1, written once by `world/motion/tools/make-grammar.mjs` from the table below, as the cinema grammar was written. After that the `.fxn` file is the source and the check reads it. A film is a `.fxn` records file whose first line is `WFILM`. Labels are this grammar's own. Nothing is reserved in an own grammar (atlas README, "Two kinds of grammar").

Labels: `W` the kind (closed set). `I` digits, a layer id. `A` digits: a frame, a count, a size in pixels, a curve, a mode. `N` a name. `K` the layer kind, a closed set. `V`, `X`, `Y` number text (`m` minus, `p` point, `scripts/lib/number-text.mjs`). `T` free text as hex of UTF-8. `C` a content id, 64 hex.

| Kind | Boxes, in order | Meaning |
| --- | --- | --- |
| `WFILM` | `N<name> A<rate> A<width> A<height> A<frames>` | the film: rate 1..120, the picture size in pixels, the length in frames. One per file, the first line |
| `WCUT` | `N<name> A<first> A<last>` | a named stretch of the timeline. Drawn out by name. The sequence is the cuts in start order |
| `WLAYER` | `I<id> K<kind> A<in> A<out>` | a layer, on screen from `in` to `out`, both drawn. Kind: `words`, `shape`, `shot`, `solid`. Line order is the stacking order, first at the back |
| `WWORDS` | `I<layer> C<font> V<size> T<text>` | the words of a words layer. The font is a `WFONT` cid the studio already stores. Size is the em in pixels. The layer's local origin is the top left of its text box, y down, the same as `WKEYP`. Glyph polygons and DOM captions both use it |
| `WSHAPE` | `I<layer> A<mode> (X Y){3,}` | one outline of a shape layer, in pixels. Mode 0 adds, 1 cuts. The spelling of `WPSHAPE` |
| `WFILL` | `I<layer> V<r> V<g> V<b> V<a>` | the fill, 0..1. A solid layer is a fill over the whole picture |
| `WSTROKE` | `I<layer> V<width> V<r> V<g> V<b> V<a>` | the stroke, width in pixels |
| `WSHOT` | `I<layer> C<pack> N<shot> A<frame>` | a 3D shot: the pack of an exported document, the `WSHOT` name inside it, and the document frame shown at the layer's `in` |
| `WANCHOR` | `I<layer> I<shot layer> X Y V<z>` | a 2D layer pinned to a 3D point of a shot: its place is that point through the shot's camera at every frame |
| `WMASK` | `I<layer> I<mask layer>` | the layer shows only inside the mask layer's shapes |
| `WKEYP` | `I<layer> A<frame> X Y` | place, pixels from the top left, y down |
| `WKEYS` | `I<layer> A<frame> X Y` | scale about the place point |
| `WKEYR` | `I<layer> A<frame> V<degrees>` | turn about the place point |
| `WKEYO` | `I<layer> A<frame> V<opacity>` | opacity 0..1 |
| `WKEYV` | `I<layer> A<frame> V<reveal>` | reveal 0..1: the share of ink characters shown, or the share of the stroke's length drawn |
| `WHOLD` | `I<layer> A<frame> A<frames>` | as the animate grammar: the value stays for that many frames after the key |
| `WEASE` | `I<layer> A<frame> A<curve>` | as the animate grammar: the curve of the move into that key, 0..7 |
| `WUNKEY` | `I<layer> A<frame>` | remove that layer's keys at that frame |

One example line each:

```
WFILM-Nfirst-A30-A1280-A720-A150
WCUT-Nopen-A0-A119
WLAYER-I1-Kshot-A0-A119
WSHOT-I1-C<pack cid>-Nopening-A0
WLAYER-I2-Kwords-A0-A149
WWORDS-I2-C<font cid>-V64-T464952535420435554
WFILL-I2-V1-V1-V1-V1
WKEYP-I2-A0-X120-Y560
WKEYO-I2-A0-V0
WKEYO-I2-A12-V1
WEASE-I2-A12-A2
```

What determines each shape (derive, don't author):

- The key kinds, `WHOLD`, `WEASE` and `WUNKEY` are the animate grammar's own rows with a layer in place of a piece. One key law, one sampler.
- `WSHAPE` is `WPSHAPE` of the look grammar, in picture pixels: the painter already fills that spelling.
- `WWORDS` names a `WFONT` cid because the glyph outlines come from the same reader the mesh builder uses. No second font path.
- `WSHOT` names a pack cid, not a document name, because a pack is one exact state and the player already opens one. A log only grows, so a name would mean a moving target (video AUDIT.md section 6).
- `WCUT` is `WSHOT` of the animate grammar under another name, so `framesToRender` is reused as it is.
- The stacking order is the line order. There is no order box to disagree with it.
- A film file is a log: lines are appended, a later key at the same layer and frame replaces the earlier one, and `WUNKEY` removes. Reading is a fold in line order. Films are hundreds of lines, so the fold is cheap.

Refusals name the failure, the missing thing and the remedy (`scripts/lib/refusal.mjs`). Three the reader makes. A key outside the layer's `in` and `out`. A `WSHOT` whose document rate is not the film's rate or a whole multiple of it. A `WANCHOR` that names a layer that is not a shot.

## Time

One clock: the film frame `f`, a whole number from 0 to `frames - 1`, at `WFILM`'s rate. Seconds are `f / rate`. Nothing in the film is in milliseconds.

- A 2D layer at `f`: `sampleFilm(film, f)` gives each layer's place, scale, turn, opacity and reveal through `channel()` from `anim-sample.mjs`. A layer outside its `in..out` is absent, not drawn.
- A 3D shot at `f`: the document frame is `A + (f - in) * k`, where `A` is the `WSHOT` record's frame and `k` is the document's rate over the film's rate. `k` must be a whole number. The reader refuses anything else and names the rates that work, as `videoOptions` does for fps. The adapter hands that frame to the player's `seek()`. The shot's camera, lens and every key stay in the document. The film restates none of them.
- A 2D layer anchored to a shot takes its place from the player's `project(point)` at that frame, after the 3D frame is sampled and before the 2D pass draws.
- Fractional frames are allowed in the sampler, as in `anim-sample.mjs`, so a scrub can land between frames. Frames out are whole.

So a 3D shot and a 2D title sit on one line of frames, and a cut at frame 120 is the same instant for both.

## Rendering

One renderer, no library, no Canvas2D. The 2D pass is a WebGL2 pass in the engine, run after `post.mjs` has toned the 3D picture, drawing into the canvas-sized sRGB target the page shows and the helper reads.

Why in GL and not as page elements: the render helper reads the canvas (`scripts/render-helper.mjs`, `getImageData`). Words drawn as page elements, as the HUD caption and page type are, would never reach a frame.

What the pass draws, lowest layer first, in the film's stacking order:

- a shape layer: its outlines through the painter's region fill (nonzero stencil, 4 samples a pixel on edges), then `WFILL` as op `fill`, blended source-over in byte space. A stroke is a run of `line` segments at a constant pixel width.
- a words layer: each ink character's outline from `font.mjs`, placed by the font's advances, scaled by the em size, filled as a shape. Reveal `v` draws the first `round(v * ink characters)` characters.
- a solid layer: a region over the whole picture.
- a mask: the mask layer's regions are written into the stencil's top bit first, and the masked layer fills only where that bit is set, as `WPSHAPE` cut outlines are handled today.
- the layer transform: place, then turn, then scale about the place point, as a 2D matrix handed to the painter's frame (its six numbers `a b c d e f`).
- a shot layer: the player's picture, already in the target. In v1 one shot is on screen at a time.

The 2D pass holds no picture between frames and reads nothing back.

The dominant cost is the 3D frame, not the 2D pass. VIDEO.md measured card 11 at 1280x720: a frame's eight smooth-edge draws queue in 10 to 13 ms, then wait 74 to 79 ms on the GPU (Apple M2, 8 GB, WebKit on Metal, GPU shared with other builders). The painter paints eight 2048-pixel maps in 7 to 15 ms warm (MEDIA-FXN.md). A title and a bar are a few hundred edge pixels, so the pass should cost a few milliseconds. That is an estimate until measured.

What to measure, and how. Name the device (this Mac, Apple M2, 8 GB), WebKit on Metal, and the load average. Draw the film of the first slice at 1280x720. Take the median gap between frames over 90 frames, once with the 2D layers present and once with them removed from the file. Hold constant the pack cid, the font cid, the frames, the size, `draws`, and no encoder. Report the per-frame median of each run and the difference. Speed law: the shot alone must not be slower than the player's own `seek` frames of that pack.

## Output

Frames first. `node scripts/motion-export.mjs <film> [--cut <name>|sequence]` draws every frame of the cut, the sequence, or the whole film through the helper's one page load, and writes:

- `world/render/<film>/<cut or all>/<hash>.png`, one file per distinct frame.
- `frames.fxn` beside them: one `WSNAP-Q<frame>-C<hash>-A<bytes>` line per frame, in frame order, as F13 writes it.

The hash is sha256 of the frame's RGBA bytes (`width * height * 4`, top row first), not of the PNG. The PNG encoder (`png-write.mjs`, Sub filter, level 3) could change its bytes and the hash would still name the pixels. A frame that equals the one before it has the same hash and is one file. The same film file, the same pack cid and the same font cid give the same list on the same machine and driver. Across devices the list may differ, because GPUs round differently (video AUDIT.md, risks). The hash names the pixels this machine made, and the records name the inputs.

Video later, as its own app: `scripts/lib/video-export.mjs` `writeVideo` already takes an async iterator of raw frames and pipes them into ffmpeg. The film's draw iterator is handed to it unchanged. ffmpeg is an outside tool, so that step is an app and ships nothing into the engine. Not in the first slice.

## The motion vocabulary

Each motion is records, never code. A tool may write the records for a person. The grammar has no kind for a motion.

| Motion | Records |
| --- | --- |
| fade in, fade out | `WKEYO` at two frames, `WEASE` on the second |
| slide | `WKEYP` at two frames |
| scale | `WKEYS` at two frames |
| rotate | `WKEYR` at two frames. 0 then 720 is two turns, as a piece turns |
| type-on | a words layer with `WKEYV` 0 then 1 |
| draw-on | a shape layer with a `WSTROKE` and `WKEYV` 0 then 1 |
| mask reveal | `WMASK` naming a shape layer, and `WKEYP` or `WKEYS` on that shape layer |
| cut | the first layer's `out` is the frame before the next layer's `in`. `WCUT` names the stretch |
| cross-dissolve | the two layers overlap for the dissolve's frames, and the incoming one carries `WKEYO` 0 then 1 across them |
| fade to black | a solid layer with `WKEYO` 0 then 1 |
| camera move tie-in | `WANCHOR`: the title follows a 3D point through the shot's own camera keys |

A cross-dissolve between two 3D shots is not in v1: it needs two packs mounted on one context and each drawn to an offscreen target, then mixed. The offscreen draw exists (`frame.mjs`, line 310) and the mix program exists (`fade.mjs`). Second slice.

## The film page

`world/motion.html` opens a film file and plays it in the web player, as `world/video.html` plays a `.video.fxn`. It shows the picture, a frame readout, the cuts as buttons, and Play. It is the page the helper loads to draw frames out.

The reduction test, to be answered again against the built page before it is called done:

1. The page is about one film playing.
2. The one dominant action is Play, in the complement colour.
3. A person needs the picture, where it is in time, and which cut it is in.
4. The film's records stay hidden.
5. The cut names repeat the film's cuts, and nothing else repeats.
6. Nothing on the page exists only because the file has it. The picture size is not shown.
7. Removing the frame readout would change no decision, but a person seeking to a frame reads it, so it stays.
8. Leaving the page drops the film. The file stays where it was.
9. Returning with the same `?src=` opens the same film at frame 0.
10. A film that fails to read is refused on the bar in red, with what to do.

Type on the laws' scale (11/18/29/47/76), tokens from the SDK, one idea on the page. No other screen is in v1. A timeline editor for films in the studio comes after the owner has seen frames.

## Deterministic test contract

Tests are written only after the owner confirms this design. They lock exactly what was confirmed.

1. Same frames twice: render the first slice's film twice on one machine. The two `frames.fxn` files are equal line for line.
2. One key law: for every layer and frame of the film, `sampleFilm` gives the value `channel()` gives on the same keys. The 2D sampler holds no curve of its own.
3. Per-input attribution: move one `WKEYO` end key of the title from frame 12 to 24 and render again. Only frames 1 to 23 change their hash. Every other line of `frames.fxn` is unchanged. Force every `WEASE` to curve 4 and render again: only frames strictly between keys change.
4. The shot alone: with every 2D layer removed from the file, each frame's hash equals the hash of the player's own `seek(docFrame)` picture of the same pack at the same size.
5. Spell-back: every record of the film reads through `grammar('motion')` and spells back byte for byte, as `tests/grammar-files.cjs` checks every records file.

## The first slice

One film, `first`: 1280x720 at 30 frames a second, 150 frames.

- Layer 1, shot: the `bluemooncard` pack (exported by `embed-export.mjs`, 240 frames at 30 fps per VIDEO.md), document frames 0 to 119, on screen frames 0 to 119.
- Layer 2, words: "FIRST CUT" in a `WFONT` the studio already stores, 64 px, white, at 120, 560. Fade in over frames 0 to 12 (curve 2), type-on over frames 0 to 30.
- Layer 3, shape: a 320 by 4 bar under the words, white stroke, draw-on over frames 6 to 24.
- Layer 4, solid: black, on screen frames 120 to 149. Layer 2 slides to 120, 340 over frames 120 to 140 (curve 5).
- Cuts: `open` 0 to 119, `card` 120 to 149.

Acceptance, each a measurement:

- `node scripts/motion-export.mjs first` writes 150 lines in `frames.fxn` and at most 150 PNG files, and a second run writes an equal `frames.fxn`.
- With layers 2, 3 and 4 removed from the file, frames 0 to 119 have the hashes of the player's own `seek` pictures of the pack at 1280x720, and frames 120 to 149 are one file (a clear frame).
- Moving layer 2's fade end key from 12 to 24 changes the hashes of frames 1 to 23 and no other.
- The per-frame median gap, layers present against removed, reported with device and load as the Rendering section says.
- `npm run grammars` passes with the new grammar in the folder, and `node scripts/layer-check.mjs` passes with the new modules.

## Laws check

| Law | How the plan obeys it |
| --- | --- |
| Place it first | first line: app. The pieces sit in fxn-3d's engine layers, and no node learns a film word |
| One name system: dense-wire | no name is allocated or resolved. A pack and a font are cids. `motion.html?src=` is a path |
| FLX is its grammar, not an archive | the film is records read by the one engine through its own grammar file. No dictionary, no size floor |
| No JSON stored | the grammar, the film and `frames.fxn` are records. JSON stays only where ffmpeg or a browser defines it, and none is written here |
| No WASM | none. The pass is WebGL2 and the sampler is plain modules |
| No fsync | frames are written as files and never synced. Durability is a second run |
| Three.js deprecated | the shot is the fxn-3d player, the 2D pass is engine GL. Nothing loads three |
| Centralize, don't duplicate | the key law, the painter, the font reader, the frame writer and the video writer are imported, not copied. `channel` is exported, not re-written |
| Derive, don't author | each record's shape is named by what determines it. Stacking is line order. Motions are keys, not kinds. The grammar file is written from one table |
| Measure against the dominant cost | the 3D frame is the cost. The 2D pass is measured as a difference against it on a named device with the inputs held constant |
| Tests lock a confirmed design | the test contract is listed and written only after the owner confirms |
| The owner owns commits | nothing is committed |
| Flux Compact is table-coded | not used. A film has no corpus. Its words are hex text inside one record |
| Copy laws | this document is checked with `npm run copy:check`. Every screen word follows `docs/COPY-LAWS.md` |
| Design laws | one screen, with its reduction test above, on the laws' type scale and SDK tokens |
| A refusal names what it needs | the three reader refusals name the failure, the missing thing and the remedy |

## Not in v1

Audio. A film timeline screen in the studio. Two 3D shots on screen at once. A game cinematic (`CINEMA`) as a shot source. Video encode (the next app). Glow or blur on 2D layers. Films drawn at a size other than `WFILM`'s.

## Open decisions for the owner

1. **Where a shot comes from.** A pack by cid (recommended), or a studio document by name as F13 draws it. The cid gives one exact state, the same frames on every run, and a film that plays in the web player with no edit server. A name follows a log that grows, so an old film could change.
2. **Transitions.** Keys only (recommended), or a `WDISSOLVE` kind. Keys keep one key law and one sampler. A tool writes the ramps for a person. A kind would need its own rule in the sampler and could disagree with the keys under it.
