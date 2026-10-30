/* The Kit's 3D, read from its own source (docs/design/world-grammar/PORT.md, 2026-10-30 "kit").
   The /kit page (js/pages/kit.js) shows board 05, "Identity, Network & Micrographics": 30 objects, nine to a page, floating over the network. Their builders are
   js/world/object-kit.js (the shapes, materials and faces), glass-kit.js (the plates with holes) and kit-stage.js (the 3 x 3 grid, the camera, the motion). Three.js is
   deprecated (owner, 2026-10-30), so the page draws them with the fxn-3d world look. This file does not retype one object. It RUNS those three files, as they are, in a
   VM in which Three.js is answered by scripts/lib/kit-three.mjs (the engine's own geometry), and reads back:
     objects   every part of every object: its shape (a geometry id), its material by name, its matrix inside the object, the ring it belongs to (the orbit rings the stage tilts into place)
     shapes    each distinct shape once, as triangles (two objects that ask for the same box share it)
     faces     the words and marks on each object, as the 2D calls object-kit.js made (a recording canvas), with the colours as the three channels it paints (ink, accent, warning)
     looks     how each material is tinted: weights on the theme's CSS tokens (never a colour), so a skin repaints with no new file
     stage     the grid's numbers (cells, camera, labels), the stage's own grow curve and follower curves (each a step response, derived), and what the stage does for a state
   The stage's pose is read by calling the stage's own pose() at controlled channel values, so the numbers in the records are the source's, not a copy. Where this file restates a line of
   another source (ring-kit.js k.bevel and k.ease.out, chains-scene.js grow and follower) it names the line, and sourceGuard() refuses to run when that line has changed.
   Build side, Node only. No JSON, no library. */
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stageSrc } from './stage-src.mjs';
import { createThree, bevelGeo, G3, V3, M4, Quat, Euler, Col, rows12, mul, Geo } from './kit-three.mjs';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
/* where the encoder finds a source: the stage-src folder (where the removal of Three.js moves them), else the site's js/world while they still stand */
export function kitSrc(name) { const a = stageSrc(name), b = path.join(SITE, 'js', 'world', name); return fs.existsSync(a) ? a : b; }
const read = (p) => fs.readFileSync(p, 'utf8');

function sourceGuard(file, needles, what) {
  const src = read(file);
  for (const n of needles) if (!src.includes(n)) throw new Error(path.basename(file) + ' no longer holds "' + n + '", so ' + what + ' cannot be recorded from it. Re-read ' + path.basename(file) + ', update scripts/lib/kit-scene.mjs to the new text, and run the kit encoder again.');
  return src;
}

