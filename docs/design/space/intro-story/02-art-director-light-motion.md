# 02. Art direction: light and type in motion

Layer: app (the defxn intro over the site objects in fxn-3d). Reader: the producer, then the one building agent. Status: a direction note, 2026-11-09, not built, not confirmed. Every fact the light shows comes from `00-facts-genesis.md`. Where a fact is missing, the light stays off.

## 1. Light is the truth-teller

The archive is dark (world ambient .02-.03, BUILDER-BRIEF). How a thing is lit says what state it is in. This one rule lets the film show every part of FXN without showing anything planned as live.

| Light | Meaning | Objects |
|---|---|---|
| **Filled light** (the `glow` material, mint `--primary`, strips at full) | live now | name gateway, DNS gateway, bundle upload door, FXN ID gate (facts §8) |
| **Edge light** (`crystalEdges` only, body dark, strips at .45) | built, not live | the kernel and the twelve built objects of OBJECT-QUEUE.md |
| **No light, name only** (a dark bay, 11 mono `DESIGN ONLY, NOT BUILT`) | design | Live Room (facts §6), referrals (§3) |
| **Not in the film** | no fact supports it | "a world becomes its own chain" (§7: a world is not a chain). World Forge shows a world building in its own grammar, no drum beside it |

An edge-lit object never fills during the film. The first words after arrival say it once, in 11 mono on the kernel's still: `BUILT. DEVNET NOT LIVE.` The line stays in the lower left corner for the whole archive.

## 2. The light vocabulary

Four colours, from the glitch film maker: mint `5ef0c0` (`--primary`), amber `ffb547` (`--secondary`), bone `eef3ee`, ink `070a0b`. Mint is the network. Amber is **you**: your key, your choice, the one action, at most once per view (law 73).

