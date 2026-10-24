# True site skinning: audit and plan

Written for: the owner, the defxn site session (defxn-70), the genesis session (genesis-b2) and the Ark UI
owner. Status: 2026-10-24, written by the NFT session (defxn-30), reviewed by the site session (defxn-70). Decisions 1 and
2 taken by the owner the same day.
Every card here is a sample. No real card exists yet.

## The answer first

- **Today:** a sample card dresses the defxn site from end to end: colours, chrome on 38 Ark UI parts, the
  account avatar, the profile card, and the Skin lab. A visitor wears it only by a review address or the profile
  switch, and nothing is kept.
- **Missing:** a real card held by an identity, a consent step, a kept choice, a check that the site is genuine,
  layouts for the navbar, new kinds of element, and motion timelines.
- **Three moves make it real:**
  1. The skin travels as a small signed **package** held by the identity: tokens, six drawings and rules. It is
     about 2 KB compressed (measured below). A site needs no NFT code to wear it.
  2. The **identity decides** where the skin goes. The broker hands the package only to a site whose name record
     verifies, and only after the person says yes.
  3. The **trusted parts** (the identity bar and the site's seal) are drawn outside any skin, so a skin can
     never forge them and a phishing copy cannot show them.

## 1. What works today

Built and measured on 2026-10-24 (headless Chrome, Apple M2, local server, gzip -9).

| Piece | Where | State |
| --- | --- | --- |
| Card to skin recipe | `js/nft/skin-recipe.js` | Tokens, six chrome drawings, rules measured from the drawings. 471 of 471 drawings pass Ark UI's sanitizer. |
| Ark UI skin layer | `js/ark/vendor/ark-kit-skin.js` | Applies tokens, chrome and per-part rules with exact undo and a contrast gate. |
| The site's part map and policy | `js/ark/skin-parts.js`, `js/content/skin-policy.js` | Which part may take which rule, per card family. Edited in the CMS Skin lab and stored as FLX. |
| Wearing | `js/ark/skin-site.js` | `?skin-sample=27\|263\|512`, and the profile switch. Nothing is kept. |
| Card on the profile | `js/ark/profile-card.js`, `js/nft/card.js` | The card in 3D, exact unmount, no idle frames. |
| Avatar | `js/nft/scene.js` | The card's art cut square in the account button. |
| Card world | `js/nft/scene.js` | Painted once as a still image. By the owner's rule it shows only where the ring world (the grid's core 3D) is off. |
| Every Ark part in a skin, on the real site | `/palette`, Components tab | All 29 Ark blocks from Ark UI's own examples, grouped by Ark's categories. The examples come from a lazy chunk, `js/ark/vendor/ark-kit-examples.js` (4.2 KB gzip), that only that view loads. `/palette?skin-sample=263`: 23 parts took rules. |
| Every Ark part in a skin, for review | `docs/home-redesign/nft/primitives.html` | The same 29 blocks plus 2 behaviour pieces, with what each part took and what Ark UI took back. |
| Ark UI's cover check | Ark UI 0.2.20 | A tag, strip, emblem or divider that would cover text or a control is taken back, and a full frame falls back to corners. Each is reported with its reason. |
| One source of each part's rules | `DefxnSkinParts.ALLOW` | The site's table decides which part takes which rule. The recipe's own part table no longer decides parts on the site. |

What the gallery found under card 263:
- 13 of 31 parts take colours only. The site's table gives them no chrome yet.
- Ark UI falls back by itself. A full frame on a card, a stat or a figure becomes corners, because it would cover
  their content. The list marker is taken back, because it would grow the list's box.

## 2. What is missing

