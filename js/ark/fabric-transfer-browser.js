/* =====================================================================
   FXN VALUE-OBJECT / TRANSFER-AGREEMENT / FULFILLMENT, BROWSER SIDE
   ---------------------------------------------------------------------
   Mirrors defi-library/src/fabricTransfer.mjs's `signed()`/`stable()`/
   `digest()` exactly, so a browser-built record is byte-identical to
   one `createValueObject()` et al. would build server-side, and
   verifies under the SAME `verifyValueObject`/`verifyTransferAgreement`/
   `verifyFulfillment` the miner runs -- there is no separate browser
   verification path and no relaxed rule.

   The one real difference: fabricTransfer.mjs signs with a PEM
   KeyObject via node:crypto's synchronous `sign(null, ...)`. The
   browser has no private key to hand to anything -- js/admin/auth.js's
   Auth Kit holds it and exposes only `who.sign(text) -> Promise<base64
   signature>` (raw Ed25519 over the UTF-8 bytes of `text`, the SAME
   primitive mesh-directory-client.js already relies on). Since a
   signature produced over a message with a given secret key is valid
   under the SAME key however its public half is text-encoded (PEM is
   an encoding, not a different key -- proven directly against real
   fabricTransfer.mjs verification, see value-credits-registries.test.mjs
   and this session's own round-trip check), `who.sign()` is exactly
   the right primitive here; no new signing capability was added.
   ===================================================================== */
