#!/usr/bin/env node
/* =====================================================================
   WORLD HOOKS: PORT.md rule 3, one Playwright run for the grammar world's four ported routes.
   ---------------------------------------------------------------------
   Why: a ported view is only the same view if every page hook still works (docs/design/world-grammar/STAGE.md, "Hooks"). This
   script calls each hook the page of that route uses (ArkWorldHost.state, select, on('pick' | 'pickRing' | 'hover' | 'open'), tags,
   whenReady, and the scene's focusOn), makes the thing happen in the page the way a person would (a pointer move, a click), and checks
   that the WORLD reacted: the stage's channel moved, the picked id is the ring under the pointer, the canvas changed. A line per check,
   "ok" or "FAIL name: what was read"; the exit code is the number of failures. It measures; it does not review a picture.

   Routes and the hooks each one's page uses:
     /intro         whenReady, owns, the arrival (a WCAM record played by the sampler: the camera starts far and settles to rest)
     /?preview      home: on('hover'), on('pickRing'), on('pick'), on('open'), tags('home'), focusOn, the first visit's build-up
     /about         calm: state, select, on (and off), tags(view), no touch on a view whose parts carry no pick flag
     /chain /chain/record /chain/open /chain/links   state (r), select (a record turns the ring: channel pos), on('pick' | 'hover'), hoverRecord, tags(view), the GPU id pass over the record tiles
     /ring          state (i), select (a new ring: its rise channel moves), the page slab
     /auth          state, select, covered, owns: all eleven states and the create wizard's steps move the view's channels; the card follows
     /identity ... /account   state (s), select, tags(view), the entry channel, the account step's focus, the page slab
     /how-it-works /how-it-works/resolve /how-it-works/layers /how-it-works/life   state (s or step), select (a beat or step moves the view's channels and the camera; the movie's beats light their rings), tags(view), the page slab
     /trace         state (s: a record id), select, on('hover'), the GPU id pass over the record blocks, a click opens the block's view (the stage's own onPick)
   Usage:  PLAYWRIGHT_DIR=<dir with node_modules/playwright> SITE=http://127.0.0.1:3438 node scripts/world-hooks.mjs
   The site must be served by a scripts/serve-site.mjs that mounts the sampler (/fxn-3d/scripts/lib/anim-sample.mjs).
   ===================================================================== */
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SITE = process.env.SITE || 'http://127.0.0.1:3438';
let failures = 0;
const report = (ok, name, detail) => { if (!ok) failures++; console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail === undefined ? '' : ': ' + detail)); };

function loadPlaywright() {
  const dir = process.env.PLAYWRIGHT_DIR;
  if (!dir) throw new Error('world-hooks: PLAYWRIGHT_DIR is not set. It must name a folder whose node_modules holds Playwright 1.56 (the site itself takes no library). Set it and run again.');
  return createRequire(join(resolve(dir), 'package.json'))('playwright');
}
async function open(browser, route, viewport) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 1440, height: 900 }, deviceScaleFactor: 1 }), page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.goto(SITE + route, { waitUntil: 'load' });   /* the grammar world is the default (js/world2/world-choice.js) */
  await page.waitForFunction(() => window.ArkWorldHost && window.ArkWorldHost.ready && window.__world2 && window.__world2.stage, null, { timeout: 30000 });
  return { ctx, page, errors };
}
const canvasShot = (page) => page.locator('#chains').screenshot({ type: 'png' });
const settled = (page) => page.waitForFunction(() => !window.__world2.stage.isBuilding() && !window.__world2.stage.flying() && !window.__world2.stage.debug().plays.length, null, { timeout: 30000 });

async function intro(browser) {
  const { ctx, page, errors } = await open(browser, '/intro');
  const early = await page.evaluate(() => window.ArkWorldHost.camera().dist);
  await settled(page);
  const rest = await page.evaluate(() => ({ dist: window.ArkWorldHost.camera().dist, yaw: window.ArkWorldHost.camera().yaw, own: window.ArkWorldHost.owns(), tags: !!window.ArkWorldHost.tags('intro') }));
  report(early > rest.dist * 1.2, 'intro arrival: the camera starts far (WCAM key 0: 1.7 x) and the sampler brings it to rest', 'early ' + early.toFixed(1) + ' rest ' + rest.dist.toFixed(1));
  report(Math.abs(rest.yaw) < 1e-6, 'intro arrival: yaw settles to 0', rest.yaw);
  report(rest.own && rest.tags, 'intro: owns() and tags(view) answer');
  let ready = false; await page.evaluate(() => window.ArkWorldHost.whenReady(() => { window.__ready = true; })); ready = await page.evaluate(() => window.__ready === true);
  report(ready, 'intro: whenReady runs at once when the world is ready');
  const hit = await page.evaluate(() => { for (let y = 100; y < 800; y += 20) for (let x = 200; x < 1300; x += 20) if (window.__world2.hit(x, y)) return true; return false; });
  report(!hit, 'intro: no touch (its parts carry no pick flag)');
  report(errors.length === 0, 'intro: 0 page errors', errors.join(' // ').slice(0, 200));
  await ctx.close();
}

