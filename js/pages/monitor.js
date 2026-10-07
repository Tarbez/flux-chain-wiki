/* /monitor: the fleet's real live health feed, polled from
   https://defxn.com/api/fleet-status (ops/fleet-status-api.mjs, running as a
   systemd service on bk2 and mk2 -- defxn.com DNS round-robins across both,
   so both carry the same Caddy route and service).

   Scope is deliberately narrow, matching the backend: HEALTH AND MEMBERSHIP
   ONLY. Every quorum's "online" state, every machine's "reachable" state, and
   every health-check latency on this page is real, fetched just now -- never
   simulated, carried over, or interpolated between polls. There is no live
   throughput number here: measuring real tx/s continuously would mean running
   synthetic transfer bursts against production-adjacent quorums on a
   schedule, a different and heavier decision this page does not make.
   Audited throughput lives on /stats as static, dated figures -- this page
   links there rather than guessing at a live number it cannot measure. */
(function () {
  'use strict';

  var API = 'https://defxn.com/api/fleet-status';
  var POLL_MS = 10000;
  var REQUEST_TIMEOUT_MS = 6000;

  function fmt(n) { return (n == null) ? '–' : n.toLocaleString('en-US'); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function href(key) { var entry = ArkUI.pageCatalog && ArkUI.pageCatalog[key]; return entry ? (ArkUI.route ? ArkUI.route.href(entry.path) : '#' + entry.path) : '#/' + key; }

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

  ArkUI.pageModules.monitor = {
    mount: function (host) {
      var page = el('section', 'ark-page task-page stats-page monitor-page');
      page.setAttribute('aria-labelledby', 'monitor-title');
      var shell = el('div', 'stats-shell'), bento = el('div', 'stats-bento');
      shell.appendChild(bento); page.appendChild(shell);

      // Hero
      var hero = tile('stats-hero monitor-hero');
      var top = el('div', 'monitor-hero-top');
      var chip = el('span', 'monitor-live-chip', 'Live');
      var live = el('span', 'monitor-live'); live.appendChild(el('i')); var clock = el('span', 'monitor-clock', '–'); live.appendChild(clock);
      top.appendChild(chip); top.appendChild(live); hero.appendChild(top);
      var h1 = el('h1', null, 'Mesh monitor'); h1.id = 'monitor-title'; hero.appendChild(h1);
      hero.appendChild(el('p', null, 'Real health and membership, polled directly from the fleet every ' + (POLL_MS / 1000) + 's. No throughput number here is live — see /stats for audited, dated figures.'));
      var actions = el('div', 'monitor-actions');
      var statsLink = el('a', 'stats-monitor-link', 'Audited throughput →'); statsLink.href = href('stats'); statsLink.dataset.sceneLink = 'stats';
      actions.appendChild(statsLink); hero.appendChild(actions);
      bento.appendChild(hero);

      // Lead KPI: quorums online
      var lead = tile('stats-kpi stats-kpi-lead monitor-lead', 'Quorums online');
      var leadValue = el('p', 'stats-kpi-value'); var leadNum = el('strong', null, '–'); leadValue.appendChild(leadNum); leadValue.appendChild(el('span', null, 'of 4'));
      lead.appendChild(leadValue);
      var leadDetail = el('p', 'stats-kpi-detail', 'Waiting for first poll…'); lead.appendChild(leadDetail);
      bento.appendChild(lead);

      function kpi(label, unit) {
        var t = tile('stats-kpi', label), v = el('p', 'stats-kpi-value'), n = el('strong', null, '–');
        v.appendChild(n); if (unit) v.appendChild(el('span', null, unit)); t.appendChild(v);
        var d = el('p', 'stats-kpi-detail'); t.appendChild(d); bento.appendChild(t);
        return { num: n, detail: d, tile: t };
      }
      var kMachines = kpi('Machines up', 'of 7');
      var kLatency = kpi('Health-check latency', 'ms');
      var kErrors = kpi('Poll errors', 'this session');

      // Quorums
      var qTile = tile('stats-span-6', 'Quorums');
      qTile.appendChild(el('h2', null, 'Four independent pools'));
      var qList = el('ol', 'monitor-quorums');
      qTile.appendChild(qList); bento.appendChild(qTile);

      // Nodes
      var nTile = tile('stats-span-6', 'Fleet machines · reachability');
      nTile.appendChild(el('h2', null, 'Seven machines, polled directly'));
      var nGrid = el('ul', 'monitor-nodes');
      nTile.appendChild(nGrid); bento.appendChild(nTile);

      host.appendChild(page);

      /* Rendering: every DOM write below reads directly from the just-fetched
         snapshot. Nothing is interpolated, remembered across polls, or
         generated -- a failed poll leaves the page showing its last REAL
         snapshot with an explicit staleness note, never a guessed value. */
      var pollTimer = null, lastGoodAt = null, consecutiveFailures = 0;

      function render(snapshot, failed) {
        if (failed) {
          consecutiveFailures += 1;
          leadDetail.textContent = lastGoodAt
            ? 'Live feed unreachable — showing last real poll from ' + lastGoodAt.toLocaleTimeString('en-GB', { hour12: false })
            : 'Live feed unreachable — no successful poll yet';
          chip.textContent = 'Stale'; chip.classList.add('is-stale');
          return;
        }
        consecutiveFailures = 0;
        lastGoodAt = new Date(snapshot.generatedAt);
        chip.textContent = 'Live'; chip.classList.remove('is-stale');
        clock.textContent = lastGoodAt.toLocaleTimeString('en-GB', { hour12: false });

        var s = snapshot.summary;
        leadNum.textContent = fmt(s.quorumsOnline);
        leadDetail.textContent = s.quorumsOnline === s.quorumsTotal
          ? 'All quorums reachable, just now'
          : (s.quorumsTotal - s.quorumsOnline) + ' of ' + s.quorumsTotal + ' quorums have an unreachable member';

        kMachines.num.textContent = fmt(s.machinesUp);
        kMachines.detail.textContent = s.machinesUp === s.machinesTotal ? 'All reachable' : (s.machinesTotal - s.machinesUp) + ' unreachable';
        kMachines.tile.classList.toggle('is-warn', s.machinesUp < s.machinesTotal);

        var allMembers = snapshot.quorums.reduce(function (acc, q) { return acc.concat(q.members); }, []);
        var reachable = allMembers.filter(function (m) { return m.reachable; });
        var avgLatency = reachable.length ? Math.round(reachable.reduce(function (t, m) { return t + m.latencyMs; }, 0) / reachable.length) : null;
        kLatency.num.textContent = fmt(avgLatency);
        kLatency.detail.textContent = 'Average "members" call, this poll';

        kErrors.num.textContent = fmt(snapshot.pollErrors);
        kErrors.detail.textContent = snapshot.pollErrors ? 'Backend poll failures since it started' : 'None since the backend started';
        kErrors.tile.classList.toggle('is-warn', snapshot.pollErrors > 0);

        qList.textContent = '';
        snapshot.quorums.forEach(function (q) {
          var li = el('li'); li.classList.toggle('is-down', !q.online);
          var head = el('p', 'monitor-q-head');
          var name = el('span', 'monitor-q-name'); name.appendChild(el('b', null, q.id));
          name.appendChild(el('small', null, q.members.map(function (m) { return m.id.replace(/^validator-/, ''); }).join(' + ')));
          var val = el('span', 'monitor-q-val', q.onlineCount + '/' + q.totalCount + ' up');
          head.appendChild(name); head.appendChild(val);
          li.appendChild(head);
          var detail = el('p', 'monitor-q-detail');
          detail.textContent = q.members.map(function (m) {
            return m.id.replace(/^validator-/, '') + ': ' + (m.reachable ? m.latencyMs + 'ms' : 'unreachable');
          }).join(' · ');
          li.appendChild(detail);
          qList.appendChild(li);
        });

        nGrid.textContent = '';
        var seen = {};
        allMembers.forEach(function (m) {
          if (seen[m.id]) return; seen[m.id] = true;
          var li = el('li'); li.classList.toggle('is-down', !m.reachable);
          var head = el('p', 'monitor-node-head');
          var st = el('span', 'monitor-node-state'); st.setAttribute('aria-hidden', 'true');
          head.appendChild(st); head.appendChild(el('b', null, m.id.replace(/^validator-/, 'flx-')));
          head.appendChild(el('span', 'monitor-node-pct', m.reachable ? m.latencyMs + 'ms' : '—'));
          li.appendChild(head);
          li.appendChild(el('small', null, m.reachable ? 'Reachable · members endpoint responded' : ('Unreachable' + (m.error ? ' · ' + m.error : ''))));
          nGrid.appendChild(li);
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
