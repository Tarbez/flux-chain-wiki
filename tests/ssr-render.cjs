// run-tests-timeout-ms: 1200000 -- the measurement behind it is at STALL_DEADLINE_MS below.
/* Part 1 of flickering-juggling-donut.md: true SSR, bots only. This proves
   the real render path (api/lib/render-core.mjs, the same module
   api/render.mjs calls for a bot request) against the real site, through
   real jsdom -- not a hand-rolled fake DOM like tests/routes-live.cjs uses
   for its own, different purpose (exercising page modules' internal
   links). jsdom is ESM-only-friendly here via dynamic import() from this
   CommonJS file, the same pattern tests/account-keys-dom.mjs's own
   jsdom-via-import already establishes for this repo.

   Asserts:
     - a known route (/about) renders its REAL per-route <title>, meta
       description and JSON-LD <script data-ark-ld="1">, not the generic
       index.html shell's.
     - bot-detect.mjs classifies each of the three bot groups, a plain
       browser UA, and an absent UA correctly.
     - rendering does not throw for a representative spread of real
       catalog routes (every one of which loads js/lattice.js and
       js/ark/mesh-fabric.js -- they are unconditional global scripts in
       index.html, not per-route, so this exercises the canvas stub on
       every single route rendered here, not just a chosen few).

   The route list comes from the real, live `ArkUI.pageCatalog`
   (api/lib/render-core.mjs's getRouteCatalog(), booted through the exact
   same jsdom pipeline as a real render) rather than a hand-picked or
   re-declared list, the same spirit tests/routes-live.cjs already uses
   for its own route walk. Catalog entries that share the same module +
   script set (e.g. every resolutions/<slug>, every lifecycle/<stage>,
   every concept/<theory-id>, every article/<slug>) are deduplicated to
   one representative each -- rendering every such near-duplicate through
   a fresh, real jsdom boot would be a correct but very slow test for no
   additional coverage, since they differ only in copy, not in code path. */
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HOST = 'https://defxn.com';

/* How long one boot may take before it counts as STALLED -- not a speed budget.

   Why (diagnosed 2026-10-18): this file used to give each route 8000 ms and the
   catalog boot render-core's default 4500 ms (api/render.mjs's live-request
   budget, where giving up early and serving the static file is the right call).
   It timed out on a different route every run. Measured on the owner's Apple M2
   Mac mini (8 cores, 8 GB RAM, ~8.7 GB swap in use, 64 MB free), load average
   15-38 from other agents' Chromium/Electron/test runs:
     - per-boot user CPU 1.0-2.9 s (median ~1.5-2.7 s per route), the same for the
       current site and a pre-session snapshot (01:22, before this session's
       js/main.js additions) interleaved in one process, 4 reps x 7 routes each;
     - wall time for the SAME route and code 2.0-73 s, i.e. 1.5-30x its CPU time;
     - this exact test, unmodified, run against that pre-session snapshot timed out
       the same way on two different routes (proximity, references) -- so the
       failures reproduce with none of the session's code changes.
   No route ever reported an error. render-core now fails FAST when a route really
   breaks (a thrown page error, or page-router's own "[ark] page failed to load"),
   so the only thing left for this deadline to catch is a genuine hang, and that is
   a hang at any size. 60 s is ~20x the slowest idle CPU cost above. Even 60 s was
   overrun once, by the article route, while load average hit 65 with swap at 9.5 of
   10 GB; the same route then rendered in 1.6-2.6 s alone at load 30.

   The whole file is ~38 boots, about a minute of CPU idle and 15 minutes at that
   peak, so scripts/run-tests.mjs's default 120 s per-file guard is raised for this
   file only, by the declaration on this file's first line. */
const STALL_DEADLINE_MS = 60000;

