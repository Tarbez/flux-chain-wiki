/* =====================================================================
   FOLDER SITE CORE: the rules a packed site follows, written once.
   ---------------------------------------------------------------------
   Who uses it: `bundle-deploy pack` (src/folder-archive.js) when it
   writes a site, and the .fxn site server (flux/ark-miner-cli
   ops/defxn-gateway-ask/site-server.mjs) when it reads one. The server
   reads the copy vendored into flux/defxn gateway/vendor/bundle-deploy/
   (byte for byte; VENDORED-FROM.txt there says how to re-copy it). Fix a
   rule here, then copy it over. Never keep a second list.

   Design: flux/defxn/docs/FXN-REAL-SITES-DESIGN.md (owner approved the
   five recommendations on 2026-10-29). Only the .fxn ending is served.

   It holds:
     1. The two site formats.
          flux-folder-site/1  one FLX2 archive: the files are its assets.
          flux-folder-site/2  one small FLX2 index archive plus 8 MiB
                              blocks. The index lists each file's path,
                              content type, size and block IDs.
     2. The headers a site may set for itself in `_headers`, and the
        parser for that file. pack refuses a rule outside the list, and
        the server drops it, so both judge one file by one list.
     3. The archive a folder packs to (folderSiteArchiveInput,
        folderSiteIndexArchiveInput), the content types and the skipped
        names, shared by `bundle-deploy pack` and the public Bundles page
        (web/), which packs a folder in the browser (2026-10-29).

   Pure and browser-safe: no node: imports. The boxed shell can import it
   once it reads /2.
   ===================================================================== */
import { APP_BLOCK_BYTES } from './app-release-core.js';

export const FOLDER_SITE_SCHEMA = 'flux-folder-site/1';
export const FOLDER_SITE_INDEX_SCHEMA = 'flux-folder-site/2';

/** Block size for /2 sites: the app-release block, so both go up with the same put-batch. */
export const SITE_BLOCK_BYTES = APP_BLOCK_BYTES;

/* The archive a folder packs to, written once so the CLI (src/folder-archive.js) and the public Bundles page (web/)
   pack one folder to the same bytes and the same ID: files in code-unit path order, a fixed archive id and time (a
   publish time lives on the release record), nothing gzipped (gzip output differs between zlib builds). */
export const SITE_ARCHIVE_ID = 'flux-folder-site';
export const SITE_ARCHIVE_CREATED_AT = '1970-01-01T00:00:00.000Z';

/** Files a folder carries by accident: system litter, never site content. A folder of this name is skipped whole. */
export const SKIPPED_NAMES = Object.freeze(new Set(['.DS_Store', 'Thumbs.db', '.git']));

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
};

/** The content type a packed file is served with, from its name's extension (as node:path extname reads it). */
export function contentTypeFor(file) {
  const base = String(file).split('/').pop();
  const dot = base.lastIndexOf('.');
  const ext = dot > 0 ? base.slice(dot).toLowerCase() : '';
  return CONTENT_TYPES[ext] || 'application/octet-stream';
}

