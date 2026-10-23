/* =====================================================================
   VERSIONS PANEL (admin-app.html's header "Versions" button)
   ---------------------------------------------------------------------
   The view over ArkVersions (js/admin/versions.js). It owns no state of
   the site: everything it does to drafts or to the preview goes through
   callbacks admin.js passes in (`env`), so the one save model, the one
   preview iframe and the one draft set stay where they already live.

     Preview   shows a version in the real preview iframe without saving
               (env.preview); the canvas goes read-only until "Back to
               current drafts".
     Restore   loads a version as the current UNSAVED drafts (env.restore).
               Nothing is written until Save, and that Save records a new
               version that names the restored one -- the versions in
               between stay exactly as they were. When pages, articles,
               images or encrypted items exist now that the version never
               had, the exact list is shown first (env.restorePlan) and the
               person chooses: remove them on the next Save (their files
               leave the site; the history keeps them), keep them, or cancel.
     Export    downloads one version as a single FLX document.
     Import    reads an exported .flx back, refuses it unless it proves
               itself (ArkVersions.readExport), and adds it as a NEW version
               naming the export (`importedFrom`). Nothing existing changes.

   Listing reads only version records, a page at a time ("Show older"),
   never the draft bodies.

   Forks: two editors that save into this folder at the same moment (a
   second browser, another machine syncing it) each add a version on the
   same base -- nothing is overwritten, so the history forks. Each side is
   listed as its own branch (tag "branch A"/"branch B", in time order),
   and the next Save records a version that joins them (tag "joins #n").
   Nothing else about the panel changes.
   ===================================================================== */
