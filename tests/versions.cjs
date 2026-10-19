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
   - Two writers that share no lock are run in EVERY ordering of their file
     operations (3c), because the old defect -- a version on disk but out of the
     list -- appeared in one ordering only and passed every sequential test. The
     store has no mutable pointer any more; heads are derived (records no other
     record names), so the worst any ordering can do is fork, and a fork is kept
     and joined by the next Save.
   - No file is ever overwritten: every write in this file goes through fsDir's
     guard, which fails the writer on any second write to a path, except the one
     documented case (identical bytes to a content-addressed file).
   - Cost: 3c runs 1,151 orderings (+300 sampled unpruned ones) in memory. Measured
     2026-10-18 on the shared 8-CPU dev Mac at load average 40-60: 24-45 s for the
     whole file, so the default 120 s runner guard is too close --
     run-tests-timeout-ms: 300000
   - Migration (3d): a history the old script wrote (head.flx) lists unchanged,
     is carried forward once, and head.flx is never written -- not even when an
     editor still running the old script keeps rewriting it.
   ===================================================================== */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

const FLX = require('../js/admin/vendor/flx-state-grammar.js');
const ArkVersions = require('../js/admin/versions.js');

/* ---- a File System Access-shaped folder over a real directory, instrumented ----
   fsDir(abs, rel, io): the directory at `abs` (`rel` is its path inside the test root). Every
   operation that OBSERVES or CHANGES the folder is one step: list (keys), read (getFile, or a
   lookup that finds nothing), create (getFileHandle/getDirectoryHandle with create, on an absent
   entry -- like Chrome, a file is created EMPTY and filled on close), write (createWritable()
   .close()), delete (removeEntry). With `io`, each step first awaits io.step(desc) -- the
   scheduler's gate in 3c -- and then happens against the folder as it is THEN. Opening an entry
   that exists is not a step: it decides nothing a later step does not re-observe.

   THE GUARD (always on): a write onto a file that already has bytes fails the writer, except the
   one documented case -- a content-addressed file (bodies/, versions/, heads/, legacy/, whose
   bytes are determined by their name) written again with the SAME bytes, which is what two
   writers racing on one name do. head.flx, the legacy pointer, is never written at all. */
const CONTENT_ADDRESSED = /(^|\/)cms-history\/(bodies|versions|heads|legacy)\/[0-9a-f]{64}\.flx$/;
const guardLog = { identical: [] };
const notFound = (name) => Object.assign(new Error(name + ' not found'), { name: 'NotFoundError' });
function fsDir(abs, rel, io, F = fs) {
  const join = (child) => (rel ? rel + '/' + child : child);
  const step = async (desc) => { if (io) await io.step(desc); };
  const fileHandle = (p, r, child) => ({
    kind: 'file', name: child,
    async getFile() {
      await step({ kind: 'read', path: r });
      if (!F.existsSync(p)) throw notFound(child);
      const text = F.readFileSync(p, 'utf8');
      return { text: async () => text };
    },
    async createWritable() {
      let buf = '';
      return {
        async write(t) { buf += t; },
        async close() {
          await step({ kind: 'write', path: r });
          if (/(^|\/)head\.flx$/.test(r)) throw new Error('GUARD: ' + r + ' was written; the legacy pointer is read-only');
          const prior = F.existsSync(p) ? F.readFileSync(p, 'utf8') : '';
          if (prior !== '') {
            if (prior !== buf) throw new Error('GUARD: ' + r + ' was overwritten with different bytes');
            if (!CONTENT_ADDRESSED.test(r)) throw new Error('GUARD: ' + r + ' was written twice and is not content-addressed');
            guardLog.identical.push(r);
          }
          F.writeFileSync(p, buf);
        },
      };
    },
  });
  return {
    kind: 'directory', name: path.basename(abs),
    async getDirectoryHandle(child, opts) {
      const p = path.join(abs, child), r = join(child);
      if (!F.existsSync(p)) {
        if (opts && opts.create) { await step({ kind: 'create', path: r }); F.mkdirSync(p, { recursive: true }); }
        else { await step({ kind: 'read', path: r }); if (!F.existsSync(p)) throw notFound(child); }
      }
      return fsDir(p, r, io, F);
    },
    async getFileHandle(child, opts) {
      const p = path.join(abs, child), r = join(child);
      if (!F.existsSync(p)) {
        if (opts && opts.create) { await step({ kind: 'create', path: r }); if (!F.existsSync(p)) F.writeFileSync(p, ''); }
        else { await step({ kind: 'read', path: r }); if (!F.existsSync(p)) throw notFound(child); }
      }
      return fileHandle(p, r, child);
    },
    async *keys() {
      await step({ kind: 'list', path: rel });
      for (const name of F.readdirSync(abs).sort()) yield name;
    },
    async removeEntry(child) {
      const r = join(child);
      await step({ kind: 'delete', path: r });
      if (!F.existsSync(path.join(abs, child))) throw notFound(child);
      F.rmSync(path.join(abs, child));
    },
  };
}

