/* =====================================================================
   VERSION HISTORY (js/admin/versions.js) -- the store, its grammar, and its wiring
   ---------------------------------------------------------------------
   Why each part exists:
   - The grammar is VENDORED from ark-browser, not rewritten (centralize, don't
     duplicate). A copy that drifts is a second grammar nobody maintains, so the
     copy must stay byte-identical to the canonical file.
   - Exact round trip on all 13 real draft shapes: a version's address is SHA-256
     of the value's JSON.stringify form, and every read re-derives it. An inexact
     round trip would make every stored body "damaged" -- or worse, re-address it
     silently (AGENTS.md: JSON is the hashing form, not the storage form).
   - Future law: a restore is a NEW record that names the old one; the old
     records' bytes never change. Asserted on the files, not on the API's word.
   - Summaries are derived from the values' own shapes; asserted on real edits
     so a "no visible change" regression shows up as a failed line, not a shrug.
   - Import refuses anything that does not prove itself and writes nothing when
     it refuses; an accepted file is a NEW record (importedFrom), never a rewrite.
   - Two writers racing on head.flx are interleaved deterministically (gates on
     the head file), because the defect -- a version on disk but out of the list
     -- only appears in one ordering and passes every sequential test.
   ===================================================================== */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

const FLX = require('../js/admin/vendor/flx-state-grammar.js');
const ArkVersions = require('../js/admin/versions.js');

/* ---- 1. the vendored grammar is the canonical one, byte for byte ---- */
const CANONICAL = path.resolve(__dirname, '..', '..', 'ark-browser', 'src', 'shared', 'flx-state-grammar.js');
if (fs.existsSync(CANONICAL)) {
  assert(fs.readFileSync(CANONICAL).equals(fs.readFileSync(path.join(__dirname, '..', 'js', 'admin', 'vendor', 'flx-state-grammar.js'))),
    'js/admin/vendor/flx-state-grammar.js has drifted from ' + CANONICAL + '. To fix: cp that file over the vendored copy (never edit the copy).');
} else {
  console.log('note: canonical grammar not in this checkout (' + CANONICAL + '); the byte-identity check was not run');
}

/* ---- 2. the 13 real drafts, loaded the way the site loads them ---- */
function single(file, global, extra) {
  const context = vm.createContext({ console });
  context.window = context;
  for (const pre of extra || []) vm.runInContext(fs.readFileSync(pre, 'utf8'), context);
  vm.runInContext(fs.readFileSync(`js/content/${file}.js`, 'utf8'), context);
  vm.runInContext(fs.readFileSync(`js/content/${file}-data.js`, 'utf8'), context);
  return { api: vm.runInContext(global, context), value: JSON.parse(JSON.stringify(vm.runInContext(global + '.get()', context))) };
}

