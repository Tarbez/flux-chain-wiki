/* The 12 topics of the portal ring (owner, 2026-11-09, design P05: the intro's ring of 12 stones IS the site's main navigation).
   Layer: app (the site). One row per stone, clockwise from the top, in the ring's own order: the ring (js/pages/intro.js), the
   topic pages (js/pages/topic.js, routes /fxn/<slug>), the Learn page (js/pages/learn.js) and the page table
   (js/content/site-pages.js) all read this one table, so a topic is named once.

   What a row holds, and where its words come from:
   - name, do, get, status: NOT here. They are the ring's own words, HOME.LANDING.RING.S<n> and HOME.LANDING.ABILITY.S<n>.*
     (js/content/manifests/home.js), read through ArkTopics.words(n), so the ring and the page never say two different things.
   - what: "What it is", one line. steps: "How it works", the record's steps for this topic. Facts only, from
     docs/design/space/intro-story/00-facts-genesis.md, 00-facts-browser.md, 00-facts-game.md and
     docs/design/space/intro-audit/designer/BRIEF.md ("The 12 stones"). The new devnet is not deployed: nothing here says live
     unless the brief's status says live.
   - object: the fxn-3d site object drawn for the topic (flux/fxn-3d/world/<object>), framed from the studio's site-view.
     null = no object exists for the topic yet, and the page says so.
   - speed: the words a row of ArkUI.speedFacts (js/content/speed-facts.js) may carry in its `topic` to belong here.
   - action: the topic's OWN action, the page's one filled button. Only a topic with a page that does its job has one: FXN ID
     (/auth), Apps (/download: FXN Browser runs a Bundle), Network (/auth: signing in) and the game (its gate). An action with no
     label takes the name of the page it opens (js/content/site-pages.js), so that name is typed once.
   - read: the link to Learn. A topic with no action of its own shows it as the outlined second button, and its filled button
     opens "How it works" on the page (audit F15, 2026-11-11: ten pages spent their one filled button on the same link to Learn). */
