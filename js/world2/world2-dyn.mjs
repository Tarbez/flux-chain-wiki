/* World grammar, the chain views' moving rows (docs/design/world-grammar/STAGE.md, PORT.md batch 1).

   The chain, record, links and open views draw your chain as record tiles, their links, the earlier versions behind the chosen
   record, your key, the edge lights, the words on the faces, the light under the record, the related records, and the page slab.
   None of it is drawn by code written for the view. The encoder (scripts/lib/world-chain-scene.mjs) evaluated the Three.js stage's
   placement maths once, at each view's settled channel values and at each record the ring is turned to, and wrote every row of
   every view as a FRAME of one blob. Here a row is only ever a blend of two frames:
     from   the frame of the view the camera leaves, turned to the ring's live position
     to     the frame of the view it arrives at, turned to the same position
     weight one number per row, read off the channel that drives the row's part (WDRV): the channel's progress from the value it had to the
            value it settles at, with the part's gain, its stagger (a tile later in the chain starts a little later) and a curve
   The channels (m j kk g s l p n and the flight's clock e) are the stage's, played by the one sampler. The ring's turn is the channel
   pos: a view's frames are one per record, and a position between two records blends the two nearest, along the ring's arc where the
   view keeps its tiles on a ring (WSET polar). A row that one side does not show has alpha 0; a blend that meets one shows the other in
   place and grows it. Colours travel as palette indices and are resolved here to linear colours from the live palette, so a theme change
   rewrites the rows and needs no new blob. The page slab (the dark glass the page's words sit on) is the one row whose place is not in
   the frames: it is the page's box on the screen, which only the browser knows, laid over from the chosen tile as the page opens
   (ring-kit.js k.panel). Nothing here schedules a frame: step() reports whether anything still moves. No JSON; the words are tab
   separated text. */
import { prism, torus } from '/fxn-3d/js/render/world2-shapes.mjs';
import { eyeOf, view as viewMatrix } from '/fxn-3d/js/render/world2-math.mjs';
import { easeOf } from '/fxn-3d/scripts/lib/anim-sample.mjs';
import { paintPlate } from './world2-plates.mjs';
import { loadPart, resolveRow } from './world2-rows.mjs';

const TAU = Math.PI * 2, LIFT = .16, HALF_D = .15;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, t) => a + (b - a) * t;
const arc = (a, b) => ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;   /* the shortest turn from angle a to angle b */
const ease5 = (t) => easeOf(5, t);
const HIDDEN = (r) => !(r[15] > 1e-4);
const yawOf = (r) => Math.atan2(-r[2], r[0]);
/* how each part is drawn and blended. like: the renderer's kind of draw; mode: pose (a tile-like row: a turn about Y, three sizes, a place) or
   lin (every float blended: lines and dots, whose columns are not an axis frame); shadow: casts into the key's shadow map; hold: a row the host
   places (the slab) */
/* piece: the part is drawn through the mesh pass (world2-pieces.mjs) with ring-kit.js's material for that part: tiles satin with a clear coat (tileMaterial), links
   MeshStandard, the page dark matte glass (kind page), the earlier versions' panes clear glass (blockSet, opacity .34 in the row), the record's shell black glass */
const TILE_MAT = { metal: .08, rough: .6, coat: .55, coatRough: .14, env: .75 };
/* the open card (record-glass.js cardMat: near-black glass) as the mesh pass draws it: no clear coat, almost no room, so the chosen tile is black while it becomes the card and not the tile's colour lit by the room */
const CARD_MAT = { metal: 0, rough: .5, coat: 0, coatRough: .5, env: .08 };
const PART = {
  ytile: { like: 'tile', mode: 'pose', shadow: true, piece: { kind: 'tile', mat: TILE_MAT } }, ylink: { like: 'link', mode: 'pose', shadow: true, piece: { kind: 'link', mat: { metal: .2, rough: .55, env: 1 } } },
  clink: { like: 'link', mode: 'link', shadow: true, piece: { kind: 'link', mat: { metal: .2, rough: .55, env: 1 } } },
  kring: { like: 'dot', mode: 'lin' }, runbead: { like: 'dot', mode: 'lin' },
  pane: { like: 'cube', mode: 'pose', pass: 'blend', piece: { kind: 'pane', mat: { metal: .08, rough: .18, coat: .55, coatRough: .14, env: .75, opacity: .999 } } },
  shell: { like: 'cube', mode: 'pose', pass: 'blend', piece: { kind: 'shell', mat: { metal: 0, rough: .08, coat: 1, coatRough: .03, env: .35, opacity: .999 } } },
  edge: { like: 'glow', shape: 'cube', glow: [1, 0, 1], mode: 'pose' }, bead: { like: 'dot', mode: 'lin' }, proof: { like: 'line', mode: 'lin' },
  key: { like: 'solid', shape: 'hexprism', mode: 'lin', shadow: true, piece: { kind: 'hex', mat: { metal: .35, rough: .45, coat: .4, coatRough: .25, env: 1 } } }, keyrim: { like: 'glow', shape: 'thintorus', glow: [1, 0, 1], mode: 'lin' },
  pool: { like: 'pool', mode: 'pose' }, slab: { like: 'tile', mode: 'pose', hold: true, piece: { kind: 'tile', mat: { metal: .08, rough: .78, coat: .1, coatRough: .5, env: .35 } } },
  slabrim: { like: 'tile', mode: 'pose', hold: true, piece: { kind: 'tile', mat: { metal: .08, rough: .4, env: .75 } } },
  rel: { like: 'tile', mode: 'pose', shadow: true, piece: { kind: 'tile', mat: TILE_MAT } }, spot: { like: null, mode: 'lin' }
};
for (let i = 0; i < 9; i++) PART['plate' + i] = { like: 'text', mode: 'pose' };
/* a hexagon for your key (CylinderGeometry radial 6: a vertex on +z) and a thin ring for its rim, as unit shapes the renderer is given by name */
const HEX = [0, 1, 2, 3, 4, 5].map((i) => [Math.sin(i * Math.PI / 3), Math.cos(i * Math.PI / 3)]);
let shapesDone = new WeakSet();
function registerShapes(R) {
  if (shapesDone.has(R)) return;
  /* the key's rim is TorusGeometry(KR * 1.05, KR * .028, 4, 6) turned a quarter about its axis: a hexagon of four-sided tube with its corners up and down, like the disc's */
  const t = torus(.0267, 6, 4), c30 = Math.cos(Math.PI / 6), s30 = Math.sin(Math.PI / 6);
  for (const a of [t.pos, t.nrm]) for (let i = 0; i < a.length; i += 3) { const x = a[i], z = a[i + 2]; a[i] = x * c30 - z * s30; a[i + 2] = x * s30 + z * c30; }
  R.addShape('hexprism', prism(HEX)); R.addShape('thintorus', t);
  shapesDone.add(R);
}

