/* The space's parts, loaded once the world's objects stand (docs/design/space/SPACE.md). Layer: app.
   One fixed layer over the canvas holds every part's DOM; it takes no pointer itself, each part's own controls do. Each part's
   stylesheet is linked once (a part may also link its own; the same href is never added twice). A part that fails to load or mount
   is reported in the console and the others carry on. */
const PARTS = [
  ['routes', false],      /* a page's place; no DOM, no stylesheet */
  /* hints left on 2026-11-05: the missions (quest) taught the moves by giving the visitor something to do.
     quest and journey left on 2026-11-09 (design P05, the portal navigation): their missions and paths named the retired pages
     (works, stats/now, resolutions, explorer, learnings), and their MISSIONS chip and "Pick your path" panel covered the topic
     pages, Learn and the jump bar. The files stay (js/space/quest.mjs, journey.mjs), out of this list; nothing else imports them. */
  ['label', true], ['path', true], ['map', true], ['focus-card', true], ['keys', true], ['jump', true], ['beacons', true], ['shows', true], ['cinematic', true], ['intro', true]
];

const base = (location.protocol === 'file:' ? '' : '/');
function linkOnce(href) {
  if ([...document.querySelectorAll('link[rel="stylesheet"]')].some((l) => l.getAttribute('href') === href || l.href.endsWith(href))) return;
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
}

export async function mountSpaceParts(space) {
  let layer = document.getElementById('space-layer');
  if (!layer) {
    layer = document.createElement('div'); layer.id = 'space-layer';
    layer.style.cssText = 'position:fixed;inset:0;z-index:6;pointer-events:none;';
    document.body.appendChild(layer);
  }
  linkOnce(base + 'css/space/space.css');
  /* the page's own words step aside while a place is focused (css/space/space.css) */
  const offFocus = space.on('focus', (t) => document.body.classList.toggle('space-focused', !!t));
  const unmounts = [offFocus];
  await Promise.all(PARTS.map(async ([name, css]) => {
    try {
      if (css) linkOnce(base + 'css/space/' + name + '.css');
      const m = await import(base + 'js/space/' + name + '.mjs');
      const off = m.mount(space, layer);
      if (typeof off === 'function') unmounts.push(off);
    } catch (e) { if (window.console) console.warn('[space] the part "' + name + '" did not mount (' + e.message + ')'); }
  }));
  return () => unmounts.forEach((fn) => { try { fn(); } catch (e) {} });
}
