/* =====================================================================
   THE SITE AS ONE FLX ARCHIVE
   ---------------------------------------------------------------------
   The whole copy of the site -- every page manifest and every article --
   is one `.flx` archive, so a single content address names the whole site
   and a new edit is a new address, never a rewrite of an old one.

   The archive holds ROUTES, one payload each:
     site               the order of the manifests and of the articles
     manifest.<id>      one page manifest, exactly as ArkManifest defines it
     article.<slug>     one article: its index fields and its body

   Nothing here knows any page's words or any article's shape. Validation and
   the exact file text come from the project's own js/content/manifest.js and
   js/content/learnings.js (loaded, not copied), so the publisher, the admin
   page and a hand edit cannot disagree about what is valid or what a file
   looks like. Reading the archive back yields the same objects the project
   files define; `readProject`, `encodeSite`, `decodeSite` and `writeProject`
   round-trip, and tests/site-bundle.test.mjs proves it on the real content.

   This is a Node-side module: the codec lives in the workspace's shared/
   directory, and the browser never needs it (the admin page posts plain
   JSON; the publish host encodes).
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { encodeArchive, decodeArchive } from '../../../../flx/flx-codec/src/index.js';

export const SITE_SCHEMA = 'subzero-site/1';
/* Fixed, so identical content is the identical archive and the same address. Publish time lives on the name record. */
const ARCHIVE_ID = 'subzero-site';
const ARCHIVE_CREATED_AT = '1970-01-01T00:00:00.000Z';

export const defaultProjectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function read(root, relative) { return fs.readFileSync(path.join(root, relative), 'utf8'); }

/* The project's own content code, run in a sandbox with nothing but what it needs. */
function loadContentCode(root) {
  const context = vm.createContext({ console, document: { write() {} } });
  for (const file of ['js/content/manifest.js', 'js/content/learnings.js', 'js/content/assets.js', 'js/content/secrets.js', 'js/tokens.js', 'js/ark/vendor/backgrounds.js', 'js/content/theme.js', 'js/content/mesh-settings.js', 'js/admin/store.js']) {
    vm.runInContext(read(root, file), context, { filename: file });
  }
  return vm.runInContext('({ ArkManifest, LearningContent, ArkAsset, ArkSecret, ArkTheme, ArkMeshSettings, ArkAdminStore })', context);
}

/* the ids the manifest index lists, in display order */
function manifestIds(root) {
  const writes = [];
  const context = vm.createContext({ document: { write: (s) => writes.push(s) } });
  vm.runInContext(read(root, 'js/content/manifests/index.js'), context);
  return vm.runInContext('ArkManifestIds', context).slice();
}

function loadIndexed(root, ids) {
  const context = vm.createContext({});
  // A page manifest defines itself into a registry; reuse the project's loader against a fresh registry per read.
  vm.runInContext(read(root, 'js/content/manifest.js'), context);
  for (const id of ids) vm.runInContext(read(root, `js/content/manifests/${id}.js`), context, { filename: `manifests/${id}.js` });
  return vm.runInContext('ArkManifest.all()', context);
}

/* the ids the asset index lists */
function assetIds(root) {
  const writes = [];
  const context = vm.createContext({ document: { write: (s) => writes.push(s) } });
  vm.runInContext(read(root, 'js/content/assets/index.js'), context);
  return vm.runInContext('ArkAssetIds', context).slice();
}

function loadIndexedAssets(root, ids) {
  const context = vm.createContext({});
  vm.runInContext(read(root, 'js/content/assets.js'), context);
  for (const id of ids) vm.runInContext(read(root, `js/content/assets/${id}.js`), context, { filename: `assets/${id}.js` });
  return vm.runInContext('ArkAsset.all()', context);
}

/* the ids the secret index lists */
function secretIds(root) {
  const writes = [];
  const context = vm.createContext({ document: { write: (s) => writes.push(s) } });
  vm.runInContext(read(root, 'js/content/secrets/index.js'), context);
  return vm.runInContext('ArkSecretIds', context).slice();
}

