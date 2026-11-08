/* Cinematic journeys: a role's short camera trip through the real grid (docs/design/space/SPACE.md "Cinematic journeys: style guide and shot list"). Layer: app.
   A part of the space: it talks only through ArkSpace. The role's beats live in js/space/cinematic/<id>.mjs (one default object); a missing file shows nothing.
   The camera, lights, pulses, runs and spares are played by the core's show (space.play); the type is this part's own, in the DOM.
   Time is the one motion clock (fxn-3d engine/runtime/motion-clock.mjs) on a 120 BPM grid: a beat is 0.5 s, a bar is 2 s. Type moves are closed-form springs of time, drawn by one
   clock subscriber that runs only while the trip plays. The trip never opens a page: Continue is the one way to the end page.
   The visitor wins: a drag, a zoom or a click on a place stops it. Skip and Esc go to the role's end. The trip never ticks a mission. */

const base = (location.protocol === 'file:' ? '' : '/');
const BEAT = 0.5;            /* 120 BPM */
const OPEN = 0;              /* no title before the first move: the word plays inside it */
const FIRST = 2;             /* seconds the camera takes to reach the first waypoint (the hook lands at bar 2) */
const STILL = 4;             /* seconds per caption when motion is reduced */
const WORD = 0.06;           /* one word every 60 ms */
const CONTINUE = 'Continue';
/* the house springs (closed form, progress 0 -> 1 in t seconds) and the page's one motion clock, both from fxn-3d engine/runtime through the seam */
import { closed as spring, clockNow, clockSubscribe } from '../world2/world2-gl.mjs';

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

/* a beat's `pick` becomes a real place id; null when no such place exists (the beat is then skipped, never faked) */
function resolve(space, beats) {
  const all = space.targets(), got = {}, out = [];
  let prev = null, lit = [];
  beats.forEach((b) => {
    let id = null;
    if (b.pick) {
      let pool = all.filter((t) => t.kind === b.pick.kind);
      if (b.pick.parentOf) { if (!got[b.pick.parentOf]) return; pool = pool.filter((t) => t.parent === got[b.pick.parentOf]); }
      const t = (b.pick.prefer && pool.find((x) => (x.facts || []).some((f) => f.label === 'Kind' && String(f.value).toLowerCase().indexOf(b.pick.prefer) === 0))) || pool[b.pick.index || 0];
      if (!t) return;
      id = got[b.pick.kind] = t.id;
    }
    const before = prev;
    if (id) prev = id;
    const sub = (v) => (v === 'pick' ? id : v === 'prev' ? before : v);
    const s = Object.assign({}, b);
    delete s.pick;
    s.pid = id;
    if (s.shot) s.shot = Object.assign({}, s.shot, { place: sub(s.shot.place) });
    if (s.light) { const l = s.light.map(sub); s.light = b.keep ? lit.concat(l) : l; lit = s.light; delete s.keep; }
    if (s.pulse) s.pulse = s.pulse.map(sub);
    if (s.run) s.run = s.run.map((r) => Object.assign({}, r, { from: sub(r.from), to: sub(r.to) }));
    if (s.spawn) s.spawn = s.spawn.map((p) => Object.assign({}, p, { near: sub(p.near) }));
    if (s.title && typeof s.title === 'object') s.title = Object.assign({}, s.title, { near: sub(s.title.near) });
    else delete s.title;   /* a plain string was the old title card: banned */
    out.push(s);
  });
  return out;
}

/* a count-up's real value and word, from the place's facts: { fact: 'Chains here' } -> [12, 'chains'] */
function countOf(space, b) {
  if (!b.count || !b.count.fact) return null;
  const t = space.targets().find((x) => x.id === b.pid);
  const f = t && (t.facts || []).find((x) => x.label === b.count.fact);
  const v = f ? parseInt(String(f.value).replace(/[^\d]/g, ''), 10) : NaN;
  if (!Number.isFinite(v)) return null;
  return [v, b.count.label || String(b.count.fact).split(' ')[0].toLowerCase()];
}

