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

## Site cut and launch deploy (2026-11-11)

This section is for the owner on launch day. Layer: app. Nothing here was deployed: no host was contacted, no
store was written and no name was claimed.

**Owner ruling, 2026-11-11.** The site is reached two ways at launch. The pack goes to the stores, and the FXN
browser opens it by its name. The same folder goes as static files behind Caddy on a node, for defxn.com in a
plain web browser. Both ship one cut, so both show the same bytes.

### Before the first command: the commits

Today no commit names the rebuild. A cut from a dirty tree is real, and the deploy script refuses to send it.
Read each `git status` first, because other sessions edit these repos. The cut reads these paths:

| Repo | What a cut reads | State on 2026-11-11 |
|---|---|---|
| `flux/defxn` | `index.html`, `broker.html`, `js/`, `css/`, `assets/`, `gateway/`, `robots.txt`, `sitemap.xml`, `llms.txt`, `scripts/`, `ops/` | 150 changed, 69 untracked. `scripts/build-shell.cjs`, `scripts/loader-ground.mjs` and `scripts/cut-site.mjs` are untracked. |
| `flux/fxn-3d` | `scripts/site-view-export.mjs`, `scripts/lib/`, `world/site-view/`, each object's `world/<object>/`, `engine/`, `js/`, `parts/` | 118 changed, 942 untracked. `dist/` is not in `.gitignore`, so an export leaves the tree dirty. |
| `flux/bundle-deploy` | `src/` (the pack core) | 4 changed, 3 untracked. The `.cjs` type line in `src/folder-site-core.js` is one of them. |

```bash
cd /Volumes/PortableSSD/flux
git -C defxn status --short
git -C defxn add index.html broker.html js css assets gateway robots.txt sitemap.xml llms.txt scripts ops .gitignore docs/FXN-REAL-SITES-DESIGN.md
git -C defxn commit -m "DEFXN site rebuild: the cut, the static deploy of a cut, the Caddy block for the 3D view"
git -C bundle-deploy status --short
git -C bundle-deploy add src/folder-site-core.js
git -C bundle-deploy commit -m "Site pack: .cjs is typed text/javascript, so a browser runs the grammar engine as a module"
git -C fxn-3d status --short
printf 'dist/\n' >> fxn-3d/.gitignore
git -C fxn-3d add .gitignore scripts engine js parts world/site-view world/portal101
git -C fxn-3d commit -m "Site view export: the static 3D view the DEFXN site ships"
```

The `fxn-3d` line names `world/portal101` only. Add each topic object's folder that `git status` shows as changed.
`bundle-deploy` also holds a product-kit sync in `bootstrap/vendor/defxn/`, from another session. The tree stays
dirty until that session commits it or reverts it.

One fact no commit fixes: `fxn-3d/world/edit/` is in `.gitignore`. The 3D documents and their pictures are owner
data there. So a commit names the code of a cut and never its 3D content. The cut's content ID and
`served-files.sha256` name both.

### Command 1: cut

```bash
# on flx-nyc1, in the defxn checkout there
node scripts/cut-site.mjs --fxn-3d /opt/fxn3d/fxn-3d --bundle-deploy <bundle-deploy checkout>
```

**Where it runs: flx-nyc1.** The owner's rule keeps node work for plan steps off his Mac. The plan runs such
steps on flx-nyc1 and brings the result back as a tar. The proof cut below ran on the Mac, by this session's
order; a launch cut runs on the node. The script takes its three roots as flags or as `FXN_3D_DIR` and
`BUNDLE_DEPLOY_DIR`. With neither, it reads the two repos beside `flux/defxn`, which is the Mac's layout.

What the cut needs on flx-nyc1, and how each part gets there:

