/* =====================================================================
   PUBLISH HOST: serves admin.html and publishes what it edits
   ---------------------------------------------------------------------
   Run:  double-click "Flux Chain Admin.command", or  node scripts/publish-host.mjs --open
         [--port 3437] [--name flux-chain.ark] [--data <folder for authenticators, default ~/.flux-chain-admin>]
         [--storage <miner STORAGE_PATH>] [--status <url>] [--pin <url>] [--key <api key>]
         [--resolver <ark-gateway base URL, default https://gateway.deadark.com, or FLUX_CHAIN_RESOLVER_URL>]
   With none of --storage/--status/--pin/--key it finds a running Ark Miner (Desktop or CLI) itself.

   Default mode is a local, loopback-only tool. --origin https://<domain>
   --name <resolved-mesh-name> enables protected domain mode behind a TLS proxy. It exists because the admin page (a) may not call the miner
   itself, since the miner's pin API sends no CORS headers and the page's
   policy forbids network use, and (b) must not hold the miner's credential.
   The host holds that credential; it never holds a signing key. The signed-in
   identity's key lives in the browser and signs between /api/prepare and /api/publish.
   The local launcher opens editing without sign-in on direct loopback requests.
   Publishing requires a signed identity session. Protected hosts authenticate identity
   separately and verify maintainer permission against the signed mesh name record.

   Anything it serves is read-only project files under the whitelist below.
   Every request must come from a loopback Host, and every POST from this
   same origin, so another web page in your browser cannot drive it.
   ===================================================================== */
import fs from 'node:fs';
import { createCmsPermissions } from './lib/cms-permissions.mjs';
import { readSiteRoutes, createSiteRouteResolver } from './lib/site-routes.mjs';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createAdminStore, defaultDataDir } from './lib/admin-store.mjs';
import { clearedSessionCookie, createSessions, readSessionToken, SessionRefusal, sessionCookie } from './lib/admin-session.mjs';
import { PublishRefusal, publisherFromArgs } from './lib/publisher.mjs';
import { defaultProjectRoot } from './lib/site-bundle.mjs';
import { verifyPublishedResolution } from './lib/resolve-check.mjs';

const DEFAULT_RESOLVER_BASE = 'https://gateway.deadark.com';

// TEMPORARY: the Ark Pin browser extension this admin is signed in through has no OTP/TOTP
// support yet, so step 3 (scripts/lib/admin-session.mjs) blocks sign-in entirely instead of
// adding security. Flip this back to true once the extension can prompt for and submit a
// TOTP code itself; nothing else about the OTP flow was removed, only unwired here.
const OTP_ENABLED = false;
/* robots.txt/sitemap.xml are generated at the project root (scripts/lib/site-bundle.mjs's
   projectFiles(), from js/content/seo.js) the same way theme-data.js etc. are -- served
   here so a real crawler can fetch them, same as it fetches index.html. */
const SERVED = ['admin.html', 'admin-app.html', 'index.html', 'robots.txt', 'sitemap.xml'];
/* The admin surface is deny-by-default: the editor page and everything under js/admin/ needs a session, except the two files
   the locked page itself must load. A file added under js/admin/ later is locked without anyone remembering to lock it. */
