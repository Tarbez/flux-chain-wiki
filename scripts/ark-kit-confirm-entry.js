/* ArkKitConfirm: Ark's modal confirm alone for public pages -- js/ark/vendor/ark-kit-confirm.js (global `ArkKitConfirm`), built by
   scripts/build-ark-vendor.cjs from @deadark/ark-ui/blocks/confirm.

   Why its own file: the public kit refuses arkConfirm (R2 bundle budget; a modal confirm traps focus), and the full kit is
   185 KB. Only the card seal's "Wear it" asks (js/nft/wear.js, DefxnWear.offer, through js/ark/skin-site.js), and only for a
   visitor who has a card on screen, so it loads then and costs no other visitor anything. The public kit's export cannot be
   replaced in place (its getters are fixed), so a caller takes ArkKitConfirm.arkConfirm. The editor's full kit has it already. */
export { arkConfirm } from '@deadark/ark-ui/blocks/confirm';
