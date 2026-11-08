# Home animation performance audit — 2026-10-02

Scope: desktop Home mesh interactions, alignment, shared pointer motion, and navigation cleanup. The visual direction remains the existing mesh blocks responding to the five cycle steps.

## Findings and fixes

| Finding | Change |
| --- | --- |
| Two geometry reads during every animation paint | Measure the mesh crop once per interaction; precompute normalized cells and reuse them. |
| Full viewport activity canvas cleared every paint | Clear only the occupied mesh cell rectangle. |
| Painting at display refresh rate | Cap expensive canvas painting at 30 fps, preserve the 850 ms progression, and always paint the final state. |
| Unrelated scene state updates restarted a selected response | Restart only for changed motion state or invalidated geometry/theme. |
| Canvas width/height reassigned on every field redraw | Resize backing buffers only when their dimensions change. |
| Home pointer movement scheduled a second parallax loop | Skip this decorative loop on Home; cell interactions remain active. |
| Pending initial Home alignment callback survived disposal | Cancel its frame and disconnect ResizeObserver; guard disposed callbacks. |
| Repeated alignment callbacks rewrote identical CSS variables | Cache bounds and skip unchanged writes. |
| Cancelled reading frames retained a stale handle | Clear the handle immediately; hidden tabs cancel the reading producer. |

The Home cell controller cancels old runs on step switches, clears on navigation/exit, and rejects stale callbacks through a revision token. Hidden tabs stop the loop. Pause and reduced motion paint a single static state. Scene-level delegated listeners are installed once; Home mounts do not add another listener set. The original random activity timer does not run while the Home cycle panel exists.

## Verification

The deterministic test uses the production controller and a 60 Hz frame scheduler. It observed **22 canvas paints**, **two layout reads per interaction**, and **zero queued frames after completion**. Every clear was below 520 × 120 pixels rather than the 1440 × 900 viewport. It also covers pointer priority, stale callback rejection, rapid switching, navigation, pause, reduced motion, visibility and 100 start/stop cycles without queued-frame accumulation.

Browser verification at 1440 × 900 completed five Agreement → Home round trips. Each return had **two lattice canvases, one Home panel and zero continuity hosts**. The two observed 1440 × 900 RGBA backing buffers total 10,368,000 bytes (about **9.9 MiB**); this is a backing-store estimate, not total browser or GPU memory. Home remained scroll-free. These shared full-scene canvases are retained for other pages; this revision reduces painting work without changing that architecture.

Checks: `node tests/home-animation-performance.cjs`, `node tests/lattice-theme.cjs`, `node tests/routes-live.cjs`, `node tests/panel-continuity.cjs`, `node tests/scene-state.cjs`, and `git diff --check`.

## Limits

Frame and operation counts are deterministic test observations, not measured CPU percentages. Browser heap snapshots, GPU memory profiling and long-duration production traces were not available in this audit. No DOM/canvas accumulation or pending-frame accumulation was detected in the exercised scenarios; this does not prove absence of every possible JavaScript heap leak.

## Site speed and reuse audit (2026-11-08)

Layer: app (the site), with the shared parts in the SDK theme (capability) and fxn-3d (engine). Five read-only audits, one per lane: Ark UI and theme, site speed and UX, 3D, motion, build chain. Nothing was edited, built or run. Sizes are `wc -c` on uncompressed files. No browser was opened, so every time effect, "fits with no scroll" and "one dominant action" are unmeasured.

### Ranked findings

