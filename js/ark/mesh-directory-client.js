/* =====================================================================
   MESH IDENTITY DIRECTORY CLIENT (contacts & invites)
   ---------------------------------------------------------------------
   Talks directly to ark-miner-cli's `/identity/*` and `/directory/*` HTTP
   routes (src/identity/http.js) -- the real, reliable, Hypercore-backed
   directory chat.deadark.com itself now uses (its own GUN path for this
   was retired: a write could ack and then never be durably readable).
   No server-side proxy and no shared secret: every request signs a
   fresh, short-lived challenge with the caller's own Auth Kit key
   (`directory-auth.js`'s `ark-identity-http-v1` protocol), the same
   proof-of-possession model chat.deadark.com's own
   directoryChallengeHeaders.ts uses -- this file is a byte-for-byte
   mirror of that wire format, not a reinterpretation of it. Drift
   between the two would fail silently as a 401, never a helpful error,
   so anything here that touches signing MUST stay identical to that
   file and to src/identity/directory-auth.js's own
   `challengeMessage`/`verifySignedIdentityRequest`.

   RELATIONS: only `mute`, `block`, `invite` -- `follow` is deliberately
   absent from the mesh (see src/state/social-graph-validators.js's own
   header) and this file does not add a client for it. "Contacts" here
   means the two-sided `invite` lifecycle: pending -> accepted/declined,
   or revoked by the inviter -- never a one-sided follow graph.

   Every write needs the caller's identity already published to this same
   directory (`/identity/publish`) -- `publishIdentityProfile` below is
   the one-time step an Auth Kit identity takes before it can send or
   receive an invite; `ensurePublished` makes call sites not have to
   remember the ordering themselves.
   ===================================================================== */
