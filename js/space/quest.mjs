/* RETIRED 2026-11-09 (design P05, the portal navigation): not in js/space/space.mjs PARTS, so this never mounts. Its missions name
   the retired pages (stats/now, resolutions, works, explorer), and its MISSIONS chip covered the topic pages and Learn. Kept as the
   reader of localStorage defxn-quest-v1 in case the role is wanted again; a new mission list would name /fxn/<slug> pages.

   The space as a game: missions for who you are (owner, 2026-11-05: "make it feel like a true game. Simple and easy, any person can
   understand, audience based"). Layer: app. A part of the space (docs/design/space/SPACE.md): it talks only through ArkSpace.

   After the film a visitor says who they are (three roles, or "just look around"). Each role gets a short mission list in plain words;
   each step ticks off the moment the visitor does it in the space or on the site (a place focused, a page opened). A small panel keeps
   the score; a short toast says each step is done; the last step ends on one next action that fits the role. Progress is kept in this
   browser (localStorage, try/catch); "Change" starts over. Nothing here invents a fact: every step is a real place or a real page. */

const KEY = 'defxn-quest-v1';

/* the roles, and their missions. A step is done by focusing a kind of place, or by opening a page (its route key). */
const ROLES = [
  { id: 'curious', name: 'Just curious', line: 'Learn what DEFXN is in a minute.', steps: [
    { say: 'Find the kernel in the middle', focus: 'kernel' },
    { say: 'Fly to a network', focus: 'network' },
    { say: 'Look at one of its chains', focus: 'chain' },
    { say: 'See the network running', page: 'stats/now' }
  ], next: { say: 'Get FXN Browser', page: 'download' } },
  { id: 'builder', name: 'I build apps', line: 'See what you can make on it.', steps: [
    { say: 'Fly to a network', focus: 'network' },
    { say: 'Find the kernel every network runs on', focus: 'kernel' },
    { say: 'See what you can make', page: 'resolutions' },
    { say: 'Learn how a request works', page: 'works' }
  ], next: { say: 'Get FXN Browser', page: 'download' } },
  { id: 'operator', name: 'I run computers', line: 'See the nodes that keep it running.', steps: [
    { say: 'Fly to a network', focus: 'network' },
    { say: 'Check the nodes that are up', page: 'stats/now' },
    { say: 'Explore the live mesh', page: 'explorer' }
  ], next: { say: 'Run a node', page: 'download' } }
];

function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} window.dispatchEvent(new CustomEvent('ark-quest-change')); }   /* the journey bar follows the role */
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function go(page) { if (window.ArkUI && ArkUI.pageRouter && ArkUI.pageCatalog && ArkUI.pageCatalog[page]) ArkUI.pageRouter.navigate(page); }

