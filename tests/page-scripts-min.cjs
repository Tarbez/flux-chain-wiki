/* =====================================================================
   PAGE SCRIPTS SERVED MINIFIED (js/min/*) -- the set, the build, the loader's mapping
   ---------------------------------------------------------------------
   Owner decision 2026-10-20 (W5-MIN): a route's page scripts are served from a minified, mapped
   build of their commented source, because /account (+42.8 KB gz) and /explore were over the
   +30 KB R2 budget. The source stays canonical; scripts scripts/build-ark-vendor.cjs writes the
   copies; scripts/lib/page-scripts.cjs derives which files. Each case names what it guards:

   1. The build is real and refuses to be bypassed. In a COPY of the site (never this tree), a
      hand-edited output, a stale output (its source changed), a hand-edited manifest stamp and a
      stray file under js/min/ are each DRIFT, and a plain build repairs them all. Without this
      the first hand edit to js/min/pages/account.js would ship a page nobody wrote.
   2. Every script the catalog lists is either built (copy + map + manifest entry) or exempt for a
      stated reason, and the exemptions are the ones the design names: another pipeline owns it,
      a generator owns it, it is already minified. CMS-written article bodies are never built
      (the publisher writes them; a built copy would go stale until someone rebuilt). The big
      hand-written pages ARE built: that is the whole budget gain, so losing one is a failure.
   3. A copy is faithful: it parses, names its source, carries a map whose `sources` is the
      real source file (devtools shows the commented source), and keeps a page's globals.
   4. The loader maps a catalog path to the copy, with the copy's own hash as ?v=, and reads the
      SOURCE where it must: jsdom (server rendering and every unit test), ?ark-source=1, a file
      the manifest does not list, no manifest at all. Browser file:// keeps its relative URL.
   5. index.html loads the manifest before the loader, stamped with the manifest's own hash.
   6. Server rendering and the tests keep reading the source: nothing under api/ names js/min.
   ===================================================================== */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
process.chdir(ROOT);
const pages = require('../scripts/lib/page-scripts.cjs');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const plan = pages.plan(ROOT);
const builtKeys = Object.keys(plan.hashes);

// ---- 2. the set ----
{
  const scripts = pages.catalogScripts(ROOT);
  assert(scripts.length > 60, 'the catalog lists the site\'s page scripts (' + scripts.length + ')');
  const exempt = new Map(plan.exempt.map((item) => [item.script, item.exempt]));
  for (const script of scripts) {
    const built = builtKeys.includes(pages.keyOf(script));
    assert(built !== exempt.has(script), script + ' is exactly one of built and exempt');
    assert(fs.existsSync(script), script + ' (listed by the catalog) exists as source');
    if (built) {
      assert(fs.existsSync(pages.servedPath(script)), script + ' has its copy');
      assert(fs.existsSync(pages.servedPath(script) + '.map'), script + ' has its map');
    }
  }
  // Named cases: why each exemption exists, and that the files the budget needs are built.
  const why = (script) => exempt.get(script) || '';
  for (const script of scripts.filter((s) => s.startsWith('js/content/articles/'))) assert(/another pipeline/.test(why(script)), script + ': a CMS-written article body is never built (a built copy would go stale on publish)');
  for (const script of ['js/ark/vendor/ark-kit-public.js', 'js/ark/vendor/ark-kit-forms.js', 'js/admin/auth.js', 'js/admin/vendor/auth-kit-create.js']) assert(/another pipeline/.test(why(script)), script + ' is built by its own pipeline already');
  /* Derived, not listed (2026-10-20): a hand list named js/content/reference-text.js after W5-REF deleted it and
     js/content/glossary.js after W5-GLOSS gave each route its own file, and failed on both. Every catalog script
     whose first lines say it is generated is exempt as generated; the adapter bundle is always one of them. */
  const generatedHeader = /\b(?:generated (?:by|from)|do not edit)\b/i;
  const generatedScripts = scripts.filter((s) => generatedHeader.test(fs.readFileSync(s, 'utf8').slice(0, 400)));
  assert(generatedScripts.includes('js/ark/blocks.js'), 'js/ark/blocks.js (built from scripts/ark-blocks-adapter.js) is a catalog script with a generated header');
  /* a vendor chunk is generated too, by its own esbuild pipeline: either reason keeps a generated file unbuilt */
  for (const script of generatedScripts) assert(/generated|another pipeline/.test(why(script)), script + ' is generated: its generator (or its own pipeline) owns its bytes');
  assert(/nothing to gain/.test(why('js/ark/ml-dsa.js')), 'js/ark/ml-dsa.js is an esbuild bundle already: a second copy would gain nothing');
  for (const script of ['js/pages/account.js', 'js/pages/explorer.js', 'js/pages/stats.js', 'js/pages/home.js', 'js/pages/resolver-math.js', 'js/studio.js', 'js/ark/mesh-directory-client.js', 'js/content/resolution-products.js'])
    assert(!exempt.has(script), script + ' is built: it is the budget this change exists for');
  assert(fs.readFileSync(plan.manifest ? pages.MANIFEST : '', 'utf8') === plan.manifest.toString(), 'js/min/manifest.js is what the build writes');
  assert.deepEqual(pages.orphans(ROOT, plan.outputs), [], 'nothing under js/min/ is left from a script that is no longer built');
}

