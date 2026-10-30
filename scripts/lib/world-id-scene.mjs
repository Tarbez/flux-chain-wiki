/* The identity views as rows (docs/design/world-grammar/PORT.md batch 2: idstart, idsign, idsafe, idyou, idvalue).
   Build side, Node built-ins only. scripts/lib/stage-src/identity-stages.js draws the five steps of the identity flow with Three.js: the key file, the ring of its chain, an app window,
   a signing request, a vault of glass, a name and two devices, and the one identity over the whole network. Its placement maths is restated here once, without Three.js, and
   evaluated; the browser (js/world2/world2-idrig.mjs) only plays the result. Every number is a name the stage file holds, and sourceGuard() refuses to write when the text
   that holds it has changed, so a changed stage file fails here and is never written from stale numbers.

   A view that moves is written as SAMPLES, as the auth stage is (world-auth-scene.mjs): a part's rows at the view's rest, and along each channel it depends on (the intro
   `i`, the sign-in step `t`, the vault's lit faces `f0 f1 f2`) the rows at the values where they have a corner. The knots are DERIVED: a fine grid of the channel is evaluated and
   a knot is kept only where the line between its neighbours would miss the row by more than EPS, so nothing is chosen by hand and the error is bounded. The browser lays a row back
   together as its rest plus, for each channel, what that channel adds. The stage weight w (how far the camera has come) is the view's `present` channel: it scales a row about its
   own centre through a window per part (WNAMES `gate`), where Three.js scaled each form about its frame; the settled picture is the same.
   Not written, because the site's law is that animations settle: nothing here turns, pulses or loops. */
import fs from 'node:fs';
import path from 'node:path';
import { TAU, D2R, clamp01, ease, TONES, I4, mul, chain, T, S, RX, RY, RZ, euler, row, hidden, pointOf, beadRows } from './world-rows.mjs';
import { writeBlob, boundsOf, sha } from './fxn-3d.mjs';
import { sampleParts, partRecords, shrunk } from './world-samples.mjs';   /* the one copy of the sampling: knots derived, hidden rows mended, a part's pool and table */
import { stageSrc } from './stage-src.mjs';

export const ID_VIEWS = ['idstart', 'idsign', 'idsafe', 'idyou', 'idvalue'];
const PI = Math.PI;

function sourceGuard(file, needles) {
  const src = fs.readFileSync(file, 'utf8');
  for (const n of needles) if (!src.includes(n)) throw new Error(path.basename(file) + ' no longer holds "' + n + '", so the identity views cannot be derived from it. Re-read the stage file, update scripts/lib/world-id-scene.mjs to the new text, and run the encoder again.');
  return src;
}

/* ---------- the parts: name, how the renderer draws it, how many rows. The names carry the view (p1 idstart ... p5 idvalue) ---------- */
const PARTS = {};
const def = (name, kind, count, ...args) => { PARTS[name] = { kind, count, args }; };
const block = (name, count, w, h, d, shadow) => def(name, 'block', count, w, h, d, .1 * Math.min(w, h, d), shadow === false ? 0 : 1);
/* the key file everyone shows: its form is one, so its parts are one set per view */
const chipParts = (p) => { block(p + 'chip', 1, 1.6, 1.04, .12); block(p + 'cpad', 6, .17, .12, .03, false); def(p + 'cword', 'text', 1, .92, .5); def(p + 'cedge', 'glowcube', 4); };
chipParts('p1'); block('p1ring', 28, .38, .34, .1, false); block('p1app', 1, 1.25, .84, .08); block('p1bar', 1, 1.21, .15, .05, false); def('p1lines', 'text', 1, 1.1, .55);
block('p1mini', 9, .2, .24, .06, false); block('p1cube', 1, .66, .66, .66); block('p1prod', 3, .34, .42, .08, false); def('p1dots', 'dots', 52);
block('p2win', 1, 2.5, 1.72, .1); block('p2bar', 1, 2.46, .2, .06, false); def('p2ask', 'text', 1, 2.25, 1.38); def('p2req', 'text', 1, 2.25, 1.38); def('p2edge', 'glowcube', 8);
block('p2pad', 1, 2.4, .12, 1.6); chipParts('p2'); block('p2rack', 3, 1.5, .44, 1.1); def('p2lights', 'glowsphere', 6); def('p2print', 'glowarc', 5); def('p2cross', 'glowtorus', 1); def('p2xbar', 'glowcube', 2);
def('p2dots', 'dots', 14); def('p2lit', 'lit', 14);
block('p3plinth', 1, 3.9, .22, 3.9); chipParts('p3'); def('p3vault', 'glass', 1, 2.7, 2.7, 2.7, .27); def('p3solid', 'glowcube', 4); def('p3dash', 'glowcube', 40);
for (let n = 0; n < 3; n++) def('p3icon' + n, 'text', 1, 2.7 * .9, 2.7 * .9);
def('p4badge', 'mesh', 1); def('p4rim', 'glowhex', 1); def('p4face', 'text', 1, 1.1, 1.1); block('p4slab', 1, 2.4, .62, .08); def('p4words', 'text', 1, 2.3, .56);
block('p4deck', 1, 2.3, .09, 1.5); block('p4lid', 1, 2.2, 1.38, .07); block('p4phone', 1, .8, 1.6, .09); def('p4lscr', 'text', 1, 2.0, 1.2); def('p4pscr', 'text', 1, .68, 1.38);
def('p4edge', 'glowcube', 8); def('p4lit', 'lit', 30);
def('p5badge', 'mesh', 1); def('p5rim', 'glowhex', 1); def('p5face', 'text', 1, 1.1, 1.1); def('p5lit', 'lit', 0); def('p5dots', 'dots', 0);   /* the two lines' counts follow the network (idScene) */
export const ID_PARTS = Object.keys(PARTS);