| # | Finding | Where | Fix | Effect |
| --- | --- | --- | --- | --- |
| 1 | The home page loads 117 JS and CSS files, 1,647,137 bytes. About 100 deferred scripts belong to the older Ark and CMS path. | `index.html` | One CSS and one deferred JS bundle per page through build:pages (esbuild is a dependency). The older path loads by `import()` on the route that uses it. | About 115 fewer requests; up to about 1.18 MB not parsed at load (a ceiling: use by the world route was not traced) |
| 2 | All 30 stylesheets block first paint, admin ones included. Four scripts block the parser. | `index.html:22-155` | Inline the loader and world CSS; load the rest per route; defer the four scripts. | Unmeasured |
| 3 | Two full colour theme files: the SDK one, then `flux-themes.css`, which redeclares every token with other values. `settings.css:17-18` is a third set. | `index.html:29-30` | Move the DEFXN colour families into `design/deadark-sdk/src/theme` as a named theme; generate one `themes.css`; delete `flux-themes.css`; fold `settings.css` in. | About 49 KB less CSS before first paint |
| 4 | The type scale lives only in the site (`assets/kit/defxn-fonts.css`), not the SDK. `--fs-micro: 7px` is off the scale and used 61 times. One `13px` and two `.75rem`. | `defxn-fonts.css`, `css/` | Put 11/18/29/47/76 in SDK `typography.ts`; map `--fs-micro` and the stragglers to `--fs-tertiary`. | Ark UI apps without the site file get unset sizes today |
| 5 | `world/trip-letters.bin` (1,115,879 bytes) loads before the first trip. | `js/world2/world2-objects.mjs:131` | Load it when the first lockup word shows, or one record per word. | 1.1 MB off the critical path |
| 6 | The loader can hold a black screen up to 8 s. | `index.html:72-74` | Show the page shell before the world arrives. | Unmeasured |
| 7 | Three.js: one design board still loads `js/world/rail-capabilities.js`, and the gate skips it with a hard-coded exception. 17 dead files in `js/world/` plus `js/vendor/three-r180-defxn.js`. Stale comments point at them. | `docs/home-redesign/home-mockup.html:1404`, `scripts/threejs-gate.mjs:136` | Port the rail to fxn-3d; remove the gate exception; archive `js/world/` and the vendor file; fix the comments. | Closes the Three.js law |
| 8 | Two time models. The site keeps seconds on a 120 BPM grid with springs; the engine keeps frames with curves 0-7 and no spring. No site move can be written as a film. | `js/space/cinematic.mjs:9-19`, `fxn-3d/scripts/lib/anim-sample.mjs:17` | Spring curves 8-12 (ui, type, letter, number, heavy) in `easeOf`; a beat-to-frame helper beside `secondsOf`. | Unblocks film playback of site motion |
| 9 | Three spring copies; the engine has none. | `world2-objects.mjs:447`, `world2-props.mjs:89`, `cinematic.mjs:19`, `fxn-3d/engine/runtime/orbit-camera.mjs:14` | One `fxn-3d/engine/runtime/spring.mjs` (stepped and closed form); all four import it. | Unmeasured |
| 10 | About 20 CSS rules use their own beziers and durations, off the beat. `--glide` is copied as a literal in three files. | `css/world.css:26`, `css/space/*.css` | SDK theme tokens `--ease-ui` ... `--ease-heavy` as `linear()` derived from the spring module, plus `--beat: .5s`. | Consistent feel |
| 11 | Camera and shot code is site-local, beside `cinema.mjs` and `orbit-camera.mjs` in the engine. | `world2-stage.mjs:257`, `world2-objects.mjs:601-617`, `world2-host.mjs:357` | Shot lists as cinema `.fxn` records driven by `cinema.mjs`; the space orbit by `orbit-camera.mjs`. | Removes a second camera system |
| 12 | The site imports fxn-3d through three roots (`js/render`, `scripts/lib`, `engine/formats`). | `world2-stage.mjs:18`, `world2-kit.mjs:15-16`, `world2-dyn.mjs:22` | Move `anim-sample.mjs` into `engine/runtime/`; `js/world2/world2-gl.mjs` is the only file that imports `/fxn-3d/`; a gate that finds every `/fxn-3d/` import and fails on any other file. | One seam |
| 13 | Loops that never stop: `beacons.css:17` bobs forever; the FXN Motion player loops by default from code. rAF without cancel in `main.js`, `pages/kit.js`, `pages/intro.js`, `space/intro.mjs`, `space/shows.mjs`, `pages/world-minute.js`, `admin/rail.js` (a risk count, not a confirmed bug). | as listed | One settle once; player `loop: false`; one `js/lib/frame.mjs` (`once`, `idle`, `settleLoop`) on the `world2-host.mjs:344` pattern. | Unmeasured |
| 14 | Listeners added and never removed (`admin/rail.js` 26, `world2-host.mjs` 17, `hero-motion.js` 16, and others). | as listed | One AbortController per mount, aborted on unmount. | Leak risk, none confirmed |
| 15 | The FXN Motion player is not a drop-in: branch only, bare `fxn3d/` imports, one WebGL2 context per element plus one per shot, no off-screen pause, captions drawn as glyphs instead of DOM text. | `fxn-motion:apps/motion/player.mjs`, `fxn-3d/engine/adapters/web-motion.mjs` | Merge to main; a host-clock mode; a DOM-channel target for captions; a shared context; no `preserveDrawingBuffer` unless `read()`. | Needed before the site plays films |
| 16 | Three built pages are older than their source: `world-measure`, `world-minute`, `world-stats`. | `js/min/pages/` | `npm run build:pages`; make it a prestep of serving. | Right code on 3 routes |
| 17 | `js/ark/vendor/backgrounds.js` (75,447 bytes) loads all seven generators. `ark-blocks.css` repeats old SDK values as inline fallbacks. | `js/ark/vendor/`, `css/ark-blocks.css` | Split per generator (the vendor build already does this for skin, confirm, popover); emit bare `var(--x)`. | Up to about 75 KB off first load |
| 18 | 61 old `.tgz` versions in `.vendor/`, 38,908 KB; only the pinned three are used. | `.vendor/` | Keep the pinned versions; the SDK release store holds the rest. | About 30 MB less repo |
| 19 | A stored JSON file is written. | `scripts/world-encode.mjs:738` | Write it as FLX, or have the atlas designer read the reader module. | JSON law |
| 20 | Copies without a pin: `js/vendor/flx-state-grammar.js` (source `flux/ark-browser`), `js/vendor/fxn-3d/fxn-embed.js` (source not found). | `js/vendor/` | Add both to the `pins` table in package.json. | Drift is caught |
| 21 | Package duplicates: collection helpers in `ark-primitives` and `ark-a11y`; `sameDay` and `formatCalendarLabel` exported twice in `ark-primitives`; `ark-ui` shims keep two import paths. | `design/ark-*` | One home each; retire the shims. | Unmeasured |
| 22 | A stray 0-byte `js/world2/orld2-host.mjs`. | `js/world2/` | Delete. | Hygiene |

