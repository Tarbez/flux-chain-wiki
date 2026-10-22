# Home page redesign: brief for the new session (2026-10-22)

The owner wants a full redesign of the DEFXN home page (route `/`, page id `zero`). This brief tells you
what exists, what the fast way to build is, and what you must not break. Read it before you write code.

## 1. The "dense pattern" in the CMS no longer exists

The CMS once had its own dense typed-array canvas: a second page engine that was never connected to the
real site. It was deleted on 2026-10-17 (see the "STEP 1 CLEANUP" note at `js/admin/bridge.js:35`).
Its dense "Versions" export was deleted with it. Do not look for it, and do not rebuild it.

Today there is one engine, called "pages as data". Read `docs/cms-architecture.md`, section "Pages as data".

## 2. How a page is built now

- **The page:** `js/pages/home.js` returns a list of Ark UI blocks: hero, card-grid, tabs, choice,
  figure, facts, actions and others. It is not hand-built DOM.
- **The words:** the copy lives in the CMS fields at `js/content/manifests/home.js`. The page reads
  them by key. Every word an editor can change must be a field there, never a literal in `home.js`.
- **The CMS** (`admin-app.html` + `js/admin/*`) edits the real page in a preview frame:
  - Content: field values, through the Page fields form or a click on the canvas.
  - Library: insert any Ark block as a saved instance.
  - "Make into component": turn a selection into a reusable component.
  - Contextual toolbar: per-breakpoint layout and style edits (Typography, Fill, Spacing, Frame), which
    are stored per layout key.
  - States and element motion.
- **Loading:** the scripts of route `zero` are listed at `js/pages/catalog.js:103`
  (`home-flow.js`, `pulse-client.js`, `home.js`, the glossary and the evidence registry).

## 3. The fast way to build (recommended)

1. Write the new page as an Ark block spec in `js/pages/home.js`, and put every word in
   `js/content/manifests/home.js`. Code is the fastest way to lay out a whole new page.
2. Use only blocks that already exist in Ark (`ArkKit.ARK_BLOCK_NAMES`). If the design needs a part that
   Ark lacks, add it to Ark first (`design/ark-ui`, then sync through the SDK CLI). Do not hand-build it
   in the page.
3. After that, the owner polishes in the CMS: words, spacing, order, images. No code is needed for that.

The other option is to compose the page from Library blocks in the CMS. That works for small changes.
For a full redesign it is slow, and the result is saved layout data, not source code.

## 4. What you must not break

- **Saved edits (layout continuity):** the CMS stores edits by layout key (for example `button#11`).
  A redesign changes keys. For every old key, pin it with `was`, or list it as reshaped, retired or
  reworded, with a reason, in `tests/home-blocks.cjs`. Read `tests/lib/layout-continuity.cjs` first.
  Never let an old key silently match a new element.
- **Server render:** the home page is pre-rendered on the server (`tests/home-ssr.cjs`). Keep the spec
  free of browser-only calls at build time.
- **Motion:** the home page is the only page with motion (owner decision). Every animation must settle.
  No idle animation-frame loop (`tests/browser/idle-frames.mjs`, `tests/home-animation-performance.cjs`).
- **Fold budget:** the page is at most 1.6x the viewport height at 1440x900 and at 390x844.
- **Owner laws:** `docs/PRODUCT-DESIGN-LAWS.md` (one dominant action, one idea per section) and
  `docs/COPY-LAWS.md`. Run `cd /Volumes/PortableSSD && npm run -s copy:check -- <files>` on new words.
- **Theme and rebrand:** the whole site is about to be rebranded. Pages use only the SDK's semantic
  tokens, written as `hsl(var(--token))`. A new brand changes the tokens' values in the SDK
  (`@deadark/sdk/theme`, synced with `deadark-theme sync-consumer .`), never in the page. Ask the owner
  for the new brand's colours, fonts and mark before you build. Do not invent them.
- **Built files:** `npm run build:pages` rewrites `js/min/*` and `index.html`. `index.html` holds another
  session's uncommitted FXN ID edits (a CSP comment and meta tag, and the tab-icon link). Never commit
  them, and never overwrite them. The merge routine is in `docs/ux-audit/plan.md`, Resume points 14 and 15.
- **Other sessions' files:** do not touch `account.js`, `css/account.css`, `admin.css`, `admin.html`,
  `js/admin/auth.js` or `assets/kit/*`.

## 5. Work in progress elsewhere

- **Home link label:** a paused helper (branch `worktree-agent-a1cb61ce8299a9d31`) was told to change
  one link label in `js/pages/home.js` ("Follow the line" now reads "Deploy a resolver"). The
  coordinating session tells that helper to leave `home.js` alone. Put that label in your new page.
- **Tests:** in the coordinating session, the owner said they will run the tests themselves. Ask the
  owner whether that also applies to your session.

## 6. Home tests to know about

`tests/home-blocks.cjs`, `home-ssr.cjs`, `home-hero-scene.cjs`, `home-launch.cjs`, `home-mobile-layout.cjs`,
`home-color-semantics.cjs`, `home-animation-performance.cjs`, `kit-home-shell.cjs`, `routes-live.cjs`,
`header-row-fit.cjs`, and in `tests/browser`: `idle-frames.mjs`, `fold-contrast-sweep.mjs`, `site-fixes.mjs`.
Run tests one at a time. Before each run:
`while pgrep -fq "^(/[^ ]*/)?node (tests/|scripts/run-)"; do sleep 5; done`.
