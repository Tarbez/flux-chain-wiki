/* Site-native, read-only view of the existing Flux Explorer API v1.
   No fixtures, protocol sockets, persisted credentials, or inferred peers. */
(function () {
  'use strict';
  var LOCAL_MINER = 'http://127.0.0.1:8766';
  var API_VERSION = 'explorer-api-v1';

  function node(tag, className, value) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (value != null) el.textContent = String(value);
    return el;
  }
  function safeString(value, fallback) {
    if (value == null || value === '') return fallback || '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
  function time(value) {
    var stamp = Date.parse(value || '');
    return Number.isFinite(stamp) ? new Date(stamp).toLocaleString() : 'Unknown';
  }
  function envelope(payload) {
    if (!payload || payload.apiVersion !== API_VERSION || !payload.data || typeof payload.data !== 'object') {
      throw new Error('The local Miner returned an incompatible Explorer response.');
    }
    return payload;
  }

  ArkUI.pageModules.explorer = {
    mount: function (host) {
      var page = node('section', 'ark-page learning-page mesh-explorer-page');
      page.dataset.arkPage = 'explorer';
      page.setAttribute('aria-labelledby', 'mesh-explorer-title');
      page.innerHTML = '<div class="mesh-explorer-shell">' +
        '<header class="mesh-explorer-header"><p class="learning-eyebrow">FLUX PROTOCOL / LOCAL MESH EXPLORER</p>' +
        '<h1 id="mesh-explorer-title">Inspect what the mesh reports.</h1>' +
        '<p class="mesh-explorer-deck">Query bounded, read-only records from a local Flux Miner. This is a live observation of one connected Miner, not a global chain height or authoritative membership list.</p>' +
        '<div class="mesh-explorer-status" role="status" aria-live="polite"><span class="mesh-explorer-status-dot" aria-hidden="true"></span><strong data-explorer-status>Not connected</strong><span data-explorer-message>Connect a local Miner to inspect current data.</span></div></header>' +
        '<section class="mesh-explorer-connect" aria-labelledby="mesh-connect-title"><div><p class="mesh-explorer-kicker">01 / CONNECTION</p><h2 id="mesh-connect-title">Local Miner</h2><p>Only <code>127.0.0.1:8766</code> is contacted. The Miner must allow this site origin for browser requests.</p></div>' +
        '<div class="mesh-explorer-connect-actions"><label for="mesh-operator-key">Operator key <span>(optional, memory only)</span></label><input id="mesh-operator-key" type="password" autocomplete="off" spellcheck="false" placeholder="Unlock operator-only sources">' +
        '<div class="mesh-explorer-buttons"><button type="button" data-explorer-connect>Connect to local Miner</button><button type="button" data-explorer-refresh disabled>Refresh now</button><button type="button" data-explorer-disconnect disabled>Disconnect</button></div></div></section>' +
        '<div class="mesh-explorer-metrics" aria-label="Current observation"><div><span>Connection</span><strong data-explorer-connection>Offline</strong></div><div><span>Sources</span><strong data-explorer-sources>—</strong></div><div><span>Observed</span><strong data-explorer-observed>—</strong></div><div><span>Coverage</span><strong data-explorer-coverage>—</strong></div></div>' +
        '<section class="mesh-explorer-data" aria-labelledby="mesh-data-title"><div class="mesh-explorer-section-head"><div><p class="mesh-explorer-kicker">02 / LIVE RECORDS</p><h2 id="mesh-data-title">Explore a source</h2></div><span>POLLED EVERY 15 SECONDS WHILE CONNECTED</span></div>' +
        '<p class="mesh-explorer-boundary">Source availability and verification are reported by the Miner. A returned record is not automatically proof of a production deployment.</p>' +
        '<div class="mesh-explorer-controls"><label for="mesh-source">Source<select id="mesh-source" disabled><option value="">Connect to load sources</option></select></label>' +
        '<form data-explorer-lookup><label for="mesh-record-id">Exact record ID<input id="mesh-record-id" type="search" autocomplete="off" placeholder="Paste an ID from this source" disabled></label><button type="submit" disabled>Inspect record</button></form></div>' +
        '<p class="mesh-explorer-result-message" data-explorer-result-message>Connect to see records. No sample data is substituted.</p>' +
        '<div class="mesh-explorer-records" data-explorer-records></div><div class="mesh-explorer-detail" data-explorer-detail hidden></div></section>' +
        '<details class="mesh-explorer-reference"><summary>03 / Operator topology and source context</summary><div class="mesh-explorer-reference-body"><p>Topology is operator-only. The view reports only nodes and edges returned by this Miner; absence here does not prove the wider mesh is empty.</p><div data-explorer-topology>Connect with an operator key to inspect topology.</div><p><a href="docs/operators/verification.md">How to verify an observation ↗</a> · <a href="docs/evidence/registry.md">Evidence registry ↗</a></p></div></details>' +
        '</div>';
      host.appendChild(page);
      if (page.querySelector('[data-explorer-connect]')) setup(page);
      return page;
    }
  };

  function setup(page) {
    var $ = function (selector) { return page.querySelector(selector); };
    var status = $('[data-explorer-status]');
    var message = $('[data-explorer-message]');
    var connect = $('[data-explorer-connect]');
    var refresh = $('[data-explorer-refresh]');
    var disconnect = $('[data-explorer-disconnect]');
    var key = $('#mesh-operator-key');
    var source = $('#mesh-source');
    var recordId = $('#mesh-record-id');
    var lookup = $('[data-explorer-lookup]');
    var resultMessage = $('[data-explorer-result-message]');
    var records = $('[data-explorer-records]');
    var detail = $('[data-explorer-detail]');
    var topology = $('[data-explorer-topology]');
    var connected = false, busy = false, timer = 0, generation = 0;
    var controllers = new Set(), sources = [], lastCursor = null;

    function setStatus(kind, title, text) {
      page.dataset.connection = kind;
      status.textContent = title;
      message.textContent = text;
      $('[data-explorer-connection]').textContent = kind === 'live' ? 'Local live' : kind === 'loading' ? 'Connecting' : 'Offline';
    }
    function setBusy(value) {
      busy = value;
      connect.disabled = value;
      refresh.disabled = value || !connected;
      disconnect.disabled = value || !connected;
    }
    function clearLive() {
      generation += 1;
      window.clearInterval(timer); timer = 0;
      controllers.forEach(function (controller) { controller.abort(); }); controllers.clear();
      connected = false; sources = []; lastCursor = null;
      source.replaceChildren(node('option', '', 'Connect to load sources')); source.disabled = true;
      recordId.value = ''; recordId.disabled = true;
      lookup.querySelector('button').disabled = true;
      records.replaceChildren(); detail.replaceChildren(); detail.hidden = true;
      topology.textContent = 'Connect with an operator key to inspect topology.';
      $('[data-explorer-sources]').textContent = '—';
      $('[data-explorer-observed]').textContent = '—';
      $('[data-explorer-coverage]').textContent = '—';
      resultMessage.textContent = 'Connect to see records. No sample data is substituted.';
      setBusy(false);
    }
    async function request(path, body) {
      var controller = new AbortController(); controllers.add(controller);
      var timeout = window.setTimeout(function () { controller.abort(); }, 10000);
      var headers = { accept: 'application/json' };
      if (body) headers['content-type'] = 'application/json';
      if (key.value.trim()) headers['x-api-key'] = key.value.trim();
      try {
        var response = await fetch(LOCAL_MINER + path, { method: body ? 'POST' : 'GET', headers: headers,
          body: body ? JSON.stringify(body) : undefined, signal: controller.signal, cache: 'no-store' });
        var payload = await response.json().catch(function () { return null; });
        if (!response.ok) throw new Error(payload && payload.error && payload.error.message || 'Miner returned HTTP ' + response.status + '.');
        return envelope(payload);
      } finally { window.clearTimeout(timeout); controllers.delete(controller); }
    }
    function errorText(error) {
      if (error && error.name === 'AbortError') return 'The local Miner did not respond within 10 seconds.';
      if (error instanceof TypeError) return 'Cannot reach the local Miner. Check that it is running and allows this site origin (CORS).';
      return error && error.message || 'The local Miner could not be read.';
    }
    function sourceAllowsQuery(item) {
      return item && (item.state === 'available' || item.state === 'partial') &&
        item.enumeration !== 'never' && item.enumeration !== 'exact_id_only' &&
        item.visibility !== 'excluded' && item.capabilities && item.capabilities.indexOf('query') >= 0;
    }
    function renderSources() {
      source.replaceChildren();
      sources.forEach(function (item) {
        var option = node('option', '', item.label + ' / ' + item.state + ' / ' + item.visibility);
        option.value = item.id; option.disabled = !sourceAllowsQuery(item); source.appendChild(option);
      });
      var first = sources.find(sourceAllowsQuery);
      if (!first) { source.replaceChildren(node('option', '', 'No enumerable source available')); source.disabled = true; }
      else { source.value = first.id; source.disabled = false; }
      recordId.disabled = !sources.length;
      lookup.querySelector('button').disabled = !sources.length;
    }
    function row(label, value) {
      var item = node('div', 'mesh-explorer-field');
      item.appendChild(node('dt', '', label)); item.appendChild(node('dd', '', safeString(value)));
      return item;
    }
    function renderDetail(payload) {
      detail.replaceChildren();
      var data = payload.data, record = data.record;
      if (!record || !record.id) throw new Error('Miner returned no record for that ID.');
      var back = node('button', 'mesh-explorer-back', '← Back to records'); back.type = 'button';
      back.addEventListener('click', function () { detail.hidden = true; records.hidden = false; back.blur(); source.focus(); });
      detail.appendChild(back);
      detail.appendChild(node('p', 'mesh-explorer-kicker', '03 / RECORD DETAIL'));
      detail.appendChild(node('h3', '', record.id));
      var facts = node('dl', 'mesh-explorer-fields');
      facts.appendChild(row('Source', record.sourceId));
      facts.appendChild(row('Kind', record.kind));
      facts.appendChild(row('Verification', record.verification && record.verification.state));
      facts.appendChild(row('Updated', time(record.updatedAt)));
      facts.appendChild(row('Provenance', record.provenance && record.provenance.protocol));
      Object.keys(data.safeDetail || record.fields || {}).slice(0,30).forEach(function (field) {
        facts.appendChild(row(field, (data.safeDetail || record.fields)[field]));
      });
      detail.appendChild(facts);
      if (Array.isArray(data.links) && data.links.length) {
        detail.appendChild(node('h4', '', 'Declared links'));
        data.links.slice(0,30).forEach(function (link) {
          detail.appendChild(node('p', 'mesh-explorer-link-fact', safeString(link.relation) + ' → ' + safeString(link.targetRecordId) +
            ' / ' + safeString(link.basis) + ' / ' + safeString(link.verification)));
        });
      }
      records.hidden = true; detail.hidden = false;
      detail.querySelector('h3').tabIndex = -1; detail.querySelector('h3').focus({ preventScroll: true });
    }
    async function inspect(id) {
      var selected = source.value;
      if (!selected || !id) return;
      resultMessage.textContent = 'Inspecting record…';
      try {
        var payload = await request('/explorer/v1/record', { sourceId: selected, recordId: id });
        if (!connected || !page.isConnected) return;
        renderDetail(payload); resultMessage.textContent = '';
      } catch (error) { if (page.isConnected) resultMessage.textContent = errorText(error); }
    }
    async function loadRecords() {
      var selected = source.value;
      if (!selected || !sourceAllowsQuery(sources.find(function (item) { return item.id === selected; }))) return;
      var token = generation;
      try {
        var payload = await request('/explorer/v1/query', { sourceId: selected, limit: 20 });
        if (token !== generation || source.value !== selected || !page.isConnected) return;
        var list = Array.isArray(payload.data.records) ? payload.data.records.slice(0,20) : [];
        lastCursor = payload.data.page && payload.data.page.nextCursor || null;
        records.replaceChildren(); detail.replaceChildren(); detail.hidden = true; records.hidden = false;
        list.forEach(function (record) {
          var button = node('button', 'mesh-explorer-record'); button.type = 'button';
          button.appendChild(node('span', 'mesh-explorer-record-kind', safeString(record.kind)));
          button.appendChild(node('strong', '', safeString(record.id)));
          button.appendChild(node('span', 'mesh-explorer-record-meta', safeString(record.verification && record.verification.state) + ' · ' + time(record.updatedAt)));
          button.addEventListener('click', function () { inspect(record.id); });
          records.appendChild(button);
        });
        resultMessage.textContent = list.length ? list.length + ' records from this Miner' + (lastCursor ? ' · more available through the Explorer API' : '') +
          (payload.partial ? ' · partial result' : '') : 'This source returned no records in this observation.';
      } catch (error) { if (token === generation && page.isConnected) { records.replaceChildren(); resultMessage.textContent = errorText(error); } }
    }
    async function loadTopology() {
      if (!key.value.trim()) { topology.textContent = 'Add an operator key and reconnect to inspect topology.'; return; }
      try {
        var payload = await request('/explorer/v1/topology');
        if (!connected || !page.isConnected) return;
        var nodes = Array.isArray(payload.data.nodes) ? payload.data.nodes : [];
        var edges = Array.isArray(payload.data.edges) ? payload.data.edges : [];
        topology.replaceChildren(node('p', '', nodes.length + ' returned nodes · ' + edges.length + ' returned edges' + (payload.partial ? ' · partial observation' : '')));
        var list = node('ul', 'mesh-explorer-topology-list');
        nodes.slice(0,30).forEach(function (item) { list.appendChild(node('li', '', safeString(item.label || item.id) + ' / ' + safeString(item.kind) + ' / ' + safeString(item.health))); });
        topology.appendChild(list);
      } catch (error) { if (page.isConnected) topology.textContent = errorText(error); }
    }
    async function observe() {
      if (!connected || busy || !page.isConnected) return;
      var token = generation;
      try {
        var health = await request('/explorer/v1/health');
        if (token !== generation || !page.isConnected) return;
        $('[data-explorer-observed]').textContent = time(health.generatedAt);
        $('[data-explorer-coverage]').textContent = health.partial ? 'Partial' : safeString(health.data.status, 'Reported');
        setStatus('live', 'Local live observation', 'Read from this Miner at ' + time(health.generatedAt) + (health.partial ? ' · partial coverage.' : '.'));
        await loadRecords();
      } catch (error) {
        if (token !== generation || !page.isConnected) return;
        clearLive(); setStatus('error', 'Connection lost', errorText(error));
      }
    }
    async function start() {
      clearLive(); setBusy(true); setStatus('loading', 'Connecting…', 'Requesting catalog and health from the local Miner.');
      var token = generation;
      try {
        var responses = await Promise.all([request('/explorer/v1/catalog'), request('/explorer/v1/health')]);
        if (token !== generation || !page.isConnected) return;
        var catalog = responses[0], health = responses[1];
        sources = Array.isArray(catalog.data.sources) ? catalog.data.sources : [];
        if (!sources.length) throw new Error('Miner returned no Explorer sources.');
        connected = true; renderSources();
        $('[data-explorer-sources]').textContent = String(sources.length);
        $('[data-explorer-observed]').textContent = time(health.generatedAt);
        $('[data-explorer-coverage]').textContent = catalog.partial || health.partial ? 'Partial' : safeString(health.data.status, 'Reported');
        setStatus('live', 'Local live observation', 'Read from this Miner at ' + time(health.generatedAt) + '.');
        setBusy(false);
        await Promise.all([loadRecords(), loadTopology()]);
        timer = window.setInterval(function () { if (document.visibilityState !== 'hidden') observe(); }, 15000);
      } catch (error) {
        if (token !== generation || !page.isConnected) return;
        clearLive(); setStatus('error', 'Not connected', errorText(error));
      }
    }
    connect.addEventListener('click', start);
    refresh.addEventListener('click', observe);
    disconnect.addEventListener('click', function () { clearLive(); key.value = ''; setStatus('offline', 'Disconnected', 'No live records are shown.'); });
    source.addEventListener('change', function () { generation += 1; loadRecords(); });
    lookup.addEventListener('submit', function (event) { event.preventDefault(); inspect(recordId.value.trim()); });
    page._explorerCleanup = function () { clearLive(); key.value = ''; };
  }

  if (ArkUI.pageRouter && ArkUI.pageRouter.onMount) ArkUI.pageRouter.onMount(function (el, page) {
    if (page === 'explorer') return el._explorerCleanup;
  });
})();
