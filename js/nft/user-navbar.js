/* DEFXN identity card: the USER NAVBAR (the owner's goal: "the navbar becomes the user's navbar, holding the site in it").

   When the wearer has a card on, the site's bar becomes the wearer's bar. The site keeps its brand, its links, their
   words and their order: those are the site's claims. The bar gains ONE control, the wearer's seal (the card's icon
   and number, js/nft/wear.js). It opens the wearer's menu, which holds the rest as rows:
     the card      which card is on, and whether this device keeps it
     the site check whether the wearer's own browser verified this page's name (js/nft/site-check.js)
     the actions   wear it, stop trying, take off; try the wearer's own skins (from the chain); and, on review
                   pages only, try a sample
   Agreed with the site session (2026-10-24): one control in the bar, the bar still fits 1280x720 and 1440x900 on one
   row, phones show the icon only, and the menu is an Ark UI popover loaded on the first press, through the header's
   own lazy popover helper. So this file builds the trigger, a plain panel and the rows, and hands them to
   opts.popover(spec) when the site gives it. With no helper (a design page), the plain panel opens and closes by its
   button. While a card is on, opts.nav carries data-defxn-user="on" (css/nft-card.css: the card's strong border under it).

   DefxnUserNav.mount(host, root, opts) -> { remove() }
     host   the element the site gives (header.js's .header-user-zone); never found by this file
     root   the element the skin goes on (the same root the site gives DefxnWear)
     opts   { nav, name (from the names system), check (resolveName, bound by the site), reports (the site's scam
              report read, DefxnSiteCheck's reports(name); absent until the site has the shared verifier),
              popover(spec) -> a controller (the header's lazyHeaderPopover; spec = { wrap, trigger, fallback, label,
              align, id, content }), samples: [{ number, label, wear: () -> Promise of a wear }] (review only; each row reads "Try sample <label>"),
              cards: () -> Promise of [{ label, wear: () -> Promise }] (the wearer's own PVA and skins, read from the
              chain by the site; each wear() tries that card on),
              pieces: () -> Promise of [{ layer, name, href }] (the card's pieces, each a link to its shop item; asked
              when the list opens: WEAR-AUDIT F9), picture: (host) -> Promise of { remove() } (draws the card's logo art
              into host; asked once the menu shows: D5) }
   Needs js/nft/wear.js and js/nft/site-check.js. */
