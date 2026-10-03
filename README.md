# Flux Protocol site

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
- `#/about`: the Flux Protocol overview and current capability boundary.
- `#/what-is-a-resolver`: the canonical resolver definition.
- `#/start-from-something-real`: reference-resolver evidence status.
- `#/how-deployment-works`: the five-movement protocol flow.
- `#/download`: the verified source-run path.
- `#/deploy`: create or select a named miner-presence network.
- `#/explorer`: read live, bounded data from a local Miner only.
- `#/account`: locally verify an Auth Kit and inspect its identity facts.
- `#/treasury` and `#/deposits`: design-only economy previews, not live balances.
- `#/concept`: the deeper Flux Protocol operating model.

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

Selected Home-cycle, operating-model, and Notes surfaces retain their actual DOM
box through expansion. `js/ark/panel-continuity.js` owns outer geometry; the
router disposes inner contents separately. Outer boxes never use opacity fades.
Direct links render the final frame. Query state addresses mechanism depth/detail,
article questions, procedure step/review, and model selection/value.

Canonical reference links open the in-shell `/reference` reader with the exact
originating route/query and an Original Markdown link. Run
`node scripts/sync-reference-docs.cjs` after editing a linked canonical document.
It regenerates the approved-document list and lazy text/hash snapshot from the
source files; do not hand-edit the generated copies. The reader uses the existing
local script policy, including `file://`, without broadening `connect-src`.

`css/color-system.css` enforces three color roles: primary for critical page
information, complement for calls to action, reference for lower-level links and
controls. All eight palettes keep neutral surfaces and three distinct, readable
role inks in light and dark modes. `css/brand-identity.css` fades the existing
mesh fabric toward the reading area. Blocks, Traces and Layers reuse
`ArkUI.createMeshFabric`; Wave remains available. Run
`node tests/theme-color-contrast.cjs` for role separation and text/action contrast,
and `node tests/mesh-fabric.cjs` for shared mesh layouts and bounded rendering.

`js/ark/icons.js` supplies native inline SVG icons on one 24px grid. Their strokes
inherit semantic colors; labels remain the accessible meaning. Desktop refinement
and verification come first; mobile refinement is the final redesign pass.

The account route loads the shared Ark UI Auth Kit bundle on demand. Public identity
metadata is remembered in `defxn-local-identity-v1`, following
`chat.deadark.com/src/lib/identity/localIdentitySession.ts` and its reactive
`IdentityProvider` pattern. The shell restores the username on every page, including
a reload before Account has been opened. Cached metadata is display state, never
proof of authorization. Root signing handles stay in memory across route changes
and are disposed on document exit; reload preserves the remembered identity and
locks the signing key. Unlock the Auth Kit to sign again. Sign-out clears the
pointer, and storage events or focus changes reconcile other tabs and lock stale
signers. No recovery file, PIN, phrase, root verification flag, or signer is saved.
Storage failures are surfaced on Account instead of promising persistence.

The exact-ID local Miner check remains read-only. If the Miner returns a signed
identity-to-account binding, the page follows that exact account ID to show its
standing; it never infers one. FXN and Credits remain unavailable until a verified
balance source is connected.

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

`js/content/article-index.js` contains the lightweight article index: slug, title,
category, reading time, and summary (`js/content/learnings.js` is the code that
defines, validates and serializes it). Bodies live separately in
`js/content/articles/<slug>.js` and load only when the article is opened.
The shared article module renders a Dense Flux fence through
`js/resolvers/learnings.js`; normal headings remain readable independently of
particle rendering. The canvas follows the active title anchor while scrolling.

`js/halo/words.js` wraps up to 72 characters into a Canvas2D stencil, samples the
letters, and adds depth. GPU buffers retain old and new positions so interrupted
title edits can continue from their current pose. Font loading regenerates the
stencil. Preview titles are session state, not edits to published articles, and
are never interpreted as HTML.

