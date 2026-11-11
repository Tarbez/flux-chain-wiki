#!/usr/bin/env node
/* SPEED RUN: the one measuring tool for the site's load speed (2026-11-11, owner order "audit the speed and improve it"). Layer: ops (a measuring
   tool, nothing shipped). It drives a running FXN browser over the DevTools protocol only (no Playwright, no Puppeteer, no headless Chrome), and
   needs nothing but Node 22 or newer (built-in fetch and WebSocket), so the one file can be copied to a build node and run there.

   WHAT IT IS     One command that loads site pages in the FXN browser and writes what a visitor waits for, with the device and the settings in
                  every result file.
   WHAT YOU DO    1. Serve a site cut behind the real Caddy block and start an FXN browser with --remote-debugging-port (the rig on the build
                     node: .scratch-archive/2fa4070e/speed/lane3/node/ setup.sh and browser.sh).
                  2. node scripts/speed-run.mjs run --cdp 9455 --site https://defxn.com --out <folder> --label before
                  3. node scripts/speed-run.mjs report <folder>
                  4. node scripts/speed-run.mjs compare <before folder> <after folder>
   WHAT YOU GET   <folder>/runs/*.json (one per load: marks, every request, long tasks, frame gaps), <folder>/REPORT.md (medians and the
                  run-to-run spread), and from compare a BEFORE/AFTER table that says "no measurable change" when the two ranges overlap.

   run options    --pages home,keepers,capacity,game,id,learn,auth   (default: all seven)
                  --cells cable:1,cable:4,4g:1   the net:cpu pairs to run, in place of every --nets x --cpus pair
                  --nets cable,4g        cable = 50 Mbit/s down, 10 up, 20 ms; 4g = 4 Mbit/s down, 3 up, 100 ms (DevTools throttling: it delays
                                         each answer and caps the bytes per second; it does not model a handshake, and cache hits are not delayed)
                  --cpus 1,4             DevTools CPU throttle rate (4 = the main thread gets a quarter of the time)
                  --cache cold,warm      cold: the browser's HTTP cache is cleared before the load. warm: the cache as the load before left it.
                  --runs 5               loads per cell
                  --profile              one more warm load per page under V8's sampling profiler: main-thread time by file (top 15). The
                                         profiler slows the load, so that load's times are not in the tables.
                  --repeat               the repeat visit: home (cold), then a click to /fxn/keepers, then Back to the home, in one session
                  --size 1440x900        asks the browser window for this page size; the size the page really had is in every result
                  --note "<text>"        free text kept in every result (the machine's load, what else ran)

   THE MARKS (milliseconds from the navigation's start, read in the page):
     firstPaint, firstContentfulPaint   the browser's own paint entries
     words          the page's headline (.intro-portal-headline, else the first h1) is on screen: it has a size, every ancestor's opacity multiplies
                    to 0.9 or more, and the loader does not cover its centre
     view3d         the 3D view's first `drawn` message reached the page (the object is drawn, on any stage frame)
     filmStart      home only: the loader went live (html.plaza-live): the 3D ground shows and the first stop starts
     filmStopsEnd   home only: the loader's `plaza-open` event: the 15 stops have held
     settled        home: the `ark-hero-settled` event (HEROIN has held, the hero stands). topic: the object is in its slot (the stage's topic
                    frame is drawn and shown). other pages: `words` and no request for 1.5 s.
   THE FILM IS A DESIGNED LENGTH, NOT A COST. The 15 stops last 2.5 to 5.2 s by design (js/loader-plaza.js FEEL) and HEROIN has its own length. The
   report splits the home's time into "waiting" (navigation to filmStart: bytes and CPU) and "film" (filmStart to settled). Speed work shortens the
   first. The second is shortened only where it runs OVER its designed length, which the report prints beside it.

   A number from this tool is a fact about the machine it ran on. REPORT.md starts with that machine: the WebGL renderer, the cores, the page size,
   the machine's load average at the start and end (pass it with --note), and the throttles. Do not quote a time without them. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const NETS = {
  cable: { name: 'fast cable', down: 50e6 / 8, up: 10e6 / 8, latency: 20, text: '50 Mbit/s down, 10 up, 20 ms' },
  '4g': { name: 'slow 4G', down: 4e6 / 8, up: 3e6 / 8, latency: 100, text: '4 Mbit/s down, 3 up, 100 ms' },
  /* no throttle: the bare loopback line. It shows the chain and the CPU with no line cost, and it never shows the throttle stall. */
  none: { name: 'no throttle', down: -1, up: -1, latency: 0, text: 'no throttle (loopback)' },
};
export const PAGES = {
  home: { path: '/', kind: 'home' }, keepers: { path: '/fxn/keepers', kind: 'topic' }, capacity: { path: '/fxn/capacity', kind: 'topic' },
  game: { path: '/fxn/game', kind: 'topic' }, id: { path: '/fxn/id', kind: 'topic' }, learn: { path: '/learn', kind: 'page' }, auth: { path: '/auth', kind: 'page' },
};
export const KINDS = ['shell', 'siteJs', 'css', 'fonts', 'viewModules', 'viewData', 'document', 'meshes', 'pictures', 'other'];
/* what a request is, from its address alone (the cut's own layout: scripts/cut-site.mjs) */
export function kindOf(url, type) {
  let p; try { p = new URL(url).pathname; } catch { return 'other'; }
  if (/\.(woff2?|ttf|otf)$/.test(p) || type === 'Font') return 'fonts';
  if (p.startsWith('/fxn-3d/')) {
    if (/\/edit\/[^/]+\.fxn\.gz$/.test(p)) return 'document';
    if (/\/blob\/[^/]+\.(pack|mesh)$/.test(p)) return 'meshes';
    if (/\.(png|jpe?g|webp|img|hdr)$/.test(p)) return 'pictures';
    if (/\.(mjs|cjs|js|html|css)$/.test(p)) return 'viewModules';
    return 'viewData';
  }
  if (type === 'Document' || /\.html$/.test(p)) return 'shell';
  if (p.startsWith('/js/')) return 'siteJs';
  if (p.startsWith('/css/') || /\.css$/.test(p)) return 'css';
  return 'other';
}

/* The FXN browser cancels a DevTools navigation that leaves the tab's site (net::ERR_BLOCKED_BY_CLIENT, its before-navigation hook), and it turns
   about:blank into a search. So the tab is first moved onto the site the way a person does it (the shell's own navigate()), and between loads it
   rests on this small text file of the site. */
