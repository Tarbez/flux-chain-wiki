/* =====================================================================
   ADMIN STORE
   ---------------------------------------------------------------------
   Writes page manifests into the project through a directory handle from
   the browser's File System Access API. It takes the handle as a
   parameter and touches nothing else, so a test can hand it a fake one.

   The files it writes are the same bytes ArkManifest.serialize and
   LearningContent.serializeBody/serializeIndex produce, so a page or an
   article saved here and one edited by hand are indistinguishable.
   ===================================================================== */
var ArkAdminStore = (function () {
  'use strict';

  /* The list the site loads its manifests from, in display order. */
  function indexText(ids) {
    return '/* The page manifests, in display order. The admin editor (admin-app.html) rewrites this list; edit it by hand only to reorder.\n' +
      '   It loads each manifest while the page is still being read, so every manifest is defined before any script runs.\n' +
      '   An id is written into a script tag, so only a plain id (lowercase letters and digits, starting with a letter) is loaded. */\n' +
      'var ArkManifestIds = ' + JSON.stringify(ids) + ';\n' +
      'ArkManifestIds.forEach(function (id) {\n' +
      '  if (!/^[a-z][a-z0-9]*$/.test(id)) return;\n' +
      '  document.write(\'<script src="js/content/manifests/\' + id + \'.js" defer><\\/script>\');\n' +
      '});\n';
  }

  /* project folder -> js/content/manifests, refusing a folder that is not the project */
  async function manifestsDir(root) {
    try {
      await root.getFileHandle('index.html');
      var content = await (await root.getDirectoryHandle('js')).getDirectoryHandle('content');
      return await content.getDirectoryHandle('manifests', { create: true });
    } catch (e) {
      throw new Error('That folder is not the Flux Chain project. Pick the folder that contains index.html and js/content.');
    }
  }

  /* project folder -> { content: js/content, articles: js/content/articles }, refusing a folder that is not the project */
  async function contentDirs(root) {
    try {
      await root.getFileHandle('index.html');
      var content = await (await root.getDirectoryHandle('js')).getDirectoryHandle('content');
      return { content: content, articles: await content.getDirectoryHandle('articles', { create: true }) };
    } catch (e) {
      throw new Error('That folder is not the Flux Chain project. Pick the folder that contains index.html and js/content.');
    }
  }

  /* project folder -> js/content/assets, refusing a folder that is not the project */
  async function assetsDir(root) {
    try {
      await root.getFileHandle('index.html');
      var content = await (await root.getDirectoryHandle('js')).getDirectoryHandle('content');
      return await content.getDirectoryHandle('assets', { create: true });
    } catch (e) {
      throw new Error('That folder is not the Flux Chain project. Pick the folder that contains index.html and js/content.');
    }
  }

  /* The list the site loads its image assets from. */
  function indexTextAssets(ids) {
    return '/* The image assets, in no particular order. The admin editor (admin-app.html) rewrites this list; edit it by hand only to reorder.\n' +
      '   It loads each asset while the page is still being read, so every asset is defined before any script runs.\n' +
      '   An id is written into a script tag, so only a plain id (lowercase letters, digits and hyphens, starting with a letter) is loaded. */\n' +
      'var ArkAssetIds = ' + JSON.stringify(ids) + ';\n' +
      'ArkAssetIds.forEach(function (id) {\n' +
      '  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id)) return;\n' +
      '  document.write(\'<script src="js/content/assets/\' + id + \'.js" defer><\\/script>\');\n' +
      '});\n';
  }

  /* `ids` is the full display order, including an asset that is being created */
  async function saveAsset(dir, asset, ids) {
    await write(dir, asset.id + '.js', ArkAsset.serialize(asset));
    await write(dir, 'index.js', indexTextAssets(ids));
  }

  async function removeAsset(dir, id, ids) {
    await dir.removeEntry(id + '.js');
    await write(dir, 'index.js', indexTextAssets(ids.filter(function (other) { return other !== id; })));
  }

  /* project folder -> js/content/secrets, refusing a folder that is not the project */
  async function secretsDir(root) {
    try {
      await root.getFileHandle('index.html');
      var content = await (await root.getDirectoryHandle('js')).getDirectoryHandle('content');
      return await content.getDirectoryHandle('secrets', { create: true });
    } catch (e) {
      throw new Error('That folder is not the Flux Chain project. Pick the folder that contains index.html and js/content.');
    }
  }

  /* The list the site loads its encrypted content from. */
  function indexTextSecrets(ids) {
    return '/* The encrypted content items, in no particular order. The admin editor (admin-app.html) rewrites this list; edit it by hand only to reorder.\n' +
      '   It loads each secret while the page is still being read, so every secret is defined before any script runs.\n' +
      '   An id is written into a script tag, so only a plain id (lowercase letters, digits and hyphens, starting with a letter) is loaded. */\n' +
      'var ArkSecretIds = ' + JSON.stringify(ids) + ';\n' +
      'ArkSecretIds.forEach(function (id) {\n' +
      '  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id)) return;\n' +
      '  document.write(\'<script src="js/content/secrets/\' + id + \'.js" defer><\\/script>\');\n' +
      '});\n';
  }

  /* `ids` is the full display order, including a secret that is being created */
  async function saveSecret(dir, secret, ids) {
    await write(dir, secret.id + '.js', ArkSecret.serialize(secret));
    await write(dir, 'index.js', indexTextSecrets(ids));
  }

  async function removeSecret(dir, id, ids) {
    await dir.removeEntry(id + '.js');
    await write(dir, 'index.js', indexTextSecrets(ids.filter(function (other) { return other !== id; })));
  }

  async function write(dir, name, text) {
    var handle = await dir.getFileHandle(name, { create: true });
    var out = await handle.createWritable();
    await out.write(text);
    await out.close();
  }

  /* `ids` is the full display order, including a page that is being created */
  async function save(dir, manifest, ids) {
    await write(dir, manifest.id + '.js', ArkManifest.serialize(manifest));
    await write(dir, 'index.js', indexText(ids));
  }

  async function remove(dir, id, ids) {
    await dir.removeEntry(id + '.js');
    await write(dir, 'index.js', indexText(ids.filter(function (other) { return other !== id; })));
  }

  /* `list` is every saved article in reading order, including the one being written */
  async function saveArticle(dirs, article, list) {
    await write(dirs.articles, article.slug + '.js', LearningContent.serializeBody(article));
    await write(dirs.content, 'article-index.js', LearningContent.serializeIndex(list));
  }

  async function removeArticle(dirs, slug, list) {
    await dirs.articles.removeEntry(slug + '.js');
    await write(dirs.content, 'article-index.js', LearningContent.serializeIndex(list));
  }

  /* the concept page's iceberg relief tuning is a single file, not a list: no index needed. */
  async function saveMeshSettings(contentDir, params) {
    await write(contentDir, 'mesh-settings-data.js', ArkMeshSettings.serialize(params));
  }

  /* the colour theme is a single file too, same as mesh settings. */
  async function saveTheme(contentDir, whole) {
    await write(contentDir, 'theme-data.js', ArkTheme.serialize(whole));
  }

  /* the SEO settings are a single file too, same as mesh settings and the theme. */
  async function saveSeo(contentDir, whole) {
    await write(contentDir, 'seo-data.js', ArkSEO.serialize(whole));
  }

  return { indexText: indexText, manifestsDir: manifestsDir, save: save, remove: remove,
           contentDirs: contentDirs, saveArticle: saveArticle, removeArticle: removeArticle,
           assetsDir: assetsDir, indexTextAssets: indexTextAssets, saveAsset: saveAsset, removeAsset: removeAsset,
           secretsDir: secretsDir, indexTextSecrets: indexTextSecrets, saveSecret: saveSecret, removeSecret: removeSecret,
           saveMeshSettings: saveMeshSettings, saveTheme: saveTheme, saveSeo: saveSeo };
})();
