/* The space's core: window.ArkSpace (docs/design/space/SPACE.md, the contract every part in js/space/ is built against). Layer: app.
   It turns the built objects (world2-objects.mjs placements) into places a visitor moves between, owns which place is focused, and lends
   the objects' camera a focus pose, an orbit and a zoom. The host (world2-host.mjs) attaches it once the objects stand, routes clicks and
   hovers on objects here, and loads the parts (js/space/space.mjs).

   Defined on import with ready = false so a part can whenReady() before the world loads. No DOM of its own. */

const listeners = {};
function emit(name, arg) { (listeners[name] || []).slice().forEach((fn) => { try { fn(arg); } catch (e) { if (window.console) console.warn('[space] a ' + name + ' listener failed: ' + e.message); } }); }
const waiting = [];
let core = null;

/* STEP FIELDS a show/trip step may carry (play({ steps })), besides at, shot, path, light, spawn, say, n, clear:
     light: [id...] | ['*']        the lit set: lit glow x2.2, every other glow x.45; '*' lights every network
     pulse: [id...]                one lamp pulse (700 ms) on each place's glow parts
     run:   [{ from, to, dur }]    a light runs the trace between two neighbouring places (either way); to '*' = every trace out of from; dur s (1.2)
     title: { text, near, side, size, dy, turn, delay, gap, hold }   one 3D word beside place `near` (an id), side 'left'|'right'|'front',
                                    size = cap height in radii (.5), dy = height in radii (1), letters floor-rise one per gap s (.5) on the heavy
                                    spring, the word sinks hold s (1) after the last lands; stopShow removes it. No font or text module: no word.
     stamp: true | 'keeper-desk'     the keeper's stamp drops once and a receipt rises out of the tray onto the desk (beat 3)
     wake: true | false            the FXN ID card's face lights (beat 2); false puts it out
     rise: 'lane:<id>' | [ids] | '*' | null   the lane's product tokens rise, one after another, each lit in its catalog status (beat 4); null lowers every lane
     copy: 'tower:<n>' | [ids] | '*'   a copy climbs the pinner tower, one slot per 60 ms, to its lamp (beat 5; the intro calls it about 1.1 s after the record)
     lightRack: n                  the road's first n machines light one after another, 120 ms apart, at most 16 (beat 6; the other 4 stay dark)
     pages: n                      the book turns its first n pages (0..12), one after another
   PLACE KINDS besides kernel, network, chain (world2-props.mjs): id-card, book (parent: the first network's first chain), keeper-desk, tower (tower:1..3,
   parent: the first network), lane (lane:<catalog lane id>, parent: kernel, facts: Products), rack (one place 'racks' for the road of 20, parent: kernel).
   A press on one answers in its own way (the card wakes, the desk stamps, a lane rises, a tower copies, the road lights, the book turns a page) and the camera flies to it.
   ids are the places' ids (targets()), never ring items.

   PAGE CALLS (the interaction map, SPACE.md; lane 3 and the parts call these):
     ArkSpace.light(ids | null)       the lit set outside a show: ids = place ids (['kernel'], ['net:3'], ['*'] = every network); null or [] clears it.
                                      Lit glow x2.2, every other glow x.45; the pointer's hover glow still multiplies inside the rule. Returns true when ready.
     ArkSpace.run(from, to, sec, p)   a light runs the trace between two neighbouring places (either way); to '*' = every trace out of `from`; sec 1.2.
                                      p (0..1, optional): the head held at that share (a drag); p >= 1 finishes from the end, p <= 0 clears.
                                      Returns true when a trace was found. Reduced motion: the caller decides (shows skip it).
     ArkSpace.exposure(v)             the picture's exposure as a share of the look's (the intro's dark start .35, then 1).
     ArkSpace.step(st)                one show step without stopping what stands (the intro lays its shots with it). */
/* the kernel has no words of its own in the world's stage; these are its, kept to the reader's first question */
const MID = { kernel: .3, node: .7, drum: .3 };   /* each object's half height at scale 1 (world2-objects.mjs REACH) */
const KERNEL = { name: 'DEFXN kernel', line: 'Every network runs on it.', route: { key: 'resolvers', query: {} } };