const REST = '/robots.txt';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const lo = (a) => { const s = a.filter((x) => x != null); return s.length ? Math.min(...s) : null; };
const hi = (a) => { const s = a.filter((x) => x != null); return s.length ? Math.max(...s) : null; };

/* runs in the page before any of its scripts. Times are kept as wall-clock milliseconds (timeOrigin + now), so a click inside the site can start a
   new leg without a new document. Only the top document records: the stage's frames run on the same thread. */
const INIT = `(() => {
  if (window !== window.top || window.__sp) return;
  const T = () => performance.timeOrigin + performance.now();
  const m = window.__sp = { origin: performance.timeOrigin, marks: {}, held: [], long: [], gaps: [], raf: 0, lost: 0, csp: [] };
  const mark = (k) => { if (!(k in m.marks)) m.marks[k] = T(); };
  m.reset = () => { m.marks = {}; m.held = []; m.long = []; m.gaps = []; m.raf = 0; return T(); };
  addEventListener('message', (e) => { const d = e.data; if (!d || !d.siteView) return; if (d.drawn) mark('view3d'); if (d.lost) m.lost++; if (d.held) m.held.push([T(), String(d.held).slice(0, 40)]); });
  for (const ev of ['plaza-drawn', 'plaza-open', 'plaza-assembled', 'ark-hero-settled', 'load']) addEventListener(ev, () => mark('ev:' + ev));
  addEventListener('securitypolicyviolation', (e) => { if (m.csp.length < 20) m.csp.push(e.violatedDirective + ' ' + e.blockedURI); });
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) m.long.push([performance.timeOrigin + e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true }); } catch (e) { m.longError = String(e); }
  const seen = (el) => { const r = el.getBoundingClientRect(); if (r.width < 10 || r.height < 6) return false; let o = 1;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.visibility === 'hidden' || cs.display === 'none') return false; o *= Number(cs.opacity); if (o < 0.9) return false; }
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !(top && top.closest && top.closest('#world-loader')); };
  const look = () => {
    const root = document.documentElement; if (!root) return;
    if (!m.marks.words) { const h = document.querySelector('.intro-portal-headline') || document.querySelector('h1'); if (h && h.textContent.trim() && seen(h)) mark('words'); }
    if (root.classList.contains('plaza-live')) mark('filmStart');
    if (root.classList.contains('plaza-done')) mark('loaderGone');
    if (document.querySelector('.site-stage-frame[data-stage-frame="topic"].is-shown.is-drawn')) mark('objectInSlot');
  };
  let last = 0;
  const step = (t) => { m.raf++; if (last && t - last > 33) m.gaps.push([performance.timeOrigin + last, t - last]); last = t; look(); requestAnimationFrame(step); };
  requestAnimationFrame(step); setInterval(look, 100);
})()`;

async function cdp(port, match) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const t = list.find(match); if (!t) throw new Error(`speed-run: no DevTools target matched on port ${port}. Targets: ${list.map((x) => x.type + ' ' + x.url).join(', ') || 'none'}. Start the FXN browser with --remote-debugging-port=${port} and open one tab.`);
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = () => j(new Error('speed-run: the DevTools socket refused ' + t.webSocketDebuggerUrl)); });
  let id = 0; const wait = new Map(); const subs = new Set();
  ws.onmessage = (e) => { const msg = JSON.parse(e.data); if (msg.id && wait.has(msg.id)) { wait.get(msg.id)(msg); wait.delete(msg.id); } else if (msg.method) for (const f of subs) f(msg); };
  const send = (method, params = {}, sessionId) => new Promise((r) => { const n = ++id; wait.set(n, r); ws.send(JSON.stringify(sessionId ? { id: n, method, params, sessionId } : { id: n, method, params })); });
  const ev = async (expression, ms = 8000) => { const r = await Promise.race([send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }), sleep(ms).then(() => null)]); return r && r.result && r.result.result ? r.result.result.value : undefined; };
  return { send, ev, on: (f) => { subs.add(f); return () => subs.delete(f); }, close: () => ws.close(), target: t };
}

/* collects every request of one leg from the Network events */
function netWatch(c) {
  const req = new Map();
  const off = c.on((msg) => {
    const p = msg.params, s = msg.sessionId || '';
    if (msg.method === 'Target.attachedToTarget') { c.send('Network.enable', {}, p.sessionId); return; }
    /* a socket dial is not a request: it is kept apart, with when it was dialled on the Network clock */
    if (msg.method === 'Network.webSocketCreated') { req.sockets = req.sockets || []; req.sockets.push(p.url); return; }
    if (!p || !p.requestId) return; const k = s + p.requestId;
    if (msg.method === 'Network.requestWillBeSent') {
      if (p.request.url.startsWith('data:') || p.request.url.startsWith('blob:')) return;
      /* a redirect reuses the id: keep the hop as its own row */
      if (req.has(k) && p.redirectResponse) { const old = req.get(k); old.end = p.timestamp; old.status = p.redirectResponse.status; req.set(k + '#' + old.start, old); }
      req.set(k, { url: p.request.url, type: p.type, start: p.timestamp, wall: p.wallTime, priority: p.request.initialPriority, initiator: p.initiator && p.initiator.type, frame: p.frameId });
      return;
    }
    const r = req.get(k); if (!r) return;
    /* a cached file the browser asked the server about: the page sees 200, the wire carried a 304 */
    if (msg.method === 'Network.responseReceivedExtraInfo') { if (p.statusCode === 304) r.revalidated = true; }
    else if (msg.method === 'Network.requestServedFromCache') r.memoryCache = true;
    else if (msg.method === 'Network.responseReceived') { const h = {}; for (const [a, b] of Object.entries(p.response.headers || {})) h[a.toLowerCase()] = b;
      r.status = p.response.status; r.diskCache = !!p.response.fromDiskCache; r.protocol = p.response.protocol; r.conn = p.response.connectionId; r.reused = p.response.connectionReused;
      r.encoding = h['content-encoding'] || ''; r.cacheControl = h['cache-control'] || ''; r.mime = p.response.mimeType; r.type = p.type || r.type;
      if (p.response.timing) r.ttfb = p.response.timing.receiveHeadersEnd; }
    else if (msg.method === 'Network.dataReceived') r.body = (r.body || 0) + p.dataLength;
    else if (msg.method === 'Network.loadingFinished') { r.end = p.timestamp; r.bytes = p.encodedDataLength; }
    else if (msg.method === 'Network.loadingFailed') { r.end = p.timestamp; r.failed = p.errorText || 'failed'; r.bytes = r.bytes || 0; }
  });
  return { req, off };
}

