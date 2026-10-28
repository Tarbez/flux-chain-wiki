'use strict';
/* =====================================================================
   LAYOUT-KEY CONTINUITY -- the check every page conversion runs (Wave 3).
   ---------------------------------------------------------------------
   Saved CMS edits (ArkLayout frames, groups, layer names, alt text, states,
   component spots, element motion) are stored against an element's layout key
   (js/content/layout.js). Most page elements have PATH keys
   (page:/section:0/h1:0), so converting a page to blocks re-keys them, and an
   edit saved on the old page would silently land nowhere. Saved records are
   never rewritten (future law). Instead the converted page PINS the old keys:
   a block spec's `was` (js/ark/blocks.js) stamps data-ark-layout-pin, and
   layout.js keys the element by it.

   The workflow, per page:
     1. BEFORE converting, freeze the old page's key census:
          node tests/lib/layout-continuity.cjs capture /palette
        -> tests/fixtures/layout-keys/palette.tsv  (key, tag, text; TSV, never JSON)
        It refuses to overwrite an existing census: that file is evidence of the
        old page, and the old page no longer exists to re-derive it from.
     2. Convert the page to a spec (ArkUI.page).
     3. Derive the pins on the converted page and paste them into the spec as `was`:
          node tests/lib/layout-continuity.cjs derive /palette
        It takes the shallowest old key whose words name nothing, finds the element now
        showing those words, pins it (data-ark-layout-pin) and re-keys -- a pin anchors
        its subtree, so one pin on a moved grid carries every key inside it. Words that
        are on no element any more are listed: decide each as `reshaped` (the words
        changed on purpose; pin the key by hand onto the successor) or `retired` (nothing
        carries it now), with the reason.
     4. In the page's test (see tests/palette-blocks.cjs):
          const census = continuity.readCensus('/palette');
          const after = await continuity.pageKeys('/palette');
          continuity.assertContinuity(census, after, { reshaped, retired });
          await continuity.assertSavedEditsLand('/palette', census, { reshaped, retired });
        A page that declares a layout scope finer than its route (/reference: one per document,
        js/content/layout.js "a page's layout scope") is checked on one document: pass
        { query: 'doc=<id>', scope: '/reference?doc=<id>' } to pageKeys and assertSavedEditsLand.
        The boot asserts the page really declares that scope, so the saved edits are written
        where that document reads them (tests/reference-fold.cjs checks Agreements, the document
        its census was taken on).
        The first checks every old key still names an element with the same words (loose:
        case, spacing, punctuation and arrows ignored); the second writes a real saved
        layout draft with a frame on EVERY old key and proves ArkLayout applied each one
        on the converted page (a jsdom boot of the real site, api/lib/render-core.mjs).
   Nothing is ever matched by guess: an old key either lands, or the test names it.
   ===================================================================== */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const CENSUS_DIR = path.join(ROOT, 'tests', 'fixtures', 'layout-keys');
const SITE_PARTS = ['index.html', 'css', 'js', 'assets', 'docs'];

const norm = (text) => String(text || '').replace(/\s+/g, ' ').trim();
const slug = (route) => (route.replace(/^\/+|\/+$/g, '') || 'home').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
const censusPath = (route) => path.join(CENSUS_DIR, slug(route) + '.tsv');
const clean = (text) => norm(text).replace(/\t/g, ' ').slice(0, 160);
/* An element's own words. A glossary term ([[term]] markup, Ark's term block) carries its
   definition in a tooltip inside the paragraph; that tip is not the paragraph's words, so a
   paragraph that gained a term on conversion still compares equal to the one it replaced
   (2026-10-19, W3-STATS: without this every glossed paragraph read as a changed one). */
const TERM_TIP = '[data-ark-part="term-tip"]';
function ownText(el) {
  if (!el.querySelector || !el.querySelector(TERM_TIP)) return el.textContent;
  const copy = el.cloneNode(true);
  copy.querySelectorAll(TERM_TIP).forEach((tip) => tip.remove());
  return copy.textContent;
}

async function core() { return import(path.join(ROOT, 'api/lib/render-core.mjs')); }

/* A scratch copy of the servable site, optionally with files replaced (a saved layout draft). */
function scratchSite(overrides) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-continuity-'));
  for (const name of SITE_PARTS) if (fs.existsSync(path.join(ROOT, name))) fs.cpSync(path.join(ROOT, name), path.join(work, name), { recursive: true });
  for (const [file, text] of Object.entries(overrides || {})) fs.writeFileSync(path.join(work, file), text);
  return work;
}

