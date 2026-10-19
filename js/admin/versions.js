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

     cms-history/versions/<hash>.flx    one version record, immutable.
     cms-history/bodies/<hash>.flx      one draft body (a page, an article,
                                        the theme...), immutable, shared by
                                        every version whose draft is equal.
     cms-history/heads/<hash>.flx       an index entry: "record <hash> is a
                                        head". Created once, never rewritten;
                                        removed only once a newer head file
                                        names it (see "Heads" below).
     cms-history/legacy/<hash>.flx      a marker: the value <hash> that the
                                        old head.flx pointer held has been
                                        carried into heads/. Created once.
     cms-history/head.flx               LEGACY, read-only. Histories written
                                        before 2026-10-18 kept one mutable
                                        pointer here. It is read, never
                                        written or deleted (future law).

   A <hash> is SHA-256 of the value's JSON.stringify form (AGENTS.md: JSON
   is the hashing form, not the storage form). Each file holds the value
   in ARK's structured-state FLX grammar (vendor/flx-state-grammar.js,
   vendored byte-identical from ark-browser/src/shared/flx-state-grammar.js),
   whose round trip is exact to the byte against JSON.stringify -- so every
   read re-derives the address and refuses a file that does not match it.

   A version record links to the one before it (`prev`) and, when it was
   made by restoring an older version, to that version (`restoredFrom`):
   a restore is a NEW record that supersedes, never a rewrite. An imported
   export is the same kind of forward record (`importedFrom`). A record
   that joins a fork names the other heads it joins (`joins`).

   Heads, derived not authored. There is no mutable pointer. A head is a
   record no other record names as `prev` or in `joins`; heads/ is the
   cheap index of that derivation (a directory listing, no file reads).
   Why not one pointer file: a file system has no atomic compare-and-swap,
   so a writer that shares no lock with us (a second browser, another
   machine syncing the folder through Dropbox/iCloud/git) could overwrite
   the pointer and hide a record. Here two such writers can only each ADD
   a head file -- a fork, shown as two branches, joined by the next Save.
   Nothing is overwritten, so nothing can be lost.

   Why removing a head file is safe: heads/<p> is removed only AFTER
   versions/<r> and heads/<r> exist for a record r that reaches p. By
   induction on seq (strictly increasing along prev/joins), every record
   that ever had a head file stays reachable from a head file that exists,
   whatever any other writer does meanwhile. A removal that races with
   anything can at worst leave an extra head file (pruned at read time: a
   candidate another candidate reaches is not a head) or let a writer see
   an older head and fork (joined on the next Save). Removal is a cache
   trim, not a correctness step: without it heads/ only grows.

   What remains (stated, not hidden): a directory listing is not atomic
   in every browser, and a sync tool can deliver a removal before the
   head file that superseded it. A writer that therefore sees NO head
   while a history exists starts a new line ("first recorded version").
   Nothing is lost -- both lines are heads afterwards and the next Save
   joins them -- but that one record describes itself against nothing.

   What changed is derived, never typed: the per-draft summary is a walk
   of the two bodies' own shapes (added/removed keys, array lengths,
   changed leaves), so a draft added to the CMS later needs no new code.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./vendor/flx-state-grammar.js'));
  else root.ArkVersions = factory(root.ARK_FLX_STATE);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (FLX) {
  'use strict';

  /* /2 added `joins`. A /1 reader would walk `prev` alone and miss a joined branch, so the
     format names the change; /1 records (prev only, no joins) are read as they are. */
  var FORMAT = 'defxn-cms-version/2';
  var EXPORT_FORMAT = 'defxn-cms-version-export/1';
  var DIR = 'cms-history';
  var ADDRESS = /^[0-9a-f]{64}$/;

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

  /* the records a record follows: its `prev` and, for a record that joined a fork, `joins` */
  function parentsOf(record) {
    var out = record && record.prev ? [record.prev] : [];
    return record && Array.isArray(record.joins) ? out.concat(record.joins) : out;
  }

  /* ---- files ---------------------------------------------------------- */
  function damaged(where, hash) {
    return new Error('cms-history/' + where + '/' + hash + '.flx does not match its address, so it was not used. ' +
      'Missing: an intact copy of that file. To fix: restore cms-history/ from a backup or the copy you committed; nothing else was changed.');
  }
  function isNotFound(error) { return error && (error.name === 'NotFoundError' || error.code === 'ENOENT'); }
  async function readText(dir, name) {
    try { return await (await (await dir.getFileHandle(name)).getFile()).text(); }
    catch (error) { if (isNotFound(error)) return null; throw error; }
  }
  async function writeText(dir, name, text) {
    var out = await (await dir.getFileHandle(name, { create: true })).createWritable();
    await out.write(text);
    await out.close();
  }
  /* Every file this store writes is content-addressed: its bytes are determined by its name.
     So "write once" is: read what is there, and write only when it is not already exactly these
     bytes. Two writers that race on the same name write identical bytes (the one documented case
     of a second write to a path); an empty or cut-short file -- another writer mid-write, or a
     sync that has not finished -- is completed with the bytes its name requires. */
  async function writeOnce(dir, name, text) {
    if ((await readText(dir, name)) === text) return false;
    await writeText(dir, name, text);
    return true;
  }
  function sub(dir, name) { return dir.getDirectoryHandle(name, { create: true }); }
  /* a subdirectory for READING: absent is empty, and reading never creates anything */
  async function subIfAny(dir, name) {
    try { return await dir.getDirectoryHandle(name); }
    catch (error) { if (isNotFound(error)) return null; throw error; }
  }
  /* the entry names of a directory (File System Access: keys(); entries() as a fallback) */
  async function namesIn(dir) {
    var out = [];
    if (typeof dir.keys === 'function') { for await (var key of dir.keys()) out.push(key); return out; }
    if (typeof dir.entries === 'function') { for await (var entry of dir.entries()) out.push(entry[0]); return out; }
    throw new Error('The version history cannot list cms-history/heads/. Missing: directory listing on this folder handle (FileSystemDirectoryHandle.keys). ' +
      'To fix: open the editor in a browser with the File System Access API (Chrome or Edge, current version); nothing was changed.');
  }
  async function removeIfAny(dir, name) {
    if (typeof dir.removeEntry !== 'function') return false; /* heads/ then only grows; reads prune it */
    try { await dir.removeEntry(name); return true; }
    catch (error) { if (isNotFound(error)) return false; throw error; }
  }

  /* project folder (the handle the person connected) -> cms-history/ */
  function historyDir(projectRoot) { return projectRoot.getDirectoryHandle(DIR, { create: true }); }

  async function readVersion(dir, hash) {
    var record = await tryReadVersion(dir, hash);
    if (record === null) throw new Error('Version ' + hash.slice(0, 12) + ' is not in cms-history/versions/. Missing: that record. To fix: restore cms-history/ from a backup; the newer versions are unaffected.');
    return record;
  }
  /* null when the record is absent. Absent is not damage: in a folder synced between machines a
     head file can arrive before the record it names (readHeads reports it as `missing`). An empty
     file counts as absent -- File System Access creates a file empty and fills it on close, and
     no record encodes to '' -- so a record caught mid-write is "not arrived", never "damaged". */
  async function tryReadVersion(dir, hash) {
    var text = await readText(await sub(dir, 'versions'), hash + '.flx');
    if (text === null || text === '') return null;
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
  /* ---- heads: derived from heads/ (and, read-only, the legacy head.flx) ----------------
     -> { heads: [{ hash, record }] newest first, stale: [hash], missing: [hash],
          indexed: [hash] (names in heads/), legacy: hash|'' (head.flx's value, not yet carried) }
     A candidate is stale when another candidate reaches it through prev/joins. seq strictly
     increases along those links, so the walk only expands records whose seq is above the
     candidate's: a stale index entry right behind the head costs a step or two, not the history. */
  function newestFirst(a, b) {
    return String(b.record.at).localeCompare(String(a.record.at)) || (b.record.seq - a.record.seq) || (a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0);
  }
  async function readHeads(dir) {
    /* ORDER MATTERS: the legacy pointer and its marker are read BEFORE heads/ is listed. A writer
       creates its head file before the marker, so a marker seen here means a head file reaching
       that value already existed -- and is still listed below, or a successor is. Listing first
       let one ordering see "no head files yet" and then "already carried", i.e. an empty history
       (found by tests/versions.cjs 3c, which runs every ordering). */
    var legacy = '';
    var pointer = await readText(dir, 'head.flx');
    if (pointer) {
      var value;
      try { value = FLX.decodeState(pointer); }
      catch (error) {
        throw new Error('cms-history/head.flx (the pointer older editors kept) is not readable FLX (' + error.message + '), so the latest versions could not be found. ' +
          'Missing: an intact head.flx. To fix: restore cms-history/head.flx from a backup or the copy you committed; nothing was changed.');
      }
      var at = value && value.head;
      if (typeof at === 'string' && ADDRESS.test(at)) {
        var marks = await subIfAny(dir, 'legacy');
        if (!marks || (await readText(marks, at + '.flx')) === null) legacy = at;
      }
    }
    var headsDir = await subIfAny(dir, 'heads');
    var indexed = headsDir ? (await namesIn(headsDir)).filter(function (n) { return /^[0-9a-f]{64}\.flx$/.test(n); }).map(function (n) { return n.slice(0, 64); }) : [];
    var candidates = indexed.slice();
    if (legacy && candidates.indexOf(legacy) < 0) candidates.push(legacy);
    var cache = {}, found = [], missing = [];
    async function get(hash) {
      if (!(hash in cache)) cache[hash] = await tryReadVersion(dir, hash);
      return cache[hash];
    }
    for (var i = 0; i < candidates.length; i++) {
      var rec = await get(candidates[i]);
      if (rec) found.push({ hash: candidates[i], record: rec }); else missing.push(candidates[i]);
    }
    var stale = [];
    if (found.length > 1) {
      for (var c = 0; c < found.length; c++) {
        var target = found[c], queue = found.filter(function (f) { return f !== target; }).map(function (f) { return f.record; }), seen = {};
        var reached = false;
        while (queue.length && !reached) {
          var parents = parentsOf(queue.shift());
          for (var p = 0; p < parents.length && !reached; p++) {
            if (parents[p] === target.hash) { reached = true; break; }
            if (seen[parents[p]]) continue;
            seen[parents[p]] = true;
            var parent = await get(parents[p]);
            if (parent && parent.seq > target.record.seq) queue.push(parent);
          }
        }
        if (reached) stale.push(target.hash);
      }
    }
    var heads = found.filter(function (f) { return stale.indexOf(f.hash) < 0; }).sort(newestFirst);
    return { heads: heads, stale: stale, missing: missing, indexed: indexed, legacy: legacy };
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
  /* One page can press Save twice before the first record lands; one writer adds its records
     one at a time, so its second record follows its first instead of forking from it. */
  var queue = Promise.resolve();
  function serial(run) { var next = queue.then(run, run); queue = next.catch(function () {}); return next; }

  /* Same-origin tabs take a Web Lock (navigator.locks) around the whole read-heads..write step.
     That is the cheap path, not the correctness: without it two tabs fork exactly as two
     machines do, and the fork is kept and joined. api.lockManager is a function so a test can
     run writers that share NO lock. */
  var LOCK = 'defxn-cms-history';
  function exclusive(run) {
    var locks = api.lockManager();
    return locks && typeof locks.request === 'function' ? locks.request(LOCK, run) : run();
  }
  /* The record this editor wrote last. When the history has forked, a join is described against
     this writer's own branch ("what I changed"), and the other branches are compared after it. */
  var lastWritten = '';

  /* dir: cms-history/. snapshot: every draft as saved. meta: { kind: 'save'|'checkpoint'|'publish'|'import',
     at, label, restoredFrom, importedFrom, published, ifEmpty (record only when there is no history yet) }.
     Returns { unchanged, hash, record, joined }. A plain save whose content equals the single head's
     is not recorded again: nothing changed, so there is no new version. When there are two or more
     heads, a record is always written: it joins them (`joins`), and that is a change of the history. */
  function record(dir, snapshot, meta) {
    return serial(function () { return exclusive(function () { return writeRecord(dir, snapshot, meta || {}); }); });
  }

  async function writeRecord(dir, snapshot, meta) {
    var addressed = await addressSnapshot(snapshot);
    var content = await address(addressed.items);
    var kind = meta.kind || 'save';
    var view = await readHeads(dir);
    if (view.missing.length) throw new Error('The version history was not updated: cms-history/ names version ' + view.missing.map(function (h) { return h.slice(0, 12); }).join(', ') +
      ' as a latest version, but its record is not in cms-history/versions/ yet. Missing: that record -- a folder synced from another machine may still be copying it. ' +
      'To fix: wait for the sync to finish and Save again (or restore cms-history/ from a backup); the site files themselves were saved.');
    var heads = view.heads;
    if (meta.ifEmpty && heads.length) return { unchanged: true, hash: heads[0].hash, record: null, joined: 0 };
    var primary = heads.filter(function (x) { return x.hash === lastWritten; })[0] || heads[0] || null;
    var others = heads.filter(function (x) { return x !== primary; });
    if (!others.length && primary && primary.record.content === content && kind === 'save' && !meta.restoredFrom) return { unchanged: true, hash: primary.hash, record: primary.record, joined: 0 };

    var bodiesDir = await sub(dir, 'bodies');
    var known = {};
    heads.forEach(function (x) {
      Object.keys(x.record.items).forEach(function (key) {
        var v = x.record.items[key];
        if (Array.isArray(v)) v.forEach(function (pair) { known[pair[1]] = true; }); else if (v) known[v] = true;
      });
    });
    var hashes = Object.keys(addressed.bodies);
    for (var i = 0; i < hashes.length; i++) {
      if (!known[hashes[i]]) await writeOnce(bodiesDir, hashes[i] + '.flx', FLX.encodeState(addressed.bodies[hashes[i]]));
    }

    var readPrev = function (hash) { return readBody(dir, hash); };
    var changes = await describeChanges(primary && primary.record.items, addressed.items, readPrev, addressed.bodies);
    if (others.length) {
      /* what this content holds against each joined branch: a site file has one value, so a join
         keeps every branch in the history but the drafts are this writer's -- say what differs */
      for (var o = 0; o < others.length; o++) {
        var against = await describeChanges(others[o].record.items, addressed.items, readPrev, addressed.bodies);
        (against.summary.length ? against.summary : ['same drafts']).slice(0, 4).forEach(function (line) { changes.summary.push('vs #' + others[o].record.seq + ' ' + line); });
      }
      changes.summary.unshift('joins #' + others.map(function (x) { return x.record.seq + ' (' + x.hash.slice(0, 12) + ')'; }).join(', #') +
        ': saved at the same time as #' + primary.record.seq + ' by another editor of this folder; ' + (others.length > 1 ? 'all' : 'both') + ' are kept');
    }
    /* A record from before 2026-10-19 carries the name record's version; a release carries only its address. */
    if (kind === 'publish' && meta.published) changes.summary.unshift(meta.published.version ? 'published as mesh version ' + meta.published.version + (meta.published.cid ? ' (' + meta.published.cid + ')' : '') : 'published as release ' + (meta.published.cid || '(address not recorded)'));
    if (kind === 'import' && meta.importedFrom) changes.summary.unshift('imported from version ' + meta.importedFrom.slice(0, 12) + (meta.importedName ? ' (' + meta.importedName + ')' : ''));
    var seq = heads.reduce(function (max, x) { return Math.max(max, x.record.seq); }, 0) + 1;
    var rec = {
      format: FORMAT, kind: kind, seq: seq, at: meta.at || new Date().toISOString(),
      prev: primary ? primary.hash : '', joins: others.map(function (x) { return x.hash; }),
      restoredFrom: meta.restoredFrom || '', importedFrom: meta.importedFrom || '', label: meta.label || '',
      published: meta.published || null, content: content,
      changed: changes.changed, summary: changes.summary, items: addressed.items
    };
    var hash = await address(rec);

    /* order is the safety argument: record, then its head file, then the legacy marker, and only
       then the head files it supersedes -- at every instant every record is reachable from a head
       file that exists */
    await writeOnce(await sub(dir, 'versions'), hash + '.flx', FLX.encodeState(rec));
    var headsDir = await sub(dir, 'heads');
    await writeOnce(headsDir, hash + '.flx', FLX.encodeState({ head: hash, seq: seq }));
    if (view.legacy) await writeOnce(await sub(dir, 'legacy'), view.legacy + '.flx', FLX.encodeState({ head: view.legacy }));
    var superseded = heads.map(function (x) { return x.hash; }).concat(view.stale);
    for (var s = 0; s < superseded.length; s++) {
      if (view.indexed.indexOf(superseded[s]) >= 0) await removeIfAny(headsDir, superseded[s] + '.flx');
    }
    lastWritten = hash;
    return { unchanged: false, hash: hash, record: rec, joined: others.length };
  }

  /* ---- import: an exported version, proven, added as a NEW forward record ---------------
     The export is verified first (readExport). Its own record is kept beside this history's
     records under its own address, written only when absent, so `importedFrom` resolves to a
     record anyone can re-verify; the new record names it and holds the export's drafts. It is
     NOT a head (it has no head file): it is evidence for `importedFrom`, not part of this
     history's line. Nothing that exists is overwritten. */
  async function importVersion(dir, text, meta) {
    var doc = await readExport(text);
    meta = meta || {};
    await writeOnce(await sub(dir, 'versions'), doc.address + '.flx', FLX.encodeState(doc.version));
    var result = await record(dir, doc.site, { kind: 'import', importedFrom: doc.address, importedName: meta.name || '', label: meta.label || doc.version.label || '', at: meta.at });
    result.source = doc;
    return result;
  }

  /* ---- reading ----------------------------------------------------------- */
  /* Newest first, `limit` records, every branch merged in time order. Started from the derived
     heads (or `from`: a hash, or the `next` cursor of a previous page, which is opaque: it holds
     the walk's frontier and what it has already queued, so a fork base shared by two branches is
     listed once, on whichever page reaches it).
     Each entry: { hash, record, branch, forked }. `branch` numbers the line the walk reached it on
     (0 for the first head's); `forked` is true while two or more lines are still open, i.e. the
     record sits on one side of a fork. A record is ordered by its `at`, never later than a record
     that follows it (a skewed clock on one machine cannot list a record above its successor).
     The page also carries `heads` (2+ means an open fork the next Save joins) and `missing`
     (heads whose records have not arrived in this folder yet). */
  async function list(dir, options) {
    options = options || {};
    var limit = options.limit || 20, from = options.from;
    var frontier = [], queued = {}, lanes = 0, view = null;
    if (from && typeof from === 'object') {
      frontier = from.frontier.slice(); queued = Object.assign({}, from.queued); lanes = from.lanes;
    } else {
      var start;
      if (typeof from === 'string' && from) start = [{ hash: from, record: await readVersion(dir, from) }];
      else { view = await readHeads(dir); start = view.heads; }
      start.forEach(function (x) { queued[x.hash] = true; frontier.push({ hash: x.hash, record: x.record, key: String(x.record.at), branch: lanes++ }); });
    }
    function before(a, b) { /* true when a is listed before b */
      if (a.key !== b.key) return a.key > b.key;
      if (a.record.seq !== b.record.seq) return a.record.seq > b.record.seq;
      return a.hash < b.hash;
    }
    var entries = [];
    while (frontier.length && entries.length < limit) {
      var open = {};
      frontier.forEach(function (f) { open[f.branch] = true; });
      var best = 0;
      for (var i = 1; i < frontier.length; i++) if (before(frontier[i], frontier[best])) best = i;
      var item = frontier.splice(best, 1)[0];
      entries.push({ hash: item.hash, record: item.record, branch: item.branch, forked: Object.keys(open).length > 1 });
      var parents = parentsOf(item.record);
      for (var p = 0; p < parents.length; p++) {
        var lane = p === 0 ? item.branch : lanes++;
        var key = item.key;
        if (queued[parents[p]]) {
          var pending = frontier.filter(function (f) { return f.hash === parents[p]; })[0];
          if (pending) { pending.branch = Math.min(pending.branch, lane); if (key < pending.key) pending.key = key; }
          continue;
        }
        queued[parents[p]] = true;
        var parent = await readVersion(dir, parents[p]);
        var at = String(parent.at);
        frontier.push({ hash: parents[p], record: parent, key: at < key ? at : key, branch: lane });
      }
    }
    var page = { entries: entries, next: frontier.length ? { frontier: frontier, queued: queued, lanes: lanes } : null };
    if (view) { page.heads = view.heads.map(function (x) { return x.hash; }); page.missing = view.missing; }
    return page;
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
    if (!doc.version || typeof doc.version !== 'object' || !doc.site || typeof doc.site !== 'object' || !ADDRESS.test(String(doc.address))) throw new Error('This export is missing part of itself. Missing: its version record, its drafts, or its address. ' + REEXPORT);
    if ((await address(doc.version)) !== doc.address) throw new Error('The exported version record does not match its address ' + String(doc.address).slice(0, 12) + ': the record was changed after export. Missing: the record exactly as exported. ' + REEXPORT);
    var check = await addressSnapshot(doc.site);
    if ((await address(check.items)) !== doc.version.content) throw new Error('The exported drafts do not match the version they claim to be (content ' + String(doc.version.content).slice(0, 12) + '): a page or setting was changed after export. Missing: the drafts exactly as exported. ' + REEXPORT);
    return doc;
  }

  var api = {
    FORMAT: FORMAT, EXPORT_FORMAT: EXPORT_FORMAT, DIR: DIR, LOCK: LOCK,
    address: address, addressSnapshot: addressSnapshot, describeDiff: describeDiff, describeChanges: describeChanges, parentsOf: parentsOf,
    historyDir: historyDir, readHeads: readHeads, readVersion: readVersion, readBody: readBody,
    record: record, list: list, loadSnapshot: loadSnapshot, exportVersion: exportVersion, readExport: readExport, importVersion: importVersion,
    lockManager: function () { return (globalThis.navigator && globalThis.navigator.locks) || null; }
  };
  return api;
});
