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
   Since 2026-10-19 (W2-LIBRARY) each POPOVER is run by Ark's own popover primitive,
   ArkKit.createArkPopover on createArkDomHost(document) -- see arkPopover() below. It was blocked
   until Ark's light-DOM host gained non-modal focus scopes and dismissable layers (ark-ui 0.2.2):
   createArkUI() binds only elements it rendered from a Flux pattern, and the host refused them.
   What stays here is the editor's POLICY, which no single Ark layer can hold: one per level, Esc
   closes the topmost only, a press outside or on the canvas (another document) closes popovers.
   Sheets (level 'sheet') are docked panels, not popovers, and keep their own markup.
   Must not: draw any overlay's content, position one (each surface places its own), or know a
   feature -- callers pass the element and what closing it means.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var h = A.h, ic = A.ic;

  /* ---- THE stacking order ------------------------------------------------------------------
     Every layer that floats over the workspace, lowest first, published once as CSS custom
     properties on the root element; css/admin.css and css/studio-embed.css read them
     (z-index: var(--z-sheet)) and carry no z-index number of their own for these layers. Two
     stacking contexts: inside the fixed workspace (#studioRoot, itself one layer at body level)
     and at body level, where the header, its menu, Version history and the notices are.
     Why here (docs/ux-audit/plan.md Wave 3, the W1 note): on a phone the Page settings sheet
     (z 30, css/studio-embed.css) opened UNDER the Site style dock (z 44, the same file, another
     rule) -- each surface chose its own number, and no file saw the order. The rule the numbers
     encode: what was asked for later is on top. The dock is a view; a docked sheet is asked for
     over it; the rail drawer and its scrim are asked for over both; a popover over whatever
     opened it. (regression: tests/cms-overlay-z-ladder.cjs) */
  var LAYERS = [
    /* inside #studioRoot */
    ['--z-theme-dock', 40],      /* Site style covering the canvas on a phone (css/studio-embed.css .theme-dock) */
    ['--z-sheet', 44],           /* the docked sheet: Page settings, Publishing status (.sheet) */
    ['--z-rail-scrim', 45],      /* the drawer's scrim (.rail-scrim) */
    ['--z-rail-drawer', 46],     /* the rail as a drawer on a phone (.left) */
    ['--z-popover', 48],         /* a header popover, the toolbar's section popover (.pop, .tb-pop) */
    /* at body level */
    ['--z-workspace', 50],       /* #studioRoot itself */
    ['--z-notice-banner', 55],   /* a floating notice banner (.notice-floating) */
    ['--z-status', 56],          /* a phone's bottom status strip (#appBar .status) */
    ['--z-versions', 60],        /* Version history, docked beside the workspace (.versions-panel) */
    ['--z-notice-toast', 60],    /* the toasts (.notice-toasts) */
    ['--z-header', 65],          /* the app bar: its menus drop over everything docked (#appBar) */
    ['--z-menu', 70],            /* the More menu (.account-menu) */
    ['--z-modal', 100]           /* a confirmation dialog over everything (Ark's AlertDialog, ArkKit.arkConfirm: .ark-alert-dialog reads it) */
  ];
  LAYERS.forEach(function (layer) { document.documentElement.style.setProperty(layer[0], String(layer[1])); });

  var stack = [];   /* bottom -> top: { el, anchor, level, onClose, outside, canvas } */
  function indexOf(el) { for (var i = 0; i < stack.length; i++) if (stack[i].el === el) return i; return -1; }

  /* Each popover-level element is run by Ark's popover primitive (ArkKit.createArkPopover on the
     light-DOM host, js/ark/vendor/ark-kit.js), which owns its ARIA contract: the content's part,
     aria-modal, data-state and presence (hidden + aria-hidden while closed); the anchor's
     aria-haspopup, aria-controls and aria-expanded. CONTROLLED: Ark never opens or closes one by
     itself (its own Esc and outside-press dismissal are off, and a press on the anchor only
     reports) -- this stack decides, because the editor's policy spans levels and documents (one
     per level, Esc closes the topmost only, a press on the canvas -- another document, which no
     Ark layer can see -- closes popovers). Each element gets its own host, which holds no
     document listener while closed, so a header popover removed on close takes its host with it.
     Without ArkKit (a test that loads only this file) the stack writes aria-expanded itself. */
  var arkPopovers = new WeakMap();   /* el -> { anchor, api } */
  function arkPopover(el, anchor) {
    var kit = window.ArkKit, known = arkPopovers.get(el);
    if (known && known.anchor === anchor) return known.api;
    if (!kit || typeof kit.createArkPopover !== 'function' || typeof kit.createArkDomHost !== 'function') return null;
    var host = kit.createArkDomHost(document);
    var api = kit.createArkPopover(host, { contentRef: host.bind(el, 'ov'), triggerRef: anchor ? host.bind(anchor, 'ov') : undefined,
      controlled: true, keepMounted: true, closeOnOutsidePress: false, escapeKey: false, initialFocus: false, finalFocus: false });
    arkPopovers.set(el, { anchor: anchor, api: api });
    return api;
  }

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
    entry.ark = level === 'popover' ? arkPopover(el, entry.anchor) : null;
    if (entry.ark) entry.ark.open();
    else if (entry.anchor) entry.anchor.setAttribute('aria-expanded', 'true');
    return entry;
  }
  function forget(el) {
    var i = indexOf(el); if (i < 0) return null;
    var entry = stack.splice(i, 1)[0];
    if (entry.ark) entry.ark.close();
    else if (entry.anchor && entry.anchor.isConnected) entry.anchor.setAttribute('aria-expanded', 'false');
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
  /* An overlay nobody asked for (the toolbar opening a text's Details by itself) must not replace
     one the person opened: it waits while another of its level is open, and the caller skips it.
     Found 2026-10-20 (tests/browser/versions.mjs "Restore #4"): More opened just after a Save,
     the canvas reloaded, the new selection auto-opened Details, and More shut under the click. */
  function busy(level, except) { return stack.some(function (e) { return e.level === (level || 'popover') && e.el !== except; }); }
  function inside(entry, target) { return !!target && (entry.el.contains(target) || (!!entry.anchor && entry.anchor.contains(target)) || entry.within.some(function (w) { return w && w.contains(target); })); }

  /* Esc: the topmost overlay, and only it. A control that handles Esc itself (an inline edit, a
     toolbar section's own keydown) calls preventDefault, and this stays out of it. An open
     authorization dialog -- and an Ark confirmation dialog -- owns Esc while it is up (it is modal and has
     its own: Esc is its Cancel, and must not also close the sheet or popover beneath it). */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || e.defaultPrevented || !stack.length) return;
    if (document.querySelector('flux-authorization-dialog, .ark-alert-dialog')) return;
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
    if (e.target && e.target.closest && e.target.closest('.ark-alert-dialog')) return;   /* answering a dialog is not a press outside what is under it */
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

  A.provide({ overlay: { open: open, close: close, forget: forget, closeLevel: closeLevel, closeCanvas: closeCanvas, isOpen: isOpen, busy: busy, closeButton: closeButton,
      layers: LAYERS.map(function (layer) { return { token: layer[0], z: layer[1] }; }) } });
})();
