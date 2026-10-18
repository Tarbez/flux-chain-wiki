/* =====================================================================
   ADMIN EDITOR · LEFT RAIL (js/admin/rail.js)
   ---------------------------------------------------------------------
   Owns: the structure rail beside the canvas -- the real Layers tree (from the
   preview's cmsRealTree report), "Groups on this page", the Pages list with its
   orphan flags (realLinkIndex), the Layers/Pages/Library tabs, and folding the rail.
   Must not: walk anything but what the preview reported (state.cmsTree/cmsGroups) --
   there is no second document tree here.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, $ = A.$, esc = A.esc, ic = A.ic, postCmsSetLabel = A.postCmsSetLabel,
      postCmsLayoutCommand = A.postCmsLayoutCommand, postCmsSelectKey = A.postCmsSelectKey,
      postCmsSelectGroup = A.postCmsSelectGroup, openRoute = A.openRoute, schedule = A.schedule,
      layoutStage = A.layoutStage;

  /* =========================================================================
     Left rail: layers and pages
     ========================================================================= */
  const collapsedLayers = new Set();
  /* STEP 1 CLEANUP: renderLayers() (the dense-array walker, with its own drag-to-reorder via
     commitSeq) is deleted outright. renderLayersPane() below now always calls
     renderConnectedLayers() -- the real, connected-mode Layers tree (Part B) that already
     existed alongside it and shares zero code with it. */
  /* A real HTML tag has no TYPE_ICON slot (that array is indexed by the standalone dense-node
     TYPE enum) -- a small, purely cosmetic lookup, not a structural decision, so an unlisted
     tag just falls back to the generic 'box' icon rather than needing every real tag covered. */
  const CMS_TAG_ICON = { header: 'section', main: 'page', footer: 'section', section: 'section', article: 'article', nav: 'row', aside: 'box', div: 'box', h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', p: 'text', a: 'link', button: 'button', img: 'image', svg: 'image', canvas: 'spark', video: 'image', picture: 'image', figure: 'image', form: 'field', ul: 'list', ol: 'list', li: 'box', span: 'text', strong: 'text', small: 'text', table: 'list', label: 'field' };
  /* Part B of the follow-up Studio plan: the connected-mode equivalent of renderLayers(),
     driven by cmsRealTree's payload (the real rendered DOM, reported by js/main.js) instead of
     the standalone dense-node tree. Deliberately NOT built by extending renderLayers() itself:
     that function is entangled with drag-reorder/dataset.id-as-number concepts a real DOM
     tree can't support (real elements can't be freely reordered the way standalone canvas
     nodes can) -- a parallel function keeps that entanglement out, while still reusing the
     exact same row markup conventions (.layer-toggle, role=treeitem, aria-selected, depth
     indentation via paddingLeft, the collapsedLayers Set -- which already tolerates the real
     string keys used here just as well as the standalone numeric ids it was written for). */
  function renderConnectedLayers() {
    const ul = $('layers'); if (ul.hidden) return; ul.textContent = '';
    const isSelectedKey = (key) => (state.cmsExactSelection && state.cmsExactSelection.key === key) || state.cmsExactSelections.some((s) => s && s.key === key);
    const walk = (row, depth) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'treeitem'); li.setAttribute('aria-selected', String(isSelectedKey(row.key)));
      li.style.paddingLeft = 6 + depth * 12 + 'px';
      if (row.hidden) li.style.opacity = '.55';
      li.innerHTML = `${row.hasChildren ? `<button class="layer-toggle" type="button" aria-label="${collapsedLayers.has(row.key) ? 'Expand' : 'Collapse'} ${esc(row.label)}" aria-expanded="${!collapsedLayers.has(row.key)}"></button>` : '<span class="layer-spacer"></span>'}${ic(CMS_TAG_ICON[row.tag] || 'box')}<input class="ctl nm-edit" aria-label="Layer name"><button class="btn icon quiet row-act eye-toggle" type="button" aria-pressed="${String(!!row.hidden)}" aria-label="${row.hidden ? 'Show' : 'Hide'} ${esc(row.label)}" title="${row.hidden ? 'Show this element' : 'Hide this element'}"></button>`;
      const nameInput = li.querySelector('.nm-edit');
      nameInput.value = row.label; nameInput.style.flex = '1 1 auto'; nameInput.style.minWidth = '0'; nameInput.style.padding = '2px 5px';
      nameInput.addEventListener('click', (event) => event.stopPropagation());
      nameInput.addEventListener('change', () => postCmsSetLabel(row.key, nameInput.value.trim()));
      const eyeBtn = li.querySelector('.eye-toggle');
      eyeBtn.innerHTML = ic('eye', 'sm'); if (row.hidden) eyeBtn.style.opacity = '1';
      eyeBtn.addEventListener('click', (event) => { event.stopPropagation(); postCmsLayoutCommand({ display: row.hidden ? null : 'hide' }, row.key); });
      if (row.hasChildren) li.querySelector('.layer-toggle').addEventListener('click', (event) => { event.stopPropagation(); if (collapsedLayers.has(row.key)) collapsedLayers.delete(row.key); else collapsedLayers.add(row.key); renderConnectedLayers(); });
      li.addEventListener('click', (event) => { if (event.target.closest('.layer-toggle') || event.target.closest('.eye-toggle') || event.target.closest('.nm-edit')) return; postCmsSelectKey(row.key); });
      ul.appendChild(li);
      if (!collapsedLayers.has(row.key)) row.children.forEach((child) => walk(child, depth + 1));
    };
    if (!state.cmsTree.length) { const empty = document.createElement('li'); empty.className = 'hint'; empty.style.padding = '8px 10px'; empty.textContent = 'No layout-tagged elements on this page yet.'; ul.appendChild(empty); return; }
    state.cmsTree.forEach((row) => walk(row, 0));
  }
  /* The Layers tab (and the main render loop below) always goes through this one dispatcher
     instead of calling renderConnectedLayers() directly -- room for a future second branch
     without a bespoke call site. Step 4: restrictMode's canvas-mode placeholder branch is
     gone (canvas-transitions is a selection-independent popover now, see
     openCanvasTransitionsPopover() in js/admin/header.js, with nothing left for the Layers tab to override);
     renderGroupsBrowse() (the relocated "Groups on this page" list, Step 4) is painted here
     too since every call site that repaints the Layers tree also needs it kept in sync. */
  function renderLayersPane() {
    renderGroupsBrowse();
    renderConnectedLayers();
  }
  /* "Groups on this page": a page-level browse/jump list (a real, clickable list of the
     current route's groups, click -> postCmsSelectGroup) that needs no current selection to
     make sense -- unlike every taxonomy section in the new #selToolbar (Step 4), which only
     exists because something is selected. Ported verbatim from the old 'cms-groups'
     accordion that used to sit at the top of renderElementPane(), just a new home. */
  function renderGroupsBrowse() {
    const box = $('groupsBrowse'); if (!box) return;
    box.textContent = '';
    if (!state.cmsGroups.length) { box.hidden = true; return; }
    box.hidden = false;
    const head = document.createElement('div'); head.className = 'groups-browse-head'; head.textContent = `Groups on this page (${state.cmsGroups.length})`; box.appendChild(head);
    const currentGroupId = state.cmsExactSelection && state.cmsExactSelection.key && state.cmsExactSelection.key.indexOf('group:') === 0 ? state.cmsExactSelection.key.slice(6) : null;
    for (const g of state.cmsGroups) {
      const row = document.createElement('button'); row.type = 'button'; row.className = 'myrow'; row.style.width = '100%'; row.style.marginBottom = '4px'; row.style.cursor = 'pointer';
      row.innerHTML = `${ic('box', 'sm')}<span></span><small></small>`;
      row.querySelector('span').textContent = g.label; row.querySelector('small').textContent = `${g.members} layers`;
      if (g.id === currentGroupId) { row.style.borderColor = 'var(--accent)'; row.style.color = 'var(--accent)'; }
      row.addEventListener('click', () => postCmsSelectGroup(g.id));
      box.appendChild(row);
    }
  }
  /* Real link index for the Pages tab/Sitemap/design-checks (Step 1 port): every manifest
     'link'-kind field value is tagged route:<key> / doc:<path> / url:<address>
     (js/content/manifest.js; parsed exactly like js/ark/dash-kit.js's resolveLinkField), so an
     internal "route:" link is resolved against cmsRoutes' own key -> path map. Replaces the
     deleted dense linkIndex(), which walked the dense tree's own href strings instead. */
  function realLinkIndex() {
    const out = [], manifests = (state.cmsSourceSite && state.cmsSourceSite.manifests) || [];
    const byKey = new Map(state.cmsRoutes.map((r) => [r.key, r.path]));
    for (const m of manifests) {
      const src = m.route || 'nav';
      for (const field of Object.values(m.fields || {})) {
        if (field.kind !== 'link') continue;
        const mm = /^(route|doc|url):(\S+)/.exec(field.value || '');
        if (!mm) continue;
        if (mm[1] === 'url') continue; // external, not part of the internal site graph
        const tgt = mm[1] === 'route' ? byKey.get(mm[2]) : mm[2];
        out.push({ src, tgt: tgt || null, ok: !!tgt });
      }
    }
    return out;
  }
  function renderPages() {
    const ul = $('pages'); if ($('pagesPane').hidden) return; ul.textContent = '';
    const inbound = new Map(); for (const l of realLinkIndex()) if (l.ok && l.tgt !== l.src) inbound.set(l.tgt, (inbound.get(l.tgt) || 0) + 1);
    const sorted = state.cmsRoutes.slice().sort((a, b) => a.path.localeCompare(b.path));
    for (const route of sorted) {
      const depth = Math.max(0, route.path.split('/').filter(Boolean).length - 1);
      const li = document.createElement('li'); li.setAttribute('aria-selected', String(route.path === state.cmsCurrentRoute)); li.style.paddingLeft = 6 + depth * 14 + 'px';
      const orphan = route.path !== '/' && !inbound.get(route.path);
      li.innerHTML = `${ic(route.seoArticle ? 'article' : route.path === '/' ? 'home' : 'page')}<span class="nm"></span>${orphan ? '<span class="tag" style="color:var(--warn);border-color:currentColor" title="No page links here">orphan</span>' : ''}<span class="sub"></span>`;
      li.querySelector('.nm').textContent = route.title || route.path; li.querySelector('.sub').textContent = route.path;
      /* a row that opens a page is a button to the keyboard and to assistive tech too -- it was a
         bare clickable <li>, unreachable by Tab (regression: tests/cms-pages-rows-are-buttons.cjs) */
      li.setAttribute('role', 'button'); li.tabIndex = 0; li.title = 'Open ' + route.path + ' on the canvas';
      li.addEventListener('click', () => openRoute(route.path));
      li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRoute(route.path); } });
      ul.appendChild(li);
    }
  }
  function showLeft(which) { $('tabLayers').setAttribute('aria-selected', String(which === 'layers')); $('tabPages').setAttribute('aria-selected', String(which === 'pages')); $('tabLib').setAttribute('aria-selected', String(which === 'lib')); $('layers').hidden = which !== 'layers'; $('pagesPane').hidden = which !== 'pages'; $('libPane').hidden = which !== 'lib'; schedule(); }
  $('tabLib').addEventListener('click', () => showLeft('lib'));
  $('tabLayers').addEventListener('click', () => showLeft('layers'));
  $('tabPages').addEventListener('click', () => showLeft('pages'));

  /* The structure rail (Layers / Pages / Library) folds away so the canvas can take the full
     width; remembered per browser, a convenience only. */
  function setLeftRail(open) {
    $('shell').classList.toggle('rail-closed', !open);
    const b = $('btnLeftRail'); b.setAttribute('aria-pressed', String(open));
    b.title = open ? 'Hide the Layers / Pages / Library panel' : 'Show the Layers / Pages / Library panel';
    try { localStorage.setItem('defxn-studio-rail', open ? 'open' : 'closed'); } catch (e) {}
    layoutStage();
  }
  $('btnLeftRail').addEventListener('click', () => setLeftRail($('shell').classList.contains('rail-closed')));
  try { if (localStorage.getItem('defxn-studio-rail') === 'closed') { $('shell').classList.add('rail-closed'); $('btnLeftRail').setAttribute('aria-pressed', 'false'); } } catch (e) {}
  A.provide({ CMS_TAG_ICON: CMS_TAG_ICON, realLinkIndex: realLinkIndex, renderLayersPane: renderLayersPane,
      renderPages: renderPages, showLeft: showLeft });
})();
