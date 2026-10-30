# The stage: how a view moves and what can be touched

For the lanes porting the remaining views (`PORT.md`, `VIEWS.md`). Written 2026-10-30. Batch 0 (home's leftovers, auth's 11 states) is built on it: `js/world2/world2-stage.mjs`, `world2-tags.mjs`, the host wiring in `world2-host.mjs`, the records written by `scripts/world-encode.mjs`. A view's motion is data. No view has its own JavaScript.

## The five rules

1. A view's settled frame is a blob, as in `CONTRACT.md`. It does not change.
2. Motion is a **channel**: a named number that moves from where it is to a settled value along timing keys. The names are the Three.js stages' own: `m j kk ks g s l p n rr cs` and the ring turn `pos` from `chains-scene.js`; `lift focus rise build` from its ring state; `lift tip glow orbit beam gather broken build bad` from `auth-stage.js`. No name is new. The one sampler (`fxn-3d/scripts/lib/anim-sample.mjs sample()`) plays every key; no curve is written in the page.
3. Per-instance state lives in the renderer's per-part `state` stream (3 floats: dim, lift in world units, morph weight) and `morph` stream (the matrices to morph toward). The stage writes both from items.
4. Touch is a ray against parts whose `WPART` carries the pick flag. The hit names an **item**; the item's words name the hook.
5. A flight blends the camera and each channel through the sampler, not two frames by one number.

## Records (world grammar, `L` is the one letter left)

```
WSTATE-R<view>-I<n>-N<name>                       a named state of a view (auth: none file verify connected missing create words saved fail offline ended, then create0..create6)
WSET-R<view>-I<state>-N<channel>-V<value>         the channel's settled value in that state (I0 when the view has one)
WCHAN-R<view>-N<channel>-A<permille>-V<progress>-L<curve>   one key of the channel's timing: progress 0..1 at A of 1000 along the track; curve as the animate grammar (0 linear, 1 in, 2 out, 3 in-out, 4 step)
WSPAN-R<view>-N<channel>-D<ms>                    the track's real length; absent, the track is scaled to the flight
WITEM-R<view>-I<id>-M<part>-O<first>-A<count>[-P<parent id>][-D<start ms>-T<stagger ms>-V<ms>]   an id over a run of a part's instances; a window on the build clock
WFOLD-R<view>-M<part>-V<drop>                     the part's unbuilt pose: shrunk to a point, dropped V of its own height
WSPOT-R<view>-N<tag>-X-Y-Z                        where a label hangs
WNAMES-R<view>-C<cid>-A<bytes>                    a text blob (tab separated, content addressed) of the items' words
WCAM-R<view>-A<permille>-D<dist ratio>-H<elev add>-U<yaw add>   a camera pose as offsets from the view's rest (the intro's arrival)
WPART-R<view>-M<part>-O<offset>-A<count>[-L1]     L1: the part can be touched on this view
```
A channel value is `from + (to - from) * p(t)`: `from` is where it stands now, `to` its WSET, `p` the sampler's reading of the WCHAN keys. A mid-flight retarget starts from the live value, so nothing jumps. Everything is derived: the encoder lifts `POSE`, `STATES`, `WELCOME`, `RING_LAG`, the story times from the stage files and refuses to write if their text changed. It reads every WCHAN back through the sampler and refuses a track that does not run 0 to 1.

## (a) to (e)

**(a) Frames.** Unchanged. Home, intro, calm and auth share one blob; items and pick flags belong to the view that owns the part.

