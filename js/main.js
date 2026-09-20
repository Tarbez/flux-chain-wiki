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

  try {
    ArkUI.base(Tokens.css());
    var scene = ArkUI.render(F_SCENE_RZERO_V0, host);
    ArkUI.pageRouter = ArkUI.createPageRouter({ scene: scene, state: ArkUI.sceneState });
    root.classList.add('ark-live');
    var fallback = document.getElementById('fallback');
    if (fallback) fallback.setAttribute('aria-hidden', 'true');
  } catch (err) {
    root.classList.remove('js');                  /* reveal the fallback */
    if (window.console) console.error('[ark] scene failed to render', err);
  }
})();
