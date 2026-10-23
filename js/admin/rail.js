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
  const collapsedLayers = new Set(), seededLayers = new Set();
  let revealedKey = '';
  /* STEP 1 CLEANUP: renderLayers() (the dense-array walker, with its own drag-to-reorder via
     commitSeq) is deleted outright. renderLayersPane() below now always calls
     renderConnectedLayers() -- the real, connected-mode Layers tree (Part B) that already
     existed alongside it and shares zero code with it. */
  /* A real HTML tag has no TYPE_ICON slot (that array is indexed by the standalone dense-node
     TYPE enum) -- a small, purely cosmetic lookup, not a structural decision, so an unlisted
     tag just falls back to the generic 'box' icon rather than needing every real tag covered. */
  const CMS_TAG_ICON = { header: 'section', main: 'page', footer: 'section', section: 'section', article: 'article', nav: 'row', aside: 'box', div: 'box', h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', p: 'text', a: 'link', button: 'button', img: 'image', svg: 'image', canvas: 'spark', video: 'image', picture: 'image', figure: 'image', form: 'field', ul: 'list', ol: 'list', li: 'box', span: 'text', strong: 'text', small: 'text', table: 'list', label: 'field' };
  /* where a derived layer name came from (ArkLayout.layerName's `from`), for the name's tooltip --
     in plain words: aria-label, class and tag are the code's names (docs/ux-audit/cms.md P1-2) */
  const LAYER_NAME_FROM = { group: 'group name', component: 'component', state: 'state name', aria: 'label for screen readers',
    landmark: 'place on the page', role: 'purpose on the page', heading: 'heading', text: 'own words', hint: 'name in the site’s code', tag: 'kind of element' };
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
      nameInput.title = row.named ? 'Your name for this layer. Clear it to go back to the name the editor gave it.' : `Named from its ${LAYER_NAME_FROM[row.from] || 'kind of element'}. Type to rename it.`;
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
    if (!state.cmsTree.length) { const empty = document.createElement('li'); empty.className = 'hint'; empty.style.padding = '8px 10px'; empty.textContent = 'Nothing on this page can be styled yet.'; ul.appendChild(empty); return; }
    /* The layers behind the page (the backdrop, its canvases) came first and took the whole tab
       (docs/ux-audit/cms.md P2-4: "Has particle shapes / Ark layer / Ark background host"). The
       outermost row that holds no words at all -- no row under it is named by its own text, a
       heading or an accessible name -- is the backdrop: it starts folded, once per row, so a row
       the person opens stays open. The selected layer is never folded away: its rows open. */
    const WORDS = { text: 1, heading: 1, aria: 1, group: 1, component: 1, state: 1 };
    const holdsWords = (row) => !!WORDS[row.from] || row.named || row.children.some(holdsWords);
    const seed = (row) => {
      if (!row.hasChildren) return;
      if (!holdsWords(row)) { if (!seededLayers.has(row.key)) { seededLayers.add(row.key); collapsedLayers.add(row.key); } return; }
      row.children.forEach(seed);
    };
    state.cmsTree.forEach(seed);
    const opened = (row) => { if (isSelectedKey(row.key)) return true; const hit = row.children.some(opened); if (hit) collapsedLayers.delete(row.key); return hit; };
    /* once per new selection, so a row the person folds afterwards stays folded */
    const selKey = state.cmsExactSelection && state.cmsExactSelection.key;
    if (selKey && selKey !== revealedKey) { revealedKey = selKey; state.cmsTree.forEach(opened); }
    state.cmsTree.forEach((row) => walk(row, 0));
    /* the selected layer is in view (it sat at the bottom edge, or below it) */
    const sel = ul.querySelector('li[aria-selected="true"]'); if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest' });
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
      if (g.id === currentGroupId) { row.style.borderColor = 'var(--reference)'; row.style.color = 'var(--reference)'; }
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
  /* ---- Pages: THE page list -------------------------------------------------------------
     siteList() derives every page the editor can open, grouped and named ONCE; the rail's Pages
     tab draws it as a tree and the header's page switcher (js/admin/header.js) searches it, so a
     page has one name everywhere (docs/ux-audit/cms.md P1-3) and one list to find it in (P1-4).
     The name is the draft's own title (what Page settings edits), else the page module's
     catalog title, else its address in words -- never a raw slug, never the H1 of the moment.
     Groups, in the order a person looks for them: the main pages, the guides (the manifests'
     theory group, /concept/...), the articles, the header & footer (the site chrome), then every
     other route the site serves (a page module with no fields: its words are in code), folded. */
  const GROUP_NAMES = { site: 'Header & footer', page: 'Main pages', theory: 'Guides' };
  const ORPHAN_SAYS = 'Not linked: no menu entry and no page links here';
  const GROUP_ORDER = ['page', 'theory', 'article', 'site', 'other'];
  /* "community" -> "Community", "/concept/state-of-the-art" -> "State of the art" */
  const words = (s) => { const t = String(s || '').replace(/^.*\//, '').replace(/[-_]+/g, ' ').trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Home'; };
  function routeName(route) { return route.title && route.title !== route.key ? route.title : words(route.path); }
  function siteList() {
    const inbound = new Map(); for (const l of realLinkIndex()) if (l.ok && l.tgt !== l.src) inbound.set(l.tgt, (inbound.get(l.tgt) || 0) + 1);
    /* The site menu links every catalog page that has a journey (js/resolvers/header.js `listed`: journey and
       not hiddenFromNavigation, which catalog.js sets exactly when a page has no journey). Counting only the
       manifests' link fields marked menu pages as orphans and missed nothing real (ledger recheck 2026-10-21,
       pages.md P7c): "not linked" now means no menu entry and no link field. */
    const catalog = (window.ArkUI && window.ArkUI.pageCatalog) || {};
    const inMenu = new Set(Object.keys(catalog).filter((k) => catalog[k].journey && !catalog[k].hiddenFromNavigation).map((k) => catalog[k].path));
    const orphanOf = (path) => path !== '/' && !inbound.get(path) && !inMenu.has(path);
    const covered = new Set(), byGroup = { page: [], theory: [], article: [], site: [], other: [] };
    const groups = (window.ArkManifest && window.ArkManifest.groups) || ['site', 'page', 'theory'];
    groups.forEach((group) => {
      state.ids.filter((id) => state.drafts[id] && state.drafts[id].group === group).forEach((id) => {
        const m = state.drafts[id], path = m.route || '/';
        covered.add(path);
        /* the site chrome is called what it is to a reader: its header and footer (its stored
           title, "Site chrome", is data and stays as it is) */
        (byGroup[group] || byGroup.other).push({ key: 'page:' + id, path, title: group === 'site' ? GROUP_NAMES.site : m.title || words(id), icon: group === 'site' ? 'section' : m.route === '/' ? 'home' : 'page',
          on: state.kind === 'page' && state.current === id && m.route === state.cmsCurrentRoute,
          dirty: dirty(id), dirtyTitle: hasShape(id) ? 'Unsaved changes, including its images or shared shape tuning' : 'Unsaved changes',
          orphan: group !== 'site' && orphanOf(m.route), fields: { kind: 'page', id }, del: group === 'theory' ? { kind: 'page', id } : null,
          onOpen: () => { closeDrawer(); select(id); } });
      });
    });
    state.slugs.forEach((slug) => {
      const a = state.aDrafts[slug] || {}, path = '/learnings/' + slug;
      covered.add(path);
      byGroup.article.push({ key: 'article:' + slug, path, title: a.title || words(slug), icon: 'article',
        on: state.kind === 'article' && state.aCurrent === slug && path === state.cmsCurrentRoute,
        dirty: dirtyA(slug), orphan: orphanOf(path), fields: { kind: 'article', id: slug }, del: { kind: 'article', id: slug },
        onOpen: () => { closeDrawer(); selectArticle(slug); } });
    });
    state.cmsRoutes.filter((r) => !covered.has(r.path)).sort((x, y) => x.path.localeCompare(y.path)).forEach((route) => {
      byGroup.other.push({ key: 'route:' + route.path, path: route.path, title: routeName(route), icon: route.seoArticle ? 'article' : 'page',
        on: route.path === state.cmsCurrentRoute, orphan: orphanOf(route.path),
        onOpen: () => { closeDrawer(); openRoute(route.path); } });
    });
    const out = GROUP_ORDER.filter((g) => byGroup[g].length).map((g) => ({ id: g, name: g === 'article' ? 'Articles' : g === 'other' ? 'More pages' : GROUP_NAMES[g], icon: g === 'article' ? 'article' : 'page', rows: byGroup[g] }));
    return { groups: out, rows: out.reduce((all, g) => all.concat(g.rows), []) };
  }
  /* which groups are folded (a convenience, per browser); More pages starts folded */
  const folded = new Set(['other']);
  try { const f = JSON.parse(localStorage.getItem('defxn-cms-folded') || 'null'); if (Array.isArray(f)) { folded.clear(); f.forEach((g) => folded.add(g)); } } catch (e) { /* default */ }
  function renderPages() {
    const ul = $('pages'); if ($('pagesPane').hidden) return;
    const keepFocus = ul.contains(document.activeElement) ? document.activeElement.dataset.row || (document.activeElement.dataset.group && 'group:' + document.activeElement.dataset.group) : null;
    ul.textContent = '';
    const q = ($('pageSearch') && $('pageSearch').value.trim().toLowerCase()) || '';
    const list = siteList();
    let shown = 0;
    const row = (r) => {
      const li = h('li', { class: 'tree-row', 'aria-selected': String(r.on) });
      const open = h('button', { type: 'button', class: 'tree-open', 'data-row': r.key, 'data-item': r.fields ? r.fields.kind + ':' + r.fields.id : null, 'data-path': r.path, title: 'Open ' + r.title + ' (' + r.path + ') on the canvas' });
      open.innerHTML = `${ic(r.icon)}<span class="nm"></span><span class="sub"></span>`;
      open.querySelector('.nm').textContent = r.title; open.querySelector('.sub').textContent = r.path;
      open.addEventListener('click', r.onOpen);
      li.appendChild(open);
      if (r.orphan) li.appendChild(h('span', { class: 'tag orphan', role: 'img', 'aria-label': ORPHAN_SAYS, title: ORPHAN_SAYS, text: 'not linked' }));
      if (r.dirty) li.appendChild(h('span', { class: 'dot', role: 'img', 'aria-label': r.dirtyTitle || 'Unsaved changes', title: r.dirtyTitle || 'Unsaved changes' }));
      /* the row's own actions are one tab stop each only while the row is reached: the list is
         walked by its rows (P2-7: every row had two tab stops, ~140 Tabs past the rail) */
      const acts = h('span', { class: 'row-acts' });
      if (r.fields) {
        const f = h('button', { type: 'button', class: 'btn icon quiet row-act', tabindex: '-1', 'aria-label': 'Fields of ' + r.title, title: 'Page settings: every field of ' + r.title });
        f.innerHTML = ic('settings', 'sm');
        f.addEventListener('click', () => { r.onOpen(); openPageFields({ kind: r.fields.kind, id: r.fields.id, anchor: f }); });
        acts.appendChild(f);
      }
      if (r.del) {
        const d = h('button', { type: 'button', class: 'btn icon quiet row-act danger', tabindex: '-1', 'aria-label': 'Delete ' + r.title, title: 'Delete ' + r.title + ' (asks first)' });
        d.innerHTML = ic('trash', 'sm');
        d.addEventListener('click', () => deleteItem(r.del.kind, r.del.id));
        acts.appendChild(d);
      }
      li.appendChild(acts);
      ul.appendChild(li);
    };
    list.groups.forEach((group) => {
      const rows = q ? group.rows.filter((r) => r.title.toLowerCase().includes(q) || r.path.toLowerCase().includes(q)) : group.rows;
      if (!rows.length) return;
      /* searching opens every group; the group holding the page on the canvas never hides it */
      const open = !!q || !folded.has(group.id) || rows.some((r) => r.on);
      /* the group head folds with the rail's own expand/collapse control (Layers' .layer-toggle),
         not a second one; the whole head is its target */
      const head = h('li', { class: 'side-group', 'data-icon': group.icon, role: 'presentation' });
      const toggle = h('button', { type: 'button', class: 'layer-toggle', 'data-group': group.id, 'aria-expanded': String(open), 'aria-label': (open ? 'Fold ' : 'Show ') + group.name + ' (' + rows.length + ')', title: (open ? 'Fold ' : 'Show ') + group.name });
      const flip = () => {
        if (folded.has(group.id)) folded.delete(group.id); else folded.add(group.id);
        try { localStorage.setItem('defxn-cms-folded', JSON.stringify([...folded])); } catch (e) { /* a convenience only */ }
        renderPages();
      };
      toggle.addEventListener('click', (e) => { e.stopPropagation(); flip(); });
      head.append(toggle, h('span', { text: group.name }), h('small', { text: String(rows.length) }));
      head.addEventListener('click', flip);
      ul.appendChild(head);
      if (open) { rows.forEach(row); shown += rows.length; }
    });
    if (q && !shown) ul.appendChild(h('li', { class: 'hint', text: 'No page matches "' + q + '". Try part of its name or its address (like /about).' }));
    /* what the row marks mean, said once under the list while a mark is on screen (cms.md P2-6: they had only
       a tooltip) */
    const marks = list.rows.filter((r) => r.orphan || r.dirty);
    if (marks.length) {
      const legend = h('li', { class: 'tree-legend hint', role: 'note' });
      if (list.rows.some((r) => r.dirty)) legend.appendChild(h('span', {}, h('span', { class: 'dot', 'aria-hidden': 'true' }), h('span', { text: 'Unsaved changes' })));
      if (list.rows.some((r) => r.orphan)) legend.appendChild(h('span', {}, h('span', { class: 'tag orphan', 'aria-hidden': 'true' }), h('span', { text: 'Not linked: ' + ORPHAN_SAYS.replace(/^Not linked: /, '') })));
      ul.appendChild(legend);
    }
    if ($('pagesCount')) $('pagesCount').textContent = list.rows.length + ' pages';
    /* a row repainted under the keyboard keeps the focus (a dirty dot appearing re-draws the tree) */
    if (keepFocus) { const again = keepFocus.indexOf('group:') === 0 ? ul.querySelector(`[data-group="${CSS.escape(keepFocus.slice(6))}"]`) : ul.querySelector(`[data-row="${CSS.escape(keepFocus)}"]`); if (again) again.focus({ preventScroll: true }); }
  }
  if ($('pageSearch')) $('pageSearch').addEventListener('input', () => renderPages());
  /* arrow keys walk the rows (one Tab into the list, not two per row) */
  $('pages').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = [...$('pages').querySelectorAll('.tree-open, .side-group > .layer-toggle')], i = items.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const next = items[i + (e.key === 'ArrowDown' ? 1 : -1)]; if (next) next.focus();
  });

  /* ---- New page or article: asked for by its TITLE -------------------------------------------
     The address is derived from the title and shown; it can be changed under Developer details.
     It was a slug field ("A page name is lowercase letters and digits ...") under the last of 70
     rows, and a plain page was never offered (docs/ux-audit/cms.md P1-4). The forms are the ones
     js/admin/editor.js already handles by id (#newForm / #newId, #newArticleForm / #newSlug), so
     there is still one create path. */
  const slugFor = (kind, title) => {
    const base = String(title || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, kind === 'article' ? '-' : '').replace(/^-+|-+$/g, '').replace(/^[^a-z]+/, '');
    return base.slice(0, 48).replace(/-+$/, '');
  };
  let newKind = 'page', slugTouched = false, kindGroup = null;
  const kindButtons = $('newItemPanel') ? [...$('newItemPanel').querySelectorAll('[data-new-kind]')] : [];
  function syncNewItem() {
    const panel = $('newItemPanel'); if (!panel) return;
    if (kindGroup) kindGroup.select(kindButtons.findIndex((b) => b.dataset.newKind === newKind));
    $('newForm').hidden = newKind !== 'page'; $('newArticleForm').hidden = newKind !== 'article';
    const slugInput = newKind === 'page' ? $('newId') : $('newSlug');
    if (!slugTouched) slugInput.value = slugFor(newKind, $('newTitle').value);
    $('newAddress').textContent = slugInput.value ? (newKind === 'page' ? '/concept/' : '/learnings/') + slugInput.value : 'the address follows the title';
  }
  function openNewItem(kind) {
    const panel = $('newItemPanel'); if (!panel) return;
    if (kind) newKind = kind;
    showLeft('pages');
    if (window.matchMedia('(max-width: 860px)').matches) setLeftRail(true);
    panel.hidden = false; $('btnNewItem').setAttribute('aria-expanded', 'true');
    syncNewItem();
    $('newTitle').focus({ preventScroll: false });
  }
  function closeNewItem() {
    const panel = $('newItemPanel'); if (!panel) return;
    panel.hidden = true; $('btnNewItem').setAttribute('aria-expanded', 'false');
    $('newTitle').value = ''; $('newId').value = ''; $('newSlug').value = ''; slugTouched = false;
  }
  if ($('newItemPanel')) {
    /* the address forms are its Developer details (the editor's one disclosure, controls.js) */
    const devHolder = $('newItemDev'); devHolder.replaceWith(A.devDetails([], [$('newForm'), $('newArticleForm')]));
    $('btnNewItem').addEventListener('click', () => { if ($('newItemPanel').hidden) openNewItem(); else closeNewItem(); });
    /* the kind picker is Ark's toggle group (js/admin/ark-host.js arkSegGroup) */
    kindGroup = A.arkSegGroup($('newItemPanel').querySelector('.new-kind'), kindButtons, { selected: kindButtons.findIndex((b) => b.dataset.newKind === newKind),
      onPick: (_i, b) => { newKind = b.dataset.newKind; syncNewItem(); $('newTitle').focus(); } });
    $('newTitle').addEventListener('input', syncNewItem);
    for (const id of ['newId', 'newSlug']) $(id).addEventListener('input', () => { slugTouched = $(id).value.trim() !== ''; syncNewItem(); });
    /* Enter in the title submits the kind's own form (the editor's one create path) */
    $('newTitle').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('newItemCreate').click(); } });
    $('newItemCreate').addEventListener('click', () => {
      if (!$('newTitle').value.trim() && !(newKind === 'page' ? $('newId') : $('newSlug')).value.trim()) { $('newItemError').textContent = 'Give it a title first: it becomes its heading and its name in every list.'; $('newTitle').focus(); return; }
      $('newItemError').textContent = '';
      (newKind === 'page' ? $('newForm') : $('newArticleForm')).requestSubmit();
    });
    $('newItemCancel').addEventListener('click', closeNewItem);
    /* a create that went through closes the panel (the person lands on the new page) */
    document.addEventListener('ark-cms-created', closeNewItem);
    document.addEventListener('ark-cms-create-refused', (e) => { $('newItemError').textContent = e.detail && e.detail.refusal ? e.detail.refusal : ''; });
  }
  /* an edit anywhere changes a dirty dot: repaint the tree once per frame (js/admin/editor.js
     announces every draft edit as `ark-cms-drafts`) */
  let pagesQueued = false;
  document.addEventListener('ark-cms-drafts', () => { if (pagesQueued) return; pagesQueued = true; requestAnimationFrame(() => { pagesQueued = false; renderPages(); }); });

  /* ---- the tabs ---------------------------------------------------------------------------
     Which tab each lens opens is remembered (state.railTab, per browser): Pages in the Content
     lens and Layers in the Design lens until changed. */
  const TABS = { pages: ['tabPages', 'pagesPane'], layers: ['tabLayers', 'layersPane'], lib: ['tabLib', 'libPane'], media: ['tabMedia', 'mediaPane'], vault: ['tabVault', 'vaultPane'] };
  /* The five tabs are Ark's tabs (js/admin/ark-host.js arkTabsOn) over the buttons and panes in
     admin-app.html, ids unchanged: roles, aria-selected, the one tab stop and the arrow keys are
     Ark's; a pick (a click, an arrow) comes here as showLeft, and showLeft moves Ark's selection
     for a tab chosen by another route (the lens, a Media link). */
  const TAB_KEYS = Object.keys(TABS);
  let railTabs = null;
  function showLeft(which, opts) {
    if (!TABS[which]) which = 'pages';
    if (railTabs) railTabs.select(which);
    for (const [key, ids] of Object.entries(TABS)) { $(ids[0]).setAttribute('aria-selected', String(key === which)); $(ids[0]).tabIndex = key === which ? 0 : -1; $(ids[1]).hidden = key !== which; }
    if (!opts || opts.remember !== false) {
      state.railTab[state.lens] = which;
      try { localStorage.setItem('defxn-cms-rail-tab', JSON.stringify(state.railTab)); } catch (e) { /* a convenience only */ }
    }
    if (which === 'media' || which === 'vault') mountRailPane(which);
    if (which === 'pages') renderPages();
    schedule();
  }
  railTabs = A.arkTabsOn({ list: $('studioLeft').querySelector('.tabs'), triggers: TAB_KEYS.map((k) => $(TABS[k][0])), panels: TAB_KEYS.map((k) => $(TABS[k][1])),
    values: TAB_KEYS, value: state.railTab[state.lens] || 'pages', onChange: (key) => showLeft(key) });

  /* ---- folding the rail -------------------------------------------------------------------
     Wide: the rail folds away so the canvas takes the full width (remembered per browser, a
     convenience only). Narrow (a phone, <= 860px): the rail is a drawer over the canvas, closed
     until asked for, and closed again once a page is chosen. */
  const narrow = window.matchMedia('(max-width: 860px)');
  function syncRailButton() {
    const open = narrow.matches ? $('shell').classList.contains('drawer-open') : !$('shell').classList.contains('rail-closed');
    const b = $('btnLeftRail'); b.setAttribute('aria-pressed', String(open));
    b.title = (open ? 'Hide' : 'Show') + ' the side panel (pages, layers, components, images, private content)';
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
  A.provide({ CMS_TAG_ICON: CMS_TAG_ICON, openNewItem: openNewItem, realLinkIndex: realLinkIndex, renderLayersPane: renderLayersPane,
      renderPages: renderPages, setLeftRail: setLeftRail, showLeft: showLeft, siteList: siteList });
})();
