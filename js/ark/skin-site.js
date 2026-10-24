/* =====================================================================
   NFT SKINS ON THE SITE (DefxnSkinSite)
   ---------------------------------------------------------------------
   The one place the site applies a visitor's card skin (docs/home-redesign/SKIN-CONTRACT.md). It puts
   together what the other owners built, and owns none of it:
     the recipe   js/nft/skin-recipe.js (DefxnSkin.recipe, DefxnSkin.arkSkin): card -> tokens,
                  chrome, per-part rules. The NFT session owns it; loaded by path, never copied.
     the parts    js/ark/skin-parts.js: which Ark UI part each hand-built piece is (the navbar, its mega dropdown).
     the skin     js/ark/vendor/ark-kit-skin.js (@deadark/ark-ui/skin): tokens, theme-resolved part colours,
                  chrome, rules, exact undo. Loaded only when a skin is applied.
     the grid     js/world/ring-kit.js never takes a skin's colours (the owner, 2026-10-24); it keeps the site's theme.
     the art      js/nft/scene.js (DefxnScene), the NFT session's: while a card is worn, its avatar is the account
                  button's picture. Its world never covers the ring world (the owner: do not alter the core 3D grid);
                  it shows only where the ring world is off.
   The skin goes on the site wrapper (#scene: the header, the outlet and the world's page layer), never on
   <html>, whose data-theme the site's theme owns. The site's lock list keeps meaning, chain kinds, networks
   and the record light out of every skin.

   No real card exists yet: no lookup from an FXN ID to a card is built (owner's decision, a signed
   KASSET1-based record). So the only way in is a sample, for review: ?skin-sample=27|263|512 (the NFT
   session's three samples). Record 009 is never shown on the site. Nothing is stored. */
