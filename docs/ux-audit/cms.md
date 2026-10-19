# CMS UX audit: the gate (`admin.html`) and the one-workspace editor (`admin-app.html`)

Audit date: 2026-10-19. Read-only: no product code changed.

**Owner directive:** *"most user would find it very hard to use this platform quite complex. We
need clean the journey and make sure everything is clean and reduce information overload and port
ark ui primitives as premade components to use. We are not going to reduce feature we are simply
going to make a major polish upgrade."*

**Method.** I drove the real editor in Chromium (Playwright) through the harness in
`tests/browser/harness.mjs`: `copySite` → `startHost` on a free port (never 3437) → `fakeFolder` for
Save. I played a first-time, non-technical site owner. I opened the gate with
`localDevelopment: false` and the editor in local-development mode. Viewports: 1440×900, 820×1100
and 390×844. Machine load was 14–36 on 8 CPUs, so waits were scaled, and I name a timing effect
only when I confirmed it after a longer wait. The drivers and the raw notes
(`notes.jsonl`, one record per step) are in the scratchpad next to the screenshots.

**Screenshots.** `$SHOTS` =
`/private/tmp/claude-501/-Volumes-PortableSSD/a51a7d03-a815-4ae1-960d-76c01ee0b2ce/scratchpad/ux/cms/`.
Journeys are prefixed `j1`–`j6`: j1 = first open, j2 = words, j3 = SEO / image / pages,
j4 = design, j5 = save / versions / publish, j6 = phone and tablet.

Related: `docs/ux-audit/components.md` (a parallel audit, 2026-10-19) holds the general plan for
porting defxn to Ark UI components. Section (c) below lists only the duplicates specific to the
CMS, with file:line, so the two lists can be merged.

---

## What I measured, by screen

| Screen | Visible controls | Icon-only | Notes |
|---|---|---|---|
| Gate (`admin.html`) | 1 | 0 | Calm and focused, but uses three names for one credential (P2-1) |
| Editor header, desktop | **23** | **16** | 6 groups. Unselected views collapse to bare icons |
| Editor header, phone | 23 in 3 rows (121 px) | **17** | All 23 are below a 44 px touch target |
| Rail, Pages tab | 51 on screen; ~140 tab stops in the full tree | 26 | 69 routes in 4 groups, plus "New theory page" and "New article" forms after the last row |
| Rail, Layers tab | 64 | 24 | Starts with "Has particle shapes / Ark layer / Ark background host"; tags DIV, CANVAS, SPAN |
| Selection toolbar (Design lens) | 8–10 | **all** | Labels appear only on hover |
| Selection toolbar (Content lens) | 4 | **all** | Includes "Make into component" and "Open in Content" while already in Content |
| Right-click menu (Design lens) | 13 items, 8 disabled | – | The only path to Make into states, Group, Remove, Align and Distribute |
| Page fields sheet (Home) | ~60 fields | – | Every field shows its copy key (HOME.PROMISE …) and the file path |
| Page SEO popover | 11 | 0 | Mixes a monospace textarea with sans inputs |
| Design check popover | 3 | 0 | The header badge is red/pink "7/13" on every page, in both lenses |
| Versions panel | 4 + 3 per version | 0 | Raw diffs: `components: +spots, +masters.mmveixci6q6trc` |
| Mesh sheet | 2 | 1 | Header reads "**undefined** — P2P deployment" |

Contrast: a computed check of the header, rail and status bar text against its nearest opaque
background found nothing below 4.5:1. The problems below are about meaning and structure, not
colour.

---

## (a) Issues, ranked by severity

P0 = blocks the task. P1 = major friction. P2 = polish. Every fix keeps every feature: features
move, get renamed, or go behind progressive disclosure. None is removed.

### P0: blocks the task

**P0-1. A new page or article cannot be seen or edited where the user is looking, and the
header's "Page fields" opens the wrong page** (Journey 3: add a page, add an article)

- *What the user sees.* I added the theory page `pricing` and waited 9 s. The canvas still shows
  Home. The canvas label says "pricing · Desktop". The page picker still says "Not one chain. A
  world of them." The header's Page fields button opens **Home's** fields. The explanation exists
  only in the header status, cut to "New page. Edit it, th…" or "/concep…"; the full sentence is
  in its tooltip. A new article behaves the same way: the canvas label says "hello world" over
  Home, the sheet stays closed, and the rail renames the article "New note" (the delete confirm
  says *Delete "New note"?*, not "hello-world").
  `$SHOTS/j3-newpage-created.png`, `$SHOTS/j3-newpage-fields.png`,
  `$SHOTS/j3-newpage-after-9s.png`, `$SHOTS/j3-article-created.png`.
- *Why it is a problem.* After "Add", the user has no way to start writing. Three indicators
  disagree about which page is current, and the obvious button edits a different page, so the
  next edits land on Home.
