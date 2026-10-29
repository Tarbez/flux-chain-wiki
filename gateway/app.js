/* *.defxn.com gateway shell.
   Served same-origin by Caddy on every `<label>.defxn.com` hostname (see
   ark-miner-cli/ops/caddy/defxn-wildcard.caddy). No build step, matching this
   project's own convention (see ../scripts/serve-site.mjs).

   Flow: location.hostname -> "<label>.<ending>" (.fxn on the mainnet, .fxndev on a test
   network: resolve-name.js servedNetwork) -> DOM_PROOF over a name node's
   WebSocket line protocol (name-config.js) -> verified with the ONE shared
   verifier (resolve-name.js; vendor/dense-wire/flx-domain-proof.mjs) against the
   pinned genesis key -> the record's blake3_cid target -> GET
   /fxn-store/v1/<cid> (same-origin, answered from the node's byte store) ->
   refused unless the bytes hash to that ID (content.js) -> decode with
   flx-codec's decodeArchiveAsync (vendored at ./vendor/flx-codec/, see that
   directory's VENDORED-FROM.txt) -> render. A "flux-chain-site/1" archive (a
   defxn CMS site) gets the template below. A "flux-folder-site/1" archive (a
   plain folder, bundle-deploy pack) runs as its own pages in a sandboxed frame
   with no network (folder-site.js, site-frame.html). A "flux-folder-site/2"
   archive is an index of 8 MiB blocks: each page's files are fetched block by
   block and checked when the page is shown (index-site.js).

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
import { resolveName as resolveOnChain, servedNetwork } from "./resolve-name.js";
import { fetchVerifiedContent } from "./content.js";
import { NAME_NODES, GENESIS_PUB_HEX, NETWORK } from "./name-config.js";
import { FOLDER_SITE_SCHEMA, readFolderSite, pageForAddress, buildPageHtml, loadPageFiles } from "./folder-site.js";
import { FOLDER_SITE_INDEX_SCHEMA, readIndexSite, createBlockReader, BlockRefusal } from "./index-site.js";
import { releaseRequestOf, readRelease, downloadRelease } from "./release.js";
import { makeTesterKey, openTesterRelease, saveWithLink, saveOpenedFile } from "./tester.js";

const SITE_SCHEMA = "flux-chain-site/1";

const FAILURE_MESSAGES = {
  NAME_NOT_FOUND: "No such name. Nothing is claimed at this address.",
  NAME_NO_RECORD: "This name has an owner but points nowhere yet.",
  NAME_UNRESOLVABLE: "No name node answered, so this address cannot be read right now.",
  NAME_WRONG_ENDING: "This name belongs to another network, so this gateway does not open it.",
  NAME_UNPAID: "This name's paid term has ended. Its holder can still renew it, so its site is not shown.",
  NAME_LAPSED: "This name lapsed without a payment. Anyone can claim it again.",
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

/** "de.defxn.com" and "de.<ending>" both name "de.<ending>", the ending this gateway's network serves (.fxndev on
 *  the devnet): the second is the name itself, opened in a browser whose DNS asks fxn-dns (2026-10-28). */
function labelFromHostname(hostname, ending) {
  const host = hostname.toLowerCase();
  for (const suffix of [".defxn.com", `.${ending}`]) {
    if (host.endsWith(suffix)) return host.slice(0, -suffix.length);
  }
  return host;
}

