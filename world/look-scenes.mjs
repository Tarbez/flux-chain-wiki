/* The feature scenes of world/look-test.html, one scene per shared renderer feature (docs/design/world-grammar/NFT-SKINS.md
   gaps 1-11, VIEWS.md "What the grammar renderer lacks"). Each scene builds its inputs from numbers in this file, draws ONE
   frame through the same calls a view or a card makes (js/world2/world2-gl.mjs, /fxn-3d/js/render/world2-mesh.mjs), and
   keeps a render() closure so __look.time(n) can time n frames of exactly that scene. Nothing loops and nothing is
   authored per card: a card's data would arrive as the same instance arrays.

   Two contexts: the world renderer on #world (createRenderer, 4x MSAA main target), and the shared card context
   (createCardContext: one offscreen GL context for every card) copied onto #cardout with drawImage.

   Instance layout (16 floats): the three matrix columns, the translation, then linear r g b and alpha (a direct part) or
   tone, family, mix, alpha (a themed one). */
import { createRenderer, createCardContext, projection, view, eyeOf, FOV, MODE } from '../js/world2/world2-gl.mjs';
import { createCardProgram, uploadMesh, uploadInstances, sortInstances, drawPieces, lightFrom, roundedBoxShape, sphereShape, fetchEnvironment, uploadEnvironment } from '/fxn-3d/js/render/world2-mesh.mjs';
import { prism } from '/fxn-3d/js/render/world2-shapes.mjs';

const D2R = Math.PI / 180;
/* one instance: a position, a size per axis, Euler angles (x, y, z) and a colour; the matrix is R times diag(size) */
function inst(out, i, p, s, r, c) {
  const [a, b, g] = r || [0, 0, 0], ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cg = Math.cos(g), sg = Math.sin(g);
  /* R = Rz(g) Ry(b) Rx(a); columns scaled by the size */
  const m = [cg * cb, sg * cb, -sb, cg * sb * sa - sg * ca, sg * sb * sa + cg * ca, cb * sa, cg * sb * ca + sg * sa, sg * sb * ca - cg * sa, cb * ca];
  const o = i * 16;
  for (let k = 0; k < 3; k++) { out[o + k] = m[k] * s[0]; out[o + 3 + k] = m[3 + k] * s[1]; out[o + 6 + k] = m[6 + k] * s[2]; out[o + 9 + k] = p[k]; }
  out[o + 12] = c[0]; out[o + 13] = c[1]; out[o + 14] = c[2]; out[o + 15] = c[3] == null ? 1 : c[3];
}
const list = (n, fill) => { const a = new Float32Array(n * 16); for (let i = 0; i < n; i++) fill(a, i); return a; };
/* a small deterministic random, so a scene is the same every run */
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const srgb = v => v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4);
const median = a => { a = a.slice().sort((x, y) => x - y); return a[a.length >> 1]; };

