/* World grammar, the renderer's adapter: the R.* names the defxn host calls, over the engine's world look
   (fxn-3d engine/render/world.mjs, batch F16). What stays here is what touches the page: making the context, drawing the
   2D masks of a mark (wear, difference, blur), timing a frame, and the card context's choice of OffscreenCanvas or element. */
import { createWorldLook, WORLD_CONTEXT, WORLD, MODE, FLAT, projection, view, eyeOf, afterRestore, restoreCount } from '/fxn-3d/js/render/world2-look.mjs';
export { projection, view, eyeOf, MODE, FLAT, afterRestore, restoreCount };
export const FOV = WORLD.fov;

/* THE ONE SEAM to fxn-3d: this is the only file under js/ that names /fxn-3d/ (scripts/fxn3d-seam-gate.mjs fails on any other).
   Every other site file imports the engine's names from here, so an engine path changes in one place. */
export { TONE } from '/fxn-3d/js/render/world2-look.mjs';
export { roundedBox, prism, torus, uvSphere } from '/fxn-3d/js/render/world2-shapes.mjs';
export { sample, easeOf } from '/fxn-3d/engine/runtime/anim-sample.mjs';
export { SP, SPRING, closed, stepped } from '/fxn-3d/engine/runtime/spring.mjs';
export { turn as orbitTurn, coast as orbitCoast } from '/fxn-3d/engine/runtime/orbit-camera.mjs';
export { now as clockNow, subscribe as clockSubscribe, BEAT } from '/fxn-3d/engine/runtime/motion-clock.mjs';
export { readMesh, meshFloats } from '/fxn-3d/engine/formats/mesh.mjs';
export { createCardProgram, uploadMesh, uploadInstances, disposeInstances, drawPieces, lightFrom, roundedBoxShape, sphereShape, fetchEnvironment, uploadEnvironment, worldPath } from '/fxn-3d/js/render/world2-mesh.mjs';
/* a module of the engine loaded on demand, by its path under fxn-3d (e.g. 'js/render/world2-mesh.mjs'): for parts the first paint does not need */
export const engine = (path) => import('/fxn-3d/' + path);
/* FXN Motion (fxn-3d apps/motion, merged 2026-11-09): the player and the films the site plays. Named here so the server's derived
   closure serves them (scripts/lib/fxn-3d-closure.mjs reads this file); loaded on demand only. */
export const motionPlayer = () => import('/fxn-3d/apps/motion/player.mjs');
export const FILMS = { portalGlitch: '/fxn-3d/world/site-films/portal-glitch.motion.fxn', flightStreak: '/fxn-3d/world/site-films/flight-streak.motion.fxn' };
/* the film sampler alone (no player, no GL): js/ark/stage.js reads flightStreak's curves through it to time the glide's streak */
export const filmSampler = () => import('/fxn-3d/engine/sim/motion-sample.mjs');

/* the alpha masks of a mark, built as home-descent.js builds them: the image as a white mask on a w x h canvas (inset by
   pad), the mask worn away by `wear` pixels, their difference (the lit edge), and, when asked, the edge blurred wide (the
   glow that spills onto the floor). Canvases out; the engine uploads them. */
function masks(img, w, h, pad, wear, withSpill) {
  function cv() { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  const mask = cv(), gm = mask.getContext('2d'); gm.drawImage(img, pad, pad, w - 2 * pad, h - 2 * pad); gm.globalCompositeOperation = 'source-in'; gm.fillStyle = '#fff'; gm.fillRect(0, 0, w, h);
  const worn = cv(), gw = worn.getContext('2d'), d = wear; gw.drawImage(mask, 0, 0); gw.globalCompositeOperation = 'destination-in';
  [[d, 0], [-d, 0], [0, d], [0, -d], [d * .7, d * .7], [-d * .7, d * .7], [d * .7, -d * .7], [-d * .7, -d * .7]].forEach((o) => gw.drawImage(mask, o[0], o[1]));
  const band = cv(), gb = band.getContext('2d'); gb.drawImage(mask, 0, 0); gb.globalCompositeOperation = 'destination-out'; gb.drawImage(worn, 0, 0);
  const out = { mask, edge: band };
  if (withSpill) { const spill = cv(), gs = spill.getContext('2d'); if ('filter' in gs) gs.filter = 'blur(7px)'; gs.drawImage(band, w / 6, h / 6, w * 2 / 3, h * 2 / 3); out.glow = spill; }
  return out;
}

/* opts.preserve: keep the drawing buffer after it is shown (a card context a page reads back later with drawImage) */
export function createRenderer(canvas, opts) {
  const gl = canvas.getContext('webgl2', Object.assign({}, WORLD_CONTEXT, { preserveDrawingBuffer: !!(opts && opts.preserve) }));
  if (!gl) return null;
  const R = createWorldLook(gl);
  /* the render layer has no clock: the page times the call */
  for (const name of ['render', 'renderCard']) { const f = R[name]; R[name] = function () { const t0 = performance.now(); const r = f.apply(R, arguments); R.stats.frameMs = performance.now() - t0; return r; }; }
  R.stats.frameMs = 0;
  /* the kernel's mark: 512 square, inset 56, worn by 6 pixels, with its spill */
  const setMark = R.setMark, setLogos = R.setLogos;
  R.setMark = function (img) { const m = masks(img, 512, 512, 56, 6, true); setMark({ groove: m.mask, edge: m.edge, glow: m.glow }); };
  /* the chain marks, each image at its own size, worn by the width of the inlay's edge (.05 world units, glass-kit.js inlay) in that image's pixels */
  R.setLogos = function (list) {
    setLogos(list.map((l) => {
      const w = l.img.naturalWidth || l.img.width, h = l.img.naturalHeight || l.img.height, m = masks(l.img, w, h, 0, Math.max(1, Math.round(.05 * w / Math.max(1e-4, l.scale))), false);
      return { mask: m.mask, edge: m.edge };
    }));
  };
  return R;
}

/* The shared card context: ONE renderer for every card on a page, on an OffscreenCanvas where the browser draws WebGL2
   into one, else on a canvas element that never joins the page. `ctx.canvas` is what a page passes to drawImage after
   ctx.renderCard(...); ctx.bitmap() hands the pixels over as an ImageBitmap when the canvas is offscreen. Returns null
   when the browser has no WebGL2 (the page then draws its flat fallback). */
export function createCardContext() {
  let canvas = null, R = null;
  if (typeof OffscreenCanvas !== 'undefined') { try { canvas = new OffscreenCanvas(1, 1); R = createRenderer(canvas, { preserve: true }); } catch (e) { R = null; } }
  if (!R && typeof document !== 'undefined') { canvas = document.createElement('canvas'); R = createRenderer(canvas, { preserve: true }); }
  if (!R) return null;
  R.canvas = canvas; R.bitmap = () => (typeof canvas.transferToImageBitmap === 'function' ? canvas.transferToImageBitmap() : null);
  return R;
}
