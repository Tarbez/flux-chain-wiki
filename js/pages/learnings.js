/* =====================================================================
   NOTES (/learnings): the one shelf for long reading.
   ---------------------------------------------------------------------
   Owner decision 2026-11-05: /concept, its theory pages, /resolver-math, /dao and /reference
   redirect here, so every long read is found in one list. The list has three shelves, each row
   one line (title, short summary). An article opens as its own page (/learnings/<slug>). Every
   other row opens IN PLACE, in the reader panel beside the list: the row's own page module
   (its catalog entry in js/pages/catalog.js) is loaded with ArkUI.loadPage and mounted into the
   panel, so its content is rendered by the code that owns it and is never copied here.
   An open row is in the address as ?open=<catalog key>, so a redirect or a shared link can name it.

   Every shelf is DERIVED: notes from LearningContent.articles, theory from the theory manifests
   (ArkManifest.group('theory'), as js/pages/concept.js lists them), and the rest from the page
   catalog. A row whose page is not in the catalog is not drawn. The only words typed here are
   the page's own and the three fixed rows' summaries.
   2026-11-05: the page stands on the space in the shared game layout (css/space-frame.css, the .hud classes of
   docs/design/space/SPACE.md): the shelves are .hud-tabs, the open shelf's rows or the reader fill .hud-body (the one
   part that scrolls), the shelf counts stand top right, and the dock holds the one action. The middle is the 3D's; its
   show is js/space/shows/learnings.mjs. Removed then: the breadcrumb and the hero block (the HUD's kicker and title say
   it), and the list-beside-reader grid. Kept: ?open=, data-notes-open, aria-current on the open row, arkDispose. */