// ---- 3. a copy is faithful ----
for (const script of pages.catalogScripts(ROOT).filter((s) => builtKeys.includes(pages.keyOf(s)))) {
  const out = pages.servedPath(script), code = read(out), map = JSON.parse(read(out + '.map'));
  assert.doesNotThrow(() => new vm.Script(code, { filename: out }), out + ' parses as a classic script');
  assert(code.startsWith('/* Generated by scripts/build-ark-vendor.cjs from ' + script + ' (minified). Do not edit'), out + ' says what it is built from');
  assert(code.endsWith('//# sourceMappingURL=' + path.basename(out) + '.map\n'), out + ' points at its map');
  assert.equal(path.posix.join(path.posix.dirname(out), map.sources[0]), script, out + ': the map names the real source file');
  assert(!map.sourcesContent, out + ': the map holds no copy of the source (the site serves it)');
  const source = read(script);
  assert(code.length < source.length * 0.95, out + ' is smaller than its source');
  // Top-level `ArkUI.x = ` registrations are the page's contract with the router; a minifier that
  // renamed a global would lose them. Property and global names must survive verbatim.
  for (const registration of source.match(/\bArkUI\.pageModules\.[A-Za-z0-9_]+(?=\s*=)/g) || []) assert(code.includes(registration), out + ' keeps ' + registration);
  for (const global of source.match(/^(?:window\.)?(Ark[A-Za-z]+)(?=\s*=)/gm) || []) assert(code.includes(global.replace(/^window\./, '')), out + ' keeps the global ' + global);
}

