# 06. The storyteller's idea: a book only you can write

Layer: app (the site intro film over the fxn-3d archive objects). Reader: the producer who merges the nine story files, then the
owner. Date: 2026-11-09. Facts: the three 00 facts files here, the identity and chain manifests, home.js, SPACE.md and SITE-FILM.md.
The game lore gives tone only.

## The one sentence a visitor retells

**"FXN gives you a book only you can write. Your key stamps every page, keepers hold copies so nothing can be lost or
rewritten, and at every door you grant or deny who may know you."**

Each clause is a fact today:

| Clause | The fact behind it | Source |
|---|---|---|
| only you can write | "Your FXN ID. Only your key writes to it." | home.js LANDING.B2.MONO |
| your key stamps every page | "Its fields in order, then your signature." | worldchain.js, the Signature line |
| nothing rewritten | "Revisions {a} to {b} are kept. Nothing is rewritten." | worldchain.js |
| keepers hold copies | copies go out. 3 of a keeper's 4 named pinners hold each segment | home.js CINE.KEEPERRING, genesis facts 5 |
| grant or deny | a site asks through a prompt. You grant or deny, and you revoke a grant later (dev build) | browser facts 2, worldidentity.js SIGN.S1 |

## Three metaphors against the truth

| Metaphor | Where it lies | Verdict |
|---|---|---|
| **A passport** | Someone else issues it and can revoke it. On FXN nobody issues your chain. You make the first record. | Fails |
| **A house with a door** | A house is a place. It does not travel, has no order and says nothing about copies. | Fails |
| **A book of numbered pages, each stamped by your hand** | None found. The weak spot is "others read only when you allow it": today a page is checkable by anyone who holds your public key. What you control is the door: a site learns who you are only when you grant it, and you can take the grant back. Sealed pages (encrypted to chosen keys) are an idea on /resolutions, not built. The film shows the door, never a sealed page. | Keeps |

Why the book never lies. Pages in order: a chain. A stamp on a page: a signature, which shows who wrote it and does not prove the
words true (worldchain.js says exactly this). A correction is a new page beside the old one: a revision. Copies kept apart: keepers
and pinners. You carry the stamp: a keypair made on your own device, wrapped by the OS secure store, never sent to a server
(browser facts 1). The network holds the copies. You hold the only hand that can write.

Two sources give two rules for a grant. The /identity page says "A yes lasts for that tab only". The browser stores the grant until
you revoke it. [FACT NEEDED: which rule the film shows.] One book across the browser's own pages works in the dev build. Carrying it
across worlds and machines waits on the chain, so the film labels that as the design.

The lore holds the same image: in Stupa "a person's book is their life". The film never says Stupa. It borrows one picture.

## The chapters

One person's book, from its blank first page to the door it opens. The world acts first. A line names what was seen.

| Chapter | What the world does | The line after | Objects | State |
|---|---|---|---|---|
| 1. Arrival | The camera comes through the portal into your dark archive. Lights wake bay by bay. The screen turns on and the kernel builds on it. | "This is your archive. DEFXN runs under it." (the one time the name is said) | Archive, DEFXN Kernel | built |
| 2. The first page | On the screen a chain stands with one empty record. Your key forms on your device, and the record takes your stamp. | "Nothing. It is the first record." / "Only your key writes here." | DEFXN Kernel, screen | built. [FACT NEEDED: no object shows the key forming] |
| 3. A page is kept | A record leaves the screen. Ledger Line takes it and a receipt returns. Keeper Ring sends copies. Keeper Tower stands behind it. Rule Book opens on the rule it followed. | "A record enters. A receipt returns." / "The record goes out as copies. Keepers hold them." / "Your machine keeps the network running." | Ledger Line, Keeper Ring, Keeper Tower, Rule Book | built, not live |
| 4. The door asks | A door asks to know you. Deny: it shuts and nothing of you passed. Grant: a signature crosses, the key stays in your hand. Later the hand takes the grant back and the door's light goes out. | "A site asks. You grant or deny." / "It checks your signature. Your key never leaves your device." / "You can take it back." | [FACT NEEDED: Name Gate is parked; which object plays the door] | dev build today. The FXN ID gate is live on the old infra |
| 5. What the book builds | Chain Drum turns. App Bundler stamps and App Bundle ships. Multisig Lock takes 4 of 5 keys. Bridge Span carries a deposit with its proof. Network Wall lights. Network Portal opens. | the object lines in HOME.LANDING.CINE.* | Chain Drum, App Bundler, App Bundle, Multisig Lock, Bridge Span, Network Wall, Network Portal | built, devnet not live |
| 6. Every book makes the network | Racks join the ring one by one. The gauge rises. | "More keepers, more capacity. On a prototype, 3, 6, 9, 16 keepers gave 6,006, 15,222, 23,014, 35,734 final a second." | Keeper Array (missing) | prototype only, not the current build |
| 7. The gate | Release Gate opens on the same key that stamped page one. Light runs through it toward the game. | "Your key opens the gate." | Release Gate | built. The game link comes later |

Chapter 2 is new. Without it the film is a tour of machines. With it every object acts on the page the visitor saw born.

SITE-FILM.md's 18 scenes share this spine, and chapters 3 to 5 reuse its shots. Two of its punch lines fail the facts. "Start a
chain. Launch a world." says a world is a chain, and no file says so. "Four copies of every chain" overstates 3 of 4 named pinners.
The game it points to runs on the owner's Mac only, and no person has played it.

### What the chapters leave out, and why

- **Earning.** Built in part. Nothing has paid out on a real node. A Why button says "built, not live".
- **Streaming.** Design only. Nothing in the film.
- **Worlds.** A studio document today. The true line is "a launch gives a resolver its own chain" (Chain Drum).
- **The data store.** A pin is a hash-checked write into the keeper store: chapter 3 already. Say "our own nodes".
- **Browser compute.** Adds no payment speed today. Home Node waits for a measured fact.

## The five moments people remember

1. **The empty first page.** A whole archive wakes around one record with nothing in it, and then your stamp lands. The visitor
   understands "only your key writes" before any word about keys.
2. **The receipt, and the second stamp.** One keeper signs, and the record is final. No vote. Then the stamp drops twice on one page,
   and the keeper's bond lamp goes dark: a keeper who signs twice pays the one it cheated (SITE-FILM scene 9, home.js B3.MONO).
3. **The copies land.** The same page arrives in three rooms at once. The visitor drags one tower away, and the page stays lit in the
   others (SITE-FILM scene 10, "Try it"). Nothing was lost.
4. **Deny.** The door asks. The visitor's hand says no. The door shuts and nothing of them crossed. Then grant: a signature crosses,
   the key does not. Then the hand takes the grant back. This is the moment the owner asked for, and it works today in the dev build.
5. **The same key opens the gate.** The key that stamped page one opens Release Gate. The game is the same book, carried further.

## Rules for the writers who take this on

- The visitor is the hero. No character from Stupa appears. No voice explains a product: a hand uses it, then the line names it.
- Every number carries its machine and its date. "Final" is one keeper's signed receipt (owner ruling 2026-11-05).
- The network's start is an initiation. Nothing is staged as worship.
- No sealed page, payout, stream or live devnet appears as live. A planned thing is labelled or absent.
