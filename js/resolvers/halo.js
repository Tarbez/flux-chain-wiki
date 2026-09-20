/* =====================================================================
   RESOLVER  RHALO_V1  —  the grainy ring
   ---------------------------------------------------------------------
   A square canvas centred on the ring, sized in composition units (s, see
   js/tokens.js) so it tracks the poster-sized composition, not the raw
   screen. The pixels come from Halo.paint (js/halo/grain.js).

   Flux props (lengths in s, 1s = 1% of the poster width; position in % of
   the stage height):
     -R-  outer radius, where the ring reaches zero      (44.52pct)
     -N-  inner radius, where the hollow ends            (20.96pct)
     -A-  peak white opacity, 40 = the reference         (40pct)
     -D-  grain cells across the diameter                (520)
     -P-  vertical centre                                (48pct)
   ===================================================================== */
ArkUI.register('RHALO_V1', {
  tag: 'canvas',
  aliases: ['RRING_V1'],                               /* F-HALO-RRING_V1 */
  schema: { R: 'radius', N: 'inner', A: 'alpha', D: 'density', P: 'position' },
  base: {
    position: 'absolute',
    left: '50%',
    display: 'block',
    transform: 'translate(-50%, -50%)',
    imageRendering: 'pixelated',
    zIndex: '0',
    pointerEvents: 'none'
  },
  style: function (p) {
    var d = ArkProps.num(p.radius, 44.52) * 2;
    return {
      top: ArkProps.num(p.position, 48) + '%',
      width: 'calc(' + d + ' * var(--ark-s))',
      height: 'calc(' + d + ' * var(--ark-s))'
    };
  },
  attrs: function () {
    return { 'aria-hidden': 'true', role: 'presentation' };
  },
  emerge: { delay: 600, dur: 900 },
  onMount: function (el, p) { Halo.paint(el, p); }
});