/* small quaternion helpers for the slab: a turn about Y, a camera's basis, a spherical blend, back to axes */
const qYaw = (y) => [0, Math.sin(y / 2), 0, Math.cos(y / 2)];
function qBasis(r, u, b) {   /* columns right, up, back */
  const m00 = r[0], m01 = u[0], m02 = b[0], m10 = r[1], m11 = u[1], m12 = b[1], m20 = r[2], m21 = u[2], m22 = b[2], tr = m00 + m11 + m22;
  let x, y, z, w;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; w = s / 4; x = (m21 - m12) / s; y = (m02 - m20) / s; z = (m10 - m01) / s; }
  else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; w = (m21 - m12) / s; x = s / 4; y = (m01 + m10) / s; z = (m02 + m20) / s; }
  else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; w = (m02 - m20) / s; x = (m01 + m10) / s; y = s / 4; z = (m12 + m21) / s; }
  else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; w = (m10 - m01) / s; x = (m02 + m20) / s; y = (m12 + m21) / s; z = s / 4; }
  return [x, y, z, w];
}
function qSlerp(a, b, t) {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], bb = b;
  if (d < 0) { d = -d; bb = b.map((v) => -v); }
  if (d > .9995) { const o = a.map((v, i) => v + (bb[i] - v) * t), l = Math.hypot(...o); return o.map((v) => v / l); }
  const th = Math.acos(d), s = Math.sin(th), wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
  return a.map((v, i) => v * wa + bb[i] * wb);
}
function qAxes(q) {   /* the rotation's three columns */
  const [x, y, z, w] = q;
  return [[1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w)], [2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w)], [2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y)]];
}

