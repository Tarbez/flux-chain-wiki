// Which stylesheets a route needs: derived, written into js/pages/catalog.js, checked for drift.
//
//   node scripts/page-styles.mjs            print the derivation (shared sheets, then each module's own)
//   node scripts/page-styles.mjs --write    rewrite the derived block in js/pages/catalog.js and the
//                                           <link rel=stylesheet> list in index.html
//   node scripts/page-styles.mjs --check    fail on drift (catalog block, index.html, an unplaced sheet,
//                                           an orphan sheet); no jsdom, about a second
//   node scripts/page-styles.mjs --why css/stats-dashboard.css
//                                           say which rule put that sheet where it is, per module
//
// WHY. index.html used to link all ~44 stylesheets, so every route paid for every page's CSS (160 KB gz
// before the Ark conversion, 114 KB after; a story page needs a fraction of it). Owner decision
// 2026-10-20: each route loads the shared sheets plus only its own. The lists are DERIVED, never
// hand-written per page (AGENTS.md: derive, don't author), from what the code can say:
//
//   1. A sheet is parsed into rules. A rule needs the class names and ids its selectors name (inside
//      :not()/:is()/:where()/:has() and attribute values it asks for nothing, except the route key in
//      [data-page="..."], which is the one attribute whose value names a route). A selector that names
//      no class and no id (`body`, `h1`, `:root`, `*`) matches on every page: its sheet is global.
//   2. A module's vocabulary is every word of the scripts its routes load (js/pages/catalog.js
//      `scripts`, plus the files those name or import by literal path), together with the SHELL's
//      vocabulary: the scripts and markup index.html itself carries (header, settings panel, scene,
//      router: they run on every route). A name built by concatenation ('dash-span-' + n, '-active')
//      counts as a prefix / suffix: any class that starts / ends that way is present. Over-including is
//      safe (a few bytes); under-including would show an unstyled page, so every choice here leans to
//      include.
//   3. A sheet is needed by a module when one of its rules finds all its names in that vocabulary, or
//      when a needed rule's declaration uses an @keyframes / @font-face name the sheet provides.
//   4. SHARED = needed by every module (this includes every sheet with a global rule). It stays in
//      index.html (parallel with the shell, no round trip). Everything else is a module's own: the
//      page loader (js/ark/page-loader.js loadStyles) links it before the page mounts.
//
// The independent proof is not this file: tests/page-styles.cjs renders every route in jsdom and checks
// every class the page really uses has its defining sheet loaded, and tests/browser (route-sweep,
// fold-contrast-sweep) catch what a static reading of the code cannot.
//
// The cascade order (ArkUI.styleOrder in js/pages/catalog.js) is the one thing that cannot be derived:
// it is the order the sheets used to be linked in, and the loader inserts a late sheet at its place in
// it, so a page sheet still sits before components.css (which decides interactive paint) exactly as
// when everything was linked in index.html. A sheet missing from it is placed before css/ark-blocks.css
// by --write, and --check fails until it is.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BEGIN = '/* BEGIN derived page styles';
const END = '/* END derived page styles */';
/* Documents that link sheets of their own: the editor and the standalone pages do not read index.html,
   so a sheet only they link is not an orphan of the public site. */
const OTHER_DOCUMENTS = ['admin.html', 'admin-app.html', 'broker.html'];

/* ---------- reading ---------- */
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

/* Sheets in index.html, in link order. */
export function indexSheets(html = read('index.html')) {
  return [...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*>/g)].map((m) => {
    const href = /href="([^"?]+)(?:\?([^"]*))?"/.exec(m[0]);
    return { file: href[1], version: href[2] || '', tag: m[0] };
  });
}

/* ---------- parsing a stylesheet ---------- */
function stripComments(text) { return text.replace(/\/\*[\s\S]*?\*\//g, ''); }

/* Index of the character that closes the block opened at text[open] === '{'. Strings are skipped (a `}`
   inside "..." closes nothing). */
function matching(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'") { for (i++; i < text.length && text[i] !== c; i++) if (text[i] === '\\') i++; continue; }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  return text.length;
}

function splitTopLevel(text, sep) {
  const out = []; let depth = 0, start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'") { for (i++; i < text.length && text[i] !== c; i++) if (text[i] === '\\') i++; continue; }
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === sep && depth === 0) { out.push(text.slice(start, i)); start = i + 1; }
  }
  out.push(text.slice(start));
  return out.map((s) => s.trim()).filter(Boolean);
}

