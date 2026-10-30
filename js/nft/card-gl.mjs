/* The card's art on the grammar renderer: the card-scene writer and the one shared card context.

   WHAT. js/nft/art3d.js (a classic script) builds a card's MODEL: seven lists of primitives (cubes, glasses, points, lines,
   quads, bars, spheres) derived from the card's DNA. This module turns that model into the renderer's parts and draws them
   in ONE GL context for every card on the page (createCardContext in js/world2/world2-gl.mjs); art3d.js then copies the
   pixels into each card's canvas with drawImage, exactly as it did from the Three.js renderer.

   THE PARTS (CONTRACT.md "Renderer API", the card path). Cubes are instanced rounded boxes lit by the mesh pass
   (/fxn-3d/js/render/world2-mesh.mjs: GGX, the baked room, the key's shadow map), each with its own colour. Glass is the
   same box, opacity .12 with a clearcoat and the room reflected, sorted back to front, plus the 12 bright edges of every
   glass block as `lines`. The rest are additive `direct` parts with their own rgb and alpha: lines, points (hard disc),
   soft (gaussian), streaks (fade, peak, bars), bars (fresnel box), orbs (fresnel sphere rim). Every part is a Float32Array
   of 16 floats per instance, written here from the model; nothing is stored and nothing is JSON.

   WHY THE GROUP RIDES IN TWO PLACES. The card tilts and turns as one group (Three's Group rotation and position). The
   lit cubes take the group as their model matrix, so the key, the rim and the room stay fixed in the world as they did.
   The additive parts have no model matrix, so the same group is folded into their view matrix (view x group) and their
   eye is carried back into the group's space for the fresnel terms.

   WHAT IT NEVER TOUCHES. The card draws into its own context and its own canvas. It never uses the world's canvas, palette
   or look records, so a worn card cannot recolour the grid (SKIN-CONTRACT 1b / 4e).

   LOAD. art3d.js imports this file by URL at load and waits for `ready` before it hands out a mark, so the first paint is
   synchronous like the old one. No frame loop runs here: a paint is one renderCard call. */
import { createCardContext, projection, view as lookView } from '../world2/world2-gl.mjs';
import { createCardProgram, uploadMesh, uploadInstances, disposeInstances, drawPieces, lightFrom, roundedBoxShape, sphereShape, fetchEnvironment, uploadEnvironment, worldPath } from '/fxn-3d/js/render/world2-mesh.mjs';

const W = 1000, H = 700, MX = 680, MY = 357;           // the card's size and where the mark's centre sits on it (art3d.js)
const FOV = 32, DIST = 350 / Math.tan(FOV / 2 * Math.PI / 180);
const D2R = Math.PI / 180;
const COARSE = 6;                                       // card units: a lit block shorter than this on every side takes the 1-segment box
const srgb = v => (v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4));
const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];

/* ---------- the matrix of one primitive: Three's Euler XYZ or a turn of +Y to a direction, then the scale ---------- */
function eulerXYZ(x, y, z) {
  const a = Math.cos(x), b = Math.sin(x), c = Math.cos(y), d = Math.sin(y), e = Math.cos(z), f = Math.sin(z), ae = a * e, af = a * f, be = b * e, bf = b * f;
  return [[c * e, -c * f, d], [af + be * d, ae - bf * d, -b * c], [bf - ae * d, be + af * d, a * c]];
}
/* the rotation that takes +Y to the unit vector d (Quaternion.setFromUnitVectors((0,1,0), d)) by Rodrigues */
function turnYTo(d) {
  if (d[1] < -.999999) return [[1, 0, 0], [0, -1, 0], [0, 0, -1]];
  const K = [[0, d[0], 0], [-d[0], 0, -d[2]], [0, d[2], 0]], k = 1 / (1 + d[1]), R = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let kk = 0; for (let m = 0; m < 3; m++) kk += K[i][m] * K[m][j]; R[i][j] += K[i][j] + kk * k; }
  return R;
}
/* one instance at index i of `out`: matrix columns = rotation columns x size, translation = the place, then rgb and alpha */
function put(out, i, p, R, s, c, a) {
  const o = i * 16;
  for (let j = 0; j < 3; j++) { out[o + j * 3] = R[0][j] * s[j]; out[o + j * 3 + 1] = R[1][j] * s[j]; out[o + j * 3 + 2] = R[2][j] * s[j]; }
  out[o + 9] = p[0]; out[o + 10] = p[1]; out[o + 11] = p[2]; out[o + 12] = c[0]; out[o + 13] = c[1]; out[o + 14] = c[2]; out[o + 15] = a;
}
const IDENT = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
function rotOf(e) { return e.dir ? turnYTo(e.dir) : e.rot ? eulerXYZ(e.rot[0] || 0, e.rot[1] || 0, e.rot[2] || 0) : IDENT; }
const list = n => new Float32Array(n * 16);

