# UX ledger recheck, 2026-10-21 (main 8e40c2c)

Read-only recheck of every ledger row that was OPEN, PARTIAL or UNVERIFIED at Wave 4, by three read-only agents (opus), one per ledger part, citing HEAD file:line. No test, browser or build was run for it. Statuses: FIXED, STILL OPEN, OWNER, NEEDS-BROWSER. Counts: 116 FIXED, 172 STILL OPEN, 37 OWNER, 34 NEEDS-BROWSER. Each part ends with its "Top fixes".

===== cms-pages =====
CMS, pages and pages-crawl rows of docs/ux-audit/ledger.md (lines 30-228), checked against HEAD 8e40c2c. This was read-only. I read the code and the tests but ran no tests, browser or build. Where a citation says a test "passes", that comes from plan.md Resume points 5 and 7, which say every browser driver passed when run alone.

**cms.md**
- P0-1 New page/article not on canvas | PARTIAL -> FIXED | js/admin/bridge.js:104-121 (banner with Save now + Open its Page fields); tests/browser/cms-journeys.mjs:192 (canvas reaches /learnings/hello-world; passes per Resume 5 and 7) | Left (cosmetic): a banner, not an EmptyState card.
- P1-2 Jargon on every surface | PARTIAL -> STILL OPEN | Mesh fixed: js/admin/mesh.js:64-72,103-112 (CID and Owner key now under Developer details). Colours fixed: js/admin/design.js:176-178 (hex swatch, HSL under Developer details). Still open: js/main.js:409 link refusal, shown by js/admin/toolbar-sections.js:449 | The link refusal still shows `F_SCENE_RZERO_V0 (js/scene.flux.js)` (main.js:271) and `route:<page>, doc:<path>`. Needs the plain-words reason/remedy/detail split that main.js:432-450 already uses for text.
- P1-5 Undo means different things | PARTIAL -> FIXED | js/admin/history.js:17-27 (create, theme, background and restore are now undoable "action" steps); tests/cms-undo-steps.cjs | Stated limits: a saved page's delete is reversed from Versions, and canvas entries end when the page changes.
- P1-8 Features only by right-click | PARTIAL -> FIXED | js/admin/toolbar.js:98-107,119,135ff (waiting commands become one line, not greyed rows) | none
- P1-11 Media overflow / no Replace image | OPEN -> FIXED | js/admin/toolbar.js:229-231 (Replace image), js/admin/assets.js:45-57 (Alt text + filePicker); tests/cms-image-replace-action.cjs | Sheet-vs-rail overflow: NEEDS-BROWSER.
- P1-13 Phone: desktop tool squeezed | PARTIAL -> FIXED | css/admin.css:316-328 (#phoneBar), admin-app.html:107-111, css/studio-embed.css:463-468 (bottom sheets); tests/browser/header-reach.mjs:105-106 (hScroll) | Page settings tab strip at 390 px: NEEDS-BROWSER.
- P1-14 Page fields shows everything | PARTIAL -> FIXED | js/admin/editor.js:346-436 (one accordion per group, "Show on page" at :416); tests/cms-page-field-groups.cjs | none
- P1-15 Versions reads like a commit log | PARTIAL -> FIXED | js/admin/versions-panel.js:41,83,112 ("Current" tag); js/admin/versions-glue.js:179-182 (Ark confirmDialog), :242 ("Restored version #n as unsaved changes" notice) | none
- P1-16 Feedback goes to four places | PARTIAL -> STILL OPEN | js/admin/canvas.js:222 + admin-app.html:298 (footer #studioStatus still there); js/admin/editor.js:480 (Save only toggles disabled) | Footer status is a fourth channel. No persistent "N unsaved changes" state.
- P2-1 Gate wording | OPEN -> STILL OPEN (credential name is OWNER) | admin.html:32-33, js/admin/gate.js:348-349,363-364 ("Locked.", "DeadArk identity"); no "Don't have one?" link | Rewrite the gate copy. The owner must name the credential: FXN ID or DeadArk identity.
- P2-4 Layers | PARTIAL -> STILL OPEN (minor) | Fixed: js/admin/rail.js:79-90 (backdrop folded), :97 (selection scrolled into view). Open: rail.js:62,67 + css/studio-embed.css:118 | DIV/CANVAS tags always show; there is no toggle to hide them.
- P2-5 Library form | PARTIAL -> FIXED | js/admin/library.js:120 (schema.label; the Ark registry carries labels, e.g. "Heading" in js/ark/vendor/ark-kit.js), :477 (one-line empty state); no "Open in Content" or "Theme & defaults" buttons | none
- P2-6 Row indicators lack a legend | PARTIAL -> STILL OPEN | js/admin/rail.js:218-219 (orphan tag, unsaved dot with tooltip only) | Add a one-line legend under the group head. Do it after P7c, because the orphan tag is itself wrong.
- P2-7 Keyboard | PARTIAL -> STILL OPEN | Fixed: rail tabs on Ark (js/admin/rail.js:355), viewSwitch (js/admin/header.js:239). Open: no "skip" anywhere in admin-app.html or js/admin | Add a skip link to the canvas.
- P2-8 Typography popover | UNVERIFIED -> STILL OPEN | js/admin/controls.js:166 (an unset value shows options[0], which is 'hero': js/content/layout.js:21); js/admin/toolbar-sections.js:135-137 (lowercase "padding" next to "Margin ↑", no px units) | Add an inherited/default option. Label the spacing fields with units. Truncated labels: NEEDS-BROWSER.
- P2-9 Account menu mixes five things | PARTIAL -> STILL OPEN | admin-app.html:89-95 (a "Publishing service" details block still repeats the "Publishing status" item at :82) | Remove the details block; Publishing status already covers it.
- P2-10 Page SEO popover | PARTIAL -> STILL OPEN | js/admin/seo.js:186 (points to "Design → Theme & defaults", which is now Site style → Search defaults); css/studio-embed.css:394 (popover textarea is 11 px mono) | Fix the stale pointer and the textarea font.
- P2-11 Delete uses native confirm() | OPEN -> FIXED | js/admin/core.js:89-94 (confirmDialog = ArkKit.arkConfirm), :148 (gate uses it); js/admin/editor.js:638-640 | The window.confirm fallbacks at core.js:93 and gate.js:401 run only without the Ark kit. Stale comment at editor.js:627.
- (c) Pattern table | PARTIAL -> STILL OPEN | Dialog done (core.js:89). Open: native `<select>` (js/admin/controls.js:163), Attachment is a native input wrapper (controls.js:187-190), hand-built Command picker (js/admin/header.js), no Ark Tooltip, h() defined twice (js/admin/gate.js:66, js/admin/core.js:36) | Port Select, Command and Tooltip; keep one h().
- "What already works" | UNVERIFIED -> FIXED | tests/browser/header-reach.mjs:105-106 asserts no horizontal scroll at phone width (passes per Resume 7) | none

**pages.md**
- P3 two pages for one model | PARTIAL -> FIXED | js/studio.js:6-10 (state at the catalog path); tests/lab-state.cjs; tests/site-exits.cjs:91-96 | none
- P7c CMS orphan tag from manifest links only | OPEN -> STILL OPEN | js/admin/rail.js:137-151 (realLinkIndex reads only manifest link fields), :168-169 (orphanOf) | Derive inbound links from the rendered pages or the page resolvers.
- P9 /stats 404 on /api/chain-* | PARTIAL -> NEEDS-BROWSER | ops/caddy/defxn-site.caddy:74-93 | Only a probe of the live host can decide.
- C2 Counts: duplicate /experiments | FIXED | Its open residual was P3's address state, now FIXED above.
- C5 Redirect candidates | PARTIAL -> FIXED (owner decision recorded) | catalog.js:55 alias; /concept/spec rewritten, as the owner chose | none
- / home "Walk the chain" behind More | PARTIAL -> FIXED | js/pages/home.js:41,267-273 (links in the default tab, Explore path selected by default at :339) | none
- /chain inbound from /how-deployment-works and /explore | PARTIAL -> STILL OPEN (half done) | Fixed: js/pages/deployment.js:195,227 (journeyPageBlocks lists /chain, site-pages.js:66). Open: js/pages/explorer.js:151 | No /chain link on /explore.
- /explore exits to /chain and /stats | PARTIAL -> STILL OPEN | js/pages/explorer.js:151-152 (onward: What is a resolver, product, raw records) | Add /chain and /stats.
- /stats link + 404s | PARTIAL -> NEEDS-BROWSER | The link is fixed (stats.js:635); the 404 is the P9 live probe | none
- /experiments merge | PARTIAL -> FIXED | Same as P3 | none
- /experiments/lab links from /concept/practice, /lifecycle, /dao | OPEN -> FIXED | js/pages/lifecycle.js:568-570, js/pages/sheet.js:503-504 (ArkUI.nextSteps leads to /experiments); tests/site-exits.cjs:83-85 | none
- /dao exits: governance, model analogy | OPEN -> FIXED | js/pages/dao.js:34-37 (resolutions that start from dao, e.g. GOVERNANCE: js/content/resolutions.js:23); sheet.js:504 nextSteps; tests/site-exits.cjs:85 | none
- /how-deployment-works/check -> /download | OPEN -> FIXED | js/pages/how-stories.js:432 ("Run it yourself" -> route:download) | none
- /lifecycle -> /experiments | OPEN -> FIXED | lifecycle.js:570; tests/site-exits.cjs:84-85 | none
- /lifecycle/receipt next step out | OPEN -> FIXED | lifecycle.js:568-578; tests/site-exits.cjs:83 (/resolutions, /stats, /experiments) | The audit's suggested /explore or /download are not among them (optional).
- /concept/practice -> /experiments | OPEN -> FIXED | sheet.js:503-504; tests/site-exits.cjs:85 | none
- Chrome: "Resolvers" mega-menu column | PARTIAL -> OWNER | js/resolvers/header.js mega menu still lists resolutions only | The report calls it optional. Owner to decide whether to add it.
- N7 /explore -> /chain, /stats | OPEN -> STILL OPEN | explorer.js:151 | Same as the /explore row.
- N11 how/check -> /download | OPEN -> FIXED | how-stories.js:432 | none
- N12 /lifecycle/receipt -> out | OPEN -> FIXED | tests/site-exits.cjs:83 | none
- N13 practice/lifecycle/dao -> /experiments | OPEN -> FIXED | tests/site-exits.cjs:84-85 | none
- N14 deployment + article -> /chain | PARTIAL -> FIXED | deployment.js:195,227; why-the-chain-was-retired.js:8 | none
- A8 remaining next-step links | PARTIAL -> STILL OPEN | Only /explore is left (explorer.js:151) | Add /chain and /stats there.
- A10 merge /experiments | PARTIAL -> FIXED | Same as P3 | none
- A15 CMS orphan tag from the link graph | OPEN -> STILL OPEN | Same as P7c | none
- A18 production routing of /api/chain-* | PARTIAL -> NEEDS-BROWSER | Same as P9 | none

**pages-crawl TSVs**
- consoleErrors/failedRequests (/stats 404 x2) | PARTIAL -> NEEDS-BROWSER | Same as P9 | Live probe of production.
- links visible1440=false | UNVERIFIED -> FIXED | tests/browser/site-fixes.mjs:124-132 (footer strip on screen at 1440 and 390; passes per Resume 7) | Mega menu and menu rows are hidden until opened, by design.

**Top fixes** (all in /Volumes/PortableSSD/flux/defxn)
1. P1-2 | A link refusal shows internal pattern names and grammar syntax to the editor's user | js/main.js:271,409 (split into reason/remedy/detail like :432-450), js/admin/toolbar-sections.js:449 | S
2. P2-8 | Typography "Size" shows "Hero" for unstyled text; spacing labels mix "padding" and "Margin ↑" with no units | js/admin/controls.js:166, js/admin/toolbar-sections.js:135-137 | S
3. P2-10 | SEO popover points to a renamed place ("Design → Theme & defaults"); textarea is 11 px mono | js/admin/seo.js:186, css/studio-embed.css:394 | S
4. P1-16 | Four feedback channels remain; no persistent "N unsaved changes" | js/admin/canvas.js:216-222, admin-app.html:298, js/admin/editor.js:480 | M
5. P2-1 | Gate says "Locked." and "DeadArk identity", with no path for someone who has no identity (the credential name needs the owner) | admin.html:32-33, js/admin/gate.js:348-349,363-364 | S
6. P7c/A15 | CMS orphan tag reads manifest link fields only, so it marks linked pages as orphans and misses real ones | js/admin/rail.js:137-169 | M
7. /explore (N7, A8) | /explore has no way on to /chain or /stats | js/pages/explorer.js:151 | S
8. P2-7 | No skip link from the editor chrome to the canvas | admin-app.html, css/admin.css | S
9. P2-9 | Account menu repeats "Publishing service" next to the "Publishing status" item | admin-app.html:89-95, js/admin/mesh.js | S
10. P2-6 | Orphan tag and unsaved dot have no visible legend (do after fix 6) | js/admin/rail.js:218-219 | S
11. P2-4 | Layer rows always show DIV/CANVAS tags; no toggle to hide them | js/admin/rail.js:62,67, css/studio-embed.css:118 | S
12. (c) Pattern table | Native select, hand-built page picker, no Ark Tooltip, h() defined twice | js/admin/controls.js:159-169,187-190, js/admin/header.js, js/admin/gate.js:66, js/admin/core.js:36 | L

===== pages-ux =====
Re-check of docs/ux-audit/ledger.md, sections pages-ux-a.md and pages-ux-b.md (ledger lines 229-664), read from HEAD 8e40c2c. I only read files. I did not run any tests, browsers, servers or builds.

How to read the citations:
- Citations are to HEAD files read with `git show HEAD:`. Another session has uncommitted edits to js/pages/account.js, css/account.css and docs/ux-audit/fold-contrast-readings.tsv, so line numbers in those files may differ from the working tree.
- "readings" means HEAD:docs/ux-audit/fold-contrast-readings.tsv, written by tests/browser/fold-contrast-sweep.mjs at c11a8c3, with 0 violations and an empty allowlist. Its control-contrast rows are L284-L426: every route and both viewports pass at 3:1 or better. Its font-size rows are L427-L570: no text under 12px outside SVG drawings. It only measures each page at rest, in its default view.
- "glossary.md" means HEAD:docs/glossary.md.
- Rows already FIXED, OUT-OF-REPO, OWNER or informational are skipped, as the task asked.

== pages-ux-a.md ==
M3 ctl<3 on 87% of controls | PARTIAL -> FIXED | readings control-contrast L284-L426 (0 violations); css/explore-story.css:50 uses --border-control | Only views opened by default are measured.
M5 phone tap targets <24px | UNVERIFIED -> NEEDS-BROWSER | No test measures tap size, except tests/browser/account-flows.mjs:334 for one /account button | Measure every route at 390px.
M6 jargon per route | PARTIAL -> STILL OPEN | No `terms:'first-use'` on home.js:340, about.js:305, chain.js:150, lab.js:65, learnings.js:77, economy-preview.js:168, stats-gpu.js:131, account-domains.js:67, palette.js:341 | Wire the glossary on these pages.
M7 font sizes / buttons / radii totals | UNVERIFIED -> NEEDS-BROWSER | grep now finds 193 `font-size:Npx`, 86 `!important` and 49 distinct `border-radius` values in css/*.css | The rendered census was not re-run.
/ 11 of 16 controls <3:1 (home-cycle-step) | PARTIAL -> FIXED | home-flow.js:608-609,664 (the steps are Ark tabs via ArkUI.buildChainSteps); readings L284, L356 | -
/ isometric labels 6-9px | OPEN -> FIXED | home-flow.js:143-147,164-182 (data-ark-label held at 12px on screen); css/home-swiss.css:55-86 has no px sizes; :135 hides .land-index on phone | -
/ credit overlaps canvas grid | UNVERIFIED -> NEEDS-BROWSER | css/navigation.css footer-strip rules | Needs a screenshot.
/ promote Explore/Build/Operate | PARTIAL -> FIXED | home.js:265-267 ("Where do I start?" is now the first tab) | plan.md Resume point 6 says the owner may revert the tab order.
/ hand-built list | PARTIAL -> OWNER | home.js:41-43 audience copy is in JS | Same copy-store decision as LC-7.
/account two H1-scale headings | OPEN -> FIXED | account.js:11-12,299 (one hero h1 "Sign in to DEFXN"); account-flows.mjs step 1 | -
/account jargon | OPEN -> FIXED | account.js:277,701 (first-use terms); glossary.md:129,131 (Auth Kit, Ghost ID); account.js:489-490 ("What is an Auth Kit?"); :339 Credits shown as not-built | -
/account phone primary button cut at fold | UNVERIFIED -> NEEDS-BROWSER | account-flows.mjs:330-334 checks width and height only, after scrollIntoView | Measure whether the button is above the fold.
/account whole page one HTML string | OPEN -> FIXED | account.js:626-701 (Ark hero, tabs, forms, facts, stats) | A small string remains for the contact-detail header (account.js:563).
/account two tab styles | OPEN -> FIXED | account.js:626 (one Ark tabs control) | -
/account fixes (one H1, tooltip, button text) | OPEN -> FIXED | account.js:299, 489, 1439 | -
/account hand-built list | OPEN -> FIXED | account.js:662-682 (figure, facts, disclosures inside an Ark shell) | -
/account/domains empty state floats | OPEN -> STILL OPEN | account-domains.js:55 is a bare `<p>` | Use the Ark list's empty state (reason / remedy / actions).
/account/domains tap target | UNVERIFIED -> NEEDS-BROWSER | - | -
/account/domains fixes | PARTIAL -> STILL OPEN | account-domains.js:55 | The empty card is still missing.
/account/domains hand-built | PARTIAL -> STILL OPEN | account-domains.js:45-57,90 (innerHTML form and list) | Move to Ark form and list blocks (js/ark/vendor/ark-kit-forms.js).
/bundle-deployer accent on table header | UNVERIFIED -> NEEDS-BROWSER | - | -
/chain grammar letters unexplained | PARTIAL -> FIXED | home-flow.js:84-96 (BLOCKS.means), :364 (Ark term per box); chain.js:15-16 | -
/chain fixes (tooltip, stack on phone, loop) | PARTIAL -> FIXED | home-flow.js:364; css/home-flow.css:29 (flex-wrap) | -
/chain hand-built list | PARTIAL -> FIXED | home-flow.js:608-609,664 (stepper is Ark tabs) | The scene is the page's own drawing inside an Ark figure.
/concept cards "open explanation" with no hover cue | UNVERIFIED -> NEEDS-BROWSER | concept.js:56 description text is unchanged | -
/concept show both groups on desktop | OPEN -> STILL OPEN | concept.js:65-67 still puts the two groups in tabs at every width | Show both groups on wide screens.
Story sheets unexplained terms | PARTIAL -> FIXED | glossary.md:113,121,123,127 (FXN chain, DAO, Roster, Substrate); "quorum" is left undefined on purpose (glossary.md:98-105); story.js:184 | -
Story sheets CTA casing | OPEN -> FIXED | sheet.js:456-459 `label()` = ArkUI.sentenceCase; js/ark/page-kit.js:89 | -
Story sheets bottom third empty | UNVERIFIED -> NEEDS-BROWSER | - | -
Story sheets fixes | PARTIAL -> FIXED | Same evidence as the rows above | -
/deploy phone step tabs show numbers only | UNVERIFIED -> NEEDS-BROWSER | deploy.js:124 labels read "01 / title" | Check that the labels show at 390px.
/deploy deck opens with negations | PARTIAL -> STILL OPEN | js/content/manifests/deploy.js:27 DECK ("Named networks partition... not a security boundary") | Rewrite to lead with what the reader gets.
/deploy Copy differs from /download | OPEN -> FIXED | js/ark/page-kit.js:48 copyCommand; deploy.js:92; download.js:75 | -
/deploy "miner presence" unexplained | PARTIAL -> FIXED | glossary.md:133; deploy.js:164 (first-use) | -
/deploy step copy in JS | OPEN -> OWNER | deploy.js:18-55 | Copy-store decision (LC-7).
/deploy fixes | PARTIAL -> STILL OPEN | manifests/deploy.js:27 | Lead-with-benefit is left; the phone label needs a browser.
/deploy hand-built | PARTIAL -> FIXED | deploy.js:87-92 (command card uses the shared copyCommand; Ark has no command block) | -
/deposits native select | OPEN -> FIXED | economy-preview.js:104-118 (Ark form with a styled select) | -
/deposits demo data in JS | OPEN -> OWNER | economy-preview.js:16-23 | Copy-store decision (LC-7).
/deposits tap target | UNVERIFIED -> NEEDS-BROWSER | - | -
/deposits fix (select + link icon) | PARTIAL -> FIXED | economy-preview.js:113-118 | -
/deposits hand-built | PARTIAL -> STILL OPEN | economy-preview.js:123-139 (hand-built result section and dl) | Use Ark facts and callout.
/download terminal ~60% empty | UNVERIFIED -> NEEDS-BROWSER | - | -
/download Copy style | OPEN -> FIXED | download.js:74-75 copyCommand | -
/download fixes (one step component with /deploy) | PARTIAL -> STILL OPEN | download.js:143 uses accordion; deploy.js:123 uses tabs | Two step controls remain; terminal sizing needs a browser.
/download hand-built | PARTIAL -> STILL OPEN | download.js:69-110 (terminal card, `dl` at :102); TERMINAL data at :22-28 | Change the dl to Ark facts; the copy-in-JS part is an OWNER call.
/experiments/lab tab strip overflows at 390 | UNVERIFIED -> NEEDS-BROWSER | lab.js:55 (now Ark `choice`) | -
/experiments/lab caption overlaps dots | UNVERIFIED -> NEEDS-BROWSER | css/studio.css:36-37,99 | -
/experiments/lab "FX-001" code | OPEN -> STILL OPEN | lab.js:40 `<span class="stage-corner">FX—001</span>` | Remove it or replace it with plain words.
/experiments/lab page is one innerHTML string | PARTIAL -> STILL OPEN | lab.js:38-42 (model string, native `<details>` at :41) | -
/experiments/lab one-line instruction | OPEN -> FIXED | js/studio.js:44-45 ("Drag the slider, or use the arrow keys...") | -
/experiments/lab fix tab wrap / caption | UNVERIFIED -> NEEDS-BROWSER | - | -
/experiments/lab hand-built | PARTIAL -> STILL OPEN | lab.js:41 native details; stage and slider are page-owned | -
/explore 11 of 12 controls <3:1 | OPEN -> FIXED | css/explore-story.css:50 (--border-control); readings L289, L361 | -
/explore tile captions 9-10px, low contrast | OPEN -> FIXED | css/explore-story.css:62 (--caption-size .75rem); readings L433, L505; text-contrast L145 lowest 5.63 | -
/explore mesh grid labels unreadable | OPEN -> FIXED | No `how-work-mesh-label` rule or markup is left (git grep finds none) | -
/explore "1 MINERS" | OPEN -> FIXED | explorer.js:67-75 (countPhrase), :664 | -
/explore pane switch only on phone | OPEN -> STILL OPEN | explorer.js:95 and css/explore-story.css:140-147 (hand-built aria-pressed buttons) | Use Ark tabs or choice (X5).
/explore fixes | OPEN -> FIXED | Same evidence as the rows above | -
/explore hand-built | PARTIAL -> STILL OPEN | explorer.js:930 (own stat card), dl at :235,529,758,806, innerHTML at :106,159,203,227 | -
/how-deployment-works three canvases | PARTIAL -> STILL OPEN | deployment.js:180-186 (three mesh fabrics), paused offscreen at :235 | Use one canvas or a static figure.
how chapters raw identifiers | OPEN -> FIXED | how-stories.js:390-398 (plain meaning leads, field name follows in mono) | -
how chapters fixes | PARTIAL -> FIXED | how-stories.js:396; readings text-contrast L160-162 | -
/learnings excerpt above title on phone | UNVERIFIED -> NEEDS-BROWSER | learnings.js:28 sets the card order | -
/learnings section has four names | PARTIAL -> FIXED | js/hero-motion.js:175 (NAV.BACK.NOTES); manifests/home.js:177-181 ("Notes") | One leftover: the CMS default 'OPEN THE TUTORIALS' at js/admin/editor.js:535.
/learnings excerpts misalign | UNVERIFIED -> NEEDS-BROWSER | learnings.js:30 `alignRows: true` (structural fix) | Not measured.
/learnings excerpt 25,232 vs article | PARTIAL -> FIXED | js/content/seo-data.js:681 now says 51,065 | -
/learnings fixes | PARTIAL -> FIXED | learnings.js:30, 64-72; readings fold L75 | Pagination and filtering were not built; the fold rule is met without them.
/learnings hand-built | PARTIAL -> OWNER | learnings.js:58-59 (title and lede literals) | Copy-store decision (LC-7).
lifecycle callout starts lowercase | PARTIAL -> FIXED | lifecycle.js:598 (title "Not yet established", body capitalised) | -
lifecycle hand-built | PARTIAL -> OWNER | lifecycle.js:8-76 | Same as LC-7.
X2 ghost controls | PARTIAL -> FIXED | readings L284-L426 (0 violations; borderless story-record passes as text-identified) | -
X5 same control built 7+ ways | PARTIAL -> STILL OPEN | explorer.js:95 (pane switch); sheet.js:471 (story-record legend buttons) | Account and lab are now on Ark.
X6 jargon without glossary | PARTIAL -> STILL OPEN | Same pages as M6 | -
X8b Notes / Learnings / Tutorials | PARTIAL -> FIXED | hero-motion.js:175 | Leftover: admin/editor.js:535.
X8d excerpt vs body ops/s | PARTIAL -> FIXED | seo-data.js:681 | -
X9 back-link styles | PARTIAL -> STILL OPEN | hero-motion.js:175 (corner "← BACK"); account.js:565 (literal "← All contacts"); explorer.js:227 (`content-layer-path`) | -
X10 hard-coded scale | PARTIAL -> STILL OPEN | 86 `!important` and 193 px `font-size` in css/*.css | -
X11 tiny diagram text | PARTIAL -> FIXED | home-flow.js:143-147; the explorer label is gone; readings font-size L427-L570 | -
X12 canvases / rAF | PARTIAL -> NEEDS-BROWSER | No test asserts canvas counts (idle-frames.mjs:85 only filters fabrics) | -
X13 markup strings and copy in JS | PARTIAL -> STILL OPEN | lab.js:38; account-domains.js:47,53; explorer.js:106,159,203,227 | The copy-in-JS half is OWNER (LC-7).
T1 page hero | PARTIAL -> FIXED | account.js:664-665 (Ark hero inside a wrapper) | -
T2 eyebrow classes | PARTIAL -> STILL OPEN | account-domains.js:53 (`account-card-caption`); explorer.js:98,102 (`how-work-signal`) | -
T3 tabs | PARTIAL -> STILL OPEN | Same as X5 | -
T4 breadcrumb | PARTIAL -> STILL OPEN | Same as X9 | -
T8 stepper | PARTIAL -> FIXED | home-flow.js:664; account is on Ark | The resolver-lab track belongs to WR-5 (OWNER).
T9 disclosure | PARTIAL -> STILL OPEN | lab.js:41 native `<details>` (the explorer one became Ark at explorer.js:216) | -
T11 key/value dl | PARTIAL -> STILL OPEN | explorer.js:235,529,758,806; economy-preview.js:128; download.js:102 | -
T12 stat tile | PARTIAL -> STILL OPEN | explorer.js:930 `mesh-explorer-stat` | -
T13 form + status | OPEN -> STILL OPEN | account-domains.js:47; explorer.js:198 | Account and deposits now use Ark forms.
T14 code + Copy | OPEN -> FIXED | page-kit.js:48 copyCommand | -
T16 empty state | OPEN -> STILL OPEN | account-domains.js:55; explorer.js:604 | -
C1 button and tabs | PARTIAL -> FIXED | Case rule and Copy fixed (page-kit.js:48,89) | X5 tracks the remaining selectors.
C2 page hero | PARTIAL -> FIXED | account.js:665 | -
C3 breadcrumb | PARTIAL -> STILL OPEN | Same as X9 | -
C6 disclosure | PARTIAL -> STILL OPEN | lab.js:41 | -
C7 stepper | PARTIAL -> FIXED | Same as T8 | -
C9 key/value | PARTIAL -> STILL OPEN | Same as T11 | -
C11 glossary term | PARTIAL -> STILL OPEN | Same as M6 | -

== pages-ux-b.md ==
LC-4 ~180px void | UNVERIFIED -> NEEDS-BROWSER | - | -
PA-2 SDK semantic tokens missing | OPEN -> FIXED | palette.js:16-22,40 (names from js/content/palette-tokens.js, generated from the SDK) | -
PA-7 no typography section | OPEN -> FIXED | palette.js:156-200 (font slots and type scale) | -
PA-8 swatch contrast ratio | OPEN -> FIXED | palette.js:92-105,139-145,202-217 (Contrast tab) | -
PA-10 hand-built patterns | PARTIAL -> FIXED | palette.js:295-306 | The swatches stay page-owned by design.
RF-1 mobile fold 1.68x | OPEN -> FIXED | reference.js:186-200 (section folds); readings L25 (1.09), L94 (1.30) | -
RF-2 heading levels skip H2 | OPEN -> FIXED | reference.js:87-90 | -
RF-3 raw repo-path kicker | OPEN -> FIXED | reference.js:207-215 (Ark breadcrumb replaces it) | -
RF-4 bare tables | PARTIAL -> STILL OPEN | reference.js:77 `el('table')` (CSS scroll only) | Render through the Ark table / table-wrap.
RF-6 auto TOC | OPEN -> FIXED | reference.js:125-150 | -
RF-7 hand-built patterns | OPEN -> STILL OPEN | reference.js:232 (provenance `<p>`); :70,77 (renderer) | Breadcrumb and folds are now Ark.
RS-5 undefined jargon | PARTIAL -> FIXED | glossary.md:107,109 (Mesh, Resolution); resolutions.js:225 | The optional one-line definition in the deck (manifests/resolutions.js:27) was not added.
RD-4 jargon density | PARTIAL -> FIXED | glossary.md:107,111,115 (Mesh, FXN, Bundle); resolutions.js:224 | -
RD-5 empty tabpanel space | UNVERIFIED -> NEEDS-BROWSER | - | -
RD-7 status colours | PARTIAL -> STILL OPEN | resolutions.js:36,191 (words only) | Ark ships a toned `ark-status` part (ark-kit.js `bt()`); use it.
RM-2 type-scale drift | PARTIAL -> STILL OPEN | css/resolver-math.css has 9 distinct sizes, SVG text 7.5px and 9px; HTML text under 12px is fixed (readings L436, L508) | Move to the --type-* scale; SVG size needs a browser.
RM-3 jargon | OPEN -> FIXED | resolver-math.js:827 `terms:'first-use'` | -
RM-6 hand-built patterns | PARTIAL -> STILL OPEN | resolver-math.js:559 `.rm-chips` | Low priority.
RV-2 jargon wall | PARTIAL -> STILL OPEN | resolvers.js:263 has first-use; manifests/resolver.js:412 lede has no definition sentence | Add one plain sentence saying what a resolver is.
RV-4 empty right half of hero | UNVERIFIED -> NEEDS-BROWSER | - | -
RV-6 compact cards | PARTIAL -> OWNER | resolvers.js:176-226 (tables and accordion meet the fold) | Owner decides whether headline-number cards are still wanted.
SR-4 phone eyebrow | UNVERIFIED -> NEEDS-BROWSER | - | -
SR-5 ~170px empty band | UNVERIFIED -> NEEDS-BROWSER | - | -
SR-6 "what would make this real" step | PARTIAL -> STILL OPEN | resolver-guide.js:63,65 (same BODY3 text in two views) | Give Evidence its own text.
ST-2 jargon | PARTIAL -> FIXED | stats.js:707 `terms:'first-use'` | -
ST-3 type-scale drift | PARTIAL -> NEEDS-BROWSER | Under-12px text is fixed (readings L444, L516) | The distinct-size count was not re-measured.
ST-6 bar radii | UNVERIFIED -> NEEDS-BROWSER | - | -
ST-7 fixes 1-5 | PARTIAL -> STILL OPEN | Glossary is wired | Only adopting the SDK type scale is left (CP-7).
ST-8 hand-built | PARTIAL -> STILL OPEN | stats.js:893 (page-owned polling) | No shared LiveStatus; low priority.
LG-2 jargon | PARTIAL -> FIXED | stats-ledger.js:316 `terms:'first-use'` | -
LG-3 focusable bars / small text | PARTIAL -> FIXED | readings L446, L518; tests/a11y-chrome.cjs:43-48 | -
LG-5 lead with the "Problems" table | PARTIAL -> STILL OPEN | stats-ledger.js:215 vs 225 ("What it closes" is still the second tab) | -
LG-6 BenchmarkCard + glossary | PARTIAL -> FIXED | stats-ledger.js:316 | Accordion rows stand in for BenchmarkCard.
TR-3 "FXN / Tier 1" unexplained | OPEN -> STILL OPEN | economy-preview.js:168 (no terms option); :86; glossary.md:117 now defines Tier | Wire first-use.
TR-6 ~40% empty frame | UNVERIFIED -> NEEDS-BROWSER | - | -
WR-3 Laws step dead-ish end | PARTIAL -> FIXED | resolver-lab.js:479-481,503 (journeyLead -> /resolutions; site-pages.js:38) | -
WR-4 "claim" in H1 before it is defined | OPEN -> STILL OPEN | scripts/ark-blocks-adapter.js:134 marks only text-kind props; manifests/resolver.js:88 title | Gloss the hero title, or define "claim" in the lede.
WR-6 hand-built patterns | PARTIAL -> OWNER | resolver-lab.js:401,416 (aria-pressed track and picker) | Tied to the WR-5 decision.
CP-5 glossary coverage | PARTIAL -> STILL OPEN | The glossary now has the listed terms (glossary.md:107-133); first-use is missing on stats-gpu.js:131, economy-preview.js:168, home, about, chain, lab, learnings, account-domains, palette | -
CP-6 hand-built selectors | PARTIAL -> STILL OPEN | resolver-math.js:559; resolver-lab.js:401,416; explorer.js:95 | -
CP-7 type and font-slot drift | PARTIAL -> STILL OPEN | Duplicate --font-sans (css/themes.css:99 IBM Plex Sans vs assets/kit/defxn-fonts.css:50); --type-* tokens exist (themes.css:110-119) but only resolver-math uses them much, and --type-label .72rem / --type-metadata .68rem are below 12px | -
CP-10b contentinfo / nav landmarks | UNVERIFIED -> NEEDS-BROWSER | - | -
CP-10e tap targets <32px | UNVERIFIED -> NEEDS-BROWSER | - | -
CP-11b three background canvases | UNVERIFIED -> NEEDS-BROWSER | - | -
FQ-2 DataTable | PARTIAL -> STILL OPEN | reference.js:77 | -
FQ-3 Tabs | PARTIAL -> STILL OPEN | Same as CP-6 | -
FQ-8 Callout | PARTIAL -> STILL OPEN | reference.js:232 | -
FQ-10 Breadcrumb | PARTIAL -> FIXED | reference.js:215 | -
FQ-11 StatusChip | OPEN -> STILL OPEN | Same as RD-7 | -
FQ-12 Stepper | PARTIAL -> OWNER | WR-5 | -
FQ-14 CodeBlock | OPEN -> STILL OPEN | No code block in Ark; reference.js:70 `pre` | Needs a block added upstream in Ark (another repo).
FQ-16 LiveStatus | PARTIAL -> STILL OPEN | stats.js:893 | Low priority.
FQ-17 Markdown renderer | OPEN -> STILL OPEN | reference.js:54-90 still emits a bare table and pre | -

Top fixes (ordered by impact on a person using the site or the CMS):
1. TR-3 / CP-5 / X6 / M6 | Glossary terms show no tip on 9 pages (treasury, deposits, stats/gpu, home, about, chain, lab, learnings, account/domains, palette) | js/pages/economy-preview.js:168, stats-gpu.js:131, home.js:340, about.js:305, chain.js:150, lab.js:65, learnings.js:77, account-domains.js:67, palette.js:341 (+ per-route js/content/glossary/* from the glossary build) | M. Watch the glossary sub-budget: /resolvers and /stats are already named exceptions.
2. T16 / T13 / /account/domains | The empty domain list is a floating sentence, and the form and list are hand-built innerHTML | js/pages/account-domains.js:45-92, css/account-domains.css (use the Ark list's empty state and the Ark form) | M
3. WR-4 | The /what-is-a-resolver H1 says "claim" before the page defines it | scripts/ark-blocks-adapter.js:134, or js/content/manifests/resolver.js:88 | S
4. /deploy deck | The page opens with a list of what named networks do not do | js/content/manifests/deploy.js:27 | S (run copy:check)
5. /concept | Desktop readers see only one of the two question groups | js/pages/concept.js:65-67 | M
6. SR-6 | /start-from-something-real shows the same text under "How it works" and "Evidence" | js/pages/resolver-guide.js:63-65, js/content/manifests/references.js | S
7. LG-5 | /stats/ledger opens on mechanism instead of "What it closes" | js/pages/stats-ledger.js:214-225 | S
8. /experiments/lab | The unexplained "FX—001" code, and a native `<details>` inside the model | js/pages/lab.js:40-41 | S
9. RD-7 / FQ-11 | Ready/Building on resolution pages are plain words with no status tone | js/pages/resolutions.js:36,191 (Ark `ark-status` tone) | S
10. X5 / CP-6 | The /explore pane switch is a hand-built aria-pressed group | js/pages/explorer.js:95, css/explore-story.css:140-147 | S
11. RV-2 | The /resolvers lede never says what a resolver is | js/content/manifests/resolver.js:412 | S
12. X9 / C3 | Three back-link styles remain | js/hero-motion.js:175, js/pages/account.js:565, js/pages/explorer.js:227 | M
13. T11 / C9 | Seven hand-built `dl` lists instead of Ark facts | js/pages/explorer.js:235,529,758,806, economy-preview.js:123-139, download.js:102 | M
14. RF-4 / RF-7 / FQ-2 / FQ-8 | /reference tables are bare and the provenance note is a plain paragraph | js/pages/reference.js:77,232 | S
15. CP-7 | Two --font-sans definitions (load order decides), and the --type-label / --type-metadata tokens are under 12px | css/themes.css:99,117-119, assets/kit/defxn-fonts.css:50 | S

Next after these: /how-deployment-works draws three canvases (js/pages/deployment.js:180-186, M), and X10 still has 86 `!important` and 193 px font sizes in css/*.css (L).

===== comp-brand-content =====
components.md, brand.md, resolvers-content and the S0 sweep (ledger lines 665-1209), checked against main 8e40c2c plus the working tree. Another session has uncommitted edits in the working tree, including css/admin.css, css/account.css and fold-contrast-readings.tsv. Fold and contrast figures below come from the HEAD copy of the tsv. Paths starting design/ark-ui and design/deadark-sdk are /Volumes/PortableSSD/design/... and K: is /Volumes/PortableSSD/flux/defxn-product-kit. All three are outside this repo.

== components.md ==
D6 local ArkUI / not on blocks | PARTIAL -> STILL OPEN | js/pages/account.js:1-25 (now Ark blocks); js/pages/resolver-lab.js:320,353 | /account is done. Left: resolver-lab, the rest of explorer.js (:95-239 innerHTML) and the header's layer stack.
L1 admin primitives | PARTIAL -> FIXED | js/admin/ark-host.js:14-18 (arkTabsOn for the rail tabs, arkSegGroup for #viewSwitch); css/admin.css:329-336 (visible scrollbar on the Page-settings strip) | -
L2 icons.js | OPEN -> STILL OPEN | js/ark/icons.js (54 lines); callers header.js:248, rblock-card-v1.js:24, about.js:94, home-flow.js:150 | Ark icons lack the DEFXN glyphs; the fix starts in design/ark-ui.
L3 dash-kit | PARTIAL -> STILL OPEN | js/ark/dash-kit.js:32 panel and :115 shell have no caller; css/stats-dashboard.css is deleted | Delete panel/shell; move resolveLinkField (:79) into the adapter.
SC1 per-route CSS | PARTIAL -> FIXED | js/pages/catalog.js:55-92 (ArkUI.pageStyles, derived by scripts/page-styles.mjs) | -
SC2 uppercase/radii/px sizes | PARTIAL -> STILL OPEN | component-census-baseline.tsv: uppercase 60, px radii 15, px font sizes 39 | Not converged.
P1 buttons | PARTIAL -> STILL OPEN | css/components.css:5-6 (0 !important); census button uses 3; resolver-lab.css:74,81 999px; explorer.js:95,182 and account-domains.js hand-built buttons | Residual buttons on explorer and resolver-lab.
P2 eyebrow | PARTIAL -> STILL OPEN | census eyebrow classes 37, uses 35, css-files 24 | Barely moved: rm-eq-kicker (resolver-math.js:314), mesh-explorer-kicker x5.
P3 hero/h1 | PARTIAL -> STILL OPEN | hand h1 at reference.js:231,279 and resolvers/body.js:46; fold passes on every route (HEAD tsv L2-L94) | Fold is verified; three hand-built h1 sites left.
P4 tabs | PARTIAL -> STILL OPEN | no hand role="tablist" left in js/pages; resolver-lab.js:320 keydown; explorer.js:95 aria-pressed pane group | resolver-lab's own arrow keys and explorer's pane toggle.
P5 callout | PARTIAL -> STILL OPEN | explore-browse-note x6 (explorer.js), economy-warning (economy-preview.js), nav-layer-note header.js:601, rm-eq-note resolver-math.js:408 | Four residual families.
P6 stat | PARTIAL -> STILL OPEN | mesh-explorer-stat x3 (explorer.js:191,233); census stat uses 4 | Explorer only.
P7 card | PARTIAL -> STILL OPEN | explore-*-card (explorer.js), flow-panel and land-panel (home-flow.js); census card uses 10 | explorer and home-flow.
P8 next links | PARTIAL -> STILL OPEN | download.js:85-86, resolver-lab.js:353, header.js:237 products-mega-more | economy-return is gone; three left.
P9 section head | PARTIAL -> STILL OPEN | mesh-explorer-section-head x3, header.js:207,239 products-mega-heading | -
P10 steps | PARTIAL -> STILL OPEN | resolver-lab.js:331 resolver-lab-stage, lab.js stage; lifecycle.js now only has pins | -
P11 back link | PARTIAL -> STILL OPEN | header.js nav-layer back x6 (layer stack kept on purpose), mesh-explorer-back/explore-record-back (explorer.js) | Explorer's two.
P12 field | OPEN -> STILL OPEN | Ark field/form blocks exist (design/ark-ui/blocks/field.ts, forms.ts) and /account uses them; census field uses 31 | Left: explorer.js:237, account-domains.js:48, resolver-math.js:523,553.
P13 chips | PARTIAL -> STILL OPEN | explore-chip/mesh-source-chip (explorer.js), palette-chip (palette.js), rm-chip (resolver-math.js), land-tag (home-flow.js) | -
P15 accordion | PARTIAL -> STILL OPEN | lab.js:41 `<details class="study-description">`; explorer's details are gone | One site.
P16 popover/menu | OPEN -> FIXED | header.js:704-710 (MENU on Ark popover via lazyHeaderPopover); explorer.js:172-207 (Ark popover block) | Layer stack stays custom by design.
P17 live/toast | OPEN -> STILL OPEN | aria-live in download.js:70, explorer.js:106,191,233, resolver-lab.js:328,357, resolver-math.js:562, account-domains.js:48, header.js:271 | No Ark toast/live block in use (status-line exists).
P18 figure | PARTIAL -> STILL OPEN | about.js:39 about-layers-figure, resolver-math rm-field-svg, js/ark/story-diagrams.js (107 lines) | Depends on G13.
P20 dl | PARTIAL -> STILL OPEN | explorer.js:235 `<dl class="mesh-source-facts">` | Use the facts block.
P21 empty | PARTIAL -> STILL OPEN | account-domains.js:55, explorer.js:604 | Ark has no empty block.
P22 code | OPEN -> STILL OPEN | download.js:98, deploy.js:90, reference.js:70 | Ark has no code block (design/ark-ui).
C1 CMS legacy Text/Divider offered | PARTIAL -> STILL OPEN | js/content/components.js:67,77 (successor 'text'/'divider' unmet); Ark block list has neither | Needs Ark text/divider blocks.
DN2 resolver-math | PARTIAL -> STILL OPEN | resolver-math.js:314,408,523,553,562 | Term builder still hand-built.
DN5 about/home | PARTIAL -> STILL OPEN | about.js:39; home-flow.js flow-panel/land-tag; fold / 1.39, /about 1.38 (HEAD tsv L2-3) | Fold is fine; residual figure and cards.
DN6 economy/resolver-lab | PARTIAL -> STILL OPEN | economy-preview.js economy-warning; resolver-lab.js:320-416 | resolver-lab is hand-built.
DN7 story pages | PARTIAL -> STILL OPEN | download.js:83-98 | Step nav buttons and pre.
DN8 explorer/account/header | OPEN -> STILL OPEN | account converted (account.js:1-25); explorer.js:95-239 innerHTML | Explorer body and header layer panels.
MP1 button -> Ark | PARTIAL -> STILL OPEN | css/components.css paint lists (no !important); G12 missing | Waits on G12 (out of repo).
MP2 choice -> toggle group | PARTIAL -> STILL OPEN | Ark `choice` block used at lab.js:55; aria-pressed hand groups in explorer.js (10), palette, resolver-lab, economy, concept, sheet | Convert to the choice block.
MP3 eyebrow part | PARTIAL -> STILL OPEN | design/ark-ui components pack has no EYEBROW part | Out of repo, low impact.
MP5 actions part | PARTIAL -> STILL OPEN | same; block only | Out of repo.
MP6 tabs | PARTIAL -> FIXED | no hand tablist in js/pages; explorer.js:115 Ark tabs | -
MP9 card | PARTIAL -> STILL OPEN | see P7 | -
MP13 back link | PARTIAL -> STILL OPEN | see P11 | -
MP14 field/form | OPEN -> STILL OPEN | blocks exist now; see P12 | -
MP15 badge tones | PARTIAL -> STILL OPEN | BADGE tones not added to ark-ui.components.ts | Out of repo.
MP18 popovers | OPEN -> FIXED | see P16 | -
MP19 live/toast | OPEN -> STILL OPEN | see P17 | -
MP20 figure/drafting | PARTIAL -> STILL OPEN | no design/ark-ui/ark-ui.drafting.ts | Depends on G13.
MP23 empty | OPEN -> STILL OPEN | no empty block in the Ark block list | -
MP24 code | OPEN -> STILL OPEN | no code block | -
MP26 divider | PARTIAL -> STILL OPEN | components.js:77 | -
MP27 icons | OPEN -> STILL OPEN | see L2 | -
MP28 admin tabs | PARTIAL -> FIXED | see L1 | -
G1 / G3 / G8 parts | PARTIAL -> STILL OPEN | ark-ui.components.ts has no EYEBROW, ACTIONS or STATUNIT; BADGE has no tones | Out of repo, low impact.
G12 deadark-sdk recipe | OPEN -> STILL OPEN | ark-ui.components.ts:1618-1956: recipe keys are provider-base, deadark-chat, editorial, ... with no deadark-sdk | Out of repo.
G13 drafting | OPEN -> STILL OPEN | no ark-ui.drafting.ts; js/ark/story-diagrams.js still 107 lines | -
A5 pages as data | PARTIAL -> STILL OPEN | account converted; resolver-lab, explorer, header partly | -
A7 alias record | PARTIAL -> OWNER | per-block pins plus tests/lib/layout-continuity.cjs replace it | Owner: accept the pins in place of the alias record.
A9 !important / page sheets | PARTIAL -> STILL OPEN | components.css 0; 55 left across other sheets (settings 6, navigation 4, studio-embed 4, ...) | Remaining sheets.
A10 wave order | PARTIAL -> FIXED | plan.md Resume point 8 ("the polish plan's waves are all closed") | -
DS1 resolveLinkField | PARTIAL -> STILL OPEN | dash-kit.js:79; js/ark/blocks.js calls ArkUI.dash.resolveLinkField | Move it into the adapter.
SS4 SSR/browser parity | PARTIAL -> STILL OPEN | only tests/ssr-*.cjs, *-ssr.cjs exist | No server-vs-browser comparison.
W1b components pack | OPEN -> STILL OPEN | see G1, G3, G8, G12 | Out of repo.
W1e code block | PARTIAL -> STILL OPEN | see P22 | Out of repo.
W2a adapter/alias | PARTIAL -> STILL OPEN | see DS1 and A7 | -
W2c components.css cutover | PARTIAL -> FIXED | css/components.css:1-6; merge 4041064 | -
W3a stats family | PARTIAL -> STILL OPEN | resolver-math fold passes 1.41/1.00 (HEAD tsv L10, L79) | Term builder only (DN2).
W3d product pages | PARTIAL -> STILL OPEN | reference.js:150,186,215 (Ark disclosure and breadcrumb); hand h1 at :231,279 | Hero.
W4a header | OPEN -> FIXED | header.js:704-710 | -
W4b explorer | OPEN -> STILL OPEN | explorer.js:95-239 | Fields, cards, chips, stats, dl.
W4c account | OPEN -> STILL OPEN | account.js done; account-domains.js:46-55 innerHTML form and list | account-domains only.
W4d resolver-lab | OPEN -> STILL OPEN | resolver-lab.js:320-416 | -
W4e home-flow | OPEN -> STILL OPEN | flow-panel, land-panel, land-tag (home-flow.js; css/home-swiss.css) | -
PR1 priority list | PARTIAL -> STILL OPEN | popover done | Live region, empty, code, field left.
R2 bundle budget | PARTIAL -> OWNER | docs/cms-architecture.md:1087-1093 (named exception: /resolvers 30.18, /stats 30.02); /lifecycle +33.75 (:631) | Owner: accept the exception, or shave about 0.2 KB.
R3 saved edits survey | PARTIAL -> OWNER | the survey of real drafts needs owner/mesh data | Out of repo.
R8 cascade collisions | PARTIAL -> FIXED | css/components.css:5-6 (0 !important) | -
R9 test coupling | PARTIAL -> FIXED | plan.md Resume 7 (every failed test passes alone); tests/browser/account-flows.mjs | -
R2b glossary budget | OWNER -> FIXED | a6ba402 per-route glossary; tests/glossary-routes.cjs | Remaining overage is the R2 exception.

== brand.md ==
§0.3 Launch in switcher | PARTIAL -> STILL OPEN | K:catalog/pending/flux-launchpad.json:8-9 (id launch, "Flux Launch"); flux-launchpad/package.json has no defxn block | Out of repo.
§0.7 Launch branch order | OWNER -> OWNER | plan.md:111 | Owner merges wave3-launchpad-v2.
§1 CMS own bar | PARTIAL -> STILL OPEN | admin-app.html:40 `<header class="bar" id="appBar">` | Not on the kit bar.
§1 other surfaces | OWNER -> OWNER | - | Owner: bring these surfaces under the kit or not.
§1.1 #11 theme attr/keys | PARTIAL -> STILL OPEN | defxn side fixed (js/bootstrap.js:7-25, dcb52b0); kit still uses data-dx-theme and defxn-product-theme (K:src/shell.mjs:33,343; assets/kit/defxn-product.js:36,346) | Kit side only.
§2 theme row | PARTIAL -> STILL OPEN | same as #11 | -
§2 type scale | PARTIAL -> STILL OPEN | census px-font-sizes 39; check:design not in package.json or scripts/ | Wire the check; cut the sizes.
§2 app bar indicator | PARTIAL -> STILL OPEN | no nav-ind in K:src | Kit.
§2 panels | OPEN -> STILL OPEN | box-shadow/backdrop-filter in 22 sheets (studio-embed 13, admin 12, resolver-lab 9) | Flatten pass not done (Resume 8).
§2 buttons | PARTIAL -> NEEDS-BROWSER | solid CTA lift removed (css/components.css:25-26) | Nav pills need a visual check.
§2 icons | OPEN -> STILL OPEN | see L2 | -
§2 motion | PARTIAL -> STILL OPEN | js/content/settings-defaults-data.js:17 animated:true; no data-dx-product scoping | Home-only backgrounds not done (Resume 8).
§2 figures dx-frame | OPEN -> STILL OPEN | no dx-frame in js/ or css/ | Low impact.
§3.3 mega menu vs switcher | PARTIAL -> STILL OPEN | Resolutions menu on Ark popover (header.js:704 note); kit switcher bespoke (K:src/shell.mjs, no Ark import) | Kit.
§3.5 type scale | PARTIAL -> STILL OPEN | see §2 type scale | -
§3.7 panels | OPEN -> STILL OPEN | see §2 panels | -
§3.8 buttons | PARTIAL -> NEEDS-BROWSER | see §2 buttons | -
§3.9 segmented controls | PARTIAL -> STILL OPEN | census tabs uses 7, toggle 6; aria-pressed groups (see MP2) | -
§3.13 iconography | OPEN -> STILL OPEN | see L2 | -
§3.14 motion | PARTIAL -> STILL OPEN | see §2 motion | -
§3.15 figure grammar | OPEN -> STILL OPEN | see §2 figures | -
§3.18 CMS look | PARTIAL -> STILL OPEN | admin-app.html:40; css/admin.css:187 primary-button glow | -
§4.14 two Launch trees | OWNER -> OWNER | - | -
§5 D3 | PARTIAL -> STILL OPEN | defxn done (bootstrap.js:7-25); kit not | Kit.
§5 D4 SDK font preset | PARTIAL -> STILL OPEN | css/themes.css:98-99 (IBM Plex Sans, Source Serif 4); no "Albert" in design/deadark-sdk/src | SDK.
§5 D7 icons | OPEN -> STILL OPEN | see L2; no generator in scripts/ | -
§5 D8 kit on Ark | PARTIAL -> STILL OPEN | K:src/shell.mjs (866 lines, no Ark import) | Kit.
§5 D10 catalog | PARTIAL -> STILL OPEN | Launch still pending in the kit | Out of repo.
§5 D12 design check run by consumers | PARTIAL -> STILL OPEN | no check:design in defxn package.json or scripts/; plan.md Resume 8 "wiring the kit's check:design" not done | -
§6.4 namespace palette keys | PARTIAL -> FIXED | js/bootstrap.js:7-25; dcb52b0 (saved activeTheme read through the same map); tests/theme-content.cjs | -
§6.5 SDK ladders end state | PARTIAL -> STILL OPEN | kit still carries the role layer | SDK and kit.
§7 A1 kit gaps | PARTIAL -> STILL OPEN | no nav-ind or count badge in K:src | Kit.
§7 A2 boot.js | PARTIAL -> STILL OPEN | no boot file in K:scripts or K:dist | Kit.
§7 A3 half-pixel sizes | PARTIAL -> STILL OPEN | K:scripts/design-check.mjs:21-24 baseline | Kit.
§7 A4 Launch catalog | PARTIAL -> STILL OPEN | flux-launchpad/package.json has no defxn block | Out of repo.
§7 B2 icon pack | OPEN -> STILL OPEN | see L2 | -
§7 C1 defxn adopts kit | PARTIAL -> STILL OPEN | fold now verified (HEAD tsv L2-3, L18: / 1.39, /about 1.38, /stats 1.18); css/navigation.css still has 4 shadow/blur rules; no data-dx-product | Retire the site bar rules; scope the home.
§7 C2 CMS shadows / gate bar | PARTIAL -> STILL OPEN | css/admin.css:187 (.btn.primary glow), :204 (.dot ring), :569 (.who ring); admin-app.html:40 | -
§7 D1 SDK ladders | OPEN -> STILL OPEN | see §6.5 | Out of repo.
§8.1 kit on Ark elements | OPEN -> STILL OPEN | K:src/shell.mjs has no Ark import | Kit.
§9 CMS palette authority | OWNER -> OWNER | - | Owner decides whether the CMS keeps palette authority over kit tokens.
§9 broker whitelist | PARTIAL -> STILL OPEN | git grep in flux/bundle-deploy finds only defxn-product.mjs:20; no entry for defxn-tokens.css | Out of repo.
§9 motion | PARTIAL -> STILL OPEN | see §2 motion | -
§9 concurrent sessions | OWNER -> OWNER | - | -
§9 naming collisions | OWNER -> OWNER | K:catalog/pending/flux-launchpad.json:9 | -

== resolvers-content ==
0.e meanings collide | PARTIAL -> FIXED | "Resolver registry" no longer in js/; docs/resolver-audit.md:11 "not registered" is generated in defxn-defi-rs | Only the external doc remains.
0.f banned vocabulary | PARTIAL -> FIXED | no "finaliz" in js/pages or js/content/manifests; tests/no-deprecated-vocabulary.cjs scans rendered copy | -
0.j typed blocks + snapshot | PARTIAL -> STILL OPEN | js/resolvers/blocks has no resolver/capability block | See 6.1 and 6.2.
2.2-j providers/control | PARTIAL -> OWNER | Q10 chose snapshot-only | Owner: node read or not.
2.3-d agreement chapters | PARTIAL -> OWNER | Q4 still pending (plan.md:204) | -
2.3-g approvers/mandate | PARTIAL -> OWNER | Q4 | -
2.6-b /dao seven operators | PARTIAL -> OWNER | Q6 | -
2.10-f hand-typed families | PARTIAL -> STILL OPEN | js/pages/resolver-math.js:47-65 hand list; :59-60 Governance-Vote and Treasury-Spend read NOT BUILT; families labelled at :785-786 | Derive the list from the audit source.
2.11-a /stats "Resolver registry" | PARTIAL -> FIXED | git grep finds no "Resolver registry" in js/ | -
2.12-k whitepaper | PARTIAL -> OWNER | banner only; body kept as dated history | Owner: keep the frozen body or annotate.
2.12-m prototype-to-production | PARTIAL -> OWNER | docs/prototype-to-production.md:181 "Byzantine" | Tied to 6.5-b.
2.12-n quickstart | PARTIAL -> FIXED | docs/quickstart.md "After it runs" (explorer, deployer, /resolvers), +8 lines since 5a1ac71 | -
2.13-a resolver-by-construction | PARTIAL -> OWNER | relevance banner present; body :42 kept | Dated history.
2.13-c "code 1A ... agreement-fabric" | PARTIAL -> OWNER | not found at why-the-chain-was-retired.js:37 any more; a-resolver-by-construction.js:37 is the grammar paragraph | Banner present; keep as dated history.
2.13-d governance slug | PARTIAL -> OWNER | Q7 | -
2.13-e one-substrate | PARTIAL -> OWNER | articles/one-substrate-many-networks.js:3,20,30 under the banner | Dated history.
2.13-i second grammar layer | OPEN -> FIXED | js/content/articles/the-grammar-does-almost-no-work.js:65-66 ("A resolver can add a second grammar of its own") | -
2.13-j why-the-chain-was-retired | PARTIAL -> OWNER | :3 under the banner | Dated history.
2.14-f slug in llms.txt | OWNER -> OWNER | Q7 | -
3.2 /resolvers copy | PARTIAL -> OWNER | providers and control need a node read (Q10) | -
3.4 /chain link line | PARTIAL -> FIXED | js/content/manifests/chain.js:57 SOURCE.LINK "Where resolver chains come from", :55 NEXT.HREF route:resolvers | -
3.10 /resolver-math | PARTIAL -> STILL OPEN | see 2.10-f | -
3.11-d status column rename | OWNER -> OWNER | docs/status.md:38 still "Capability" | Q1.
4.1 resolver-layers diagram | OPEN -> FIXED | js/pages/resolver-guide.js:93; js/pages/resolver-page-parts.js | -
4.2 deploy-flow diagram | OPEN -> FIXED | js/pages/deployment.js:194 | -
4.3 launched-vs-served | OPEN -> FIXED | js/pages/resolver-guide.js:94 | -
4.4 upgrade-supersedes | OPEN -> FIXED | js/pages/dao.js:25 | -
5.b /resolvers inbound | PARTIAL -> FIXED | chain manifest :55 route:resolvers | -
5.c /how-deployment-works inbound | PARTIAL -> FIXED | bundle-deployer.js:87 (pageLabel('deployment')); dao.js:32 journeyPageBlocks | -
5.f external links | OWNER -> OWNER | Q2 | -
6.1 RBLOCK_RESOLVER_V1 | OPEN -> STILL OPEN | ls js/resolvers/blocks shows no such block | Build the block and a Library entry.
6.2 RBLOCK_CAPABILITY_V1 | OPEN -> STILL OPEN | same | -
6.3-b manifest-hash verify | PARTIAL -> OWNER | Q10 | -
6.4 snapshot-driven diagram | OPEN -> FIXED | js/pages/resolver-page-parts.js:67-99 reads ArkRegistrySnapshot | -
6.5-b BFT in deprecated.md | OWNER -> OWNER | docs/deprecated.md has no Byzantine; prototype-to-production.md:181; value-registries-client.js:95 | -
Q1 / Q2 / Q6 / Q7 | OWNER -> OWNER | plan.md:204 lists them as pending | -
Q4 agreement lifecycle | OWNER -> OWNER | js/pages/lifecycle.js has no earlier-path note | /lifecycle still has no banner.

== S0 sweep ==
S0-3 Connect-folder button 1.28:1 | OPEN -> FIXED | HEAD fold-contrast-readings.tsv L209-211, L281-283 (editor text-contrast lowest 5.32, 0 violations) | -
S0-6 editor controls under 3:1 | OPEN -> FIXED | same tsv L353-355, L425-427 (lowest 4.55 / 4.53, 0 violations) | 45 of 53 controls are still borderless; this is not a violation.
S0-7 editor labels under 12px | OPEN -> FIXED | same tsv L497-499, L569-571 (smallest 12.00) | -

Top fixes (in this repo, by user impact):
1. 2.10-f | /resolver-math lists Governance-Vote and Treasury-Spend as NOT BUILT from a hand-typed list | js/pages/resolver-math.js (derive the list from the audit source, like snap) | M
2. §2 motion | background patterns animate by default on every route | js/content/settings-defaults-data.js, js/zero-webgl.js, index.html (home scoping) | M
3. W4d/P4 | /what-is-a-resolver has its own arrow keys, pressed buttons and a pill Next | js/pages/resolver-lab.js, css/resolver-lab.css (Ark tabs/choice/pager) | M
4. W4c | /account/domains track form and list are innerHTML; /account uses Ark form/field | js/pages/account-domains.js, css/account-domains.css | S
5. DN7/P8/P22 | /download step navigation is hand-built buttons plus a link | js/pages/download.js (Ark actions/pager) | S
6. W4b | /explore body: cards, chips, stats, dl, lookup form and section heads are hand-built innerHTML | js/pages/explorer.js, css/explorer*.css | L
7. DN2 | resolver-math term builder has a hand input, kicker, note and aria-live | js/pages/resolver-math.js, css/resolver-math.css | M
8. P17 | eight hand-rolled aria-live regions | download.js, explorer.js, resolver-lab.js, resolver-math.js, account-domains.js, header.js (Ark status-line) | M
9. §7 C2 | CMS primary button glow and dot/who rings break the flat rule | css/admin.css:187,204,569 | S
10. §2 panels | shadows and blur in 22 sheets | css/studio-embed.css, css/admin.css, css/resolver-lab.css, css/navigation.css, others | M
11. P3/W3d | three hand-built h1 headings | js/pages/reference.js:231,279, js/resolvers/body.js:46 (Ark hero) | S
12. W4e/P7 | home cards and tags are not Ark cards | js/pages/home-flow.js, css/home-flow.css, css/home-swiss.css | M
13. A9 | 55 !important left in other sheets | css/settings.css, navigation.css, studio-embed.css, others | M
14. D12/§2 type | 39 px font sizes; the kit's design check is not run | package.json, scripts/run-tests.mjs, css/* | M
15. L3/DS1 | dead panel/shell in dash-kit; resolveLinkField not in the adapter | js/ark/dash-kit.js, js/ark/blocks.js source (scripts/ark-blocks-adapter.js) | S