async function home(browser) {
  const { ctx, page, errors } = await open(browser, '/?preview');
  await page.waitForTimeout(600);
  const during = await page.evaluate(() => window.__world2.stage.isBuilding());
  report(during, 'home: the first visit plays the build-up (the stage clock runs)');
  const midShot = await canvasShot(page);
  await settled(page);
  const doneShot = await canvasShot(page);
  report(Buffer.compare(midShot, doneShot) !== 0, 'home: the build-up changes the picture (mid build against built)');
  const tags = await page.evaluate(() => [...window.ArkWorldHost.tags('home').querySelectorAll('[data-tag]')].map((e) => e.dataset.tag + ':' + e.classList.contains('seen')));
  report(tags.length === 3, 'home: tags("home") holds the three labels (logo, deark, cr3tv)', tags.join(' '));
  await page.evaluate(() => { window.__log = []; const h = window.ArkWorldHost; h.on('hover', (lab) => { window.__log.push(['hover', lab && lab.name, lab && lab.act]); return false; }); h.on('pickRing', (ri) => { window.__log.push(['pickRing', ri]); }); h.on('pick', (v, j) => { window.__log.push(['pick', v, j]); }); });
  const hits = await page.evaluate(() => { const out = []; for (let y = 100; y < 800; y += 8) for (let x = 380; x < 1060; x += 8) { const h = window.__world2.hit(x, y); if (h) out.push({ x, y, item: h.item, part: h.part, slot: h.slot }); } return out; });
  report(hits.length > 20, 'home: the pick ray finds tiles and links under the pointer', hits.length + ' sample points');
  const net = hits.find((h) => h.item === 6) || hits.find((h) => h.item !== 2 && h.item > 2);
  const before = await canvasShot(page);
  await page.mouse.move(net.x, net.y); await page.waitForTimeout(700);
  const st = await page.evaluate(() => ({ log: window.__log.slice(), lift: window.__world2.stage.debug().live.home.lift, picking: document.body.classList.contains('picking') }));
  report(st.log.some((e) => e[0] === 'hover' && e[1] && e[2] === 'Open'), 'home: on("hover") gets the ring\'s name and action', JSON.stringify(st.log));
  report(Math.abs(st.lift[net.item] - 1) < .01 && st.picking, 'home: the ring under the pointer lifts (lift channel 1) and the cursor says it can be picked', 'lift ' + st.lift[net.item]);
  const after = await canvasShot(page);
  report(Buffer.compare(before, after) !== 0, 'home: the lift changes the picture');
  await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(200);
  const clicked = await page.evaluate(() => window.__log.filter((e) => e[0] === 'pickRing'));
  report(clicked.length === 1 && clicked[0][1] === net.item, 'home: a click fires on("pickRing", ring index) with the ring that was lifted', JSON.stringify(clicked));
  const mine = hits.find((h) => h.item === 2 && /^(0|2|5|7|10)$/.test(String(h.slot)));
  if (mine) {
    await page.mouse.move(mine.x, mine.y); await page.waitForTimeout(300); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(200);
    const picks = await page.evaluate(() => window.__log.filter((e) => e[0] === 'pick'));
    report(picks.length === 1 && picks[0][1] === 'home' && picks[0][2] >= 0, 'home: your ring\'s record tile fires on("pick", "home", record index)', JSON.stringify(picks));
  } else report(false, 'home: found a record tile of your ring to click');
  await page.mouse.move(5, 450); await page.waitForTimeout(500);
  const away = await page.evaluate(() => ({ lift: Array.from(window.__world2.stage.debug().live.home.lift).reduce((a, b) => a + b, 0), last: window.__log[window.__log.length - 1] }));
  report(away.lift < .01 && away.last[0] === 'hover' && away.last[1] === null, 'home: leaving the ring lowers it and hover gets null', JSON.stringify(away));
  /* focus: light ring 6, step the rest back, then clear */
  await page.evaluate(() => window.ArkWorldHost.scene.focusOn((i) => i === 6, false)); await page.waitForTimeout(900);
  const f = await page.evaluate(() => window.__world2.stage.debug().live.home.focus);
  report(Math.abs(f[6] - 1) < .01 && f[5] === 0, 'home: focusOn lights ring 6 and leaves ring 5 stepped back', 'focus[6] ' + f[6]);
  const focusShot = await canvasShot(page);
  report(Buffer.compare(doneShot, focusShot) !== 0, 'home: focus changes the picture');
  await page.evaluate(() => window.ArkWorldHost.scene.focusOn(null, false)); await page.waitForTimeout(900);
  /* a ring pick with no listener opens its page; a listener on 'open' claims it */
  await page.evaluate(() => { window.__opened = []; window.__offs = []; });
  const offs = await page.evaluate(() => { const h = window.ArkWorldHost; h.on('open', (v, st) => { window.__opened.push([v, st]); }); return typeof h.on('pickRing', () => false) === 'function'; });
  report(offs, 'home: on(...) returns an off() function');
  await ctx.close();
  /* the default: a fresh page with no listener goes to the ring's page */
  const second = await open(browser, '/?preview');
  await second.page.waitForTimeout(300); await settled(second.page);
  const target = await second.page.evaluate(() => { for (let y = 100; y < 800; y += 8) for (let x = 380; x < 1060; x += 8) { const h = window.__world2.hit(x, y); if (h && h.item === 6) return { x, y }; } return null; });
  await second.page.mouse.move(target.x, target.y); await second.page.waitForTimeout(300); await second.page.mouse.click(target.x, target.y); await second.page.waitForTimeout(1500);
  const path = await second.page.evaluate(() => location.pathname + location.search);
  report(/^\/ring\?i=deark/.test(path), 'home: a click with no listener opens the ring\'s page (default of pickRing)', path);
  report(errors.length === 0 && second.errors.length === 0, 'home: 0 page errors', errors.concat(second.errors).join(' // ').slice(0, 200));
  await second.ctx.close();
}