function loadIndexedSecrets(root, ids) {
  const context = vm.createContext({});
  vm.runInContext(read(root, 'js/content/secrets.js'), context);
  for (const id of ids) vm.runInContext(read(root, `js/content/secrets/${id}.js`), context, { filename: `secrets/${id}.js` });
  return vm.runInContext('ArkSecret.all()', context);
}

/* the concept page's iceberg relief tuning: a single object, not a list. */
function readMeshSettings(root) {
  const context = vm.createContext({});
  vm.runInContext(read(root, 'js/content/mesh-settings.js'), context, { filename: 'mesh-settings.js' });
  vm.runInContext(read(root, 'js/content/mesh-settings-data.js'), context, { filename: 'mesh-settings-data.js' });
  return JSON.parse(JSON.stringify(vm.runInContext('ArkMeshSettings.get()', context)));
}

/* the colour theme override: a single object, not a list. */
function readTheme(root) {
  const context = vm.createContext({});
  vm.runInContext(read(root, 'js/tokens.js'), context, { filename: 'tokens.js' });
  vm.runInContext(read(root, 'js/ark/vendor/backgrounds.js'), context, { filename: 'backgrounds.js' });
  vm.runInContext(read(root, 'js/content/theme.js'), context, { filename: 'theme.js' });
  vm.runInContext(read(root, 'js/content/theme-data.js'), context, { filename: 'theme-data.js' });
  return JSON.parse(JSON.stringify(vm.runInContext('ArkTheme.get()', context)));
}

/* the project's files -> a plain site object */
export function readProject(root = defaultProjectRoot) {
  const ids = manifestIds(root);
  const manifests = JSON.parse(JSON.stringify(loadIndexed(root, ids)));
  const assets = JSON.parse(JSON.stringify(loadIndexedAssets(root, assetIds(root))));
  const secrets = JSON.parse(JSON.stringify(loadIndexedSecrets(root, secretIds(root))));
  const meshSettings = readMeshSettings(root);
  const theme = readTheme(root);

  const articleContext = vm.createContext({});
  vm.runInContext(read(root, 'js/content/learnings.js'), articleContext);
  vm.runInContext(read(root, 'js/content/article-index.js'), articleContext);
  const slugs = vm.runInContext('LearningContent.articles.map(function (a) { return a.slug; })', articleContext);
  for (const slug of slugs) vm.runInContext(read(root, `js/content/articles/${slug}.js`), articleContext, { filename: `articles/${slug}.js` });
  const articles = JSON.parse(JSON.stringify(vm.runInContext('LearningContent.articles', articleContext)));
  return { manifests, articles, assets, secrets, meshSettings, theme };
}

