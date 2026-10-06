/* =====================================================================
   RESOLVER  RSTEP_V1  —  the step pill ("2. Make it Useful")
   ---------------------------------------------------------------------
   A dark rounded rectangle with a metallic border that ramps light to
   dark across its width. The border is a second background clipped to the
   border box, so the corners stay clean without a mask or a pseudo-element.

   The pill is 28.5u x 7.4u at rest. Those are minimums, not fixed sizes:
   if a small screen forces the label above its proportional size (see the
   7px floor on u in js/tokens.js) the pill grows with it instead of
   clipping the text.

   Flux props:
     -N-  step number, optional. Given: "2. Label". Absent: just "Label".
     -L-  label
     -K-  letter-spacing in em                      (0)
     -P-  vertical centre, % of the stage height    (48pct)
   ===================================================================== */
ArkUI.register('RSTEP_V1', {
  tag: 'div',
  aliases: ['RPILL_V1'],                               /* F-STEP-RPILL_V1 */
  schema: { N: 'step', L: 'label', K: 'tracking', P: 'position' },
  copy: ['label'],
  base: {
    position: 'absolute',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 'max-content',
    minWidth: '0',
    minHeight: '0',
    padding: '0',
    border: '0',
    borderRadius: '0',
    background: 'transparent',
    color: 'hsl(var(--text-muted))',
    fontSize: 'max(10px, ' + Tokens.u(0.92) + ')',
    fontWeight: '500',
    lineHeight: '1',
    whiteSpace: 'nowrap',
    zIndex: '3',
    backdropFilter: 'none'
  },
  style: function (p) {
    var k = ArkProps.num(p.tracking, 0);
    return {
      top: ArkProps.num(p.position, 48) + '%',
      letterSpacing: k + 'em',
      /* letter-spacing adds a gap after the last letter; pad the left to keep the word centred */
      paddingLeft: k + 'em'
    };
  },
  text: function (p) { return p.step ? p.step + '. ' + (p.label || '') : (p.label || ''); },
  decorate: function (el) { el.classList.add('ark-field-pill'); },
  emerge: { delay: 900, dur: 600 }
});
