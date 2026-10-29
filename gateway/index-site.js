/* A flux-folder-site/2 site in the boxed shell: the index names each file's 8 MiB blocks, and a page's
   files are fetched block by block when the page is shown. Used by app.js.

   Each block comes through content.js's fetchVerifiedContent, the shell's one verified path: the same
   same-origin /fxn-store/v1/<cid> route, and the bytes must hash to the block's ID. A block must also be
   the length its place in the file gives it (blockLengthFor). The index itself was checked the same way
   against the ID the name's proof names, so the chain of trust is whole: proof -> index -> blocks.

   The format and its reader are bundle-deploy's (vendor/bundle-deploy/folder-site-core.js), vendored byte
   for byte, so pack, the .fxn site server, the FXN Browser and this shell read one format one way.

   Blocks are kept by ID, least recently used first out, bounded by bytes. A file over SHELL_FILE_MAX_BYTES
   is left out of a page: in this shell every file becomes a data: URL inside one frame, and a larger one
   would hold the page up for the whole download. Its reference stays as written and the CSP blocks it. */
import { readFolderSiteIndex, blockLengthFor, FOLDER_SITE_INDEX_SCHEMA } from "./vendor/bundle-deploy/folder-site-core.js";
import { fetchVerifiedContent } from "./content.js";

export { FOLDER_SITE_INDEX_SCHEMA };

/** A decoded /2 index -> readFolderSiteIndex's answer, with each file also carrying its own path (for
 *  refusals that name the file). */
export function readIndexSite(decoded) {
  const read = readFolderSiteIndex(decoded);
  if (read.ok) for (const [path, file] of read.site.files) file.path = path;
  return read;
}

export const SHELL_FILE_MAX_BYTES = 32 * 1024 * 1024;
const CACHE_BYTES = 96 * 1024 * 1024;
const PARALLEL_FETCHES = 6;

/** A refusal app.js shows with renderStatus: reason is one of its FAILURE_MESSAGES keys. */
export class BlockRefusal extends Error {
  constructor(reason, detail) {
    super(detail);
    Object.assign(this, { reason, detail });
  }
}

/** -> loadBytes(file): Promise<Uint8Array | null> for folder-site.js loadPageFiles and app.js.
 *  Throws BlockRefusal when a block is missing, wrong, or the wrong length. */
export function createBlockReader({ site, fetchContent = fetchVerifiedContent, cacheBytes = CACHE_BYTES } = {}) {
  const blocks = new Map(); // cid -> Uint8Array, oldest first
  const loading = new Map(); // cid -> Promise<Uint8Array>
  let total = 0;
  let running = 0;
  const waiting = [];

  async function slot(work) {
    if (running >= PARALLEL_FETCHES) await new Promise((resolve) => waiting.push(resolve));
    running += 1;
    try { return await work(); } finally { running -= 1; waiting.shift()?.(); }
  }

  function keep(cid, bytes) {
    if (bytes.length > cacheBytes) return;
    blocks.set(cid, bytes);
    total += bytes.length;
    for (const [oldest, old] of blocks) {
      if (total <= cacheBytes) break;
      blocks.delete(oldest);
      total -= old.length;
    }
  }

  function block(file, i) {
    const cid = file.blocks[i];
    const hit = blocks.get(cid);
    if (hit) { blocks.delete(cid); blocks.set(cid, hit); return Promise.resolve(hit); }
    if (!loading.has(cid)) {
      loading.set(cid, slot(() => fetchContent(cid)).then((content) => {
        if (!content.ok) throw new BlockRefusal(content.reason, `A block of this site's file ${file.path} (${cid}): ${content.detail || content.reason}`);
        keep(cid, content.bytes);
        return content.bytes;
      }).finally(() => loading.delete(cid)));
    }
    return loading.get(cid);
  }

  return async function loadBytes(file) {
    if (file.bytes) return file.bytes;
    if (file.size > SHELL_FILE_MAX_BYTES) return null;
    const parts = await Promise.all(file.blocks.map((_, i) => block(file, i)));
    parts.forEach((bytes, i) => {
      const length = blockLengthFor(file.size, i, site.blockBytes);
      if (bytes.length !== length) {
        throw new BlockRefusal("CONTENT_MISMATCH", `Block ${file.blocks[i]} of ${file.path} is ${bytes.length} bytes. Its place in the file needs ${length}.`);
      }
    });
    if (parts.length === 1) return parts[0];
    const out = new Uint8Array(file.size);
    let at = 0;
    for (const bytes of parts) { out.set(bytes, at); at += bytes.length; }
    return out;
  };
}