Clean on these checks: no grammar engine copy in the site; no WASM; no fsync; every exporting `scripts/*.mjs` has a main guard (the `.cjs` scripts and `scripts/lib/` were not checked); `world2-host.mjs` settles when idle; the site imports nothing from the game folder; build:pages derives its file list.

### Work lanes, in order

1. **Load path** (1, 2, 5, 6, 16): bundles per page, route-loaded old path, deferred scripts, late letters, shell first.
2. **One theme** (3, 4, 10, 17): colour families, type scale and motion tokens into the SDK; one `themes.css`.
3. **One motion core in fxn-3d** (8, 9, 11, 12, 13, 15): spring module, `anim-sample` into `engine/runtime/`, one clock, cinema and orbit for the site, one seam file, the player made site-ready.
4. **Three.js out** (7): the board rail, the gate exception, the dead files.
5. **Hygiene** (14, 18-22).

Tests that will break: `tests/ark-vendor.cjs` (the vendor drift check) flags lane 2. Per the tests law, they are reported and not rewritten until the owner confirms.

### Fix rounds (owner order 2026-11-08: solve all, then merge to main)

At most two editing agents at a time, one of them on 3D. Each agent owns its own files.
- Round 1, site: #1, #2, #6, #13 outside js/space, #14, #16, #18, #19, #20, #22.
- Round 1, 3D: #5, #8, #9, #12, #13 in js/space and beacons.css.
- Round 2, theme: #3, #4, #10, #17, #21. These touch the SDK and ark packages.
- Round 2, 3D: #7, #11. Three.js comes out, and the site uses cinema.mjs and orbit-camera.mjs.
- The genesis session owns the FXN Motion app, so #15 (the player) is theirs. It was sent to them on 2026-11-08.
- After the rounds: one audit, then fixes, then commits with explicit file lists in flux/defxn, flux/fxn-3d and the SDK. Other sessions' uncommitted files are never included.

