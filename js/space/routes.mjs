/* routes: each page's place in the space (docs/design/space/SPACE.md, part "routes"). Layer: app.
   When the current page changes, the camera flies to that page's place. Focusing never writes the address:
   only ArkSpace.open goes through the router. This part has no DOM. */

/* Pages with no place of their own that still belong to a level. Small on purpose: a page that has a place
   carries it in the place's own route, so it never needs a line here. */
const LEVEL_OF = [
  [/^(intro|zero)$/, () => null],               // home and the intro film stand on the whole grid
  [/^chain(\/.*)?$/, (s) => firstOf(s, 'chain')], // the chain pages explain chains in general: the first chain stands for them
  [/^resolvers$/, () => 'kernel'],              // resolvers run in the kernel, so its page belongs to the kernel's place
  [/^stats(\/.*)?$/, () => null]                // stats measure the whole grid, so they show all of it
];
const NONE = Symbol('leave the camera to the page');

function firstOf(space, kind) {
  const hit = space.targets().find((t) => t.kind === kind);
  return hit ? hit.id : NONE;
}

/* A place's query matches when every key it names has the same value in the page's query. */
function queryMatches(want, search) {
  const have = new URLSearchParams(search || '');
  return Object.keys(want || {}).every((k) => have.get(k) === String(want[k]));
}

function placeFor(space, key, search) {
  const own = space.targets().filter((t) => t.route && t.route.key === key && queryMatches(t.route.query, search));
  if (own.length) {
    /* the most specific route wins: ring?i=fxn beats a bare ring */
    own.sort((a, b) => Object.keys(b.route.query || {}).length - Object.keys(a.route.query || {}).length);
    return own[0].id;
  }
  for (const [test, pick] of LEVEL_OF) if (test.test(key)) return pick(space);
  return NONE;
}

export function mount(space, host) {
  const ArkUI = globalThis.ArkUI || {};
  const stops = [];
  let playing = false, ready = false, last = null;

  function search() { return ArkUI.route && ArkUI.route.search ? ArkUI.route.search() : (globalThis.location ? location.search : ''); }
  function pageKey() { const s = ArkUI.sceneState && ArkUI.sceneState.get ? ArkUI.sceneState.get() : null; return s ? s.page : null; }

  function sync() {
    if (!ready || playing) return;
    const key = pageKey();
    if (!key) return;
    const q = search();
    const sig = key + '?' + q;
    if (sig === last) return;           // the same page and query: the visitor may have flown elsewhere, leave them there
    last = sig;
    let id = placeFor(space, key, q);
    /* a page with no place of its own: the grid, so a focus from an earlier page is never left behind (the motion audit, 2026-11-05) */
    if (id === NONE) id = null;
    if (id === space.focused()) return;
    space.focus(id);
  }

  space.whenReady(() => { ready = true; sync(); });
  stops.push(space.on('film', (f) => { playing = !!(f && f.playing); if (!playing) { last = null; sync(); } }));
  if (ArkUI.sceneState && ArkUI.sceneState.subscribe) {
    const off = ArkUI.sceneState.subscribe(() => sync());
    if (typeof off === 'function') stops.push(off);
  }
  /* the scene page does not change when only the query does (ring?i=a -> ring?i=b), so the router's own signals are heard too */
  const onRoute = () => sync();
  globalThis.addEventListener('ark:route-ready', onRoute);
  globalThis.addEventListener('popstate', onRoute);
  stops.push(() => { globalThis.removeEventListener('ark:route-ready', onRoute); globalThis.removeEventListener('popstate', onRoute); });

  return function unmount() { ready = false; stops.splice(0).forEach((stop) => stop()); };
}
