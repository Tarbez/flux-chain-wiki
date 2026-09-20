# SUBZERO

A persistent silver-sage particle scene on a charcoal background, with lazy-loaded
pages inside an ARK layout. Open `index.html`; no build step is required.
The runtime engines are vendored locally. Page content requires JavaScript.

## Layout and routes

`js/scene.flux.js` defines the persistent visual layer, shared header, and empty
page outlet. The canvas, atmosphere, navigation, and motion controls stay mounted
while page content changes. Home loads only its small page module; the initial
HTML does not contain the experiment lab or article bodies.

Canonical routes use hashes so static hosting does not need rewrite rules:

- `#/`: home.
- `#/experiments`: the filament experiment introduction.
- `#/experiments/lab`: the standalone interactive lab.
- `#/learnings`: three article previews.
- `#/learnings/<slug>`: an individual article.
- `#/concept`: the Subzero theory and community vision.
- `#/about`: the studio, its purpose, and its approach.

Legacy `#zero`, `#proximity`, `#work`, `#learnings`, and `#article/<slug>` links
also resolve. Back/Forward and direct links use the same router.

`js/pages/catalog.js` supplies route metadata and dependency lists.
`js/ark/page-router.js` loads each page's scripts only when requested and caches
successful modules and data. Only the active page and pages finishing their exit
are mounted. After transitions, outgoing DOM and its subscriptions are removed.
Reading positions, lab settings, preview words, and viewing angles survive
navigation within the session. A failed load retains the current page and offers
retry; stale responses cannot override the latest navigation.

Use `ArkUI.pageRouter.navigate(page)` for UI navigation. The router commits to
`ArkUI.sceneState` after the destination is ready, keeping page and mesh intent
in sync. Page presence uses the actual ARK `FluxAnimate` engine; the atomic scene
store uses `FluxMemoryStore`. Interrupted transitions cancel their animations,
inactive pages are inert, and focus leaves a page before it becomes unavailable.
Reduced motion applies destination states directly.

`js/ark/text-presence.js` uses transform and opacity reveals, without animated
clipping masks. It limits the effect to 12 visible text blocks and at most 48
rotating letters in the leading heading. Style reads are batched before animation
writes. Text reveals retain their slower 1.4-second timing, but the incoming page
is interactive immediately and focus is not moved again after the animation.
Particle title anchors keep their independent mesh morph. The legacy emergence
delay is disabled inside the routed outlet so it cannot compete with presence.

The engines live in `js/ark/vendor/engines.js`. Regenerate them with
`node scripts/sync-ark.cjs [shared-directory]`; the bundle includes source hashes.
To add a page, register its lazy module in the catalog, provide its mount function,
and add its scene-state mesh definition. Scope transitions to page elements.

## Persistent particles

The home zero renders at 1.2 times its original 61%-width footprint and
uses the same scale for its painted fallback. Destination shapes retain their own
layout sizes. A brighter sage atmosphere, seeded particle grain, and generated background
texture supply depth without a full-screen blur veil. The painted fallback is
hidden when WebGL starts and remains available if WebGL fails.

Experiments transforms the whole form into three interwoven filament ribbons at
50% dissolution. Returning home restores the whole form. Particle identity remains stable through a direct 1.8-second morph and movement
into the destination form, with depth dissolution during travel. There is no
intermediate exit shape or hold. Two
faint traces sample the recent mesh poses at approximately 150 and 300 ms behind
the main shape. Rapid reversals start from the current pose. Reduced motion and
paused navigation go directly to the destination.

`js/halo/proximity.js` builds the ribbons from 9,216 line segments and samples them
by arc length. This takes inspiration from Blurry's line-based construction,
without importing its accumulation renderer. The adaptive budget is 6,000–10,000
points on compact screens and 12,000–24,000 on desktop, using persistent buffers
and one draw call at rest (up to three during traced transitions). The renderer pauses offscreen.

Drag the shape directly to rotate in both axes. `js/ark/mesh-drag.js` uses pointer
capture for mouse, pen, and touch; navigation or cancellation releases the drag.
Horizontal rotation wraps, vertical rotation reaches ±90 degrees. Arrow keys
rotate, Shift increases the step, and Home resets. Rotation works with ambient
motion paused or reduced.

## Learnings and particle titles

`js/content/learnings.js` contains the lightweight article index: slug, title,
category, reading time, and summary. Bodies live separately in
`js/content/articles/<slug>.js` and load only when the article is opened.
The shared article module renders a Dense Flux fence through
`js/resolvers/learnings.js`; normal headings remain readable independently of
particle rendering. The canvas follows the active title anchor while scrolling.

`js/halo/words.js` wraps up to 72 characters into a Canvas2D stencil, samples the
letters, and adds depth. GPU buffers retain old and new positions so interrupted
title edits can continue from their current pose. Font loading regenerates the
stencil. Preview titles are session state, not edits to published articles, and
are never interpreted as HTML.

