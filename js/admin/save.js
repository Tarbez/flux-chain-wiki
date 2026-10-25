/* =====================================================================
   ADMIN EDITOR · SAVE AND DELETE (js/admin/save.js)
   ---------------------------------------------------------------------
   Owns: the one save model -- saveEverything() (every dirty draft, each attempted and
   reported on its own), singleDraftHandle() (how the editor reaches each single-object
   draft ArkAdminStore.drafts() lists), siteFromState() (the whole site as Save and
   Publish see it), and the one removal path: ITEM_KINDS, removeItemFile, forgetDeleted,
   afterDelete, deleteCurrent (pages; it dispatches to the article/image/encrypted ones).
   Must not: keep its own list of drafts (js/admin/store.js decides which exist), or
   save anything through a second path -- the header's Save, Ctrl/Cmd+S and the
   canvas's forwarded Ctrl/Cmd+S all call saveEverything().
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, layoutDirty = A.layoutDirty, download = A.download,
      componentsDirty = A.componentsDirty, statesDirty = A.statesDirty,
      canvasTransitionsDirty = A.canvasTransitionsDirty, elementMotionDirty = A.elementMotionDirty, worldDirty = A.worldDirty, skinPolicyDirty = A.skinPolicyDirty,
      dirty = A.dirty, clone = A.clone, dirtyA = A.dirtyA, dirtyI = A.dirtyI, dirtyS = A.dirtyS,
      status = A.status, toast = A.toast, notice = A.notice, anyDirty = A.anyDirty;
  /* defined by files loaded after this one: resolved when called */
  var reliefDirty = A.later('reliefDirty'), saveMeshDraft = A.later('saveMeshDraft'),
      themeDirty = A.later('themeDirty'), saveThemeDraft = A.later('saveThemeDraft'),
      settingsDefaultsDirty = A.later('settingsDefaultsDirty'),
      saveSettingsDefaultsDraft = A.later('saveSettingsDefaultsDraft'), seoDirty = A.later('seoDirty'),
      saveSeoDraft = A.later('saveSeoDraft'), removeRestoredExtras = A.later('removeRestoredExtras'),
      articleList = A.later('articleList'), articleCopy = A.later('articleCopy'),
      writeRestoredOrder = A.later('writeRestoredOrder'), writeSearchFiles = A.later('writeSearchFiles'),
      renderList = A.later('renderList'), touch = A.later('touch'),
      reloadPreview = A.later('reloadPreview'), studioRoutes = A.later('studioRoutes'),
      schedule = A.later('schedule'), recordVersion = A.later('recordVersion'),
      deleteItem = A.later('deleteItem'), connectProject = A.later('connectProject'),
      restoreRemovalsPending = A.later('restoreRemovalsPending');

  /* Step 5 (flickering-juggling-donut.md), the "one save model": saveEverything() replaces
     BOTH the old saveCurrent() (a per-state.kind dispatcher that only ever saved whichever
     ONE draft happened to be on screen -- and had no branch at all for Studio's drafts, so
     Ctrl+S while editing the canvas fell through to this function's generic page-save path
     using a stale state.current id, silently doing the wrong thing) AND the old
     saveStudioChanges() (which already covered pages/articles/seo/layout/components/states/
     canvas-transitions/element-motion in one pass, but wrapped the whole batch in a SINGLE
     try/catch -- one draft's validation error aborted every draft after it in the list,
     unsaved and unreported, collapsed into one generic error message).
     Every one of the 13 real drafts (manifests, articles, assets, secrets, mesh/shape
     settings, theme, site-wide settings-defaults, SEO, layout, components, states,
     canvas-transitions, element-motion) is checked and saved independently here: a thrown
     error for one draft is caught right where it happens, recorded against that draft by
     name, and never stops any of the others from being attempted and reported on their own
     merits. This is the ONE function every save calls -- the header's one Save button
     (#save, refreshSaveButton(); the per-section Save buttons and Studio's own second Save
     were folded into it), Ctrl/Cmd+S here, and Ctrl/Cmd+S forwarded from the canvas -- so
     no entry point can under-save relative to another, and Ctrl+S always does the right
     thing regardless of which mode/kind is active. */

  /* THE SINGLE-OBJECT DRAFTS, as this editor holds them. Which drafts exist is decided by ONE
     list, ArkAdminStore.drafts() in js/admin/store.js; this only says how the editor reaches
     each one: draft() the live draft, set(v) replaces it (a version restore), saved() its saved
     JSON text, dirty(), save(). saveEverything(), anyDirty() and siteFromState() (what Publish
     sends) iterate that list and come here, so Save and Publish cannot disagree again -- they
     once did: Save wrote 13 drafts and the published archive carried 8. A draft listed in
     store.js with no handles here throws, naming it, instead of being silently dropped. */
  function singleDraftHandle(key) {
    var handles = {
      meshSettings: { draft: function () { return state.meshDraft; }, set: function (v) { state.meshDraft = v; }, saved: function () { return state.meshSaved; }, dirty: reliefDirty, save: function () { return saveMeshDraft(null); } },
      theme: { draft: function () { return state.themeDraft; }, set: function (v) { state.themeDraft = v; }, saved: function () { return state.themeSaved; }, dirty: themeDirty, save: function () { return saveThemeDraft(null); } },
      settingsDefaults: { draft: function () { return state.settingsDefaultsDraft; }, set: function (v) { state.settingsDefaultsDraft = v; }, saved: function () { return state.settingsDefaultsSaved; }, dirty: settingsDefaultsDirty, save: function () { return saveSettingsDefaultsDraft(null); } },
      seo: { draft: function () { return state.seoDraft; }, set: function (v) { state.seoDraft = v; }, saved: function () { return state.seoSaved; }, dirty: seoDirty, save: function () { return saveSeoDraft(null); } },
      layout: { draft: function () { return state.layoutDraft; }, set: function (v) { state.layoutDraft = v; }, saved: function () { return state.layoutSaved; }, dirty: layoutDirty, save: async function () {
        if (state.cdirs) await ArkAdminStore.saveLayout(state.cdirs.content, state.layoutDraft);
        else download('layout-data.js', ArkLayout.serialize(state.layoutDraft));
        state.layoutDraft = ArkLayout.sanitize(state.layoutDraft); state.layoutSaved = JSON.stringify(state.layoutDraft); ArkLayout.define(state.layoutDraft);
      } },
      components: { draft: function () { return state.componentsDraft; }, set: function (v) { state.componentsDraft = v; }, saved: function () { return state.componentsSaved; }, dirty: componentsDirty, save: async function () {
        /* every Ark block, as saved and as each instance shows it, passes the SDK's strict
           validateCmsArkBlock first -- refused, nothing is written, and each refusal says which
           component, which field, what it needs (js/content/components.js problems()) */
        /* a site block's slot (the Card slot) is read by the card's own decoder: load it first when the draft holds one */
        var siteBlocks = ArkComponents.blocks().filter(function (b) { return b.site; }).map(function (b) { return b.resolver; });
        if (A.loadCardKit && Object.keys(state.componentsDraft.masters || {}).some(function (id) { return siteBlocks.indexOf(state.componentsDraft.masters[id].resolver) >= 0; })) {
          try { await A.loadCardKit(); } catch (e) { /* problems() below refuses a slot it cannot check, and says what is needed */ }
        }
        var refused = ArkComponents.problems(state.componentsDraft);
        if (refused.length) throw new Error('Not saved: ' + refused.length + ' thing' + (refused.length > 1 ? 's' : '') + ' to fix in your components (Library, or the toolbar\'s Component instance). ' + refused.map(function (p) { return p.sentence; }).join(' '));
        if (state.cdirs) await ArkAdminStore.saveComponents(state.cdirs.content, state.componentsDraft);
        else download('components-data.js', ArkComponents.serialize(state.componentsDraft));
        state.componentsDraft = ArkComponents.sanitize(state.componentsDraft); state.componentsSaved = JSON.stringify(state.componentsDraft); ArkComponents.define(state.componentsDraft);
      } },
      states: { draft: function () { return state.statesDraft; }, set: function (v) { state.statesDraft = v; }, saved: function () { return state.statesSaved; }, dirty: statesDirty, save: async function () {
        if (state.cdirs) await ArkAdminStore.saveStates(state.cdirs.content, state.statesDraft);
        else download('states-data.js', ArkStates.serialize(state.statesDraft));
        state.statesDraft = ArkStates.sanitize(state.statesDraft); state.statesSaved = JSON.stringify(state.statesDraft); ArkStates.define(state.statesDraft);
      } },
      canvasTransitions: { draft: function () { return state.canvasTransitionsDraft; }, set: function (v) { state.canvasTransitionsDraft = v; }, saved: function () { return state.canvasTransitionsSaved; }, dirty: canvasTransitionsDirty, save: async function () {
        if (state.cdirs) await ArkAdminStore.saveCanvasTransitions(state.cdirs.content, state.canvasTransitionsDraft);
        else download('canvas-transitions-data.js', ArkCanvasTransitions.serialize(state.canvasTransitionsDraft));
        state.canvasTransitionsDraft = ArkCanvasTransitions.sanitize(state.canvasTransitionsDraft); state.canvasTransitionsSaved = JSON.stringify(state.canvasTransitionsDraft); ArkCanvasTransitions.define(state.canvasTransitionsDraft);
      } },
      elementMotion: { draft: function () { return state.elementMotionDraft; }, set: function (v) { state.elementMotionDraft = v; }, saved: function () { return state.elementMotionSaved; }, dirty: elementMotionDirty, save: async function () {
        if (state.cdirs) await ArkAdminStore.saveElementMotion(state.cdirs.content, state.elementMotionDraft);
        else download('element-motion-data.js', ArkElementMotion.serialize(state.elementMotionDraft));
        state.elementMotionDraft = ArkElementMotion.sanitize(state.elementMotionDraft); state.elementMotionSaved = JSON.stringify(state.elementMotionDraft); ArkElementMotion.define(state.elementMotionDraft);
      } },
      /* the 3D world: FLX records, never JSON (ArkWorld.serialize). define() last, like the others,
         so the editor's own module holds what is saved. */
      world: { draft: function () { return state.worldDraft; }, set: function (v) { state.worldDraft = v; }, saved: function () { return state.worldSaved; }, dirty: worldDirty, save: async function () {
        if (state.cdirs) await ArkAdminStore.saveWorld(state.cdirs.content, state.worldDraft);
        else download('world-data.js', ArkWorld.serialize(state.worldDraft));
        state.worldDraft = ArkWorld.sanitize(state.worldDraft); state.worldSaved = JSON.stringify(state.worldDraft); ArkWorld.define(state.worldDraft);
      } },
      /* the skin policy (Skin lab): FLX records too (ArkSkinPolicy.serialize) */
      skinPolicy: { draft: function () { return state.skinPolicyDraft; }, set: function (v) { state.skinPolicyDraft = v; }, saved: function () { return state.skinPolicySaved; }, dirty: skinPolicyDirty, save: async function () {
        if (state.cdirs) await ArkAdminStore.saveSkinPolicy(state.cdirs.content, state.skinPolicyDraft);
        else download('skin-policy-data.js', ArkSkinPolicy.serialize(state.skinPolicyDraft));
        state.skinPolicyDraft = ArkSkinPolicy.sanitize(state.skinPolicyDraft); state.skinPolicySaved = JSON.stringify(state.skinPolicyDraft); ArkSkinPolicy.define(state.skinPolicyDraft);
      } }
    };
    if (!Object.prototype.hasOwnProperty.call(handles, key)) throw new Error('js/admin/store.js lists the "' + key + '" draft, but js/admin/save.js has no editor handles for it (singleDraftHandle), so it could not be saved, published or versioned. Add its handles there.');
    return handles[key];
  }

  async function saveEverything() {
    /* No project folder: nothing is written, and the person is told so, with the button that
       fixes it. Save used to download every changed draft as a .js file and report "Saved 1 item
       (downloaded)" -- a non-technical owner believed the site had changed; it had not
       (docs/ux-audit/cms.md P0-3). Downloading is still there, as an explicit second choice
       (downloadChanges below). Regression: tests/cms-save-unconnected.cjs. */
    if (!projectConnected() && !downloading && (anyDirty() || restoreRemovalsPending())) {
      var canConnect = typeof window.showDirectoryPicker === 'function';
      var why = 'Not saved to your site: no project folder is connected, so Save has nowhere to write. Your edits are kept in this tab.';
      var offerDownload = { label: 'Download changed files instead', run: function () { downloadChanges(); } };
      status('Not saved: connect your project folder.', 'warn');
      /* the same banner as "connect your project folder" (one condition, one banner), now saying
         what just did not happen; it stays until a folder is connected */
      notice({ tone: 'warning', persist: true, key: 'project-folder',
        title: canConnect ? 'Not saved to your site — connect your project folder' : 'Not saved to your site — this browser cannot write into a folder',
        body: 'No project folder is connected, so Save has nowhere to write; your edits are kept in this tab.' + (canConnect ? ' Connect the folder that holds the site (index.html and js/content/), then Save again. Or download the changed files and copy them into js/content/ yourself.'
          : ' Open this editor in Chrome or Edge to save in place, or download the changed files and copy them into js/content/ yourself.'),
        actions: canConnect ? [{ label: 'Connect project folder', run: async function (n) { if (await connectProject()) { n.close(); saveEverything(); } } }, offerDownload] : [offerDownload] });
      return { succeeded: [], failed: [], refused: why };
    }
    var results = [];
    function record(label, ok, message) { results.push({ label: label, ok: ok, message: message }); }
    async function attempt(label, dirtyNow, run) {
      if (!dirtyNow) return;
      try { await run(); record(label, true); }
      catch (error) { record(label, false, error && error.message ? error.message : String(error)); }
    }

    // items a confirmed Restore said to remove (Versions panel) -- through removeItemFile(), the
    // same removal path Delete uses. FIRST, so the registries no longer hold them when the drafts
    // below are sanitized and written (SEO keeps one entry per page in ArkManifest, for one).
    await removeRestoredExtras(attempt);

    /* what the Save summary calls an item: its name, as every list shows it ("About"), never its id
       ("about") -- the id is the file's name, which the summary does not need (docs/ux-audit/cms.md P1-2) */
    function itemName(item, id) { return (item && (item.title || item.label)) || id; }

    // pages (manifests) -- js/content/manifests/*.js
    var changedPages = state.ids.filter(dirty);
    for (var i = 0; i < changedPages.length; i++) {
      var pid = changedPages[i];
      await attempt('Page "' + itemName(state.drafts[pid], pid) + '"', true, async function (id) {
        var manifest = state.drafts[id], problems = ArkManifest.problems(manifest);
        if (problems.length) throw new Error(problems.join('; '));
        var isNew = state.saved[id] === null;
        if (state.dir) await ArkAdminStore.save(state.dir, manifest, state.ids);
        else { download(id + '.js', ArkManifest.serialize(manifest)); if (isNew) download('index.js', ArkAdminStore.indexText(state.ids)); }
        state.saved[id] = JSON.stringify(manifest); ArkManifest.define(clone(manifest));
      }.bind(null, pid));
    }

    // articles -- js/content/articles/*.js
    var changedArticles = state.slugs.filter(dirtyA);
    for (var j = 0; j < changedArticles.length; j++) {
      var aslug = changedArticles[j];
      await attempt('Article "' + itemName(state.aDrafts[aslug], aslug) + '"', true, async function (slug) {
        var article = state.aDrafts[slug], problems = LearningContent.problems(article);
        if (problems.length) throw new Error(problems.join('; '));
        var list = articleList(article);
        if (state.cdirs) await ArkAdminStore.saveArticle(state.cdirs, article, list);
        else { download(slug + '.js', LearningContent.serializeBody(article)); download('article-index.js', LearningContent.serializeIndex(list)); }
        state.aSaved[slug] = JSON.stringify(articleCopy(article)); LearningContent.put(clone(article));
      }.bind(null, aslug));
    }

    // images -- js/content/assets/*.js
    var changedAssets = state.assetIds.filter(dirtyI);
    for (var k = 0; k < changedAssets.length; k++) {
      var assetId = changedAssets[k];
      await attempt('Image "' + itemName(state.assetDrafts[assetId], assetId) + '"', true, async function (id) {
        var asset = state.assetDrafts[id], problems = ArkAsset.problems(asset);
        if (problems.length) throw new Error(problems.join('; '));
        var isNew = state.assetSaved[id] === null;
        if (state.assetDir) await ArkAdminStore.saveAsset(state.assetDir, asset, state.assetIds);
        else { download(id + '.js', ArkAsset.serialize(asset)); if (isNew) download('index.js', ArkAdminStore.indexTextAssets(state.assetIds)); }
        state.assetSaved[id] = JSON.stringify(asset); ArkAsset.define(clone(asset));
      }.bind(null, assetId));
    }

    // encrypted items -- js/content/secrets/*.js
    var changedSecrets = state.secretIds.filter(dirtyS);
    for (var m = 0; m < changedSecrets.length; m++) {
      var secretId = changedSecrets[m];
      await attempt('Private item "' + itemName(state.secretDrafts[secretId], secretId) + '"', true, async function (id) {
        var secret = state.secretDrafts[id], problems = ArkSecret.problems(secret);
        if (problems.length) throw new Error('encrypt the content first (' + problems.join('; ') + ')');
        var isNew = state.secretSaved[id] === null;
        if (state.secretDir) await ArkAdminStore.saveSecret(state.secretDir, secret, state.secretIds);
        else { download(id + '.js', ArkSecret.serialize(secret)); if (isNew) download('index.js', ArkAdminStore.indexTextSecrets(state.secretIds)); }
        state.secretSaved[id] = JSON.stringify(secret); ArkSecret.define(clone(secret));
      }.bind(null, secretId));
    }

    // a Restore that changed a list's order and nothing else in it: that list's index alone
    await writeRestoredOrder(attempt);
    // before the single drafts: SEO keys its per-page/per-article entries by these registries
    syncRegistryOrder();

    // every single-object draft -- js/content/<file>-data.js -- in the order js/admin/store.js
    // lists them, each through its own attempt(): mesh settings, theme, site-wide defaults, SEO,
    // layout, components, states, canvas transitions, element animation, world (singleDraftHandle()).
    var singles = ArkAdminStore.drafts('single');
    for (var n = 0; n < singles.length; n++) {
      var single = singles[n], handle;
      try { handle = singleDraftHandle(single.key); }
      catch (error) { record(single.label, false, error.message); continue; }
      await attempt(single.label, handle.dirty(), handle.save);
    }

    // sitemap.xml / robots.txt / llms.txt: derived from what is now saved (writeSearchFiles), and
    // named in the message only when one of them actually changed.
    try { var searchWritten = await writeSearchFiles(); if (searchWritten.length) record(searchWritten.join(', '), true); }
    catch (error) { record('sitemap.xml / robots.txt / llms.txt', false, error && error.message ? error.message : String(error)); }

    renderList(); touch(); reloadPreview();
    /* Keep Studio's own derived state (cmsSourceSite/cmsRoutes) and its own repaint in sync
       after ANY save, whichever mode it was pressed in -- siteFromState() folds in
       every draft this function just wrote, so Studio's canvas never shows stale content if
       the owner switches to it after saving from the Content side, or vice versa. */
    state.cmsSourceSite = siteFromState(); state.cmsRoutes = studioRoutes(); schedule();

    var succeeded = results.filter(function (r) { return r.ok; });
    var failed = results.filter(function (r) { return !r.ok; });
    var destination = projectConnected() ? 'to the connected project' : '(downloaded)';
    var message;
    if (!results.length) message = 'Nothing to save: every draft already matches its saved copy.';
    else if (!failed.length) message = 'Saved ' + succeeded.length + ' item' + (succeeded.length === 1 ? '' : 's') + ' ' + destination + ': ' + succeeded.map(function (r) { return r.label; }).join(', ') + '.';
    else message = (succeeded.length ? 'Saved ' + succeeded.length + ' item' + (succeeded.length === 1 ? '' : 's') + ' ' + destination + ' (' + succeeded.map(function (r) { return r.label; }).join(', ') + '). ' : '') +
      failed.length + ' failed: ' + failed.map(function (r) { return r.label + ' (' + r.message + ')'; }).join('; ');
    /* Version history: what is now on disk becomes a version (js/admin/versions.js). */
    message += await recordVersion(succeeded.length);
    status(message, failed.length ? 'error' : (results.length ? 'ok' : ''));
    if (!projectConnected() && succeeded.length) notice({ tone: 'warning', key: 'downloaded', title: 'Downloaded ' + succeeded.length + ' changed item' + (succeeded.length === 1 ? '' : 's') + ' — your site folder did not change',
      body: 'Copy the downloaded files into js/content/ of the site (each one is named for the file it replaces)' + (typeof window.showDirectoryPicker === 'function' ? ', or connect the project folder so Save writes them in place.' : '.'),
      actions: typeof window.showDirectoryPicker === 'function' ? [{ label: 'Connect project folder', run: connectProject }] : [] });
    else toast(message);
    return { succeeded: succeeded, failed: failed };
  }
  /* Whether Save writes into the site: a project folder is connected (js/admin/project.js). */
  function projectConnected() { return !!(state.dir || state.cdirs || state.assetDir || state.secretDir); }
  /* The explicit second choice when no folder is connected: every changed draft downloaded as the
     file it would replace. Only ever from a button that says so (Save's refusal). */
  var downloading = false;
  async function downloadChanges() {
    downloading = true;
    try { return await saveEverything(); } finally { downloading = false; }
  }

  /* ONE removal path for a page / article / image / encrypted item. Delete (below) and a
     confirmed version Restore (removeRestoredExtras, in the version-history block) both remove
     through here, so the file, its index, the draft lists and the in-memory registry always
     leave together. `savedText` is the item's saved JSON when the caller has already taken it
     out of the lists (a restore's pending removal); otherwise the lists say whether a file exists.
     Each index is rewritten from the items that are SAVED, so it never names a file that is not
     there (an unsaved new item joins its index when it is saved). */
  var ITEM_KINDS = {
    page: { ids: 'ids', drafts: 'drafts', saved: 'saved', noun: 'Page', path: 'js/content/manifests/', dir: function () { return state.dir; },
            remove: function (id, rest) { return ArkAdminStore.remove(state.dir, id, rest); }, forget: function (id) { ArkManifest.remove(id); },
            /* rewrite only the index, in this order of saved ids (a restore that changed the order alone) */
            index: { file: 'js/content/manifests/index.js', write: function (ids) { return ArkAdminStore.writeIndex(state.dir, 'index.js', ArkAdminStore.indexText(ids)); } } },
    article: { ids: 'slugs', drafts: 'aDrafts', saved: 'aSaved', noun: 'Article', path: 'js/content/articles/', dir: function () { return state.cdirs; },
            remove: function (id, rest) { return ArkAdminStore.removeArticle(state.cdirs, id, rest.map(function (s) { return JSON.parse(state.aSaved[s]); })); }, forget: function (id) { LearningContent.remove(id); },
            index: { file: 'js/content/article-index.js', write: function (ids) { return ArkAdminStore.writeIndex(state.cdirs.content, 'article-index.js', LearningContent.serializeIndex(ids.map(function (s) { return JSON.parse(state.aSaved[s]); }))); } } },
    asset: { ids: 'assetIds', drafts: 'assetDrafts', saved: 'assetSaved', noun: 'Image', path: 'js/content/assets/', dir: function () { return state.assetDir; },
            remove: function (id, rest) { return ArkAdminStore.removeAsset(state.assetDir, id, rest); }, forget: function (id) { ArkAsset.remove(id); },
            index: { file: 'js/content/assets/index.js', write: function (ids) { return ArkAdminStore.writeIndex(state.assetDir, 'index.js', ArkAdminStore.indexTextAssets(ids)); } } },
    secret: { ids: 'secretIds', drafts: 'secretDrafts', saved: 'secretSaved', noun: 'Encrypted item', path: 'js/content/secrets/', dir: function () { return state.secretDir; },
            remove: function (id, rest) { return ArkAdminStore.removeSecret(state.secretDir, id, rest); },
            index: { file: 'js/content/secrets/index.js', write: function (ids) { return ArkAdminStore.writeIndex(state.secretDir, 'index.js', ArkAdminStore.indexTextSecrets(ids)); } },
            forget: function (id) { delete state.secretPlaintext[id]; delete state.secretRecipientsText[id]; delete state.secretDecrypted[id]; ArkSecret.remove(id); } }
  };
  async function removeItemFile(kind, id, savedText) {
    var k = ITEM_KINDS[kind];
    if (savedText != null || state[k.saved][id] != null) {
      if (!k.dir()) throw new Error(k.path + id + '.js was not removed. Missing: the connected project folder. To fix: connect it (Connect project folder) and Save again.');
      await k.remove(id, state[k.ids].filter(function (other) { return other !== id && state[k.saved][other] != null; }));
    }
    state[k.ids] = state[k.ids].filter(function (other) { return other !== id; });
    delete state[k.drafts][id]; delete state[k.saved][id]; k.forget(id);
  }
  /* The page and article registries (ArkManifest, LearningContent) in the editor's list order --
     the order the index files on disk have. A saved item joins its registry at the END
     (define()/put() append), so a page a Restore put back mid-list sat last in the registry, and
     everything keyed off the registry followed it: SEO's per-page map (ArkSEO.sanitize keys it by
     the registry) came out in a different key order, so the saved seo-data.js -- and the version's
     content address -- differed from the version being restored though no value did
     (regression: tests/browser/versions.mjs "Restore #8, Save"). */
  function syncRegistryOrder() {
    function rank(list) { var at = {}; list.forEach(function (id, i) { at[id] = i; }); return function (id) { return id in at ? at[id] : list.length; }; }
    var pageRank = rank(state.ids), pages = ArkManifest.all();
    var sorted = pages.slice().sort(function (a, b) { return pageRank(a.id) - pageRank(b.id); });
    if (sorted.some(function (p, i) { return p !== pages[i]; })) {
      pages.forEach(function (p) { ArkManifest.remove(p.id); });
      sorted.forEach(function (p) { ArkManifest.define(p); });
    }
    var articleRank = rank(state.slugs);
    if (window.LearningContent && Array.isArray(LearningContent.articles)) LearningContent.articles.sort(function (a, b) { return articleRank(a.slug) - articleRank(b.slug); });
  }
  /* What every Delete does once removeItemFile() has taken the file out: the derived root files
     follow at once (a deleted page leaves sitemap.xml/llms.txt now, not at the next Save), and the
     removal is recorded as its own version immediately, with the summary versions.js derives from
     the two snapshots ("manifests: -<id>"). Before 2026-10-18 nothing was recorded until the next
     Save, whose record then showed the removal mixed into unrelated edits, and a Delete followed
     by closing the tab left no version saying the file had gone. A pending Restore keeps its own
     claim (restoredFrom stays for the Save that writes it). -> a sentence for the status line. */
  async function afterDelete() {
    var note = '';
    try { var written = await writeSearchFiles(); if (written.length) note += ' Updated ' + written.join(', ') + '.'; }
    catch (error) { note += ' sitemap.xml/robots.txt/llms.txt were not updated (' + error.message + '); the next Save writes them.'; }
    return note + await recordVersion(1, { restoredFrom: '' });
  }
  /* A deleted page or article takes its entries in every other draft with it, in the same
     Delete: its SEO override (keyed by id) and whatever layout, states, components or element
     animation keyed by the route that went with it. Before this, the SEO draft still held the
     deleted page's entry, showed unsaved until the next Save, and the saved seo-data.js kept an
     orphan (regression: tests/delete-prunes-drafts.cjs). Which drafts key by page or route is
     ArkAdminStore.drafts()' byItem/byRoute, not a list here. The draft loses the entries; the
     SAVED copy is written without them only where it had them -- through the draft's own
     save(), with the draft swapped for the pruned saved value for that one write, so an
     unrelated unsaved edit in the same draft stays unsaved instead of being saved by a Delete.
     `routesBefore` is every route before the removal: a route is gone only when the site no
     longer has it. -> a sentence for the status line. */
  async function forgetDeleted(itemsKey, id, routesBefore) {
    var routesNow = studioRoutes().map(function (r) { return r.path; });
    var gone = { key: itemsKey, id: id, routes: routesBefore.filter(function (path) { return routesNow.indexOf(path) < 0; }) };
    var cleaned = [], failed = [];
    var singles = ArkAdminStore.drafts('single').filter(function (d) { return d.byItem || d.byRoute; });
    for (var i = 0; i < singles.length; i++) {
      var d = singles[i], handle = singleDraftHandle(d.key);
      if (!window[d.global]) continue;
      var draft = ArkAdminStore.forgetItem(d, handle.draft(), gone).value;
      var savedText = handle.saved(), saved = savedText ? ArkAdminStore.forgetItem(d, JSON.parse(savedText), gone) : { changed: false };
      if (saved.changed) {
        handle.set(saved.value);
        try { await handle.save(); cleaned.push(d.file + '-data.js'); }
        catch (error) { failed.push(d.file + '-data.js (' + (error && error.message ? error.message : error) + ')'); }
      }
      handle.set(draft);
    }
    return (cleaned.length ? ' Removed its entries from ' + cleaned.join(', ') + '.' : '') +
      (failed.length ? ' Its entries are still in ' + failed.join(', ') + '; the next Save removes them.' : '');
  }

  /* Delete whatever item state.kind names (the form last opened) -- one removal path for every
     kind: deleteItem() (js/admin/editor.js), which the content forms' Delete buttons call with
     their own kind and id. */
  async function deleteCurrent() {
    var kind = state.kind === 'article' || state.kind === 'asset' || state.kind === 'secret' ? state.kind : 'page';
    await deleteItem(kind, { article: state.aCurrent, asset: state.assetCurrent, secret: state.secretCurrent, page: state.current }[kind]);
  }
  /* The whole site as Publish sends it (and as Studio's preview reads it): every draft
     ArkAdminStore.drafts() lists, in its order -- the same list saveEverything() saves, so the
     published archive (scripts/lib/site-bundle.mjs encodeSite) carries every draft a Save
     writes. It once carried 8 of 13: settings defaults, components, states, canvas transitions
     and element motion worked in the editor and on Save, and never reached the mesh. A single
     draft whose module is not loaded on this page is null ("use that module's defaults"). */
  function siteFromState() {
    var site = {};
    ArkAdminStore.drafts().forEach(function (d) {
      if (d.key === 'manifests') site.manifests = state.ids.map(function (id) { return clone(state.drafts[id]); });
      else if (d.key === 'articles') site.articles = state.slugs.map(function (slug) { return articleCopy(state.aDrafts[slug]); });
      else if (d.key === 'assets') site.assets = state.assetIds.map(function (id) { return clone(state.assetDrafts[id]); });
      else if (d.key === 'secrets') site.secrets = state.secretIds.map(function (id) { return clone(state.secretDrafts[id]); });
      else if (d.kind === 'single') site[d.key] = window[d.global] ? clone(singleDraftHandle(d.key).draft()) : null;
      else throw new Error('js/admin/store.js lists the per-id draft "' + d.key + '", which siteFromState() does not know how to publish. Add it here and in scripts/lib/site-bundle.mjs.');
    });
    return site;
  }
  A.provide({ ITEM_KINDS: ITEM_KINDS, afterDelete: afterDelete, deleteCurrent: deleteCurrent,
      downloadChanges: downloadChanges, forgetDeleted: forgetDeleted, projectConnected: projectConnected,
      removeItemFile: removeItemFile, saveEverything: saveEverything,
      singleDraftHandle: singleDraftHandle, siteFromState: siteFromState });
})();