| Gap | Why it matters | Who builds | Needs first |
| --- | --- | --- | --- |
| A real card held by an identity | Every skin is a sample. | The names and identity sessions | Decided: a `KASSET1` object (decision 1). `KASSET1` is on a branch, not committed. |
| A card lookup for a signed-in identity | A site cannot find the visitor's card. | Identity session | The card record |
| Consent to wear | A site must not restyle itself as someone without their yes. | Broker | The broker's existing yes-per-site step |
| A kept choice | A reload drops the skin today. | Identity session | The card record. Stored as FLX in the identity, never in site cookies. |
| A check of the card's signature | A forged card could pass as someone's. | Site session, with the one shared verifier | The card record |
| A visible check that the site is genuine | A visitor sees no proof of who runs the page. | Names and site sessions | A dense-wire target that binds a name to its site key and origins |
| A trusted surface a page cannot draw | Anything drawn inside the page can be copied by a phishing page. | Ark browser, broker | The name-proof state in the Ark browser's own chrome |
| Layouts and density | The navbar cannot become the visitor's navbar. | Owner review, then Ark UI | The gallery page, already built |
| New kinds of element | A card can only dress six kinds of part. | NFT session and Ark UI | Ark UI opening its closed sets by an extension hook |
| Motion timelines | Elements cannot move together, or become animated components. | CMS 3D studio, Ark UI, NFT session | A timeline grammar in FLX |
| One skin client for every site | A second DEFXN site would copy the site's code. | SDK owner | The skin package |
| A cover check that follows changes | It runs when a skin goes on and when a part mounts late. A popover's content that appears on open is not checked again: under card 512 the menu popover's frame line crosses text. Ark UI is fixing re-checks on open and resize. | Ark UI | - |
| FLX for the CMS's motion and component stores | `element-motion`, `canvas-transitions`, `states` and `components` still write JSON. | Site session | The world store's pattern (`js/content/world.js`) |

## 3. The experience we aim for

1. **You open a DEFXN site,** for example `radio.fxn`. It shows its own look. At the end of its navbar sits your
   identity bar. Your Ark browser draws it, or on the plain web the broker draws it in its own frame. It names the
   site as the site's name record proves it: `radio.fxn`, name verified, and who published this build.
2. **You press your card** in the identity bar. Three choices appear: wear my card here, always wear it on verified
   DEFXN sites, or wear my look without saying who I am.
3. **You say yes.** The broker hands the site your signed skin package. The site checks the signature with the one
   shared verifier.
4. **The site transforms once.** Its colours change, and its parts take the card's chrome. The navbar takes your card's
   arrangement, once layouts are on. Your avatar appears. Your card's arrival timeline plays once and stops. The
   ring world, the grid's core 3D, stays as it is (the owner's rule).
5. **The site's content stays the site's.** You change how it looks, never where its links go.
6. **On a copy** at a look-alike address there is no DEFXN name record. The identity bar says so, the broker refuses
   to sign you in or hand over your card, and your card never appears. The refusal is the protection. The missing
   card is the warning you can see.
7. **"Use the site's look"** puts the site back exactly as it was.

## 4. How

### 4.1 The skin travels as a package, not as code

A skin is data the NFT engine derives once. A site needs only Ark UI's skin layer and the package.

| Measured (card 27 / 263 / 512) | Size |
| --- | --- |
| The card's record line (`DFXNCARD1-...`) | 66 / 98 / 98 characters |
| The whole skin package: tokens, six drawings, rules | 2,160 / 1,957 / 1,749 bytes gzip |
| Ark UI's skin layer, which every wearing site loads | 66,041 bytes gzip |
| The NFT files a site loads today to make the package (`skin-bundle.js` and five recipe files) | about 36 KB gzip |
| The card world as a still JPEG (quality 0.75) at 1440x900 | 54,756 / 58,268 / 60,269 bytes |
| The 3D engine that paints the world now (three.js, art3d.js, scene.js, 3D settings) | about 213 KB gzip plus the card's builder files, then 208 to 353 ms to paint at 1440x900 |

What follows from it:
- **The package is derived, never authored.** Anyone can derive it again from the record line and the public layer
  table, whose version the package names. A site checks the identity's signature over the package. Any DEFXN node
  can re-derive it to audit a signature.
- **Drawings go by address.** Each chrome drawing already has a content hash (`js/nft/chrome/<layer>-<name>-<hash>.js`).
  The package can name the six hashes instead of carrying the drawings, and every site shares one cache of them.
