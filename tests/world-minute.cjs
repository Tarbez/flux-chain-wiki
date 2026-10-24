/* In one minute, the 3D sequence: js/world/minute-experience.js (the stage `movie` and the clock), js/pages/world-minute.js (the
   page), css/world-minute.css and js/content/manifests/worldminute.js. Design: docs/home-redesign/MINUTE-EXPERIENCE.md.
   What this pins, and why each case exists:
   - The words are the manifest's. A key the page names that no manifest defines throws in ArkCopy.text; and every word on the
     page is a word of the manifest, so a sentence typed into the JS shows up here.
   - The claims stay as true as the code lets them be (owner's truth fixes, 2026-10-24): beat 3 says other network chains CAN run
     beside FXN (network-data.js shows kinds, not live chains); beat 5 says sites WILL ship (the Bundle Deployer is not built);
     nothing says live (devnet); the sample card says it is a sample.
   - The clock is a timer, not a frame loop. 60 seconds in nine beats; a paused or finished clock holds no timer; the page
     following the clock never calls back; reduced motion never plays.
   - The page tells the world its state ({ view: 'movie', s }), opens a beat from the address paused, and never traps: keys
     step, pause and skip; the last beat's one action is Create your identity.
   - The stage lights what exists and recolours nothing: its source calls no look, colour or material of the ring kit
     (owner rule: the grid is never altered). */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const stripComments = (js) => js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/* ---- the manifest ---- */
const ids = (read('js/content/manifests/index.js').match(/ArkManifestIds = (\[[^\]]*\])/) || [])[1];
assert(ids && JSON.parse(ids).includes('worldminute'), 'worldminute is in ArkManifestIds');
const cx = vm.createContext({ console, ArkUI: {}, document: { write() {} } });
vm.runInContext(read('js/content/manifest.js'), cx); vm.runInContext(read('js/content/manifests/worldminute.js'), cx); vm.runInContext(read('js/content/manifests/worldmeasure.js'), cx);
const M = vm.runInContext('ArkManifest.get("worldminute")', cx), F = M.fields, V = (k) => F[k].value;
for (let i = 1; i <= 9; i++) for (const part of ['NAME', 'SAY', 'TAG.NAME', 'TAG.SUB']) assert(F['BEAT' + i + '.' + part] && F['BEAT' + i + '.' + part].value, 'beat ' + i + ' has ' + part);
const SRC = { page: read('js/pages/world-minute.js'), stage: read('js/world/minute-experience.js') };
const named = new Set([...stripComments(SRC.page).matchAll(/\bT\('([A-Z0-9.]+)'\s*[,)]/g)].map((m) => m[1]).concat([...stripComments(SRC.page).matchAll(/'WORLDMINUTE\.([A-Z0-9.]+)'/g)].map((m) => m[1])));
for (const key of named) assert(F[key], 'the page names ' + key + ' and the manifest defines it');

/* ---- the claims ---- */
assert(/\bcan run beside\b/.test(V('BEAT3.SAY')) && !/DeArk|CR3TV/.test(V('BEAT3.SAY')), 'beat 3 says other network chains can run beside FXN, and names none (the grid shows kinds, not live chains)');
assert(/\bwill ship\b/.test(V('BEAT5.SAY')), 'beat 5 says sites will ship (the Bundle Deployer is not built)');
assert(/records? .*(several|more than one) computers|copies each record to several computers/.test(V('BEAT5.SAY')), 'beat 5 says what the kernel does (replication to K of N providers, docs/protocol/resolvers.md)');
assert(/Nothing is rewritten/.test(V('BEAT2.SAY')), 'beat 2: a chain is append-only (docs/glossary.md, FXN chain)');
assert(!/claim a name|you can claim|register a name/i.test(V('BEAT6.SAY')), 'beat 6 does not say a visitor can claim a name (claims are genesis-key-only)');
assert(/^Sample card$/.test(V('CARD.SAMPLE')), 'the card is labelled Sample card');
for (const [k, f] of Object.entries(F)) if (f.kind !== 'link') assert(!/\blive\b/i.test(f.value) || /^A sample network\. Nothing here is live\.$/.test(f.value), k + ' says nothing is live without saying it is not');
assert.equal(V('END.CTA.HREF'), 'route:identity', 'the end action opens the identity journey');
assert.equal(V('END.MORE.HREF'), 'route:trace', 'the second link follows a record back');
assert(/SAMPLE = '263'/.test(SRC.page), 'the card is sample 263, and 009 is never named');
assert(!/\b009\b/.test(stripComments(SRC.page)), 'sample 009 (it carries a .eth name) never reaches the page');
/* no sentence of its own in the code */
for (const [name, src] of Object.entries(SRC)) {
  const bad = [...stripComments(src).matchAll(/'([^'\n]{12,})'|"([^"\n]{12,})"/g)].map((m) => m[1] || m[2]).filter((s) => s.split(/\s+/).length >= 4 && /[A-Za-z]{3,} [A-Za-z]{3,} [A-Za-z]{3,}/.test(s) && !/[{};=<>()]|^js\/|^css\/|\.js|\.css/.test(s));
  assert.deepEqual(bad, [], name + ' carries no sentence of its own: ' + bad.join(' | '));
}

