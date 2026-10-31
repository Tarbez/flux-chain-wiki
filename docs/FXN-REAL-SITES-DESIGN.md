# .fxn names as ordinary websites

**Reader:** the DEFXN owner, deciding how `<label>.fxn` and `<label>.defxn.com` show a site, and the next
engineer who builds it. Status: design, 2026-10-28. Not confirmed, not deployed, no tests.

## The answer first

A `.fxn` address gets a site server. For each request it checks the name's proof and the site's hash, then
sends the file itself. No sandboxed frame and no `data:` URLs are involved. The browser sees an ordinary website,
so module scripts, `fetch` and workers work. Each `.fxn` name is its own site in the browser, so sites stay apart.

`<label>.defxn.com` keeps the sandboxed shell. Its labels share one registrable domain with defxn.com's own apps.
A real site for links that need no setup goes on a separate domain, and only after that domain is on the Public
Suffix List.

Large sites are stored as one small index plus 8 MiB blocks, with the same blocks and the same put-batch that app
releases use.

## Why de.defxn.com did not show defxn.com

1. The byte store takes 18 MiB in one upload, so only the home page's files were packed: 2.3 MB of a 29 MB folder.
2. The shell shows each site in a sandboxed frame whose policy allows no network. Every file becomes a `data:`
   URL, so a module script that imports another file fails, and so does any `fetch`.
3. Part of defxn.com runs on a server (`api/render.mjs`, reached through `vercel.json` rewrites). A static pack
   carries no server code.

The site server fixes 2 for `.fxn`. The block format fixes 1. Item 3 stays a rule: a site calls its own API host.

## Decision 1: where real sites run

A browser groups origins into sites by the Public Suffix List (PSL). Cookies, `SameSite` and storage partitions
follow that grouping.

- `.fxn` is not on the PSL. The list's default rule then makes the last label the suffix, so `de.fxn` is a
  registrable domain of its own. `de.fxn` cannot set a cookie that `radio.fxn` receives.
- `de.defxn.com` and `genesis.defxn.com` share the registrable domain `defxn.com`. A site's script there can set a
  cookie for `.defxn.com`, which every defxn.com app then receives (cookie tossing). Its requests to defxn.com
  count as same-site. The identity broker trusts any `https://<label>.defxn.com`
  (`docs/DEVNET-TOOLS-LOG-2026-10-23.md`, "Folder sites").

| Option | What happens | Cost |
|---|---|---|
| A. Real sites on `.fxn` only, sandbox stays on `*.defxn.com` | Nothing about defxn.com changes. | A visitor needs fxn DNS and the FXN root to see a real site. Without them they get the boxed version. |
| B. A separate domain for no-setup links (say `<label>.<new-domain>`), on the PSL | Same isolation as `.fxn`, with a public certificate and no setup. | Buying a domain. A PSL request and the wait until browsers ship it. Until then labels there can toss cookies at each other, though not at defxn.com. |
| C. Put `defxn.com` itself on the PSL | Each label becomes its own site. | Every defxn.com app (genesis., domains., the broker) loses shared cookies at once. Leaving the PSL is slow. |
| D. Unbox `*.defxn.com` with no PSL entry | Works at once. | Any site can set cookies for defxn.com and reach its apps same-site. Unsafe. |

**Recommendation: A now, B next.** A needs no change to defxn.com. B gives the no-setup link once its PSL entry
ships. Until then the new domain serves the boxed shell, as `*.defxn.com` does. C and D are not recommended.
`site-frame.html` is not changed by this work.

One more risk for A: if ICANN ever delegates `.fxn`, these addresses collide with real ones. Nothing here can
prevent that. It is the price of a name outside the root.

## Decision 2: who verifies

Today the visitor's browser checks the proof and the BLAKE3 itself, and the node is not trusted. With a site
server, the node checks both, and the browser trusts the TLS certificate. That certificate says only that this
node chose to serve the name. The `fxn` CA's intermediate key sits on each node, so every node operator can issue
a certificate for any `.fxn` name. A dishonest node can serve any bytes under any name to a visitor whose DNS
points at it.

What limits this:
- Every answer carries `fxn-site: <cid>`. The FXN Browser checks the proof itself, compares the CID it finds
  with that header, and can fetch and hash the archive. It refuses on a mismatch.
- fxn-dns answers only with fleet addresses, so the nodes in question are the fleet's own.
- The boxed shell on `*.defxn.com` still verifies in the browser, for anyone who wants that.

**Recommendation:** accept node-side checking for `.fxn` in the browser, say so on the FXN Browser's info panel,
and make the FXN Browser check every `.fxn` page it opens.

## Decision 3: server functions

