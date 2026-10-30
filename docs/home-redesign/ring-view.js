/* DEFXN mockup app: one chain of the network, opened from home (2026-10-23).

   Owner: "from the home page I want to see the identity chains, resolver chains, token chains, pool
   chains, and other network chains such as CR3TV and DeArk, and click them; each circle needs a
   space for its logo, empty until I give you the logos."
   Home: every ring can be clicked. Your ring opens your chain, the hub opens FXN, and any other
   ring opens this view: #/ring?i=<ring id> (ids in network-data.js). The camera flies to the ring,
   the ring rises out of the network and stays lit, and its logo slot grows at its centre. The page
   says what that kind of chain is, in the brief's words, and shows the logo's empty slot.

   REDUCTION TEST (ring)
   1 what one kind of chain is. 2 the kind's next step (Create your identity, See the resolvers,
   See the FXN supply, How a result is made). 3 the kind, its coin if it has one, what it holds.
   4 the other kinds (chips). 5 nothing; the lede on home names the kinds, this page explains one.
   6 nothing. 7 nothing more. 8-9 the ring rides in the address. 10 every ring but the two named
   networks says it shows a kind, not a live chain; the page reads with no 3D.
   The stage (the ring that rises) is the grammar world (js/world2/world2-board.mjs, 2026-10-30); this file is the words and the DOM.
   Loaded after stages.js and before app.js, so its words are ready before the app shows the view. */
