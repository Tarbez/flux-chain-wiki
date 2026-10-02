/* Clean paths over http(s), hash routes from disk, and old #/links rewritten, all through ArkUI.route. */
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
function sandbox(protocol, pathname, search, hash) {
  const writes = [];
  const location = { protocol, pathname, search, hash };
  const history = { pushState: (_s, _t, url) => writes.push(['push', url]), replaceState: (_s, _t, url) => writes.push(['replace', url]) };
  const context = vm.createContext({ ArkUI: {}, location, history });
  vm.runInContext(fs.readFileSync('js/ark/route.js', 'utf8'), context);
  return { route: context.ArkUI.route, writes, location };
}

// Over https: the address is the path.
let s = sandbox('https:', '/learnings/some-slug', '?q=2', '');
assert.equal(s.route.pathMode, true);
assert.equal(s.route.path(), '/learnings/some-slug');
assert.equal(s.route.search(), 'q=2');
assert.equal(s.route.current(), '/learnings/some-slug?q=2');
assert.equal(s.route.href('/explore'), '/explore', 'links are clean paths, not #/explore');
assert.equal(s.route.raw(), '/learnings/some-slug');
assert.equal(s.route.isLegacyHash(), false);

// A trailing slash is the same route; the home page is '/'.
assert.equal(sandbox('https:', '/explore/', '', '').route.path(), '/explore');
assert.equal(sandbox('https:', '/', '', '').route.path(), '/');

// Writing: pushes a clean path, does nothing when already there.
s = sandbox('https:', '/about', '', '');
s.route.write('/explore', '', 'push');
s.route.write('/learnings/x', 'q=3', 'replace');
assert.deepEqual(s.writes, [['push', '/explore'], ['replace', '/learnings/x?q=3']]);
s = sandbox('https:', '/explore', '', '');
s.route.write('/explore', '', 'push');
assert.deepEqual(s.writes, [], 'no duplicate history entry for the address already shown');

// An old https://host/#/explorer link is recognised, then replaced by the clean path even though the target "matches".
s = sandbox('https:', '/index.html', '', '#/explorer?x=1');
assert.equal(s.route.isLegacyHash(), true);
assert.equal(s.route.path(), '/explorer');
assert.equal(s.route.search(), 'x=1');
assert.equal(s.route.raw(), '#/explorer?x=1');
s.route.write('/explore', 'x=1', 'replace');
assert.deepEqual(s.writes, [['replace', '/explore?x=1']]);

// From disk (file:) a path cannot be a route, so routes stay in the hash.
s = sandbox('file:', '/Users/x/defxn/index.html', '', '#/learnings/y?q=1');
assert.equal(s.route.pathMode, false);
assert.equal(s.route.href('/explore'), '#/explore');
assert.equal(s.route.path(), '/learnings/y');
assert.equal(s.route.search(), 'q=1');
assert.equal(s.route.isLegacyHash(), false, 'on disk the hash IS the address, nothing to rewrite');
s = sandbox('file:', '/x/index.html', '', '');
s.route.write('/about', '', 'push');
assert.deepEqual(s.writes, [['push', '#/about']]);

// The router resolves the new and the old explorer address to the same page, plus every catalog route by path.
const rs = vm.createContext({ console, document: { querySelector() { return null; }, createElement() { return {}; } }, window: { addEventListener() {}, matchMedia: () => ({ matches: true }) }, location: { protocol: 'https:', pathname: '/', search: '', hash: '' }, getComputedStyle: () => ({}), ArkUI: { prefersReducedMotion: () => true } });
for (const file of ['js/ark/vendor/engines.js', 'js/content/learnings.js', 'js/content/article-index.js', 'js/ark/scene-state.js', 'js/pages/catalog.js', 'js/ark/route.js', 'js/ark/page-router.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), rs);
const catalog = rs.ArkUI.pageCatalog;
assert.equal(catalog.explorer.path, '/explore');
const urlFor = rs.ArkUI.route.href;
assert.equal(urlFor(catalog.explorer.path), '/explore');
console.log('PASS: clean paths over http(s), hash on disk, legacy #/ links recognised and rewritten, explorer is /explore.');
