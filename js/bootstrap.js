/* External so script policy does not need inline execution. */
document.documentElement.classList.add('js');
// Apply the saved theme before the first paint. js/settings/panel.js (deferred)
// validates it later; without this every page first rendered, and on heavier
// routes stayed for seconds, in the default palette.
//
// Palette ids are the SDK's published names (ember, ember-light, defxn-tide, ...; see
// scripts/build-flux-themes.cjs). Stored choices come in two vocabularies, kept in SEPARATE keys
// because the old word `moss` meant Moss light while the new `defxn-moss` is Moss dark:
//   defxn-theme-v1              visitor's choice, published ids   (written by js/settings/panel.js)
//   flux-chain-theme            visitor's choice, OLD ids         (read only; never rewritten or removed)
//   defxn-theme-default-v1      site default as last seen, published ids (written by panel.js)
//   defxn-site-theme-default    site default as last seen, OLD ids (read only)
// The visitor's own choice, old or new, always beats a site default. Must stay synchronous and tiny.
(function () {
  var published = ['ember', 'ember-light', 'defxn-tide', 'defxn-tide-light', 'defxn-moss', 'defxn-moss-light', 'defxn-dune', 'defxn-dune-light', 'defxn-dusk', 'defxn-dusk-light'];
  // mirrors DEADARK_ROLE_LADDER_LEGACY_TO_PUBLISHED (@deadark/sdk/theme); tests/theme-content.cjs pins it
  var legacy = { ghost: 'ember', glacier: 'ember-light', clay: 'defxn-tide', grove: 'defxn-tide-light', ochre: 'defxn-moss', moss: 'defxn-moss-light', marine: 'defxn-dune', bone: 'defxn-dune-light', dusk: 'defxn-dusk', dawn: 'defxn-dusk-light' };
  function now(value) { return value && published.indexOf(value) >= 0 ? value : null; }
  function old(value) { return value && Object.prototype.hasOwnProperty.call(legacy, value) ? legacy[value] : null; }
  try {
    var read = function (key) { return localStorage.getItem(key); };
    var id = now(read('defxn-theme-v1')) || old(read('flux-chain-theme')) ||
      now(read('defxn-theme-default-v1')) || old(read('defxn-site-theme-default'));
    if (id) document.documentElement.dataset.theme = id;
  } catch (e) { /* storage unavailable: the default palette applies */ }
})();
