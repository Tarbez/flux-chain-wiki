/* /about: the protocol overview, as a page of Ark blocks (DEFXN polish Wave 3).

   It was a hero (with the three layers drawn) followed by ONE closed "More" disclosure holding
   how it works, the promise, what you can resolve and who it is for -- 2.23x the viewport
   closed, 4.08x open on a desktop, 7.36x open on a phone (docs/ux-audit/pages-ux-a.md /about) --
   and a closing block whose evidence sat behind a second disclosure. Organised by question now,
   each view short enough for the fold rule on its own:

     hero      what DEFXN is (the deck) and the two next steps
     boundary  the current source boundary, in sight in every view (Ark callout, drift)
     views     ONE control, Ark tabs: the three bounded layers (drawn, with a layer picker) ·
               how it works · the promise · what you can resolve · who it is for · evidence and
               verification (what the source establishes, how to verify it, then the closing line
               and the way on: home, resolutions, explorer, run from source)
     anchor    the CMS insertion point

   Words: every one is the manifest's (copy:ABOUT.*), as before. Motion: the layer drawing is
   still -- it changes only when a layer is chosen (no idle frame loop).
   Layout keys: every element of the old page with words keeps the key it had (the `was` pins,
   derived by tests/lib/layout-continuity.cjs from the frozen census
   tests/fixtures/layout-keys/about.tsv). Regression: tests/about-page.cjs. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var LAYER_ICONS = ['world', 'chain', 'authority'];

  function svg(tag, attrs, text) {
    var node = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    if (text != null) node.textContent = text;
    return node;
  }

  /* The three bounded layers as three slabs on one floor. Each layer only
     touches the one above and below it (the dashed references), which is what
     "bounded" means. Monochrome; the only accent is the one record on the FXN
     chain layer, the same record the home page follows. */
  function drawLayers(names) {
    var root = svg('svg', { viewBox: '0 0 560 420', class: 'about-layers-figure', fill: 'none', 'aria-hidden': 'true' });
    var SIZE = 200, GAP = 92, THICK = 16;
    function point(x, y, z) { return [300 + (x - y) * .8, 232 + (x + y) * .4 - z]; }
    function d(points) { return points.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ') + 'Z'; }
    function path(parent, points, cls) { return parent.appendChild(svg('path', { d: d(points), class: cls })); }
    function seg(parent, a, b, cls) { return parent.appendChild(svg('path', { d: 'M' + a.join(' ') + 'L' + b.join(' '), class: cls })); }
    var slabs = [];
    // Draw bottom to top so a higher slab overlaps the one below.
    names.forEach(function (name, i) {
      var z = i * GAP, g = svg('g', { class: 'about-slab', 'data-layer': String(i) });
      var A = point(0, 0, z), B = point(SIZE, 0, z), C = point(SIZE, SIZE, z), D = point(0, SIZE, z);
      path(g, [D, C, point(SIZE, SIZE, z - THICK), point(0, SIZE, z - THICK)], 'about-slab-front');
      path(g, [B, C, point(SIZE, SIZE, z - THICK), point(SIZE, 0, z - THICK)], 'about-slab-side');
      path(g, [A, B, C, D], 'about-slab-top');
      if (i === 0) {
        // Directory: named addresses, a grid of small points.
        for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) {
          var p = point(40 + c * 40, 40 + r * 40, z);
          g.appendChild(svg('circle', { cx: p[0], cy: p[1], r: 3, class: 'about-slab-mark' }));
        }
      } else if (i === 1) {
        // FXN chain: one signed history, with the newest record the only accent.
        for (var k = 0; k < 5; k++) {
          var x = 22 + k * 34, y = 78;
          var tile = svg('g', { class: 'about-slab-record' + (k === 4 ? ' about-slab-record-new' : '') });
          path(tile, [point(x, y + 26, z), point(x + 26, y + 26, z), point(x + 26, y + 26, z + 10), point(x, y + 26, z + 10)], 'about-record-front');
          path(tile, [point(x + 26, y, z), point(x + 26, y + 26, z), point(x + 26, y + 26, z + 10), point(x + 26, y, z + 10)], 'about-record-side');
          path(tile, [point(x, y, z + 10), point(x + 26, y, z + 10), point(x + 26, y + 26, z + 10), point(x, y + 26, z + 10)], 'about-record-top');
          g.appendChild(tile);
          if (k < 4) seg(g, point(x + 26, y + 13, z + 5), point(x + 34, y + 13, z + 5), 'about-slab-link');
        }
      } else {
        // Governance: scopes, each with a threshold bar.
        [58, 100, 142].forEach(function (y, row) {
          seg(g, point(34, y, z), point(166, y, z), 'about-slab-rule');
          seg(g, point(34, y, z), point(34 + 44 + row * 30, y, z), 'about-slab-bar');
        });
      }
      slabs.push(g); root.appendChild(g);
      if (i < names.length - 1) {
        // A bounded reference up to the next layer.
        var low = point(SIZE / 2, SIZE / 2, z), high = point(SIZE / 2, SIZE / 2, z + GAP - THICK);
        seg(root, low, high, 'about-slab-reference');
      }
    });
    // Names sit on their own layer, to the left of each slab.
    var labels = svg('g', { class: 'about-slab-labels' });
    names.forEach(function (name, i) {
      var at = point(0, SIZE, i * GAP);
      var g = svg('g', { class: 'about-slab-label', 'data-layer': String(i) });
      var w = 30 + name.length * 8.4, x = at[0] - 14 - w;
      g.appendChild(svg('rect', { x: x, y: at[1] - 23, width: w, height: 22, rx: 11 }));
      var icon = ArkUI.iconPaths && ArkUI.iconPaths[LAYER_ICONS[i]];
      if (icon) {
        var ig = svg('g', { class: 'about-label-icon', transform: 'translate(' + (x + 8) + ' ' + (at[1] - 18) + ') scale(.5)' });
        icon.forEach(function (p) { ig.appendChild(svg('path', { d: p })); });
        g.appendChild(ig);
      }
      g.appendChild(svg('text', { x: x + 25, y: at[1] - 8 }, name));
      labels.appendChild(g);
    });
    root.appendChild(labels);
    return { svg: root, select: function (index) {
      root.setAttribute('data-selected', String(index));
      slabs.forEach(function (slab, i) { slab.setAttribute('data-selected', String(i === index)); });
      Array.prototype.forEach.call(labels.childNodes, function (label, i) { label.setAttribute('data-selected', String(i === index)); });
    } };
  }

  /* `was`: the old page's layout key for each element that carries its words now, by spec entry
     id, so a CMS edit saved against the hand-built page still lands. Derived by
     tests/lib/layout-continuity.cjs (derive /about, with the reshaped and retired keys of
     tests/about-page.cjs set aside), plus the reshaped ones, each with its reason in that test.
     Part refs count in document order within the entry ('fact#2' = the second fact). The layer
     drawing is pinned at its root and keeps every key inside it. */
  var WAS = {
    'about-hero': {
      'hero-title': 'id:about-title',
      'eyebrow': 'page:/section:1/div:1/p:1',
      'hero-lede': 'page:/section:1/div:1/p:2',
      'actions': 'page:/section:1/div:1/div:1',
      ':root': { key: 'page:/section:1/div:1', self: true }
    },
    'about-boundary': {
      'alert-title': 'page:/footer:1/p:1',
      'alert-description': 'page:/footer:1/p:2'
    },
    'about-views': {
      'tabs-content#3': 'page:/section:1/section:1/div:3',
      'tabs-trigger#6': 'page:/footer:1/details:1/summary:1',
      'tabs-trigger': 'page:/section:1/section:1/div:1/p:1',
      'tabs-list#2': 'page:/section:1/section:1/div:1/div:1',
      '[data-ark-slot="layers"]': 'page:/section:1/section:1/div:2/svg:1',
      'card-title#2': 'page:/section:1/section:1/div:3/strong:1',
      'card-description#2': 'page:/section:1/section:1/div:3/p:1',
      'tabs-trigger#10': 'page:/footer:1/details:1/div:1/section:1/h3:1',
      ':scope > div:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(1)': 'page:/footer:1/details:1/div:1/section:1/p:1',
      'button#3': 'page:/footer:1/details:1/div:1/section:1/a:1',
      'tabs-trigger#11': 'page:/footer:1/details:1/div:1/section:2/h3:1',
      ':scope > div:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(3) > p:nth-of-type(1)': 'page:/footer:1/details:1/div:1/section:2/p:1',
      'button#4': 'page:/footer:1/details:1/div:1/section:2/a:1',
      'section-title': 'page:/section:2/div:2/details:1/div:1/section:1/h3:1',
      'button': 'page:/section:2/div:2/details:1/div:1/section:1/a:1',
      'section-title#2': 'page:/section:2/div:2/details:1/div:1/section:2/h3:1',
      'section-lede': 'page:/section:2/div:2/details:1/div:1/section:2/p:1',
      'section-title#3': 'page:/section:2/div:2/details:1/div:1/section:3/h3:1',
      'button#2': 'page:/section:2/div:2/details:1/div:1/section:3/a:1',
      'section-title#4': 'page:/section:2/div:2/details:1/div:1/section:4/h3:1',
      'step-body': 'page:/section:2/div:2/details:1/div:1/section:1/div:1/article:1/p:2',
      'step-body#2': 'page:/section:2/div:2/details:1/div:1/section:1/div:1/article:2/p:2',
      'step-body#3': 'page:/section:2/div:2/details:1/div:1/section:1/div:1/article:3/p:2',
      'fact-term': 'page:/section:2/div:2/details:1/div:1/section:2/div:1/article:1/h3:1',
      'fact-value': 'page:/section:2/div:2/details:1/div:1/section:2/div:1/article:1/p:2',
      'fact-term#2': 'page:/section:2/div:2/details:1/div:1/section:2/div:1/article:2/h3:1',
      'fact-value#2': 'page:/section:2/div:2/details:1/div:1/section:2/div:1/article:2/p:2',
      'fact-term#3': 'page:/section:2/div:2/details:1/div:1/section:2/div:1/article:3/h3:1',
      'fact-value#3': 'page:/section:2/div:2/details:1/div:1/section:2/div:1/article:3/p:2',
      'fact-term#4': 'page:/section:2/div:2/details:1/div:1/section:2/div:1/article:4/h3:1',
      'fact-value#4': 'page:/section:2/div:2/details:1/div:1/section:2/div:1/article:4/p:2',
      'fact-value#5': 'page:/section:2/div:2/details:1/div:1/section:3/div:1/a:1/p:2',
      'fact-value#6': 'page:/section:2/div:2/details:1/div:1/section:3/div:1/a:2/p:2',
      'fact-value#7': 'page:/section:2/div:2/details:1/div:1/section:3/div:1/a:3/p:2',
      'fact-value#8': 'page:/section:2/div:2/details:1/div:1/section:3/div:1/a:4/p:2',
      'fact-value#9': 'page:/section:2/div:2/details:1/div:1/section:3/div:1/a:5/p:2',
      'card-title#4': 'page:/section:2/div:2/details:1/div:1/section:4/div:1/article:1/h3:1',
      'card-description#4': 'page:/section:2/div:2/details:1/div:1/section:4/div:1/article:1/p:2',
      'card-title#5': 'page:/section:2/div:2/details:1/div:1/section:4/div:1/article:2/h3:1',
      'card-description#5': 'page:/section:2/div:2/details:1/div:1/section:4/div:1/article:2/p:2',
      'card-title#6': 'page:/section:2/div:2/details:1/div:1/section:4/div:1/article:3/h3:1',
      'card-description#6': 'page:/section:2/div:2/details:1/div:1/section:4/div:1/article:3/p:2',
      ':root': { key: 'page:/section:2/div:2/details:1', self: true },
      'tabs-list': { key: 'page:/section:2/div:2/details:1/summary:1', self: true },
      'tabs-content': { key: 'page:/section:1/section:1', self: true },
      'tabs#2': { key: 'page:/section:1/section:1/div:1', self: true },
      'figure-frame': { key: 'page:/section:1/section:1/div:2', self: true },
      'tabs-content#5': { key: 'page:/section:2/div:2/details:1/div:1/section:1', self: true },
      'stepper': { key: 'page:/section:2/div:2/details:1/div:1/section:1/div:1', self: true },
      'step': { key: 'page:/section:2/div:2/details:1/div:1/section:1/div:1/article:1', self: true },
      'step#2': { key: 'page:/section:2/div:2/details:1/div:1/section:1/div:1/article:2', self: true },
      'step#3': { key: 'page:/section:2/div:2/details:1/div:1/section:1/div:1/article:3', self: true },
      'step-title': 'page:/section:2/div:2/details:1/div:1/section:1/div:1/article:1/p:1',
      'step-title#2': 'page:/section:2/div:2/details:1/div:1/section:1/div:1/article:2/p:1',
      'step-title#3': 'page:/section:2/div:2/details:1/div:1/section:1/div:1/article:3/p:1',
      'tabs-content#6': { key: 'page:/section:2/div:2/details:1/div:1/section:2', self: true },
      'facts': { key: 'page:/section:2/div:2/details:1/div:1/section:2/div:1', self: true },
      'fact': { key: 'page:/section:2/div:2/details:1/div:1/section:2/div:1/article:1', self: true },
      'fact#2': { key: 'page:/section:2/div:2/details:1/div:1/section:2/div:1/article:2', self: true },
      'fact#3': { key: 'page:/section:2/div:2/details:1/div:1/section:2/div:1/article:3', self: true },
      'fact#4': { key: 'page:/section:2/div:2/details:1/div:1/section:2/div:1/article:4', self: true },
      'tabs-content#7': { key: 'page:/section:2/div:2/details:1/div:1/section:3', self: true },
      'facts#2': { key: 'page:/section:2/div:2/details:1/div:1/section:3/div:1', self: true },
      'fact#5': { key: 'page:/section:2/div:2/details:1/div:1/section:3/div:1/a:1', self: true },
      'fact#6': { key: 'page:/section:2/div:2/details:1/div:1/section:3/div:1/a:2', self: true },
      'fact#7': { key: 'page:/section:2/div:2/details:1/div:1/section:3/div:1/a:3', self: true },
      'fact#8': { key: 'page:/section:2/div:2/details:1/div:1/section:3/div:1/a:4', self: true },
      'fact#9': { key: 'page:/section:2/div:2/details:1/div:1/section:3/div:1/a:5', self: true },
      'fact-term#5': 'page:/section:2/div:2/details:1/div:1/section:3/div:1/a:1/h3:1',
      'fact-term#6': 'page:/section:2/div:2/details:1/div:1/section:3/div:1/a:2/h3:1',
      'fact-term#7': 'page:/section:2/div:2/details:1/div:1/section:3/div:1/a:3/h3:1',
      'fact-term#8': 'page:/section:2/div:2/details:1/div:1/section:3/div:1/a:4/h3:1',
      'fact-term#9': 'page:/section:2/div:2/details:1/div:1/section:3/div:1/a:5/h3:1',
      'tabs-content#8': { key: 'page:/section:2/div:2/details:1/div:1/section:4', self: true },
      'card-grid': { key: 'page:/section:2/div:2/details:1/div:1/section:4/div:1', self: true },
      'card#4': { key: 'page:/section:2/div:2/details:1/div:1/section:4/div:1/article:1', self: true },
      'card#5': { key: 'page:/section:2/div:2/details:1/div:1/section:4/div:1/article:2', self: true },
      'card#6': { key: 'page:/section:2/div:2/details:1/div:1/section:4/div:1/article:3', self: true },
      'tabs-content#9': { key: 'page:/footer:1/details:1', self: true },
      'tabs#3': { key: 'page:/footer:1/details:1/div:1', self: true },
      'tabs-content#10': { key: 'page:/footer:1/details:1/div:1/section:1', self: true },
      'tabs-content#11': { key: 'page:/footer:1/details:1/div:1/section:2', self: true },
      ':scope > div:nth-of-type(7) > nav:nth-of-type(1) > div:nth-of-type(1) > ul:nth-of-type(1)': { key: 'page:/footer:1/nav:1', self: true },
      ':scope > div:nth-of-type(7) > nav:nth-of-type(1) > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(1) > a:nth-of-type(1)': 'page:/footer:1/nav:1/a:1',
      ':scope > div:nth-of-type(7) > nav:nth-of-type(1) > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(2) > a:nth-of-type(1)': 'page:/footer:1/nav:1/a:2',
      ':scope > div:nth-of-type(7) > nav:nth-of-type(1) > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(3) > a:nth-of-type(1)': 'page:/footer:1/nav:1/a:3',
      ':scope > div:nth-of-type(7) > nav:nth-of-type(1) > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(4) > a:nth-of-type(1)': 'page:/footer:1/nav:1/a:4',
      ':scope > div:nth-of-type(7) > nav:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': 'page:/footer:1/h2:1'
    },
    insert: { key: 'page:/div:1', self: true }
  };

  function copy(role) { return 'copy:ABOUT.' + role; }
  function words(role) { return ArkCopy.text('ABOUT.' + role); }
  function shortTitle(value) { return value.split(':')[0].replace(/\.$/, ''); }

  function spec(manifest, groups) {
    var views = [
      { value: 'layers', label: copy('MODEL.TITLE'), blocks: [
        { block: 'figure', props: { kind: 'illustration', slot: 'layers', caption: copy('MODEL.TEXT') } },
        { block: 'tabs', props: { label: 'Choose a layer', variant: 'segmented', defaultValue: 'chain', items: ['directory', 'chain', 'governance'].map(function (value, i) {
          return { value: value, label: shortTitle(words('POINT' + (i + 1) + '.TITLE')), blocks: [
            { block: 'card', props: { title: copy('POINT' + (i + 1) + '.TITLE'), description: copy('POINT' + (i + 1) + '.TEXT'), headingLevel: 3 } }
          ] };
        }) } }
      ] },
      { value: 'flow', label: 'How it works', blocks: [
        { block: 'section-header', props: { title: copy('FLOW.TITLE'), level: 3 } },
        { block: 'steps', props: { label: words('FLOW.LABEL'), items: [1, 2, 3].map(function (i) { return { title: copy('FLOW' + i + '.TITLE'), body: copy('FLOW' + i + '.TEXT') }; }) } },
        { block: 'actions', props: { items: [{ label: copy('FLOW.LINK'), href: words('FLOW.LINK.HREF'), tone: 'ghost' }] } }
      ] },
      { value: 'promise', label: 'The promise', blocks: [
        { block: 'section-header', props: { title: copy('PROMISE.TITLE'), lede: copy('PROMISE.TEXT'), level: 3 } },
        { block: 'facts', props: { label: words('PROMISE.LABEL'), columns: 2, items: [1, 2, 3, 4].map(function (i) { return { term: copy('NO' + i + '.TITLE'), value: copy('NO' + i + '.TEXT') }; }) } }
      ] }
    ];
    /* What you can resolve: one row per group of ArkResolutions (counted, never a link per resolution). */
    if (groups.length) views.push({ value: 'resolve', label: 'What you can resolve', blocks: [
      { block: 'section-header', props: { title: copy('RESOLVE.TITLE'), level: 3 } },
      { block: 'facts', props: { label: words('RESOLVE.LABEL'), columns: 1, items: groups.map(function (group) {
        var names = group.items.slice(0, 3).map(function (item) { return ArkResolutions.shortName(item.title); });
        return { term: group.title + ' · ' + group.items.length + ' resolutions', value: names.join(', ') + (group.items.length > 3 ? ' and more' : ''), href: words('RESOLVE.GROUP.HREF') };
      }) } },
      { block: 'actions', props: { items: [{ label: copy('RESOLVE.ALL'), href: words('RESOLVE.ALL.HREF'), tone: 'ghost' }] } }
    ] });
    views.push(
      { value: 'partners', label: 'Who it is for', blocks: [
        { block: 'section-header', props: { title: copy('PILLARS.TITLE'), level: 3 } },
        { block: 'card-grid', props: { label: words('PILLARS.LABEL'), columns: 3, items: [1, 2, 3].map(function (i) { return { title: copy('PILLAR' + i + '.TITLE'), description: copy('PILLAR' + i + '.TEXT'), headingLevel: 3 }; }) } }
      ] },
      /* Evidence & verification: what the source establishes and how to verify it -- one at a
         time, each with its way on -- then the closing line and the way on from the page. */
      { value: 'evidence', label: copy('REFERENCE'), blocks: [
        { block: 'tabs', props: { label: words('REFERENCE'), variant: 'segmented', items: [
          { value: 'source', label: copy('POINT4.TITLE'), content: copy('POINT4.TEXT'), blocks: [{ block: 'actions', props: { items: [{ label: copy('STATUS'), href: words('STATUS.HREF'), tone: 'ghost' }] } }] },
          { value: 'verify', label: copy('POINT5.TITLE'), content: copy('POINT5.TEXT'), blocks: [{ block: 'actions', props: { items: [{ label: copy('NEXT'), href: 'route:' + manifest.meta.next, tone: 'ghost' }] } }] }
        ] } },
        { block: 'pager', props: { label: 'More about DEFXN', relatedLabel: copy('CLOSE.TITLE'),
          related: [['Home', 'FOOTER.HOME.HREF'], ['Resolutions', 'FOOTER.RESOLUTIONS.HREF'], ['Explorer', 'FOOTER.EXPLORER.HREF'], ['Run from source', 'FOOTER.DOWNLOAD.HREF']].map(function (f) { return { label: f[0], href: words(f[1]) }; }) } }
      ] }
    );
    return [
      { block: 'hero', id: 'about-hero', was: WAS['about-hero'], props: {
        eyebrow: copy('EYEBROW'), title: copy('TITLE'), lede: copy('DECK'), density: 'compact', actions: [
          { label: copy('ACTION'), href: words('ACTION.HREF'), tone: 'primary' },
          { label: copy('ACTION2'), href: words('ACTION2.HREF'), tone: 'secondary' }
        ] } },
      /* The source boundary stays in sight in every view (it qualifies the deck's promise). */
      { block: 'callout', id: 'about-boundary', was: WAS['about-boundary'], props: { tone: 'drift', title: 'Current source boundary', body: copy('BOUNDARY.TITLE') } },
      { block: 'tabs', id: 'about-views', was: WAS['about-views'], props: { label: 'About DEFXN', items: views } },
      { insert: 'main', was: WAS.insert }
    ];
  }

  ArkUI.pageModules.about = {
    spec: spec,
    mount: function (host) {
      var manifest = ArkManifest.get('about');
      var names = [1, 2, 3].map(function (i) { return shortTitle(words('POINT' + i + '.TITLE')); });
      var layers = drawLayers(names);
      var groups = typeof ArkResolutions !== 'undefined' && ArkUI.pageCatalog.resolutions ? ArkResolutions.list() : [];
      var page = ArkUI.page(spec(manifest, groups), host, { page: 'about', className: 'about-page', titleId: 'about-title',
        slots: { layers: function () { return layers.svg; } } });
      /* The layer chosen in the picker is the slab drawn lit (the drawing changes only then). */
      var picker = page.querySelector('#about-views [data-ark-block="tabs"]');
      function paint() {
        var list = picker && picker.querySelector('[data-ark-part="tabs-list"]');
        var on = list && list.querySelector('[role="tab"][aria-selected="true"]');
        layers.select(on ? Array.prototype.indexOf.call(list.children, on) : 1);
      }
      if (picker) picker.addEventListener('click', paint);
      paint();
      return page;
    }
  };
})();
