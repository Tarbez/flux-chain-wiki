/* =====================================================================
   ADMIN EDITOR · IMAGES (js/admin/assets.js)
   ---------------------------------------------------------------------
   Owns: the Media panel -- renderMediaPanel(container), drawn into whatever container the
   shell gives it (the rail's Media tab, ~280px): every image (ArkAsset) as a grid or a list
   with its dirty dot, New image, and per image an inline detail -- preview, Alt text, Replace
   image, Revert, Delete. Files are chosen with controls.js filePicker (a styled button and a
   drop target over the native input), never the browser's bare "Choose File" box. Also reading a file into an asset (readFileAsAsset; adding an
   image beside a shape picker is quickAddAsset, js/admin/shapes.js, through it).
   Must not: write files itself (js/admin/save.js does).
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, status = A.status, h = A.h, touch = A.touch,
      removeItemFile = A.removeItemFile, afterDelete = A.afterDelete, ctlField = A.ctlField,
      paintInto = A.paintInto, panelHead = A.panelHead, itemsChanged = A.itemsChanged,
      itemDirty = A.itemDirty, afterItemRemoved = A.afterItemRemoved, deleteItem = A.deleteItem,
      filePicker = A.filePicker;
  /* the bridge's (js/admin/bridge.js); skipped when no canvas is there to show it */
  function notifyPreviewAssets() { if (typeof A.notifyPreviewAssets === 'function') A.notifyPreviewAssets(); }

  /* ---- image assets --------------------------------------------------- */
  /* file -> {mime, dataBase64}, or a status message and nothing if the file fails validation */
  function readFileAsAsset(file, onReady) {
    if (ArkAsset.mimeTypes.indexOf(file.type) < 0) { status('That file type is not supported. Use PNG, JPEG, WebP or SVG.', 'error'); return; }
    if (file.size > ArkAsset.maxBytes) { status('That image is larger than ' + ArkAsset.sizeLabel(ArkAsset.maxBytes) + '.', 'error'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var result = reader.result, comma = result.indexOf(',');
      onReady({ mime: file.type, dataBase64: result.slice(comma + 1) });
    };
    reader.onerror = function () { status('Could not read that file.', 'error'); };
    reader.readAsDataURL(file);
  }
  function assetSrc(asset) { return 'data:' + asset.mime + ';base64,' + asset.dataBase64; }

  /* one image's detail: preview, label, replace, Revert, Delete */
  function assetDetail(id) {
    var asset = state.assetDrafts[id];
    var box = h('div', { class: 'media-detail' });
    box.appendChild(panelHead(asset.label || id, 'js/content/assets/' + id + '.js', 'asset', id));
    var preview = h('img', { src: assetSrc(asset), alt: asset.label, class: 'asset-preview' });
    box.appendChild(preview);
    /* "Alt text" is the image's stored label: it is what the image is called in this list AND what
       it says to someone who cannot see it (the preview's alt), so one field serves both
       (docs/ux-audit/cms.md P1-11: select an image, get Replace image and Alt text) */
    var label = ctlField({ get: function () { return asset.label; }, set: function (_k, v) {
      asset.label = v; preview.alt = v;
      var name = box.parentNode && box.parentNode.querySelector('[data-cms-item="asset:' + id + '"] .media-name');
      if (name) name.textContent = v || id;
      touch({ kind: 'asset', id: id });
    } }, 'Alt text', 'label', { type: 'text', live: true, id: 'as-' + id + '-label', ariaLabel: 'Alt text',
      hint: 'Describes the image for people who cannot see it. It is also this image\u2019s name in the list.' });
    label.classList.add('field');
    box.appendChild(label);
    var pick = filePicker({ id: 'as-' + id + '-file', accept: ArkAsset.mimeTypes.join(','), label: 'Replace image', ariaLabel: 'Replace image', empty: 'or drop a new file here',
      onFile: function (picked, input) {
        readFileAsAsset(picked, function (next) {
          asset.mime = next.mime; asset.dataBase64 = next.dataBase64;
          preview.src = assetSrc(asset);
          var thumb = box.parentNode && box.parentNode.querySelector('[data-cms-item="asset:' + id + '"] img');
          if (thumb) thumb.src = preview.src;
          touch({ kind: 'asset', id: id }); notifyPreviewAssets();
          status('Image replaced. Save to keep it.', '');
        });
        input.value = '';   /* the same file can be chosen again after a Revert */
      } });
    box.appendChild(h('div', { class: 'field media-replace' }, pick));
    box.appendChild(h('div', { class: 'danger-zone' },
      h('button', { type: 'button', class: 'btn danger', text: 'Delete this image', onclick: function () { deleteItem('asset', id); } })));
    return box;
  }

  /* renderMediaPanel(container): every image, as a grid of thumbnails (default) or a list, each
     opening its detail inline under it; New image at the top. Rail width (~280px) friendly: the
     grid is two thumbnails wide there. Returns the container. */
  var mediaView = 'grid';
  try { if (localStorage.getItem('defxn-cms-media-view') === 'list') mediaView = 'list'; } catch (e) { /* storage blocked: the default */ }
  function renderMediaPanel(container) {
    var record = { kind: 'asset:list', repaint: function () { renderMediaPanel(container); } };
    paintInto(container, record, function (root) {
      root.classList.add('cms-form', 'cms-media');
      /* Grid / List is Ark's toggle group (js/admin/ark-host.js arkSegGroup), the same control as
         every segmented row (one pressed, one tab stop) */
      var views = h('div', { class: 'ctl-seg media-views', role: 'group', 'aria-label': 'Show images as' });
      var VIEWS = ['grid', 'list'];
      var viewButtons = VIEWS.map(function (v) { var b = h('button', { type: 'button', text: v === 'grid' ? 'Grid' : 'List' }); views.appendChild(b); return b; });
      A.arkSegGroup(views, viewButtons, { selected: VIEWS.indexOf(mediaView), onPick: function (i) {
        mediaView = VIEWS[i]; try { localStorage.setItem('defxn-cms-media-view', mediaView); } catch (e) { /* a convenience only */ }
        renderMediaPanel(container);
      } });
      root.appendChild(h('div', { class: 'media-head' }, h('span', { class: 'field-key', text: state.assetIds.length + ' image' + (state.assetIds.length === 1 ? '' : 's') }), views));
      root.appendChild(newAssetForm());
      if (!state.assetIds.length) { root.appendChild(h('p', { class: 'hint', text: 'No images yet. Choose New image above to add one; Save puts it on the site.' })); return; }
      var list = h('ul', { class: 'media-items media-' + mediaView });
      state.assetIds.forEach(function (id) {
        var asset = state.assetDrafts[id], open = state.kind === 'asset' && state.assetCurrent === id;
        var row = h('button', { type: 'button', class: 'media-item', 'aria-expanded': String(open), 'data-cms-item': 'asset:' + id, title: asset.label || id, onclick: function () {
          var opening = !(state.kind === 'asset' && state.assetCurrent === id);
          if (opening) { state.kind = 'asset'; state.assetCurrent = id; } else state.assetCurrent = null;
          renderMediaPanel(container);
        } }, h('img', { src: assetSrc(asset), alt: '' }), h('span', { class: 'media-name', text: asset.label || id }),
          itemDirty('asset', id) ? h('span', { class: 'dot', title: 'Unsaved changes' }) : null);
        var li = h('li', { class: open ? 'open' : '' }, row);
        if (open) li.appendChild(assetDetail(id));
        list.appendChild(li);
      });
      root.appendChild(list);
    });
    return container;
  }

  /* The New image form: picking a file reads and checks it at once, so choosing one is never
     silent -- a thumbnail appears (or an error does) before Add is clicked, and the name fills
     itself so a blank name field is not a dead end. One handler, delegated by the form's id, for
     the panel's form and any other drawn with the same ids. */
  function newAssetForm() {
    return h('details', { class: 'add-toggle' }, h('summary', { text: 'New image' }),
      h('form', { id: 'newAssetForm', class: 'new-form', autocomplete: 'off' },
        filePicker({ id: 'newAssetFile', accept: ArkAsset.mimeTypes.join(','), label: 'Choose an image', ariaLabel: 'Image file', empty: 'or drop one here' }),
        h('p', { class: 'hint', text: 'PNG, JPEG, WebP or SVG, up to ' + ArkAsset.sizeLabel(ArkAsset.maxBytes) + '.' }),
        h('img', { id: 'newAssetPreview', class: 'asset-preview new-asset-preview', alt: '', hidden: true }),
        h('div', { class: 'new-row' }, h('input', { type: 'text', id: 'newAssetId', placeholder: 'image-name', 'aria-label': 'Image name', spellcheck: false }),
          h('button', { type: 'submit', class: 'btn', text: 'Add' }))));
  }

  function revertAsset(id) {
    if (id === undefined) id = state.assetCurrent;
    if (state.assetSaved[id] === null || state.assetSaved[id] === undefined) return;
    state.assetDrafts[id] = JSON.parse(state.assetSaved[id]);
    itemsChanged('asset', id); touch({ kind: 'asset', id: id }); notifyPreviewAssets(); status('Reverted to the saved version.', '');
  }

  /* Step 5: the old single-image saveAssetCurrent() is deleted -- its exact logic now lives
     inside saveEverything()'s images loop. See saveEverything() (js/admin/save.js). */

  async function deleteAsset(id) {
    if (id === undefined) id = state.assetCurrent;
    var asset = state.assetDrafts[id];
    if (!asset) { status('Nothing deleted: there is no image "' + id + '".', 'error'); return; }
    if (!state.assetDir && state.assetSaved[id] !== null) { status('Connect the project folder to delete an image: this removes its file.', 'warn'); return; }
    if (!(await A.confirmDelete('image', asset.label || id, 'Anything using this image (for example the concept page) falls back to its default.', state.assetSaved[id] === null))) return;
    try { await removeItemFile('asset', id); }
    catch (error) { status(error.message, 'error'); return; }
    if (state.assetCurrent === id) state.assetCurrent = state.assetIds[0] || null;
    afterItemRemoved('asset', id);
    status('Deleted ' + (asset.label || id) + '.' + await afterDelete(), 'ok');
    if (typeof A.deletedNotice === 'function') A.deletedNotice(asset.label || id);
  }

  function assetIdSlug(filename) {
    var base = filename.toLowerCase().replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'image';
    // A hash-style filename ("1b2d390dd280...jpg") slugifies to something that STARTS WITH A DIGIT,
    // which the id rule (^[a-z]) then refuses -- silently, from the user's point of view, since the
    // field already looks filled in. Never hand back a slug the validator would reject.
    if (!/^[a-z]/.test(base)) base = 'image-' + base;
    base = base.slice(0, 40).replace(/-+$/, '');
    if (!state.assetDrafts[base]) return base;
    var n = 2;
    while (state.assetDrafts[base + '-' + n]) n += 1;
    return base + '-' + n;
  }

  /* createAsset(id, file) -> { ok, id } | { ok: false, refusal }: `file` is what readFileAsAsset
     produced ({ mime, dataBase64 }). A new image draft (written by the next Save), opened. */
  function createAsset(id, file) {
    id = String(id || '').trim();
    var refusal = !file ? 'Choose an image file.'
      : !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id) ? 'An image name is lowercase words joined by hyphens, starting with a letter.'
      : state.assetDrafts[id] ? 'There is already an image called ' + id + '.' : '';
    if (refusal) { status(refusal, 'error'); return { ok: false, refusal: refusal }; }
    state.assetIds.push(id);
    state.assetDrafts[id] = { id: id, label: id, mime: file.mime, dataBase64: file.dataBase64 };
    state.assetSaved[id] = null;
    state.kind = 'asset'; state.assetCurrent = id;
    itemsChanged('asset', id); touch({ kind: 'asset', id: id }); notifyPreviewAssets();
    if (typeof A.recordCreate === 'function') A.recordCreate('asset', id);
    status('New image. Edit its alt text, then Save to create it.', '');
    return { ok: true, id: id };
  }
  document.addEventListener('change', function (event) {
    var input = event.target, form = input && input.form;
    if (!form || form.id !== 'newAssetForm' || input.type !== 'file') return;
    var preview = form.querySelector('#newAssetPreview'), idInput = form.querySelector('#newAssetId'), picked = input.files && input.files[0];
    form.cmsPending = null; preview.hidden = true; preview.removeAttribute('src');
    if (!picked) return;
    readFileAsAsset(picked, function (next) {
      form.cmsPending = next;
      preview.src = assetSrc(next);
      preview.hidden = false;
      if (!idInput.value.trim()) idInput.value = assetIdSlug(picked.name);
      status('', '');
    });
  });
  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form || form.id !== 'newAssetForm') return;
    event.preventDefault();
    var idInput = form.querySelector('#newAssetId');
    var r = createAsset(idInput.value, form.cmsPending);
    if (!r.ok) return;
    form.cmsPending = null; idInput.value = '';
    var chooser = form.querySelector('#newAssetFile'); chooser.value = ''; chooser.dispatchEvent(new Event('change', { bubbles: true }));   /* the picker names no file again */
    form.querySelector('#newAssetPreview').hidden = true; form.querySelector('#newAssetPreview').removeAttribute('src');
    if (typeof A.selectAsset === 'function') A.selectAsset(r.id);
  });
  A.provide({ assetIdSlug: assetIdSlug, createAsset: createAsset, deleteAsset: deleteAsset,
      readFileAsAsset: readFileAsAsset, renderMediaPanel: renderMediaPanel, revertAsset: revertAsset });
})();
