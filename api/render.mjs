/* Vercel Node serverless function: true dynamic SSR, bots only.

   Every request this function sees (per vercel.json's rewrite, which
   sends non-asset HTML navigation requests here) is checked against
   api/lib/bot-detect.mjs. A human visitor gets the existing, fast CSR
   page -- index.html, read from disk and returned unmodified, jsdom never
   even constructed. A known crawler gets a real jsdom pass over the same
   index.html (api/lib/render-core.mjs), so it sees the real per-route
   <title>/meta/JSON-LD that js/ark/page-router.js's applyRouteMetadata()
   would otherwise only ever write into a live browser's DOM.

   Fail-open, unconditionally: a timeout, a thrown page error, or anything
   else that goes wrong while rendering for a bot falls back to returning
   the same plain static index.html a human would get. A crawler must
   never see a 500 or a half-rendered page -- the worst case is simply
   "no SSR benefit this time", not an error. */
import { readIndexHtml, renderDocument } from './lib/render-core.mjs';
import { isBotUserAgent } from './lib/bot-detect.mjs';

const RENDER_TIMEOUT_MS = 4500;

function requestUrl(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}${req.url}`;
}

export default async function handler(req, res) {
  let html;
  try {
    html = await readIndexHtml();
  } catch (error) {
    console.error('[ssr] could not read index.html:', error);
    res.statusCode = 500;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end('Server error');
    return;
  }

  const userAgent = req.headers['user-agent'] || '';
  if (!isBotUserAgent(userAgent)) {
    res.statusCode = 200;
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(html);
    return;
  }

  try {
    const rendered = await renderDocument({
      html,
      url: requestUrl(req),
      resources: 'usable', // real fetch of this same deployment's own static assets
      timeoutMs: RENDER_TIMEOUT_MS,
    });
    res.statusCode = 200;
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end('<!DOCTYPE html>\n' + rendered);
  } catch (error) {
    // Fail open: log server-side, serve the plain static page, never a 500
    // and never a half-rendered page to a crawler.
    console.error('[ssr] render failed, serving static index.html instead:', error);
    res.statusCode = 200;
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(html);
  }
}