/* ---- the clock ---- */
function windowWith() {
  const dom = new JSDOM('<!doctype html><body><div id="outlet"></div></body>', { runScripts: 'outside-only', url: 'http://127.0.0.1/', pretendToBeVisual: true });
  return dom.window;
}
const w0 = windowWith(); w0.eval(SRC.stage);   /* with no world (no DEFXNScene) only the clock is defined */
const MIN = w0.DEFXNMinute;
assert.equal(MIN.BEATS, 9, 'nine beats'); assert.equal(MIN.total, 60, 'sixty seconds in all'); assert.equal(MIN.SECONDS.length, 9);
assert.equal(MIN.FLIGHT.length, 9, 'a flight length for each beat'); assert.equal(MIN.clamp('99'), 9); assert.equal(MIN.clamp('x'), 1); assert.equal(MIN.clamp(0), 1);
function fake() {
  let t = 0, id = 0; const timers = new Map();
  return { now: () => t, setTimeout: (fn, ms) => { timers.set(++id, [t + ms, fn]); return id; }, clearTimeout: (i) => timers.delete(i), timers,
    tick(ms) { const end = t + ms; for (;;) { let next = null; for (const [i, [at]] of timers) if (at <= end && (!next || at < timers.get(next)[0])) next = i; if (next == null) break; const [at, fn] = timers.get(next); timers.delete(next); t = at; fn(); } t = end; } };
}
{
  const f = fake(), seen = [], states = []; let ended = 0;
  const c = MIN.clock({ now: f.now, setTimeout: f.setTimeout, clearTimeout: f.clearTimeout, onBeat: (n, why) => seen.push([n, why]), onEnd: () => ended++, onState: () => states.push(c.playing()) });
  assert.equal(c.beat(), 1); assert.equal(f.timers.size, 0, 'a clock that is not playing holds no timer');
  c.play(); assert.equal(f.timers.size, 1, 'one timer for the beat');
  f.tick(5999); assert.deepEqual(seen, [], 'beat 1 lasts 6 s'); f.tick(1); assert.deepEqual(seen, [[2, 'auto']]);
  c.pause(); assert.equal(f.timers.size, 0, 'pausing clears the timer: nothing is asked for while paused'); assert.equal(c.left(), 6000);
  f.tick(60000); assert.equal(c.beat(), 2, 'a paused clock holds its beat');
  c.play(); f.tick(2000); c.pause(); assert.equal(c.left(), 4000, 'it resumes with the time that was left'); c.play(); f.tick(4000); assert.equal(c.beat(), 3);
  const calls = seen.length; c.sync(7); assert.equal(c.beat(), 7); assert.equal(seen.length, calls, 'sync follows the page without calling back'); assert.equal(f.timers.size, 1, 'and re-arms while playing');
  f.tick(8000 + 7000); assert.equal(c.beat(), 9, 'beats 7 and 8 last 8 s and 7 s'); f.tick(8000); assert.equal(ended, 1, 'the last beat ends the sequence'); assert.equal(f.timers.size, 0, 'a finished clock holds no timer'); assert.equal(c.ended(), true); assert.equal(c.beat(), 9, 'it does not loop');
  c.play(); assert.equal(c.beat(), 1, 'Play after the end starts again'); assert.equal(seen[seen.length - 1][1], 'restart'); c.stop(); assert.equal(f.timers.size, 0);
  let total = 0; const g = fake(), cc = MIN.clock({ now: g.now, setTimeout: g.setTimeout, clearTimeout: g.clearTimeout, onBeat: () => {}, onEnd: () => { total = g.now(); } }); cc.play(); g.tick(120000); assert.equal(total, 60000, 'from Play to the end is 60 s');
  const r = fake(), rc = MIN.clock({ now: r.now, setTimeout: r.setTimeout, clearTimeout: r.clearTimeout, reduced: true }); assert.equal(rc.play(), false, 'reduced motion never plays'); assert.equal(r.timers.size, 0);
}

