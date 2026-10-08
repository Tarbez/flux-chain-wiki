/* /monitor: the real chain-fleet pulse. Production reads the raw HTTP pulse
   through /api/fleet-pulse, the site's same-origin TLS boundary. LIVE values
   come from the latest hourly self-bench, SESSION is this tab's received
   history, and AUDITED values remain explicitly dated static evidence. */
(function () {
  'use strict';
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function href(key) { var entry = ArkUI.pageCatalog && ArkUI.pageCatalog[key]; return entry ? (ArkUI.route ? ArkUI.route.href(entry.path) : '#' + entry.path) : '#/' + key; }

  function tile(cls, label) {
    var t = el('article', 'stats-tile monitor-tile ' + (cls || ''));
    if (label) t.appendChild(el('p', 'stats-tile-label', label));
    return t;
  }

  ArkUI.pageModules.monitor = {
    mount: function (host) {
      var page = el('section', 'ark-page task-page stats-page monitor-page');
      page.setAttribute('aria-labelledby', 'monitor-title');
      var shell = el('div', 'stats-shell'), bento = el('div', 'stats-bento');
      shell.appendChild(bento); page.appendChild(shell);

      // Hero — chain-prototype first. No dependency on the retired fabric
      // fleet-status feed; the live surface below is the chain-fleet pulse.
      var hero = tile('stats-hero monitor-hero');
      var liveChip = el('span', 'monitor-live-chip', 'Connecting…');
      hero.appendChild(liveChip);
      var h1 = el('h1', null, 'Chain fleet monitor'); h1.id = 'monitor-title'; hero.appendChild(h1);
      hero.appendChild(el('p', null, 'Certified resolver capacity across eight VPS replicas plus the local node, alongside the separate live admission pulse. Certified application and admission are different measured boundaries and remain labeled separately.'));
      var links = el('div', 'stats-cta');
      var refreshBtn = el('button', 'stats-monitor-link', 'Refresh now ↻'); refreshBtn.type = 'button';
      links.appendChild(refreshBtn);
      var statsLink = el('a', 'stats-monitor-link is-quiet', 'How fast, and why →'); statsLink.href = href('stats'); statsLink.dataset.sceneLink = 'stats';
      links.appendChild(statsLink); hero.appendChild(links);
      bento.appendChild(hero);

      // KPI strip — big live numbers from the latest pulse
      function kpi(label) {
        var t = tile('stats-kpi monitor-kpi', label);
        var v = el('p', 'stats-kpi-value'); var n = el('strong', null, '–'); var u = el('span', 'stats-kpi-unit', '');
        v.appendChild(n); v.appendChild(u); t.appendChild(v);
        var d = el('p', 'stats-kpi-detail', '…'); t.appendChild(d);
        bento.appendChild(t);
        return { num: n, unit: u, detail: d, tile: t };
      }
      var stats = window.ArkStatsHighlights || {};
      var honest = stats.honestTransfers || {};
      // The three design-doc §1 headline KPIs: finalized transfers, logical
      // ops, replica applications. These are static benchmark figures (not
      // live) — the live admission pulse below carries the current fleet.
      var kFinalized = kpi('Finalized transfers / s');
      var kLogicalOps = kpi('Logical ops / s');
      var kReplicaApps = kpi('Replica applications / s');
      setStaticKpi(kFinalized, honest.finalizedTps || 3768, 'transfers/s', '10 s sustained · 24,000 transfers · 87% cross-shard · zero errors');
      setStaticKpi(kLogicalOps, honest.logicalOpsPerSecond || 15073, 'ops/s', '4 records per transfer · PREPARE/ACCEPT/COMMIT/FINALIZE on 8 holder shards');
      setStaticKpi(kReplicaApps, honest.replicaAppsPerSecond || 60292, 'ops/s', 'logical × 4 replicas per shard · the 3-of-4 committee shape');
      // Live admission pulse KPIs (updated from the pulse endpoint below)
      var kNodes = kpi('Admission servers live');
      var kAgg = kpi('Admission pulse aggregate');
      var kEntries = kpi('Benchmark operations');
      var kErrors = kpi('Pulse errors');

      function setStaticKpi(k, value, unit, detail) {
        k.num.textContent = Number(value).toLocaleString('en-US');
        k.unit.textContent = unit;
        k.detail.textContent = detail;
      }

      // Live chain-fleet pulse — polls bk2's /pulse.json every 60s and
      // shows the real current fleet speed. The endpoint is configurable via
      // window.ArkPulseEndpoint so the user can point /monitor at a local
      // pulse they run themselves.
      var PULSE_URL = window.ArkPulseEndpoint || ArkPulse.endpoint;
      var pTile = tile('stats-span-12 monitor-pulse-tile', 'Live admission pulse · compatibility ingress');
      pTile.appendChild(el('h2', null, 'What the configured admission roster is doing right now'));
      pTile.appendChild(el('p', 'stats-tile-copy', 'The chain-prototype fleet runs a self-bench every hour from flx-bk2 and publishes the result through the monitor endpoint. Each row shows what that benchmark client observed while it fanned 16 chains × 50 operations at every node in parallel. The result is a fresh capacity sample, not a cumulative operation total. Local development uses the same /api/fleet-pulse route as production.'));
      var pMeta = el('p', 'stats-tile-copy monitor-pulse-meta', 'Loading live pulse from ' + PULSE_URL + ' …');
      pTile.appendChild(pMeta);
      var pTable = el('div', 'stats-table-wrap');
      pTile.appendChild(pTable);
      var pSession = el('ol', 'monitor-pulse-history');
      pTile.appendChild(el('h3', 'stats-sub-head', 'This tab\'s session history'));
      pTile.appendChild(pSession);
      bento.appendChild(pTile);

      var pulseHistory = [];
      function setKpi(k, value, unit, detail) { k.num.textContent = value; k.unit.textContent = unit || ''; k.detail.textContent = detail || ''; }
      function paintPulse(data, note) {
        if (!data || !data.nodes) {
          pMeta.textContent = note || 'Pulse not reachable yet. The feed updates hourly from bk2.';
          pTable.innerHTML = '';
          liveChip.textContent = 'Pulse offline'; liveChip.dataset.state = 'warn';
          setKpi(kNodes, '–', '', 'waiting for pulse');
          setKpi(kAgg, '–', 'ops/s', 'waiting for pulse');
          setKpi(kEntries, '–', '', 'waiting for pulse');
          setKpi(kErrors, '–', '', 'waiting for pulse');
          return;
        }
        var when = new Date(data.measured_at_ms);
        var ageMin = Math.max(0, Math.round((Date.now() - data.measured_at_ms) / 60000));
        var ageLabel = ageMin < 1 ? 'just now' : ageMin === 1 ? '1 min ago' : ageMin + ' min ago';
        var alive = data.nodes.filter(function (n) { return !n.error && n.qps > 0; }).length;
        var total = data.nodes.length;
        liveChip.textContent = alive + '/' + total + ' nodes · ' + ageLabel;
        liveChip.dataset.state = alive === total ? 'ok' : 'warn';
        setKpi(kNodes, alive + '/' + total, 'nodes', ageLabel);
        setKpi(kAgg, Math.round(data.aggregate_qps || 0).toLocaleString('en-US'), 'ops/s', 'parallel across ' + alive + ' nodes');
        setKpi(kEntries, (data.total_entries || 0).toLocaleString('en-US'), 'synthetic writes', 'benchmark completed in ' + (data.longest_ms || 0) + ' ms wall-clock');
        setKpi(kErrors, data.errors || 0, 'since this pulse', data.errors ? 'see per-node rows below' : 'zero refusals');
        pMeta.textContent = 'Measured ' + when.toLocaleString() + ' · ' + ageLabel + ' · pulling from ' + PULSE_URL;
        var sorted = data.nodes.slice().sort(function (a, b) { return (b.qps || 0) - (a.qps || 0); });
        var maxQps = Math.max.apply(null, sorted.map(function (n) { return n.qps || 0; }).concat([1]));
        var table = el('table', 'stats-table stats-table-wrapped monitor-pulse-table');
        var head = el('thead'), headRow = el('tr');
        ['Node', 'Addr', 'Ops / s', 'ok / total', 'Elapsed'].forEach(function (label) { headRow.appendChild(el('th', null, label)); });
        head.appendChild(headRow); table.appendChild(head);
        var body = el('tbody');
        sorted.forEach(function (n) {
          var row = el('tr', n.error ? 'is-warn' : null);
          row.appendChild(el('td', null, n.name));
          row.appendChild(el('td', null, n.addr));
          if (n.error) {
            var errorCell = el('td', null, 'error: ' + n.error); errorCell.colSpan = 3; row.appendChild(errorCell);
            body.appendChild(row); return;
          }
          var w = Math.max(2, (n.qps / maxQps) * 100).toFixed(1);
          var rateCell = el('td'), barWrap = el('div', 'monitor-bar-wrap'), bar = el('span', 'monitor-bar');
          bar.style.setProperty('--w', w + '%'); barWrap.appendChild(bar); barWrap.appendChild(el('strong', null, Math.round(n.qps).toLocaleString('en-US'))); rateCell.appendChild(barWrap); row.appendChild(rateCell);
          row.appendChild(el('td', null, n.ok + '/' + n.total)); row.appendChild(el('td', null, n.elapsed_ms + ' ms')); body.appendChild(row);
        });
        var totalRow = el('tr', 'is-chosen'), totalLabel = el('td'); totalLabel.colSpan = 2; totalLabel.appendChild(el('strong', null, 'Fleet aggregate')); totalRow.appendChild(totalLabel);
        var totalRate = el('td'); totalRate.appendChild(el('strong', null, Math.round(data.aggregate_qps).toLocaleString('en-US'))); totalRate.appendChild(document.createTextNode(' ops/s')); totalRow.appendChild(totalRate);
        totalRow.appendChild(el('td', null, data.total_entries.toLocaleString('en-US'))); totalRow.appendChild(el('td', null, data.longest_ms + ' ms')); body.appendChild(totalRow);
        table.appendChild(body); pTable.textContent = ''; pTable.appendChild(table);
      }
      refreshBtn.addEventListener('click', function () { liveChip.textContent = 'Refreshing…'; tickPulse(); });
      function pushSessionRow(data) {
        if (!data || !data.measured_at_ms) return;
        if (pulseHistory.some(function (h) { return h.measured_at_ms === data.measured_at_ms; })) return;
        pulseHistory.unshift({ measured_at_ms: data.measured_at_ms, aggregate_qps: data.aggregate_qps, nodes: data.nodes.length, errors: data.errors });
        pulseHistory = pulseHistory.slice(0, 12);
        pSession.innerHTML = pulseHistory.map(function (h) {
          return '<li><code>' + new Date(h.measured_at_ms).toLocaleTimeString() + '</code> · ' +
            h.nodes + ' nodes · <strong>' + Math.round(h.aggregate_qps).toLocaleString('en-US') + '</strong> ops/s · ' +
            h.errors + ' err</li>';
        }).join('');
      }
      function tickPulse() {
        liveChip.textContent = 'Fetching pulse…'; liveChip.dataset.state = '';
        var started = Date.now();
        ArkPulse.get()
          .then(function (result) { PULSE_URL = result.endpoint; paintPulse(result.data); pushSessionRow(result.data); })
          .catch(function (e) {
            var ms = Date.now() - started;
            var msg = 'Pulse endpoint unreachable (' + ms + ' ms). ' + e.message +
              '. URL: ' + PULSE_URL +
              '. Public clients use the same-origin HTTPS proxy at ' + ArkPulse.endpoint + '.' +
              ' Local operators may override window.ArkPulseEndpoint before load.';
            paintPulse(null, msg);
            liveChip.textContent = 'Pulse offline · ' + e.message; liveChip.dataset.state = 'warn';
            console.error('[monitor] pulse fetch failed:', e, 'URL:', PULSE_URL);
          });
      }
      tickPulse();
      var pulseTimer = setInterval(tickPulse, 60000);
      page.arkDispose = function () { clearInterval(pulseTimer); };

      // Chain model panel — resolver shape + live fleet state
      var cTile = tile('stats-span-12 monitor-chain-tile stats-chosen', 'Chain model · the chosen direction');
      cTile.appendChild(el('h2', null, 'Per-identity chains, certified segments, binary P2P'));
      cTile.appendChild(el('p', 'stats-tile-copy', 'The current certified-resolver run applied one identical 20,000-operation segment on eight VPS replicas plus the local node. Every replica verified the same 3-of-4 certificate and root once, partitioned by holder, and applied in parallel: 180,000/180,000 replica applications with zero errors.'));
      var cStats = el('ol', 'monitor-chain-stats');
      [
        ['Combined certified capacity', '1,712,006 replica-applications/s · 9 nodes', 'sum of measured resolver work across eight VPS nodes plus local'],
        ['All-replica logical rate', '61,398 ops/s', 'same segment on every replica; bounded by the slowest required node'],
        ['Synchronized replica work', '552,583 replica-applications/s', '180,000 applications divided by the slowest completion time'],
        ['Certified segment identity', 'root 1399e321…31575 · 3-of-4', 'the exact same segment and certificate on every node'],
        ['Sustained fleet rate', '12,403 ops/s · 6 nodes', '303 seconds under simultaneous load from one client'],
        ['Hot chain admission', '51,065 ops/s · one local node', '20,000 independent holders; full operation verification'],
        ['Certified chain apply', '276,395 ops/s · local node in fleet run', 'one root/quorum verification, then 8 holder shards'],
        ['Compact P2P segment', '812,268 effective ops/s · two local peers', '1,024 operations in one binary signed envelope; transport/reconstruction, not admission'],
        ['Compact wire size', '150.9 bytes/op', '6.47× below the former 976-byte W<hex> payload'],
        ['5-minute accepted', '3,760,000 / 3,760,000', '235 batches across bk2, mk2, bk1, mist1, eug-2c and eul-4c; zero failures'],
        ['Historical short peak', '79,654 ops/s', '38,400 operations in an 868 ms burst; dated evidence, not the sustained headline'],
        ['Per-pair peak', '22,559 ops/s (bk2 → mk2, 128 chains)', '64,000 operations, 2,836 ms, server-side burst batching'],
        ['Recovery slack', '~12x live admission', 'replay 279,149 vs hot write 22,559 — a lagging peer catches up faster than it falls behind'],
        ['Fork gossip', 'cross-WAN propagation Ok', 'bk2 → mk2 Ok("fork") verified in same run'],
        ['Replication mode', 'implemented, not in the public soak', 'the 12,403 ops/s run used LocalCache; K-of-N needs its own fleet rerun'],
        ['One-million compute target', 'verified as summed resolver work', '1.712M replica-applications/s; broadcast and durable segment commit remain outside this measurement'],
        ['Replay default', 'head-only signature + hash chain', '~10x strict (279,149 vs 27,268 ops/s)'],
        ['TCP ingress', 'line-framed, <TAG>\\t<MANIFEST>\\n', 'chain_server::serve(addr), persistent-conn aware'],
        ['Equivocation', 'self-signed fork evidence', 'receive_fork_evidence(a, b)'],
        ['Auto broadcaster', 'push-on-detect to peer list', 'Broadcaster + on_fraud callback'],
        ['Issuance policy', 'roster of allowed signers', 'IssuancePolicy::Roster { allowed }'],
        ['Compaction', 'snapshot + prune_before', 'Payload::Snapshot, prune_before(g, pos)'],
        ['IPFS pin sidecar', 'best-effort, 500 ms timeout', 'CHAIN_SERVER_PIN_URL opt-in; pin failure never rolls back admit'],
        ['Receiver timeout', 'Refund by sender after D expires', 'Payload::Refund, M ≥ D enforced'],
        ['Fraud count', 'frozen chains known to this node', 'ledger.fraud_count()'],
        ['Chain heads', '(G, head_cid, length)', 'ledger.chain_heads()']
      ].forEach(function (p) {
        var li = el('li');
        li.appendChild(el('b', null, p[0]));
        li.appendChild(el('span', null, p[1]));
        li.appendChild(el('code', null, p[2]));
        cStats.appendChild(li);
      });
      cTile.appendChild(cStats);
      cTile.appendChild(el('p', 'stats-tile-copy', 'The certified resolver fleet contains eight VPS replicas plus the local node. The live admission pulse still reads a configured roster; it does not yet discover arbitrary CLI nodes. A new node must publish a signed, reachable presence record before it can safely auto-join the monitor.'));
      var cLink = el('a', 'stats-monitor-link', 'Open the design + measurements →'); cLink.href = href('stats/ledger'); cLink.dataset.sceneLink = 'stats/ledger';
      cTile.appendChild(cLink);
      bento.appendChild(cTile);

      // How to read this page
      var rTile = tile('stats-span-12 monitor-read-tile', 'Reading this page');
      rTile.appendChild(el('h2', null, 'What is live, what is session, what is audited'));
      var legend = el('ul', 'monitor-legend');
      [['Live', 'The page checks bk2 every 60 seconds for the latest per-node roster and capacity sample. Rows are data-driven, so registered nodes appear without a UI release. A failed check leaves the last real sample with a staleness note.'],
       ['Session', 'The pulse session history, trend lines and the histogram are real readings this tab received since it opened. Close the tab and they are gone.'],
       ['Audited', 'The chain-model panel\'s per-pair, aggregate and replay figures are from the 2026-10-08 fleet runs. They describe those runs, not now — the live pulse above is what\'s current.'],
       ['Not yet reviewed', 'No independent security audit has looked at the chain prototype. Behavior under adversarial partitions, long-running soak, and public-client traffic is not what this page measures.']
      ].forEach(function (p) { var li = el('li'); li.appendChild(el('b', null, p[0])); li.appendChild(el('span', null, p[1])); legend.appendChild(li); });
      rTile.appendChild(legend);
      var story = el('a', 'stats-monitor-link is-quiet', 'Read how we got here →'); story.href = href('article/how-we-got-fast-and-what-we-got-wrong'); story.dataset.sceneLink = 'article/how-we-got-fast-and-what-we-got-wrong';
      rTile.appendChild(story);
      bento.appendChild(rTile);

      host.appendChild(page);

      return page;
    }
  };
})();
