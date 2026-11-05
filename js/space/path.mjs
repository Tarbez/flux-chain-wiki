// The path: one line under the site header that says where the visitor stands, Grid > network > chain.
// Each step but the last is a button that flies there; the last is plain text marked aria-current="location".
// On the grid it shows nothing, because "Grid" alone tells a visitor nothing they can act on.
// It reads only the contract in docs/design/space/SPACE.md (window.ArkSpace), never the core's internals.

const GRID = 'Grid'; // the one word this part owns; every other step is the place's own name
const SEP = '›';
const MAX_DEPTH = 8; // a parent chain longer than this is a cycle in the core's data, so the walk stops

// Walk from the focused place up through parent, root last, then reverse so Grid comes first.
function chainOf(space, id) {
  const steps = [];
  let place = id ? space.target(id) : null;
  while (place && steps.length < MAX_DEPTH) {
    steps.push(place);
    place = place.parent ? space.target(place.parent) : null;
  }
  return steps.reverse();
}

export function mount(space, host) {
  const nav = document.createElement('nav');
  nav.className = 'space-path';
  nav.setAttribute('aria-label', 'Where you are');
  nav.hidden = true;
  host.appendChild(nav);

  let filmPlaying = false;
  let focusedId = null;

  function stepButton(label, id) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'space-path-step';
    b.textContent = label;
    b.addEventListener('click', () => space.focus(id));
    return b;
  }

  function render() {
    nav.replaceChildren();
    const steps = chainOf(space, focusedId);
    const visible = !filmPlaying && steps.length > 0;
    nav.classList.toggle('is-shown', visible);
    if (!visible) { nav.hidden = true; return; }
    nav.hidden = false;
    nav.appendChild(stepButton(GRID, null));
    steps.forEach((place, i) => {
      const sep = document.createElement('span');
      sep.className = 'space-path-sep';
      sep.setAttribute('aria-hidden', 'true');
      sep.textContent = SEP;
      nav.appendChild(sep);
      if (i === steps.length - 1) {
        const here = document.createElement('span');
        here.className = 'space-path-here';
        here.setAttribute('aria-current', 'location');
        here.textContent = place.name;
        nav.appendChild(here);
      } else {
        nav.appendChild(stepButton(place.name, place.id));
      }
    });
  }

  const stops = [];
  let gone = false;
  space.whenReady(() => {
    if (gone) return;
    focusedId = space.focused();
    stops.push(space.on('focus', (place) => { focusedId = place ? place.id : null; render(); }));
    stops.push(space.on('film', (state) => { filmPlaying = !!(state && state.playing); render(); }));
    render();
  });

  return function unmount() {
    gone = true;
    stops.forEach((stop) => stop());
    nav.remove();
  };
}
