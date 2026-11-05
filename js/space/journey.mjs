/* Journeys: a path through the site for who you are, and the 2-3 core actions on every screen (owner, 2026-11-05: "I see no 2-3 core CTA
   per screen and the audience journeys"). Layer: app. A part of the space (docs/design/space/SPACE.md).

   The visitor's role is the one the missions keep (js/space/quest.mjs, localStorage defxn-quest-v1). Each role has a journey: an ordered
   list of pages. On every page a bar at the foot, right, shows the journey as dots (done, here, ahead) and gives the core actions:
   Next (the journey's next page, bright), Back (its previous page). With the page's own dominant action in its dock that is three on
   every screen. A page off the journey offers "Back to your path". With no role yet the bar asks the one question: "Pick your path". */

const KEY = 'defxn-quest-v1';
const JOURNEYS = {
  curious:  { name: 'Just curious',    pages: [['zero', 'The grid'], ['works', 'How it works'], ['chain', 'Your chain'], ['stats/now', 'Network stats'], ['download', 'Get FXN Browser']] },
  builder:  { name: 'I build apps',    pages: [['zero', 'The grid'], ['resolutions', 'What you can make'], ['resolvers', 'Resolvers'], ['works', 'How it works'], ['download', 'Get FXN Browser']] },
  operator: { name: 'I run computers', pages: [['zero', 'The grid'], ['stats/now', 'Network stats'], ['explorer', 'Explore the mesh'], ['learnings', 'Notes'], ['download', 'Run a node']] }
};

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
const roleNow = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && v.role; } catch (e) { return null; } };
const pageNow = () => { const st = window.ArkUI && ArkUI.sceneState && ArkUI.sceneState.get ? ArkUI.sceneState.get() : null; return st ? st.page : null; };
function go(page) { if (window.ArkUI && ArkUI.pageRouter && ArkUI.pageCatalog && ArkUI.pageCatalog[page]) ArkUI.pageRouter.navigate(page); }

export function mount(space, host) {
  const bar = el('nav', 'journey'); bar.setAttribute('aria-label', 'Your path'); host.appendChild(bar);
  let film = false, last = null;
  const stops = [];

  function render() {
    bar.classList.toggle('hidden', film);
    const role = roleNow(), j = JOURNEYS[role], page = pageNow();
    bar.replaceChildren();
    if (!j) {
      /* no path yet: one question */
      const ask = el('button', 'journey-next', 'Pick your path'); ask.type = 'button';
      ask.addEventListener('click', () => window.dispatchEvent(new CustomEvent('ark-quest-open')));
      bar.appendChild(el('span', 'journey-label', 'New here?')); bar.appendChild(ask);
      return;
    }
    const i = j.pages.findIndex((p) => p[0] === page);
    /* the path as dots: done, here, ahead; each dot is a way there */
    const head = el('div', 'journey-head');
    head.appendChild(el('span', 'journey-label', j.name + (i >= 0 ? ' · ' + (i + 1) + ' of ' + j.pages.length : '')));
    const dots = el('ol', 'journey-dots');
    j.pages.forEach(([key, name], k) => {
      const li = el('li', k < i ? 'done' : k === i ? 'here' : '');
      const b = el('button', null); b.type = 'button'; b.title = name; b.setAttribute('aria-label', (k + 1) + '. ' + name + (k === i ? ' (you are here)' : ''));
      if (k === i) b.setAttribute('aria-current', 'step');
      b.addEventListener('click', () => go(key));
      li.appendChild(b); dots.appendChild(li);
    });
    head.appendChild(dots); bar.appendChild(head);
    const acts = el('div', 'journey-acts');
    if (i < 0) {
      /* off the path: one way back onto it */
      const back = el('button', 'journey-next', 'Back to your path: ' + j.pages[0][1]); back.type = 'button';
      const firstUndone = j.pages[0][0];
      back.addEventListener('click', () => go(firstUndone)); acts.appendChild(back);
    } else {
      if (i > 0) { const b = el('button', 'journey-back', '← ' + j.pages[i - 1][1]); b.type = 'button'; b.addEventListener('click', () => go(j.pages[i - 1][0])); acts.appendChild(b); }
      if (i < j.pages.length - 1) { const n = el('button', 'journey-next', 'Next: ' + j.pages[i + 1][1] + ' →'); n.type = 'button'; n.addEventListener('click', () => go(j.pages[i + 1][0])); acts.appendChild(n); }
      else acts.appendChild(el('span', 'journey-done', 'Path complete.'));
    }
    bar.appendChild(acts);
  }

  stops.push(space.on('film', (f) => { film = !!(f && f.playing); render(); }));
  if (window.ArkUI && ArkUI.sceneState && ArkUI.sceneState.subscribe) {
    const off = ArkUI.sceneState.subscribe((st) => { if (!st || st.page === last) return; last = st.page; render(); });
    if (typeof off === 'function') stops.push(off);
  }
  const onRole = () => render();
  window.addEventListener('ark-quest-change', onRole);
  window.addEventListener('storage', onRole);
  render();
  return () => { stops.forEach((fn) => { try { fn(); } catch (e) {} }); window.removeEventListener('ark-quest-change', onRole); window.removeEventListener('storage', onRole); bar.remove(); };
}