A static site carries no server code, and the site server never runs a site's code. A site that needs data calls
its own API or resolver host, for example `api.defxn.com` or a resolver on the fleet. That host answers CORS for
`https://<label>.fxn`. defxn.com's `api/render.mjs` renders pretty routes. The static version prerenders those
pages at pack time, or ships a client-side router with a `404.html` that loads it.

**Recommendation:** prerender at pack time. It keeps every page a file with one address.

## The request flow

The site server is `flux/ark-miner-cli/ops/defxn-gateway-ask/site-server.mjs`, on 127.0.0.1:8789. Caddy's
`fxn-sites.caddy` sends every `*.fxn` request to it. Each step fails closed. A refusal names the failure, what is
missing and the fix. The detail goes to the log and never to the visitor.

1. **Host.** Exactly one label plus `.fxn`. Anything else gets 404. The server never answers for `*.defxn.com`.
2. **Method.** GET and HEAD only. Anything else gets 405.
3. **Name.** `nameIsPublished` from `ask-server.mjs`, imported and never copied. It asks a name node for
   `DOM_PROOF`, then checks the proof with dense-wire's shared verifier against the pinned genesis key. The node's
   reply text, which is signed entries, is reused for 15 seconds and verified again on every request. This is the
   one kind of cache rule 1 of `docs/DEFXN-NAMES-ONE-SYSTEM.md` "Do not build" allows. No name-to-site answer is
   stored. Not published gets 404. No node answering gets 502.
4. **Site.** The archive with the record's `blake3_cid` comes from the byte store (`/api/blockstore/get/<cid>`,
   loopback, bounded in time and size). Its BLAKE3 must equal the CID, or the answer is 502 and nothing is kept.
5. **Decode.** `decodeArchiveAsync` and `readFolderSite`, from the gateway's own files, so the boxed shell and the
   server read one format one way.
6. **Path.** `pageForAddress` from `folder-site.js`, so an address means the same file in both. `/docs` that
   finds `docs/index.html` is redirected to `/docs/`, so relative links resolve from the page's folder. A missing
   file returns the site's `404.html` with status 404, or a refusal.
7. **Send.** The packed content type, then the server's fixed headers, then the site's own `_headers` rules.

### Headers

Fixed by the server: `content-type` (from the archive), `x-content-type-options: nosniff`, `etag: "<cid>"`,
`fxn-site: <cid>` and `accept-ranges: bytes`. `cache-control` is `no-cache` unless the site sets its own.
`If-None-Match` gets a 304. A single `Range` gets a 206, so video seeks work.

A site sets more with a `_headers` file at the top of its folder, in the format Netlify and Cloudflare Pages use:

```
/*
  Content-Security-Policy: default-src 'self'; connect-src 'self' https://api.defxn.com
/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

Only these may be set: CORS (`access-control-*`), `cache-control`, `content-language`, CSP and its report-only
form, `cross-origin-embedder/opener/resource-policy`, `link`, `permissions-policy`, `referrer-policy`,
`x-frame-options` and `x-robots-tag`. Set-Cookie, the content type, redirects and HSTS stay with the server.
A rule naming any other header is dropped and logged. `_headers` is never served as a page.

**Open:** dropping a header at serve time is silent to the publisher. `bundle-deploy pack` should refuse such
a file with the same list, so the publisher hears it at pack time.

## Caching by content ID

- **Sites:** kept in memory under their CID, least recently used first out, bounded by the decoded bytes
  (`FXN_SITE_CACHE_BYTES`, default 256 MiB). A CID names one set of bytes, so the cache cannot serve a stale site.
  A name that points elsewhere asks for another CID. Two requests for one CID share one fetch.
- **Proofs:** the signed reply text, for `FXN_SITE_PROOF_SECONDS` (default 15). A name moved to a new site shows
  the new site within that time.
- **Browsers:** `etag` is the site CID, so a revisit costs a 304 until the name points elsewhere. A site that
  names its files by hash can set `immutable` for them through `_headers`.

## Large sites in parts

Today a site is one FLX2 archive (`flux-folder-site/1`), at most 18 MiB. Version 2 keeps the archive as a small
index and moves the bytes into blocks. It reuses the app-release block approach (`app-release-core.js`): blocks of
`APP_BLOCK_BYTES` (8 MiB), each filed under its BLAKE3, uploaded with the byte store's put-batch.

**Format.** The name's `blake3_cid` points at the index: an FLX2 archive with one route, `site`, and no assets.

```
{ schema: "flux-folder-site/2", entry: "index.html", blockBytes: 8388608,
  files: [ { path, contentType, size, blocks: [cid, ...] }, ... ] }
