/* =====================================================================
   RESOLVER  RBODY_V1  —  the copy block
   ---------------------------------------------------------------------
   A small upper-case eyebrow over a left-aligned paragraph, hung from the
   pill like the CTA: 30.5u below the pill's centre, which is where the
   reference poster has its paragraph. The top is clamped two ways so a
   screen that is short or small never breaks the layout: never closer to
   the CTA than 17u (the CTA's bottom edge
   is about 14u below the pill's centre), and never lower than 24u above the bottom edge.

   `text-wrap: balance` keeps a short paragraph from ending on one orphaned
   word; engines without it simply wrap as usual.

   Flux props (sizes in u, 1u = 1% of the poster width; see js/tokens.js):
     -E-   eyebrow line (optional). Shown in capitals.
     -T-   paragraph
     -S-   paragraph size, in u
     -C-   paragraph colour, hex without '#'
     -P-   anchor: the pill's vertical centre, %
     -G-   distance below that anchor, in u
   ===================================================================== */
ArkUI.register('RBODY_V1', {
  tag: 'section',
  schema: { E: 'eyebrow', H: 'headline', T: 'text', S: 'size', C: 'color', P: 'position', G: 'gap' },
  base: {
    position: 'absolute',
    left: 'max(20px, 5.2cqw)',
    bottom: 'max(28px, 4.4cqh)',
    maxWidth: 'min(42cqw, 560px)',
    margin: '0',
    textAlign: 'left',
    zIndex: '3'
  },
  style: function (p) {
    return {
      fontSize: Tokens.u(ArkProps.num(p.size, 1.98)),
      color: ArkProps.color(p.color, Tokens.v('ink-body'))
    };
  },
  decorate: function (el, p) {
    var eyebrow = document.createElement('span');
    eyebrow.textContent = p.eyebrow || '';
    eyebrow.className = 'ark-hero-eyebrow';
    var headline = document.createElement('h1');
    headline.className = 'ark-hero-title';
    headline.textContent = p.headline || '';
    var copy = document.createElement('p');
    copy.className = 'ark-hero-copy';
    copy.textContent = p.text || '';
    el.appendChild(eyebrow);
    el.appendChild(headline);
    el.appendChild(copy);
    el.classList.add('ark-hero-body');
    /* Atomized baseline styles preserve the no-extra-stylesheet fallback. */
    eyebrow.className = ArkUI.atomize({
      display: 'block',
      marginBottom: Tokens.u(1.4),
      fontSize: 'max(11px, ' + Tokens.u(1.05) + ')',
      fontWeight: '500',
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: Tokens.v('ink-eyebrow')
    }) + ' ark-hero-eyebrow';
  },
  emerge: { delay: 1300, dur: 600 }
});