/* ---------- the group: translate x Rx x Ry, as Three's Group with rotation.set(tilt.x, tilt.y, 0) ---------- */
function groupMatrix(out, tilt, px, py) {
  const R = eulerXYZ(tilt.x, tilt.y, 0);
  out.set([R[0][0], R[1][0], R[2][0], 0, R[0][1], R[1][1], R[2][1], 0, R[0][2], R[1][2], R[2][2], 0, px, py, 0, 1]);
  return out;
}
function mul(out, a, b) {
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; out[c * 4 + r] = s; }
  return out;
}

/* ---------- the shared context ---------- */
let S = null, envData = null, gen = 0, failed = false;
const gl_ = () => S && S.gl;
/* make the context, the program, the two unit shapes and the room; sync once the room has been fetched */
function ensure() {
  if (S) return S;
  if (failed) return null;
  try {
    const R = createCardContext();
    if (!R) throw new Error('this browser gives no WebGL2 context');
    const gl = R.gl, prog = createCardProgram(gl), cube = uploadMesh(gl, roundedBoxShape()), coarse = uploadMesh(gl, roundedBoxShape(null, null, 1)), ball = uploadMesh(gl, sphereShape());
    const light = lightFrom(new Float32Array(54).fill(.5));
    /* the card's own lights as art3d.js set them: ambient .55, key 2.6 from (-420, 560, 900), rim 1.3 from (700, 260, -500), the room at half strength */
    const unit = v => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
    Object.assign(light, { keyDir: unit([-420, 560, 900]), key: [2.6, 2.6, 2.6], backDir: unit([700, 260, -500]), back: [1.3, 1.3, 1.3], fill: [0, 0, 0], sky: [.55, .55, .55], ground: [.55, .55, .55], env: 0, exposure: 1 });
    if (envData) { light.envMap = uploadEnvironment(gl, envData); light.envInt = .5; }
    const dry = Object.assign({}, light, { shadow: null });   // glass takes no shadow (Three's glass has receiveShadow off)
    S = { R, gl, prog, cube, coarse, ball, light, dry, cubeIdx: cube.runs.reduce((n, q) => n + q.count, 0), coarseIdx: coarse.runs.reduce((n, q) => n + q.count, 0), group: new Float32Array(16), vw: new Float32Array(16), proj: new Float32Array(16), lvp: new Float32Array(16), eye: [0, 0, DIST], camView: new Float32Array(16) };
    R.lightMatrix(S.lvp, [-420 + (MX - W / 2), 560, 900], [MX - W / 2, H / 2 - MY, 0], 520, 100, 3000);
  } catch (err) {
    failed = true; S = null;
    console.error('The card draws its art flat: the grammar renderer could not start (' + err.message + ').');
  }
  return S;
}
/* the room is fetched once; art3d.js awaits this before its first paint */
const ready = fetchEnvironment(worldPath('room-env.bin')).then(e => { envData = e; ensure(); return !!S; }, err => { console.error('The card art has no baked room (' + err.message + '). Glass and metal light without it.'); ensure(); return !!S; });

