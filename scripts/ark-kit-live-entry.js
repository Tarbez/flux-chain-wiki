/* ArkKitLive: Ark's block morph for public pages -- js/ark/vendor/ark-kit-live.js (global `ArkKitLive`),
   built by scripts/build-ark-vendor.cjs from @deadark/ark-ui/blocks/patch alone.

   Why a second file: only a route with a LIVE block (a reading refreshed on a pulse: /, /stats)
   ever patches a rendered block, and every byte of the public kit is paid by every block route
   (docs/ux-audit/components.md R2). The public kit (js/ark/vendor/ark-kit-public.js) therefore
   leaves `patchArkBlock` out as a refusal that names this file; js/ark/blocks.js loads it on the
   first ArkUI.blocks.update of a page, so a route that never updates never pays for it. The editor's
   full kit (js/ark/vendor/ark-kit.js) carries patchArkBlock itself and never loads this.

   The morph takes the registry as an argument (patchArkBlockIn), so this bundle carries no copy of
   the blocks: it reads them from the ArkKit the page already loaded. */
import { patchArkBlockIn } from '@deadark/ark-ui/blocks/patch';

export function patchArkBlock(target, next, options) {
  if (typeof ArkKit === 'undefined' || !ArkKit.ARK_BLOCKS) {
    throw new Error('ArkKitLive.patchArkBlock refused: no Ark kit is loaded on this page. Needs: ArkKit (js/ark/vendor/ark-kit-public.js) before js/ark/vendor/ark-kit-live.js. Remedy: load the kit first; js/ark/blocks.js does, loading this file only on the first live update.');
  }
  return patchArkBlockIn(ArkKit.ARK_BLOCKS, target, next, options);
}
