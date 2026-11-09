# Direction input for the intro story (2026-11-09)

Reader: the producer who merges the intro story, and the ten writers. Source: the direction session (story and game direction for the fxn-3d world). Writing only: this file builds nothing and changes no other file.

Status words in this file: **ruled** means the owner said it. **Not confirmed** means the direction session drafted it and the owner has not confirmed it.

## 1. SITE-FILM.md: what is confirmed and what still applies

`flux/fxn-3d/docs/design/direction/SITE-FILM.md` (the 18 scenes, the Hall of Portals, the punch lines) is **not confirmed as a whole**. The owner has not confirmed any scene, shot or punch line in it.

The rules in its section 0 come from owner rulings, and they stay:

- **Show the why, never tell it unasked** (ruled, 2026-11-08). The world acts first. The line names what was just seen. The reason comes only on a Why press.
- **DEFXN is named once** (ruled, 2026-11-08). After that, the site says FXN or the product's own name.
- **No faith staged** (ruled, 2026-11-07 and 11-08). No altar, halo, worship light or holy place.
- **No people from the game** on the site. The visitor is the only hand, and the camera is the visitor's eye. Not confirmed, but it keeps the site and the game apart.

What is stale in SITE-FILM.md and must not carry into the intro:

- "SUTUPA City" is now **Stupa** (ruled, 2026-11-08). The site needs no city name at all, because the site has no game story.
- "The sun from the Well" is a place from the old lore. The Well is an open question in the game. Use plain light words instead: daylight, neon, lamp.
- The **Copies** punch line "Four copies of every chain" is wrong against the facts. The facts say each segment is held by 3 of the keeper's 4 named pinners. Final does not wait for the pin (`00-facts-genesis.md` section 5).
- The **Fund** vault "shows the day it opens". That is the game's Day Lock. On the site, keep it as a safe that releases on a schedule only if the genesis session confirms the vesting rule for the scene.

What still fits the intro, as scene ideas only: Arrival, Why, Key, Final, Cheat, Name, the Hall. Each one shows a rule happening. None of them is confirmed.

## 2. The hand-over from the site film to the game

- **The site film ends at Release Gate.** Release Gate is the door to the game. The owner links it later. Until he does, the gate stays shut.
- **A shut gate shows a refusal that names what it needs.** It says what is missing and when it opens. Suggested words: "The game runs on the owner's machine only. This door opens when the game has a public build." Not confirmed.
- **The visitor's FXN ID is the thread.** The film's key scene and the game's character start from the same act: a person initiates an FXN ID that only they hold. In the game, quest 1 asks the hero to sign page 0 with their own key, and a stranger asks for the key file and is refused. That is the bridge. The site shows the act. The game lets you live it.
- **The game is not live.** The facts say the game runs locally only, and no person has played it. The site may show the door. It may not say "play now".
- **A world is not a chain.** Never write that a game world is a chain. A Deploy launch gives a resolver its own chain. That is the product fact.

## 3. Lore lines the site must never state as fact

These are game fiction. The site never says them as true:

- Any city name: Stupa, SUTUPA City, DEFXN City. The site has no city.
- The Second Reality, the dream, the Board, the Tally, the Founders, the Day Lock, the Fam as five Players. All of these are story.
- Levels, XP, ranks, damage, loot. All game design, never chain facts.
- "Each world is its own chain." Planned story direction only, and not confirmed.
- "Everyone is a Player." The facts say a browser adds no payment speed today, and nothing has paid out on real nodes.
- Any number from the game: hp, fxn amounts in quests, the coat price.
- Any speed that is not labelled "built, not live" with its conditions. The genesis facts file is the only source.

## 4. The identity story: initiate your FXN ID, shape it, carry it, grant access

Owner ruling, 2026-11-09: the first act is called **Initiate FXN ID**, never "create a key". This is the direction view. Not confirmed. Each step is one act a hand does, and each act matches a real mechanism. The status of each mechanism must come from its owner session before a line ships.

| Act | What the visitor sees happen | The real mechanism | Status to confirm with |
|---|---|---|---|
| **Initiate FXN ID** | The visitor initiates their FXN ID. It forms in their hand and stays there. Nothing leaves the scene. | FXN ID is one file that holds your keys. It stays on your device and is never uploaded (`flux/defxn/docs/glossary.md`). Product catalogue: FXN ID built, the FXN ID gate live. | the FXN Browser or identity owner |
| **Shape** | The visitor adds a name to the door, then a fact someone vouched for. The key stays the same. | A flat `.fxn` name. An attestation is a signed fact by a known key (chain attest resolver). | the names owner, the genesis session |
| **Carry** | The same key opens a second door, then a third, each a different place. | One key signs in to every app that reads FXN ID. Same mark on every door. | the FXN Browser or identity owner |
| **Grant** | A visitor hands a door a pass with three marks: what, how far, until when. The door opens. The pass runs out and the door shuts. The visitor can take the pass back early. | Access control (the chain ACL resolver, `flux/flux-access-resolver`) and delegation with a role, a scope and an end time. | the genesis session |
| **Refuse** | Someone asks for the key itself. The hand stays shut. The door still opens with a signature. | A site gets a signature, and the key never leaves the device. This is the same act as the game's quest 1. | the FXN Browser or identity owner |

How the story reads, in five beats:

1. You initiate your FXN ID. Only you hold it.
2. You put your name on it, and others can vouch for you.
3. You walk through many doors with the same FXN ID.
4. You choose who comes in, how far, and for how long. You can take it back.
5. Nobody else can hold your FXN ID. They can only ask you to sign.

**The direction's one rule for every identity line:** show the hand do it, then name it. "Your key never leaves your hand" is shown by a stranger asking for it and the hand staying shut. Never say it before the scene shows it.

**One warning.** The facts say the FXN Browser has no public download yet. The intro may show what the identity does. It may not say "download it now".

## 5. What a record is: how the whole site teaches it (owner, 2026-11-09)

Owner's order, 2026-11-09: "that's how we need to educate our visitor for the defxn site... it should apply to the rest of the site." This applies to every page of the site, not only the intro. Every page that says "record" uses these words and shows these acts. Statuses follow `00-facts-genesis.md`: the new devnet is not deployed, so a chain claim is "built, not live" unless the genesis session says otherwise.

**What a record is, in one line.** A record is one entry written into the chain. It says what happened, for example "Ana paid Ben 5 FXN" or "radio.fxn now belongs to this key".

**A record has three parts.**

1. **What happened.** The data: who, what, how much, when.
2. **Who said it.** A signature from the person's key. It proves that person made it. Nobody else can make that signature.
3. **Where it sits.** Its place in the order. It names the record before it, which is what makes a chain.

**Two rules every visitor learns.**

- **Nobody can change a record.** An edited old record breaks its link to the next one, and everyone sees the break.
- **A mistake is fixed by adding a new record.** The new record says "this replaces that one". The old one stays. The history stays.

**What FXN adds.**

- **A record carries its result.** A payment record also carries the new balance. A reader needs that one record and never replays the ones before it.
- **Each key has its own list.** The newest record on your list is the head. The head says where you stand now.
- **A keeper orders your record and returns a signed receipt.** The receipt makes it final.
- **Two different records at one place on one list freeze that key.** That is how a cheat is caught.

**How a page shows it.** Show the act first, then name it (section 0's rule). A record is signed, it lands, a receipt comes back, and then the line names it. A forged record is shown failing before any line says why. Use these words: record, signature, list, head, keeper, receipt, final. Use no other word for the same thing.