// ---- 4. the loader ----
const loaderCases = async () => {
  const loaderSource = read('js/ark/page-loader.js');
  const versionTag = /pageAssetVersion = '([^']+)'/.exec(loaderSource)[1];
  const requested = async ({ protocol = 'https:', search = '', userAgent, minScripts }, scripts) => {
    const requests = [];
    const sandbox = {
      ArkUI: { pageModules: { m: {} }, ...(minScripts ? { minScripts } : {}) }, location: { protocol, search, pathname: '/lifecycle/offer' },
      document: { createElement: () => ({ remove() {} }), head: { appendChild(script) { requests.push(script.src); script.onload(); } } },
      ...(userAgent ? { navigator: { userAgent } } : {}),
    };
    vm.runInNewContext(loaderSource, sandbox);
    await sandbox.ArkUI.loadPage('m', { module: 'm', scripts });
    return requests;
  };
  const MIN = { 'pages/home': 'abcd1234', 'ark/page-kit': '0f0f0f0f' };
  const list = ['js/pages/home.js', 'js/pages/other.js', 'js/ark/page-kit.js'];
  assert.deepEqual(await requested({ minScripts: MIN }, list),
    ['/js/min/pages/home.js?v=abcd1234', '/js/pages/other.js?v=' + versionTag, '/js/min/ark/page-kit.js?v=0f0f0f0f'], 'a listed file loads from its copy with the copy\'s hash; any other file loads as written');
  assert.deepEqual(await requested({ protocol: 'file:', minScripts: MIN }, ['js/pages/home.js']), ['js/min/pages/home.js?v=abcd1234'], 'a page opened from disk keeps its relative URL');
  assert.deepEqual(await requested({}, ['js/pages/home.js']), ['/js/pages/home.js?v=' + versionTag], 'no manifest (not built yet, or blocked): the source loads');
  assert.deepEqual(await requested({ minScripts: MIN, userAgent: 'Mozilla/5.0 (linux) AppleWebKit/537.36 (KHTML, like Gecko) jsdom/30.1.3' }, ['js/pages/home.js']),
    ['/js/pages/home.js?v=' + versionTag], 'jsdom (server rendering, every unit test) reads the source, never a build output');
  assert.deepEqual(await requested({ minScripts: MIN, userAgent: 'Mozilla/5.0 Chrome/130 Safari/537.36' }, ['js/pages/home.js']), ['/js/min/pages/home.js?v=abcd1234'], 'a real browser reads the copy');
  assert.deepEqual(await requested({ minScripts: MIN, search: '?ark-source=1' }, ['js/pages/home.js']), ['/js/pages/home.js?v=' + versionTag], '?ark-source=1 reads the source');
  assert.deepEqual(await requested({ minScripts: MIN, search: '?cms-preview=1&ark-source=1' }, ['js/pages/home.js']), ['/js/pages/home.js?v=' + versionTag], '...in any position of the query');
  assert.deepEqual(await requested({ minScripts: MIN, search: '?cms-preview=1' }, ['js/pages/home.js']), ['/js/min/pages/home.js?v=abcd1234'], 'the editor\'s preview serves the copy like the site');
  assert.deepEqual(await requested({ minScripts: MIN }, ['js/constructor.js']), ['/js/constructor.js?v=' + versionTag], 'a path named like an Object.prototype member is not "listed"');
  // The real manifest, through the real loader: every listed key resolves to a file that exists.
  const real = {};
  vm.runInNewContext(read(pages.MANIFEST), { ArkUI: real });
  assert.deepEqual(JSON.parse(JSON.stringify(real.minScripts)), plan.hashes, 'the manifest the page loads is the plan\'s');
  for (const [key, hash] of Object.entries(plan.hashes)) {
    assert(/^[0-9a-f]{8}$/.test(hash), key + ' has an 8-hex hash');
    assert.equal(pages.sha256(fs.readFileSync(pages.servedPath('js/' + key + '.js'))).slice(0, 8), hash, key + ': the hash is the copy\'s own bytes, so its URL changes when its content does');
  }
};

// ---- 5. index.html ----
{
  const html = read('index.html');
  const tag = pages.MANIFEST_TAG.exec(html);
  assert(tag, 'index.html loads js/min/manifest.js');
  assert.equal(tag[2], pages.sha256(plan.manifest).slice(0, 8), 'the manifest\'s ?v= is its own hash (npm run build:ark stamps it)');
  /* script TAGS, not mentions: index.html's per-route CSS comment names page-loader.js above both (2026-10-20) */
  assert(html.indexOf('<script src="js/min/manifest.js') >= 0 && html.indexOf('<script src="js/min/manifest.js') < html.indexOf('<script src="js/ark/page-loader.js'), 'the manifest is listed before the loader that reads it');
  assert(html.indexOf('js/pages/catalog.js') < html.indexOf('js/min/manifest.js'), 'ArkUI exists (the catalog has run) when the manifest assigns to it');
}