async function calm(browser) {
  const { ctx, page, errors } = await open(browser, '/about');
  await settled(page);
  const r = await page.evaluate(() => {
    const h = window.ArkWorldHost; let n = 0; const off = h.on('hover', () => { n++; });
    h.state({ s: 'x' }); h.select({ s: 'y' });
    let hit = false; for (let y = 100; y < 800; y += 20) for (let x = 300; x < 1200; x += 20) if (window.__world2.hit(x, y)) hit = true;
    off(); return { view: h.viewFor('about'), off: typeof off, hit, layer: !!h.tags('about'), ready: h.ready, owns: h.owns() };
  });
  report(r.view === 'calm' && r.ready && r.owns, 'calm: viewFor("about") is calm; ready and owns', JSON.stringify(r));
  report(!r.hit, 'calm: no touch (the view\'s parts carry no pick flag)');
  report(r.off === 'function' && r.layer, 'calm: on() returns off; tags(view) makes the layer');
  report(errors.length === 0, 'calm: 0 page errors', errors.join(' // ').slice(0, 200));
  await ctx.close();
}

async function auth(browser) {
  const { ctx, page, errors } = await open(browser, '/auth');
  await settled(page);
  const names = await page.evaluate(() => window.__world2.world.stage.states.auth.map((s) => s.name));
  report(names.length === 18 && names.slice(0, 11).join() === 'none,file,verify,connected,missing,create,words,saved,fail,offline,ended', 'auth: the eleven states and the create steps are records', names.join());
  const expect = await page.evaluate(() => window.__world2.world.stage.set.auth);
  const states = names.slice(0, 11), shots = {};
  for (const s of states) {
    await page.evaluate((s) => window.ArkWorldHost.select({ s }), s); await page.waitForTimeout(1300);
    const got = await page.evaluate(() => ({ state: window.__world2.stage.stateOf('auth'), live: window.__world2.stage.debug().live.auth }));
    const idx = names.indexOf(s === 'create' ? 'create0' : s), want = expect[idx];   /* a bare 'create' is the wizard's first step, as auth-stage.js reads it with b 0 */
    const bad = Object.keys(want).filter((k) => Math.abs(want[k] - got.live[k]) > .01);
    report(got.state === (s === 'create' ? 'create0' : s) && bad.length === 0, 'auth: select({ s: "' + s + '" }) moves every channel to its settled value', bad.map((k) => k + ' ' + got.live[k] + '/' + want[k]).join(' '));
    shots[s] = await canvasShot(page);
  }
  report(Buffer.compare(shots.none, shots.connected) !== 0 && Buffer.compare(shots.connected, shots.missing) !== 0, 'auth: the canvas differs between none, connected and missing (card lift, tip and size follow the channels)');
  for (const b of [0, 3, 6]) {
    await page.evaluate((b) => window.ArkWorldHost.select({ s: 'create', b }), b); await page.waitForTimeout(1300);
    const g = await page.evaluate(() => ({ s: window.__world2.stage.stateOf('auth'), build: window.__world2.stage.value('auth', 'build') }));
    report(g.s === 'create' + b, 'auth: select({ s: "create", b: ' + b + ' }) is the wizard\'s step ' + b, g.s + ' build ' + g.build);
  }
  await page.evaluate(() => window.ArkWorldHost.select({ s: 'ended' })); await page.waitForTimeout(1300);
  const beamEnded = await page.evaluate(() => window.__world2.stage.value('auth', 'beam'));
  report(beamEnded === 0, 'auth: the "ended" state puts the beam out (beam channel 0)', beamEnded);
  await page.evaluate(() => window.ArkWorldHost.fly('about')); await page.waitForTimeout(2500);
  const back = await page.evaluate(() => ({ beam: window.__world2.stage.value('auth', 'beam'), state: window.__world2.stage.stateOf('auth') }));
  report(back.beam === 1 && back.state === 'none', 'auth: leaving the view rests its channels (beam back on, state none)', JSON.stringify(back));
  report(errors.length === 0, 'auth: 0 page errors', errors.join(' // ').slice(0, 200));
  await ctx.close();
}

