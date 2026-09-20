/* Reuse the shell's canonical style registry. A second bundled copy would
   reuse dynamic IDs and apply popover visibility rules to page content. */
export const setArkElementStyle = ArkEngines.setArkElementStyle;
export const getArkElementStyle = ArkEngines.getArkElementStyle;
export const setArkElementStyles = ArkEngines.setArkElementStyles;
export const setArkElementHidden = ArkEngines.setArkElementHidden;
