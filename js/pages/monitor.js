/* /monitor: the fleet's real live health feed, polled from
   https://defxn.com/api/fleet-status (ops/fleet-status-api.mjs, a systemd service on bk2
   and mk2; defxn.com DNS round-robins across both, so both carry the route).

   Redesigned 2026-10-07 (evening) as a dashboard that also teaches. Three kinds of number
   appear here and the page labels each one:
     LIVE      polled every 10 s from the feed: reachable, health-check latency, each
               member's view of its quorum's size. Never simulated or interpolated; a failed
               poll leaves the last real snapshot with an explicit staleness note.
     SESSION   built from the live readings this page has already received since it opened
               (the trend lines and the latency histogram): real, but only as long as the tab.
     AUDITED   static, dated figures from the last benchmark run (the capacity panel). They are
               NOT live. The grammar prototype is not deployed as a service, so no page can
               measure its throughput continuously; the panel says so.
   Machine specs (cores, provider) are static facts from docs/VPS-FLEET.md.

   Color carries the reading order: primary marks health counts, the info hue marks latency
   and session history, reference text stays neutral; success and warning appear only as
   state. */
(function () {
  'use strict';

  var API = 'https://defxn.com/api/fleet-status';
  var POLL_MS = 10000;
  var REQUEST_TIMEOUT_MS = 6000;
  var HISTORY = 40;
  var SVG = 'http://www.w3.org/2000/svg';

  // Static facts: docs/VPS-FLEET.md. `cluster` is which network the machine sits in.
  var MACHINES = {
    bk2: { cores: 7, cluster: 'inter', x: 520, y: 118 }, mk2: { cores: 5, cluster: 'inter', x: 330, y: 118 }, bk1: { cores: 2, cluster: 'inter', x: 140, y: 118 },
    mk1: { cores: 1, cluster: 'inter', x: 130, y: 318 }, ms1: { cores: 1, cluster: 'inter', x: 300, y: 318 },
    mist1: { cores: 1, cluster: 'inter', x: 470, y: 318 }, ms3: { cores: 1, cluster: 'inter', x: 590, y: 318 },
    eug2c: { cores: 2, cluster: 'other', x: 800, y: 130 }, eul4c: { cores: 4, cluster: 'other', x: 880, y: 300 }
  };
  var BUCKETS = [
    { label: 'under 5 ms', max: 5 }, { label: '5-20 ms', max: 20 }, { label: '20-80 ms', max: 80 },
    { label: '80-200 ms', max: 200 }, { label: 'over 200 ms', max: Infinity }
  ];

  function fmt(n) { return (n == null) ? '–' : n.toLocaleString('en-US'); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function sv(tag, attrs, cls) { var e = document.createElementNS(SVG, tag); if (cls) e.setAttribute('class', cls); for (var k in (attrs || {})) e.setAttribute(k, attrs[k]); return e; }
  function href(key) { var entry = ArkUI.pageCatalog && ArkUI.pageCatalog[key]; return entry ? (ArkUI.route ? ArkUI.route.href(entry.path) : '#' + entry.path) : '#/' + key; }
  function short(id) { return id.replace(/^validator-/, ''); }
  function time(d) { return d.toLocaleTimeString('en-GB', { hour12: false }); }
  function mean(xs) { return xs.length ? Math.round(xs.reduce(function (t, x) { return t + x; }, 0) / xs.length) : null; }
  function radius(id) { return 18 + (MACHINES[id] ? MACHINES[id].cores : 1) * 3; }

  var FABRIC_RETIRED = Symbol('fabric-retired');
  async function fetchStatus() {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT_MS);
    try {
      var res = await fetch(API, { cache: 'no-store', signal: controller.signal });
      if (res.status === 404) return FABRIC_RETIRED;
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var body = await res.json();
      if (body && body.ok === false && body.error === 'NOT_FOUND') return FABRIC_RETIRED;
      return body;
    } finally {
      clearTimeout(timer);
    }
  }

  function tile(cls, label) {
    var t = el('article', 'stats-tile monitor-tile ' + (cls || ''));
    if (label) t.appendChild(el('p', 'stats-tile-label', label));
    return t;
  }

  /* A trend line of real readings; a null (unreachable) reading breaks it. */
  function spark(cls) {
    var svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('class', 'monitor-spark ' + (cls || ''));
    svg.setAttribute('viewBox', '0 0 100 24'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
    var path = document.createElementNS(SVG, 'path'); svg.appendChild(path);
    svg.draw = function (values) {
      var real = values.filter(function (v) { return v != null; });
      if (real.length < 2) { path.setAttribute('d', ''); return; }
      var lo = Math.min.apply(null, real), hi = Math.max.apply(null, real), span = Math.max(hi - lo, 4);
      var step = 100 / (HISTORY - 1), x0 = 100 - (values.length - 1) * step, d = '', pen = false;
      values.forEach(function (v, i) {
        if (v == null) { pen = false; return; }
        var x = (x0 + i * step).toFixed(1), y = (21 - ((v - lo) / span) * 18).toFixed(1);
        d += (pen ? 'L' : 'M') + x + ' ' + y; pen = true;
      });
      path.setAttribute('d', d);
    };
    return svg;
  }

  /* The map: two networks, every machine, every quorum as a link. Built once; each poll only
     changes classes and text. Node size is core count (static). */
  function buildMap() {
    var wrap = el('div', 'monitor-map-wrap');
    var svg = sv('svg', { viewBox: '0 0 1000 430', role: 'img', 'aria-label': 'Fleet topology: machines grouped by network, quorums drawn as links between members' }, 'monitor-map');
    svg.appendChild(sv('rect', { x: 10, y: 12, width: 665, height: 406, rx: 18 }, 'monitor-cluster'));
    svg.appendChild(sv('rect', { x: 715, y: 12, width: 275, height: 406, rx: 18 }, 'monitor-cluster is-other'));
    var t1 = sv('text', { x: 30, y: 40 }, 'monitor-cluster-label'); t1.textContent = 'InterServer · 7 machines in quorums, several sites'; svg.appendChild(t1);
    var t2 = sv('text', { x: 735, y: 40 }, 'monitor-cluster-label'); t2.textContent = 'Second provider · 2 machines'; svg.appendChild(t2);
    var gap = sv('text', { x: 695, y: 232, 'text-anchor': 'middle' }, 'monitor-gap-label'); gap.textContent = '≈ 75-80 ms RTT'; svg.appendChild(gap);
    var linkLayer = sv('g'), nodeLayer = sv('g'); svg.appendChild(linkLayer); svg.appendChild(nodeLayer);
    var nodes = {};
    Object.keys(MACHINES).forEach(function (id) {
      var m = MACHINES[id], g = sv('g', { transform: 'translate(' + m.x + ' ' + m.y + ')', tabindex: 0 }, 'monitor-node');
      g.appendChild(sv('circle', { r: radius(id) }, 'monitor-node-disc'));
      var name = sv('text', { y: 4, 'text-anchor': 'middle' }, 'monitor-node-name'); name.textContent = id; g.appendChild(name);
      var ms = sv('text', { y: radius(id) + 17, 'text-anchor': 'middle' }, 'monitor-node-ms-label'); ms.textContent = '–'; g.appendChild(ms);
      var cores = sv('text', { y: radius(id) + 31, 'text-anchor': 'middle' }, 'monitor-node-cores'); cores.textContent = m.cores + (m.cores === 1 ? ' core' : ' cores'); g.appendChild(cores);
      var title = sv('title'); g.appendChild(title);
      nodeLayer.appendChild(g);
      nodes[id] = { g: g, ms: ms, title: title };
    });
    wrap.appendChild(svg);
    return { wrap: wrap, linkLayer: linkLayer, nodes: nodes, links: {} };
  }

  function drawLinks(map, quorums) {
    map.linkLayer.textContent = '';
    map.links = {};
    quorums.forEach(function (q) {
      var ids = q.members.map(function (m) { return short(m.id); });
      if (ids.length < 2 || !MACHINES[ids[0]] || !MACHINES[ids[1]]) return;
      var a = MACHINES[ids[0]], b = MACHINES[ids[1]];
      var g = sv('g', null, 'monitor-link');
      g.appendChild(sv('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y }));
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      g.appendChild(sv('rect', { x: mx - 14, y: my - 11, width: 28, height: 22, rx: 11 }, 'monitor-link-pill'));
      var t = sv('text', { x: mx, y: my + 4, 'text-anchor': 'middle' }, 'monitor-link-label'); t.textContent = q.id; g.appendChild(t);
      map.linkLayer.appendChild(g);
      map.links[q.id] = g;
    });
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
      hero.appendChild(el('p', null, 'The chain-prototype fleet, measured right now. The pulse polls each chain-server directly every 60 seconds and shows the current entries-per-second per node, the aggregate across the fleet, and this tab\'s session history. If a node is up it answers; if the pulse endpoint is down the panel says so plainly.'));
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
      var kNodes = kpi('Chain-servers live');
      var kAgg = kpi('Fleet aggregate');
      var kEntries = kpi('Entries this pulse');
      var kErrors = kpi('Pulse errors');

      // Live chain-fleet pulse — polls bk2's /pulse.json every 60s and
      // shows the real current fleet speed. The endpoint is configurable via
      // window.ArkPulseEndpoint so the user can point /monitor at a local
      // pulse they run themselves.
      var PULSE_URL = (window.ArkPulseEndpoint || 'http://162.35.26.46:19502/pulse.json');
      var pTile = tile('stats-span-12 monitor-pulse-tile stats-chosen', 'Live fleet pulse · current chain-server speed');
      pTile.appendChild(el('h2', null, 'What the fleet is doing right now'));
      pTile.appendChild(el('p', 'stats-tile-copy', 'The chain-prototype fleet runs a self-bench every hour from flx-bk2 and publishes the result as JSON. Each row shows what a client on bk2 observed when it fanned 16 chains × 50 entries at that node in parallel with the others. The aggregate scales linearly as nodes join. Point /monitor at a local pulse by setting window.ArkPulseEndpoint before load.'));
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
          setKpi(kAgg, '–', 'entries/s', 'waiting for pulse');
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
        setKpi(kAgg, Math.round(data.aggregate_qps || 0).toLocaleString('en-US'), 'entries/s', 'parallel across ' + alive + ' nodes');
        setKpi(kEntries, (data.total_entries || 0).toLocaleString('en-US'), 'this pulse', 'ingested in ' + (data.longest_ms || 0) + ' ms wall-clock');
        setKpi(kErrors, data.errors || 0, 'since this pulse', data.errors ? 'see per-node rows below' : 'zero refusals');
        pMeta.textContent = 'Measured ' + when.toLocaleString() + ' · ' + ageLabel + ' · pulling from ' + PULSE_URL;
        var sorted = data.nodes.slice().sort(function (a, b) { return (b.qps || 0) - (a.qps || 0); });
        var maxQps = Math.max.apply(null, sorted.map(function (n) { return n.qps || 0; }).concat([1]));
        var rows = sorted.map(function (n) {
          if (n.error) {
            return '<tr class="is-warn"><td>' + n.name + '</td><td>' + n.addr + '</td>' +
              '<td colspan="3">error: ' + String(n.error).replace(/[&<>]/g, '') + '</td></tr>';
          }
          var w = Math.max(2, (n.qps / maxQps) * 100).toFixed(1);
          return '<tr><td>' + n.name + '</td><td>' + n.addr + '</td>' +
            '<td><div class="monitor-bar-wrap"><span class="monitor-bar" style="--w:' + w + '%"></span><strong>' + Math.round(n.qps).toLocaleString('en-US') + '</strong></div></td>' +
            '<td>' + n.ok + '/' + n.total + '</td>' +
            '<td>' + n.elapsed_ms + ' ms</td></tr>';
        }).join('');
        pTable.innerHTML = '<table class="stats-table stats-table-wrapped monitor-pulse-table"><thead>' +
          '<tr><th>Node</th><th>Addr</th><th>Entries / s</th><th>ok / total</th><th>Elapsed</th></tr></thead>' +
          '<tbody>' + rows + '<tr class="is-chosen"><td colspan="2"><strong>Fleet aggregate</strong></td>' +
          '<td><strong>' + Math.round(data.aggregate_qps).toLocaleString('en-US') + '</strong> entries/s</td>' +
          '<td>' + (data.total_entries || 0).toLocaleString('en-US') + '</td>' +
          '<td>' + (data.longest_ms || 0) + ' ms</td></tr></tbody></table>';
      }
      refreshBtn.addEventListener('click', function () { liveChip.textContent = 'Refreshing…'; tickPulse(); });
      function pushSessionRow(data) {
        if (!data || !data.measured_at_ms) return;
        if (pulseHistory.some(function (h) { return h.measured_at_ms === data.measured_at_ms; })) return;
        pulseHistory.unshift({ measured_at_ms: data.measured_at_ms, aggregate_qps: data.aggregate_qps, nodes: data.nodes.length, errors: data.errors });
        pulseHistory = pulseHistory.slice(0, 12);
        pSession.innerHTML = pulseHistory.map(function (h) {
          return '<li><code>' + new Date(h.measured_at_ms).toLocaleTimeString() + '</code> · ' +
            h.nodes + ' nodes · <strong>' + Math.round(h.aggregate_qps).toLocaleString('en-US') + '</strong> entries/s · ' +
            h.errors + ' err</li>';
        }).join('');
      }
      function tickPulse() {
        liveChip.textContent = 'Fetching pulse…'; liveChip.dataset.state = '';
        var started = Date.now();
        fetch(PULSE_URL, { cache: 'no-store', mode: 'cors' })
          .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status + ' from ' + PULSE_URL)); })
          .then(function (d) { paintPulse(d); pushSessionRow(d); })
          .catch(function (e) {
            var ms = Date.now() - started;
            var msg = 'Pulse endpoint unreachable (' + ms + ' ms). ' + e.message +
              '. URL: ' + PULSE_URL +
              '. Check that your browser can reach it (open ' + PULSE_URL + ' in a new tab).' +
              ' Override with window.ArkPulseEndpoint = "http://your-host:19502/pulse.json" before load.';
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
      cTile.appendChild(el('h2', null, 'Per-identity chains, K-of-N peer replication, cross-WAN measured'));
      cTile.appendChild(el('p', 'stats-tile-copy', 'The finance surface. Each identity owns its own append-only chain of value moves. Durability is K-of-N peer replication of content-addressed CIDs. A second entry at the same (G, pos) is self-signed equivocation; the chain is frozen from that position by any node that holds the pair. Six-node fleet measured 2026-10-08 across 3 regions and 2 providers: 79,654 entries/s aggregate ingestion, zero errors.'));
      var cStats = el('ol', 'monitor-chain-stats');
      [
        ['Fleet aggregate', '79,654 entries/s (6 nodes, parallel)', 'bk2, mk2, bk1, mist1, eug-2c, eul-4c; 38,400 entries in 868 ms wall-clock'],
        ['Per-pair peak', '22,559 entries/s (bk2 → mk2, 128 chains)', '64,000 entries, 2,836 ms, server-side burst batching'],
        ['Recovery slack', '~12x live admission', 'replay 279,149 vs hot write 22,559 — a lagging peer catches up faster than it falls behind'],
        ['Fork gossip', 'cross-WAN propagation Ok', 'bk2 → mk2 Ok("fork") verified in same run'],
        ['Replication', 'K-of-N peer acks', 'Replication::Peers { require, among, push, cache }'],
        ['Replay default', 'head-only sig + hash chain', '~10x strict (279,149 vs 27,268 entries/s)'],
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
      cTile.appendChild(el('p', 'stats-tile-copy', 'Two chain-servers run on flx-bk2 and flx-mk2 (:19501). The audited fleet number above is live measurement, not simulation; the fleet-run binary is in dense-wire/target/release/fleet-run. A live /chain-heads endpoint is next; it will fill the "Chain heads" row from each node\'s own ledger.'));
      var cLink = el('a', 'stats-monitor-link', 'Open the design + measurements →'); cLink.href = href('stats/ledger'); cLink.dataset.sceneLink = 'stats/ledger';
      cTile.appendChild(cLink);
      bento.appendChild(cTile);

      // How to read this page
      var rTile = tile('stats-span-12 monitor-read-tile', 'Reading this page');
      rTile.appendChild(el('h2', null, 'What is live, what is session, what is audited'));
      var legend = el('ul', 'monitor-legend');
      [['Live', 'The fleet-pulse panel polls bk2 every 60s for the current per-node and aggregate chain-server throughput. A failed poll leaves the last real sample with a staleness note; it never fills a gap.'],
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
