#!/usr/bin/env node
/* Local server for the public site with clean paths (/explore, /learnings/<slug>).
   Static files are served as-is; any extension-less path that is not a file falls back to
   index.html so the in-page router can open it on a hard refresh. Only the public site is
   served: the admin pages, tests, scripts and docs sources stay out, same as .vercelignore.

     node scripts/serve-site.mjs            # http://127.0.0.1:3438
     PORT=8080 node scripts/serve-site.mjs

   The same two rules (depth-independent asset URLs, extension-less fallback) are what the
   gateway in front of a mesh-published copy of this site must apply. */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { proxyFleetPulse } from './lib/fleet-pulse-proxy.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.env.PORT || 3438);
const HOST = process.env.HOST || '127.0.0.1';
const PRIVATE = /^\/(admin\.html|admin-app\.html|scripts|tests|\.git|\.vercel|node_modules|Flux Chain Admin\.command|README\.md)(\/|$)/;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.ico': 'image/x-icon',
};

/* Relative URLs in index.html (js/x.js, css/y.css) resolve against the current path, so a hard load of
   /learnings/some-slug asks for /learnings/js/x.js. Strip the route segments in front of a known asset folder. */
function assetPath(pathname) {
  const m = pathname.match(/^\/.+?\/((?:js|css|assets|docs|legacy)\/.*)$/);
  return m ? '/' + m[1] : pathname;
}

async function fileFor(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const full = join(ROOT, clean);
  if (full !== ROOT && !full.startsWith(ROOT + sep)) return null;
  try { const s = await stat(full); return s.isFile() ? full : null; } catch { return null; }
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    let pathname = url.pathname;
    if (pathname === '/api/fleet-pulse') {
      if (req.method !== 'GET') { res.writeHead(405).end('Method not allowed'); return; }
      await proxyFleetPulse(res); return;
    }
    if (PRIVATE.test(pathname)) { res.writeHead(404).end('Not found'); return; }
    let file = pathname === '/' ? join(ROOT, 'index.html') : await fileFor(pathname);
    if (!file) file = await fileFor(assetPath(pathname));
    if (!file && !extname(pathname)) file = join(ROOT, 'index.html');
    if (!file) { res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found'); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(body);
  } catch (error) {
    res.writeHead(500, { 'content-type': 'text/plain' }).end('Server error');
  }
}).listen(PORT, HOST, () => console.log(`defxn site on http://${HOST}:${PORT}`));
