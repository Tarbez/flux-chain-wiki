/* =====================================================================
   THE NFT CARD ON A PROFILE (DefxnProfileCard)
   ---------------------------------------------------------------------
   Shows a person's DEFXN card on their profile (/account) and lets them wear its look across the site. It puts
   together what two other owners built, and owns neither:
     the card   js/nft/card.js (DefxnCard.mount), the NFT session's renderer: 3D art, chrome, the record's words.
     the look   js/ark/skin-site.js (DefxnSkinSite): the same record as an Ark UI skin on the whole site.
   The page builds the words and the switch around it (js/pages/account.js); this file draws the card into the box it
   is given and keeps the switch's state in step with the look.

   No real card exists yet: no lookup from an FXN ID to a card is built (the owner's decision, a signed KASSET1-based
   record). So a card shows only for a review sample named in the address, ?skin-sample=27|263|512, the same sample
   the site's look takes. With none, nothing shows and nothing loads. Record 009 never shows: DefxnSkinSite.sample
   refuses it.

   DefxnProfileCard.fromAddress()   the sample named in the address ('27', '263' or '512'), or null.
   DefxnProfileCard.open(box, n)    draws sample n into box. Returns
     ready      a Promise of the card element; null if closed first; rejects naming what did not load.
     wearing()  true while the site wears this card's look.
     wear(on)   puts the look on or takes it off (a Promise, DefxnSkinSite's).
     onChange(fn)  fn() after the look goes on or off, whoever did it (the `defxn:skin` event).
     close()    removes the card (box is then exactly as it was), frees its 3D renderer and stops listening.

   Loading is DefxnSkinSite's: DefxnSkinSite.art() links the card's sheet and loads the mark, three.js, the recipe and
   js/nft/art3d.js in the NFT session's order (the ring world's own tags are waited for, three.js is never loaded
   twice; tests/skin-site.cjs holds those cases). This file then asks DefxnSkinSite.sample(n) for the record and
   loads js/nft/card.js (ArkUI.loadScript). The sheet's path is written in DefxnSkinSite's call, so
   scripts/page-styles.mjs keeps it out of every route list.
   ===================================================================== */
var DefxnProfileCard = (function () {
  'use strict';

  function needs(n) {
    var record = null;
    return DefxnSkinSite.art()
      .then(function () { return DefxnSkinSite.sample(n); })
      .then(function (rec) { record = rec; return ArkUI.loadScript('js/nft/card.js'); })
      .then(function () { return record; });
  }

  function fromAddress() {
    var n = new URLSearchParams(location.search).get('skin-sample');
    return n && DefxnSkinSite.SAMPLES.indexOf(n) >= 0 ? n : null;
  }

  function open(box, n) {
    var alive = true, mounted = null, record = null, listeners = [];
    var ready = needs(n).then(function (rec) {
      if (!alive) return null;
      record = rec;
      mounted = DefxnCard.mount(box, rec, { release: true });
      return mounted.ready;
    });
    function changed() { listeners.forEach(function (fn) { fn(); }); }
    document.addEventListener('defxn:skin', changed);
    return {
      ready: ready,
      wearing: function () { return !!DefxnSkinSite.active(); },   /* the address names one sample, so the look on is this card's */
      wear: function (on) {
        if (!on) { DefxnSkinSite.remove(); return Promise.resolve(); }
        return ready.then(function () { return record ? DefxnSkinSite.apply(record) : null; });
      },
      onChange: function (fn) { listeners.push(fn); },
      close: function () {
        if (!alive) return;
        alive = false;
        document.removeEventListener('defxn:skin', changed);
        listeners.length = 0;
        if (mounted) mounted.unmount();
      }
    };
  }

  return { fromAddress: fromAddress, open: open };
})();
if (typeof module === 'object' && module.exports) module.exports = DefxnProfileCard;
