#!/usr/bin/env node
/* =====================================================================
   GLOSSARY BUILD -- docs/glossary.md -> the full glossary and one small glossary per route
   ---------------------------------------------------------------------
     node scripts/build-glossary.cjs                  writes js/content/glossary.js (every term) and
                                                      js/content/glossary/<route>.js (the terms that
                                                      route renders). Renders every route that loads a
                                                      glossary (jsdom, the real scripts): minutes.
     node scripts/build-glossary.cjs --only stats     the same for the routes named (catalog keys)
     node scripts/build-glossary.cjs --static         writes the full module and rewrites each route file
                                                      from the terms it already lists, so a changed
                                                      definition lands without a render
     node scripts/build-glossary.cjs --check          writes nothing; exits 1 when a generated file no
                                                      longer matches the doc (fast; tests/ark-blocks-adapter.cjs
                                                      runs it)
     node scripts/build-glossary.cjs --check --routes also renders every route and exits 1 when the terms a
                                                      page now uses are not the terms its file lists
                                                      (tests/glossary-routes.cjs runs it)

   docs/glossary.md is the one place a term is defined. The Ark `term` block and [[term]] markup
   (js/ark/blocks.js) read the definitions from these generated modules, so a page never types a
   definition and the site never disagrees with the glossary. They are derived build outputs, not
   stores: nothing writes them but this script, and they are rebuilt, never edited.

   What is derived, by the doc's own structure (not by a list of terms):
     - an entry is a paragraph that opens with **Term**, then " — ", then the definition; the key is
       the bold term, lowercased;
     - a parenthetical between the term and the dash qualifies the term and stays with it
       ("Signer (of a launch)");
     - inside the definition, markdown links keep their words, code spans lose their backticks, and a
       parenthetical that stands as a sentence of its own after a full stop (the doc's dated history
       notes) is left out, as is a closing "See ..." or "Source: ..." sentence (it tells the reader of
       the doc where an entry came from; a tooltip says what the word means now).
   A word written in another form is marked up as [[label|key]] by the page.

   THE PER-ROUTE GLOSSARY (docs/cms-architecture.md, Budget). Every route that glosses words used to ship
   the whole glossary; the definitions alone are most of its size, and shortening them would make them
   worse. A route now ships only the terms its own rendered text uses. The set is DERIVED, never listed:
   the route is rendered in jsdom with the FULL glossary standing in for its file, the first-use marker
   and every hand-marked [[word|key]] do their work, and the terms that came out as Ark `term` blocks
   are the route's terms. Nothing here edits a page or names a word. The accessibility contract of the
   term block is unchanged: the definition is in the tip at mount and is the trigger's accessible
   description, and the server render serialises it, because the route's file loads with the route.
   js/pages/catalog.js maps each route to its file by one rule (ArkUI.glossaryFor); the editor's canvas
   and a page holding a saved term block still load the full module (ArkUI.glossaryScript).
   ===================================================================== */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = 'docs/glossary.md';
const OUT = 'js/content/glossary.js';
const ROUTE_DIR = 'js/content/glossary';
const ROUTE_PATH = /(?:^|\/)js\/content\/glossary\/([a-z0-9-]+)\.js$/;
const SITE = 'https://defxn.com';

function plain(markdown) {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1');
}

/* A closing pointer: "See [resolvers](protocol/resolvers.md)." or "Source: [networks](...), `docs/x.md`."
   Matched on the raw markdown, where a path's dots sit inside a link or a code span. */
const POINTER = /(^|[.!?]\s+)(?:See\s|Sources?:\s*)(?:`[^`]*`|\[[^\]]*\]\([^)]*\)|\([^()]*\)|"[^"]*"|[^.`\[(])*\.\s*$/;

function definitionOf(raw) {
  let text = raw.trim();
  // A history note: "... sentence. (Until 2026-10-19 this read ...)" -- a sentence of its own.
  let previous;
  do { previous = text; text = text.replace(/([.!?])\s*\((?:[^()]|\([^()]*\))*\)\s*/g, '$1 ').trim(); } while (text !== previous);
  text = text.replace(POINTER, '$1').trim();
  return plain(text).replace(/\s+/g, ' ').trim();
}

