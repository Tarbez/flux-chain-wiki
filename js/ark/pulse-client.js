/* Shared, browser-safe access to the public chain-fleet pulse.
   Production uses the same-origin HTTPS proxy so CSP and mixed-content policy
   cannot diverge between /monitor and /stats. A local operator may still set
   window.ArkPulseEndpoint before either page loads.

   The same client reads the four live stats feeds of docs/stats/LIVE-DATA-CONTRACT.md
   (2026-10-28): interactions(), capabilities(), resolvers() and runs(), each with its own
   validate. A field of the wrong type fails the whole answer; a field the fleet did not
   measure is null and stays null (absent is not 0). A host that cannot answer replies
   { ok: false, error, detail }; the thrown error carries status, code and detail, so the
   page can say why there is no reading. window.ArkStatsEndpointBase overrides the
   same-origin base (for example http://127.0.0.1:3438). */
(function () {
  'use strict';

  var DEFAULT_ENDPOINT = '/api/fleet-pulse';

  function finiteNumber(value, field) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new Error('Malformed pulse: ' + field + ' must be a non-negative number');
    }
    return value;
  }

  function validate(data) {
    if (!data || typeof data !== 'object' || !Array.isArray(data.nodes)) {
      throw new Error('Malformed pulse: nodes must be an array');
    }
    finiteNumber(data.measured_at_ms, 'measured_at_ms');
    finiteNumber(data.aggregate_qps, 'aggregate_qps');
    finiteNumber(data.total_entries, 'total_entries');
    finiteNumber(data.longest_ms, 'longest_ms');
    finiteNumber(data.errors, 'errors');
    data.nodes.forEach(function (node, index) {
      var at = 'nodes[' + index + ']';
      if (!node || typeof node !== 'object') throw new Error('Malformed pulse: ' + at + ' must be an object');
      if (typeof node.name !== 'string' || !node.name) throw new Error('Malformed pulse: ' + at + '.name must be text');
      if (typeof node.addr !== 'string' || !node.addr) throw new Error('Malformed pulse: ' + at + '.addr must be text');
      if (node.error != null && typeof node.error !== 'string') throw new Error('Malformed pulse: ' + at + '.error must be text or null');
      ['ok', 'total', 'elapsed_ms', 'qps'].forEach(function (field) { finiteNumber(node[field], at + '.' + field); });
    });
    /* Optional: added 2026-10-10, when fleet-pulse started aggregating
       each node's own ops-pulse daemon (swaps/transfers/stores, re-measured
       hourly on that node's own hardware). Optional rather than required
       so a stale cached payload or a transitional server does not fail
       validation outright — the page is expected to treat a missing
       `operations` block as "not reporting yet", never fabricate one. */
    if (data.operations != null) {
      var ops = data.operations;
      if (typeof ops !== 'object') throw new Error('Malformed pulse: operations must be an object');
      finiteNumber(ops.measured_at_ms, 'operations.measured_at_ms');
      finiteNumber(ops.nodes_reporting, 'operations.nodes_reporting');
      finiteNumber(ops.nodes_total, 'operations.nodes_total');
      finiteNumber(ops.parallel_swaps_per_second, 'operations.parallel_swaps_per_second');
      finiteNumber(ops.transfers_per_second, 'operations.transfers_per_second');
      finiteNumber(ops.stores_per_second, 'operations.stores_per_second');
      finiteNumber(ops.stakes_per_second, 'operations.stakes_per_second');
      finiteNumber(ops.cores, 'operations.cores');
      finiteNumber(ops.swaps_per_core, 'operations.swaps_per_core');
      if (!Array.isArray(ops.per_node)) throw new Error('Malformed pulse: operations.per_node must be an array');
      ops.per_node.forEach(function (n, i) {
        var at = 'operations.per_node[' + i + ']';
        if (!n || typeof n !== 'object') throw new Error('Malformed pulse: ' + at + ' must be an object');
        if (typeof n.node !== 'string' || !n.node) throw new Error('Malformed pulse: ' + at + '.node must be text');
        ['swaps_per_second', 'transfers_per_second', 'stores_per_second', 'stakes_per_second', 'cores'].forEach(function (field) {
          finiteNumber(n[field], at + '.' + field);
        });
      });
    }
    return data;
  }

  async function get(options) {
    options = options || {};
    var endpoint = window.ArkPulseEndpoint || DEFAULT_ENDPOINT;
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, options.timeoutMs || 6000);
    try {
      var response = await fetch(endpoint, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('HTTP ' + response.status + ' from ' + endpoint);
      return { endpoint: endpoint, data: validate(await response.json()) };
    } finally {
      clearTimeout(timer);
    }
  }

  /* ---- the live stats feeds (contract sections 1-5) ---------------------------------------- */
  function malformed(feed, field, rule) { return new Error('Malformed ' + feed + ': ' + field + ' must be ' + rule); }
  function object(feed, value, field) { if (!value || typeof value !== 'object' || Array.isArray(value)) throw malformed(feed, field, 'an object'); return value; }
  function count(feed, value, field) { if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw malformed(feed, field, 'a non-negative number'); return value; }
  function countOrNull(feed, value, field) { return value == null ? null : count(feed, value, field); }
  function text(feed, value, field) { if (typeof value !== 'string' || !value) throw malformed(feed, field, 'text'); return value; }
  function textOrNull(feed, value, field) { return value == null ? null : text(feed, value, field); }
  /* the window every live feed carries: when it was measured, over how long, and how often it refreshes */
  function windowOf(feed, data) {
    object(feed, data, 'the answer');
    count(feed, data.measured_at_ms, 'measured_at_ms');
    count(feed, data.interval_ms, 'interval_ms');
    if (data.window_ms != null) count(feed, data.window_ms, 'window_ms');
    if (data.node != null) text(feed, data.node, 'node');
  }
  /* targets a benchmark run could not drive: { id: { reason, run } } */
  function notBuilt(feed, data) {
    if (data.not_built == null) return;
    Object.keys(object(feed, data.not_built, 'not_built')).forEach(function (id) {
      var at = 'not_built.' + id, nb = object(feed, data.not_built[id], at);
      text(feed, nb.reason, at + '.reason'); text(feed, nb.run, at + '.run');
    });
  }

  function validateInteractions(data) {
    var F = 'interactions';
    windowOf(F, data);
    if (!Array.isArray(data.interactions) || data.interactions.length > 100) throw malformed(F, 'interactions', 'an array of at most 100');
    data.interactions.forEach(function (x, i) {
      var at = 'interactions[' + i + ']';
      object(F, x, at);
      count(F, x.at_ms, at + '.at_ms');
      textOrNull(F, x.capability, at + '.capability');
      text(F, x.resolver, at + '.resolver');
      countOrNull(F, x.latency_ms, at + '.latency_ms');
      text(F, x.node, at + '.node');
      if (typeof x.ok !== 'boolean') throw malformed(F, at + '.ok', 'true or false');
    });
    return data;
  }
  function validateCapabilities(data) {
    var F = 'capabilities';
    windowOf(F, data);
    count(F, data.window_ms, 'window_ms');
    textOrNull(F, data.runs_error, 'runs_error');
    notBuilt(F, data);
    Object.keys(object(F, data.capabilities, 'capabilities')).forEach(function (id) {
      var at = 'capabilities.' + id, c = object(F, data.capabilities[id], at);
      count(F, c.requests, at + '.requests'); count(F, c.errors, at + '.errors');
      ['per_second', 'p50_ms', 'p95_ms', 'tested_ceiling_per_second'].forEach(function (f) { countOrNull(F, c[f], at + '.' + f); });
      if (c.headroom_pct != null && (typeof c.headroom_pct !== 'number' || !Number.isFinite(c.headroom_pct))) throw malformed(F, at + '.headroom_pct', 'a number or null');
      textOrNull(F, c.tested_ceiling_run, at + '.tested_ceiling_run');
    });
    return data;
  }
  function validateResolvers(data) {
    var F = 'resolvers';
    windowOf(F, data);
    count(F, data.window_ms, 'window_ms');
    notBuilt(F, data);
    Object.keys(object(F, data.resolvers, 'resolvers')).forEach(function (id) {
      var at = 'resolvers.' + id, r = object(F, data.resolvers[id], at);
      count(F, r.batches, at + '.batches'); count(F, r.swaps, at + '.swaps');
      ['batch_ms_mean', 'send_ms_mean', 'busy_pct'].forEach(function (f) { countOrNull(F, r[f], at + '.' + f); });
    });
    return data;
  }
  var KINDS = ['weekly', 'stress', 'ceiling', 'audit'], TARGETS = ['cap', 'res', 'fleet'];
  function validateRuns(data) {
    var F = 'runs';
    object(F, data, 'the answer');
    count(F, data.measured_at_ms, 'measured_at_ms');
    countOrNull(F, data.interval_ms, 'interval_ms');
    countOrNull(F, data.next_run_at_ms, 'next_run_at_ms');
    if (!Array.isArray(data.runs)) throw malformed(F, 'runs', 'an array');
    data.runs.forEach(function (run, i) {
      var at = 'runs[' + i + ']';
      object(F, run, at);
      text(F, run.id, at + '.id');
      if (KINDS.indexOf(run.kind) < 0) throw malformed(F, at + '.kind', 'weekly, stress, ceiling or audit');
      count(F, run.started_at_ms, at + '.started_at_ms'); count(F, run.finished_at_ms, at + '.finished_at_ms');
      text(F, run.device, at + '.device'); text(F, run.conditions, at + '.conditions');
      textOrNull(F, run.source, at + '.source'); countOrNull(F, run.p95_ms, at + '.p95_ms');
      ['figures', 'ceiling', 'absent'].forEach(function (list) { if (!Array.isArray(run[list])) throw malformed(F, at + '.' + list, 'an array'); });
      function target(row, where) { if (TARGETS.indexOf(row.target) < 0) throw malformed(F, where + '.target', 'cap, res or fleet'); }
      run.figures.forEach(function (f, j) { var w = at + '.figures[' + j + ']'; object(F, f, w); target(f, w); text(F, f.name, w + '.name'); count(F, f.value, w + '.value'); text(F, f.unit, w + '.unit'); });
      run.ceiling.forEach(function (c, j) { var w = at + '.ceiling[' + j + ']'; object(F, c, w); target(c, w); count(F, c.connections, w + '.connections'); count(F, c.per_second, w + '.per_second'); });
      run.absent.forEach(function (a, j) { var w = at + '.absent[' + j + ']'; object(F, a, w); target(a, w); textOrNull(F, a.id, w + '.id'); text(F, a.reason, w + '.reason'); });
    });
    return data;
  }

  /* One read of one feed. A refusal from the host ({ ok: false, error, detail }) becomes an
     error that keeps the host's reason. */
  async function read(path, check, options) {
    options = options || {};
    var endpoint = (window.ArkStatsEndpointBase || '') + path;
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, options.timeoutMs || 6000);
    try {
      var response = await fetch(endpoint, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) {
        var body = null;
        try { body = await response.json(); } catch (_) { /* not JSON: the status says enough */ }
        var error = new Error('HTTP ' + response.status + ' from ' + endpoint + (body && body.detail ? ': ' + body.detail : ''));
        error.status = response.status; error.endpoint = endpoint;
        if (body && typeof body.error === 'string') error.code = body.error;
        if (body && typeof body.detail === 'string') error.detail = body.detail;
        throw error;
      }
      return { endpoint: endpoint, data: check(await response.json()) };
    } finally {
      clearTimeout(timer);
    }
  }
  /* A reading older than 2 x interval_ms is stale (contract, "No reading"). */
  function stale(data, now) { return !data || !(data.interval_ms > 0) || (now || Date.now()) - data.measured_at_ms > 2 * data.interval_ms; }

  var STATS = Object.freeze({
    interactions: '/api/fleet-interactions?limit=100',
    capabilities: '/api/fleet-capabilities',
    resolvers: '/api/fleet-resolvers',
    runs: '/api/fleet-runs'
  });

  window.ArkPulse = Object.freeze({
    endpoint: DEFAULT_ENDPOINT, validate: validate, get: get,
    stats: STATS, stale: stale,
    validateInteractions: validateInteractions, validateCapabilities: validateCapabilities, validateResolvers: validateResolvers, validateRuns: validateRuns,
    interactions: function (options) { return read(STATS.interactions, validateInteractions, options); },
    capabilities: function (options) { return read(STATS.capabilities, validateCapabilities, options); },
    resolvers: function (options) { return read(STATS.resolvers, validateResolvers, options); },
    runs: function (options) { return read(STATS.runs, validateRuns, options); }
  });
})();
