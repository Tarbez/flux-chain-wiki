/* =====================================================================
   ADMIN EDITOR · SITEMAP (js/admin/sitemap.js)
   ---------------------------------------------------------------------
   Owns: the Sitemap view -- the page tree by address, links drawn on demand, problems
   flagged, its zoom -- and setView(), the switch between the Canvas, Sitemap, Theme and World views.
   Must not: read links from anywhere but realLinkIndex() (the real manifests).
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, $ = A.$, realLinkIndex = A.realLinkIndex, ic = A.ic, openRoute = A.openRoute,
      layoutStage = A.layoutStage, syncHeader = A.syncHeader, schedule = A.schedule;
  /* defined by files loaded after this one: resolved when called */
  var mountThemeView = A.later('mountThemeView'), mountWorldView = A.later('mountWorldView'), mountSkinView = A.later('mountSkinView');

  /* =========================================================================
     Sitemap: page tree by address, links on demand, problems flagged
     ========================================================================= */
  let mapFocus = '';
  let mapZoom = 1;
  const MAPZOOM_MIN = 0.4, MAPZOOM_MAX = 2, MAPZOOM_STEP = 0.2;
  function applyMapZoom() {
    const box = $('mapView');
    const wrap = box.querySelector('.smzoom'), cv = box.querySelector('.smcanvas');
    if (wrap && cv) {
      const w = Number(wrap.dataset.w || 0), h = Number(wrap.dataset.h || 0);
      wrap.style.width = (w * mapZoom) + 'px'; wrap.style.height = (h * mapZoom) + 'px';
      cv.style.transform = 'scale(' + mapZoom + ')'; cv.style.transformOrigin = '0 0';
    }
    const pct = box.querySelector('.smzoom-pct'); if (pct) pct.textContent = Math.round(mapZoom * 100) + '%';
  }
  function setMapZoom(z) { mapZoom = Math.min(MAPZOOM_MAX, Math.max(MAPZOOM_MIN, z)); applyMapZoom(); }
  /* Step 1 port: reads cmsRoutes (real pages, studioRoutes() in js/admin/studio.js) and
     realLinkIndex() (real manifest 'link' fields, see above) instead of the deleted dense
     pages()/linkIndex(). Zoom/pan UI and interaction (applyMapZoom/setMapZoom/mapZoom,
     the SVG link-drawing, hover-to-preview) are unchanged -- only the data underneath is
     real now. mapFocus/pos are keyed by real route path strings instead of dense ids. */
  function renderSitemap() {
    const box = $('mapView'); box.textContent = '';
    const li = realLinkIndex(), ps = state.cmsRoutes, home = '/';
    const inbound = new Map(), outbound = new Map(), broken = new Map(), navTargets = new Set();
    for (const l of li) {
      if (!l.ok) { broken.set(l.src, (broken.get(l.src) || 0) + 1); continue; }
      if (l.src === 'nav') navTargets.add(l.tgt);
      if (l.tgt !== l.src || l.src === 'nav') inbound.set(l.tgt, (inbound.get(l.tgt) || 0) + 1);
      if (l.src !== 'nav' && l.tgt !== l.src) outbound.set(l.src, (outbound.get(l.src) || 0) + 1);
    }
    const bar = document.createElement('div'); bar.className = 'smbar';
    const totalBroken = [...broken.values()].reduce((a, b) => a + b, 0), orphans = ps.filter((p) => p.path !== home && !inbound.get(p.path)).length;
    /* "not linked from other pages" is a fact, not an alarm (P2-3); a broken link stays danger */
    bar.innerHTML = `<h2>Site map</h2><span class="sum">${ps.length} pages · ${ps.filter((p) => p.seoArticle).length} articles · ${li.filter((l) => l.ok).length} links${totalBroken ? ` · <b style="color:var(--danger)">${totalBroken} broken</b>` : ''}${orphans ? ` · ${orphans} not linked from other pages` : ''}</span><span class="spacer"></span><span class="smlegend"><span><i style="background:var(--reference)"></i>Links out</span><span><i style="background:var(--override)"></i>Links in</span></span>`;
    /* the way back to the page, where the person is looking (the views live in the More menu) */
    const back = document.createElement('button'); back.type = 'button'; back.className = 'btn small'; back.id = 'mapBack'; back.textContent = 'Back to the page'; back.addEventListener('click', () => setView('design'));
    bar.prepend(back);
    const zoomWrap = document.createElement('span'); zoomWrap.className = 'smzoomctl';
    const zOut = document.createElement('button'); zOut.className = 'btn small'; zOut.type = 'button'; zOut.textContent = '−'; zOut.setAttribute('aria-label', 'Zoom out'); zOut.addEventListener('click', () => setMapZoom(mapZoom - MAPZOOM_STEP));
    const zPct = document.createElement('button'); zPct.className = 'btn small smzoom-pct'; zPct.type = 'button'; zPct.textContent = Math.round(mapZoom * 100) + '%'; zPct.title = 'Reset zoom'; zPct.addEventListener('click', () => setMapZoom(1));
    const zIn = document.createElement('button'); zIn.className = 'btn small'; zIn.type = 'button'; zIn.textContent = '+'; zIn.setAttribute('aria-label', 'Zoom in'); zIn.addEventListener('click', () => setMapZoom(mapZoom + MAPZOOM_STEP));
    zoomWrap.append(zOut, zPct, zIn);
    bar.append(zoomWrap); box.appendChild(bar);
    const hint = document.createElement('p'); hint.className = 'hint'; hint.style.marginBottom = '12px'; hint.textContent = 'Hover or click a page to see its links. Pages in the header or footer are reachable from everywhere.'; box.appendChild(hint);
    // layout: home on top, first-level pages in columns, deeper pages under their parent
    const W = 196, H = 118, GX = 26, GY = 56;
    const level1 = ps.filter((p) => p.path !== home && p.path.split('/').filter(Boolean).length === 1);
    const deeper = ps.filter((p) => p.path !== home && !level1.includes(p));
    const kids = new Map();
    for (const p of deeper) { const parentPath = '/' + p.path.split('/').filter(Boolean)[0]; let pp = level1.find((r) => r.path === parentPath); if (!pp) { level1.push(p); continue; } (kids.get(pp.path) || kids.set(pp.path, []).get(pp.path)).push(p); }
    const cols = Math.max(1, level1.length), totalW = cols * W + (cols - 1) * GX;
    const pos = new Map(); pos.set(home, { x: (totalW - W) / 2, y: 0 });
    level1.forEach((p, i) => { const x = i * (W + GX); pos.set(p.path, { x, y: H + GY }); (kids.get(p.path) || []).forEach((k, j) => pos.set(k.path, { x, y: (H + GY) * 2 + j * (H + 16) })); });
    let maxY = 0; for (const v of pos.values()) maxY = Math.max(maxY, v.y + H);
    const sc = document.createElement('div'); sc.className = 'smscroll';
    const wrap = document.createElement('div'); wrap.className = 'smzoom'; wrap.dataset.w = totalW; wrap.dataset.h = maxY;
    const cv = document.createElement('div'); cv.className = 'smcanvas'; cv.style.width = totalW + 'px'; cv.style.height = maxY + 'px';
    const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'); svg.setAttribute('width', totalW); svg.setAttribute('height', maxY);
    svg.innerHTML = `<defs><marker id="ah-out" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8z" fill="var(--reference)"/></marker><marker id="ah-in" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8z" fill="var(--override)"/></marker></defs>`;
    const path = (d, stroke, extra) => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', stroke); for (const [k, v] of Object.entries(extra || {})) p.setAttribute(k, v); svg.appendChild(p); return p; };
    // hierarchy (quiet)
    const hp = pos.get(home);
    for (const p of level1) { const q = pos.get(p.path); if (!q) continue; path(`M${hp.x + W / 2} ${hp.y + H} V${hp.y + H + GY / 2} H${q.x + W / 2} V${q.y}`, 'var(--rule)', { 'stroke-width': 1.5 }); }
    for (const [p, ks] of kids) { const q = pos.get(p); ks.forEach((k) => { const r = pos.get(k.path); path(`M${q.x + 14} ${q.y + H} V${r.y + H / 2} H${r.x}`, 'var(--rule)', { 'stroke-width': 1.5 }); }); }
    const linkLayer = document.createElementNS(NS, 'g'); svg.appendChild(linkLayer);
    const drawLinks = (focus) => {
      linkLayer.textContent = '';
      if (!focus) return;
      const seen = new Set();
      for (const l of li) {
        if (!l.ok || l.tgt === l.src) continue;
        const out = l.src === focus && l.src !== 'nav', inn = l.tgt === focus && l.src !== 'nav';
        if (!out && !inn) continue;
        const key = l.src + '>' + l.tgt; if (seen.has(key)) continue; seen.add(key);
        const a = pos.get(l.src), b = pos.get(l.tgt); if (!a || !b) continue;
        const ax = a.x + W / 2, ay = a.y + H / 2, bx = b.x + W / 2, by = b.y + H / 2;
        const ex = bx + (ax < bx ? -W / 2 : ax > bx ? W / 2 : 0), ey = by + (ax === bx ? (ay < by ? -H / 2 : H / 2) : 0);
        const p = document.createElementNS(NS, 'path'); p.setAttribute('d', `M${ax} ${ay} C${ax} ${(ay + ey) / 2 - 30} ${ex} ${(ay + ey) / 2 - 30} ${ex} ${ey}`);
        p.setAttribute('fill', 'none'); p.setAttribute('stroke', out ? 'var(--reference)' : 'var(--override)'); p.setAttribute('stroke-width', 2); p.setAttribute('marker-end', `url(#ah-${out ? 'out' : 'in'})`); p.setAttribute('opacity', .85);
        linkLayer.appendChild(p);
      }
    };
    cv.appendChild(svg);
    for (const route of ps) {
      const pg = route.path, q = pos.get(pg); if (!q) continue;
      const c = document.createElement('div'); c.className = 'smcard' + (pg === state.cmsCurrentRoute ? ' cur' : ''); c.tabIndex = 0; c.setAttribute('role', 'button'); c.setAttribute('aria-pressed', String(pg === mapFocus));
      c.style.left = q.x + 'px'; c.style.top = q.y + 'px'; c.style.minHeight = H + 'px';
      const chips = [];
      if (pg === home) chips.push('<span class="chip info">Home</span>');
      if (navTargets.has(pg)) chips.push('<span class="chip info">In navigation</span>');
      if (pg !== home && !inbound.get(pg)) chips.push('<span class="chip">Not linked from other pages</span>');
      if (broken.get(pg)) chips.push(`<span class="chip bad">${broken.get(pg)} broken link${broken.get(pg) > 1 ? 's' : ''}</span>`);
      c.innerHTML = `<div class="t">${ic(route.seoArticle ? 'article' : pg === home ? 'home' : 'page')}<span></span></div><code></code><div class="st">${outbound.get(pg) || 0} out · ${inbound.get(pg) || 0} in</div><div class="chips">${chips.join('')}</div>`;
      c.querySelector('.t span').textContent = route.title || pg; c.querySelector('code').textContent = pg;
      const open = document.createElement('button'); open.className = 'btn small open'; open.innerHTML = ic('design', 'sm') + 'Open'; open.addEventListener('click', (e) => { e.stopPropagation(); openRoute(pg); });
      c.appendChild(open);
      c.addEventListener('pointerenter', () => drawLinks(pg));
      c.addEventListener('pointerleave', () => drawLinks(mapFocus));
      c.addEventListener('click', () => { mapFocus = mapFocus === pg ? '' : pg; for (const x of cv.querySelectorAll('.smcard')) x.setAttribute('aria-pressed', 'false'); c.setAttribute('aria-pressed', String(mapFocus === pg)); drawLinks(mapFocus); });
      c.addEventListener('dblclick', () => openRoute(pg));
      c.addEventListener('keydown', (e) => { if (e.key === 'Enter') openRoute(pg); });
      cv.appendChild(c);
    }
    drawLinks(mapFocus);
    wrap.appendChild(cv); sc.appendChild(wrap); box.appendChild(sc);
    sc.addEventListener('wheel', (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      setMapZoom(mapZoom + (e.deltaY < 0 ? MAPZOOM_STEP : -MAPZOOM_STEP));
    }, { passive: false });
    applyMapZoom();
  }
  /* The four views of the one site: 'design' (the canvas), 'map' (this sitemap), 'theme'
     (the site-wide settings docked beside the canvas, which stays live so a colour or a font
     shows on the real page as it is picked) 'world' (the 3D world's controls, docked the
     same way; js/admin/panels.js mounts them) and 'skin' (the Skin lab, docked the same way). */
  function setView(v) {
    if (v !== 'design' && v !== 'map' && v !== 'theme' && v !== 'world' && v !== 'skin') return;
    if (state.view === 'skin' && v !== 'skin' && A.skinLabLeave) A.skinLabLeave();   /* the review skin does not stay on the canvas you edit */
    /* Site style docks on the right edge, the edge the docked overlays (Page settings, Publishing
       status, Version history: level 'sheet', js/admin/overlay.js) float over. Chosen while one of
       them was open, it opened UNDER it -- at 1500px the dock [1060,1500] lay beneath Versions
       [1080,1500] and showed as a 20px sliver, so choosing it seemed to do nothing (2026-10-19;
       tests/cms-site-style-not-under-sheet.cjs, tests/browser/versions.mjs). What the person just
       chose is the one on top: choosing Site style closes them, as their close button would. */
    if ((v === 'theme' || v === 'world' || v === 'skin') && A.overlay) A.overlay.closeLevel('sheet', 'view');
    state.view = v;
    $('shell').classList.toggle('mapview', v === 'map'); $('shell').classList.toggle('themeview', v === 'theme' || v === 'world' || v === 'skin');
    $('designView').hidden = v === 'map'; $('mapView').hidden = v !== 'map'; $('themeView').hidden = v !== 'theme'; $('worldView').hidden = v !== 'world'; $('skinView').hidden = v !== 'skin';
    if (v === 'map') { mapFocus = state.cmsCurrentRoute; mapZoom = 1; renderSitemap(); } else layoutStage();
    if (v === 'theme') mountThemeView();
    if (v === 'world') mountWorldView();
    if (v === 'skin') mountSkinView();
    syncHeader(); schedule();
  }
  A.provide({ renderSitemap: renderSitemap, setView: setView });
})();