var ArkTopics = (function () {
  'use strict';
  var ROWS = [
    { slug: 'id', object: 'keygate', speed: ['id', 'fxn id', 'identity'],
      what: 'Your FXN ID is a key pair made on your own device. The private half never leaves it.',
      steps: ['You press Initiate FXN ID. Your device makes the key pair.', 'The private key stays on your device, wrapped by its secure store.', 'You keep the key file. Every record you sign carries your signature from it.'],
      action: { label: 'Initiate FXN ID', to: 'auth' } },
    { slug: 'records', object: 'recordline', speed: ['records', 'record', 'finality', 'payments'],
      what: 'A record is one entry written into a chain. It says what happened, who signed it and where it sits.',
      steps: ['You sign a record with your key.', 'A keeper puts it in order on your list and signs a receipt.', 'The receipt makes it final. The record also carries its result, such as the new balance.'],
      read: { label: 'Read how a record becomes final', to: 'learn', query: 't=words' } },
    { slug: 'keepers', object: 'keeperring', speed: ['keepers', 'keeper'],
      what: 'Keepers are the machines that put records in order and return receipts. At genesis they will run on our own nodes.',
      steps: ['Your record reaches a keeper.', 'The keeper orders it and returns a signed receipt. The receipt is final.', 'The record is then pinned: the keeper\'s named pinners hold each segment. Final does not wait for the pin.'],
      live: 'pinners',
      read: { label: 'Read how a record becomes final', to: 'learn', query: 't=words' } },
    { slug: 'capacity', object: 'keepertower', speed: ['capacity', 'throughput', 'keeper count'],
      what: 'Capacity is how many records the keepers can make final each second. More keepers means more capacity.',
      steps: ['A keeper has no vote, so each keeper adds room instead of adding a round of voting.', 'Keepers are paid from the fee box. Part of each fee goes to the keeper that did the work.', 'Nothing has paid out yet. At genesis the first keepers will be our five foundation nodes.'],
      /* plan, not fact: docs/fxn-vs-osf-2026-10-31/keeper-work/deploy-day.md step 3 (five foundation nodes, big1 first). No speed
         is measured on the devnet release yet, so the action reads how a record becomes final (CLAIMS-AUDIT-2026-11-10). */
      read: { label: 'Read how a record becomes final', to: 'learn', query: 't=words' } },
    { slug: 'chains', object: 'chaindrum', speed: ['chains', 'chain'],
      what: 'A chain is a list of records with its own rules. Anyone can launch one.',
      steps: ['You pay the launch fee and lock the stake.', 'You sign the chain\'s first record.', 'The launch founds the chain\'s DAO, which holds its rules.'],
      live: 'launch',
      read: { label: 'Read how a record becomes final', to: 'learn', query: 't=words' } },
    { slug: 'names', object: 'nameplate', speed: ['names', 'name'],
      what: 'A .fxn name is a short name, such as radio.fxn, that points to your key.',
      steps: ['You sign a record that claims the name.', 'The record lands on the name list. Its head says who holds the name now.', 'Moving the name is one more signed record. The old ones stay.'],
      read: { label: 'Read how a record becomes final', to: 'learn', query: 't=words' } },
    /* 2026-11-10 (owner): the game's object is Mark Gate, the door with the DEFXN mark and the tunnel ("that is the GAME PORTAL"); Game Door
       (gamedoor) is saved for something else. Releases has its own object, releasecrate. */
    { slug: 'game', object: 'markgate', speed: ['game'],
      what: 'The game is a 3D world you enter with your FXN ID. It runs on one Mac today.',
      steps: ['You enter the portal with your ID.', 'The world loads on your machine.', 'A world is a local record today. Public play is planned.'],
      read: { label: 'Read what the game runs on', to: 'learn', query: 't=topics' },
      /* the gate (owner, 2026-11-10: "When you click play > the release gate comes in and the gate opens up > Want to start Playing?"): this
         topic's page is one question once the portal's door has sunk into the tunnel (js/pages/topic.js gatePage). entry: the game's own page, fxn-3d
         world/portal/game.html, served by the studio on this Mac only; the game session owns it, the site only links to it.
         entry is the page's path on the studio. The studio's address is the stage's to say (js/ark/stage.js `origin`), so no address is typed here:
         js/pages/topic.js joins the two, and only where the studio is the page's 3D source. */
      gate: { ask: 'Want to start playing?', go: 'Start playing', entry: '/world/portal/game.html' } },
    { slug: 'releases', object: 'releasecrate', speed: ['releases', 'release'],
      what: 'A release is a version of an app, signed by its maker, that anyone can check.',
      steps: ['The maker signs the release with their key.', 'The signature and the release are kept together.', 'Your browser checks the signature before it runs the update.'],
      read: { label: 'Read how a record becomes final', to: 'learn', query: 't=words' } },
    { slug: 'apps', object: 'bundlepress', speed: ['apps', 'app', 'bundles', 'bundle'],
      what: 'An app ships as one Bundle: its files and its rules in one signed package.',
      steps: ['You pack the app into a Bundle.', 'You send it through the upload door.', 'FXN Browser runs the Bundle with the rules inside it.'],
      action: { to: 'download' },
      read: { label: 'Read how a record becomes final', to: 'learn', query: 't=words' } },
    { slug: 'rules', object: 'multisiglock', speed: ['rules', 'multisig'],
      what: 'The network\'s rules change only through a multisig.',
      steps: ['A change is written as one record.', 'Each key holder of the multisig signs it, or does not.', 'When enough of them have signed, the change takes effect.'],
      live: 'multisig',
      read: { label: 'Read how a record becomes final', to: 'learn', query: 't=words' } },
    { slug: 'deposits', object: 'bridgespan', speed: ['deposits', 'deposit', 'bridge'],
      what: 'A deposit brings funds in from another network through the bridge.',
      steps: ['You send funds from your account to the bridge.', 'The deposit arrives as a credit that carries its own proof.', 'Your next spend cites that credit, so your balance is read from one record.'],
      read: { label: 'Read how a record becomes final', to: 'learn', query: 't=words' } },
    { slug: 'network', object: 'networkwall', speed: ['network', 'gate', 'sign in'],
      what: 'The network is every site that accepts your FXN ID. You sign in to each with the same ID.',
      steps: ['A site of the network asks you to sign in.', 'You sign its request with your key. The key never leaves your device.', 'The site checks the signature.'],
      action: { to: 'auth' },
      read: { label: 'Read how a record becomes final', to: 'learn', query: 't=words' } }
  ];
  function copy(key) { return typeof ArkCopy !== 'undefined' ? ArkCopy.text('HOME.LANDING.' + key) : key; }
  /* the one word for the link to the home page, on the jump bar, on Learn and on the game page */
  function homeWord() { return copy('TOPIC.HOME'); }
  /* n is 1..12, the stone's place clockwise from the top */
  function words(n) {
    var s = 'S' + n;
    return { name: copy('RING.' + s), do: copy('ABILITY.' + s + '.DO'), get: copy('ABILITY.' + s + '.GET'), status: copy('ABILITY.' + s + '.STATUS') };
  }
  /* the status chip's kind, read from the status words, never written per row: live, local (runs on one machine), or built */
  function statusKind(text) {
    var t = String(text).toLowerCase();
    if (/\blive\b/.test(t) && !/not live/.test(t)) return 'live';
    if (/^open now\b/.test(t)) return 'open';
    if (/one mac|local/.test(t)) return 'local';
    if (/after genesis/.test(t)) return 'later';
    return 'built';
  }
  /* speed rows for one topic: the measured rows and the not-measured rows whose `topic` names it. Absent file = empty lists:
     a topic with no row says "not measured yet", never 0. */
  function speedFor(slug) {
    var F = window.ArkUI && ArkUI.speedFacts, row = bySlug(slug), out = { rows: [], notMeasured: [], asOf: F && F.asOf, present: !!F };
    if (!F || !row) return out;
    function mine(r) { var t = String(r.topic || '').toLowerCase(); return row.speed.indexOf(t) >= 0 || t === slug; }
    out.rows = (F.rows || []).filter(mine); out.notMeasured = (F.notMeasured || []).filter(mine);
    return out;
  }
  /* js/content/speed-facts.js is written by another lane and may not exist yet: load it once, and go on without it */
  var speedLoad = null;
  function loadSpeed() {
    if (window.ArkUI && ArkUI.speedFacts) return Promise.resolve(ArkUI.speedFacts);
    if (speedLoad) return speedLoad;
    speedLoad = new Promise(function (done) {
      var s = document.createElement('script'); s.src = '/js/content/speed-facts.js'; s.async = true;
      s.onload = function () { done(window.ArkUI && ArkUI.speedFacts || null); };
      s.onerror = function () { done(null); };
      document.head.appendChild(s);
    });
    return speedLoad;
  }
  /* the status chip's words: the ABILITY status is a sentence ("Built, not live."); a chip is a label, so it drops the final period */
  function chipWords(text) { return String(text || '').replace(/\.\s*$/, ''); }
  /* the pill's words: the status's first sentence only ("Built, not live. Not open to the public yet." reads "Built, not live") */
  function pillWords(text) { return chipWords(String(text || '').split(/\.\s+/)[0]); }

  /* THE HOME'S PARTS, SHARED WITH THE INNER PAGES (owner, 2026-11-11: "follow the same UI as the new home page"). Layer: app.
     The inner pages wear the home's own classes (css/world-pages.css: .intro-portal-eyebrow the pill, .intro-portal-enter and
     .intro-portal-second the two buttons, .intro-feature, .intro-status the bar, .intro-chip, .intro-icon), so a change to the home's
     look reaches them with no second rule. The three builders below make those parts. This file loads before js/pages/intro.js, and the
     home builds its own feature items and bar with them, so the icon paths and the bar exist once. */
  /* line icons on a 24 grid, drawn in the ink of their parent (css gives them --primary). No icon font. The first five are the home's */
  var ICONS = {
    cube: 'M12 2.5 20.5 7v10L12 21.5 3.5 17V7zM3.5 7 12 11.5 20.5 7M12 11.5v10',
    layers: 'M12 3 21 7.5 12 12 3 7.5zM3 12l9 4.5 9-4.5M3 16.5 12 21l9-4.5',
    bolt: 'M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z',
    nodes: 'M12 3.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM5 16.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM19 16.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM11 7.3 6 16.7M13 7.3l5 9.4M7 18.5h10',
    people: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19.5c0-3 2.7-5 6-5s6 2 6 5M16 5.2a3 3 0 0 1 0 5.6M17.5 14.8c2.1.6 3.5 2.3 3.5 4.7',
    /* what you do: an arrow leaving a frame. what you get back: an arrow landing in a tray */
    send: 'M10 4.5H4.5v15h15V14M13.5 4.5h6v6M19.5 4.5 11 13',
    receive: 'M12 3.5v11M7.5 10 12 14.5 16.5 10M4 15.5v5h16v-5',
    /* a record (three lines on a sheet), a signature (a pen stroke), a place on a list (a marked row) */
    sheet: 'M6 3.5h9l3.5 3.5v13.5H6zM14.5 3.5V7.5h4M9 11.5h6.5M9 15h6.5',
    pen: 'M4 20l1-4.5L16.5 4l3.5 3.5L8.5 19zM14.5 6l3.5 3.5M4 20h16',
    list: 'M8.5 6.5h11M8.5 12h11M8.5 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01'
  };
  /* THE HOME HERO'S WORDS ARE WRITTEN ONCE, AS MARKUP (2026-11-11, speed lane 1C). Layer: app.
     Why: the hero's words must read at the first paint, before any shell script has come (audit F05; measured on the build node, the words
     waited for the shell's chunks: 600 ms on cable, 2.2 s on slow 4G, and 4.6 s when the 3D frame's files went down the line first). So the
     build writes them into index.html (scripts/build-shell.cjs, the hero-words region) and js/pages/intro.js takes those same nodes over.
     One writer for both: heroWords() below. The build calls it with the manifest's words, the page calls it with ArkCopy's, and the page
     compares the two strings, so a stale region is replaced, never shown for good. The strings are in the form the browser itself writes a
     node back (innerHTML), so the comparison is exact. iconHTML and featuresHTML feed lineIcon() and features() too: one shape per part. */
  function esc(text) { return String(text == null ? '' : text).replace(/&/g, '&amp;').replace(/ /g, '&nbsp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function escAttr(text) { return String(text == null ? '' : text).replace(/&/g, '&amp;').replace(/ /g, '&nbsp;').replace(/"/g, '&quot;'); }
  function fromHTML(html) { var t = document.createElement('template'); t.innerHTML = html; return t.content.firstChild; }
  function iconHTML(name) { return '<svg viewBox="0 0 24 24" class="intro-icon" aria-hidden="true"><path d="' + escAttr(ICONS[name] || '') + '"></path></svg>'; }
  function featuresHTML(items) {
    return '<ul class="intro-features">' + items.map(function (f) {
      return '<li class="intro-feature">' + iconHTML(f.icon) + '<b class="intro-feature-name">' + esc(f.name) + '</b><span class="intro-feature-line">' + esc(f.line) + '</span></li>';
    }).join('') + '</ul>';
  }
  /* which words the hero shows, by their HOME.LANDING role. read(role) answers a role's words (the page: ArkCopy; the build: the manifest file) */
  function heroSpec(read, href) {
    return { eyebrow: read('PORTAL.EYEBROW'), headline: read('PORTAL.HEADLINE'), line: read('PORTAL.LINE'), enter: read('PORTAL.ENTER'), second: read('HERO.SECOND'), href: href,
      feats: [['F1', 'cube'], ['F2', 'layers'], ['F3', 'bolt']].map(function (f) { return { icon: f[1], name: read('HERO.' + f[0] + '.NAME'), line: read('HERO.' + f[0] + '.LINE') }; }) };
  }
  /* what stands inside .intro-portal-words. c: { eyebrow, headline, line, enter, second, href, feats: [{ icon, name, line }] }; href is where both
     buttons go (Learn). The headline is the page's one h1 and carries the id the section is named by */
  function heroWords(c) {
    return '<p class="intro-portal-eyebrow mono">' + esc(c.eyebrow) + '</p><h1 class="intro-portal-headline" id="intro-title">' + esc(c.headline) + '</h1><p class="intro-portal-line">' + esc(c.line) + '</p>' +
      '<div class="intro-portal-actions"><a class="intro-portal-enter" href="' + escAttr(c.href) + '" data-scene-link="learn">' + esc(c.enter) + '</a><a class="intro-portal-second" href="' + escAttr(c.href) + '" data-scene-link="learn">' + esc(c.second) + '</a></div>' +
      featuresHTML(c.feats);
  }
  /* the section index.html carries until the home's page takes its words (#hero-first; shown by js/loader-plaza.js on the home only, look in
     css/loader-plaza.css). It wears the page's own classes, so css/world-pages.css sets the words exactly as it does in the page */
  function heroFirst(c) { return '<section id="hero-first" class="world-page intro-world hero-words" aria-labelledby="intro-title" hidden><div class="intro-portal-words">' + heroWords(c) + '</div></section>'; }
  function lineIcon(name) { return fromHTML(iconHTML(name)); }
  function el(tag, className, text) { var e = document.createElement(tag); if (className) e.className = className; if (text != null) e.textContent = text; return e; }
  /* a row of the home's feature items. items: [{ icon, name, line }] */
  function features(items) { return fromHTML(featuresHTML(items)); }
  /* the home's rounded bar. label: its name for screen readers. lead: { text, lit } (lit: the dot is on; only for an open or live
     state). items: [{ id, icon, name, value }]; a value that is absent (undefined, null, '') reads `none`, never 0. An item's id (the
     name ArkUI.homeStatus knows the figure by) is kept on its value as data-status, so a live source can find the place to write */
  function statusBar(label, lead, items, none) {
    var bar = el('div', 'intro-status'); bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', label);
    var first = el('p', 'intro-status-lead'), dot = el('i', 'intro-status-dot' + (lead.lit ? ' is-lit' : '')); dot.setAttribute('aria-hidden', 'true');
    first.append(dot, el('span', '', lead.text)); bar.appendChild(first);
    items.forEach(function (f) {
      var item = el('p', 'intro-status-item'), value = el('b', 'intro-status-value', f.value == null || f.value === '' ? none : String(f.value));
      if (f.icon) item.appendChild(lineIcon(f.icon));
      if (f.id) value.dataset.status = f.id;
      item.append(el('span', 'intro-status-name', f.name), value); bar.appendChild(item);
    });
    return bar;
  }
  /* the network's figures as the home's bar names them (HOME.LANDING.STATUS.*), each asked from the home's one source
     (ArkUI.homeStatus, js/pages/catalog.js). With no answer, the value is absent and the bar shows TBA */
  function networkFigures() {
    var read = window.ArkUI && ArkUI.homeStatus && ArkUI.homeStatus.read;
    return [['genesis', 'GENESIS', 'cube'], ['chains', 'CHAINS', 'layers'], ['networks', 'NETWORKS', 'nodes'], ['identities', 'IDENTITIES', 'people']].map(function (f) {
      return { id: f[0], icon: f[2], name: copy('STATUS.' + f[1]), value: read ? read(f[0]) : undefined };
    });
  }

  /* THE CHIP ROW (2026-11-11; it was the jump bar of P05 phase 2): the one navigation row at the foot of every topic page and Learn,
     in the home's explore-row shape: a mono caption, then one chip per topic in the ring's order with the current one marked
     (aria-current), a hairline, and the chips to Learn and to the home. Built here so it is the same row everywhere. `link(key,
     className, text)` is the page's own link maker (it sets data-scene-link). `here` is the current page key ('fxn/<slug>' or 'learn'). */
  function jumpBar(link, here) {
    var nav = el('nav', 'topic-jump intro-explore'); nav.setAttribute('aria-label', copy('TOPIC.JUMP.CAPTION'));
    var say = el('div', 'intro-explore-words'); say.appendChild(el('p', 'intro-explore-caption mono', copy('TOPIC.JUMP.CAPTION')));
    var chips = el('ul', 'intro-chips');
    function chip(key, text, more) {
      var a = link(key, 'intro-chip' + (key === here ? ' is-here' : ''), text), li = el('li', more || '');
      if (key === here) a.setAttribute('aria-current', 'page');
      li.appendChild(a); chips.appendChild(li);
    }
    all().forEach(function (t) { chip(t.key, words(t.n).name); });
    chip('learn', copy('TOPIC.JUMP.LEARN'), 'topic-jump-out'); chip('intro', homeWord());
    nav.append(say, chips);
    return nav;
  }
  /* the name of the page a key opens, from the page table (js/content/site-pages.js): the label of an action that has none of its own */
  function pageName(key) { var row = ArkSitePages.pages().filter(function (p) { return p.key === key; })[0]; return row ? row.label : key; }
  function bySlug(slug) { for (var i = 0; i < ROWS.length; i++) if (ROWS[i].slug === slug) return ROWS[i]; return null; }
  /* the rows in the routes' order; a slug in TOPICS with no row here is a build error that names the missing row */
  function all() {
    return ArkSitePages.topics().map(function (t, i) {
      var r = bySlug(t.slug);
      if (!r) throw new Error('js/content/site-pages.js TOPICS lists "' + t.slug + '", but js/content/topics.js has no row for it: add its row (what, steps, object, action).');
      return Object.assign({ n: i + 1, key: t.key, path: t.path }, r);
    });
  }
  return { all: all, bySlug: function (slug) { return all().filter(function (r) { return r.slug === slug; })[0] || null; }, words: words, statusKind: statusKind, chipWords: chipWords, pillWords: pillWords, lineIcon: lineIcon, features: features, heroSpec: heroSpec, heroWords: heroWords, heroFirst: heroFirst, statusBar: statusBar, networkFigures: networkFigures, pageName: pageName, jumpBar: jumpBar, homeWord: homeWord, speedFor: speedFor, loadSpeed: loadSpeed };
})();