| Needs | Gets there by | Missing today |
|---|---|---|
| `flux/fxn-3d` source: `scripts/`, `engine/`, `js/`, `world/site-view/`, each object's `world/<object>/` | `fxn-3d/scripts/nyc.sh push`, to `/opt/fxn3d/fxn-3d` | nothing found |
| The 3D documents and blobs (`world/edit/`) and `parts/index.fxn` | they are written on flx-nyc1; the Mac only receives them (`nyc.sh pull`) | Confirm that the 20 documents the view ships are the node's newest. The Mac's copy made the proof cut. |
| `flux/defxn`, whole: `index.html`, `js/`, `css/`, `assets/`, `gateway/`, `scripts/`, `node_modules/` for esbuild | the plan's tar convention (`pin-on-node.sh`, step 10b of `deploy-day.md`) | No script copies defxn to the node. `nyc.sh` syncs fxn-3d only. |
| `flux/bundle-deploy` with the `.cjs` line, and its `node_modules/` | the same tar convention | No script copies it. The `.cjs` line is uncommitted. |
| The cut folder, back on the Mac | `tar` of `.release/site-cut-<name>/`, then `shasum -a 256 -c` against `served-files.sha256` | `dist/` and `.release/` are not in `nyc.sh`'s pull list, so `nyc.sh pull` brings back neither. |

The deploy script (Command 2) is bash, rsync and ssh. It runs on the Mac, where the ssh aliases are. The publish
(Command 3) is node: it runs on flx-nyc1 too, from the cut folder there.

It runs `loader-ground`, `build-shell`, `build:ark`, the site-view export in `flux/fxn-3d` and the pack, then the checks. It
writes `.release/site-cut-<date>-<8 hex>/`. Measured on 2026-11-11 on the owner's Mac: 10 seconds in all, with the
export at 4.5 seconds because its snapshots were already built. A first export took 116 seconds that morning.

When it is right, it prints `PASS` for nine checks, then `Verdict: PASS` and the content ID on the last line.
The run on 2026-11-11 gave this cut:

| Measure | Value |
|---|---|
| Cut | `site-cut-20261111-f1266cd0` |
| Content ID | `f1266cd0e538ea0255c02a2d6e3ba1f50cc54ff8ca1e19e38a99a06265faab30` |
| Format | `flux-folder-site/2` |
| Files | 1,881 |
| Staged bytes | 41,410,486 |
| Index bytes | 962,027 |
| Blocks | 1,673 |
| Page addresses | 106 |
| 3D documents | 13 objects, and 7 more asked for by name |

That run's verdict was `REFUSED`, by the loopback check. The git check gave `WARN` for three dirty trees. Both are
correct results. `FINDINGS.txt` in the cut lists every hit. The 36 unclassified URLs are these:

| Where | What | Reading |
|---|---|---|
| `js/content/topics.js:61`, `js/min/content/topics.js:2` | `entry: 'http://127.0.0.1:3440/world/portal/game.html'` | A defect. The "Start playing" button on a deployed site opens the visitor's own machine. |
| `assets/kit/defxn-product.js:35` (25 URLs) | each product's `"local": "http://127.0.0.1:<port>/"` | Catalogue data from the product kit. Whether a deployed page shows these links was not checked. |
| `fxn-3d/view/js/editor/view-source.mjs:19` | `STATIC_VIEW ? here : local ? '' : 'http://127.0.0.1:3440'` | Not reached in a cut: `STATIC_VIEW` is set. The check cannot see that. |
| `js/admin/auth.js:2130` | default `discoveryUrl` `http://127.0.0.1:8779` | A default argument in the Auth Kit bundle. Not checked whether a page calls it without one. |
| `js/ark/dense-wire-wallet.mjs:62` | the "Local devnet" entry, `ws://127.0.0.1:19501/ws` | A choice in a list of networks. |
| `js/pages/explorer.js:5` | `LOCAL_MINER = 'http://127.0.0.1:8766'` | Not checked. |
| `js/pages/deploy.js:46` and `:53` | command text shown to an operator | Words on a page, not a request. |

Fix each one, or cut with `--accept-loopback`. That flag is the owner's word that each URL was read and may
ship. The manifest then says a flag passed them, and the hits stay listed.

### Command 2: the static deploy to a node

```bash
cd /Volumes/PortableSSD/flux/defxn
ops/deploy-defxn-site.sh flx-bk2            # dry run: prints every step, contacts nothing
ops/deploy-defxn-site.sh --go flx-bk2       # sends the newest cut
ops/deploy-defxn-site.sh --go flx-mk2
```

