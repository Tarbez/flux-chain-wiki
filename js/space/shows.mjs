/* Shows: each page plays its own show in the space (owner, 2026-11-05: "each page should give you shows"). Layer: app. A part of the space
   (docs/design/space/SPACE.md "Shows"). On a page change the running show stops (its spares leave, the camera goes back to the focused
   place) and the new page's show, if it has one (js/space/shows/<key>.mjs, '/' in a key written '-'), plays. Never while the film plays.
   It also shows the show's caption: one line at the foot, the step's own words, gone when the show says nothing. */

/* the pages that have a show; a page not listed has none (a missing file is never fetched) */
const WITH_SHOW = ['zero', 'works', 'resolutions', 'learnings', 'explorer', 'stats/now', 'resolvers', 'auth', 'account', 'chain', 'identity', 'ring', 'download'];
const base = (location.protocol === 'file:' ? '' : '/');

export function mount(space, host) {
  const cap = document.createElement('div'); cap.className = 'show-caption'; cap.setAttribute('role', 'status'); cap.setAttribute('aria-live', 'polite');
  const no = document.createElement('b'), text = document.createElement('span'); cap.appendChild(no); cap.appendChild(text);
  host.appendChild(cap);
  let page = null, filmPlaying = false, ticket = 0;
  const stops = [];

  async function start(key) {
    if (window.ArkCinematicActive) return;   /* the cinematic owns the show */
    const my = ++ticket;
    space.stopShow();
    if (!key || filmPlaying || !WITH_SHOW.includes(key)) return;
    try {
      const m = await import(base + 'js/space/shows/' + key.replace(/\//g, '-') + '.mjs');
      if (my !== ticket || !m.SHOW) return;
      /* a show may be built from the places (a function of the space) or be a fixed list */
      space.play(typeof m.SHOW === 'function' ? m.SHOW(space) : m.SHOW);
    } catch (e) { if (window.console) console.warn('[space] the show for "' + key + '" did not load (' + e.message + ')'); }
  }
  stops.push(space.on('say', (s) => {
    cap.classList.toggle('on', !!s);
    if (!s) return;
    no.textContent = s.step || ''; no.hidden = !s.step; text.textContent = s.text;
    lift();
  }));
  /* the caption stands 16px above whatever holds the foot of the screen (the page's dock, the focus card, the journey bar), measured,
     so it never touches one (owner, 2026-11-05: "total chaos") */
  function lift() {
    const tops = [...document.querySelectorAll('.hud-dock, .fc-card, .focus-card')].map((e) => e.getBoundingClientRect())
      .filter((r) => r.width && r.height && r.top > innerHeight / 2 && r.left < innerWidth / 2 + 200 && r.right > innerWidth / 2 - 200).map((r) => r.top);
    cap.style.bottom = tops.length ? Math.round(innerHeight - Math.min(...tops) + 16) + 'px' : '';
  }
  addEventListener('resize', lift); stops.push(() => removeEventListener('resize', lift));
  stops.push(space.on('focus', () => requestAnimationFrame(lift)));
  stops.push(space.on('film', (f) => { const was = filmPlaying; filmPlaying = !!(f && f.playing); if (was && !filmPlaying) start(page); }));
  if (window.ArkUI && ArkUI.sceneState && ArkUI.sceneState.subscribe) {
    const off = ArkUI.sceneState.subscribe((st) => { if (!st || st.page === page) return; if (window.ArkCinematicActive) return;   /* not recorded as shown: its own show plays when the visitor opens it after the trip */
      page = st.page; start(page); });
    if (typeof off === 'function') stops.push(off);
  }
  space.whenReady(() => { const st = window.ArkUI && ArkUI.sceneState ? ArkUI.sceneState.get() : null; page = st ? st.page : null; start(page); });

  return () => { stops.forEach((fn) => { try { fn(); } catch (e) {} }); space.stopShow(); cap.remove(); };
}
