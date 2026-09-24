/* =====================================================================
   PUBLISH HOST: serves admin.html and publishes what it edits
   ---------------------------------------------------------------------
   Run:  double-click "Flux Chain Admin.command", or  node scripts/publish-host.mjs --open
         [--port 3437] [--name flux-chain.ark] [--data <folder for authenticators, default ~/.flux-chain-admin>]
         [--storage <miner STORAGE_PATH>] [--status <url>] [--pin <url>] [--key <api key>]
   With none of --storage/--status/--pin/--key it finds a running Ark Miner (Desktop or CLI) itself.

   A local, loopback-only tool, like admin.html itself: it is never
   deployed. It exists because the admin page (a) may not call the miner
   itself, since the miner's pin API sends no CORS headers and the page's
   policy forbids network use, and (b) must not hold the miner's credential.
   The host holds that credential; it never holds a signing key. The signed-in
   identity's key lives in the browser and signs between /api/prepare and /api/publish.
   The admin is locked: nothing of the editor or the API is served without a session
   that scripts/lib/admin-session.mjs issues after an identity signs the host's challenge.

   Anything it serves is read-only project files under the whitelist below.
   Every request must come from a loopback Host, and every POST from this
   same origin, so another web page in your browser cannot drive it.
   ===================================================================== */
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createAdminStore, defaultDataDir } from './lib/admin-store.mjs';
import { clearedSessionCookie, createSessions, readSessionToken, SessionRefusal, sessionCookie } from './lib/admin-session.mjs';
import { PublishRefusal, publisherFromArgs } from './lib/publisher.mjs';
import { defaultProjectRoot } from './lib/site-bundle.mjs';

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
  sessions = createSessions({ authorize: (key) => publisher.authorize(key), store: createAdminStore({ dir: dataDir }), onNotice, otpEnabled: OTP_ENABLED }) }) {
  const loopbackHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
  const send = (res, status, body, type = 'application/json') => {
    res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' });
    res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  };

  function serveFile(res, pathname, session) {
    let requested;
    try { requested = decodeURIComponent(pathname === '/' ? '/admin.html' : pathname).replace(/^\/+/, ''); } catch { return send(res, 404, { ok: false, error: 'NOT_FOUND' }); }
    if (requested.includes('\0')) return send(res, 404, { ok: false, error: 'NOT_FOUND' });
    // Judge where the path RESOLVES, not what it says: `js/../scripts/x` starts with an allowed directory and is not in one.
    const file = path.resolve(root, requested);
    const relative = path.relative(root, file).split(path.sep).join('/');
    const allowed = SERVED.includes(relative) || (SERVED_DIRS.includes(relative.split('/')[0]) && relative.includes('/'));
    if (!allowed || relative.startsWith('..')) return send(res, 404, { ok: false, error: 'NOT_FOUND' });
    if (isLockedAsset(relative) && !session) {
      return send(res, 401, '<!doctype html><meta charset="utf-8"><title>Locked</title><p>The Flux Chain admin is locked. <a href="/admin.html">Sign in</a>.</p>', 'text/html; charset=utf-8');
    }
    fs.readFile(file, (error, data) => (error ? send(res, 404, { ok: false, error: 'NOT_FOUND' }) : send(res, 200, data, TYPES[path.extname(file)] || 'application/octet-stream')));
  }

  const server = http.createServer(async (req, res) => {
    try {
      if (!loopbackHosts.has(req.headers.host || '')) return send(res, 403, { ok: false, error: 'HOST_NOT_LOOPBACK' });
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      const token = readSessionToken(req.headers.cookie);
      const session = sessions.get(token);
      if (!url.pathname.startsWith('/api/')) return req.method === 'GET' ? serveFile(res, url.pathname, session) : send(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });

      if (req.method === 'POST') {
        const origin = req.headers.origin;
        if (origin && !loopbackHosts.has(new URL(origin).host)) return send(res, 403, { ok: false, error: 'CROSS_ORIGIN' });
        if (!/^application\/json\b/.test(req.headers['content-type'] || '')) return send(res, 415, { ok: false, error: 'JSON_ONLY' });
      }
      // Public: who is asking, and the way in. Nothing here reveals anything about the site or the miner.
      if (url.pathname === '/api/session' && req.method === 'GET') return send(res, 200, { ok: true, name: publisher.name, authenticated: !!session, publicKeyB64: session ? session.publicKeyB64 : null });
      if (url.pathname === '/api/session/challenge' && req.method === 'POST') return send(res, 200, { ok: true, ...sessions.challenge(req.headers.host) });
      // Step 1+2 (sign the challenge, then the owner check): proves who is asking, but issues a TICKET, never a
      // cookie -- unless OTP_ENABLED is off, in which case a proven, authorized identity IS the session (see
      // the constant above): this route then sets the cookie itself, same as /api/session/otp normally does.
      if (url.pathname === '/api/session/login' && req.method === 'POST') {
        const body = JSON.parse(await readBody(req) || '{}');
        const made = await sessions.login({ publicKeyB64: body.publicKeyB64, nonce: body.nonce, signatureB64: body.signature, label: body.label });
        if (made.session) {
          res.setHeader('set-cookie', sessionCookie(made.session.token, SESSION_MAX_AGE_SECONDS));
          return send(res, 200, { ok: true, done: true, publicKeyB64: made.session.publicKeyB64, lastSignIn: made.session.lastSignIn, enrolled: made.session.enrolled });
        }
        return send(res, 200, { ok: true, ...made });
      }
      // Step 3: the one-time code. Only this route ever sets the session cookie.
      if (url.pathname === '/api/session/otp' && req.method === 'POST') {
        const body = JSON.parse(await readBody(req) || '{}');
        const made = sessions.verifyOtp({ ticket: body.ticket, code: body.code, hostCode: body.hostCode });
        res.setHeader('set-cookie', sessionCookie(made.token, SESSION_MAX_AGE_SECONDS));
        return send(res, 200, { ok: true, publicKeyB64: made.publicKeyB64, lastSignIn: made.lastSignIn, enrolled: made.enrolled });
      }
      if (url.pathname === '/api/session/logout' && req.method === 'POST') {
        sessions.end(token);
        res.setHeader('set-cookie', clearedSessionCookie());
        return send(res, 200, { ok: true });
      }
      // Everything else is for a signed-in identity only.
      if (!session) return send(res, 401, { ok: false, error: 'The admin is locked. Sign in with your recovery file first.', failure: 'No one is signed in.', missing: 'a signed-in identity.', remedy: 'open /admin.html and sign in with your recovery file (.auth.flx).' });
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
        return send(res, 200, { ok: true, ...(await publisher.publish(body.record)) });
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
  const port = Number(args.port) || 3437;
  const url = `http://127.0.0.1:${port}/admin.html`;
  const publisher = publisherFromArgs(args, defaultProjectRoot);
  const openPage = () => {
    if (!args.open || process.env.FLUX_CHAIN_NO_OPEN) return;
    spawn(process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open', process.platform === 'win32' ? ['/c', 'start', '', url] : [url], { stdio: 'ignore', detached: true }).unref();
  };
  const dataDir = typeof args.data === 'string' ? args.data : defaultDataDir();
  const server = createHost({ root: defaultProjectRoot, publisher, port, dataDir });
  server.on('error', async (error) => {
    if (error.code !== 'EADDRINUSE') { console.error(error.message); process.exitCode = 1; return; }
    // Launching twice is normal ("I double-clicked it again"): if it is this tool already, just show the page.
    const running = await fetch(`http://127.0.0.1:${port}/api/session`).then((r) => r.json()).catch(() => null);
    if (running && running.name) { console.log(`The publish host is already running: ${url}`); openPage(); }
    else { console.error(`Port ${port} is in use by something else. Pass --port <another>.`); process.exitCode = 1; }
  });
  server.listen(port, '127.0.0.1', async () => {
    console.log(`Flux Chain publish host: ${url}  (name ${publisher.name}; loopback only). Close this window to stop it.`);
    const status = await publisher.status();
    console.log(status.reachable ? `Miner: ${status.miner?.label || status.miner?.statusBase}${status.miner?.networkId ? ` (network ${status.miner.networkId})` : ''}.` : `No miner yet: ${status.detail}`);
    openPage();
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => { console.error(error.message || error); process.exitCode = 1; });
}
