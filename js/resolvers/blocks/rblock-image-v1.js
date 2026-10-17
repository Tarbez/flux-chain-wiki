/* =====================================================================
   RESOLVER  RBLOCK_IMAGE_V1  —  a generic image block
   ---------------------------------------------------------------------
   Part of the general component system (js/content/components.js).

   Props:
     src       image URL or path.
     alt       accessible text. Never decorative-only: an inserted image is
               real page content, so a blank alt would silently drop it
               from the reading order, the same defect this workspace's
               "validate the payload" law warns against.
     caption   optional <figcaption> text.
   ===================================================================== */
ArkUI.register('RBLOCK_IMAGE_V1', {
  tag: 'figure',
  base: { display: 'block', margin: '16px 0', maxWidth: '100%' },
  decorate: function (el, p) {
    var img = document.createElement('img');
    img.src = p.src || '';
    img.alt = p.alt || '';
    img.loading = 'lazy';
    img.className = ArkUI.atomize({
      display: 'block',
      width: '100%',
      height: 'auto',
      borderRadius: 'var(--size-card-radius)'
    });
    el.appendChild(img);
    if (p.caption) {
      var caption = document.createElement('figcaption');
      caption.textContent = p.caption;
      caption.className = ArkUI.atomize({
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--type-metadata)',
        color: 'hsl(var(--text-muted))',
        marginTop: '8px'
      });
      el.appendChild(caption);
    }
  }
});
