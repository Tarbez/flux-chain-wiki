/* =====================================================================
   ADMIN EDITOR · THEME & DEFAULTS (js/admin/design.js)
   ---------------------------------------------------------------------
   Owns: Design mode's Theme & defaults view -- the colour theme, background and
   settings-gear defaults panels, their save functions (called by saveEverything) and
   Revert -- and the message that shows a defaults edit in both previews at once (a theme
   edit goes through notifyPreviewTheme, js/admin/preview.js).
   Must not: hold its drafts itself (state.themeDraft / state.settingsDefaultsDraft,
   js/admin/state.js), or save outside saveEverything().
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, status = A.status, download = A.download, refreshList = A.refreshList, $ = A.$,
      h = A.h, refuse = A.refuse, touch = A.touch, paintInto = A.paintInto, repaintPanels = A.repaintPanels;
  /* defined by files loaded after this one: resolved when called (the canvas feed is the
     bridge's, js/admin/bridge.js, which loads after this file) */
  var buildSiteSeoPanel = A.later('buildSiteSeoPanel'), notifyPreviewTheme = A.later('notifyPreviewTheme'),
      reloadPreview = A.later('reloadPreview'), setView = A.later('setView');

  function themeDirty() { return !window.ArkTheme || JSON.stringify(ArkTheme.sanitize(state.themeDraft)) !== state.themeSaved; }
  async function saveThemeDraft(button) {
    try {
      if (state.cdirs) {
        await ArkAdminStore.saveTheme(state.cdirs.content, state.themeDraft);
        status('Saved js/content/theme-data.js', 'ok');
      } else {
        download('theme-data.js', ArkTheme.serialize(state.themeDraft));
        status('Downloaded theme-data.js. Put it in js/content/, or connect the project folder to save directly.', 'warn');
      }
    /* Step 5: re-throws (instead of swallowing and returning) now that saveEverything() is
       this function's only caller -- its own attempt() wrapper needs the rejection to report
       this draft as failed instead of silently treating it as succeeded. */
    } catch (error) { status(error.message, 'error'); throw error; }
    state.themeDraft = ArkTheme.sanitize(state.themeDraft);
    state.themeSaved = JSON.stringify(state.themeDraft);
    ArkTheme.define(state.themeDraft);
    if (button) button.disabled = true;
    refreshList();
  }
  /* Same idea again, for the settings-gear's site-wide defaults (js/content/
     settings-defaults.js; the draft is state.settingsDefaultsDraft): what a first-time visitor sees before they ever touch the
     gear. They reach a running preview the way theme/mesh do, by message: the full
     defxn-cms-preview-state (siteFromState() carries settingsDefaults) and, for a
     single edit, the lighter defxn-cms-preview-site-defaults below. js/main.js
     re-defines ArkSiteDefaults from either and fires 'ark-site-defaults-preview', which
     the settings panel (scripts/settings-entry.js -> js/settings/panel.js) answers by
     showing what an unconfigured visitor lands on -- writing nothing to localStorage.
     (This replaced writing the draft into the visitor's own localStorage keys before a
     reload: on the shared origin that turned every preview into the owner's own stored
     "choice", which then hid every later site default from the owner's browser.) */
  var settingsDefaultsReloadTimer = 0;
  function settingsDefaultsDirty() { return !window.ArkSiteDefaults || JSON.stringify(ArkSiteDefaults.sanitize(state.settingsDefaultsDraft)) !== state.settingsDefaultsSaved; }
  function notifyPreviewSettingsDefaults() {
    if (!window.ArkSiteDefaults || state.versionPreviewSite) return; /* a previewed version keeps showing its own defaults */
    var message = { type: 'defxn-cms-preview-site-defaults', settingsDefaults: ArkSiteDefaults.sanitize(state.settingsDefaultsDraft) };
    /* the one canvas (Content mode's own #frame is gone) */
    var win = $('cmsPreview') && $('cmsPreview').contentWindow;
    if (win) try { win.postMessage(message, window.location.origin); } catch (error) { /* between routes; the frame's load handler sends the full state */ }
  }
  async function saveSettingsDefaultsDraft(button) {
    try {
      if (state.cdirs) {
        await ArkAdminStore.saveSettingsDefaults(state.cdirs.content, state.settingsDefaultsDraft);
        status('Saved js/content/settings-defaults-data.js', 'ok');
      } else {
        download('settings-defaults-data.js', ArkSiteDefaults.serialize(state.settingsDefaultsDraft));
        status('Downloaded settings-defaults-data.js. Put it in js/content/, or connect the project folder to save directly.', 'warn');
      }
    /* Step 5: re-throws now that saveEverything() is this function's only caller -- see
       saveThemeDraft's matching comment above. */
    } catch (error) { status(error.message, 'error'); throw error; }
    state.settingsDefaultsDraft = ArkSiteDefaults.sanitize(state.settingsDefaultsDraft);
    state.settingsDefaultsSaved = JSON.stringify(state.settingsDefaultsDraft);
    ArkSiteDefaults.define(state.settingsDefaultsDraft);
    if (button) button.disabled = true;
    refreshList();
  }
  function revertDesign() {
    state.themeDraft = (window.ArkTheme && (ArkTheme.get() || ArkTheme.defaults())) || {};
    state.settingsDefaultsDraft = (window.ArkSiteDefaults && (ArkSiteDefaults.get() || ArkSiteDefaults.defaults())) || {};
    notifyPreviewTheme();
    clearTimeout(settingsDefaultsReloadTimer);
    reloadPreview();
    repaintPanels('design');
    touch();
    status('Reverted global design config.', '');
  }
  /* Theme & defaults is the Theme view, docked beside the live canvas (js/admin/sitemap.js setView) */
  function selectDesign() { setView('theme'); }
  /* A small live thumbnail of a background style, mounted right in the admin (not just the
     iframe): design/ark-ui's generators are pure DOM/SVG/canvas, so this is the same
     ArkBackgrounds.<key>.mount() the public site uses, just in a small fixed box. */
  function backgroundThumb(key) {
    var box = h('div', { class: 'bg-thumb' });
    if (window.ArkBackgrounds && ArkBackgrounds[key]) {
      try { ArkBackgrounds[key].mount(box); } catch (error) { box.appendChild(h('span', { class: 'bg-thumb-fallback', text: key })); }
    } else box.appendChild(h('span', { class: 'bg-thumb-fallback', text: key }));
    return box;
  }

  function buildDesignPanel(options) {
    options = options || {};
    var wrap = h('div', { class: 'page-law-panel' });
    if (!window.ArkTheme) { wrap.appendChild(h('p', { class: 'empty-state', text: 'Theme editing is unavailable on this page.' })); return wrap; }
    state.themeDraft = ArkTheme.sanitize(state.themeDraft);
    var active = state.themeDraft.activeTheme || 'ghost';
    var colorsBox = h('fieldset', { class: 'relief theme-core' }, h('legend', { text: 'Theme core' }));
    colorsBox.appendChild(h('p', { class: 'hint', text: 'Pick a theme and edit the actual core colours the site uses: canvas, surfaces, text, primary, complement and accent.' }));
    var themeSelect = h('select', { id: 'theme-active' });
    ArkTheme.themeOptions().forEach(function (theme) {
      themeSelect.appendChild(h('option', { value: theme.key, selected: theme.key === active, text: theme.label }));
    });
    var colorFields = h('div', { class: 'theme-fields' });
    function hslToHex(value) {
      var match = String(value || '').match(/^\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
      if (!match) return '#000000';
      var h0 = Number(match[1]) / 360, s = Number(match[2]) / 100, l = Number(match[3]) / 100;
      function hue(p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; }
      var q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
      var rgb = s === 0 ? [l, l, l] : [hue(p, q, h0 + 1 / 3), hue(p, q, h0), hue(p, q, h0 - 1 / 3)];
      return '#' + rgb.map(function (v) { return Math.round(v * 255).toString(16).padStart(2, '0'); }).join('');
    }
    function hexToHsl(hex) {
      var n = parseInt(hex.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
      var max = Math.max(r, g, b), min = Math.min(r, g, b), h0 = 0, s = 0, l = (max + min) / 2, d = max - min;
      if (d) {
        s = l > .5 ? d / (2 - max - min) : d / (max + min);
        h0 = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
        h0 /= 6;
      }
      return Math.round(h0 * 360) + ' ' + Math.round(s * 100) + '% ' + Math.round(l * 100) + '%';
    }
    function computedThemeValue(theme, key) {
      var old = document.documentElement.getAttribute('data-theme');
      document.documentElement.setAttribute('data-theme', theme);
      var value = getComputedStyle(document.documentElement).getPropertyValue('--' + key).trim();
      if (old) document.documentElement.setAttribute('data-theme', old); else document.documentElement.removeAttribute('data-theme');
      return value;
    }
    function themeValue(theme, key) {
      return state.themeDraft.themes && state.themeDraft.themes[theme] && state.themeDraft.themes[theme][key] ? state.themeDraft.themes[theme][key] : computedThemeValue(theme, key);
    }
    function setThemeValue(theme, key, value) {
      if (!state.themeDraft.themes) state.themeDraft.themes = {};
      if (!state.themeDraft.themes[theme]) state.themeDraft.themes[theme] = {};
      state.themeDraft.themes[theme][key] = value;
    }
    function refreshColors() {
      active = state.themeDraft.activeTheme || active;
      colorFields.textContent = '';
      ArkTheme.semanticFields().forEach(function (f) {
        var id = 'semantic-' + active + '-' + f.key;
        var inherited = computedThemeValue(active, f.key);
        var current = themeValue(active, f.key);
        var swatch = h('input', { id: id, type: 'color', value: hslToHex(current) });
        var out = h('output', { text: current });
        var ALREADY_DEFAULT = 'Already this theme\u2019s default colour.';
        swatch.addEventListener('input', function () {
          var next = hexToHsl(swatch.value);
          setThemeValue(active, f.key, next);
          out.textContent = next;
          refuse(resetOne, '');
          notifyPreviewTheme(); touch();
        });
        var resetOne = h('button', { type: 'button', class: 'btn tiny', text: 'Default', onclick: function () {
          if (state.themeDraft.themes && state.themeDraft.themes[active]) delete state.themeDraft.themes[active][f.key];
          swatch.value = hslToHex(inherited); out.textContent = inherited; refuse(resetOne, ALREADY_DEFAULT);
          notifyPreviewTheme(); touch();
        } });
        refuse(resetOne, current === inherited ? ALREADY_DEFAULT : '');
        colorFields.appendChild(h('div', { class: 'theme-field' },
          h('div', { class: 'theme-field-head' }, h('label', { for: id, text: f.label }), resetOne),
          h('div', { class: 'theme-color-row' }, swatch, out)));
      });
    }
    themeSelect.addEventListener('change', function () {
      state.themeDraft.activeTheme = themeSelect.value;
      active = themeSelect.value;
      refreshColors(); notifyPreviewTheme(); touch();
    });
    colorsBox.appendChild(h('div', { class: 'theme-select-row' }, h('label', { for: 'theme-active', text: 'Editing theme' }), themeSelect));
    colorsBox.appendChild(colorFields);

    var bgBox = h('fieldset', { class: 'relief' }, h('legend', { text: 'Background' }));
    bgBox.appendChild(h('p', { class: 'hint', text: 'A layer behind every page (js/ark/vendor/backgrounds.js). None keeps the flat canvas colour.' }));
    var bgGrid = h('div', { class: 'bg-grid' });
    function refreshBackground() {
      bgGrid.textContent = '';
      ArkTheme.backgroundStyles().forEach(function (s) {
        var id = 'bg-' + s.key;
        var picked = state.themeDraft.background.style === s.key;
        var radio = h('input', { id: id, type: 'radio', name: 'bg-style', checked: picked });
        radio.addEventListener('change', function () {
          state.themeDraft.background = { style: s.key };
          notifyPreviewTheme(); touch(); refreshBackground();
        });
        var card = h('label', { for: id, class: 'bg-card' + (picked ? ' picked' : '') },
          radio, s.key === 'none' ? h('div', { class: 'bg-thumb bg-thumb-none' }) : backgroundThumb(s.key),
          h('span', { text: s.label }));
        bgGrid.appendChild(card);
      });
    }
    bgBox.appendChild(bgGrid);

    function refreshAll() { refreshColors(); refreshBackground(); touch(); }
    var removeBg = h('button', { type: 'button', class: 'btn', text: 'Remove background layer', onclick: function () { state.themeDraft.background = { style: 'none' }; refreshAll(); notifyPreviewTheme(); } });
    var removeTheme = h('button', { type: 'button', class: 'btn', text: 'Remove this theme override', onclick: function () { if (state.themeDraft.themes) delete state.themeDraft.themes[active]; refreshAll(); notifyPreviewTheme(); } });
    var removeAllThemes = h('button', { type: 'button', class: 'btn', text: 'Remove all theme overrides', onclick: function () { state.themeDraft.themes = {}; refreshAll(); notifyPreviewTheme(); } });
    var reset = h('button', { type: 'button', class: 'btn', text: 'Reset design to defaults', onclick: function () { state.themeDraft = ArkTheme.defaults(); refreshAll(); notifyPreviewTheme(); } });
    refreshAll();
    wrap.appendChild(colorsBox);
    wrap.appendChild(bgBox);
    wrap.appendChild(h('div', { class: 'tools' }, removeBg, removeTheme, removeAllThemes, reset));
    return wrap;
  }

  /* Site-wide settings-gear defaults (js/content/settings-defaults.js): what a
     first-time visitor sees before they ever touch the gear (theme + brand-mesh motif
     + its per-motif pattern config). Sits alongside buildDesignPanel's own colour/
     background editing -- same Design kind, same Save/Revert -- since it is the
     closer analog to ArkMeshSettings (site-wide, not per-page) than to ArkTheme's own
     mechanism, which this deliberately does NOT share state with. */
  function buildSettingsDefaultsPanel() {
    var wrap = h('fieldset', { class: 'relief' }, h('legend', { text: 'Settings-gear defaults' }));
    if (!window.ArkSiteDefaults) { wrap.appendChild(h('p', { class: 'empty-state', text: 'Settings-gear defaults editing is unavailable on this page.' })); return wrap; }
    state.settingsDefaultsDraft = ArkSiteDefaults.sanitize(state.settingsDefaultsDraft);
    wrap.appendChild(h('p', { class: 'hint', text: 'What a first-time visitor sees before they ever touch the settings gear (⚙) -- their own later choice, saved to their own browser, always wins over this.' }));

    var themeSelect = h('select', { id: 'defaults-theme' });
    ArkSiteDefaults.themeOptions().forEach(function (key) {
      themeSelect.appendChild(h('option', { value: key, selected: key === state.settingsDefaultsDraft.theme, text: key }));
    });
    themeSelect.addEventListener('change', function () {
      state.settingsDefaultsDraft.theme = themeSelect.value;
      notifyPreviewSettingsDefaults(); touch();
    });
    wrap.appendChild(h('div', { class: 'theme-select-row' }, h('label', { for: 'defaults-theme', text: 'Default theme' }), themeSelect));

    var motifSelect = h('select', { id: 'defaults-motif' });
    ArkSiteDefaults.motifs().forEach(function (key) {
      motifSelect.appendChild(h('option', { value: key, selected: key === state.settingsDefaultsDraft.motif, text: key }));
    });
    motifSelect.addEventListener('change', function () {
      state.settingsDefaultsDraft.motif = motifSelect.value;
      notifyPreviewSettingsDefaults(); touch();
    });
    wrap.appendChild(h('div', { class: 'theme-select-row' }, h('label', { for: 'defaults-motif', text: 'Default pattern' }), motifSelect));

    var editingSelect = h('select', { id: 'defaults-editing-motif' });
    ArkSiteDefaults.motifs().forEach(function (key) {
      editingSelect.appendChild(h('option', { value: key, selected: key === state.settingsDefaultsDraft.motif, text: key }));
    });
    wrap.appendChild(h('div', { class: 'theme-select-row' }, h('label', { for: 'defaults-editing-motif', text: 'Editing pattern config for' }), editingSelect));

    var controls = ArkSiteDefaults.controls();
    var fields = h('div', { class: 'relief-fields' });
    function refreshFields() {
      fields.textContent = '';
      var motif = editingSelect.value;
      var row = state.settingsDefaultsDraft.patternConfig[motif];
      Object.keys(controls).forEach(function (key) {
        var c = controls[key], id = 'defaults-' + motif + '-' + key;
        var out = h('output', { for: id, text: String(row[key]) });
        var input = h('input', { id: id, type: 'range', min: c.min, max: c.max, step: key === 'delay' ? .1 : 1, oninput: function () {
          var value = Number(input.value);
          if (!Number.isFinite(value)) return;
          row[key] = Math.max(c.min, Math.min(c.max, value));
          out.textContent = String(row[key]);
          notifyPreviewSettingsDefaults(); touch();
        } });
        input.value = row[key];
        fields.appendChild(h('div', { class: 'relief-field' },
          h('div', { class: 'relief-field-head' }, h('label', { for: id, text: key }), out),
          input));
      });
      var animateId = 'defaults-' + motif + '-animated';
      var animate = h('input', { id: animateId, type: 'checkbox', checked: row.animated, onchange: function () {
        row.animated = animate.checked;
        notifyPreviewSettingsDefaults(); touch();
      } });
      fields.appendChild(h('div', { class: 'relief-field' }, h('label', { for: animateId, text: 'Animate by default' }), animate));
    }
    editingSelect.addEventListener('change', refreshFields);
    refreshFields();
    wrap.appendChild(fields);

    var reset = h('button', { type: 'button', class: 'btn', text: 'Reset settings-gear defaults', onclick: function () {
      state.settingsDefaultsDraft = ArkSiteDefaults.defaults();
      themeSelect.value = state.settingsDefaultsDraft.theme;
      motifSelect.value = state.settingsDefaultsDraft.motif;
      editingSelect.value = state.settingsDefaultsDraft.motif;
      refreshFields();
      notifyPreviewSettingsDefaults(); touch();
    } });
    wrap.appendChild(h('div', { class: 'tools' }, reset));
    return wrap;
  }

  /* renderDesignEditor(container) -- also provided as renderThemePanel: Theme & defaults (the
     colour theme, the background, the settings-gear defaults, the site-wide SEO), drawn into
     whatever container the shell's Theme view gives it, with its Revert. A revert or a reset
     redraws every mounted copy (repaintPanels('design')). Returns the container. */
  function renderDesignEditor(container) {
    var record = { kind: 'design', repaint: function () { renderDesignEditor(container); } };
    paintInto(container, record, function (root) {
      root.classList.add('cms-form', 'cms-theme');
      var revert = h('button', { type: 'button', class: 'btn', text: 'Revert', 'data-revert': 'design:', onclick: revertDesign });
      root.appendChild(h('div', { class: 'cms-form-head' },
        h('div', {}, h('h2', { text: 'Theme & defaults' }), h('div', { class: 'route', text: 'Site-wide · theme-data.js · settings-defaults-data.js · seo-data.js' })),
        h('div', { class: 'editor-actions' }, revert)));
      root.appendChild(buildDesignPanel());
      root.appendChild(buildSettingsDefaultsPanel());
      root.appendChild(buildSiteSeoPanel());
    });
    return container;
  }
  A.provide({ renderDesignEditor: renderDesignEditor, renderThemePanel: renderDesignEditor, revertDesign: revertDesign,
      saveSettingsDefaultsDraft: saveSettingsDefaultsDraft, saveThemeDraft: saveThemeDraft,
      selectDesign: selectDesign, settingsDefaultsDirty: settingsDefaultsDirty, themeDirty: themeDirty });
})();
