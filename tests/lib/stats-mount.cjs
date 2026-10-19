'use strict';
/* =====================================================================
   STATS MOUNT -- /stats (js/pages/stats.js) mounted in jsdom with the real
   scripts it runs on (the Ark kit, the blocks adapter, the glossary, the
   stats highlights) and the live feeds under the test's control, for
   tests/stats-page.cjs and tests/stats-unavailable-not-zero.cjs.

     const { mount } = require('./lib/stats-mount.cjs');
     const m = mount({ pulse: () => Promise.resolve({ data }) });
     await m.flush();
     m.page, m.text(), m.tiles('Live fleet, hourly self-bench'), m.meta(), m.timers, m.dispose()

   Feeds: `pulse` is ArkPulse.get; `chainPulse` / `fleetCapacity` replace the
   chain clients, or `fetch` runs the REAL clients
   (js/ark/chain-pulse-client.js, js/ark/chain-fleet-capacity-client.js)
   over a fetch the test controls; `noClients` loads neither. Timers are
   stubbed and counted: nothing polls on its own, and dispose() must leave
   none behind.
   ===================================================================== */
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

function mount(options = {}) {
  const dom = new JSDOM('<!doctype html><html><body><main id="scene"></main></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://defxn.com/stats' });
  const w = dom.window;
  const timers = new Set(), listeners = {};
  w.setTimeout = (fn) => { const id = { fn }; timers.add(id); return id; };
  w.clearTimeout = (id) => { timers.delete(id); };
  w.setInterval = (fn) => { const id = { fn, interval: true }; timers.add(id); return id; };
  w.clearInterval = (id) => { timers.delete(id); };
  const addDoc = w.document.addEventListener.bind(w.document), removeDoc = w.document.removeEventListener.bind(w.document);
  w.document.addEventListener = (type, fn, o) => { (listeners[type] = listeners[type] || []).push(fn); addDoc(type, fn, o); };
  w.document.removeEventListener = (type, fn, o) => { listeners[type] = (listeners[type] || []).filter((f) => f !== fn); removeDoc(type, fn, o); };
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  w.eval('var ArkCopy = { isKey: function () { return false; }, resolve: function (v) { return v; }, text: function (k) { return k; } };');
  for (const file of ['js/ark/atomizer.js', 'js/ark/flux.js', 'js/ark/runtime.js', 'js/ark/vendor/engines.js']) w.eval(read(file));
  w.eval('ArkUI.pageCatalog = { stats: { path: "/stats" }, resolvers: { path: "/resolvers" }, "stats/ledger": { path: "/stats/ledger" }, "stats/gpu": { path: "/stats/gpu" }, zero: { path: "/" }, reference: { path: "/reference" } }; ArkUI.blockScripts = []; ArkUI.pageModules = ArkUI.pageModules || {};');
  // The live chunk (ark-kit-live.js) is loaded here as the page loader would on the first update: a jsdom window cannot fetch it.
  for (const file of ['js/ark/dash-kit.js', 'js/ark/vendor/ark-kit-public.js', 'js/ark/blocks.js', 'js/ark/vendor/ark-kit-live.js', 'js/content/glossary.js', 'js/content/stats-highlights.js']) w.eval(read(file));
  if (options.pulse) w.ArkPulse = { get: options.pulse };
  if (options.fetch && !options.noClients) {
    w.fetch = options.fetch;
    for (const file of ['js/ark/chain-pulse-client.js', 'js/ark/chain-fleet-capacity-client.js']) w.eval(read(file));
  } else if (!options.noClients) {
    w.ArkChainPulse = { get: options.chainPulse || (() => Promise.reject(Object.assign(new Error('HTTP 404 from /api/chain-pulse'), { status: 404, endpoint: '/api/chain-pulse' }))) };
    w.ArkChainFleetCapacity = { get: options.fleetCapacity || (() => Promise.reject(Object.assign(new Error('HTTP 404 from /api/chain-fleet-capacity'), { status: 404, endpoint: '/api/chain-fleet-capacity' }))) };
  }
  w.eval(read('js/pages/stats.js'));
  const host = w.document.getElementById('scene');
  const page = w.ArkUI.pageModules.stats.mount(host);
  const flush = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise((resolve) => setImmediate(resolve)); };
  /* The tiles of one stat row, by its name: [{ label, value, state, text }]. */
  const tiles = (label) => {
    const row = [...page.querySelectorAll('[data-ark-block="stats"]')].find((el) => el.getAttribute('aria-label') === label);
    if (!row) throw new Error('no stat row named "' + label + '"');
    return [...row.querySelectorAll('[data-ark-part="stat"]')].map((tile) => ({
      el: tile,
      label: tile.querySelector('[data-ark-part="stat-label"]').textContent,
      value: tile.querySelector('[data-ark-part="stat-value"]').textContent,
      state: tile.getAttribute('data-state'),
      text: tile.textContent
    }));
  };
  const table = (caption) => {
    const t = [...page.querySelectorAll('table')].find((el) => el.querySelector('caption').textContent === caption);
    if (!t) throw new Error('no table captioned "' + caption + '"');
    return [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((td) => td.textContent));
  };
  const meta = () => Object.fromEntries([...page.querySelectorAll('#stats-hero [data-ark-part="hero-meta"] > div')].map((d) => [d.querySelector('dt').textContent, d.querySelector('dd').textContent]));
  return { w, page, host, timers, listeners, flush, tiles, table, meta, text: () => page.textContent, dispose: () => page.arkDispose() };
}

module.exports = { mount };
