/* The page manifests, in display order. The admin editor (admin-app.html) rewrites this list; edit it by hand only to reorder.
   It loads each manifest while the page is still being read, so every manifest is defined before any script runs.
   An id is written into a script tag, so only a plain id (lowercase letters and digits, starting with a letter) is loaded. */
var ArkManifestIds = ["nav","home","resolver","references","deployment","concept","about","resolutions","purpose","depth","practice","notes","studio","spec","download","bundledeployer","deploy","dao"];
var ArkManifestVersion = document.currentScript && document.currentScript.src.match(/[?&]v=([a-z0-9_-]+)/i);
var ArkManifestSearch = ArkManifestVersion ? '?v=' + ArkManifestVersion[1] : '';
ArkManifestIds.forEach(function (id) {
  if (!/^[a-z][a-z0-9]*$/.test(id)) return;
  document.write('<script src="js/content/manifests/' + id + '.js' + ArkManifestSearch + '" defer><\/script>');
});
