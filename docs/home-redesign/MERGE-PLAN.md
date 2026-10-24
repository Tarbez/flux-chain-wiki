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
- **Centralize.** Three.js is vendored once, at `js/vendor/three-r180-defxn.js`. The ring kit becomes one module set under `js/world/`. Nothing is copied into two places.
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
   - Three.js and the mark already sit at their public paths (`js/vendor/`, `js/ark/mark-data.js`). The FLX grammar moves from `js/admin/vendor/` to `js/ark/vendor/`, so the site can read the World draft. tests/versions.cjs and admin-app.html follow it.
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
5. **NFT skins.** Contract from the NFT session (defxn-30), 2026-10-24. It is a sample-only contract: the owner has not confirmed the card's design or its data fields.
   - **Loading:** the engine (`docs/home-redesign/nft/nft-engine.js`) is loaded by path, in the NFT session's fixed order. No copy and no fork. It is not promoted to the SDK or ark-ui until the owner agrees.
   - **Where it applies:** `DefxnEngine.enter(wrapper, record, { world: false })` on a site wrapper, never on `<html>`, because the site's theme writes `data-theme` there. No inline styles go on that wrapper while a skin is on.
   - **Tokens a skin sets:** `--canvas --surface --raised --nested --overlay --text-strong --text --text-muted --text-faint --text-inverse --primary --accent --complement --role --badge --border-subtle --border-default --border-strong`.
   - **What the site maps:** under `[data-theme="nft"]`, `--border` comes from `--border-default` and `--signal` from `--accent`.
   - **Never skinned:** the chain kinds, the networks, `--reference`, or the meaning tokens.
   - **Repaint:** the world listens for `defxn:skin` on the wrapper (it bubbles) and repaints once.
   - **Marks (`data-nft`):**
     - `panel` for the rail and sheet cards
     - `button data-primary` for the main action, `button` for second actions
     - `heading` for section heads
     - `name` and `avatar` for the account
     - `card` for the identity card spot
   - **Never marked:** forms, navigation and tabs, anything whose colour carries meaning, the Sample notes, the 3D canvas.
   - **The visitor's card:** no lookup from an FXN ID to a card exists, so the merge builds no lookup and no store. The card and its skin ride in the address. A real signed card (a KASSET1-based resolver record) is the owner's decision.
   - **Reserved names:**
     - globals: `DEFXN_LAYERS*`, `DEFXN_REVIEW`, `DEFXN_CARDS`, `DEFXN_TRAITS`, `Art3D`, `DefxnCard`, `DefxnWorld`, `DefxnThumbs`, `DefxnEngine`, `DefxnCardRecord`, `DefxnReviewRecord`, `DefxnGLB`
     - class prefixes: `.nft-`, `.w-`, `.th-`
     - the event `defxn:skin`
     - `data-theme="nft"`
   - **Never shown on the real site:** sample record 009 (it carries a .eth name).
   - **File moves (done 2026-10-24, agreed with the NFT session):** Three.js is now at `js/vendor/three-r180-defxn.js` and the DEFXN mark at `js/ark/mark-data.js`. There is one copy of each. The NFT session changed the `nft/` references itself.
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