/* turns a leg's requests and page record into one result. base = the leg's start as wall-clock ms */
function fold(reqMap, page, base, kind) {
  const rows = [...reqMap.values()].filter((r) => r.wall != null);
  /* the Network clock is monotonic seconds; a request's wallTime ties it to the page's wall clock */
  const anchor = rows[0]; const toMs = (ts) => (anchor.wall + (ts - anchor.start)) * 1000 - base;
  const requests = rows.map((r) => ({ url: r.url, kind: kindOf(r.url, r.type), type: r.type, start: Math.round(toMs(r.start)), end: r.end == null ? null : Math.round(toMs(r.end)), bytes: r.bytes == null ? null : Math.round(r.bytes),
    body: r.body || 0, status: r.status || 0, from: r.failed ? 'failed' : r.memoryCache ? 'memory' : r.revalidated || r.status === 304 ? 'revalidated' : r.diskCache ? 'disk' : 'network', failed: r.failed || undefined,
    protocol: r.protocol, conn: r.conn, encoding: r.encoding, cacheControl: r.cacheControl, priority: r.priority, mime: r.mime }));
  const rel = (v) => (v == null ? null : Math.round(v - base));
  const pm = page.marks || {};
  const marks = { firstPaint: page.fp == null ? null : Math.round(page.fp + page.origin - base), firstContentfulPaint: page.fcp == null ? null : Math.round(page.fcp + page.origin - base),
    words: rel(pm.words), view3d: rel(pm.view3d), filmStart: rel(pm.filmStart), filmStopsEnd: rel(pm['ev:plaza-open']), heroSettled: rel(pm['ev:ark-hero-settled']),
    objectInSlot: rel(pm.objectInSlot), loaderGone: rel(pm.loaderGone), loadEvent: rel(pm['ev:load']) };
  marks.settled = kind === 'home' ? marks.heroSettled : kind === 'topic' ? marks.objectInSlot : null;
  const before = {};
  for (const [name, at] of Object.entries(marks)) {
    if (at == null) continue; const by = {}; let n = 0, b = 0;
    for (const r of requests) { if (r.end == null || r.end > at) continue; n++; b += r.bytes || 0; const k = by[r.kind] || (by[r.kind] = { n: 0, bytes: 0 }); k.n++; k.bytes += r.bytes || 0; }
    before[name] = { requests: n, bytes: b, by };
  }
  const long = (page.long || []).map(([t, d]) => [Math.round(t - base), Math.round(d)]).filter(([t]) => t >= 0);
  const gaps = (page.gaps || []).map(([t, d]) => [Math.round(t - base), Math.round(d)]).filter(([t]) => t >= 0);
  const end = marks.settled ?? marks.words ?? Infinity;
  const longIn = long.filter(([t]) => t <= end);
  const film = marks.filmStart != null && marks.heroSettled != null ? gaps.filter(([t]) => t >= marks.filmStart && t <= marks.heroSettled) : null;
  const from = {}; for (const r of requests) from[r.from] = (from[r.from] || 0) + 1;
  return { marks, before, requests, held: (page.held || []).map(([t, h]) => [Math.round(t - base), h]),
    longTasks: { count: longIn.length, total: longIn.reduce((a, [, d]) => a + d, 0), worst: longIn.reduce((a, [, d]) => Math.max(a, d), 0), list: long },
    filmFrames: film ? { over33: film.length, worst: film.reduce((a, [, d]) => Math.max(a, d), 0), lost: film.reduce((a, [, d]) => a + d - 16.7, 0) | 0 } : null,
    frames: page.raf, gaps, from, connections: new Set(requests.map((r) => r.conn).filter(Boolean)).size, protocols: [...new Set(requests.map((r) => r.protocol).filter(Boolean))],
    lost: page.lost, csp: page.csp, sockets: reqMap.sockets || [], totals: { requests: requests.length, bytes: requests.reduce((a, r) => a + (r.bytes || 0), 0), failed: requests.filter((r) => r.failed).map((r) => r.failed + ' ' + r.url) } };
}

const READ = `(() => { const m = window.__sp; if (!m) return null; const p = performance.getEntriesByType('paint'); const g = (n) => { const e = p.find((x) => x.name === n); return e ? e.startTime : null; };
  return JSON.stringify({ origin: m.origin, marks: m.marks, held: m.held, long: m.long, gaps: m.gaps, raf: m.raf, lost: m.lost, csp: m.csp, fp: g('first-paint'), fcp: g('first-contentful-paint'), href: location.href, size: innerWidth + 'x' + innerHeight }); })()`;

/* waits for the leg's end. Returns the reason it stopped. Bounded: never longer than `ms`. */
async function untilDone(c, kind, net, ms) {
  const started = Date.now(); let quietSince = Date.now(), open = 0, seenWords = 0;
  const off = c.on((msg) => { if (msg.method === 'Network.requestWillBeSent') { open++; quietSince = Date.now(); } else if (msg.method === 'Network.loadingFinished' || msg.method === 'Network.loadingFailed') { open = Math.max(0, open - 1); quietSince = Date.now(); } });
  try {
    while (Date.now() - started < ms) {
      const s = await c.ev(`(() => { const m = window.__sp && window.__sp.marks; if (!m) return ''; return (m['ev:ark-hero-settled'] ? 'H' : '') + (m.objectInSlot ? 'O' : '') + (m.words ? 'W' : ''); })()`, 4000) || '';
      if (kind === 'home' && s.includes('H')) return 'hero settled';
      if (kind === 'topic' && s.includes('O')) return 'object in slot';
      if (kind === 'page' && s.includes('W')) { seenWords = seenWords || Date.now(); if (Date.now() - quietSince > 1500 && Date.now() - seenWords > 300) return 'words and a quiet network'; }
      await sleep(200);
    }
    return 'TIMEOUT after ' + ms + ' ms';
  } finally { off(); }
}

async function memory(c) {
  const r = await c.send('Performance.getMetrics'); const o = {}; for (const x of (r.result && r.result.metrics) || []) o[x.name] = x.value;
  return { jsHeapUsed: o.JSHeapUsedSize ?? null, jsHeapTotal: o.JSHeapTotalSize ?? null, nodes: o.Nodes ?? null, documents: o.Documents ?? null, frames: o.Frames ?? null };
}

