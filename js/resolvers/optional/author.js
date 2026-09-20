/* OPTIONAL, not loaded by index.html. See README.md to switch this back on. */
/* =====================================================================
   RESOLVER  RAVATAR_V1  —  the author pill
   ---------------------------------------------------------------------
   Avatar, upper-case name, handle. It is a link only when the pattern
   supplies an -H- href; a handle alone is not a URL, and inventing one
   would send people somewhere the author never said.

   Flux props:
     -N-    display name
     -U-    handle, shown under the name
     -H-    optional link target, full URL
     -IMG-  avatar image path, relative to index.html
   ===================================================================== */
ArkUI.register('RAVATAR_V1', {
  tag: 'a',
  schema: { N: 'name', U: 'url', H: 'href', IMG: 'img' },
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: Tokens.u(0.75),
    height: Tokens.u(4.33),
    padding: '0 ' + Tokens.u(1.1),
    borderRadius: '999px',
    border: 'max(1px, ' + Tokens.u(0.09) + ') solid ' + Tokens.v('author-edge'),
    textDecoration: 'none',
    color: Tokens.v('ink'),
    lineHeight: '1',
    whiteSpace: 'nowrap',
    flex: '0 0 auto'
  },
  attrs: function (p) {
    return p.href ? { href: p.href, target: '_blank', rel: 'noopener noreferrer' } : null;
  },
  decorate: function (el, p) {
    if (p.img) {
      var img = document.createElement('img');
      img.src = p.img;
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      img.className = ArkUI.atomize({
        display: 'block',
        width: Tokens.u(2.72),
        height: Tokens.u(2.72),
        borderRadius: '999px',
        objectFit: 'cover',
        flex: '0 0 auto'
      });
      el.appendChild(img);
    }

    var name = document.createElement('span');
    name.textContent = String(p.name || '').toUpperCase();
    name.className = ArkUI.atomize({
      display: 'block',
      fontSize: Tokens.u(0.93),
      fontWeight: '700',
      color: Tokens.v('ink')
    });

    var handle = document.createElement('span');
    handle.textContent = p.url || '';
    handle.className = ArkUI.atomize({
      display: 'block',
      marginTop: Tokens.u(0.28),
      fontSize: Tokens.u(0.78),
      fontWeight: '500',
      color: Tokens.v('ink-handle')
    });

    var stack = document.createElement('span');
    stack.className = ArkUI.atomize({ display: 'block' });
    stack.appendChild(name);
    stack.appendChild(handle);
    el.appendChild(stack);
  }
});
