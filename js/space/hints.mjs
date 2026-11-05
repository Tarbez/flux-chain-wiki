// hints: first-visit coaching for the space. Three hints, one at a time, each gone once the visitor does it.
// Layer: app (defxn site). Talks to the core only through ArkSpace (docs/design/space/SPACE.md).

const STORE = 'defxn-space-hints-v1';
const IDLE_MS = 1200;      // quiet time before a hint shows, and the gap between hints
const ESC_MS = 8000;       // the Esc hint retires itself: it is the one a visitor may never need
const TURN_DEG = 10;       // yaw change that counts as having looked around

const HINTS = [
  { id: 'click', text: 'Click a network to fly to it.' },
  { id: 'drag', text: 'Drag to look around.' },
  { id: 'esc', text: 'Press Esc to go back.' },
];

function finished() {
  try { return localStorage.getItem(STORE) === 'done'; } catch { return false; } // storage blocked: show hints this visit
}
function remember() {
  try { localStorage.setItem(STORE, 'done'); } catch { /* storage blocked: hints return next visit */ }
}
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// a higher level is the grid (null) or the place's own parent
function isBack(prev, next) {
  if (!prev) return false;
  if (!next) return true;
  const p = prev && typeof prev === 'object' ? prev : null;
  return !!p && p.parent === next.id;
}

export function mount(space, host) {
  if (!space || !host) throw new Error('hints.mount needs ArkSpace and a host element: nothing to coach without both');
  if (finished()) return () => {};

  const root = document.createElement('div');
  root.className = 'sp-hints';
  root.hidden = true;
  if (reduced()) root.classList.add('sp-hints--still');
  root.innerHTML = '<svg class="sp-hints__line" aria-hidden="true"><line x1="0" y1="0" x2="0" y2="0"/></svg>'
    + '<div class="sp-hints__pill" role="status" aria-live="polite"><span class="sp-hints__text"></span>'
    + '<button type="button" class="sp-hints__close" aria-label="Hide hints">×</button></div>';
  host.appendChild(root);
  const pill = root.querySelector('.sp-hints__pill');
  const text = root.querySelector('.sp-hints__text');
  const svg = root.querySelector('.sp-hints__line');
  const line = svg.querySelector('line');

  let step = 0, shown = false, filmDone = false, yaw0 = null, yaw = 0, idle = 0, escTimer = 0;
  let lastFocus = space.focused() ? space.target(space.focused()) : null;
  const offs = [];

  const lifted = () => root.classList.toggle('sp-hints--lifted', !!space.focused());

  function hide() {
    shown = false;
    pill.classList.remove('is-on');
    svg.classList.remove('is-on');
    clearTimeout(escTimer);
  }
  function schedule() {
    clearTimeout(idle);
    if (!filmDone || step >= HINTS.length) return;
    if (shown) return;
    idle = setTimeout(show, IDLE_MS);
  }
  function show() {
    if (!filmDone || step >= HINTS.length) return;
    text.textContent = HINTS[step].text;
    root.hidden = false;
    lifted();
    shown = true;
    pill.classList.add('is-on');
    if (HINTS[step].id === 'drag') yaw0 = yaw;
    if (HINTS[step].id === 'esc') escTimer = setTimeout(() => done('esc'), ESC_MS);
    pointLine();
  }
  function done(id) {
    if (HINTS[step]?.id !== id) return;
    hide();
    step += 1;
    if (step >= HINTS.length) { remember(); return; }
    schedule();
  }
  function endAll() {
    hide();
    step = HINTS.length;
    remember();
    root.hidden = true;
  }

  // the line runs from the pill to the nearest network on screen; none on screen, no line
  function pointLine() {
    if (!shown || HINTS[step]?.id !== 'click') { svg.classList.remove('is-on'); return; }
    const r = pill.getBoundingClientRect();
    const h = host.getBoundingClientRect();
    const ox = r.left + r.width / 2 - h.left, oy = r.top - h.top;
    let best = null, bestD = Infinity;
    for (const t of space.targets()) {
      if (t.kind !== 'network') continue;
      const s = space.screenOf(t.id);
      if (!s) continue;
      const d = Math.hypot(s[0] - h.left - ox, s[1] - h.top - oy);
      if (d < bestD) { bestD = d; best = s; }
    }
    if (!best) { svg.classList.remove('is-on'); return; }
    line.setAttribute('x1', ox); line.setAttribute('y1', oy);
    line.setAttribute('x2', best[0] - h.left); line.setAttribute('y2', best[1] - h.top);
    svg.classList.add('is-on');
  }

  pill.querySelector('.sp-hints__close').addEventListener('click', endAll);

  offs.push(space.on('film', (f) => {
    if (f && f.playing) { filmDone = false; clearTimeout(idle); hide(); root.hidden = true; return; }
    if (f && f.done) { filmDone = true; schedule(); }
  }));
  offs.push(space.on('focus', (place) => {
    const prev = lastFocus;
    lastFocus = place;
    lifted();
    if (place && place.kind === 'network') done('click');
    if (isBack(prev, place)) done('esc');
    schedule();
  }));
  offs.push(space.on('camera', (c) => {
    if (!c) return;
    yaw = c.yaw;
    if (shown && HINTS[step]?.id === 'drag' && yaw0 !== null) {
      const d = Math.abs(((c.yaw - yaw0) % 360 + 540) % 360 - 180);
      if (d > TURN_DEG) done('drag');
    }
    pointLine();
    if (!shown) schedule(); // movement is activity: the quiet wait starts over
  }));

  return function unmount() {
    clearTimeout(idle); clearTimeout(escTimer);
    for (const off of offs) { try { off(); } catch { /* listener already gone: nothing to stop */ } }
    root.remove();
  };
}
