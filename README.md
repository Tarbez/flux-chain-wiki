# SUBZERO

The original grain-built zero and full-screen blur veil remain the center of the
opening. The zero is enlarged while ARK UI Background 001's Tide atmosphere sits
beneath it at 30% opacity. Indexed navigation, live field status and a stronger
headline frame the composition. The page continues into an experimental lab and
concept section.

Open `index.html` directly. There is no build step or external dependency.

## Original scene

The scene is still rendered by Ark from `js/scene.flux.js`. Its ring geometry,
blur strength, typography, logo, copy, and entrance fades are preserved.
`css/hero-motion.css` and `js/hero-motion.js` reproduce the Tide field from
`/Volumes/PortableSSD/shared/ark-ui/examples/background/` locally, then add slow
atmosphere drift, a light/scale cycle on the original zero, bounded pointer
parallax, ENTER hover/focus response, and a pause control. Motion pauses offscreen
or in a hidden tab and respects reduced-motion settings. The atmosphere is
decorative and hidden from assistive tech; the semantic headline, copy,
navigation and button remain accessible.

- `js/tokens.js`: original scene tokens; document scrolling is now enabled.
- `js/scene.flux.js`: original scene composition and navigation.
- `js/resolvers/`: original zero, veil, logo, pill, CTA and other components.
- `js/halo/grain.js`: original grain painter.
- `js/main.js`: original scene boot.

## Expansion

- `index.html`: semantic content below the original scene.
- `css/studio.css`: addition styles scoped to `.expansion`, with a mostly
  monochrome palette and a restrained pale teal accent inside the lab.
- `js/studio.js`: proximity, rhythm and depth studies, and the original
  `ark:enter` event connected to the lab. Study slider values are remembered
  while switching studies within the page.

Concept and Experiments link to the sections below. Contact navigation, the invitation
block, and the footer have been removed.
The original scene respects reduced-motion preferences. Experiment controls are
keyboard accessible. Content remains readable without JavaScript.


## Preserved files

`archive/index.poster.html` preserves the original standalone scene entry point.
`legacy/index.monolith.html` remains untouched. `archive/index.studio.html` is an
HTML snapshot of the superseded redesign, not the active page. The unused custom
mark in `assets/mark.svg` is not loaded by the current page.