(function () {
  'use strict';

  var SHEET = 'css/notes-one.css';
  var WORDS = 10;

  /* A summary that fits one line: its first clause when that is at most WORDS words, else the
     whole summary, which the row's CSS clips to one line (the full text stays in the title). */
  function short(text) {
    text = String(text || '').trim();
    var clause = text.split(/[,.;:—–]\s/)[0].trim();
    return clause.split(/\s+/).length <= WORDS ? clause.replace(/[.,;:]$/, '') : text;
  }

  function copy(key, fallback) {
    var text = typeof ArkCopy !== 'undefined' && ArkCopy.text ? ArkCopy.text(key) : '';
    return text && text !== key ? String(text).replace(/\.$/, '') : fallback;
  }

  function shelves() {
    var catalog = ArkUI.pageCatalog || {};
    var notes = (LearningContent.articles || []).map(function (a) {
      return { key: 'article/' + a.slug, title: a.title, summary: short(a.summary), full: a.summary, page: true };
    });
    var theory = (typeof ArkManifest !== 'undefined' ? ArkManifest.group('theory') : []).map(function (m) {
      return { key: 'concept/' + m.id, title: copy(m.id.toUpperCase() + '.TITLE', m.title), summary: m.title };
    });
    theory.push({ key: 'resolver-math', title: 'The math behind a resolver', summary: 'Take a term out and see what stops working' });
    var reference = [
      { key: 'dao', title: copy('DAO.TITLE', 'Who can change what'), summary: 'Who decides changes, for the base and each network' },
      { key: 'reference', title: 'Canonical reference', summary: 'The protocol documents, read from their source' }
    ];
    return [
      { id: 'notes', label: 'Notes', items: notes },
      { id: 'theory', label: 'Theory', items: theory },
      { id: 'reference', label: 'Reference', items: reference }
    ].map(function (shelf) {
      shelf.items = shelf.items.filter(function (item) { return catalog[item.key]; });
      return shelf;
    }).filter(function (shelf) { return shelf.items.length; });
  }

  function hrefOf(item) {
    return item.page ? ArkUI.route.href(ArkUI.pageCatalog[item.key].path) : ArkUI.route.href('/learnings?open=' + encodeURIComponent(item.key));
  }

  function node(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function mount(host) {
    var list = shelves();
    var page = node('section', 'hud learnings-page notes-one');
    page.setAttribute('aria-labelledby', 'learnings-title');

    var left = node('div', 'hud-left');
    left.appendChild(node('p', 'hud-kicker', 'Notes'));
    var title = node('h1', 'hud-title', 'Notes from the work.'); title.id = 'learnings-title';
    left.appendChild(title);
    left.appendChild(node('p', 'hud-answer', 'How DEFXN was built, in ' + list.reduce(function (n, s) { return n + s.items.length; }, 0) + ' reads.'));
    var tabs = node('div', 'hud-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Shelves');
    var body = node('div', 'hud-body notes-one__body'); body.setAttribute('role', 'tabpanel'); body.setAttribute('aria-live', 'polite'); body.setAttribute('tabindex', '-1');
    left.appendChild(tabs); left.appendChild(body);

    /* the shelf counts: three real figures, one per shelf */
    var right = node('div', 'hud-right'), stats = node('div', 'hud-stats');
    list.forEach(function (shelf) {
      var stat = node('div', 'hud-stat'); stat.appendChild(node('b', null, String(shelf.items.length))); stat.appendChild(node('span', null, shelf.label));
      stats.appendChild(stat);
    });
    right.appendChild(stats);

    /* the one action: the newest note, which opens as its own page */
    var dock = node('div', 'hud-dock'), first = list[0] && list[0].items[0];
    if (first) { var go = node('a', 'hud-go', 'Read the first note'); go.href = hrefOf(first); go.title = first.title; dock.appendChild(go); }

    var rows = {}, tabFor = {}, shelfOf = {}, current = null, ticket = 0;
    function rowsOf(shelf) {
      var ol = node('ol', 'notes-one__rows');
      shelf.items.forEach(function (item) {
        var li = node('li', 'notes-one__row'), a = node('a', 'notes-one__link');
        a.href = hrefOf(item); a.title = item.full || item.summary;
        if (!item.page) a.setAttribute('data-notes-open', item.key);
        a.appendChild(node('span', 'notes-one__title', item.title));
        a.appendChild(node('span', 'notes-one__summary', item.summary));
        li.appendChild(a); ol.appendChild(li); rows[item.key] = a;
      });
      return ol;
    }
    function close() { ticket++; if (current && current.arkDispose) current.arkDispose(); current = null; }
    function showShelf(id) {
      close();
      Object.keys(tabFor).forEach(function (k) { tabFor[k].setAttribute('aria-selected', k === id ? 'true' : 'false'); });
      var shelf = list.filter(function (s) { return s.id === id; })[0];
      rows = {}; body.textContent = ''; if (shelf) body.appendChild(rowsOf(shelf)); body.scrollTop = 0;
    }
    list.forEach(function (shelf) {
      shelf.items.forEach(function (item) { shelfOf[item.key] = shelf.id; });
      var b = node('button', 'hud-chip', shelf.label); b.type = 'button'; b.setAttribute('role', 'tab');
      b.addEventListener('click', function () { showShelf(shelf.id); });
      tabs.appendChild(b); tabFor[shelf.id] = b;
    });

    /* Opens one row's page in the reader (the body). A page that fails to load is a refusal that names what failed and how
       to reach it, not a blank panel. */
    async function open(key) {
      showShelf(shelfOf[key]);
      var mine = ++ticket;
      if (rows[key]) rows[key].setAttribute('aria-current', 'true');
      var back = node('button', 'hud-chip notes-one__back', 'Back to ' + (tabFor[shelfOf[key]] ? tabFor[shelfOf[key]].textContent : 'the list'));
      back.type = 'button';
      back.addEventListener('click', function () { if (history.replaceState) history.replaceState(history.state, '', ArkUI.route.href('/learnings')); showShelf(shelfOf[key]); });
      var reader = node('section', 'notes-one__reader');
      reader.appendChild(node('p', 'notes-one__empty', 'Opening…'));
      body.textContent = ''; body.appendChild(back); body.appendChild(reader);
      try {
        var definition = ArkUI.pageCatalog[key];
        var module = await ArkUI.loadPage(key, definition);
        if (module.prepare) await module.prepare(key, { query: '' });
        if (mine !== ticket) return;
        reader.textContent = '';
        current = module.mount(reader, key);
        body.scrollTop = 0;
      } catch (error) {
        if (mine !== ticket) return;
        reader.textContent = '';
        reader.appendChild(node('p', 'notes-one__empty',
          'This page could not open here: ' + String(error && error.message || error) + '. Reload Notes and choose it again.'));
      }
    }
    body.addEventListener('click', function (event) {
      var a = event.target.closest && event.target.closest('a[data-notes-open]');
      if (!a || event.metaKey || event.ctrlKey || event.shiftKey || event.button) return;
      event.preventDefault(); event.stopPropagation();
      if (typeof history !== 'undefined' && history.replaceState) history.replaceState(history.state, '', a.href);
      open(a.getAttribute('data-notes-open'));
    });

    [left, right, dock].forEach(function (el) { page.appendChild(el); });
    var anchor = node('div'); anchor.setAttribute('data-ark-insert', 'main'); page.appendChild(anchor);
    host.appendChild(page);

    var asked = new URLSearchParams(ArkUI.route.search()).get('open');
    if (asked && shelfOf[asked] && !(ArkUI.pageCatalog[asked] && /^article\//.test(asked))) open(asked);
    else if (list[0]) showShelf(list[0].id);
    page.arkDispose = close;
    return page;
  }

  ArkUI.pageModules.learnings = {
    mount: function (host) {
      if (ArkUI.loadStyles) ArkUI.loadStyles({ styles: [SHEET] }).catch(function () {});
      return mount(host);
    }
  };
})();
