/* *.defxn.com gateway shell.
   Served same-origin by Caddy on every `<label>.defxn.com` hostname (see
   ark-miner-cli/ops/caddy/defxn-wildcard.caddy). No build step, matching this
   project's own convention (see ../scripts/serve-site.mjs).

   Flow: location.hostname -> "<label>.fxn" -> DOM_PROOF over a name node's
   WebSocket line protocol (name-config.js) -> verified with the ONE shared
   verifier (resolve-name.js; vendor/dense-wire/flx-domain-proof.mjs) against the
   pinned genesis key -> the record's blake3_cid target -> GET
   /fxn-store/v1/<cid> (same-origin, answered from the node's byte store) ->
   refused unless the bytes hash to that ID (content.js) -> decode with
   flx-codec's decodeArchiveAsync (vendored at ./vendor/flx-codec/, see that
   directory's VENDORED-FROM.txt) -> render. A "flux-chain-site/1" archive (a
   defxn CMS site) gets the template below. A "flux-folder-site/1" archive (a
   plain folder, bundle-deploy pack) runs as its own pages in a sandboxed frame
   with no network (folder-site.js, site-frame.html).

   Names come only from dense-wire (docs/DEFXN-NAMES-ONE-SYSTEM.md). Until
   2026-10-23 this shell read the Explorer `names` source (GUN names/*) and
   checked a self-signed record; that registry is retired and is not a fallback.
   A proof that does not verify is refused by name; a name the chain does not
   hold is "no such name", with the remedy.

   This renders ONE plain, minimal default template for whatever "flux-chain-
   site/1" archive resolves — it is deliberately not styled like defxn.com's
   own marketing site (the owner's prior decision: the gateway's default
   rendering is a legible fallback, not a second brand).

   Failure taxonomy loosely modeled on CMS-ARK's ArkOverlayFailureReason
   (the hub's deark/CMS-ARK/src/lib/mesh/overlay.ts) -- same idea
   (name a few distinct reasons an honest "nothing here" page can mean, never
   a blank page or a bare 404), reused rather than copied because that file's
   failure set is for a different content shape (dense-encoding-v4 CMS posts)
   entirely. */
import { decodeArchiveAsync } from "./vendor/flx-codec/index.js";
import { resolveName as resolveOnChain } from "./resolve-name.js";
import { fetchVerifiedContent } from "./content.js";
import { NAME_NODES, GENESIS_PUB_HEX } from "./name-config.js";
import { FOLDER_SITE_SCHEMA, readFolderSite, pageForAddress, buildPageHtml } from "./folder-site.js";
import { releaseRequestOf, readRelease, downloadRelease } from "./release.js";

const SITE_SCHEMA = "flux-chain-site/1";

const FAILURE_MESSAGES = {
  NAME_NOT_FOUND: "No such name. Nothing is claimed at this address.",
  NAME_NO_RECORD: "This name has an owner but points nowhere yet.",
  NAME_UNRESOLVABLE: "No name node answered, so this address cannot be read right now.",
  PROOF_INVALID: "The name node sent an ownership proof that does not verify. This page refuses to render what it points at.",
  GATEWAY_NOT_CONFIGURED: "This gateway has no genesis key pinned, so it cannot verify any name.",
  CONTENT_UNREACHABLE: "This site's content is not reachable right now.",
  CONTENT_TOO_LARGE: "This site's content is larger than the public gateway will serve.",
  CONTENT_MALFORMED: "This site's content could not be read as a mesh site archive.",
  CONTENT_MISMATCH: "This site's content does not match the address its name points at, so this page refuses to show it.",
  SCHEMA_UNSUPPORTED: "This mesh name does not point at a site this gateway knows how to render.",
  PAGE_NOT_FOUND: "This site has no page at this address.",
  NOT_A_PAGE: "This address holds a file of the site, not a page.",
  SITE_LEFT_ARCHIVE: "This page tried to show something from outside its site, so the gateway stopped it.",
  RELEASE_NONE: "Nothing is published for this download yet.",
  RELEASE_CONFLICT: "Two releases claim the same place, so this page offers neither.",
  RELEASE_ADDRESS: "This download address names no product.",
};

const app = document.getElementById("app");
const footer = document.getElementById("page-footer");

