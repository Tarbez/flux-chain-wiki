/* World grammar, the identity steps' rows (docs/design/world-grammar/PORT.md batch 2: idstart, idsign, idsafe, idyou, idvalue).

   The five steps of the identity flow draw a key file, the ring of its chain, an app window, a signing request, a vault of glass, a name and two devices, and the one identity over
   the network. None of it is drawn by code written for a step. The encoder (scripts/lib/world-id-scene.mjs) evaluated identity-stages.js's placement maths and wrote every part's
   rows as SAMPLES: the part's frame at the view's rest and, along each channel the part depends on (the intro `i`, the sign-in step `t`, the vault's lit faces `f0 f1 f2`), the frames
   at the knots the encoder derived. A row here is its rest plus, for each channel, what that channel adds: the part's frame at the channel's live value (the line between the two
   nearest knots) less the rest. The channels are the stage's, played by the one sampler (world2-stage.mjs). The stage weight, `present`, scales a row about its own centre through
   the part's window (a `gate` line of the group's words), where Three.js scaled each form about its frame; at rest the pictures are the same.
   What each part is, its size, its colour mixes and the words on its plates are lines of the group's words (WNAMES): `kind`, `tone`, `plate`, `gate`, `spot`, `focus`. This file maps a
   kind to the renderer's kind of draw. Nothing here schedules a frame. No JSON. */
import { easeOf } from '/fxn-3d/scripts/lib/anim-sample.mjs';
import { uvSphere, torus, prism } from '/fxn-3d/js/render/world2-shapes.mjs';
import { boxShape } from './world2-pieces.mjs';
import { paintIdPlate } from './world2-plates.mjs';
import { loadPart, resolveRow, alongPts } from './world2-rows.mjs';

const TAU = Math.PI * 2, clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
/* ring-kit.js blockSet's material: satin with a clear coat, as the record tiles */
const BLOCK_MAT = { metal: .08, rough: .6, coat: .55, coatRough: .14, env: .75 };

/* a hexagon ring (identity-stages.js rimGeo: ExtrudeGeometry(hexShape(r outer, r inner), { depth })): corners up, from z 0 to depth. It is drawn as light, so it needs no winding or normals */
function hexRing(ro, ri, depth) {
  const pos = [], nrm = [], uv = [], idx = [], corner = (k, r, z) => { const a = Math.PI / 2 + k * TAU / 6; return [Math.cos(a) * r, Math.sin(a) * r, z]; };
  const quad = (a, b, c, d) => { const n = pos.length / 3; [a, b, c, d].forEach((p) => { pos.push(...p); nrm.push(0, 0, 1); uv.push(0, 0); }); idx.push(n, n + 1, n + 2, n, n + 2, n + 3); };
  for (let k = 0; k < 6; k++) {
    for (const z of [0, depth]) quad(corner(k, ro, z), corner(k + 1, ro, z), corner(k + 1, ri, z), corner(k, ri, z));
    quad(corner(k, ro, 0), corner(k + 1, ro, 0), corner(k + 1, ro, depth), corner(k, ro, depth));
    quad(corner(k, ri, 0), corner(k + 1, ri, 0), corner(k + 1, ri, depth), corner(k, ri, depth));
  }
  return { pos, nrm, uv, idx };
}
/* TorusGeometry(1, tube, 6, 72, TAU * .8) laid flat (rotateX): an arc of four fifths of a circle */
function arcTorus(tube, major, minor, arc) {
  const pos = [], nrm = [], uv = [], idx = [];
  for (let j = 0; j <= minor; j++) for (let i = 0; i <= major; i++) {
    const u = i / major * TAU * arc, v = j / minor * TAU, cu = Math.cos(u), su = Math.sin(u), cv = Math.cos(v), sv = Math.sin(v);
    pos.push((1 + tube * cv) * cu, tube * sv, (1 + tube * cv) * su); nrm.push(cv * cu, sv, cv * su); uv.push(i / major, j / minor);
  }
  for (let j = 0; j < minor; j++) for (let i = 0; i < major; i++) { const a = j * (major + 1) + i, b = a + major + 1; idx.push(a, b + 1, a + 1, a, b, b + 1); }
  return { pos, nrm, uv, idx };
}

