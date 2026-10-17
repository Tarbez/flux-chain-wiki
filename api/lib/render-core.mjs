/* The one place that knows how to turn the real static index.html into a
   fully-rendered page via jsdom. Shared by api/render.mjs (the Vercel
   serverless function, used only for bot requests) and
   scripts/ssr-preview.mjs (the local, no-deploy preview tool) so there is
   exactly one render path to reason about and test -- never two
   almost-identical copies drifting apart.

   This module has NO opinion on bot detection (api/lib/bot-detect.mjs owns
   that) and no opinion on fail-open fallback for a request (api/render.mjs
   owns that, since only it knows what "fall back to the plain static
   file" means for a live HTTP response). What it owns:
     - constructing the JSDOM instance the real site's ~60 deferred
       scripts can actually run inside,
     - stubbing canvas 2D so the inconsistent null-safety across
       js/lattice.js and js/ark/mesh-fabric.js can never throw here,
     - stubbing `window.matchMedia`, which jsdom does not implement at
       all, and statically expanding the three document.write-based
       content loaders jsdom does not order the way a real browser does
       (see expandWriteLoaders below) -- both discovered this session as
       the real blockers to a route ever finishing under jsdom,
     - waiting for the real "this route is ready" signal
       (js/ark/page-router.js's `ark:route-ready` event) instead of a
       blind sleep or a DOM poll,
     - serializing the finished document back to a string. */

import jsdomPkg from 'jsdom';
const { JSDOM, requestInterceptor } = jsdomPkg;
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/* Three files -- js/content/manifests/index.js, js/content/assets/index.js,
   js/content/secrets/index.js -- inject their per-item scripts with
   `document.write('<script defer src="...">')`, specifically so "every
   [manifest/asset/secret] is defined before any [other] script runs"
   (each file's own comment says exactly that). That guarantee holds in a
   real browser, which splices document.write output into the parse
   stream at the writer's own position, so the written deferred scripts
   keep their place ahead of later, statically declared deferred scripts.

   Confirmed this session: jsdom 30 does not preserve that relative order
   -- the written scripts (e.g. manifests/resolutions.js) end up executing
   AFTER later static deferred scripts that depend on them
   (js/content/resolutions.js, js/resolvers/header.js's buildProducts),
   which throws ("RESOLUTIONS.MEGA.READY has no entry") and cascades into
   the scene never finishing, so router.navigate() never runs and
   `ark:route-ready` never fires. This is a jsdom limitation, not a site
   bug -- real browsers do not have it, and the fix lives here, not in
   site code: before jsdom ever sees the HTML, replace each loader's
   `<script src=".../index.js?...">` tag with the exact
   `<script defer src=".../<id>.js?...">` tags document.write would have
   produced, read from that same loader's own id array -- so every item
   simply arrives in the document in the correct position from the
   start, and jsdom's document.write ordering quirk never gets a chance
   to matter. assets/index.js and secrets/index.js also read the global
   `ArkManifestSearch` the manifests loader sets (not deferred, so its
   value is still needed); that assignment is inlined ahead of the first
   expansion so it keeps existing for them. */
function expandWriteLoader(html, root, { tagRe, sourceRelPath, idsRe, idRe, targetDir, search, prelude }) {
  const tagMatch = tagRe.exec(html);
  if (!tagMatch) return { html, search }; // shape changed; leave html untouched rather than guess
  const resolvedSearch = search !== undefined ? search : (tagMatch[1] || '');
  let source;
  try { source = readFileSync(path.join(root, sourceRelPath), 'utf8'); }
  catch { return { html, search: resolvedSearch }; }
  const idsMatch = idsRe.exec(source);
  if (!idsMatch) return { html, search: resolvedSearch };
  let ids;
  try { ids = JSON.parse(idsMatch[1]); } catch { return { html, search: resolvedSearch }; }
  const expansion = (prelude || '') + ids
    .filter((id) => idRe.test(id))
    .map((id) => `<script src="${targetDir}${id}.js${resolvedSearch}" defer></script>`)
    .join('\n');
  const replaced = html.slice(0, tagMatch.index) + expansion + html.slice(tagMatch.index + tagMatch[0].length);
  return { html: replaced, search: resolvedSearch };
}

