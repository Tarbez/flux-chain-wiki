/* External so script policy does not need inline execution. */
document.documentElement.classList.add('js');
// Apply the saved theme before the first paint. js/settings/panel.js (deferred)
// validates it later; without this every page first rendered, and on heavier
// routes stayed for seconds, in the default palette.
(function () {
  var themes = ['ghost', 'glacier', 'clay', 'grove', 'ochre', 'moss', 'marine', 'bone', 'dusk', 'dawn'];
  try {
    // the visitor's own choice, else the site default as this browser last saw it (both written
    // only by js/settings/panel.js, the one owner of data-theme -- see applyTheme there)
    var saved = localStorage.getItem('flux-chain-theme') || localStorage.getItem('defxn-site-theme-default');
    if (saved && themes.indexOf(saved) >= 0) document.documentElement.dataset.theme = saved;
  } catch (e) { /* storage unavailable: the default palette applies */ }
})();
