/* =====================================================================
   ADMIN EDITOR · CORE (js/admin/core.js) -- loads first
   ---------------------------------------------------------------------
   Owns: the editor's one namespace, window.ArkAdmin, and the vocabulary every other
   file uses -- $ (by id), h (element builder), clone, refuse (a disabled control says
   why), status (the status line), toast, download, ic (icon markup), esc (HTML text).
   It also refuses to run outside the locked page (admin.html holds the key): with no
   ArkGate above it, it sends the browser back there and never creates the namespace,
   so every other editor file stops at its first line too.
   The module contract, for every file under js/admin/ that makes up the editor: a
   classic script (admin-app.html loads them in order, no bundler) wrapped in its own
   IIFE; it takes what it uses from window.ArkAdmin at its top -- its imports, by name
   -- and hands back what other files use with A.provide() at its bottom -- its
   exports. A function from a file that loads LATER is imported with A.later(name),
   looked up when it is called. Mutable state shared between files lives in ONE object,
   A.state (js/admin/state.js).
   Must not: know about any draft, panel or mode -- nothing here may grow a feature.
   ===================================================================== */
(function () {
  'use strict';

  /* This page is the editor. It is served only to a signed-in session and only makes sense inside the locked page (admin.html),
     which holds the identity's key. Opened on its own, it sends you back there instead of pretending to work. */
  var gate = null;
  try { gate = window.parent !== window ? window.parent.ArkGate : null; } catch (e) { gate = null; }
  if (!gate) { window.location.replace('admin.html'); return; }

  /* The real, shared <flux-authorization-dialog> (same element flux-dao-app
     registers via @deadark/ark-ui/elements) -- an ARIA/focus-trap/busy-state
     primitive with no template of its own; authorizePublish() (js/admin/mesh.js) supplies
     the light-DOM content, same shape as ScopedAuthorizationDialog's. */
  if (window.ArkFluxElements) window.ArkFluxElements.defineFluxAuthorizationDialog();

  var $ = function (id) { return document.getElementById(id); };

  function h(tag, props) {
    var node = document.createElement(tag);
    Object.keys(props || {}).forEach(function (key) {
      if (key === 'text') node.textContent = props[key];
      else if (key === 'class') node.className = props[key];
      else if (key.slice(0, 2) === 'on') node.addEventListener(key.slice(2), props[key]);
      else if (props[key] !== false && props[key] !== null) node.setAttribute(key, props[key] === true ? '' : props[key]);
    });
    /* A string child is text, not an error: renderSecretEditor passed two strings here and
       appendChild threw, so the whole Encrypted editor rendered nothing -- a new encrypted
       item could not even be opened (regression: tests/admin-h-text-children.cjs). */
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) node.appendChild(typeof arguments[i] === 'string' ? document.createTextNode(arguments[i]) : arguments[i]);
    return node;
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  /* A disabled control says why (law: a refusal names what it needs). Save, Revert and a
     colour's Default were greyed out with no explanation -- indistinguishable from broken
     (tests/browser/full-audit.mjs's sweep; regression: tests/admin-disabled-says-why.cjs).
     `reason` empty enables the button (restoring its own tooltip); anything else disables it and
     becomes its tooltip. */
  var NOTHING_TO_SAVE = 'Nothing to save: every draft matches its saved copy.';
  /* `explain(reason)`, when given, keeps a refused button CLICKABLE: it is marked unavailable
     (aria-disabled, the reason as its tooltip) and a click runs explain(reason) instead of the
     button's own action. For a control whose reason needs more than a tooltip -- Publish, whose
     remedy is starting another program: greyed out, its reason lived only in a hover, and a click
     did nothing at all (docs/ux-audit/cms.md P0-4; regression: tests/cms-refusal-explains.cjs). */
  var explainers = new WeakMap();
  function refuse(button, reason, explain) {
    if (!button) return;
    if (button.dataset.baseTitle === undefined) button.dataset.baseTitle = button.title || '';
    button.title = reason || button.dataset.baseTitle;
    if (typeof explain !== 'function') { button.disabled = !!reason; return; }
    button.disabled = false;
    explainers.set(button, explain);
    if (reason) { button.setAttribute('aria-disabled', 'true'); button.dataset.refusal = reason; }
    else { button.removeAttribute('aria-disabled'); delete button.dataset.refusal; }
  }
  /* capture phase, so the explanation runs INSTEAD of the button's own click handlers */
  document.addEventListener('click', function (event) {
    var button = event.target && event.target.closest ? event.target.closest('[aria-disabled="true"][data-refusal]') : null;
    if (!button || !explainers.has(button)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    explainers.get(button)(button.dataset.refusal);
  }, true);

  /* Ask before something that cannot be taken back, or that throws work away: Ark's AlertDialog
     (ArkKit.arkConfirm, @deadark/ark-ui 0.2.8), never the browser's window.confirm (docs/ux-audit/
     cms.md P2-11: unstyled, English-only per browser, no tone, one sentence for the whole decision).
     confirmDialog({ title, message, confirmLabel, cancelLabel, tone, initialFocus }) -> Promise<boolean>.
     The CALLER words every part -- what will happen, and whether it can be undone; tone 'danger' is for a
     destructive action; focus starts on Cancel unless the caller says initialFocus: 'confirm'. Without
     ArkKit (a jsdom test of one panel) it asks window.confirm with the same words, so a test's stub still
     answers. One dialog at a time (the kit queues them). */
  function confirmDialog(options) {
    var kit = window.ArkKit;
    if (kit && typeof kit.arkConfirm === 'function') return kit.arkConfirm(options);
    var text = options.title + (options.message ? '\n\n' + options.message : '');
    return Promise.resolve(!!window.confirm(text));
  }

  var statusTimer = 0;
  function status(message, tone) {
    var el = $('status'); el.textContent = message || ''; el.dataset.tone = tone || '';
    window.clearTimeout(statusTimer);
    el.title = message || '';
    if (message && tone === 'ok') statusTimer = window.setTimeout(function () { el.textContent = ''; }, 6000);
    /* The header's line is a fixed slot, and a sentence longer than it is cut ("New page. Edit it, th...").
       When what was said does not fit, the same words ALSO go to the editor's one notice, which can
       be read in full (docs/ux-audit/cms.md P1-16: four channels, the important one cut off). A short
       message stays where it is, and a new message that fits retires the notice of the last long one. */
    if (typeof A !== 'undefined' && A && typeof A.notice === 'function') {
      if (message && el.scrollWidth > el.clientWidth + 1) A.notice({ tone: tone || 'info', key: 'status', body: message });
      else if (A.notice.close) A.notice.close('status');
    }
  }

  /* a file the browser saves: how Save writes when no project folder is connected */
  function download(name, text) {
    var url = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
    var a = h('a', { href: url, download: name }); document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  /* an icon from the page's own sprite (admin-app.html's <svg> symbols), as markup */
  const ic = (name, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  /* text made safe to place inside markup */
  function esc(s) { return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
  /* A passing message: one toast of the editor's one notice component (js/admin/notice.js, which
     loads right after this file). It was its own #toast element that vanished after 2.6 s, so a
     refusal two sentences long could not be read before it went (docs/ux-audit/cms.md P1-16). */
  function toast(msg) { if (typeof A.notice === 'function') A.notice({ tone: 'info', body: msg }); else status(msg, ''); }

  /* ---- the namespace every other editor file meets in (the contract: header above) ---- */
  var A = window.ArkAdmin = {
    /* Hand names to the other files. A name provided twice is two definitions of one thing --
       refused here, at load, instead of one silently replacing the other. */
    provide: function (names) {
      Object.keys(names).forEach(function (name) {
        if (Object.prototype.hasOwnProperty.call(A, name)) throw new Error('js/admin: "' + name + '" is provided by two editor files. Keep one definition and import it from there.');
        A[name] = names[name];
      });
    },
    /* A function from a file that loads AFTER the importer: bound now by name, looked up when
       called -- by then every file has loaded, so the order of the script tags only matters at load. */
    later: function (name) {
      return function () {
        if (typeof A[name] !== 'function') throw new Error('js/admin: ' + name + '() was called, but no editor file provided it. Missing: the file that defines it, or its <script> tag in admin-app.html.');
        return A[name].apply(this, arguments);
      };
    }
  };

  if (typeof gate.useConfirm === 'function') gate.useConfirm(confirmDialog);   /* the locked page asks about unsaved work through the editor's own dialog */
  A.provide({ $: $, NOTHING_TO_SAVE: NOTHING_TO_SAVE, clone: clone, download: download, esc: esc,
      confirmDialog: confirmDialog, gate: gate, h: h, ic: ic, refuse: refuse, status: status, toast: toast });
})();
