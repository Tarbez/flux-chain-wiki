/* A site packed from a plain folder (bundle-deploy's `pack`, schema flux-folder-site/1), shown from its
   verified archive. Used by app.js. The lookup and CSS functions are pure and tested in Node
   (tests/gateway-folder-site.test.mjs); buildPageHtml takes a parsed Document, so it runs in the browser.

   How a page is shown (the threat model is in docs/DEVNET-TOOLS-LOG-2026-10-23.md, "Folder sites"):
   the site's code is someone else's, so it never runs on the <label>.defxn.com origin. app.js puts each
   page in an <iframe sandbox="allow-scripts ..."> of site-frame.html, which gives it an opaque origin:
   no cookies, no storage, no access to the shell, and the identity broker ignores it. site-frame.html's
   CSP allows no network at all (no 'self', no host), only data: URLs. So this module turns every
   reference a page makes to a file in the archive into a data: URL of that file's verified bytes, and
   the frame never fetches anything. A reference to a file the archive does not hold is left as it is
   and the CSP blocks it.

   A flux-folder-site/2 site (an index plus 8 MiB blocks, vendor/bundle-deploy/folder-site-core.js) lists
   its files without their bytes. index-site.js fetches only what one page needs: loadPageFiles below
   walks the page's references (the same ones buildPageHtml rewrites) and the style sheets they import,
   and returns a view of the site whose needed files carry their verified bytes. A file left without
   bytes counts as not held, so its reference stays as written and the CSP blocks it.

   A service worker could not do this: Chromium does not let a service worker answer for an
   opaque-origin document (measured 2026-10-23), and a worker serving the site on the label origin would
   hand the site that origin. */

export const FOLDER_SITE_SCHEMA = "flux-folder-site/1";

/* Every site path is resolved against this base, so `..`, `%2e%2e`, a backslash and `//host` are judged by the
   URL parser the browser uses, not by string tests. Nothing lives outside the archive: a path either
   names one of its files exactly or is not found. */
