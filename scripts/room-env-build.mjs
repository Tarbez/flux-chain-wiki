#!/usr/bin/env node
/* Bakes three.js RoomEnvironment's light layout into world/room-env.bin, once, at build time.

   Why: the NFT card was lit by PMREMGenerator.fromScene(new RoomEnvironment(), .04) (js/nft/art3d.js). The grammar
   renderer cannot load three.js, so it needs the same room as data. Nothing here is typed by hand: the numbers (the
   point light, the room box, the six white boxes and the six emissive panels) are read out of the class in
   the Three.js build named by THREE_SRC (r180, once js/vendor/three-r180-defxn.js; now in git history of this folder or the npm package three@0.180), the picture a camera at the origin sees is ray-cast from them (analytic ray-box
   hits, Lambert from the point light with three's distance cutoff, emissive panels at their intensity), and the result
   is written as a small blob:

     'ENVR', u16 version 1, u16 levels, u16 width, u16 height          12 bytes
     27 float32: nine spherical-harmonic terms of the diffuse light, E(n)/pi (cosine-convolved), r g b each
     levels of RGBA half floats, level 0 width x height, each next level half as wide and high (min 1): level L holds
     the room blurred by a GGX lobe of roughness L / (levels - 1), so the shader reads specular with textureLod(L = roughness x (levels - 1))

   Direction to texel: u = atan(z, x) / 2pi + .5, v = acos(y) / pi, row 0 at +Y. The shader (world2-mesh.mjs) uses the same.
   The owner accepted that this does not equal PMREM exactly; it is judged by the pixel score.
   Not JSON, no library. Run: THREE_SRC=<path to three r180 min build> node scripts/room-env-build.mjs   (writes world/room-env.bin, prints what it measured). */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
/* Three.js left the site (docs/design/world-grammar/PORT.md, "Three.js removed"), so the source is named, not assumed: world/room-env.bin stays as evidence and this script stays as the record of how it was derived */
const SRC = process.env.THREE_SRC;
if (!SRC) throw new Error('room-env-build: THREE_SRC is not set. It must name the minified Three.js r180 build whose RoomEnvironment class the numbers are read from: js/vendor/three-r180-defxn.js from the git history of this folder, or build/three.module.min.js of npm three@0.180. Set it and run again.');
const OUT = path.join(ROOT, 'world/room-env.bin');
const W0 = 128, H0 = 64, LEVELS = 6;

/* ---------- read the layout out of the class ---------- */
function layout(text) {
  const start = text.lastIndexOf('constructor(){super();let t=new _n;t.deleteAttribute("uv")');
  if (start < 0) throw new Error('room-env-build: RoomEnvironment is not in ' + SRC + '; the class text it reads begins with constructor(){super();let t=new _n;t.deleteAttribute("uv") and was not found, so the vendor file changed shape and the reader must be updated');
  const body = text.slice(start, text.indexOf('dispose(){', start));
  const nums = s => s.split(',').map(Number);
  const light = body.match(/new \w+\(16777215,([\d.]+),([\d.]+),([\d.]+)\)[^;]*;(\w)\.position\.set\(([^)]*)\)/);
  const room = body.match(/let (\w)=new \w+\(t,\w+\);\1\.position\.set\(([^)]*)\),\1\.scale\.set\(([^)]*)\)/);
  if (!light || !room) throw new Error('room-env-build: the point light or the room box was not found in the RoomEnvironment text');
  const boxes = [...body.matchAll(/\w\.position\.set\(([^)]*)\),\w\.rotation\.set\(([^)]*)\),\w\.scale\.set\(([^)]*)\),\w\.updateMatrix\(\),\w\.setMatrixAt\(\d,\w\.matrix\)/g)].map(m => ({ pos: nums(m[1]), rot: nums(m[2]), scale: nums(m[3]), emit: 0 }));
  const panels = [...body.matchAll(/let (\w)=new \w+\(t,Hr\(([\d.]+)\)\);\1\.position\.set\(([^)]*)\),\1\.scale\.set\(([^)]*)\)/g)].map(m => ({ pos: nums(m[3]), rot: [0, 0, 0], scale: nums(m[4]), emit: Number(m[2]) }));
  if (boxes.length !== 6 || panels.length !== 6) throw new Error('room-env-build: expected 6 white boxes and 6 emissive panels, found ' + boxes.length + ' and ' + panels.length);
  return { light: { intensity: Number(light[1]), cutoff: Number(light[2]), decay: Number(light[3]), pos: nums(light[5]) }, room: { pos: nums(room[2]), rot: [0, 0, 0], scale: nums(room[3]), emit: 0, inside: true }, solids: boxes.concat(panels) };
}

