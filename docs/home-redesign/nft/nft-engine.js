/* DEFXN NFT engine: a site that loads this script reskins itself in its visitor's card.

   The visitor's card (a record, with any skin it wears) becomes the site's theme. The engine:
     1. sets the Ark UI colour tokens on the page root, in the SDK's own names and form (@deadark/sdk
        theme: --primary, --accent, --surface ... as "H S% L%" channels, plus --color-<name> wrappers),
        so every part of the site that already reads those tokens takes the card's colours;
     2. dresses each element the site marks with data-nft in the card's chrome (world.js draws them):
          data-nft="panel"     the card's frame and corners laid over the element
          data-nft="button"    the card's colours; an outline button also gets its corners
          data-nft="heading"   the card's ornament strip after the heading text
          data-nft="divider"   the card's divider, drawn across the element
          data-nft="badge"     a badge for data-field (role, status, network, ...) in the tag's shape
          data-nft="bullets"   the card's emblem before each list item
          data-nft="name"      the visitor's name with the emblem
          data-nft="avatar"    a square cut of the card's 3D art (data-size in px)
          data-nft="banner"    the card's 3D art in a wide strip
          data-nft="card"      the whole card
   DefxnEngine.restore(root) takes every piece away again and puts back what the site had, so a guest
   sees the site's own look. Only marked elements change: the site decides where a visitor shows.

   GAME MODE. DefxnEngine.enter(root, record) does all of the above and turns the site into the
   visitor's world (DefxnEngine.leave(root) is restore):
     world     the card's 3D art (backdrop, aura, signal, particles and a faint mark) fills the back of
               the site, drawn once, and leans a little toward the pointer
     HUD       the card's corner at the site's four corners, and the identity tag with the card's tier
               and rarity score at the top
     loadout   the card's twelve layers as twelve slots along the bottom, each with its rarity tier
               (traits.js derives the tiers from the layer weights)
     cursor    the card's emblem
     boot      on entry, each piece steps in once in the card's look; then everything stops
   opts.world / hud / loadout / cursor: false leaves that piece out (a page with its own 3D world keeps
   it). The root hears "defxn:skin" (detail { on, record, theme }) when a skin lands and when it leaves.
   Meaning colours (DefxnSkin.MEANING) and opts.locked stay the site's. Tokens go into ONE scoped rule,
   [data-defxn-skin="<id>"], and nothing writes an inline style on the wrapper (skin contract v2).
   Nothing loops: the world is drawn once, the lean follows the pointer and stops with it, and the boot
   ends. With prefers-reduced-motion there is no boot and no lean.

   Nothing is sent anywhere: the card is drawn from its record, in the page. Needs world.js and what it
   needs (card.js, art3d.js, traits.js, the layer bundles), and js/nft/scene.js for the world. */
