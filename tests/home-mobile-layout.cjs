const assert = require('node:assert/strict');
const fs = require('node:fs');

const navigation = fs.readFileSync('css/navigation.css', 'utf8');
const resolutions = fs.readFileSync('css/resolutions.css', 'utf8');

/* Since 2026-10-27 (owner-confirmed) the home page is the 3D world home (js/pages/home.js), laid out by
   css/world-pages.css. Before, it was a page of Ark blocks in the block-page panel; before that, a hand-built
   hero in css/home-drafting.css. The same promises, measured on the world home:
   - the page stands below the header: on a desktop it is placed 64px down (the bar's height), and on a
     tablet or phone it is a document with 72px of room above its first word;
   - a phone scrolls it: one column, overflow auto, and it takes pointer events (on a desktop the page lets
     the 3D behind it take them), so a short screen never cuts the rail off;
   - the heading wraps on a phone (the desktop keeps each row on one line) and drops to the hero size. */
assert(!/home-headline-main|home-status-rail|home-promise/.test(fs.readFileSync('css/home-drafting.css', 'utf8')), 'no rule for the old home hero is left to fight the world home');
assert(/ArkUI\.pageModules\.zero = \{/.test(fs.readFileSync('js/pages/home.js', 'utf8')) && /node\('section', 'world-page home-world'\)/.test(fs.readFileSync('js/pages/home.js', 'utf8')), 'the home page is the world home (.world-page.home-world)');
const world = fs.readFileSync('css/world-pages.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
assert(/\.world-page \{ position: absolute; inset: 64px 0 0 0;/.test(world), 'on a desktop the page starts under the 64px header');
const phone = (world.match(/@media \(max-width: 900px\) \{((?:[^{}]*\{[^{}]*\})*)[^{}]*\}/g) || []).find((block) => /\.home-world \{/.test(block)) || '';
assert(phone, 'the world home has a tablet and phone layout (max-width: 900px)');
const phoneHome = (/\.home-world \{([^}]*)\}/.exec(phone) || [])[1] || '';
for (const [rule, why] of [['position: relative', 'a document, not a layer over the world'], ['grid-template-columns: minmax(0, 1fr)', 'one column'], ['overflow: auto', 'it scrolls on short screens'], ['pointer-events: auto', 'it takes the touch that scrolls it']])
  assert(phoneHome.includes(rule), 'phone home: ' + why + ' (' + rule + ')');
const top = /padding-top: (\d+)px/.exec(phoneHome);
assert(top && +top[1] >= 64, 'phone home: its first word sits below the 64px header');
assert(/\.home-world h1 b, \.home-world h1 span \{ white-space: normal; \}/.test(phone), 'phone home: the heading wraps');
assert(/\.home-world h1 \{ font-size: var\(--fs-hero\); \}/.test(phone), 'phone home: the heading drops to the hero size');
assert(navigation.includes('env(safe-area-inset-top,0px)'), 'mobile chrome reserves the device safe area');
/* Superseded 2026-10-18: letting the identity shrink (flex:0 1 auto + ellipsis) cut the
   wordmark to "DE..." at 360-430px. The phone row keeps the identity at full size and makes
   room by drawing the visitor's control icon-only; tests/browser/public-header.mjs measures it.
   Since 2026-10-19 the header is the family kit bar in home mode (the phone brand is the kit's:
   the mark, named "DEFXN -- home"), and its widths are the KIT's rules, scoped to
   [data-dx-mode="home"] (assets/kit/defxn-components.css, synced from flux/defxn-product-kit).
   Since 2026-10-25 (owner-confirmed 2026-10-27) the brand and the switcher sit in one family
   landmark (.dx-bar__family), the nav is hidden by default and shown from 1040.02px, and Account is
   the "you" control (js/resolvers/header.js). The same regressions, restated for it:
   - no bar part shrinks: the family, the brand, the switcher, the nav and the end keep their width,
     and the row fit (js/resolvers/header.js) moves links into the "you" panel instead;
   - the kit's phone bar wraps a product's nav onto a second row; the home's must not (its pages
     are placed for one row), so it is held to one row and its nav lives in the panel;
   - on a phone the "you" control is its avatar (its words hide), making room for the rest of the row. */
const kit = fs.readFileSync('assets/kit/defxn-components.css', 'utf8');
assert(/\.dx-bar\[data-dx-mode="home"\] :is\(\.dx-bar__family, \.dx-bar__brand, \.dx-switch, \.dx-bar__nav, \.dx-bar__end\) \{ flex: 0 0 auto; min-width: auto; \}/.test(kit), 'no part of the home bar shrinks, so no label is ever cut');
assert(/\.dx-bar\[data-dx-mode="home"\] \.dx-bar__actions > \* \{ flex: 0 0 auto; \}/.test(kit), 'no action in the home bar shrinks either');
assert(/@media\(max-width:440px\) \{[^@]*\.header-you-words \{ display:none; \}/.test(navigation), 'phone: the "you" control is icon-only, making room for the rest of the row');
assert(/\.dx-bar\[data-dx-mode="home"\] \.dx-bar__nav \{ display: none;/.test(kit) && /@media \(min-width: 1040\.02px\) \{ \.dx-bar\[data-dx-mode="home"\] \.dx-bar__nav \{ display: grid; \} \}/.test(kit), 'compact navigation keeps secondary routes inside the panel (the nav shows only from 1040.02px)');
assert(/\.dx-bar\[data-dx-mode="home"\] \{ height: var\(--dx-bar-h\); flex-wrap: nowrap;/.test(kit), 'the home phone bar stays one row (the kit wraps a product\'s nav to a second)');
assert(resolutions.includes('@media(max-width:1040px) { .header-products {display:none;} }'), 'the Products trigger yields to the complete menu at compact widths');
/* Failing from 2026-10-25 to 2026-10-28: css/navigation.css restyled the kit's parts (.dx-switch__panel, .dx-bar__family,
   .dx-switch__trigger, .dx-foot, ...: "PRODUCTS: the kit's switcher, dressed like the you panel"). On 2026-10-28 (owner:
   option B) that dress moved into the kit's home mode (flux/defxn-product-kit src/product.css, [data-dx-mode="home"]), with
   the values the site showed then. The promise stands: the kit styles its classes, and this site styles only its own. */
assert(!/\.dx-[a-z]/.test(navigation.replace(/\/\*[\s\S]*?\*\//g, '').replace(/var\(--dx-[a-z-]+/g, '')), 'the site restyles no kit part: the kit\'s classes are styled by the kit alone');

console.log('PASS: the mobile world home stays below the header, scrolls as one column on short screens, and keeps compact chrome collision-free.');