export function mount(space, host) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = el('div', 'cine'); root.hidden = true; host.appendChild(root);
  const card = el('div', 'cine-card'); card.setAttribute('aria-live', 'polite');
  const no = el('b', 'cine-no'), text = el('p', 'cine-text'), num = el('div', 'cine-num'), go1 = el('button', 'cine-go');
  go1.type = 'button'; go1.hidden = true; no.hidden = true; num.hidden = true;
  card.append(no, text, num, go1);
  const skip = el('button', 'cine-skip', 'Skip'); skip.type = 'button';
  root.append(card, skip);

  let self = false, timers = [], run = 0, active = false, ending = null, filmPlaying = false, unsub = null;
  const stops = [];
  /* animation state, all functions of (now - start) */
  let cnt = null;      /* { start, v, word, dur } a count-up */
  let cap = null;      /* { words, start, exit, id, count, form } */
  let lab = null;      /* { start } the step label's track-in */
  let endA = null;     /* { start } the end lockup */
  let events = [], t0 = 0;
  let pos = { x: 0, y: 0, tx: 0, ty: 0, from: [0, 0], at: 0, set: false };

  const clear = () => { timers.forEach(clearTimeout); timers = []; events = []; };
  /* t0 is this trip's start on the one clock (seconds); a trip's time is the clock less t0 */
  const now = () => clockNow() - t0;

  /* one subscriber on the motion clock while the trip plays; it says it is done when nothing moves, and the clock stops its rAF */
  function tick(c) {
    const t = c - t0;
    while (events.length && events[0].t <= t) events.shift().fn();
    draw(t);
    if (active || endA) return true;
    unsub = null; return false;
  }
  const kick = () => { if (!unsub && !reduced) unsub = clockSubscribe(tick); };
  const halt = () => { if (unsub) unsub(); unsub = null; };

  function draw(t) {
    if (cap) {
      cap.words.forEach((w, i) => {
        const p = spring('type', t - cap.start - i * WORD);
        w.firstChild.style.transform = 'translateY(' + ((1 - p) * 0.6).toFixed(3) + 'em)';
      });
      if (cap.exit != null) {
        const p = spring('type', t - cap.exit);
        text.style.clipPath = 'inset(0 0 ' + (p * 100).toFixed(1) + '% 0)';
        text.style.transform = 'translateY(' + (-p * 0.3).toFixed(3) + 'em)';
        num.style.clipPath = text.style.clipPath;
        if (p > 0.995) { cap.words = []; text.textContent = ''; cnt = null; num.hidden = true; num.style.clipPath = ''; no.hidden = true; card.classList.remove('on'); cap = null; }
      }
    }
    if (cnt) { const p = spring('number', (t - cnt.start) * (0.52 / cnt.dur)); num.hidden = false; num.textContent = Math.round(cnt.v * p) + ' ' + cnt.word; }
    if (lab) no.style.letterSpacing = (0.28 - 0.12 * spring('letter', t - lab.start)).toFixed(4) + 'em';
    if (endA) {
      const p = spring('heavy', t - endA.start);
      text.style.transform = 'scale(' + (1.08 - 0.08 * p).toFixed(4) + ')';
      const q = spring('ui', t - endA.start - 0.5);
      go1.style.transform = 'translateY(' + ((1 - q) * 14).toFixed(2) + 'px)';
      if (p > 0.999 && q > 0.999) endA = null;
    }
    place(t);
  }

  /* the block follows its subject: the emptier half of the screen, a spring toward each new target */
  function place(t) {
    if (!cap || !cap.id || innerWidth < 640 || ending) return;
    const s = space.screenOf(cap.id);
    if (!s) return;
    const w = Math.min(520, innerWidth * 0.45), onLeft = s[0] < innerWidth / 2;
    const tx = onLeft ? innerWidth - w - innerWidth * 0.06 : innerWidth * 0.06, ty = s[1] > innerHeight / 2 ? innerHeight * 0.16 : innerHeight * 0.58;
    if (!pos.set) { pos = { x: tx, y: ty, tx, ty, from: [tx, ty], at: t, set: true }; }
    else if (Math.abs(tx - pos.tx) > 40 || Math.abs(ty - pos.ty) > 40) { pos.from = [pos.x, pos.y]; pos.tx = tx; pos.ty = ty; pos.at = t; }
    const p = spring('type', t - pos.at);
    pos.x = pos.from[0] + (pos.tx - pos.from[0]) * p; pos.y = pos.from[1] + (pos.ty - pos.from[1]) * p;
    card.style.left = pos.x.toFixed(1) + 'px'; card.style.top = pos.y.toFixed(1) + 'px';
    card.style.width = w + 'px';
  }

  function showCaption(b, total, t) {
    const line = b.say || '';
    text.textContent = ''; text.style.clipPath = ''; text.style.transform = ''; num.style.clipPath = ''; num.hidden = true; num.textContent = '';
    const words = line.split(' ').filter(Boolean).map((w, i, a) => { const o = el('span', 'cine-w'), n = el('span', 'cine-wi', w); o.appendChild(n); text.appendChild(o); if (i < a.length - 1) text.appendChild(document.createTextNode(' ')); return o; });
    no.hidden = !b.n; no.textContent = b.n || '';
    cap = { words: reduced ? [] : words, start: t, exit: null, id: b.pid };
    cnt = null;
    if (reduced && b.cnt) { const c = countOf(space, b.cnt); if (c) { num.hidden = false; num.textContent = c[0] + ' ' + c[1]; } }
    if (b.n && !reduced) lab = { start: t }; else lab = null;
    card.classList.add('on');
    kick();
  }
  const exitCaption = (t) => { if (cap) { if (reduced) { cap = null; cnt = null; text.textContent = ''; num.hidden = true; no.hidden = true; card.classList.remove('on'); } else if (cap.exit == null) cap.exit = t; } };

  function stop() {   /* the trip is over: the grid stays where it is */
    run++; clear(); halt(); active = false; cap = null; cnt = null; lab = null; endA = null; window.ArkCinematicActive = false;
    document.documentElement.classList.remove('cinematic-on', 'cinematic-end'); ending = null; skip.hidden = false; root.hidden = true;
    text.textContent = ''; text.style.cssText = ''; num.hidden = true; no.hidden = true; card.classList.remove('on', 'cine-end'); card.style.cssText = ''; go1.hidden = true; go1.style.transform = ''; pos.set = false;
    space.stopShow();
  }
  function finish(role) {   /* the role's end: its lockup at 47 and its one button */
    if (ending) return;
    clear(); space.stopShow(); ending = role; active = false; window.ArkCinematicActive = false;
    const e = role.end || {}, t = reduced ? 0 : now();
    document.documentElement.classList.add('cinematic-end');
    skip.textContent = 'Close';
    text.textContent = ''; text.style.cssText = ''; num.hidden = true; no.hidden = true; card.style.cssText = ''; cap = null; cnt = null; lab = null;
    text.textContent = e.say || '';
    card.classList.add('on', 'cine-end');
    go1.textContent = CONTINUE; go1.hidden = !e.page;
    go1.onclick = () => { const p = e.page; stop(); go(p); };
    if (!reduced) { endA = { start: t }; text.style.transform = 'scale(1.08)'; kick(); }
  }
  /* the end page opens from Continue only: html.cinematic-on stays until that page has landed */
  async function go(page) {
    if (!(window.ArkUI && ArkUI.pageRouter && ArkUI.pageCatalog && ArkUI.pageCatalog[page])) return;
    window.ArkCinematicNav = (window.ArkCinematicNav || 0) + 1;
    try { await ArkUI.pageRouter.navigate(page); } catch (e) {} finally { window.ArkCinematicNav = Math.max(0, (window.ArkCinematicNav || 1) - 1); }
  }

  async function play(id) {
    stop();
    const my = ++run;
    if (filmPlaying) return;
    let role;
    try { role = (await import(base + 'js/space/cinematic/' + id + '.mjs')).default; } catch (e) { return; }   /* no file: nothing plays */
    if (my !== run || !role || !role.beats) return;
    const beats = resolve(space, role.beats);
    if (!beats.length) return;
    active = true; window.ArkCinematicActive = true; document.documentElement.classList.add('cinematic-on'); root.hidden = false; skip.textContent = 'Skip'; go1.hidden = true;
    const total = beats.filter((b) => b.n).length, steps = [], way = [], lead = OPEN;
    const end = Math.min(role.seconds || 24, 30) + lead;
    t0 = clockNow();
    let shown = 0;
    beats.forEach((b, i) => {
      const at = reduced ? shown * STILL : (b.at || 0) + lead;
      const next = beats.slice(i + 1).find((x) => x.shot && x.shot.place), nextAt = next ? (next.at || 0) + lead : end;
      if (b.say) {
        if (reduced) { const cb = beats.find((x) => x.count && x.at >= (b.at || 0) && x.at <= (b.out != null ? b.out : (b.at || 0) + 3)); const bb = cb ? Object.assign({}, b, { cnt: cb }) : b; timers.push(setTimeout(() => { if (my === run && !ending) { showCaption(bb, total, 0); } }, at * 1000)); }
        else {
          /* in: after its move has started (at least .25 s, default half a beat). out: at least 1 s before the next move */
          const tin = Math.max(at + 0.25, at);
          const tout = Math.max(tin + 1, Math.min(b.out != null ? b.out + lead : tin + 3, nextAt - 1.0));
          events.push({ t: tin, fn: () => showCaption(b, total, now()) }, { t: tout, fn: () => exitCaption(now()) });
        }
        shown++;
      }
      if (b.count && !b.say && !reduced) {
        const c = countOf(space, b);
        if (c) events.push({ t: at, fn: () => { cnt = { start: now(), v: c[0], word: c[1], dur: Math.max(0.25, (b.count.to != null ? b.count.to + lead : at + 1) - at) }; kick(); } });
      }
      const s = Object.assign({}, b, { at }); delete s.say; delete s.n; delete s.page; delete s.count; delete s.pid; delete s.prefer; delete s.in; delete s.out;
      if (!reduced && b.shot && b.shot.place === 'hero' && !(b.at > 0)) delete s.shot;   /* the camera is already at the hero pose: no waypoint, so it moves from 0 s */
      else if (!reduced && b.shot && b.shot.place) { way.push({ at: Math.max(at - lead, way.length ? 0 : FIRST), shot: b.shot }); delete s.shot; }
      if (s.shot !== undefined || s.light || s.spawn || s.clear || s.pulse || s.run || s.title) steps.push(s);
    });
    events.sort((a, b) => a.t - b.t);
    if (way.length) steps.push({ at: lead, path: way.map((w) => ({ at: w.at, shot: w.shot })) });
    /* pulse, run and title are played by the world steps of js/world2; a missing step must not stop the trip */
    try { if (steps.length) space.play({ id: 'cinematic-' + role.id, steps }); } catch (e) {}
    root.role = role;
    if (reduced) timers.push(setTimeout(() => finish(role), (shown * STILL + 2) * 1000));
    else { events.push({ t: end, fn: () => finish(role) }); kick(); }
    events.sort((a, b) => a.t - b.t);
  }

  skip.addEventListener('click', () => { if (ending) stop(); else if (active) finish(root.role); });
  stops.push((() => { const k = (e) => { if (e.key === 'Escape' && !root.hidden) { e.stopPropagation(); e.preventDefault(); if (ending) stop(); else finish(root.role); } }; addEventListener('keydown', k, true); return () => removeEventListener('keydown', k, true); })());
  stops.push(space.on('focus', () => { if (active && !self) stop(); }));
  const own = (e) => root.contains(e.target);
  const win = (e) => { if (active && !ending && !own(e) && (e.type === 'wheel' || (e.target && e.target.tagName === 'CANVAS'))) stop(); };
  ['pointerdown', 'wheel'].forEach((n) => { addEventListener(n, win, { capture: true, passive: true }); stops.push(() => removeEventListener(n, win, { capture: true })); });
  stops.push(space.on('film', (f) => { filmPlaying = !!(f && f.playing); if (filmPlaying && active) stop(); }));
  const onPlay = (e) => { if (e.detail && e.detail.role) play(e.detail.role); };
  addEventListener('ark-cinematic-play', onPlay); stops.push(() => removeEventListener('ark-cinematic-play', onPlay));

  return () => { stops.forEach((fn) => { try { fn(); } catch (e) {} }); stop(); root.remove(); };
}