- *Fix.*
  1. On create, open the new item's Page fields sheet at once, focused on its title.
  2. Show a canvas empty state: "Your new page appears here after you save. [Save now]". Render
     an Ark EmptyState card, not a blank stage.
  3. Make the picker, the canvas label and the Page fields button read one "current item" in
     `state`. They must never disagree.
  4. Name the article from what was typed ("Hello world"), not "New note".
  5. Longer term: let the preview router accept draft-only routes from the site object it is
     already sent, so a new page shows before Save.

**P0-2. Escape silently throws away inline text edits, and Enter does not finish a heading or
paragraph** (Journey 2: change a headline, change a paragraph)

- *What the user sees.*
  - Typing " Today" into the home H1 and pressing Enter inserted a blank line inside the heading.
    The H1 grew, overflowed, and slid under the toolbar (`$SHOTS/j2-headline-committed.png`).
  - On /about, Enter inside the intro paragraph also made a line break
    (`$SHOTS/j2-para-after-enter.png`). Escape then reverted the whole edit with no message.
    The next Save listed "home, pricing, SEO" but not the about page.
  - A repeat test confirmed it: type, press Escape, and the words are gone. Click elsewhere
    instead, and they are kept (`$SHOTS/j2-escape-before.png`, `$SHOTS/j2-escape-after.png`;
    notes `j2-escape kept:false`, `j2-clickaway kept:true`).
  - The only way to finish is Ctrl/Cmd+Enter, and nothing on screen says so.
- *Why it is a problem.* Most people press Escape or Enter to say "done". Here the first discards
  the work silently and the second corrupts the text's line structure. This is data loss.
- *Fix.*
  1. Make Escape *finish* the edit. Ctrl+Z (one history, P1-5) is the way back.
  2. Or, if Escape must cancel, show a toast "Change discarded · Undo".
  3. While a field is live, show a small hint chip at the caret: "Enter = new line ·
     Ctrl+Enter = done · Esc = done". For one-line fields: "Enter = done".
  4. Add a visible **Done** button in the Content chip.

**P0-3. Without a connected folder, "Save" downloads JavaScript files and the site does not
change, and "Connect project folder" is buried in the account menu** (Journeys 1 and 5)

- *What the user sees.* On first open nothing says a folder is needed. When I edited the intro
  and pressed Save, the status said `Saved 1 item (downloaded): Page "home".`: the browser had
  downloaded `home.js` (`$SHOTS/j5-save-unconnected.png`). "Connect project folder" sits inside
  the person icon at the far right, with no sentence saying why it is needed
  (`$SHOTS/j1-account-menu.png`). Versions says "Connect the project folder to keep version
  history" but has no button for it (`$SHOTS/j1-versions.png`). Connecting succeeded with one
  line: "Saving writes straight into defxn-copy/js/content."
- *Why it is a problem.* A non-technical owner believes they saved their site. They now have a
  stray `.js` file in Downloads and an unchanged site.
- *Fix.*
  1. Show a first-run setup card (Ark EmptyState / onboarding checklist) over the canvas:
     **1 Connect your site folder** (one sentence on why) · **2 Click any text to change it** ·
     **3 Save, then Publish**.
  2. Until a folder is connected, label the Save button "Download changes" and keep a slim Ark
     Alert banner: "Not connected: changes download as files. [Connect folder]".
  3. Put a Connect button inside Versions' empty state.

**P0-4. Publish is disabled with no visible reason, and the publish status says "undefined"**
(Journey 5: publish when no miner is running)

- *What the user sees.* Publish is a teal button with only a faint disabled tint. Its reason
  lives only in a tooltip: "Cannot publish: the miner is not reachable (no answer). Start the
  miner or check its address, then Refresh." The Mesh sheet opens with the header
  **"undefined — P2P deployment"** and "Reachable: No —". It then shows a long security essay
  about AES-GCM, nacl box and `js/admin/auth.js`. It never says how to start the miner.
  `$SHOTS/j1-mesh.png`, `$SHOTS/j5-publish-hover.png`.
- *Why it is a problem.* The user cannot finish the last step. "Miner", "mesh" and
  "publish host" are three words for one dependency.
- *Fix.*
  1. Keep Publish clickable. It opens an Ark Sheet "Publish your site" with a checklist:
     - ✓ All changes saved
     - ✗ Signed in → [Sign in]
     - ✗ Publishing service running → one line on how to start it (name the app the owner
       double-clicks, e.g. "Flux Chain Admin.command") + [Check again]
  2. Fix the bug: `js/admin/mesh.js:77` concatenates `info.name` when it is undefined.
  3. Move the security essay into a "How publishing keeps things private" disclosure.

### P1: major friction

**P1-1. The header carries the whole product at once** (Journey 1, every screen)

- 23 controls, 16 of them icon-only, in six groups:
  - page: sidebar, picker, fields, SEO
  - views: Canvas, Sitemap, Theme, Background
  - lens: Content, Design
  - canvas tools: 3 breakpoints, undo, redo, Design check, Edit, Live
  - history and status: Versions, Mesh
  - actions and account: Save, Publish, account
