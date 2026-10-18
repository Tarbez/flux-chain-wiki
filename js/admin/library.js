/* =====================================================================
   ADMIN EDITOR · LIBRARY (js/admin/library.js)
   ---------------------------------------------------------------------
   Owns: the Library tab -- the typed blocks and the components made from selections,
   inserting one at a reported insertion point, editing a definition, deleting one.
   Must not: mutate the components draft itself: every command goes to the preview
   (postCmsComponentsCommand), which computes it once and relays the whole draft back.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, showLeft = A.showLeft, $ = A.$, cmsPreview = A.cmsPreview,
      postCmsComponentsCommand = A.postCmsComponentsCommand, cmsNextComponentId = A.cmsNextComponentId,
      toast = A.toast, ic = A.ic, cmsMasterKind = A.cmsMasterKind, ctlField = A.ctlField,
      cmsMasterProps = A.cmsMasterProps, CMS_BLOCK_RESOLVERS = A.CMS_BLOCK_RESOLVERS,
      cmsBlockResolverLabel = A.cmsBlockResolverLabel, ctlSelectField = A.ctlSelectField,
      cmsBlockResolverProps = A.cmsBlockResolverProps, openContentEditor = A.openContentEditor,
      selectDesign = A.selectDesign;

  /* the Library's open definition editor / insertion-point picker (a master id, or '') */
  let libEditing = '', libPicking = '';
  function cmsOpenMasterInLibrary(id) {
    libEditing = id; state.libKey = ''; showLeft('lib'); renderLibrary();
    const row = $('libPane').querySelector('.lib-definition'); if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' });
  }
  function postCmsHighlightPoint(id) {
    if (!state.cmsConnected || !cmsPreview.contentWindow) return;
    cmsPreview.contentWindow.postMessage({ type: 'defxn-cms-preview-highlight-point', id }, window.location.origin);
  }
  function renderLibrary() {
    const box = $('libPane'); if (box.hidden) return;
    {
      /* Reusable components (js/content/components.js): masters/instances/overrides are real
         DEFXN runtime state, round-tripped through the connected preview iframe exactly like
         every other authoritative edit here -- never a second, visual-only component system.
         insertInstance/setOverride/removeInstance/createMaster/updateMaster all run for real
         inside that iframe (js/main.js's cmsComponentsCommand), which is the one thing a
         prototype canvas component genuinely could not do against the real renderer. */
      const components = (state.cmsSourceSite && state.cmsSourceSite.components) || { masters: {}, routes: {} };
      /* a detached copy belongs to its one instance; it is not something to reuse */
      const masterIds = Object.keys(components.masters || {}).filter((id) => !components.masters[id].detached);
      if (libEditing && masterIds.indexOf(libEditing) < 0) libEditing = '';
      if (libPicking && masterIds.indexOf(libPicking) < 0) libPicking = '';
      const key = JSON.stringify(['cms-components', masterIds.map((id) => [id, components.masters[id]]), state.cmsInsertPoints, state.cmsPreviewRoute, libEditing, libPicking]);
      if (key === state.libKey && box.children.length) return;
      /* Never rebuild under someone typing: every selection in the preview re-reports the
         page's places, and a rebuild mid-edit replaced the definition field being typed in,
         so its change event fired on a fresh field holding the OLD value and the edit was
         silently lost (found driving the editor: tests/browser/studio-flows.mjs, makecomp).
         The rebuild waits until focus leaves the panel. */
      const typing = document.activeElement && box.contains(document.activeElement) && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (typing && box.children.length) {
        if (!box.dataset.deferred) { box.dataset.deferred = '1'; box.addEventListener('focusout', () => { setTimeout(() => { if (box.contains(document.activeElement)) return; delete box.dataset.deferred; state.libKey = ''; renderLibrary(); }, 0); }, { once: true }); }
        return;
      }
      state.libKey = key; box.textContent = '';

      /* Insertion points come from the preview (js/main.js's cmsInsertionPoints), each with
         whether a block put there would be SEEN. A point too narrow to show anything is not
         offered -- /about's only page slot is 0px wide, and a block inserted there existed
         and was invisible (regression: tests/cms-insertion-points.cjs) -- but it is still
         named, with why, so a missing option does not read as a missing feature. A state's
         own content anchor is never a point (it belongs to the States section). */
      const usable = state.cmsInsertPoints.filter((point) => point.usable), unusable = state.cmsInsertPoints.filter((point) => !point.usable);
      const site = document.createElement('div'); site.className = 'libsec';
      const h = document.createElement('h4'); h.textContent = 'DEFXN reusable components'; site.appendChild(h);
      const note = document.createElement('p'); note.className = 'hint';
      note.textContent = usable.length
        ? `${usable.length} place${usable.length > 1 ? 's' : ''} to insert on this page: ${usable.map((point) => point.label).join('; ')}.`
        : 'No visible place to insert on this page yet. Select an element on the page to insert after it.';
      site.appendChild(note);
      if (unusable.length) {
        const skipped = document.createElement('p'); skipped.className = 'hint lib-skipped';
        skipped.textContent = 'Not offered: ' + unusable.map((point) => `${point.label} (${point.reason})`).join('; ') + '.';
        site.appendChild(skipped);
      }
      if (!masterIds.length) { const p = document.createElement('p'); p.className = 'hint'; p.textContent = 'No reusable blocks yet. Create one below, or select something on the page and choose Make into component, then insert it here or on any other route.'; site.appendChild(p); }
      const insertAt = (id, master, point) => {
        postCmsHighlightPoint('');
        postCmsComponentsCommand(point.kind === 'after'
          ? { action: 'insert-instance', after: point.after, key: cmsNextComponentId('i'), masterId: id }
          : { action: 'insert-instance', anchorId: point.anchorId, key: cmsNextComponentId('i'), masterId: id });
        libPicking = ''; state.libKey = '';
        toast(`Inserted ${master.label}: ${point.label}.`);
      };
      masterIds.forEach((id) => {
        const master = components.masters[id];
        const row = document.createElement('div'); row.className = 'myrow'; row.dataset.master = id;
        row.innerHTML = `${ic('comp', 'sm')}<span></span><small></small>`;
        row.querySelector('span').textContent = master.label; row.querySelector('small').textContent = cmsMasterKind(master);
        row.title = master.label + ' · ' + cmsMasterKind(master);
        Object.assign(row.querySelector('small').style, { flex: '0 1 auto', minWidth: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '35%' });
        const insert = document.createElement('button'); insert.className = 'btn small'; insert.type = 'button'; insert.textContent = 'Insert';
        insert.disabled = !usable.length;
        insert.title = usable.length ? (usable.length > 1 ? 'Choose where on this page' : 'Insert: ' + usable[0].label) : 'No visible place on this page: select an element on the page to insert after it';
        insert.setAttribute('aria-expanded', String(libPicking === id));
        /* One place inserts at once; several open a picker in the panel (not a prompt() that
           wanted an anchor id typed exactly): hovering or focusing a place outlines it in the
           preview, clicking inserts there. */
        insert.addEventListener('click', () => {
          if (usable.length === 1) { insertAt(id, master, usable[0]); renderLibrary(); return; }
          libPicking = libPicking === id ? '' : id; if (!libPicking) postCmsHighlightPoint('');
          state.libKey = ''; renderLibrary();
        });
        const edit = document.createElement('button'); edit.className = 'btn small'; edit.type = 'button'; edit.textContent = 'Edit';
        edit.title = 'Edit the definition: every instance, on every page, follows it';
        edit.setAttribute('aria-expanded', String(libEditing === id));
        edit.addEventListener('click', () => { libEditing = libEditing === id ? '' : id; state.libKey = ''; renderLibrary(); });
        row.append(insert, edit); site.appendChild(row);
        if (libPicking === id) {
          const picker = document.createElement('div'); picker.className = 'lib-picker'; picker.setAttribute('role', 'listbox'); picker.setAttribute('aria-label', 'Where to insert ' + master.label);
          Object.assign(picker.style, { display: 'grid', gap: '4px', margin: '2px 0 8px 22px' });
          usable.forEach((point) => {
            const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small lib-point'; b.setAttribute('role', 'option'); b.dataset.point = point.id;
            b.textContent = point.label; b.title = `${point.width}px wide here`;
            /* a place's label quotes page text; it wraps inside the panel instead of widening it */
            Object.assign(b.style, { justifyContent: 'flex-start', textAlign: 'left', whiteSpace: 'normal', overflowWrap: 'anywhere', maxWidth: '100%', height: 'auto', minHeight: '28px' });
            b.addEventListener('mouseenter', () => postCmsHighlightPoint(point.id)); b.addEventListener('focus', () => postCmsHighlightPoint(point.id));
            b.addEventListener('mouseleave', () => postCmsHighlightPoint('')); b.addEventListener('blur', () => postCmsHighlightPoint(''));
            b.addEventListener('click', () => { insertAt(id, master, point); renderLibrary(); });
            picker.appendChild(b);
          });
          const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'btn small'; cancel.textContent = 'Cancel';
          cancel.addEventListener('click', () => { libPicking = ''; postCmsHighlightPoint(''); state.libKey = ''; renderLibrary(); });
          picker.appendChild(cancel); site.appendChild(picker);
        }
        if (libEditing === id) {
          /* the definition itself: label and every prop (a captured component's are its own
             text/image slots) -- update-master, so every instance re-renders from it */
          const form = document.createElement('div'); form.className = 'lib-definition'; form.style.margin = '2px 0 8px 22px';
          /* the shared ctlField, with two ctx objects: a CTA block has a prop named `label` too */
          const labelCtx = { get: () => master.label, set: (_key, v) => postCmsComponentsCommand({ action: 'update-master', id, patch: { label: v } }) };
          const propsCtx = { get: (prop) => master.props[prop], set: (prop, v) => postCmsComponentsCommand({ action: 'update-master', id, patch: { props: Object.assign({}, master.props, { [prop]: v }) } }) };
          form.appendChild(ctlField(labelCtx, 'label', 'label', { type: 'text', ariaLabel: 'Definition label' }));
          cmsMasterProps(master).forEach((prop) => form.appendChild(ctlField(propsCtx, prop, prop, { type: 'text', ariaLabel: 'Definition ' + prop })));
          const uses = Object.keys(components.routes || {}).reduce((n, route) => n + Object.keys(components.routes[route]).reduce((m, a) => m + components.routes[route][a].filter((it) => it.masterId === id).length, 0), 0);
          const hint = document.createElement('p'); hint.className = 'hint'; hint.textContent = `Used ${uses} time${uses === 1 ? '' : 's'} across the site; every one follows these fields unless it overrides one.`;
          form.appendChild(hint); site.appendChild(form);
        }
      });
      box.appendChild(site);

      const form = document.createElement('div'); form.className = 'libsec';
      const fh = document.createElement('h4'); fh.innerHTML = '<span>New block</span>'; form.appendChild(fh);
      /* The new block being described, edited through the shared ctl*Field builders. Choosing
         another type starts its label and props over (they belong to the type). */
      const fresh = { resolver: CMS_BLOCK_RESOLVERS[0].resolver, label: '', props: {} };
      const startType = (resolver) => { fresh.resolver = resolver; fresh.label = cmsBlockResolverLabel(resolver) + ' block'; fresh.props = {}; };
      startType(fresh.resolver);
      const freshHost = document.createElement('div');
      const typeCtx = { get: () => fresh.resolver, set: (_key, resolver) => { startType(resolver); renderNewBlockFields(); } };
      const nameCtx = { get: () => fresh.label, set: (_key, v) => { fresh.label = v; } };
      const freshPropsCtx = { get: (prop) => fresh.props[prop], set: (prop, v) => { if (v) fresh.props[prop] = v; else delete fresh.props[prop]; } };
      function renderNewBlockFields() {
        freshHost.textContent = '';
        freshHost.append(ctlSelectField(typeCtx, 'Block type', 'resolver', CMS_BLOCK_RESOLVERS.map((b) => b.resolver), cmsBlockResolverLabel),
          ctlField(nameCtx, 'Label', 'label', { type: 'text' }),
          ...cmsBlockResolverProps(fresh.resolver).map((prop) => ctlField(freshPropsCtx, prop, prop, { type: 'text', data: { prop } })));
      }
      renderNewBlockFields();
      form.appendChild(freshHost);
      const create = document.createElement('button'); create.className = 'btn small primary'; create.type = 'button'; create.textContent = 'Create block';
      create.addEventListener('click', () => {
        const props = Object.assign({}, fresh.props);
        const label = fresh.label.trim() || cmsBlockResolverLabel(fresh.resolver);
        postCmsComponentsCommand({ action: 'create-master', id: cmsNextComponentId('m'), resolver: fresh.resolver, props, label });
        toast(`Created ${label}. Find it above to insert it on any route.`);
      });
      form.appendChild(create);
      box.appendChild(form);

      const actions = document.createElement('div'); actions.style.display = 'flex'; actions.style.gap = '6px'; actions.style.flexWrap = 'wrap'; actions.style.marginTop = '8px';
      const content = document.createElement('button'); content.className = 'btn small'; content.type = 'button'; content.textContent = 'Open in Content'; content.addEventListener('click', openContentEditor);
      const design = document.createElement('button'); design.className = 'btn small'; design.type = 'button'; design.textContent = 'Theme & defaults'; design.addEventListener('click', () => selectDesign());
      actions.append(content, design); box.appendChild(actions); return;
    }
  }
  A.provide({ cmsOpenMasterInLibrary: cmsOpenMasterInLibrary, renderLibrary: renderLibrary });
})();