export function expandWriteLoaders(html, root) {
  const manifests = expandWriteLoader(html, root, {
    tagRe: /<script src="js\/content\/manifests\/index\.js(\?[^"]*)?"[^>]*><\/script>/,
    sourceRelPath: 'js/content/manifests/index.js',
    idsRe: /var ArkManifestIds = (\[[^;]+\]);/,
    idRe: /^[a-z][a-z0-9]*$/,
    targetDir: 'js/content/manifests/',
    // inlined ahead of the manifest scripts: assets/index.js and
    // secrets/index.js (further down the document) read this same
    // global, exactly as document.write would have left it set.
    prelude: '',
  });
  let html1 = manifests.html;
  const search = manifests.search;
  html1 = html1.replace(
    /(<script src="js\/content\/manifests\/[a-z][a-z0-9]*\.js)/,
    `<script>var ArkManifestSearch = ${JSON.stringify(search)};</script>\n$1`
  );
  const assets = expandWriteLoader(html1, root, {
    tagRe: /<script src="js\/content\/assets\/index\.js(\?[^"]*)?"[^>]*><\/script>/,
    sourceRelPath: 'js/content/assets/index.js',
    idsRe: /var ArkAssetIds = (\[[^;]+\]);/,
    idRe: /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/,
    targetDir: 'js/content/assets/',
    search,
  });
  const secrets = expandWriteLoader(assets.html, root, {
    tagRe: /<script src="js\/content\/secrets\/index\.js(\?[^"]*)?"[^>]*><\/script>/,
    sourceRelPath: 'js/content/secrets/index.js',
    idsRe: /var ArkSecretIds = (\[[^;]+\]);/,
    idRe: /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/,
    targetDir: 'js/content/secrets/',
    search,
  });
  return secrets.html;
}

/* Methods/properties actually called against a 2D context in js/lattice.js
   (8 call sites) and js/ark/mesh-fabric.js's paint() -- read directly from
   those two files this session, not guessed. Real jsdom returns `null`
   from canvas.getContext('2d') (no native `canvas` package installed, and
   that package has no WebGL support anyway, so it is not being added).
   Both files use the result without a null check, so an un-stubbed call
   throws under real jsdom. js/halo/grain.js and js/zero-webgl.js already
   null-check correctly and are left untouched -- this stub only has to be
   harmless for them, which a non-null stub object is. */
function makeStub2DContext() {
  const noop = () => {};
  return {
    // properties lattice.js/mesh-fabric.js read back after setting
    // (plain assignment semantics on an ordinary object already do the
    // right thing -- no getter/setter needed)
    fillStyle: '', strokeStyle: '', font: '', lineWidth: 1, globalAlpha: 1, textBaseline: 'alphabetic',
    // drawing methods actually called in those two files
    clearRect: noop, setTransform: noop, fillRect: noop, strokeRect: noop, fillText: noop,
    beginPath: noop, moveTo: noop, lineTo: noop, rect: noop, clip: noop,
    stroke: noop, fill: noop, save: noop, restore: noop,
    // not currently called in those two files, but cheap to cover per the
    // brief ("anything else you find actually called... or anything else")
    // so a future call site in either file never regresses this
    arc: noop, translate: noop, scale: noop, drawImage: noop,
    createLinearGradient: () => ({ addColorStop: noop }),
    measureText: () => ({ width: 0 }),
    // js/halo/grain.js also calls getContext('2d') -- it null-checks
    // correctly, but this stub answers every '2d' request the same way
    // (there is no way to tell grain.js's call from lattice.js's at the
    // getContext level), so its null branch never actually runs here.
    // Making the stub cover grain.js's real calls too keeps that
    // harmless: it paints into a throwaway ImageData backed by a real
    // typed array, never touching anything the page needs for metadata.
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(Math.max(0, w | 0) * Math.max(0, h | 0) * 4), width: w, height: h }),
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(0, w | 0) * Math.max(0, h | 0) * 4), width: w, height: h }),
    putImageData: noop,
  };
}

