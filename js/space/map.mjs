// The map: a small top-down SVG of every place in the space. Clicking a
// place flies the camera there. Drawn from ArkSpace.targets() only (SPACE.md),
// so the map never holds a second list of places.
const NS = 'http://www.w3.org/2000/svg';
const SIZE = 160;
const MARGIN = 14;
const STORE_KEY = 'defxn.space.map.collapsed';
// The visitor reads these words; everything else comes from the place itself.
const WORDS = { map: 'Map of the grid', hide: 'Hide the map', show: 'Show the map' };

// localStorage can throw in a private window; the map then just opens expanded.
function readCollapsed() {
  try { return localStorage.getItem(STORE_KEY) === '1'; } catch { return false; }
}
function writeCollapsed(v) {
  try { localStorage.setItem(STORE_KEY, v ? '1' : '0'); } catch { /* storage blocked: the choice lasts this page only */ }
}

function el(name, attrs) {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}

// Fits every place's x/z into the square with a margin. North (-z) is up,
// so z grows downward on screen as it does in SVG.
function project(places) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of places) {
    const [x, , z] = p.at;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }
  const span = Math.max(maxX - minX, maxZ - minZ, 1e-6);
  const scale = (SIZE - 2 * MARGIN) / span;
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  return ([x, , z]) => [SIZE / 2 + (x - cx) * scale, SIZE / 2 + (z - cz) * scale];
}

export function mount(space, host) {
  const root = document.createElement('div');
  root.className = 'space-map';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'space-map__toggle';
  const svg = el('svg', { viewBox: `0 0 ${SIZE} ${SIZE}`, class: 'space-map__svg', role: 'group', 'aria-label': WORDS.map });
  root.append(svg, toggle);
  host.appendChild(root);

  let collapsed = readCollapsed();
  let filmPlaying = false;
  let hovered = null;
  let cam = { yaw: 0, elev: 0, dist: 0 };
  let toXY = null;
  let cone = null;
  let frame = 0;

  function applyState() {
    root.hidden = filmPlaying;
    root.classList.toggle('is-collapsed', collapsed);
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', collapsed ? WORDS.show : WORDS.hide);
    toggle.textContent = collapsed ? '◱' : '–';
  }

  function placeShape(p, [x, y]) {
    if (p.kind === 'kernel') return el('circle', { cx: x, cy: y, r: 6, class: 'space-map__kernel' });
    if (p.kind === 'network') {
      const s = 8;
      const r = el('rect', { x: x - s / 2, y: y - s / 2, width: s, height: s, class: 'space-map__net' });
      if (p.token) r.style.fill = `hsl(var(${p.token}))`;
      return r;
    }
    return el('circle', { cx: x, cy: y, r: 2.2, class: 'space-map__chain' });
  }

  function render() {
    if (!space.ready) return;
    const places = space.targets();
    svg.replaceChildren();
    if (!places.length) { toXY = null; cone = null; return; }
    toXY = project(places);
    const byId = new Map(places.map((p) => [p.id, p]));
    const focus = space.focused();

    const lines = el('g', { class: 'space-map__links', 'aria-hidden': 'true' });
    for (const p of places) {
      const parent = p.parent && byId.get(p.parent);
      if (!parent) continue;
      const [x1, y1] = toXY(p.at), [x2, y2] = toXY(parent.at);
      lines.appendChild(el('line', { x1, y1, x2, y2 }));
    }
    svg.appendChild(lines);

    cone = el('path', { class: 'space-map__cone', d: 'M0 0 L-9 -22 A24 24 0 0 1 9 -22 Z', 'aria-hidden': 'true' });
    svg.appendChild(cone);

    // Chains first, then networks, then the kernel, so larger marks sit on top.
    const order = { chain: 0, network: 1, kernel: 2 };
    for (const p of [...places].sort((a, b) => order[a.kind] - order[b.kind])) {
      const g = el('g', { class: 'space-map__place', role: 'button', tabindex: '0', 'aria-label': p.name || p.id, 'data-id': p.id });
      if (p.id === focus) g.classList.add('is-focused');
      if (p.id === hovered) g.classList.add('is-hovered');
      g.appendChild(placeShape(p, toXY(p.at)));
      svg.appendChild(g);
    }
    placeCone();
  }

  // The wedge points where the camera looks: from the camera's side of the
  // focus toward it. yaw is degrees round the vertical axis.
  function placeCone() {
    frame = 0;
    if (!cone || !toXY) return;
    const id = space.focused() || 'kernel';
    const p = space.target(id) || space.target('kernel');
    if (!p) { cone.setAttribute('visibility', 'hidden'); return; }
    const [x, y] = toXY(p.at);
    cone.removeAttribute('visibility');
    cone.setAttribute('transform', `translate(${x} ${y}) rotate(${cam.yaw || 0})`);
  }

  const idOf = (e) => e.target.closest?.('.space-map__place')?.getAttribute('data-id') || null;
  const onClick = (e) => { const id = idOf(e); if (id) space.focus(id); };
  const onKey = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const id = idOf(e);
    if (id) { e.preventDefault(); space.focus(id); }
  };
  const onOver = (e) => { const id = idOf(e); if (id) space.hover(id); };
  const onOut = (e) => { if (idOf(e) && !svg.contains(e.relatedTarget)) space.hover(null); };
  svg.addEventListener('click', onClick);
  svg.addEventListener('keydown', onKey);
  svg.addEventListener('pointerover', onOver);
  svg.addEventListener('pointerout', onOut);
  svg.addEventListener('focusin', onOver);
  svg.addEventListener('focusout', onOut);
  toggle.addEventListener('click', () => { collapsed = !collapsed; writeCollapsed(collapsed); applyState(); });

  const offs = [];
  applyState();
  space.whenReady(() => {
    offs.push(
      space.on('targets', render),
      space.on('focus', render),
      space.on('hover', (p) => { hovered = p ? p.id : null; render(); }),
      space.on('film', (f) => { filmPlaying = !!(f && f.playing); applyState(); }),
      space.on('camera', (c) => { cam = c || cam; if (!frame) frame = requestAnimationFrame(placeCone); }),
    );
    render();
  });

  return function unmount() {
    for (const off of offs) { try { off(); } catch { /* listener already gone */ } }
    if (frame) cancelAnimationFrame(frame);
    root.remove();
  };
}
