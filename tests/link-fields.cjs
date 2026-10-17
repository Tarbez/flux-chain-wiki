/* ArkManifest's 'link' field kind, and js/ark/dash-kit.js's resolveLinkField --
   the one place every retrofitted call site turns a tagged link value into a
   real href. See the Link-editing retrofit plan, Part 2. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

/* ---- ArkManifest.problems(): the 'link' kind's own validation ---------- */
const manifestContext = vm.createContext({});
vm.runInContext(fs.readFileSync('js/content/manifest.js', 'utf8'), manifestContext);
const ArkManifest = vm.runInContext('ArkManifest', manifestContext);

function manifestWith(value) {
  return {
    id: 'fixture', title: 'Fixture', route: '/fixture', group: 'page', fields: {
      CTA: { label: 'Call to action', kind: 'link', section: 'Links', value: value }
    }
  };
}

// The three valid tagged forms are accepted. (A cross-realm empty array compared with
// assert.deepEqual against an outer-realm [] is not reference-equal, so check length.)
['route:about', 'doc:docs/overview.md', 'url:https://example.com'].forEach(value => {
  assert.equal(ArkManifest.problems(manifestWith(value)).length, 0, `${value} is a valid link value`);
});

// Malformed values are rejected: no prefix, unknown prefix, empty remainder.
['about', 'route:', 'doc:', 'url:', 'ftp:example.com', '', 'route', 'route: about'].forEach(value => {
  const problems = ArkManifest.problems(manifestWith(value));
  assert(problems.length, `"${value}" should be rejected`);
  assert(problems.some(p => /route:<key>, doc:<path> or url:<address>/.test(p)), `"${value}" names the expected shape; got ${JSON.stringify(problems)}`);
});

// 'link' is accepted as a real kind, alongside 'line' and 'text'.
assert(ArkManifest.kinds.includes('link'));

// define() still throws on a bad link value, same as any other field problem.
assert.throws(() => ArkManifest.define(manifestWith('not-tagged')), /ArkManifest: fixture:/);
assert.doesNotThrow(() => ArkManifest.define(manifestWith('route:about')));

/* ---- js/ark/dash-kit.js: resolveLinkField ------------------------------- */
function freshDashKit() {
  const sandbox = {
    ArkUI: {
      pageCatalog: {
        about: { path: '/about' },
        'stats/ledger': { path: '/stats/ledger' }
      },
      route: { href: path => '#' + path }
    },
    document: { createElement: tag => ({ tagName: tag, setAttribute() {}, classList: { toggle() {} }, dataset: {}, style: { setProperty() {} }, appendChild(child) { (this.children || (this.children = [])).push(child); return child; } }) }
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('js/ark/dash-kit.js', 'utf8'), context);
  return context.ArkUI.dash;
}

(function routeForm() {
  const dash = freshDashKit();
  const resolved = dash.resolveLinkField('route:about');
  // Byte-for-byte against the pre-retrofit helper this replaces (href(key) in
  // the same file), not a re-derivation of the same formula.
  assert.equal(resolved.href, dash.href('about'));
  assert.equal(resolved.href, '#/about');
  assert.equal(resolved.isExternal, false);
  assert.equal(resolved.sceneLink, 'about');
})();

(function routeFormMissingKey() {
  // An unknown route key degrades the same way href() always has, rather than throwing --
  // a page that out-lives a deleted catalog entry still renders, just with a dead link.
  const dash = freshDashKit();
  assert.equal(dash.resolveLinkField('route:nosuchpage').href, dash.href('nosuchpage'));
})();

(function docForm() {
  const dash = freshDashKit();
  const resolved = dash.resolveLinkField('doc:docs/overview.md', '/about');
  assert.equal(resolved.href, dash.docHref('docs/overview.md', '/about'));
  assert.equal(resolved.href, '#/reference?doc=docs%2Foverview.md&from=%2Fabout');
  assert.equal(resolved.isExternal, false);
  assert.equal(resolved.sceneLink, 'reference');
})();

(function docFormDefaultFrom() {
  const dash = freshDashKit();
  // Omitting `from` matches docHref's own default (the root route), not a thrown error.
  assert.equal(dash.resolveLinkField('doc:docs/overview.md').href, dash.docHref('docs/overview.md', undefined));
})();

(function urlForm() {
  const dash = freshDashKit();
  const resolved = dash.resolveLinkField('url:https://example.com/whitepaper');
  assert.equal(resolved.href, 'https://example.com/whitepaper');
  assert.equal(resolved.isExternal, true);
  assert.equal(resolved.sceneLink, null);
})();

(function malformedValue() {
  const dash = freshDashKit();
  const resolved = dash.resolveLinkField('not-tagged-at-all');
  assert.equal(resolved.href, '#');
  assert.equal(resolved.isExternal, false);
  assert.equal(resolved.sceneLink, null);
})();

(function linkElSetsSceneLinkOnlyForInternalTargets() {
  const dash = freshDashKit();
  const routeAnchor = dash.linkEl('Read more', 'route:about');
  assert.equal(routeAnchor.dataset.sceneLink, 'about');
  const docAnchor = dash.linkEl('Evidence', 'doc:docs/overview.md', '/about');
  assert.equal(docAnchor.dataset.sceneLink, 'reference');
  const urlAnchor = dash.linkEl('External', 'url:https://example.com');
  assert.equal(urlAnchor.dataset.sceneLink, undefined, 'an external link never claims a pageCatalog route');
})();

console.log('PASS: ArkManifest link-kind validation, and resolveLinkField/linkEl resolve every tagged form byte-identically to the pre-retrofit helpers.');
