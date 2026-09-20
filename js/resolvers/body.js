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
  tag: 'p',
  schema: { E: 'eyebrow', T: 'text', S: 'size', C: 'color', P: 'position', G: 'gap' },
  base: {
    position: 'absolute',
    left: Tokens.v('body-x'),
    maxWidth: Tokens.v('body-w'),
    margin: '0',
    textAlign: 'left',
    textWrap: 'balance',
    fontWeight: '300',
    lineHeight: '1.43',
    zIndex: '2'
  },
  style: function (p) {
    var a = ArkProps.num(p.position, 48) + '%';
    return {
      top: 'max(calc(' + a + ' + ' + Tokens.u(17) + '), min(calc(' + a + ' + ' +
           Tokens.u(ArkProps.num(p.gap, 30.5)) + '), calc(100% - ' + Tokens.u(24) + ')))',
      fontSize: Tokens.u(ArkProps.num(p.size, 1.98)),
      color: ArkProps.color(p.color, Tokens.v('ink-body'))
    };
  },
  text: function (p) { return p.text || ''; },
  decorate: function (el, p) {
    if (!p.eyebrow) return;
    var eyebrow = document.createElement('span');
    eyebrow.textContent = p.eyebrow;
    eyebrow.className = ArkUI.atomize({
      display: 'block',
      marginBottom: Tokens.u(1.1),
      fontSize: 'max(11px, ' + Tokens.u(1.05) + ')',
      fontWeight: '500',
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: Tokens.v('ink-eyebrow')
    });
    el.insertBefore(eyebrow, el.firstChild);
  },
  emerge: { delay: 1300, dur: 600 }
});
