#!/usr/bin/env node
/* =====================================================================
   SHELL BUNDLE -- the page frame's scripts as a few files instead of ~120.
   ---------------------------------------------------------------------
     node scripts/build-shell.cjs            build js/bundle/shell-<n>.js and rewrite the live
                                             <!-- shell:begin --> ... <!-- shell:end --> region of index.html
     node scripts/build-shell.cjs --check    build in memory, write nothing, exit 1 on any drift
                                             (scripts/build-ark-vendor.cjs runs it after its own outputs)

   WHY. Measured 2026-11-09 (this Mac, 8 GB, headless Chrome, the local server on loopback and on a throttled
   10 Mbit/s 40 ms link): the shell asked for 151 script files (592 KB compressed) before the navbar or a page
   word could paint; on the throttled link the header painted at 1.9 s and the page's words at 2.2 s, most of it
   round trips, not bytes. One request per file is the dominant cost of the frame, so the files become a few.

   SOURCE OF TRUTH. index.html keeps the full, ordered script list inside <template id="shell-sources">: a
   template's scripts are inert (never fetched or run), so the list is read by this build, by
   scripts/page-styles.mjs (the shell's vocabulary) and by a reader, while the browser runs only the live
   region this build writes from it. The order is the dependency order the comments there explain; the build
   never reorders.

   WHAT STAYS LIVE (its own tag, in its place in the order), because bundling it would change its behaviour:
     - a loader that calls document.write (js/content/manifests|assets|secrets/index.js): the tags it writes
       land at its own position in the parse, between the chunks, exactly as today; the content files it lists
       are what the admin editor rewrites, so they are never baked into a bundle
     - a file marked data-shell="live": one that reads document.currentScript (js/ark/vendor/backgrounds.js),
       one synced by another tool whose bytes move on their own (assets/kit/defxn-product.js), one that must
       keep its own strict mode (js/ark/vendor/engines.js); js/min/manifest.js is live by its path, because
       scripts/lib/page-scripts.cjs stamps its ?v= with a regex that allows no other attribute on its tag
     - a module script (type="module"): its graph is its own
   Everything else is concatenated in order into a chunk, each file minified on its own by esbuild (the same
   es2018 pass scripts/build-ark-vendor.cjs gives the page scripts; a file esbuild cannot parse goes in as
   written and the build says so). Classic scripts share one global scope whether they arrive as one file or
   many, so the concatenation is the same program: top-level var and function declarations stay global and
   top-level names are not renamed (esbuild renames nothing at the top level of a script).

   The one semantic change: a 'use strict' directive at the top of a file that is not first in its chunk no
   longer applies (only a chunk's first statement is a directive). engines.js keeps its own tag for that
   reason; no other shell file starts with one (checked by this build: it refuses to bundle one that does).

   OUTPUT. js/bundle/shell-<n>.js (n from 1, in order), each with a header naming its sources; the live region
   of index.html: <script src="js/bundle/shell-1.js?v=<8 hex of the bytes>" defer></script>, the live tags, the
   next chunk ... so a changed byte changes the URL. The directory is not js/min: scripts/build-ark-vendor.cjs
   deletes any js/min file no catalog script builds, and these are not catalog scripts.
   ===================================================================== */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const OUT_DIR = 'js/bundle';
const BEGIN = '<!-- shell:begin -->', END = '<!-- shell:end -->';

/* THE PAGE MANIFESTS RIDE IN THE CHUNK (2026-11-11, speed lane 1). Layer: app (the site's build).
   Before: js/content/manifests/index.js wrote one <script> per manifest with document.write, 26 requests on every route.
   Now: the template holds a GENERATED block, one tag per id of that file's ArkManifestIds, so the manifests are bundled like
   any other shell source. The list is derived from the id list, never typed: this build rewrites the block, --check fails on
   drift. The loader's own tag stays live after the block and carries &bundled=1: it then writes nothing on a public page and
   still writes every manifest fresh in the editor's canvas (?cms-preview, ?preview), where a saved word must show at once. */
const MANIFESTS_BEGIN = '<!-- manifests:begin', MANIFESTS_END = '<!-- manifests:end -->';
const MANIFEST_LOADER = 'js/content/manifests/index.js';

