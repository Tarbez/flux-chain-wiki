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
import { brotliCompress, gzip, constants as zc } from 'node:zlib';
import { promisify } from 'node:util';
import { proxyFleetPulse } from './lib/fleet-pulse-proxy.mjs';
import { engineDir, engineBrowserFiles } from './lib/fxn-3d-closure.mjs';
import { FLEET_STATS_ROUTES, proxyFleetStats } from './lib/fleet-stats.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
/* The 3D engine's browser modules live in the sibling repo flux/fxn-3d; the world host imports them as /fxn-3d/<path>.
   Only the derived closure of the renderer and the sampler is served from there (scripts/lib/fxn-3d-closure.mjs). */
const ENGINE = engineDir(ROOT);
/* the closure is derived again when a request misses it (at most once a second), so an engine file that fxn-3d gains
   while this server runs is served without a restart (2026-10-30: a new engine module 404ed until the server restarted) */
let ENGINE_FILES = engineBrowserFiles(ENGINE), engineAt = Date.now();
function inEngine(rel) {
  if (ENGINE_FILES.has(rel)) return true;
  if (Date.now() - engineAt < 1000) return false;
  ENGINE_FILES = engineBrowserFiles(ENGINE); engineAt = Date.now();
  return ENGINE_FILES.has(rel);
}
const PORT = Number(process.env.PORT || 3438);
const HOST = process.env.HOST || '127.0.0.1';
const ADMIN_ORIGIN = process.env.DEFXN_ADMIN_ORIGIN || 'http://127.0.0.1:3437';
const PRIVATE = /^\/(admin\.html|admin-app\.html|scripts|tests|\.git|\.vercel|node_modules|Flux Chain Admin\.command|README\.md)(\/|$)/;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.ico': 'image/x-icon',
};

/* Compression, so local load numbers match a host that compresses (Vercel serves static text as br/gzip).
   Only types that shrink: text, markup and the world blobs (.flx, .bin). PNG, JPG, WEBP, GLB, WOFF/WOFF2 are already
   packed and would cost CPU for ~0 bytes. Brotli beats gzip, gzip beats nothing, chosen from Accept-Encoding.
   Each compressed body is computed once per (path, mtime, size) and kept in memory up to CACHE_MAX bytes, oldest first
   out (a Map iterates in insertion order), so a repeat request costs a lookup, not a compression. */
const COMPRESSIBLE = new Set(['.js', '.mjs', '.css', '.html', '.svg', '.txt', '.flx', '.bin', '.json', '.md']);
const CACHE_MAX = 64 * 1024 * 1024;
const zbr = promisify(brotliCompress), zgz = promisify(gzip);
const zcache = new Map(), zpending = new Map();
let zbytes = 0;
function pickEncoding(header) {
  const q = new Map();
  for (const part of String(header || '').split(',')) {
    const [name, ...params] = part.trim().toLowerCase().split(';'); if (!name) continue;
    const m = params.join(';').match(/q=([0-9.]+)/); q.set(name, m ? Number(m[1]) : 1);
  }
  const ok = (e) => (q.get(e) ?? 0) > 0;
  return ok('br') ? 'br' : ok('gzip') ? 'gzip' : null;
}
async function compressed(file, enc, body, st) {
  const key = `${enc}\0${file}\0${st.mtimeMs}\0${st.size}`;
  const hit = zcache.get(key); if (hit) return hit;
  let job = zpending.get(key);
  if (!job) {
    /* brotli quality 6: near quality-11 size on text at a small fraction of the CPU; the 64 MB cache absorbs the one-off cost */
    job = (enc === 'br' ? zbr(body, { params: { [zc.BROTLI_PARAM_QUALITY]: 6, [zc.BROTLI_PARAM_SIZE_HINT]: body.length } }) : zgz(body, { level: 9 }))
      .then((out) => {
        zcache.set(key, out); zbytes += out.length;
        for (const [k, v] of zcache) { if (zbytes <= CACHE_MAX) break; zcache.delete(k); zbytes -= v.length; }
        return out;
      }).finally(() => zpending.delete(key));
    zpending.set(key, job);
  }
  return job;
}