To add a learning, append metadata to the index and create its matching body file
with `LearningContent.load(slug, { sections, numbers })`. Preview cards, catalog
routes, and particle titles derive from the index. The home invitation links to the Subzero theory; article previews stay in
the Learnings page. Keep educational examples tied to actual behavior and distinguish
automated checks from device testing.

The lab is mounted by `ArkUI.mountStudio(root)` only on its own Lab route.
“Open the experiment” navigates there; the same corner control and Escape return
to Experiments. The introduction no longer includes a lab section below it.
Its mode and slider values are retained separately from disposable page DOM.
`css/studio.css` styles the lab; `css/learnings.css` styles routed page layers.

## Module boundaries and security

`js/ark/page-loader.js` owns local dependency loading; `page-router.js` owns
navigation and presence. `js/halo/shaders.js` holds GPU programs separately from
renderer lifecycle. Navigation styling lives in `css/navigation.css`, with shared
focus treatment in `css/focus.css`. The old logo resolver is no longer loaded.

The entry point uses an external bootstrap and a Content Security Policy blocking
inline scripts, remote scripts, network connections, objects, base URL changes,
and form submissions. Local `file:` sources preserve direct-file use; inline
styles remain allowed for the styling runtime. The loader accepts only relative
JavaScript paths under `js/`. Route lookup rejects inherited prototype names.
Article text and previews use text nodes; remaining HTML templates are static
source-controlled literals.

This is client-side hardening, not a complete security audit. Production hosting
should deliver CSP through HTTP headers with `frame-ancestors 'none'` and add
`X-Content-Type-Options: nosniff`. Remove `file:` allowances in a deployment-only
policy. Browser enforcement and compatibility need deployment validation.

## Page layout

`css/page-layout.css` defines the shared routed-page width, gutters, top spacing,
and heading scale. Routed pages keep capped-width content and outer gutters without an enclosing
background, shadow, or backdrop blur. The shared atmosphere and particle mesh
remain visible on every page. Inner reading sections are also transparent. Concept uses a compact single-column introduction and three
short principles. Background atmosphere and particles have separate blur and
opacity settings; particle article titles remain sharp.

## Shared controls

The header retains the Independent Studio label. Home has three stacked links in the bottom-right corner: Use cases (Concept),
Tutorials (Learnings), and Experiments. Inner pages replace that stack with the
return control in the same corner; there is no horizontal CTA footer.
The bottom-left settings icon opens the canonical ARK headless popover used by
chat.deadark.com's AppearanceControl, with pause/resume, SDK themes, ARK Atmosphere controls, and viewing
angle reset. All controls and classes are declared in the headless tree so ARK
can replace the popover DOM without losing them. The host forwards document
`pointerdown` events in capture phase to `ui.handleOutsidePointer`, as in chat;
ARK handles containment and dismissal. The listener is removed on page exit. Theme and atmosphere preferences are stored locally; storage failures are tolerated.
Atmosphere uses `mountArkBackground` with the quiet preset and live semantic theme
colors. Intensity is fixed globally at 37 and grain at 90 (0.09 texture opacity).
Only softness and scale are editable, defaulting to 155 and 66. Their updates
reuse the same controller at most once per frame. The v2 preference key starts
existing visitors at the new defaults rather than restoring older values. Values are validated, and Reset atmosphere restores defaults.
Atmosphere itself is static; pause controls the particle motion.

Edit `scripts/settings-entry.js`, then run `node scripts/build-settings.cjs` to
bundle the shared ARK runtime and primitive into the local classic script and
regenerate theme CSS/options through the SDK CLI. Generated files are
`js/settings/panel.js`, `css/themes.css`, and `scripts/theme-options.js`.
The settings build aliases ARK element styling to `scripts/ark-style-bridge.js`,
which reuses the shell registry exported by `ArkEngines`. Never bundle a second
style registry: duplicate dynamic IDs let popover visibility hide unrelated page
text. `tests/style-isolation.cjs` guards this regression.
No other repository is modified by this build. The popover smoke test mocks the
runtime; live overlay positioning and theme visuals still require browser QA.

## Validation

Run:

```sh
node tests/style-isolation.cjs
node tests/settings.cjs
node tests/security.cjs
node tests/text-scramble.cjs
node tests/text-presence.cjs
node tests/page-router.cjs
node tests/scene-state.cjs
node tests/mesh-state.cjs
node tests/proximity-geometry.cjs
node tests/learnings.cjs
node tests/mesh-drag.cjs
```

Router checks cover lazy loading, caching, DOM disposal, scroll restoration,
rapid navigation, failure/retry, deep links, and persistent shell identity.
Renderer checks use a mock GPU; word checks use a raster fixture. These checks
do not constitute browser/GPU or cross-device visual verification.

## Preserved files

`archive/index.poster.html` preserves the original standalone scene entry point.
`legacy/index.monolith.html` remains untouched. `archive/index.studio.html` is a
snapshot of the superseded redesign. The unused mark in `assets/mark.svg` is not
loaded by the current page.

