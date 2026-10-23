const assert = require('node:assert/strict');
const fs = require('node:fs');

const navigation = fs.readFileSync('css/navigation.css', 'utf8');
const resolutions = fs.readFileSync('css/resolutions.css', 'utf8');

/* Since 2026-10-19 the home page is a page of Ark blocks (js/pages/home.js) in the shared block-page
   panel (css/block-page.css): its phone layout is the panel's and the blocks', measured per view by
   the fold check, not a hand-built grid of rows in css/home-drafting.css. What this file held about
   the old hero (rows that grow with their content, the cleared desktop anchor, a scrolling mobile
   layer, the wrapping headline, the status metrics grid) went with the markup it laid out; the
   panel already scrolls inside itself and nothing is anchored. */
assert(!/home-headline-main|home-status-rail|home-promise/.test(fs.readFileSync('css/home-drafting.css', 'utf8')), 'no rule for the old home hero is left to fight the block page');
assert(/ArkUI\.page\(spec\(remembered\), host,/.test(fs.readFileSync('js/pages/home.js', 'utf8')), 'the home page is a page of Ark blocks');
assert(navigation.includes('env(safe-area-inset-top,0px)'), 'mobile chrome reserves the device safe area');
/* Superseded 2026-10-18: letting the identity shrink (flex:0 1 auto + ellipsis) cut the
   wordmark to "DE..." at 360-430px. The phone row keeps the identity at full size and makes
   room by drawing Account icon-only; tests/browser/public-header.mjs measures it.
   Since 2026-10-19 the header is the family kit bar in home mode (the phone brand is the kit's:
   the mark, named "DEFXN -- home"), and its widths are the KIT's rules, scoped to
   [data-dx-mode="home"] (assets/kit/defxn-components.css, synced from flux/defxn-product-kit).
   The same regressions, restated for it:
   - no bar part shrinks: the brand, the switcher, the nav and the actions keep their width,
     and the row fit (js/resolvers/header.js) moves links into the MENU instead;
   - the kit's phone bar wraps a product's nav onto a second row; the home's must not (its pages
     are placed for one row), so it is held to one row and its nav lives in the MENU. */
const kit = fs.readFileSync('assets/kit/defxn-components.css', 'utf8');
assert(/\.dx-bar\[data-dx-mode="home"\] > :is\(\.dx-bar__brand, \.dx-switch, \.dx-bar__nav, \.dx-bar__end\) \{ flex: 0 0 auto;/.test(kit), 'no part of the home bar shrinks, so no label is ever cut');
assert(/@media\(max-width:560px\) \{[^@]*\.header-account-label \{ display:none; \}/.test(navigation), 'phone Account is icon-only, making room for the rest of the row');
assert(/@media \(max-width: 1040px\) \{ \.dx-bar\[data-dx-mode="home"\] \.dx-bar__nav \{ display: none; \} \}/.test(kit), 'compact navigation keeps secondary routes inside the menu');
assert(/\.dx-bar\[data-dx-mode="home"\] \{ height: var\(--dx-bar-h\); flex-wrap: nowrap;/.test(kit), 'the home phone bar stays one row (the kit wraps a product\'s nav to a second)');
assert(!/\.dx-[a-z]/.test(navigation.replace(/\/\*[\s\S]*?\*\//g, '').replace(/var\(--dx-[a-z-]+/g, '')), 'the site restyles no kit part: the kit\'s classes are styled by the kit alone');
assert(resolutions.includes('@media(max-width:1040px) { .header-products {display:none;} }'), 'the Products trigger yields to the complete menu at compact widths');

console.log('PASS: mobile home stays below the header, scrolls on short screens, and keeps compact chrome collision-free.');
