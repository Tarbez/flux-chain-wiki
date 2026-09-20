/* =====================================================================
   RESOLVERS  RNAV_V1 · RLINK_V1  —  navigation
   ---------------------------------------------------------------------
   RNAV_V1   the row of links (a real <nav>, so assistive tech can jump to it)
   RLINK_V1  one link: quiet upper-case text that brightens on hover and
             draws an underline (the underline and hover colour live in
             Tokens.css(), because a pseudo-element cannot be atomized)

   Flux props (RLINK_V1):
     -L-  label
     -H-  destination                                   (#)
   ===================================================================== */
ArkUI.register('RNAV_V1', {
  tag: 'nav',
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: 'max(18px, ' + Tokens.u(3.4) + ')'
  },
  attrs: function () { return { 'aria-label': 'Primary' }; }
});

ArkUI.register('RLINK_V1', {
  tag: 'a',
  schema: { I: 'index', L: 'label', H: 'href' },
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '44px',                               /* a comfortable touch target */
    gap: '0.7em',
    fontSize: 'max(11px, ' + Tokens.u(1.02) + ')',
    fontWeight: '500',
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    color: Tokens.v('ink-muted'),
    lineHeight: '1',
    whiteSpace: 'nowrap',
    transition: 'color 200ms ease'
  },
  attrs: function (p) { return { href: p.href || '#' }; },
  decorate: function (el, p) {
    el.classList.add('ark-link');
    var index = document.createElement('span');
    index.className = 'ark-link-index';
    index.textContent = p.index || '';
    var label = document.createElement('span');
    label.textContent = p.label || '';
    el.appendChild(index);
    el.appendChild(label);
  }
});
