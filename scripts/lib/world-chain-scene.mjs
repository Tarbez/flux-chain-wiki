/* The chain views of the world as frames (docs/design/world-grammar/PORT.md batch 1; STAGE.md "Paper proof: chain and record").
   Build side, Node built-ins only. scripts/lib/stage-src/chains-scene.js and scripts/lib/stage-src/record-glass.js lay out your chain as record tiles:
   the ring re-formed (chain, record), the ring unrolled to a row (links), the tiles side by side with the chosen one widened into
   a card (open). Their placement maths are restated here once, without Three.js, and evaluated at each view's SETTLED channel
   values and at each record the ring is turned to; the browser only blends between these frames (world2-dyn.mjs). Nothing is
   typed twice by hand: every number below is a name that chains-scene.js or record-glass.js holds, and sourceGuard() refuses to
   write when the text that holds it has changed, so a changed stage file fails here and is never written from stale numbers.
   Frames, not formulas, travel: one blob holds, for each view and each pose of the ring, every row the view draws. A row is
   64 bytes in the instance format of CONTRACT.md (a 3x4 matrix, then tone, family, mix, alpha). Rows that a view does not show
   are scaled to a point. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

import { TAU, D2R, LIFT, HALF_D, MID, FOV, TAN, clamp01, ease, lerp, angLerp, TONES, I4, mul, chain, T, S, RY, RX, compose, BODY, FACE, HIDE, row, hidden } from './world-rows.mjs';
import { stageSrc } from './stage-src.mjs';
export { TONES };

/* ---------- the stage file's own numbers, and the guard that they still hold ---------- */
function sourceGuard(file, needles) {
  const src = fs.readFileSync(file, 'utf8');
  for (const n of needles) if (!src.includes(n)) throw new Error(path.basename(file) + ' no longer holds "' + n + '", so the chain views cannot be derived from it. Re-read the stage file, update scripts/lib/world-chain-scene.mjs to the new text, and run the encoder again.');
  return src;
}

export const PARTS = ['ytile', 'ylink', 'clink', 'pane', 'shell', 'edge', 'bead', 'proof', 'key', 'keyrim', 'plate0', 'plate1', 'plate2', 'plate3', 'plate4', 'plate5', 'plate6', 'plate7', 'plate8', 'pool', 'slab', 'slabrim', 'rel', 'spot', 'kring', 'runbead'];
/* the parts that are not rows of a view's frame: their rows are samples along the run channel (the pulse of light as your key lands, the bead that runs the chain) */
export const PULSE_PARTS = ['kring', 'runbead'];

/* the views and the settled values of the channels of chains-scene.js target(): m your ring re-formed, j its links joined, kk your key,
   ks the key's size, g the earlier versions, s the card row, l the line, p the page slab, n the network stepped back, rr the record
   ring's radius, cs the chosen record's size; elev is the camera's height (the key faces it) */
