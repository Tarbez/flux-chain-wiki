# Story editor: the facts the film may use

Reader: the nine writers and the producer. Written 2026-11-09, read-only. Paths: D = `/Volumes/PortableSSD/docs/`, V = `D/fxn-vs-osf-2026-10-31/`, K = `V/keeper-work/`, M = `/Volumes/PortableSSD/flux/defxn/js/content/manifests/`, G = `/Volumes/PortableSSD/flux/fxn-3d/docs/design/`.

Status words. **live**: usable on the old devnet pages today. **built**: code exists, not on a live network. **prototype**: measured on a build that is not the current one. **planned**: design only. **fiction**: story world.

**Frame for every scene.** The new devnet is not deployed (`V/devnet-roadmap.html`, "Where we are"). Nothing has paid anyone on a real node (`K/FACTS-2026-11-05.md` UPDATE 10). The sheets `00-facts-genesis.md`, `00-facts-game.md` and `00-facts-browser.md` here agree with what I read. Each number below was checked against the source named.

## 1. Fact table

| # | Claim in plain words | Status | Number, with its conditions | Source |
|---|---|---|---|---|
| 1 | Every key keeps its own list of signed records: one chain per signer. An FXN ID lives on kernel chain `fxnid` with its own list. | built | none | `V/09-chain-of-chains.md:9`. `M/chain.js:43` |
| 2 | Your key is made on your device and never leaves it. The server checks a signature and never holds the key. | built, dev build | none | `00-facts-browser.md` §1. `V/03-identity.md` SOLVED line |
| 3 | A site asks. You see the exact site and bytes, then Share or Don't share. Grants are stored and can be revoked. | built, dev build | none | `00-facts-browser.md` §2. `M/worldidentity.js:199,211` |
| 4 | Access control as a chain resolver: scoped grants with expiry, deny before grant. | primitives built, resolver planned | none | `D/FLUX-ACCESS-RESOLVER-PLAN.md:3-4`. `V/11-people-products-identity.md:32` |
| 6 | The key file opens with PIN, password, key word, one icon and a Secret Key held in pieces by gate nodes. Three wrong tries lock it 24 h. | live, old devnet | 2 of 3 on devnet, 3 of 5 on mainnet | `D/FXN_ID_GATE_ON_CHAIN_v0.md:3-4`. `V/12-product-catalogue.md` IDENTITY |
| 7 | Move your identity to a new key. Recover it through trustees. | planned | none | `D/FXN_ID_GATE_ON_CHAIN_v0.md:12`. `D/FXN_ID_TRUSTEES_v0.md:3` |
| 8 | `.fxn` names: one label plus ending, claimed by a signed record on dense-wire only. Lookalikes refused by structure. | page live. Claims genesis-key only | rent 3 EUR a year, 1 to 10 years, 45-day grace: built, not deployed | `D/DEFXN-NAMES-ONE-SYSTEM.md` "The rule", R1, R4, N1 |
| 9 | A record carries its result. A balance is the head of its own list, never a fold. | built, on kernel main | restart from heads 4 ms against 8.4 s for a fold of 1M records. flx-nyc1, warm page cache, wire not measured | `V/balance-in-record-study.md:11,162`. `V/devnet-roadmap.html` "Landed" |
| 10 | Pay. One keeper signs the receipt. That receipt alone is final. No vote. | built, owner ruling | p50 0.68 ms at 1 in flight on a 1 ms wire | `K/FACTS-2026-11-05.md` UPDATE 3. `V/keeper-measure-2026-11-07.md` §3.1 |
| 11 | A keeper posts a bond and loses it if it cheats. The bond pays the victim. | built (K29 merged) | foundation bond 10,000 FXN per node at genesis | `K/FACTS-2026-11-05.md` UPDATE 3, 6. `K/GENESIS-GAPS.md` row 20 |
| 12 | One keeper's speed. | built, real WAN | 80,269 final/s (83,605 with L11). flx-nyc1, 32 vCPU, 93 GB, NVMe. 7,000 in flight sent by three client hosts. Every sender signature checked. Byte-rate caps off. 6 of 32 vCPU used | `V/keeper-measure-2026-11-07.md` §1, §3.3 |
| 13 | More keepers, more capacity. Network peak. | prototype only, not sustained | 3/6/9/16 keepers = 6,006 / 15,222 / 23,014 / 35,734 final/s, build 8fb74f5, copy-push design. Peak 268,647 final/s, 16 nodes, 20 s steps, v1.1 rules off | `K/FACTS-2026-11-05.md` UPDATE 5, 6 |
| 15 | The receipt is the first copy. Segments go to the keeper's 4 named pinners. Final never waits for the pin. | built | spendable through another keeper: mean 1,581 ms, 27 payments, pinners in 3 regions. Receipt to pinned 1,350 to 1,696 ms. Estimate 4 to 12 ms with pinners in one region | `V/keeper-measure-2026-11-07.md` §1 item 4, §4 |
| 17 | Who earns: keepers and pinners from the fee box. People per copy consumed. Miners for measured work, cap 30%. API-key holders for use of their key. | built, nothing paid out | the earning path is unmeasured until L15 | `K/FACTS-2026-11-05.md` UPDATE 10, line 212. `V/12-product-catalogue.md` EARNING |
| 18 | A node is a set of roles: chain, resolvers, relay, store. Anyone keeps a copy and earns for proved storage. No vote. | built. FXN Runner local only | none | `D/FXN-NODE-ARCHITECTURE-2026-10-23.md:130`. `V/09-chain-of-chains.md:6` |
| 19 | The browser's miner does storage and compute work. | built, dev build. Payouts not released | none | `00-facts-browser.md` §4 |
| 20 | Data store: a pin is a hash-checked write into the keeper store on our own nodes. IPFS is off the keeper path. | built | none | `00-facts-genesis.md` §5. `K/FACTS-2026-11-05.md` UPDATE 15 |
| 21 | Live rooms: one resolver for streams, collab, games, 3D and audio. | planned | localhost transport: client to client p50 57 to 61 ms, p95 103 to 118 ms, 2 to 64 players, 8 GB Mac, 20 Hz | `V/live-rooms-design.md:5`. `G/engine/MULTIPLAYER.md` "Measured" |
| 22 | The game engine: fxn-3d, no Three.js. Studio, worlds, portals, minigames. | built, local. No person has played it | 16.7 ms median frame, capped by a 60 Hz display, Apple M2 8 GB | `00-facts-game.md`. `G/engine/PERF-AUDIT.md:8` |
| 23 | A world is a chain. | **false today** | a world is a studio document. A launched chain is a resolver with its own chain | `00-facts-game.md` "Worlds". `G/direction/DIRECTION.md` |
| 24 | Start your own chain. | built, not live | 15,000 FXN fee plus 15,000 FXN stake, once. The stake belongs to the chain's DAO | `V/27-devnet-launch-checklist.md:40,1024-1025` |
| 25 | Apps are Bundles. A release is signed and passes the upload door. | door live. Bundles resolver building | none | `V/12-product-catalogue.md` SHIP |
| 26 | A resolver: one signed launch record, its own chain, grammar as the gate, immutable unless a control key. | built. Explore and Deploy on the dev network, no public hosting | none | `M/resolver.js:250-292,376`. `M/deployment.js:157` |
| 27 | Multisig: five FXN IDs, 4 of 5, changes fees, budget and parameters on devnet until attesters are filed. | built | K = floor(2N/3)+1 | `V/27-devnet-launch-checklist.md:33`. `K/FACTS-2026-11-05.md` UPDATE 17 |
| 28 | A bridge deposit mints by K votes against one deposit. Cash-out ends at your own address. | built. No run on any public test network | 2-of-3 run on one isolated node with a faked Bitcoin chain, 2026-10-18 | `D/FXN-BRIDGE-RPC-VAULTS-DESIGN.md` §1. `K/GENESIS-GAPS.md` row 27 |
| 29 | Sale, DAO, Treasury, Launchpad, Studio, Deploy, Explore, FXN Browser. | built. Pages live on old infra. Browser has no public download | none | `V/devnet-roadmap.html`. `00-facts-browser.md` |
| 32 | Stupa, the Scrapworks, the Board, the Tally, Players, the Fam. | **fiction**, draft 2, not confirmed | none | `G/direction/DIRECTION.md:7` |
| 33 | "Built in the open." | **unsupported** | flux-core stays private. Nodes get no login | `K/FACTS-2026-11-05.md` UPDATE 12 |

