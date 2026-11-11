# Claims audit, 2026-11-10

Layer: app (the defxn site). Read-only audit. No site file was changed.

This is for the site session and FXN Genesis. It lists every claim the site can show today, and says if the devnet release measured it.

## The two owner rules

- Rule 1 (2026-11-10): every page shows only the current number for the build that goes to devnet. Remove every older figure.
- Rule 2 (2026-11-10): no number is typed by hand. A number is read live from the chain, or it is not shown.

## The devnet build

- The devnet build is release 1 of kernel main `63353a01` (`flux/defxn-defi-rs`, commit of 2026-11-09 18:11 +0200).
- Genesis may move the head today. Rerun the source checks below against the new head.
- No payment rate has been measured on this build. Nothing is live.
- The perf resolver (KPERF1, KPERF2) is not in release 1 yet. Until it is, every speed block reads "Not measured yet".

## How the subjects were found

The pages come from `js/content/site-pages.js` PAGES and TOPICS, and from the routes `js/pages/catalog.js` derives. The claims were found by grep, not from a list. The grep looked for a digit before `/s`, `ms`, `keepers`, `nodes`, `chains`, `machines` or `FXN`, and for the words `live`, `final`, `ready`, `measured`, `prototype` and `UPDATE`.

Rule values were checked in the release tree with `git grep <pattern> 63353a01` in `flux/defxn-defi-rs`. Nothing was built.

### Pages the router shows

| Route | Module | Content it reads |
|---|---|---|
| `/` (zero) | `js/pages/home.js` | `HOME.WORLD.*`, `network-data.js`, `resolvers-data.js`; footer `js/hero-motion.js` |
| `/intro` | `js/pages/intro.js`, `js/space/intro.mjs` (the film), the cinema that fxn-3d serves | `HOME.LANDING.*` |
| `/learn` | `js/pages/learn.js` | `speed-facts.js`, `topics.js` |
| `/fxn/<12 topics>` | `js/pages/topic.js` | `topics.js`, `speed-facts.js`, `HOME.LANDING.RING/ABILITY` |
| `/auth` | `js/pages/auth.js` | its own strings |
| `/account` | `js/pages/account.js` | live wallet reads, its own strings |
| `/download` | `js/pages/download.js` | `DOWNLOAD.*` |
| `/learnings/<slug>` (7 articles) | `js/pages/article.js` | `js/content/articles/*.js`. The family `article/` is NOT retired. |
| every page | the world under every page, `js/world2/world2-props.mjs` | focus-card facts |
| hidden | `/kit`, `/not-found` | no claims found |

### Retired pages (skipped)

