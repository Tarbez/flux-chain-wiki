/* =====================================================================
   SHARED "CREATE A NEW IDENTITY" WIZARD UI
   ---------------------------------------------------------------------
   One real implementation, reused by every auth surface (defxn-dao's
   sign-in modal, defxn.com's /account page, and any future one) instead
   of each page hand-rolling its own copy of this form -- the exact
   "do it once, reuse it" the 2026-10-06 identity-creation gap review
   asked for. Built on js/admin/vendor/auth-kit-create.js's
   window.ArkAuthKitCreate.create(...) (the REAL, tested
   ark-dao/createRecoveryIdentity, bundled for the browser -- see that
   file's own header for why this reuses existing crypto rather than
   reimplementing it).

   window.ArkAuthKitCreatePanel.mount(container, opts) renders the
   two-stage wizard (form -> recovery phrase + download) into `container`
   and returns { reset() }. `opts.onDownloaded(filename)` fires once the
   real .auth.flx file has been saved, so the caller can return to its own
   import/unlock view -- this module never signs anyone in itself; the
   existing, already-proven import path does that, the same way creating
   a wallet and then restoring it from its own backup proves the backup
   is real before anything relies on it (see js/identity-panel.js's
   header comment for the full reasoning). Caller supplies the CSS
   classes it already uses for buttons/forms/result banners so the
   wizard matches the host page's own styling, not a fixed look. */
(function () {
  'use strict';
  window.ArkUI = window.ArkUI || {};

  function mount(container, opts) {
    opts = opts || {};
    var actionClass = opts.actionClass != null ? opts.actionClass : 'action';
    var formClass = opts.formClass != null ? opts.formClass : 'founding-form';
    var resultClass = opts.resultClass != null ? opts.resultClass : 'result-banner';
    var stage = 'form';
    var kit = null;

    function render() {
      if (stage === 'form') {
        container.innerHTML =
          '<form class="' + formClass + '" data-auth-kit-create-form>' +
            '<label>Display name<input type="text" name="displayName" maxlength="80" required autofocus></label>' +
            '<label>Recovery phrase length' +
              '<select name="wordCount"><option value="24" selected>24 words (recommended)</option><option value="12">12 words (compact)</option></select>' +
            '</label>' +
            '<label>New PIN (6–12 digits; 8+ digits alone, or 6+ with a password)<input type="password" name="pin" inputmode="numeric" required></label>' +
            '<label>Optional password<input type="password" name="password"></label>' +
            '<button class="' + actionClass + '" type="submit">Generate identity</button>' +
          '</form><div class="' + resultClass + '" data-auth-kit-create-result hidden></div>';
        var form = container.querySelector('[data-auth-kit-create-form]');
        var result = container.querySelector('[data-auth-kit-create-result]');
        form.addEventListener('submit', function (event) {
          event.preventDefault();
          var data = new FormData(form);
          var pin = String(data.get('pin') || '');
          var password = String(data.get('password') || '');
          var displayName = String(data.get('displayName') || '').trim();
          if (!/^\d{6,12}$/.test(pin) || (pin.length < 8 && !password)) {
            result.hidden = false; result.className = resultClass + ' error'; result.textContent = 'Use 8–12 PIN digits alone, or 6–12 digits with a password.'; return;
          }
          if (!displayName) return;
          result.hidden = false; result.className = resultClass; result.textContent = 'Generating locally — this takes a moment (real key generation, not simulated)…';
          (window.ArkAuthKitCreate ? window.ArkAuthKitCreate.create({
            displayName: displayName, wordCount: Number(data.get('wordCount')) === 12 ? 12 : 24, pin: pin, password: password,
          }) : Promise.reject(new Error('js/admin/vendor/auth-kit-create.js did not load.'))).then(function (created) {
            kit = created; stage = 'recovery'; render();
          }).catch(function (error) {
            result.className = resultClass + ' error'; result.textContent = error.message;
          });
        });
      } else if (stage === 'recovery') {
        var words = kit.mnemonic.split(' ');
        container.innerHTML =
          '<p class="lead">Save these ' + words.length + ' words somewhere safe — this is the ONLY way to recover this identity. They are never sent anywhere and never shown again after you continue.</p>' +
          '<ol class="auth-word-grid">' + words.map(function (w, i) { return '<li><small>' + (i + 1) + '</small><strong></strong></li>'; }).join('') + '</ol>' +
          '<button class="' + actionClass + '" type="button" data-auth-kit-create-download>Download my Auth Kit (.flx)</button>' +
          '<div class="' + resultClass + '" data-auth-kit-create-download-result hidden></div>';
        var items = container.querySelectorAll('.auth-word-grid li strong');
        words.forEach(function (w, i) { items[i].textContent = w; });
        container.querySelector('[data-auth-kit-create-download]').addEventListener('click', function () {
          var filename = (kit.displayName.trim().toLowerCase().replace(/[^a-z0-9._]+/g, '-').replace(/^-+|-+$/g, '') || 'flux-identity') + '.auth.flx';
          var blob = new Blob([kit.authKit], { type: 'application/vnd.flux.auth-kit' });
          var url = URL.createObjectURL(blob);
          var anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
          var result = container.querySelector('[data-auth-kit-create-download-result]');
          result.hidden = false; result.className = resultClass + ' ok';
          result.textContent = 'Saved as ' + filename + '. Choose that file to sign in with it.';
          stage = 'done'; kit = null;
          if (opts.onDownloaded) setTimeout(function () { opts.onDownloaded(filename); }, 2200);
        });
      }
    }

    render();
    return { reset: function () { stage = 'form'; kit = null; render(); } };
  }

  window.ArkUI.authKitCreatePanel = { mount: mount };
  window.ArkAuthKitCreatePanel = { mount: mount };
})();
