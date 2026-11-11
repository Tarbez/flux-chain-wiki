/* /fxn/<slug>: one topic of the portal ring (owner, 2026-11-09, design P05; phase 2 layout in docs/design/space/p05-upgrade/ART-DIRECTOR.md).
   Layer: app (the site). ONE template for all twelve topics: the row comes from js/content/topics.js (ArkTopics), the order and routes
   from js/content/site-pages.js TOPICS, and the name, what you do, what you get back and status are the ring's own words
   (HOME.LANDING.RING / ABILITY), so the stone and its page say the same thing. docs/design/space/SPACE.md "Portal navigation (P05)"
   holds the page map; the phase 2 reduction test is in ART-DIRECTOR.md.

   THE OBJECT (2026-11-11: the ring menu and its emblem flight left the site, so a topic page is reached by a plain navigation from
   the top bar's menus and the object simply appears). The object is the topic's MAIN object (the record line, the bridge span), whole
   and in place; the small emblem that used to fly in from the ring is never shown (owner, 2026-11-11; js/ark/stage.js "The MAIN
   object, never the emblem"). This page makes NO iframe. The object is drawn by the stage (ArkUI.stage,
   js/ark/stage.js). This page only says where the object stands: THE SLOT, the contract shared by all three lanes: centre x 70%, y 48%
   of the viewport, height 52% of the viewport height, width equal to the height, the same fractions at 1280x720 and 1440x900. The
   stage puts the object into it (stage.open) and posts its box; this page checks the box against the slot (the object centred in it
   and its longer side filling it, within 8 px: stage.miss) and logs a miss instead of trusting it.

   Layout (css/world-pages.css "topic page"; owner, 2026-11-11: "follow the same UI as the new home page"): the home's hero, part for
   part, in the home's own classes. Left, on the home's margin: the status as the pill, the name as the headline, what it is as the
   18 line, the filled button and the outlined one, then three feature items (what you do, what you get back, speed); "How it works"
   opens the steps in the items' place. Right: the object in the slot, on two mint floor ellipses. At the foot: the home's rounded
   bar (this topic's status, then the network's figures) and the chip row of the twelve topics (ArkTopics.jumpBar). Nothing scrolls
   at 1280x720 or 1440x900. Speed numbers come only from ArkUI.speedFacts (js/content/speed-facts.js); a topic with none says "Not
   measured yet", never 0. The words never wait for the stage: they come in one after another at once (css/motion.css) and the object
   joins when the 3D view has drawn it.

   REDUCTION TEST (docs/PRODUCT-DESIGN-LAWS.md)
   1 About: one topic of FXN: what it is, what you do, what you get back, its status.
   2 Dominant action: the one filled button: the topic's own action, or "How it works" where it has none.
   3 Know now: the name, the status, the one line that says what it is.
   4 Hidden until asked: the steps ("How it works"), the other eleven topics (the chip row).
   5 Repeated elsewhere: the status, in the pill and as the bar's lead; the network figures are the home's.
   6 Only because the data has it: the bar's four network figures, all TBA today.
   7 Removable: the bar's network figures, until one has a source.
   8 Leaving keeps state: nothing to keep; "How it works" opens closed on return.
   9 Returning: the Back button finds the page with its object in the slot.
   10 If the 3D is missing: the slot says what failed and what to do; the words, the bar and the chips stand. */
