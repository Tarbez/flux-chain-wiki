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
     the art      js/nft/scene.js (DefxnScene), the NFT session's: the card's world, which never covers the ring world
                  (the owner: do not alter the core 3D grid); it shows only where the ring world is off. The header's
                  one picture of the card is the wearer's menu (js/nft/user-navbar.js), not an avatar.
   The skin goes on the site wrapper (#scene: the header, the outlet and the world's page layer), never on
   <html>, whose data-theme the site's theme owns. The site's lock list keeps meaning, chain kinds, networks
   and the record light out of every skin.

   A real card is the signed-in identity's PVA on the chain (chainCard below; CHAIN-BUILD.md). For review, a
   sample still comes in by the address: ?skin-sample=27|263|512 (the NFT session's three samples) tries one on
   for that page. Record 009 is never shown on the site.
   A card the wearer keeps is held on this device by js/nft/wear.js (DefxnWear), after Ark UI's confirm; see
   "a card the wearer holds" below. Nothing else is stored. */
var DefxnSkinSite = (function () {
  'use strict';

  var NFT = 'js/nft/';   /* the recipe pieces the site needs (owner, 2026-10-24: promoted from docs/home-redesign/nft/, one copy) */
  var RECIPE = ['skin-bundle.js', 'cards-data.js', 'traits.js', 'card-chrome.js', 'card-record.js', 'grid-look.js', 'timeline.js', 'skin-package.js', 'skin-recipe.js'];   /* before the recipe: grid-look.js derives recipe.gridLook (docs/home-redesign/GRID-LOOK.md), timeline.js recipe.arrival, skin-package.js the portable skin text (DefxnSkinPackage) */
  var CHUNK = 'js/ark/vendor/ark-kit-skin.js';
  /* the CMS skin policy, the rules switched off over DefxnSkinParts.OFF (the Skin lab saves it as FLX); it decodes with
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
    return chain.then(skinLayer);
  }
  /* what any skin needs, a record's or a held package's: the CMS policy and Ark UI's skin layer, not the NFT engine */
  function skinLayer() {
    var chain = Promise.resolve().then(function () {
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
     world on every route; that is withdrawn.) The skin's chrome is unaffected. */
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
  /* Ark UI dresses a large page in ~8 ms slices after applyArkSkin returns (report.pending), and sends ark:skin-report once
     every part is dressed. The arrival waits for that, so every piece exists when it moves; never longer than 1.5 s. */
  function settled(root, res) {
    if (!res || !res.report || !res.report.pending) return Promise.resolve();
    return new Promise(function (resolve) {
      var timer = setTimeout(done, 1500);
      function done() { clearTimeout(timer); root.removeEventListener('ark:skin-report', done); resolve(); }
      root.addEventListener('ark:skin-report', done);
    });
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
    if (!reading()) return Promise.resolve();   /* the ring world owns the page: the card's world could not show, so its 3D art never loads */
    var mine = dress = { record: record };
    sceneLayer(mine);
    return Promise.all([art(), ArkUI.loadSheet('css/skin-site.css')]).then(function () { return load(NFT + 'scene.js'); }).then(function () {
      if (mine !== dress) return;
      var layer = mine.layer;
      mine.world = DefxnScene.world(layer, record, { leanOn: wrapper() });   /* the layer lets the pointer through: lean on the scene */
      mine.world.ready.then(function (canvas) { if (mine === dress && canvas) { mine.drawn = true; clip(layer, reading()); } });
      /* the art's beat, once what it moves has painted */
      mine.world.ready.then(function () { if (mine === dress) playArrival(wrapper(), timeline, true); }, function () {});
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
         card's own rules reach every part, less what the site switches off (wear() below) */
      var root = wrapper(), skin = DefxnSkin.arkSkin(recipe, { keys: partKeys(), derive: ArkKitSkin.deriveSkinTokens });
      var res = wear(root, skin, recipe.family, given, { recipe: recipe });
      root.dispatchEvent(new CustomEvent('defxn:skin', { bubbles: true, detail: { on: true, record: recipe.record, theme: { vars: skin.tokens } } }));
      /* Two beats, so wearing a card never stalls the page (the NFT session measured 2.5 s long tasks when the 3D art
         loaded during the arrival): the pieces arrive first (recipe.arrival, the card's own timeline, js/nft/timeline.js,
         motion only, at most 1.2 s), and only then does the heavy art load and paint, with the art's own beat when it is
         ready. The same card again (a CMS policy toggle) keeps its art and does not replay its arrival. */
      var fresh = !dress || dress.record !== record;
      var beat = fresh ? settled(root, res).then(function () { return playArrival(root, recipe.arrival, false); }) : Promise.resolve();
      if (fresh) beat.then(function () { if (on && on.recipe === recipe) dressUp(record, recipe.arrival); });
      return res;
    });
  }
  /* The one way a skin reaches the page, from a record or a held package: the site's own table gives each part its
     rules: the card's own, sent to every part Ark UI names (the owner's decision, 2026-10-24), less what the site, the
     CMS policy and the card family's switch off (DefxnSkinParts.policy), and Ark UI holds it to the site's locks and
     contrast rules. A second way would dress parts the site forbids. */
  /* every part key Ark UI names: its style-schema parts and its block parts. With no root given, a part that mounts
     later (the mega dropdown, a popover) is reached too; Ark UI keeps decorations out of elements that cannot hold them. */
  function partKeys() { return Array.from(ArkKitSkin.arkSkinPartKeys()).concat(Object.keys(ArkKitSkin.ARK_SKIN_BLOCK_PARTS || {})); }
  function wear(root, skin, family, given, state) {
    var rules = DefxnSkinParts.policy(given, family);
    skin.rules = DefxnSkinParts.shapeRules(DefxnSkinParts.switchOff(skin.rules, rules.off), ArkKitSkin.arkSkinFamilyOfName);
    var stopParts = DefxnSkinParts.watch(root);
    var res = ArkKitSkin.applyArkSkin(root, skin, { locks: DefxnSkinParts.LOCKS, contrast: rules.contrast });   /* held to the site's own contrast rule, and any the policy adds */
    if (!res.ok) { stopParts(); throw new Error('Ark UI refused the skin: ' + (res.errors || []).join('; ')); }
    on = Object.assign({ root: root, stopParts: stopParts, recipe: null, card: null }, state);
    return res;
  }
  /* A card the wearer holds on this device (js/nft/wear.js, DefxnWear): its skin package (js/nft/skin-package.js),
     worn through the same site table as a record. It needs no NFT engine, so it paints no art: the page keeps its own
     background and the account button its own icon. Resolves to { result, arrival }, the shape DefxnWear.use() takes. */
  function applyPackage(text, options) {
    return skinLayer().then(function () {
      if (!window.DefxnSkinPackage) throw new Error('a held card needs ' + NFT + 'skin-package.js, and it is not loaded');
      var data = DefxnSkinPackage.decode(text), n = /(?:^|-)N([1-9][0-9]*)(?:-|$)/.exec(data.record || ''), o = /(?:^|-)O([0-9a-f]{64})(?:-|$)/.exec(data.record || '');
      if (!n && !o) throw new Error('this skin package names no card number and no object id, so the site cannot check it');
      if (n && Number(n[1]) === 9) throw new Error('card 9 is never shown on this site');
      undress(); strip();
      var root = wrapper(), skin = DefxnSkinPackage.toArkSkin(data, { keys: partKeys(), derive: ArkKitSkin.deriveSkinTokens });
      var res = wear(root, skin, data.family || null, options && options.policy, { card: n ? { number: n[1], record: data.record } : { object: o[1], record: data.record } });
      root.dispatchEvent(new CustomEvent('defxn:skin', { bubbles: true, detail: { on: true, record: data.record, theme: { vars: skin.tokens } } }));
      return { result: res, arrival: settled(root, res).then(function () { return playArrival(root, data.arrival, false); }) };
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
     chrome and the site table's rules, applied by Ark UI to `pane`. The page's own skin, the wearer's menu and the card's world
     are not touched, and no defxn:skin event fires. Resolves to a function that takes the look off exactly. */
  function preview(record, pane, options) {
    return needs().then(function () { return DefxnSkin.recipe(record, { locked: DefxnSkinParts.LOCKS }); }).then(function (recipe) {
      var skin = DefxnSkin.arkSkin(recipe, { keys: partKeys(), derive: ArkKitSkin.deriveSkinTokens }), rules = DefxnSkinParts.policy(options && options.policy, recipe.family);
      skin.rules = DefxnSkinParts.shapeRules(DefxnSkinParts.switchOff(skin.rules, rules.off), ArkKitSkin.arkSkinFamilyOfName);
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
  /* The review way in: ?skin-sample=<number> tries one of the NFT session's samples on for this page (DefxnWear.tryOn:
     nothing is kept, a reload drops it). Keeping it goes only through the seal's "Wear it", which asks first. Its art
     dresses the page once the skin's pieces have arrived. */
  function fromAddress() {
    var n = new URLSearchParams(location.search).get('skin-sample');
    if (!n) return null;
    return sample(n).then(tryRecord).catch(function (e) { console.error('Skin not applied (' + e.message + '). The site keeps its own look.'); });
  }
  /* tries one card's record on for this page: a sample's, or the wearer's PVA (chainCard). Nothing is kept until
     the seal's "Wear it", which asks first. */
  function tryRecord(rec) {
    return needs().then(function () {
      return Promise.all([DefxnSkin.recipe(rec, { locked: DefxnSkinParts.LOCKS }), wearing()]).then(function (got) {
        var recipe = got[0], W = got[1];
        return W.tryOn(wrapper(), W.of(recipe, rec)).then(function (res) {
          res.arrival.then(function () { if (on && on.card && (rec.objectId ? on.card.object === rec.objectId : Number(on.card.number) === Number(rec.genesisId))) dressUp(rec, recipe.arrival); });
          return res;
        });
      });
    });
  }

  /* ---------- a card the wearer holds (js/nft/wear.js, DefxnWear: the NFT session's) ----------
     A wearer keeps a card on this device, for this site's address only, after Ark UI's confirm (DefxnWear.offer). Every
     page puts it back on (restoreHeld) through the site's own table: DefxnWear.use(holder) sends each wear to
     applyPackage. While a card is on, the header's zone holds the wearer's menu (js/nft/user-navbar.js): one control, the
     card's seal in its own inks, on every page and before sign-in, and in it the site check and the card's actions. A copy
     of the site at another address cannot read this storage, so it cannot show the card. That is a seal, not a proof:
     the site check (the page's name, verified by gateway/resolve-name.js) and the site's key stay the proof. A visitor
     who holds no card loads none of this. */
  var HELD_KEY = 'defxn.wear';   /* DefxnWear.KEY, read before wear.js loads; tests/skin-site.cjs holds the two equal */
  var WEAR = [['timeline.js', 'DefxnTimeline'], ['skin-package.js', 'DefxnSkinPackage'], ['wear.js', 'DefxnWear'], ['site-check.js', 'DefxnSiteCheck'], ['user-navbar.js', 'DefxnUserNav']];
  var CONFIRM = 'js/ark/vendor/ark-kit-confirm.js';   /* Ark's confirm alone: the public kit refuses arkConfirm */
  var holder = {
    apply: function (el, text) { return applyPackage(text); },
    remove: function () { remove(); },
    confirm: function (opts) { return (window.ArkKitConfirm ? Promise.resolve() : load(CONFIRM)).then(function () { return ArkKitConfirm.arkConfirm(opts); }); }
  };
  var wearReady = null, zone = null;
  function wearing() {
    if (!wearReady) {
      wearReady = WEAR.reduce(function (c, f) { return c.then(function () { return window[f[1]] ? null : load(NFT + f[0]); }); }, Promise.resolve())
        .then(skinLayer).then(function () { return Promise.all([ArkUI.loadSheet('css/nft-card.css'), ArkUI.loadSheet('css/skin-site.css')]); }).then(function () {
          DefxnWear.use(holder);
          document.addEventListener('defxn:wear', userNav);
          if (window.ArkUI && ArkUI.pageRouter) ArkUI.pageRouter.onMount(userNav);
          userNav();
          return DefxnWear;
        });
      wearReady.catch(function () { wearReady = null; });   /* a failed load may be tried again */
    }
    return wearReady;
  }
  /* The wearer's menu while a card is on, in its own zone just before the account button, and gone when none is. This
     file makes the zone (js/resolvers/header.js has no byte room left in its every-route budget, tests/header-ark-parts.cjs)
     and hands it to DefxnUserNav, which never searches the bar. The menu opens through the header's own lazy popover
     helper, lazyHeaderPopover (a global function of header.js). The header may be built after this file runs or rebuilt,
     so this runs again on each wear change and route. */
  function userNav() {
    var link = wrapper().querySelector('.ark-header .header-menu') || wrapper().querySelector('.header-account-link'), worn = !!DefxnWear.current;
    if (zone && (!zone.host.isConnected || !worn)) { zone.made.remove(); zone.host.remove(); zone = null; }
    if (!link || !worn || zone) return;
    var host = link.parentNode.insertBefore(document.createElement('div'), link);
    host.className = 'header-user-zone';
    zone = { host: host, made: DefxnUserNav.mount(host, wrapper(), { nav: wrapper().querySelector('.ark-header'), name: siteName(location.host), check: checkName, popover: window.lazyHeaderPopover, cards: menuCards }) };
  }
  /* the wearer's own skins as menu rows, only while the card on is the wearer's PVA: [{ label, wear() }] */
  function menuCards() {
    var c = DefxnWear.current;
    if (!c || !c.object) return Promise.resolve([]);
    return chainCards().then(function (cards) {
      if (!cards || cards.record.objectId !== c.object) return [];
      var rows = [{ label: 'your PVA', wear: function () { return tryRecord(cards.record); } }];
      return rows.concat(cards.skins.map(function (s) { return { label: 'skin ' + s.label, wear: function () { return tryRecord(withSkin(cards.record, s.skin)); } }; }));
    }).catch(function (e) { console.info('[skin-site] Your skins were not read (' + e.message + ').'); return []; });
  }
  /* The page's mesh name, by the names system's own rule (ops/scripts/names/system-names.mjs labelOfHost): defxn.com
     is defxn.fxn and <label>.defxn.com is <label>.fxn. Any other host has none. tests/skin-site.cjs holds the two equal. */
  function siteName(host) {
    var bare = String(host || '').replace(/:\d+$/, '').toLowerCase(), apex = 'defxn.com';
    if (bare === apex) return 'defxn.fxn';
    if (bare.slice(-apex.length - 1) !== '.' + apex) return null;
    var label = bare.slice(0, -apex.length - 1);
    return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label) ? label + '.fxn' : null;
  }
  /* the one verified read of a name (gateway/resolve-name.js, the shared verifier), with the gateway's own nodes and
     pinned genesis key; loaded only when the check runs. Its result goes to the site check unchanged: no cache here. */
  function checkName(name) {
    return Promise.all([import('/gateway/resolve-name.js'), import('/gateway/name-config.js')]).then(function (m) {
      return m[0].resolveName({ name: name, nodes: m[1].NAME_NODES, genesisPubHex: m[1].GENESIS_PUB_HEX });
    });
  }
  function heldText() { try { return localStorage.getItem(HELD_KEY); } catch (e) { return null; } }
  var restoring = null;
  function restoreHeld() {   /* once per page: a second call gets the first one's promise */
    if (restoring || !heldText()) return restoring;
    return (restoring = wearing().then(function (W) { return W.restore(wrapper()); }).catch(function (e) {
      console.error('The card kept on this device was not put back on (' + e.message + '). The site keeps its own look. Wear the card again from Account to replace it.');
    }));
  }
  /* The signed-in identity's own cards: its PVA and its skins, read from the node the wallet uses
     (js/ark/dense-wire-wallet.mjs, resolveWireUrl) and verified in this browser (js/ark/chain-cards.mjs, the one
     object verifier). Resolves to { record, skins: [{ id, label, skin }], unread: [{ id, why }] }: record is the PVA's
     card record (DEFXN_TRAITS.objectRecord), each skin's look is read from its own pointer
     (DefxnCardRecord.skin.fromPointer), and a skin this page cannot read is named in unread, never shown. Null with
     no identity or no PVA yet; rejects naming what failed. Read once per page. A visitor who is not signed in loads
     none of it. */
  var cardsRead = null;
  function at(path) { return new URL((location.protocol === 'file:' ? '' : '/') + path, document.baseURI).href; }
  function chainCards() {
    var who = window.ArkUI && ArkUI.localIdentity && ArkUI.localIdentity.current();
    if (!who) return Promise.resolve(null);
    if (cardsRead) return cardsRead;
    cardsRead = Promise.all([import(at('js/ark/chain-cards.mjs')), import(at('js/ark/dense-wire-wallet.mjs'))]).then(function (m) {
      var key = m[0].identityKeyHex(who);
      return key ? m[0].readChainCards({ url: m[1].resolveWireUrl(), key: key }) : null;
    }).then(function (read) {
      if (!read) return null;
      if (read.kind !== 'cards') throw new Error(read.kind === 'unreachable' ? 'no node answered (' + read.detail + ')' : read.reason);
      if (!read.pva) return null;
      return needs().then(function () {
        var skins = [], unread = [];
        read.skins.forEach(function (o) {
          try {
            var sk = DefxnCardRecord.skin.fromPointer(o.pointer), names = Object.keys(sk).map(function (k) { return sk[k]; });
            skins.push({ id: o.id, skin: sk, label: names.slice(0, 2).join(' + ') + (names.length > 2 ? ' + ' + (names.length - 2) + ' more' : '') });
          } catch (e) { unread.push({ id: o.id, why: e.message }); }
        });
        return { record: DEFXN_TRAITS.objectRecord(read.pva, 'DEFXN'), skins: skins, unread: unread };
      });
    });
    cardsRead.catch(function () { cardsRead = null; });   /* a failed read may be tried again */
    return cardsRead;
  }
  function chainCard() { return chainCards().then(function (c) { return c && c.record; }); }
  /* the wearer's PVA with one of its skins on, as a record to try (tryRecord) */
  function withSkin(record, sk) { return Object.assign({}, record, { skin: DEFXN_TRAITS.skinText(sk) }); }
  /* Mints a skin for the signed-in identity (js/ark/chain-cards.mjs mintSkin: the full signing review first). `who`
     is the unlocked Auth Kit identity (ArkUI.accountSession.current()). The next chainCards() reads it back. */
  function mintSkin(who, sk) {
    var pointer;
    try { pointer = needsSync().skin.toPointer(sk); } catch (e) { return Promise.reject(e); }
    return Promise.all([import(at('js/ark/chain-cards.mjs')), import(at('js/ark/dense-wire-wallet.mjs'))]).then(function (m) {
      var wire = new m[1].WalletWire(m[1].resolveWireUrl());
      return m[0].mintSkin({ who: who, wire: wire, pointer: pointer }).then(function (res) { wire.close(); cardsRead = null; return res; }, function (e) { wire.close(); throw e; });
    });
  }
  /* A skin trade, one step per device (js/ark/chain-cards.mjs acceptSkin and giveSkin: the full signing review
     first). `who` is the unlocked Auth Kit identity. Each resolves to the step's result, or a refusal by name. */
  function tradeStep(step, args) {
    return Promise.all([import(at('js/ark/chain-cards.mjs')), import(at('js/ark/dense-wire-wallet.mjs'))]).then(function (m) {
      var wire = new m[1].WalletWire(m[1].resolveWireUrl());
      return m[0][step](Object.assign({ wire: wire }, args)).then(function (res) { wire.close(); cardsRead = null; return res; }, function (e) { wire.close(); throw e; });
    });
  }
  /* price (FXN) and days make it a priced sale: the taker's FXN is held, and paid with the owner's move */
  function acceptSkin(who, id, price, days) { return tradeStep('acceptSkin', { who: who, id: id, price: price || null, days: days || 3 }); }
  function endSale(who, edge) { return tradeStep('endSale', { who: who, edge: edge }); }
  /* publish(walletKey) -> Promise of true when that private wallet's link is now on the chain (the page's own
     Publish link step, with its warning) */
  function activatePva(who, publish) { return tradeStep('activatePva', { who: who, publish: publish || null }); }
  function giveSkin(who, id, edge) { return tradeStep('giveSkin', { who: who, id: id, edge: edge }); }
  function needsSync() {
    if (!window.DefxnCardRecord || !DefxnCardRecord.skin) throw new Error('A skin needs ' + NFT + 'card-record.js, and it is not loaded. Load the recipe first.');
    return DefxnCardRecord;
  }
  /* the held card's number from its first line, for a page that chooses what to draw before wear.js loads (/account
     draws the held card so its seal can take it off). Only a review sample; DefxnWear.restore still checks the whole
     text and drops one this site did not write. */
  function heldNumber() { var m = /^DFXNWEAR1-N([1-9][0-9]{0,8})-/.exec(heldText() || ''); return m && SAMPLES.indexOf(m[1]) >= 0 ? m[1] : null; }
  /* The card's components (js/nft/card-components.js: a banner, a stamp or a nameplate made from the card that is on), for a
     page that places a slot (the Card slot block, js/resolvers/blocks/rblock-card-slot-v1.js). Loaded once, and only after a card
     is on: it rides on what wearing() already loaded (the timeline, the skin package, the wear and the skin layer). Resolves to
     DefxnCardComponents; a failed load may be tried again. A visitor who wears no card never calls it. */
  var cardReady = null;
  function cardComponents() {
    if (!cardReady) {
      cardReady = wearing().then(function () { return window.DefxnCardComponents ? null : load(NFT + 'card-components.js'); }).then(function () {
        if (!window.DefxnCardComponents) throw new Error(NFT + 'card-components.js loaded and defined no DefxnCardComponents');
        return window.DefxnCardComponents;
      });
      cardReady.catch(function () { cardReady = null; });
    }
    return cardReady;
  }
  /* the full seal (the card, and Wear it, Stop trying or Take off) in an identity zone such as /account's */
  function sealIn(host) { return wearing().then(function (W) { return W.seal(host.appendChild(document.createElement('div')), wrapper()); }); }   /* the seal names its own box, so host keeps its class */
  /* Ark UI's report on the skin that is on: each part, the rules it kept, skipped or had taken back, and the tokens
     the contrast rules moved (getArkSkinReport; the same data rides the bubbling `ark:skin-report` event). */
  function report() { return on && window.ArkKitSkin && ArkKitSkin.getArkSkinReport ? ArkKitSkin.getArkSkinReport(on.root) : undefined; }
  /* The name a skin's rules use for a part the report names, or null when Ark UI has no rules name for it. One spelling per part: a schema key as Ark UI writes it (CARD, PRIMARY|BUTTON), and a block part in upper case
     with no hyphen (tabs-list -> TABSLIST, section-header -> SECTIONHEADER), the spelling DefxnSkinParts.OFF and the
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

  return { apply: apply, applyPackage: applyPackage, remove: remove, preview: preview, restoreHeld: restoreHeld, heldNumber: heldNumber, chainCard: chainCard, chainCards: chainCards, withSkin: withSkin, mintSkin: mintSkin, acceptSkin: acceptSkin, giveSkin: giveSkin, endSale: endSale, activatePva: activatePva, tryRecord: tryRecord, sealIn: sealIn, cardComponents: cardComponents, siteName: siteName, HELD_KEY: HELD_KEY, sample: sample, fromAddress: fromAddress, report: report, ruleKey: ruleKey, art: art, SAMPLES: SAMPLES.slice(),
    active: function () { return on ? on.recipe || on.card : null; } };
})();
if (typeof module === 'object' && module.exports) module.exports = DefxnSkinSite;
else if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', function () { DefxnSkinSite.fromAddress() || DefxnSkinSite.restoreHeld(); });
/* The local skin test in the settings panel (js/settings/skin-test.js), on this computer's own addresses only: the public
   site never loads it. */
if (typeof document !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\])$|\.localhost$/.test(location.hostname)) {
  (function () { var s = document.createElement('script'); s.src = 'js/settings/skin-test.js'; s.defer = true; document.head.appendChild(s); })();
}
