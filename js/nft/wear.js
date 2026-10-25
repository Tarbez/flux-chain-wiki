/* DEFXN identity card: a card the wearer HOLDS on a site (WEAR-AUDIT.md, loop 7: F5 F6 F7 F8 C11 J3).

   A wear is held on this device, for this site's address only: the browser keeps each address's storage apart.
   It is one FLX text, a DFXNWEAR1 line and then the card's skin package (js/nft/skin-package.js):
     DFXNWEAR1-N<genesis number>-M<hex name>-P<hex palette name>     a sample card
     DFXNWEAR1-O<64 hex object id>-M<hex name>-P<hex palette name>   a real card: its PVA on the chain (owner, 2026-10-25:
                                                                      a real card has no number, only its object id)
   decode() refuses a text it could not have written, and a wear whose card is not its package's card.
   A wear's title is "Card <number>" for a sample and "PVA <short id>" for a real card (DefxnWear.title).

   Why a site holds it this way: a copy of this site at another address cannot read this storage, so it cannot
   know which card you wear. Every real page can show your card before you sign in. That is a seal, not a proof.
   The proof of a site is its own key (dense-wire), and this does not replace it.

   DefxnWear.of(recipe, record)    a wear from a skin recipe (DefxnSkin.recipe) and the card's record
   DefxnWear.held()                the held wear { number, name, palette, text }, or null
   DefxnWear.restore(root)         wears the held card again, with no NFT engine and no 3D; null if none is held
   DefxnWear.tryOn(root, wear)     wears a card without holding it: a reload drops it
   DefxnWear.offer(root, wear)     asks first (Ark UI's confirm), then holds and wears: Promise of true or false.
                                   With no wear given, it offers the card being tried
   DefxnWear.takeOff(root)         forgets the held card and takes the skin off
   DefxnWear.accept(root, text)    a kept card's text from another address: refused unless this grammar wrote it,
                                   then offered with the same confirm (Promise of true or false)
   DefxnWear.stopTrying(root)      ends a try only: the card kept before it goes back on, if there is one
   DefxnWear.seal(host, root, o)   the identity zone's seal: the card's icon, its number and name, and its actions;
                                   o.actions false draws the icon and the number only (an account button).
                                   Returns { draw, remove }: remove() empties the host and stops redrawing it
   DefxnWear.use(site)             the site's one way to wear: { apply(root, packageText) -> Promise of { result,
                                   arrival }, remove(root), confirm(opts) -> Promise of true or false (optional) }. With it, every wear goes through the site's own path
                                   (its part table, locks, contrast rules and policy), and its arrival is the only
                                   one played. Without it, the package is worn directly (a site with no table).
   DefxnWear.worn()                the card that is on, tried or kept, with its package (for js/nft/card-components.js)
   DefxnWear.KEY                   the storage key ('defxn.wear'), so a site checks for a held card before it
                                   loads anything
   Each wearing call returns a Promise of { wear, result, arrival, kept } (kept: false when this device's
   storage is blocked, so the wear lasts until the page closes). Every change fires 'defxn:wear' on document.
   Needs Ark UI's skin layer (js/ark/vendor/ark-kit-skin.js), js/nft/timeline.js and js/nft/skin-package.js, and
   ArkKit (js/ark/vendor/ark-kit.js) for the confirm. A card is a sample (N) or the wearer's real PVA (O), read by js/ark/chain-cards.mjs. */
