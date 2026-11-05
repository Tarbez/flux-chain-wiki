/* Resolutions: ONE page that answers "what can I do with DEFXN?" (owner-approved, 2026-11-05), on the space's game layout
   (css/space-frame.css, docs/design/space/SPACE.md "The page layout"; 2026-11-05 HUD rebuild).
   Layer: app (a page of the DEFXN site); structure from js/content/resolutions.js, words from the `resolutions` manifest.

   Left (.hud-left): the answer, the 5 domains as .hud-tabs, the open domain's jobs as a compact list, and the open job's three
   steps in .hud-body. Right (.hud-right): three counts derived from the list, and the status link. Dock (.hud-dock): one chip that
   replays the job's steps in the space, and ONE .hud-go to the job's start page. The middle is the 3D world's.
   Each job row is a button with aria-expanded and aria-controls; Up/Down/Home/End move between rows. The 20 old
   /resolutions/<slug> pages redirect here with ?s=<slug>; that job opens first, and choosing another rewrites the query with
   ArkUI.route.write 'replace' (no navigation) and replays the job's show (js/space/shows/resolutions.mjs `replay`).

   Removed in the HUD rebuild: the deck-sized header, the "Replaces:" line, the 20-row two-column grid (one domain shows at a
   time), and the secondary also-links (the start page is the one action; jobs without one fall back to /resolvers). Sheet:
   css/resolutions-one.css. */
