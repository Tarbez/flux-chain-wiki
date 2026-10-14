/* /about, built from the home page's own parts (the hl-* components in
   css/home-swiss.css) so the two read as one site.

   Five sections, each answering one question and nothing else:
     hero      what is it, and how is it layered (the three layers are drawn, not hidden)
     promise   what do I not need
     flow      what happens to a request
     resolve   what can I put on it
     pillars   who is it for
   The closing block carries the source boundary; the evidence stays behind one disclosure. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var GROUP_ICONS = { BUILD: 'layers', VALUE: 'cycle', PEOPLE: 'account', INTELLIGENCE: 'model', OPERATIONS: 'network' };
  var NO_ICONS = ['layers', 'network', 'transfer', 'world'];
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
      var w = 30 + name.length * 6.4, x = at[0] - 14 - w;
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

  ArkUI.pageModules.about = {
    mount: function (host) {
      var area = 'ABOUT';
      function words(role) { return ArkCopy.text(area + '.' + role); }
      function node(tag, cls, text) { return ArkUI.el(tag, cls || '', text); }
      function iconize(e, name, after) {
        var icon = ArkUI.icon && ArkUI.icon(name);
        if (!icon) return e;
        e.classList.add('has-native-icon');
        if (after) e.appendChild(icon); else e.insertBefore(icon, e.firstChild);
        return e;
      }
      function label(text, iconName) { var e = node('p', 'hl-label', text); return iconName ? iconize(e, iconName) : e; }
      function routeLink(text, target, cls) {
        var link = node('a', cls || 'hl-link', text);
        link.href = ArkUI.route.href(ArkUI.pageCatalog[target].path);
        link.dataset.sceneLink = target;
        return link;
      }
      function section(index, title, deck, iconName) {
        var e = node('section', 'hl-section');
        var head = node('div', 'hl-section-head');
        head.appendChild(label(index, iconName));
        var copy = node('div');
        copy.appendChild(node('h2', '', title));
        if (deck) copy.appendChild(node('p', 'hl-deck', deck));
        head.appendChild(copy); e.appendChild(head);
        return e;
      }
      function shortTitle(value) { return value.split(':')[0].replace(/\.$/, ''); }

      var el = node('section', 'ark-page home-launch about-launch');
      el.dataset.arkPage = 'about';
      el.setAttribute('aria-labelledby', 'about-title');

      /* 01  Hero: the answer, and the three layers drawn. */
      var hero = node('section', 'hl-hero about-hero');
      var copy = node('div', 'hl-hero-copy');
      copy.appendChild(label(words('EYEBROW'), 'overview'));
      var title = node('h1', 'hl-title', words('TITLE')); title.id = 'about-title';
      copy.appendChild(title);
      copy.appendChild(node('p', 'hl-intro', words('DECK')));
      var actions = node('div', 'hl-actions');
      actions.appendChild(iconize(routeLink(words('ACTION'), ArkUI.pageCatalog.resolutions ? 'resolutions' : 'deployment', 'hl-button palette-solid about-primary-action'), 'arrow-right', true));
      actions.appendChild(iconize(routeLink(words('ACTION2'), 'deployment'), 'open', true));
      copy.appendChild(actions); hero.appendChild(copy);

      var points = [1, 2, 3].map(function (i) { return { title: words('POINT' + i + '.TITLE'), text: words('POINT' + i + '.TEXT') }; });
      var names = points.map(function (item) { return shortTitle(item.title); });
      var figure = node('section', 'hl-instrument about-figure');
      figure.setAttribute('aria-label', words('MODEL.TITLE'));
      var figureHead = node('div', 'hl-instrument-head');
      figureHead.appendChild(label(words('MODEL.TITLE'), 'layers'));
      var picker = node('div', 'hl-case-picker about-layer-picker');
      picker.setAttribute('role', 'group'); picker.setAttribute('aria-label', 'Choose a layer');
      figureHead.appendChild(picker); figure.appendChild(figureHead);
      var layers = drawLayers(names);
      var stage = node('div', 'about-stage'); stage.appendChild(layers.svg); figure.appendChild(stage);
      var detail = node('div', 'about-layer-detail'); detail.setAttribute('aria-live', 'polite');
      figure.appendChild(detail);
      var buttons = [];
      function selectLayer(index) {
        buttons.forEach(function (button, i) { button.setAttribute('aria-pressed', String(i === index)); });
        detail.replaceChildren();
        detail.appendChild(node('strong', '', points[index].title));
        detail.appendChild(node('p', '', points[index].text));
        layers.select(index);
      }
      names.forEach(function (name, i) {
        var button = iconize(node('button', 'hl-case', name), LAYER_ICONS[i]);
        button.type = 'button';
        button.addEventListener('click', function () { selectLayer(i); });
        buttons.push(button); picker.appendChild(button);
      });
      hero.appendChild(figure); el.appendChild(hero);

      /* 02  Everything past the hero, one disclosure. Law 18 ("one
         scroll, then it ends") + law 8 ("calm is functional"): the hero
         is the only always-visible section now -- how it works, the
         promise, what you can resolve and who it's for are real content,
         not cut, just moved behind one <details> (the same element the
         FAQ-style pattern elsewhere on this site already uses), each
         keeping its own heading once open. */
      var more = section('02 / More', 'More.', null, 'inspect'); more.classList.add('hl-more');
      var moreWrap = node('div', 'hl-faq about-more');
      var moreDetails = node('details');
      moreDetails.appendChild(node('summary', '', 'See how it works, the promise, what you can resolve, and who DEFXN is for'));
      var moreBody = node('div');

      var flowPart = node('section', 'about-more-part');
      flowPart.appendChild(node('h3', '', words('FLOW.TITLE')));
      var steps = node('div', 'hl-principles about-steps');
      [1, 2, 3].forEach(function (i) {
        var card = node('article');
        card.appendChild(label('0' + i + ' / ' + words('FLOW' + i + '.TITLE'), ['sign', 'resolver', 'check'][i - 1]));
        card.appendChild(node('p', 'about-step-text', words('FLOW' + i + '.TEXT')));
        steps.appendChild(card);
      });
      flowPart.appendChild(steps);
      flowPart.appendChild(iconize(routeLink(words('FLOW.LINK'), 'resolver'), 'open', true));
      moreBody.appendChild(flowPart);

      var promisePart = node('section', 'about-more-part');
      promisePart.appendChild(node('h3', '', words('PROMISE.TITLE')));
      if (words('PROMISE.TEXT')) promisePart.appendChild(node('p', 'hl-deck', words('PROMISE.TEXT')));
      var nos = node('div', 'hl-principles about-nos');
      [1, 2, 3, 4].forEach(function (i) {
        var card = node('article');
        card.appendChild(label('0' + i, NO_ICONS[i - 1]));
        card.appendChild(node('h3', '', words('NO' + i + '.TITLE')));
        card.appendChild(node('p', '', words('NO' + i + '.TEXT')));
        nos.appendChild(card);
      });
      promisePart.appendChild(nos); moreBody.appendChild(promisePart);

      if (typeof ArkResolutions !== 'undefined' && ArkUI.pageCatalog.resolutions) {
        var resolvePart = node('section', 'about-more-part');
        resolvePart.appendChild(node('h3', '', words('RESOLVE.TITLE')));
        var groups = node('div', 'about-groups');
        ArkResolutions.list().forEach(function (group) {
          var tile = routeLink('', 'resolutions', 'about-group');
          tile.appendChild(label(group.items.length + ' resolutions', GROUP_ICONS[group.key]));
          tile.appendChild(node('h3', '', group.title));
          var names3 = group.items.slice(0, 3).map(function (item) { return ArkResolutions.shortName(item.title); });
          tile.appendChild(node('p', '', names3.join(', ') + (group.items.length > 3 ? ' and more' : '')));
          groups.appendChild(tile);
        });
        resolvePart.appendChild(groups);
        resolvePart.appendChild(iconize(routeLink(words('RESOLVE.ALL'), 'resolutions'), 'open', true));
        moreBody.appendChild(resolvePart);
      }

      var pillarsPart = node('section', 'about-more-part');
      pillarsPart.appendChild(node('h3', '', words('PILLARS.TITLE')));
      var pillarGrid = node('div', 'hl-principles about-pillars');
      [1, 2, 3].forEach(function (i) {
        var card = node('article');
        var tag = label('0' + i, i === 3 ? null : ['network', 'account'][i - 1]);
        if (i === 3) { var coin = node('span', 'brand-mark brand-mark-fxn about-coin'); coin.setAttribute('aria-hidden', 'true'); tag.classList.add('has-native-icon'); tag.insertBefore(coin, tag.firstChild); }
        card.appendChild(tag);
        card.appendChild(node('h3', '', words('PILLAR' + i + '.TITLE')));
        card.appendChild(node('p', '', words('PILLAR' + i + '.TEXT')));
        pillarGrid.appendChild(card);
      });
      pillarsPart.appendChild(pillarGrid); moreBody.appendChild(pillarsPart);

      moreDetails.appendChild(moreBody);
      moreWrap.appendChild(moreDetails);
      more.appendChild(moreWrap);
      el.appendChild(more);

      /* Closing block, on the heavy anchor: the boundary, and the evidence behind one disclosure. */
      var closing = node('footer', 'hl-closing about-boundary');
      closing.setAttribute('aria-label', 'Current source boundary');
      closing.appendChild(label('CURRENT SOURCE BOUNDARY', 'inspect'));
      closing.appendChild(node('h2', '', words('CLOSE.TITLE')));
      closing.appendChild(node('p', 'about-boundary-text', words('BOUNDARY.TITLE')));
      var reference = node('details', 'about-reference');
      reference.appendChild(node('summary', '', words('REFERENCE')));
      var body = node('div', 'about-reference-body');
      var status = node('a', 'hl-link', words('STATUS')); status.href = 'docs/status.md';
      [[words('POINT4.TITLE'), words('POINT4.TEXT'), iconize(status, 'open', true)],
       [words('POINT5.TITLE'), words('POINT5.TEXT'), iconize(routeLink(words('NEXT'), 'concept'), 'arrow-right', true)]].forEach(function (item) {
        var part = node('section', 'about-reference-item');
        part.appendChild(node('h3', '', item[0])); part.appendChild(node('p', '', item[1]));
        part.appendChild(item[2]); body.appendChild(part);
      });
      reference.appendChild(body); closing.appendChild(reference);
      var footerLinks = node('nav', 'hl-footer-links'); footerLinks.setAttribute('aria-label', 'More about DEFXN');
      [['Home', 'zero', 'arrow-left'], ['Resolutions', 'resolutions', 'layers'], ['Explorer', 'explorer', 'network'], ['Run from source', 'download', 'terminal']].forEach(function (item) {
        if (ArkUI.pageCatalog[item[1]]) footerLinks.appendChild(iconize(routeLink(item[0], item[1]), item[2]));
      });
      closing.appendChild(footerLinks); el.appendChild(closing);

      selectLayer(1);
      el.arkDispose = function () {};
      host.appendChild(el);
      return el;
    }
  };
})();
