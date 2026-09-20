/* OPTIONAL, not loaded by index.html. See README.md to switch this back on. */
/* =====================================================================
   RESOLVER  RPILL_DOT_V1  —  the progress pill
   ---------------------------------------------------------------------
   A hollow pill holding a row of dashes (the active one brighter and a
   touch heavier) and a drawn arrow. The arrow is an SVG stroke, not a "→"
   glyph: the reference arrow is a long shaft with a chevron head, and no
   font's arrow has that shape.

   Flux props:
     -N-      number of dashes                       (6)
     -A-      active dash, counting from 0           (2)
     -ARROW-  'right' or 'left'                      (right)

   The pill is a real <button> but is not wired to anything yet.
   ===================================================================== */
ArkUI.register('RPILL_DOT_V1', {
  tag: 'button',
  schema: { N: 'count', A: 'active', ARROW: 'arrow' },
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: Tokens.u(0.8),
    height: Tokens.u(4.92),
    padding: '0 ' + Tokens.u(2.44),
    borderRadius: '999px',
    border: 'max(1px, ' + Tokens.u(0.13) + ') solid ' + Tokens.v('nav-edge'),
    background: 'transparent',
    color: Tokens.v('ink'),
    font: 'inherit',
    lineHeight: '1',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent'
  },
  attrs: function (p) {
    var count = ArkProps.num(p.count, 6);
    var active = ArkProps.num(p.active, 0);
    return {
      type: 'button',
      'aria-label': 'Continue — step ' + (active + 1) + ' of ' + count
    };
  },
  decorate: function (el, p) {
    var count = ArkProps.num(p.count, 6);
    var active = ArkProps.num(p.active, 0);

    var track = document.createElement('span');
    track.setAttribute('aria-hidden', 'true');
    track.className = ArkUI.atomize({
      display: 'inline-flex',
      alignItems: 'center',
      gap: Tokens.u(0.61)
    });

    for (var i = 0; i < count; i++) {
      var dash = document.createElement('span');
      dash.className = ArkUI.atomize(i === active
        ? { display: 'block', width: Tokens.u(0.72), height: Tokens.u(0.34), background: Tokens.v('dash-on') }
        : { display: 'block', width: Tokens.u(0.72), height: Tokens.u(0.23), background: Tokens.v('dash') });
      track.appendChild(dash);
    }

    var NS = 'http://www.w3.org/2000/svg';
    var arrow = document.createElementNS(NS, 'svg');
    arrow.setAttribute('viewBox', '0 0 24 24');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.setAttribute('fill', 'none');
    arrow.setAttribute('stroke', 'currentColor');
    arrow.setAttribute('stroke-width', '2.3');
    arrow.setAttribute('stroke-linecap', 'round');
    arrow.setAttribute('stroke-linejoin', 'round');
    arrow.setAttribute('class', ArkUI.atomize({
      display: 'block',
      width: Tokens.u(2.07),
      height: Tokens.u(2.07),
      flex: '0 0 auto',
      transform: String(p.arrow || 'right') === 'left' ? 'scaleX(-1)' : ''
    }));
    var path = document.createElementNS(NS, 'path');
    path.setAttribute('d', 'M1.5 12H22 M13.2 3.2L22 12l-8.8 8.8');
    arrow.appendChild(path);

    el.appendChild(track);
    el.appendChild(arrow);
  }
});
