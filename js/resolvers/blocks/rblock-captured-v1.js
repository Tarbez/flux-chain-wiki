/* =====================================================================
   RESOLVER  RBLOCK_CAPTURED_V1  —  a component made from a selection
   ---------------------------------------------------------------------
   Part of the general component system (js/content/components.js). The
   other six blocks are typed (a Text block, a Button block...); this one
   is whatever the owner selected on the page and made into a component:
   its definition is that selection's own captured element tree, and its
   props are the tree's text/image slots (ArkComponents.propsOf).

   The root is display:contents, so the captured elements lay out as
   children of whatever holds the instance -- in the spot that replaced the
   original selection they sit exactly where the originals sat, in the
   same flex/grid flow. The building itself lives in ArkComponents.
   buildNode, beside capture(), so capture and rebuild are one module's
   two halves and cannot drift apart.

   Props:
     tree      injected by ArkComponents.render (the master's definition), never user data.
     <slot>    one per text/image slot in the tree, e.g. heading, paragraph, link2, image.
   ===================================================================== */
ArkUI.register('RBLOCK_CAPTURED_V1', {
  tag: 'div',
  base: { display: 'contents' },
  decorate: function (el, p) {
    (p.tree || []).forEach(function (node) {
      var built = ArkComponents.buildNode(node, p, el.ownerDocument);
      if (built) el.appendChild(built);
    });
  }
});