The nodes are the plan's (`deploy-day.md`, "11b. Deploy table for the genesis apps", order 5). The script sends the
cut's `stage/`, `web-only/broker.html` and `served-files.sha256` to `/srv/defxn-site.new`. It checks every file
on the node against the list. Two renames then make it live, and the tree before it stays as
`/srv/defxn-site.prev`. When it is right, the last line reads `Live on <node>: cut <name>`.

Before the first deploy of a cut, install the changed Caddy block on each node. That step changes a live Caddy, and
it is the owner's:

```bash
cd /Volumes/PortableSSD/flux/ark-miner-cli
ssh flx-bk2 cat /etc/caddy/sites/defxn-site.caddy | diff - ../defxn/ops/caddy/defxn-site.caddy
ops/caddy/install-defxn-site.sh flx-bk2 162.35.27.39
```

The block needs no value from the node. Until 2026-11-11 it named the view page's inline script by a hash
(`DEFXN_VIEW_INLINE_SCRIPT`), set per cut on each node. A rehearsal behind a real Caddy showed that the 3D could
not draw: the view's CSP had no `frame-src`, so the browser refused the object page's frame, and each of the 13
object pages held an inline module of its own that one hash could not name. Now the export
(`fxn-3d/scripts/site-view-export.mjs`) moves every inline script and handler of every view page into a file
next to the page. The view's CSP says `script-src 'self'` and `frame-src 'self'`, and a rebuild cannot break it.
The cut's `view-csp` check reads the block and refuses a cut whose view pages hold inline code or frame an
address the block's CSP refuses. A node that still has a `defxn-view.conf` drop-in can remove it. The peer
address in the last line is the one `deploy-day.md` gives for flx-bk2 in its gate step. Confirm it there before
you run it.

What changed in `ops/caddy/defxn-site.caddy`, and why:

- **Two CSPs.** The site frames its own 3D view. The old block sent `X-Frame-Options: DENY` and one CSP for every
  path, which refuses that frame. Now `/fxn-3d/view/*` answers `SAMEORIGIN` and `frame-ancestors 'self'`. Every
  other path keeps `DENY`. The view's CSP also has `frame-src 'self'` (2026-11-11), because the view frames its
  own object page, and `script-src 'self'` with no hash.
- **`/served-files.sha256` is not served** (2026-11-11). The deploy checks the list on the node's disk.
- **The site CSP gained three sources** that `index.html` already allows: `media-src 'self'` and the two seats.
- **Types.** `.mjs` and `.cjs` answer `text/javascript`. Caddy sends no type for `.cjs` by itself, and a browser
  then refuses the module.
- **No `Content-Encoding` on `*.fxn.gz`.** The view unpacks those files itself.
- **Caching.** Paths named by content are kept for a year. Everything else answers `no-cache`.
- **The asset rewrite** no longer takes `/fxn-3d/view/js/...`. Before, it sent those to `/js/...`, a 404.
- **A missing file with an extension** answers 404. Before, it answered the shell with status 200.
- **`/api/*`** still goes to the admin host on `127.0.0.1:3437`, as before.

### Checks after

```bash
ops/deploy-defxn-site.sh --checks --cut <cut folder> --ip <node address>
```

It fetches headers from the public site and prints `PASS` or `FAIL` per line. Run it once per node.

