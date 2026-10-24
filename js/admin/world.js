/* =====================================================================
   ADMIN EDITOR · THE 3D WORLD (js/admin/world.js)
   ---------------------------------------------------------------------
   Owns: Design mode's World view -- the controls for the 3D world under every page (light,
   motion, the first-visit story, and the camera and exit of the page on the canvas) --
   its Revert, and the route picker that points the canvas at the page being edited.
   Every control is generated from ArkWorld.knobs() (js/content/world.js): a number is a slider
   and a number field, a toggle is a switch, a choice is a segmented control. No field is named
   here, so a knob added to the schema appears in this panel with no change to this file.
   Must not: hold its draft itself (state.worldDraft, js/admin/state.js), write a file
   (saveEverything -> ArkAdminStore.saveWorld does, as FLX), or tell the canvas anything but
   through notifyPreviewWorld (js/admin/bridge.js): the canvas repaints in place, never remounts.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, h = A.h, status = A.status, touch = A.touch, paintInto = A.paintInto,
      repaintPanels = A.repaintPanels, refuse = A.refuse, clone = A.clone;
  /* defined by files loaded after this one: resolved when called */
  var notifyPreviewWorld = A.later('notifyPreviewWorld'), syncWorldDot = A.later('syncWorldDot'), setView = A.later('setView'), openRoute = A.later('openRoute');

  /* the four tabs. The three site-wide ones are the schema's own groups; "This page" gathers the
     per-route groups (view, exit). Only these titles are written here: the fields are not. */
  var TITLES = { look: 'Look', motion: 'Motion', story: 'Story' };
  var PAGE_GROUPS = ['view', 'exit'];
  var HINTS = {
    look: 'The light and the air of the 3D world under every page.',
    motion: 'How the camera flies from page to page, and how a page’s words come in and go out.',
    story: 'The intro a first-time visitor sees.'
  };
  var worldTab = 'look';   /* the tab last used: a repaint keeps it */

  function siteGroups() {
    var seen = [];
    ArkWorld.knobs().forEach(function (k) { if (PAGE_GROUPS.indexOf(k.group) < 0 && seen.indexOf(k.group) < 0) seen.push(k.group); });
    return seen;
  }
  function rowsOf(group) { return ArkWorld.knobs().filter(function (k) { return k.group === group; }); }
  function pageRows() { return ArkWorld.knobs().filter(function (k) { return PAGE_GROUPS.indexOf(k.group) >= 0; }); }
  function routeOK(route) { return /^\/[a-z0-9/_-]*$/.test(route || ''); }
  function route() { return state.cmsCurrentRoute || '/'; }

  /* ---- the draft: read and write one knob ------------------------------------------------ */
  /* the value a knob has now; a camera field nobody set is null ("the page's own camera") */
  function valueOf(row, at) {
    var d = state.worldDraft;
    if (row.group === 'view') { var v = d.views && d.views[at]; return v && v[row.key] !== undefined ? v[row.key] : null; }
    if (row.group === 'exit') { var x = d.exits && d.exits[at]; return x && x[row.key] !== undefined ? x[row.key] : row.value; }
    return d[row.group][row.key];
  }
  function writeValue(row, at, value) {
    var d = state.worldDraft;
    if (row.group === 'view') {
      d.views = d.views || {}; d.views[at] = d.views[at] || {};
      if (value === null) delete d.views[at][row.key]; else d.views[at][row.key] = value;
    } else if (row.group === 'exit') { d.exits = d.exits || {}; d.exits[at] = Object.assign({}, d.exits[at], { words: value }); }
    else d[row.group][row.key] = value;
  }
  function snapshot() { return clone(state.worldDraft); }
  /* "Clear this page's settings" is available only while the page on the canvas has some */
  var clearButton = null;
  function hasPageSettings(at) { var d = state.worldDraft; return !!((d.views && d.views[at]) || (d.exits && d.exits[at])); }
  function syncClear() {
    if (clearButton) refuse(clearButton, hasPageSettings(route()) ? '' : 'Nothing to clear: this page has no camera or exit setting of its own.');
  }
  /* One edit is one step of the editor's one undo history (js/admin/history.js). `change()` edits
     the draft; the draft is sanitized (clamped, empty overrides dropped), the canvas is told, and
     the step undoes and redoes by putting a snapshot back. `merge` keeps a slider drag as ONE step. */
  function putBack(snap) {
    state.worldDraft = clone(snap);
    syncClear(); syncWorldDot();
    notifyPreviewWorld(); touch({ kind: 'world' }); repaintPanels('world');
    return true;
  }
  function step(label, merge, change) {
    var before = snapshot();
    change();
    state.worldDraft = ArkWorld.sanitize(state.worldDraft);
    var after = snapshot();
    if (JSON.stringify(before) === JSON.stringify(after)) return false;
    syncClear(); syncWorldDot();
    notifyPreviewWorld(); touch({ kind: 'world' });
    if (typeof A.historyAction === 'function') A.historyAction({ label: label, merge: merge, undo: function () { return putBack(before); }, redo: function () { return putBack(after); } });
    return true;
  }

  /* ---- the controls, one per knob ---------------------------------------------------------- */
  function idOf(row, at) { return 'world-' + row.group + '-' + row.key + (row.group === 'view' || row.group === 'exit' ? '-' + at.replace(/[^a-z0-9]+/g, '_') : ''); }
  function shown(n) { return String(Math.round(n * 1000) / 1000); }

  function numberControl(row, at) {
    var id = idOf(row, at), perPage = row.group === 'view';
    var now = valueOf(row, at);
    var range = h('input', { id: id, type: 'range', min: row.min, max: row.max, step: row.step, 'aria-label': row.label });
    var number = h('input', { id: id + '-n', type: 'number', class: 'ctl world-num', min: row.min, max: row.max, step: row.step, 'aria-label': row.label + ', exact value', title: perPage ? 'Empty keeps the page’s own camera' : 'Default ' + shown(row.value) });
    if (perPage) number.placeholder = 'Built in';
    var builtIn = perPage ? h('button', { type: 'button', class: 'btn small', text: 'Use built-in', title: 'Clear this setting: the page keeps its own camera' }) : null;
    function show(value) {
      var unset = perPage && value === null;
      range.value = unset ? String((row.min + row.max) / 2) : String(value);
      range.classList.toggle('unset', unset);
      number.value = unset ? '' : shown(value);
      if (builtIn) builtIn.hidden = unset;
    }
    function apply(value, merge) {
      step('changing ' + row.label.toLowerCase(), merge, function () { writeValue(row, at, value); });
      show(valueOf(row, at));   /* the sanitized value: clamped to the knob's range */
    }
    var merge = 'world:' + row.group + '.' + row.key + ':' + at;
    range.addEventListener('input', function () { var v = Number(range.value); if (Number.isFinite(v)) apply(v, merge); });
    number.addEventListener('change', function () {
      if (number.value === '' && perPage) { apply(null, ''); return; }
      var v = Number(number.value);
      if (Number.isFinite(v)) apply(v, ''); else show(valueOf(row, at));
    });
    if (builtIn) builtIn.addEventListener('click', function () { apply(null, ''); });
    show(now);
    return h('div', { class: 'relief-field world-knob', 'data-knob': row.group + '.' + row.key },
      h('div', { class: 'relief-field-head' }, h('label', { for: id, text: row.label }), number),
      range, builtIn);
  }
  function toggleControl(row, at) {
    var id = idOf(row, at);
    var input = h('input', { id: id, type: 'checkbox', role: 'switch' });
    input.checked = !!valueOf(row, at);
    input.addEventListener('change', function () {
      step('changing ' + row.label.toLowerCase(), '', function () { writeValue(row, at, input.checked); });
      input.checked = !!valueOf(row, at);
    });
    return h('div', { class: 'relief-field world-knob world-flag', 'data-knob': row.group + '.' + row.key }, h('label', { for: id, text: row.label }), input);
  }
  function choiceControl(row, at) {
    var ctx = { get: function () { return valueOf(row, at); },
      set: function (_key, v) { step('changing ' + row.label.toLowerCase(), '', function () { writeValue(row, at, v); }); } };
    var field = A.ctlSegField(ctx, row.label, row.key, row.choices, A.ctlLabel);
    field.classList.add('world-knob'); field.dataset.knob = row.group + '.' + row.key;
    return field;
  }
  function control(row, at) {
    return row.kind === 'toggle' ? toggleControl(row, at) : row.kind === 'choice' ? choiceControl(row, at) : numberControl(row, at);
  }

  /* ---- the tabs --------------------------------------------------------------------------- */
  function siteTab(group) {
    var box = h('div', { class: 'world-pane' });
    if (HINTS[group]) box.appendChild(h('p', { class: 'hint', text: HINTS[group] }));
    var fields = h('div', { class: 'relief-fields' });
    rowsOf(group).forEach(function (row) { fields.appendChild(control(row, '')); });
    box.appendChild(fields);
    var name = (TITLES[group] || A.ctlLabel(group)).toLowerCase();
    box.appendChild(h('div', { class: 'tools' }, h('button', { type: 'button', class: 'btn', 'data-reset': group, text: 'Reset ' + name + ' to defaults', onclick: function () {
      step('resetting the ' + name, '', function () { state.worldDraft[group] = clone(ArkWorld.defaults()[group]); });
      repaintPanels('world');
    } })));
    return box;
  }
  function pageTab() {
    var at = route(), box = h('div', { class: 'world-pane' });
    /* the route picker: choosing a page opens it on the canvas, the editor's own way (openRoute) */
    var picker = h('select', { id: 'world-route', 'aria-label': 'Page to edit' });
    var routes = (state.cmsRoutes || []).slice();
    if (!routes.some(function (r) { return r.path === at; })) routes.unshift({ path: at, title: at });
    routes.forEach(function (r) { picker.appendChild(h('option', { value: r.path, selected: r.path === at, text: (r.title && r.title !== r.path ? r.title + '  ' : '') + r.path })); });
    picker.addEventListener('change', function () { openRoute(picker.value); });
    box.appendChild(h('div', { class: 'theme-select-row' }, h('label', { for: 'world-route', text: 'Page on the canvas' }), picker));
    if (!routeOK(at)) {
      box.appendChild(h('p', { class: 'hint', role: 'note', text: 'This page’s address (' + at + ') has letters the world cannot key a camera by. Lower-case letters, numbers, - and _ only.' }));
      return box;
    }
    box.appendChild(h('p', { class: 'hint', text: 'A camera setting left empty keeps this page’s own camera. Choosing a page here shows it on the canvas.' }));
    var fields = h('div', { class: 'relief-fields' });
    pageRows().forEach(function (row) { fields.appendChild(control(row, at)); });
    box.appendChild(fields);
    var clear = h('button', { type: 'button', class: 'btn', 'data-reset': 'page', text: 'Clear this page’s settings', onclick: function () {
      step('clearing this page’s 3D settings', '', function () { if (state.worldDraft.views) delete state.worldDraft.views[at]; if (state.worldDraft.exits) delete state.worldDraft.exits[at]; });
      repaintPanels('world');
    } });
    clearButton = clear; syncClear();
    box.appendChild(h('div', { class: 'tools' }, clear));
    return box;
  }

  /* Revert: the draft goes back to what is saved (the module holds the saved world) */
  function revertWorld() {
    state.worldDraft = ArkWorld.get();
    syncClear(); syncWorldDot();
    notifyPreviewWorld(); touch({ kind: 'world' }); repaintPanels('world');
    status('The 3D world is back to its saved version.', '');
  }

  function renderWorldPanel(container) {
    var record = { kind: 'world', repaint: function () { renderWorldPanel(container); } };
    paintInto(container, record, function (root) {
      root.classList.add('cms-form', 'cms-world');
      if (!window.ArkWorld) { root.appendChild(h('p', { class: 'empty-state', text: 'The 3D world is unavailable on this page.' })); return; }
      state.worldDraft = ArkWorld.sanitize(state.worldDraft);
      var revert = h('button', { type: 'button', class: 'btn', text: 'Revert', 'data-revert': 'world:', onclick: revertWorld });
      root.appendChild(h('div', { class: 'cms-form-head' },
        h('div', {}, h('h2', { text: '3D world' }), h('div', { class: 'route', text: 'Under every page' })),
        h('div', { class: 'editor-actions' }, revert, A.overlay.closeButton(function () { setView('design'); }, 'Close 3D world'))));
      var items = siteGroups().map(function (g) { return { id: g, label: TITLES[g] || A.ctlLabel(g), content: siteTab(g) }; });
      items.push({ id: 'page', label: 'This page', content: pageTab() });
      if (!items.some(function (i) { return i.id === worldTab; })) worldTab = items[0].id;
      root.appendChild(A.arkTabs({ label: '3D world sections', className: 'page-editor-tabs', value: worldTab, onChange: function (tab) { worldTab = tab; }, items: items }));
      root.appendChild(A.devDetails([['Writes', 'js/content/world-data.js'], ['Stored as', 'FLX records (ArkWorld.serialize), not JSON']]));
    });
    return container;
  }
  /* the canvas moved to another page: "This page" shows that page */
  function worldFollow() {
    if (state.view === 'world') repaintPanels('world');
  }
  /* open the panel on a tab (the harness) */
  function showWorldTab(tab) {
    worldTab = tab;
    var tabs = Array.prototype.slice.call(document.querySelectorAll('#worldPanel .page-editor-tabs [role="tab"]'));
    var t = tabs[siteGroups().concat(['page']).indexOf(tab)];
    if (t && t.getAttribute('aria-selected') !== 'true') t.click();
  }
  A.provide({ renderWorldPanel: renderWorldPanel, revertWorld: revertWorld, worldFollow: worldFollow, showWorldTab: showWorldTab });
})();
