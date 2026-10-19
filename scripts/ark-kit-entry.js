/* ArkKit: the classic-script bridge from the synced Ark UI packages to the public site.

   Built by scripts/build-ark-vendor.cjs -> js/ark/vendor/ark-kit.js (global `ArkKit`).
   Every import below resolves inside node_modules/@deadark/*, which only
   `npm run sync:ark` (deadark-theme sync-consumer) fills, from sha256-recorded
   .vendor/ tarballs. Nothing here may import a hub path.

   What is exported is what defxn uses, not the whole library (components.md §5,
   line 3; bundle budget R2). Wave 0 shipped the four behaviour primitives that
   §5 line 8 names as the wrappers for interactive blocks; Wave 1 adds the
   `@deadark/ark-ui/blocks` registry and renderers (styled by css/ark-blocks.css,
   which build-ark-vendor copies from the same synced package).

   @deadark/ark-a11y/element-style is aliased to scripts/ark-style-bridge.js by the
   build, exactly as for the settings panel: the page already has one style
   registry (ArkEngines, js/ark/vendor/engines.js), and a second bundled copy would
   hand out colliding dynamic ids. */
export { createArkTabs } from '@deadark/ark-primitives/tabs';
export { createArkAccordion } from '@deadark/ark-primitives/accordion';
export { createArkToggleGroup } from '@deadark/ark-primitives/toggle';
export { createArkPopover } from '@deadark/ark-primitives/dialog';
export { ARK_BLOCKS, ARK_BLOCK_NAMES, renderArkBlock, renderArkBlocks, validateArkBlock, describeArkBlocks, ArkBlockPropError } from '@deadark/ark-ui/blocks';