// ---- 6. server rendering and the tests read the source ----
for (const file of fs.readdirSync('api', { recursive: true }).filter((f) => /\.m?js$/.test(f)))
  assert(!read('api/' + file).includes('js/min'), 'api/' + file + ' reads page scripts as written, not the build (a render must not depend on a build output)');

// ---- 1. the build refuses drift (in a copy: this tree is never touched) ----
{
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'page-scripts-min-'));
  try {
    for (const entry of ['js', 'scripts', 'index.html']) fs.cpSync(entry, path.join(copy, entry), { recursive: true });
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(copy, 'node_modules'));
    const build = (...flags) => spawnSync(process.execPath, ['scripts/build-ark-vendor.cjs', '--pages', ...flags], { cwd: copy, encoding: 'utf8' });
    const drift = (run) => (run.stdout + run.stderr).split('\n').filter((line) => line.includes('DRIFT'));
    const edit = (file, change) => fs.writeFileSync(path.join(copy, file), change(fs.readFileSync(path.join(copy, file), 'utf8')));

    let run = build('--check');
    assert.equal(run.status, 0, 'a clean copy checks clean:\n' + run.stdout + run.stderr);

    edit('js/min/pages/about.js', (text) => text.replace('function', 'function /* hand edit */'));
    run = build('--check');
    assert.equal(run.status, 1, 'a hand-edited output fails the check');
    assert(drift(run).some((line) => line.includes('js/min/pages/about.js')), 'and the output is named: ' + drift(run).join(' | '));
    fs.copyFileSync(path.join(ROOT, 'js/min/pages/about.js'), path.join(copy, 'js/min/pages/about.js'));

    edit('js/pages/about.js', (text) => text + '\nArkUI.handEditedSource = 1;\n');
    run = build('--check');
    assert.equal(run.status, 1, 'a source edited without rebuilding fails the check');
    assert(drift(run).some((line) => line.includes('js/min/pages/about.js')), 'the stale copy is named');
    fs.copyFileSync(path.join(ROOT, 'js/pages/about.js'), path.join(copy, 'js/pages/about.js'));

    edit('index.html', (text) => text.replace(pages.MANIFEST_TAG, '$1ffffffff$3'));
    run = build('--check');
    assert(drift(run).some((line) => line.includes('index.html')), 'a hand-changed manifest stamp is drift: ' + drift(run).join(' | '));
    fs.copyFileSync(path.join(ROOT, 'index.html'), path.join(copy, 'index.html'));

    fs.writeFileSync(path.join(copy, 'js/min/pages/stray.js'), 'x');
    run = build('--check');
    assert(drift(run).some((line) => line.includes('js/min/pages/stray.js')), 'a copy no catalog script builds is drift: ' + drift(run).join(' | '));

    edit('js/min/pages/chain.js', (text) => text + '\n');
    edit('js/min/manifest.js', (text) => text.replace(/"[0-9a-f]{8}"/, '"00000000"'));
    run = build();
    assert.equal(run.status, 0, 'a plain build succeeds:\n' + run.stdout + run.stderr);
    assert(!fs.existsSync(path.join(copy, 'js/min/pages/stray.js')), 'and removes the stray copy');
    run = build('--check');
    assert.equal(run.status, 0, 'after a build everything checks clean again:\n' + run.stdout + run.stderr);
    assert.equal(fs.readFileSync(path.join(copy, 'js/min/pages/chain.js'), 'utf8'), read('js/min/pages/chain.js'), 'the rebuilt copy is byte-identical to the committed one (the build is deterministic)');
  } finally {
    fs.rmSync(copy, { recursive: true, force: true });
  }
}

loaderCases().then(
  () => console.log('page-scripts-min ok: ' + builtKeys.length + ' scripts served minified, ' + plan.exempt.length + ' as written'),
  (error) => { console.error(error); process.exit(1); });
