/* ArkKitForms: the form blocks for public pages -- js/ark/vendor/ark-kit-forms.js (global `ArkKitForms`),
   built by scripts/build-ark-vendor.cjs from @deadark/ark-ui/blocks/forms alone.

   Why a second file: field, form, list, status-line, choice and popover cost +3.8 KB gz (the popover is now js/ark/vendor/ark-kit-popover.js) (measured
   2026-10-20), and every byte of the public kit is paid by every route that renders a block (components.md
   R2: +30 KB). The public kit therefore imports ark-ui's CORE registry (21 blocks); a page that takes input
   or floats a panel lists this chunk after the kit (js/pages/catalog.js), and the page loader adds it where a
   saved Ark block names one and in the editor's canvas (js/ark/page-loader.js).

   The chunk registers its blocks into the kit's registry (ArkKit.registerArkBlocks), handing them the helpers
   the core already contains, so it carries only its own renderers; then asks the adapter to register the new
   resolvers (ArkUI.blocks.sync, ARK_BLOCK_FIELD ... ARK_BLOCK_POPOVER), whichever of the two loaded first.
   The editor's full kit (js/ark/vendor/ark-kit.js) has them all already: there this is a no-op. */
import { createFormBlocks } from '@deadark/ark-ui/blocks/forms';

if (typeof ArkKit === 'undefined' || !ArkKit.registerArkBlocks) {
  throw new Error('ArkKitForms refused: no Ark kit is loaded on this page. Needs: js/ark/vendor/ark-kit-public.js before js/ark/vendor/ark-kit-forms.js. Remedy: list ArkUI.blockScripts first in the route\'s scripts (js/pages/catalog.js).');
}
export const FORM_BLOCK_NAMES = ArkKit.ARK_BLOCKS.form ? [] : ArkKit.registerArkBlocks(createFormBlocks);
if (typeof ArkUI !== 'undefined' && ArkUI.blocks && ArkUI.blocks.sync) ArkUI.blocks.sync();