function manifestBlock() {
  const loader = fs.readFileSync(path.join(ROOT, MANIFEST_LOADER), 'utf8');
  const found = /var ArkManifestIds = (\[[^;]+\]);/.exec(loader);
  if (!found) throw new Error(MANIFEST_LOADER + ' has no `var ArkManifestIds = [...]` line. Needed: the id list the manifests are bundled from. Remedy: restore the line (the admin editor writes it, js/admin/store.js indexText).');
  const ids = JSON.parse(found[1]).filter((id) => /^[a-z][a-z0-9]*$/.test(id));
  for (const id of ids) if (!fs.existsSync(path.join(ROOT, 'js/content/manifests/' + id + '.js'))) throw new Error('manifest file missing: js/content/manifests/' + id + '.js. Remedy: restore the file or take "' + id + '" out of ArkManifestIds in ' + MANIFEST_LOADER + '.');
  return MANIFESTS_BEGIN + ' generated by scripts/build-shell.cjs from ArkManifestIds in ' + MANIFEST_LOADER + '. Do not edit: change that list and run the build. -->\n' +
    ids.map((id) => '<script src="js/content/manifests/' + id + '.js" defer></script>').join('\n') + '\n' + MANIFESTS_END;
}

/* index.html with its generated manifest block brought up to date; a document with no block is returned as it is */
function withManifests(html) {
  const a = html.indexOf(MANIFESTS_BEGIN), b = html.indexOf(MANIFESTS_END);
  if (a < 0 || b < a) return html;
  return html.slice(0, a) + manifestBlock() + html.slice(b + MANIFESTS_END.length);
}

/* THE SHARED STYLESHEETS AS A FEW FILES (2026-11-11, speed lane 1). Layer: app (the site's build).
   Before: index.html linked each shared sheet by itself, 32 render-blocking requests on every route.
   Now: <template id="shell-styles"> holds that list (inert: scripts/page-styles.mjs derives and rewrites it, as before), and this
   build writes the live <!-- styles:begin --> ... <!-- styles:end --> region from it: css/bundle/shell-<n>.css, each the listed
   sheets in the listed order, minified one by one by esbuild, a relative url() re-based to the chunk's folder.
   The cascade is the same: the sheets keep their order, and a chunk ENDS wherever a sheet that is not shared stands next in
   ArkUI.styleOrder (js/pages/catalog.js), so the page loader can still link a page's own sheet at its exact place, between two
   chunks (js/ark/page-loader.js placeSheet reads data-ark-sheets to know which chunk carries which sheet). */
const STYLES_BEGIN = '<!-- styles:begin -->', STYLES_END = '<!-- styles:end -->';
const STYLE_DIR = 'css/bundle';

function styleSources(html) {
  const tpl = /<template id="shell-styles"[^>]*>([\s\S]*?)<\/template>/.exec(html);
  if (!tpl) return null;
  return [...tpl[1].matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*>/g)].map((m) => {
    const href = /\bhref="([^"?]+)/.exec(m[0]);
    if (!href) throw new Error('a stylesheet link in the shell-styles template has no href: ' + m[0]);
    return href[1];
  });
}