(function () {
  'use strict';
  window.ArkUI = window.ArkUI || {};

  var VERSION = 'flux.fabric-transfer.v1';

  // Byte-for-byte port of fabricTransfer.mjs's `stable()`: sorted-key,
  // no-whitespace JSON. Must match EXACTLY -- this string is what gets
  // signed and hashed, any divergence produces a record the miner
  // rejects as a bad signature, not a helpful validation error.
  function stable(value) {
    if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
    if (value && typeof value === 'object') {
      var keys = Object.keys(value).sort();
      return '{' + keys.map(function (key) { return JSON.stringify(key) + ':' + stable(value[key]); }).join(',') + '}';
    }
    return JSON.stringify(value);
  }

  async function sha256Hex(text) {
    return window.ArkUI.ed25519Pem.sha256HexOfText(text);
  }

  // Port of fabricTransfer.mjs's `digest(domain, body)`.
  async function digest(domain, body) {
    return sha256Hex(domain + '\0' + stable(body));
  }

  // Port of fabricTransfer.mjs's `signed(kind, body, privateKeyPem)`,
  // with `who.sign(message)` (Auth Kit) standing in for the PEM-key sign
  // call -- same message, same signature shape, different signer.
  //
  // This is the ONE place every FXN value-object/agreement/fulfillment
  // signature is produced, so it is also the one place that shows the real
  // scoped-authorization dialog (js/ark/authorization-dialog.js) before
  // signing -- not a per-call-site copy. Previously this signed immediately
  // with no confirmation; the holder never saw what they were approving.
  async function signedRecord(who, kind, body) {
    var unsigned = Object.assign({ version: VERSION, kind: kind }, body);
    var message = kind + '\0' + stable(unsigned);
    if (window.ArkUI.authorizationDialog && window.ArkAuthorizationView) {
      var messageDigest = await sha256Hex(message);
      var view = window.ArkAuthorizationView.scopedAuthorizationView({
        title: 'Sign ' + kind.replace(/-/g, ' '),
        description: 'Review exactly what this signs before approving. Nothing is sent until you approve.',
        requester: who.displayName || who.identityId || who.publicKeyB64 || 'This identity',
        network: 'flux-mainnet',
        authority: 'flux value-object registry',
        configuration: VERSION,
        scope: kind,
        action: 'fabric.' + kind + '.sign',
        manifestDigest: messageDigest,
        claimStack: [
          'primary authorize fabric.' + kind + '.sign for exact manifest ' + messageDigest,
          'constraint owner ' + (who.publicKeyB64 || who.identityId || ''),
          'failure reject altered or replayed bytes',
          'trust zero',
        ].join('\n'),
        manifest: unsigned,
        authorizationBytes: message,
        actionPayloadBytes: message,
      });
      var approved = await window.ArkUI.authorizationDialog.confirm(view, { action: 'fabric.' + kind + '.sign', capability: kind });
      if (!approved) throw new Error('Signing cancelled. No ' + kind + ' record was produced.');
    }
    var signatureB64 = await who.sign(message);
    var record = Object.assign({}, unsigned, { signatureB64: signatureB64 });
    record.cid = await digest('flux-' + kind + '-cid-v1', record);
    return Object.freeze(record);
  }

  /* `ownerPublicKeyPem` defaults to this identity's own SPKI-wrapped key
     -- callers building an OUTPUT object for someone else pass that
     recipient's PEM explicitly instead. */
  async function createValueObject(who, input) {
    var ownerPublicKeyPem = input.ownerPublicKeyPem || window.ArkUI.ed25519Pem.spkiPemFromRawPublicKeyB64(who.publicKeyB64);
    return signedRecord(who, 'value-object', {
      objectId: input.objectId,
      asset: input.asset,
      amount: String(input.amount),
      ownerId: input.ownerId,
      ownerPublicKeyPem: ownerPublicKeyPem,
      sequence: input.sequence == null ? 0 : input.sequence,
      predecessorCid: input.predecessorCid == null ? null : input.predecessorCid,
      agreementCid: input.agreementCid == null ? null : input.agreementCid,
      fulfillmentCid: input.fulfillmentCid == null ? null : input.fulfillmentCid,
    });
  }

  function createTransferAgreement(who, input) {
    return signedRecord(who, 'agreement', {
      inputCid: input.inputCid,
      recipientId: input.recipientId,
      recipientPublicKeyPem: input.recipientPublicKeyPem,
      asset: input.asset,
      amount: String(input.amount),
      nextSequence: input.nextSequence,
    });
  }

  function createFulfillment(who, input) {
    return signedRecord(who, 'fulfillment', {
      agreementCid: input.agreementCid,
      inputCid: input.inputCid,
      outputCid: input.outputCid,
    });
  }

  /* ---- agreement-fabric quorum cell request, browser side -------------
     Mirrors flux-resolver/src/authorityCells.mjs's `defineCellRequest`/
     `cellRequestSigningBytes`/`signCellRequest` exactly (same
     `stableStringify`, same WebCrypto SHA-256 `contentCid`, same
     `flux-cell-request-v1\0...` signing-bytes domain). This MUST be
     signed by the value object's OWNER -- the miner never holds that
     key ("browser signs, host holds no key"), so the quorum's entry
     signature has to be built here, not server-side, even though
     everything else about relaying it to the quorum happens on the
     miner. `registryRoot`/`policyCid` come from the miner's own
     GET /directory/fabric-health (it already knows them locally; the
     browser has no reachability into the WireGuard-only peer mesh). */
  async function buildCellRequest(who, input) {
    var body = {
      predecessorCid: input.predecessorCid,
      successorCid: input.successorCid,
      nextSequence: input.nextSequence,
      registryRoot: input.registryRoot,
      policyCid: input.policyCid,
      requesterId: input.requesterId,
      requestedAt: input.requestedAt == null ? Math.floor(Date.now() / 1000) : input.requestedAt,
    };
    var message = 'flux-cell-request-v1\0' + stable(body);
    // The real quorum commit signature (this is what the agreement-fabric
    // relay actually checks) -- confirmed separately from signedRecord()
    // above because it is a genuinely different signing event, not a
    // duplicate of it.
    if (window.ArkUI.authorizationDialog && window.ArkAuthorizationView) {
      var cellDigest = await sha256Hex(message);
      var cellView = window.ArkAuthorizationView.scopedAuthorizationView({
        title: 'Sign quorum fulfillment request',
        description: 'This authorizes the agreement-fabric quorum to commit this transfer. Review exactly what this signs before approving.',
        requester: input.requesterId || who.publicKeyB64 || 'This identity',
        network: 'flux-mainnet',
        authority: 'agreement-fabric quorum',
        configuration: String(input.policyCid || ''),
        scope: 'cell-request',
        action: 'fabric.cell-request.sign',
        manifestDigest: cellDigest,
        claimStack: [
          'primary authorize fabric.cell-request.sign for exact manifest ' + cellDigest,
          'constraint requester ' + (input.requesterId || ''),
          'failure reject altered, expired or cross-registry bytes',
          'trust zero',
        ].join('\n'),
        manifest: body,
        authorizationBytes: message,
        actionPayloadBytes: message,
      });
      var cellApproved = await window.ArkUI.authorizationDialog.confirm(cellView, { action: 'fabric.cell-request.sign', capability: 'cell-request' });
      if (!cellApproved) throw new Error('Signing cancelled. No quorum fulfillment request was produced.');
    }
    var signature = await who.sign(message);
    var signed = Object.assign({}, body, { signature: signature });
    var canonicalBytes = stable(signed);
    var cid = await sha256Hex(canonicalBytes);
    return Object.freeze(Object.assign({}, signed, { cid: cid, canonicalBytes: canonicalBytes }));
  }

  window.ArkUI.fabricTransfer = {
    createValueObject: createValueObject,
    createTransferAgreement: createTransferAgreement,
    createFulfillment: createFulfillment,
    buildCellRequest: buildCellRequest,
  };
})();
