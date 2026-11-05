/* The page's panels, the one list every floating part of the space keeps clear of (owner, 2026-11-05: "total chaos": tags sat on the
   page's panels). Layer: app. A part reads rects() once a frame and asks covers(box). The list is the HUD's own class names
   (css/space-frame.css contract) plus the space's parts, so a new HUD page is covered with no change here. */
export const PANELS = '.hud-left, .hud-right, .hud-dock, .hud-card, .fc-card, .focus-card, .quest-panel:not([hidden]), .journey:not(.hidden), .show-caption.on, .space-map, .site-footer-strip, header.ark-header, .wp-note';

export function rects() {
  return [...document.querySelectorAll(PANELS)].filter((e) => getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden')
    .map((e) => e.getBoundingClientRect()).filter((r) => r.width && r.height);
}
/* does any of these rects meet the box [left, top, right, bottom], with a gap of `pad` px kept round it? */
export function covers(list, box, pad = 8) {
  return list.some((r) => box[0] < r.right + pad && box[2] > r.left - pad && box[1] < r.bottom + pad && box[3] > r.top - pad);
}
