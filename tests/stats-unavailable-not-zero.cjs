/* /stats: a live feed the page could not read is refused by name, never shown as 0 or a bare dash.

   Named regression (2026-10-19, docs/ux-audit/pages.md P9, pages-ux-b.md "/stats" P1): on the
   local harness host /api/chain-pulse and /api/chain-fleet-capacity answer 404 (they are served
   by ops/chain-pulse-api.mjs and ops/chain-fleet-capacity-api.mjs, not the static host). The
   "Chain · dense-wire" tiles then said "Chain reachable: no" -- a claim about the chain the page
   never measured -- and every other tile showed a dash. The "Fleet capacity" tiles showed dashes
   with a raw "HTTP 404 from ..." line. AGENTS.md: never report a capability that does not exist
   as 0; a refusal names the failure, the missing thing and the remedy.

   This drives the real page module with failing feeds and reads back the rendered tiles. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Node {
  constructor(tag) { this.tagName = tag; this.className = ''; this.children = []; this.dataset = {}; this.attrs = {}; this.listeners = {}; this.style = { setProperty() {} }; this._text = ''; this.hidden = false; }
  appendChild(c) { this.children.push(c); c.parent = this; return c; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
  set textContent(v) { this._text = v == null ? '' : String(v); this.children = []; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(' '); }
  all() { return [this].concat(...this.children.map((c) => c.all())); }
  find(cls) { return this.all().filter((n) => n.className.split(' ').includes(cls)); }
}

function mountWith(chainError, capacityError, options) {
  const context = vm.createContext({
    document: { hidden: false, createElement: (t) => new Node(t), addEventListener() {}, removeEventListener() {} },
    console, Date, Math, Number, String, Promise, encodeURIComponent,
    setTimeout() { return {}; }, clearTimeout() {}, setInterval() { return {}; }, clearInterval() {},
    ArkUI: { pageModules: {}, pageCatalog: {}, route: { href: (p) => '#' + p } }
  });
  context.window = context;
  context.ArkPulse = { get: () => Promise.reject(new Error('HTTP 404 from /api/fleet-pulse')) };
  for (const file of ['js/ark/dash-kit.js', 'js/content/stats-highlights.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  if (!(options && options.noClients)) {
    // The real clients, over a fetch that fails the way the harness host does.
    context.fetch = (url) => {
      const error = url === '/api/chain-pulse' ? chainError : capacityError;
      if (error.status) return Promise.resolve({ ok: false, status: error.status, json: () => Promise.reject(new Error('no body')) });
      if (error.notJson) return Promise.resolve({ ok: true, status: 200, json: () => Promise.reject(Object.assign(new SyntaxError('Unexpected token <'), { name: 'SyntaxError' })) });
      return Promise.reject(new Error(error.message));
    };
    context.AbortController = class { constructor() { this.signal = {}; } abort() {} };
    for (const file of ['js/ark/chain-pulse-client.js', 'js/ark/chain-fleet-capacity-client.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  }
  vm.runInContext(fs.readFileSync('js/pages/stats.js', 'utf8'), context);
  return context.ArkUI.pageModules.stats.mount(new Node('main'));
}

const flush = () => new Promise((r) => setImmediate(r));

/* The tiles a section head introduces: every dash-stat after that head up to the next head. */
function tilesUnder(page, heading) {
  const order = page.all().filter((n) => n.className.split(' ').includes('dash-stat') || /dash-section/.test(n.className) || n.tagName === 'h2');
  const start = order.findIndex((n) => n.textContent.startsWith(heading));
  assert(start >= 0, 'section "' + heading + '" is on the page');
  const tiles = [];
  for (const n of order.slice(start + 1)) {
    if (!n.className.split(' ').includes('dash-stat')) { if (tiles.length) break; continue; }
    tiles.push(n);
  }
  return tiles;
}