/* ---- the stage: it lights what exists and recolours nothing ---- */
const stage = stripComments(SRC.stage);
assert(/S\.stage\(\{\s*name: 'movie'/.test(stage), 'it registers the stage `movie`');
for (const word of ['setLook', 'k.C.', 'material', 'Material', 'color.set', '.color.', 'scene.background', 'setClearColor', 'exposure', 'fog']) assert(!stage.includes(word), 'the stage never touches the kit\'s look: ' + word);
assert(/focusOn/.test(stage) && /lit\.line/.test(stage), 'it lights rings and runs lines');
assert(!/requestAnimationFrame|setInterval/.test(stage + stripComments(SRC.page).replace(/requestAnimationFrame\(function \(\) \{ box\.classList\.add\('joined'\)/, '')), 'no frame loop and no interval (the one rAF starts the card\'s join transition, once)');
assert(!/opacity/.test(read('css/world-minute.css').replace(/\/\*[\s\S]*?\*\//g, '')), 'no opacity animation: motion only');

/* ---- the page ---- */
const catalogCx = vm.createContext({ console, ArkUI: {}, document: { write() {} } });
['js/content/manifest.js', 'js/content/manifests/index.js'].forEach((f) => vm.runInContext(read(f), catalogCx));
function boot(query, host, reduced) {
  const w = windowWith(), writes = [], went = []; let search = query || '';
  w.eval('window.ArkUI = { pageModules: {}, pageCatalog: {}, route: {}, pageRouter: {} };'); w.eval(read('js/content/manifest.js'));
  JSON.parse(ids).forEach((id) => w.eval(read('js/content/manifests/' + id + '.js')));
  w.ArkUI.pageCatalog = { works: { path: '/how-it-works' }, zero: { path: '/' }, identity: { path: '/identity' }, trace: { path: '/trace' } };
  w.ArkUI.route = { href: (p) => p, path: () => '/how-it-works', search: () => search, write(p, q, mode) { writes.push([p, q, mode]); search = q; } };
  w.ArkUI.pageRouter = { navigate(page) { went.push(page); return Promise.resolve(true); } };
  w.ArkUI.loadScript = () => Promise.reject(new Error('no engine in jsdom')); if (reduced) w.ArkUI.prefersReducedMotion = () => true;
  w.console.error = () => {}; if (host) w.ArkWorldHost = host;
  w.eval(SRC.stage); w.eval(read('js/pages/world-sheet.js')); w.eval(SRC.page);
  return { w, writes, went };
}
function worldStub() { const calls = { state: [], select: [], on: [], off: [] }; return { calls, state(st) { calls.state.push(JSON.parse(JSON.stringify(st))); }, select(st) { calls.select.push(JSON.parse(JSON.stringify(st))); }, on(n, fn) { calls.on.push(n); return () => calls.off.push(n); } }; }
function mount(query, host, reduced) { const b = boot(query, host, reduced); const page = b.w.ArkUI.pageModules.worldMinuteMovie.mount(b.w.document.getElementById('outlet')); return Object.assign(b, { page }); }
const key = (w, k) => w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true }));
const pool = new Set(); for (const f of Object.values(F)) f.value.split(/\s+/).forEach((t) => pool.add(t.replace(/^["'(’]+|["'.,:;)!?’]+$/g, '').toLowerCase()));
for (const f of Object.values(vm.runInContext('ArkManifest.get("worldmeasure")', cx).fields)) f.value.split(/\s+/).forEach((t) => pool.add(t.replace(/^["'(]+|["'.,:;)!?]+$/g, '').toLowerCase()));
function foreign(root) {
  const bad = [], walker = root.ownerDocument.createTreeWalker(root, 4);
  for (let n; (n = walker.nextNode());) for (const raw of n.textContent.trim().split(/\s+/)) {
    const t = raw.replace(/^["'(’]+|["'.,:;)!?%’]+$/g, '').toLowerCase();
    if (!t || /^[\d,.·+\-–—→←#/x%]+$/.test(t) || /^[a-z]$/.test(t) || pool.has(t)) continue; bad.push(raw);
  }
  return bad;
}
{
  const host = worldStub(), m = mount('', host), page = m.page, w = m.w;
  assert(page.classList.contains('world-page') && page.classList.contains('wp') && page.classList.contains('wp-minute'), 'a world page');
  assert(page.querySelector('[data-stage]') && page.querySelector('[data-panel]') && page.querySelectorAll('.rise').length >= 4, 'the stage, the slab and the rising words are marked');
  assert.equal(page.querySelectorAll('.wm-ticks button').length, 9, 'nine beat buttons');
  assert.equal(host.calls.state.length, 1); assert.deepEqual([host.calls.state[0].view, host.calls.state[0].s], ['movie', '1'], 'the world is told { view: movie, s: 1 }');
  assert.equal(page.querySelector('.wm-say').textContent, V('BEAT1.SAY'), 'beat 1 shows its sentence');
  assert.equal(page.querySelector('.wm-ticks').dataset.state, 'playing', 'a first visit with no ?s= plays');
  assert.deepEqual(foreign(page), [], 'every word is a manifest word');
  assert(page.querySelector('.wp-cta').textContent.includes(V('NEXT')), 'the one action while it runs is Next');
  key(w, 'ArrowRight'); assert.equal(page.arkState().n, 2, 'the right arrow steps'); assert.equal(page.querySelector('.wm-ticks').dataset.state, 'paused', 'stepping pauses the sequence');
  assert.deepEqual([host.calls.select.length, host.calls.select[0].s], [1, '2'], 'select() carries the beat'); assert.deepEqual(m.writes[m.writes.length - 1], ['/how-it-works', 's=2', 'replace'], 'the address holds the beat');
  key(w, 'ArrowLeft'); key(w, 'ArrowLeft'); assert.equal(page.arkState().n, 1, 'the left arrow steps back and stops at 1');
  key(w, 'End'); assert.equal(page.arkState().n, 9, 'End skips to the end');
  assert.equal(page.querySelector('.wp-cta').textContent.trim(), V('END.CTA'), 'the last beat\'s one action is ' + V('END.CTA'));
  assert.equal(page.querySelector('.wp-foot .more').textContent, V('END.MORE')); assert.equal(page.querySelector('.wp-foot .more').dataset.sceneLink, 'trace', 'the second link follows a record back'); assert.equal(page.querySelector('.wp-cta').dataset.sceneLink, 'identity');
  assert.equal(page.querySelector('.wm-bar button:nth-child(3)').textContent, V('SKIP'), 'a skip control stays');
  key(w, 'Home'); assert.equal(page.arkState().n, 1, 'Home goes to the first beat');
  key(w, ' '); assert.equal(page.querySelector('.wm-ticks').dataset.state, 'playing', 'Space plays'); key(w, 'Escape'); assert.equal(page.querySelector('.wm-ticks').dataset.state, 'paused', 'Escape pauses');
  page.querySelector('.wm-ticks button[data-n="4"]').click(); assert.equal(page.arkState().n, 4, 'a beat button jumps');
  assert(page.querySelector('.wm-ticks button[aria-label]').getAttribute('aria-label').includes(V('BEAT1.NAME')), 'each beat button is named');
  assert(page.querySelector('.wm-say').getAttribute('aria-live') === 'polite', 'the sentence is announced');
  page.arkDispose(); assert.equal(host.calls.off.length, host.calls.on.length);
}
{ /* a link with ?s= opens that beat, paused (why: a shared link must not start playing at someone else's place) */
  const m = mount('s=6', worldStub()); assert.equal(m.page.arkState().n, 6); assert.equal(m.page.querySelector('.wm-ticks').dataset.state, 'paused', 'an address beat opens paused'); assert.equal(m.page.querySelector('.wm-say').textContent, V('BEAT6.SAY')); m.page.arkDispose();
  const bad = mount('s=44', null); assert.equal(bad.page.arkState().n, 9, 'a beat past the end is the end'); bad.page.arkDispose();
}
{ /* a return visit in the same session waits for Play */
  const b = boot('', worldStub()); b.w.sessionStorage.setItem('defxn-minute-seen', '1');
  const page = b.w.ArkUI.pageModules.worldMinuteMovie.mount(b.w.document.getElementById('outlet'));
  assert.equal(page.querySelector('.wm-ticks').dataset.state, 'paused', 'a return visit waits for Play'); page.arkDispose();
}
{ /* reduced motion: no autoplay, no play control, the same nine beats by hand */
  const m = mount('', worldStub(), true), page = m.page;
  assert.equal(page.querySelector('.wm-ticks').dataset.state, 'paused', 'reduced motion never plays'); assert(page.querySelector('.wm-bar button:nth-child(2)').hidden, 'and offers no Play');
  for (let n = 2; n <= 9; n++) { page.querySelector('.wp-cta').click(); assert.equal(page.arkState().n, n, 'Next steps to beat ' + n); }
  page.arkDispose();
}
{ /* with no world the page still works */
  const m = mount('s=3', null); assert.equal(m.page.querySelector('.wm-say').textContent, V('BEAT3.SAY')); key(m.w, 'ArrowRight'); assert.equal(m.page.arkState().n, 4); m.page.arkDispose();
}
console.log('world-minute: ok');
