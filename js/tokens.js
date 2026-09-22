/* =====================================================================
   TOKENS
   ---------------------------------------------------------------------
   The one place a colour, a typeface or a size is decided. Everything is
   published as a CSS custom property (--ark-*), so the atomized styles
   reference `var(--ark-…)` and the scene can be re-themed without touching
   a resolver. Rules that cannot be atomized (hover states, pseudo-elements)
   live in css() below, next to the tokens they read.

   THE UNITS.  The composition was measured off a 3:4 poster. Two units
   carry it to any screen:

     s   the composition unit: 1% of the poster's width, i.e. the smaller of
         1% of the stage width and 0.75% of its height. The largest 3:4
         poster that fits the screen is centred on it, so the ring and the
         layout keep their proportions on a phone, a laptop and a monitor,
         and the black stage simply continues past them.
     u   the type/UI unit. Equal to s, but never below 7px, so text stays
         readable when the screen is small. The reference poster was 1178 px
         wide, so 1u = 11.78 px there; every size in the resolvers is a
         reading off that image divided by 11.78, which is why the numbers
         look odd (title 2.71u, paragraph 1.98u).

   Both are container-query lengths (cqw/cqh), resolved against the stage,
   so there are no media queries and nothing to keep in sync.

   This file only defines. main.js is the one place that applies it.
   ===================================================================== */
var Tokens = (function () {
  'use strict';

  /* -- colour --------------------------------------------------------- */
  var COLOR = {
    'canvas':      '#050507',                 /* the whole page                    */
    'ink':         '#eaeaef',                 /* pill title, CTA                   */
    'ink-body':    '#9a9aa6',                 /* the paragraph                     */
    'ink-eyebrow': '#6b6b76',                 /* the breadcrumb line above it      */
    'ink-muted':   '#6b6b76',                 /* navigation links at rest          */
    'cta-a':       '#eaeaef',                 /* CTA face, top …                   */
    'cta-b':       '#c9c9d2',                 /* … to bottom                       */
    'cta-ink':     '#050507',                 /* CTA label                         */
    'step-fill':   '#141419',                 /* step pill face                    */
    'step-edge-a': '#3a3a46',                 /* step pill border, left …          */
    'step-edge-b': '#6b6b76',                 /* … to right                        */

    /* used only by the optional components (js/resolvers/optional) */
    'nav-edge':    '#eaeaef',
    'ink-soft':    '#c9c9d2',
    'ink-handle':  '#9a9aa6',
    'rule':        '#6b6b76',
    'author-edge': 'rgba(234,234,239,0.34)',
    'dash':        'rgba(234,234,239,0.30)',
    'dash-on':     '#eaeaef'
  };

  /* -- type: one monospace family; weight and spacing carry hierarchy --- */
  var FONT = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, ' +
             '"Liberation Mono", "Courier New", monospace';

  /* -- geometry ------------------------------------------------------- */
  var GEOMETRY = {
    'stage-h':  '100vh',                                            /* upgraded to dvh below */
    's':        'min(1cqw, 0.75cqh)',
    'u':        'max(var(--ark-s), 7px)',
    /* The paragraph is 57.2s wide on the poster. On a small or short screen
       that is too narrow to read, so it may widen to 90% of the stage, up to
       520px. Its left edge sits 1.4s right of centre, as in the reference. */
    'body-w':   'max(calc(57.2 * var(--ark-s)), min(90cqw, 520px))',
    'body-x':   'calc(50cqw - var(--ark-body-w) / 2 + 1.4 * var(--ark-s))'
  };

  function decls(map) {
    var out = '';
    for (var k in map) {
      if (Object.prototype.hasOwnProperty.call(map, k)) out += '--ark-' + k + ':' + map[k] + ';';
    }
    return out;
  }

  /* Everything the atomizer's base sheet needs, as one string. `dvh` tracks
     the mobile URL bar; engines without it keep the `vh` value. */
  function css() {
    var vars = {};
    for (var c in COLOR) vars[c] = COLOR[c];
    vars['font'] = FONT;

    return (
      ':root{' + decls(vars) + decls(GEOMETRY) + '}' +
      '@supports (height:100dvh){:root{--ark-stage-h:100dvh}}' +

      '*,*::before,*::after{box-sizing:border-box}' +
      'html,body{margin:0;padding:0;background:var(--ark-canvas);overflow-x:clip}' +
      '.ark-zero{opacity:0}' +
      '.ark-link::after{content:"";position:absolute;left:0;right:0.16em;bottom:0.7em;height:1px;' +
        'background:currentColor;transform:scaleX(0);transform-origin:left center;' +
        'transition:transform 260ms cubic-bezier(0.22,0.61,0.36,1)}' +
      '.ark-link{position:relative}' +
      '.ark-link:hover,.ark-link:focus-visible{color:var(--ark-ink)}' +
      '.ark-link:hover::after,.ark-link:focus-visible::after{transform:scaleX(1)}' +
      '.ark-cta:hover{translate:0 -1px;filter:drop-shadow(0 0 calc(3.6 * var(--ark-u)) rgba(255,255,255,0.36)) brightness(1.04)}' +
      '.ark-cta:active{translate:0 0;scale:0.98}' +
      '@media (prefers-reduced-motion:reduce){.ark-cta,.ark-link,.ark-link::after{transition:none}}' +
      ':focus-visible{outline:2px solid #ffffff;outline-offset:3px;border-radius:6px}'
    );
  }

  /* var(--ark-name) */
  function v(name) { return 'var(--ark-' + name + ')'; }

  /* n units, as a length: u(2) is 2 type units. */
  function u(n) { return 'calc(' + n + ' * var(--ark-u))'; }

  return { css: css, v: v, u: u, colors: COLOR, font: FONT };
})();
