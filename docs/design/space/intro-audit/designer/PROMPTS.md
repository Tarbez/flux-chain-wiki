# Image prompts: six directions for the portal screen (2026-11-09)

Reader: the DEFXN site session and the owner. Written by the world direction session from `BRIEF.md`. Tool: ElevenLabs Image and Video (`POST /v1/flows/image`, then fetch the generation until it is completed). Model: `gemini-3-pro-image`, aspect ratio 16:9. Reference input: `current-ring-rest.png` and `current-ring-hover.png` where the model accepts reference images.

**State:** the prompts are ready. The images are not made yet, because the API key lacks the permission "Image and Video Generation". The API also needs a Pro plan or above.

## The base prompt (used by every direction)

A premium, cinematic product render, 16:9, for the first screen of a website. A large portal ring stands straight on, on a dark mirror floor that reflects it sharply. The ring is built from 12 matte dark stone blocks, cut with crisp chamfers, with thin mint light strips set into the joints and a few small amber slits. Each of the 12 stones carries one small, clear, lit object that shows its topic: a key file card, a signed paper record with a stamp, a small stack of copy towers, a tiny server rack, a coiled chain link, a name tag on a door, a game controller, a sealed box with a version tag, a bundle crate, five small keys with four turned, a small vault door, and a network node with lines. In the ring's opening floats a thin dark identity card with chamfered corners, a mint edge strip and a small chip, the clear centre of the image. One mint light line runs from one stone straight into the card, and the card turns slightly toward it. At the left, a plain dark text panel with a small orange label, one bold headline and one line of body text. Brutal, clean, sharply focused, high contrast, near-black background. No fog, no blur, no haze, no glow bloom, no glass sparkle, no lens flare, no people, no logos other than the card's own mark, no readable words except the panel.

## The six directions (each adds one line to the base prompt)

| # | File | What changes |
|---|---|---|
| 1 | direction-1.png | **Straight on, symmetrical, gallery.** Eye-level camera, the ring dead centre, even soft top light, the 12 objects small and equal, the light line from the top-right stone. The calm reference version. |
| 2 | direction-2.png | **Low hero angle.** Camera low near the floor looking up, 24 mm, the ring towers over the viewer, the mirror floor takes the lower third, strong rim light along the top arc, the light line rises from the bottom stone. |
| 3 | direction-3.png | **Three-quarter, depth.** Camera 35 degrees to the right, the ring in perspective, the near stones large and the far stones small so the objects gain hierarchy, a hard side key light from the left, the light line comes from the nearest stone. |
| 4 | direction-4.png | **Hierarchy, not a clock.** The ring is broken into four clusters of three stones with gaps between them, the cluster at the top is larger and lit amber as the live group, the other three clusters stay mint, the card is bigger and closer to camera. |
| 5 | direction-5.png | **Objects forward.** Each topic object floats a little in front of its stone, lit by its own small mint spotlight, so they read as lit objects at a glance, the stone ring sits darker behind them, the light line runs from a floating object to the card. |
| 6 | direction-6.png | **Top-down plan view.** Camera high above at 60 degrees, the ring lies like a stone circle on the mirror floor, the card floats above its centre, the 12 objects stand on their stones like pieces on a board, long crisp shadows from one low amber light. |
