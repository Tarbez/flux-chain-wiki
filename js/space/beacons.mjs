/* Beacons: the options a visitor can click, always shown (owner, 2026-11-05: "the user is now lost ... where are the options to click?",
   "every click should animate and help the user"). Layer: app. A part of the space (docs/design/space/SPACE.md).

   - A tag floats over every place the visitor can go from where they are: on the grid the kernel and the networks; on a network its
     chains, its neighbours and the kernel; on a chain its siblings and its network. Each tag is a button: pointing lights the place,
     a click flies there.
   - The current mission's target (the quest part sends it: window event 'ark-quest-target' { kind } ) wears a bobbing "Click here".
   - Every click on the world shows a ripple where it landed, so a click always answers.
   Tags are placed with screenOf on every camera frame (one update per animation frame) and hidden while the film plays. */

import { rects, covers } from './panels.mjs';

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

export function mount(space, host) {
  const root = el('div', 'beacons'); host.appendChild(root);
  const ripples = el('div', 'beacon-ripples'); host.appendChild(ripples);
  let tags = new Map(), want = null, film = false, raf = 0, focus = null;
  const stops = [];

  /* the places reachable from here */
  function reachable() {
    const all = space.targets(), byId = new Map(all.map((t) => [t.id, t]));
    if (!focus) return all.filter((t) => t.kind !== 'chain');
    const f = byId.get(focus); if (!f) return [];
    const ids = new Set();
    if (f.kind === 'kernel') all.filter((t) => t.kind === 'network').forEach((t) => ids.add(t.id));
    if (f.kind === 'network') { f.children.forEach((c) => ids.add(c)); all.filter((t) => t.kind === 'network' && t.id !== f.id).forEach((t) => ids.add(t.id)); ids.add('kernel'); }
    if (f.kind === 'chain') { const p = byId.get(f.parent); if (p) { ids.add(p.id); p.children.forEach((c) => { if (c !== f.id) ids.add(c); }); } }
    return [...ids].map((id) => byId.get(id)).filter(Boolean);
  }
  function build() {
    const list = reachable(), keep = new Set(list.map((t) => t.id));
    tags.forEach((b, id) => { if (!keep.has(id)) { b.remove(); tags.delete(id); } });
    list.forEach((t) => {
      if (tags.has(t.id)) return;
      const b = el('button', 'beacon beacon-' + t.kind); b.type = 'button'; b.dataset.kind = t.kind;
      b.style.setProperty('--tok', 'var(' + (t.token || '--primary') + ')');
      b.appendChild(el('i', 'beacon-dot'));
      b.appendChild(el('span', 'beacon-name', t.short || t.name));
      b.appendChild(el('em', 'beacon-here', 'Click here'));
      b.setAttribute('aria-label', 'Fly to ' + t.name);
      b.addEventListener('pointerenter', () => space.hover(t.id));
      b.addEventListener('pointerleave', () => space.hover(null));
      b.addEventListener('click', (e) => { ripple(e.clientX, e.clientY); space.focus(t.id); });
      root.appendChild(b); tags.set(t.id, b);
    });
    mark(); place();
  }
  /* the mission's target: the nearest reachable place of the wanted kind wears "Click here" */
  function mark() {
    let pick = null;
    if (want) {
      const cands = reachable().filter((t) => t.kind === want);
      pick = cands[0] ? cands[0].id : null;
    }
    tags.forEach((b, id) => b.classList.toggle('is-target', id === pick));
  }
  function place() {
    raf = 0;
    /* a page with no HUD panel is a page of text (the 404, a notice): its words fill the middle, so it shows no tags at all */
    const textPage = !document.querySelector('.hud-left, .hud-right, .hud-dock');
    root.classList.toggle('hidden', film || textPage);
    if (film || textPage) return;
    /* a place off screen keeps its tag on the screen's edge, with an arrow toward it, so an option is never out of reach */
    const L = 90, T = 130, Rr = innerWidth - 90, B = innerHeight - 110, cx = innerWidth / 2, cy = innerHeight / 2;
    /* a tag never sits on a page panel (js/space/panels.mjs), nor on another tag: tags are laid in rank order, the mission's target
       first, then the kernel, the networks, the chains, and a tag that would meet one already laid hides (owner, 2026-11-05: two
       "IDENTITY CHAIN" tags on top of each other) */
    const panels = rects(), laid = [];
    const RANK = { kernel: 1, network: 2, chain: 3 };
    const rank = (b) => b.classList.contains('is-target') ? 0 : RANK[b.dataset.kind] || 4;
    [...tags.entries()].sort((a, b) => rank(a[1]) - rank(b[1])).forEach(([id, b]) => {
      const p = space.screenOf(id);
      if (!p) { b.style.visibility = 'hidden'; return; }
      let x = p[0], y = p[1], edge = '';
      if (x < L || x > Rr || y < T || y > B) {
        /* along the line from the middle of the screen toward the place, stop at the edge box */
        const dx = x - cx, dy = y - cy, k = Math.min(dx ? Math.abs(((dx > 0 ? Rr : L) - cx) / dx) : Infinity, dy ? Math.abs(((dy > 0 ? B : T) - cy) / dy) : Infinity, 1);
        x = cx + dx * k; y = cy + dy * k;
        edge = Math.abs(dx) * (B - T) > Math.abs(dy) * (Rr - L) ? (dx > 0 ? '→' : '←') : (dy > 0 ? '↓' : '↑');
      }
      const w = b.offsetWidth || 120, h = b.offsetHeight || 24;
      x = Math.max(w / 2 + 10, Math.min(innerWidth - w / 2 - 10, x));
      /* the tag's own box: centred on x, its foot 34px above the point (css/space/beacons.css margin-top) */
      const box = [x - w / 2, y - 34, x + w / 2, y - 34 + h];
      if (covers(panels, box) || covers(laid, box, 4)) { b.style.visibility = 'hidden'; return; }
      laid.push({ left: box[0], top: box[1], right: box[2], bottom: box[3] });
      b.style.visibility = ''; b.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
      b.classList.toggle('is-edge', !!edge); b.dataset.edge = edge;
    });
  }
  const soon = () => { if (!raf) raf = requestAnimationFrame(place); };

  /* a ripple wherever the world is clicked */
  function ripple(x, y) {
    const r = el('i', 'beacon-ripple'); r.style.left = x + 'px'; r.style.top = y + 'px';
    ripples.appendChild(r); setTimeout(() => r.remove(), 700);
  }
  const onDown = (e) => {
    if (film || e.button !== 0) return;
    const t = e.target;
    if (t && t.closest && t.closest('a,button,input,select,textarea,label,[role="dialog"],[data-ui],.quest,.beacons')) return;
    ripple(e.clientX, e.clientY);
  };
  window.addEventListener('pointerdown', onDown, { passive: true });
  const onTarget = (e) => { want = e.detail && e.detail.kind || null; mark(); };
  window.addEventListener('ark-quest-target', onTarget);

  stops.push(space.on('targets', () => build()));
  stops.push(space.on('focus', (t) => { focus = t ? t.id : null; build(); }));
  stops.push(space.on('camera', soon));
  stops.push(space.on('film', (f) => { film = !!(f && f.playing); soon(); }));
  addEventListener('resize', soon);
  space.whenReady(() => { focus = space.focused(); build(); });

  return () => {
    stops.forEach((fn) => { try { fn(); } catch (e) {} });
    window.removeEventListener('pointerdown', onDown); window.removeEventListener('ark-quest-target', onTarget); removeEventListener('resize', soon);
    if (raf) cancelAnimationFrame(raf); root.remove(); ripples.remove();
  };
}