function parse(markdown) {
  const entries = [];
  for (const paragraph of markdown.split(/\n\s*\n/)) {
    const m = /^\*\*([^*]+)\*\*(\s*\([^)]*\))?\s+—\s+([\s\S]+)$/.exec(paragraph.trim());
    if (!m) continue;
    const term = (m[1] + (m[2] ? ' ' + m[2].trim() : '')).trim();
    const definition = definitionOf(m[3]);
    if (!definition) continue;
    entries.push({ key: m[1].trim().toLowerCase(), term, definition: definition.charAt(0).toUpperCase() + definition.slice(1) });
  }
  return entries;
}

function entryLine(entry) {
  return '    ' + JSON.stringify(entry.key) + ': { term: ' + JSON.stringify(entry.term) + ', definition: ' + JSON.stringify(entry.definition) + ' }';
}

function moduleSource(entries) {
  return '/* Generated by scripts/build-glossary.cjs from ' + SOURCE + '. Do not edit: change the glossary,\n' +
    '   then run `node scripts/build-glossary.cjs`. Read by js/ark/blocks.js (the Ark term block and\n' +
    '   [[term]] markup). ' + entries.length + ' terms. This is the whole glossary, for the editor and for a page that\n' +
    '   holds a saved term block; a route loads js/content/glossary/<route>.js, the terms it renders. */\n' +
    'var ArkGlossary = {\n' +
    '  source: ' + JSON.stringify(SOURCE) + ',\n' +
    '  map: {\n' + entries.map(entryLine).join(',\n') + '\n  }\n' +
    '};\n';
}

/* A route's file adds its terms to whatever glossary is already loaded (the full module may have
   come first, in the editor or beside a saved term block) and never takes one away. A row is
   [key, definition] and carries the term as written only when it is not the key with a capital
   ("CID", "Auth Kit"): the shape is measured, the same entries as objects cost 8% more
   (docs/cms-architecture.md Budget). A route file carries NO header comment: it costs 39 B gz and
   /resolvers had 8 B of room; the directory is generated, and --check fails on any hand edit. */
const capital = (key) => key.charAt(0).toUpperCase() + key.slice(1);
function routeSource(route, entries) {
  const rows = entries.map((entry) => '  ' + JSON.stringify(entry.term === capital(entry.key) ? [entry.key, entry.definition] : [entry.key, entry.definition, entry.term]));
  return 'var ArkGlossary=window.ArkGlossary||{map:{}};\n' +
    '[\n' + rows.join(',\n') + '\n].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});\n';
}

