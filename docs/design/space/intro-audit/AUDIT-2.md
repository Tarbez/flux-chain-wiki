# Audit 2: the intro as a whole, and why it feels dead

Layer: app. Reader: the owner. Captured 2026-11-09 at 1440x900 from http://127.0.0.1:3438/intro into `round2/` (`capture2.cjs`, `capture3.cjs`, logs beside them). Every number is read off a frame there or off the code it names. Audit 1 fixed the emblems. This one looks at what they sit on.

## 1. What is wrong, ranked

1. **Nothing moves and nothing is lit.** The ring view is a frozen picture: 0.00 percent of pixels change over 3 seconds (`31-menu-rest-0.png` against `-3.png`). 68 percent of the frame is near black (`04b-menu-hold.png`).
2. **The click throws the place away.** The hero stands on a plinth with a floor edge. The ring view keeps only the ring, flat, square-on, in a void (`03-transform-1600ms.png`, `50-board-vs-live.png`).
3. **Thirty-seven equal things in a circle.** Twelve stones, twelve grey objects outside, twelve words inside, one mark in the middle, all the same weight. A word, its stone and its object sit 180 px apart (`51-menu-hold-crop.png`).
4. **Nothing explains anything.** Hover turns one word white and that is all. The text under the stone is `display: none` (`css/world-pages.css` line 290, `10-hover-09-rules.png`). A click gives 1.2 s of frozen frame, about 2 s of film with a moving sentence, 1 s of black, then the ring with no trace of the visit (`20-after-click-0700ms.png` equals `-1900ms.png`, then `40-loop-05s.png`, `-07s.png`, `-08s.png`).
5. **Three looks in one visit.** Hero: textured concrete, neon mint, lime plants, five DEFXN marks, an eight-item header. Film: flat untextured blocks in a teal void, text at 16 px (`02-portal-5s.png`, `40-loop-05s.png`).

## 2. Why each one feels wrong, and the fix

The coordinator's four points, checked. (1) Icons stuck on a rich portal: confirmed, and the cause is light, not material, see 3. (2) Clock face: confirmed, 37 items. (3) Void with no ground: confirmed, the biggest cause of "dead". (4) Too much, nothing leads the eye: confirmed. One to add: time does not pass.

### 1. Dead means no time passes

A place is alive when light or air moves while you do nothing. Your boards all have it: a wet floor catching light, leaves, a lit strip. The live ring view has zero motion and one flat light. Even the hero only moves 3.7 percent over 3 s (vines).

Fix, all crisp, no fog, no blur: one mint point travels the inner groove once every 6 s. The amber slots breathe between 0.6 and 1.0 over 4 s, each stone offset. The floating objects drift 3 cm on 5 s periods with different phases. The camera dollies 10 cm over 12 s. That is about 2 percent of pixels changing every second, a living place at no cost in sharpness.

### 2. A portal is a place, a dial is a UI

Board 02 is a monument on a floor with a reflection. The ring view cuts the floor and the plinth and turns the monument into a flat dial. A dial in blackness reads as a settings screen, so the eye expects buttons and gets grey chips.

Fix: the portal never leaves the ground. On click, the headline and header leave and the camera rises and squares up, but the floor stays in the bottom third with a crisp planar reflection and a contact shadow, and the plinth stays under the ring. Behind, one back wall with one amber vertical strip, as on board 03, gives depth without fog. The objects then float over something.

### 3. One lit thing at a time

Hierarchy is made by light. No key light reaches the emblems, so they take the tone of the ring's dark face and eleven of twelve read as grey chips whatever their shape. The twelve inside words sit in a ring of their own, equidistant from the mark, so they read as a clock, not as labels.

Fix: a key light from the upper left on every object (the shapes are good, `REVIEW.md`). At rest, one stone is lit at a time and the light steps round in order, 3 s each. Its word appears on the stone, nobody else's. The centre mark leaves when the menu opens, and the opening stays dark until an object comes to it.

### 4. Say what it is, what you do, what you get back

Your law. Today a visitor learns twelve nouns and nothing else. The stone's text is in the DOM and hidden. The film's sentence animates word by word, so the reader chases it. Two doors (Names, The game) open nothing (`TOPIC` slots 5 and 6, `js/pages/intro.js` line 278).

Fix: hover puts three lines under the object at 18 px: what it is, what you do, what you get back. The film's sentence stands still for 3 s, then the ring returns with the visited stone marked, so the visit left a receipt. Cut the frozen 1.2 s and the black second with a match cut (audit 1, fix 8). Dim the two closed doors to 0.5.

### 5. One look

Three scenes with different materials and two mints break the sense of one made thing. The button is mint, and mint is everywhere, so the one action does not land (law 73: the complement, once, on the action, and your boards use amber). The film text at 16 px is off the scale (law 82). Five marks on one screen (law 50).

Fix: the film objects take the portal's `p1stone` and its mint. The hero button goes amber and nothing else on the hero is amber but the slots. One mark, on the cap. Film text 18 px. Header cut to the four words on your boards while on `/intro`.

## 3. The one decision

The twelve-door ring is not the problem. Twelve doors open at once is. Two ways out, both keep your portal.

**A. One at a time, in order (my pick).** The ring is a path. At rest it lights stone after stone and brings each object to the opening for 3 s with its three lines, so a visitor who touches nothing still sees the whole story in 36 s. Hover or click jumps the sequence. Fixes 1, 3 and 4 fall out of this one change.

**B. Six doors.** Pair the twelve topics into six stones. Fewer things, the same frozen clock, still no order. Smaller job, smaller gain.

## 4. What is already right, keep it

The portal itself: board 02 and `02-portal-5s.png` match in composition, headline left, monument right. The emblem shapes after audit 1 (`REVIEW.md`, seven pass). The hover mechanic: stone lights, object comes forward, click grows it into the film. The facts in the copy ("Today it runs as our development network. Genesis is next."). FXN Basalt on headline and body. The header hides on the ring view.

## Reduction test, one line each

About: twelve topics, one portal. Dominant action: click a stone, and nothing shows it. Know now: the order, absent. Hidden until asked: the three lines, hidden for good. Repeated: the mark, five times. Removable: the inside word ring, the centre mark, four header items. Leaving keeps state: yes. Returning keeps context: no. If the studio fails: words after 20 s.
