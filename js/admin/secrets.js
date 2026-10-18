/* =====================================================================
   ADMIN EDITOR · ENCRYPTED ITEMS (js/admin/secrets.js)
   ---------------------------------------------------------------------
   Owns: the Vault panel -- renderVaultPanel(container), drawn into whatever container the
   shell gives it (the rail's Vault tab, ~280px): every encrypted item (ArkSecret) with its
   dirty dot, New encrypted item, and per item an inline detail -- label, this browser's key,
   recipients, encrypting the draft for them, decrypting with this identity's media key,
   Revert, Delete.
   Must not: keep plaintext anywhere but state.secretPlaintext (never saved), or write
   files itself (js/admin/save.js does).
   ===================================================================== */
(function () {
  'use strict';
  var A = window.ArkAdmin; if (!A) return;   /* js/admin/core.js did not start the editor (no locked page around it) */
  var state = A.state, gate = A.gate, h = A.h, touch = A.touch, status = A.status,
      removeItemFile = A.removeItemFile, afterDelete = A.afterDelete, ctlField = A.ctlField,
      paintInto = A.paintInto, panelHead = A.panelHead, itemsChanged = A.itemsChanged,
      itemDirty = A.itemDirty, afterItemRemoved = A.afterItemRemoved, deleteItem = A.deleteItem,
      repaintPanels = A.repaintPanels;

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
      touch({ kind: 'secret', id: id }); repaintPanels('secret', id);
      status('Encrypted for ' + recipients.length + ' recipient' + (recipients.length === 1 ? '' : 's') + '. Save to write it.', 'ok');
    } catch (error) { status('Could not encrypt: ' + error.message, 'error'); }
  }

  async function decryptSecretDraft(secret, id) {
    try {
      var own = ownMediaKeyPair();
      var read = await ArkContentCrypto.decryptForSelf(secret, own);
      if (read === null) { status('This browser’s key is not one of the recipients: cannot decrypt.', 'warn'); return; }
      state.secretDecrypted[id] = read.content || ''; repaintPanels('secret', id);
    } catch (error) { status('Could not decrypt: ' + error.message, 'error'); }
  }

  /* a free-text row of this form (the shared ctlField), with its id for drivers and labels */
  function textRow(label, id, opts, get, set) {
    var row = ctlField({ get: get, set: function (_k, v) { set(v); } }, label, 'value', Object.assign({ type: 'text', live: true, id: id }, opts));
    row.classList.add('field');
    return row;
  }

  /* one item's detail: the old editor body, unchanged in what it edits */
  function secretDetail(id) {
    var secret = state.secretDrafts[id];
    var root = h('div', { class: 'vault-detail' });
    root.appendChild(panelHead(secret.label || id, 'js/content/secrets/' + id + '.js', 'secret', id));

    var about = h('fieldset', {}, h('legend', { text: 'Encrypted content' }),
      h('p', { class: 'hint' }, 'The body is AES-GCM ciphertext; the key is wrapped once per recipient with nacl box. Nothing on disk or on the mesh ever holds the plaintext — only what you encrypt here, in this browser, right now.'));
    about.appendChild(textRow('Label', 'sec-' + id + '-label', {}, function () { return secret.label; }, function (v) {
      secret.label = v;
      var name = root.parentNode && root.parentNode.querySelector('[data-cms-item="secret:' + id + '"] .vault-name');
      if (name) name.textContent = v || id;
      touch({ kind: 'secret', id: id });
    }));
    root.appendChild(about);

    var keyBox = h('fieldset', {}, h('legend', { text: 'Your key (this browser)' }));
    var own = ownMediaKeyPair();
    var keyRow = textRow('Share this so someone can add you as a recipient', 'sec-' + id + '-own-key', { readOnly: true, spellcheck: false }, function () { return own.publicKey; }, function () {});
    keyRow.appendChild(h('button', { type: 'button', class: 'btn', text: 'Copy', onclick: function () {
      navigator.clipboard.writeText(own.publicKey).then(function () { status('Copied your public key.', 'ok'); }).catch(function () { status('Could not copy; select and copy it by hand.', 'warn'); });
    } }));
    keyBox.appendChild(keyRow);
    root.appendChild(keyBox);

    var hasCiphertext = !!secret.ciphertextBase64;
    if (hasCiphertext) {
      var lockedBox = h('fieldset', {}, h('legend', { text: 'Currently encrypted' }));
      lockedBox.appendChild(h('p', { class: 'hint' }, 'Encrypted for ' + (secret.recipients || []).length + ' recipient(s), ' + ArkSecret.sizeLabel(Math.floor((secret.ciphertextBase64.length * 3) / 4)) + '.'));
      lockedBox.appendChild(h('button', { type: 'button', class: 'btn', text: 'Decrypt to check', onclick: function () { decryptSecretDraft(secret, id); } }));
      if (state.secretDecrypted[id] !== undefined) {
        lockedBox.appendChild(textRow('Decrypted content (this browser only, not saved)', 'sec-' + id + '-decrypted', { type: 'textarea', rows: 6, readOnly: true },
          function () { return state.secretDecrypted[id]; }, function () {}));
      }
      root.appendChild(lockedBox);
    }

    var writeBox = h('fieldset', {}, h('legend', { text: hasCiphertext ? 'Re-encrypt (replaces the content above)' : 'Write and encrypt' }));
    var recipientsRow = textRow('Recipients (public keys)', 'sec-' + id + '-recipients', { type: 'textarea', rows: 3, spellcheck: false, placeholder: 'One recipient public key per line' },
      function () { return state.secretRecipientsText[id] || ''; }, function (v) { state.secretRecipientsText[id] = v; });
    var recipientsArea = recipientsRow.children[1];
    writeBox.appendChild(recipientsRow);
    writeBox.appendChild(h('button', { type: 'button', class: 'btn', text: 'Add my own key', onclick: function () {
      var lines = parseRecipientKeys(recipientsArea.value);
      if (lines.indexOf(own.publicKey) < 0) lines.push(own.publicKey);
      recipientsArea.value = lines.join('\n'); state.secretRecipientsText[id] = recipientsArea.value;
    } }));
    writeBox.appendChild(textRow('Content', 'sec-' + id + '-plaintext', { type: 'textarea', rows: 6, placeholder: 'The content to encrypt' },
      function () { return state.secretPlaintext[id] || ''; }, function (v) { state.secretPlaintext[id] = v; }));
    writeBox.appendChild(h('button', { type: 'button', class: 'btn primary', text: 'Encrypt & lock', onclick: function () { encryptSecretDraft(secret, id); } }));
    root.appendChild(writeBox);

    root.appendChild(h('div', { class: 'danger-zone' },
      h('button', { type: 'button', class: 'btn danger', text: 'Delete this item', onclick: function () { deleteItem('secret', id); } })));
    return root;
  }

  /* renderVaultPanel(container): every encrypted item as a row, each opening its detail inline
     under it; New encrypted item at the top. Rail width (~280px) friendly. Returns the container. */
  function renderVaultPanel(container) {
    var record = { kind: 'secret:list', repaint: function () { renderVaultPanel(container); } };
    paintInto(container, record, function (root) {
      root.classList.add('cms-form', 'cms-vault');
      root.appendChild(h('details', { class: 'add-toggle' }, h('summary', { text: 'New encrypted content' }),
        h('form', { id: 'newSecretForm', class: 'new-form', autocomplete: 'off' },
          h('div', { class: 'new-row' }, h('input', { type: 'text', id: 'newSecretId', placeholder: 'item-name', 'aria-label': 'Encrypted item name', spellcheck: false }),
            h('button', { type: 'submit', class: 'btn', text: 'Add' })))));
      if (!state.secretIds.length) { root.appendChild(h('p', { class: 'hint', text: 'No encrypted items yet. Add one above, write it, encrypt it, then Save.' })); return; }
      var list = h('ul', { class: 'vault-items' });
      state.secretIds.forEach(function (id) {
        var secret = state.secretDrafts[id], open = state.kind === 'secret' && state.secretCurrent === id;
        var row = h('button', { type: 'button', class: 'vault-item', 'aria-expanded': String(open), 'data-cms-item': 'secret:' + id, onclick: function () {
          var opening = !(state.kind === 'secret' && state.secretCurrent === id);
          if (opening) { state.kind = 'secret'; state.secretCurrent = id; } else state.secretCurrent = null;
          renderVaultPanel(container);
        } }, h('span', { class: 'vault-name', text: secret.label || id }), h('span', { class: 'field-key', text: secret.ciphertextBase64 ? 'locked' : 'not encrypted' }),
          itemDirty('secret', id) ? h('span', { class: 'dot', title: 'Unsaved changes' }) : null);
        var li = h('li', { class: open ? 'open' : '' }, row);
        if (open) li.appendChild(secretDetail(id));
        list.appendChild(li);
      });
      root.appendChild(list);
    });
    return container;
  }

  function revertSecret(id) {
    if (id === undefined) id = state.secretCurrent;
    if (state.secretSaved[id] === null || state.secretSaved[id] === undefined) return;
    state.secretDrafts[id] = JSON.parse(state.secretSaved[id]); state.secretPlaintext[id] = ''; delete state.secretDecrypted[id];
    itemsChanged('secret', id); touch({ kind: 'secret', id: id }); status('Reverted to the saved version.', '');
  }

  /* Step 5: the old single-secret saveSecretCurrent() is deleted -- its exact logic now
     lives inside saveEverything()'s secrets loop. See saveEverything() (js/admin/save.js). */

  async function deleteSecret(id) {
    if (id === undefined) id = state.secretCurrent;
    var secret = state.secretDrafts[id];
    if (!secret) { status('Nothing deleted: there is no encrypted item "' + id + '".', 'error'); return; }
    if (!state.secretDir && state.secretSaved[id] !== null) { status('Connect the project folder to delete encrypted content: this removes its file.', 'warn'); return; }
    if (!window.confirm('Delete "' + (secret.label || id) + '"? This cannot be undone.')) return;
    try { await removeItemFile('secret', id); }
    catch (error) { status(error.message, 'error'); return; }
    if (state.secretCurrent === id) state.secretCurrent = state.secretIds[0] || null;
    afterItemRemoved('secret', id);
    status('Deleted ' + (secret.label || id) + '.' + await afterDelete(), 'ok');
  }

  /* createSecret(id) -> { ok, id } | { ok: false, refusal }: a new, empty encrypted item (written,
     ciphertext only, by the next Save), opened. */
  function createSecret(id) {
    id = String(id || '').trim();
    var refusal = !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id) ? 'A name is lowercase words joined by hyphens, starting with a letter.'
      : state.secretDrafts[id] ? 'There is already an item called ' + id + '.' : '';
    if (refusal) { status(refusal, 'error'); return { ok: false, refusal: refusal }; }
    state.secretIds.push(id);
    state.secretDrafts[id] = { id: id, label: id, ciphertextBase64: '', metadata: null, recipients: [] };
    state.secretSaved[id] = null; state.secretPlaintext[id] = ''; state.secretRecipientsText[id] = '';
    state.kind = 'secret'; state.secretCurrent = id;
    itemsChanged('secret', id); touch({ kind: 'secret', id: id });
    status('New encrypted content. Write it and encrypt it, then Save.', '');
    return { ok: true, id: id };
  }
  /* delegated by the form's id: the panel's form and any other drawn with the same ids */
  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form || form.id !== 'newSecretForm') return;
    event.preventDefault();
    var idInput = form.querySelector('#newSecretId'), r = createSecret(idInput.value);
    if (!r.ok) return;
    idInput.value = '';
    if (typeof A.selectSecret === 'function') A.selectSecret(r.id);
  });
  A.provide({ createSecret: createSecret, deleteSecret: deleteSecret, renderVaultPanel: renderVaultPanel,
      revertSecret: revertSecret });
})();
