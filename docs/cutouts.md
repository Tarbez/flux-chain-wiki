# Cutouts, transparency and knockouts (2026-10-25)

Real transparency only: a hole shows what is behind it, never a fill painted to look like the background.

## Where it lives
- `css/cutouts.css`: three CSS utilities, each with an `@supports` fallback.
  - `.tp-panel`: glass. Canvas at `--tp-alpha`, blur `--tp-blur`. No backdrop-filter: near-solid fill.
  - `.mk-scrim`: a dimming layer with a soft elliptical hole (`--mk-hole-x/-y/-w/-h`), cut by `mask-composite: exclude`. No mask-composite: the plain gradient.
  - `.cut-corner`: a clip-path corner cut, `--cut` deep.
- `js/world/glass-kit.js`: the one shared 3D glass kit. It holds the shape builders, the plates and the view fades. Every view's glass uses it.
- `js/world/download-stage.js`: shapes with holes are made in the 3D world (owner: "since we have 3d"). Each plate is ONE `THREE.Shape`; its cutters are united in `shape.holes`. So every hole is real and the network shows through. The plates are translucent and write no depth.

## The three examples

0. **The halo** (intro and home, 3D): a glass ring over the kernel. Its centre hole shows the kernel. One port hole per network chain points at that chain, placed from the network data. A darker ring overlaps it, so each shows through the other.
1. **Overlapping transparency** (download): the FXN ID card is `.tp-panel` glass over the browser window. The window and the 3D show through the overlap. In 3D, the primary badge plate overlaps the dark lens plate and each shows through the other.
2. **United shapes, real hole** (download, 3D): the lens is one shape with three cutters (viewport, two ports). The badge is one shape with a notch in its outline and a lanyard slot.
3. **Semi-transparent knockout** (intro, home): the intro's bottom scrim is `.mk-scrim`, dark behind the words, with a soft hole over the network so the 3D stays bright. Home's dot grid loses a soft ellipse under the heading (`mask-composite: subtract`).

## Browser support
- `mask-composite`: Chrome/Edge 120+, Firefox 53+, Safari 15.4+; older WebKit uses the `-webkit-` keywords given.
- `backdrop-filter`: Chrome 76+, Firefox 103+, Safari with `-webkit-`.
- WebGL2 for the 3D. Without it the world is off (`?world=off` shows that state) and the page keeps its HTML.

## Accessibility
All text stays real HTML. The 3D canvas and the scrim are `aria-hidden`. Reduced motion takes each glass height at once.