const space = window.ArkSpace = {
  ready: false,
  whenReady(fn) { if (space.ready) fn(space); else waiting.push(fn); },
  targets: () => (core ? core.list.slice() : []),
  target: (id) => (core ? core.byId.get(id) || null : null),
  focused: () => (core ? core.focus : null),
  focus: (id) => core && core.setFocus(id == null ? null : id),
  back: () => { if (!core || !core.focus) return; const t = core.byId.get(core.focus); core.setFocus(t && t.parent && t.parent !== 'kernel' ? t.parent : null); },
  open: (id) => core && core.open(id),
  hover: (id) => core && core.setHover(id == null ? null : id, true),
  screenOf: (id) => (core ? core.screenOf(id) : null),
  light: (ids) => !!core && core.light(ids),
  run: (from, to, sec, p) => !!core && core.runTrace(from, to, sec, p),
  /* the light of the whole picture as a share of the look's exposure (1 = the look's own); one smooth rise, placed at once with reduced motion */
  exposure: (v) => !!core && (core.objects.exposure(v), core.wake(), true),
  /* one show step on its own: never stops what stands (no stopShow), so a part can lay its steps one after another */
  step: (st) => !!core && core.step(st),
  orbit: (dyaw, delev) => core && core.objects.orbit(dyaw, delev),
  zoom: (f) => core && core.objects.zoom(f),
  /* a new listener for 'film' or 'targets' hears the current state at once, so a part that mounts late is never stale */
  on(name, fn) {
    (listeners[name] || (listeners[name] = [])).push(fn);
    if (core && name === 'film' && core.film) fn(core.film);
    if (core && name === 'targets') fn(core.list.slice());
    return () => { const l = listeners[name]; const i = l ? l.indexOf(fn) : -1; if (i >= 0) l.splice(i, 1); };
  },
  film: () => (core ? core.film : null),
  /* a page's show (docs/design/space/SPACE.md "Shows"): timed steps of camera shots, lit places, spare objects and captions */
  play: (show) => core && core.play(show),
  stopShow: () => core && core.stopShow()
};

/* objects: world2-objects.mjs's; words(item): the stage's words for a ring item ({ name, act, view, key, value }); openView(view, query): the
   host's open; keyOf(view): the page key of a world view; project(point): [x, y] on the page or null; wake(): ask the host for a frame */
