/* =====================================================================
   THE STAGED SITE'S REFERENCE GRAPH: which shipped files does no page reach?
   ---------------------------------------------------------------------
   Layer: app (a build step of the DEFXN site Bundle; scripts/pack-fxn-site.mjs calls it after staging).

   WHY. The pack ships js/, css/ and assets/ whole. Measured 2026-11-11 on cut f1266cd0 (1,881 files, 41,410,486 bytes):
   files no page can ask for were shipped, among them js/content/assets/iceberg-blocks.js (1,985,029 bytes, read only by
   the editor's canvas, and the editor is not shipped), assets/marks/loading.png (860,544) and assets/marks/pick (2.47 MB,
   the loader pick no page loads any more). A hand-kept exclusion list would miss the next one, so the list is DERIVED:
   the graph finds its own subjects by reading the staged folder.

   THE READING. Roots: every .html file (a page address or a frame document) and the files a host serves by name.
   Edges, from every text file: each quoted string, each url(), each src/href and each sourceMappingURL that resolves to a
   staged file, relative to the naming file or to the site root. Three rules lean toward keeping a file:
     - 'js/x.js' also reaches js/min/x.js (js/ark/page-loader.js serves a page script from its minified copy);
     - a quoted string that names a staged FOLDER ('js/content/manifests/', with or without the last slash, or the fixed
       start of a template string) reaches every file directly in that folder: a path built from pieces;
     - a route-like string reaches <route>.html and <route>/index.html.
   Comments are not uses: an HTML comment, an inert <template> (index.html lists the shell's sources in one; the browser
   fetches the chunks, never the sources) and a block comment in a script or a sheet are dropped before reading.

   WHAT IT CANNOT SEE. A path built from pieces with no folder string in the code. So a file nothing reaches is removed
   only inside the folders the caller names, and the caller lists every removed file with its bytes: a missing file then
   has one place to be looked up. Never call the result "unused" for a folder this reading was not asked about.
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';

const TEXT = /\.(html|js|mjs|cjs|css|json|fxn|svg|txt|webmanifest|xml)$/;
const SERVED_BY_NAME = /^(robots\.txt|sitemap\.xml|llms\.txt|site\.webmanifest|favicon\.ico|_headers|\.well-known\/.*)$/;

function withoutComments(file, text) {
  if (/\.html$/.test(file)) return text.replace(/<!--[\s\S]*?-->/g, '').replace(/<template\b[\s\S]*?<\/template>/g, '');
  if (/\.(js|mjs|cjs|css)$/.test(file)) return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*$/gm, '');
  return text;
}

/* { files, size(file), roots, reached: Set, inbound: Map(file -> [naming files]) } for the folder `stage`.
   `documents`: [{ name, text }], pages served beside the stage (the cut's web-only/broker.html): each is a root, read as a
   page at the site root, so what only it loads (js/broker/broker.js) is reached. */
export function stageGraph(stage, { documents = [] } = {}) {
  const files = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full); else if (entry.isFile()) files.push(path.relative(stage, full).split(path.sep).join('/'));
    }
  })(stage);
  const set = new Set(files), folders = new Map();
  for (const file of files) { const dir = path.posix.dirname(file); if (!folders.has(dir)) folders.set(dir, []); folders.get(dir).push(file); }
  const size = (file) => fs.statSync(path.join(stage, file)).size;
  const resolve = (from, ref) => {
    const out = [], plain = ref.split('#')[0].split('?')[0];
    if (!plain || plain.length > 300 || /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(plain) || /^(?:data|blob|mailto|javascript):/i.test(plain)) return out;
    const tries = plain.startsWith('/') ? [plain.slice(1)] : [path.posix.normalize(path.posix.join(path.posix.dirname(from), plain)), path.posix.normalize(plain)];
    for (const tried of tries) {
      const target = tried.replace(/\/$/, '');
      if (set.has(target)) out.push(target);
      if (folders.has(target)) out.push(...folders.get(target));
      if (/^js\/.*\.js$/.test(target) && set.has('js/min/' + target.slice(3))) out.push('js/min/' + target.slice(3));
      if (set.has(target + '/index.html')) out.push(target + '/index.html');
      if (set.has(target + '.html')) out.push(target + '.html');
    }
    return out;
  };
  const edges = new Map(), beside = new Map(documents.map((d) => [d.name, d.text]));
  for (const file of [...files, ...beside.keys()]) {
    if (!beside.has(file) && (!TEXT.test(file) || size(file) > 6e6)) continue;
    const text = withoutComments(file, beside.has(file) ? beside.get(file) : fs.readFileSync(path.join(stage, file), 'utf8')), to = new Set(), refs = [];
    for (const m of text.matchAll(/'((?:\\.|[^'\\\n]){1,300})'|"((?:\\.|[^"\\\n]){1,300})"|`((?:\\.|[^`\\]){1,300})`/g)) refs.push(m[1] ?? m[2] ?? m[3]);
    for (const m of text.matchAll(/url\(\s*([^'")\s][^)\s]*)\s*\)/g)) refs.push(m[1]);
    for (const m of text.matchAll(/(?:src|href)=([^\s"'>]+)/g)) refs.push(m[1]);
    for (const m of text.matchAll(/sourceMappingURL=(\S+)/g)) refs.push(m[1]);
    /* markup inside a string ('<script src="js/content/assets/' + id) and a list file (sitemap.xml, llms.txt): the paths in it */
    for (const m of text.matchAll(/(?:^|[\s(>="'])((?:\.{0,2}\/)?[\w@.-]+(?:\/[\w@.-]+)+\/?)/g)) refs.push(m[1]);
    for (const ref of refs) {
      const fixed = ref.replace(/\$\{[\s\S]*$/, '');
      for (const target of resolve(file, fixed)) if (target !== file) to.add(target);
    }
    edges.set(file, to);
  }
  const roots = files.filter((file) => /\.html$/.test(file) || SERVED_BY_NAME.test(file)).concat([...beside.keys()]);
  const reached = new Set(roots), queue = roots.slice();
  while (queue.length) for (const target of edges.get(queue.pop()) || []) if (!reached.has(target)) { reached.add(target); queue.push(target); }
  const inbound = new Map();
  for (const [file, to] of edges) for (const target of to) { if (!inbound.has(target)) inbound.set(target, []); inbound.get(target).push(file); }
  return { files, size, roots, reached, inbound };
}

/* Removes from `stage` every file no root reaches that lies under one of `folders` (['js', 'css', 'assets']). Returns
   [{ file, bytes }], biggest first, for the caller to list. A folder left empty is removed too. */
export function pruneNotReached(stage, folders, options) {
  const graph = stageGraph(stage, options);
  const gone = graph.files.filter((file) => !graph.reached.has(file) && folders.some((folder) => file.startsWith(folder + '/')))
    .map((file) => ({ file, bytes: graph.size(file) })).sort((a, b) => b.bytes - a.bytes);
  for (const { file } of gone) {
    fs.rmSync(path.join(stage, file));
    for (let dir = path.dirname(path.join(stage, file)); dir.startsWith(stage) && dir !== stage && fs.readdirSync(dir).length === 0; dir = path.dirname(dir)) fs.rmdirSync(dir);
  }
  return gone;
}
