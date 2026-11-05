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
