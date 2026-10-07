/* /monitor: the fleet's real live health feed, polled from
   https://defxn.com/api/fleet-status (ops/fleet-status-api.mjs, running as a
   systemd service on bk2 and mk2 -- defxn.com DNS round-robins across both,
   so both carry the same Caddy route and service).

   Scope is deliberately narrow, matching the backend: HEALTH AND MEMBERSHIP
   ONLY. Every quorum's "online" state, every machine's "reachable" state, and
   every health-check latency on this page is real, fetched just now -- never
   simulated or interpolated between polls. The trend lines are the real
   readings this page has already received since it opened, nothing more.
   There is no live throughput number here: measuring real tx/s continuously
   would mean running synthetic transfer bursts against production-adjacent
   quorums on a schedule, a different and heavier decision this page does not
   make. Audited throughput lives on /stats as static, dated figures -- this
   page links there rather than guessing at a live number it cannot measure.

   Color carries the reading order: primary (the identity accent) marks the
   health counts, the info hue marks latency and session history, and
   reference text (labels, units, times, the source link) stays neutral or
   takes the reference hue. Success/warning appear only as state. */
(function () {
  'use strict';

  var API = 'https://defxn.com/api/fleet-status';
  var POLL_MS = 10000;
  var REQUEST_TIMEOUT_MS = 6000;
  var HISTORY = 40;
  var SVG = 'http://www.w3.org/2000/svg';

  function fmt(n) { return (n == null) ? '–' : n.toLocaleString('en-US'); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function href(key) { var entry = ArkUI.pageCatalog && ArkUI.pageCatalog[key]; return entry ? (ArkUI.route ? ArkUI.route.href(entry.path) : '#' + entry.path) : '#/' + key; }
  function short(id) { return id.replace(/^validator-/, ''); }
  function time(d) { return d.toLocaleTimeString('en-GB', { hour12: false }); }
  function mean(xs) { return xs.length ? Math.round(xs.reduce(function (t, x) { return t + x; }, 0) / xs.length) : null; }

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
      hero.appendChild(el('p', null, 'Health and membership, read from the fleet every ' + (POLL_MS / 1000) + 's. Throughput is audited, not live.'));
      var statsLink = el('a', 'stats-monitor-link', 'Audited throughput →'); statsLink.href = href('stats'); statsLink.dataset.sceneLink = 'stats';
      hero.appendChild(statsLink);
      bento.appendChild(hero);

      // Lead: quorums online, with one pip per quorum. The "of N" units
      // below are filled from the first real poll, not hardcoded -- the
      // fleet's quorum/machine count has already changed once (4->5
      // quorums, 7->9 machines, 2026-10-07) and will again.
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

      // Quorums
      var qTile = tile('stats-span-5 monitor-quorum-tile', 'Quorums · membership');
      var qList = el('ol', 'monitor-quorums');
      qTile.appendChild(qList); bento.appendChild(qTile);

      // Machines
      var nTile = tile('stats-span-7 monitor-node-tile', 'Machines · latency this session');
      var nList = el('ul', 'monitor-nodes');
      nTile.appendChild(nList); bento.appendChild(nTile);

      host.appendChild(page);

      /* Rendering: every value below reads from a just-fetched snapshot or
         from earlier snapshots this page actually received. Nothing is
         interpolated or generated -- a failed poll leaves the page showing its
         last REAL snapshot with an explicit staleness note. */
      var pollTimer = null, lastGoodAt = null, polls = 0, answered = 0;
      var avgHistory = [], nodeHistory = {}, nodeRows = {};

      function push(arr, v) { arr.push(v); if (arr.length > HISTORY) arr.shift(); }

      function renderSession() {
        kSession.num.textContent = polls ? fmt(Math.round(answered / polls * 100)) : '–';
        kSession.detail.textContent = answered + ' of ' + polls + ' since this page opened';
        kSession.tile.classList.toggle('is-warn', answered < polls);
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
            if (m.reachable) mc.pings.push(m.latencyMs); else { mc.down = true; mc.error = m.error; }
          });
        });

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

        order.forEach(function (id) {
          var mc = machines[id], row = nodeRow(id), now = mc.down ? null : mean(mc.pings);
          var hist = nodeHistory[id] || (nodeHistory[id] = []);
          push(hist, now);
          row.li.classList.toggle('is-down', mc.down);
          row.serves.textContent = mc.quorums.join('·');
          row.line.draw(hist);
          row.val.textContent = mc.down ? (mc.error || 'unreachable') : now + ' ms';
          row.val.title = mc.seen.length > 1 ? mc.seen.join(', ') : '';
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

      tick();
      pollTimer = setInterval(tick, POLL_MS);
      page.arkDispose = function () { clearInterval(pollTimer); };
      return page;
    }
  };
})();
