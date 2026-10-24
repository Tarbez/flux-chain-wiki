# Content audit, 2026-10-24

Reader: the owner and the agents who edit the DEFXN site. Job: show which words were checked, which were false or unproven, and what changed.

Rule used: a claim stays only if code or a dated document proves it. Otherwise it is rewritten as what is true, or removed, and listed under the questions at the end. Sources: `docs/status.md`, `docs/FXN-NODE-ARCHITECTURE-2026-10-23.md`, `docs/DEFXN-NAMES-ONE-SYSTEM.md`, `js/content/fxn-data.js`, `js/content/network-data.js`, `resolution-products.js`, the `ark-miner-cli` package, and the Resolver Studio README.

## What was wrong, in short

1. Three pages promised "No database. No hosting. No fees. No cloud." The owner has decided a fee split, no hosting is public, and nodes still run on servers.
2. Pages called FXN "the DEFXN coin". The kernel has no currency, and FXN is the first chain.
3. The resolutions pages implied twenty products. They are ideas, and only some pieces exist.
4. Several "ready" products were not proven ready (names, gateway, agreements, monitor).
5. The mockup views carried claims with no source (credits "bought only with the network's coin", "10 cases", unlabelled sample records).

## Per-page table

Status key: F = false or unproven claim, V = vague or jargon, S = sample not labelled, OK = checked and kept.

| Route | What it claims | Finding | Fix |
| --- | --- | --- | --- |
| `/about` | "Mesh is the database, host and cloud". "No database, no hosting, no fees, no cloud". "Self-scaling fractal network". "Everyone is our business partner". "DEFXN coin: FXN". "Yearly renewals become permanence". | F, V. No public hosting exists. A fee split is decided. The kernel has no coin. No scaling or permanence is shown. | Rewrote the intro, the four "No" blocks, the three pillars and the flow. Fees now read as an owner decision that is not in code. |
| `/resolutions` | Twenty "Resolve your X" lines. "Ready to use today". Promise line "No database...". | F, V. Lines read as shipped products. | Each line now says what it is and which part is a proposal or a preview. Promise line says development network only. |
| `/resolutions/*` (20) | Shift, old way, three steps, products, ideas. | Ideas are labelled proposals. "Permanent" and "durable" were claims. Four "ready" products were not proven. | Removed "permanent" and "durable". See the product shelf below. |
| Product shelf (`resolution-products.js`) | Names, gateway, agreements, monitor are "ready". | F. Names can be claimed only by the genesis key. The agreement path is the earlier path. The monitor page is benchmarks, not live health. | Set those four to "building" with the true limit in the line. Explorer and networks lines now say development network and discovery only. |
| `/what-is-a-resolver` | Launch, capabilities, grammar, providers. | OK. Matches status rows CAP-010 to CAP-016. | None. |
| `/resolvers` | Dated snapshot of chains and capabilities. | OK. States it is a snapshot. | None. |
| `/start-from-something-real` | No reference resolver is published. | OK in the page. The SEO text said "Inspect source-backed reference evidence". | SEO and llms text now say none is published. |
| `/how-deployment-works` and 3 chapters | Six steps. Earlier agreement path kept read-only. | OK. Says public hosting is not established. | None. |
| `/lifecycle/*` | Illustrative request. | OK. Labelled illustrative. | None. |
| `/concept`, `/concept/*` (6) | Presence-only networks, authority cells, benchmarks. | OK. Heavy jargon, but every limit is stated. Spec page names six verified records. | None. See question 9. |
| `/dao` | Two governance scopes. | OK. Says no public example is established. | None. |
| `/deploy` | Named networks isolate miner presence only. | OK. | None. |
| `/download` | Node 22, `flux-miner`, source checkout. "Get the apps": four apps. | Node and command confirmed in `ark-miner-cli/package.json`. The four apps have empty links. The phone app "runs a full mesh node": unproven. Read-only for me. | Report only. |
| `/bundle-deployer` | Not released. | OK. | None. |
| `/chain` | Every identity, its own chain. | OK. | None. |
| `/chain/record`, `/chain/open`, `/chain/links` | Sample records. | S. Only some related records said "sample". "Personal chain" crumb. "Anyone can check it, at any time". | Every title line now ends "· Sample". Crumb reads "Your chain". Check line says "anyone with your public key". |
| `/measured` | Capabilities, checked cases, runs. | S, F. The "10 cases" tag was a fixed mockup string. The rules note was an instruction to the writer. | Removed the tag and its field. Rewrote the note for the reader. |
| `/fxn` | Supply, fees, money tab. | F. Credits "bought only with the network's coin" has no source. Coin line stated DARO and CR3 as fact. Public sale per identity had no amount. | Credits: identity-bound, not sendable, purchase not decided. Coins: planned, none live. Sale: 50,000 FXN per identity, owner decision. |
| `/ring` | Kinds of chain. | OK as a picture. Hub and named networks were stated as fact. | DeArk and CR3TV are now "planned network chains". Ledger and token lines say planned. |
| `/how-it-works` (minute) | "Every result is signed". "Other computers keep a copy". "No trust in a company". | F, V. | Now "A resolver signs its results", and "can keep a copy". Another agent replaces this page. |
| `/how-it-works/resolve` | Alice and Bob swap. | OK. Labelled illustration. "Makes it true" was wrong. | "Makes it count". |
| `/how-it-works/layers` | Three layers. | F in part. "Launched once with a hash of its source" and "the network team builds N resolvers". | Hash is of the source the cases ran against. Count line says "first-party resolvers are listed". |
| `/how-it-works/life` | Build to inspect. | OK for Resolver Studio (README confirms the node canvas). Explore line over-claimed. | Explore line says development network and browser re-check. |
| `/trace` | Sample chain. | OK. Labelled. | None. |
| `/stats`, `/stats/gpu`, `/stats/ledger` | Measured figures. | OK. Dated and bounded. | None. |
| `/explore`, `/treasury`, `/deposits`, `/palette`, `/experiments`, `/learnings` | Previews and labs. | OK. Labelled as previews or mocks. | None. |
| `/` (home) | "Anyone can run a node. You can run yours today, in your browser." Status "20-35 TX/S, light load", dated 2026-10-05. | F. `/download` says a source checkout, and public binaries are unverified. The rate is stale and conflicts with `docs/status.md`. | Report only. |
| `/account`, `/identity/*`, `/intro` | Sign-in and first-visit screens. | Not audited in depth. SEO text for the identity routes was missing. | SEO text added. |
| Nav | Tagline "QUERY IT, DON'T GUESS AT IT". | V. | "SIGNED RECORDS · DEVNET". |
| SEO and `llms.txt` | Description for about, resolutions, 20 resolutions, references. 15 new routes had none. | F (same as pages). | Rewrote them. Added 15 route entries. Patched the matching lines in `llms.txt`. |