function profileByFile(profile) {
  const self = new Map(); const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  profile.samples.forEach((id, i) => { const n = byId.get(id); if (!n) return; const f = n.callFrame; let key = f.url ? f.url.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '') : '(' + (f.functionName || 'native') + ')';
    self.set(key, (self.get(key) || 0) + (profile.timeDeltas[i] || 0) / 1000); });
  const all = [...self.entries()].sort((a, b) => b[1] - a[1]);
  return { sampledMs: Math.round((profile.endTime - profile.startTime) / 1000), top: all.filter(([k]) => k !== '(idle)').slice(0, 15).map(([file, ms]) => ({ file, ms: Math.round(ms) })), idleMs: Math.round(self.get('(idle)') || 0) };
}

async function oneLoad(c, o) {
  const { site, page, net, cpu, cache, profile } = o; const N = NETS[net];
  await c.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await c.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  /* every load starts from the site's own smallest file, so the page before is gone and the tab never leaves the site (REST, below) */
  await c.send('Page.navigate', { url: site + REST }); await sleep(700);
  if (cache === 'cold') await c.send('Network.clearBrowserCache');
  await c.send('Network.emulateNetworkConditions', { offline: false, latency: N.latency, downloadThroughput: N.down, uploadThroughput: N.up });
  await c.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  const w = netWatch(c);
  if (profile) { await c.send('Profiler.enable'); await c.send('Profiler.setSamplingInterval', { interval: 250 }); await c.send('Profiler.start'); }
  const wall = Date.now();
  await c.send('Page.navigate', { url: site + page.path });
  const ceiling = (page.kind === 'home' ? 60000 : 40000) * (net === '4g' ? 2 : 1) * (cpu > 1 ? 1.5 : 1);
  const ended = await untilDone(c, page.kind, net, ceiling);
  await sleep(1500);
  let prof = null; if (profile) { const r = await c.send('Profiler.stop'); await c.send('Profiler.disable'); if (r.result && r.result.profile) prof = profileByFile(r.result.profile); }
  const raw = await c.ev(READ, 15000); const mem = await memory(c); w.off();
  await c.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  if (!raw) return { ended, error: 'speed-run: the page did not answer the read (its main thread was busy for 15 s, or the page holds no record because the injected script did not run). Reload the tab and run again.', wallMs: Date.now() - wall };
  const pg = JSON.parse(raw); const out = fold(w.req, pg, pg.origin, page.kind);
  return { ended, href: pg.href, size: pg.size, memory: mem, profile: prof, ...out };
}

/* the repeat visit: one session, home (cold) -> a click to /fxn/keepers -> Back to the home */
async function repeatVisit(c, o) {
  const legs = []; const first = await oneLoad(c, { ...o, page: PAGES.home, cache: 'cold' }); legs.push({ leg: 'home, cold', ...first });
  const N = NETS[o.net]; await c.send('Network.emulateNetworkConditions', { offline: false, latency: N.latency, downloadThroughput: N.down, uploadThroughput: N.up });
  await c.send('Emulation.setCPUThrottlingRate', { rate: o.cpu });
  for (const [leg, kind, act] of [['click to /fxn/keepers', 'topic', `(() => { const a = document.querySelector('a[href="/fxn/keepers"], a[href$="/fxn/keepers"]'); if (!a) return 'no link to /fxn/keepers on the page'; a.click(); return 'clicked'; })()`], ['Back to the home', 'home', `(history.back(), 'back')`]]) {
    const w = netWatch(c); const base = await c.ev('window.__sp ? window.__sp.reset() : null'); const did = await c.ev(act);
    const ended = base == null ? 'no page record' : await untilDone(c, kind, o.net, 40000); await sleep(1500);
    const raw = await c.ev(READ, 15000); w.off();
    if (!raw || base == null) { legs.push({ leg, did, ended, error: 'speed-run: no page record for this leg' }); continue; }
    const pg = JSON.parse(raw); const sameDocument = pg.origin < base; const reqs = [...w.req.values()].filter((r) => r.wall != null);
    const out = reqs.length ? fold(w.req, pg, sameDocument ? base : pg.origin, kind) : { marks: { settled: kind === 'home' ? (pg.marks['ev:ark-hero-settled'] ? Math.round(pg.marks['ev:ark-hero-settled'] - base) : null) : (pg.marks.objectInSlot ? Math.round(pg.marks.objectInSlot - base) : null), view3d: pg.marks.view3d ? Math.round(pg.marks.view3d - base) : null, words: pg.marks.words ? Math.round(pg.marks.words - base) : null }, requests: [], from: {}, totals: { requests: 0, bytes: 0, failed: [] } };
    legs.push({ leg, did, ended, sameDocument, href: pg.href, memory: await memory(c), ...out });
  }
  await c.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  return legs;
}

async function device(c, port) {
  const v = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const gl = await c.ev(`(() => { const o = { cores: navigator.hardwareConcurrency, deviceMemory: navigator.deviceMemory || null, dpr: devicePixelRatio, size: innerWidth + 'x' + innerHeight }; const g = document.createElement('canvas').getContext('webgl2'); if (!g) { o.webgl = 'none'; return JSON.stringify(o); } const e = g.getExtension('WEBGL_debug_renderer_info'); o.webgl = e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER); return JSON.stringify(o); })()`);
  let load = null; try { load = fs.readFileSync('/proc/loadavg', 'utf8').trim(); } catch { /* not Linux: pass the load with --note */ }
  return { browser: v.Browser, userAgent: v['User-Agent'], ...(gl ? JSON.parse(gl) : {}), loadAverage: load, platform: process.platform, node: process.version };
}

function args(argv) { const o = { _: [] }; for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1]; if (v === undefined || v.startsWith('--')) o[k] = true; else { o[k] = v; i++; } } else o._.push(a); } return o; }

