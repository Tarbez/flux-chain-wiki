/* /palette: the live design-system reference for the active theme, as a page of Ark blocks.
   Everything here is painted from the same tokens and components the site uses, so what you see
   is what every page gets. Switch themes in the settings panel.

   The first page converted to data (DEFXN polish Wave 2, pilot): the page is the spec below,
   built by ArkUI.page (js/ark/blocks.js). The blocks are Ark's; only the swatch grids and the
   button demo are this page's own, passed in as slots because they ARE the live theme. The
   views moved behind tabs (Components / Primary / Secondary / Reference / States / Neutrals),
   which brings the page inside the fold rule (it was 2.76x the viewport on a desktop and 4.51x
   on a phone, docs/ux-audit/pages-ux-b.md /palette P1) without removing any swatch.

   Words: this page never had a manifest, and adding one now would grow a JSON-in-JS store
   (docs/ux-audit/components.md risk R12), so its words stay here as literal values. When
   manifests move to FLX, each becomes a copy: key with no other change to the spec.

   Layout keys: every element of the old page with words keeps the key it had (the `was` pins,
   derived by tests/lib/layout-continuity.cjs from the frozen census
   tests/fixtures/layout-keys/palette.tsv), so a CMS edit saved against the old page still
   lands. Regression: tests/palette-blocks.cjs. */
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
  var THEME_NAMES = { ghost: 'Ember dark', glacier: 'Ember light', clay: 'Tide dark', grove: 'Tide light', ochre: 'Moss dark', moss: 'Moss light', marine: 'Dune dark', bone: 'Dune light', dusk: 'Dusk dark', dawn: 'Dusk light' };

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function swatch(token, label, sub) {
    var s = el('div', 'palette-swatch');
    var chip = el('span', 'palette-chip'); chip.style.background = 'hsl(var(--' + token + '))';
    s.appendChild(chip); s.appendChild(el('b', '', label)); if (sub) s.appendChild(el('small', '', sub));
    s.title = '--' + token;
    return s;
  }
  function shades(role) {
    var grid = el('div', 'palette-shades');
    SHADES.forEach(function (s) { grid.appendChild(swatch(role + '-' + s[0], s[0], s[1])); });
    var ink = swatch(role + '-ink', 'ink', 'text on base'); ink.querySelector('.palette-chip').style.boxShadow = 'inset 0 0 0 8px hsl(var(--' + role + '))'; grid.appendChild(ink);
    return grid;
  }
  function tones(role) {
    var grid = el('div', 'palette-tones');
    TONES.forEach(function (t) { grid.appendChild(swatch(role + '-tone-' + t, t)); });
    return grid;
  }
  function neutrals() {
    var grid = el('div', 'palette-shades');
    NEUTRALS.forEach(function (n) { grid.appendChild(swatch(n, n)); });
    return grid;
  }
  /* The site's five action paints, drawn by css/components.css (the classes are its selectors). */
  function components() {
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
    return row;
  }
  function familyName() {
    var key = document.documentElement.dataset.theme || 'ghost';
    return THEME_NAMES[key] || key;
  }

  /* One colour role: what it is for, its shades, and (for the three hue roles) its tonal scale. */
  function role(entry) {
    var specs = [
      { block: 'section-header', props: { title: entry[1] + ' · --' + entry[0], lede: entry[2], level: 3 } },
      { block: 'figure', props: { kind: 'live', slot: 'shades-' + entry[0], caption: 'Shades of --' + entry[0] + ' in the active theme, 100 to 700, and its ink: the text colour on the base.' } }
    ];
    if (['primary', 'secondary', 'reference'].indexOf(entry[0]) >= 0) {
      specs.push({ block: 'figure', props: { kind: 'live', slot: 'tones-' + entry[0], caption: 'Tonal scale, for illustration' } });
    }
    return specs;
  }
  var byKey = {}; ROLES.forEach(function (entry) { byKey[entry[0]] = entry; });

  /* `was`: the layout key each element had on the old page, by spec entry, so a CMS edit saved
     against the old page lands on the same content. Derived by tests/lib/layout-continuity.cjs
     (derive /palette, from the frozen census tests/fixtures/layout-keys/palette.tsv) -- except the
     `self` pins: containers whose words changed shape (the header became the hero, each section a
     tab panel or an accordion item); tests/palette-blocks.cjs lists each with its reason. */
  var WAS = {
    'palette-crumbs': { ':root': 'page:/div:1/nav:1', 'breadcrumb-item': 'page:/div:1/nav:1/a:1', 'breadcrumb-item#2': 'page:/div:1/nav:1/span:1' },
    'palette-hero': { ':root': { key: 'page:/div:1/header:1', self: true }, 'eyebrow': 'page:/div:1/header:1/p:1', 'hero-meta': 'page:/div:1/header:1/p:2', 'hero-lede': 'page:/div:1/header:1/p:3' },
    'palette-views': {
      'tabs-content': { key: 'page:/div:1/section:1', self: true }, 'tabs-trigger': 'page:/div:1/section:1/h2:1', '[data-ark-slot="components"]': 'page:/div:1/section:1/div:1',
      'tabs-content#2': { key: 'page:/div:1/section:2', self: true }, 'section-title': 'page:/div:1/section:2/h2:1', 'section-lede': 'page:/div:1/section:2/p:1',
      '[data-ark-slot="shades-primary"]': 'page:/div:1/section:2/div:1', 'figure-caption#3': 'page:/div:1/section:2/p:2', '[data-ark-slot="tones-primary"]': 'page:/div:1/section:2/div:2',
      'tabs-content#3': { key: 'page:/div:1/section:3', self: true }, 'section-title#2': 'page:/div:1/section:3/h2:1', 'section-lede#2': 'page:/div:1/section:3/p:1',
      '[data-ark-slot="shades-secondary"]': 'page:/div:1/section:3/div:1', 'figure-caption#5': 'page:/div:1/section:3/p:2', '[data-ark-slot="tones-secondary"]': 'page:/div:1/section:3/div:2',
      'tabs-content#4': { key: 'page:/div:1/section:4', self: true }, 'section-title#3': 'page:/div:1/section:4/h2:1', 'section-lede#3': 'page:/div:1/section:4/p:1',
      '[data-ark-slot="shades-reference"]': 'page:/div:1/section:4/div:1', 'figure-caption#7': 'page:/div:1/section:4/p:2', '[data-ark-slot="tones-reference"]': 'page:/div:1/section:4/div:2',
      'accordion-item': { key: 'page:/div:1/section:5', self: true }, 'accordion-trigger': 'page:/div:1/section:5/h2:1',
      ':scope > div:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': 'page:/div:1/section:5/p:1', '[data-ark-slot="shades-success"]': 'page:/div:1/section:5/div:1',
      'accordion-item#2': { key: 'page:/div:1/section:6', self: true }, 'accordion-trigger#2': 'page:/div:1/section:6/h2:1',
      ':scope > div:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': 'page:/div:1/section:6/p:1', '[data-ark-slot="shades-warning"]': 'page:/div:1/section:6/div:1',
      'accordion-item#3': { key: 'page:/div:1/section:7', self: true }, 'accordion-trigger#3': 'page:/div:1/section:7/h2:1',
      ':scope > div:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': 'page:/div:1/section:7/p:1', '[data-ark-slot="shades-danger"]': 'page:/div:1/section:7/div:1',
      'tabs-content#6': { key: 'page:/div:1/section:8', self: true }, 'tabs-trigger#6': 'page:/div:1/section:8/h2:1', '[data-ark-slot="neutrals"]': 'page:/div:1/section:8/div:1'
    },
    'palette-onward': { ':root': 'page:/div:1/nav:2' }
  };

  /* The page, as data. */
  function spec(family) {
    return [
      { block: 'breadcrumb', id: 'palette-crumbs', props: { label: 'Your place', items: [{ label: 'Home', href: 'route:zero' }, { label: 'Interface palette' }] },
        was: WAS['palette-crumbs'] },
      { block: 'hero', id: 'palette-hero', props: {
          eyebrow: '// Design system', title: 'Palette', density: 'compact',
          lede: 'Three roles share one lightness and chroma, so only hue tells them apart. Neutrals carry a trace of the primary hue. Every tint on the site is one of the shades below. Switch themes from the settings panel to compare families.',
          meta: [{ label: 'Active theme', value: family }] },
        was: WAS['palette-hero'] },
      { block: 'tabs', id: 'palette-views', was: WAS['palette-views'], props: { label: 'Palette views', variant: 'segmented', items: [
        { value: 'components', label: 'Components', blocks: [
          { block: 'figure', props: { kind: 'live', slot: 'components', caption: 'The site\'s action paints in the active theme: solid for the main call to action once per view, soft when it repeats, quiet for secondary actions, choice for tabs and pickers, and the text link.' } }
        ] },
        { value: 'primary', label: 'Primary', blocks: role(byKey.primary) },
        { value: 'secondary', label: 'Secondary', blocks: role(byKey.secondary) },
        { value: 'reference', label: 'Reference', blocks: role(byKey.reference) },
        { value: 'states', label: 'States', blocks: [
          { block: 'accordion', props: { label: 'State colours', multiple: true, defaultOpen: ['success'], items: ['success', 'warning', 'danger'].map(function (key) {
            return { value: key, title: byKey[key][1] + ' · --' + key, content: byKey[key][2], blocks: [{ block: 'figure', props: { kind: 'live', slot: 'shades-' + key, caption: 'Shades of --' + key + ' in the active theme, 100 to 700, and its ink.' } }] };
          }) } }
        ] },
        { value: 'neutrals', label: 'Neutrals', blocks: [
          { block: 'section-header', props: { title: 'Neutrals', lede: 'Surfaces from the canvas up, then text from faint to strong. Each carries a trace of the primary hue.', level: 3 } },
          { block: 'figure', props: { kind: 'live', slot: 'neutrals', caption: 'The surface and text tokens in the active theme.' } }
        ] }
      ] } },
      { insert: 'main', was: { key: 'page:/div:1/div:1', self: true } },
      { block: 'actions', id: 'palette-onward', was: WAS['palette-onward'], props: { label: 'Continue', items: [
        { label: 'Home', href: 'route:zero', tone: 'ghost' },
        { label: 'Theme settings', action: 'open-theme-settings', tone: 'secondary' }
      ] } }
    ];
  }

  function slots() {
    var out = { components: components, neutrals: neutrals };
    ROLES.forEach(function (entry) {
      out['shades-' + entry[0]] = function () { return shades(entry[0]); };
      out['tones-' + entry[0]] = function () { return tones(entry[0]); };
    });
    return out;
  }

  ArkUI.pageModules.palette = {
    spec: spec,
    mount: function (host) {
      var page = ArkUI.page(spec(familyName()), host, {
        page: 'palette', className: 'palette-page', titleId: 'palette-title', slots: slots(),
        actions: {
          /* The settings panel chooses the theme this page shows (its "See the full palette" leads here). */
          'open-theme-settings': function () {
            var trigger = document.querySelector('.settings-trigger');
            if (trigger && trigger.getAttribute('aria-expanded') !== 'true') trigger.click();
            if (trigger) trigger.focus();
          }
        }
      });
      /* The active theme's name follows a theme switch without a remount. */
      var family = page.querySelector('#palette-hero [data-ark-part="hero-meta"] dd');
      function paintFamily() { if (family) family.textContent = familyName(); }
      var observer = typeof MutationObserver !== 'undefined' ? new MutationObserver(paintFamily) : null;
      if (observer) observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      page.arkDispose = function () { if (observer) observer.disconnect(); };
      return page;
    }
  };
})();
