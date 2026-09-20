/* OPTIONAL, not loaded by index.html. See README.md to switch this back on. */
/* =====================================================================
   RESOLVER  RSUB_V1  —  the centred subtitle under the step pill
   ---------------------------------------------------------------------
   Anchored to the pill, not to the screen: -P- is the pill's centre (% of
   stage height) and -G- how far below it the subtitle sits, in u. The gap
   then stays put on any screen shape.

   Flux props:  -T- text   -S- size in u   -C- colour (hex, no '#')
                -P- anchor %   -G- gap in u
   ===================================================================== */
ArkUI.register('RSUB_V1', {
  tag: 'p',
  schema: { T: 'text', S: 'size', C: 'color', P: 'position', G: 'gap' },
  base: {
    position: 'absolute',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    margin: '0',
    textAlign: 'center',
    fontWeight: '400',
    lineHeight: '1.2',
    whiteSpace: 'nowrap',
    zIndex: '2'
  },
  style: function (p) {
    return {
      top: 'calc(' + ArkProps.num(p.position, 48) + '% + ' + Tokens.u(ArkProps.num(p.gap, 8.2)) + ')',
      fontSize: Tokens.u(ArkProps.num(p.size, 2.5)),
      color: ArkProps.color(p.color, Tokens.v('ink'))
    };
  },
  text: function (p) { return p.text || ''; },
  emerge: { delay: 1100, dur: 600 }
});