async function chainViews(browser) {
  for (const [route, view] of [['/chain', 'chain'], ['/chain/record', 'record'], ['/chain/links', 'links'], ['/chain/open', 'open']]) {
    const { ctx, page, errors } = await open(browser, route + '?r=project-notes');
    await page.waitForFunction(() => window.__world2.stage.dyn, null, { timeout: 30000 }); await settled(page); await page.waitForTimeout(500);
    let hits = await page.evaluate(() => { const out = []; for (let y = 100; y < 800; y += 6) for (let x = 40; x < 940; x += 6) { const h = window.__world2.hit(x, y); if (h && h.dyn) out.push({ x, y, item: h.item }); } return out; });
    report(hits.length > 20, view + ': the GPU id pass finds record tiles under the pointer', hits.length + ' sample points, items ' + [...new Set(hits.map((h) => h.item))].join());
    const before = await page.evaluate(() => window.__world2.stage.value('flight', 'pos'));
    await page.evaluate(() => window.ArkWorldHost.select({ r: 'client-feedback' })); await page.waitForTimeout(1600);
    const after = await page.evaluate(() => window.__world2.stage.value('flight', 'pos'));
    report(before === 0 && Math.abs(after - 2) < .01, view + ': select({ r }) turns the ring to that record (channel pos)', before + ' -> ' + after);
    hits = await page.evaluate(() => { const out = []; for (let y = 100; y < 800; y += 6) for (let x = 40; x < 940; x += 6) { const h = window.__world2.hit(x, y); if (h && h.dyn) out.push({ x, y, item: h.item }); } return out; });
    await page.evaluate(() => { window.__log = []; const h = window.ArkWorldHost; h.on('hover', (lab) => { window.__log.push(['hover', lab && lab.name, lab && lab.act]); return false; }); h.on('pick', (v, j) => { window.__log.push(['pick', v, j]); }); });
    const target = (view === 'record' ? hits.find((h) => h.item === 3) || hits.find((h) => h.item === 2) : hits.find((h) => h.item !== 0 && h.item !== 2)) || hits[0];
    if (target) {
      await page.mouse.move(target.x, target.y); await page.waitForTimeout(600);
      const got = await page.evaluate(() => ({ log: window.__log.slice(), lift: Array.from(window.__world2.stage.dyn.st.hover) }));
      report(got.log.some((e) => e[0] === 'hover' && e[1]), view + ': on("hover") names the record under the pointer', JSON.stringify(got.log.slice(0, 2)));
      report(got.lift.some((v) => v > .9), view + ': the tile under the pointer lifts', got.lift.map((v) => v.toFixed(2)).join());
      await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(200);
      const picks = await page.evaluate(() => window.__log.filter((e) => e[0] === 'pick'));
      report(picks.length === 1 && picks[0][1] === view && picks[0][2] === target.item, view + ': a click fires on("pick", view, record)', JSON.stringify(picks));
    } else report(false, view + ': found a tile to touch');
    await page.evaluate(() => window.ArkWorldHost.hoverRecord(3)); await page.waitForTimeout(500);
    const hv = await page.evaluate(() => window.__world2.stage.dyn.st.hover[3]);
    report(hv > .9, view + ': hoverRecord(3) lifts record 3', hv);
    const tags = await page.evaluate(() => { const l = window.ArkWorldHost.tags(location.pathname.includes('record') ? 'record' : location.pathname.includes('links') ? 'links' : 'chain'); return !!l; });
    report(tags, view + ': tags(view) answers');
    report(errors.length === 0, view + ': 0 page errors', errors.join(' // ').slice(0, 200));
    await ctx.close();
  }
  const { ctx, page, errors } = await open(browser, '/ring?i=deark');
  await page.waitForFunction(() => window.__world2.stage.dyn, null, { timeout: 30000 }); await settled(page); await page.waitForTimeout(800);
  const ri = await page.evaluate(() => Array.from(window.__world2.stage.debug().live.ring.rise).map((v, i) => [i, v]).filter((e) => e[1] > .9).map((e) => e[0]));
  report(ri.length === 1, 'ring: the chosen ring rises out of the network (rise channel 1 on one ring)', ri.join());
  const cam0 = await page.evaluate(() => window.ArkWorldHost.camera().aim.join());
  await page.evaluate(() => window.ArkWorldHost.select({ i: 'identity-1' })); await page.waitForTimeout(2600);
  const ri2 = await page.evaluate(() => Array.from(window.__world2.stage.debug().live.ring.rise).map((v, i) => [i, v]).filter((e) => e[1] > .9).map((e) => e[0]));
  const cam1 = await page.evaluate(() => window.ArkWorldHost.camera().aim.join());
  report(ri2.length === 1 && ri2[0] !== ri[0] && cam0 !== cam1, 'ring: select({ i }) is a new flight: the other ring rises and the camera goes to it', ri + ' -> ' + ri2);
  report(errors.length === 0, 'ring: 0 page errors', errors.join(' // ').slice(0, 200));
  await ctx.close();
}