async function run(o) {
  const port = Number(o.cdp || 9455), site = String(o.site || 'https://defxn.com').replace(/\/$/, ''), out = path.resolve(String(o.out || 'speed-out'));
  const pages = String(o.pages || Object.keys(PAGES).join(',')).split(','), nets = String(o.nets || 'cable,4g').split(','), cpus = String(o.cpus || '1,4').split(',').map(Number);
  const caches = String(o.cache || 'cold,warm').split(','), runs = Number(o.runs || 5);
  for (const p of pages) if (!PAGES[p]) throw new Error(`speed-run: no page named "${p}". Pages: ${Object.keys(PAGES).join(', ')}.`);
  for (const n of nets) if (!NETS[n]) throw new Error(`speed-run: no network profile named "${n}". Profiles: ${Object.keys(NETS).join(', ')}.`);
  fs.mkdirSync(path.join(out, 'runs'), { recursive: true });
  const isShell = (x) => x.type === 'page' && String(x.url).includes('renderer/index.html'), onSite = (x) => x.type === 'webview' && String(x.url).startsWith(site);
  if (!(await (await fetch(`http://127.0.0.1:${port}/json`)).json()).some(onSite)) { const s = await cdp(port, isShell); await s.ev(`(() => { navigate(${JSON.stringify(site + REST)}); return 1; })()`); s.close(); await sleep(3000); }
  if (o.size) { const [W, H] = String(o.size).split('x').map(Number); try { for (let i = 0; i < 2; i++) { const s = await cdp(port, isShell); const v0 = await cdp(port, onSite); const [w, h] = (await v0.ev('innerWidth+"x"+innerHeight')).split('x').map(Number); v0.close(); if (w !== W || h !== H) await s.ev(`window.resizeTo(window.outerWidth + ${W} - ${w}, window.outerHeight + ${H} - ${h}); 1`); s.close(); await sleep(1200); } } catch (e) { console.error('speed-run: the window was not resized (' + e.message + '). The page size it really has is in every result.'); } }
  const c = await cdp(port, onSite);
  await c.send('Page.enable'); await c.send('Network.enable'); await c.send('Runtime.enable'); await c.send('Performance.enable');
  await c.send('Network.setCacheDisabled', { cacheDisabled: false });
  await c.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: INIT });
  const meta = { label: o.label || '', note: o.note || '', site, started: new Date().toISOString(), device: await device(c, port), nets: Object.fromEntries(nets.map((n) => [n, NETS[n].text])), cpus, caches, runs, pages };
  fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify(meta, null, 1));
  console.log(`speed-run: ${meta.device.webgl} | ${meta.device.cores} cores | page ${meta.device.size} | load ${meta.device.loadAverage}`);
  const pairs = o.cells ? String(o.cells).split(',').map((x) => { const [n, c] = x.split(':'); if (!NETS[n] || !(Number(c) >= 1)) throw new Error(`speed-run: --cells takes net:cpu pairs such as cable:1,cable:4,4g:1. "${x}" is not one.`); return [n, Number(c)]; }) : nets.flatMap((n) => cpus.map((c) => [n, c]));
  for (const p of pages) for (const [net, cpu] of pairs) for (const cache of caches) for (let i = 1; i <= runs; i++) {
    const name = `${p}.${net}.cpu${cpu}.${cache}.${i}`;
    /* the first warm load of a cell needs a filled cache: the cold loads before it filled it, or this one extra load does */
    if (cache === 'warm' && i === 1 && !caches.includes('cold')) await oneLoad(c, { site, page: PAGES[p], net: 'cable', cpu: 1, cache: 'cold' });
    let load = null; try { load = fs.readFileSync('/proc/loadavg', 'utf8').split(' ').slice(0, 3).join(' '); } catch { /* not Linux */ }
    const r = await oneLoad(c, { site, page: PAGES[p], net, cpu, cache });
    fs.writeFileSync(path.join(out, 'runs', name + '.json'), JSON.stringify({ page: p, kind: PAGES[p].kind, net, cpu, cache, run: i, loadAverage: load, ...r }));
    const m = r.marks || {}; console.log(`${name}: ${r.error || r.ended} | paint ${m.firstPaint} words ${m.words} 3d ${m.view3d} settled ${m.settled} | ${r.totals ? r.totals.requests + ' req ' + Math.round(r.totals.bytes / 1024) + ' KB' : ''} | load ${load}`);
  }
  if (o.profile) for (const p of pages) { const r = await oneLoad(c, { site, page: PAGES[p], net: 'cable', cpu: 1, cache: 'warm', profile: true }); fs.writeFileSync(path.join(out, 'runs', `${p}.profile.json`), JSON.stringify({ page: p, profiled: true, ended: r.ended, profile: r.profile, marks: r.marks })); console.log(`${p}.profile: ${r.ended}`); }
  if (o.repeat) for (const net of nets) for (let i = 1; i <= runs; i++) { const legs = await repeatVisit(c, { site, net, cpu: 1 }); fs.writeFileSync(path.join(out, 'runs', `repeat.${net}.${i}.json`), JSON.stringify({ repeat: true, net, run: i, legs })); console.log(`repeat.${net}.${i}: ` + legs.map((l) => `${l.leg}: ${l.ended}, settled ${l.marks && l.marks.settled}, ${l.totals ? l.totals.requests : '?'} req`).join(' | ')); }
  await c.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  meta.ended = new Date().toISOString(); try { meta.loadAverageEnd = fs.readFileSync('/proc/loadavg', 'utf8').trim(); } catch { /* not Linux */ }
  fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify(meta, null, 1)); c.close();
  console.log(report(out));
}

function cells(dir) {
  const runs = fs.readdirSync(path.join(dir, 'runs')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, 'runs', f), 'utf8')));
  /* a load that never started, timed out or stalled is counted apart and is in no cell (leftOut, below) */
  const by = new Map(), left = []; for (const r of runs) { if (r.profiled || r.repeat) continue; const k = `${r.page}|${r.net}|cpu${r.cpu}|${r.cache}`; const why = leftOut(r); if (!by.has(k)) by.set(k, []); if (why) left.push({ k, run: r.run, why, requests: r.totals ? r.totals.requests : 0 }); else by.get(k).push(r); }
  return { by, left, profiles: runs.filter((r) => r.profiled), repeats: runs.filter((r) => r.repeat) };
}
/* THE THROTTLE STALL (2026-11-11, found by the 3D lane: 0 of 92 loads without a throttle stalled). Under DevTools network throttling the one
   HTTP/2 connection sometimes leaves many requests unanswered for 20 s or for good. It is the rig's defect, not the site's, so such a load is
   counted and never averaged in. The sign: 20 or more requests that were never answered or took over 15 s each. */
