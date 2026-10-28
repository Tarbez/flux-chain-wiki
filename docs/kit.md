# The Kit (More > Kit)

Written for: the owner and the next session that works on the Kit.

The Kit shows the owner's five DEFXN boards (150 elements) live on the CMS canvas. You can wear a sample card on them.
Status: built 2026-10-26 and not yet confirmed by the owner. Under the tests law, it has no tests until the owner confirms it.

## Files

| Part | File |
| --- | --- |
| The boards' table of contents (ids, names, order) | `js/content/kit-boards.js` |
| The renderer registry | `js/kit/registry.js` |
| Boards 01-04 renderers | `js/kit/board-01.js` to `board-04.js`, `css/kit-boards-a.css`, `css/kit-boards-b.css` |
| Board 05 (3D objects) | `js/world/object-kit.js` (`S.objects`), `js/world/kit-stage.js` (the `kit` view) |
| The page | `js/pages/kit.js`, `css/kit.css`; the route `/kit` exists only with `cms-preview=1` (`js/pages/catalog.js`) |
| The editor dock | `js/admin/kit.js`, styles in `css/admin.css` (`.cms-kit`) |
| Every Ark primitive | `js/ark/vendor/ark-kit-catalog.js` (from `scripts/ark-kit-catalog-entry.js`, `npm run build:ark`) |
| The wear sweep | `js/main.js` `cmsMorph` (a view transition), `css/kit.css` `html.kit-morph` |

Status is derived, never listed. An element is built when a renderer or 3D builder exists for it. "Partial" carries the renderer's own sentence that says what is missing.

## Reduction test (design laws)

1. **What is this page about?** It shows one board of elements as they really draw.
2. **What is the one dominant action?** Wear, and then Take off. It is the dock's one solid button.
3. **What does the user need to know right now?** Which board this is, and how much of it is built, partial or not built.
4. **What can remain hidden until requested?** Why an element is partial. This shows under the tile and in the dock row. The file paths sit under Developer details.
5. **What is repeated elsewhere?** The Skin lab also applies samples. The Kit reuses its path (`DefxnSkinSite`) and adds no second skin path.
6. **What exists only because the database has it?** Nothing. Ids are addresses and do not show in the primary UI, except in a missing-renderer sentence.
7. **What can be removed without changing the decision?** Nothing yet. The board tabs on the page repeat the dock's board switch so that Preview mode works alone.
8. **Does leaving this screen preserve state?** Yes. Closing the Kit takes the card off and brings back the page and the Edit/Preview mode you had.
9. **Does returning preserve context?** Yes. The dock remembers the board and the element for this session.
10. **What happens if the system is wrong or fails silently?** A renderer that throws shows "Did not draw" with its reason. With no WebGL 2, board 05 says the 3D world is off. A skin that fails shows its error, as in the Skin lab.

## Each card dresses the Kit by its own rules (2026-10-26, round 2)

- The Kit shows 9 elements per page, in a 3 × 3 grid, with page steps. The 3D board uses the same pages (`kit-stage.js`, state `p`).
- Each tile is an Ark UI card part (`data-ark-part="CARD"`), so the worn card's own drawings land on it: its corners, nameplate and edge. When the element is a surface itself, the tile is a `GROUP` (corners and edge only), so no tile carries two nameplates. Ark's part-kind reader decides this.
- Full frames and tickets stay on hero sections only (`js/ark/skin-parts.js` shapeRules, owner rule of 2026-10-25), so tiles wear the card's corners. The dock says so.
- A card's nameplate drawing can reach lower than its box (sample 512). `fitPlates()` in `js/pages/kit.js` measures the drawn nameplate per tile and moves the element below it.
- The page header and the dock list the worn card's measured rules and pieces, read from `DefxnSkinSite.active()`.

Browser scan, 1440×900, all 3 samples:
- Sample 27: soft edge, icon marker, airy density.
- Sample 263: cut edge, icon marker.
- Sample 512 (the Arcade set): soft edge, index marker.