export function createDyn(o) {
  const { world, R, blob, lines, palette, wake, rays, pieces } = o;
  const S = world.stage, f32 = new Float32Array(blob), parts = world.parts.dyn || [], poses = S.pose;
  /* the frame lists: each part has its own (WPOSE with a part), written once per distinct picture; the entries without a part say how many records the ring turns to */
  const nR = (poses.chain && poses.chain.filter((e) => !e.part)[0].count) || 5;
  registerShapes(R);

  /* ---------- the parts: one buffer each that this module rewrites, drawn like the part they are ----------
     A part's rows are indexed as the stage knows them (the original row i); the blob holds only the rows that show in some frame (WROWS ranges), so a row
     the blob does not hold is a hidden row here, and `kept` lists the ones that are evaluated. */
  const P = {}, order = [];
  for (const p of parts) {
    const cfg = PART[p.part]; if (!cfg) throw new Error('dyn: part ' + p.part + ' has no kind in the chain group\'s part table (world2-dyn.mjs PART), so the renderer cannot draw it');
    const e = loadPart(S, 'dyn', p, blob, cfg); e.buf = R.buffer(e.out); e.part = null;
    if (cfg.like) {
      e.part = { part: p.part, like: cfg.like, shape: cfg.shape, buffer: e.buf, offset: 0, count: 0, direct: true, pass: cfg.pass, glow: cfg.glow, noShadow: !cfg.shadow, cpu: e.out.buffer, pick: p.pick };
      if (cfg.like === 'dot') e.part.soft = 0;
    }
    if (pieces && cfg.piece && e.part) {   /* drawn by the mesh pass; the lit program keeps only its shadow. A mesh pass that cannot take the part leaves it to the lit program. */
      try { e.piece = pieces.add(p.part, cfg.piece, e.out); e.part.piece = true; } catch (err) { if (window.console) console.warn('[world2] ' + p.part + ' is lit without the mesh pass (' + err.message + ')'); }
    }
    P[p.part] = e; order.push(e);
  }
  const drawn = order.filter((e) => e.part).map((e) => e.part);
  const pickParts = drawn.filter((q) => q.pick);

  /* ---------- the items and the words ---------- */
  const slotItem = new Int32Array(P.ytile.per).fill(-1);
  for (const it of S.items.dyn || []) if (it.part === 'ytile') slotItem[it.first] = it.id;
  /* the chosen tile's body is swapped for the card's material while the card's weight s is above .002 (chains-scene.js ySet.noBody[q] = j === sel && s > .002): one more row of the mesh pass, filled in flush() */
  const cardRow = new Float32Array(16); let cardPiece = null, curS = 0;
  if (pieces) { try { cardPiece = pieces.add('ycard', { kind: 'tile', mat: CARD_MAT }, cardRow); } catch (err) { if (window.console) console.warn('[world2] the card material swap is off (' + err.message + ')'); } }
  const slotOfItem = new Map(); slotItem.forEach((j, q) => { if (j >= 0 && j < 100) slotOfItem.set(j, q); });
  const rec = new Map(), pane = new Map(), plates = new Map(), spots = [], gate = {}, recIds = [];
  for (const c of lines) {
    if (c[0] === 'recid') recIds[Number(c[1])] = c[2];
    else if (c[0] === 'rec') rec.set(c[2] + ':' + c[1], { name: c[3], actSel: c[4], actOther: c[5], rule: c[6] });
    else if (c[0] === 'pane') pane.set(Number(c[1]), { view: c[2], name: c[3], act: c[4] });
    else if (c[0] === 'plate') plates.set(c[1], c.slice(2));
    else if (c[0] === 'spot') spots[Number(c[1])] = { id: c[2], views: c[3].split(',') };
    else if (c[0] === 'gate') gate[c[1]] = { channel: c[2], min: Number(c[3]) };
  }

  /* ---------- the plates: the words on a face, painted once from the sample's own words and handed to the renderer by id ---------- */
  let themeKey = 0;
  function paintAll() {
    themeKey++;
    for (const [name, spec] of plates) {
      const e = P[name]; if (!e || !e.part) continue;
      const cv = paintPlate(spec);
      if (e.part.tex) R.dropTexture(e.part.tex);
      e.part.tex = name + ':' + themeKey; R.setTexture(e.part.tex, cv);
    }
  }
  paintAll();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { paintAll(); wake(); });

  /* ---------- frames: a row of a part, resolved to a matrix, a linear colour and an alpha ---------- */
  const pal = () => palette();
  const resolve = (e, frame, i, dst) => resolveRow(e, frame, i, dst, pal());
  /* two resolved rows blended by t. pose rows blend as a turn, three sizes and a place (on the ring's arc when polar); lin rows blend every float */
  function blendRows(mode, ra, rb, t, polar, c, dst) {
    const ha = HIDDEN(ra), hb = HIDDEN(rb);
    for (let k = 0; k < 3; k++) dst[12 + k] = lerp(ra[12 + k], rb[12 + k], t);
    dst[15] = lerp(ra[15], rb[15], t);
    if (ha && hb) { for (let k = 0; k < 12; k++) dst[k] = ra[k]; dst[15] = 0; return; }
    if (t <= 0) { for (let k = 0; k < 16; k++) dst[k] = ra[k]; return; }
    if (t >= 1) { for (let k = 0; k < 16; k++) dst[k] = rb[k]; return; }
    if (mode === 'lin') {
      if (ha || hb) { const src = ha ? rb : ra; for (let k = 0; k < 12; k++) dst[k] = src[k]; return; }
      for (let k = 0; k < 12; k++) dst[k] = lerp(ra[k], rb[k], t);
      return;
    }
    const sa = [Math.hypot(ra[0], ra[1], ra[2]), Math.hypot(ra[3], ra[4], ra[5]), Math.hypot(ra[6], ra[7], ra[8])];
    const sb = [Math.hypot(rb[0], rb[1], rb[2]), Math.hypot(rb[3], rb[4], rb[5]), Math.hypot(rb[6], rb[7], rb[8])];
    let ya = yawOf(ra), yb = yawOf(rb);
    if (sa[0] < 1e-3) ya = yb; if (sb[0] < 1e-3) yb = ya;
    let yaw = ya + arc(ya, yb) * t, x, y, z;
    /* a link grows (or shrinks) along its length only, its far end fixed: chains-scene.js linkBetween() gives the new link the older record's end and lengthens it toward the
       newer one (the link's +x axis runs from the newer record to the older), so a hidden side is the visible side's length times the share shown, its +x end where it ends */
    if (mode === 'link' && (ha || hb)) {
      const src = ha ? rb : ra, sh = ha ? t : 1 - t, L = Math.hypot(src[0], src[1], src[2]) || 1e-4, ux = src[0] / L, uy = src[1] / L, uz = src[2] / L, back = L * (1 - sh) / 2;
      dst[15] = src[15]; for (let k = 0; k < 3; k++) dst[12 + k] = src[12 + k];
      for (let k = 0; k < 9; k++) dst[k] = src[k] * (k < 3 ? sh : 1);
      dst[9] = src[9] + ux * back; dst[10] = src[10] + uy * back; dst[11] = src[11] + uz * back;
      return;
    }
    if (ha) { x = rb[9]; y = rb[10]; z = rb[11]; yaw = yb; }
    else if (hb) { x = ra[9]; y = ra[10]; z = ra[11]; yaw = ya; }
    else if (polar) {
      const ax = ra[9] - c[0], az = ra[11] - c[2], bx = rb[9] - c[0], bz = rb[11] - c[2], rA = Math.hypot(ax, az), rB = Math.hypot(bx, bz);
      if (rA < 1e-3 || rB < 1e-3) { x = lerp(ra[9], rb[9], t); z = lerp(ra[11], rb[11], t); }
      else { const tA = Math.atan2(az, ax), tB = Math.atan2(bz, bx), th = tA + arc(tA, tB) * t, r = lerp(rA, rB, t); x = c[0] + r * Math.cos(th); z = c[2] + r * Math.sin(th); }
      y = lerp(ra[10], rb[10], t);
    } else { x = lerp(ra[9], rb[9], t); y = lerp(ra[10], rb[10], t); z = lerp(ra[11], rb[11], t); }
    /* a hidden side grows from a point: the other side's sizes times the share that is shown */
    const s = [0, 1, 2].map((k) => (ha ? sb[k] * t : hb ? sa[k] * (1 - t) : lerp(sa[k], sb[k], t)));
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    dst[0] = cy * s[0]; dst[1] = 0; dst[2] = -sy * s[0]; dst[3] = 0; dst[4] = s[1]; dst[5] = 0; dst[6] = sy * s[2]; dst[7] = 0; dst[8] = cy * s[2];
    dst[9] = x; dst[10] = y; dst[11] = z;
  }
  const A1 = new Float32Array(16), A2 = new Float32Array(16), B1 = new Float32Array(16), B2 = new Float32Array(16), V1 = new Float32Array(16), V2 = new Float32Array(16), V3 = new Float32Array(16);
  /* a part's frame entries for a view: its own list, else the group's (the part has no frames of its own for a view it never shows in) */
  const framesOf = (e, view) => e.entries[view] || e.entries.home || poses[view] || poses.home;
  const setOf = (view, c) => { const s = S.set[view]; return s && s[0] && s[0][c] != null ? s[0][c] : 0; };
  const polarOf = (view) => setOf(view, 'polar') > .5;
  const centre = S.spots.chain && S.spots.chain.centre ? S.spots.chain.centre : [0, 0, 0];
  let curCh = () => 0;   /* the live channels of this step: the run axis reads the entering flight's run */
  /* a part's row i for a view with the ring turned to position pos (a real number), the open view's spread evaluated at aspect A, and the entering flight's run */
  function viewRow(e, view, pos, A, i, dst) {
    const list = framesOf(e, view), polar = polarOf(view);
    const one = (entry, out) => {
      const k0 = Math.floor(pos), f = pos - k0;
      if (entry.count === 1) { resolve(e, entry.first, i, out); return; }
      const a = entry.first + ((k0 % nR) + nR) % nR, b = entry.first + (((k0 + 1) % nR) + nR) % nR;
      if (f < 1e-6) { resolve(e, a, i, out); return; }
      resolve(e, a, i, A1); resolve(e, b, i, A2); blendRows(e.cfg.mode, A1, A2, f, polar, centre, out);
    };
    const axes = list.filter((l) => l.axis === 'aspect');
    if (axes.length >= 2) {
      one(axes[0], B1); one(axes[1], B2);
      const u = A - axes[0].value;   /* x is linear in the aspect, so a width off the two evaluated ones is exact */
      for (let k = 0; k < 16; k++) dst[k] = B1[k] + (B2[k] - B1[k]) * u;
      if (dst[15] < 0) dst[15] = 0;
      return;
    }
    /* samples along the run channel (the pulses): the two nearest samples, blended by where the run stands between them */
    const runs = list.filter((l) => l.axis === 'run');
    if (runs.length) {
      const run = curCh('run');
      let k = 0; while (k + 1 < runs.length - 1 && runs[k + 1].value <= run) k++;
      const lo = runs[k], hi = runs[Math.min(runs.length - 1, k + 1)], t = hi.value > lo.value ? clamp01((run - lo.value) / (hi.value - lo.value)) : 0;
      one(lo, B1);
      if (t <= 0) { for (let q = 0; q < 16; q++) dst[q] = B1[q]; return; }
      one(hi, B2); blendRows('lin', B1, B2, t, false, centre, dst);
      return;
    }
    one(list[0], dst);
  }

  /* ---------- the state: what the camera leaves, what it arrives at ---------- */
  const st = { from: 'home', to: 'home', pos: 0, sel: 0, A: 1, live: false, fromSet: {}, toSet: {}, hover: new Float32Array(nR + 3), anchor: null, rect: null, rectFrom: null, wasOpen: false };
  const CH = ['m', 'j', 'kk', 'g', 's', 'l', 'p', 'n', 'e'];
  let frozen = null;
  /* a flight begins from the view the camera is at (values: the channels' live values when a flight is already under way, so nothing jumps) */
  function begin(from, to, sel, A, values, moving) {
    if (moving && st.live) { frozen = {}; for (const e of order) frozen[e.name] = rowsOf(e); st.from = '_live'; }
    else { frozen = null; st.from = from; }
    st.to = to; st.sel = sel; st.A = A; st.fromSet = {}; st.toSet = {};
    for (const c of CH) { st.fromSet[c] = values && values[c] != null ? values[c] : setOf(from, c); st.toSet[c] = setOf(to, c); }
    st.live = true;
  }
  /* the resolved rows of a part as they stand, as one array of 16 x per */
  function rowsOf(e) { return e.cur.slice(); }

  function weight(e, i, ch) {
    const list = S.drv[e.name]; if (!list) return 1;
    for (const d of list) {
      const a = st.fromSet[d.channel], b = st.toSet[d.channel];
      if (a == null || b == null || Math.abs(b - a) < 1e-6) continue;
      /* abs: the channel's own value drives the row (a row that leaves goes back in the order it came); a flight that began from frozen rows measures progress instead */
      const absolute = d.stagger.startsWith('abs') && st.from !== '_live', kind = d.stagger.replace(/^abs/, 'from');
      const val = ch(d.channel), p = clamp01((val - a) / (b - a));
      /* the open card's ember edge (chains-scene.js recEdge.set(nR, ...): amount ease.out(clamp((s - .55) / .45))): the four bars after the records' own start at s .55 and grow with the cubic out,
         where every other row blends with the channel itself. The weight toward the frame the flight goes to is that amount when it goes to the open card, and what is left of it when it leaves. */
      if (e.name === 'edge' && d.channel === 's' && i >= nR * 4 && i < nR * 4 + 4) { const cs = easeOf(6, clamp01((val - .55) / .45)); return b > a ? cs : 1 - cs; }
      let g = 0;
      if (d.stagger !== 'none') {
        const j = e.name === 'ytile' || e.name === 'clink' ? slotItem[i] : -1;
        if (j >= 0 && j < 100) g = kind === 'fromend' ? nR - 1 - j : kind === 'fromlink' ? nR - 2 - j : Math.abs(j - st.sel);
      }
      const u = clamp01(d.gain * (absolute ? val : p) - d.step * g), w = easeOf(d.curve, u);
      return absolute && b < a ? 1 - w : w;
    }
    return 1;   /* no channel the part follows differs between the two views: the rows are the to view's */
  }

  /* ---------- step: every part's rows, from the live channels and the ring's position ---------- */
  let anyMoving = false;
  function step(ch, pos) {
    const polarRun = polarOf(st.to) && st.from !== '_live' && polarOf(st.from);
    curCh = ch; curS = ch('s');
    for (const e of order) {
      const cur = e.cur, mode = e.cfg.mode;
      for (let n = 0; n < e.kept.length; n++) {
        const i = e.kept[n], w = weight(e, i, ch), o = i * 16;
        if (w >= 1 - 1e-6) viewRow(e, st.to, pos, st.A, i, V3);
        else {
          if (st.from === '_live') { const fz = frozen[e.name]; for (let k = 0; k < 16; k++) V1[k] = fz[o + k]; } else viewRow(e, st.from, pos, st.A, i, V1);
          if (w <= 1e-6) for (let k = 0; k < 16; k++) V3[k] = V1[k];
          else {
            viewRow(e, st.to, pos, st.A, i, V2); blendRows(mode, V1, V2, w, polarRun, centre, V3);
            /* the chosen tile's colour has its own weight: chains-scene.js leaves its body to the near-black card the moment the card's weight s passes .002 (ySet.noBody), while the shape goes on
               opening with s, so the colour is the open card's from the first frame of the flight there and the tile's again only once s is back at nothing */
            if (e.name === 'ytile' && slotItem[i] === st.sel && st.fromSet.s != null && Math.abs(st.toSet.s - st.fromSet.s) > 1e-6) {
              const hit = clamp01(ch('s') / .004), cw = st.toSet.s > st.fromSet.s ? hit : 1 - hit;
              for (let k = 12; k < 15; k++) V3[k] = V1[k] + (V2[k] - V1[k]) * cw;
            }
          }
        }
        for (let k = 0; k < 16; k++) cur[o + k] = V3[k];
      }
    }
    swung(ch, pos);
    laidOn();
  }
  /* a part written in another part's units (WATTACH: the ring of light, in key radii) is laid on that part's row: the place is the row's place plus its first axis times x and
     minus its third axis times y (the key's face is its XY plane, turned a quarter about X by the row that draws the disc) */
  function laidOn() {
    for (const e of order) {
      const host = S.attach[e.name] && P[S.attach[e.name]]; if (!host) continue;
      const K = host.cur, ok = K[15] > 1e-4;
      for (const i of e.kept) {
        const o = i * 16, c = e.cur;
        if (!ok || !(c[o + 15] > 1e-4)) { c[o + 15] = 0; continue; }
        const lx = c[o + 9], ly = c[o + 10], lz = c[o + 11];
        c[o + 9] = K[9] + K[0] * lx - K[6] * ly; c[o + 10] = K[10] + K[1] * lx - K[7] * ly; c[o + 11] = K[11] + K[2] * lx - K[8] * ly;
      }
    }
  }

  /* ---------- the swing: as the chosen tile becomes the card it swings forward and round (chains-scene.js: z += sin(pi s) TS .8, yaw += sin(pi s) .5, y += sin(pi s) TS .12) ----------
     The settled frames hold the end poses; the bulge between them is this delta (WSET open swingz, swingyaw, swingy), turned about the tile's own centre and applied to the
     tile and to what stands on it: its words, its edge lights, the card's edge, and the near end of the line to the record it links to. */
  const SW = (S.set.open && S.set.open[0]) || {}, swingZ = SW.swingz || 0, swingYaw = SW.swingyaw || 0, swingY = SW.swingy || 0;
  function swingRow(r, o, c0, cy, sy, dy, dz, ends) {
    for (const k of ends) {
      const x = r[o + k * 3] - c0[0], z = r[o + k * 3 + 2] - c0[2];
      r[o + k * 3] = c0[0] + cy * x + sy * z; r[o + k * 3 + 1] += dy; r[o + k * 3 + 2] = c0[2] - sy * x + cy * z + dz;
    }
  }
  function swung(ch, pos) {
    const s = ch('s'), sw = Math.sin(Math.PI * clamp01(s));
    if (!(sw > 1e-4) || !(swingZ || swingYaw)) return;
    const j = Math.max(0, Math.min(nR - 1, st.sel)), q = slotOfItem.get(j); if (q == null) return;
    const tile = P.ytile.cur, c0 = [tile[q * 16 + 9], tile[q * 16 + 10], tile[q * 16 + 11]];
    if (!(tile[q * 16 + 15] > 1e-4)) return;
    const yaw = sw * swingYaw * (pos >= st.sel ? 1 : -1), cy = Math.cos(yaw), sy = Math.sin(yaw), dy = sw * swingY, dz = sw * swingZ;
    const turn = (r, o) => {   /* the row's three axes turn about Y */
      for (let k = 0; k < 3; k++) { const x = r[o + k * 3], z = r[o + k * 3 + 2]; r[o + k * 3] = cy * x + sy * z; r[o + k * 3 + 2] = -sy * x + cy * z; }
    };
    const move = (e, i) => { if (!e || i >= e.per) return; const r = e.cur, o = i * 16; if (!(r[o + 15] > 1e-4)) return; swingRow(r, o, c0, cy, sy, dy, dz, [3]); turn(r, o); };
    move(P.ytile, q); if (P['plate' + j]) move(P['plate' + j], 0);
    for (let b = 0; b < 4; b++) { move(P.edge, j * 4 + b); move(P.edge, nR * 4 + b); }
    /* the line to the older record starts on the chosen tile's edge: only its near end goes with the tile */
    if (P.proof) for (let i = 0; i < 2; i++) { const r = P.proof.cur, o = i * 16; if (r[o + 15] > 1e-4) swingRow(r, o, c0, cy, sy, dy, dz, [0]); }
    if (P.bead && P.bead.per >= 2) { const o = (P.bead.per - 2) * 16, r = P.bead.cur; if (r[o + 15] > 1e-4) swingRow(r, o, c0, cy, sy, dy, dz, [3]); }
  }

  /* ---------- the page slab: the chosen tile as it stands, laid over the page's box as the page opens (ring-kit.js k.panel, chains-scene.js placePage) ---------- */
  const lift = (S.set.dyn && S.set.dyn[0] && S.set.dyn[0].lift) || 0;
  const tmp = new Float32Array(16);
  function slabRows(cam, rect, ch) {
    const slab = P.slab, rim = P.slabrim, p = ch('p');
    const hideSlab = () => { slab.out[15] = 0; rim.out[15] = 0; };
    if (p < .001 || !rect) { hideSlab(); return; }
    /* the anchor: the new view's chosen tile, else the view that is left */
    let row = V3;
    viewRow(slab, st.to, ch('pos'), st.A, 0, row);
    if (HIDDEN(row) && st.from !== '_live') viewRow(slab, st.from, ch('pos'), st.A, 0, row);
    if (st.anchor) { /* a view whose anchor is a place, not a tile (the ring view) */ }
    const anchor = st.anchor || (HIDDEN(row) ? null : { x: row[9], y: row[10], z: row[11], yaw: yawOf(row), s: Math.hypot(row[3], row[4], row[5]) });
    if (!anchor) { hideSlab(); return; }
    const d = Math.max(3, cam.dist * .22), eye = eyeOf(cam.aim, cam.dist, cam.elev, cam.yaw), vw = new Float32Array(16); viewMatrix(vw, eye, cam.aim);
    const right = [vw[0], vw[4], vw[8]], up = [vw[1], vw[5], vw[9]], back = [vw[2], vw[6], vw[10]], fwd = [-back[0], -back[1], -back[2]];
    const at = (x, y) => { const r = rays(x, y, cam), k = d / (r.d[0] * fwd[0] + r.d[1] * fwd[1] + r.d[2] * fwd[2]); return [r.o[0] + r.d[0] * k, r.o[1] + r.d[1] * k, r.o[2] + r.d[2] * k]; };
    const cx = rect.x + rect.w / 2, cyy = rect.y + rect.h / 2, pc = at(cx, cyy);
    const h = Math.hypot(...at(cx, rect.y).map((v, k) => v - at(cx, rect.y + rect.h)[k])), w = Math.hypot(...at(rect.x, cyy).map((v, k) => v - at(rect.x + rect.w, cyy)[k]));
    const ease = (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const e = ease(p), open = clamp01((p - .55) / .45), dz = 1 - .9 * ease(open);
    const page = [pc[0] + fwd[0] * HALF_D * h * dz - up[0] * (LIFT + .5) * h, pc[1] + fwd[1] * HALF_D * h * dz - up[1] * (LIFT + .5) * h, pc[2] + fwd[2] * HALF_D * h * dz - up[2] * (LIFT + .5) * h];
    const X = lerp(anchor.x, page[0], e), Y = lerp(anchor.y, page[1], e) + Math.sin(Math.PI * e) * lift, Z = lerp(anchor.z, page[2], e);   /* it lifts out in an arc */
    const q = qSlerp(qYaw(anchor.yaw), qBasis(right, up, back), e), ax = qAxes(q), sc = lerp(anchor.s, h, e);
    const stretch = 1 + (w / h - 1) * ease(open);
    const put = (rowEntry, px, py, pz, sx, sy, sz, str, col, alpha) => {
      /* F = T(P) R(q) S(sx, sy, sz); the body is F * T(0, LIFT + .5, 0) * S(str, 1, 1) */
      const o = rowEntry.out;
      o[0] = ax[0][0] * sx * str; o[1] = ax[0][1] * sx * str; o[2] = ax[0][2] * sx * str;
      o[3] = ax[1][0] * sy; o[4] = ax[1][1] * sy; o[5] = ax[1][2] * sy;
      o[6] = ax[2][0] * sz; o[7] = ax[2][1] * sz; o[8] = ax[2][2] * sz;
      o[9] = px + ax[1][0] * sy * (LIFT + .5); o[10] = py + ax[1][1] * sy * (LIFT + .5); o[11] = pz + ax[1][2] * sy * (LIFT + .5);
      o[12] = col[0]; o[13] = col[1]; o[14] = col[2]; o[15] = alpha;
    };
    /* the page is dark glass: the other tone toward the canvas, as the tile of kind page is lit; its rim is the canvas toward the muted tone */
    const c0 = pal(), mixc = (a, b, t) => [0, 1, 2].map((k) => c0[a * 3 + k] + (c0[b * 3 + k] - c0[a * 3 + k]) * t);
    const slabCol = mixc(6, 10, .62), rimCol = mixc(10, 9, .32), muted = rimCol;   /* measured: this (the other tone leaned to the canvas) matches Three.js's page slab at rest; canvas x .2, the kind's own colour, was 1.5 points further from Three.js on /chain */
    put(slab, X, Y, Z, sc, sc, sc * dz, stretch, slabCol, 1);
    /* the rim: a hair larger all round and thinner, so only its edge shows (1.5 css pixels) */
    const ep = 1.5 / Math.max(40, rect.h), rs = sc * (1 + 2 * ep), push = (LIFT + .5) * sc * 2 * ep;
    put(rim, X - ax[1][0] * push, Y - ax[1][1] * push, Z - ax[1][2] * push, rs, rs, sc * dz * .9, (stretch + 2 * ep) / (1 + 2 * ep), rimCol, p > .9 ? 1 : 0);
  }

  /* ---------- flush: the rows, with the pointer's lift, to the parts' buffers ---------- */
  let dimMine = 0;
  function setDim(d) { if (Math.abs(d - dimMine) > 1e-4) { dimMine = d; return true; } return false; }
  function flush(off) {
    if (off) { if (cardPiece) pieces.write(cardPiece, cardRow, 0); for (const e of order) if (e.part) { e.part.count = 0; if (e.piece) pieces.write(e.piece, e.out, 0); } return; }
    for (const e of order) if (!e.cfg.hold) e.out.set(e.cur);
    /* your ring, where the network steps back: on a view that is not the chain's own (the identity and how-it-works views, any page over the network) its tiles are the network's, whose colour is
       darkened by the step back (chains-scene.js netSet.tint: multiplyScalar(1 - dims)); the chain's own views keep them lit. The step back fades out as the ring becomes the chain (m). */
    const keepLit = curCh ? 1 - (1 - curCh('m')) * dimMine : 1;
    if (keepLit < .999) for (const name of ['ytile', 'ylink']) { const out = P[name].out; for (let i = 0; i < P[name].per; i++) { const o = i * 16; out[o + 12] *= keepLit; out[o + 13] *= keepLit; out[o + 14] *= keepLit; } }
    /* the pointer's lift: a record tile rises by .12 of its height and grows by .04; the words and edge lights on its face go with it */
    for (let i = 0; i < 3; i++) {   /* an earlier version under the pointer lifts like a tile, with the words and edge light on it */
      const h = st.hover[nR + i]; if (!(h > 0)) continue;
      const out = P.pane.out, o = i * 16; if (!(out[o + 15] > 1e-4)) continue;
      const dy = h * .12 * Math.hypot(out[o + 3], out[o + 4], out[o + 5]);
      for (let k = 0; k < 9; k++) out[o + k] *= (1 + h * .04);
      out[o + 10] += dy;
      const lifted = (name, n) => { const r = P[name]; if (r && r.out[n * 16 + 15] > 1e-4) r.out[n * 16 + 10] += dy; };
      lifted('plate' + (nR + i), 0); for (let b = 0; b < 4; b++) lifted('edge', nR * 4 + 4 + i * 4 + b);
    }
    for (let j = 0; j < nR; j++) {
      const h = st.hover[j]; if (!(h > 0)) continue;
      const q = slotOfItem.get(j); if (q == null) continue;
      const o = q * 16, out = P.ytile.out, sy = Math.hypot(out[o + 3], out[o + 4], out[o + 5]);
      if (!(out[o + 15] > 1e-4)) continue;
      const dy = h * .12 * sy;
      for (let k = 0; k < 9; k++) out[o + k] *= (1 + h * .04);
      out[o + 10] += dy;
      const lifted = (name, i) => { const r = P[name]; if (r && r.out[i * 16 + 15] > 1e-4) r.out[i * 16 + 10] += dy; };
      lifted('plate' + j, 0); for (let b = 0; b < 4; b++) lifted('edge', j * 4 + b);
    }
    /* the swap: the chosen record's tile row moves from the tile piece to the card piece (its place, size and colour unchanged), so only that one row is drawn with the card's material */
    let swapped = 0;
    if (cardPiece && curS > .002 && curS < .98 && st.sel != null) {   /* settled (s at 1) the tile row is the one drawn, as before: the open picture at rest is unchanged */
      const q = slotOfItem.get(st.sel), out = P.ytile.out;
      if (q != null && out[q * 16 + 15] > 1e-4) { for (let k = 0; k < 16; k++) cardRow[k] = out[q * 16 + k]; out[q * 16 + 15] = 0; swapped = 1; }
    }
    if (cardPiece) pieces.write(cardPiece, cardRow, swapped);
    for (const e of order) {
      if (e.cfg.hold) continue;
      let any = false;
      for (let i = 0; i < e.per; i++) if (e.out[i * 16 + 15] > 1e-4) { any = true; break; }
      if (e.part) { e.part.count = any ? e.per : 0; e.part.c = null; R.updateBuffer(e.buf, e.out, 0); if (e.piece) pieces.write(e.piece, e.out, any ? e.per : 0); }
    }
  }
  /* the slab follows the camera as drawn (the pointer's lean moves it too): laid after the camera moves, before the draw */
  function place(cam, rect, ch) {
    slabRows(cam, rect, ch);
    for (const e of [P.slab, P.slabrim]) {
      const vis = e.out[15] > 1e-4;
      e.part.count = vis ? 1 : 0; e.part.c = null;
      if (vis) R.updateBuffer(e.buf, e.out, 0);
      if (e.piece) pieces.write(e.piece, e.out, vis ? 1 : 0);
    }
  }

  /* ---------- the labels' places and the words under the pointer ---------- */
  function spotsOf(view, ch) {
    const sp = P.spot; if (!sp) return [];
    const g = gate[view];
    return spots.map((s, i) => ({ id: s.id, p: [sp.cur[i * 16 + 9], sp.cur[i * 16 + 10], sp.cur[i * 16 + 11]], on: s.views.includes(view) && sp.cur[i * 16 + 15] > .5 && (!g || ch(g.channel) > g.min) }));
  }
  /* what a hit on a record tile says: its name, what a click does, and whether it can be touched in this view with the ring turned to sel */
  function wordsOf(hit, view, sel) {
    if (hit && hit.part === 'pane') {   /* an earlier version: its revision and what it is, in the record view only (chains-scene.js gSet.label, liftable: view === 'record' && i < earlier); a click does nothing */
      const w = pane.get(hit.instance);
      return w && view === 'record' ? { name: w.name, act: w.act, hook: 'none', arg: '', view: 'chain', key: '', value: '', pickView: view, item: nR + hit.instance } : null;
    }
    if (!hit || hit.part !== 'ytile') return null;
    const j = slotItem[hit.instance]; if (j == null || j < 0 || j >= 100) return null;
    const w = rec.get(view + ':' + j); if (!w) return null;
    const ok = w.rule === 'all' || (w.rule === 'selnext' && (j === sel || j === sel + 1)) || (w.rule === 'notsel' && j !== sel);
    if (!ok) return null;
    return { name: w.name, act: j === sel ? w.actSel : w.actOther, hook: 'pick', arg: String(j), view: 'chain', key: '', value: '', pickView: view, item: j };
  }
  return { st, P, order, drawn, pickParts, recIds, slotItem, slotOfItem, rec, spots, nR, step, flush, place, begin, paintAll, setOf, polarOf, spotsOf, wordsOf, framesOf, centre, setDim, ringAnchor(a) { st.anchor = a; } };
}