- **Stills replace the engine where the 3D is not the content.** The world and the avatar are still images. A site
  without its own 3D loads about 55 KB of picture instead of about 213 KB of engine, and paints nothing.
- **Storage is FLX.** The package becomes one grammar of records (proposed label `DFXNSKIN1`), held by the identity
  next to the card. It is never JSON and never a site cookie.

### 4.2 Wearing from the identity

What exists:
- The broker (`broker.html`, `js/broker/broker.js`) shares `{ publicKeyB64, displayName }` with a site only after
  the person says yes to that exact origin. The yes lasts for that tab and that identity. It carries no card.
- `KASSET1` is a unique-object capability: one owner, one content pointer, mint, transfer and burn
  (`defxn-defi-rs/dense-wire/docs/design/pending/object.md`). It is built on a branch and not committed.
- The planned Identity resolver's public profile already names an avatar by content address, and the planned Vault
  resolver keeps items sealed to their owner (`docs/DEARK-RESOLVER-EXTRACTION-PLAN-2026-10-19.md`, rows R1 and R6).
- The sample card record `DFXNCARD1` is not signed and is not a dense-wire kind.

What to build:
1. **The card is a `KASSET1` object.** Its owner is the identity's key. Its pointer is the card record's content
   address. Minting, transfer and burning come with the capability, so nothing new is invented for ownership.
2. **The worn skin is a public record by the owner.** It names the skin package's content address. Changing a skin
   appends a new record that supersedes the old one. The old one is never rewritten.
3. **Private choices go in the Vault:** where to always wear, the nav preferences, and whether to say who you are.
4. **The broker's reply gains a card.** After the yes it returns the card object's id and the skin package's content
   address. The site fetches the package, checks that its bytes hash to the address, and checks the ownership proof
   with the one shared verifier.
5. **"My look only."** The broker returns the package address alone, without the key or the name. The site wears the
   look and does not learn who you are. A rare card is still recognisable, and the sheet says so.
6. **The click.** In the identity zone: "Wear my card here". One sheet says, in plain words, what the site will see.

### 4.3 The visitor's navbar, holding the site's data

The navbar keeps two zones in one bar:
- **The site's zone:** the brand and the routes, with the products in the mega dropdown. Its destinations come from the site's own data
  (`js/resolvers/header.js` builds it today, from the nav manifest `js/content/manifests/nav.js`). The card may change
  the arrangement, the density and the chrome. It never changes a destination, a label or the reading order. Ark UI
  already forbids reordering nodes.
- **The identity zone:** the avatar, the name, the site's seal and the wear switch. It is a locked part that no skin
  reaches, so a skin can never forge a seal. The site session confirms it is workable: the lock lives in
  `js/ark/skin-parts.js`, which loads only with a skin, using Ark UI's existing part-level lock. The header's size
  budget is untouched. The avatar still shows, because the site places it, not the skin.

What it needs:
1. The owner reviews the layouts on the gallery page, part by part. Ark UI has them already:
   - the mega dropdown: columns, tiles or a list;
   - tabs: pills, a rail or an underline;
   - a card: plain, framed or a ticket.
2. The site's table turns `layout` and `density` on for the navbar parts it accepts.
3. A small nav preference record, held by the identity in FLX: which arrangement, and which of the site's own routes
   to keep in front. Every choice points at the site's data, so it cannot add a destination.

### 4.4 Verification, and a self-certified verification grid

The aim: a visitor's own client proves which site it is on, and a page cannot fake that proof.

What exists:
- **One chain from a name to checked bytes, on the server.** The gateway turns a host name into a `.fxn` name, fetches
  its proof, verifies it with the shared verifier, takes the record's `blake3_cid` target, and serves the bytes only
  if they hash to it (`gateway/app.js`, `gateway/resolve-name.js`, `gateway/content.js`).
- **One shared verifier** (`dense-wire/web/flx-domain-proof.mjs`). It checks every signature, the final-signature
  rule, the genesis claim, the transfer chain and the record owner. It marks freshness `notChecked`.
- **The Ark browser verifies a name** before it opens it (`src/main/ark-name-service.js`). It opens `ipns`, `ipfs_cid`,
  `hyper` or `https_redirect` targets, not `blake3_cid`. Its address bar shows only the URL scheme
  (`src/renderer/renderer.js:6010`).