Every tile changes under each card. The dock flow was driven end to end: open, board, element, Wear, Take off, close. Scan scripts are not tests: they lived in the session scratchpad.

## Compare and fit (2026-10-26, round 3)

- **Compare** shows one element four times side by side: the site look, then sample cards 27, 263 and 512. Open it from a tile's Compare button, or from the dock's "Compare under every card". It is not built for board 05.
  - Each pane is dressed by `DefxnSkinSite.preview()`, the site's one way to dress a box with a card, so there is no second skin path.
  - The panel lives outside `#scene`, so a card worn on the page never tints the site-look pane.
  - Esc closes the panel and goes no further. The site's own Esc means "back to home" and used to leave the Kit.
- **Fit:** an element larger than its tile is zoomed down to fit, never below 0.55. The page measures each element after it draws and again after a card is worn, because a card's density changes the room. In compare panes an element may grow up to 1.6×.
- **Partial notes** are one line on the tile. The full sentence shows on hover and in the dock.
- **Lost messages:** the dock asks the page again on every canvas ready, so a report lost while the canvas loaded cannot leave the dock waiting.

## Partial elements moved into Ark UI (2026-10-27, Ark UI 0.2.42 and 0.2.43)

24 of the 40 partial elements are now real Ark UI parts, so every site gets them. 16 remain partial.

- **Forms (existing blocks extended):** textarea, valid state, password reveal, number stepper, tags, choice counts, icon buttons, and a card's one action.
- **New blocks:**
  - `donut`, `gauge`, `spark`, `terminal` (`blocks/charts.ts`)
  - `bottom-nav`, `dock`, `tree`, `launcher` (`blocks/nav.ts`)
  - `checklist`, `state-card`, `retry`, `level`, `upload` (`blocks/status.ts`)
- **Docs:** `design/ark-ui/docs/blocks-*.md`. The props are in the generated reference in `BLOCKS.md`.
- **Two stylesheets:**
  - The base sheet, `css/ark-blocks.css`, is linked on every route. It went from 9.5 to 10.4 KB gzipped (the form changes).
  - The chart, nav and status blocks have their own sheet, `css/ark-blocks-groups.css` (5.5 KB gzipped). A route links it only when it renders one of them; today only `/kit` does.
  - Its icons are copied to `assets/ark-icons/` by `scripts/build-ark-vendor.cjs`, which derives the list from the sheet.
- **Still partial, by decision:**
  - The four DEFXN cards (wallet, resolver, network, chain) and the hex data block are DEFXN-only parts.
  - The drawer and the modal need a focus trap, which the light-DOM host refuses.
  - The switch with an icon, a filter that allows several values, the tree's multi-select and lazy branches, expiry and revocation (no session reports them yet), the retry and the upload (this page performs neither), and the security scale (an FXN ID file names one profile).
- **Not done yet:**
  - Ark's own tests were not run, because the design is not confirmed.
  - The SDK's CMS block schemas were not synced (`design/deadark-sdk scripts/sync-ark-block-schemas.mjs`). The SDK folder holds other sessions' unreleased work. Until the sync, the CMS Library cannot insert or save the new blocks.

## Known limits (first build)

- Popups (select, menus, calendar) open inside their tile. The tile clips anything outside it (`container-type` and `backdrop-filter`).
- Modals and drawers are previews. The light-DOM host refuses focus traps.
- The slider has no drag. It accepts track presses and arrow keys only.
- The chart frame, mini graph and donut are SVG. `createArkChart` needs `ui.render`, which the light-DOM host does not have.
- Toasts keep Ark's `toast` part, which has no schema key, so per-part skin rules may miss the toast frame.
- There is no side-by-side split view. Wear and Take off sweep the whole page instead.
- The 3D objects share some code with `auth-stage.js` and `identity-stages.js`: the card body, the frame bars, the rings and the token parsing. Merge these once the owner confirms the look.
