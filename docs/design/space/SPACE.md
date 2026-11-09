# The space: moving through the DEFXN grid

Layer: app (the defxn site). Owner brief, 2026-11-05: "upgrade the home page and connect the pages and allow the user to navigate through
the space and reduce information and make it far more interactive and easy to understand".

This is the contract the space's parts are built against. The core (`js/world2/world2-space.mjs`, wired by `js/world2/world2-host.mjs`)
owns the camera and the targets. Every other part is a module in `js/space/` with its own stylesheet in `css/space/`, loaded by
`js/space/space.mjs` once the world is ready. A part talks to the core only through `window.ArkSpace`.

## What the visitor does

1. They land on the grid (the intro film plays once, then the hero view).
2. They point at an object: it lights and a short label names it.
3. They click it: the camera flies to it and a small card says what it is in one line, with one action: **Open** its page.
4. From there: another click flies to a neighbour, **Back** (or Esc) returns one level, the grid button returns to the whole view.
5. Every page of the site that has a place in the space opens the space at that place. A page's address is a place.

Levels: **grid** (everything) > **network** (a network, its node cube and its chains) > **chain** (one chain drum). The kernel is its own
place under the grid.

## `window.ArkSpace`

Present as soon as `js/world2/world2-space.mjs` loads; `ready` is false until the objects stand. Never call before `whenReady`.

| Member | What it does |
|---|---|
| `ready` | true once the targets exist |
| `whenReady(fn)` | calls `fn(ArkSpace)` now if ready, else once ready |
| `targets()` | every place: `[{ id, kind, name, line, parent, children, token, at, radius, route }]` (below) |
| `target(id)` | one place, or null |
| `focused()` | the focused place's id, or null on the grid |
| `focus(id)` | fly the camera to a place and make it the focus; null flies back to the grid |
| `back()` | one level up (chain > network > grid); on the grid it does nothing |
| `open(id)` | go to the place's own page (the site's router); the page then keeps the space at that place |
| `hover(id)` | light a place as if the pointer were on it (null: none) |
| `screenOf(id)` | where a place stands on the page now, `[x, y]` in CSS pixels, or null when off screen |
| `orbit(dyaw, delev)` | turn the camera round the current focus, degrees; clamped |
| `zoom(f)` | move the camera closer (f < 1) or farther (f > 1); clamped to the focus's own range |
| `on(name, fn)` | listen; returns a function that stops listening. Names below |

### A place

```
{ id: 'kernel' | 'net:<item>' | 'chain:<item>',   // stable for a session; <item> is the world's ring item number
  kind: 'kernel' | 'network' | 'chain',
  name: 'FXN · The first chain',                   // the ring's own words (world stage wordsOf), never typed here
  short: 'FXN',                                    // the name before ' · ': for chips, the path and the map
  facts: [{ label: 'Coin', value: 'FXN' }, ...],   // at most three, plain words with units; may arrive with a later 'targets' event
  line: 'Every identity keeps its own chain.',     // its one-line act, may be ''
  parent: 'net:11' | 'kernel' | null,              // a chain's network, a network's kernel
  children: ['chain:4', ...],
  token: '--net-fxn',                              // the CSS colour token the object wears (a meaning token, law 77)
  at: [x, y, z], radius: 3.2,                      // world units, for a part that wants to draw it (the minimap)
  route: { key: 'ring', query: { i: 'fxn' } } | null }
```

### Events (`on(name, fn)`)

| Name | Argument | When |
|---|---|---|
| `focus` | the place, or null | the focus changed (fired when the flight starts) |
| `arrive` | the place, or null | the camera has landed |
| `hover` | the place, or null | the pointer moved onto or off a place |
| `film` | `{ playing, chapter, done }` | the intro film's state (while it plays, parts stay hidden); a new listener hears the current state at once |
| `targets` | the list of places | once when the places exist; a new listener hears it at once |
| `camera` | `{ yaw, elev, dist }` | after a frame in which the camera moved (at most once a frame) |

Notes the parts asked for (2026-11-05):
- **Tokens** are CSS variables holding bare HSL channels (`210 18% 72%`): draw them as `hsl(var(<token>))`.
- **`screenOf`** is in viewport CSS pixels: place with `position: fixed`.
- **Camera axes**: degrees; `yaw` 0 puts the camera south of its aim looking north (−z), growing yaw swings it toward +x.
- **`hover(id)` from code** fires the `hover` event like the pointer does.
- **Keys and dialogs**: a part that opens a dialog uses `role="dialog"` with `aria-modal="true"`; other parts ignore keys while one is open.
- **Layers**: the space layer stacks label 10, map and path 20, focus card 30, hints 35, jump 40.

## Rules for every part

- **Own your files.** A part writes only `js/space/<part>.mjs` and `css/space/<part>.css` (and a test-free note in this doc's
  "Parts" table if asked). It never edits the host, the objects, another part or a shared stylesheet. A missing core feature is reported,
  not added.