var ArkVersionsPanel = (function () {
  'use strict';

  function create(env) {
    var h = env.h, root = env.root;
    var entries = [], next = null, bySeq = {}, previewing = null, loading = false;
    var currentContent = '';   /* the content address of what the project folder holds now (savedSnapshot): the version with it is "Current" */

    function short(hash) { return hash ? hash.slice(0, 12) : ''; }
    function when(at) { var d = new Date(at); return isNaN(d) ? at : d.toLocaleString(); }

    var list = h('ol', { class: 'versions-list', id: 'versionsList' });
    var more = h('button', { type: 'button', class: 'btn versions-more', id: 'versionsMore', text: 'Show older versions', hidden: true, onclick: function () { load(true); } });
    var note = h('p', { class: 'versions-note', id: 'versionsNote' });
    /* the remedy beside the refusal: "connect the folder" with no button left the person to find
       it in the account menu (docs/ux-audit/cms.md P0-3). env.connect is the editor's one connect
       flow (js/admin/project.js connectProject); the panel reloads once it has a folder. */
    var connect = h('button', { type: 'button', class: 'btn primary', id: 'versionsConnect', text: 'Connect project folder', hidden: true,
      onclick: function () { Promise.resolve(env.connect && env.connect()).then(function (ok) { if (ok) load(); }); } });
    var banner = h('div', { class: 'versions-preview', id: 'versionsPreview', role: 'status', hidden: true });
    var label = h('input', { type: 'text', id: 'versionsLabel', placeholder: 'Name this point (optional)', maxlength: '80', spellcheck: 'false' });
    var checkpoint = h('button', { type: 'submit', class: 'btn', id: 'versionsCheckpoint', text: 'Record checkpoint' });
    var form = h('form', { class: 'versions-checkpoint', autocomplete: 'off', onsubmit: function (event) { event.preventDefault(); recordCheckpoint(); } }, label, checkpoint);
    /* the editor's one close button (js/admin/overlay.js) when the editor passes it */
    var close = env.closeButton ? env.closeButton(function () { api.close(); }, 'Close version history') : h('button', { type: 'button', class: 'ov-close', 'aria-label': 'Close version history', text: '×', onclick: function () { api.close(); } });
    var importInput = h('input', { type: 'file', id: 'versionsImportFile', accept: '.flx', hidden: true, onchange: function () { var file = importInput.files && importInput.files[0]; importInput.value = ''; if (file) importFile(file); } });
    var importButton = h('button', { type: 'button', class: 'btn small', id: 'versionsImport', text: 'Import a version file (.flx)', title: 'Add an exported version to this history as a new version', onclick: function () { importInput.click(); } });
    var importNote = h('p', { class: 'versions-import-note', id: 'versionsImportNote', role: 'alert' });
    var confirmBox = h('div', { class: 'versions-confirm', id: 'versionsConfirm', role: 'group', 'aria-label': 'Confirm restore', hidden: true });

    root.textContent = '';
    root.appendChild(h('header', { class: 'versions-head' },
      h('div', {}, h('span', { class: 'versions-kicker', text: 'History' }), h('h2', { text: 'Version history' })), close));
    root.appendChild(h('p', { class: 'versions-lede', text: 'Every Save keeps a version. Bring one back and it becomes your unsaved changes; nothing in between is lost.' }));
    root.appendChild(banner);
    root.appendChild(confirmBox);
    root.appendChild(form);
    /* moving a version between projects is a developer's job: one disclosure, never on every row
       (docs/ux-audit/cms.md P1-15) */
    var devTools = [h('p', { class: 'hint', text: 'Versions are kept in the project folder, in cms-history/. A version can be exported from its own Developer details and imported here.' }), importButton, importInput];
    root.appendChild(env.devDetails ? env.devDetails([], devTools) : h.apply(null, ['div', { class: 'versions-tools' }].concat(devTools)));
    root.appendChild(importNote);
    root.appendChild(note);
    root.appendChild(connect);
    root.appendChild(list);
    root.appendChild(more);

    /* the version whose content is what the project folder holds now; the newest if two share it */
    function currentEntry() { return currentContent ? entries.filter(function (e) { return e.record.content === currentContent; })[0] || null : null; }
    function seqOf(hash) { return bySeq[hash] ? '#' + bySeq[hash] : short(hash); }

    function branchName(n) { return n < 26 ? String.fromCharCode(65 + n) : String(n + 1); }
    /* What a version changed, in words: its derived `changed` list (manifests/home, layout, ...)
       named the way the editor names things -- the page's own title, "Page layout" -- never the
       raw diff ("components: +spots, +masters.mmveixci6q6trc", docs/ux-audit/cms.md P1-15). The
       raw lines stay, under the row's Developer details. */
    var DRAFT_NAMES = { manifests: 'pages', articles: 'articles', assets: 'images', secrets: 'private items', meshSettings: 'Publishing settings',
      theme: 'Site colours', settingsDefaults: 'Visitor settings defaults', seo: 'Search & sharing', layout: 'Page layout', components: 'Components',
      states: 'States', canvasTransitions: 'Page transition', elementMotion: 'Animations' };
    function humanChanges(rec) {
      if (rec.kind === 'publish') return 'Published the site';
      var names = [], seen = {};
      (Array.isArray(rec.changed) ? rec.changed : []).forEach(function (c) {
        var parts = String(c).split('/'), draft = parts[0], id = parts.slice(1).join('/');
        var name = id ? (env.itemName ? env.itemName(draft, id) : '') || id : DRAFT_NAMES[draft] ? DRAFT_NAMES[draft].charAt(0).toUpperCase() + DRAFT_NAMES[draft].slice(1) : draft;
        if (!seen[name]) { seen[name] = true; names.push(name); }
      });
      if (!rec.prev) return 'The project as first recorded';
      if (!names.length) return 'No change to the site';
      return 'Changed: ' + names.slice(0, 4).join(', ') + (names.length > 4 ? ' and ' + (names.length - 4) + ' more' : '');
    }
    var KIND_WORDS = { save: 'Saved', checkpoint: 'Checkpoint', publish: 'Published', import: 'Imported', restore: 'Restored', baseline: 'First version' };
    function row(entry) {
      var rec = entry.record, joins = Array.isArray(rec.joins) ? rec.joins : [];
      var head = h('div', { class: 'version-head' },
        h('span', { class: 'version-seq', text: '#' + rec.seq }),
        h('span', { class: 'version-kind', 'data-kind': rec.kind, text: KIND_WORDS[rec.kind] || rec.kind }),
        entry === currentEntry() ? h('span', { class: 'version-kind', 'data-kind': 'current', title: 'The version your site is at: its pages, articles and settings are exactly what is saved in the project folder now', text: 'Current' }) : null,
        rec.restoredFrom ? h('span', { class: 'version-kind', 'data-kind': 'restore', title: 'Supersedes: made by restoring ' + rec.restoredFrom, text: 'restores ' + seqOf(rec.restoredFrom) }) : null,
        rec.importedFrom ? h('span', { class: 'version-kind', 'data-kind': 'imported', title: 'Imported from the exported version ' + rec.importedFrom, text: 'from ' + short(rec.importedFrom) }) : null,
        joins.length ? h('span', { class: 'version-kind', 'data-kind': 'joined', title: 'Joins the versions saved at the same time on another branch: ' + joins.join(', '), text: 'joins ' + joins.map(seqOf).join(', ') }) : null,
        entry.forked ? h('span', { class: 'version-kind', 'data-kind': 'branch', title: 'Saved at the same time as a version on another branch; both are kept', text: 'branch ' + branchName(entry.branch) }) : null,
        h('time', { datetime: rec.at, text: when(rec.at) }));
      var summary = h('ul', { class: 'version-summary' });
      rec.summary.slice(0, 4).forEach(function (line) { summary.appendChild(h('li', { text: line })); });
      var rest = null;
      if (rec.summary.length > 4) {
        /* the rest of the list folds behind the editor's disclosure (Ark's, js/admin/ark-host.js)
           when the editor passes it; a bare <details> otherwise */
        var restLabel = (rec.summary.length - 4) + ' more change' + (rec.summary.length - 4 === 1 ? '' : 's');
        var restList = h('ul', { class: 'version-summary' });
        rec.summary.slice(4).forEach(function (line) { restList.appendChild(h('li', { text: line })); });
        rest = env.disclosure ? env.disclosure({ label: restLabel, content: restList, className: 'dev-details' })
          : h('details', { class: 'version-more' }, h('summary', { text: restLabel }), restList);
      }
      /* Restore is offered where it does something: the Current version IS the saved site, so with
         nothing unsaved there is nothing to restore -- said in words instead of a button that runs
         and changes nothing (docs/ux-audit/cms.md P1-15). With unsaved changes it stays, and says
         it throws them away. */
      var isCurrent = entry === currentEntry(), dirtyNow = !!(env.anyDirty && env.anyDirty());
      var actions = h('div', { class: 'version-actions' },
        h('button', { type: 'button', class: 'btn tiny', 'data-action': 'preview', text: previewing === entry.hash ? 'Showing on the canvas' : 'Preview', title: 'Show this version on the canvas without changing anything', disabled: previewing === entry.hash, onclick: function () { preview(entry); } }),
        isCurrent && !dirtyNow ? h('span', { class: 'version-here', text: 'Your site is at this version.' })
          : h('button', { type: 'button', class: 'btn tiny', 'data-action': 'restore', text: isCurrent ? 'Discard unsaved changes' : 'Restore this version',
            title: isCurrent ? 'Go back to this version: your unsaved changes are replaced by it, as unsaved changes' : 'Load this version as unsaved changes. Nothing is written until you Save.', onclick: function () { restore(entry); } }));
      var addressList = h('dl', {},
          h('dt', { text: 'Version' }), h('dd', { class: 'mono', text: entry.hash }),
          h('dt', { text: 'Content' }), h('dd', { class: 'mono', text: rec.content }),
          h('dt', { text: 'Previous' }), h('dd', { class: 'mono', text: rec.prev || 'none: the first version' }),
          joins.length ? h('dt', { text: 'Joins' }) : null, joins.length ? h('dd', { class: 'mono', text: joins.join(' ') }) : null,
          rec.restoredFrom ? h('dt', { text: 'Restored from' }) : null, rec.restoredFrom ? h('dd', { class: 'mono', text: rec.restoredFrom }) : null,
          rec.importedFrom ? h('dt', { text: 'Imported from' }) : null, rec.importedFrom ? h('dd', { class: 'mono', text: rec.importedFrom }) : null,
          rec.published ? h('dt', { text: 'Published' }) : null, rec.published ? h('dd', { class: 'mono', text: rec.published.version ? 'version ' + rec.published.version + (rec.published.cid ? ' · ' + rec.published.cid : '') : 'release · ' + (rec.published.cid || 'address not recorded') }) : null);
      /* the raw per-draft diff, the addresses and Export: a developer's (P1-15) */
      var devParts = [summary, rest, h('div', { class: 'version-actions' }, h('button', { type: 'button', class: 'btn tiny', 'data-action': 'export', text: 'Export this version (.flx)', onclick: function () { exportOne(entry); } })), addressList];
      var addresses = env.devDetails ? env.devDetails([], devParts) : h.apply(null, ['div', { class: 'version-addresses' }].concat(devParts));
      return h('li', { class: 'version' + (previewing === entry.hash ? ' is-previewing' : ''), 'data-hash': entry.hash, 'data-seq': String(rec.seq),
        'data-branch': entry.forked ? branchName(entry.branch) : null, 'data-joins': joins.length ? String(joins.length) : null },
        head, rec.label ? h('strong', { class: 'version-label', text: rec.label }) : null, h('p', { class: 'version-human', text: humanChanges(rec) }), actions, addresses);
    }

    function paint() {
      list.textContent = '';
      entries.forEach(function (entry) { list.appendChild(row(entry)); });
      more.hidden = !next;
      var entry = previewing && entries.filter(function (e) { return e.hash === previewing; })[0];
      banner.hidden = !previewing;
      banner.textContent = '';
      if (previewing) {
        banner.appendChild(h('span', { text: 'Showing version ' + (entry ? '#' + entry.record.seq : short(previewing)) + ' on the canvas. You are only looking: nothing changes until you bring it back.' }));
        banner.appendChild(h('div', { class: 'version-actions' },
          h('button', { type: 'button', class: 'btn tiny', id: 'versionsBack', text: 'Back to current drafts', onclick: function () { exitPreview(); } }),
          entry ? h('button', { type: 'button', class: 'btn tiny primary', text: 'Restore this version', onclick: function () { restore(entry); } }) : null));
      }
    }

    async function load(older) {
      if (loading) return;
      var dir = await env.dir();
      label.disabled = checkpoint.disabled = importButton.disabled = !dir;
      connect.hidden = !!dir || !env.connect;
      if (!dir) {
        entries = []; next = null; paint();
        note.textContent = 'Connect the project folder to keep version history: each version is saved in your site folder, the same way Save writes the site.';
        return;
      }
      loading = true;
      try {
        try { currentContent = await ArkVersions.address((await ArkVersions.addressSnapshot(env.savedSnapshot())).items); }
        catch (e) { currentContent = ''; }   /* no marker rather than a wrong one */
        var page = await ArkVersions.list(dir, { from: older ? next : null, limit: 20 });
        entries = older ? entries.concat(page.entries) : page.entries;
        next = page.next;
        entries.forEach(function (e) { bySeq[e.hash] = e.record.seq; });
        if (!older) {
          var notes = [];
          if (!entries.length) notes.push('No versions yet. The next Save records the first one.');
          if (page.heads && page.heads.length > 1) notes.push(page.heads.length + ' versions were saved at the same time by different editors of this folder. All are kept, listed as branches; the next Save joins them.');
          if (page.missing && page.missing.length) notes.push('Version ' + page.missing.map(short).join(', ') + ' is named as a latest version but its record is not in cms-history/versions/ yet; a folder synced from another machine may still be copying it. It will be listed once it arrives.');
          note.textContent = notes.join(' ');
        }
      } catch (error) {
        note.textContent = error.message;
      }
      loading = false;
      paint();
    }

    async function recordCheckpoint() {
      var dir = await env.dir();
      if (!dir) return;
      if (env.anyDirty()) { env.status('Save first: a checkpoint records what is saved, and there are unsaved changes.', 'warn'); return; }
      checkpoint.disabled = true;
      try {
        var result = await ArkVersions.record(dir, env.savedSnapshot(), { kind: 'checkpoint', label: label.value.trim() });
        label.value = '';
        env.status('Recorded checkpoint #' + result.record.seq + '.', 'ok');
      } catch (error) { env.status('The checkpoint was not recorded: ' + error.message, 'error'); }
      checkpoint.disabled = false;
      load(false);
    }

    async function preview(entry) {
      try {
        var loaded = await ArkVersions.loadSnapshot(await env.dir(), entry.hash);
        await env.preview(entry, loaded.snapshot);
        previewing = entry.hash; paint();
      } catch (error) { env.status('Could not preview #' + entry.record.seq + ': ' + error.message, 'error'); }
    }
    function exitPreview() {
      if (!previewing) return;
      previewing = null; env.exitPreview(); paint();
    }
    /* Restore asks first only when it has something to say: items that exist now but not in the
       version (listed exactly, file by file), or unsaved changes it would replace. */
    async function restore(entry) {
      try {
        var loaded = await ArkVersions.loadSnapshot(await env.dir(), entry.hash);
        var plan = env.restorePlan ? env.restorePlan(loaded.snapshot) : { removals: [], dirty: false };
        if (plan.removals.length || plan.dirty) { askRestore(entry, loaded.snapshot, plan); return; }
        await finishRestore(entry, loaded.snapshot, { removeExtras: false, confirmed: true });
      } catch (error) { env.status('Could not restore #' + entry.record.seq + ': ' + error.message, 'error'); }
    }
    async function finishRestore(entry, snapshot, options) {
      hideConfirm();
      if (!(await env.restore(entry, snapshot, options))) return;
      if (previewing) { previewing = null; env.exitPreview(); }
      paint();
    }
    function hideConfirm() { confirmBox.hidden = true; confirmBox.textContent = ''; }
    function askRestore(entry, snapshot, plan) {
      var seq = '#' + entry.record.seq;
      confirmBox.textContent = '';
      confirmBox.appendChild(h('strong', { class: 'versions-confirm-title', text: 'Restore ' + seq + '?' }));
      if (plan.dirty) confirmBox.appendChild(h('p', { text: 'Your unsaved changes are replaced by ' + seq + ', as unsaved drafts.' }));
      if (plan.removals.length) {
        var saved = plan.removals.filter(function (r) { return !r.unsaved; }).length;
        confirmBox.appendChild(h('p', { text: plan.removals.length + ' item' + (plan.removals.length === 1 ? '' : 's') + ' exist now but not in ' + seq + '. ' +
          (saved ? 'To match it exactly, the next Save removes ' + (saved === 1 ? 'this file' : 'these files') + ' from the project folder; the history keeps every one of them.' : '') }));
        var items = h('ul', { class: 'versions-removals', id: 'versionsRemovals' });
        plan.removals.forEach(function (r) {
          items.appendChild(h('li', { 'data-kind': r.kind, 'data-id': r.id },
            h('span', { text: r.label }), h('code', { text: r.unsaved ? 'never saved: discarded' : r.file })));
        });
        confirmBox.appendChild(items);
      }
      var actions = h('div', { class: 'version-actions' });
      var hasSaved = plan.removals.some(function (r) { return !r.unsaved; });
      actions.appendChild(h('button', { type: 'button', class: 'btn tiny primary', 'data-action': 'confirm-restore', text: hasSaved ? 'Restore and remove on Save' : 'Restore',
        onclick: function () { finishRestore(entry, snapshot, { removeExtras: true, confirmed: true }); } }));
      if (hasSaved) actions.appendChild(h('button', { type: 'button', class: 'btn tiny', 'data-action': 'restore-keep', text: 'Restore, keep them',
        onclick: function () { finishRestore(entry, snapshot, { removeExtras: false, confirmed: true }); } }));
      actions.appendChild(h('button', { type: 'button', class: 'btn tiny', 'data-action': 'cancel-restore', text: 'Cancel', onclick: hideConfirm }));
      confirmBox.appendChild(actions);
      confirmBox.hidden = false;
      confirmBox.scrollIntoView({ block: 'nearest' });
    }

    /* A file that does not prove itself is refused with the reason and the remedy, in the panel
       where the person is looking -- and nothing is written. */
    async function importFile(file) {
      var dir = await env.dir();
      importNote.textContent = '';
      if (!dir) return;
      importButton.disabled = true;
      try {
        var result = await ArkVersions.importVersion(dir, await file.text(), { name: file.name });
        importNote.textContent = '';
        env.status('Imported ' + file.name + ' as version #' + result.record.seq + '. Preview or Restore it like any version.', 'ok');
        await load(false);
      } catch (error) {
        importNote.textContent = 'Not imported: ' + file.name + '. ' + error.message;
        env.status('Not imported: ' + file.name + '. ' + error.message, 'error');
      }
      importButton.disabled = false;
    }
    async function exportOne(entry) {
      try {
        var file = await ArkVersions.exportVersion(await env.dir(), entry.hash);
        env.download(file.name, file.text);
        env.status('Exported #' + entry.record.seq + ' as ' + file.name + '.', 'ok');
      } catch (error) { env.status('Could not export #' + entry.record.seq + ': ' + error.message, 'error'); }
    }

    var api = {
      open: function () { root.hidden = false; env.onToggle(true); load(false); },
      close: function () { exitPreview(); hideConfirm(); root.hidden = true; env.onToggle(false); },
      toggle: function () { if (root.hidden) api.open(); else api.close(); },
      refresh: function () { if (!root.hidden) load(false); },
      previewing: function () { return previewing; },
      exitPreview: exitPreview
    };
    return api;
  }

  return { create: create };
})();
