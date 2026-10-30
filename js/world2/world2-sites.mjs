/* World grammar, the two radio.fxn site panes of home (docs/design/world-grammar/PORT.md, "home causes").

   The encoder (scripts/lib/world-sites-scene.mjs) ran home-sites.js with recorders and wrote each pane's rows as samples along two channels, the file's own numbers:
     rise<j>   how far pane j has come out of its ring, 0 to 1;    hov<j>   how far the pointer has lifted it, 0 to 1.
   A row here is its rest plus what each channel adds, read the way world2-idrig.mjs reads the identity steps (world2-rows.mjs). What is drawn:
     the glass       a bevelled block through the mesh pass (world2-pieces.mjs): satin, clear coat, the baked room, sorted glass at .82
     four bars       light that adds (the renderer's `glow` part, a cube each), the edge of the glass
     the words       a canvas painted once from the canvas calls the encoder recorded (world2-plates.mjs, `ops`), laid on the glass as a text part
     the line        two cylinders of light (a core and a soft halo) from the pane's foot to its ring, and a bead at each end: a row is the line's two ends and its radius, laid as a cylinder
   What the data cannot say, because it depends on the page: the pane slides along the screen until it stands clear of the hero's words, the header and the side column (home-sites.js fit()).
   That measures the page's own boxes, so it is done here, from the pane's rest rows and the camera home rests at. The slide is a world-space move, scaled by how far out of its ring the pane is
   (the file puts a pane at foot + (place + slide - foot) x u), and it moves the pane's rows, the line's far end and the bead there; the line's near end and the bead on the ring stay.
   Time: a pane's rise and sink run on the clock, not on frames; the pointer's follower is the file's own step per frame (hovstep). Nothing here schedules a frame: step(now) says whether
   anything still moves, and the host asks for another frame only then (workspace law: animations settle). No JSON. */
import { uvSphere, prism } from '/fxn-3d/js/render/world2-shapes.mjs';
import { projection, view as viewMatrix, eyeOf } from '/fxn-3d/js/render/world2-math.mjs';
import { paintIdPlate } from './world2-plates.mjs';
import { loadPart, resolveRow, alongPts } from './world2-rows.mjs';

const TAU = Math.PI * 2, clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x), GROUP = 'sites';
const unhex = (h) => { const b = new Uint8Array(h.length / 2); for (let i = 0; i < b.length; i++) b[i] = parseInt(h.substr(i * 2, 2), 16); return new TextDecoder().decode(b); };

/* o: { world, R, blob, lines, palette, pieces, wake, list, reduced, fov, page, layerBox, homeCam, building, clock }
   world, R: the decoded world and the renderer; blob, lines: the group's rows and words; palette(): the live linear tones; pieces: the mesh pass (null draws no glass); list: the host's draw list;
   fov: the lens in degrees; page(): home's page element; layerBox(): the canvas's box on the page; watch(el): marks a page element this file measures, so the host re-measures when its transition ends; homeCam(): the camera home rests at { aim, dist, elev, yaw (degrees), frame, W, H };
   building(), clock(): whether the first visit's build-up runs, and its clock in ms */
