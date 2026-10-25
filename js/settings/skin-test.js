/* =====================================================================
   LOCAL SKIN TEST in the settings panel (owner, 2026-10-25)
   ---------------------------------------------------------------------
   The owner tries an NFT skin on the site to see where it breaks. This adds one group to the settings panel
   (.settings-panel, built by scripts/settings-entry.js into js/settings/panel.js): None and the NFT session's review
   samples. It shows on this computer's own addresses only (localhost, 127.0.0.1, [::1], *.localhost); js/ark/skin-site.js
   loads this file only there, and the file checks again.

   It wears a sample the way ?skin-sample=N does: DefxnSkinSite.sample(n) then DefxnSkinSite.tryRecord, the NFT
   session's own loader and DefxnWear.tryOn. Nothing goes to the chain and nothing is kept by DefxnWear. None ends the
   try (DefxnWear.stopTrying), which puts back a card the visitor kept, if any. The choice lasts for this tab
   (sessionStorage, one plain number), so a reload while auditing keeps it; closing the tab drops it. */
(function () {
  'use strict';
  var host = location.hostname;
  if (!(host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || /\.localhost$/.test(host))) return;

  var KEY = 'defxn.skin-test';   /* this tab only; the value is a sample number */
  var picked = read();
  var box = null;

  function read() { try { return sessionStorage.getItem(KEY); } catch (e) { return null; } }
  function write(n) { try { if (n) sessionStorage.setItem(KEY, n); else sessionStorage.removeItem(KEY); } catch (e) { /* a private window: the choice lasts for this page */ } }
  function scene() { return document.getElementById('scene') || document.body; }
  function samples() { return window.DefxnSkinSite ? DefxnSkinSite.SAMPLES : ['27', '263', '512']; }

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function build(panel) {
    box = el('div', 'settings-skin-test');
    box.appendChild(el('span', 'settings-label', 'Test a skin · this computer only'));
    box.appendChild(el('span', 'settings-description', 'Wear a sample card’s skin to see where it breaks. Nothing goes to the chain. Closing the tab takes it off.'));
    var row = el('div', 'settings-choices settings-skin-choices');
    row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'Test skin');
    [''].concat(samples()).forEach(function (n) {
      var b = el('button', 'settings-choice', n ? 'Card ' + n : 'None');
      b.type = 'button'; b.setAttribute('data-skin-test', n);
      b.addEventListener('click', function () { choose(n); });
      row.appendChild(b);
    });
    box.appendChild(row);
    box.appendChild(el('span', 'settings-description settings-skin-status'));
    /* first under the panel's title, so a test skin is one press away while auditing; the visitor's own settings follow */
    var after = panel.querySelector('.settings-description');
    panel.insertBefore(box, after ? after.nextSibling : panel.firstChild);
    draw();
  }
  function draw(note) {
    if (!box) return;
    Array.prototype.forEach.call(box.querySelectorAll('[data-skin-test]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-skin-test') === (picked || ''))); });
    box.querySelector('.settings-skin-status').textContent = note || (picked ? 'Card ' + picked + ' is on. Open each page to see what it reaches.' : 'No test skin is on.');
  }
  function choose(n) {
    picked = n || null; write(picked); draw(picked ? 'Putting card ' + picked + ' on…' : null);
    if (!window.DefxnSkinSite) { draw('The skin code (js/ark/skin-site.js) is not loaded on this page. Reload and try again.'); return; }
    var job = picked
      ? DefxnSkinSite.sample(picked).then(DefxnSkinSite.tryRecord)
      : Promise.resolve(window.DefxnWear ? DefxnWear.stopTrying(scene()) : DefxnSkinSite.remove());
    job.then(function () { draw(); }, function (e) { draw('The skin did not go on: ' + e.message); });
  }

  /* The panel is built once and kept mounted; this waits for it, and puts the group back if a re-render drops it. */
  function attach() {
    var panel = document.querySelector('.settings-panel');
    if (!panel) return false;
    if (!panel.contains(box)) build(panel);
    return true;
  }
  function start() {
    var watch = new MutationObserver(attach);
    watch.observe(document.body, { childList: true, subtree: true });
    attach();
    /* a test skin chosen earlier in this tab goes back on, unless the address asks for its own (?skin-sample=) */
    if (picked && !new URLSearchParams(location.search).get('skin-sample')) choose(picked);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