Round 1 result (2026-11-08):
- **3D lane:** done. engine/runtime/spring.mjs, motion-clock.mjs and anim-sample.mjs are the canonical files, and scripts/lib/anim-sample.mjs re-exports them.
  - Spring curves 8-12 are added. The film reader accepts curves up to 12.
  - The new springs match the old copies with max diff 0, measured over 27,500 closed-form samples and 672,000 stepped steps.
  - js/world2/world2-gl.mjs is the one seam, held by scripts/fxn3d-seam-gate.mjs. It walked 1,206 files.
  - The letters fetch starts on the first hover or trip. The beacon bobs 3 times, then rests.
- **Site lane:**
  - Done: #6 (the shell shows before the world), #16 (`serve` runs build:pages first), #18 (.vendor went from 38,948 KB to 2,108 KB), #19 (the labels JSON is no longer written), #20 (flx-state-grammar pinned), #22.
  - #13: js/lib/frame.js (ArkFrame once, idle, settleLoop). The other listed rAF calls run once and do not loop.
  - #14: none of the listed views mounts twice, so there is nothing to abort. Closed with no change.
  - fxn-embed.js is output of fxn-3d/scripts/embed-export.mjs, so it has no copy to pin.
- **Still open: #1 and #2.** Eager load went from 145 files and 4,002,389 bytes to 146 files and 4,005,834 bytes (wc -c, injected lists included).
  - The manifests, assets and secrets index scripts write tags with document.write, so they cannot be deferred as they are.
  - No eager script was proven unused on home by reading the code.
  - The next pass measures use with one browser coverage run, then moves what home never calls.
- **Tests to report:** tests/world-grammar.cjs:49 still expects world-grammar.labels.json. The old file stays on disk.

Round 2, 3D result (2026-11-08):
- **#7, Three.js out.** The board's rail had no 3D: it is DOM plus a CSS wipe. It moved unchanged to docs/home-redesign/rail-capabilities.js.
  - All three gate exceptions are removed.
  - js/world/ (17 files) and js/vendor/three-r180-defxn.js (723,874 bytes) are deleted.
  - `threejs-gate.mjs --static-only`: 1,453 files, 0 using Three.js.
  - The browser half of the gate was not run.
- **#11, the orbit.** The orbit now runs on engine/runtime/orbit-camera.mjs, through new `turn` and `coast` functions. It matches the old code with max diff 0, over 100,000 site inputs, 100,000 game drags and 2,000 release flicks.
- **#11, kept in site code.** The trips and stage flights stay in site code. cinema.mjs rests at every shot edge, but the site's path never rests. Moving a flight to cinema.mjs differs by up to 12.2 units, and a changed feel is not shipped.
- **#9, orbit-camera's own pull.** It stays as it is. It is a single Euler step per frame, and spring.stepped differs from it by up to 0.104 m over 240 frames.
- **Shared WebGL context.** mountFilm takes o.sharedGl, web-player mount takes opts.gl, and present() blits to the shared default framebuffer. With no shared context, nothing changes. It was not run in a browser.
- **Stale comments.** The comments that named js/world/ now name the world2 files.
- **Tests to report:** tests/world-views.cjs and tests/world-minute.cjs read js/world/ and will fail.

Round 2, theme and load results (2026-11-08):
- **#3, colour.** One theme. css/flux-themes.css and scripts/build-flux-themes.cjs are deleted, and the DEFXN families live in SDK src/theme/site-palettes.ts.
  - Token proof: 24 theme states and 6,216 values, 0 differ.
  - The settings.css palette that showed before panel.js loaded is removed. A first visit now paints the normal tokens from the first frame.
- **#4, type scale.** The scale is computed in SDK typography.ts. --fs-micro (7px) is gone, and its 61 uses are now --fs-tertiary.
- **#10, motion tokens.** --beat and --ease-ui/type/letter/number/heavy are linear() curves, generated from fxn-3d spring.mjs by SDK scripts/build-motion-curves.mjs. 65 easing lines in 21 site CSS files and the css/space files use them. Durations are unchanged.
- **#17.**
  - backgrounds.js went from 75,447 to 1,925 bytes, and each generator loads on mount.
  - ark-blocks.css uses bare SDK vars.
  - The bytes before first paint went from 483,167 to 425,455 (wc -c).
