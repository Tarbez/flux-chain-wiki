/* =====================================================================
   ADMIN EDITOR · LEFT RAIL (js/admin/rail.js)
   ---------------------------------------------------------------------
   Owns: the one rail beside the canvas and its tabs -- Pages (the site tree: every page,
   theory page, article and other route, with dirty dots, orphan flags from realLinkIndex,
   and each row's Fields / Delete), Layers (the real tree from the preview's cmsRealTree
   report, and "Groups on this page"), Library (js/admin/library.js draws it), Media and
   Vault (mounted by js/admin/panels.js) -- which tab each lens opens, and folding the rail
   (a drawer on a phone).
   The Pages tab is where Content mode's sidebar list and the old Studio's Pages tab merged
   (2026-10-18): one list of the site, and selecting a row shows that page on the canvas.
   Must not: walk any element tree but what the preview reported (state.cmsTree/cmsGroups).
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, $ = A.$, esc = A.esc, ic = A.ic, postCmsSetLabel = A.postCmsSetLabel,
      postCmsLayoutCommand = A.postCmsLayoutCommand, postCmsSelectKey = A.postCmsSelectKey,
      postCmsSelectGroup = A.postCmsSelectGroup, openRoute = A.openRoute, schedule = A.schedule,
      layoutStage = A.layoutStage, h = A.h, dirty = A.dirty, dirtyA = A.dirtyA, hasShape = A.hasShape;
  /* defined by files loaded after this one: resolved when called */
  var mountRailPane = A.later('mountRailPane'), openPageFields = A.later('openPageFields'),
      select = A.later('select'), selectArticle = A.later('selectArticle'), deleteItem = A.later('deleteItem');

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
  /* where a derived layer name came from (ArkLayout.layerName's `from`), for the name's tooltip */
  const LAYER_NAME_FROM = { group: 'group name', component: 'component block', state: 'state label', aria: 'accessible name (aria-label, alt or title)',
    landmark: 'landmark and class', role: 'role and class', heading: 'heading', text: 'own words', hint: 'id or class', tag: 'tag' };
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
    const ul = $('layers'); if ($('layersPane').hidden) return; ul.textContent = '';
    const isSelectedKey = (key) => (state.cmsExactSelection && state.cmsExactSelection.key === key) || state.cmsExactSelections.some((s) => s && s.key === key);
    const walk = (row, depth) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'treeitem'); li.setAttribute('aria-selected', String(isSelectedKey(row.key)));
      li.dataset.key = row.key; li.dataset.from = row.from || '';
      li.style.paddingLeft = 6 + depth * 12 + 'px';
      if (row.hidden) li.style.opacity = '.55';
      /* the row's name: a stored one (Rename) or one derived from what the element is
         (ArkLayout.layerName, in the preview); its tag stays beside it, small, so "Not one chain"
         still reads as an h1. Typing a name stores it; clearing it goes back to the derived one. */
      li.innerHTML = `${row.hasChildren ? `<button class="layer-toggle" type="button" aria-label="${collapsedLayers.has(row.key) ? 'Expand' : 'Collapse'} ${esc(row.label)}" aria-expanded="${!collapsedLayers.has(row.key)}"></button>` : '<span class="layer-spacer"></span>'}${ic(CMS_TAG_ICON[row.tag] || 'box')}<input class="ctl nm-edit" aria-label="Layer name"><span class="layer-tag" aria-hidden="true"></span><button class="btn icon quiet row-act eye-toggle" type="button" aria-pressed="${String(!!row.hidden)}" aria-label="${row.hidden ? 'Show' : 'Hide'} ${esc(row.label)}" title="${row.hidden ? 'Show this element' : 'Hide this element'}"></button>`;
      const nameInput = li.querySelector('.nm-edit');
      nameInput.value = row.label;
      nameInput.dataset.named = row.named ? 'true' : 'false';
      nameInput.title = row.named ? `Your name for this ${row.tag}. Clear it to go back to the derived name.` : `Named from its ${LAYER_NAME_FROM[row.from] || 'tag'}. Type to rename it.`;
      li.querySelector('.layer-tag').textContent = row.tag;
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
  /* ---- Pages: the one site tree -------------------------------------------------------------
     Groups derived from the drafts, in the manifests' own group order (ArkManifest.groups: the
     site chrome, the pages, the theory pages), then the articles, then every other route the
     site serves (a page module with no manifest: its words are in code, so it has no fields).
     A row's main button shows its page on the canvas; Fields opens its whole form in the Page
     fields sheet; Delete is offered where deleting is possible (theory pages, articles). */
  const GROUP_NAMES = { site: 'Site chrome', page: 'Pages', theory: 'Theory pages' };
  function renderPages() {
    const ul = $('pages'); if ($('pagesPane').hidden) return;
    const keepFocus = ul.contains(document.activeElement) ? document.activeElement.dataset.row : null;
    ul.textContent = '';
    const inbound = new Map(); for (const l of realLinkIndex()) if (l.ok && l.tgt !== l.src) inbound.set(l.tgt, (inbound.get(l.tgt) || 0) + 1);
    const covered = new Set();
    const groupHead = (text, icon) => { const li = h('li', { class: 'side-group', 'data-icon': icon, role: 'presentation', text }); ul.appendChild(li); };
    const row = (r) => {
      covered.add(r.path);
      const li = h('li', { class: 'tree-row', 'aria-selected': String(r.on) });
      const open = h('button', { type: 'button', class: 'tree-open', 'data-row': r.key, 'data-item': r.fields ? r.fields.kind + ':' + r.fields.id : null, 'data-path': r.path, title: 'Open ' + r.path + ' on the canvas' });
      open.innerHTML = `${ic(r.icon)}<span class="nm"></span><span class="sub"></span>`;
      open.querySelector('.nm').textContent = r.title; open.querySelector('.sub').textContent = r.path;
      open.addEventListener('click', r.onOpen);
      li.appendChild(open);
      if (r.orphan) li.appendChild(h('span', { class: 'tag orphan', role: 'img', 'aria-label': 'Orphan: no page links here', title: 'Orphan: no page links here', text: 'orphan' }));
      if (r.dirty) li.appendChild(h('span', { class: 'dot', title: r.dirtyTitle || 'Unsaved changes' }));
      const acts = h('span', { class: 'row-acts' });
      if (r.fields) {
        const f = h('button', { type: 'button', class: 'btn icon quiet row-act', 'aria-label': 'Fields of ' + r.title, title: 'Page fields: every field of ' + r.title });
        f.innerHTML = ic('list', 'sm');
        f.addEventListener('click', () => { r.onOpen(); openPageFields({ kind: r.fields.kind, id: r.fields.id, anchor: f }); });
        acts.appendChild(f);
      }
      if (r.del) {
        const d = h('button', { type: 'button', class: 'btn icon quiet row-act danger', 'aria-label': 'Delete ' + r.title, title: 'Delete ' + r.title + ' (asks first)' });
        d.innerHTML = ic('trash', 'sm');
        d.addEventListener('click', () => deleteItem(r.del.kind, r.del.id));
        acts.appendChild(d);
      }
      li.appendChild(acts);
      ul.appendChild(li);
    };
    const orphanOf = (path) => path !== '/' && !inbound.get(path);
    const groups = (window.ArkManifest && window.ArkManifest.groups) || ['site', 'page', 'theory'];
    groups.forEach((group) => {
      const ids = state.ids.filter((id) => state.drafts[id] && state.drafts[id].group === group);
      if (!ids.length) return;
      groupHead(GROUP_NAMES[group] || group, 'page');
      ids.forEach((id) => {
        const m = state.drafts[id];
        row({ key: 'page:' + id, path: m.route || '/', title: m.title || id, icon: group === 'site' ? 'section' : m.route === '/' ? 'home' : 'page',
          on: state.kind === 'page' && state.current === id && m.route === state.cmsCurrentRoute,
          dirty: dirty(id), dirtyTitle: hasShape(id) ? 'Unsaved changes, including its images or shared shape tuning' : 'Unsaved changes',
          orphan: group !== 'site' && orphanOf(m.route), fields: { kind: 'page', id }, del: group === 'theory' ? { kind: 'page', id } : null,
          onOpen: () => { closeDrawer(); select(id); } });
      });
    });
    if (state.slugs.length) groupHead('Articles', 'article');
    state.slugs.forEach((slug) => {
      const a = state.aDrafts[slug] || {}, path = '/learnings/' + slug;
      row({ key: 'article:' + slug, path, title: a.title || slug, icon: 'article',
        on: state.kind === 'article' && state.aCurrent === slug && path === state.cmsCurrentRoute,
        dirty: dirtyA(slug), orphan: orphanOf(path), fields: { kind: 'article', id: slug }, del: { kind: 'article', id: slug },
        onOpen: () => { closeDrawer(); selectArticle(slug); } });
    });
    const others = state.cmsRoutes.filter((r) => !covered.has(r.path)).sort((a, b) => a.path.localeCompare(b.path));
    if (others.length) groupHead('Other pages', 'page');
    for (const route of others) {
      row({ key: 'route:' + route.path, path: route.path, title: route.title || route.path, icon: route.seoArticle ? 'article' : 'page',
        on: route.path === state.cmsCurrentRoute, orphan: orphanOf(route.path),
        onOpen: () => { closeDrawer(); openRoute(route.path); } });
    }
    /* a row repainted under the keyboard keeps the focus (a dirty dot appearing re-draws the tree) */
    if (keepFocus) { const again = ul.querySelector(`[data-row="${CSS.escape(keepFocus)}"]`); if (again) again.focus({ preventScroll: true }); }
  }
  /* an edit anywhere changes a dirty dot: repaint the tree once per frame (js/admin/editor.js
     announces every draft edit as `ark-cms-drafts`) */
  let pagesQueued = false;
  document.addEventListener('ark-cms-drafts', () => { if (pagesQueued) return; pagesQueued = true; requestAnimationFrame(() => { pagesQueued = false; renderPages(); }); });

  /* ---- the tabs ---------------------------------------------------------------------------
     Which tab each lens opens is remembered (state.railTab, per browser): Pages in the Content
     lens and Layers in the Design lens until changed. */
  const TABS = { pages: ['tabPages', 'pagesPane'], layers: ['tabLayers', 'layersPane'], lib: ['tabLib', 'libPane'], media: ['tabMedia', 'mediaPane'], vault: ['tabVault', 'vaultPane'] };
  function showLeft(which, opts) {
    if (!TABS[which]) which = 'pages';
    for (const [key, ids] of Object.entries(TABS)) { $(ids[0]).setAttribute('aria-selected', String(key === which)); $(ids[0]).tabIndex = key === which ? 0 : -1; $(ids[1]).hidden = key !== which; }
    if (!opts || opts.remember !== false) {
      state.railTab[state.lens] = which;
      try { localStorage.setItem('defxn-cms-rail-tab', JSON.stringify(state.railTab)); } catch (e) { /* a convenience only */ }
    }
    if (which === 'media' || which === 'vault') mountRailPane(which);
    if (which === 'pages') renderPages();
    schedule();
  }
  for (const [key, ids] of Object.entries(TABS)) $(ids[0]).addEventListener('click', () => showLeft(key));
  /* arrow keys move between the tabs (one tab stop) */
  $('studioLeft').querySelector('.tabs').addEventListener('keydown', (e) => {
    const keys = Object.keys(TABS), i = keys.findIndex((k) => $(TABS[k][0]) === document.activeElement);
    if (i < 0 || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
    e.preventDefault();
    const next = keys[(i + (e.key === 'ArrowRight' ? 1 : keys.length - 1)) % keys.length];
    showLeft(next); $(TABS[next][0]).focus();
  });

  /* ---- folding the rail -------------------------------------------------------------------
     Wide: the rail folds away so the canvas takes the full width (remembered per browser, a
     convenience only). Narrow (a phone, <= 860px): the rail is a drawer over the canvas, closed
     until asked for, and closed again once a page is chosen. */
  const narrow = window.matchMedia('(max-width: 860px)');
  function syncRailButton() {
    const open = narrow.matches ? $('shell').classList.contains('drawer-open') : !$('shell').classList.contains('rail-closed');
    const b = $('btnLeftRail'); b.setAttribute('aria-pressed', String(open));
    b.title = (open ? 'Hide' : 'Show') + ' the Pages / Layers / Library / Media / Vault panel';
    $('railScrim').hidden = !(narrow.matches && open);
  }
  function setLeftRail(open) {
    if (narrow.matches) $('shell').classList.toggle('drawer-open', open);
    else {
      $('shell').classList.toggle('rail-closed', !open);
      try { localStorage.setItem('defxn-studio-rail', open ? 'open' : 'closed'); } catch (e) {}
    }
    syncRailButton(); layoutStage(); schedule();
  }
  function closeDrawer() { if (narrow.matches && $('shell').classList.contains('drawer-open')) setLeftRail(false); }
  $('btnLeftRail').addEventListener('click', () => setLeftRail(narrow.matches ? !$('shell').classList.contains('drawer-open') : $('shell').classList.contains('rail-closed')));
  $('railScrim').addEventListener('click', () => setLeftRail(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && narrow.matches && $('shell').classList.contains('drawer-open') && !state.popEl) setLeftRail(false); });
  narrow.addEventListener('change', () => { $('shell').classList.remove('drawer-open'); syncRailButton(); layoutStage(); });
  try { if (localStorage.getItem('defxn-studio-rail') === 'closed') $('shell').classList.add('rail-closed'); } catch (e) {}
  syncRailButton();
  A.provide({ CMS_TAG_ICON: CMS_TAG_ICON, realLinkIndex: realLinkIndex, renderLayersPane: renderLayersPane,
      renderPages: renderPages, setLeftRail: setLeftRail, showLeft: showLeft });
})();
