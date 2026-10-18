/* =====================================================================
   ADMIN EDITOR · ENCRYPTED ITEMS (js/admin/secrets.js)
   ---------------------------------------------------------------------
   Owns: the encrypted-item (ArkSecret) editor -- recipients, encrypting the draft for
   them, decrypting with this identity's media key, Revert, Delete, New encrypted item.
   Must not: keep plaintext anywhere but state.secretPlaintext (never saved), or write
   files itself (js/admin/save.js does).
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, gate = A.gate, h = A.h, touch = A.touch, status = A.status,
      renderEditor = A.renderEditor, $ = A.$, revertCurrent = A.revertCurrent,
      deleteCurrent = A.deleteCurrent, renderList = A.renderList, removeItemFile = A.removeItemFile,
      afterDelete = A.afterDelete, selectSecret = A.selectSecret;
  /* defined by files loaded after this one: resolved when called */
  var reloadPreview = A.later('reloadPreview');

  /* ---- encrypted content ---------------------------------------------- */
  /* The keypair that wraps a file key for "this browser": one per DeadArk identity when signed
     in, so the same person reuses the same media key across sessions; a stable local id
     otherwise, so a draft made before sign-in is still readable by the same browser after. */
  function mediaOwnerId() {
    var who = null;
    try { who = gate.identity(); } catch (e) { who = null; }
    return (who && who.publicKeyB64) || 'local-admin';
  }
  function ownMediaKeyPair() { return ArkContentCrypto.createOrLoadKeyPair(mediaOwnerId()); }

  function secretLabelField(secret) {
    var id = 'sec-' + secret.id + '-label';
    var control = h('input', { id: id, type: 'text', spellcheck: true });
    control.value = secret.label;
    control.addEventListener('input', function () { secret.label = control.value; touch(); });
    return h('div', { class: 'field' }, h('label', { for: id, text: 'Label' }), control);
  }

  function parseRecipientKeys(text) {
    return (text || '').split(/[\n,]/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  async function encryptSecretDraft(secret, id) {
    var recipients = parseRecipientKeys(state.secretRecipientsText[id]);
    var plaintext = (state.secretPlaintext[id] || '').trim();
    if (!recipients.length) { status('Add at least one recipient public key first.', 'error'); return; }
    if (!plaintext) { status('Write the content to encrypt first.', 'error'); return; }
    try {
      var result = await ArkContentCrypto.encryptForRecipients({ kind: 'flux_secret_payload', version: 1, title: secret.label, content: plaintext }, recipients);
      secret.ciphertextBase64 = result.ciphertextBase64; secret.metadata = result.metadata; secret.recipients = result.envelopes;
      state.secretPlaintext[id] = ''; delete state.secretDecrypted[id];
      touch(); renderEditor(); status('Encrypted for ' + recipients.length + ' recipient' + (recipients.length === 1 ? '' : 's') + '. Save to write it.', 'ok');
    } catch (error) { status('Could not encrypt: ' + error.message, 'error'); }
  }

  async function decryptSecretDraft(secret, id) {
    try {
      var own = ownMediaKeyPair();
      var read = await ArkContentCrypto.decryptForSelf(secret, own);
      if (read === null) { status('This browser’s key is not one of the recipients: cannot decrypt.', 'warn'); return; }
      state.secretDecrypted[id] = read.content || ''; renderEditor();
    } catch (error) { status('Could not decrypt: ' + error.message, 'error'); }
  }

  function renderSecretEditor() {
    var root = $('editor'); root.textContent = '';
    var id = state.secretCurrent, secret = state.secretDrafts[id];
    if (!secret) { root.appendChild(h('p', { class: 'empty-state', text: 'Pick an item on the left.' })); return; }
    var revert = h('button', { id: 'revert', type: 'button', class: 'btn', text: 'Revert', onclick: revertCurrent });
    root.appendChild(h('div', { class: 'editor-head' },
      h('div', {}, h('h1', { text: secret.label || id }), h('div', { class: 'route', text: 'js/content/secrets/' + id + '.js' })),
      h('div', { class: 'editor-actions' }, revert)));

    var about = h('fieldset', {}, h('legend', { text: 'Encrypted content' }),
      h('p', { class: 'hint' }, 'The body is AES-GCM ciphertext; the key is wrapped once per recipient with nacl box. Nothing on disk or on the mesh ever holds the plaintext — only what you encrypt here, in this browser, right now.'));
    about.appendChild(secretLabelField(secret));
    root.appendChild(about);

    var keyBox = h('fieldset', {}, h('legend', { text: 'Your key (this browser)' }));
    var own = ownMediaKeyPair();
    var keyField = h('input', { type: 'text', readonly: true, value: own.publicKey });
    var copyBtn = h('button', { type: 'button', class: 'btn', text: 'Copy', onclick: function () {
      navigator.clipboard.writeText(own.publicKey).then(function () { status('Copied your public key.', 'ok'); }).catch(function () { status('Could not copy; select and copy it by hand.', 'warn'); });
    } });
    keyBox.appendChild(h('div', { class: 'field' }, h('label', { text: 'Share this so someone can add you as a recipient' }), h('div', { class: 'new-row' }, keyField, copyBtn)));
    root.appendChild(keyBox);

    var hasCiphertext = !!secret.ciphertextBase64;
    if (hasCiphertext) {
      var lockedBox = h('fieldset', {}, h('legend', { text: 'Currently encrypted' }));
      lockedBox.appendChild(h('p', { class: 'hint' }, 'Encrypted for ' + (secret.recipients || []).length + ' recipient(s), ' + ArkSecret.sizeLabel(Math.floor((secret.ciphertextBase64.length * 3) / 4)) + '.'));
      var revealBtn = h('button', { type: 'button', class: 'btn', text: 'Decrypt to check', onclick: function () { decryptSecretDraft(secret, id); } });
      lockedBox.appendChild(revealBtn);
      if (state.secretDecrypted[id] !== undefined) {
        lockedBox.appendChild(h('div', { class: 'field' }, h('label', { text: 'Decrypted content (this browser only, not saved)' }),
          h('textarea', { rows: 6, readonly: true, text: state.secretDecrypted[id] })));
      }
      root.appendChild(lockedBox);
    }

    var writeBox = h('fieldset', {}, h('legend', { text: hasCiphertext ? 'Re-encrypt (replaces the content above)' : 'Write and encrypt' }));
    var recipientsArea = h('textarea', { rows: 3, spellcheck: false, placeholder: 'One recipient public key per line' });
    recipientsArea.value = state.secretRecipientsText[id] || '';
    recipientsArea.addEventListener('input', function () { state.secretRecipientsText[id] = recipientsArea.value; });
    writeBox.appendChild(h('div', { class: 'field' }, h('label', { text: 'Recipients (public keys)' }), recipientsArea));
    var addSelfBtn = h('button', { type: 'button', class: 'btn', text: 'Add my own key', onclick: function () {
      var lines = parseRecipientKeys(recipientsArea.value);
      if (lines.indexOf(own.publicKey) < 0) lines.push(own.publicKey);
      recipientsArea.value = lines.join('\n'); state.secretRecipientsText[id] = recipientsArea.value;
    } });
    writeBox.appendChild(addSelfBtn);
    var plaintextArea = h('textarea', { rows: 6, spellcheck: true, placeholder: 'The content to encrypt' });
    plaintextArea.value = state.secretPlaintext[id] || '';
    plaintextArea.addEventListener('input', function () { state.secretPlaintext[id] = plaintextArea.value; });
    writeBox.appendChild(h('div', { class: 'field' }, h('label', { text: 'Content' }), plaintextArea));
    writeBox.appendChild(h('button', { type: 'button', class: 'btn primary', text: 'Encrypt & lock', onclick: function () { encryptSecretDraft(secret, id); } }));
    root.appendChild(writeBox);

    root.appendChild(h('div', { class: 'danger-zone' },
      h('button', { type: 'button', class: 'btn danger', text: 'Delete this item', onclick: deleteCurrent })));
    touch();
  }

  function revertSecret() {
    var id = state.secretCurrent;
    if (state.secretSaved[id] === null) return;
    state.secretDrafts[id] = JSON.parse(state.secretSaved[id]); state.secretPlaintext[id] = ''; delete state.secretDecrypted[id];
    renderEditor(); renderList(); status('Reverted to the saved version.', '');
  }

  /* Step 5: the old single-secret saveSecretCurrent() is deleted -- its exact logic now
     lives inside saveEverything()'s secrets loop. See saveEverything() (js/admin/save.js). */

  async function deleteSecret() {
    var id = state.secretCurrent, secret = state.secretDrafts[id];
    if (!state.secretDir && state.secretSaved[id] !== null) { status('Connect the project folder to delete encrypted content: this removes its file.', 'warn'); return; }
    if (!window.confirm('Delete "' + (secret.label || id) + '"? This cannot be undone.')) return;
    try { await removeItemFile('secret', id); }
    catch (error) { status(error.message, 'error'); return; }
    state.secretCurrent = state.secretIds[0] || null; renderList(); renderEditor(); reloadPreview(); status('Deleted ' + (secret.label || id) + '.' + await afterDelete(), 'ok');
  }

  $('newSecretForm').addEventListener('submit', function (event) {
    event.preventDefault();
    var idInput = $('newSecretId'), id = idInput.value.trim();
    if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id)) { status('A name is lowercase words joined by hyphens, starting with a letter.', 'error'); return; }
    if (state.secretDrafts[id]) { status('There is already an item called ' + id + '.', 'error'); return; }
    state.secretIds.push(id);
    state.secretDrafts[id] = { id: id, label: id, ciphertextBase64: '', metadata: null, recipients: [] };
    state.secretSaved[id] = null; state.secretPlaintext[id] = ''; state.secretRecipientsText[id] = '';
    idInput.value = ''; selectSecret(id); status('New encrypted content. Write it and encrypt it, then Save.', '');
  });
  A.provide({ deleteSecret: deleteSecret, renderSecretEditor: renderSecretEditor,
      revertSecret: revertSecret });
})();
