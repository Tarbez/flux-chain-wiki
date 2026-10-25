# PVA and skins on the chain: what was built (2026-10-25)

For: the owner, and the next session that wires the card face. Answers CHAIN-HANDOFF.md, section 1.

## What works now

The chain code is on branch `pva-chain` in `flux/defxn-defi-rs-wt-pva`. It is not deployed.

- **A PVA.** A key that received FXN activates one PVA. It cites the payment. One per key. It never moves.
- **Skins.** A key with a PVA mints skins. A key can hold many. Every skin can trade.
- **A trade.** The buyer signs first, then the owner moves the skin. A former owner cannot sell it again.
- **Two reads.** `OBJS_OF <key>` lists what a key owns. `OBJ_PROOF <id>` gives the signed records behind one object.
- **One verifier.** `dense-wire/web/flx-object-proof.mjs` checks every signature in the browser. The site has a copy
  in `js/dense-wire/`, and a test fails if the copy changes.
- **The site read.** `js/ark/chain-cards.mjs` reads the signed-in identity's PVA and skins and shows only what
  verifies.

Design and rules: `flux/defxn-defi-rs-wt-pva/dense-wire/docs/design/pending/pva-skins.md`.

## How to run the test flow

```bash
cd /Volumes/PortableSSD/flux/defxn-defi-rs-wt-pva/dense-wire && cargo test --lib objects -- --nocapture
```

It runs two identities on one node:

1. A earns FXN by a mining payout.
2. B tries to use A's payment. Refused: `NotEarned`.
3. A activates its PVA. A second one is refused: `PvaTaken`.
4. A mints two skins. B, with no PVA, cannot: `NoPva`.
5. B signs for skin 1, and A moves it to B.
6. A tries to move its PVA. Refused: `PvaIsBound`, from a client and from a peer.
7. A pays B in FXN. B activates its own PVA.
8. The node replays everything from zero and gives the same answers.

The browser half:

```bash
cd /Volumes/PortableSSD/flux/defxn-defi-rs-wt-pva/dense-wire/web && node --test test/object-proof.test.mjs
```

## What was tested

- Chain: 4 new tests pass. The capability, adapter, blob, wire table and gate suites pass.
- Browser: 4 new tests pass. The builders write the same bytes as Rust. The verifier refuses 5 kinds of lie.
- Site: 2 new tests pass (`tests/dense-wire-object-proof-vendor.test.mjs`).

## The card's own id (owner, 2026-10-25)

A real card has no number. Its card record and its wear name the PVA's object id in an `O` box:

- `DFXNCARD1-O<object id>-I<owner>-T...-D...` is the card record (`js/nft/card-record.js`).
- `DFXNWEAR1-O<object id>-M...-P...` is the wear a site keeps (`js/nft/wear.js`).
- The card's mix is drawn from the object id, so the same PVA looks the same on every page (`js/nft/traits.js`).
- The seal and the menu call it "PVA ab12cd…9f0e". A sample keeps its number.

On `/account`, a signed-in identity with a PVA now sees its real card and a "Try it on" button. The site reads the
card from the node the wallet uses, and checks it in the browser first.

Test: `node tests/nft-object-card.cjs`.

## Skins (2026-10-25)

A skin's own record is `DFXNSKIN1-T<table>-W<base 36>`. W lists, per layer, the element the skin puts on, or none.
The mint carries the whole skin in its 32-byte pointer: `df51`, the table, then W. So a skin's look is in its own
chain record, and no store holds it (`js/nft/card-record.js`, `DefxnCardRecord.skin`).

- **Mint.** The shop's "Mint as a skin" opens `/account?mint-skin=DFXNSKIN1-...`. With your PVA there, "Mint this
  skin" shows the full signing review. After your yes, it signs the mint and reads the skin back from the chain.
- **Wear.** While your PVA is on, the wearer's menu lists "Try your PVA" and "Try skin ..." for each skin you own.
- **Trade.** Two steps, one on each device, each after the full signing review:
  1. On `/account`, the owner presses "Copy trade link" by a skin and sends it: `/account?take-skin=<id>`.
  2. The taker opens it and presses "Accept this skin". This signs consent and moves nothing. The page copies a
     link back: `/account?give-skin=<id>&consent=<id>`.
  3. The owner opens that link and presses "Give this skin". The page checks the move with the one verifier before
     it sends it, then reads the skin back as the taker's.

  A consent is good for one state of the skin only. A former owner cannot give it again.
- **Sale.** The owner sets a price under "Sale link", then presses "Copy sale link". The buyer presses "Accept and
  pay". That signs the consent, then a sale, each after its own review. The price leaves the buyer's wallet into a
  hold for that sale only. When the owner presses "Sell this skin for ... FXN", the skin and the FXN move in the same
  step. If the owner does not move it in time, the buyer opens `/account?end-sale=<consent>` and takes the FXN back.

Tests: `node tests/nft-object-card.cjs` and `node --test tests/dense-wire-object-proof-vendor.test.mjs`.

## What is left

1. **One gate per node.** A late move to a sale, sent along a peer path, moves the skin and pays nothing. The owner
   who signs it chose that.
2. **Seen in a browser.** The account page, the menu, the mint, the trade and the sale are tested in Node only. They need a
   node that holds a PVA.
3. **Two real cards can share a mix.** No page holds every card, so this needs a registry check.
4. **FXN on a fresh local node.** Today only a mining payout or a transfer gives a key FXN. The devnet faucet (devnet
   plan, decision 5) is the easy way. Until it exists, the flow runs as the node test above.
5. **Deploy.** The devnet nodes run the old build. Deploying is the owner's call.
6. **Two old site tests fail.** `tests/dense-wire-signature-final.test.mjs` (the site's parser copy is old) and
   `tests/security.cjs` (other uncommitted CSP edits in `index.html`). Both failed before this work.

The site files are not committed. The defxn checkout holds other uncommitted NFT work, so no branch was made there.
