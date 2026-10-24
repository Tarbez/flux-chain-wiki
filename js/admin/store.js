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

  /* THE DRAFTS: the one list of everything the editor saves, in save order. Save
     (admin.js saveEverything/anyDirty/siteFromState), Publish (scripts/lib/site-bundle.mjs:
     the .flx archive's routes, its reader, and the project files a pull writes) and the
     version history all derive their draft set from this list, so a new draft is either
     here -- and then saved, published, pulled and versioned -- or nowhere.
     Why it exists: Save wrote 13 drafts while the publish archive, built from its own hand
     list, carried 8 of them; settings-defaults, components, states, canvas transitions and
     element motion worked in the editor and on a local Save but never reached the mesh.
       key     the site object's key (siteFromState(), readProject(), decodeSite())
       kind    'items': one file per id under js/content/<dir>/ plus an index;
               'single': one object in js/content/<file>-data.js, serialized by
               <global>.serialize() and read back by <global>.get()
       global  the content module that validates/serializes it
       label   what a Save/validation message calls it
       title   the archive route's title (single only; the four older titles are kept so an
               unchanged older draft encodes to the same route as before)
       needs   scripts the module needs loaded before it (single only)
       byItem  (single only) the maps in it keyed by a page id or article slug, by the items
               draft that owns the key: { manifests: 'pages' } means value.pages[<page id>]
       byRoute (single only) the maps in it keyed by a route path ('/concept', ...)
     byItem/byRoute are what a Delete prunes (forgetItem below): a deleted page left its SEO
     entry behind, so the SEO draft showed unsaved until the next Save and the entry outlived
     the page on disk (regression: tests/delete-prunes-drafts.cjs). A draft that keys anything
     by page or route says so HERE, and Delete reaches it with no list of its own. */
  var DRAFTS = [
    { key: 'manifests', kind: 'items', global: 'ArkManifest', label: 'Page', dir: 'manifests' },
    { key: 'articles', kind: 'items', global: 'LearningContent', label: 'Article', dir: 'articles' },
    { key: 'assets', kind: 'items', global: 'ArkAsset', label: 'Image', dir: 'assets' },
    { key: 'secrets', kind: 'items', global: 'ArkSecret', label: 'Private item', dir: 'secrets' },
    { key: 'meshSettings', kind: 'single', global: 'ArkMeshSettings', label: 'Page shapes', file: 'mesh-settings', title: 'Mesh tuning' },
    { key: 'theme', kind: 'single', global: 'ArkTheme', label: 'Theme', file: 'theme', title: 'Colour theme', needs: ['js/tokens.js', 'js/ark/vendor/backgrounds.js'] },
    { key: 'settingsDefaults', kind: 'single', global: 'ArkSiteDefaults', label: 'Site-wide defaults', file: 'settings-defaults', title: 'Site-wide settings defaults' },
    { key: 'seo', kind: 'single', global: 'ArkSEO', label: 'SEO', file: 'seo', title: 'SEO', needs: ['js/content/site-pages.js'], byItem: { manifests: 'pages', articles: 'articles' } },
    { key: 'layout', kind: 'single', global: 'ArkLayout', label: 'Layout', file: 'layout', title: 'Responsive layout', byRoute: ['routes', 'groups', 'labels', 'alts'] },
    { key: 'components', kind: 'single', global: 'ArkComponents', label: 'Components', file: 'components', title: 'Components', byRoute: ['routes', 'spots'] },
    { key: 'states', kind: 'single', global: 'ArkStates', label: 'States', file: 'states', title: 'State groups', byRoute: ['routes'] },
    { key: 'canvasTransitions', kind: 'single', global: 'ArkCanvasTransitions', label: 'Page transition', file: 'canvas-transitions', title: 'Canvas transitions' },
    { key: 'elementMotion', kind: 'single', global: 'ArkElementMotion', label: 'Element animation', file: 'element-motion', title: 'Element animation', byRoute: ['routes'] },
    { key: 'world', kind: 'single', global: 'ArkWorld', label: 'World', file: 'world', title: '3D world', needs: ['js/vendor/flx-state-grammar.js'], byRoute: ['views', 'exits'] },
    { key: 'skinPolicy', kind: 'single', global: 'ArkSkinPolicy', label: 'Skin policy', file: 'skin-policy', title: 'Skin policy', needs: ['js/vendor/flx-state-grammar.js'] }
  ];
  /* a copy, so no caller can edit the list for everyone else */
  function drafts(kind) {
    return DRAFTS.filter(function (d) { return !kind || d.kind === kind; }).map(function (d) { return JSON.parse(JSON.stringify(d)); });
  }

  /* A deleted item's entries in one single draft, per that draft's byItem/byRoute: `gone` is
     { key: 'manifests' | 'articles', id, routes: [paths no longer on the site] }. Returns
     { value, changed } -- a copy, the input untouched. A route the site still has keeps its
     entries: only paths the delete actually took away are pruned. */
  function forgetItem(draft, value, gone) {
    var out = value ? JSON.parse(JSON.stringify(value)) : value, changed = false;
    if (!out || typeof out !== 'object' || !gone) return { value: out, changed: false };
    var map = draft.byItem && gone.key && draft.byItem[gone.key];
    if (map && out[map] && Object.prototype.hasOwnProperty.call(out[map], gone.id)) { delete out[map][gone.id]; changed = true; }
    (draft.byRoute || []).forEach(function (field) {
      (gone.routes || []).forEach(function (route) {
        if (out[field] && Object.prototype.hasOwnProperty.call(out[field], route)) { delete out[field][route]; changed = true; }
      });
    });
    return { value: out, changed: changed };
  }

  /* The list the site loads its manifests from, in display order. */
  function indexText(ids) {
    return '/* The page manifests, in display order. The admin editor (admin-app.html) rewrites this list; edit it by hand only to reorder.\n' +
      '   It loads each manifest while the page is still being read, so every manifest is defined before any script runs.\n' +
      '   An id is written into a script tag, so only a plain id (lowercase letters and digits, starting with a letter) is loaded. */\n' +
      'var ArkManifestIds = ' + JSON.stringify(ids) + ';\n' +
      'var ArkManifestVersion = document.currentScript && document.currentScript.src.match(/[?&]v=([a-z0-9_-]+)/i);\n' +
      'var ArkManifestSearch = ArkManifestVersion ? \'?v=\' + ArkManifestVersion[1] : \'\';\n' +
      'ArkManifestIds.forEach(function (id) {\n' +
      '  if (!/^[a-z][a-z0-9]*$/.test(id)) return;\n' +
      '  document.write(\'<script src="js/content/manifests/\' + id + \'.js\' + ArkManifestSearch + \'" defer><\\/script>\');\n' +
      '});\n';
  }

  /* project folder -> js/content/manifests, refusing a folder that is not the project */
  async function manifestsDir(root) {
    try {
      await root.getFileHandle('index.html');
      var content = await (await root.getDirectoryHandle('js')).getDirectoryHandle('content');
      return await content.getDirectoryHandle('manifests', { create: true });
    } catch (e) {
      throw new Error('That folder is not the Flux Protocol project. Pick the folder that contains index.html and js/content.');
    }
  }

  /* project folder -> { content: js/content, articles: js/content/articles }, refusing a folder that is not the project */
  async function contentDirs(root) {
    try {
      await root.getFileHandle('index.html');
      var content = await (await root.getDirectoryHandle('js')).getDirectoryHandle('content');
      /* root: the project folder itself, for the site-root files Save derives (saveSearchFiles) */
      return { content: content, articles: await content.getDirectoryHandle('articles', { create: true }), root: root };
    } catch (e) {
      throw new Error('That folder is not the Flux Protocol project. Pick the folder that contains index.html and js/content.');
    }
  }

  /* project folder -> js/content/assets, refusing a folder that is not the project */
  async function assetsDir(root) {
    try {
      await root.getFileHandle('index.html');
      var content = await (await root.getDirectoryHandle('js')).getDirectoryHandle('content');
      return await content.getDirectoryHandle('assets', { create: true });
    } catch (e) {
      throw new Error('That folder is not the Flux Protocol project. Pick the folder that contains index.html and js/content.');
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
      '  document.write(\'<script src="js/content/assets/\' + id + \'.js\' + ArkManifestSearch + \'" defer><\\/script>\');\n' +
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
      throw new Error('That folder is not the Flux Protocol project. Pick the folder that contains index.html and js/content.');
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
      '  document.write(\'<script src="js/content/secrets/\' + id + \'.js\' + ArkManifestSearch + \'" defer><\\/script>\');\n' +
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

  /* One index file alone (manifests/assets/secrets index.js, article-index.js), for a version
     Restore whose only change to a list is its order: no item is rewritten, so no item save
     would ever rewrite the index. `text` comes from the index writers above / LearningContent. */
  async function writeIndex(dir, name, text) {
    await write(dir, name, text);
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

  /* the site-wide settings-gear defaults (theme/motif/pattern-config) are a single file
     too, same as mesh settings and the theme. */
  async function saveSettingsDefaults(contentDir, whole) {
    await write(contentDir, 'settings-defaults-data.js', ArkSiteDefaults.serialize(whole));
  }

  /* the SEO settings are a single file too, same as mesh settings and the theme. */
  async function saveSeo(contentDir, whole) {
    await write(contentDir, 'seo-data.js', ArkSEO.serialize(whole));
  }

  /* sitemap.xml / robots.txt / llms.txt in the project folder's root, from ArkSEO.searchFiles()
     (the same generator publish/pull uses). `files` is { name: text | null }; null is "do not
     write it" (no baseUrl yet), and an existing file is then left alone, exactly as a pull does.
     Writes only the files whose text changed; returns their names. */
  async function saveSearchFiles(root, files) {
    var written = [];
    var names = Object.keys(files);
    for (var i = 0; i < names.length; i++) {
      var name = names[i], text = files[name];
      if (text == null) continue;
      var current = null;
      try { current = await (await (await root.getFileHandle(name)).getFile()).text(); }
      catch (error) { if (!error || error.name !== 'NotFoundError') throw error; }
      if (current === text) continue;
      await write(root, name, text);
      written.push(name);
    }
    return written;
  }

  /* Responsive positioning and sizing authored in the visual Studio. */
  async function saveLayout(contentDir, whole) {
    await write(contentDir, 'layout-data.js', ArkLayout.serialize(whole));
  }

  /* Reusable component masters/instances/overrides authored in the visual Studio --
     a single file too, same as layout. */
  async function saveComponents(contentDir, whole) {
    await write(contentDir, 'components-data.js', ArkComponents.serialize(whole));
  }

  /* Layered-state groups (click-to-cycle) authored in the visual Studio -- a single
     file too, same as layout and components. */
  async function saveStates(contentDir, whole) {
    await write(contentDir, 'states-data.js', ArkStates.serialize(whole));
  }

  /* The site-wide background in/out transition (js/content/canvas-transitions.js) --
     a single file too, same as mesh settings, the theme, and settings defaults: one
     site-wide settings object, no per-route/per-id index to maintain. */
  async function saveCanvasTransitions(contentDir, whole) {
    await write(contentDir, 'canvas-transitions-data.js', ArkCanvasTransitions.serialize(whole));
  }

  /* Per-element in/out animation overrides (js/content/element-motion.js) -- a single
     file too, same as canvas transitions. */
  async function saveElementMotion(contentDir, whole) {
    await write(contentDir, 'element-motion-data.js', ArkElementMotion.serialize(whole));
  }

  /* The 3D world under every page (js/content/world.js): a single file too. Its text is FLX
     records inside one ArkWorld.define("...") call -- never JSON (workspace law, stored state
     is FLX). */
  async function saveWorld(contentDir, whole) {
    await write(contentDir, 'world-data.js', ArkWorld.serialize(whole));
  }

  /* The skin policy (js/content/skin-policy.js): which rules a card skin may put on which part of the
     site. A single file too, FLX records inside one ArkSkinPolicy.define("...") call, never JSON. */
  async function saveSkinPolicy(contentDir, whole) {
    await write(contentDir, 'skin-policy-data.js', ArkSkinPolicy.serialize(whole));
  }

  return { drafts: drafts, forgetItem: forgetItem, indexText: indexText, manifestsDir: manifestsDir, save: save, remove: remove, writeIndex: writeIndex,
           contentDirs: contentDirs, saveArticle: saveArticle, removeArticle: removeArticle,
           assetsDir: assetsDir, indexTextAssets: indexTextAssets, saveAsset: saveAsset, removeAsset: removeAsset,
           secretsDir: secretsDir, indexTextSecrets: indexTextSecrets, saveSecret: saveSecret, removeSecret: removeSecret,
           saveMeshSettings: saveMeshSettings, saveTheme: saveTheme, saveSettingsDefaults: saveSettingsDefaults, saveSeo: saveSeo, saveSearchFiles: saveSearchFiles, saveLayout: saveLayout, saveComponents: saveComponents, saveStates: saveStates, saveCanvasTransitions: saveCanvasTransitions, saveElementMotion: saveElementMotion, saveWorld: saveWorld, saveSkinPolicy: saveSkinPolicy };
})();