/* { rules: [{ selectors, body }], keyframes: Set, fonts: Set } -- at-rules that hold rules (@media,
   @supports, @container, @layer, @scope) are entered; @keyframes and @font-face are what the sheet
   PROVIDES; anything else (@charset, @import, @page, @property) is ignored. */
export function parseSheet(text) {
  const out = { rules: [], keyframes: new Set(), fonts: new Set() };
  (function walk(css) {
    let i = 0;
    while (i < css.length) {
      let j = i, depth = 0;
      for (; j < css.length; j++) {
        const c = css[j];
        if (c === '"' || c === "'") { for (j++; j < css.length && css[j] !== c; j++) if (css[j] === '\\') j++; continue; }
        if (c === '(' || c === '[') depth++;
        else if (c === ')' || c === ']') depth--;
        else if (depth === 0 && (c === '{' || c === ';')) break;
      }
      const prelude = css.slice(i, j).trim();
      if (j >= css.length || css[j] === ';') { i = j + 1; continue; }
      const close = matching(css, j);
      const inner = css.slice(j + 1, close);
      if (prelude.startsWith('@')) {
        const name = /^@([\w-]+)/.exec(prelude)[1].toLowerCase();
        if (/keyframes$/.test(name)) out.keyframes.add(prelude.replace(/^@[\w-]+\s*/, '').replace(/^["']|["']$/g, ''));
        else if (name === 'font-face') { const f = /font-family\s*:\s*([^;}]+)/.exec(inner); if (f) out.fonts.add(f[1].trim().replace(/^["']|["']$/g, '')); }
        else if (['media', 'supports', 'container', 'layer', 'scope', 'document'].includes(name)) walk(inner);
      } else if (prelude) {
        out.rules.push({ selectors: splitTopLevel(prelude, ','), body: inner });
      }
      i = close + 1;
    }
  })(stripComments(text));
  return out;
}

/* ---------- what a selector asks of a page ---------- */
/* The names a selector requires: every `.class` and `#id` outside parentheses, the NAME of every data-*
   attribute it tests ([data-domains-form], [data-session="x"]: the page has to set it), and the value of
   [data-page=...] and [data-panel-page=...] (as `page:<key>`: the router sets those to the route). Nothing
   inside :not()/:is()/:where()/:has() (they only narrow or alternate), no tag, no pseudo. An empty set
   means the selector matches on any page. */
export function selectorNeeds(selector) {
  const needs = new Set();
  let i = 0;
  const ident = () => {
    let s = '';
    while (i < selector.length && /[\w-]|\\|[^\x00-\x7f]/.test(selector[i])) { if (selector[i] === '\\') i++; s += selector[i++]; }
    return s;
  };
  while (i < selector.length) {
    const c = selector[i];
    if (c === '\\') { i += 2; continue; }
    if (c === '(') { let depth = 0; for (; i < selector.length; i++) { if (selector[i] === '(') depth++; else if (selector[i] === ')' && --depth === 0) { i++; break; } } continue; }
    if (c === '[') {
      const end = selector.indexOf(']', i);
      const attr = selector.slice(i + 1, end < 0 ? selector.length : end);
      const m = /^\s*data-(?:panel-)?page\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s\]]+))/.exec(attr);
      const name = /^\s*([A-Za-z_][\w-]*)/.exec(attr);
      if (m) needs.add('page:' + (m[1] ?? m[2] ?? m[3]));
      else if (name && name[1].startsWith('data-')) needs.add(name[1]);
      i = end < 0 ? selector.length : end + 1; continue;
    }
    if (c === '.' || c === '#') { i++; const name = ident(); if (name) needs.add(name); continue; }
    if (c === ':') { i++; if (selector[i] === ':') i++; ident(); continue; }
    i++;
  }
  return needs;
}


/* ---------- the words of a source file ---------- */
/* What a script or a page of markup can NAME on the page: the class and id names, and the data-*
   attributes, it spells out. Read from string literals only (a class is always a string; an identifier
   or a comment's prose is not one), and only from literals that have the shape of a name list ('is-live
   card'), a bit of markup (class="a b", id="x", data-y="1"), or a selector ('.a > #b'). A sentence of
   copy has punctuation and capitals and names nothing: reading every word of every file made `.flow`
   present on any page whose text mentioned a flow. A name built from pieces ('dash-span-' + n) is NOT
   matched by prefix (that makes every dash-* class present because one is built): what only the running
   page builds is found by the DOM source (collectDom), and a sheet is linked when ANY of its rules finds
   its names, so a page's sheet comes with the literal class of its root. */
const LITERALS = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|'((?:\\.|[^'\\\n])*)'|"((?:\\.|[^"\\\n])*)"|`((?:\\.|[^`\\])*)`/g;
const kebab = (camel) => camel.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());