const SITE_BASE = "https://folder-site.invalid/";
const SITE_ORIGIN = new URL(SITE_BASE).origin;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesOfBase64(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64Of(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** decodeArchiveAsync's output -> { ok: true, site: { entry, files } } | { ok: false, reason, detail }
 *  files: Map<path, { bytes: Uint8Array, contentType }>, path relative and "/"-separated as packed. */
export function readFolderSite(decoded) {
  const route = (decoded?.routes || []).find((r) => r.routeId === "site");
  const payload = route?.payload;
  if (payload?.schema !== FOLDER_SITE_SCHEMA) {
    return { ok: false, reason: "SCHEMA_UNSUPPORTED", detail: `The archive's site route is ${JSON.stringify(payload?.schema ?? null)}, not ${FOLDER_SITE_SCHEMA}.` };
  }
  const assets = new Map((decoded.assets || []).map((asset) => [asset.path, asset]));
  const files = new Map();
  for (const path of Array.isArray(payload.files) ? payload.files : []) {
    const asset = assets.get(path);
    if (typeof path !== "string" || !asset) {
      return { ok: false, reason: "CONTENT_MALFORMED", detail: `The archive lists ${JSON.stringify(path)} but holds no file at that path. Pack the folder again with bundle-deploy pack.` };
    }
    const bytes = asset.encoding === "base64" ? bytesOfBase64(asset.payload) : textEncoder.encode(asset.payload);
    files.set(path, { bytes, contentType: asset.contentType || "application/octet-stream" });
  }
  if (typeof payload.entry !== "string" || !files.has(payload.entry)) {
    return { ok: false, reason: "CONTENT_MALFORMED", detail: `The archive's first page ${JSON.stringify(payload.entry ?? null)} is not one of its files. Pack the folder again with bundle-deploy pack.` };
  }
  return { ok: true, site: { entry: payload.entry, files } };
}

/* A file whose bytes are here: every /1 file, and a /2 file once its blocks are fetched. */
const held = (file) => Boolean(file && file.bytes);

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

/* A parsed site URL's pathname -> the archive path it spells, or null. Each segment is percent-decoded
   once. A segment that decodes to "/", ".", ".." or nothing is refused, so one file has one spelling. */
function archivePathOf(url) {
  if (url.origin !== SITE_ORIGIN) return null;
  const segments = url.pathname.slice(1).split("/");
  const decoded = [];
  for (let i = 0; i < segments.length; i += 1) {
    let segment;
    try { segment = decodeURIComponent(segments[i]); } catch { return null; }
    const last = i === segments.length - 1;
    if (segment === "" && last) { decoded.push(""); continue; }
    if (segment === "" || segment === "." || segment === ".." || segment.includes("/")) return null;
    decoded.push(segment);
  }
  return decoded.join("/");
}

/** A page address (location.pathname) -> { ok: true, path, file } | { ok: false, reason: "PAGE_NOT_FOUND", detail }
 *  "/" is the entry page. "dir/" is dir/index.html. "dir" and "about" also find dir/index.html and
 *  about.html when no file has the exact name. */
export function pageForAddress(site, pathname) {
  let url;
  try { url = new URL(pathname, SITE_BASE); } catch { url = null; }
  const path = url && archivePathOf(url);
  const notFound = { ok: false, reason: "PAGE_NOT_FOUND", detail: `This site has no page at ${pathname}.` };
  if (path === null || path === undefined) return notFound;
  const candidates = path === "" ? [site.entry]
    : path.endsWith("/") ? [`${path}index.html`]
    : [path, `${path}/index.html`, `${path}.html`];
  for (const candidate of candidates) {
    const file = site.files.get(candidate);
    if (file) return { ok: true, path: candidate, file };
  }
  return notFound;
}

/** A reference written in the site file at `fromPath` -> one of
 *    { kind: "fragment" }                         "#top" or "": stays inside the page
 *    { kind: "elsewhere", url }                   another host or scheme (https:, mailto:, data:, ...)
 *    { kind: "site", address, hash, path, file }  a path inside the site; path and file are null when the
 *                                                 archive does not hold it. address is the page address. */
export function resolveReference(site, fromPath, ref) {
  const text = String(ref ?? "").trim();
  if (text === "" || text.startsWith("#")) return { kind: "fragment" };
  let url;
  try { url = new URL(text, SITE_BASE + encodePath(fromPath)); } catch { return { kind: "elsewhere", url: text }; }
  if (url.origin !== SITE_ORIGIN) return { kind: "elsewhere", url: url.href };
  const path = archivePathOf(url);
  const file = path ? site.files.get(path) || null : null;
  return { kind: "site", address: url.pathname + url.search, hash: url.hash, path: file ? path : null, file };
}

export function dataUrlOf(file) {
  const type = file.contentType.replace(/\s+/g, "");
  return `data:${type};base64,${base64Of(file.bytes)}`;
}

const isCss = (file) => /^text\/css\b/i.test(file.contentType);

/* The references CSS makes to other files, read by rewriteCss and by loadPageFiles alike. */
const CSS_URL = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^"')\s]*))\s*\)/gi;
const CSS_IMPORT = /@import\s+(?:"([^"]*)"|'([^']*)')/gi;

/* The attributes that name a file of the site, read by buildPageHtml and by loadPageFiles alike.
   [src] skips frames and iframes: a frame is never filled from the archive. */
const FILE_ATTRIBUTES = [["[src]", "src"], ["video[poster]", "poster"], ["link[href]", "href"], ["image[href]", "href"]];
const isFrame = (element) => /^i?frame$/i.test(element.localName);

/** CSS text from the file at `cssPath` -> the same CSS with every url() and @import that names a file in
 *  the archive replaced by a data: URL. An imported style sheet is rewritten the same way, once per chain. */
export function rewriteCss(site, cssPath, text, chain = new Set([cssPath])) {
  const inline = (ref) => {
    const target = resolveReference(site, cssPath, ref);
    if (target.kind !== "site" || !held(target.file)) return null;
    if (!isCss(target.file)) return dataUrlOf(target.file);
    if (chain.has(target.path)) return null;
    const css = rewriteCss(site, target.path, textDecoder.decode(target.file.bytes), new Set([...chain, target.path]));
    return dataUrlOf({ contentType: target.file.contentType, bytes: textEncoder.encode(css) });
  };
  return text
    .replace(CSS_URL, (whole, dq, sq, bare) => {
      const ref = dq ?? sq ?? bare;
      const data = inline(ref);
      return data ? `url("${data}")` : whole;
    })
    .replace(CSS_IMPORT, (whole, dq, sq) => {
      const data = inline(dq ?? sq);
      return data ? `@import url("${data}")` : whole;
    });
}

function rewriteSrcset(site, fromPath, value) {
  return value.split(",").map((candidate) => {
    const [ref, ...descriptor] = candidate.trim().split(/\s+/);
    const target = resolveReference(site, fromPath, ref);
    const url = target.kind === "site" && held(target.file) ? dataUrlOf(target.file) : ref;
    return [url, ...descriptor].join(" ");
  }).join(", ");
}

/* The one script the gateway adds to a page: a plain click on a link to another page of the site asks the
   shell to show that page, instead of navigating the frame (which would leave the verified archive). It
   runs last (window, bubble phase) and does nothing when the site handled the click itself. */
function navigationScript() {
  addEventListener("click", function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target && event.target.closest ? event.target.closest("a[data-fxn-href], area[data-fxn-href]") : null;
    if (!link) return;
    var target = link.getAttribute("target");
    if (target && target !== "_self" && target !== "_parent" && target !== "_top") return;
    event.preventDefault();
    parent.postMessage({ type: "fxn-folder-site:navigate", href: link.getAttribute("data-fxn-href") }, location.origin);
  });
}
const NAVIGATION_SCRIPT_URL = `data:text/javascript;base64,${base64Of(textEncoder.encode(`(${navigationScript})();`))}`;

