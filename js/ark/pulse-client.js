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
