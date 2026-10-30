/* World grammar, the stage: what moves and what can be touched (docs/design/world-grammar/STAGE.md).

   A view's settled picture is a frame blob and stays one. Everything that moves is data the encoder wrote as records:
     channels   a named number (build, lift, focus, rise, beam, and auth's lift, tip, glow, orbit, beam, gather, broken, build, bad, and the
                chain views' m j kk g s l p n e pos) that moves from where it is to its settled value (WSET) along timing keys (WCHAN) over a real
                duration (WSPAN) or, for a flight, over the flight. The keys are played by the ONE sampler (fxn-3d anim-sample.mjs sample()),
                never by a curve written here.
     items      an id over a run of a part's instances (WITEM): a ring is its tiles, links, slot, echo and shade; a cube is one.
                The id is the pick id, the state slot and the build-clock window in one.
     state      three floats per instance, the renderer's per-part `state` stream: dim 0..1, lift in world units, morph 0..1
                toward the part's folded pose (`morph` stream, derived from WFOLD). This file writes both; the renderer draws them.
     picking    the renderer's id pass (R.pick): the parts that carry the pick flag are drawn once into a one-pixel target, the pixel the pointer is
                on, and the instance read back names its item.
     chain group  the chain, record, links and open views and the ring view: their rows are frames of a blob of their own that world2-dyn.mjs
                blends (it is mounted when the camera first flies to one of them).
   The stage draws nothing and schedules nothing: step(now) answers whether anything still moves, and the host asks for another frame
   only then (workspace law: animations settle). No JSON; the words of the items are a tab separated text blob. */
import { sample, easeOf } from '/fxn-3d/scripts/lib/anim-sample.mjs';
import { projection, view as viewMatrix, eyeOf } from '/fxn-3d/js/render/world2-math.mjs';
import { createDyn } from './world2-dyn.mjs';
import { createRig } from './world2-rig.mjs';
import { createIdRig } from './world2-idrig.mjs';

/* the kernel's in-out ease (ring-kit.js ease.inOut): the clock law of a flight. The camera's keys are linear and are read at
   frame 1000 x inOut(u), which is exactly the path the Three.js world flew; it is the sampler's curve 5, written out for the camera's clock only. */
export const inOut = (x) => easeOf(5, x);
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const MAX_DIM = .92;
/* the views whose rows are the chain group's: your chain's four and the ring view (its page slab) */
const CHAIN = new Set(['chain', 'record', 'links', 'open', 'ring']);
/* the identity steps carry the page slab the chain group draws (their rows are world2-idrig.mjs's), so they fly like the chain group's views */
const ID_STEPS = new Set(['idstart', 'idsign', 'idsafe', 'idyou', 'idvalue']);
const IDV = new Set(ID_STEPS);
/* the how-it-works views (batch 3) are drawn the same way, from a group of their own each (world2-idrig.mjs with its `group`), and carry the page slab too */
const HOWV = new Set(['movie', 'resolve', 'layers', 'life', 'trace', 'resolvers', 'fxn', 'stats', 'download',
  /* the design board's own views (scripts/lib/world-board-specs.mjs): the same kind of group as the how-it-works views */
  'minute', 'status', 'nodes', 'products', 'identity', 'measured']);
for (const v of HOWV) IDV.add(v);
/* the download window has no page slab, and the network round it is the home frame's: it is not of the chain group's family */
const FAMILY = new Set([...CHAIN, ...[...IDV].filter((v) => v !== 'download')]);
const CHANNELS = ['m', 'j', 'kk', 'g', 's', 'l', 'p', 'n'];