/* ---- 1. the vendored grammar is the canonical one, byte for byte ---- */
const CANONICAL = path.resolve(__dirname, '..', '..', 'ark-browser', 'src', 'shared', 'flx-state-grammar.js');
if (fs.existsSync(CANONICAL)) {
  assert(fs.readFileSync(CANONICAL).equals(fs.readFileSync(path.join(__dirname, '..', 'js', 'admin', 'vendor', 'flx-state-grammar.js'))),
    'js/admin/vendor/flx-state-grammar.js has drifted from ' + CANONICAL + '. To fix: cp that file over the vendored copy (never edit the copy).');
} else {
  console.log('note: canonical grammar not in this checkout (' + CANONICAL + '); the byte-identity check was not run');
}

/* The same folder in memory, for 3c-3e: a run there is CPU only, so every ordering can be run
   even on a shared machine (on disk each ordering cost ~280 ms at load average 40). The paths
   and the File System Access shape are the same; only the bytes live in a Map. */
function memFs() {
  const files = new Map(), dirs = new Set(['/mem']);
  let serial = 0;
  const F = {
    existsSync: (p) => files.has(p) || dirs.has(p),
    readFileSync: (p) => { if (!files.has(p)) throw Object.assign(new Error('ENOENT: ' + p), { code: 'ENOENT' }); return files.get(p); },
    writeFileSync: (p, text) => { files.set(p, String(text)); },
    mkdirSync: (p) => { for (let d = p; d !== '/' && !dirs.has(d); d = path.dirname(d)) dirs.add(d); },
    readdirSync: (p) => [...new Set([...files.keys(), ...dirs].filter((x) => path.dirname(x) === p && x !== p).map((x) => path.basename(x)))],
    rmSync: (p) => { for (const x of [...files.keys()]) if (x === p || x.startsWith(p + '/')) files.delete(x); for (const x of [...dirs]) if (x === p || x.startsWith(p + '/')) dirs.delete(x); },
    isDir: (p) => dirs.has(p),
    mkdtemp: (prefix) => { const p = '/mem/' + prefix + (serial++); F.mkdirSync(p); return p; },
    cp: (from, to) => {
      for (const d of [...dirs]) if (d === from || d.startsWith(from + '/')) dirs.add(to + d.slice(from.length));
      for (const [x, text] of [...files]) if (x.startsWith(from + '/')) files.set(to + x.slice(from.length), text);
    },
  };
  return F;
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
  /* A File System Access-shaped handle over a real folder (fsDir, below), with the guard every
     write in this file goes through: no file is ever overwritten. */
  const dirHandle = (dir) => fsDir(dir, '', null);
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
  assert.deepEqual(first.heads, [v3.hash], 'one head: the history has not forked');
  assert(first.entries.every((e) => e.branch === 0 && !e.forked), 'a linear history is one branch');
  assert.deepEqual(first.next.frontier.map((f) => f.hash), [v1.hash], 'the cursor continues at the version before the page');
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
  /* Since 2026-10-19 a publish is a release (dense-wire owns names): there is no name-record version to quote, so the
     record carries only the address -- and must not read "published as mesh version undefined". Written into its own
     history so the seq numbers asserted below in this one are untouched; the older shape above still reads as before. */
  const releaseRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-versions-release-'));
  const released = await ArkVersions.record(await ArkVersions.historyDir(dirHandle(releaseRoot)), loaded.snapshot, { kind: 'publish', published: { cid: 'bafyrelease' }, at: '2026-10-19T10:05:00.000Z' });
  assert.equal(released.record.summary[0], 'published as release bafyrelease');
  assert.deepEqual(released.record.published, { cid: 'bafyrelease' });
  fs.rmSync(releaseRoot, { recursive: true, force: true });

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
  const beforeImport = { versions: filesIn(versionsDir), bodies: filesIn(path.join(historyPath, 'bodies')), heads: filesIn(path.join(historyPath, 'heads')) };
  const assertNothingWritten = (why) => {
    assert.deepEqual(Object.keys(filesIn(versionsDir)).sort(), Object.keys(beforeImport.versions).sort(), why + ': no version record was added');
    assert.deepEqual(Object.keys(filesIn(path.join(historyPath, 'bodies'))).sort(), Object.keys(beforeImport.bodies).sort(), why + ': no body was added');
    assert.deepEqual(filesIn(path.join(historyPath, 'heads')), beforeImport.heads, why + ': the head did not move');
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

  /* ---- 3c. writers that share NO lock: every interleaving of their file operations ----
     Why: a file system has no atomic compare-and-swap. The old store kept one mutable pointer
     (head.flx) and a compare-and-swap with read-back; a writer outside the Web Lock (a second
     browser, another machine syncing the folder) could still overwrite the pointer after the
     other's read-back and drop a record from the list -- in ONE ordering, which every sequential
     test passes. The store now has no mutable pointer: each record adds its own head file and
     heads are derived. The claim "nothing is ever lost or overwritten" is about every ordering,
     so every ordering is run.

     How: two independent module instances (separate require() loads, lockManager -> null) write
     at once. Every folder operation is a step held at a gate (fsDir's io.step); a scheduler opens
     one gate at a time, and a depth-first search over its choices enumerates the orderings.
     Orderings that differ only by swapping adjacent INDEPENDENT steps (no shared entry, or both
     reads) reach the same folder state, so only one representative of each is run: a choice of
     A right after a step of B is skipped when A's step is independent of it (the swapped order,
     A first, is run instead). That keeps the lexicographically least ordering of every
     equivalence class, so no distinct ordering is skipped.

     Asserted after every ordering, on the folder itself: the heads derived from heads/ equal
     the heads derived from scanning every record; every record on disk is listed exactly once,
     after every record that follows it; no file was overwritten (fsDir's guard); and a third
     writer's Save joins every head into one, after which heads/ holds exactly that one file. */
  const F = memFs(), memDir = (dir) => fsDir(dir, '', null, F);
  /* SHA-256 on this thread: WebCrypto's digest runs on libuv's pool, and on a loaded machine
     each call waited behind other processes' work (the legacy case took 84 s, at ~20% CPU).
     Same algorithm, same bytes -- only the waiting is removed; restored after 3e. */
  const subtleDigest = globalThis.crypto.subtle.digest;
  Object.defineProperty(globalThis.crypto.subtle, 'digest', { configurable: true, writable: true, value: async (algorithm, data) => {
    assert.equal(algorithm, 'SHA-256');
    const out = require('node:crypto').createHash('sha256').update(Buffer.from(data.buffer, data.byteOffset, data.byteLength)).digest();
    return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
  } });
  const loadInstance = () => { delete require.cache[require.resolve('../js/admin/versions.js')]; return require('../js/admin/versions.js'); };
  /* small drafts of the real shapes (a page list, a single draft): the orderings depend on the
     folder operations, not on the size of the bodies, and real bodies made 1,150 runs FLX-bound */
  const tiny = { manifests: [{ id: 'home', fields: { EYEBROW: { value: 'Home' } } }], seo: { site: { baseUrl: 'https://defxn.com' } } };
  const tinyWith = (baseUrl) => { const s = clone(tiny); s.seo.site.baseUrl = baseUrl; return s; };
  const HISTORY = (root) => path.join(root, 'cms-history');
  const headFiles = (root) => { try { return F.readdirSync(path.join(HISTORY(root), 'heads')).sort(); } catch { return []; } };

  /* the heads, derived the slow way: every record in versions/, minus every record another names */
  function scanHistory(root) {
    const dir = path.join(HISTORY(root), 'versions'), records = {};
    for (const file of F.readdirSync(dir)) records[file.slice(0, 64)] = FLX.decodeState(F.readFileSync(path.join(dir, file), 'utf8'));
    const named = new Set(Object.values(records).flatMap((r) => ArkVersions.parentsOf(r)));
    return { records, truth: Object.keys(records).filter((h) => !named.has(h)).sort() };
  }

  /* what the pre-2026-10-18 writer did: bodies, a /1 record on head.flx's head, head.flx rewritten.
     Used to build legacy histories, and to play an editor still running the old script. */
  async function legacyWrite(root, snapshot, at) {
    const h = HISTORY(root);
    for (const d of ['versions', 'bodies']) F.mkdirSync(path.join(h, d), { recursive: true });
    const pointer = F.existsSync(path.join(h, 'head.flx')) ? FLX.decodeState(F.readFileSync(path.join(h, 'head.flx'), 'utf8')) : null;
    const addressed = await ArkVersions.addressSnapshot(snapshot);
    for (const [hash, body] of Object.entries(addressed.bodies)) F.writeFileSync(path.join(h, 'bodies', hash + '.flx'), FLX.encodeState(body));
    const rec = { format: 'defxn-cms-version/1', kind: 'save', seq: pointer ? pointer.seq + 1 : 1, at, prev: pointer ? pointer.head : '', restoredFrom: '', importedFrom: '', label: '', published: null,
      content: await ArkVersions.address(addressed.items), changed: Object.keys(addressed.items), summary: ['written by the old script'], items: addressed.items };
    const hash = await ArkVersions.address(rec);
    F.writeFileSync(path.join(h, 'versions', hash + '.flx'), FLX.encodeState(rec));
    F.writeFileSync(path.join(h, 'head.flx'), FLX.encodeState({ head: hash, seq: rec.seq }));
    return { hash, record: rec };
  }

  /* -- the scheduler -- */
  function touches(desc) {
    const parent = desc.path.includes('/') ? desc.path.slice(0, desc.path.lastIndexOf('/')) : '';
    if (desc.kind === 'list') return [['names:' + desc.path, false]];
    if (desc.kind === 'read') return [['entry:' + desc.path, false]];
    if (desc.kind === 'write') return [['entry:' + desc.path, true]];
    return [['names:' + parent, true], ['entry:' + desc.path, true]]; /* create, delete */
  }
  const independent = (x, y) => touches(x).every(([a, wa]) => touches(y).every(([b, wb]) => a !== b || (!wa && !wb)));
  /* the folder after a run, as one string: what an ordering produced */
  const folderState = (root) => { const out = []; (function walk(d) { for (const f of F.readdirSync(d).sort()) { const p = path.join(d, f); if (F.isDir(p)) { out.push(p.slice(root.length) + '/'); walk(p); } else out.push(p.slice(root.length) + '=' + F.readFileSync(p)); } })(root); return out.join('\n'); };
  async function runSchedule(prefix, template, specs, choose = null) {
    const root = F.mkdtemp('defxn-interleave-');
    F.cp(template, root);
    const trace = [];
    const ws = specs.map((spec) => ({ ...spec, state: 'idle' }));
    const arm = (w) => { w.changed = new Promise((r) => { w.wake = r; }); };
    for (const w of ws) {
      w.instance = loadInstance();
      w.instance.lockManager = () => null;
      w.dir = await w.instance.historyDir(fsDir(root, '', {
        step: (desc) => new Promise((resolve) => { w.pending = { ...desc, writer: w.name }; w.go = resolve; w.state = 'waiting'; w.wake(); }),
      }, F));
    }
    const advance = async (w) => {
      arm(w);
      if (w.state === 'idle') {
        w.state = 'running';
        w.instance.record(w.dir, w.content, w.meta).then((r) => { w.result = r; w.state = 'done'; w.wake(); }, (e) => { w.error = e; w.state = 'done'; w.wake(); });
      } else {
        trace.push(`${w.name}:${w.pending.kind} ${w.pending.path}`);
        w.state = 'running'; w.go();
      }
      await w.changed;
    };
    for (const w of ws) await advance(w);
    const decisions = [];
    let last = null;
    for (;;) {
      const waiting = ws.filter((w) => w.state === 'waiting');
      if (!waiting.length) break;
      const allowed = !choose && last && waiting.length > 1 ? waiting.filter((w) => !(w.name < last.writer && independent(w.pending, last))) : waiting;
      let chosen = allowed[0];
      if (allowed.length > 1) {
        const pick = decisions.length < prefix.length ? prefix[decisions.length] : choose ? choose(allowed).name : allowed[0].name;
        chosen = allowed.find((w) => w.name === pick);
        decisions.push({ chosen: pick, alternatives: allowed.map((w) => w.name).filter((n) => n !== pick) });
      }
      last = chosen.pending;
      await advance(chosen);
    }
    for (const w of ws) if (w.error) { w.error.message = `writer ${w.name} failed in ordering [${trace.join(' | ')}]: ${w.error.message}`; throw w.error; }
    return { root, trace, decisions, state: folderState(root), writers: Object.fromEntries(ws.map((w) => [w.name, w.result])) };
  }
  async function explore(label, template, specs, check) {
    const stack = [[]], outcomes = {}, started = Date.now(), states = new Set();
    let runs = 0;
    while (stack.length) {
      const prefix = stack.pop();
      const run = await runSchedule(prefix, template, specs);
      runs += 1;
      states.add(run.state);
      try { const outcome = await check(run); outcomes[outcome] = (outcomes[outcome] || 0) + 1; }
      catch (error) { throw new Error(`${label}, ordering [${run.trace.join(' | ')}]: ${error.message}`, { cause: error }); }
      for (let i = prefix.length; i < run.decisions.length; i++) {
        for (const alt of run.decisions[i].alternatives) stack.push(run.decisions.slice(0, i).map((d) => d.chosen).concat(alt));
      }
      F.rmSync(run.root);
    }
    console.log(`versions: ${label}: ${runs} orderings in ${Date.now() - started} ms, ${Object.entries(outcomes).map(([k, v]) => `${v} ${k}`).join(', ')}`);
    return { runs, outcomes, states };
  }

  /* -- what must hold after every ordering -- */
  async function checkSettled(run, label) {
    const { root } = run;
    const plain = await ArkVersions.historyDir(memDir(root));
    const { records, truth } = scanHistory(root);
    const view = await ArkVersions.readHeads(plain);
    assert.deepEqual(view.heads.map((x) => x.hash).sort(), truth, 'the heads derived from heads/ are the heads derived from every record');
    assert.deepEqual(view.missing, [], 'every head names a record that is on disk');
    for (const hash of truth) assert(headFiles(root).includes(hash + '.flx'), `head ${hash.slice(0, 12)} has its head file: no head was trimmed before its successor existed`);
    const listed = (await ArkVersions.list(plain, { limit: 1000 })).entries;
    const order = listed.map((e) => e.hash);
    assert.equal(new Set(order).size, order.length, 'no record is listed twice');
    assert.deepEqual([...order].sort(), Object.keys(records).sort(), 'every record on disk is listed: nothing was lost');
    for (const [name, result] of Object.entries(run.writers)) assert(result && !result.unchanged && order.includes(result.hash), `writer ${name}'s version is listed`);
    listed.forEach((e, i) => ArkVersions.parentsOf(e.record).forEach((p) => { if (records[p]) assert(order.indexOf(p) > i, 'a record is listed above the records it follows'); }));
    if (truth.length > 1) {
      const sides = listed.filter((e) => Object.values(run.writers).some((r) => r.hash === e.hash));
      assert(sides.every((e) => e.forked), 'a fork lists both sides as branches');
      assert.equal(new Set(sides.map((e) => e.branch)).size, sides.length, 'each side of the fork is its own branch');
    }

    /* the next Save, by a third editor, joins every head and trims heads/ to its own file */
    const third = loadInstance(); third.lockManager = () => null;
    const joined = await third.record(await third.historyDir(memDir(root)), tinyWith('https://third.example/'), { at: '2026-10-18T11:30:00.000Z' });
    assert.deepEqual(ArkVersions.parentsOf(joined.record).sort(), truth, 'the next record follows every head (prev + joins)');
    assert.equal(joined.joined, truth.length - 1);
    if (truth.length > 1) assert(/^joins #/.test(joined.record.summary[0]) && joined.record.summary.some((l) => /^vs #\d+ seo: site\.baseUrl /.test(l)), 'a join says what it joins and how its drafts differ from the joined branch: ' + joined.record.summary.join(' | '));
    assert.deepEqual(scanHistory(root).truth, [joined.hash], 'after the join there is one head');
    assert.deepEqual(headFiles(root), [joined.hash + '.flx'], 'every superseded head file was trimmed, and only those');
    const after = (await ArkVersions.list(plain, { limit: 1000 })).entries;
    assert.equal(after.length, order.length + 1, 'the join lists every record once more, under it');
    if (truth.length > 1) assert(after[0].hash === joined.hash && !after[0].forked && after.slice(1).some((e) => e.forked), 'the join row is on one line; the branches it joined are listed under it');
    return truth.length > 1 ? 'forked, then joined' : 'linear';
  }

  /* fresh: a history written by this store, one version; A and B save at once */
  const freshTemplate = F.mkdtemp('defxn-template-fresh-');
  const freshBase = await ArkVersions.record(await ArkVersions.historyDir(memDir(freshTemplate)), tiny, { at: '2026-10-18T11:00:00.000Z' });
  const writersAB = [
    { name: 'A', content: tinyWith('https://tab-a.example/'), meta: { at: '2026-10-18T11:01:00.000Z' } },
    { name: 'B', content: tinyWith('https://tab-b.example/'), meta: { at: '2026-10-18T11:02:00.000Z' } },
  ];
  const fresh = await explore('two writers, no lock', freshTemplate, writersAB, async (run) => {
    for (const result of Object.values(run.writers)) assert(ArkVersions.parentsOf(result.record).length >= 1, 'every new record follows something');
    assert(Object.values(run.writers).every((r) => r.record.prev === freshBase.hash || Object.values(run.writers).some((o) => o.hash === r.record.prev)), 'each record follows the base or the other writer');
    return checkSettled(run);
  });
  assert(fresh.outcomes['forked, then joined'] && fresh.outcomes.linear, 'the orderings include both outcomes: some fork, some see the other writer and follow it');
  /* The reduction is checked, not trusted: orderings chosen at random with NO pruning (every
     waiting writer may go next) must each end in a folder state the reduced search produced. The
     full unpruned space is ~C(26,13) = 10 million orderings, so it is sampled, with a fixed seed. */
  {
    let seed = 20261018;
    const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    for (let i = 0; i < 300; i++) {
      const run = await runSchedule([], freshTemplate, writersAB, (allowed) => allowed[Math.floor(random() * allowed.length)]);
      assert(fresh.states.has(run.state), 'an unpruned ordering reached a folder state the reduced search never produced -- the independence relation is wrong: ' + run.trace.join(' | '));
      F.rmSync(run.root);
    }
  }

  /* legacy: a history the old script wrote (head.flx). Both writers carry it forward at once. */
  const legacyTemplate = F.mkdtemp('defxn-template-legacy-');
  const L1 = await legacyWrite(legacyTemplate, tiny, '2026-10-17T09:00:00.000Z');
  const L2 = await legacyWrite(legacyTemplate, tinyWith('https://legacy.example/'), '2026-10-17T09:05:00.000Z');
  const legacyPointer = F.readFileSync(path.join(HISTORY(legacyTemplate), 'head.flx'));
  await explore('two writers carrying a legacy head.flx forward', legacyTemplate, writersAB, async (run) => {
    assert(F.readFileSync(path.join(HISTORY(run.root), 'head.flx')) === (legacyPointer), 'head.flx is never written');
    assert(F.existsSync(path.join(HISTORY(run.root), 'legacy', L2.hash + '.flx')), 'the carried legacy head is marked, once');
    const firsts = Object.values(run.writers).filter((r) => r.record.prev === L2.hash);
    assert(firsts.length >= 1 && firsts.every((r) => r.record.seq === 3), 'the first new records follow the legacy head and continue its seq');
    return checkSettled(run);
  });

  /* fork: two machines each saved on the same base and the folders synced -- two heads. A and B
     both save at once, so both write a join; the third writer joins the joins. */
  const forkTemplate = F.mkdtemp('defxn-template-fork-');
  F.cp(freshTemplate, forkTemplate);
  const machine2 = F.mkdtemp('defxn-machine2-');
  F.cp(freshTemplate, machine2);
  const X = await loadInstance().record(await ArkVersions.historyDir(memDir(forkTemplate)), tinyWith('https://machine-1.example/'), { at: '2026-10-18T11:00:30.000Z' });
  const Y = await loadInstance().record(await ArkVersions.historyDir(memDir(machine2)), tinyWith('https://machine-2.example/'), { at: '2026-10-18T11:00:40.000Z' });
  for (const d of ['versions', 'bodies', 'heads']) for (const f of F.readdirSync(path.join(HISTORY(machine2), d))) {
    const to = path.join(HISTORY(forkTemplate), d, f);
    if (!F.existsSync(to)) F.writeFileSync(to, F.readFileSync(path.join(HISTORY(machine2), d, f))); /* the sync: files arrive, nothing is replaced */
  }
  F.rmSync(machine2);
  assert.deepEqual(scanHistory(forkTemplate).truth, [X.hash, Y.hash].sort(), 'the synced folder has two heads');
  const forkPage = await ArkVersions.list(await ArkVersions.historyDir(memDir(forkTemplate)), { limit: 10 });
  assert.deepEqual(forkPage.entries.map((e) => [e.hash, e.forked]), [[Y.hash, true], [X.hash, true], [freshBase.hash, false]], 'an open fork lists both heads, newest first, as branches above their base');
  assert.equal(forkPage.heads.length, 2);
  await explore('two writers joining a synced fork at once', forkTemplate, writersAB, async (run) => {
    for (const result of Object.values(run.writers)) assert(ArkVersions.parentsOf(result.record).length >= 2 || [X.hash, Y.hash].every((h) => scanHistory(run.root).records[h]), 'a writer that saw the fork joined it');
    const sawFork = Object.values(run.writers).filter((r) => r.joined > 0);
    assert(sawFork.length >= 1, 'whoever saved first joined the fork');
    return checkSettled(run);
  });
  for (const t of [freshTemplate, legacyTemplate, forkTemplate]) F.rmSync(t);
  assert(guardLog.identical.every((p) => CONTENT_ADDRESSED.test(p)), 'the only repeated writes were identical bytes to content-addressed files');

  /* ---- 3d. migration, step by step: head.flx is read, carried forward once, never written ----
     Why each step: an existing history must keep working (it is the owner's real history); an
     editor still running the old script on the same folder keeps rewriting head.flx, and what it
     records there must still reach the list; old exports must still import. */
  {
    const root = F.mkdtemp('defxn-migrate-');
    const l1 = await legacyWrite(root, tiny, '2026-10-17T09:00:00.000Z');
    const l2 = await legacyWrite(root, tinyWith('https://legacy.example/'), '2026-10-17T09:05:00.000Z');
    const tree = () => { const out = []; (function walk(d, r) { for (const f of F.readdirSync(d).sort()) { const p = path.join(d, f); if (F.isDir(p)) walk(p, r + f + '/'); else out.push(r + f + ':' + F.readFileSync(p, 'utf8').length); } })(HISTORY(root), ''); return out; };
    const pointer = F.readFileSync(path.join(HISTORY(root), 'head.flx'));
    const dir = await ArkVersions.historyDir(memDir(root));
    const untouched = tree();
    const page = await ArkVersions.list(dir);
    assert.deepEqual(page.entries.map((e) => e.hash), [l2.hash, l1.hash], 'a legacy history lists as it always did');
    assert.deepEqual(page.heads, [l2.hash]);
    assert.deepEqual(tree(), untouched, 'reading a legacy history writes nothing');

    const migrator = loadInstance(); migrator.lockManager = () => null;
    const r = await migrator.record(dir, tinyWith('https://new-script.example/'), { at: '2026-10-18T09:00:00.000Z' });
    assert.equal(r.record.prev, l2.hash); assert.equal(r.record.seq, 3); assert.deepEqual(r.record.joins, []);
    assert.equal(r.record.format, 'defxn-cms-version/2');
    assert(F.readFileSync(path.join(HISTORY(root), 'head.flx')) === (pointer), 'head.flx is never written');
    assert.deepEqual(headFiles(root), [r.hash + '.flx']);
    assert(F.existsSync(path.join(HISTORY(root), 'legacy', l2.hash + '.flx')), 'the carried value is marked, so it is not a head again');
    assert.deepEqual((await ArkVersions.readHeads(dir)).heads.map((x) => x.hash), [r.hash]);

    /* an editor still running the old script writes on the old pointer */
    const l3 = await legacyWrite(root, tinyWith('https://old-script.example/'), '2026-10-18T09:01:00.000Z');
    assert.equal(l3.record.prev, l2.hash);
    const forked = await ArkVersions.readHeads(dir);
    assert.deepEqual(forked.heads.map((x) => x.hash), [l3.hash, r.hash], 'what the old script recorded is a head beside the new one');
    assert.equal(forked.legacy, l3.hash);
    const forkList = (await ArkVersions.list(dir)).entries;
    assert.deepEqual(forkList.map((e) => e.hash), [l3.hash, r.hash, l2.hash, l1.hash]);
    assert(forkList[0].forked && forkList[1].forked && forkList[0].branch !== forkList[1].branch && !forkList[2].forked);

    const s = await migrator.record(dir, tinyWith('https://new-script.example/'), { at: '2026-10-18T09:02:00.000Z' });
    assert.equal(s.record.prev, r.hash, 'a join is described against this editor\'s own branch');
    assert.deepEqual(s.record.joins, [l3.hash]);
    assert.equal(s.record.seq, 4, 'a join is one past the highest head it joins (both branches are #3)');
    assert(/^joins #3 /.test(s.record.summary[0]) && s.record.summary.includes('vs #3 seo: site.baseUrl "https://old-script.example/" → "https://new-script.example/"'), 'the join names the old script\'s version and what differs from it: ' + s.record.summary.join(' | '));
    assert.deepEqual((await ArkVersions.readHeads(dir)).heads.map((x) => x.hash), [s.hash]);
    assert(F.existsSync(path.join(HISTORY(root), 'legacy', l3.hash + '.flx')));
    assert.equal(FLX.decodeState(F.readFileSync(path.join(HISTORY(root), 'head.flx'))).head, l3.hash, 'head.flx still holds what the old script wrote; nothing here rewrote it');
    const joinedList = (await ArkVersions.list(dir)).entries;
    assert.deepEqual(joinedList.map((e) => e.hash), [s.hash, l3.hash, r.hash, l2.hash, l1.hash], 'the join lists both branches under it, in time order');
    assert(!joinedList[0].forked && joinedList[1].forked && joinedList[2].forked && !joinedList[3].forked);

    /* a head file a sync brings back after it was trimmed is stale: listed once, pruned, trimmed by the next Save */
    F.writeFileSync(path.join(HISTORY(root), 'heads', r.hash + '.flx'), FLX.encodeState({ head: r.hash, seq: 3 }));
    const resurrected = await ArkVersions.readHeads(dir);
    assert.deepEqual(resurrected.heads.map((x) => x.hash), [s.hash]); assert.deepEqual(resurrected.stale, [r.hash]);
    assert.equal((await ArkVersions.list(dir)).entries.length, 5, 'a stale head file adds no row');
    const t = await migrator.record(dir, tinyWith('https://after-resurrection.example/'), { at: '2026-10-18T09:03:00.000Z' });
    assert.deepEqual(t.record.joins, [], 'a stale head file is not a branch to join');
    assert.deepEqual(headFiles(root), [t.hash + '.flx'], 'the stale head file was trimmed with the superseded one');

    /* exports made from a legacy (/1) record by the old script still prove themselves and import */
    const oldExport = await ArkVersions.exportVersion(dir, l1.hash);
    const back = await ArkVersions.importVersion(dir, oldExport.text, { name: oldExport.name, at: '2026-10-18T09:04:00.000Z' });
    assert.equal(back.record.importedFrom, l1.hash); assert.equal(back.record.content, l1.record.content); assert.equal(back.record.prev, t.hash);
    assert.deepEqual(headFiles(root), [back.hash + '.flx'], 'an imported record is evidence, not a head');
    F.rmSync(root);
  }

  /* ---- 3e. same-origin tabs share navigator.locks (Node 24 has it too): the cheap path ----
     Not needed for correctness (3c), but it keeps two tabs of one browser from forking at all. */
  if (globalThis.navigator && globalThis.navigator.locks) {
    const root = F.mkdtemp('defxn-locks-');
    await ArkVersions.record(await ArkVersions.historyDir(memDir(root)), tiny, { at: '2026-10-18T11:00:00.000Z' });
    const log = [];
    let holdA, heldA = new Promise((r) => { holdA = r; }), arrivedA;
    const arrived = new Promise((r) => { arrivedA = r; });
    const tabs = ['A', 'B'].map((name) => {
      const instance = loadInstance();
      return { name, instance, io: { step: async (desc) => { log.push(name + ':' + desc.kind); if (name === 'A' && log.filter((x) => x.startsWith('A:')).length === 1) { arrivedA(); await heldA; } } } };
    });
    const dirs = await Promise.all(tabs.map(async (t) => t.instance.historyDir(fsDir(root, '', t.io, F))));
    const a = tabs[0].instance.record(dirs[0], tinyWith('https://tab-a.example/'), { at: '2026-10-18T11:01:00.000Z' });
    await arrived;
    const b = tabs[1].instance.record(dirs[1], tinyWith('https://tab-b.example/'), { at: '2026-10-18T11:02:00.000Z' });
    for (let i = 0; i < 40 && !log.some((x) => x.startsWith('B:')); i++) await new Promise((r) => setTimeout(r, 5));
    holdA();
    const [ra, rb] = await Promise.all([a, b]);
    const firstB = log.findIndex((x) => x.startsWith('B:')), lastA = log.map((x) => x.startsWith('A:')).lastIndexOf(true);
    assert(lastA < firstB, 'under the lock B touches the folder only after A has finished: ' + log.join(' '));
    assert.equal(rb.record.prev, ra.hash, 'under the lock there is no fork');
    assert.deepEqual(scanHistory(root).truth, [rb.hash]);
    F.rmSync(root);
  } else console.log('note: this Node has no navigator.locks; the Web Locks case was not run');
  globalThis.crypto.subtle.digest = subtleDigest;

  /* ---- 4. wiring: the app loads the grammar before the store, and Save/Publish/preview use it ---- */
  const html = fs.readFileSync('admin-app.html', 'utf8');
  const order = ['js/admin/vendor/flx-state-grammar.js', 'js/admin/versions.js', 'js/admin/versions-panel.js', 'js/admin/admin.js'].map((src) => html.indexOf(`<script src="${src}" defer>`));
  assert(order.every((i) => i > 0) && order.every((i, n) => !n || i > order[n - 1]), 'admin-app.html loads grammar -> store -> panel -> admin.js, in that order');
  assert(html.includes('id="versionsNav"') && html.includes('id="versionsPanel"'), 'the Versions button and panel are in the persistent header/document');
  const admin = require('./lib/admin-source.cjs').ADMIN;
  const saveBody = admin.slice(admin.indexOf('async function saveEverything()'), admin.indexOf('\n  async function deleteCurrent()'));
  assert(saveBody.includes('message += await recordVersion(succeeded.length);'), 'every Save records a version of what it wrote');
  /* All 13: the 4 per-id lists by name, and every single draft through js/admin/store.js's one
     draft list and each handle's saved() (the *Saved string) -- tests/site-drafts.test.mjs proves
     every handle's saved() returns that draft's own *Saved variable. */
  assert(/function savedSnapshot\(\)[\s\S]{0,1200}ArkAdminStore\.drafts\('single'\)\.forEach\(function \(d\) \{ snapshot\[d\.key\] = one\(singleDraftHandle\(d\.key\)\.saved\(\)\); \}\)/.test(admin), 'a version records the SAVED drafts (the *Saved strings), all 13 of them');
  assert(admin.includes("site: state.versionPreviewSite || state.cmsSourceSite"), 'a previewed version reaches the real preview through the existing defxn-cms-preview-state message');
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
  assert(fs.readFileSync('js/settings/panel.js', 'utf8').includes('ark-site-defaults-preview'), 'js/settings/panel.js was rebuilt from scripts/settings-entry.js (node scripts/build-ark-vendor.cjs)');
  assert(!/localStorage\.setItem\('flux-chain-theme'/.test(admin) && !admin.includes('pokeSettingsDefaultsPreview'), 'the editor never writes a visitor\'s own settings keys to preview defaults');
  assert(ArkAdminDraftKeys().includes('settingsDefaults'), 'settingsDefaults is one of the drafts siteFromState() sends to the preview');
  function ArkAdminDraftKeys() { const ctx = vm.createContext({}); vm.runInContext(fs.readFileSync('js/admin/store.js', 'utf8') + ';this.S=ArkAdminStore;', ctx); return ctx.S.drafts().map((d) => d.key); }
  console.log('versions: ok');
})().catch((error) => { console.error(error); process.exit(1); });
