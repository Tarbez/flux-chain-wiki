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

/* The way this site mounts it (js/resolvers/header.js): ON the CMS header resolver's own
   element (options.bar), which already holds the all-pages menu. Named regressions:
   - home mode added .dx-page to <body>, whose base rules (link colour, p margins, 14px body
     type) would restyle every page of this site;
   - home mode rewrote document.title, which this site's SEO data owns per route;
   - the switcher's Escape also reached this site's own Escape ("back to the previous page"),
     so closing the panel on an inner page navigated home. */
{
  const dom2 = new JSDOM('<!doctype html><html data-theme="moss"><head><title>About — DEFXN site</title></head><body><main><header id="h"><nav id="primary-navigation"><a href="/x">X</a></nav></header></main></body></html>', { runScripts: 'outside-only', url: 'http://127.0.0.1:3438/about' });
  dom2.window.eval(script);
  const d = dom2.window.document;
  const host = d.getElementById('h');
  const nav = d.createElement('nav'); nav.innerHTML = '<a href="/about">Overview</a>';
  const shell2 = dom2.window.DefxnKit.mountShell({ mode: 'home', bar: host, nav, actions: [d.createElement('button')], brandSub: 'FXN CHAIN' });
  assert.equal(shell2.bar, host, 'the existing element became the bar');
  assert.equal(d.querySelectorAll('header').length, 1, 'no second header was created');
  assert(host.classList.contains('dx-bar') && host.getAttribute('data-dx-mode') === 'home');
  assert.equal(host.firstElementChild.className, 'dx-bar__brand', 'the bar parts come first');
  assert.equal(host.lastElementChild.id, 'primary-navigation', 'the children it already held stay, after the parts');
  assert(!d.body.classList.contains('dx-page'), 'home mode leaves this site\'s page base alone (no .dx-page on body)');
  assert.equal(d.title, 'About — DEFXN site', 'home mode leaves the title to this site\'s SEO data');
  const trigger = d.querySelector('.dx-switch__trigger');
  trigger.click();
  const open = new dom2.window.KeyboardEvent('keydown', { key: 'Escape', cancelable: true, bubbles: true });
  d.dispatchEvent(open);
  assert(open.defaultPrevented, 'Escape that closes the open switcher is consumed');
  assert(d.querySelector('.dx-switch__panel').hidden, 'and the panel closed');
  const idle = new dom2.window.KeyboardEvent('keydown', { key: 'Escape', cancelable: true, bubbles: true });
  d.dispatchEvent(idle);
  assert(!idle.defaultPrevented, 'with the panel closed, Escape is left to the page');

  /* the family footer with this site's section links and its credit (js/hero-motion.js) */
  const footHost = d.createElement('div'); d.body.append(footHost);
  const link = d.createElement('a'); link.href = '/experiments'; link.textContent = 'Interactive model';
  let followed = 0; link.addEventListener('click', (e) => { e.preventDefault(); followed += 1; });
  const back = d.createElement('button'); back.textContent = 'Back home';
  const foot = dom2.window.DefxnKit.renderFooter(footHost, dom2.window.DefxnKit.HOME.id, { links: [link, { label: 'Notes', href: '/learnings' }], note: ['Powered, deployed and made by FLX', back] });
  assert.equal(foot.tagName, 'FOOTER');
  const row = foot.querySelector('nav.dx-foot__links');
  assert(row && row.getAttribute('aria-label') === 'Site sections', 'the section links are one named row');
  assert.equal(row.firstChild, link, 'a link the page built is moved, not cloned');
  row.firstChild.click();
  assert.equal(followed, 1, 'and keeps its listener');
  assert.equal(row.querySelectorAll('a').length, 2);
  assert.equal(foot.querySelector('.dx-foot__end').lastChild, back, 'a page control can close the row');
  assert(/family home/.test(foot.querySelector('.dx-foot__name').textContent));
  assert.equal(foot.getAttribute('data-dx-mode'), 'home', 'the home footer is the kit\'s one-row home variant');
  assert(!foot.querySelector('.dx-foot__end a'), 'the home names no address in its own footer (it is that site)');

  /* "Open <Product>": the overlap pages' one handoff pattern (ArkUI.dash.productHandoff in
     js/ark/dash-kit.js delegates here). The product's name, lane and address are its own
     declaration; a product with no address from here says so instead of a dead link. */
  const kit2 = dom2.window.DefxnKit;
  const onward = kit2.productHandoff('explore', { text: 'Every launched resolver is in Explore.' });
  assert.equal(onward.tagName, 'ASIDE');
  assert(onward.classList.contains('dx-onward'));
  const openLink = onward.querySelector('a.dx-onward__link');
  assert(openLink && /^Open Explore/.test(openLink.textContent), 'one "Open Explore" link');
  assert.equal(openLink.getAttribute('href'), kit2.productHref(kit2.productById('explore')), 'its address is the product\'s own (loopback here)');
  assert(/Network/.test(onward.querySelector('.dx-onward__lane').textContent), 'it names the product\'s lane');
  const domains = kit2.productLink('domains', { query: { q: 'radio.fxn' }, label: 'Check in Domains' });
  assert.equal(new dom2.window.URL(domains.href).searchParams.get('q'), 'radio.fxn', 'Domains opens on the name');
  const local = kit2.PRODUCTS.find((p) => !p.site && !p.local);
  if (local) assert(kit2.productHandoff(local.id, { text: 'x' }).classList.contains('dx-onward--local'));
  assert.equal(kit2.productHandoff('no-such-product', { text: 'x' }), null);
}

/* the synced copy is the kit's current build (the kit's own check compares bytes; this fails
   loudly here too if someone edits the site copy by hand) */
const kitDist = '../defxn-product-kit/dist/defxn-product.js';
if (fs.existsSync(kitDist)) assert.equal(fs.readFileSync(kitDist, 'utf8'), script, 'assets/kit/defxn-product.js is the kit build, byte for byte: run npm run sync in flux/defxn-product-kit');
console.log('PASS: the kit shell mounts on the family home in the SSR pass: classic script, no current product, page palette, base and titles untouched, mounted on the CMS header with its menu kept, Escape consumed only by an open panel, the family footer carries the section links with their listeners, and the overlap pages\' "Open <Product>" handoff reads each product\'s own address.');
