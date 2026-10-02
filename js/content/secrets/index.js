/* The encrypted content items, in no particular order. The admin editor (admin-app.html) rewrites this list; edit it by hand only to reorder.
   It loads each secret while the page is still being read, so every secret is defined before any script runs.
   An id is written into a script tag, so only a plain id (lowercase letters, digits and hyphens, starting with a letter) is loaded. */
var ArkSecretIds = [];
ArkSecretIds.forEach(function (id) {
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id)) return;
  document.write('<script src="js/content/secrets/' + id + '.js' + ArkManifestSearch + '" defer><\/script>');
});