export function createIdRig(o) {
  const { world, R, blob, lines, palette, wake, pieces, meshes, list } = o;
  /* group: the R of the group's records. The identity steps are one group (`id`, parts p1... named by the step's digit); each how-it-works view is a group of its own (`rv`, `ly`...), whose
     words name each part's view (`pview`) and write a colour that is a mix of tones as weights (`mixtone`) */
  const group = o.group || 'id', S = world.stage, parts = world.parts[group] || [];
  const gatekeys = new Map(), staggers = {}, kinds = new Map(), tones = [], plates = new Map(), variants = new Map(), gates = new Map(), spots = {}, focus = {}, pviews = new Map(), beats = {}, keys = {}, stateIds = {}, current = {}, picks = {}, lifts = {}, rowgroups = {}, grouplifts = {};
  for (const c of lines) {
    if (c[0] === 'kind') kinds.set(c[1], { kind: c[2], args: c.slice(3).map((x) => (x === 'lit' || x === 'dots' || x === 'back' ? x : Number(x))) });
    else if (c[0] === 'tone') tones.push({ index: Number(c[1]), a: Number(c[3]), b: Number(c[4]), mix: Number(c[5]), scale: Number(c[6]) });
    else if (c[0] === 'mixtone') { const w = []; for (let k = 2; k + 1 < c.length; k += 2) w.push([Number(c[k]), Number(c[k + 1])]); tones.push({ index: Number(c[1]), weights: w }); }
    else if (c[0] === 'plate') { const at = c[1].indexOf('@'); if (at < 0) plates.set(c[1], c.slice(2)); else { const part = c[1].slice(0, at); (variants.get(part) || variants.set(part, {}).get(part))[c[1].slice(at + 1)] = c.slice(2); } }   /* part@state: the words of the plate in that state */
    else if (c[0] === 'stagger') (staggers[c[1]] || (staggers[c[1]] = {}))[c[2]] = { T: Number(c[3]), dur: Number(c[4]), d0: Number(c[5]), step: Number(c[6]), curve: Number(c[7]) };   /* part, axis: each row follows the axis at its own moment */
    else if (c[0] === 'gatekeys') { const k = []; for (let q = 3; q + 1 < c.length; q += 2) k.push([Number(c[q]), Number(c[q + 1])]); gatekeys.set(c[1], { pivot: Number(c[2]), keys: k }); }   /* part, the plane it grows from, then the stage weight and the scale it has there */
    else if (c[0] === 'gate') gates.set(c[1], { a: Number(c[2]), b: Number(c[3]), curve: Number(c[4]) });
    else if (c[0] === 'spot') (spots[c[1]] || (spots[c[1]] = [])).push({ id: c[2], p: [Number(c[3]), Number(c[4]), Number(c[5])], channel: c[6], min: Number(c[7]), state: c[8] || '', off: c[9] === '0', lt: c[10] === 'lt' });
    else if (c[0] === 'focus') focus[c[1]] = c.slice(2).map(Number);
    /* a part whose blocks lift together (measured's columns: the whole column under the pointer lifts): each row's group, and how far a group lifts (of a row's own height), how fast, and the channel that switches it off */
    else if (c[0] === 'rowgroup') rowgroups[c[1]] = c.slice(2);
    else if (c[0] === 'liftgroup') grouplifts[c[1]] = { frac: Number(c[2]), rate: Number(c[3]), off: c[4] };
    else if (c[0] === 'lift') lifts[c[1]] = { lift: Number(c[2]), rate: Number(c[3]) };   /* a touchable block set: how far a block lifts under the pointer (of its own height) and its follower's step per frame */
    else if (c[0] === 'pview') pviews.set(c[1], c[2]);
    else if (c[0] === 'beat') (beats[c[1]] || (beats[c[1]] = {}))[c[2]] = { cubes: c[3] === '1', rings: c[4] === '-' ? null : c.slice(4).map(Number) };
    else if (c[0] === 'statekey') keys[c[1]] = c[2];
    else if (c[0] === 'pick') (picks[c[1] + ':' + c[2]] || (picks[c[1] + ':' + c[2]] = []))[Number(c[3])] = { name: c[4], act: c[5], view: c[6], key: c[7], value: c[8], replace: c[9] === '1' };   /* what a touch on block j says and does in a state */
    /* pickp: the same for a view with more than one touchable part: the part, the instance, the words and the hook the page listens to (stagePick: the kind and the id the stage names) */
    else if (c[0] === 'pickp') (picks[c[1] + ':' + c[2] + ':' + c[3]] || (picks[c[1] + ':' + c[2] + ':' + c[3]] = []))[Number(c[4])] = { name: c[5], act: c[6], hook: c[7], key: c[8], value: c[9], replace: c[10] === '1' };
    else if (c[0] === 'stateid') (stateIds[c[1]] || (stateIds[c[1]] = {}))[c[3]] = c[2];
  }
  const viewOf = (name) => pviews.get(name) || ['idstart', 'idsign', 'idsafe', 'idyou', 'idvalue'][Number(name[1]) - 1];

  /* ---------- the palette: the renderer's tones, then the mixes the stage names (graphite, dark, deep, teal ...) after them ---------- */
  let palFor = null, palOut = null;
  function pal() {
    const base = palette();
    if (base === palFor) return palOut;
    palFor = base; const n = base.length / 3;
    palOut = new Float32Array((Math.max(n, ...tones.map((t) => t.index + 1))) * 3); palOut.set(base);
    for (const t of tones) for (let k = 0; k < 3; k++) {
      if (t.weights) { let v = 0; for (const [i, w] of t.weights) v += palOut[i * 3 + k] * w; palOut[t.index * 3 + k] = v; }   /* weights on the base tones: a colour the stage mixed (lerps and scales are linear) */
      else { const a = palOut[t.a * 3 + k], b = palOut[t.b * 3 + k]; palOut[t.index * 3 + k] = (a + (b - a) * t.mix) * t.scale; }
    }
    return palOut;
  }

  /* ---------- shapes the renderer is given by name ---------- */
  /* a shape is given to the renderer once, whichever group asks for it first */
  const added = R.__idShapes || (R.__idShapes = new Set());
  const addShape = (name, make) => { if (added.has(name)) return; added.add(name); R.addShape(name, make()); };
  addShape('idsphere', () => uvSphere(10, 8)); addShape('idarc', () => arcTorus(.018, 72, 6, .8)); addShape('idtorus', () => torus(.1, 40, 6)); addShape('idhexring', () => hexRing(.8 * 1.1, .8 * 1.03, .02));

  /* ---------- the parts ---------- */
  const P = {}, order = [];
  for (const p of parts) {
    const k = kinds.get(p.part); if (!k) throw new Error('idrig: part ' + p.part + ' has no kind line in the group\'s words, so the renderer cannot draw it');
    const view = viewOf(p.part), a = k.args;
    let cfg;
    switch (k.kind) {
      case 'block': {   /* a bevelled block at its true size, drawn by the mesh pass; the lit program keeps its shadow only when the stage casts one */
        const box = [a[0], a[1], a[2], a[3]], shape = 'idbox:' + box.join(','), mat = a.length > 5 ? { metal: a[5], rough: a[6], coat: a[7], coatRough: a[8], env: a[9] } : BLOCK_MAT;   /* a stage that gave its set a material of its own */
        addShape(shape, () => boxShape(box[0], box[1], box[2], box[3]));
        cfg = a[4] ? { like: 'solid', shape, piece: { box, mat } } : { like: 'cube', pass: 'blend', piece: { box, mat } };
        break;
      }
      case 'glass': cfg = { like: 'cube', pass: 'blend', piece: { box: [a[0], a[1], a[2], a[3]], mat: { metal: 0, rough: .08, coat: 1, coatRough: .03, env: .35, opacity: .999 } } }; break;
      case 'mesh': cfg = { like: null, piece: { mesh: p.part, mat: BLOCK_MAT } }; break;
      case 'glassmesh': cfg = { like: null, piece: { mesh: p.part, mat: { metal: .15, rough: .25, coat: .8, coatRough: .15, env: 1, opacity: .999 } } }; break;   /* a plate of glass with holes (the download lens) */
      case 'text': cfg = { like: 'text' }; break;
      case 'glowcube': cfg = { like: 'glow', shape: 'cube', glow: [1, 0, 1], back: a[0] === 'back' }; break;   /* back: the shell of a glass block, its back faces only */
      case 'glowsphere': cfg = { like: 'glow', shape: 'idsphere', glow: [1, 0, 1] }; break;
      case 'sphere': cfg = { like: 'solid', shape: 'idsphere' }; break;   /* a small lit sphere (the nodes' status lights): the unit sphere, lit like any solid */
      case 'glowarc': cfg = { like: 'glow', shape: 'idarc', glow: [1, 0, 1] }; break;
      case 'glowtorus': cfg = { like: 'glow', shape: 'idtorus', glow: [1, 0, 1] }; break;
      case 'glowhex': cfg = { like: 'glow', shape: 'idhexring', glow: [1, 0, 1] }; break;
      case 'dots': case 'lit': cfg = { like: 'dot' }; break;
      /* a line: one row for each call of the stage's line (its ends, its count, its radius, its reveal), laid as beads each frame (ring-kit.js k.beads). args: kind (lit or dots), the stage's cap on
         beads of that kind in a frame, then each call's count */
      case 'pool': cfg = { like: 'pool' }; break;
      /* a point light (home-descent.js k.lights.ember): one row, its place, its colour, its strength as the alpha; nothing is drawn, the renderer lights the lit program by it (light()) */
      case 'plight': cfg = {}; break;
      /* the proof line: one control row (its alpha is how much of the line is drawn) and a row for each straight piece (its ends, the share of the line it starts and ends at, its width); laid as boxes cut to the reveal */
      case 'trail': cfg = { like: 'glow', shape: 'cube', glow: [1, 0, 1], trail: true }; break;
      case 'beads': cfg = { like: 'dot', beads: { kind: a[0], cap: a[1], counts: a.slice(2) } }; break;
      /* the outline of a box (a resolver whose grammar is not specified yet stands hollow): the twelve edges of each row's box, laid each frame as thin bars of light */
      case 'wire': cfg = { like: 'glow', shape: 'cube', glow: [1, 0, 1], wire: true }; break;
      /* a cylinder of its own segments, turned and sized by its row (CylinderGeometry): the unit prism has radius 1 and height 1 along y */
      case 'cyl': { const seg = a[0], shape = 'idcyl' + seg; addShape(shape, () => prism(Array.from({ length: seg }, (_, i) => [Math.sin(i * TAU / seg), Math.cos(i * TAU / seg)]))); cfg = { like: 'solid', shape }; break; }
      default: throw new Error('idrig: kind ' + k.kind + ' of part ' + p.part + ' is not one the renderer draws');
    }
    const e = loadPart(S, group, p, blob, cfg);
    /* a line's rows are calls; the beads they lay are another list, as long as the calls' counts together */
    e.beadCfg = cfg.beads || null;
    e.bead = e.beadCfg ? new Float32Array(Math.max(1, e.beadCfg.counts.reduce((x, y) => x + y, 0)) * 16) : cfg.trail ? new Float32Array(Math.max(1, e.per - 1) * 6 * 16) : cfg.wire ? new Float32Array(Math.max(1, e.per) * 12 * 16) : null;
    e.isTrail = !!cfg.trail; e.isWire = !!cfg.wire;
    e.view = view; e.buf = R.buffer(e.bead || e.out); e.part = null; e.local = new Float32Array(e.out.length);
    const own = e.entries[view] || [], base = own.find((q) => !q.axis);
    e.baseFrame = base ? base.first : 0; e.samples = {};
    for (const q of own) if (q.axis) (e.samples[q.axis] || (e.samples[q.axis] = [])).push(q);
    for (const l of Object.values(e.samples)) l.sort((x, y) => x.value - y.value);
    e.gate = gates.get(p.part) || null; e.gk = gatekeys.get(p.part) || null;   /* a part with no gate line is not scaled by the stage weight: its rows were sampled along `present` themselves */
    if (cfg.like) {
      e.part = { part: p.part, like: cfg.like, shape: cfg.shape, buffer: e.buf, offset: 0, count: 0, direct: true, pass: cfg.pass, glow: cfg.glow, noShadow: !cfg.shape || cfg.like !== 'solid', back: !!cfg.back, cpu: (e.bead || e.out).buffer };
      if (cfg.like === 'dot') e.part.soft = cfg.beads ? 3 : 0;   /* a line's beads are flat spheres in Three.js (MeshBasicMaterial): a solid disc, not the soft sprite of the network's dots */
    }
    if (pieces && cfg.piece) {
      try { e.piece = cfg.piece.mesh ? pieces.addMesh(p.part, meshes[p.part], cfg.piece, e.out) : pieces.add(p.part, cfg.piece, e.out); if (e.part) e.part.piece = true; }
      catch (err) { if (window.console) console.warn('[world2] ' + p.part + ' is not drawn by the mesh pass (' + err.message + ')'); }
    }
    e.isLight = k.kind === 'plight'; e.pick = !!p.pick; e.lift = lifts[p.part] || null; e.hov = e.lift ? new Float32Array(e.per) : null; e.groups = rowgroups[p.part] || null; e.gl = grouplifts[p.part] || null; e.gh = e.gl && e.groups ? {} : null;
    P[p.part] = e; order.push(e);
  }
  const byView = {}; order.forEach((e) => (byView[e.view] || (byView[e.view] = [])).push(e));
  const inList = new Set();

  /* ---------- rows: the rest plus what each channel adds, then the stage weight's window ---------- */
  const B0 = new Float32Array(16), B = new Float32Array(16), SM = new Float32Array(16), LO = new Float32Array(16), HI = new Float32Array(16);
  function evaluate(e, live) {
    let g = e.gate ? Math.max(1e-4, easeOf(e.gate.curve, clamp01((live.present - e.gate.a) / (e.gate.b - e.gate.a)))) : 1;
    if (e.gk) { const ks = e.gk.keys; let k = 0; while (k + 2 < ks.length && ks[k + 1][0] <= live.present) k++; const a = ks[k], b = ks[k + 1], t = clamp01((live.present - a[0]) / (b[0] - a[0])); g = Math.max(1e-4, a[1] + (b[1] - a[1]) * t); }
    const local = e.local, P_ = pal();
    for (let n = 0; n < e.kept.length; n++) {
      const i = e.kept[n], o = i * 16;
      resolveRow(e, e.baseFrame, i, B0, P_); for (let k = 0; k < 16; k++) B[k] = B0[k];
      for (const c in e.samples) {
        let v = live[c] == null ? 0 : live[c];
        const sg = staggers[e.name] && staggers[e.name][c];
        if (sg) {   /* a row that flies at its own moment: the channel runs 0 to 1 over T ms, the row's own flight starts at d0 + step x its number and takes dur, eased by the curve; a channel that falls runs the same clock back */
          const delay = sg.d0 + i * sg.step;
          v = live['up_' + c] === 0 ? 1 - easeOf(sg.curve, clamp01(((1 - v) * sg.T - delay) / sg.dur)) : easeOf(sg.curve, clamp01((v * sg.T - delay) / sg.dur));
        }
        alongPts(e, e.samples[c], v, i, SM, P_, LO, HI); for (let k = 0; k < 16; k++) B[k] += SM[k] - B0[k];
      }
      if (g !== 1) { for (let k = 0; k < 9; k++) B[k] *= g; if (e.gk) B[10] = e.gk.pivot + (B[10] - e.gk.pivot) * g; }
      for (let k = 0; k < 16; k++) local[o + k] = B[k];
    }
  }

  /* the beads of a line (ring-kit.js k.beads line(a, c, count, reveal, r)): from the call's row, `count` beads from a to c, each growing in as the reveal passes it (ease.back), each a point of diameter 2 s.
     The stage drew at most `cap` beads of a kind in a frame, in the order of its calls: so the beads past it are not drawn here either */
  const back = (x) => { const c = 1.4; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  function lay(e, used) {
    const cfg = e.beadCfg, L = e.local, out = e.bead, cap = out.length / 16; let n = 0;
    for (let i = 0; i < e.per; i++) {
      const o = i * 16, count = Math.round(L[o + 6]), reveal = L[o + 15];
      if (!(count >= 1)) continue;
      for (let q = 0; q < count && (used[cfg.kind] || 0) < cfg.cap && n < cap; q++) {
        used[cfg.kind] = (used[cfg.kind] || 0) + 1;
        const u = count > 1 ? q / (count - 1) : 0, g = clamp01((reveal * (count + 2) - q) / 2), s = g <= 0 ? 1e-4 : L[o + 7] * back(g) * 2, d = n * 16;
        out[d] = s; out[d + 1] = 0; out[d + 2] = 0; out[d + 3] = 0; out[d + 4] = s; out[d + 5] = 0; out[d + 6] = 0; out[d + 7] = 0; out[d + 8] = s;
        out[d + 9] = L[o] + (L[o + 3] - L[o]) * u; out[d + 10] = L[o + 1] + (L[o + 4] - L[o + 1]) * u; out[d + 11] = L[o + 2] + (L[o + 5] - L[o + 2]) * u;
        out[d + 12] = L[o + 12]; out[d + 13] = L[o + 13]; out[d + 14] = L[o + 14]; out[d + 15] = 1; n++;
      }
    }
    return n;
  }

  /* the proof line's boxes: each piece from its first end for the share of it the reveal has reached (home-descent.js lineMat: drawn up to `reveal`) */
  function layTrail(e) {
    /* the Three.js shader brightens the line's head while it rises: gain x (1 + 1.6 x smoothstep(reveal - .08, reveal, u)), off once the reveal is whole. The head is laid as four boxes whose colour
       follows that ramp; the rest of the line is one box for each straight piece, as before. */
    const L = e.local, out = e.bead, reveal = L[15], running = reveal < .999, HEAD = .08; let n = 0;
    const cap = out.length / 16;
    for (let i = 1; i < e.per; i++) {
      const o = i * 16, u0 = L[o + 6], u1 = L[o + 7], span = Math.max(1e-9, u1 - u0), f = clamp01((reveal - u0) / span);
      if (!(f > 0)) continue;
      const dx = L[o + 3] - L[o], dy = L[o + 4] - L[o + 1], dz = L[o + 5] - L[o + 2], len = Math.hypot(dx, dy, dz); if (len < 1e-9) continue;
      const ux = dx / len, uy = dy / len, uz = dz / len, w = L[o + 8];
      /* a frame round the piece: the first axis along it, the others any two at right angles */
      let px = 0, py = 1, pz = 0; if (Math.abs(uy) > .9) { px = 1; py = 0; }
      let ax = uy * pz - uz * py, ay = uz * px - ux * pz, az = ux * py - uy * px; const al = Math.hypot(ax, ay, az); ax /= al; ay /= al; az /= al;
      const bx = uy * az - uz * ay, by = uz * ax - ux * az, bz = ux * ay - uy * ax;
      /* the stretches of this piece [from, to] (shares of the piece) and the brightness each has */
      const cuts = [];
      if (running && reveal - HEAD < u1) {
        const hs = clamp01((reveal - HEAD - u0) / span);
        if (hs > 0) cuts.push([0, hs, 1]);
        const lo = Math.max(hs, 0), hi = f;
        for (let q = 0; q < 4; q++) { const a0 = lo + (hi - lo) * q / 4, a1 = lo + (hi - lo) * (q + 1) / 4, u = u0 + span * (a0 + a1) / 2, t = clamp01((u - (reveal - HEAD)) / HEAD); if (a1 > a0) cuts.push([a0, a1, 1 + 1.6 * t * t * (3 - 2 * t)]); }
      } else cuts.push([0, f, 1]);
      for (const [a0, a1, k] of cuts) {
        if (n >= cap) break;
        const d = n * 16, l = len * (a1 - a0), mid = (a0 + a1) / 2;
        out[d] = ux * l; out[d + 1] = uy * l; out[d + 2] = uz * l; out[d + 3] = ax * w; out[d + 4] = ay * w; out[d + 5] = az * w; out[d + 6] = bx * w; out[d + 7] = by * w; out[d + 8] = bz * w;
        out[d + 9] = L[o] + dx * mid; out[d + 10] = L[o + 1] + dy * mid; out[d + 11] = L[o + 2] + dz * mid;
        out[d + 12] = L[o + 12] * k; out[d + 13] = L[o + 13] * k; out[d + 14] = L[o + 14] * k; out[d + 15] = 1; n++;
      }
    }
    return n;
  }

  /* the edges of each row's box: for each of the three axes, four bars along it at the corners of the other two. A bar is the axis's full length and WIRE_T thick (a line of the stage's was one pixel wide); the
     colour is the row's, at the material's opacity (the row's alpha) */
  const WIRE_T = .01;
  function layWire(e) {
    const L = e.local, out = e.bead; let n = 0;
    for (let i = 0; i < e.per; i++) {
      const o = i * 16, op = L[o + 15]; if (!(op > 1e-4)) continue;
      const ax = [[L[o], L[o + 1], L[o + 2]], [L[o + 3], L[o + 4], L[o + 5]], [L[o + 6], L[o + 7], L[o + 8]]], c = [L[o + 9], L[o + 10], L[o + 11]];
      for (let a = 0; a < 3; a++) {
        const A = ax[a], B = ax[(a + 1) % 3], C = ax[(a + 2) % 3], lb = Math.hypot(B[0], B[1], B[2]) || 1, lc = Math.hypot(C[0], C[1], C[2]) || 1;
        for (const sb of [-.5, .5]) for (const sc of [-.5, .5]) {
          const d = n * 16;
          out[d] = A[0]; out[d + 1] = A[1]; out[d + 2] = A[2];
          out[d + 3] = B[0] / lb * WIRE_T; out[d + 4] = B[1] / lb * WIRE_T; out[d + 5] = B[2] / lb * WIRE_T;
          out[d + 6] = C[0] / lc * WIRE_T; out[d + 7] = C[1] / lc * WIRE_T; out[d + 8] = C[2] / lc * WIRE_T;
          out[d + 9] = c[0] + B[0] * sb + C[0] * sc; out[d + 10] = c[1] + B[1] * sb + C[1] * sc; out[d + 11] = c[2] + B[2] * sb + C[2] * sc;
          out[d + 12] = L[o + 12] * op; out[d + 13] = L[o + 13] * op; out[d + 14] = L[o + 14] * op; out[d + 15] = 1; n++;
        }
      }
    }
    return n;
  }

  /* ---------- the words on the plates, painted once ---------- */
  let themeKey = 0;
  function paint() {
    themeKey++;
    for (const [name, base] of plates) {
      const e = P[name]; if (!e || !e.part) continue;
      const spec = (variants.get(name) && variants.get(name)[current[e.view]]) || base, cv = paintIdPlate(spec);
      if (e.part.tex) R.dropTexture(e.part.tex);
      e.part.tex = 'id' + name + ':' + themeKey + ':' + spec.join('|'); R.setTexture(e.part.tex, cv);
    }
  }
  paint();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { paint(); wake(); });

  /* ---------- step and flush: a view is drawn while its stage weight is above nothing; the parts of the others are out of the draw list ---------- */
  const active = {};
  /* the block under the pointer: ring-kit.js blockSet lifts it by `lift` of its own height, its follower closing .16 of the way per frame at 60 frames a second */
  let hoverPart = null, hoverRow_ = -1, hovAt = 0, hovMoving = false;
  function hoverRow(part, i) { if (part === hoverPart && i === hoverRow_) return false; hoverPart = part; hoverRow_ = i; return true; }
  function stepHover(e, live, now, reduced) {
    const dt = hovAt ? Math.min(100, now - hovAt) : 16.667;
    for (let n = 0; n < e.kept.length; n++) {
      const i = e.kept[n], want = e.name === hoverPart && i === hoverRow_ && live.present > .9 ? 1 : 0, d = want - e.hov[i];
      if (reduced) e.hov[i] = want; else if (Math.abs(d) > .002) { e.hov[i] += d * (1 - Math.pow(1 - e.lift.rate, dt / 16.667)); hovMoving = true; } else e.hov[i] = want;
      if (e.hov[i] > 0) { const L = e.local, o = i * 16, h = e.hov[i] * e.lift.lift; L[o + 9] += L[o + 3] * h; L[o + 10] += L[o + 4] * h; L[o + 11] += L[o + 5] * h; }
    }
    /* the group under the pointer lifts whole: one follower for each group, closing at the group's own rate; the channel `off` (the Runs tab) takes the lift away */
    if (e.gh) {
      const gOf = e.name === hoverPart && hoverRow_ >= 0 && live.present > .9 ? e.groups[hoverRow_] : null, off = 1 - (live[e.gl.off] || 0);
      for (const g of new Set([...Object.keys(e.gh), ...(gOf != null ? [gOf] : [])])) {
        const want = g === gOf ? 1 : 0, cur = e.gh[g] || 0, d = want - cur;
        e.gh[g] = reduced ? want : Math.abs(d) > .002 ? (hovMoving = true, cur + d * (1 - Math.pow(1 - e.gl.rate, dt / 16.667))) : want;
      }
      for (const n of e.kept) {
        const g = e.groups[n], v = e.gh[g]; if (!(v > 0)) continue;
        const L = e.local, o = n * 16, h = v * off * e.gl.frac; L[o + 9] += L[o + 3] * h; L[o + 10] += L[o + 4] * h; L[o + 11] += L[o + 5] * h;
      }
    }
  }
  function step(liveOf, now, reduced) {
    let any = false; hovMoving = false; const t = now == null ? performance.now() : now;
    for (const view in byView) {
      const live = liveOf(view), on = !!live && live.present > 1e-3;
      active[view] = on;
      if (!on) continue;
      any = true;
      for (const e of byView[view]) { evaluate(e, live); if (e.hov) stepHover(e, live, t, !!reduced); e.cur = e.local; }
    }
    hovAt = hovMoving ? t : 0;
    return any;
  }
  function sync() {
    for (const view in byView) for (const e of byView[view]) {
      if (!e.part) continue;
      const at = list.indexOf(e.part);
      if (active[view] && at < 0) list.push(e.part);
      else if (!active[view] && at >= 0) list.splice(at, 1);
    }
  }
  function flush() {
    sync();
    for (const view in byView) {
      const used = {};
      for (const e of byView[view]) {
      const on = active[view];
      if (e.isWire) {
        const n = on ? layWire(e) : 0;
        if (e.part) { e.part.count = n; e.part.c = null; if (on) R.updateBuffer(e.buf, e.bead, 0); }
        continue;
      }
      if (e.isTrail) {
        const n = on ? layTrail(e) : 0;
        if (e.part) { e.part.count = n; e.part.c = null; if (on) R.updateBuffer(e.buf, e.bead, 0); }
        continue;
      }
      if (e.beadCfg) {
        const n = on ? lay(e, used) : 0;
        if (e.part) { e.part.count = n; e.part.c = null; if (on) R.updateBuffer(e.buf, e.bead, 0); }
        continue;
      }
      if (on) e.out.set(e.local);
      let any = false;
      if (on) for (let i = 0; i < e.per; i++) if (e.out[i * 16 + 15] > 1e-4) { any = true; break; }
      if (e.part) { e.part.count = any ? e.per : 0; e.part.c = null; if (on) R.updateBuffer(e.buf, e.out, 0); }
      if (e.piece) pieces.write(e.piece, e.out, any ? e.per : 0);
      }
    }
  }
  /* the point light a view casts (the trace's ember): { pos, color, intensity (share of the look's emberlight) } while the view is drawn and the light is on, else null */
  function light() {
    for (const e of order) {
      if (!e.isLight || !active[e.view]) continue;
      const L = e.local, i = e.kept[0], o = i * 16;
      if (L && L[o + 15] > 1e-4) return { pos: [L[o + 9], L[o + 10], L[o + 11]], color: [L[o + 12], L[o + 13], L[o + 14]], intensity: L[o + 15] };
    }
    return null;
  }
  /* the labels' places: a point of the world, and whether the view's channel has passed the threshold that shows it */
  function spotsOf(view, value, state) { return (spots[view] || []).filter((s) => !s.state || s.state === state).map((s) => ({ id: s.id, p: s.p, on: !s.off && (!s.channel || (s.lt ? value(s.channel) < s.min : value(s.channel) > s.min)) })); }
  function repaint() { paint(); }
  /* the view's state changed: a plate whose words depend on it (the descent's card) is painted again */
  function stateIs(view, name) { if (current[view] === name) return; current[view] = name; if (variants.size) paint(); }
  /* a how-it-works view's beats: the rings the state lights and whether it lights the computers (the stage's own focusOn), and the page key its state is read from */
  return { P, order, group, spotsOf, focusOf: (view) => focus[view] || null, beatOf: (view, state) => (beats[view] && beats[view][state]) || null, keyOf: (view) => keys[view] || 's', pickOf: (view, state, j, part) => (part && picks[view + ':' + state + ':' + part] ? picks[view + ':' + state + ':' + part][j] : (picks[view + ':' + state] || [])[j]) || null, pickParts: (view) => order.filter((e) => e.view === view && e.part && e.pick).map((e) => e.part), stateOfKey: (view, value) => (stateIds[view] && stateIds[view][String(value)]) || null, stateIs, views: () => [...new Set([...Object.keys(byView), ...Object.keys(keys)])],   /* a view with no rows of its own (the board's status: a camera over the network) is still this group's view, named by its statekey */ step, flush, repaint, light, hoverRow, hoverMoving: () => hovMoving, activeOf: (view) => !!active[view] };
}