function cascadeOrder() {
  const found = /ArkUI\.styleOrder = \[([\s\S]*?)\];/.exec(fs.readFileSync(path.join(ROOT, 'js/pages/catalog.js'), 'utf8'));
  if (!found) throw new Error('js/pages/catalog.js has no ArkUI.styleOrder. Needed: the cascade order, to know where a page sheet stands between the shared ones. Remedy: restore the list (scripts/page-styles.mjs explains it).');
  return [...found[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

/* a relative url() of `file`, written so it resolves the same from the chunk's folder */
function rebase(css, file) {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (all, quote, ref) => {
    if (/^(?:data:|blob:|[a-z][a-z0-9+.-]*:|\/|#)/i.test(ref)) return all;
    return 'url(' + quote + path.posix.relative(STYLE_DIR, path.posix.normalize(path.posix.join(path.posix.dirname(file), ref))) + quote + ')';
  });
}

function minifyStyle(file, text, tool, notes) {
  if (/@import\b|@charset\b|@namespace\b/.test(text.replace(/\/\*[\s\S]*?\*\//g, ''))) throw new Error(file + ' holds @import, @charset or @namespace, which must open a stylesheet and cannot ride inside a chunk. Remedy: move the rule out of the sheet, or take the sheet out of the shared list.');
  const based = rebase(text, file);
  if (!tool) { notes.push(file + ': esbuild not installed, bundled as written'); return based; }
  try {
    return tool.transformSync(based, { loader: 'css', minify: true, legalComments: 'none' }).code;
  } catch (error) {
    notes.push(file + ': not minified (' + String(error && error.message || error).split('\n')[0] + '), bundled as written');
    return based;
  }
}

/* { chunks: [{ out, bytes, files }], region, notes }, or null for a document with no shell-styles template */
function planStyles(html) {
  const shared = styleSources(html);
  if (!shared) return null;
  const order = cascadeOrder(), tool = esbuild(), notes = [], chunks = [], region = [];
  let pending = [], last = -1;
  const flush = () => {
    if (!pending.length) return;
    const n = chunks.length + 1, out = STYLE_DIR + '/shell-' + n + '.css';
    const head = '/* Generated by scripts/build-shell.cjs from index.html\'s shell-styles template. Do not edit; the sources are canonical.\n   Sources, in order:\n' + pending.map((f) => '     ' + f).join('\n') + ' */\n';
    const body = pending.map((f) => '\n/* ---- ' + f + ' ---- */\n' + minifyStyle(f, fs.readFileSync(path.join(ROOT, f), 'utf8'), tool, notes).trim()).join('\n');
    const bytes = Buffer.from(head + body + '\n', 'utf8');
    chunks.push({ out, bytes, files: pending.slice() });
    region.push('<link rel="stylesheet" href="' + out + '?v=' + crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 8) + '" data-ark-sheets="' + pending.join(' ') + '" />');
    pending = [];
  };
  for (const file of shared) {
    if (!fs.existsSync(path.join(ROOT, file))) throw new Error('shared stylesheet missing: ' + file + '. Remedy: fix the link in index.html\'s shell-styles template (node scripts/page-styles.mjs --write derives it) or restore the file.');
    const at = order.indexOf(file);
    /* a chunk ends where a sheet that is not shared stands between this one and the one before it in the cascade order, and where
       the template's order and the cascade order disagree: there the page loader may have to link a sheet between the two */
    const between = at > last && last >= 0 ? order.slice(last + 1, at).some((f) => !shared.includes(f)) : true;
    if (pending.length && between) flush();
    pending.push(file); last = at;
  }
  flush();
  return { chunks, region: STYLES_BEGIN + '\n' + region.join('\n') + '\n' + STYLES_END, notes, files: shared };
}

function regionOf(html, begin, end, what) {
  const a = html.indexOf(begin), b = html.indexOf(end);
  if (a < 0 || b < a) throw new Error('index.html has no ' + begin + ' ... ' + end + ' region. Remedy: add the two markers ' + what + '.');
  return { a, b: b + end.length, text: html.slice(a, b + end.length) };
}

function esbuild() {
  try { return require('esbuild'); } catch (error) { return null; }
}

/* the ordered tags of the template: [{ src, attrs, module, live }] */
function sources(html) {
  const tpl = /<template id="shell-sources"[^>]*>([\s\S]*?)<\/template>/.exec(html);
  if (!tpl) throw new Error('index.html has no <template id="shell-sources">. Needed: the ordered shell script list inside that template. Remedy: see the header of scripts/build-shell.cjs.');
  const out = [];
  for (const m of tpl[1].matchAll(/<script\b([^>]*)><\/script>/g)) {
    const attrs = m[1];
    const src = /\bsrc="([^"]+)"/.exec(attrs);
    if (!src) continue;
    const file = src[1].split('?')[0];
    const text = fs.existsSync(path.join(ROOT, file)) ? fs.readFileSync(path.join(ROOT, file), 'utf8') : null;
    if (text === null) throw new Error('shell source missing: ' + file + '. Remedy: fix the path in index.html\'s shell-sources template or restore the file.');
    const module = /\btype="module"/.test(attrs);
    const writes = /document\.write\(/.test(text);
    /* js/min/manifest.js is live by its path: scripts/lib/page-scripts.cjs stamps its ?v= by a regex that allows no other attribute on the tag */
    const live = module || writes || /\bdata-shell="live"/.test(attrs) || file === 'js/min/manifest.js';
    out.push({ src: src[1], file, text, attrs: attrs.trim(), module, live, writes });
  }
  if (!out.length) throw new Error('the shell-sources template lists no scripts');
  return out;
}

function minify(entry, tool, notes) {
  if (/^\s*(['"])use strict\1\s*;/.test(entry.text)) throw new Error(entry.file + " starts with 'use strict' and would lose it inside a chunk. Remedy: give its tag data-shell=\"live\" in index.html.");
  if (!tool) { notes.push(entry.file + ': esbuild not installed, bundled as written'); return entry.text; }
  try {
    return tool.transformSync(entry.text, { loader: 'js', minify: true, legalComments: 'none', target: 'es2018' }).code;
  } catch (error) {
    notes.push(entry.file + ': not minified (' + String(error && error.message || error).split('\n')[0] + '), bundled as written');
    return entry.text;
  }
}

/* the build, in memory: { chunks: [{ out, bytes, files }], region, notes } */
function plan(html) {
  const list = sources(html);
  const tool = esbuild(), notes = [];
  const chunks = [];
  const region = [];
  let pending = [];
  const flush = () => {
    if (!pending.length) return;
    const n = chunks.length + 1;
    const out = OUT_DIR + '/shell-' + n + '.js';
    const head = '/* Generated by scripts/build-shell.cjs from index.html\'s shell-sources template. Do not edit; the sources are canonical.\n   Sources, in order:\n' + pending.map((e) => '     ' + e.file).join('\n') + ' */\n';
    const body = pending.map((e) => '\n/* ---- ' + e.file + ' ---- */\n' + minify(e, tool, notes).trim()).join('\n;');
    const bytes = Buffer.from(head + body + '\n', 'utf8');
    chunks.push({ out, bytes, files: pending.map((e) => e.file) });
    region.push('<script src="' + out + '?v=' + crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 8) + '" defer></script>');
    pending = [];
  };
  /* A live tag is written in one canonical shape, src first: api/lib/render-core.mjs finds the three content loaders by
     `<script src="js/content/.../index.js` and expands them for jsdom, and it must find the LIVE tag, not the template's
     copy, so the template writes those three with an attribute before src (see the template's comment). */
  const liveTag = (entry) => '<script src="' + entry.src + '"' + (entry.module ? ' type="module"' : '') + (/\bdata-shell="live"/.test(entry.attrs) ? ' data-shell="live"' : '') + (/\bdefer\b/.test(entry.attrs) ? ' defer' : '') + '></script>';
  for (const entry of list) {
    if (entry.live) { flush(); region.push(liveTag(entry)); }
    else pending.push(entry);
  }
  flush();
  return { chunks, region: BEGIN + '\n' + region.join('\n') + '\n' + END, notes };
}

function currentRegion(html) {
  const a = html.indexOf(BEGIN), b = html.indexOf(END);
  if (a < 0 || b < a) throw new Error('index.html has no ' + BEGIN + ' ... ' + END + ' region. Remedy: add the two markers where the shell scripts run (after the template).');
  return { a, b: b + END.length, text: html.slice(a, b + END.length) };
}

/* THE HOME HERO'S WORDS IN THE SHELL (2026-11-11, speed lane 1C). Layer: app (the site's build).
   Why: the home's words must read at the first paint. Measured on the build node behind Caddy (5 cold loads a cell): the first paint
   came at 140 ms (cable) and 680 to 810 ms (slow 4G), but the headline was built by js/pages/intro.js after every shell chunk, so it
   read at 600 ms and 2,200 ms, and at 848 ms and 4,563 ms once the 3D frame's files went down the line before the chunks.
   Now: index.html carries the words as markup in a GENERATED region, written here by the page's own writer (ArkTopics.heroFirst,
   js/content/topics.js, run in a bare context) from the manifest's words (HOME.LANDING.*, js/content/manifests/home.js) and the
   Learn page's path (js/content/site-pages.js). Nothing is typed: change the manifest and run the build; --check fails on drift.
   js/loader-plaza.js shows the region on the home only, and js/pages/intro.js takes its nodes into the page. */
const HERO_BEGIN = '<!-- hero-words:begin', HERO_END = '<!-- hero-words:end -->';
const HOME_MANIFEST = 'js/content/manifests/home.js', TOPICS_FILE = 'js/content/topics.js', SITE_PAGES = 'js/content/site-pages.js';

function heroBlock() {
  const text = fs.readFileSync(path.join(ROOT, HOME_MANIFEST), 'utf8'), open = 'ArkManifest.define(', a = text.indexOf(open), b = text.lastIndexOf(')');
  let fields = null;
  try { fields = JSON.parse(text.slice(a + open.length, b)).fields; } catch (error) { fields = null; }
  if (a < 0 || !fields) throw new Error(HOME_MANIFEST + ' could not be read as ArkManifest.define({ valid JSON }). Needed: the home\'s words for the hero-words region of index.html. Remedy: make the object valid JSON again (admin.html writes it so).');
  const read = (role) => {
    const field = fields['LANDING.' + role];
    if (!field || typeof field.value !== 'string' || !field.value) throw new Error(HOME_MANIFEST + ' has no words for LANDING.' + role + '. Needed: the home hero shows them at the first paint. Remedy: add the field, or change heroSpec in ' + TOPICS_FILE + ' if the hero no longer shows it.');
    return field.value;
  };
  const learn = /\{ key: 'learn', path: '([^']+)'/.exec(fs.readFileSync(path.join(ROOT, SITE_PAGES), 'utf8'));
  if (!learn) throw new Error(SITE_PAGES + " has no row { key: 'learn', path: '...' }. Needed: where the hero's two buttons go. Remedy: restore the row, or change this pattern with it.");
  let topics;
  try { topics = require('node:vm').runInNewContext(fs.readFileSync(path.join(ROOT, TOPICS_FILE), 'utf8') + '\n;ArkTopics', {}, { filename: TOPICS_FILE }); }
  catch (error) { throw new Error(TOPICS_FILE + ' did not run in a bare context (' + String(error && error.message || error).split('\n')[0] + '). Needed: ArkTopics.heroFirst, the one writer of the hero\'s words. Remedy: keep the file\'s top level free of window, document and other files\' names (use them inside functions only).'); }
  if (!topics || typeof topics.heroFirst !== 'function' || typeof topics.heroSpec !== 'function') throw new Error(TOPICS_FILE + ' has no ArkTopics.heroFirst or ArkTopics.heroSpec. Needed: the one writer of the hero\'s words. Remedy: restore them, or take the hero-words markers out of index.html.');
  return HERO_BEGIN + ' generated by scripts/build-shell.cjs from HOME.LANDING.* in ' + HOME_MANIFEST + ' through ArkTopics.heroFirst (' + TOPICS_FILE + '). Do not edit: change the words in the manifest and run the build. -->\n' +
    topics.heroFirst(topics.heroSpec(read, learn[1])) + '\n' + HERO_END;
}

/* index.html with its generated hero-words region brought up to date; a document with no region is returned as it is */
function withHero(html) {
  const a = html.indexOf(HERO_BEGIN), b = html.indexOf(HERO_END);
  if (a < 0 || b < a) return html;
  return html.slice(0, a) + heroBlock() + html.slice(b + HERO_END.length);
}

/* THE SHELL'S SCRIPTS ARE ASKED FOR TOGETHER (2026-11-11, speed lane 1C). Layer: app (the site's build).
   Why: the browser found the shell's scripts one after another. Read from the build node's request lists (Chrome 150, this page's own
   <meta> CSP: nothing was asked ahead of the parser): each script that stops the parser (the stage, the three content loaders) was asked
   only when the one before it had come, and the chunks after them later still. Cold on cable shell-3.js, which holds the router, left at
   252 ms; on slow 4G at 1,240 ms, four round trips after the load screen's script.
   Now: a GENERATED region right after js/loader-plaza.js names every script the page runs after it as <link rel="preload" as="script">,
   with the tag's own address, so they are all asked at once and each tag then finds its file there. The list is FOUND, never typed:
   every <script src> that stands after the region and outside a <template> (a module script is left out: it has its own kind of
   preload and the shell has none). The region stands AFTER the load screen's script on purpose: that script shows the home's words,
   and nothing may share the line with it. --check fails on drift. */
const PRELOAD_BEGIN = '<!-- shell-preload:begin', PRELOAD_END = '<!-- shell-preload:end -->';

function preloadBlock(html) {
  const b = html.indexOf(PRELOAD_END);
  const after = html.slice(b + PRELOAD_END.length).replace(/<template\b[\s\S]*?<\/template>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  const list = [...after.matchAll(/<script\b([^>]*)>/g)].map((m) => m[1]).filter((attrs) => !/\btype="module"/.test(attrs)).map((attrs) => (/\bsrc="([^"]+)"/.exec(attrs) || [])[1]).filter(Boolean);
  return PRELOAD_BEGIN + ' generated by scripts/build-shell.cjs: one line for each <script src> that stands after this region. Do not edit: run the build. -->\n' +
    [...new Set(list)].map((src) => '<link rel="preload" as="script" href="' + src + '" />').join('\n') + '\n' + PRELOAD_END;
}

/* index.html with its generated preload region brought up to date; a document with no region is returned as it is */
function withPreloads(html) {
  const a = html.indexOf(PRELOAD_BEGIN), b = html.indexOf(PRELOAD_END);
  if (a < 0 || b < a) return html;
  return html.slice(0, a) + preloadBlock(html) + html.slice(b + PRELOAD_END.length);
}

function gz(bytes) { return zlib.brotliCompressSync(bytes, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 6 } }).length; }

function build({ check = false, log = console.log } = {}) {
  let html = fs.readFileSync(INDEX, 'utf8');
  let drift = 0;
  /* the generated manifest block first: the script plan reads the template it stands in */
  const blocked = withManifests(html);
  if (blocked !== html) {
    if (check) { console.error('[build-shell] DRIFT index.html manifest block (the id list in ' + MANIFEST_LOADER + ' changed); run node scripts/build-shell.cjs'); drift += 1; }
    else { fs.writeFileSync(INDEX, blocked); log('[build-shell] rewrote the index.html manifest block from ' + MANIFEST_LOADER); }
    html = blocked;
  }
  /* the shared stylesheets: their chunks and their live region */
  const styles = planStyles(html);
  if (styles) {
    for (const chunk of styles.chunks) {
      const file = path.join(ROOT, chunk.out);
      if (fs.existsSync(file) && fs.readFileSync(file).equals(chunk.bytes)) continue;
      if (check) { console.error('[build-shell] DRIFT ' + chunk.out + ' (' + chunk.files.length + ' sheets); run node scripts/build-shell.cjs'); drift += 1; }
      else { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, chunk.bytes); log('[build-shell] wrote ' + chunk.out + ': ' + chunk.files.length + ' sheets, ' + chunk.bytes.length + ' B, ' + gz(chunk.bytes) + ' B br'); }
    }
    const now = regionOf(html, STYLES_BEGIN, STYLES_END, 'after the shell-styles template');
    if (now.text !== styles.region) {
      if (check) { console.error('[build-shell] DRIFT index.html styles region; run node scripts/build-shell.cjs'); drift += 1; }
      else { html = html.slice(0, now.a) + styles.region + html.slice(now.b); fs.writeFileSync(INDEX, html); log('[build-shell] rewrote the index.html styles region (' + styles.chunks.length + ' chunks for ' + styles.files.length + ' sheets)'); }
    }
    const styleDir = path.join(ROOT, STYLE_DIR);
    if (fs.existsSync(styleDir)) for (const name of fs.readdirSync(styleDir)) {
      if (!styles.chunks.some((c) => c.out === STYLE_DIR + '/' + name)) log('[build-shell] note: ' + STYLE_DIR + '/' + name + ' is not built by this list (left in place)');
    }
    for (const note of styles.notes) log('[build-shell] ' + note);
  }
  const made = plan(html);
  const region = currentRegion(html);
  for (const chunk of made.chunks) {
    const file = path.join(ROOT, chunk.out);
    const same = fs.existsSync(file) && fs.readFileSync(file).equals(chunk.bytes);
    if (same) continue;
    if (check) { console.error('[build-shell] DRIFT ' + chunk.out + ' (' + chunk.files.length + ' sources); run node scripts/build-shell.cjs'); drift += 1; }
    else { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, chunk.bytes); log('[build-shell] wrote ' + chunk.out + ': ' + chunk.files.length + ' files, ' + chunk.bytes.length + ' B, ' + gz(chunk.bytes) + ' B br'); }
  }
  if (region.text !== made.region) {
    if (check) { console.error('[build-shell] DRIFT index.html shell region; run node scripts/build-shell.cjs'); drift += 1; }
    else { fs.writeFileSync(INDEX, html.slice(0, region.a) + made.region + html.slice(region.b)); log('[build-shell] rewrote the index.html shell region (' + made.region.split('\n').length + ' lines)'); }
    html = html.slice(0, region.a) + made.region + html.slice(region.b);
  }
  /* the home hero's words as markup, then the preload lines: last, because they name the chunks' addresses written just above */
  const worded = withHero(html);
  if (worded !== html) {
    if (check) { console.error('[build-shell] DRIFT index.html hero-words region (the words in ' + HOME_MANIFEST + ' or their writer in ' + TOPICS_FILE + ' changed); run node scripts/build-shell.cjs'); drift += 1; }
    else { fs.writeFileSync(INDEX, worded); log('[build-shell] rewrote the index.html hero-words region from ' + HOME_MANIFEST); }
    html = worded;
  }
  const asked = withPreloads(html);
  if (asked !== html) {
    if (check) { console.error('[build-shell] DRIFT index.html shell-preload region (a script tag after it changed); run node scripts/build-shell.cjs'); drift += 1; }
    else { fs.writeFileSync(INDEX, asked); log('[build-shell] rewrote the index.html shell-preload region (' + (asked.match(/<link rel="preload" as="script"/g) || []).length + ' scripts)'); }
    html = asked;
  }
  /* a chunk file this list no longer makes: said, never deleted (another agent's or an older build's) */
  const dir = path.join(ROOT, OUT_DIR);
  if (fs.existsSync(dir)) for (const name of fs.readdirSync(dir)) {
    if (!made.chunks.some((c) => c.out === OUT_DIR + '/' + name)) log('[build-shell] note: ' + OUT_DIR + '/' + name + ' is not built by this list (left in place)');
  }
  for (const note of made.notes) log('[build-shell] ' + note);
  return drift;
}

/* --watch: rebuild whenever a listed source or the template changes (an edit to js/main.js is served within a second).
   While people edit the sources and test in the running site, the chunks would otherwise serve the old bytes: the served
   program is the chunk, not the file. `npm run serve` starts this beside the server (package.json). */
function watch() {
  let timer = null, watched = new Map();
  const run = () => {
    timer = null;
    try { build({ log: console.log }); } catch (error) { console.error('[build-shell] ' + (error && error.message || error)); }
    follow();
  };
  const queue = () => { if (!timer) timer = setTimeout(run, 150); };
  const follow = () => {
    let files;
    /* the shared sheets, the manifest id list and the cascade order are sources too: a changed rule or a new manifest rebuilds */
    try { const html = fs.readFileSync(INDEX, 'utf8'); files = sources(html).map((e) => e.file).concat(styleSources(html) || [], [MANIFEST_LOADER, 'js/pages/catalog.js', 'index.html', HOME_MANIFEST, TOPICS_FILE, SITE_PAGES]); } catch (error) { console.error('[build-shell] ' + error.message); return; }
    for (const file of files) {
      if (watched.has(file)) continue;
      try { watched.set(file, fs.watch(path.join(ROOT, file), queue)); } catch (error) { /* a file not there yet: the next rebuild looks again */ }
    }
  };
  run();
  console.log('[build-shell] watching ' + watched.size + ' files; a change rebuilds the chunks');
}

module.exports = { build, plan, sources, watch, planStyles, styleSources, manifestBlock, withManifests, heroBlock, withHero, preloadBlock, withPreloads };

if (require.main === module) {
  const check = process.argv.includes('--check');
  if (process.argv.includes('--watch')) { watch(); }
  else {
    try {
      const drift = build({ check });
      if (check) { console.log(drift ? '[build-shell] drift: ' + drift : '[build-shell] clean'); process.exit(drift ? 1 : 0); }
    } catch (error) {
      console.error('[build-shell] ' + (error && error.message || error));
      process.exit(1);
    }
  }
}
