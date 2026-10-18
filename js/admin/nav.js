/* =====================================================================
   ADMIN EDITOR · MODES AND THE ITEM LIST (js/admin/nav.js)
   ---------------------------------------------------------------------
   Owns: the Content/Design mode switch (setMode), the sidebar item list with its dirty
   dots (renderList), the select*() entry points that put one page/article/image/
   encrypted item/shape/the mesh view on screen, and the --app-bar-h measurement.
   Must not: draw an editor (renderEditor, js/admin/editor.js) or tear down any draft
   when the mode changes -- a mode switch only changes state.kind.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, syncMode = A.syncMode, $ = A.$, h = A.h, dirty = A.dirty, hasShape = A.hasShape,
      dirtyA = A.dirtyA, dirtyI = A.dirtyI, dirtyS = A.dirtyS, orphanShapeIds = A.orphanShapeIds;
  /* defined by files loaded after this one: resolved when called */
  var themeDirty = A.later('themeDirty'), settingsDefaultsDirty = A.later('settingsDefaultsDirty'),
      syncHeader = A.later('syncHeader'), refreshSaveButton = A.later('refreshSaveButton'),
      reliefDirty = A.later('reliefDirty'), renderEditor = A.later('renderEditor'),
      reloadPreview = A.later('reloadPreview');

  var GROUP_NAMES = { site: 'Site', page: 'Pages', theory: 'Theory pages' };
  /* ---- page list ---------------------------------------------------- */
  function renderList() {
    syncMode();
    var meshNav = $('meshNav');
    if (meshNav) meshNav.setAttribute('aria-current', String(state.kind === 'mesh'));

    /* Step 3: the top-level Content/Design switch, and (only while mode === 'design')
       Design's own canvas/theme sub-switch -- folding the old separate designNav/studioNav
       nav buttons into one mode with an in-mode choice, per the plan's end state. The dirty
       dot carries over unchanged from the old designNav button (themeDirty()||
       settingsDefaultsDirty() only) -- the Studio/canvas side's own dirty tracking
       (layout/components/states/canvas-transitions/element-motion) is Step 5's job, not
       this one's, so this deliberately does not grow a new dot for it. */
    var modeContentBtn = $('modeContentBtn'), modeDesignBtn = $('modeDesignBtn');
    if (modeContentBtn) modeContentBtn.setAttribute('aria-selected', String(state.mode === 'content'));
    if (modeDesignBtn) {
      modeDesignBtn.setAttribute('aria-selected', String(state.mode === 'design'));
      modeDesignBtn.querySelector('.dot') && modeDesignBtn.querySelector('.dot').remove();
      if (themeDirty() || settingsDefaultsDirty()) modeDesignBtn.appendChild(h('span', { class: 'dot', title: 'Unsaved global design changes' }));
    }
    var designSubSwitch = $('designSubSwitch');
    if (designSubSwitch) designSubSwitch.hidden = state.mode !== 'design';
    var designThemeBtn = $('designThemeBtn');
    if (designThemeBtn) {
      designThemeBtn.querySelector('.dot') && designThemeBtn.querySelector('.dot').remove();
      if (themeDirty() || settingsDefaultsDirty()) designThemeBtn.appendChild(h('span', { class: 'dot', title: 'Unsaved global design changes' }));
    }
    /* which Design view is pressed, and the canvas-only header groups: syncHeader()
       (js/admin/header.js) */
    syncHeader(); refreshSaveButton();
    /* Content mode's own item list (pages/articles/images/secrets/shapes) and its "New X"
       forms are irrelevant while Design mode is active -- hide the whole wrapper rather than
       leave an empty, confusing sidebar. The Mesh status disclosure (a sibling of #contentNav,
       untouched here) stays visible regardless of mode. */
    var contentNav = $('contentNav');
    if (contentNav) contentNav.hidden = state.mode !== 'content';

    var list = $('pageList'); list.textContent = '';
    /* Step 3: this whole item list (previously built unconditionally regardless of nav
       selection) is Content mode's own output -- gated here, not just hidden by CSS on
       #contentNav above, so Design mode never even builds it. */
    if (state.mode === 'content') {
      ArkManifest.groups.forEach(function (group) {
        var ids = state.ids.filter(function (id) { return state.drafts[id].group === group; });
        if (!ids.length) return;
        list.appendChild(h('li', { class: 'side-group', 'data-icon': 'page', text: GROUP_NAMES[group] }));
        ids.forEach(function (id) {
          var button = h('button', { type: 'button', 'aria-current': String(state.kind === 'page' && id === state.current), 'data-id': id, onclick: function () { select(id); } },
            h('span', { text: state.drafts[id].title }), dirty(id) ? h('span', { class: 'dot', title: hasShape(id) ? 'Unsaved changes, including its images or shared shape tuning' : 'Unsaved changes' }) : null);
          list.appendChild(h('li', {}, button));
        });
      });
      if (state.slugs.length) list.appendChild(h('li', { class: 'side-group', 'data-icon': 'article', text: 'Articles' }));
      state.slugs.forEach(function (slug) {
        var button = h('button', { type: 'button', 'aria-current': String(state.kind === 'article' && slug === state.aCurrent), 'data-slug': slug, onclick: function () { selectArticle(slug); } },
          h('span', { text: state.aDrafts[slug].title || slug }), dirtyA(slug) ? h('span', { class: 'dot', title: 'Unsaved changes' }) : null);
        list.appendChild(h('li', {}, button));
      });
      if (state.assetIds.length) list.appendChild(h('li', { class: 'side-group', 'data-icon': 'image', text: 'Images' }));
      state.assetIds.forEach(function (id) {
        var button = h('button', { type: 'button', 'aria-current': String(state.kind === 'asset' && id === state.assetCurrent), 'data-asset': id, onclick: function () { selectAsset(id); } },
          h('span', { text: state.assetDrafts[id].label || id }), dirtyI(id) ? h('span', { class: 'dot', title: 'Unsaved changes' }) : null);
        list.appendChild(h('li', {}, button));
      });
      if (state.secretIds.length) list.appendChild(h('li', { class: 'side-group', 'data-icon': 'lock', text: 'Encrypted' }));
      state.secretIds.forEach(function (id) {
        var button = h('button', { type: 'button', 'aria-current': String(state.kind === 'secret' && id === state.secretCurrent), 'data-secret': id, onclick: function () { selectSecret(id); } },
          h('span', { text: state.secretDrafts[id].label || id }), dirtyS(id) ? h('span', { class: 'dot', title: 'Unsaved changes' }) : null);
        list.appendChild(h('li', {}, button));
      });
      var orphans = window.ArkMeshSettings ? orphanShapeIds() : [];
      if (orphans.length) list.appendChild(h('li', { class: 'side-group', 'data-icon': 'shape', text: 'Shapes' }));
      orphans.forEach(function (id) {
        var button = h('button', { type: 'button', 'aria-current': String(state.kind === 'shape' && id === state.shapeCurrent), 'data-shape': id, onclick: function () { selectShape(id); } },
          h('span', { text: state.shapeLabels[id] || id }), reliefDirty() ? h('span', { class: 'dot', title: 'Tuning or this page’s images have unsaved changes' }) : null);
        list.appendChild(h('li', {}, button));
      });
    }
  }

  function select(id) { state.kind = 'page'; state.current = id; renderList(); renderEditor(); reloadPreview(); }

  function selectArticle(slug) { state.kind = 'article'; state.aCurrent = slug; renderList(); renderEditor(); reloadPreview(); }

  function selectAsset(id) { state.kind = 'asset'; state.assetCurrent = id; renderList(); renderEditor(); reloadPreview(); }

  function selectSecret(id) { state.kind = 'secret'; state.secretCurrent = id; renderList(); renderEditor(); reloadPreview(); }

  function selectShape(id) { state.kind = 'shape'; state.shapeCurrent = id; renderList(); renderEditor(); reloadPreview(); }

  function selectMesh() { state.kind = 'mesh'; renderList(); renderEditor(); reloadPreview(); }

  /* Step 3: the one entry point for the top-level mode switch. Nothing is torn down --
     state.current/aCurrent/assetCurrent/secretCurrent/shapeCurrent and every draft stay
     exactly as they are; only state.kind changes, to whichever kind that mode's own
     contentKind/designKind last remembered (syncMode(), called from the top of renderList(),
     keeps those two fields current on every render -- see kindMode(), js/admin/state.js). This is why an
     unsaved edit in one mode is still there, and still dirty, after switching to the other
     mode and back. */
  function setMode(mode) {
    if (mode === state.mode) return;
    state.kind = mode === 'design' ? (state.designKind || 'studio') : (state.contentKind || 'page');
    renderList(); renderEditor(); reloadPreview();
  }
  if ($('modeContentBtn')) $('modeContentBtn').addEventListener('click', function () { setMode('content'); });
  if ($('modeDesignBtn')) $('modeDesignBtn').addEventListener('click', function () { setMode('design'); });
  /* Design's sub-views (#designSubSwitch) are wired in js/admin/header.js, next to
     showDesignView(); setView(), the canvas/sitemap switch they drive, is js/admin/sitemap.js. */
  /* The persistent header's real height, published once as --app-bar-h on <html>. #studioRoot
     (css/studio-embed.css) docks below it and sizes its 100vh-based panels by it, so the mode
     switch above stays reachable at EVERY width: below 1280px the one header wraps (89px at
     760px, 169px at 390px; one 52px row from 1280px -- measured in Chromium 2026-10-18,
     tests/browser/header-reach.mjs), and the old hardcoded 58px offset once left Studio
     painted over the switch. Observed, not computed once, because the wrap changes with
     width, fonts, and which canvas controls are showing. */
  (function trackAppBarHeight() {
    var bar = document.querySelector('body > header.bar');
    if (!bar || typeof ResizeObserver !== 'function') return;
    function publish() { document.documentElement.style.setProperty('--app-bar-h', bar.getBoundingClientRect().height + 'px'); }
    new ResizeObserver(publish).observe(bar, { box: 'border-box' });
    publish();
  })();
  A.provide({ renderList: renderList, select: select, selectArticle: selectArticle,
      selectAsset: selectAsset, selectMesh: selectMesh, selectSecret: selectSecret });
})();