function labelFromHostname(hostname) {
  const suffix = ".defxn.com";
  if (hostname.toLowerCase().endsWith(suffix)) {
    return hostname.slice(0, -suffix.length).toLowerCase();
  }
  return hostname.toLowerCase();
}

function renderStatus(reason, detail) {
  const message = FAILURE_MESSAGES[reason] || "Something went wrong reading this address.";
  app.innerHTML = "";
  footer.hidden = false;
  footer.textContent = "Served from the Flux mesh";
  const wrap = document.createElement("div");
  wrap.className = "status-page";
  wrap.dataset.tone = "error";
  const icon = document.createElement("div");
  icon.className = "status-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "!";
  wrap.appendChild(icon);
  const h1 = document.createElement("h1");
  h1.textContent = message;
  wrap.appendChild(h1);
  if (detail) {
    const p = document.createElement("p");
    p.textContent = detail;
    wrap.appendChild(p);
  }
  const code = document.createElement("div");
  code.className = "status-code";
  code.textContent = reason;
  wrap.appendChild(code);
  app.appendChild(wrap);
}

async function resolveName(name) {
  return resolveOnChain({ name, nodes: NAME_NODES, genesisPubHex: GENESIS_PUB_HEX });
}

function decodeSite(decoded) {
  const routes = new Map((decoded.routes || []).map((route) => [route.routeId, route]));
  const entry = routes.get("site");
  if (!entry || entry.payload?.schema !== SITE_SCHEMA) return null;
  const need = (routeId) => routes.get(routeId)?.payload ?? null;
  return {
    manifests: (entry.payload.manifests || []).map((id) => need(`manifest.${id}`)).filter(Boolean),
    articles: (entry.payload.articles || []).map((slug) => need(`article.${slug}`)).filter(Boolean),
  };
}

function fieldEntries(fields) {
  if (!fields || typeof fields !== "object") return [];
  return Object.entries(fields).filter(([, field]) => field && typeof field === "object" && "value" in field);
}

function renderSite(site) {
  const state = { site, path: location.pathname };
  footer.innerHTML = "";
  const verified = document.createElement("span");
  verified.className = "verified";
  verified.textContent = "Served from the Flux mesh — this page verified its signature itself";
  footer.appendChild(verified);

  const home = site.manifests.find((m) => m.route === "/") || site.manifests[0];

  // Exact match only. The earlier version fell back to the home manifest for
  // ANY unmatched path, which meant the "Page not found" branch below could
  // never actually run -- a mistyped or stale link silently rendered the
  // homepage instead of saying so. "/" alone still falls back to `home`, so
  // a site with no manifest explicitly at route "/" still has a landing page.
  function manifestForPath(path) {
    if (path === "/") return home;
    return site.manifests.find((m) => m.route === path) || null;
  }

  function articleForSlug(slug) {
    return site.articles.find((a) => a.slug === slug) || null;
  }

  function navigate(path, push) {
    state.path = path;
    if (push) history.pushState({}, "", path);
    render();
  }

  function render() {
    app.innerHTML = "";

    const header = document.createElement("header");
    const name = document.createElement("span");
    name.className = "site-name";
    name.textContent = manifestForPath("/")?.title || "Mesh site";
    header.appendChild(name);
    const mesh = document.createElement("span");
    mesh.className = "mesh-name";
    mesh.textContent = location.hostname;
    header.appendChild(mesh);

    const nav = document.createElement("nav");
    nav.id = "site-nav";
    for (const manifest of site.manifests) {
      const a = document.createElement("a");
      a.href = manifest.route || "/";
      a.textContent = manifest.title || manifest.id;
      if (manifest.route === state.path) a.setAttribute("aria-current", "page");
      a.addEventListener("click", (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigate(manifest.route || "/", true);
      });
      nav.appendChild(a);
    }
    if (site.articles.length) {
      const a = document.createElement("a");
      a.href = "/articles";
      a.textContent = "Articles";
      if (state.path === "/articles" || state.path.startsWith("/article/")) a.setAttribute("aria-current", "page");
      a.addEventListener("click", (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigate("/articles", true);
      });
      nav.appendChild(a);
    }
    header.appendChild(nav);
    app.appendChild(header);

    const main = document.createElement("main");

    const articleMatch = state.path.match(/^\/article\/(.+)$/);
    if (articleMatch) {
      const article = articleForSlug(decodeURIComponent(articleMatch[1]));
      if (!article) {
        const p = document.createElement("p");
        p.className = "not-found";
        p.textContent = "Article not found.";
        main.appendChild(p);
      } else {
        const h1 = document.createElement("h1");
        h1.textContent = article.title || article.slug;
        main.appendChild(h1);
        for (const section of article.sections || []) {
          if (section.heading) {
            const h2 = document.createElement("h2");
            h2.textContent = section.heading;
            main.appendChild(h2);
          }
          if (section.body) {
            const p = document.createElement("div");
            p.className = "field-value";
            p.textContent = section.body;
            main.appendChild(p);
          }
        }
      }
    } else if (state.path === "/articles") {
      const h1 = document.createElement("h1");
      h1.textContent = "Articles";
      main.appendChild(h1);
      const list = document.createElement("ul");
      list.className = "article-list";
      for (const article of site.articles) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = `/article/${encodeURIComponent(article.slug)}`;
        a.textContent = article.title || article.slug;
        a.addEventListener("click", (event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          navigate(a.getAttribute("href"), true);
        });
        li.appendChild(a);
        list.appendChild(li);
      }
      main.appendChild(list);
    } else {
      const manifest = manifestForPath(state.path);
      if (!manifest) {
        const p = document.createElement("p");
        p.className = "not-found";
        p.textContent = "Page not found.";
        main.appendChild(p);
      } else {
        const h1 = document.createElement("h1");
        h1.textContent = manifest.title || manifest.id;
        main.appendChild(h1);
        for (const [role, field] of fieldEntries(manifest.fields)) {
          const row = document.createElement("div");
          row.className = "field";
          const label = document.createElement("div");
          label.className = "field-label";
          label.textContent = field.label || role;
          row.appendChild(label);
          const value = document.createElement("div");
          value.className = "field-value";
          value.textContent = field.value ?? "";
          row.appendChild(value);
          main.appendChild(row);
        }
      }
    }

    app.appendChild(main);
  }

  window.addEventListener("popstate", () => {
    state.path = location.pathname;
    render();
  });

  render();
}