export function chainScene(o) {
  const { N, cast, recs, site } = o;
  const file = stageSrc('chains-scene.js'), glassFile = stageSrc('record-glass.js');
  sourceGuard(file, [
    'var TC = Y.t * 1.2, TS = TC * 1.4, GAP = .35;', 'var RISE = Y.c.y + Y.R * 1.3, RC = Y.R * 1.45;', 'var RCR = RC, RCT = TC * 1.16;',
    'var FRONT = RINGC.clone().add(V(0, 0, RCR + .5 * TC));', 'var LSP = TC * 2.3, LC = RINGC.clone();', 'var KEY_Y = TC * .7;',
    "if (v === 'chain') {", 'var out = RCT + .5 * TC + .62 * TC, E = 32;',
    'm: 1, j: 1, kk: 1, p: 1, rr: RCT, cs: 1.15, pw: .45', "else if (v === 'record') Object.assign(t, { aim: FRONT.clone().add(V(TS * .3, TS * MID, -TS * .25))", 'elev: 9, tilt: 1.4, m: 1, j: 1, kk: 1, ks: .62, g: 1, p: 1',
    "else if (v === 'links') Object.assign(t, { aim: LC.clone().add(V(((nR - 1 - sel) - (nR - 1) / 2) * LSP * .3, TC * .8, TC * 1.0))", 'elev: 24, tilt: 1.2, m: 1, j: 1, kk: 1, ks: .72, g: 1, l: 1, p: 1',
    "else if (v === 'open') { A = asp;", 'elev: 0, tilt: 0, m: 1, j: 1, s: 1',
    'var mj = clamp01(m * 1.25 - (nR - 1 - j) * .05), me = ease.inOut(mj);', 'var lj = clamp01(l * 1.35 - Math.abs(j - sel) * .09), le = ease.inOut(lj);',
    'rowX[jr] = FRONT.x + rx0; rowZ[jr] = FRONT.z - .025 * rx0 * rx0 / TC - (ab > .5 ? 3.4 * TC : 0);',
    'var sw = Math.sin(Math.PI * s); z += sw * TS * .8; yaw += sw * .5 * (pos >= sel ? 1 : -1); y += sw * TS * .12;',
    'var pxx = PX[sel] - bs * (.7 + .52 * i) * gi, pyy = PY[sel] + bs * (.1 + .22 * i) * gi, pzz = PZ[sel] - bs * (.6 + .5 * i) * gi, pyaw = (.3 + .08 * i) * gi;',
    'KP.set(RINGC.x, RISE + KEY_Y * ks, RINGC.z).lerp(LA.set(PX[sel], PY[sel] + PS[sel] * 1.75, PZ[sel] - TC * .2), l);',
    'pool.position.set(PX[sel], PY[sel] + .01, PZ[sel]); pool.scale.set(psz, 1, psz * .8); pool.rotation.y = PA[sel];',
    'var rxp = PX[sel] + sgn2 * TC * 1.6, rzp = PZ[sel] + TC * 2.1, ryp = RISE - TC * .25;', 'var KR = TC * .45, key = new THREE.Group();'
  ]);
  sourceGuard(glassFile, ['var SX = 1.03, SY = 1.03, SZ = .31;', 'var top = (P0.y + P1.y) / 2 + s1 * .16;', 'var br = .04 * s1;']);
  const nR = recs.length, rings = cast.rings, Y = rings[N.MINE], nY = Y.n, stepY = TAU / nY, stepR = TAU / nR;
  const TC = Y.t * 1.2, TS = TC * 1.4, GAP = .35, RISE = Y.c.y + Y.R * 1.3, RC = Y.R * 1.45, RCR = RC, RCT = TC * 1.16;
  const RINGC = [Y.c.x, RISE, Y.c.z], FRONT = [RINGC[0], RINGC[1], RINGC[2] + RCR + .5 * TC], LSP = TC * 2.3, LC = RINGC, KEY_Y = TC * .7, KR = TC * .45;
  const slotOf = recs.map((r, j) => Math.round(j * nY / nR)), recOfSlot = [];
  for (let q = 0; q < nY; q++) recOfSlot.push(slotOf.indexOf(q));
  const wrap = d => ((d % nR) + nR * 1.5) % nR - nR / 2;
  const GH = 3;

  const VIEWS = {
    home: { m: 0, j: 0, kk: 0, ks: 1, g: 0, s: 0, l: 0, p: 0, n: 0, rr: RCR, cs: TS / TC, elev: 24 },
    chain: { m: 1, j: 1, kk: 1, ks: 1, g: 0, s: 0, l: 0, p: 1, n: 1, rr: RCT, cs: 1.15, elev: 32 },
    record: { m: 1, j: 1, kk: 1, ks: .62, g: 1, s: 0, l: 0, p: 1, n: 1, rr: RCR, cs: TS / TC, elev: 9 },
    links: { m: 1, j: 1, kk: 1, ks: .72, g: 1, s: 0, l: 1, p: 1, n: 1, rr: RCR, cs: TS / TC, elev: 24 },
    open: { m: 1, j: 1, kk: 0, ks: 1, g: 0, s: 1, l: 0, p: 0, n: 1, rr: RCR, cs: TS / TC, elev: 0 }
  };

  /* the tint of a record tile as a two-colour mix (tone, family, mix): ring-kit tint = slabA.lerp(slabB, near^1.5).lerp(canvas, y). At a
     settled pose near is 0 or 1, so the mix has two colours: slabA = canvas to other by .62, slabB = other to identity by .18 */
  function tileTint(near, v) {
    const y = (1 - near) * (.25 * v.m * (1 - v.s) + .58 * v.s);
    if (near > .5) return [TONES.other, TONES.identity, .18 * (1 - y), 1];
    return [TONES.canvas, TONES.other, .62 * (1 - y), 1];
  }

  /* ---------- one pose: view v, the ring turned to record `pos`, the card row widened by A ---------- */
  function pose(name, pos, A) {
    const v = VIEWS[name], sel = Math.round(pos) % nR, r0 = recs[sel], F = {};
    const P = [];   /* each record's tile: x y z yaw sc width, as PX..PW */
    const rowX = [], rowZ = [], wF = TS * (1 + (A - 1) * v.s);
    if (v.s > 0) for (let jr = 0; jr < nR; jr++) {
      const rl = wrap(jr - pos), ab = Math.abs(rl), sgn = rl < 0 ? -1 : 1;
      const rx0 = sgn * (Math.min(ab, 1) * (wF / 2 + GAP * TC + TC * .45) + Math.max(0, ab - 1) * (TC * (.85 + GAP)));
      rowX[jr] = FRONT[0] + rx0; rowZ[jr] = FRONT[2] - .025 * rx0 * rx0 / TC - (ab > .5 ? 3.4 * TC : 0);
    }
    const tiles = [];   /* per slot */
    for (let q = 0; q < nY; q++) {
      const th = Math.PI / 2 + q * stepY, j = recOfSlot[q];
      if (v.m === 0) {   /* home: the ring in its own slots (ringFrame, built = 1) */
        const c = Y.c, co = Math.cos(th), si = Math.sin(th);
        tiles[q] = { j, home: true, m: [si * Y.t, 0, -co * Y.t, 0, 0, Y.t, 0, 0, co * Y.t, 0, si * Y.t, 0, c.x + Y.R * co, c.y, c.z + Y.R * si, 1], th };
        continue;
      }
      if (j < 0) { tiles[q] = { j, hidden: true, at: [Y.c.x + Y.R * Math.cos(th), RISE, Y.c.z + Y.R * Math.sin(th)] }; continue; }   /* an empty slot has folded away (m = 1) */
      const rel = wrap(j - pos), near = Math.max(0, 1 - Math.abs(rel));
      const thC = Math.PI / 2 - rel * stepR;
      const R = rr(v) + .5 * TC * near, sc0 = TC * (1 + (v.cs - 1) * near);
      let x = Y.c.x + R * Math.cos(thC), z = Y.c.z + R * Math.sin(thC), yaw = Math.PI / 2 - thC, y = RISE, sc = sc0;
      if (v.l > 0) {
        const le = ease.inOut(clamp01(v.l * 1.35 - Math.abs(j - sel) * .09)), lx = LC[0] + ((nR - 1 - j) - (nR - 1) / 2) * LSP;
        x = lerp(x, lx, le); z = lerp(z, LC[2] - TC * .5 + TC * 2 * near, le); y = lerp(y, RISE + TC * .25 * near, le); yaw = angLerp(yaw, 0, le);
        sc = lerp(sc, lerp(TC * 1.05, TS * .92, near), le);
      }
      if (v.s > 0) {
        const rx = rowX[j] - FRONT[0], ryaw = Math.atan(.05 * rx / TC), rs = j === sel ? TS : TC * .85;
        x = lerp(x, rowX[j], v.s); z = lerp(z, rowZ[j], v.s); yaw = angLerp(yaw, ryaw, v.s); sc = lerp(sc, rs, v.s); y = lerp(y, RISE, v.s);
        /* the swing is the frame between ring and row: it is a bulge of sin(pi s), carried in swingOf(), not in the settled pose */
      }
      const str = j === sel ? 1 + (A - 1) * v.s : 1;
      tiles[q] = { j, x, y, z, yaw, sc, str, w: sc * str, near };
      P[j] = tiles[q];
    }
    function rr(vv) { return vv.rr; }
    const sel0 = P[sel];

    /* --- ytile --- */
    const ytile = [];
    for (let q = 0; q < nY; q++) {
      const t = tiles[q];
      if (t.home) { ytile.push(row(mul(t.m, BODY), TONES.identity, TONES.signal, .4, 1)); continue; }   /* the home blob's own tile for your ring: its kind's colour leaned to the signal by .4 (chains-scene.js homeTint) */
      if (t.hidden) { ytile.push(hidden(t.at, TONES.canvas)); continue; }
      const body = chain(compose(t.x, t.y, t.z, t.yaw, t.sc), BODY, S(t.str, 1, 1));
      let tint = tileTint(t.near, v);
      if (name === 'open' && t.j === sel) tint = [TONES.canvas, TONES.other, .08, 1];   /* the card: near-black glass (record-glass.js) */
      if (name === 'record' && t.j === sel) tint = [TONES.canvas, 0, 0, 1];            /* the chosen record turns to near-black glass */
      ytile.push(row(body, tint[0], tint[1], tint[2], tint[3]));
    }
    F.ytile = ytile;

    /* --- ylink: your ring's own links on the home frame (they fold away as the ring re-forms: scale 1 - 2 m, chains-scene.js pose());
           clink: the chain's links, linkBetween() edge to edge, the newest links to nothing --- */
    const ylink = [], clink = [];
    for (let q = 0; q < nY; q++) {
      const t = tiles[q];
      if (t.home) {
        const th = t.th + stepY / 2, co = Math.cos(th), si = Math.sin(th), s = Y.t;
        const g = [si * s * .62, 0, -co * s * .62, 0, 0, s, 0, 0, co * s, 0, si * s, 0, Y.c.x + Y.R * co, Y.c.y, Y.c.z + Y.R * si, 1];
        ylink.push(row(mul(g, chain(T(0, LIFT + .5, -.03))), TONES.other, TONES.canvas, .45, 1));
        clink.push(hidden([Y.c.x + Y.R * co, Y.c.y, Y.c.z + Y.R * si], TONES.other));
        continue;
      }
      ylink.push(hidden(t.at || [Y.c.x, RISE, Y.c.z], TONES.other));
      const j = t.j;
      if (t.hidden || j < 0 || j >= nR - 1 || !P[j + 1]) { clink.push(hidden(t.at || (P[j] ? [P[j].x, P[j].y, P[j].z] : [Y.c.x, RISE, Y.c.z]), TONES.other)); continue; }
      const a0 = P[j], a1 = P[j + 1], dx = a1.x - a0.x, dz = a1.z - a0.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d;
      const ax = a0.x + ux * a0.w / 2, az = a0.z + uz * a0.w / 2, bx = a1.x - ux * a1.w / 2, bz = a1.z - uz * a1.w / 2, len = Math.hypot(bx - ax, bz - az);
      if (len < .02 || (bx - ax) * ux + (bz - az) * uz < 0) { clink.push(hidden([a0.x, a0.y, a0.z], TONES.other)); continue; }
      const yy = (a0.y + a0.sc * (LIFT + .5) + a1.y + a1.sc * (LIFT + .5)) / 2 - TC * (LIFT + .5);
      const fr = chain(T((ax + bx) / 2, yy, (az + bz) / 2), RY(Math.atan2(-(bz - az), bx - ax)), S(TC, TC, TC));
      clink.push(row(chain(fr, T(0, LIFT + .5, -.03), S(len / TC + .27, 1, 1)), TONES.other, TONES.canvas, .45, 1));
    }
    F.ylink = ylink; F.clink = clink;

    const here = P[sel];
    const wordsIn = v.m ? 1 : 0;   /* ease.out(clamp((m - .5) * 2.5)) is 1 once the ring has formed */
    /* the tile frame of each record: base * body * face */
    const faceOf = j => chain(compose(P[j].x, P[j].y, P[j].z, P[j].yaw, P[j].sc), BODY, FACE);
    function barRows(FM, w, h, amt, t, tone, gain) {
      if (!(amt > .01)) return [0, 1, 2, 3].map(() => hidden(null, tone));
      return [[0, h / 2, w * amt, t], [0, -h / 2, w * amt, t], [-w / 2, 0, t, h * amt], [w / 2, 0, t, h * amt]].map(b => row(chain(FM, T(b[0], b[1], 0), S(b[2], b[3], t)), tone, 0, 0, gain));
    }

    /* --- the records' edge lights: the chosen record's teal frame, a signed record's signature line --- */
    const edge = [];
    for (let j = 0; j < nR; j++) {
      const hasTile = !!P[j];
      const FM = hasTile ? faceOf(j) : I4();
      const edgeAmt = hasTile ? v.m * Math.pow(P[j].near, 3) * (1 - v.s) : 0;
      let bars;
      const glassW = name === 'record' && j === sel ? 1 : 0;
      if (edgeAmt > .01) bars = barRows(FM, .93, .93, ease.out(edgeAmt), .016, TONES.signal, 1.8).map((b, i) => (glassW ? hiddenLike(b) : b));
      else {
        bars = [0, 1, 2, 3].map(() => hidden(null, TONES.signal));
        if (hasTile && recs[j].signedBy && v.m > .5 && !(j === sel && v.s > .02)) bars[1] = row(chain(FM, T(-.16, -.43, 0), S(.5 * wordsIn, .022, .022)), TONES.signal, 0, 0, 1.8);
      }
      edge.push(...bars);
    }
    function hiddenLike(b) { return hidden(null, TONES.signal); }
    /* the card's edge: ember (record-glass.js cardEdge) once the tile has become the card */
    const cs = ease.out(clamp01((v.s - .55) / .45));
    const cardFM = v.s > 0.002 && here ? chain(compose(here.x, here.y, here.z, here.yaw, here.sc), BODY, FACE) : I4();
    /* a bar that is not drawn in this frame waits ON the chosen tile, not at the world's origin: the flight to the open view blends its rows toward the card's, so a bar waiting at the origin flew in from
       the middle of the world. On the tile it grows where the card grows (chains-scene.js recEdge.set(nR, ...) is placed on card.matrix, the chosen tile's own place). */
    const wait = here ? [here.x, here.y, here.z] : null;
    edge.push(...(cs > .001 ? barRows(cardFM, here.str - .03, .97, cs, .012, TONES.ember, 1.4) : [0, 1, 2, 3].map(() => hidden(wait, TONES.ember))));
    /* the ghosts' lit frames */
    const earlier = r0.earlier ? Math.min(GH, r0.earlier[1] - r0.earlier[0] + 1) : 0, ghosts = [];
    const bs = here ? here.sc : TS;
    for (let i = 0; i < GH; i++) {
      const gi = i < earlier ? v.g : 0;
      if (gi <= .01 || !here) { ghosts.push(null); continue; }
      const psc = bs * (.86 - .13 * i) * ease.out(gi);
      const pxx = here.x - bs * (.7 + .52 * i) * gi, pyy = here.y + bs * (.1 + .22 * i) * gi, pzz = here.z - bs * (.6 + .5 * i) * gi, pyaw = (.3 + .08 * i) * gi;
      ghosts.push({ i, gi, psc, pxx, pyy, pzz, FM: chain(compose(pxx, pyy, pzz, pyaw, psc), BODY) });
    }
    F.pane = ghosts.map(g => (g ? row(chain(g.FM, S(1, 1, .03)), TONES.canvas, TONES.signal, .22, .34) : hidden(here ? [here.x, here.y, here.z] : null, TONES.canvas)));
    for (let i = 0; i < GH; i++) {
      const g = ghosts[i];
      edge.push(...(g ? barRows(chain(g.FM, T(0, 0, .02)), .98, .98, g.gi, .01, TONES.signal, 1.1) : [0, 1, 2, 3].map(() => hidden(null, TONES.signal))));
    }
    /* record-glass.js: the chosen record's glass in the record view: twelve ember edges round it and a pane of dark glass */
    const emberW = name === 'record' ? 1 : 0;   /* amt = inOut(clamp(max(g, view === 'record' ? m : 0) * (1 - l))) and the glass only shows in the record view and its flight */
    const glassBox = here ? chain(compose(here.x, here.y, here.z, here.yaw, here.sc), BODY) : I4();
    const SX = 1.03, SY = 1.03, SZ = .31, rr_ = .1 * SZ, hx = SX / 2 - rr_ * .3, hy = SY / 2 - rr_ * .3, hz = SZ / 2 - rr_ * .3, tt = .014, amtG = emberW;
    const EDG = [];
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach(ax => { [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(qq => EDG.push({ ax, q: qq })); });
    for (const d of EDG) {
      if (!(amtG > .01) || !here) { edge.push(hidden(null, TONES.ember)); continue; }
      let m;
      if (d.ax[0]) m = chain(glassBox, T(0, d.q[0] * hy, d.q[1] * hz), S((SX - rr_ * 1.2) * amtG, tt, tt));
      else if (d.ax[1]) m = chain(glassBox, T(d.q[0] * hx, 0, d.q[1] * hz), S(tt, (SY - rr_ * 1.2) * amtG, tt));
      else m = chain(glassBox, T(d.q[0] * hx, d.q[1] * hy, 0), S(tt, tt, (SZ - rr_ * 1.2) * amtG));
      edge.push(row(m, TONES.ember, 0, 0, 1.45));
    }
    F.edge = edge;
    F.shell = [here && amtG > .01 ? row(chain(glassBox, S(SX, SY, SZ)), TONES.canvas, 0, 0, .86) : hidden(here ? [here.x, here.y, here.z] : null, TONES.canvas)];

    /* --- beads: the status lights, the ghosts' lit line, the signature, the chevrons, the related dots, the proof's ends --- */
    const bead = [];
    function beadLine(a, c, count, reveal, r, tone, alpha) {
      const out = [];
      for (let qd = 0; qd < count; qd++) {
        const u = count > 1 ? qd / (count - 1) : 0, g = clamp01((reveal * (count + 2) - qd) / 2), s = g <= 0 ? 1e-4 : (r || .05) * ease.back(g);
        out.push(g <= 0 ? hidden(null, tone) : row(chain(T(a[0] + (c[0] - a[0]) * u, a[1] + (c[1] - a[1]) * u, a[2] + (c[2] - a[2]) * u), S(2 * s, 2 * s, 2 * s)), tone, 0, 0, alpha == null ? 1 : alpha));
      }
      return out;
    }
    const pad = (list, n, tone) => { while (list.length < n) list.push(hidden(null, tone)); return list.slice(0, n); };
    const SIGNALB = TONES.signal;
    for (let j = 0; j < nR; j++) {
      const on = P[j] && recs[j].signedBy && !(j === sel && v.s > .02) ? wordsIn : 0;
      if (on > .01) {
        const p = [.38, .38, .015, 1], FMj = faceOf(j), wp = [FMj[0] * p[0] + FMj[4] * p[1] + FMj[8] * p[2] + FMj[12], FMj[1] * p[0] + FMj[5] * p[1] + FMj[9] * p[2] + FMj[13], FMj[2] * p[0] + FMj[6] * p[1] + FMj[10] * p[2] + FMj[14]];
        bead.push(...pad(beadLine(wp, wp, 1, on, .03 * (P[j].sc || TC), SIGNALB), 1, SIGNALB));
      } else bead.push(hidden(null, SIGNALB));
    }
    /* the ghosts' lit line from the chosen tile to each pane, and a bead at each pane */
    let prevC = null;
    for (let i = 0; i < GH; i++) {
      const g = ghosts[i];
      if (!g) { bead.push(...[...Array(8)].map(() => hidden(null, SIGNALB))); continue; }
      const cpt = [g.pxx, g.pyy + g.psc * (LIFT + .5), g.pzz];
      const from = prevC || [here.x, here.y + bs * (LIFT + .5), here.z - bs * .2];
      bead.push(...pad(beadLine(from, cpt, 7, g.gi, .022, SIGNALB), 7, SIGNALB), ...pad(beadLine(cpt, cpt, 1, g.gi, .045, SIGNALB), 1, SIGNALB));
      prevC = cpt;
    }
    /* the signature line between the key and the record (links) */
    bead.push(...pad(v.l > .5 && r0.signedBy && here ? beadLine([here.x, here.y + here.sc * 1.55, here.z - TC * .2], [here.x, here.y + here.sc * (LIFT + 1.1), here.z], 6, clamp01((v.l - .5) * 2), .035, SIGNALB) : [], 6, SIGNALB));
    /* the chevron on each link points to the older record */
    const MUTEDB = TONES.muted;
    for (let cj = 0; cj < nR - 1; cj++) {
      if (!(v.l > .5) || !P[cj] || !P[cj + 1]) { bead.push(...[...Array(6)].map(() => hidden(null, MUTEDB))); continue; }
      const cx = (P[cj].x + P[cj + 1].x) / 2, cz = (P[cj].z + P[cj + 1].z) / 2, cy = (P[cj].y + P[cj + 1].y) / 2 + TC * (LIFT + .5) + TC * .22;
      const dxs = Math.sign(P[cj + 1].x - P[cj].x) || -1, rv = clamp01((v.l - .6) * 2.5 - cj * .1);
      bead.push(...pad(beadLine([cx + dxs * TC * .1, cy, cz], [cx - dxs * TC * .02, cy + TC * .09, cz], 3, rv, .022, MUTEDB, .75), 3, MUTEDB));
      bead.push(...pad(beadLine([cx + dxs * TC * .1, cy, cz], [cx - dxs * TC * .02, cy - TC * .09, cz], 3, rv, .022, MUTEDB, .75), 3, MUTEDB));
    }
    /* the related records (links): two small tiles in front, joined to the chosen one by dots that draw in after the line has settled */
    const rw = v.l * (r0.links ? 1 : 0), dr = clamp01((rw - .75) * 4), rel = [], relDots = [];
    for (let ri = 0; ri < 2; ri++) {
      const on = r0.links && ri < r0.links.length ? rw : 0, sg = ri ? 1 : -1;
      const rxp = (here ? here.x : 0) + sg * TC * 1.6, rzp = (here ? here.z : 0) + TC * 2.1, ryp = RISE - TC * .25;
      if (on < .01 || !here) { rel.push(hidden(here ? [rxp, ryp, rzp] : null, TONES.other)); relDots.push(...[...Array(9)].map(() => hidden(null, MUTEDB))); continue; }
      const sc = TC * .72 * ease.back(clamp01(on * 1.3 - .3));
      rel.push(row(chain(compose(rxp, ryp, rzp, -sg * .25, sc), BODY), TONES.other, TONES.identity, .35, 1));
      if (on > .5) relDots.push(...pad(beadLine([here.x, here.y + here.sc * .25, here.z + here.sc * HALF_D], [rxp, ryp + TC * .72 * .6, rzp - TC * .2], 9, clamp01(dr * 2 - ri), .032, MUTEDB, .75), 9, MUTEDB));
      else relDots.push(...[...Array(9)].map(() => hidden(null, MUTEDB)));
    }
    F.rel = rel;
    bead.push(...relDots);
    /* the proof line to the record it links to (record-glass.js proofLine): in the record view and on the card */
    const proofAmt = name === 'record' ? 1 : name === 'open' ? cs : 0;
    const best = sel, proof = [];
    if (proofAmt > .01 && best + 1 < nR && P[best] && P[best + 1]) {
      const b0 = P[best], b1 = P[best + 1], c0 = [b0.x, b0.y + b0.sc * (LIFT + .5), b0.z], c1 = [b1.x, b1.y + b1.sc * (LIFT + .5), b1.z];
      const dx = c1[0] - c0[0], dz = c1[2] - c0[2], d = Math.hypot(dx, dz), ux = dx / d, uz = dz / d, top = (c0[1] + c1[1]) / 2 + b1.sc * .16;
      const A = [c0[0] + ux * b0.w / 2, top, c0[2] + uz * b0.w / 2], B = [c1[0] - ux * b1.w / 2, top, c1[2] - uz * b1.w / 2], br = .04 * b1.sc;
      proof.push({ a: A, b: B, s1: b1.sc }, { a: A, b: B, s1: b1.sc });
      bead.push(row(chain(T(A[0], A[1], A[2]), S(2 * br, 2 * br, 2 * br)), TONES.ember, 0, 0, 2), row(chain(T(B[0], B[1], B[2]), S(2 * br, 2 * br, 2 * br)), TONES.ember, 0, 0, 2));
    } else bead.push(hidden(null, TONES.ember), hidden(null, TONES.ember));
    F.bead = bead;
    /* the line itself, two ribbons: core and halo. A line row is two ends (columns 0 and 1) and a width in pixels (column 2, x). */
    F.proof = [0, 1].map(i => {
      if (!proof[i]) return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, TONES.ember, 0, 0, 0];
      const p = proof[i];
      return [p.a[0], p.a[1], p.a[2], p.b[0], p.b[1], p.b[2], i ? 7 : 2.5, 0, 1, 0, 0, 0, TONES.ember, 0, 0, i ? .3 : 1.6];
    });

    /* --- your key: a hexagonal badge of glass-dark metal, its lit rim, its face (kDisc, kRim, kFace of chains-scene.js). The disc wears mix(canvas, other, .35); the rim sits
           KR * .02 in front of it and the face KR * .08 --- */
    const kk = v.kk * (1 - v.s), elev = v.elev * D2R;
    let keyRows = [hidden(null, TONES.canvas), hidden(null, TONES.signal)], faceRow = hidden(null, TONES.signal), KPnow = null, GKey = null;
    if (kk > .01) {
      const KP = [lerp(RINGC[0], here.x, v.l), lerp(RISE + KEY_Y * v.ks, here.y + here.sc * 1.75, v.l), lerp(RINGC[2], here.z - TC * .2, v.l)];
      const rise = ease.out(clamp01(kk * 1.2)), sc = Math.max(1e-4, v.ks * ease.back(clamp01(kk * 1.3 - .3)));
      const G = chain(T(KP[0], KP[1] - (1 - rise) * TC * 1.2, KP[2]), RX(-elev), S(sc, sc, sc));
      KPnow = [KP[0], KP[1] - (1 - rise) * TC * 1.2, KP[2]]; GKey = G;
      keyRows = [row(chain(G, RX(Math.PI / 2), S(KR, KR * .16, KR)), TONES.canvas, TONES.other, .35, 1), row(chain(G, T(0, 0, KR * .02), RX(Math.PI / 2), S(KR * 1.05, KR * 1.05, KR * 1.05)), TONES.signal, 0, 0, 1.9)];
      faceRow = row(chain(G, T(0, 0, KR * .08), RX(Math.PI / 2), S(KR * 1.25, 1, KR * 1.25)), TONES.signal, 0, 0, 2.2);
    }
    F.key = [keyRows[0]]; F.keyrim = [keyRows[1]];
    /* --- the pulses of the entering flight (chains-scene.js: cur.run = clamp01((u - .5) / .5) while the camera comes in from outside your chain): one ring of light
           leaves the key as it lands (forty beads on a circle in the key's plane, pp = clamp01(run * 1.7), radius KR * ks * (1.1 + 1.7 ease.out(pp)), size .045 sin(pi pp)),
           and one bead runs the chain from the oldest record to the newest (br = clamp01((run - .22) / .78), size .085 sin(pi br)). A frame of them is the rows at one run. --- */
    F.pulse = (run) => {
      const ringRows = [], bead = [];
      const pp = clamp01(run * 1.7);
      for (let b = 0; b < 40; b++) {
        if (!(kk > .01) || !(pp > 0 && pp < 1)) { ringRows.push(hidden(null, TONES.signal)); continue; }
        /* in the key's own units (WATTACH): the place is (cos a, sin a) x (1.1 + 1.7 ease.out(pp)) key radii in the plane of its face, the size .045 sin(pi pp) is the world's */
        const a = b / 40 * TAU, rp = 1.1 + 1.7 * ease.out(pp), sz = .045 * Math.sin(Math.PI * pp);
        ringRows.push(row(chain(T(Math.cos(a) * rp, Math.sin(a) * rp, 0), S(2 * sz, 2 * sz, 2 * sz)), TONES.signal, 0, 0, 1));
      }
      const br = clamp01((run - .22) / .78);
      if (v.m > .9 && br > 0 && br < 1 && P[nR - 1]) {
        const fpos = br * (nR - 1), seg = Math.min(nR - 2, Math.floor(fpos)), fu = fpos - seg, ja = nR - 1 - seg, jb = ja - 1, sz = .085 * Math.sin(Math.PI * br);
        bead.push(row(chain(T(lerp(P[ja].x, P[jb].x, fu), lerp(P[ja].y + P[ja].sc * (LIFT + .5), P[jb].y + P[jb].sc * (LIFT + .5), fu), lerp(P[ja].z, P[jb].z, fu)), S(2 * sz, 2 * sz, 2 * sz)), TONES.signal, 0, 0, 1));
      } else bead.push(hidden(null, TONES.signal));
      return { kring: ringRows, runbead: bead };
    };

    /* --- the text plates: five records, three earlier versions, the key's face --- */
    const plates = [];
    for (let j = 0; j < nR; j++) {
      if (!P[j]) { plates.push(hidden(null, TONES.text)); continue; }
      const pw2 = wordsIn * (j === sel ? 1 - clamp01(v.s * 4) : 1);
      plates.push(pw2 > .01 ? row(chain(faceOf(j), S(pw2, pw2, 1), RX(Math.PI / 2), S(.84, 1, .84)), TONES.text, 0, 0, 1) : hidden(null, TONES.text));
    }
    for (let i = 0; i < GH; i++) {
      const g = ghosts[i];
      plates.push(g ? row(chain(g.FM, T(0, 0, .02), T(-.02, .3, .005), RX(Math.PI / 2), S(.84, 1, .22)), TONES.text, 0, 0, 1) : hidden(null, TONES.text));
    }
    plates.push(faceRow);
    plates.forEach((r, i) => { F['plate' + i] = [r]; });

    /* --- the light under the chosen record --- */
    const pw = v.m * (1 - v.s) * (1 - v.l) * (name === 'record' ? .6 : 1);
    const warm = name === 'record' ? 1 : 0;
    F.pool = [pw > .01 && here ? row(chain(T(here.x, here.y + .01, here.z), RY(here.yaw), S(here.sc * 1.9 * ease.out(clamp01(pw * 1.4 - .4)), 1, here.sc * 1.9 * ease.out(clamp01(pw * 1.4 - .4)) * .8)), warm ? TONES.ember : TONES.signal, 0, 0, warm ? .59 * .7 : .59 * .85) : hidden(null, TONES.signal)];

    /* --- the page slab: the chosen tile as it stands is its anchor (chains-scene.js anchorOf); the host lays it over the page's box --- */
    F.slab = [here ? row(compose(here.x, here.y, here.z, here.yaw, here.sc), TONES.other, TONES.canvas, .62, 1) : hidden(null, TONES.canvas)];
    F.slabrim = [here ? row(compose(here.x, here.y, here.z, here.yaw, here.sc), TONES.muted, TONES.canvas, .68, 1) : hidden(null, TONES.muted)];

    /* --- where the labels hang (chainTags, linkTags, recordTags): twelve places, a place the view does not use is a hidden row --- */
    const spots = [];
    const spot = (p, on) => spots.push(on && p ? row(T(p[0], p[1], p[2]), TONES.text, 0, 0, 1) : hidden(p, TONES.text));
    const chainOn = name === 'chain';
    spot(name === 'chain' ? [RINGC[0] + RCT * .55, RISE + TC * (LIFT + 1.2), RINGC[2] - RCT * .8] : name === 'links' && here ? [here.x + here.sc * .5, here.y + here.sc * 1.9, here.z - TC * .2] : null, name === 'chain' || name === 'links');   // key
    spot(P[nR - 1] ? [P[nR - 1].x, P[nR - 1].y - P[nR - 1].sc * .08, P[nR - 1].z + P[nR - 1].sc * .2] : null, chainOn);                                   // oldest
    spot(P[0] ? [P[0].x, P[0].y - P[0].sc * .08, P[0].z + P[0].sc * .2] : null, chainOn);                                                                   // newest
    spot(P[sel + 1] ? [P[sel + 1].x, P[sel + 1].y + P[sel + 1].sc * (LIFT + 1.12), P[sel + 1].z] : null, name === 'record' && sel + 1 < nR);                // next
    for (let j = 0; j < nR; j++) spot(!P[j] ? null : j === sel ? [P[j].x + P[j].w * .55, P[j].y + P[j].sc * (LIFT + .5), P[j].z] : [P[j].x, P[j].y - P[j].sc * .12, P[j].z + P[j].sc * .2], name === 'links');   // rec-<id>
    spot(here ? [here.x - here.sc * 1.05, here.y + here.sc * 1.45, here.z - here.sc * .9] : null, name === 'links' && earlier > 0);                          // ghosts
    for (let ri = 0; ri < 2; ri++) spot(here ? [here.x + (ri ? 1 : -1) * TC * 1.6, RISE - TC * .32, here.z + TC * 2.15] : null, name === 'links' && !!(r0.links && r0.links[ri]));   // rel-0, rel-1
    F.spot = spots;
    return F;
  }

  /* the swing of the chosen tile as the card opens: sin(pi s) of z += TS * .8, yaw += .5, y += TS * .12 (the open view's frame is the
     end; the bulge in between is this delta) */
  const swing = { dz: TS * .8, dyaw: .5, dy: TS * .12 };

  /* ---------- the frames ---------- */
  const order = [];   /* [view, pos, aspect] in blob order */
  order.push(['home', 0, 1]);
  for (const name of ['chain', 'record', 'links']) for (let k = 0; k < nR; k++) order.push([name, k, 1]);
  for (const a of [1, 2]) for (let k = 0; k < nR; k++) order.push(['open', k, a]);
  const frames = order.map(([name, pos, A]) => pose(name, pos, A));
  const FRAME_PARTS = PARTS.filter(p => !PULSE_PARTS.includes(p));
  const counts = {};
  for (const p of FRAME_PARTS) counts[p] = frames[0][p].length;
  frames.forEach((f, i) => { for (const p of FRAME_PARTS) if (!f[p] || f[p].length !== counts[p]) throw new Error('chain frame ' + i + ' (' + order[i].join(' ') + '): part ' + p + ' has ' + (f[p] ? f[p].length : 'no') + ' rows, the first frame has ' + counts[p] + '; every frame must hold the same rows so the browser can blend them'); });

  /* ---------- what the blob holds (PORT.md batch 1, "frame size") ----------
     A frame holds every row of every part, and most rows are hidden in most frames, or the same in many. Three things are derived, never listed:
       rows     a row that is hidden (alpha 0) in EVERY frame of the group is never written: a part keeps the ranges of the rows that show in some frame (WROWS);
       frames   a part's picture is written once when it is the same in every frame of a view (the ring turned to any record, the card row at any aspect): the view has
                one frame of it. WPOSE says, per part and view, which frames are its own;
       pool     each part is a pool of its distinct rows and a table of 16-bit indexes, one per row of each frame. A hidden row is one row whatever its place (a hidden
                row is never drawn and only its tone is read), so the pool holds a hidden row once.
     The pulses of the entering flight are parts of their own: their frames are samples along the run channel (WPOSE with the axis run); the ring of light is written
     in the key's own units and laid on the key by the stage (WATTACH). */
  const VIEW_FRAMES = { home: [[0]], chain: [[]], record: [[]], links: [[]], open: [[], []] };
  order.forEach(([name, pos, A], i) => { if (name === 'open') VIEW_FRAMES.open[A - 1].push(i); else if (name === 'home') VIEW_FRAMES.home[0] = [i]; else VIEW_FRAMES[name][0].push(i); });
  const canon = r => (r[15] > 1e-4 ? r : [1e-4, 0, 0, 0, 1e-4, 0, 0, 0, 1e-4, 0, 0, 0, r[12], r[13], r[14], 0]);   /* a hidden row: no place, its tone kept */
  const key = r => canon(r).map(x => Math.fround(x)).join(',');
  const rowsKey = (rows, kept) => kept.map(i => key(rows[i])).join(';');
  const buf = [], layout = [];
  let atByte = 0;
  const rangesOf = kept => { const out = []; kept.forEach(i => { const l = out[out.length - 1]; if (l && l[0] + l[1] === i) l[1]++; else out.push([i, 1]); }); return out; };
  /* one part written: its frames (each a list of rows, kept rows only) as a pool and a table */
  function writePart(name, unique, kept, poses) {
    const pool = [], at = new Map(), table = [];
    for (const fr of unique) for (const r of fr) { const k = key(r); if (!at.has(k)) { at.set(k, pool.length); pool.push(canon(r)); } table.push(at.get(k)); }
    if (pool.length > 65535) throw new Error('part ' + name + ' has ' + pool.length + ' distinct rows; a 16-bit index cannot name them all');
    const rows = Buffer.alloc(pool.length * 64), idx = Buffer.alloc(Math.ceil(table.length * 2 / 64) * 64);
    pool.forEach((r, i) => { for (let k = 0; k < 16; k++) { if (!Number.isFinite(r[k])) throw new Error('a row that is not a number: ' + r.join(',')); rows.writeFloatLE(r[k], i * 64 + k * 4); } });
    table.forEach((v, i) => idx.writeUInt16LE(v, i * 2));
    layout.push({ name, offset: atByte, count: pool.length, kept, ranges: rangesOf(kept), poses, frames: unique.length, table: table.length });
    buf.push(rows, idx); atByte += rows.length + idx.length;
  }
  for (const p of FRAME_PARTS) {
    let kept = [...Array(counts[p]).keys()].filter(i => frames.some(f => f[p][i][15] > 1e-4));
    if (!kept.length) kept = [0];   /* a part that never shows keeps one row, so the browser still has the part it names */
    const unique = [], poses = [];
    const take = (idxs) => {   /* the frames of one entry: every distinct picture once */
      const keys = idxs.map(i => rowsKey(frames[i][p], kept));
      if (keys.every(k => k === keys[0])) { unique.push(idxs[0]); return { first: unique.length - 1, count: 1, key: keys[0] }; }
      const first = unique.length; idxs.forEach(i => unique.push(i)); return { first, count: idxs.length, key: keys.join('|') };
    };
    for (const v of ['home', 'chain', 'record', 'links']) { const e = take(VIEW_FRAMES[v][0]); poses.push({ view: v, first: e.first, count: e.count }); }
    const o1 = take(VIEW_FRAMES.open[0]), o2 = take(VIEW_FRAMES.open[1]);
    if (o1.count === 1 && o2.count === 1 && o1.key === o2.key) { unique.pop(); poses.push({ view: 'open', first: o1.first, count: 1 }); }
    else poses.push({ view: 'open', first: o1.first, count: o1.count, axis: 'aspect', value: 1 }, { view: 'open', first: o2.first, count: o2.count, axis: 'aspect', value: 2 });
    writePart(p, unique.map(i => kept.map(r => frames[i][p][r])), kept, poses);
  }
  /* the pulse parts: their frames are samples of the run channel. The samples are the sixteenths of the run and the knots of the two pulses (the ring ends at run
     1 / 1.7, the bead's knots are where it passes a record: br = k / (nR - 1) at run .22 + .78 br), so a piecewise line between samples is the pulse itself */
  const RUNS = [...new Set([...[...Array(17).keys()].map(k => k / 16), 1 / 1.7, ...[...Array(nR).keys()].map(k => .22 + .78 * k / (nR - 1))].map(x => Math.round(x * 1e4) / 1e4))].sort((x, y) => x - y);
  for (const p of PULSE_PARTS) {
    const per = p === 'kring' ? 40 : 1, all = [...Array(per).keys()], unique = [[...Array(per)].map(() => hidden(null, TONES.signal))], poses = [];
    poses.push({ view: 'home', first: 0, count: 1 }, { view: 'open', first: 0, count: 1 });
    /* the ring is in the key's units and the same at every record; the bead's place is the ring's, so it has a frame per record where it differs */
    const sample = (v, run) => {
      const ids = VIEW_FRAMES[v][0], pics = ids.map(i => frames[i].pulse(run)[p]), keys = pics.map(r => rowsKey(r, all));
      if (!pics.some(r => r.some(x => x[15] > 1e-4))) return { first: 0, count: 1 };
      if (keys.every(k => k === keys[0])) { const k = pics[0].map(key).join(';'); const hit = unique.findIndex(fr => fr.map(key).join(';') === k); if (hit >= 0) return { first: hit, count: 1 }; unique.push(pics[0]); return { first: unique.length - 1, count: 1 }; }
      const first = unique.length; pics.forEach(r => unique.push(r)); return { first, count: pics.length };
    };
    for (const v of ['chain', 'record', 'links']) for (const run of RUNS) poses.push({ view: v, ...sample(v, run), axis: 'run', value: run });
    writePart(p, unique, all, poses);
  }
  const bytes = Buffer.concat(buf);
  const perFrame = FRAME_PARTS.reduce((n, p) => n + counts[p], 0);

  /* ---------- the cameras (chains-scene.js target()), as WVIEW numbers ---------- */
  const E = 32;
  const cameras = {
    chain: { aim: [RINGC[0], RINGC[1] + TC * .62, RINGC[2] + TC * .2], fit: { w: 2 * (RCT * .95 + .62 * TC), h: (2 * RCT + .6 * TC) * Math.sin(E * D2R) + TC * 1.35 * Math.cos(E * D2R) + TC * .55, fill: .88 }, elev: 32, yaw: 0, tilt: 1.4 },
    record: { aim: [FRONT[0] + TS * .3, FRONT[1] + TS * MID, FRONT[2] - TS * .25], fit: { w: TS * 3.7, h: TS * 1.9, fill: .92 }, elev: 9, yaw: 0, tilt: 1.4 },
    links: { aim: [LC[0], LC[1] + TC * .8, LC[2] + TC * 1.0], fit: { w: (nR - 1) * LSP + TC * 1.6, h: TC * 4.6, fill: .92 }, elev: 24, yaw: 0, tilt: 1.2,
      aimx: recs.map((r, sel) => ((nR - 1 - sel) - (nR - 1) / 2) * LSP * .3) },
    open: { aim: [FRONT[0], FRONT[1] + TS * MID, FRONT[2]], dist: TS * .5 / TAN + HALF_D * TS, elev: 0, yaw: 0, tilt: 0 }
  };
  return { order, layout, perFrame, frameCount: frames.length, nR, nY, bytes, cameras, VIEWS, swing, slotOf, recOfSlot, sizes: { TC, TS, RISE, RCT, RCR, RINGC, KR }, centre: [Y.c.x, Y.c.z], parts: PARTS, counts };
}