/* Relative URLs in index.html (js/x.js, css/y.css) resolve against the current path, so a hard load of
   /learnings/some-slug asks for /learnings/js/x.js. Strip the route segments in front of a known asset folder. */
export function assetPath(pathname) {
  const m = pathname.match(/^\/.+?\/((?:js|css|assets|docs|legacy)\/.*)$/);
  return m ? '/' + m[1] : pathname;
}

async function fileFor(pathname) {
  /* an engine file: exactly the derived closure, matched as a whole path, so no other file of fxn-3d is reachable */
  if (pathname.startsWith('/fxn-3d/')) {
    const rel = decodeURIComponent(pathname.slice('/fxn-3d/'.length));
    if (!inEngine(rel)) return null;
    const f = join(ENGINE, rel);
    try { const s = await stat(f); return s.isFile() ? f : null; } catch { return null; }
  }
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const full = join(ROOT, clean);
  if (full !== ROOT && !full.startsWith(ROOT + sep)) return null;
  try { const s = await stat(full); return s.isFile() ? full : null; } catch { return null; }
}


/* DEV DIAGNOSTIC (only when DEFXN_DIAG_LOG names a file): every served html page gets /__diag.js, which reports what
   the owner's own browser sees (errors, warnings, failed loads, WebGL context loss, the 3D host's state) to POST /__diag;
   the server appends one key=value line per report to that file. Added 2026-10-30: the 3D drew in every automated
   browser and stayed blank in the owner's Chrome, and nothing showed why. Off by default; never in the pack. */
