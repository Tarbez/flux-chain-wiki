/* Which `User-Agent` strings get the jsdom-rendered page instead of the fast,
   unchanged CSR passthrough. Three groups, kept separate so each can be
   re-justified on its own if the list ever needs to change:

     AI_BOTS       the exact names js/content/seo.js's own AI_BOTS constant
                    already enumerates for robots.txt -- same crawlers, same
                    spelling, so the two lists can never silently drift apart.
     SEARCH_BOTS    traditional search-engine crawlers that index pages for
                    regular search results.
     SOCIAL_BOTS    link-preview fetchers used by chat apps and social
                    platforms when a DEFXN link is pasted or shared.

   This module only classifies a User-Agent string; it has no opinion on
   what happens next (that split -- full jsdom render vs. plain passthrough
   -- lives in api/lib/render-core.mjs). */

// Keep this list's names identical to js/content/seo.js's AI_BOTS (first
// element of each pair there). Order and casing match that file.
const AI_BOTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
  'PerplexityBot', 'Google-Extended', 'Applebot-Extended',
  'CCBot', 'Bytespider', 'meta-externalagent',
];

const SEARCH_BOTS = ['Googlebot', 'Bingbot', 'DuckDuckBot', 'Baiduspider', 'YandexBot'];

const SOCIAL_BOTS = [
  'facebookexternalhit', 'Twitterbot', 'LinkedInBot', 'Slackbot', 'Discordbot', 'WhatsApp',
];

export const BOT_NAMES = [...AI_BOTS, ...SEARCH_BOTS, ...SOCIAL_BOTS];

// Escape each name for safe use inside a RegExp (none of the current names
// need it, but a future addition might).
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const BOT_PATTERN = new RegExp(BOT_NAMES.map(escapeRegExp).join('|'), 'i');

/* Tests a `User-Agent` header value against the known bot list. A missing
   or empty header is never treated as a bot -- an absent UA gets the fast
   human path, not the expensive jsdom one. */
export function isBotUserAgent(userAgent) {
  if (!userAgent || typeof userAgent !== 'string') return false;
  return BOT_PATTERN.test(userAgent);
}
