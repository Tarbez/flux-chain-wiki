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
  function refuse(button, reason) {
    if (!button) return;
    if (button.dataset.baseTitle === undefined) button.dataset.baseTitle = button.title || '';
    button.disabled = !!reason;
    button.title = reason || button.dataset.baseTitle;
  }

  var statusTimer = 0;
  function status(message, tone) {
    var el = $('status'); el.textContent = message || ''; el.dataset.tone = tone || '';
    window.clearTimeout(statusTimer);
    el.title = message || '';
    if (message && tone === 'ok') statusTimer = window.setTimeout(function () { el.textContent = ''; }, 6000);
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
  /* a passing notice over the canvas (#toast) */
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2600); }

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

  A.provide({ $: $, NOTHING_TO_SAVE: NOTHING_TO_SAVE, clone: clone, download: download, esc: esc,
      gate: gate, h: h, ic: ic, refuse: refuse, status: status, toast: toast });
})();
