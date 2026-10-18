/* =====================================================================
   ADMIN EDITOR · WHERE THE FORMS ARE MOUNTED (js/admin/panels.js)
   ---------------------------------------------------------------------
   Owns: every place the workspace hands a form panel a container -- the rail's Media and
   Vault tabs, the Theme view, and THE sheet (one form at a time, on demand: a page's every
   field, or the Mesh deploy status) -- and refreshPanels(), which re-draws whichever of them
   are mounted after an edit changed what they show.
   The panels themselves are the forms' own (js/admin/editor.js renderPageFields,
   articles.js renderArticleFields, assets.js renderMediaPanel, secrets.js renderVaultPanel,
   design.js renderThemePanel, shapes.js renderShapesPanel, mesh.js renderMeshEditor): each
   draws into the container it is given. A panel no file provides yet is mounted as a
   placeholder that names the function it waits for, and draws itself on the next refresh
   once that function exists -- never an error in the middle of the workspace.
   The sheet is never open on load or on a selection, never a fixed right column (owner,
   2026-10-18: "remove the right bar"): it overlays the canvas's right edge while asked for,
   and closes on Esc, on its close button, or -- opened transiently, from the toolbar -- when
   the canvas moves to another page.
   Must not: draw a form's fields (the form files do) or write a draft.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, $ = A.$, h = A.h;

  /* which file draws each panel: what a placeholder names as missing */
  var OWNER = { renderPageFields: 'js/admin/editor.js', renderArticleFields: 'js/admin/articles.js',
    renderMediaPanel: 'js/admin/assets.js', renderVaultPanel: 'js/admin/secrets.js',
    renderThemePanel: 'js/admin/design.js', renderShapesPanel: 'js/admin/shapes.js',
    renderMeshEditor: 'js/admin/mesh.js' };

  /* ---- mounting ------------------------------------------------------------------------- */
  var mounts = new Map();   /* container -> { name, args, label } */
  function mountPanel(container, name, args, label) {
    if (!container) return;
    mounts.set(container, { name: name, args: args || [], label: label });
    drawMount(container);
  }
  function drawMount(container) {
    var m = mounts.get(container); if (!m) return;
    if (typeof A[m.name] !== 'function') {
      container.textContent = '';
      container.appendChild(h('div', { class: 'panel-pending', role: 'note' },
        h('p', { class: 'hint', text: m.label + ' is not here yet: it is drawn by ' + m.name + '(container) in ' + (OWNER[m.name] || 'a form file') + ', which no editor file provides in this build. It appears here as soon as that file provides it.' })));
      return;
    }
    try { A[m.name].apply(null, [container].concat(m.args)); }
    catch (error) {
      container.textContent = '';
      container.appendChild(h('p', { class: 'hint seo-refusal', role: 'alert', text: m.label + ' could not be drawn: ' + (error && error.message ? error.message : error) + '. Reload the editor; if it persists, ' + m.name + '() in ' + (OWNER[m.name] || 'its form file') + ' is failing on this item.' }));
      if (window.console) console.error(error);
    }
  }
  function visible(container) { return container.isConnected && !!container.offsetParent; }
  /* Re-draw every mounted panel that is on screen (a hidden one re-draws when it is shown). The
     forms call it after an edit that changes a panel's structure -- a section added, an item
     created, deleted or reverted. */
  function refreshPanels() {
    mounts.forEach(function (m, container) {
      if (!container.isConnected) { mounts.delete(container); return; }
      if (visible(container)) drawMount(container);
    });
  }

  /* ---- the rail's Media and Vault tabs (js/admin/rail.js showLeft) ----------------------- */
  function mountRailPane(which) {
    if (which === 'media') mountPanel($('mediaPanel'), 'renderMediaPanel', [], 'Media (images)');
    else if (which === 'vault') mountPanel($('vaultPanel'), 'renderVaultPanel', [], 'Vault (encrypted content)');
  }

  /* ---- the Theme view (setView('theme'), js/admin/sitemap.js) ---------------------------- */
  function mountThemeView() {
    mountPanel($('themePanel'), 'renderThemePanel', [], 'Theme & defaults');
    mountPanel($('shapesPanel'), 'renderShapesPanel', [], 'Mesh tuning and page shapes');
  }

  /* ---- THE sheet ------------------------------------------------------------------------ */
  var sheet = { key: '', anchor: null, transient: false, item: null };
  /* The Versions panel (js/admin/versions-panel.js) docks on the right too, above the workspace:
     with room, the sheet moves to its left so both stay usable (css/studio-embed.css); on a
     phone there is room for one, so opening one closes the other. (Unhandled, the Versions list
     covered the sheet's buttons: tests/browser/versions.mjs "Delete a page".) */
  var narrowScreen = window.matchMedia('(max-width: 860px)');
  function versionsOpen() { var v = $('versionsPanel'); return !!v && !v.hidden; }
  if ($('versionsNav')) $('versionsNav').addEventListener('click', function () { setTimeout(function () { if (narrowScreen.matches && versionsOpen()) closeSheet(false); }, 0); });
  function openSheet(opts) {
    var el = $('sheet');
    if (narrowScreen.matches && versionsOpen()) $('versionsNav').click();
    sheet = { key: opts.key, anchor: opts.anchor || null, transient: !!opts.transient, item: opts.item || null };
    $('sheetKicker').textContent = opts.kicker || '';
    $('sheetTitle').textContent = opts.title || '';
    el.dataset.sheet = opts.key;
    var body = $('sheetBody');
    mounts.delete(body);
    body.scrollTop = 0;
    el.hidden = false;
    if (opts.mount) mountPanel(body, opts.mount.name, opts.mount.args, opts.mount.label);
    else { body.textContent = ''; if (opts.build) opts.build(body); }
    syncSheetButtons();
    if (opts.focus !== false) { var first = body.querySelector('input, textarea, select, button') || $('sheetClose'); try { first.focus({ preventScroll: true }); } catch (e) { /* not focusable */ } }
  }
  function closeSheet(restoreFocus) {
    var el = $('sheet'); if (el.hidden) return;
    var anchor = sheet.anchor;
    el.hidden = true; delete el.dataset.sheet;
    mounts.delete($('sheetBody')); $('sheetBody').textContent = '';
    sheet = { key: '', anchor: null, transient: false, item: null };
    syncSheetButtons();
    if (restoreFocus && anchor && anchor.isConnected) try { anchor.focus({ preventScroll: true }); } catch (e) { /* gone */ }
  }
  function syncSheetButtons() {
    var open = !$('sheet').hidden;
    $('btnPageFields').setAttribute('aria-expanded', String(open && sheet.key === 'fields'));
    $('meshNav').setAttribute('aria-expanded', String(open && sheet.key === 'mesh'));
    $('meshNav').setAttribute('aria-current', String(open && sheet.key === 'mesh'));
  }
  $('sheetClose').addEventListener('click', function () { closeSheet(true); });
  /* Esc closes the sheet -- unless a popover or a toolbar section is open, which Esc closes first
     (capture phase, so this sees them before their own handlers close them) */
  window.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || $('sheet').hidden) return;
    if (state.popEl || state.tbOpen || !$('accountMenu').hidden || document.querySelector('flux-authorization-dialog')) return;
    closeSheet(true);
  }, true);

  /* Home / End in a field move its caret to the start / end of the field (a textarea: of the
     line), on every platform. On macOS they are scroll keys even inside a text field: End did not
     move the caret at all and threw the Page fields sheet to its bottom (the footer links) while
     the field kept focus, and the next keystroke scrolled half-way back (measured 2026-10-18 in
     Chromium on macOS: caret stayed at 0, #sheetBody went 0 -> 3344 -> 265). In a form panel the
     key is about the field being typed in, never about the panel. Shift extends the selection. */
  function moveCaret(el, key, extend) {
    if (!el || !(el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && /^(text|search|url|email|tel|password)$/i.test(el.type || 'text')))) return false;
    let start, end, dir;
    try { start = el.selectionStart; end = el.selectionEnd; dir = el.selectionDirection; } catch (e) { return false; }
    if (start == null) return false;
    const v = el.value || '', caret = dir === 'backward' ? start : end, anchor = dir === 'backward' ? end : start;
    let to;
    if (el.tagName === 'TEXTAREA') {
      const next = v.indexOf('\n', caret);
      to = key === 'End' ? (next < 0 ? v.length : next) : v.lastIndexOf('\n', caret - 1) + 1;
    } else to = key === 'End' ? v.length : 0;
    if (extend) el.setSelectionRange(Math.min(anchor, to), Math.max(anchor, to), to < anchor ? 'backward' : 'forward');
    else el.setSelectionRange(to, to);
    return true;
  }
  document.addEventListener('keydown', function (e) {
    if ((e.key !== 'End' && e.key !== 'Home') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (!e.target.closest || !e.target.closest('#sheet, #themeView, #studioLeft')) return;
    if (moveCaret(e.target, e.key, e.shiftKey)) e.preventDefault();
  });

  /* ---- Page fields: the page's (or article's) whole form ------------------------------------
     The item for a route is derived from the drafts: the manifest whose route it is (a page
     before the site chrome, which shares Home's route) or the article it names. */
  function itemForRoute(path) {
    var pages = state.ids.filter(function (id) { return state.drafts[id] && state.drafts[id].route === path; });
    var page = pages.filter(function (id) { return state.drafts[id].group !== 'site'; })[0] || pages[0];
    if (page) return { kind: 'page', id: page };
    var m = /^\/learnings\/([^/]+)$/.exec(path || '');
    if (m && state.aDrafts[m[1]]) return { kind: 'article', id: m[1] };
    return null;
  }
  function currentItem() {
    if (state.kind === 'page' && state.drafts[state.current] && state.drafts[state.current].route === state.cmsCurrentRoute) return { kind: 'page', id: state.current };
    if (state.kind === 'article' && state.aCurrent && '/learnings/' + state.aCurrent === state.cmsCurrentRoute) return { kind: 'article', id: state.aCurrent };
    return itemForRoute(state.cmsCurrentRoute);
  }
  function itemTitle(item) {
    if (!item) return state.cmsCurrentRoute;
    if (item.kind === 'page') return (state.drafts[item.id] && state.drafts[item.id].title) || item.id;
    return (state.aDrafts[item.id] && state.aDrafts[item.id].title) || item.id;
  }
  /* opts: { kind, id } names the item (a Pages row's Fields button); without it, the page on the
     canvas. transient: opened by a shortcut (the toolbar's "Open in Content") -- it closes when
     the canvas moves to another page instead of following it. anchor: the control focus returns
     to. tab: the form tab to open on (renderPageFields' own option). */
  function openPageFields(opts) {
    opts = opts || {};
    var item = opts.kind && opts.id ? { kind: opts.kind, id: opts.id } : currentItem();
    if (item) {
      state.kind = item.kind;
      if (item.kind === 'page') state.current = item.id; else state.aCurrent = item.id;
    }
    openSheet({ key: 'fields', kicker: 'Page fields', title: itemTitle(item), item: item,
      anchor: opts.anchor || $('btnPageFields'), transient: !!opts.transient, focus: opts.focus,
      mount: item ? (item.kind === 'page'
        ? { name: 'renderPageFields', args: [item.id].concat(opts.tab ? [{ tab: opts.tab }] : []), label: 'This page’s fields' }
        : { name: 'renderArticleFields', args: [item.id], label: 'This article’s fields' }) : null,
      build: item ? null : function (body) {
        body.appendChild(h('p', { class: 'hint seo-refusal', role: 'note', text: 'No page fields for ' + state.cmsCurrentRoute + ': no manifest in js/content/manifests/ has this route and it is not an article, so its words live in its page module (js/pages/), not in a draft this editor saves. To edit them here, give the page a manifest; its SEO is the page picker’s SEO popover, its shapes are in Theme.' }));
      } });
  }
  function togglePageFields() {
    if (!$('sheet').hidden && sheet.key === 'fields') { closeSheet(true); return; }
    openPageFields({ anchor: $('btnPageFields') });
  }
  $('btnPageFields').addEventListener('click', togglePageFields);
  /* The canvas moved to another page (openRoute, js/admin/canvas.js): that page becomes the item
     a page form edits, and an open Page fields sheet follows it -- or closes, if a shortcut
     opened it for the page that was showing. */
  function pageFieldsFollow(path) {
    var item = itemForRoute(path);
    if (item && (state.kind === 'page' || state.kind === 'article')) {
      state.kind = item.kind;
      if (item.kind === 'page') state.current = item.id; else state.aCurrent = item.id;
    }
    if ($('sheet').hidden || sheet.key !== 'fields') return;
    if (sheet.transient) { closeSheet(false); return; }
    if (sheet.item && item && sheet.item.kind === item.kind && sheet.item.id === item.id) return;
    openPageFields({ anchor: sheet.anchor, focus: false });
  }

  /* ---- Mesh: publish and deploy status, on demand from the header (like Versions) --------- */
  function openMeshSheet() {
    if (!$('sheet').hidden && sheet.key === 'mesh') { closeSheet(true); return; }
    openSheet({ key: 'mesh', kicker: 'Publish', title: 'Mesh', anchor: $('meshNav'), focus: false,
      mount: { name: 'renderMeshEditor', args: [], label: 'The mesh deploy status' } });
  }

  A.provide({ closeSheet: closeSheet, itemForRoute: itemForRoute, mountRailPane: mountRailPane,
      mountThemeView: mountThemeView, openMeshSheet: openMeshSheet, openPageFields: openPageFields,
      pageFieldsFollow: pageFieldsFollow, refreshPanels: refreshPanels });
})();