export function attachSpace({ objects, words, openView, keyOf, project, wake }) {
  const list = [], byId = new Map(), byItem = new Map();
  const pl = objects.placements;
  const kernelAt = pl.find((p) => p.id === 'kernel');
  const add = (t) => { list.push(t); byId.set(t.id, t); if (t.item >= 0) byItem.set(t.item, t.id); return t; };
  const routeOf = (w) => (w && w.view ? { key: keyOf(w.view) || w.view, query: w.key ? { [w.key]: w.value } : {} } : null);
  if (kernelAt) add({ id: 'kernel', kind: 'kernel', name: KERNEL.name, line: KERNEL.line, parent: null, children: [], token: '--primary',
    at: [kernelAt.x, kernelAt.y, kernelAt.z], radius: kernelAt.s * 2.3, route: KERNEL.route, item: kernelAt.item, place: kernelAt });
  for (const p of pl) if (p.id === 'node' && !p.pool) {   /* a spare node (the pool, item -1) is not a place: it stood as two phantom 'net:-1' places on the kernel */
    const w = words(p.item) || {};
    add({ id: 'net:' + p.item, kind: 'network', name: w.name || 'Network', line: w.act || '', parent: 'kernel', children: [], token: p.roles['--primary'] || '--primary',
      at: [p.x, p.y, p.z], radius: p.groupR || p.s * .72, body: p.s * .72, route: routeOf(w), item: p.item, place: p });
  }
  for (const p of pl) if (p.id === 'drum') {
    const w = words(p.item) || {}, parent = p.netItem != null && byId.has('net:' + p.netItem) ? 'net:' + p.netItem : 'kernel';
    const t = add({ id: 'chain:' + p.item, kind: 'chain', name: w.name || 'Chain', line: w.act || '', parent, children: [], token: p.roles['--chain-network'] || '--primary',
      at: [p.x, p.y, p.z], radius: p.s * .62, route: routeOf(w), item: p.item, place: p });
    byId.get(parent).children.push(t.id);
  }
  /* two chains of one network with one name (a network holds two identity chains) are told apart by their order there: "Identity
     chain 1", "Identity chain 2" (owner, 2026-11-05: two "IDENTITY CHAIN" tags side by side read as one doubled) */
  for (const t of list) if (t.children.length) {
    const kids = t.children.map((id) => byId.get(id)), seen = new Map();
    kids.forEach((k) => seen.set(k.name, (seen.get(k.name) || 0) + 1));
    const n = new Map();
    kids.forEach((k) => { if (seen.get(k.name) > 1) { const i = (n.get(k.name) || 0) + 1; n.set(k.name, i); k.name = k.name + ' ' + i; } });
  }
  byId.get('kernel') && (byId.get('kernel').children = list.filter((t) => t.kind === 'network').map((t) => t.id));
  /* the intro's objects (world2-props.mjs): each a place of its own kind under its parent; the kernel's children stay the networks */
  const propList = objects.props ? objects.props.places() : [];
  for (const q of propList) {
    const s = q.radius / 1, t = add({ id: q.id, kind: q.kind, name: q.name, line: q.line, facts: q.facts, parent: byId.has(q.parent) ? q.parent : 'kernel', children: [], token: '--primary',
      at: q.at, radius: q.radius, route: null, item: q.item, place: { id: q.kind, x: q.at[0], y: q.at[1], z: q.at[2], s: 1 }, midY: q.mid, height: q.height });
  }

  /* the public shape of a place (the contract's fields, without the host's own) */
  const pub = (t) => (t ? { height: t.height, id: t.id, kind: t.kind, name: t.name, short: t.name.split(' · ')[0], line: t.line, facts: (t.facts || []).slice(), parent: t.parent, children: t.children.slice(), token: t.token, at: t.at.slice(), radius: t.radius, route: t.route } : null);

  /* ---------- each place's key facts (at most three, plain words with units), from the network data (js/content/network-data.js
     DEFXN_NETWORK: NAMED, KIND, CHILDREN; the world's ring item is the data's ring index). Loaded here if the page has not. ---------- */
  const PLURAL = { ledger: ['ledger', 'ledgers'], token: ['token ledger', 'token ledgers'], pool: ['pool', 'pools'] };
  function factsFrom(N) {
    const nets = list.filter((t) => t.kind === 'network');
    for (const t of list) {
      if (t.kind === 'kernel') t.facts = [{ label: 'Networks', value: String(nets.length) }, { label: 'Coin', value: 'None: the kernel knows no coin' }];
      else if (t.kind === 'network') {
        const named = N.NAMED[t.item] || {}, count = {};
        (N.CHILDREN || []).forEach((c) => { if (c[0] === t.item) count[c[1]] = (count[c[1]] || 0) + 1; });
        const holds = ['ledger', 'token', 'pool'].filter((k) => count[k]).map((k) => count[k] + ' ' + PLURAL[k][count[k] === 1 ? 0 : 1]).join(' · ');
        t.facts = [named.coin ? { label: 'Coin', value: named.coin } : null, holds ? { label: 'Holds', value: holds } : null, { label: 'Chains here', value: String(t.children.length) }].filter(Boolean);
      } else if (t.kind === 'chain') {
        const kind = N.KIND[t.item], parent = byId.get(t.parent);
        t.facts = [kind ? { label: 'Kind', value: kind[0].toUpperCase() + kind.slice(1) + ' chain' } : null, parent && parent.kind === 'network' ? { label: 'Network', value: parent.name.split(' · ')[0] } : null].filter(Boolean);
      }
    }
    core.list = list.map(pub); core.byId = new Map(list.map((t) => [t.id, pub(t)]));
    emit('targets', core.list.slice());
  }
  function withNetworkData(fn) {
    if (window.DEFXN_NETWORK) return fn(window.DEFXN_NETWORK);
    const sc = document.createElement('script'); sc.src = (location.protocol === 'file:' ? '' : '/') + 'js/content/network-data.js';
    sc.onload = () => { if (window.DEFXN_NETWORK) fn(window.DEFXN_NETWORK); }; document.head.appendChild(sc);
  }

  core = {
    objects, byId: new Map(list.map((t) => [t.id, pub(t)])), list: list.map(pub), focus: null, hover: null, film: null,
    setFocus(id) {
      if (id != null && !byId.has(id)) return;
      if (id === core.focus) { if (id) objects.focusOn(byId.get(id)); return; }
      core.focus = id;
      objects.focusOn(id ? byId.get(id) : null);
      emit('focus', pub(byId.get(id)) || null);
      wake();
    },
    setHover(id, fromPart) {
      if (id === core.hover) return;
      core.hover = id;
      const t = id ? byId.get(id) : null;
      objects.hover(t ? t.item : -1);
      emit('hover', pub(t) || null);
      if (fromPart) wake();
    },
    open(id) { const t = byId.get(id); if (!t || !t.route) return; openView(t.route.key, t.route.query); },
    /* the middle of the object itself (its own half height), not of the reach a network's camera frames */
    screenOf(id) { const t = byId.get(id); if (!t) return null; const p = t.place, h = t.midY != null ? t.midY : (MID[p.id] || .3) * p.s; return project([p.x, p.y + h, p.z]); }
  };
  const itemsOf = (ids) => (ids || []).map((id) => (id === '*' ? '*' : (byId.get(id) || {}).item)).filter((x) => x === '*' || (x != null && x >= 0));
  core.light = (ids) => { objects.highlight(itemsOf(ids)); wake(); return true; };
  core.runTrace = (from, to, sec, p) => { const ok = objects.run((byId.get(from) || {}).item, to === '*' ? '*' : (byId.get(to) || {}).item, (sec || 1.2) * 1000, p); wake(); return ok; };
  core.wake = wake;
  /* ---------- shows ---------- */
  let timers = [], showing = null;
  const SHOT_H = { kernel: 1.6, network: 1, chain: 3.2 };   /* how much of a place a shot frames, as its focus pose does (world2-objects.mjs focusPose) */
  function shotPose(sh) {
    const t = byId.get(sh.place); if (!t) return null;
    const r = t.radius * (SHOT_H[t.kind] || 1), K = byId.get('kernel');
    const away = sh.yaw != null ? sh.yaw : t.kind === 'kernel' || !K ? 6 : Math.atan2(t.at[0] - K.at[0], t.at[2] - K.at[2]) * 180 / Math.PI;
    return { aim: [t.at[0], objects.floor + r * (sh.lift == null ? .2 : sh.lift), t.at[2]], h: r * 2.6 * (sh.dist || 1), elev: sh.elev == null ? 34 : sh.elev, yaw: away + (sh.turn || 0) };
  }
  let showGen = 0;   /* counts stopShow calls, so a lockup whose letters arrive after its show stopped never rises */
  function step(st) {
    if (st.clear) objects.clearSpawns();
    if (st.light) objects.highlight(itemsOf(st.light));
    const itemOf = (id) => (byId.get(id) || {}).item;
    (st.pulse || []).forEach((id) => objects.pulse(itemOf(id)));
    (st.run || []).forEach((r) => objects.run(itemOf(r.from), r.to === '*' ? '*' : itemOf(r.to), (r.dur || 1.2) * 1000));
    if (st.title && st.title.text) {   /* the one 3D word: beside `near`, one radius high, letters rise one per beat, sinks `hold` s after the last lands */
      const t = byId.get(st.title.near) || byId.get('kernel');
      if (t) {
        const r = t.radius, side = st.title.side || 'front', K = byId.get('kernel');
        const away = t.kind === 'kernel' || !K ? 6 : Math.atan2(t.at[0] - K.at[0], t.at[2] - K.at[2]) * 180 / Math.PI, yaw = away + (st.title.turn || 0);
        const rad = yaw * Math.PI / 180, rx = Math.cos(rad), rz = -Math.sin(rad), sx = side === 'left' ? -1 : side === 'right' ? 1 : 0;   /* the word's own right, seen from the camera */
        const n = st.title.text.length, w = n * (st.title.size || .5) * r * .75 / 2, gap = st.title.gap == null ? .5 : st.title.gap, hold = st.title.hold == null ? 1 : st.title.hold;
        const g = showGen; objects.lockup({ alive: () => g === showGen, text: st.title.text, x: t.at[0] + rx * sx * (r * 1.3 + w) + Math.sin(rad) * (side === 'front' ? r * 1.4 : 0), y: objects.floor + (st.title.dy == null ? 1 : st.title.dy) * r,
          z: t.at[2] + rz * sx * (r * 1.3 + w) + Math.cos(rad) * (side === 'front' ? r * 1.4 : 0), s: (st.title.size || .5) * r, yaw, delay: st.title.delay || 0, gap, rgb: objects.lockupRgb() })
          .then((ok) => { if (ok) setTimeout(() => objects.lockupLeave(0), ((st.title.delay || 0) + n * gap + 1 + hold) * 1000); });
      }
    }
    if (st.path) {   /* one flowing path: waypoints { at, shot } (shot.place 'hero' = the grid's hero pose) */
      const wps = st.path.map((w) => ({ t: w.at, pose: w.shot.place === 'hero' ? 'hero' : shotPose(w.shot) })).filter((w) => w.pose);
      objects.flyPath(wps);
    }
    if (st.shot !== undefined) {
      const sh = st.shot, t = sh && sh.place ? byId.get(sh.place) : null;
      if (!sh || (!t && !sh.place)) objects.focusOn(null);
      else if (t) { const q = shotPose(sh); q.dur = sh.dur; objects.flyPose(q); }
    }
    (st.spawn || []).forEach((sp) => {
      const t = byId.get(sp.near) || byId.get('kernel'); if (!t) return;
      /* a spare is sized and placed in the place's own body radius: a network's radius is its whole district (cube and fan of chains), and a
         node called at .4 of that stood five times the cube's size, a staircase of records out past the district */
      const r = t.body || t.radius;
      objects.spawn(sp.type, { x: t.at[0] + (sp.dx || 0) * r, z: t.at[2] + (sp.dz || 0) * r, y: objects.floor + (sp.dy || 0) * r, s: (sp.s || .4) * r, yaw: (sp.yaw || 0) * Math.PI / 180, delay: sp.delay || 0, roles: sp.token ? { '--primary': sp.token } : {} });
    });
    if (objects.props && (st.stamp || st.pages != null || st.rise !== undefined || st.copy || st.lightRack != null || st.wake !== undefined)) objects.props.step(st);
    if (st.say !== undefined) emit('say', st.say ? { text: st.say, step: st.n || null } : null);
    wake();
  }
  core.step = (st) => { if (!st) return false; if (!showing) { showing = 'steps'; emit('show', { id: showing, playing: true }); } step(st); return true; };   /* stopShow clears what the steps called in */
  core.play = (show) => {
    core.stopShow();
    if (!show || !show.steps) return;
    if (core.objects && core.objects.prepareLetters) core.objects.prepareLetters();   /* the first trip start fetches the lockup words, if a pointer has not already */
    showing = show.id || 'show';
    show.steps.forEach((st) => timers.push(setTimeout(() => step(st), (st.at || 0) * 1000)));
    emit('show', { id: showing, playing: true });
  };
  core.stopShow = () => {
    showGen++;
    timers.forEach(clearTimeout); timers = [];
    if (!showing) return;
    showing = null; objects.clearSpawns(); emit('say', null); emit('show', { id: null, playing: false });
    if (!core.focus) objects.focusOn(null); else objects.focusOn(byId.get(core.focus));
    wake();
  };
  objects.onArrive((t) => emit('arrive', t && byId.has(t.id) ? pub(byId.get(t.id)) : null));
  objects.onCamera((c) => emit('camera', c));

  withNetworkData(factsFrom);
  space.ready = true;
  waiting.splice(0).forEach((fn) => { try { fn(space); } catch (e) { if (window.console) console.warn('[space] a whenReady callback failed: ' + e.message); } });
  emit('targets', core.list.slice());

  return {
    /* the host's click on a built object: the first click flies to it, a click on the focused place opens its page */
    click(item) {
      const id = byItem.get(item); if (!id) return false;
      if (objects.props && objects.props.isProp(item)) { objects.props.press(item); wake(); }   /* the object answers the press itself, then the camera flies */
      if (core.focus === id) core.open(id); else core.setFocus(id);
      return true;
    },
    hoverItem(item) { core.setHover(item >= 0 ? byItem.get(item) || null : null, false); },
    film(d) { core.film = d; emit('film', d); },
    hasFocus: () => !!core.focus,
    escape() { if (core.focus) { space.back(); return true; } return false; }
  };
}
