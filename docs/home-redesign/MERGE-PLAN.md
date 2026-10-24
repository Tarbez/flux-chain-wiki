# Merge plan: the home redesign into the defxn site

Written for: the owner, and the agents who do the work. Owner decisions, 2026-10-24:

- "Let's merge to the defxn repo."
- "We have the CMS to code it from there."
- "We now also need to support editing the 3D from it, and even control the animations and exits from there."
- Scope: **the 3D world goes under the whole site.** The ring world replaces the particle background on every page. The redesign's views replace their matching pages. Every other page keeps working over the world.

## What exists today

| Part | The site (index.html) | The redesign (docs/home-redesign) |
| --- | --- | --- |
| Background | Particle relief on raw WebGL: `js/zero-webgl.js`, `js/lattice.js` | One Three.js r180 world: `ring-kit.js`, `chains-scene.js`, stages |
| Routes | History API paths. One page table: `js/content/site-pages.js`, plus `js/pages/catalog.js` | `#/` hash router in `app.js`, plus extra views |
| Page module | `ArkUI.pageModules.<m> = { mount(host, page) }`, with `presence` enter and exit | Views inside one HTML file. Words rise in, and the camera flies |
| Words | Page manifests, read by `ArkCopy` key, edited in the CMS | Mostly in JS and HTML. Some come from `concept-data.js` (the brief) |
| CMS | `admin-app.html`. 13 drafts in `js/admin/store.js` `DRAFTS`, each saved as a `.js` file | None |
| Saved form | JSON inside a JS call (`Ark*.define({...})`) | Not applicable |

## The laws this merge must keep

- **Stored state is FLX** (workspace AGENTS.md). Every new draft is saved as FLX records, in the grammar of `js/admin/vendor/flx-state-grammar.js`. The site loads it from `file://`, so the record text travels inside one JS call, `ArkWorld.define("<FLX>")`. The bytes are FLX, never a JSON object. The existing JSON drafts are not rewritten in this merge.
- **One shell.** The site keeps its own header and its own router. Its page presence and its CMS stay too. The redesign's header, footer and router are retired as each view moves.
- **Centralize.** Three.js is vendored once, under `js/ark/vendor/`. The ring kit becomes one module set under `js/world/`. Nothing is copied into two places.
- **Security policy and budgets.** `tests/security.cjs` pins the policy, and it stays unchanged. Three.js loads lazily. Any budget exemption is the owner's decision.
- **Motion laws.** No idle frame loop. Transitions are motion only. Reduced motion is respected.
- **Copy and design laws.** Copy check 5/5. Pages fit 1280x720 and 1440x900. One dominant action.
- **Never touch others' uncommitted work.** `index.html` and `js/ark/authorization-dialog.js` carry another session's changes. Edit around those lines. Never overwrite the files.

## The new CMS draft: World

The 14th row in `DRAFTS` is `{ key: 'world', kind: 'single', global: 'ArkWorld', file: 'world', byRoute: ['views'] }`. What the CMS can edit:

| Group | Knobs |
| --- | --- |
| Look, site-wide | key, back and fill light (strength, place, softness), sky and environment light, exposure, contrast, fog start and end, grain, beam, dust |
| Per view (`views[route]`) | camera aim, distance, height angle, turn, tilt. Network dim. Which rings are lit |
| Motion | flight length, crane height, word rise in and out (time, stagger), card zoom (scale, time) |
| Story (first visit) | the steps, the time of each step, skip on return |
| Exits | per-route leave motion: words up, sideways or zoom; the camera's leave path |

- **Preview:** `defxn-cms-preview-world` carries the whole draft. The world applies it without a remount.
- **Editor:** Studio, Design mode, a new **World** sub-view. It has sliders and fields, and a view picker that flies the canvas to the view being edited.

## Phases

1. **Ground.**
   - Vendor Three.js under `js/ark/vendor/`.
   - Move the ring kit, the scene and the stages to `js/world/`.
   - Add the `ArkWorld` content module and its FLX serializer, with tests that check the FLX round trip exactly.
2. **The world under the site.**
   - The persistent layer hosts the world canvas instead of the particle relief, which is kept as the no-WebGL fallback.
   - The world follows the router (`ark:route-ready`, `ArkUI.sceneState`) and flies the camera per route.
3. **Pages.**
   - The redesign's views become page modules, in this order: intro and home, then chain, record, open and links, then the rest.
   - Their words move into page manifests.
   - Old pages that a view replaces are retired. Every other page stays, over the world.
4. **CMS World panel.** The draft, the preview message and the Studio sub-view.
5. **NFT skins.** The site takes a visitor's card skin through the NFT engine's token contract and `data-nft` marks. This waits for the NFT session's answer: which tokens, which marks, where the card comes from, and where the engine lives (SDK or ark-ui).
6. **Gates.**
   - npm test and npm run test:browser
   - check:pages and check:ark
   - the page-style and glossary checks
   - the copy check
   - the redesign's audit, at both sizes

## First local test

After phases 1, 2 and 4, and the intro and home pages from phase 3:

1. Run `node scripts/publish-host.mjs --open`, or open the site's local preview.
2. The site opens on the intro. A click dives into home, and the world stays under every page.
3. In the CMS, **Design → World** edits the light, the camera per view, the flight length and the story timings. The canvas shows each change before Save.
