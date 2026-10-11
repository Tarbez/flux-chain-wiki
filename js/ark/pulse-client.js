/* Shared, browser-safe access to the public chain-fleet pulse.
   Production uses the same-origin HTTPS proxy so CSP and mixed-content policy
   cannot diverge between /monitor and /stats. A local operator may still set
   window.ArkPulseEndpoint before either page loads. */
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

  window.ArkPulse = Object.freeze({ endpoint: DEFAULT_ENDPOINT, validate: validate, get: get });
})();
