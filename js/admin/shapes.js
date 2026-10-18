/* =====================================================================
   ADMIN EDITOR · PAGE SHAPES AND MESH TUNING (js/admin/shapes.js)
   ---------------------------------------------------------------------
   Owns: the shared relief tuning and each page's shape images (ArkMeshSettings) --
   the Shape tab of a page's editor, the editor for shape pages with no manifest, adding
   an image right beside a shape picker (quickAddAsset), and saveMeshDraft (called by Save).
   Must not: hold the draft itself (state.meshDraft, js/admin/state.js).
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, status = A.status, download = A.download, renderList = A.renderList,
      readFileAsAsset = A.readFileAsAsset, assetIdSlug = A.assetIdSlug, h = A.h,
      notifyPreviewMesh = A.notifyPreviewMesh, renderEditor = A.renderEditor,
      notifyPreviewAssets = A.notifyPreviewAssets, touch = A.touch,
      refreshSaveButton = A.refreshSaveButton, $ = A.$;

  /* ---- mesh tuning + page shapes (js/content/mesh-settings.js) ------- */
  /* Built straight into a page's own editor (renderEditor, for a page hasShape() names),
     right where a person is already reading that page's fields, instead of a separate
     "Shapes" list to go find. meshDraft/meshSaved are shared module state so an edit on
     one page's screen and Save from another never disagree. */
  function reliefDirty() { return !window.ArkMeshSettings || JSON.stringify(ArkMeshSettings.sanitize(state.meshDraft)) !== state.meshSaved; }
  async function saveMeshDraft(button) {
    try {
      if (state.cdirs) {
        await ArkAdminStore.saveMeshSettings(state.cdirs.content, state.meshDraft);
        status('Saved js/content/mesh-settings-data.js', 'ok');
      } else {
        download('mesh-settings-data.js', ArkMeshSettings.serialize(state.meshDraft));
        status('Downloaded mesh-settings-data.js. Put it in js/content/, or connect the project folder to save directly.', 'warn');
      }
    /* Step 5: re-throws now that saveEverything() is this function's only caller -- see
       saveThemeDraft's matching comment above. */
    } catch (error) { status(error.message, 'error'); throw error; }
    state.meshDraft = ArkMeshSettings.sanitize(state.meshDraft);
    state.meshSaved = JSON.stringify(state.meshDraft);
    ArkMeshSettings.define(state.meshDraft);
    if (button) button.disabled = true;
    renderList();
  }
  /* An image file picked right next to a shape's own select, so adding a new
     photo never means leaving this screen for the Images list first. Reuses
     the same decode + id rules as the standalone "add image" form. */
  function quickAddAsset(file, onDone) {
    readFileAsAsset(file, function (next) {
      var id = assetIdSlug(file.name);
      state.assetIds.push(id);
      state.assetDrafts[id] = { id: id, label: id, mime: next.mime, dataBase64: next.dataBase64 };
      state.assetSaved[id] = null;
      onDone(id);
    });
  }
  /* One page's two shape layers, populated from every saved image, each with
     its own inline upload. Each layer can use the page's built-in behavior,
     an image, or no shape at all. */
  function buildShapePickers(pageId) {
    var box = h('fieldset', {}, h('legend', { text: 'Images' }));
    var page = state.meshDraft.pages[pageId];
    var hiddenId = 'shape-' + pageId + '-hidden';
    var hiddenBox = h('input', { id: hiddenId, type: 'checkbox' });
    hiddenBox.checked = !!page.hidden || (page.primaryMode === 'none' && page.surfaceMode === 'none');
    hiddenBox.addEventListener('change', function () {
      page.hidden = hiddenBox.checked;
      if (hiddenBox.checked) { page.primaryMode = 'none'; page.surfaceMode = 'none'; }
      else { if (page.primaryMode === 'none') page.primaryMode = page.primary ? 'image' : 'built-in'; if (page.surfaceMode === 'none') page.surfaceMode = page.surface ? 'image' : 'built-in'; }
      notifyPreviewMesh(); renderEditor(); renderList();
    });
    box.appendChild(h('div', { class: 'field field-inline' }, hiddenBox, h('label', { for: hiddenId, text: 'Hide both shapes for this page' })));
    box.appendChild(h('p', { class: 'hint', text: 'Shape 1 and Shape 2 can each use the built-in page shape, one of your images, or nothing.' }));
    ['primary', 'surface'].forEach(function (slot) {
      var id = 'shape-' + pageId + '-' + slot;
      var modeKey = slot + 'Mode';
      var modeId = id + '-mode';
      var mode = h('select', { id: modeId, onchange: function () {
        page[modeKey] = mode.value;
        page.hidden = page.primaryMode === 'none' && page.surfaceMode === 'none';
        notifyPreviewMesh(); renderEditor(); renderList();
      } });
      mode.appendChild(h('option', { value: 'built-in', text: 'Built-in shape' }));
      mode.appendChild(h('option', { value: 'image', text: 'Use image' }));
      mode.appendChild(h('option', { value: 'none', text: 'No shape' }));
      mode.value = page[modeKey] || (page[slot] ? 'image' : 'built-in');
      var select = h('select', { id: id, onchange: function () {
        page[slot] = select.value || null;
        if (select.value) page[modeKey] = 'image';
        notifyPreviewMesh(); renderEditor(); renderList();
      } });
      select.appendChild(h('option', { value: '', text: 'Choose an image' }));
      state.assetIds.forEach(function (assetId) {
        select.appendChild(h('option', { value: assetId, text: state.assetDrafts[assetId].label || assetId }));
      });
      select.value = page[slot] || '';
      var upload = h('input', { id: id + '-upload', type: 'file', accept: ArkAsset.mimeTypes.join(',') });
      upload.addEventListener('change', function () {
        var file = upload.files && upload.files[0];
        if (!file) return;
        quickAddAsset(file, function (assetId) {
          page[slot] = assetId;
          page[modeKey] = 'image';
          notifyPreviewAssets(); notifyPreviewMesh();
          renderEditor(); renderList();
          status('Added "' + assetId + '" and set it as this page’s ' + slot + ' image. Save the image and Save this page’s shapes to keep it.', 'ok');
        });
      });
      box.appendChild(h('div', { class: 'field' },
        h('label', { for: modeId, text: slot === 'primary' ? 'Shape 1' : 'Shape 2' }),
        mode,
        h('label', { for: id, class: 'hint', text: slot === 'primary' ? 'Image for Shape 1' : 'Image for Shape 2' }),
        select,
        h('label', { for: id + '-upload', class: 'hint', text: 'or upload a new image' }),
        upload));
    });
    return box;
  }
  /* This page's own size and screen position -- independent of the shared
     tuning below, since where a shape sits is a per-page layout choice, not
     a look shared by every page. Stored on meshDraft.pages[pageId] itself. */
  function buildPlacementPanel(pageId) {
    var box = h('fieldset', { class: 'relief' }, h('legend', { text: 'Size and position' }));
    box.appendChild(h('p', { class: 'hint', text: 'Where this page’s shape sits and how big it is. Shared tuning below still applies on top of this.' }));
    var fields = h('div', { class: 'relief-fields' });
    ArkMeshSettings.placementFields().forEach(function (f) {
      var id = 'place-' + pageId + '-' + f.key;
      var out = h('output', { for: id, text: String(state.meshDraft.pages[pageId][f.key]) });
      var input = h('input', { id: id, type: 'range', min: f.min, max: f.max, step: f.step, oninput: function () {
        state.meshDraft.pages[pageId][f.key] = Number(input.value);
        out.textContent = String(state.meshDraft.pages[pageId][f.key]);
        notifyPreviewMesh(); touch();
      } });
      input.value = state.meshDraft.pages[pageId][f.key];
      fields.appendChild(h('div', { class: 'relief-field' },
        h('div', { class: 'relief-field-head' }, h('label', { for: id, text: f.label }), out),
        input));
    });
    box.appendChild(fields);
    var reset = h('button', { type: 'button', class: 'btn', text: 'Reset size and position', onclick: function () {
      ArkMeshSettings.placementFields().forEach(function (f) { state.meshDraft.pages[pageId][f.key] = f.def; });
      notifyPreviewMesh(); renderEditor();
    } });
    box.appendChild(h('div', { class: 'tools' }, reset));
    return box;
  }
  function buildMeshTuningPanel() {
    var box = h('fieldset', { class: 'relief' }, h('legend', { text: 'Shared shape tuning' }));
    if (!window.ArkMeshSettings) return box;
    box.appendChild(h('p', { class: 'hint', text: 'Contrast, depth and particle count -- shared by every page’s shape images, not just this one. Drag a slider to see it change in the preview on the right; nothing is written until Save.' }));
    var fields = h('div', { class: 'relief-fields' });
    var reset = h('button', { type: 'button', class: 'btn', text: 'Reset tuning to defaults' });
    function refreshInputs() {
      fields.textContent = '';
      ArkMeshSettings.fields().forEach(function (f) {
        var id = 'relief-' + f.key;
        var out = h('output', { for: id, text: String(state.meshDraft.tuning[f.key]) });
        var input = h('input', { id: id, type: 'range', min: f.min, max: f.max, step: f.step, oninput: function () {
          state.meshDraft.tuning[f.key] = Number(input.value);
          out.textContent = String(state.meshDraft.tuning[f.key]);
          notifyPreviewMesh(); refreshSaveButton();
        } });
        input.value = state.meshDraft.tuning[f.key];
        fields.appendChild(h('div', { class: 'relief-field' },
          h('div', { class: 'relief-field-head' }, h('label', { for: id, text: f.label }), out),
          input));
      });
      refreshSaveButton();
    }
    reset.addEventListener('click', function () { state.meshDraft.tuning = ArkMeshSettings.defaults().tuning; refreshInputs(); notifyPreviewMesh(); });
    /* no Save of its own: the header's one Save (saveEverything) writes the tuning with every
       other dirty draft, so nothing is skipped because Save was pressed from this panel */
    refreshInputs();
    box.appendChild(fields);
    box.appendChild(h('div', { class: 'tools' }, reset));
    return box;
  }
  /* Only for a shape page with no manifest of its own (Demo, Lab): everything else edits its
     shapes inline on its real page (renderEditor, via hasShape/shapePageId above). */
  function renderShapeEditor() {
    var root = $('editor'); root.textContent = '';
    var id = state.shapeCurrent;
    if (!id || !window.ArkMeshSettings) { root.appendChild(h('p', { class: 'empty-state', text: 'Pick a page on the left.' })); return; }
    root.appendChild(h('div', { class: 'editor-head' },
      h('div', {}, h('h1', { text: state.shapeLabels[id] || id }), h('div', { class: 'route', text: 'js/content/mesh-settings-data.js' }))));
    root.appendChild(buildShapePickers(id));
    root.appendChild(buildPlacementPanel(id));
    root.appendChild(buildMeshTuningPanel());
  }
  A.provide({ buildPlacementPanel: buildPlacementPanel, buildShapePickers: buildShapePickers,
      reliefDirty: reliefDirty, renderShapeEditor: renderShapeEditor, saveMeshDraft: saveMeshDraft });
})();