/** Code-unit order, not locale order, so every machine lists the same files the same way. */
export function comparePaths(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

const strictUtf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

function base64OfBytes(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** utf8 when the bytes are valid UTF-8 (they then round-trip exactly), else base64. */
function assetPayload(bytes) {
  try { return { payload: strictUtf8.decode(bytes), encoding: 'utf8' }; }
  catch { return { payload: base64OfBytes(bytes), encoding: 'base64' }; }
}

/**
 * encodeArchive's input for a /1 site. `files` = [{ path, contentType, bytes }] in comparePaths order.
 * The archive holds one route, `site` ({ schema, entry, files: [paths] }), and one asset per file.
 */
export function folderSiteArchiveInput({ entry, files }) {
  return {
    archiveId: SITE_ARCHIVE_ID,
    createdAt: SITE_ARCHIVE_CREATED_AT,
    entry,
    routes: [{ routeId: 'site', path: '/', payload: { schema: FOLDER_SITE_SCHEMA, entry, files: files.map((f) => f.path) } }],
    assets: files.map((f) => ({ path: f.path, contentType: f.contentType, ...assetPayload(f.bytes), compression: 'identity' })),
  };
}

/** encodeArchive's input for a /2 index. `files` = [{ path, contentType, size, blocks }] in comparePaths order. */
export function folderSiteIndexArchiveInput({ entry, files }) {
  return {
    archiveId: SITE_ARCHIVE_ID,
    createdAt: SITE_ARCHIVE_CREATED_AT,
    entry,
    routes: [{ routeId: 'site', path: '/', payload: folderSiteIndexPayload({ entry, files }) }],
    assets: [],
  };
}

export const HEADERS_FILE = '_headers';
export const HEADERS_FILE_MAX_BYTES = 64 * 1024;

/* Headers a site may set for itself through `_headers`. Each one changes only how a browser treats this
   site's own responses. Set-Cookie, Content-Type, Location, Strict-Transport-Security and every hop or
   framing header stay out: a static site has no session to set, its content types come from the pack,
   and the others belong to the server. */
export const SITE_HEADER_NAMES = Object.freeze(new Set([
  'access-control-allow-headers', 'access-control-allow-methods', 'access-control-allow-origin',
  'access-control-expose-headers', 'access-control-max-age',
  'cache-control', 'content-language', 'content-security-policy', 'content-security-policy-report-only',
  'cross-origin-embedder-policy', 'cross-origin-opener-policy', 'cross-origin-resource-policy',
  'link', 'permissions-policy', 'referrer-policy', 'x-frame-options', 'x-robots-tag',
]));

const CID = /^[0-9a-f]{64}$/;
const CONTROL = /[\0-\x08\x0a-\x1f\x7f]/;

/**
 * `_headers` text (the Netlify / Cloudflare Pages format) -> { rules, dropped, ignored }.
 *   rules    [{ pattern, headers: [[name, value]] }]. A pattern line starts with "/" at column 0. An
 *            indented "Name: value" line under it adds a header. A pattern ending in "*" matches every
 *            address that starts with what comes before the "*".
 *   dropped  header names outside SITE_HEADER_NAMES, or with an empty or unsafe value
 *   ignored  [{ line, text }]: lines that are neither a pattern nor a header under one
 * pack refuses a file with anything dropped or ignored. The server keeps `rules` and logs the rest.
 */
export function parseHeadersFile(text) {
  const rules = [];
  const dropped = new Set();
  const ignored = [];
  let current = null;
  String(text).split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trimEnd();
    if (!line.trim() || line.trim().startsWith('#')) return;
    if (!/^\s/.test(line)) {
      current = line.startsWith('/') && !/\s/.test(line) ? { pattern: line, headers: [] } : null;
      if (current) rules.push(current);
      else ignored.push({ line: index + 1, text: line });
      return;
    }
    const at = line.indexOf(':');
    if (!current || at < 0) { ignored.push({ line: index + 1, text: line.trim() }); return; }
    const name = line.slice(0, at).trim().toLowerCase();
    const value = line.slice(at + 1).trim();
    if (!SITE_HEADER_NAMES.has(name) || !value || CONTROL.test(value)) { dropped.add(name); return; }
    current.headers.push([name, value]);
  });
  return { rules, dropped: [...dropped], ignored };
}

/** The headers `rules` give a response for any of `addresses` (a later rule wins). -> Map<name, value> */
export function headersForAddresses(rules, addresses) {
  const out = new Map();
  for (const rule of rules) {
    const star = rule.pattern.endsWith('*');
    const stem = star ? rule.pattern.slice(0, -1) : rule.pattern;
    if (!addresses.some((a) => (star ? a.startsWith(stem) : a === stem))) continue;
    for (const [name, value] of rule.headers) out.set(name, value);
  }
  return out;
}

