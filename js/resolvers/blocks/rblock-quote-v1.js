/* =====================================================================
   RESOLVER  RBLOCK_QUOTE_V1  —  a generic pull-quote block
   ---------------------------------------------------------------------
   Part of the general component system (js/content/components.js).

   Props:
     quote         the quoted text.
     attribution   optional, who said it.
   ===================================================================== */
ArkUI.register('RBLOCK_QUOTE_V1', {
  tag: 'blockquote',
  base: {
    display: 'block',
    margin: '16px 0',
    padding: '0 0 0 20px',
    borderLeft: '3px solid hsl(var(--primary))'
  },
  decorate: function (el, p) {
    if (p.quote) {
      var quote = document.createElement('p');
      quote.textContent = p.quote;
      quote.className = ArkUI.atomize({
        fontFamily: 'var(--font-display)',
        fontSize: 'var(--type-h3)',
        fontStyle: 'italic',
        color: 'hsl(var(--text-strong))',
        margin: '0 0 8px',
        lineHeight: '1.3'
      });
      el.appendChild(quote);
    }
    if (p.attribution) {
      var cite = document.createElement('cite');
      cite.textContent = p.attribution;
      cite.className = ArkUI.atomize({
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--type-metadata)',
        color: 'hsl(var(--text-muted))',
        fontStyle: 'normal'
      });
      el.appendChild(cite);
    }
  }
});
