/* /monitor: the live fleet pulse, and nothing else.

   Production reads the hourly self-bench through /api/fleet-pulse, the site's
   same-origin TLS boundary (window.ArkPulseEndpoint may override it locally).
   LIVE values come from the latest pulse; SESSION is what this tab has received
   since it opened. Audited measurements are not repeated here: they are dated
   evidence, not now, and live on /stats with their records. Shares the
   dashboard styles in css/stats-dashboard.css. */
(function () {
  'use strict';
  var POLL_MS = 60000;
  var STALE_MS = 2 * 60 * 60 * 1000;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function fmt(n) { return Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }); }
  function href(key) { var entry = ArkUI.pageCatalog && ArkUI.pageCatalog[key]; return entry ? (ArkUI.route ? ArkUI.route.href(entry.path) : '#' + entry.path) : '#/' + key; }
  function ago(ms) {
    var min = Math.max(0, Math.round(ms / 60000));
    if (min < 1) return 'just now';
    if (min < 60) return min + ' min ago';
    var h = Math.floor(min / 60), m = min % 60;
    return h + ' h' + (m ? ' ' + m + ' min' : '') + ' ago';
  }
  function bar(share, cls) {
    var track = el('span', 'dash-bar' + (cls ? ' ' + cls : '')), fill = el('span', 'dash-bar-fill');
    fill.style.setProperty('--w', Math.max(2, Math.min(100, share * 100)).toFixed(1) + '%');
    track.appendChild(fill); return track;
  }
  function stat(label) {
    var t = el('article', 'dash-stat dash-span-3');
    t.appendChild(el('p', 'dash-label', label));
    var v = el('p', 'dash-stat-value'), n = el('strong', null, '–'), u = el('span', 'dash-unit', '');
    v.appendChild(n); v.appendChild(u); t.appendChild(v);
    var d = el('p', 'dash-stat-detail', 'waiting for pulse'); t.appendChild(d);
    return { tile: t, num: n, unit: u, detail: d };
  }
  function section(title, note) {
    var h = el('div', 'dash-section');
    h.appendChild(el('h2', 'dash-section-title', title));
    if (note) h.appendChild(el('p', 'dash-section-note', note));
    return h;
  }

  ArkUI.pageModules.monitor = {
    mount: function (host) {
      var page = el('section', 'ark-page task-page stats-page stats-dash monitor-page');
      page.setAttribute('aria-labelledby', 'monitor-title');
      var shell = el('div', 'stats-shell dash-shell');
      page.appendChild(shell);

      // Header ----------------------------------------------------------------------------------
      var head = el('header', 'dash-head');
      var copy = el('div', 'dash-head-copy');
      copy.appendChild(el('p', 'dash-kicker', 'DEFXN · Live'));
      var h1 = el('h1', 'dash-h1', 'Fleet monitor'); h1.id = 'monitor-title'; copy.appendChild(h1);
      copy.appendChild(el('p', 'dash-lede', 'What every node in the roster did in the latest hourly self-bench, checked again every minute while this tab is open.'));
      var toStats = el('a', 'dash-link', 'Audited measurements and production readiness →');
      toStats.href = href('stats'); toStats.dataset.sceneLink = 'stats';
      copy.appendChild(toStats);
      head.appendChild(copy);
      var status = el('div', 'dash-status'); status.setAttribute('role', 'status');
      var pill = el('p', 'dash-pill', 'Checking fleet'); pill.dataset.state = 'loading';
      var updated = el('p', 'dash-status-line', 'Waiting for the first pulse');
      var next = el('p', 'dash-status-line is-quiet', '');
      var refreshBtn = el('button', 'dash-refresh', 'Refresh'); refreshBtn.type = 'button';
      status.appendChild(pill); status.appendChild(updated); status.appendChild(next); status.appendChild(refreshBtn);
      head.appendChild(status);
      shell.appendChild(head);

      // Live ------------------------------------------------------------------------------------
      shell.appendChild(section('Latest pulse', 'Capacity from a short synthetic bench, not cumulative traffic.'));
      var grid = el('div', 'dash-grid');
      var kNodes = stat('Nodes online'), kRate = stat('Capacity now'), kOps = stat('Operations in bench'), kErr = stat('Errors');
      kRate.tile.className += ' is-lead';
      [kNodes, kRate, kOps, kErr].forEach(function (k) { grid.appendChild(k.tile); });
      shell.appendChild(grid);

      var nodesPanel = el('section', 'dash-panel dash-runs');
      nodesPanel.appendChild(el('p', 'dash-label', 'Per node'));
      var tableWrap = el('div', 'dash-table-wrap');
      var empty = el('p', 'dash-empty', 'Loading the latest pulse…');
      nodesPanel.appendChild(tableWrap); nodesPanel.appendChild(empty);
      shell.appendChild(nodesPanel);

      // Session -----------------------------------------------------------------------------------
      shell.appendChild(section('This session', 'Every distinct pulse this tab has received. Close the tab and it is gone.'));
      var sessionPanel = el('section', 'dash-panel');
      var sessionList = el('ol', 'dash-bars monitor-session');
      var sessionEmpty = el('p', 'dash-empty', 'No pulse received yet.');
      sessionPanel.appendChild(sessionList); sessionPanel.appendChild(sessionEmpty);
      shell.appendChild(sessionPanel);

      // Reading this page ---------------------------------------------------------------------------
      shell.appendChild(section('Reading this page'));
      var legend = el('ul', 'dash-ready-list');
      [
        ['Live', 'done', 'flx-bk2 benches every node in the configured roster each hour. Rows come from that data, so a registered node appears without a site release; nodes are not discovered automatically yet.'],
        ['Session', 'partial', 'The history above is only what this tab received. The pulse changes hourly, so most sessions see one or two readings.'],
        ['Audited', 'todo', 'Dated fleet runs (BENCH-004, -007, -008) describe those runs, not now. They are on /stats with their records, not here.']
      ].forEach(function (r) {
        var li = el('li', 'dash-ready-item'); li.dataset.state = r[1];
        li.appendChild(el('span', 'dash-badge', r[0]));
        var c = el('div'); c.appendChild(el('p', null, r[2])); li.appendChild(c);
        legend.appendChild(li);
      });
      var legendPanel = el('section', 'dash-panel'); legendPanel.appendChild(legend);
      shell.appendChild(legendPanel);

      // Wiring ----------------------------------------------------------------------------------------
      var history = [], lastPulse = null, nextAt = 0, timer = 0, inFlight = false, disposed = false;
      function setStat(k, v, u, d) { k.num.textContent = v; k.unit.textContent = u || ''; k.detail.textContent = d || ''; }
      function paintAge() {
        if (lastPulse) updated.textContent = 'Measured ' + ago(Date.now() - lastPulse.measured_at_ms) + ' · ' + new Date(lastPulse.measured_at_ms).toLocaleTimeString();
        if (nextAt) {
          var s = Math.max(0, Math.round((nextAt - Date.now()) / 1000));
          next.textContent = document.hidden ? 'Paused while this tab is hidden' : 'Next check in ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
        }
      }
      function paintTable(data) {
        var sorted = data.nodes.slice().sort(function (a, b) { return (b.qps || 0) - (a.qps || 0); });
        var max = Math.max.apply(null, sorted.map(function (n) { return n.qps || 0; }).concat([1]));
        var table = el('table', 'dash-table monitor-table'), thead = el('thead'), hr = el('tr');
        ['Node', 'Address', 'Ops/s', '', 'OK / total', 'Elapsed'].forEach(function (c) { var th = el('th', null, c); th.scope = 'col'; hr.appendChild(th); });
        thead.appendChild(hr); table.appendChild(thead);
        var body = el('tbody');
        sorted.forEach(function (n) {
          var tr = el('tr'); tr.dataset.state = n.error || !(n.qps > 0) ? 'down' : 'up';
          var name = el('td'); var nh = el('span', 'dash-node-head'); nh.appendChild(el('span', 'dash-dot')); nh.appendChild(el('b', null, n.name)); name.appendChild(nh); tr.appendChild(name);
          tr.appendChild(el('td', 'monitor-addr', n.addr));
          if (n.error) { var e = el('td', 'dash-node-error', n.error); e.colSpan = 4; tr.appendChild(e); body.appendChild(tr); return; }
          tr.appendChild(el('td', 'is-num', fmt(n.qps)));
          var b = el('td', 'monitor-bar-cell'); b.appendChild(bar(n.qps / max, 'is-thin')); tr.appendChild(b);
          tr.appendChild(el('td', null, fmt(n.ok) + ' / ' + fmt(n.total)));
          tr.appendChild(el('td', null, fmt(n.elapsed_ms) + ' ms'));
          body.appendChild(tr);
        });
        table.appendChild(body);
        tableWrap.textContent = ''; tableWrap.appendChild(table); empty.hidden = true;
      }
      function paintSession() {
        sessionList.textContent = '';
        var max = Math.max.apply(null, history.map(function (h) { return h.aggregate_qps; }).concat([1]));
        history.forEach(function (h) {
          var li = el('li', 'dash-bars-row');
          var name = el('p', 'dash-bars-name');
          name.appendChild(el('b', null, new Date(h.measured_at_ms).toLocaleTimeString()));
          name.appendChild(el('span', null, h.up + '/' + h.nodes + ' nodes · ' + h.errors + (h.errors === 1 ? ' error' : ' errors')));
          li.appendChild(name); li.appendChild(bar(h.aggregate_qps / max)); li.appendChild(el('strong', 'dash-bars-value', fmt(h.aggregate_qps)));
          sessionList.appendChild(li);
        });
        sessionEmpty.hidden = history.length > 0;
      }
      function paint(data) {
        lastPulse = data;
        var up = data.nodes.filter(function (n) { return !n.error && n.qps > 0; }).length, count = data.nodes.length;
        var stale = Date.now() - data.measured_at_ms > STALE_MS;
        var healthy = up === count && !data.errors && !stale;
        pill.dataset.state = healthy ? 'ok' : 'warn';
        pill.textContent = healthy ? 'All systems normal' : stale ? 'Pulse is stale' : up < count ? (count - up) + ' of ' + count + ' nodes down' : 'Errors in last bench';
        setStat(kNodes, up + '/' + count, 'nodes', up === count ? 'every node in the roster answered' : (count - up) + ' did not answer');
        setStat(kRate, fmt(data.aggregate_qps), 'ops/s', 'all nodes, ' + fmt(data.longest_ms) + ' ms wall clock');
        setStat(kOps, fmt(data.total_entries), 'ops', 'synthetic writes in this bench');
        setStat(kErr, fmt(data.errors), '', data.errors ? 'see the rows below' : 'zero refusals');
        kErr.tile.dataset.state = data.errors ? 'warn' : 'ok';
        paintTable(data);
        if (!history.some(function (h) { return h.measured_at_ms === data.measured_at_ms; })) {
          history.unshift({ measured_at_ms: data.measured_at_ms, aggregate_qps: data.aggregate_qps, nodes: count, up: up, errors: data.errors });
          history = history.slice(0, 12);
          paintSession();
        }
        paintAge();
      }
      function paintOffline(message) {
        pill.dataset.state = 'down'; pill.textContent = 'Pulse unreachable';
        if (lastPulse) { updated.textContent = 'Last good pulse ' + ago(Date.now() - lastPulse.measured_at_ms) + ' · latest check failed'; return; }
        updated.textContent = 'No pulse received yet';
        [kNodes, kRate, kOps, kErr].forEach(function (k) { setStat(k, '–', k.unit.textContent, 'no live value; nothing substituted'); });
        tableWrap.textContent = ''; empty.hidden = false;
        empty.textContent = 'The fleet pulse could not be reached (' + message + '). Nothing has been put in its place.';
      }
      function schedule() {
        clearTimeout(timer); timer = 0;
        if (disposed || document.hidden) { nextAt = 0; paintAge(); return; }
        nextAt = Date.now() + POLL_MS; timer = setTimeout(tickPulse, POLL_MS);
      }
      function tickPulse() {
        if (disposed || inFlight) return;
        inFlight = true; refreshBtn.disabled = true;
        ArkPulse.get()
          .then(function (result) { if (!disposed) paint(result.data); })
          .catch(function (e) { if (!disposed) paintOffline(e && e.message ? e.message : 'unknown error'); })
          .then(function () { inFlight = false; refreshBtn.disabled = false; schedule(); });
      }
      function onVisibility() { if (!document.hidden && !timer) tickPulse(); else paintAge(); }

      refreshBtn.addEventListener('click', function () { clearTimeout(timer); timer = 0; tickPulse(); });
      document.addEventListener('visibilitychange', onVisibility);
      var pulseTimer = setInterval(paintAge, 1000);
      tickPulse();

      page.arkDispose = function () { clearInterval(pulseTimer); clearTimeout(timer); disposed = true; document.removeEventListener('visibilitychange', onVisibility); };
      host.appendChild(page);
      return page;
    }
  };
})();
