/* ArkKitPopover: the `popover` block alone for public pages -- js/ark/vendor/ark-kit-popover.js (global `ArkKitPopover`), built by
   scripts/build-ark-vendor.cjs from @deadark/ark-ui/blocks/popover.

   Why its own file (W4-ARK 0.2.10, measured in docs/cms-architecture.md Budget): a page that floats one panel and takes no input
   (/explore) should not download the field, form, list, status-line and choice renderers (js/ark/vendor/ark-kit-forms.js). It is
   registered the same way: into the public kit's registry by ArkKit.registerArkBlocks, handing the block the helpers the core
   already contains, then ArkUI.blocks.sync() registers its resolver (ARK_BLOCK_POPOVER), whichever of this and the adapter loaded
   first. A page that uses both chunks lists both. The editor's full kit has the block already: there this is a no-op. */
import { createPopoverBlocks } from '@deadark/ark-ui/blocks/popover';

if (typeof ArkKit === 'undefined' || !ArkKit.registerArkBlocks) {
  throw new Error('ArkKitPopover refused: no Ark kit is loaded on this page. Needs: js/ark/vendor/ark-kit-public.js before js/ark/vendor/ark-kit-popover.js. Remedy: list ArkUI.blockScripts first in the route\'s scripts (js/pages/catalog.js).');
}
export const POPOVER_BLOCK_NAMES = ArkKit.ARK_BLOCKS.popover ? [] : ArkKit.registerArkBlocks(createPopoverBlocks);
if (typeof ArkUI !== 'undefined' && ArkUI.blocks && ArkUI.blocks.sync) ArkUI.blocks.sync();
