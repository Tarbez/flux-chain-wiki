/* Keyboard and screen-reader chrome every route shares.

   Named regressions (2026-10-19, docs/ux-audit/pages-ux-a.md cross-page 3 and 7,
   pages-ux-b.md cross-page 6 and 10, pages.md P10):
   - No skip link: a keyboard user tabbed through ~10 header controls on every route first.
   - The clipped #fallback block was aria-hidden but not inert, so Tab landed on its invisible
     "Read the source / What is a resolver? / Read the protocol overview" links -- and those
     pointed at raw docs/*.md files instead of the site's own pages.
   - Unstyled controls rendered in the browser default Arial 13.33px: a fourth typeface.
   - A tabindex'd tabpanel (the resolutions panel, 21 routes) took focus with no visible ring.
   - The bar rows on /stats/gpu and /stats/ledger were Tab stops that did nothing.
   The rendered half (real Tab presses) is tests/browser/site-fixes.mjs. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = (f) => fs.readFileSync(f, 'utf8');

const html = read('index.html');
const body = html.slice(html.indexOf('<body>'));
const skipAt = body.indexOf('class="skip"'), mainAt = body.indexOf('<main');
assert(skipAt > 0 && skipAt < mainAt, 'a skip link is the first thing in the body, before the scene');
assert(/addEventListener\('click', function \(event\) \{\s*var active = router\.active && pages\[router\.active\];[\s\S]{0,120}active\.focus/.test(read('js/hero-motion.js')), 'it moves focus to the routed page, past the header');
assert(!/navigate\('lab'\)/.test(read('js/hero-motion.js')), 'the old skip handler that opened the lab is gone');

const fallback = html.slice(html.indexOf('<section id="fallback"'), html.indexOf('</section>', html.indexOf('<section id="fallback"')));
assert(!/href="docs\//.test(fallback), 'the fallback links the site\'s own pages, not raw docs/*.md');
for (const route of ['/download', '/what-is-a-resolver', '/about']) assert(fallback.includes(`href="${route}"`), 'fallback links ' + route);
assert(/fallback\.setAttribute\('aria-hidden', 'true'\); fallback\.inert = true;/.test(read('js/main.js')), 'once the scene is up the fallback is inert, so its links are not Tab stops');

{
  const layout = read('css/page-layout.css');
  assert(/:where\(body\) \{ font-family:var\(--font-sans/.test(layout), 'the body sets the sans slot (it computed to Times)');
  assert(/:where\(button, input, select, textarea\) \{ font:inherit; \}/.test(layout), 'controls inherit the page font (no Arial)');
}
const focus = read('css/focus.css');
assert(/#scene \[tabindex\]:not\(a,button,input,select,textarea,\[tabindex="-1"\]\):focus-visible \{ outline:2px solid/.test(focus), 'a focusable panel shows a ring');
assert(/#scene :is\(button,\[role="tab"\],summary\):focus-visible \{ outline:2px solid/.test(focus), 'custom controls show a ring');

for (const file of ['js/pages/stats-gpu.js', 'js/pages/stats-ledger.js']) {
  const src = read(file);
  assert(!/stats-bar-row" tabindex="0"/.test(src), file + ': bar rows are not Tab stops');
  assert(src.includes('<small class="stats-bar-detail">'), file + ': the tooltip\'s detail is visible text, so nothing is lost');
}

console.log('PASS: skip link, inert fallback with site links, inherited control font, visible focus rings, no dead Tab stops.');