const slugOf = (route) => String(route).replace(/\//g, '-');

function readText(rel) { const file = path.join(ROOT, rel); return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null; }
function build() { return moduleSource(parse(fs.readFileSync(path.join(ROOT, SOURCE), 'utf8'))); }

/* The keys a route file lists, read from the file itself (the file is the store of the route's set). */
function keysOf(source) {
  const keys = [];
  for (const m of source.matchAll(/^ {2}\[("(?:[^"\\]|\\.)*"),/gm)) keys.push(JSON.parse(m[1]));
  return keys;
}
function routeFiles() {
  const dir = path.join(ROOT, ROUTE_DIR);
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => /^[a-z0-9-]+\.js$/.test(name)).map((name) => name.slice(0, -3)).sort() : [];
}
const gz = (text) => zlib.gzipSync(Buffer.from(text), { level: 9 }).length;

/* ---- the derivation: render each route that loads a glossary ----
   `full` (a module's source) stands behind every route file, so what the page marks is what the whole glossary
   would mark; without it the route's own shipped file is loaded, which is what a visitor gets. */
async function derive(options = {}) {
  const core = await import(pathToFileURL(path.join(ROOT, 'api/lib/render-core.mjs')).href);
  const { requestInterceptor } = require('jsdom');
  const html = await core.readIndexHtml(ROOT);
  const local = core.createLocalResources(ROOT);
  const resources = options.full === undefined ? local : { interceptors: [
    requestInterceptor((request) => {
      let pathname = request.url;
      try { pathname = new URL(request.url).pathname; } catch (_) { /* a bare path */ }
      return ROUTE_PATH.test(pathname) ? new Response(options.full, { status: 200, headers: { 'content-type': 'text/javascript; charset=utf-8' } }) : undefined;
    })
  ].concat(local.interceptors) };
  const catalog = await core.getRouteCatalog({ html, url: SITE + '/', resources: local, root: ROOT, timeoutMs: 60000 });
  const routes = Object.keys(catalog).filter((key) => (catalog[key].scripts || []).some((script) => ROUTE_PATH.test(script)))
    .filter((key) => !options.only || options.only.includes(key));
  const found = {};
  for (const key of routes) {
    const started = Date.now();
    const seen = await core.inspectDocument({ html, url: SITE + catalog[key].path, resources, root: ROOT, timeoutMs: 60000 }, async (window) => {
      const doc = window.document;
      const used = [], missing = [];
      doc.querySelectorAll('[data-ark-part="term"][data-term]').forEach((el) => { const k = el.getAttribute('data-term'); if (!used.includes(k)) used.push(k); });
      doc.querySelectorAll('[data-ark-term-missing]').forEach((el) => missing.push(el.getAttribute('data-ark-term-missing')));
      return { used, missing };
    });
    if (seen.missing.length) throw new Error('[build-glossary] ' + key + ' marks a term its glossary does not carry: ' + seen.missing.join(', ') + '. Remedy: define it in ' + SOURCE + ', or mark the word with a key that exists.');
    const listed = (catalog[key].scripts || []).filter((script) => ROUTE_PATH.test(script));
    const expected = 'js/content/glossary/' + slugOf(key) + '.js';
    if (listed.length !== 1 || listed[0] !== expected) throw new Error('[build-glossary] route "' + key + '" lists ' + JSON.stringify(listed) + ' but ArkUI.glossaryFor (js/pages/catalog.js) gives ' + expected + '.');
    found[key] = seen.used;
    if (options.log) console.log('[build-glossary] ' + key + ': ' + seen.used.length + ' terms (' + (Date.now() - started) + ' ms)');
  }
  return found;
}

function entriesFor(map, keys, route) {
  return keys.map((key) => {
    if (!map.has(key)) throw new Error('[build-glossary] route "' + route + '" lists the term "' + key + '", which ' + SOURCE + ' no longer defines. Remedy: node scripts/build-glossary.cjs --only ' + route);
    return map.get(key);
  });
}
const sortedKeys = (keys, order) => keys.slice().sort((a, b) => order.get(a) - order.get(b));
const same = (a, b) => a.length === b.length && a.every((k) => b.includes(k));

async function main() {
  const argv = process.argv.slice(2);
  const check = argv.includes('--check'), withRoutes = argv.includes('--routes'), staticOnly = argv.includes('--static');
  const onlyAt = argv.indexOf('--only');
  const only = onlyAt >= 0 ? argv.slice(onlyAt + 1).filter((a) => !a.startsWith('--')) : null;
  const entries = parse(fs.readFileSync(path.join(ROOT, SOURCE), 'utf8'));
  const map = new Map(entries.map((entry) => [entry.key, entry])), order = new Map(entries.map((entry, index) => [entry.key, index]));
  const nextFull = moduleSource(entries), currentFull = readText(OUT);
  const onDisk = routeFiles();
  const file = (route) => ROUTE_DIR + '/' + route + '.js';
  const problems = [];

  /* 1. what each route file on disk must say today: its own terms, in the doc's order, today's definitions */
  const rewritten = {};
  for (const route of onDisk) {
    const keys = keysOf(readText(file(route)));
    const unknown = keys.filter((key) => !map.has(key));
    if (unknown.length) { problems.push(file(route) + ' lists terms ' + SOURCE + ' no longer defines: ' + unknown.join(', ')); continue; }
    rewritten[route] = routeSource(route, entriesFor(map, sortedKeys(keys, order), route));
  }

  /* 2. the routes: which terms each renders now */
  let derived = null;
  if (check && withRoutes) {
    derived = await derive({ only, full: nextFull });
    const shipped = await derive({ only });
    const slugs = new Set();
    for (const key of Object.keys(derived)) {
      slugs.add(slugOf(key));
      const want = derived[key], have = onDisk.includes(slugOf(key)) ? keysOf(readText(file(slugOf(key)))) : null;
      if (have === null) problems.push(key + ' loads ' + file(slugOf(key)) + ', which does not exist; it renders ' + (want.join(', ') || 'no terms'));
      else {
        const absent = want.filter((k) => !have.includes(k)), extra = have.filter((k) => !want.includes(k));
        if (absent.length) problems.push(key + ' now renders ' + absent.join(', ') + ', which ' + file(slugOf(key)) + ' does not carry (the word would lose its gloss)');
        if (extra.length) problems.push(key + ' no longer renders ' + extra.join(', ') + ', which ' + file(slugOf(key)) + ' still ships (dead bytes)');
        if (!absent.length && !same(shipped[key], want)) problems.push(key + ' renders ' + shipped[key].join(', ') + ' with only its own glossary, but ' + want.join(', ') + ' with the whole one');
      }
    }
    if (!only) for (const route of onDisk) if (!slugs.has(route)) problems.push(file(route) + ' belongs to no route that loads a glossary (orphan)');
  } else if (!check && !staticOnly) {
    derived = await derive({ only, full: nextFull, log: true });
    for (const [key, keys] of Object.entries(derived)) rewritten[slugOf(key)] = routeSource(slugOf(key), entriesFor(map, sortedKeys(keys.filter((k) => map.has(k)), order), key));
  }

  if (check) {
    if (currentFull !== nextFull) problems.unshift(OUT + (currentFull === null ? ' is missing' : ' no longer matches ' + SOURCE));
    for (const route of onDisk) if (rewritten[route] !== undefined && readText(file(route)) !== rewritten[route]) problems.push(file(route) + ' no longer matches ' + SOURCE + ' (a definition changed)');
    if (problems.length) {
      console.error('[build-glossary] DRIFT\n  - ' + problems.join('\n  - ') + '\nRemedy: node scripts/build-glossary.cjs' + (withRoutes ? ' (renders every route)' : ' --static'));
      process.exit(1);
    }
    console.log('[build-glossary] ok ' + OUT + ' + ' + onDisk.length + ' route files' + (derived ? ' (rendered ' + Object.keys(derived).length + ' routes, with the whole glossary and with each route\'s own)' : ''));
    return;
  }

  if (problems.length) { console.error('[build-glossary] ' + problems.join('\n')); process.exit(1); }
  if (currentFull !== nextFull) fs.writeFileSync(path.join(ROOT, OUT), nextFull);
  console.log('[build-glossary] ' + (currentFull === nextFull ? 'unchanged ' : 'wrote ') + OUT + ' (' + entries.length + ' terms, ' + gz(nextFull) + ' B gz)');
  fs.mkdirSync(path.join(ROOT, ROUTE_DIR), { recursive: true });
  let wrote = 0, unchanged = 0, bytes = 0;
  for (const [route, text] of Object.entries(rewritten)) {
    if (readText(file(route)) === text) unchanged += 1; else { fs.writeFileSync(path.join(ROOT, file(route)), text); wrote += 1; }
    bytes += gz(text);
  }
  if (derived && !only) {
    const slugs = new Set(Object.keys(derived).map(slugOf));
    for (const route of onDisk) if (!slugs.has(route)) { fs.unlinkSync(path.join(ROOT, file(route))); console.log('[build-glossary] removed orphan ' + file(route)); }
  }
  console.log('[build-glossary] route files: wrote ' + wrote + ', unchanged ' + unchanged + ' (' + bytes + ' B gz summed)');
}

module.exports = { parse, build, definitionOf, routeSource, slugOf, keysOf, SOURCE, OUT, ROUTE_DIR };

if (require.main === module) main().catch((error) => { console.error(error && error.stack || error); process.exit(1); });