/* every reason a site is not publishable, from the project's own validators */
export function siteProblems(site, root = defaultProjectRoot) {
  const { ArkManifest, LearningContent, ArkAsset, ArkSecret, ArkTheme, ArkMeshSettings } = loadContentCode(root);
  const out = [];
  if (!site || !Array.isArray(site.manifests) || !Array.isArray(site.articles) || !Array.isArray(site.assets)) return ['a site has manifests, articles and assets'];
  const seen = new Set();
  for (const manifest of site.manifests) {
    for (const bad of ArkManifest.problems(manifest)) out.push(`manifest ${manifest && manifest.id}: ${bad}`);
    if (seen.has(manifest && manifest.id)) out.push(`manifest ${manifest.id} appears twice`);
    seen.add(manifest && manifest.id);
  }
  const slugs = new Set();
  for (const article of site.articles) {
    for (const bad of LearningContent.problems(article)) out.push(`article ${article && article.slug}: ${bad}`);
    if (!article || !Array.isArray(article.sections)) out.push(`article ${article && article.slug}: no body`);
    if (slugs.has(article && article.slug)) out.push(`article ${article.slug} appears twice`);
    slugs.add(article && article.slug);
  }
  const assetIdsSeen = new Set();
  for (const asset of site.assets) {
    for (const bad of ArkAsset.problems(asset)) out.push(`asset ${asset && asset.id}: ${bad}`);
    if (assetIdsSeen.has(asset && asset.id)) out.push(`asset ${asset.id} appears twice`);
    assetIdsSeen.add(asset && asset.id);
  }
  // Older sites predate encrypted content: absent means none, not a problem.
  if (site.secrets != null) {
    if (!Array.isArray(site.secrets)) out.push('secrets must be a list');
    else {
      const secretIdsSeen = new Set();
      for (const secret of site.secrets) {
        for (const bad of ArkSecret.problems(secret)) out.push(`secret ${secret && secret.id}: ${bad}`);
        if (secretIdsSeen.has(secret && secret.id)) out.push(`secret ${secret.id} appears twice`);
        secretIdsSeen.add(secret && secret.id);
      }
    }
  }
  // Older sites predate mesh tuning: absent means "use image-shape.js's defaults", not a problem.
  if (site.meshSettings != null) for (const bad of ArkMeshSettings.problems(site.meshSettings)) out.push(`mesh settings: ${bad}`);
  // Older sites predate a theme override: absent means "use tokens.js's defaults", not a problem.
  if (site.theme != null) for (const bad of ArkTheme.problems(site.theme)) out.push(`theme: ${bad}`);
  return out;
}

export function encodeSite(site, root = defaultProjectRoot) {
  const bad = siteProblems(site, root);
  if (bad.length) throw new Error(`Site is not publishable: ${bad.join('; ')}`);
  return encodeArchive({
    archiveId: ARCHIVE_ID,
    createdAt: ARCHIVE_CREATED_AT,
    entry: 'site',
    generatedBy: 'subzero/scripts/lib/site-bundle.mjs',
    sourceFormat: SITE_SCHEMA,
    routes: [
      { routeId: 'site', path: '/', title: 'SUBZERO', payload: { schema: SITE_SCHEMA, manifests: site.manifests.map((m) => m.id), articles: site.articles.map((a) => a.slug), assets: site.assets.map((a) => a.id), secrets: (site.secrets || []).map((s) => s.id), meshSettings: site.meshSettings != null, theme: site.theme != null } },
      ...site.manifests.map((m) => ({ routeId: `manifest.${m.id}`, path: `/manifest/${m.id}`, title: m.title, payload: m })),
      ...site.articles.map((a) => ({ routeId: `article.${a.slug}`, path: `/article/${a.slug}`, title: a.title, payload: a })),
      ...site.assets.map((a) => ({ routeId: `asset.${a.id}`, path: `/asset/${a.id}`, title: a.label, payload: a })),
      ...(site.secrets || []).map((s) => ({ routeId: `secret.${s.id}`, path: `/secret/${s.id}`, title: s.label, payload: s })),
      ...(site.meshSettings != null ? [{ routeId: 'meshSettings', path: '/mesh-settings', title: 'Mesh tuning', payload: site.meshSettings }] : []),
      ...(site.theme != null ? [{ routeId: 'theme', path: '/theme', title: 'Colour theme', payload: site.theme }] : []),
    ],
  });
}

