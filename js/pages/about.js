(function () {
  'use strict';

  ArkUI.pageModules.about = {
    mount: function (host) {
      var area = 'ABOUT';
      function words(role) { return ArkCopy.text(area + '.' + role); }
      function routeLink(label, target, className) {
        var link = ArkUI.el('a', className || '', label);
        link.href = ArkUI.route.href(ArkUI.pageCatalog[target].path);
        link.dataset.sceneLink = target;
        return link;
      }
      function point(index) {
        return { title: words('POINT' + index + '.TITLE'), text: words('POINT' + index + '.TEXT') };
      }
      function shortTitle(value) { return value.split(':')[0].replace(/\.$/, ''); }

      var el = ArkUI.el('section', 'ark-page about-overview');
      el.dataset.arkPage = 'about';

      var path = ArkUI.el('nav', 'content-layer-path about-path');
      path.setAttribute('aria-label', 'Your place');
      path.appendChild(routeLink('\u2190 Home', 'zero'));
      var current = ArkUI.el('span', '', ArkManifest.get('about').title);
      current.setAttribute('aria-current', 'page');
      path.appendChild(current);
      el.appendChild(path);

      var focus = ArkUI.el('div', 'about-focus');
      var copy = ArkUI.el('header', 'about-focus-copy');
      copy.appendChild(ArkUI.el('p', 'about-eyebrow', words('EYEBROW')));
      var title = ArkUI.el('h1', '', words('TITLE'));
      title.id = 'about-title';
      el.setAttribute('aria-labelledby', title.id);
      copy.appendChild(title);
      copy.appendChild(ArkUI.el('p', 'about-deck', words('DECK')));
      var action = routeLink(words('ACTION') + ' \u2192', 'deployment', 'about-primary-action');
      copy.appendChild(action);
      focus.appendChild(copy);

      var points = [point(1), point(2), point(3)];
      var patterns = ['mesh-nodes', 'story-work', 'mesh-frames'];
      var map = ArkUI.el('figure', 'about-map');
      var mapHead = ArkUI.el('div', 'about-map-head');
      mapHead.appendChild(ArkUI.el('span', '', words('MODEL.TITLE')));
      mapHead.appendChild(ArkUI.el('span', 'about-map-state', 'ILLUSTRATION'));
      map.appendChild(mapHead);
      var canvas = ArkUI.el('canvas', 'about-map-mesh');
      canvas.setAttribute('aria-hidden', 'true');
      map.appendChild(canvas);
      map.appendChild(ArkUI.el('figcaption', 'about-map-caption', words('MODEL.TEXT')));

      var context = ArkUI.el('details', 'about-context');
      context.appendChild(ArkUI.el('summary', '', words('CONTEXT')));
      var layers = ArkUI.el('nav', 'about-layers');
      layers.setAttribute('aria-label', 'DEFXN protocol layers');
      var detail = ArkUI.el('div', 'about-layer-detail');
      detail.setAttribute('aria-live', 'polite');
      var buttons = [];
      var selected = 0;
      var fabric = ArkUI.createMeshFabric(canvas);
      function selectLayer(index, animate) {
        selected = index;
        buttons.forEach(function (button, position) {
          button.setAttribute('aria-pressed', String(position === index));
        });
        detail.replaceChildren();
        detail.appendChild(ArkUI.el('strong', '', points[index].title));
        detail.appendChild(ArkUI.el('p', '', points[index].text));
        fabric.select(patterns[index], animate, true);
      }
      points.forEach(function (item, index) {
        var button = ArkUI.el('button', 'about-layer');
        button.type = 'button';
        button.appendChild(ArkUI.el('span', 'about-layer-number', String(index + 1).padStart(2, '0')));
        button.appendChild(ArkUI.el('span', 'about-layer-name', shortTitle(item.title)));
        button.addEventListener('click', function () { selectLayer(index, true); });
        buttons.push(button);
        layers.appendChild(button);
      });
      context.appendChild(layers);
      context.appendChild(detail);
      context.addEventListener('toggle', function () {
        if (context.open) {
          if (reference) reference.open = false;
          fabric.select(patterns[selected], true, true);
        }
      });
      map.appendChild(context);
      focus.appendChild(map);
      el.appendChild(focus);

      var boundary = ArkUI.el('aside', 'about-boundary');
      boundary.setAttribute('aria-label', 'Current source boundary');
      boundary.appendChild(ArkUI.el('span', 'about-boundary-label', 'CURRENT SOURCE BOUNDARY'));
      boundary.appendChild(ArkUI.el('strong', '', words('BOUNDARY.TITLE')));
      var reference = ArkUI.el('details', 'about-reference');
      reference.appendChild(ArkUI.el('summary', '', words('REFERENCE')));
      var referenceBody = ArkUI.el('div', 'about-reference-body');
      var source = ArkUI.el('section', 'about-reference-item');
      source.appendChild(ArkUI.el('h2', '', words('POINT4.TITLE')));
      source.appendChild(ArkUI.el('p', '', words('POINT4.TEXT')));
      var status = ArkUI.el('a', 'about-text-link', words('STATUS') + ' \u2197');
      status.href = 'docs/status.md';
      source.appendChild(status);
      referenceBody.appendChild(source);
      var verify = ArkUI.el('section', 'about-reference-item');
      verify.appendChild(ArkUI.el('h2', '', words('POINT5.TITLE')));
      verify.appendChild(ArkUI.el('p', '', words('POINT5.TEXT')));
      verify.appendChild(routeLink(words('NEXT') + ' \u2192', 'concept', 'about-text-link'));
      referenceBody.appendChild(verify);
      reference.appendChild(referenceBody);
      reference.addEventListener('toggle', function () {
        if (reference.open) context.open = false;
      });
      boundary.appendChild(reference);
      el.appendChild(boundary);

      selectLayer(0, false);
      el.arkDispose = function () { fabric.dispose(); };
      host.appendChild(el);
      return el;
    }
  };
})();
