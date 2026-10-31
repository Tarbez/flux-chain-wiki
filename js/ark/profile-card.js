/* =====================================================================
   THE NFT CARD ON A PROFILE (DefxnProfileCard)
   ---------------------------------------------------------------------
   Shows a person's DEFXN card on their profile (/account). It draws what the NFT session built and owns none of it:
     the card   js/nft/card.js (DefxnCard.mount), the NFT session's renderer: 3D art, chrome, the record's words.
   The page builds the words and the card's seal around it (js/pages/account.js). Wearing the card's look is the seal's
   (js/nft/wear.js through DefxnSkinSite.sealIn), not this file's.

   No real card exists yet: no lookup from an FXN ID to a card is built (the owner's decision, a signed KASSET1-based
   record). So a card shows only for a review sample named in the address, ?skin-sample=27|263|512, the same sample
   the site's look takes. With none, nothing shows and nothing loads. Record 009 never shows: DefxnSkinSite.sample
   refuses it.

   DefxnProfileCard.fromAddress()   the sample named in the address ('27', '263' or '512'), or null.
   DefxnProfileCard.open(box, n)    draws sample n, or a real card's record, into box. Returns
     ready      a Promise of the card element; null if closed first; rejects naming what did not load.
     close()    removes the card (box is then exactly as it was) and frees its 3D renderer.

   Loading is DefxnSkinSite's: DefxnSkinSite.art() links the card's sheet and loads the mark, the recipe and
   js/nft/art3d.js in the NFT session's order (art3d.js loads the grammar renderer's card module itself, so the
   card needs the grammar renderer and no Three.js; tests/skin-site.cjs holds those cases). This file then asks DefxnSkinSite.sample(n) for the record and
   loads js/nft/card.js (ArkUI.loadScript). The sheet's path is written in DefxnSkinSite's call, so
   scripts/page-styles.mjs keeps it out of every route list.
   ===================================================================== */
var DefxnProfileCard = (function () {
  'use strict';

  /* n is a sample's number, or a real card's record (DefxnSkinSite.chainCard: the wearer's PVA, verified) */
  function needs(n) {
    var record = null;
    return DefxnSkinSite.art()
      .then(function () { return typeof n === 'object' && n ? n : DefxnSkinSite.sample(n); })
      .then(function (rec) { record = rec; return ArkUI.loadScript('js/nft/card.js'); })
      .then(function () { return record; });
  }

  function fromAddress() {
    var n = new URLSearchParams(location.search).get('skin-sample');
    return n && DefxnSkinSite.SAMPLES.indexOf(n) >= 0 ? n : null;
  }

  function open(box, n) {
    var alive = true, mounted = null;
    var ready = needs(n).then(function (rec) {
      if (!alive) return null;
      mounted = DefxnCard.mount(box, rec, { release: true });
      return mounted.ready;
    });
    return {
      ready: ready,
      close: function () {
        if (!alive) return;
        alive = false;
        if (mounted) mounted.unmount();
      }
    };
  }

  return { fromAddress: fromAddress, open: open };
})();
if (typeof module === 'object' && module.exports) module.exports = DefxnProfileCard;
