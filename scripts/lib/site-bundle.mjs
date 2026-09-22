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
import { encodeArchive, decodeArchive } from '../../../shared/flx-codec/src/index.js';

export const SITE_SCHEMA = 'subzero-site/1';
/* Fixed, so identical content is the identical archive and the same address. Publish time lives on the name record. */
const ARCHIVE_ID = 'subzero-site';
const ARCHIVE_CREATED_AT = '1970-01-01T00:00:00.000Z';

export const defaultProjectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function read(root, relative) { return fs.readFileSync(path.join(root, relative), 'utf8'); }

/* The project's own content code, run in a sandbox with nothing but what it needs. */
function loadContentCode(root) {
  const context = vm.createContext({ console, document: { write() {} } });
  for (const file of ['js/content/manifest.js', 'js/content/learnings.js', 'js/admin/store.js']) {
    vm.runInContext(read(root, file), context, { filename: file });
  }
  return vm.runInContext('({ ArkManifest, LearningContent, ArkAdminStore })', context);
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

/* the project's files -> a plain site object */
export function readProject(root = defaultProjectRoot) {
  const ids = manifestIds(root);
  const manifests = JSON.parse(JSON.stringify(loadIndexed(root, ids)));

  const articleContext = vm.createContext({});
  vm.runInContext(read(root, 'js/content/learnings.js'), articleContext);
  vm.runInContext(read(root, 'js/content/article-index.js'), articleContext);
  const slugs = vm.runInContext('LearningContent.articles.map(function (a) { return a.slug; })', articleContext);
  for (const slug of slugs) vm.runInContext(read(root, `js/content/articles/${slug}.js`), articleContext, { filename: `articles/${slug}.js` });
  const articles = JSON.parse(JSON.stringify(vm.runInContext('LearningContent.articles', articleContext)));
  return { manifests, articles };
}

/* every reason a site is not publishable, from the project's own validators */
export function siteProblems(site, root = defaultProjectRoot) {
  const { ArkManifest, LearningContent } = loadContentCode(root);
  const out = [];
  if (!site || !Array.isArray(site.manifests) || !Array.isArray(site.articles)) return ['a site has manifests and articles'];
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
      { routeId: 'site', path: '/', title: 'SUBZERO', payload: { schema: SITE_SCHEMA, manifests: site.manifests.map((m) => m.id), articles: site.articles.map((a) => a.slug) } },
      ...site.manifests.map((m) => ({ routeId: `manifest.${m.id}`, path: `/manifest/${m.id}`, title: m.title, payload: m })),
      ...site.articles.map((a) => ({ routeId: `article.${a.slug}`, path: `/article/${a.slug}`, title: a.title, payload: a })),
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
  };
}

/* The exact set of files a site occupies in the project, as {relativePath: text}. */
export function projectFiles(site, root = defaultProjectRoot) {
  const { ArkManifest, LearningContent, ArkAdminStore } = loadContentCode(root);
  const files = {};
  for (const manifest of site.manifests) files[`js/content/manifests/${manifest.id}.js`] = ArkManifest.serialize(manifest);
  files['js/content/manifests/index.js'] = ArkAdminStore.indexText(site.manifests.map((m) => m.id));
  for (const article of site.articles) files[`js/content/articles/${article.slug}.js`] = LearningContent.serializeBody(article);
  files['js/content/article-index.js'] = LearningContent.serializeIndex(site.articles);
  return files;
}

/* Files the project holds that the site no longer names: manifests and article bodies only. */
export function staleFiles(site, root = defaultProjectRoot) {
  const keep = new Set(Object.keys(projectFiles(site, root)));
  const out = [];
  for (const dir of ['js/content/manifests', 'js/content/articles']) {
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
