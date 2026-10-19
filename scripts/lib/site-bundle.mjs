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
     asset.<id>, secret.<id>   one image / one encrypted item
     <draft key>        one single-object draft (theme, layout, components, states, ...):
                        one route per 'single' entry of js/admin/store.js's draft list,
                        the same list the admin's Save uses, so publish cannot carry
                        fewer drafts than Save writes

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

export const SITE_SCHEMA = 'flux-chain-site/1';
/* Fixed, so identical content is the identical archive and the same address. Publish time lives on the name record. */
const ARCHIVE_ID = 'flux-chain-site';
const ARCHIVE_CREATED_AT = '1970-01-01T00:00:00.000Z';

export const defaultProjectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function read(root, relative) { return fs.readFileSync(path.join(root, relative), 'utf8'); }

/* The editor's one list of drafts (js/admin/store.js ArkAdminStore.drafts()), read from the
   file itself -- never restated here. A 'single' draft needs nothing below to be named: its
   archive route, its reader, its validation and its project file all follow from the entry.
   An 'items' draft needs its own code (per-id files, an index), so one this file does not
   handle is refused loudly instead of being left out of the archive silently, which is
   exactly how 5 of the 13 drafts once went missing from every publish. */
const ITEM_KEYS = ['manifests', 'articles', 'assets', 'secrets'];
export function siteDrafts(root = defaultProjectRoot) {
  const context = vm.createContext({});
  vm.runInContext(read(root, 'js/admin/store.js'), context, { filename: 'js/admin/store.js' });
  const list = JSON.parse(JSON.stringify(vm.runInContext('ArkAdminStore.drafts()', context)));
  const unhandled = list.filter((d) => d.kind === 'items' && !ITEM_KEYS.includes(d.key)).map((d) => d.key);
  if (unhandled.length) throw new Error(`js/admin/store.js lists the per-id draft(s) ${unhandled.join(', ')}, which scripts/lib/site-bundle.mjs cannot archive yet: add their encode/decode/projectFiles handling there, or they would never be published.`);
  return list;
}
const singleDrafts = (root) => siteDrafts(root).filter((d) => d.kind === 'single');

/* The project's own content code, run in a sandbox with nothing but what it needs. */
function loadContentCode(root) {
  const context = vm.createContext({ console, document: { write() {} } });
  const files = ['js/content/manifest.js', 'js/content/learnings.js', 'js/content/assets.js', 'js/content/secrets.js'];
  for (const d of singleDrafts(root)) for (const file of [...(d.needs || []), `js/content/${d.file}.js`]) if (!files.includes(file)) files.push(file);
  files.push('js/admin/store.js');
  for (const file of files) vm.runInContext(read(root, file), context, { filename: file });
  const globals = ['ArkManifest', 'LearningContent', 'ArkAsset', 'ArkSecret', 'ArkAdminStore', ...singleDrafts(root).map((d) => d.global)];
  return vm.runInContext(`({ ${globals.join(', ')} })`, context);
}

/* One single-object draft as the site loads it: its prerequisites, its module, its data file. */
function readSingle(root, d) {
  const context = vm.createContext({});
  for (const file of [...(d.needs || []), `js/content/${d.file}.js`, `js/content/${d.file}-data.js`]) vm.runInContext(read(root, file), context, { filename: file });
  return JSON.parse(JSON.stringify(vm.runInContext(`${d.global}.get()`, context)));
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
  /* ArkManifestSearch is the cache-busting suffix manifests/index.js defines first in the page; the other index files reuse it. */
  const context = vm.createContext({ ArkManifestSearch: '', document: { write: (s) => writes.push(s) } });
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
  const context = vm.createContext({ ArkManifestSearch: '', document: { write: (s) => writes.push(s) } });
  vm.runInContext(read(root, 'js/content/secrets/index.js'), context);
  return vm.runInContext('ArkSecretIds', context).slice();
}

function loadIndexedSecrets(root, ids) {
  const context = vm.createContext({});
  vm.runInContext(read(root, 'js/content/secrets.js'), context);
  for (const id of ids) vm.runInContext(read(root, `js/content/secrets/${id}.js`), context, { filename: `secrets/${id}.js` });
  return vm.runInContext('ArkSecret.all()', context);
}

/* the SEO title/description overrides + base URL: a single object, not a list.
   Needs the real manifest ids and article slugs loaded first (ArkSEO.sanitize()
   keys its per-page/per-article maps off them), so this runs after both, unlike
   every other single draft, which readSingle() reads standing alone. */