- **The browser's own window** is chrome a page cannot draw, and pages can ask it to sign a challenge for a stated
  audience (`src/preload/webview-ark-api.js`).
- **Signed attestations and disputes** exist in the Ark browser's trust service (`src/main/ark-trust-service.js`).
  The planned Attestations resolver (R20) is the shared envelope that Dead Ark and CR3TV both need.

What is missing, found during this audit:
- No record binds a name to its site. dense-wire's targets are content addresses, an https redirect and DNS. There is
  no site key and no allowed-origin target.
- The broker trusts origins by a pattern (`broker.js:32`: any `*.defxn.com`, plus localhost), not by a verified record.
- No visitor sees any of it: there is no seal, and no name-proof state in any address bar.
- Three defects, sent to the site session:
  - **Fixed by the site session:** the CMS publish script called a retired check that threw on every publish. It now
    awaits the new check (`scripts/lib/publisher.mjs`). Two of three tests pass. The third still fails, because the
    script imports a name helper through a retired shim. That move is the owner's.
  - **Open:** the site's copy of the dense-wire builders still writes the old record kinds
    (`js/dense-wire/flx-builders.mjs:13-14`). It needs a sync path from the shared source.
  - **Open:** the gateway's pinned genesis key is empty in this checkout (`gateway/name-config.js:14`). It needs the
    owner's key.

What to build, in the order that protects people first:
1. **Bind a name to its site.** Two new dense-wire targets: the site's public key, and its allowed origins. The one
   verifier returns them. This adds no store, no claim path and no second verifier, so it keeps every rule in the
   names law's "Do not build" list.
2. **The broker gates by name.** It answers an origin only when a verified record lists that origin. A look-alike
   origin gets a refusal that names the failure, the missing proof and the remedy. A phishing page then cannot get a
   signature, a key, a name or a card, whatever it looks like. The protection does not depend on people noticing.
3. **The client checks what it shows.** The Ark browser fetches by `blake3_cid`, checks the hash, and keeps the proof
   with the page. Its own address bar shows a name-proof state:
   - name verified, with its build and its owner;
   - a name whose build does not match;
   - no DEFXN name.
4. **The identity bar lives outside the page.** In the Ark browser it is browser chrome. On the plain web, anything
   that signs opens the broker's own window, whose address bar shows the broker. An in-page bar is information only.
5. **A personal seal.** The identity bar draws a seal from two things: a secret sealed in the person's Vault and the
   verified name. It picks an emblem, a corner and a palette from the person's own card. Each person learns their own
   seal for each site. A page cannot compute it, because it never sees the secret. The seal is a cue. The refusal in
   step 2 is the gate.
6. **The verification grid: attestations.** Signed statements about names, in the Attestations resolver's one envelope:
   "official site of", "impersonates" and "reported as a scam". Each is signed by a named key and can be retracted.
   Each reader chooses whose keys count: by default the network's own committees (DEFXN, Dead Ark, CR3TV), the people
   you follow, and you. The planned Standing resolver gives thresholds. Freshness compares several nodes, as the names
   law asks. That comparison is not built yet.
7. **Look-alike names are refused at the claim gate.** Public claims are not open yet. When they open, the one claim
   path refuses a name whose confusable skeleton (Unicode TR39) matches an existing name.
8. **Provenance, never a verdict.** For scams and propaganda, the client shows signed facts with their signers: who
   owns the name, who signed this build, and who labelled it and how. It never shows a conclusion the system did not
   reach, and there is no hidden list.
9. **A skin can never forge trust.** The seal and the identity zone are locked parts. A site wears only a package
   whose card object verifies.

### 4.5 New elements, and elements that become components

Today a card dresses six kinds of part with six drawings, and its five art layers make the world, the avatar, the
banner and the card. To show and shape new elements:
- **Map element kinds to part kinds, not to parts.** Ark UI already sorts every part into a kind (surface, list,
  control, rule, heading). A new element kind says which part kinds it dresses. No per-part list is written.