**(b) Channels.** `chains-scene.js morph(a, b, u, inA, inB, outA, outB)` becomes two key pairs per channel and target view: grow (`I1`, keys at inA, inB) and shrink (`I0`, keys at outA, outB), in permille of the flight; `WSET` holds the settled values from `target(v)`. The ring turn is a channel `pos` whose real length is `420 + 110 * |d|` ms. Batch 0 writes: home `build` (4700 ms clock), `lift` (330 ms, ringLift's tau 110), `focus` (540 ms); auth's nine channels (1000 ms ease-out, the follower's tau 260). Difference to name: the kernel's in-out is a cubic, the sampler's curve 3 is smoothstep. The camera keeps the exact law (keys are linear, read at frame 1000 x kernel in-out of the clock). Channel windows use curve 3. A curve 5 (cubic in-out) in the sampler would make them exact; that file belongs to fxn-3d.

**(c) State.** Item ids index the instances. Home: ring `i` owns its tiles, links, slot, echo and shade; a cube owns one; a chain inside a network names its parent (`-P`) and rides its lift. Per frame `write()` sets, per instance: dim = `min(.92, fAny * .6) * (1 - focus)`; lift = ring size x (`.32` hover + `.5` focus) plus the parent's; morph = `1 - ease_out(clamp((clock - (D + k/count * T)) / V))`. Hover lift, ring focus, build clock and rise are one mechanism. Only changed parts go to the GPU; a settled view writes nothing.

**(d) Picking.** Design: an id pass over every part with the pick flag, ids from the items. Today the renderer has no id pass and its draw code is not mine to edit, so the same flag and ids are read by a CPU ray against the instances' oriented boxes (nearest hit wins; the state's lift moves the box). 492 pickable instances on home. Chains inside networks block the ray but take no touch (no words line). When the lane adds an id pass, `pick()` changes its body and nothing else.

**(e) Flights.** `fly(a, b, ms)` builds one sampler animation: camera keys (aim, distance in log space, elevation and yaw by the shortest arc) plus a `tilt` track; channels of the leaving and arriving view move by `move()` over their spans in the same tick. The arrival is the same call from the pose `WCAM` gives. A resize mid-flight re-aims the same flight for the time left.

## Hooks (kept as the Three.js host defines them)

`on('hover', fn(lab, x, y))` with `{ name, act, rec }` or null. `on('pickRing', fn(ringIndex))`, `on('pick', fn('home', recordIndex))`, `on('stagePick', fn(kind, id))`, `on('open', fn(view, state, opts))`: a listener returning anything but `false` claims the event; unclaimed, the default opens the page (`pickRing` to `/ring?i=<id>`, `/fxn`, `/chain`). `state` carries keys to the next flight, `select` moves the mounted view's channels (`{ s, b }` names an auth state; a bare `create` is step 0). `tags(view)` returns the layer; home's three labels are made from the names blob and kept clear of the words. `scene.focusOn(which(i, kind), cubes)` is the movie view's focus.

## Paper proof: the three hardest views

**Chain and record** (`chains-scene.js`). Channels `m j kk g s l p ks rr cs n` are WCHAN pairs per target view (`chain`: m 1, j 1, kk 1, p 1, rr, cs; `record`: ks .62, g 1; `open`: s 1; `links`: l 1) with the windows the code has (m in .08-.62, out .3-.85; j in .5-.8; kk in .6-.86; g in .5-1; s in .22-.9; l in .15-.9; p from `pw` to 1; each ease in-out). The five record tiles are items 0-4 of the ring part; the earlier-version panes items of a `ghost` part; the page slab one item. Each tile's pose between ring and card row is a morph between two frames (ring pose, row pose): weight = a `s` window staggered by item `T`. The ring turn `pos` is a channel; the tiles' angular positions are read by the encoder at several `pos` values and written as keys (derived from `turnTo`, not typed). Picks: ring tiles flagged `pick`, hook `pick`, rule `view !== 'record' || j in {sel, sel+1}` becomes which items have a words line per state. Hover lift: tile-level `lift` channel (`.12`, scale `1.04`). What this needs and does not have: text plates, translucent sorted panes, a key mesh (renderer list in `VIEWS.md`).

**Trace** (`home-descent.js`). State `s` (record id) names a state; WSET holds the descent's channels (`reveal`, `card`, `ember`). The line and the blocks reveal by one channel `reveal` 0..1 over a span; each block's grow is a window on it (`D`, `V` per item, `U_BIG`). The ember pool, light and card unfold are channels read by the renderer's uniforms (`ember`, `card`). Blocks are items of a `block` part with `pick`, hook `pick` with the record id as arg. The camera descends along the line: WCAM keys relative to the record's block. Needs from the renderer: sorted glass, additive shells, motes, lines, text on blocks. Nothing needs view JavaScript.

**Stats** (`stats-stage.js`). 1,151 cubes are one `cube` part, each cube an item. Each formation (`s`, `c`, `pt`, `pb`: now, capabilities, ceiling) is a frame of the same 1,151 instances in a second blob; a state names the formation. The flight between formations is `morph` per instance: weight `1 - ease_out((clock - (D + k/count * T)) / V)` with the code's 60-380 ms stagger and 1.15 s, the clock a channel. The `morph` stream holds the destination formation, and a retarget swaps buffers at a settle. Chosen group tint: the `dim` slot reused as the tint weight of a `chosen` item set (the state's `c`). Pick: 1,151 oriented boxes, 0.2 ms on the CPU ray; hook `stagePick(kind, id)` from the words line. The dotted outlines and the 28-bead line are `dot` runs with `-L0`; the ~70 tags are WSPOT records with `tags(view)`.

## Built in batch 0, and what it measured

Home: first-visit build-up (clock 4700 ms, per-ring windows from `RING_LAG 110`, `RING_FOR 560`, `TILE_FOR 420`, cubes from 2600 + 60 i), hover lift, picks, hover names, labels, focus. Auth: eleven states and the wizard's seven steps moving nine channels; the card's lift, tip and size follow them (host wraps the mesh draw's `model`), the beam follows `beam` through morph. Not drawn yet, because the renderer lacks the part: auth's glow, orbit rings, loose cubes, status panels (the channels exist and move). Not built: tile-level hover lift (`hoverRecord`), the shadow map follows state only by a forced shadow pass on busy frames.

## Batch 1 records (2026-10-30)

Kinds added to `W`: `ROWS ATTACH SHAPE`. Labels: `L` on a PART is a number of flags (1 touch, 2 a row with alpha under 1 is glass); `BS` gains `absend abssel abslink` (the channel's value drives the row, not its progress).
```
WROWS-R<group>-M<part>-O<first>-A<count>            a range of the part's original rows that the blob holds (a row no frame shows is not written)
WPOSE-R<view>-M<part>-I<frame>-A<count>[-N<axis>-X<v>]   the part's own frames for a view; the axis aspect, run, state or a channel name says the frames are samples
WATTACH-R<group>-M<part>-N<host>                     the part's rows are in the host's units and laid on its row (the key's ring of light; the card's glow and pieces)
WSHAPE-R<group>-M<part>-C<cid>-A<bytes>             a mesh blob the encoder wrote for a part (a plate with holes), by content id
```
A part in a group's blob is a pool of distinct rows (WPART `A` rows of 64 bytes) followed by a table of 16-bit indexes, one per kept row of each frame. Channels added: the flight's `run` (the pulses of the entering flight), auth's `loose` and `present` (the fade of the view's glass in and out, driven by the camera, not by a state). A channel that a part follows as samples is read as base + the sum over channels of (the part's frame at the channel's value less the base); `world2-rig.mjs` does it for auth, `world2-dyn.mjs` blends two views for the chain group.

