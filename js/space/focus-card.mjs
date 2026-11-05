// Focus card: the focused place's name, its one line, its kind, up to three key facts, Open and Back.
// It shows on `arrive` (landing) and hides on `focus` (flight start) so it never covers the flight.
// A part of the space (docs/design/space/SPACE.md). It talks to the core only through `space` (window.ArkSpace).
// Every word shown comes from the place itself, except the two button words below.

const WORDS = { open: 'Open', back: 'Back' };
const CHIPS_MAX = 4; // a network shows at most this many child chips, then "+N"

// Make one element with a class and optional text; text goes in as textContent so a place's name is never parsed as HTML.
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

// The part's stylesheet sits beside it at ../../css/space/focus-card.css; add it once if the loader has not.
function ensureStyle() {
  const href = new URL('../../css/space/focus-card.css', import.meta.url).href;
  if ([...document.querySelectorAll('link[rel="stylesheet"]')].some((l) => l.href === href)) return null;
  const link = el('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
  return link;
}

export function mount(space, host) {
  const link = ensureStyle();
  const card = el('section', 'fc');
  card.setAttribute('aria-live', 'polite');
  card.hidden = true;
  host.appendChild(card);

  let place = null;
  let filmPlaying = false;

  // Build the card for one place. Called on every landing, so it starts from empty each time.
  function render() {
    card.replaceChildren();
    if (!place || filmPlaying) { card.hidden = true; return; }

    const tag = el('p', 'fc-kind');
    const dot = el('span', 'fc-dot');
    dot.style.setProperty('--fc-token', `var(${place.token || '--primary'})`);
    tag.append(dot, document.createTextNode(String(place.kind || '').toUpperCase()));

    const name = el('h2', 'fc-name', place.name);
    card.setAttribute('aria-label', place.name);
    card.append(tag, name);
    if (place.line) card.append(el('p', 'fc-line', place.line));

    // Key facts: label/value pairs already in plain words from the core; at most 3, block omitted when there are none.
    const facts = Array.isArray(place.facts) ? place.facts.slice(0, 3) : [];
    if (facts.length) {
      const dl = el('dl', 'fc-facts');
      for (const f of facts) dl.append(el('dt', 'fc-fact-label', f.label), el('dd', 'fc-fact-value', f.value));
      card.append(dl);
    }

    const kids = place.kind === 'network' ? (place.children || []) : [];
    if (kids.length) {
      const list = el('ul', 'fc-chips');
      for (const id of kids.slice(0, CHIPS_MAX)) {
        const child = space.target(id);
        const b = el('button', 'fc-chip', child ? (child.short || child.name) : id);
        b.type = 'button';
        b.addEventListener('click', () => space.focus(id));
        const li = el('li');
        li.append(b);
        list.append(li);
      }
      if (kids.length > CHIPS_MAX) list.append(el('li', 'fc-more', `+${kids.length - CHIPS_MAX}`));
      card.append(list);
    }

    const acts = el('div', 'fc-acts');
    if (place.route) {
      const open = el('button', 'fc-btn fc-open', WORDS.open);
      open.type = 'button';
      const id = place.id;
      open.addEventListener('click', () => space.open(id));
      acts.append(open);
    }
    const back = el('button', 'fc-btn fc-back', WORDS.back);
    back.type = 'button';
    back.addEventListener('click', () => space.back());
    acts.append(back);
    card.append(acts);

    // Restart the enter animation: drop the class, force a reflow, add it back.
    card.hidden = false;
    card.classList.remove('fc-in');
    void card.offsetWidth;
    card.classList.add('fc-in');
  }

  const offs = [];
  let alive = true;
  space.whenReady(() => {
    if (!alive) return;
    const id = space.focused();
    place = id ? space.target(id) : null;
    render();
    // Flight starts: hide so the card does not cover it. Landing: show the place we arrived at.
    offs.push(space.on('focus', (p) => { place = p || null; card.hidden = true; card.replaceChildren(); }));
    offs.push(space.on('arrive', (p) => { place = p || null; render(); }));
    offs.push(space.on('film', (f) => {
      const was = filmPlaying;
      filmPlaying = !!(f && f.playing);
      if (was !== filmPlaying) render();
    }));
  });

  return function unmount() {
    alive = false;
    offs.forEach((off) => off());
    card.remove();
    if (link) link.remove();
  };
}