(function () {
  'use strict';
  var N = window.DEFXN_NETWORK, S = window.DEFXNScene;
  var view = document.querySelector('.view[data-view="ring"]');
  if (!N || !view) return;
  var esc = window.DEFXNKitUI.esc, ID = N.IDS;
  function $(name) { return view.querySelector('[data-rf="' + name + '"]'); }
  /* the brief's words for each kind (defxn-concept.html, sections 1, 2 and 4) and its next step */
  var KINDS = {
    identity: { kind: 'Identity chain', title: 'Identity chain.', sub: 'One key signs it.',
      what: 'A person, a team or an app keeps its own history of signed records here.',
      also: 'A new record links to the one before it. Nothing is rewritten.', cta: ['Create your identity', '#/idstart'] },
    network: { kind: 'Network chain', what: 'A native network chain. Its coin lives here, with its own genesis.',
      also: 'Each network chain runs on the DEFXN kernel, with its own coin and its own genesis.', cta: ['How a result is made', '#/resolve'] },
    /* the hub is DEFXN, the base chain kernel (owner, 2026-10-24): it knows no currency; FXN is the first chain */
    hub: { kind: 'Base chain kernel', title: 'DEFXN.', sub: 'The base chain kernel.', what: 'The kernel every network chain runs on. It knows no currency.',
      also: 'FXN is the first chain built on it. DeArk and CR3TV are network chains on it too.', cta: ['Three layers: the base chain', '#/layers?s=0'] },
    resolver: { kind: 'Resolver chain', title: 'Resolver chain.', sub: 'A rulebook.',
      what: 'A resolver has its own chain. It reads signed records, applies its rules and signs the result.',
      also: 'Builders launch their own. Each one shows its grammar, its capabilities and who can change it.', cta: ['See the resolvers', '#/resolvers'] },
    token: { kind: 'Token ledger', title: 'Token ledger.', sub: 'Who held how much.',
      what: 'Each token keeps its own ledger: the history of who held how much.',
      also: 'A token lives inside one network chain. It is not a chain of its own.', cta: ['See the FXN supply', '#/fxn'] },
    pool: { kind: 'Pool chain', title: 'Pool chain.', sub: 'It signs each swap.',
      what: 'A pool signs each swap result on its own chain. It trades the two tokens it is joined to.',
      also: "A swap is two signed records: the trader's intent on the trader's own chain, and the pool's result on the pool's chain.", cta: ['How a result is made', '#/resolve'] },
    /* a network's coin ledger: the brief's ledger capability, "balances for each network's own native token" */
    ledger: { kind: 'Coin ledger', what: "Balances of the network's own coin, worked out from the chain's events.",
      also: 'It sits at the centre of its network chain. Every token ledger and pool of that network sits round it.', cta: ['See the FXN supply', '#/fxn'] }
  };
  /* where each kind is used, by the brief's own groups (products lanes), money kinds and state rows */
  var USES = {
    identity: { lane: 'social', state: 'Signed records', more: ['FXN ID: your key file', '#/identity'] },
    /* rule: the brief's one line that governs this kind (fixes 282, 286), read from the brief */
    network: { lane: 'govern', more: ['Three layers', '#/layers'], rule: function (B) { return B.minute && (B.minute.after.match(/[^.]*\bDAOs\b[^.]*\./) || [])[0]; } },
    hub: { state: 'Grammar checks on every record', more: ['How a result is made', '#/resolve'],
      rule: function (B) { return B.layers && B.layers[0] && 'The base chain: ' + B.layers[0].rule.charAt(0).toLowerCase() + B.layers[0].rule.slice(1); } },
    resolver: { lane: 'resolve', state: 'Resolver launch', more: ['Life of a resolver', '#/life'] },
    token: { lane: 'defi', money: 'App tokens' },
    pool: { lane: 'defi', more: ['How a result is made: a swap', '#/resolve'] },
    ledger: { money: 'Network coins', more: ['Three layers', '#/layers'] }
  };
  /* the chips: one per kind, the two named networks, and the two rings with pages of their own */
  var CHIPS = [['identity-1', 'Identity'], ['resolver-1', 'Resolver'], ['token-1', 'Token ledger'], ['pool-1', 'Pool'],
    ['fxn', 'FXN'], ['deark', 'DeArk'], ['cr3tv', 'CR3TV'], ['defxn', 'DEFXN kernel'], ['#/fxn', 'FXN supply'], ['#/chain', 'Your chain']];
  var index = N.ringIndex;
  function current() {
    var h = location.hash.replace(/^#\/?/, '').split('?'), q = new URLSearchParams(h[1] || '');
    return { view: h[0], i: index(q.get('i')) };
  }
  var ARROW = '<svg viewBox="0 0 26 20" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M1 10h23M15 1l9 9-9 9"/></svg>';
  function fill() {
    var c = current(), ri = c.i, kd = N.KIND[ri], K = KINDS[kd], named = N.NAMED[ri];
    /* a chain inside a network names the network it lives in (audit 4: chains inside chains) */
    var pi = N.PARENT ? N.PARENT[ri] : -1, home = pi >= 0 ? N.NAMED[pi] : null;
    $('kind').textContent = K.kind + (home ? ' · inside ' + home.name : '');   /* a named chain's name is the title; the eyebrow says only its kind (fix 157) */
    /* the corner map marks the ring this page is about (or, inside a network, that network) (fix 156) */
    var top0 = ri; while (N.PARENT && N.PARENT[top0] >= 0) top0 = N.PARENT[top0];
    view.querySelectorAll('.minimap ellipse').forEach(function (e, i) { e.classList.toggle('yours', i === top0); e.setAttribute('stroke-width', i === top0 ? 30 : 18); });
    $('title').innerHTML = kd === 'ledger' ? esc(named.name + '.') + ' <span>' + esc('Inside ' + home.name + '.') + '</span>'
      : named && named.kernel ? esc(K.title) + ' <span>' + esc(K.sub) + '</span>'
      : named ? esc(named.name + '.') + ' <span>' + esc((named.first ? 'The first chain. ' : '') + 'Its coin is ' + named.coin + '.') + '</span>'
      : home ? esc(K.title) + ' <span>' + esc('Inside ' + home.name + '.') + '</span>'
      : esc(K.title) + ' <span>' + esc(K.sub) + '</span>';
    $('what').textContent = K.what;
    /* (audit 4) what the brief says this kind is for, and its state: read from the brief, not retyped */
    var B = window.DEFXN_CONCEPT || {}, lanes = B.products ? B.products.lanes : [], use = USES[kd] || {};
    var row = (B.state ? B.state.rows : []).filter(function (r) { return use.state && r.part.indexOf(use.state) === 0; })[0];
    var cells = [['Kind', K.kind, false]];
    if (named) cells.push(['Coin', named.coin || 'None', !named.coin]);
    if (row) cells.push(['State', row.state, false, true]);
    cells.push(['Logo', N.LOGOS[ID[ri]] ? 'Shown' : 'Not given yet', !N.LOGOS[ID[ri]]]);
    $('strip').innerHTML = cells.map(function (x) {
      return '<div><dt>' + x[0] + '</dt><dd' + (x[2] ? ' class="muted"' : '') + '>' + (x[3] ? '<span class="state" data-state="' + esc(x[1].toLowerCase().replace(/\s+/g, '-')) + '">' + esc(x[1]) + '</span>' : esc(x[1])) + '</dd></div>';
    }).join('');
    var lane = lanes.filter(function (l) { return l.slug === use.lane; })[0], money = (B.money || []).filter(function (m) { return use.money && m.kind === use.money; })[0];
    var rule = use.rule && use.rule(B);
    $('also').innerHTML = esc(K.also) + (rule ? ' <b class="rule-line">' + esc(rule.trim()) + '</b>' : '') + (money ? ' ' + esc(money.what) + ' ' + esc(money.moves.replace(/^(Yes|No)\.\s*/, '')) : '') +
      (lane ? '<span class="uses">' + esc(lane.name + ':') + ' ' + lane.items.map(function (it) { return '<a href="#/products?s=' + esc(lane.slug) + '">' + esc(it.name) + '</a>'; }).join(' · ') + '</span>' : '') +
      (use.more ? '<span class="uses"><a href="' + use.more[1] + '">' + esc(use.more[0]) + '</a></span>' : '');
    $('note').textContent = ri === N.HUB ? 'DEFXN, the base chain kernel. A shape, not live data.'
      : named ? 'FXN, DeArk and CR3TV run on the DEFXN kernel. This picture shows them as a shape, not live data.' : 'This ring shows a kind of chain, not a live chain.';
    var logo = $('logo'), src = N.LOGOS[ID[ri]];
    logo.innerHTML = src ? '<img src="' + esc(src) + '" alt="">' : '<span>Logo</span>';
    logo.setAttribute('aria-label', src ? (named ? named.name : K.kind) + ' logo' : 'Logo: not given yet');
    /* (audit 4, fixes 144 and 150) the rings of this kind, one after another; then the kinds and the
       named networks as two groups */
    var peers = N.KIND.map(function (k2, i) { return k2 === kd && i !== N.MINE ? i : -1; }).filter(function (i) { return i >= 0; });
    peers.sort(function (a, b) { return (N.NAMED[b] && N.NAMED[b].first ? 1 : 0) - (N.NAMED[a] && N.NAMED[a].first ? 1 : 0); });   /* FXN, the first chain, comes first */
    var at = peers.indexOf(ri);
    var chip = function (ch) {
      var to = ch[0].charAt(0) === '#' ? ch[0] : '#/ring?i=' + ch[0], on = ch[0] === ID[ri] || (!named && ch[0] === kd + '-1');
      return '<a href="' + to + '" aria-pressed="' + on + '">' + esc(ch[1]) + '</a>';
    };
    $('pick').innerHTML = (peers.length > 1 ? '<span class="peers"><a href="#/ring?i=' + ID[peers[(at - 1 + peers.length) % peers.length]] + '" aria-label="Previous ' + esc(K.kind) + '">←</a>' +
      '<span class="mono">' + esc(K.kind) + ' ' + (at + 1) + ' of ' + peers.length + '</span><a href="#/ring?i=' + ID[peers[(at + 1) % peers.length]] + '" aria-label="Next ' + esc(K.kind) + '">→</a></span>' : '') +
      '<span class="grp"><b class="mono">Kinds</b>' + CHIPS.slice(0, 4).map(chip).join('') + '</span>' +
      '<span class="grp"><b class="mono">Networks</b>' + CHIPS.slice(4).map(chip).join('') + '</span>';
    var cta = (kd === 'ledger' || kd === 'network') && named && named.coin === 'FXN' ? ['See the FXN supply', '#/fxn'] : kd === 'ledger' ? ['How a result is made', '#/resolve'] : K.cta;   /* only FXN has a supply page */
    $('cta').href = cta[1]; $('cta-say').textContent = cta[0];
    var tag = document.querySelector('.tags[data-for="ring"] [data-tag="name"]');
    if (tag) tag.innerHTML = '<b>' + esc(named ? named.name : K.kind) + '</b>' + esc(named ? (named.coin ? 'Coin ' + named.coin : 'No coin') : 'A kind of chain');
  }
  /* a chip moves within the view: it replaces the entry, so Back leaves the page */
  $('pick').addEventListener('click', function (e) {
    var a = e.target.closest('a'); if (!a || a.getAttribute('href').indexOf('#/ring') !== 0) return;
    e.preventDefault(); location.replace(a.getAttribute('href'));
  });
  window.addEventListener('hashchange', function () { if (current().view === 'ring') fill(); });
  fill();

  if (!S) return;
  /* a hover label belongs to the screen it was shown on: a new address clears it */
  window.addEventListener('hashchange', function () { if (S.hooks.hover) S.hooks.hover(null); });

  /* home's kind labels: the scene offers one spot per ring of a kind; keep, for each kind, the
     spot that lands in the open screen (not on the words, the rail, the header, the footer or
     another label), nearest the middle. A kept spot stays kept while it still fits, so a label
     does not jump while the camera leans. Wraps the app's own label hook once the app has set it. */
  document.addEventListener('DOMContentLoaded', function () {
    var base = S.hooks.labels; if (!base) return;
    var open = null, kept = {}, W0 = 150, H0 = 36;
    function boxesOf(el) {
      var out = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), rg = document.createRange(), n;
      while ((n = walk.nextNode())) { if (!n.textContent.trim()) continue; rg.selectNodeContents(n); [].push.apply(out, [].slice.call(rg.getClientRects())); }
      return out;
    }
    function measure() {
      var home = document.querySelector('.view[data-view="home"]'), copy = home.querySelector('.copy'), rail = home.querySelector('.rail');
      var top = document.querySelector('.top').getBoundingClientRect().bottom, foot = document.querySelector('.foot').getBoundingClientRect().top;
      var cta = home.querySelector('.copy .cta');
      return { words: boxesOf(copy).concat(cta ? [cta.getBoundingClientRect()] : []), r: rail ? rail.getBoundingClientRect().left : innerWidth, top: top, foot: foot };
    }
    addEventListener('resize', function () { open = null; kept = {}; size = {}; });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { open = null; });
    function hits(a, b) { return a.x < b.right + 14 && a.x + a.w > b.left - 14 && a.y < b.bottom + 10 && a.y + a.h > b.top - 10; }
    /* each label's own size on screen (its CSS size times the page's scale), read once */
    var size = {};
    function sizeOf(kd) {
      if (!size[kd]) { var el = document.querySelector('.callout[data-kind="' + kd + '"]'), z = window.DEFXNKitUI && window.DEFXNKitUI.scale ? window.DEFXNKitUI.scale() : 1;
        size[kd] = el ? { w: (el.offsetWidth + 14) * z, h: Math.max(H0, el.offsetHeight + 8) * z } : { w: W0, h: H0 }; }
      return size[kd];
    }
    function boxOf(p) { var z = sizeOf(p.kind); return p.kind === 'fxn' ? { x: p.x - z.w / 2, y: p.y - 30, w: z.w, h: z.h } : { x: p.x - 8, y: p.y - 8, w: z.w, h: z.h }; }
    function fits(b, placed) {
      if (b.x < 8 || b.x + b.w > open.r - 8 || b.y < open.top + 6 || b.y + b.h + 4 > open.foot) return false;
      for (var i = 0; i < open.words.length; i++) if (hits(b, open.words[i])) return false;
      for (var j = 0; j < placed.length; j++) { var q = placed[j]; if (b.x < q.x + q.w + 10 && b.x + b.w > q.x - 10 && b.y < q.y + q.h + 6 && b.y + b.h > q.y - 6) return false; }
      return true;
    }
    S.hooks.labels = function (spots) {
      if (document.body.dataset.view !== 'home') return base(spots);
      if (!open) open = measure();
      var by = {}, order = [], placed = [], out = [];
      spots.forEach(function (p, i) { p.n = i; if (!by[p.kind]) { by[p.kind] = []; order.push(p.kind); } by[p.kind].push(p); });
      order.sort(function (a, b) { return (a === 'fxn' ? -1 : 0) - (b === 'fxn' ? -1 : 0); });
      var mid = (open.words.reduce(function (m, w) { return Math.max(m, w.right); }, 0) + open.r) / 2, cy = (open.top + open.foot) / 2;
      order.forEach(function (kd) {
        var c = by[kd], pick = null, best = Infinity;
        var prev = kept[kd] != null ? c.filter(function (p) { return p.n === kept[kd]; })[0] : null;
        if (prev && fits(boxOf(prev), placed)) pick = prev;
        else c.forEach(function (p) {
          var b = boxOf(p); if (!fits(b, placed)) return;
          var d = Math.abs(p.x - mid) + Math.abs(p.y - cy) * .6; if (d < best) { best = d; pick = p; }
        });
        if (pick) { kept[kd] = pick.n; placed.push(boxOf(pick)); out.push(pick); }
        else { kept[kd] = null; out.push({ kind: kd, x: -999, y: -999 }); }
      });
      base(out);
    };
  });

  /* home: a click on a ring opens its page; your ring and the hub have pages of their own */
  /* home's kind labels are a legend you can use (audit 4, fixes 31 and 33): hover one and every ring
     of that kind lifts while the rest step back; click it and the first ring of that kind opens */
  var FIRST = { identity: 'identity-1', network: 'fxn', resolver: 'resolver-1', token: 'token-1', pool: 'pool-1', fxn: 'defxn' };
  function kindOf(el) { return el && el.closest && el.closest('.callout') ? el.closest('.callout').dataset.kind : null; }
  document.addEventListener('pointerover', function (e) {
    var kd = kindOf(e.target); if (!kd || document.body.dataset.view !== 'home' || !S.world || !S.world.focusOn) return;
    if (kd === 'computers') S.world.focusOn(null, true);
    else if (kd === 'fxn') S.world.focusOn(function (i) { return i === N.HUB || N.PARENT[i] === N.HUB; }, false);
    else S.world.focusOn(function (i, k2) { return k2 === kd; }, false);
  });
  document.addEventListener('pointerout', function (e) {
    var kd = kindOf(e.target); if (!kd || (e.relatedTarget && kindOf(e.relatedTarget) === kd) || !S.world || !S.world.focusOn) return;
    S.world.focusOn(null, false);
  });
  document.addEventListener('click', function (e) {
    var kd = kindOf(e.target); if (!kd || document.body.dataset.view !== 'home') return;
    if (S.world && S.world.focusOn) S.world.focusOn(null, false);
    location.hash = kd === 'computers' ? '#/nodes' : '#/ring?i=' + (FIRST[kd] || 'deark');
  });
  /* a click on a ring of the network: where it goes is the world's to say (ring-stage.js S.ringTarget); the address carries it */
  S.hooks.pickRing = function (ri) { var t = S.ringTarget && S.ringTarget(ri); if (t) S.open(t.view, t.st); };
})();