const DIAG_LOG = process.env.DEFXN_DIAG_LOG || '';
const DIAG_JS = `(function(){var q=[],t=null;function send(k,m){q.push('t='+Math.round(performance.now())+' kind='+k+' page='+encodeURIComponent(location.pathname+location.search+location.hash)+' msg='+encodeURIComponent(String(m).slice(0,600)));clearTimeout(t);t=setTimeout(function(){var b=q.join('\\n');q=[];try{fetch('/__diag',{method:'POST',body:b,keepalive:true})}catch(e){}},300)}
['error','warn'].forEach(function(l){var o=console[l];console[l]=function(){try{send(l,[].map.call(arguments,function(a){return a&&a.stack?a.stack:a}).join(' '))}catch(e){}return o.apply(console,arguments)}});
addEventListener('error',function(e){if(e.target&&e.target!==window&&(e.target.src||e.target.href))send('loadfail',e.target.src||e.target.href);else send('pageerror',(e.message||'')+' '+(e.filename||'')+':'+(e.lineno||''))},true);
addEventListener('unhandledrejection',function(e){send('rejection',e.reason&&(e.reason.stack||e.reason.message)||e.reason)});
var gc=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type){var c=gc.apply(this,arguments);if(c&&/webgl/.test(type)&&!this.__dg){this.__dg=1;var id=this.id||this.className||'canvas';this.addEventListener('webglcontextlost',function(){send('ctxlost',id)});this.addEventListener('webglcontextrestored',function(){send('ctxrestored',id)});try{var d=c.getExtension('WEBGL_debug_renderer_info');send('gl',id+' '+type+' '+(d?c.getParameter(d.UNMASKED_RENDERER_WEBGL):'?'))}catch(e){}}if(!c&&/webgl/.test(type))send('noctx',type);return c};
function snap(n){var h=window.ArkWorldHost,cv=document.getElementById('chains');send('state'+n,'world='+document.documentElement.dataset.world+' ready='+(h&&h.ready)+' failed='+(h&&h.failed)+' view='+(h&&h.view)+' canvas='+(cv?cv.width+'x'+cv.height+' op='+getComputedStyle(cv).opacity+' disp='+getComputedStyle(cv).display+' vis='+getComputedStyle(cv).visibility:'none')+' win='+innerWidth+'x'+innerHeight+' dpr='+devicePixelRatio+' ua='+navigator.userAgent)}
window.__defxnDiag=send;send('motion','reduce='+matchMedia('(prefers-reduced-motion: reduce)').matches);addEventListener('load',function(){setTimeout(function(){snap(3)},3000);setTimeout(function(){snap(9)},9000)});addEventListener('hashchange',function(){setTimeout(function(){snap('h')},3000)});})();`;

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    let pathname = url.pathname;
    /* The public preview and CMS intentionally use separate servers. Make the
       obvious local /admin address useful instead of letting the SPA fallback
       render Home. The admin host still applies its own session/ownership gate. */
    if ((pathname === '/admin' || pathname === '/admin/') && req.method === 'GET') {
      const target = new URL('/admin' + url.search, ADMIN_ORIGIN);
      res.writeHead(307, { location: target.href, 'cache-control': 'no-store' }).end();
      return;
    }
    if (pathname === '/api/fleet-pulse') {
      if (req.method !== 'GET') { res.writeHead(405).end('Method not allowed'); return; }
      await proxyFleetPulse(res); return;
    }
    if (DIAG_LOG && pathname === '/__diag.js') { res.writeHead(200, { 'content-type': TYPES['.js'], 'cache-control': 'no-store' }).end(DIAG_JS); return; }
    if (DIAG_LOG && pathname === '/__diag' && req.method === 'POST') {
      let raw = ''; for await (const c of req) { raw += c; if (raw.length > 65536) break; }
      const { appendFile } = await import('node:fs/promises');
      await appendFile(DIAG_LOG, raw.split('\n').map(l => new Date().toISOString() + ' ' + l).join('\n') + '\n');
      res.writeHead(204).end(); return;
    }
    if (FLEET_STATS_ROUTES[pathname]) {
      if (req.method !== 'GET') { res.writeHead(405).end('Method not allowed'); return; }
      await proxyFleetStats(res, FLEET_STATS_ROUTES[pathname], url.searchParams); return;
    }
    if (PRIVATE.test(pathname)) { res.writeHead(404).end('Not found'); return; }
    let file = pathname === '/' ? join(ROOT, 'index.html') : await fileFor(pathname);
    if (!file) file = await fileFor(assetPath(pathname));
    /* A standalone page (resolver-math.html, broker.html) must answer on its
       clean path too, BEFORE the index.html fallback — otherwise /resolver-math
       silently serves the app shell, which looks like a page that does not load.
       The private check is re-applied to the candidate: without it, /admin would
       newly resolve to admin.html and bypass PRIVATE entirely. */
    if (!file && !extname(pathname)) {
      const candidate = pathname.replace(/\/+$/, '') + '.html';
      if (!PRIVATE.test(candidate)) file = await fileFor(candidate);
    }
    if (!file && !extname(pathname)) file = join(ROOT, 'index.html');
    if (!file) { res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found'); return; }
    const ext = extname(file);
    const headers = { 'content-type': TYPES[ext] || 'application/octet-stream', 'cache-control': 'no-cache' };
    let body = await readFile(file);
    if (DIAG_LOG && ext === '.html') body = Buffer.from(String(body).replace(/<head[^>]*>/i, m => m + '<script src="/__diag.js"></script>'));
    if (COMPRESSIBLE.has(ext) && !(DIAG_LOG && ext === '.html')) {
      headers.vary = 'Accept-Encoding';
      const enc = body.length > 256 ? pickEncoding(req.headers['accept-encoding']) : null;
      if (enc) { body = await compressed(file, enc, body, await stat(file)); headers['content-encoding'] = enc; }
    }
    headers['content-length'] = body.length;
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (error) {
    res.writeHead(500, { 'content-type': 'text/plain' }).end('Server error');
  }
}).listen(PORT, HOST, () => console.log(`defxn site on http://${HOST}:${PORT}`));
