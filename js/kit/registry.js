/* =====================================================================
   THE KIT REGISTRY (DefxnKit): where a board element's renderer is registered
   ---------------------------------------------------------------------
   One renderer per element id of js/content/kit-boards.js. The Kit page (js/pages/kit.js) asks this registry
   what to draw; an id with no renderer shows as "Not built". Nothing here names an element.

     DefxnKit.register(id, render, info)
       render(host, ctx)  builds the element into host (an empty element the page owns) and may return a
                          function that undoes anything it set up outside host (a timer, a listener).
                          ctx = { sample: true } -- every value a renderer shows is sample data, and the page
                          says so once in its header; a renderer never presents a number as measured.
       info.partial       a sentence naming what is still missing (an Ark UI part, a behaviour), shown under
                          the element. Omitted: the element is built.
       info.uses          the Ark UI parts or site classes it is built from (shown in the dock's details).
     DefxnKit.renderer(id)  -> { render, partial, uses } or null
     DefxnKit.status(id)    -> 'built' | 'partial' | 'notBuilt'  (2D boards; board 05 asks the 3D stage)
   ===================================================================== */
var DefxnKit = (function () {
  'use strict';
  var R = Object.create(null);
  function register(id, render, info) {
    if (typeof render !== 'function') throw new Error('DefxnKit.register(' + id + '): render must be a function.');
    if (window.DefxnKitBoards && !DefxnKitBoards.item(id)) throw new Error('DefxnKit.register: "' + id + '" is not an element of the kit boards (js/content/kit-boards.js). Use one of its ids.');
    info = info || {};
    R[id] = { render: render, partial: info.partial ? String(info.partial) : '', uses: info.uses ? [].concat(info.uses) : [] };
  }
  function renderer(id) { return R[id] || null; }
  function status(id) { var r = R[id]; return !r ? 'notBuilt' : r.partial ? 'partial' : 'built'; }
  return { register: register, renderer: renderer, status: status };
})();
