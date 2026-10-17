/* =====================================================================
   RESOLVER  RBLOCK_CARD_V1  —  a generic icon + title + text card
   ---------------------------------------------------------------------
   Part of the general component system (js/content/components.js).

   Props:
     icon    optional. A name from ArkUI.icon's set (js/ark/icons.js) --
             the same native icon sheet about.js and the rest of the site
             already draw from, never an invented icon of its own.
     title   card heading.
     text    card body.
   ===================================================================== */
ArkUI.register('RBLOCK_CARD_V1', {
  tag: 'article',
  base: {
    display: 'block',
    padding: '20px',
    borderRadius: 'var(--size-card-radius)',
    backgroundColor: 'hsl(var(--surface))',
    border: '1px solid hsl(var(--border-default))'
  },
  decorate: function (el, p) {
    if (p.icon && ArkUI.icon) {
      var icon = ArkUI.icon(p.icon);
      if (icon) {
        icon.classList.add(ArkUI.atomize({ display: 'block', marginBottom: '12px', color: 'hsl(var(--primary))' }));
        el.appendChild(icon);
      }
    }
    if (p.title) {
      var title = document.createElement('h3');
      title.textContent = p.title;
      title.className = ArkUI.atomize({
        fontFamily: 'var(--font-display)',
        fontSize: 'var(--type-h3)',
        color: 'hsl(var(--text-strong))',
        margin: '0 0 8px'
      });
      el.appendChild(title);
    }
    if (p.text) {
      var text = document.createElement('p');
      text.textContent = p.text;
      text.className = ArkUI.atomize({
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--type-body)',
        color: 'hsl(var(--text))',
        lineHeight: '1.6',
        margin: '0'
      });
      el.appendChild(text);
    }
  }
});
