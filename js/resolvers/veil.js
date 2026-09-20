/* =====================================================================
   RESOLVER  RVEIL_V1  —  the blur layer
   ---------------------------------------------------------------------
   A frosted layer across the WHOLE screen, over the ring (the "0") and
   under everything else. It is a real backdrop-filter, not a second
   painted ring, so it blurs whatever is actually behind it: the grain
   softens into a haze and the ring's light spills a little way into the
   dark around it, while its shape and its light-from-above gradient
   survive. Text, the logo and the buttons sit above it and stay sharp.

   Flux props:
     -B-  blur strength, in u. 0.5u is about 6px on a 1200px-wide poster.
          0 turns the layer off; ~0.2 keeps some grain, ~1.5 leaves a
          smooth glow.                                        (0.5)
   ===================================================================== */
ArkUI.register('RVEIL_V1', {
  tag: 'div',
  schema: { B: 'blur' },
  base: {
    position: 'absolute',
    top: '0',
    right: '0',
    bottom: '0',
    left: '0',
    zIndex: '1',
    pointerEvents: 'none'
  },
  style: function (p) {
    var blur = ArkProps.num(p.blur, 0.5);
    var filter = blur > 0 ? 'blur(' + Tokens.u(blur) + ')' : 'none';
    return { WebkitBackdropFilter: filter, backdropFilter: filter };
  },
  attrs: function () {
    return { 'aria-hidden': 'true', role: 'presentation' };
  },
  emerge: { delay: 600, dur: 900 }
});