/* ---------- ray casting ---------- */
function prep(b) { const c = Math.cos(b.rot[1]), s = Math.sin(b.rot[1]); if (b.rot[0] || b.rot[2]) throw new Error('room-env-build: a box turns about x or z; the room only turns about y'); return { ...b, c, s }; }
/* ray o + t d against one box: world to local is (p - pos) turned by -ry, divided by scale; returns { t, n (world outward normal) } for the entering hit, or the leaving hit when inside */
function hit(b, o, d) {
  const q = [o[0] - b.pos[0], o[1] - b.pos[1], o[2] - b.pos[2]];
  const lo = [(b.c * q[0] - b.s * q[2]) / b.scale[0], q[1] / b.scale[1], (b.s * q[0] + b.c * q[2]) / b.scale[2]];
  const ld = [(b.c * d[0] - b.s * d[2]) / b.scale[0], d[1] / b.scale[1], (b.s * d[0] + b.c * d[2]) / b.scale[2]];
  let t0 = -Infinity, t1 = Infinity, a0 = -1, a1 = -1, s0 = 1, s1 = 1;
  for (let a = 0; a < 3; a++) {
    if (Math.abs(ld[a]) < 1e-12) { if (Math.abs(lo[a]) > .5) return null; continue; }
    let ta = (-.5 - lo[a]) / ld[a], tb = (.5 - lo[a]) / ld[a], sa = -1, sb = 1;
    if (ta > tb) { [ta, tb] = [tb, ta]; sa = 1; sb = -1; }
    if (ta > t0) { t0 = ta; a0 = a; s0 = sa; }
    if (tb < t1) { t1 = tb; a1 = a; s1 = sb; }
  }
  if (t0 > t1 || t1 < 1e-6) return null;
  const inside = t0 < 1e-6, t = inside ? t1 : t0, ax = inside ? a1 : a0, sg = inside ? s1 : s0, v = [0, 0, 0]; v[ax] = sg;
  const nw = [b.c * v[0] + b.s * v[2], v[1], -b.s * v[0] + b.c * v[2]];   /* local axis turned back by +ry */
  return { t, n: inside ? [-nw[0], -nw[1], -nw[2]] : nw, inside };
}
function radiance(L, solids, d) {
  let best = null, which = null;
  for (const b of solids) { const h = hit(b, [0, 0, 0], d); if (h && (!best || h.t < best.t)) { best = h; which = b; } }
  if (!best) return [0, 0, 0];
  if (which.emit) return [which.emit, which.emit, which.emit];
  /* a white diffuse surface under the point light: three's distance attenuation, Lambert 1 / pi */
  const p = [d[0] * best.t, d[1] * best.t, d[2] * best.t], l = [L.pos[0] - p[0], L.pos[1] - p[1], L.pos[2] - p[2]], dist = Math.hypot(...l);
  const nl = Math.max(0, (best.n[0] * l[0] + best.n[1] * l[1] + best.n[2] * l[2]) / dist);
  const w = Math.pow(Math.max(0, Math.min(1, 1 - Math.pow(dist / L.cutoff, 4))), 2) / Math.max(Math.pow(dist, L.decay), .01);
  const e = L.intensity * nl * w / Math.PI;
  return [e, e, e];
}
const dirOf = (u, v) => { const th = v * Math.PI, ph = (u - .5) * 2 * Math.PI; return [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]; };

