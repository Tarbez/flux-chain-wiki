# Facts from the genesis session (2026-11-09)

Reader: the intro story team. Source: the FXN GENESIS session, read 2026-11-09. D = /Volumes/PortableSSD/docs/fxn-vs-osf-2026-10-31/, K = D/keeper-work/.
The one doc that holds most of it: D/devnet-roadmap.html. Conditions: D/balance-in-record-study.md. Keeper speed: D/keeper-measure-2026-11-07.md.

**Status first.** The new devnet is NOT deployed. Nothing below is live on the devnet. Label every claim "built, not live" unless it says otherwise.

## 1. Throughput and finality
- Best single keeper: 83,605 final/s (80,269 default), 7,000 payments in flight from 3 client hosts, keeper flx-nyc1 (32 vCPU, 93 GB, NVMe), real WAN, throwaway keys, 4 nodes. The keeper used about 6 of 32 vCPU. Built, not live. D/keeper-measure-2026-11-07.md section 1.
- Best network: 268,647 final/s on 16 nodes, prototype, 20 s steps, 1 base unit per payment, v1.1 rules not on. NOT a sustained or real-traffic rate. K/FACTS-2026-11-05.md UPDATE 6.
- Ack latency: p50 0.68 ms with 1 payment in flight on a 1 ms wire. The keeper's receipt is final (owner ruling 11-05).
- Spendable through another keeper: mean 1,581 ms (pin round). Pin lag on 5 nodes: mean about 1.1 s, max 3.4 s.

## 2. Speed with each keeper
- The one row that varies keeper count: 3 / 6 / 9 / 16 keepers = 6,006 / 15,222 / 23,014 / 35,734 final/s. Prototype 8fb74f5, copy-push design (not the current one). K/FACTS-2026-11-05.md UPDATE 5.
- Honest line: more keepers means more capacity. The prototype row and the design (a keeper has no vote) support it. It is not yet measured on the current build.
- "500 nodes about 6-10M final/s" is an estimate. Never quote it as measured.

## 3. Earning: nothing has paid out on real nodes
- Keepers: paid from the fee box. The pay rule is merged. Built, not live.
- Mining pay: measured work, cap 30%. Built, not live.
- Referrals 3% to 15%: design only.
- Name rent 3 EUR a year: built in a worktree, not deployed.
- Browser earning per FXN ID for storage and compute work: built in part, not live, unmeasured.

## 4. Compute contribution
- Node roles exist in code (fxn node run --roles chain,resolvers,relay,store). FXN Runner is local only. None of it is usable on the devnet today.
- A browser adds no payment speed today. At genesis, keepers are foundation nodes first.

## 5. Data store
- IPFS is removed from the keeper path (landed, not live). A pin is a hash-checked write into the keeper store.
- Each segment is held by 3 of the keeper's 4 named pinners. Final does not wait for the pin. Say "our own nodes", never "thousands".
- Sharded storage is a design study only.

## 6. Streaming
- The live-rooms resolver (streams, collab, games, 3D, audio) is design only: "Nothing in this note is built" (D/live-rooms-design.md).

## 7. Chains
- Anyone who pays the 15,000 FXN launch fee and locks 15,000 FXN stake can launch a chain. The launch founds the chain's DAO. Built, devnet not live.
- **A world is not a chain.** A world is a scene in its own grammar (fxn-3d studio). No file says a world is a chain.

## 8. Products
- Live now on the old infra: the name gateway, the DNS gateway, the bundle upload door, the FXN ID gate.
- Ready, not live: FXN Browser desktop (no public download), mobile (not in stores), Studio, Deploy, Explore, Launchpad, DAO, Treasury, multisig safes, the bridge, ark-miner.
- FXN Motion: built, local, not live (on fxn-3d main since 2026-11-09). FXN Runner: local only. Mail, notify and games come after genesis.