/** How many blocks a file of `size` bytes takes, and how long block `i` must be. */
export function blockCountFor(size, blockBytes = SITE_BLOCK_BYTES) {
  return Math.ceil(size / blockBytes);
}
export function blockLengthFor(size, i, blockBytes = SITE_BLOCK_BYTES) {
  return Math.min(blockBytes, size - i * blockBytes);
}

/**
 * The /2 index's route payload, built by pack. `files` = [{ path, contentType, size, blocks }].
 * Files go in the order given (pack sorts by path), so one folder always gives one index.
 */
export function folderSiteIndexPayload({ entry, files }) {
  return {
    schema: FOLDER_SITE_INDEX_SCHEMA,
    entry,
    blockBytes: SITE_BLOCK_BYTES,
    files: files.map(({ path, contentType, size, blocks }) => ({ path, contentType, size, blocks: [...blocks] })),
  };
}

/** The archive's site route payload, or null. */
export function siteRoutePayload(decoded) {
  return (decoded?.routes || []).find((r) => r.routeId === 'site')?.payload ?? null;
}

/**
 * A decoded /2 index -> { ok: true, site: { schema, entry, blockBytes, files } } | { ok: false, reason, detail }.
 * files: Map<path, { contentType, size, blocks }>. Each file is checked against its own blocks: the
 * count must be what its size needs. A one-block file's block ID is the BLAKE3 of the whole file; a
 * longer file is its blocks in order, each checked by its ID, with every block but the last exactly
 * blockBytes long (the reader checks lengths as each block arrives).
 */
export function readFolderSiteIndex(decoded) {
  const payload = siteRoutePayload(decoded);
  const bad = (detail) => ({ ok: false, reason: 'CONTENT_MALFORMED', detail: `${detail} Pack the folder again with bundle-deploy pack.` });
  if (payload?.schema !== FOLDER_SITE_INDEX_SCHEMA) {
    return { ok: false, reason: 'SCHEMA_UNSUPPORTED', detail: `The archive's site route is ${JSON.stringify(payload?.schema ?? null)}, not ${FOLDER_SITE_INDEX_SCHEMA}.` };
  }
  if (payload.blockBytes !== SITE_BLOCK_BYTES) return bad(`The index says blocks are ${payload.blockBytes} bytes, not ${SITE_BLOCK_BYTES}.`);
  if (!Array.isArray(payload.files)) return bad('The index lists no files.');
  const files = new Map();
  for (const file of payload.files) {
    const where = JSON.stringify(file?.path ?? null);
    if (typeof file?.path !== 'string' || !file.path || file.path.startsWith('/') || file.path.split('/').some((s) => s === '' || s === '.' || s === '..')) return bad(`The index lists a file at ${where}, which is not a relative path.`);
    if (files.has(file.path)) return bad(`The index lists ${where} twice.`);
    if (typeof file.contentType !== 'string' || !file.contentType) return bad(`The index gives ${where} no content type.`);
    if (!Number.isSafeInteger(file.size) || file.size < 0) return bad(`The index gives ${where} no size.`);
    if (!Array.isArray(file.blocks) || !file.blocks.every((c) => CID.test(c))) return bad(`The index gives ${where} a block that is not a BLAKE3 content ID.`);
    if (file.blocks.length !== blockCountFor(file.size)) return bad(`The index gives ${where} ${file.blocks.length} blocks, and ${file.size} bytes need ${blockCountFor(file.size)}.`);
    files.set(file.path, { contentType: file.contentType, size: file.size, blocks: file.blocks });
  }
  if (typeof payload.entry !== 'string' || !files.has(payload.entry)) return bad(`The index's first page ${JSON.stringify(payload.entry ?? null)} is not one of its files.`);
  return { ok: true, site: { schema: FOLDER_SITE_INDEX_SCHEMA, entry: payload.entry, blockBytes: SITE_BLOCK_BYTES, files } };
}
