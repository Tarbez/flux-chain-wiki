/* The rows of a frame, as the world encoder's scene libraries write them (docs/design/world-grammar/CONTRACT.md "The frame blob").
   Build side, Node built-ins only. The chain views (world-chain-scene.mjs) and the auth stage (world-auth-scene.mjs) restate the Three.js stages' placement maths without
   Three.js; the matrices, the kernel's eases and the row format are the same for both, so they live here once. A row is 16 numbers: a 3x4 matrix (three axes, then the place),
   then tone, family and mix (palette indexes from CONTRACT.md, and the share of the family), then alpha (above 1 on a light: its gain). */
import { TONE } from './fxn-3d.mjs';
export const TAU = Math.PI * 2, D2R = Math.PI / 180, LIFT = .16, HALF_D = .15, MID = LIFT + .5, FOV = 12, TAN = Math.tan(FOV / 2 * D2R);
export const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
/* ring-kit.js k.ease */
export const ease = {
  out: x => 1 - Math.pow(1 - x, 3),
  inOut: x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  back: x => { const c = 1.4; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
};
export const lerp = (a, b, u) => a + (b - a) * u;
export const angLerp = (a, b, u) => { const d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * u; };

/* ---------- the palette indices of CONTRACT.md ---------- */
export const TONES = TONE;   /* the palette indexes live once, in the engine (fxn-3d engine/core/world-tables.mjs); this file kept the plural name its scene libraries import */

/* ---------- 4x4 matrices, column-major arrays (Three.js Matrix4 elements) ---------- */
export const I4 = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
export function mul(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}
export const chain = (...ms) => ms.reduce((acc, m) => mul(acc, m));
export const T = (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
export const S = (x, y, z) => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1];
export const RY = a => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; };
export const RZ = a => { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; };
/* three's Euler(x, y, z) in the order XYZ: the matrix Rx Ry Rz */
export const euler = (x, y, z) => mul(mul(RX(x), RY(y)), RZ(z));
export const RX = a => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; };
export const compose = (x, y, z, yaw, sc) => chain(T(x, y, z), RY(yaw), S(Math.max(1e-4, sc), Math.max(1e-4, sc), Math.max(1e-4, sc)));
export const BODY = T(0, LIFT + .5, 0), FACE = T(0, 0, .143);
export const HIDE = S(1e-4, 1e-4, 1e-4);
/* a point through a matrix */
export const pointOf = (m, x, y, z) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];

/* a row: the 12 matrix floats, then tone, family, mix, alpha */
export const row = (m, tone, family, mix, alpha) => [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10], m[12], m[13], m[14], tone, family || 0, mix || 0, alpha == null ? 1 : alpha];
export const hidden = (at, tone) => row(mul(T(at ? at[0] : 0, at ? at[1] : 0, at ? at[2] : 0), HIDE), tone == null ? TONES.canvas : tone, 0, 0, 0);


/* a line of beads (ring-kit.js k.beads line(a, c, count, reveal, r)): `count` beads from a to c, the first `reveal` share of them shown, each growing in as the reveal passes it (ease.back),
   each a point of diameter 2 s. dots: the muted quiet line; else the signal's lit one. Written once here for every view that draws a line (the identity and how-it-works scenes). */
export const beadRows = (a, c, count, reveal, r, dots) => {
  const out = [];
  for (let q = 0; q < count; q++) {
    const u = count > 1 ? q / (count - 1) : 0, g = clamp01((reveal * (count + 2) - q) / 2), s = g <= 0 ? 1e-4 : (r || .05) * ease.back(g);
    const p = [a[0] + (c[0] - a[0]) * u, a[1] + (c[1] - a[1]) * u, a[2] + (c[2] - a[2]) * u];
    out.push(dots ? row(chain(T(p[0], p[1], p[2]), S(2 * s, 2 * s, 2 * s)), TONES.muted, TONES.canvas, .25, 1) : row(chain(T(p[0], p[1], p[2]), S(2 * s, 2 * s, 2 * s)), TONES.signal, 0, 0, 1));
  }
  return out;
};
