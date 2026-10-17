#!/usr/bin/env node
/* Local, no-deploy exercise of the exact render logic api/render.mjs uses
   for a bot request (api/lib/render-core.mjs), run against this repo's
   own file tree instead of a live Vercel deployment -- so the jsdom pass
   can be inspected and iterated on without a deploy cycle.

     node scripts/ssr-preview.mjs /about
     node scripts/ssr-preview.mjs /about --full     # print the rendered HTML too
     node scripts/ssr-preview.mjs /about --host https://defxn.com

   Prints the resolved title, meta description, canonical link, JSON-LD
   block and any render error for the given route. Never involves a real
   network request: render-core.mjs's createLocalResources() resolves
   every <script>/<link> fetch straight off disk. */
import { readIndexHtml, renderDocument, createLocalResources, SITE_ROOT } from './../api/lib/render-core.mjs';
import { pathToFileURL } from 'node:url';

function parseArgs(argv) {
  const args = { route: '/', full: false, host: 'https://defxn.com' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--full') args.full = true;
    else if (arg === '--host') args.host = argv[++i];
    else if (!arg.startsWith('--')) args.route = arg;
  }
  return args;
}

function summarize(html) {
  const title = /<title>([^<]*)<\/title>/.exec(html);
  const description = /<meta\s+name="description"\s+content="([^"]*)"/.exec(html);
  const canonical = /<link\s+rel="canonical"\s+href="([^"]*)"/.exec(html);
  const ld = /<script[^>]*data-ark-ld="1"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  return {
    title: title ? title[1] : null,
    description: description ? description[1] : null,
    canonical: canonical ? canonical[1] : null,
    jsonLd: ld ? ld[1].trim() : null,
  };
}

async function main() {
  const { route, full, host } = parseArgs(process.argv.slice(2));
  const html = await readIndexHtml(SITE_ROOT);
  const url = host.replace(/\/+$/, '') + route;
  console.log(`[ssr-preview] rendering ${url}`);
  const started = Date.now();
  try {
    const rendered = await renderDocument({
      html,
      url,
      resources: createLocalResources(SITE_ROOT),
      timeoutMs: 8000,
    });
    const elapsed = Date.now() - started;
    const summary = summarize(rendered);
    console.log(`[ssr-preview] OK in ${elapsed}ms`);
    console.log('title:      ', summary.title);
    console.log('description:', summary.description);
    console.log('canonical:  ', summary.canonical);
    console.log('json-ld:    ', summary.jsonLd);
    if (full) {
      console.log('--- full rendered HTML ---');
      console.log(rendered);
    }
  } catch (error) {
    const elapsed = Date.now() - started;
    console.error(`[ssr-preview] FAILED after ${elapsed}ms:`, error && error.stack || error);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
