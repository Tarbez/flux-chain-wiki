/* =====================================================================
   ADMIN EDITOR · NOTICES (js/admin/notice.js)
   ---------------------------------------------------------------------
   Owns: notice() -- the editor's ONE way to tell a person something that is not the answer of
   the control they are looking at: a passing TOAST for an event (a page created, a field
   reverted, a refusal) and a persistent BANNER for a condition that holds until it is fixed
   (no project folder connected, publishing unavailable). Every notice has a tone, a title, a
   body and its actions, so a refusal can carry its remedy as a button instead of a sentence
   telling the person where to find one (law: a refusal names what it needs).
   Why it exists (docs/ux-audit/cms.md P1-16): the editor reported through four channels -- the
   header #status cut to ten characters ("New page. Edit it, th..."), #toast, the footer and
   rail dots -- so "Save without a folder downloads files", "Publish is unavailable" and "this
   page is not saved yet" each read as nothing happening.

     notice({ tone, title, body, actions: [{ label, run }], persist, key, into }) -> { el, close() }
       tone     'info' | 'success' | 'warning' | 'danger' ('ok' / 'warn' / 'error', the status
                line's tones, are read as success / warning / danger)
       actions  buttons; the first is the primary one. A toast closes after its action runs; a
                banner stays (its condition decides: whoever fixes it closes it by key)
       persist  a banner (stays until closed) instead of a toast (closes by itself, never while
                hovered or focused)
       key      one notice per key: a new one replaces the old; notice.close(key) closes it
       into     draw the notice inline in this container (a sheet's own alert) instead of the
                editor's banner/toast regions
   The shape and the parts mirror Ark UI's createArkAlert / createArkToastRegion
   (design/ark-primitives/src/alert.js, messaging.js): data-part alert / alert-title /
   alert-description / alert-action / alert-dismiss / toast / toast-region, tone in data-tone,
   role alert (assertive) for warning and danger, status (polite) otherwise -- so a later wave
   swaps these internals for the Ark components without changing one caller.
   Must not: know any feature, draft, panel or mode (callers pass the words and the actions), or
   grow a second API -- the four options above are the whole contract.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var h = A.h, ic = A.ic;

  var TONES = { info: 'info', success: 'success', ok: 'success', warning: 'warning', warn: 'warning', danger: 'danger', error: 'danger' };
  var ICONS = { info: 'info', success: 'check', warning: 'warn', danger: 'warn' };
  /* a toast is read, not glanced at: long enough for two sentences, longer when it offers an action */
  var TOAST_MS = 6000, TOAST_ACTION_MS = 10000, MAX_TOASTS = 3;
  var byKey = Object.create(null);

  /* Where a notice goes. Banners: #noticeBanners, the strip above the canvas in the workspace
     (admin-app.html; the canvas gives it the room, js/admin/canvas.js layoutStage), else a
     floating strip under the header. Toasts: one fixed stack at the bottom centre. Created on
     first use, so a page without the markup (a jsdom test of one panel) still gets its notices. */
  function region(persist) {
    if (persist) { var strip = document.getElementById('noticeBanners'); if (strip) return strip; }
    var id = persist ? 'noticeBannersFloating' : 'noticeToasts';
    var el = document.getElementById(id);
    if (!el) {
      el = h('div', { id: id, class: 'notice-region ' + (persist ? 'notice-banners notice-floating' : 'notice-toasts'), 'data-part': persist ? null : 'toast-region' });
      document.body.appendChild(el);
    }
    return el;
  }

  function notice(opts) {
    opts = opts || {};
    var tone = TONES[opts.tone] || 'info', persist = !!opts.persist, inline = !!opts.into;
    if (opts.key && byKey[opts.key]) byKey[opts.key].close();
    var assertive = tone === 'warning' || tone === 'danger';
    var el = h('div', { class: 'notice' + (persist || inline ? ' notice-banner' : ' notice-toast'), 'data-tone': tone,
      'data-part': persist || inline ? 'alert' : 'toast', 'data-notice': opts.key || null,
      role: assertive ? 'alert' : 'status', 'aria-live': assertive ? 'assertive' : 'polite' });
    var icon = h('span', { class: 'notice-icon', 'data-part': 'alert-icon', 'aria-hidden': 'true' }); icon.innerHTML = ic(ICONS[tone]);
    var text = h('div', { class: 'notice-text' });
    if (opts.title) text.appendChild(h('p', { class: 'notice-title', 'data-part': 'alert-title', text: opts.title }));
    if (opts.body) text.appendChild(h('p', { class: 'notice-body', 'data-part': 'alert-description', text: opts.body }));
    var handle = { el: el, closed: false, close: close };
    var actions = (opts.actions || []).filter(function (a) { return a && a.label && typeof a.run === 'function'; });
    if (actions.length) {
      var row = h('div', { class: 'notice-actions' });
      actions.forEach(function (action, i) {
        row.appendChild(h('button', { type: 'button', class: 'btn small' + (i === 0 ? ' primary' : ''), 'data-part': 'alert-action', text: action.label,
          onclick: function () {
            /* a toast has done its job once its action ran; a banner's condition decides when it goes */
            if (!persist && !inline) close();
            action.run(handle);
          } }));
      });
      text.appendChild(row);
    }
    var dismiss = h('button', { type: 'button', class: 'notice-dismiss', 'data-part': 'alert-dismiss', 'aria-label': 'Dismiss: ' + (opts.title || opts.body || 'notice'), title: 'Dismiss', onclick: function () { close(); } });
    dismiss.innerHTML = ic('close');
    el.appendChild(icon); el.appendChild(text); el.appendChild(dismiss);

    var timer = 0, hovered = false;
    function arm() {
      if (persist || inline) return;
      clearTimeout(timer);
      timer = setTimeout(function () { if (hovered || el.contains(document.activeElement)) arm(); else close(); }, actions.length ? TOAST_ACTION_MS : TOAST_MS);
    }
    function close() {
      if (handle.closed) return;
      handle.closed = true; clearTimeout(timer);
      if (opts.key && byKey[opts.key] === handle) delete byKey[opts.key];
      el.remove();
    }
    el.addEventListener('pointerenter', function () { hovered = true; });
    el.addEventListener('pointerleave', function () { hovered = false; });

    var host = inline ? opts.into : region(persist);
    if (!persist && !inline) {
      /* the newest toast at the bottom; the oldest gives way past MAX_TOASTS */
      var shown = host.querySelectorAll('.notice-toast');
      for (var i = 0; i <= shown.length - MAX_TOASTS; i++) if (shown[i].noticeHandle) shown[i].noticeHandle.close(); else shown[i].remove();
    }
    el.noticeHandle = handle;
    host.appendChild(el);
    if (opts.key) byKey[opts.key] = handle;
    arm();
    return handle;
  }
  /* close the notice under `key`, if one is showing (a condition that has been fixed) */
  notice.close = function (key) { if (byKey[key]) byKey[key].close(); };
  /* the notice under `key`, or null: whether a condition is being shown */
  notice.get = function (key) { return byKey[key] || null; };

  A.provide({ notice: notice });
})();