| URL | Must answer |
|---|---|
| `/` | 200, `text/html`, `Cache-Control: no-cache`, `X-Frame-Options: DENY`, a CSP with `media-src 'self'` |
| `/fxn/apps` | 200, `text/html`, no `Location` |
| `/fxn-3d/view/index.html` | 200, `X-Frame-Options: SAMEORIGIN`, a CSP with `script-src 'self'`, `frame-src 'self'` and `frame-ancestors 'self'` and no hash; the cut's bytes; no inline script |
| `/fxn-3d/view/world/<object>/index.html` | the same headers; the cut's bytes; no inline script |
| `/fxn-3d/engine/grammar/flx-grammar-engine.cjs` | 200, `text/javascript` |
| `/fxn-3d/view/js/editor/align-ui.mjs` | 200, `text/javascript` |
| `/fxn-3d/view/edit/<document>.<16 hex>.fxn.gz` | 200, no `Content-Encoding`, `immutable`, the file's own length |
| `/fxn-3d/view/edit/blob/<64 hex>.pack` | 200, `application/octet-stream`, `immutable` |
| `/js/bundle/shell-1.js?v=<8 hex>` | 200, `text/javascript`, `immutable` |
| `/broker.html` | 200, `text/html` |
| `/no-such-file.mjs` | 404 |
| `/api/session` | printed, not judged: a cut's pages do not ask for it |
| `/` (body) | the cut's shell, byte for byte: this is how the check knows which cut is live |
| `/served-files.sha256` | 404 |

A 200 on `/fxn-3d/view/index.html` does not prove the 3D is alive. A static server that sent `.cjs` as
`application/octet-stream` answered 200 for that page and drew nothing. On 2026-11-11 every header check passed
behind a real Caddy while the view's CSP refused its own frame. The proof is in the page, in a plain
browser and in the FXN browser:

- The home posts `held HEROIN`, and the ring shows its 12 stone words.
- A topic page's object lands in its slot.
- `/auth` opens.
- The console shows no CSP refusal and no module type error.

### Rollback

```bash
ops/deploy-defxn-site.sh --rollback flx-bk2          # dry run
ops/deploy-defxn-site.sh --rollback --go flx-bk2
```

It puts `/srv/defxn-site.prev` back. The tree it replaces stays as `/srv/defxn-site.rolled-back`. One earlier
cut is kept, so a second rollback has nothing to restore. The Caddy block has its own way back: the installer
keeps no copy of the old site file, so save the `diff` output above before you install.

### Command 3: publish the pack

```bash
# on flx-nyc1, with one tunnel per day-one store (five stores, five local ports)
node <bundle-deploy checkout>/bin/bundle-deploy.mjs prepare <cut folder>/stage \
  --store http://127.0.0.1:<port 1>,http://127.0.0.1:<port 2>,http://127.0.0.1:<port 3>,http://127.0.0.1:<port 4>,http://127.0.0.1:<port 5> \
  --identity-file <publisher seed file> --publish
```

**Where it runs: flx-nyc1.** The pack is held by the byte stores. `--store a,b` sends every block and the index
to each store named. It sends the 1,673 blocks first and the index last, then signs and publishes the release.
When it is right, it prints `Stored <n> blocks`, then JSON with `"ok": true`. The content ID it prints must equal
the cut's.

**The check: read every content ID back from each store.** The cut writes `store-ids.txt`: each block's ID, then
the index's ID on the last line. This cut has 1,673 blocks, so the file holds 1,674 lines. Run this once per
store port. It must print `1674 of 1674`:

```bash
P=<store port>; ok=0; n=0
while read -r id; do n=$((n+1)); [ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$P/api/blockstore/get/$id")" = 200 ] && ok=$((ok+1)); done < <cut folder>/store-ids.txt
echo "$ok of $n"
```

The loop proves each store answers each ID. It does not hash the bytes; the FXN browser and the name site server
do that on every read. The name claim comes only after all five stores print the full count.

The command binds no name. The devnet serves `.fxndev` names only, so the name is `<label>.fxndev`. Its claim
is a genesis-key step after genesis is live, and the genesis plan writes that step. The name then gets a
`blake3_cid` target that holds the cut's content ID. The FXN browser reads the pack by that name
(`flux/ark-browser` `src/main/fxn-sites/fxn-site-host.js`).

### The other plain-browser way: by name

A node-side site server exists and is not deployed: `flux/ark-miner-cli/ops/defxn-gateway-ask/site-server.mjs`.
It serves `<label>.fxndev` as an ordinary website from the same pack, in both formats. It checks the name's proof
and each block's hash on the node. It needs `fxn-site.service` on port 8789, the store on `127.0.0.1:8772`, the
ask server, and the Caddy block `fxn-sites.caddy`. Both files are proposals in
`flux/devnet-deploy-2026-10-23/caddy/`. It answers each file with the type the pack recorded. The cut checks
those types.

