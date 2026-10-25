/* RESOLVER RBLOCK_CARD_SLOT_V1: a place the owner marked for the card a visitor wears (js/content/components.js, SITE).
   Prop: slot, the slot's FLX text (DFXNCOMP1, js/nft/card-components.js). No slot, or no card worn: the block is hidden and empty.
   It loads nothing until a card is on. Then DefxnSkinSite.cardComponents() brings card-components.js and DefxnCardComponents.fill()
   draws the card's banner, stamp or nameplate here. 'defxn:wear' puts it on and takes it off. One document listener serves every
   slot, and goes when the last slot goes: a slot is dropped when its page unmounts or it leaves the document (a Studio redraw).
   While editing (?preview) it shows a quiet note, so the owner can find and select it. */
(function () {
  'use strict';
  var slots = [], listening = false, hooked = false, q = new URLSearchParams(location.search), EDIT = q.has('preview') || q.has('cms-preview');
  function worn() { return !!(window.DefxnWear && window.DefxnWear.current); }
  function rest(s) {
    s.el.textContent = EDIT ? (s.text ? 'Card slot. A visitor who wears a card sees it here. You see this note only while editing.' : 'Card slot. Choose what the card makes here in the Library.') : '';
    s.el.hidden = !EDIT;
  }
  function drop(s) { if (s.fill) { s.fill.remove(); s.fill = null; } }
  function sync(s) {
    if (!worn()) { drop(s); rest(s); return; }
    if (!s.text || s.fill || s.busy) return;
    var cards = window.DefxnSkinSite && window.DefxnSkinSite.cardComponents;
    s.busy = true;
    (cards ? cards() : Promise.reject(new Error('DefxnSkinSite.cardComponents is not loaded'))).then(function (K) {
      s.busy = false;
      if (slots.indexOf(s) < 0 || !worn() || s.fill) return;
      s.el.textContent = '';
      s.fill = K.fill(s.el, s.text);
    }).catch(function (e) {
      s.busy = false; rest(s);
      console.error('The card slot did not fill (' + e.message + '). It needs slot text from the Card slot editor and js/nft/card-components.js. Edit it in DEFXN Studio, Library, Card slot.');
    });
  }
  function change() { prune(); slots.slice().forEach(sync); }
  function prune(page) {
    slots = slots.filter(function (s) { var gone = !s.el.isConnected || !!(page && page.contains(s.el)); if (gone) drop(s); return !gone; });
    if (!slots.length && listening) { document.removeEventListener('defxn:wear', change); listening = false; }
  }
  ArkUI.register('RBLOCK_CARD_SLOT_V1', {
    tag: 'div',
    attrs: function () { return { 'data-card-slot': '' }; },
    decorate: function (el) { el.hidden = true; },
    onMount: function (el, p) {
      var s = { el: el, text: typeof p.slot === 'string' ? p.slot : '', fill: null, busy: false };
      slots.push(s); prune();   /* after the push, so the one listener stays while a redraw swaps one slot for the next */
      if (!listening) { document.addEventListener('defxn:wear', change); listening = true; }
      if (!hooked && window.ArkUI.pageRouter) { hooked = true; ArkUI.pageRouter.onMount(function (page) { return function () { prune(page); }; }); }
      rest(s); sync(s);
    }
  });
})();
