const assert = require('node:assert/strict');
const fs = require('node:fs');

const home = fs.readFileSync('css/home-drafting.css', 'utf8');
const navigation = fs.readFileSync('css/navigation.css', 'utf8');
const resolutions = fs.readFileSync('css/resolutions.css', 'utf8');
const mobileStart = home.indexOf('@media(max-width:900px){');
const mobileEnd = home.indexOf('@media(prefers-reduced-motion:reduce)', mobileStart);
const mobile = home.slice(mobileStart, mobileEnd);

assert(mobileStart >= 0 && mobileEnd > mobileStart, 'the responsive home block exists');
assert(mobile.includes('grid-template-rows:auto auto auto'), 'mobile rows grow with their content');
assert(mobile.includes('align-content:start'), 'short screens pin content below the header');
assert(mobile.includes('position:relative !important;inset:auto !important'), 'the desktop hero anchor is cleared on tablets and phones');
assert(mobile.includes('overflow-y:auto'), 'over-height mobile content remains reachable');
assert(/home-headline-main\s*\{[^}]*white-space:normal/.test(mobile), 'the structured headline can wrap on narrow phones');
assert(!mobile.includes('grid-template-rows:minmax(0,1fr)'), 'mobile no longer centers the hero in a collapsing row');
assert(mobile.includes('grid-template-columns:repeat(4,minmax(0,1fr))'), 'tablet status metrics share one bounded row');
assert(home.includes('@media(max-width:640px)') && home.includes('grid-template-columns:repeat(2,minmax(0,1fr))'), 'phone status metrics use a readable two-column grid');
assert(mobile.includes('content:"PROTOCOL STATUS"'), 'the compact status panel has a clear section label');
assert(mobile.includes('home-lifecycle::before'), 'the compact lifecycle action retains a deliberate accent rail');
assert(navigation.includes('env(safe-area-inset-top,0px)'), 'mobile chrome reserves the device safe area');
assert(navigation.includes('.ark-studio-identity{min-width:0;flex:0 1 auto'), 'mobile identity can shrink instead of colliding with controls');
assert(navigation.includes('@media(max-width:1040px)'), 'navigation enters its compact layout before labels can wrap');
assert(navigation.includes('.header-core-links > a:not(.header-account-link) {display:none;}'), 'compact navigation keeps secondary routes inside the menu');
assert(resolutions.includes('@media(max-width:1040px) { .header-products {display:none;} }'), 'the Products trigger yields to the complete menu at compact widths');

console.log('PASS: mobile home stays below the header, scrolls on short screens, and keeps compact chrome collision-free.');
