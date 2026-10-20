'use strict';
/* The public header's floating panels (the network pill, the Resolutions menu) run on Ark's popover
   block, loaded on the first press -- not on open/close, Escape and focus code of the header's own.

   Why each case exists (docs/ux-audit/ledger.md S12, docs/cms-architecture.md Budget):
   - The core kit has about 10 B of headroom on live routes, so the 3.2 KB popover chunk cannot ride
     on every route: "nothing is loaded until a press" is asserted on the real kit, and the chunk is
     asserted to be absent from index.html and from the block scripts every route shares.
   - header.js ships on every route and the core kit has about 10 B of headroom, so the stub is held to
     +0.3 KB gz over the 11,611 B it weighed before the popovers (a 13,487 B first draft with the swap
     helpers inline was refused); the swap and the kit/chunk loading live in js/resolvers/header-popover.js,
     which only a press loads. Site code stays out of Ark's vendor chunk.
   - The block must take the button's place WITHOUT losing what the bar and the site paint on it
     (classes, children, id, title, aria-label); a swap that rebuilt the button would drop the live
     network label and the kit's styling, and nothing but a pixel check would notice.
   - Escape, an outside press, one-open-at-a-time and focus returning to the button are Ark's, so
     they are asserted on the real block rather than assumed from its documentation.
   - A press made while the chunk is still loading is a toggle like any other (two presses = closed),
     because the first draft opened the panel after the second press had asked for it closed.
   - A chunk that cannot load must not take the menu with it: the plain panel still opens, and the
     console names the failure, the missing file and the remedy (a bare "failed" is a status).
   - The header holds no Escape/outside-click handler of its own any more: asserted on the source so
     a "just add a keydown here" fix cannot quietly come back beside Ark's.
   Runs the real helpers (cut from js/resolvers/header.js) in jsdom with the real public kit and the
   real chunk files; the browser driver (tests/browser/public-header.mjs) covers layout and the
   whole header on a real page. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync('js/resolvers/header.js', 'utf8');
const start = source.indexOf('function lazyHeaderPopover');
const end = source.indexOf('/* Network switcher, site-wide');
assert(start >= 0 && end > start, 'js/resolvers/header.js still defines the popover stub before the network switcher');
const stub = source.slice(start, end);
const CHUNK = 'js/ark/vendor/ark-kit-popover.js', HELPER = 'js/resolvers/header-popover.js';

const tick = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));

/* A window with the real public kit (and engines) and an ArkUI.loadScript that evaluates the real
   chunk file, recording what was asked for. `loadScript` may be replaced to defer or refuse. */
function boot(options = {}) {
  const dom = new JSDOM('<body><header class="ark-header"></header></body>', { runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  for (const file of ['js/ark/vendor/engines.js', options.kit || 'js/ark/vendor/ark-kit-public.js']) w.eval(fs.readFileSync(file, 'utf8'));
  const calls = [], loaded = new Map();
  /* like the page loader's: one script by its site path, once */
  const real = (url) => { w.eval(fs.readFileSync(url, 'utf8')); return Promise.resolve(); };
  w.ArkUI = {
    blockScripts: [],
    loadScript: (url) => {
      if (!loaded.has(url)) { calls.push(url); loaded.set(url, (options.loadScript || real)(url, w)); }
      return loaded.get(url);
    }
  };
  const errors = [];
  w.console.error = (...args) => errors.push(args.join(' '));
  w.eval(stub);
  return { w, doc: w.document, calls, errors };
}

/* The plain control the bar paints: a button with a class, an icon and label child, an id and a name. */
function plainControl(env, id, label) {
  const { doc } = env;
  const wrap = doc.createElement('div');
  wrap.className = 'header-products'; wrap.dataset.headerItem = 'resolutions';
  const before = doc.createElement('a'), after = doc.createElement('a');
  const trigger = doc.createElement('button');
  trigger.setAttribute('data-ark-layout-key', 'id:' + id); trigger.setAttribute('style', 'rotate: 5deg');
  trigger.type = 'button'; trigger.id = id; trigger.className = 'header-products-toggle dx-has-icon';
  trigger.title = 'Title of ' + label; trigger.setAttribute('aria-label', 'Label of ' + label);
  trigger.setAttribute('aria-expanded', 'false');
  const icon = doc.createElement('span'); icon.className = 'native-icon';
  const text = doc.createElement('span'); text.className = 'label'; text.textContent = label;
  trigger.append(icon, text);
  const fallback = doc.createElement('div'); fallback.hidden = true; fallback.id = id + '-panel';
  const link = doc.createElement('a'); link.href = '/x'; link.textContent = 'A page'; fallback.appendChild(link);
  wrap.append(trigger, fallback);
  doc.querySelector('header').append(before, wrap, after);
  return { wrap, trigger, fallback, icon, text, link, before, after };
}
function lazy(env, id, label, align) {
  const parts = plainControl(env, id, label);
  let trigger = parts.trigger, wrap = parts.wrap, adopted = null;
  const pop = env.w.lazyHeaderPopover({
    wrap, trigger, fallback: parts.fallback, label, align, id: id + '-popover', content: [parts.link],
    done(made) { wrap = made.root; trigger = made.trigger; adopted = made; }
  });
  return { ...parts, pop, now: () => trigger, adopted: () => adopted };
}
const isOpen = (c) => c.adopted().root.getAttribute('data-state') === 'open';
const key = (w, el, k) => { const e = new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }); el.dispatchEvent(e); return e; };