function readSeo(root, ids) {
  const context = vm.createContext({});
  vm.runInContext(read(root, 'js/content/manifest.js'), context, { filename: 'manifest.js' });
  for (const id of ids) vm.runInContext(read(root, `js/content/manifests/${id}.js`), context, { filename: `manifests/${id}.js` });
  vm.runInContext(read(root, 'js/content/learnings.js'), context, { filename: 'learnings.js' });
  vm.runInContext(read(root, 'js/content/article-index.js'), context, { filename: 'article-index.js' });
  // the site's page table (journeys, non-manifest page ids): seo.js derives its page ids from it
  vm.runInContext(read(root, 'js/content/site-pages.js'), context, { filename: 'site-pages.js' });
  vm.runInContext(read(root, 'js/content/seo.js'), context, { filename: 'seo.js' });
  vm.runInContext(read(root, 'js/content/seo-data.js'), context, { filename: 'seo-data.js' });
  return JSON.parse(JSON.stringify(vm.runInContext('ArkSEO.get()', context)));
}

/* the project's files -> a plain site object */
export function readProject(root = defaultProjectRoot) {
  const ids = manifestIds(root);
  const manifests = JSON.parse(JSON.stringify(loadIndexed(root, ids)));
  const assets = JSON.parse(JSON.stringify(loadIndexedAssets(root, assetIds(root))));
  const secrets = JSON.parse(JSON.stringify(loadIndexedSecrets(root, secretIds(root))));

  const articleContext = vm.createContext({});
  vm.runInContext(read(root, 'js/content/learnings.js'), articleContext);
  vm.runInContext(read(root, 'js/content/article-index.js'), articleContext);
  const slugs = vm.runInContext('LearningContent.articles.map(function (a) { return a.slug; })', articleContext);
  for (const slug of slugs) vm.runInContext(read(root, `js/content/articles/${slug}.js`), articleContext, { filename: `articles/${slug}.js` });
  const articles = JSON.parse(JSON.stringify(vm.runInContext('LearningContent.articles', articleContext)));
  const items = { manifests, articles, assets, secrets };
  // Keys in the draft list's order, the same order decodeSite() gives them back in, so the
  // decoded site is byte-identical to this one under JSON.stringify, not only deep-equal.
  const site = {};
  for (const d of siteDrafts(root)) site[d.key] = d.kind === 'items' ? items[d.key] : d.key === 'seo' ? readSeo(root, ids) : readSingle(root, d);
  return site;
}

/* every reason a site is not publishable, from the project's own validators */
export function siteProblems(site, root = defaultProjectRoot) {
  const code = loadContentCode(root);
  const { ArkManifest, LearningContent, ArkAsset, ArkSecret } = code;
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
  // Every single-object draft. Older sites predate most of them: absent means "use that
  // module's defaults", not a problem. Present, it is an object, and the module's own
  // problems() (where it has one) has the last word.
  for (const d of singleDrafts(root)) {
    const value = site[d.key];
    if (value == null) continue;
    const what = d.label.toLowerCase();
    if (typeof value !== 'object' || Array.isArray(value)) { out.push(`${what}: must be a settings object, not ${Array.isArray(value) ? 'a list' : typeof value}`); continue; }
    const api = code[d.global];
    if (typeof api.problems === 'function') for (const bad of api.problems(value)) out.push(`${what}: ${bad}`);
  }
  return out;
}