/* ---------- a recording 2D canvas: the calls a face makes, kept for the page to replay ---------- */
const PROPS = ['fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'font', 'letterSpacing', 'globalAlpha', 'textAlign', 'textBaseline', 'globalCompositeOperation'];
const CALLS = ['fillRect', 'strokeRect', 'clearRect', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'arcTo', 'ellipse', 'stroke', 'fill', 'fillText', 'bezierCurveTo', 'rect', 'save', 'restore', 'clip', 'translate', 'setLineDash'];
function recordingContext(canvas) {
  const ops = [], g = { canvas, ops };
  const state = { font: '10px sans-serif', letterSpacing: '0px' };
  for (const p of PROPS) Object.defineProperty(g, p, { get: () => state[p], set: (v) => { state[p] = v; ops.push([p, String(v)]); }, enumerable: true });
  for (const c of CALLS) g[c] = (...a) => { ops.push([c, ...a.map((x) => (Array.isArray(x) ? x.join(',') : x))]); };
  /* JetBrains Mono's advance is .6 em (600 of 1000 units): the width of a string in the faces' only measured font is exact; letter spacing adds after every glyph */
  g.measureText = (t) => { const px = parseFloat(/([\d.]+)px/.exec(state.font || '')[1]) || 10, ls = parseFloat(state.letterSpacing) || 0; return { width: String(t).length * (.6 * px + ls) }; };
  /* the DEFXN mark: object-kit.js tints a copy of the image into one channel on a canvas of its own and draws that copy; the recording keeps which channel */
  g.drawImage = (src, ...a) => {
    const tint = src && src._g;
    if (!tint) return;
    const fills = tint._g_ops.filter((o) => o[0] === 'fillStyle');
    const last = fills.length ? fills[fills.length - 1][1] : '';
    ops.push(['mark', last, ...a]);
  };
  Object.defineProperty(g, '_g_ops', { value: ops });
  g.createLinearGradient = () => ({ addColorStop() {} });
  return g;
}

/* ---------- the faces: the atlas canvas's calls, cut into one run of calls for each face ---------- */
/* object-kit.js paintFace: save, clearRect, beginPath, rect (the face's box in the atlas), clip, translate (to it), the face's own calls, restore */
function facesOf(ops) {
  const out = []; let depth = 0, cur = null;
  for (const op of ops) {
    if (op[0] === 'save') { if (depth === 0) cur = { ops: [], rect: null }; else cur.ops.push(op); depth++; continue; }
    if (op[0] === 'restore') { depth--; if (depth === 0) { out.push(cur); cur = null; } else cur.ops.push(op); continue; }
    if (!cur) continue;
    if (cur.rect === null) { if (op[0] === 'rect') cur.rect = op.slice(1).map(Number); continue; }
    if (cur.ops.length === 0 && (op[0] === 'clip' || op[0] === 'translate')) continue;
    cur.ops.push(op);
  }
  return out;
}

/* ---------- the run ---------- */
export function readKit({ hubC }) {
  const THREE = createThree();
  const SKIN = { __box: 'skin' }, BODY = { __box: 'body' }, provenance = new Map();
  const faceCanvases = [];
  const atlas = { width: 2048, height: 2048, getContext() { return atlas._g || (atlas._g = recordingContext(atlas)); } };
  let firstCanvas = true;
  const ctx = {
    console, Math, Number, String, Array, Object, parseInt, parseFloat, isNaN, Float32Array, Uint8Array, Set, Map, Error,
    document: {
      createElement: () => { const cv = { width: 0, height: 0, getContext() { return cv._g || (cv._g = recordingContext(cv)); } }; if (firstCanvas) { firstCanvas = false; return atlas; } faceCanvases.push(cv); return cv; },
      fonts: null, body: BODY, documentElement: BODY, getElementById: () => ({ closest: () => null }), addEventListener() {}
    },
    getComputedStyle: (box) => ({ getPropertyValue: (name) => { const key = box && box.__box === 'skin' ? 'skin' : 'body'; const old = provenance.get(name); if (old && old !== key) provenance.set(name, 'both'); else provenance.set(name, key); return '@' + name; } }),
    performance: { now: () => 0 }, requestAnimationFrame() { return 0; }, addEventListener() {},
    Image: function () { this.complete = true; this.naturalWidth = 256; Object.defineProperty(this, 'src', { set() {} }); },
    DEFXN_MARK: 'x'
  };
  ctx.window = ctx;
  /* the first canvas object-kit.js makes is the atlas (its first statement); the rest are the mark's tinted copies */

  /* ---- the world the sources find: k, W, S ---------------------------------------------------------------------------- */
  const ringKit = sourceGuard(kitSrc('ring-kit.js'), ['k.bevel = function (w, h, d, share) { return new RoundedBoxGeometry(w, h, d, 4, (share == null ? BEVEL : share) * Math.min(w, h, d)); };', 'var BEVEL = .1;',
    'out: function (x) { return 1 - Math.pow(1 - x, 3); },', 'inOut: function (x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },'], 'the shapes\' rounded boxes and the stage\'s eases');
  void ringKit;
  const chains = sourceGuard(kitSrc('chains-scene.js'), [
    'api.world.grow = function (w, a, b) { var u = clamp01((w - a) / (b - a)); return u <= 0 ? 1e-4 : u < 1 ? ease.out(u) : 1; };',
    'var dt = f.last ? Math.min(64, now - f.last) : 16, a = k.reduced ? 1 : 1 - Math.exp(-dt / (tau || 140)), moving = false;',
    'if (Math.abs(d) > .002) { f.v[i] += d * a; moving = true; } else f.v[i] = t;'], 'the stage\'s grow curve and followers');
  void chains;
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x), outCubic = (x) => 1 - Math.pow(1 - x, 3);
  const growCalls = [];
  const followers = [];
  const k = {
    reduced: false, scene: { add() {} }, wake() {}, moved() {}, redraw() {}, onPaint() {}, size: () => ({ w: 1440, h: 900 }), project: () => ({ x: 0, y: 0 }),
    bevel: (w, h, d, share) => new G3(bevelGeo(w, h, d, (share == null ? .1 : share) * Math.min(w, h, d))),
    grain(m, rough, normal) { m.grain = { rough: rough == null ? .55 : rough, normal: normal || 0 }; return m; }
  };
  const W = {
    k, THREE, V: (x, y, z) => new V3(x, y, z), ease: { clamp01, out: outCubic, inOut: (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2) },
    D2R: Math.PI / 180, N: { W: 601, H: 436 }, HUB: { c: new V3(hubC.x, hubC.y, hubC.z) }, after() {}, view: () => 'kit', stage(def) { W.def = def; },
    fit: (w, h, asp, fill) => ({ fit: { w, h, fill } }),
    grow(w, a, b) { growCalls.push({ w, a, b }); const u = clamp01((w - a) / (b - a)); return u <= 0 ? 1e-4 : u < 1 ? outCubic(u) : 1; },
    follower(n, tau) {
      const f = { v: new Float32Array(n), n, tau, forced: null };
      /* a follower that settles at once on its want (the stage's settled pose), or on values the encoder forces to read the pose at a given channel */
      f.step = (now, want) => { for (let i = 0; i < n; i++) f.v[i] = f.forced ? f.forced(i) : want(i); };
      followers.push(f); return f;
    }
  };
  const S = { ok: true, world: W, stage: W.stage };
  ctx.window.DEFXNScene = S;
  ctx.window.ArkWorldHost = { calm: { n: .6, elev: 30, dist: 135, tilt: 1.2 } };
  vm.createContext(ctx);
  const run = (file, text) => vm.runInContext(text, ctx, { filename: file });

  run('kit-boards.js', read(path.join(SITE, 'js', 'content', 'kit-boards.js')));
  /* glass-kit.js also builds the halo over the kernel when it loads; the Kit uses only its helpers (S.glass.roundRect, stroke...), which end at the line S.glass is set. Run up to it, close the IIFE */
  const glassText = read(kitSrc('glass-kit.js')), glassEnd = 'S.glass = { roundRect: roundRect, circle: circle, ring: ring, plate: plate, show: show, color: color, polygon: polygon, stroke: stroke, inlay: inlay };';
  if (!glassText.includes(glassEnd)) throw new Error('glass-kit.js no longer sets S.glass on the line this encoder cuts at. Re-read it and update scripts/lib/kit-scene.mjs.');
  run('glass-kit.js', glassText.slice(0, glassText.indexOf(glassEnd) + glassEnd.length) + '\n})();');
  run('object-kit.js', read(kitSrc('object-kit.js')));
  /* the stage file: its own text, with a probe of the names its closure holds appended before the IIFE closes. Guarded: the tail must be the one this reads */
  const stageText = read(kitSrc('kit-stage.js')), tail = '})();';
  if (!stageText.trimEnd().endsWith(tail) || !stageText.includes("S.stage({\n    name: 'kit',")) throw new Error('kit-stage.js no longer ends with the IIFE this encoder probes, or no longer registers the stage "kit". Re-read it and update scripts/lib/kit-scene.mjs.');
  const probeCode = 'window.__kit = { COLS: COLS, ROWS: ROWS, PER: PER, SP: SP, RISE: RISE, DEPTH: DEPTH, SC: SC, REST_YAW: REST_YAW, ELEV: ELEV, O: O, items: items, byId: byId, plates: plates, rims: rims, look: look, pose: pose, cellAt: cellAt, layout: layout, labelAt: labelAt, centreOf: centreOf, CELLS: CELLS, state: function (b, s, p) { board = b; sel = s; page = p; }, turnF: turn, pageF: pageF, liftF: lift, boardF: boardF };\n';
  run('kit-stage.js', stageText.slice(0, stageText.lastIndexOf(tail)) + probeCode + tail);
  const K = ctx.window.__kit, def = W.def;
  if (!K || !def) throw new Error('kit-stage.js ran but did not register its stage or hold the names this encoder reads. Re-read it and update scripts/lib/kit-scene.mjs.');

  /* ---- the tones: which CSS tokens the look reads, and from which box ---- */
  provenance.clear();   /* the stage read the tones once itself (from the body); this call is the only one whose boxes mean something */
  const tones = S.objects.tones(SKIN);
  const tokenBox = {}; for (const [name, v] of provenance) tokenBox[name] = v;
  K.look.paint(tones);   /* the look painted with the tones as weights on tokens */

  /* ---- the shapes, deduped by their triangles ---- */
  const geos = [], geoKey = new Map(), geoById = new Map();
  const round = (a) => a.map((v) => Math.round(v * 1e6) / 1e6).join(',');
  function geoId(g3) {
    if (geoById.has(g3)) return geoById.get(g3);
    const g = g3.geo; if (!g.nrm) g.computeNormals();
    const key = round(g.pos) + '|' + round(g.nrm) + '|' + g.idx.join(',');
    let id = geoKey.get(key);
    if (id == null) { id = geos.length; geoKey.set(key, id); geos.push({ id, pos: g.pos, nrm: g.nrm, idx: g.idx }); }
    geoById.set(g3, id); return id;
  }
  const matName = new Map(); for (const [name, m] of Object.entries(K.look.mats)) matName.set(m, name);
  const unitQuad = new G3(new Geo([-.5, .5, 0, .5, .5, 0, -.5, -.5, 0, .5, -.5, 0], [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], [0, 1, 1, 1, 0, 0, 1, 0], [0, 2, 1, 2, 3, 1]));
  const quadId = geoId(unitQuad);

  /* ---- the faces: each face's calls, by its box in the atlas ---- */
  const faceRuns = new Map(); for (const f of facesOf(atlas._g.ops)) faceRuns.set(f.rect.slice(0, 2).map((v) => Math.round(v)).join(','), f);
  const faces = [];
  function faceOf(g3) {
    const uv = g3.geo.uv, AS = atlas.width;
    /* the plane's corners: 0 (-,+) 1 (+,+) 2 (-,-) 3 (+,-); u0 is corner 0's u, u1 corner 1's, vt corner 0's v, vb corner 2's */
    const u0 = uv[0], u1 = uv[2], vt = uv[1], vb = uv[5], x = Math.round(u0 * AS), y = Math.round((1 - vt) * AS), w = Math.round((u1 - u0) * AS), h = Math.round((vt - vb) * AS);
    const run = faceRuns.get(x + ',' + y);
    if (!run) throw new Error('a face of the Kit has no recorded calls at atlas box ' + x + ',' + y + '. Re-read object-kit.js face() and paintFace() and update scripts/lib/kit-scene.mjs.');
    const id = faces.length; faces.push({ id, w: g3.plane.w, h: g3.plane.h, pw: w, ph: h, ops: run.ops }); return id;
  }

  /* ---- the objects ---- */
  const objects = [];
  for (const it of K.items) {
    const parts = [], rings = [], g = it.g;
    const ringOf = new Map(); it.rings.forEach((r, i) => ringOf.set(r.m, i));
    (function walk(node, chain) {
      for (const c of node.children) {
        const here = mul(chain, c.matrix);
        if (c.isMesh && c.geometry) {
          const mat = matName.get(c.material);
          if (!mat) throw new Error('a part of ' + it.id + ' wears a material that is not in the look (' + (c.material && c.material.kind) + '). Re-read object-kit.js and update scripts/lib/kit-scene.mjs.');
          const base = { mat, order: c.renderOrder };
          if (c.isInstancedMesh) {
            c.matrices.forEach((im) => parts.push({ ...base, geo: geoId(c.geometry), m: rows12(mul(chain, im)), ring: -1, face: -1 }));
          } else if (mat === 'face') {
            const face = faceOf(c.geometry), m = mul(chain, c.matrix);
            const e = m.e.slice(); for (let r = 0; r < 3; r++) { e[r] *= c.geometry.plane.w; e[4 + r] *= c.geometry.plane.h; }
            const sm = new M4(); sm.e.set(e);
            parts.push({ ...base, geo: quadId, m: rows12(sm), ring: -1, face });
          } else {
            const ring = ringOf.has(c) ? ringOf.get(c) : -1;
            if (ring >= 0) {
              const r = it.rings[ring], rot = c.rotation;
              rings[ring] = { parent: rows12(chain), pos: [c.position.x, c.position.y, c.position.z], rx: r.rx, ry: rot.y, rz: r.rz, s: c.scale.x };
            }
            parts.push({ ...base, geo: geoId(c.geometry), m: rows12(here), ring, face: -1 });
          }
        }
        if (c.children.length) walk(c, here);
      }
    })(g, new M4());
    objects.push({ id: it.id, cell: it.cell, page: it.page, parts, rings });
  }
  const order = objects.map((o) => o.id);

  /* ---- the materials ---- */
  const mats = {};
  for (const [name, m] of Object.entries(K.look.mats)) {
    mats[name] = { kind: m.kind, grain: m.grain ? m.grain.rough : 0, opts: m.opts, color: m.color.w, emissive: m.emissive.w };
    if (name === 'face') mats[name].channels = { ink: m.uniforms.ink.value.w, acc: m.uniforms.acc.value.w, warn: m.uniforms.warn.value.w };
  }

  /* ---- the stage: its constants, cells, camera, labels, curves and states ---- */
  const stage = { consts: { COLS: K.COLS, ROWS: K.ROWS, PER: K.PER, SP: K.SP, RISE: K.RISE, DEPTH: K.DEPTH, SC: K.SC, REST_YAW: K.REST_YAW, ELEV: K.ELEV }, O: [K.O.x, K.O.y, K.O.z] };
  const [boardF, pageF, liftF, turnF] = followers;
  if (!boardF || boardF.n !== 1 || pageF.n !== K.items.length || liftF.n !== K.items.length || turnF.n !== K.items.length) throw new Error('the stage no longer makes its four followers (board, page, lift, turn). Re-read kit-stage.js and update scripts/lib/kit-scene.mjs.');
  stage.taus = { board: boardF.tau, page: pageF.tau, lift: liftF.tau, turn: turnF.tau };
  /* the cells (cellAt), their grow windows (the arguments the stage gave grow), and the floor plates' windows */
  const cellPos = []; for (let n = 0; n < K.PER; n++) { const p = K.cellAt(n); cellPos.push([p.x, p.y, p.z]); }
  const readCall = (cb) => { growCalls.length = 0; cb(); return growCalls.slice(); };
  K.state('05', '', 0);
  boardF.forced = () => 1; pageF.forced = () => 1; liftF.forced = () => 0; turnF.forced = () => K.REST_YAW;
  const calls = readCall(() => K.pose(1, 100000, 0));
  const nItems = K.items.length, cells = [];
  /* items come first (one grow each, in item order), then the plates of the cells the page has */
  K.items.forEach((it, i) => { const c = calls[i]; cells[it.cell] = cells[it.cell] || {}; cells[it.cell].a = c.a; cells[it.cell].b = c.b; });
  const plateCalls = calls.slice(nItems);
  plateCalls.forEach((c, n) => { cells[n] = cells[n] || {}; cells[n].pa = c.a; cells[n].pb = c.b; });
  stage.cells = cellPos.map((p, n) => ({ pos: p, a: cells[n].a, b: cells[n].b, pa: cells[n].pa, pb: cells[n].pb }));

  /* the grow curve and each follower's step response, as knots (t, value): the line between knots stays within 2e-4 of the curve */
  const knots = (fn, t1, tol = 2e-4) => {
    const N = 2000, pts = []; for (let i = 0; i <= N; i++) pts.push([i / N * t1, fn(i / N * t1)]);
    const keep = [0, N];
    (function split(a, b) {
      let worst = 0, at = -1;
      for (let i = a + 1; i < b; i++) { const u = (pts[i][0] - pts[a][0]) / (pts[b][0] - pts[a][0]), v = pts[a][1] + (pts[b][1] - pts[a][1]) * u, d = Math.abs(pts[i][1] - v); if (d > worst) { worst = d; at = i; } }
      if (worst > tol) { keep.push(at); split(a, at); split(at, b); }
    })(0, N);
    return keep.sort((x, y) => x - y).filter((v, i, a) => a.indexOf(v) === i).map((i) => pts[i]);
  };
  stage.grow = knots((t) => outCubic(t), 1);
  /* a follower closes on its target by 1 - exp(-dt / tau) a frame, and snaps when within .002: its step response is 1 - exp(-t / tau) until it is within .002, then 1 */
  stage.follow = {};
  for (const [name, tau] of Object.entries(stage.taus)) { const T = tau * Math.log(1 / .002); stage.follow[name] = { ms: T, knots: knots((t) => (t >= T ? 1 : 1 - Math.exp(-t / tau)), T) }; }

  /* the pose of every item at the channel values the stage reads: scale, height, turn, the rings' tilt and size, and the floor plates */
  /* u: the weight the item grows by (the page follower's value, with the board at 1); w: the view's weight, which the floor plates grow by */
  function poseAt(u, lift, turn, i, w = 1) {
    boardF.forced = () => 1; pageF.forced = () => u; liftF.forced = () => lift; turnF.forced = () => turn;
    growCalls.length = 0; K.pose(w, 100000, 0);
    const it = K.items[i], mats = (im) => im.matrices.map((m) => ({ s: m.e[0], p: [m.e[12], m.e[13], m.e[14]] }));
    return { pos: [it.g.position.x, it.g.position.y, it.g.position.z], s: it.g.scale.x, yaw: it.g.rotation.y, visible: it.g.visible, rings: it.rings.map((r) => ({ rx: r.m.rotation.x, s: r.m.scale.x })), shown: K.plates.visible, plates: mats(K.plates), rims: mats(K.rims) };
  }
  stage.pose = { sample: poseAt, ids: K.items.map((it) => it.id) };

  /* the camera: grid, chosen object (read for every cell), as the stage's target() answers with fit() kept as its arguments */
  const cam = (sel, board) => { K.state(board || '05', sel, sel ? K.byId[sel].page : 0); const t = def.target({}, 1.6); return { aim: [t.aim.x, t.aim.y, t.aim.z], fit: t.dist.fit, elev: t.elev, yaw: t.yaw, tilt: t.tilt, n: t.n }; };
  stage.camGrid = cam('');
  stage.camSel = K.items.slice(0, K.PER).map((it) => ({ cell: it.cell, ...cam(it.id) }));
  /* the labels */
  K.state('05', K.items[0].id, 0);
  const tags = def.tags(); stage.labels = tags.map((t) => ({ id: t.id, p: [t.p.x, t.p.y, t.p.z] }));
  K.state('05', '', 0);

  /* the floor plates and rims: the shapes and the materials they wear */
  stage.plate = { geo: geoId(K.plates.geometry), mat: matName.get(K.plates.material), order: K.plates.renderOrder };
  stage.rim = { geo: geoId(K.rims.geometry), mat: matName.get(K.rims.material), order: K.rims.renderOrder };

  return { geos, mats, objects, order, faces, stage, tokens: tokenBox, K, def, growCalls, poseAt, kitStateSet: (st) => { K.state(st.board, st.sel, st.page); }, followers: { boardF, pageF, liftF, turnF } };
}
