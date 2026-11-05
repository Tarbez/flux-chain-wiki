// The hover label (docs/design/space/SPACE.md, part "label"). Layer: app (the defxn site).
// On a `hover` event it names the place beside its point on screen: the name, its one line, and for a visitor's first three
// labels a hint that a click flies there. It reads only ArkSpace (hover, focus, film, camera, screenOf) and owns no control.

import { rects, covers } from './panels.mjs';

const OFFSET = 14;            // px up-right of the place's point, flipped near an edge
const EDGE = 8;               // px the label keeps from the viewport's edge
const HINT = 'Click to fly';
const HINT_SHOWS = 3;         // the hint stops once a visitor has seen this many labels
const SEEN_KEY = 'defxn.space.label.seen';

// The count lives in localStorage, which can throw (private window, blocked site data); then the hint simply shows.
function seenCount() { try { return Number(localStorage.getItem(SEEN_KEY)) || 0; } catch { return 0; } }
function countSeen(n) { try { localStorage.setItem(SEEN_KEY, String(n)); } catch { /* storage refused: count stays in memory */ } }

export function mount(space, host) {
  const root = document.createElement('div');
  root.className = 'space-label';
  root.hidden = true;
  root.setAttribute('aria-hidden', 'true'); // the keys part carries the screen-reader list; this repeats the pointer only
  const lead = document.createElement('div'); lead.className = 'space-label-lead';
  const box = document.createElement('div'); box.className = 'space-label-box';
  const nameEl = document.createElement('b'); nameEl.className = 'space-label-name';
  const lineEl = document.createElement('span'); lineEl.className = 'space-label-line';
  const hintEl = document.createElement('span'); hintEl.className = 'space-label-hint';
  box.append(nameEl, lineEl, hintEl);
  root.append(lead, box);
  host.append(root);

  let place = null, filming = false, frame = 0, seen = seenCount();

  function wanted() { return place && !filming && space.focused() !== place.id; }
  function hide() { root.classList.remove('on'); } // opacity fades it out; hidden is only the state before the first label

  function place_() {
    frame = 0;
    if (!wanted()) return hide();
    const at = space.screenOf(place.id);
    if (!at) return hide();
    const [x, y] = at;
    root.hidden = false;
    const w = box.offsetWidth, h = box.offsetHeight, vw = innerWidth, vh = innerHeight;
    const dx = x + OFFSET + w + EDGE > vw ? -1 : 1;   // flip left near the right edge
    const dy = y - OFFSET - h - EDGE < 0 ? 1 : -1;    // flip down near the top edge
    const left = Math.min(Math.max(dx > 0 ? x + OFFSET : x - OFFSET - w, EDGE), vw - w - EDGE);
    const top = Math.min(Math.max(dy < 0 ? y - OFFSET - h : y + OFFSET, EDGE), vh - h - EDGE);
    if (covers(rects(), [left, top, left + w, top + h])) return hide();   // never on a page panel (js/space/panels.mjs)
    box.style.transform = `translate(${left}px, ${top}px)`;
    lead.style.height = `${OFFSET * Math.SQRT2}px`;
    lead.style.transform = `translate(${x}px, ${y}px) rotate(${Math.atan2(-dx, dy)}rad)`;
    root.classList.add('on');
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(place_); }

  function onHover(p) {
    if (place && p && place.id === p.id) return;
    place = p || null;
    if (!place) { hide(); return; }
    nameEl.textContent = place.name || '';
    nameEl.style.setProperty('--label-ink', place.kind === 'network' && place.token ? `var(${place.token})` : 'var(--primary)');
    lineEl.textContent = place.line || '';
    const counts = wanted();
    hintEl.textContent = counts && seen < HINT_SHOWS ? HINT : '';
    if (counts && seen < HINT_SHOWS) countSeen(++seen);
    schedule();
  }

  const stops = [
    space.on('hover', onHover),
    space.on('camera', schedule),
    space.on('focus', schedule),
    space.on('film', (f) => { filming = !!(f && f.playing); schedule(); }),
  ];

  return function unmount() {
    stops.forEach((stop) => stop());
    if (frame) cancelAnimationFrame(frame);
    root.remove();
  };
}
