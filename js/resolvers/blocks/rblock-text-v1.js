/* =====================================================================
   RESOLVER  RBLOCK_TEXT_V1  —  a generic text block (heading + paragraph)
   ---------------------------------------------------------------------
   Part of the general component system (js/content/components.js). Built
   for normal CSS document flow -- not the hero scene's %/u coordinate
   space -- so it can sit anywhere a page module's own markup already flows.

   Props (plain, readable names: a component instance is never built
   through Flux source text, so there is no terse-key schema to map):
     heading   optional. Rendered as an <h2>, or <h3> when size is 'h3'.
     body      optional paragraph.
     align     'left' (default) or 'center'.
     size      'h2' (default) or 'h3'.
   ===================================================================== */
ArkUI.register('RBLOCK_TEXT_V1', {
  tag: 'section',
  base: { display: 'block', maxWidth: '720px' },
  style: function (p) {
    return { textAlign: p.align === 'center' ? 'center' : 'left' };
  },
  decorate: function (el, p) {
    if (p.heading) {
      var heading = document.createElement(p.size === 'h3' ? 'h3' : 'h2');
      heading.textContent = p.heading;
      heading.className = ArkUI.atomize({
        fontFamily: 'var(--font-display)',
        fontSize: p.size === 'h3' ? 'var(--type-h3)' : 'var(--type-h2)',
        color: 'hsl(var(--text-strong))',
        margin: '0 0 12px',
        lineHeight: '1.2'
      });
      el.appendChild(heading);
    }
    if (p.body) {
      var body = document.createElement('p');
      body.textContent = p.body;
      body.className = ArkUI.atomize({
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--type-body)',
        color: 'hsl(var(--text))',
        lineHeight: '1.6',
        margin: '0'
      });
      el.appendChild(body);
    }
  }
});
