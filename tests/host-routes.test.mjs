/* Regression: direct navigation and reload of a browser route must open the
   shell, and nested shell assets must load without exposing private files. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import {createHost} from '../scripts/publish-host.mjs';
import {readSiteRoutes} from '../scripts/lib/site-routes.mjs';
const root=process.cwd(), routes=readSiteRoutes(root), shell=fs.readFileSync('index.html','utf8');
const reserve=http.createServer();await new Promise(resolve=>reserve.listen(0,'127.0.0.1',resolve));
const port=reserve.address().port;await new Promise(resolve=>reserve.close(resolve));
const server=createHost({root,port,publisher:{name:'flux-chain.ark'},permissions:async()=>({authorized:true})});
await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${port}`;
const get=(pathname)=>fetch(origin+pathname,{redirect:'manual'});
try {
  const assets=new Set();
  const bootstrap=[...shell.matchAll(/(?:src|href)="((?:js|css|assets)\/[^"?]+)(?:\?[^\"]*)?"/g)].map(match=>match[1]);
  for (const route of routes) {
    const response=await get(route+'?navigation=direct');
    assert.equal(response.status,200,route+' must survive a hard load');
    assert(response.headers.get('content-type').startsWith('text/html'));
    assert.equal(await response.text(),shell,route+' serves the same shell');
    if (route !== '/') {
      const redirect=await get(route+'/?navigation=reload');
      assert.equal(redirect.status,308);
      assert.equal(redirect.headers.get('location'),route+'?navigation=reload');
    }
    for (const asset of bootstrap) assets.add(new URL(asset,origin+route).pathname);
  }
  for (const asset of assets) {
    const response=await get(asset);assert.equal(response.status,200,'hard-loaded bootstrap asset '+asset);
    assert(!response.headers.get('content-type').startsWith('text/html'),'missing assets must never receive the shell');
    await response.arrayBuffer();
  }
  for (const pathname of ['/missing-page','/lifecycle/not-a-stage','/api/not-real','/js/pages/not-real.js','/scripts/publish-host.mjs','/lifecycle/scripts/publish-host.mjs','/lifecycle/js/../scripts/publish-host.mjs','/.git/config']) {
    const response=await get(pathname);assert([401,404].includes(response.status),'unknown/private URL stays denied: '+pathname);await response.text();
  }
  for (const pathname of ['/admin-app.html','/js/admin/admin.js','/lifecycle/js/admin/admin.js']) {
    const response=await get(pathname);assert.equal(response.status,401,'route rewriting must preserve the CMS gate');await response.text();
  }
  const canonical=await get('/index.html?q=kept');assert.equal(canonical.status,308);assert.equal(canonical.headers.get('location'),'/?q=kept');
  console.log(`PASS: all ${routes.size} catalog routes hard-load and reload; ${assets.size} bootstrap asset URLs work; unknown URLs and private CMS assets stay denied.`);
} finally {await new Promise(resolve=>server.close(resolve));}