/* A folder site's pages, one sandboxed frame per page (folder-site.js says why). The shell keeps the
   address bar: a link inside the site asks for its page by message, and the shell shows it. A frame that
   loads anything after its page (a script sent it to another address) is replaced by a refusal. */
function renderFolderSite(site) {
  let current = null;

  function show(pathname, hash) {
    const page = pageForAddress(site, pathname);
    if (!page.ok) {
      current = null;
      return renderStatus(page.reason, `${page.detail} Go to ${location.origin}/ for its first page.`);
    }
    if (!/^text\/html\b/i.test(page.file.contentType)) {
      current = null;
      return renderStatus("NOT_A_PAGE", `${pathname} is ${page.file.contentType}. A page of the site can show it.`);
    }
    const doc = new DOMParser().parseFromString(new TextDecoder().decode(page.file.bytes), "text/html");
    const { html, title } = buildPageHtml(site, page.path, doc);
    document.title = title || location.hostname;

    const frame = document.createElement("iframe");
    frame.className = "folder-site";
    frame.title = title || location.hostname;
    frame.setAttribute("sandbox", "allow-scripts allow-popups allow-popups-to-escape-sandbox");
    frame.setAttribute("referrerpolicy", "no-referrer");
    frame.src = "/site-frame.html";
    const state = { frame, html, hash, sent: false, loads: 0 };
    /* Measured in Chromium 2026-10-23: site-frame.html's load, then the load document.close() ends with.
       A third means the frame went somewhere else. */
    frame.addEventListener("load", () => {
      state.loads += 1;
      if (current === state && state.loads > 2) {
        current = null;
        renderStatus("SITE_LEFT_ARCHIVE", "A script or link on the page sent its frame to an address outside the site's archive. Only what the site's name points at is shown here. Reload to start again.");
      }
    });
    current = state;
    footer.hidden = true;
    app.replaceChildren(frame);
  }

  window.addEventListener("message", (event) => {
    if (!current || event.source !== current.frame.contentWindow) return;
    const data = event.data;
    if (data?.type === "fxn-folder-site:ready" && !current.sent) {
      current.sent = true;
      /* "*": an opaque origin cannot be named. What is sent is the site's own public page. */
      current.frame.contentWindow.postMessage({ type: "fxn-folder-site:page", html: current.html, hash: current.hash }, "*");
    } else if (data?.type === "fxn-folder-site:navigate" && typeof data.href === "string") {
      const url = new URL(data.href, location.origin);
      if (url.origin !== location.origin) return;
      history.pushState(null, "", url.pathname + url.search + url.hash);
      show(url.pathname, url.hash);
    }
  });
  window.addEventListener("popstate", () => show(location.pathname, location.hash));
  show(location.pathname, location.hash);
}