To add a learning, use the Articles list in `admin.html`, or by hand append metadata
to the index and create its matching body file with `LearningContent.load(slug, { sections, numbers })`. Preview cards, catalog
routes, and particle titles derive from the index. The home invitation links to the Flux Protocol specification; article previews stay in
the Learnings page. Keep educational examples tied to actual behavior and distinguish
automated checks from device testing.

## Product and operator documentation

The canonical documentation starts at [`docs/index.md`](docs/index.md). Capability
status, terminology, evidence ownership, operator procedures, and protocol guides
live there. Public page manifests summarize those facts; they are not the source of
truth for capability or production-readiness claims.

Use **Flux Protocol** as the product name. Preserve **Flux Chain** only where an
exact legacy file name, storage key, compatibility identifier, or historical
artifact requires it.

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

A review of every `js/` file and `scripts/*.cjs` (script injection, XSS, router/hash
handling, `localStorage`, the CSP itself) found no script-injection or XSS path: all
rendered copy uses `textContent`, `page-loader.js`'s regex closes traversal/`javascript:`/
`data:`/encoded variants, and the router rejects `__proto__`/`constructor`/`toString` as
pages. It found two defense-in-depth gaps, both since closed: a CTA's `href` (from a
content file) reached `window.location.assign` with no scheme check — `ArkProps.isSiteHref`
now limits it to a hash route or a same-origin path (`tests/security.cjs`, mutation-verified);
and the manifest index's `document.write` trusted a plain id — both the admin's generator
(`js/admin/store.js`) and the file it wrote now refuse anything but `^[a-z][a-z0-9]*$` before
it reaches a script tag, closed in the file the admin actually rewrites, not just the copy
on disk. The same pass also found the header's WORK link pointed at `#/work`, a route whose
page file had been deleted (`tests/page-router.cjs`); it now resolves to the lab, the route
it actually leads to.

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
node tests/admin.cjs
node tests/auth-bundle.cjs
node tests/admin-session.test.mjs
node tests/admin-session-otp-disabled.test.mjs
node tests/site-bundle.test.mjs
node tests/iceberg-geometry.cjs
node tests/image-shape.cjs
node tests/asset-content.cjs
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
both halves into that anchor. Validate the generated positions with
`node tests/iceberg-geometry.cjs`; this does not substitute for browser/GPU
visual verification against the reference image.

`js/halo/image-shape.js` can replace that faceted buffer with an image-driven
one: `ImageShape.create(primaryCount, surfaceCount, sample)` keeps the same
two-mesh/water-plane contract (same test shape, `node tests/image-shape.cjs`)
but reads a `sample(u,v)` brightness function for the footprint, tier depth
and light of each block, so the concept page reads as layered isometric
blocks shaped by the source image instead of the procedural peak. The
footprint is not grid-snapped — every particle takes its own R2
low-discrepancy (u,v), and only the depth axis keeps tier quantization for
the stepped look; brightness is first contrast-stretched (5th/95th
percentile over a 32x32 lattice) and gamma-lifted, because real photos
rarely span [0,1] and a linear map rendered as uniform mid-height fog.
`ImageShape.load(url, done)` is the only DOM-dependent part: it draws the
image to an offscreen canvas and hands back that sampler, or `null` if the
canvas cannot be read. `js/zero-webgl.js` uploads the faceted iceberg first
so the scene never waits on image decode, then swaps the buffer in once
`ImageShape.load` resolves.

The source image is an image asset (`js/content/assets.js`, `ArkAsset`), the
same kind of content as a page manifest or an article: it holds its own
bytes (`{id, label, mime, dataBase64}`), lives in `js/content/assets/<id>.js`,
is listed in `js/content/assets/index.js`, and round-trips through the same
`.flx` archive `encodeSite`/`decodeSite` build for manifests and articles
(`scripts/lib/site-bundle.mjs`). The concept page's iceberg reads the asset
`iceberg-blocks` by id (`ArkAsset.dataUrl('iceberg-blocks')`); if it is
undefined, `js/zero-webgl.js` falls back to `assets/halo/flux-blocks.png`, a
static file with the same pixels. Both come from one generator,
`node scripts/make-flux-blocks-png.cjs`; never hand-edit the PNG bytes or
the seed asset file. `node tests/asset-content.cjs` covers `ArkAsset`'s own
contract (id/mime/size validation, the 3MB decoded cap, serialize
round-trip); `tests/site-bundle.test.mjs` covers assets going through the
archive alongside manifests and articles. The cap is sized for real photos;
because base64 inflates an asset by 4/3 in the publish payload,
`scripts/publish-host.mjs` MAX_BODY was raised with it (4MB to 16MB) so a
cap-sized asset still publishes.

