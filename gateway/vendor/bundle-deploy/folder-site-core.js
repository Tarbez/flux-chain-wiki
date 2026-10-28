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

   Pure and browser-safe: no node: imports. The boxed shell can import it
   once it reads /2.
   ===================================================================== */
import { APP_BLOCK_BYTES } from './app-release-core.js';

export const FOLDER_SITE_SCHEMA = 'flux-folder-site/1';
export const FOLDER_SITE_INDEX_SCHEMA = 'flux-folder-site/2';

/** Block size for /2 sites: the app-release block, so both go up with the same put-batch. */
export const SITE_BLOCK_BYTES = APP_BLOCK_BYTES;

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
