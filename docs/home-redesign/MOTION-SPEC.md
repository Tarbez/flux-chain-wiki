# Motion and art direction spec

Reader: whoever changes how the mockup moves or looks. It applies the owner's "Cinematic Web and
Motion" manual (Movement as Claim, 2026-10-23) to every view.
The owner's laws come first, where the two meet:
- no fades and no cuts, only motion
- every animation settles, with 0 frames asked for while idle
- lime is for the one action only
- the fonts and the lime stay

## The rules every view keeps

- **Motion makes a claim, or it goes.** Each move says where a thing came from, where it goes, or
  what changed. A move that only adds interest is decoration, and decoration is removed.
- **Three moves per view, at most.** An entrance, a transition, and one emphasis on the chosen thing.
- **Four transitions, each with one meaning.**
  - A zoom means "going deeper": the camera dives into the thing you chose.
  - A pan means "the next in a sequence": How it works is one row in space, so the next chapter is
    to the right.
  - A rise means "it opens out of the thing you chose": the page slab lifts out of a tile, a cube
    or a ring.
  - A crane means "another world": the camera lifts over the network on a long flight.
- **Pacing.** A hop takes 0.9 s. A flight to another world takes up to 1.7 s. A dive into your chain
  takes 1.8 s. The page starts to open at a third of the flight, and the words start at about half
  of it. Every page reads fully by about 1.6 s.
- **Easing.** One curve, cubic-bezier(.22, .7, .18, 1), for everything that lands. A symmetric ease
  is used for camera flights, so a flight does not jolt at its start.
- **Art direction.** One register on every view:
  - a dark canvas
  - graphite for structure: plates, devices, computers
  - slate for resolvers
  - bone for records
  - teal only for the chosen thing and for a signature
  - lime only for the one action

  Surfaces are satin and the page is matte dark glass. A cool rim light from behind draws each
  object's edge.

## The views

Each line: the view's one idea, then its three moves. "Removed" names what went in this pass.

| View | One idea | Entrance | Transition | Emphasis |
|---|---|---|---|---|
| Home | Many networks, one grid. Run your own. | First visit: the network builds from above, the DEFXN logo builds into the ground and its beam rises, the identity helix builds (about 4 s). A return visit starts at the end. | A dive into the ring you click | The ring under the pointer lifts |
| Trace a record | Every record leads back to the first one | The line rises out of the ground logo into the newest record, its card opens, then the line runs back to genesis | A choice lights its block and its card turns to it | The chosen block lifts and its edge brightens |
| Your chain | Your records, linked one to the next. | Your ring rises and its links join, oldest to newest | A turn of the ring to the chosen record | The chosen tile lifts, with teal light under it |
| Record | One record, its versions, its place in time | The tile comes forward, its versions fan out | A turn to the next record | The timeline's mark slides to the record |
| Open record | What one record says | The tile tilts toward you and widens into the card | A slide along the card row | Tab pill slides |
| Connections | What one record links to | The ring unrolls into a line, from the chosen record out | A camera pan to the new record | The chosen record stands forward |
| A chain of the network | What one kind of chain is | The ring rises out of the network and stays lit | A pan to the next ring | Its logo slot grows |
| How it works: in one minute | Every result is signed, and anyone can check it | The network seen whole | A light moves from one kind of chain to the next | The kind named by the idea lifts |
| How it works: a result | How one signed result is made | The stage grows from the resolver | A pan to the next chapter | Each step's change plays once |
| How it works: three layers | Three layers, each with one rule | The plates grow, the base first | A pan to the next chapter | The chosen plate comes forward |
| How it works: life of a resolver | One resolver's path, build to inspect | The blocks it names appear | A pan back to the chapter before | Dashed outline (launched) turns solid (served) |
| Resolvers | What a resolver is built from | The wall grows, then the blocks below | A crane flight to Measured | The chosen cube turns an eighth, lines draw to its blocks |
| Measured | What is measured today | The columns build once a visit | A pan to the chosen column | The chosen column lifts |
| FXN | The supply and its rules | The mark rises out of the hub into its ring | Tiles regroup for Fees | The chosen part's tiles lift |
| Products | 26 products in 7 groups | The shelves grow, group by group | A pan to the chosen group | The group comes forward, bone |
| Identity and names | Your key stays on your device. A name is flat. | Your device and key file | Key file gives way to name, in place | The key file, then the name |
| Nodes | Three ways to run a node | The three forms grow | A pan to the chosen form | Its four roles gather under it |
| Status | What exists today | The network seen whole, behind the page | None | None |
| Identity 1: your FXN ID | One key file opens everything round it | The key file arrives, then its ring builds tile by tile | A pan right to step 2 | Dotted lines run out to apps, your chain, resolvers and products |
| Identity 2: signing in | An app asks, you approve, the server checks | The browser lights first | A pan to the chosen station | Step 2: the request runs to the key and its fingerprint rings light. Step 3: the signature runs to the server, its lights turn teal, and the crossed mark says it never holds the key |
| Identity 3: security | What keeps the key safe today | The key sits on the plinth, then the glass vault closes round it | A pan right to step 4 | The chosen face lights. Built is a solid teal edge. Partial is a dashed honey edge, never solid |
| Identity 4: your identity | A sample name and the devices it is bound to | The badge, then a lit line to each device | A drop straight down into your ring (step 5) | Each device's screen lights as its line lands |
| Identity 9: one identity, many chains | One identity reaches every network | The network seen whole, your badge over your ring | None | Lit arcs to the three network chains, dotted arcs to the resolvers |

The identity flow is one sequence of nine steps. Steps 1 to 4 are a row in space, 14 apart, high over the network. The row ends right over your ring, so step 5 is a drop into your chain. Between two neighbouring steps the camera keeps its height, and the words move sideways with it, as in How it works. The open record is the one exception: its card grows out of its tile, a zoom, so its words keep their rise.

