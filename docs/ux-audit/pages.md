# Page inventory and reachability audit — 2026-10-19

Owner directive: find dead, unused and orphaned pages; link them, merge them or drop them;
clean the journey; **no feature reduction**. This audit is read-only: no product file was
changed. Every number below was measured in a real browser, not read off the code.

Crawl data (TSV, one row per route / one row per link):
[`pages-crawl.tsv`](pages-crawl.tsv), [`pages-crawl-links.tsv`](pages-crawl-links.tsv).

## How this was measured

- **Route list:** derived, not hand-written. A probe page loaded `/` and read
  `Object.keys(ArkUI.pageCatalog)` after `js/pages/catalog.js` expanded the resolutions,
  how-chapters, lifecycle stages, articles and theory sheets: **69 routes**.
- **Host:** `tests/browser/harness.mjs` `copySite()` + `startHost()` on an OS-picked free port
  (never 3437), serving a scratch copy of the site. Chromium via Playwright.
- **Per route, at 1440x900 and 390x844:** direct load, then `routeSettled()` (router idle,
  page shown, finite animations ended). Collected every `a[href]` and `[data-scene-link]` in
  the document, tagged by region: `header` (core links), `mega` (Resolutions menu), `menu`
  ("All pages" layered menu), `page` (inside `[data-ark-page]`), `other` (outside both).
- **Links behind a click:** a second pass clicked every visible button / `summary` /
  `role=tab` inside each page once (skipping sign, create, delete, publish, copy, choose,
  unlock, import/export, deploy, connect, reset, save) and recorded route links that were not
  in the first DOM. 61 such links were found (44 distinct from-to route pairs) (tabs on `/concept`, steps on
  `/what-is-a-resolver`, disclosures on `/`, `/about`, the articles, and so on). They count as
  inbound links and are marked `after-click:` in the links TSV.
- **Fold ratio:** `max(document scrollHeight, page element scrollHeight, any inner scroller at
  least half the viewport tall) / innerHeight`. Owner rule: at most 1.6.
  A third pass checked that the routes reading exactly 1.00 really fit and are not clipping
  their content: it counted visible text runs outside an `overflow:hidden/clip` box. The only
  hits were the visually hidden h1 on `/chain` and one illustration label on
  `/what-is-a-resolver`, both deliberate. **No route clips its content.**
- **Errors:** `pageerror`, console `error`, and HTTP >= 400 or failed requests to the host.
- **Machine:** this Mac (8 CPUs), shared with other jobs. Load average was 14 to 41 during the
  runs, and the harness scaled every wait by its load factor (1.89 to 5.15). No route timed
  out and every route rendered at both widths (69/69 x 2).
- **Similarity:** word 4-gram shingles (Jaccard and containment) and bag-of-words cosine on
  each route's visible text at 1440. The text is what the first view shows, so pages that
  swap content by step are compared on their first step only.
- **Sitemap / llms.txt:** exact `<loc>` / `(url)` match against the files on disk.
- **CMS Pages tree:** `js/admin/studio.js` `studioRoutes()` builds the tree from
  `ArkUI.pageCatalog`, so **every one of the 69 routes is listed**. I did not open the
  editor. The tree's own orphan tag is a separate problem, covered in problem P7.

## Counts

| Class | Routes | Which |
|---|---|---|
| HEALTHY | 60 | 15 of them need a link, title or fold fix (see the table) |
| ORPHAN | 3 | `/start-from-something-real`, `/resolver-math`, `/stats/gpu` |
| DUPLICATE | 1 | `/experiments` (same page purpose and h1 as `/experiments/lab`, and orphaned too) |
| DEAD (stale) | 1 | `/concept/spec` (says no benchmark is verified, which the evidence registry contradicts) |
| DEMO/LAB | 4 | `/palette` (orphan, dead end), `/experiments/lab` (reachable only from an orphan), `/treasury`, `/deposits` |
| REDIRECT candidates | 2 after merges | `/experiments/lab` -> `/experiments`, and optionally `/concept/spec` -> `/stats` |
| **DROP** | **0** | No route is both dead and fully covered elsewhere. Nothing qualifies for deletion. |

Reachability:

