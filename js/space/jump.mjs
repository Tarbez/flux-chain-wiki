// jump: the find-a-place palette of the space (layer: app, the defxn site).
// Press "/" or Cmd/Ctrl+K, type part of a name, Enter flies there. Contract: docs/design/space/SPACE.md.
// Talks to the core only through ArkSpace (targets, focus, open, hover, on('film')).

const MAX_RESULTS = 8;
// Kind order: networks first because an empty query shows them first (the brief), then chains, then the kernel.
const KIND_ORDER = { network: 0, chain: 1, kernel: 2 };
const KIND_HEADING = { network: 'Networks', chain: 'Chains', kernel: 'Kernel' };
const PLACEHOLDER = 'Find a network or chain';

let seq = 0;

// Initials of a name's words ("FXN · The first chain" -> "ftfc"), so "tfc" or "fx" both find it.
function initialsOf(text) {
  return String(text).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean).map((w) => w[0]).join('');
}

// Score a place against the query: lower is better, null means no match.
// Order: name starts with it, name contains it, initials contain it, kind contains it.
function scoreOf(place, q) {
  const name = String(place.name || '').toLowerCase();
  if (name.startsWith(q)) return 0;
  if (name.includes(q)) return 1;
  if (initialsOf(name).includes(q.replace(/\s+/g, ''))) return 2;
  if (String(place.kind || '').toLowerCase().includes(q)) return 3;
  return null;
}

function pick(places, query) {
  const q = query.trim().toLowerCase();
  const scored = [];
  for (const p of places) {
    const s = q ? scoreOf(p, q) : 0;
    if (s !== null) scored.push({ p, s });
  }
  // With no query, kind order decides first; with a query, match quality decides first.
  scored.sort((a, b) => {
    const ka = KIND_ORDER[a.p.kind] ?? 9;
    const kb = KIND_ORDER[b.p.kind] ?? 9;
    return q ? (a.s - b.s) || (ka - kb) : (ka - kb);
  });
  const top = scored.slice(0, MAX_RESULTS).map((x) => x.p);
  // Group by kind for display, keeping each group's best-first order.
  return top.sort((a, b) => (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9));
}

function isTypingIn(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export function mount(space, host) {
  const doc = host.ownerDocument || document;
  const win = doc.defaultView || window;
  const id = `space-jump-${++seq}`;
  let filmPlaying = false;
  let isOpen = false;
  let results = [];
  let sel = 0;
  let restoreTo = null;

  const backdrop = doc.createElement('div');
  backdrop.className = 'space-jump';
  backdrop.hidden = true;

  const dialog = doc.createElement('div');
  dialog.className = 'space-jump__dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', PLACEHOLDER);

  const input = doc.createElement('input');
  input.className = 'space-jump__input';
  input.type = 'text';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.placeholder = PLACEHOLDER;
  input.setAttribute('aria-label', PLACEHOLDER);
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-expanded', 'true');
  input.setAttribute('aria-controls', `${id}-list`);
  input.setAttribute('aria-autocomplete', 'list');

  const list = doc.createElement('div');
  list.className = 'space-jump__list';
  list.id = `${id}-list`;
  list.setAttribute('role', 'listbox');

  dialog.append(input, list);
  backdrop.append(dialog);
  host.append(backdrop);

  function render() {
    list.textContent = '';
    let lastKind = null;
    results.forEach((p, i) => {
      if (p.kind !== lastKind) {
        lastKind = p.kind;
        const h = doc.createElement('div');
        h.className = 'space-jump__group';
        h.setAttribute('role', 'presentation');
        h.textContent = KIND_HEADING[p.kind] || p.kind;
        list.append(h);
      }
      const row = doc.createElement('div');
      row.className = 'space-jump__item';
      row.id = `${id}-opt-${i}`;
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', i === sel ? 'true' : 'false');
      const dot = doc.createElement('span');
      dot.className = 'space-jump__dot';
      // The place's own meaning token colours its dot (law 77); the core names it, this part never picks a colour.
      if (p.token) dot.style.setProperty('--jump-dot', `var(${p.token})`);
      const name = doc.createElement('span');
      name.className = 'space-jump__name';
      name.textContent = p.name;
      const kind = doc.createElement('span');
      kind.className = 'space-jump__kind';
      kind.textContent = p.kind;
      row.append(dot, name, kind);
      row.addEventListener('mousemove', () => { if (sel !== i) select(i); });
      row.addEventListener('click', (e) => choose(e.metaKey || e.ctrlKey));
      list.append(row);
    });
    if (results.length) input.setAttribute('aria-activedescendant', `${id}-opt-${sel}`);
    else input.removeAttribute('aria-activedescendant');
  }

  function select(i) {
    if (!results.length) return;
    sel = (i + results.length) % results.length;
    for (const row of list.querySelectorAll('.space-jump__item')) {
      row.setAttribute('aria-selected', row.id === `${id}-opt-${sel}` ? 'true' : 'false');
    }
    input.setAttribute('aria-activedescendant', `${id}-opt-${sel}`);
    list.querySelector(`#${id}-opt-${sel}`)?.scrollIntoView({ block: 'nearest' });
    space.hover(results[sel].id);
  }

  function refresh() {
    results = pick(space.targets() || [], input.value);
    sel = 0;
    render();
    space.hover(results.length ? results[0].id : null);
  }

  function open() {
    if (isOpen || filmPlaying) return;
    isOpen = true;
    restoreTo = doc.activeElement;
    input.value = '';
    backdrop.hidden = false;
    refresh();
    input.focus();
  }

  // restore: return focus to what had it (Esc, click outside); a jump leaves focus with the space instead.
  function close(restore) {
    if (!isOpen) return;
    isOpen = false;
    backdrop.hidden = true;
    space.hover(null);
    if (restore && restoreTo && typeof restoreTo.focus === 'function' && restoreTo.isConnected) restoreTo.focus();
    restoreTo = null;
  }

  function choose(openPage) {
    const p = results[sel];
    if (!p) return;
    close(false);
    if (openPage) space.open(p.id);
    else space.focus(p.id);
  }

  function onGlobalKey(e) {
    if (isOpen) return;
    const isK = (e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey) && !e.altKey;
    const isSlash = e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey;
    if (!isK && !isSlash) return;
    if (filmPlaying || isTypingIn(doc.activeElement)) return;
    e.preventDefault();
    open();
  }

  function onDialogKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); select(sel + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); select(sel - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(e.metaKey || e.ctrlKey); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
    else if (e.key === 'Tab') {
      // The input is the dialog's only tab stop (options are reached by arrows), so Tab stays on it.
      e.preventDefault();
      input.focus();
    }
  }

  function onBackdropDown(e) {
    if (!dialog.contains(e.target)) close(true);
  }

  input.addEventListener('input', refresh);
  dialog.addEventListener('keydown', onDialogKey);
  backdrop.addEventListener('pointerdown', onBackdropDown);
  win.addEventListener('keydown', onGlobalKey);

  const offFilm = space.on('film', (f) => {
    filmPlaying = !!(f && f.playing);
    if (filmPlaying) close(false);
  });

  return function unmount() {
    close(false);
    offFilm && offFilm();
    win.removeEventListener('keydown', onGlobalKey);
    backdrop.remove();
  };
}