export function createSites(o) {
  const { world, R, blob, lines, palette, pieces, wake, list, reduced, fov } = o, S = world.stage, parts = world.parts[GROUP] || [];
  const kinds = new Map(), site = new Map(), tones = [], twin = new Map();
  for (const c of lines) {
    if (c[0] === 'kind') kinds.set(c[1], { kind: c[2], args: c.slice(3).map(Number) });
    else if (c[0] === 'site') site.set(c[1], { pane: Number(c[2]), shift: c[3] });
    else if (c[0] === 'mixtone') { const w = []; for (let k = 2; k + 1 < c.length; k += 2) w.push([Number(c[k]), Number(c[k + 1])]); tones.push({ index: Number(c[1]), weights: w }); }
    else if (c[0] === 'same') twin.set(c[1], c[2]);
  }
  const num = (name, i) => { const s = S.set[GROUP] && S.set[GROUP][i || 0]; if (!s || s[name] == null) throw new Error('sites: the group has no WSET ' + name + ' for pane ' + (i || 0) + ', so the panes cannot be timed. Run the world encoder again.'); return s[name]; };
  const RISE = num('rise'), SINK = num('sink'), STAGGER = num('stagger'), HOV = num('hovstep');
  const nPane = 1 + Math.max(...[...site.values()].map((q) => q.pane));
  const ring = [], built = []; for (let j = 0; j < nPane; j++) { ring[j] = num('ring', j); built[j] = num('built', j); }
  const words = (j) => { const t = (S.text[GROUP] || {})['s' + j + 'b'] || {}; return { name: t[0] != null ? unhex(t[0]) : '', act: t[1] != null ? unhex(t[1]) : '' }; };

  /* ---------- the palette: the renderer's tones, then the mixes the stage names ---------- */
  let palFor = null, palOut = null;
  function pal() {
    const base = palette();
    if (base === palFor) return palOut;
    palFor = base; const n = base.length / 3;
    palOut = new Float32Array((Math.max(n, ...tones.map((t) => t.index + 1))) * 3); palOut.set(base);
    for (const t of tones) for (let k = 0; k < 3; k++) { let v = 0; for (const [i, w] of t.weights) v += palOut[i * 3 + k] * w; palOut[t.index * 3 + k] = v; }
    return palOut;
  }

  /* ---------- the shapes the renderer is given by name (shared with world2-idrig.mjs: one name, one shape) ---------- */
  R.addShape('idsphere', uvSphere(10, 8));
  R.addShape('idcyl8', prism(Array.from({ length: 8 }, (_, i) => [Math.sin(i * TAU / 8), Math.cos(i * TAU / 8)])));

  /* ---------- the parts ---------- */
  const P = {}, order = [];
  for (const p of parts) {
    const k = kinds.get(p.part), s = site.get(p.part);
    if (!k || !s) throw new Error('sites: part ' + p.part + ' has no kind or site line in the group\'s words, so the renderer cannot draw it. Run the world encoder again.');
    let cfg;
    switch (k.kind) {
      case 'pane': { const a = k.args; cfg = { piece: { box: [a[0], a[1], a[2], a[3]], mat: { opacity: a[4], metal: a[5], rough: a[6], coat: a[7], coatRough: a[8], env: a[9] } } }; break; }
      case 'glowcube': cfg = { like: 'glow', shape: 'cube', glow: [1, 0, 1] }; break;
      case 'glowsphere': cfg = { like: 'glow', shape: 'idsphere', glow: [1, 0, 1] }; break;
      case 'rod': cfg = { like: 'glow', shape: 'idcyl' + k.args[0], glow: [1, 0, 1], rod: true }; break;
      case 'text': cfg = { like: 'text' }; break;
      case 'ctl': cfg = {}; break;
      default: throw new Error('sites: kind ' + k.kind + ' of part ' + p.part + ' is not one the renderer draws. Update world2-sites.mjs or the encoder.');
    }
    const e = loadPart(S, GROUP, p, blob, cfg);
    e.pane = s.pane; e.shift = s.shift; e.kind = k.kind; e.rod = !!cfg.rod;
    e.lay = e.rod ? new Float32Array(Math.max(1, e.per) * 16) : null;
    e.buf = cfg.like ? R.buffer(e.lay || e.out) : null; e.part = null; e.piece = null;
    const own = e.entries[GROUP] || [], base = own.find((q) => !q.axis);
    e.baseFrame = base ? base.first : 0; e.samples = {};
    for (const q of own) if (q.axis) (e.samples[q.axis] || (e.samples[q.axis] = [])).push(q);
    for (const l of Object.values(e.samples)) l.sort((x, y) => x.value - y.value);
    if (cfg.like) e.part = { part: p.part, like: cfg.like, shape: cfg.shape, buffer: e.buf, offset: 0, count: 0, direct: true, glow: cfg.glow, noShadow: true, cpu: (e.lay || e.out).buffer };
    if (cfg.piece) {
      if (pieces) { try { e.piece = pieces.add(p.part, cfg.piece, e.out); } catch (err) { if (window.console) console.warn('[world2] the pane glass is not drawn by the mesh pass (' + err.message + ')'); } }
      else if (window.console) console.warn('[world2] the mesh pass did not start, so the site panes draw no glass');
    }
    P[p.part] = e; order.push(e);
  }
  const byPane = []; for (let j = 0; j < nPane; j++) byPane[j] = order.filter((e) => e.pane === j);
  const part = (j, tail) => P['s' + j + tail];

  /* ---------- rows: the rest plus what each channel adds ---------- */
  const B0 = new Float32Array(16), B = new Float32Array(16), SM = new Float32Array(16), LO = new Float32Array(16), HI = new Float32Array(16);
  function evaluate(e, live, into) {
    const P_ = pal(), out = into || e.local || (e.local = new Float32Array(e.out.length));
    for (let n = 0; n < e.kept.length; n++) {
      const i = e.kept[n], o = i * 16;
      resolveRow(e, e.baseFrame, i, B0, P_); for (let k = 0; k < 16; k++) B[k] = B0[k];
      for (const c in e.samples) { alongPts(e, e.samples[c], live[c] == null ? 0 : live[c], i, SM, P_, LO, HI); for (let k = 0; k < 16; k++) B[k] += SM[k] - B0[k]; }
      for (let k = 0; k < 16; k++) out[o + k] = B[k];
    }
    return out;
  }

  /* ---------- the panes' state: how far out, how far lifted ---------- */
  const st = []; for (let j = 0; j < nPane; j++) st[j] = { ru: 0, ru0: 0, t0: 0, dir: 0, startAt: 0, hov: 0, want: 0, fit: [0, 0, 0], u: 0, shown: false };
  let wantHome = false, seen = false, drawn = false, dirty = true;   /* dirty: a pane's rows must be laid again (a channel moved, the page, the theme or the camera changed) */

  /* ---------- the slide (home-sites.js fit()): clear of the words, the header and the side column ---------- */
  let boxes = null, fitDirty = true;
  function lineBoxes(el, out) {
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), rg = document.createRange(); let t;
    while ((t = walk.nextNode())) { if (!t.textContent.trim()) continue; rg.selectNodeContents(t); out.push.apply(out, Array.prototype.slice.call(rg.getClientRects())); }
  }
  function measure() {
    const home = o.page(); if (!home) return null;
    const box = o.layerBox(), lines = [];
    ['.eyebrow', 'h1', '.lede', '.paths'].forEach((q) => { const el = home.querySelector(q); if (el) lineBoxes(el, lines); });
    const cta = o.watch(home.querySelector('.copy .cta')); if (cta) lines.push(cta.getBoundingClientRect());
    const side = o.watch(home.querySelector('.rail')), sr = side && side.getBoundingClientRect(), top = o.watch(document.querySelector('.top, .ark-header'));
    /* the page's boxes in the canvas's own pixels */
    return { lines: lines.map((b) => ({ top: b.top - box.top, bottom: b.bottom - box.top, right: b.right - box.left })), r: (sr && sr.width ? sr.left : innerWidth) - box.left - 14, t: (top ? top.getBoundingClientRect().bottom : 0) - box.top + 6 };
  }
  /* a pane's rest rows: its glass matrix and the line's first end, at full rise and no lift, with no slide */
  const rest = [];
  for (let j = 0; j < nPane; j++) {
    const live = { ['rise' + j]: 1, ['hov' + j]: 0 }, g = part(j, 'b'), r = part(j, 'r'), gl = evaluate(g, live, new Float32Array(g.out.length)), rl = evaluate(r, live, new Float32Array(r.out.length));
    rest[j] = { m: Array.from(gl.slice(0, 12)), foot: [rl[0], rl[1], rl[2]], w: kinds.get(g.name).args[0], h: kinds.get(g.name).args[1] };
  }
  function slideFor(j) {
    const c = o.homeCam(); if (!c || !boxes) return [0, 0, 0];
    const d2r = Math.PI / 180, cam = { aim: c.aim, dist: c.dist, elev: c.elev * d2r, yaw: c.yaw * d2r, frame: c.frame, W: c.W, H: c.H };
    const pr = new Float32Array(16), vw = new Float32Array(16), eye = eyeOf(cam.aim, cam.dist, cam.elev, cam.yaw);
    projection(pr, fov, 1, 500, cam.frame, cam.W, cam.H); viewMatrix(vw, eye, cam.aim);
    const proj = (p) => {
      const vx = vw[0] * p[0] + vw[4] * p[1] + vw[8] * p[2] + vw[12], vy = vw[1] * p[0] + vw[5] * p[1] + vw[9] * p[2] + vw[13], vz = vw[2] * p[0] + vw[6] * p[1] + vw[10] * p[2] + vw[14];
      return [((pr[0] * vx + pr[8] * vz) / -vz * .5 + .5) * cam.W, (1 - ((pr[5] * vy + pr[9] * vz) / -vz * .5 + .5)) * cam.H];
    };
    const m = rest[j].m; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let q = 0; q < 4; q++) {
      const lx = (q & 1 ? .5 : -.5) * rest[j].w, ly = (q & 2 ? .5 : -.5) * rest[j].h, w = [m[0] * lx + m[3] * ly + m[9], m[1] * lx + m[4] * ly + m[10], m[2] * lx + m[5] * ly + m[11]], s = proj(w);
      x0 = Math.min(x0, s[0]); x1 = Math.max(x1, s[0]); y0 = Math.min(y0, s[1]); y1 = Math.max(y1, s[1]);
    }
    let L = 0, dx = 0; const dy = y0 < boxes.t ? boxes.t - y0 : 0;
    boxes.lines.forEach((b) => { if (b.bottom > y0 + dy - 8 && b.top < y1 + dy + 8) L = Math.max(L, b.right + 16); });
    if (x1 > boxes.r) dx = boxes.r - x1;
    if (x0 + dx < L) dx = L - x0;   /* the words win over the side column: a panel over words is worse */
    /* the move on the screen, in world units at the pane's depth: right and up of the camera as the view matrix has them, the frame's height in pixels the scale */
    const at = [m[9], m[10], m[11]], right = [vw[0], vw[4], vw[8]], up = [vw[1], vw[5], vw[9]], fwd = [-vw[2], -vw[6], -vw[10]];
    const depth = (at[0] - eye[0]) * fwd[0] + (at[1] - eye[1]) * fwd[1] + (at[2] - eye[2]) * fwd[2], wpp = 2 * depth * Math.tan(fov * Math.PI / 360) / Math.max(1, cam.frame.h);
    return [right[0] * dx * wpp - up[0] * dy * wpp, right[1] * dx * wpp - up[1] * dy * wpp, right[2] * dx * wpp - up[2] * dy * wpp];
  }
  function refit() {
    fitDirty = false; boxes = measure();
    for (let j = 0; j < nPane; j++) st[j].fit = slideFor(j);
  }

  /* ---------- the words on the glass, painted once ---------- */
  let themeKey = 0;
  function paint() {
    themeKey++;
    for (const e of order) {
      if (e.kind !== 'text' || !e.part) continue;
      const own = (S.text[GROUP] || {})[twin.get(e.name) || e.name], hex = own && own[0];
      if (hex == null) continue;
      const cv = paintIdPlate(unhex(hex).split('\t'));
      if (e.part.tex) R.dropTexture(e.part.tex);
      e.part.tex = 'sites:' + e.name + ':' + themeKey; R.setTexture(e.part.tex, cv);
    }
  }
  paint();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { paint(); boxes = null; fitDirty = true; wake(); });

  /* ---------- the storyboard: rise out of the ring once it has built, sink as the camera leaves ---------- */
  function setTarget(j, to, at, startAt) { const s = st[j]; s.ru0 = s.ru; s.t0 = at; s.startAt = startAt; s.dir = to > s.ru ? 1 : to < s.ru ? -1 : 0; s.to = to; }
  /* the view the camera arrives at: home, or not. The first time home shows during the first visit's build-up, each pane waits for its ring and the story's first step, then rises, one after the other
     (home-sites.js riseNow); a visit with no build-up places them at once; every later arrival rises from where the pane is and every departure sinks. */
  function view(on, now) {
    if (on === wantHome && seen) return;
    wantHome = on;
    const story = world.knobs.story || {}, step1 = story.step1 == null ? 0 : story.step1;
    for (let j = 0; j < nPane; j++) {
      if (!on) { setTarget(j, 0, now, now); continue; }
      if (!seen && reduced()) { st[j].ru = 1; setTarget(j, 1, now, now); continue; }
      if (!seen && o.building()) { const wait = Math.max(0, Math.max(step1, built[j]) + j * STAGGER - o.clock()); setTarget(j, 1, now, now + wait); continue; }
      if (!seen) { st[j].ru = 1; setTarget(j, 1, now, now); continue; }
      if (reduced()) { st[j].ru = 1; setTarget(j, 1, now, now); continue; }
      setTarget(j, 1, now, now);
    }
    if (on) seen = true;
    fitDirty = true; dirty = true; wake();
  }

  /* ---------- a frame: where each pane stands, then the draw list ---------- */
  let flushed = true;
  function step(now) {
    let moving = false;
    for (let j = 0; j < nPane; j++) {
      const s = st[j];
      if (s.dir !== 0) {
        if (now < s.startAt) moving = true;
        else {
          const span = s.dir > 0 ? RISE : SINK, ru = reduced() ? s.to : s.ru0 + s.dir * (now - s.startAt) / span;
          s.ru = s.dir > 0 ? Math.min(s.to, ru) : Math.max(s.to, ru);
          if (s.ru === s.to) s.dir = 0; else moving = true;
        }
      }
      if (reduced()) s.hov = s.want; else if (Math.abs(s.want - s.hov) > .002) { s.hov += (s.want - s.hov) * HOV; moving = true; } else s.hov = s.want;
    }
    const any = st.some((s) => s.ru > 0);
    if (any && (fitDirty || !boxes) && wantHome) { refit(); dirty = true; }
    if (moving || palFor !== palette()) dirty = true;
    if (!dirty) return false;
    dirty = moving;   /* a pane that still moves is laid again next frame; one that has settled is laid once more, now, and then left alone */
    for (let j = 0; j < nPane; j++) {
      const s = st[j], live = { ['rise' + j]: s.ru, ['hov' + j]: s.hov };
      s.shown = s.ru > 1e-3;
      for (const e of byPane[j]) evaluate(e, live);
      const ctl = part(j, 'c'); s.u = ctl ? ctl.local[0] : s.ru;
      /* the slide: the pane's rows move by u x slide; the line's near end and the bead on the ring stay */
      for (const e of byPane[j]) {
        if (e.shift === 'none') continue;
        const L = e.local, at = e.shift === 'end' ? 3 : 9;
        for (const i of e.kept) { const o = i * 16; for (let k = 0; k < 3; k++) L[o + at + k] += s.u * s.fit[k]; }
      }
    }
    flushed = false;
    return moving;
  }
  /* a rod's row is its two ends and its radius: laid as the cylinder between them (a prism of radius 1 and height 1 along y, centred) */
  function layRod(e) {
    const L = e.local, out = e.lay; let n = 0;
    for (const i of e.kept) {
      const o = i * 16, dx = L[o + 3] - L[o], dy = L[o + 4] - L[o + 1], dz = L[o + 5] - L[o + 2], len = Math.hypot(dx, dy, dz), rad = L[o + 6];
      if (!(rad > 5e-4) || !(len > 1e-3) || !(L[o + 15] > 1e-4)) continue;
      const ux = dx / len, uy = dy / len, uz = dz / len;
      let hx = 0, hy = 1, hz = 0; if (Math.abs(uy) > .9) { hx = 1; hy = 0; }
      let ax = hy * uz - hz * uy, ay = hz * ux - hx * uz, az = hx * uy - hy * ux; const al = Math.hypot(ax, ay, az); ax /= al; ay /= al; az /= al;
      const bx = uy * az - uz * ay, by = uz * ax - ux * az, bz = ux * ay - uy * ax, d = n * 16;
      out[d] = ax * rad; out[d + 1] = ay * rad; out[d + 2] = az * rad; out[d + 3] = dx; out[d + 4] = dy; out[d + 5] = dz; out[d + 6] = bx * rad; out[d + 7] = by * rad; out[d + 8] = bz * rad;
      out[d + 9] = L[o] + dx / 2; out[d + 10] = L[o + 1] + dy / 2; out[d + 11] = L[o + 2] + dz / 2;
      out[d + 12] = L[o + 12]; out[d + 13] = L[o + 13]; out[d + 14] = L[o + 14]; out[d + 15] = L[o + 15]; n++;
    }
    return n;
  }
  function flush() {
    if (flushed) return;
    flushed = true;
    const showing = st.some((s) => s.shown);
    for (const e of order) {
      if (!e.part) continue;
      const at = list.indexOf(e.part);
      if (showing && at < 0) list.push(e.part); else if (!showing && at >= 0) list.splice(at, 1);
    }
    drawn = showing;
    for (const e of order) {
      const on = st[e.pane].shown;
      if (e.kind === 'ctl') continue;
      if (e.rod) { const n = on ? layRod(e) : 0; e.part.count = n; e.part.c = null; if (n) R.updateBuffer(e.buf, e.lay, 0); continue; }
      let any = false;
      if (on) { e.out.set(e.local); for (let i = 0; i < e.per; i++) if (e.out[i * 16 + 15] > 1e-4) { any = true; break; } }
      if (e.part) { e.part.count = any ? e.per : 0; e.part.c = null; if (any) R.updateBuffer(e.buf, e.out, 0); }
      if (e.piece) pieces.write(e.piece, e.out, any ? e.per : 0);
    }
  }

  /* ---------- touch: the glass of a pane under a point of the canvas (CSS pixels, the canvas's origin), for the camera as drawn ---------- */
  const pr2 = new Float32Array(16), vw2 = new Float32Array(16);
  function at(px, py, c) {
    if (!wantHome) return -1;
    projection(pr2, fov, 1, 500, c.frame, c.W, c.H); viewMatrix(vw2, eyeOf(c.aim, c.dist, c.elev, c.yaw), c.aim);
    for (let j = 0; j < nPane; j++) {
      const s = st[j], g = part(j, 'b');
      if (s.ru < .9 || s.dir !== 0 && s.dir < 0) continue;   /* a pane that has not come out of its ring, or is sinking back, takes no touch (home-sites.js liftable) */
      const L = g.local, w = rest[j].w, h = rest[j].h, q = [];
      for (let k = 0; k < 4; k++) {
        const lx = (k & 1 ? .5 : -.5) * w, ly = (k & 2 ? .5 : -.5) * h, p = [L[0] * lx + L[3] * ly + L[9], L[1] * lx + L[4] * ly + L[10], L[2] * lx + L[5] * ly + L[11]];
        const vx = vw2[0] * p[0] + vw2[4] * p[1] + vw2[8] * p[2] + vw2[12], vy = vw2[1] * p[0] + vw2[5] * p[1] + vw2[9] * p[2] + vw2[13], vz = vw2[2] * p[0] + vw2[6] * p[1] + vw2[10] * p[2] + vw2[14];
        if (!(vz < 0)) { q.length = 0; break; }
        q.push([((pr2[0] * vx + pr2[8] * vz) / -vz * .5 + .5) * c.W, (1 - ((pr2[5] * vy + pr2[9] * vz) / -vz * .5 + .5)) * c.H]);
      }
      if (q.length !== 4) continue;
      /* the corners in order round the quad: 0, 1, 3, 2 */
      const ring4 = [q[0], q[1], q[3], q[2]]; let sign = 0, inside = true;
      for (let k = 0; k < 4 && inside; k++) {
        const a = ring4[k], b = ring4[(k + 1) % 4], cr = (b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0]);
        if (cr !== 0) { if (sign === 0) sign = cr > 0 ? 1 : -1; else if ((cr > 0 ? 1 : -1) !== sign) inside = false; }
      }
      if (inside) return j;
    }
    return -1;
  }
  function hover(j) { let changed = false; for (let k = 0; k < nPane; k++) { const want = k === j ? 1 : 0; if (st[k].want !== want) { st[k].want = want; changed = true; } } if (changed) { dirty = true; wake(); } }

  return { step, flush, view, at, hover, repaint() { paint(); dirty = true; }, relayout() { boxes = null; fitDirty = true; dirty = true; }, wordsOf: (j) => Object.assign(words(j), { ring: ring[j] }), count: nPane, drawn: () => drawn, state: () => st.map((s) => ({ ru: s.ru, hov: s.hov, u: s.u, fit: s.fit.slice(), shown: s.shown })), P, order };
}