var DefxnSkinSite = (function () {
  'use strict';

  var NFT = 'js/nft/';   /* the recipe pieces the site needs (owner, 2026-10-24: promoted from docs/home-redesign/nft/, one copy) */
  var RECIPE = ['skin-bundle.js', 'cards-data.js', 'traits.js', 'card-chrome.js', 'card-record.js', 'grid-look.js', 'timeline.js', 'skin-recipe.js'];   /* before the recipe: grid-look.js derives recipe.gridLook (docs/home-redesign/GRID-LOOK.md), timeline.js recipe.arrival */
  var CHUNK = 'js/ark/vendor/ark-kit-skin.js';
  /* the CMS skin policy, content over DefxnSkinParts.ALLOW (the Skin lab saves it as FLX); it decodes with
     js/vendor/flx-state-grammar.js, which index.html already loads for the world */
  var POLICY = ['js/content/skin-policy.js', 'js/content/skin-policy-data.js'];
  var SAMPLES = ['27', '263', '512'];   /* the NFT session's samples; 009 carries a .eth name and never reaches the site */
  var on = null;

  function load(src) {
    if (window.ArkUI && ArkUI.loadScript) return ArkUI.loadScript(src);
    return new Promise(function (ok, fail) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { fail(new Error('could not load ' + src)); }; document.head.appendChild(s); });
  }
  function needs() {
    var chain = Promise.resolve();
    if (!window.DefxnSkin) RECIPE.forEach(function (f) { chain = chain.then(function () { return load(NFT + f); }); });
    chain = chain.then(function () {
      if (window.ArkSkinPolicy) return null;
      return POLICY.reduce(function (c, f) { return c.then(function () { return load(f); }); }, Promise.resolve()).catch(function (e) {
        console.error('The saved skin policy did not load (' + e.message + '). Skins use the site\'s own table (js/ark/skin-parts.js) until ' + POLICY.join(' and ') + ' load; reload to try again.');
      });
    });
    return chain.then(function () { return window.ArkKitSkin ? null : load(CHUNK); });
  }
  function wrapper() { return document.getElementById('scene') || document.body; }
  function reduced() { return window.ArkUI && ArkUI.prefersReducedMotion ? ArkUI.prefersReducedMotion() : !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }

  /* ---------- the card's art: the NFT session's 3D engine (js/nft/art3d.js) ----------
     The profile card (js/ark/profile-card.js) and the scene below both draw with it. The load order is the NFT
     session's: js/ark/mark-data.js and js/vendor/three-r180-defxn.js before art3d.js (it reads three as it loads), and
     the recipe before it too. The ring world (js/world/world-host.js) loads three.js and the mark with its own tags,
     guarded by these globals: a tag already loading is waited for, never loaded twice, so the page holds one THREE. */
  function shared(global, path) {
    if (window[global]) return Promise.resolve();
    var tag = document.querySelector('script[src*="' + path + '"]');
    if (!tag) return load(path);
    return new Promise(function (resolve, reject) {
      tag.addEventListener('load', function () { resolve(); }, { once: true });
      tag.addEventListener('error', function () { reject(new Error('could not load ' + path)); }, { once: true });
      if (window[global]) resolve();
    });
  }
  function art() {
    return Promise.all([ArkUI.loadSheet('css/nft-card.css'), shared('DEFXN_MARK', 'js/ark/mark-data.js'), shared('DEFXNDependencies', 'js/vendor/three-r180-defxn.js')])
      .then(needs).then(function () { return load(NFT + 'art3d.js'); });
  }

  /* ---------- the card's art around the page (js/nft/scene.js, DefxnScene) ----------
     The world stands in the ring world's box, just after it, and covers it (css/skin-site.css): it comes and goes by
     a clip, like the pages' words, and only once its art has painted, so nothing fades and nothing cuts. On a page
     where the ring world flies to a view of its own (home, the intro) it leaves; on every reading page it shows.
     Both pieces are still images: nothing here runs a frame loop. */
  var dress = null, routed = false;
  /* The owner, 2026-10-24: "when adding the NFT background and elements, do not alter our core 3D illustrations of the
     grid." So the card's world never covers the ring world. It shows only on a page where the ring world is off (no
     WebGL, ?world=off), and is not painted at all where it cannot show. (Earlier the same day it covered the ring
     world on every route; that is withdrawn.) The avatar and the skin's chrome are unaffected. */
  function reading() {
    var host = window.ArkWorldHost;
    return !host || !host.owns();
  }
  function clip(layer, want) {
    var shown = layer.getAttribute('data-shown') === 'true';
    if (shown === want) return Promise.resolve();
    layer.setAttribute('data-shown', want ? 'true' : 'false');
    if (window.ArkWorldHost) ArkWorldHost.covered = want;   /* the hidden rings take no click (world-host.js hooks.pick) */
    if (reduced() || !layer.animate) return Promise.resolve();
    var m = window.ArkWorld ? ArkWorld.get().motion : { riseIn: 700, riseOut: 420 }, hide = 'inset(100% 0 0 0)', open = 'inset(0)';
    var a = layer.animate([{ clipPath: want ? hide : open }, { clipPath: want ? open : hide }], { duration: want ? m.riseIn : m.riseOut, easing: 'cubic-bezier(.22,.7,.18,1)' });
    return a.finished.catch(function () {});
  }
  /* the card's arrival without its art track (art: false) or the art track alone (art: true); never blocks, never rejects */
  function playArrival(root, timeline, art) {
    if (!timeline || !window.DefxnTimeline || !timeline.tracks) return Promise.resolve();
    var tracks = timeline.tracks.filter(function (t) { return art ? t.target === 'art' : t.target !== 'art'; });
    if (!tracks.length) return Promise.resolve();
    return DefxnTimeline.play(root, Object.assign({}, timeline, { tracks: tracks })).catch(function (e) {
      console.error('The card\'s arrival did not play (' + e.message + '). The skin is on; it simply arrived without motion.');
    });
  }
  function dressUp(record, timeline) {
    undress();
    var mine = dress = { record: record };
    sceneLayer(mine);
    return Promise.all([art(), ArkUI.loadSheet('css/skin-site.css')]).then(function () { return load(NFT + 'scene.js'); }).then(function () {
      if (mine !== dress) return;
      var scene = wrapper(), layer = mine.layer;
      if (reading()) mine.world = DefxnScene.world(layer, record, { leanOn: scene });   /* the layer lets the pointer through: lean on the scene */
      var button = scene.querySelector('.header-account-link');
      if (button) {
        mine.button = button; mine.slot = document.createElement('span');
        mine.slot.className = 'header-account-avatar'; mine.slot.setAttribute('aria-hidden', 'true');
        button.insertBefore(mine.slot, button.firstChild); button.setAttribute('data-card-avatar', '');
        mine.avatar = DefxnScene.avatar(mine.slot, record);
      }
      if (mine.world) mine.world.ready.then(function (canvas) { if (mine === dress && canvas) { mine.drawn = true; clip(layer, reading()); } });
      /* the art's beat, once what it moves has painted */
      Promise.all([mine.world ? mine.world.ready : null, mine.avatar ? mine.avatar.ready : null]).then(function () {
        if (mine === dress) playArrival(wrapper(), timeline, true);
      }, function () {});
    }).catch(function (e) {
      console.error('The card\'s art did not dress the page (' + e.message + '). The skin stays on, and the page keeps its own background.');
    });
  }
  function sceneLayer(mine) {
    var scene = wrapper(), ring = scene.querySelector('.world-layer'), persistent = scene.querySelector('[data-ark-layer="persistent"]');
    var layer = mine.layer = document.createElement('div');
    layer.className = 'card-world'; layer.setAttribute('aria-hidden', 'true'); layer.setAttribute('data-shown', 'false');
    if (ring) ring.parentNode.insertBefore(layer, ring.nextSibling);
    else if (persistent) persistent.parentNode.insertBefore(layer, persistent);
    else scene.insertBefore(layer, scene.firstChild);
    if (!routed && window.ArkUI && ArkUI.pageRouter) {   /* one listener for the page's life: the newest dress follows each route */
      routed = true;
      ArkUI.pageRouter.onMount(function () { if (dress && dress.drawn) clip(dress.layer, reading()); });
    }
  }
  function undress() {
    var d = dress; dress = null;
    if (!d || !d.layer) return;
    if (d.avatar) d.avatar.remove();
    if (d.slot) d.slot.remove();
    if (d.button) d.button.removeAttribute('data-card-avatar');
    clip(d.layer, false).then(function () { if (d.world) d.world.remove(); d.layer.remove(); });   /* it leaves by its clip, then goes */
  }

  /* record: a card record (DefxnSkin's shape). options.policy: a draft skin policy (the CMS skin lab's preview), in
     place of the published one (DefxnSkinParts.policy). Resolves to Ark UI's apply result, or refuses naming why. */
  function apply(record, options) {
    var given = options && options.policy;
    return needs().then(function () {
      if (!window.DefxnSkin || !window.ArkKitSkin) throw new Error('the skin needs ' + NFT + 'skin-recipe.js and ' + CHUNK + '; one did not load');
      strip();
      return DefxnSkin.recipe(record, { locked: DefxnSkinParts.LOCKS });
    }).then(function (recipe) {
      /* the recipe gives the tokens and the chrome (locks ride in it; derive fills the link and control ladders); the
         site's own table gives each part its rules (DefxnSkinParts.ALLOW, or the CMS policy, and the card family's) */
      var root = wrapper(), skin = DefxnSkin.arkSkin(recipe, { parts: [], derive: ArkKitSkin.deriveSkinTokens });
      var rules = DefxnSkinParts.policy(given, recipe.family);
      skin.rules = DefxnSkinParts.rulesFor(recipe.rules, rules.allow);
      var stopParts = DefxnSkinParts.watch(root);
      var res = ArkKitSkin.applyArkSkin(root, skin, { locks: DefxnSkinParts.LOCKS, contrast: rules.contrast });   /* held to the site's own contrast rule, and any the policy adds */
      if (!res.ok) { stopParts(); throw new Error('Ark UI refused the skin: ' + (res.errors || []).join('; ')); }
      on = { root: root, stopParts: stopParts, recipe: recipe };
      root.dispatchEvent(new CustomEvent('defxn:skin', { bubbles: true, detail: { on: true, record: recipe.record, theme: { vars: skin.tokens } } }));
      /* Two beats, so wearing a card never stalls the page (the NFT session measured 2.5 s long tasks when the 3D art
         loaded during the arrival): the pieces arrive first (recipe.arrival, the card's own timeline, js/nft/timeline.js,
         motion only, at most 1.2 s), and only then does the heavy art load and paint, with the art's own beat when it is
         ready. The same card again (a CMS policy toggle) keeps its art and does not replay its arrival. */
      var fresh = !dress || dress.record !== record;
      var beat = fresh ? playArrival(root, recipe.arrival, false) : Promise.resolve();
      if (fresh) beat.then(function () { if (on && on.recipe === recipe) dressUp(record, recipe.arrival); });
      return res;
    });
  }
  function remove() { undress(); return strip(); }
  /* the skin alone: its tokens, chrome and rules (apply() swaps skins with it and keeps the card's art) */
  function strip() {
    if (!on) return false;
    var root = on.root;
    window.ArkKitSkin.removeArkSkin(root);
    on.stopParts();
    on = null;
    root.dispatchEvent(new CustomEvent('defxn:skin', { bubbles: true, detail: { on: false, record: null, theme: { vars: {} } } }));
    return true;
  }
  /* One card's look on one element only (the "In one minute" experience's small site pane): the recipe's tokens and
     chrome and the site table's rules, applied by Ark UI to `pane`. The page's own skin, the avatar and the card's world
     are not touched, and no defxn:skin event fires. Resolves to a function that takes the look off exactly. */
  function preview(record, pane, options) {
    return needs().then(function () { return DefxnSkin.recipe(record, { locked: DefxnSkinParts.LOCKS }); }).then(function (recipe) {
      var skin = DefxnSkin.arkSkin(recipe, { parts: [], derive: ArkKitSkin.deriveSkinTokens }), rules = DefxnSkinParts.policy(options && options.policy, recipe.family);
      skin.rules = DefxnSkinParts.rulesFor(recipe.rules, rules.allow);
      var unmark = DefxnSkinParts.mark(pane);
      var res = ArkKitSkin.applyArkSkin(pane, skin, { locks: DefxnSkinParts.LOCKS, contrast: rules.contrast });
      if (!res.ok) { unmark(); throw new Error('Ark UI refused the preview: ' + (res.errors || []).join('; ')); }
      return function () { ArkKitSkin.removeArkSkin(pane); unmark(); };
    });
  }
  /* one review sample's card record, by its number (27, 263 or 512); refuses any other, 009 included */
  function sample(n) {
    n = String(n);
    if (SAMPLES.indexOf(n) < 0) return Promise.reject(new Error(n + ' is not a review sample. Use one of ' + SAMPLES.join(', ') + '.'));
    return needs().then(function () {
      var rec = DefxnSkin.samples().filter(function (r) { return Number(r.genesisId || r.number) === Number(n); })[0];   /* genesisId is zero-padded ("027") */
      if (!rec) throw new Error('the NFT samples have no card ' + n);
      return rec;
    });
  }
  /* the review way in: ?skin-sample=<number> picks one of the NFT session's samples */
  function fromAddress() {
    var n = new URLSearchParams(location.search).get('skin-sample');
    if (!n) return null;
    return sample(n).then(function (rec) { return apply(rec); })
      .catch(function (e) { console.error('Skin not applied (' + e.message + '). The site keeps its own look.'); });
  }
  /* Ark UI's report on the skin that is on: each part, the rules it kept, skipped or had taken back, and the tokens
     the contrast rules moved (getArkSkinReport; the same data rides the bubbling `ark:skin-report` event). */
  function report() { return on && window.ArkKitSkin && ArkKitSkin.getArkSkinReport ? ArkKitSkin.getArkSkinReport(on.root) : undefined; }
  /* The name a skin's rules use for a part the report names, or null when Ark UI has no rules name for it. One spelling per part: a schema key as Ark UI writes it (CARD, PRIMARY|BUTTON), and a block part in upper case
     with no hyphen (tabs-list -> TABSLIST, section-header -> SECTIONHEADER), the spelling DefxnSkinParts.ALLOW and the
     CMS policy hold. Ark UI reads rule keys in any case and hyphenation, so both spellings reach the same elements. */
  var known = null;
  function ruleKey(name) {
    if (!window.ArkKitSkin || !name) return null;
    if (!known) {
      known = new Map();
      ArkKitSkin.arkSkinPartKeys().forEach(function (k) { var n = squash(k), canon = /^[A-Z0-9|]+$/.test(k) ? k : n; if (!known.has(n) || canon === k) known.set(n, canon); });
    }
    return known.get(squash(name)) || null;
  }
  function squash(v) { return String(v).replace(/[^A-Za-z0-9]/g, '').toUpperCase(); }

  return { apply: apply, remove: remove, preview: preview, sample: sample, fromAddress: fromAddress, report: report, ruleKey: ruleKey, art: art, SAMPLES: SAMPLES.slice(),
    active: function () { return on ? on.recipe : null; } };
})();
if (typeof module === 'object' && module.exports) module.exports = DefxnSkinSite;
else if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', function () { DefxnSkinSite.fromAddress(); });