/* ---------- the records of the chain group (CONTRACT.md "Stage records", PORT.md batch 1) ----------
   WFRAME / WPART      the frames' blob and its parts, under the name dyn (the four views share one blob)
   WPOSE               which frames of the blob belong to a view: the first frame, how many (one per record the ring is turned to), and the
                       aspect the frame was evaluated at (the open view's row spreads with the stage's width: x is linear in it)
   WSET / WCHAN        the settled value of each channel in each view; the windows a channel moves in (chains-scene.js morph()), grow and shrink
   WDRV                which channel drives a part's blend between two views' frames, with its gain, its stagger and its curve
   WITEM               the record each tile slot of the ring stands for
   WNAMES              the words: hover names and actions, plate texts, label places */
export function chainRecords(scene, o) {
  const { num, sha, site, recs } = o;
  const rec = [], files = [];
  const cid = sha(scene.bytes);
  files.push({ name: cid + '.bin', bytes: scene.bytes });
  const VIEW_NAMES = ['chain', 'record', 'links', 'open'];
  rec.push(`WFRAME-Rdyn-C${cid}-A${scene.bytes.length}`);
  /* the ring of light is written in the key's units and laid on the key's row (how a part rides another part's row) */
  rec.push('WATTACH-Rdyn-Mkring-Nkey');
  /* each part: where its rows start, the ranges of its rows that show in some frame (a row that never shows is not written), and its frames per view */
  for (const p of scene.layout) {
    rec.push(`WPART-Rdyn-M${p.name}-O${p.offset}-A${p.count}` + (p.name === 'ytile' || p.name === 'pane' ? '-L1' : ''));   /* A: the rows of the part's pool; its table of 16-bit indexes follows them */
    for (const [o, n] of p.ranges) rec.push(`WROWS-Rdyn-M${p.name}-O${o}-A${n}`);
    for (const q of p.poses) rec.push(`WPOSE-R${q.view}-M${p.name}-I${q.first}-A${q.count}` + (q.axis ? `-N${q.axis}-X${num(q.value)}` : ''));
  }
  /* poses: the frames of a view in the order the stage evaluated them (how many records the ring can turn to, and the aspects the card row was evaluated at) */
  const first = {};
  scene.order.forEach(([name, pos, A], i) => { const key = name + A; if (first[key] == null) first[key] = i; });
  rec.push(`WPOSE-Rhome-I${first.home1}-A1`);
  for (const v of ['chain', 'record', 'links']) rec.push(`WPOSE-R${v}-I${first[v + 1]}-A${scene.nR}`);
  rec.push(`WPOSE-Ropen-I${first.open1}-A${scene.nR}-Naspect-X1`, `WPOSE-Ropen-I${first.open2}-A${scene.nR}-Naspect-X2`);
  /* the cameras */
  const r4 = v => Math.round(v * 1e4) / 1e4;
  for (const v of VIEW_NAMES) {
    const c = scene.cameras[v];
    if (c.fit) rec.push(`WVIEW-R${v}-X${num(r4(c.aim[0]))}-Y${num(r4(c.aim[1]))}-Z${num(r4(c.aim[2]))}-D${num(r4(c.fit.w))}-J${num(r4(c.fit.h))}-V${num(c.fit.fill)}-H${num(c.elev)}-U${num(c.yaw)}-T${num(c.tilt)}-B1`);
    else rec.push(`WVIEW-R${v}-X${num(r4(c.aim[0]))}-Y${num(r4(c.aim[1]))}-Z${num(r4(c.aim[2]))}-D${num(r4(c.dist))}-H${num(c.elev)}-U${num(c.yaw)}-T${num(c.tilt)}-B1`);
  }
  scene.cameras.links.aimx.forEach((dx, sel) => rec.push(`WSET-Rlinks-I${sel}-Naimx-V${num(r4(dx))}`));
  /* the channels' settled values per view; a view that is not here holds every channel at 0 */
  const CH = ['m', 'j', 'kk', 'g', 's', 'l', 'p', 'n'];
  for (const v of VIEW_NAMES) { for (const c of CH) rec.push(`WSET-R${v}-I0-N${c}-V${num(scene.VIEWS[v][c])}`); rec.push(`WSET-R${v}-I0-Nks-V${num(r4(scene.VIEWS[v].ks))}`); }
  /* the windows of chains-scene.js step(): cur.x = morph(from.x, to.x, u, inA, inB, outA, outB), read from the text */
  const src = fs.readFileSync(stageSrc('chains-scene.js'), 'utf8');
  const win = {};
  for (const m of src.matchAll(/cur\.(\w+) = morph\(from\.\w+, to\.\w+, u, ([0-9.]+), ([0-9.]+), ([0-9.]+), ([0-9.]+)\);/g)) win[m[1]] = [+m[2], +m[3], +m[4], +m[5]];
  const pm = /cur\.p = morph\(from\.p, to\.p, u, to\.pw, 1, 0, to\.s > from\.s \? \.5 : \.7\);/.exec(src);
  if (!pm) throw new Error('scripts/lib/stage-src/chains-scene.js: the page slab\'s window "cur.p = morph(from.p, to.p, u, to.pw, 1, 0, to.s > from.s ? .5 : .7)" was not found, so its timing cannot be derived');
  for (const c of ['m', 'j', 'kk', 'g', 's', 'l', 'n']) if (!win[c]) throw new Error('scripts/lib/stage-src/chains-scene.js: no "cur.' + c + ' = morph(from.' + c + ', to.' + c + ', u, a, b, c, d)" line, so the window of channel ' + c + ' cannot be derived');
  const keys = (view, c, dir, a, b) => {
    const pk = (A, V, L) => `WCHAN-R${view}-N${c}-I${dir}-A${Math.round(A * 1000)}-V${V}-L${L}`;
    return [pk(0, 0, 0), pk(a, 0, 0), pk(b, 1, 5), pk(1, 1, 0)];
  };
  const pw = { chain: .45 };
  for (const c of ['m', 'j', 'kk', 'g', 's', 'l', 'n']) rec.push(...keys('flight', c, 1, win[c][0], win[c][1]), ...keys('flight', c, 0, win[c][2], win[c][3]));
  for (const v of VIEW_NAMES) rec.push(...keys(v, 'p', 1, pw[v] || .35, 1), ...keys(v, 'p', 0, 0, v === 'open' ? .5 : .7));
  rec.push('WCHAN-Rflight-Ne-A0-V0-L0', 'WCHAN-Rflight-Ne-A1000-V1-L5');
  /* the run of the entering flight: nothing for the first half, then one line to the end (chains-scene.js cur.run = clamp01((u - .5) / .5), u the flight's own clock) */
  rec.push('WCHAN-Rflight-Nrun-I1-A0-V0-L0', 'WCHAN-Rflight-Nrun-I1-A500-V0-L0', 'WCHAN-Rflight-Nrun-I1-A1000-V1-L0');   /* the flight's clock: the kernel's in-out ease, which the camera and the rr, cs, ks lerps ride */
  /* which channel drives which part's blend between two frames. First channel of the list that differs between the two views wins.
     chains-scene.js reads: tiles m (gain 1.25, a stagger of .05 per record from the end), l (gain 1.35, .09 per record from the chosen), s (linear); the rest follow the tiles. */
  /* BS: the stagger of a part's rows, by the record a row belongs to: fromend (the older a record, the earlier it starts), fromsel (the nearer the chosen record, the earlier),
     fromlink (the older the link, the earlier). With the prefix abs the channel's own value drives the row, not its progress from where it stood: chains-scene.js reads m, l and j
     as they are (mj = m x 1.25 - rank x .05), so a row that leaves goes back in the order it came */
  const nR = scene.nR;
  const DRV = {
    ytile: [['s', 1, 0, 0, 'none'], ['l', 1.35, .09, 5, 'abssel'], ['m', 1.25, .05, 5, 'absend'], ['e', 1, 0, 0, 'none']],
    ylink: [['m', 2, 0, 0, 'none'], ['e', 1, 0, 0, 'none']],
    clink: [['j', nR, 1, 2, 'abslink'], ['s', 1, 0, 0, 'none'], ['l', 1.35, .09, 5, 'abssel'], ['m', 1.25, .05, 5, 'absend'], ['e', 1, 0, 0, 'none']],
    pane: [['g', 1, 0, 0, 'none'], ['l', 1, 0, 0, 'none'], ['s', 1, 0, 0, 'none'], ['m', 1, 0, 0, 'none'], ['e', 1, 0, 0, 'none']],
    key: [['kk', 1, 0, 0, 'none'], ['s', 1, 0, 0, 'none'], ['l', 1, 0, 0, 'none'], ['e', 1, 0, 0, 'none']],
    rel: [['l', 1, 0, 0, 'none'], ['s', 1, 0, 0, 'none'], ['e', 1, 0, 0, 'none']],
    pool: [['s', 1, 0, 0, 'none'], ['l', 1, 0, 0, 'none'], ['m', 1, 0, 0, 'none'], ['e', 1, 0, 0, 'none']]
  };
  const ATTACHED = [['s', 1, 0, 0, 'none'], ['l', 1, 0, 0, 'none'], ['g', 1, 0, 0, 'none'], ['m', 1, 0, 0, 'none'], ['e', 1, 0, 0, 'none']];
  for (const p of scene.parts) {
    if (p === 'slab' || p === 'slabrim' || p === 'spot' || PULSE_PARTS.includes(p)) continue;
    const list = DRV[p] || ATTACHED;
    list.forEach((d, i) => rec.push(`WDRV-Rchain-M${p}-I${i}-N${d[0]}-V${num(d[1])}-T${num(d[2])}-L${d[3]}-BS${d[4]}`));
  }
  /* items: the record each slot of the ring stands for (id = the record's number, 0 the newest) */
  scene.recOfSlot.forEach((j, q) => { if (j >= 0) rec.push(`WITEM-Rdyn-I${j}-Mytile-O${q}-A1`); });
  /* the tile slots that hold no record fold away; their ids are above the records' so no hover or pick can name them */
  scene.recOfSlot.forEach((j, q) => { if (j < 0) rec.push(`WITEM-Rdyn-I${100 + q}-Mytile-O${q}-A1`); });
  /* your ring's place among the rings of the home frame (its tiles fold away while these frames draw them), and how far the page slab lifts out of its tile */
  rec.push(`WSET-Rdyn-I0-Nmine-V${o.mine}`, `WSET-Rdyn-I0-Nlift-V${num(r4(scene.sizes.TC * 1.6))}`);
  rec.push('WSPAN-Rflight-Npos-D420', 'WSET-Rflight-I0-Nposstep-V110', 'WCHAN-Rflight-Npos-A0-V0-L0', 'WCHAN-Rflight-Npos-A1000-V1-L2');   /* the ring turns on 420 ms and 110 more for each record it passes, easing out */
  /* polar blends: the ring's tiles travel on arcs about the ring's centre */
  rec.push(`WSPOT-Rchain-Ncentre-X${num(r4(scene.centre[0]))}-Y0-Z${num(r4(scene.centre[1]))}`);
  rec.push('WSET-Rhome-I0-Npolar-V1', 'WSET-Rchain-I0-Npolar-V1', 'WSET-Rrecord-I0-Npolar-V1');
  /* the swing of the chosen tile as it becomes the card */
  rec.push(`WSET-Ropen-I0-Nswingz-V${num(r4(scene.swing.dz))}`, `WSET-Ropen-I0-Nswingyaw-V${num(r4(scene.swing.dyaw))}`, `WSET-Ropen-I0-Nswingy-V${num(r4(scene.swing.dy))}`);

  /* the words: tab separated, one line each */
  const clean = s => String(s == null ? '' : s).replace(/[\t\r\n]+/g, ' ').trim();
  const lines = [];
  const pad2 = v => String(v).padStart(2, '0');
  const ACT = { chain: ['Open', 'Choose', 'all'], record: ['Open', 'Next in chain', 'selnext'], links: ['Open', 'Choose', 'all'], open: ['Open', 'Choose', 'notsel'] };
  recs.forEach((r, j) => lines.push(['recid', j, r.id]));
  recs.forEach((r, j) => { for (const v of VIEW_NAMES) lines.push(['rec', j, v, r.title, ACT[v][0], ACT[v][1], ACT[v][2]]); });
  const r0 = recs[0];
  if (r0.earlier) for (let i = 0; i < 3 && i < r0.earlier[1] - r0.earlier[0] + 1; i++) lines.push(['pane', i, 'record', 'Rev ' + pad2(r0.earlier[1] - i), 'Earlier version, kept on file']);
  /* plates: what is written on a face, from the sample's own words (chains-scene.js drawRecord, panePlates) */
  recs.forEach((r, j) => lines.push(['plate', 'plate' + j, 'record', r.revision ? 'REV ' + pad2(r.revision) : 'RECORD', r.title, String(r.date || '').toUpperCase(), r.signedBy ? 'SIGNED' : '']));
  for (let i = 0; i < 3; i++) lines.push(['plate', 'plate' + (recs.length + i), 'rev', r0.earlier && i < r0.earlier[1] - r0.earlier[0] + 1 ? 'REV ' + pad2(r0.earlier[1] - i) : '']);
  lines.push(['plate', 'plate' + (recs.length + 3), 'person']);
  /* the places labels hang, in the order of the frame's spot rows, and the view and channel that lets each show */
  const SPOTS = [['key', 'chain', 'links'], ['oldest', 'chain'], ['newest', 'chain'], ['next', 'record'], ...recs.map(r => ['rec-' + r.id, 'links']), ['ghosts', 'links'], ['rel-0', 'links'], ['rel-1', 'links']];
  SPOTS.forEach((s, i) => lines.push(['spot', i, s[0], s.slice(1).join(',')]));
  lines.push(['gate', 'chain', 'm', .92], ['gate', 'record', 'm', .92], ['gate', 'links', 'l', .92]);
  const names = Buffer.from(lines.map(l => l.map(clean).join('\t')).join('\n') + '\n', 'utf8'), namesCid = sha(names);
  files.push({ name: namesCid + '.txt', bytes: names });
  rec.push(`WNAMES-Rdyn-C${namesCid}-A${names.length}`);
  return { rec, files, cid };
}

