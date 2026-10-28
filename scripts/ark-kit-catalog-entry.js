/* ArkKitCatalog: every Ark UI primitive, for the editor's Kit page only -- js/ark/vendor/ark-kit-catalog.js (global
   `ArkKitCatalog`), built by scripts/build-ark-vendor.cjs from @deadark/ark-ui/primitives.

   Why its own file: the public kits ship only what the site's blocks use (about 10 createArk* factories). The Kit
   page (js/pages/kit.js, routed in the editor's canvas only) shows every element of the owner's five boards, and
   most of them are Ark UI primitives the site does not otherwise load (slider, select, date picker, tree, dock...).
   No public route lists this file. */
export * from '@deadark/ark-ui/primitives';
