/* =====================================================================
   REAL SIGNING CONFIRMATION, SITE-WIDE
   ---------------------------------------------------------------------
   Before this file, the real <flux-authorization-dialog> confirm-and-sign
   step (js/admin/vendor/flux-elements.js + js/admin/authorization-view.js)
   only ever appeared on admin.html/admin-app.html/broker.html -- the
   content-editor and site-publish flows. The real end-user pages
   (js/pages/account.js's Credits consumption requests and FXN transfers,
   signed inside js/ark/fabric-transfer-browser.js's signedRecord() and
   js/ark/value-registries-client.js's requestCreditsConsumption()) called
   `who.sign(message)` directly with no confirmation step at all: a click
   signed and published immediately. This file gives every signer on the
   site -- admin or end user -- the same one dialog, per this workspace's
   "centralize, don't duplicate" rule; it does not invent a second one.

   window.ArkUI.authorizationDialog.confirm(view) shows the dialog built
   from an already-assembled ArkAuthorizationView.scopedAuthorizationView()
   shape and resolves true/false (approved/cancelled). It signs nothing
   itself -- callers (fabric-transfer-browser.js, value-registries-client.js)
   still own and perform the actual who.sign() call, only now after the
   holder has seen and approved exactly what it covers.
   ===================================================================== */
(function () {
  'use strict';
  window.ArkUI = window.ArkUI || {};

  if (window.ArkFluxElements) window.ArkFluxElements.defineFluxAuthorizationDialog();

  function h(tag, props) {
    var node = document.createElement(tag);
    Object.keys(props || {}).forEach(function (key) {
      if (key === 'text') node.textContent = props[key];
      else if (key === 'class') node.className = props[key];
      else if (key.slice(0, 2) === 'on') node.addEventListener(key.slice(2), props[key]);
      else if (props[key] !== false && props[key] !== null) node.setAttribute(key, props[key] === true ? '' : props[key]);
    });
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) node.appendChild(arguments[i]);
    return node;
  }

  // view: the object ArkAuthorizationView.scopedAuthorizationView(...) returns
  // (heading, description, rows[], digest, disclosures[], safety), plus the
  // optional { action, capability } pair the <flux-authorization-dialog>
  // element itself records as attributes. Resolves true on approve, false on
  // cancel/Escape/backdrop click -- never throws, never signs.
  function confirm(view, meta) {
    return new Promise(function (resolve) {
      var titleId = 'arkAuthTitle-' + Date.now(), descId = 'arkAuthDesc-' + Date.now();
      var dialog = document.createElement('flux-authorization-dialog');
      if (meta && meta.action) dialog.action = meta.action;
      if (meta && meta.capability) dialog.capability = meta.capability;
      dialog.setAttribute('aria-labelledby', titleId);
      dialog.setAttribute('aria-describedby', descId);
      var backdrop = h('div', { class: 'admin-auth-backdrop' });
      var panel = h('section', { class: 'admin-auth-panel' });
      var title = h('div', { class: 'admin-auth-title' }, h('span', { class: 'kicker', text: 'Scoped authorization' }), h('h2', { id: titleId, text: view.heading }));
      var close = h('button', { type: 'button', class: 'admin-auth-close', 'aria-label': 'Cancel authorization', text: '×' });
      panel.appendChild(h('header', {}, title, close));
      panel.appendChild(h('p', { id: descId, class: 'admin-auth-description', text: view.description }));
      var context = h('dl', { class: 'admin-auth-context' });
      view.rows.forEach(function (row) { context.appendChild(h('div', {}, h('dt', { text: row.label }), h('dd', { text: row.value }))); });
      panel.appendChild(context);
      panel.appendChild(h('div', { class: 'admin-auth-digest' }, h('small', { text: 'Exact manifest digest · SHA-256' }), h('code', { text: view.digest })));
      view.disclosures.forEach(function (item) {
        var details = document.createElement('details'); details.appendChild(h('summary', { text: item.label }));
        var pre = document.createElement('pre'); pre.textContent = item.text; details.appendChild(pre); panel.appendChild(details);
      });
      panel.appendChild(h('p', { class: 'admin-auth-safety', text: view.safety }));
      var footer = h('footer', {}, h('button', { type: 'button', class: 'btn', text: 'Cancel' }), h('button', { type: 'button', class: 'btn primary', 'data-autofocus': true, text: 'Approve scopes & sign' }));
      panel.appendChild(footer);
      backdrop.appendChild(panel); dialog.appendChild(backdrop); document.body.appendChild(dialog);
      var cancelButton = footer.children[0], approveButton = footer.children[1], settled = false;
      function finish(ok) { if (settled) return; settled = true; dialog.remove(); resolve(ok); }
      function busy() { return dialog.state === 'signing'; }
      close.addEventListener('click', function () { if (!busy()) finish(false); });
      cancelButton.addEventListener('click', function () { if (!busy()) finish(false); });
      backdrop.addEventListener('mousedown', function (event) { if (event.target === backdrop && !busy()) finish(false); });
      dialog.addEventListener('keydown', function (event) { if (busy() && event.key === 'Escape') event.stopPropagation(); }, true);
      approveButton.addEventListener('click', function () {
        dialog.state = 'signing';
        close.disabled = true; cancelButton.disabled = true; approveButton.disabled = true;
        approveButton.textContent = 'Signing locally…';
        finish(true);
      });
      dialog.open = true;
    });
  }

  window.ArkUI.authorizationDialog = { confirm: confirm };
})();