- **#21.** ark-primitives takes its structure and focus helpers from ark-a11y, and ark-elements takes its calendar helpers from ark-a11y. The ark-ui shims are kept, because their consumers have another session's uncommitted changes.
- **SDK 0.2.56.** It is a local release (sha256 fae38cc4…d7c2, cid null), synced into the site with --sdk-only. Nothing went to a network.
- **#1 and #2, home load,** measured with one headless Chrome at 1440x900, on the owner's Mac, portable SSD, local server with brotli. Before: 3 runs. After: 5 runs. Times are medians.
  - Bytes requested went from 5,827,864 to 3,834,396. Most of that is iceberg-blocks.js (1,985,029 bytes), which now loads only in the editor and in preview.
  - halo/surface-motion.js, iceberg.js and image-shape.js are no longer linked.
  - The 7 orphaned stylesheets are deleted.
  - First paint went from 256 to 288 ms and load from 985 to 1138 ms. The ranges overlap, so no speed gain was measured.
  - The manifests' document.write stays. A runtime loader would race the deferred scripts. The safe fix writes the tags into index.html at build time, with the admin writer rewriting index.html.
  - Seven stylesheets are 0% used on home, /intro and /chain, but page-styles.mjs derives them as shared from the shell's scripts.
- **Tests to report:** tests/about-page.cjs, home-hero-scene.cjs, resolver-lab.cjs and fold-no-hidden-content.cjs read deleted sheets. tests/ark-vendor.cjs stops first at scene-stats.mjs (an absolute path) before it reaches this work.

Audit after the rounds (one Fable audit, 2026-11-08), and what was fixed:
- **Letters under file://.** world2-letters.mjs fetched '/world/trip-letters.bin'. It now uses the worldPath() rule: no leading slash under file:.
- **Lockup race.** A show stopped while the letters loaded still raised its word. world2-space.mjs now counts stopShow calls, and lockup skips a stale show.
- **Double frame loop.** A subscriber that subscribes inside its own callback started a second loop. motion-clock.mjs tick and frame.js settleLoop now ask for a frame only when none is pending.
- **Spring keys shorter than their settle time jumped at the key frame.** spring.mjs settleOf() derives each spring's settle time:
  - ui .728 s, type .761 s, letter .885 s, number 1.291 s, heavy 1.561 s.
  - The film reader refuses a shorter spring span. The refusal names the frames it needs.
- **One BEAT.** It lives in spring.mjs. motion-clock and anim-sample read it.
- **beacons.css 13px** is now --fs-tertiary. The frame.js comment about the server render is corrected. scene-stats.mjs no longer names an absolute /Volumes path.
- **Not changed:**
  - js/pages/intro.js still copies the number spring (60/15.5), because a classic script cannot import spring.mjs.
  - bareSdkVars in build-ark-vendor.cjs strips a fallback for any token the SDK declares under any selector. Not checked token by token.
  - The shared WebGL path was never run in a browser.
- **Corrections to the numbers above:**
  - The seam gate now walks 1,195 files.
  - .vendor is 3,252 KB (du -sk) after the SDK 0.2.56 tarball.
  - rail-capabilities.js gained one comment line.
- **design/ark-primitives and design/ark-elements** are ignored by the root repo (`/*` in .gitignore) and have no repo of their own. Their #21 edits stay on disk, uncommitted, until the owner names their home.
- **Tests that read deleted files and will fail** (not rewritten, by the tests law):
  - about-page, home-hero-scene, resolver-lab, fold-no-hidden-content, world-views, world-minute, world-grammar;
  - admin-css-tokens, explore-page-polish, fleet-pulse-route, home-blocks, home-color-semantics, theme-color-contrast, world-pages, world-stats, flux-themes-from-sdk;
  - defxn-product-kit test/kit.test.mjs:335, which expects --fs-* in defxn-fonts.css.
- **fxn-3d scripts/sampler-check.mjs** fails on another session's files (engine/sim/rig-solve.mjs, engine/runtime/walk.mjs). They are not part of this work.
