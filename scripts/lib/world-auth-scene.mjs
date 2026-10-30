/* The auth stage as rows (docs/design/world-grammar/PORT.md batch 1, "auth: the glow, the orbit rings, the loose cubes, the status panels").
   Build side, Node built-ins only. scripts/lib/stage-src/auth-stage.js draws the sign-in view of /auth around the card that stands on the kernel's beam:
     the glow       the card's lit edge (two frames of four bars) in the base colour, turning to --danger as a state goes bad, at 1.8 x glow
     orbit rings    two rings round the card, tilted, that come in as `orbit` rises (the first at .5, the second at 1)
     loose cubes    twelve glass cubes round the kernel: they gather in toward the card with `gather` and drift out with `broken`
     loose pieces   fourteen small cubes that leave the card's top right corner as the card breaks or while it is still being made (`loose`)
     status panels  two panes of glass, each ONE polygon with a round hole per status line, a lit bead behind each hole, and the state's own words on its face
   The owner's card (world/card.flx, MESH.md) is the card here, so the card's own body, edge and face are not rows; the glow is laid round its measured size.
   Every number below is a name that auth-stage.js holds, and sourceGuard() refuses to write when the text that holds it has changed.

   A stage that moves is written as samples: a part's rows are evaluated at every channel at 0 (its base frame) and then along each channel it depends on, one channel at a time;
   the browser lays a row's channels back together as base + sum over channels of (sample at the channel's value - base). That is exact for what is affine in a channel (a place that
   moves with `gather`) and for what is piecewise linear in it (a ring that grows for the first half of `orbit` and then stays), because the samples are taken at the pieces' knots.
   A part that wears the card's pose (the glow, the loose pieces) is written in the card's own units and laid on the card by the stage (WATTACH). Nothing is typed twice by hand. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { TAU, D2R, clamp01, lerp, TONES, mul, chain, T, S, RX, RY, RZ, euler, row, hidden } from './world-rows.mjs';
import { writeBlob, boundsOf, sha } from './fxn-3d.mjs';
import { extrudeLoops } from './world-glass-mesh.mjs';
import { stageSrc } from './stage-src.mjs';

export const AUTH_PARTS = ['aglow', 'aorbit0', 'aorbit1', 'acube', 'abits', 'apanel0', 'apanel1', 'abead', 'atop', 'atext0', 'atext1'];
/* the channels of a state of the stage (auth-stage.js POSE) and the two this port adds: loose = max(broken, 1 - build), the pieces' share, and present, the stage's own fade */
export const AUTH_CHANNELS = ['lift', 'tip', 'glow', 'orbit', 'beam', 'gather', 'broken', 'build', 'bad', 'loose'];

function sourceGuard(file, needles) {
  const src = fs.readFileSync(file, 'utf8');
  for (const n of needles) if (!src.includes(n)) throw new Error(path.basename(file) + ' no longer holds "' + n + '", so the auth rows cannot be derived from it. Re-read the stage file, update scripts/lib/world-auth-scene.mjs to the new text, and run the encoder again.');
  return src;
}
const lift = (src, re, what) => { const m = re.exec(src); if (!m) throw new Error('scripts/lib/stage-src/auth-stage.js: ' + what + ' was not found, so the auth rows cannot be derived from it'); return vm.runInNewContext('(' + m[1] + ')'); };

/* a plate with round holes, one extruded polygon: the outline (a rounded rectangle) and its holes (circles) pulled from z = -depth / 2 to +depth / 2. Caps are triangulated
   with the holes bridged in; the walls of the outline and of every hole are flat quads with their own normals. Returns the shaded stream a blob is written from. */
