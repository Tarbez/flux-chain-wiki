# Review: the twelve ring emblems

Layer: app. Reader: builder A, builder B, the integrator. Judged against `ART-DIRECTION.md`. Rounds are appended; the latest round rules. Every verdict comes from looking at the named image at two sizes: the preview (emblem 150 to 200 px wide) and the strip (about 90 px). Slot 0 (FXN ID) is the card as built and is not reviewed here.

Tone is not judged. Builder A's preview carries the ring's concrete texture, builder B's a flat stone, because B's preview defines `p1stone` only when the scene has none. On the ring both take the portal's own `p1stone`. Shape and read only.

Paths: A = `/Volumes/PortableSSD/flux/fxn-3d/docs/design/direction/emblems-a/scratch/`, B = `/Volumes/PortableSSD/flux/fxn-3d/docs/design/direction/emblems-b/scratch/`, code `/Volumes/PortableSSD/flux/fxn-3d/parts/emblem-<topic>.mjs`.

## Rulings

- **No rings, no discs, on any emblem.** Face-on, a cylinder reads as a coin or a button, and a mint ring reads as the portal. The slot 7 table line in `ART-DIRECTION.md` is superseded: amber is the seal. The SDK's colour anatomy gives honey the meaning "review or approval", so an amber seal on a card says "signed".
- **Apps: option (a), separated cards, laid as a 2x2 grid of tiles on one back plate.** Not the deck and not the fan: three cards on a diagonal merge at 90 px however far they are spread, because every card hides most of the next. Not option (b): a press with a plate needs a second look to name, and the ring already has a row (Rules) and a stack (Records). Four square tiles on one plate is the one shape every stranger already reads as "apps". The plate is the bundle. Supersedes slot 8's table line. Spec under Apps below.
- **Chains: two links, not three.** Three links at 1.2 m wide leave 0.3 m of height, a sliver next to the others. Two bigger links say "chain" as well. Supersedes slot 4's table line.

## Round 2 (2026-11-09, A: `all6.png`, B: `strip5.png`)

| Slot | Topic | Builder | Image | Verdict |
|---|---|---|---|---|
| 9 | Rules | A | `rules5.png` | PASS |
| 1 | Records | A | `records6.png` | PASS |
| 5 | Names | A | `names5.png` | PASS |
| 7 | Releases | A | `releases5.png` | PASS |
| 3 | Capacity | A | `capacity4.png` | PASS |
| 11 | Network | B | `network5.png`, `-big` | PASS |
| 2 | Keepers | B | `keepers5.png`, `-big` | FIX |
| 4 | Chains | B | `chains5.png`, `-big` | FIX |
| 8 | Apps | B | `apps5.png`, `-big` | FIX |
| 10 | Deposits | B | `deposits5.png`, `-big` | FIX |
| 6 | The game | B | `game6.png`, `-big` | PASS |

Seven of eleven pass. The four FIX are all builder B's, all shape and placement, none material.

### Rules: PASS

Five cards now separate at 90 px (gap 0.05 m). Four lit, one dark with the amber mark under it. A stranger says "five keys, one did not sign".

### Records: PASS

The two lower cards now show as two steps under the top card, and the top card's lit lower edge is the only light. "A card slides out of a stack" reads at 90 px.

### Names: PASS

The raised bar, the mint dot and the mint suffix read as `name.fxn` at both sizes. The integrator should check under the ring's key light that the dark bar still shows against the plate. If it does not, raise `namebar` to 0.08 m deep so its top face catches the light.

### Releases: PASS

A card with its lit edge and one amber seal pressed over the corner, the stamp's mark across it. "Signed" reads at 90 px. The seal is about 7 percent of the lit area, over the 5 percent rule by a little; it is the one accent and it is the point of the emblem, so it stays.

### Capacity: PASS

Unchanged from round 1.

### Network: PASS

Three housings at the corners of a triangle, three mint bars joining them, one amber slot on the top housing. "Connected" reads at 90 px. The amber says one node is live; the facts file allows a node, not a count.

### Keepers: FIX

Read at 90 px: a tower on three blocks, or a chip in a socket. The slot cut through the housing splits it into three pieces, and the housing is lost. The dot floats with nothing to belong to.

- Make the housing one block. Set the centre block's height to `top - bot` (drop the `- .12`), so the three stone boxes share one top edge at `top`.
- Bring the card in front of the face instead of inside the cut: `card(r, { w: .4, h: .64, p: [0, .14, z / 2 + .02], strip: 'right', chip: 'stone', t: .03 })`. The two mint lips on the top edge, either side of the card, are what reads as the slot.
- Put the dot on the housing's face as its receipt light: `r.box(MAT.mint, [.07, .07, .02], [.42, -.22, z / 2 + .01], ...)`. Nothing floats.

### Chains: FIX

Read: a short cable of three cells with a tag on its end. The idea is right, the shape is 1.2 by 0.3 m, so at ring scale it is a 26 px sliver.

- Two links, taller: `W = .44, H = .52, B = .08, X = [.02, .4]`. They still interlock (spacing 0.38 against width 0.44).
- The card bigger and at the left: `card(r, { w: .4, h: .25, p: [-.4, 0, -.04], strip: 'low', chip: false, t: .025 })`.
- Mint strips as now, top and bottom of each link, length `W - .22`. The emblem becomes 1.2 by 0.52 m.

### Apps: FIX (ruling above)

Read at 90 px: one lump with a mint stripe. Replace the deck with the grid.

- One back plate: a card-language slab with the chamfered corners, `1.2 x 1.2 x .04` in stone at `z -.05`.
- Four tiles: `card(r, { w: .5, h: .5, p: [sx * .3, sy * .3, .02], strip: 'low', chip: false, t: .03 })` for `sx, sy` in `[-1, 1]`. Gap between tiles 0.1 m. Each tile carries one mint strip along its lower edge, the card language, 0.03 m wide. Four strips make about 3 percent mint.
- No strap, no amber. The plate is the bundle.

### Deposits: FIX

Read at 90 px: a tilted card above two cubes. The crossing is there, but the card floats well above the banks, so "across the gap" reads as "over two boxes".

- Make the banks walls: `r.box(MAT.stone, [.38, .6, .3], [s * .41, -.3, 0], ...)`, tops at `y 0`.
- Lower the card to bridge them: `card(r, { w: .6, h: .375, p: [.04, .1, .05], rz: 6, strip: 'right', chip: 'amber', t: .03 })`. Its lower edge then rides just above both tops and spans the gap.
- Keep the amber chip as the proof: one accent.

### The game: PASS

A door frame on a step, the door ajar, one amber line of light in the gap. "Enter" reads at 90 px. The integrator decides with audit fix 10 whether this door is dimmed while the game is not built.

## Round 1 (2026-11-09, A only: `all4.png`)

Rules FIX (gap 0.0125 m, cards fused), Records FIX (lower cards merged), Names FIX (read as a slide switch), Releases FIX (mint ring read as a coin), Capacity PASS. All four fixes landed in round 2.

## Round 3

Builder B posts `keepers6`, `chains6`, `apps6`, `deposits6` and `strip6.png` to its scratch folder. The gate for each: a 90 px crop names the topic, three materials, inside the 1.2 m box. Builder A is done.