(function () {
  'use strict';

  var T = window.DEFXN_TRAITS, W = window.DefxnWorld, C = window.DefxnCard;
  var KINDS = ['panel', 'button', 'heading', 'divider', 'badge', 'bullets', 'name', 'avatar', 'banner', 'card'];
  var STATE = typeof WeakMap === 'function' ? new WeakMap() : null;

  function stashChildren(node) {
    var f = document.createDocumentFragment();
    while (node.firstChild) f.appendChild(node.firstChild);
    return f;
  }

  // an element's class and style exactly as they were, put back last, so restore leaves no trace
  function keepAttrs(node) {
    var cls = node.getAttribute('class'), sty = node.getAttribute('style');
    return function () {
      // read first: the browser writes an inline style's text into the attribute lazily, and a
      // pending write after the remove would put back an empty style=""
      node.getAttribute('style'); node.getAttribute('class');
      if (cls == null) node.removeAttribute('class'); else node.setAttribute('class', cls);
      if (sty == null) node.removeAttribute('style'); else node.setAttribute('style', sty);
    };
  }

  function dressOne(node, th, record) {
    var kind = node.getAttribute('data-nft'), undo = [keepAttrs(node)];
    function add(child, before) { if (!child) return; if (before) node.insertBefore(child, node.firstChild); else node.appendChild(child); undo.push(function () { if (child.parentNode) child.parentNode.removeChild(child); }); }
    function replace(child) {
      var kept = stashChildren(node);
      if (child) node.appendChild(child);
      undo.push(function () { while (node.firstChild) node.removeChild(node.firstChild); node.appendChild(kept); });
    }
    switch (kind) {
      case 'panel': {
        if (getComputedStyle(node).position === 'static') node.classList.add('nft-pos');
        // the card's frame and corners replace the panel's own border (restored on leave by keepAttrs)
        if (th.chrome.frame || th.chrome.corner) node.classList.add('nft-edge');   // the card's frame is its border
        var deco = W.dress(node, th, { scale: parseFloat(node.getAttribute('data-nft-scale')) || 0.34 });
        undo.push(function () { if (deco.parentNode) deco.parentNode.removeChild(deco); });
        break;
      }
      case 'button': {
        var primary = node.hasAttribute('data-primary');
        if (!primary && th.chrome.corner) {
          if (getComputedStyle(node).position === 'static') node.classList.add('nft-pos');
          node.classList.add('nft-edge');                       // the corners are its border
          var d = W.dress(node, th, { frame: false, scale: 0.26, inset: 0 });
          undo.push(function () { if (d.parentNode) d.parentNode.removeChild(d); });
        }
        break;
      }
      case 'heading': add(W.ornament(th, { ornH: parseFloat(node.getAttribute('data-orn-height')) || 22, ornW: 150 })); break;
      case 'divider': replace(W.divider(th)); break;
      case 'badge': {
        // the tag shows several fields at once: draw it once, and only a chip for a field it does not show
        var field = node.getAttribute('data-field') || 'role', shown = W.fieldsOf(th.chrome.tag).indexOf(field) >= 0;
        if (shown && th._tagPlaced) { replace(null); break; }
        if (shown) th._tagPlaced = true;
        replace(shown ? W.tag(th) : W.chip(th, field));
        break;
      }
      case 'bullets':
        Array.prototype.forEach.call(node.children, function (li) {
          var g = W.emblem(th, 12);
          if (!g) return;
          g.setAttribute('aria-hidden', 'true'); g.classList.add('nft-bullet');
          li.insertBefore(g, li.firstChild);
          undo.push(function () { if (g.parentNode) g.parentNode.removeChild(g); });
        });
        break;
      case 'name': replace(W.nameLine(th, { glyph: parseFloat(node.getAttribute('data-glyph')) || 20, text: record.name || '' })); break;
      case 'avatar': replace(W.avatar(th, parseFloat(node.getAttribute('data-size')) || 64)); break;
      case 'banner': replace(W.banner(th)); break;
      case 'card': { var holder = document.createElement('div'); replace(holder); C.render(holder, record); break; }
      default: return null;
    }
    node.classList.add('nft-on');
    undo.push(function () { node.classList.remove('nft-on'); });
    return undo;
  }

  // tokens a skin never sets: their colour says something true about the site. The list lives in
  // skin-recipe.js (DefxnSkin.MEANING); a product adds its own with opts.locked (Ark UI's locks).
  var SKIN_N = 0;
  // a skin's rule, scoped to the wrapper by its data-defxn-skin id: no inline style on the wrapper
  function scopedRule(id, decls) {
    var st = document.createElement('style');
    st.setAttribute('data-defxn-skin', id);
    st.textContent = '[data-defxn-skin="' + id + '"]{' + decls.join(';') + '}';
    document.head.appendChild(st);
    return st;
  }

  // the site hears a skin land or leave on its root: event "defxn:skin", detail { on, record, theme }
  function announce(root, on, record, th) {
    var ev;
    try { ev = new CustomEvent('defxn:skin', { bubbles: true, detail: { on: on, record: record || null, theme: th || null } }); }
    catch (e) { ev = document.createEvent('CustomEvent'); ev.initCustomEvent('defxn:skin', true, false, { on: on, record: record || null, theme: th || null }); }
    root.dispatchEvent(ev);
  }

  function reskin(root, record, opts) {
    opts = opts || {};
    restore(root);
    var traits = T.pick(record), th = W.theme(traits, record), undo = [keepAttrs(root)];
    // 1. the tokens, in the SDK's names: channels, and the hsl() wrappers the SDK also writes, in ONE
    //    scoped rule (skin contract v2). Meaning tokens and the product's locked tokens are skipped,
    //    and the console names each locked one.
    var id = 's' + (++SKIN_N), vars = window.DefxnSkin.siteTokens(th.vars, opts.locked), decls = [];
    (opts.locked || []).forEach(function (k) { if (k in th.vars) console.info('The NFT skin leaves ' + k + ' to the site: the site locks it.'); });
    Object.keys(vars).forEach(function (k) {
      decls.push(k + ':' + vars[k]);
      if (/^--[a-z-]+$/.test(k) && !/^--w-/.test(k)) decls.push('--color-' + k.slice(2) + ':hsl(var(' + k + '))');
    });
    if (getComputedStyle(root).position === 'static' && opts.game) decls.push('position:relative');
    var rule = scopedRule(id, decls), prevSkin = root.getAttribute('data-defxn-skin');
    root.setAttribute('data-defxn-skin', id);
    undo.push(function () {
      if (rule.parentNode) rule.parentNode.removeChild(rule);
      if (prevSkin == null) root.removeAttribute('data-defxn-skin'); else root.setAttribute('data-defxn-skin', prevSkin);
    });
    th._skinId = id; th._rule = rule;
    var theme0 = root.getAttribute('data-theme');
    root.setAttribute('data-theme', 'nft');
    root.classList.add('w-world');
    undo.push(function () { if (theme0) root.setAttribute('data-theme', theme0); else root.removeAttribute('data-theme'); root.classList.remove('w-world'); });
    // 2. the marked pieces
    Array.prototype.forEach.call(root.querySelectorAll('[data-nft]'), function (node) {
      var u = dressOne(node, th, record);
      if (u) undo = undo.concat(u);
    });
    if (STATE) STATE.set(root, undo.reverse()); else root._nftUndo = undo.reverse();
    if (!opts.quiet) announce(root, true, record, th);
    return th;
  }

  function restore(root) {
    var undo = STATE ? STATE.get(root) : root._nftUndo;
    if (!undo) return;
    undo.forEach(function (fn) { try { fn(); } catch (e) { console.error('The NFT engine could not take a piece back: ' + e.message); } });
    if (STATE) STATE.delete(root); else root._nftUndo = null;
    announce(root, false);
  }

  /* ---------- game mode ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var TIER_HUE = ['0 0% 70%', '168 70% 55%', '268 80% 72%', '40 95% 62%'];   // Common, Rare, Epic, Legendary

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  // the world: the card's 3D art behind the whole site, drawn once per size (js/nft/scene.js)
  function world(root, th, record) {
    // the demo's world keeps the faint mark (all five art layers); a site's default leaves it out
    return window.DefxnScene.world(root, record, { picks: th.picks, only: window.DefxnScene.ART, leanOn: root }).remove;
  }

  // the HUD: the corner at the four corners of the site, and the identity line at the top
  function hud(root, th, record) {
    var box = el('div', 'nft-hud'), traits = th.traits, T = window.DEFXN_TRAITS;
    box.setAttribute('aria-hidden', 'true');
    if (th.chrome.corner) ['tl', 'tr', 'bl', 'br'].forEach(function (k) {
      var svg = C.chromeSvg(th.chrome.corner, record, traits);
      svg.setAttribute('class', 'nft-hud-corner ' + k); box.appendChild(svg);
    });
    var id = el('div', 'nft-hud-id'), top = traits.list.reduce(function (m, e) { return Math.max(m, e.tier); }, 0);
    var tier = el('span', 'nft-tier', T.TIERS[top]); tier.style.setProperty('--tier', TIER_HUE[top]);
    id.appendChild(el('b', null, '#' + (record.genesisId || traits.number || '')));
    id.appendChild(tier);
    id.appendChild(el('span', null, Math.round(T.score(traits.list)) + ' bits'));
    if (traits.skinned) id.appendChild(el('span', 'nft-worn', 'skin'));
    box.appendChild(id);
    root.appendChild(box);
    return function () { if (box.parentNode) box.parentNode.removeChild(box); };
  }

  // the loadout: one slot per layer, like equipment
  function loadout(root, th, record, opts) {
    var bar = el('div', 'nft-loadout'), traits = th.traits, T = window.DEFXN_TRAITS;
    bar.setAttribute('role', 'list'); bar.setAttribute('aria-label', 'The card\u2019s loadout');
    T.LAYERS.forEach(function (layer) {
      var e = traits.picks[layer.key], slot = el('div', 'nft-slot' + (traits.changed.indexOf(layer.key) >= 0 ? ' is-worn' : ''));
      slot.setAttribute('role', 'listitem');
      slot.style.setProperty('--tier', TIER_HUE[e.tier]);
      slot.appendChild(el('span', 'nft-slot-layer', layer.name));
      slot.appendChild(el('b', null, e.name));
      slot.appendChild(el('span', 'nft-slot-tier', T.TIERS[e.tier]));
      slot.title = layer.name + ': ' + e.name + ', ' + T.TIERS[e.tier] + ', ' + (Math.round(e.share * 10) / 10) + '% of cards';
      bar.appendChild(slot);
    });
    if (opts && opts.loadoutHref) { var a = el('a', 'nft-slot nft-slot-edit', 'Change loadout'); a.href = opts.loadoutHref; bar.appendChild(a); }
    root.appendChild(bar);
    return function () { if (bar.parentNode) bar.parentNode.removeChild(bar); };
  }

  // the cursor: the card's emblem, drawn at 24 px with its hot spot in the middle
  function cursor(root, th, record) {
    if (!th.chrome.emblem) return function () {};
    var svg = C.chromeSvg(th.chrome.emblem, record, th.traits);
    svg.setAttribute('xmlns', NS); svg.setAttribute('width', '22'); svg.setAttribute('height', '25');
    var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
    th._rule.textContent += '[data-defxn-skin="' + th._skinId + '"]{cursor:url("' + url + '") 11 12, crosshair}';
    return function () {};                                  // the rule goes with the skin
  }

  // opts.world / hud / loadout / cursor: false leaves that piece out. A page that has its own 3D world
  // passes world: false, and keeps its world, repainted in the skin's colours on "defxn:skin".
  function enter(root, record, opts) {
    opts = opts || {};
    var th = reskin(root, record, { locked: opts.locked, game: true, quiet: true }), undo = (STATE ? STATE.get(root) : root._nftUndo) || [];
    var more = [];
    if (opts.world !== false) more.push(world(root, th, record));
    if (opts.hud !== false) more.push(hud(root, th, record));
    if (opts.loadout !== false) more.push(loadout(root, th, record, opts));
    if (opts.cursor !== false) more.push(cursor(root, th, record));
    // the boot: each dressed piece steps in once, in order
    var i = 0;
    Array.prototype.forEach.call(root.querySelectorAll('.nft-on, .nft-hud, .nft-loadout'), function (n) { n.style.setProperty('--nft-i', i++); });
    if (!(reduce && reduce.matches)) {
      root.classList.add('nft-booting');
      var t = setTimeout(function () { root.classList.remove('nft-booting'); }, 1600);
      more.push(function () { clearTimeout(t); root.classList.remove('nft-booting'); });
    }
    root.classList.add('nft-game');
    more.push(function () { root.classList.remove('nft-game'); });
    // undo the game pieces first, then the reskin (the list runs from its start)
    var all = more.reverse().concat(undo);
    if (STATE) STATE.set(root, all); else root._nftUndo = all;
    announce(root, true, record, th);
    return th;
  }

  // the game mode's look: written once into the page, and read only inside .nft-game
  var css = [
    // the world sits under the site's content inside the root's own stacking context: no child of the
    // site changes its position or z-index
    '.nft-pos{position:relative}',
    '.nft-edge,.nft-edge:hover{border-color:transparent!important;box-shadow:none!important}',
    '.nft-game{isolation:isolate}',
    // the world's look is in css/nft-card.css (js/nft/scene.js); here only its place under the site
    '.nft-game > .nft-world{position:absolute!important;z-index:-1!important}',
    '.nft-game [data-nft="panel"]{background:hsl(var(--surface) / .78)!important;backdrop-filter:blur(6px)}',
    '.nft-hud{position:absolute!important;z-index:3!important;inset:0;pointer-events:none}',
    '.nft-hud-corner{position:absolute;width:64px;height:64px;overflow:visible}',
    '.nft-hud-corner.tl{left:8px;top:8px}.nft-hud-corner.tr{right:8px;top:8px;transform:scaleX(-1)}',
    '.nft-hud-corner.bl{left:8px;bottom:8px;transform:scaleY(-1)}.nft-hud-corner.br{right:8px;bottom:8px;transform:scale(-1,-1)}',
    '.nft-hud-id{position:absolute;left:50%;top:10px;transform:translateX(-50%);display:flex;gap:10px;align-items:center;padding:5px 12px;border-radius:999px;',
    '  background:hsl(var(--canvas) / .7);border:1px solid hsl(var(--border-default));font:500 10.5px/1 "JetBrains Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:hsl(var(--text-muted))}',
    '.nft-hud-id b{color:hsl(var(--text-strong));font-weight:500}',
    '.nft-tier{color:hsl(var(--tier))}',
    '.nft-worn{color:hsl(var(--accent))}',
    '.nft-loadout{position:relative;z-index:2;display:grid;grid-template-columns:repeat(13,minmax(0,1fr));gap:4px;padding:8px 14px 10px;border-top:1px solid hsl(var(--border-subtle));background:hsl(var(--canvas) / .82)}',
    '.nft-slot{min-width:0;display:grid;gap:2px;padding:5px 6px;border-radius:3px;border:1px solid hsl(var(--tier) / .28);background:hsl(var(--tier) / .06);font:400 9.5px/1.2 "JetBrains Mono",monospace}',
    '.nft-slot b{font-weight:500;font-size:10.5px;color:hsl(var(--text-strong));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.nft-slot-layer{letter-spacing:.14em;text-transform:uppercase;color:hsl(var(--text-faint))}',
    '.nft-slot-tier{color:hsl(var(--tier));letter-spacing:.08em}',
    '.nft-slot.is-worn{border-color:hsl(var(--accent) / .7)}',
    '.nft-slot-edit{--tier:var(--primary);align-content:center;text-align:center;color:hsl(var(--primary));text-decoration:none;letter-spacing:.1em;text-transform:uppercase}',
    '@media (prefers-reduced-motion:no-preference){',
    '  .nft-booting .nft-on,.nft-booting .nft-hud,.nft-booting .nft-loadout{animation:nft-boot .55s steps(5,end) both;animation-delay:calc(var(--nft-i,0) * 45ms)}',
    '  .nft-game [data-nft="panel"].nft-on > .w-deco{transition:transform .25s ease-out}',
    '  .nft-game [data-nft="panel"].nft-on:hover > .w-deco{transform:scale(1.012)}',
    '}',
    '@keyframes nft-boot{0%{clip-path:inset(0 0 100% 0);filter:brightness(2.2)}60%{filter:brightness(1.4)}100%{clip-path:inset(0 0 0 0);filter:none}}'
  ].join('\n');
  (function () { var st = document.createElement('style'); st.setAttribute('data-nft-engine', ''); st.textContent = css; document.head.appendChild(st); })();

  window.DefxnEngine = { reskin: reskin, restore: restore, enter: enter, leave: restore, KINDS: KINDS };
})();