admin.html edits this the same way it edits pages and articles: an "Images"
group in the sidebar lists every asset, "New image" (`newAssetForm`) picks a
PNG/JPEG/WebP/SVG file under 3MB and gives it an id, and Save/Revert/Delete
work like any other content kind. Choosing a file previews it immediately
(`#newAssetPreview`) and auto-fills the id from the filename if left blank,
so picking a file is never silent even before "Add" is clicked; an invalid
file (wrong type, over the size cap) is refused at that same moment, not
only on submit. Publish sends it to the mesh in the same site payload
(`site.assets`), and a stale admin session is warned before an image would
be silently removed, the same as a page or an article.

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

## Content

Every word on the site lives in a page manifest, one file per page in
`js/content/manifests/`. A manifest lists that page's fields (`TITLE`, `POINT1.TEXT`, ...),
each with a label and a kind (`line` or `text`). Pages, the shell and the Flux patterns all
read words through `ArkCopy` by key, `AREA.ROLE` in capitals, where `AREA` is the manifest's id
(`HOME.TITLE`, `NAV.BRAND.NAME`). A Flux pattern holds the key, never the words, and writing words
in a pattern is refused with a message saying where they belong.

To change a word, edit the field in its manifest, or open `admin.html`:

- Choose a page, edit its fields, and Save. Connect the project folder (Chrome or Edge) and Save
  writes the file in place; otherwise Save downloads it to drop into `js/content/manifests/`.
- Theory pages can be added and deleted there. A new one gets its own route and a link on the theory
  page with no code change, because the catalog and the theory page are derived from the manifests.
- A sheet has as many points as it has `POINT<n>.TITLE` fields; Add/Remove a point edits those.

`admin.html` is a local editing tool. It never links from the site; do not deploy it.
`js/content/manifests/index.js` is the display order and is rewritten by the admin page.
Articles are edited in the same page (the Articles group in the sidebar: card fields, sections,
paragraphs, the values table toggle; add and delete). Save writes `js/content/articles/<slug>.js` and
`js/content/article-index.js` with the exact bytes `LearningContent.serializeBody/serializeIndex` produce.
Reading order is the index order: a new article is appended, and reordering is a hand edit of the index.
Experiments are not manifest-driven yet.

## Publishing to the mesh

The whole copy of the site (every page manifest and every article) is one `.flx` archive kept in an
ark-miner-cli node and named by a signed `names/*` record: `flux-chain.ark` points at the archive's CID.
An edit is a new archive and a new record version; old versions stay retrievable. The site itself stays a
static page reading local files, so it needs no network and its Content Security Policy is unchanged.

The public `/bundle-deployer` page explains the required local FXN Bundle Deployer workflow.
The CLI is planned and not yet released; no installation command, download or browser deployment
is advertised. Local CMS editing remains available through the existing development host. The
account page exposes the local CMS link only after that host confirms local-development mode.
Public deployment links point to the guidance page. The future deployer must let users inspect the
public bundle and keep Auth Kits, signing keys, credentials and local configuration outside it.

