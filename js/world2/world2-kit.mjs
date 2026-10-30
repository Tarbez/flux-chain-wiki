/* World grammar, the Kit's 3D (docs/design/world-grammar/PORT.md, 2026-10-30 "kit"): board 05 of /kit, thirty objects, nine to a page, drawn by the fxn-3d world look.
   Owner law, 2026-10-30: "THREEJS IS DEPRECATED! ALL ANIMATIONS AND WORK HAS TO BE RECREATED IN FXN3D". The objects used to be built by js/world/object-kit.js and kit-stage.js on Three.js.
   The encoder (scripts/kit-encode.mjs) ran those two files, as they are, and wrote what they built to world/kit.flx (the Kit's own grammar, kit-reader.mjs). This file draws it:
     the shapes     97 MESH blobs end to end in one file; a part is a shape, a material by name and a matrix inside its object
     materials      three draws: the mesh pass (satin glass with a clear coat, steel, graphite, the lit stone, the cubes), additive light (the lit edges, the orbit rings, the beads: the renderer's `glow`
                    part) and faces (the words and marks: a canvas painted once from the 2D calls the encoder recorded, laid on the glass as a `text` part, one for each of the ink, accent and warning channels)
     tints          a material's colour is a sum of weights on the theme's own CSS tokens (--primary, --canvas, ...), so a card skin repaints the objects: they ease to the new colours in about half a second
     the pose       js/world2/kit-pose.mjs, proved by the encoder against the stage's own pose(): grow in with the view's weight (staggered by cell), sink when another board is shown or another page,
                    lift and turn slowly when chosen, orbit rings tilting into place; the floor plate under each cell
     the host       world2-host.mjs mounts this when the camera is first to fly to /kit, injects the `kit` view's camera, asks for the chosen object's camera, steps and flushes it with its own frame, and places
                    the labels; the page (js/pages/kit.js) reads ArkWorldHost.kit (built(), screen(id), selected()) and sends select({ view: 'kit', b, p, s })
   Draw on demand: step(now) says whether anything still moves, and the host asks for another frame only then. Nothing here runs between events. No JSON, no WASM, no Three.js. */
import { decodeKit, decodeWords, TINT_SLOTS } from './kit-decode.mjs';
import { createKitPose } from './kit-pose.mjs';
import { sample } from '/fxn-3d/scripts/lib/anim-sample.mjs';
import { readMesh, meshFloats } from '/fxn-3d/engine/formats/mesh.mjs';

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const srgbOut = (v) => Math.pow(Math.max(0, Math.min(1, v)), 1 / 2.2);   /* a plate's canvas holds sRGB; the plate shader decodes it with the same 2.2 */
const path = (name) => (location.protocol === 'file:' ? '' : '/') + 'world/' + name;

/* ---------- a theme token as a linear colour (the tokens are HSL channels, "210 18% 72%") ---------- */
const toLinear = (c) => (c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4));
function hsl(h, s, l) { const a = s * Math.min(l, 1 - l), f = (n) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return [f(0), f(8), f(4)]; }
function tokenColour(box, name) {
  const v = getComputedStyle(box).getPropertyValue(name).trim();
  const m = /^(-?[\d.]+)(?:deg)?\s+([\d.]+)%\s+([\d.]+)%/.exec(v);
  if (m) return hsl(((+m[1] % 360) + 360) % 360, +m[2] / 100, +m[3] / 100).map(toLinear);
  /* any other CSS colour: what a 1 x 1 canvas makes of it */
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const g = cv.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#888'; g.fillStyle = v || '#888'; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255].map(toLinear);
}

