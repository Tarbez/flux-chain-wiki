/* Shared, browser-safe access to the dense-wire chain-server fleet capacity
   feed (ops/chain-fleet-capacity-api.mjs). Sibling to chain-pulse-client.js
   (which reads ONE node's live segment state) -- this reads every node's
   own reachability, probed directly by IP. Same validation discipline: a
   malformed or missing field throws rather than lets the page render a
   guessed number. */
(function () {
  'use strict';

  var DEFAULT_ENDPOINT = '/api/chain-fleet-capacity';

  function validate(data) {
    if (!data || typeof data !== 'object') throw new Error('Malformed fleet capacity: not an object');
    if (!Array.isArray(data.nodes)) throw new Error('Malformed fleet capacity: nodes must be an array');
    data.nodes.forEach(function (n, i) {
      if (!n || typeof n !== 'object') throw new Error('Malformed fleet capacity: nodes[' + i + '] must be an object');
      if (typeof n.id !== 'string' || !n.id) throw new Error('Malformed fleet capacity: nodes[' + i + '].id must be text');
      if (n.role !== 'committee' && n.role !== 'peer') throw new Error('Malformed fleet capacity: nodes[' + i + '].role must be committee or peer');
      if (typeof n.reachable !== 'boolean') throw new Error('Malformed fleet capacity: nodes[' + i + '].reachable must be boolean');
      // peerCount/peerCountMax only exist when reachable; latencyMs/error are
      // allowed on either branch (a timeout still measures elapsed time).
      if (n.reachable) {
        if (typeof n.peerCount !== 'number' || !Number.isFinite(n.peerCount) || n.peerCount < 0) throw new Error('Malformed fleet capacity: nodes[' + i + '].peerCount must be a non-negative number');
      }
    });
    if (data.summary != null) {
      var s = data.summary;
      if (typeof s !== 'object') throw new Error('Malformed fleet capacity: summary must be an object or null');
      ['committeeUp', 'committeeTotal', 'committeeQuorum', 'peersUp', 'peersTotal'].forEach(function (f) {
        if (typeof s[f] !== 'number' || !Number.isFinite(s[f]) || s[f] < 0) throw new Error('Malformed fleet capacity: summary.' + f + ' must be a non-negative number');
      });
      if (typeof s.committeeHasQuorum !== 'boolean') throw new Error('Malformed fleet capacity: summary.committeeHasQuorum must be boolean');
    }
    return data;
  }

  async function get(options) {
    options = options || {};
    var endpoint = window.ArkChainFleetCapacityEndpoint || DEFAULT_ENDPOINT;
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

  window.ArkChainFleetCapacity = Object.freeze({ endpoint: DEFAULT_ENDPOINT, validate: validate, get: get });
})();