## 2. Red flags in the current words

`M/home.js`, lines as read on 2026-11-09.

| Line | Current words | Problem | True rewrite |
|---|---|---|---|
| 469, 649 | "A new internet, built in the open." | The kernel repo is private (row 33). | "A new internet. Anyone can check every record it keeps." |
| 475 | "Build apps, start chains and run the machines that keep them. It runs today as a development network." | The new devnet is not deployed. Starting chains and running machines are built, not open to a visitor. | "Build apps, start chains, run the machines that keep them. Today it runs as our development network. Genesis is next." |
| 541 | "Your machine keeps the network running." | At genesis, keepers are foundation nodes. A visitor's machine keeps nothing yet. | "Machines like yours will keep it running. Ours run it today." |
| 565 | "Start your own chain. Set its rules." | Built, not live. Costs 15,000 FXN fee plus stake. | "Start a chain with one signed record. Its rules are read before anyone trusts it." |
| 601 | "Your key opens the gate." | Unclear which gate: the FXN ID gate (2 of 3) or a Bundle release. | Identity: "Your key opens. Nobody holds it for you." Apps: "A signed release passes the door." |
| 613 | "A rule changes only when 4 of 5 keys sign." | True with a limit: devnet, and the power ends when attesters are filed. | Keep. Add at 11 px: "On the devnet, until attesters are filed." |
| 625 | "A deposit crosses with its own proof." | Built. No run on a public test network. | Keep. Proof line: "Built. No deposit has crossed a public test network yet." |
| 637 | "The network runs where you do." | Nothing runs on a visitor's device today. | "The network runs on machines people choose to run. Yours can be one." |
| 95-101, 299-305 | "A copy reached each pinner in about 1.1 s. Measured on 5 test nodes on one machine." | I found no source for 1.1 s. The nearest sourced figure is 1,350 to 1,696 ms on real WAN (row 15). | "The receipt is final at once. Copies reach the pinners in about 1.4 to 1.7 s, measured across three regions." |
| 275 | "26,274 final payments a second. 5 test nodes on one machine. 1,000 in flight." | True (`K/l15-short-results.md:208`). One keeper on its own host read 80,269. | "80,269 final payments a second on one keeper. 32 vCPU, 7,000 in flight, every signature checked." |
| 529 | "The record goes out as copies. Keepers hold them." | Pinners hold copies. The receipt is the first copy. | "The receipt is the first copy. Pinners on other machines hold the rest." |
| 185-215, 311-317 | Own chain. One keeper signs, final, bond. Genesis next, 16 of 20 machines, no date. | True (rows 1, 10, 11, roadmap). | Keep. |
| `M/worldidentity.js:247` | "Any 3 of 5 release it." | The devnet gate is 2 of 3 (row 6). | "Any 2 of 3 release it on the devnet. 3 of 5 on mainnet." |

