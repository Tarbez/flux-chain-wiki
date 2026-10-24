/* ArkKitExamples: every Ark block's own example props (ARK_BLOCK_EXAMPLES), for the one view that shows every part:
   /palette's Parts tab (js/pages/palette.js) -- js/ark/vendor/ark-kit-examples.js (global `ArkKitExamples`), built by
   scripts/build-ark-vendor.cjs.

   Why its own file: the public kit drops these examples (scripts/ark-blocks-no-examples.js, the R2 budget), because they
   are demo data every block route would otherwise download. Only the Parts tab needs them, so only it loads this.
   The path is the module itself: @deadark/ark-ui exports the examples only inside blocks/core, which carries the whole
   registry the public kit already has. */
export { ARK_BLOCK_EXAMPLES } from '../node_modules/@deadark/ark-ui/dist/blocks/examples.js';