function renderStatus(reason, detail) {
  const message = FAILURE_MESSAGES[reason] || "Something went wrong reading this address.";
  app.innerHTML = "";
  footer.hidden = false;
  footer.textContent = "Served from the FXN chain";
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

async function resolveName(name, network) {
  return resolveOnChain({ name, nodes: NAME_NODES, genesisPubHex: GENESIS_PUB_HEX, network });
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
  verified.textContent = "Served from the FXN chain — this page verified its signature itself";
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
function renderFolderSite(site, loadBytes = async (file) => file.bytes) {
  let current = null;
  let shown = 0;

  async function show(pathname, hash) {
    const turn = ++shown;
    const page = pageForAddress(site, pathname);
    if (!page.ok) {
      current = null;
      return renderStatus(page.reason, `${page.detail} Go to ${location.origin}/ for its first page.`);
    }
    if (!/^text\/html\b/i.test(page.file.contentType)) {
      current = null;
      return renderStatus("NOT_A_PAGE", `${pathname} is ${page.file.contentType}. A page of the site can show it.`);
    }
    /* A /2 page and its files arrive block by block; a /1 site holds them already. */
    let doc;
    let view;
    try {
      const bytes = await loadBytes(page.file);
      if (!bytes) throw new BlockRefusal("CONTENT_TOO_LARGE", `${pathname} is ${page.file.size} bytes, more than this gateway shows as one page.`);
      doc = new DOMParser().parseFromString(new TextDecoder().decode(bytes), "text/html");
      view = await loadPageFiles(site, page.path, doc, loadBytes);
    } catch (error) {
      if (turn !== shown) return;
      current = null;
      if (error instanceof BlockRefusal) return renderStatus(error.reason, error.detail);
      throw error;
    }
    if (turn !== shown) return; /* another page was asked for while this one loaded */
    const { html, title } = buildPageHtml(view, page.path, doc);
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

  const go = (pathname, hash) => show(pathname, hash).catch((error) => renderStatus("CONTENT_MALFORMED", error?.message || String(error)));

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
      go(url.pathname, url.hash);
    }
  });
  window.addEventListener("popstate", () => go(location.pathname, location.hash));
  go(location.pathname, location.hash);
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

/* A sealed release: a closed tester group's (2026-10-29). Two actions, one per state: open it with a tester key
   (the dominant one), or make a tester key. Each action swaps the panel in place, and Back returns to the facts.
   A refusal shows inside the panel it came from, so what the tester typed and chose stays (tester.js does the work). */
function renderTesterRelease(name, release) {
  app.innerHTML = "";
  footer.hidden = false;
  footer.textContent = `Signed by the owner of ${name}. Every block is checked before the app is offered.`;
  const wrap = document.createElement("div");
  wrap.className = "status-page tester";
  app.appendChild(wrap);
  const mb = (bytes) => `${Math.max(1, Math.round(bytes / MIB))} MB`;
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (text, primary, onClick) => {
    const node = el("button", primary ? "release-button" : "text-button", text);
    node.type = "button";
    node.addEventListener("click", onClick);
    return node;
  };
  const field = (labelText, input) => {
    const label = el("label", "tester-field");
    label.append(el("span", "tester-label", labelText), input);
    return label;
  };
  const idInput = () => {
    const input = el("input");
    input.type = "text";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.maxLength = 64;
    input.placeholder = "one word, such as your first name";
    return input;
  };
  const refusalBox = () => el("div", "refusal");
  const showRefusal = (box, result) => {
    box.replaceChildren(el("p", "refusal-failure", result.failure), el("p", null, `Needs ${result.missing.replace(/\.$/, "")}.`), el("p", null, `Next: ${result.remedy}`), el("span", "status-code", result.code));
  };
  const show = (...nodes) => wrap.replaceChildren(...nodes);

  function home() {
    const platform = `${PLATFORM_WORDS[release.platform] || release.platform} (${ARCH_WORDS[release.arch] || release.arch})`;
    show(
      el("h1", null, release.filename),
      el("p", null, `Version ${release.version} for ${platform}. ${mb(release.sealed.plaintextSize)}.`),
      el("p", "tester-meta", `Release ${release.sequence} · sealed for its testers · signed by the owner of ${name}`),
      el("p", null, "Only a tester the owner added can open it."),
      button("Open with my tester key", true, openPanel),
      button("Make my tester key", false, makePanel),
    );
  }

  function makePanel() {
    const input = idInput();
    const box = refusalBox();
    const make = button("Make key", true, async () => {
      make.disabled = true;
      const made = await makeTesterKey(input.value.trim());
      make.disabled = false;
      if (!made.ok) return showRefusal(box, made);
      saveWithLink(made.keyText, made.filename, "text/plain");
      madePanel(made);
    });
    show(
      el("h1", null, "Make your tester key"),
      el("p", null, "Type the name the owner knows you by. This page makes the key on this device, and the key never leaves it."),
      field("Identity id", input),
      box,
      make,
      button("Back", false, home),
    );
    input.focus();
  }

  function madePanel(made) {
    const status = el("p", "release-progress", "");
    status.setAttribute("role", "status");
    const line = el("pre", "tester-line", made.line);
    const copy = button("Copy line", true, async () => {
      try {
        await navigator.clipboard.writeText(made.line);
        status.textContent = "Copied. Paste it into a message to the owner.";
      } catch {
        getSelection().selectAllChildren(line);
        status.textContent = "Select the line and copy it.";
      }
    });
    show(
      el("h1", null, "Send this line to the owner"),
      el("p", null, `Your key file is saved as ${made.filename}. Keep it. You need it to open the release, and nobody can make it again.`),
      line,
      copy,
      status,
      el("p", "tester-meta", "The owner adds your line and releases again. Then open this page again and choose Open with my tester key."),
      button(`Save ${made.filename} again`, false, () => saveWithLink(made.keyText, made.filename, "text/plain")),
      button("Back", false, home),
    );
  }

  function openPanel() {
    const keyInput = el("input");
    keyInput.type = "file";
    const input = idInput();
    const box = refusalBox();
    const progress = el("p", "release-progress", "");
    progress.setAttribute("role", "status");
    const open = button("Open release", true, async () => {
      box.replaceChildren();
      const file = keyInput.files?.[0];
      if (!file) return showRefusal(box, { code: "TESTER_KEY_MISSING", failure: "No key file is chosen.", missing: "the key file you saved when you made your tester key.", remedy: "choose it, then open the release." });
      open.disabled = true;
      const keyText = await file.text();
      const result = await openTesterRelease(release, {
        identityId: input.value.trim(),
        keyText,
        onProgress: (got, total, phase) => {
          progress.textContent = phase === "key" ? "Checking your key against the release" : `Checked ${mb(got)} of ${mb(total)}`;
        },
      });
      open.disabled = false;
      progress.textContent = "";
      if (!result.ok) return showRefusal(box, result);
      openedPanel(result);
    });
    show(
      el("h1", null, "Open with your tester key"),
      field("Key file", keyInput),
      field("Identity id, as in the line you sent", input),
      box,
      open,
      progress,
      button("Back", false, home),
    );
  }

  function openedPanel(result) {
    const status = el("p", "release-progress", "");
    status.setAttribute("role", "status");
    const save = button(`Save ${release.filename}`, true, async () => {
      const saved = await saveOpenedFile(result.bytes, release.filename);
      status.textContent = saved.ok ? "Saved." : "Not saved. Choose Save again.";
    });
    show(
      el("h1", null, "The app matches the owner's signature"),
      el("p", null, `${release.filename}, ${mb(result.bytes.length)}. Its size and SHA-256 match the release.`),
      el("p", "tester-meta", `SHA-256 ${result.sha256}`),
      save,
      status,
    );
  }

  home();
}

async function main() {
  /* A folder site's frame sent to one of this gateway's own addresses would load the shell inside it. */
  if (window.top !== window) return;
  const served = await servedNetwork({ network: NETWORK, nodes: NAME_NODES });
  if (!served.ok) return renderStatus(served.reason, served.detail);
  const label = labelFromHostname(location.hostname, served.ending);
  const name = `${label}.${served.ending}`;

  const resolved = await resolveName(name, served.network);
  if (!resolved.ok) return renderStatus(resolved.reason, resolved.detail);

  // /_release/<product>: the shell reads and checks an app release under this name's proven owner.
  const wanted = releaseRequestOf(location.pathname, location.search);
  if (wanted?.invalid) return renderStatus("RELEASE_ADDRESS", "Use /_release/<product>, for example /_release/ark-browser.");
  if (wanted) {
    const read = await readRelease({ name, ownerHex: resolved.owner, want: wanted });
    if (!read.ok) return renderStatus(read.reason, read.detail);
    return read.release.sealed ? renderTesterRelease(name, read.release) : renderRelease(name, read.release);
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
  if (schema === FOLDER_SITE_INDEX_SCHEMA) {
    const index = readIndexSite(decoded);
    if (!index.ok) return renderStatus(index.reason, index.detail);
    return renderFolderSite(index.site, createBlockReader({ site: index.site }));
  }

  const site = decodeSite(decoded);
  if (!site) return renderStatus("SCHEMA_UNSUPPORTED");
  if (!site.manifests.length) return renderStatus("CONTENT_MALFORMED", "The site archive lists no pages.");

  renderSite(site);
}

main().catch((error) => renderStatus("CONTENT_MALFORMED", error?.message || String(error)));
