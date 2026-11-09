# Audit: Portal 101 ring and emblems on /intro

Layer: app. Reader: the owner and the one building agent. Captured 2026-11-09 at 1440x900 from http://127.0.0.1:3438/intro (`capture.cjs`, `capture-log.txt`). Every number is read off a screenshot in this folder or off the code it names.

## Verdict

The portal, the twelve stones and the hover, centre, click motion are built and play. What is off is everything placed on and around the ring: the objects sit over the joints between stones and outside the click area, they come in five render styles, and eleven of twelve do not say their topic. Placement alone removes most of the "weird". The emblem set is the large job.

## Why it feels weird (evidence)

- **Objects sit between stones, not on them.** `EMBLEM = { angle: -11, out: .5 }` puts each object 11 degrees clockwise of its stone's middle and 0.5 m past the ring's edge. A stone spans 30 degrees, so every object stands over the joint with the next stone (`04-ring-menu-hold.png`: the two keys sit between the 9 and 10 o'clock stones, the hex pods between 11 and 12). Nothing tells the eye which stone owns which object.
- **The objects are not clickable.** The hit arcs run from 0.92 to 1.3 of `at.r` (250 px), so they end 325 px from the centre. The objects centre about 375 px out. Hovering the thing you look at does nothing (`capture-log.txt`, the arcs' boxes).
- **The crop.** The FXN ID card's top edge is at y 60 under a header that ends at y 64, so it is cut (`04`). The padlock reaches y 840 over the footer chip at 845. The header stays on through the whole ring view. Only the film hides it (`css/world-pages.css` line 170).
- **Five render styles.** White wire keys and shield, a solid amber cartoon padlock, a flat grey baked card, a glowing brand mark, matte stone with mint strips (`04`, `10-hover-05-names.png`, `10-hover-09-rules.png`). The owner's rule is one: matte dark stone, crisp mint strips, a few amber accents.
- **Scale.** Keepers pods about 25 px each, the card 105 by 65 px, the Capacity ring 85 px: a 4x spread (`04`).
- **Four DEFXN marks on one screen.** The centre mark (150 px), the cap's plate, the Releases emblem (a glowing copy of the same mark) and the nav logo (`04`, `10-hover-07-releases.png`). The mark cannot also mean "Releases".
- **The hover splits into three places.** The stone lights, the object jumps to the centre, and the label appears 375 px out at 11 px (`10-hover-03-capacity.png`: "CAPACITY" floats alone at the right). For small objects the centre mark shows through them (`10-hover-02`, `-05`, `-09`, `-11`).
- **The click is not a match cut.** The OPEN end shows the drum frontal and bright on a mint plate (`21-click-records-0.9s.png`). The film's first frame is a dark three-quarter hall lit amber (`22-film-first-frame.png`). The shot is 54 frames, 2.25 s (`world/underground/geometry.mjs` `L54`). At 1.5 s the screen was black with only "A record enters" (`23-film-1.5s.png`). At 4 s the ring was back (`24-film-4s.png`).
- **No words at rest.** Nothing on `04` says what the ring is, what a stone does, or what a click costs.

## Top 10 fixes, ranked by impact

1. **Centre each object on its own stone's radial line and make stone plus object one hit area.** Set `EMBLEM.angle` to 0 and keep the owner's "a bit off and 2x" (`out .5`, `MICRO_SIZE .84`). Extend the hit arc's outer edge from 1.3 to 1.75 `at.r` so the object is inside it, or restore the `micro` circle per segment. Evidence: `04`, hit boxes in `capture-log.txt`. Cost: small (`geometry.mjs`, `intro.js` `arcPath`, one rebuild).
2. **Replace the eleven emblems that do not state their topic** (table below). Cost: large.
3. **One material language for all twelve.** Carry only three materials into the micro parts: `p1stone` body, `p1mint` for one strip or edge, `p1amberdim` for at most one accent. No white emissive, no wire outlines, no baked flat look at rest. The card keeps its own look only at the centre. Evidence: `04`, `10-hover-09`, `10-hover-05`. Cost: medium (`carryMaterials` override in `build.mjs`).
4. **Clear the chrome in the ring view.** Hide the header and footer chip on `.intro-world.ring-view` the way `data-intro="playing"` does, so the ring and its objects own 900 px instead of 780. If the header must stay, step `SPAWN_CAM.dist` from 15.2 to 16.6 so nothing crosses y 64 or y 845. Evidence: `04` card top at y 60. Cost: small (CSS, or one number).
5. **One mark.** Keep the centre mark only. The cap's plate becomes the FXN ID card's seat (fix 2, slot 0). Releases gets its own emblem. Evidence: `04`, `10-hover-07`. Cost: small.
6. **A word on every stone at rest.** Each stone carries its topic word (`RING.S<n>`, 11 px mono, tracked) in the dark band inside its tube arc, always visible. On hover the word moves to 18 px under the centred object with one line from `CINE.<id>.LINE` (what it does). Drop the floating tag at 1.5 r. Evidence: `04` has no words, `10-hover-03`. Cost: small to medium (`intro.js`, `world-pages.css`).
7. **Hide the centre mark during SELECT.** Key its opacity to 0 over four frames instead of stepping it back 2.5 m. It shows through every object smaller than the card. Evidence: `10-hover-02`, `-05`, `-09`, `-11`. Cost: small (`build.mjs` MARKS keys).
8. **Make the cut a match cut and give the film time.** The film's first frame must equal the OPEN end: object in `MERGE_POSE`, same front light (the NOTES name the mismatch). Hold the object at least 3 s with its line, no black frame, then return. Raise `L54` for the ring films or play the shot's own range twice. Evidence: `21`, `22`, `23`, `24`. Cost: medium (`world/underground`).
9. **One line of instruction at the hold**, under the ring, 11 px mono: "Hover a stone to see its object. Click to watch what it does, 3 seconds, then you are back here." Evidence: `04`. Cost: small.
10. **Doors that open nothing.** Names and The game answer "This one opens when its object is built." `MICRO` gives The game the shot `networkportal`, while `TOPIC` in `intro.js` has `null` in that slot. Decide once: wire the shot, or dim both stones and their emblems to 0.5 so a closed door looks closed. Evidence: `10-hover-05`, `10-hover-06`. Cost: small.

Fix 1 fixes the most for the least. Fix 2 fixes the most.

## Per-topic emblems

Size is the object's long side against the stone's 1.8 m length. Material is fix 3. Every part named exists in `parts/index.fxn`.

| Slot | Topic | Current (`MICRO`) | Verdict at 100 px | Replacement |
|---|---|---|---|---|
| 0 | FXN ID | `fxnbrowseridcardassembly` at .16 | Says "card", the only one that reads. Cut by the nav. Its barcode is noise at this size. | Keep. Seat it on the cap's plate at 0.8 of the stone's length, face-on, the mint block its only light at rest. |
| 1 | Records | `segmentdrumdeep` + `ledgercard` behind it | A barrel. | `ledgerstack` (three cards) with one `ledgercard` sliding out, its edge mint: "a record enters a list". 0.7. |
| 2 | Keepers | `shieldpod` + two `nodepod` | Three dashes. The shield says antivirus. | One `nodehousing` with a `recordcard` half inside and one mint dot above: "a machine takes a record and returns a receipt". 0.7. |
| 3 | Capacity | `towerblockcutb` + `sealdisc` | An orange circle. | Three `towerblock` slices stacked, each with a mint level strip, the top one raised a step: a meter that grows with keepers. 0.6, amber only on the top strip. |
| 4 | Chains | `recorddrum` + `rulestablet2` | A porthole. | Three `chainlinker` links, the first holding a small `rulestablet`: "a chain starts from one signed record". 0.8. |
| 5 | Names | `archkeystonetight` + `padlock` | A padlock: says locked, not named. | `nameplatewide` with a `slashmark` and a `nameplatebar` as the word, one mint lettering strip: a nameplate. 0.7. |
| 6 | The game | `ringblockdeep` + `recordslablit` | A dark wedge. | `gateframe2` + `gatestep` + `pathtile`, one amber light inside the door: "enter". 0.7. |
| 7 | Releases | `ptmark` | The brand mark, a duplicate. | `stamphead` over a `recordcard` with a small `sealdisc` pressed on it: "a signed release". 0.7. |
| 8 | Apps | `presscolumn` + `resolverdrum` | A stack and a barrel. | Three `slatecard` fanned and bound by one `ledgerclip` band: "one bundle". 0.7. |
| 9 | Rules | two `crystalkeyband` crossed | Old keys in white wire. The owner: keys look like cards. | Five `keycard` in five `keyslot` on one plate, four lit mint, one dark: "4 of 5 keys sign", the rule itself. 0.8. |
| 10 | Deposits | `beltrun` + `ledgercard` + `proofcrystal` | A gem on a shelf. | Two `stepslab` banks with a gap and one `recordcard` mid-air across it, a small dim `proofcrystal` on the card: "a deposit crosses with its proof". 0.8. |
| 11 | Network | three `hexpod` | Generic hexes. | Keep three `hexpod`, add three mint bars (`nameplatebar` in `p1mint`) joining them: a connected triangle. 0.6. |

Keepers, Capacity and Network were three pod-like shapes. Now: a machine, a meter, a triangle.

## Interaction: what the visitor must know before clicking

That the twelve stones are twelve topics (fix 6), that a click plays a short film and returns here (fix 9), and which stone owns which object (fix 1). Then the chain reads as one: the stone lights, its object comes forward with its word and line, the click grows it into the film's first frame, the film ends and the ring is back.

## Order for one building agent

1. Fix 4 (CSS, or `SPAWN_CAM.dist`). 2. Fix 1 (`EMBLEM.angle`, hit arc). 3. Fixes 5 and 7 (marks). 4. Fixes 6 and 9 (words). 5. Fix 3 (materials). 6. Fix 2: slot 0 seat, slot 9 key cards, then slots 1 to 11 in the table's order. 7. Fix 8 (film). 8. Fix 10. After each step: rebuild, run `capture.cjs` for the same 24 frames, compare before handing over. No tests until the owner confirms.

## Reduction test for the ring screen

1. About: twelve topics, one portal. 2. Dominant action: click a stone. 3. Know now: each stone's word, and that a click plays 3 s. 4. Hidden until asked: the film's line. 5. Repeated: the DEFXN mark, four times. 6. Only because the data has it: nothing. 7. Removable: the header, the floating tag, the cap's mark. 8. Leaving keeps state: the ring hold returns after each film. 9. Returning: the hovered stone stays hovered (`24`). 10. If the studio fails: words after 20 s (`intro.js`).