/* ---------- 3 x 4 matrices, column-major: three columns then the place ---------- */
function mul34(A, B, out) {
  for (let c = 0; c < 4; c++) {
    const x = B[c * 3], y = B[c * 3 + 1], z = B[c * 3 + 2];
    out[c * 3] = A[0] * x + A[3] * y + A[6] * z + (c === 3 ? A[9] : 0);
    out[c * 3 + 1] = A[1] * x + A[4] * y + A[7] * z + (c === 3 ? A[10] : 0);
    out[c * 3 + 2] = A[2] * x + A[5] * y + A[8] * z + (c === 3 ? A[11] : 0);
  }
  return out;
}
/* an object's group: place, turn about +Y, uniform size (Three's position, rotation.y, scale.setScalar) */
function groupM(out, p, yaw, s) { const c = Math.cos(yaw) * s, si = Math.sin(yaw) * s; out[0] = c; out[1] = 0; out[2] = -si; out[3] = 0; out[4] = s; out[5] = 0; out[6] = si; out[7] = 0; out[8] = c; out[9] = p[0]; out[10] = p[1]; out[11] = p[2]; return out; }
/* a ring's place inside its parent: position, Euler XYZ (Three's matrix), uniform size */
function ringM(out, pos, rx, ry, rz, s) {
  const a = Math.cos(rx), b = Math.sin(rx), c = Math.cos(ry), d = Math.sin(ry), e = Math.cos(rz), f = Math.sin(rz), ae = a * e, af = a * f, be = b * e, bf = b * f;
  out[0] = c * e * s; out[1] = (af + be * d) * s; out[2] = (bf - ae * d) * s;
  out[3] = -c * f * s; out[4] = (ae - bf * d) * s; out[5] = (be + af * d) * s;
  out[6] = d * s; out[7] = -b * c * s; out[8] = a * c * s;
  out[9] = pos[0]; out[10] = pos[1]; out[11] = pos[2]; return out;
}

/* ---------- the faces: the recorded calls replayed on a canvas, as the three channels of a mask ---------- */
let markImage = null;
function markSource(url) { if (markImage || !url) return markImage; markImage = new Image(); markImage.src = url; return markImage; }
const FONT_VAR = { '@--font-mono': ['--font-mono', '"JetBrains Mono", ui-monospace, monospace'], '@--font-sans': ['--font-sans', '"Albert Sans", system-ui, sans-serif'] };
const CHANNEL = { ink: '255,0,0', acc: '0,255,0', warn: '0,0,255' };
const paintColour = (v) => { const m = /^c:(ink|acc|warn):([\d.]+)$/.exec(v); return m ? 'rgba(' + CHANNEL[m[1]] + ',' + m[2] + ')' : v; };
const CALLS = new Set(['fillRect', 'strokeRect', 'clearRect', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'arcTo', 'ellipse', 'stroke', 'fill', 'bezierCurveTo', 'rect', 'save', 'restore', 'clip', 'translate']);
const PROPS = new Set(['fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'font', 'letterSpacing', 'globalAlpha', 'textAlign', 'textBaseline', 'globalCompositeOperation']);
/* a face's calls on a canvas of its own size: red ink, green accent, blue warning, as the mask object-kit.js drew. The page's canvas is the source of the mask; the three channel images are cut from it below */
function paintMask(face, calls, markUrl) {
  const cv = document.createElement('canvas'); cv.width = face.pw; cv.height = face.ph;
  const g = cv.getContext('2d', { willReadFrequently: true });
  const body = getComputedStyle(document.body);
  let ready = true;
  for (const c of calls) {
    const name = c[0], a = c.slice(1);
    if (PROPS.has(name)) {
      let v = a[0];
      if (name === 'fillStyle' || name === 'strokeStyle') v = paintColour(v);
      else if (name === 'font') v = v.replace(/@--font-(mono|sans)/, (m) => { const f = FONT_VAR[m]; return body.getPropertyValue(f[0]).trim() || f[1]; });
      else if (name === 'globalAlpha') v = Number(v);
      if (name === 'letterSpacing' && !('letterSpacing' in g)) continue;
      g[name] = v;
    } else if (name === 'fillText') g.fillText(a[0], Number(a[1]), Number(a[2]));
    else if (name === 'setLineDash') g.setLineDash(a[0] ? a[0].split(',').map(Number) : []);
    else if (name === 'mark') {
      const img = markSource(markUrl);
      if (!img || !img.complete || !img.naturalWidth) { ready = false; continue; }
      const m = /^c:(ink|acc|warn):/.exec(a[0]), t = document.createElement('canvas'); t.width = t.height = 256;
      const tg = t.getContext('2d'); tg.drawImage(img, 0, 0, 256, 256); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = 'rgba(' + CHANNEL[m[1]] + ',1)'; tg.fillRect(0, 0, 256, 256);
      g.drawImage(t, Number(a[1]), Number(a[2]), Number(a[3]), Number(a[4]));
    } else if (CALLS.has(name)) g[name](...a.map(Number));
  }
  return { cv, g, ready };
}
/* the mask as the three channel weights of each pixel and its coverage: what object-kit.js's face shader read (weights = rgb / sum, coverage = alpha) */
function maskOf(cv) {
  const d = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height).data, n = cv.width * cv.height, w = [new Uint8Array(n), new Uint8Array(n), new Uint8Array(n)], used = [false, false, false];
  for (let i = 0; i < n; i++) {
    const a = d[i * 4 + 3]; if (!a) continue;
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2], s = r + g + b || 1;
    for (let k = 0; k < 3; k++) { const q = Math.round(a * [r, g, b][k] / s); w[k][i] = q; if (q > 2) used[k] = true; }
  }
  return { w, used, width: cv.width, height: cv.height };
}

