/* =====================================================================
   RESOLVER  RBLOCK_DIVIDER_V1  —  a plain horizontal rule
   ---------------------------------------------------------------------
   Part of the general component system (js/content/components.js). No
   props: a divider is just a visual break in the flow.
   ===================================================================== */
ArkUI.register('RBLOCK_DIVIDER_V1', {
  tag: 'hr',
  base: {
    border: '0',
    borderTop: '1px solid hsl(var(--border-default))',
    margin: '32px 0'
  }
});
