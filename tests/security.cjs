const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const requests = [];
const context = vm.createContext({ ArkUI: { pageModules: { sample: { mount() {} } } }, document: {
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
 const html=fs.readFileSync('index.html','utf8');
 assert(!/<script>([\s\S]*?)<\/script>/.test(html));
 assert(html.includes("script-src 'self' file:;"));
 assert(html.includes("base-uri 'none'"));
 assert(html.includes("connect-src 'none'"));
 assert(!html.includes('js/resolvers/logo.js'));
 console.log('PASS: remote/traversal script rejection, local dependency caching, external bootstrap, restricted script policy, logo unloaded.');
})().catch(e=>{console.error(e);process.exitCode=1;});