/* ---------- the ring view (ring-stage.js): the chosen ring rises out of the network and stays lit ---------- */
export function ringRecords(o) {
  const { N, cast, num, site } = o;
  const src = fs.readFileSync(stageSrc('ring-stage.js'), 'utf8');
  for (const n of ['elev: 30, yaw: 0, tilt: 2.4, n: 1.25', 'W.fit(r.outer * 2 + r.t * 3.4, r.outer * 2 * Math.sin(30 * W.D2R) + r.t * 3.8, asp, .8)', "var want = i === sel && w > .001 ? 1 : 0", 'a = k.reduced ? 1 : 1 - Math.exp(-dt / 240)', 'out.pos.set(r.c.x, r.c.y + top(r) - (k.LIFT + .5) * s, r.c.z); out.quat.identity(); out.s = s;', 'var r = rings[sel], s = r.R * .7;', 'return r.i === N.HUB ? 0 : W.riseH ? W.riseH(r) : r.R * .9 + 1.6;'])
    if (!src.includes(n)) throw new Error('scripts/lib/stage-src/ring-stage.js no longer holds "' + n + '", so the ring view cannot be derived from it');
  sourceGuard(stageSrc('chains-scene.js'), ['function riseH(r) { return r.parent ? r.parent.t * 2.6 + r.R * 1.8 : r.R * .9 + 1.6; }']);
  const rec = [], r4 = v => Math.round(v * 1e4) / 1e4, rings = cast.rings;
  const norm = id => String(id).replace(/[^a-z0-9]/g, '');
  rings.forEach((r, i) => {
    const top = r.i === N.HUB ? 0 : r.parent ? r.parent.t * 2.6 + r.R * 1.8 : r.R * .9 + 1.6, s = r.R * .7;
    rec.push(`WSTATE-Rring-I${i}-N${norm(N.IDS[i])}`);
    rec.push(`WVIEW-Rring${i}-X${num(r4(r.c.x))}-Y${num(r4(r.c.y + top + r.t * .6))}-Z${num(r4(r.c.z))}-D${num(r4(r.outer * 2 + r.t * 3.4))}-J${num(r4(r.outer * 2 * Math.sin(30 * D2R) + r.t * 3.8))}-V0p8-H30-U0-T2p4-B1p25`);
    rec.push(`WSET-Rring-I${i}-Nriseh-V${num(r4(top))}`, `WSET-Rring-I${i}-Nsize-V${num(r4(s))}`, `WSET-Rring-I${i}-Nn-V1p25`, `WSET-Rring-I${i}-Np-V1`);
    rec.push(`WSPOT-Rring-N${i}-X${num(r4(r.c.x))}-Y${num(r4(r.c.y + top - (LIFT + .5) * s))}-Z${num(r4(r.c.z))}`);
  });
  rec.push('WCHAN-Rring-Nrise-A0-V0-L0', 'WCHAN-Rring-Nrise-A1000-V1-L2', 'WSPAN-Rring-Nrise-D1000');   /* a rise follows its target with tau 240 ms: an ease out over a second */
  return { rec };
}
