/* The image assets, in no particular order. The admin editor (admin-app.html) rewrites this list; edit it by hand only to reorder.
   It loads each asset while the page is still being read, so every asset is defined before any script runs.
   An id is written into a script tag, so only a plain id (lowercase letters, digits and hyphens, starting with a letter) is loaded. */
var ArkAssetIds = ["iceberg-blocks"];
ArkAssetIds.forEach(function (id) {
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id)) return;
  document.write('<script src="js/content/assets/' + id + '.js" defer><\/script>');
});
