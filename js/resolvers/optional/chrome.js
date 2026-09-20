/* OPTIONAL, not loaded by index.html. See README.md to switch these back on.
   ===================================================================== */
/* =====================================================================
   RESOLVERS  RTOP_V1 · RLINE_V1 · RBAR_V1  —  the poster's chrome
   ---------------------------------------------------------------------
   RTOP_V1   the header row: a centred group ("Designed by ——— author")
   RLINE_V1  the hairline rule inside that group
   RBAR_V1   the footer row: a prompt on the left, the progress pill after
             it. Left-aligned, NOT spread edge to edge; the reference
             leaves the space to the right of the pill empty.

   Flux props:
     RLINE_V1   -W-  width in u   -H-  thickness in u   -C-  colour
   ===================================================================== */
ArkUI.register('RTOP_V1', {
  tag: 'div',
  base: {
    position: 'absolute',
    top: '5.3%',
    left: '0',
    right: '0',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Tokens.u(1.83),
    zIndex: '3'
  },
  emerge: { delay: 1500, dur: 600 }
});

ArkUI.register('RLINE_V1', {
  tag: 'span',
  schema: { W: 'width', H: 'height', C: 'color' },
  base: {
    display: 'block',
    flex: '0 0 auto'
  },
  style: function (p) {
    return {
      width: Tokens.u(ArkProps.num(p.width, 20.7)),
      height: Tokens.u(ArkProps.num(p.height, 0.17)),
      background: ArkProps.color(p.color, Tokens.v('rule'))
    };
  },
  attrs: function () { return { 'aria-hidden': 'true' }; }
});

ArkUI.register('RBAR_V1', {
  tag: 'div',
  aliases: ['RBOTTOM_V1'],                             /* F-BAR-RBOTTOM_V1 */
  base: {
    position: 'absolute',
    top: '94.93%',
    left: 'calc(50cqw - 42.35 * var(--ark-s))',
    right: 'calc(50cqw - 42.35 * var(--ark-s))',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Tokens.u(3.03),
    zIndex: '3'
  },
  emerge: { delay: 1300, dur: 600 }
});
