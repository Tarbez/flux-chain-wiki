/* /palette: the live design-system reference for the active theme. Everything
   here is painted from the same tokens and components the site uses, so what
   you see is what every page gets. Switch themes in the settings panel. */
(function () {
  'use strict';
  var ROLES = [
    ['primary', 'Primary', 'Identity: the hero accent and small brand marks. Never a button.'],
    ['secondary', 'Secondary', 'The main call to action: solid once per view, soft when repeated.'],
    ['reference', 'Reference', 'Secondary actions, links and selected states.'],
    ['success', 'Success', 'State only.'], ['warning', 'Warning', 'State only.'], ['danger', 'Danger', 'State only.']
  ];
  var SHADES = [['100', 'subtle fill'], ['200', 'hover fill'], ['300', 'border'], ['400', 'strong border'], ['500', 'base'], ['600', 'hover on fill'], ['700', 'text on subtle']];
  var TONES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
  var NEUTRALS = ['canvas', 'depth', 'surface', 'raised', 'nested', 'text-faint', 'text-muted', 'text', 'text-strong'];

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function swatch(token, label, sub) {
    var s = el('div', 'palette-swatch');
    var chip = el('span', 'palette-chip'); chip.style.background = 'hsl(var(--' + token + '))';
    s.appendChild(chip); s.appendChild(el('b', '', label)); if (sub) s.appendChild(el('small', '', sub));
    s.title = '--' + token;
    return s;
  }

  ArkUI.pageModules.palette = {
    mount: function (host) {
      var page = el('section', 'ark-page task-page palette-page');
      page.setAttribute('aria-labelledby', 'palette-title');
      var shell = el('div', 'palette-shell'); page.appendChild(shell);
      var head = el('header', 'palette-head');
      head.appendChild(el('p', 'account-kicker', '// DESIGN SYSTEM'));
      var h1 = el('h1', '', 'Palette'); h1.id = 'palette-title'; head.appendChild(h1);
      var family = el('p', 'palette-family');
      head.appendChild(family);
      head.appendChild(el('p', 'palette-lede', 'Three roles share one lightness and chroma, so only hue tells them apart. Neutrals carry a trace of the primary hue. Every tint on the site is one of the shades below. Switch themes from the settings panel to compare families.'));
      shell.appendChild(head);

      // Components, painted by css/components.css.
      var comp = el('section', 'palette-section'); comp.appendChild(el('h2', '', 'Components'));
      var row = el('div', 'palette-components');
      var solid = el('button', 'palette-solid palette-demo', 'Main action'); solid.type = 'button';
      var soft = el('button', 'palette-soft palette-demo', 'Run DEFXN'); soft.type = 'button';
      var quiet = el('button', 'palette-quiet palette-demo', 'Secondary action'); quiet.type = 'button';
      var choices = el('div', 'story-depth palette-choices');
      ['Selected', 'Option', 'Option'].forEach(function (t, i) { var b = el('button', '', t); b.type = 'button'; b.setAttribute('aria-pressed', String(i === 0)); choices.appendChild(b); });
      var links = el('span', 'home-question-links'); var link = el('a', '', 'Text link'); link.href = '#palette-title'; links.appendChild(link);
      [[solid, 'solid · main CTA'], [soft, 'soft · repeated main action'], [quiet, 'quiet · secondary action'], [choices, 'choice · tabs and pickers'], [links, 'link']].forEach(function (pair) {
        var cell = el('figure', 'palette-component'); cell.appendChild(pair[0]); cell.appendChild(el('figcaption', '', pair[1])); row.appendChild(cell);
      });
      comp.appendChild(row); shell.appendChild(comp);

      ROLES.forEach(function (role) {
        var sec = el('section', 'palette-section palette-role');
        var title = el('h2', ''); title.appendChild(document.createTextNode(role[1] + ' '));
        title.appendChild(el('code', '', '--' + role[0])); sec.appendChild(title);
        sec.appendChild(el('p', 'palette-note', role[2]));
        var shades = el('div', 'palette-shades');
        SHADES.forEach(function (s) { shades.appendChild(swatch(role[0] + '-' + s[0], s[0], s[1])); });
        var ink = swatch(role[0] + '-ink', 'ink', 'text on base'); ink.querySelector('.palette-chip').style.boxShadow = 'inset 0 0 0 8px hsl(var(--' + role[0] + '))'; shades.appendChild(ink);
        sec.appendChild(shades);
        if (['primary', 'secondary', 'reference'].indexOf(role[0]) >= 0) {
          var tones = el('div', 'palette-tones');
          TONES.forEach(function (t) { tones.appendChild(swatch(role[0] + '-tone-' + t, t)); });
          sec.appendChild(el('p', 'palette-sub', 'Tonal scale, for illustration'));
          sec.appendChild(tones);
        }
        shell.appendChild(sec);
      });

      var neu = el('section', 'palette-section'); neu.appendChild(el('h2', '', 'Neutrals'));
      var nrow = el('div', 'palette-shades'); NEUTRALS.forEach(function (n) { nrow.appendChild(swatch(n, n)); });
      neu.appendChild(nrow); shell.appendChild(neu);

      function paintFamily() {
        var key = document.documentElement.dataset.theme || 'ghost';
        var names = { ghost: 'Ember dark', glacier: 'Ember light', clay: 'Tide dark', grove: 'Tide light', ochre: 'Moss dark', moss: 'Moss light', marine: 'Dune dark', bone: 'Dune light', dusk: 'Dusk dark', dawn: 'Dusk light' };
        family.textContent = 'Active theme: ' + (names[key] || key);
      }
      paintFamily();
      var observer = typeof MutationObserver !== 'undefined' ? new MutationObserver(paintFamily) : null;
      if (observer) observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      page.arkDispose = function () { if (observer) observer.disconnect(); };
      host.appendChild(page);
      return page;
    }
  };
})();
