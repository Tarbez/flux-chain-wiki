/* /monitor: a live-looking mesh dashboard driven by a simulated feed.
   Nothing here talks to the fleet yet. Every value is generated in the
   browser by a seeded random walk, shaped around the audited numbers on
   /stats (js/pages/stats.js EVIDENCE): four quorums whose averages match the
   five-run audit, eight fleet machines, zero failures as the norm. The page
   says so in its hero and its chip, and nothing on it may read as measured.
   When a real feed exists, replace createFeed() and keep the renderers. */
(function () {
  'use strict';

  var HISTORY = 120;           // seconds of throughput kept for the chart
  var QUORUMS = [               // audit averages (bench-003 §4), the walk's centre
    { id: 'A', centre: 2424, members: 'mk2 + bk1' },
    { id: 'F', centre: 2322, members: 'bk2 + mk2' },
    { id: 'C', centre: 759, members: 'mist1 + ms3' },
    { id: 'B', centre: 411, members: 'mk1 + ms1' }
  ];
  // Roles are the live configuration in bench-003; CPU baselines are mock.
  var NODES = [
    { name: 'flx-bk2', role: 'Validator F · client A', cpu: 66 },
    { name: 'flx-mk2', role: 'Validator A, F · client F', cpu: 72 },
    { name: 'flx-bk1', role: 'Validator A', cpu: 92 },
    { name: 'flx-mk1', role: 'Validator B', cpu: 38 },
    { name: 'flx-ms1', role: 'Validator B', cpu: 41 },
    { name: 'flx-mist1', role: 'Validator C', cpu: 52 },
    { name: 'flx-ms3', role: 'Validator C', cpu: 49 },
    { name: 'flx-ms2', role: 'Client B, C · member A', cpu: 57 }
  ];
  var Y_MIN = 5000, Y_MAX = 6600;  // chart domain: a line chart may start above zero
  var BINS = ['<100', '100–200', '200–300', '300–400', '400–600', '600+'];

  function fmt(n, d) { return n.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  function hex(rand, n) { var s = ''; while (s.length < n) s += Math.floor(rand() * 16).toString(16); return s; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function href(key) { var entry = ArkUI.pageCatalog && ArkUI.pageCatalog[key]; return entry ? (ArkUI.route ? ArkUI.route.href(entry.path) : '#' + entry.path) : '#/' + key; }

  /* The simulated feed. One tick per second; state is plain numbers. */
  function createFeed(seed) {
    var rand = rng(seed);
    var q = QUORUMS.map(function (x) { return { id: x.id, rate: x.centre }; });
    var nodes = NODES.map(function (n) { return { name: n.name, cpu: n.cpu, up: true }; });
    var history = [];
    var p50 = 212, failures = 0, closures = 0, events = [];
    function step() {
      q.forEach(function (x, i) {
        var centre = QUORUMS[i].centre;
        x.rate = clamp(x.rate + (centre - x.rate) * 0.18 + (rand() - 0.5) * centre * 0.09, centre * 0.7, centre * 1.18);
      });
      nodes.forEach(function (n, i) { n.cpu = clamp(n.cpu + (NODES[i].cpu - n.cpu) * 0.2 + (rand() - 0.5) * 12, 4, 100); });
      var total = q.reduce(function (t, x) { return t + x.rate; }, 0);
      p50 = clamp(p50 + (212 - p50) * 0.25 + (rand() - 0.5) * 40, 140, 360);
      closures += Math.round(total);
      if (rand() < 0.012) failures += 1;   // rare, like the one transient timeout in the audit
      history.push(total); if (history.length > HISTORY) history.shift();
      var count = 2 + Math.floor(rand() * 3);
      for (var i = 0; i < count; i++) {
        var qi = rand() < 0.4 ? 0 : rand() < 0.66 ? 1 : rand() < 0.75 ? 2 : 3;
        var ms = Math.round(clamp(p50 + (rand() - 0.35) * 220, 60, 900));
        events.unshift({ at: Date.now(), quorum: q[qi].id, cert: hex(rand, 8), ms: ms, durable: rand() < 0.35 });
      }
      events.length = Math.min(events.length, 9);
      var hist = BINS.map(function () { return 0; });
      for (var k = 0; k < 400; k++) {
        var v = p50 * Math.exp((rand() + rand() + rand() - 1.5) * 0.7);
        hist[v < 100 ? 0 : v < 200 ? 1 : v < 300 ? 2 : v < 400 ? 3 : v < 600 ? 4 : 5] += 1;
      }
      return { total: total, quorums: q, nodes: nodes, history: history.slice(), p50: p50, failures: failures, closures: closures, events: events.slice(), hist: hist };
    }
    for (var w = 0; w < HISTORY; w++) step();   // warm history so the chart opens full
    closures = 0; failures = 0;                  // session counters start when the page opens
    return { step: step };
  }

  function tile(cls, label) {
    var t = el('article', 'stats-tile monitor-tile ' + (cls || ''));
    if (label) t.appendChild(el('p', 'stats-tile-label', label));
    return t;
  }

  function sparkPath(values, w, h, pad) {
    var lo = Math.min.apply(null, values), hi = Math.max.apply(null, values), span = hi - lo || 1;
    return values.map(function (v, i) {
      var x = (i / (values.length - 1)) * w, y = pad + (1 - (v - lo) / span) * (h - pad * 2);
      return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }).join(' ');
  }

  ArkUI.pageModules.monitor = {
    mount: function (host) {
      var page = el('section', 'ark-page task-page stats-page monitor-page');
      page.setAttribute('aria-labelledby', 'monitor-title');
      var shell = el('div', 'stats-shell'), bento = el('div', 'stats-bento');
      shell.appendChild(bento); page.appendChild(shell);
      var svgNS = 'http://www.w3.org/2000/svg';

      // Hero
      var hero = tile('stats-hero monitor-hero');
      var top = el('div', 'monitor-hero-top');
      var chip = el('span', 'monitor-sim', 'Simulated feed');
      var live = el('span', 'monitor-live'); live.appendChild(el('i')); var clock = el('span', 'monitor-clock', '--:--:--'); live.appendChild(clock);
      top.appendChild(chip); top.appendChild(live); hero.appendChild(top);
      var h1 = el('h1', null, 'Mesh monitor'); h1.id = 'monitor-title'; hero.appendChild(h1);
      hero.appendChild(el('p', null, 'A preview of the live fleet view. Every number here is generated in your browser around the audited figures, not read from the fleet.'));
      var actions = el('div', 'monitor-actions');
      var pause = el('button', 'monitor-pause', 'Pause'); pause.type = 'button'; pause.setAttribute('aria-pressed', 'false');
      var back = el('a', 'stats-monitor-link', 'Measured numbers'); back.href = href('stats'); back.dataset.sceneLink = 'stats';
      actions.appendChild(pause); actions.appendChild(back); hero.appendChild(actions);
      bento.appendChild(hero);

      // Lead KPI: aggregate throughput + sparkline
      var lead = tile('stats-kpi stats-kpi-lead monitor-lead', 'Aggregate throughput · 4 quorums');
      var leadValue = el('p', 'stats-kpi-value'); var leadNum = el('strong', null, '0'); leadValue.appendChild(leadNum); leadValue.appendChild(el('span', null, 'closures/s'));
      lead.appendChild(leadValue);
      var spark = document.createElementNS(svgNS, 'svg'); spark.setAttribute('class', 'monitor-spark'); spark.setAttribute('viewBox', '0 0 300 56'); spark.setAttribute('preserveAspectRatio', 'none'); spark.setAttribute('aria-hidden', 'true');
      var sparkLine = document.createElementNS(svgNS, 'path'); spark.appendChild(sparkLine); lead.appendChild(spark);
      var leadDetail = el('p', 'stats-kpi-detail', ''); lead.appendChild(leadDetail);
      bento.appendChild(lead);

      function kpi(label, unit) {
        var t = tile('stats-kpi', label), v = el('p', 'stats-kpi-value'), n = el('strong', null, '–');
        v.appendChild(n); v.appendChild(el('span', null, unit)); t.appendChild(v);
        var d = el('p', 'stats-kpi-detail'); t.appendChild(d); bento.appendChild(t);
        return { num: n, detail: d, tile: t };
      }
      var kP50 = kpi('Finality p50', 'ms');
      var kNodes = kpi('Machines up', 'of 8');
      var kClosures = kpi('Closures this session', '');
      var kFail = kpi('Failures', 'this session');

      // Throughput chart
      var chartTile = tile('stats-span-8 monitor-chart-tile', 'Throughput · last 2 minutes');
      var chartHead = el('h2', null, 'Aggregate closures per second'); chartTile.appendChild(chartHead);
      var chartBox = el('div', 'monitor-chart'); chartBox.tabIndex = 0;
      chartBox.setAttribute('role', 'img');
      var chart = document.createElementNS(svgNS, 'svg'); chart.setAttribute('viewBox', '0 0 600 200'); chart.setAttribute('preserveAspectRatio', 'none');
      var area = document.createElementNS(svgNS, 'path'); area.setAttribute('class', 'monitor-area');
      var line = document.createElementNS(svgNS, 'path'); line.setAttribute('class', 'monitor-line');
      chart.appendChild(area); chart.appendChild(line); chartBox.appendChild(chart);
      var cross = el('span', 'monitor-cross'); var dot = el('span', 'monitor-dot'); var tip = el('span', 'monitor-tip');
      chartBox.appendChild(cross); chartBox.appendChild(dot); chartBox.appendChild(tip);
      var yTop = el('span', 'monitor-axis monitor-axis-top'), yBottom = el('span', 'monitor-axis monitor-axis-bottom');
      chartBox.appendChild(yTop); chartBox.appendChild(yBottom);
      chartTile.appendChild(chartBox);
      var chartFoot = el('p', 'stats-chart-foot monitor-chart-foot'); chartFoot.appendChild(el('span', null, '−120 s')); chartFoot.appendChild(el('span', null, 'now'));
      chartTile.appendChild(chartFoot);
      bento.appendChild(chartTile);

      // Quorums
      var qTile = tile('stats-span-4', 'Quorums');
      qTile.appendChild(el('h2', null, 'Four independent pools'));
      var qList = el('ol', 'monitor-quorums');
      var qRows = QUORUMS.map(function (q) {
        var li = el('li'); var head = el('p', 'monitor-q-head');
        var name = el('span', 'monitor-q-name'); name.appendChild(el('b', null, q.id)); name.appendChild(el('small', null, q.members));
        var val = el('span', 'monitor-q-val', '–'); head.appendChild(name); head.appendChild(val);
        var track = el('span', 'monitor-q-track'); var bar = el('span', 'monitor-q-bar'); track.appendChild(bar);
        li.appendChild(head); li.appendChild(track); qList.appendChild(li);
        return { val: val, bar: bar, li: li };
      });
      qTile.appendChild(qList); bento.appendChild(qTile);

      // Nodes
      var nTile = tile('stats-span-7', 'Fleet machines · CPU');
      nTile.appendChild(el('h2', null, 'Eight machines, one hot spot'));
      var nGrid = el('ul', 'monitor-nodes');
      var nCells = NODES.map(function (n) {
        var li = el('li'); var head = el('p', 'monitor-node-head');
        var s = el('span', 'monitor-node-state'); s.setAttribute('aria-hidden', 'true');
        head.appendChild(s); head.appendChild(el('b', null, n.name));
        var pctEl = el('span', 'monitor-node-pct', '–'); head.appendChild(pctEl);
        li.appendChild(head); li.appendChild(el('small', null, n.role));
        var meter = el('span', 'monitor-meter'); var fill = el('span'); meter.appendChild(fill); li.appendChild(meter);
        nGrid.appendChild(li);
        return { li: li, pct: pctEl, fill: fill };
      });
      nTile.appendChild(nGrid); bento.appendChild(nTile);

      // Latency histogram
      var hTile = tile('stats-span-5', 'Finality latency · ms');
      hTile.appendChild(el('h2', null, 'Most closures land under 300 ms'));
      var hist = el('ol', 'monitor-hist');
      var hCols = BINS.map(function (b) {
        var li = el('li'); var col = el('span', 'monitor-hist-col'); var fill = el('span'); col.appendChild(fill);
        li.appendChild(col); li.appendChild(el('small', null, b)); hist.appendChild(li);
        return { li: li, fill: fill, label: b };
      });
      hTile.appendChild(hist); bento.appendChild(hTile);

      // Event feed
      var fTile = tile('stats-span-12 monitor-feed-tile', 'Certificates');
      fTile.appendChild(el('h2', null, 'Latest quorum certificates'));
      var feedList = el('ol', 'monitor-feed'); feedList.setAttribute('aria-live', 'off');
      fTile.appendChild(feedList); bento.appendChild(fTile);

      host.appendChild(page);

      /* Rendering */
      var feed = createFeed(0x5eed), state = null, hoverIndex = -1, paused = false;
      var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) page.classList.add('monitor-reduced');

      function drawChart() {
        var h = state.history, lo = Y_MIN, hi = Y_MAX;
        var pts = h.map(function (v, i) { return [i / (HISTORY - 1) * 600, 200 - clamp((v - lo) / (hi - lo), 0, 1) * 200]; });
        var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
        line.setAttribute('d', d);
        area.setAttribute('d', d + ' L600 200 L0 200 Z');
        yTop.textContent = fmt(hi) + '/s'; yBottom.textContent = fmt(lo) + '/s';
        chartBox.setAttribute('aria-label', 'Simulated aggregate throughput, last 120 seconds, now ' + fmt(state.total) + ' closures per second');
        drawHover();
      }
      function drawHover() {
        if (hoverIndex < 0 || !state) { chartBox.classList.remove('is-hover'); return; }
        var v = state.history[hoverIndex], x = hoverIndex / (HISTORY - 1) * 100, y = (1 - clamp((v - Y_MIN) / (Y_MAX - Y_MIN), 0, 1)) * 100;
        cross.style.left = x + '%'; dot.style.left = x + '%'; dot.style.top = y + '%';
        tip.style.left = clamp(x, 12, 88) + '%';
        tip.textContent = fmt(v) + '/s · ' + (HISTORY - 1 - hoverIndex) + ' s ago';
        chartBox.classList.add('is-hover');
      }
      chartBox.addEventListener('pointermove', function (e) {
        var r = chartBox.getBoundingClientRect();
        hoverIndex = Math.round(clamp((e.clientX - r.left) / r.width, 0, 1) * (HISTORY - 1)); drawHover();
      });
      chartBox.addEventListener('pointerleave', function () { hoverIndex = -1; drawHover(); });
      chartBox.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        if (hoverIndex < 0) hoverIndex = HISTORY - 1;
        hoverIndex = clamp(hoverIndex + (e.key === 'ArrowLeft' ? -1 : 1), 0, HISTORY - 1); drawHover();
      });
      chartBox.addEventListener('blur', function () { hoverIndex = -1; drawHover(); });

      function render() {
        var s = state;
        leadNum.textContent = fmt(s.total);
        var avg = s.history.reduce(function (t, v) { return t + v; }, 0) / s.history.length;
        leadDetail.textContent = '2-minute average ' + fmt(avg) + '/s · audited range 5,711–6,041/s';
        sparkLine.setAttribute('d', sparkPath(s.history.slice(-40), 300, 56, 4));
        kP50.num.textContent = fmt(s.p50); kP50.detail.textContent = 'Accepted finality, all quorums';
        var hot = s.nodes.filter(function (n) { return n.cpu >= 90; }).length;
        kNodes.num.textContent = '8'; kNodes.detail.textContent = hot ? hot + ' running above 90% CPU' : 'All under 90% CPU';
        kClosures.num.textContent = fmt(s.closures); kClosures.detail.textContent = 'Since this page opened';
        kFail.num.textContent = fmt(s.failures); kFail.detail.textContent = s.failures ? 'Transient timeouts, retried' : 'None so far';
        kFail.tile.classList.toggle('is-warn', s.failures > 0);
        drawChart();
        var qMax = 3000;
        s.quorums.forEach(function (q, i) {
          qRows[i].val.textContent = fmt(q.rate) + '/s';
          qRows[i].bar.style.width = (q.rate / qMax * 100).toFixed(1) + '%';
          qRows[i].li.setAttribute('data-tip', 'Quorum ' + q.id + ': ' + fmt(q.rate) + ' closures/s');
        });
        s.nodes.forEach(function (n, i) {
          var c = nCells[i]; c.pct.textContent = fmt(n.cpu) + '%';
          c.fill.style.width = n.cpu.toFixed(1) + '%';
          c.li.classList.toggle('is-hot', n.cpu >= 90);
          c.li.setAttribute('data-tip', NODES[i].name + ': ' + fmt(n.cpu) + '% CPU' + (n.cpu >= 90 ? ', saturated' : ''));
        });
        var hMax = Math.max.apply(null, s.hist);
        s.hist.forEach(function (v, i) {
          hCols[i].fill.style.height = (v / hMax * 100).toFixed(1) + '%';
          hCols[i].li.setAttribute('data-tip', hCols[i].label + ' ms: ' + Math.round(v / 4) + '% of closures');
        });
        feedList.textContent = '';
        s.events.forEach(function (ev) {
          var li = el('li');
          li.appendChild(el('span', 'monitor-feed-q', ev.quorum));
          li.appendChild(el('code', null, ev.cert));
          li.appendChild(el('span', 'monitor-feed-kind', ev.durable ? 'Durable' : 'Accepted'));
          li.appendChild(el('span', 'monitor-feed-ms', ev.ms + ' ms'));
          li.appendChild(el('time', null, new Date(ev.at).toLocaleTimeString('en-GB', { hour12: false })));
          feedList.appendChild(li);
        });
      }
      function tick() {
        clock.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false });
        if (paused || document.hidden) return;
        state = feed.step(); render();
      }
      pause.addEventListener('click', function () {
        paused = !paused; pause.textContent = paused ? 'Resume' : 'Pause';
        pause.setAttribute('aria-pressed', paused ? 'true' : 'false');
        page.classList.toggle('is-paused', paused);
      });
      tick();
      var timer = setInterval(tick, 1000);
      page.arkDispose = function () { clearInterval(timer); };
      return page;
    }
  };
})();
