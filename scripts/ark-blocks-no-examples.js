/* Stands in for @deadark/ark-ui's blocks/examples.js in the PUBLIC kit (js/ark/vendor/ark-kit-public.js;
   scripts/build-ark-vendor.cjs swaps it in). The examples are demo data -- the reference page, the
   render tests and the editor's "insert" starters read them -- and ~2.5 KB gz every visitor of a page
   with blocks would otherwise download (docs/ux-audit/components.md risk R2). Without them the
   registry renders exactly the same; ARK_BLOCKS[name].example is undefined. The editor's full kit
   (js/ark/vendor/ark-kit.js) keeps them. */
export const ARK_BLOCK_EXAMPLES = {};