- **New slots, through the same pipeline.** Each new kind is a new layer folder, read by `make-layers.mjs`, held or
  kept on the review page, and sold in the shop at a price derived from its weight. Candidates: a control shape (the
  press of a button), a loader (moves only while loading, then stops), a pointer (only over non-text areas), and a
  badge shape (built already as the site kit's chips).
- **Shaped by people.** A piece made in the CMS 3D studio becomes an element file in a contributor folder, goes through
  the owner's review, then the shop. The maker's identity signs the file's hash, so the element keeps its author.
- **Ark UI opens its closed sets by an extension hook.** Today the rule names, the layouts and the six chrome pieces
  are closed. A registered extension keeps them closed sets, but lets a new value be added once, with its invariant
  tests, instead of by hand in two places.

### 4.6 Timelines from the 3D studio

A timeline makes a card's pieces move together and turns a piece into an animated component.
- **The model:** tracks. Each track targets one card piece (a chrome slot or an art layer) or one part kind, and one
  property from a closed set: move, turn, scale, clip, or the drawing of a line. Keyframes carry a time, a value and
  an easing from a closed set. A trigger starts it: wearing, arriving on a route, hover, press or focus.
- **The rails:** every timeline ends, so nothing idles. It lasts at most a fixed time. The site has no fades, so it
  moves and clips. With reduced motion it jumps to its last frame. It never flashes more than three times a second.
  It never moves a control's hit area while that control can be pressed.
- **The player:** the browser's own animation engine for the page (no frame loop of ours), and the card's 3D engine
  drawing on demand only while a timeline runs.
- **The storage:** a grammar of FLX records (proposed label `DFXNTL1`), held by the identity with the card. A
  timeline can be an element in the shop, like any other layer.
- **The studio:** the World panel today has knobs only, and the motion store has one move in and one move out per
  element. The studio needs a time ruler with a row per track.
- **A component** is then one Ark part, the pieces that dress it, its rules and its timeline. For example, an Arcade
  button: a cut edge, a press that scales to 97% and back in 120 ms, and an emblem that pulses once on hover.

### 4.7 Across DEFXN, Dead Ark and CR3TV

- **The owner's frame:** defxn carries the shared capabilities and the core resolvers. Dead Ark (Daro) and CR3TV
  (CR3) are app-chains that sign with defxn's Identity resolver (`docs/DEARK-RESOLVER-EXTRACTION-PLAN-2026-10-19.md`).
  So one identity can wear one card on all three.
- **One skin client for every surface.** The site's skin client moves into the SDK, beside Ark UI's skin layer, and
  each product syncs it with `deadark-theme sync-consumer`. No product copies it.
- **A site publishes what it accepts.** The site's part policy is already a structured value stored as FLX
  (`js/content/skin-policy.js`), with part keys in one spelling (`TABSLIST`, `SECTIONHEADER`). A signed manifest
  carries it as its FLX text or as that record's content address. A second site declares its own policy in the same
  grammar instead of copying defxn's table.
- **Dead Ark:** the Ark browser is the trusted surface: identity bar, seal and name-proof state in its own chrome.
  `chat.deadark.com` and the Ark app show the card's avatar through the Identity profile's avatar address.
- **CR3TV:** a creator's channel wears the creator's card. A viewer wears their own in their own view. The community
  evidence snapshot is already attestation-shaped, so a creator's "official channel" mark is a signed attestation.

### 4.8 Why people wear, and buy

- A worn card is seen: by its wearer on every verified site, and by others where a profile shows (the profile page,
  chat, comments).
- Every element is an item in the shop, with a price derived from its odds (`shop.html`, built as a sample).
- A site can say what a visitor wears. One tap opens the shop at that element.
- Buying needs a verified balance. FXN and Credits read "unavailable until a verified balance source is connected"
  today (`docs/account-auth.md`).
- What to measure once it is live, from signed records only: how many visitors wear a card, how many wearers open the
  shop, and how many shop visits buy. No number is shown before it is measured.

## 5. Risks, and how the design answers them

| Risk | Answer |
| --- | --- |
| A scam site copies a famous card's look | A look proves nothing. Only the seal outside the page and the broker's refusal protect. The copy says "a look is not a proof". |
| A rare card tracks its wearer | The default is the site's own look. Wearing asks per site. "My look only" says that a rare card is still recognisable. |
| A skin attacks the page | A skin carries no CSS and no script. Its rules come from closed sets, and its drawings pass the sanitizer (471 of 471). Locked parts and the contrast gate stay. Timelines are closed sets too. |
| A skin hurts reading or use | Both contrast rules, no reordering, hit areas and focus rings kept, reduced motion, no flashing. |
| Weight | The package is 2 KB and Ark UI's skin layer 66 KB. Stills replace the 3D engine wherever 3D is not the content. |
| Attestation spam or brigading | Readers choose whose keys count. Thresholds and retractions apply, and every label shows its signer. |
| The ring world (the grid's core 3D) changes | The card world never covers it, and the ring world never takes the card's colours (decision 2). |
| A decoration covers content after a change | Ark UI takes a covering piece back when a skin goes on. Re-checks on open and resize are being added. |
| Two sites made to look alike | The look proves nothing. The seal and the identity zone stay outside every skin. |

## 6. Phases

| Phase | What it delivers | Depends on |
| --- | --- | --- |
| 0. Done | Sample skins on the site, the profile card, the avatar, the Skin lab, the gallery of every part | - |
| 1. Real cards | `KASSET1` card objects, the `DFXNSKIN1` package, the broker's card reply, the signature check, Vault choices, a kept wear. Close the two open defects first. | `KASSET1` merged from its branch |
| 2. Verification | Site key and origin targets, the broker's gate by name, the Ark browser's name-proof state and identity bar, the client-side hash check, the personal seal | The names session and the Ark browser session |
| 3. The visitor's navbar | Layout and density reviewed on the gallery and turned on part by part, the nav preference record, the locked identity zone | The owner's review and Ark UI |
| 4. Motion and components | The `DFXNTL1` timeline grammar and player, the studio's track editor, element kinds by part kind, Ark UI's extension hook, signed contributor elements | The CMS 3D studio and Ark UI |
| 5. The verification grid | Attestation records about names, reader policies per network, the multi-node freshness check, the confusable refusal, the SDK skin client for Dead Ark and CR3TV | The Attestations and Standing resolvers, and the SDK owner |

## 7. Decisions for the owner

1. **What is a real card?** **Decided by the owner, 2026-10-24:** a `KASSET1` object. Its id is the mint record's
   content address, its owner is the identity's key, and its pointer is the card record. Ownership, transfer and
   burning come with it, so no card kind and no second ownership model is added.
2. **Does the ring world take the card's colours?** **Decided by the owner, 2026-10-24: never.** The ring world
   stays as the owner made it, and the card shows in the chrome, the avatar and the profile. The site session makes
   the one change in `js/world/ring-kit.js`: it reads the site's theme only and stops listening for skins.
3. **Where do layouts start?**
   - The mega dropdown and tabs first, for cards that wear a whole set. **My pick, because those parts have designed
     layouts already and a set keeps them coherent.**
   - Every card at once.
4. **Offer "my look only"?**
   - Yes, with the note that a rare card is still recognisable. **My pick.**
   - No: wearing always says who you are.
5. **Whose attestations count by default?**
   - The network's committees, the people you follow, and you. **My pick.**
   - Only the people you follow.
6. **The card's brand fonts on the site** (still open): the site's own fonts (**my pick**, because the site keeps
   three font slots), or the card's own two fonts, hosted by the site.

## 8. The rules this plan keeps

- Stored state is FLX. The skin package, the timelines and the choices are FLX records, never JSON.
- One name system. Every proof goes through dense-wire's one verifier, and nothing here adds a store or a claim path.
- Derive, do not author. Packages, rules and prices are derived from the layer table and the drawings.
- Nothing idles. Every timeline ends, and the 3D engine draws only on demand.
- A refusal names the failure, the missing proof and the remedy.
- The client never shows a conclusion the system did not reach.
- The ring world, the grid's core 3D, stays as the owner made it.