export function install(stat, size) {
  const W = size.w, H = size.h, scenes = {}, cur = { render: null, gl: null, name: '' };
  const show = id => { for (const n of ['scene', 'world', 'cardout', 'cardtwo']) document.getElementById(n).style.display = n === id || (id === 'cardout' && n === 'cardtwo' && cur.two) ? 'block' : 'none'; };
  let Rw = null, card = null;
  const px = new Uint8Array(4);

  /* ---------- the world renderer ---------- */
  const palette = new Float32Array(60); for (let i = 0; i < 20; i++) palette.set([.5 + .4 * Math.sin(i), .55 + .35 * Math.sin(i * 1.7 + 1), .6 + .3 * Math.sin(i * 2.3 + 2)].map(v => v * v), i * 3);
  function world() {
    if (Rw) return Rw;
    const c = document.getElementById('world'); Rw = createRenderer(c); if (!Rw) throw new Error('no WebGL2 for the world renderer');
    Rw.resize(W, H, 4); Rw.setPalette(palette); Rw.setFrame({ x: 0, y: 0, w: W, h: H }, W, H);
    return Rw;
  }
  let blobN = 0;
  /* a draw list of parts, each { part, data, ...flags }: one blob, offsets in bytes */
  function makeList(R, parts) {
    const total = parts.reduce((n, p) => n + p.data.length, 0), all = new Float32Array(total); let at = 0;
    const out = parts.map(p => { const q = Object.assign({}, p, { offset: at * 4, count: p.data.length / 16 }); all.set(p.data, at); at += p.data.length; delete q.data; return q; });
    return { cid: 'look-' + (blobN++), buffer: all.buffer, parts: out };
  }
  const CAM = { aim: [0, 0, 0], dist: 90, elev: .45, yaw: .5 };
  function worldScene(name, build) {
    scenes[name] = () => {
      const R = world(); show('world');
      const b = build(R), l = makeList(R, b.parts);
      R.fitShadow([0, 0, 0], 14);
      R.setFrameBlob(l.cid, l.buffer, l.parts);
      const insets = b.insets ? b.insets(R) : null;
      cur.name = name; cur.gl = R.gl; cur.two = false;
      cur.render = () => { if (b.before) b.before(R); R.render(b.cam || CAM, 90, false, insets); };
      cur.render();
      return { R: R.stats, msaa: R.msaa };
    };
  }

  /* gap 6 and VIEWS 2: lines of a pixel width, reveal fraction, arcs, beads */
  worldScene('lines', R => {
    const seg = [], add = (a, b, w, t0, t1, c) => seg.push([a, b, w, t0 || 0, t1 || 0, c]);
    for (let k = 0; k < 4; k++) add([-9, 6 - k * 2.2, 0], [-2, 6 - k * 2.2, 0], [1, 2, 4, 8][k], 0, 0, [1, .8, .4]);
    /* an arc drawn by a reveal fraction: the parameter grows along it, so reveal .6 shows 60% of it */
    const N = 64; for (let i = 0; i < N; i++) { const a0 = i / N * Math.PI * 1.5, a1 = (i + 1) / N * Math.PI * 1.5; add([4 + 4 * Math.cos(a0), 3 + 4 * Math.sin(a0), 0], [4 + 4 * Math.cos(a1), 3 + 4 * Math.sin(a1), 0], 3, i / N, (i + 1) / N, [.4, .9, 1]); }
    const lines = list(seg.length, (a, i) => { const s = seg[i], o = i * 16; a.set(s[0], o); a.set(s[1], o + 3); a[o + 6] = s[2]; a[o + 7] = s[3]; a[o + 8] = s[4]; a.set(s[5], o + 12); a[o + 15] = 1; });
    /* beads on the full arc, the same ends */
    const beads = list(16, (a, i) => { const t = i / 15 * Math.PI * 1.5; inst(a, i, [4 + 4 * Math.cos(t), 3 + 4 * Math.sin(t) - 8, 0], [.5, .5, .5], null, [1, .7, .3, 1]); });
    return { parts: [{ part: 'line', data: lines, direct: true, reveal: .6 }, { part: 'dot', data: beads, direct: true, soft: 1 }] };
  });
  /* gap 7 and VIEWS 9: hard, soft and drifting points */
  worldScene('dots', R => {
    const r = rng(7), mk = (n, x0, soft) => list(n, (a, i) => inst(a, i, [x0 + (r() - .5) * 8, (r() - .5) * 14, (r() - .5) * 6], [1.1, 1.1, 1.1], null, [1, .9, .6, 1]));
    return { parts: [{ part: 'dot', data: mk(40, -9), direct: true, soft: 2 }, { part: 'dot', data: mk(40, 0), direct: true, soft: 1 }, { part: 'dot', data: mk(60, 9), direct: true, soft: 1, drift: [.9, 1] }], before: R2 => R2.setTime(3.3) };
  });
  /* gap 2 and VIEWS 5: sphere, rounded box, torus, prism, with the direct colour of gap 1, lit and shadowed */
  worldScene('shapes', R => {
    const pr = prism([[-.5, -.4], [.5, -.4], [.5, .1], [0, .5], [-.5, .1]]);
    R.addShape('prism', pr);
    const one = (shape, x, c, rot) => ({ part: 'solid', shape, direct: true, data: list(1, (a, i) => inst(a, i, [x, 1.6, 0], [3, 3, 3], rot, c)) });
    const floor = { part: 'cube', direct: true, data: list(1, (a, i) => inst(a, i, [0, -.3, 0], [26, .6, 12], null, [.35, .36, .4, 1])) };
    return { parts: [floor, one('sphere', -9, [.9, .3, .2, 1]), one('round', -4.5, [.3, .8, .4, 1], [.4, .5, 0]), one('torus', 0, [.3, .5, 1, 1], [.9, 0, 0]), one('prism', 4.5, [1, .8, .2, 1], [0, .6, 0]), one('cube', 9, [.8, .8, .85, 1])] };
  });
  /* VIEWS 1: canvas text on faces, with a polygon offset on a plate lying on a face */
  worldScene('text', R => {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const g = cv.getContext('2d');
    g.fillStyle = 'rgba(20,30,40,.85)'; g.fillRect(0, 0, 512, 256); g.fillStyle = '#ffd28a'; g.font = 'bold 72px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('FXN ID', 256, 100); g.font = '36px sans-serif'; g.fillStyle = '#9fe'; g.fillText('your key, your name', 256, 186);
    R.setTexture('look-text-1', cv);
    const plate = (x, y, z, w, h) => (a, i) => { a.set([w, 0, 0, 0, 0, 1, 0, -h, 0, x, y, z, 1, 1, 1, 1], i * 16); };
    return { parts: [{ part: 'cube', direct: true, data: list(1, (a, i) => inst(a, i, [-4, 3, 0], [6, 6, 6], null, [.45, .45, .5, 1])) },
      /* a plate exactly on the cube's +Z face (z = 3): without the offset it fights the face */
      { part: 'text', tex: 'look-text-1', direct: true, data: list(1, plate(-4, 3, 3, 5, 2.5)) },
      { part: 'text', tex: 'look-text-1', direct: true, data: list(1, plate(6, 3, 0, 8, 4)) }] };
  });
  /* VIEWS 3: translucent solids sorted across all parts, and an additive back-face shell */
  worldScene('translucent', R => {
    const r = rng(11);
    const glass = (n, shape, pass, extra) => Object.assign({ part: 'glass', shape, pass, direct: true, data: list(n, (a, i) => inst(a, i, [(r() - .5) * 16, 2 + r() * 6, (r() - .5) * 6], [3, 3, 3], [r(), r(), 0], [.3, .6, 1, .35])) }, extra);
    return { parts: [{ part: 'cube', direct: true, data: list(6, (a, i) => inst(a, i, [-10 + i * 4, 1.5, (i % 2 ? 1 : -1) * 2], [2.6, 3, 2.6], null, [.9, .45, .2, 1])) }, glass(7, 'sphere', 'blend', { sort: true }), glass(3, 'round', 'shell', { glow: [.1, 1, 2], sort: false })] };
  });
  /* VIEWS 6/7: the host's streams, a dim, a lift and a morph weight per instance */
  worldScene('state', R => {
    const base = list(5, (a, i) => inst(a, i, [-8 + i * 4, 1.5, 0], [2.5, 3, 2.5], null, [.4, .8, .9, 1]));
    const to = list(5, (a, i) => inst(a, i, [-8 + i * 4, 4.5, 2], [2.5, 1, 2.5], [0, .8, 0], [.4, .8, .9, 1]));
    const st = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1.5, 0, 0, 0, .5, 0, 0, 1]);
    return { parts: [{ part: 'solid', shape: 'cube', direct: true, data: base, state: R.buffer(st), morph: R.buffer(to) }] };
  });
  /* VIEWS 9: a second sub-viewport over the main view */
  scenes.inset = () => {
    const R = world(); show('world');
    const main = makeList(R, [{ part: 'solid', shape: 'sphere', direct: true, data: list(3, (a, i) => inst(a, i, [-8 + i * 8, 2, 0], [3, 3, 3], null, [.9, .5, .3, 1])) }]);
    const sub = makeList(R, [{ part: 'solid', shape: 'torus', direct: true, data: list(2, (a, i) => inst(a, i, [0, 0, i * 3], [3, 3, 3], [Math.PI / 2 + i * .4, 0, 0], [.3, .7, 1, 1])) }]);
    const sl = R.makeList(sub.cid, sub.buffer, sub.parts);
    R.fitShadow([0, 0, 0], 14); R.setFrameBlob(main.cid, main.buffer, main.parts);
    const ins = [{ rect: { x: W - 420, y: 20, w: 400, h: 300 }, cam: { aim: [0, 0, 0], dist: 60, elev: .6, yaw: .3 }, fogDist: 60, list: sl }];
    cur.name = 'inset'; cur.gl = R.gl; cur.two = false; cur.render = () => R.render(CAM, 90, false, ins); cur.render();
    return { inset: ins[0].rect };
  };

  /* ---------- the card context ---------- */
  function cardCtx() {
    if (card) return card;
    const R = createCardContext(); if (!R) throw new Error('no card context');
    const gl = R.gl, prog = createCardProgram(gl), cube = uploadMesh(gl, roundedBoxShape()), ball = uploadMesh(gl, sphereShape());
    card = { R, gl, prog, cube, ball, light: null, env: null };
    return card;
  }
  /* three: PerspectiveCamera(32) at distance 350 / tan(16 degrees), looking at the origin, aspect w / h */
  function cardCamera(w, h, zoom) {
    const fov = 2 * Math.atan(Math.tan(32 / 2 * D2R) / (zoom || 1)) / D2R, dist = 350 / Math.tan(16 * D2R);
    const proj = new Float32Array(16), vw = new Float32Array(16), eye = [0, 0, dist];
    projection(proj, fov, 20, 6000, { x: 0, y: 0, w, h }, w, h); view(vw, eye, [0, 0, 0]);
    return { proj, vw, eye, fov };
  }
  const unit = v => { const l = Math.hypot(...v); return v.map(c => c / l); };
  /* the card's lights as art3d.js sceneOf sets them: ambient .55, key 2.6 from (-420, 560, 900), rim 1.3 from (700, 260, -500), the room at half strength */
  async function cardLight(C, envOn) {
    const L = lightFrom(new Float32Array(54).fill(.5));
    Object.assign(L, { keyDir: unit([-420, 560, 900]), key: [2.6, 2.6, 2.6], backDir: unit([700, 260, -500]), back: [1.3, 1.3, 1.3], fill: [0, 0, 0], sky: [.55, .55, .55], ground: [.55, .55, .55], env: 0, exposure: 1 });
    if (envOn) { if (!C.env) C.env = uploadEnvironment(C.gl, await fetchEnvironment('/world/room-env.bin')); L.envMap = C.env; L.envInt = .5; }
    return L;
  }
  const lin = c => c.map(srgb);
  /* a card scene: cubes (instanced, per-instance colour), glass (instanced, sorted, with its edge lines), and the additive primitives */
  async function buildCard(name, o) {
    const C = cardCtx(), gl = C.gl, light = await cardLight(C, o.env !== false), cam = cardCamera(o.w, o.h, 1), r = rng(o.seed || 5);
    const group = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    const parts = [], items = [], casters = [];
    const pos = () => [(r() - .5) * 520, (r() - .5) * 330, (r() - .5) * 160];
    if (o.cubes) {
      const data = list(o.cubes, (a, i) => inst(a, i, pos(), [20 + r() * 40, 20 + r() * 40, 20 + r() * 40], [r() * 3, r() * 3, 0], [...lin([r(), r(), r()]), 1]));
      const ins = uploadInstances(gl, C.cube, data);
      items.push({ up: C.cube, model: group, o: { mode: 0, post: 1, inst: ins, mat: { rgb: [1, 1, 1], metal: .08, rough: .4, emission: 0, opacity: 1 } } });
      casters.push({ up: C.cube, inst: ins, model: group, indices: C.cube.runs.reduce((n, q) => n + q.count, 0) });
    }
    const edgeLines = [];
    if (o.glass) {
      const data = list(o.glass, (a, i) => {
        const p = pos(), s = [30 + r() * 60, 30 + r() * 60, 30 + r() * 60], rot = [r() * 3, r() * 3, 0], c = [r(), r(), r()];
        inst(a, i, p, s, rot, [1, 1, 1, 1]);
        /* the 12 edges of the box, as art3d.js draws them: bright lines in the cube's colour times .5 */
        const m = a.subarray(i * 16, i * 16 + 12), corner = k => [0, 1, 2].map(ax => m[9 + ax] + (k & 1 ? .5 : -.5) * m[ax] + (k & 2 ? .5 : -.5) * m[3 + ax] + (k & 4 ? .5 : -.5) * m[6 + ax]);
        for (const [e0, e1] of [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]) edgeLines.push([corner(e0), corner(e1), c.map(v => v * .5)]);
      });
      const ins = uploadInstances(gl, C.cube, data, true);
      items.push({ up: C.cube, model: group, o: { mode: 0, post: 1, inst: ins, faces: 'front', mat: { rgb: [1, 1, 1], metal: 0, rough: .06, emission: 0, opacity: .12, coat: 1, coatRough: .05, env: 2.2 } } });
    }
    if (o.spheres) for (let k = 0; k < o.spheres; k++) {
      const data = list(1, (a, i) => inst(a, i, [-210 + k * 105, -120, 40], [48, 48, 48], null, [1, 1, 1, 1]));
      items.push({ up: C.ball, model: group, o: { mode: 0, post: 1, inst: uploadInstances(gl, C.ball, data), mat: { rgb: lin([.95, .8, .55]), metal: 1, rough: k / (o.spheres - 1), emission: 0, opacity: 1 } } });
      const d2 = list(1, (a, i) => inst(a, i, [-210 + k * 105, 120, 40], [48, 48, 48], null, [1, 1, 1, 1]));
      items.push({ up: C.ball, model: group, o: { mode: 0, post: 1, inst: uploadInstances(gl, C.ball, d2), mat: { rgb: lin([.8, .8, .85]), metal: 0, rough: k / (o.spheres - 1), emission: 0, opacity: 1 } } });
    }
    /* the key's shadow map over a box of 520 (art3d.js): drawn again by reshadow(), which a timed frame includes so the number is the whole cost */
    const lvp = new Float32Array(16); C.R.lightMatrix(lvp, [-420, 560, 900], [0, 0, 0], 520, 100, 3000);
    const reshadow = () => { light.shadow = C.R.cardShadow(casters, lvp, { normal: .8, bias: .0004, radius: 2 }); };
    if (o.shadow) reshadow();
    const cs = [];
    if (edgeLines.length || o.lines) {
      const all = edgeLines.concat(o.lines || []);
      cs.push({ kind: 'lines', data: list(all.length, (a, i) => { const e = all[i]; a.set(e[0], i * 16); a.set(e[1], i * 16 + 3); a[i * 16 + 6] = 1; a.set(e[2], i * 16 + 12); a[i * 16 + 15] = 1; }) });
    }
    const pts = (n, kind) => cs.push({ kind, data: list(n, (a, i) => inst(a, i, pos(), [2 + r() * 5, 2, 2], null, [.6 * r() + .3, .5, .9, 1])) });
    if (o.points) { pts(o.points, 'points'); pts(o.points, 'soft'); }
    if (o.streaks) cs.push({ kind: 'streaks', data: list(o.streaks, (a, i) => { const p = pos(); inst(a, i, p, [6 + r() * 6, 60 + r() * 120, 1], [0, 0, r() * 6.28], [.9 * r(), .6, 1, 1]); a[i * 16 + 6] = i % 3; a[i * 16 + 7] = 6; a[i * 16 + 8] = 0; }) });
    if (o.bars) cs.push({ kind: 'bars', data: list(o.bars, (a, i) => inst(a, i, pos(), [8, 40 + r() * 60, 8], [0, r(), 0], [.2, .8 * r() + .1, .6, .7])) });
    if (o.orbs) cs.push({ kind: 'orbs', data: list(o.orbs, (a, i) => { const p = pos(), q = 20 + r() * 30; inst(a, i, p, [q, q, q], null, [.7, .4 * r() + .3, 1, .8]); }) });
    const sc = C.R.cardScene(cs);
    const c = { proj: cam.proj, view: cam.vw, eye: cam.eye, fov: cam.fov, w: o.w, h: o.h, samples: o.samples == null ? 4 : o.samples, mesh: () => drawPieces(gl, C.prog, items, cam.proj, cam.vw, cam.eye, light) };
    return { C, sc, c, items, cs, reshadow: o.shadow ? reshadow : null };
  }
  function cardScene(name, o) {
    scenes[name] = async () => {
      const b = await buildCard(name, o), { C } = b; show('cardout');
      const out = document.getElementById('cardout'); out.width = o.w; out.height = o.h;
      const ctx2 = out.getContext('2d');
      cur.name = name; cur.gl = C.gl; cur.two = false;
      cur.render = () => { if (b.reshadow) b.reshadow(); C.R.renderCard(b.sc, b.c); };
      cur.render(); ctx2.clearRect(0, 0, o.w, o.h); ctx2.fillStyle = '#0a100d'; ctx2.fillRect(0, 0, o.w, o.h); ctx2.drawImage(C.R.canvas, 0, 0);
      return { stats: C.R.stats, msaa: C.R.msaa, instances: C.R.stats.instances, calls: C.R.stats.calls };
    };
  }
  /* gap 5: the environment lights spheres, metal and rough; gap 4: the glass; gaps 6-9: primitives */
  cardScene('env', { w: W, h: H, spheres: 5 });
  cardScene('glass', { w: W, h: H, cubes: 12, glass: 40, seed: 9 });
  cardScene('primitives', { w: W, h: H, points: 120, streaks: 30, bars: 20, orbs: 8, lines: [[[-300, -150, 0], [300, 150, 0], [1, .8, .3]], [[-300, 150, 0], [300, -150, 0], [.3, .8, 1]]], env: false });
  /* gap 10: the same edges with and without multisampling, back to back */
  scenes.msaa = async () => {
    const out = {}, tweak = async s => { const b = await buildCard('m', { w: W, h: H, cubes: 30, glass: 0, samples: s, seed: 3, env: false }); b.C.R.renderCard(b.sc, b.c); const g = b.C.gl, buf = new Uint8Array(W * H * 4); g.bindFramebuffer(g.READ_FRAMEBUFFER, null); g.readPixels(0, 0, W, H, g.RGBA, g.UNSIGNED_BYTE, buf); const levels = new Set(); for (let i = 3; i < buf.length; i += 4) levels.add(buf[i]); return levels.size; };
    out.alphaLevelsWithout = await tweak(0); out.alphaLevelsWith = await tweak(4); show('cardout'); return out;
  };
  /* gap 11: two cards, one GL context */
  scenes.shared = async () => {
    const a = await buildCard('a', { w: W >> 1, h: H >> 1, cubes: 10, glass: 10, seed: 21 }), b = await buildCard('b', { w: W >> 1, h: H >> 1, cubes: 14, glass: 6, seed: 22 });
    const o1 = document.getElementById('cardout'), o2 = document.getElementById('cardtwo'); o1.width = W >> 1; o1.height = H >> 1; o2.width = W >> 1; o2.height = H >> 1;
    a.C.R.renderCard(a.sc, a.c); o1.getContext('2d').drawImage(a.C.R.canvas, 0, 0);
    b.C.R.renderCard(b.sc, b.c); o2.getContext('2d').drawImage(b.C.R.canvas, 0, 0);
    o1.style.width = '50%'; o1.style.height = '50%'; o1.style.inset = '0 auto auto 0'; cur.two = true; show('cardout');
    return { sameContext: a.C.R === b.C.R, contexts: 1 };
  };
  /* every card feature at once at the page's size: cubes, glass, edges, points, streaks, bars, orbs, shadow, environment, 4x MSAA */
  cardScene('all', { w: W, h: H, cubes: 120, glass: 60, points: 200, streaks: 40, bars: 24, orbs: 10, shadow: true, seed: 33 });

  stat.scenes = Object.keys(scenes);
  stat.scene = async name => { const f = scenes[name]; if (!f) throw new Error('no scene ' + name + '; try ' + stat.scenes.join(', ')); return await f(); };
  /* n timed frames of the scene on screen, each ended by a 1 x 1 read so the GPU has finished */
  stat.time = n => {
    const gl = cur.gl, t = [];
    for (let i = 0; i < n; i++) { const a = performance.now(); cur.render(); gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); t.push(performance.now() - a); }
    /* the browser's timer is whole milliseconds, so the mean of a run of frames finished by ONE read is the finer number */
    const a = performance.now(); for (let i = 0; i < n; i++) cur.render(); gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return { scene: cur.name, median: median(t), mean: (performance.now() - a) / n, size: W + 'x' + H };
  };
  stat.programs = () => ({ world: Rw ? Rw.programs : null, cardRenderer: card ? card.R.programs : null, meshPass: 1 });
  stat.pixelOfWorld = (x, y) => { Rw.gl.readPixels(Math.round(x * W), Math.round((1 - y) * H), 1, 1, Rw.gl.RGBA, Rw.gl.UNSIGNED_BYTE, px); return Array.from(px); };
}
