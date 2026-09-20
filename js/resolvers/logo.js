/* =====================================================================
   RESOLVER  RLOGO_V1  —  the logo
   ---------------------------------------------------------------------
   Drawn from the poster itself, so it reads as the same object at a
   different scale:

     mark      a miniature of the hero ring: the same grain painter
               (Halo.paint), lit from above the same way, with a tiny copy
               of the metallic step pill sitting in its hollow.
     wordmark  SUBZERO in one family, split by weight: SUB heavy, ZERO
               light. The light half echoes the hollow ring it names.

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
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8em',
    fontSize: 'max(13px, ' + Tokens.u(1.35) + ')',
    textDecoration: 'none',
    color: Tokens.v('ink'),
    lineHeight: '1',
    whiteSpace: 'nowrap'
  },
  attrs: function (p) {
    return { href: p.href || '#', 'aria-label': (p.lead || '') + (p.tail || '') + ', home' };
  },
  decorate: function (el, p) {
    var mark = document.createElement('span');
    mark.setAttribute('aria-hidden', 'true');
    mark.className = ArkUI.atomize({
      position: 'relative',
      display: 'block',
      width: '2.6em',
      height: '2.6em',
      flex: '0 0 auto'
    });

    var ring = document.createElement('canvas');
    ring.className = ArkUI.atomize({
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      display: 'block',
      imageRendering: 'pixelated'
    });
    mark.appendChild(ring);

    var pill = document.createElement('span');
    pill.className = ArkUI.atomize({
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: '0.84em',
      height: '0.24em',
      transform: 'translate(-50%, -50%)',
      border: 'max(1px, 0.045em) solid transparent',
      borderRadius: '0.08em',
      background:
        'linear-gradient(' + Tokens.v('step-fill') + ',' + Tokens.v('step-fill') + ') padding-box,' +
        'linear-gradient(90deg,' + Tokens.v('step-edge-a') + ',' + Tokens.v('step-edge-b') + ') border-box'
    });
    mark.appendChild(pill);

    var word = document.createElement('span');
    word.className = ArkUI.atomize({
      display: 'block',
      fontSize: '1em',
      letterSpacing: '0.3em',
      textTransform: 'uppercase'
    });
    var lead = document.createElement('span');
    lead.textContent = p.lead || '';
    lead.className = ArkUI.atomize({ fontWeight: '700', color: Tokens.v('ink') });
    var tail = document.createElement('span');
    tail.textContent = p.tail || '';
    tail.className = ArkUI.atomize({ fontWeight: '300', color: Tokens.v('ink-body') });
    word.appendChild(lead);
    word.appendChild(tail);

    el.appendChild(mark);
    el.appendChild(word);
  },
  onMount: function (el) {
    var canvas = el.querySelector('canvas');
    if (canvas) Halo.paint(canvas, { radius: 44.52, inner: 20.96, density: 44, alpha: 75 });
  }
});
