'use strict';
/* defxn.com is the family home of the DEFXN product kit (owner decision 2026-10-19). The kit
   ships it a classic script (assets/kit/defxn-product.js, window.DefxnKit) because this site
   opens on file:// and renders for crawlers through a jsdom pass (api/lib/render-core.mjs),
   where an ES-module-only shell would vanish. This test runs the synced script the way that
   pass does: no module loader, no layout, no matchMedia, no ResizeObserver.

   Named regressions it guards:
   - the shell depended on browser-only APIs and threw in the SSR pass;
   - home mode painted a product as "current" or set the products' data-dx-theme, which would
     fight this site's own five-family theme system (html[data-theme]);
   - the site's kit copy drifted from the kit (npm run check in flux/defxn-product-kit). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const script = fs.readFileSync('assets/kit/defxn-product.js', 'utf8');
const dom = new JSDOM('<!doctype html><html data-theme="clay"><head><title>Home</title></head><body><nav id="n"><a href="/how">How it works</a><a href="/stats">Stats</a></nav><main></main></body></html>', { runScripts: 'outside-only', url: 'http://127.0.0.1:3438/' });
const { window } = dom;
window.eval(script);
const kit = window.DefxnKit;
assert(kit && typeof kit.mountShell === 'function', 'the classic script defines window.DefxnKit.mountShell');
assert.equal(kit.HOME.id, 'home', 'the catalog carries the family home');
assert(kit.LANES.some((lane) => lane.id === 'defi' && lane.name === 'DeFi'), 'the seventh lane, DeFi, is in the catalog');

const account = window.document.createElement('button');
account.textContent = 'Account';
let clicked = 0;
account.addEventListener('click', () => { clicked += 1; });
const shell = kit.mountShell({ mode: 'home', nav: window.document.getElementById('n'), actions: [account, { label: 'Run DEFXN', href: '/download', tone: 'solid' }], brandSub: 'FXN CHAIN', menuAt: 'fit' });
const doc = window.document;
const bar = doc.querySelector('header.dx-bar');
assert(bar, 'the bar renders in the SSR pass');
assert.equal(bar.getAttribute('data-dx-mode'), 'home');
assert.equal(doc.documentElement.getAttribute('data-theme'), 'clay', 'home mode leaves the page palette alone');
assert.equal(doc.documentElement.getAttribute('data-dx-theme'), null, 'home mode sets no product theme attribute');
assert(!doc.querySelector('.dx-theme-toggle'), 'no product light/dark toggle on the family home');
assert(!doc.querySelector('.dx-product-link[aria-current]'), 'no product is current on the family home');
assert.equal(doc.querySelector('.dx-switch__home').getAttribute('aria-current'), 'page', 'the family-home row is the current page');
assert.equal(doc.querySelector('.dx-switch__name').textContent, 'Products');
assert.equal(doc.querySelector('.dx-bar__brand-sub').textContent, 'FXN CHAIN');
assert.equal(doc.querySelectorAll('.dx-bar__nav a').length, 2, 'the CMS nav links moved into the bar');
assert(!doc.getElementById('n'), 'the source nav element is removed, its links moved (not cloned)');
doc.querySelector('.dx-bar__actions button').click();
assert.equal(clicked, 1, 'a moved action keeps its listener');
assert(doc.querySelector('.dx-bar__actions a.dx-btn--solid'), 'a described action renders as the one solid header action');
assert.equal(bar.getAttribute('data-dx-menu'), 'open-row', 'with no layout (SSR) the row stays unfolded');
assert.equal(doc.querySelectorAll('.dx-lane').length, kit.LANES.length);
assert.equal(typeof shell.refit, 'function');

/* the synced copy is the kit's current build (the kit's own check compares bytes; this fails
   loudly here too if someone edits the site copy by hand) */
const kitDist = '../defxn-product-kit/dist/defxn-product.js';
if (fs.existsSync(kitDist)) assert.equal(fs.readFileSync(kitDist, 'utf8'), script, 'assets/kit/defxn-product.js is the kit build, byte for byte: run npm run sync in flux/defxn-product-kit');
console.log('PASS: the kit shell mounts on the family home in the SSR pass: classic script, no current product, page palette untouched, nav and actions moved with their listeners.');
