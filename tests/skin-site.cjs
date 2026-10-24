/* DefxnSkinSite (js/ark/skin-site.js): the card's skin on the site, the shared 3D art loader, and the card's art
   dressing the page while a card is worn.
   Why each case exists:
   - art() is the one loader of the NFT 3D engine (the profile card calls it too). Its order is a contract: the sheet,
     the mark and three.js, and the recipe all before js/nft/art3d.js (it reads three as it loads). A wrong order
     fails only in a browser, and only on a cold cache.
   - The ring world loads three.js with its own <script> tag. A second copy is 187 KB gz and a second THREE
     instance, so a tag already loading is waited for and three.js is never loaded twice.
   - The dress has a fixed place: the card's world layer sits right after the ring world's layer (same stack, covers
     it), and the avatar is the account link's first child. A different place changes what covers what.
   - The layer shows only once the world has painted (ready resolves with a canvas), so nothing flashes empty, and
     ArkWorldHost.covered follows it so the hidden rings take no click.
   - The same card again (a CMS policy toggle) keeps its layer: a repaint rebuilds a WebGL scene for nothing. A
     different card replaces it and frees the old one.
   - remove() leaves the page exactly as it was (the skin's exact-undo invariant) and frees the scene's world and
     avatar. A world that finishes painting after remove() must not show or cover anything.
   - The card's world never covers the 3D grid (the owner, 2026-10-24, "do not alter our core 3D illustrations of the
     grid"). While the ring world owns the page, DefxnScene.world is never called, the layer stays hidden and nothing is
     covered; the avatar still mounts. With no ring world (or one that does not own the page) the world shows.
   - Record 009 carries a .eth name and never reaches the site. */
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
        deriveSkinTokens: () => ({}), applyArkSkin: () => ({ ok: true }), removeArkSkin: () => {}
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
  w.DefxnSkinParts = { LOCKS: [], policy: () => ({ allow: {}, contrast: null }), rulesFor: () => ({}), watch: () => () => {} };
  w.ArkWorldHost = { covered: false, owns: () => ringOwns };
  w.eval(src);
  return { w, calls, worlds, avatars, samples };
}
const layers = (w) => [...w.document.querySelectorAll('#scene .card-world')];

(async () => {
  // 1. art(): the sheet, the mark, three.js and the recipe all come before art3d.js
  {
    const { w, calls } = boot();
    await w.DefxnSkinSite.art();
    const at = (f) => calls.indexOf(f);
    assert.ok(at('css/nft-card.css') >= 0 && at('js/ark/mark-data.js') >= 0 && at('js/vendor/three-r180-defxn.js') >= 0, 'art() links the card sheet and loads the mark and three.js');
    assert.ok(at('js/nft/art3d.js') > at('js/vendor/three-r180-defxn.js'), 'three.js loads before art3d.js (it reads three as it loads)');
    assert.ok(at('js/nft/art3d.js') > at('js/ark/mark-data.js') && at('js/nft/art3d.js') > at('css/nft-card.css'), 'the mark and the sheet come before art3d.js');
    assert.ok(at('js/nft/art3d.js') > at('js/nft/skin-recipe.js'), 'the recipe loads before art3d.js');
    assert.equal(calls.filter((c) => c === 'js/nft/art3d.js').length, 1, 'art3d.js loads once');
  }

  // 2. three.js already loading through the ring world's own tag: waited for, never loaded a second time
  {
    const { w, calls } = boot({ worldTag: true });
    const done = w.DefxnSkinSite.art();
    await ticks();
    assert.ok(!calls.includes('js/vendor/three-r180-defxn.js'), 'art() does not load a second three.js while the world is loading one');
    assert.ok(!calls.includes('js/nft/art3d.js'), 'and art3d.js waits for it');
    w.DEFXNDependencies = {}; w.__worldTag.dispatchEvent(new w.Event('load'));
    await done;
    assert.ok(calls.includes('js/nft/art3d.js'), 'once the world\'s three.js has loaded, art3d.js loads');
    assert.ok(!calls.includes('js/vendor/three-r180-defxn.js'), 'and three.js was never loaded by art()');
  }

  // 3. the dress: place, avatar, and shown only after the world has painted
  {
    const { w, worlds, avatars, samples } = boot();
    const d = w.document, scene = d.getElementById('scene');
    await w.DefxnSkinSite.apply(samples[1]);
    await ticks();
    const [layer] = layers(w);
    assert.equal(layers(w).length, 1, 'one card world layer');
    assert.ok(layer.previousElementSibling && layer.previousElementSibling.classList.contains('world-layer'), 'the card world sits right after the ring world\'s layer');
    const link = scene.querySelector('.header-account-link');
    assert.ok(link.firstElementChild.classList.contains('header-account-avatar'), 'the avatar slot is the account link\'s first child');
    assert.ok(link.hasAttribute('data-card-avatar'), 'the link says it wears a card avatar');
    assert.equal(avatars.length, 1, 'DefxnScene.avatar drew into the slot');
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
    assert.equal(avatars[0].removed, 1, 'DefxnScene avatar.remove() was called');
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

  // 5b. the ring world owns the page: no card world is built, nothing is covered, the avatar still mounts
  {
    const { w, worlds, avatars, samples } = boot({ ringOwns: true });
    await w.DefxnSkinSite.apply(samples[1]);
    await ticks();
    assert.equal(worlds.length, 0, 'DefxnScene.world is never called while the ring world owns the page');
    const [layer] = layers(w);
    assert.equal(layer.getAttribute('data-shown'), 'false', 'the layer stays hidden');
    assert.equal(w.ArkWorldHost.covered, false, 'and the rings stay uncovered');
    assert.equal(avatars.length, 1, 'the avatar still mounts');
    assert.ok(w.document.querySelector('.header-account-link').hasAttribute('data-card-avatar'), 'and the link wears it');
    const before = w.document.getElementById('scene').outerHTML;
    w.DefxnSkinSite.remove();
    await ticks();
    assert.ok(!w.document.querySelector('.card-world') && avatars[0].removed === 1, 'remove() works with no world to free');
    assert.notEqual(w.document.getElementById('scene').outerHTML, before);
  }

  // 6. record 009 is refused, and so is anything else that is not a review sample
  {
    const { w } = boot();
    for (const n of ['009', '9', 9, 'abc']) {
      await assert.rejects(() => w.DefxnSkinSite.sample(n), /not a review sample/, `sample(${n}) is refused`);
    }
  }

  console.log('skin-site: ok (art order, one three.js, dress, same/other record, remove, 009)');
})().catch((e) => { console.error(e); process.exit(1); });