- **Strict orphans**, with no inbound link from any page body even after clicks:
  `/start-from-something-real`, `/resolver-math`, `/palette`, `/experiments`, `/stats/gpu`.
  The first four are reachable only through the catch-all "All pages" menu.
- **Unreachable:** `/stats/gpu` has no inbound link anywhere. It is `hiddenFromNavigation`,
  not in the menu, not in the sitemap and not linked from any page. Its own header comment
  says "Reached from /stats", but `/stats` has no such link.
- **Orphan by chain:** `/experiments/lab` has one inbound link, from the orphan `/experiments`.
  The only other link to `/experiments` is the scene's corner navigation
  (`js/hero-motion.js:76-81`), which exists in the DOM on all 69 routes and is visible on none.
- **Dead ends**, with no outbound route link from the page body: `/palette`, `/resolvers`.
  `/reference` only has "Return to the explanation", and that link currently goes to Home
  (problem P1).
- **Near dead ends**, with one way out: `/account/domains` (-> account), `/bundle-deployer`
  (-> account), and `/treasury` and `/deposits`, which only link to each other.
- **Deepest paths.** Following only page-body links, the deepest route is depth 5:
  `/ > /about > /resolutions > /resolutions/payments > /treasury > /deposits`. Counting header
  links too, it is depth 4: `/ > /stats > how-we-got-fast > /learnings > <any other article>`.
  Every article other than how-we-got-fast is first reached at depth 4, through `/stats`.
  The articles have no header or Home entry apart from the menu.

## Top problems

**P1 — Every in-page document link opens the wrong document (site-wide, 71 links on 41 routes).**
`js/ark/dash-kit.js` `docHref()` writes `/reference?doc=<path>&from=<route>` and tags the link
`data-scene-link="reference"`. Then `js/hero-motion.js:101` rewrites every scene link's href to
`router.url(sceneLink) + (dataset.routeQuery ? '?' + … : '')`. No doc link carries
`data-route-query`, so the query is removed. On click, `navigate()` (`hero-motion.js:190`)
passes `query: source.dataset.routeQuery`, which is `undefined`. The reader then falls back to
`docs/protocol/agreements.md` with `from='/'`.

Verified by clicking:

- `/stats` "Full record · INFRA-001" opens "Agreements".
- `/resolutions/website` "Current status ↗" opens "Agreements".
- `/download` "Open the full operator guide ↗" opens "Agreements".
- `/about` opens "Agreements".

On every one of them "← Return to the explanation" then goes to Home. So every evidence link
on the site ("Read BENCH-005", "Resolver audit", "Operator guide", the article evidence lists)
lands on the same unrelated page.

**P2 — Three orphans plus one page nobody can reach.** `/start-from-something-real` lost its
only inbound link when `/what-is-a-resolver` was rebuilt on `js/pages/resolver-lab.js`. The
manifest field `RESOLVER.INSPECT.HREF = route:references` still exists, but
`js/pages/resolver-guide.js:53` only renders it in a branch that `page === 'resolver'` never
reaches. `/resolver-math` (described in its own header as "the foundational page") and
`/palette` have no inbound links. `/stats/gpu` has none at all.

**P3 — Two pages for one interactive model.** `/experiments` (75 words) and `/experiments/lab`
(68 words) have the same h1, "How can threshold agreement be pictured?", and the same
disclaimer. The first page's only call to action, "Explore the model", opens the second. Both
are in the sitemap and in llms.txt.

**P4 — Stale evidence page.** `/concept/spec` ("Benchmark evidence and limits") says "BENCH-001
has no complete public benchmark artifact" and "No current throughput, latency, scale … is
verified by the evidence registered here". `docs/evidence/registry.md` now lists BENCH-006,
-007, -009 and -012 as verified, and `/stats` publishes them. Its only inbound link is the
second tab of `/concept`.

**P5 — Fold budget broken on 11 routes** (owner rule: at most 1.6x the viewport):