(function () {
  'use strict';
  window.ArkUI = window.ArkUI || {};

  // Transport (challenge-signing, fetch, error shape) now lives in
  // js/ark/directory-transport.js, shared with value-registries-client.js --
  // load order matters, this file (and value-registries-client.js) must
  // come after it in catalog.js's scripts array. Byte-for-byte the same
  // wire format as the private copy this used to keep.
  var DEFAULT_BASE = window.ArkUI.directoryTransport.DEFAULT_BASE;
  var call = window.ArkUI.directoryTransport.call;

  /* ---- identity-profile/v1 (identities/{identityId}) -------------------- */

  function identityProfileSigningMessage(canonical) {
    var payload = {
      identityId: canonical.identityId,
      identityKind: canonical.identityKind,
      ownerPublicKey: canonical.ownerPublicKey,
      publicId: canonical.publicId,
      username: canonical.username,
      displayUsername: canonical.displayUsername,
      avatar: canonical.avatar,
      coverUrl: canonical.coverUrl,
      bio: canonical.bio,
      interests: canonical.interests,
      typographyPreferencesJson: canonical.typographyPreferencesJson,
      visibility: canonical.visibility,
      updatedAt: canonical.updatedAt,
      version: canonical.version,
    };
    return 'identity-profile:' + JSON.stringify(payload);
  }

  // Before this, publishing signed immediately with no confirmation step --
  // the one real gap this file's own header comment doesn't cover, since
  // identity publishing isn't a "write once you already hold a wallet/draft"
  // action the way fabric-transfer-browser.js's signedRecord() is. Mirrors
  // that same pattern: the real scoped-authorization dialog
  // (js/ark/authorization-dialog.js), shown before signing, not a
  // per-call-site copy.
  async function publishIdentityProfile(who, base) {
    var canonical = {
      identityId: who.identityId || who.publicKeyB64,
      identityKind: 'ghost',
      ownerPublicKey: who.publicKeyB64,
      publicId: who.identityId || who.publicKeyB64,
      username: null,
      displayUsername: who.displayName || null,
      avatar: null,
      coverUrl: null,
      bio: null,
      interests: null,
      typographyPreferencesJson: null,
      visibility: 'public',
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    var message = identityProfileSigningMessage(canonical);
    if (window.ArkUI.authorizationDialog && window.ArkAuthorizationView) {
      var messageDigest = await window.ArkUI.ed25519Pem.sha256HexOfText(message);
      var view = window.ArkAuthorizationView.scopedAuthorizationView({
        title: 'Publish identity to the mesh',
        description: 'Review exactly what this publishes to the public mesh identity directory before approving. Nothing is sent until you approve.',
        requester: who.displayName || who.identityId || who.publicKeyB64 || 'This identity',
        network: window.ArkUI.directoryTransport.NETWORK_ID,
        authority: 'flux mesh identity directory',
        configuration: 'identity-profile/v1',
        scope: 'identity.directory.publish',
        action: 'identity.directory.publish',
        manifestDigest: messageDigest,
        claimStack: [
          'primary authorize identity.directory.publish for exact manifest ' + messageDigest,
          'constraint owner ' + (who.publicKeyB64 || who.identityId || ''),
          'failure reject altered or replayed bytes',
          'trust zero',
        ].join('\n'),
        manifest: canonical,
        authorizationBytes: message,
        actionPayloadBytes: message,
        facts: [{ label: 'Visibility', value: canonical.visibility }],
      });
      var approved = await window.ArkUI.authorizationDialog.confirm(view, { action: 'identity.directory.publish', capability: 'identity-profile' });
      if (!approved) throw new Error('Publishing cancelled. No identity record was sent to the mesh.');
    }
    var signature = await who.sign(message);
    var record = Object.assign({}, canonical, { proof: { alg: 'Ed25519', sig: signature, signerPubkey: who.publicKeyB64 } });
    return call(who, base, 'POST', '/identity/publish', { record: record });
  }

  /* Real mesh-wide identity search (identityIndex.search, a prefix/substring
     scan over every published username) -- same signed-request gate as every
     other /identity/* route, so searching needs an unlocked identity too. */
  async function searchIdentities(who, query, base) {
    var trimmed = String(query || '').trim();
    if (!trimmed) return [];
    var excludeUsername = who.identityId || who.publicKeyB64;
    var path = '/identity/search?q=' + encodeURIComponent(trimmed) + '&excludeUsername=' + encodeURIComponent(excludeUsername) + '&limit=20';
    var result = await call(who, base, 'GET', path);
    return result.results || [];
  }

  async function getIdentityProfile(who, base, identityId) {
    try { return (await call(who, base, 'GET', '/identity/' + encodeURIComponent(identityId))); }
    catch (error) { if (error.status === 404) return null; throw error; }
  }

  /* Publishes this identity to the directory if it is not already there --
     every invite/accept call needs this, and nothing about it is ever
     surprising to a caller: publishing again just republishes the same
     profile under a fresh signature, so calling this unconditionally is
     always safe, just slightly wasteful on an already-published identity. */
  async function ensurePublished(who, base) {
    var existing = await getIdentityProfile(who, base, who.identityId || who.publicKeyB64);
    if (existing && existing.record) return existing.record;
    await publishIdentityProfile(who, base);
    return null;
  }

  /* ---- social-graph edges (mute/block/invite only -- never follow) ----- */

  function socialRelationshipSigningMessage(canonical) {
    var payload = {
      fromIdentityId: canonical.fromIdentityId,
      relation: canonical.relation,
      toIdentityId: canonical.toIdentityId,
      status: canonical.status,
      ownerPublicKey: canonical.ownerPublicKey,
      updatedAt: canonical.updatedAt,
      version: canonical.version,
    };
    return 'social-graph-edge:' + JSON.stringify(payload);
  }

  async function putSocialEdge(who, base, relation, toIdentityId, status) {
    var fromIdentityId = who.identityId || who.publicKeyB64;
    var canonical = {
      fromIdentityId: fromIdentityId,
      relation: relation,
      toIdentityId: toIdentityId,
      status: status,
      ownerPublicKey: who.publicKeyB64,
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    var signature = await who.sign(socialRelationshipSigningMessage(canonical));
    var record = Object.assign({}, canonical, { proof: { alg: 'Ed25519', sig: signature, signerPubkey: who.publicKeyB64 } });
    var path = '/directory/social-edge/' + encodeURIComponent(fromIdentityId) + '/' + encodeURIComponent(relation) + '/' + encodeURIComponent(toIdentityId);
    await call(who, base, 'POST', path, { record: record });
    return record;
  }

  /* Sends (or re-sends) an invite, then writes the reverse-discovery index
     entry the invitee's `listIncomingInvites` reads -- both steps, every
     time, matching the server's own "written alongside the edge itself by
     the caller" contract (src/identity/http.js). */
  async function sendInvite(who, toIdentityId, base) {
    await ensurePublished(who, base);
    var fromIdentityId = who.identityId || who.publicKeyB64;
    var edge = await putSocialEdge(who, base, 'invite', toIdentityId, 'pending');
    var indexPath = '/directory/contact-invite-index/' + encodeURIComponent(toIdentityId) + '/' + encodeURIComponent(fromIdentityId);
    await call(who, base, 'POST', indexPath, { record: { fromIdentityId: fromIdentityId, createdAt: edge.updatedAt } });
    return edge;
  }

  function withdrawInvite(who, toIdentityId, base) { return putSocialEdge(who, base, 'invite', toIdentityId, 'revoked'); }
  function acceptInvite(who, fromIdentityId, base) { return putSocialEdge(who, base, 'invite', fromIdentityId, 'accepted'); }
  function declineInvite(who, fromIdentityId, base) { return putSocialEdge(who, base, 'invite', fromIdentityId, 'declined'); }

  /* Every edge this identity has authored (sent invites, mutes, blocks). */
  async function listMyEdges(who, base) {
    var fromIdentityId = who.identityId || who.publicKeyB64;
    var result = await call(who, base, 'GET', '/directory/social-edge/' + encodeURIComponent(fromIdentityId));
    return result.records || [];
  }

  /* Pending invites addressed TO this identity (reverse discovery). */
  async function listIncomingInvites(who, base) {
    var toIdentityId = who.identityId || who.publicKeyB64;
    var result = await call(who, base, 'GET', '/directory/contact-invite-index/' + encodeURIComponent(toIdentityId));
    return result.records || [];
  }

  /* Combines both directions the same way ark-miner-cli's own
     resolveContactInviteState does -- never trust one signed edge alone,
     since neither party can unilaterally claim the other's consent. */
  async function resolveInviteState(who, otherIdentityId, base) {
    var fromIdentityId = who.identityId || who.publicKeyB64;
    var inviterEdge = null, inviteeEdge = null;
    try { inviterEdge = (await call(who, base, 'GET', '/directory/social-edge/' + encodeURIComponent(fromIdentityId) + '/invite/' + encodeURIComponent(otherIdentityId))).record; } catch (error) { if (error.status !== 404) throw error; }
    try { inviteeEdge = (await call(who, base, 'GET', '/directory/social-edge/' + encodeURIComponent(otherIdentityId) + '/invite/' + encodeURIComponent(fromIdentityId))).record; } catch (error) { if (error.status !== 404) throw error; }
    if (inviterEdge && inviterEdge.status === 'revoked') return 'revoked';
    if (inviteeEdge && inviteeEdge.status === 'declined') return 'declined';
    if (inviteeEdge && inviteeEdge.status === 'accepted' && inviterEdge && inviterEdge.status === 'pending') return 'accepted';
    if (inviterEdge && inviterEdge.status === 'pending') return 'pending';
    return 'none';
  }

  window.ArkUI.meshDirectory = {
    DEFAULT_BASE: DEFAULT_BASE,
    publishIdentityProfile: publishIdentityProfile,
    getIdentityProfile: getIdentityProfile,
    searchIdentities: searchIdentities,
    ensurePublished: ensurePublished,
    sendInvite: sendInvite,
    withdrawInvite: withdrawInvite,
    acceptInvite: acceptInvite,
    declineInvite: declineInvite,
    listMyEdges: listMyEdges,
    listIncomingInvites: listIncomingInvites,
    resolveInviteState: resolveInviteState,
  };
})();
