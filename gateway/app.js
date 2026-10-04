/* *.defxn.com gateway shell.
   Served same-origin by Caddy on every `<label>.defxn.com` hostname (see
   ark-miner-cli/ops/caddy/defxn-wildcard.caddy). No build step, matching this
   project's own convention (see ../scripts/serve-site.mjs).

   Flow: location.hostname -> "<label>.fxn" -> POST /explorer/v1/query (names
   source, same-origin, proxied to the local miner's :8766 by Caddy) -> an
   ipfs_cid target -> GET /explorer/v1/content/<cid> (same-origin) -> decode
   with flx-codec's decodeArchiveAsync (vendored at ./vendor/flx-codec/, see
   that directory's VENDORED-FROM.txt) -> render.

   This renders ONE plain, minimal default template for whatever "flux-chain-
   site/1" archive resolves — it is deliberately not styled like defxn.com's
   own marketing site (the owner's prior decision: the gateway's default
   rendering is a legible fallback, not a second brand).

   Failure taxonomy loosely modeled on CMS-ARK's ArkOverlayFailureReason
   (/Volumes/PortableSSD/deark/CMS-ARK/src/lib/mesh/overlay.ts) -- same idea
   (name a few distinct reasons an honest "nothing here" page can mean, never
   a blank page or a bare 404), reused rather than copied because that file's
   failure set is for a different content shape (dense-encoding-v4 CMS posts)
   entirely. This shell verifies the name record's Ed25519 signature
   client-side (verify-name-record.js, a browser-safe port of bundle-deploy's
   validators) before trusting anything it points at -- closed 2026-10-04.
   The explorer API is read-only infrastructure, not a trust authority:
   without this check a misbehaving node could point a name at arbitrary
   content and this shell would render it. */
import { decodeArchiveAsync } from "./vendor/flx-codec/index.js";
import { verifyNameRecord } from "./verify-name-record.js";

const SITE_SCHEMA = "flux-chain-site/1";

const FAILURE_MESSAGES = {
  NAME_NOT_FOUND: "This address has nothing published on it.",
  NAME_UNRESOLVABLE: "Could not reach the mesh to resolve this address.",
  SIGNATURE_INVALID: "This address's record exists but its signature does not verify. Refusing to render it.",
  CONTENT_UNREACHABLE: "This site's content is not reachable right now.",
  CONTENT_TOO_LARGE: "This site's content is larger than the public gateway will serve.",
  CONTENT_MALFORMED: "This site's content could not be read as a mesh site archive.",
  SCHEMA_UNSUPPORTED: "This mesh name does not point at a site this gateway knows how to render.",
};

const app = document.getElementById("app");

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
  const wrap = document.createElement("div");
  wrap.className = "status-page";
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
  let response;
  try {
    response = await fetch("/explorer/v1/query", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sourceId: "names", scope: { name } }),
    });
  } catch (error) {
    return { ok: false, reason: "NAME_UNRESOLVABLE", detail: error.message };
  }
  if (!response.ok) {
    return { ok: false, reason: "NAME_UNRESOLVABLE", detail: `Explorer API returned ${response.status}.` };
  }
  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    return { ok: false, reason: "NAME_UNRESOLVABLE", detail: "Malformed Explorer API response." };
  }
  // See ask-server.mjs's matching comment: the live Explorer API nests the
  // real name record at records[0].fields.sourceRecord, not records[0].record
  // (ark-gateway's name-sources.ts documents the latter, but that is stale
  // relative to what this fleet actually runs -- verified live 2026-10-03).
  const record = payload?.data?.records?.[0]?.fields?.sourceRecord;
  if (!record) return { ok: false, reason: "NAME_NOT_FOUND" };
  let verified;
  try {
    verified = await verifyNameRecord(record);
  } catch (error) {
    return { ok: false, reason: "SIGNATURE_INVALID", detail: error.message };
  }
  if (!verified) return { ok: false, reason: "SIGNATURE_INVALID" };
  if (verified.name !== name) return { ok: false, reason: "SIGNATURE_INVALID", detail: `Record is signed for ${verified.name}, not ${name}.` };
  return { ok: true, record: verified };
}

async function fetchContent(cid) {
  let response;
  try {
    response = await fetch(`/explorer/v1/content/${encodeURIComponent(cid)}`);
  } catch (error) {
    return { ok: false, reason: "CONTENT_UNREACHABLE", detail: error.message };
  }
  if (response.status === 404) return { ok: false, reason: "CONTENT_UNREACHABLE", detail: "Not marked public, or not pinned by this node." };
  if (response.status === 413) return { ok: false, reason: "CONTENT_TOO_LARGE" };
  if (!response.ok) return { ok: false, reason: "CONTENT_UNREACHABLE", detail: `Explorer API returned ${response.status}.` };
  let bytes;
  try {
    bytes = new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    return { ok: false, reason: "CONTENT_UNREACHABLE", detail: error.message };
  }
  return { ok: true, bytes };
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

  function manifestForPath(path) {
    return (
      site.manifests.find((m) => m.route === path) ||
      site.manifests.find((m) => m.route === "/") ||
      site.manifests[0] ||
      null
    );
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
        main.innerHTML = "";
        const h1 = document.createElement("h1");
        h1.textContent = "Article not found";
        main.appendChild(h1);
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
        const h1 = document.createElement("h1");
        h1.textContent = "Page not found";
        main.appendChild(h1);
      } else {
        const h1 = document.createElement("h1");
        h1.textContent = manifest.title || manifest.id;
        main.appendChild(h1);
        for (const [role, field] of fieldEntries(manifest.fields)) {
          const label = document.createElement("div");
          label.className = "field-label";
          label.textContent = field.label || role;
          main.appendChild(label);
          const value = document.createElement("div");
          value.className = "field-value";
          value.textContent = field.value ?? "";
          main.appendChild(value);
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

async function main() {
  const label = labelFromHostname(location.hostname);
  const name = `${label}.fxn`;

  const resolved = await resolveName(name);
  if (!resolved.ok) return renderStatus(resolved.reason, resolved.detail);

  const target = (resolved.record.targets || []).find((t) => t.type === "ipfs_cid");
  if (!target) return renderStatus("NAME_NOT_FOUND", "This name has no published content target.");

  const content = await fetchContent(target.value);
  if (!content.ok) return renderStatus(content.reason, content.detail);

  let decoded;
  try {
    decoded = await decodeArchiveAsync(content.bytes);
  } catch (error) {
    return renderStatus("CONTENT_MALFORMED", error.message);
  }

  const site = decodeSite(decoded);
  if (!site) return renderStatus("SCHEMA_UNSUPPORTED");
  if (!site.manifests.length) return renderStatus("CONTENT_MALFORMED", "The site archive lists no pages.");

  renderSite(site);
}

main().catch((error) => renderStatus("CONTENT_MALFORMED", error?.message || String(error)));