export function mount(space, host) {
  const root = el('div', 'quest'); host.appendChild(root);
  let state = load() || { role: null, done: [], skipped: false };
  let filmPlaying = false, filmDone = false, toastTimer = 0;
  const stops = [];

  /* who are you? is the intro's shot 5 now (js/space/intro.mjs): the role is kept there, in this same key */
  /* ---------- the mission panel ---------- */
  const panel = el('section', 'quest-panel'); panel.setAttribute('aria-label', 'Your mission');
  const head = el('div', 'quest-head'), title = el('strong', 'quest-title'), score = el('span', 'quest-score');
  head.appendChild(title); head.appendChild(score);
  const bar = el('div', 'quest-bar'), fill = el('i'); bar.appendChild(fill);
  const list = el('ol', 'quest-list');
  const foot = el('div', 'quest-foot');
  const change = el('button', 'quest-change', 'Change'); change.type = 'button';
  change.addEventListener('click', () => { state = { role: null, done: [], skipped: false }; save(state); render(); });
  const again = el('button', 'quest-change', 'Watch again'); again.type = 'button';   /* replays this role's cinematic (js/space/cinematic.mjs) */
  const play = () => { if (state.role) window.dispatchEvent(new CustomEvent('ark-cinematic-play', { detail: { role: state.role } })); };
  again.addEventListener('click', play);
  panel.appendChild(head); panel.appendChild(bar); panel.appendChild(list); panel.appendChild(foot); panel.appendChild(again); panel.appendChild(change);
  root.appendChild(panel);

  /* the small button that brings missions back after "just look around" */
  const reopen = el('button', 'quest-reopen', 'Missions'); reopen.type = 'button';
  reopen.addEventListener('click', () => window.dispatchEvent(new CustomEvent('ark-intro-picker')));
  root.appendChild(reopen);

  const toast = el('div', 'quest-toast'); toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite'); root.appendChild(toast);

  const roleOf = () => ROLES.find((r) => r.id === state.role) || null;
  function say(text) {
    toast.textContent = text; toast.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('on'), 2400);
  }
  /* the role picker asks only on the front pages (intro, home): a visitor who lands deep in the site is not stopped by a question */
  /* "Pick your path" (js/space/journey.mjs) stands the intro's shot 5 on any page */
  /* the intro keeps the role and tells us; the intro's state hides this part while it plays */
  let introOn = false;
  const onKept = () => { state = load() || state; render(); };
  const onIntro = (e) => { introOn = !!(e.detail && e.detail.playing); render(); };
  window.addEventListener('ark-quest-change', onKept); window.addEventListener('ark-intro-state', onIntro);
  stops.push(() => { window.removeEventListener('ark-quest-change', onKept); window.removeEventListener('ark-intro-state', onIntro); });
  const front = () => { const st = window.ArkUI && ArkUI.sceneState && ArkUI.sceneState.get ? ArkUI.sceneState.get() : null; return !st || st.page === 'intro' || st.page === 'zero'; };
  function render() {
    const r = roleOf(), ready = filmDone && !filmPlaying;
    root.classList.toggle('hidden', !ready || introOn || document.documentElement.classList.contains('intro-picker'));
    const n = r ? r.steps.length : 0, d = r ? r.steps.filter((_, i) => state.done.includes(i)).length : 0;
    /* one guide a screen (owner, 2026-11-05: "total chaos"): the mission panel lives on the front page only, and only until the mission
       is done (Watch again lives in that panel, so it goes with it: the journey bar has no place for it); everywhere else, and after it, the journey bar (js/space/journey.mjs) is the guide. html.quest-on tells the bar to wait. */
    panel.hidden = !ready || !r || !front() || d === n;
    document.documentElement.classList.toggle('quest-on', !panel.hidden);
    reopen.hidden = !ready || !(state.skipped || (!r && !front()));
    if (!r) return;
    title.textContent = r.name; score.textContent = d + ' / ' + n;
    fill.style.width = (d / n * 100) + '%';
    list.replaceChildren(...r.steps.map((s, i) => {
      const li = el('li', state.done.includes(i) ? 'done' : '');
      li.appendChild(el('i', 'quest-tick')); li.appendChild(el('span', null, s.say));
      if (!state.done.includes(i)) {
        /* every step has a way to do it from here: a page step goes there, a place step flies to the nearest place of its kind */
        const b = el('button', 'quest-go', s.page ? 'Go' : 'Show me'); b.type = 'button'; b.setAttribute('aria-label', (s.page ? 'Go: ' : 'Show me: ') + s.say);
        b.addEventListener('click', () => { if (s.page) go(s.page); else { const t = space.targets().find((x) => x.kind === s.focus); if (t) space.focus(t.id); } });
        li.appendChild(b);
      }
      return li;
    }));
    /* the beacons light the next step's place with "Click here" */
    const next = r.steps.find((s, i) => !state.done.includes(i));
    window.dispatchEvent(new CustomEvent('ark-quest-target', { detail: { kind: next && next.focus ? next.focus : null } }));
    foot.replaceChildren();
    if (d === n) {
      foot.appendChild(el('p', 'quest-win', 'You know the grid.'));
      const b = el('button', 'quest-next', r.next.say); b.type = 'button'; b.addEventListener('click', () => go(r.next.page));
      foot.appendChild(b);
    }
  }
  /* a step is done: tick it, say so, and say the whole mission is done when it is */
  function did(match) {
    if (window.ArkCinematicActive || window.ArkCinematicNav > 0) return;   /* a cinematic is a guide: it ticks nothing */
    const r = roleOf(); if (!r) return;
    const i = r.steps.findIndex((s, j) => !state.done.includes(j) && match(s));
    if (i < 0) return;
    state.done.push(i); save(state);
    const left = r.steps.length - state.done.length;
    say(left ? 'Done: ' + r.steps[i].say + '. ' + left + ' to go.' : 'Mission complete. You know the grid.');
    render();
  }

  stops.push(space.on('film', (f) => { filmPlaying = !!(f && f.playing); if (f && (f.done || !f.playing)) filmDone = true; render(); }));
  /* every landing says where you are and what you can do next (the beacons show the places; this says it in words) */
  const COACH = { kernel: 'The kernel. Every network runs on it. Click a network next.', network: 'A network. Its chains stand round it. Click one, or press Back.', chain: 'A chain. Each identity keeps its own. Press Open to see inside, or Back.' };
  stops.push(space.on('arrive', (t) => {
    if (!t) return;
    const before = state.done.length;
    did((s) => s.focus === t.kind);
    if (state.done.length === before && filmDone && !filmPlaying) say((t.short || t.name) + ': ' + (COACH[t.kind] || ''));
  }));
  /* a page opened counts for a page step (the scene's page key) */
  if (window.ArkUI && ArkUI.sceneState && ArkUI.sceneState.subscribe) {
    let last = null;
    const off = ArkUI.sceneState.subscribe((s) => { if (!s || s.page === last) return; last = s.page; did((st) => st.page === s.page); render(); });
    if (typeof off === 'function') stops.push(off);
  }
  /* no film on this load (a page other than the intro, or reduced motion): the game can start at once */
  space.whenReady(() => { const f = space.film && space.film(); if (!f || !f.playing) { filmDone = true; render(); } });
  render();

  return () => { stops.forEach((fn) => { try { fn(); } catch (e) {} }); clearTimeout(toastTimer); root.remove(); };
}
