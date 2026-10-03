const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const requests = [];
const context = vm.createContext({ location:{protocol:'http:',pathname:'/lifecycle/offer'}, ArkUI: { pageModules: { sample: { mount() {} } } }, document: {
 createElement() { return {}; }, head: { appendChild(script) { requests.push(script.src); script.onload(); } }
}});
vm.runInContext(fs.readFileSync('js/ark/page-loader.js','utf8'), context);
(async () => {
 for (const path of ['https://example.com/evil.js','//example.com/evil.js','javascript:alert(1)','js/../evil.js','js/%2e%2e/evil.js','/tmp/evil.js']) {
  await assert.rejects(context.ArkUI.loadPage('sample', { module:'sample', scripts:[path] }), /Invalid page asset/);
 }
 assert.equal(requests.length,0);
 await context.ArkUI.loadPage('sample', { module:'sample', scripts:['js/pages/home.js'] });
 await context.ArkUI.loadPage('sample', { module:'sample', scripts:['js/pages/home.js'] });
 assert.equal(requests.length,1);
 assert(requests[0].startsWith('/js/pages/home.js?'),'nested clean routes must load dependencies from the site root');
 const html=fs.readFileSync('index.html','utf8');
 assert(!/<script>([\s\S]*?)<\/script>/.test(html));
 assert(html.includes("script-src 'self' file:;"));
 assert(html.includes("base-uri 'none'"));
 const connect = (html.match(/connect-src ([^;]+);/) || [])[1] || '';
 assert(connect.split(' ').every(origin => origin === "'self'" || /^(http:\/\/(127\.0\.0\.1|localhost):8766|https:\/\/(public|st[1-9])\.defxn\.com)$/.test(origin)), 'Account/CMS may contact its own host; Explorer is limited to local Miner and named public/storage hosts: ' + connect);
 assert(!connect.includes('*'), 'connect-src must never use a wildcard');
 assert(!html.includes('js/resolvers/logo.js'));
 // A CTA may send a visitor only within this site. Reason: `window.location.assign(p.href)` took whatever copy said, so a
 // `javascript:` or `//host` href in a content file would have run script or redirected off-site. Not reachable from a visitor
 // today (same trust as editing the JS), which is exactly why it is cheap to close now and expensive to find later.
 {
  const ark = vm.createContext({});
  vm.runInContext(fs.readFileSync('js/ark/props.js','utf8'), ark);
  const ok = ['#', '#/about', '#/experiments/lab', '/', '/experiments', '/a/b?c=1#d'];
  const bad = ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'data:text/html,<script>1</script>', 'vbscript:x', '//evil.example', '/\\evil.example', '\\\\evil.example',
   'https://evil.example', 'http://evil.example', 'about:blank', '#/a b', '/\t/evil.example', '', null, undefined, 42, {}, ['#/a']];
  for (const value of ok) assert.equal(ark.ArkProps.isSiteHref(value), true, 'should allow ' + value);
  for (const value of bad) assert.equal(ark.ArkProps.isSiteHref(value), false, 'must refuse ' + JSON.stringify(value));
  // ...and the button itself obeys it: a refused href does nothing at all (no navigation, and no fallback event either).
  let registered; const assigned = []; const events = [];
  const cta = vm.createContext({ ArkUI: { register: (id, manifest) => { registered = manifest; } }, Tokens: { u: (n) => n + 'px', v: (n) => 'var(--' + n + ')', css: () => '' }, CustomEvent: function (t) { this.type = t; },
   window: { location: { assign: (v) => assigned.push(v) } }, document: { dispatchEvent: (e) => events.push(e.type) } });
  vm.runInContext(fs.readFileSync('js/ark/props.js','utf8'), cta);
  vm.runInContext(fs.readFileSync('js/resolvers/cta.js','utf8'), cta);
  const click = (href) => { let handler; registered.decorate({ classList: { add() {} }, addEventListener: (t, h) => { handler = h; } }, { href }); handler(); };
  click('#/about'); click('javascript:alert(1)'); click('//evil.example'); click('https://evil.example'); click('/experiments'); click(undefined);
  assert.deepEqual(assigned, ['#/about', '/experiments'], 'only site hrefs navigate');
  assert.deepEqual(events, ['ark:enter'], 'an absent href still fires the enter event; a refused one fires nothing');
 }
 // The manifest index writes each id into a script tag. Reason: the ids are hardcoded today, but the admin editor rewrites this
 // file, so the guard must live in what it writes as well as in the file on disk.
 {
  const store = vm.createContext({ document: { write() {} } });
  vm.runInContext(fs.readFileSync('js/content/manifest.js','utf8'), store); vm.runInContext(fs.readFileSync('js/admin/store.js','utf8'), store);
  const run = (text) => { const writes = []; vm.runInContext(text, vm.createContext({ document: { write: (t) => writes.push(t) } })); return writes; };
  const hostile = ['home', 'x"><script>alert(1)</script>', '../evil', 'A', '1a', 'a-b', "a'b", '', 'home\n'];
  const written = run(store.ArkAdminStore.indexText(hostile));
  assert.equal(written.length, 1); assert(written[0].includes('manifests/home.js'), 'only the plain id is loaded');
  assert(!written.join('').includes('<script>alert'), 'no hostile id reaches document.write');
  const onDisk = fs.readFileSync('js/content/manifests/index.js', 'utf8');
  assert(onDisk.includes('/^[a-z][a-z0-9]*$/.test(id)'), 'the file on disk carries the same guard');
  assert.equal(run(onDisk).length, JSON.parse(onDisk.match(/ArkManifestIds = (\[.*?\]);/)[1]).length, 'and still loads every real manifest');
 }
 console.log('PASS: remote/traversal script rejection, local dependency caching, external bootstrap, restricted script policy, logo unloaded, CTA hrefs limited to this site, manifest ids guarded.');
})().catch(e=>{console.error(e);process.exitCode=1;});