const MIB = 1024 * 1024;
const PLATFORM_WORDS = { darwin: "macOS", win32: "Windows", linux: "Linux" };
const ARCH_WORDS = { arm64: "Apple silicon", x64: "Intel" };

/* One release, one action: the file is checked block by block, then as a whole, and only then
   saved (release.js). Nothing is offered before the owner's signature and the name's proof agree. */
function renderRelease(name, release) {
  app.innerHTML = "";
  footer.hidden = false;
  footer.textContent = `Signed by the owner of ${name}. Every block is checked before it is saved.`;
  const wrap = document.createElement("div");
  wrap.className = "status-page";
  const h1 = document.createElement("h1");
  h1.textContent = `${release.filename}`;
  const p = document.createElement("p");
  p.textContent = `Version ${release.version} for ${PLATFORM_WORDS[release.platform] || release.platform} (${ARCH_WORDS[release.arch] || release.arch}). ${(release.size / MIB).toFixed(0)} MB.`;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "release-button";
  button.textContent = "Download";
  const progress = document.createElement("p");
  progress.className = "release-progress";
  progress.setAttribute("role", "status");
  button.addEventListener("click", async () => {
    button.disabled = true;
    const result = await downloadRelease(release, { onProgress: (got, total) => { progress.textContent = `Checked ${(got / MIB).toFixed(0)} of ${(total / MIB).toFixed(0)} MB`; } });
    if (!result.ok) return renderStatus(result.reason, result.detail);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(result.blob);
    link.download = release.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    progress.textContent = "Saved. The file matches what the owner signed.";
    button.disabled = false;
  });
  wrap.append(h1, p, button, progress);
  app.appendChild(wrap);
}

async function main() {
  /* A folder site's frame sent to one of this gateway's own addresses would load the shell inside it. */
  if (window.top !== window) return;
  const label = labelFromHostname(location.hostname);
  const name = `${label}.fxn`;

  const resolved = await resolveName(name);
  if (!resolved.ok) return renderStatus(resolved.reason, resolved.detail);

  // /_release/<product>: the shell reads and checks an app release under this name's proven owner.
  const wanted = releaseRequestOf(location.pathname, location.search);
  if (wanted?.invalid) return renderStatus("RELEASE_ADDRESS", "Use /_release/<product>, for example /_release/ark-browser.");
  if (wanted) {
    const read = await readRelease({ name, ownerHex: resolved.owner, want: wanted });
    if (!read.ok) return renderStatus(read.reason, read.detail);
    return renderRelease(name, read.release);
  }

  if (!resolved.record) return renderStatus("NAME_NO_RECORD", `Point ${name} at a site at https://domains.defxn.com.`);
  const target = resolved.record.targets.find((t) => t.type === "blake3_cid");
  if (!target) return renderStatus("NAME_NO_RECORD", `${name} points at ${resolved.record.targets.map((t) => t.type).join(", ")}, not at a site in the byte store (blake3_cid). Publish the site with Bundles, then point ${name} at its content ID at https://domains.defxn.com.`);

  const content = await fetchVerifiedContent(target.value);
  if (!content.ok) return renderStatus(content.reason, content.detail);

  let decoded;
  try {
    decoded = await decodeArchiveAsync(content.bytes);
  } catch (error) {
    return renderStatus("CONTENT_MALFORMED", error.message);
  }

  const schema = (decoded.routes || []).find((route) => route.routeId === "site")?.payload?.schema;
  if (schema === FOLDER_SITE_SCHEMA) {
    const folder = readFolderSite(decoded);
    if (!folder.ok) return renderStatus(folder.reason, folder.detail);
    return renderFolderSite(folder.site);
  }

  const site = decodeSite(decoded);
  if (!site) return renderStatus("SCHEMA_UNSUPPORTED");
  if (!site.manifests.length) return renderStatus("CONTENT_MALFORMED", "The site archive lists no pages.");

  renderSite(site);
}

main().catch((error) => renderStatus("CONTENT_MALFORMED", error?.message || String(error)));
