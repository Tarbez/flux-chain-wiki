/* DEFXN mockup app: the concept's own pages (2026-10-23).

   Owner: "our mockup does not really have our concept; rewrite and redesign it according to the
   concept." Each section of the designer brief (defxn-concept.html) becomes a view of the one app,
   with its words read from the brief (concept-data.js, made by make-concept.mjs) and a 3D stage that
   shows the idea. Nothing on these pages is retyped from the brief by hand.
     #/minute?s=1..5     In one minute: the network itself lights one idea at a time
     #/layers?s=0..2     Three layers: three plates; a resolver names the blocks it is built from
     #/life?s=1..5       Life of a resolver: build, launch, choose who can change it, serve, inspect
     #/products?s=<lane> The products: 26 in 7 groups, each with an empty emblem slot
     #/identity?s=id|names  Identity and names: FXN ID, then .fxn names
     #/nodes?s=0..2      Nodes: three ways to run one, and the roles a node picks
     #/status            What exists today: the brief's four state labels
   How it works is now a chapter strip on four views: In one minute, How a result is made, Three
   layers, Life of a resolver. Every glossary word on these pages and the others gets a short
   definition on hover or focus (the brief's "The words").

   The 3D of these pages is the grammar world (js/world2/world2-board.mjs, records in world/world.flx, 2026-10-30); this file is the words and the DOM.
   Loaded after stages.js and before app.js: it adds its views to the page before the app reads them.
   Every view reads with no 3D. Every animation settles.

   REDUCTION TESTS
   minute    1 what DEFXN is. 2 Next idea, then How a result is made. 3 the five ideas, one at a time.
             4 the closing line (FXN, builders, DAOs). 5 nothing. 6 nothing. 7 nothing. 8-9 the step
             rides in the address. 10 the words read alone; the network only lights what they say.
   layers    1 the three layers and their one rule each. 2 Life of a resolver. 3 what each layer holds.
             4 the capability and resolver lists (their own pages). 5 nothing. 6 nothing. 7 nothing.
             8-9 the address. 10 the dotted references are the resolver data's own.
   life      1 a resolver's path from build to inspect. 2 Next step, then See the resolvers. 3 the
             step, and that launched is not served. 4 the other steps. 5 nothing. 6 nothing.
             7 nothing. 8-9 the address. 10 an illustration; it says so.
   products  1 the 26 products by group. 2 Create your identity (one key for every product). 3 each
             product's line, address or stage. 4 the other groups (chips). 5 nothing. 6 nothing.
             7 nothing. 8-9 the group in the address. 10 "No product is public yet" stays on top.
   identity  1 FXN ID and names. 2 Create your identity. 3 the key file stays on your device; apps
             sign in the browser; names are flat. 4 names (tab). 5 nothing. 6 nothing. 7 nothing.
             8-9 the tab in the address. 10 each Partial state is shown where it applies.
   nodes     1 the three ways to run a node. 2 See what is measured. 3 each way, the roles, the
             state. 4 nothing. 5 nothing. 6 nothing. 7 nothing. 8-9 the address. 10 "not paid yet".
   status    1 what exists today. 2 How it works. 3 each part's state and boundary. 4 nothing.
             5 nothing. 6 nothing. 7 nothing. 8-9 nothing to keep. 10 a count that has moved since
             the brief was written is named, with the file that is right. */