/* ---------- the writer: a model's primitives into parts on the GPU ---------- */
function sceneOf(model) {
  if (model._cg && model._cg.gen === gen) return model._cg;
  const C = ensure(), gl = C.gl, T = { gen, inst: [], casters: [], items: [], glass: [], cs: [] };
  const mat = { rgb: [1, 1, 1], metal: .08, rough: .4, emission: 0, opacity: 1 };
  /* Two shapes for the lit blocks, split by size. The rounded box (2 segments, 0.14 radius) costs about 3x the triangles of
     the 1-segment one, and the draw is vertex bound: on WebKit with the GPU (Apple GPU through Metal, 1927x1349, card 27's 4044
     blocks) the fine shape alone was 1.5 to 3 ms of a 9 to 11 ms paint. A block under COARSE units on its longest side has a
     corner radius under one pixel at the largest paint (0.14 x 6 x 1.93 px per unit = 1.6 px at most, a fraction of it at rest
     sizes), so it takes the coarse shape; larger blocks keep the fine one and the picture the Three.js card had. */
  const fine = [], low = [];
  /* nearest first: the depth test then rejects the hidden blocks before their fragment work (GGX, the room, nine shadow taps) */
  model.cubes.slice().sort((a, b) => b.z - a.z).forEach(e => { (Math.max(e.sx || 1, e.sy || 1, e.sz || 1) < COARSE ? low : fine).push(e); });
  [[fine, C.cube], [low, C.coarse]].forEach(([es, up]) => {
    if (!es.length) return;
    const d = list(es.length);
    es.forEach((e, i) => put(d, i, [e.x, e.y, e.z], rotOf(e), [e.sx || 1, e.sy || 1, e.sz || 1], e.c.map(srgb), 1));
    const inst = uploadInstances(gl, up, d); T.inst.push(inst);
    T.items.push({ up, model: C.group, o: { mode: 0, post: 1, inst, mat } });
    /* the shadow map is 0.5 unit a texel, so a rounded corner never shows in it: every block casts as the coarse shape */
    const cast = up === C.coarse ? inst : uploadInstances(gl, C.coarse, d); if (cast !== inst) T.inst.push(cast);
    T.casters.push({ up: C.coarse, inst: cast, model: C.group, indices: C.coarseIdx });
  });
  const segs = [];     // [a, b, rgb, alpha]: the glass edges and the free lines
  if (model.glasses.length) {
    const d = list(model.glasses.length);
    model.glasses.forEach((e, k) => {
      const R = rotOf(e), s = [e.sx || 1, e.sy || 1, e.sz || 1], p = [e.x, e.y, e.z];
      put(d, k, p, R, s, [1, 1, 1], 1);
      const corner = n => [0, 1, 2].map(r => p[r] + R[r][0] * s[0] * (n & 1 ? .5 : -.5) + R[r][1] * s[1] * (n & 2 ? .5 : -.5) + R[r][2] * s[2] * (n & 4 ? .5 : -.5));
      const cs = [0, 1, 2, 3, 4, 5, 6, 7].map(corner);
      EDGES.forEach(ed => segs.push([cs[ed[0]], cs[ed[1]], e.c, e.a]));
    });
    const inst = uploadInstances(gl, C.cube, d, true); T.inst.push(inst);
    T.glass.push({ up: C.cube, model: C.group, o: { mode: 0, post: 1, inst, faces: 'front', mat: { rgb: [1, 1, 1], metal: 0, rough: .06, emission: 0, opacity: .12, coat: 1, coatRough: .05, env: 2.2 } } });
  }
  model.lines.forEach(l => {
    const p = l.p, n = p.length / 3;
    for (let i = 0; i < n - 1 + (l.closed ? 1 : 0); i++) { const j = (i + 1) % n; segs.push([[p[i * 3], p[i * 3 + 1], p[i * 3 + 2]], [p[j * 3], p[j * 3 + 1], p[j * 3 + 2]], l.c, l.a]); }
  });
  if (segs.length) {
    const d = list(segs.length);
    segs.forEach((q, i) => { const o = i * 16; d.set(q[0], o); d.set(q[1], o + 3); d[o + 6] = 1; d[o + 12] = q[2][0]; d[o + 13] = q[2][1]; d[o + 14] = q[2][2]; d[o + 15] = q[3]; });
    T.cs.push({ kind: 'lines', data: d });
  }
  for (const soft of [false, true]) {
    const pts = model.points.filter(e => !!e.soft === soft);
    if (!pts.length) continue;
    const d = list(pts.length);
    pts.forEach((e, i) => put(d, i, [e.x, e.y, e.z], IDENT, [e.s, 1, 1], e.c, e.a));
    T.cs.push({ kind: soft ? 'soft' : 'points', data: d });
  }
  if (model.quads.length) {
    const d = list(model.quads.length);
    model.quads.forEach((e, i) => {
      const ca = Math.cos(e.ang), sa = Math.sin(e.ang);
      put(d, i, [e.x, e.y, e.z], [[ca, -sa, 0], [sa, ca, 0], [0, 0, 1]], [e.w, e.len, 1], e.c, e.a);
      d[i * 16 + 6] = e.mode; d[i * 16 + 7] = e.segs; d[i * 16 + 8] = 0;      // the streak reads (mode, bar count) from the z column
    });
    T.cs.push({ kind: 'streaks', data: d });
  }
  if (model.bars.length) {
    const d = list(model.bars.length);
    model.bars.forEach((e, i) => put(d, i, [e.x, e.y, e.z], rotOf(e), [e.sx || 1, e.sy || 1, e.sz || 1], e.c, e.a));
    T.cs.push({ kind: 'bars', data: d });
  }
  if (model.spheres.length) {
    const d = list(model.spheres.length);
    /* The Three.js card drew each sphere on BOTH faces (its material asked for FrontSide, which is 0, and the code read
       `side || DoubleSide`), so a rim shone twice: the far face adds the same fresnel at the same pixel. The orb part draws
       front faces only, so the writer carries the second face as double alpha; measured against the old picture, the rim
       profile then matches where a single face is half as bright. */
    model.spheres.forEach((e, i) => put(d, i, [e.x, e.y, e.z], IDENT, [e.r, e.r, e.r], e.c, e.a * 2));
    T.cs.push({ kind: 'orbs', data: d });
  }
  T.sc = C.R.cardScene(T.cs);
  return (model._cg = T);
}