Removed in this pass:
- **Card neighbours' pointer drift:** it competed with the card.
- **Strong pointer lean on inner pages:** cut to 1.2–1.4 degrees, where reading is the task. Home keeps 2.2 as its invitation.
- **Crane lift between chapters:** a chapter is the next idea, not a new world.
- **Grey gloss on the page slab** and the light streak across it.
- **Pastel bodies on the new stages:** light blue cubes and plates read as toys.

## The Reference

Measured on this Mac (Apple M2, system Chrome, 1440x900) on 2026-10-23 with
`scratchpad/audit/throttle.mjs` and `loaf.mjs`.

- **Frame time in flights:** p95 is 16.8 ms across 11 flights, which is 60 fps.
- **With the CPU slowed 4x (CDP), over the whole flight:** p95 is 16.8 ms. One frame per flight is
  longer, the click itself, at 66 to 99 ms on the slowed CPU (about 17 to 25 ms at normal speed).
  Most of it is reading the new page's box, which the page needs.
- **First flight to a stage:** it stalls less. Every material is compiled at load. The worst
  first-flight frame on the slowed CPU went from 383 ms to 183 ms.
- **Idle:** 0 frames are asked for once a view has settled.
- **Reduced motion:** flights become instant, the words do not move, every step shows its end state.
- **No WebGL:** every page reads in full. The page gets a flat dark fill, and the 3D notes and labels
  are hidden.

## The material language (owner, 2026-10-23: "cyber pro, angular, with a touch of softness")

- **One corner rule.** Every 3D form is built at its true size and scaled evenly. Its bevel is a
  tenth of its thinnest side, smooth, in four segments. A stretched cube would pinch its bevel, so
  none is used. The flat parts take one scale: 4px for chips and small parts, 8px for rows and tab
  bars, 12px for panels. The lime action keeps its cut corner.
- **Surfaces.** A satin core under a clear glass coat, with a faint cool sheen on the edge. One
  engraved panel line runs round each face, like a machined slab. Toy pins and posts are gone.
- **Colour means the kind.** Identity is silver blue, token ledgers brass, resolvers steel blue, pools
  mauve, network chains teal. DeArk is copper and CR3TV rose, and the chains inside a network take
  its family. A coin ledger glows from within. Teal light marks only the chosen or the signed thing.
- **Details carry real facts.** A record tile carries its own title, revision and date. A signed
  record has a signature line at its foot and a small status light. Earlier versions are clear panes,
  each with its revision. Your key shows as a hexagonal badge.
- **Ground.** A faint grid with rings lies under the network, so every stage has a floor.
- **The record descent (owner's board, 2026-10-24; moved to #/trace the same day).** A record block is
  near-black glass with an ember edge. The proof line is a thin glow: green where it leaves the ground
  logo, ember along the chain. The newest record is the big block. Its card holds the chosen record's
  place in the chain, then its fields, with the signature last. Each record before it is smaller and
  darker, back to genesis. Network nodes are matte ceramic in their brand colours.
- **The ground logo (owner, 2026-10-24).** On home DEFXN, the base chain kernel, is its mark, inlaid in the floor:
  a plate a shade off the ground, a lit teal rim, the mark cut in with lit edges, and a thin beam
  rising out of it. The hub's own ring and round mark sink into it on home, and stand again on the
  other views. Home's storyboard steps 1 and 4 are announced as the document event `defxn:story`,
  so the radio.fxn panels (home-sites.js) and the identity helix (home-helix.js) build in step. A
  return visit announces step 4 at once.

The four redesigned pages:
- **Your chain:** a chain of graphite data slabs, with the key as a badge at its centre.
- **Record:** clear panes for its earlier versions on a lit line.
- **Open record:** dark glass sized to its content, with a header band, a tab band and a facts rail
  edged in teal.
- **Identity:** a laptop, a browser asking to sign, and the key file as a chip that stays on the deck.
  Switching to names turns the stage half a circle to its other face.

## The cinematic look (owner, 2026-10-24: the rules of light for cinematic video)

All of it lives in `ring-kit.js`, for the one world. Nothing here adds a frame: the world still
draws only when something moves.

- **Grain.** A world-space noise and a few fine scratches move each surface's roughness, so its
  highlights break up. The grain comes from the surface's place in the world, so a big tile and a
  small one carry it at the same scale. A faint bump of it shows only on what is seen up close: the
  record tiles, the record block on #/trace, and a breath of it on the page under the words.
- **The dark side.** The key light comes from the left and from behind, never from the camera. The
  camera side of each ring sits mostly in shade. A cool backlight draws its edge off the floor. The
  sky, the fill and the room light start near darkness.
- **Motivated light.** The ground logo's teal glow is a light: it lights the floor round it and the
  near rings from below. On #/trace the ember record block is a small, hard light on its neighbours
  and the floor. The beam carries a soft shaft and a still field of dust it lights.
- **Size and temperature.** A large soft key for the wide network, with soft shadows. Small hard
  lights for tension. A cool sky and fill against warm local light.
- **Lens.** The camera keeps its 12-degree lens, about a 114 mm look. That is already longer than
  the 80 to 100 mm the guide asks for, so no view was re-fitted.
- **Depth.** There is no blur pass. A cool fog starts just before what the view looks at and
  thickens behind it, so far rings lose contrast and take the air's colour. Drawn light (glows,
  edges, the record card's words) is never fogged.
- **Film.** Exposure 1.12, the highlight roll-off as before, then a high-contrast curve on the
  encoded value: deeper shadows and brighter highlights, with the middle kept, so the teal, the
  lime and the card's words keep their place.
