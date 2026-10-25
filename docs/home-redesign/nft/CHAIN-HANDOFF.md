# What the card and the site check need from dense-wire

Written for: the next dense-wire session. From the NFT session, 2026-10-24. Nothing here is built on the chain side.
Every name below marked "proposed" is a suggestion. The dense-wire session decides the real one.

## The short answer

Real cards and signed scam reports need no new record kind. Both record kinds exist on `flux/defxn-defi-rs` main:

- **KASSET1**, the unique object (`flx-cap-object`, commit d9d474a, 2026-10-23). Its design note in
  `dense-wire/docs/design/pending/object.md` still says "uncommitted". The code is merged.
- **KATTEST1**, the attestation (`attest` capability, WARCH25, built 2026-10-20). With a roster (`KDLGSET1`, role
  witness) it answers "do k roster keys hold this word about this subject?".

What is missing is the browser's way to read them. The wire table (`dense-wire/src/wire_table.rs`, 164 commands) has
no read for either. Names already show the pattern to copy: the `DOM_PROOF` read, and one shared verifier
(`dense-wire/web/flx-domain-proof.mjs`) that every reader uses, so no reader trusts a node.

## 1. Real cards: read a KASSET1 object

**The read (proposed `OBJ_PROOF <object id>`, Public).** It returns the signed entries that establish the object's
current owner and pointer: its mint, then its transfers, or its burn. Like `DOM_PROOF`, it answers with what one node
has seen. A reader may ask more than one node.

**The verifier (proposed `dense-wire/web/flx-object-proof.mjs`).** `verifyObjectProof({ id, entries, mintKeys })`
checks every signature, that the mint was signed by a key the mint rule allows, and that each move was signed by the
owner of that moment. It returns:
- `{ kind: 'verified', id, owner, pointer, mintedAt, notChecked }`, where `pointer` is the object's `C[1]`.
- Or `{ kind: 'refused', failure, missing, remedy }` (the refusal law: name what failed, what is missing, and the fix).
- Or `{ kind: 'burned', id, burnedAt }`.

**A listing (proposed `OBJS_OF <owner key>`, Public).** The objects a key owns now, each to be checked with
`OBJ_PROOF` before it is shown. The wearer's menu lists the wearer's real cards from it.

**The mint path.** A builder in `dense-wire/web/flx-builders.mjs` for the mint record, signed in the browser. Who may
mint a card is the owner's decision (see section 4).

**What the NFT side does with it.** A card's object points (`C[1]`) at the content address of its card record
(`DFXNCARD1`, `js/nft/card-record.js`). The site reads the object, checks it, fetches the record by its address, and
derives the card's skin from it (`js/nft/skin-recipe.js`). The wear package then names a real card, and its
signature line (`DFXNSKINSIG1`, reserved in `js/nft/skin-package.js`) can be filled.

## 2. Scam and propaganda reports: read attestations about a site

**The claim.** A report is a `KATTEST1` claim. Its subject is the site's name (`radio.fxn`), or the record CID the
reporter reviewed. Its word comes from a published vocabulary with a closed set, proposed: `phishing`, `scam`,
`impersonation`, `propaganda`, `fine`. Its roster is a `KDLGSET1` of role witness, which the owner publishes.

**The read (proposed `ATTEST_ABOUT <subject> <vocabulary CID> <roster CID>`, Public).** It returns the roster record
and every claim about the subject under that vocabulary, retractions included.

**The verifier (proposed `dense-wire/web/flx-attest-proof.mjs`).** It reuses the attest capability's exact-value
agreement rule: each roster key counts once, with its newest claim, and a retracted or doubled claim is named, never
counted. It returns facts per word, `{ word, counted, of, keys, states }`, and never a verdict of its own.

**What the site side does with it.** The site check (`js/nft/site-check.js`) shows the facts as one more row of the
wearer's menu: "2 of 5 roster keys report this site as phishing", with the keys and their dates. It still never says
a page is true or false. The FXN Browser can show the same facts in its own chrome, where a fake page cannot draw.

## 3. The rules every part keeps

- One verifier per record kind, in `dense-wire/web`. The site and the browser copy it byte for byte. A drift test
  fails on any change (as `gateway/vendor/dense-wire/` does today).
- No store outside dense-wire answers who owns a card or what a roster said. A cache holds only signed entries that
  are checked again on read (`docs/DEFXN-NAMES-ONE-SYSTEM.md`, rule 1).
- A refusal names what failed, what is missing and the remedy.
- `npm run names:check` keeps passing: a report is keyed by a name, but it never claims, moves or points a name.

## 4. The owner's two decisions

1. **Who may mint a card.** The NFT session's recommendation: the genesis key only, as name claims are today, until
   the planned access resolver exists.
2. **Who may sign a report: the roster.** The NFT session's recommendation: a roster of one, the genesis key, at
   first. Adding reviewers then changes the roster record, and no code.

## 5. Already built on the site side

The card's own skin, its wear package, the wearer's menu, the site check and the Card slot are built and live on the
real site, and checked (`docs/home-redesign/nft/WEAR-AUDIT.md`, loops 5 to 13). Today every card is a sample, and the
site check says "Check not set up" until the chain's genesis key is pinned in `gateway/name-config.js`.