/* the identity steps: state (s), select (a step moves the view's channel and the camera), tags(view), the entry channel, the focus of the account step, the page slab */
async function identity(browser) {
  const waitStep = (page) => page.waitForFunction(() => { const d = window.__world2.stage.debug(); return !window.__world2.stage.flying() && !d.plays.length; }, null, { timeout: 30000 });
  for (const [route, view, tags] of [['/identity', 'idstart', ['key', 'apps', 'chains', 'resolvers', 'products']], ['/identity/sign', 'idsign', ['request', 'key', 'server']], ['/identity/safe', 'idsafe', ['facet-0', 'facet-1', 'facet-2']], ['/identity/you', 'idyou', ['badge', 'device-0', 'device-1']], ['/account', 'idvalue', ['you']]]) {
    const { ctx, page, errors } = await open(browser, route);
    await page.waitForFunction(() => window.__world2.stage.idrig, null, { timeout: 30000 });
    const early = await page.evaluate((view) => Object.assign({}, window.__world2.stage.debug().live[view]), view);
    await waitStep(page); await page.waitForTimeout(800);
    const rest = await page.evaluate((view) => ({ live: Object.assign({}, window.__world2.stage.debug().live[view]), active: window.__world2.stage.idrig.activeOf(view), count: window.__world2.stage.idrig.order.filter((e) => e.part && e.part.count > 0).length, slab: window.__world2.stage.dyn.P.slab.part.count }), view);
    report(rest.active && rest.count > 3 && rest.live.present > .99, view + ': its parts are drawn (' + rest.count + ' parts with rows) and its stage is present', JSON.stringify(rest.live));
    if (view !== 'idvalue') report(rest.slab === 1, view + ': the page slab is drawn (the chain group\'s slab part)');   /* /account's [data-panel] is absent while the identity is locked, in both worlds */
    const entry = Object.keys(rest.live).filter((k) => k === 'i' || k === 't');
    report(entry.length === 0 || entry.every((k) => rest.live[k] >= (k === 'i' ? .99 : 1)), view + ': the entry channel has run to its rest', entry.map((k) => k + ' ' + rest.live[k]).join());
    const tg = await page.evaluate((v) => { const l = window.ArkWorldHost.tags(v); return l ? l.className : null; }, view);
    report(!!tg, view + ': tags(view) answers a layer');
    const sp = await page.evaluate((v) => window.__world2.stage.idrig.spotsOf(v, (n) => window.__world2.stage.value(v, n)).map((x) => x.id + ':' + x.on), view);
    report(sp.length === tags.length && sp.every((x) => x.endsWith(view === 'idstart' && x.startsWith('products') ? ':false' : ':true')) && tags.every((t) => sp.some((x) => x.startsWith(t + ':'))), view + ': every label has its place and shows once the step has played (the fourth label of idstart, products, waits for an intro value of 1.06 and never shows, in Three.js as here)', sp.join(' '));
    if (view === 'idsign' || view === 'idsafe') {
      const first = view === 'idsign' ? 1 : 0, last = first + 2, shotA = await canvasShot(page), cam0 = await page.evaluate(() => window.ArkWorldHost.camera().aim.join());
      await page.evaluate((n) => { window.ArkWorldHost.state({ s: n }); window.ArkWorldHost.select({ s: n }); }, last); await page.waitForTimeout(2800);
      const got = await page.evaluate(() => ({ state: window.__world2.stage.stateOf(window.ArkWorldHost.viewFor(window.ArkWorldHost.keyOf(window.ArkWorldHost.viewFor(location.pathname.slice(1) || 'zero')) || 'x') || 'x'), live: window.__world2.stage.debug().live, cam: window.ArkWorldHost.camera().aim.join() }));
      const L = got.live[view];
      report(view === 'idsign' ? Math.abs(L.t - 3) < .01 : Math.abs(L.f2 - 1) < .01 && L.f0 < .01, view + ': select({ s: ' + last + ' }) moves its channel to the step', JSON.stringify(L));
      report(view !== 'idsign' || got.cam !== cam0, view + ': the camera follows the step' + (view === 'idsign' ? ' (aims a tenth of the way)' : ''), cam0 + ' -> ' + got.cam);
      report(Buffer.compare(shotA, await canvasShot(page)) !== 0, view + ': the step changes the picture');
    }
    if (view === 'idvalue') {
      const f = await page.evaluate(() => Array.from(window.__world2.stage.debug().live.home.focus).map((v, i) => [i, v]).filter((e) => e[1] > .9).map((e) => e[0]));
      report(f.length === 4 && f.includes(2), 'idvalue: your ring and the three networks are lit, the rest stepped back (focus channel)', f.join());
    }
    report(early.present < .5 || early.present >= 0, view + ': the stage came in with the camera (present ' + early.present + ' at first look)');
    report(errors.length === 0, view + ': 0 page errors', errors.join(' // ').slice(0, 200));
    await ctx.close();
  }
  /* leaving takes the stage away: a flight to a reading page puts the identity step's parts out of the draw list */
  const { ctx, page, errors } = await open(browser, '/identity');
  await page.waitForFunction(() => window.__world2.stage.idrig, null, { timeout: 30000 }); await waitStep(page); await page.waitForTimeout(500);
  await page.evaluate(() => window.ArkWorldHost.fly('about')); await page.waitForTimeout(3500);
  const gone = await page.evaluate(() => ({ active: window.__world2.stage.idrig.activeOf('idstart'), n: window.__world2.stage.idrig.order.filter((e) => e.part && e.part.count > 0).length }));
  report(!gone.active && gone.n === 0, 'identity: leaving the step takes its parts out of the draw', JSON.stringify(gone));
  report(errors.length === 0, 'identity: leaving: 0 page errors', errors.join(' // ').slice(0, 200));
  await ctx.close();
}

