/* External so script policy does not need inline execution. */
document.documentElement.classList.add('js');
// Apply the saved theme before the first paint. js/settings/panel.js (deferred)
// validates it later; without this every page first rendered, and on heavier
// routes stayed for seconds, in the default palette.
(function () {
  var themes = ['ghost', 'glacier', 'clay', 'grove', 'ochre', 'moss', 'marine', 'bone', 'dusk', 'dawn'];
  try {
    var saved = localStorage.getItem('flux-chain-theme');
    if (saved && themes.indexOf(saved) >= 0) document.documentElement.dataset.theme = saved;
  } catch (e) { /* storage unavailable: the default palette applies */ }
})();
