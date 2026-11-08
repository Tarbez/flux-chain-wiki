/* The intro: seven beats (docs/brand/DEFXN.md "Direction and the claim check" section 5; mechanics from docs/design/space/SPACE.md "Intro: plan"). Layer: app.
   1 Welcome, 2 Your chain, 3 Final, 4 What is built, 5 The proof, 6 What comes next, 7 Who are you. Each is a call, a hold and the visitor's answer.
   A part of the space: it talks only through ArkSpace and the page DOM. Time is the one motion clock (fxn-3d engine/runtime/motion-clock.mjs) on a 120 BPM grid: a beat is
   0.5 s, a bar is 2 s. A hold waits for the visitor: nothing advances on its own. Type moves are closed-form springs (cinematic.mjs), drawn
   by one clock subscriber that runs only while a move is in flight, so a hold costs 0 rAF. The intro is a rehearsal: no press
   writes anything except the role beat 7 keeps (localStorage defxn-quest-v1, the key the missions already use). The rehearsal line stays on
   screen from beat 1 to the end. Words come from the manifest (HOME.LANDING.B1..B7, S5.*) with the doc's words as the fallback.
   Calls to the world that may not exist yet are guarded: ArkSpace.step, ArkSpace.exposure, ArkSpace.run with a progress p (run.length >= 4),
   the id-card, keeper-desk, lane, tower, rack and book objects (a place of that kind is lit when present), 5 pinner nodes, the FINAL letters,
   the floor ripple. Beats 4 and 6 draw their lanes and their road in the DOM until the world's objects stand. */
import { closed as spring, clockNow, clockSubscribe } from '../world2/world2-gl.mjs';   /* the house springs and the one motion clock (fxn-3d engine/runtime) */

const BEAT = 0.5, BAR = 2, WORD = 0.06, KEY = 'defxn-quest-v1', NEXT = 'Next';
const C = (k, d) => { try { const v = window.ArkCopy && ArkCopy.text('HOME.LANDING.' + k); return v && v !== 'HOME.LANDING.' + k ? v : d; } catch (e) { return d; } };
const roles = () => [
  { id: 'curious', name: C('S5.CURIOUS.NAME', 'Just curious'), line: C('S5.CURIOUS.LINE', 'The kernel'), lead: true },
  { id: 'builder', name: C('S5.BUILDER.NAME', 'I build apps'), line: C('S5.BUILDER.LINE', 'Your chain') },
  { id: 'operator', name: C('S5.OPERATOR.NAME', 'I run computers'), line: C('S5.OPERATOR.LINE', 'The keeper') },
  { id: 'look', name: C('S5.LOOK.NAME', 'Just look around'), line: C('S5.LOOK.LINE', 'No mission') },
  { id: 'claims', name: C('B7.CLAIMS.NAME', 'I check claims'), line: '', quiet: true }
];
const LANES = 'Build. Ship. Network. Govern. Social and live. Assets. DeFi.';
const LANE_IDS = ['code', 'ship', 'resolve', 'govern', 'social', 'assets', 'defi'];

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
const pageNow = () => { const st = window.ArkUI && ArkUI.sceneState && ArkUI.sceneState.get ? ArkUI.sceneState.get() : null; return st ? st.page : null; };
let catalog = null;   /* the product catalog's lanes and products, read once from the kit file (statuses are the catalog's own words) */
async function loadCatalog() {
  if (catalog) return catalog;
  try {
    const t = await (await fetch((location.protocol === 'file:' ? '' : '/') + 'assets/kit/defxn-product.js')).text();
    const a = t.indexOf('/* @catalog */') + 14, b = t.indexOf('/* @end-catalog */');
    const c = JSON.parse(t.slice(a, b).trim());
    catalog = { lanes: c.lanes, products: c.products };
  } catch (e) { catalog = { lanes: [], products: [] }; }
  return catalog;
}

