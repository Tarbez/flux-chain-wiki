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

  async function fetchStatus() {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT_MS);
    try {
      var res = await fetch(API, { cache: 'no-store', signal: controller.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
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

      // Hero
      var hero = tile('stats-hero monitor-hero');
      var top = el('div', 'monitor-hero-top');
      var chip = el('span', 'monitor-live-chip', 'Connecting');
      var live = el('span', 'monitor-live'); live.appendChild(el('i')); var clock = el('span', 'monitor-clock', '–'); live.appendChild(clock);
      top.appendChild(chip); top.appendChild(live); hero.appendChild(top);
      var h1 = el('h1', null, 'Mesh monitor'); h1.id = 'monitor-title'; hero.appendChild(h1);
      hero.appendChild(el('p', null, 'Which machines answer, how fast, and whether every quorum member agrees on who is in it. Read from the fleet every ' + (POLL_MS / 1000) + ' seconds. Throughput is audited, not live, and is labelled that way below.'));
      var links = el('div', 'stats-cta');
      var statsLink = el('a', 'stats-monitor-link', 'How fast, and why →'); statsLink.href = href('stats'); statsLink.dataset.sceneLink = 'stats';
      links.appendChild(statsLink); hero.appendChild(links);
      bento.appendChild(hero);

      // Lead: quorums online, one pip per quorum; the "of N" is filled from the first real poll.
      var lead = tile('stats-kpi stats-kpi-lead monitor-lead', 'Quorums online');
      var leadValue = el('p', 'stats-kpi-value monitor-primary'); var leadNum = el('strong', null, '–'); var leadOf = el('span', null, '');
      leadValue.appendChild(leadNum); leadValue.appendChild(leadOf); lead.appendChild(leadValue);
      var pips = el('ol', 'monitor-pips'); pips.setAttribute('aria-hidden', 'true'); lead.appendChild(pips);
      var leadDetail = el('p', 'stats-kpi-detail', 'Waiting for first poll…'); lead.appendChild(leadDetail);
      bento.appendChild(lead);

      function kpi(label, unit, tier) {
        var t = tile('stats-kpi', label), v = el('p', 'stats-kpi-value ' + tier), n = el('strong', null, '–'), u = el('span', null, unit || '');
        v.appendChild(n); v.appendChild(u); t.appendChild(v);
        var d = el('p', 'stats-kpi-detail'); t.appendChild(d); bento.appendChild(t);
        return { num: n, unit: u, detail: d, tile: t };
      }
      var kMachines = kpi('Machines up', '', 'monitor-primary');
      var kLatency = kpi('Health-check latency', 'ms avg', 'monitor-complement');
      var latencySpark = spark('is-wide'); kLatency.tile.insertBefore(latencySpark, kLatency.detail);
      var kSession = kpi('Polls answered', '%', 'monitor-complement');
      var kErrors = kpi('Backend poll errors', 'since start', 'monitor-neutral');

      // Topology map
      var mTile = tile('stats-span-12 monitor-map-tile', 'Live topology · specs are static, state is live');
      mTile.appendChild(el('h2', null, 'Nine machines, two providers, five quorums'));
      mTile.appendChild(el('p', 'stats-tile-copy', 'Each circle is a machine, sized by its cores. A line is a quorum; the letter names it. mk2 sits in two quorums (A and F). Green means the last health check answered, amber means it did not. The number under each circle is the whole check, including opening the connection, so it is roughly two round trips: 160 ms means about 80 ms away. Within the InterServer group the machines sit at different sites, which is why mk1, mist1 and ms3 read higher than bk2, mk2 and bk1.'));
      var map = buildMap(); mTile.appendChild(map.wrap);
      bento.appendChild(mTile);

      // Quorums
      var qTile = tile('stats-span-5 monitor-quorum-tile', 'Quorums · membership');
      var qList = el('ol', 'monitor-quorums');
      qTile.appendChild(qList); bento.appendChild(qTile);

      // Machines
      var nTile = tile('stats-span-7 monitor-node-tile', 'Machines · latency this session');
      var nList = el('ul', 'monitor-nodes');
      nTile.appendChild(nList); bento.appendChild(nTile);

      // Session latency histogram
      var hTile = tile('stats-span-5 monitor-hist-tile', 'Session · every reading since you opened this page');
      hTile.appendChild(el('h2', null, 'How long a health check takes'));
      var hist = el('ol', 'monitor-hist'); hTile.appendChild(hist);
      var histNote = el('p', 'stats-tile-copy', 'Waiting for readings…'); hTile.appendChild(histNote);
      bento.appendChild(hTile);

      // Audited capacity: static, labelled, linked back to the map
      var run = window.ArkStatsHighlights && window.ArkStatsHighlights.fleetRun;
      if (run) {
        var aTile = tile('stats-span-7 monitor-audited-tile', 'Last audited run · ' + run.date + ' · not live');
        aTile.appendChild(el('h2', null, fmt(run.total) + ' transfers/s across four servers'));
        aTile.appendChild(el('p', 'stats-tile-copy', 'Registered FLX grammar, ' + run.servers + ' servers and ' + run.clients + ' clients together for ' + run.window + ', ' + fmt(run.transfers) + ' transfers, 0 failures. A prototype (accepted finality only) that is not deployed as a service, so nothing on this page can measure it live. Hover a row to find its machine on the map.'));
        var maxRate = Math.max.apply(null, run.perServer.map(function (s) { return s.now; }));
        var rows = el('ol', 'monitor-audit');
        run.perServer.forEach(function (s) {
          var li = el('li'); li.tabIndex = 0;
          li.appendChild(el('b', null, s.name));
          var track = el('span', 'monitor-audit-track'); var bar = el('span'); bar.style.setProperty('--w', Math.max(2, s.now / maxRate * 100).toFixed(1) + '%'); track.appendChild(bar); li.appendChild(track);
          li.appendChild(el('strong', null, fmt(s.now) + '/s'));
          li.appendChild(el('small', null, s.busy.toFixed(0) + '% CPU · ' + s.cores + ' cores · clients ' + s.clients));
          var focus = function (on) { var n = map.nodes[s.machine]; if (n) n.g.classList.toggle('is-focus', on); };
          li.addEventListener('mouseenter', function () { focus(true); }); li.addEventListener('mouseleave', function () { focus(false); });
          li.addEventListener('focus', function () { focus(true); }); li.addEventListener('blur', function () { focus(false); });
          rows.appendChild(li);
        });
        aTile.appendChild(rows);
        var aLink = el('a', 'stats-monitor-link', 'Open the measurements →'); aLink.href = href('stats'); aLink.dataset.sceneLink = 'stats';
        aTile.appendChild(aLink);
        bento.appendChild(aTile);
      }

      // How to read this page
      var rTile = tile('stats-span-12 monitor-read-tile', 'Reading this page');
      rTile.appendChild(el('h2', null, 'What is live, what is session, what is audited'));
      var legend = el('ul', 'monitor-legend');
      [['Live', 'Reachable, latency and each member\'s view of its quorum, fetched just now. A failed fetch leaves the last real snapshot with a staleness note; it never fills a gap.'],
       ['Session', 'The trend lines and the histogram are real readings this page received since it opened. Close the tab and they are gone.'],
       ['Audited', 'Throughput and CPU figures are from one dated benchmark run. They describe that run, not now.'],
       ['Not measured', 'Whether a quorum would agree under attack, how a validator behaves after a restart, or what a public client would see. Nothing here speaks to those.']
      ].forEach(function (p) { var li = el('li'); li.appendChild(el('b', null, p[0])); li.appendChild(el('span', null, p[1])); legend.appendChild(li); });
      rTile.appendChild(legend);
      var story = el('a', 'stats-monitor-link is-quiet', 'Read how we got here →'); story.href = href('article/how-we-got-fast-and-what-we-got-wrong'); story.dataset.sceneLink = 'article/how-we-got-fast-and-what-we-got-wrong';
      rTile.appendChild(story);
      bento.appendChild(rTile);

      host.appendChild(page);

      var pollTimer = null, lastGoodAt = null, polls = 0, answered = 0;
      var avgHistory = [], nodeHistory = {}, nodeRows = {};
      var counts = BUCKETS.map(function () { return 0; }), readings = 0;

      function push(arr, v) { arr.push(v); if (arr.length > HISTORY) arr.shift(); }

      function renderSession() {
        kSession.num.textContent = polls ? fmt(Math.round(answered / polls * 100)) : '–';
        kSession.detail.textContent = answered + ' of ' + polls + ' since this page opened';
        kSession.tile.classList.toggle('is-warn', answered < polls);
      }

      function renderHist() {
        hist.textContent = '';
        var max = Math.max.apply(null, counts.concat([1]));
        BUCKETS.forEach(function (b, i) {
          var li = el('li'); li.dataset.tip = b.label + ': ' + counts[i] + ' of ' + readings + ' readings';
          li.appendChild(el('span', 'monitor-hist-key', b.label));
          var track = el('span', 'monitor-hist-track'), bar = el('span'); bar.style.setProperty('--w', (counts[i] / max * 100).toFixed(1) + '%'); track.appendChild(bar); li.appendChild(track);
          li.appendChild(el('b', null, String(counts[i])));
          hist.appendChild(li);
        });
        histNote.textContent = readings + ' real readings so far. A check includes opening the connection, so about two round trips: the spread is geography (some machines share a site with the checker, others are 40 to 80 ms away), not trouble.';
      }

      function nodeRow(id) {
        if (nodeRows[id]) return nodeRows[id];
        var li = el('li');
        var dot = el('span', 'monitor-dot'); dot.setAttribute('aria-hidden', 'true');
        var name = el('b', null, 'flx-' + short(id));
        var serves = el('small', 'monitor-serves');
        var line = spark();
        var val = el('span', 'monitor-node-ms');
        li.appendChild(dot); li.appendChild(name); li.appendChild(serves); li.appendChild(line); li.appendChild(val);
        nList.appendChild(li);
        return (nodeRows[id] = { li: li, serves: serves, line: line, val: val });
      }

      var linksDrawn = false;

      function render(snapshot, failed) {
        polls += 1;
        if (failed) {
          renderSession();
          leadDetail.textContent = lastGoodAt
            ? 'Feed unreachable · last real poll ' + time(lastGoodAt)
            : 'Feed unreachable · no successful poll yet';
          chip.textContent = 'Stale'; chip.classList.add('is-stale'); live.classList.add('is-stale');
          return;
        }
        answered += 1;
        renderSession();
        lastGoodAt = new Date(snapshot.generatedAt);
        chip.textContent = 'Live'; chip.classList.remove('is-stale'); live.classList.remove('is-stale');
        clock.textContent = time(lastGoodAt);

        var s = snapshot.summary;
        leadNum.textContent = fmt(s.quorumsOnline);
        leadOf.textContent = 'of ' + s.quorumsTotal;
        lead.classList.toggle('is-warn', s.quorumsOnline < s.quorumsTotal);
        leadDetail.textContent = s.quorumsOnline === s.quorumsTotal
          ? 'Every member of every quorum answered'
          : (s.quorumsTotal - s.quorumsOnline) + ' of ' + s.quorumsTotal + ' have an unreachable member';
        pips.textContent = '';
        snapshot.quorums.forEach(function (q) {
          var p = el('li', q.online ? null : 'is-down', q.id); pips.appendChild(p);
        });

        kMachines.num.textContent = fmt(s.machinesUp);
        kMachines.unit.textContent = 'of ' + s.machinesTotal;
        kMachines.detail.textContent = s.machinesUp === s.machinesTotal ? 'All reachable' : (s.machinesTotal - s.machinesUp) + ' unreachable';
        kMachines.tile.classList.toggle('is-warn', s.machinesUp < s.machinesTotal);

        // One row per machine; a machine in two quorums is pinged on both ports.
        var machines = {}, order = [];
        snapshot.quorums.forEach(function (q) {
          q.members.forEach(function (m) {
            if (!machines[m.id]) { machines[m.id] = { id: m.id, quorums: [], pings: [], seen: [], down: false, error: null }; order.push(m.id); }
            var mc = machines[m.id]; mc.quorums.push(q.id);
            mc.seen.push(q.id + ' ' + (m.reachable ? m.latencyMs + ' ms' : (m.error || 'unreachable')));
            if (m.reachable) {
              mc.pings.push(m.latencyMs);
              readings += 1;
              for (var b = 0; b < BUCKETS.length; b += 1) { if (m.latencyMs < BUCKETS[b].max) { counts[b] += 1; break; } }
            } else { mc.down = true; mc.error = m.error; }
          });
        });
        renderHist();

        var reachable = [];
        order.forEach(function (id) { reachable = reachable.concat(machines[id].pings); });
        var avg = mean(reachable);
        push(avgHistory, avg);
        latencySpark.draw(avgHistory);
        kLatency.num.textContent = fmt(avg);
        kLatency.detail.textContent = reachable.length
          ? 'Range ' + Math.min.apply(null, reachable) + '–' + Math.max.apply(null, reachable) + ' ms this poll'
          : 'No member answered this poll';

        kErrors.num.textContent = fmt(snapshot.pollErrors);
        kErrors.detail.textContent = snapshot.pollErrors ? 'Fleet sweeps that failed' : 'No failed fleet sweeps';
        kErrors.tile.classList.toggle('is-warn', snapshot.pollErrors > 0);

        qList.textContent = '';
        snapshot.quorums.forEach(function (q) {
          var li = el('li'); li.classList.toggle('is-down', !q.online);
          li.appendChild(el('b', 'monitor-q-id', q.id));
          var members = el('span', 'monitor-q-members');
          q.members.forEach(function (m) {
            var tag = el('span', m.reachable ? null : 'is-down');
            var dot = el('i'); dot.setAttribute('aria-hidden', 'true'); tag.appendChild(dot);
            tag.appendChild(document.createTextNode(short(m.id)));
            members.appendChild(tag);
          });
          li.appendChild(members);
          // Each member reports how many members it sees; flag any disagreement.
          var views = q.members.filter(function (m) { return m.reachable && m.memberCount != null && m.memberCount !== q.totalCount; });
          if (views.length) li.appendChild(el('small', 'monitor-q-view', views.map(function (m) { return short(m.id) + ' sees ' + m.memberCount; }).join(' · ')));
          li.appendChild(el('span', 'monitor-q-val', q.onlineCount + '/' + q.totalCount));
          qList.appendChild(li);
        });

        // The map: links once (membership rarely changes), then state on every poll.
        if (!linksDrawn) { drawLinks(map, snapshot.quorums); linksDrawn = true; }
        snapshot.quorums.forEach(function (q) { var l = map.links[q.id]; if (l) l.classList.toggle('is-down', !q.online); });

        order.forEach(function (id) {
          var mc = machines[id], row = nodeRow(id), now = mc.down ? null : mean(mc.pings);
          var series = nodeHistory[id] || (nodeHistory[id] = []);
          push(series, now);
          row.li.classList.toggle('is-down', mc.down);
          row.serves.textContent = mc.quorums.join('·');
          row.line.draw(series);
          row.val.textContent = mc.down ? (mc.error || 'unreachable') : now + ' ms';
          row.val.title = mc.seen.length > 1 ? mc.seen.join(', ') : '';
          var n = map.nodes[short(id)];
          if (n) {
            n.g.classList.toggle('is-down', mc.down);
            n.ms.textContent = mc.down ? 'down' : now + ' ms';
            n.title.textContent = 'flx-' + short(id) + ' · serves ' + mc.quorums.join(', ') + ' · ' + (mc.down ? (mc.error || 'unreachable') : mc.seen.join(', '));
          }
        });
      }

      async function tick() {
        try {
          var snapshot = await fetchStatus();
          render(snapshot, false);
        } catch (err) {
          render(null, true);
        }
      }

      renderHist();
      tick();
      pollTimer = setInterval(tick, POLL_MS);
      page.arkDispose = function () { clearInterval(pollTimer); };
      return page;
    }
  };
})();
