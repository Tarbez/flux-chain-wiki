# In one minute: the 3D sequence

Written for: the main session (to review), the 3D agent and the NFT session (to answer the asks in section 9). Status: design, phase 1. Nothing is built. Nothing here is live: DEFXN is on devnet, so the sequence shows no count, place or live state.

## 1. What the visitor gets

A visitor opens In one minute and watches the real grid for 60 seconds. The camera flies through it in nine beats. Each beat lights part of the grid, shows one sentence, and ends on a true claim. The visitor can pause, step with the arrow keys, jump to the end, or leave at any time. The last beat offers one action: follow a record back to its start.

The grid is the stage and keeps its own look. The card appears in two beats as a layer in front of the grid. It never covers the grid and is never merged into the ring kit.

## 2. Rules the sequence keeps

- The ring kit's look and colours never change. The sequence moves its camera, lights what exists (`focusOn`, `lit.line`), and adds its own staged elements as a new stage (`S.stage`, as `concept-stages.js` does).
- The card is drawn by the NFT engine (`js/nft/scene.js`, `art3d.js`, `skin-recipe.js`), loaded through `DefxnSkinSite.art()`. It stays in its own DOM layer.
- Motion only: camera flights, transforms and clips. No fades and no cuts.
- It settles. No frame loop runs while paused or finished. The driver uses one WAAPI animation for the progress line and one timer for the next beat. The world draws on demand.
- Fits 1280x720 and 1440x900 with no scroll. One dominant action per state.
- Words come from a manifest read by `ArkCopy` (`js/content/manifests/worldminute.js`). Copy follows `docs/COPY-LAWS.md`.

## 3. Storyboard

Total 60 s. Camera moves use the stage's `target` (aim, dist, elev, yaw, tilt) from `chains-scene.js`, with `api.refresh(dur)` for each beat's flight. Ring names are the kinds in `js/content/network-data.js` (`N.KIND`: identity, resolver, token, network, hub).