- **A record** is a mint run along a rail: a bright head, a tail that dies over .4 s, then a dim trace held on the rail (`run`, the kit's `passLight`). Never a glowing body. It is seen because it moves.
- **A receipt** is the same run coming back, brighter at the head, landing as a short steady strip beside the sender. Final is the landing, not a flash. The strip stays.
- **A key** is amber, point-sized, on the FXN ID card's edge, lit with `lightHold`. Nothing else in the frame is amber while it shows.
- **Your identity** is the card. Its crystal face carries one steady mint strip from the moment it appears in Act 1 to the gate in Act 4. Every other light wakes and sleeps. This one never does. That continuity is how the visitor knows the card is theirs and travels with them.
- **Access granted** is the amber key touching a mint lock, and a strip opening from the touch point in both directions on `ui` (.19 s to 90 %, 3 % overshoot). The strip **closes again** one bar later, ends to middle, on `type`. That closing is the identity rule "a yes lasts for that tab only" (worldidentity.js), shown, never said. `Don't share` is the key held back: the lock stays dark, the record returns dim. No red.
- **A keeper joins** is one rack lamp coming on at edge level, then one `pulse` round the ring. The Keeper Array gauge rises four steps, 3 / 6 / 9 / 16 keepers (facts §2), one per beat on `number` (.5 s to 90 %). Under it in 11 mono: `PROTOTYPE 8fb74f5. NOT THE CURRENT BUILD.`
- **Copies** are four runs leaving one point at once and landing together 1.1 s later (facts §1). On the same still: `5 TEST NODES, ONE MACHINE.`
- **Earning** (Reward Flow) is light running back along the lines to the contributor, at edge level, under `BUILT, NOT LIVE. NOTHING HAS PAID OUT.` [FACT NEEDED: the fee-box rule's shape.]

Exposure: the archive starts at .35 and reaches 1 over Act 1 as the bays wake, then holds. [FACT NEEDED: whether the underground scene has an exposure control.]

## 3. Rhythm: where it breathes, where it hits

Clock: 120 BPM from `spring.mjs` (`BEAT` = 0.5 s, a bar = 2 s). "Too fast" has a measurable cause: the 2026-11-09 plan gives about 4 s to an object whose build alone takes 1.5-2 s, so action and words overlap. The fix is a cell.

**The cell: 4 bars, 8 s.** Bars 1-2: the object builds in staged motion (parts travel in on rails and lock on `heavy`, settle 1.56 s, then the strips light). Bar 3: the words, entering .25 s after the last part locks. Bar 4: **rest**, the world settled at 0 rAF, the words standing. The rest bar is where understanding happens.

**Hits** are one beat each, five in all: the mark's first glow, the tear on the click, the arrival flash, the first receipt landing, the key opening the gate. Each is followed by a hold of at least one bar. A hit never follows a hit.

**Consequence for length.** 18 objects at a cell each is 144 s plus the hits. A catalogue is not a story. The structure writer chooses which cells the film plays. The rest stand in the archive, edge-lit, for the visitor to walk to after the film. At 60 s the film holds 6 cells and the five hits.

| Moment | Seconds | Breathes or hits |
|---|---|---|
| Mark loads. `Welcome to FXN.` | 0-4 | the mark alone one bar, the words, a bar of rest |
| Portal 101 builds itself | 4-10 | 3 bars. The ring's edge is the lit subject, the click chip the one amber |
| Click: the tear | +0 to +1.6 | hit. The existing 48-frame Loopforge film, unchanged |
| Dark, then the arrival flash | +1.6 to +2.4 | hit, then one dark bar with only your card's strip lit |
| Bays wake, one per beat, toward the screen room | 8 beats | breathes. The camera on one curve, never a cut |
| The kernel builds on the screen | one cell | the first words of the archive |
| Each chosen object | one cell each | the record-and-receipt cell holds the fourth hit |
| Release Gate opens on the key | one cell and a hold | the fifth hit. The view holds wide |

## 4. Kinetic type in FXN Basalt

Faces: `var(--font-display)` (FXN Basalt) for every line a visitor reads, `var(--font-mono)` (IBM Plex Mono) for names, conditions and chips. Sizes only from the scale: **76** for `Welcome to FXN.` and the glitch words, **47** for an act's line, **29** for an object's line, **11** mono for names and conditions. Phone: one step down, 11 stays.

**Arrive.** The 11 mono name tracks in first on `type` (letter-spacing .40em to .24em, .3 s to 90 %), its `///` rule drawing left to right. The line follows a beat later, letter by letter on `letter` (rise .55em and un-skew, as `cine-in` does today, 14 ms apart, .62 s each). A 30-character line stands in about 1.05 s, inside bar 3. Words stand beside what they name (`screenOf`, the emptier half, never over the lit subject).

**Stay and leave.** Words never breathe, pulse or drift. They stand still through the rest bar, then the letters cut out upward in .18 s (`cine-out`, 4 ms apart), at least one beat before the next move. A line never fades. It leaves.

**Numbers** roll once on `number` (k 60, d 15.5), their condition already standing in 11 mono before the roll. A number is never on screen without its condition.

**Conditions** are 11 mono, bone at .7. They appear with their line's first letter and leave with its last.

## 5. The glitch punctuates

The portal glitch film is 1.6 s of tear bands, the six-piece mark bursting, thirteen word flashes and a mint flash, made with Loopforge's loops, symmetry, wave and jitter. It is a threshold, and it plays **twice**: in at the portal, out at Release Gate once the owner links the game (a second film with the gate's own words). Until then the gate opens on its key and holds, no glitch. Inside the archive, jitter is 0 everywhere. The portal was the noise. The archive is the record.

The glitch words come from `wordsOf()`, the site's own journeys and pages. Nothing is added by hand.

## 6. Reduced motion and phone

Reduced motion: every build placed at once, every light at its end state, words standing, the tear a cross-fade. The cells keep their length. Phone (390x844): camera distance x 1.35, words in the top 16-40 %, the one chip in the thumb zone.

For the critic, after the owner confirms: one lit subject per still, the complement at most once, every number beside its condition, the card's strip lit on every archive still, no jitter inside the archive.
