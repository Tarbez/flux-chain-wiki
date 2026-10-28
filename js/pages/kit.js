/* =====================================================================
   THE KIT PAGE (/kit, the editor's canvas only): the owner's five DEFXN boards, live
   ---------------------------------------------------------------------
   Owner, 2026-10-26: "create these components inside of the CMS to be able to reuse them ... show me a page that has
   all the assets and also the ability to wear an NFT and see how it transforms". Then: "each card should have its own
   rules ... make it 3 by 3". This page is that page; the editor's More > Kit dock (js/admin/kit.js) drives it and
   wears the card on it.

   What it shows: one board at a time, nine elements per page (3 x 3), in the board's own order.
     boards 01-04  each element drawn by its renderer (js/kit/board-*.js, registered in DefxnKit) on a tile
     board 05      the page's nine 3D objects in the world under the page (js/world/kit-stage.js, the 'kit' view),
                   their names in a list on the left; choosing one flies the camera to it
   Nothing here lists what is built. A 2D element is built when DefxnKit has its renderer, a 3D one when the kit stage
   can build it (DEFXNScene.kit.built()); every other element shows "Not built" and names what is missing.

   Each card dresses the page by its own rules. A tile is an Ark UI card part (data-ark-part="CARD"), so the worn
   card's own drawings (its frame or corners, its nameplate, its accent strip) and its measured rules (frame, edge,
   marker, density) land on every tile, and every element inside takes the parts' rules. The tile draws its outline as
   a shadow, never a border: a part with a border of its own gets corners instead of the card's frame (SKINS.md). The
   header names the worn card's rules and pieces, read from the skin that is on (DefxnSkinSite.active()), never typed.

   Wearing: the skin is applied by the canvas's Skin lab path (js/main.js cmsPreviewSkin, DefxnSkinSite) on #scene,
   which holds this page. The change from the plain look to the skinned one is a page-wide sweep (css/kit.css).

   Routed only in the editor's canvas (catalog.js adds 'kit' when the address carries cms-preview=1): no visitor,
   sitemap or menu ever reaches it. Every value an element shows is sample data, and the header says so once.

   Compare (owner, 2026-10-26: "see how it transforms"): one element drawn four times side by side, in the site's own
   look and under each review card, each pane dressed by DefxnSkinSite.preview() (the site's one way to dress a box with
   a card: the same recipe, part table, policy and shape rules as wearing). It opens over the page from a tile's Compare
   button or the dock, and lives outside #scene, so a card worn on the page never tints its "site look" pane.

   Fit: an element taller or wider than its tile is zoomed down to fit (never under 0.55), measured per tile after it
   draws and again after a card is worn (a card's density changes the room). Nothing is clipped without being measured.

   Editor <-> page: js/main.js hands 'defxn-cms-preview-kit' { board, item, page, compare } to ArkUI.kitPage.show(); this page
   posts 'defxn-cms-kit-report' { board, page, pages, item, items, rules } to the editor after every draw.
   ===================================================================== */