export function leftOut(r) {
  if (r.error) return r.error; if (String(r.ended).startsWith('TIMEOUT')) return r.ended;
  const slow = (r.requests || []).filter((q) => !q.failed && (q.end == null || q.end - q.start > 15000)).length;
  return slow >= 20 ? `stalled: ${slow} requests unanswered or over 15 s each` : null;
}
const ms = (a) => { const m = median(a); return m == null ? 'not reached' : `${Math.round(m)} (${Math.round(lo(a))} to ${Math.round(hi(a))})`; };
const kb = (n) => (n == null ? '-' : (n / 1024).toFixed(n < 102400 ? 1 : 0));
/* the stops' designed length for a load whose film started `t` ms after the first paint (js/loader-plaza.js FEEL) */
/* when the page first asked for the 3D view's page with a request that was answered (an aborted ask or a HEAD probe that failed does not count) */
const viewAsked = (r) => { const a = r.requests.filter((q) => !q.failed && /\/fxn-3d\/view\/index\.html$/.test(q.url.split('?')[0])).map((q) => q.start); return a.length ? Math.min(...a) : null; };
const stopsDesigned = (t) => Math.max(2500, Math.min(5200, 5200 - Math.max(0, t - 1500)));

export function report(dir) {
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')); const { by, left, profiles, repeats } = cells(dir); const L = [];
  L.push(`# Site speed, ${meta.label || 'run'} (${meta.started})`, '', 'Layer: ops (a measurement). Made by `flux/defxn/scripts/speed-run.mjs`. Every time below is a fact about this machine and these settings.', '');
  L.push(`- Machine: ${meta.device.cores} cores, platform ${meta.device.platform}. Load average at the start: ${meta.device.loadAverage || 'not read'}. At the end: ${meta.loadAverageEnd || 'not read'}.`,
    `- Browser: ${meta.device.browser}. WebGL renderer: ${meta.device.webgl}. Page size ${meta.device.size}, device pixel ratio ${meta.device.dpr}.`,
    `- Site: ${meta.site}. Network profiles (DevTools throttling): ${Object.entries(meta.nets).map(([k, v]) => `${k} = ${v}`).join('; ')}. CPU throttle rates: ${meta.cpus.join(', ')}.`,
    `- ${meta.runs} loads per cell. A cell shows the median and (lowest to highest). Times in ms from the navigation's start.`, meta.note ? `- Note: ${meta.note}` : '', '');
  L.push('## Times', '', '| Page | Net | CPU | Cache | First paint | Words readable | 3D first drawn | Settled | Long tasks: count / total ms / worst ms | Requests | KB on the wire | Runs that timed out |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
  const keys = [...by.keys()].sort((a, b) => { const A = a.split('|'), B = b.split('|'); return meta.pages.indexOf(A[0]) - meta.pages.indexOf(B[0]) || a.localeCompare(b); });
  for (const k of keys) { const rs = by.get(k), [p, net, cpu, cache] = k.split('|'); const g = (f) => rs.map((r) => { try { return f(r); } catch { return null; } });
    L.push(`| ${p} | ${net} | ${cpu.slice(3)}x | ${cache} | ${ms(g((r) => r.marks.firstPaint))} | ${ms(g((r) => r.marks.words))} | ${ms(g((r) => r.marks.view3d))} | ${ms(g((r) => r.marks.settled))} | ${median(g((r) => r.longTasks.count))} / ${Math.round(median(g((r) => r.longTasks.total)) ?? 0)} / ${Math.round(median(g((r) => r.longTasks.worst)) ?? 0)} | ${median(g((r) => r.totals.requests))} | ${kb(median(g((r) => r.totals.bytes)))} | ${left.filter((x) => x.k === k).length} of ${rs.length + left.filter((x) => x.k === k).length} |`); }
  const homes = keys.filter((k) => k.startsWith('home|'));
  if (homes.length) { L.push('', '## The home: waiting against the film', '', 'Waiting = navigation to the film\'s start (bytes and CPU). The film = its start to the settled hero: 15 stops, then HEROIN. The stops\' designed length follows from when the film started (2.5 to 5.2 s). HEROIN\'s designed length is its camera move, 2.25 s, plus its hold.', '', '| Net | CPU | Cache | Waiting (film start) | Stops, measured | Stops, designed | HEROIN, measured | Film frames over 33 ms: count / worst ms |', '|---|---|---|---|---|---|---|---|');
    for (const k of homes) { const rs = by.get(k), [, net, cpu, cache] = k.split('|'); const g = (f) => rs.map((r) => { try { const v = f(r); return Number.isFinite(v) ? v : null; } catch { return null; } });
      L.push(`| ${net} | ${cpu.slice(3)}x | ${cache} | ${ms(g((r) => r.marks.filmStart))} | ${ms(g((r) => r.marks.filmStopsEnd - r.marks.filmStart))} | ${ms(g((r) => stopsDesigned(r.marks.filmStart - r.marks.firstPaint)))} | ${ms(g((r) => r.marks.heroSettled - r.marks.filmStopsEnd))} | ${median(g((r) => r.filmFrames.over33))} / ${median(g((r) => r.filmFrames.worst))} |`); } }
  L.push('', '## Requests and bytes that had finished before each mark (median run of each cell)', '', '| Page | Net | CPU | Cache | Mark | Requests | KB | ' + KINDS.join(' | ') + ' |', '|---|---|---|---|---|---|---|' + KINDS.map(() => '---').join('|') + '|');
  for (const k of keys) { const rs = by.get(k).filter((r) => r.marks), [p, net, cpu, cache] = k.split('|'); if (!rs.length) continue;
    const sorted = rs.slice().sort((a, b) => (a.marks.settled ?? a.marks.words ?? 1e9) - (b.marks.settled ?? b.marks.words ?? 1e9)); const r = sorted[sorted.length >> 1];
    for (const mk of ['firstPaint', 'words', 'view3d', 'settled']) { const b = r.before && r.before[mk]; if (!b) continue; L.push(`| ${p} | ${net} | ${cpu.slice(3)}x | ${cache} | ${mk} | ${b.requests} | ${kb(b.bytes)} | ${KINDS.map((x) => (b.by[x] ? `${b.by[x].n} / ${kb(b.by[x].bytes)}` : '0')).join(' | ')} |`); } }
  L.push('', 'Each kind cell is requests / KB. shell = the page\'s HTML; viewModules = the 3D view\'s pages, scripts and styles; viewData = its text records; document = the object\'s document; meshes = mesh packs; pictures = the view\'s pictures.');
  L.push('', '## Where each answer came from, and memory after the settle (median)', '', '| Page | Net | CPU | Cache | network | revalidated (304) | disk cache | memory cache | failed | Connections | Protocols | JS heap MB | DOM nodes |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const k of keys) { const rs = by.get(k).filter((r) => r.from), [p, net, cpu, cache] = k.split('|'); if (!rs.length) continue; const g = (f) => median(rs.map(f));
    L.push(`| ${p} | ${net} | ${cpu.slice(3)}x | ${cache} | ${g((r) => r.from.network || 0)} | ${g((r) => r.from.revalidated || 0)} | ${g((r) => r.from.disk || 0)} | ${g((r) => r.from.memory || 0)} | ${g((r) => r.from.failed || 0)} | ${g((r) => r.connections)} | ${[...new Set(rs.flatMap((r) => r.protocols))].join(' ')} | ${(g((r) => r.memory.jsHeapUsed) / 1048576).toFixed(1)} | ${g((r) => r.memory.nodes)} |`); }
  if (profiles.length) { L.push('', '## Main-thread time by file (one profiled warm load per page, fast cable, 1x; the profiler slows the load: read the order)', ''); for (const p of profiles) { if (!p.profile) continue; L.push(`### ${p.page} (${p.profile.sampledMs} ms sampled, ${p.profile.idleMs} ms idle)`, '', '| File | Self ms |', '|---|---|', ...p.profile.top.map((t) => `| ${t.file} | ${t.ms} |`), ''); } }
  if (repeats.length) { L.push('', '## The repeat visit (one session: home cold, a click to /fxn/keepers, Back to the home; CPU 1x)', '', '| Net | Leg | Settled ms | 3D first drawn ms | Requests | KB | network | revalidated (304) | disk | memory | Same document |', '|---|---|---|---|---|---|---|---|---|---|---|');
    const byNet = new Map(); for (const r of repeats) (byNet.get(r.net) || byNet.set(r.net, []).get(r.net)).push(r);
    for (const [net, rs] of byNet) for (let i = 0; i < 3; i++) { const legs = rs.map((r) => r.legs[i]).filter((l) => l && l.marks); if (!legs.length) continue; const g = (f) => legs.map((l) => { try { return f(l); } catch { return null; } });
      L.push(`| ${net} | ${legs[0].leg} | ${ms(g((l) => l.marks.settled))} | ${ms(g((l) => l.marks.view3d))} | ${median(g((l) => l.totals.requests))} | ${kb(median(g((l) => l.totals.bytes)))} | ${median(g((l) => l.from.network || 0))} | ${median(g((l) => l.from.revalidated || 0))} | ${median(g((l) => l.from.disk || 0))} | ${median(g((l) => l.from.memory || 0))} | ${i === 0 ? '-' : legs.every((l) => l.sameDocument) ? 'yes' : 'no'} |`); } }
  const text = L.filter((x) => x !== undefined).join('\n') + '\n'; fs.writeFileSync(path.join(dir, 'REPORT.md'), text); return text;
}

/* BEFORE/AFTER. A change counts only when the two cells' ranges (lowest to highest of their runs) do not overlap. */
export function compare(a, b) {
  const A = cells(a).by, B = cells(b).by, ma = JSON.parse(fs.readFileSync(path.join(a, 'meta.json'), 'utf8')), mb = JSON.parse(fs.readFileSync(path.join(b, 'meta.json'), 'utf8')); const L = [];
  L.push(`# Site speed: ${ma.label || 'before'} against ${mb.label || 'after'}`, '', `- Before: ${ma.started}, ${ma.device.webgl}, page ${ma.device.size}, load ${ma.device.loadAverage} to ${ma.loadAverageEnd}.`, `- After: ${mb.started}, ${mb.device.webgl}, page ${mb.device.size}, load ${mb.device.loadAverage} to ${mb.loadAverageEnd}.`,
    '- A cell shows the median and (lowest to highest) of its runs. The verdict is "no measurable change" whenever the two ranges overlap: a difference inside the run-to-run spread is noise.', '', '| Page | Net | CPU | Cache | Mark | Before | After | Verdict |', '|---|---|---|---|---|---|---|---|');
  for (const k of A.keys()) { if (!B.has(k)) continue; const [p, net, cpu, cache] = k.split('|');
    for (const [mk, f] of [['first paint', (r) => r.marks.firstPaint], ['words', (r) => r.marks.words], ['view frame first asked', viewAsked], ['3D first drawn', (r) => r.marks.view3d], ['film start', (r) => r.marks.filmStart], ['LOADSTART held to film start', (r) => { const h = (r.held || []).find((x) => x[1] === 'LOADSTART'); return h && r.marks.filmStart != null ? r.marks.filmStart - h[0] : null; }],
      ['stops measured', (r) => (r.marks.filmStopsEnd == null || r.marks.filmStart == null ? null : r.marks.filmStopsEnd - r.marks.filmStart)], ['stops designed', (r) => (r.marks.filmStart == null ? null : stopsDesigned(r.marks.filmStart - r.marks.firstPaint))], ['settled', (r) => r.marks.settled],
      ['long tasks count', (r) => r.longTasks.count], ['long tasks total', (r) => r.longTasks.total], ['long task worst', (r) => r.longTasks.worst], ['requests', (r) => r.totals.requests], ['KB on the wire', (r) => r.totals.bytes / 1024]]) {
      /* a load that timed out or never started is not in the cell: it is listed under the table */
      const good = (rs) => rs.filter((r) => !r.error && r.marks && !String(r.ended).startsWith('TIMEOUT'));
      const g = (rs) => good(rs).map((r) => { try { const v = f(r); return Number.isFinite(v) ? v : null; } catch { return null; } }); const x = g(A.get(k)), y = g(B.get(k)); if (median(x) == null && median(y) == null) continue;
      let verdict = 'not comparable: a mark was not reached';
      if (median(x) != null && median(y) != null) { const overlap = lo(y) <= hi(x) && lo(x) <= hi(y); const d = median(y) - median(x); verdict = overlap && !(lo(x) === hi(x) && lo(y) === hi(y) && d !== 0) ? 'no measurable change' : d === 0 ? 'equal' : `${d < 0 ? 'faster or fewer' : 'slower or more'} by ${Math.abs(Math.round(d))} (${Math.round(Math.abs(d) / median(x) * 100)}%)`; }
      L.push(`| ${p} | ${net} | ${cpu.slice(3)}x | ${cache} | ${mk} | ${ms(x)} | ${ms(y)} | ${verdict} |`); } }
  L.push('', '## Loads left out of the cells, and loads far from their cell', '');
  for (const [name, dir] of [['before', a], ['after', b]]) { const lf = cells(dir).left.filter((x) => A.has(x.k) && B.has(x.k)); L.push(`- ${name}: ${lf.length} loads left out of the cells.`); for (const x of lf) L.push(`  - ${name} ${x.k.replace(/\|/g, ' ')} run ${x.run}: ${x.why}, ${x.requests} requests.`); }
  for (const [name, M] of [['before', A], ['after', B]]) for (const [k, rs] of M) { if (!A.has(k) || !B.has(k)) continue; const med = median(rs.map((r) => (r.marks ? r.marks.settled : null)));
    for (const r of rs) { const s = r.marks ? r.marks.settled : null; if (s != null && med != null && s > med * 1.5) L.push(`- ${name} ${k.replace(/\|/g, ' ')} run ${r.run}: settled at ${s} ms against a median of ${Math.round(med)} (3D first drawn at ${r.marks.view3d}). Kept in its cell's range.`); } }
  const text = L.join('\n') + '\n'; fs.writeFileSync(path.join(b, 'COMPARE.md'), text); return text;
}

/* THE PAGE CHECK: every page named, at each size, with no throttle and a cold cache. For each: failed requests, answers of 400 or more, console
   errors and thrown errors, whether the 3D drew, and one shot. The size is set with the DevTools device metrics (exact, whatever the window is).
   node scripts/speed-run.mjs check --cdp 9455 --site https://defxn.com --out <folder> --paths /,/fxn/keepers,... --sizes 1440x900,1280x720 */
async function check(o) {
  const port = Number(o.cdp || 9455), site = String(o.site || 'https://defxn.com').replace(/\/$/, ''), out = path.resolve(String(o.out || 'speed-check'));
  const paths = String(o.paths || '/').split(','), sizes = String(o.sizes || '1440x900,1280x720').split(','); fs.mkdirSync(out, { recursive: true });
  const onSite = (x) => x.type === 'webview' && String(x.url).startsWith(site);
  if (!(await (await fetch(`http://127.0.0.1:${port}/json`)).json()).some(onSite)) { const s = await cdp(port, (x) => x.type === 'page' && String(x.url).includes('renderer/index.html')); await s.ev(`(() => { navigate(${JSON.stringify(site + REST)}); return 1; })()`); s.close(); await sleep(3000); }
  const c = await cdp(port, onSite); await c.send('Page.enable'); await c.send('Network.enable'); await c.send('Runtime.enable'); await c.send('Log.enable');
  await c.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); await c.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: INIT }); const rows = [];
  for (const size of sizes) { const [W, H] = size.split('x').map(Number); await c.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    for (const p of paths) {
      const kind = p === '/' ? 'home' : p.startsWith('/fxn/') ? 'topic' : 'page'; const errors = [];
      await c.send('Page.navigate', { url: site + REST }); await sleep(700); await c.send('Network.clearBrowserCache');
      const w = netWatch(c); const off = c.on((msg) => { const q = msg.params; if (msg.sessionId) return;
        if (msg.method === 'Runtime.consoleAPICalled' && q.type === 'error') errors.push('console.error: ' + q.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 240));
        if (msg.method === 'Runtime.exceptionThrown') errors.push('thrown: ' + String((q.exceptionDetails.exception && q.exceptionDetails.exception.description) || q.exceptionDetails.text).slice(0, 240));
        if (msg.method === 'Log.entryAdded' && q.entry.level === 'error') errors.push('log error: ' + q.entry.text.slice(0, 200) + ' ' + (q.entry.url || '')); });
      await c.send('Page.navigate', { url: site + p }); const ended = await untilDone(c, kind, 'none', 45000); await sleep(2500);
      const raw = await c.ev(READ, 15000); off(); w.off(); const pg = raw ? JSON.parse(raw) : { marks: {} }; const reqs = [...w.req.values()];
      const shot = `${(p === '/' ? 'home' : p.slice(1).replace(/\//g, '-'))}.${size}.png`; const s = await c.send('Page.captureScreenshot', { format: 'png' }); if (s.result && s.result.data) fs.writeFileSync(path.join(out, shot), Buffer.from(s.result.data, 'base64'));
      const text = await c.ev(`(() => { const h = document.querySelector('.intro-portal-headline') || document.querySelector('h1'); return JSON.stringify({ title: document.title, h1: h ? h.textContent.trim().slice(0, 60) : null, scroll: document.documentElement.scrollHeight > innerHeight + 1 || document.documentElement.scrollWidth > innerWidth + 1, frames: [...document.querySelectorAll('.site-stage-frame')].map((f) => f.dataset.stageFrame + (f.classList.contains('is-drawn') ? ' drawn' : ' not drawn') + (f.classList.contains('is-shown') ? ' shown' : '')) }); })()`);
      const row = { path: p, size, got: pg.size, ended, requests: reqs.length, failed: reqs.filter((r) => r.failed).map((r) => r.failed + ' ' + r.url), bad: reqs.filter((r) => r.status >= 400).map((r) => r.status + ' ' + r.url), errors: [...new Set(errors)], csp: pg.csp || [],
        view3d: pg.marks && pg.marks.view3d ? Math.round(pg.marks.view3d - pg.origin) : null, sockets: w.req.sockets || [], shot, ...(text ? JSON.parse(text) : {}) };
      rows.push(row); console.log(`${p} ${size}: ${ended} | ${row.requests} req, ${row.failed.length} failed, ${row.bad.length} answers >= 400, ${row.errors.length} errors, ${row.csp.length} CSP | 3D ${row.view3d == null ? 'no drawn message' : 'drawn at ' + row.view3d} | frames ${(row.frames || []).join(', ') || 'none'} | "${row.h1}"`);
    } }
  await c.send('Emulation.clearDeviceMetricsOverride'); fs.writeFileSync(path.join(out, 'check.json'), JSON.stringify(rows, null, 1)); c.close();
}

async function main() {
  const o = args(process.argv.slice(2)); const cmd = o._[0];
  if (cmd === 'run') return run(o);
  if (cmd === 'check') return check(o);
  if (cmd === 'report' && o._[1]) return console.log(report(path.resolve(o._[1])));
  if (cmd === 'compare' && o._[2]) return console.log(compare(path.resolve(o._[1]), path.resolve(o._[2])));
  console.error('speed-run: no command. Use: run --cdp <port> --site <address> --out <folder> | report <folder> | compare <before folder> <after folder>. The header of this file lists every option.'); process.exit(2);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e.message || e); process.exit(1); });
