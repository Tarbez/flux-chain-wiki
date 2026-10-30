/* World grammar, the hub's round mark (docs/design/world-grammar/PORT.md, 2026-10-30 lane B).
   chains-scene.js stands a mark at the hub: a dark disc, a lit rim and a face with the kernel's mark in the signal colour, tilted back by the home elevation. It sinks into the logo and shrinks as home
   comes (the stage's home weight) and the FXN view lifts it into the middle of its supply ring (the view's weight). The encoder wrote its three rows into the home frame (parts hubdisc, hubrim, hubface);
   the stage moves them through the state stream (world2-stage.mjs write()). This file only says how each is drawn: the disc as a lit solid, the rim as light, the face as a plate whose canvas is the
   mark's mask in the signal colour. No JSON. */
import { prism, torus } from '/fxn-3d/js/render/world2-shapes.mjs';

const TAU = Math.PI * 2;
/* parts: the home frame's part list; img: the kernel's mark image (loaded), or null until it lands */
export function mountHubMark(R, parts, rimTube) {
  R.addShape('hubdisc', prism(Array.from({ length: 48 }, (_, i) => [Math.sin(i * TAU / 48), Math.cos(i * TAU / 48)])));
  R.addShape('hubrim', torus(rimTube, 64, 12));
  const by = {}; parts.forEach((p) => { by[p.part] = p; });
  if (by.hubdisc) { by.hubdisc.like = 'solid'; by.hubdisc.shape = 'hubdisc'; by.hubdisc.noShadow = true; }
  if (by.hubrim) { by.hubrim.like = 'glow'; by.hubrim.shape = 'hubrim'; by.hubrim.glow = [1, 0, 1]; by.hubrim.noShadow = true; }
  if (by.hubface) { by.hubface.like = 'text'; by.hubface.noShadow = true; }
  let key = 0;
  /* the face's canvas: the mark as a mask filled with the theme's signal colour (chains-scene.js: alphaMap from the image, colour --signal x 2.2, the gain is the row's alpha) */
  function paint(img) {
    if (!by.hubface || !img) return;
    const css = getComputedStyle(document.body || document.documentElement).getPropertyValue('--signal').trim(), colour = css ? 'hsl(' + css.split(/\s+/).join(', ') + ')' : '#3fd1a8';
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
    g.drawImage(img, 16, 16, 224, 224); g.globalCompositeOperation = 'source-in'; g.fillStyle = colour; g.fillRect(0, 0, 256, 256);
    if (by.hubface.tex) R.dropTexture(by.hubface.tex);
    by.hubface.tex = 'hubface:' + (++key) + ':' + colour; R.setTexture(by.hubface.tex, cv);
  }
  return { paint };
}