export function mount(space, host) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phone = () => innerWidth < 640;
  const root = el('div', 'intro'); root.hidden = true; host.appendChild(root);
  const card = el('div', 'intro-card'); card.setAttribute('aria-live', 'polite');
  const text = el('p', 'intro-text'), sub = el('p', 'intro-sub'), no = el('b', 'intro-no');
  card.append(text, sub, no);
  const reh = el('b', 'intro-reh', C('B1.REHEARSAL', 'A rehearsal. Nothing is live.')); reh.hidden = true;
  const chip = el('button', 'intro-chip'); chip.type = 'button'; chip.hidden = true;
  const tip = el('div', 'intro-tip'); tip.hidden = true;
  const track = el('div', 'intro-track'); track.hidden = true; track.tabIndex = 0; track.setAttribute('role', 'slider'); track.setAttribute('aria-label', C('B3.TRACK', 'Drag to pay'));
  track.setAttribute('aria-valuemin', '0'); track.setAttribute('aria-valuemax', '100'); track.setAttribute('aria-valuenow', '0');
  const knob = el('i', 'intro-knob'), tlabel = el('span', 'intro-track-label', C('B3.TRACK', 'Drag to pay'));
  track.append(tlabel, knob);
  const payBtn = el('button', 'intro-chip', C('B3.PAY', 'Pay')); payBtn.type = 'button'; payBtn.hidden = true;
  const who = el('h2', 'intro-who', C('B7.LINE', 'Who are you?')); who.hidden = true;
  const tagsBox = el('div', 'intro-tags'); tagsBox.hidden = true; tagsBox.setAttribute('role', 'group'); tagsBox.setAttribute('aria-label', C('B7.LINE', 'Who are you?'));
  const lanesBox = el('div', 'intro-lanes'); lanesBox.hidden = true;
  const panel = el('div', 'intro-panel'); panel.hidden = true;
  const road = el('div', 'intro-road'); road.hidden = true;
  const skip = el('button', 'intro-skip', C('SKIP', 'Skip')); skip.type = 'button'; skip.hidden = true;
  root.append(card, reh, tip, lanesBox, panel, road, chip, track, payBtn, who, tagsBox, skip);

  const stops = [];
  let timers = [], anims = [], ticking = false, t0 = clockNow();
  let started = false, played = false, loadedOnIntro = false, shot = 0, phase = 'idle', answered = false, idleTimer = 0;
  let P = null;              /* the places: { chain, network, kernel } */
  let stand = [];            /* spares standing in the scene (re-called when a show must restart) */
  let lit = null, tagEls = [], cur = { chip: null };
  const now = () => clockNow() - t0;

  /* ---------- the clock: timers for the sequence, one rAF loop for moves in flight ---------- */
  const later = (sec, fn) => { if (reduced || sec <= 0) { fn(); return; } timers.push(setTimeout(fn, sec * 1000)); };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; clearTimeout(idleTimer); };
  /* one subscriber on the motion clock while a move is in flight; with none left it says so and the clock stops its rAF */
  function tick(c) {
    const t = c - t0;
    anims = anims.filter((a) => !a(t));
    ticking = anims.length > 0; return ticking;
  }
  function anim(fn) { if (reduced) { fn(1e6); return; } anims.push(fn); if (!ticking) { ticking = true; clockSubscribe(tick); } }

  /* ---------- the world: steps, guarded ---------- */
  function steps(list, spawns) {
    const spec = (spawns || []);
    spec.forEach((s) => stand.push(s));
    try {
      if (space.step) { list.forEach((st) => { const s = Object.assign({}, st); const at = s.at || 0; delete s.at; if (spec.length && at === 0) s.spawn = (s.spawn || []).concat(spec.map((p) => Object.assign({}, p))); later(at, () => space.step(s)); }); return; }
      /* no step member yet: a show replaces the last one, so what stands is called again at once, then the new steps */
      const keep = stand.filter((p) => !spec.includes(p)).map((p) => Object.assign({}, p, { delay: 0 }));
      const out = list.map((st) => Object.assign({}, st));
      const first = out.find((s) => !s.at) || (out.unshift({ at: 0 }), out[0]);
      first.spawn = (first.spawn || []).concat(keep, spec);
      space.play({ id: 'intro', steps: out });
    } catch (e) { if (window.console) console.warn('[intro] a step did not play (' + e.message + ')'); }
  }
  const light = (ids) => { lit = ids; try { space.light(ids); } catch (e) {} };
  const exposure = (v) => { try { if (space.exposure) space.exposure(v); } catch (e) {} };
  const at = (id, dx, dz, o) => Object.assign({ type: 'record', near: id, dx, dz, s: 0.5, delay: 0 }, o || {});
  const portrait = () => (phone() ? 1.35 : 1);
  const pose = (id, dist, elev, turn, dur) => ({ place: id, dist: dist * portrait(), elev, turn, dur });
  const kindOf = (k) => space.targets().filter((t) => t.kind === k).map((t) => t.id);   /* a new object kind (lane, tower, rack ...) when the world has it */

  function places() {
    const all = space.targets();
    const network = all.find((t) => t.kind === 'network');
    if (!network) return null;
    const chain = all.find((t) => t.kind === 'chain' && t.parent === network.id) || all.find((t) => t.kind === 'chain');
    if (!chain) return null;
    const one = (k) => { const t = all.find((x) => x.kind === k); return t ? t.id : null; };
    return { chain: chain.id, network: network.id, kernel: 'kernel', card: one('id-card'), desk: one('keeper-desk'), racks: one('rack'), book: one('book'), towers: all.filter((x) => x.kind === 'tower').map((x) => x.id), lanes: all.filter((x) => x.kind === 'lane').map((x) => x.id) };
  }
  const FAN = [45, 135, 225, 315].map((a) => [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180)]);

  /* ---------- the type ---------- */
  /* line at 29 (the opening head at 47), an optional 18 sub line, a 11 mono label under it. place() takes the emptiest corner */
  let gen = 0, capSub = null;   /* a new caption cancels a wipe still in flight */
  function caption(line, o) {
    o = o || {}; gen++; card.style.clipPath = '';
    text.textContent = ''; text.style.cssText = ''; text.classList.toggle('intro-text-big', !!o.big);
    const words = line.split(' ').map((w, i, a) => { const sp = el('span', 'intro-w'), n = el('span', 'intro-wi', w); sp.appendChild(n); text.appendChild(sp); if (i < a.length - 1) text.appendChild(document.createTextNode(' ')); return n; });
    sub.textContent = o.sub || ''; sub.hidden = !o.sub;
    no.textContent = o.mono || ''; no.hidden = !o.mono;
    capSub = o.subject; place(o.subject);
    card.classList.add('on');
    const start = now() + 0.5;      /* half a beat after the move starts */
    anim((t) => {
      words.forEach((n, i) => { const p = spring('type', t - start - i * WORD); n.style.transform = 'translateY(' + ((1 - p) * 0.6).toFixed(3) + 'em)'; });
      if (o.mono) no.style.letterSpacing = (0.28 - 0.12 * spring('letter', t - start)).toFixed(4) + 'em';
      return t - start - words.length * WORD > 1.2;
    });
  }
  function wipe(done) {   /* the caption leaves upward under a mask, never a fade */
    const start = now(), g = ++gen;
    anim((t) => {
      if (g !== gen) return true;
      const p = spring('type', t - start);
      card.style.clipPath = 'inset(0 0 ' + (p * 100).toFixed(1) + '% 0)';
      if (p > 0.995) { text.textContent = ''; sub.textContent = ''; text.style.cssText = ''; no.hidden = true; sub.hidden = true; card.style.clipPath = ''; card.classList.remove('on'); if (done) done(); return true; }
      return false;
    });
  }
  /* the emptiest of four corners: count every place standing on screen inside each corner's block, the lit subject twice */
  function place(subject) {
    if (phone()) { card.style.left = ''; card.style.top = ''; return; }
    const pts = space.targets().map((t) => space.screenOf(t.id)).filter(Boolean), s0 = subject && space.screenOf(subject);
    if (s0) pts.push(s0);
    const w = Math.min(520, innerWidth * 0.45), hgt = Math.max(70, card.offsetHeight || 100) + 20, m = 150, X = [innerWidth * 0.06, innerWidth - w - innerWidth * 0.06], Y = [innerHeight * 0.16, innerHeight * 0.58];
    const rects = [lanesBox, road, panel].filter((b) => !b.hidden).map((b) => b.getBoundingClientRect());
    const cells = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([cx, cy]) => ({ x: X[cx], y: Y[cy], n: pts.filter((q) => q[0] > X[cx] - m - 120 && q[0] < X[cx] + w + m + 120 && q[1] > Y[cy] - m && q[1] < Y[cy] + hgt + m).length + (cy ? 1.5 : 0) + 4 * rects.filter((r) => r.left < X[cx] + w && r.right > X[cx] && r.top < Y[cy] + hgt && r.bottom > Y[cy]).length }));   /* objects stand on the floor: the sky is preferred */
    const best = cells.reduce((a, c) => (c.n < a.n ? c : a), cells[0]);
    card.style.width = w + 'px'; card.style.left = best.x.toFixed(0) + 'px'; card.style.top = best.y.toFixed(0) + 'px';
  }

  /* a DOM row (lanes, road) takes the band with the fewest places near it: bottom, middle-low or top */
  function placeBand(box) {
    box.style.top = ''; box.style.bottom = '';
    if (phone()) return;
    const pts = space.targets().map((t) => space.screenOf(t.id)).filter(Boolean), H = innerHeight;
    const n = (y) => pts.filter((q) => Math.abs(q[0] - innerWidth / 2) < 600 && q[1] > y - 190 && q[1] < y + 190).length;
    const best = [140, H - 340, H - 194].map((y, i) => ({ y, n: n(y) + (i === 2 ? 1 : 0) })).reduce((a, c) => (c.n < a.n ? c : a));
    box.style.bottom = 'auto'; box.style.top = best.y + 'px';
  }
  /* ---------- the chip: the one dominant action, in the complement, on its subject ---------- */
  function showChip(label, anchor, dx, dy, onPress, tipText) {
    cur.chip = { anchor, dx: dx || 0, dy: dy || 0, onPress, tip: tipText || '' };
    chip.textContent = label; chip.hidden = false; chip.classList.remove('nudge');
    positionChip();
    const start = now();
    anim((t) => { const p = spring('ui', t - start); chip.style.setProperty('--rise', ((1 - p) * 14).toFixed(2) + 'px'); return p > 0.999; });
    chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; tip.hidden = true; cur.chip = null; }
  const anchorAt = (a) => (typeof a === 'function' ? a() : space.screenOf(a));
  function positionChip() {
    if (!cur.chip || chip.hidden) return;
    if (phone()) { chip.classList.add('thumb'); chip.style.left = ''; chip.style.top = ''; return; }
    chip.classList.remove('thumb');
    const s = anchorAt(cur.chip.anchor), w = chip.offsetWidth || 160;
    const x = s ? s[0] + cur.chip.dx : innerWidth / 2, y = s ? s[1] + cur.chip.dy : innerHeight * 0.8;
    chip.style.left = Math.max(16, Math.min(innerWidth - w - 16, x - w / 2)).toFixed(0) + 'px';
    chip.style.top = Math.max(96, Math.min(innerHeight - 150, y)).toFixed(0) + 'px';
    if (!tip.hidden) { tip.style.left = chip.style.left; tip.style.top = (parseFloat(chip.style.top) + 52) + 'px'; }
  }
  chip.addEventListener('click', () => { if (cur.chip && phase === 'hold') cur.chip.onPress(); });
  const hoverTip = (on) => { if (cur.chip && cur.chip.tip && !phone()) { tip.textContent = cur.chip.tip; tip.hidden = !on; positionChip(); } };
  chip.addEventListener('pointerenter', () => hoverTip(true)); chip.addEventListener('pointerleave', () => hoverTip(false));
  chip.addEventListener('focus', () => hoverTip(true)); chip.addEventListener('blur', () => hoverTip(false));

  /* a hold: the target lit, the chip up on the next downbeat, then it waits. After two idle bars the lamp pulses once and the chip nudges 2 px */
  function hold(label, anchor, dx, dy, press, tipText) {
    phase = 'hold'; answered = false; place(capSub);   /* the camera has landed: the block takes the emptiest corner again */
    showChip(label, anchor, dx, dy, press, tipText);
    clearTimeout(idleTimer);
    if (!reduced) idleTimer = setTimeout(() => {
      if (phase !== 'hold') return;
      chip.classList.add('nudge');
      const ids = lit; light(null); setTimeout(() => light(ids), 160);
    }, 2 * BAR * 1000);
  }
  /* every press: the chip and any DOM stand-in leave, the caption wipes, the next call starts a half beat later */
  function answer(fn, delay) { if (answered) return false; answered = true; phase = 'answer'; hideChip(); clearTimeout(idleTimer); wipe(); later(delay == null ? BEAT : delay, fn); return true; }

  /* ---------- the seven beats ---------- */
  function begin() {
    root.hidden = false; skip.hidden = false; reh.hidden = false; document.documentElement.classList.add('intro-on'); document.documentElement.classList.remove('intro-picker');
    window.dispatchEvent(new CustomEvent('ark-intro-state', { detail: { playing: true } }));
  }
  const clearStage = () => { hideChip(); resetTrack(); lanesBox.hidden = true; panel.hidden = true; road.hidden = true; lanesBox.replaceChildren(); panel.replaceChildren(); road.replaceChildren(); };

  /* 1 Welcome: the world is dark, one lamp at the kernel. Press the kernel. */
  function b1() {
    P = places(); if (!P) return finishQuiet();
    begin(); shot = 1; phase = 'call'; stand = []; clearStage();
    exposure(0.35); light([P.kernel]);
    steps([{ at: 0, shot: pose(P.kernel, 1.3, 16, -20, BAR) }]);
    caption(C('B1.HEAD', 'Welcome to FXN.'), { big: true, sub: C('B1.LINE', 'A new internet, built in the open.'), subject: P.kernel });
    later(BAR, () => hold(C('B1.CHIP', 'Switch on the kernel'), P.kernel, phone() ? 0 : 0, 110, press1));
  }
  function press1() {
    if (!answer(b2)) return;
    light(null); exposure(1);   /* the lamp comes on, the floor grid comes down */
    steps([{ at: 0, pulse: [P.kernel] }]);
  }
  /* 2 Your chain: a card beside a drum. Press the ID. */
  function b2() {
    shot = 2; phase = 'call'; clearStage(); light([P.chain]);
    steps([{ at: 0, shot: pose(P.card || P.chain, P.card ? 2.6 : 1.1, 22, -25, BAR) }], P.card ? [] : [at(P.chain, -1.4, 0, { type: 'card', s: 0.6, delay: 3 * BEAT })]);   /* the id-card place when the world has it */
    caption(C('B2.LINE', 'Every person keeps their own chain.'), { mono: C('B2.MONO', 'Your FXN ID. Only your key writes to it.'), subject: P.chain });
    later(BAR, () => hold(C('B2.CHIP', 'Press your ID'), P.card || P.chain, phone() ? 0 : -110, 70, press2, C('B2.HOVER', 'Your FXN ID. It keeps its own chain.')));
  }
  function press2() { if (answer(b3)) steps([{ at: 0, pulse: [P.chain], wake: true }, { at: 0.6, pages: P.book ? 3 : 0 }]); }   /* the card's face wakes, the drum wakes, the book turns its first pages */

  /* 3 Final: drag to pay, one keeper signs, FINAL rises */
  function b3() {
    shot = 3; phase = 'call'; clearStage(); light([P.chain]);
    steps([{ at: 0, shot: pose(P.desk || P.chain, P.desk ? 3.4 : 1.5, 30, 10, BAR) }, { at: 1.5, light: [P.chain, P.desk || P.network] }], P.desk ? [] : [at(P.network, 1.2, 0.8, { type: 'node', s: 0.4, delay: 0 })]);   /* the keeper's desk replaces the spare node */
    caption(C('B3.LINE', 'Pay. One keeper signs. It is final.'), { mono: C('B3.MONO', 'No vote. A keeper posts a bond and loses it if it cheats.'), subject: P.chain });
    later(BAR, () => { phase = 'hold'; answered = false; place(capSub); if (reduced) { payBtn.hidden = false; payBtn.focus(); } else { track.hidden = false; track.focus({ preventScroll: true }); const s = now(); anim((t) => { const p = spring('ui', t - s); track.style.setProperty('--rise', ((1 - p) * 14).toFixed(2) + 'px'); return p > 0.999; }); } });
  }
  let drag = null, ran = false;
  function setTrack(p) { const max = track.clientWidth - knob.offsetWidth - 4; knob.style.transform = 'translateX(' + (p * max).toFixed(1) + 'px)'; track.setAttribute('aria-valuenow', String(Math.round(p * 100))); }
  function resetTrack() { track.hidden = true; payBtn.hidden = true; ran = false; setTrack(0); }
  function lane(p) {
    try {
      if (space.run && space.run.length >= 4) space.run(P.chain, P.network, BAR, p);
      else if (!ran && p > 0.08) { ran = true; space.run(P.chain, P.network, BAR); }
    } catch (e) {}
  }
  knob.addEventListener('pointerdown', (e) => { if (phase !== 'hold' || shot !== 3) return; drag = { x: e.clientX, p: 0 }; knob.setPointerCapture(e.pointerId); e.preventDefault(); });
  knob.addEventListener('pointermove', (e) => { if (!drag) return; const max = track.clientWidth - knob.offsetWidth - 4; drag.p = Math.max(0, Math.min(1, (e.clientX - drag.x) / max)); setTrack(drag.p); lane(drag.p); });
  const release = () => {
    if (!drag) return; const p = drag.p; drag = null;
    if (p >= 0.9) { setTrack(1); pay(); return; }
    ran = false;
    const from = p, start = now();   /* a short release runs the light back on type */
    anim((t) => { const q = spring('type', t - start); setTrack(from * (1 - q)); if (space.run && space.run.length >= 4) lane(from * (1 - q)); return q > 0.995; });
  };
  knob.addEventListener('pointerup', release); knob.addEventListener('pointercancel', release);
  track.addEventListener('keydown', (e) => { if (e.key === 'Enter' && phase === 'hold' && shot === 3) { e.preventDefault(); pay(); } });
  payBtn.addEventListener('click', () => { if (phase === 'hold' && shot === 3) pay(); });
  function pay() {
    if (answered) return; answered = true; phase = 'answer'; resetTrack();
    try { if (space.run && space.run.length >= 4) space.run(P.chain, P.network, 0.3, 1); else space.run(P.chain, P.network, BEAT); } catch (e) {}
    /* the keeper pulses, the receipt lands by the card, FINAL rises */
    steps([{ at: 0, shot: pose(P.desk || P.network, P.desk ? 2.6 : 1.0, 22, 40, BEAT) }, { at: BEAT, stamp: P.desk ? true : undefined, pulse: [P.network], light: [P.desk || P.network], title: { text: C('LOCKUP', 'FINAL'), near: P.network, side: 'right', size: 0.3, delay: BEAT, gap: BEAT, hold: 3 } }],
      P.desk ? [] : [at(P.chain, -1.9, 0, { s: 0.5, delay: BAR, token: '--primary' })]);   /* the stamp drops and the receipt rises onto the desk */
    later(2 * BAR, () => hold(C('B3.CHIP', 'Press the receipt'), P.desk || P.chain, phone() ? 0 : -150, 70, press3, C('B3.HOVER', 'Keep it. Anyone can check it.')));
  }
  function press3() { if (answer(b4)) steps([{ at: 0, pulse: [P.chain] }]); }

  /* 4 What is built: seven lanes on one kernel. Light a lane, see its products with their catalog status. */
  function b4() {
    shot = 4; phase = 'call'; clearStage(); light([P.kernel]);
    if (P.lanes.length) light(P.lanes.concat([P.kernel]));   /* the world's own lane places, when they stand */
    steps([{ at: 0, shot: pose(P.kernel, P.lanes.length ? 2.1 : 1.6, P.lanes.length ? 40 : 26, 0, BAR) }]);
    caption(C('B4.LINE', 'Seven lanes of products on one kernel.'), { mono: C('B4.MONO', LANES), subject: P.kernel });
    loadCatalog();
    later(BAR, () => {
      if (!P.lanes.length) buildLanes();   /* the DOM row stays only until the lane places stand */
      hold(C('B4.CHIP', 'Light a lane'), P.lanes.length ? P.lanes[0] : laneAnchor, 0, P.lanes.length ? 60 : 0, () => { if (P.lanes.length) { steps([{ at: 0, rise: P.lanes[0] }]); loadedLane(P.lanes[0].replace(/^lane:/, '')); laneNext(); } else { const first = lanesBox.querySelector('.intro-lane'); if (first) pressLane(first); } });
    });
  }
  let laneSeen = false;
  function buildLanes() {
    lanesBox.replaceChildren(); lanesBox.hidden = false; laneSeen = false;
    const names = C('B4.MONO', LANES).split('. ').map((n) => n.replace(/\.$/, '')).filter(Boolean);
    names.slice(0, 7).forEach((name, i) => {
      const b = el('button', 'intro-lane', name); b.type = 'button'; b.dataset.lane = LANE_IDS[i];
      b.addEventListener('pointerenter', () => { try { space.light([P.kernel]); space.run(P.kernel, '*', BAR); } catch (e) {} });
      b.addEventListener('click', () => pressLane(b));
      lanesBox.appendChild(b);
      const s = now() + i * 0.06; b.style.setProperty('--rise', '16px');
      anim((t) => { const p = spring('ui', t - s); b.style.setProperty('--rise', ((1 - p) * 16).toFixed(2) + 'px'); return p > 0.999; });
    });
  }
  const rowAnchor = (box) => () => { const r = box.getBoundingClientRect(); return [innerWidth / 2, r.top > 300 ? r.top - 56 : r.bottom + 16]; };
  const laneAnchor = () => { const r = lanesBox.getBoundingClientRect(); return phone() ? [innerWidth / 2, r.top - 56] : [r.right + 100, r.bottom - 30]; };
  /* a press on a lane place in the world rises its tokens and flies there: show that lane's products with their status and offer Next */
  function laneNext() { if (laneSeen) return; laneSeen = true; showChip(C('NEXT', NEXT), P.lanes[0], 0, 60, () => { steps([{ at: 0, rise: null }]); answer(b5); }); }
  stops.push(space.on('focus', (t) => {
    if (!t || t.kind !== 'lane' || shot !== 4 || phase !== 'hold') return;
    loadedLane(t.id.replace(/^lane:/, ''));
    laneNext();
  }));
  async function loadedLane(laneId) {
    const c = await loadCatalog();
    const nm = (c.lanes.find((l) => l.id === laneId) || {}).name || laneId;
    panel.replaceChildren(el('b', 'intro-panel-name', nm));
    c.products.filter((p) => p.lane === laneId).sort((a, z) => (a.order || 0) - (z.order || 0)).forEach((p) => { const r = el('div', 'intro-product'); r.append(el('span', null, p.name), el('em', null, p.status || '')); panel.appendChild(r); });
    panel.hidden = false;
  }
  async function pressLane(b) {
    if (phase !== 'hold' || shot !== 4) return;
    lanesBox.querySelectorAll('.intro-lane').forEach((x) => x.classList.toggle('on', x === b));
    try { space.light([P.kernel]); space.run(P.kernel, '*', BAR); steps([{ at: 0, pulse: [P.kernel] }]); } catch (e) {}
    const c = await loadCatalog();
    const ps = c.products.filter((p) => p.lane === b.dataset.lane).sort((a, z) => (a.order || 0) - (z.order || 0));
    panel.replaceChildren(el('b', 'intro-panel-name', b.textContent));
    ps.forEach((p) => { const r = el('div', 'intro-product'); r.append(el('span', null, p.name), el('em', null, p.status || '')); panel.appendChild(r); });
    panel.hidden = false;
    if (!laneSeen) { laneSeen = true; showChip(C('NEXT', NEXT), laneAnchor, 0, 0, () => { answer(b5); }); }
  }

  /* 5 The proof: scroll out, copies reach the pinners in about 1.1 s */
  function b5() {
    shot = 5; phase = 'call'; clearStage(); light([P.network]);
    steps([{ at: 0, shot: pose(P.network, P.towers.length ? 1.15 : 1.3, 28, 0, BAR) }]);
    caption(C('B5.LINE', 'Every number names its machine.'), { mono: C('B5.MONO', '26,274 final payments a second. 5 test nodes on one machine. 1,000 in flight.'), subject: P.network });
    later(BAR, () => hold(reduced ? C('B5.STEP', 'Show the copies') : phone() ? C('B5.CHIP.TOUCH', 'Pinch out') : C('B5.CHIP', 'Scroll out'), P.network, 0, phone() ? 0 : 130, copies));
  }
  function copies() {
    if (phase !== 'hold' || shot !== 5 || answered) return; answered = true; phase = 'answer'; hideChip();
    if (!reduced) { try { space.zoom(1.45); } catch (e) {} }
    if (P.towers.length) steps([{ at: 0, pulse: [P.network] }, { at: 1.1, copy: '*' }]);   /* a copy climbs each pinner tower about 1.1 s after the record */
    else steps([{ at: 0, pulse: [P.network] }],
      FAN.map((f, i) => at(P.network, f[0] * 3, f[1] * 3, { type: 'node', s: 0.4, delay: i * 0.1 })).concat(FAN.map((f) => at(P.network, f[0] * 3 + 0.5, f[1] * 3, { delay: 1.1 }))));
    wipe(() => later(1.1, () => {
      caption(C('B5.NUMBER', 'A copy reached each pinner in about 1.1 s.'), { mono: C('B5.CONDITION', 'Measured on 5 test nodes on one machine. Nothing live.'), subject: P.network });
      later(BAR, () => hold(C('NEXT', NEXT), () => [innerWidth / 2, innerHeight - 190], 0, 0, () => answer(b6)));
    }));
  }
  /* the answer to beat 5: a wheel notch out, a pinch, the minus key */
  addEventListener('wheel', (e) => { if (shot === 5 && phase === 'hold' && e.deltaY > 0 && !root.hidden) copies(); }, { passive: true });
  let pinch0 = 0;
  const dist2 = (e) => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  addEventListener('touchstart', (e) => { if (e.touches.length === 2) pinch0 = dist2(e); }, { passive: true });
  addEventListener('touchmove', (e) => { if (shot === 5 && phase === 'hold' && e.touches.length === 2 && pinch0 && Math.abs(dist2(e) - pinch0) > pinch0 * 0.12) { pinch0 = 0; copies(); } }, { passive: true });

  /* 6 What comes next: devnet genesis. Press the road: up to 16 of 20 machines light, 4 wait. No date. */
  function b6() {
    shot = 6; phase = 'call'; clearStage(); light(null);
    steps(P.racks ? [{ at: 0, shot: pose(P.racks, phone() ? 1.5 : 0.9, 58, 0, BAR) }] : [{ at: 0, path: [{ at: BAR, shot: { place: 'hero' } }] }]);   /* high enough that both rows of racks show */
    caption(C('B6.LINE', 'Devnet genesis is next.'), { mono: C('B6.MONO', 'Up to 16 of our 20 machines. Test money. No date until the gate passes.'), subject: P.kernel });
    later(BAR, () => {
      if (!P.racks) { road.hidden = false; road.replaceChildren(); placeBand(road); for (let i = 0; i < 20; i++) road.appendChild(el('i', 'intro-dot')); }
      hold(C('B6.CHIP', 'See the road'), P.racks || rowAnchor(road), 0, P.racks ? 90 : 0, press6);
    });
  }
  stops.push(space.on('focus', (t) => { if (t && t.kind === 'rack' && shot === 6 && phase === 'hold' && !answered) press6(); }));
  function press6() {
    if (answered) return; answered = true; phase = 'answer'; hideChip();
    const dots = [...road.children];
    if (P.racks) steps([{ at: 0, lightRack: 16 }]);
    dots.slice(0, 16).forEach((d, i) => later(i * 0.12, () => d.classList.add('on')));   /* the 4 that wait stay dim */
    try { space.light(['*']); } catch (e) {}
    later(16 * 0.12 + 0.5, () => { phase = 'hold'; answered = false; showChip(C('NEXT', NEXT), P.racks || rowAnchor(road), 0, P.racks ? 90 : 0, () => answer(() => shot7(false))); });
  }

  /* 7 Who are you: four role tags standing in the world, and "I check claims" at the dock */
  function shot7(standing) {
    shot = 7; phase = 'call'; clearStage(); hideAll(true);
    P = P || places(); if (!P) return finishQuiet();
    begin(); skip.hidden = false; skip.textContent = C('SKIP', 'Skip');
    light(null); exposure(1);
    window.dispatchEvent(new CustomEvent('ark-intro-state', { detail: { playing: false, done: true } }));   /* the nav returns at beat 7 */
    document.documentElement.classList.remove('intro-on'); document.documentElement.classList.add('intro-picker');
    steps([{ at: 0, path: [{ at: standing ? 1 : 4, shot: { place: 'hero' } }] }]);
    who.hidden = false; who.style.transform = 'scale(1.08)'; reh.hidden = false;
    const s0 = now() + (standing ? 0 : 2 * BEAT);
    anim((t) => { const p = spring('heavy', t - s0); who.style.transform = 'scale(' + (1.08 - 0.08 * p).toFixed(4) + ')'; return p > 0.999; });
    buildTags(standing ? 0 : 2 * BAR + BEAT);
    later(standing ? 0 : 3 * BAR, () => { phase = 'hold'; const first = tagEls[0] && tagEls[0].b; if (first) first.focus({ preventScroll: true }); layoutTags(); });
  }
  function placeOf(id) { return id === 'curious' ? P.kernel : id === 'builder' ? P.chain : id === 'operator' ? P.network : null; }
  function buildTags(delay) {
    tagsBox.replaceChildren(); tagEls = []; tagsBox.hidden = false;
    roles().forEach((r, i) => {
      const b = el('button', 'intro-tag' + (r.lead ? ' lead' : '') + (r.quiet ? ' quiet' : '')); b.type = 'button'; b.dataset.role = r.id;
      b.append(el('strong', null, r.name)); if (r.line) b.append(el('span', null, r.line));
      const on = () => hoverRole(r.id), off = () => hoverRole(null);
      b.addEventListener('pointerenter', on); b.addEventListener('pointerleave', off); b.addEventListener('focus', on); b.addEventListener('blur', off);
      b.addEventListener('click', () => choose(r.id));
      tagsBox.appendChild(b);
      const s = now() + delay + i * BEAT; tagEls.push({ b, id: r.id });
      b.style.setProperty('--rise', '28px');
      anim((t) => { const p = spring('ui', t - s); b.style.setProperty('--rise', ((1 - p) * 28).toFixed(2) + 'px'); return p > 0.999; });
    });
    layoutTags();
  }
  /* desktop: a small tag near its place with a leader to it, never over the header or the dock; phone: stacked in the thumb zone */
  function layoutTags() {
    if (!tagEls.length) return;
    tagsBox.querySelectorAll('.intro-lead').forEach((n) => n.remove());
    if (phone()) { tagsBox.classList.add('stacked'); tagEls.forEach((t) => { t.b.style.left = ''; t.b.style.top = ''; }); return; }
    tagsBox.classList.remove('stacked');
    const W = 220, H = 58, top = 120, bottom = innerHeight - 140, boxes = [];
    tagEls.filter((t) => t.id !== 'look' && t.id !== 'claims').forEach((t) => {
      const id = placeOf(t.id), pt = id && space.screenOf(id);
      let x, y;
      if (pt) { x = pt[0] + (pt[0] < innerWidth / 2 ? -W - 36 : 36); y = pt[1] - 80; } else { x = innerWidth / 2 - W / 2; y = top; }
      x = Math.max(16, Math.min(innerWidth - W - 16, x)); y = Math.max(top, Math.min(bottom - H, y));
      boxes.push({ t, pt, x, y });
    });
    boxes.sort((a, b) => a.y - b.y);
    for (let i = 0; i < 6; i++) boxes.forEach((a, k) => boxes.forEach((b, j) => { if (j > k && Math.abs(a.x - b.x) < W + 12 && b.y < a.y + H + 12) b.y = Math.min(bottom - H, a.y + H + 12); }));
    boxes.forEach((o) => {
      const b = o.t.b; b.style.left = o.x.toFixed(0) + 'px'; b.style.top = o.y.toFixed(0) + 'px';
      if (!o.pt) return;
      const ex = o.pt[0] < o.x ? o.x : o.pt[0] > o.x + W ? o.x + W : o.pt[0], ey = o.y + H / 2, dx = ex - o.pt[0], dy = ey - o.pt[1], len = Math.hypot(dx, dy);
      const ln = el('i', 'intro-lead'); ln.style.left = o.pt[0].toFixed(1) + 'px'; ln.style.top = o.pt[1].toFixed(1) + 'px'; ln.style.width = len.toFixed(1) + 'px'; ln.style.transform = 'rotate(' + Math.atan2(dy, dx) + 'rad)';
      tagsBox.insertBefore(ln, tagsBox.firstChild);
    });
    /* "Just look around" at the bottom centre, "I check claims" beside it at the dock, both clear of Replay (left 64, bottom 84) */
    const look = tagEls.find((t) => t.id === 'look'), cl = tagEls.find((t) => t.id === 'claims');
    if (look) { look.b.style.left = (innerWidth / 2 - W / 2).toFixed(0) + 'px'; look.b.style.top = (innerHeight - 140 - H).toFixed(0) + 'px'; }
    if (cl) { cl.b.style.left = (innerWidth / 2 + W / 2 + 16).toFixed(0) + 'px'; cl.b.style.top = (innerHeight - 140 - 44).toFixed(0) + 'px'; }
  }
  function hoverRole(id) {
    if (phase !== 'hold' && phase !== 'call') return;
    try {
      if (!id || id === 'look' || id === 'claims') { space.light(null); return; }
      if (id === 'curious') { space.light([P.kernel]); space.run(P.kernel, '*', BAR); }
      else if (id === 'builder') { space.light([P.chain]); space.run(P.network, P.chain, BAR); }
      else if (id === 'operator') { space.light([P.network]); }
    } catch (e) {}
  }
  function choose(id) {
    if (phase === 'answer' || phase === 'gone') return; phase = 'answer';
    steps([{ at: 0, pulse: placeOf(id) ? [placeOf(id)] : [] }]);
    keep(id);
    tagEls.forEach((t) => { if (t.id !== id) t.b.classList.add('wipe'); });
    later(BAR / 2, () => handOver(id));
  }
  function keep(id) {
    const v = { role: null, done: [], skipped: false };
    if (id === 'look' || id === 'claims') v.skipped = true; else v.role = id;
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {}
    window.dispatchEvent(new CustomEvent('ark-quest-change'));
  }
  function handOver(id) {
    hideAll(); phase = 'gone'; root.hidden = true;
    document.documentElement.classList.remove('intro-on', 'intro-picker');
    window.dispatchEvent(new CustomEvent('ark-intro-state', { detail: { playing: false, done: true } }));
    const page = id === 'claims' ? 'stats/now' : 'zero';   /* "I check claims" opens Network stats; every other press opens home in the same world */
    if (window.ArkUI && ArkUI.pageRouter && ArkUI.pageCatalog && ArkUI.pageCatalog[page]) ArkUI.pageRouter.navigate(page);
  }

  function hideAll(keepRoot) {
    clearTimers(); anims = []; clearStage(); who.hidden = true; tagsBox.hidden = true; tagsBox.replaceChildren(); tagEls = [];
    text.textContent = ''; text.style.cssText = ''; sub.hidden = true; no.hidden = true; card.classList.remove('on'); card.style.clipPath = '';
    if (!keepRoot) { skip.hidden = true; reh.hidden = true; }
  }
  function finishQuiet() { hideAll(); root.hidden = true; document.documentElement.classList.remove('intro-on', 'intro-picker'); window.dispatchEvent(new CustomEvent('ark-intro-state', { detail: { playing: false, done: true } })); }

  /* Skip and Esc: to beat 7 in one flight. On beat 7 they are "Just look around" */
  function skipNow() { if (root.hidden) return; if (shot === 7) { if (phase !== 'answer' && phase !== 'gone') choose('look'); return; } hideAll(true); shot7(false); }
  skip.addEventListener('click', skipNow);
  const onKey = (e) => {
    if (root.hidden) return;
    if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); skipNow(); return; }
    const t = e.target;
    if (t && (t.tagName === 'BUTTON' || t === track || t.tagName === 'INPUT')) return;
    if (e.key === 'Enter' && phase === 'hold') { e.preventDefault(); if (cur.chip) cur.chip.onPress(); else if (shot === 3) pay(); }
    if ((e.key === '-' || e.key === '_') && shot === 5 && phase === 'hold') { e.preventDefault(); copies(); }
  };
  addEventListener('keydown', onKey, true); stops.push(() => removeEventListener('keydown', onKey, true));

  /* tap = press: a click near the chip's subject (its screen radius or 44 px, whichever is larger) presses. A drag never does */
  let down = null;
  const onDown = (e) => { down = { x: e.clientX, y: e.clientY }; };
  const onUp = (e) => {
    if (!down || root.hidden || phase !== 'hold' || !cur.chip || typeof cur.chip.anchor === 'function' || e.target.tagName !== 'CANVAS') { down = null; return; }
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
    if (moved > 6) return;
    const s = space.screenOf(cur.chip.anchor); if (!s) return;
    const c = [s[0] + (phone() ? 0 : cur.chip.dx * 0.6), s[1] + (phone() ? 0 : cur.chip.dy * -0.4)];
    if (Math.hypot(e.clientX - c[0], e.clientY - c[1]) <= 44 * (phone() ? 1.5 : 2)) cur.chip.onPress();
  };
  addEventListener('pointerdown', onDown, true); addEventListener('pointerup', onUp, true);
  stops.push(() => { removeEventListener('pointerdown', onDown, true); removeEventListener('pointerup', onUp, true); });

  const relayout = () => { positionChip(); if (shot === 7) layoutTags(); };
  stops.push(space.on('camera', relayout));
  addEventListener('resize', relayout); stops.push(() => removeEventListener('resize', relayout));

  /* ---------- when it plays ---------- */
  function start(replay) {
    if (started && !replay) return; started = true; played = true;
    hideAll(true); clearTimers();
    if (reduced) document.documentElement.classList.add('intro-still');
    b1();
  }
  function standing() { if (!P) P = places(); if (!P) return; hideAll(true); started = true; stand = []; shot7(true); }
  function arrive() {
    if (pageNow() !== 'intro') return;
    const f = space.film && space.film();
    if (f && f.playing) return;   /* today's film plays first until lane 1 retires it */
    if (!root.hidden && shot >= 1 && shot <= 6) return;   /* a beat is playing: nothing restarts it */
    if (!played && loadedOnIntro) start(); else if (root.hidden || shot !== 7) standing();
  }
  addEventListener('ark-intro-mount', (e) => { const d = e.detail || {}; loadedOnIntro = !!d.wanted; if (space.ready) arrive(); });
  space.whenReady(() => {
    loadedOnIntro = !!(window.ArkUI && ArkUI.introPage && ArkUI.introPage.wanted ? ArkUI.introPage.wanted() : pageNow() === 'intro');
    stops.push(space.on('film', (f) => { if (f && !f.playing) arrive(); }));
    arrive();
  });
  if (window.ArkUI && ArkUI.sceneState && ArkUI.sceneState.subscribe) {
    let last = null;
    const off = ArkUI.sceneState.subscribe((s) => {
      if (!s || s.page === last) return; last = s.page;
      if (s.page === 'intro') { if (space.ready) arrive(); }
      else if (!root.hidden && phase !== 'gone') { hideAll(); root.hidden = true; document.documentElement.classList.remove('intro-on', 'intro-picker'); window.dispatchEvent(new CustomEvent('ark-intro-state', { detail: { playing: false, done: true } })); }
    });
    if (typeof off === 'function') stops.push(off);
  }
  /* Replay intro (the dock chip) plays beat 1 again; "Pick your path" and the Missions chip stand beat 7, from any page */
  const onReplay = () => {
    const f = space.film && space.film(); if (f && f.playing) { played = false; loadedOnIntro = true; return; }   /* the film ends first, then beat 1 plays */
    if (pageNow() === 'intro') { P = null; start(true); } else if (window.ArkUI && ArkUI.pageRouter) ArkUI.pageRouter.navigate('intro');
  };
  const onPicker = () => {
    const go = () => { if (!P) P = places(); standing(); };
    if (pageNow() === 'intro') go(); else if (window.ArkUI && ArkUI.pageRouter) Promise.resolve(ArkUI.pageRouter.navigate('intro')).then(() => setTimeout(go, 50));
  };
  addEventListener('ark-intro-replay', onReplay); addEventListener('ark-intro-picker', onPicker); addEventListener('ark-quest-open', onPicker);
  stops.push(() => { removeEventListener('ark-intro-replay', onReplay); removeEventListener('ark-intro-picker', onPicker); removeEventListener('ark-quest-open', onPicker); });

  return () => { stops.forEach((fn) => { try { fn(); } catch (e) {} }); hideAll(); document.documentElement.classList.remove('intro-on', 'intro-picker'); root.remove(); };
}