(function () {
  'use strict';

  var STEP_NAMES = ['Define', 'Publish', 'Resolve'];
  var base = location.protocol === 'file:' ? '' : '/';

  function words(role) { return ArkCopy.text('RESOLUTIONS.' + role); }
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }
  /* A route value from the manifest ('route:stats/now') -> its page key, or null when it is not a route. */
  function routeKey(value) { var m = /^route:(.+)$/.exec(String(value || '')); return m ? m[1] : null; }
  /* An in-site link the router follows (data-scene-link), only to a page the catalog has. */
  function pageLink(pageKey, label, cls) {
    if (!pageKey || !ArkUI.pageCatalog[pageKey]) return null;
    var a = el('a', cls, label || String(ArkUI.pageCatalog[pageKey].title).split(' — ')[0]);
    a.href = ArkUI.route.href('/' + pageKey);
    a.dataset.sceneLink = pageKey;
    return a;
  }
  function slugFromQuery() {
    var search = ArkUI.route && ArkUI.route.search ? ArkUI.route.search() : String(location.search).replace(/^\?/, '');
    return new URLSearchParams(search).get('s') || '';
  }
  function stat(value, label) { var s = el('div', 'hud-stat'); s.appendChild(el('b', null, String(value))); s.appendChild(el('span', null, label)); return s; }
  /* Replays the open job's show in the space; quiet when the space or the show module is not there (a page with no 3D still reads). */
  function replay(item) {
    var space = window.ArkSpace;
    if (!space || !space.whenReady) return;
    space.whenReady(function () {
      import(base + 'js/space/shows/resolutions.mjs')
        .then(function (m) { if (m.replay) m.replay(space, item); })
        .catch(function (e) { if (window.console) console.warn('[resolutions] the job show did not load, so the space stays still (' + e.message + ')'); });
    });
  }

  function mount(host, pageKey) {
    var groups = ArkResolutions.list(), all = ArkResolutions.all();
    /* an old /resolutions/<slug> key still opens its item, should the router hand one over */
    var asked = String(pageKey || '').indexOf('resolutions/') === 0 ? String(pageKey).slice('resolutions/'.length) : slugFromQuery();
    var page = el('section', 'res1 hud');
    page.setAttribute('aria-labelledby', 'resolutions-title');

    var left = el('div', 'hud-left hud-card');
    left.appendChild(el('p', 'hud-kicker', words('PROMISE')));
    var title = el('h1', 'hud-title', words('TITLE')); title.id = 'resolutions-title';
    left.appendChild(title);
    left.appendChild(el('p', 'hud-answer', words('DECK')));

    var tabs = el('div', 'hud-tabs'); tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', words('JUMP'));
    var list = el('nav', 'res1-list'); list.setAttribute('aria-label', 'Resolutions');
    var panel = el('article', 'hud-body res1-panel'); panel.id = 'res1-panel'; panel.setAttribute('aria-live', 'polite');
    left.appendChild(tabs); left.appendChild(list); left.appendChild(panel);

    var rows = [], tabButtons = [], openItem = null;
    function showGroup(key) {
      tabButtons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.group === key)); });
      list.textContent = ''; rows = [];
      var ul = el('ul', 'res1-rows');
      ArkResolutions.groupFor(key).items.forEach(function (item) {
        var li = el('li'), button = el('button', 'res1-row', ArkResolutions.shortName(item.title));
        button.type = 'button';
        button.title = item.line;
        button.setAttribute('aria-controls', 'res1-panel');
        button.setAttribute('aria-expanded', String(!!openItem && openItem.slug === item.slug));
        button.dataset.slug = item.slug;
        button.addEventListener('click', function () { open(item, true); });
        li.appendChild(button); ul.appendChild(li); rows.push(button);
      });
      list.appendChild(ul);
    }
    groups.forEach(function (group) {
      var b = el('button', 'hud-chip', group.title); b.type = 'button'; b.dataset.group = group.key;
      b.addEventListener('click', function () { showGroup(group.key); });
      tabs.appendChild(b); tabButtons.push(b);
    });

    list.addEventListener('keydown', function (event) {
      var at = rows.indexOf(document.activeElement), to = -1;
      if (at < 0) return;
      if (event.key === 'ArrowDown') to = Math.min(rows.length - 1, at + 1);
      else if (event.key === 'ArrowUp') to = Math.max(0, at - 1);
      else if (event.key === 'Home') to = 0;
      else if (event.key === 'End') to = rows.length - 1;
      if (to < 0) return;
      event.preventDefault(); rows[to].focus();
    });

    /* right: three counts, each derived from the list, and the status link */
    var right = el('aside', 'hud-right');
    var stats = el('div', 'hud-stats');
    stats.appendChild(stat(all.length, words('STAT.JOBS')));
    stats.appendChild(stat(groups.length, words('STAT.DOMAINS')));
    stats.appendChild(stat(all.filter(function (x) { return x.start && ArkUI.pageCatalog[x.start]; }).length, words('STAT.PAGES')));
    right.appendChild(stats);
    var actions = el('div', 'hud-actions');
    actions.appendChild(el('p', 'res1-note', words('NOTE')));
    var status = pageLink(routeKey(words('NOTE.LINK.HREF')), words('NOTE.LINK'), 'res1-link');
    if (status) actions.appendChild(status);
    right.appendChild(actions);

    /* dock: replay the steps, and the one way on */
    var dock = el('div', 'hud-dock');
    var again = el('button', 'hud-chip', words('REPLAY')); again.type = 'button';
    again.addEventListener('click', function () { if (openItem) replay(openItem); });
    dock.appendChild(again);
    var go = el('a', 'hud-go', words('START'));
    dock.appendChild(go);

    function open(item, write) {
      openItem = item;
      showGroup(item.group);
      panel.textContent = '';
      panel.appendChild(el('h2', 'res1-panel-title', item.title));
      panel.appendChild(el('p', 'res1-shift', item.shift));
      var ol = el('ol', 'res1-steps');
      item.steps.forEach(function (step, i) {
        var li = el('li', 'res1-step');
        li.appendChild(el('strong', 'res1-step-name', (i + 1) + ' · ' + STEP_NAMES[i]));
        li.appendChild(el('span', 'res1-step-text', step));
        ol.appendChild(li);
      });
      panel.appendChild(ol);
      /* the one action: the job's start page, else how resolvers work */
      var key = item.start && ArkUI.pageCatalog[item.start] ? item.start : routeKey(words('START.FALLBACK.HREF'));
      if (key && ArkUI.pageCatalog[key]) { go.href = ArkUI.route.href('/' + key); go.dataset.sceneLink = key; go.hidden = false; }
      else go.hidden = true;
      if (write) {
        if (ArkUI.route && ArkUI.route.write) ArkUI.route.write('/resolutions', 's=' + item.slug, 'replace');
        replay(item);
      }
    }

    page.appendChild(left); page.appendChild(right); page.appendChild(dock);
    open(ArkResolutions.find(asked) || all[0], false);
    host.appendChild(page);
    return page;
  }

  ArkUI.pageModules.resolutions = { mount: mount };
})();
