/* The page manifests, in display order. The admin editor (admin-app.html) rewrites this list; edit it by hand only to reorder.
   It loads each manifest while the page is still being read, so every manifest is defined before any script runs.
   An id is written into a script tag, so only a plain id (lowercase letters and digits, starting with a letter) is loaded. */
var ArkManifestIds = ["nav","home","concept","about","purpose","depth","practice","notes","studio"];
ArkManifestIds.forEach(function (id) {
  if (!/^[a-z][a-z0-9]*$/.test(id)) return;
  document.write('<script src="js/content/manifests/' + id + '.js" defer><\/script>');
});