```

A file is cut into 8 MiB blocks. A file of 8 MiB or less is one block, and its block CID is the file's BLAKE3.
`_headers` is an ordinary file in the list. The chain of trust stays whole: the name's proof names the index CID,
and the index names every block CID.

Why blocks per file and not one archive cut into pieces:
- The server fetches only the blocks of the file asked for, and the first page shows before the rest arrives.
- A file that did not change keeps its CID, so a new version uploads only the changed files.
- The pure-JS archive encode (about 70 s for 18 MiB, measured 2026-10-23) runs on the index only.

flx-codec's `splitArchiveContinuations` was considered and not chosen. It cuts a JSON rendering of the archive and
checks pieces with a non-cryptographic hash. That is storage in JSON and a weaker check than BLAKE3.

**pack** (`bundle-deploy pack`): lists files as today, then writes the index and the block list in memory. The
18 MiB refusal goes. It prints the index CID, the block count and the total bytes.

**prepare**: uploads blocks first with `putBatch`, two 8 MiB blocks per request, or many small blocks up to the
24 MiB request. Then it uploads the index. A name never points at an index whose blocks are missing.

**Server:** reads `/2` indexes next to `/1` archives. A block is fetched and checked on first request and kept in
the same CID cache. Range requests fetch only the blocks they cover.

**Boxed shell:** reads `/2` by fetching the blocks a page needs through `/fxn-store/v1/<cid>` and checking each.

**Recommendation:** pack `/2` only when a site is over 18 MiB until the shell reads `/2`. After that, pack `/2`
for every site.

## Build plan, in order

1. **Built, not deployed:** `site-server.mjs` and `fxn-sites.caddy`, reading `flux-folder-site/1`. Next, the
   owner opens a published site through it on this Mac. Tests are written after that confirmation.
2. **Install:** `install-defxn-wildcard.sh` places the defxn `gateway/` folder beside the server (it already
   places `dense-wire/`). A systemd unit for the site server. On a test node, swap `fxn-names.caddy`'s `*.fxn`
   block for `fxn-sites.caddy`.
3. **Format `/2`:** pack, prepare and the server's reader, then the boxed shell's reader.
4. **defxn.com as a static site:** prerender the `api/render.mjs` routes at pack time, add a `_headers`, and allow
   CORS on its API host for `https://<label>.fxn`.
5. **FXN Browser:** check the proof and `fxn-site` on every `.fxn` page, and refuse on a mismatch.
6. **Decision 1, option B:** buy the domain, file the PSL request, serve the boxed shell there until the entry
   ships in browsers.
7. **`bundle-deploy pack`** refuses a `_headers` file that names a header outside the list.

## Not built

- Format `/2`, in pack, prepare, the server and the shell.
- The install script change, the systemd unit and any deploy.
- `.ark` and `.deadark` hosts. `nameIsPublished` reads `<label>.fxn` only, so the server serves `.fxn` only.
- Rewrites and redirects (`_redirects`). defxn.com's pretty routes need step 4 first.
- Tests. They follow the owner's confirmation.

## Built 2026-10-29, after the owner approved the five recommendations

The owner approved all five recommendations on 2026-10-29 ("approve sites"). The owner added one rule: only the
`.fxn` ending is supported for now, because it is the first chain. Nothing below adds `.ark` or `.deadark`.

This section supersedes the "Not built" list above for the items it names. That list stays as it was written.

Built, not deployed, no tests:

- **Format `/2`, in pack and prepare.** The format is in `flux/bundle-deploy/src/folder-site-core.js`, with
  `blockBytes` 8 MiB. Each file lists `{ path, contentType, size, blocks }`.
  - `bundle-deploy pack` chooses `/2` when a site does not fit one upload. It also falls back to `/2` when the
    `/1` archive grows past the limit, which happens because binary files grow a third as base64.
  - `--format 1|2` forces a format.
  - `prepare` sends blocks first, then the index.
  - The block reading and put-batch code moved to `src/blocks.js`. App releases use the same file.
  - A request holds as many blocks as fit in 24 MiB, so two 8 MiB blocks or many small files. A block sent once
    in a run is not sent again.
- **Format `/2`, in the site server.** The server fetches the index by its CID and reads it with
  `readFolderSiteIndex`. A file's blocks are fetched only when the file is asked for.
  - Each block is checked against its ID and against the length its place in the file gives it.
  - The first block is checked before the status line is sent. A later block that fails cuts the answer short,
    so the browser never gets wrong bytes.
  - Blocks share the site cache's one bound, by CID.
  - A Range request fetches only the blocks it covers.
- **The per-file check.** A one-block file's block ID is the BLAKE3 of the whole file. A longer file is its blocks
  in order: each block is checked by its ID, and the index, which the name's proof names, fixes the order and the
  size. No whole-file hash is stored for a file over 8 MiB.