const PUBLIC_ADMIN = new Set(['js/admin/auth.js', 'js/admin/gate.js']);
const isLockedAsset = (relative) => (relative === 'admin-app.html' || relative.startsWith('js/admin/')) && !PUBLIC_ADMIN.has(relative);
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;
const SERVED_DIRS = ['css', 'js', 'assets'];
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8' };
const MAX_BODY = 16 * 1024 * 1024;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1]?.startsWith('--') || argv[i + 1] === undefined ? true : argv[++i];
  return out;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let total = 0;
    req.on('data', (chunk) => { total += chunk.length; if (total > MAX_BODY) { reject(new PublishRefusal('The request is too large.', 'a site under 16 MB.', 'shorten the content.', 413)); req.destroy(); } else chunks.push(chunk); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export function createHost({ root = defaultProjectRoot, publisher, port, dataDir = null, onNotice = (n) => console.log(`[flux-chain-admin] ${n.message}`),
  resolverBase = process.env.FLUX_CHAIN_RESOLVER_URL || DEFAULT_RESOLVER_BASE, resolveCheck = verifyPublishedResolution,
  sessions, permissions, publicBase, localDevelopment = false, deployedOrigin = null, siteRoutes = readSiteRoutes(root) }) {
  const routeFile = createSiteRouteResolver(siteRoutes);
  // Injected legacy session managers already enforce owner authorization.
  permissions = permissions || (sessions ? (key) => publisher.authorize(key) : createCmsPermissions({name:publisher.name,publicBase}));
  sessions = sessions || createSessions({authorize:async () => {},store:createAdminStore({dir:dataDir}),onNotice,otpEnabled:OTP_ENABLED});
  const production = deployedOrigin ? new URL(deployedOrigin) : null;
  if (production && (production.protocol !== 'https:' || production.username || production.password || production.pathname !== '/' || production.search || production.hash)) throw new Error('Deployed CMS origin must be an HTTPS origin.');
  if (production && localDevelopment) throw new Error('Deployed CMS cannot enable local development access.');
  const loopbackHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
  if (production) { loopbackHosts.clear(); loopbackHosts.add(production.host); }
  const cookieFor = (token) => sessionCookie(token, SESSION_MAX_AGE_SECONDS) + (production ? '; Secure' : '');
  const send = (res, status, body, type = 'application/json') => {
    res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' });
    res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  };

  async function serveFile(res, pathname, session, localAccess) {
    let requested;
    try { requested = decodeURIComponent(pathname === '/admin' ? '/admin.html' : routeFile(pathname)).replace(/^\/+/, ''); } catch { return send(res, 404, { ok: false, error: 'NOT_FOUND' }); }
    if (requested.includes('\0')) return send(res, 404, { ok: false, error: 'NOT_FOUND' });
    // Judge where the path RESOLVES, not what it says: `js/../scripts/x` starts with an allowed directory and is not in one.
    const file = path.resolve(root, requested);
    const relative = path.relative(root, file).split(path.sep).join('/');
    const allowed = SERVED.includes(relative) || (SERVED_DIRS.includes(relative.split('/')[0]) && relative.includes('/'));
    if (!allowed || relative.startsWith('..')) return send(res, 404, { ok: false, error: 'NOT_FOUND' });
    if (isLockedAsset(relative) && !session && !localAccess) {
      return send(res, 401, '<!doctype html><meta charset="utf-8"><title>Locked</title><p>The Flux Protocol admin is locked. <a href="/admin.html">Sign in</a>.</p>', 'text/html; charset=utf-8');
    }
    if (isLockedAsset(relative) && !localAccess) await permissions(session.publicKeyB64);
    fs.readFile(file, (error, data) => (error ? send(res, 404, { ok: false, error: 'NOT_FOUND' }) : send(res, 200, data, TYPES[path.extname(file)] || 'application/octet-stream')));
  }

  const server = http.createServer(async (req, res) => {
    try {
      if (!loopbackHosts.has(req.headers.host || '')) return send(res, 403, { ok: false, error: production ? 'HOST_NOT_CONFIGURED' : 'HOST_NOT_LOOPBACK' });
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      if (url.pathname === '/index.html' && req.method === 'GET') {
        res.writeHead(308, { location: '/' + url.search, 'cache-control': 'no-store' });
        return res.end();
      }
      if (url.pathname === '/admin/' && req.method === 'GET') {
        res.writeHead(308, { location: '/admin' + url.search, 'cache-control': 'no-store' });
        return res.end();
      }
      if (url.pathname !== '/' && url.pathname.endsWith('/') && siteRoutes.has(url.pathname.replace(/\/+$/, '')) && req.method === 'GET') {
        res.writeHead(308, {location:url.pathname.replace(/\/+$/, '') + url.search,'cache-control':'no-store'});
        return res.end();
      }
      const localAccess = localDevelopment && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) && !req.headers.forwarded && !req.headers['x-forwarded-for'] && !req.headers['x-forwarded-host'];
      const token = readSessionToken(req.headers.cookie);
      const session = sessions.get(token);
      if (!url.pathname.startsWith('/api/')) return req.method === 'GET' ? await serveFile(res, url.pathname, session, localAccess) : send(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });

      if (req.method === 'POST') {
        const origin = req.headers.origin;
        if ((production && origin !== production.origin) || (origin && !production && (!loopbackHosts.has(new URL(origin).host) || new URL(origin).protocol !== 'http:'))) return send(res, 403, { ok: false, error: 'CROSS_ORIGIN' });
        if (!/^application\/json\b/.test(req.headers['content-type'] || '')) return send(res, 415, { ok: false, error: 'JSON_ONLY' });
      }
      // Public: who is asking, and the way in. Nothing here reveals anything about the site or the miner.
      if (url.pathname === '/api/session' && req.method === 'GET') return send(res, 200, { ok: true, name: publisher.name, ...(localAccess ? {localDevelopment:true} : {}), authenticated: !!session, publicKeyB64: session ? session.publicKeyB64 : null });
      if (url.pathname === '/api/session/challenge' && req.method === 'POST') return send(res, 200, { ok: true, ...sessions.challenge(req.headers.host) });
      // Identity proof issues the session. CMS ownership is checked separately.
      // With OTP enabled this issues a ticket until the code is verified.
      if (url.pathname === '/api/session/login' && req.method === 'POST') {
        const body = JSON.parse(await readBody(req) || '{}');
        const made = await sessions.login({ publicKeyB64: body.publicKeyB64, nonce: body.nonce, signatureB64: body.signature, label: body.label });
        if (made.session) {
          res.setHeader('set-cookie', cookieFor(made.session.token));
          return send(res, 200, { ok: true, done: true, publicKeyB64: made.session.publicKeyB64, lastSignIn: made.session.lastSignIn, enrolled: made.session.enrolled });
        }
        return send(res, 200, { ok: true, ...made });
      }
      // Step 3: the one-time code. Only this route ever sets the session cookie.
      if (url.pathname === '/api/session/otp' && req.method === 'POST') {
        const body = JSON.parse(await readBody(req) || '{}');
        const made = sessions.verifyOtp({ ticket: body.ticket, code: body.code, hostCode: body.hostCode });
        res.setHeader('set-cookie', cookieFor(made.token));
        return send(res, 200, { ok: true, publicKeyB64: made.publicKeyB64, lastSignIn: made.lastSignIn, enrolled: made.enrolled });
      }
      if (url.pathname === '/api/session/logout' && req.method === 'POST') {
        sessions.end(token);
        res.setHeader('set-cookie', clearedSessionCookie() + (production ? '; Secure' : ''));
        return send(res, 200, { ok: true });
      }
      if (url.pathname === '/api/cms/access' && req.method === 'GET') {
        if (localAccess) return send(res,200,{ok:true,authorized:true,source:'local-development'});
        if (!session) return send(res,401,{ok:false,error:'Sign in to check CMS access.'});
        try { return send(res,200,{ok:true,...await permissions(session.publicKeyB64),authorized:true}); }
        catch (error) { return send(res,200,{ok:true,authorized:false,error:error.message,missing:error.missing,remedy:error.remedy}); }
      }
      // Everything else is for a signed-in identity only.
      if (!session && (!localAccess || ['/api/prepare','/api/publish'].includes(url.pathname))) return send(res, 401, { ok: false, error: 'The admin is locked. Sign in with your recovery file first.', failure: 'No one is signed in.', missing: 'a signed-in identity.', remedy: 'open /admin.html and sign in with your recovery file (.auth.flx).' });
      if (!localAccess) await permissions(session.publicKeyB64);
      if (url.pathname === '/api/status' && req.method === 'GET') return send(res, 200, { ok: true, ...(await publisher.status()) });
      if (url.pathname === '/api/site' && req.method === 'GET') return send(res, 200, { ok: true, ...(await publisher.fetchSite()) });
      if (url.pathname === '/api/prepare' && req.method === 'POST') {
        const body = JSON.parse(await readBody(req) || '{}');
        // A session is one identity. It cannot prepare a version on behalf of another key.
        if (body.ownerPublicKey !== session.publicKeyB64) throw new SessionRefusal('This session belongs to a different identity than the one publishing.', 'the signed-in identity as owner.', 'sign in again, then publish.', 403);
        return send(res, 200, { ok: true, ...(await publisher.prepare(body.site, body.ownerPublicKey)) });
      }
      if (url.pathname === '/api/publish' && req.method === 'POST') {
        const body = JSON.parse(await readBody(req) || '{}');
        if (body.record?.ownerPublicKey !== session.publicKeyB64) throw new SessionRefusal('This session belongs to a different identity than the record\'s owner.', 'the signed-in identity as owner.', 'sign in again, then publish.', 403);
        if (body.marker?.ownerPublicKey !== session.publicKeyB64) throw new SessionRefusal('This session belongs to a different identity than the public marker\'s owner.', 'the signed-in identity as owner.', 'sign in again, then publish.', 403);
        const published = await publisher.publish(body.record, body.marker);
        // The mesh write above already succeeded -- this is a SEPARATE question (does the public
        // gateway agree?), so its result never changes whether /api/publish itself reports success.
        // It fails closed (an explicit {ok:false, reason}), never silently, and never assumes success.
        let resolverCheck;
        try {
          resolverCheck = { ok: true, ...(await resolveCheck({ name: publisher.name, cid: published.cid, resolverBase })) };
        } catch (error) {
          resolverCheck = { ok: false, reason: error.reason || 'GATEWAY_CHECK_FAILED', detail: error.message, ...(error.url ? { url: error.url } : {}) };
        }
        return send(res, 200, { ok: true, ...published, resolverCheck });
      }
      return send(res, 404, { ok: false, error: 'NOT_FOUND' });
    } catch (error) {
      if (error instanceof PublishRefusal || error instanceof SessionRefusal) return send(res, error.status, { ok: false, error: error.message, failure: error.failure, missing: error.missing, remedy: error.remedy, ...error.extra });
      return send(res, error instanceof SyntaxError ? 400 : 500, { ok: false, error: error instanceof SyntaxError ? 'The request body is not JSON.' : (error.message || String(error)) });
    }
  });
  return server;
}