(function () {
  'use strict';
  var C = window.DEFXN_CONCEPT, S = window.DEFXNScene, N = window.DEFXN_NETWORK, main = document.querySelector('main.views');
  if (!C || !main) return;
  var esc = window.DEFXNKitUI.esc, RES = (window.DEFXN_RESOLVERS || { resolvers: [] }).resolvers, CAPS = (window.DEFXN_CAPABILITIES || { capabilities: [] }).capabilities;
  var ARROW = '<svg viewBox="0 0 26 20" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M1 10h23M15 1l9 9-9 9"/></svg>';
  var ARROW_L = '<svg viewBox="0 0 16 14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 7H2M7.5 1.5L2 7l5.5 5.5"/></svg>';

  /* ---------- the views ---------- */
  var VIEWS = {
    minute: { title: 'In one minute', here: 'How it works', note: 'The network as it is drawn on home. Each idea lights what it names.' },
    layers: { title: 'Three layers', here: 'How it works', note: 'An illustration of the three layers. It shows no live state.' },
    life: { title: 'Life of a resolver', here: 'How it works', note: 'An illustration of one resolver. It shows no live state.' },
    products: { title: 'Products', here: 'Products', note: 'Each tile keeps an empty slot for its product’s emblem.' },
    identity: { title: 'Identity and names', here: 'Identity', note: 'An illustration of your key and a name. It shows no live state.' },
    nodes: { title: 'Nodes', here: 'Nodes', note: 'Three ways to run a node, and the four roles a node can pick.' },
    status: { title: 'What exists today', here: 'Status', note: 'Everything runs on a devnet, a test network.' }
  };
  /* How it works, in chapters: the brief's sections 1, 3, 5 and 6 */
  var CHAPTERS = [['minute', 'One minute'], ['resolve', 'A result'], ['layers', 'Three layers'], ['life', "A resolver's life"]];
  window.DEFXN_EXTRA_VIEWS = {};
  Object.keys(VIEWS).forEach(function (v) { window.DEFXN_EXTRA_VIEWS[v] = { title: VIEWS[v].title }; });

  /* each view is the app's page shape: the stage on the left, the page on the right */
  var minimap = (document.querySelector('[data-kit="minimap"]') || {}).innerHTML || '';
  var html = Object.keys(VIEWS).map(function (v) {
    var d = VIEWS[v];
    return '<section class="view page cview" data-view="' + v + '" aria-labelledby="' + v + '-title">' +
      '<div class="page-top"><nav class="crumbs" aria-label="Where you are"><span class="path"><b>DEFXN</b> / ' + esc(d.here) + '</span>' +
      '<a class="back" href="#/">' + ARROW_L + 'Back to network</a></nav><a class="minimap" href="#/" aria-label="Back to the network">' + minimap + '</a></div>' +
      '<div class="chain-body"><div class="stage-col"><div class="stage" data-stage></div><p class="stage-note mono">' + esc(d.note) + '</p></div>' +
      '<div class="sheet-slot" data-panel><div class="sheet">' +
      '<p class="eyebrow-dot mono" data-cf="kicker"></p>' +
      '<nav class="chapters" data-cf="chapters" aria-label="How it works"></nav>' +
      '<h1 id="' + v + '-title" class="two" data-cf="title" data-sw></h1>' +
      '<p class="sheet-lede" data-cf="lede" data-sw></p>' +
      '<div class="cbody" data-cf="body" data-sw></div>' +
      '<div class="sheet-foot"><a class="cta small" data-cf="cta"><span class="say"><span data-cf="cta-say"></span> ' + ARROW + '</span></a>' +
      '<a class="more" data-cf="more"></a></div>' +
      '</div></div></div><span></span></section>';
  }).join('');
  main.insertAdjacentHTML('beforeend', html);
  /* the 3D labels of each view */
  document.body.insertAdjacentHTML('beforeend', Object.keys(VIEWS).map(function (v) { return '<div class="tags" data-for="' + v + '" aria-hidden="true"></div>'; }).join(''));
  function el(v) { return main.querySelector('.view[data-view="' + v + '"]'); }
  function $(v, name) { return el(v).querySelector('[data-cf="' + name + '"]'); }
  /* the app keeps hold of each label element, so the same labels are updated in place, never rebuilt
     (rebuilt ones went blank after a choice inside a view) */
  function tags(v, list) {
    var layer = document.querySelector('.tags[data-for="' + v + '"]'), have = [].slice.call(layer.children);
    var same = have.length === list.length && have.every(function (el, i) { return el.dataset.tag === list[i].id; });
    if (same) {
      list.forEach(function (t, i) { var seen = have[i].classList.contains('seen'); have[i].className = 'tag' + (t.cls ? ' ' + t.cls : '') + (seen ? ' seen' : ''); have[i].innerHTML = '<b>' + esc(t.name) + '</b>' + esc(t.sub || ''); });
      return;
    }
    layer.innerHTML = list.map(function (t) { return '<span class="tag' + (t.cls ? ' ' + t.cls : '') + '" data-tag="' + t.id + '"' + (t.at ? ' data-at="' + t.at + '"' : '') + '><b>' + esc(t.name) + '</b>' + esc(t.sub || '') + '</span>'; }).join('');
  }

  /* the chapter strip on the four How it works views, the resolve view included */
  function chapters(here) {
    return CHAPTERS.map(function (c, i) {
      return '<a href="#/' + c[0] + '"' + (c[0] === here ? ' aria-current="page"' : '') + '><span>' + (i + 1) + '</span>' + esc(c[1]) + '</a>';
    }).join('');
  }
  var resolveSheet = document.querySelector('.view[data-view="resolve"] .sheet');
  if (resolveSheet) {
    var nav = document.createElement('nav'); nav.className = 'chapters'; nav.setAttribute('aria-label', 'How it works'); nav.innerHTML = chapters('resolve');
    var eb = resolveSheet.querySelector('.eyebrow-dot'); if (eb) eb.after(nav); else resolveSheet.prepend(nav);
  }

  /* ---------- the address ---------- */
  function current() {
    var h = location.hash.replace(/^#\/?/, '').split('?'), q = new URLSearchParams(h[1] || '');
    return { view: h[0], s: q.get('s') };
  }
  function slugOf(n) { return n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function num(s, lo, hi) { var n = parseInt(s, 10); return isNaN(n) ? lo : Math.min(hi, Math.max(lo, n)); }
  function link(v, s) { return '#/' + v + (s != null ? '?s=' + s : ''); }
  function story(v, items, at, open) {
    return '<ol class="story">' + items.map(function (it, i) {
      var n = i + (open == null ? 1 : 0), on = n === at;
      return '<li><a href="' + link(v, n) + '" class="' + (n < at ? 'done' : '') + '"' + (on ? ' aria-current="step"' : '') + ' data-stay>' +
        '<span class="n">' + (i + 1) + '</span><b>' + esc(it.lead.replace(/\.$/, '')) + '</b><span class="say"><span>' + esc(it.rest) + '</span></span></a></li>';
    }).join('') + '</ol>';
  }
  function stateTag(s) { return s ? '<span class="state" data-state="' + esc(s.toLowerCase().replace(/\s+/g, '-')) + '">' + esc(s) + '</span>' : ''; }
  function foot(v, cta, more) {
    $(v, 'cta').href = cta[1]; $(v, 'cta-say').textContent = cta[0];
    var m = $(v, 'more'); m.hidden = !more; if (more) { m.href = more[1]; m.textContent = more[0]; }
  }

  /* ---------- the words of each view, from the brief ---------- */
  var FILL = {
    minute: function (s) {
      var n = num(s, 1, 5), m = C.minute, step = m.steps[n - 1];
      $('minute', 'kicker').textContent = 'How it works · in one minute';
      $('minute', 'title').innerHTML = esc('Every result is signed.') + ' <span>' + esc('Anyone can check it.') + '</span>';
      /* the opening line on the first idea, the closing line on the last; nothing between */
      /* step 5 keeps the closing line's first and last sentences (FXN, the first chain, and DAOs govern), so step 5's own words fit */
      var aft = (m.after || '').split(/(?<=\.)\s+/);
      $('minute', 'lede').textContent = n === 1 ? m.line.replace(/^DEFXN is a network where every result is signed\. /, '') : n === 5 ? (aft.length > 1 ? aft[0] + ' ' + aft[aft.length - 1] : m.after) : '';
      $('minute', 'lede').hidden = n !== 1 && n !== 5;
      $('minute', 'body').innerHTML = story('minute', m.steps, n);
      foot('minute', n < 5 ? ['Next idea', link('minute', n + 1)] : ['See how a result is made', '#/resolve'], n > 1 ? ['Back an idea', link('minute', n - 1)] : null);
      var T = [['identity', 'Identity chains', 'One for each identity'], ['token', 'Token ledgers', 'One for each token'], ['resolver', 'Resolver chains', 'Each signs its results'],
        ['cubes', 'Computers', 'Each keeps a copy'], ['check', 'Follow the signatures back', 'To the start']];
      tags('minute', [{ id: 'focus', name: T[n - 1][1], sub: T[n - 1][2], cls: 'hot' }]);
      return { step: n, lead: step.lead };
    },
    layers: function (s) {
      var n = num(s, 0, 2), L = C.layers;
      $('layers', 'kicker').textContent = 'How it works · three layers';
      $('layers', 'title').innerHTML = esc('Three layers.') + ' <span>' + esc('Each has one rule.') + '</span>';
      $('layers', 'lede').textContent = 'Three layers, from the DEFXN kernel up. Each layer has one rule.';
      $('layers', 'body').innerHTML = '<ol class="rows-pick">' + L.slice().reverse().map(function (l, ri) {
        var i = L.length - 1 - ri, on = i === n;
        return '<li><a href="' + link('layers', i) + '" data-stay' + (on ? ' aria-current="true"' : '') + '><b>' + esc(l.name) + '</b>' +
          '<span class="say"><span>' + esc(l.holds) + '<em>' + esc('Its one rule: ' + l.rule) + '</em></span></span></a></li>';
      }).join('') + '</ol>' +
        '<p class="aside">' + esc(CAPS.length + ' capabilities have a manifest today, and the network team builds ' + RES.length + ' resolvers.') + '</p>';
      foot('layers', ['See the life of a resolver', '#/life'], ['See the capabilities', '#/measured']);
      tags('layers', L.map(function (l, i) { return { id: 'plate-' + i, name: l.name, at: 'left', cls: i === n ? 'hot' : '' }; }));
      return { layer: n };
    },
    life: function (s) {
      var n = num(s, 1, 5), L = C.life;
      $('life', 'kicker').textContent = 'How it works · life of a resolver';
      $('life', 'title').innerHTML = esc('Step ' + n + ' of 5.') + ' <span>' + esc(L.steps[n - 1].lead.replace(/\.$/, '') + '.') + '</span>';
      $('life', 'lede').textContent = "This is the builder's path, from building a resolver to anyone inspecting it.";
      /* the note on launched and served belongs to the step where the two part: Serve */
      $('life', 'body').innerHTML = story('life', L.steps, n) + (L.note && n === 4 ? '<p class="aside">' + esc(L.note.rest) + '</p>' : '');
      foot('life', n < 5 ? ['Next step', link('life', n + 1)] : ['See the resolvers', '#/resolvers'], n > 1 ? ['Step back', link('life', n - 1)] : null);
      tags('life', [{ id: 'caps', name: 'Capabilities', sub: 'It names them. It holds no copy.' }, { id: 'grammar', name: 'Its grammar' },
        { id: 'chain', name: 'Its own chain', sub: 'From one signed launch record' }, { id: 'key', name: 'Control key', sub: 'Only this key can upgrade it' },
        { id: 'provider', name: 'A provider', sub: 'Passes the checked cases' }, { id: 'state', name: n >= 4 ? 'Served' : 'Launched', sub: n >= 4 ? 'Solid, with a proof' : 'Dashed: not served yet', cls: 'hot' }]);
      return { step: n };
    },
    products: function (s) {
      /* ?s=<group> or ?s=<group>.<product>: the chosen product opens its line; the others stay one row */
      var P = C.products, lanes = P.lanes, sp = (s || '').split('.'), li = Math.max(0, lanes.findIndex(function (l) { return l.slug === sp[0]; })), lane = lanes[li];
      var pi = Math.max(0, lane.items.findIndex(function (it) { return slugOf(it.name) === sp[1]; }));
      var total = lanes.reduce(function (a, l) { return a + l.items.length; }, 0);
      $('products', 'kicker').textContent = 'Products · ' + total + ' in ' + lanes.length + ' groups';
      $('products', 'title').innerHTML = esc(lane.name + '.') + ' <span>' + esc(lane.line) + '</span>';
      $('products', 'lede').innerHTML = '<span class="state" data-state="none">Not public</span> ' + esc('No product is public yet. An address is where it will live.');
      var runsOn = {}; P.powered.forEach(function (p) { runsOn[p.powers] = p.resolver; });
      $('products', 'body').innerHTML = '<div class="chips lanes">' + lanes.map(function (l) {
        return '<a href="' + link('products', l.slug) + '" data-stay aria-pressed="' + (l === lane) + '">' + esc(l.name) + ' <small>' + l.items.length + '</small></a>';
      }).join('') + '</div><ul class="prods">' + lane.items.map(function (it, i) {
        return '<li><a href="' + link('products', lane.slug + '.' + slugOf(it.name)) + '" data-stay' + (i === pi ? ' aria-current="true"' : '') + '>' +
          '<span class="emblem" role="img" aria-label="Emblem: not given yet"></span><span><b>' + esc(it.name) + '</b>' +
          (it.address ? '<em>' + esc(it.address) + '</em>' : it.stage ? stateTag(it.stage.charAt(0).toUpperCase() + it.stage.slice(1)) : '<em class="none">—</em>') +
          '<span class="say"><small>' + esc(it.line) + (runsOn[it.name] ? ' Runs on the ' + esc(runsOn[it.name]) + ' resolver.' : '') + '</small></span></span></a></li>';
      }).join('') + '</ul>';
      foot('products', ['Create your identity', '#/idstart'], ['See the resolvers', '#/resolvers']);
      tags('products', lanes.map(function (l, i) { return { id: 'lane-' + i, name: l.name, cls: i === li ? 'hot small' : 'small', at: 'below' }; }));
      return { lane: li };
    },
    identity: function (s) {
      var I = C.identity, t = s === 'names' ? 1 : 0, part = I[t];
      $('identity', 'kicker').textContent = 'Identity and names';
      $('identity', 'title').innerHTML = t ? esc('.fxn names.') + ' <span>' + esc('One system owns every name.') + '</span>' : esc('FXN ID.') + ' <span>' + esc('One key file for every network.') + '</span>';
      $('identity', 'lede').textContent = part.paras[0].text;
      $('identity', 'body').innerHTML = '<div class="chips">' + I.map(function (x, i) { return '<a href="' + link('identity', i ? 'names' : 'id') + '" data-stay aria-pressed="' + (i === t) + '">' + esc(x.name) + '</a>'; }).join('') + '</div>' +
        /* FXN ID has nine keyed paragraphs; this overview quotes three and the identity flow (#/idsafe) carries the rest */
        part.paras.slice(1).filter(function (p) { return !p.key || ['sign', 'secret', 'gate'].indexOf(p.key) >= 0; }).map(function (p) { return '<p class="para">' + stateTag(p.state) + ' ' + esc(p.text) + '</p>'; }).join('');
      foot('identity', ['Create your identity', '#/idstart'], t ? ['See the Domain resolver', '#/resolvers?id=domain'] : ['Back to network', '#/']);
      tags('identity', t ? [{ id: 'name', name: 'radio.fxn', sub: 'A flat name', cls: 'hot' }, { id: 'domain', name: 'Domain resolver', sub: 'The one system for names' }, { id: 'owner', name: 'Its owner', sub: 'A move needs both signatures' }]
        : [{ id: 'device', name: 'Your device' }, { id: 'file', name: '.auth.fxn', sub: 'Stays here. Never uploaded.', cls: 'hot' }, { id: 'app', name: 'An app', sub: 'Asks you to sign in the browser' }]);
      return { tab: t };
    },
    nodes: function (s) {
      var D = C.nodes, n = num(s, 0, D.ways.length - 1), w = D.ways[n];
      $('nodes', 'kicker').textContent = 'Nodes · three ways to run one';
      $('nodes', 'title').innerHTML = esc(w.name + '.') + ' <span>' + esc(w.where + '.') + '</span>';
      $('nodes', 'lede').textContent = D.line;
      $('nodes', 'body').innerHTML = '<ol class="rows-pick">' + D.ways.map(function (x, i) {
        return '<li><a href="' + link('nodes', i) + '" data-stay' + (i === n ? ' aria-current="true"' : '') + '><b>' + esc(x.name) + ' <small>' + esc(x.where) + '</small></b><span class="say"><span>' + esc(x.line) + '</span></span></a></li>';
      }).join('') + '</ol>' + D.after.map(function (p) { return '<p class="para">' + stateTag(p.state) + ' ' + esc(p.text) + '</p>'; }).join('');
      foot('nodes', ['See what is measured', '#/measured?tab=runs'], ['Back to network', '#/']);
      tags('nodes', D.ways.map(function (x, i) { return { id: 'way-' + i, name: x.name, cls: i === n ? 'hot' : '', at: 'below' }; })
        .concat(['Host a chain', 'Run resolvers it proved', 'Store data', 'Relay traffic'].map(function (r, i) { return { id: 'role-' + i, name: r, cls: 'small' }; })));
      return { way: n };
    },
    status: function () {
      var T = C.state;
      $('status', 'kicker').textContent = 'Status';
      $('status', 'title').innerHTML = esc('What exists today.') + ' <span>' + esc('Nothing is public yet.') + '</span>';
      $('status', 'lede').textContent = 'Each part, with the brief\'s own label.';
      $('status', 'body').innerHTML = '<ul class="states">' + T.rows.map(function (r) {
        /* a count the brief wrote down that the files now give otherwise: say so, and trust the file */
        var moved = /manifests exist/.test(r.boundary) && CAPS.length && r.boundary.indexOf(String(CAPS.length)) < 0
          ? ' <em>' + esc('The manifests give ' + CAPS.length + ' today.') + '</em>' : '';
        return '<li>' + stateTag(r.state) + '<span><b>' + esc(r.part) + '</b><small>' + esc(r.boundary) + moved + '</small></span></li>';
      }).join('') + '</ul>';
      foot('status', ['How it works', '#/minute'], ['Back to network', '#/']);
      tags('status', []);
      return {};
    }
  };
  ['minute', 'layers', 'life'].forEach(function (v) { $(v, 'chapters').innerHTML = chapters(v); });
  ['products', 'identity', 'nodes', 'status'].forEach(function (v) { $(v, 'chapters').remove(); });
  /* a choice inside a view replaces the entry, so Back leaves the page */
  main.addEventListener('click', function (e) {
    var a = e.target.closest('.cview [data-stay]'); if (!a) return;
    e.preventDefault(); location.replace(a.getAttribute('href'));
  });
  var picks = {};
  function fill() { var c = current(); if (FILL[c.view]) picks[c.view] = FILL[c.view](c.s); }
  window.addEventListener('hashchange', fill);
  Object.keys(FILL).forEach(function (v) { picks[v] = FILL[v](null); });
  fill();

  /* ---------- the brief's words, explained where they appear ---------- */
  var WORDS = {}, ORDER = [];
  (C.words || []).forEach(function (w) { var key = w.word.toLowerCase(); WORDS[key] = w; ORDER.push(key); });
  ORDER.sort(function (a, b) { return b.length - a.length; });   /* "checked cases" before "chain" */
  var wordRe = new RegExp('\\b(' + ORDER.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')(s)?\\b', 'i');
  var SKIP = 'h1,h2,a,button,.mono,.eyebrow-dot,.state,.chips,.strip dt,.tag,.term,.chapters,.cta,.more,.crumbs,.facts dt,.timeline';
  function mark(root) {
    if (!root || root.dataset.terms === location.hash) return;
    root.dataset.terms = location.hash;
    var seen = {}, walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [], n;
    while ((n = walk.nextNode())) nodes.push(n);
    nodes.forEach(function (t) {
      if (!t.parentElement || t.parentElement.closest(SKIP)) return;
      var m = t.textContent.match(wordRe); if (!m) return;
      var key = m[1].toLowerCase(); if (seen[key]) return; seen[key] = 1;
      var span = document.createElement('span'); span.className = 'term'; span.tabIndex = 0; span.dataset.w = key; span.textContent = m[0];
      var after = t.splitText(m.index); after.textContent = after.textContent.slice(m[0].length); t.parentNode.insertBefore(span, after);
    });
  }
  var pop = document.createElement('div'); pop.className = 'term-pop'; pop.setAttribute('role', 'tooltip'); pop.id = 'term-pop'; document.body.appendChild(pop);
  function scale() { return window.DEFXNKitUI && window.DEFXNKitUI.scale ? window.DEFXNKitUI.scale() : 1; }
  function showWord(t) {
    var w = WORDS[t.dataset.w]; if (!w) return;
    pop.innerHTML = '<b>' + esc(w.word) + '</b>' + esc(w.means);
    var r = t.getBoundingClientRect(), sc = scale();
    pop.style.left = Math.round(Math.min(r.left / sc, (innerWidth / sc) - 300)) + 'px'; pop.style.top = Math.round(r.bottom / sc + 8) + 'px';
    pop.classList.add('on'); t.setAttribute('aria-describedby', 'term-pop');
  }
  function hideWord(t) { pop.classList.remove('on'); if (t) t.removeAttribute('aria-describedby'); }
  document.addEventListener('pointerover', function (e) { var t = e.target.closest && e.target.closest('.term'); if (t) showWord(t); });
  document.addEventListener('pointerout', function (e) { var t = e.target.closest && e.target.closest('.term'); if (t) hideWord(t); });
  document.addEventListener('focusin', function (e) { if (e.target.classList && e.target.classList.contains('term')) showWord(e.target); });
  document.addEventListener('focusout', function (e) { if (e.target.classList && e.target.classList.contains('term')) hideWord(e.target); });
  /* after the app has filled the shown view (its own hashchange runs after this file's) */
  function markShown() { setTimeout(function () { hideWord(); mark(document.querySelector('.view.on .sheet') || document.querySelector('.view.on .card')); }, 60); }
  window.addEventListener('hashchange', markShown);
  document.addEventListener('DOMContentLoaded', function () { setTimeout(markShown, 400); });

})();