- **One `_headers` list.** `SITE_HEADER_NAMES` and `parseHeadersFile` live in `folder-site-core.js`.
  - `bundle-deploy pack` refuses a header outside the list. It also refuses a line that is neither a pattern nor a
    header under one.
  - The site server reads the same file from `gateway/vendor/bundle-deploy/`, a byte-for-byte copy. Its
    `VENDORED-FROM.txt` gives the re-copy command.
- **defxn.com as a static site.** `node scripts/pack-fxn-site.mjs [--stage <dir>] [--out <file>]` stages the
  public site and packs it. It prints the CID for `de.fxn` and uploads nothing.
  - Every catalog route (`scripts/lib/site-routes.mjs`, 103 addresses) gets `<route>.html`, a copy of the shell.
    `404.html` is the shell too.
  - Asset URLs are made root-absolute, and the three `document.write` loaders write `/js/...`.
  - Of `js/admin/` it ships only the four files public pages load. The script prints what it left out and why.
- **Measured 2026-10-29** on an M-series Mac, Node 24, native BLAKE3, against the working tree of that day, with
  other sessions' uncommitted edits in it:
  - The stage holds 1,435 files, 14,810,708 bytes. They pack as `/2`: an index of 717,607 bytes and 1,320 blocks,
    in about 2 s.
  - As `/1` the same folder encodes to 29,759,877 bytes, over the 18 MiB upload.
  - So `de.defxn.com`'s boxed shell cannot show it until the shell reads `/2`.

Still not built:

- The boxed shell's `/2` reader (`gateway/folder-site.js`). Until it exists, `*.defxn.com` shows only `/1` sites.
- The install script change, the systemd unit and any deploy.
- `.ark` and `.deadark` hosts. The owner ruled them out for now.
- Rewrites and redirects (`_redirects`). The route files replace them for defxn.com.
- The FXN Browser's check of `fxn-site` on every `.fxn` page.
- Live data on de.fxn.
  - Three feeds call the site's own `/api/fleet-pulse`, `/api/chain-pulse` and `/api/chain-fleet-capacity`, from
    `js/ark/pulse-client.js` and the stats pages. `/api/session` is called on every load (`js/ark/cms-session.js`).
    None of these are in this repo's `api/`.
  - On 2026-10-29 `https://defxn.com/api/*` answered 502.
  - To make the feeds live on `de.fxn`, two changes are needed. First, the endpoint overrides
    (`window.ArkPulseEndpoint` and the two like it) must name an absolute API host, and that host must be in the
    shell's CSP `connect-src`. Second, that host must answer CORS for `https://<label>.fxn`: reflect an `Origin`
    that matches `^https://[a-z0-9-]+\.fxn$`, and send `Vary: Origin`.
- Per-route titles for readers without scripts. The router sets each page's title at run time.
- Tests. They follow the owner's confirmation.

## Built 2026-10-29, later: /2 in every reader

This section supersedes the "Still not built" list above for the items it names. Built, not deployed, no tests.

- **The FXN Browser reads `/2`.** `ark-browser` `src/main/fxn-sites/fxn-site-host.js`, `readIndexSite` and
  `_blockOf`. It reads the index with `readFolderSiteIndex` from bundle-deploy's `folder-site-core.js`, which the
  build already ships.
  - A file's blocks are fetched when the file is asked for. Each block is checked by its BLAKE3 and by its length.
  - Blocks share the host's CID cache (128 MiB) with sites. A Range request fetches only the blocks it covers.
  - The same file is copied into `ark-browser-wt-tester-build` for the next tester build.
- **The boxed shell reads `/2`.** `gateway/index-site.js` fetches blocks through `content.js`
  `fetchVerifiedContent`, the shell's one checked path, and keeps them by ID up to 96 MiB.
  - `folder-site.js` `loadPageFiles` fetches only what one page names. That covers the page's attributes, its
    `srcset`, its styles and the style sheets those import.
  - A file over 32 MiB is left out of a page and its CSP blocks it.
  - The deployed copy (`devnet-deploy-2026-10-23/site/defxn-gateway/`) has the same files and keeps its node pins.
- **`prepare --store a,b`** sends every block and the index to each store (`createMirroredStoreClient`).
- **Measured 2026-10-29** on an M-series Mac, Node 24, against a loopback stand-in store holding the stage.
  - The stage held 1,439 files and 14,854,732 bytes. They packed as an index of 719,532 bytes and 1,324 blocks.
  - The home page took 127 blocks. With pure-JS BLAKE3, the shell took 0.6 s to load them. The FXN Browser's
    first answer took 0.46 s.
- **Deploy files:** `devnet-deploy-2026-10-23/caddy/fxn-site.service` and `caddy/fxn-names.caddy.next`. The second
  is `fxn-names.caddy` with its `*.fxn` block swapped for `fxn-sites.caddy`'s.

Still not built: the FXN Browser's check of `fxn-site` on every `.fxn` page, live data on de.fxn, and tests.