function stubCanvas(window) {
  if (!window.HTMLCanvasElement) return;
  window.HTMLCanvasElement.prototype.getContext = function (type) {
    if (type === '2d') return makeStub2DContext();
    return null; // webgl/experimental-webgl: real jsdom's own behavior without the `canvas` package
  };
}

/* jsdom does not implement the Web Animations API, so
   `Element.prototype.getAnimations` does not exist. Real browsers always
   have it (it is a standard method that simply returns `[]` when nothing
   is animating), so none of this site's four call sites
   (js/ark/scene-state.js, js/ark/text-presence.js, js/ark/page-router.js)
   null-check it -- there has never been a reason to. An un-stubbed call
   throws; some of those call sites are wrapped in a route's own
   try/catch (harmless, just a logged error), but not all are, so this is
   stubbed the same way matchMedia is rather than left to chance. */
function stubAnimations(window) {
  if (window.Element && !window.Element.prototype.getAnimations) {
    window.Element.prototype.getAnimations = function () { return []; };
  }
}

/* jsdom does not implement `window.matchMedia` at all (even with
   `pretendToBeVisual: true`) -- it has no real CSS media-query
   evaluation engine, so there is nothing for it to answer with. The real
   site calls it unconditionally in several places (js/hero-motion.js,
   js/lattice.js, js/ark/mesh-fabric.js, js/ark/runtime.js,
   js/resolvers/header.js, js/settings/panel.js, js/zero-webgl.js...), so
   an un-stubbed call throws `window.matchMedia is not a function` before
   any of those modules finish initializing -- which, like the canvas
   gap, cascades into the scene never finishing and `ark:route-ready`
   never firing. `matches: true` mirrors the fake window this repo's own
   tests/routes-live.cjs already uses for the same reason: a crawler
   render is a single static snapshot, so "reduced motion" / no hover-fine
   pointer is the correct answer for every query, not a guess. */
function stubMatchMedia(window) {
  window.matchMedia = function () {
    return {
      matches: true,
      media: '',
      addEventListener: () => {}, removeEventListener: () => {},
      addListener: () => {}, removeListener: () => {},
      dispatchEvent: () => true,
    };
  };
}

/* Waits for the real "metadata is ready" signal js/ark/page-router.js's
   navigate() dispatches right after applyRouteMetadata() runs, instead of
   polling the DOM or guessing a fixed sleep. Rejects on timeout so the
   caller's fail-open path (api/render.mjs) or failure assertion (the test)
   can tell a stalled/broken route apart from a fast one. */
export function waitForRouteReady(window, timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false;
    function onReady() {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      window.removeEventListener('ark:route-ready', onReady);
      resolve();
    }
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      window.removeEventListener('ark:route-ready', onReady);
      reject(new Error('Timed out after ' + timeoutMs + 'ms waiting for ark:route-ready'));
    }, timeoutMs);
    window.addEventListener('ark:route-ready', onReady);
  });
}

const LOCAL_CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.ico': 'image/x-icon',
};

/* index.html's own script/style tags use relative paths (`js/x.js`, not
   `/js/x.js`), so they resolve against the CURRENT route path, not the
   site root: a hard load of /stats/gpu asks for /stats/js/x.js, not
   /js/x.js. scripts/serve-site.mjs's own assetPath() documents and
   fixes exactly this for local dev; vercel.json's own rewrite does the
   same for a real deployment (both are the real "gateway" fix that
   comment says any server in front of this site needs). This is the
   same fix a third time, inlined rather than imported from
   scripts/serve-site.mjs: that file lives under scripts/, which
   .vercelignore excludes from every deployment, so api/lib/render-core.mjs
   (bundled into the deployed function) cannot depend on it without
   risking a build that cannot find it. Confirmed this session: without
   this, a direct render of any route nested under a hidden/deep path
   (e.g. /stats/gpu) hangs forever -- every asset request silently
   resolves to a wrong, nonexistent path and the page never finishes
   booting, with no thrown error to catch. */
function stripRouteSegments(pathname) {
  const match = /^\/.+?\/((?:js|css|assets|docs|legacy)\/.*)$/.exec(pathname);
  return match ? '/' + match[1] : pathname;
}