(function (root) {
  'use strict';
  if (root.DefxnUserNav) return;

  function mount(host, rootEl, opts) {
    opts = opts || {};
    var W = root.DefxnWear, C = root.DefxnSiteCheck;
    if (!W || !C) throw new Error('The user navbar needs js/nft/wear.js and js/nft/site-check.js. Load both first.');
    var id = 'defxn-user-menu-' + Math.random().toString(36).slice(2, 8);
    var wrap = document.createElement('span'), trigger = document.createElement('button'), panel = document.createElement('div'), rows = document.createElement('div');
    wrap.className = 'defxn-user';
    trigger.type = 'button'; trigger.className = 'defxn-user__btn';
    trigger.setAttribute('aria-expanded', 'false'); trigger.setAttribute('aria-controls', id); trigger.setAttribute('aria-haspopup', 'true');
    panel.className = 'defxn-user__list'; panel.id = id; panel.hidden = true;
    rows.className = 'defxn-user__rows';
    panel.appendChild(rows); wrap.appendChild(trigger); wrap.appendChild(panel); host.appendChild(wrap);
    host.hidden = false;
    var seal = W.seal(trigger.appendChild(document.createElement('span')), rootEl, { actions: false });
    // the button's name is a child, so it moves with the children when the site swaps in Ark UI's popover button
    var said = trigger.appendChild(document.createElement('span'));
    said.className = 'ark-visually-hidden';
    // with no card on (a review page with samples), the button needs words of its own
    var bare = trigger.appendChild(document.createElement('span'));
    bare.className = 'defxn-user__bare';
    var check = null;

    function act(label, run, main) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'defxn-user__act' + (main ? ' defxn-user__act--main' : ''); b.textContent = label;
      b.addEventListener('click', function () { Promise.resolve().then(run).catch(function (e) { console.error('[defxn-user] ' + label + ' did not finish: ' + e.message); }); });
      return b;
    }
    function draw() {
      var c = W.current;
      if (opts.nav) { if (c) opts.nav.setAttribute('data-defxn-user', 'on'); else opts.nav.removeAttribute('data-defxn-user'); }
      said.textContent = c ? (c.held ? 'Your card, ' : 'Trying ') + c.title + '. Your menu' : '';
      bare.textContent = c ? '' : 'Try a card';
      bare.hidden = !!c;
      if (check) check.remove();
      rows.textContent = '';
      var who = document.createElement('p'); who.className = 'defxn-user__who';
      who.textContent = c ? c.title + (c.name ? ', ' + c.name : '') + (c.palette ? ' · ' + c.palette : '') + (c.held ? '. This device keeps it.' : '. A reload drops it.')
        : 'No card is on. Try one first. Nothing is kept until you say yes.';
      if (art) { art.remove(); art = null; }
      if (c && typeof opts.picture === 'function') {
        // the card's logo art beside its name, in the wearer's own zone; drawn only once the menu shows (it loads the 3D engine)
        var head = document.createElement('div'), face = document.createElement('span');
        head.className = 'defxn-user__card'; face.className = 'defxn-user__art'; face.setAttribute('aria-hidden', 'true');
        head.appendChild(face); head.appendChild(who); rows.appendChild(head);
        art = whenShown(face, function () { return opts.picture(face); });
      } else rows.appendChild(who);
      check = C.row(rows, { name: opts.name, check: opts.check, reports: opts.reports });
      var acts = document.createElement('div'); acts.className = 'defxn-user__acts';
      if (c && !c.held) acts.appendChild(act('Wear it', function () { return W.offer(rootEl); }, true));   // the menu's one main action
      if (c) acts.appendChild(c.held ? act('Take off', function () { W.takeOff(rootEl); }) : act('Stop trying', function () { return W.stopTrying(rootEl); }));
      (opts.samples || []).forEach(function (s) {
        if (c && String(c.number) === String(Number(s.number))) return;
        var sb = acts.appendChild(act('Try sample ' + s.label, function () { return s.wear().then(function (w) { return W.tryOn(rootEl, w); }); }));
        sb.setAttribute('data-defxn-sample', '');
      });
      rows.appendChild(acts);
      if (c && typeof opts.pieces === 'function') rows.appendChild(piecesList());
      // the wearer's own skins arrive from the chain after the menu draws; a later redraw drops a late answer
      if (typeof opts.cards === 'function') {
        var drawn = ++drawCount;
        Promise.resolve().then(opts.cards).then(function (list) {
          if (drawn !== drawCount) return;
          // real cards go before the samples: a sample is the fallback, and its row says so ("Try sample ...")
          var first = acts.querySelector('[data-defxn-sample]');
          (list || []).forEach(function (card) { acts.insertBefore(act('Try ' + card.label, card.wear), first); });
        }, function (e) { console.info('[defxn-user] Your skins did not load: ' + e.message); });
      }
    }
    var drawCount = 0, art = null;
    /* run(host) once host is on screen (the menu opened); remove() stops the wait or takes the drawing away */
    function whenShown(host, run) {
      var made = null, gone = false, io = null;
      function go() { if (io) io.disconnect(); io = null; Promise.resolve().then(run).then(function (m) { if (gone && m && m.remove) m.remove(); else made = m; }, function (e) { console.info('[defxn-user] The card\'s art did not draw: ' + e.message); }); }
      if (typeof IntersectionObserver === 'function') { io = new IntersectionObserver(function (es) { if (es.some(function (x) { return x.isIntersecting; })) go(); }); io.observe(host); } else go();
      return { remove: function () { gone = true; if (io) io.disconnect(); if (made && made.remove) made.remove(); } };
    }
    /* the card's pieces: a closed list that asks for them on first open, each row a link to that piece in the shop */
    function piecesList() {
      var box = document.createElement('details'), sum = document.createElement('summary'), list = document.createElement('ul'), asked = false;
      box.className = 'defxn-user__pieces'; sum.textContent = 'Your card\u2019s pieces in the shop';
      box.appendChild(sum); box.appendChild(list);
      box.addEventListener('toggle', function () {
        if (!box.open || asked) return;
        asked = true;
        Promise.resolve().then(opts.pieces).then(function (items) {
          (items || []).forEach(function (p) {
            var li = document.createElement('li'), a = document.createElement('a'), kind = document.createElement('span');
            a.href = p.href; kind.textContent = p.layer; a.appendChild(kind); a.appendChild(document.createTextNode(p.name));
            li.appendChild(a); list.appendChild(li);
          });
          if (!items || !items.length) { var none = document.createElement('li'); none.textContent = 'This card names no pieces to list.'; list.appendChild(none); }
        }, function (e) {
          asked = false;
          var li = document.createElement('li'); li.textContent = 'The pieces did not load: ' + e.message + '. Close the list and open it again to retry.'; list.textContent = ''; list.appendChild(li);
        });
      });
      return box;
    }
    var pop = null;
    if (typeof opts.popover === 'function') pop = opts.popover({ wrap: wrap, trigger: trigger, fallback: panel, label: 'Your card', align: 'end', id: id, content: [rows] });
    else {
      trigger.addEventListener('click', function () { var open = panel.hidden; panel.hidden = !open; trigger.setAttribute('aria-expanded', String(open)); });
      wrap.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { panel.hidden = true; trigger.setAttribute('aria-expanded', 'false'); trigger.focus(); } });
    }
    document.addEventListener('defxn:wear', draw);
    draw();
    return {
      remove: function () {
        document.removeEventListener('defxn:wear', draw);
        seal.remove(); if (check) check.remove(); if (art) art.remove();
        if (pop && pop.want) pop.want(false);
        if (opts.nav) opts.nav.removeAttribute('data-defxn-user');
        var top = wrap.isConnected ? wrap : host.querySelector('.defxn-user');
        if (top && top.parentNode) top.parentNode.removeChild(top);
        host.hidden = true;
      }
    };
  }

  root.DefxnUserNav = { mount: mount };
})(typeof window !== 'undefined' ? window : globalThis);
