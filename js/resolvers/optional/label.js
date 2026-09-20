/* =====================================================================
   RESOLVER  RTEXT_V1  —  a plain inline label     (OPTIONAL, not loaded)
   ---------------------------------------------------------------------
   Used by the header ("Designed by") and footer prompt of the reference
   poster, both of which were removed from the page. See README.md for how
   to switch them back on.

   Flux props:  -T- text   -S- size in u   -C- colour (hex, no '#')
                -WT- font weight
   ===================================================================== */
ArkUI.register('RTEXT_V1', {
  tag: 'span',
  schema: { T: 'text', S: 'size', C: 'color', WT: 'weight' },
  base: {
    display: 'inline-block',
    lineHeight: '1.2',
    whiteSpace: 'nowrap'
  },
  style: function (p) {
    return {
      fontSize: Tokens.u(ArkProps.num(p.size, 2)),
      fontWeight: String(ArkProps.num(p.weight, 400)),
      color: ArkProps.color(p.color, Tokens.v('ink'))
    };
  },
  text: function (p) { return p.text || ''; }
});