## Fixes made

Files changed:
- `js/content/manifests/about.js`, `resolutions.js`, `nav.js`
- `js/content/manifests/worldchain.js`, `worldmeasure.js`, `worldworks.js` (words, and a human label for every field)
- `js/content/resolution-products.js`, `js/content/resolutions.js`, `js/content/seo-data.js`, `llms.txt`
- `js/pages/world-chain.js` (sample tag on every record title), `js/pages/world-measure.js` (removed the fixed tag)
- `tests/seo-content.cjs` (the 15 new route ids)

Not touched: `worldidentity.js`, `world-identity.js`, `home.js` manifest, `download.js` manifest, `js/pages/home.js`, `account.js`, `intro.js`.

Build note: `js/min/` holds built copies of `resolution-products.js`, `world-measure.js` and others. Run `npm run build:pages` to refresh them. I did not run it, because it would also rewrite other agents' files.

## Questions for the owner

1. May the site say any product is "ready" while everything runs on a development network? I kept "ready" for authkit, broker, code, packages, networks, explorer, resolvers. Packages and code have no row in `docs/status.md`.
2. Is the `label.defxn.com` gateway in service? I set it to "building" because names cannot be claimed in public yet.
3. DeArk with coin DARO and CR3TV with coin CR3: are these decided? Only the home brief and `network-data.js` name them.
4. How are credits bought? The old text said "only with the network's coin". Nothing proves it.
5. Is "Anyone can run a node, in your browser" on home true? The code says source checkout only.
6. The home status tile "20-35 TX/S" is dated 2026-10-05. May it be removed, given `docs/status.md` retires per-second rates?
7. Do the four apps on `/download` exist? Their links are empty.
8. Are the ring state labels Built (identity) and Partial (kernel, resolver) right? `docs/status.md` calls per-identity records Live and the rest Partial.
9. The concept pages are accurate but dense. Do you want a plain-words pass on them?
10. The 65% and 35% fee split and the 50,000 FXN cap come from owner decisions in `fxn-data.js`. They stay labelled "not in code yet". Say when that changes.
11. Which "Resolve your X" ideas do you want to keep? Many have no product behind them.

## FXN allocation check

I checked `js/content/fxn-data.js` and the `/fxn` page against dense-wire main `a3dc2e8` (`src/fxn_genesis.rs`, genesis commit `e80fef5`). The rows and percentages match: mining 47, investing fund 3, public sale 10, service fund 5, buyback 3, creator 9, co-founder 6, operations 17. I added the release rules the code sets and marked the limits the owner has not set. The buyback rule that places slices is not built. The local devnet node runs code from before 2026-10-23, so nothing reads its allocation. `/treasury` and `/deposits` show no allocation. The `/download` links in the site table, the Bundle Deployer page and the deploy page now read "Get DEFXN Grid". The `spec` and `deploy` manifests still read "Run DEFXN from source" on their back links.
