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
  base: {
    position: 'absolute',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 'max-content',
    minWidth: Tokens.u(28.5),
    minHeight: Tokens.u(7.4),
    padding: Tokens.u(0.42) + ' ' + Tokens.u(1.5) + ' 0',   /* top pad: optical centring of the label */
    border: Tokens.u(0.51) + ' solid transparent',
    borderRadius: Tokens.u(2.55),
    background:
      'linear-gradient(' + Tokens.v('step-fill') + ',' + Tokens.v('step-fill') + ') padding-box,' +
      'linear-gradient(90deg,' + Tokens.v('step-edge-a') + ',' + Tokens.v('step-edge-b') + ') border-box',
    color: Tokens.v('ink'),
    fontSize: Tokens.u(2.71),
    fontWeight: '600',
    lineHeight: '1',
    whiteSpace: 'nowrap',
    zIndex: '2'
  },
  style: function (p) {
    var k = ArkProps.num(p.tracking, 0);
    return {
      top: ArkProps.num(p.position, 48) + '%',
      letterSpacing: k + 'em',
      /* letter-spacing adds a gap after the last letter; pad the left to keep the word centred */
      paddingLeft: 'calc(' + Tokens.u(1.5) + ' + ' + k + 'em)'
    };
  },
  text: function (p) { return p.step ? p.step + '. ' + (p.label || '') : (p.label || ''); },
  emerge: { delay: 900, dur: 600 }
});
