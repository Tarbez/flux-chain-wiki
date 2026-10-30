/* =====================================================================
   ADMIN EDITOR · THE KIT (js/admin/kit.js)
   ---------------------------------------------------------------------
   Owns: the Kit view (More > Kit). The owner's five DEFXN boards, 150 elements, drawn live on the canvas
   (js/pages/kit.js, the canvas-only route /kit), and one card worn on them to see every element change from the
   site's look to the card's (owner, 2026-10-26: "show me a page that has all the assets and also the ability to
   wear an NFT and see how it transforms").
   Draws: the board switch, the card to wear and the one action (Wear / Take off), and the board's elements with
   what each one is: Built, Partial (what is missing) or Not built (where it would go). Pressing an element shows it
   on the canvas (board 05: the camera flies to the 3D object).
   Must not: decide what is built (the canvas reports it, 'defxn-cms-kit-report', from the renderers and the 3D kit
   it really has), hold a skin (the canvas applies it through the Skin lab's path, DefxnSkinSite), or write a file:
   the Kit edits nothing, so nothing here is saved.
   Messages: 'defxn-cms-preview-kit' { board, item } and 'defxn-cms-preview-skin' with morph: true go to the canvas
   (js/admin/bridge.js postKit, wearPreviewSkin); 'defxn-cms-kit-report' comes back (bridge.js -> kitReport below).
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, h = A.h, paintInto = A.paintInto, repaintPanels = A.repaintPanels;
  var setView = A.later('setView'), openRoute = A.later('openRoute'), postKit = A.later('postKit'), wearPreviewSkin = A.later('wearPreviewSkin'),
      postCmsPreviewMode = A.later('postCmsPreviewMode');

  var ROUTE = '/kit';
  /* the cards a canvas will wear: the Skin lab's three review samples (DefxnSkinSite.SAMPLES refuses any other) */
  var SAMPLES = ['27', '263', '512'];
  var LABEL = { built: 'Built', partial: 'Partial', notBuilt: 'Not built', loading: 'Loading', off: '3D off', error: 'Error' };
  var kit = { board: '01', item: '', page: 0, compare: '', report: null, pick: '27', before: null };

  function boards() { return window.DefxnKitBoards ? DefxnKitBoards.boards() : []; }
  function worn() { return state.skinChoice || ''; }

  /* ---- entering and leaving the view ---------------------------------------------------------------- */
  /* The Kit is looked at, not edited: the canvas plays Live (a click presses the element, it does not select it),
     and both the page and the mode it had come back when the view closes. */
  /* through the canvas strip's own Edit / Preview buttons, so the strip, the toolbar and the canvas all follow */
  function setLive(on) {
    if (!!state.live === !!on) return;
    var b = document.querySelector('#mode [data-m="' + (on ? 'live' : 'edit') + '"]');
    if (b) b.click(); else { state.live = !!on; postCmsPreviewMode(); }
  }
  function kitEnter() {
    if (!kit.before) kit.before = { route: state.cmsCurrentRoute || '/', live: !!state.live };
    setLive(true);
    openRoute(ROUTE);
    postKit(kit.board, kit.item, kit.page);
  }
  function kitLeave() {
    if (worn()) { state.skinChoice = ''; wearPreviewSkin(false); }
    var before = kit.before; kit.before = null; kit.report = null;
    if (!before) return;
    setLive(before.live);
    var back = before.route === ROUTE ? '/' : before.route;
    if (state.cmsCurrentRoute !== ROUTE) return;
    /* openRoute() leaves the Site map for the page: going TO the map, the page is set quietly under it instead */
    if (state.view === 'map') { state.cmsCurrentRoute = back; A.schedule(); } else openRoute(back);
  }

  function choose(board, item, page) {
    kit.board = board; kit.item = item || ''; kit.page = Number(page) || 0;
    postKit(kit.board, kit.item, kit.page);
    repaintPanels('kit');
  }
  function wear() {
    if (worn()) { state.skinChoice = ''; wearPreviewSkin(true); }
    else { state.skinChoice = kit.pick; wearPreviewSkin(true); }
    repaintPanels('kit');
  }

  /* ---- drawing -------------------------------------------------------------------------------------- */
  function boardSwitch() {
    var bar = h('div', { class: 'kit-boards', role: 'group', 'aria-label': 'Board' });
    boards().forEach(function (b) {
      var btn = h('button', { type: 'button', class: 'kit-board-btn', 'data-board': b.id, 'aria-pressed': b.id === kit.board ? 'true' : 'false', title: b.title },
        h('span', { class: 'kit-board-n', text: b.id }), h('span', { class: 'kit-board-name', text: b.title }));
      btn.addEventListener('click', function () { if (b.id !== kit.board) choose(b.id, '', 0); });
      bar.appendChild(btn);
    });
    return bar;
  }
  function wearControl() {
    var on = worn();
    var select = h('select', { id: 'kit-card', 'aria-label': 'Card to wear' });
    SAMPLES.forEach(function (n) { select.appendChild(h('option', { value: n, text: 'Sample card ' + n })); });
    select.value = on || kit.pick;
    select.disabled = !!on;
    select.addEventListener('change', function () { kit.pick = select.value; });
    var action = h('button', { type: 'button', class: 'btn primary kit-wear', id: 'kitWear', text: on ? 'Take off' : 'Wear',
      title: on ? 'Sweep the site’s own look back over the page' : 'Sweep the card’s look over every element on the page' });
    action.addEventListener('click', wear);
    return h('div', { class: 'kit-wear-row' }, h('label', { for: 'kit-card', text: 'Card' }), select, action);
  }
  function tally(items) {
    var t = { built: 0, partial: 0, notBuilt: 0 };
    items.forEach(function (it) { if (t[it.status] !== undefined) t[it.status]++; });
    return t;
  }
  function itemRow(it) {
    var btn = h('button', { type: 'button', class: 'kit-item', 'data-kit-id': it.id, 'data-status': it.status, 'aria-pressed': it.id === kit.item ? 'true' : 'false' },
      h('span', { class: 'kit-item-n', text: (it.n < 10 ? '0' : '') + it.n }),
      h('span', { class: 'kit-item-name', text: it.name }),
      h('span', { class: 'kit-item-state', text: LABEL[it.status] || it.status }));
    btn.addEventListener('click', function () { choose(kit.board, kit.item === it.id ? '' : it.id, Math.floor((it.n - 1) / ((kit.report && kit.report.per) || 9))); });
    var per = (kit.report && kit.report.per) || 9, onPage = Math.floor((it.n - 1) / per) === kit.page;
    var li = h('li', { 'data-on-page': onPage ? 'true' : 'false' }, btn);
    if (it.missing && it.status !== 'built') li.appendChild(h('p', { class: 'kit-item-missing hint', text: it.missing }));
    return li;
  }

  /* the worn card's own rules and pieces, as the canvas read them from the skin that is on */
  function rulesBox(r) {
    var box = h('div', { class: 'kit-card-rules' },
      h('p', { class: 'kit-card-rules-head', text: 'Sample card ' + worn() + (r.family ? ', the set ' + r.family : '') + ' dresses each part with:' }));
    var dl = h('dl', {});
    /* the site's shape rule (js/ark/skin-parts.js shapeRules, owner 2026-10-25): a full frame or a ticket is for hero
       sections only; every other part wears the card's corners. Said here, so the row is what the page shows. */
    r.rules.forEach(function (x) {
      var value = x.key === 'frame' && (x.value === 'full' || x.value === 'ticket') ? x.value + ' on hero sections; corners on cards and panels' : x.value;
      dl.appendChild(h('dt', { text: x.key })); dl.appendChild(h('dd', { text: value }));
    });
    if (r.pieces && r.pieces.length) { dl.appendChild(h('dt', { text: 'pieces' })); dl.appendChild(h('dd', { text: r.pieces.join(', ') })); }
    box.appendChild(dl);
    return box;
  }
  function renderKitPanel(container) {
    var record = { kind: 'kit', repaint: function () { renderKitPanel(container); } };
    paintInto(container, record, function (root) {
      root.classList.add('cms-form', 'cms-kit');
      root.appendChild(h('div', { class: 'cms-form-head' },
        h('div', {}, h('h2', { text: 'Kit' }), h('div', { class: 'route', text: 'The five DEFXN boards, live on the canvas' })),
        h('div', { class: 'editor-actions' }, A.overlay.closeButton(function () { setView('design'); }, 'Close Kit'))));
      if (!window.DefxnKitBoards) { root.appendChild(h('p', { class: 'empty-state', text: 'The Kit is unavailable: js/content/kit-boards.js did not load in the editor.' })); return; }
      root.appendChild(boardSwitch());
      root.appendChild(wearControl());

      var rep = kit.report && kit.report.board === kit.board ? kit.report : null;
      if (!rep) {
        root.appendChild(h('p', { class: 'hint', role: 'status', text: 'Drawing board ' + kit.board + ' on the canvas.' }));
      } else {
        var t = tally(rep.items);
        root.appendChild(h('p', { class: 'hint kit-tally', role: 'status',
          text: rep.world === 'off' && DefxnKitBoards.board(kit.board).kind === '3d' ? 'The 3D world is off in this browser (it needs WebGL 2), so this board cannot be shown.'
            : t.built + ' built, ' + t.partial + ' partial, ' + t.notBuilt + ' not built.' }));
        var chosen = kit.item && rep.items.filter(function (x) { return x.id === kit.item; })[0];
        if (chosen && kit.board !== '05' && chosen.status !== 'notBuilt') {
          var open = kit.compare === chosen.id;
          root.appendChild(h('div', { class: 'kit-compare-row' },
            h('span', { class: 'hint', text: (chosen.n < 10 ? '0' : '') + chosen.n + ' ' + chosen.name }),
            h('button', { type: 'button', class: 'btn', id: 'kitCompare', text: open ? 'Close compare' : 'Compare under every card',
              onclick: function () { postKit(kit.board, kit.item, kit.page, open ? '' : chosen.id); } })));
        }
        if (kit.board !== '05') {
          var allOpen = kit.compare === 'all:' + kit.board;
          root.appendChild(h('div', { class: 'kit-compare-row' },
            h('span', { class: 'hint', text: 'Every element of board ' + kit.board + ' under every card' }),
            h('button', { type: 'button', class: 'btn', id: 'kitAllLooks', text: allOpen ? 'Close all looks' : 'All looks',
              onclick: function () { postKit(kit.board, kit.item, kit.page, allOpen ? '' : 'all:' + kit.board); } })));
        }
        if (rep.rules) root.appendChild(rulesBox(rep.rules));
        else if (worn()) root.appendChild(h('p', { class: 'hint', role: 'status', text: 'Putting sample card ' + worn() + ' on.' }));
        var list = h('ol', { class: 'kit-items', 'aria-label': 'Elements of board ' + kit.board });
        rep.items.forEach(function (it) { list.appendChild(itemRow(it)); });
        root.appendChild(list);
      }
      root.appendChild(h('p', { class: 'hint', text: 'Every value on the Kit is sample data. The Kit changes nothing on the site, so there is nothing to save.' }));
      root.appendChild(A.devDetails([['Boards', 'js/content/kit-boards.js'], ['Renderers', 'js/kit/board-01.js to board-04.js'], ['3D objects', 'js/world2/world2-kit.mjs (records: world/kit.flx, written by scripts/kit-encode.mjs from js/world/object-kit.js and kit-stage.js)'], ['Page', 'js/pages/kit.js (canvas only, /kit)']]));
    });
    return container;
  }

  /* the canvas answered (js/admin/bridge.js): keep it, and point a fresh page at the board this dock shows */
  function kitReport(message) {
    if (state.view !== 'kit') return;
    if (message.board !== kit.board) { postKit(kit.board, kit.item, kit.page); return; }   /* a freshly loaded page opens on board 01 */
    kit.item = message.item || '';   /* the page drops an element that is not on the board: follow it, never ask again */
    kit.page = Number(message.page) || 0;   /* the page's own steps move it too */
    kit.compare = message.compare || '';
    kit.report = { board: message.board, items: Array.isArray(message.items) ? message.items : [], world: message.world || '', per: message.per || 9, pages: message.pages || 1,
      rules: message.rules && Array.isArray(message.rules.rules) ? message.rules : null };
    repaintPanels('kit');
  }
  function kitReady() { postKit(kit.board, kit.item, kit.page); }
  A.provide({ kitReady: kitReady, renderKitPanel: renderKitPanel, kitReport: kitReport, kitEnter: kitEnter, kitLeave: kitLeave, KIT_ROUTE: ROUTE });
})();
