/* #/trace — Trace a record (owner, 2026-10-24: "move the new orange box into a new page and remove that
   from the home illustration"). The record descent's 3D (home-descent.js) is this page's stage: the newest
   record as a glass box, the line of older records back to the first one. This file is the page: the
   chain's records from newest to first, read from records-sample.js, and the chosen one's way on.

   #/trace?s=<record id> chooses a record (?s, as every added view); with none, the newest. Labels: newest, prev, genesis. */
(function () {
  'use strict';
  var REC = window.DEFXN_RECORDS, main = document.querySelector('main.views');
  if (!REC || !main || !window.DEFXNKitUI) return;
  var esc = window.DEFXNKitUI.esc, list = REC.records;
  var ARROW = '<svg viewBox="0 0 26 20" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M1 10h23M15 1l9 9-9 9"/></svg>';
  var ARROW_L = '<svg viewBox="0 0 16 14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 7H2M7.5 1.5L2 7l5.5 5.5"/></svg>';
  window.DEFXN_EXTRA_VIEWS = window.DEFXN_EXTRA_VIEWS || {};
  window.DEFXN_EXTRA_VIEWS.trace = { title: 'Trace a record' };

  var minimap = (document.querySelector('[data-kit="minimap"]') || {}).innerHTML || '';
  main.insertAdjacentHTML('beforeend',
    '<section class="view page cview tview" data-view="trace" aria-labelledby="trace-title">' +
    '<div class="page-top"><nav class="crumbs" aria-label="Where you are"><span class="path"><b>DEFXN</b> / Trace a record</span>' +
    '<a class="back" href="#/">' + ARROW_L + 'Back to network</a></nav><a class="minimap" href="#/" aria-label="Back to the network">' + minimap + '</a></div>' +
    '<div class="chain-body"><div class="stage-col"><div class="stage" data-stage></div>' +
    '<p class="stage-note mono">A sample chain from the owner’s board. It shows no live state.</p></div>' +
    '<div class="sheet-slot" data-panel><div class="sheet">' +
    '<p class="eyebrow-dot mono">Trace a record · sample</p>' +
    '<h1 id="trace-title" class="two">Every record leads somewhere. <span>See for yourself.</span></h1>' +
    '<p class="sheet-lede">Each record links to the one before it, back to the chain’s first record. Follow the links, and check each signature on the way.</p>' +
    '<ol class="trace" data-tr="list" aria-label="The chain, newest record first"></ol>' +
    '<div class="sheet-foot"><a class="cta small" data-tr="cta"><span class="say">Open this record ' + ARROW + '</span></a>' +
    '<a class="more" data-tr="more">See its links</a></div>' +
    '</div></div></div><span></span></section>');
  document.body.insertAdjacentHTML('beforeend', '<div class="tags" data-for="trace" aria-hidden="true"></div>');

  function $(name) { return main.querySelector('.view[data-view="trace"] [data-tr="' + name + '"]'); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function chosen() {
    var h = location.hash.replace(/^#\/?/, '').split('?'), q = new URLSearchParams(h[1] || '');
    var i = list.findIndex(function (r) { return r.id === q.get('s'); });
    return { view: h[0], i: i < 0 ? 0 : i };
  }
  /* the list is built once; a new choice moves aria-current, so the rows never rebuild under the pointer */
  $('list').innerHTML = list.map(function (r, i) {
    var older = list[i + 1], first = i === list.length - 1;
    return '<li><a href="#/trace?s=' + esc(r.id) + '" data-stay data-i="' + i + '">' +
      '<span class="n mono">#' + pad(list.length - i) + '</span>' +
      '<b>' + esc(r.title) + (first ? ' <span class="state" data-state="built">Genesis</span>' : '') + '</b>' +
      '<small>' + esc((r.revision ? 'Rev ' + pad(r.revision) + ' · ' : '') + r.date + ' · ' + (r.signedBy ? 'Signed by ' + r.signedBy : 'Not signed in this sample')) + '</small>' +
      '<small class="to">' + esc(older ? 'Links to ' + older.title : 'The first record. It links to nothing before it.') + '</small></a></li>';
  }).join('');
  /* labels for the stage's 3D: the newest record, the one before it, and the first one */
  var layer = document.querySelector('.tags[data-for="trace"]'), last = list[list.length - 1];
  layer.innerHTML = [['newest', '#' + pad(list.length) + ' ' + list[0].title, 'Newest record', ' hot'], ['prev', 'Previous record', list[1] ? 'Points to ' + list[1].title : '', ''],
    ['genesis', 'Genesis', 'First record: ' + last.title, '']].map(function (t) {
    return '<span class="tag' + t[3] + '" data-tag="' + t[0] + '"><b>' + esc(t[1]) + '</b>' + esc(t[2]) + '</span>';
  }).join('');

  function fill() {
    var c = chosen(); if (c.view !== 'trace') return;
    var r = list[c.i];
    main.querySelectorAll('.view[data-view="trace"] .trace a').forEach(function (a) { a.setAttribute('aria-current', +a.dataset.i === c.i); });
    /* the big box's card shows the chosen record, so its label names that record (updated in place: the app keeps the element) */
    var nl = layer.querySelector('[data-tag="newest"]');
    if (nl) nl.innerHTML = '<b>' + esc('#' + pad(list.length - c.i) + ' ' + r.title) + '</b>' + esc(c.i === 0 ? 'Newest record' : 'The record you chose');
    $('cta').href = '#/open?r=' + encodeURIComponent(r.id);
    $('more').href = '#/links?r=' + encodeURIComponent(r.id);
  }
  /* a choice inside the page replaces the entry, so Back leaves the page */
  main.addEventListener('click', function (e) { var a = e.target.closest('.tview [data-stay]'); if (!a) return; e.preventDefault(); location.replace(a.getAttribute('href')); });
  window.addEventListener('hashchange', fill);
  fill();
})();
