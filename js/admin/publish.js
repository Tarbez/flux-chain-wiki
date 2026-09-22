/* =====================================================================
   PUBLISH (admin page)
   ---------------------------------------------------------------------
   Publishing is three steps and the signed-in identity owns the middle one:

     prepare   POST the site to the local publish host, which encodes it as
               one .flx archive, adds it to the miner, and drafts the name
               record that would point the name at it.
     sign      HERE. The signed-in DeadArk identity (js/admin/auth.js, the
               same Auth Kit chat.deadark.com signs in with) signs the drafted
               record's signing message. Its key lives in a handle that never
               exposes the bytes; the host and the miner never receive it.
     publish   POST the signed record back; the host checks it and hands it
               to the miner's names/* registry.

   That identity's root public key IS the owner of subzero.ark: the registry
   accepts an update only from the key that holds the name. There is no other
   owner key: nothing here creates, stores, exports or imports one.

   Everything the outside world touches is a parameter (`env`), so a test can
   drive this file with a real identity and a real miner.
   ===================================================================== */
var ArkPublish = (function () {
  'use strict';

  function create(env) {
    env = env || {};
    var doFetch = env.fetch || function () { return globalThis.fetch.apply(globalThis, arguments); };
    var base = env.base || '';
    /* () -> { publicKeyB64, displayName, sign(text) -> Promise<signatureB64> } | null */
    var identity = env.identity || function () { return null; };

    function signInRefusal() {
      var error = new Error('Sign in first: publishing is signed with your DeadArk identity, and no one is signed in.');
      error.detail = { ok: false, remedy: 'Open the Mesh panel and choose your recovery file (.auth.flx).' };
      return error;
    }

    async function api(path, body) {
      var init = body === undefined ? { method: 'GET' } : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
      var response;
      try { response = await doFetch(base + path, init); }
      catch (e) { throw new Error('Cannot reach the publish host. Run: node scripts/publish-host.mjs, then open the page it prints (not the file directly).'); }
      var data = await response.json().catch(function () { return { ok: false, error: 'The publish host sent something that is not JSON.' }; });
      if (!response.ok || !data.ok) { var error = new Error(data.error || ('The publish host refused (' + response.status + ').')); error.detail = data; throw error; }
      return data;
    }

    /* site: { manifests: [...], articles: [{...index, sections, numbers}], assets: [{id, label, mime, dataBase64}] } */
    async function publishSite(site, progress, confirmRemoval) {
      var say = progress || function () {};
      var who = identity();
      if (!who) throw signInRefusal();
      say('Encoding the site and adding it to the miner...');
      var prepared = await api('/api/prepare', { site: site, ownerPublicKey: who.publicKeyB64 });
      if (prepared.unchanged) return { unchanged: true, version: prepared.currentVersion, cid: prepared.cid };
      /* removes is null when the published version could not be read to compare; treat that as worth asking about too */
      var removes = prepared.removes;
      var removing = !removes || removes.manifests.length || removes.articles.length || removes.assets.length;
      if (removing && confirmRemoval && !(await confirmRemoval(removes))) return { cancelled: true, removes: removes };
      /* the identity may have signed out while the person read the prompt */
      who = identity();
      if (!who || who.publicKeyB64 !== prepared.record.ownerPublicKey) throw signInRefusal();
      say('Signing version ' + prepared.record.version + ' as ' + (who.displayName || 'your identity') + '...');
      var record = Object.assign({}, prepared.record, { proof: { alg: 'Ed25519', sig: await who.sign(prepared.signingMessage) } });
      say('Publishing to the name registry...');
      var result = await api('/api/publish', { record: record });
      return Object.assign({ unchanged: false, byteLength: prepared.byteLength }, result);
    }

    return {
      publishSite: publishSite,
      identity: identity,
      status: function () { return api('/api/status'); },
      pullSite: function () { return api('/api/site'); }
    };
  }

  return { create: create };
})();
