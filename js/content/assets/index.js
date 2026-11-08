/* The image assets, in no particular order. The admin editor (admin-app.html) rewrites this list; edit it by hand only to reorder.
   No public route shows an asset (iceberg-blocks alone is 1,985,029 bytes, measured on the home route 2026-11-08), so the tags
   are written only where an asset is read: the editor, whose tag carries data-ark-assets="all", and its canvas (?cms-preview or
   ?preview, where js/main.js matches a Media image). There each asset loads while the page is still being read, so it is
   defined before any script runs.
   An id is written into a script tag, so only a plain id (lowercase letters, digits and hyphens, starting with a letter) is loaded. */
var ArkAssetIds = ["iceberg-blocks"];
var ArkAssetsWanted = typeof document !== 'undefined' && !!document.currentScript && (document.currentScript.getAttribute('data-ark-assets') === 'all' ||
  (typeof location !== 'undefined' && /[?&](?:cms-)?preview(?:[=&]|$)/.test(location.search || '')));
ArkAssetIds.forEach(function (id) {
  if (!ArkAssetsWanted || !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id)) return;
  document.write('<script src="js/content/assets/' + id + '.js' + ArkManifestSearch + '" defer><\/script>');
});
