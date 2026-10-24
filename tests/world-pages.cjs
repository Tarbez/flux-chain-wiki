/* The intro and home pages that stand on the 3D world (js/pages/intro.js, js/pages/home.js, js/world/world-host.js).
   What this pins, and why each case exists:
   - Every word the two pages show is a manifest key: each role their copy() helper names exists in the home manifest, so
     a page cannot ship a word that the CMS cannot edit, and a renamed key cannot blank a heading.
   - Every link field they read points at a real catalog route (route:<key>): a retired page cannot leave a dead action.
   - The intro is a catalog page, hidden from every menu (journey null), and a fresh load of "/" is sent to it by the host
     only when the world can start (the host redirects in world-host.js, never a server).
   - Home and the intro load no Ark blocks: their scripts are the data files, the rail and the page itself.
   - The world's skin contract (docs/home-redesign/SKIN-CONTRACT.md) holds in ring-kit.js: the theme is read from the
     site's own theme, never a card skin's (the owner, 2026-10-24), unless its host opts in; chain kinds, networks and --ember are never skinned. */
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const context = vm.createContext({ console, ArkUI: {}, document: { write() {} } });
const load = (file) => vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
load('js/content/manifest.js');
load('js/content/manifests/index.js');
vm.runInContext('ArkManifestIds', context).forEach((id) => load('js/content/manifests/' + id + '.js'));
['js/content/learnings.js', 'js/content/article-index.js', 'js/content/resolutions.js', 'js/content/site-pages.js', 'js/pages/catalog.js'].forEach(load);
const ArkCopy = vm.runInContext('ArkCopy', context), catalog = vm.runInContext('ArkUI.pageCatalog', context);

for (const [file, area] of [['js/pages/home.js', 'HOME.WORLD.'], ['js/pages/intro.js', 'HOME.LANDING.']]) {
  const source = fs.readFileSync(file, 'utf8');
  const roles = [...source.matchAll(/\bcopy\('([A-Z0-9.]+)'\)/g), ...source.matchAll(/\['(COUNT\.[A-Z]+)'/g)].map((m) => m[1]);
  assert(roles.length >= 5, file + ' names its words through copy()');
  for (const role of roles) assert(ArkCopy.has(area + role), file + ': ' + area + role + ' is named but the home manifest does not define it');
  /* the roles built from a base (path(kind, role) adds .TITLE, .LINE, .HREF) */
  for (const m of source.matchAll(/\bpath\('[a-z]+', '([A-Z]+)'\)/g)) for (const part of ['TITLE', 'LINE', 'HREF']) assert(ArkCopy.has(area + m[1] + '.' + part), file + ': ' + area + m[1] + '.' + part);
  assert(!/>\s*[A-Z][a-z]+(?: [a-z]+){2,}[^<]*</.test(source.replace(/\/\*[\s\S]*?\*\//g, '')), file + ' spells out no sentence where a key belongs');
}
const manifest = vm.runInContext("ArkManifest.get('home')", context);
for (const [key, field] of Object.entries(manifest.fields)) {
  if (!/^(WORLD|LANDING)\./.test(key) || field.kind !== 'link') continue;
  const target = /^route:(\S+)$/.exec(field.value);
  assert(target && catalog[target[1]], key + ' goes to a real page: ' + field.value);
}

assert(catalog.intro && catalog.intro.path === '/intro', 'the intro is a page at /intro');
assert(catalog.intro.hiddenFromNavigation, 'the intro is in no menu, footer strip or sitemap list');
assert.equal(catalog.zero.path, '/', 'home stays at /');
for (const key of ['zero', 'intro']) {
  const scripts = [...catalog[key].scripts];
  assert(!scripts.includes('js/ark/blocks.js') && !scripts.includes('js/ark/vendor/ark-kit-public.js'), key + ' loads no Ark blocks');
  assert(scripts.includes('js/pages/' + (key === 'zero' ? 'home' : 'intro') + '.js'), key + ' loads its page module');
}

const kit = fs.readFileSync('js/world/ring-kit.js', 'utf8');
/* the owner, 2026-10-24: a card skin never recolours the core 3D grid. The default reads the site's theme (body) and adds no
   skin listener; only a host that opts in with data-world-skin="follow" (the Genesis scene) follows a skin wrapper. */
assert(/function themeBox\(\) \{ return \(follows\(\) && [^}]*\|\| document\.body/.test(kit), 'ring-kit reads the site theme (body) unless its host opts in to follow a skin');
assert(/if \(follows\(\)\) \{ document\.addEventListener\('defxn:skin'/.test(kit), 'ring-kit listens for skin changes only when its host follows skins');
assert(/data-world-skin="follow"/.test(kit), 'the opt-in is named in the kit');
assert(/LOCKED = \/\^--\(chain-\|net-\|ember\$\)\//.test(kit), 'the chain kinds, the networks and --ember are never skinned');
assert(!/setInterval|MutationObserver\(function \(\) \{ *tick/.test(kit), 'no polling for a skin');

/* the world reads ArkWorld, and keeps no copy of its numbers */
const host = fs.readFileSync('js/world/world-host.js', 'utf8');
for (const needle of ['ArkWorld.onChange', 'ArkWorld.forRoute', 'ArkWorld.get()', '--rise-in', '--rise-stagger', '--rise-out', 'setLook']) assert(host.includes(needle), 'world-host.js uses ' + needle);
assert(/var CALM = \{/.test(host) && (host.match(/CALM = \{/g) || []).length === 1, 'the calm pose is named in one place');
console.log('world-pages: ok');