(function () {
  'use strict';
  var BOARDS = window.DefxnKitBoards, KIT = window.DefxnKit;
  var preview = /[?&]cms-preview=1(&|$)/.test(location.search) && window.parent !== window;
  var PER = 9;   /* 3 x 3 */

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function two(n) { return n < 10 ? '0' + n : String(n); }
  function reduced() { return ArkUI.prefersReducedMotion ? ArkUI.prefersReducedMotion() : false; }
  function scene() { return window.DEFXNScene || null; }
  function world() { return window.ArkWorldHost || null; }

  /* ---- what is built: derived, never listed ---------------------------------------------------- */
  function worldState() {
    var h = world(), S = scene();
    if (S && S.kit && typeof S.kit.built === 'function') return 'ready';
    if (!h || h.failed || (h.owns && !h.owns())) return 'off';
    return 'loading';
  }
  function built3d() { var S = scene(); return S && S.kit && S.kit.built ? S.kit.built() : []; }
  function statusOf(item) {
    if (item.board !== '05') return KIT.status(item.id);
    var w = worldState();
    if (w !== 'ready') return w === 'off' ? 'off' : 'loading';
    return built3d().indexOf(item.id) >= 0 ? 'built' : 'notBuilt';
  }
  function missingText(item, status) {
    if (status === 'partial') return KIT.renderer(item.id).partial;
    if (status === 'off') return 'The 3D world is off on this device (it needs WebGL 2), so this object cannot be shown.';
    if (status === 'loading') return 'The 3D world is still loading.';
    if (status === 'notBuilt') return item.board === '05'
      ? 'Not built. The 3D kit has no builder for ' + item.id + ' yet (js/world/object-kit.js).'
      : 'Not built. No renderer is registered for ' + item.id + ' yet (js/kit/board-' + item.board + '.js).';
    return '';
  }
  /* A tile wears the card's whole dress (an Ark card: frame, edge, nameplate) unless its element is a surface itself (an
     Ark card, alert, stat, panel, modal...): then the element wears the nameplate, as it would on a real page, and the
     tile only its corners and edge (an Ark group), so no tile carries two nameplates. Read from the element's own parts
     with Ark UI's part-kind reader, never from a list of elements. */
  function holdsSurface(box) {
    var K = window.ArkKitSkin; if (!K || !K.arkSkinFamilyOfName) return false;
    return Array.prototype.some.call(box.querySelectorAll('[data-ark-part]'), function (n) {
      return K.arkSkinFamilyOfName(String(n.getAttribute('data-ark-part'))) === 'surface';
    });
  }
  var LABEL = { built: 'Built', partial: 'Partial', notBuilt: 'Not built', loading: 'Loading', off: '3D off' };

  /* ---- the worn card's rules, read from the skin that is on --------------------------------------- */
  var RULE_ORDER = ['frame', 'edge', 'ornament', 'marker', 'header', 'density'];
  var PIECE_ORDER = ['frame', 'corner', 'tag', 'ornament', 'divider', 'emblem'];
  function wornRules() {
    var site = window.DefxnSkinSite, a = site && site.active && site.active();
    if (!a || !a.rules) return null;
    var rules = RULE_ORDER.filter(function (k) { return a.rules[k] && a.rules[k] !== 'none' && a.rules[k] !== 'keep'; })
      .map(function (k) { return { key: k, value: String(a.rules[k]) }; });
    var pieces = PIECE_ORDER.filter(function (k) { return a.chrome && a.chrome[k] && a.chrome[k].name; }).map(function (k) { return a.chrome[k].name; });
    return { family: a.family || '', palette: a.palette || '', rules: rules, pieces: pieces };
  }

  /* ---- fit: zoom an element down to its tile, measured ------------------------------------------- */
  var FIT_MIN = .55;
  /* grow: how far an element may be zoomed UP to fill a larger box (the compare panes, where a button alone in a
     tall pane read as a speck); a tile never grows its element */
  function fitOne(box, grow) {
    var fit = box.firstElementChild;
    if (!fit || !fit.classList.contains('kit-fit')) return;
    fit.style.zoom = '';
    var bw = box.clientWidth, bh = box.clientHeight, cw = fit.scrollWidth, ch = fit.scrollHeight;
    if (!bw || !bh || !cw || !ch) return;
    var z = Math.min(grow || 1, bw / cw, bh / ch);
    if (z > 1.005) { fit.style.zoom = String(Math.floor(z * 100) / 100); return; }
    if (z < .995) fit.style.zoom = String(Math.max(FIT_MIN, Math.floor(z * 100) / 100));
  }

  /* ---- looks: elements in the site's own look and under every review card, side by side ------------------
     One view for both ways in. Compare is one element in four panes. All looks is a board stepped through three
     elements at a time, twelve panes to a screen, so every combination of element and card can be seen and a broken one
     found (owner, 2026-10-27). Each pane is dressed by DefxnSkinSite.preview(), the site's one way to dress a box with a
     card. The view lives outside #scene, so a card worn on the page never tints its "site look" column. */
  var CARDS = ['27', '263', '512'], COMPARE_GROW = 1.6, LOOKS_PER = 3;
  var openCompare = null;
  /* items: the elements to step through; at: the first shown; per: how many a step shows (1 = Compare) */
  function looks(items, at, per, onClose) {
    if (openCompare) openCompare.close();
    items = items.filter(function (it) { return KIT.renderer(it.id); });
    if (!items.length) return null;
    var undo = [], closed = false, step = 0, many = items.length > per;
    var layer = el('div', 'kit-compare'); layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'false');
    layer.setAttribute('aria-labelledby', 'kit-compare-title'); layer.dataset.rows = String(per);
    var head = el('div', 'kit-compare-head');
    var t = el('h2', 'kit-compare-title'); t.id = 'kit-compare-title';
    var sub = el('p', 'kit-compare-sub', per === 1 ? 'The same element in the site’s own look and under each sample card.'
      : 'Every element of this board in the site’s own look and under each sample card, ' + per + ' at a time. Arrow keys step through them.');
    var tools = el('div', 'kit-compare-tools');
    var prev = el('button', 'kit-step'); prev.type = 'button'; prev.setAttribute('aria-label', 'Previous elements'); prev.textContent = '←';
    var where = el('span', 'kit-where mono'); where.setAttribute('aria-live', 'polite');
    var next = el('button', 'kit-step'); next.type = 'button'; next.setAttribute('aria-label', 'Next elements'); next.textContent = '→';
    prev.addEventListener('click', function () { go(step - 1); }); next.addEventListener('click', function () { go(step + 1); });
    var close = el('button', 'kit-compare-close'); close.type = 'button'; close.setAttribute('aria-label', 'Close'); close.textContent = '×';
    close.addEventListener('click', function () { api.close(); });
    if (many) { tools.appendChild(prev); tools.appendChild(where); tools.appendChild(next); }
    tools.appendChild(close);
    var words = el('div'); words.appendChild(t); words.appendChild(sub);
    head.appendChild(words); head.appendChild(tools);
    layer.appendChild(head);
    var cols = el('div', 'kit-looks-cols');
    cols.appendChild(el('span'));
    [''].concat(CARDS).forEach(function (n) { cols.appendChild(el('span', 'kit-compare-label mono', n ? 'Sample card ' + n : 'Site look')); });
    if (per > 1) layer.appendChild(cols);
    var panes = el('div', 'kit-compare-panes');
    layer.appendChild(panes);

    function clearPanes() {
      undo.splice(0).reverse().forEach(function (fn) { try { fn(); } catch (e) { if (window.console) console.error('[kit] looks cleanup', e); } });
      panes.textContent = '';
    }
    function pane(item, n, mine) {
      var r = KIT.renderer(item.id);
      var box = el('section', 'kit-compare-pane'); box.dataset.card = n || 'site';
      var label = el('p', 'kit-compare-label mono', per === 1 ? (n ? 'Sample card ' + n : 'Site look') : two(item.n) + ' ' + item.name);
      label.setAttribute('data-ark-skin-title', '');   /* the pane's header: a card's nameplate carries it */
      var rules = el('p', 'kit-compare-rules', n ? 'Putting the card on.' : 'No card worn.');
      var frame = el('div', 'kit-el kit-compare-el'), fit = el('div', 'kit-fit');
      frame.appendChild(fit);
      box.appendChild(frame); box.appendChild(label); box.appendChild(rules);
      try { var u = r.render(fit, { sample: true, item: item }); if (typeof u === 'function') undo.push(u); }
      catch (e) { box.dataset.status = 'error'; fit.appendChild(el('p', 'kit-missing', 'Did not draw: ' + (e && e.message || e) + '.')); }
      box.setAttribute('data-ark-part', holdsSurface(fit) ? 'GROUP' : 'CARD');
      requestAnimationFrame(function () { fitOne(frame, COMPARE_GROW); });
      if (!n) return box;
      var site = window.DefxnSkinSite;
      if (!site || !site.preview) { rules.textContent = 'The skin module is not loaded, so this card cannot be shown.'; return box; }
      site.sample(n).then(function (record) {
        if (closed || mine !== step) return null;
        return site.preview(record, box).then(function (off) {
          if (closed || mine !== step) { off(); return; }
          undo.push(off);
          /* the rules that reached the pane itself, as Ark UI applied them */
          var rep = window.ArkKitSkin && ArkKitSkin.getArkSkinReport ? ArkKitSkin.getArkSkinReport(box) : null;
          var own = rep && rep.parts && rep.parts.filter(function (p) { return p.key === box.getAttribute('data-ark-part'); })[0];
          var applied = own && own.rules && own.rules.applied || {}, said = [];
          RULE_ORDER.forEach(function (k) { if (applied[k] && applied[k] !== 'none' && applied[k] !== 'keep') said.push(k + ' ' + applied[k]); });
          rules.textContent = said.length ? said.join(' · ') : 'This card sent no shape rule this element takes; its colours still change.';
          requestAnimationFrame(function () { requestAnimationFrame(function () { fitOne(frame, COMPARE_GROW); }); });
        });
      }).catch(function (e) { if (!closed && mine === step) rules.textContent = 'This card did not apply: ' + (e && e.message || e) + '. The pane keeps the site’s look.'; });
      return box;
    }
    function go(s) {
      var last = Math.ceil(items.length / per) - 1;
      step = Math.max(0, Math.min(last, s));
      clearPanes();
      var shown = items.slice(step * per, step * per + per);
      t.textContent = '';
      if (per === 1) { t.appendChild(el('span', 'mono', two(shown[0].n))); t.appendChild(document.createTextNode(' ' + shown[0].name)); }
      else { t.appendChild(el('span', 'mono', 'Board ' + shown[0].board)); t.appendChild(document.createTextNode(' ' + BOARDS.board(shown[0].board).title + ': all looks')); }
      where.textContent = two(shown[0].n) + '–' + two(shown[shown.length - 1].n) + ' of ' + items.length;
      prev.disabled = step <= 0; next.disabled = step >= last;
      var mine = step;
      shown.forEach(function (item) {
        if (per > 1) { var rowHead = el('p', 'kit-looks-row mono'); rowHead.appendChild(el('b', null, two(item.n))); rowHead.appendChild(document.createTextNode(item.name)); panes.appendChild(rowHead); }
        [''].concat(CARDS).forEach(function (n) { panes.appendChild(pane(item, n, mine)); });
      });
    }
    /* Esc closes the view and goes no further: the site's own Esc (js/hero-motion.js) means "back to the zero hero" and
       left the Kit when it heard the same press. Arrow keys step. Taken in the capture phase, before any other listener. */
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); api.close(); }
      else if (many && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !(e.target && e.target.closest && e.target.closest('input, textarea, select, [role="slider"], [role="tablist"], [role="toolbar"], [role="tree"], [role="radiogroup"]'))) {
        e.preventDefault(); go(step + (e.key === 'ArrowRight' ? 1 : -1));
      }
    }
    document.addEventListener('keydown', onKey, true);
    var opener = document.activeElement;
    document.body.appendChild(layer);
    go(Math.floor(Math.max(0, at) / per));
    close.focus({ preventScroll: true });
    var api = openCompare = {
      id: per === 1 ? items[0].id : 'all:' + items[0].board,
      close: function () {
        if (closed) return; closed = true;
        document.removeEventListener('keydown', onKey, true);
        clearPanes();
        layer.remove();
        if (openCompare === api) openCompare = null;
        if (opener && opener.isConnected && opener.focus) opener.focus({ preventScroll: true });
        if (onClose) onClose();
      }
    };
    return api;
  }

  ArkUI.pageModules.kit = {
    mount: function (host) {
      /* the block groups' sheet (charts, nav and status blocks) is the Kit's alone: the page links it itself, and the
         tiles are fitted again once it is in, since their sizes change with it */
      var groupsSheet = ArkUI.loadSheet ? ArkUI.loadSheet('css/ark-blocks-groups.css') : Promise.resolve();
      groupsSheet.then(function () { if (page.isConnected) requestAnimationFrame(fitTiles); });
      var boards = BOARDS.boards();
      var cur = { board: boards[0].id, page: 0, item: '', compare: '' }, cleanups = [], tiles = Object.create(null), reportTimer = 0, waitTimer = 0;

      var page = el('section', 'world-page kit-world');
      page.setAttribute('aria-labelledby', 'kit-title');

      /* ---- the header: the board, its tally, the worn card's rules; the board switch and the page steps ---- */
      var head = el('header', 'kit-head rise'); head.setAttribute('data-ui', '');
      var eyebrow = el('p', 'kit-eyebrow mono');
      var title = el('h1', 'kit-title'); title.id = 'kit-title';
      var counts = el('p', 'kit-counts'); counts.setAttribute('aria-live', 'polite');
      var rulesLine = el('p', 'kit-rules'); rulesLine.setAttribute('aria-live', 'polite');
      var words = el('div', 'kit-words'); words.appendChild(eyebrow); words.appendChild(title); words.appendChild(counts); words.appendChild(rulesLine);

      var tabs = el('div', 'kit-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Boards'); tabs.setAttribute('data-ark-part', 'TABSLIST');
      var tabButtons = boards.map(function (b) {
        var t = el('button', 'kit-tab'); t.type = 'button'; t.setAttribute('role', 'tab'); t.dataset.board = b.id; t.title = b.title;
        t.setAttribute('data-ark-part', 'TABSTRIGGER');
        t.appendChild(el('span', 'kit-tab-n mono', b.id)); t.appendChild(el('span', 'kit-tab-name', b.title));
        t.addEventListener('click', function () { show(b.id, '', 0); });
        tabs.appendChild(t);
        return t;
      });
      var pager = el('div', 'kit-pager'); pager.setAttribute('role', 'group'); pager.setAttribute('aria-label', 'Pages of this board'); pager.setAttribute('data-ark-part', 'TOOLBAR');
      var prev = el('button', 'kit-step'); prev.type = 'button'; prev.setAttribute('aria-label', 'Previous nine'); prev.setAttribute('data-ark-part', 'GHOST|BUTTON'); prev.textContent = '←';
      var where = el('span', 'kit-where mono'); where.setAttribute('aria-live', 'polite');
      var next = el('button', 'kit-step'); next.type = 'button'; next.setAttribute('aria-label', 'Next nine'); next.setAttribute('data-ark-part', 'GHOST|BUTTON'); next.textContent = '→';
      prev.addEventListener('click', function () { show(cur.board, '', cur.page - 1); });
      next.addEventListener('click', function () { show(cur.board, '', cur.page + 1); });
      pager.appendChild(prev); pager.appendChild(where); pager.appendChild(next);
      /* every element of this board under every card, three at a time (not on the 3D board: its objects are one world) */
      var allLooks = el('button', 'kit-tile-compare kit-all-looks mono', 'All looks'); allLooks.type = 'button';
      allLooks.title = 'Every element of this board in the site\u2019s look and under each sample card';
      allLooks.addEventListener('click', function () { showCompare('all:' + cur.board); });
      pager.appendChild(allLooks);
      var controls = el('div', 'kit-controls'); controls.appendChild(tabs); controls.appendChild(pager);
      head.appendChild(words); head.appendChild(controls);
      page.appendChild(head);

      /* ---- boards 01-04: nine tiles ---- */
      var grid = el('ol', 'kit-grid rise'); grid.setAttribute('data-ui', '');
      page.appendChild(grid);

      /* ---- board 05: the page's names on the left, the 3D frame on the right ---- */
      var objects = el('div', 'kit-objects');
      var list = el('ol', 'kit-list rise'); list.setAttribute('data-ui', ''); list.setAttribute('aria-label', 'Objects'); list.setAttribute('data-ark-part', 'LIST');
      var stage = el('div', 'kit-stage'); stage.setAttribute('data-stage', ''); stage.setAttribute('aria-hidden', 'true');
      var note3d = el('p', 'kit-note3d'); note3d.setAttribute('role', 'status');
      objects.appendChild(list); objects.appendChild(stage); objects.appendChild(note3d);
      page.appendChild(objects);

      function board() { return BOARDS.board(cur.board); }
      function pages() { return Math.max(1, Math.ceil(board().items.length / PER)); }
      function onPage() { return board().items.slice(cur.page * PER, cur.page * PER + PER); }

      function paintRules() {
        var r = wornRules();
        rulesLine.textContent = '';
        rulesLine.hidden = !r;
        if (!r) return;
        rulesLine.appendChild(el('b', 'mono', (r.family ? 'Set ' + r.family : 'Card rules') + ' · '));
        rulesLine.appendChild(document.createTextNode(r.rules.map(function (x) { return x.key + ' ' + x.value; }).join(' · ')));
        if (r.pieces.length) rulesLine.title = 'Pieces: ' + r.pieces.join(', ');
      }

      function paintHead() {
        var b = board(), tally = { built: 0, partial: 0, notBuilt: 0 };
        b.items.forEach(function (it) { var s = statusOf(it); if (tally[s] !== undefined) tally[s]++; });
        eyebrow.textContent = 'Kit · Board ' + b.id + ' of ' + two(boards.length) + ' · Sample data';
        title.textContent = b.title;
        var w = b.kind === '3d' ? worldState() : 'ready';
        counts.textContent = w === 'off' ? 'The 3D world is off on this device, so this board cannot be shown.'
          : w === 'loading' ? 'The 3D world is loading.'
          : tally.built + ' built · ' + tally.partial + ' partial · ' + tally.notBuilt + ' not built';
        tabButtons.forEach(function (t) {
          var on = t.dataset.board === cur.board;
          t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1;
          if (on) t.setAttribute('data-state', 'active'); else t.removeAttribute('data-state');
        });
        var n = pages(), first = cur.page * PER + 1, last = Math.min(b.items.length, first + PER - 1);
        where.textContent = two(first) + '–' + two(last) + ' of ' + b.items.length;
        prev.disabled = cur.page <= 0; next.disabled = cur.page >= n - 1;
        allLooks.hidden = b.kind === '3d';
        page.dataset.kitBoard = cur.board;
        paintRules();
      }

      /* ---- one tile: an Ark card holding the element, or what it is missing ---- */
      function drawTile(item) {
        var status = statusOf(item);
        var li = el('li', 'kit-tile'); li.dataset.kitId = item.id; li.dataset.status = status;
        var cap = el('div', 'kit-tile-cap');
        /* the tile's header: a worn nameplate takes its name and number and the caption steps aside (Ark UI fillNameplate) */
        var capN = el('span', 'kit-tile-n mono', two(item.n)), capName = el('span', 'kit-tile-name', item.name);
        capN.setAttribute('data-ark-skin-index', ''); capName.setAttribute('data-ark-skin-title', '');
        cap.appendChild(capN); cap.appendChild(capName);
        if (status !== 'built') cap.appendChild(el('span', 'kit-tile-state mono', LABEL[status]));
        var box = el('div', 'kit-el'), fit = el('div', 'kit-fit');
        box.appendChild(fit);
        li.appendChild(box);
        var r = KIT.renderer(item.id);
        if (r) {
          var cmp = el('button', 'kit-tile-compare mono', 'Compare'); cmp.type = 'button';
          cmp.title = 'This element in the site\u2019s look and under each sample card, side by side';
          cmp.addEventListener('click', function () { showCompare(item.id); });
          cap.appendChild(cmp);
          try {
            var undo = r.render(fit, { sample: true, item: item });
            if (typeof undo === 'function') cleanups.push(undo);
          } catch (error) {
            fit.textContent = '';
            li.dataset.status = 'error';
            fit.appendChild(el('p', 'kit-missing', 'Did not draw: ' + (error && error.message || error) + '. Fix its renderer in js/kit/board-' + item.board + '.js.'));
            if (window.console) console.error('[kit] ' + item.id, error);
          }
        } else {
          box.classList.add('kit-el-missing');
          box.appendChild(el('p', 'kit-missing', missingText(item, status)));
        }
        /* one line on the tile, so the element keeps its room; the whole sentence on hover and in the dock */
        if (status === 'partial') { var note = el('p', 'kit-partial', missingText(item, status)); note.title = missingText(item, status); li.appendChild(note); }
        li.appendChild(cap);
        li.setAttribute('data-ark-part', holdsSurface(fit) ? 'GROUP' : 'CARD');
        tiles[item.id] = li;
        return li;
      }
      function drawGrid() {
        runCleanups(); tiles = Object.create(null); grid.textContent = '';
        onPage().forEach(function (item) { grid.appendChild(drawTile(item)); });
        requestAnimationFrame(fitTiles);
      }
      function fitTiles() { Object.keys(tiles).forEach(function (id) { var b = tiles[id].querySelector('.kit-el'); if (b) fitOne(b); }); }

      /* compare: the element under every card; the dock and the canvas both open it */
      /* compare one element ("02-donut-chart-module"), or step through every element of a board in all looks ("all:02") */
      function showCompare(id) {
        var all = /^all:(\d\d)$/.exec(id || ''), board = all ? BOARDS.board(all[1]) : null, it = all ? null : BOARDS.item(id);
        if (all ? !board || board.kind === '3d' : !it || it.board === '05' || !KIT.renderer(id)) return;
        cur.compare = id;
        var done = function () { if (cur.compare === id) { cur.compare = ''; report(); } };
        if (all) looks(board.items, cur.board === board.id ? cur.page * PER : 0, LOOKS_PER, done);
        else looks([it], 0, 1, done);
        report();
      }

      /* ---- the 3D board's list: the page's nine ---- */
      function drawList() {
        list.textContent = ''; tiles = Object.create(null);
        onPage().forEach(function (item) {
          var status = statusOf(item);
          var li = el('li', 'kit-row'); li.dataset.kitId = item.id; li.dataset.status = status;
          var b = el('button', 'kit-row-btn'); b.type = 'button'; b.setAttribute('data-ark-part', 'ITEM');
          b.setAttribute('aria-pressed', cur.item === item.id ? 'true' : 'false');
          b.appendChild(el('span', 'kit-tile-n mono', two(item.n)));
          b.appendChild(el('span', 'kit-row-name', item.name));
          if (status !== 'built') b.appendChild(el('span', 'kit-tile-state mono', LABEL[status]));
          if (status === 'notBuilt') b.title = missingText(item, status);
          b.addEventListener('click', function () { show('05', cur.item === item.id ? '' : item.id, cur.page); });
          li.appendChild(b); list.appendChild(li); tiles[item.id] = li;
        });
        var w = worldState();
        if (w === 'ready') fillTags();
        note3d.hidden = w === 'ready';
        note3d.textContent = w === 'off' ? 'The 3D world is off on this device (it needs WebGL 2), so the objects cannot be shown. The list still names them.'
          : 'The 3D world is loading. The objects appear when it is ready.';
      }

      /* the objects' names over the 3D (the world's label layer for the 'kit' view). One label per object the stage
         can build; the stage shows only the labels of the page on screen, or the chosen object's alone. */
      function fillTags() {
        var h = world(); if (!h || !h.tags) return;
        var layer = h.tags('kit'), ids = built3d();
        var have = Array.prototype.map.call(layer.children, function (n) { return n.dataset.tag; }).join(' ');
        if (have === ids.join(' ')) return;
        layer.textContent = '';
        ids.forEach(function (id) {
          var it = BOARDS.item(id); if (!it) return;
          var t = el('span', 'tag small'); t.dataset.tag = id; t.dataset.at = 'below';
          t.appendChild(el('b', null, two(it.n))); t.appendChild(document.createTextNode(it.name));
          layer.appendChild(t);
        });
      }

      function runCleanups() {
        cleanups.splice(0).forEach(function (fn) { try { fn(); } catch (e) { if (window.console) console.error('[kit] cleanup', e); } });
      }

      function tellWorld() {
        var h = world(), sel = { view: 'kit', b: cur.board, p: cur.page, s: cur.board === '05' ? cur.item : '' };
        if (!h) return;
        if (h.ready && h.select) h.select(sel); else if (h.state) h.state(sel);
      }

      function report() {
        if (!preview) return;
        clearTimeout(reportTimer);
        reportTimer = setTimeout(function () {
          var b = board();
          var items = b.items.map(function (it) { var s = statusOf(it); return { id: it.id, n: it.n, name: it.name, status: s, missing: missingText(it, s) }; });
          try { window.parent.postMessage({ type: 'defxn-cms-kit-report', board: b.id, page: cur.page, compare: cur.compare, pages: pages(), per: PER, item: cur.item, items: items, rules: wornRules(), world: worldState() }, location.origin); } catch (e) { /* the editor is gone */ }
        }, 30);
      }

      function mark(id) {
        Object.keys(tiles).forEach(function (k) { tiles[k].toggleAttribute('data-current', k === id); });
      }

      /* show(board, item, page): an item brings its own page; a page out of range is clamped */
      function show(boardId, itemId, pageNo, compareId) {
        var b = BOARDS.board(boardId) || board();
        var it = itemId && BOARDS.item(itemId) && BOARDS.item(itemId).board === b.id ? BOARDS.item(itemId) : null;
        var n = Math.max(1, Math.ceil(b.items.length / PER));
        var pg = it ? Math.floor((it.n - 1) / PER) : Math.max(0, Math.min(n - 1, Number(pageNo) || 0));
        var redraw = b.id !== cur.board || pg !== cur.page || !Object.keys(tiles).length;
        cur.board = b.id; cur.page = pg; cur.item = it ? it.id : '';
        var is3d = b.kind === '3d';
        grid.hidden = is3d; objects.hidden = !is3d;
        if (is3d) { if (redraw) { runCleanups(); grid.textContent = ''; } drawList(); }
        else if (redraw) { drawGrid(); if (window.DefxnSkinSite && DefxnSkinSite.active && DefxnSkinSite.active()) onSkin(); }
        paintHead(); mark(cur.item); tellWorld(); report();
        if (is3d && worldState() === 'loading') waitForWorld();
        if (compareId !== undefined) {
          if (compareId && compareId !== cur.compare) showCompare(compareId);
          else if (!compareId && openCompare) openCompare.close();
        }
      }
      function waitForWorld() {
        var h = world();
        if (h && h.whenReady) h.whenReady(function () { if (page.isConnected && cur.board === '05') show('05', cur.item, cur.page); });
        clearTimeout(waitTimer);
        waitTimer = setTimeout(function () { if (page.isConnected && cur.board === '05') show('05', cur.item, cur.page); }, 4000);
      }

      /* A worn nameplate is drawn as the card drew it, and a card's drawing can reach lower than the box Ark UI gives it
         (sample 512's did: 30px under its box). So the room under the top edge is measured from what is drawn, per tile,
         and the element starts below it (css/kit.css --kit-plate). */
      function fitPlates() {
        Object.keys(tiles).forEach(function (id) {
          var li = tiles[id], d = li.querySelector(':scope > [data-ark-skin-deco="nameplate"]');
          if (!d) { li.style.removeProperty('--kit-plate'); return; }
          var top = li.getBoundingClientRect().top, low = top;
          [d].concat(Array.prototype.slice.call(d.querySelectorAll('*'))).forEach(function (n) { var r = n.getBoundingClientRect(); if (r.height) low = Math.max(low, r.bottom); });
          li.style.setProperty('--kit-plate', Math.ceil(low - top) + 'px');
        });
      }
      /* a card put on or taken off: name its rules, make room for its nameplates, and tell the editor */
      function onSkin() { requestAnimationFrame(function () { requestAnimationFrame(function () { if (page.isConnected) { fitPlates(); fitTiles(); paintRules(); report(); } }); }); }
      document.addEventListener('ark:skin', onSkin); document.addEventListener('defxn:skin', onSkin);

      ArkUI.kitPage = { show: show, current: function () { return { board: cur.board, page: cur.page, item: cur.item }; } };
      page.arkDispose = function () {
        runCleanups(); clearTimeout(reportTimer); clearTimeout(waitTimer);
        if (openCompare) openCompare.close();
        document.removeEventListener('ark:skin', onSkin); document.removeEventListener('defxn:skin', onSkin);
        if (ArkUI.kitPage && ArkUI.kitPage.show === show) delete ArkUI.kitPage;
      };

      var insert = el('div', 'world-insert'); insert.setAttribute('data-ark-insert', 'main'); page.appendChild(insert);
      host.appendChild(page);
      show(cur.board, '', 0);
      return page;
    }
  };
})();