export function plateWithHoles(w, h, r, holes, depth, seg = 20, hseg = 24) {
  const outline = [];
  const corner = (cx, cy, a0) => { for (let i = 0; i <= seg; i++) { const a = a0 + i / seg * Math.PI / 2; outline.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  corner(w / 2 - r, h / 2 - r, 0); corner(-w / 2 + r, h / 2 - r, Math.PI / 2); corner(-w / 2 + r, -h / 2 + r, Math.PI); corner(w / 2 - r, -h / 2 + r, Math.PI * 1.5);
  const loops = holes.map(([cx, cy, hr]) => [...Array(hseg).keys()].map(i => { const a = -i / hseg * TAU; return [cx + Math.cos(a) * hr, cy + Math.sin(a) * hr]; }));   /* clockwise */
  return extrudeLoops(outline, loops, depth);
}

/* o: { cast, site, num } and the card's records and blob (world/card.flx and the MESH blob it names) */
export function authScene(o) {
  const { cast, site } = o;
  const file = stageSrc('auth-stage.js');
  const src = sourceGuard(file, [
    'var RH = W.HUB.R, CH = RH * 1.32, CW = CH * .7, CD = CH * .1, CY = CH * .5 + RH * .5, PS = RH * .42;',
    'card.position.set(HUBC.x, CY + (live.lift - tip * .5) * RH * .3, HUBC.z);', 'card.scale.setScalar(.4 + .6 * live.build);',
    'var BITS = 14, bitGeo', 'var u = b / BITS, r = .4 + ((b * 37) % 11) / 11 * .9;', 'var bu = CW / 2.5;',
    'BIT.push({ from: V(CW / 2 - bu * (.2 + (b % 3) * .18), CH / 2 - bu * (.2 + ((b * 5) % 4) * .18), 0), to: V(CW / 2 + bu * (.25 + Math.cos(u * 3) * r), CH / 2 - bu * (.1 + u * 1.6 - Math.sin(b) * .3), bu * (.2 + (b % 4) * .18)), s: bu * (.1 + ((b * 7) % 5) * .035) });',
    'var loose = Math.max(live.broken, 1 - live.build);', 'u = Math.min(1, Math.max(0, loose * 1.4 - i / BITS * .4)), sz = bt.s * Math.max(1e-4, u > .01 ? 1 : 0);',
    'P.copy(bt.from).lerp(bt.to, u); P.x += (shapeNow().w - CW) / 2; P.y += (shapeNow().h - CH) / 2; Q.setFromEuler(E.set(u * i, u * i * .7, 0));',
    '[[CW * .92, .028, 1.42, .25], [CW * 1.05, .02, 1.28, -.5]].forEach', 'new THREE.TorusGeometry(o[0], o[1] * CW / 2.5, 8, 160)',
    'var on = j === 0 ? Math.min(1, live.orbit * 2) : Math.max(0, live.orbit * 2 - 1);', 'ring.scale.setScalar((.85 + .15 * on)', 'ring.rotation.set(ring.userData.tilt, 0, spin * (j ? -1.3 : 1) + ring.userData.turn + (j ? -.18 : .12));',
    'var CUBES = 12', 'var ang = q / CUBES * TAU + .3, rad = RH * (1.25 + (q % 3) * .3), y = RH * (.3 + ((q * 5) % 7) * .28);', 'CUBE.push({ a: ang, r: rad, y: y, s: RH * (.08 + ((q * 3) % 4) * .025), warm: q % 3 !== 1, spin: q * .7 });',
    'r = cu.r * (1 - .32 * live.gather) + live.broken * .6, yy = cu.y + live.gather * .35 * Math.sin(cu.a * 2) - live.broken * .5;', 'P.set(HUBC.x + Math.cos(cu.a) * r, yy, HUBC.z + Math.sin(cu.a) * r * .75);',
    'Q.setFromEuler(E.set(cu.spin, cu.spin * 1.3 + spin * .4, cu.spin * .5));', 'spin += dt * .0012;', "if ((state === 'verify' || (state === 'create' && cb >= 6)) && !k.reduced)", '.7 + .3 * Math.sin(now / 220 + l)', 'r === \'run\' ? 2.2 * glow', 'var left = panel(2.2, 1.55, 3), right = panel(2.3, 1.55, 3);',
    'shape = G.roundRect(new THREE.Shape(), -w / 2, -h / 2, w, h, .12), ports = [];', 'var py = h / 2 - .62 - i * .34; shape.holes.push(G.circle(w / 2 - .26, py, .065)); ports.push(py);',
    'G.plate(shape, { color: C.dark, opacity: .78, depth: .05 })', 'new THREE.SphereGeometry(.05, 12, 8)', 'm.position.set(w / 2 - .26, py, -.08)', 'words.position.z = .04;', 'new THREE.BoxGeometry(w * .3, .018, .018)', 'top.position.set(-w * .35, h / 2, .03)',
    'left.g.position.set(HUBC.x - RH * 1.12, CY + RH * .62, HUBC.z + RH * .2); left.g.rotation.set(-.05, yaw + .35, .04); left.g.scale.setScalar(PS);', 'right.g.position.set(HUBC.x + RH * 1.22, CY + RH * .05, HUBC.z + RH * .35); right.g.rotation.set(-.05, yaw - .3, -.03); right.g.scale.setScalar(PS);',
    'var yaw = -14 * W.D2R;', "edgeMat.color.copy(C.primary).lerp(C.danger, Math.max(0, Math.min(1, live.bad))).multiplyScalar(1.8 * live.glow);",
    'frameBars(g, w * 1.008, h * 1.006, d * .52, w * .016);', 'frameBars(g, w * inset, h * (1 - (1 - inset) * w / h), d * .67, w * .009);', 'var plain = shape(CW, CH, CD, .84, 512, 720, true)',
    'function beadTone(p, rows, i, glow) {', "writePanel(left, 'FXN ID', SAY[state]);", "writePanel(right, 'DEFXN network', [[net || 'Network', net ? 'on' : 'dim'],", "state === 'connected' ? 'Signing as you' : 'No signer'", "m.color.copy(r === 'bad' ? C.danger : C.primary).multiplyScalar(r === 'dim' ? .25 : r === 'run' ? 2.2 * glow : 1.6);", "left.top.material.color.copy(C.primary).multiplyScalar(1.6)"
  ]);
  const STATES = lift(src, /var STATES = (\[[^\]]*\]);/, 'STATES'), POSE = lift(src, /var POSE = (\{[\s\S]*?\n  \});/, 'POSE');
  const SAY = lift(src, /var SAY = (\{[\s\S]*?\n  \});/, 'SAY'), NET = lift(src, /var NET = (\{[^}]*\});/, 'NET');
  const BUILD = lift(src, /build: (\[[^\]]*\])\[Math\.min\(6, cb\)\]/, 'the create wizard\'s build steps');

  /* the clock of the view (the two motions that run while their cause runs): the rings and cubes turn at `rate` radians-of-spin per ms while the file opens (verify, or the create wizard's last step),
     the cubes by .4 of it about their middle axis; the running status beads pulse as .7 + .3 sin(now / period + line) */
  const rate = +/spin \+= dt \* ([\d.]+);/.exec(src)[1], cubeK = +/cu\.spin \* 1\.3 \+ spin \* ([\d.]+)/.exec(src)[1], last = +/cb >= (\d)\)\) && !k\.reduced/.exec(src)[1];
  const pm = /\.(\d) \+ \.(\d) \* Math\.sin\(now \/ (\d+) \+ l\)/.exec(src), clock = { rate, cubeK, spinStates: ['verify', 'create' + last], pulseMean: +('.' + pm[1]), pulseAmp: +('.' + pm[2]), pulsePeriod: +pm[3] };
  const HUB = cast.HUB, HUBC = HUB.c, RH = HUB.R, CH = RH * 1.32, CW = CH * .7, CD = CH * .1, CY = CH * .5 + RH * .5, PS = RH * .42;
  const D = 14 * D2R;   /* yaw = -14 degrees */

  /* the card as the owner made it: its place and the half extents of its blob (the measured size the glow is laid round) */
  const card = o.card, s = card.height / (2 * card.half[1]), W_M = 2 * card.half[0] * s, H_M = card.height, D_M = 2 * card.half[2] * s;

  /* a colour is (tone, family, share): palette indexes, and how far the first leans to the second */
  const PRIMARY = [TONES.primary, 0, 0], DANGER = [TONES.danger, 0, 0], STEEL = [TONES.canvas, TONES.muted, .45], DARK = [TONES.canvas, TONES.other, .3];
  const R_ = (m, t, alpha) => row(m, t[0], t[1], t[2], alpha);
  const bars = (cx, cy, w, h, z, t, tn, alpha) => [[0, h / 2, w, t], [0, -h / 2, w, t], [-w / 2, 0, t, h], [w / 2, 0, t, h]].map(b => R_(chain(T(cx + b[0], cy + b[1], z), S(b[2], b[3], t)), tn, alpha));

  /* ---------- the rows of a part for given channel values and state ---------- */
  const V0 = { lift: 0, tip: 0, glow: 0, orbit: 0, gather: 0, broken: 0, loose: 0, bad: 0, cspin: 0 };
  const parts = {};
  /* the glow: the card's two lit frames (auth-stage.js shape()): outer w x 1.008, h x 1.006 at .52 of the depth, bars .016 w thick; inner at the bezel's inset .84 */
  parts.aglow = (v) => {
    const inset = .84, a = 1.8 * v.glow, tn = [TONES.primary, TONES.danger, clamp01(v.bad)];   /* the edge leans from the base colour to --danger as the state goes bad */
    return [...bars(0, 0, W_M * 1.008, H_M * 1.006, D_M * .52, W_M * .016, tn, a), ...bars(0, 0, W_M * inset, H_M * (1 - (1 - inset) * W_M / H_M), D_M * .67, W_M * .009, tn, a)];
  };
  /* the orbit rings: round the card's place (it rises with `lift` and sinks with half of `tip`), tilted, the second one only above half of `orbit` */
  const RINGS = [[CW * .92, .028, 1.42, .25], [CW * 1.05, .02, 1.28, -.5]];
  const orbit = (j) => (v) => {
    const on = j === 0 ? Math.min(1, v.orbit * 2) : Math.max(0, v.orbit * 2 - 1), o4 = RINGS[j], r = o4[0] * (.85 + .15 * on);
    const p = [HUBC.x, CY + (v.lift - v.tip * .5) * RH * .3, HUBC.z];
    return [R_(chain(T(p[0], p[1], p[2]), RX(o4[2]), RZ(o4[3] + (j ? -.18 : .12)), RX(Math.PI / 2), S(r, r, r)), PRIMARY, 1.9 * on)];
  };
  parts.aorbit0 = orbit(0); parts.aorbit1 = orbit(1);
  /* the loose cubes: twelve, round the kernel, glass in the base colour or steel */
  const CUBES = 12, CUBE = [];
  for (let q = 0; q < CUBES; q++) CUBE.push({ a: q / CUBES * TAU + .3, r: RH * (1.25 + (q % 3) * .3), y: RH * (.3 + ((q * 5) % 7) * .28), s: RH * (.08 + ((q * 3) % 4) * .025), warm: q % 3 !== 1, spin: q * .7 });
  parts.acube = (v) => CUBE.map(cu => {
    const r = cu.r * (1 - .32 * v.gather) + v.broken * .6, yy = cu.y + v.gather * .35 * Math.sin(cu.a * 2) - v.broken * .5;
    return R_(chain(T(HUBC.x + Math.cos(cu.a) * r, yy, HUBC.z + Math.sin(cu.a) * r * .75), euler(cu.spin, cu.spin * 1.3 + (v.cspin || 0), cu.spin * .5), S(cu.s, cu.s, cu.s)), cu.warm ? PRIMARY : STEEL, .92);
  });
  /* the loose pieces: fourteen small cubes at the card's top right corner, in the card's own units (the plain card's: width CW, height CH) */
  const BITS = 14, BIT = [], bu = CW / 2.5;
  for (let b = 0; b < BITS; b++) {
    const u = b / BITS, r = .4 + ((b * 37) % 11) / 11 * .9;
    BIT.push({ from: [CW / 2 - bu * (.2 + (b % 3) * .18), CH / 2 - bu * (.2 + ((b * 5) % 4) * .18), 0], to: [CW / 2 + bu * (.25 + Math.cos(u * 3) * r), CH / 2 - bu * (.1 + u * 1.6 - Math.sin(b) * .3), bu * (.2 + (b % 4) * .18)], s: bu * (.1 + ((b * 7) % 5) * .035) });
  }
  parts.abits = (v) => BIT.map((bt, i) => {
    const u = Math.min(1, Math.max(0, v.loose * 1.4 - i / BITS * .4)), sz = bt.s * Math.max(1e-4, u > .01 ? 1 : 0);
    const p = [0, 1, 2].map(k => lerp(bt.from[k], bt.to[k], u));
    return u > .01 ? R_(chain(T(p[0], p[1], p[2]), euler(u * i, u * i * .7, 0), S(sz, sz, sz)), PRIMARY, 1) : hidden(null, TONES.primary);
  });
  /* the status panels: two panes at fixed places, a lit bead behind each of their three round ports, a bar of light on the top edge, the state's words laid on the face */
  const PANELS = [{ w: 2.2, h: 1.55, p: [HUBC.x - RH * 1.12, CY + RH * .62, HUBC.z + RH * .2], e: [-.05, -D + .35, .04] }, { w: 2.3, h: 1.55, p: [HUBC.x + RH * 1.22, CY + RH * .05, HUBC.z + RH * .35], e: [-.05, -D - .3, -.03] }];
  const panelM = (k) => { const q = PANELS[k]; return chain(T(q.p[0], q.p[1], q.p[2]), euler(q.e[0], q.e[1], q.e[2]), S(PS, PS, PS)); };
  const PLATE_Z = .025;   /* the plate spans z = -.03 .. .08 (extrusion .05 and a .03 bevel each side); the blob is centred, so the row carries its middle */
  const shapes = [];
  PANELS.forEach((q, k) => {
    const holes = [0, 1, 2].map(i => [q.w / 2 - .26, q.h / 2 - .62 - i * .34, .065]);
    const st = plateWithHoles(q.w, q.h, .12, holes, .11);
    const b = writeBlob(st, boundsOf(st.pos), [{ first: 0, count: st.idx.length, rgba: [255, 255, 255, 255], slot: 255, metal: 0, rough: 255 }]);
    shapes.push({ part: 'apanel' + k, bytes: b.bytes, cid: sha(b.bytes), verts: b.verts, indices: b.indices });
    parts['apanel' + k] = () => [R_(chain(panelM(k), T(0, 0, PLATE_Z)), DARK, .78)];
    parts['atext' + k] = () => [R_(chain(panelM(k), T(0, 0, .04), RX(Math.PI / 2), S(q.w, 1, q.h)), [TONES.text, 0, 0], 1)];
  });
  parts.atop = () => PANELS.map((q, k) => R_(chain(panelM(k), T(-q.w * .35, q.h / 2, .03), S(q.w * .3, .018, .018)), PRIMARY, 1.6));
  /* the lit beads, by state: on (1.6), running (the base, bright: 2.2 x .7 at the mean of its pulse), dim (.25) and bad (--danger, 1.6) */
  const beadRows = (state, net) => {
    const left = (SAY[state] || SAY.none).map(r => r[1]), right = [net ? 'on' : 'dim', state === 'connected' ? 'on' : 'dim', state === 'connected' ? 'on' : 'dim'];
    return [[0, left], [1, right]].flatMap(([k, tones]) => tones.map((tn, i) => {
      const q = PANELS[k], py = q.h / 2 - .62 - i * .34, gain = tn === 'dim' ? .25 : tn === 'run' ? 2.2 * .7 : 1.6;
      return R_(chain(panelM(k), T(q.w / 2 - .26, py, -.08), S(.1, .1, .1)), tn === 'bad' ? DANGER : PRIMARY, gain);
    }));
  };
  const wordsOf = (state) => ({ left: SAY[state] || SAY.none, net: NET[state] });

  return { clock, parts, V0, STATES, POSE, BUILD, SAY, NET, shapes, beadRows, wordsOf, dims: { W_M, H_M, D_M, CW, CH, RH, PS, CY }, PANELS };
}