### To confirm

1. **Loopback sources in the served CSP.** `defxn-site.caddy` still allows `http://127.0.0.1:4571` to `4575` and
   `:8766`. The four signing sites dropped theirs on 2026-11-05. Should defxn.com drop them at launch?
2. **The view page's inline script.** Answered 2026-11-11: the export moves every view page's inline code into
   files, the view's CSP is `script-src 'self'` with no hash, and `DEFXN_VIEW_INLINE_SCRIPT` is gone. Still open:
   the signing-site header test reads the first header block only and does not see the `@view` block.
3. **The view's other needs.** Answered 2026-11-11 from the built view's code. It opens two frames (the view page
   frames an object page, which frames `world/editor.html`), so its CSP has `frame-src 'self'`. It opens no
   worker and no socket, plays no media, and fetches only this site's files. The reason for each directive is
   in the comment above `@view` in `ops/caddy/defxn-site.caddy`.
3a. **An unknown address answers the shell with status 200.** The site's own Not found page then shows. The 106
   page addresses are files, so a miss could answer the same shell with status 404 (in the last `handle`:
   a `not file {path} {path}.html {path}/` matcher, then `rewrite * /index.html` and `file_server { status 404 }`).
   Not changed: say whether any address is meant to work without a file of its own (a deep link such as
   `/learnings/<slug>`), because such an address would answer 404 too.
4. **To be settled by the rehearsal** (the genesis session runs the proof cut on loopback with Caddy 2.8.4 and
   five stores). Three Caddy behaviours in `defxn-site.caddy` are read from its documented behaviour and none
   was run:
   - A `Content-Type` set by `header` before `file_server` is kept, so `.cjs` answers `text/javascript`.
   - A `header` block with `defer` is written after a plain one, so the view's CSP and `SAMEORIGIN` leave.
   - `header ?Cache-Control` sets the header only when none is set, so the year-long cache survives.
5. **Files in the stage that no deployed page uses.** The staged shell says
   `<meta name="defxn-host" content="static">`, so no page asks `/api/session`. `/api/*` still goes to the admin
   host, the one proxy the repo defines. Two files ship unused: `js/settings/skin-test.js` (loaded on localhost
   only) and `js/bundle/shell-4.js` (an old bundle that `build-shell` no longer writes and no tag loads). Should
   the pack leave them out? `gateway/tester.js` stays: `gateway/app.js` imports it for tester releases.
6. **Hand-typed `?v=` stamps** stay on `no-cache`. A long cache is faster and goes stale when a stamp is forgotten.
7. **`docs/` no longer ships** to defxn.com. The old deploy sent `docs/status.md`, `docs/WHITEPAPER.md` and
   `docs/evidence/`. No page was found that fetches them. Does an outside link point at them?
8. **The gateway shell.** `/srv/defxn-gateway` is no longer sent by default. Send it with `--with-gateway`?
9. **The publisher key.** Which seed signs the release: a new publisher FXN ID, or an existing one?
10. **The stores' addresses.** The pack goes to the five day-one stores. Which local port tunnels to which store?
11. **The label** of `<label>.fxndev`. The owner's choice.
12. **The byte store's retention rule, and any quota per publisher at the upload door.** How long does a store
    keep a block nobody reads, and does the door limit one publisher's bytes? Neither was read here. The genesis
    session rehearses the publish on loopback. The pack needs no keep order: that is browser-earning work, a
    different system.
13. **The peer address** for `install-defxn-site.sh` on each node.
14. **`fxn-3d` `dist/`** in `.gitignore`: the line above is a proposal for the session that owns that repo.
15. **Copying defxn and bundle-deploy to flx-nyc1.** No script does it today. Which tar step carries them?

### Not verified

Nothing was sent to a node, a store or a name. The Caddy block was not validated by a Caddy binary. The
`--checks` mode and `--go` were not run. The cut's stage was not opened in a browser by this work; the earlier
proof (home, 12 topic pages, Learn, `/auth`) was on a stage from the same scripts, before this cut.
