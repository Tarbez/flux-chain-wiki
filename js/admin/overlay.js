/* =====================================================================
   ADMIN EDITOR · OVERLAYS (js/admin/overlay.js) -- loads right after notice.js
   ---------------------------------------------------------------------
   Owns: the editor's ONE dismissable-layer stack -- every surface that floats over the
   workspace registers here when it opens, and this file alone decides when it closes:
     overlay.open(el, { anchor, level, onClose, closeOnOutside, closeOnCanvas, within }) -> entry
     overlay.close(el, reason)      close it (its onClose runs; its anchor's aria-expanded drops)
     overlay.forget(el)             it closed itself: take it off the stack without onClose
     overlay.closeLevel(level)      close every open overlay of a level ('' = every level)
     overlay.closeCanvas()          a press on the canvas: close what closes on one
     overlay.isOpen(el)
     overlay.closeButton(run, label) the ONE close button (glyph, size, label, Esc hint)
   Levels: 'popover' -- a header popover, the More menu, the toolbar's section popover: one at a
   time, closed by Esc, a press outside it, or a press on the canvas; 'sheet' -- the docked panels
   (Page settings, Publishing status, Versions): one at a time (they share one slot), closed by
   Esc or their close button, never by a press elsewhere (they are worked in beside the canvas).
   Esc closes the TOPMOST overlay only.
   Why it exists (docs/ux-audit/cms.md P1-12, P2 "4 close-button styles"): six overlay kinds each
   carried their own open/close rules -- the account menu closed on a press in the editor document
   only (a canvas press never reached it), the header popovers had their own pointerdown, the
   toolbar popover its own, the sheet its own capture-phase Esc that had to know about all of the
   others, and Versions docked beside the sheet with neither knowing. Four close buttons: an svg
   in the sheet, .tb-pop-x, and a text x twice.
   The shape mirrors Ark UI's popover / dismissable layer (design/ark-primitives/src/dialog.js:
   data-part popover / popover-close, Esc and outside-press dismissal, anchor aria-expanded), so a
   later wave swaps these internals for createArkPopover once ArkKit carries the runtime it needs
   (createArkUI) -- js/ark/vendor/ark-kit.js exports the primitive factories but no runtime to
   run them on, which is why this file exists instead of a call to ArkKit.createArkPopover.
   Must not: draw any overlay's content, position one (each surface places its own), or know a
   feature -- callers pass the element and what closing it means.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var h = A.h, ic = A.ic;

  var stack = [];   /* bottom -> top: { el, anchor, level, onClose, outside, canvas } */
  function indexOf(el) { for (var i = 0; i < stack.length; i++) if (stack[i].el === el) return i; return -1; }

  function open(el, opts) {
    opts = opts || {};
    var level = opts.level || 'popover';
    /* one at a time per level: a new header popover closes the More menu, Page settings closes Versions */
    stack.filter(function (e) { return e.level === level && e.el !== el; }).forEach(function (e) { close(e.el, 'replaced'); });
    var i = indexOf(el), entry = i >= 0 ? stack.splice(i, 1)[0] : { el: el };
    entry.anchor = opts.anchor || null; entry.level = level; entry.onClose = opts.onClose || null;
    entry.within = opts.within || [];   /* more elements a press inside of is not "outside" (the toolbar's bar for its popover) */
    entry.outside = opts.closeOnOutside !== undefined ? !!opts.closeOnOutside : level === 'popover';
    entry.canvas = opts.closeOnCanvas !== undefined ? !!opts.closeOnCanvas : level === 'popover';
    stack.push(entry);   /* the most recently opened is on top */
    el.setAttribute('data-overlay', level);
    if (!el.hasAttribute('data-part')) el.setAttribute('data-part', level === 'sheet' ? 'sheet' : 'popover');
    if (entry.anchor) entry.anchor.setAttribute('aria-expanded', 'true');
    return entry;
  }
  function forget(el) {
    var i = indexOf(el); if (i < 0) return null;
    var entry = stack.splice(i, 1)[0];
    if (entry.anchor && entry.anchor.isConnected) entry.anchor.setAttribute('aria-expanded', 'false');
    return entry;
  }
  function close(el, reason) {
    var entry = forget(el); if (!entry) return false;
    if (typeof entry.onClose === 'function') entry.onClose(reason || 'close', entry);
    return true;
  }
  function closeLevel(level, reason) {
    stack.filter(function (e) { return !level || e.level === level; }).reverse().forEach(function (e) { close(e.el, reason || 'close'); });
  }
  function isOpen(el) { return indexOf(el) >= 0; }
  function inside(entry, target) { return !!target && (entry.el.contains(target) || (!!entry.anchor && entry.anchor.contains(target)) || entry.within.some(function (w) { return w && w.contains(target); })); }

  /* Esc: the topmost overlay, and only it. A control that handles Esc itself (an inline edit, a
     toolbar section's own keydown) calls preventDefault, and this stays out of it. An open
     authorization dialog owns Esc while it is up (it is modal and has its own). */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || e.defaultPrevented || !stack.length) return;
    if (document.querySelector('flux-authorization-dialog')) return;
    var top = stack[stack.length - 1], anchor = top.anchor;
    e.preventDefault();
    close(top.el, 'escape');
    if (anchor && anchor.isConnected && !anchor.closest('[hidden]')) try { anchor.focus({ preventScroll: true }); } catch (err) { /* not focusable */ }
  });
  /* A press outside closes what closes on outside presses -- unless it landed in an overlay
     ABOVE it (a popover opened from inside the sheet does not close the sheet, and a press in
     that popover does not close anything under it). Capture phase: a control that removes itself
     on click must not hide the press's real target. */
  document.addEventListener('pointerdown', function (e) {
    for (var i = stack.length - 1; i >= 0; i--) {
      var entry = stack[i];
      if (inside(entry, e.target)) return;
      if (entry.outside) close(entry.el, 'outside');
    }
  }, true);
  /* A press on the canvas is a press in ANOTHER document (#cmsPreview): it reaches no listener
     here, so the canvas reports it ('defxn-cms-preview-pointerdown', js/admin/bridge.js), and that
     closes every popover. Leaving the window (another app, the browser's own UI) does too. Losing
     focus to the canvas is NOT enough: the canvas also takes focus by itself (a selection made
     from the Layers list), and the More menu shut under the person's pointer. */
  function closeCanvas() { stack.filter(function (e) { return e.canvas; }).reverse().forEach(function (e) { close(e.el, 'canvas'); }); }
  window.addEventListener('blur', function () {
    setTimeout(function () { if (!(document.hasFocus && document.hasFocus())) closeCanvas(); }, 0);
  });

  /* THE close button: one glyph, one size, one label, the Esc hint in its tooltip */
  function closeButton(run, label) {
    var b = h('button', { type: 'button', class: 'ov-close', 'data-part': 'popover-close', 'aria-label': label || 'Close', title: (label || 'Close') + ' (Esc)' });
    b.innerHTML = ic('close');
    b.addEventListener('click', function (event) { run(event); });
    return b;
  }

  A.provide({ overlay: { open: open, close: close, forget: forget, closeLevel: closeLevel, closeCanvas: closeCanvas, isOpen: isOpen, closeButton: closeButton } });
})();
