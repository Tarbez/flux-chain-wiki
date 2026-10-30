/* World grammar, the home helix (docs/design/world-grammar/PORT.md, 2026-10-30 lane B).
   Owner law, 2026-10-30: "THREEJS IS DEPRECATED! ALL ANIMATIONS AND WORK HAS TO BE RECREATED IN FXN3D". js/world/home-helix.js drew this with Three.js; it is drawn here with the engine's own parts.

   What it is: 36 blocks of smoky glass on a coil of two and a half turns that narrows into the lit person block, a proof line up the axis (amber at the foot, teal where it meets the
   person block, its head brightest while it rises), a plate the colour of the card's glass behind it, the person glyph on the block's face. It draws in the box the identity card leaves
   for it (.idcard [data-helix], or a [data-helix] inside the site home's [data-world-home] page) and is scaled to fit that box at any size and any turn.
   Motion, as the file has it, and nothing loops: on a first visit the blocks build bottom to top over the story's step 4 (about 900 ms, the line rising with them, then the person block lights);
   a return visit, or reduced motion, stands it built at once; as home leaves, the blocks wind down top to bottom with the flight (the stage's home weight), and build up again as it comes back;
   the pointer entering the box turns it one eased half-turn, then it stops; a click opens the identity chain's ring page.
   Where the numbers come from: every number the file states (the form, the build's timing, the radii, the half-turn's length, the person glyph, the bevel) is a line of the `helix` group's
   words, lifted from the file's text by scripts/lib/world-helix-scene.mjs. The colour coefficients (the pale rim, the back pass, the lit glass, the line's head) are restated here
   and the encoder refuses to run if the file's text for any of them changes. Nothing here schedules a frame: step() says whether anything still moves.
   How it is drawn: as an INSET of the engine's world look (engine/render/world.mjs drawInset): its own camera, a viewport laid exactly on the box, a scissor on the part of the box the card's
   wipe has uncovered (as the Three.js file cut itself with four clip planes) and a fill of the card's glass colour (the file's plate). The helix is in its own units, a coil standing in front
   of a camera that looks straight at it; the form is tilted by TILT so the camera looks down on it, as the file's frame does. No plate part, no frame blob, no second canvas. */
import { prism } from '/fxn-3d/js/render/world2-shapes.mjs';
import { projection, view as viewMatrix, eyeOf } from '/fxn-3d/js/render/world2-math.mjs';
import { TONE } from '/fxn-3d/js/render/world2-look.mjs';

const TAU = Math.PI * 2, PI = Math.PI, clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
/* the kernel's eases (ring-kit.js k.ease) */
const ease = { out: (x) => 1 - Math.pow(1 - x, 3), inOut: (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2), back: (x) => 1 + 2.4 * Math.pow(x - 1, 3) + 1.4 * Math.pow(x - 1, 2) };
const grow = (u) => { u = clamp01(u); return u <= 0 ? 1e-4 : u < 1 ? ease.out(u) : 1; };

