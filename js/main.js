/* =====================================================================
   BOOT
   ---------------------------------------------------------------------
   The only file that does anything when it loads; every other script
   just defines. Applies the tokens, renders the pattern, and tells the
   page it is live so the semantic fallback can step aside.

   If rendering throws, the fallback stays visible: the page degrades to
   readable text instead of a blank poster.
   ===================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var host = document.getElementById('scene');
  if (!host) return;
  // The router owns per-page reading positions. Native fragment restoration can
  // run after the first paint and clip a newly entered page's heading.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* A fixed, full-viewport layer behind everything else, for an optional admin-picked
     background style (js/ark/vendor/backgrounds.js -- design/ark-ui's generators, see
     scripts/sync-ark-backgrounds.cjs). Created once; style 'none' just leaves it empty,
     which is the site's original flat-canvas look, so this never runs when unused. */
  var backgroundHost = null, backgroundHandle = null;
  function backgroundElement() {
    if (backgroundHost) return backgroundHost;
    backgroundHost = document.createElement('div');
    backgroundHost.id = 'ark-background';
    backgroundHost.setAttribute('aria-hidden', 'true');
    backgroundHost.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none';
    document.body.insertBefore(backgroundHost, document.body.firstChild);
    return backgroundHost;
  }
  /* Exactly one background shows at a time: an admin-picked ArkBackgrounds
     style, when set, replaces the site's own flat .hero-atmosphere layer
     instead of stacking on top of it and the lattice grid. */
  function applyBackground(background) {
    if (!window.ArkBackgrounds || !background) return;
    var style = background.style;
    if (backgroundHandle) { backgroundHandle.destroy(); backgroundHandle = null; }
    if (!style || style === 'none' || !ArkBackgrounds[style]) {
      if (backgroundHost) backgroundHost.replaceChildren();
      root.classList.remove('has-ark-background');
      return;
    }
    backgroundHandle = ArkBackgrounds[style].mount(backgroundElement());
    root.classList.add('has-ark-background');
  }

  try {
    ArkUI.base(Tokens.css());
    /* A later :root rule wins by source order, so this never touches tokens.js or the
       atomizer: it just appends the saved colour overrides (js/content/theme.js), if any. */
    var theme = window.ArkTheme ? (ArkTheme.get() || ArkTheme.defaults()) : null;
    if (theme) {
      if (theme.activeTheme && !localStorage.getItem('flux-chain-theme')) root.dataset.theme = theme.activeTheme;
      ArkUI.base(ArkTheme.css());
      /* Never mount a saved ArkBackgrounds preset on the public site: it read
         as an unwanted soft atmospheric glow. The grid (css/lattice.css) is
         the one background. */
    }
    var scene = ArkUI.render(F_SCENE_RZERO_V0, host);
    ArkUI.pageRouter = ArkUI.createPageRouter({ scene: scene, state: ArkUI.sceneState });
    root.classList.add('ark-live');
    var fallback = document.getElementById('fallback');
    if (fallback) fallback.setAttribute('aria-hidden', 'true');
  } catch (err) {
    root.classList.remove('js');                  /* reveal the fallback */
    if (window.console) console.error('[ark] scene failed to render', err);
  }

  /* The admin preview iframe posts an unsaved theme edit here so it shows its effect
     before Save writes anything -- same origin only (preview and admin are always the
     same host). Appending another colour override sheet keeps that half additive and
     reversible: each edit just wins over the last by source order, same as the saved
     one above. The background style is swapped outright, since only one can show. */
  window.addEventListener('message', function (event) {
    if (event.origin !== location.origin) return;
    var data = event.data;
    if (!data || typeof data !== 'object' || data.type !== 'flux-chain-preview-theme' || !data.theme) return;
    if (!window.ArkTheme) return;
    if (data.theme.activeTheme) root.dataset.theme = data.theme.activeTheme;
    ArkUI.base(ArkTheme.css(data.theme));
    if (data.theme.background) applyBackground(data.theme.background);
  });
})();