(async () => {
  const { readIndexHtml, renderDocument, getRouteCatalog, createLocalResources, SITE_ROOT } = await import('../api/lib/render-core.mjs');
  const { isBotUserAgent } = await import('../api/lib/bot-detect.mjs');

  // --- bot-detect.mjs: one representative from each group, plus the two
  // "never a bot" cases a real request can present. ---
  for (const ua of [
    'Mozilla/5.0 (compatible; GPTBot/1.1; +https://openai.com/gptbot)',
    'ClaudeBot/1.0 (+https://www.anthropic.com/claude-bot)',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'DuckDuckBot/1.0',
    'facebookexternalhit/1.1',
    'Slackbot-LinkExpanding 1.0',
  ]) assert(isBotUserAgent(ua), `expected "${ua}" to be classified as a bot`);
  for (const ua of [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    '', undefined, null,
  ]) assert(!isBotUserAgent(ua), `expected "${ua}" to NOT be classified as a bot`);
  console.log('ok: bot-detect classifies AI/search/social bots and never flags a plain browser or an absent UA');

  const html = await readIndexHtml(SITE_ROOT);
  // Fully offline: every <script>/<link> fetch resolves straight off this
  // repo's own files, never a real network request against the live domain.
  const resources = createLocalResources(SITE_ROOT);

  // --- the real catalog, booted once through the real pipeline. ---
  const catalog = await getRouteCatalog({ html, url: HOST + '/', resources, root: ROOT, timeoutMs: STALL_DEADLINE_MS });
  const keys = Object.keys(catalog);
  assert(keys.length > 10, `expected a real, populated page catalog; got ${keys.length} keys`);
  assert(catalog.about && catalog.about.path === '/about', 'expected a real "about" entry in the live catalog');

  // One representative per distinct (module, scripts) pair -- see the
  // file comment for why near-duplicate dynamic entries are collapsed.
  const seen = new Set();
  const representatives = [];
  for (const key of keys) {
    const entry = catalog[key];
    const shape = entry.module + '|' + JSON.stringify(entry.scripts || []);
    if (seen.has(shape)) continue;
    seen.add(shape);
    representatives.push(key);
  }
  assert(representatives.includes('about'), 'about must be one of the representative routes');

  console.log(`rendering ${representatives.length} representative routes out of ${keys.length} real catalog entries...`);

  /* Regression: a route that genuinely fails must say so at once, not as a timeout.
     page-router's navigate() catches a failed page load, console.errors it and never
     dispatches ark:route-ready, so before render-core listened for that report a
     broken route and a slow machine produced the identical "Timed out" error after
     the full wait -- which is how a load problem got blamed on code and vice versa.
     Serving js/pages/about.js empty makes the real loader throw "Page module missing". */
  {
    const { requestInterceptor } = (await import('jsdom')).default;
    const broken = {
      interceptors: [
        requestInterceptor((request) => {
          if (new URL(request.url).pathname === '/js/pages/about.js') return new Response('', { status: 200, headers: { 'content-type': 'text/javascript' } });
          return undefined;
        }),
        ...resources.interceptors,
      ],
    };
    const started = Date.now();
    await assert.rejects(
      renderDocument({ html, url: HOST + '/about', resources: broken, root: ROOT, timeoutMs: STALL_DEADLINE_MS }),
      (error) => /Route "about" failed to load/.test(error.message) && /Page module missing: about/.test(error.message),
      'a route whose page module is missing must reject with the router\'s own error, not wait out the deadline'
    );
    console.log(`ok: a genuinely broken route fails fast with its own error (${Date.now() - started} ms, deadline ${STALL_DEADLINE_MS} ms)`);
  }

  let aboutChecked = false;
  const timings = [];
  for (const key of representatives) {
    const entry = catalog[key];
    const url = HOST + entry.path;
    let rendered;
    const wallStart = Date.now();
    const cpuStart = process.cpuUsage();
    try {
      rendered = await renderDocument({ html, url, resources, root: ROOT, timeoutMs: STALL_DEADLINE_MS });
      const cpu = process.cpuUsage(cpuStart);
      timings.push({ key, wall: Date.now() - wallStart, cpu: Math.round((cpu.user + cpu.system) / 1000) });
    } catch (error) {
      throw new Error(`${key} (${url}) failed to render through real jsdom: ${error && error.stack || error}`, { cause: error });
    }
    // Every route in index.html loads js/lattice.js and js/ark/mesh-fabric.js
    // unconditionally (global <script defer> tags, not per-route) -- a
    // successful render of ANY route already proves the canvas stub kept
    // both of them from throwing. These two module names simply confirm
    // that assumption stays true for this deployment.
    assert(/js\/lattice\.js/.test(html), 'js/lattice.js must be a global script index.html always loads');
    assert(/js\/ark\/mesh-fabric\.js/.test(html), 'js/ark/mesh-fabric.js must be a global script index.html always loads');

    const titleMatch = /<title>([^<]*)<\/title>/.exec(rendered);
    assert(titleMatch, `${key}: rendered document has no <title>`);
    assert(titleMatch[1].length > 0, `${key}: rendered <title> is empty`);

    if (key === 'about') {
      aboutChecked = true;
      const shellTitle = /<title>([^<]*)<\/title>/.exec(html)[1];
      assert.notEqual(titleMatch[1], shellTitle, 'about: real per-route title must differ from the generic index.html shell title');
      assert(/Protocol overview|business partner/.test(titleMatch[1]), `about: unexpected rendered title "${titleMatch[1]}"`);

      const descMatch = /<meta\s+name="description"\s+content="([^"]*)"/.exec(rendered);
      assert(descMatch, 'about: rendered document has no meta description');
      const shellDesc = /<meta\s+name="description"\s+content="([^"]*)"/.exec(html)[1];
      assert.notEqual(descMatch[1], shellDesc, 'about: real per-route meta description must differ from the generic shell description');

      const ldMatch = /<script[^>]*data-ark-ld="1"[^>]*>([\s\S]*?)<\/script>/.exec(rendered);
      assert(ldMatch, 'about: rendered document has no JSON-LD script[data-ark-ld="1"]');
      const ld = JSON.parse(ldMatch[1]);
      assert.equal(ld['@context'], 'https://schema.org');
      assert.equal(ld.description, descMatch[1], 'about: JSON-LD description must match the applied meta description');
    }
  }
  assert(aboutChecked, 'the about route must have been exercised by this run');

  // The numbers the next diagnosis needs: wall vs CPU per route, and the load it ran under.
  const by = (field) => timings.map((t) => t[field]).sort((a, b) => a - b);
  const median = (list) => list[list.length >> 1];
  const slowest = timings.reduce((a, b) => (b.wall > a.wall ? b : a));
  console.log(`timing: ${timings.length} routes, wall median ${median(by('wall'))} ms (max ${slowest.wall} ms, ${slowest.key}), ` +
    `cpu median ${median(by('cpu'))} ms, load average ${require('node:os').loadavg().map((n) => n.toFixed(1)).join(' ')} on ${require('node:os').cpus().length} cores`);

  console.log(`PASS: ${representatives.length}/${keys.length} real catalog routes rendered through real jsdom with no uncaught error; ` +
    `/about carries real per-route title/description/JSON-LD distinct from the generic shell.`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
