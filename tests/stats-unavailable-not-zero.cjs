/* /stats: a live feed the page could not read is refused by name, never shown as 0 or a bare dash.

   Named regression (2026-10-19, docs/ux-audit/pages.md P9, pages-ux-b.md "/stats" P1): on the
   local harness host /api/chain-pulse and /api/chain-fleet-capacity answer 404 (they are served
   by ops/chain-pulse-api.mjs and ops/chain-fleet-capacity-api.mjs, not the static host). The
   "Chain · dense-wire" tiles then said "Chain reachable: no" -- a claim about the chain the page
   never measured -- and every other tile showed a dash. The "Fleet capacity" tiles showed dashes
   with a raw "HTTP 404 from ..." line. AGENTS.md: never report a capability that does not exist
   as 0; a refusal names the failure, the missing thing and the remedy.

   Since 2026-10-19 (W3-STATS) the tiles are Ark's stat: with no reading it says "No reading" and
   its reason, and the lead tile carries the whole refusal -- the failure and the missing thing,
   then the remedy on Ark's "Fix:" line. This drives the real page module (tests/lib/stats-mount.cjs)
   with the REAL chain clients over failing fetches and reads back the rendered tiles. */
'use strict';
const assert = require('node:assert/strict');
const { mount } = require('./lib/stats-mount.cjs');

function failing(chainError, capacityError) {
  return (url) => {
    const error = String(url).includes('chain-pulse') ? chainError : capacityError;
    if (error.status) return Promise.resolve({ ok: false, status: error.status, json: () => Promise.reject(new Error('no body')) });
    if (error.notJson) return Promise.resolve({ ok: true, status: 200, json: () => Promise.reject(Object.assign(new SyntaxError('Unexpected token <'), { name: 'SyntaxError' })) });
    return Promise.reject(new Error(error.message));
  };
}
function setup(chainError, capacityError, options) {
  const m = mount(Object.assign({ pulse: () => Promise.reject(new Error('HTTP 404 from /api/fleet-pulse')) }, options && options.noClients ? { noClients: true } : { fetch: failing(chainError, capacityError) }));
  m.w.AbortController = m.w.AbortController || class { constructor() { this.signal = {}; } abort() {} };
  return m;
}

/* A 0 figure: a 0 that is not part of a longer number ("404", "10" and "6-of-10" are not zeros). */
const zeroFigure = /(^|[^\d.,])0(?![\d.,])/;

(async () => {
  // ---- the harness host: both endpoints answer 404 ------------------------------------------
  let m = setup({ status: 404 }, { status: 404 });
  await m.flush();
  const chain = m.tiles('Chain-server, live');
  const capacity = m.tiles('Fleet capacity, live');
  assert.equal(chain.length, 6, 'the chain section keeps its six tiles');
  assert.equal(capacity.length, 4, 'the fleet capacity section keeps its four tiles');

  for (const [name, tiles, endpoint, server] of [
    ['Chain pulse', chain, '/api/chain-pulse', 'ops/chain-pulse-api.mjs'],
    ['Fleet capacity', capacity, '/api/chain-fleet-capacity', 'ops/chain-fleet-capacity-api.mjs']
  ]) {
    for (const tile of tiles) {
      assert.equal(tile.state, 'absent', name + ' tile has no reading: ' + tile.text);
      assert.equal(tile.value.trim(), 'No reading', name + ' tile says "No reading", not a number or a dash: ' + tile.text);
      assert(!zeroFigure.test(tile.text), name + ' tile shows no 0 figure: ' + tile.text);
      assert(!/(^|\s)[–-](\s|$)/.test(tile.text), name + ' tile shows no bare dash: ' + tile.text);
      assert(tile.text.includes(name + ' unavailable: ' + endpoint + ' answered 404'), name + ' tile names the failure: ' + tile.text);
    }
    const lead = tiles[0].text;
    assert(/Missing: .*this host does not serve it/.test(lead), name + ' lead tile names the missing thing: ' + lead);
    assert(lead.includes('Fix: run ' + server + ' behind ' + endpoint), name + ' lead tile names the remedy: ' + lead);
  }
  assert.notEqual(chain[0].value.trim(), 'no', '"Chain reachable" never claims "no" about a chain the page did not measure');
  assert(m.table('Every chain-server node, probed directly')[0][0].startsWith('Fleet capacity unavailable: /api/chain-fleet-capacity answered 404'), 'the capacity table names the failure');
  assert(m.table('Sovereign chains on this node, live')[0][0].startsWith('Chain pulse unavailable: /api/chain-pulse answered 404'), 'the sovereign-chain table names the pulse failure, not a CHAIN_LIST guess');
  m.dispose();

  // ---- other failures are named for what they are -------------------------------------------
  m = setup({ message: 'Failed to fetch' }, { notJson: true });
  await m.flush();
  const lead = m.tiles('Chain-server, live')[0].text;
  assert(lead.includes('Chain pulse unavailable: /api/chain-pulse could not be reached (Failed to fetch)'), 'a network failure is named: ' + lead);
  const capLead = m.tiles('Fleet capacity, live')[0].text;
  assert(capLead.includes('answered with something that is not JSON'), 'a page served in place of the API is named: ' + capLead);
  m.dispose();

  // ---- a route that forgot the client script ------------------------------------------------
  m = setup(null, null, { noClients: true });
  await m.flush();
  for (const tile of m.tiles('Chain-server, live').concat(m.tiles('Fleet capacity, live'))) {
    assert.equal(tile.value.trim(), 'No reading');
    assert(!zeroFigure.test(tile.text), 'no 0 figure without a client: ' + tile.text);
  }
  assert(m.tiles('Chain-server, live')[0].text.includes('Missing: js/ark/chain-pulse-client.js'), 'a missing client is named');
  m.dispose();

  console.log('PASS: /stats chain and fleet-capacity tiles refuse a failed feed by name (failure, missing thing, remedy), never as 0 or a bare dash.');
})().catch((e) => { console.error(e); process.exit(1); });