- A content editor sees designer tools: breakpoints, layout-only undo, Design check, Edit/Live.
- Unselected views shrink to bare glyphs (a node graph, a palette, a sparkle).
- When a status message appears, it is inserted between the groups and every group to its left
  jumps.

`$SHOTS/j1-editor-first-open.png`. *Fix:* the information architecture in section (b). The
header drops to about 9 controls, all labelled or with obvious icons. Lens-specific tools appear
only in their lens.

**P1-2. Jargon and internal identifiers reach the user on almost every surface** (all journeys)

| Seen in the UI | Where | Plain-language replacement |
|---|---|---|
| Site chrome, Theory pages, Other pages | rail | "Header & footer", "Guides", "More pages" |
| Content / Design **lens** | header title | "Edit words" / "Edit style" |
| Mesh, miner, Publish host | header, sheet, account | "Publishing" (one word) |
| Vault, encrypted item | rail | "Private content" |
| `HOME.TITLE`, `NAV.OVERVIEW`, `js/content/manifests/home.js` | Content popover, Page fields | hide under "Developer details" |
| `page:/section:1/div:1/p:2`, "Reset this breakpoint" | Frame popover | hide; "Reset for this screen size" |
| `spot-mveixci6q6trc`, "state-zero selection" | Component / States popovers | "Made from your selection"; "the first state" |
| `F_SCENE_RZERO_V0 (js/scene.flux.js) … route:<page>, doc:<path>` | nav link refusal (`$SHOTS/j2-nav-click.png`) | "This link's destination is fixed by the site template and can't be changed here. [Developer details]" |
| `18 7.5% 3.6%` (HSL) | Theme colours | a swatch + hex; HSL under Advanced |
| "(lattice / atmosphere / brand-mesh)", "every other Studio edit" (Studio no longer exists), `--` | Background popover | rewrite |
| `components: +spots, +masters.m…`, "Addresses", "Import .flx" | Versions | "Changed: Home page layout, 1 new component" |
| "Structured data type: Derive from the route", "Canonical URL" | page SEO | under "Advanced" in Search & sharing |
| "Design check 7 of 13 measured rules" | header badge | "Design tips" (Design lens only) |
| "69 routes / no undo" | footer status bar | remove, or "69 pages" |

*Fix:* one copy pass driven by a derived glossary (the role key already names the field, and the
manifest label is the human name). Every key and path moves into one "Developer details"
disclosure per surface, so nothing is lost.

**P1-3. One page has three different names** (Journeys 2 and 3)

- /about is "About: everyone is our business partner" in the picker, "DEFXN overview" in the rail
  and "Resolutions for the mesh." as the H1 on the canvas.
- Home is "Not one chain. A world of them." in the picker and "Home" in the rail.
- `$SHOTS/j1-page-picker.png`, `$SHOTS/j2-para-after-enter.png`.

*Fix:* one display name everywhere (the manifest title the rail uses), with the path as grey
secondary text. Put the H1 text in the row's tooltip if it helps.

**P1-4. Two page lists, neither searchable, and "add" sits at the bottom of 70 rows**
(Journeys 1 and 3)

- The header picker lists 69 routes. The rail tree lists the same 69 again in four groups.
- The "Other pages" group shows raw lowercase slugs: "community, content, data, deployments…".
- "New theory page" and "New article" are `<details>` toggles after the last row.
- "New theory page" always creates `/concept/<name>`. A plain "page" is not offered, and the
  restriction is never explained.
- A name with a space is refused with "A page name is lowercase letters and digits, starting with
  a letter.": the user is asked for a slug instead of a title.
- `$SHOTS/j1-page-picker.png`, `$SHOTS/j3-newpage-form.png`, `$SHOTS/j3-newpage-bad-name.png`.

*Fix:* turn the picker into an Ark Command surface (search + recent pages). In the rail, collapse
the groups by default and put a sticky **+ New** at the top. It opens an Ark Dialog: "What are
you adding? ○ Guide page ○ Article", a Title field, and the address derived and shown
("/concept/pricing").

**P1-5. Undo means different things in different places** (Journey 4: undo)

- The header undo/redo cover only layout and style. Their tooltip says "Nothing to undo: no
  layout or style edit on the canvas yet." Text edits undo only with Ctrl+Z inside the canvas.
- The footer status bar says "no undo" while the header undo is enabled, and the reverse
  (`$SHOTS/j4-spacing-changed.png`).
- Create, delete and theme changes have no undo at all.

*Fix:* one history stack across text, style, structure and settings, behind the same two header
buttons and Ctrl+Z. Remove the footer's duplicate indicator.

**P1-6. In the Content lens, two editors open on the same words at once and cover them**
(Journey 2)

- Clicking the H1 makes it editable in place *and* auto-opens a "Content" popover with a second
  textarea holding the same text, the copy key and the file path.
- On desktop the popover covers the nav; on a phone it covers the heading being edited.
- `$SHOTS/j2-headline-click.png`, `$SHOTS/j6-phone-tap-headline.png`.

