/* The Kit's pose, from the numbers the encoder read out of kit-stage.js (docs/design/world-grammar/PORT.md, 2026-10-30 "kit").
   The stage's own pose() ran in Node at controlled channel values (scripts/lib/kit-scene.mjs); what it did is written to kit.flx as constants, cells and knots. This file turns those
   back into an object's place at a moment. It holds the SHAPE of the stage's rules only: an object grows by a curve of its weight inside a window of its own (grow), stands higher by
   a gain on the lift, turns by its yaw, and its rings tilt and shrink by the same growth. Every number in them is a record. The encoder proves this file against the stage's pose() on a
   grid of channel values and every state (scripts/kit-encode.mjs, "the pose proof"), so a change to kit-stage.js that this file does not follow stops the encoder.
   Curves: the grow curve and each follower's step response are knot tables played by the ONE sampler (fxn-3d anim-sample.mjs sample(), handed in), never a formula typed here.
   No DOM, no GL, no absolute import: the browser and Node load this same file. Nothing here schedules a frame. */

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

/* cfg: decodeKit()'s state; sample: the sampler's sample() */
export function createKitPose(cfg, sample) {
  const c = cfg.c;
  for (const n of ['sc', 'fall', 'liftgain', 'ybase', 'ringtilt', 'ringshrink', 'visat', 'minvis', 'platefall', 'rimlift', 'per', 'cols', 'rows', 'restyaw']) if (c[n] == null) throw new Error('kit.flx has no CFG ' + n + ', so the pose cannot be read. Run node scripts/kit-encode.mjs.');
  /* a knot table as a one-channel animation the sampler plays: t in 0..1 over 1000 frames */
  const anims = {};
  for (const name of Object.keys(cfg.knots)) {
    anims[name] = { scene: { rate: 1000 }, camera: [], lens: [], tracks: { x: { alive: true, pos: cfg.knots[name].map(([t, v]) => ({ frame: t * 1000, value: [v, 0, 0], ease: 0, hold: 0 })), rot: [], scl: [] } } };
  }
  const along = (name, t) => sample(anims[name], t * 1000).pieces.x.pos[0];

  /* the stage's grow(w, a, b): nothing until the weight reaches a, the curve between a and b, whole after b (a part never reaches 0: 1e-4) */
  const grow = (w, a, b) => { const u = clamp01((w - a) / (b - a)); return u <= 0 ? 1e-4 : u < 1 ? along('grow', u) : 1; };
  /* a follower closes on its target by 1 - exp(-dt / tau) a frame (dt at most 64 ms) and snaps when within .002: chains-scene.js W.follower, whose tau the encoder read from kit-stage.js */
  const follow = (name, v, to, dt) => { const d = to - v; if (Math.abs(d) <= .002) return to; return v + d * (1 - Math.exp(-Math.min(64, dt) / c['tau' + name])); };

  /* an object's place for the weight u it grows by (the view's weight times its page's), its lift and its turn */
  function item(cell, u, lift, turn) {
    const q = cfg.cells[cell], g = grow(u, q.a, q.b);
    return { g, visible: g > c.visat, pos: [q.x, q.y + c.ybase - (1 - g) * c.fall + lift * c.liftgain, q.z], s: c.sc * g, yaw: turn, ringTilt: (1 - g) * c.ringtilt, ringScale: 1 - (1 - g) * c.ringshrink };
  }
  /* the floor plate of a cell (and its rim, a little above): the cell's own window of the view's weight; null when it stands too small to show */
  function plate(cell, vis, on) {
    const q = cfg.cells[cell], f = on ? grow(vis, q.pa, q.pb) : 0;
    if (f < c.visat) return null;
    return { s: f, plate: [q.x, q.y - (1 - f) * c.platefall, q.z], rim: [q.x, q.y - (1 - f) * c.platefall + c.rimlift, q.z] };
  }

  /* the page's state to the stage's: set({ b, s, p }) as kit-stage.js reads it. ids: the objects the stage can build; order: the board's ids in board order. */
  function state(st, prev, ids, order) {
    const b = st && st.b != null && st.b !== '' ? String(st.b) : '05';
    let s = st && st.s != null ? String(st.s) : prev.sel;
    if (ids.indexOf(s) < 0) s = '';
    let pg = st && st.p != null && st.p !== '' && isFinite(+st.p) ? Math.max(0, Math.floor(+st.p)) : prev.page;
    if (s) pg = Math.floor(Math.max(0, order.indexOf(s)) / c.per);
    return { board: b, sel: s, page: pg };
  }
  /* what each channel wants in a state */
  const wants = (st, id, pageOf) => ({ board: st.board === '05' ? 1 : 0, page: pageOf === st.page ? 1 : 0, lift: id === st.sel ? 1 : 0, turn: id === st.sel ? 0 : c.restyaw });
  /* the cells of the page on screen that hold an object */
  const cellsOnPage = (total, page) => Math.max(0, Math.min(c.per, total - page * c.per));

  /* the camera: null where the world rests at the calm pose (every board but 05); else the view's numbers (fit(w, h, aspect, fill) is the host's) */
  function camera(st, cellOf) {
    if (st.board !== '05') return null;
    const g = cfg.views.grid, s = cfg.views.sel;
    if (st.sel) { const q = cfg.cells[cellOf(st.sel)]; return { aim: [q.x + s.x, q.y + s.y, q.z + s.z], fitW: s.fitW, fitH: s.fitH, fill: s.fill, elev: s.elev, yaw: s.yaw, tilt: s.tilt, back: s.back }; }
    return { aim: [g.x, g.y, g.z], fitW: g.fitW, fitH: g.fitH, fill: g.fill, elev: g.elev, yaw: g.yaw, tilt: g.tilt, back: g.back };
  }
  /* where an object's name hangs */
  const label = (cell) => { const q = cfg.cells[cell], l = cfg.label; return [q.x + l.dx, q.y + l.dy, q.z + l.dz]; };

  /* the stage draws nothing at all while the view's weight is at or under this */
  const shown = (vis) => vis > c.minvis;
  return { grow, follow, item, plate, shown, state, wants, cellsOnPage, camera, label, along, c };
}
