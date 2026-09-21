/* =====================================================================
   RESOLVER  RLOGO_V1  —  the logo
   ---------------------------------------------------------------------
   A separate identity mark rather than a miniature copy of the hero. The
   open oval is interrupted by a horizon line: a zero moved below zero.
   The compact two-line wordmark keeps the identity legible at small sizes.

   Everything is sized in em from one font size, so the mark and the word
   always keep their proportion.

   Flux props:
     -A-  the heavy half of the wordmark   (SUB)
     -B-  the light half                   (ZERO)
     -H-  where the logo links             (#)
   ===================================================================== */
ArkUI.register('RLOGO_V1', {
  tag: 'a',
  schema: { A: 'lead', B: 'tail', H: 'href' },
  copy: ['lead', 'tail'],
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.72em',
    fontSize: 'max(12px, ' + Tokens.u(1.18) + ')',
    textDecoration: 'none',
    color: Tokens.v('ink'),
    lineHeight: '1',
    whiteSpace: 'nowrap'
  },
  attrs: function (p) {
    return { href: p.href || '#', 'aria-label': (p.lead || '') + (p.tail || '') + ', home' };
  },
  decorate: function (el, p) {
    el.classList.add('ark-logo');
    var mark = document.createElement('span');
    mark.setAttribute('aria-hidden', 'true');
    mark.className = 'ark-logo-mark';
    mark.innerHTML = '<i></i><b></b><em></em>';

    var word = document.createElement('span');
    word.className = 'ark-logo-word';
    var lead = document.createElement('span');
    lead.textContent = p.lead || '';
    lead.className = 'ark-logo-lead';
    var tail = document.createElement('span');
    tail.textContent = p.tail || '';
    tail.className = 'ark-logo-tail';
    word.appendChild(lead);
    word.appendChild(tail);

    el.appendChild(mark);
    el.appendChild(word);
  }
});