*Fix:* in the Content lens show only a slim chip above the text: field name ("Heading"),
**Done**, and "All fields of this page". The textarea popover opens only when the text cannot
be edited in place (e.g. a value with hidden characters).

**P1-7. The selection toolbar is icon-only, and its actions do not fit the lens**
(Journeys 2 and 4)

- 8–10 bare icons: T, a drop, a square, a cross-arrow, a play triangle, a wand, a page, a
  palette.
- Content lens shows "Make into component" (a design action), "Open in Content" (already in
  Content) and "Theme & defaults".
- `$SHOTS/j4-select-para.png`, `$SHOTS/j2-headline-click.png`.

*Fix:*
- Use Ark Tooltip on every icon, with keyboard and focus support. Hover-only labels exist today.
- Show text labels for the 3 most-used sections (Text, Colour, Spacing).
- Put the rest behind **More ▾**.
- Lens-aware actions: the Content lens shows Done · All fields; the Design lens shows Make
  component · Make states · More.

**P1-8. Main features are reachable only by right-click** (Journey 4: make states)

- Make into states, Group, Ungroup, Remove, the 6 Align and 2 Distribute actions, Enter
  illustration and "Edit canvas" exist only in the canvas context menu (`js/main.js:996-1023`).
- With one layer selected, the menu shows 13 items, 8 of them disabled, and is clipped at the
  bottom of the canvas.
- "Edit canvas" opens the page-transition popover, which does not match its name.
- The menu is styled with hard-coded colours and `system-ui` (`js/main.js:797`), not SDK tokens.
- `$SHOTS/j4-context-menu.png`.

*Fix:* put the same commands behind the toolbar's **More ▾** (an Ark Menu, with the right-click
menu kept as a shortcut to the same menu). Hide commands that cannot apply instead of listing
eight disabled ones. Put Align and Distribute in a submenu that appears only with 2+ layers.
Rename "Edit canvas" to "Page transition…".

**P1-9. "Background" names two different features** (Journey 4)

- The header's ✦ **Background** button edits the *page transition* (fade between pages).
- The Theme view's **Background** section edits the *backdrop layer* (Contours, Fabric, Rift…).
- The context menu's "Edit canvas" opens the first.
- `$SHOTS/j1-background.png`, `$SHOTS/j1-theme-view-scrolled.png`.

*Fix:* rename the first to "Page transition" and move it into Site style → Motion, next to the
per-element in/out animation. Keep "Background" for the backdrop.

**P1-10. The Design check score sits in the header in alarm colours on every page, in both
lenses** (Journey 1)

- A pink "7/13" (8/13 on /about) is the most saturated thing in the header.
- It opens a long rule list ("No ghost buttons", "60-30-10 color balance"…).
- `$SHOTS/j1-design-check.png`.

*Fix:* show it only in the Design lens, as a neutral "Design tips (6)" Ark Badge that opens the
same list. Use warning tone only for a regression the user just caused.

**P1-11. Media: the panel overflows the rail, and an image cannot be changed where it appears**
(Journey 3: change an image)

- The image detail is wider than the rail: Revert is cut to "R", the card and the Add button are
  clipped.
- File inputs are unstyled native "Choose File · No file chosen".
- The file path `js/content/assets/iceberg-blocks.js` is shown.
- Home has no image, so the only route is knowing that "Media" lists images. Clicking an image on
  the canvas has no "Replace image" action.
- `$SHOTS/j3-media-new.png`, `$SHOTS/j1-rail-media.png`.

*Fix:*
- Media opens as an Ark Sheet or grid dialog (Ark Attachment / dropzone).
- Selecting an `<img>` on the canvas in either lens offers **Replace image** and **Alt text**.
- The Grid/List switch becomes the shared segmented control.

**P1-12. Overlays stack and do not dismiss together** (Journeys 1, 2 and 5)

- The account menu stayed open over the canvas while the Content popover was also open
  (`$SHOTS/j2-headline-click.png`). It closes on `pointerdown` in the editor document only
  (`js/admin/project.js:70`), and clicks in the canvas iframe never reach it.
- Versions is a separate docked panel that sits over the canvas *and* leaves the selection
  toolbar floating over it (`$SHOTS/j5-versions-list.png`).
- Toasts appear over the canvas content (`$SHOTS/j4-made-component.png`).

*Fix:* one Ark DismissableLayer stack. Opening any overlay closes the others at its level, and a
canvas pointerdown (relayed by the bridge) closes them all. Versions, Page fields, Publish and
Media share one Ark Sheet slot.

**P1-13. On a phone, the editor is a desktop tool squeezed down** (Journey 6)

- The header has 3 rows of 23 controls, all below 44 px (`$SHOTS/j6-phone-first-open.png`).
- The editor opens on the Phone breakpoint, so every style edit becomes a "Phone override". The
  only sign is a yellow ⚠ icon whose text is hidden below 1600 px (`css/admin.css:133`).
- The selection toolbar wraps to two rows, and the Typography popover covers the element being
  styled (`$SHOTS/j6-phone-design-popover.png`).

