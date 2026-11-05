// keys: keyboard and screen-reader movement through the space (app layer, the defxn site).
// Contract: docs/design/space/SPACE.md. Talks to the core only through the `space` (ArkSpace) handed to mount().

// The keys a visitor reads in the legend. Short constants, one key per row.
const LEGEND = [
  ['Arrows', 'Move to a neighbour'],
  ['Enter', 'Open its page'],
  ['Esc', 'Go back one level'],
  ['Home', 'Show the whole grid'],
  ['[ ]', 'Turn the view'],
  ['- =', 'Zoom out, zoom in'],
];
// An arrow picks the nearest place within this many degrees of its direction; wider cones jump sideways.
const CONE_DEG = 60;
const ARROWS = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

// Typing in a field, an open dialog, or the intro film all own the keyboard; keys must not steal it.
function keysBelongElsewhere(ev, filmPlaying) {
  if (filmPlaying) return true;
  const el = ev.target;
  if (el && el.closest && el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return true;
  return !!document.querySelector('dialog[open], [role="dialog"]:not([hidden]), [aria-modal="true"]:not([hidden])');
}

// Places an arrow may reach from the focus: its parent, siblings and children; on the grid, the kernel and the networks.
function candidates(space) {
  const id = space.focused();
  if (id == null) return space.targets().filter((t) => t.kind === 'network' || t.kind === 'kernel').map((t) => t.id);
  const me = space.target(id);
  if (!me) return [];
  const ids = new Set(me.children || []);
  if (me.parent) {
    ids.add(me.parent);
    const p = space.target(me.parent);
    for (const s of (p && p.children) || []) ids.add(s);
  }
  ids.delete(id);
  return [...ids];
}

// The nearest on-screen candidate inside the arrow's cone, or null when none stands that way.
function neighbour(space, dir) {
  const id = space.focused();
  const from = (id != null && space.screenOf(id)) || [innerWidth / 2, innerHeight / 2];
  const cos = Math.cos((CONE_DEG * Math.PI) / 180);
  let best = null, bestD = Infinity;
  for (const c of candidates(space)) {
    const at = space.screenOf(c);
    if (!at) continue;
    const dx = at[0] - from[0], dy = at[1] - from[1], d = Math.hypot(dx, dy);
    if (d < 1 || (dx * dir[0] + dy * dir[1]) / d < cos) continue;
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

function el(tag, attrs = {}, text) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

export function mount(space, host) {
  let filmPlaying = false;
  const offs = [];
  const root = el('div', { class: 'space-keys' });

  // The screen-reader list of places, nested by parent.
  const nav = el('nav', { class: 'space-keys-sr', 'aria-label': 'Places' });
  const live = el('div', { class: 'space-keys-sr', 'aria-live': 'polite', role: 'status' });
  let signature = '';
  function rebuildList() {
    const all = space.targets();
    const sig = all.map((t) => `${t.id}|${t.name}|${t.parent}`).join('\n');
    if (sig === signature) return;
    signature = sig;
    const byParent = new Map();
    for (const t of all) {
      const k = t.parent && space.target(t.parent) ? t.parent : null;
      if (!byParent.has(k)) byParent.set(k, []);
      byParent.get(k).push(t);
    }
    const build = (pid) => {
      const kids = byParent.get(pid);
      if (!kids) return null;
      const ul = el('ul');
      for (const t of kids) {
        const li = el('li');
        const b = el('button', { type: 'button', 'data-id': t.id }, t.name);
        b.addEventListener('click', () => space.focus(t.id));
        li.append(b);
        const sub = build(t.id);
        if (sub) li.append(sub);
        ul.append(li);
      }
      return ul;
    };
    nav.replaceChildren(build(null) || '');
  }

  // The legend: a ? button and a popover of the keys.
  const legendBtn = el('button', { type: 'button', class: 'space-keys-btn', 'aria-expanded': 'false', 'aria-controls': 'space-keys-pop', 'aria-label': 'Keyboard keys' }, '?');
  const pop = el('div', { class: 'space-keys-pop', id: 'space-keys-pop', hidden: '' });
  const dl = el('dl');
  for (const [k, what] of LEGEND) dl.append(el('dt', {}, k), el('dd', {}, what));
  pop.append(dl);
  const setPop = (open) => { pop.hidden = !open; legendBtn.setAttribute('aria-expanded', String(open)); };
  legendBtn.addEventListener('click', () => setPop(pop.hidden));

  root.append(nav, live, legendBtn, pop);
  host.append(root);

  const onDocDown = (ev) => { if (!pop.hidden && !root.contains(ev.target)) setPop(false); };
  document.addEventListener('pointerdown', onDocDown, true);

  const onKey = (ev) => {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (ev.key === 'Escape' && !pop.hidden) { setPop(false); legendBtn.focus(); ev.preventDefault(); return; }
    if (keysBelongElsewhere(ev, filmPlaying)) return;
    const dir = ARROWS[ev.key];
    if (dir) {
      const next = neighbour(space, dir);
      if (next) space.focus(next);
      ev.preventDefault();
      return;
    }
    // Enter on a focused button belongs to that button, so the space opens only when no control has focus.
    const onControl = ev.target && ev.target.closest && ev.target.closest('button, a, [role="button"]');
    switch (ev.key) {
      case 'Enter': if (onControl) return; { const id = space.focused(); if (id != null) space.open(id); } break;
      case 'Escape': space.back(); break;
      case 'Home': space.focus(null); break;
      case '[': space.orbit(-15, 0); break;
      case ']': space.orbit(15, 0); break;
      case '-': space.zoom(1.15); break;
      case '=': space.zoom(0.87); break;
      default: return;
    }
    ev.preventDefault();
  };
  document.addEventListener('keydown', onKey);

  offs.push(space.on('film', (f) => {
    filmPlaying = !!(f && f.playing);
    root.hidden = filmPlaying;
    if (filmPlaying) setPop(false);
  }));
  // The contract has no "targets changed" event, so the list re-checks its signature whenever the focus moves.
  offs.push(space.on('focus', rebuildList));
  offs.push(space.on('arrive', (p) => {
    rebuildList();
    live.textContent = p ? (p.line ? `${p.name}. ${p.line}` : p.name) : 'The whole grid.';
  }));
  space.whenReady(rebuildList);

  return function unmount() {
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('pointerdown', onDocDown, true);
    for (const off of offs) { try { off(); } catch { /* listener already gone: nothing left to stop */ } }
    root.remove();
  };
}