/* ---------- filtering ---------- */
function half(x) {
  const f = new Float32Array([x]), i = new Uint32Array(f.buffer)[0], s = (i >>> 16) & 0x8000; let e = ((i >>> 23) & 0xff) - 127 + 15, m = i & 0x7fffff;
  if (e >= 31) return s | 0x7bff;
  if (e <= 0) { if (e < -10) return s; m = (m | 0x800000) >> (1 - e); return s | (m + 0x1000 >> 13); }
  return s | (e << 10) | (m + 0x1000 >> 13);
}
function main() {
  const L = layout(readFileSync(SRC, 'utf8')), solids = [L.room, ...L.solids].map(prep);
  /* the base, 2 x 2 samples per texel so a panel's edge is anti-aliased */
  const base = new Float32Array(W0 * H0 * 3);
  for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) {
    const acc = [0, 0, 0];
    for (const [ox, oy] of [[.25, .25], [.75, .25], [.25, .75], [.75, .75]]) { const r = radiance(L.light, solids, dirOf((x + ox) / W0, (y + oy) / H0)); acc[0] += r[0] / 4; acc[1] += r[1] / 4; acc[2] += r[2] / 4; }
    base.set(acc, (y * W0 + x) * 3);
  }
  /* a 64 x 32 copy to convolve from, with each texel's direction and solid angle */
  const CW = 64, CH = 32, cdir = [], cw = [], cval = new Float32Array(CW * CH * 3);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    cdir.push(dirOf((x + .5) / CW, (y + .5) / CH)); cw.push(Math.sin((y + .5) / CH * Math.PI));
    for (let c = 0; c < 3; c++) { let s = 0; for (let j = 0; j < 4; j++) s += base[(((y * 2 + (j >> 1)) * W0) + x * 2 + (j & 1)) * 3 + c]; cval[(y * CW + x) * 3 + c] = s / 4; }
  }
  const levels = [];
  for (let l = 0; l < LEVELS; l++) {
    const w = Math.max(1, W0 >> l), h = Math.max(1, H0 >> l), data = new Float32Array(w * h * 3);
    if (l === 0) data.set(base);
    else {
      const rough = l / (LEVELS - 1), a = rough * rough, k = Math.max(0, 2 / (a * a) - 2);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const d = dirOf((x + .5) / w, (y + .5) / h); let sum = [0, 0, 0], ws = 0;
        for (let i = 0; i < cdir.length; i++) {
          const dp = Math.max(0, d[0] * cdir[i][0] + d[1] * cdir[i][1] + d[2] * cdir[i][2]), wt = (k > 0 ? Math.pow(dp, k) : dp) * cw[i];
          if (wt < 1e-9) continue; ws += wt; sum[0] += cval[i * 3] * wt; sum[1] += cval[i * 3 + 1] * wt; sum[2] += cval[i * 3 + 2] * wt;
        }
        data.set([sum[0] / ws, sum[1] / ws, sum[2] / ws], (y * w + x) * 3);
      }
    }
    levels.push({ w, h, data });
  }
  /* nine SH terms of the base, cosine-convolved, divided by pi: the shader adds sh_i * Y_i(n) for E(n)/pi */
  const sh = new Float64Array(27), conv = [1, 2 / 3, 2 / 3, 2 / 3, 1 / 4, 1 / 4, 1 / 4, 1 / 4, 1 / 4];
  const basis = n => [.282095, .488603 * n[1], .488603 * n[2], .488603 * n[0], 1.092548 * n[0] * n[1], 1.092548 * n[1] * n[2], .315392 * (3 * n[2] * n[2] - 1), 1.092548 * n[0] * n[2], .546274 * (n[0] * n[0] - n[1] * n[1])];
  for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) {
    const d = dirOf((x + .5) / W0, (y + .5) / H0), dO = 2 * Math.PI / W0 * Math.PI / H0 * Math.sin((y + .5) / H0 * Math.PI), Y = basis(d);
    for (let i = 0; i < 9; i++) for (let c = 0; c < 3; c++) sh[i * 3 + c] += base[(y * W0 + x) * 3 + c] * Y[i] * dO;
  }
  for (let i = 0; i < 9; i++) for (let c = 0; c < 3; c++) sh[i * 3 + c] *= conv[i];
  const texels = levels.reduce((n, l) => n + l.w * l.h, 0), buf = new ArrayBuffer(12 + 108 + texels * 8), dv = new DataView(buf);
  'ENVR'.split('').forEach((ch, i) => dv.setUint8(i, ch.charCodeAt(0)));
  dv.setUint16(4, 1, true); dv.setUint16(6, LEVELS, true); dv.setUint16(8, W0, true); dv.setUint16(10, H0, true);
  for (let i = 0; i < 27; i++) dv.setFloat32(12 + i * 4, sh[i], true);
  let o = 120;
  for (const l of levels) for (let i = 0; i < l.w * l.h; i++) { for (let c = 0; c < 3; c++) { dv.setUint16(o, half(l.data[i * 3 + c]), true); o += 2; } dv.setUint16(o, half(1), true); o += 2; }
  writeFileSync(OUT, Buffer.from(buf));
  let peak = 0, mean = 0; for (let i = 0; i < base.length; i += 3) { peak = Math.max(peak, base[i]); mean += base[i] / (base.length / 3); }
  console.log('room-env.bin ' + buf.byteLength + ' bytes; light ' + L.light.intensity + ' at ' + L.light.pos.join(',') + '; ' + solids.length + ' solids; base ' + W0 + 'x' + H0 + ' peak ' + peak.toFixed(1) + ' mean ' + mean.toFixed(3) + '; diffuse term 0 ' + (sh[0] * .282095 / .282095).toFixed(3) + ' (light, not the average)');
}
if (import.meta.url === 'file://' + process.argv[1]) main();
