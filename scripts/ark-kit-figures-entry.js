/* ArkKitFigures: the `lane` and `band` blocks (the line-diagram parts) for public pages -- js/ark/vendor/ark-kit-figures.js
   (global `ArkKitFigures`), built by scripts/build-ark-vendor.cjs from @deadark/ark-ui/blocks/figures.

   Why its own file (Ark 0.2.12, measured in docs/cms-architecture.md Budget): only the manifest-figure pages (/what-is-a-resolver,
   /how-deployment-works, /dao, /chain; js/pages/resolver-page-parts.js) draw a lane or a band, and in the core registry they cost
   0.6 KB gz on every block route. Registered the same way as the popover chunk: into the public kit's registry by
   ArkKit.registerArkBlocks, then ArkUI.blocks.sync() registers their resolvers (ARK_BLOCK_LANE, ARK_BLOCK_BAND), whichever of this
   and the adapter loaded first. The editor's full kit has them already: there this is a no-op. */
import { createFigureBlocks } from '@deadark/ark-ui/blocks/figures';

if (typeof ArkKit === 'undefined' || !ArkKit.registerArkBlocks) {
  throw new Error('ArkKitFigures refused: no Ark kit is loaded on this page. Needs: js/ark/vendor/ark-kit-public.js before js/ark/vendor/ark-kit-figures.js. Remedy: list ArkUI.blockScripts first in the route\'s scripts (js/pages/catalog.js).');
}
export const FIGURE_BLOCK_NAMES = ArkKit.ARK_BLOCKS.lane ? [] : ArkKit.registerArkBlocks(createFigureBlocks);
if (typeof ArkUI !== 'undefined' && ArkUI.blocks && ArkUI.blocks.sync) ArkUI.blocks.sync();
