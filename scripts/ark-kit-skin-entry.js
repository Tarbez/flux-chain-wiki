/* ArkKitSkin: Ark UI's skin layer for public pages -- js/ark/vendor/ark-kit-skin.js (global `ArkKitSkin`), built by
   scripts/build-ark-vendor.cjs from @deadark/ark-ui/skin (design/ark-ui/SKINS.md; the contract is
   docs/home-redesign/SKIN-CONTRACT.md).

   Why its own file: a skin is a visitor's choice, not every page's. Its theme resolution re-registers the component
   schema, so it carries the runtime's style compiler; nothing loads it until a skin is applied (js/ark/skin-site.js). */
/* the SDK's one derivation of the link, control and action ladders a skin does not set (--reference and its
   scale, --secondary, --border-control), so the site's navbar takes the card's colours there too */
export { deriveSkinTokens } from '@deadark/sdk/theme';
export { applyArkSkin, removeArkSkin, getArkSkin, getArkSkinReport, validateArkSkin, layoutArkChrome, sanitizeArkSvg, arkSkinPartKeys,
  arkSkinFamilyOfName, ARK_SKIN_BLOCK_PARTS,   /* the kind of each Ark block part (surface, panel, heading, rule...): what a part can take */
  ARK_SKIN_RULES, ARK_SKIN_LAYOUTS, ARK_SKIN_MEANING_TOKENS, ARK_SKIN_CHROME_PIECES } from '@deadark/ark-ui/skin';