/* ---------- the channels of each view: range, rest (the value it settles at), and the grid its knots are derived from ---------- */
const CHANNELS = {
  idstart: { i: { lo: 0, hi: 1, rest: 1, N: 120 }, present: { lo: 0, hi: 1, rest: 1, N: 60 } },
  idsign: { t: { lo: 0, hi: 3, rest: 1, N: 240 }, present: { lo: 0, hi: 1, rest: 1, N: 60 } },
  idsafe: { i: { lo: 0, hi: 1, rest: 1, N: 120 }, f0: { lo: 0, hi: 1, rest: 1, N: 40 }, f1: { lo: 0, hi: 1, rest: 0, N: 40 }, f2: { lo: 0, hi: 1, rest: 0, N: 40 }, present: { lo: 0, hi: 1, rest: 1, N: 60 } },
  idyou: { i: { lo: 0, hi: 1, rest: 1, N: 120 }, present: { lo: 0, hi: 1, rest: 1, N: 60 } },
  idvalue: { i: { lo: 0, hi: 1, rest: 1, N: 120 }, present: { lo: 0, hi: 1, rest: 1, N: 60 } }
};

export function idScene(o) {
  const { N, cast, site, identity } = o;
  const file = stageSrc('identity-stages.js');
  sourceGuard(file, [
    'var BR = .8, BD = .2;', 'var CW = 1.6, CH = 1.04, CD = .12, chipGeo = k.bevel(CW, CH, CD), padGeo = k.bevel(.17, .12, .03);',
    'function ROW(i) { return V(MY.x + (i - 3) * 14, 16, MY.z); }', 'var MY = W.ringList[N.MINE].c;',
    'var O = ROW(0), g = parts(), chip = makeChip(g), intro = W.tween(1), RN = 28, RR = 2.3, Z = 1.25;',
    'var SP = [V(-3.7, 1.4, -.2), V(3.7, 1.4, -.2), V(-3.6, -1.15, .7), V(3.6, -1.15, .7)]',
    "target: function (f, asp) { return { aim: O.clone().add(V(0, .15, 0)), dist: W.fit(10, 5.4, asp, .9), elev: 12, yaw: 0, tilt: 1.2, n: 1.4 }; },",
    'if (w < .05) { intro.snap(0); intro.go(1, 1500, performance.now(), 700); } k.wake(900); },',
    "target: function (f, asp) { return { aim: O.clone().add(V(X[sel - 1] * .1, -.3, 0)), dist: W.fit(10.6, 4.8, asp, .9), elev: 11, yaw: 0, tilt: 1.2, n: 1.4 }; },",
    'st.go(sel, 700 + 400 * Math.abs(sel - st.to), performance.now(), w < .05 ? 800 : 0);', 'var O = ROW(1), g = parts(), chip = makeChip(g), st = W.tween(1), sel = 1, X = [-3.75, 0, 3.75];',
    "target: function (fr, asp) { return { aim: O.clone().add(V(0, -.25, 0)), dist: W.fit(8.4, 5.6, asp, .9), elev: 17, yaw: 0, tilt: 1.2, n: 1.4 }; },",
    'if (w < .05) { intro.snap(0); intro.go(1, 1300, performance.now(), 700); } k.wake(900); },', 'f = follower(3, 170), intro = W.tween(1), VS = 2.7, YAW = -.65, H = VS / 2;',
    "target: function (f, asp) { return { aim: O.clone().add(V(0, -.05, 0)), dist: W.fit(10, 5.2, asp, .9), elev: 10, yaw: 0, tilt: 1.2, n: 1.4 }; },",
    "target: function (f, asp) { return { aim: V(-1, 0, -6.5), dist: W.fit(31, 46 * Math.sin(ELEV * D2R) + 2, asp, .96), elev: ELEV, yaw: 0, tilt: 1.4, n: 0 }; },",
    'if (w < .05) { intro.snap(0); intro.go(1, 1600, performance.now(), 900); } k.wake(900); },', 'ELEV = 50;',
    'var i = intro.get(now) * win(w, .5, .9), g0 = grow(w, .3, .8);', "W.focusOn(function (i) { return i === MINE || NETS.indexOf(i) >= 0; }, false);",
    'var BGP = top(MINE, 1).add(V(0, 3.2, 0));', 'function top(ri, h) { var r = rings[ri]; return V(r.c.x, r.c.y + r.t * (h || 1.2), r.c.z); }',
    'var FL = frame(O.x - 3.55, O.y - 1.45, O.z + .35, 0, .32, new THREE.Matrix4()), FP = frame(O.x + 3.45, O.y - .7, O.z + .35, 0, -.3, new THREE.Matrix4());',
    "var LID = local(FL, 0, .68, -.72, -.16, 0, 1, 1, 1, new THREE.Matrix4());", "var bw = (w - 84) / 2, by = h - 112;",
    "mono(c, 22); c.fillStyle = '#3d4743'; c.fillText('AN APP ASKS YOU TO SIGN', 30, 50);", "['What will be signed', 'For which network', 'For how long']",
    "c.fillText('A SITE ASKS WHO YOU ARE', 30, 50);", "c.fillText('Share your identity?', 30, 128);", "c.fillText('Share', 54, by + 44);", "c.fillText('Don’t share', 78 + bw, by + 44);",
    "c.fillText('.AUTH', 6, h * .45); c.fillText('.FXN', 6, h * .92);", "c.fillText('SAMPLE', w - sw - 26, h * .64);"
  ]);
  const rings = cast.rings, MY = rings[N.MINE].c;
  const ROW = (i) => [MY.x + (i - 3) * 14, 16, MY.z];
  const NETS = Object.keys(N.NAMED).map(Number).filter((i) => N.KIND[i] === 'network');
  const RESV = rings.filter((r) => r.kind === 'resolver').map((r) => r.i);
  PARTS.p5lit.count = 6 + NETS.length * 4 * Math.ceil(32 / 4); PARTS.p5dots.count = RESV.length * 4 * Math.ceil(20 / 4);

  /* ---------- the colours: palette indices of CONTRACT.md, and the few mixes the stage names (identity-stages.js tones()) as entries after the base palette ---------- */
  const BASE = 22, derived = [];
  const derive = (name, a, b, mix, scale) => { derived.push({ name, a, b, mix, scale: scale || 1 }); return BASE + derived.length - 1; };
  const C = { silver: TONES.identity, bone: TONES.record, signal: TONES.signal, muted: TONES.muted, danger: TONES.danger, honey: TONES.honey };
  C.graphite = derive('graphite', TONES.canvas, TONES.other, .52);   /* k.mix('canvas', 'other', .52) */
  C.dark = derive('dark', TONES.canvas, TONES.other, .45);
  C.deep = derive('deep', TONES.canvas, TONES.network, .3);
  C.teal = derive('teal', TONES.network, TONES.signal, .35);          /* k.C.network lerped to signal by .35 */
  const slate = derive('slate', TONES.resolver, TONES.canvas, .58);
  C.slate135 = derive('slate135', slate, slate, 0, 1.35);
  C.dark55 = derive('dark55', C.dark, C.dark, 0, .55);
  const solid = (c) => [c, 0, 0], mixC = (a, b, t) => [a, b, t];

  /* ---------- the stage's helpers, restated: a frame, a part laid in it, the kernel's eases ---------- */
  const frame = (x, y, z, rx, ry) => chain(T(x, y, z), euler(rx || 0, ry || 0, 0));
  const local = (F, x, y, z, rx, ry, sx, sy, sz) => chain(F, T(x, y, z), euler(rx || 0, ry || 0, 0), S(Math.max(1e-4, sx), Math.max(1e-4, sy == null ? sx : sy), Math.max(1e-4, sz == null ? sx : sz)));
  const grow = (w, a, b) => { const u = clamp01((w - a) / (b - a)); return u <= 0 ? 1e-4 : u < 1 ? ease.out(u) : 1; };   /* W.grow */
  const win = (u, a, b) => ease.inOut(clamp01((u - a) / (b - a)));
  const back = ease.back;
  const lerpV = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  const add = (a, d) => [a[0] + d[0], a[1] + d[1], a[2] + d[2]];

  /* ---------- rows of each kind. A row hidden by the stage (place(null)) carries alpha -1: the sampler gives it the place of the row it is next to ---------- */
  const NULL = () => { const r = hidden(null, TONES.canvas); r[15] = -1; return r; };
  const fresh = () => { const out = {}; for (const [n, p] of Object.entries(PARTS)) out[n] = Array.from({ length: p.count }, NULL); return out; };
  const blockRow = (M, c) => row(M, c[0], c[1], c[2], 1);
  const plateRow = (M, w, h, alpha) => row(chain(M, RX(PI / 2), S(w, 1, h)), TONES.text, 0, 0, alpha == null ? 1 : alpha);
  const glowRow = (M, tone, gain) => row(M, tone, 0, 0, gain);
  const bars = (out, part, at, FM, w, h, amt, t, tone, gain) => {   /* k.edgeLight set(): four bars that grow from their middles */
    for (let q = 0; q < 4; q++) {
      if (!(amt > .01)) { out[part][at * 4 + q] = NULL(); continue; }
      const b = [[0, h / 2, w * amt, t], [0, -h / 2, w * amt, t], [-w / 2, 0, t, h * amt], [w / 2, 0, t, h * amt]][q];
      out[part][at * 4 + q] = glowRow(chain(FM, T(b[0], b[1], 0), S(b[2], b[3], t)), tone, gain);
    }
  };
  const bar = (out, part, i, FM, x, y, w, t) => { out[part][i] = w > .001 ? glowRow(chain(FM, T(x, y, 0), S(w, t, t)), TONES.honey, 1.25) : NULL(); };
  /* k.beads line(a, c, count, reveal, r): beads that grow in along the line (ease.back), each a point of diameter 2 r */
  const beads = (out, part, at, a, c, count, reveal, r, dots) => {
    beadRows(a, c, count, reveal, r, dots).forEach((rw, q) => { out[part][at + q] = rw; });
    return at + count;
  };

  /* the key file (identity-stages.js makeChip): body, six contact pads, its name, its lit edge */
  const CW = 1.6, CH = 1.04, CD = .12;
  const chip = (out, p, F, s, lit) => {
    out[p + 'chip'][0] = blockRow(local(F, 0, 0, 0, 0, 0, s), mixC(C.dark, C.teal, .14));
    for (let j = 0; j < 6; j++) out[p + 'cpad'][j] = blockRow(local(F, (-.55 + (j % 2) * .21) * s, (.17 - Math.floor(j / 2) * .17) * s, CD / 2 * s, 0, 0, s), solid(C.silver));
    if (s > .05) out[p + 'cword'][0] = plateRow(local(F, .3 * s, -.02 * s, CD / 2 * s + .006, 0, 0, s, s, 1), .92, .5);
    bars(out, p + 'cedge', 0, local(F, 0, 0, CD / 2 * s + .003, 0, 0, 1, 1, 1), CW * s - .03, CH * s - .03, lit, .016, TONES.signal, 1.9);
  };
  /* your identity: the hex badge, its lit rim, the person mark (makeBadge) */
  const BR = .8, BD = .2;
  const badge = (out, p, F, s, lit) => {
    out[p + 'badge'][0] = blockRow(local(F, 0, 0, 0, 0, 0, s), mixC(C.dark, C.teal, .12));
    if (lit > .01) out[p + 'rim'][0] = glowRow(local(F, 0, 0, -.01 * s, 0, 0, s * (.9 + .1 * lit)), TONES.signal, 1.9 * lit);
    if (s > .05) out[p + 'face'][0] = plateRow(local(F, 0, 0, BD * .5 * s + .01, 0, 0, s, s, 1), 1.1, 1.1);
  };

  /* ---------- 1 your FXN ID ---------- */
  const O1 = ROW(0), CC1 = add(O1, [0, .3, 0]), RN = 28, RR = 2.3, ZZ = 1.25;
  const SP = [[-3.7, 1.4, -.2], [3.7, 1.4, -.2], [-3.6, -1.15, .7], [3.6, -1.15, .7]].map((p) => add(p, O1));
  const idstart = (v) => {
    const out = fresh(), i = v.i, g0 = grow(v.present, 0, .5), lw = win(v.present, .5, .9);   /* the stage weight: forms grow over its first half, lines leave with it */
    chip(out, 'p1', frame(CC1[0], CC1[1], CC1[2], -.06, 0), 1.4 * g0, win(i, 0, .35));
    for (let r = 0; r < RN; r++) {
      const a = PI / 2 + r / RN * TAU, gr = grow(i, .08 + r * .01, .3 + r * .01) * g0;
      out.p1ring[r] = blockRow(local(frame(O1[0] + Math.cos(a) * RR, O1[1] - 1.05, O1[2] + Math.sin(a) * RR * .8, 0, PI / 2 - a), 0, 0, 0, 0, 0, gr), mixC(C.graphite, C.bone, .16 + .14 * Math.max(0, Math.sin(a))));
    }
    const q = [0, 1, 2, 3].map((n) => ZZ * grow(i, .55 + n * .07, .85 + n * .07) * g0);
    const FA = frame(SP[0][0], SP[0][1], SP[0][2], 0, .28);
    out.p1app[0] = blockRow(local(FA, 0, 0, 0, 0, 0, q[0]), solid(C.graphite));
    out.p1bar[0] = blockRow(local(FA, 0, .32 * q[0], .045 * q[0], 0, 0, q[0]), solid(C.dark));
    if (q[0] > .05) out.p1lines[0] = plateRow(local(FA, 0, -.06 * q[0], .045 * q[0], 0, 0, q[0], q[0], 1), 1.1, .55);
    for (let m = 0; m < 9; m++) { const b = PI / 2 + m / 9 * TAU; out.p1mini[m] = blockRow(local(frame(SP[1][0] + Math.cos(b) * .5 * q[1], SP[1][1], SP[1][2] + Math.sin(b) * .36 * q[1], 0, PI / 2 - b), 0, 0, 0, 0, 0, q[1]), mixC(C.graphite, C.bone, .6)); }
    out.p1cube[0] = blockRow(local(frame(SP[2][0], SP[2][1], SP[2][2], 0, .55), 0, 0, 0, 0, 0, q[2]), solid(C.slate135));
    for (let p = 0; p < 3; p++) out.p1prod[p] = blockRow(local(frame(SP[3][0] + (p - 1) * .44 * q[3], SP[3][1], SP[3][2], 0, -.2), 0, 0, 0, 0, 0, q[3]), mixC(C.graphite, C.bone, .1 + .3 * p));
    let at = 0;
    SP.forEach((s, n) => {
      const from = [CC1[0] + Math.sign(s[0]) * CW * .68, CC1[1] + (s[1] > CC1[1] ? .25 : -.25), CC1[2]], to = [s[0] - Math.sign(s[0]) * .95, s[1], s[2]];
      at = beads(out, 'p1dots', at, from, to, 13, win(i, .4 + n * .07, .7 + n * .07) * lw, .028, true);
    });
    return out;
  };

  /* ---------- 2 signing in ---------- */
  const O2 = ROW(1), X2 = [-3.75, 0, 3.75];
  const BW = add(O2, [X2[0], .3, 0]), PAD = add(O2, [X2[1], -1.1, .3]), CHIP = add(PAD, [0, .06 + CH * .5, -.2]), SRV = add(O2, [X2[2], -1.05, 0]), XM = add(O2, [X2[2] + 1.2, -.55, .55]);
  const at2 = (t, i) => clamp01(1 - Math.abs(t - (i + 1)));
  const idsign = (v) => {
    const out = fresh(), t = v.t, g0 = grow(v.present, 0, .55), lw = win(v.present, .5, .9);
    const FB = frame(BW[0], BW[1], BW[2], 0, .24);
    out.p2win[0] = blockRow(local(FB, 0, 0, 0, 0, 0, g0), solid(C.graphite));
    out.p2bar[0] = blockRow(local(FB, 0, .74 * g0, .03 * g0, 0, 0, g0), solid(C.dark));
    const fl = ease.out(clamp01((t - 1.2) / .55)), fa = fl < .5 ? fl * 2 : (fl - .5) * 2;
    if (fl < .5) out.p2ask[0] = plateRow(local(FB, 0, -.1 * g0, .056 * g0 + .004, fa * PI / 2, 0, g0, g0, 1), 2.25, 1.38);
    if (fl >= .5) out.p2req[0] = plateRow(local(FB, 0, -.1 * g0, .056 * g0 + .004, -(1 - fa) * PI / 2, 0, g0, g0, 1), 2.25, 1.38);
    bars(out, 'p2edge', 0, local(FB, 0, 0, .053, 0, 0, 1, 1, 1), 2.5 * g0, 1.72 * g0, win(t, .3, 1), .008 + .01 * at2(t, 0), TONES.signal, 1.5);
    out.p2pad[0] = blockRow(local(frame(PAD[0], PAD[1], PAD[2], 0, 0), 0, 0, 0, 0, 0, g0), solid(C.graphite));
    chip(out, 'p2', frame(CHIP[0], CHIP[1], CHIP[2], 0, 0), g0, .35 + .65 * Math.max(at2(t, 1), win(t, 2, 2.6)));
    const ok = 1 - .45 * win(t, 2.2, 3);
    for (let r = 0; r < 5; r++) {
      const l = win(t, 1.25 + r * .1, 1.75 + r * .1) * ok, rr = .62 + r * .16;
      if (l > .01) out.p2print[r] = glowRow(local(frame(PAD[0], PAD[1] + .065, PAD[2], 0, [.3, 2.1, 4, 1.2, 5.2][r]), 0, 0, 0, 0, 0, rr * g0, 1, rr * .62 * g0), TONES.signal, .25 + 1.5 * l);
    }
    const chk = win(t, 2.45, 3);
    for (let s = 0; s < 3; s++) {
      const FS = frame(SRV[0], SRV[1] + s * .5, SRV[2], 0, -.24);
      out.p2rack[s] = blockRow(local(FS, 0, 0, 0, 0, 0, g0), mixC(C.dark, C.graphite, .5 + .2 * s));
      for (let d = 0; d < 2; d++) out.p2lights[s * 2 + d] = glowRow(local(FS, (-.52 + d * .18) * g0, 0, .56 * g0, 0, 0, .045 * g0), chk > .5 ? TONES.signal : TONES.muted, chk > .5 ? .6 + 1.2 * chk : .5);
    }
    bars(out, 'p2edge', 1, local(frame(SRV[0], SRV[1] + 1, SRV[2], 0, -.24), 0, 0, .556, 0, 0, 1, 1, 1), 1.5 * g0, .44 * g0, chk, .012, TONES.signal, 1.5);
    const xg = grow(t, 2.3, 2.9) * g0;
    if (xg > .01) {
      const FX = local(frame(XM[0], XM[1], XM[2], 0, -.24), 0, 0, 0, 0, 0, xg);
      out.p2cross[0] = glowRow(chain(FX, RX(PI / 2), S(.3, .3, .3)), TONES.danger, 1.3);
      for (let c = 0; c < 2; c++) out.p2xbar[c] = glowRow(chain(FX, RZ(c ? PI / 4 : -PI / 4), S(.46, .055, .03)), TONES.danger, 1.3);
    }
    beads(out, 'p2dots', 0, pointOf(FB, 1.32, -.25, .1), [CHIP[0] - CW * .58, CHIP[1], CHIP[2]], 14, win(t, 1, 1.7) * lw, .03, true);
    beads(out, 'p2lit', 0, [CHIP[0] + CW * .58, CHIP[1], CHIP[2]], [SRV[0] - .85, SRV[1] + .55, SRV[2] + .4], 14, win(t, 2, 2.6) * lw, .03, false);
    return out;
  };

  /* ---------- 3 security ---------- */
  const O3 = ROW(2), VS = 2.7, YAW = -.65, H3 = VS / 2;
  const FV = frame(O3[0], O3[1], O3[2], 0, YAW);
  const FACE = [local(FV, 0, 0, H3, 0, 0, 1, 1, 1), local(FV, H3, 0, 0, 0, PI / 2, 1, 1, 1), local(FV, 0, H3, 0, -PI / 2, 0, 1, 1, 1)];
  const idsafe = (v) => {
    const out = fresh(), i = v.i, g0 = grow(v.present, 0, .55), f = [v.f0, v.f1, v.f2];
    out.p3plinth[0] = blockRow(local(FV, 0, -H3 - .2, 0, 0, 0, g0), solid(C.graphite));
    chip(out, 'p3', frame(O3[0], O3[1] - .1, O3[2], 0, 0), .95 * g0, win(i, .1, .45));
    const vg = grow(i, .2, .7) * g0, fm = Math.max(f[0], f[1], f[2]);
    out.p3vault[0] = row(local(FV, 0, 0, 0, 0, 0, vg), C.deep, f[0] > .5 ? C.teal : C.honey, .12 * fm, .3);
    const lit = win(i, .55, 1);
    for (let n = 0; n < 3; n++) {
      const u = f[n], F = local(FACE[n], 0, 0, .006, 0, 0, 1, 1, 1);
      if (lit > .02) out['p3icon' + n][0] = plateRow(local(FACE[n], 0, 0, .012, 0, 0, vg, vg, 1), VS * .9, VS * .9, lit * (.3 + .7 * u));
      if (n === 0) bars(out, 'p3solid', 0, F, VS * .94 * vg, VS * .94 * vg, lit, .012 + .014 * u, TONES.signal, 1.7);
      else {   /* dashes: Partial (the brief's state) is a dashed honey edge, half lit, never solid */
        const slot = n === 1 ? 0 : 5, L = VS * .94, cnt = 5, len = L / cnt * (.36 + .26 * u) * (lit * vg), th = .012 + .012 * u;
        let q = 0;
        for (let side = 0; side < 4; side++) {
          const vert = side > 1, m = vert ? chain(F, RZ(PI / 2)) : F, off = (side % 2 ? -1 : 1) * L / 2;
          for (let d = 0; d < cnt; d++, q++) bar(out, 'p3dash', (slot + Math.floor(q / 4)) * 4 + (q % 4), m, -L / 2 + (d + .5) * L / cnt, vert ? -off : off, len, th);
        }
      }
    }
    return out;
  };

  /* ---------- 4 your identity ---------- */
  const O4 = ROW(3), BG = add(O4, [0, 1.15, 0]), NM = add(O4, [0, -.42, .1]);
  const FL = frame(O4[0] - 3.55, O4[1] - 1.45, O4[2] + .35, 0, .32), FP = frame(O4[0] + 3.45, O4[1] - .7, O4[2] + .35, 0, -.3), LID = local(FL, 0, .68, -.72, -.16, 0, 1, 1, 1);
  const idyou = (v) => {
    const out = fresh(), i = v.i, g0 = grow(v.present, 0, .5);
    badge(out, 'p4', frame(BG[0], BG[1], BG[2], 0, 0), 1.15 * g0, win(i, 0, .3));
    out.p4slab[0] = blockRow(local(frame(NM[0], NM[1], NM[2], 0, 0), 0, 0, 0, 0, 0, g0), solid(C.dark55));
    out.p4words[0] = plateRow(local(frame(NM[0], NM[1], NM[2] + .046, 0, 0), 0, 0, 0, 0, 0, g0, g0, 1), 2.3, .56);
    const d0 = grow(i, .2, .55) * g0, d1 = grow(i, .3, .65) * g0;
    out.p4deck[0] = blockRow(local(FL, 0, 0, 0, 0, 0, d0), solid(C.graphite));
    out.p4lid[0] = blockRow(local(LID, 0, 0, 0, 0, 0, d0), solid(C.dark));
    if (d0 > .05) out.p4lscr[0] = plateRow(local(LID, 0, 0, .04 * d0, 0, 0, d0, d0, 1), 2.0, 1.2);
    out.p4phone[0] = blockRow(local(FP, 0, 0, 0, 0, 0, d1), solid(C.dark));
    if (d1 > .05) out.p4pscr[0] = plateRow(local(FP, 0, 0, .05 * d1, 0, 0, d1, d1, 1), .68, 1.38);
    let at = beads(out, 'p4lit', 0, [BG[0] - .95, BG[1] - .2, BG[2]], pointOf(LID, .3, .72, 0), 16, win(i, .45, .8), .03, false);
    beads(out, 'p4lit', at, [BG[0] + .95, BG[1] - .2, BG[2]], pointOf(FP, 0, .84, 0), 14, win(i, .55, .9), .03, false);
    bars(out, 'p4edge', 0, local(LID, 0, 0, .04, 0, 0, 1, 1, 1), 2.2 * d0, 1.38 * d0, win(i, .75, 1), .013, TONES.signal, 1.5);
    bars(out, 'p4edge', 1, local(FP, 0, 0, .05, 0, 0, 1, 1, 1), .8 * d1, 1.6 * d1, win(i, .85, 1), .013, TONES.signal, 1.5);
    return out;
  };

  /* ---------- 9 one identity, many chains (the step the flow ends on, /account) ---------- */
  const ELEV5 = 50, top = (ri, h) => { const r = rings[ri]; return [r.c.x, r.c.y + r.t * (h || 1.2), r.c.z]; };
  const BGP = add(top(N.MINE, 1), [0, 3.2, 0]);
  const arc = (out, part, at, a, b, lift, count, reveal, r, dots) => {   /* a line that arcs over the network: four straight pieces of a quadratic */
    const c = lerpV(a, b, .5); c[1] += lift;
    for (let s = 0; s < 4; s++) {
      const u0 = s / 4, u1 = (s + 1) / 4, pt = (u) => [0, 1, 2].map((k) => a[k] * (1 - u) * (1 - u) + c[k] * 2 * u * (1 - u) + b[k] * u * u);
      at = beads(out, part, at, pt(u0), pt(u1), Math.ceil(count / 4), clamp01(reveal * 4 - s), r, dots);
    }
    return at;
  };
  const idvalue = (v) => {
    const out = fresh(), i = v.i * win(v.present, .5, .9), g0 = grow(v.present, .3, .8);   /* its lines leave with it */
    badge(out, 'p5', frame(BGP[0], BGP[1], BGP[2], -ELEV5 * D2R * .7, 0), 1.9 * g0, win(i, 0, .25));
    let at = beads(out, 'p5lit', 0, [BGP[0], BGP[1] - 1.2 * g0, BGP[2]], top(N.MINE, 1.1), 6, win(i, .05, .25), .05, false);
    NETS.forEach((ri, n) => { at = arc(out, 'p5lit', at, top(N.MINE), top(ri), 3.5, 32, win(i, .2 + n * .12, .55 + n * .12), .1, false); });
    let dt = 0;
    RESV.forEach((ri, n) => { dt = arc(out, 'p5dots', dt, top(N.MINE), top(ri), 2, 20, win(i, .5 + n * .06, .85 + n * .06), .075, true); });
    return out;
  };

  /* ---------- the cameras (target() of each stage), the states, the words, the places labels hang ---------- */
  const r4 = (x) => Math.round(x * 1e4) / 1e4;
  const views = {
    idstart: { pose: idstart, camera: { aim: add(O1, [0, .15, 0]), fit: { w: 10, h: 5.4, fill: .9 }, elev: 12, tilt: 1.2, back: 1.4 }, lead: 700, span: { i: 1500 } },
    idsign: { pose: idsign, camera: { aim: add(O2, [0, -.3, 0]), fit: { w: 10.6, h: 4.8, fill: .9 }, elev: 11, tilt: 1.2, back: 1.4 }, lead: 800, span: { t: 1100 }, step: { t: 400 },
      states: [1, 2, 3].map((s) => ({ name: 's' + s, set: { t: s, tfrom: s - 1, aimx: r4(X2[s - 1] * .1) } })) },
    idsafe: { pose: idsafe, camera: { aim: add(O3, [0, -.25, 0]), fit: { w: 8.4, h: 5.6, fill: .9 }, elev: 17, tilt: 1.2, back: 1.4 }, lead: 700, span: { i: 1300 },
      states: [0, 1, 2].map((s) => ({ name: 's' + s, set: { f0: s === 0 ? 1 : 0, f1: s === 1 ? 1 : 0, f2: s === 2 ? 1 : 0 } })) },
    idyou: { pose: idyou, camera: { aim: add(O4, [0, -.05, 0]), fit: { w: 10, h: 5.2, fill: .9 }, elev: 10, tilt: 1.2, back: 1.4 }, lead: 700, span: { i: 1500 } },
    idvalue: { pose: idvalue, camera: { aim: [-1, 0, -6.5], fit: { w: 31, h: 46 * Math.sin(ELEV5 * D2R) + 2, fill: .96 }, elev: ELEV5, tilt: 1.4, back: 0 }, lead: 900, span: { i: 1600 } }
  };
  /* the page slab opens out of the stage's anchor (anchorAt(out, x, y, z, s)): the place under the thing it lifts from, and its size */
  const LIFT = .16;
  const anchors = { idstart: [CC1, 1.2], idsign: [CHIP, 1.1], idsafe: [O3, 1.6], idyou: [BG, 1.2], idvalue: [BGP, 2] };
  for (const [n, [p, s]] of Object.entries(anchors)) views[n].anchor = { at: [p[0], r4(p[1] - (LIFT + .5) * s), p[2]], size: s };
  /* the sign-in step's tween and the vault's lit faces: where a label may show (a channel past a threshold) */
  views.idstart.spots = [['key', add(CC1, [-.95, .85, 0]), 'i', .3], ...SP.map((s, n) => [['apps', 'chains', 'resolvers', 'products'][n], add(s, [-.6, .62, 0]), 'i', .85 + n * .07])];
  views.idsign.spots = [['request', add(BW, [-1.2, 1.15, 0]), '', 0], ['key', add(CHIP, [-.8, .72, 0]), '', 0], ['server', add(SRV, [-.75, 1.42, 0]), '', 0]];
  views.idsafe.spots = [pointOf(FACE[0], -H3 * .95, H3 * .95, 0), pointOf(FACE[1], H3 * .95, 0, 0), pointOf(FACE[2], 0, H3 * .95, .2)].map((p, n) => ['facet-' + n, p, 'i', .6]);
  views.idyou.spots = [['badge', add(BG, [.95, .7, 0]), 'i', .3], ['device-0', pointOf(LID, -1.1, .95, 0), 'i', .8], ['device-1', pointOf(FP, -.4, 1.05, 0), 'i', .9]];
  views.idvalue.spots = [['you', add(BGP, [1.4, 1, 0]), 'i', .2]];
  views.idvalue.focus = [N.MINE, ...NETS];

  /* the stage weight's windows (identity-stages.js pose(w)): forms grow over the first half of the flight (grow(w, 0, .5), ease out), lines come over .5 to .9 (win, in out);
     the account step grows its badge over .3 to .8. curve: the sampler's, 6 cubic out (ring-kit.js ease.out, which W.grow uses), 5 in out */
  /* the stage weight is a sampled channel (`present`): each pose function takes it, as identity-stages.js pose(w) does, so a form pops in about its own frame and overshoots as Three.js did; no gate line is written */
  const gates = {};

  /* the words: lifted from the stage file (the needles above hold them), with the sample identity the page shows */
  const plates = [
    ['p1cword', 'chip', .92, .5, '.AUTH', '.FXN'], ['p2cword', 'chip', .92, .5, '.AUTH', '.FXN'], ['p3cword', 'chip', .92, .5, '.AUTH', '.FXN'], ['p1lines', 'applines', 1.1, .55],
    ['p2ask', 'share', 2.25, 1.38, 'A SITE ASKS WHO YOU ARE', 'Share your identity?', 'Share', 'Don’t share'],
    ['p2req', 'request', 2.25, 1.38, 'AN APP ASKS YOU TO SIGN', 'What will be signed', 'For which network', 'For how long'],
    ['p3icon0', 'icon', VS * .9, VS * .9, '0'], ['p3icon1', 'icon', VS * .9, VS * .9, '1'], ['p3icon2', 'icon', VS * .9, VS * .9, '2'],
    ['p4face', 'person', 1.1, 1.1], ['p5face', 'person', 1.1, 1.1], ['p4words', 'name', 2.3, .56, identity.name, 'SAMPLE'],
    ['p4lscr', 'screen', 2.0, 1.2, identity.name], ['p4pscr', 'screen', .68, 1.38, identity.name]
  ];
  plates.forEach(([p]) => { if (!PARTS[p]) throw new Error('the plate list names part ' + p + ', which the identity parts do not have'); });
  /* the mesh of the badge: ExtrudeGeometry(hexShape(BR * .88), { depth: BD * .64, bevelThickness: BD * .18, bevelSize: BR * .12 * .8, bevelSegments: 4 }) centred, flat shaded */
  const shapes = [];
  {
    const R0 = BR * .88, depth = BD * .64, bt = BD * .18, bs = BR * .12 * .8, segs = 4, zc = BD * .32;
    const layers = [];   /* [z, radius] from the back cap to the front cap */
    const rad = (b) => R0 + b / Math.cos(PI / 6);
    for (let b = 0; b < segs; b++) { const t = b / segs; layers.push([-bt * Math.cos(t * PI / 2), rad(bs * Math.sin(t * PI / 2))]); }
    layers.push([0, rad(bs)], [depth, rad(bs)]);
    for (let b = segs - 1; b >= 0; b--) { const t = b / segs; layers.push([depth + bt * Math.cos(t * PI / 2), rad(bs * Math.sin(t * PI / 2))]); }
    const pos = [], nrm = [], idx = [];
    const ring = (L) => [...Array(6).keys()].map((k) => { const a = PI / 2 + k * TAU / 6; return [Math.cos(a) * L[1], Math.sin(a) * L[1], L[0] - zc]; });
    const quad = (p0, p1, p2, p3) => {
      const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2], vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2];
      let n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
      const c = [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2, (p0[2] + p2[2]) / 2], flip = n[0] * c[0] + n[1] * c[1] + n[2] * c[2] < 0;
      const l = Math.hypot(...n) || 1; n = n.map((x) => x / l * (flip ? -1 : 1));
      const b = pos.length / 3; [p0, p1, p2, p3].forEach((p) => { pos.push(...p); nrm.push(...n); });
      if (flip) idx.push(b, b + 2, b + 1, b, b + 3, b + 2); else idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    };
    for (let l = 0; l + 1 < layers.length; l++) { const a = ring(layers[l]), c = ring(layers[l + 1]); for (let k = 0; k < 6; k++) quad(a[k], a[(k + 1) % 6], c[(k + 1) % 6], c[k]); }
    for (const L of [layers[0], layers[layers.length - 1]]) { const r = ring(L); for (let k = 1; k < 5; k++) quad(r[0], r[k], r[k + 1], r[k + 1]); }   /* the caps: a fan, the last point twice makes a triangle */
    const st = { pos: Float32Array.from(pos), nrm: Float32Array.from(nrm), uv: new Float32Array(pos.length / 3 * 2), idx: Uint32Array.from(idx) };
    const b = writeBlob(st, boundsOf(st.pos), [{ first: 0, count: st.idx.length, rgba: [255, 255, 255, 255], slot: 255, metal: 0, rough: 255 }]);
    const cid = sha(b.bytes);
    for (const part of ['p4badge', 'p5badge']) shapes.push({ part, bytes: b.bytes, cid, verts: b.verts, indices: b.indices });
  }
  return { views, parts: PARTS, derived, base: BASE, plates, gates, shapes, CHANNELS, rest: (view) => Object.fromEntries(Object.entries(CHANNELS[view]).map(([c, d]) => [c, d.rest])), tau: 170 };
}

