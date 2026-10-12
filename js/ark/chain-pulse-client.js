/* Shared, browser-safe access to the dense-wire chain pulse (ops/chain-pulse-api.mjs).
   Sibling to pulse-client.js (ArkPulse, the OLDER ark-miner-cli quorum feed) --
   this reads the NEWER chain-server mesh behind nodes.defxn.com instead.
   Same validation discipline: a malformed or missing field throws rather than
   lets the page render a guessed number. */
(function () {
  'use strict';

  var DEFAULT_ENDPOINT = '/api/chain-pulse';

  function validate(data) {
    if (!data || typeof data !== 'object') throw new Error('Malformed chain pulse: not an object');
    if (typeof data.reachable !== 'boolean') throw new Error('Malformed chain pulse: reachable must be boolean');
    if (data.segment != null) {
      var s = data.segment;
      if (typeof s !== 'object') throw new Error('Malformed chain pulse: segment must be an object or null');
      ['root'].forEach(function (f) { if (typeof s[f] !== 'string' || !s[f]) throw new Error('Malformed chain pulse: segment.' + f + ' must be text'); });
      ['seq', 'linesCount', 'have', 'need'].forEach(function (f) {
        if (typeof s[f] !== 'number' || !Number.isFinite(s[f]) || s[f] < 0) throw new Error('Malformed chain pulse: segment.' + f + ' must be a non-negative number');
      });
    }
    // committeeLiveness and supporterCount are allowed to be null -- that is
    // the honest "not built yet" state, not something to validate away.
    if (data.committeeLiveness != null && typeof data.committeeLiveness !== 'number') throw new Error('Malformed chain pulse: committeeLiveness must be a number or null');
    if (data.supporterCount != null && typeof data.supporterCount !== 'number') throw new Error('Malformed chain pulse: supporterCount must be a number or null');
    if (data.providerCount != null && typeof data.providerCount !== 'number') throw new Error('Malformed chain pulse: providerCount must be a number or null');
    // sovereignChains is allowed to be null (CHAIN_LIST unreachable/not
    // deployed) or [] (a real, measured zero -- no chain launched here).
    if (data.sovereignChains != null) {
      if (!Array.isArray(data.sovereignChains)) throw new Error('Malformed chain pulse: sovereignChains must be an array or null');
      data.sovereignChains.forEach(function (c, i) {
        if (!c || typeof c !== 'object') throw new Error('Malformed chain pulse: sovereignChains[' + i + '] must be an object');
        ['chainId', 'tokenSymbol'].forEach(function (f) {
          if (typeof c[f] !== 'string' || !c[f]) throw new Error('Malformed chain pulse: sovereignChains[' + i + '].' + f + ' must be text');
        });
        ['totalSupply', 'distributedSupply', 'computeRewardSupply'].forEach(function (f) {
          if (typeof c[f] !== 'number' || !Number.isFinite(c[f]) || c[f] < 0) throw new Error('Malformed chain pulse: sovereignChains[' + i + '].' + f + ' must be a non-negative number');
        });
        // computeCredited/computeReserveRemaining/treasuryBalance are
        // allowed to be null -- a per-chain balance read can fail (e.g.
        // this replica never minted a chain CHAIN_LIST still lists)
        // without that failing the whole response.
        ['computeCredited', 'computeReserveRemaining', 'treasuryBalance'].forEach(function (f) {
          if (c[f] != null && typeof c[f] !== 'number') throw new Error('Malformed chain pulse: sovereignChains[' + i + '].' + f + ' must be a number or null');
        });
        // leaderboard is allowed to be null (this replica never minted the
        // chain) or an array (a real, measured ranking, possibly empty).
        if (c.leaderboard != null) {
          if (!Array.isArray(c.leaderboard)) throw new Error('Malformed chain pulse: sovereignChains[' + i + '].leaderboard must be an array or null');
          c.leaderboard.forEach(function (row, j) {
            if (!row || typeof row !== 'object' || typeof row.holder !== 'string' || !row.holder) {
              throw new Error('Malformed chain pulse: sovereignChains[' + i + '].leaderboard[' + j + '].holder must be text');
            }
            if (typeof row.amount !== 'number' || !Number.isFinite(row.amount) || row.amount < 0) {
              throw new Error('Malformed chain pulse: sovereignChains[' + i + '].leaderboard[' + j + '].amount must be a non-negative number');
            }
          });
        }
      });
    }
    return data;
  }

  async function get(options) {
    options = options || {};
    var endpoint = window.ArkChainPulseEndpoint || DEFAULT_ENDPOINT;
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

  window.ArkChainPulse = Object.freeze({ endpoint: DEFAULT_ENDPOINT, validate: validate, get: get });
})();