(function (root) {
  'use strict';
  if (root.DefxnWear) return;

  var KEY = 'defxn.wear';
  var HEX = /^(?:[0-9a-f]{2})*$/;
  function hex(s) { return Array.prototype.map.call(new TextEncoder().encode(String(s)), function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join(''); }
  function unhex(h) { var a = new Uint8Array(h.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return new TextDecoder().decode(a); }
  function pkg() {
    if (!root.DefxnSkinPackage) throw new Error('A wear needs js/nft/skin-package.js, and it is not loaded. Load it (and js/nft/timeline.js) first.');
    return root.DefxnSkinPackage;
  }

  /* ---------- the grammar ---------- */
  function title(wear) { return wear.object ? 'PVA ' + wear.object.slice(0, 6) + '…' + wear.object.slice(-4) : 'Card ' + wear.number; }
  function encode(wear) {
    var head;
    if (wear.object) {
      if (!/^[0-9a-f]{64}$/.test(wear.object)) throw new Error('A real card\'s wear needs its object id (64 lowercase hex). It got "' + wear.object + '".');
      head = 'O' + wear.object;
    } else {
      var n = String(wear.number);
      if (!/^[1-9][0-9]{0,8}$/.test(n)) throw new Error('A wear needs the card\'s genesis number (1 to 9 digits, no leading 0) or its object id. It got "' + n + '".');
      head = 'N' + n;
    }
    return 'DFXNWEAR1-' + head + '-M' + hex(wear.name || '') + '-P' + hex(wear.palette || '') + '\n' + wear.package;
  }
  function decode(text) {
    text = String(text);
    var cut = text.indexOf('\n'), head = cut < 0 ? text : text.slice(0, cut), boxes = head.split('-');
    if (boxes.length !== 4 || boxes[0] !== 'DFXNWEAR1' || !/^(?:N[1-9][0-9]{0,8}|O[0-9a-f]{64})$/.test(boxes[1]) || boxes[2][0] !== 'M' || !HEX.test(boxes[2].slice(1)) || boxes[3][0] !== 'P' || !HEX.test(boxes[3].slice(1)))
      throw new Error('A held wear starts with DFXNWEAR1-N<number> or -O<object id>, then -M<hex name>-P<hex palette>. This text does not, so this site did not write it.');
    var card = boxes[1][0] === 'O' ? { object: boxes[1].slice(1) } : { number: boxes[1].slice(1) };
    var wear = { number: card.number || null, object: card.object || null, name: unhex(boxes[2].slice(1)), palette: unhex(boxes[3].slice(1)), package: text.slice(cut + 1) };
    var data = pkg().decode(wear.package);
    var n = wear.object ? /(?:^|-)O([0-9a-f]{64})(?:-|$)/.exec(data.record || '') : /(?:^|-)N([1-9][0-9]*)(?:-|$)/.exec(data.record || '');
    if (!n || n[1] !== (wear.object || wear.number)) throw new Error('This held wear names ' + title(wear) + ', and its skin is ' + (n ? 'another card\'s' : 'no card\'s') + '. Wear the card again to replace it.');
    if (encode(wear) !== text) throw new Error('This held wear does not encode back to the same text, so this site did not write it. Wear the card again to replace it.');
    wear.text = text;
    return wear;
  }
  function of(recipe, record) {
    if (record.objectId) return { number: null, object: record.objectId, name: record.name || '', palette: recipe.palette || '', package: pkg().encode(recipe) };
    return { number: String(Number(record.genesisId)), object: null, name: record.name || '', palette: recipe.palette || '', package: pkg().encode(recipe) };
  }

  /* ---------- this device's storage (it may be blocked: then a wear lasts until the page closes) ---------- */
  function read() { try { return root.localStorage.getItem(KEY); } catch (e) { return null; } }
  function write(text) { try { if (text == null) root.localStorage.removeItem(KEY); else root.localStorage.setItem(KEY, text); return true; } catch (e) { return false; } }
  function held() {
    var text = read();
    if (!text) return null;
    try { return decode(text); } catch (e) {
      console.info('[defxn-wear] The held wear was dropped: ' + e.message);
      write(null);
      return null;
    }
  }

  /* ---------- wearing ---------- */
  var current = null;                          // what this page wears now: { wear, held }
  var site = null;                             // the site's own way to wear (use()), or null
  function use(hook) {
    if (hook && (typeof hook.apply !== 'function' || typeof hook.remove !== 'function')) throw new Error('DefxnWear.use needs { apply(root, packageText), remove(root) }. One of the two is missing.');
    if (hook && hook.confirm != null && typeof hook.confirm !== 'function') throw new Error('DefxnWear.use: confirm, when given, is a function (opts) -> Promise of true or false.');
    site = hook || null;
  }
  // the package worn directly, with its own arrival (a site with no part table of its own)
  function direct(rootEl, packageText) {
    if (!root.ArkKitSkin) return Promise.reject(new Error('A card cannot be worn here: Ark UI\'s skin layer (js/ark/vendor/ark-kit-skin.js) is not loaded. Load it first.'));
    if (root.ArkKitSkin.getArkSkin && root.ArkKitSkin.getArkSkin(rootEl)) root.ArkKitSkin.removeArkSkin(rootEl);
    return pkg().apply(rootEl, packageText, {}).then(function (res) {
      var arrival = res.arrival && root.DefxnTimeline
        ? root.DefxnTimeline.play(rootEl, { version: 1, tracks: res.arrival.tracks.filter(function (t) { return t.target !== 'art'; }) }).catch(function () { return null; })
        : Promise.resolve(null);
      return { result: res.result, arrival: arrival };
    });
  }
  function put(rootEl, wear, keep) {
    var text, data;
    try { text = wear.text || encode(wear); data = decode(text); }   // a wear is checked before it is worn, not only when it is read back
    catch (e) { return Promise.reject(e); }
    return Promise.resolve(site ? site.apply(rootEl, data.package) : direct(rootEl, data.package)).then(function (res) {
      var kept = keep ? write(text) : false;
      current = { wear: data, held: keep };
      notify(rootEl);
      return { wear: data, result: res && res.result, arrival: Promise.resolve(res && res.arrival), kept: kept };
    });
  }
  function restore(rootEl) { var w = held(); return w ? put(rootEl, w, true) : Promise.resolve(null); }
  function tryOn(rootEl, wear) { return put(rootEl, wear, false); }
  // the site's confirm when it gives one (a public page loads Ark UI's confirm on its own), else Ark UI's
  function confirmer() {
    if (site && site.confirm) return site.confirm;
    var K = root.ArkKit;
    return K && K.arkConfirm ? function (o) { return K.arkConfirm(o); } : null;
  }
  function offer(rootEl, wear) {
    wear = wear || (current && !current.held ? current.wear : null);   // no card given: the card being tried
    if (!wear) return Promise.reject(new Error('There is no card to keep: none was given and none is being tried. Try a card first.'));
    var ask = confirmer();
    if (!ask) return Promise.reject(new Error('A card is offered only with the wearer\'s yes, and no confirm is loaded. Load Ark UI\'s (js/ark/vendor/ark-kit.js), or give one to DefxnWear.use({ confirm }).'));
    return Promise.resolve(ask({
      title: 'Wear ' + title(wear) + ' on this site?',
      message: 'This site keeps your choice on this device. Every page here then shows ' + title(wear) + ' before you sign in.\n\n' +
        'A copy of this site at another address cannot see which card you wear. If a page that asks for your keys does not show your card, close it.\n\n' +
        (wear.object ? 'This is your PVA. Your browser checked it on the chain.' : 'This is a sample card. Nothing is live.'),
      confirmLabel: 'Wear it', cancelLabel: 'Not now'
    })).then(function (yes) { return yes ? put(rootEl, wear, true).then(function () { return true; }) : false; });
  }
  function bare(rootEl) {
    current = null;
    if (site) site.remove(rootEl);
    else if (root.ArkKitSkin && root.ArkKitSkin.getArkSkin && root.ArkKitSkin.getArkSkin(rootEl)) root.ArkKitSkin.removeArkSkin(rootEl);
    notify(rootEl);
  }
  // take off: forget the kept card, and take the skin off
  function takeOff(rootEl) { write(null); bare(rootEl); }
  /* a kept card that arrives from another address of the family (the identity broker carries its text): it is
     checked like any held text, then this address asks once before it keeps it, as every address does */
  function accept(rootEl, text) {
    var wear;
    try { wear = decode(text); } catch (e) { return Promise.reject(e); }
    return offer(rootEl, wear);
  }
  // stop trying: end the try only; a card kept before it goes back on
  function stopTrying(rootEl) {
    if (current && current.held) return Promise.resolve(null);
    return held() ? restore(rootEl) : Promise.resolve(bare(rootEl)).then(function () { return null; });
  }

  /* ---------- the seal, in an identity zone ---------- */
  var seals = [];
  // every change redraws the seals and tells the page once: document 'defxn:wear', detail DefxnWear.current
  function notify(rootEl) {
    seals.forEach(function (s) { s.draw(); });
    if (typeof CustomEvent !== 'undefined') document.dispatchEvent(new CustomEvent('defxn:wear', { detail: root.DefxnWear.current }));
  }
  var PLAIN = /^[^;{}<>\\]*$/;
  function seal(host, rootEl, opts) {
    var actions = !(opts && opts.actions === false), s = { draw: draw, remove: remove };
    seals.push(s);
    function remove() {
      var i = seals.indexOf(s);
      if (i >= 0) seals.splice(i, 1);
      host.textContent = '';
      host.hidden = true;
    }
    function button(label, on) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'ark-btn ark-btn--ghost defxn-seal__act'; b.textContent = label;
      b.addEventListener('click', on);
      return b;
    }
    function draw() {
      host.textContent = '';
      host.className = 'defxn-seal';
      if (!current) { host.hidden = true; return; }
      host.hidden = false;
      var w = current.wear, data = pkg().decode(w.package);
      // the card's own inks, so its icon draws in its colours wherever the zone sits
      Object.keys(data.tokens).forEach(function (k) { if (/^--w-[a-z0-9-]+$/.test(k) && PLAIN.test(data.tokens[k]) && !/url\(/i.test(data.tokens[k])) host.style.setProperty(k, data.tokens[k]); });
      var icon = data.chrome.icon, mark = document.createElement('span');
      mark.className = 'defxn-seal__mark'; mark.setAttribute('aria-hidden', 'true');
      var clean = icon && root.ArkKitSkin && root.ArkKitSkin.sanitizeArkSvg(icon.svg, 'seal-');
      if (clean && clean.ok) mark.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + (icon.viewBox || [0, 0, 30, 34]).join(' ') + '" focusable="false">' + clean.inner + '</svg>';
      var text = document.createElement('span');
      text.className = 'defxn-seal__text';
      var num = document.createElement('span'); num.className = 'defxn-seal__num'; num.textContent = title(w);
      var name = document.createElement('span'); name.className = 'defxn-seal__name'; name.textContent = (w.name || '') + (w.palette ? ' · ' + w.palette : '');
      text.appendChild(num); text.appendChild(name);
      host.appendChild(mark); host.appendChild(text);
      if (!actions) { name.hidden = true; host.classList.add('defxn-seal--mark'); }
      else {
        if (!current.held) host.appendChild(button('Wear it', function () { offer(rootEl, w); }));
        host.appendChild(current.held ? button('Take off', function () { takeOff(rootEl); }) : button('Stop trying', function () { stopTrying(rootEl); }));
      }
      host.setAttribute('aria-label', (current.held ? 'Wearing ' : 'Trying on ') + title(w) + (w.name ? ', ' + w.name : ''));
    }
    draw();
    return s;
  }

  root.DefxnWear = { KEY: KEY, title: title, encode: encode, decode: decode, of: of, held: held, use: use, restore: restore, tryOn: tryOn, offer: offer, accept: accept, takeOff: takeOff, stopTrying: stopTrying, seal: seal,
    get current() { return current ? { number: current.wear.number, object: current.wear.object, title: title(current.wear), name: current.wear.name, palette: current.wear.palette, held: current.held } : null; },
    // the card that is on, tried or kept, with its package: what a card component draws from (a copy)
    worn: function () { return current ? { number: current.wear.number, object: current.wear.object, title: title(current.wear), name: current.wear.name, palette: current.wear.palette, package: current.wear.package, held: current.held } : null; } };
})(typeof window !== 'undefined' ? window : globalThis);