/* every part's frames for a view: [{ axis, value, rows }] with the base (axis null) first */
export function sampleView(scene, view) {
  const spec = scene.views[view], digit = ID_VIEWS.indexOf(view) + 1;
  return sampleParts(spec.pose, CHANNELS[view], scene.rest(view), Object.keys(PARTS).filter((p) => p.startsWith('p' + digit)));
}

/* ---------- the group's blob and records (PORT.md batch 2) ---------- */
export function idRecords(scene, o) {
  const { num, sha: shaOf, N } = o;
  const rec = [], buf = [], layout = [], clean = (s) => String(s == null ? '' : s).replace(/[\t\r\n]+/g, ' ').trim();
  let atByte = 0;
  const files = [], lines = [];
  const stageRecs = [];
  for (const view of ID_VIEWS) {
    const frames = sampleView(scene, view);
    for (const [name, list] of Object.entries(frames)) {
      const pr = partRecords('id', view, name, list, atByte, num);
      rec.push(...pr.rec); buf.push(pr.rows, pr.idx); atByte += pr.bytes;
      layout.push({ view, name, pool: pr.pool, frames: pr.frames, bytes: pr.bytes });
    }
  }
  const bytes = Buffer.concat(buf);
  const cid = shaOf(bytes);
  files.push({ name: cid + '.bin', bytes });
  const head = [`WFRAME-Rid-C${cid}-A${bytes.length}`];
  for (const sh of scene.shapes) { if (!files.some((f) => f.name === sh.cid + '.mesh')) files.push({ name: sh.cid + '.mesh', bytes: sh.bytes }); head.push(`WSHAPE-Rid-M${sh.part}-C${sh.cid}-A${sh.bytes.length}`); }
  const r4 = (x) => Math.round(x * 1e4) / 1e4;
  for (const view of ID_VIEWS) {
    const v = scene.views[view], c = v.camera;
    rec.push(`WVIEW-R${view}-X${num(r4(c.aim[0]))}-Y${num(r4(c.aim[1]))}-Z${num(r4(c.aim[2]))}-D${num(r4(c.fit.w))}-J${num(r4(c.fit.h))}-V${num(c.fit.fill)}-H${num(c.elev)}-U0-T${num(c.tilt)}-B${num(c.back)}`);
    /* the dyn channels of a view (CONTRACT: n steps the network back, p the page slab), with the windows every page view has (chains-scene.js base(): pw .35, out .7) */
    const states = v.states || [{ name: 'rest', set: {} }];
    if (v.states) states.forEach((s, i) => rec.push(`WSTATE-R${view}-I${i}-N${s.name}`));
    states.forEach((s, i) => {
      rec.push(`WSET-R${view}-I${i}-Nn-V${num(c.back)}`, `WSET-R${view}-I${i}-Np-V1`);
      rec.push(`WSET-R${view}-I${i}-Nlead-V${v.lead}`);
      const chans = CHANNELS[view];
      for (const [ch, d] of Object.entries(chans)) rec.push(`WSET-R${view}-I${i}-N${ch}-V${num(s.set[ch] != null ? s.set[ch] : d.rest)}`);
      for (const [k, x] of Object.entries(s.set)) if (!(k in chans)) rec.push(`WSET-R${view}-I${i}-N${k}-V${num(x)}`);
      if (!v.states) rec.push(`WSET-R${view}-I${i}-N${Object.keys(chans)[0]}from-V0`);
    });
    rec.push(`WSET-R${view}-I0-Nsize-V${num(v.anchor.size)}`);
    for (const [ch, ms] of Object.entries(v.span || {})) rec.push(`WSPAN-R${view}-N${ch}-D${ms}`);
    if (v.step) for (const [ch, ms] of Object.entries(v.step)) states.forEach((s, i) => rec.push(`WSET-R${view}-I${i}-N${ch}step-V${ms}`));
    // the entry channels run along the kernel's in-out ease (identity-stages.js tween get(): ease.inOut); the follower is an exponential approach
    for (const ch of Object.keys(CHANNELS[view])) {
      if (/^f\d$/.test(ch)) {
        const T_ = 6.3 * scene.tau;
        rec.push(`WSPAN-R${view}-N${ch}-D${Math.round(T_)}`);
        for (let k = 0; k <= 12; k++) { const u = k / 12; rec.push(`WCHAN-R${view}-N${ch}-A${Math.round(u * 1000)}-V${k === 12 ? 1 : num(Math.round((1 - Math.exp(-6.3 * u)) * 1e4) / 1e4)}-L0`); }
      } else rec.push(`WCHAN-R${view}-N${ch}-A0-V0-L0`, `WCHAN-R${view}-N${ch}-A1000-V1-L5`);
    }
    rec.push(`WCHAN-R${view}-Npresent-A0-V0-L0`, `WCHAN-R${view}-Npresent-A1000-V1-L5`, `WSPAN-R${view}-Npresent-D1000`);
    for (const [dir, a, b] of [[1, .35, 1], [0, 0, .7]]) rec.push(`WCHAN-R${view}-Np-I${dir}-A0-V0-L0`, `WCHAN-R${view}-Np-I${dir}-A${Math.round(a * 1000)}-V0-L0`, `WCHAN-R${view}-Np-I${dir}-A${Math.round(b * 1000)}-V1-L5`, `WCHAN-R${view}-Np-I${dir}-A1000-V1-L0`);
    rec.push(`WSPOT-R${view}-Nanchor-X${num(v.anchor.at[0])}-Y${num(v.anchor.at[1])}-Z${num(v.anchor.at[2])}`);
  }
  // the wire: the first record names the blob; the rest follow
  rec.unshift(...head);
  // the words, one line each
  for (const [name, p] of Object.entries(PARTS)) lines.push(['kind', name, p.kind, ...p.args]);
  scene.derived.forEach((d, i) => lines.push(['tone', scene.base + i, d.name, d.a, d.b, d.mix, d.scale]));
  for (const pl of scene.plates) lines.push(['plate', ...pl]);
  for (const [p, g] of Object.entries(scene.gates)) lines.push(['gate', p, ...g]);
  for (const view of ID_VIEWS) for (const s of scene.views[view].spots) lines.push(['spot', view, s[0], r4(s[1][0]), r4(s[1][1]), r4(s[1][2]), s[2], s[3]]);
  lines.push(['focus', 'idvalue', ...scene.views.idvalue.focus]);
  const names = Buffer.from(lines.map((l) => l.map(clean).join('\t')).join('\n') + '\n', 'utf8'), namesCid = shaOf(names);
  files.push({ name: namesCid + '.txt', bytes: names });
  rec.push(`WNAMES-Rid-C${namesCid}-A${names.length}`);
  return { rec, files, layout, bytes };
}