(function () {
  'use strict';
  function node(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }
  function link(key, className, text, query) {
    var a = node('a', className, text);
    var entry = ArkUI.pageCatalog[key];
    a.href = (entry ? entry.path : '/') + (query ? '?' + query : '');
    a.setAttribute('data-scene-link', key);
    if (query) a.dataset.routeQuery = query;
    return a;
  }
  /* where the 3D comes from is the stage's to say (js/ark/stage.js ready: the site's bundled view, or the studio in local development). The game's own
     page is the studio's, so its link works only where the studio is the source */
  /* the page's own words (labels, tabs, refusals): HOME.LANDING.TOPIC.* in js/content/manifests/home.js */
  function word(key) { return ArkCopy.text('HOME.LANDING.TOPIC.' + key); }
  function has3d() { var st = ArkUI.stage; return st && st.ready ? st.ready : Promise.resolve(false); }
  function studioIsSource() { return !!(ArkUI.stage && ArkUI.stage.source === 'studio'); }

  /* THE SLOT: the object's rectangle on this page, in viewport px (the contract above). One function, read by this page and by the
     motion lane (ArkUI.topicSlot), so the two never hold two copies of the numbers. */
  var SLOT = { cx: .70, cy: .48, h: .52 };
  function slotRect() {
    var h = Math.round(innerHeight * SLOT.h);
    return { x: Math.round(innerWidth * SLOT.cx - h / 2), y: Math.round(innerHeight * SLOT.cy - h / 2), w: h, h: h };
  }
  ArkUI.topicSlot = slotRect;

  /* THE FLOOR: the home's two thin mint ellipses, under the slot, so the object stands on something. Layer: app. It is a drawing in the page,
     not in the 3D: the page paints over the stage, so the rings' front halves cross in front of the object's foot, and their back halves are
     drawn only outside the slot's width (the gradient), where the object does not stand, and so read as passing behind it. FLOOR: the outer
     ring's width in slot heights, the rings' height as a share of their width (the home's rings measure .17), and how far above the slot's foot
     their centre stands, in slot heights. The inner ring is 1.02 slot heights wide, as the home's inner ring is to its portal. No pointer events. */
  var FLOOR = { w: 1.4, flat: .17, lift: .11 }, floorCount = 0;
  function floorRings() {
    var NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'), id = 'topic-floor-back-' + (++floorCount);
    function make(tag, attrs) { var e = document.createElementNS(NS, tag); Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); }); return e; }
    svg.setAttribute('class', 'topic-floor'); svg.setAttribute('viewBox', '0 0 1000 170'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
    var grad = make('linearGradient', { id: id, gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: 1000, y2: 0 });
    [[0, 1], [.1, 1], [.17, 0], [.83, 0], [.9, 1], [1, 1]].forEach(function (s) { grad.appendChild(make('stop', { offset: s[0], 'stop-opacity': s[1] })); });
    var defs = make('defs', {}); defs.appendChild(grad); svg.appendChild(defs);
    [[498, 83, 'outer'], [364, 62, 'inner']].forEach(function (r) {
      var x0 = 500 - r[0], x1 = 500 + r[0], arc = 'M' + x0 + ' 85A' + r[0] + ' ' + r[1] + ' 0 0 ';
      svg.appendChild(make('path', { 'class': 'topic-floor-back ' + r[2], d: arc + '1 ' + x1 + ' 85', stroke: 'url(#' + id + ')' }));
      svg.appendChild(make('path', { 'class': 'topic-floor-front ' + r[2], d: arc + '0 ' + x1 + ' 85' }));
    });
    return svg;
  }

  /* a speed row: the action at 11 mono, the value at 29 with its unit, the stat, one line of conditions (the whole text is the title),
     and the source as its heading (the path is the title: internal language stays internal). */
  function speedRow(r) {
    var row = node('div', 'topic-speed-row');
    var big = node('p', 'topic-speed-big');
    big.append(node('span', 'topic-speed-value', String(r.value)), node('span', 'topic-speed-unit', ' ' + (r.unit || '')));
    row.append(node('p', 'topic-speed-action', r.action || ''), big);
    if (r.stat) row.appendChild(node('p', 'topic-speed-stat', r.stat));
    var c = node('p', 'topic-speed-cond', [r.conditions, r.device, r.status, r.date].filter(Boolean).join(' · ')); c.title = c.textContent; row.appendChild(c);
    if (r.source) {
      var s = node('a', 'topic-speed-source', 'Source: ' + (r.heading || r.source)); s.title = r.source;
      if (/^https?:/.test(r.source)) s.href = r.source; else s.setAttribute('role', 'text');
      row.appendChild(s);
    }
    return row;
  }
  function notMeasuredRow(r) {
    var row = node('div', 'topic-speed-row is-absent');
    row.append(node('p', 'topic-speed-action', r.action || ''), node('p', 'topic-speed-none', word('SPEED.ROW.NONE')), node('p', 'topic-speed-cond', r.why || ''));
    if (r.toMeasure) row.appendChild(node('p', 'topic-speed-cond', word('SPEED.MEASURE') + ' ' + r.toMeasure));
    return row;
  }
  /* fills the Speed panel with the devnet release's own measurements (owner, 2026-11-10) and answers how many it drew. With none it draws nothing:
     the page then shows no Speed tab at all (audit F14: an empty tab stood open on eleven pages) */
  function fillSpeed(box, slug, limit) {
    box.textContent = '';
    var rows = ArkTopics.speedFor(slug).rows.map(speedRow);
    rows.slice(0, limit || rows.length).forEach(function (r) { box.appendChild(r); });
    return rows.length;
  }

  /* THE LIVE LINE (owner, 2026-11-10: "no manual hard data"): a topic's numbers are read from a node on the devnet release
     (js/ark/chain-facts.mjs, loaded through ArkUI.loadChainFacts in js/hero-motion.js), never typed. No answer reads
     "No node answered", with the reason in the title; never 0. `kind` is the row's `live` (js/content/topics.js). */
  var LIVE = {
    launch: { read: 'launchTerms', none: 'Launch fee and stake: No node answered.',
      say: function (v) { return 'Read from the chain now: launch fee ' + v.fee + ' FXN, stake ' + v.stake + ' FXN.'; } },
    multisig: { read: 'rulesMultisig', none: 'Signers needed: No node answered.',
      say: function (v) { return v.genesisKey ? 'Rules are changed by the genesis key until the parameter DAO is filed.' : 'Read from the chain now: ' + v.k + ' of ' + v.n + ' keys of ' + v.dao + ' must sign.'; },
      cite: function (v) { return v.genesisKey ? 'NETPARAMS: paramdao is not filed (' + (v.source || 'unset') + '). ' : 'NETPARAMS paramdao, then DAO_COUNCIL ' + v.dao + '. '; } },
    pinners: { read: 'pinnersHeard', none: 'Named pinners: No node answered.',
      say: function (v) { return 'Read from the chain now: this node\'s keeper has heard from ' + v.pinners + ' named pinners.'; } }
  };
  function liveLine(box, kind) {
    var L = LIVE[kind], p = node('p', 'topic-live mono', 'Reading the chain…'); box.appendChild(p);
    if (!L || !ArkUI.loadChainFacts) { p.textContent = L ? L.none : 'No node answered.'; p.title = 'The chain reader is not on this page.'; return; }
    ArkUI.loadChainFacts().then(function (m) { return m[L.read](); }).then(function (r) {
      if (r.absent) { p.textContent = L.none; p.title = r.absent; return; }
      p.textContent = L.say(r.value); p.title = (L.cite ? L.cite(r.value) : '') + 'Protocol ' + r.release.protocol + ' of ' + r.release.network + ', founding ' + r.release.founding.slice(0, 12) + '.';
    }, function (error) { p.textContent = L.none; p.title = 'The chain reader did not load: ' + (error && error.message || 'no reason given') + '.'; });
  }

  /* what the slot says when no object can stand in it: what failed, what is missing, what to do (copy law 11) */
  function refuse(slot, text) {
    slot.classList.add('is-empty'); slot.textContent = '';
    slot.appendChild(node('p', 'topic-object-none', text));
  }

  /* THE GATE's words and timing (see mount). G: the row's gate words and entry (js/content/topics.js). refused(): the slot shows a refusal.
     Returns { go, why, open, play }: the filled button and the line under the buttons, which mount puts into the topic template (the question is
     the template's headline; the way back is the Home chip in the chip row, where it stands on every topic page).
     play(): the gate stands in the slot, so its GATE_OPEN starts (mount calls it when the stage has placed the object).
     The question waits hidden until the object's GATE_OPEN has held ('gate:open'); an object with no GATE_OPEN
     answers held with missing, which opens the words the same way, and 12 s with no answer opens them anyway (the page never waits for good). */
  function gatePage(page, G, refused) {
    var st = ArkUI.stage;
    var go = node('a', 'intro-portal-enter topic-action gate-go', G.go);
    var why = node('p', 'gate-why'); why.hidden = true;
    /* "Start playing" goes to the game's own page; when it cannot, the button says what failed, what is missing and what to do (copy law 11) */
    function cannot(text) { go.removeAttribute('href'); go.setAttribute('aria-disabled', 'true'); go.classList.add('is-refused'); why.textContent = text; why.hidden = false; }
    /* the game's page is the studio's own (js/content/topics.js gate.entry): the link is set only where the studio is this page's 3D source. Anywhere
       else the button is off and says why (audit F13: it linked to 127.0.0.1 on every host) */
    /* 2026-11-11: gate.entry is a path, and the studio's address comes from the stage (ArkUI.stage.origin), so no studio address is typed in the content */
    has3d().then(function () { if (studioIsSource() && ArkUI.stage.origin) go.href = ArkUI.stage.origin + G.entry; else cannot(word('GAME.ABSENT')); });
    /* the studio that serves the game also draws the gate (the site's CSP lets no page fetch it), so a slot refusal means the game cannot open either */
    var opened = false, subs = [];
    function open() {
      if (opened) return; opened = true; clearTimeout(fallback);
      if (studioIsSource() && refused()) cannot(word('GAME.SILENT'));
      page.classList.add('gate-open');
    }
    var fallback = setTimeout(open, 12000);
    if (st && typeof st.on === 'function') subs.push(st.on('held', function (h, from) {
      if (page.hidden || from !== 'topic') return;
      if (h === 'gate:open') open();
    }));
    /* the gate stands in the slot (there is no emblem to grow out of any more): it opens (fast under reduced motion), then its light loops */
    function play() { if (!opened && st && typeof st.post === 'function') st.post({ play: 'GATE_OPEN', then: 'GATE_IDLE', tag: 'gate:open', rate: st.still() ? 480 : 0 }, 'topic'); }
    page.arkDispose = function () { subs.forEach(function (off) { off(); }); subs = []; clearTimeout(fallback); };
    return { go: go, why: why, open: open, play: play };
  }

  function mount(host, key) {
    var slug = String(key).split('/')[1], T = ArkTopics.bySlug(slug), W = ArkTopics.words(T.n);
    var page = node('section', 'world-page topic-page'); page.setAttribute('aria-labelledby', 'topic-title-' + slug);
    /* no data-stage-wait: a topic page is a plain navigation, so its words show at once and the 3D object joins when the studio has drawn it */

    /* THE SLOT: an empty, pointer-free rectangle the stage lands the object on. Only a refusal is ever drawn inside it. THE FLOOR stands under it:
       the home's two thin mint ellipses, so the object stands on something (floorRings). Both follow the viewport (placeSlot) */
    var slot = node('div', 'topic-object'); slot.setAttribute('aria-hidden', 'true');
    var floor = floorRings();
    function placeSlot() {
      var r = slotRect();
      Object.assign(slot.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
      /* the rings' box: 1.4 slot heights wide around the slot's centre line; its centre stands 11% of the slot's height above the slot's foot */
      var fw = Math.round(r.h * FLOOR.w), fh = Math.round(fw * FLOOR.flat);
      Object.assign(floor.style, { left: Math.round(r.x + r.w / 2 - fw / 2) + 'px', top: Math.round(r.y + r.h * (1 - FLOOR.lift) - fh / 2) + 'px', width: fw + 'px', height: fh + 'px' });
      return r;
    }
    placeSlot();

    /* THE GATE (owner, 2026-11-10: "When you click play > the release gate comes in and the gate opens up > Want to start Playing?"). A topic
       whose row carries `gate` (only the game) is one question, not the topic template: the object arrives as on every topic page, then
       its GATE_OPEN range plays (fxn-3d world/gamedoor/gate.mjs: the door swings out, the doorway fills with light), and only then the
       question shows, with one action on the complement and a quiet way back. Back plays GATE_OPEN reversed, then the stage sends the
       object home (intro.js comeBack). MOTION.md "PLAY opens the gate". */
    var gate = T.gate ? gatePage(page, T.gate, function () { return slot.classList.contains('is-empty'); }) : null;
    if (gate) page.classList.add('is-gate');

    /* THE WORDS (owner, 2026-11-11: "follow the same UI as the new home page"): the home's left column, part for part, in the home's own classes
       (css/world-pages.css "intro portal"): the status as the pill, the name as the headline, what it is as the line, the two buttons, then the
       feature items (what you do, what you get back, speed). "How it works" opens the steps in the feature items' place and closes them again;
       the two share one box as tall as the taller, so the buttons never move under the pointer (law 84). The page's parts in the owner's order:
       what it is, what you do, what you get back, status. A screen reader hears the two labels the picture does not print (.topic-sr). */
    var kind = ArkTopics.statusKind(W.status), lit = kind === 'live' || kind === 'open';
    var left = node('div', 'topic-left intro-portal-words');
    var chip = node('p', 'topic-chip intro-portal-eyebrow mono is-' + kind, ArkTopics.pillWords(W.status));
    var title = node('h1', 'topic-title intro-portal-headline' + (gate ? ' gate-ask' : ''), gate ? T.gate.ask : W.name); title.id = 'topic-title-' + slug;
    var what = node('p', 'topic-what intro-portal-line'); what.append(node('span', 'topic-sr', word('LABEL.IS') + ': '), T.what);
    var speedSay = { icon: 'bolt', name: word('TAB.SPEED'), line: word('SPEED.ROW.NONE') };
    var feats = ArkTopics.features([{ icon: 'send', name: word('LABEL.DO'), line: W.do }, { icon: 'receive', name: word('LABEL.GET'), line: W.get }, speedSay]);
    feats.classList.add('topic-features');
    var how = node('div', 'topic-panel'); how.id = 'topic-how-' + slug; how.hidden = true;
    var ol = node('ol', 'topic-steps');
    T.steps.forEach(function (s) { ol.appendChild(node('li', 'topic-step', s)); });
    how.appendChild(ol);
    if (T.live) liveLine(how, T.live);
    var speedBox = node('div', 'topic-speed'); how.appendChild(speedBox);
    /* speed: the devnet release's own measurement, when it has one for this topic: its first row is the third feature item's line and stands
       under the steps. With none the item reads "Not measured yet" (the manifest's word), never a number (audit F14: no empty Speed tab) */
    function speedNow() {
      var rows = ArkTopics.speedFor(slug).rows; fillSpeed(speedBox, slug, 1);
      feats.lastChild.querySelector('.intro-feature-line').textContent = rows.length ? rows[0].value + ' ' + (rows[0].unit || '') : speedSay.line;
    }
    speedNow(); ArkTopics.loadSpeed().then(speedNow);
    var depth = node('div', 'topic-depth'); depth.append(feats, how);

    /* THE TWO BUTTONS (audit F15: ten pages spent the filled button on one link to Learn). A topic with an action of its own (js/content/topics.js
       `action`, or the game's gate) spends the filled button on it, and "How it works" is the outlined one. A topic with none opens "How it works"
       with the filled button, and its link to Learn (`read`) is the outlined one. One filled button on every page (law 73) */
    var own = gate ? gate.go : T.action ? link(T.action.to, 'intro-portal-enter topic-action', T.action.label || ArkTopics.pageName(T.action.to), T.action.query) : null;
    var howBtn = node('button', (own ? 'intro-portal-second' : 'intro-portal-enter topic-action') + ' topic-how', word('TAB.HOW'));
    howBtn.type = 'button'; howBtn.setAttribute('aria-expanded', 'false'); howBtn.setAttribute('aria-controls', how.id);
    howBtn.addEventListener('click', function () {
      var open = howBtn.getAttribute('aria-expanded') !== 'true';
      howBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); how.hidden = !open; feats.hidden = open;
    });
    var actions = node('div', 'topic-actions intro-portal-actions');
    actions.append.apply(actions, own ? [own, howBtn] : [howBtn].concat(T.read ? [link(T.read.to, 'intro-portal-second topic-read', T.read.label, T.read.query)] : []));
    left.append.apply(left, [chip, title, what, actions].concat(gate ? [gate.why] : [], [depth]));

    /* THE DOCK: the home's rounded bar and, under it, the chip row. The bar leads with this topic's status (its dot is lit only for an open or
       live state), then the network's figures from the home's one source: each reads TBA until a real source answers */
    var dock = node('div', 'topic-dock intro-dock');
    dock.append(ArkTopics.statusBar(word('BAR.LABEL'), { text: ArkTopics.chipWords(W.status), lit: lit }, ArkTopics.networkFigures(), ArkCopy.text('HOME.LANDING.STATUS.TBA')),
      ArkTopics.jumpBar(function (k, c, t) { return link(k, c, t); }, T.key));
    /* the document order is the tab order: the two buttons, then the chips (the skip link and the top bar come before the page) */
    page.append(left, slot, floor, dock);
    host.appendChild(page);

    /* THE OBJECT, through the stage: it appears in the slot (a direct load, a menu click or a jump from another topic). The page is told
       it is there (open resolves): data-stage-wait leaves and the words may build. */
    var landed = false, waitTimer = 0;
    /* a refusal in the slot (no studio, no stage) has no gate to open: the question shows at once (checked after the refusal is drawn) */
    function ready() { page.removeAttribute('data-stage-wait'); if (gate) Promise.resolve().then(function () { if (slot.classList.contains('is-empty')) gate.open(); }); }
    function placeObject() {
      var st = ArkUI.stage;
      if (!T.object) { ready(); return refuse(slot, 'No 3D object for ' + W.name + ' yet.'); }
      if (!st || typeof st.open !== 'function') { ready(); return refuse(slot, 'No 3D object: the stage (js/ark/stage.js) is not loaded on this page. Load it and reload.'); }
      var rect = placeSlot();
      slot.classList.remove('is-empty'); slot.textContent = '';
      clearTimeout(waitTimer);
      /* a host with no 3D view at all (the stage found neither the site's bundled view nor the studio): the slot says so at once and the words build */
      has3d().then(function (ok) { if (!ok && !landed) { clearTimeout(waitTimer); ready(); refuse(slot, word('OBJECT.ABSENT')); } });
      /* no cut in 20 s: say what did not answer and build the page anyway (the words never wait on the 3D for good) */
      waitTimer = setTimeout(function () { if (landed) return; ready(); refuse(slot, word(studioIsSource() ? 'OBJECT.STUDIO' : 'OBJECT.SILENT')); }, 20000);
      Promise.resolve(st.open(T.object, { slot: rect })).then(function (shown) {
        ready();
        /* the object is in the slot once the stage has cut to a drawn, measured frame; the box listener below confirms where it landed */
        if (shown && st.box()) { landed = true; clearTimeout(waitTimer); }
        /* shown is false when the visitor left for another page while this object loaded: nothing of this page is on the stage */
        if (shown && gate && !page.hidden) gate.play();
      }).catch(function (err) { ready(); refuse(slot, 'No 3D object: ' + (err && err.message || 'the stage refused') + '. Reload this page.'); });
      if (typeof st.on === 'function' && !placeObject.listening) {
        placeObject.listening = true;
        st.on('box', function (box, from) {
          /* only the SHOWN frame's box is checked. The frame that loads hidden for the cut ('next') posts its box before the stage has placed it, mapped
             through the view's old transform, so checking it warned "landed N px off the slot" about an object nobody could see yet (2026-11-11) */
          if (page.hidden || !box || from !== 'topic') return;
          /* an object keeps its own proportions, so the check is its centre on the slot's centre and its longer side filling the slot (stage.miss) */
          var r = slotRect(), off = st.miss(box, r);
          landed = true; clearTimeout(waitTimer);
          if (off > 8) console.warn('topic ' + slug + ': the object landed ' + off + ' px off the slot', { slot: r, box: box });
        });
      }
    }
    placeObject();
    /* the slot follows the viewport; the object follows the slot */
    var resizeTimer = 0;
    addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(function () { if (page.hidden) return; var r = placeSlot(); if (ArkUI.stage && ArkUI.stage.place && !slot.classList.contains('is-empty')) ArkUI.stage.place(r); }, 120); });
    /* shown again (the browser's Back from Learn): the object comes back to the slot */
    new MutationObserver(function () { if (!page.hidden) { landed = false; placeObject(); } }).observe(page, { attributes: true, attributeFilter: ['hidden'] });
    return page;
  }
  ArkUI.pageModules.topic = { mount: mount };
})();
