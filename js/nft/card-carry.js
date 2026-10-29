/* DEFXN identity card: a card CARRIED to another address by the identity broker (WEAR-AUDIT.md, J2).

   The broker (js/broker/broker.js, CARD) may answer getIdentityWithCard (js/ark/broker-client.js) with the card the
   wearer keeps on defxn.com: { object, record }, the PVA's object id and its DFXNCARD1 line (js/nft/card-record.js).
   It does that only after the person ticks "Show my card too" for this exact origin. The broker has no network, so
   it checks nothing on the chain. This file is where the receiving site checks it, against its OWN verified chain
   read (js/ark/chain-cards.mjs readChainCards: the one object verifier, run in this browser). Nothing the broker
   sends is worn: a card that passes comes back as a card record built from the chain read, and the site tries that
   on through its own path (skin-site.js tryRecord), then keeps it only after its own confirm (DefxnWear.offer).

   DefxnCardCarry.verify({ card, key, read, lib }) ->
     { kind: 'card', object, owner, cardRecord, skin: { id, skin } | null, notChecked }
     { kind: 'refused', failure, missing, remedy }      the refusal law: what failed, what is missing, the fix
       card   the broker's { object, record }
       key    the public id the broker shared (64 hex), the key the site read the chain for
       read   readChainCards({ key })'s result
       lib    { record: DefxnCardRecord, traits: DEFXN_TRAITS } (default: the page's globals)
   It checks, in this order: the PVA the chain holds for the key is this object; the record names this object and
   this key; the record's own mix is the one the object id draws (DEFXN_TRAITS.dnaOfObject); and the mix worn is
   the card's own or one skin this key owns on the chain now. Works in the browser (window.DefxnCardCarry) and in
   Node (lib passed in). Exports only; no top-level work. */
(function (root) {
  'use strict';
  if (root.DefxnCardCarry) return;

  var HEX64 = /^[0-9a-f]{64}$/;
  function refused(failure, missing, remedy) { return { kind: 'refused', failure: failure, missing: missing, remedy: remedy }; }
  function short(h) { return String(h).slice(0, 6) + '…' + String(h).slice(-4); }

  function verify(opts) {
    opts = opts || {};
    var card = opts.card, key = String(opts.key || '').toLowerCase(), read = opts.read, lib = opts.lib || {};
    var R = lib.record || root.DefxnCardRecord, T = lib.traits || root.DEFXN_TRAITS;
    if (!R || !T) return refused('This page cannot read a card record.', 'js/nft/traits.js and js/nft/card-record.js', 'load both, then check the card again');
    if (!card || !HEX64.test(card.object || '') || typeof card.record !== 'string') return refused('The broker sent no card this page can read.', 'a card as { object, record }', 'wear your card on defxn.com, then share it again');
    if (!HEX64.test(key)) return refused('No public id came with the card.', 'the public id the broker shared', 'sign in through the broker again');
    if (!read || read.kind !== 'cards') return refused('Your cards were not read from the chain' + (read && (read.detail || read.reason) ? ' (' + (read.detail || read.reason) + ')' : '') + '.', 'a verified chain read for your public id', 'check the network, then try again');
    if (read.key !== key) return refused('The chain read is for another key.', 'a chain read for ' + short(key), 'read the chain again for the shared public id');
    if (!read.pva) return refused('The chain holds no PVA for ' + short(key) + '.', 'a PVA on this public id', 'activate your PVA on /account, or switch to the network it is on');
    if (read.pva.id !== card.object) return refused('The broker sent PVA ' + short(card.object) + ', and the chain says this id\'s PVA is ' + short(read.pva.id) + '.', 'the PVA this public id holds', 'wear your own card on defxn.com, then share it again');
    var rec;
    try { rec = R.decode(card.record); } catch (e) { return refused('The card record does not read: ' + e.message, 'a DFXNCARD1 line this grammar wrote', 'wear your card again on defxn.com'); }
    if (rec.object !== card.object) return refused('The card record names another object.', 'a record for PVA ' + short(card.object), 'wear your card again on defxn.com');
    if (String(rec.identity || '').replace(/^0x/i, '').toLowerCase() !== key) return refused('The card record names another key.', 'a record for ' + short(key), 'share the public id the card belongs to');
    if (rec.genesis !== T.dnaOfObject(card.object)) return refused('The card record\'s own mix is not the one its object id draws.', 'the mix DEFXN_TRAITS.dnaOfObject draws for this PVA', 'wear your card again on defxn.com');
    var skin = null;
    if (rec.worn !== rec.genesis) {
      (read.skins || []).some(function (s) {
        var sk;
        try { sk = R.skin.fromPointer(s.pointer); } catch (e) { return false; }
        if (T.wear(rec.genesis, sk).dna !== rec.worn) return false;
        skin = { id: s.id, skin: sk };
        return true;
      });
      if (!skin) return refused('The card wears a skin this key does not own on the chain now.', 'a skin owned by ' + short(key), 'wear your PVA or one of your own skins on defxn.com, then share it again');
    }
    var cardRecord = T.objectRecord(read.pva, 'DEFXN');
    if (skin) cardRecord.skin = T.skinText(skin.skin);
    return { kind: 'card', object: card.object, owner: key, cardRecord: cardRecord, skin: skin, notChecked: [].concat(read.notChecked || []) };
  }

  root.DefxnCardCarry = { verify: verify };
})(typeof window !== 'undefined' ? window : globalThis);