/* Boots `route` through the real server render (jsdom, the real scripts) and returns every
   page-scope layout key: [{ key, tag, text, block, part }]. `inspect(window, keys, scope)` may look
   further before the window closes. `query` (no '?') is added to the address; `scope` is the layout
   scope the page shown must declare (default: the route itself) -- asserted, never assumed. */
async function bootRoute(route, { site = ROOT, inspect, query = '', scope = route } = {}) {
  const { readIndexHtml, inspectDocument, createLocalResources } = await core();
  return inspectDocument({ html: await readIndexHtml(site), url: 'https://defxn.com' + route + (query ? '?' + query : ''), resources: createLocalResources(site), root: site, timeoutMs: 30000 }, async (window) => {
    // The router applies saved layout one frame after ark:route-ready.
    await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
    const host = window.document.getElementById('scene') || window.document.body;
    assert.equal(window.ArkLayout.scopeFor(route, host), scope, route + (query ? '?' + query : '') + ': the page shown stores its edits under this layout scope');
    const keyed = Array.from(window.ArkLayout.annotate(host, scope)); // a Node array: jsdom's would fail strict deepEqual
    const keys = keyed
      .filter((el) => el.closest('[data-ark-page]'))
      .map((el) => {
        const block = el.closest('[data-ark-block]');
        return { key: el.getAttribute('data-ark-layout-key'), tag: el.tagName.toLowerCase(), text: clean(ownText(el)), block: block ? block.id || block.getAttribute('data-ark-block') : '', part: el.getAttribute('data-ark-part') || '', el };
      });
    const extra = inspect ? await inspect(window, keys, scope) : undefined;
    for (const entry of keys) delete entry.el;
    return inspect ? { keys, extra } : keys;
  });
}

async function pageKeys(route, options) { return bootRoute(route, options); }

function writeCensus(route, keys) {
  const file = censusPath(route);
  if (fs.existsSync(file)) throw new Error('Refused: ' + path.relative(ROOT, file) + ' already exists. It is the frozen census of the page BEFORE conversion; the old page cannot re-derive it. Delete it by hand only if that page was never converted.');
  fs.mkdirSync(CENSUS_DIR, { recursive: true });
  const lines = ['# key\ttag\ttext -- layout keys of ' + route + ' before conversion, captured ' + new Date().toISOString().slice(0, 10) + ' by tests/lib/layout-continuity.cjs. Frozen: never regenerate.'];
  for (const entry of keys) lines.push([entry.key, entry.tag, entry.text].join('\t'));
  fs.writeFileSync(file, lines.join('\n') + '\n');
  return file;
}

function readCensus(route) {
  const file = censusPath(route);
  assert(fs.existsSync(file), 'no frozen census for ' + route + ' (' + path.relative(ROOT, file) + '); capture it BEFORE converting the page: node tests/lib/layout-continuity.cjs capture ' + route);
  return fs.readFileSync(file, 'utf8').split('\n').filter((line) => line && !line.startsWith('#')).map((line) => {
    const [key, tag, text] = line.split('\t');
    return { key, tag, text: text || '' };
  });
}

/* Words compared loosely: case, spacing, punctuation and arrows are presentation ("← Home" on a
   link and "Home" + a → glyph on a button are the same words). */