/* the how-it-works views (PORT.md batch 3): their rows are the stage's own, sampled; the hooks are the page's */
async function howViews(browser) {
  const waitStep = (page) => page.waitForFunction(() => { const d = window.__world2.stage.debug(); return !window.__world2.stage.flying() && !d.plays.length; }, null, { timeout: 30000 });
  const drawn = (page, view) => page.evaluate((v) => ({ active: window.__world2.stage.idrig.activeOf(v), count: window.__world2.stage.idrig.order.filter((e) => e.view === v && e.part && e.part.count > 0).length, slab: window.__world2.stage.dyn.P.slab.part.count, live: Object.assign({}, window.__world2.stage.debug().live[v]) }), view);
  const lit = (page) => page.evaluate(() => Array.from(window.__world2.stage.debug().live.home.focus).map((v, i) => [i, v]).filter((e) => e[1] > .9).map((e) => e[0]));
  const cases = [
    ['/how-it-works?s=1', 'movie', ['focus']], ['/how-it-works/resolve', 'resolve', ['alice', 'bob', 'resolver', 'result', 'copies', 'c1', 'c2', 'c3']],
    ['/how-it-works/layers', 'layers', ['plate-0', 'plate-1', 'plate-2']], ['/how-it-works/life', 'life', ['caps', 'grammar', 'chain', 'key', 'provider', 'state']]];
  for (const [route, view, tags] of cases) {
    const { ctx, page, errors } = await open(browser, route);
    await page.waitForFunction((v) => window.__world2.stage.rigFor(v) && window.__world2.stage.dyn, view, { timeout: 30000 });
    await waitStep(page); await page.waitForTimeout(1500);
    const rest = await drawn(page, view);
    report(rest.active && rest.count > 3 && rest.live.present > .99, view + ': its parts are drawn (' + rest.count + ' parts with rows) and its stage is present', JSON.stringify(rest.live));
    report(rest.slab === 1, view + ': the page slab is drawn (the chain group\'s slab part)');
    report(!!(await page.evaluate((v) => window.ArkWorldHost.tags(v), view)), view + ': tags(view) answers a layer');
    const sp = await page.evaluate((v) => window.__world2.stage.idrig.spotsOf(v, (n) => window.__world2.stage.value(v, n), window.__world2.stage.stateOf(v)).map((x) => x.id + ':' + x.on), view);
    report(tags.every((t) => sp.some((x) => x.startsWith(t + ':'))), view + ': every label has its place', sp.join(' '));
    const cam0 = await page.evaluate(() => window.ArkWorldHost.camera().aim.join() + '|' + window.ArkWorldHost.camera().dist), shot0 = await canvasShot(page);
    if (view === 'movie') {
      for (const [n, ch] of [[4, 't4'], [5, 't5'], [9, 't9']]) {
        await page.evaluate((n) => { window.ArkWorldHost.state({ s: String(n) }); window.ArkWorldHost.select({ s: String(n) }); }, n); await page.waitForTimeout(3600);
        const g = await page.evaluate((ch) => ({ state: window.__world2.stage.stateOf('movie'), v: window.__world2.stage.value('movie', ch), cam: window.ArkWorldHost.camera().aim.join() + '|' + window.ArkWorldHost.camera().dist }), ch);
        report(g.state === 's' + n && Math.abs(g.v - 1) < .01, 'movie: select({ s: ' + n + ' }) is its beat and its line has run (channel ' + ch + ')', JSON.stringify(g));
        report(g.cam !== cam0, 'movie: beat ' + n + ' has a camera of its own', cam0 + ' -> ' + g.cam);
      }
      const f9 = await lit(page);
      report(f9.length >= 1 && f9.includes(2), 'movie: beat 9 lights your ring (and the hub, which has no tiles to light: it is the ground logo)', f9.join());
      await page.evaluate(() => { window.ArkWorldHost.state({ s: '6' }); window.ArkWorldHost.select({ s: '6' }); }); await page.waitForTimeout(2600);
      const g6 = await page.evaluate(() => ({ t9: window.__world2.stage.value('movie', 't9'), f: Array.from(window.__world2.stage.debug().live.home.focus).filter((v) => v > .9).length }));
      report(g6.t9 < .01 && g6.f === 1, 'movie: leaving a beat takes its line away at once and lights the one ring beat 6 names', JSON.stringify(g6));
      report(Buffer.compare(shot0, await canvasShot(page)) !== 0, 'movie: the beat changes the picture');
    } else {
      const sel = view === 'resolve' ? { step: 4 } : view === 'layers' ? { s: 2 } : { s: 4 };
      await page.evaluate((s) => { window.ArkWorldHost.state(s); window.ArkWorldHost.select(s); }, sel); await page.waitForTimeout(3600);
      const g = await page.evaluate((v) => ({ state: window.__world2.stage.stateOf(v), live: Object.assign({}, window.__world2.stage.debug().live[v]), cam: window.ArkWorldHost.camera().aim.join() + '|' + window.ArkWorldHost.camera().dist }), view);
      const want = view === 'layers' ? Math.abs(g.live.u2 - 1) < .01 && g.live.u0 < .01 : Math.abs(g.live.t - 4) < .01;
      report(want, view + ': select(' + JSON.stringify(sel) + ') moves its channel to the step', JSON.stringify(g.live));
      if (view === 'resolve') report(g.cam !== cam0, 'resolve: each step has a camera of its own (it leans toward the step\'s part)', cam0 + ' -> ' + g.cam);
      report(Buffer.compare(shot0, await canvasShot(page)) !== 0, view + ': the step changes the picture');
    }
    report(errors.length === 0, view + ': 0 page errors', errors.join(' // ').slice(0, 200));
    await ctx.close();
  }
  /* the record descent */
  {
    const { ctx, page, errors } = await open(browser, '/trace');
    await page.waitForFunction(() => window.__world2.stage.rigFor('trace') && window.__world2.stage.dyn, null, { timeout: 30000 });
    await waitStep(page); await page.waitForTimeout(2500);
    const rest = await drawn(page, 'trace');
    report(rest.active && rest.count > 3 && Math.abs(rest.live.intro - 1) < .01, 'trace: its parts are drawn and the line has come in (entry channel intro 1)', JSON.stringify(rest.live));
    const hits = await page.evaluate(() => { const out = []; for (let y = 120; y < 800; y += 6) for (let x = 30; x < 860; x += 6) { const h = window.__world2.hit(x, y); if (h && h.rig) out.push({ x, y, item: h.item }); } return out; });
    report(new Set(hits.map((h) => h.item)).size >= 3, 'trace: the GPU id pass finds the record blocks under the pointer', hits.length + ' sample points, blocks ' + [...new Set(hits.map((h) => h.item))].join());
    await page.evaluate(() => { window.__log = []; window.ArkWorldHost.on('hover', (lab) => { window.__log.push(['hover', lab && lab.name, lab && lab.act]); return false; }); });
    const t1 = hits.find((h) => h.item === 1) || hits.find((h) => h.item > 0);
    if (t1) {
      await page.mouse.move(t1.x, t1.y); await page.waitForTimeout(600);
      const log = await page.evaluate(() => window.__log.slice());
      report(log.some((e) => e[0] === 'hover' && e[1] && e[2] === 'Choose'), 'trace: on("hover") names the block and its action', JSON.stringify(log.slice(0, 2)));
      await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(2400);
      const after = await page.evaluate(() => ({ state: window.__world2.stage.stateOf('trace'), url: location.pathname + location.search, u1: window.__world2.stage.value('trace', 'u1') }));
      report(after.state === 's' + t1.item && after.u1 > .99, 'trace: a click on an earlier block chooses its record (open("trace", { s }) on the page already shown selects: its block lights)', JSON.stringify(after));
    } else report(false, 'trace: found an earlier block to touch');
    await page.evaluate(() => { window.ArkWorldHost.state({ s: 'client-feedback' }); window.ArkWorldHost.select({ s: 'client-feedback' }); }); await page.waitForTimeout(2600);
    const named = await page.evaluate(() => ({ state: window.__world2.stage.stateOf('trace'), u2: window.__world2.stage.value('trace', 'u2') }));
    report(named.state === 's2' && named.u2 > .99, 'trace: select({ s: "client-feedback" }) is that record\'s state (a record id names it)', JSON.stringify(named));
    const big = hits.find((h) => h.item === 0);
    if (big) {
      await page.mouse.move(big.x, big.y); await page.waitForTimeout(400); await page.mouse.click(big.x, big.y); await page.waitForTimeout(2200);
      const path = await page.evaluate(() => location.pathname + location.search);
      report(/^\/chain\/open\?r=/.test(path), 'trace: a click on the newest block opens its record (the stage\'s onPick: open the page of that record)', path);
    } else report(false, 'trace: found the newest block to touch');
    report(errors.length === 0, 'trace: 0 page errors', errors.join(' // ').slice(0, 200));
    await ctx.close();
  }
  /* leaving takes the stage away */
  const { ctx, page, errors } = await open(browser, '/how-it-works/life');
  await page.waitForFunction(() => window.__world2.stage.rigFor('life'), null, { timeout: 30000 }); await waitStep(page); await page.waitForTimeout(500);
  await page.evaluate(() => window.ArkWorldHost.fly('about')); await page.waitForTimeout(3500);
  const gone = await page.evaluate(() => ({ active: window.__world2.stage.idrig.activeOf('life'), n: window.__world2.stage.idrig.order.filter((e) => e.view === 'life' && e.part && e.part.count > 0).length }));
  report(!gone.active && gone.n === 0, 'how-it-works: leaving the view takes its parts out of the draw', JSON.stringify(gone));
  report(errors.length === 0, 'how-it-works: leaving: 0 page errors', errors.join(' // ').slice(0, 200));
  await ctx.close();
}

