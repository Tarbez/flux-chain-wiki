/* =====================================================================
   ADMIN EDITOR · MESH AND PUBLISH (js/admin/mesh.js)
   ---------------------------------------------------------------------
   Owns: the Mesh view (what is published, compared with this site; drawn into the sheet the
   header's Mesh button opens) and Publish -- the
   scoped authorization dialog, signing through ArkPublish, and the miner status line.
   Must not: publish unsaved drafts (Save first), or hold the signing key: the locked
   page's identity (ArkGate) signs.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, h = A.h, $ = A.$, dirty = A.dirty, dirtyA = A.dirtyA, dirtyI = A.dirtyI,
      reliefDirty = A.reliefDirty, gate = A.gate, refuse = A.refuse, status = A.status, notice = A.notice,
      anyDirty = A.anyDirty, siteFromState = A.siteFromState, selectMesh = A.selectMesh,
      saveEverything = A.saveEverything;
  /* defined by files loaded after this one: resolved when called */
  var recordVersion = A.later('recordVersion'), openMeshSheet = A.later('openMeshSheet');

  /* ---- mesh deployment view ------------------------------------------
     A dedicated place to see the mesh the way it actually works: what is
     published right now, how that differs from what is saved here, and --
     the thing people otherwise assume wrong -- that none of it is
     encrypted. Read-only: writing the published copy onto disk stays
     scripts/pull-site.mjs's job, which already does that correctly with
     real file semantics (added/changed/removed per file); reimplementing
     a write path here would be a second place for the two to drift. */
  function meshRow(label, value) {
    return h('div', { class: 'mesh-row' }, h('span', { class: 'mesh-row-key', text: label }), h('span', { class: 'mesh-row-val mono', text: value || '—' }));
  }
  /* the essay on what publishing protects: there for whoever asks, folded so it no longer stands
     between the person and the reason they cannot publish (docs/ux-audit/cms.md P0-4) */
  function buildMeshSecurityNote() {
    var box = h('details', { class: 'mesh-security' }, h('summary', { text: 'How publishing keeps things private (and what it does not)' }));
    box.appendChild(h('p', {}, h('strong', { text: 'Public: ' }),
      document.createTextNode('every page, article and image published here is one content-addressed archive on the mesh, unencrypted. Anyone who has the address (or finds the name record) can fetch and read all of it, the same as a public IPFS file. Publishing is distribution, not privacy.')));
    box.appendChild(h('p', {}, h('strong', { text: 'Encrypted content: ' }),
      document.createTextNode('an item under Encrypted is published the same way — content-addressed, fetchable by anyone — but its body is AES-GCM ciphertext and the file key is only wrapped for the recipients you chose. Only someone holding a matching secret key can read it; everyone else fetches opaque bytes.')));
    box.appendChild(h('p', {}, h('strong', { text: 'Signed, not secret: ' }),
      document.createTextNode('the record pointing flux-chain.ark at that address is signed by your identity so no one else can repoint the name — but the signature and the record are public too.')));
    box.appendChild(h('p', {}, h('strong', { text: 'Actually private: ' }),
      document.createTextNode('only your signing key, and only in this browser tab’s memory (js/admin/auth.js). It is never sent to the publish host, the miner, or the mesh, and is dropped on reload or sign-out. The sign-in gate protects who can edit and publish — it does not make the content itself confidential.')));
    box.appendChild(h('p', { class: 'hint' }, document.createTextNode('Rule of thumb: never put anything in a page, article or image you would not want permanently public. Once a version is pinned, other peers may already have copied it — publishing a newer version does not erase the old one from the mesh.')));
    return box;
  }
  /* Drawn into the container the shell hands it: the Publishing status sheet, opened on demand
     from the header's More menu (openMeshSheet, js/admin/panels.js). One word for the dependency:
     "publishing" (docs/ux-audit/cms.md P1-2: Mesh, miner and publish host named one thing). */
  function renderMeshEditor(root) {
    if (!root) return;
    root.textContent = '';
    var routeLabel = h('div', { class: 'route', text: 'Can the site be published, and what is live' });
    root.appendChild(h('div', { class: 'cms-form-head' },
      h('div', {}, routeLabel),
      h('div', { class: 'editor-actions' }, h('button', { type: 'button', class: 'btn', id: 'meshViewRefresh', text: 'Check again', onclick: function () { load(); refreshMesh(); } }))));
    /* Can this site be published right now, and if not, what fixes it -- first, in words and with
       its button, not in a tooltip on a greyed-out Publish (docs/ux-audit/cms.md P0-4). */
    var readiness = h('div', { class: 'mesh-readiness', id: 'meshReadiness' });
    root.appendChild(readiness);

    var statusRows = h('div', { class: 'mesh-rows' });
    var diffText = h('p', { class: 'hint' });
    var liveSummary = h('p', { class: 'hint' });
    var liveList = h('ul', { class: 'mesh-list' });
    /* plain words (docs/ux-audit/cms.md P1-2): the technical names -- the address (CID) and the
       owner key -- are Developer details under the status rows, where this editor keeps every
       name the code uses */
    var devHolder = h('div', { class: 'mesh-dev' });
    root.appendChild(h('fieldset', {}, h('legend', { text: 'Publishing status' }), statusRows, devHolder));
    root.appendChild(h('fieldset', {}, h('legend', { text: 'This copy vs. the live site' }), diffText));
    root.appendChild(h('fieldset', {}, h('legend', { text: 'What is live right now' }), liveSummary, liveList));
    root.appendChild(buildMeshSecurityNote());

    function fill(rows, devRows) {
      statusRows.textContent = ''; rows.forEach(function (r) { statusRows.appendChild(meshRow(r[0], r[1])); });
      devHolder.textContent = ''; if (devRows && devRows.length) devHolder.appendChild(A.devDetails(devRows));
    }

    function ready(info, error) {
      readiness.textContent = '';
      var blocked = publishBlocker(info, error);
      if (blocked) notice({ tone: 'warning', into: readiness, key: 'mesh-blocker', title: blocked.title, body: blocked.body,
        actions: blocked.actions.map(function (a) { return { label: a.label, run: async function () { await a.run(); load(); } }; })
          .concat([{ label: 'Check again', run: function () { load(); refreshMesh(); } }]) });
      else notice({ tone: 'success', into: readiness, key: 'mesh-blocker', title: 'Ready to publish', body: 'Every change is saved, you are signed in and the publishing service answers. Publish (top right) signs this version with your identity.' });
    }

    async function load() {
      if (!mesh) {
        fill([['Publishing service', 'Not reachable from this copy of the page']]);
        diffText.textContent = 'Open this page through the publishing service (node scripts/publish-host.mjs) to compare.';
        liveSummary.textContent = ''; liveList.textContent = '';
        ready(null, null);
        return;
      }
      fill([['Status', 'Checking…']]);
      diffText.textContent = 'Checking…';
      liveSummary.textContent = 'Checking…'; liveList.textContent = '';
      var info;
      try { info = await mesh.status(); }
      catch (error) { fill([['Status', error.message]]); diffText.textContent = ''; liveSummary.textContent = ''; ready(null, error); return; }
      ready(info, null);
      /* the host's status may not name the site (a publisher that reports no name): never print
         "undefined" -- the name is the host's, else plainly "This site" */
      routeLabel.textContent = siteName(info) + ' — Publishing status';
      var rows = [['Publishing service', info.reachable ? 'Answering' : 'Not answering' + (info.detail ? ' — ' + info.detail : '')]];
      var devRows = [];
      if (info.miner) rows.push(['Published through', (info.miner.label || info.miner.statusBase) + (info.miner.networkId ? ' (network ' + info.miner.networkId + ')' : '')]);
      if (info.current) {
        rows.push(['Live version', String(info.current.version)]);
        rows.push(['Last published', info.current.updatedAt]);
        devRows.push(['Address (CID)', info.current.cid], ['Owner key', info.current.ownerPublicKey]);
      } else rows.push(['Published', 'Not yet — Publish creates version 1.']);
      fill(rows, devRows);

      if (!info.current) {
        diffText.textContent = 'Nothing is live yet, so everything saved here stays on this computer.';
        liveSummary.textContent = 'Nothing is live yet.'; liveList.textContent = '';
        return;
      }
      try {
        var pulled = await mesh.pullSite(); // { record, cid, site }
        var site = pulled.site;
        liveSummary.textContent = site.manifests.length + ' page(s), ' + site.articles.length + ' article(s), ' + site.assets.length + ' image(s), ' + ((site.secrets || []).length) + ' encrypted item(s) (see below).';
        liveList.textContent = '';
        site.manifests.forEach(function (m) { liveList.appendChild(h('li', { text: (m.title || m.id) + ' — ' + (m.route || m.id) })); });
        site.articles.forEach(function (a) { liveList.appendChild(h('li', { text: (a.title || a.slug) + ' (article)' })); });
        site.assets.forEach(function (a) { liveList.appendChild(h('li', { text: (a.label || a.id) + ' (image)' })); });

        var localPageIds = state.ids.filter(function (id) { return state.saved[id] !== null; });
        var localArticleSlugs = state.slugs.filter(function (s) { return state.aSaved[s] !== null; });
        var localAssetIds = state.assetIds.filter(function (id) { return state.assetSaved[id] !== null; });
        var meshPageIds = site.manifests.map(function (m) { return m.id; });
        var meshArticleSlugs = site.articles.map(function (a) { return a.slug; });
        var meshAssetIds = site.assets.map(function (a) { return a.id; });
        var notIn = function (list) { return function (x) { return list.indexOf(x) < 0; }; };
        var added = localPageIds.filter(notIn(meshPageIds)).concat(localArticleSlugs.filter(notIn(meshArticleSlugs))).concat(localAssetIds.filter(notIn(meshAssetIds)));
        var removed = meshPageIds.filter(notIn(localPageIds)).concat(meshArticleSlugs.filter(notIn(localArticleSlugs))).concat(meshAssetIds.filter(notIn(localAssetIds)));
        var unsaved = state.ids.filter(dirty).length + state.slugs.filter(dirtyA).length + state.assetIds.filter(dirtyI).length + (reliefDirty() ? 1 : 0);
        var parts = [];
        if (added.length) parts.push(added.length + ' saved here but not live yet (' + added.join(', ') + ')');
        if (removed.length) parts.push(removed.length + ' live but not here — Publish would remove these (' + removed.join(', ') + ')');
        if (unsaved) parts.push(unsaved + ' unsaved edit(s) in this browser, not even written to the project folder yet');
        diffText.textContent = parts.length ? parts.join('. ') + '.' : 'Every id saved here matches what is published. (This only compares which pages/articles/images exist, not their exact content — Publish always re-checks before it changes anything.)';
      } catch (error) {
        liveSummary.textContent = error.message; liveList.textContent = '';
        diffText.textContent = 'Could not compare.';
      }
    }
    load();
  }

  /* ---- the mesh ------------------------------------------------------ */
  /* Only when this page is served by the publish host: from a file: URL there is no host to talk to. */
  var publishing = false;   /* a refresh that finishes mid-publish must not re-enable the button */
  function short(text) { return text ? text.slice(0, 8) + '…' + text.slice(-6) : ''; }
  function authorizationDigest(text) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (bytes) {
      return Array.from(new Uint8Array(bytes)).map(function (byte) { return byte.toString(16).padStart(2, '0'); }).join('');
    });
  }
  /* Same inspect -> approve -> sign shape (and the same shared view-model,
     ArkAuthorizationView.scopedAuthorizationView) as flux-dao-app's
     ScopedAuthorizationDialog -- now the real <flux-authorization-dialog>
     element too, instead of a hand-rolled lookalike. The element itself is
     an ARIA/focus-trap/busy-state primitive with no visual template, so the
     markup below mirrors ark-ui.flux-authorization-react.ts's exactly: a
     dismissible backdrop over a panel, this page's own "admin-auth-*" CSS. */
  function authorizePublish(input) {
    var who = gate.identity();
    if (!who) return Promise.resolve(false);
    return authorizationDigest(input.signingMessage).then(function (digest) {
      return new Promise(function (resolve) {
        var titleId = 'authDialogTitle-' + Date.now(), descId = 'authDialogDesc-' + Date.now();
        var dialog = document.createElement('flux-authorization-dialog');
        dialog.action = 'flux.site.publish';
        dialog.capability = 'site.publish';
        dialog.setAttribute('aria-labelledby', titleId);
        dialog.setAttribute('aria-describedby', descId);
        var view = window.ArkAuthorizationView.scopedAuthorizationView({
          title: input.title,
          description: input.description,
          requester: who.displayName || 'Signed-in identity',
          network: 'Local publish host',
          authority: who.publicKeyB64,
          configuration: input.record.name || 'flux-chain.ark',
          scope: 'site.publish',
          action: 'flux.site.publish',
          manifestDigest: digest,
          claimStack: 'primary authorize flux.site.publish for exact name record ' + digest + '\nconstraint owner ' + who.publicKeyB64 + '\nfailure reject altered, expired or cross-site bytes\ntrust zero',
          manifest: input.record,
          authorizationBytes: input.signingMessage,
          actionPayloadBytes: input.signingMessage,
          facts: [{ label: 'Version', value: String(input.record.version || 'next') }, { label: 'Signing profile', value: who.securityProfile === 'hybrid-pq' ? 'Hybrid identity available; names/* record remains Ed25519' : 'Ed25519 name record' }]
        });
        var backdrop = h('div', { class: 'admin-auth-backdrop' });
        var panel = h('section', { class: 'admin-auth-panel' });
        var title = h('div', { class: 'admin-auth-title' }, h('span', { class: 'kicker', text: 'Scoped publish authorization' }), h('h2', { id: titleId, text: view.heading }));
        var close = h('button', { type: 'button', class: 'admin-auth-close', 'aria-label': 'Cancel authorization', text: '×' });
        panel.appendChild(h('header', {}, title, close));
        panel.appendChild(h('p', { id: descId, class: 'admin-auth-description', text: view.description }));
        var context = h('dl', { class: 'admin-auth-context' });
        view.rows.forEach(function (row) { context.appendChild(h('div', {}, h('dt', { text: row.label }), h('dd', { text: row.value }))); });
        panel.appendChild(context);
        panel.appendChild(h('div', { class: 'admin-auth-digest' }, h('small', { text: 'Exact manifest digest · SHA-256' }), h('code', { text: view.digest })));
        view.disclosures.forEach(function (item) {
          var details = document.createElement('details'); details.appendChild(h('summary', { text: item.label }));
          var pre = document.createElement('pre'); pre.textContent = item.text; details.appendChild(pre); panel.appendChild(details);
        });
        panel.appendChild(h('p', { class: 'admin-auth-safety', text: view.safety + ' This publish action still signs the existing Ed25519 names/* record contract.' }));
        var footer = h('footer', {}, h('button', { type: 'button', class: 'btn', text: 'Cancel' }), h('button', { type: 'button', class: 'btn primary', 'data-autofocus': true, text: 'Approve scopes & sign' })); panel.appendChild(footer);
        backdrop.appendChild(panel); dialog.appendChild(backdrop); document.body.appendChild(dialog);
        var cancelButton = footer.children[0], approveButton = footer.children[1], closed = false;
        function finish(ok) { if (closed) return; closed = true; dialog.remove(); resolve(ok); }
        function busy() { return dialog.state === 'signing'; }
        close.addEventListener('click', function () { if (!busy()) finish(false); });
        cancelButton.addEventListener('click', function () { if (!busy()) finish(false); });
        approveButton.addEventListener('click', function () {
          dialog.state = 'signing';
          close.disabled = true; cancelButton.disabled = true; approveButton.disabled = true;
          approveButton.textContent = 'Signing locally…';
          finish(true);
        });
        backdrop.addEventListener('mousedown', function (event) { if (event.target === backdrop && !busy()) finish(false); });
        /* Capture-phase so it runs before FluxDialogElement's own bubble-phase
           Escape handler, which otherwise closes the dialog mid-sign. */
        dialog.addEventListener('keydown', function (event) { if (busy() && event.key === 'Escape') event.stopPropagation(); }, true);
        dialog.open = true;
      });
    });
  }
  var mesh = window.ArkPublish ? ArkPublish.create({ identity: function () { return gate.identity(); }, authorize: authorizePublish }) : null;

  /* why Publish is unavailable (law: a refusal names what it needs; tests/admin-disabled-says-why.cjs) */
  var PUBLISH_NEEDS_HOST = 'Cannot publish from this copy of the page: it reaches no miner. Open the copy the host serves (http://127.0.0.1:3437/admin.html) or double-click "Flux Chain Admin.command".';
  var PUBLISHING_NOW = 'Publishing now: wait for this version to finish.';
  /* How to start the one thing publishing needs that this page cannot start itself (README,
     "Publishing"): the host finds a running miner by itself and picks it up when it starts later. */
  var START_MINER = 'Publishing needs Ark Miner running on this computer: open the Ark Miner Desktop app, or run `npm start` in the ark-miner-cli folder. This editor finds it by itself; then press Check again.';
  function siteName(info) { return (info && info.name) || 'This site'; }
  /* What stops a publish now, in the order a person fixes it, with the button that fixes it -- or
     null. `info` is the host's status (null: no status), `error` a status that could not be read. */
  function publishBlocker(info, error) {
    if (!mesh) return { title: 'This copy of the editor cannot publish', body: PUBLISH_NEEDS_HOST, actions: [] };
    if (error) return { title: 'Cannot publish: the publishing service did not answer', body: error.message + ' ' + START_MINER, actions: [] };
    if (info && !info.reachable) return { title: 'Cannot publish: Ark Miner is not running (or not reachable)', body: (info.detail ? 'The publish host says: ' + info.detail + ' ' : '') + START_MINER, actions: [] };
    if (anyDirty()) return { title: 'Save first', body: 'Publishing sends what is saved in your project folder; there are unsaved changes, so the published site would not match what you see.', actions: [{ label: 'Save now', run: function () { return saveEverything(); } }] };
    /* an identity that does not own the site's name cannot publish it (this was a sentence only in the account
       menu's duplicate "Publishing service" block, removed 2026-10-21: docs/ux-audit/cms.md P2-9) */
    var me = mesh.identity();
    if (info && info.current && me && info.current.ownerPublicKey && info.current.ownerPublicKey !== me.publicKeyB64) return { title: 'This identity does not own the site\'s name', body: 'The live site was published by another identity, so a publish from this one would be refused. Sign in with the identity that owns the name (Owner key, under Developer details).', actions: [{ label: 'Sign in', run: function () { try { if (gate && gate.reauthenticate) gate.reauthenticate(); } catch (e) { /* the sentence above still says what to do */ } } }] };
    if (!me) return { title: 'Sign in to publish', body: 'Publishing is signed with your identity, and its key is not unlocked in this tab (a reload drops it). Choose your sign-in file (.auth.flx) to unlock it; your edits stay.', actions: [{ label: 'Sign in', run: function () { try { if (gate && gate.reauthenticate) gate.reauthenticate(); } catch (e) { /* the sentence above still says what to do */ } } }] };
    return null;
  }
  /* A click on Publish while it is refused: the sheet that says why, with the remedy and Check
     again, instead of a click that did nothing (refuse(..., explain), js/admin/core.js). */
  function explainPublish(reason) {
    if (reason === PUBLISHING_NOW) { notice({ tone: 'info', title: 'Publishing now', body: reason }); return; }
    if ($('sheet').hidden || $('sheet').dataset.sheet !== 'mesh') openMeshSheet();
  }
  /* What the header needs from the publishing service: the identity chip and whether Publish is refused (with
     why). The service's state itself is said in ONE place, the Publishing status sheet (renderMeshEditor): the
     account menu had a second "Publishing service" block with its own line and Check again (cms.md P2-9). */
  async function refreshMesh() {
    if (!mesh) { refuse($('publish'), PUBLISH_NEEDS_HOST, explainPublish); return; }
    try {
      var info = await mesh.status();
      var who = mesh.identity();
      var chip = $('who'); if (chip) chip.textContent = who ? (who.displayName || 'signed in') + ' · ' + short(who.publicKeyB64) : '';
      if (chip) chip.title = who ? 'Signing key ' + who.publicKeyB64 : '';   /* the full key stays one hover away */
      refuse($('publish'), publishing ? PUBLISHING_NOW : info.reachable ? '' : 'Cannot publish: the miner is not reachable (' + (info.detail || 'no answer') + '). Start the miner or check its address, then Refresh.', explainPublish);
    } catch (error) { refuse($('publish'), 'Cannot publish: the miner status could not be read (' + error.message + '). Fix that, then Refresh.', explainPublish); }
  }

  $('publish').addEventListener('click', async function () {
    if (!mesh) return;
    if (!mesh.identity()) {
      // A reload keeps the session but drops the signing key (js/admin/gate.js); get it back without losing this tab's edits.
      status('Choose your recovery file to unlock signing, then publish again.', 'warn');
      try { if (gate && gate.reauthenticate) gate.reauthenticate(); } catch (error) { /* the button click above still told them what to do */ }
      return;
    }
    if (anyDirty()) {
      status('Save your changes first, so the site files and the published copy match.', 'warn');
      notice({ tone: 'warning', key: 'publish-unsaved', title: 'Save first, then publish', body: 'Publishing sends what is saved in your project folder. There are unsaved changes, so the published site would not match what you see.', actions: [{ label: 'Save now', run: function () { saveEverything(); } }] });
      return;
    }
    var button = $('publish'); refuse(button, PUBLISHING_NOW, explainPublish); publishing = true;
    try {
      var result = await mesh.publishSite(siteFromState(), function (message) { status(message, ''); }, function (removes) {
        var what = removes ? removes.manifests.concat(removes.articles).concat(removes.assets).concat(removes.secrets || []).join(', ') : 'possibly some pages, articles, images or encrypted items (the published version could not be compared)';
        /* ArkPublish awaits the answer (js/admin/publish.js confirmRemoval): Ark's AlertDialog, worded here (cms.md P2-11) */
        return A.confirmDialog({ title: 'Publish and take these off the live site?',
          message: 'This version removes what is live now: ' + what + '.\n\nThis page may be out of date, for example if its saves were only downloaded. If so, cancel, reload this page and publish again.\n\nPublishing is public: what you remove stays off the site until you publish it again.',
          confirmLabel: 'Publish and remove', cancelLabel: 'Cancel', tone: 'danger' });
      });
      if (result.cancelled) status('Not published. Reload this page to pick up the project files, or run node scripts/pull-site.mjs to bring in the published copy.', 'warn');
      else if (result.unchanged) status('Nothing new to publish: version ' + result.version + ' already holds this content.', 'ok');
      else status('Published version ' + result.published + (result.confirmed ? ', confirmed by the miner reading it back.' : '. The miner has not read it back yet: refresh the Mesh panel.'), result.confirmed ? 'ok' : 'warn');
      /* The name record keeps no link to the version before it, so this is the only place a
         published address is remembered: a forward 'publish' record in the version history. */
      if (result && result.published) recordVersion(1, { kind: 'publish', published: { version: result.published, cid: result.cid || '' } });
    } catch (error) {
      status(error.message + (error.detail && error.detail.remedy && error.message.indexOf(error.detail.remedy) < 0 ? ' To fix: ' + error.detail.remedy : ''), 'error');
    }
    publishing = false; refuse(button, '', explainPublish); refreshMesh();
  });
  $('meshNav').addEventListener('click', selectMesh);
  A.provide({ refreshMesh: refreshMesh, renderMeshEditor: renderMeshEditor });
})();