Double-click **`Flux Chain Admin.command`** (or run `node scripts/publish-host.mjs --open`). It starts the local
publish host and opens the admin page in your browser; from then on everything is done in the page. Keep the
window it opens running while you work (closing it stops the host); double-clicking again just reopens the page.
Editing does not require a miner or sign-in. Publishing needs a reachable publishing connection, such as Ark Miner Desktop or `npm start` in `ark-miner-cli`. The host finds it by itself (Desktop
on 8866/5102, CLI on 8766/5002, each with its own credential file) and picks it up if it starts later; the Mesh
panel says which miner and network it is publishing through, or that none was found. Only for a miner elsewhere:
`--storage <STORAGE_PATH>`, or `--status`/`--pin`/`--key`. A named `--storage` folder is the only place its
credential is looked for.

```sh
node scripts/pull-site.mjs            # dry run; add --write to replace local files. Same miner discovery.
```

The publish host derives page paths from `js/pages/catalog.js` and the indexed content. Every
catalog route supports direct navigation and reload, including nested pages and articles. Nested
shell asset URLs resolve to the same public files; unknown URLs, API routes and protected CMS
assets do not receive the public shell. `tests/host-routes.test.mjs` exercises these HTTP boundaries.

Open the page through the host (the address it prints, `http://127.0.0.1:3437/admin.html`), not by opening
`admin.html` from disk: a page opened from disk cannot reach a miner and says so, with a link.

- `scripts/publish-host.mjs` serves `admin.html` from loopback and holds the miner's API credential. It
  never holds a signing key. `--name` chooses another name than `flux-chain.ark`.
- **Local editing** opens without sign-in when the launcher is bound to `127.0.0.1` and the request
  comes directly from loopback. Forwarded requests do not receive this permission. This launcher is
  a local tool, not the production-domain CMS server. Importing `createHost()` defaults to protected
  mode; the local launcher explicitly enables `localDevelopment`.
- **Identity and deployed access are separate.** A valid challenge signature establishes an identity
  session without contacting a miner. Protected editor files and APIs then require a signed mesh
  ownership record for the site's name, read from `public.defxn.com/explorer/v1/record` and verified
  locally. The record's current owner is the maintainer. There is no separate owner allowlist,
  automatic first-visitor grant, or permission based on saved browser details. Missing or invalid
  ownership denies access; an unavailable lookup keeps the identity session but denies CMS access.
- **Reload** retains a valid host session, not the signing key. Reopening the CMS does not require
  importing the Auth Kit just to edit. Signing or publishing after reload requires selecting and
  unlocking the Auth Kit again. Publishing always needs an authenticated identity matching the
  record being prepared or published, and the publisher verifies mesh ownership before writing.
- **Production integration** must connect the same permission check to the domain's server or mesh
  gateway, using its resolved mesh name as the site identifier. Domain mode is explicit: `node scripts/publish-host.mjs --origin https://defxn.com --name <resolved-mesh-name>`.
  Bind remains loopback behind a TLS proxy that preserves the configured Host. Domain mode requires
  the exact HTTPS Origin on POST requests and uses Secure session cookies. The normal local launcher
  accepts only loopback Host headers. Do not expose local-development
  mode through a proxy. Production mode verifies ownership before serving editor assets or accepting
  CMS writes, and rejects configuration that enables the local bypass. Standard domain and mesh-name aliases must
  resolve to that same ownership record rather than infer the owner from the domain text.

- **Where authenticators live.** Enrolled secrets, sign-in lockout counters and a sign-in audit log (`event`,
  `key`, timestamp — never a code, secret or PIN) are kept under `~/.flux-chain-admin` (files `0600`, folder `0700`),
  outside the project so it is never published, committed or served; `--data <folder>` moves it. If that file
  exists but cannot be read or parsed, the host refuses to start rather than treat it as empty — a silent reset
  would let the next visitor enroll their own authenticator in place of the real one.
- **Keys.** The identity's root key lives in a handle that never exposes its bytes, in the locked page's memory only,
  and is dropped on sign-out or reload; nothing is written to storage and there is no separate owner key to
  export or lose (the kit is the recovery path). The panel and envelope are `@deadark/ark-ui/flux-auth(-ui)`, the
  `flux-bip39-v1` derivation is `flux-auth/root-from-mnemonic`, and `deadark-profile-v1` kits use
  `deadark-identity-core/root-signing-handle`; the kit chooses which. A kit whose root cannot be proven is
  refused, never used to sign. `js/admin/auth.js` is generated: after changing `scripts/auth-entry.js` or a shared
  module it imports, run `node scripts/build-auth.cjs` (`tests/auth-bundle.cjs` fails while it is stale).
