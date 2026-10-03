/* Site-native, read-only view of the existing Flux Explorer API v1.
   No fixtures, protocol sockets, persisted credentials, or inferred peers. */
(function () {
  'use strict';
  var LOCAL_MINER = 'http://127.0.0.1:8766';
  /* Read straight from the public nodes by default; the browser talks to them directly (CORS), nothing in between. */
  var PUBLIC_BASE = 'https://public.defxn.com';
  var NODES = [['public', PUBLIC_BASE], ['st1', 'https://st1.defxn.com'], ['st2', 'https://st2.defxn.com'], ['st3', 'https://st3.defxn.com'], ['st4', 'https://st4.defxn.com']];
  /* Counts come from walking a source's own cursor pages (the API has no total). Capped so a big source can't hang the page. */
  var COUNTED = [['identities', 'Identities'], ['networks', 'Networks'], ['miners', 'Miners announcing'], ['publications', 'Publications'], ['documents', 'Documents']];
  var COUNT_PAGE = 100, COUNT_PAGES = 5;
  /* The node list is probed on connect and then on every sixth 10 s refresh: whether a node is up changes slowly. */
  var NODE_PROBE_EVERY = 6;
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
      throw new Error('That node returned an incompatible Explorer response.');
    }
    return payload;
  }

  ArkUI.pageModules.explorer = {
    mount: function (host) {
      var page = node('section', 'ark-page task-page mesh-explorer-page');
      page.dataset.arkPage = 'explorer';
      page.setAttribute('aria-labelledby', 'mesh-explorer-title');
      page.innerHTML = '<div class="mesh-explorer-shell">' +
        '<header class="mesh-explorer-header"><div class="mesh-explorer-title-group"><p class="learning-eyebrow">DEFXN / MESH OBSERVATORY</p>' +
        '<h1 id="mesh-explorer-title">Observe the mesh, one node at a time.</h1>' +
        '<p class="mesh-explorer-deck">A read-only view of what the selected Miner reports now. Counts, availability, and records belong to this observation; they are not a global chain height or an authoritative membership list.</p></div>' +
        '<aside class="mesh-explorer-live-panel" aria-label="Current observation"><div class="mesh-explorer-status" role="status" aria-live="polite"><span class="mesh-explorer-status-dot" aria-hidden="true"></span><div><strong data-explorer-status>Connecting…</strong><span data-explorer-message>Reading the public mesh.</span></div></div>' +
        '<div class="mesh-explorer-metrics"><div><span>Connection</span><strong data-explorer-connection>Offline</strong></div><div><span>Declared sources</span><strong data-explorer-sources>—</strong></div><div><span>Observed</span><strong data-explorer-observed>—</strong></div><div><span>Coverage</span><strong data-explorer-coverage>—</strong></div></div></aside></header>' +
        '<section class="mesh-explorer-connect" aria-label="Observation controls"><div class="mesh-explorer-connect-actions"><label for="mesh-origin"><span>OBSERVE FROM</span><select id="mesh-origin"><option value="public">Public mesh · public.defxn.com</option><option value="local">Local Miner · 127.0.0.1:8766</option></select></label>' +
        '<div class="mesh-explorer-buttons"><button type="button" data-explorer-connect>Reconnect</button><button type="button" data-explorer-refresh disabled>Refresh</button><button type="button" data-explorer-disconnect disabled>Disconnect</button></div>' +
        '<details class="mesh-operator-access"><summary>Operator access</summary><label for="mesh-operator-key">Optional key <span>memory only</span></label><input id="mesh-operator-key" type="password" autocomplete="off" spellcheck="false" placeholder="Unlock operator-only sources"></details></div></section>' +
        '<section class="mesh-observatory" aria-labelledby="mesh-glance-title"><div class="mesh-source-plane"><div class="mesh-explorer-section-head"><div><p class="mesh-explorer-kicker">01 / SOURCE FIELD</p><h2 id="mesh-glance-title">What this node exposes</h2></div><span data-explorer-glance-stamp>—</span></div>' +
        '<div class="mesh-explorer-core-stats" data-explorer-core-stats aria-live="polite"></div><div class="mesh-source-field" data-explorer-source-field><p>Waiting for the source catalog.</p></div></div>' +
        '<aside class="mesh-source-inspector" aria-labelledby="mesh-source-inspector-title"><p class="mesh-explorer-kicker">02 / INSPECTOR</p><h2 id="mesh-source-inspector-title" data-explorer-source-title>No source selected</h2><p data-explorer-source-summary>Connect to inspect the catalog returned by a Miner.</p>' +
        '<dl class="mesh-source-facts"><div><dt>Category</dt><dd data-explorer-source-category>—</dd></div><div><dt>State</dt><dd data-explorer-source-state>—</dd></div><div><dt>Access</dt><dd data-explorer-source-access>—</dd></div></dl>' +
        '<div class="mesh-explorer-controls"><label for="mesh-source">Selected source<select id="mesh-source" disabled><option value="">Connect to load sources</option></select></label>' +
        '<form data-explorer-lookup><label for="mesh-record-id">Exact record ID<input id="mesh-record-id" type="search" autocomplete="off" placeholder="Paste an exact record ID" disabled></label><button type="submit" disabled>Inspect</button></form></div>' +
        '<p class="mesh-explorer-boundary">A returned record is evidence from this Miner, not automatic proof of a production deployment.</p></aside></section>' +
        '<nav class="mesh-observatory-dock" aria-label="Observation layers"><details class="mesh-observatory-popover"><summary><span>03</span> Node pulse</summary><section class="mesh-node-strip" aria-labelledby="mesh-nodes-title"><div class="mesh-explorer-section-head"><div><p class="mesh-explorer-kicker">03 / NODE PULSE</p><h2 id="mesh-nodes-title">Public observation points</h2></div><span>REACHABILITY / RESPONSE</span></div><div class="mesh-explorer-nodes" data-explorer-nodes></div></section></details>' +
        '<details class="mesh-observatory-popover"><summary><span>04</span> Record ledger</summary><section class="mesh-explorer-data" aria-labelledby="mesh-data-title"><div class="mesh-explorer-section-head"><div><p class="mesh-explorer-kicker">04 / RECORD LEDGER</p><h2 id="mesh-data-title">Records from the selected source</h2></div><span>REFRESHES EVERY 10 SECONDS</span></div>' +
        '<p class="mesh-explorer-result-message" data-explorer-result-message>Records appear once the node answers. No sample data is substituted.</p>' +
        '<div class="mesh-explorer-records" data-explorer-records></div><div class="mesh-explorer-detail" data-explorer-detail hidden></div></section></details>' +
        '<details class="mesh-observatory-popover mesh-explorer-secondary"><summary><span>05</span> Observation details</summary><div class="mesh-explorer-stats" data-explorer-stats aria-live="polite"></div></details>' +
        '<details class="mesh-observatory-popover mesh-explorer-reference"><summary><span>06</span> Operator topology</summary><div class="mesh-explorer-reference-body"><p>Topology is operator-only. This view reports only nodes and edges returned by the selected Miner; absence here does not prove the wider mesh is empty.</p><div data-explorer-topology>Connect with an operator key to inspect topology.</div><p><a href="docs/operators/verification.md">How to verify an observation ↗</a> · <a href="docs/evidence/registry.md">Evidence registry ↗</a></p></div></details></nav>' +
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
    var originSelect = $('#mesh-origin');
    var stats = $('[data-explorer-stats]');
    var coreStats = $('[data-explorer-core-stats]');
    var sourceField = $('[data-explorer-source-field]');
    var nodesBox = $('[data-explorer-nodes]');
    var glanceStamp = $('[data-explorer-glance-stamp]');
    var glance = $('.mesh-observatory');
    function base() { return originSelect.value === 'local' ? LOCAL_MINER : PUBLIC_BASE; }
    function originName() { return originSelect.value === 'local' ? 'local Miner' : 'public mesh'; }
    var source = $('#mesh-source');
    var recordId = $('#mesh-record-id');
    var lookup = $('[data-explorer-lookup]');
    var resultMessage = $('[data-explorer-result-message]');
    var records = $('[data-explorer-records]');
    var detail = $('[data-explorer-detail]');
    var topology = $('[data-explorer-topology]');
    var popovers = Array.from(page.querySelectorAll('.mesh-observatory-popover'));
    popovers.forEach(function (popover) {
      popover.addEventListener('toggle', function () {
        if (!popover.open) return;
        popovers.forEach(function (other) { if (other !== popover) other.open = false; });
      });
    });
    page.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || !popovers.some(function (popover) { return popover.open; })) return;
      event.preventDefault(); event.stopPropagation();
      popovers.forEach(function (popover) { popover.open = false; });
    });
    var fallbackDetail = detail, selectedBox = null, selectedContents = [], boxMotion = null;
    function settleBox() { if(boxMotion){boxMotion.cancel();boxMotion=null;} }
    function animateBox(box, before) {
      settleBox();
      if(!before || !box.animate || (ArkUI.prefersReducedMotion && ArkUI.prefersReducedMotion()) || (ArkUI.state && ArkUI.state.get().paused)) return;
      var after=box.getBoundingClientRect();
      boxMotion=box.animate([
        {transform:'translate('+(before.left-after.left)+'px,'+(before.top-after.top)+'px)',width:before.width+'px',height:before.height+'px'},
        {transform:'translate(0,0)',width:after.width+'px',height:after.height+'px'}
      ],{duration:420,easing:'cubic-bezier(.22,1,.36,1)'});
      var current=boxMotion;current.finished.then(function(){if(boxMotion===current)boxMotion=null;},function(){});
    }
    function restoreRecord(focus, motion) {
      var box=selectedBox, before=box && box.getBoundingClientRect ? box.getBoundingClientRect() : null;
      settleBox();page.dataset.recordView='list';
      if(box){
        box.replaceChildren.apply(box,selectedContents);box.className='mesh-record-box';box.removeAttribute('aria-label');
        Array.from(records.children).forEach(function(item){item.hidden=false;item.inert=false;});
        selectedBox=null;selectedContents=[];detail=fallbackDetail;
        if(motion)animateBox(box,before);
        if(focus && box.querySelector('button'))box.querySelector('button').focus({preventScroll:true});
      } else if(focus)source.focus();
      fallbackDetail.hidden=true;fallbackDetail.replaceChildren();records.hidden=false;
    }
    var connected = false, busy = false, timer = 0, generation = 0, observed = 0;
    var controllers = new Set(), sources = [], sourceButtons = [], lastCursor = null, detailRequest=0, lastHealth = null;
    setStatus('offline','Connecting…','Reading the public mesh.');

    function setStatus(kind, title, text) {
      page.dataset.connection = kind;
      $('.mesh-explorer-metrics').hidden=kind!=='live';
      $('.mesh-explorer-data').hidden=kind!=='live';
      refresh.hidden=kind!=='live';disconnect.hidden=kind!=='live';
      /* The glance panel appears once there is something true to show: live counts, or (when the node is down) which nodes do answer. */
      glance.hidden=!(kind==='live'||kind==='error');
      status.textContent = title;
      message.textContent = text;
      $('[data-explorer-connection]').textContent = kind === 'live' ? (originSelect.value === 'local' ? 'Local live' : 'Public live') : kind === 'loading' ? 'Connecting' : 'Offline';
    }
    function setBusy(value) {
      busy = value;
      connect.disabled = value;
      refresh.disabled = value || !connected;
      disconnect.disabled = value || !connected;
    }
    function clearLive() {
      generation += 1; detailRequest+=1;restoreRecord(false,false);
      window.clearInterval(timer); timer = 0;
      controllers.forEach(function (controller) { controller.abort(); }); controllers.clear();
      connected = false; sources = []; lastCursor = null;
      source.replaceChildren(node('option', '', 'Connect to load sources')); source.disabled = true;
      recordId.value = ''; recordId.disabled = true;
      lookup.querySelector('button').disabled = true;
      records.replaceChildren(); detail.replaceChildren(); detail.hidden = true;
      topology.textContent = 'Connect with an operator key to inspect topology.';
      stats.replaceChildren(); stats.hidden = true; coreStats.replaceChildren();
      sourceField.replaceChildren(node('p', 'mesh-explorer-result-message', 'Waiting for the source catalog.'));
      nodesBox.replaceChildren(); glanceStamp.textContent = '—';
      $('[data-explorer-source-title]').textContent = 'No source selected';
      $('[data-explorer-source-summary]').textContent = 'Connect to inspect the catalog returned by a Miner.';
      $('[data-explorer-source-category]').textContent = '—';
      $('[data-explorer-source-state]').textContent = '—';
      $('[data-explorer-source-access]').textContent = '—';
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
      /* text/plain keeps a cross-origin POST a "simple" request, so the browser skips the preflight
         round trip. The node parses the body as JSON whatever the type says. */
      if (body) headers['content-type'] = 'text/plain;charset=UTF-8';
      if (key.value.trim()) headers['x-api-key'] = key.value.trim();
      try {
        var response = await fetch(base() + path, { method: body ? 'POST' : 'GET', headers: headers,
          body: body ? JSON.stringify(body) : undefined, signal: controller.signal, cache: 'no-store' });
        var payload = await response.json().catch(function () { return null; });
        if (!response.ok) throw new Error(payload && payload.error && payload.error.message || 'The node returned HTTP ' + response.status + '.');
        return envelope(payload);
      } finally { window.clearTimeout(timeout); controllers.delete(controller); }
    }
    function errorText(error) {
      if (error && error.name === 'AbortError') return 'The ' + originName() + ' did not respond within 10 seconds.';
      if (error instanceof TypeError) return 'Cannot reach the ' + originName() + '. ' + (originSelect.value === 'local' ? 'Check that it is running and allows this site origin (CORS).' : 'The node may be offline, or your network is blocking it.');
      return error && error.message || 'The ' + originName() + ' could not be read.';
    }
    function sourceAllowsQuery(item) {
      return item && (item.state === 'available' || item.state === 'partial') &&
        item.enumeration !== 'never' && item.enumeration !== 'exact_id_only' &&
        item.visibility !== 'excluded' && item.capabilities && item.capabilities.indexOf('query') >= 0;
    }
    function sourceAccess(item) {
      if (!item) return 'Unavailable';
      if (item.visibility === 'excluded') return 'Excluded';
      if (item.visibility === 'operator_only' || item.state === 'restricted') return 'Operator only';
      if (item.enumeration === 'exact_id_only' || item.visibility === 'exact_id_only') return 'Exact ID only';
      return sourceAllowsQuery(item) ? 'Public query' : safeString(item.visibility, 'Declared');
    }
    function inspectSource(item) {
      if (!item) return;
      $('[data-explorer-source-title]').textContent = safeString(item.label || item.id);
      $('[data-explorer-source-category]').textContent = safeString(item.category, 'other');
      $('[data-explorer-source-state]').textContent = safeString(item.state);
      $('[data-explorer-source-access]').textContent = sourceAccess(item);
      var summary = sourceAllowsQuery(item) ? 'This source can be enumerated from the selected Miner.'
        : item.enumeration === 'exact_id_only' || item.visibility === 'exact_id_only' ? 'Records remain private until you provide an exact record ID.'
        : item.visibility === 'operator_only' || item.state === 'restricted' ? 'This source requires operator access from the selected Miner.'
        : item.visibility === 'excluded' ? 'The Miner declares this source but excludes it from Explorer reads.'
        : 'The Miner declares this source without a public enumeration path.';
      $('[data-explorer-source-summary]').textContent = summary;
      sourceButtons.forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.sourceId === item.id)); });
    }
    function chooseSource(id, read) {
      var item = sources.find(function (candidate) { return candidate.id === id; });
      if (!item) return;
      source.value = item.id;
      inspectSource(item);
      if (!read) return;
      generation += 1; detailRequest += 1; restoreRecord(false, false); loadRecords();
    }
    function renderSources() {
      source.replaceChildren();
      sourceField.replaceChildren(); sourceButtons = [];
      var groups = {};
      sources.forEach(function (item) {
        var option = node('option', '', item.label + ' / ' + item.state + ' / ' + item.visibility);
        option.value = item.id; option.disabled = !sourceAllowsQuery(item); source.appendChild(option);
        var category = item.category || 'other';
        if (!groups[category]) groups[category] = [];
        groups[category].push(item);
      });
      Object.keys(groups).sort().forEach(function (category) {
        var group = node('section', 'mesh-source-group');
        group.appendChild(node('h3', '', category));
        var cells = node('div', 'mesh-source-cells');
        groups[category].forEach(function (item) {
          var button = node('button', 'mesh-source-cell'); button.type = 'button';
          button.dataset.sourceId = item.id;
          button.dataset.access = sourceAllowsQuery(item) ? 'public' : item.enumeration === 'exact_id_only' || item.visibility === 'exact_id_only' ? 'exact' : item.visibility === 'operator_only' || item.state === 'restricted' ? 'operator' : 'excluded';
          button.setAttribute('aria-label', safeString(item.label || item.id) + ' · ' + sourceAccess(item));
          button.appendChild(node('span', '', safeString(item.label || item.id)));
          button.appendChild(node('small', '', sourceAccess(item)));
          button.addEventListener('click', function () { chooseSource(item.id, true); });
          sourceButtons.push(button); cells.appendChild(button);
        });
        group.appendChild(cells); sourceField.appendChild(group);
      });
      var first = sources.find(sourceAllowsQuery);
      if (!first) { source.replaceChildren(node('option', '', 'No enumerable source available')); source.disabled = true; }
      else { source.value = first.id; source.disabled = false; inspectSource(first); }
      recordId.disabled = !sources.length;
      lookup.querySelector('button').disabled = !sources.length;
    }
    function row(label, value) {
      var item = node('div', 'mesh-explorer-field');
      item.appendChild(node('dt', '', label)); item.appendChild(node('dd', '', safeString(value)));
      return item;
    }
    function renderDetail(payload, origin) {
      var data = payload.data, record = data.record;
      if (!record || !record.id) throw new Error('Miner returned no record for that ID.');
      restoreRecord(false,false);
      var before=origin && origin.getBoundingClientRect ? origin.getBoundingClientRect() : null;
      if(origin && origin.isConnected){
        selectedBox=origin;selectedContents=Array.from(origin.childNodes || origin.children);
        detail=origin;detail.className='mesh-record-box mesh-explorer-detail';detail.setAttribute('aria-label','Record '+record.id);
        Array.from(records.children).forEach(function(item){item.hidden=item!==origin;item.inert=item!==origin;});
      }
      detail.replaceChildren();
      var back = node('button', 'mesh-explorer-back', 'Back to records'); back.type = 'button';back.dataset.icon='arrow-left';
      back.addEventListener('click', function () { restoreRecord(true,true); });
      detail.appendChild(back);
      detail.appendChild(node('p', 'mesh-explorer-kicker', '04 / RECORD DETAIL'));
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
      page.dataset.recordView='detail';records.hidden = !selectedBox; detail.hidden = false;
      if(ArkUI.decorateActionIcons)ArkUI.decorateActionIcons(detail);
      if(selectedBox)animateBox(selectedBox,before);
      detail.querySelector('h3').tabIndex = -1; detail.querySelector('h3').focus({ preventScroll: true });
    }
    /* The scope each listed record was read under, so inspecting it asks the same question. */
    var recordScopes = {};
    async function inspect(id, origin) {
      var selected = source.value, token=generation, requestedDetail=++detailRequest;
      if (!selected || !id) return;
      resultMessage.textContent = 'Inspecting record…';
      try {
        var payload = await request('/explorer/v1/record', { sourceId: selected, recordId: id, scope: recordScopes[id] });
        if (token!==generation||requestedDetail!==detailRequest||source.value!==selected||!connected || !page.isConnected) return;
        if(!payload.data.record || payload.data.record.id!==id || payload.data.record.sourceId!==selected) throw new Error('The Miner returned a different record or source. The requested record is not displayed.');
        renderDetail(payload, origin); resultMessage.textContent = '';
      } catch (error) { if (token===generation&&requestedDetail===detailRequest&&page.isConnected) resultMessage.textContent = errorText(error); }
    }
    async function loadRecords() {
      var selected = source.value;
      var selectedSource = sources.find(function (item) { return item.id === selected; });
      if (!selected || !selectedSource) return;
      if (!sourceAllowsQuery(selectedSource)) {
        records.replaceChildren(); detail.replaceChildren(); detail.hidden = true; records.hidden = false;
        resultMessage.textContent = selectedSource.enumeration === 'exact_id_only' || selectedSource.visibility === 'exact_id_only'
          ? 'This source is exact-ID only. Paste a record ID in the inspector to request it.'
          : selectedSource.visibility === 'operator_only' || selectedSource.state === 'restricted'
            ? 'This source requires operator access from the selected Miner.'
            : 'This source is declared but cannot be enumerated in this observation.';
        return;
      }
      var token = generation;
      try {
        var scopes = selected === 'miners' ? await minerScopes() : [undefined], payload = null, list = [];
        lastCursor = null;
        for (var s = 0; s < scopes.length && list.length < 20; s++) {
          payload = await request('/explorer/v1/query', { sourceId: selected, scope: scopes[s], limit: 20 });
          if (token !== generation || source.value !== selected || !page.isConnected) return;
          var got = Array.isArray(payload.data.records) ? payload.data.records : [];
          got.forEach(function (record) { recordScopes[record.id] = scopes[s]; });
          list = list.concat(got);
          lastCursor = lastCursor || payload.data.page && payload.data.page.nextCursor || null;
        }
        if (token !== generation || source.value !== selected || !page.isConnected) return;
        list = list.slice(0,20); payload = payload || { partial: false };
        if(page.dataset.recordView!=='detail'){
        records.replaceChildren();detail.replaceChildren();detail.hidden=true;records.hidden=false;
        list.forEach(function (record) {
          var box=node('article','mesh-record-box');
          var button = node('button', 'mesh-explorer-record'); button.type = 'button';
          button.appendChild(node('span', 'mesh-explorer-record-kind', safeString(record.kind)));
          button.appendChild(node('strong', '', safeString(record.id)));
          button.appendChild(node('span', 'mesh-explorer-record-meta', safeString(record.verification && record.verification.state) + ' · ' + time(record.updatedAt)));
          button.addEventListener('click', function () { inspect(record.id, box); });
          box.appendChild(button);records.appendChild(box);
        });
        }
        resultMessage.textContent = list.length ? list.length + ' records from this Miner' + (lastCursor ? ' · more available through the Explorer API' : '') +
          (payload.partial ? ' · partial result' : '') : 'This source returned no records in this observation.';
      } catch (error) { if (token === generation && page.isConnected) { if(page.dataset.recordView!=='detail')records.replaceChildren(); resultMessage.textContent = errorText(error); } }
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
    /* Miner records live under their network, and an unscoped query reads only the default network.
       So the scopes come from the node's own network list, never from a name written here. */
    async function minerScopes() {
      var payload = await request('/explorer/v1/query', { sourceId: 'networks', limit: COUNT_PAGE });
      var list = Array.isArray(payload.data.records) ? payload.data.records : [];
      return list.map(function (record) { return record.fields && record.fields.networkId || record.id; })
        .filter(Boolean).map(function (networkId) { return { networkId: networkId }; });
    }
    /* A source's size, counted by following its own cursor pages. Reports N+ when the cap stops the walk.
       `each` sees every record on the way, so a second figure can come out of the same walk. */
    async function countSource(id, token, each) {
      var total = 0, cursor = '';
      for (var i = 0; i < COUNT_PAGES; i++) {
        var payload = await request('/explorer/v1/query', { sourceId: id, limit: COUNT_PAGE, cursor: cursor || undefined });
        if (token !== generation || !page.isConnected) return null;
        var list = Array.isArray(payload.data.records) ? payload.data.records : [], got = list.length;
        if (each) list.forEach(each);
        total += got;
        cursor = payload.data.page && payload.data.page.nextCursor || '';
        if (!cursor || !got) return { count: total, capped: false };
      }
      return { count: total, capped: true };
    }
    function statCard(label, value, note) {
      var card = node('div', 'mesh-explorer-stat');
      card.appendChild(node('span', '', label)); card.appendChild(node('strong', '', value));
      if (note) card.appendChild(node('small', '', note));
      return card;
    }
    /* The node's own one-request summary. A plain GET, so the browser sends no preflight.
       null when the node is older and has no such route: the caller then walks each source itself. */
    async function readSummary(counted) {
      try {
        var payload = await request('/explorer/v1/summary?sources=' + counted.map(function (entry) { return entry[0]; }).join(','));
        return payload.data && payload.data.counts ? payload : null;
      } catch (error) { return null; }
    }
    /* One result per counted source: {count, capped}, undefined for "could not be read",
       null for "this source cannot be counted" (no card is drawn for it). */
    async function walkCounts(counted, token) {
      /* Each network record already carries its own miner count, so one walk answers both cards.
         Asking per network instead cost one more round trip per network, one after another. */
      var miners = 0;
      var networks = countSource('networks', token, function (record) {
        var raw = record.fields && record.fields.sourceRecord || {};
        miners += Number(raw.activeMinerCount != null ? raw.activeMinerCount : raw.minerCount) || 0;
      });
      networks.catch(function () {});
      return Promise.all(counted.map(function (entry) {
        var pending = entry[0] === 'networks' ? networks
          : entry[0] === 'miners' ? networks.then(function (walk) { return walk && { count: miners, capped: walk.capped }; })
          : countSource(entry[0], token);
        return pending.catch(function () { return undefined; });
      }));
    }
    /* Draws the glance. Resolves to the health the summary carried, or null when the walk fallback ran. */
    async function loadGlance(token) {
      var started = Date.now();
      var cards = [], coreCards = [];
      var counted = COUNTED.filter(function (entry) {
        var item = sources.find(function (candidate) { return candidate.id === entry[0]; });
        return sourceAllowsQuery(item) && item.enumeration !== 'search';
      });
      var summary = counted.length ? await readSummary(counted) : null;
      if (token !== generation || !page.isConnected) return null;
      var cap = summary && summary.data.walk ? summary.data.walk.pageSize * summary.data.walk.maxPages : COUNT_PAGE * COUNT_PAGES;
      var results = summary ? counted.map(function (entry) {
        var figure = summary.data.counts[entry[0]];
        if (!figure || figure.state === 'unavailable') return undefined;
        return figure.state === 'counted' ? { count: figure.count, capped: figure.capped } : null;
      }) : await walkCounts(counted, token);
      if (token !== generation || !page.isConnected) return null;
      var health = summary ? { generatedAt: summary.generatedAt, partial: summary.partial, data: { status: summary.data.health && summary.data.health.status } } : null;
      if (health) lastHealth = health;
      counted.forEach(function (entry, index) {
        var result = results[index];
        if (result === null) return;
        var value = result ? String(result.count) + (result.capped ? '+' : '') : 'Unavailable';
        var note = result ? (result.capped ? 'first ' + cap + ' counted' : 'counted from the node') : 'this node could not be read';
        cards.push(statCard(entry[1], value, note));
        if (entry[0] === 'networks' || entry[0] === 'miners') coreCards.push(statCard(entry[1], value, note));
      });
      /* Accounts are exact-ID lookups only. The API refuses to list them, so a wallet total cannot be read here. */
      cards.push(statCard('Wallets', 'Not public', 'accounts are looked up by exact ID, never listed'));
      var readable = sources.filter(sourceAllowsQuery).length;
      cards.push(statCard('Sources readable', readable + ' of ' + sources.length, 'the rest are private or operator-only'));
      coreCards.push(statCard('Public sources', readable + ' / ' + sources.length, 'readable from this node'));
      var categories = {};
      sources.filter(sourceAllowsQuery).forEach(function (item) { categories[item.category || 'other'] = true; });
      cards.push(statCard('Record types', String(Object.keys(categories).length), Object.keys(categories).sort().join(' · ') || 'none'));
      cards.push(statCard('Node health', safeString(lastHealth && lastHealth.data && lastHealth.data.status, 'Unknown'), 'API ' + API_VERSION));
      coreCards.push(statCard('Node health', safeString(lastHealth && lastHealth.data && lastHealth.data.status, 'Unknown'), 'reported by the node'));
      cards.push(statCard('Counted in', (Date.now() - started) + ' ms', 'live from ' + originName()));
      stats.replaceChildren.apply(stats, cards); stats.hidden = false;
      coreStats.replaceChildren.apply(coreStats, coreCards);
      glanceStamp.textContent = 'UPDATED ' + new Date().toLocaleTimeString();
      return health;
    }
    function nodeRow(name, host, result) {
      var row = node('div', 'mesh-explorer-node'); row.dataset.state = result.up ? 'up' : 'down';
      row.appendChild(node('strong', '', name === 'public' ? 'public.defxn.com' : name + '.defxn.com'));
      row.appendChild(node('span', 'mesh-explorer-node-state', result.up ? 'Reachable' : 'Unreachable'));
      row.appendChild(node('span', '', result.up ? result.ms + ' ms · ' + result.detail : result.detail));
      return row;
    }
    async function probe(entry, token) {
      var controller = new AbortController(); controllers.add(controller);
      var timeout = window.setTimeout(function () { controller.abort(); }, 6000), started = Date.now();
      try {
        var response = await fetch(entry[1] + '/explorer/v1/health', { headers: { accept: 'application/json' }, signal: controller.signal, cache: 'no-store' });
        var payload = await response.json().catch(function () { return null; });
        if (!response.ok || !payload || payload.apiVersion !== API_VERSION) return { up: false, detail: 'answered, but not as a DEFXN Miner (HTTP ' + response.status + ')' };
        return { up: true, ms: Date.now() - started, detail: safeString(payload.data && payload.data.status, 'reported') };
      } catch (error) {
        return { up: false, detail: error && error.name === 'AbortError' ? 'no answer in 6 seconds' : 'cannot be reached' };
      } finally { window.clearTimeout(timeout); controllers.delete(controller); }
    }
    async function loadNodes(token) {
      if (originSelect.value === 'local') { nodesBox.replaceChildren(node('p', 'mesh-explorer-result-message', 'Reading your local Miner only. Switch to the public mesh to see the defxn nodes.')); return; }
      var results = await Promise.all(NODES.map(function (entry) { return probe(entry, token); }));
      if (token !== generation || !page.isConnected) return;
      nodesBox.replaceChildren.apply(nodesBox, NODES.map(function (entry, index) { return nodeRow(entry[0], entry[1], results[index]); }));
    }
    async function observe() {
      if (!connected || busy || !page.isConnected) return;
      var token = generation, tick = ++observed;
      try {
        /* Nothing waits on a health call first: the summary carries the node's status, and the
           record list and the glance start together. Only a node without a summary is asked separately. */
        await Promise.all([loadRecords(), loadGlance(token).then(async function (health) {
          if (!health) { health = await request('/explorer/v1/health'); lastHealth = health; }
          if (token !== generation || !page.isConnected) return;
          $('[data-explorer-observed]').textContent = time(health.generatedAt);
          $('[data-explorer-coverage]').textContent = health.partial ? 'Partial' : safeString(health.data.status, 'Reported');
          setStatus('live', (originSelect.value === 'local' ? 'Local' : 'Public') + ' live observation', 'Read from the ' + originName() + ' at ' + time(health.generatedAt) + (health.partial ? ' · partial coverage.' : '.'));
        }), tick % NODE_PROBE_EVERY === 0 ? loadNodes(token) : null]);
      } catch (error) {
        if (token !== generation || !page.isConnected) return;
        clearLive(); setStatus('error', 'Connection lost', errorText(error));
      }
    }
    async function start() {
      clearLive(); setBusy(true); setStatus('loading', 'Connecting…', 'Requesting catalog and health from the ' + originName() + '.');
      var token = generation;
      try {
        var responses = await Promise.all([request('/explorer/v1/catalog'), request('/explorer/v1/health')]);
        if (token !== generation || !page.isConnected) return;
        var catalog = responses[0], health = responses[1];
        lastHealth = health;
        sources = Array.isArray(catalog.data.sources) ? catalog.data.sources : [];
        if (!sources.length) throw new Error('That node returned no Explorer sources.');
        connected = true; renderSources();
        $('[data-explorer-sources]').textContent = String(sources.length);
        $('[data-explorer-observed]').textContent = time(health.generatedAt);
        $('[data-explorer-coverage]').textContent = catalog.partial || health.partial ? 'Partial' : safeString(health.data.status, 'Reported');
        setStatus('live', (originSelect.value === 'local' ? 'Local' : 'Public') + ' live observation', 'Read from the ' + originName() + ' at ' + time(health.generatedAt) + '.');
        setBusy(false);
        await Promise.all([loadRecords(), loadTopology(), loadGlance(token), loadNodes(token)]);
        timer = window.setInterval(function () { if (document.visibilityState !== 'hidden') observe(); }, 10000);
      } catch (error) {
        if (token !== generation || !page.isConnected) return;
        clearLive(); setStatus('error', 'Not connected', errorText(error));
        loadNodes(generation);
      }
    }
    connect.addEventListener('click', start);
    originSelect.addEventListener('change', start);
    refresh.addEventListener('click', observe);
    disconnect.addEventListener('click', function () { clearLive(); key.value = ''; setStatus('offline', 'Disconnected', 'No live records are shown.'); });
    source.addEventListener('change', function () { chooseSource(source.value, true); });
    lookup.addEventListener('submit', function (event) { event.preventDefault(); inspect(recordId.value.trim()); });
    page._explorerCleanup = function () { clearLive(); key.value = ''; };
    /* Start reading as soon as the page is on screen; no button press needed for the public mesh. */
    window.setTimeout(function () { if (page.isConnected && !connected && !busy) start(); }, 0);
  }

  if (ArkUI.pageRouter && ArkUI.pageRouter.onMount) ArkUI.pageRouter.onMount(function (el, page) {
    if (page === 'explorer') return el._explorerCleanup;
  });
})();
