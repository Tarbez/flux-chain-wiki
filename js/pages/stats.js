/* /stats: the mesh performance dashboard.

   Redesigned 2026-10-08 for production. The page answers three questions,
   in this order, and nothing else:
     1. Is the fleet up right now, and what is it doing?  (LIVE: the hourly
        fleet self-bench through ArkPulse, re-checked every minute while the
        tab is visible. Never simulated; when the pulse is unreachable the
        page says so and shows no number in its place.)
     2. What has the fleet measurably done?  (AUDITED: the dated 6-node
        mesh run as the three numbers the whitepaper §5 requires together,
        the five-minute soak, and the other dated runs, each with its
        evidence record.)
     3. How close is this to production?  (READINESS: what is measured,
        partial, or not yet done.)

   The engineering detail that used to live here (a transfer taken apart,
   CPU profiles, the ladder, batch checks, the certified-segment run, the
   retired fabric numbers) moved to docs/whitepaper.md, appendices B-F.
   Every figure is read from js/content/stats-highlights.js, shared with the
   home page and /monitor. Change a number in its evidence record first. */
(function () {
  'use strict';

  var POLL_MS = 60000;
  var STALE_MS = 2 * 60 * 60 * 1000; // the pulse runs hourly; two hours without one is stale
  var WHITEPAPER = 'docs/whitepaper.md';
  var ARTICLE_STORY = 'article/how-we-got-fast-and-what-we-got-wrong';

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function fmt(n) { return Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }); }
  function href(key) { var entry = ArkUI.pageCatalog && ArkUI.pageCatalog[key]; return entry ? (ArkUI.route ? ArkUI.route.href(entry.path) : '#' + entry.path) : '#/' + key; }
  function docHref(doc) {
    var query = 'doc=' + encodeURIComponent(doc) + '&from=' + encodeURIComponent('/stats');
    return ArkUI.route ? ArkUI.route.href('/reference?' + query) : '#/reference?' + query;
  }
  function pageLink(label, key, cls) { var a = el('a', cls, label); a.href = href(key); a.dataset.sceneLink = key; return a; }
  function docLink(label, doc, cls) { var a = el('a', cls, label); a.href = docHref(doc); a.dataset.sceneLink = 'reference'; return a; }
  function ago(ms) {
    var min = Math.max(0, Math.round(ms / 60000));
    if (min < 1) return 'just now';
    if (min < 60) return min + ' min ago';
    var h = Math.floor(min / 60), m = min % 60;
    return h + ' h' + (m ? ' ' + m + ' min' : '') + ' ago';
  }
  function bar(share, cls) {
    var track = el('span', 'dash-bar' + (cls ? ' ' + cls : ''));
    var fill = el('span', 'dash-bar-fill');
    fill.style.setProperty('--w', Math.max(2, Math.min(100, share * 100)).toFixed(1) + '%');
    track.appendChild(fill);
    return track;
  }
  function panel(cls, label, title) {
    var p = el('section', 'dash-panel ' + (cls || ''));
    if (label) p.appendChild(el('p', 'dash-label', label));
    if (title) p.appendChild(el('h2', 'dash-title', title));
    return p;
  }
  function sectionHead(label, note) {
    var h = el('div', 'dash-section');
    h.appendChild(el('h2', 'dash-section-title', label));
    if (note) h.appendChild(el('p', 'dash-section-note', note));
    return h;
  }
  function stat(cls, label, value, unit, detail) {
    var t = el('article', 'dash-stat ' + (cls || ''));
    t.appendChild(el('p', 'dash-label', label));
    var v = el('p', 'dash-stat-value');
    var n = el('strong', null, value);
    var u = el('span', 'dash-unit', unit || '');
    v.appendChild(n); v.appendChild(u); t.appendChild(v);
    var d = el('p', 'dash-stat-detail', detail || '');
    t.appendChild(d);
    return { tile: t, num: n, unit: u, detail: d };
  }

  // Readiness: each line names its state and the evidence behind it.
  var READINESS = [
    { state: 'done', badge: 'Measured', title: 'Throughput on the public mesh', text: '42,637 finalized transfers/s across 6 nodes for 10 s, zero errors.' },
    { state: 'done', badge: 'Passing', title: 'Attack suite', text: '7 of 7 attacks refused: replay, double-spend, concurrent double-append, cross-chain confusion, wrong-prev fork, tampered signature, equivocation.' },
    { state: 'partial', badge: 'Partial', title: 'Sustained load', text: 'A 303-second soak accepted 3,760,000 records with zero failures. No 30-minute soak has run across the full mesh.' },
    { state: 'partial', badge: 'Partial', title: 'More than six nodes', text: 'Nine replicas applied one certified segment; the transfer benchmark has not run beyond six nodes.' },
    { state: 'partial', badge: 'Partial', title: 'Live node discovery', text: 'The pulse reads a configured roster; nodes that join are not discovered automatically yet.' },
    { state: 'partial', badge: 'Partial', title: 'Evidence record for the headline run', text: 'Filed as BENCH-008 with every node’s result. The raw JSON files and source revision still have to be attached.' },
    { state: 'todo', badge: 'Not yet', title: 'K-of-N replication under load', text: 'Implemented and tested, but the fleet soak ran on the local cache. The rerun with replication on is planned as BENCH-009.' },
    { state: 'todo', badge: 'Not yet', title: 'Public client traffic', text: 'Every client so far was operator-driven.' },
    { state: 'todo', badge: 'Not yet', title: 'Independent security review', text: 'Only our own tests have looked at the chain prototype.' }
  ];

  ArkUI.pageModules.stats = {
    mount: function (host) {
      var stats = window.ArkStatsHighlights || {};
      var HT = stats.honestTransfers || {};
      var SOAK = stats.chainFleetSoak || {};
      var CERT = stats.certifiedFleet || {};
      var registry = window.ArkResolverRegistry || {};
      var grammarOnly = (registry.chain && registry.chain.measured && registry.chain.measured.rate) || 83225;

      var page = el('section', 'ark-page task-page stats-page stats-dash');
      page.setAttribute('aria-labelledby', 'stats-title');
      var shell = el('div', 'stats-shell dash-shell');
      page.appendChild(shell);

      // ---- header: title, fleet status, refresh -----------------------------------------------
      var head = el('header', 'dash-head');
      var headCopy = el('div', 'dash-head-copy');
      headCopy.appendChild(el('p', 'dash-kicker', 'DEFXN · Mesh performance'));
      var h1 = el('h1', 'dash-h1', 'Fleet dashboard'); h1.id = 'stats-title'; headCopy.appendChild(h1);
      headCopy.appendChild(el('p', 'dash-lede', 'Live capacity from the fleet’s hourly self-bench, the audited runs behind every number, and what still stands between this and production.'));
      head.appendChild(headCopy);
      var status = el('div', 'dash-status');
      status.setAttribute('role', 'status');
      var pill = el('p', 'dash-pill', 'Checking fleet');
      pill.dataset.state = 'loading';
      var updated = el('p', 'dash-status-line', 'Waiting for the first pulse');
      var next = el('p', 'dash-status-line is-quiet', '');
      var refresh = el('button', 'dash-refresh', 'Refresh');
      refresh.type = 'button';
      status.appendChild(pill); status.appendChild(updated); status.appendChild(next); status.appendChild(refresh);
      head.appendChild(status);
      shell.appendChild(head);

      // ---- live ---------------------------------------------------------------------------------
      shell.appendChild(sectionHead('Live', 'Hourly self-bench from flx-bk2 against every node in the roster. Capacity, not cumulative traffic.'));
      var live = el('div', 'dash-grid');
      var kNodes = stat('dash-span-3', 'Nodes online', '–', '', 'waiting for pulse');
      var kRate = stat('dash-span-3 is-lead', 'Capacity now', '–', 'ops/s', 'waiting for pulse');
      var kOps = stat('dash-span-3', 'Operations in last bench', '–', '', 'waiting for pulse');
      var kErr = stat('dash-span-3', 'Errors in last bench', '–', '', 'waiting for pulse');
      [kNodes, kRate, kOps, kErr].forEach(function (k) { live.appendChild(k.tile); });
      var nodesPanel = panel('dash-span-12', 'Nodes', null);
      var nodeList = el('ul', 'dash-nodes');
      nodeList.setAttribute('aria-label', 'Per-node results of the last pulse');
      var nodeEmpty = el('p', 'dash-empty', 'Loading the latest pulse…');
      nodesPanel.appendChild(nodeList); nodesPanel.appendChild(nodeEmpty);
      live.appendChild(nodesPanel);
      shell.appendChild(live);

      // ---- audited baseline ---------------------------------------------------------------------
      shell.appendChild(sectionHead('Audited baseline · ' + (HT.date || '2026-10-08'), 'The 6-node mesh run, reported as the three numbers the whitepaper requires together. Not live; re-run to update.'));
      var audited = el('div', 'dash-grid');
      [
        ['dash-span-4 is-lead', 'Finalized transfers / s', HT.fleetFinalizedTps, 'transfers/s', 'What users get. A transfer counts only once its FINALIZE lands on a real COMMIT, ACCEPT and PREPARE.'],
        ['dash-span-4', 'Logical operations / s', HT.fleetLogicalOpsPerSecond, 'ops/s', 'Every admitted ledger record: four per cross-shard transfer.'],
        ['dash-span-4', 'Replica applications / s', HT.fleetReplicaAppsPerSecond, 'ops/s', 'Logical operations × 4 replicas per shard: the total work the committees did.']
      ].forEach(function (s) { audited.appendChild(stat(s[0], s[1], fmt(s[2]), s[3], s[4]).tile); });

      var perNode = (HT.perNode || []).slice().sort(function (a, b) { return b.finalizedTps - a.finalizedTps; });
      var maxTps = Math.max.apply(null, perNode.map(function (n) { return n.finalizedTps; }).concat([1]));
      var nodesRun = panel('dash-span-8', 'Per node · each node’s own ' + (HT.windowSeconds || 10) + ' s window', 'Finalized transfers per second');
      var runList = el('ol', 'dash-bars');
      perNode.forEach(function (n) {
        var li = el('li', 'dash-bars-row');
        var name = el('p', 'dash-bars-name');
        name.appendChild(el('b', null, n.name));
        name.appendChild(el('span', null, n.cpu + ' · ' + n.cores + ' cores · ' + n.region));
        li.appendChild(name);
        li.appendChild(bar(n.finalizedTps / maxTps));
        li.appendChild(el('strong', 'dash-bars-value', fmt(n.finalizedTps)));
        runList.appendChild(li);
      });
      var total = el('li', 'dash-bars-row is-total');
      var totalName = el('p', 'dash-bars-name'); totalName.appendChild(el('b', null, 'Fleet')); totalName.appendChild(el('span', null, fmt(HT.fleetFinalized) + ' transfers · ' + (HT.fleetErrors || 0) + ' errors'));
      total.appendChild(totalName); total.appendChild(el('span', 'dash-bar is-spacer')); total.appendChild(el('strong', 'dash-bars-value', fmt(HT.fleetFinalizedTps)));
      runList.appendChild(total);
      nodesRun.appendChild(runList);
      nodesRun.appendChild(el('p', 'dash-note', 'The total is the sum of each node’s own result: not an average, not a projection.'));
      audited.appendChild(nodesRun);

      var soak = panel('dash-span-4 dash-soak', 'Sustained · ' + Math.round(SOAK.durationSeconds || 303) + ' s soak', null);
      var soakValue = el('p', 'dash-stat-value');
      soakValue.appendChild(el('strong', null, fmt(SOAK.averageQps || 12403)));
      soakValue.appendChild(el('span', 'dash-unit', 'records/s'));
      soak.appendChild(soakValue);
      var soakFacts = el('dl', 'dash-facts');
      [['Accepted', fmt(SOAK.accepted || 0)], ['Failures', fmt(SOAK.failures || 0)], ['Nodes', String((SOAK.perNode || []).length)]].forEach(function (f) {
        var row = el('div'); row.appendChild(el('dt', null, f[0])); row.appendChild(el('dd', null, f[1])); soakFacts.appendChild(row);
      });
      soak.appendChild(soakFacts);
      var soakMax = Math.max.apply(null, (SOAK.perNode || []).map(function (n) { return n.accepted; }).concat([1]));
      var soakList = el('ol', 'dash-mini');
      (SOAK.perNode || []).forEach(function (n) {
        var li = el('li');
        li.appendChild(el('span', 'dash-mini-name', n.name));
        li.appendChild(bar(n.accepted / soakMax, 'is-thin'));
        li.appendChild(el('span', 'dash-mini-value', fmt(n.accepted)));
        soakList.appendChild(li);
      });
      soak.appendChild(soakList);
      soak.appendChild(el('p', 'dash-note', 'One client, six nodes under shared load. Ran on the local cache, not K-of-N replication.'));
      audited.appendChild(soak);
      shell.appendChild(audited);

      // ---- benchmark runs -----------------------------------------------------------------------
      shell.appendChild(sectionHead('Benchmark runs', 'Every number above, and the other dated runs, with the record that holds its method and raw output.'));
      var runs = panel('dash-span-12 dash-runs', null, null);
      var wrap = el('div', 'dash-table-wrap');
      var table = el('table', 'dash-table');
      var thead = el('thead'), hr = el('tr');
      ['Run', 'Scope', 'Result', 'Window', 'Errors', 'Record'].forEach(function (c) { var th = el('th', null, c); th.scope = 'col'; hr.appendChild(th); });
      thead.appendChild(hr); table.appendChild(thead);
      var tbody = el('tbody');
      [
        ['Transfer bench', '6 nodes, cross-shard', fmt(HT.fleetFinalizedTps) + ' transfers/s', (HT.windowSeconds || 10) + ' s', fmt(HT.fleetErrors || 0), 'BENCH-008', 'docs/evidence/bench-008-six-node-transfer-bench.md'],
        ['Fleet soak', '6 nodes, one client', fmt(SOAK.averageQps || 12403) + ' records/s', Math.round(SOAK.durationSeconds || 303) + ' s', fmt(SOAK.failures || 0), 'BENCH-004', 'docs/evidence/bench-004-chain-fleet-soak.md'],
        ['Replicated soak', '6 nodes, K-of-N on', 'planned', '≥ 300 s', '—', 'BENCH-009', 'docs/evidence/bench-009-replicated-fleet-soak.md'],
        ['Certified segment', (CERT.nodes || 9) + ' replicas, one ' + (CERT.quorum || '3-of-4') + ' certificate', fmt(CERT.combined || 1712006) + ' replica apps/s', fmt(CERT.operationsPerNode || 20000) + ' ops each', fmt(CERT.errors || 0), 'BENCH-007', 'docs/evidence/bench-007-nine-node-certified-resolver.md'],
        ['Grammar-only admission', 'one Mac core', fmt(grammarOnly) + ' ops/s', 'bench', '—', 'Whitepaper §2', WHITEPAPER]
      ].forEach(function (r) {
        var tr = el('tr');
        r.slice(0, 5).forEach(function (c, i) { tr.appendChild(el('td', i === 2 ? 'is-num' : null, c)); });
        var cell = el('td'); cell.appendChild(docLink(r[5], r[6], 'dash-link')); tr.appendChild(cell);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody); wrap.appendChild(table); runs.appendChild(wrap);
      runs.appendChild(el('p', 'dash-note', 'Each run measures something different. Do not add rows together, and do not quote replica applications as transfers.'));
      shell.appendChild(runs);

      // ---- readiness + deeper -------------------------------------------------------------------
      shell.appendChild(sectionHead('Production readiness', 'Where the measurements stop. Updated with each new evidence record.'));
      var bottom = el('div', 'dash-grid');
      var ready = panel('dash-span-8 dash-ready', null, null);
      var counts = { done: 0, partial: 0, todo: 0 };
      READINESS.forEach(function (r) { counts[r.state] += 1; });
      var summary = el('p', 'dash-ready-summary');
      summary.appendChild(el('span', 'is-done', counts.done + ' done'));
      summary.appendChild(el('span', 'is-partial', counts.partial + ' partial'));
      summary.appendChild(el('span', 'is-todo', counts.todo + ' not yet'));
      ready.appendChild(summary);
      var list = el('ul', 'dash-ready-list');
      READINESS.forEach(function (r) {
        var li = el('li', 'dash-ready-item'); li.dataset.state = r.state;
        li.appendChild(el('span', 'dash-badge', r.badge));
        var copy = el('div');
        copy.appendChild(el('strong', null, r.title));
        copy.appendChild(el('p', null, r.text));
        li.appendChild(copy);
        list.appendChild(li);
      });
      ready.appendChild(list);
      bottom.appendChild(ready);

      var deeper = panel('dash-span-4 dash-deeper', 'Go deeper', null);
      var links = el('ul', 'dash-links');
      [
        docLink('Whitepaper · how it works, what made it fast, every number’s source', WHITEPAPER),
        pageLink('Live monitor · per-node pulse and session history', 'monitor'),
        pageLink('Resolvers · each one’s own measured throughput', 'resolvers'),
        pageLink('Finance ledger · double-spend by construction', 'stats/ledger'),
        pageLink('How we got fast, and what we got wrong', ARTICLE_STORY),
        docLink('Mainnet readiness', 'docs/mainnet-readiness.md')
      ].forEach(function (a) { var li = el('li'); a.className = 'dash-link-row'; li.appendChild(a); links.appendChild(li); });
      deeper.appendChild(links);
      bottom.appendChild(deeper);
      shell.appendChild(bottom);

      // ---- live wiring --------------------------------------------------------------------------
      var lastPulse = null, nextAt = 0, pollTimer = 0, clockTimer = 0, disposed = false, inFlight = false;

      function setStat(k, value, unit, detail) { k.num.textContent = value; k.unit.textContent = unit || ''; k.detail.textContent = detail || ''; }
      function paintNodes(data) {
        nodeList.textContent = '';
        var sorted = data.nodes.slice().sort(function (a, b) { return (b.qps || 0) - (a.qps || 0); });
        var max = Math.max.apply(null, sorted.map(function (n) { return n.qps || 0; }).concat([1]));
        sorted.forEach(function (n) {
          var down = !!n.error || !(n.qps > 0);
          var li = el('li', 'dash-node'); li.dataset.state = down ? 'down' : 'up';
          var top = el('p', 'dash-node-head');
          top.appendChild(el('span', 'dash-dot'));
          top.appendChild(el('b', null, n.name));
          top.appendChild(el('span', 'dash-node-addr', n.addr));
          li.appendChild(top);
          if (n.error) {
            li.appendChild(el('p', 'dash-node-error', n.error));
          } else {
            var v = el('p', 'dash-node-value');
            v.appendChild(el('strong', null, fmt(n.qps)));
            v.appendChild(el('span', 'dash-unit', 'ops/s'));
            li.appendChild(v);
            li.appendChild(bar(n.qps / max, 'is-thin'));
            li.appendChild(el('p', 'dash-node-meta', fmt(n.ok) + ' / ' + fmt(n.total) + ' ok · ' + fmt(n.elapsed_ms) + ' ms'));
          }
          nodeList.appendChild(li);
        });
        nodeEmpty.hidden = true;
      }
      function paintAge() {
        if (lastPulse) {
          var age = Date.now() - lastPulse.measured_at_ms;
          updated.textContent = 'Measured ' + ago(age) + ' · ' + new Date(lastPulse.measured_at_ms).toLocaleTimeString();
        }
        if (nextAt) {
          var s = Math.max(0, Math.round((nextAt - Date.now()) / 1000));
          next.textContent = document.hidden ? 'Paused while this tab is hidden' : 'Next check in ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
        }
      }
      function paint(data) {
        lastPulse = data;
        var up = data.nodes.filter(function (n) { return !n.error && n.qps > 0; }).length;
        var count = data.nodes.length;
        var stale = Date.now() - data.measured_at_ms > STALE_MS;
        var healthy = up === count && !data.errors && !stale;
        pill.dataset.state = healthy ? 'ok' : 'warn';
        pill.textContent = healthy ? 'All systems normal' : stale ? 'Pulse is stale' : up < count ? (count - up) + ' of ' + count + ' nodes down' : 'Errors in last bench';
        setStat(kNodes, up + '/' + count, 'nodes', up === count ? 'every node in the roster answered' : (count - up) + ' did not answer');
        setStat(kRate, fmt(data.aggregate_qps), 'ops/s', 'all nodes in parallel, ' + fmt(data.longest_ms) + ' ms wall clock');
        setStat(kOps, fmt(data.total_entries), 'ops', 'synthetic writes in the last self-bench');
        setStat(kErr, fmt(data.errors), '', data.errors ? 'see the nodes below' : 'zero refusals');
        kErr.tile.dataset.state = data.errors ? 'warn' : 'ok';
        paintNodes(data);
        paintAge();
      }
      function paintOffline(message) {
        pill.dataset.state = 'down';
        pill.textContent = 'Pulse unreachable';
        if (!lastPulse) {
          updated.textContent = 'No pulse received yet';
          [kNodes, kRate, kOps, kErr].forEach(function (k) { setStat(k, '–', k.unit.textContent, 'no live value; nothing substituted'); });
          nodeList.textContent = '';
          nodeEmpty.hidden = false;
          nodeEmpty.textContent = 'The fleet pulse could not be reached (' + message + '). The audited figures below are dated evidence and still stand; no live number has been put in their place.';
        } else {
          updated.textContent = 'Last good pulse ' + ago(Date.now() - lastPulse.measured_at_ms) + ' · latest check failed';
        }
      }
      function schedule() {
        clearTimeout(pollTimer); pollTimer = 0;
        if (disposed || document.hidden) { nextAt = 0; paintAge(); return; }
        nextAt = Date.now() + POLL_MS;
        pollTimer = setTimeout(check, POLL_MS);
      }
      function check() {
        if (disposed || inFlight) return;
        if (!window.ArkPulse) { paintOffline('pulse client not loaded'); return; }
        inFlight = true;
        refresh.disabled = true;
        if (!lastPulse) { pill.dataset.state = 'loading'; pill.textContent = 'Checking fleet'; }
        ArkPulse.get().then(function (result) {
          if (!disposed) paint(result.data);
        }).catch(function (e) {
          if (!disposed) paintOffline(e && e.message ? e.message : 'unknown error');
        }).then(function () {
          inFlight = false; refresh.disabled = false;
          schedule();
        });
      }
      function onVisibility() { if (!document.hidden && !pollTimer) check(); else paintAge(); }

      refresh.addEventListener('click', function () { clearTimeout(pollTimer); pollTimer = 0; check(); });
      document.addEventListener('visibilitychange', onVisibility);
      clockTimer = setInterval(paintAge, 1000);
      check();

      page.arkDispose = function () {
        disposed = true;
        clearTimeout(pollTimer); clearInterval(clockTimer);
        document.removeEventListener('visibilitychange', onVisibility);
      };
      host.appendChild(page);
      return page;
    }
  };
})();