/* A 0 figure: a 0 that is not part of a longer number ("404", "10" and "6-of-10" are not zeros). */
const zeroFigure = /(^|[^\d.,])0(?![\d.,])/;
const value = (tile) => tile.find('dash-stat-value')[0].children[0].textContent;

(async () => {
  // ---- the harness host: both endpoints answer 404 ------------------------------------------
  let page = mountWith({ status: 404 }, { status: 404 });
  await flush(); await flush();
  const chain = tilesUnder(page, 'Chain · dense-wire');
  const capacity = tilesUnder(page, 'Fleet capacity');
  assert.equal(chain.length, 6, 'the chain section keeps its six tiles');
  assert.equal(capacity.length, 4, 'the fleet capacity section keeps its four tiles');

  for (const [name, tiles, endpoint, server] of [
    ['Chain pulse', chain, '/api/chain-pulse', 'ops/chain-pulse-api.mjs'],
    ['Fleet capacity', capacity, '/api/chain-fleet-capacity', 'ops/chain-fleet-capacity-api.mjs']
  ]) {
    for (const tile of tiles) {
      const text = tile.textContent;
      assert.equal(value(tile), 'unavailable', name + ' tile says "unavailable", not a number or a dash: ' + text);
      assert(!zeroFigure.test(text), name + ' tile shows no 0 figure: ' + text);
      assert(!/(^|\s)[–-](\s|$)/.test(text), name + ' tile shows no bare dash: ' + text);
      assert(text.includes(name + ' unavailable: ' + endpoint + ' answered 404'), name + ' tile names the failure: ' + text);
    }
    const lead = tiles[0].textContent;
    assert(/Missing: .*this host does not serve it/.test(lead), name + ' lead tile names the missing thing: ' + lead);
    assert(lead.includes('Remedy: run ' + server + ' behind ' + endpoint), name + ' lead tile names the remedy: ' + lead);
  }
  assert(!/^no$/.test(value(chain[0])), '"Chain reachable" never claims "no" about a chain the page did not measure');
  const empties = page.find('dash-empty').map((n) => n.textContent);
  assert(empties.some((t) => t.startsWith('Fleet capacity unavailable: /api/chain-fleet-capacity answered 404')), 'the capacity table names the failure');
  assert(empties.some((t) => t.startsWith('Chain pulse unavailable: /api/chain-pulse answered 404')), 'the sovereign-chain table names the pulse failure, not a CHAIN_LIST guess');
  page.arkDispose();

  // ---- other failures are named for what they are -------------------------------------------
  page = mountWith({ message: 'Failed to fetch' }, { notJson: true });
  await flush(); await flush();
  const lead = tilesUnder(page, 'Chain · dense-wire')[0].textContent;
  assert(lead.includes('Chain pulse unavailable: /api/chain-pulse could not be reached (Failed to fetch)'), 'a network failure is named: ' + lead);
  const capLead = tilesUnder(page, 'Fleet capacity')[0].textContent;
  assert(capLead.includes('answered with something that is not JSON'), 'a page served in place of the API is named: ' + capLead);
  page.arkDispose();

  // ---- a route that forgot the client script ------------------------------------------------
  page = mountWith(null, null, { noClients: true });
  await flush();
  for (const tile of tilesUnder(page, 'Chain · dense-wire').concat(tilesUnder(page, 'Fleet capacity'))) {
    assert.equal(value(tile), 'unavailable');
    assert(!zeroFigure.test(tile.textContent), 'no 0 figure without a client: ' + tile.textContent);
  }
  assert(tilesUnder(page, 'Chain · dense-wire')[0].textContent.includes('Missing: js/ark/chain-pulse-client.js'), 'a missing client is named');
  page.arkDispose();

  console.log('PASS: /stats chain and fleet-capacity tiles refuse a failed feed by name (failure, missing thing, remedy), never as 0 or a bare dash.');
})().catch((e) => { console.error(e); process.exit(1); });