/* jsdom 30 replaced the old pluggable `ResourceLoader` class with
   undici dispatcher/interceptor hooks (see node_modules/jsdom/README.md's
   "Advanced configuration" section) -- there is no `ResourceLoader` export
   to subclass any more. This builds the `resources` option's new shape
   instead: an object carrying one `requestInterceptor` that answers every
   fetch straight off this repo's own file tree, so the jsdom pass used by
   scripts/ssr-preview.mjs and tests/ssr-render.cjs runs fully offline
   against local files, never a real network request. A path with no match
   on disk resolves to an empty 200 response (not a rejection), so a
   missing/external resource (e.g. a webfont) degrades silently -- the same
   way a real browser carries on past a failed stylesheet fetch, never
   aborting the whole render over a decorative asset. */
export function createLocalResources(root) {
  return {
    interceptors: [
      requestInterceptor(async (request) => {
        let pathname;
        try { pathname = new URL(request.url).pathname; } catch { pathname = request.url; }
        pathname = stripRouteSegments(pathname);
        const clean = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
        const full = path.join(root, clean);
        let body = Buffer.alloc(0);
        if ((full === root || full.startsWith(root + path.sep)) && existsSync(full)) {
          body = await readFile(full);
        }
        const type = LOCAL_CONTENT_TYPES[path.extname(full)] || 'application/octet-stream';
        return new Response(body, { status: 200, headers: { 'content-type': type } });
      }),
    ],
  };
}

/* Shared by renderDocument and getRouteCatalog below: builds the JSDOM
   instance, applies every stub, and waits for the route to settle.
   Leaves the window open on success -- callers close it once they are
   done reading from it. */
async function bootDocument({ html, url, resources = 'usable', timeoutMs = 4500, runScripts = 'dangerously', root = SITE_ROOT }) {
  const dom = new JSDOM(expandWriteLoaders(html, root), { url, runScripts, resources, pretendToBeVisual: true });
  // Stubbed synchronously, right after construction: every <script src>
  // (deferred or not) is fetched and executed asynchronously relative to
  // this call returning, so this lands before any site script can run.
  stubCanvas(dom.window);
  stubMatchMedia(dom.window);
  stubAnimations(dom.window);
  const errors = [];
  dom.window.addEventListener('error', (event) => { errors.push(event.error || event.message); });
  await waitForRouteReady(dom.window, timeoutMs);
  if (errors.length) throw errors[0];
  return dom;
}

/* Renders one request's worth of HTML through real jsdom: constructs the
   DOM from the given static `html`, stubs canvas before any site script
   can run, waits for the route to settle, and returns the serialized
   result. Throws on any failure (a thrown page error, a timeout) -- the
   caller decides what "failure" means for it (fail-open to the static
   file for a live request; a failed assertion for the test). */
export async function renderDocument(options) {
  const dom = await bootDocument(options);
  try {
    return dom.window.document.documentElement.outerHTML;
  } finally {
    // jsdom keeps timers/rAF loops alive (the site's own animation code);
    // nothing here needs them once the route has settled -- and
    // serialization above already happened while the window was live.
    dom.window.close();
  }
}

/* Boots the real site exactly like renderDocument, then returns a plain
   (JSON-safe, function-free) copy of the live `ArkUI.pageCatalog` instead
   of serialized HTML -- used by tests/ssr-render.cjs to derive its route
   list from the real catalog (including its dynamically-appended
   resolutions/article/lifecycle/theory entries) rather than hand-picking
   or re-declaring route names that could drift from js/pages/catalog.js. */
export async function getRouteCatalog(options) {
  const dom = await bootDocument(options);
  try {
    return JSON.parse(JSON.stringify(dom.window.ArkUI.pageCatalog));
  } finally {
    dom.window.close();
  }
}

/* Reads the deployed index.html once. Both api/render.mjs and
   scripts/ssr-preview.mjs call this rather than each doing their own
   fs.readFile, so there is one answer to "what is the static shell". */
export async function readIndexHtml(root = SITE_ROOT) {
  return readFile(path.join(root, 'index.html'), 'utf8');
}