export function encodeSite(site, root = defaultProjectRoot) {
  const bad = siteProblems(site, root);
  if (bad.length) throw new Error(`Site is not publishable: ${bad.join('; ')}`);
  const singles = singleDrafts(root);
  const entry = { schema: SITE_SCHEMA, manifests: site.manifests.map((m) => m.id), articles: site.articles.map((a) => a.slug), assets: site.assets.map((a) => a.id), secrets: (site.secrets || []).map((s) => s.id) };
  // A flag per single draft says whether its route is present; a reader that predates a draft ignores the flag.
  for (const d of singles) entry[d.key] = site[d.key] != null;
  return encodeArchive({
    archiveId: ARCHIVE_ID,
    createdAt: ARCHIVE_CREATED_AT,
    entry: 'site',
    generatedBy: 'flux-chain/scripts/lib/site-bundle.mjs',
    sourceFormat: SITE_SCHEMA,
    routes: [
      { routeId: 'site', path: '/', title: 'Flux Protocol', payload: entry },
      ...site.manifests.map((m) => ({ routeId: `manifest.${m.id}`, path: `/manifest/${m.id}`, title: m.title, payload: m })),
      ...site.articles.map((a) => ({ routeId: `article.${a.slug}`, path: `/article/${a.slug}`, title: a.title, payload: a })),
      ...site.assets.map((a) => ({ routeId: `asset.${a.id}`, path: `/asset/${a.id}`, title: a.label, payload: a })),
      ...(site.secrets || []).map((s) => ({ routeId: `secret.${s.id}`, path: `/secret/${s.id}`, title: s.label, payload: s })),
      // routeId = the draft's key, path = its file stem: the same ids/paths the four older single routes always had.
      ...singles.filter((d) => site[d.key] != null).map((d) => ({ routeId: d.key, path: `/${d.file}`, title: d.title, payload: site[d.key] })),
    ],
  });
}

export function decodeSite(bytes, root = defaultProjectRoot) {
  const decoded = decodeArchive(bytes);
  const routes = new Map((decoded.routes || []).map((route) => [route.routeId, route]));
  const entry = routes.get('site');
  if (!entry || entry.payload?.schema !== SITE_SCHEMA) throw new Error(`Not a ${SITE_SCHEMA} archive: the entry route is missing or has another schema.`);
  const need = (routeId) => {
    const route = routes.get(routeId);
    if (!route) throw new Error(`The archive lists ${routeId} but does not contain it.`);
    return route.payload;
  };
  const items = {
    manifests: entry.payload.manifests.map((id) => need(`manifest.${id}`)),
    articles: entry.payload.articles.map((slug) => need(`article.${slug}`)),
    // Older archives predate assets: an absent list means none, not a broken read.
    assets: (entry.payload.assets || []).map((id) => need(`asset.${id}`)),
    // Older archives predate encrypted content: an absent list means none, not a broken read.
    secrets: (entry.payload.secrets || []).map((id) => need(`secret.${id}`)),
  };
  // Every draft, in the draft list's order. Older archives predate most single drafts (and
  // until 2026-10-18 every archive lacked settingsDefaults/components/states/canvasTransitions/
  // elementMotion): an absent flag means null, "use that module's defaults", not a broken read.
  const site = {};
  for (const d of siteDrafts(root)) site[d.key] = d.kind === 'items' ? items[d.key] : (entry.payload[d.key] ? need(d.key) : null);
  return site;
}

/* The exact set of files a site occupies in the project, as {relativePath: text}. */
export function projectFiles(site, root = defaultProjectRoot) {
  const code = loadContentCode(root);
  const { ArkManifest, LearningContent, ArkAsset, ArkSecret, ArkSEO, ArkAdminStore } = code;
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
  // Each single draft is one file, not a per-id directory: the bytes its own serialize() writes,
  // the same bytes an admin Save writes. Absent (an older archive) writes that module's defaults.
  // SEO is written below: its serialization also needs the site's manifests and articles.
  for (const d of singleDrafts(root)) if (d.key !== 'seo') files[`js/content/${d.file}-data.js`] = code[d.global].serialize(site[d.key] || {});
  // A single file, not a per-id directory: there is only ever one SEO settings object.
  // The registries loadContentCode() gives ArkSEO are never populated with this site's
  // actual manifests/articles, so pageIds()/articleSlugs() need them passed explicitly.
  const seo = ArkSEO.sanitize(site.seo || {}, site.manifests, site.articles);
  files['js/content/seo-data.js'] = ArkSEO.serialize(seo, site.manifests, site.articles);
  // sitemap.xml / robots.txt / llms.txt: ArkSEO.searchFiles() is the one place that says which
  // root files a site has and their text (null = not written). The admin's Save writes the same
  // set through js/admin/store.js saveSearchFiles(), so a Save and a pull cannot disagree.
  for (const [name, text] of Object.entries(ArkSEO.searchFiles(seo, site.manifests, site.articles))) if (text != null) files[name] = text;
  return files;
}

/* Files the project holds that the site no longer names: manifests, article bodies and assets only. */
export function staleFiles(site, root = defaultProjectRoot) {
  const keep = new Set(Object.keys(projectFiles(site, root)));
  const out = [];
  for (const dir of siteDrafts(root).filter((d) => d.kind === 'items').map((d) => `js/content/${d.dir}`)) {
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
