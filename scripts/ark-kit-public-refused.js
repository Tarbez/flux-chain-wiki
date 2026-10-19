/* Stands in for the parts of scripts/ark-kit-entry.js the PUBLIC build leaves out
   (js/ark/vendor/ark-kit-public.js; scripts/build-ark-vendor.cjs aliases these imports here):
     @deadark/ark-ui/runtime          createArkUI           ~18 KB gz on its own
     @deadark/ark-primitives/dialog   createArkPopover      the editor's overlays
     @deadark/ark-primitives/toggle   createArkToggleGroup  the editor's pickers
     @deadark/ark-ui/blocks/patch     patchArkBlockIn       the live morph: ~0.7 KB gz, used only by
                                                            routes with a live block, so it is its own
                                                            chunk (js/ark/vendor/ark-kit-live.js)

   Why: public pages render Ark blocks on the light-DOM host (createArkDomHost), and no block uses
   these. Every byte of the public kit is paid by each route that renders a block, inside a +30 KB
   gz budget (docs/ux-audit/components.md risk R2). A page that does need one is refused with
   what to load, rather than finding the function missing. */
function refused(name, needs, remedy) {
  return function () {
    throw new Error(
      'ArkKit.' + name + ' refused: the public kit this page loaded (js/ark/vendor/ark-kit-public.js) leaves it out (R2 bundle budget). ' +
      'Needs: ' + (needs || 'the full kit') + '. Remedy: ' + (remedy || 'load js/ark/vendor/ark-kit.js (a superset, same global ArkKit) on this route: ' +
      'list it in the route\'s scripts in js/pages/catalog.js') + '.'
    );
  };
}
export const createArkUI = refused('createArkUI');
export const createArkPopover = refused('createArkPopover');
export const createArkToggleGroup = refused('createArkToggleGroup');
/* Behind scripts/ark-kit-entry.js's patchArkBlock in the public kit. */
export const patchArkBlockIn = refused('patchArkBlock', 'the live chunk js/ark/vendor/ark-kit-live.js (ArkKitLive.patchArkBlock)',
  'call ArkUI.blocks.update (js/ark/blocks.js), which loads that chunk on a page\'s first live update, or load it after the kit');