| Route | Fold at 1440x900 | Fold at 390x844 |
|---|---|---|
| `/stats` | 12.53 | 20.63 |
| `/stats/ledger` | 8.89 | 14.50 |
| `/resolver-math` | 8.36 | 13.42 |
| `/resolvers` | 3.93 | 7.75 |
| `/palette` | 2.67 | 4.41 |
| `/` | 2.39 | 2.72 |
| `/about` | 2.08 | 2.65 |
| `/stats/gpu` | 1.89 | 3.09 |
| `/learnings` | 1.28 | 1.99 |
| `/how-deployment-works` | 1.00 | 1.84 |
| `/bundle-deployer` | 1.00 | 1.83 |

**P6 — Identity collisions.**

- `/about` has three names: its title is "About: everyone is our business partner", the header
  link says "Overview", and its h1 is "Resolutions for the mesh." That h1 is identical to the
  h1 of `/resolutions`.
- `/stats/ledger` and `/learnings/a-resolver-by-construction` have the same title, "A finance
  resolver by construction".

**P7 — The lists that describe the site are hand-written, and they have drifted** (law: derive,
don't author).

- **"All pages" menu** (`js/resolvers/header.js:521-530`): hand-written group arrays plus a
  catch-all into "Evaluate — Live local mesh data, evidence…". As a result, the design mocks
  `/treasury` and `/deposits`, the design-system `/palette`, `/chain` and `/resolvers` are
  filed under "live … evidence".
- **Sitemap** (`js/content/seo.js:130` `EXTRA_PAGES`): a second hand-written copy of catalog
  paths. Its `sitemap:false` flags duplicate `hiddenFromNavigation`.
- **CMS Pages-tree "orphan" tag** (`js/admin/rail.js` `realLinkIndex()`): built only from
  manifest `link` fields, which point at 16 targets. By that logic about 53 of the 69 paths
  would be tagged orphan, including all 20 resolutions, the lifecycle, the articles and the
  theory sheets, all of which are linked from code. It would also **not** tag
  `/start-from-something-real`, because its manifest link still exists even though nothing
  renders it. These figures are derived from the code; I did not observe them in the editor.

**P8 — Soft 404.** In `js/ark/page-router.js` `resolve()`, an unknown path falls back to
`'zero'`, so a mistyped or retired URL silently shows Home without saying what was missing.

**P9 — Environment only, not a page defect.** `/stats` gets 404 from `/api/chain-pulse` and
`/api/chain-fleet-capacity` on the harness host, at both widths. These endpoints are served by
`ops/chain-pulse-api.mjs`, not by the static host or by Vercel's `api/`. Production routing
for them was not verified.

**P10 — Fallback links bypass the site's reader.** The screen-reader `#fallback` section links
on every route point to raw `docs/*.md` files ("Read the source", "What is a resolver?",
"Read the protocol overview"). They should go to the in-site reader or the routes themselves.

## Full route table

Inbound means distinct routes whose page body links here, including links that appear after a
click. Chrome placement is in the crawl TSV.

| Route | Title | Class | Inbound | Fold 1440 | Fold 390 | Issues | Recommendation |
|---|---|---|---|---|---|---|---|
| `/` | Not one chain. A world of them. | HEALTHY | 15 | 2.39 | 2.72 | Over fold budget. "Walk the chain", "Inspect the evidence" and others are only behind the "More" disclosure. | Layer the long sections (keep them all); keep the 4 journey entries above the fold. |
| `/chain` | Every identity, its own chain | HEALTHY | 1 | 1.00 | 1.00 | Only inbound link is Home's "More" disclosure. | Link from `/how-deployment-works` ("See one record on its own chain"), `/explore` and `/learnings/why-the-chain-was-retired`. |
| `/what-is-a-resolver` | What is a resolver? | HEALTHY | 21 | 1.00 | 1.00 | Exits are Home and reference, plus `/how-deployment-works` after step 4. The "Inspect reference evidence" link was dropped. | Restore `INSPECT.HREF` -> `/start-from-something-real`; add "The math behind it" -> `/resolver-math` and "Browse resolvers" -> `/resolvers`. |
| `/start-from-something-real` | Source evidence and current limits | ORPHAN | 0 | 1.00 | 1.00 | No inbound link (menu only). | Link from `/what-is-a-resolver` (restore the existing field) and `/resolvers` ("Reference evidence"). |
| `/how-deployment-works` | From network ID to receipt | HEALTHY | 7 | 1.00 | 1.84 | Over fold budget at 390. | Fit the phone layout (stack the chapters as steps). |
| `/explore` | Mesh Explorer | HEALTHY | 16 | 1.00 | 1.00 | Exits: reference (P1), resolver, Home. | Add "Walk one chain" -> `/chain` and "Measured performance" -> `/stats`. |
| `/palette` | Interface palette | DEMO/LAB | 0 | 2.67 | 4.41 | Orphan; dead end; filed under "Evaluate/live". | Keep. Link from the settings/theme panel ("See the full palette"); move to a "Design system" menu group; add Home and settings exits. |
| `/stats` | Mesh performance | HEALTHY | 13 | 12.53 | 20.63 | 20x the fold on a phone. No link to `/stats/gpu`. 404s to `/api/chain-*` (P9). | Add the `/stats/gpu` link. Layer the sections into sub-routes or disclosures (`/stats/gpu` and `/stats/ledger` already show the pattern). |
| `/stats/gpu` | The GPU does nothing here | ORPHAN | 0 | 1.89 | 3.09 | Unreachable (hidden, not linked, not in the sitemap). | Link from `/stats` at the compute-bound claim ("The GPU, and 'it is not compute-bound'") and from `/learnings/how-we-got-fast-and-what-we-got-wrong`. |
| `/stats/ledger` | A finance resolver by construction | HEALTHY | 3 | 8.89 | 14.50 | Same title as the article; over fold budget. | Retitle "Ledger benchmark detail" (the label `seo.js` already uses); layer the sections. |
| `/resolver-math` | Resolver Math | ORPHAN | 0 | 8.36 | 13.42 | No inbound link; over fold budget. | Link from `/what-is-a-resolver` (Laws step), `/resolvers` and `/concept`; layer the sections. |
| `/resolvers` | FXN resolvers | HEALTHY | 2 | 3.93 | 7.75 | Dead end (0 exits); over fold budget. | Add a crumb back to `/what-is-a-resolver`, plus "Resolver math", "Reference evidence" and "Create or join a network" (`/deploy`); collapse the per-resolver detail. |
| `/account` | Your account | HEALTHY | 13 | 1.00 | 1.00 | `/admin` link is hidden unless publishing is available locally (not broken). | None. |
| `/account/domains` | Your domains | HEALTHY | 5 | 1.00 | 1.00 | One exit (account). | Add "Resolve your website" (`/resolutions/website`) and "Deploy a bundle" (`/bundle-deployer`). |
| `/treasury` | Treasury design preview | DEMO/LAB | 2 | 1.00 | 1.00 | Mock; filed under "live" in the menu; one exit. | Keep. Move to a "Previews" menu group; add exits to `/resolutions/payments` and `/account`. |
| `/deposits` | Deposit design preview | DEMO/LAB | 1 | 1.00 | 1.00 | Mock; only reachable from `/treasury`; one exit. | Keep as the treasury's second step; add an exit to `/resolutions/payments`. |
| `/experiments` | Explore the interactive model | DUPLICATE | 0 | 1.00 | 1.00 | Same h1 and model as `/experiments/lab`; orphan (only the invisible corner navigation links here). | Merge: `/experiments` mounts the lab, and this page's lede and disclaimer become the lab's intro; redirect `/experiments/lab` here. |
| `/experiments/lab` | Interactive model lab | DEMO/LAB | 1 | 1.00 | 1.00 | Reachable only from an orphan. | After the merge, link from `/concept/practice` ("See the analogy"), `/lifecycle` and `/dao`. |
| `/learnings` | Protocol notes | HEALTHY | 7 | 1.28 | 1.99 | Over fold budget at 390; no header or Home entry. | Add a "Notes" entry to the footer strip (see the site map); fit the phone layout. |
| `/about` | About: everyone is our business partner | HEALTHY | 2 | 2.08 | 2.65 | h1 duplicates `/resolutions`; three names; over fold budget. | Make the title, h1 and header label one name; layer the sections. |
| `/resolutions` | Resolutions for the mesh | HEALTHY | 21 | 1.00 | 1.00 | None. | None. |
| `/concept` | The operating model | HEALTHY | 8 | 1.00 | 1.00 | Three of its six children only appear under its second tab. | Add a link to `/resolver-math` in the evidence tab. |
| `/download` | Run from source | HEALTHY | 4 | 1.00 | 1.00 | Evidence link affected by P1. | None beyond P1. |
| `/bundle-deployer` | FXN Bundle Deployer | HEALTHY | 5 | 1.00 | 1.83 | One exit (account); over fold budget at 390. | Add "Run from source" and "Resolve your deployments" exits; fit the phone layout. |
| `/deploy` | Create or join a network | HEALTHY | 7 | 1.00 | 1.23 | None. | None. |
| `/dao` | Governance boundaries | HEALTHY | 5 | 1.00 | 1.00 | Exits are only the concept sheets. | Add "Resolve your governance" and the model analogy (after the merge). |
| `/resolutions/website` | Resolve your website | HEALTHY | 3 | 1.00 | 1.00 | P1 on its status link. | None. |
| `/resolutions/content` | Resolve your content | HEALTHY | 3 | 1.00 | 1.00 | P1. | None. |
| `/resolutions/files` | Resolve your files | HEALTHY | 3 | 1.00 | 1.00 | P1. | None. |
| `/resolutions/deployments` | Resolve your deployments | HEALTHY | 3 | 1.00 | 1.00 | P1. | None. |
| `/resolutions/payments` | Resolve your payments | HEALTHY | 3 | 1.00 | 1.00 | P1. | None. |
| `/resolutions/finance` | Resolve your personal finance | HEALTHY | 3 | 1.00 | 1.00 | P1. | Add `/treasury` (preview) as for payments. |
| `/resolutions/community` | Resolve your community | HEALTHY | 3 | 1.00 | 1.00 | P1. | None. |
| `/resolutions/communications` | Resolve your communications | HEALTHY | 3 | 1.00 | 1.00 | P1. | None. |
| `/resolutions/collaborations` | Resolve your collaborations | HEALTHY | 3 | 1.00 | 1.00 | P1. | None. |
| `/resolutions/governance` | Resolve your governance | HEALTHY | 3 | 1.00 | 1.00 | P1. | None. |
| `/resolutions/intelligence` | Resolve your intelligence | HEALTHY | 3 | 1.00 | 1.00 | P1. | None. |
| `/resolutions/data` | Resolve your data | HEALTHY | 3 | 1.00 | 1.00 | P1. | None. |
| `/resolutions/algorithms` | Resolve your algorithms | HEALTHY | 3 | 1.00 | 1.00 | P1. | Add `/resolvers` and `/resolver-math` (publishing an algorithm = a resolver). |
| `/resolutions/information` | Resolve your information | HEALTHY | 3 | 1.00 | 1.00 | P1. | None. |
| `/resolutions/rules` | Resolve your rules and patterns | HEALTHY | 3 | 1.00 | 1.00 | P1. | Add `/resolver-math`. |
| `/resolutions/network` | Resolve your network | HEALTHY | 3 | 1.00 | 1.00 | P1. | None. |
| `/resolutions/encryptions` | Resolve your encryptions | HEALTHY | 3 | 1.00 | 1.00 | P1. | None. |
| `/resolutions/automation` | Resolve your automation | HEALTHY | 3 | 1.00 | 1.00 | P1. | None. |
| `/resolutions/productivity` | Resolve your productivity | HEALTHY | 3 | 1.00 | 1.00 | P1. | None. |
| `/resolutions/logistics` | Resolve your logistics | HEALTHY | 3 | 1.00 | 1.00 | P1. | None. |
| `/how-deployment-works/ask` | State the request | HEALTHY | 2 | 1.00 | 1.45 | Hidden from nav by design; linked from the chapter flow. | None. |
| `/how-deployment-works/work` | Agree on the terms | HEALTHY | 3 | 1.00 | 1.50 | Same. | None. |
| `/how-deployment-works/check` | Verify the result | HEALTHY | 2 | 1.00 | 1.48 | Same; journey ends at the receipt stage. | Add "Run it yourself" -> `/download` as the closing step. |
| `/lifecycle` | Agreement lifecycle | HEALTHY | 15 | 1.00 | 1.00 | P1 on its evidence link. | Link to `/experiments` (model) after the merge. |
| `/lifecycle/intent` | Intent: state the need | HEALTHY | 6 | 1.00 | 1.00 | None. | None. |
| `/lifecycle/offer` | Offer: propose the terms | HEALTHY | 5 | 1.00 | 1.00 | None. | None. |
| `/lifecycle/agreement` | Agreement: accept shared terms | HEALTHY | 6 | 1.00 | 1.00 | None. | None. |
| `/lifecycle/fulfillment` | Fulfillment: submit the result | HEALTHY | 5 | 1.00 | 1.00 | None. | None. |
| `/lifecycle/receipt` | Receipt: close the evidence trail | HEALTHY | 6 | 1.00 | 1.00 | Final stage; exits loop back into the lifecycle. | Add the next step out: `/explore` (inspect a real record) or `/download`. |
| `/learnings/why-the-chain-was-retired` | From one chain to one per identity | HEALTHY | 2 | 1.00 | 1.11 | P1 on its evidence list. | Link to `/chain`. |
| `/learnings/one-substrate-many-networks` | One substrate, many networks | HEALTHY | 2 | 1.00 | 1.05 | P1. | None. |
| `/learnings/governance-without-a-validator-set` | Governance without a validator set | HEALTHY | 2 | 1.00 | 1.01 | P1. | None. |
| `/learnings/how-we-got-fast-and-what-we-got-wrong` | How we got fast, and everything we got wrong | HEALTHY | 3 | 1.00 | 1.58 | P1. | Link to `/stats/gpu`. |
| `/learnings/the-grammar-does-almost-no-work` | The grammar does almost no work | HEALTHY | 2 | 1.00 | 1.31 | P1. | Link to `/resolver-math`. |
| `/learnings/a-resolver-by-construction` | A finance resolver by construction | HEALTHY | 2 | 1.00 | 1.56 | Title collides with `/stats/ledger`. | Keep the title (it is the narrative); retitle the ledger dashboard instead. |
| `/learnings/the-chain-prototype-is-the-chosen-path` | The chain prototype is the chosen path | HEALTHY | 2 | 1.00 | 1.47 | P1. | None. |
| `/concept/purpose` | Network isolation today | HEALTHY | 3 | 1.00 | 1.00 | None. | None. |
| `/concept/depth` | Verifiable agreements | HEALTHY | 2 | 1.00 | 1.00 | Overlaps `/lifecycle` in purpose (cosine 0.62), but it is the "why" layer above it; keep. | None. |
| `/concept/practice` | Authority for a transition | HEALTHY | 4 | 1.00 | 1.00 | None. | Link to the merged model ("See the analogy"). |
| `/concept/notes` | Approval and activation | HEALTHY | 3 | 1.00 | 1.00 | None. | None. |
| `/concept/studio` | Verify a named network | HEALTHY | 2 | 1.00 | 1.00 | None. | None. |
| `/concept/spec` | Benchmark evidence and limits | DEAD (stale) | 1 | 1.00 | 1.00 | Claims contradict `docs/evidence/registry.md` and `/stats` (P4). | Rewrite it to cite the registry's current statuses and link `/stats`, `/stats/gpu` and `/stats/ledger`. Or merge the evidence standard into `/stats` as a disclosure and redirect here. Owner call; the content is kept either way. |
| `/reference` | Canonical reference | HEALTHY (utility) | 40 | 1.00 | 1.58 | Always shows `agreements.md`; "Return" goes to Home (P1). | Fix P1. |

No route failed to render, and none showed a page error. The only console errors were the two
`/stats` 404s from P9. The only link that does not resolve to a catalog route is `/admin` on
`/account`, which is hidden and served by the host, so it is not a defect. Text overlap
between routes is low everywhere: the highest pair outside the resolutions family has Jaccard
0.08. The 20 resolution pages share a template (containment up to 0.55). That is by design
(one canonical page per resolution), not duplication. Duplication on this site is a matter of
purpose and title, not of copied text.

## Proposed site map

The site has four kinds of visitor. Each route's group should be **derived from one field on
its catalog entry**, for example `journey: 'understand' | 'build' | 'prove' | 'run' |
'read' | 'preview'`. The menu, the sitemap, the footer strip and the CMS Pages tree would all
read that one field instead of the hand-written lists in `header.js` and `seo.js`.

1. **Understand — "what is this?"**
   - Arrives at: `/`.
   - Path: `/about` (Overview) -> `/how-deployment-works` -> its three chapters ->
     `/lifecycle` and the five stages.
   - Deeper: `/chain`, `/concept` and its six sheets, `/experiments` (merged model).
   - Next step: Resolutions or Run.
2. **Build — "I want to resolve X."**
   - Arrives at: the Resolutions mega menu or `/resolutions`.
   - Path: `/resolutions/<x>` -> its tool: `/bundle-deployer`, `/account/domains`, `/deploy`,
     or `/treasury` (preview) -> `/account`.
   - Resolver builders: `/what-is-a-resolver` -> `/resolver-math` -> `/resolvers` ->
     `/start-from-something-real`.
3. **Prove — "show me it is real."**
   - Path: `/stats` -> `/stats/ledger`, `/stats/gpu` -> Notes articles -> evidence documents
     in `/reference` (once P1 is fixed).
   - Live view: `/explore`.
   - Evidence standard: `/concept/spec` (rewritten).
4. **Run — "I operate a node."**
   - Path: `/download` -> `/deploy` -> `/bundle-deployer` -> `/explore` -> `/stats`.
5. **Read.** `/learnings` and the seven articles. They are reachable from the menu and `/stats`
   today; add a footer entry.
6. **Previews and lab, clearly labelled.** `/treasury`, `/deposits`, `/experiments`, `/palette`
   (design system).

Chrome:

- **Header:** keep the six core links (Overview, How it works, Mesh Explorer, Stats, Account,
  Run DEFXN) and the Resolutions mega menu. Add a "Resolvers" column to the mega menu with
  `/what-is-a-resolver`, `/resolver-math`, `/resolvers` and `/start-from-something-real`.
- **"All pages" menu:** groups Understand, Build, Prove, Run, Read, Previews & lab, all derived
  from the catalog field. No catch-all. Mocks must not sit under "live evidence".
- **Footer strip:** the site has none today (0 footer links on 69 routes). The scene's corner
  navigation (`js/hero-motion.js:76-90`: Spec, Notes, Interactive model, plus the theory
  invitation) is built on every route and visible on none. Make it the footer strip, derived
  from the same groups, so it does not cost fold height on the one-screen pages. Or remove the
  invisible DOM. It must not remain the only link to a page.

## Next-step links: every page leaves somewhere

| Page | Add "next step" |
|---|---|
| `/what-is-a-resolver` | "Inspect reference evidence →" `/start-from-something-real` (existing `INSPECT.HREF`) · "The math behind it →" `/resolver-math` · "Browse resolvers →" `/resolvers` |
| `/start-from-something-real` | already -> `/how-deployment-works` (meta.next); keep |
| `/resolver-math` | "Browse resolvers →" `/resolvers` |
| `/resolvers` | "← What is a resolver" · "Resolver math" · "Reference evidence" · "Create or join a network" `/deploy` |
| `/palette` | "← Home" · "Theme settings" |
| `/stats` | "The GPU, and 'it is not compute-bound' →" `/stats/gpu` |
| `/explore` | "Walk one chain →" `/chain` · "Measured performance →" `/stats` |
| `/account/domains` | "Resolve your website →" · "Deploy a bundle →" |
| `/bundle-deployer` | "Run from source →" `/download` · "Resolve your deployments →" |
| `/treasury`, `/deposits` | "← Resolve your payments" · "Your account" |
| `/how-deployment-works/check` | "Run it yourself →" `/download` |
| `/lifecycle/receipt` | "Inspect a real record →" `/explore` |
| `/concept/practice`, `/lifecycle`, `/dao` | "See the analogy →" `/experiments` (merged) |
| `/how-deployment-works`, `/learnings/why-the-chain-was-retired` | "One record on its own chain →" `/chain` |
| `/learnings/how-we-got-fast-and-what-we-got-wrong` | "The GPU box →" `/stats/gpu` |
| `/learnings/the-grammar-does-almost-no-work`, `/resolutions/rules`, `/resolutions/algorithms` | "Resolver math →" `/resolver-math` |

## Action list

Each action is fixed once, in the place that owns it. None removes a feature.

**Fix (site-wide)**

1. **P1, doc links.** Make doc links carry their query. Do it in the one place that builds
   them: `js/ark/dash-kit.js` `docHref`, `docLink`/`linkEl` for `doc:` should set
   `a.dataset.routeQuery = 'doc=…&from=…'`. Alternatively, `js/hero-motion.js:101` could keep
   an existing `?search` when it rewrites hrefs. Add a browser regression that clicks a doc
   link and asserts the reader's h1 is that document. This restores 71 links on 41 routes and
   makes "Return to the explanation" go back to the origin page.
2. **P8, unknown paths.** Make `js/ark/page-router.js` `resolve()` render a not-found state
   that names the path and offers the nearest route, instead of silently showing Home (law: a
   refusal names what it needs).

**Link**

3. `/stats` -> `/stats/gpu` (makes the one unreachable page reachable).
4. `/what-is-a-resolver` -> `/start-from-something-real`: render the existing
   `RESOLVER.INSPECT.HREF` inside `resolver-lab.js` (the branch in `resolver-guide.js:53` is
   dead for this page).
5. `/what-is-a-resolver`, `/resolvers`, `/concept` (evidence tab), the grammar article,
   `/resolutions/rules` and `/resolutions/algorithms` -> `/resolver-math`.
6. `/resolvers`: add the exits listed above (it is a dead end today).
7. `/palette`: link from the theme settings panel (`js/settings/panel.js`) and give it exits.
8. Add the remaining next-step links from the table above: chain, account/domains,
   bundle-deployer, treasury/deposits, how/check, lifecycle/receipt, explore, articles.
9. Corner navigation: turn the invisible `js/hero-motion.js` corner navigation into the visible
   footer strip derived from the catalog groups.

**Merge (and redirect)**

10. `/experiments` + `/experiments/lab` become one "Interactive model" at `/experiments`. Use
    the lab module, with the `/experiments` lede and disclaimer as its intro. Add
    `/experiments/lab` -> `lab` as a `resolve()` alias, the same pattern as `/work`, `/explorer`
    and `/monitor`. Update `seo.js` and llms.txt to one entry.
11. `/concept/spec`: rewrite it against `docs/evidence/registry.md`. Or move the evidence
    standard into `/stats` as a disclosure and alias `/concept/spec` -> `stats`. Owner
    decision; either way the evidence-standard text is kept.

**Rename**

12. `/stats/ledger`: title "Ledger benchmark detail" (already its `seo.js` label), so it no
    longer collides with the article.
13. `/about`: one name for title, h1 and header label. The h1 "Resolutions for the mesh."
    belongs to `/resolutions`.

**Derive instead of authoring**

14. Add a `journey` field to each `ArkUI.pageCatalog` entry. The "All pages" menu
    (`header.js:521-530`), the sitemap list (`seo.js` `EXTRA_PAGES`) and the footer strip
    should all read it. Retire the hand-written arrays and the catch-all.
15. Compute the CMS Pages-tree orphan tag (`js/admin/rail.js`) from the rendered link graph
    (or the same resolver the pages use), not from manifest `link` fields alone. Today's logic
    flags about 53 linked pages and misses the real orphan `/start-from-something-real`.

**Fold (layer, never cut)**

16. Layer `/stats`, `/stats/ledger`, `/resolver-math`, `/resolvers`, `/palette`, `/` and
    `/about` into disclosures or sub-routes, following the pattern `/stats/gpu` and
    `/stats/ledger` already set. Fit the 390-wide layouts of `/how-deployment-works`,
    `/bundle-deployer`, `/learnings` and `/stats/gpu`.

**Drop**

17. **None.** No route is dead with its content covered elsewhere. The two merges (10, 11) keep
    every piece of unique content.

**Verify (not a page defect)**

18. Check production routing for `/api/chain-pulse` and `/api/chain-fleet-capacity`
    (`ops/chain-pulse-api.mjs`). Point the `#fallback` screen-reader links at routes or the
    in-site reader instead of raw `docs/*.md`.