export class Vocabulary {
  constructor() { this.words = new Set(); }
  add(word) { if (/^[A-Za-z_][\w-]*$/.test(word)) this.words.add(word); return this; }
  /* class="a b", id="x", every name before = (data-y=, aria-z=), [data-w] selectors, .cls / #id selectors */
  addMarkup(text) {
    const flat = text.replace(/\$\{[^}]*\}/g, ' ');
    for (const m of flat.matchAll(/\bclass(?:Name)?\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+))/g)) (m[1] ?? m[2] ?? m[3]).split(/\s+/).forEach((w) => this.add(w));
    for (const m of flat.matchAll(/\bid\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+))/g)) this.add(m[1] ?? m[2] ?? m[3]);
    for (const m of flat.matchAll(/[\s<"'[]((?:data|aria)-[\w-]+)/g)) this.add(m[1]);
    if (/^[\s\w>+~,.#[\]:()="'*^$|-]+$/.test(flat) && /[.#[]/.test(flat)) for (const m of flat.matchAll(/[.#]([A-Za-z_][\w-]*)/g)) this.add(m[1]);
    return this;
  }
  addLiteral(body) {
    const plain = body.replace(/\$\{[^}]*\}/g, ' ');
    if (/^\s*[\w-]+(?:\s+[\w-]+)*\s*$/.test(plain)) {
      const tokens = plain.trim().split(/\s+/);
      if (tokens.length === 1 || tokens.every((t) => /^[a-z_]/.test(t))) tokens.forEach((t) => this.add(t));
    }
    if (/[<>.#[=]/.test(plain)) this.addMarkup(plain);
    return this;
  }
  addScript(text) {
    for (const m of text.matchAll(LITERALS)) { const body = m[1] ?? m[2] ?? m[3]; if (body !== undefined) this.addLiteral(body); }
    /* el.dataset.panelPage and el.dataset['panel-page'] set data-panel-page: no literal spells it */
    for (const m of text.matchAll(/\bdataset\.([A-Za-z_]\w*)/g)) this.add('data-' + kebab(m[1]));
    return this;
  }
  addPseudo(token) { this.words.add(token); return this; }
  union(other) { for (const w of other.words) this.words.add(w); return this; }
  has(name) { return this.words.has(name); }
}


/* ES modules a script names by literal path (import('...'), a lazy .mjs): they are in no scripts list, so
   they count as the file's own. Only .mjs: a plain 'js/...js' literal is a LIST of pages (the catalog,
   the loader), not a use, and following it would make every page part of the shell. */
function namedFiles(file, text) {
  const out = [];
  for (const m of text.matchAll(/['"`]((?:\.{1,2}\/|js\/)[\w./-]+\.mjs)(?:\?[^'"`]*)?['"`]/g)) {
    const target = m[1].startsWith('js/') ? m[1] : path.posix.normalize(path.posix.join(path.posix.dirname(file), m[1]));
    if (fs.existsSync(path.join(ROOT, target))) out.push(target);
  }
  return out;
}

export function vocabularyOf(files, cache = new Map()) {
  const vocabulary = new Vocabulary(), seen = new Set();
  const visit = (file) => {
    if (seen.has(file) || !fs.existsSync(path.join(ROOT, file))) return;
    seen.add(file);
    if (!cache.has(file)) cache.set(file, read(file));
    const text = cache.get(file);
    vocabulary.addScript(text);
    namedFiles(file, text).forEach(visit);
  };
  files.forEach(visit);
  return { vocabulary, files: [...seen] };
}

/* ---------- the catalog, as the site builds it ---------- */
/* Loads js/pages/catalog.js the way index.html does (tests/lib/site-catalog.cjs does too) and adds one
   sample article and one theory page, because those routes are derived from content registries the
   page builds at run time. */
export function loadCatalog() {
  // the editor's canvas (cms-preview=1) also registers its own routes (the Kit). They are read too, so their sheets are
  // placed like any other module's and are never orphans; editorOnly names their modules, which never decide `shared`
  // (what every visitor loads).
  const run = (search) => {
    const context = vm.createContext({ ArkUI: {}, ArkCopy: { text: (key) => key }, console, location: { search } });
    for (const file of ['js/content/learnings.js', 'js/content/article-index.js', 'js/content/resolutions.js', 'js/content/site-pages.js', 'js/pages/catalog.js'])
      vm.runInContext(read(file), context, { filename: file });
    return context.ArkUI;
  };
  const publicKeys = new Set(Object.keys(run('').pageCatalog));
  const ArkUI = run('?cms-preview=1');
  ArkUI.catalogContentRoutes([{ slug: 'sample-article', title: 'Sample', sections: [{}] }], [{ id: 'sample', route: '/sample' }]);
  const modules = new Map();
  for (const [key, entry] of Object.entries(ArkUI.pageCatalog)) {
    if (!modules.has(entry.module)) modules.set(entry.module, { keys: [], scripts: new Set() });
    const module = modules.get(entry.module);
    module.keys.push(key);
    entry.scripts.forEach((script) => module.scripts.add(script));
  }
  const editorOnly = new Set([...modules].filter(([, m]) => m.keys.every((key) => !publicKeys.has(key))).map(([name]) => name));
  return { catalog: ArkUI.pageCatalog, modules, editorOnly, order: ArkUI.styleOrder, pageStyles: ArkUI.pageStyles };
}

/* ---------- the derivation ---------- */
export function shellFiles(html = read('index.html')) {
  return [...html.matchAll(/<script\b[^>]*\bsrc="([^"?]+)/g)].map((m) => m[1]).filter((src) => /^js\/.*\.m?js$/.test(src));
}

function shellVocabulary(html, cache) {
  const { vocabulary, files } = vocabularyOf(shellFiles(html), cache);
  /* the static markup index.html carries (skip link, #scene, #fallback ...), without its own <script> text */
  vocabulary.addMarkup(html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, ''));
  return { vocabulary, files };
}

const satisfied = (needs, vocabulary) => [...needs].every((name) => vocabulary.has(name));

/* The sheets one vocabulary needs: a rule that finds its names, then (to a fixpoint) the sheets that
   provide an @keyframes / @font-face name a needed rule uses. `why` records the first rule that did it. */
function neededSheets(sheets, vocabulary, why) {
  const needed = new Set(), used = new Set();
  const useWords = (body) => body.split(/[\s,:;()"'/]+/).forEach((w) => w && used.add(w));
  for (const [file, sheet] of sheets) {
    for (const rule of sheet.rules) {
      const hit = rule.selectors.find((selector) => satisfied(selectorNeeds(selector), vocabulary));
      if (!hit) continue;
      needed.add(file); useWords(rule.body);
      if (!why.has(file)) why.set(file, { selector: hit, global: selectorNeeds(hit).size === 0 });
    }
  }
  for (let grew = true; grew;) {
    grew = false;
    for (const [file, sheet] of sheets) {
      if (needed.has(file)) continue;
      const provided = [...sheet.keyframes, ...sheet.fonts].filter((name) => used.has(name));
      if (!provided.length) continue;
      needed.add(file); grew = true;
      why.set(file, { selector: '@' + provided[0] + ' (used by a needed rule)', global: false });
      sheet.rules.forEach((rule) => rule.selectors.some((s) => satisfied(selectorNeeds(s), vocabulary)) && useWords(rule.body));
    }
  }
  return needed;
}

/* The public site's stylesheets: every css/ and assets/kit/ sheet except the ones another document (the
   editor, the broker page) links -- those are not index.html's to place. A sheet an editor page links AND a
   public page needs would be a public sheet: none is today, and the test names the rule. */
export function editorSheets() {
  const elsewhere = OTHER_DOCUMENTS.filter((f) => fs.existsSync(path.join(ROOT, f))).map(read).join('\n');
  const order = loadCatalog().order || [];
  return new Set([...elsewhere.matchAll(/href="((?:css|assets\/kit)\/[\w.-]+\.css)/g)].map((m) => m[1]).filter((f) => !order.includes(f)));
}
export function sheetFiles() {
  const editor = editorSheets(), files = [];
  for (const dir of ['css', 'assets/kit']) for (const f of fs.readdirSync(path.join(ROOT, dir)).sort()) if (f.endsWith('.css') && !editor.has(dir + '/' + f)) files.push(dir + '/' + f);
  return files;
}

export function gz(file) { return zlib.gzipSync(fs.readFileSync(path.join(ROOT, file)), { level: 9 }).length; }

/* What a module's page can show, from three independent sources, so that none of them has to be perfect:
     DOM       every class and id of the pages its routes really render (collectDom, jsdom). Sees what a
               shared library (the blocks, js/ark/dash-kit.js, page-kit) builds, which no reading of the
               page's own scripts can.
     SCRIPTS   every word of the files only this module loads (its scripts minus the shell's and minus
               what every module loads). Sees what the page builds later: a tab not yet opened, a dialog,
               a state the render does not reach.
     SHELL     the words the shell's files use and no page's file does: the header, the settings panel,
               the scene. They run on every route and build their parts on demand (a menu not yet open).
               A word a page file ALSO uses (scene-state.js names .home-hero-actions, home.js builds it)
               belongs to that page, not to the shell: that is what keeps the home sheets off every route.
   A shared library is read for neither of the last two: its words appear on every route whether or not
   the page uses them (dash-kit.js carries the stats dashboard's class names for all 29 modules). */
function vocabularies(html, loaded, cache) {
  const shellList = new Set(shellFiles(html));
  const perModule = new Map();
  for (const [name, module] of loaded.modules) perModule.set(name, vocabularyOf([...module.scripts], cache).files);
  /* what every module loads: the shared libraries. A page that stands on the 3D world (home and the intro load no
     Ark blocks, js/world2/world2-host.mjs) is left out of the intersection, or it would be empty and every library
     would be read as that module's own words. */
  const withBlocks = [...perModule.values()].filter((files) => files.includes('js/ark/blocks.js'));
  const common = withBlocks.reduce((all, files) => all.filter((f) => files.includes(f)));
  const specific = new Map();
  for (const [name, files] of perModule) specific.set(name, vocabularyOf(files.filter((f) => !shellList.has(f) && !common.includes(f)), new Map()).vocabulary);
  const anySpecific = new Vocabulary();
  specific.forEach((vocabulary) => anySpecific.union(vocabulary));
  const shell = shellVocabulary(html, cache).vocabulary;
  const shellOwned = new Vocabulary();
  for (const w of shell.words) if (!anySpecific.words.has(w)) shellOwned.words.add(w);
  return { specific, shellOwned, common };
}

/* { order, shared, modules: { module: [sheets in cascade order] }, why: Map(module -> Map(sheet -> rule)) }
   `dom` is collectDom()'s answer: Map(module -> Vocabulary of the classes and ids its routes render). */
export function derive({ html = read('index.html'), loaded = loadCatalog(), dom } = {}) {
  if (!dom) throw new Error('derive() needs dom, the classes each module renders: await collectDom() first (or read it from a test that already rendered the routes)');
  const cache = new Map();
  const order = loaded.order && loaded.order.length ? loaded.order.slice() : indexSheets(html).map((s) => s.file);
  /* a sheet a script links itself (lazySheets) is that script's, not a route's: left out of every list, even when it
     carries a global rule (css/nft-card.css's :root palette would otherwise put the card's sheet on every route) */
  const lazy = lazySheets(loaded, html);
  const sheets = new Map(order.filter((f) => !lazy.has(f) && fs.existsSync(path.join(ROOT, f))).map((f) => [f, parseSheet(read(f))]));
  const { specific, shellOwned } = vocabularies(html, loaded, cache);
  const perModule = new Map(), why = new Map();
  for (const [name, module] of loaded.modules) {
    const vocabulary = new Vocabulary().union(shellOwned).union(specific.get(name)).union(dom.get(name) || new Vocabulary());
    module.keys.forEach((key) => vocabulary.addPseudo('page:' + key));
    const reasons = new Map();
    perModule.set(name, neededSheets(sheets, vocabulary, reasons));
    why.set(name, reasons);
  }
  const editorOnly = loaded.editorOnly || new Set();
  const shared = order.filter((f) => [...perModule].every(([name, set]) => editorOnly.has(name) || set.has(f)));
  const modules = {};
  for (const [name, set] of perModule) modules[name] = order.filter((f) => set.has(f) && !shared.includes(f));
  return { order, shared, modules, why };
}

/* The router's layout pass lands one frame after ark:route-ready (tests/lib/layout-continuity.cjs): read
   the page after this long, in the derivation and in the test that holds it to account, alike. */
export const SETTLE_MS = 120;

/* The names a mounted page shows: every id, class and attribute name of the elements in its body. */
export function domWords(window) {
  const words = new Set();
  for (const el of window.document.body.querySelectorAll('*')) {
    if (el.id) words.add(el.id);
    for (const cls of el.classList) words.add(cls);
    for (const attribute of el.attributes) words.add(attribute.name);
  }
  return [...words];
}

/* Does `selector` match an element of `document`, whatever state the page is in? Pseudo-elements and the
   states a visit can pass through (:hover, :focus, :active ...) are dropped first, so `.a:hover::before`
   asks for `.a`. This is the independent reading the test holds the derivation to: it asks the DOM, where
   selectorNeeds() reads the selector's names. null when the selector cannot be asked (a vendor pseudo). */
const STATES = /::?(?:-webkit-|-moz-|-ms-|-o-)[\w-]+(?:\([^)]*\))?|::[\w-]+(?:\([^)]*\))?|:(?:hover|focus|focus-visible|focus-within|active|visited|link|any-link|target|target-within|autofill|placeholder-shown|fullscreen|popover-open|modal|user-invalid|user-valid)(?![\w-])/g;
export function matchesIn(document, selector) {
  let s = selector.replace(STATES, '');
  for (let before = ''; before !== s;) { before = s; s = s.replace(/:(?:is|where|not|has)\(\s*(?:,\s*)*\)/g, ''); }
  s = s.replace(/[\s>+~]+$/, '').trim();
  try { return document.querySelector(s || '*') !== null; } catch { return null; }
}

/* Renders every route of the real catalog through the server render's jsdom (api/lib/render-core.mjs,
   the one render path) and collects the classes and ids of what each page mounted. Sequential: one jsdom
   at a time (about a second a route on an idle M-series Mac). Returns Map(module -> Vocabulary). */
export async function collectDom({ html = read('index.html'), suffix = '', onRoute } = {}) {
  const { inspectDocument, createLocalResources } = await import(pathToFileURL(path.join(ROOT, 'api/lib/render-core.mjs')).href);
  const collect = domWords;
  const options = (url) => ({ html, url: 'https://defxn.com' + url, resources: createLocalResources(ROOT), root: ROOT, timeoutMs: 60000 });
  const entries = await inspectDocument(options('/'), async (window) => JSON.parse(JSON.stringify(Object.values(window.ArkUI.pageCatalog).map((e) => ({ path: e.path, module: e.module })))));
  const dom = new Map();
  for (const entry of entries) {
    /* a boot that times out on a loaded machine is retried, with the wait it was given doubled: a render
       that failed because the page is broken fails the same way three times and the error stands */
    let words;
    for (let attempt = 0; ; attempt++) {
      try {
        words = await inspectDocument({ ...options(entry.path + suffix), timeoutMs: 60000 * 2 ** attempt }, async (window) => { await new Promise((r) => window.setTimeout(r, SETTLE_MS)); return collect(window); });
        break;
      } catch (error) {
        if (attempt >= 2 || !/Timed out/.test(String(error && error.message))) throw error;
      }
    }
    if (!dom.has(entry.module)) dom.set(entry.module, new Vocabulary());
    words.forEach((w) => dom.get(entry.module).words.add(w));
    if (onRoute) onRoute(entry.path, words.length);
  }
  return dom;
}

/* ---------- the generated block ---------- */
const quote = (s) => "'" + s + "'";
export function renderBlock(result) {
  const list = (files) => '[' + files.map(quote).join(', ') + ']';
  const lines = [
    BEGIN + ' -- generated by `node scripts/page-styles.mjs --write`; `--check` fails on drift. Do not edit by hand:',
    "   change a page's scripts or a stylesheet's selectors and regenerate. shared = linked in index.html (every route",
    '   needs it); modules = what a page module adds, in cascade order (ArkUI.styleOrder). The header of that script says how. */',
    'ArkUI.pageStyles = {',
    '  shared: ' + list(result.shared) + ',',
    '  modules: {'
  ];
  const names = Object.keys(result.modules);
  names.forEach((name, n) => lines.push('    ' + (/^[a-z]\w*$/i.test(name) ? name : quote(name)) + ': ' + list(result.modules[name]) + (n < names.length - 1 ? ',' : '')));
  lines.push('  }', '};', END);
  return lines.join('\n');
}

export function blockIn(catalogText) {
  const start = catalogText.indexOf(BEGIN), end = catalogText.indexOf(END);
  if (start < 0 || end < 0) return null;
  return { start, end: end + END.length, text: catalogText.slice(start, end + END.length) };
}

/* index.html with its stylesheet links set to `shared`: links that stay keep their line (and ?v=), links
   that leave go, a sheet that arrived is added in cascade order with `version`. */
export function renderIndex(html, result, version) {
  const href = (line) => (/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"?]+)/.exec(line) || /<link\b[^>]*\bhref="([^"?]+)[^>]*\brel="stylesheet"/.exec(line) || [])[1];
  const lines = html.split('\n').filter((line) => { const file = href(line); return !file || result.shared.includes(file); });
  const linked = new Set(lines.map(href).filter(Boolean));
  for (const file of result.shared) {
    if (linked.has(file)) continue;
    const later = result.shared.slice(result.shared.indexOf(file) + 1).find((f) => linked.has(f));
    const at = later ? lines.findIndex((line) => href(line) === later) : lines.findIndex((line) => line.includes('</head>'));
    lines.splice(at, 0, `<link rel="stylesheet" href="${file}?v=${version}" />`);
    linked.add(file);
  }
  return lines.join('\n');
}

export function pageAssetVersion() { return /var pageAssetVersion = '([^']+)'/.exec(read('js/ark/page-loader.js'))[1]; }

/* Sheets a page script links itself, when it shows a part only some visits need (ArkUI.loadSheet('css/...') with a
   literal path; js/ark/profile-card.js loads the NFT card's sheet that way). No route needs them on load, so they are
   in no derived list; they are used, so they are not orphans. Read from the scripts the catalog's routes load and the
   scripts the shell (index.html) loads on every route (js/ark/skin-site.js links the card skin's own sheet). */
export function lazySheets(loaded = loadCatalog(), html = read('index.html')) {
  const out = new Set(), cache = new Map(), scripts = new Set(shellFiles(html));
  for (const module of loaded.modules.values()) module.scripts.forEach((file) => scripts.add(file));
  for (const file of vocabularyOf([...scripts], cache).files) {
    for (const m of cache.get(file).matchAll(/ArkUI\.loadSheet\(\s*['"]((?:css|assets\/kit)\/[\w.-]+\.css)['"]/g)) out.add(m[1]);
  }
  return out;
}

/* ---------- checks ---------- */
export async function problems({ html = read('index.html'), catalogText = read('js/pages/catalog.js'), dom } = {}) {
  const found = [];
  const loaded = loadCatalog();
  const files = sheetFiles();
  const order = loaded.order || [];
  if (!order.length) found.push('js/pages/catalog.js has no ArkUI.styleOrder (the cascade order of every sheet)');
  for (const f of files) if (!order.includes(f)) found.push(`${f} is not in ArkUI.styleOrder: add it where it belongs in the cascade (node scripts/page-styles.mjs --write puts it before css/ark-blocks.css)`);
  for (const f of order) if (!fs.existsSync(path.join(ROOT, f))) found.push(`ArkUI.styleOrder names ${f}, which does not exist`);
  if (found.length) return found;
  const result = derive({ html, loaded, dom: dom || await collectDom({ html }) });
  const block = blockIn(catalogText);
  if (!block) found.push('js/pages/catalog.js has no derived page styles block: run node scripts/page-styles.mjs --write');
  else if (block.text !== renderBlock(result)) found.push('the derived page styles block in js/pages/catalog.js is stale: run node scripts/page-styles.mjs --write (a script list or a stylesheet changed)');
  const linked = indexSheets(html).map((s) => s.file);
  if (JSON.stringify(linked) !== JSON.stringify(result.shared)) {
    found.push(`index.html links [${linked.filter((f) => !result.shared.includes(f)).join(', ')}] that do not belong there and lacks [${result.shared.filter((f) => !linked.includes(f)).join(', ')}] (or links them out of cascade order): run node scripts/page-styles.mjs --write`);
  }
  if (linked[linked.length - 1] !== 'css/components.css') found.push(`css/components.css must be the last stylesheet index.html links (it decides interactive paint), not ${linked[linked.length - 1]}`);
  const claimed = new Set([...result.shared, ...Object.values(result.modules).flat(), ...lazySheets(loaded, html)]);
  for (const f of files) if (!claimed.has(f)) found.push(`${f} is orphaned: no page module needs it, index.html does not link it and no other document does. Delete it, or give a page the class it styles`);
  return found;
}

/* ---------- CLI ---------- */
function report(result) {
  const size = (files) => files.reduce((n, f) => n + gz(f), 0);
  const kb = (n) => (n / 1024).toFixed(1).padStart(6) + ' KB';
  console.log(`shared (index.html, ${result.shared.length} sheets): ${kb(size(result.shared))} gz`);
  for (const [name, files] of Object.entries(result.modules)) console.log(`  ${name.padEnd(16)} +${kb(size(files))} gz  ${files.map((f) => path.basename(f, '.css')).join(' ')}`);
}


/* Development convenience: --dom-cache <file> keeps collectDom()'s answer between runs (one line per
   module: the module, a tab, its words). --check never reads a cache. */
function readDomCache(file) {
  const dom = new Map();
  for (const line of fs.readFileSync(file, 'utf8').split('\n').filter(Boolean)) {
    const [name, words] = line.split('\t');
    dom.set(name, new Vocabulary());
    words.split(' ').forEach((w) => dom.get(name).words.add(w));
  }
  return dom;
}
function writeDomCache(file, dom) { fs.writeFileSync(file, [...dom].map(([name, v]) => name + '\t' + [...v.words].join(' ')).join('\n') + '\n'); }
async function domFor(args) {
  const at = args.indexOf('--dom-cache');
  const file = at >= 0 ? args[at + 1] : null;
  if (file && fs.existsSync(file)) return readDomCache(file);
  const dom = await collectDom({ onRoute: (route, n) => process.stderr.write(`  rendered ${route} (${n} names)\n`) });
  if (file) writeDomCache(file, dom);
  return dom;
}

/* What a cold load of each route fetches in CSS: before = every sheet in ArkUI.styleOrder (what index.html
   linked on every route until 2026-10-20), after = the shared sheets + the route's own. `gzip -9` of each
   file on its own, summed (a cold load fetches them as separate responses), plus the raw bytes and the
   request count. The device is the Mac this runs on: the numbers are byte counts, so they do not depend on it. */
export function sizes() {
  const { catalog, order, pageStyles } = loadCatalog();
  const raw = (files) => files.reduce((n, f) => n + fs.statSync(path.join(ROOT, f)).size, 0);
  const gzip = (files) => files.reduce((n, f) => n + gz(f), 0);
  const rows = [];
  for (const [key, entry] of Object.entries(catalog)) {
    const files = pageStyles.shared.concat(entry.styles || []);
    rows.push({ route: entry.path, key, module: entry.module, requests: files.length, gzAfter: gzip(files), rawAfter: raw(files), gzBefore: gzip(order), rawBefore: raw(order), requestsBefore: order.length });
  }
  return rows;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--sizes')) {
    const kb = (n) => (n / 1024).toFixed(1).padStart(6);
    const rows = sizes();
    console.log('route'.padEnd(34) + 'module'.padEnd(16) + 'gz before   gz after   saved   raw before  raw after  requests');
    for (const r of rows) console.log(r.route.padEnd(34) + r.module.padEnd(16) + `${kb(r.gzBefore)} KB  ${kb(r.gzAfter)} KB  ${kb(r.gzBefore - r.gzAfter)}  ${kb(r.rawBefore)} KB  ${kb(r.rawAfter)} KB  ${r.requestsBefore} -> ${r.requests}`);
    const mean = (f) => rows.reduce((n, r) => n + f(r), 0) / rows.length;
    console.log(`mean over ${rows.length} routes: ${kb(mean((r) => r.gzBefore))} KB -> ${kb(mean((r) => r.gzAfter))} KB gz`);
    return;
  }
  if (args.includes('--why')) {
    const file = args[args.indexOf('--why') + 1];
    for (const [name, reasons] of derive({ dom: await domFor(args) }).why) { const r = reasons.get(file); console.log(name.padEnd(16), r ? `${r.global ? 'GLOBAL ' : ''}${r.selector}` : '-'); }
    return;
  }
  if (args.includes('--write')) {
    let catalogText = read('js/pages/catalog.js');
    const missing = sheetFiles().filter((f) => !(loadCatalog().order || []).includes(f));
    if (missing.length) {
      const m = /ArkUI\.styleOrder = \[([\s\S]*?)\];/.exec(catalogText);
      if (!m) throw new Error('js/pages/catalog.js has no ArkUI.styleOrder to extend');
      catalogText = catalogText.replace(m[0], 'ArkUI.styleOrder = [' + m[1].replace(/'css\/ark-blocks\.css'/, missing.map(quote).join(', ') + ", 'css/ark-blocks.css'") + '];');
      fs.writeFileSync(path.join(ROOT, 'js/pages/catalog.js'), catalogText);
      console.log('placed in the cascade before css/ark-blocks.css: ' + missing.join(', '));
    }
    const result = derive({ loaded: loadCatalog(), dom: await domFor(args) });
    const block = blockIn(catalogText);
    if (!block) throw new Error('js/pages/catalog.js has no derived page styles block to replace');
    catalogText = catalogText.slice(0, block.start) + renderBlock(result) + catalogText.slice(block.end);
    fs.writeFileSync(path.join(ROOT, 'js/pages/catalog.js'), catalogText);
    fs.writeFileSync(path.join(ROOT, 'index.html'), renderIndex(read('index.html'), result, pageAssetVersion()));
    report(result);
    return;
  }
  if (args.includes('--check')) {
    const found = await problems();
    if (found.length) { console.error(found.map((p) => 'FAIL: ' + p).join('\n')); process.exit(1); }
    console.log('page styles: the derived block, index.html and the cascade order agree; no orphan stylesheet');
    return;
  }
  report(derive({ dom: await domFor(args) }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { console.error(error); process.exit(1); });