/* ---------- 4x4 matrices, column-major, in doubles ---------- */
const I4 = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mul(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; }
const T4 = (x, y, z) => { const m = I4(); m[12] = x; m[13] = y; m[14] = z; return m; };
const S4 = (x, y, z) => { const m = I4(); m[0] = x; m[5] = y; m[10] = z; return m; };
const RX = (a) => { const c = Math.cos(a), s = Math.sin(a), m = I4(); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; };
const RY = (a) => { const c = Math.cos(a), s = Math.sin(a), m = I4(); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; };
const RZ = (a) => { const c = Math.cos(a), s = Math.sin(a), m = I4(); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; };
const at = (p, m) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
/* the file's local(): the frame F, then a translation, a turn (Euler XYZ) and a size */
const local = (F, x, y, z, rx, ry, rz, sx, sy, sz) => mul(F, mul(T4(x, y, z), mul(mul(RX(rx || 0), mul(RY(ry || 0), RZ(rz || 0))), S4(Math.max(1e-4, sx), Math.max(1e-4, sy == null ? sx : sy), Math.max(1e-4, sz == null ? sx : sz)))));
const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export function createHelix(o) {
  const { world, R, lines, palette, wake, reduced } = o;
  const N = {}, glyph = [];
  for (const c of lines) { if (c[0] === 'num') N[c[1]] = Number(c[2]); else if (c[0] === 'glyph') glyph[Number(c[1])] = c.slice(2).map(Number); }
  for (const k of ['nb', 'turns', 'bw', 'bh', 'bd', 'pitch', 'ps', 'tilt', 'ptk', 'taper', 'back', 'stepms', 'pop', 'person0', 'person1', 'lit0', 'lit1', 'buildend', 'glyphscale', 'liner', 'glowr', 'margin', 'dist', 'spinms', 'plate', 'bevel']) {
    if (N[k] == null) throw new Error('helix: the group has no number ' + k + ', so the helix cannot be drawn. Run the world encoder again.');
  }
  const NB = N.nb, BW = N.bw, BH = N.bh, BD = N.bd, RISE = N.turns * N.pitch, PS = N.ps, TILT = N.tilt, PT = TILT * N.ptk, BACK = N.back, D = N.dist;
  const TOP = RISE + .28 + .5 * Math.sin(TILT), LINE0 = -BH * .5, LINE1 = TOP - PS * .5;
  /* each block: its angle, height, radius and climb (home-helix.js B[]) */
  const B = [];
  for (let i = 0; i < NB; i++) {
    const u = i / (NB - 1), tp = u < N.taper ? 0 : (u - N.taper) / (1 - N.taper), taper = tp * tp * (3 - 2 * tp);
    B.push({ a: (1 - u) * N.turns * TAU, y: u * RISE, r: 1 - (1 - (PS + BD) / 2 - .02) * taper });
  }
  const SLOPE = Math.atan(RISE / (NB - 1) / (N.turns * TAU / (NB - 1)));
  const RXT = RX(TILT);
  const blockFrame = (F, bk, drop) => local(F, Math.cos(bk.a) * bk.r, bk.y + (drop || 0), Math.sin(bk.a) * bk.r, 0, PI / 2 - bk.a, SLOPE, 1, 1, 1);
  const personFrame = (F) => local(F, 0, TOP, 0, -PT, 0, 0, 1, 1, 1);
  const yAt = (f) => { if (f < 0) return LINE0 + (B[0].y - LINE0) * (f + 1); const a = Math.min(NB - 1, Math.floor(f)), b = Math.min(NB - 1, a + 1); return B[a].y + (B[b].y - B[a].y) * (f - a); };
  /* how big the form is seen from the front at any turn: every corner of every block and of the person block, at 24 turns, through the tilt */
  const BOUND = (() => {
    const b = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 };
    const corners = (F, sx, sy, sz) => { for (let c = 0; c < 8; c++) { const p = at([(c & 1 ? .5 : -.5) * sx, (c & 2 ? .5 : -.5) * sy, (c & 4 ? .5 : -.5) * sz], F); b.x0 = Math.min(b.x0, p[0]); b.x1 = Math.max(b.x1, p[0]); b.y0 = Math.min(b.y0, p[1]); b.y1 = Math.max(b.y1, p[1]); } };
    for (let s = 0; s < 24; s++) { const Rm = mul(RXT, RY(s / 24 * TAU)); B.forEach((bk) => corners(blockFrame(Rm, bk, 0), BW, BH, BD)); corners(personFrame(Rm), PS, PS, PS); }
    return b;
  })();

  /* ---------- the parts of the inset's own draw list ---------- */
  const CYL = 'idcyl8';
  try { R.addShape(CYL, prism(Array.from({ length: 8 }, (_, i) => [Math.sin(i * TAU / 8), Math.cos(i * TAU / 8)]))); } catch (e) { /* the sites file made it already */ }
  const NL = 14;   /* the proof line is NL straight pieces: each has its own colour, so the amber-to-teal gradient and the bright head are rows */
  const defs = [
    { name: 'hxblocks', n: NB, shape: 'round', pass: 'blend' }, { name: 'hxperson', n: 1, shape: 'round', pass: 'blend' },
    { name: 'hxin', n: NB, like: 'glow', shape: 'cube' }, { name: 'hxedge', n: (NB + 1) * 12, like: 'glow', shape: 'cube' }, { name: 'hxglyph', n: glyph.length * 2, like: 'glow', shape: 'cube' },
    { name: 'hxline', n: NL * 2, like: 'glow', shape: CYL }, { name: 'hxpin', n: 1, like: 'glow', shape: 'cube' }
  ];
  const P = {}, parts = [];
  for (const d of defs) {
    const rows = new Float32Array(d.n * 16), buf = R.buffer(rows);
    P[d.name] = { rows, n: d.n, buf, part: { part: d.name, like: d.like || 'solid', shape: d.shape, pass: d.pass, buffer: buf, offset: 0, count: 0, direct: true, glow: d.like ? [1, 0, 1] : undefined, noShadow: true, cpu: rows.buffer } };
    parts.push(P[d.name].part);
  }
  const glass = P.hxblocks, glassP = P.hxperson;
  const list = R.makeList('helix-none', new ArrayBuffer(64), parts);

  /* ---------- state: the build, the wind-down, the half-turn ---------- */
  const story = world.knobs.story || {}, STEP4 = story.step4 == null ? 0 : story.step4;
  let mode = 'wait', t0 = 0, homeFirst = false, waitAt = 0, heardReturn = false;
  const spin = { from: 0, to: 0, t0: 0, dur: 1 };
  const spinGet = (now) => spin.from + (spin.to - spin.from) * ease.inOut(clamp01((now - spin.t0) / spin.dur));
  function settle() { mode = 'done'; }
  function build(now) { mode = 'build'; t0 = now; }
  let box = null, lastKey = '', until = 0;

  /* the box and what of it is uncovered: the card wipes in by clip-path insets, which are read up the ancestors */
  function len(str, ref, z) { let sum = 0, sign = 1; str.replace(/calc|\(|\)/g, ' ').trim().split(/\s+/).forEach((tok) => { if (tok === '+') { sign = 1; return; } if (tok === '-') { sign = -1; return; } const n = parseFloat(tok); if (isNaN(n)) return; sum += sign * (tok.slice(-1) === '%' ? n / 100 * ref : n * z); sign = 1; }); return sum; }
  function insets(cp, w, h, z) {
    const body = cp.slice(6, cp.lastIndexOf(')')).split(' round ')[0], parts = []; let depth = 0, cur = '';
    for (let i = 0; i < body.length; i++) { const ch = body[i]; if (ch === '(') depth++; else if (ch === ')') depth--; if (ch === ' ' && depth === 0) { if (cur) parts.push(cur); cur = ''; } else cur += ch; }
    if (cur) parts.push(cur);
    const t = parts[0] || '0', r = parts[1] || t, b = parts[2] || t, l = parts[3] || r;
    return [len(t, h, z), len(r, w, z), len(b, h, z), len(l, w, z)];
  }
  function uncovered(r) {
    let l = r.left, t = r.top, rt = r.right, b = r.bottom;
    const z = window.DEFXNKitUI && window.DEFXNKitUI.scale ? window.DEFXNKitUI.scale() : 1;
    for (let el = box.parentElement; el && el !== document.documentElement; el = el.parentElement) {
      const cp = getComputedStyle(el).clipPath; if (!cp || cp.indexOf('inset(') !== 0) continue;
      const er = el.getBoundingClientRect(), q = insets(cp, er.width, er.height, z);
      l = Math.max(l, er.left + q[3]); rt = Math.min(rt, er.right - q[1]); t = Math.max(t, er.top + q[0]); b = Math.min(b, er.bottom - q[2]);
    }
    return { l, t, r: rt, b, w: rt - l, h: b - t };
  }

  /* ---------- a frame ---------- */
  const pal = () => palette(), tone = (i) => { const p = pal(); return [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]]; };
  const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], mulc = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const WHITE = [1, 1, 1];
  /* a row of 16 floats: the frame's three axes and place, a linear colour, an alpha (a light's gain) */
  function put(rows, j, m, c, a) { const o = j * 16; rows[o] = m[0]; rows[o + 1] = m[1]; rows[o + 2] = m[2]; rows[o + 3] = m[4]; rows[o + 4] = m[5]; rows[o + 5] = m[6]; rows[o + 6] = m[8]; rows[o + 7] = m[9]; rows[o + 8] = m[10]; rows[o + 9] = m[12]; rows[o + 10] = m[13]; rows[o + 11] = m[14]; rows[o + 12] = c[0]; rows[o + 13] = c[1]; rows[o + 14] = c[2]; rows[o + 15] = a; }
  const none = (rows, j) => { const o = j * 16; for (let k = 0; k < 16; k++) rows[o + k] = 0; rows[o] = rows[o + 4] = rows[o + 8] = 1e-4; };
  const EDGES = []; [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach((ax) => [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach((q) => EDGES.push({ ax, q })));
  /* the twelve edges of a block of size sx, sy, sz in frame F (home-helix.js edges()); eye: where the camera is, in the same units */
  function edges(rows, base, F, sx, sy, sz, t, amt, c, far, eye) {
    const r = .1 * Math.min(sx, sy, sz), hx = sx / 2 - r * .3, hy = sy / 2 - r * .3, hz = sz / 2 - r * .3, dc = dist3(at([0, 0, 0], F), eye);
    for (let e = 0; e < 12; e++) {
      const d = EDGES[e], j = base + e;
      if (!(amt > .01)) { none(rows, j); continue; }
      let x, y, z, lx, ly, lz;
      if (d.ax[0]) { x = 0; y = d.q[0] * hy; z = d.q[1] * hz; lx = (sx - r * 1.2) * amt; ly = t; lz = t; }
      else if (d.ax[1]) { x = d.q[0] * hx; y = 0; z = d.q[1] * hz; lx = t; ly = (sy - r * 1.2) * amt; lz = t; }
      else { x = d.q[0] * hx; y = d.q[1] * hy; z = 0; lx = t; ly = t; lz = (sz - r * 1.2) * amt; }
      put(rows, j, local(F, x, y, z, 0, 0, 0, lx, ly, lz), dist3(at([x, y, z], F), eye) > dc ? mulc(c, far) : c, 1);
    }
  }
  const inset = { rect: { x: 0, y: 0, w: 1, h: 1 }, frame: null, clip: { x: 0, y: 0, w: 1, h: 1 }, cam: { aim: [0, 0, 0], dist: 1, elev: 0, yaw: 0 }, fogDist: 1, fill: [0, 0, 0, 0], list };
  const TANH = Math.tan(o.fov / 2 * PI / 180);
  /* One step. ctx: { box(), layerBox(), scale (device pixels per CSS pixel), canvasH, homeW(), clock(), building(), atHome(), cardOn() }.
     Returns { moving, inset }: whether anything still moves, and the inset to draw (null when nothing is drawn). */
  function step(now, ctx) {
    box = ctx.box();
    let moving = false;
    const hw = ctx.homeW();
    if (!box || !ctx.cardOn()) return finish(null, false);
    const r = box.getBoundingClientRect(), lb = ctx.layerBox();
    if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > innerHeight) return finish(null, false);
    const vis = uncovered(r);
    if (vis.w < 1 || vis.h < 1) return finish(null, false);   /* wiped away with the card */
    /* story: a return visit stands built at once; a first visit builds when the storyboard's step 4 comes (the home clock reaches it) */
    if (!homeFirst && ctx.atHome()) { homeFirst = true; waitAt = now; if (!ctx.building() || reduced()) settle(); }
    if (mode === 'wait' && ctx.atHome() && homeFirst && (ctx.clock() >= STEP4 || now - waitAt > 4500 + STEP4)) { if (reduced() || !ctx.building()) settle(); else build(now); }
    if (mode === 'wait') { if (ctx.building()) moving = true; else settle(); }
    const key = [r.left, r.top, r.width, r.height, vis.l, vis.t, vis.r, vis.b, hw].map((x) => x.toFixed(2)).join();
    if (key !== lastKey) { lastKey = key; until = now + 60; }
    if (now < until) moving = true;
    const t = mode === 'build' ? now - t0 : mode === 'done' ? 1e9 : -1;
    if (mode === 'build') { if (t > N.buildend) settle(); else moving = true; }
    const turn = spinGet(now); if (clamp01((now - spin.t0) / spin.dur) < 1) moving = true;
    if (hw > 0 && hw < 1) moving = true;

    /* the camera: straight at the coil, aimed at the middle of its bound, far enough that the bound fits the box less the margin (home-helix.js frameFor) */
    const asp = r.width / r.height, bw = BOUND.x1 - BOUND.x0, bh = BOUND.y1 - BOUND.y0;
    const k = ctx.scale, FH = ctx.canvasH, FW = ctx.canvasW;   /* the page camera's frame, in device pixels: the helix keeps its perspective (Three.js drew it in the world at the same size) */
    const pxScale = Math.min(r.width * k * (1 - N.margin) / bw, r.height * k * (1 - N.margin) / bh), dist = FH / (2 * TANH * pxScale);
    const cam = inset.cam; cam.aim[0] = (BOUND.x0 + BOUND.x1) / 2; cam.aim[1] = (BOUND.y0 + BOUND.y1) / 2; cam.aim[2] = 0; cam.dist = dist;
    const eye = [cam.aim[0], cam.aim[1], dist];
    const devRect = (l, tp, w, h) => ({ x: Math.round(l * k), y: Math.round(ctx.canvasH - (tp + h) * k), w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) });
    inset.rect = devRect(r.left - lb.left, r.top - lb.top, r.width, r.height);
    inset.clip = devRect(Math.max(r.left, vis.l) - lb.left, Math.max(r.top, vis.t) - lb.top, Math.min(r.right, vis.r) - Math.max(r.left, vis.l), Math.min(r.bottom, vis.b) - Math.max(r.top, vis.t));
    inset.fogDist = dist;
    inset.frame = { x: -(FW - inset.rect.w) / 2, y: -(FH - inset.rect.h) / 2, w: FW, h: FH };
    const plate = tone(TONE.canvas); inset.fill = [plate[0] * N.plate, plate[1] * N.plate, plate[2] * N.plate, N.plate];
    const SPIN = mul(RXT, RY(turn));

    /* colours */
    const ember = tone(TONE.ember), teal = tone(TONE.signal), glassC = mixc(tone(TONE.canvas), tone(TONE.muted), .15), tealGlass = mixc(tone(TONE.canvas), tone(TONE.signal), .1);
    const front = hw * (NB + 4) - 1;   /* leaving: the top goes first; arriving: the foot comes first */
    let reach = -1;
    for (let i = 0; i < NB; i++) {
      const bk = B[i], gb = t < 0 ? 0 : clamp01((t - i * N.stepms) / N.pop), gl = clamp01((front - i) / 3), g = grow(gb) * grow(gl);
      if (gb > 0 && gl > 0) reach = Math.max(reach, i - 1 + Math.min(gb, gl));
      const F = blockFrame(SPIN, bk, (1 - ease.out(gb)) * .35);
      const z = -Math.cos(bk.a) * Math.sin(turn) + Math.sin(bk.a) * Math.cos(turn), depth = .5 + .5 * z, upk = .75 + .25 * (i / (NB - 1)), dim = BACK + (1 - BACK) * depth;
      put(glass.rows, i, local(F, 0, 0, 0, 0, 0, 0, g * BW, g * BH, g * BD), mulc(glassC, dim), .62);
      put(P.hxin.rows, i, local(F, 0, 0, 0, 0, 0, 0, g * .96 * BW, g * .96 * BH, g * .96 * BD), mulc(ember, .1 * dim * upk), 1);
      edges(P.hxedge.rows, i * 12, F, BW * g, BH * g, BD * g, .016, g, mulc(mixc(ember, WHITE, .22), .62 * dim * upk), .32, eye);
    }
    /* the person block: it grows in as the line reaches it, then lights */
    const gpRaw = t < 0 ? 0 : clamp01((t - N.person0) / (N.person1 - N.person0)), gp = grow(gpRaw);
    let lit = t < 0 ? 0 : ease.inOut(clamp01((t - N.lit0) / (N.lit1 - N.lit0)));
    const gpl = clamp01((front - NB) / 3), ps = PS * (gp < 1 ? (gp <= 1e-4 ? 1e-4 : ease.back(gp)) : 1) * grow(gpl);
    lit *= grow(gpl);
    const FP = personFrame(SPIN);
    put(glassP.rows, 0, local(FP, 0, 0, 0, 0, 0, 0, ps), mixc(glassC, tealGlass, lit), .62);
    put(P.hxpin.rows, 0, local(FP, 0, 0, 0, 0, 0, 0, ps * .96), mulc(teal, .05 + .17 * lit), 1);
    edges(P.hxedge.rows, NB * 12, FP, ps, ps, ps, .03, ps > .02 ? 1 : 0, mulc(mixc(ember, teal, lit), 1.1 + .9 * lit), .45, eye);
    /* the person glyph, lit with the block, on the face toward you: the front, or after a half-turn the back (mirrored) */
    glyph.forEach((gb2, n) => {
      for (let f = 0; f < 2; f++) {
        const j = n * 2 + f, zf = (f ? -1 : 1) * (.5 + .012), on = ps > .05 && lit > .01 && (Math.cos(turn) >= 0) === !f;
        if (on) put(P.hxglyph.rows, j, local(FP, (f ? -1 : 1) * gb2[0] * N.glyphscale * ps, (gb2[1] - .01) * N.glyphscale * ps, zf * ps, 0, 0, (f ? -1 : 1) * (gb2[4] || 0), gb2[2] * N.glyphscale * ps, gb2[3] * N.glyphscale * ps, .02 * ps), mulc(mixc(teal, WHITE, .25 * lit), .4 + 2.2 * lit), 1);
        else none(P.hxglyph.rows, j);
      }
    });
    /* the proof line, up the axis from the foot to the person block: it reaches the highest block placed, and the person block once that grows */
    let yReach = reach <= -1 ? LINE0 : yAt(reach); const pg = Math.min(gpRaw, gpl);
    if (pg > 0) yReach = Math.max(yReach, B[NB - 1].y + (LINE1 - B[NB - 1].y) * pg);
    const rv = clamp01((yReach - LINE0) / (LINE1 - LINE0)), lineLen = LINE1 - LINE0, running = rv < .999;
    for (let q = 0; q < NL; q++) {
      const a0 = q / NL, a1 = (q + 1) / NL, vis1 = clamp01((rv - a0) / (a1 - a0));
      for (let kk = 0; kk < 2; kk++) {
        const j = q * 2 + kk;
        if (!(rv > .005) || vis1 <= 0) { none(P.hxline.rows, j); continue; }
        const mid = a0 + (a1 - a0) * vis1 / 2, rad = kk ? N.glowr : N.liner, core = kk ? 0 : .3, gain = kk ? 1 : 1.35, alpha = kk ? .22 : 1;
        const sm = clamp01((mid - .86) / .14), tn = sm * sm * (3 - 2 * sm), head = running ? clamp01((mid - (rv - .08)) / .08) : 0;
        const col = mulc(mixc(mixc(ember, teal, tn), WHITE, core), gain * (1 + head * 1.6) * alpha);
        put(P.hxline.rows, j, mul(RXT, mul(T4(0, LINE0 + lineLen * (a0 + (a1 - a0) * vis1 / 2), 0), S4(rad, lineLen * (a1 - a0) * vis1, rad))), col, 1);
      }
    }
    return finish(inset, moving);
  }
  function finish(ins, moving) {
    if (!ins) { for (const e of Object.values(P)) e.part.count = 0; return { moving: false, inset: null }; }
    for (const e of Object.values(P)) { e.part.count = e.n; e.part.c = null; R.updateBuffer(e.buf, e.rows, 0); }
    return { moving: !!moving, inset: ins };
  }

  return {
    step, repaint() {},
    hover(now) { if (reduced() || mode === 'wait') return; if (Math.abs(spinGet(now) - spin.to) > 1e-3) return; spin.from = spinGet(now); spin.to += PI; spin.t0 = now; spin.dur = N.spinms; wake(); },
    replay(now) { mode = 'wait'; build(now); wake(); },
    state: () => ({ mode, turn: spinGet(performance.now()), bound: BOUND, rows: Object.fromEntries(Object.entries(P).map(([k, v]) => [k, v.part.count])) })
  };
}