- Publish needs everything saved, and asks before a version would remove a page or article that is
  published now (a page whose saves were only downloaded can be out of date). Publishing unchanged
  content mints no new version.
- `scripts/lib/site-bundle.mjs` is the one place that knows how a site becomes an archive and back, and
  it loads this project's own validators and serializers rather than copying them.
- The name record format and its verification are the miner's own (`ark-miner-cli/src/state/name-record-validators.js`),
  imported by sibling path, so this directory needs `ark-miner-cli/` and `shared/flx-codec/` beside it.
- Measured on this content only: the archive is 63,061 bytes against 25,721 as JSON (about 2.5 times
  larger), because the shared `encodeArchive` wraps every string reference in a structure. That is not the
  `flx-learning` dense encoder the workspace's "47%" figure describes.

Tests: `node tests/totp.test.mjs` (RFC 4226/6238/4648 vectors, drift, no replay), `node tests/admin-store.test.mjs`
(the authenticator/lockout store on real disk: private files, unreadable-file refusal, persisted lockout with
doubling), `node tests/admin-session.test.mjs` (the three-step lock; hermetic, real host, real signatures, real
TOTP), `node tests/miner-discovery.test.mjs` (hermetic), `node tests/auth-bundle.cjs` (bundle is current, no
second key authority), `node tests/security.cjs` (script-loading, CTA hrefs limited to this site, manifest ids
guarded), `node tests/page-router.cjs` (routes, including the retired `#/work` link), `node tests/site-bundle.test.mjs`
(round trip on the real content, refusals) and `node tests/publish.e2e.test.mjs`, which needs a running miner
(`flux-miner` and `ark-miner` are the same program). Start an isolated one, for example
`STORAGE_PATH=/tmp/sz GUN_PORT=18765 IPFS_PORT=14002 STATUS_PORT=18766 AUTH_KEYS=<key> GUN_MULTICAST=0 TLM_MANAGED=0 ARK_MINER_AUTO_EXPOSE_IP=0 ARK_MINER_NETWORK=flux-chain-local-test node src/cli.js start`
in `ark-miner-cli`, then set `FLUX_CHAIN_TEST_KEY` (its `AUTH_KEYS` value), `FLUX_CHAIN_TEST_STATUS` (port 18766)
and `FLUX_CHAIN_TEST_PIN` (port 15002, which is `IPFS_PORT` + 1000). Without a miner it prints SKIPPED, not pass.
Not covered by an automated test: saving into a connected project folder in a real browser (the store is
tested against a fake directory handle), replication to a second miner, and the Flux Auth client envelope
(`flux-auth-client` `presentTo` a verifier) that chat.deadark.com also carries: it binds to a fixture-signed
staging DAO until Batch 32.6, so a real check would prove nothing yet. The full sign-in flow (enrollment, a
wrong code, the real lockout countdown, sign-out, and a return sign-in) was driven in headless Chrome with
fixture kits from `flux-auth`'s `scripts/generate-founding-auth-kits.mjs` (PIN 24682468).

Public Account and the local CMS share an identity boundary. Unlocking Account signs the local host's origin-bound challenge and checks site ownership; a remembered public pointer alone grants no CMS permission. Account's **Open CMS** link keeps the same-origin account tab as the signer owner, so the gate can reuse its unlocked signer without copying or storing a key. A valid host cookie restores editing after a document reload; publishing still requires a live signer. The CMS updates the same public identity pointer, and explicit sign-out revokes CMS access. CMS ownership refusal preserves a valid public account sign-in. Run `node tests/cms-account-session.cjs` and `node tests/cms-gate-reuse.cjs` for access reuse, restored editing, origin checks, missing authority, and sign-out races.