`G/direction/SITE-FILM.md` punch lines, checked:

- "Final in one signature" and "A keeper who signs twice pays the one it cheated": true, built (rows 10, 11).
- "Four copies of every chain": 4 named pinners per keeper, 3 of 4 hold each segment. Dragging towers away until one holds promises more than the design does. Say "The receipt, plus pinners on other machines."
- "Start a chain. Launch a world": a world is not a chain (row 23). Say "Start a chain. Give it a name, a coin and its rules."
- "Those who do the work get paid" and "Sign receipts. Get paid for each": design. Nothing paid out (row 17). Show as the promise with a proof line.
- "Value comes in by one path": deposit and sale both use the bridge (owner, 11-06). Built, untested on public networks (row 28).
- "Put a name on your door": claims are genesis-key only today (row 8).
- "Every rule becomes structure on one chain": say "on its own chain".

## 3. The owner's goal, in true words

- "Create and shape their own identity": a keypair on your device, a key file with four factors, a name on the chain (rows 2, 6, 8). Built. Name claims open after genesis.
- "Carry it": one identity across the browser's pages today. Across worlds and machines it depends on the chain (`00-facts-browser.md` §3). Do not claim per-site keys.
- "Controlled access to whoever they want": ask, review, grant, revoke in the dev build (row 3). Scoped grants with expiry (row 4). Disclosure to one audience (built: `walletDisclosure.mjs`, `V/03-identity.md`). The access resolver is planned.
- "Worlds = chains = games": say **"a chain for every network, a world for every game, one identity through all of them."** A game world is a scene. A chain is launched by a record.
- "We all earn, all add compute, faster with each keeper": earning built and unpaid, compute roles built and local, speed per keeper a prototype row (rows 13, 17, 18). Say "designed so that".

## 4. Gaps

1. No source found for "1.1 s" or "max 3.4 s" pin lag. The author of `00-facts-genesis.md` §1 should name the file.
2. Capacity growth on the current build is unmeasured (row 13).
3. No sustained run exists under the receipt-alone design. Every rate is a burst of 20 to 25 s.
4. Access control on chain is a plan. The browser's revoke is local to the dev build.
5. The game has no player yet. Multiplayer is localhost. Frame numbers are display-capped.
6. flux-core is private, so "open" must mean "checkable", never "open source".
