/* ArkKit: the classic-script bridge from the synced Ark UI packages to the public site.

   Built by scripts/build-ark-vendor.cjs -> js/ark/vendor/ark-kit.js (global `ArkKit`).
   Every import below resolves inside node_modules/@deadark/*, which only
   `npm run sync:ark` (deadark-theme sync-consumer) fills, from sha256-recorded
   .vendor/ tarballs. Nothing here may import a hub path.

   What is exported is what defxn uses, not the whole library (components.md §5,
   line 3; bundle budget R2). Two outputs are built from this one list:
     js/ark/vendor/ark-kit.js         everything below (the editor, and any page that needs
                                      the createArkUI runtime for popovers)
     js/ark/vendor/ark-kit-public.js  the same, with what no block uses refused -- createArkUI,
                                      createArkPopover, createArkToggleGroup, patchArkBlock -- and
                                      the prop schemas' editor help stripped (public pages that
                                      render blocks; js/ark/blocks.js, js/ark/page-loader.js)
     js/ark/vendor/ark-kit-popover.js scripts/ark-kit-popover-entry.js: the popover block alone, for a page that
                                      floats a panel and takes no input (a page using both lists both)
     js/ark/vendor/ark-kit-live.js    scripts/ark-kit-live-entry.js: patchArkBlock alone, loaded by
                                      js/ark/blocks.js on a page's first live update
     js/ark/vendor/ark-kit-forms.js   scripts/ark-kit-forms-entry.js: the form blocks (field, form, list,
                                      status-line, choice), registered into the public kit's registry
                                      by a page that takes input. The public kit imports ark-ui's
                                      @deadark/ark-ui/blocks/core, which has none of them (they cost +3.8 KB gz
                                      on every block route; docs/cms-architecture.md Budget)
   Wave 0 shipped the four behaviour primitives that §5 line 8 names as the wrappers for
   interactive blocks; Wave 1 adds the
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
export { ARK_BLOCKS, ARK_BLOCK_NAMES, renderArkBlock, renderArkBlocks, validateArkBlock, describeArkBlocks, ArkBlockPropError, createArkDomHost, registerArkBlocks } from '@deadark/ark-ui/blocks';
/* A live block patched in place -- ArkUI.blocks.update (js/ark/blocks.js) renders through the
   adapter (copy keys, scene links) and patches with this; updateArkBlock, Ark's own
   render-and-patch, has no caller here and stays out (R2). ark-ui 0.2.7 keeps the morph in its
   own module (blocks/patch, `patchArkBlockIn(registry, ...)`) so the PUBLIC build can leave it
   out: there `@deadark/ark-ui/blocks/patch` is aliased to scripts/ark-kit-public-refused.js and
   this is a refusal naming js/ark/vendor/ark-kit-live.js (scripts/ark-kit-live-entry.js), the
   chunk js/ark/blocks.js loads on a page's first live update. The full kit has the real one. */
import { ARK_BLOCKS as BLOCK_REGISTRY } from '@deadark/ark-ui/blocks';
import { patchArkBlockIn } from '@deadark/ark-ui/blocks/patch';
export function patchArkBlock(target, next, options) { return patchArkBlockIn(BLOCK_REGISTRY, target, next, options); }
/* Which build this is: the build sets __ARK_KIT_PUBLIC__ (esbuild define) -- true in
   ark-kit-public.js, false in ark-kit.js. js/ark/blocks.js reads it to know whether patchArkBlock
   above is Ark's morph or the refusal, and so whether to load the live chunk first. */
export const PUBLIC_KIT = __ARK_KIT_PUBLIC__;
/* Wave 2 (W2-ADAPTER): the runtime. W1-CMS-IA found createArkPopover and createArkToggleGroup
   unusable without one (js/admin/overlay.js). Both now also run on the light-DOM host
   (createArkDomHost: non-modal focus scopes and dismissable layers, ark-ui 0.2.2); createArkUI
   is what a modal overlay's focus trap needs. It is ~18 KB gz on its own, so the PUBLIC build of
   this same entry (js/ark/vendor/ark-kit-public.js, scripts/build-ark-vendor.cjs) aliases it --
   and the popover and toggle group, which no block uses -- to scripts/ark-kit-public-refused.js:
   one export list, two weights, and a page that needs one gets a refusal naming the file to
   load instead of a missing function. */
export { createArkUI } from '@deadark/ark-ui/runtime';
/* W4-ARK (2026-10-20): the CMS's window.confirm() replacement. arkConfirm({ title, message, confirmLabel,
   cancelLabel, tone }) -> Promise<boolean>: Ark's createArkAlertDialog (modal, Esc cancels, an outside press
   does not, focus on the safe choice) on the modal host (createArkModalHost: the light-DOM host plus a focus
   trap and an inert page behind it), over elements it builds; styled by css/ark-blocks.css (.ark-alert-dialog).
   Editor-only: the public kit refuses all three (scripts/ark-kit-public-refused.js) -- it never traps focus. */
export { arkConfirm, createArkAlertDialog, createArkModalHost } from '@deadark/ark-ui/blocks/confirm';