const loose = (text) => String(text || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
// live words compared as the census stored them (clean: spacing collapsed, cut at 160 characters)
const words = (el) => loose(clean(ownText(el)));

/* Every old key must still name an element: with the same words, or -- for an element whose words
   changed on purpose -- listed in `reshaped` (old key -> why) and still pinned to its successor,
   or listed in `retired` (old key -> why nothing carries it now). Returns the tally; throws
   listing every old key that would no longer land, with the fix. 'page:/' is always the root. */
/* `live`: as for assertSavedEditsLand -- keys whose words the page writes from live data; the key must still
   name an element, but its words are not compared. */
function assertContinuity(census, after, { reshaped = {}, retired = {}, live: liveText = {} } = {}) {
  const byKey = new Map(after.map((entry) => [entry.key, entry]));
  const keys = after.map((entry) => entry.key);
  const duplicates = keys.filter((key, i) => keys.indexOf(key) !== i);
  assert.deepEqual(duplicates, [], 'two elements share a layout key (a pin collides with a computed key)');
  const lost = [], kept = [], keptReshaped = [], keptRetired = [];
  for (const old of census) {
    if (old.key === 'page:/') { kept.push(old); continue; }
    const now = byKey.get(old.key);
    if (retired[old.key]) { keptRetired.push(old); continue; }
    if (now && loose(now.text) === loose(old.text)) { kept.push(old); continue; }
    if (now && reshaped[old.key]) { keptReshaped.push(old); continue; }
    if (now && liveText[old.key]) { kept.push(old); continue; }
    lost.push(old.key + ' (' + old.tag + ' "' + old.text.slice(0, 60) + '")' + (now ? ' now names "' + now.text.slice(0, 40) + '"' : ' names nothing'));
  }
  assert.deepEqual(lost, [], 'saved CMS edits keyed to these old layout keys would no longer land; add the pins `node tests/lib/layout-continuity.cjs derive <route>` prints, or list the key as reshaped/retired with the reason');
  for (const key of Object.keys(reshaped).concat(Object.keys(retired), Object.keys(liveText))) assert(census.some((old) => old.key === key), key + ' is listed as reshaped/retired/live but is not in the census');
  return { kept: kept.length, reshaped: keptReshaped.length, retired: keptRetired.length };
}

/* The pins to add, derived on the converted page itself: repeatedly take the shallowest old key
   that names nothing with its words, find the element that now shows those words (same tag
   first, then the innermost), pin it, and re-key -- a pin anchors its subtree, so one pin on a
   moved grid carries every key inside it. Refs are relative to the top-level spec entry:
   ':root', '[data-ark-slot="name"]', '<part>[#n]', or a :scope path -- relative to the nearest
   Ark block with an authored id (ArkUI.blocks.render / ArkUI.page spec `was`). */
async function derivePins(route, census, options = {}) {
  const { extra } = await bootRoute(route, { query: options.query, scope: options.scope, inspect: (window, _keys, scope) => {
    const { document, ArkLayout } = window;
    const host = document.getElementById('scene');
    const page = document.querySelector('[data-ark-page]:not([hidden])') || document.querySelector('[data-ark-page]');
    const pins = {}, unresolved = [];
    const depth = (key) => key.split('/').length;
    // the spec the pin goes in: the nearest Ark block with an authored id, else the top-level entry
    const entryOf = (el) => { const block = el.closest('[data-ark-block][id]'); if (block && page.contains(block)) return block; let node = el; while (node && node.parentElement !== page) node = node.parentElement; return node; };
    function ref(el, entry) {
      if (el === entry) return ':root';
      if (el.hasAttribute('data-ark-slot')) return '[data-ark-slot="' + el.getAttribute('data-ark-slot') + '"]';
      const part = el.getAttribute('data-ark-part');
      if (part) {
        const same = [entry, ...entry.querySelectorAll('[data-ark-part]')].filter((node) => node.getAttribute('data-ark-part') === part);
        const n = same.indexOf(el) + 1;
        return part + (n > 1 ? '#' + n : '');
      }
      const steps = [];
      for (let node = el; node !== entry; node = node.parentElement) {
        const index = [...node.parentElement.children].filter((sib) => sib.tagName === node.tagName).indexOf(node) + 1;
        steps.unshift(node.tagName.toLowerCase() + ':nth-of-type(' + index + ')');
      }
      return ':scope > ' + steps.join(' > ');
    }
    const tried = new Set();
    for (;;) {
      const now = new Map(ArkLayout.annotate(host, scope).filter((el) => page.contains(el)).map((el) => [el.getAttribute('data-ark-layout-key'), el]));
      const open = census.filter((old) => old.key !== 'page:/' && old.text && !tried.has(old.key) && !(options.reshaped || {})[old.key] && !(options.retired || {})[old.key]
        && !(now.get(old.key) && words(now.get(old.key)) === loose(old.text)));
      if (!open.length) break;
      open.sort((a, b) => depth(a.key) - depth(b.key));
      const old = open[0];
      tried.add(old.key);
      // Same words, not already pinned -- and, where the old parent's key still names an element,
      // inside it: two "More" buttons are told apart by the place each one was in.
      let near = page;   /* not `scope`: that is the layout scope this inspect was handed */
      for (let key = old.key.replace(/\/[^/]+$/, ''); key && key !== old.key && /\//.test(key); key = key.replace(/\/[^/]+$/, '')) {
        if (now.get(key) && page.contains(now.get(key))) { near = now.get(key); break; }
      }
      // (an element inside a pinned subtree may still be pinned itself: its inherited key is the
      // pin plus its new path, which is not its old key once the subtree's inside changed)
      // ...but not one inside a pin that already claimed these same words (a caption's <p>).
      const claimed = (el) => { const pinned = el.closest('[data-ark-layout-pin]'); return !!pinned && loose(ownText(pinned)) === loose(ownText(el)); };
      const among = (root) => [...root.querySelectorAll('*')].filter((el) => !el.hasAttribute('data-ark-layout-pin') && words(el) === loose(old.text) && !claimed(el));
      const candidates = among(near).length ? among(near) : among(page);
      const sameTag = candidates.filter((el) => el.tagName.toLowerCase() === old.tag);
      const pool = sameTag.length ? sameTag : candidates;
      // innermost: no other candidate inside it -- then, of the elements around it showing the
      // same words, the one with an Ark part, so the pin names a part rather than a DOM path
      let match = pool.find((el) => !pool.some((other) => other !== el && el.contains(other))) || null;
      // (whole words here, not the census's 160-character cut: a frame adding a "Live" label is not the same)
      for (let up = match; up && up !== page && loose(ownText(up)) === loose(ownText(match)); up = up.parentElement) {
        if (up.hasAttribute('data-ark-part') && !up.hasAttribute('data-ark-layout-pin')) { match = up; break; }
      }
      const entry = match && entryOf(match);
      if (!match || !entry || !entry.id) { unresolved.push(old); continue; }
      match.setAttribute('data-ark-layout-pin', old.key);
      (pins[entry.id] = pins[entry.id] || {})[ref(match, entry)] = old.key;
    }
    return { pins, unresolved };
  } });
  return extra;
}

/* A real saved edit on every old key: a layout draft holding one frame per old key, rendered on
   the converted page. Each must land (ArkLayout applied it) on the element now carrying the key
   -- with the same words, unless the key is listed as reshaped. Retired keys are skipped.
   `live`: keys whose words the page writes from live data (a status line); the edit must still land
   on the element, but its words are not compared -- the census froze one moment of them. Each entry
   is a reason. Found 2026-10-20: /stats' pulse line read "No pulse received yet" when frozen and
   something else while a fetch was in flight, so the check failed only under load. */
async function assertSavedEditsLand(route, census, { reshaped = {}, retired = {}, live: liveText = {}, query = '', scope = route } = {}) {
  const live = census.filter((entry) => entry.key !== 'page:/' && !retired[entry.key]);
  const routes = {}; routes[scope] = {};
  // op 80: one of the editor's opacity steps (ArkLayout's sanitize drops any other value)
  live.forEach((entry) => { routes[scope][entry.key] = { desktop: { op: 80 } }; });
  const draft = 'ArkLayout.define(' + JSON.stringify({ version: 2, routes, groups: {}, labels: {}, alts: {} }) + ');\n';
  const site = scratchSite({ 'js/content/layout-data.js': draft });
  try {
    const { extra } = await bootRoute(route, { site, query, scope, inspect: (window) => {
      const host = window.document.getElementById('scene');
      return live.map((entry) => {
        const el = window.ArkLayout.find(host, entry.key, scope);
        const sameWords = !entry.text || reshaped[entry.key] || liveText[entry.key] || (el && words(el) === loose(entry.text));
        return { key: entry.key, text: entry.text, landed: !!el && !!sameWords && el.hasAttribute('data-ark-layout-applied') };
      });
    } });
    const failed = extra.filter((row) => !row.landed).map((row) => row.key + ' "' + row.text.slice(0, 50) + '"');
    assert.deepEqual(failed, [], 'saved edits that did not land on the converted ' + scope);
    return extra.length;
  } finally {
    fs.rmSync(site, { recursive: true, force: true });
  }
}

module.exports = { pageKeys, writeCensus, readCensus, censusPath, assertContinuity, derivePins, assertSavedEditsLand, scratchSite, loose };

if (require.main === module) {
  const [command, route] = process.argv.slice(2);
  (async () => {
    if (!/^(capture|derive|show)$/.test(command || '') || !route) {
      console.error('usage: node tests/lib/layout-continuity.cjs capture|derive|show <route>');
      process.exit(2);
    }
    const keys = command === 'derive' ? [] : await pageKeys(route);
    if (command === 'capture') console.log('wrote ' + path.relative(ROOT, writeCensus(route, keys)) + ' (' + keys.length + ' keys)');
    else if (command === 'show') keys.forEach((entry) => console.log([entry.key, entry.tag, entry.block, entry.part, entry.text.slice(0, 60)].join('\t')));
    else {
      const { pins, unresolved } = await derivePins(route, readCensus(route));
      console.log('// add to each spec entry (by id) as `was`:');
      console.log(JSON.stringify(pins, null, 2));
      if (unresolved.length) console.log('// these old words are on no element any more -- list each as reshaped or retired, with the reason:\n' + unresolved.map((m) => '//   ' + m.key + '  (' + m.tag + ') ' + m.text.slice(0, 60)).join('\n'));
    }
  })().catch((error) => { console.error(error); process.exit(1); });
}