*Fix:*
- Phone = word editing first. Use a bottom action bar (Pages · Edit · Save · Publish) and an Ark
  Drawer for every panel.
- Design-lens popovers become bottom sheets.
- The breakpoint note always shows its words ("Phone-only change").
- Touch targets ≥ 44 px.

**P1-14. Page fields shows everything, including dead fields** (Journeys 2 and 3)

- About 60 fields on Home.
- Each has a copy key on the right (`HOME.PROMISE`) and the sheet shows the file path.
- Labels speak in implementation terms ("Label on the ring pill", "Learn pill", "Pressure-test
  pill").
- Legacy fields are shown: "Secondary button (unused on the current hero; kept for admin
  history)".
- There are Shape and **Code** tabs.
- `$SHOTS/j1-page-fields-home.png`.

*Fix:*
- Group by what is on screen (Hero, Status, Links), each group an Ark Accordion, the first open.
- Each group gets "Show on page" to scroll the canvas to it.
- Hide unused fields under "Unused fields (3)".
- Keys and paths go under Developer details.
- Rename the tabs: Text · Search & sharing · Shapes · Advanced.

**P1-15. Versions reads like a commit log** (Journey 5: versions, restore)

- Entries show raw diffs, "SAVE/CHECKPOINT" pills, and Preview/Restore/Export .flx/Addresses on
  every row.
- No row is marked "Current". Restoring the newest version is offered and runs.
- After Restore, the status is cut to "Loaded …" in the header.
- `$SHOTS/j5-versions-list.png`, `$SHOTS/j5-versions-restored.png`.

*Fix:*
- Each row reads as a human summary: "Today 3:36 · Home page text, 1 new component". Mark the
  current one "Current".
- Restore uses an Ark AlertDialog that says what will change, then a toast "Restored as unsaved
  changes · Save to keep".
- Export, Import and Addresses go under the row's ⋯ menu.

**P1-16. Feedback goes to four places, and the important one is cut off** (all journeys)

