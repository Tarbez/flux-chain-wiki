/* =====================================================================
   RESOLVER  RZERO_V0  —  the scene root, the void itself
   ---------------------------------------------------------------------
   The stage: the whole viewport, black. It is a size container, so every
   descendant can use cqw/cqh and the composition (see js/tokens.js) is
   sized against the screen, not against the page.
   ===================================================================== */
ArkUI.register('RZERO_V0', {
  tag: 'div',
  schema: { S: 'sigil', CX: 'context', SIG: 'signature' },
  base: {
    position: 'relative',
    width: '100%',
    height: Tokens.v('stage-h'),
    containerType: 'size',
    background: Tokens.v('canvas'),
    overflow: 'hidden',
    isolation: 'isolate',
    colorScheme: 'dark',
    color: Tokens.v('ink'),
    fontFamily: Tokens.v('font'),
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale'
  },
  attrs: function (p) {
    return {
      'data-pattern': 'F-SCENE-RZERO_V0',
      'data-context': p.context || 'fullscreen black',
      'data-signature': p.signature || '0x'
    };
  }
});