### Surface geometry and motion
The secondary surface has a separate budget of 24,000 desktop particles or
12,000 mobile particles; the primary mesh retains its existing allocation. Its four
states—echo, swell, spiral, unfurl—share the zero's centre, circular rim and
angular coordinates. Each extends outward from radius .96 behind the original
torus, preserving the empty opening. Deformation increases gradually away from
the rim and brightness fades toward the viewport edges. Corresponding points
stay on the same radial line during morphs, so unrelated silhouettes no longer
cross through the zero. A soft projected annulus mask limits additive overlap;
it is an approximation when the zero is strongly tilted.

`js/halo/surface-motion.js` supplies normalized weights. Each state travels quickly for two seconds, settles for three, then pauses for
three, over a 32-second cycle. The procedural surface clock also stops during
the hold. The existing elapsed
clock freezes on pause and reduced motion. Home blur is .65px. The full-screen
canvas preserves the zero's size with aspect-correct projection and a local drag
target. No additional draw calls are required.

Run `node tests/surface-motion.cjs` for timing/continuity and
`node tests/mesh-state.cjs` for renderer uniform integration. These use mocked
WebGL; shader compilation and visual quality require browser verification.

The secondary layer has a wider reach and transitions through teal, blue, mauve
and amber tints. It no longer inherits the main mesh's word/experiment morph or
dissolution. Inverse placement compensation keeps it viewport-sized when the
main mesh moves into an article anchor. Theme changes read the SDK canvas token:
light palettes use dark particle colors with multiply compositing; dark palettes
use screen compositing. Standard alpha blending preserves both on the canvas.
Theme updates request a frame even while paused. Automated coverage includes the
four-phase cycle, light/dark switching and per-page surface uniforms.

Layer-two visibility correction: 96 particle contours replace 42; dot alpha no
longer inherits the primary mesh's dim lower-half lighting. Circular layers,
elliptical swell, two-arm spiral and four-lobed folds have stronger projected
radius differences while retaining the shared .96 rim. Extra particles increase
GPU work; frame rate has not been measured. `tests/surface-geometry.cjs` evaluates
the actual shader expressions for attachment and shape separation, independently
of the mocked renderer tests.

The spiral is now the single inward state: particles contract from the wide swell
into a radius .075–.36 curl inside the zero, twist, then expand into the next wide
form. Its points become finer and dimmer during compression to avoid an opaque
blob. The other three states retain the outer-rim geometry.

Layer two also animates with navigation. `SurfaceMotion.forPage` supplies depth,
spread, tilt and horizontal bias for each route. These interpolate on the main
1.8-second page-mesh clock, including an extra depth sweep during travel. The
idle shape cycle continues without restarting. Interrupted navigation captures
the current surface pose; paused/reduced-motion navigation applies the final
pose immediately. The foreground-zero mask fades with the same transition.

Inner pages now replace the hero cycle with compact reference geometry: experiment
filaments, a lab grid, stacked learning contours, theory depth rings, linked about
loops, and an article framing arc. Six interpolated reference weights preserve
continuity on route reversal. References use 32–48% scale, 20% layer alpha, muted
color and no autonomous rotation or shape cycle. Home restores the expressive
four-form loop. The reference clock is visually static even though the persistent
renderer retains the home cycle's phase for returning home.

Theory now has a dedicated iceberg composition based on the supplied reference.
`js/halo/iceberg.js` generates one deterministic target buffer: the primary mesh
forms the faceted peak, while 80% of the second mesh forms the larger underwater
body and 20% forms a thin rippled water plane. Both meet at y=.20. A shared
Theory weight morphs position, blue lighting and point size together, reversing
from the current pose when navigation is interrupted. The transparent page
provides an anchor beside its text (above the text on mobile); the renderer fits
both halves into that anchor. No raster image is used. Validate the generated
positions with `node tests/iceberg-geometry.cjs`; this does not substitute for
browser/GPU visual verification against the reference image.

Water now projects across the full viewport independently of the iceberg's
content anchor, with a small edge overscan. Theory exit retains the last measured
anchor when outgoing DOM is removed; anchor reads occur on entry, scroll and
resize rather than after frame-by-frame style writes. The home surface clock
holds during page transitions and away from home, then resumes after returning.
Delayed trace draws include only primary particles, skipping the invisible
secondary vertices. Regression tests cover DOM removal, anchor-read counts,
frozen/resumed cycle weights and water coverage. Live frame timing remains
unmeasured.

The home cycle is now exactly three states: full spread → inner folded form →
full-screen spread (24 seconds total). The unused fourth shader weight stays zero.
The inner form uses fine, nested three-lobed contours within radius .10–.36.
Particles retain their angular coordinates throughout contraction and expansion:
no automatic spinning, twist-angle interpolation, breathing scale or surface
zoom pulse. Direct user drag rotation remains available. Fast–slow–pause timing,
page references, and the Theory iceberg transition are preserved.