/* ======================================================================================================================================================================== */
/* o: { R, mesh, pieces, list, wake, reduced, project, size, markUrl, order, msaa }
   R: the renderer; mesh: world2-mesh.mjs (parseMesh); pieces: the mesh pass (world2-pieces.mjs createPieces) or null; list: the host's draw list of parts; wake(ms); reduced(); project([x, y, z]) -> [x, y] in CSS pixels of the
   viewport or null; size() -> { w, h } of the canvas in CSS pixels; markUrl: the DEFXN mark's image; order(): the board's ids in board order (DefxnKitBoards); msaa(on): the host's multisampled target, which the Kit's thin lit lines need and the rest of the world does not */
export async function createKit(o) {
  const { R, mesh, pieces, list, wake } = o;
  const [flx, ...blobs] = await Promise.all([fetch(path('kit.flx'), { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error('kit.flx: ' + r.status + '. Run node scripts/kit-encode.mjs'); return r.text(); })]);
  void blobs;
  const cfg = decodeKit(flx), P = createKitPose(cfg, sample), c = cfg.c;
  const fetchBin = (b, ext) => fetch(path(b.cid + '.' + ext), { cache: 'force-cache' }).then((r) => { if (!r.ok) throw new Error(b.cid + '.' + ext + ': ' + r.status); return r.arrayBuffer(); });
  const [geoBuf, rowBuf, wordBuf] = await Promise.all([fetchBin(cfg.blobs.geo, 'bin'), fetchBin(cfg.blobs.rows, 'bin'), fetchBin(cfg.blobs.words, 'txt')]);
  const rows = new Float32Array(rowBuf), words = new Uint8Array(wordBuf);
  const nParts = c.rowsparts;

  /* ---------- the objects, in the order the stage built them; their cells and pages from the board's own order ---------- */
  const objs = cfg.objects.map((ob, i) => ({ i, id: ob.id, cell: 0, page: 0, parts: ob.parts, rings: ob.rings, pose: null }));
  const byId = {}; objs.forEach((ob) => { byId[ob.id] = ob; });
  let total = 0;
  const ids = objs.map((ob) => ob.id);
  function layout() {
    const boardOrder = o.order ? o.order() : null, order = boardOrder && boardOrder.length ? boardOrder : ids;
    objs.forEach((ob, i) => { let n = order.indexOf(ob.id); if (n < 0) n = i; ob.page = Math.floor(n / c.per); ob.cell = n % c.per; });
    total = order.length; return order;
  }
  let order = layout();

  /* ---------- the tones: the tokens a skin or the site sets, and the materials' colours from them ---------- */
  const canvasEl = () => document.getElementById('chains');
  const skinBox = () => { const cv = canvasEl(); return (cv && cv.closest && cv.closest('[data-ark-skin],[data-defxn-skin]')) || document.body; };
  const readTokens = () => { const out = {}, box = skinBox(); for (const [name, where] of Object.entries(cfg.tokens)) out[name] = tokenColour(where === 'skin' ? box : document.body, name); return out; };
  let tones = readTokens(), toneFrom = null, toneGoal = null, toneAt = 0;
  const TONE_MS = 520;
  const colourOf = (mat, slot, t) => { const sum = [0, 0, 0], list = (cfg.tint[mat] || [])[slot] || []; for (const q of list) { const tc = t[q.token] || [.5, .5, .5]; for (let k = 0; k < 3; k++) sum[k] += tc[k] * q.w; } return sum; };

  /* ---------- the shapes ---------- */
  const parsed = [], shapeNames = [];
  const parseGeo = (g) => parsed[g] || (parsed[g] = mesh.parseMesh(geoBuf.slice(cfg.geo[g].offset, cfg.geo[g].offset + cfg.geo[g].bytes)));
  const addShape = (g) => { if (!shapeNames[g]) { const f = meshFloats(readMesh(new Uint8Array(geoBuf, cfg.geo[g].offset, cfg.geo[g].bytes))); R.addShape('kit' + g, { pos: Array.from(f.pos), nrm: Array.from(f.nrm), uv: Array.from(f.uv), idx: Array.from(f.idx) }); shapeNames[g] = 'kit' + g; } return shapeNames[g]; };

  /* ---------- the groups: one draw for every placement of a (shape, material) ---------- */
  const groups = new Map();   /* key -> { draw, geo, mat, cap, n, data, piece | part, order } */
  const groupFor = (geo, mat, cap0) => {
    const key = geo + ':' + mat; let gp = groups.get(key);
    if (!gp) { const m = cfg.mats[mat]; gp = { key, draw: m.draw, geo, mat, cap: 0, n: 0, order: 0, data: null, piece: null, part: null, buf: null, o: null }; groups.set(key, gp); }
    gp.cap += cap0 || 1; return gp;
  };
  const faceGroups = [];       /* a face: its parts (one for each channel in use) and its mask */
  for (const ob of objs) for (const p of ob.parts) {
    const m = cfg.mats[p.mat];
    if (m.draw === 2) continue;
    p.group = groupFor(p.geo, p.mat); p.group.order = Math.max(p.group.order, p.order);
  }
  const sheetGroups = cfg.sheets.map((s) => { const gp = groupFor(s.geo, s.mat, c.per); gp.order = Math.max(gp.order, s.order); return gp; });
  /* a material whose emissive tint is not in proportion to its colour (the glass's warm glow, primary x .05) is drawn as light that adds over the glass, on the same shapes: a companion group */
  for (const gp of [...groups.values()]) {
    const em = (cfg.tint[gp.mat] || [])[1];
    if (gp.draw !== 0 || !em || !em.length) continue;
    const key = gp.key + ':e', comp = { key, draw: 1, geo: gp.geo, mat: gp.mat, cap: gp.cap, n: 0, order: gp.order + .5, data: null, piece: null, part: null, buf: null, o: null, of: gp };
    groups.set(key, comp); gp.comp = comp;
  }
  const opaque = (m) => m.draw === 0 && m.opacity >= 1 && !(m.flags & 2);
  /* the mesh pass in draw order: opaque pieces first, then the see-through ones by the stage's render order (glass 7, plate 8, ...) */
  const sorted = [...groups.values()].sort((a, b) => (opaque(cfg.mats[b.mat]) ? 1 : 0) - (opaque(cfg.mats[a.mat]) ? 1 : 0) || a.order - b.order);
  for (const gp of sorted) {
    const m = cfg.mats[gp.mat]; gp.data = new Float32Array(gp.cap * 16);
    if (gp.of) { gp.draw = 1; }
    if (gp.draw === 0) {
      if (!pieces) { if (window.console) console.warn('[kit] the mesh pass did not start, so the Kit draws no glass'); continue; }
      const spec = { mat: { metal: m.metal, rough: m.rough, coat: m.coat, coatRough: m.coatRough, emission: m.emission, opacity: m.opacity, grain: m.grain, geo: 1 }, faces: m.flags & 1 ? undefined : 'front' };
      gp.piece = pieces.addMesh('kit:' + gp.key, parseGeo(gp.geo), spec, gp.data); gp.o = gp.piece.o.mat;
    } else if (gp.draw === 1) {
      gp.buf = R.buffer(gp.data);
      gp.part = { part: 'kit:' + gp.key, like: 'glow', shape: addShape(gp.geo), buffer: gp.buf, offset: 0, count: 0, direct: true, front: true, glow: [1, 0, 1], tint: [1, 1, 1, 1], noShadow: true, cpu: gp.data.buffer };   /* the Kit's lit edges are meant at their own strength: tint names it (world.mjs glow draw) */
    }
  }

  /* ---------- the faces ---------- */
  const faceOf = []; objs.forEach((ob) => ob.parts.forEach((p) => { if (p.face >= 0) { (faceOf[p.face] = faceOf[p.face] || { id: p.face, users: [] }).users.push({ ob, p }); } }));
  const faces = faceOf.map((f, i) => ({ id: i, def: cfg.faces[i], calls: decodeWords(words, cfg.faces[i]), users: f.users, parts: [null, null, null], mask: null, tex: [null, null, null], n: 0, data: new Float32Array(3 * f.users.length * 16), bufs: [null, null, null] }));
  const themeKey = { n: 0 };
  const FACE_MAT = Object.keys(cfg.mats).filter((m) => cfg.mats[m].draw === 2)[0];
  /* a face's channel image in the tone: the channel's colour at its gain (an alpha above 1 on a text plate is a gain on the colour) */
  function faceTone(t) { return [colourOf(FACE_MAT, 2, t), colourOf(FACE_MAT, 3, t), colourOf(FACE_MAT, 4, t)]; }
  function paintFaces(t, only) {
    themeKey.n++;
    const ch = faceTone(t);
    for (const f of faces) {
      if (only && !only(f)) continue;
      if (!f.mask) { const m = paintMask(f.def, f.calls, o.markUrl); f.markPending = !m.ready; f.mask = maskOf(m.cv); }
      for (let k = 0; k < 3; k++) {
        if (!f.mask.used[k]) continue;
        const col = ch[k], gain = Math.max(1, col[0], col[1], col[2]), W = f.mask.width, H = f.mask.height;
        const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), img = g.createImageData(W, H), d = img.data;
        const rgb = [srgbOut(col[0] / gain) * 255, srgbOut(col[1] / gain) * 255, srgbOut(col[2] / gain) * 255], wk = f.mask.w[k];
        for (let i = 0; i < W * H; i++) { const a = wk[i]; if (a) { d[i * 4] = rgb[0]; d[i * 4 + 1] = rgb[1]; d[i * 4 + 2] = rgb[2]; d[i * 4 + 3] = a; } }
        g.putImageData(img, 0, 0);
        if (f.tex[k]) R.dropTexture(f.tex[k]);
        f.tex[k] = 'kit:face:' + f.id + ':' + k + ':' + themeKey.n; R.setTexture(f.tex[k], cv);
        f.gain = f.gain || []; f.gain[k] = gain;
        if (!f.parts[k]) { f.bufs[k] = R.buffer(new Float32Array(f.users.length * 16)); f.parts[k] = { part: 'kit:face:' + f.id + ':' + k, like: 'text', buffer: f.bufs[k], offset: 0, count: 0, direct: true, noShadow: true, tex: f.tex[k], cpu: new Float32Array(f.users.length * 16).buffer }; }
        else f.parts[k].tex = f.tex[k];
      }
    }
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { faces.forEach((f) => { f.mask = null; }); paintFaces(tones); dirty = true; wake(60); });
  if (o.markUrl) { const img = markSource(o.markUrl); if (img && !img.complete) img.addEventListener('load', () => { faces.forEach((f) => { if (f.markPending) f.mask = null; }); paintFaces(tones); dirty = true; wake(60); }); }

  /* ---------- the materials' colours ---------- */
  function paintMaterials(t) {
    for (const gp of groups.values()) {
      if (gp.of) { const e = colourOf(gp.mat, 1, t), a = cfg.mats[gp.mat].opacity; gp.tint = [e[0] * a, e[1] * a, e[2] * a]; continue; }
      const col = colourOf(gp.mat, 0, t);
      if (gp.draw === 0 && gp.o) { gp.o.rgb = col; }
      gp.tint = col;
    }
  }
  paintMaterials(tones); paintFaces(tones);

  /* ---------- the state: the page's board, page and chosen object, and the channels that follow it ---------- */
  let st = { board: '05', sel: '', page: 0 }, applied = false;   /* the stage starts on board 05, but its channels take their first target from the first state it is given */
  const chan = (name, v) => ({ name, v, from: v, to: v, t: 0, moving: false });
  const board = chan('board', 0), weight = { v: 0, from: 0, to: 0, at: 0, dur: 0, inA: .3, inB: 1, outA: 0, outB: .55, moving: false };
  const page = objs.map(() => chan('page', 0)), lift = objs.map(() => chan('lift', 0)), turn = objs.map(() => chan('turn', c.restyaw));
  function toward(ch, to, now) {
    if (ch.to === to) return;
    if (o.reduced()) { ch.v = ch.from = ch.to = to; ch.moving = false; return; }
    ch.from = ch.v; ch.to = to; ch.t = 0; ch.moving = true;
  }
  const advance = (ch, dt) => {
    if (!ch.moving) return false;
    ch.v = P.follow(ch.name, ch.v, ch.to, dt);
    if (ch.v === ch.to) { ch.moving = false; return false; }
    return true;
  };
  function targets(now) {
    toward(board, P.wants(st, '', -1).board, now);
    objs.forEach((ob, i) => { const w = P.wants(st, ob.id, ob.page); toward(page[i], w.page, now); toward(lift[i], w.lift, now); toward(turn[i], w.turn, now); });
  }
  /* the page's state: set({ b, p, s }) as kit-stage.js reads it (kit-pose.mjs state) */
  function set(s) {
    order = layout();
    const next = P.state(s, st, ids, order);
    if (applied && next.board === st.board && next.sel === st.sel && next.page === st.page) return false;
    applied = true; st = next; targets(performance.now()); dirty = true; wake(60);
    return true;
  }
  /* the view's weight: it rises over .3 to 1 of the flight that brings the camera here and falls over 0 to .55 of the one that takes it away (chains-scene.js morph) */
  function view(on, now, dur) {
    const to = on ? 1 : 0;
    if (weight.to === to && (weight.moving || weight.v === to)) return;
    weight.from = weight.v; weight.to = to; weight.at = now; weight.dur = dur || 0;
    if (!(dur > 0) || o.reduced()) { weight.v = to; weight.moving = false; } else weight.moving = true;
    dirty = true; wake(60);
  }
  const inOutCubic = (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);   /* the kernel's in-out, the sampler's curve 5 (ring-kit.js k.ease.inOut) */

  /* ---------- a frame ---------- */
  let last = 0, dirty = true, shown = false, vis = 0, toneAtFace = 0, multisampled = false;
  const G = new Float32Array(12), RL = new Float32Array(12), RM = new Float32Array(12), W = new Float32Array(12);
  function step(now) {
    const dt = last ? Math.min(64, now - last) : 16; last = now;
    let moving = false;
    if (weight.moving) {
      const u = clamp01((now - weight.at) / weight.dur), e = inOutCubic(clamp01(weight.to > weight.from ? (u - weight.inA) / (weight.inB - weight.inA) : (u - weight.outA) / (weight.outB - weight.outA)));
      weight.v = weight.from + (weight.to - weight.from) * e; if (u >= 1) { weight.v = weight.to; weight.moving = false; } else moving = true;
    }
    if (advance(board, dt)) moving = true;
    vis = weight.v * board.v;
    if (vis > c.minvis) { for (let i = 0; i < objs.length; i++) { if (advance(page[i], dt)) moving = true; if (advance(lift[i], dt)) moving = true; if (advance(turn[i], dt)) moving = true; } }
    if (toneGoal) {
      const u = vis > .001 ? clamp01((now - toneAt) / TONE_MS) : 1, e = inOutCubic(u), t = {};
      for (const k of Object.keys(toneGoal)) t[k] = toneFrom[k].map((v, q) => v + (toneGoal[k][q] - v) * e);
      paintMaterials(t); dirty = true;
      if (now - toneAtFace > 90 || u >= 1) { paintFaces(t, (f) => f.shownNow); toneAtFace = now; }
      if (u >= 1) { tones = toneGoal; toneGoal = null; paintFaces(tones); } else moving = true;
    }
    if (moving) dirty = true;
    const was = shown; shown = P.shown(vis);
    if (was !== shown) dirty = true;
    return moving;
  }

  /* the rows of every visible object, laid into the groups; the draw list holds the parts only while something shows */
  function flush() {
    if (!dirty) return;
    dirty = false;
    for (const gp of groups.values()) gp.n = 0;
    for (const f of faces) { f.n = 0; f.shownNow = false; }
    const onPage = P.cellsOnPage(total, st.page), cellsShown = [];
    if (shown) {
      objs.forEach((ob, i) => {
        const u = vis * page[i].v, pose = P.item(ob.cell, u, lift[i].v, turn[i].v);
        ob.pose = pose;
        if (!pose.visible) return;
        groupM(G, pose.pos, pose.yaw, pose.s);
        for (const p of ob.parts) {
          let M = rows.subarray(p.row * 12, p.row * 12 + 12);
          if (p.ring >= 0) { const q = nParts * 12 + ob.rings[p.ring].row * 20; const r = rows.subarray(q, q + 20); ringM(RL, [r[12], r[13], r[14]], r[15] + pose.ringTilt, r[16], r[17], r[18] * pose.ringScale); M = mul34(r.subarray(0, 12), RL, RM); }
          mul34(G, M, W);
          const m = cfg.mats[p.mat];
          if (m.draw === 2) {
            const f = faces[p.face]; f.shownNow = true;
            const k = f.n++, d = f.data;
            for (let ch = 0; ch < 3; ch++) { if (!f.parts[ch]) continue; const o2 = (ch * f.users.length + k) * 16; d[o2] = W[0]; d[o2 + 1] = W[1]; d[o2 + 2] = W[2]; d[o2 + 3] = W[6]; d[o2 + 4] = W[7]; d[o2 + 5] = W[8]; d[o2 + 6] = -W[3]; d[o2 + 7] = -W[4]; d[o2 + 8] = -W[5]; d[o2 + 9] = W[9]; d[o2 + 10] = W[10]; d[o2 + 11] = W[11]; d[o2 + 12] = d[o2 + 13] = d[o2 + 14] = 1; d[o2 + 15] = f.gain ? f.gain[ch] : 1; }
            continue;
          }
          const gp = p.group, d = gp.data, o2 = gp.n++ * 16;
          for (let q = 0; q < 12; q++) d[o2 + q] = W[q];
          if (gp.draw === 1) { d[o2 + 12] = gp.tint[0]; d[o2 + 13] = gp.tint[1]; d[o2 + 14] = gp.tint[2]; d[o2 + 15] = 1; } else { d[o2 + 12] = d[o2 + 13] = d[o2 + 14] = d[o2 + 15] = 1; }
        }
      });
      for (let n = 0; n < c.per; n++) {
        const pl = P.plate(n, vis, n < onPage); if (!pl) continue;
        for (const [which, at] of [[0, pl.plate], [1, pl.rim]]) {
          const sh = cfg.sheets[which], gp = sheetGroups[which], d = gp.data, o2 = gp.n++ * 16, s = pl.s;
          d.fill(0, o2, o2 + 16); d[o2] = d[o2 + 4] = d[o2 + 8] = s; d[o2 + 9] = at[0]; d[o2 + 10] = at[1]; d[o2 + 11] = at[2];
          if (gp.draw === 1) { d[o2 + 12] = gp.tint[0]; d[o2 + 13] = gp.tint[1]; d[o2 + 14] = gp.tint[2]; d[o2 + 15] = 1; } else { d[o2 + 12] = d[o2 + 13] = d[o2 + 14] = d[o2 + 15] = 1; }
          void sh; cellsShown.push(n);
        }
      }
    }
    for (const gp of groups.values()) if (gp.of) {   /* a companion lays its parent's rows, in the emissive colour */
      const src = gp.of, d = gp.data, sd = src.data; gp.n = src.n;
      for (let i = 0; i < src.n; i++) { const o2 = i * 16; for (let q = 0; q < 12; q++) d[o2 + q] = sd[o2 + q]; d[o2 + 12] = gp.tint[0]; d[o2 + 13] = gp.tint[1]; d[o2 + 14] = gp.tint[2]; d[o2 + 15] = 1; }
    }
    let any = false;
    for (const gp of groups.values()) {
      if (gp.piece) { pieces.write(gp.piece, gp.data, gp.n); if (gp.n) any = true; }
      else if (gp.part) { gp.part.count = gp.n; gp.part.c = null; if (gp.n) { R.updateBuffer(gp.buf, gp.data, 0); any = true; } }
    }
    for (const f of faces) for (let ch = 0; ch < 3; ch++) {
      const part = f.parts[ch]; if (!part) continue;
      part.count = f.n; part.c = null;
      if (f.n) { R.updateBuffer(f.bufs[ch], f.data.subarray(ch * f.users.length * 16, (ch + 1) * f.users.length * 16), 0); any = true; }
    }
    /* the draw list holds the Kit's parts only while something shows (a settled Kit on another board costs no draw call) */
    const mine = []; for (const gp of groups.values()) if (gp.part) mine.push(gp.part); for (const f of faces) for (const p of f.parts) if (p) mine.push(p);
    for (const p of mine) { const at = list.indexOf(p); if (any && at < 0) list.push(p); else if (!any && at >= 0) list.splice(at, 1); }
    if (any !== multisampled) { multisampled = any; if (o.msaa) o.msaa(any); }   /* the Kit's 0.6 px lines break up without multisampling; the rest of the world does not pay for it */
  }

  /* ---------- skins: the objects follow the nearest skin wrapper, easing ---------- */
  function retone() {
    const now = readTokens();
    if (!toneGoal && Object.keys(now).every((k) => now[k].every((v, q) => Math.abs(v - tones[k][q]) < 1e-4))) return;   /* the host repaints on every class or style change: nothing to ease when no token moved */
    toneFrom = toneGoal ? Object.fromEntries(Object.entries(tones).map(([k, v]) => [k, v])) : tones; toneGoal = now; toneAt = performance.now();
    if (o.reduced() || !shown) { tones = toneGoal; toneGoal = null; paintMaterials(tones); paintFaces(tones); dirty = true; wake(60); return; }
    wake(TONE_MS + 80);
  }
  const onSkin = () => requestAnimationFrame(retone);
  document.addEventListener('ark:skin', onSkin); document.addEventListener('defxn:skin', onSkin);

  /* ---------- labels and the page's reads ---------- */
  const spotOf = (ob) => { const p = o.project(P.label(ob.cell)); return p ? { x: p[0], y: p[1] } : null; };
  function screen(id) {
    const ob = byId[id], out = { x: -999, y: -999, visible: false };
    if (!ob) return out;
    const p = spotOf(ob), sz = o.size(); if (!p) return out;
    out.x = p.x; out.y = p.y;
    out.visible = shown && vis > .9 && ob.page === st.page && st.sel === id && p.x >= 0 && p.y >= 0 && p.x <= sz.w && p.y <= sz.h;
    return out;
  }
  /* the labels the host places: every object has one, shown for the chosen object alone (the list names the rest) */
  const spots = () => objs.map((ob) => { const p = spotOf(ob); return { id: ob.id, x: p ? p[0] : -999, y: p ? p[1] : -999, on: st.board === '05' && ob.page === st.page && !!st.sel && st.sel === ob.id && !!p }; });

  /* ---------- the camera ---------- */
  const cellOf = (id) => byId[id].cell;
  const camera = () => P.camera(st, cellOf);
  const gridView = () => { const g = cfg.views.grid; return { aim: [g.x, g.y, g.z], elev: g.elev, yaw: g.yaw, tilt: g.tilt, back: g.back, fit: { w: g.fitW, h: g.fitH, fill: g.fill } }; };
  /* the chosen object's camera over the grid's record the host built the target from; fit(w, h, aspect, fill) is the host's */
  function aim(t, asp, fit) {
    const k = camera(); if (!k) return t;
    t.aim = k.aim.slice(); t.elev = k.elev; t.yaw = k.yaw; t.tilt = k.tilt; t.n = k.back; t.dist = fit(k.fitW, k.fitH, asp, k.fill);
    return t;
  }

  const api = { built: () => order.filter((id) => !!byId[id]), screen, selected: () => st.sel };
  dirty = true;
  set({ b: '05', s: '', p: 0 });
  return { api, set, step, flush, view, aim, spots, gridView, on: () => st.board === '05', state: () => ({ board: st.board, sel: st.sel, page: st.page }), repaint: retone, stats: () => ({ groups: groups.size, faces: faces.length, vis, shown, shapes: parsed.filter(Boolean).length }), debug: { groups, faces, cfg, objs } };
}
