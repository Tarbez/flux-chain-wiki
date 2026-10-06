/* Derive HTTP page handling from the browser catalog, including indexed articles
   and theory pages. No separate server route list to drift out of sync. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export function readSiteRoutes(root) {
  const context = vm.createContext({ArkUI:{}, ArkCopy:{text:key=>key}, document:{write(){}}});
  function load(file) { vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file,timeout:1000}); }
  load('js/content/manifest.js');
  load('js/content/manifests/index.js');
  for (const id of context.ArkManifestIds) {
    if (!/^[a-z][a-z0-9]*$/.test(id)) throw new Error('Invalid manifest id in site routes.');
    load(`js/content/manifests/${id}.js`);
  }
  load('js/content/learnings.js'); load('js/content/article-index.js');
  load('js/content/resolutions.js');
  load('js/pages/catalog.js');
  return new Set(Object.values(context.ArkUI.pageCatalog).map(entry=>entry.path));
}

export function createSiteRouteResolver(routes) {
  const parents = [...new Set([...routes].map(route=>path.posix.dirname(route)).filter(parent=>parent !== '/'))].sort((a,b)=>b.length-a.length);
  return function resolveRoute(pathname) {
    if (routes.has(pathname)) return '/index.html';
    // A hard load of /lifecycle/offer resolves the shell's relative js/css URLs
    // under /lifecycle/. Rewrite only known route parents and asset directories;
    // the server still applies its static allowlist and CMS permission checks.
    for (const parent of parents) {
      if (pathname.startsWith(parent+'/')) {
        const asset=pathname.slice(parent.length);
        if (/^\/(js|css|assets)\//.test(asset)) return asset;
      }
    }
    return pathname;
  };
}