export function decodeSite(bytes) {
  const decoded = decodeArchive(bytes);
  const routes = new Map((decoded.routes || []).map((route) => [route.routeId, route]));
  const entry = routes.get('site');
  if (!entry || entry.payload?.schema !== SITE_SCHEMA) throw new Error(`Not a ${SITE_SCHEMA} archive: the entry route is missing or has another schema.`);
  const need = (routeId) => {
    const route = routes.get(routeId);
    if (!route) throw new Error(`The archive lists ${routeId} but does not contain it.`);
    return route.payload;
  };
  return {
    manifests: entry.payload.manifests.map((id) => need(`manifest.${id}`)),
    articles: entry.payload.articles.map((slug) => need(`article.${slug}`)),
    // Older archives predate assets: an absent list means none, not a broken read.
    assets: (entry.payload.assets || []).map((id) => need(`asset.${id}`)),
    // Older archives predate encrypted content: an absent list means none, not a broken read.
    secrets: (entry.payload.secrets || []).map((id) => need(`secret.${id}`)),
    // Older archives predate mesh tuning: absent means "use image-shape.js's defaults".
    meshSettings: entry.payload.meshSettings ? need('meshSettings') : null,
    // Older archives predate a theme override: absent means "use tokens.js's defaults".
    theme: entry.payload.theme ? need('theme') : null,
  };
}

/* The exact set of files a site occupies in the project, as {relativePath: text}. */
export function projectFiles(site, root = defaultProjectRoot) {
  const { ArkManifest, LearningContent, ArkAsset, ArkSecret, ArkTheme, ArkMeshSettings, ArkAdminStore } = loadContentCode(root);
  const files = {};
  for (const manifest of site.manifests) files[`js/content/manifests/${manifest.id}.js`] = ArkManifest.serialize(manifest);
  files['js/content/manifests/index.js'] = ArkAdminStore.indexText(site.manifests.map((m) => m.id));
  for (const article of site.articles) files[`js/content/articles/${article.slug}.js`] = LearningContent.serializeBody(article);
  files['js/content/article-index.js'] = LearningContent.serializeIndex(site.articles);
  for (const asset of site.assets) files[`js/content/assets/${asset.id}.js`] = ArkAsset.serialize(asset);
  files['js/content/assets/index.js'] = ArkAdminStore.indexTextAssets(site.assets.map((a) => a.id));
  const secrets = site.secrets || [];
  for (const secret of secrets) files[`js/content/secrets/${secret.id}.js`] = ArkSecret.serialize(secret);
  files['js/content/secrets/index.js'] = ArkAdminStore.indexTextSecrets(secrets.map((s) => s.id));
  // A single file, not a per-id directory: there is only ever one mesh tuning.
  files['js/content/mesh-settings-data.js'] = ArkMeshSettings.serialize(site.meshSettings || {});
  // A single file, not a per-id directory: there is only ever one theme.
  files['js/content/theme-data.js'] = ArkTheme.serialize(site.theme || {});
  return files;
}

/* Files the project holds that the site no longer names: manifests, article bodies and assets only. */
export function staleFiles(site, root = defaultProjectRoot) {
  const keep = new Set(Object.keys(projectFiles(site, root)));
  const out = [];
  for (const dir of ['js/content/manifests', 'js/content/articles', 'js/content/assets', 'js/content/secrets']) {
    for (const name of fs.readdirSync(path.join(root, dir))) {
      const relative = `${dir}/${name}`;
      if (name.endsWith('.js') && !keep.has(relative)) out.push(relative);
    }
  }
  return out;
}

/* Plan what writing a site would change, without touching anything. */
export function planWrite(site, root = defaultProjectRoot) {
  const changes = [];
  for (const [relative, text] of Object.entries(projectFiles(site, root))) {
    const file = path.join(root, relative);
    if (!fs.existsSync(file)) changes.push({ relative, action: 'create', text });
    else if (fs.readFileSync(file, 'utf8') !== text) changes.push({ relative, action: 'update', text });
  }
  for (const relative of staleFiles(site, root)) changes.push({ relative, action: 'remove' });
  return changes;
}

export function writeProject(site, root = defaultProjectRoot) {
  const changes = planWrite(site, root);
  for (const change of changes) {
    const file = path.join(root, change.relative);
    if (change.action === 'remove') fs.rmSync(file);
    else { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, change.text); }
  }
  return changes.map(({ relative, action }) => ({ relative, action }));
}
