/* DefxnSkinSite (js/ark/skin-site.js): the card's skin on the site, the shared 3D art loader, and the card's art
   dressing the page while a card is worn.
   Why each case exists:
   - art() is the one loader of the NFT 3D engine (the profile card calls it too). Its order is a contract: the sheet,
     the mark and three.js, and the recipe all before js/nft/art3d.js (it reads three as it loads). A wrong order
     fails only in a browser, and only on a cold cache.
   - The ring world loads three.js with its own <script> tag. A second copy is 187 KB gz and a second THREE
     instance, so a tag already loading is waited for and three.js is never loaded twice.
   - The dress has a fixed place: the card's world layer sits right after the ring world's layer (same stack, covers
     it). A different place changes what covers what. The account link is never touched: the header's one picture of
     the card is the wearer's menu in .header-user-zone (two pictures of one card had been drawn there).
   - The layer shows only once the world has painted (ready resolves with a canvas), so nothing flashes empty, and
     ArkWorldHost.covered follows it so the hidden rings take no click.
   - The same card again (a CMS policy toggle) keeps its layer: a repaint rebuilds a WebGL scene for nothing. A
     different card replaces it and frees the old one.
   - remove() leaves the page exactly as it was (the skin's exact-undo invariant) and frees the scene's world. A world
     that finishes painting after remove() must not show or cover anything.
   - The card's world never covers the 3D grid (the owner, 2026-10-24, "do not alter our core 3D illustrations of the
     grid"). While the ring world owns the page, the card's 3D art is never loaded, no layer is built and nothing is
     covered. With no ring world (or one that does not own the page) the world shows.
   - Record 009 carries a .eth name and never reaches the site.
   - A held card (js/nft/wear.js) wears its skin package through applyPackage, the same site path as a record: the card's
     own rules go to every part Ark UI names (the owner's decision, 2026-10-24), less what the site and the CMS policy
     switch off, held to the site's locks and contrast rules. The package's own apply skips the switches, so it is never
     used on the site. It loads no NFT engine and paints no art, and a held card 9 is refused like a sample 9. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'js/ark/skin-site.js'), 'utf8');
const tick = () => new Promise((r) => setTimeout(r, 0));
const ticks = async (n = 8) => { for (let i = 0; i < n; i++) await tick(); };

const PAGE = '<!doctype html><head></head><body><div id="scene"><div class="world-layer"></div><div data-ark-layer="persistent"></div>' +
  '<header class="ark-header"><a class="header-account-link" href="/account"><i class="native-icon"></i>Account</a></header></div></body>';

function boot({ worldTag = false, ringOwns = false } = {}) {
  const dom = new JSDOM(PAGE, { url: 'http://127.0.0.1:4640/', runScripts: 'outside-only' });
  const w = dom.window, calls = [], worlds = [], avatars = [];
  if (worldTag) { const t = w.document.createElement('script'); t.src = '/js/vendor/three-r180-defxn.js?v=1'; w.document.head.appendChild(t); w.__worldTag = t; }
  const samples = ['027', '263', '512'].map((genesisId) => ({ genesisId }));
  w.ArkUI = {
    prefersReducedMotion: () => true,
    loadSheet: (f) => { calls.push(f); return Promise.resolve(); },
    loadScript: (f) => {
      calls.push(f);
      if (f === 'js/ark/mark-data.js') w.DEFXN_MARK = 'data:';
      if (f === 'js/vendor/three-r180-defxn.js') w.DEFXNDependencies = {};
      if (f === 'js/nft/skin-recipe.js') w.DefxnSkin = {
        samples: () => samples,
        recipe: (rec) => Promise.resolve({ family: 'f', rules: {}, record: rec, tokens: {} }),
        arkSkin: () => ({ tokens: {} })
      };
      if (f === 'js/content/skin-policy-data.js') w.ArkSkinPolicy = {};
      if (f === 'js/ark/vendor/ark-kit-skin.js') w.ArkKitSkin = {
        deriveSkinTokens: () => ({}), applyArkSkin: () => ({ ok: true }), removeArkSkin: () => {}, arkSkinPartKeys: () => ['CARD'], ARK_SKIN_BLOCK_PARTS: {}
      };
      if (f === 'js/nft/scene.js') w.DefxnScene = {
        world: (layer) => {
          const world = { removed: 0, remove() { world.removed++; } };
          world.ready = new Promise((ok) => { world.finish = ok; });
          worlds.push(world); return world;
        },
        avatar: () => { const a = { removed: 0, remove() { a.removed++; } }; avatars.push(a); return a; }
      };
      return Promise.resolve();
    }
  };
  w.DefxnSkinParts = { LOCKS: [], policy: () => ({ off: {}, contrast: null }), switchOff: (rules) => rules || {}, shapeRules: (rules) => rules || {}, watch: () => () => {} };
  w.ArkWorldHost = { covered: false, owns: () => ringOwns };
  w.eval(src);
  return { w, calls, worlds, avatars, samples };
}
const layers = (w) => [...w.document.querySelectorAll('#scene .card-world')];

(async () => {
  /* Owner directive, 2026-10-30: "Port each remaining view's 3D into the grammar renderer. Port the NFT card and the skins.
     Make the grammar world the default, ready to drop threejs entirely." The card therefore draws with the grammar renderer:
     art3d.js loads js/nft/card-gl.mjs itself, and art() requests no Three.js script for a card, with or without a ring-world
     tag on the page. These assertions state that contract; they replace the old order "three.js before art3d.js". */
  // 1. art(): the sheet, the mark and the recipe come before art3d.js; no Three.js is requested
  {
    const { w, calls } = boot();
    await w.DefxnSkinSite.art();
    const at = (f) => calls.indexOf(f);
    assert.ok(at('css/nft-card.css') >= 0 && at('js/ark/mark-data.js') >= 0, 'art() links the card sheet and loads the mark');
    assert.ok(!calls.some((c) => /three/i.test(c)), 'no Three.js script is requested for a card (owner, 2026-10-30: drop threejs)');
    assert.ok(at('js/nft/art3d.js') > at('js/ark/mark-data.js') && at('js/nft/art3d.js') > at('css/nft-card.css'), 'the mark and the sheet come before art3d.js');
    assert.ok(at('js/nft/art3d.js') > at('js/nft/skin-recipe.js'), 'the recipe loads before art3d.js');
    assert.equal(calls.filter((c) => c === 'js/nft/art3d.js').length, 1, 'art3d.js loads once');
    const art3d = fs.readFileSync(path.join(root, 'js/nft/art3d.js'), 'utf8');
    assert.ok(/import\(new URL\('card-gl\.mjs'/.test(art3d), 'art3d.js loads the grammar renderer module js/nft/card-gl.mjs itself');
    assert.ok(!/THREE\./.test(art3d), 'art3d.js no longer reads THREE');
  }

  // 2. a ring-world Three.js tag on the page does not hold the card back, and the card never loads Three.js
  {
    const { w, calls } = boot({ worldTag: true });
    await w.DefxnSkinSite.art();
    assert.ok(calls.includes('js/nft/art3d.js'), 'art3d.js loads without waiting for the ring world\'s Three.js tag');
    assert.ok(!calls.includes('js/vendor/three-r180-defxn.js'), 'and art() never loads Three.js');
  }

  // 3. the dress: place, no avatar, and shown only after the world has painted
  {
    const { w, worlds, avatars, samples } = boot();
    const d = w.document, scene = d.getElementById('scene');
    await w.DefxnSkinSite.apply(samples[1]);
    await ticks();
    const [layer] = layers(w);
    assert.equal(layers(w).length, 1, 'one card world layer');
    assert.ok(layer.previousElementSibling && layer.previousElementSibling.classList.contains('world-layer'), 'the card world sits right after the ring world\'s layer');
    const link = scene.querySelector('.header-account-link');
    assert.ok(!link.querySelector('.header-account-avatar') && !link.hasAttribute('data-card-avatar') && !avatars.length, 'the account link is not touched: the wearer\'s menu is the header\'s one picture of the card');
    assert.equal(layer.getAttribute('data-shown'), 'false', 'the layer stays hidden while the world has not painted');
    assert.equal(w.ArkWorldHost.covered, false, 'and covers nothing');
    worlds[0].finish(null);
    await ticks();
    assert.equal(layer.getAttribute('data-shown'), 'false', 'a world that resolves with no canvas (no WebGL) never shows');
    worlds[0].finish = null;
  }
  {
    const { w, worlds, samples } = boot();
    await w.DefxnSkinSite.apply(samples[1]);
    await ticks();
    const [layer] = layers(w);
    worlds[0].finish(w.document.createElement('canvas'));
    await ticks();
    assert.equal(layer.getAttribute('data-shown'), 'true', 'the layer shows once the world resolves with a canvas');
    assert.equal(w.ArkWorldHost.covered, true, 'ArkWorldHost.covered follows the layer, so the hidden rings take no click');

    // 4. the same record keeps the layer; another record replaces it
    await w.DefxnSkinSite.apply(samples[1]);
    await ticks();
    assert.equal(layers(w).length, 1);
    assert.equal(layers(w)[0], layer, 'the same record again keeps the same layer (no repaint)');
    assert.equal(worlds.length, 1, 'and builds no second world');
    await w.DefxnSkinSite.apply(samples[2]);
    await ticks();
    assert.equal(layers(w).length, 1, 'another record leaves one layer');
    assert.notEqual(layers(w)[0], layer, 'and it is a new one');
    assert.equal(worlds[0].removed, 1, 'the old world was freed');
    assert.equal(worlds.length, 2, 'the new record drew a new world');
  }

  // 5. remove() leaves the page as it was and frees the scene's pieces; a late world shows nothing
  {
    const { w, worlds, avatars, samples } = boot();
    const scene = w.document.getElementById('scene'), before = scene.outerHTML;
    await w.DefxnSkinSite.apply(samples[0]);
    await ticks();
    worlds[0].finish(w.document.createElement('canvas'));
    await ticks();
    assert.notEqual(scene.outerHTML, before, 'the dress changed the page');
    w.DefxnSkinSite.remove();
    await ticks();
    assert.equal(scene.outerHTML, before, 'remove() leaves #scene and the header exactly as before apply');
    assert.equal(worlds[0].removed, 1, 'DefxnScene world.remove() was called');
    assert.equal(w.ArkWorldHost.covered, false, 'and the rings take clicks again');
  }
  {
    const { w, worlds, samples } = boot();
    const scene = w.document.getElementById('scene'), before = scene.outerHTML;
    await w.DefxnSkinSite.apply(samples[0]);
    await ticks();
    w.DefxnSkinSite.remove();
    await ticks();
    worlds[0].finish(w.document.createElement('canvas'));
    await ticks();
    assert.equal(scene.outerHTML, before, 'a world that paints after remove() puts nothing back');
    assert.equal(w.ArkWorldHost.covered, false, 'and covers nothing');
  }

  // 5b. the ring world owns the page: the card's 3D art never loads, no layer is built, nothing is covered
  {
    const { w, worlds, calls, samples } = boot({ ringOwns: true });
    const scene = w.document.getElementById('scene');
    await w.DefxnSkinSite.apply(samples[1]);
    await ticks();
    assert.equal(worlds.length, 0, 'DefxnScene.world is never called while the ring world owns the page');
    assert.ok(!calls.some((c) => /art3d|scene\.js|three-r180/.test(c)), 'and the 3D art it could not show never loads');
    assert.equal(layers(w).length, 0, 'no card world layer is built');
    assert.equal(w.ArkWorldHost.covered, false, 'and the rings stay uncovered');
    const before = scene.outerHTML;
    w.DefxnSkinSite.remove();
    await ticks();
    assert.equal(scene.outerHTML, before, 'remove() works with nothing dressed');
  }

  // 6. record 009 is refused, and so is anything else that is not a review sample
  {
    const { w } = boot();
    for (const n of ['009', '9', 9, 'abc']) {
      await assert.rejects(() => w.DefxnSkinSite.sample(n), /not a review sample/, `sample(${n}) is refused`);
    }
  }

  // 7. a held card's package (js/nft/wear.js) goes through the same site table as a record, with no NFT engine
  {
    const { w, calls, avatars } = boot();
    const seen = {};
    w.DefxnSkinParts.LOCKS = ['--live'];
    w.DefxnSkinParts.policy = (given, family) => { seen.family = family; return { off: { CARD: ['edge'] }, contrast: ['site rule'] }; };
    w.DefxnSkinParts.switchOff = (rules, off) => { seen.switchOff = [rules, off]; return { CARD: { frame: 'cut' } }; };
    const pkgs = { 'pkg-263': { record: 'DFXNCARD1-N263-X', rules: { frame: 'cut', edge: 'glow' }, family: 'Arcade', tokens: {} }, 'pkg-9': { record: 'DFXNCARD1-N9-X', rules: {} }, 'pkg-none': { record: 'nothing', rules: {} } };
    w.DefxnSkinPackage = { decode: (t) => pkgs[t], toArkSkin: (data, opts) => { seen.keys = opts.keys; seen.root = opts.root; return { tokens: { '--canvas': '1 2% 3%' }, rules: { CARD: { frame: 'cut', edge: 'glow' }, ALERT: { frame: 'cut', edge: 'glow' } } }; } };
    let applied = null, removed = 0;
    w.ArkKitSkin = { deriveSkinTokens: () => ({}), applyArkSkin: (el, skin, opts) => { applied = { el, skin, opts }; return { ok: true }; }, removeArkSkin: () => { removed++; }, arkSkinPartKeys: () => ['CARD', 'PRIMARY|BUTTON'], ARK_SKIN_BLOCK_PARTS: { alert: {}, 'tabs-list': {} } };
    const res = await w.DefxnSkinSite.applyPackage('pkg-263');
    assert.ok(res.result.ok && res.arrival && typeof res.arrival.then === 'function', 'it resolves to { result, arrival }, the shape DefxnWear.use() takes');
    assert.deepEqual([...seen.keys], ['CARD', 'PRIMARY|BUTTON', 'alert', 'tabs-list'], 'the card\'s rules go to every part Ark UI names, its schema parts and its block parts');
    assert.equal(seen.root, undefined, 'with no root, so a part that mounts later (the mega dropdown) is reached too');
    assert.equal(JSON.stringify(seen.switchOff), JSON.stringify([{ CARD: { frame: 'cut', edge: 'glow' }, ALERT: { frame: 'cut', edge: 'glow' } }, { CARD: ['edge'] }]), 'then what the site and the policy switch off is taken away');
    assert.equal(seen.family, 'Arcade', 'the card family reaches the policy\'s family layer');
    assert.equal(JSON.stringify(applied.skin.rules), JSON.stringify({ CARD: { frame: 'cut' } }));
    assert.equal(JSON.stringify(applied.opts), JSON.stringify({ locks: ['--live'], contrast: ['site rule'] }), 'Ark UI holds it to the site\'s locks and contrast rules');
    assert.equal(applied.el, w.document.getElementById('scene'), 'on the site wrapper, as a record\'s skin');
    assert.equal(JSON.stringify(w.DefxnSkinSite.active()), JSON.stringify({ number: '263', record: 'DFXNCARD1-N263-X' }), 'active() names the held card');
    assert.ok(!calls.some((c) => /skin-recipe|art3d|scene\.js|three-r180/.test(c)), 'no NFT engine and no 3D load for a held card');
    await ticks();
    assert.ok(!w.document.querySelector('.card-world') && !avatars.length, 'and no art dresses the page');
    w.DefxnSkinSite.remove();
    assert.equal(removed, 1, 'remove() takes it off exactly');
    assert.equal(w.DefxnSkinSite.active(), null);
    await assert.rejects(() => w.DefxnSkinSite.applyPackage('pkg-9'), /card 9 is never shown/, 'a held card 9 is refused');
    await assert.rejects(() => w.DefxnSkinSite.applyPackage('pkg-none'), /names no card number/, 'a package with no card number is refused');
  }

  // 8. the held card: the site's key is DefxnWear's, a visitor with none loads nothing, and a held one comes back
  //    through the site table with its seal in the account button; ?skin-sample only tries a card on
  {
    const real = boot();
    real.w.eval(fs.readFileSync(path.join(root, 'js/nft/wear.js'), 'utf8'));
    assert.equal(real.w.DefxnSkinSite.HELD_KEY, real.w.DefxnWear.KEY, 'the key the site checks before wear.js loads is DefxnWear.KEY');

    const stubWear = (w, log) => {
      const inner = w.ArkUI.loadScript;
      w.ArkUI.loadScript = (f) => {
        if (f === 'js/nft/timeline.js') w.DefxnTimeline = {};
        if (f === 'js/nft/skin-package.js') w.DefxnSkinPackage = {};
        const wearing = (number, held) => { w.DefxnWear.current = { number, held }; w.document.dispatchEvent(new w.CustomEvent('defxn:wear')); };
        if (f === 'js/nft/wear.js') w.DefxnWear = {
          current: null,
          use: (h) => log.push(['use', typeof h.apply, typeof h.remove, typeof h.confirm]),
          restore: (el) => { log.push(['restore', el.id]); wearing('263', true); return Promise.resolve({ arrival: Promise.resolve() }); },
          tryOn: (el, wear) => { log.push(['tryOn', el.id, wear.number]); wearing(wear.number, false); return Promise.resolve({ arrival: Promise.resolve() }); },
          of: (recipe, rec) => ({ number: String(Number(rec.genesisId)) }),
          seal: () => ({ remove() {} })
        };
        if (f === 'js/nft/site-check.js') w.DefxnSiteCheck = {};
        if (f === 'js/nft/user-navbar.js') w.DefxnUserNav = {
          mount: (host, el, opts) => { log.push(['mount', host.className, el.id, opts.name, typeof opts.check, opts.nav && opts.nav.className]); return { remove: () => log.push(['unmount']) }; }
        };
        return inner(f);
      };
    };

    const none = boot(), noneLog = [];
    stubWear(none.w, noneLog);
    assert.equal(none.w.DefxnSkinSite.restoreHeld(), null, 'no held card: restoreHeld does nothing');
    await ticks();
    assert.ok(!none.calls.some((c) => /wear\.js|skin-package|timeline|ark-kit-skin/.test(c)) && !noneLog.length, 'and loads nothing');

    const held = boot(), log = [];
    stubWear(held.w, log);
    held.w.localStorage.setItem('defxn.wear', 'DFXNWEAR1-N263-M-P\nx');
    await held.w.DefxnSkinSite.restoreHeld();
    assert.deepEqual(log.map((l) => l[0]), ['use', 'restore', 'mount'], 'the site hands DefxnWear its own way to wear, restores, then the wearer\'s menu mounts');
    assert.deepEqual(log[0], ['use', 'function', 'function', 'function'], 'apply, remove and confirm (the public kit refuses arkConfirm)');
    assert.deepEqual(log[1], ['restore', 'scene'], 'restored on the site wrapper');
    assert.deepEqual(log[2], ['mount', 'header-user-zone', 'scene', null, 'function', 'ark-header'], 'the menu mounts in its own zone, with the check bound by the site (127.0.0.1 has no mesh name)');
    assert.equal(held.w.document.querySelector('.header-account-link').previousElementSibling.className, 'header-user-zone', 'the zone stands just before the account button');
    assert.ok(!held.w.document.querySelector('.header-account-link [class*="seal"], .header-account-avatar'), 'the account link is not touched');
    held.w.DefxnWear.current = null; held.w.document.dispatchEvent(new held.w.CustomEvent('defxn:wear'));
    assert.equal(log[log.length - 1][0], 'unmount', 'and it leaves when no card is on');
    assert.ok(!held.w.document.querySelector('.header-user-zone'), 'with its zone');
    assert.ok(!held.calls.some((c) => /skin-recipe|art3d|scene\.js/.test(c)), 'a held card needs no NFT engine');
    assert.equal(held.w.DefxnSkinSite.heldNumber(), '263', 'heldNumber() reads the held card from its first line');
    held.w.localStorage.setItem('defxn.wear', 'DFXNWEAR1-N9-M-P\nx');
    assert.equal(held.w.DefxnSkinSite.heldNumber(), null, 'and names only a review sample, never 9');

    const tried = boot(), tlog = [];
    stubWear(tried.w, tlog);
    tried.w.history.replaceState(null, '', '/?skin-sample=263');
    await tried.w.DefxnSkinSite.fromAddress();
    assert.ok(tlog.some((l) => l[0] === 'tryOn' && l[2] === '263') && !tlog.some((l) => l[0] === 'restore'), '?skin-sample tries the card on, and keeps nothing');
  }

  // 9. the page's mesh name follows the names system's own rule (ops/scripts/names/system-names.mjs labelOfHost)
  {
    const { labelOfHost } = await import(path.join(root, '../../ops/scripts/names/system-names.mjs'));
    const { w } = boot();
    for (const host of ['defxn.com', 'www.defxn.com', 'radio.defxn.com', 'RADIO.defxn.com:443', 'a.b.defxn.com', '-x.defxn.com', 'defxn.com.evil.io', '127.0.0.1:4640', 'localhost']) {
      const label = labelOfHost(host);
      assert.equal(w.DefxnSkinSite.siteName(host), label ? label + '.fxn' : null, `siteName(${host}) agrees with labelOfHost`);
    }
  }

  // 10. cardComponents(): the one loader the Card slot block (js/resolvers/blocks/rblock-card-slot-v1.js) asks, only after a card is on
  {
    const { w, calls } = boot();
    const inner = w.ArkUI.loadScript;
    let refuse = 1, tries = 0;
    w.ArkUI.loadScript = (f) => {
      if (f === 'js/nft/timeline.js') w.DefxnTimeline = {};
      if (f === 'js/nft/skin-package.js') w.DefxnSkinPackage = {};
      if (f === 'js/nft/wear.js') w.DefxnWear = { current: null, use() {} };
      if (f === 'js/nft/site-check.js') w.DefxnSiteCheck = {};
      if (f === 'js/nft/user-navbar.js') w.DefxnUserNav = { mount: () => ({ remove() {} }) };
      if (f === 'js/nft/card-components.js') { tries++; if (refuse-- > 0) return Promise.reject(new Error('could not load ' + f)); w.DefxnCardComponents = { fill() {} }; }
      return inner(f);
    };
    assert.ok(!calls.some((c) => /card-components|wear\.js/.test(c)), 'a visitor who never asks loads neither the wear scripts nor the card components');
    await assert.rejects(() => w.DefxnSkinSite.cardComponents(), /could not load js\/nft\/card-components\.js/, 'a load that fails says which file');
    const K = await w.DefxnSkinSite.cardComponents();
    assert.equal(K, w.DefxnCardComponents, 'a failed load may be tried again, and resolves to DefxnCardComponents');
    assert.equal(await w.DefxnSkinSite.cardComponents(), K, 'asked again, it is the same object');
    assert.equal(tries, 2, 'card-components.js loaded twice in all (the refused try, then once), never again');
    assert.equal(calls.filter((c) => c === 'js/nft/wear.js').length, 1, 'and the wear scripts it rides on loaded once');
    assert.ok(calls.indexOf('js/nft/timeline.js') < calls.indexOf('js/nft/card-components.js'), 'the timeline is there before the components that decode it');
  }

  console.log('skin-site: ok (art order, one three.js, dress, same/other record, remove, 009, held package, held card, user menu, site name)');
})().catch((e) => { console.error(e); process.exit(1); });
