/* =====================================================================
   FXN BALANCE + MESH CREDITS CLIENT
   ---------------------------------------------------------------------
   Talks to ark-miner-cli's new /directory/value-object*,
   /directory/transfer-agreement, /directory/fulfillment,
   /directory/value-objects/:ownerKeyFingerprint (FXN balance),
   /directory/credits-consumption-request, /directory/credits/:ownerPublicKey
   (Credits balance) routes -- see
   flx/flux-spec/spec/mesh-value-registries-v1.md for the design, and
   js/ark/fabric-transfer-browser.js / js/ark/ed25519-pem-browser.js for
   the record-signing bridge this builds on.

   Pre-genesis reality, stated plainly: FXN balances are honestly zero
   for everyone until a genesis authority is configured server-side
   (open governance question, not resolved by this client). Credits
   grants likewise need a configured issuer. This client does not
   pretend otherwise -- `getFxnBalance`/`getCreditsBalance` report
   exactly what the registry has, which today is nothing, for anyone.

   `follow` has no equivalent here any more than it does in
   mesh-directory-client.js -- there is no "browse other people's
   balances" surface, only this identity's own.
   ===================================================================== */
(function () {
  'use strict';
  window.ArkUI = window.ArkUI || {};

  var call = window.ArkUI.directoryTransport.call;
  var DEFAULT_BASE = window.ArkUI.directoryTransport.DEFAULT_BASE;
  var pemHelpers = window.ArkUI.ed25519Pem;
  var fabricTransfer = window.ArkUI.fabricTransfer;

  async function myOwnerKeyFingerprint(who) { return pemHelpers.ownerKeyFingerprint(who.publicKeyB64); }

  /* ---- FXN value-object registry ---------------------------------------- */

  /* { records: [...live value objects...], balancesByAsset: {FLX: "..."} } */
  async function getFxnBalance(who, base) {
    var fingerprint = await myOwnerKeyFingerprint(who);
    var result = await call(who, base, 'GET', '/directory/value-objects/' + encodeURIComponent(fingerprint));
    return { records: result.records || [], balancesByAsset: result.balancesByAsset || {} };
  }

  /* Transfer-agreements naming this identity as recipient, not yet
     fulfilled -- the reverse-discovery step a recipient needs before
     they can even know to publish an output object. */
  async function listIncomingFxnTransfers(who, base) {
    var fingerprint = await myOwnerKeyFingerprint(who);
    var result = await call(who, base, 'GET', '/directory/transfer-agreements-pending/' + encodeURIComponent(fingerprint));
    return result.records || [];
  }

  /* Step 1 of 3 (sender): propose sending `amount` of `inputRecord.asset`
     out of one of this identity's own live value objects (from
     getFxnBalance's `records`) to `recipientPublicKeyB64`. */
  async function proposeFxnTransfer(who, base, inputRecord, recipientPublicKeyB64, amount) {
    var recipientPublicKeyPem = pemHelpers.spkiPemFromRawPublicKeyB64(recipientPublicKeyB64);
    var agreement = await fabricTransfer.createTransferAgreement(who, {
      inputCid: inputRecord.cid,
      recipientId: recipientPublicKeyB64,
      recipientPublicKeyPem: recipientPublicKeyPem,
      asset: inputRecord.asset,
      amount: String(amount),
      nextSequence: inputRecord.sequence + 1,
    });
    await call(who, base, 'POST', '/directory/transfer-agreement/' + encodeURIComponent(agreement.cid), { record: agreement });
    return agreement;
  }

  /* Step 2 of 3 (recipient): having seen `agreement` via
     listIncomingFxnTransfers, publish the signed output object that
     proves this identity holds the named recipient key. Stored PENDING
     server-side until the sender's fulfillment (step 3) commits it. */
  async function acceptFxnTransfer(who, base, agreement) {
    var fingerprint = await myOwnerKeyFingerprint(who);
    var output = await fabricTransfer.createValueObject(who, {
      objectId: 'vo-' + agreement.cid.slice(0, 16),
      asset: agreement.asset,
      amount: agreement.amount,
      ownerId: who.identityId || who.publicKeyB64,
      sequence: agreement.nextSequence,
      predecessorCid: agreement.inputCid,
      agreementCid: agreement.cid,
    });
    await call(who, base, 'POST', '/directory/value-object/' + encodeURIComponent(fingerprint) + '/' + encodeURIComponent(output.objectId), { record: output });
    return output;
  }

  /* Step 3 of 3 (sender): once the recipient has published their output
     (poll with `pollForFulfillableOutput`), the sender builds and posts
     the fulfillment that actually moves the value. This is the real
     commit point server-side (double-spend-checked there). */
  /* Fulfillment is now quorum-gated server-side (ark-miner-cli's
     src/identity/http.js, agreement-fabric-relay.js): the miner relays
     this to a real Byzantine quorum before committing anything, and that
     relay needs a cellRequest signed by the SENDER's own key -- the miner
     never holds it ("browser signs, host holds no key"), so it has to be
     built here, not server-side. registryRoot/policyCid come from the
     miner's own GET /directory/fabric-health -- the browser has no direct
     reachability into the WireGuard-only quorum mesh itself. */
  async function fulfillFxnTransfer(who, base, agreement, output) {
    var fulfillment = await fabricTransfer.createFulfillment(who, {
      agreementCid: agreement.cid,
      inputCid: agreement.inputCid,
      outputCid: output.cid,
    });
    var health = await call(who, base, 'GET', '/directory/fabric-health');
    var cellRequest = await fabricTransfer.buildCellRequest(who, {
      predecessorCid: agreement.inputCid,
      successorCid: output.cid,
      nextSequence: output.sequence,
      registryRoot: health.registryRoot,
      policyCid: health.policyCid,
      requesterId: who.identityId || who.publicKeyB64,
    });
    await call(who, base, 'POST', '/directory/fulfillment/' + encodeURIComponent(fulfillment.cid), { record: fulfillment, cellRequest: cellRequest });
    return fulfillment;
  }

  /* Sender-side poll: null until the recipient has published their
     output object for this agreement (404 until then -- not an error). */
  async function pollForFulfillableOutput(who, base, agreement) {
    try { return (await call(who, base, 'GET', '/directory/value-object-pending-by-agreement/' + encodeURIComponent(agreement.cid))).record; }
    catch (error) { if (error.status === 404) return null; throw error; }
  }

  /* ---- Mesh Credits registry --------------------------------------------- */

  /* { balance: "300", grants: [...], consumed: [...] } */
  async function getCreditsBalance(who, base) {
    var result = await call(who, base, 'GET', '/directory/credits/' + encodeURIComponent(who.publicKeyB64));
    return { balance: result.balance || '0', grants: result.grants || [], consumed: result.consumed || [] };
  }

  function creditsConsumptionRequestSigningMessage(canonical) {
    var payload = {
      ownerPublicKey: canonical.ownerPublicKey, consumptionId: canonical.consumptionId,
      resolverPublicKey: canonical.resolverPublicKey, amount: canonical.amount,
      service: canonical.service, createdAt: canonical.createdAt, version: canonical.version,
    };
    return 'credits-consumption-request:' + JSON.stringify(payload);
  }

  /* Owner-signed, self-sovereign: authorizes a named resolver to consume
     up to `amount` credits for `service`. Does not move anything by
     itself -- only a matching resolver-signed receipt (which this
     client does not create; that's the resolver's own role) does. */
  async function requestCreditsConsumption(who, base, resolverPublicKeyB64, amount, service) {
    var consumptionId = 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    var canonical = {
      ownerPublicKey: who.publicKeyB64, consumptionId: consumptionId, resolverPublicKey: resolverPublicKeyB64,
      amount: String(amount), service: service || null, createdAt: new Date().toISOString(), version: 1,
    };
    var message = creditsConsumptionRequestSigningMessage(canonical);
    // Real scoped-authorization confirmation (js/ark/authorization-dialog.js)
    // before signing -- this used to sign and publish immediately on submit,
    // with nothing shown to the holder first.
    if (window.ArkUI.authorizationDialog && window.ArkAuthorizationView) {
      var creditsDigest = await window.ArkUI.ed25519Pem.sha256HexOfText(message);
      var creditsView = window.ArkAuthorizationView.scopedAuthorizationView({
        title: 'Authorize Credits consumption',
        description: 'This authorizes the named resolver to consume up to this amount of Credits for the stated purpose. It does not move anything by itself -- only a matching resolver-signed receipt does. Review before approving.',
        requester: who.publicKeyB64,
        network: 'flux-mainnet',
        authority: 'flux mesh Credits registry',
        configuration: 'credits-consumption-request/v' + canonical.version,
        scope: 'credits-consumption-request',
        action: 'credits.consumption.request',
        manifestDigest: creditsDigest,
        claimStack: [
          'primary authorize credits.consumption.request for exact manifest ' + creditsDigest,
          'constraint owner ' + who.publicKeyB64,
          'constraint resolver ' + resolverPublicKeyB64,
          'failure reject altered or replayed bytes',
          'trust zero',
        ].join('\n'),
        manifest: canonical,
        authorizationBytes: message,
        actionPayloadBytes: message,
        facts: [{ label: 'Amount', value: String(amount) }, { label: 'For', value: service || '(not specified)' }],
      });
      var creditsApproved = await window.ArkUI.authorizationDialog.confirm(creditsView, { action: 'credits.consumption.request', capability: 'credits-consumption-request' });
      if (!creditsApproved) throw new Error('Signing cancelled. No consumption request was produced.');
    }
    var signature = await who.sign(message);
    var record = Object.assign({}, canonical, { proof: { alg: 'Ed25519', sig: signature, signerPubkey: who.publicKeyB64 } });
    var path = '/directory/credits-consumption-request/' + encodeURIComponent(who.publicKeyB64) + '/' + encodeURIComponent(consumptionId);
    await call(who, base, 'POST', path, { record: record });
    return record;
  }

  window.ArkUI.valueRegistries = {
    DEFAULT_BASE: DEFAULT_BASE,
    myOwnerKeyFingerprint: myOwnerKeyFingerprint,
    getFxnBalance: getFxnBalance,
    listIncomingFxnTransfers: listIncomingFxnTransfers,
    proposeFxnTransfer: proposeFxnTransfer,
    acceptFxnTransfer: acceptFxnTransfer,
    fulfillFxnTransfer: fulfillFxnTransfer,
    pollForFulfillableOutput: pollForFulfillableOutput,
    getCreditsBalance: getCreditsBalance,
    requestCreditsConsumption: requestCreditsConsumption,
  };
})();