/* The program is a function, so importing this file for its exports runs nothing. */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.origin && typeof args.name !== 'string') throw new Error('Domain CMS requires --name with this deployment’s resolved mesh name.');
  const port = Number(args.port) || 3437;
  const url = args.origin ? new URL('/admin', args.origin).href : `http://127.0.0.1:${port}/admin`;
  const publisher = publisherFromArgs(args, defaultProjectRoot);
  const openPage = () => {
    if (!args.open || process.env.FLUX_CHAIN_NO_OPEN) return;
    spawn(process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open', process.platform === 'win32' ? ['/c', 'start', '', url] : [url], { stdio: 'ignore', detached: true }).unref();
  };
  const dataDir = typeof args.data === 'string' ? args.data : defaultDataDir();
  const resolverBase = typeof args.resolver === 'string' ? args.resolver : (process.env.FLUX_CHAIN_RESOLVER_URL || DEFAULT_RESOLVER_BASE);
  const server = createHost({ root: defaultProjectRoot, publisher, port, dataDir, resolverBase, localDevelopment:!args.origin, deployedOrigin:typeof args.origin === 'string' ? args.origin : null });
  server.on('error', async (error) => {
    if (error.code !== 'EADDRINUSE') { console.error(error.message); process.exitCode = 1; return; }
    // Launching twice is normal ("I double-clicked it again"): if it is this tool already, just show the page.
    const running = await fetch(`http://127.0.0.1:${port}/api/session`).then((r) => r.json()).catch(() => null);
    if (running && running.name) { console.log(`The publish host is already running: ${url}`); openPage(); }
    else { console.error(`Port ${port} is in use by something else. Pass --port <another>.`); process.exitCode = 1; }
  });
  server.listen(port, '127.0.0.1', async () => {
    console.log(`Flux Protocol publish host: ${url}  (name ${publisher.name}; ${args.origin ? 'protected domain mode' : 'local development'}). Close this window to stop it.`);
    const status = await publisher.status();
    console.log(status.reachable ? `Miner: ${status.miner?.label || status.miner?.statusBase}${status.miner?.networkId ? ` (network ${status.miner.networkId})` : ''}.` : `Publishing connection unavailable: ${status.detail}`);
    openPage();
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => { console.error(error.message || error); process.exitCode = 1; });
}