The editor reports through four channels:
- the header `#status`, often cut to 10 characters ("/concep…", "Loaded …", "New page. Edit it,
  th…")
- the `#toast`
- the footer status bar ("69 routes / no undo")
- small dots in the rail

`$SHOTS/j3-newpage-created.png`, `$SHOTS/j5-versions-restored.png`.

*Fix:* one Ark ToastRegion for events (saved, restored, discarded, refused). Use one Ark Alert
banner for persistent conditions (not connected, cannot publish). The header keeps only the
save-state text ("All changes saved" / "3 unsaved changes").

**P1-17. Theme view is one long scroll of everything site-wide** (Journey 4: colour, font)

- One column holds: theme core colours as HSL triplets, the Background picker, settings-gear
  defaults, site-wide SEO, mesh tuning, and page shapes.
- Its subtitle lists three file names.
- `$SHOTS/j1-theme-view.png`, `$SHOTS/j1-theme-view-scrolled.png`.

*Fix:* rename it "Site style", with Ark Tabs: Colours · Fonts · Background · Motion (includes
Page transition) · Search defaults · Advanced (shapes, mesh tuning, raw values).

### P2: polish

- **P2-1. The gate.**
  - The heading is "Locked." The credential has three names: "DeadArk identity", "recovery file
    (.auth.flx)" and "Auth Kit".
  - There is no "I don't have one yet" path.
  - The brand is "Flux Protocol ADMIN" while the hidden panel heading says "Sign in to DEFXN
    CMS".
  - `$SHOTS/j1-gate-desktop.png`, `$SHOTS/j1-gate-phone.png`.
  - *Fix:* heading "Sign in to edit DEFXN"; one name ("your sign-in file (.auth.flx)"); a
    secondary link "Don't have one? How to get a sign-in file"; one brand.
- **P2-2. Three primary-button languages.**
  - Filled teal: Publish, `css/admin.css:164`.
  - Bright cyan filled, inside `#studioRoot`: Create block `js/admin/library.js:162`, + Add state
    `js/admin/toolbar-sections.js:318`, Preview this transition `js/admin/header.js:129`.
  - Text + circular icon: the gate, `css/admin.css:500`.
  - `.btn` is also restyled under `#studioRoot` (`css/studio-embed.css:29,50`), so one class
    looks different in the header and in the rail.
  - *Fix:* one Ark Button with variants.
- **P2-3. Sitemap alarms.**
  - "53 unlinked" in yellow, and a yellow "Nothing links here" chip on most cards.
  - The canvas tools vanish from the header when this view opens.
  - `$SHOTS/j1-sitemap.png`.
  - *Fix:* neutral "Not linked from other pages" as a filter, not a warning on every card. Keep
    the header stable.
- **P2-4. Layers.**
  - Shows implementation names (Ark layer, Ark background host) and tags (DIV/CANVAS/SPAN).
  - Background layers come first.
  - The selected element is not scrolled into view: it sits at the bottom edge.
  - `$SHOTS/j4-select-para.png`.
  - *Fix:* collapse the background group by default; hide tags under a toggle; scroll the
    selection into view.
- **P2-5. Library.**
  - The block form uses raw prop names as labels (heading, body, align, size).
  - It has unrelated buttons ("Open in Content", "Theme & defaults").
  - Text touches the rail edge, and the empty state takes two paragraphs.
  - `$SHOTS/j1-rail-lib.png`.
- **P2-6. Row indicators lack a legend.** The tiny yellow ring means "orphan"
  (`js/admin/rail.js:155`) and the orange dot means "unsaved" (`rail.js:156`); the meaning is in
  a tooltip only. *Fix:* Ark Badge with text on hover and focus, and a one-line legend under the
  group head.
- **P2-7. Keyboard.**
  - Every Pages row has two tab stops (open + Fields), so passing the rail takes ~140 Tabs.
  - The rail has no roving tabindex and the editor has no skip link to the canvas.
  - Toolbar labels appear on hover only.
  - The rail tabs support ←/→ (`js/admin/rail.js:230`), but `role="tab"` buttons sit next to
    `.ark-tab` buttons used as toggles (`admin-app.html:45-57`), which mixes semantics.
- **P2-8. Typography popover.**
  - Size reads "Hero" for a body paragraph: it shows the first option, not the inherited value.
  - Spacing labels mix "padding" (lowercase, no unit) with "Margin ↑", and no field has px units.
  - Truncated labels: "Fade out (…", "Fade in (m…", "Default sta…".
  - `$SHOTS/j4-sec-Typography.png`, `$SHOTS/j4-spacing-changed.png`, `$SHOTS/j1-background.png`,
    `$SHOTS/j4-made-states.png`.
- **P2-9. Account menu.** It mixes identity, folder setup, publish-host diagnostics, a shortcut
  cheat-sheet and "Sign out identity". The publish-host status belongs to Publish; the shortcuts
  belong in a "?" keyboard dialog.
- **P2-10. Page SEO popover.**
  - The Description textarea is monospace while Title is sans.
  - "Site-wide SEO and AI crawlers" jumps to another view.
  - There is no Done or Close.
  - `$SHOTS/j1-page-seo.png`.
- **P2-11. Delete uses the native `confirm()` dialog** (seen: *Delete "New note"? This removes
  its file …*). *Fix:* Ark AlertDialog, matching the rest of the UI, with the item's real name.

---

## (b) Information-architecture proposal for the editor

Principle: three tiers. **Primary** is always visible and labelled. **Secondary** is one click
away, grouped by the noun it affects. **Advanced** sits behind an explicit "Advanced" or
"Developer details" disclosure. Every feature keeps a home, and the right-click menu stays as a
shortcut.

### Header: from 23 controls to about 9

```
[ARK] DEFXN ▸ [Home ▾ (search)]   [ Edit words | Edit style ]   [⟲][⟳]   [▶ Preview]   All changes saved  [Save]  [Publish ▾]  (●)
```

| Today | Proposed home | Tier |
|---|---|---|
| `#btnPage` picker | Header page switcher = Ark Command (search, recent, groups) | Primary |
| Lens Content / Design | "Edit words" / "Edit style" segmented control | Primary |
| Undo / Redo (layout only) | Header, ONE history stack | Primary |
| Edit / Live `#mode` | "Preview" toggle (▶), which hides all chrome | Primary |
| Save, Publish | Header. Save shows the state; Publish ▾ opens the Publish sheet (checklist, status, history of publishes) | Primary |
| `#btnLeftRail` | Stays; on a phone it is the bottom bar's "Pages" | Primary |
| `#btnPageFields`, `#btnPageSeo` | One "Page settings" button → Sheet with tabs Text · Search & sharing · Shapes · Advanced | Secondary |
| Breakpoints `#devices` | Shown only in "Edit style" and Preview | Secondary (lens) |
| Design check `#btnCheck` | "Design tips" badge, only in "Edit style" | Secondary (lens) |
| Views: Canvas / Sitemap / Theme | Sitemap → a "Map" toggle at the top of the Pages panel. Theme → "Site style" (rail entry in Edit style; ⋯ menu in Edit words) | Secondary |
| `#backgroundBtn` (page transition) | Site style → Motion → Page transition | Secondary |
| `#versionsNav` | Save ▾ → "History…" (Sheet) | Secondary |
| `#meshNav`, publish host status | Inside the Publish sheet | Secondary |
| Account menu | Avatar: who · project folder (status + Change) · Keyboard shortcuts · Sign out | Secondary |
| Footer status bar | Removed; its facts move to the save state and the Pages panel count | – |

### Rail (left)

- **Edit words lens:** **Pages** (search; groups Main pages · Guides · Articles · Header &
  footer · More pages, the last collapsed; sticky **+ New**) and **Media**. Under **More ▾**:
  Private content (today's Vault).
- **Edit style lens:** **Layers** (background group collapsed, tags hidden by default, selection
  auto-scrolled), **Components** (today's Library), **Site style** (today's Theme view, tabbed as
  in P1-17), plus Pages.

### Canvas selection toolbar

- **Edit words:** chip [Field name · Done · All fields of this page]. A refusal ("this text comes
  from the site template") shows as one plain sentence, with Developer details below it.
- **Edit style:** [Text] [Colour] [Spacing] labelled. Then ⋯ More: Size & position (Frame),
  Layout, Effects, Motion, Alt text, Make component, Make states, Group/Ungroup, Align ▸,
  Distribute ▸, Remove. Only applicable items are shown.
- **Advanced** (inside each popover's footer disclosure): X/Y/rotation/scale, layout key,
  "Reset for this screen size", state triggers, component definition id.

### Onboarding and empty states (new, no feature removed)

1. **First-run checklist** over the canvas until done: Connect your site folder → Click any text
   to change it → Save → Publish. Each step has one sentence and one button. It can be dismissed
   and reopened from the avatar menu.
2. **New page / article empty state** (P0-1).
3. **Not connected** banner (P0-3); **Cannot publish** checklist (P0-4).
4. **Media empty**: dropzone "Drop an image here or Browse".
5. **Components empty**: "Select something on the page and choose More → Make component".
6. **Inline-edit hint chip** (P0-2).

### What moves behind "Advanced" or "Developer details"

Copy keys, file paths and layout keys; the Code tab; Frame numbers; Structured data type,
canonical URL and per-bot crawler policy; HSL values; mesh tuning and page shapes; Import/Export
.flx and Addresses; Align and Distribute; per-element in/out animation details; Design check rule
internals.

---

## (c) UI patterns that should become shared Ark UI components

Ark UI already ships most of these (`design/ark-ui/PRIMITIVES.md`, `design/ark-primitives/src/`,
`design/ark-elements/src/elements.js`: `flux-button`, `flux-tabs`, `flux-popover`, `flux-sheet`,
`flux-drawer`, `flux-menu`, `flux-select`, `flux-combobox`, `flux-command`, `flux-dialog`).
defxn already vendors one Ark element bundle, `js/admin/vendor/flux-elements.js`, which today
defines only `flux-authorization-dialog`.

Per AGENTS.md, the port goes through the SDK CLI (`deadark-theme sync-consumer`), never hand
copies. A pattern Ark lacks gets added to Ark first. The local `js/admin/primitives.js` (`tabs`,
`disclosure`) is the existing compatibility shim to retire.

I found no `deadark-ui-lab` checkout on this disk. The Ark reference implementations live at
`design/ark-ui`, `design/ark-primitives` and `design/ark-elements`.

| Pattern | Ark component | Duplicated today (file:line) |
|---|---|---|
| **Button** (default / primary / quiet / danger / small) | `flux-button`, `createArkButtonGroup` | `.btn` `css/admin.css:159-166`; restyled `css/studio-embed.css:29,50-51`; gate's text+circle primary `css/admin.css:500-510`; `css/authorization-dialog.css:56-60`; cyan in-panel primaries `js/admin/library.js:162`, `js/admin/toolbar-sections.js:318`, `js/admin/header.js:129` |
| **Icon button + tooltip** | `flux-button` icon variant + `createArkTooltip` | `.ibtn` `css/admin.css:97-126`; `.tb-btn` `css/studio-embed.css:216-233`; rail row actions `btn icon quiet row-act` `js/admin/rail.js:158-166`; `#appBar .seg button` `css/admin.css:118-120`; bare `title=` tooltips throughout `admin-app.html:36-97` |
| **Segmented control / toggle group** | `createArkToggleGroup` | `#devices`/`#mode` `.seg` `admin-app.html:61,69` + `css/admin.css:116-120`; `.mode-switch`/`.sub-switch`/`.lens-switch` using `.ark-tab` as toggles `admin-app.html:45-57` + `css/admin.css:177-190`; `ctlSegField` `js/admin/controls.js:126` (+ `css/studio-embed.css:285`); Media Grid/List `js/admin/assets.js:80`; SEO Yes/No `js/admin/seo.js:128,137` |
| **Tabs** | `flux-tabs`, `createArkTabs` | local shim `js/admin/primitives.js:8-75` (Page fields); rail tabs `admin-app.html:182-186` + keys `js/admin/rail.js:230`; `.ark-tab` styles `css/admin.css:262-268` |
| **Popover** | `flux-popover`, `createArkPopover` | header popovers `openPop`/`closePop` `js/admin/header.js:34-35` (`.pop` `css/studio-embed.css:310-318`); toolbar popover `#selToolbarPop` `js/admin/toolbar.js:182` (`.tb-pop` `css/studio-embed.css:203-238`); account menu `js/admin/project.js:66-71` (`css/admin.css:142-150`) |
| **Menu / context menu** | `flux-menu`, `createArkContextMenu`, `createArkMenu` | canvas right-click menu built by hand with hard-coded colours `js/main.js:797,996-1023`; account menu (above) |
| **Sheet / drawer** | `flux-sheet`, `flux-drawer`, `createArkSheet` | `#sheet` `js/admin/panels.js:85-116` (`css/studio-embed.css:148-168`); `#versionsPanel` `js/admin/versions-panel.js:52` (`css/admin.css:565-570`); Theme dock `admin-app.html:249`; rail drawer + `#railScrim` on phones |
| **Dialog / alert dialog** | `flux-dialog`, `createArkAlertDialog` | native `confirm()` for deletes (`deleteItem`, seen in the j3 run); auth close `js/admin/mesh.js:171` |
| **Close button** (one glyph, one size) | part of Sheet/Popover | `#sheetClose` svg `admin-app.html:265`; `.tb-pop-x` `js/admin/toolbar.js:182`; text `×` `js/admin/versions-panel.js:52`; text `×` `js/admin/mesh.js:171` |
| **Command / searchable picker** | `flux-command`, `createArkCommandSurface` | page picker `#btnPage` (no search), the Pages tree (`js/admin/rail.js:140-200`), Sitemap "Open" buttons (`js/admin/sitemap.js`) |
| **Field row** (label · control · hint · error · Developer-details slot) | `createArkForm` / `field-form` | `ctlField` / `ctlSelectField` / `ctlSwatchField` `js/admin/controls.js:90,139,150`; hand-built rows in the Library block form `js/admin/library.js:150-170`; Theme colour rows `js/admin/design.js:109+`; Versions label input `js/admin/versions-panel.js:50` |
| **List / tree row** (icon · name · secondary · badges · row actions) | `createArkCollection` / `createArkSidebar` | Pages tree `js/admin/rail.js:146-169` (`.tree-row` `css/studio-embed.css:117-131`); Layers `#layers` (`.list` `css/studio-embed.css:85-99`); Media list; Vault list; Sitemap cards |
| **Disclosure / accordion** | `createArkDisclosure`, `createArkAccordion` | `js/admin/primitives.js:76-107`; `<details class="add-toggle">` `admin-app.html:193,203` (+ `css/admin.css:194-201`, `css/studio-embed.css:132-135`); `#mesh` details in the account menu; Versions "Addresses" `js/admin/versions-panel.js:97` |
| **Toast / status** | `createArkToastRegion` + `createArkAlert` (banner) | `status()` `js/admin/core.js:65` → header `#status` `admin-app.html:75`; `toast()` `js/admin/core.js:84` → `#toast` `admin-app.html:271` (`css/studio-embed.css:345`); footer `#studioStatus` `admin-app.html:255`; `#bpNote` `js/admin/header.js:91` |
| **Empty state** | Ark EmptyState (add to Ark if missing; `components.md` covers it) | `.hint` paragraphs standing in for empty states: `js/admin/library.js:67-77`, `js/admin/assets.js:87`, `js/admin/secrets.js:133`, `js/admin/mesh.js:90`, Versions "connect the folder" text, blank canvas for new pages (P0-1) |
| **Badge / status dot** | Badge style-schema role (`M-BADGE`, `X-WARNING`…) | orphan tag `js/admin/rail.js:155` + dirty `.dot` `rail.js:156` (`css/admin.css:191`); Design check `#scoreBadge` `admin-app.html:68`; Versions SAVE/CHECKPOINT pills; Sitemap "Nothing links here" |
| **File input / dropzone** | `createArkAttachment` | native file inputs in Media ("Choose File · No file chosen") `js/admin/assets.js`; Versions Import `.flx` `js/admin/versions-panel.js:54` |
| **Select** | `flux-select` / `createArkSelect` | native `<select>` in Theme ("Editing theme"), Typography Size, SEO structured data, States default |
| **DOM builder `h()`** (not a component, but the same code twice) | `ark-ui` runtime / one shared helper | `js/admin/gate.js:66` and `js/admin/core.js:36` |

Recommended order (fewest components that fix the most issues):

1. **Toast + Alert banner** → P0-3, P0-4, P1-16.
2. **Sheet + Dialog/AlertDialog** → P0-1, P0-4, P1-12, P1-15, P2-11.
3. **Button + IconButton/Tooltip + ToggleGroup** → P1-1, P1-7, P2-2.
4. **Command (page switcher) + Collection rows** → P1-3, P1-4, P2-6.
5. **Menu** (toolbar More ▾ = the right-click menu) → P1-8.
6. **Field row + Accordion** for Page fields → P1-14.

---

## What already works (keep it)

- **Editing on the real page.** The canvas is the live site (`index.html?cms-preview=1`), and
  clicking a word to change it is the right core interaction. Most of this audit is about the
  frame around it.
- **Honest refusals.** Untouchable text says *why* (P1-2 only asks for plainer words and for the
  file names to move under Developer details).
- **Save covers everything.** One Save covers every draft and reports exactly what it wrote
  ("Saved 4 items …"), and each Save records a version.
- **Shared field helpers exist.** `ctlSegField`, `ctlField` and `ctlSelectField` in
  `js/admin/controls.js` are the right idea; they just need to become Ark components.
- **Phone layout stays inside the screen.** The editor does not scroll horizontally at 390 px
  (`scrollWidth` = 390).