These are in RETIRED and each opens another page: works, learnings, resolutions, resolvers, explorer, stats/now, chain, identity, ring, about, palette, treasury, deposits, reference, the three how/* pages, lifecycle with its five stages, resolver, references, resolver-math, concept, dao, account/domains, bundledeployer, stats/capabilities, stats/ceiling, chain/record, chain/open, chain/links, trace, identity/sign, identity/safe, identity/you, works/resolve, works/layers, works/life, fxn and deploy.

The families `resolutions/*` and `concept/*` are retired too.

Caveat: `catalog.js` keeps the module of resolver-math, concept, dao and reference, so Notes can open them in place. Notes is retired as well, so nothing should open them. Check this in the edit round.

## Verdict key

- **yes**: a rule written in release `63353a01` source. The file is named.
- **no**: not measured on the release. It may be from a prototype, an older build or another machine, or it may be a drawing.
- **unknown**: no source found, or the source is not the release.
- **absent**: the line says something is not live or not measured. It claims nothing, so it stays.

LIVE SOURCE names the release command or record kind that would feed the claim. "none: remove" means no release source exists. "none: rule text" means the claim is a sentence with no number to read.

## Claim table

| page | file:line | claim text | source | measured on devnet release? | LIVE SOURCE | action |
|---|---|---|---|---|---|---|
| home | `js/pages/home.js:46-52` (data `js/content/network-data.js:50-65`) | "3 Networks" | rings of the owner's picture (2026-10-23). The file says "the shapes show kinds, not live chains". | no | PEER_COUNT is nodes, not networks. No release command counts networks: none: remove | remove |
| home | same | "26 Chains" | rings drawn in the picture (15 rings + 12 inner, minus the hub) | no | none: remove | remove |
| home | `js/pages/home.js:51` (data `js/content/resolvers-data.js`, derived 2026-10-23) | "15 Resolvers" | folder count of `dense-wire/resolvers/` on 2026-10-23 | unknown (not counted on the release) | STATS_LIVE per-resolver rows (resolvers that answered in the window) | replace with the STATS_LIVE count, or "No node answered" |
| home | `js/content/manifests/home.js:235` | "DEFXN is the kernel. Chains run on it." | brand rule | yes (design rule) | none: rule text | keep |
| home | `js/content/manifests/home.js:241` | "Networks and chains that share one set of rules." | brand rule | yes (design rule) | none: rule text | keep |
| every page | `js/hero-motion.js:112-113` | "FXN · No price yet" | absent state | absent | FXN_SALE (in release) | keep |
| every page | `js/hero-motion.js:83-96` | a price read from FXN_SALE on the selected node | the node that answers today is not the release devnet | no (no release node is up) | FXN_SALE, only from a release node | keep the reader, but paint a price only when the node reports release `63353a01` |
| every page (3D) | `js/world2/world2-props.mjs:22,68` | "Machines 20", "Lit at most 16" | memory "Devnet: 16 of 20 machines" (hand-typed) | no | PEER_COUNT | replace with PEER_COUNT, or remove the facts |
| every page (3D) | `js/world2/world2-props.mjs:22,45` | "Pages 12" (your chain as a book) | drawing constant | no | none: remove | remove the fact |
| every page (3D) | `js/world2/world2-props.mjs:62` | "Products n" (count of lanes) | site catalog count | unknown | none: remove | remove the fact |
| intro portal | `js/content/manifests/home.js:475` | "Today it runs as our development network. Genesis is next." | the devnet is not started | no | none: rule text | reword: "Devnet genesis is next." |
| intro ring | `home.js:769` (S1.STATUS) | "Live today at /auth." | key make runs in the browser. The FXN ID gate is not on a release node. | unknown | none: rule text | reword: "Opens at /auth. Your device makes the key." |
| intro ring, /fxn/records | `home.js:787` | "Built, not live." | release has the record path | absent | none | keep |
| intro ring, /fxn/keepers | `home.js:805` | "Built, not live." | | absent | none | keep |
| intro ring, /fxn/capacity | `home.js:817` | "A share of the fees. Nothing has paid out yet." | KEEP_EARNED is in release | yes (rule) + absent | KEEP_EARNED | keep |
| intro ring, /fxn/capacity | `home.js:823` | "Built, not live. Not open to the public yet." | | absent | none | keep |
| intro ring, /fxn/names | `home.js:859` | "Opens after genesis." | dense-wire names rule | absent | none | keep |
| intro ring, /fxn/game | `home.js:877` | "Runs on one Mac today." | game session | unknown (not a chain claim) | none: rule text | keep as feature state. The owner confirms it. |
| intro ring, /fxn/apps | `home.js:913` | "The upload door is live." | conflicts with "nothing is live yet" (Genesis) | no | none | reword: "Built, not live." |
| intro ring, /fxn/rules | `home.js:925` | "A rule changes only when four of five sign." | `chain_server.rs:23756` `threshold: 4` | yes (rule) | DAO_COUNCIL (reads seats and K) | keep. Read K and N from DAO_COUNCIL when wired. |
| intro ring, /fxn/network | `home.js:967` | "The FXN ID gate is live." | the gate is not on a release node | no | none | reword: "Built, not live." |
| intro film | `js/content/manifests/home.js:1261` (B5.MONO) | "80,269 final payments a second on one keeper. 32 vCPU, 7,000 in flight..." | `keeper-measure-2026-11-07.md` (pre-release build) | no | PERF_RESULTS (KPERF1). Not in release 1. | replace with the one line |
| intro film | `js/space/intro.mjs:327` (fallback) | "26,274 final payments a second. 5 test nodes on one machine." | `keeper-measure-2026-11-07.md`, `l15-short-results.md` | no | PERF_RESULTS | remove the fallback number |
| intro film | `home.js:1285` (B5.NUMBER), `home.js:1081` (S4.NUMBER, not read) | "Copies reach the pinners in about 1.4 to 1.7 s." | `32-real-node-growth-results.md`, `pinners-final.md` | no | PERF_RESULTS | replace with the one line. Delete S4.* (dead copy). |
| intro film | `home.js:1291`, `home.js:1087` | "The receipt is final at once. Measured across three regions. Not live." | same run | no | PERF_RESULTS | remove "Measured across three regions" |
| intro film | `js/space/intro.mjs:337` (fallback) | "A copy reached each pinner in about 1.1 s." | `devnet-roadmap.html` | no | PERF_RESULTS | remove the fallback number |
| intro film | `home.js:1303` (B6.MONO) | "Up to 16 of our 20 machines. Test money. No date until the gate passes." | `push-brief.md`, `fleet-readiness.md` (a plan) | no | PEER_COUNT | reword: "Test money. No date until the gate passes." Add a PEER_COUNT count when wired. |
| intro film | `home.js:1201` (B3.MONO) | "No vote. A keeper posts a bond and loses it if it cheats." | `keeper_node.rs:20` (CHAIN_SERVER_KEEPER_BOND), KEEP_FRAUD, forfeit (`chain_server.rs` "convicted keeper's forfeit") | yes (rule) | none: rule text | keep |
| intro film | `home.js:1195` | "Pay. One keeper signs. It is final." | keeper receipt rule | yes (rule) | none: rule text | keep |
| intro film | `home.js:1237` | "Seven lanes of products on one kernel." | site catalog (hand-typed) | unknown | none: remove | reword: "Products on one kernel." |
| intro film, beats 1 and 7 | `home.js:997`, `home.js:1159` | "A rehearsal. Nothing is live." | | absent | none | keep |
| intro cinema (fxn-3d) | `home.js:541` | "The receipt is the first copy. Pinners on other machines hold the rest." | `flx-cap-keeper/src/lib.rs:190` `copies: 3` | yes (rule) | KEEP_PINS / KEEP_COPIES | keep |
| intro cinema | `home.js:553` | "Ours run it today." | the release devnet is not running | no | PEER_COUNT | reword: "Ours run it first, at genesis." |
| intro cinema | `home.js:625` | "A rule changes only when 4 of 5 keys sign." | as on /fxn/rules | yes (rule) | DAO_COUNCIL | keep |
| /learn Speed tab | `js/pages/learn.js:63` | "Measured, as of 2026-11-09. Times and rates measured on test machines before genesis..." | `speed-facts.js:18-19` | no | PERF_RESULTS / PERF_RUNS | replace the whole tab with the one line |
| /learn Speed tab and /fxn/* Speed tab | `js/content/speed-facts.js:22-26` | Payment final 0.68 ms p50, one in flight | `keeper-measure-2026-11-07.md` 3.1 | no | PERF_RESULTS | remove |
| same | `speed-facts.js:27-31` | 1.24 ms slow mode | same | no | PERF_RESULTS | remove |
| same (/fxn/capacity) | `speed-facts.js:33-37` | 83,605 /s one keeper (80,269 with lane shape off) | `keeper-measure-2026-11-07.md` 3.3 | no | PERF_RESULTS | remove |
| same (/fxn/capacity) | `speed-facts.js:38-42` | 48,826 /s, 1,000 in flight | same, 3.2 | no | PERF_RESULTS | remove |
| same (/fxn/network) | `speed-facts.js:44-48` | 268,647 /s, 16 nodes, prototype b8b77453, "Source: UPDATE 6" | `keeper-work/FACTS-2026-11-05.md`, `32-real-node-growth-results.md` | no (prototype) | PERF_RUNS | remove |
| same (/fxn/network) | `speed-facts.js:49-53` | 6,006 /s with 3 keepers, "Source: UPDATE 5" | FACTS-2026-11-05 (prototype 8fb74f5, old design) | no | PERF_RUNS | remove |
| same | `speed-facts.js:54-58` | 15,222 /s with 6 keepers | same | no | PERF_RUNS | remove |
| same | `speed-facts.js:59-63` | 23,014 /s with 9 keepers | same | no | PERF_RUNS | remove |
| same | `speed-facts.js:64-68` | 35,734 /s with 16 keepers | same, `keeper-rethink-audit.md` | no | PERF_RUNS | remove |
| same (/fxn/capacity) | `speed-facts.js:69-73` | 4,933 /s transfers, five keepers on one host, build kv1-integ-4 | `balance-in-record-study.md` | no | PERF_RESULTS | remove |
| same (/fxn/keepers) | `speed-facts.js:75-79` | 1,581 ms spendable through another keeper | `keeper-measure-2026-11-07.md` 4.1 | no | PERF_RESULTS | remove |
| same | `speed-facts.js:80-84` | 1,350 ms pin lag | same, 4.2 | no | PERF_RESULTS | remove |
| same | `speed-facts.js:85-89` | 1.1 s pin lag, five nodes | `devnet-roadmap.html` | no | PERF_RESULTS | remove |
| same | `speed-facts.js:90-94` | 140 µs pin write | same (debug build, mock) | no | PERF_RESULTS | remove |
| same (/fxn/id) | `speed-facts.js:96-100` | 0.047 ms Ed25519 sign | `AGENTS.md` law (2026-10-14, device not stated) | no | PERF_RESULTS | remove |
| same (/fxn/keepers) | `speed-facts.js:101-105` | 12 µs receipt sign | `balance-in-record-study.md` (branch kv1-e-serial) | no | PERF_RESULTS | remove |
| same (/fxn/id) | `speed-facts.js:106-110` | 61.505 µs wallet check | same | no | PERF_RESULTS | remove |
| same (/fxn/id) | `speed-facts.js:111-115` | 59 µs voucher accept | `keeper-measure-2026-11-07.md` 5 | no | PERF_RESULTS | remove |
| same (/fxn/records) | `speed-facts.js:117-121` | 17.5 µs door per payment | `balance-in-record-study.md` | no | PERF_RESULTS | remove |
| same | `speed-facts.js:122-126` | 0.761 µs fold per record | same | no | PERF_RESULTS | remove |
| same | `speed-facts.js:127-131` | 26,042 /s end to end in process | same | no | PERF_RESULTS | remove |
| same | `speed-facts.js:132-136` | 0.262 µs head read | same | no | PERF_RESULTS | remove |
| same | `speed-facts.js:137-141` | 4.199 ms for 32,262 balances | same | no | PERF_RESULTS | remove |
| same | `speed-facts.js:142-146` | 51,258 /s balance reads, five keepers | same | no | PERF_RESULTS | remove |
| same | `speed-facts.js:147-151` | 15.5 µs credits page | same (commit ecb51883) | no | PERF_RESULTS | remove |
| same | `speed-facts.js:152-156` | 0.15 s restart from heads | same | no | PERF_RESULTS | remove |
| same (/fxn/chains) | `speed-facts.js:158-162` | 6.0 s swap batch auction | same | no | PERF_RESULTS | remove |
| same | `speed-facts.js:163-167` | 2,108 µs sealed swap book | same (branch kv1-swap-book) | no | PERF_RESULTS | remove |
| same | `speed-facts.js:168-172` | 55 µs transfer, no keeper | same | no | PERF_RESULTS | remove |
| same | `speed-facts.js:173-177` | 19,981 /s pool batch | same | no | PERF_RESULTS | remove |
| same (/fxn/releases) | `speed-facts.js:179-183` | 1,357 s release build, 6 of 6 sums | `devnet-roadmap.html` | no (a build-check time, not a chain rate) | none: remove | remove |
| same (/fxn/game) | `speed-facts.js:185-189` | 16.7 ms frame time | `intro-story/00-facts-game.md` (local Mac) | no | none: remove (not a chain figure) | remove |
| same | `speed-facts.js:191-221` | 10 notMeasured rows: "10 to 20 s estimate", "31 µs bench", "79 to 87 ms estimate", "16-node runs used a prototype", "0.01 test ETH", "4 of 5 vault signers" | | absent, but each row quotes old numbers | PERF_RESULTS | replace with the one line |
| /fxn/id | `js/content/topics.js:27-28` | "The private half never leaves it." Key wrapped by the device's secure store. | auth design | yes (design rule) | none: rule text | keep |
| /fxn/records | `topics.js:31-33` | "The receipt makes it final. The record also carries its result." | record-carries-its-result law | yes (rule) | none: rule text | keep |
| /fxn/keepers | `topics.js:30` | "They hold copies on our own nodes." | no release node runs | no | PEER_COUNT | reword: "At genesis they run on our own nodes." |
| /fxn/keepers | `topics.js:31` | "3 of the keeper's 4 named pinners hold each segment. Final does not wait for the pin." | `flx-cap-keeper/src/lib.rs:190` `copies: 3`. Four named: `chain_server_keeper_obj_pin.rs:109` ("name four pinners in its copy set"). | yes (rule) | KEEP_PINS / KEEP_COPIES | keep. Read K from the release when wired. |
| /fxn/capacity | `topics.js:35` | "A keeper has no vote. Keepers are paid from the fee box." | keeper design, KEEP_EARNED | yes (rule) | KEEP_EARNED | keep |
| /fxn/capacity | `topics.js:35` | "At genesis the keepers are foundation nodes first." | owner ruling | unknown (a plan) | PEER_COUNT | keep as plan words ("first, at genesis") |
| /fxn/capacity | `topics.js:36` | action "See the measured speed" | there is no measured speed | no | none | reword: "Read how a record becomes final" |
| /fxn/chains | `topics.js:39` | "You pay the 15,000 FXN launch fee and lock 15,000 FXN stake." | `netparams.rs:23` LAUNCH_FEE_DEFAULT_FXN = 15,000; `netparams.rs:20` STAKE_FLOOR_DEFAULT_FXN = 15,000; `chain_dao.rs:530` | yes (default rule; a netparam can change it) | LAUNCH_PRICE / NETPARAMS | keep the words, read the two numbers from LAUNCH_PRICE (rule 2) |
| /fxn/chains | `topics.js:39` | "The launch founds the chain's DAO." | `chain_dao.rs` | yes (rule) | none: rule text | keep |
| /fxn/game | `topics.js:48-49` | "Runs on one Mac today. Nature has 3 working portals." | `00-facts-game.md` | unknown (game, not chain) | none: remove | remove "Nature has 3 working portals" |
| /fxn/rules | `topics.js:64-65` | "multisig of five keys", "four of five" | `chain_server.rs:23756` threshold 4 | yes (rule) | DAO_COUNCIL | keep. Read 4 and 5 from DAO_COUNCIL when wired. |
| /fxn/deposits | `topics.js:69` | "a credit that carries its own proof" | `bridge.rs` (authorize_bridge_mint) | yes (rule) | none: rule text | keep |
| /fxn/network | `topics.js:73` | "You can review and revoke what you granted." | auth design | unknown | none: rule text | keep if /account shows revoke today, else remove |
| /fxn/* | `js/pages/topic.js:149,168` | Speed tab first, "every page carries its measured number" | page design | no | PERF_RESULTS | Speed tab shows the one line. Order stays as designed. |
| /auth | `js/pages/auth.js:80` | step "Connect: Sign in to the DEFXN network" | no release network runs | no | PEER_COUNT | reword: "Connect: Sign in with your FXN ID" |
| /account | `js/pages/account.js:698,1649` | "The genesis mint paid the allocation into these safes." | true of the old devnet only | no (release genesis has not run) | the wallet read itself | reword: "After genesis the mint pays the allocation into these safes." |
| /account | `js/pages/account.js:731` | "Balances update directly from the selected network." | live read | yes (live read) | KEEP_BALANCES_AT / wallet wire | keep |
| /download | `js/content/manifests/download.js:87` | "It connects to the DEFXN devnet. Nothing on it is live money yet." | no release devnet is up | no | none | reword: "It connects to the DEFXN devnet once devnet starts." |
| /download | `download.js:279` | "Built and run on one iPhone and one Android phone." | not traced | unknown | none: remove | remove the sentence |
| /download | `js/pages/download.js:14-26` | "5 Steps to a node" (ark-miner-cli, flux-miner, `flux-network`) | the old miner. The release node is the kernel keeper. | no | none: remove | remove the steps tab and the count, until the release operator guide exists |
| /download | `download.js:14` | "2 Apps", "0 Published" | counts of the page's own list | yes (true count of the list) | none: rule text | keep "Apps". Say "Not published yet" in place of "0 Published". |
| /learnings/how-we-got-fast-and-what-we-got-wrong | `js/content/articles/how-we-got-fast-and-what-we-got-wrong.js:3,27-74` | 6.82 /s, 46.88 /s, 3,250 /s, 21,199 /s, "about 25,000 across ten machines" | old Node and Rust fleets | no (history) | none: remove | retire the article (add `article/` to FAMILIES with `to: 'learn'`) |
| /learnings/the-chain-prototype-is-the-chosen-path | `the-chain-prototype-is-the-chosen-path.js:3,28-59` | 51,065, 279,269, 12,403, 79,654 ops/s | retired chain direction | no (history) | none: remove | retire |
| /learnings/a-resolver-by-construction | `a-resolver-by-construction.js:72` | 51,065 ops/s, 20,000 operations | same | no | none: remove | retire, or remove section 72 |
| /learnings/the-grammar-does-almost-no-work | `the-grammar-does-almost-no-work.js:61` | 2,500 characters, 1,560 bytes JSON | old grammar measure | no | none: remove | retire |
| /learnings: the other three articles | `js/content/articles/*.js` | history of retired designs | | no (history) | none: remove | retire |
| SEO (meta) | `js/content/seo-data.js:851,871,881` | "under 7 a second to about 25,000 across ten machines", "51,065 ops/s" | article meta | no | none: remove | remove with the articles |
| SEO (home) | `seo-data.js:139` | "It runs on a development network today, and nothing is live." | | no (the release devnet is not running) | none | reword: "Devnet genesis is next. Nothing is live." |
| index.html | `index.html:12-19` | title and meta: "Not one chain. A world of them." | brand words | yes (design rule) | none: rule text | keep |

## Counts per verdict

Counted from the rows above. The 10 notMeasured rows count as one row.

| Verdict | Rows |
|---|---|
| yes (rule in release source, live read, or true list count) | 19 |
| no (not measured on the release, or no longer true) | 31 |
| unknown | 9 |
| absent (says not live or not measured) | 6 |

Of the 31 "no" rows, 29 are hand-typed speed figures in `speed-facts.js`, the intro film and the articles. The 7 articles count as 5 rows.

## Proposed edits

These are proposals. The edit round makes them. Nothing here is applied.

1. `js/content/speed-facts.js:17-223`: make `rows: []` and `notMeasured: []`. Make `asOf: null`. Make `note` read: "Not measured yet on the devnet release. Measured after devnet starts." Better: delete the hand-typed table, and make `ArkTopics.loadSpeed` read KPERF1 records (see "Readers" below).
2. `js/pages/learn.js:59-101` (`speed`): with no KPERF record, draw one line, "Not measured yet on the devnet release. Measured after devnet starts." Draw no chips, ladders, conditions or "Source:" lines.
3. `js/pages/topic.js:70-75` (`fillSpeed`): the same one line. Drop the `notMeasuredRow` reasons and "To measure" lines.
4. `docs/design/space/SPEED-FACTS.md` (the people's copy): move it to `docs/archive/speed-facts/`, and add a MOVED.tsv row.
5. `js/pages/home.js:46-52`: drop Networks and Chains. Resolvers comes from STATS_LIVE through `/api/fleet-resolvers`. With no answer, show "No node answered", never 0 and never 15.
6. `js/content/manifests/home.js:1261` B5.MONO -> "Not measured yet on the devnet release. Measured after devnet starts."
7. `home.js:1285` B5.NUMBER and `home.js:1291` B5.CONDITION -> "The receipt is final at once. Copies reach the pinners after it." Delete the unused S4.NUMBER (`1081`) and S4.CONDITION (`1087`).
8. `js/space/intro.mjs:327,337`: delete the numeric fallbacks ("26,274 ...", "about 1.1 s ..."). Use the B5 text with no number.
9. `home.js:1303` B6.MONO -> "Test money. No date until the gate passes."
10. `home.js:1237` B4.LINE -> "Products on one kernel."
11. `home.js:475` PORTAL.LINE -> "Build apps, start chains, run the machines that keep them. Devnet genesis is next."
12. `home.js:553` CINE.KEEPERTOWER.LINE -> "Machines like yours will keep it running. Ours run it first, at genesis."
13. `home.js:769` S1.STATUS -> "Opens at /auth. Your device makes the key."
14. `home.js:913` S9.STATUS and `home.js:967` S12.STATUS -> "Built, not live."
15. `js/content/topics.js:30` keepers `what` -> "Keepers are the machines that put records in order and return receipts. At genesis they run on our own nodes."
16. `topics.js:36` capacity action -> `{ label: 'Read how a record becomes final', to: 'learn', query: 't=words' }`.
17. `topics.js:39` chains step 1: keep the words. Read both 15,000 values from LAUNCH_PRICE (fee, stake). With no answer, say "You pay the launch fee and lock the stake that LAUNCH_PRICE states."
18. `topics.js:49` game step 2 -> "The world loads on your machine."
19. `js/world2/world2-props.mjs:45,62,68`: drop every `facts` entry. Machines may come back fed from PEER_COUNT.
20. `js/pages/auth.js:80` Connect -> "Sign in with your FXN ID".
21. `js/pages/account.js:698,1649` -> "After genesis the mint pays the allocation into these safes. FXN reaches your keys only when the multisig approves a spend of a vested part."
22. `js/content/manifests/download.js:87` -> "It connects to the DEFXN devnet once devnet starts."
23. `download.js:279` -> "Opens DEFXN sites and runs a node on your phone. It is in no store yet."
24. `js/pages/download.js:14-26`: remove the "Run a node" tab, the TERMINAL steps and the "Steps to a node" count. They describe the old ark-miner-cli. Replace "0 Published" with "Not published yet".
25. `js/content/site-pages.js` FAMILIES: change `{ prefix: 'article/', journey: 'read' }` to `{ prefix: 'article/', journey: null, to: 'learn' }`. This retires all 7 articles. The files stay on disk, as RETIRED does.
26. `js/content/seo-data.js:139` -> "DEFXN is the kernel of the grid. FXN is its first chain and that chain's coin. Devnet genesis is next. Nothing is live." Lines 851, 871 and 881 leave with the articles.
27. `js/hero-motion.js:83-96`: paint a price only from a node that reports release `63353a01`. Until then it stays "FXN · No price yet".

### Readers: what reads the chain today, and what is missing

The site already reads these endpoints:

- `scripts/lib/fleet-stats.mjs` asks one node for STATS_LIVE and PERF_RUNS. It serves `/api/fleet-interactions`, `/api/fleet-capabilities`, `/api/fleet-resolvers` and `/api/fleet-runs`. Both `scripts/serve-site.mjs` and `scripts/publish-host.mjs` serve them. Contract: `docs/stats/LIVE-DATA-CONTRACT.md`.
- `scripts/lib/fleet-pulse-proxy.mjs` serves `/api/fleet-pulse`. `js/ark/pulse-client.js` (ArkPulse) reads it, and so do `js/ark/chain-pulse-client.js` and `js/content/site-pages.js` (`statsRunsWith`).
- `js/pages/stats.js` and `js/pages/world-stats.js` read them. Both pages are retired.
- `js/ark/dense-wire-wallet.mjs:223-229` reads FXN_SALE for the footer price (`js/hero-motion.js`).

Nothing reads PEER_COUNT, PERF_RESULTS, PERF_STATE, LAUNCH_PRICE, NETPARAMS, DAO_COUNCIL or KEEP_PINS yet. All seven are in release `63353a01`.

These pages need a new reader. Add each one to the one client, ArkPulse, as the contract says. Do not add a second client.

| Page file | What it needs | Release source |
|---|---|---|
| `js/pages/home.js` | resolver count, node count | STATS_LIVE via `/api/fleet-resolvers`, PEER_COUNT (new endpoint) |
| `js/content/topics.js` (`loadSpeed`), `js/pages/topic.js`, `js/pages/learn.js` | speed rows with build and device | PERF_RESULTS / PERF_STATE (KPERF1), PERF_RUNS (KPERF2). The perf resolver is not in release 1, so these show "Not measured yet". |
| `js/content/topics.js` chains row | launch fee and stake | LAUNCH_PRICE |
| `js/content/topics.js` rules row, `home.js` CINE.MULTISIGLOCK | K and N of the multisig | DAO_COUNCIL |
| `js/content/topics.js` keepers row | pin copies | KEEP_PINS / KEEP_COPIES |
| `js/world2/world2-props.mjs` | machine count | PEER_COUNT |
| `js/space/intro.mjs`, `home.js` B5/B6 | speed and node count | PERF_RESULTS, PEER_COUNT |

## Claims not traced

- "Built and run on one iPhone and one Android phone" (`download.js:279`): no source found.
- "Nature has 3 working portals" (`topics.js:49`): only `intro-story/00-facts-game.md`. Not a chain fact.
- "You can review and revoke what you granted" (`topics.js:73`): not checked against /account.
- "15 Resolvers": a folder count of 2026-10-23. Not checked against what release `63353a01` serves.
- "Seven lanes of products" (`home.js:1237`): hand-typed, no source.
- "foundation nodes first" (`topics.js:35`): an owner ruling, not code.

## Final actions, landed 2026-11-10

FXN Genesis gave the go on 2026-11-10. These edits are in `flux/defxn` and are not committed. Each line gives the row, what was done, and the proof.

| Row | Final action | Proof |
|---|---|---|
| All 30 `speed-facts.js` rows and the 10 notMeasured rows | Removed. `rows: []`, `notMeasured: []`, `asOf: null`. `note` is the one line. | No KPERF record exists on release `63353a01`. The perf resolver is not in release 1 (Genesis). |
| /learn Speed tab | Shows only the one line | `js/pages/learn.js` `speed()`. Headless Chrome at 1440x900: text "Not measured yet on the devnet release. Measured after devnet starts." Shot `learn-speed.png`. |
| /fxn/* Speed tab | Shows only the one line. The notMeasured reasons left. | `js/pages/topic.js` `fillSpeed`. /fxn/records and /fxn/capacity show the line (shots `fxn-records.png`, `fxn-capacity.png`). |
| Intro film B5.MONO, B5.NUMBER, B5.CONDITION, S4.NUMBER, S4.CONDITION | Speed and pinning times removed. B5.MONO and the conditions are the one line. B5.NUMBER and S4.NUMBER read "The receipt is final at once. Copies reach the pinners after it." | `manifests/home.js`. The fallbacks in `js/space/intro.mjs` match. |
| Intro film B6.MONO "Up to 16 of our 20 machines" | Reworded: "Test money. No date until the gate passes." | The intro.mjs fallback matches |
| Intro film B4.LINE "Seven lanes" | Reworded: "Products on one kernel." | No source was found for the count of seven |
| Home "3 Networks", "26 Chains" | Removed | They were rings of a picture (`network-data.js`) |
| Home "15 Resolvers" | Read live from `/api/fleet-resolvers` (STATS_LIVE). With no answer it reads "Resolvers: No node answered", never 0. | `js/pages/home.js` `liveResolvers`. With `?preview=1` (the router sends `/` to `/intro` otherwise), the page shows "RESOLVERS: NO NODE ANSWERED" because the endpoint answered 503. |
| 3D world facts: Machines 20, Lit at most 16, Pages 12, Products n | Removed. The rack line says a count shows once a node reports it. | `js/world2/world2-props.mjs` |
| Footer price | Painted only when BUILD_INFO names `63353a01`. Otherwise "FXN · No node answered". | `js/hero-motion.js`, `RELEASE_BUILD`. The local node answered build `e492b4c-dirty`, so the footer DOM reads "FXN · No node answered" with that reason. |
| PORTAL.LINE, CINE.KEEPERTOWER, S1/S9/S12 STATUS | Reworded to plan words or "Built, not live." | `manifests/home.js` |
| /fxn/keepers "copies on our own nodes" | "At genesis they will run on our own nodes." | `topics.js` |
| /fxn/capacity "foundation nodes first" | Kept as a plan: "At genesis the first keepers will be our five foundation nodes." | `keeper-work/deploy-day.md` step 3: five foundation nodes, big1 first |
| /fxn/capacity action "See the measured speed" | "Read how a record becomes final" | No speed is measured |
| /fxn/game "Nature has 3 working portals" | Removed | No dated run or file:line proof beyond a facts doc |
| /fxn/network "review and revoke what you granted" | Removed | `/account` revokes signing wallets and delegations (`account.js:619-623`). No screen revokes a grant to a site. |
| /download "Built and run on one iPhone and one Android phone" | Removed | No source was found |
| /download "It connects to the DEFXN devnet" | "It will connect to the DEFXN devnet once devnet starts. Nothing on it will be live money." | No release devnet runs |
| /download "Run a node" tab, five steps, "Steps to a node", operator guide link | Removed. "0 Published" now reads "Not published yet". | The steps ran the old ark-miner-cli. Headless Chrome shows "2 APPS ; NOT PUBLISHED YET". |
| /auth step "Sign in to the DEFXN network" | "Sign in with your FXN ID" | No release network runs |
| /account "The genesis mint paid" | "At genesis the mint will pay..." | Release genesis has not run |
| /learnings/* (7 articles) | Retired: FAMILIES `article/` opens Learn. The article files stay. | `site-pages.js`, `catalog.js` article loop. `/learnings/how-we-got-fast-and-what-we-got-wrong` lands on /learn in headless Chrome. |
| SEO home description | "Devnet genesis is next. Nothing is live." | `seo-data.js:139` |
| "yes" rows (15,000 FXN fee and stake, 4 of 5, 3 of 4 pinners, bond) | Kept as typed rule text | In release source (see the table). A LAUNCH_PRICE, DAO_COUNCIL or KEEP_PINS reader would replace the typed numbers. None is wired yet. |

## Live reads, landed 2026-11-10 (round 3)

FXN Genesis passed on the owner rule "no manual hard data". No number on a page is typed by hand now. Each number is read from a node on the devnet release, or the page says "No node answered", with the reason in the title. It never shows 0 and never shows a typed value.

One reader holds every read: `js/ark/chain-facts.mjs`. It sends each command over the wallet wire (`js/ark/dense-wire-wallet.mjs` WalletWire, the client /account already uses). LAUNCH_PRICE is parsed by the vendored `parseLaunchPrice`, and DECIMALS by `parseDecimalsReply`. The other replies have no vendored parser, so one strict reader checks their head, field count, row count and END line. It loads through `ArkUI.loadChainFacts` (`js/hero-motion.js`). No server route was needed, because every command is Public on the line protocol.

### How the release is found

The `RELEASE_BUILD` constant is gone. The release in force is read from the chain at kernel `63353a01`:

1. BUILD_INFO names the node's network. It must equal `PAGE_NETWORK` in the pinned network list (`js/dense-wire/fxn-network.mjs`).
2. FOUNDING (`chain_server.rs` `founding_reply`) names the network's founding record. It must be filed.
3. PROTOCOL (`node_release.rs` `protocol_reply`) gives the protocol the binary runs and the protocol in force on the chain. The two must be equal. Release 1 is the genesis protocol. Every later release is a filed release record.

No read at `63353a01` names a release by its commit. The genesis release has no release record, so the commit cannot be read from the chain.

### Every remaining number

| Page | Number | Live source | Shown today |
|---|---|---|---|
| /fxn/chains, How it works | launch fee and stake | LAUNCH_PRICE (`LAUNCH_PRICE_ROW chain fee`, `stake`) and DECIMALS | "Launch fee and stake: No node answered." |
| /fxn/rules, How it works | K of N signers | NETPARAMS `paramdao`, then DAO_COUNCIL of that DAO. An unset paramdao is absent, by name: until the genesis key hands the parameters over, no multisig holds them. | "Signers needed: No node answered." |
| /fxn/keepers, How it works | named pinners heard | KEEP_STATUS (the node's keeper), then `KEEP_GET <keeper> pins` (one statement per named pinner). No read names the copy rule K (`copies: 3` is compiled in), so the page states no K. | "Named pinners: No node answered." |
| footer, every page | FXN price | FXN_SALE (USD, then EUR), after the release check | "FXN · No node answered" |
| home (preview only) | resolvers | STATS_LIVE through `/api/fleet-resolvers` | "Resolvers: No node answered" |
| /fxn/capacity | "five foundation nodes" | none. This is a plan (`keeper-work/deploy-day.md` step 3), kept as plan words under ruling 6. PEER_COUNT can replace it after genesis. | typed plan words |
| /download | "2 Apps" | none. It counts the page's own list of apps, not a chain fact. | "2 APPS ; NOT PUBLISHED YET" |
| intro ring, cinema | "4 of 5", "one of five", "four of five" | Reworded with no number: "when the multisig signs", "a key of the multisig", "when enough keys sign". The number is on /fxn/rules. | text with no number |
| intro ring S3 | "Copies kept on our own nodes" | Reworded to plan words: "Copies that our own nodes will keep." | plan words |

## Rules reader and vote/sale sweep, 2026-11-10 (round 4)

FXN Genesis ruled on /fxn/rules. The owner ruled that person attesters are filed after launch, as an upgrade the multisig votes in. Until then no page says that holders vote or that a sale is open.

| Page | file:line | Claim | Final action | Proof |
|---|---|---|---|---|
| /fxn/rules, How it works | `js/ark/chain-facts.mjs` `rulesMultisig`, `js/pages/topic.js` LIVE.multisig | who changes the rules | NETPARAMS first. If paramdao is filed, DAO_COUNCIL of that DAO gives "K of N keys of <dao> must sign". If NETPARAMS answers and paramdao is unset, the page says "Rules are changed by the genesis key until the parameter DAO is filed.", with NETPARAMS cited in the title. "No node answered" shows only when no release node answers. Nothing falls back to fxndao. | `netparams_reply` (kernel 63353a01): paramdao stays unset until the genesis key hands the parameters over. A fake reply in that shape gives `{ genesisKey: true, source: "unset" }`. |
| /fxn/rules | none | the signers of fxndao | Not added. The ruling allows it, but fxndao is the mint's DAO, and its id would be typed on the page. | none |
| /account, safes | `js/ark/fxn-holdings.mjs:149` | "Sells FXN in the public sale." | "Holds FXN for a sale. No sale is open. No signer moves it." | owner rule 2026-11-10 |
| /account, safes | `js/ark/fxn-holdings.mjs:150-151` | "Each spend needs a holder vote." | "Nothing leaves it yet. Spends wait for holder votes, planned after launch." | owner rule 2026-11-10 |
| /account, safes | `js/ark/fxn-holdings.mjs:152` | "Spends only inside budgets that holders approved." | "Nothing leaves it yet. Spends wait for budgets, planned after launch." | owner rule 2026-11-10 |
| /account, safe chip | `js/pages/account.js:417` | "Sale only", "Holder vote", "Budgets only" | "Sale not open", "Waits for launch", "Waits for launch" | owner rule 2026-11-10 |
| keepers (intro film, 3D world, /fxn/capacity) | `home.js:1015,1201`, `world2-props.mjs:47`, `topics.js:36` | "No vote" (keepers do not vote) | Kept. It says keepers do not vote. It says nothing about holders. | keeper design |
| /account, skins | `account.js:834-871` | skin "for sale" links | Kept. These are person-to-person skin sales, not a public FXN sale. | |