export function createStage(o) {
  const { world, R, parts, blob, names, fov, reduced, wake } = o;
  const S = world.stage, f32 = new Float32Array(blob), byName = {};
  parts.forEach((p) => { byName[p.part] = p; });

  /* ---------- items: which instances belong to which id ---------- */
  const owner = {};                    // part name -> the view that owns its items
  const itemOf = {};                   // part name -> Int32Array(count) of item ids, -1 for none
  const ranges = {};                   // view -> Map(item id -> [{ part, first, count, at, stagger, dur }])
  const parentOf = new Map();          // item id -> parent item id (a chain inside a network)
  for (const view of Object.keys(S.items)) {
    if (view === 'dyn') continue;      // the chain group's items belong to its own parts (world2-dyn.mjs)
    const map = ranges[view] = new Map();
    for (const it of S.items[view]) {
      const p = byName[it.part];
      if (!p) throw new Error('stage: item ' + it.id + ' of view ' + view + ' names part ' + it.part + ', which the frame does not have, so the item cannot be placed');
      if (owner[it.part] && owner[it.part] !== view) throw new Error('stage: part ' + it.part + ' has items from two views (' + owner[it.part] + ' and ' + view + '); one view owns a part\'s ids');
      owner[it.part] = view;
      const ids = itemOf[it.part] || (itemOf[it.part] = new Int32Array(p.count).fill(-1));
      for (let k = 0; k < it.count; k++) ids[it.first + k] = it.id;
      (map.get(it.id) || (map.set(it.id, []), map.get(it.id))).push(it);
      if (it.parent != null) parentOf.set(it.id, it.parent);
    }
  }
  /* a ring's size (its tile's scale) is the unit of its lift: ringUp() lifts t x .32 on hover and t x .5 on focus */
  const sizeOf = new Map();
  const home = ranges.home || new Map();
  for (const [id, rs] of home) {
    const tile = rs.find((r) => r.part === 'tile');
    if (tile) { const i = (byName.tile.offset / 4) + tile.first * 16; sizeOf.set(id, Math.hypot(f32[i + 3], f32[i + 4], f32[i + 5])); }
  }

  /* ---------- the state and morph streams, one per part that has items ---------- */
  const st = {}, dirty = new Set(), buffers = typeof R.buffer === 'function' && typeof R.updateBuffer === 'function';
  const foldedParts = new Set();
  for (const view of Object.keys(S.fold)) for (const name of Object.keys(S.fold[view])) foldedParts.add(name);
  for (const name of Object.keys(itemOf)) {
    const p = byName[name];
    st[name] = new Float32Array(p.count * 3);
    if (!buffers) continue;
    p.state = R.buffer(st[name]);
    if (foldedParts.has(name)) p.morph = R.buffer(folded(p, foldOf(name)));
  }
  function foldOf(name) { for (const view of Object.keys(S.fold)) if (name in S.fold[view]) return S.fold[view][name]; return 0; }
  /* the unbuilt pose: the settled matrix shrunk to a point and dropped by V of its own height (WFOLD) */
  function folded(p, drop) {
    const out = new Float32Array(p.count * 16), base = p.offset / 4;
    for (let k = 0; k < p.count; k++) {
      /* a glyph bar is engraved on a tile and drops with it: by the tile's own size, not the bar's */
      const own = p.part === 'glyph' && itemOf.glyph ? sizeOf.get(itemOf.glyph[k]) : 0, a = base + k * 16, b = k * 16, s = own || Math.hypot(f32[a + 3], f32[a + 4], f32[a + 5]);
      for (let c = 0; c < 9; c++) out[b + c] = f32[a + c] * 1e-4;
      out[b + 9] = f32[a + 9]; out[b + 10] = f32[a + 10] + drop * s; out[b + 11] = f32[a + 11];
      for (let c = 12; c < 16; c++) out[b + c] = f32[a + c];
    }
    return out;
  }

  /* ---------- channels ---------- */
  const live = {};                     // view -> { channel: number } and, for per-item channels, { channel: Float32Array(ids) }
  const stateIndex = {};               // view -> the index of the state the view is in
  const maxItem = Math.max(0, ...Object.values(ranges).flatMap((m) => [...m.keys()])) + 1;
  const PER_ITEM = new Set(['lift', 'focus', 'rise']);
  /* a view's channels exist once the records that name them are read; the chain group's arrive with its file, so this runs again then */
  function initLive() {
    for (const view of new Set([...Object.keys(S.set), ...Object.keys(S.chan)])) {
      if (live[view]) continue;
      const l = live[view] = {};
      const first = (S.set[view] && S.set[view][0]) || {};
      for (const ch of Object.keys(S.chan[view] || {})) {
        const name = ch.replace(/\.(in|out)$/, '');
        if (name in l) continue;
        l[name] = PER_ITEM.has(name) && (view === 'home' || view === 'ring') ? new Float32Array(maxItem) : (name in first && S.states[view] ? first[name] : 0);
      }
      stateIndex[view] = 0;
    }
    if (live.home && live.home.build == null) live.home.build = 1;
  }
  initLive();
  if (live.auth) live.auth.present = 0;   /* the auth stage is not there until the camera comes to it (its own fade, `present`, is the view's, not a state's) */
  if (live.home) live.home.build = 1;      // settled until a first visit begins the build-up
  let cubeFocus = 0, cubeWant = 0;
  let lastHw = 1, markY = 0;   /* the hub mark's height (read from its row below) */
  const plays = new Map();             // key -> { anim, t0, dur, view, name, item }
  const sampled = (anim) => (f) => sample(anim, f).pieces.x.pos[0];

  /* a channel's value over time: its WCHAN progress keys scaled from `from` to `to`, as a sampler track */
  function trackOf(keys, from, to) {
    keys = keys || [{ frame: 0, p: 0, curve: 0 }, { frame: 1000, p: 1, curve: 0 }];
    return { scene: { rate: 1000 }, tracks: { x: { alive: true, pos: keys.map((k) => ({ frame: k.frame, value: [from + (to - from) * k.p, 0, 0], ease: k.curve, hold: 0 })), rot: [], scl: [] } }, camera: [], lens: [] };
  }
  function valueOf(view, name, item) { const v = live[view] && live[view][name]; return v == null ? 0 : typeof v === 'number' ? v : v[item]; }
  function setValue(view, name, item, x) { if (item == null) live[view][name] = x; else live[view][name][item] = x; }
  /* move a channel to `to`: from where it stands now, over its real duration, along its own keys. opt: { dur, keys } name a duration and keys the
     channel's own records do not (a flight's length; the keys of a channel that shares another's) */
  function move(view, name, item, to, now, opt) {
    const key = view + '/' + name + '/' + item, from = valueOf(view, name, item);
    if (item == null && live[view]) live[view]['up_' + name] = to > from ? 1 : 0;   /* the way a channel moves: a row that flies at its own moment runs the clock back when it falls */
    const dur = opt && opt.dur != null ? opt.dur : (S.span[view] && S.span[view][name]) || 0, delay = (opt && opt.delay) || 0, keys = opt && opt.keys ? opt.keys : S.chan[view] && S.chan[view][name];
    if (Math.abs(from - to) < 1e-6 && !plays.has(key)) return;
    if (!dur || reduced()) { plays.delete(key); setValue(view, name, item, to); dirtyAll = true; wake(60); return; }
    plays.set(key, { anim: trackOf(keys, from, to), t0: now + delay, dur, view, name, item });
    wake(delay + dur + 80);
  }
  let dirtyAll = true;

  /* ---------- a view's states (auth's eleven) ---------- */
  const stateNames = (view) => (S.states[view] || []);
  const stateByName = (view, name) => stateNames(view).find((s) => s.name === name);
  function setState(view, name, now) {
    const s = stateByName(view, name), set = S.set[view];
    if (!s || !set) return false;
    stateIndex[view] = s.index;
    if (idrigs.length) idrig_.stateIs(view, name);
    const row = set[s.index];
    holdBuild(view, row, now);
    for (const ch of Object.keys(row)) {
      if (VIEW_DRIVEN.has(ch)) continue;
      /* a channel that takes longer for a longer way (the sign-in step: WSET tstep ms for each step past the first) */
      const step = row[ch + 'step'], fall = row[ch + 'fall'], delay = row[ch + 'delay'];
      let opt = step ? { dur: ((S.span[view] && S.span[view][ch]) || 0) + step * Math.max(0, Math.abs(row[ch] - valueOf(view, ch)) - 1) } : undefined;
      /* a channel that snaps back when it falls (the movie's line when its beat is left: WSET <channel>fall 0) and one that waits before it rises (the line waits 500 ms for the camera: <channel>delay) */
      if (fall != null && row[ch] < valueOf(view, ch)) opt = Object.assign({}, opt, { dur: fall });
      else if (delay) opt = Object.assign({}, opt, { delay });
      if (!live[view] || !(ch in live[view]) || ch === 'p') continue;   // a number of the state that is no channel (the camera's aim, the lead) is read, not played
      move(view, ch, null, row[ch], now, opt);
    }
    return true;
  }
  /* a view the camera has left rests: its channels go back to state 0 (auth's beam is on again for the network) */
  function rest(view, now) {
    const set = S.set[view]; if (!set) return;
    stateIndex[view] = 0;
    for (const ch of Object.keys(set[0])) if (!VIEW_DRIVEN.has(ch) && live[view] && ch in live[view]) move(view, ch, null, set[0][ch], now);
  }
  /* a channel the view's presence drives: it moves when the camera comes to the view or leaves it, never with a state */
  const VIEW_DRIVEN = new Set(['present']);
  function present(view, on, now, dur) { if (live[view] && 'present' in live[view]) move(view, 'present', null, on ? 1 : 0, now, dur != null ? { dur } : undefined); }
  /* the camera comes to `base`: its stage comes in over the flight and every other stage that has a presence goes out */
  function presentOnly(base, now, dur) { if (holding && holding !== base) releaseBuild(now); for (const v of Object.keys(live)) if ('present' in live[v]) present(v, v === base, now, IDV.has(v) ? dur : undefined); }
  /* an identity step's entry: its entry channels start over (WSET <channel>from) and run to their rest after the step's lead, as identity-stages.js set() does when the stage's weight is nothing */
  const onced = new Set();
  function enterId(view, now) {
    const set = S.set[view], l = live[view]; if (!set || !l) return;
    const row = set[stateIndex[view] || 0];
    for (const ch of Object.keys(l)) {
      if (VIEW_DRIVEN.has(ch) || !((ch + 'from') in row)) continue;
      /* a channel that plays once for the page's life (measured's columns build on the first visit, and on a return they stand: stages.js `built`): WSET <channel>once */
      if (row[ch + 'once'] && onced.has(view + '/' + ch)) continue;
      if (row[ch + 'once']) onced.add(view + '/' + ch);
      plays.delete(view + '/' + ch + '/null'); l[ch] = row[ch + 'from'];
      move(view, ch, null, row[ch], now, { delay: row.lead || 0 });
    }
    dirtyAll = true; wake(60);
  }
  let authNet = '';
  function setNet(name) { if (name !== authNet) { authNet = name; dirtyAll = true; rigDirty = true; wake(60); } }

  /* a view that holds the build clock at a point of the network's build-up (download.js: k.clockTo(ms, dur) for each step): WSET buildms and builddur; the clock goes back to built when another view comes */
  let holding = null;
  function holdBuild(view, row, now) {
    const END = (S.span.home && S.span.home.build) || 0;
    if (!live.home || !END || row.buildms == null) return;
    holding = view; live.home.build = Math.min(1, live.home.build);
    move('home', 'build', null, Math.min(1, row.buildms / END), now, { dur: row.builddur || 0, keys: [{ frame: 0, p: 0, curve: 5 }, { frame: 1000, p: 1, curve: 5 }] });
    dirtyAll = true; wake(60);
  }
  function releaseBuild(now) { if (holding && live.home) { holding = null; move('home', 'build', null, 1, now, { dur: 1700, keys: [{ frame: 0, p: 0, curve: 5 }, { frame: 1000, p: 1, curve: 5 }] }); } }

  /* ---------- the build-up: the first visit's clock (WSET home build, WSPAN home build) ---------- */
  let building = false;
  function startBuild(now) {
    if (!live.home || reduced()) return false;
    building = true; live.home.build = 0; dirtyAll = true;
    move('home', 'build', null, 1, now);
    return true;
  }

  /* ---------- hover and focus: a ring's lift and dim ---------- */
  const hoverable = new Set();         // item ids that have a NAMES line: only these lift under the pointer (home's chains inside a network do not)
  for (const key of names.items.keys()) hoverable.add(Number(key.split(':')[0]));
  let hovered = -1, hoveredDyn = -1;
  function hover(item, now, isDyn) {
    if (isDyn) {
      if (item === hoveredDyn) return;
      if (hovered >= 0) { move('home', 'lift', hovered, 0, now); hovered = -1; }
      const keys = S.chan.home && S.chan.home.lift, dur = S.span.home && S.span.home.lift;
      if (dyn) {
        if (hoveredDyn >= 0) move('dyn', 'hover', hoveredDyn, 0, now, { keys, dur });
        hoveredDyn = item;
        if (item >= 0) move('dyn', 'hover', item, 1, now, { keys, dur });
      }
      return;
    }
    if (hoveredDyn >= 0 && dyn) { move('dyn', 'hover', hoveredDyn, 0, now, { keys: S.chan.home && S.chan.home.lift, dur: S.span.home && S.span.home.lift }); hoveredDyn = -1; }
    if (item === hovered) return;
    if (hovered >= 0) move('home', 'lift', hovered, 0, now);
    hovered = item;
    if (item >= 0 && hoverable.has(item)) move('home', 'lift', item, 1, now);
  }
  /* focus (chains-scene.js ringApi.focusOn): light some rings, and the computers, and step the rest back. `which` is a function of
     the ring's item id, or null for no focus. */
  function focus(which, cubes, now) {
    for (const [id, rs] of home) if (rs.some((r) => r.part === 'tile')) move('home', 'focus', id, which && which(id) ? 1 : 0, now);
    cubeWant = cubes ? 1 : 0; dirtyAll = true; wake(700);
  }

  /* ---------- the camera: a flight through the sampler ---------- */
  let flight = null;
  function fly(a, b, ms, now) {
    const lens = 50, pose = (c) => ({ aim: c.aim.slice(), dist: c.dist, elev: c.elev, yaw: c.yaw, lens });
    flight = { t0: now, dur: ms, anim: { scene: { rate: 1000 }, camera: [{ frame: 0, value: pose(a), ease: 0, hold: 0 }, { frame: 1000, value: pose(b), ease: 0, hold: 0 }], lens: [],
      tracks: { tilt: { alive: true, pos: [{ frame: 0, value: [a.tilt, 0, 0], ease: 0, hold: 0 }, { frame: 1000, value: [b.tilt, 0, 0], ease: 0, hold: 0 }], rot: [], scl: [] } } } };
    wake(ms + 80);
  }
  function cameraAt(now) {
    if (!flight) return null;
    const u = clamp01((now - flight.t0) / flight.dur), s = sample(flight.anim, 1000 * inOut(u)), c = s.camera;
    if (u >= 1) flight = null;
    return { aim: c.aim, dist: c.dist, elev: c.elev, yaw: c.yaw, tilt: s.pieces.tilt.pos[0], done: u >= 1 };
  }

  /* ---------- the chain group: your chain's views, the ring view ---------- */
  let dyn = null, engaged = false, view = 'home', ringState = 0, flightEnd = 0;
  const flightValue = (name) => valueOf('flight', name);
  /* the settled value of a channel in a view (a state of it, for the ring view); a view the group does not name holds every channel at 0 */
  const setOf = (v, c, state) => { const s = S.set[v]; const row = s && (s[state == null ? 0 : state] || s[0]); return row && row[c] != null ? row[c] : 0; };
  function mountDyn(dynBlob, lines, pieces) {
    initLive();
    dyn = createDyn({ world, R, blob: dynBlob, lines, palette: o.palette, wake, rays: ray, pieces });
    live.dyn = { hover: dyn.st.hover };
    if (live.flight) live.flight.run = 1;
    for (const p of dyn.drawn) parts.push(p);   // the host's draw list holds the same objects
    return dyn;
  }
  /* the camera arrives at a view: the views whose rows are in the group blend toward it; channels move through the flight's windows. o: { dur, sel, aspect, ring, first } */
  function enter(to, was, now, opt) {
    setView(to);
    if (!dyn) { view = to; return; }
    const fam = FAMILY.has(to), wasFam = FAMILY.has(was || 'home');
    const dur = opt.dur || 0, state = to === 'ring' ? opt.ring || 0 : 0;
    if (fam || wasFam || engaged) {
      const moving = engaged && (plays.size > 0 || !!flightEnd && now < flightEnd);
      const values = {}; for (const c of CHANNELS) values[c] = flightValue(c); values.e = flightValue('e');
      dyn.begin(was || 'home', to, opt.sel || 0, opt.aspect || 1, values, moving);
      live.flight.e = 0;
      for (const c of CHANNELS) {
        const target = setOf(to, c, state), now_ = flightValue(c);
        const dir = target > now_ ? '.in' : '.out';
        const keys = (S.chan[to] && S.chan[to][c + dir]) || (S.chan.flight && S.chan.flight[c + dir]);
        move('flight', c, null, target, now, { dur, keys });
      }
      move('flight', 'e', null, 1, now, { dur, keys: S.chan.flight.e });
      /* the pulses of the entering flight (chains-scene.js: run is 0 at the start of a flight that comes in from outside your chain, and one at its end; at rest it is one) */
      const entering = fam && !wasFam && !opt.first && dur > 0 && !reduced();
      live.flight.run = entering ? 0 : 1;
      if (entering) move('flight', 'run', null, 1, now, { dur, keys: S.chan.flight['run.in'] }); else plays.delete('flight/run/null');
      engaged = true; flightEnd = now + dur;
      /* the ring's position: a record the camera comes to from outside the chain is in front at once, in the chain it turns */
      if (opt.first || !wasFam) { live.flight.pos = opt.sel || 0; plays.delete('flight/pos/null'); } else turnTo(opt.sel || 0, now);
      dyn.st.sel = opt.sel || 0;
      if (to === 'ring') dyn.ringAnchor(ringAnchorOf(state)); else if (IDV.has(to)) dyn.ringAnchor(idAnchorOf(to)); else dyn.ringAnchor(null);
      dirtyAll = true; dynDirty = true; wake(dur + 120);
    }
    /* the ring view lifts the chosen ring out of the network (rise) and lowers the one it leaves */
    if (live.ring) {
      const sel = to === 'ring' ? opt.ring || 0 : -1;
      for (const id of sizeOf.keys()) move('ring', 'rise', id, id === sel ? 1 : 0, now);
    }
    view = to;
  }
  function idAnchorOf(v) {
    const a = S.spots[v] && S.spots[v].anchor;
    if (a) return { x: a[0], y: a[1], z: a[2], yaw: 0, s: setOf(v, 'size') };
    /* a how-it-works view's page opens from a point of its own state (WSET ax ay az size) */
    const i = stateIndex[v] || 0, row = S.set[v] && S.set[v][i];
    return row && row.ax != null ? { x: row.ax, y: row.ay, z: row.az, yaw: 0, s: row.size } : null;
  }
  function ringAnchorOf(i) {
    const a = S.spots.ring && S.spots.ring[String(i)];
    return a ? { x: a[0], y: a[1], z: a[2], yaw: 0, s: setOf('ring', 'size', i) } : null;
  }
  /* the ring turns to a record: on 420 ms and 110 for each record it passes, easing out */
  function turnTo(sel, now) {
    if (!dyn) return;
    const n = dyn.nR, p0 = flightValue('pos'), d = ((sel - p0) % n + n * 1.5) % n - n / 2;
    if (Math.abs(d) < .001 || reduced()) { live.flight.pos = sel; plays.delete('flight/pos/null'); dirtyAll = true; dynDirty = true; wake(60); return; }
    dyn.st.sel = sel;
    const dur = ((S.span.flight && S.span.flight.pos) || 420) + ((S.set.flight && S.set.flight[0] && S.set.flight[0].posstep) || 110) * Math.abs(d);
    move('flight', 'pos', null, p0 + d, now, { dur, keys: S.chan.flight.pos });
    dynDirty = true; engaged = true; flightEnd = Math.max(flightEnd, now + dur);
  }
  let dynDirty = false, rig = null, rigOn = false, rigDirty = false;
  /* the rows of the identity steps and of each how-it-works view (world2-idrig.mjs): one rig for a group, mounted when the camera first flies to one of its views. The stage keeps them as one list
     that answers for every view */
  const idrigs = [];
  const idrig_ = {
    rigs: idrigs,   /* the mounted rigs, for the page hooks script to read what is drawn */
    get order() { return idrigs.flatMap((r) => r.order); },
    get P() { return Object.assign({}, ...idrigs.map((r) => r.P)); },
    rigOf: (v) => idrigs.find((r) => r.views().includes(v)) || null,
    spotsOf: (v, value, state) => { const r = idrig_.rigOf(v); return r ? r.spotsOf(v, value, state) : []; },
    focusOf: (v) => { const r = idrig_.rigOf(v); return r ? r.focusOf(v) : null; },
    beatOf: (v, state) => { const r = idrig_.rigOf(v); return r ? r.beatOf(v, state) : null; },
    keyOf: (v) => { const r = idrig_.rigOf(v); return r ? r.keyOf(v) : 's'; },
    stateOfKey: (v, value) => { const r = idrig_.rigOf(v); return r ? r.stateOfKey(v, value) : null; },
    pickOf: (v, state, j, part) => { const r = idrig_.rigOf(v); return r ? r.pickOf(v, state, j, part) : null; },
    pickParts: (v) => { const r = idrig_.rigOf(v); return r ? r.pickParts(v) : []; },
    stateIs: (v, name) => { const r = idrig_.rigOf(v); if (r) r.stateIs(v, name); },
    step: (liveOf, now) => { let any = false; for (const r of idrigs) if (r.step(liveOf, now, reduced())) any = true; return any; },
    light: () => { for (const r of idrigs) { const l = r.light(); if (l) return l; } return null; },
    hoverRow: (part, i) => { let ch = false; for (const r of idrigs) if (r.hoverRow(part, i)) ch = true; if (ch) rigDirty = true; return ch; },
    hoverMoving: () => idrigs.some((r) => r.hoverMoving()),
    flush: () => { for (const r of idrigs) r.flush(); },
    repaint: () => { for (const r of idrigs) r.repaint(); },
    activeOf: (v) => idrigs.some((r) => r.activeOf(v))
  };
  function mountId(idBlob, lines, pieces, meshes, group) {
    initLive();
    const r = createIdRig({ world, R, blob: idBlob, lines, palette: o.palette, wake, pieces, meshes, list: parts, group });
    idrigs.push(r);
    /* a group mounted ahead of its flight (the host warms them when idle) must not draw: its views' weights start at nothing until the camera comes (presentOnly) */
    for (const v of r.views()) if (live[v] && 'present' in live[v] && v !== view) { plays.delete(v + '/present/null'); live[v].present = 0; }
    rigDirty = true; dirtyAll = true;
    return r;
  }
  /* the auth stage's rows (world2-rig.mjs): mounted when the camera first flies to /auth */
  function mountRig(rigBlob, lines, pieces, meshes, cardFrame) {
    initLive();
    rig = createRig({ world, R, blob: rigBlob, lines, palette: o.palette, wake, pieces, meshes, cardFrame, reduced });
    for (const p of rig.drawn) parts.push(p);
    rigDirty = true; dirtyAll = true;
    return rig;
  }

  /* an entry sweep (the FXN view's tiles rising one after another once the stage weight passes WSET swat): the view's clock channel `sw` runs 0 to 1 over its span from that moment, and goes back to 0 when the view is left */
  const swept = {};
  function sweeps(now) {
    for (const v of IDV) {
      const l = live[v], set = S.set[v] && S.set[v][0]; if (!l || !set || set.swat == null || !('sw' in l)) continue;
      if (l.present >= set.swat && !swept[v]) { swept[v] = true; l.sw = 0; if (reduced()) { l.sw = 1; dirtyAll = true; } else move(v, 'sw', null, 1, now); }
      else if (l.present < .05 && (swept[v] || l.sw !== 0)) { swept[v] = false; plays.delete(v + '/sw/null'); l.sw = 0; dirtyAll = true; }
    }
  }
  /* ---------- one step: play every channel, write the state ---------- */
  function step(now) {
    let moving = false;
    sweeps(now);
    for (const [key, pl] of plays) {
      const f = Math.min(1000, Math.max(0, (now - pl.t0) / pl.dur * 1000));
      setValue(pl.view, pl.name, pl.item, sampled(pl.anim)(f));
      dirtyAll = true;
      if (f >= 1000) {
        plays.delete(key);
        if (key === 'flight/pos/null') { const n = dyn ? dyn.nR : 5; live.flight.pos = ((live.flight.pos % n) + n) % n; }
      } else moving = true;
    }
    if (flight) moving = true;
    if (cubeFocus !== cubeWant) { cubeFocus += (cubeWant - cubeFocus) * (reduced() ? 1 : .2); if (Math.abs(cubeWant - cubeFocus) < .002) cubeFocus = cubeWant; else moving = true; dirtyAll = true; }
    const touched = dirtyAll || rigDirty;   /* a channel moved or settled this step */
    if (dirtyAll) { write(); dirtyAll = false; }
    if (rig && (touched || moving)) { rigOn = rig.step(live.auth, stateIndex.auth || 0, authNet, now); rig.flush(rigOn); rigDirty = false; }
    if (rig && rigOn && rig.running()) { moving = true; }   /* the file is opening: the cubes turn and the beads pulse for as long as it takes (auth-stage.js pose) */
    if (idrigs.length && (touched || moving)) { idrig_.step((v) => live[v], now); idrig_.flush(); if (!rig) rigDirty = false; }
    if (idrigs.length && idrig_.hoverMoving()) moving = true;   /* a block still follows the pointer */
    if (dyn && engaged && (dynDirty || moving)) {
      dyn.step(flightValue, flightValue('pos')); dyn.flush();
      dynDirty = false;
      /* a flight that ended on a view with no rows of its own hands the ring back to the home frame's tiles */
      if (!plays.size && !FAMILY.has(view)) { engaged = false; dyn.flush(true); dirtyAll = true; write(); }
    }
    return moving;
  }

  /* how much of home is here: 1 - (p + m + n) of the flight, or 1 - back of the view's record when there is no chain flight */
  function homeWeight() { const fl = live.flight; return fl && engaged ? clamp01(1 - ((fl.p || 0) + (fl.m || 0) + (fl.n || 0))) : clamp01(1 - ((world.views[shownView] && world.views[shownView].back) || 0)); }
  const HUBP = new Set(['hubdisc', 'hubrim', 'hubface']);
  /* the hub's own ring and round mark stand only on the hub's page, #/ring?i=defxn, where the ring page raises it (chains-scene.js: hw = view === 'ring' && ringRise[HUB] > .01); elsewhere
     they have sunk into the ground logo and shrunk. Its weight follows the ring's own rise, which the ring view plays. */
  const hubRing = world.rings.filter((r) => r.kind === 'hub')[0], HUBI = hubRing ? hubRing.i : -1;
  const hubWeight = () => (live.ring && HUBI >= 0 ? clamp01(live.ring.rise[HUBI] * 4) : 0);
  /* state = (dim, lift, morph) per instance of each part that has items; only parts that changed go to the GPU */
  function write() {
    const h = live.home, END = (S.span.home && S.span.home.build) || 0;
    if (h) {
      const clock = h.build * END, T = (id) => (sizeOf.get(id) || 0);
      const gLift = (S.set.home && S.set.home[0].lift) || 0, gFocus = (S.set.home && S.set.home[0].focus) || 0, gDim = (S.set.home && S.set.home[0].dim) || 0;
      const fl = live.flight, ringRise = live.ring ? live.ring.rise : null, dl = live.download && live.download.present > 1e-3 ? live.download : null;
      /* the rise of each ring: the ring view's (one ring, in rise units) and the download window's (a channel for each ring, rr<id>, times the view's weight; riseh<id> its own height in rh<id>) */
      const dlRise = (id) => (dl ? (dl['rr' + id] || 0) * dl.present : 0), dlH = (id) => (dl ? setOf('download', 'rh' + id, stateIndex.download || 0) : 0);
      const mine = S.set.dyn && S.set.dyn[0] ? S.set.dyn[0].mine : -1;
      /* the network steps back by n (chains-scene.js: dim = n x .62, and a focus steps everything else back further), and a ring that has risen stays lit */
      const nBack = fl && engaged ? fl.n : ((world.views[shownView] && world.views[shownView].back) || 0);   /* a view with no chain flight (calm) steps the network back by its own record's back */
      const dim0 = nBack ? Math.min(1, nBack * .62) : 0;
      let fAny = cubeFocus;
      for (let i = 0; i < h.focus.length; i++) fAny = Math.max(fAny, h.focus[i]);
      const dimF = dim0 + fAny * gDim * (1 - dim0), up = new Float32Array(maxItem);
      const rising = (id) => (ringRise ? ringRise[id] : 0) + dlRise(id);
      for (const id of sizeOf.keys()) up[id] = T(id) * (gLift * h.lift[id] + gFocus * h.focus[id]) + (ringRise ? ringRise[id] * (setOf('ring', 'riseh', id)) : 0) + dlRise(id) * dlH(id);
      let mineDim = 0;
      for (const [id, rs] of home) {
        const cube = rs.every((r) => r.part === 'cube');
        const keep = Math.max(rising(id) * 1.5, h.focus[id], parentOf.has(id) ? rising(parentOf.get(id)) * 1.5 : 0);
        const dim = cube ? Math.min(.95, dimF * 1.2) * (1 - cubeFocus) : Math.min(MAX_DIM, dimF) * (1 - Math.min(1, keep));
        const lift = up[id] + (parentOf.has(id) ? up[parentOf.get(id)] : 0) - (id === HUBI ? (1 - hubWeight()) * (sizeOf.get(id) || 0) * 1.6 : 0);   /* the hub's ring sinks by 1.6 of its tile into the logo (chains-scene.js hs) */
        if (id === mine) mineDim = dim;
        for (const r of rs) {
          const a = st[r.part]; if (!a) continue;
          if (r.part === 'ground') { const i = r.first * 3; a[i] = a[i + 1] = a[i + 2] = 0; dirty.add(r.part); continue; }   /* the kernel's plate is not dimmed, lifted or built with a ring */
          if (HUBP.has(r.part)) {   /* the hub's mark (chains-scene.js mark): it sinks into the logo and shrinks as home comes (home-descent.js: y x (1 - hwE), scale x (1 - hwE)) and the FXN view lifts it (stages.js) */
            if (!markY && byName.hubdisc) markY = f32[byName.hubdisc.offset / 4 + 10];   /* the mark's height: its disc's row */
            const hwE = 1 - hubWeight(), fx = live.fxn ? easeOf(5, clamp01(live.fxn.present || 0)) : 0, i = r.first * 3;
            a[i] = 0; a[i + 1] = fx * ((S.set.home && S.set.home[0] && S.set.home[0].marklift) || 0) - hwE * markY; a[i + 2] = hwE; dirty.add(r.part); continue;
          }
          for (let k = 0; k < r.count; k++) {
            const i = (r.first + k) * 3;
            const start = r.at + (r.count > 1 ? k / r.count * r.stagger : 0);
            a[i] = r.part === 'shade' || r.part === 'pearl' ? 0 : dim;   /* the pearls are not stepped back with the network */
            a[i + 1] = r.part === 'tile' || r.part === 'link' || r.part === 'slot' || r.part === 'glyph' ? lift : 0;
            a[i + 2] = r.dur > 0 && h.build < 1 ? 1 - easeOf(2, clamp01((clock - start) / r.dur)) : 0;
            if (id === HUBI && r.part !== 'slot') a[i + 2] = 1 - hubWeight();   /* and shrinks to nothing as it sinks */
            /* your ring is drawn by the chain group's rows while they are engaged: its tiles and links fold away, its slot shrinks with m */
            if (id === mine && engaged) {
              if (r.part === 'tile' || r.part === 'link' || r.part === 'glyph') a[i + 2] = 1;
              else if (r.part === 'slot') a[i + 2] = fl ? fl.m : 0;
            }
          }
          dirty.add(r.part);
        }
      }
      if (dyn && dyn.setDim(mineDim)) dynDirty = true;   /* your ring is the chain group's rows while it is engaged: they take the step back the network's tiles take */
      if (h.build >= 1) building = false;
    }
    /* the kernel's beam (home-descent.js after(): bh = max(grow(span(ms, T.beam, T.beam + 650)) * ease(homeW), xb)). It stands on home, where homeW is 1, and on any other view
       only while that view asks for it (auth's beam channel, W.lightBeam, which auth-stage.js turns off when the view is left: its weight `present`). homeW is
       1 - (p + m + n) of the flight; T.beam is WSET home tagsat less its 900 ms. Folding the beam by 1 - height shrinks it to a point exactly as Three.js scaled it to 1e-4. */
    const a = live.auth, fl2 = live.flight, hw = homeWeight();   /* a view with no chain flight (calm, intro, home) steps the network back by its own WVIEW back */
    const built = h && h.build < 1 ? easeOf(2, clamp01(((h.build * ((S.span.home && S.span.home.build) || 0)) - (tagsAt() - 900)) / 650)) : 1;
    const asked = a ? a.beam * (a.present == null ? 1 : a.present) : 0;
    lastHw = hw;   /* the home weight, read by the helix (world2-helix.mjs): the blocks wind down and build up with it */
    const beamUp = Math.max(built * easeOf(5, hw), asked);
    if (ranges.auth) for (const [, rs] of ranges.auth) for (const r of rs) {
      const arr = st[r.part];
      for (let k = 0; k < r.count; k++) arr[(r.first + k) * 3 + 2] = 1 - beamUp;
      dirty.add(r.part);
    }
    if (buffers) for (const name of dirty) R.updateBuffer(byName[name].state, st[name], 0);
    dirty.clear();
  }

  /* ---------- picking: the renderer's id pass over the touchable parts ---------- */
  let pickParts = [];
  let shownView = 'home';
  function setView(viewName) {
    shownView = viewName;
    dirtyAll = true;
    /* the earlier versions can be touched in the record view only (chains-scene.js gSet.liftable); elsewhere they are glass the pointer passes through */
    pickParts = CHAIN.has(viewName) && viewName !== 'ring' && dyn ? dyn.pickParts.filter((p) => p.part !== 'pane' || viewName === 'record') : HOWV.has(viewName) ? idrig_.pickParts(viewName).map((p) => Object.assign(p, { rigPick: viewName })) : (world.parts[viewName] || []).filter((p) => p.pick).map((p) => byName[p.part]).filter(Boolean);
  }
  /* the ray through a point of the canvas (CSS pixels) for the camera as it is drawn: the view offset projection's own entries give the
     direction in view space, the view matrix's rotation turns it into the world */
  const proj = new Float32Array(16), vw = new Float32Array(16);
  function ray(px, py, c) {
    projection(proj, fov, 1, 500, c.frame, c.W, c.H);
    const eye = eyeOf(c.aim, c.dist, c.elev, c.yaw); viewMatrix(vw, eye, c.aim);
    const nx = px / c.W * 2 - 1, ny = 1 - py / c.H * 2, d = [(nx + proj[8]) / proj[0], (ny + proj[9]) / proj[5], -1], l = Math.hypot(d[0], d[1], d[2]);
    d[0] /= l; d[1] /= l; d[2] /= l;
    return { o: eye, d: [vw[0] * d[0] + vw[1] * d[1] + vw[2] * d[2], vw[4] * d[0] + vw[5] * d[1] + vw[6] * d[2], vw[8] * d[0] + vw[9] * d[1] + vw[10] * d[2]] };
  }
  /* a world point on the canvas (CSS pixels, canvas origin), for the camera as drawn; null behind the camera */
  function project(pt, c) {
    projection(proj, fov, 1, 500, c.frame, c.W, c.H); viewMatrix(vw, eyeOf(c.aim, c.dist, c.elev, c.yaw), c.aim);
    const vx = vw[0] * pt[0] + vw[4] * pt[1] + vw[8] * pt[2] + vw[12], vy = vw[1] * pt[0] + vw[5] * pt[1] + vw[9] * pt[2] + vw[13], vz = vw[2] * pt[0] + vw[6] * pt[1] + vw[10] * pt[2] + vw[14];
    if (!(vz < 0)) return null;
    return [((proj[0] * vx + proj[8] * vz) / -vz * .5 + .5) * c.W, (1 - ((proj[5] * vy + proj[9] * vz) / -vz * .5 + .5)) * c.H];
  }
  /* what is under a point of the canvas: { part, instance, item, slot, dyn } or null. The renderer draws the touchable parts' instance numbers into one pixel
     (R.pick), lifts and morphs included, so a ring the pointer has lifted is picked where it is seen. */
  function pick(px, py, c) {
    if (!pickParts.length || typeof R.pick !== 'function') return null;
    const hit = R.pick(px, py, c, pickParts);
    if (!hit) return null;
    const p = pickParts[hit.part];
    if (p.rigPick) return { part: p.part, instance: hit.instance, item: hit.instance, slot: hit.instance, rig: p.rigPick, t: 0 };   /* a block of a how-it-works view: its number is the record's place */
    if (dyn && p.buffer) return { part: p.part, instance: hit.instance, item: p.part === 'pane' ? dyn.nR + hit.instance : dyn.slotItem[hit.instance], slot: hit.instance, dyn: true, t: 0 };
    const ids = itemOf[p.part], item = ids ? ids[hit.instance] : -1;
    const first = (ranges[owner[p.part]] || new Map()).get(item), run = first && first.find((q) => q.part === p.part);
    return { part: p.part, instance: hit.instance, item, slot: run ? hit.instance - run.first : hit.instance, t: 0 };
  }
  /* what the words say about a hit: its own instance's line, else the item's line; null for an item with none (it blocks the ray, takes no touch) */
  const stateOf = (v) => { const s = stateNames(v).find((x) => x.index === stateIndex[v]); return s ? s.name : null; };
  function wordsOf(hit) {
    if (!hit) return null;
    if (hit.rig) {
      const w = idrig_.pickOf(hit.rig, stateOf(hit.rig), hit.instance, hit.part);
      if (!w) return null;
      /* a stage's own pick hook (stagePick: the kind and the id it names) or the page a block opens */
      return w.hook === 'stagePick' ? { name: w.name, act: w.act, hook: 'stagePick', key: w.key, arg: w.value } : { name: w.name, act: w.act, hook: 'open', view: w.view, key: w.key, value: w.value, replace: w.replace };
    }
    if (hit.dyn) return dyn.wordsOf(hit, view, Math.round(flightValue('pos')) % dyn.nR);
    return names.items.get(hit.item + ':' + hit.slot) || names.items.get(hit.item + ':*') || null;
  }

  /* ---------- the camera's arrival (WCAM): the pose the first view starts from, relative to its rest ---------- */
  function arrival(v) {
    const keys = S.cam[v]; if (!keys || keys.length < 2) return null;
    const dur = (S.span[v] && S.span[v].camera) || 0, w = (S.set[v] && S.set[v][0] && S.set[v][0].words) || 0;
    return { from: keys[0], to: keys[keys.length - 1], dur, words: w };
  }

  /* the build clock in ms, and whether the first visit's labels may show (WSET home tagsat: the clock at which the kernel and its beam stand) */
  const clockMs = () => (live.home ? live.home.build * ((S.span.home && S.span.home.build) || 0) : 0);
  const tagsAt = () => (S.set.home && S.set.home[0] && S.set.home[0].tagsat) || 0;
  /* the kernel's state in the view drawn (home-descent.js after(): nb = min(1, the flight's n), the network's step back; xl = the weight of lightLogo, which auth-stage.js asks together
     with the beam). The same two numbers as the beam and the network's dim read, so no view is named here: home and calm have a record `back`, the chain's views a flight n. */
  function logoState() {
    const fl = live.flight, a = live.auth, view = world.views[shownView];
    return { nb: Math.min(1, fl && engaged ? (fl.n || 0) : ((view && view.back) || 0)), xl: a ? a.beam * (a.present == null ? 1 : a.present) : 0 };
  }
  return { unbuilt: () => { if (live.home) { live.home.build = 0; dirtyAll = true; } }, homeW: () => lastHw, logoState, step, fly, cameraAt, setState, rest, startBuild, hover, focus, pick, ray, project, clockMs, tagsReady: () => !building || clockMs() >= tagsAt() - 9, wordsOf, setView, arrival, hoverable,
    mountDyn, mountRig, mountId, present, presentOnly, enterId, setNet, get idrig() { return idrigs.length ? idrig_ : null; }, rigFor: (v) => !!idrig_.rigOf(v), groupOf: (v) => (ID_STEPS.has(v) ? 'id' : v), IDV, CHAIN, stateIndexOf: (v) => stateIndex[v] || 0, get rig() { return rig; }, enter, turnTo, setOf, refresh: () => { dynDirty = true; dirtyAll = true; wake(60); }, FAMILY, get dyn() { return dyn; }, get engaged() { return engaged; }, get view() { return view; },
    /* the chain group's page slab and labels follow the camera as drawn: laid after the camera moves, before the draw */
    place: (cam, rect) => { if (dyn && engaged) dyn.place(cam, rect, flightValue); if (rig && rigOn) rig.place(rigOn); },
    value: (v, name, item) => valueOf(v, name, item == null ? 0 : item), stateOf: (v) => { const s = stateNames(v).find((x) => x.index === stateIndex[v]); return s ? s.name : null; },
    isBuilding: () => building, busy: () => plays.size > 0 || cubeFocus !== cubeWant, flying: () => !!flight, stop: () => { flight = null; }, supported: buffers,
    debug: () => ({ live, plays: [...plays.keys()], hovered, building, cubeFocus, items: ranges.home ? ranges.home.size : 0, parts: Object.keys(st), engaged, view }) };
}
