/* ArkCmsBlocks: the SDK's CMS schema for Ark blocks, for the EDITOR only.

   Built by scripts/build-ark-vendor.cjs -> js/admin/vendor/cms-blocks.js (global
   `ArkCmsBlocks`), loaded by admin-app.html alone. The CMS Library draws each block's prop
   editors from getCmsArkBlockEditorFields and refuses to save a block that fails
   validateCmsArkBlock(spec, { strict: true }) (js/content/components.js problems(),
   js/admin/library.js). Both come from @deadark/sdk/cms, the schema half of "schema in the
   SDK, renderer in Ark UI" (docs/ux-audit/components.md §5 line 1), generated there from
   ark-ui's describeArkBlocks() -- never a second copy typed here.

   Why a separate bundle and not part of ArkKit: @deadark/sdk/cms bundles zod and every CMS
   schema, 143 KB minified / 39 KB gzip measured 2026-10-19 (esbuild, this entry). The public
   site never validates a block -- it only renders saved ones -- so it must never pay for it
   (bundle budget R2). */
export { validateCmsArkBlock, getCmsArkBlockEditorFields, getCmsArkBlockDescriptor, CMS_ARK_BLOCK_NAMES } from '@deadark/sdk/cms';