| # | Time | Camera | What lights | Sentence on screen | Visitor can |
|---|---|---|---|---|---|
| 1 | 0:00 to 0:06 | Starts on the whole grid from above (the `minute` view's pose), then cranes down toward your ring (`N.MINE`), 2.2 s | Identity rings (`focusOn` kind identity). Your ring stands lit | "You hold one key. It signs every record on your own chain." | Pause, step, skip |
| 2 | 0:06 to 0:12 | Dive into your ring, 1.8 s, then a slow turn along it | Your ring's records join one to the next, oldest to newest | "Each record links to the one before it. Nothing is rewritten." | Same |
| 3 | 0:12 to 0:18 | Crane out to the wide grid, 1.7 s | The ground logo and its beam (DEFXN, the kernel), then the other chains: the first chain, FXN, and the network chains (DeArk, CR3TV) | "DEFXN is the kernel. FXN is the first chain, and other networks run beside it." | Same |
| 4 | 0:18 to 0:25 | Pan to a resolver ring (`RES0`), 1.2 s | The resolver ring. A line runs from a capability cube to the resolver, then to your ring (the existing step-5 trace, `W.lit.line`) | "A resolver reads signed records, applies its rules, and signs the result." | Same |
| 5 | 0:25 to 0:31 | Pan back to a network chain, slight rise | Copies of the result appear on other rings (small tiles rise out of the rim). A site pane rises out of a network ring | "Other computers keep a copy. Sites will ship the same way, as bundles on the mesh." | Same |
| 6 | 0:31 to 0:37 | Hold near the site pane, drift 4 degrees | A name tag, `radio.fxn`, builds on the pane's top edge | "A name is flat, like radio.fxn. One signed record says who owns it." | Same |
| 7 | 0:37 to 0:45 | Camera holds on the wide grid and drifts slowly, so the grid stays in view. The card layer slides in from the right by clip and transform | The card forms in its own layer: six chrome pieces (frame, corner, tag, ornament, divider, emblem) fly in, then the five art layers (backdrop, aura, mark, signal, particles) stack in depth | "Your card is built from pieces. Your record picks them." | Same. Rotate the card with the pointer |
| 8 | 0:45 to 0:52 | Holds. A small site pane stands next to the card | The pane takes the card's colours and frame (a skin). The grid does not change | "Visit a site and it can wear your card. The grid keeps its own look." | Same |
| 9 | 0:52 to 0:60 | Crane to a wide shot from behind the newest record (the `trace` view's pose) | A proof line runs from the newest record back through each signature to genesis, then to the ground logo | "Anyone can check. Follow the signatures back to the start." | Follow a record back (the one dominant action, from 0:52 on) |

Beat 9 holds at 0:60. The sequence ends there. It does not loop.

## 4. The true claim behind each beat

Each claim is checked against a file. Where the code or docs call a part planned or sample-only, the sentence says so.

| # | Claim | Source |
|---|---|---|
| 1 | One FXN ID is one key file, `.auth.fxn`, for every network, kept on the person's device. A person, team or app keeps its own chain of signed records | `js/content/manifests/worldidentity.js` (the Your identity text), `js/content/concept-data.js` minute step 1 |
| 2 | Each record links to the one before it, back to the chain's first record. Nothing is rewritten | `js/content/manifests/worldworks.js` (line 792 text), `AGENTS.md` future law, `docs/home-redesign/MOTION-SPEC.md` (Your chain) |
| 3 | DEFXN is the base chain kernel and knows no coin. FXN is the first chain. DeArk and CR3TV are network chains in the grid | `js/world/home-descent.js` header, `js/content/concept-data.js` ("FXN is the first chain"), `js/content/network-data.js` |
| 4 | A resolver is a rulebook launched as its own chain. It reads signed records, applies its rules and signs what follows. That signature is the result | `docs/glossary.md` (Resolver), `js/content/concept-data.js` minute step 3 |
| 5 | Other computers store the signed result as it is and do not redo the work. The mesh hosts what you build "instead of on servers you rent". Sites ship to the mesh as signed bundles, but the Bundle Deployer is not built yet, so the sentence says "will" | `js/content/concept-data.js` minute step 4, `js/content/manifests/about.js` (line 27), `resolutions.js` (line 165), `bundledeployer.js` (lines 75 and 195) |
| 6 | Names are flat (`radio.fxn`). dense-wire's signed `KDOM*` records allocate, change, transfer or resolve each name. radio.fxn is the brief's own example name | `docs/DEFXN-NAMES-ONE-SYSTEM.md`, `js/world/home-sites.js` header. The sentence does not say a visitor can claim a name, because claims are genesis-key-only until a public access gate exists |
| 7 | A card is chosen from the record's key: `T.pick(record)` picks one element per layer. The art layers are backdrop, aura, mark, signal, particles. The chrome pieces are frame, corner, tag, ornament, divider, emblem. The card design and data fields are unconfirmed by the owner, so the layer shows a sample card and says so | `js/nft/traits.js`, `js/nft/scene.js` (`ART`), `js/nft/skin-recipe.js` (chrome), `docs/home-redesign/SKIN-CONTRACT.md` |
| 8 | A skin sets the SDK colour tokens and the chrome on a wrapper. The grid never takes a card's colours (owner, 2026-10-24). Sample 009 is never shown | `docs/home-redesign/SKIN-CONTRACT.md` sections 1b and 4b, `js/ark/skin-site.js` (`SAMPLES`) |
| 9 | A person who wants proof follows the signatures back to the start. Ed25519 signs every record and result | `js/content/concept-data.js` minute step 5, `docs/glossary.md` (Ed25519), `worldworks.js` (line 450 text) |

Left out on purpose: token ledgers ("Every token keeps its own ledger"), the FXN coin and DAO governance. They are in the old five-idea minute. The owner's list for this minute does not name them, and a tenth sentence on them would put two ideas in one beat. See open question 2.

## 5. How the sequence uses the grid and the card

**The grid.** The sequence registers one stage, `movie`, through `S.stage({ name, aims: true, target, set, pose, anchor, tags })`, the same contract as `minute` in `concept-stages.js`. `target()` reads the current beat and returns the camera pose. `set(st)` takes `st.s` (the beat, 1 to 9). `pose()` lights what the beat names: `W.focusOn(...)` for ring kinds, `W.lit.line(...)` for the result's path, and the existing tweens. After each beat change the driver calls `DEFXNScene.refresh(duration)`, so each flight has the length the storyboard names. It moves no mesh colours and adds no material to the ring kit's own sets.

**Staged elements the sequence adds** (new, in its own stage, in the same material language as `MOTION-SPEC.md`: graphite, slate, bone, teal only for what is signed):
- result copies on other rings (beat 5)
- the site pane and the `radio.fxn` tag (beats 5 and 6), built from the same panel shape as `home-sites.js`, or taken from it if the 3D agent exports it (ask 3 below)
- the proof line (beat 9)

**The card.** The card lives in a DOM layer next to the page's words, never in the canvas. Its art layers are painted once each by the NFT engine into canvases (`DefxnScene.cardArt(record, picks, only, width)` with `only` set to one layer). Its chrome pieces come from `DefxnSkin.recipe(record).chrome` as SVG. The sequence stacks them with CSS 3D transforms (`translateZ`), so an exploded card assembles by transform and clip only. It loads through `DefxnSkinSite.art()`, which already loads three.js and the mark once. The layer's box is a fixed region at the right of the stage, about 38 percent of the width, and the grid remains visible and unscaled beside it.

The visitor has no card to show. No lookup from an FXN ID to a card exists (`MERGE-PLAN.md`, phase 5). The layer uses a review sample (27, 263 or 512) and labels it "Sample card".

## 6. Reduced motion

`prefers-reduced-motion: reduce` gives a still, readable sequence of the same nine beats.
- No autoplay. The visitor starts at beat 1 and steps with the Next and Back buttons or the arrow keys.
- Each beat is a settled pose. The camera snaps (the kit already does this: `k.reduced` sets `tilt` to 0 and `api.to` snaps the pose). Nothing flies.
- The card appears assembled in beat 7, with the pieces listed under it in words. Beat 8 shows the dressed pane beside it.
- The sentence of each beat is the whole content. Every beat reads with the 3D off (`?world=off`), where the sentences and the progress list still work.
- Clips and transforms are replaced by instant states. No opacity animation is used anywhere.

## 7. Controls

| Input | Action |
|---|---|
| Space or K | Pause and resume. A button shows the same state |
| Right arrow | Next beat |
| Left arrow | Previous beat |
| Home | Back to beat 1 |
| End | Skip to the end (beat 9, held) |
| Beat ticks (9 buttons) | Jump to a beat. Each carries the beat's short name |
| Leave link | Back to the page that opened it. Always focusable |
| Esc | Pauses. It never traps focus |

- Autoplay starts on mount with a visible Pause button. The visitor has pressed nothing, and doing nothing leaves a useful page (design law 25).
- Pausing keeps the beat and the camera where they are. Stepping while playing pauses autoplay and resumes it only when the visitor presses Play.
- The dominant action while the sequence runs is Next. From beat 9 it is "Follow a record back" (links to `/trace`). Pause and Back are outlined, and Skip is a plain link.
- Focus is never trapped. The page uses the site's header and footer. Each control has an accessible name from the manifest.
- A live region (`aria-live="polite"`) announces each beat's sentence once.

## 8. Words, manifest and files

Words: `js/content/manifests/worldminute.js`, read by `ArkCopy` under the key prefix `WORLDMINUTE.`. It holds the nine sentences, each beat's short name (for the ticks), the control labels, the sample-card label and the end action. The existing `WORLDWORKS.*` text is not edited.

Files (phase 2, all new):
- `js/world/minute-experience.js`: the `movie` stage and the sequence driver on `ArkWorldHost` and `DEFXNScene`
- `js/pages/world-minute.js`: the page module (`ArkUI.pageModules`), controls, card layer, reduced-motion path
- `css/world-minute.css`: layout at 1280x720 and 1440x900, the card layer, control bar
- `js/content/manifests/worldminute.js`: the words

## 9. What the sequence needs from others

From the 3D agent (`world-host.js`, concept stages). I will not edit these files.
1. A view named `movie` mapped to a route (for example `works/minute`) in `VIEW_OF` and `KEY_OF`, so `viewFor(route)` returns it. My stage registers itself when `minute-experience.js` loads. The host must load that file before the first `api.to`.
2. `ArkWorldHost.state({ view: 'movie', s })` and `ArkWorldHost.select({ s })` must reach my stage's `set()`. They already do for `minute`. No change is needed if `movie` is treated the same way.
3. The radio.fxn panel: export a function from `home-sites.js` (for example `S.sites.show(on, ring)`) that raises the panel on a ring I name. If that is not wanted, I build my own panel in my stage and accept two copies of a small shape.
4. The ground logo and beam: a way to light them by request (for example `W.logo.lit(on)`), because `home-descent.js` drives them only on home and trace.
5. Camera targets I use, so they stay stable: `HUB`, `N.MINE`, the first resolver ring (`N.KIND.indexOf('resolver')`), the first two `network` rings, and `W.fit`. If any change meaning, tell me.
6. The route swap: the main session swaps `worldMinute` in `world-works.js` to my module when I finish. The `/how-it-works` chapter strip needs one entry that points at my route, or the old minute stays as the reading version.

From the NFT engine (`js/nft/*`, the NFT session).
1. Per-layer painting without the glow: `DefxnScene.cardArt(record, picks, only, width)` composites glow on top (`compose`). I need each art layer as its own transparent canvas, with an option such as `{ glow: false }` or a returned `{ art, glow }` pair, so five layers stack in depth without brightening each other.
2. The six chrome pieces as separate sized SVGs with colours filled: `DefxnSkin.recipe(record).chrome` already gives this. Please confirm the stable keys (frame, corner, tag, ornament, divider, emblem) and that `corner` mirrors as `mirror: true`.
3. A scoped skin for a small pane: `DefxnSkinSite.apply(record, { root })` today applies to `#scene` only. I need to dress one pane element with the card's tokens, chrome and rules, and to remove them exactly (skin contract invariant 3), without touching the page. If this is not possible, I set the recipe's tokens on the pane as CSS variables and draw its frame from the chrome SVG.
4. A sample record that is safe to show: 27, 263 or 512 only, never 009 (`SAMPLES` in `skin-site.js`).
5. A paint cost note: how long five layers take at 800 px width, and whether they can paint while the first beats play, so beat 7 never waits.

## 10. Reduction test (docs/PRODUCT-DESIGN-LAWS.md)

1. **What is this page about?** What DEFXN does, in one minute.
2. **The one dominant action?** Next beat while it runs, then "Follow a record back" at the end.
3. **What does the visitor need right now?** The sentence of the beat in front of them, and the part of the grid it lights.
4. **What can stay hidden?** The sources, the sample-card note beyond a label, and every count. Beat names show only on the ticks.
5. **What repeats elsewhere?** The five old ideas repeat on `/how-it-works`. This page tells them as a story. The old page remains the reading version.
6. **What exists only because the data has it?** Nothing. Every beat is a claim in a file.
7. **What can be removed without changing the decision?** Beat 8 (the dressed pane) if the owner wants fewer beats. Open question 3.
8. **Does leaving preserve state?** The beat rides in the address (`?s=1..9`), so a reload or a shared link opens the same beat, paused.
9. **Does returning preserve context?** Yes, through the address. A return visit with no address starts at beat 1, playing.
10. **What if the system fails?** No WebGL: the sentences, ticks and controls work over the page's fallback background. Card art fails: the layer shows the chrome pieces only, and the console names the file. The sequence never blocks the page.

## 11. Open questions for the owner

1. Should the sequence autoplay on arrival, or wait for Play? Autoplay shows the claim at once. Waiting is calmer for a return visitor. This design autoplays once per visit and waits on return.
2. Do token ledgers, the FXN coin and DAO governance belong in the minute? They are left out now. Adding them means a tenth beat of about six seconds, which takes the time from beats 3 or 8.
3. Is the dressed site pane (beat 8) needed, or is the card forming enough? The owner's ask says the card dresses sites you visit, so the design keeps it.
4. Which sample card leads: 27, 263 or 512?
5. The Bundle Deployer is not built, so the fifth beat says sites "will" ship as bundles. Confirm that wording, or cut sites from this minute until the deployer exists.
6. The end action is "Follow a record back" (`/trace`). The alternative is "Create your identity". Which is the one action?