(async () => {
  const { readProject } = await import('../scripts/lib/site-bundle.mjs');
  const project = readProject();
  const singles = {
    meshSettings: single('mesh-settings', 'ArkMeshSettings'),
    theme: single('theme', 'ArkTheme', ['js/tokens.js', 'js/ark/vendor/backgrounds.js']),
    settingsDefaults: single('settings-defaults', 'ArkSiteDefaults'),
    seo: single('seo', 'ArkSEO'),
    layout: single('layout', 'ArkLayout'),
    components: single('components', 'ArkComponents'),
    states: single('states', 'ArkStates'),
    canvasTransitions: single('canvas-transitions', 'ArkCanvasTransitions'),
    elementMotion: single('element-motion', 'ArkElementMotion'),
  };
  /* The saved states/components/layout/motion files are near-empty today; build populated
     drafts through each module's OWN mutators, so the shapes tested are the shapes the editor writes. */
  let states = singles.states.api.createStateGroup(singles.states.value, '/', 'g1', ['hero-title', 'hero-copy'], 'self');
  states = singles.states.api.addState(states, '/', 'g1', 'Second — “quoted” - dashed');
  let components = singles.components.api.createMaster(singles.components.value, 'cta1', 'RBLOCK_CTA_V1', { label: 'Go → now', href: 'route:about' }, 'CTA');
  components = singles.components.api.insertInstance(components, '/', 'slot1', 'k1', 'cta1');
  const layout = singles.layout.api.set(singles.layout.value, '/about', 'hero-title', 'desktop', { x: 12.5, y: -4, width: 320 });
  const elementMotion = singles.elementMotion.api.set(singles.elementMotion.value, '/', 'hero-title', { direction: 'up', distance: 24 });

  const snapshotA = {
    manifests: project.manifests, articles: project.articles, assets: project.assets, secrets: project.secrets,
    meshSettings: singles.meshSettings.value, theme: singles.theme.value, settingsDefaults: singles.settingsDefaults.value,
    seo: singles.seo.value, layout: singles.layout.value, components: singles.components.value, states: singles.states.value,
    canvasTransitions: singles.canvasTransitions.value, elementMotion: singles.elementMotion.value,
  };
  assert.equal(Object.keys(snapshotA).length, 13, 'the snapshot carries all 13 drafts');
  assert(snapshotA.manifests.length && snapshotA.articles.length && snapshotA.articles.every((a) => Array.isArray(a.sections)), 'real pages and article bodies were loaded');

  /* exact round trip, per draft and per list item, plus the populated shapes and hostile strings */
  const shapes = [];
  for (const [key, value] of Object.entries(snapshotA)) {
    shapes.push([key, value]);
    if (Array.isArray(value)) value.forEach((item, i) => shapes.push([`${key}[${i}]`, item]));
  }
  /* JSON.parse(JSON.stringify()) only moves the vm realm's objects into this one (deepStrictEqual compares prototypes); the editor's drafts pass through JSON the same way */
  const here = (v) => JSON.parse(JSON.stringify(v));
  states = here(states); components = here(components);
  shapes.push(['states (populated)', states], ['components (populated)', components], ['layout (populated)', here(layout)], ['elementMotion (populated)', here(elementMotion)]);
  shapes.push(['hostile', { '': '', '-': '-x-', '__proto__': { a: 1 }, 'S00': 'K-I0', u2028: 'a b c', emoji: '🙂', n: [0, 1e21, 1.5e-7, -3.25], deep: [[[]], {}], nul: null, t: true }]);
  for (const [name, value] of shapes) {
    const text = FLX.encodeState(value);
    const back = FLX.decodeState(text);
    assert.deepStrictEqual(back, value, `${name}: parse(render(x)) deep-equals x`);
    assert.equal(JSON.stringify(back), JSON.stringify(value), `${name}: parse(render(x)) re-serializes byte-identically (the hashing form)`);
    assert.equal(await ArkVersions.address(back), await ArkVersions.address(value), `${name}: the address survives the round trip`);
  }

  /* ---- 3. the store, on a real folder, through a File System Access-shaped handle ---- */
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-versions-'));
  const notFound = (name) => Object.assign(new Error(name + ' not found'), { name: 'NotFoundError' });
  function dirHandle(dir) {
    return {
      kind: 'directory', name: path.basename(dir),
      async getDirectoryHandle(child, opts) {
        const p = path.join(dir, child);
        if (!fs.existsSync(p)) { if (!opts || !opts.create) throw notFound(child); fs.mkdirSync(p); }
        return dirHandle(p);
      },
      async getFileHandle(child, opts) {
        const p = path.join(dir, child);
        if (!fs.existsSync(p)) { if (!opts || !opts.create) throw notFound(child); fs.writeFileSync(p, ''); }
        return {
          kind: 'file', name: child,
          async getFile() { const text = fs.readFileSync(p, 'utf8'); return { text: async () => text }; },
          async createWritable() { let buf = ''; return { async write(t) { buf += t; }, async close() { fs.writeFileSync(p, buf); } }; },
        };
      },
    };
  }
  const project_ = dirHandle(root);
  const dir = await ArkVersions.historyDir(project_);
  const historyPath = path.join(root, 'cms-history');
  const bodyCount = () => fs.readdirSync(path.join(historyPath, 'bodies')).length;
  const clone = (v) => JSON.parse(JSON.stringify(v));

  const v1 = await ArkVersions.record(dir, snapshotA, { at: '2026-10-18T10:00:00.000Z' });
  assert.equal(v1.record.seq, 1);
  assert.equal(v1.record.prev, '');
  assert.match(v1.record.summary[0], /^first recorded version: manifests \d+, articles \d+/, 'the first version summarizes what it holds, derived from the snapshot');
  const bodiesAfterV1 = bodyCount();

  // the same content again is not a new version
  const again = await ArkVersions.record(dir, clone(snapshotA), { at: '2026-10-18T10:01:00.000Z' });
  assert(again.unchanged && again.hash === v1.hash, 'saving identical content records nothing new');

  // edit A: an SEO field and a new state group; edit B: one page's field
  const snapshotB = clone(snapshotA);
  snapshotB.seo.site.baseUrl = 'https://defxn.example/';
  snapshotB.states = states;
  const v2 = await ArkVersions.record(dir, snapshotB, { at: '2026-10-18T10:02:00.000Z' });
  assert.equal(v2.record.seq, 2); assert.equal(v2.record.prev, v1.hash);
  assert.deepEqual(v2.record.changed.sort(), ['seo', 'states']);
  assert(v2.record.summary.some((l) => /^seo: site\.baseUrl "https:\/\/defxn\.com" → "https:\/\/defxn\.example\/"$/.test(l)), 'the SEO line names the field and its new value: ' + v2.record.summary.join(' | '));
  assert(v2.record.summary.some((l) => /^states: \+routes\["\/"\]$/.test(l)), 'the states line names the route the group was added on: ' + v2.record.summary.join(' | '));
  assert.equal(bodyCount(), bodiesAfterV1 + 2, 'only the two changed drafts were written; every unchanged body is shared');

  const snapshotC = clone(snapshotB);
  const page = snapshotC.manifests[0];
  const fieldKey = Object.keys(page.fields)[0];
  page.fields[fieldKey].value = 'Edited title';
  const v3 = await ArkVersions.record(dir, snapshotC, { at: '2026-10-18T10:03:00.000Z' });
  assert.deepEqual(v3.record.changed, ['manifests/' + page.id]);
  assert(v3.record.summary[0].startsWith(`manifests ${page.id}: fields.${fieldKey}.value `), 'a page edit is described by its own field path: ' + v3.record.summary[0]);

  // listing is newest first and pages through `prev`
  const first = await ArkVersions.list(dir, { limit: 2 });
  assert.deepEqual(first.entries.map((e) => e.record.seq), [3, 2]);
  assert.equal(first.next, v1.hash);
  const rest = await ArkVersions.list(dir, { from: first.next, limit: 2 });
  assert.deepEqual(rest.entries.map((e) => e.record.seq), [1]); assert.equal(rest.next, null);

  // loading a version rebuilds exactly what was recorded
  const loaded = await ArkVersions.loadSnapshot(dir, v1.hash);
  assert.equal(JSON.stringify(loaded.snapshot), JSON.stringify(snapshotA), 'version 1 loads back byte-identical to the snapshot it recorded');

  // restore = a forward record naming the restored one; the old files are untouched
  const versionsDir = path.join(historyPath, 'versions');
  const before = Object.fromEntries(fs.readdirSync(versionsDir).map((f) => [f, fs.readFileSync(path.join(versionsDir, f))]));
  const v4 = await ArkVersions.record(dir, loaded.snapshot, { restoredFrom: v1.hash, at: '2026-10-18T10:04:00.000Z' });
  assert.equal(v4.record.seq, 4); assert.equal(v4.record.prev, v3.hash); assert.equal(v4.record.restoredFrom, v1.hash);
  assert.equal(v4.record.content, v1.record.content, 'the restored version has the same content address as the one it restores');
  for (const [file, bytes] of Object.entries(before)) assert(fs.readFileSync(path.join(versionsDir, file)).equals(bytes), `${file} was not rewritten by the restore`);
  assert.equal(fs.readdirSync(versionsDir).length, 4, 'four version records, none deleted');
  assert.equal(bodyCount(), bodiesAfterV1 + 3, 'restoring wrote no new bodies: every one it needed already existed');

  // a publish is its own forward record even with unchanged content
  const v5 = await ArkVersions.record(dir, loaded.snapshot, { kind: 'publish', published: { version: 7, cid: 'bafyexample' }, at: '2026-10-18T10:05:00.000Z' });
  assert.equal(v5.record.kind, 'publish'); assert.equal(v5.record.summary[0], 'published as mesh version 7 (bafyexample)');

  // every file on disk is FLX in the grammar: no JSON document is stored
  for (const file of fs.readdirSync(versionsDir)) {
    const text = fs.readFileSync(path.join(versionsDir, file), 'utf8');
    assert(!text.trim().startsWith('{'), `${file} is not JSON`);
    for (const line of text.split('\n').filter(Boolean)) line.split('-').forEach((box) => FLX.readBox(box));
  }

  // export: one self-contained FLX document that proves itself on the way back in
  const exported = await ArkVersions.exportVersion(dir, v2.hash);
  assert.match(exported.name, /^defxn-version-2-[0-9a-f]{12}\.flx$/);
  const doc = await ArkVersions.readExport(exported.text);
  assert.equal(JSON.stringify(doc.site), JSON.stringify(snapshotB), 'the export carries version 2 exactly');
  const tampered = FLX.decodeState(exported.text);
  tampered.site.seo.site.baseUrl = 'https://elsewhere.example/';
  await assert.rejects(ArkVersions.readExport(FLX.encodeState(tampered)), /do not match the version/, 'an export whose drafts were altered is refused');

  // a damaged record is refused, naming what is missing and the remedy
  const victim = path.join(versionsDir, v2.hash + '.flx');
  const good = fs.readFileSync(victim);
  fs.writeFileSync(victim, FLX.encodeState(Object.assign(clone(v2.record), { label: 'tampered' })));
  await assert.rejects(ArkVersions.readVersion(dir, v2.hash), /does not match its address[\s\S]*Missing:[\s\S]*To fix:/);
  fs.writeFileSync(victim, good);

  /* ---- 3b. import: an export comes back in as a NEW forward record, or not at all ----
     Why: an exported file is the one form of a version that leaves this folder. Reading it back
     must prove it (a damaged or edited file is refused, naming what is wrong and the remedy, and
     writes NOTHING), and an accepted file must add to the history, never replace any part of it. */
  const filesIn = (d) => Object.fromEntries(fs.readdirSync(d).map((f) => [f, fs.readFileSync(path.join(d, f))]));
  const beforeImport = { versions: filesIn(versionsDir), bodies: filesIn(path.join(historyPath, 'bodies')), head: fs.readFileSync(path.join(historyPath, 'head.flx')) };
  const assertNothingWritten = (why) => {
    assert.deepEqual(Object.keys(filesIn(versionsDir)).sort(), Object.keys(beforeImport.versions).sort(), why + ': no version record was added');
    assert.deepEqual(Object.keys(filesIn(path.join(historyPath, 'bodies'))).sort(), Object.keys(beforeImport.bodies).sort(), why + ': no body was added');
    assert(fs.readFileSync(path.join(historyPath, 'head.flx')).equals(beforeImport.head), why + ': the head did not move');
  };
  const refusals = [
    ['not FLX at all', '{"format":"defxn-cms-version-export/1"}', /not readable as FLX[\s\S]*Missing:[\s\S]*To fix:/],
    ['cut short', exported.text.slice(0, Math.floor(exported.text.length / 2)), /Missing:[\s\S]*To fix:/],
    ['some other FLX document', FLX.encodeState({ format: 'something-else', site: {} }), /not a DEFXN version export[\s\S]*Missing: the format record[\s\S]*To fix:/],
    ['drafts edited after export', FLX.encodeState(tampered), /drafts do not match[\s\S]*Missing: the drafts exactly as exported[\s\S]*To fix:/],
    ['record edited after export', FLX.encodeState(Object.assign(FLX.decodeState(exported.text), { version: Object.assign(clone(v2.record), { label: 'edited' }) })), /record does not match its address[\s\S]*Missing: the record exactly as exported[\s\S]*To fix:/],
  ];
  for (const [why, text, pattern] of refusals) {
    await assert.rejects(ArkVersions.importVersion(dir, text, { name: 'x.flx' }), pattern, why + ' is refused with what is wrong, what is missing, and the remedy');
    assertNothingWritten(why);
  }
  const imported = await ArkVersions.importVersion(dir, exported.text, { name: exported.name, at: '2026-10-18T10:06:00.000Z' });
  assert.equal(imported.record.kind, 'import');
  assert.equal(imported.record.importedFrom, v2.hash, 'the new record names the export it came from by its content address');
  assert.equal(imported.record.prev, v5.hash, 'an import is a forward record on top of the current head');
  assert.equal(imported.record.seq, 6);
  assert.equal(imported.record.content, v2.record.content, 'the imported drafts are exactly the exported version\'s drafts');
  assert.match(imported.record.summary[0], new RegExp('^imported from version ' + v2.hash.slice(0, 12)));
  assert.equal(JSON.stringify((await ArkVersions.loadSnapshot(dir, imported.hash)).snapshot), JSON.stringify(snapshotB), 'Preview/Restore of the imported version load exactly what was exported');
  for (const [file, bytes] of Object.entries(beforeImport.versions)) assert(fs.readFileSync(path.join(versionsDir, file)).equals(bytes), `${file} was not rewritten by the import`);
  /* into a history that never had it: the export's own record is kept under its own address, so `importedFrom` can be re-verified there too */
  const otherRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-versions-other-'));
  const otherDir = await ArkVersions.historyDir(dirHandle(otherRoot));
  const elsewhere = await ArkVersions.importVersion(otherDir, exported.text, { name: exported.name });
  assert.equal(elsewhere.record.seq, 1); assert.equal(elsewhere.record.prev, '');
  assert.equal((await ArkVersions.readVersion(otherDir, v2.hash)).content, v2.record.content, 'the exported record is stored under its own address and re-verifies');
  assert.equal((await ArkVersions.list(otherDir)).entries.length, 1, 'the listing walks the new history only (the foreign record\'s own prev is never followed)');
  fs.rmSync(otherRoot, { recursive: true, force: true });

  fs.rmSync(root, { recursive: true, force: true });

  /* ---- 3c. two writers, one folder: the head race, interleaved deterministically ----
     Why: head.flx is the one file that is rewritten. Two tabs that both read head H and both
     write a record on top of H used to leave one record on disk but out of the history -- the
     list walks `prev` from the head and never reaches it. Each case below stops the writers at a
     named point (a gate on head.flx) so the interleaving is the same on every run. The assertion
     is on the payload: every writer's content is reachable from the head, in one unbroken chain. */
  const loadInstance = () => { delete require.cache[require.resolve('../js/admin/versions.js')]; return require('../js/admin/versions.js'); };
  function gated(dir, name, log, gate) {
    const inner = dirHandle(dir);
    return {
      kind: 'directory', name: inner.name,
      getDirectoryHandle: async (child, opts) => (child === 'cms-history' ? gated(path.join(dir, child), name, log, gate) : inner.getDirectoryHandle(child, opts)),
      async getFileHandle(child, opts) {
        const handle = await inner.getFileHandle(child, opts);
        if (child !== 'head.flx') return handle;
        return {
          ...handle,
          /* 'A:read#2' holds A's 2nd head read BEFORE it reads; 'A:read#2@after' holds it after the
             bytes were read, so A carries on with what the head WAS (a stale read) */
          async getFile() { log.push(name + ':read'); await gate(name, 'read', ''); const file = await handle.getFile(); await gate(name, 'read', '@after'); return file; },
          async createWritable() { const out = await handle.createWritable(); return { write: (t) => out.write(t), async close() { await out.close(); log.push(name + ':write'); } }; },
        };
      },
    };
  }
  /* counts each writer's head reads; a rule key holds that read until the test releases it */
  function scenario(rules) {
    const counts = {}, waiting = {}, releases = {};
    const gate = async (name, op, phase) => {
      const n = phase ? counts[name + op] : (counts[name + op] = (counts[name + op] || 0) + 1);
      const key = `${name}:${op}#${n}${phase}`;
      if (!rules.includes(key)) return;
      await new Promise((resolve) => { releases[key] = resolve; (waiting[key] || (() => {}))(); });
    };
    const arrived = (key) => new Promise((resolve) => { if (releases[key]) resolve(); else waiting[key] = resolve; });
    const release = (key) => releases[key]();
    return { gate, arrived, release };
  }
  async function race(label, rules, choreography, options = {}) {
    const raceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-race-'));
    const base = await ArkVersions.record(await ArkVersions.historyDir(dirHandle(raceRoot)), snapshotA, { at: '2026-10-18T11:00:00.000Z' });
    const tabA = loadInstance(), tabB = loadInstance();
    if (!options.locks) tabA.lockManager = tabB.lockManager = () => null; /* writers that share no lock: the compare-and-swap alone must hold */
    const log = [], s = scenario(rules);
    const contentA = clone(snapshotA); contentA.seo.site.baseUrl = 'https://tab-a.example/';
    const contentB = clone(snapshotA); contentB.seo.site.baseUrl = 'https://tab-b.example/';
    const a = tabA.record(await tabA.historyDir(gated(raceRoot, 'A', log, s.gate)), contentA, { at: '2026-10-18T11:01:00.000Z' });
    const b = tabB.record(await tabB.historyDir(gated(raceRoot, 'B', log, s.gate)), contentB, { at: '2026-10-18T11:01:00.000Z' });
    await choreography(s, log);
    const [ra, rb] = await Promise.all([a, b]);
    const raceDir = await ArkVersions.historyDir(dirHandle(raceRoot));
    const chain = (await ArkVersions.list(raceDir, { limit: 50 })).entries;
    assert.deepEqual(chain.map((e) => e.record.seq), [3, 2, 1], `${label}: one unbroken chain of three versions`);
    const contents = chain.map((e) => e.record.content);
    assert(contents.includes(ra.record.content) && contents.includes(rb.record.content), `${label}: BOTH writers' versions are reachable from the head`);
    assert.equal(chain[2].hash, base.hash);
    for (const e of chain.slice(0, 2)) {
      const before = chain.find((x) => x.hash === e.record.prev);
      assert(before && before.record.seq === e.record.seq - 1, `${label}: each record names the version really before it`);
    }
    const top = chain[0].record;
    assert(top.summary.some((l) => /^seo: site\.baseUrl "https:\/\/tab-[ab]\.example\/" → "https:\/\/tab-[ab]\.example\/"$/.test(l)), `${label}: the re-parented record describes its change against its NEW prev: ${top.summary.join(' | ')}`);
    fs.rmSync(raceRoot, { recursive: true, force: true });
    return { ra, rb, log };
  }

  // (a) stale read: both read head H before either writes. B's compare-and-swap sees A's head and re-parents.
  const settle = async (probe) => { for (let i = 0; i < 400 && !probe(); i++) await new Promise((r) => setTimeout(r, 5)); assert(probe(), 'the race choreography stalled'); };
  const stale = await race('stale read', ['A:read#1@after', 'B:read#1@after'], async (s, log) => {
    await s.arrived('A:read#1@after'); await s.arrived('B:read#1@after'); /* both have read head H */
    s.release('A:read#1@after');
    await settle(() => log.includes('A:write')); /* A's record is the head now; B still holds H */
    s.release('B:read#1@after');
  });
  assert.equal(stale.ra.reparented, 0, 'A wrote on top of H as it read it');
  assert.equal(stale.rb.reparented, 1, 'B\'s compare-and-swap saw the head move and re-parented onto A');

  // (b) both pass the compare-and-swap, then both write head: A's read-back sees B's head without A in it, and re-parents.
  //     (A's read-back is held until B has written: had A read back first, B's write would hide A and
  //     no read-back could notice -- a file system has no atomic compare-and-swap. That residual
  //     window is exactly what the Web Lock in case (c) closes for tabs of the same browser.)
  const window_ = await race('check-then-write window', ['A:read#2@after', 'B:read#2@after', 'A:read#3'], async (s, log) => {
    await s.arrived('A:read#2@after'); await s.arrived('B:read#2@after'); /* both compare-and-swap checks saw H */
    s.release('A:read#2@after');
    await s.arrived('A:read#3'); /* A wrote head and is about to read it back -- hold it there */
    s.release('B:read#2@after');
    await settle(() => log.includes('B:write'));
    s.release('A:read#3');
  });
  assert(window_.ra.reparented >= 1, 'A found its record overwritten and re-parented onto B');
  assert.equal(window_.rb.reparented, 0, 'B never had to move');

  // (c) same-origin tabs share navigator.locks (Node 24 has it too): the second writer waits, so nothing interleaves
  if (globalThis.navigator && globalThis.navigator.locks) {
    /* A is held right after reading head, as in (a). Without a shared lock B reads head meanwhile
       (the stale-read setup); with it, B cannot touch head.flx until A has finished. */
    const locked = await race('Web Locks', ['A:read#1@after'], async (s, log) => {
      await s.arrived('A:read#1@after');
      for (let i = 0; i < 60 && !log.includes('B:read'); i++) await new Promise((r) => setTimeout(r, 5));
      s.release('A:read#1@after');
    }, { locks: true });
    const firstB = locked.log.findIndex((x) => x.startsWith('B:')), lastA = locked.log.map((x) => x.startsWith('A:')).lastIndexOf(true);
    const firstA = locked.log.findIndex((x) => x.startsWith('A:')), lastB = locked.log.map((x) => x.startsWith('B:')).lastIndexOf(true);
    assert(lastA < firstB || lastB < firstA, 'under the lock one writer finishes before the other touches head.flx: ' + locked.log.join(' '));
    assert.equal(locked.ra.reparented + locked.rb.reparented, 0, 'under the lock no writer ever has to re-parent');
  } else console.log('note: this Node has no navigator.locks; the Web Locks case was not run');

  /* ---- 4. wiring: the app loads the grammar before the store, and Save/Publish/preview use it ---- */
  const html = fs.readFileSync('admin-app.html', 'utf8');
  const order = ['js/admin/vendor/flx-state-grammar.js', 'js/admin/versions.js', 'js/admin/versions-panel.js', 'js/admin/admin.js'].map((src) => html.indexOf(`<script src="${src}" defer>`));
  assert(order.every((i) => i > 0) && order.every((i, n) => !n || i > order[n - 1]), 'admin-app.html loads grammar -> store -> panel -> admin.js, in that order');
  assert(html.includes('id="versionsNav"') && html.includes('id="versionsPanel"'), 'the Versions button and panel are in the persistent header/document');
  const admin = fs.readFileSync('js/admin/admin.js', 'utf8');
  const saveBody = admin.slice(admin.indexOf('async function saveEverything()'), admin.indexOf('\n  async function deleteCurrent()'));
  assert(saveBody.includes('message += await recordVersion(succeeded.length);'), 'every Save records a version of what it wrote');
  /* All 13: the 4 per-id lists by name, and every single draft through js/admin/store.js's one
     draft list and each handle's saved() (the *Saved string) -- tests/site-drafts.test.mjs proves
     every handle's saved() returns that draft's own *Saved variable. */
  assert(/function savedSnapshot\(\)[\s\S]{0,1200}ArkAdminStore\.drafts\('single'\)\.forEach\(function \(d\) \{ snapshot\[d\.key\] = one\(singleDraftHandle\(d\.key\)\.saved\(\)\); \}\)/.test(admin), 'a version records the SAVED drafts (the *Saved strings), all 13 of them');
  assert(admin.includes("site: versionPreviewSite || cmsSourceSite"), 'a previewed version reaches the real preview through the existing defxn-cms-preview-state message');
  assert(admin.includes("recordVersion(1, { kind: 'publish'"), 'a publish is recorded as a forward record carrying the published address');
  assert(fs.readFileSync('.vercelignore', 'utf8').split('\n').includes('cms-history'), 'the history is never deployed with the public site');

  /* Restore is complete: what it removes leaves through the ONE removal path Delete uses
     (removeItemFile -> ArkAdminStore.remove/removeArticle/removeAsset/removeSecret), never a
     second one, and only on the next Save. tests/browser/versions.mjs drives it end to end. */
  const removeItemFile = admin.slice(admin.indexOf('async function removeItemFile('), admin.indexOf('\n  async function deleteCurrent()'));
  for (const call of ['ArkAdminStore.remove(state.dir', 'ArkAdminStore.removeArticle(state.cdirs', 'ArkAdminStore.removeAsset(state.assetDir', 'ArkAdminStore.removeSecret(state.secretDir'])
    assert(admin.slice(admin.indexOf('var ITEM_KINDS = {'), admin.indexOf('async function removeItemFile(')).includes(call), `the one removal table calls ${call}`);
  assert(removeItemFile.includes('await k.remove(id,'), 'removeItemFile() removes through the table');
  for (const kind of ['page', 'article', 'asset', 'secret']) assert(admin.includes(`await removeItemFile('${kind}', `), `Delete of a ${kind} uses removeItemFile()`);
  assert.equal((admin.match(/ArkAdminStore\.remove(Article|Asset|Secret)?\(/g) || []).length, 4, 'no second removal path: each ArkAdminStore.remove* is called exactly once, from the one table');
  assert(saveBody.includes('await removeRestoredExtras(attempt);'), 'Save carries out the removals a confirmed Restore listed, each as its own attempt');
  assert(/function anyDirty\(\) \{[^\n]*restoreRemovalsPending\(\)/.test(admin), 'a pending removal counts as unsaved work (Save enabled, Publish and unload warn)');

  /* Preview shows site-wide settings-defaults too: the preview-state message carries them, js/main.js
     re-defines them and tells the settings panel, and the editor no longer writes the visitor's own
     localStorage keys to preview them (that froze the owner's browser on a stale "choice"). */
  const main = fs.readFileSync('js/main.js', 'utf8');
  const stateHandler = main.slice(main.indexOf("if (data.type !== 'defxn-cms-preview-state'"));
  assert(/if \(site\.settingsDefaults\) cmsPreviewSiteDefaults\(site\.settingsDefaults\);/.test(stateHandler.slice(0, 3000)), 'js/main.js applies a preview state\'s settingsDefaults');
  assert(main.includes("data.type === 'defxn-cms-preview-site-defaults' && event.source === window.parent && cmsPreviewQuery"), 'a single settings-defaults edit previews live, from the editor only, inside a preview only');
  assert(main.includes("new CustomEvent('ark-site-defaults-preview'"), 'js/main.js tells the settings panel');
  const entry = fs.readFileSync('scripts/settings-entry.js', 'utf8');
  assert(entry.includes("window.addEventListener('ark-site-defaults-preview'") && /const save=\(key,value\)=>\{if\(previewOnly\)return;/.test(entry), 'the settings panel re-applies previewed defaults and never saves while previewing');
  assert(fs.readFileSync('js/settings/panel.js', 'utf8').includes('ark-site-defaults-preview'), 'js/settings/panel.js was rebuilt from scripts/settings-entry.js (node scripts/build-settings.cjs)');
  assert(!/localStorage\.setItem\('flux-chain-theme'/.test(admin) && !admin.includes('pokeSettingsDefaultsPreview'), 'the editor never writes a visitor\'s own settings keys to preview defaults');
  assert(ArkAdminDraftKeys().includes('settingsDefaults'), 'settingsDefaults is one of the drafts siteFromState() sends to the preview');
  function ArkAdminDraftKeys() { const ctx = vm.createContext({}); vm.runInContext(fs.readFileSync('js/admin/store.js', 'utf8') + ';this.S=ArkAdminStore;', ctx); return ctx.S.drafts().map((d) => d.key); }
  console.log('versions: ok');
})().catch((error) => { console.error(error); process.exit(1); });