- **A part is an ES module** exporting `mount(space, host)`: `space` is `ArkSpace`, `host` is the element to put DOM in (one shared
  layer over the canvas, `pointer-events: none` except on a part's own controls). `mount` returns `unmount()`.
- **While the film plays** (`film.playing`), a part shows nothing.
- **Design laws** (`docs/PRODUCT-DESIGN-LAWS.md`): one idea per part; colour by role only (`--primary` base, its steps as neighbour,
  `--complement` never in a part: the page owns its one dominant action); meaning tokens only for what they mean; the type scale only
  (`--fs-tertiary` 11, `--fs-secondary` 18, `--fs-primary` 29, `--fs-hero` 47, `--fs-display` 76); fonts `--font-sans`, `--font-mono`,
  `--font-display`; glass surfaces `hsl(var(--surface) / .6)` with `backdrop-filter: blur(...)`; borders `--border-default`.
- **Copy laws** (`docs/COPY-LAWS.md`): name the reader, one idea a sentence, say what happens. Words a visitor reads come from the place
  (its `name`, `line`) or from a short constant in the part; keep them few. Run `npm run copy:check -- <your files>` (from the workspace
  root) and report the score.
- **Reduce.** Every part shows the least that lets a visitor move on. If it can be learned by doing, do not say it.
- **Reduced motion** (`prefers-reduced-motion`): no animation in a part; the core flies the camera instantly.
- **Keyboard and screen readers**: a control is a `button` or `a`, reachable by Tab, with a visible focus ring (`--primary`).
- **No builds, no tests, no browsers on this Mac.** `node --check <file>` is allowed. Do not commit.

## Parts

| Part | Files | What it is |
|---|---|---|
| focus card | `js/space/focus-card.mjs`, `css/space/focus-card.css` | the focused place: name, one line, Open, Back |
| path | `js/space/path.mjs`, `css/space/path.css` | where you are: Grid › FXN › Identity chain, each step a button |
| map | `js/space/map.mjs`, `css/space/map.css` | a small top-down map of the grid; click to fly |
| keys | `js/space/keys.mjs`, `css/space/keys.css` | keyboard moves: arrows between neighbours, Enter opens, Esc back, a screen-reader list of places |
| hints | `js/space/hints.mjs`, `css/space/hints.css` | first visit only: three short hints that disappear once done |
| jump | `js/space/jump.mjs`, `css/space/jump.css` | press `/` or ⌘K: type a name, Enter flies there |
| label | `js/space/label.mjs`, `css/space/label.css` | the hover label beside the pointer: name and line, nothing more |
| home | `js/pages/home.js` (the `zero` page), `css/space-home.css` | the home page, rebuilt to stand on the space with far less on it |
| routes | `js/space/routes.mjs` | each page's place: opening a page focuses its place; focusing never changes the address until Open |
| quest | `js/space/quest.mjs`, `css/space/quest.css` | the game: "Who are you?" (three roles), a mission list per role that ticks off as you move, a toast per step, one next action at the end. Replaces hints |

## Shows (2026-11-05: "each page should give you shows")

A page plays a show in the space: `js/space/shows/<key>.mjs` (a key's `/` written `-`, e.g. `stats-now.mjs`), exporting
`SHOW`, either an object or a function `(space) => object` (to read `space.targets()` and pick real places). `js/space/shows.mjs`
plays it when the page opens and stops it when the page closes; never during the film. The page list is `WITH_SHOW` in that file.

```
export const SHOW = (space) => ({
  id: 'chain',
  steps: [
    { at: 0,   shot: { place: 'chain:4', dist: 1.2, elev: 30, turn: -20, lift: .2 }, light: ['chain:4'], say: 'This is your chain.', n: '01' },
    { at: 2.5, spawn: [{ type: 'record', near: 'chain:4', dx: 1.4, dz: 0, s: .5 }], say: 'Each record is signed.', n: '02' },
    { at: 6,   shot: null, light: [], say: null, clear: true }      // back to the grid, spares away, caption off
  ]
});
```

| Step field | Meaning |
|---|---|
| `at` | seconds from the show's start |
| `shot` | the camera flies (one timed flight) to a place: `place` id (null = the whole grid), `dist` (1 = the place's own framing; >1 farther), `elev` and `turn` (degrees; turn adds to the angle the kernel is seen from behind the place), `lift` (aim height in place radii). Omit to leave the camera |
| `light` | place ids lit as if pointed at (replaces the last set; `[]` none) |
| `spawn` | spare objects called in: `type` one of `record` (8 spares), `link` (4), `card` (2), `node` (2); `near` a place id; `dx`,`dz`,`dy` offsets in that place's radii; `s` size in its radii; `yaw` degrees; `delay` seconds; `token` a meaning token for its light (e.g. a network's `--net-*`). A spare comes down and builds on its own clock |
| `clear` | spares leave and lights go off first |
| `say`, `n` | the caption line (≤ 10 words, copy laws) and its step label ('01'); `null` hides it |

Rules: a show is short (≤ 12 s) and ends in a calm, useful pose (usually the page's own place); it never fights the visitor (any focus,
drag or zoom by the visitor wins: the show only sets targets); everything it shows is real (places from `targets()`, facts from data).

## The page layout (2026-11-05: "the entire layout would need to be upgraded")

Every page stands on the space in one game layout, `css/space-frame.css` (a page sheet: the page loader takes `css/<name>.css` only;
the catalog lists it for every page). Middle of the screen is the world's.

| Class | Where | Holds |
|---|---|---|
| `.hud` | the page's root (add to the page element) | sets the layout; nothing scrolls the page at 1280x720 |
| `.hud-left` | left column, top 96px, width 380px | `.hud-kicker` (mono 11 caps, --primary), `.hud-title` (29), `.hud-answer` (18, the one answer), `.hud-tabs` (section buttons), `.hud-body` (the open section; scrolls inside) |
| `.hud-right` | right column, top 96px, width 300px | `.hud-stats` of `.hud-stat` (`<b>` value 29 + `<span>` label 11 caps), `.hud-actions` |
| `.hud-dock` | bottom centre, above the footer | the page's steps or controls as `.hud-chip` buttons; the one dominant action `.hud-go` (the complement, once) |
| `.hud-card` | any glass card | glass surface, 1px border, 8px corner |

## Cinematic journeys (2026-11-07: "whatever choice you take you enter a cinematic experience")

Layer: app (the defxn site). Status: **plan, not built, not confirmed by the owner.** No tests until the owner confirms it.

### What the visitor sees

1. The film plays once (unchanged).
2. "Start here" asks who they are: Just curious, I build apps, I run computers, or Just look around.
3. A role starts its cinematic: a short camera trip through the real grid, with one caption at a time.
4. The cinematic ends on the role's next action (the same one the mission list already names).
5. "Just look around" starts no cinematic. It opens the free grid.

The cinematic is a guide, not a score. It never ticks a mission. Only the visitor's own moves tick missions (quest.mjs keeps that rule).

### Files

| File | Owner (lane) | What it is |
|---|---|---|
| `js/space/cinematic.mjs`, `css/space/cinematic.css` | lane A (player) | plays one role's beats, shows the caption, Skip, Esc, Watch again |
| `js/space/cinematic/curious.mjs` | lane B | the "Just curious" beats |
| `js/space/cinematic/builder.mjs` | lane B | the "I build apps" beats |
| `js/space/cinematic/operator.mjs` | lane C | the "I run computers" beats |
| `js/space/quest.mjs` (wiring only) | lane A | a role pick starts its cinematic; "Watch again" in the quest panel |

Each role file exports one default object. Nothing else is exported.

### The beat contract (every role file uses only this)

```
export default {
  id: 'curious',
  seconds: 20,                                   // total, must be 24 or less
  beats: [
    { at: 0,  pick: { kind: 'kernel' }, shot: { place: 'pick', dist: 1.4, elev: 25, turn: 0 }, light: ['pick'], say: 'Every network runs on one kernel.', n: '01' },
    { at: 4,  pick: { kind: 'network', index: 0 }, shot: { place: 'pick', dist: 1.2, elev: 30, turn: -15 }, light: ['pick'], say: 'Each network is a group of chains.', n: '02' },
    { at: 9,  pick: { kind: 'chain', index: 0, parentOf: 'network' }, shot: { place: 'pick', dist: 1.0, elev: 30, turn: 20 }, spawn: [{ type: 'record', near: 'pick', dx: 1.4, dz: 0, s: 0.5 }], say: 'Each record is signed.', n: '03' },
    { at: 15, page: 'stats/now', shot: null, clear: true, say: 'See the network running.', n: '04' }
  ],
  end: { say: 'Get FXN Browser.', page: 'download' }
};
```

- `pick` is resolved at run time from `space.targets()` (the kind, and the nth one). A role file never names a numeric id. If no place of that kind exists, the beat is skipped, not faked.
- `shot`, `light`, `spawn`, `say`, `n`, `clear` mean what they mean in a show (see "Shows" above).
- `page` opens that page at that time. It replaces the grid for the rest of the cinematic.
- `end` shows its line as the last caption and offers one button that goes to its page.

### The three journeys

**Just curious** (about 20 s, 4 beats): the kernel, then a network, then one chain with a record, then the network's stats page. Ends on "Get FXN Browser".

**I build apps** (about 20 s, 4 beats): a network, then the kernel every network runs on, then the resolutions page ("What you can make"), then the "How it works" page. Ends on "Get FXN Browser".

**I run computers** (about 16 s, 3 beats): a network, then the stats page ("the nodes that are up"), then the explorer page. Ends on "Run a node" (download).

### Rules for the player (lane A)

- **Skip** is always on screen. Esc also skips. A skip goes straight to the role's `end`.
- **The visitor wins.** A drag, a zoom or a click on a place stops the cinematic at once, and the grid stays where the visitor left it.
- **Reduced motion** (`prefers-reduced-motion`): no camera flights. Each beat's caption shows still on the grid for 4 s, then the next one.
- **The film** must be done first. Nothing plays during it.
- **Watch again** is in the quest panel. It starts the same role's cinematic from the top.
- **Progress** is kept in the same storage the quest uses (`defxn-quest-v1`, try/catch). The cinematic keeps no state of its own.
- **Captions** are text in one `aria-live="polite"` region. Each one is one sentence, at most 10 words.

### Design laws for the screen

- One idea on screen: the caption and the place it names.
- One dominant action: Skip (outlined, `--primary`). It is not the complement colour, because the page owns the complement.
- Caption type: `--fs-secondary` (18). The beat number: mono, `--fs-tertiary` (11), caps.
- Glass caption card, bottom left, `hsl(var(--surface) / .6)` with `backdrop-filter: blur(...)`. Border `--border-default`.
- Fits 1280x720 and 1440x900 with no scroll.
- The ten-question reduction test is answered in the build notes before handover. Not in this plan.

### Copy rules

- Copy laws (docs/COPY-LAWS.md). One idea per sentence. Say what happens.
- Run `npm run copy:check -- <your files>` and report the score.

### Stop lines

- No Three.js. The camera and the objects come from `js/world2/` only.
- No new library. No JSON in storage beyond the quest's existing key.
- No commit. The owner owns commits.
- No test file before the owner confirms this design.
- Check each file with `node --check <file>`. That is the only check before the owner tests.

## Cinematic journeys: style guide and shot list (2026-11-07)

Reader: the owner, who approves this before anything is built, and then the engineer who builds it. Status: **plan, not built, not
confirmed.** No code, no tests. The owner's words: "from the new defxn site we need to get that 3d and those cinematic journey and
enrich them with kinetic 3d movements and typography and motion." The trips score 5-7/10 today and must reach 8/10. The 15 s film made
from an old 3D pack was rejected. The reference look is the live site's own world, captured here on 2026-11-07
(`scratchpad/cine-style/stills*`, 1440x900, headless Chrome on SwiftShader).

### Layer line

Layer: **app** (the defxn site). The trip is three things on one clock (`performance.now`), and each sits where it already lives:

| Part | Layer and home | Why it lives there |
|---|---|---|
| the world: objects, camera path, lights, spares, the one 3D lockup | fxn-3d's engine through the world look (`/fxn-3d/js/render/world2-*.mjs`), laid out and played by `js/world2/world2-objects.mjs` and `js/world2/world2-space.mjs` | the camera has one owner (the motion audit of 11-05). A thing the camera flies past must be in the world |
| the beats | records in `js/space/cinematic/<role>.mjs` (the beat contract above, extended below) | a role file names places by kind, never by id. It holds no code |
| the kinetic type: captions, numbers, the end lockup | DOM in the space part `js/space/cinematic.mjs` + `css/space/cinematic.css`, placed each frame by `space.screenOf(id)` | the type scale, the fonts and `aria-live` already exist there. A screen reader reads it. It costs the GPU frame nothing. The critic's stills are page screenshots, so DOM type is in every frame |
| the 2D motion grammar (`docs/design/motion/MOTION.md`) | not used by the trips | it draws words into the canvas for exported films. A trip is live, read by people and screen readers, so its words stay DOM |

Kinetic type lives in the DOM because readability and the type scale are DOM laws (laws 78-83), and in the world only where the camera
must pass it: one lockup per trip. That lockup is the one thing fxn-3d must add (section "What fxn-3d must add").

### Style guide (measured, not invented)

**Theme.** The live site runs `data-theme="ember"` (`css/flux-themes.css`). Every colour below is that theme's token, with the hex
sampled from the stills.

| Role | Token | Channels | Measured | Where it is in a trip |
|---|---|---|---|---|
| canvas | `--canvas` | `18 7.5% 3.6%` | `#0c0a09` over the world (92-95% of every still) | the dark the world stands in. The vignette's edge |
| base | `--primary` | `19 99.8% 67.5%` | `#ff8e59` (the step label, Skip, the page's hero line) | the step number, Skip, the kernel's top lamp, every lit edge |
| base, hot | `--primary-600`/`-700` | `19 98.8% 76.2%` / `18 74.3% 83.8%` | `#f8b8a0`, `#f8d0c0` at the core of a lit drum | the one lit subject's glow (the look's 2.2 gain) |
| neighbour, dim | `--primary-300`/`-400` | `19 43.4% 26.7%` / `19 36.6% 42%` | `#47322a`, `#a87050` on the floor and unlit edges | the floor grid (gain .2), every unlit glow (gain .45) |
| steel | the objects' plated material | — | `#5a5554` mid, `#9c9a99` highlight | the kernel, the node cubes, the drums' bands. Never tinted |
| text | `--text-strong` | `18 11.8% 96.1%` | `#f6f5f4` | every caption and lockup |
| complement | `--secondary` (`--complement`) | `179 95.2% 40.7%` | the teal "Get FXN Browser" button in the nav | **never in a trip**: the page owns it (law 73). The trip's end button is `--primary`, outlined |
| meaning: a network | `--net-*` | `--net-fxn 168 44% 48%`, `--net-deark 24 58% 58%`, `--net-cr3tv 340 38% 64%` | teal, copper, rose traces and cube lamps | a network's trace and cube keep their own token. A spare spawned near a network takes `token` |
| meaning: a chain kind | `--chain-identity 210 16% 76%`, `--chain-resolver 204 42% 58%` | silver-blue, blue | a drum's stripe | never changed by a trip |

**Two faces.** `document.fonts` on the live site loads Albert Sans 300-700 and IBM Plex Mono 400/500/600, nothing else.
`--font-display` and `--font-sans` are the same family, so the site has one display and UI face and one label face.

| Face | Use | Weight | Tracking | Measured on the site |
|---|---|---|---|---|
| Albert Sans | display and UI | 700 for 47 and 76, 600 for 29, 500 for 18 | `-0.04em` at 47 and 76, `0` at 29 and 18 | the hero line: 76px, weight 800 asked (700 served), `-3.04px` |
| IBM Plex Mono | labels | 600 | `.16em`, caps | the step label `.cine-no`: 11px, `1.76px`, `#ff8e59` |

**The type ladder in a shot** (laws 78-83: 11/18/29/47/76, by name only).

| Size | Variable | Role in a trip | Phone (390 wide): one step down |
|---|---|---|---|
| 11 | `--fs-tertiary` | the step label `01 / 04`, Skip, Continue. Mono caps | 11 |
| 18 | `--fs-secondary` | a second line under a caption, used at most once per trip | 18 |
| 29 | `--fs-primary` | the caption: one sentence, at most 10 words | 18 |
| 47 | `--fs-hero` | the count-up number and the end lockup | 29 |
| 76 | `--fs-display` | never in a trip: the page's hero line owns it (law 80) | — |

**Camera language**, in the site's own terms (`shot: { place, dist, elev, turn, lift }`, `world2-space.mjs shotPose`).

- Lens: fixed, a 12 degree field (`world2-objects.mjs TAN`). A long lens: flat perspective, an object keeps its size as the camera
  orbits. Nothing in a trip changes it.
- Distances: `dist` 1 is the place's own framing. Measured: chain at 1.0 = 65 world units from the aim, network at 1.2 = 253, kernel
  at 1.0 = 95, the hero pose = 451. **A shot farther than the hero goes dark**: kernel at `dist 5.5, elev 70` (525 units) rendered
  nothing (`stills/40-grid-high.png`). The map view is `dist 3.4, elev 62` on the kernel (`stills2/k-top.png`), and no farther.
- Heights: `elev` 8-14 is floor level: the towers of light read, the drums stand (`stills2/n-low.png`, `c-close.png`). 18-30 is the
  working height. 36-40 shows a drum's top. 50-62 is the map. Above 62 the world flattens to dots.
- Moves, by name. **Push**: `dist` falls along one segment. **Orbit**: `turn` changes, `dist` holds. **Crane**: `elev` changes with
  `dist`. **Whip**: a move between two places in one beat, then three beats of settle. At most one per trip, and only where the shot
  list names it. **Hold**: two waypoints with one pose, one bar apart. **Rack** (focus): not possible today (section "What fxn-3d must
  add"), so no shot asks for it.
- The path is one curve through every waypoint (`flyPath`, Catmull-Rom with capped tangents), so velocity carries from shot to shot
  and the camera never rests unless a hold is written. The visitor's drag or zoom still wins and ends the trip.

**Light language** (`world2-objects.mjs`: `SITE_GLOW .75`, `HOVER_GLOW 1.5`, a lit set at 2.2 with everything else at .45).

- One subject is lit at a time. When any place is in the lit set, every other glow part dims to .45: the world's own spotlight. Falloff
  is the emissive bloom of the look, not a shadowed lamp. The kernel's tower lights with the kernel.
- A trace carries light: dashes light as the run passes them (the film's chapter 2). A trip runs a trace's light ahead of the camera
  whenever the camera travels along it (kernel to network, network to chain, or back). Light leads, the camera follows.
- Many at once only on a downbeat, once per trip: every trace runs out from the kernel in one bar (the operator's shot 6).
- No glow on UI chrome. Skip and Continue are a 1px `--primary` outline on glass.

**Texture.** Plated steel with the look's key and back light, an orange rim on every edge, the floor grid at gain .2 in `--primary-300`,
dashed traces in the network's token, a radial vignette to `--canvas` at .75 from 55% out (`cinematic.css`). The world is desaturated and
quiet. Saturation is spent on the one lit subject (law 75).

**How text enters and exits.** Kinetic type moves, each named once and reused.

| Move | What happens | Spring | Used for |
|---|---|---|---|
| per-word rise | each word rises 0.6em from below its baseline and lands, one word every 60 ms, `clip-path` on the line | type | every 29 caption |
| per-letter track-in | the letters start at `+.12em` tracking and close to the face's tracking, together | letter | the mono step label |
| mask wipe | the line leaves upward behind a `clip-path` that closes over one beat | type | every caption's exit |
| scale-down lockup | the lockup enters at scale 1.08 and lands at 1.0, no overshoot | heavy | the 47 end lockup |
| number count-up | the digits run from 0 to the real value over two beats on the number spring, tabular figures | number | a fact's count at 47 |
| floor rise (3D) | a letter of the world lockup rises from the floor to its place, one letter per beat, heavy spring | heavy | the one 3D lockup per trip |

Rules for every move: the words enter **after** the camera move has started (at least half a beat) and leave **before** the next move
starts (at least one beat). A block that follows a subject takes its place from `screenOf(subject)` each frame, offset into the emptier
half of the screen, and springs toward it, so a new target adds a spring and never restarts the move. Type never covers the lit
subject's screen radius. Nothing fades (opacity is only for the vignette and the end dim).

**Springs**, closed-form, mass 1, `(k, d)`. Damping ratio `d / (2 sqrt k)`.

| Role | k | d | Ratio | Settle | Note |
|---|---|---|---|---|---|
| UI chip (Skip, Continue, step label) | 220 | 22 | .74 | .37 s | about 3% overshoot: the tiny overshoot UI gets |
| type (29 captions) | 170 | 26 | 1.0 | .31 s | none |
| letter (track-in) | 140 | 24 | 1.0 | .34 s | none |
| number (count-up) | 60 | 15.5 | 1.0 | .52 s | the digits settle on the beat after they start |
| heavy (lockups, 3D letters) | 40 | 12.6 | 1.0 | .63 s | none. Big type never overshoots |

The camera keeps its one curve and takes no spring: two owners of the camera is the defect the audit of 11-05 removed.

**Banned in a trip** (the method's list, checked by the critic). A centred title on a gradient (today's title card is one and goes).
Letterbox bars and any frame border (today's 7vh bars go. The vignette stays). Anything fading in (captions rise and wipe). Corner labels
(the step label sits with its caption). Glow on UI chrome. A particle burst (a spare's own build is not one). Dead time (every bar has
a new thing). A page cut mid-trip (the last audits: page beats break the film). The complement colour. A real `.fxn` name on screen.
Any word in `docs/BANNED-WORDS.txt`. A size off the ladder.

**The frame during a trip.** The world, one caption block, Skip. The nav bar and the page's words dim to 0 over one bar when the trip
starts and return when it ends (today four page parts already dim: the slot, the doors, the ledger, the strip. The nav joins them). Fits 1280x720 and 1440x900.

### Beat grid

Tempo **120 BPM**: a beat is 0.5 s, a bar (4 beats) is 2 s. A state change lands on a beat. A big moment lands on a downbeat (beat 1 of a
bar). Something new happens every 1-2 bars. The hook is bar 1. Lengths:

| Trip | Length | Bars | Shots | Ends on |
|---|---|---|---|---|
| Just curious | 28 s | 14 | 8 | Continue to `download` ("Get FXN Browser.") |
| I build apps | 26 s | 13 | 8 | Continue to `download` ("Get FXN Browser.") |
| I run computers | 22 s | 11 | 7 | Continue to `download` ("Run a node.") |

Player constants that change: `OPEN` 1.5 becomes 0 (the title plays inside the first move, never before it). `FIRST` 3.5 becomes 2 (the
hook lands at bar 2). Skip and Esc still go to the end. Reduced motion: no flights and no springs. Each caption shows still on the grid for
4 s, as today.

### Shot lists

Columns: time in bars (`b1` is 0:00-0:02). The camera as waypoints in the beat contract's terms, each `place dist/elev/turn` with the
duration of the move. What is lit. Spares. The type (exact words, size, move, in and out times). The one new thing. `kernel`, `network`
and `chain` are picks (`pick: { kind }` resolved from `targets()`. `chain` is the first chain of the picked network). `hero` is the grid's
hero pose. A count comes from the place's `facts` (real numbers), never typed. No page opens inside a trip: the end button is the one
way to a page, and the mission list takes the visitor to the other pages after.

**Just curious: what the grid is (28 s)**

| # | Bars | Camera | Lit | Spares | Type | The new thing |
|---|---|---|---|---|---|---|
| 1 | b1 | `hero` to `kernel 1.5/14/-35`, 2 s, push, fast then settling | kernel | — | 3D lockup `CURIOUS` on the floor left of the kernel, one kernel radius high. Letters floor-rise on beats 1-3. The camera passes it on the right | the hook: a fly-in past the word |
| 2 | b2-b3 | `kernel 1.5/14/-35` to `kernel 1.0/20/0`, 4 s, push and quarter orbit | kernel | — | 29 `One kernel runs every network.` per-word rise in at 0:02.5, mask wipe out at 0:05.5. Mono 11 `01 / 04` track-in with it | the kernel's top lamp pulses once on the downbeat of b3 (0:04) |
| 3 | b4 | `kernel` to `network 1.3/30/-15`, 2 s, crane up and out along the trace | kernel, then the network at arrival | — | none | the trace's light runs kernel to network ahead of the camera |
| 4 | b5-b6 | `network 1.3/30/-15` to `network 1.05/24/20`, 4 s, orbit | network | `record` at dx 1.5 (0:08), `record` at dx -1.3 (0:09) | 29 `A network is a group of chains.` in 0:08.5 out 0:11.5. 47 count-up `{chains} chains` from the fact "Chains here", 0:09 to 0:10. Mono `02 / 04` | the number counts up as the records land |
| 5 | b7 | `network` to `chain 1.0/36/20`, 2 s, drop along the chain's trace | chain | — | none | the trace runs network to chain. The drum's light column fills the frame |
| 6 | b8-b10 | `chain 1.0/36/20` to `chain 0.85/12/-30`, 6 s, crane down to floor level and orbit | chain | `record` x3 at dx 1.4, 1.9, 2.4, landing at 0:14.5, 0:15, 0:15.5 | 29 `Each record is signed by its writer.` in 0:14.5 out 0:18.5. Mono `03 / 04` | three records land in a row on the beats |
| 7 | b10-b11 | `chain` to `kernel 3.4/50/0`, 4 s (0:18 to 0:22), crane up to the map | each network in turn, one per beat on b10 (0:18, 0:18.5, 0:19) | — | 29 `Anyone can check any record.` in 0:19 out 0:21.5. Mono `04 / 04` | the networks light one per beat as the grid opens up |
| 8 | b12-b14 | `kernel 3.4/50/0` to `hero`, 6 s, settle | none | clear at 0:24 | 47 lockup `Get FXN Browser.` scale-down at 0:23. Mono 11 `Continue` chip rises at 0:24 | the end: one action, the world dims to .4 |

**I build apps: what you can make (26 s)**

| # | Bars | Camera | Lit | Spares | Type | The new thing |
|---|---|---|---|---|---|---|
| 1 | b1 | `hero` to `network 1.2/12/30`, 2 s, push in low across the floor | network | — | 3D lockup `BUILDER` on the floor before the network, letters floor-rise on beats 1-3. The camera flies past it | the hook: low fly-in past the word |
| 2 | b2-b3 | `network 1.2/12/30` to `network 1.0/26/0`, 4 s, crane up | network | `card` at dx 1.3, s .6, landing on the downbeat of b2 (0:02) | 29 `Your app runs on a network.` in 0:02.5 out 0:05.5. Mono `01 / 04` | the card lands as the words rise |
| 3 | b4 | `network` to `kernel 1.3/22/20`, 2 s, pull back along the trace | the kernel at arrival | — | none | the trace's light runs the other way, network to kernel |
| 4 | b5-b6 | `kernel 1.3/22/20` to `kernel 1.0/16/-20`, 4 s, orbit | kernel | — | 29 `Every network shares one kernel.` in 0:08.5 out 0:11.5. 47 count-up `{networks} networks` from the fact "Networks", 0:09 to 0:10. Mono `02 / 04` | the number |
| 5 | b7 | `kernel` to `chain 1.0/34/10`, **whip**: the move in beat 1 (0:12 to 0:12.5), settle beats 2-4 | chain (a resolver chain of the network when one exists, else the first chain) | — | none | the one whip of the trip |
| 6 | b8-b9 | `chain 1.0/34/10` to `chain 0.9/18/-20`, 4 s, crane down | chain | `record` at dx 1.4 (0:14.5), `record` at dx 1.9 (0:15) | 29 `You ask. A signed rule answers.` in 0:14.5 out 0:17.5. Mono `03 / 04` | two records land |
| 7 | b10 | `chain 0.9/18/-20` to `chain 0.9/14/-35`, 2 s, slow orbit | chain | `link` between the two records at dx 1.65, s .5, landing on the downbeat (0:18) | 29 `Each record links to the one before it.` in 0:18.5 out 0:19.5. Mono `04 / 04` | the link joins the records on the beat |
| 8 | b11-b13 | `chain` to `hero`, 6 s, settle | none | clear at 0:22 | 47 lockup `Get FXN Browser.` at 0:21. `Continue` at 0:22 | the end: one action |

The resolutions and works pages are not opened. Their one line each is in shots 6 and 7, and the mission list's steps open them after.

**I run computers: the computers that run it (22 s)**

| # | Bars | Camera | Lit | Spares | Type | The new thing |
|---|---|---|---|---|---|---|
| 1 | b1 | `hero` to `kernel 2.6/58/0`, 2 s, crane down from the map | each network, one per beat on beats 2-4 | — | 3D lockup `OPERATOR` on the floor beside the kernel, letters floor-rise on beats 1-3 | the hook: the map sinks toward the word as the networks light |
| 2 | b2-b3 | `kernel 2.6/58/0` to `network 1.2/20/25`, 4 s, dive to a network | network | `node` at dx -1.4 (0:02.5), `node` at dx 1.6 (0:03), s .4 | 29 `Computers like yours run each network.` in 0:02.5 out 0:05.5. Mono `01 / 03` | two node cubes land as the camera dives |
| 3 | b4 | `network 1.2/20/25` to `network 0.85/10/60`, 2 s, push to floor level past the cube | network | — | none | the cube's tower of light fills the frame |
| 4 | b5-b6 | `network 0.85/10/60` to `network 0.9/18/100`, 4 s, orbit | network, then its chains one per beat on b5 (0:08 to 0:09.5) | — | 29 `Each node keeps every chain of its network.` in 0:08.5 out 0:11.5. 47 count-up `{chains} chains`, 0:09 to 0:10. Mono `02 / 03` | the chains light in sequence round the node |
| 5 | b7 | `network` to `kernel 1.4/26/-10`, 2 s, back along the trace | the kernel at arrival | — | none | the trace runs network to kernel |
| 6 | b8-b9 | `kernel 1.4/26/-10` to `kernel 3.0/48/10`, 4 s, crane out to the grid | every network. On the downbeat of b9 (0:16) every trace runs its light out from the kernel at once | — | 29 `Your node joins this grid.` in 0:14.5 out 0:17.5. Mono `03 / 03` | the whole grid lights in one bar |
| 7 | b10-b11 | `kernel 3.0/48/10` to `hero`, 4 s, settle | none | clear at 0:19 | 47 lockup `Run a node.` at 0:18.5. `Continue` at 0:19.5 | the end: one action |

The stats and explorer pages are not opened. The mission list's steps open them after.

**Beat contract additions** these lists need (records in the role file, played by `world2-space.mjs step`): `pulse: ['pick']` (one
lamp pulse on a lit place), `run: [{ from: 'pick', to: 'prev' }]` (a trace's light runs between two places. `from: 'kernel', to: '*'`
runs every trace), `title: { text, near: 'pick', side: 'left' }` (the 3D lockup, once per trip), `count: { fact: 'Chains here' }` on a
caption (the count-up from the place's facts). All four are app work in `js/world2/` and `js/space/cinematic.mjs`.

### What fxn-3d must add

Each line: what, where it belongs (fxn-3d's engine layer), and whether 8/10 needs it. Place it first: these are render-layer features of
the engine, and the site only calls them.

| Feature | File | Needed |
|---|---|---|
| **Kinetic 3D type in the world**: a text piece whose letters are instanced rows (one row per letter, so each letter has its own transform), built from `scripts/lib/mesh/text.mjs textMesh(font, text, { perLetter: true })` outlines and drawn through `pieces.add` like every world object, lit by the look's key light, in the SDK's `--text-strong` | `js/render/world2-text.mjs` (new object module beside `world2-record.mjs`), outlines from `scripts/lib/mesh/text.mjs` | **required**: every trip's hook is the camera passing its word |
| **A point light the host moves per frame** for a light sweep along a trace: slot 1 of `R.setPointLight` already exists. What is missing is a reach (falloff radius) the host sets and a cap so two sweeps never add | `engine/render/world.mjs` (`setPointLight`, the look's `logoreach`) | optional: the trace run (dashes lighting in order) gives the sweep without it |
| **Rack focus**: depth of field in the world look's comp pass. `engine/render/post.mjs` has DOF for the studio frame, the world look has none | `engine/render/world.mjs` comp, reusing the DOF of `post.mjs` | optional: the long lens and the lit set already separate subject from field. Costs GPU time on SwiftShader. Measure before use |
| **A key-light sweep** over a bar: `setLook({ keyx, keyy, keyz })` exists. A timed sweep is the host's loop, nothing to add in fxn-3d | — | not needed |
| **Exposure pull** on the end dim: `setLook({ exposure })` exists | — | not needed: the site's CSS dim (`brightness(.4)`) is replaced by `exposure` so the lockup stays at full white over a dimmed world |

Everything else in the lists (pulse, trace run, count-up, DOM springs, the nav dim, the path's hold) is site work in `js/world2/` and
`js/space/`.

### Acceptance check

A separate critic scores it, after the build, from stills, never from a description.

1. Capture: the capture script of 11-07 (`scratchpad/cine-cap4/capture4.mjs`, moved into `scripts/` under its own name) plays each trip
   at 1440x900 and at 390x844 (phone), one still per beat (0.5 s) plus the camera log and the caption log. Two contact sheets per trip,
   one per size, four stills a row (one bar a row).
2. Measured gates, each pass or fail, read from the logs: no page change until Continue. Every caption enters at least 0.25 s after
   its move starts and leaves at least 0.5 s before the next move starts. No still where the caption block covers the lit subject's
   screen point. Every bar's still differs from the last bar's (no dead time). Every shot's "new thing" is visible in its bar's stills.
   No banned item from the list above. Every size on the ladder. No word from `BANNED-WORDS.txt`. No real `.fxn` name.
3. Scores, 1-10 with one sentence each, from the sheets: hook (the first bar alone), readability at phone size, motion quality (springs
   land, nothing restarts, the camera never kinks), variety (what changed each bar), composition (subject and type never fight),
   brand accuracy (the measured palette, the two faces, one lit subject). Sound sync is **not built** and is reported as such, never
   as 0 (the workspace law), and stays out of the mean.
4. The bar: the mean of the six is at least 8.0 and no score is under 7. One sheet, the gates and the scores go in one note under
   `docs/design/space/` for the owner, with the device and the load named.
5. Copy: `npm run copy:check -- js/space/cinematic/*.mjs` and this doc, scores reported.

Score of this section on `npm run copy:check` (2026-11-07): 4/5. The one match is the word "journey" inside the owner's quoted
sentence at the top, kept as he said it. The whole file scores 3/5, as it did before this section (its matches are in the earlier
sections).

## The site responds to you: interaction map (2026-11-07)

Reader: the three builders who start from this map, then the owner. Status: **plan, not built, not confirmed.** No code, no tests.
The owner's words: "the 3d objects are supposed to respond, the vision is that the site responds to you not some static section.
Everything is interaction and animating to you to the best of our capabilities." The passive trips failed that test.

Measured on 2026-11-07 against the live site (`http://127.0.0.1:3438/`, headless Chrome on ANGLE/SwiftShader, 1440x900 and 390x844,
this Mac). Probe: `scratchpad/imap/probe.mjs` and `probe2.mjs`. captures `scratchpad/imap/cap/*.png`. numbers `summary.json`,
`summary2.json`. Headless numbers are headless numbers: they say what moves and what settles, not what a real GPU costs.

### Layer line

Layer: **app** (the defxn site) on fxn-3d's world look. No Three.js. A response lives where the thing it moves lives:

| Response | Layer and home | Why |
|---|---|---|
| an object's light, lift, lean, pulse, a trace running, the pop on press, the pointer's lean of the camera, orbit, zoom, touch | **world**: `js/world2/world2-objects.mjs` (rows, glow, camera), `js/world2/world2-host.mjs` (pointer, wheel, touch, the lean, the one frame loop) | the rows are written once a frame in `flush`. the camera has one owner (the audit of 11-05) |
| what a place is called, the label, the focus card, the floating tags (`beacons.mjs`), the map, the quest, the trips' captions and end lockup | **parts**: `js/space/*.mjs` + `css/space/*.css`, through `window.ArkSpace` only | DOM over the canvas, read by screen readers, placed by `screenOf` |
| the home doors and counters, the HUD panels and stats, the dock, the phone layout | **page DOM**: `js/pages/intro.js`, `js/pages/home.js`, `css/world-pages.css`, `css/space-frame.css` | the page owns its words and its one dominant action (law 73) |

The core adds two members so the parts and the pages can light more than one place: `ArkSpace.light(ids | null)` (the lit set of a
show, `objects.highlight`) and `ArkSpace.near(id, k)` is **not** added: proximity is the world's own, computed where `pick` already
measures the pointer's distance to every object.

### What responds today and what does not (measured)

One line each. "diff" is the mean pixel change in a 180x180 box round the object between the idle still and the response still.

- **Hover on an object: responds.** Glow x1.5 (`HOVER_GLOW`), the label with name, line and "Click to fly", cursor to pointer. Kernel
  diff 7.4, network 15.4, chain 9.5. Nothing lifts, nothing turns, no trace lights. `cap/d02-hover-network.png`.
- **Hover on a chain under a page panel: half responds.** The glow shows, the label hides (`covers(rects())`). `cap/d02-hover-chain.png`.
- **Hover on the floor: nothing.** diff 1.0, no event. `cap/d02-hover-floor.png`.
- **Pointer near an object (not on it): nothing.** `pick` returns one hit or none. no in-between.
- **The pointer's lean: present, invisible.** Kernel moves 10 px for the full sweep of a 1440 px screen (`cam.tilt` 1.4 degrees).
  `cap/d03-lean-left.png`, `d03-lean-right.png`, whole-frame diff 2.3.
- **Press on an object: responds.** Pop (a .22-radius hop, 520 ms sine), ripple at the point, a flight of 1728 ms (`FLY_MAX` 1.7 s) to
  the place, the focus card at landing, the coach toast. 47 camera frames. `cap/d04-press-250ms.png`, `d04-press-arrived.png`.
- **Hover on the focused object: half responds.** Glow diff 11.7, no label (by rule), no hint that a second press opens its page.
- **Drag: responds.** Orbit at -0.25 degree per px yaw, 0.18 per px elev (clamped -25..30). It stops dead on release (no carry),
  nothing lights under the drag, the label is off. `cap/d06-drag-mid.png`.
- **Wheel: responds.** Zoom x exp(dy x .0012), clamped .45..2.2 of the focus distance (211 -> 302 on 300 px of wheel, floor 95). The
  page never scrolls (`scrollY` 0). It zooms to the middle, not toward the pointer. `cap/d07-wheel-closest.png`.
- **Keys: respond.** Esc goes back one level. on the grid an arrow flies to a neighbour. (Back to the grid replays the page's 12 s show:
  48-103 rAF requests a second for 12 s, then 0. A replay a visitor did not ask for.)
- **Home chip hover: responds.** `.home-net` mouseenter lights its network (diff 14.5). `cap/d08-chip-hover.png`.
- **Home doors, counters, stats: nothing in the world.** A door slides 3 px on hover (CSS), a counter has no hover at all (cursor
  `auto`), the CTA changes colour. None of them touches an object.
- **Touch (390x844): nothing.** The world stands behind the page column (`.intro-world { pointer-events: auto }` under 900 px). a tap
  lands on the SECTION, no focus, no event. A one-finger drag does nothing. A pinch zooms the browser (visualViewport scale 2.15), not
  the world. `cap/p01-idle.png`, `p02-tapped.png`.
- **Idle: settles.** 0 rAF requests in the 2 s after a landing, after a drag, after a trip's lockup lands, on the phone. A hover costs
  52 requests over 2 s (the lean's lerp to rest). `summary2.json` `hoverFrames`, `pressTimeline`, `tripTimeline`.
- **Reduced motion: respected.** Flight 7 ms (placed at once), no lean, no pop, glow still answers (diff 5.3), no card animation.
- **A trip while it plays: does not respond.** Hover events fire but the glow is ignored (`litSet` overrides `lit` in `flush`), the
  label is `display: none`, the floating tags are at opacity 0, the lean is the same 1.4 degrees. A press on an object stops the trip at
  once: caption gone, Skip gone, the dim off in one frame, then the ordinary flight. `cap/d09-trip-3s.png`, `d09-trip-pressed.png`.
- **The end lockup: does not respond.** The world sits at brightness .4, a hover on the kernel changes nothing (diff 1.6), only
  Continue and Close take a pointer. `cap/d10-trip-end.png`.
- **"Show me": half responds.** It flies to the first place of the kind (focus at 101 ms, arrive at 1834 ms), pops it, shows the card
  and ticks the step. Nothing lights before the flight, no trace runs, the object does not answer. `cap/d11-showme-arrived.png`.

### The map

Every cell is one concrete response. Numbers are in the object's own radius (`R`), degrees, px and seconds. Springs are the style
guide's, by role: **ui** (k 220, d 22, .37 s, 3% overshoot), **type** (170, 26, .31 s), **letter** (140, 24), **number** (60, 15.5,
.52 s), **heavy** (40, 12.6, .63 s). Two world motions keep what they are today: the **pop** (a .22 R hop over 520 ms, sine) and the
**lean** (a lerp of .08 a frame, about 1.2 s to rest). A world lift is written into the row's y in `flush`. a world turn into its yaw.
"Lit" means the glow factor `HOVER_GLOW` 1.5 on the object's glow parts and `.45` on every other glow part in the lit set's rule.
"Trace runs" is `objects.run(from, to, 1200)`: the dashes light in order, head x4, then rest. "Pulse" is `objects.pulse`: 700 ms, x2.6
peak. "Answers" means its label (name + line) shows at `screenOf`. Reduced motion: the state is placed at once, nothing travels.

| Object | Pointer near (within 2 R of the hit radius, `k` = 1 at the edge, 0 at 2 R) | Hover | Press | Drag | Scroll / wheel | Touch (phone) | Idle settle | Reduced motion |
|---|---|---|---|---|---|---|---|---|
| **kernel** (tower) | the top lamp and the rim edges glow x(1 + .3k). the tower lifts .01 R x k on `ui` | lit. lifts .02 R on `ui`. its top lamp pulses once. every kernel-to-network trace runs out at once (the operator's downbeat, `run('kernel','*')`). label answers "DEFXN kernel. Every network runs on it." | pop. pulse. the camera flies (`FLY_MIN`..`FLY_MAX` .8-1.7 s). at landing the networks' tags rise one per beat (.5 s) on `ui` | while a drag runs the kernel keeps its lit state. nothing new | zoom toward the pointer: the aim nudges 15% of the step toward the pointer's floor point. the kernel never leaves the frame (aim clamped to `reach`) | tap = press. the kernel's tap target is its screen radius or 44 px, whichever is larger | the lift and glow return on `ui`. frames stop within .4 s of the last change | lit on/off, no lift, no pulse, traces light whole |
| **network cube** (node) | glow x(1 + .3k) on its top inlay and lamp. the cube's core plays its own build frame back `last - .35 k` (the core unseats a hair, `O.frame`) | lit. lifts .08 R on `ui`. the core at `last - .35`. the trace kernel-to-network runs toward it. its chains' glow x1.15 (the family lights). label answers name + line + coin fact | pop. pulse. flight. at landing the chain tags rise one per beat. the card beside it turns 6 degrees to face the camera on `heavy` | the cube under a drag does nothing (the drag owns the pointer) | as the kernel: zoom toward the pointer | tap = press. drag on the cube = orbit, not a press (6 px slop, as `click` today) | as the kernel | as the kernel. the family glow is placed at once |
| **chain drum** | glow x(1 + .3k) on its stripe and lamp | lit. lifts .12 R on `ui`. its top ring turns 20 degrees on `heavy` (a drum is round: the turn reads as a spin). the trace network-to-chain runs toward it. label answers name + kind fact | pop. pulse. flight. at landing its records are called in: `spawn` 3 records at dx 1.4, 1.9, 2.4 R, one per beat (exists in shows) | nothing | as the kernel | tap = press | the turn and lift return on `ui`. the spawned records stay until Back (`clearSpawns` on focus change) | as the kernel. records placed at once |
| **record** (a spare, only while called in) | glow x(1 + .3k) | lit. lifts .12 R on `ui`. label answers "A record. Signed by its writer." (the `line` of a spare is its type's one line, a constant in `world2-space.mjs`) | the `link` spare lands between it and the record before it (`spawn` link, one beat). a second press on the record opens the chain's page (`open` of its chain) | nothing | as the kernel | tap = press | returns on `ui` | placed at once |
| **link / trace** | a dash within 2 R of the pointer glows x(1 + .5k) (the trace is a line: the pointer draws light along it as it moves) | hover on a trace (new hit: the nearest dash within 1 dash of the pointer) runs the trace toward the pointer's end. no label | press on a trace flies to the place at its far end from the current focus | a drag along a trace does nothing special | nothing | tap on a trace = press | the run ends in 1.2 s. dashes return to .55 | the trace lights whole for .7 s, no run |
| **card** (a network's card, and the card spare) | glow x(1 + .3k) on its screen | lit. the card turns to face the camera (yaw to the camera's yaw) on `heavy`. label answers the network's name + "Its card." | press = the network's press (same item) | nothing | nothing | tap = press | returns on `heavy` | placed at once |
| **node** (the node spare, only while called in) | glow x(1 + .3k) | lit. lifts .08 R on `ui`. label "A node. A computer that keeps the network." | press pulses it and its network | nothing | nothing | tap = press | returns on `ui` | placed at once |
| **the grid floor** | nothing (the floor is quiet, law 75) | nothing | a press on the floor with a focus = `back()` (up one place. the breadcrumb already does this. the ripple shows the press landed). on the grid nothing | while a drag runs the floor grid's gain goes .2 -> .3 (one `gridDirty` rewrite at drag start, one at end), so the floor is seen to turn | nothing | one-finger drag on the floor = orbit. two-finger = zoom (pinch, `touch-action: none` on the world strip). the browser never pinches the page | one rewrite at drag end | gain change placed at once |
| **the camera itself** | the lean: `cam.tilt` 1.4 -> **4** degrees yaw and 2.4 elev on the grid, 2.5 / 1.5 on a focused place (the kernel moves about 29 px for a full sweep at 1440). lerp .08 a frame as today | nothing beyond the lean | the flight as today. the pressed object pops first, so the hop is seen before the camera moves (pop at 0, flight starts at 0, the hop peaks at 260 ms) | orbit at -0.25 degree per px yaw, .18 per px elev. on release the velocity carries and decays `exp(-dt / .25 s)` (about 2 degrees of carry on a fast flick), then holds | zoom as today, aimed at the pointer. a wheel over a page panel scrolls the panel (`[data-scroll]`), never the world | one finger orbits, two zoom. a tap flies. no hover | the lean stops within 1.2 s of the last move (about 50 frames). orbit carry stops within .8 s. 0 rAF after | no lean, no carry, placed at once |
| **home doors** (`.intro-door`, 5) and **counters** (`.intro-strip`) | nothing | a door slides 3 px as today **and** lights its place in the world: Network -> `ArkSpace.light([first network])`, Chains -> every chain, Resolvers -> the kernel, Products -> the first resolver chain, Docs -> nothing. a counter lights what it counts: Networks -> `['*']`, Chains -> every chain, Resolvers -> the kernel. its number does a 2% scale on `ui` | a door opens its page (as today). a counter press flies to its first lit place (`focus`) | nothing | nothing | tap = press. the doors are 44 px tall already (56) | the light clears on mouseleave. a CSS transition of .18 s, no rAF | no slide, no scale, light on/off |
| **page HUD panels** (`.hud-left`, `.hud-right`) and **stats** (`.hud-stat`) | nothing | a stat lights what it counts (as the counters). a tab chip (`.hud-chip`) with a place lights it (`.home-net` already does) | a stat press flies to its first place. a chip press flies (as today) | nothing | a wheel over a panel scrolls the panel body only | tap = press. the panels sit below the world strip (next row) | CSS only | CSS transitions off (exists) |
| **the phone layout** (390 wide) | — | — | the top **46vh** is the world's strip: `.intro-world`, `.hud` start under it (`padding-top: 46vh`, `pointer-events: none` on the column's gap). taps, drags and pinches on the strip reach the canvas | one finger orbits | the page scrolls below the strip as a document (as today) | the strip is the touch surface. the floating tags are the tap targets (44 px, `.beacon` padding up from 24 to 44 tall) | 0 rAF (measured today) | as desktop |
| **the focus card** (`.fc`) | nothing | a child chip (`.fc-chip`) hover lights that chain and runs the trace to it (`ArkSpace.hover(id)`, exists for the tags). Open hover lights the focused place x1.5 | chip press flies (exists). Open opens. Back goes up | nothing | the card's facts scroll inside if taller than 40vh | the chips are 36 px tall. raise to 44 on touch (`@media (pointer: coarse)`) | CSS only | `fc-rise` off (exists) |
| **a trip while it plays** | the lean at 4 degrees (the camera leans toward the pointer the whole trip) | hover on any object: glow x1.5 **inside** the lit rule (`lit` is applied after `litSet`, not instead of it), lift as its row, and its word answers as a second line under the caption at 18 (`--fs-secondary`, the one 18 line a trip may use), rising on `type`. the lit subject turns 8 degrees toward the pointer's side on `heavy` (cube and drum: yaw. the kernel: its top lamp brightens on the pointer's side, a glow split, not a turn) | the trip ends **on the object**: the caption mask-wipes out on `type` (.31 s), Skip stays until landing, the path is replaced by one flight to the pressed place (`focusOn`), the vignette stays until landing, then the focus card. Never a cut | a drag ends the trip as today, but the caption wipes and the vignette fades over one bar | a wheel ends the trip the same way | a tap = press. a touch drag = drag | the trip's own loop runs while it plays (it is the one legitimate loop). after its end, 0 rAF within 1.5 s (measured 0) | no flights, captions still 4 s each (exists). hover and press still answer with state only |
| **the end lockups** (`.cine-end`) | the lockup leans 6 px toward the pointer on `type` (parallax, DOM transform) | Continue lifts 2 px on `ui` and the world's exposure comes up from .4 to .7 while the pointer is over the world (`setLook({ exposure })`, replacing the CSS `brightness(.4)`). a hovered object lights at full | a press on an object leaves the lockup: exposure to 1 over one bar, lockup wipes, the flight. Continue goes to the page | a drag leaves the lockup the same way | a wheel leaves it the same way | a tap on the world leaves it. a tap on Continue goes | 0 rAF once the lockup and Continue have landed (1.1 s) | lockup placed, exposure placed |

Rules that hold for every row:

- **One lit subject at a time** stays the rule for *lights*. Proximity and hover add glow *within* the lit rule (a factor on the glow
  the rule gives), never a second lit set. Code: the hover factor multiplies `kk` after the `litSet` branch.
- **Nothing fades** (the style guide): a response lifts, turns, lights, runs or wipes. Opacity is only for the vignette and the end dim.
- **A response never moves the camera** except the lean, the press flight, orbit and zoom. Two owners of the camera is the defect
  the audit of 11-05 removed.
- **Reduced motion has a state for every cell**: on/off, placed at once. A cell without a reduced form is not done.
- **Every response reports `moving`** to the one frame loop and returns to rest on its spring. No response adds a frame when the pointer
  is still (the proximity factor is computed in `hoverAt`, per pointer move, not per frame).

### Trips: they keep playing, and they respond

The trip is the one place a loop runs while the visitor does nothing. It keeps playing. What changes:

1. **The camera leans toward the pointer** the whole trip (the lean at 4 degrees, `cam.tilt`. the path's pose is the base the lean
   adds to, so the path stays one curve).
2. **The lit subject turns to face the pointer**: a node or a drum turns up to 8 degrees toward the pointer's side of the screen on
   `heavy`, written into its row's yaw. The kernel does not turn: its top lamp brightens on the pointer's side (a glow split across the
   lamp's instances by their x on screen).
3. **A hovered object lifts and its word answers**: the hover rule of its row applies during the trip. its name and line rise as the
   caption's second line at 18 on `type` and wipe when the pointer leaves. The label part stays hidden (`display: none`): the trip's
   caption block is the one text block on screen.
4. **A press on an object takes the visitor there**: the trip ends with the camera already flying to it. `cinematic.mjs` catches the
   `focus` event, wipes the caption (`type`), keeps Skip until `arrive`, keeps the vignette until `arrive`, then `stop()`. No beat of the
   trip plays after the press. The quest's mission ticks on that landing as on any landing (the visitor pressed. this is their move).
5. **Skip and Esc** still go to the end lockup. A drag or a wheel ends the trip, with the wipe, never the cut.

Beat contract: no new field. The trip's responses are the rows' responses, switched on by `window.ArkCinematicActive` being no reason
to switch them off.

### "Show me": now and next

Now (measured): `quest.mjs` calls `space.focus(first target of the step's kind)`. The camera flies in 1.7 s, the place pops, the focus
card shows, the step ticks, the toast says "Done". Nothing lights before the flight, no trace runs, the object does not answer. The
floating tag already wears "Click here" on that place.

Next, one sequence (`quest.mjs`, lane 2. everything it calls exists):

| At | What | Call |
|---|---|---|
| 0 | the place lights alone, the rest dims to .45 | `ArkSpace.light([id])` |
| 0 | the trace from the current focus (or the kernel) to it runs, light leads | `space.play({ steps: [{ at: 0, run: [{ from, to: id }] }] })` or the new `ArkSpace.run(from, id)` |
| .5 s | the flight starts (one beat after the light, so the visitor sees where before they go) | `space.focus(id)` |
| landing | the place pulses once. its word answers in the toast: "DeArk. A network. Its chains stand round it." (the `COACH` line, exists) | `pulse` through the step. `say` as today |
| landing + 1 bar | the lit set clears. the card's Open is lit (`.fc-open` at `--primary` fill for one bar) | `ArkSpace.light(null)` |

Show me ticks the step at landing, as today: the visitor pressed the button, the move is theirs.

### Budget

Measured here, headless Chrome on SwiftShader, 1440x900, this Mac, the grid with 3 networks and 11 chains (203 draw calls, shadow
pass on). These are headless numbers. a real GPU draws the frame faster and runs the loop at vsync.

| What | Measured | Protect |
|---|---|---|
| one world draw (`__world2.redraw()`) | 3.9-5.2 ms | a response adds at most .5 ms of CPU to a frame. the pick loop over 30 placements is already there |
| a frame during a flight (rAF interval, mean / worst) | 9.5 ms / 467 ms (one stall) | mean stays under 10 ms headless. the proximity factor, the lift and the turn are per-row arithmetic in `flush`, no new buffers |
| a hover (frames until rest) | 52 rAF requests in 2 s (the lean's lerp) | under 60 frames. the lift's `ui` spring is at rest in .37 s, before the lean is |
| a press (frames until rest) | 100 + 64 in 2 s, then 0 | 0 rAF within 2 s of landing |
| idle on the grid, the phone, after a drag | 0 | **0**: the test that already exists (`frames.size === 0` once settled) covers every new response |
| a trip | 125-320 requests a second while it plays, 0 within 1.5 s of the lockup | the trip's loop is the one loop. it ends when the lockup lands |
| a 1 px pointer move | 0-4 frames | the lean's dead band (.001) stays |

Draw on demand only: every response goes through `wake()` and returns `moving` until its spring is at rest. The one test to add once the
owner confirms: for each row, one input, then `frames.size === 0` within the row's settle time.

### Build lanes

Three lanes, no file in two lanes. Each starts with its first five rows. the rest of the map follows in map order.

**Lane 1: world responses.** Files: `js/world2/world2-objects.mjs`, `js/world2/world2-host.mjs` (the pointer and touch
section, lines 440-525, and the lean at 354-356), `js/world2/world2-space.mjs` (the `light` and `run` members only).
1. The hover lift and turn in `flush`: per placement `lift` and `turn` targets, the `ui` and `heavy` springs closed-form on `hoverAt`'s
   timestamp. kernel .02 R, node .08 R, drum .12 R + 20 degrees, card faces the camera.
2. The hover factor applied **inside** the lit rule (after the `litSet` branch), so a trip's hover shows.
3. Proximity: `pick` returns the nearest object and its `d` (0..2). `hoverAt` writes `near = clamp(2 - d, 0, 1)` on that placement;
   `flush` multiplies its glow by `1 + .3 near` and lifts .01 R x near.
4. The lean at 4 degrees on the grid, 2.5 when focused. the trace run on hover (`run(parent, hovered)`), the lamp pulse on press.
5. Touch: a one-finger drag on the canvas orbits (the handler already takes any pointer. add `touch-action: none` on the layer through
   the host's style), two fingers zoom (new: the distance between the two pointers, `zoom(d1 / d0)`), a tap is a press. Then: orbit
   carry on release, zoom toward the pointer, the floor's gain on drag, `ArkSpace.light`.

**Lane 2: parts and trips.** Files: `js/space/cinematic.mjs`, `js/space/cinematic/*.mjs`, `js/space/quest.mjs`, `js/space/label.mjs`,
`js/space/beacons.mjs`, `js/space/focus-card.mjs`, `css/space/*.css`.
1. The trip ends on the pressed object: on `focus` during a trip, wipe the caption on `type`, keep Skip and the vignette until `arrive`,
   then `stop()`. Same on a drag or a wheel.
2. The hovered object's word as the caption's second line at 18 during a trip (`hover` event -> `type` rise. `null` -> wipe).
3. "Show me" as the sequence above (light, run, one beat, fly, pulse, say, clear).
4. The end lockup responds: Continue lifts on `ui`, the lockup leans 6 px on `type`, a press on the world leaves the lockup over one
   bar (exposure through `ArkSpace` is lane 1's `setLook`. until it lands, the CSS filter transitions from .4 to 1 over 2 s).
5. The focus card's chips light their chain on hover (`space.hover(id)`). Open hover lights the place. touch sizes at 44 px. Then: the
   tags at 44 px on touch, the "Click here" bob stops after three bobs (4.2 s) and stands still.

**Lane 3: page DOM responses.** Files: `js/pages/intro.js`, `js/pages/home.js`, `css/world-pages.css`, `css/space-frame.css`,
`css/space-home.css`.
1. The doors light their place on hover (`ArkSpace.light([...])`, lane 1 ships the member first, until then `ArkSpace.hover(id)` for
   the one-place doors) and clear on leave.
2. The counters light what they count on hover, scale 2% on `ui` (CSS transition .18 s), and a press flies to the first lit place.
3. The HUD stats do the same on the pages that have them (`.hud-stat` gets `data-place` from the page that fills it).
4. The phone layout: the world's strip is the top 46vh (`.intro-world`, `.hud` start under it). the column keeps `pointer-events:
   auto` only on itself, so the strip's taps reach the canvas. `touch-action: pan-y` on the column, `none` on the strip.
5. The wheel over a panel scrolls the panel only (`[data-scroll]` on `.hud-body`, which the host already honours). Then: the "Back to
   the grid replays the show" behaviour is reported to the owner as a question, not changed here.

Order between lanes: lane 1 rows 1-2 first (the lit rule and the lift are what every other lane's hover shows). lanes 2 and 3 can start
on their rows 1 and 4-5 at once, since those need nothing from lane 1. `node --check` on every file. no test until the owner confirms.


## Intro: plan (2026-11-07)

Reader: the owner, who approves this before anything is built, then the three builders and the critic. Status: **plan, not built, not
confirmed.** No code, no tests. Layer: **app** (the defxn site) on fxn-3d's world look, through `ArkSpace` and the page DOM. The kernel learns
no word here. The owner's words: "the site responds to you, not some static section. Everything is interaction and animating to you." A
passive film fails that test. The intro is the first screen of a fresh visit (`/` redirects to `/intro`), and the rebuild goes intro, then
home, then page by page, each to 8/10 with a separate critic.

### 1. What the intro is today (measured 2026-11-07)

Headless Chrome on ANGLE/SwiftShader, this Mac, `http://127.0.0.1:3438/` (serve-site.mjs), 1440x900 and 390x844. Script and stills:
`scratchpad/intro-plan/capture.mjs`, `scratchpad/intro-plan/desktop/*.png`, `scratchpad/intro-plan/phone/*.png`, logs in each folder's `log.txt`.
(The scratchpad is this session's `/private/tmp/claude-501/-Volumes-PortableSSD/2fa4070e-20ab-451a-80b3-3019f5a494d5/scratchpad/`.)

- **A 12.9 s film with four chapters** at 0 / 4.1 / 7.3 / 11.3 s (`ArkWorldHost.filmState`): One kernel, Many networks, Signed chains, The
  grid. Words bottom left (11 mono step, 29 name, 18 line), a chapter rail, "Skip intro". The world is built during it: the kernel comes down,
  then the networks, then the chains. `desktop/film-0002s.png` to `film-0012s.png`.
- **No hook in 2 s.** At 0.5 s and at 2 s the screen is an empty floor grid with "01 / 04 One kernel" (`desktop/film-00.5s.png`,
  `film-0002s.png`). The first object lands at about 3 s. The first 2 s show nothing the visitor can look at.
- **Nothing responds during the film.** The pointer on the kernel at 3.2 s: no glow, no label (`desktop/film-hover.png` against
  `film-0004s.png`, label ""). The only inputs are Skip and the four rail steps. The map of 11-07 measured the same for the trips.
- **Two modal screens in a row.** The film ends at 12.9 s. At 14 s the "Who are you?" dialog stands over a blurred world with three role cards
  and "Just look around" (`desktop/film-0014s.png`). The dialog hides the world the film just built. A role hover changes nothing in the world
  (label "").
- **After the picker, three guides on one screen** (`desktop/look-around.png`): the hero words (76 display "Enter the grid. Many networks. One
  kernel.", the 18 lede, the CTA "Explore the network"), five doors top right, three counters bottom right, the "Missions" chip top left and a
  "New here? Pick your path" toast bottom right. Two filled actions (the CTA and the nav's teal button). Law 2 asks for one.
- **The story is architecture, not the visitor's.** Kernel, networks, chains, signed records. None of the seven beats of 11-07: no FXN ID, no
  payment, no Final, no keeper, no copy, no pinner. The visitor is never in it.
- **Phone (390x844):** the film plays the desktop camera path in portrait (objects tiny, `phone/film-0008s.png`), then the dialog fills the
  screen (`phone/picker.png`). After it the world's strip is black in the capture (`phone/look-around.png`) and a tap on it changes nothing
  (`phone/tap.png`, log: no label, no focus). The page fits (scrollHeight 844 = innerHeight).
- **What to keep:** idle settles (0 rAF in the 2 s after the film, and after a drag: `log.txt`). The world's build (objects come down, never
  grow from nothing). The type ladder and the two faces. The doors' and counters' world light (`ArkUI.placeResponse`, `ArkSpace.light`, in
  code, not re-measured here). The spare pools (8 records, 4 links, 2 cards, 2 nodes). The one 3D lockup (`objects.lockup`, baked words
  BUILDER, CURIOUS, OPERATOR in `world/trip-letters.bin`). The camera as one curve with one owner.

What fails the vision, in one line: the visitor watches 12.9 s, then reads a form, then reads a page. Nothing they do before second 14 changes
a pixel.

### 2. The intro in one line, and its one dominant action

**You get an FXN ID, you pay, and it is Final before your hand lifts: the world does nothing until you press, and answers every press.**

The one dominant action is **the press on the lit thing**: one lit object per shot, its chip in the complement (`--secondary`, once per
state, law 73). Everything else is `--primary` and its ladder. The nav dims to 0 while the intro plays (its teal button leaves the frame), so
the complement is free for the chip. Skip is an 11 mono outline, never the complement.

The intro is a rehearsal: nothing is live. The first still says so at 11 mono and the end says it again. No press writes anything anywhere.
Copy law: never invent proof.

**Which beats the intro opens with, and why.** Beats **1, 2 and 3**: you get an FXN ID, you pay and it is Final at once (a keeper signs a
receipt, no vote), copies spread to pinners on other machines. These three are one person's first thirty seconds with one card: get, pay,
see it spread. Each is one press, and each press has an honest world answer built from what the world has today (a card, a record, a node, a
trace run, a pulse). Beat **4** (a cheater caught by the copies, the bond lost) needs a second actor and a rule, and beat **5** (the 4-of-5
multisig) is a rule with no object of its own: both go to **home**, as its "why it holds" shows, once the visitor has a card to care about.
Beats **6** (value over the bridge) and **7** (found your chain, launch a token) are the builder's and the operator's roads: the deposit and
launch pages, reached from home's mission lists. Numbers in the intro: one, the copy's **about 1.1 s to a pinner**, shown only beside its
condition ("5 test nodes on one machine, nothing live"). 26,274 a second belongs to home's speed board with the same condition. 16 of 20
machines, 5 founding keepers and 30 free payments a day are home's and later pages' numbers, each with its condition.

**The look**, from `WORLD-LORE.md` "The look and the feel" (the lore's places and people stay out): the world starts in the dark and one
service lamp comes on (neon as old service lighting). Each press leaves a ripple on the floor that fades in a second (footprints on the wet
floor). The key light rises from floor level to the hero's height over the intro (the ceiling's slow morning). Rock and machine fused is the
look's plated steel on the floor grid, as it is. No new 3D shape: the kernel, the network cubes, the chain drums, the records, cards, links
and nodes, the floor and the traces, the 3D lockup letters, and what DOM draws.

### 3. The shot list on the 120 BPM grid

A beat is 0.5 s, a bar is 2 s. Every shot is a **call** (one bar of world motion, the type enters half a beat in), then a **hold** (the
press target lit, its chip up on the next downbeat, the world settled at 0 rAF), then the visitor's **answer** (their input. The world replies
over one bar, and that bar is the next call). The intro never plays more than one bar without a response available: during a call bar the
pointer's lean, proximity glow, hover labels, drag orbit and wheel zoom already answer (the map above), and the chip is up by the next
downbeat. A hold waits. It does not advance on its own. After two idle bars the lamp pulses once and the chip nudges 2 px on `ui`, once, then
rests (no idle loop). Skip (top right, 11 mono outline) and Esc go to shot 5 in one flight. The camera is one curve (`flyPath`). The press
starts the next segment, so velocity carries. Springs and type moves are the style guide's.

Places: `chain` is the first chain of the first network (`pick`), "your chain". `network` its network. Spares, all from the pools: `card`
(your FXN ID) at the chain, dx -1.4. `node` 1 (the keeper's machine) at the network, dx 1.2 dz .8. `node` 2-5 (the pinners) in a fan round the
network at 2.6-3.4 R. `record` 1 (the payment) at the keeper. `record` 2 (your receipt) beside the card, dx -1.9, token `--primary`. `record`
3-6 (the copies) at the pinners. The pool of nodes grows from 2 to 5 (a constant). The trace network-to-chain is the payment's lane.

| # | Bars | Camera (`place dist/elev/turn`) | Lit | Spares | Kinetic type (exact words, size, move) | What the visitor does | How the world answers |
|---|---|---|---|---|---|---|---|
| 1 Hook | b1 call, b2 hold | from `chain 0.9/10/-50` (floor level, the drum fills the right half, the world dark: exposure .35) push to `chain 1.1/16/-25`, 2 s | the drum: its lamp comes on at beat 1, the first light in the frame | `card` comes down at beat 3, lands on the downbeat of b2 | 29 `You get an FXN ID.` per-word rise in at 0:00.5, left half. 11 mono `A REHEARSAL. NOTHING IS LIVE.` track-in with it. Chip (complement, `ui`) `Press your ID` rises on the card's `screenOf` at 0:02 | pointer near the card: it glows. Hover: it turns to face the camera on `heavy`, label "Your FXN ID. It keeps its own chain.". Drag orbits. Wheel zooms. **press** the card (tap on phone, Enter on the keyboard) | the card lifts .12 R, its screen lights `--primary`, a ripple on the floor at the press. The drum's top ring turns 20 degrees on `heavy` (your chain wakes). The caption mask-wipes. The camera starts shot 2 |
| 2 Pay | b3 call, b4 hold | `chain 1.1/16/-25` to `chain 1.5/28/10`, crane up and back so the keeper and the trace are in frame, 2 s | the card stays lit. The keeper node lights at landing | `node` 1 comes down at beat 1, lands on beat 3 | 29 `Pay. A keeper signs it. No vote.` in at +0.5. 11 mono `02 / 05`. Under it a DOM **drag track**, 320x44 px, knob at the left, label `Drag to pay`, up on the downbeat of b4 | **drag** the knob (pointer or finger). Keyboard: Enter pays at once. Reduced motion: a `Pay` button | the trace lights from the drum toward the network in step with the knob (the run's head at the drag's fraction p). A release under .9 runs the light back on `type`. A release at .9 or more pays: shot 3 |
| 3 Final | b5 answer, b6 hold | **whip** to `network 1.0/14/40` in beat 1 (the one whip), settle beats 2-4 | the keeper. At the whip's end everything else dims to .45 | `record` 1 lands at the keeper on beat 2. The 3D lockup `FINAL` floor-rises beside the keeper, one letter a beat, beats 2-4 (`heavy`). `record` 2 (your receipt) lands beside the card on the downbeat of b6 | 29 `Final. One keeper signed the receipt.` in at +0.5, out before b7. 11 mono `03 / 05`. Chip `Press the receipt` on record 2 at b6 | the keeper's lamp pulses on beat 1 (`pulse`). Hover on record 1: label "Your payment. Signed by the keeper.". **press** the receipt | record 2 lifts .12 R, the card's screen pulses once, a ripple. 29 `Keep it. Anyone can check it.` for one bar. The lockup sinks (`lockupLeave`). The camera starts shot 4 |
| 4 Copies | b7 call, b8 hold | `network 1.0/14/40` to `network 1.3/30/0`, crane up, 2 s. Then the visitor's wheel is the camera move: zoom out (`zoom`, toward the pointer, clamped .45-2.2) | the keeper and the four pinners as they land | `node` 2-5 come down one per beat on b7 | 29 `Copies go to pinners on other machines.` in at +0.5. 11 mono `04 / 05`. Chip `Scroll out` (phone `Pinch out`. Keyboard: the minus key) at b8 | **wheel** one notch or more out (pinch on phone) | on the first notch the keeper pulses, and `record` 3-6 come down at the pinners and land 1.1 s later, together. At the landing 29 `A copy reached each pinner in about 1.1 s.` and 11 mono `MEASURED ON 5 TEST NODES ON ONE MACHINE. NOTHING LIVE.`. The camera keeps zooming with the wheel. The key light rises to the hero's height over this bar |
| 5 Who are you | b9-b10 call, then hold | to the hero pose, 4 s, settle. The scene the visitor built stays standing (card, records, keeper, pinners, copies) | none. Exposure 1 | none. Nothing clears until home asks | 47 `Who are you?` scale-down lockup, top left, at b9 beat 3. 11 mono `05 / 05`. Four role tags (DOM, 44 px, 18 name + 11 mono line) rise one per beat on b10 at their places (section 4) | **hover** a tag: its place lights and the trace to it runs from the kernel. **press** a tag. Tab moves between them | the pressed tag's place pulses, the other three wipe upward, the role is kept, the hand-over to home (section 4) |

With every press on its downbeat the intro is 10 bars, 20 s, plus the visitor's own time. The hook is bar 1: a lamp comes on in the dark, a
card lands, a word rises, a chip asks for a press, all before 0:02.

Reduced motion: every spawn, lift and light placed at once. Captions still 4 s each. The drag track is a `Pay` button. The wheel step is a
`Show the copies` button. The camera placed at each shot's end pose. The press still advances.

Rules the shots keep: the words enter at least half a beat after the move starts and leave at least one beat before the next move. Type never
covers the lit subject's screen point (the block takes the emptier half, `screenOf`). Nothing fades (lifts, turns, lights, runs, wipes;
opacity only for the vignette and exposure). No size off the ladder. No banned word (`docs/BANNED-WORDS.txt`). No real `.fxn` name. The
chip is the only complement on screen. A visitor's drag or wheel during a call wins and the call's end pose is where the camera settles after.

### 4. The role picker

The picker is **shot 5**, standing in the world, never a dialog over it. Four tags at four places, placed by `screenOf` each frame:

| Tag | Place | Hover (the world answers) | Press: the hand-over to home |
|---|---|---|---|
| **Just curious** (the lead: the complement) | the kernel | the kernel lights, every trace runs out from it once | role `curious` kept in `defxn-quest-v1`. Home opens with the curious mission list, its first step the kernel |
| I build apps | your chain drum (the card beside it) | the drum lights, the trace network-to-chain runs | role `builder`. Home opens with the builder list, its first step the chain |
| I run computers | the keeper node | the keeper and the pinners light, the keeper pulses | role `operator`. Home opens with the operator list, its first step the node |
| Just look around | the dock, no place | nothing lights | `skipped` kept. Home opens on the free grid with the "Missions" chip only |

Every press hands over the same way: the tags wipe, `ArkUI.pageRouter.navigate('zero')`, the world stays (the space persists across routes;
the hero pose holds. No cut), and home rises its own words. Home decides what it shows for each role in its own plan. The intro only keeps the
role and lands the camera. A return to `/intro` inside the site shows shot 5 standing (the picker in the world), never a replay. `Replay
intro` is an 11 mono chip at the dock. A fresh load of `/` or `/intro` plays the intro once (the `FILM_KEY` rule as today). The quest part keeps
its missions and its toasts. Its modal picker is retired, and "Pick your path" (`journey.mjs`) opens shot 5's tags in place of the dialog.

### 5. Phone (390x844)

- The world is the whole screen: no page column on `/intro`. `touch-action: none` on the canvas. The page never scrolls (scrollHeight =
  innerHeight, as today).
- Camera: each shot's `dist` x 1.35 in portrait (the long lens keeps an object's size as it orbits, so the fan and the trace stay in frame).
- Type one step down: 47 to 29, 29 to 18, 11 stays. The caption block sits in the top 16-40 % of the screen. The chip, the drag track and the
  role tags sit in the thumb zone (the bottom 22 %, above the safe-area inset), 44 px tall, full width minus 16 px gutters.
- Inputs: tap = press (the target's screen radius or 44 px, whichever is larger). The drag track is the same DOM track under a finger. Shot 4's
  wheel is a two-finger pinch out (lane 1's touch zoom) and the chip says `Pinch out`. One finger on the floor orbits.
- Shot 5's tags: at their places when the places are at least 48 px apart on screen, else stacked in the thumb zone as four rows in the order
  of the table.
- Hover has no phone form. Proximity has none. A tap on a lit object is its press. Nothing the intro needs is hover-only.

### 6. The acceptance check

A separate critic scores the build from stills and logs, never from a description. The capture script is the trips' (`scratchpad/cine-cap4/
capture4.mjs`), moved into `scripts/` as `intro-capture.mjs`, with a scripted visitor.

1. **Capture**, at 1440x900 and 390x844, three runs each: (a) the visitor presses on the downbeat after each chip lands, drags the track to 1,
   wheels two notches at shot 4, presses "Just curious". (b) the visitor does nothing for 8 bars after shot 1's chip. (c) the visitor hovers
   the card, drags the world and wheels during shot 1's hold. One still per beat, the camera log, the rAF count per 2 s, and a DOM log
   (captions, chips, labels, tags with their screen boxes). Two contact sheets per size for run (a), four stills a row.
2. **Gates**, pass or fail from the logs: the 0.5 s and 2 s stills each hold a lit object (the 180 px box round the drum differs from the canvas
   colour by a mean over 8) and a visible caption. Within one beat of every scripted input the still differs round its target (diff over 5)
   and the chip changes state. Every 2 s window of run (a) logs an available response (a chip up, or a hover, drag or wheel answered);
   run (b): 0 rAF in each 2 s window after the hold lands, except the one nudge window. Run (c): the hold's target stays lit through the
   drag and the wheel. The camera's yaw and elev never jump more than 3 degrees in a frame except in the whip. Every caption enters at least
   0.25 s after its move starts and leaves at least 0.5 s before the next. No still where the caption block covers the lit subject's screen
   point. Every bar's still differs from the last. Every size on the ladder. The complement appears at most once per still. No banned word;
   no real `.fxn` name. Every number stands on the same still as its condition. Phone: every text at 18 px or more except 11 mono labels,
   every chip and tag at least 44 px tall, nothing outside the viewport, no scroll.
3. **Scores**, 1-10 with one sentence each: hook in 2 s (bar 1 alone), responds to the visitor (runs a and c), readability at phone size,
   motion quality (springs land, nothing restarts, the camera never kinks), variety (what changed each bar), composition (subject and type
   never fight), brand (the measured palette, the two faces, one lit subject, the lore's dark-to-lit floor). Sound is **not built** and is
   reported as such, never as 0, and stays out of the mean.
4. **The bar:** the mean of the seven is at least 8.0 and no score is under 7. One note under `docs/design/space/` with the sheets, the gates,
   the scores, the device and the load.
5. **Copy:** `npm run copy:check -- js/space/intro.mjs js/content/manifests/home.js` and this doc, scores reported.

### 7. Build lanes (three, no file in two lanes)

**Lane 1: world.** `js/world2/world2-objects.mjs`, `js/world2/world2-space.mjs`, `js/world2/world2-host.mjs`, `scripts/bake-trip-letters.mjs`
and its output `world/trip-letters.bin`.
1. `POOL.node` 2 to 5. The word `FINAL` baked into `trip-letters.bin` (the same script and format. A missing word shows no lockup, never a
   fake one).
2. `run` takes a progress `p` (the head at the drag's fraction. The time-based run stays for `p` absent): `ArkSpace.run(from, to, sec, p)`.
3. `ArkSpace.exposure(v)` on the look (`setLook({ exposure })`), placed at once with reduced motion. The intro's dark start and the key light's
   rise use it.
4. The old four-chapter film is retired: `film: true` builds the world at once in the dark (exposure .35) and reports `done`. The camera's
   first pose is shot 1's start. `filmState` stays so every part's "while the film plays" rule still holds for the 0.8 s it takes.
5. Touch: tap = press, one finger orbits, two fingers zoom (the map's lane 1 row 5). The press ripple on the floor on every press and tap.

**Lane 2: the intro part.** New `js/space/intro.mjs` and `css/space/intro.css`. `js/space/quest.mjs` (wiring only: the modal picker retired,
the role read from the same key). `js/space/journey.mjs` ("Pick your path" opens shot 5's tags). `js/space/space.mjs` (registers the part);
`js/space/cinematic.mjs` exports its `spring` so the intro reuses it (centralize, never a second copy).
1. The five shots as one sequence on `performance.now`: calls as `space.play` steps (shot, light, spawn, pulse, run, title), holds that wait
   on the visitor's input, answers as the next call.
2. The kinetic type: captions at 29 (per-word rise, mask wipe), the mono labels (track-in), the 47 lockup (scale-down), placed by `screenOf`
   into the emptier half.
3. The chip (complement, `ui`), the drag track (pointer, touch, keyboard, reduced-motion button), the wheel step, Skip and Esc.
4. Shot 5's tags, their hover lights and runs, the hand-over to home.
5. The phone layout of the part (type one step down, thumb zone, stacked tags).

**Lane 3: the page.** `js/pages/intro.js`, `css/world-pages.css`, `js/content/manifests/home.js` (the `LANDING.*` strings).
1. The film chrome (caption, rail, "Skip intro", "Replay intro" in the ledger) leaves. `Replay intro` becomes a dock chip. `filmWanted`
   becomes the intro's once-per-fresh-load rule (`FILM_KEY` stays).
2. The page's words, doors and ledger leave `/intro` (home's plan places them). `/intro` is the world and the part. The nav dims to 0 while
   the intro plays and returns at shot 5.
3. The `LANDING.*` copy keys for the intro's words (every word a visitor reads comes from the manifest, as today), checked with
   `npm run copy:check`.
4. The phone layout: no column on `/intro`, `touch-action: none` on the world, the safe-area insets.
5. The ten-question reduction test for the intro screen in the build notes before handover.

Order: lane 1 rows 1-4 first (the dark start, the pool and the lockup are what shots 1, 3 and 4 need). Lane 2 starts on rows 1-2 with
today's time-based `run` and swaps to `p` when it lands. Lane 3 starts at once. `node --check` on every file. No test until the owner
confirms. No commit.

Score of this section on `npm run copy:check` (2026-11-07): 4/5. Its one match is the file name `journey.mjs`, named twice because
lane 2 edits it. The whole file scores 4/5 (was 3/5): the other matches are in the `ArkSpace` table's `back()` row and the earlier
sections' headings.

## Scene redesign plan (2026-11-07)

Reader: the owner, who approves this before anything is built. Then the one 3D lane that builds it, phase by phase, and the critic who
scores each phase. Status: **plan, not built, not confirmed.** No code, no 3D edits, no tests, no commit. The owner's words: "the entire
scene needs to be upgraded and redesigned, because it was an MVP idea, but now we've outgrown that", and earlier: "the site responds to
you, not some static section. everything is interaction and animating to you". The intro, home and every page stand on this scene, so
the scene comes first. Only one agent edits 3D at a time. the logo agent holds that slot now, so every phase below waits its turn and runs
alone.

Measured on 2026-11-07 against the live site (`http://127.0.0.1:3438/`, `serve-site.mjs`), headless Chrome with `--use-gl=angle`, which on
this Mac reports `ANGLE Metal Renderer: Apple M2`: these are GPU numbers through a headless page, not SwiftShader, and not a real window.
1440x900 and 390x844, device pixel ratio 1. Script and stills: `scratchpad/scene-plan/capture.mjs`, `stats.mjs`, `desk-*.png`,
`phone-*.png`, `log.txt`, `run.out` (this session's scratchpad,
`/private/tmp/claude-501/-Volumes-PortableSSD/2fa4070e-20ab-451a-80b3-3019f5a494d5/scratchpad/scene-plan/`. the scratchpad is not
durable, so the numbers that matter are copied into this section).

### 1. Layer line

| Layer | What it holds | Files |
|---|---|---|
| **fxn-3d engine** (renderer) | the world look (eight programs: lit, dots, flat, depth, bright, blur, comp. Lambert key, back, fill, hemisphere, one 2048 shadow map, three-level bloom), the pieces look (the material program: metal, rough, clear coat, sheen, anisotropy, transmission, iridescence, emission, image and procedural maps), the look knobs (`setLook`), the mirror twins, the glow shells | `/fxn-3d/engine/render/world.mjs`, `pieces.mjs`, `material-glsl.mjs`, `post.mjs`, `shells.mjs` |
| **fxn-3d object library** | each object as data: parts, materials by name, theme roles, six build steps, `frame(T)`. No page, no GL, no colour | `/fxn-3d/js/render/world2-<id>.mjs` (kernel, core, node, drum, card, record, link, text) on `world2-object-kit.mjs` (`MATERIALS`: steel, shell, floor, glass, glow) |
| **the site's world records** | the facts of the picture: the rings (`WRING`, kind, place, size), the cubes, the labels, the look knobs (`WKNOB-Glook-*`, 42 knobs: key at (-30, 26, -8), exposure 1.12, fog 1.1-3, dust 80, mirror .35) | `world/world.flx` (682 records), derived by `scripts/world-encode.mjs` from `js/content/network-data.js` and `world-data.js`. never hand-edited |
| **site code** (app) | the layout (`NET_R` 5.6, `CHAIN_R` 3, `GRID_SPAN` 26 kernel radii), the traces, the spares, the film clock, the camera (`hero`, `focusPose`, flights), the pointer's answers, `ArkSpace` | `js/world2/world2-objects.mjs` (549 lines), `world2-space.mjs`, `world2-host.mjs`, `world2-letters.mjs` |

The rule for this plan: a new **shape** is object-library work (fxn-3d, the 3D lane). A new **place, size, light or state** is site work
(`world2-objects.mjs` and the records). A new **material term** is engine work, and the logo agent is adding those now (emissive maps,
procedural patterns, thickness, sheen are in its uncommitted diff). the scene **reuses** them and adds none. The kernel learns no word:
"keeper", "pinner", "bridge" are names of objects in the library and places in the site, nothing in the engine.

### 2. What the MVP scene gets wrong (measured)

One line each, with the still that shows it.

- **Scale: the grid is a table of toys.** The kernel's radius is 4.82 world units, a network's reach 17.07, a chain drum 1.64 (`targets()`).
  At the grid pose (`desk-grid-low.png`, elev 44) the kernel is 80 px wide on a 1440 px screen, a drum is 35 px, a record would be 10 px.
  Eleven chains read as eleven dots. The camera has to fly to a drum before the drum is a thing.
- **Materials: one grey.** Every body is the kit's `steel` (metal .35, rough .42, coat .5) under a Lambert light with no specular and an
  environment at .24, so steel, shell and glass all come out as the same flat grey (`desk-focus-kernel.png`: the tower's panels, its ring
  and its crown are one tone). The glass parts are near-invisible. Nothing reflects anything. The mark references (`marks-3d/refs/`) show
  the bar: glass, crystal, chrome, marble, lit edges. The scene has none of the five.
- **Lighting: no depth, no hour.** One key light, one brightness everywhere, fog from 1.1 to 3 that never shows at these distances, a black
  void past the grid. Near and far read the same (`desk-grid-idle.png`: the drum at 8 units and the kernel at 40 are equally sharp and
  equally lit). The lore's ceiling (a slow blue morning, an amber night) is absent: the world has no sky and no hour.
- **The floor is lines on nothing.** `obj-grid` is 53 glowing lines on `--canvas` (`#0c0a09`). The lore's wet floors, the kit's mirror twins
  (built, `MIRROR .55`) and the look's `mirror .35` knob are all unused because there is no floor surface to reflect in. Shadows (a 2048 map,
  on) land on black and are invisible.
- **Readability: the story's actors have no shape.** A network is a cube, a flat panel on a mast and a fan of drums. Nothing in the picture
  is an FXN ID, a keeper, a receipt, a pinner, a bond, a gate, a bridge, a multisig or a token. The seven beats of the story cannot be
  pointed at. The network card is a black rectangle from most angles (`desk-film-8s.png`, four of five cards show their back or edge).
- **Noise reads as light.** The orange columns of motes over every drum and node (`desk-grid-idle.png`, `phone-grid-idle.png`) are the
  previews' stage dust (`dust 80`) and read as static, not as light. The dashed traces float a hair above the floor and break up at
  distance (`desk-grid-low.png`).
- **Duplicate places.** `targets()` returns two places `net:-1` named "Network", radius 1.04, standing at the kernel's position
  (`run.out`, desk and phone). A part that draws every target draws two phantoms on the kernel. A defect to fix in phase 0.
- **Phone (390x844).** Today the world **draws** on `/intro` after the film (`phone-grid-idle.png`. the canvas's centre pixels read a mean
  of 172 of 255, `run.out` "phone pixels"). The black world of the intro plan's capture was the page after the picker, where the page
  column stands over the strip. What is wrong is the frame: the desktop camera path in portrait puts the focused network 1007 px off the
  left edge (`targets().screen`), objects are cut by the frame, a tap on the lit drum changed nothing (`phone-tap.png` equals
  `phone-grid-idle.png`), and the four kernel-to-network traces leave the frame.
- **Cost today** (headless, this Mac's M2 through ANGLE, 1440x900): 189-193 draw calls a frame with the shadow pass on, about 10,970
  instances a frame, a redraw of 4.0-4.9 ms (10 redraws, min / median / max 4.0 / 4.3 / 4.9), the first drawn frame 458 ms after
  navigation, 138 GL textures, 1,056 buffer uploads over the load. Placements: 1 kernel, 1 core, 5 node cubes (3 built + 2 spares), 5
  cards, 11 drums, 8 record spares, 4 link spares. Triangles are **not measured**: my GL wrapper counted 17.5 M a frame including the
  shadow pass, and the engine's own `stats.tris` reads 10, so the two counters answer different questions. Phase 0 fixes the counter
  before any triangle budget is quoted.

What to keep, measured: idle settles (0 rAF after a landing), the build-up reveals (nothing grows from nothing), one camera owner, the
objects' six-step builds, the spares, the 3D lockup, the ember palette and the two faces, `ArkSpace` and every part on it.

### 3. The new scene in one paragraph

The scene is **the Works**: one great underground machine hall where rock and machine are fused, seen from a visitor's height on a wet plated
deck. The **kernel** stands at the middle as it does today, the tower on its ring, restyled: a chrome ring, a crystal crown (transmission
and iridescence from the logo agent's work), the mark lit from inside. Round its foot stand **five seal stones**, the multisig: four of five
lit is the rule that changes rules. Each **network is a district**: a raised stone plinth on the deck, its **node cube** (the machine) at
the centre, its **sign** hanging over the district's entry in the network's token (neon as old service lighting), a **gate** arch at that
entry that every record passes through (the grammar check), a **keeper's desk** beside the cube with a stamp, a receipt tray and a bond
lamp, its **chains** as drums fanned behind the cube with their pages showing under the lid (a key's book of numbered pages), and
**copy towers** on the district's rim, thin and tall, that take a copy of every page (the pinners). Between two districts a **bridge** spans
a dark channel in the deck (value over the bridge), and at the hall's edge an empty plinth with a sunk slot is the **launch pad**: found
your own chain and a drum rises, a token coin on it. **Traces** are rails of light set into the deck, not dashes over it. The **ceiling
is the sky**: far panels whose hour sets the key light's colour and height, a slow blue morning and an amber night, read once from the
visitor's clock at load and again at every flight, never ticking (animations settle). The look is dark, desaturated and quiet (law 75).
saturation is spent on the one lit subject, the network tokens on their signs and rails, and the complement on the one chip. Materials by
object: chrome (metal 1, rough .08, the room environment) on the kernel's ring and every bevel. crystal (transmission, thickness,
iridescence) on the crown, the FXN ID card's face and the seal stones. stone (a procedural pattern, rough .8) on the plinths, the pad and
the bridge's piers. plated gunmetal (today's `steel`) on cubes, drums, desks and towers. emission (the `glow` material and the new emissive
maps) on signs, rails, stamps, bond lamps and the mark. the deck a dark coated floor (`floor`: coat 1, opacity .74) with the kit's mirror
twins under every object and the look's `mirror` knob on, so lit edges reflect in the wet.

### 4. The shape list

Columns: the object. what it stands for in the story. its form. its material (PBR terms the engine has, or the logo agent is adding). its
states (idle, near, hover, press, lit, busy). what animates on it. and whether it **exists and is restyled** or is **new**. Glow follows the
one-lit-subject rule (the interaction map). Every new object is a library object with six build steps and a preview page
(`previews/object.html?o=<id>`), like the seven that exist. Reduced motion: every state placed at once.

| Object | Story | Form | Material | States | Animates | Status |
|---|---|---|---|---|---|---|
| **deck** (the floor) | the hall's floor, the place everything stands on | one dark plated floor plate over the grid span, grid seams engraved (the old lines become grooves), a shallow channel under the bridge | `floor` coat 1 with the `mirror` knob on. the engraved seams `--primary-300` at gain .2 | idle: quiet (law 75). drag: seams gain .2 to .3. press: a ripple at the point that fades in a second (the footprint). busy: none | the ripple only | restyled (`obj-grid` becomes a plate. the ripple exists) |
| **ceiling** (the sky) | the hour of the hall | a far plane of panels high over the deck, lit by the hour. the hemisphere's sky colour reads from it | emission in the hour's colour (blue morning, white noon, amber night). the key light's direction and colour derive from the same hour | set at load and at every flight, from the visitor's local hour. night when the clock is unavailable | nothing ticks. a flight may cross an hour boundary and the key moves inside the flight | new (a look change plus one far piece) |
| **kernel** (tower on its ring) | the kernel: small, structure only | as today: the octagonal tower, the crown, the ring. the plate stays retired | the ring and every bevel chrome (metal 1, rough .08, env). the crown crystal (transmission .9, thickness, iridescence). the panels plated gunmetal. the mark emissive | idle: the mark at `SITE_GLOW`. near: the mark x(1 + .3k). hover: lit, lifts .02 R, every trace runs out. press: pop, pulse, flight. lit: 2.2 x. busy (a rule change): the seal stones light one per beat | the crown's refraction with the camera. the pulse | exists, restyled |
| **seal stones** (five) | the 4-of-5 multisig that guards the rules | five low faceted stones in a ring at the kernel's foot, each with a lit seal on top | crystal (transmission, iridescence). the seal emissive `--primary` | idle: all five dim. hover on the ring: four light, one stays dark, label "Four of five keys change a rule". press: flies to the ring. busy: four light one per beat, the fifth never | the lighting order. a stone turns 15 degrees on `heavy` when lit | new |
| **district plinth** | a network's ground | a raised stone platform, a step high, the network's radius, a gap at its entry for the gate | stone (procedural pattern, rough .8), a lit rim in the network's token at `SITE_GLOW` | idle: rim dim. hover on any object of the district: the rim lights x1.15 (the family). lit: rim 2.2 x | the rim's light only | new |
| **node cube** | a network's machine | as today: the six-step cube | plated gunmetal. the top inlay and the lamp emissive. the X engravings in the normal map | as the interaction map's row: near, hover (lifts .08 R, the core unseats), press, lit | the build, the core's back-step, the lift | exists, restyled |
| **sign** (the network card) | a network's name and count | the card becomes a hanging sign over the gate: a double-sided lit panel on a short boom, never edge-on | the panel emissive in the network's token, the frame chrome | idle: the name at `SITE_GLOW`. hover: turns 8 degrees toward the pointer on `heavy`. press: the network's press | the turn | exists, restyled (`world2-card.mjs` gains a `sign` pose) |
| **gate** | the grammar check: every page is read before it is kept | an arch at the district's entry over the rail, a scan line across its opening | plated gunmetal. the scan line emissive `--text-strong` | idle: dark. busy (a record passes): the scan line sweeps once (.5 s), the record lights on the far side. a bad record: the scan line goes `--danger` for one beat and the record stops in the arch | the sweep | new |
| **keeper desk** | a bonded keeper signs a receipt, no vote | a desk beside the cube: a stamp on an arm, a receipt tray, a bond lamp on a post | plated gunmetal. the stamp's face emissive `--primary`. the bond lamp emissive `--trust` | idle: lamp lit (bonded). hover: label "A keeper. Bonded. Signs your receipt." press: flies. busy (a payment): the stamp arm drops once on `ui`, a receipt record rises from the tray. caught (a cheater): the bond lamp goes dark, the desk's rim goes `--danger` for one bar, the lamp stays dark until Back | the stamp's drop, the lamp | new |
| **chain drum** | a key's book of numbered pages | the confirmed drum (its form stays). its lid lifts a hair when near to show a stack of pages inside. the kind's stripe stays | plated gunmetal. the bevel lines chrome. the stripe emissive in the kind's token. the pages a pale coated card | as the map's row: near, hover (lifts .12 R, top ring turns 20 degrees), press, lit. busy (a record arrives): the lid lifts, the page count ticks up by one on its lid's engraved number | the lid, the top ring | exists, restyled |
| **record** (a page) | one signed record: a numbered page with a stamp | the slab, thinner (a page), the stamp mark on its top face lit, its number engraved | plated gunmetal. the stamp emissive `--primary`. the glass strip crystal | as the map's row. busy: travels from the keeper's tray through the gate to its drum on a rail | the travel (translation along the rail, never a fade) | exists, restyled |
| **link** (a rail segment) | each record links to the one before | the link becomes a short lit rail between two pages, set into the deck | emission in the network's token | hover: lights x1.5 toward the pointer's end. press: flies to the far end | the run | exists, restyled |
| **copy tower** | a pinner: keeps copies apart from the originals | a thin tall stack of page slots on the district's rim, a lamp on top | plated gunmetal. the slots emissive `--primary-300` dim. the lamp `--live` | idle: lamp lit when the pinner is up (real data. absent when unknown, never dark-as-zero). busy (a copy arrives): one slot lights at the base and the light climbs one slot per 60 ms to the top. the tower's count ticks | the climb | new |
| **trace** (a rail) | the way a record travels | the dashes become one continuous engraved rail in the deck from the kernel to each district and from each cube to each drum | emission in the network's token at .55. the head of a run at 1.1 x4 | as today's `run()`: light leads, the camera follows | the run | exists, restyled (one stretched piece per trace, not 9 dashes) |
| **bridge** | value over the bridge | a span over the deck's channel between the first chain's district and a dark gate at the hall's edge. two stone piers, a chrome rail | stone piers. the deck plated. the rail chrome. a lit line along it in `--primary` | idle: dim. hover: the lit line runs across. press: flies to the bridge. busy (a deposit): a page crosses on the rail, the far gate lights once | the crossing | new |
| **launch pad** | start your own chain, launch a token | an empty plinth at the hall's edge with a sunk slot. on launch a drum rises out of the slot and a token coin lands on its lid | stone. the slot's rim emissive `--primary-300`. the coin chrome with an emissive edge | idle: the slot dim. hover: the slot lights, label "Found your own chain here." press: flies. busy (launch): the drum rises on `heavy` (1 s), the coin drops `ARRIVE_S` and lands | the rise, the drop | new |
| **FXN ID card** | the visitor's card, their chain's key | the card spare, standing beside the visitor's drum, its face a glass pane over the plated body | crystal face (transmission .6, iridescence low). plated body. the name line emissive | as the map's card row: hover turns it to the camera on `heavy`. press lifts it .12 R and lights its face | the turn, the lift | exists, restyled |
| **3D lockup letters** | the trip's one word in the world | as today (baked letters) | chrome with a crystal top face, so the key light draws a line along every letter | floor-rise, sink | the rise | exists, restyled |
| **light columns and motes** | nothing | the stage dust over every drum and cube | — | — | — | **retired** (`dust 80` becomes 0 in the look knobs. the previews keep theirs) |

What is not a shape: the cheater is a **state** of the keeper desk and the gate, played by a show. The multisig vote is a state of the
seal stones. A page's words stay DOM.

### 5. The camera and the visitor

- **Default pose (the hero).** Today: elev 44, yaw 6, the whole grid as a map. New: elev **28**, the eye at a visitor's height over the
  deck, the kernel right of the middle at about a quarter of the frame's height, the nearest district in the foreground, the far districts
  under fog, the ceiling's panels in the top sixth. The map view (elev 50-62) stays as the `map` part's pose and as the "Grid" chip's pose,
  one zoom step out. Distances keep the long lens (`TAN`, 12 degrees): nothing in this plan changes the lens.
- **How the visitor moves.** As the interaction map: press a thing to fly to it (one flight, one owner), drag to orbit (carry on release),
  wheel to zoom toward the pointer, Esc or the floor to go back one level, arrows between neighbours, `/` to jump. New: a press on a rail
  flies along it to the far end, and the pointer's lean stays at 4 degrees. The levels become: **hall** (everything) > **district** (a
  network) > **drum** (a chain) > **page** (a record, only while called in). The kernel, the seal ring, the bridge and the pad are places
  under the hall.
- **Each page's place** (`js/space/routes.mjs` keeps the map. new ids added):

| Page | Place | Pose |
|---|---|---|
| `/intro` | the visitor's drum and card, shot 1 of the intro plan | `chain 0.9/10/-50` to `1.1/16/-25`, as the intro plan |
| `/` home (`zero`) | the hall | the hero |
| grid | the hall | the hero. the "Grid" chip one zoom step out |
| a network's page (`ring?i=`) | its district | `district 1.0/24/away`, the gate and the sign in frame |
| a chain's page | its drum | `drum 1.0/30/away` as today, the lid lifted |
| how it works | the first district's gate | `gate 1.0/18/-20`, a record waiting in the arch |
| resolutions | the seal ring | `kernel 1.2/20/0`, the five stones in the foreground |
| explore, stats | the first district's copy towers | `tower 1.3/22/40`, the lamps that are up lit |
| download, run a node | one copy tower | `tower 0.9/14/-30` |
| deposit, the bridge page | the bridge | `bridge 1.0/16/90`, along the span |
| launch | the launch pad | `pad 1.0/22/0` |
| account, FXN ID | the visitor's card | `card 0.8/12/20`, the face to the camera |

- **Phone (390x844).** Every pose's `dist` x 1.35 in portrait (the intro plan's rule), the aim lifted so the subject sits in the top 55 % and
  the thumb zone is free. One finger orbits, two zoom, a tap presses (44 px floor on every target). The traces that leave the frame are
  not a defect on the phone: the subject is.

### 6. Performance budget

Today's numbers (section 2) are the floor. the law is never regress speed. Each number says what is held constant: 1440x900, device
pixel ratio 1, the ember theme, 3 networks and 11 chains, the shadow pass on, headless Chrome with ANGLE on this Mac's M2, measured by
`stats.mjs` (to be moved into `scripts/scene-stats.mjs` in phase 0 and run before and after every phase).

| What | Today (headless, M2 through ANGLE) | Budget after the redesign | How it is held |
|---|---|---|---|
| draw calls a frame | 189-193 (shadow pass on) | **at most 240** | every new object is instanced pieces shared across placements (one draw per part per object kind, as today). The 9 dashes per trace become 1 stretched rail: -70 draws. Five new object kinds at 6-10 parts each: +40 |
| instances a frame | about 10,970 | at most 12,000 | the rails and the deck's seams are fewer, the towers' slots are more |
| triangles a frame | **not measured** (two counters disagree, section 2) | set in phase 0 from the fixed counter, then held to 1.3x | the deck is one plate. the stones and the crown are low-poly facets (facets are the look) |
| texture memory | 138 textures. bytes not reliably measured (my wrapper counted re-allocations on resize) | **at most 48 MB**: the shadow map 2048 square depth 16 MB, the half-float main target 1440x900 10 MB, the bloom chain about 3.5 MB, four procedural pattern textures at 1024 square 16 MB, the rest under 2 MB | procedural patterns are made once at load and shared (stone, gunmetal). no image maps over 1024 |
| one redraw | 4.0 / 4.3 / 4.9 ms (min / median / max of 10) | **median at most 5.2 ms, max 6.0** (1.2x today's worst), measured the same way | the mirror twins double the instance count of what stands above the floor. they are drawn only in the lit pass, never in the shadow pass. transmission draws the crown and the stones after the solids, once |
| first drawn frame | 458 ms after navigation | at most 600 ms | the new objects' builds are data. the deck and the ceiling are two pieces. the pattern textures are made after the first frame |
| idle | 0 rAF after a landing | **0** | the ceiling's hour is read on events, never on a timer. the test that exists (`frames.size === 0`) covers every new state |
| a flight frame | 9.5 ms mean (the map's number) | at most 10 ms mean | no new per-frame allocation. the rails' runs are per-row arithmetic in `flush` |

**The phone path.** The canvas is already capped at 2.6 M drawn pixels and ratio 1.5. Under 900 px wide: the shadow pass off, the mirror
twins off, the bloom at two levels, transmission off (the crown and the stones draw as crystal-tinted shell), the ceiling as the hemisphere
colour alone. Target: a redraw at most 1.5x the desktop's on the same Mac in a 390x844 page (today 4.1 / 4.6 / 7.5 ms). The route check
of phase 0 measures the centre pixels of the canvas on every route at 390x844 and names each one that is black, with the element that
covers it. the fix is the intro plan's: the world's strip is the top 46vh, the page column starts under it, taps reach the canvas.

### 7. Migration: nothing breaks while objects are replaced

- **`ArkSpace` stays as it is.** `targets()`, `focus`, `back`, `open`, `hover`, `light`, `run`, `screenOf`, `orbit`, `zoom`, the events and
  the place ids `kernel`, `net:<item>`, `chain:<item>` do not change. New places are new kinds with the same shape:
  `keeper:<item>`, `tower:<item>:<n>`, `gate:<item>` (parent `net:<item>`), `seals`, `bridge`, `pad` (parent `kernel`). A part that
  knows only the three kinds keeps working: it never sees a kind it did not ask for. The levels gain `page` under `chain` for a called-in
  record only.
- **Piece names stay.** Every object draws as `obj-<id>-<part>` through `pieces.add` and every placement keeps `{ id, item, mode, x, z, s,
  roles }`. Restyling an object is a change inside its library file (parts, materials, steps) and its placement is untouched, so
  `pick`, `hover`, `flush`, the shows' `spawn` and the trips' `pick` never change. A new object is a new entry in `OBJECTS` and `RADIUS`,
  `REACH`, `LIFT_R`: four lines of site code per object.
- **Shows and trips keep their contract.** `spawn` types `record`, `link`, `card`, `node` stay. `copy` (a record that climbs a tower) is
  added as a fifth. `shot`, `light`, `run`, `pulse`, `title`, `say` mean what they mean. A beat file that names a kind that does not
  exist yet is skipped, not faked (the rule exists).
- **The records.** `world/world.flx` gains no hand-written record. The districts' places derive from the same `WRING` network rings. the
  keeper, the towers and the gate stand at offsets from the cube in the layout code, as the card does today. the bridge's two shores are
  the first chain's district and the hall's edge. the pad's place is the empty sector of the ring. The look knobs that change (`dust` 0,
  `mirror` .55, `fogstart`, `fogend`, `exposure`, the key's hour) change in `js/content/world-data.js` and are re-encoded, never edited in
  the `.flx`.
- **Retired:** the line grid piece (`obj-grid`), the trace dashes (one rail each), the stage dust and light columns in the world, the
  card's flat pose (it becomes the sign), the two duplicate `net:-1` places, the old four-chapter film (the intro plan retires it already).
  Nothing a page calls is retired.
- **Order of replacement:** one object at a time, behind its unchanged placement, each one confirmed on its preview page and then in the
  world. The old object stays drawable under `?objects=v1` for the critic's before-and-after sheets until its phase is accepted, then that
  flag goes.

### 8. Build order: one 3D lane at a time

One lane, one phase at a time, each with a visible result and an acceptance check scored by a separate critic from stills, never from a
description. The bar for every phase: the critic's mean of its scores at least **8/10** with no score under 7, the budget of section 6
held (the numbers before and after in the phase's note), idle at 0 rAF, `node --check` on every file, no test until the owner confirms the
phase. Phases 0 and 7 need no 3D slot. Phase 1 waits for the logo agent to free the slot and reuses its material terms.

| Phase | What is built | Where | Visible result | Acceptance (the critic's stills and gates) |
|---|---|---|---|---|
| **0. Measure** (no 3D slot) | `scripts/scene-capture.mjs` and `scripts/scene-stats.mjs` from the scratchpad scripts. the triangle counter fixed in the engine's `stats` (one question: triangles drawn in the lit pass). the phone route check. the two duplicate `net:-1` places removed | `scripts/`, `js/world2/world2-space.mjs`, `/fxn-3d/engine/render/world.mjs` (stats only) | a baseline sheet of every route at both sizes with its numbers | every number in section 2 reproduced within 10 %. triangles quoted with the question they answer. every black phone route named with its cover |
| **1. The ground and the light** (the most look for the least work) | the deck plate with engraved seams and the mirror twins on. `dust` 0. fog fitted to the hall's depth. the ceiling as the hemisphere's hour and one far panel piece. exposure and key from the hour. the material pass on the seven existing objects (chrome bevels and ring, crystal crown, emissive mark, gunmetal panels) using the logo agent's terms. the sign pose of the card | `world2-objects.mjs`, `js/content/world-data.js` (knobs), the seven `/fxn-3d/js/render/world2-*.mjs` material lines only, `world2-card.mjs` (the sign pose) | the same layout in a wet, lit hall: reflections under every object, chrome edges, a crystal crown, no dust, the far districts under fog, a morning or a night by the hour | stills at the hero, a district and the kernel at both sizes, before and after. Gates: the mirror twins visible (the pixel row under each object differs from the canvas by a mean over 8). no dust pixels over a drum. the crown refracts (the pixels behind it differ from the crown's own colour). the sign readable from the hero (its text box over 11 px tall). Scores: materials, light and depth, brand accuracy against the mark sheets, readability, calm (law 75). Budget held |
| **2. Scale and districts** | the plinths (new object), the layout re-fit (districts at `NET_R`, the kernel a quarter of the frame at the hero), the rails as one stretched piece per trace, the hero at elev 28, the map pose kept, `focusPose` per kind | `/fxn-3d/js/render/world2-plinth.mjs` (new), `world2-objects.mjs` (layout, camera), `world2-space.mjs` (poses) | a hall of districts. a drum is a thing from the hero | gates: at the hero a drum is at least 60 px wide at 1440, the kernel 180-260 px. every district fits its page's pose at 1280x720 with no part cut. rails unbroken at the hero. Scores: scale, composition, readability of "what is a network", motion (flights between districts never kink) |
| **3. The story's actors** | the keeper desk, the copy tower and the gate (three new objects), their places in each district, their `ArkSpace` kinds, the `copy` spawn, the states of section 4 (stamp drop, slot climb, scan sweep, the caught state) | three new `/fxn-3d/js/render/world2-*.mjs`, `world2-objects.mjs`, `world2-space.mjs`, `routes.mjs` | a district reads at a glance: machine, keeper, gate, book, copies | gates: each new object builds in six steps on its preview page. hover on each answers a label. a show plays "pay, sign, pass the gate, copy to three towers" in one bar each with every state visible in its bar's still. the caught state shows `--danger` once and the lamp stays dark. Scores: readability (a stranger names the five from the stills), motion, brand |
| **4. The bridge and the pad** | the bridge (new) across the deck's channel, the launch pad (new), their places and shows (a crossing. a launch) | two new library files, `world2-objects.mjs`, `routes.mjs` | value crosses. a chain is founded | gates: the deposit page's pose shows the whole span. the launch show rises a drum and lands a coin on beats. both at 390x844 with the subject in the top 55 %. Scores: readability, motion, composition |
| **5. The book and the page** | the drum's lid and pages, the record as a numbered page with a stamp, the link as a rail segment, the FXN ID card's crystal face, the lockup letters' chrome | `world2-drum.mjs`, `world2-record.mjs`, `world2-link.mjs`, `world2-card.mjs`, `world2-text.mjs` (materials and one part each) | a chain is a book. a record is a page. the card is glass | gates: the lid lifts on near. the page count ticks on arrival. the card's face refracts. Scores: materials against the mark sheets, readability, calm |
| **6. The phone path** | the under-900 px render path of section 6. the portrait poses. the touch targets. the strip layout of the intro plan | `world2-host.mjs` (resize, the quality switch), `world2-space.mjs` (portrait poses), `css/world-pages.css` | every route draws on the phone with its subject in frame and a tap that answers | gates: no black route. redraw within 1.5x desktop. a tap on the lit subject changes its 180 px box by a mean over 5. nothing outside the viewport. Scores: readability at phone size, responds to the visitor |
| **7. States and the hour** (no new shape) | every state of section 4 wired to the interaction map (near, hover, press, lit, busy) with its reduced-motion form. the hour on events. the ten-question reduction test for the hero screen in the notes | `world2-objects.mjs`, `world2-host.mjs`, `js/space/*.mjs` | the hall answers every pointer | gates: per row one input then `frames.size === 0` within the row's settle time. the hour changes the key between two loads at different clock values. reduced motion has a state for every cell. Scores: responds to the visitor, motion quality, calm |

Why phase 1 is first: it changes every pixel (the floor, the light, the depth, the materials) and touches no layout, no contract, no
new shape and no page, so it is the most look for the least work and the least risk. It is also the first phase that can be scored
against the mark references.

After phase 7 the usual last step: one test and audit phase, once the owner confirms, that locks what was confirmed (the budget numbers,
the idle rule, the poses per route, the states' settle times).

### 9. Open decisions for the owner (two)

1. **Districts on one hall floor, or concentric rings?** Districts (this plan): each network is a plinth round the kernel, and the
   bridge and the pad need two shores and an empty sector, which rings do not give. Rings: every chain part on its own ring round the
   kernel (a capabilities ring, a networks ring, a chains ring), tidier as a map and worse as a place. **Recommendation: districts.** The
   story is told inside one network (pay, sign, copy) and a district keeps those five objects within one camera pose.
2. **The chain drum stays a drum, or becomes a book?** The drum was confirmed at "101% of the board" on 2026-11-05. This plan keeps its
   form and lifts its lid to show pages (phase 5). A new book object (a bound stack of pages with a spine) would read the lore's metaphor
   more directly and cost one more library object and the drum's retirement. **Recommendation: the drum stays**, with the pages under its
   lid. a book is a second corpus of the same idea.

Everything else in this plan takes the safest option, built modular and fast, and is not re-asked: the hour from the visitor's clock on
events (never ticking), the floor as one plate, the rails as one piece each, the phone path's cuts.

Score of this section on `npm run copy:check` (2026-11-07): 5/5, no known pattern matched. The whole file scores 4/5: its matches are
in the earlier sections (the owner's quoted "journey" twice, "level up" in the `ArkSpace` table's `back()` row), not here.

### Owner decisions on the scene plan (2026-11-07)

- **Layout:** districts on one hall floor (not rings).
- **Chains:** the chain drum stays, with pages under its lid.
- **Book object:** also create a book object (a key's records as numbered pages), as its own shape beside the drum. The shape list gains "book"; it is built in the phase with the drum, page and glass card.
- **3D slot:** phase 1 starts when the 10 logos (A01-A10) are done; one 3D builder at a time.

## Intro: the portal, your archive and its story (owner, 2026-11-09)

Layer: app (the site's intro page, js/pages/intro.js, over the fxn-3d site objects). Reader: the site builders and the object builders.

The flow, in order:
1. The white glass mark loads and says "Welcome to FXN."
2. Portal 101 builds itself.
3. A click tears the portal's picture. The Loopforge glitch film plays.
4. The camera goes through into **your archive**, the player's room under the city (fxn-3d world/underground; owner 2026-11-09: "Your archive", it was called the garage).
5. The garage plays a film in four acts. The world acts first. The words then name what was just seen.

Owner rulings, 2026-11-09:
- "It has no story and it is too fast."
- The kernel does not stand in the middle. It lives in **a big room where the player has a screen**, and it is animated there.
- The kernel's design is upgraded to fit the archive.
- Every object **builds in real staged motion**, never in one jump.
- Release Gate is the door to the game. The owner links it later.
- One building agent at most.

| Act | Seconds | What happens (the world acts) | The words after it |
|---|---|---|---|
| 1 Arrival | 0-10 | The camera comes through the portal into the dark archive. The lights wake bay by bay. The camera reaches the screen room. The big screen switches on, and the kernel builds itself on it, part by part. | "This is your archive. The network runs under it." / "The kernel puts every record in order." |
| 2 A record moves | 10-30 | A record leaves the screen. Ledger Line takes it in, and a receipt returns. Keeper Ring sends copies to its pods. Keeper Tower takes the envelope. Rule Book opens on the rule it followed. | the object lines (HOME.LANDING.CINE.*) |
| 3 What you build | 30-52 | Chain Drum turns. App Bundler stamps. App Bundle ships. Multisig Lock takes four of five keys. Bridge Span carries a deposit. Network Wall lights. Network Portal opens. | the object lines |
| 4 The door | 52-60 | Release Gate opens on its key. Light runs through it toward the game. The view holds wide. | "Your key opens the gate." |

Pacing is a target to check on screen, not a measured number. Each object gets about 4 s. Its build takes 1.5 to 2 s in steps. Parts travel in on rails and lock with a small overshoot. Then the strips light. Its words come after the action, never before. The words live in HOME.LANDING.CINE.* in js/content/manifests/home.js.

### Your archive: every part of FXN, and its object (draft, 2026-11-09)

Owner, 2026-11-09: the film must show every part of FXN: worlds, chains, games, the tech, the products, that we all earn, that we
all add compute, and that it gets faster with each keeper. Each line in the film stays true. The facts and numbers come from the
genesis session and the game session (asked 2026-11-09). Objects are built one at a time, in this order, after the owner confirms the list.

| # | Part of FXN | Object that shows it | State |
|---|---|---|---|
| 1 | The chain: records in order, a receipt for each | DEFXN Kernel (screen room), Ledger Line | built, kernel redesign in progress |
| 2 | Keepers hold copies | Keeper Ring | built |
| 3 | Run a machine that keeps the network | Keeper Tower | built |
| 4 | It gets faster with each keeper | **Keeper Array**: racks join one by one. A speed gauge rises with each | missing, number pending |
| 5 | We all add compute | **Home Node**: your own machine plugs into the network and lights | missing, status pending |
| 6 | We all earn | **Reward Flow**: credits run back along the lines to each contributor | missing, rules pending |
| 7 | The data store | **Record Vault**: stacked records and media, each kept in copies | missing, status pending |
| 8 | Streaming and live rooms | **Live Room**: a stream screen with people in it at once | missing, status pending |
| 9 | Worlds = chains = games, the game engine | **World Forge**: a world builds itself and becomes its own chain | missing, facts pending |
| 10 | Start your own chain | Chain Drum | built |
| 11 | The rules that run the machine | Rule Book | built |
| 12 | Apps and their rules | App Bundler, App Bundle | built |
| 13 | Changes need four of five keys | Multisig Lock | built |
| 14 | Deposits cross with their proof | Bridge Span | built |
| 15 | The network runs where you do | Network Wall | built |
| 16 | A new internet, in the open | Network Portal | built |
| 17 | Names | Name Gate | built, parked by the owner |
| 18 | The door to the game | Release Gate | built (the game link comes later) |

The names of the six missing objects are drafts for the owner.
