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
      copy.appendChild(el('p', 'dash-kicker', 'DEFXN · Pre-production · Measured, not production'));
      var h1 = el('h1', 'dash-h1', 'Fleet monitor'); h1.id = 'monitor-title'; copy.appendChild(h1);
      copy.appendChild(el('p', 'dash-lede', 'Two things on this page: the current audited CPU-ceiling bench (BENCH-011, 2026-10-08) across the full 10-node fleet with Lever A+B+C, and the live hourly self-bench of the 6 serving chain-server nodes. Both are synthetic. There is no production traffic on the chain-servers today beyond the hourly 4,800-op pulse, no independent security review, and no fiat value in motion. See the honest-status panel below.'));
      // Honest "what this is / what it isn't" panel ---------------------------------------------
      var honest = el('aside', 'dash-panel');
      honest.setAttribute('aria-label', 'What these numbers are and are not');
      honest.appendChild(el('p', 'dash-label', 'Is this production?'));
      var hUl = el('ul', 'dash-ready-list');
      [
        ['No', 'warn', 'BENCH-011 is a per-node CPU ceiling. Each flx-* node ran transfer-bench in-process against its own CertifiedShardLedger for 10 s. The bench thread builds a signed record, hands it to the admit path, gets a CID back, counts it finalized. No network between nodes within the timed window.'],
        ['No', 'warn', 'There are no external clients and no fiat value in motion. The deployed chain-servers currently accept only the hourly 4,800-op synthetic pulse — they are effectively idle. Real K-of-N peer-replication latency is not inside the 82,863 tps number.'],
        ['Yes', 'done', 'The code paths exercised are real: Lever A/B record builders, grammar check, chain-state check, segment root hash + two Ed25519 signs, segmented replica apply. 44/44 lib tests pass. The ceiling is a reproducible, honest number for exactly what the bench measures.'],
        ['Not yet', 'todo', 'Independent security review has not happened. The mainnet gate has not opened. See /mainnet-readiness for the inventory of what stands between this and something safe to call production.']
      ].forEach(function (r) {
        var li = el('li', 'dash-ready-item'); li.dataset.state = r[1];
        li.appendChild(el('span', 'dash-badge', r[0]));
        var c = el('div'); c.appendChild(el('p', null, r[2])); li.appendChild(c);
        hUl.appendChild(li);
      });
      honest.appendChild(hUl);
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
      shell.appendChild(honest);

      // Current ceiling (audited BENCH-011) ------------------------------------------------------
      var HT = (window.ArkStatsHighlights && window.ArkStatsHighlights.honestTransfers) || {};
      shell.appendChild(section('Code-path ceiling · BENCH-011 · ' + (HT.date || '2026-10-08'), 'The audited CPU-ceiling of the current code path. Each flx-* node ran transfer-bench against its own in-process CertifiedShardLedger for 10 s; results summed. NOT production traffic, NOT a real-user-serving number, NOT K-of-N network-replication latency. The honest ceiling of this code path under ideal conditions.'));
      var ceilGrid = el('div', 'dash-grid');
      function ceilTile(label, value, unit, detail, lead) {
        var t = el('article', 'dash-stat dash-span-3' + (lead ? ' is-lead' : ''));
        t.appendChild(el('p', 'dash-label', label));
        var v = el('p', 'dash-stat-value');
        v.appendChild(el('strong', null, value));
        v.appendChild(el('span', 'dash-unit', unit));
        t.appendChild(v);
        t.appendChild(el('p', 'dash-stat-detail', detail));
        return t;
      }
      ceilGrid.appendChild(ceilTile('Fleet finalized transfers', fmt(HT.fleetFinalizedTps || 82863), 'tps', '10 flx-* nodes, segmented-v3 (TransferAtomic + TransferSend/Receive), zero errors across ' + fmt(HT.fleetFinalized || 852152) + ' finalized transfers.', true));
      ceilGrid.appendChild(ceilTile('Fleet + Mac combined', fmt(HT.totalFinalizedTps || 108362), 'tps', 'Local Mac mean (' + fmt((HT.macLocal && HT.macLocal.finalizedTps) || 25499) + ' tps, 5 × 10s runs) added to the fleet sum. Hardware-honest, not a projection.'));
      ceilGrid.appendChild(ceilTile('Logical operations / s', fmt(HT.fleetLogicalOpsPerSecond || 160532), 'ops/s', 'Every admitted ledger record. Lever A: 1 op per same-shard transfer. Lever B: 2 ops per cross-shard transfer.'));
      ceilGrid.appendChild(ceilTile('Replica applications / s', fmt(HT.fleetReplicaAppsPerSecond || 642128), 'ops/s', 'Logical ops × 4 replicas per shard (the 3-of-4 committee shape). Total committee work, not transfers.'));
      shell.appendChild(ceilGrid);

      // Lever history mini-bar ----------------------------------------------------------
      var leverPanel = el('section', 'dash-panel');
      leverPanel.appendChild(el('p', 'dash-label', 'Lever history on this same fleet'));
      var leverList = el('ul', 'dash-bars');
      [
        ['Pre-Lever-B · 4-op cross-shard', HT.previousFleetFinalizedTps || 42637, 6, 'BENCH-008'],
        ['Lever B · 2-op TransferSend/Receive', HT.leverBFleetTps || 67563, 6, 'BENCH-009'],
        ['Lever B+C · + hot-path cleanup', HT.leverCFleetTps || 70589, 6, 'BENCH-010'],
        ['Lever A+B+C · + TransferAtomic + 4 new nodes', HT.leverABCFleetTps || 82863, 10, 'BENCH-011']
      ].forEach(function (row) {
        var max = HT.leverABCFleetTps || 82863;
        var li = el('li', 'dash-bar-row');
        var lab = el('span', 'dash-bar-label', row[0] + ' · ' + row[2] + ' nodes · ' + row[3]);
        var num = el('span', 'dash-bar-num', fmt(row[1]) + ' tps');
        li.appendChild(lab); li.appendChild(bar(row[1] / max)); li.appendChild(num);
        leverList.appendChild(li);
      });
      leverPanel.appendChild(leverList);
      shell.appendChild(leverPanel);

      // Live ------------------------------------------------------------------------------------
      shell.appendChild(section('Latest hourly pulse · 6 serving chain-servers', 'Hourly self-bench of the 6 chain-server nodes (bk1, bk2, mk2, mist1, eug-2c, eul-4c). This is HTTP write capacity, a different metric than the BENCH-011 finalized-transfers headline above. 4,800 synthetic ops per bench.'));
      var grid = el('div', 'dash-grid');
      var kNodes = stat('Serving nodes online'), kRate = stat('Pulse capacity'), kOps = stat('Operations in bench'), kErr = stat('Errors');
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
        ['Live', 'done', 'flx-bk2 benches every node in the configured serving roster each hour. Rows come from that data. Today the serving roster is 6 chain-server nodes (bk1, bk2, mk2, mist1, eug-2c, eul-4c). The four smaller fleet nodes (mk1, ms1, ms2, ms3) ran the full BENCH-011 locally but do not host a chain-server yet — see /stats.'],
        ['Session', 'partial', 'The history above is only what this tab received. The pulse changes hourly, so most sessions see one or two readings.'],
        ['Audited', 'todo', 'Dated fleet runs (BENCH-004, -007, -011) describe those runs, not now. They are on /stats with their records, not here.']
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
