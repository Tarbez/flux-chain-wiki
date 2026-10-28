'use strict';
/* run-tests-timeout-ms: 180000 */
/* The home page module's own behaviour, in the real page (a jsdom boot through the server render,
   api/lib/render-core.mjs): what js/pages/home.js and the Measured rail it mounts (js/world/rail-capabilities.js)
   do beyond rendering their words (tests/home-blocks.cjs holds the words, the links and the figures).
   Since the owner confirmed the 3D world home on 2026-10-27, this locks its reduction test's behaviour:
   - item 4, hidden until asked: a capability's plain words and checked cases show on a pick in the rail.
     The rail opens on the capability with the most checked cases; a pick lights its tile (aria-pressed) and its
     strip segment, and only those, and wipes the focus in;
   - its speed is "Not measured yet", said in words, never a 0 (a capability with no measurement is absent,
     not scored nothing: the standing law, and the named regression of the old fleet tile);
   - item 8, leaving keeps state: the chosen capability resets, so a page mounted again opens on the first;
   - a rail is mounted once: mounting it again adds nothing;
   - item 10, if the 3D or the rail's script is missing: the words and the actions still mount (the module
     only calls the rail when it is there).

   Dropped, with the reason (the thing each guarded is gone with the block home, by the owner's design):
   - the live fleet tile (absent while loading, the reading in place with its pins, failure, a late response):
     the world home shows one dated benchmark run, not a live reading, and loads no pulse client;
   - the remembered path across mounts: the paths are links now, and item 8 says the choice resets;
   - the transit map inking the chosen example's counterparty: the map and the examples are gone. */
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

(async () => {
  const { readIndexHtml, inspectDocument, createLocalResources } = await import('../api/lib/render-core.mjs');
  const raw = await inspectDocument({ html: await readIndexHtml(ROOT), url: 'https://defxn.com/', resources: createLocalResources(ROOT), root: ROOT, timeoutMs: 30000 }, async (window) => {
    const { document, ArkUI, ArkCopy } = window;
    const module = ArkUI.pageModules.zero;
    const word = (role) => ArkCopy.text('HOME.WORLD.' + role);
    const D = window.DEFXN_CAPABILITIES;
    const caps = D.capabilities.slice().sort((a, b) => b.count - a.count || (a.id < b.id ? -1 : 1));
    const total = caps.reduce((s, c) => s + c.count, 0);
    const mount = () => { const host = document.createElement('div'); document.body.appendChild(host); return module.mount(host); };
    const focus = (page) => {
      const f = page.querySelector('[data-cap="focus"]');
      return { name: f.querySelector('.rx-name').textContent, line: f.querySelector('.rx-line').textContent,
        facts: [...f.querySelectorAll('.rx-facts dd')].map((dd) => dd.textContent), swap: f.classList.contains('swap') };
    };
    const lit = (page) => ({ pressed: [...page.querySelectorAll('[data-cap-id][aria-pressed="true"]')].map((b) => b.dataset.capId),
      segs: [...page.querySelectorAll('[data-seg].on')].map((s) => s.dataset.seg) });
    const title = (id) => id.charAt(0).toUpperCase() + id.slice(1);
    const out = { first: caps[0].id, total, want: {} };
    const wantFor = (c) => ({ name: title(c.id), line: c.plain || word('RAIL.NOWORDS'), facts: [c.count + ' ' + word('RAIL.OF') + ' ' + total, word('RAIL.NOTMEASURED')] });

    // opens on the capability with the most checked cases, the focus not wiped
    let page = mount();
    out.opened = { lit: lit(page), focus: focus(page) };
    out.want.first = wantFor(caps[0]);

    // a pick lights that capability alone and wipes the focus in
    const pick = caps[caps.length - 1];
    page.querySelector(`[data-cap-id="${pick.id}"]`).click();
    out.picked = { id: pick.id, lit: lit(page), focus: focus(page) };
    out.want.picked = wantFor(pick);

    // a rail is mounted once
    const rail = page.querySelector('aside.rail'), before = rail.innerHTML;
    window.DEFXNRail.mount(rail, {});
    out.once = rail.innerHTML === before && rail.dataset.railMounted === '1';

    // mounted again: the choice resets to the first
    const again = mount();
    out.reset = lit(again);

    // no rail script: the words and the actions still mount
    const keep = window.DEFXNRail;
    window.DEFXNRail = undefined;
    const bare = mount();
    window.DEFXNRail = keep;
    out.bare = { h1: !!bare.querySelector('h1#home-title'), main: !!bare.querySelector('.copy > a.cta'), paths: bare.querySelectorAll('nav.paths a').length,
      railAction: !!bare.querySelector('aside.rail a.rail-cta'), tiles: bare.querySelectorAll('.rx-tiles > div').length };
    return out;
  });
  const result = JSON.parse(JSON.stringify(raw)); // plain data: the window's arrays are another realm's

  assert.deepEqual(result.opened.lit, { pressed: [result.first], segs: [result.first] }, 'the rail opens on the capability with the most checked cases, its tile and its strip segment lit');
  assert.deepEqual({ ...result.opened.focus, swap: undefined }, { ...result.want.first, swap: undefined }, 'the focus shows its name, its plain words, its checked cases of all, and its speed in words');
  assert.equal(result.opened.focus.swap, false, 'opening does not wipe the focus in (nothing moves on its own)');
  assert(!result.opened.focus.facts.some((f) => /^0\b/.test(f.trim())), 'no fact is a 0: a speed not measured is said, never shown as 0');
  assert.deepEqual(result.picked.lit, { pressed: [result.picked.id], segs: [result.picked.id] }, 'a pick lights that capability alone');
  assert.deepEqual({ ...result.picked.focus, swap: undefined }, { ...result.want.picked, swap: undefined }, 'and the focus shows it');
  assert.equal(result.picked.focus.swap, true, 'a pick wipes the focus in');
  assert.equal(result.once, true, 'a rail is mounted once');
  assert.deepEqual(result.reset, { pressed: [result.first], segs: [result.first] }, 'mounted again, the chosen capability resets to the first');
  assert.deepEqual(result.bare, { h1: true, main: true, paths: 3, railAction: true, tiles: 0 }, 'with no rail script, the words, the main action, the three paths and the rail\'s action still mount');
  console.log('PASS: home rail behaviour: opens on the most-checked capability, a pick lights it alone and wipes the focus in, speed said not zeroed, mounted once, resets on return, and the words and actions mount without the rail.');
})().catch((error) => { console.error(error); process.exit(1); });
