/* =====================================================================
   ENCRYPTED CONTENT
   ---------------------------------------------------------------------
   Content that goes into the published archive but is not public: the
   body is AES-GCM ciphertext, and the file key is wrapped once per
   recipient with nacl box (js/admin/crypto.js, ArkContentCrypto). This
   mirrors js/content/assets.js on purpose -- same id/label shape, same
   define/get/remove/serialize contract -- so a secret round-trips through
   the same .flx archive as manifests, articles and assets, and the admin
   page, the publish host and a hand edit cannot disagree about what is
   valid. A secret carries no plaintext anywhere in this file or on disk:
   only ciphertext and public wrapped-key envelopes.
   ===================================================================== */
var ArkSecret = (function () {
  'use strict';

  var ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
  var B64 = /^[A-Za-z0-9+/]+=*$/;
  var MAX_BYTES = 1 * 1024 * 1024; // decoded ciphertext; a note or a draft, not a media file
  var secrets = [];

  function decodedLength(base64) { return Math.floor((base64 || '').replace(/=+$/, '').length * 3 / 4); }

  function sizeLabel(bytes) { return bytes >= 1048576 ? Math.round(bytes / 1048576) + 'MB' : Math.floor(bytes / 1024) + 'KB'; }

  function envelopeProblems(e, i) {
    var out = [];
    var where = 'recipient ' + (i + 1);
    if (!e || typeof e !== 'object') return [where + ' is not an object'];
    if (typeof e.recipientPublicKey !== 'string' || !B64.test(e.recipientPublicKey)) out.push(where + ': recipientPublicKey is missing or not base64');
    if (e.algorithm !== 'x25519-xsalsa20poly1305') out.push(where + ': algorithm must be x25519-xsalsa20poly1305');
    if (typeof e.nonce !== 'string' || !B64.test(e.nonce)) out.push(where + ': nonce is missing or not base64');
    if (typeof e.ephemeralPublicKey !== 'string' || !B64.test(e.ephemeralPublicKey)) out.push(where + ': ephemeralPublicKey is missing or not base64');
    if (typeof e.ciphertext !== 'string' || !B64.test(e.ciphertext)) out.push(where + ': ciphertext is missing or not base64');
    return out;
  }

  function problems(s) {
    var out = [];
    if (!s || typeof s !== 'object') return ['a secret is an object'];
    if (!ID.test(s.id || '')) out.push('id must be lowercase letters, digits and hyphens, starting with a letter');
    if (typeof s.label !== 'string' || !s.label) out.push('label is missing');
    if (typeof s.ciphertextBase64 !== 'string' || !s.ciphertextBase64) out.push('ciphertextBase64 is missing');
    else if (!B64.test(s.ciphertextBase64)) out.push('ciphertextBase64 is not base64');
    else if (decodedLength(s.ciphertextBase64) > MAX_BYTES) out.push('the encrypted content is larger than ' + sizeLabel(MAX_BYTES) + '; keep secrets small');
    if (!s.metadata || s.metadata.cipherAlgorithm !== 'AES-GCM') out.push('metadata.cipherAlgorithm must be AES-GCM');
    else if (typeof s.metadata.iv !== 'string' || !B64.test(s.metadata.iv)) out.push('metadata.iv is missing or not base64');
    if (!Array.isArray(s.recipients) || !s.recipients.length) out.push('recipients must list at least one wrapped key');
    else s.recipients.forEach(function (e, i) { out.push.apply(out, envelopeProblems(e, i)); });
    return out;
  }

  function define(s) {
    var bad = problems(s);
    if (bad.length) throw new Error('ArkSecret: ' + (s && s.id) + ': ' + bad.join('; '));
    var at = secrets.findIndex(function (p) { return p.id === s.id; });
    if (at < 0) secrets.push(s); else secrets[at] = s;
    return s;
  }

  function get(id) { return secrets.find(function (s) { return s.id === id; }); }
  function all() { return secrets.slice(); }
  function remove(id) { secrets = secrets.filter(function (s) { return s.id !== id; }); }

  /* the exact file text; the admin page and a hand edit produce the same bytes */
  function serialize(s) {
    return '/* One encrypted content item. No plaintext lives in this file: only ciphertext and public\n' +
      '   wrapped-key envelopes. Edit it in admin.html; a hand edit needs the crypto to have run there too. */\n' +
      'ArkSecret.define(' + JSON.stringify(s, null, 2) + ');\n';
  }

  return { define: define, get: get, all: all, remove: remove,
           problems: problems, serialize: serialize, maxBytes: MAX_BYTES, sizeLabel: sizeLabel };
})();
