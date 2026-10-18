/* =====================================================================
   VERSION HISTORY: every Save, kept forward-only, in FLX
   ---------------------------------------------------------------------
   Why this exists: the Studio merge deleted a "Versions"/export feature
   that only ever worked on a deleted prototype canvas's dense arrays. The
   real site had no history at all, and none could be DERIVED from what
   already exists: Publish names ONE archive (the name record carries no
   link to the version before it, and the miner's names/* registry
   overwrites the record in place), and the archive itself holds only 8 of
   the 13 drafts. So the history of the real site is kept here, beside it.

   Layout, inside the connected project folder (the same directory handle
   ArkAdminStore writes the site through), never served or deployed:

     cms-history/head.flx               a pointer: { head, seq }. The only
                                        file ever rewritten -- it is a
                                        pointer, not a record.
     cms-history/versions/<hash>.flx    one version record, immutable.
     cms-history/bodies/<hash>.flx      one draft body (a page, an article,
                                        the theme...), immutable, shared by
                                        every version whose draft is equal.

   A <hash> is SHA-256 of the value's JSON.stringify form (AGENTS.md: JSON
   is the hashing form, not the storage form). Each file holds the value
   in ARK's structured-state FLX grammar (vendor/flx-state-grammar.js,
   vendored byte-identical from ark-browser/src/shared/flx-state-grammar.js),
   whose round trip is exact to the byte against JSON.stringify -- so every
   read re-derives the address and refuses a file that does not match it.

   A version record links to the one before it (`prev`) and, when it was
   made by restoring an older version, to that version (`restoredFrom`):
   a restore is a NEW record that supersedes, never a rewrite. An imported
   export is the same kind of forward record (`importedFrom`). Listing
   walks `prev` from the head and reads only the records it shows; bodies
   are read only to preview, restore, export, or describe what changed.

   What changed is derived, never typed: the per-draft summary is a walk
   of the two bodies' own shapes (added/removed keys, array lengths,
   changed leaves), so a draft added to the CMS later needs no new code.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./vendor/flx-state-grammar.js'));
  else root.ArkVersions = factory(root.ARK_FLX_STATE);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (FLX) {
  'use strict';

  var FORMAT = 'defxn-cms-version/1';
  var EXPORT_FORMAT = 'defxn-cms-version-export/1';
  var DIR = 'cms-history';

  /* ---- addresses ------------------------------------------------------ */
  async function sha256Hex(text) {
    var bytes = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(bytes), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  function address(value) { return sha256Hex(JSON.stringify(value)); }

  /* A list draft's items are addressed one by one, by their own id (a manifest/asset/secret
     has `id`, an article has `slug`), so an unchanged page is stored once across every version. */
  function itemId(item, index) {
    if (item && typeof item === 'object') {
      if (item.id != null) return String(item.id);
      if (item.slug != null) return String(item.slug);
    }
    return '#' + index;
  }

  /* snapshot -> { items, bodies }. `items` mirrors the snapshot's own keys: a list becomes
     [[id, hash], ...] in its order, anything else becomes one hash ('' for null/absent). */
  async function addressSnapshot(snapshot) {
    var items = {}, bodies = {};
    var keys = Object.keys(snapshot);
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k], value = snapshot[key];
      if (Array.isArray(value)) {
        var list = [];
        for (var i = 0; i < value.length; i++) {
          var hash = await address(value[i]);
          bodies[hash] = value[i];
          list.push([itemId(value[i], i), hash]);
        }
        items[key] = list;
      } else if (value === null || value === undefined) {
        items[key] = '';
      } else {
        var single = await address(value);
        bodies[single] = value;
        items[key] = single;
      }
    }
    return { items: items, bodies: bodies };
  }

  /* ---- files ---------------------------------------------------------- */
  function damaged(where, hash) {
    return new Error('cms-history/' + where + '/' + hash + '.flx does not match its address, so it was not used. ' +
      'Missing: an intact copy of that file. To fix: restore cms-history/ from a backup or the copy you committed; nothing else was changed.');
  }
  async function readText(dir, name) {
    try { return await (await (await dir.getFileHandle(name)).getFile()).text(); }
    catch (error) { if (error && error.name === 'NotFoundError') return null; throw error; }
  }
  async function exists(dir, name) {
    try { await dir.getFileHandle(name); return true; }
    catch (error) { if (error && error.name === 'NotFoundError') return false; throw error; }
  }
  async function writeText(dir, name, text) {
    var out = await (await dir.getFileHandle(name, { create: true })).createWritable();
    await out.write(text);
    await out.close();
  }
  function sub(dir, name) { return dir.getDirectoryHandle(name, { create: true }); }

  /* project folder (the handle the person connected) -> cms-history/ */
  function historyDir(projectRoot) { return projectRoot.getDirectoryHandle(DIR, { create: true }); }

  async function readHead(dir) {
    var text = await readText(dir, 'head.flx');
    return text ? FLX.decodeState(text) : null;
  }
  async function readVersion(dir, hash) {
    var text = await readText(await sub(dir, 'versions'), hash + '.flx');
    if (text === null) throw new Error('Version ' + hash.slice(0, 12) + ' is not in cms-history/versions/. Missing: that record. To fix: restore cms-history/ from a backup; the newer versions are unaffected.');
    var record = FLX.decodeState(text);
    if ((await address(record)) !== hash) throw damaged('versions', hash);
    return record;
  }
  async function readBody(dir, hash) {
    var text = await readText(await sub(dir, 'bodies'), hash + '.flx');
    if (text === null) throw new Error('Draft body ' + hash.slice(0, 12) + ' is not in cms-history/bodies/. Missing: that body. To fix: restore cms-history/ from a backup.');
    var value = FLX.decodeState(text);
    if ((await address(value)) !== hash) throw damaged('bodies', hash);
    return value;
  }

  /* ---- what changed, derived from the values' own shapes ------------- */
  function shapeOf(v) { return v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v; }
  function diffValues(a, b, path, out) {
    if (out.length >= 40 || a === b) return;
    var sa = shapeOf(a), sb = shapeOf(b);
    if (sa !== sb) { out.push({ path: path, op: 'changed', from: a, to: b }); return; }
    if (sa === 'array') {
      if (a.length !== b.length) out.push({ path: path, op: 'length', from: a.length, to: b.length });
      for (var i = 0; i < Math.min(a.length, b.length); i++) diffValues(a[i], b[i], path.concat(i), out);
      return;
    }
    if (sa === 'object') {
      Object.keys(b).forEach(function (key) { if (!Object.prototype.hasOwnProperty.call(a, key)) out.push({ path: path.concat(key), op: 'added' }); });
      Object.keys(a).forEach(function (key) { if (!Object.prototype.hasOwnProperty.call(b, key)) out.push({ path: path.concat(key), op: 'removed' }); });
      Object.keys(b).forEach(function (key) { if (Object.prototype.hasOwnProperty.call(a, key)) diffValues(a[key], b[key], path.concat(key), out); });
      return;
    }
    out.push({ path: path, op: 'changed', from: a, to: b });
  }
  function formatPath(path) {
    if (!path.length) return '(whole value)';
    return path.map(function (seg, i) {
      if (typeof seg === 'number') return '[' + seg + ']';
      if (/^[A-Za-z_$][\w$]*$/.test(seg)) return (i ? '.' : '') + seg;
      return '[' + JSON.stringify(seg) + ']';
    }).join('');
  }
  function shortValue(v) {
    var text = JSON.stringify(v);
    return text !== undefined && text.length <= 32 ? text : null;
  }
  function formatEntry(e) {
    var p = formatPath(e.path);
    if (e.op === 'added') return '+' + p;
    if (e.op === 'removed') return '-' + p;
    if (e.op === 'length') return p + ' ' + e.from + '→' + e.to + ' items';
    var from = shortValue(e.from), to = shortValue(e.to);
    return from !== null && to !== null ? p + ' ' + from + ' → ' + to : p + ' changed';
  }
  function describeDiff(before, after) {
    var out = [];
    diffValues(before, after, [], out);
    if (!out.length) return 'no visible change';
    var shown = out.slice(0, 3).map(formatEntry);
    return shown.join(', ') + (out.length > 3 ? ', +' + (out.length >= 40 ? '40 or more' : out.length - 3) + ' more' : '');
  }

  /* prevItems -> items: { changed: ['states', 'manifests/home', ...], summary: [line, ...] }.
     readPrev(hash) reads an older body; nextBodies holds the new ones already in memory. */
  async function describeChanges(prevItems, items, readPrev, nextBodies) {
    var changed = [], summary = [];
    if (!prevItems) {
      var parts = Object.keys(items).map(function (key) {
        return Array.isArray(items[key]) ? key + ' ' + items[key].length : (items[key] ? key : '');
      }).filter(Boolean);
      return { changed: Object.keys(items), summary: ['first recorded version: ' + parts.join(', ')] };
    }
    var keys = Object.keys(items).concat(Object.keys(prevItems).filter(function (k) { return !(k in items); }));
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k], a = prevItems[key], b = items[key];
      if (Array.isArray(a) || Array.isArray(b)) {
        a = Array.isArray(a) ? a : []; b = Array.isArray(b) ? b : [];
        var before = {}, after = {};
        a.forEach(function (pair) { before[pair[0]] = pair[1]; });
        b.forEach(function (pair) { after[pair[0]] = pair[1]; });
        var added = b.filter(function (pair) { return !(pair[0] in before); }).map(function (pair) { return pair[0]; });
        var removed = a.filter(function (pair) { return !(pair[0] in after); }).map(function (pair) { return pair[0]; });
        var edits = b.filter(function (pair) { return pair[0] in before && before[pair[0]] !== pair[1]; });
        if (added.length || removed.length) {
          summary.push(key + ': ' + added.map(function (id) { return '+' + id; }).concat(removed.map(function (id) { return '-' + id; })).join(', '));
          added.concat(removed).forEach(function (id) { changed.push(key + '/' + id); });
        }
        for (var e = 0; e < edits.length; e++) {
          var id = edits[e][0];
          summary.push(key + ' ' + id + ': ' + describeDiff(await readPrev(before[id]), nextBodies[edits[e][1]]));
          changed.push(key + '/' + id);
        }
        var common = b.map(function (pair) { return pair[0]; }).filter(function (id) { return id in before; });
        var oldOrder = a.map(function (pair) { return pair[0]; }).filter(function (id) { return id in after; });
        if (!added.length && !removed.length && common.join('\n') !== oldOrder.join('\n')) { summary.push(key + ': order changed'); changed.push(key); }
      } else if ((a || '') !== (b || '')) {
        changed.push(key);
        if (!a) summary.push(key + ': added');
        else if (!b) summary.push(key + ': removed');
        else summary.push(key + ': ' + describeDiff(await readPrev(a), nextBodies[b]));
      }
    }
    return { changed: changed, summary: summary };
  }

  /* ---- writing a version ---------------------------------------------- */
  /* One page can press Save twice before the first record lands; records are chained through
     the head, so they are written one at a time. */
  var queue = Promise.resolve();
  function serial(run) { var next = queue.then(run, run); queue = next.catch(function () {}); return next; }

  /* Two tabs of the same editor share one folder, and head.flx is the one file that is rewritten.
     Without coordination both read head H, both write a record whose prev is H, and the second
     head write hides the first record: on disk, absent from the list. Same-origin tabs therefore
     take a Web Lock (navigator.locks) around the whole read-head..write-head step. A writer that
     cannot share that lock (an older browser, a second browser on the same folder) is still caught
     by the compare-and-swap inside writeRecord(). api.lockManager is a function so a test can run
     two writers that do NOT share a lock, which is exactly the case the compare-and-swap is for. */
  var LOCK = 'defxn-cms-history';
  function exclusive(run) {
    var locks = api.lockManager();
    return locks && typeof locks.request === 'function' ? locks.request(LOCK, run) : run();
  }
  var MAX_ATTEMPTS = 8;

  function headHash(head) { return head ? head.head : ''; }
  /* Is `hash` still in the history that `head` leads to? The walk stops at `base`, the record
     `hash` was written on top of: reaching it first means `hash` was swapped out of the chain. */
  async function reachable(dir, head, hash, base) {
    var cursor = headHash(head);
    for (var steps = 0; cursor && steps < 1000; steps++) {
      if (cursor === hash) return true;
      if (cursor === base) return false;
      cursor = (await readVersion(dir, cursor)).prev;
    }
    return false;
  }

  /* dir: cms-history/. snapshot: every draft as saved. meta: { kind: 'save'|'checkpoint'|'publish'|'import',
     at, label, restoredFrom, importedFrom, published, ifEmpty (record only when there is no history yet) }.
     Returns { unchanged, hash, record, reparented }. A plain save whose content equals the head's is
     not recorded again: nothing changed, so there is no new version. */
  function record(dir, snapshot, meta) {
    return serial(function () { return exclusive(function () { return writeRecord(dir, snapshot, meta || {}); }); });
  }

  async function writeRecord(dir, snapshot, meta) {
    var addressed = await addressSnapshot(snapshot);
    var content = await address(addressed.items);
    var kind = meta.kind || 'save';
    var head = await readHead(dir), bodiesWritten = false, reparented = 0;
    for (var attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (meta.ifEmpty && head) return { unchanged: true, hash: head.head, record: null, reparented: reparented };
      var prev = head ? await readVersion(dir, head.head) : null;
      if (prev && prev.content === content && kind === 'save' && !meta.restoredFrom) return { unchanged: true, hash: head.head, record: prev, reparented: reparented };

      if (!bodiesWritten) {
        var bodiesDir = await sub(dir, 'bodies');
        var known = {};
        if (prev) Object.keys(prev.items).forEach(function (key) {
          var v = prev.items[key];
          if (Array.isArray(v)) v.forEach(function (pair) { known[pair[1]] = true; }); else if (v) known[v] = true;
        });
        var hashes = Object.keys(addressed.bodies);
        for (var i = 0; i < hashes.length; i++) {
          var h = hashes[i];
          if (known[h] || await exists(bodiesDir, h + '.flx')) continue;
          await writeText(bodiesDir, h + '.flx', FLX.encodeState(addressed.bodies[h]));
        }
        bodiesWritten = true;
      }

      /* built against `prev`, so a re-parented record describes what changed since the version
         that is really before it, not since the one this writer happened to read first */
      var changes = await describeChanges(prev && prev.items, addressed.items, function (hash) { return readBody(dir, hash); }, addressed.bodies);
      if (kind === 'publish' && meta.published) changes.summary.unshift('published as mesh version ' + meta.published.version + (meta.published.cid ? ' (' + meta.published.cid + ')' : ''));
      if (kind === 'import' && meta.importedFrom) changes.summary.unshift('imported from version ' + meta.importedFrom.slice(0, 12) + (meta.importedName ? ' (' + meta.importedName + ')' : ''));
      var rec = {
        format: FORMAT, kind: kind, seq: prev ? prev.seq + 1 : 1, at: meta.at || new Date().toISOString(),
        prev: headHash(head), restoredFrom: meta.restoredFrom || '', importedFrom: meta.importedFrom || '', label: meta.label || '',
        published: meta.published || null, content: content,
        changed: changes.changed, summary: changes.summary, items: addressed.items
      };
      var hash = await address(rec);

      /* compare-and-swap: the head this record names as prev must still be the head. If another
         writer moved it, build the record again on top of the new head (a NEW record, since the
         address covers prev and seq), never on top of a version that is no longer the latest. */
      var now = await readHead(dir);
      if (headHash(now) !== headHash(head)) { head = now; reparented++; continue; }
      await writeText(await sub(dir, 'versions'), hash + '.flx', FLX.encodeState(rec));
      /* last: the head only ever points at a record whose bodies are already written */
      await writeText(dir, 'head.flx', FLX.encodeState({ head: hash, seq: rec.seq }));
      /* A file system has no atomic compare-and-swap: a writer outside our lock can pass the same
         check and overwrite head.flx between our check and our write. Read it back; if our record
         is no longer in the chain, re-parent onto what is there now. The record written above stays
         on disk unreferenced (future law: records are never deleted or rewritten). */
      var after = await readHead(dir);
      if (await reachable(dir, after, hash, rec.prev)) return { unchanged: false, hash: hash, record: rec, reparented: reparented };
      head = after; reparented++;
    }
    throw new Error('The version history was not updated: cms-history/head.flx kept changing while this version was being added (' + MAX_ATTEMPTS + ' attempts). ' +
      'Missing: a moment when no other tab or browser is saving into this project folder. To fix: close the other editors of this folder and Save again; the site files themselves were saved.');
  }

  /* ---- import: an exported version, proven, added as a NEW forward record ---------------
     The export is verified first (readExport). Its own record is kept beside this history's
     records under its own address, written only when absent, so `importedFrom` resolves to a
     record anyone can re-verify; the new record names it and holds the export's drafts. Nothing
     that exists is overwritten: the head moves forward exactly as it does on Save. */
  async function importVersion(dir, text, meta) {
    var doc = await readExport(text);
    meta = meta || {};
    var versionsDir = await sub(dir, 'versions');
    if (!(await exists(versionsDir, doc.address + '.flx'))) await writeText(versionsDir, doc.address + '.flx', FLX.encodeState(doc.version));
    var result = await record(dir, doc.site, { kind: 'import', importedFrom: doc.address, importedName: meta.name || '', label: meta.label || doc.version.label || '', at: meta.at });
    result.source = doc;
    return result;
  }

  /* ---- reading ----------------------------------------------------------- */
  /* Newest first, `limit` records from `from` (default: the head). `next` continues the walk. */
  async function list(dir, options) {
    options = options || {};
    var limit = options.limit || 20, cursor = options.from;
    if (!cursor) { var head = await readHead(dir); cursor = head ? head.head : ''; }
    var entries = [];
    while (cursor && entries.length < limit) {
      var rec = await readVersion(dir, cursor);
      entries.push({ hash: cursor, record: rec });
      cursor = rec.prev;
    }
    return { entries: entries, next: cursor || null };
  }

  /* hash -> { record, snapshot }, the snapshot rebuilt in the record's own key order */
  async function loadSnapshot(dir, hash) {
    var rec = await readVersion(dir, hash), snapshot = {};
    var keys = Object.keys(rec.items);
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k], v = rec.items[key];
      if (Array.isArray(v)) {
        var values = [];
        for (var i = 0; i < v.length; i++) values.push(await readBody(dir, v[i][1]));
        snapshot[key] = values;
      } else snapshot[key] = v ? await readBody(dir, v) : null;
    }
    return { record: rec, snapshot: snapshot };
  }

  /* ---- export: one self-contained FLX document per version -------------- */
  async function exportVersion(dir, hash) {
    var loaded = await loadSnapshot(dir, hash);
    var text = FLX.encodeState({ format: EXPORT_FORMAT, address: hash, version: loaded.record, site: loaded.snapshot });
    return { name: 'defxn-version-' + loaded.record.seq + '-' + hash.slice(0, 12) + '.flx', text: text };
  }
  /* An exported file, read back and proven: the record re-derives its address, and every draft
     body re-derives the hash the record names for it. */
  /* Every refusal names what is wrong, what is missing, and what the person can do -- a file
     that fails here was damaged or edited after export, and nothing was imported. */
  var REEXPORT = 'To fix: export that version again from the Versions panel of the editor that has it, and import the new file; nothing was imported.';
  async function readExport(text) {
    var doc;
    try { doc = FLX.decodeState(String(text == null ? '' : text)); }
    catch (error) { throw new Error('This file is not readable as FLX (' + error.message + '). Missing: an intact ' + EXPORT_FORMAT + ' file -- it was cut short or edited. ' + REEXPORT); }
    if (!doc || typeof doc !== 'object' || doc.format !== EXPORT_FORMAT) throw new Error('This file is not a DEFXN version export. Missing: the format record "' + EXPORT_FORMAT + '". ' + REEXPORT);
    if (!doc.version || typeof doc.version !== 'object' || !doc.site || typeof doc.site !== 'object' || !/^[0-9a-f]{64}$/.test(String(doc.address))) throw new Error('This export is missing part of itself. Missing: its version record, its drafts, or its address. ' + REEXPORT);
    if ((await address(doc.version)) !== doc.address) throw new Error('The exported version record does not match its address ' + String(doc.address).slice(0, 12) + ': the record was changed after export. Missing: the record exactly as exported. ' + REEXPORT);
    var check = await addressSnapshot(doc.site);
    if ((await address(check.items)) !== doc.version.content) throw new Error('The exported drafts do not match the version they claim to be (content ' + String(doc.version.content).slice(0, 12) + '): a page or setting was changed after export. Missing: the drafts exactly as exported. ' + REEXPORT);
    return doc;
  }

  var api = {
    FORMAT: FORMAT, EXPORT_FORMAT: EXPORT_FORMAT, DIR: DIR, LOCK: LOCK,
    address: address, addressSnapshot: addressSnapshot, describeDiff: describeDiff, describeChanges: describeChanges,
    historyDir: historyDir, readHead: readHead, readVersion: readVersion, readBody: readBody,
    record: record, list: list, loadSnapshot: loadSnapshot, exportVersion: exportVersion, readExport: readExport, importVersion: importVersion,
    lockManager: function () { return (globalThis.navigator && globalThis.navigator.locks) || null; }
  };
  return api;
});