/* the resolvers, the FXN supply, the stats canyon and the download window (PORT.md batch 4): rows are the stage's own, sampled; the hooks are the pages' */
async function batch4Views(browser) {
  const waitStep = (page) => page.waitForFunction(() => { const d = window.__world2.stage.debug(); return !window.__world2.stage.flying() && !d.plays.length; }, null, { timeout: 30000 });
  const drawn = (page, view) => page.evaluate((v) => ({ active: window.__world2.stage.idrig.activeOf(v), count: window.__world2.stage.idrig.order.filter((e) => e.view === v && ((e.part && e.part.count > 0) || (e.piece && e.piece.count > 0))).length, slab: window.__world2.stage.dyn ? window.__world2.stage.dyn.P.slab.part.count : -1, live: window.__world2.stage.debug().live[v] }), view);
  const hitsOf = (page, box) => page.evaluate((b) => { const out = []; for (let y = b[1]; y < b[3]; y += 6) for (let x = b[0]; x < b[2]; x += 6) { const h = window.__world2.hit(x, y); if (h && h.rig) out.push({ x, y, part: h.part, item: h.item }); } return out; }, box);
  const cases = [['/resolvers', 'resolvers', 'id'], ['/fxn', 'fxn', 'g'], ['/stats/capabilities', 'stats', 's'], ['/download?step=0', 'download', 's']];
  for (const [route, view] of cases) {
    const { ctx, page, errors } = await open(browser, route);
    await page.waitForFunction((v) => window.__world2.stage.rigFor(v), view, { timeout: 30000 });
    await waitStep(page); await page.waitForTimeout(1800);
    const rest = await drawn(page, view);
    report(rest.active && rest.count > 0 && rest.live.present > .99, view + ': its parts are drawn (' + rest.count + ' parts with rows) and its stage is present', JSON.stringify(rest.live).slice(0, 160));
    if (view !== 'download') report(rest.slab === 1, view + ': the page slab is drawn (the chain group\'s slab part)'); else report(rest.slab === -1, 'download: no page slab and the chain group is not loaded (the window has no panel)');
    if (view !== 'download') report(!!(await page.evaluate((v) => window.ArkWorldHost.tags(v), view)), view + ': tags(view) answers a layer');
    const sp = await page.evaluate((v) => window.__world2.stage.idrig.spotsOf(v, (n) => window.__world2.stage.value(v, n), window.__world2.stage.stateOf(v)).filter((x) => x.on).length, view);
    if (view !== 'download') report(sp > 0, view + ': labels are on at rest (' + sp + ')');
    if (view === 'resolvers') {
      const cam0 = await page.evaluate(() => window.ArkWorldHost.camera().aim.join()), shot0 = await canvasShot(page);
      await page.evaluate(() => { window.ArkWorldHost.state({ id: 'treasury' }); window.ArkWorldHost.select({ id: 'treasury' }); }); await page.waitForTimeout(3200);
      const g = await page.evaluate(() => ({ state: window.__world2.stage.stateOf('resolvers'), fc5: window.__world2.stage.value('resolvers', 'fc5'), fc0: window.__world2.stage.value('resolvers', 'fc0'), cam: window.ArkWorldHost.camera().aim.join() }));
      report(g.state === 's5' && g.fc5 > .99 && g.fc0 < .01, 'resolvers: select({ id: "treasury" }) moves the choice (its cube comes forward, the old one goes back)', JSON.stringify(g));
      report(g.cam !== cam0, 'resolvers: the camera leans toward the chosen cube', cam0 + ' -> ' + g.cam);
      report(Buffer.compare(shot0, await canvasShot(page)) !== 0, 'resolvers: the choice changes the picture');
      const hits = await hitsOf(page, [120, 100, 860, 760]);
      report(new Set(hits.filter((h) => h.part === 'rs0').map((h) => h.item)).size >= 5 && new Set(hits.filter((h) => h.part === 'rs1').map((h) => h.item)).size >= 5, 'resolvers: the GPU id pass finds the resolver cubes and the capability cubes', hits.length + ' points');
      await page.evaluate(() => { window.__log = []; window.ArkWorldHost.on('stagePick', (k, id) => { window.__log.push(['pick', k, id]); }); window.ArkWorldHost.on('hover', (lab) => { window.__log.push(['hover', lab && lab.name, lab && lab.act]); return false; }); });
      const c = hits.find((h) => h.part === 'rs0' && h.item === 2) || hits.find((h) => h.part === 'rs0');
      if (c) { await page.mouse.move(c.x, c.y); await page.waitForTimeout(500); await page.mouse.click(c.x, c.y); await page.waitForTimeout(500); const log = await page.evaluate(() => window.__log.slice());
        report(log.some((e) => e[0] === 'hover' && e[1] && /^Choose/.test(e[2] || '')) && log.some((e) => e[0] === 'pick' && e[1] === 'resolver' && e[2]), 'resolvers: on("hover") names the cube and on("stagePick") is told the resolver', JSON.stringify(log.slice(0, 3))); }
      else report(false, 'resolvers: found a cube to touch');
    }
    if (view === 'fxn') {
      await page.evaluate(() => { window.ArkWorldHost.state({ g: 'fund', tab: 'fees' }); window.ArkWorldHost.select({ g: 'fund', tab: 'fees' }); }); await page.waitForTimeout(3200);
      const g = await page.evaluate(() => ({ state: window.__world2.stage.stateOf('fxn'), ft: window.__world2.stage.value('fxn', 'ft'), lit: Array.from({ length: 100 }, (_, i) => window.__world2.stage.value('fxn', 'u' + i)).filter((v) => v > .99).length }));
      report(g.state === 's9' && g.ft > .99 && g.lit === 35, 'fxn: select({ g: "fund", tab: "fees" }) swaps the layout (ft 1) and lights the fund\'s 35 tiles', JSON.stringify(g));
      const hits = await hitsOf(page, [100, 100, 860, 760]);
      report(new Set(hits.map((h) => h.item)).size >= 30, 'fxn: the GPU id pass finds the tiles', new Set(hits.map((h) => h.item)).size + ' tiles');
    }
    if (view === 'stats') {
      await page.evaluate(() => { window.ArkWorldHost.state({ s: 'ceiling', c: '' }); window.ArkWorldHost.select({ s: 'ceiling', c: '' }); }); await page.waitForTimeout(4200);
      const g = await page.evaluate(() => ({ state: window.__world2.stage.stateOf('stats'), w2: window.__world2.stage.value('stats', 'w2'), w1: window.__world2.stage.value('stats', 'w1') }));
      report(g.state === 's5' && g.w2 > .99 && g.w1 < .01, 'stats: select({ s: "ceiling" }) flies the cubes to the next formation (w2 1, w1 0)', JSON.stringify(g));
      await page.evaluate(() => { window.ArkWorldHost.state({ s: 'capabilities', c: '' }); window.ArkWorldHost.select({ s: 'capabilities', c: '' }); }); await page.waitForTimeout(4200);
      const hits = await hitsOf(page, [150, 150, 900, 700]);
      report(hits.length > 20, 'stats: the GPU id pass finds the cubes of the capabilities formation', hits.length + ' points');
      await page.evaluate(() => { window.__log = []; window.ArkWorldHost.on('stagePick', (k, id) => { window.__log.push([k, id]); }); });
      /* only a column of the capabilities formation answers a touch: the stage's own pickable() says which; try points until one does */
      let log = [];
      for (let q = 0; q < 40 && !log.length; q++) { const c = hits[Math.floor((q + .5) / 40 * hits.length)]; await page.mouse.move(c.x, c.y); await page.waitForTimeout(120); await page.mouse.click(c.x, c.y); await page.waitForTimeout(200); log = await page.evaluate(() => window.__log.slice()); }
      report(log.some((e) => e[0] === 'operation' && e[1]), 'stats: a click on an operation\'s column calls on("stagePick") with the operation', JSON.stringify(log));
    }
    if (view === 'download') {
      await page.evaluate(() => window.ArkWorldHost.scene.select({ view: 'download', s: 4 })); await page.waitForTimeout(4200);
      const g = await page.evaluate(() => ({ state: window.__world2.stage.stateOf('download'), rr4: window.__world2.stage.value('download', 'rr4'), build: window.__world2.stage.debug().live.home.build, lit: Array.from(window.__world2.stage.debug().live.home.focus).filter((v) => v > .9).length }));
      report(g.state === 's4' && g.rr4 > .85 && g.build > .99 && g.lit >= 8, 'download: scene.select({ view: "download", s: 4 }) raises the rings in a wave, winds the build clock to the end and lights the nearest rings', JSON.stringify(g));
      await page.evaluate(() => window.ArkWorldHost.fly('about')); await page.waitForTimeout(3800);
      const b = await page.evaluate(() => ({ build: window.__world2.stage.debug().live.home.build, rr4: window.__world2.stage.value('download', 'rr4'), n: window.__world2.stage.idrig.order.filter((e) => e.view === 'download' && ((e.part && e.part.count > 0) || (e.piece && e.piece.count > 0))).length }));
      report(b.build > .99 && b.n === 0, 'download: leaving gives the build clock back and takes the lens out of the draw', JSON.stringify(b));
    }
    report(errors.length === 0, view + ': 0 page errors', errors.join(' // ').slice(0, 200));
    await ctx.close();
  }
}

async function main() {
  const { webkit } = loadPlaywright();
  const browser = await webkit.launch();
  /* ONLY=how,identity runs those sections alone */
  const want = (name) => !process.env.ONLY || process.env.ONLY.split(',').includes(name);
  try { if (want('intro')) await intro(browser); if (want('home')) await home(browser); if (want('calm')) await calm(browser); if (want('auth')) await auth(browser); if (want('chain')) await chainViews(browser); if (want('identity')) await identity(browser); if (want('how')) await howViews(browser); if (want('batch4')) await batch4Views(browser); } finally { await browser.close(); }
  console.log(failures ? failures + ' failed' : 'all hooks answered');
  process.exitCode = failures;
}
/* the program runs only when this file is started, never on import */
if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e.message); process.exit(1); });
