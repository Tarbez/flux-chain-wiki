# SUBZERO

One full-screen scene: a grainy ring (the "0") under a full-screen blur layer, a **SUB** pill, an **ENTER**
button, a short block of copy, and a header with the logo and three navigation links. Open `index.html`; there is no build step and no server needed.

## Where things live

```
index.html                  shell only: meta, the no-JS fallback copy, script tags in order
css/
  fonts.css                 @font-face for Albert Sans (self-hosted, no network request)
  fallback.css              styles for the no-JS / screen-reader copy. The scene itself has no CSS.
assets/fonts/               Albert Sans variable woff2 (SIL OFL 1.1)
js/
  tokens.js                 every colour, the type family, and the two units (s and u)
  scene.flux.js             THE SCENE: all copy and layout, as one Flux pattern
  main.js                   boot: applies tokens, renders the pattern
  ark/                      the runtime: atomizer, Flux parser, prop readers, registry/renderer
  halo/grain.js             paints the ring's grain (the fitted model)
  resolvers/                one file per kind of thing on screen
    scene.js  halo.js  veil.js  header.js  logo.js  nav.js  step.js  cta.js  body.js
    optional/               removed from the page but kept, unloaded (see below)
legacy/index.monolith.html  the original single-file version, untouched
```

Scripts are classic `<script defer>` tags, not ES modules, on purpose: modules are blocked on `file://`.
Every file only *defines* something; `js/main.js` is the only one that runs on load.

## Changing things

| To change… | Edit |
|---|---|
| the words, the ring size, the blur strength, the SUB label | `js/scene.flux.js` |
| what a kind of thing looks like (the pill, the button) | its file in `js/resolvers/` |
| a colour, the font, or how the layout scales | `js/tokens.js` |
| where ENTER goes | add `-H-https://…` to the `F-CTA-RCTA_V1` fence, **or** listen: `document.addEventListener('ark:enter', …)` |
| the blur (it covers the whole screen) | `-B-` on `F-VEIL-RVEIL_V1`, in units of `u`. `0` = off, `0.2` keeps some grain, `1.5` = smooth glow |
| the navigation links | the three `F-LINK-RLINK_V1` fences in `js/scene.flux.js`: `-L-` label, `-H-` destination (currently placeholder `#concept`, `#work`, `#contact`) |
| the logo | `js/resolvers/logo.js` (mark and wordmark), or `-A-`/`-B-`/`-H-` on `F-LOGO-RLOGO_V1` |
| the ENTER button's look | `js/resolvers/cta.js`; its hover/press states and the nav underline are in `css()` in `js/tokens.js` |

Flux text values: underscores are spaces; everything else, punctuation included, is written as itself.

## How it scales

The layout was measured off a 3:4 poster. Two container-query units carry it to any screen, with no media
queries: `s` is 1% of the poster's width (the largest 3:4 poster that fits the screen, centred), and `u` is
the same but never below 7px, so text stays readable on small screens. See `js/tokens.js`.

## Bringing back what was removed

The header ("Designed by … author"), footer prompt, progress pill with arrow, and the centred subtitle are in
`js/resolvers/optional/` and are **not loaded**. To restore one: add its `<script>` to `index.html` (after the
other resolvers, before `scene.flux.js`) and add its fence back to `js/scene.flux.js`. Their
colours are still in `tokens.js`.

## Notes on fidelity

Sizes, colours, the ring's radial profile, its top-to-bottom light gradient and its grain statistics were
measured from the reference image, not eyeballed, and the grain constants in `js/halo/grain.js` were fitted
numerically to those measurements. The typeface (Albert Sans) was identified by fitting candidate fonts to
the measured line widths and pixel-correlating renders against the reference.