/** The page at `pagePath`, parsed into `doc` (DOMParser, inert), -> { html, title }: the page with every
 *  reference to an archive file made a data: URL, links to its other pages made shell navigations, links
 *  to other hosts opened in a new tab, and navigationScript first in <head>. */
export function buildPageHtml(site, pagePath, doc) {
  const fileUrl = (ref) => {
    const target = resolveReference(site, pagePath, ref);
    if (target.kind !== "site" || !held(target.file)) return null;
    if (!isCss(target.file)) return dataUrlOf(target.file);
    const css = rewriteCss(site, target.path, textDecoder.decode(target.file.bytes));
    return dataUrlOf({ contentType: target.file.contentType, bytes: textEncoder.encode(css) });
  };
  const setFileUrl = (element, attribute) => {
    const url = fileUrl(element.getAttribute(attribute));
    if (url) element.setAttribute(attribute, url);
  };

  for (const base of doc.querySelectorAll("base")) base.remove();
  /* A site's own CSP meta is removed (2026-10-28). Its 'self' names the site's own host, and in this frame the
     page has an opaque origin, so 'self' matches nothing and every stylesheet and script, now a data: URL, was
     refused: defxn.com's page showed as bare text at de.defxn.com. site-frame.html's own CSP still governs the
     page (no network at all, only data: and inline), and it is the boundary; the site's rule could only narrow
     it further, never widen it. */
  for (const meta of doc.querySelectorAll("meta[http-equiv]")) {
    if (/^content-security-policy$/i.test(meta.getAttribute("http-equiv").trim())) meta.remove();
  }
  for (const [selector, attribute] of FILE_ATTRIBUTES) {
    for (const element of doc.querySelectorAll(selector)) if (!isFrame(element)) setFileUrl(element, attribute);
  }
  for (const element of doc.querySelectorAll("[srcset]")) element.setAttribute("srcset", rewriteSrcset(site, pagePath, element.getAttribute("srcset")));
  for (const style of doc.querySelectorAll("style")) style.textContent = rewriteCss(site, pagePath, style.textContent);
  for (const element of doc.querySelectorAll("[style]")) element.setAttribute("style", rewriteCss(site, pagePath, element.getAttribute("style")));

  for (const link of doc.querySelectorAll("a[href], area[href]")) {
    const target = resolveReference(site, pagePath, link.getAttribute("href"));
    if (target.kind === "site") {
      link.setAttribute("href", target.address + target.hash);
      link.setAttribute("data-fxn-href", target.address + target.hash);
    } else if (target.kind === "elsewhere" && /^https?:/i.test(target.url)) {
      const frameTarget = link.getAttribute("target");
      if (!frameTarget || /^_(self|parent|top)$/i.test(frameTarget)) link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    }
  }

  const script = doc.createElement("script");
  script.setAttribute("src", NAVIGATION_SCRIPT_URL);
  doc.head.prepend(script);

  const doctype = doc.doctype ? `<!DOCTYPE ${doc.doctype.name}>` : "";
  return { html: doctype + doc.documentElement.outerHTML, title: doc.title };
}