/* ---------- the group's blob and records ----------
   channels: the samples each part is written at (the values of the channel, besides 0, at which its rows are evaluated); `static` parts have the base frame only; the beads are
   written per state (and per whether the page named a network). */
const SAMPLES = {
  aglow: { glow: [1], bad: [1] }, aorbit0: { lift: [1], tip: [1], orbit: [.5, 1] }, aorbit1: { lift: [1], tip: [1], orbit: [.5, 1] },
  acube: { gather: [1], broken: [1], cspin: Array.from({ length: 32 }, (_, k) => (k + 1) / 32 * TAU) }, abits: { loose: [...Array(20).keys()].map(k => (k + 1) / 20) },
  apanel0: {}, apanel1: {}, atop: {}, atext0: {}, atext1: {}
};
export function authRecords(scene, o) {
  const { num, stateNames } = o;
  const frames = [];   /* [{ part, rows }] */
  const buf = [], layout = [], rec = [];
  let atByte = 0;
  const canon = r => (r[15] > 1e-4 ? r : [1e-4, 0, 0, 0, 1e-4, 0, 0, 0, 1e-4, 0, 0, 0, r[12], r[13], r[14], 0]);
  const key = r => canon(r).map(x => Math.fround(x)).join(',');
  const rangesOf = kept => { const out = []; kept.forEach(i => { const l = out[out.length - 1]; if (l && l[0] + l[1] === i) l[1]++; else out.push([i, 1]); }); return out; };
  function write(name, unique, poses) {
    const kept = [...Array(unique[0].length).keys()].filter(i => unique.some(fr => fr[i][15] > 1e-4));
    const keptRows = unique.map(fr => kept.map(i => fr[i]));
    const pool = [], at = new Map(), table = [];
    for (const fr of keptRows) for (const r of fr) { const k = key(r); if (!at.has(k)) { at.set(k, pool.length); pool.push(canon(r)); } table.push(at.get(k)); }
    const rows = Buffer.alloc(pool.length * 64), idx = Buffer.alloc(Math.ceil(table.length * 2 / 64) * 64);
    pool.forEach((r, i) => { for (let k = 0; k < 16; k++) { if (!Number.isFinite(r[k])) throw new Error('auth part ' + name + ' holds a row that is not a number: ' + r.join(',')); rows.writeFloatLE(r[k], i * 64 + k * 4); } });
    table.forEach((v, i) => idx.writeUInt16LE(v, i * 2));
    rec.push(`WPART-Rrig-M${name}-O${atByte}-A${pool.length}`);
    for (const [a, n] of rangesOf(kept.length ? kept : [0])) rec.push(`WROWS-Rrig-M${name}-O${a}-A${n}`);
    for (const q of poses) rec.push(`WPOSE-Rauth-M${name}-I${q.first}-A1` + (q.axis ? `-N${q.axis}-X${num(q.value)}` : ''));
    buf.push(rows, idx); atByte += rows.length + idx.length;
    layout.push({ name, pool: pool.length, frames: unique.length, bytes: rows.length + idx.length });
  }
  for (const [name, chans] of Object.entries(SAMPLES)) {
    const unique = [scene.parts[name](scene.V0)], poses = [{ first: 0 }];
    for (const [c, vs] of Object.entries(chans)) for (const v of vs) { unique.push(scene.parts[name]({ ...scene.V0, [c]: v })); poses.push({ first: unique.length - 1, axis: c, value: v }); }
    write(name, unique, poses);
  }
  /* the beads: one frame per state, and per whether the page named a network */
  const unique = [], poses = [];
  for (const net of [0, 1]) stateNames.forEach((n, i) => { unique.push(scene.beadRows(n.replace(/\d$/, ''), net)); poses.push({ first: unique.length - 1, axis: 'state', value: i + stateNames.length * net }); });
  write('abead', unique, poses);
  const bytes = Buffer.concat(buf);
  rec.unshift('WATTACH-Rrig-Maglow-Ncard', 'WATTACH-Rrig-Mabits-Ncard');
  return { bytes, rec, layout };
}
