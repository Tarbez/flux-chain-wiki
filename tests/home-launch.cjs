'use strict';
/* run-tests-timeout-ms: 180000 */
/* The home page module's own behaviour, in the real page (a jsdom boot through the server render,
   api/lib/render-core.mjs): what js/pages/home.js does beyond rendering its blocks
   (tests/home-blocks.cjs holds the blocks, the words and the layout keys).

   Named regressions:
   - the fleet signal is a measurement to check, never a 0: absent while loading, absent with its
     reason when the pulse fails, the reading when it arrives -- and a reading that arrives after
     the page was left must not touch it;
   - the reading replaces the tile's value IN PLACE: the tile, its label and its parts stay the same
     elements, so a pin (a CMS edit saved against the old page) survives it;
   - the chosen path is remembered when the page is mounted again (it was before the conversion);
   - choosing an example draws its counterparty in full ink on the map, and only the shown scene
     runs; leaving the page disposes every scene. */
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

(async () => {
  const { readIndexHtml, inspectDocument, createLocalResources } = await import('../api/lib/render-core.mjs');
  const result = await inspectDocument({ html: await readIndexHtml(ROOT), url: 'https://defxn.com/', resources: createLocalResources(ROOT), root: ROOT, timeoutMs: 30000 }, async (window) => {
    const { document, ArkUI } = window;
    const module = ArkUI.pageModules.zero;
    const tick = () => new Promise((resolve) => window.setTimeout(resolve, 0));
    const fleetTile = (page) => page.querySelectorAll('#home-questions [data-ark-block="stats"]')[1].querySelector('[data-ark-part="stat"]');
    const out = {};

    /* one pending pulse per mount, settled by hand */
    let settle = null;
    window.ArkPulse = { get: () => new Promise((resolve, reject) => { settle = { resolve, reject }; }) };
    const mount = () => { const host = document.createElement('div'); document.body.appendChild(host); return module.mount(host); };

    // loading: absent, never 0
    let page = mount();
    let tile = fleetTile(page);
    out.loading = { state: tile.getAttribute('data-state'), text: tile.textContent };
    // a pin on the tile and its label survives the reading
    tile.setAttribute('data-ark-layout-pin', 'pin:tile');
    tile.querySelector('[data-ark-part="stat-label"]').setAttribute('data-ark-layout-pin', 'pin:label');
    settle.resolve({ data: { nodes: [{ qps: 5 }, { qps: 7 }, { error: 'down' }], aggregate_qps: 12345.4, measured_at_ms: Date.UTC(2026, 9, 19, 12) } });
    await tick(); await tick();
    // the first live update loads js/ark/vendor/ark-kit-live.js and patches when it arrives (async)
    if (ArkUI.blocks.whenLive) await ArkUI.blocks.whenLive();
    const sameTile = fleetTile(page);
    out.reading = { same: sameTile === tile, state: sameTile.getAttribute('data-state'), number: (sameTile.querySelector('.ark-stat__number') || {}).textContent, unit: (sameTile.querySelector('[data-ark-part="stat-unit"]') || {}).textContent,
      detail: (sameTile.querySelector('[data-ark-part="stat-detail"]') || {}).textContent, pins: [sameTile.getAttribute('data-ark-layout-pin'), sameTile.querySelector('[data-ark-part="stat-label"]').getAttribute('data-ark-layout-pin')] };
    page.arkDispose();

    // failure: absent, with its reason
    page = mount();
    settle.reject(new Error('offline'));
    await tick(); await tick();
    tile = fleetTile(page);
    out.failed = { state: tile.getAttribute('data-state'), text: tile.textContent };
    page.arkDispose();

    // a reading after the page was left is not painted
    page = mount();
    tile = fleetTile(page);
    const before = tile.textContent;
    page.arkDispose();
    settle.resolve({ data: { nodes: [], aggregate_qps: 1, measured_at_ms: 0 } });
    await tick(); await tick();
    out.late = { unchanged: fleetTile(page).textContent === before };

    // the chosen path is remembered across mounts
    /* the path picker is the "Where do I start?" view's own tabs, the example picker "See it work"'s (the steps inside each scene are tabs too) */
    const VIEWS = ['start', 'walk', 'model', 'evidence', 'faq']; // the questions' order (js/pages/home.js)
    const viewTabs = (p, value) => p.querySelectorAll('#home-questions > [data-ark-part="tabs-content"]')[VIEWS.indexOf(value)].querySelector(':scope > [data-ark-block="tabs"]');
    const pathTab = (p, i) => viewTabs(p, 'start').querySelectorAll(':scope > [data-ark-part="tabs-list"] [role="tab"]')[i];
    pathTab(page, 2).click();
    const again = mount();
    out.remembered = pathTab(again, 2).getAttribute('aria-selected');

    // choosing an example inks its counterparty on the map
    const caseTab = (p, i) => viewTabs(p, 'walk').querySelectorAll(':scope > [data-ark-part="tabs-list"] [role="tab"]')[i];
    caseTab(again, 2).click(); // Staking
    out.inked = [...again.querySelectorAll('[data-ark-slot="world"] .world-line[data-selected="true"]')].map((l) => l.getAttribute('data-name'));
    again.arkDispose();
    return out;
  });

  assert.equal(result.loading.state, 'absent', 'while loading, the fleet tile is absent');
  assert(/Fleet measurement loading/.test(result.loading.text) && !/\b0\b/.test(result.loading.text.replace(/\d+\s*\/\s*\d+/g, '')), 'and says it is loading, with no number');
  assert.equal(result.reading.same, true, 'the reading lands in the same tile element (in place)');
  assert.equal(result.reading.state, 'reading');
  assert.equal(result.reading.number, '12,345', 'the measured rate, rounded and grouped');
  assert.equal(result.reading.unit, 'ops/s');
  assert(/2\/3 nodes reporting/.test(result.reading.detail) && /not cumulative ledger growth/.test(result.reading.detail), 'it says how many nodes reported, and what the number is not');
  assert.deepEqual(result.reading.pins, ['pin:tile', 'pin:label'], 'pins on the tile and its label survive the reading');
  assert.equal(result.failed.state, 'absent', 'a failed pulse leaves the tile absent');
  assert(/Live fleet measurement unavailable/.test(result.failed.text) && /Dated benchmark evidence/.test(result.failed.text), 'with its reason, pointing at the dated evidence');
  assert.equal(result.late.unchanged, true, 'a late response cannot update a page that was left');
  assert.equal(result.remembered, 'true', 'the chosen path is remembered when the page is mounted again');
  assert.deepEqual(result.inked, ['provider.fxn'], 'staking draws provider.fxn in full ink');
  console.log('PASS: home fleet signal (loading, reading in place with pins kept, failure, late response), remembered path, map follows the example.');
})().catch((error) => { console.error(error); process.exit(1); });