/** Every reference a parsed page makes to a file: the attributes buildPageHtml rewrites, srcset
 *  candidates, and url() / @import in <style> and style="". -> [ref] as written. */
function pageReferences(doc) {
  const refs = [];
  for (const [selector, attribute] of FILE_ATTRIBUTES) {
    for (const element of doc.querySelectorAll(selector)) if (!isFrame(element)) refs.push(element.getAttribute(attribute));
  }
  for (const element of doc.querySelectorAll("[srcset]")) {
    for (const candidate of element.getAttribute("srcset").split(",")) refs.push(candidate.trim().split(/\s+/)[0]);
  }
  for (const style of doc.querySelectorAll("style")) refs.push(...cssReferences(style.textContent));
  for (const element of doc.querySelectorAll("[style]")) refs.push(...cssReferences(element.getAttribute("style")));
  return refs;
}

function cssReferences(text) {
  const refs = [];
  for (const match of String(text).matchAll(CSS_URL)) refs.push(match[1] ?? match[2] ?? match[3]);
  for (const match of String(text).matchAll(CSS_IMPORT)) refs.push(match[1] ?? match[2]);
  return refs;
}

/** The files the page at `pagePath` (parsed into `doc`) needs, given their bytes.
 *  `loadBytes(file)` -> Promise<Uint8Array | null>: the file's verified bytes, or null to leave it out
 *  (it then counts as not held). It throws to refuse the page, for example on a block that does not
 *  match its ID. Style sheets are read as they arrive, so the files they import are fetched too.
 *  -> a view of `site` (same entry, its own files map) to give buildPageHtml. `site` is not changed.
 *  A /1 site's files already hold their bytes, so nothing is fetched for it. */
export async function loadPageFiles(site, pagePath, doc, loadBytes) {
  const files = new Map(site.files);
  const view = { ...site, files };
  const seen = new Set();
  let queue = [];
  const want = (fromPath, ref) => {
    const target = resolveReference(view, fromPath, ref);
    if (target.kind !== "site" || !target.file || seen.has(target.path)) return;
    seen.add(target.path);
    queue.push(target.path);
  };
  for (const ref of pageReferences(doc)) want(pagePath, ref);
  while (queue.length) {
    const batch = queue;
    queue = [];
    await Promise.all(batch.map(async (path) => {
      const file = files.get(path);
      if (held(file)) return;
      const bytes = await loadBytes(file);
      if (bytes) files.set(path, { ...file, bytes });
    }));
    for (const path of batch) {
      const file = files.get(path);
      if (held(file) && isCss(file)) for (const ref of cssReferences(textDecoder.decode(file.bytes))) want(path, ref);
    }
  }
  return view;
}