/* ---------- paint: one draw into the shared canvas; the caller copies it out ---------- */
/* returns the context's canvas, or null when the browser has no WebGL2 (art3d.js then draws its flat fallback).
   opts as art3d.js paint(): object, aspect, zoom, shift, moving. */
function paint(model, pw, ph, tilt, opts) {
  const C = ensure();
  if (!C) return null;
  /* a context the browser has taken away draws nothing; the card draws flat for these frames and the engine rebuilds the context when it is given back (fxn-3d context-guard.mjs) */
  if (C.gl.isContextLost()) return null;
  const o = opts || {}, object = !!o.object, moving = !!o.moving, T = sceneOf(model);
  groupMatrix(C.group, tilt, object ? (o.shift || 0) : MX - W / 2, object ? 0 : H / 2 - MY);
  const aspect = o.aspect || W / H, zoom = (object && o.zoom) || 1;
  const fov = 2 * Math.atan(Math.tan(FOV / 2 * D2R) / zoom) / D2R;
  /* the lens is Three's: fov over the height, aspect as given, so a canvas of another aspect stretches as it did */
  projection(C.proj, fov, 20, 6000, { x: 0, y: 0, w: aspect * ph, h: ph }, aspect * ph, ph);
  lookView(C.camView, [0, 0, DIST], [0, 0, 0]);
  mul(C.vw, C.camView, C.group);
  /* the eye in the group's space: R^T (eye - t), for the fresnel terms of the additive solids */
  const g = C.group, ex = -g[12], ey = -g[13], ez = DIST - g[14];
  const eye = [g[0] * ex + g[1] * ey + g[2] * ez, g[4] * ex + g[5] * ey + g[6] * ez, g[8] * ex + g[9] * ey + g[10] * ez];
  /* the key's shadow over a box of 520 at 2048: only a full-size, still frame (the moving frame skips the pass, as the old one did) */
  C.light.shadow = pw >= 1000 && !moving && T.casters.length ? C.R.cardShadow(T.casters, C.lvp, { normal: .8, bias: .0004, radius: 2 }) : null;
  C.R.renderCard(T.sc, {
    proj: C.proj, view: C.vw, eye, fov, w: pw, h: ph, samples: 4,
    mesh: () => {
      drawPieces(C.gl, C.prog, T.items, C.proj, C.camView, C.eye, C.light);
      if (T.glass.length) drawPieces(C.gl, C.prog, T.glass, C.proj, C.camView, C.eye, C.dry);
    }
  });
  return C.R.canvas;
}

/* free one model's GPU buffers; they are written again if it is painted again */
function dispose(model) {
  [model, model && model._solid].forEach(m => {
    const T = m && m._cg;
    if (!T) return;
    if (T.gen === gen && S) { T.inst.forEach(i => disposeInstances(S.gl, i)); T.sc.dispose(); }
    m._cg = null;
  });
}
/* free the context and everything on it: for a page the last card left. The next paint makes a new one from the cached room */
function release() {
  if (!S) { failed = false; return false; }
  const lose = S.gl.getExtension && S.gl.getExtension('WEBGL_lose_context');
  if (lose) lose.loseContext();
  S = null; gen++;
  return true;
}

window.DefxnCardGL = { ready, paint, dispose, release, ok: () => !!gl_(), gl: gl_ };   // gl: the shared context, for a page or a check that needs to see it