const index0 = fs.readFileSync('index.html', 'utf8');

(async () => {
  /* ---- 1. nothing is paid for until a press ---- */
  {
    const env = boot();
    assert.equal(typeof env.w.ArkKit.ARK_BLOCKS.popover, 'undefined', 'the public kit alone has no popover block (that is why it is a chunk)');
    const a = lazy(env, 'products-trigger', 'Resolutions');
    assert.deepEqual(env.calls, [], 'building the control loads nothing: every route would pay the chunk otherwise');
    assert.equal(a.adopted(), null);
    assert.equal(a.trigger.isConnected, true, 'the bar paints from the plain button');
  }

  /* ---- 2. the first press loads the chunk once and the block takes the button's place intact ---- */
  {
    const env = boot(), { w, doc } = env;
    const a = lazy(env, 'products-trigger', 'Resolutions');
    a.trigger.focus();
    a.trigger.click();
    await tick();
    assert.deepEqual(env.calls, [HELPER, CHUNK], 'one press loads the swap helper and Ark\'s popover chunk, once, and nothing else (the kit is already on the page)');
    const p = a.adopted();
    assert(p, 'the block was rendered');
    assert.equal(a.trigger.isConnected, false, 'the plain button left the page');
    assert.equal(a.trigger.id, '', 'and is not left holding the id');
    assert.equal(p.trigger.id, 'products-trigger', 'the id the row fit, tests and aria references use moved to the block button');
    assert(p.trigger.classList.contains('header-products-toggle') && p.trigger.classList.contains('dx-has-icon'), "the bar's classes moved");
    assert(!p.trigger.classList.contains('ark-btn'), "Ark's button look is not painted over the bar's own");
    assert(p.trigger.contains(a.icon) && p.trigger.contains(a.text), 'the very same children moved (an icon or live label hung on them survives)');
    assert.equal(p.trigger.title, 'Title of Resolutions'); assert.equal(p.trigger.getAttribute('aria-label'), 'Label of Resolutions');
    assert.equal(p.trigger.getAttribute('data-ark-layout-key'), 'id:products-trigger', 'the layout key the editor stamped moved with it');
    assert.equal(p.trigger.getAttribute('style'), 'rotate: 5deg', 'and so did a CMS style on it');
    assert.equal(p.trigger.getAttribute('type'), 'button');
    /* the block's root takes the wrapper's place: same tag, same classes, same neighbours */
    assert.equal(a.wrap.isConnected, false, 'the plain wrapper left the page');
    assert.equal(p.root.tagName, 'DIV'); assert(p.root.classList.contains('header-products'), "the wrapper's class moved (the row fit and the kit's nav style find it)");
    assert.equal(p.root.dataset.headerItem, 'resolutions', "and its data-header-item, which the row fit collapses by");
    assert(!p.root.classList.contains('ark-block'), 'it is not an Ark block of the page: the header keeps its own fonts and display');
    assert(p.root.previousElementSibling === a.before && p.root.nextElementSibling === a.after, 'it sits where the wrapper sat (structural layout keys of its neighbours do not move)');
    assert.equal(p.panel.id, 'products-trigger-popover'); assert(p.panel.classList.contains('products-trigger-popover')); assert.equal(p.trigger.getAttribute('aria-controls'), p.panel.id, 'the button names the panel');
    assert(p.panel.classList.contains('ark-popover__panel'), "the site's class joined Ark's (Ark places it)");
    assert.equal(a.fallback.isConnected, false, 'the plain panel left the page');
    assert(p.panel.contains(a.link), "the menu's own content is in Ark's panel");
    assert.equal(p.panel.querySelectorAll('.ark-popover__p').length, 0, "the block's stand-in sentence is gone");
    assert.equal(p.root.getAttribute('data-state'), 'open', 'the press that loaded it also opened it');
    assert.equal(p.trigger.getAttribute('aria-expanded'), 'true');
    assert.equal(p.panel.hidden, false);
    assert(p.panel.contains(doc.activeElement), "focus moved into the panel (Ark's focus scope)");
    assert.equal(p.root.getAttribute('data-group'), 'header');

    /* ---- 3. Escape: closes, is marked handled, and focus returns to the button ---- */
    const escape = key(w, doc.activeElement, 'Escape');
    assert.equal(escape.defaultPrevented, true, 'Escape is consumed, so the page-wide Escape (back to Home) does not also act on it');
    assert.equal(isOpen(a), false, 'Escape closes the panel');
    assert.equal(p.panel.hidden, true);
    assert.equal(doc.activeElement, p.trigger, 'and focus returns to the button');
    assert.equal(key(w, doc.body, 'Escape').defaultPrevented, false, 'a closed panel leaves Escape alone');

    /* ---- 4. a second press toggles; want() is the one way the header opens and closes it ---- */
    p.trigger.click(); await tick();
    assert.equal(isOpen(a), true);
    p.trigger.click(); await tick();
    assert.equal(isOpen(a), false, 'pressing the button again closes it');
    a.pop.want(true); await tick();
    assert.equal(isOpen(a), true, 'want(true) opens through the block, not around it');
    a.pop.want(false); await tick();
    assert.equal(isOpen(a), false, 'want(false) closes through Ark\'s own event');
    assert(a.adopted());

    /* ---- 5. an outside press and focus leaving dismiss it ---- */
    a.pop.want(true); await tick();
    doc.body.dispatchEvent(new w.Event('pointerdown', { bubbles: true })); doc.body.dispatchEvent(new w.Event('pointerup', { bubbles: true }));
    assert.equal(isOpen(a), false, 'a press outside closes it');
    a.pop.want(true); await tick();
    const other = doc.createElement('button'); doc.body.appendChild(other); other.focus();
    assert.equal(isOpen(a), false, 'focus moving outside closes it');
  }

  /* ---- 6. one panel of the header at a time ---- */
  {
    const env = boot();
    const a = lazy(env, 'products-trigger', 'Resolutions'), b = lazy(env, 'header-chain-trigger', 'Network', 'end');
    a.trigger.click(); await tick();
    assert.equal(isOpen(a), true);
    b.trigger.click(); await tick();
    assert.deepEqual(env.calls, [HELPER, CHUNK], 'the second panel loads nothing again');
    assert.equal(isOpen(b), true, 'the network pill opened');
    assert.equal(isOpen(a), false, 'and the Resolutions menu closed: one panel of the header is open at a time');
    a.now().click(); await tick();
    assert.equal(isOpen(a), true); assert.equal(isOpen(b), false, 'the other way round as well');
  }

  /* ---- 7. presses while the chunk is loading are toggles ---- */
  {
    /* the two scripts arrive one after the other, by hand */
    const queue = [];
    const deferred = { loadScript: (url, w) => new Promise((resolve) => queue.push(() => { w.eval(fs.readFileSync(url, 'utf8')); resolve(); })) };
    const release = async () => { for (let i = 0; i < 4; i++) { await tick(5); while (queue.length) queue.shift()(); } await tick(); };
    const env = boot(deferred);
    const a = lazy(env, 'products-trigger', 'Resolutions');
    a.trigger.click();
    a.trigger.click();
    await release();
    assert(a.adopted(), 'the block arrived');
    assert.equal(isOpen(a), false, 'two presses before it arrived end closed, not open');
    /* hover-intent that is withdrawn before the chunk arrives opens nothing */
    const env2 = boot(deferred);
    const b = lazy(env2, 'products-trigger', 'Resolutions');
    b.pop.want(true, true); b.pop.want(false);
    await release();
    assert.equal(isOpen(b), false, 'a mouse that left before the chunk arrived opens nothing');
    /* and one that is still resting when it arrives opens it */
    const env3 = boot(deferred);
    const c = lazy(env3, 'products-trigger', 'Resolutions');
    c.pop.want(true, true);
    await release();
    assert.equal(isOpen(c), true, 'a mouse still resting when the chunk arrives opens it');
  }

  /* ---- 8. a chunk that cannot load leaves a working, plain menu and a refusal that names the remedy ---- */
  {
    const env = boot({ loadScript: () => Promise.reject(new Error('Could not load ' + CHUNK)) });
    const a = lazy(env, 'products-trigger', 'Resolutions');
    a.trigger.click(); await tick();
    assert.equal(env.errors.length, 1, 'one console error');
    assert(/popover/.test(env.errors[0]) && env.errors[0].includes(CHUNK) && /Needs:/.test(env.errors[0]) && /Remedy:/.test(env.errors[0]), 'it names the failure, the file it needs and the remedy: ' + env.errors[0]);
    assert.equal(a.fallback.hidden, false, 'the already-built panel opens');
    assert.equal(a.trigger.getAttribute('aria-expanded'), 'true');
    a.trigger.click();
    assert.equal(a.fallback.hidden, true, 'and closes by the same button');
    assert.equal(a.trigger.isConnected, true, 'the plain button stays');
    a.pop.want(true); assert.equal(a.pop.isOpen(), true);
    a.pop.want(false); assert.equal(a.fallback.hidden, true);
    /* a later press does not retry forever in a loop: it stays plain for this page */
    assert.equal(env.calls.length, 1, 'the failed script was asked for once');
  }

  /* ---- 9. a page that already has the popover (the full kit in the editor, /explore's chunk) loads nothing ---- */
  {
    const env = boot({ kit: 'js/ark/vendor/ark-kit.js' });
    assert.equal(typeof env.w.ArkKit.ARK_BLOCKS.popover, 'object', 'the full kit has the block');
    const a = lazy(env, 'products-trigger', 'Resolutions');
    a.trigger.click(); await tick();
    assert.deepEqual(env.calls, [HELPER], 'only the small swap helper is loaded: the block is already registered, so not the chunk');
    assert.equal(isOpen(a), true);
  }

  /* ---- 10. what the source must keep true ---- */
  {
    assert(!/key === 'Escape'|key==='Escape'/.test(source.replace(/\/\*[\s\S]*?\*\//g, '')), 'js/resolvers/header.js has no Escape handler of its own: Ark\'s layer handles it (comments aside)');
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '');
    assert(!/document\.addEventListener\('click'/.test(code), 'no hand-built "press outside" listener on the document');
    assert(!/addEventListener\('focusout', function \(event\) \{\s*if \(!mega/.test(code), 'no hand-built "focus left" listener for the Resolutions menu');
    assert(!/products-open/.test(code), 'the header class that lifted the bar is a CSS :has() on the open popover now');
    assert(/id: 'header-chain-popover'/.test(code) && /label: ArkCopy\.text\('NAV\.PRODUCTS'\)/.test(code), 'both panels are built by the one stub');
    /* loading happens inside the first press, never while the bar is built */
    const lazyBody = code.slice(code.indexOf('function lazyHeaderPopover'), code.indexOf('function buildHeaderChainPopover'));
    assert(/function load\(\)[\s\S]*loadScript\('js\/resolvers\/header-popover\.js'\)/.test(lazyBody) && /on && !state\) load\(\)/.test(lazyBody), 'the helper is loaded by load(), which only an open request calls');
    assert(!/loadScript|ArkKit/.test(code.replace(lazyBody, '')), 'nothing else in the header loads a script or reads the kit');
    /* the weight stays in the helper file: the stub is all every route pays for */
    assert(fs.readFileSync('js/resolvers/header-popover.js', 'utf8').includes('ArkKit.renderArkBlock') && !code.includes('renderArkBlock'), 'rendering the block is the helper\'s, not the always-loaded header\'s');
    assert(!fs.readFileSync('js/ark/vendor/ark-kit-popover.js', 'utf8').includes('header-chain'), 'site code is not in the Ark vendor chunk');
    assert(!index0.includes('header-popover'), 'index.html does not carry the helper either');

    const index = fs.readFileSync('index.html', 'utf8');
    assert(!index.includes('ark-kit-popover'), 'index.html does not carry the popover chunk: every route would pay 3.2 KB');
    const catalog = fs.readFileSync('js/pages/catalog.js', 'utf8');
    assert(!/blockScripts = [^;]*ark-kit-popover/.test(catalog), 'the shared block scripts do not carry it');
  }

  /* ---- 11. the weight every route pays ---- */
  {
    const gz = require('node:zlib').gzipSync(Buffer.from(source), { level: 9 }).length;
    assert(gz <= 11611 + 300, `js/resolvers/header.js is ${gz} B gz; every route pays it and the budget allows 11,911 (move code into js/resolvers/header-popover.js)`);
  }

  console.log('PASS: the header\'s network pill and Resolutions menu are Ark popovers loaded on the first press (nothing before it), keep their classes, children and id, close on Escape / an outside press / focus leaving with focus back on the button, one at a time, survive a failed chunk, and the header holds no open/close/Escape code of its own.');
})().catch((error) => { console.error(error); process.exit(1); });
