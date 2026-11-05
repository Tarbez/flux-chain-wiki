/* The space's core: window.ArkSpace (docs/design/space/SPACE.md, the contract every part in js/space/ is built against). Layer: app.
   It turns the built objects (world2-objects.mjs placements) into places a visitor moves between, owns which place is focused, and lends
   the objects' camera a focus pose, an orbit and a zoom. The host (world2-host.mjs) attaches it once the objects stand, routes clicks and
   hovers on objects here, and loads the parts (js/space/space.mjs).

   Defined on import with ready = false so a part can whenReady() before the world loads. No DOM of its own. */

const listeners = {};
function emit(name, arg) { (listeners[name] || []).slice().forEach((fn) => { try { fn(arg); } catch (e) { if (window.console) console.warn('[space] a ' + name + ' listener failed: ' + e.message); } }); }
const waiting = [];
let core = null;

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
  for (const p of pl) if (p.id === 'node') {
    const w = words(p.item) || {};
    add({ id: 'net:' + p.item, kind: 'network', name: w.name || 'Network', line: w.act || '', parent: 'kernel', children: [], token: p.roles['--primary'] || '--primary',
      at: [p.x, p.y, p.z], radius: p.groupR || p.s * .72, route: routeOf(w), item: p.item, place: p });
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

  /* the public shape of a place (the contract's fields, without the host's own) */
  const pub = (t) => (t ? { id: t.id, kind: t.kind, name: t.name, short: t.name.split(' · ')[0], line: t.line, facts: (t.facts || []).slice(), parent: t.parent, children: t.children.slice(), token: t.token, at: t.at.slice(), radius: t.radius, route: t.route } : null);

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
    screenOf(id) { const t = byId.get(id); if (!t) return null; const p = t.place, h = (MID[p.id] || .3) * p.s; return project([p.x, p.y + h, p.z]); }
  };
  /* ---------- shows ---------- */
  let timers = [], showing = null;
  const SHOT_H = { kernel: 1.6, network: 1, chain: 3.2 };   /* how much of a place a shot frames, as its focus pose does (world2-objects.mjs focusPose) */
  function step(st) {
    if (st.clear) objects.clearSpawns();
    if (st.light) objects.highlight(st.light.map((id) => (byId.get(id) || {}).item).filter((x) => x != null && x >= 0));
    if (st.shot !== undefined) {
      const sh = st.shot, t = sh && sh.place ? byId.get(sh.place) : null;
      if (!sh || (!t && !sh.place)) objects.focusOn(null);
      else if (t) {
        const r = t.radius * (SHOT_H[t.kind] || 1), K = byId.get('kernel');
        const away = sh.yaw != null ? sh.yaw : t.kind === 'kernel' || !K ? 6 : Math.atan2(t.at[0] - K.at[0], t.at[2] - K.at[2]) * 180 / Math.PI;
        objects.flyPose({ aim: [t.at[0], objects.floor + r * (sh.lift == null ? .2 : sh.lift), t.at[2]], h: r * 2.6 * (sh.dist || 1), elev: sh.elev == null ? 34 : sh.elev, yaw: away + (sh.turn || 0) });
      }
    }
    (st.spawn || []).forEach((sp) => {
      const t = byId.get(sp.near) || byId.get('kernel'); if (!t) return;
      const r = t.radius;
      objects.spawn(sp.type, { x: t.at[0] + (sp.dx || 0) * r, z: t.at[2] + (sp.dz || 0) * r, y: objects.floor + (sp.dy || 0) * r, s: (sp.s || .4) * r, yaw: (sp.yaw || 0) * Math.PI / 180, delay: sp.delay || 0, roles: sp.token ? { '--primary': sp.token } : {} });
    });
    if (st.say !== undefined) emit('say', st.say ? { text: st.say, step: st.n || null } : null);
    wake();
  }
  core.play = (show) => {
    core.stopShow();
    if (!show || !show.steps) return;
    showing = show.id || 'show';
    show.steps.forEach((st) => timers.push(setTimeout(() => step(st), (st.at || 0) * 1000)));
    emit('show', { id: showing, playing: true });
  };
  core.stopShow = () => {
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
      if (core.focus === id) core.open(id); else core.setFocus(id);
      return true;
    },
    hoverItem(item) { core.setHover(item >= 0 ? byItem.get(item) || null : null, false); },
    film(d) { core.film = d; emit('film', d); },
    hasFocus: () => !!core.focus,
    escape() { if (core.focus) { space.back(); return true; } return false; }
  };
}
