/* The page manifests, in display order. The admin editor (admin-app.html) rewrites this list; edit it by hand only to reorder.
   It loads each manifest while the page is still being read, so every manifest is defined before any script runs.
   An id is written into a script tag, so only a plain id (lowercase letters and digits, starting with a letter) is loaded.
   On a public page the manifests ride in the shell chunk (scripts/build-shell.cjs bundles the files this list names) and the page's
   tag says so with &bundled=1: then nothing is written. The editor, and its canvas (?cms-preview or ?preview), load each file fresh. */
var ArkManifestIds = ["nav","home","worldchain","worldidentity","worldmeasure","worldstats","worldworks","worldminute","chain","resolver","resolvermath","references","deployment","concept","about","resolutions","purpose","depth","practice","notes","studio","spec","download","bundledeployer","deploy","dao"];
var ArkManifestVersion = document.currentScript && document.currentScript.src.match(/[?&]v=([a-z0-9_-]+)/i);
var ArkManifestSearch = ArkManifestVersion ? '?v=' + ArkManifestVersion[1] : '';
var ArkManifestsBundled = !!document.currentScript && /[?&]bundled=1(?:&|$)/.test(document.currentScript.src || '') &&
  !(typeof location !== 'undefined' && /[?&](?:cms-)?preview(?:[=&]|$)/.test(location.search || ''));
ArkManifestIds.forEach(function (id) {
  if (ArkManifestsBundled || !/^[a-z][a-z0-9]*$/.test(id)) return;
  document.write('<script src="js/content/manifests/' + id + '.js' + ArkManifestSearch + '" defer><\/script>');
});
