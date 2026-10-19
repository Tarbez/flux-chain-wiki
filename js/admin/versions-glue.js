/* =====================================================================
   ADMIN EDITOR · VERSION HISTORY GLUE (js/admin/versions-glue.js)
   ---------------------------------------------------------------------
   Owns: the glue between the version store (js/admin/versions.js), its panel
   (js/admin/versions-panel.js) and the drafts here -- savedSnapshot, recordVersion,
   previewing a past version, Restore (with its pending removals and reorders), and the
   derived search files (sitemap.xml / robots.txt / llms.txt) each save rewrites.
   Must not: duplicate what versions.js stores or how the panel draws it.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, ITEM_KINDS = A.ITEM_KINDS, singleDraftHandle = A.singleDraftHandle,
      status = A.status, selectStudio = A.selectStudio, $ = A.$, syncCmsPreview = A.syncCmsPreview,
      renderList = A.renderList, reloadPreview = A.reloadPreview,
      anyDirty = A.anyDirty, removeItemFile = A.removeItemFile, siteFromState = A.siteFromState,
      studioRoutes = A.studioRoutes, touch = A.touch, h = A.h, download = A.download;
  /* the mounted form panels re-draw from the restored drafts (js/admin/panels.js) */
  var refreshPanels = A.later('refreshPanels'), connectProject = A.later('connectProject');

  /* STEP 1 CLEANUP: the dense-encoding "Versions" feature (encodeDense/namedTree/base32/
     cidOf/publish, and the "History" tab/#paneVer that showed it) is deleted with no
     replacement, per the approved plan -- it froze a sha-256-addressed snapshot of the
     dense-array format specifically, which no longer exists. The real version history below
     (js/admin/versions.js) is new work, not a port of it. */
  /* ---- version history (js/admin/versions.js + js/admin/versions-panel.js) ------------
     The history is kept beside the site in cms-history/, through the same connected folder
     Save writes the site through. Publish cannot supply it: the name record has no link to
     the version before it (its archive now carries all 13 drafts, but only the latest). This block is only the
     glue between the store, the panel, and the drafts/preview/save that already live here. */
  var versionPreviewReturn = null, pendingRestore = '';
  /* Items a confirmed Restore takes out of the site: { page: { id: savedJSON }, article, asset,
     secret }. They leave the lists at once (the editor and preview show the restored version),
     but their files stay until the next Save removes them through removeItemFile() -- so until
     then they are still part of what is on disk, and of savedSnapshot(). */
  var restoreRemovals = { page: {}, article: {}, asset: {}, secret: {} };
  var SNAPSHOT_KEY = { page: 'manifests', article: 'articles', asset: 'assets', secret: 'secrets' };
  function restoreRemovalsPending() {
    return !!restoreRemovals && Object.keys(restoreRemovals).some(function (kind) { return Object.keys(restoreRemovals[kind]).length > 0; });
  }
  /* Lists a Restore put back in the version's order while every item in them was already saved:
     no item is dirty, so no item save would rewrite the index -- the next Save writes the index
     alone (writeRestoredOrder). Without this a restore that differed only in order saved nothing,
     and its content address could never equal the version's. */
  var restoreReorder = { page: false, article: false, asset: false, secret: false };
  function restoreReorderPending() { return !!restoreReorder && Object.keys(restoreReorder).some(function (kind) { return restoreReorder[kind]; }); }
  async function writeRestoredOrder(attempt) {
    var kinds = Object.keys(restoreReorder).filter(function (kind) { return restoreReorder[kind]; });
    for (var i = 0; i < kinds.length; i++) {
      await attempt(ITEM_KINDS[kinds[i]].index.file + ' (order)', true, async function (kind) {
        var k = ITEM_KINDS[kind];
        if (!k.dir()) throw new Error(k.index.file + ' was not rewritten. Missing: the connected project folder. To fix: connect it (Connect project folder) and Save again.');
        await k.index.write(state[k.ids].filter(function (id) { return state[k.saved][id] != null; }));
        restoreReorder[kind] = false;
      }.bind(null, kinds[i]));
    }
  }
  /* Every draft exactly as it is saved now: the *Saved JSON each draft's own dirty check
     compares against. So a version records the files on disk -- never an unsaved draft, and
     never one whose save just failed. The keys are siteFromState()'s (both follow ArkAdminStore.drafts()),
     so a version previews through the same message the live drafts do. */
  function savedSnapshot() {
    function each(ids, saved, kind) {
      var out = ids.filter(function (id) { return saved[id] != null; }).map(function (id) { return JSON.parse(saved[id]); });
      Object.keys(restoreRemovals[kind]).forEach(function (id) { out.push(JSON.parse(restoreRemovals[kind][id])); }); /* still on disk until Save removes it */
      return out;
    }
    function one(text) { return text == null ? null : JSON.parse(text); }
    var snapshot = { manifests: each(state.ids, state.saved, 'page'), articles: each(state.slugs, state.aSaved, 'article'), assets: each(state.assetIds, state.assetSaved, 'asset'), secrets: each(state.secretIds, state.secretSaved, 'secret') };
    /* the single drafts in ArkAdminStore.drafts() order -- the same order this list was written in by hand before */
    ArkAdminStore.drafts('single').forEach(function (d) { snapshot[d.key] = one(singleDraftHandle(d.key).saved()); });
    return snapshot;
  }
  /* -> a sentence to append to the save message ('' when there is nothing to say) */
  async function recordVersion(savedCount, meta) {
    if (!savedCount || !state.historyDir || !window.ArkVersions) return '';
    /* a caller that names its own restoredFrom (afterDelete: '') does not consume a pending
       Restore -- that claim belongs to the Save that writes the restored drafts */
    var claimsRestore = !meta || !Object.prototype.hasOwnProperty.call(meta, 'restoredFrom');
    try {
      var result = await ArkVersions.record(state.historyDir, savedSnapshot(), Object.assign({ kind: 'save', restoredFrom: pendingRestore }, meta || {}));
      if (claimsRestore) pendingRestore = '';
      if (versionsPanel) versionsPanel.refresh();
      return result.unchanged ? '' : ' Recorded version #' + result.record.seq + '.';
    } catch (error) {
      return ' The version history was not updated (' + error.message + '); the files themselves were saved.';
    }
  }
  /* sitemap.xml / robots.txt / llms.txt into the connected project's root, from what is SAVED
     (savedSnapshot(): the files on disk, never an unsaved or failed draft), through the one
     generator publish/pull also uses (ArkSEO.searchFiles; scripts/lib/site-bundle.mjs
     projectFiles). Save and Delete call it, so the folder's root files never wait for a
     publish to catch up with an SEO edit. -> the names of the files that changed. */
  async function writeSearchFiles() {
    if (!state.cdirs || !state.cdirs.root || !window.ArkSEO || !ArkSEO.searchFiles) return [];
    var saved = savedSnapshot();
    return ArkAdminStore.saveSearchFiles(state.cdirs.root, ArkSEO.searchFiles(saved.seo || {}, saved.manifests, saved.articles));
  }
  /* An empty history starts from the project as it was found, so the first Save already has
     something to differ from -- and to restore. Needs the folder AND the article bodies (a
     snapshot taken before they load would record every article as missing). */
  function ensureVersionBaseline() {
    if (!state.historyDir || !state.articlesReady || !window.ArkVersions) return;
    ArkVersions.record(state.historyDir, savedSnapshot(), { kind: 'checkpoint', label: 'The project as first connected', ifEmpty: true })
      .then(function (result) { if (!result.unchanged && versionsPanel) versionsPanel.refresh(); })
      .catch(function (error) { status('Version history could not start: ' + error.message, 'warn'); });
  }
  /* Show a version in the real preview iframe, read-only: Design canvas, Live mode (clicks act
     like a visitor's, so nothing can be selected and edited against the wrong drafts). */
  function previewVersion(entry, snapshot) {
    if (!state.versionPreviewSite) versionPreviewReturn = { kind: state.kind, live: state.live };
    state.versionPreviewSite = snapshot;
    if (state.kind !== 'studio') selectStudio();
    if (!state.live) $('mode').querySelector('[data-m="live"]').click();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    syncCmsPreview(true);
  }
  function exitVersionPreview() {
    if (!state.versionPreviewSite) return;
    var back = versionPreviewReturn;
    state.versionPreviewSite = null; versionPreviewReturn = null;
    if (back && !back.live && state.live) $('mode').querySelector('[data-m="edit"]').click();
    syncCmsPreview(true);
    if (back && back.kind !== state.kind) { state.kind = back.kind; renderList(); refreshPanels(); reloadPreview(); }
  }
  /* Restore = load the version as the current UNSAVED drafts. Nothing is written here; the next
     Save writes the files and records a new version naming this one (restoredFrom).
     A page/article/image/encrypted item that exists now but not in the version is listed by
     restorePlan() BEFORE anything changes (the Versions panel shows the exact files and asks).
     With options.removeExtras the next Save removes those files through removeItemFile(), the
     same path Delete uses -- the site's working files only: every version that holds them keeps
     them, so the removal is a new version, not a rewrite. Without it they are kept and named. */
  function itemOf(kind, id) { var text = restoreRemovals[kind][id] != null ? restoreRemovals[kind][id] : state[ITEM_KINDS[kind].saved][id]; return text == null ? null : JSON.parse(text); }
  function restorePlan(snapshot) {
    var removals = [];
    Object.keys(ITEM_KINDS).forEach(function (kind) {
      var k = ITEM_KINDS[kind], inVersion = {};
      (snapshot[SNAPSHOT_KEY[kind]] || []).forEach(function (value) { inVersion[kind === 'article' ? value.slug : value.id] = true; });
      state[k.ids].concat(Object.keys(restoreRemovals[kind])).forEach(function (id) {
        if (inVersion[id]) return;
        var unsaved = state[k.saved][id] === null && restoreRemovals[kind][id] == null, item = unsaved ? state[k.drafts][id] : itemOf(kind, id);
        var name = item && (item.title || item.label);
        removals.push({ kind: kind, id: id, unsaved: unsaved, file: k.path + id + '.js', label: k.noun + ' "' + id + '"' + (name && name !== id ? ' (' + name + ')' : '') });
      });
    });
    return { removals: removals, dirty: anyDirty() };
  }
  /* A second Restore before Save starts over from what is on disk: earlier pending removals go
     back into the lists first, so they are judged against the new version, not dropped twice. */
  function undoRestoreRemovals() {
    Object.keys(restoreRemovals).forEach(function (kind) {
      var k = ITEM_KINDS[kind];
      Object.keys(restoreRemovals[kind]).forEach(function (id) {
        var text = restoreRemovals[kind][id];
        if (state[k.ids].indexOf(id) < 0) state[k.ids].push(id);
        state[k.saved][id] = text; state[k.drafts][id] = JSON.parse(text);
      });
      restoreRemovals[kind] = {};
    });
  }
  /* saveEverything()'s last step: each pending removal is its own attempt, named in the Save
     message, and stays pending if it fails (its file is still there; the next Save retries). */
  async function removeRestoredExtras(attempt) {
    var kinds = Object.keys(restoreRemovals);
    for (var i = 0; i < kinds.length; i++) {
      var kind = kinds[i], ids = Object.keys(restoreRemovals[kind]);
      for (var j = 0; j < ids.length; j++) {
        await attempt('Removed ' + ITEM_KINDS[kind].path + ids[j] + '.js', true, async function (kind, id) {
          await removeItemFile(kind, id, restoreRemovals[kind][id]);
          delete restoreRemovals[kind][id];
        }.bind(null, kind, ids[j]));
      }
    }
  }
  function restoreVersion(entry, snapshot, options) {
    options = options || {};
    if (!options.confirmed && anyDirty() && !window.confirm('Restoring #' + entry.record.seq + ' replaces your unsaved changes with that version, as unsaved drafts. Continue?')) return false;
    undoRestoreRemovals();
    var kept = [], removing = [];
    function apply(kind, values, idOf) {
      var k = ITEM_KINDS[kind], idsKey = k.ids, draftsKey = k.drafts, savedKey = k.saved;
      var inVersion = {};
      var savedOrderBefore = state[idsKey].filter(function (id) { return state[savedKey][id] != null; }).join('\n');
      values.forEach(function (value) {
        var id = idOf(value); inVersion[id] = true;
        if (state[idsKey].indexOf(id) < 0) { state[idsKey].push(id); state[savedKey][id] = null; }
        state[draftsKey][id] = value;
      });
      state[idsKey] = state[idsKey].filter(function (id) {
        if (inVersion[id]) return true;
        if (state[savedKey][id] === null) { delete state[draftsKey][id]; delete state[savedKey][id]; return false; } /* an unsaved new item the version never had */
        if (options.removeExtras) {
          restoreRemovals[kind][id] = state[savedKey][id];
          delete state[draftsKey][id]; delete state[savedKey][id];
          removing.push(k.path + id + '.js'); return false;
        }
        kept.push(id); return true;
      });
      /* The version's own order, exactly. An item the current site no longer has used to be
         appended at the END, so a restored list could differ from the version in order alone and
         the restore's content address never equalled the version's (regression:
         tests/browser/versions.mjs "Delete, then Restore"). Items the person chose to keep follow,
         in their current order. */
      state[idsKey] = values.map(idOf).concat(state[idsKey].filter(function (id) { return !inVersion[id]; }));
      var savedAfter = state[idsKey].filter(function (id) { return state[savedKey][id] != null; });
      var stillSaved = {}; savedAfter.forEach(function (id) { stillSaved[id] = true; });
      if (savedOrderBefore.split('\n').filter(function (id) { return stillSaved[id]; }).join('\n') !== savedAfter.join('\n')) restoreReorder[kind] = true;
    }
    var s = snapshot;
    apply('page', s.manifests || [], function (m) { return m.id; });
    apply('article', s.articles || [], function (a) { return a.slug; });
    apply('asset', s.assets || [], function (a) { return a.id; });
    apply('secret', s.secrets || [], function (x) { return x.id; });
    (s.secrets || []).forEach(function (x) { delete state.secretDecrypted[x.id]; });
    ArkAdminStore.drafts('single').forEach(function (d) { if (s[d.key]) singleDraftHandle(d.key).set(s[d.key]); });
    if (state.ids.indexOf(state.current) < 0) state.current = state.ids[0];
    if (state.slugs.indexOf(state.aCurrent) < 0) state.aCurrent = state.slugs[0] || null;
    if (state.assetIds.indexOf(state.assetCurrent) < 0) state.assetCurrent = state.assetIds[0] || null;
    if (state.secretIds.indexOf(state.secretCurrent) < 0) state.secretCurrent = state.secretIds[0] || null;
    pendingRestore = entry.hash;
    state.cmsSourceSite = siteFromState(); state.cmsRoutes = studioRoutes();
    renderList(); refreshPanels(); reloadPreview(); touch();
    var message = 'Loaded version #' + entry.record.seq + ' as unsaved drafts. Save to make it current: it is recorded as a new version, and every version stays in the history.';
    if (removing.length) message += ' Save also removes ' + removing.length + ' file' + (removing.length === 1 ? '' : 's') + ' #' + entry.record.seq + ' never had (the history keeps them): ' + removing.join(', ') + '.';
    if (kept.length) message += ' Kept, as you chose (not in #' + entry.record.seq + '): ' + kept.join(', ') + '.';
    status(message, 'warn');
    /* the whole sentence where it can be read: the status line cut it to "Loaded ..." (P1-15) */
    if (A.notice) A.notice({ tone: 'info', key: 'version-restored', title: 'Version #' + entry.record.seq + ' is back, as unsaved changes', body: message.replace(/^Loaded version #\d+ as unsaved drafts\. /, ''),
      actions: [{ label: 'Save now', run: function () { A.later('saveEverything')(); } }] });
    return true;
  }
  var versionsPanel = window.ArkVersionsPanel && $('versionsPanel') ? ArkVersionsPanel.create({
    h: h, root: $('versionsPanel'),
    dir: function () { return Promise.resolve(state.historyDir || null); },
    savedSnapshot: savedSnapshot, anyDirty: anyDirty, status: status, download: download, connect: connectProject,
    preview: previewVersion, exitPreview: exitVersionPreview, restore: restoreVersion, restorePlan: restorePlan,
    /* one close button, and Versions shares the docked slot with the sheet: opening one closes
       the other (js/admin/overlay.js, level 'sheet'; docs/ux-audit/cms.md P1-12) */
    closeButton: A.overlay.closeButton, devDetails: A.devDetails, disclosure: A.arkDisclosure,
    itemName: function (draft, id) {
      if (draft === 'manifests') return state.drafts[id] && state.drafts[id].title ? state.drafts[id].title : '';
      if (draft === 'articles') return state.aDrafts[id] && state.aDrafts[id].title ? state.aDrafts[id].title : '';
      return '';
    },
    onToggle: function (open) {
      $('versionsNav').setAttribute('aria-expanded', String(open));
      if (open) A.overlay.open($('versionsPanel'), { anchor: $('versionsNav'), level: 'sheet', onClose: function () { if (versionsPanel && !$('versionsPanel').hidden) versionsPanel.close(); } });
      else A.overlay.forget($('versionsPanel'));
    }
  }) : null;
  if (versionsPanel) $('versionsNav').addEventListener('click', versionsPanel.toggle);
  A.provide({ ensureVersionBaseline: ensureVersionBaseline, recordVersion: recordVersion,
      removeRestoredExtras: removeRestoredExtras, restoreRemovalsPending: restoreRemovalsPending,
      restoreReorderPending: restoreReorderPending, versionsPanel: versionsPanel,
      writeRestoredOrder: writeRestoredOrder, writeSearchFiles: writeSearchFiles });
})();
