/* /download -- Run DEFXN from source -- on the story template (js/pages/story.js).

   Converted in DEFXN polish Wave 3 (W3-GUIDE). It was a hand-built "How it works chapter" screen:
   a terminal card beside five step buttons that rendered in Arial and showed only "01-05" on a
   phone, where the deck, the step names, the guide link, the bundle link and the progress line
   were display:none (docs/ux-audit/pages-ux-a.md /download P1). It is the one guided template now:
     The idea      the deck and the five steps, by name
     How it works  each step in full as Ark tabs -- the step control /deploy uses (ledger recheck
                   2026-10-21, "/download fixes (one step component with /deploy)": the
                   accordion here and the tabs there were two controls for one kind of list) --
                   in step with the terminal
     Evidence      what a clean local start proves and what it does not, and the full guide
     boundary      what success proves, in sight in every view
     figure        the terminal for the chosen step -- its commands with Copy, what to expect
                   (a step's checks are Ark facts), and the way through: "Step n of 5" and an
                   Ark actions row (Previous step / Next step, as on /deploy, and on the last
                   step the hand-off to /deploy); folded behind "Show the terminal" below 900px.
                   The terminal itself stays the page's own: Ark ships no command block (P22).
   Every step is addressable as before (?step=N, plus ?view= for a depth). Words stay in the
   download manifest (copy: keys); the terminal's commands come from docs/operators. Layout keys
   of the old page are pinned (`WAS`, tests/lib/layout-continuity.cjs). Regression:
   tests/resolver-guide-blocks.cjs, tests/routes-live.cjs. */
(function () {
  'use strict';

  /* What each step looks like at the terminal. Commands and defaults come from docs/operators. */
  var TERMINAL = [
    { lines: ['node --version', 'npm --version'], expect: 'v22 or newer, with npm on the path' },
    { lines: ['cd /path/to/ark-miner-cli', 'npm install', 'cp .env.example .env', 'npm start'], expect: 'Review .env before npm start' },
    { checks: [['Process', 'Stays running'], ['Status', '127.0.0.1:8766 (default)'], ['Record', 'Revision, version, config, time']] },
    { proves: ['Local startup'], not: ['Public-network membership', 'Deployed resolver capacity', 'Independent-host readiness', 'Production activation'] },
    { lines: ['flux-network network list', 'flux-network network create "my-network"', 'FLUX_MINER_NETWORK=<network-id> flux-miner start'], expect: 'Networks partition presence only' }
  ];
  /* `was`: the key each element of the hand-built page had, by block id, so a CMS edit saved
     against it still lands. Started from tests/lib/layout-continuity.cjs's derive against the
     frozen census (tests/fixtures/layout-keys/download.tsv); every reshaped and retired key is
     listed with its reason in tests/resolver-guide-blocks.cjs. */
  var STEP = function (n) { return 'page:/div:1/section:2/ol:1/li:' + n; };
  var WAS = {
    'download-hero': { ':root': { key: 'page:/header:1', self: true }, 'hero-title': 'id:download-title',
      'actions': { key: 'page:/header:1/div:1', self: true }, 'button': 'page:/nav:1/a:1' },
    'download-body': { ':root': { key: 'page:/div:1', self: true } },
    'download-depth': { ':scope > div:nth-of-type(2) > p:nth-of-type(1)': 'page:/header:1/p:1', 'tabs-content#2': { key: 'page:/div:1/section:2', self: true },
      'button#2': 'page:/nav:1/a:2' },
    /* How it works' step tabs (nested in the depth control, so pinned by their own id): the old
       step list is the tabs, a step row its tab, the row's text the tab's panel. */
    'download-steps': { ':root': { key: 'page:/div:1/section:2/ol:1', self: true } },
    'download-figure': { '[data-ark-slot="terminal"]': { key: 'page:/div:1/section:1', self: true }, '.download-terminal-top': 'page:/div:1/section:1/div:1', '.download-terminal-top > [data-ark-block="eyebrow"]': 'page:/div:1/section:1/div:1/span:1',
      '.download-terminal-top .copy-command [data-ark-part="button"]': 'page:/div:1/section:1/div:1/button:1',
      '.download-terminal-title': 'page:/div:1/section:1/h2:1', '.download-screen': 'page:/div:1/section:1/div:2', '.download-expect': 'page:/div:1/section:1/p:1',
      '.download-way': { key: 'page:/nav:1', self: true }, '.download-progress': 'page:/nav:1/span:1',
      '.download-way [data-action="download-previous"]': 'page:/nav:1/button:1',
      '.download-way [data-action="download-next"]': 'page:/nav:1/button:2', '.download-way .ark-actions > a': 'page:/nav:1/a:3' },
    insert: 'page:/div:2'
  };
  [1, 2, 3, 4, 5].forEach(function (n) {
    var k = n > 1 ? '#' + n : '';
    /* (the first view's step list -- 'step#n' / 'step-title' pins -- left on 2026-10-22: the five steps are How it works'
       tabs and the terminal's; tests/resolver-guide-blocks.cjs retires those keys with the reason) */
    WAS['download-steps']['tabs-trigger' + k] = { key: STEP(n), self: true };
    WAS['download-steps']['tabs-content' + k] = 'id:source-step-' + n;
  });

  /* the apps the page offers, in the order a visitor meets them (their words and addresses are DOWNLOAD.APP.<KEY>.*) */
  /* the browser's own apps only (owner, 2026-10-25: "focus on the product"); the miner apps live with the operator guide */
  var APPS = ['BROWSER', 'MOBILE'];
  /* the one case rule for a label a manifest authored in capitals (js/ark/page-kit.js) */
  function sentence(text) { return ArkUI.sentenceCase(text); }

  /* The redesign's pieces the blocks do not draw (owner image, 2026-10-25), added once the page is built:
     the way back above the title, the product name in the title's accent, the actions' icons, the picture of the
     browser and an FXN ID in The idea, the apps' note, and one line under the next and related links. */
  /* The core picture: the FXN Browser's window onto the real network, and an FXN ID card. The window's body is the
     page's [data-stage], so the 3D world frames the kernel inside it (js/world/download-stage.js) and each step reshapes
     the network there. The card's rows say what is true at that step: the checkout runs from step 3, the miner is
     verified from step 3, the network is joined only at step 5. */
  var ID_ROWS = [['DEFXN sites', 0], ['FXN ID held', 2], ['Network access', 4]];
  function picture(el) {
    var art = el('div', 'download-art');
    art.setAttribute('role', 'img');
    art.setAttribute('aria-label', 'The FXN Browser open on defxn://, showing the network, beside an FXN ID card. Illustration: not live data.');
    var win = el('div', 'dl-win');
    var bar = el('div', 'dl-win-bar');
    ['r', 'y', 'g'].forEach(function (c) { bar.appendChild(el('i', 'dl-dot dl-' + c)); });
    bar.appendChild(el('span', 'dl-url', 'defxn://'));
    win.appendChild(bar);
    var view = el('div', 'dl-win-view'); view.setAttribute('data-stage', '');
    win.appendChild(view);
    var word = el('div', 'dl-win-word'); word.appendChild(el('b', '', 'DEFXN')); word.appendChild(el('small', '', 'FXN CHAIN'));
    win.appendChild(word);
    art.appendChild(win);
    var id = el('div', 'dl-id');
    id.appendChild(el('p', 'dl-id-title', 'Your FXN ID'));
    var key = el('p', 'dl-id-key'); key.appendChild(el('span', '', 'fxn_9a3d…7f2e')); id.appendChild(key);
    var list = el('ul', 'dl-id-rows');
    ID_ROWS.forEach(function (row) { var li = el('li', '', row[0]); li.dataset.from = String(row[1]); li.appendChild(el('i')); list.appendChild(li); });
    id.appendChild(list);
    art.appendChild(id);
    /* the FXN ID card is glass (css/cutouts.css .tp-panel) laid over the window: the overlap shows the window and the
       3D through it, blurred; the 3D world draws the cutouts themselves (js/world/download-stage.js, holes in glass) */
    id.classList.add('tp-panel');
    return art;
  }
  /* the picture and the 3D follow the chosen step */
  function showStep(root, index) {
    root.querySelectorAll('.dl-id-rows li').forEach(function (li) { li.classList.toggle('is-on', index >= Number(li.dataset.from)); });
    var art = root.querySelector('.download-art');
    if (art && art.dataset.step !== String(index)) {
      art.dataset.step = String(index);
      /* the window's edge glows once as a step lands (a CSS keyframe restarted by the class; nothing runs after it) */
      art.classList.remove('is-landing'); void art.offsetWidth; art.classList.add('is-landing');
    }
    var host = window.ArkWorldHost;
    if (host && host.ready && host.scene && host.scene.select && host.viewFor && host.viewFor('download') === 'download') host.scene.select({ view: 'download', s: index });
  }
  function dress(root, words) {
    var el = ArkUI.el;
    var crumbs = root.querySelector('.ark-breadcrumb');
    /* no separate "Back to products" link: the breadcrumb's Products already goes back (owner, 2026-10-25: less noise) */
    /* "Get FXN Browser": the product's name in the accent (only while the title still reads "Get <name>") */
    var title = root.querySelector('.ark-hero__title'), m = title && /^(Get\s+)(.+)$/.exec(title.textContent);
    if (m) { title.textContent = m[1]; title.appendChild(el('span', 'download-title-name', m[2])); }
    var buttons = root.querySelectorAll('.ark-hero [data-ark-part="button"]');
    if (ArkUI.actionIcon && buttons[0]) ArkUI.actionIcon(buttons[0], 'document');
    if (ArkUI.actionIcon && buttons[1]) ArkUI.actionIcon(buttons[1], 'account');
    /* The picture stands under the depth tabs in the left column and the apps follow it, outside the views (they do not
       move when a view changes, so the 3D framed in the window stays put); the terminal holds the right column. */
    var focus = root.story && root.story.panel('focus'), head = focus && focus.querySelector('[data-ark-block="section-header"]');
    var apps = focus && focus.querySelector('#download-apps-fold'), depth = root.querySelector('[data-story-depth]');
    var next = root.querySelector('.ark-pager [data-ark-part="pager-next"]');
    if (next) next.appendChild(el('span', 'download-next-line', words('NEXT.LINE')));
    var label = root.querySelector('.ark-pager__related-label'); if (label) label.textContent = 'Related links';
    Array.prototype.forEach.call(root.querySelectorAll('.ark-pager__related-list a'), function (a, i) {
      a.appendChild(el('span', 'download-related-line', words(i === 0 ? 'ASIDE.LINE' : 'GUIDE.LINE')));
    });
    /* the next step and the related links stand in the right column under the terminal, as in the image: moved into
       the side column so its height, not the left column's, decides where they sit */
    var side = root.querySelector('.story-side'), pager = root.querySelector('.ark-pager');
    /* and the way back, the title and its actions lead the left column, so each column is one flow and neither one's
       height stretches the other's rows (the blocks keep their layout pins: they are attributes, not positions) */
    var main = root.querySelector('.story-main'), hero = root.querySelector('.ark-hero');
    if (main && hero) { main.insertBefore(hero, main.firstChild); if (crumbs) main.insertBefore(crumbs, hero); }
    var foot = el('p', 'download-footnote', 'Illustration — not live data.');
    if (side && pager) { side.appendChild(pager); side.appendChild(foot); } else root.appendChild(foot);
    if (depth) {
      var art = picture(el), after = art;
      depth.insertAdjacentElement('afterend', art);
      [head, head && el('p', 'download-apps-note', words('APPS.NOTE')), apps].forEach(function (node) { if (node) { after.insertAdjacentElement('afterend', node); after = node; } });
    }
  }

  ArkUI.pageModules.download = {
    mount: function (host) {
      var manifest = ArkManifest.get('download');
      function words(key) { return ArkCopy.text('DOWNLOAD.' + key); }
      function copy(key) { return 'copy:DOWNLOAD.' + key; }
      var count = TERMINAL.length, active = 0, root = null, syncing = false;
      function stepTitle(i) { return words('POINT' + (i + 1) + '.TITLE').replace(/^\d+\.\s*/, '').replace(/\.$/, ''); }
      var el = ArkUI.el;

      /* ---- the terminal (the figure's slot): hand-built because it is the procedure itself --
         Copy, the step's commands, and the way through; Ark's figure frames it. */
      var card = el('div', 'download-terminal');
      card.setAttribute('aria-live', 'polite');
      var top = el('div', 'download-terminal-top');
      /* the label says what the card shows and where you are: Ark's eyebrow, its words set per step */
      var labelBlock = ArkUI.blocks.render({ block: 'eyebrow', props: { text: 'Terminal' } }), label = labelBlock.querySelector('.ark-eyebrow__text') || labelBlock; top.appendChild(labelBlock);
      /* Copy is the site's one (js/ark/page-kit.js ArkUI.copyCommand), the control /deploy uses; its words follow the step. */
      var copier = ArkUI.copyCommand({ text: function () { return (TERMINAL[active].lines || []).join('\n'); }, noun: 'commands' });
      top.appendChild(copier.element);
      card.appendChild(top);
      var cardTitle = el('p', 'download-terminal-title'); card.appendChild(cardTitle);
      var cardDesc = el('p', 'download-terminal-desc'); card.appendChild(cardDesc);
      var screen = el('div', 'download-screen'); card.appendChild(screen);
      var expect = el('p', 'download-expect'); card.appendChild(expect);
      card.appendChild(copier.status);
      /* The way through: where you are, then Ark's actions row -- Previous step / Next step, the
         words and tones /deploy's row uses, and on the last step the hand-off to the next page
         (Ark draws its arrow). The presses reach the page as ark:action (def.handlers below). */
      var way = el('div', 'download-way');
      var progress = el('span', 'download-progress'); progress.setAttribute('role', 'status');
      var stepper = ArkUI.blocks.render({ block: 'actions', props: { label: 'Step through', align: 'end', items: [
        { label: 'Previous step', action: 'download-previous', tone: 'ghost' },
        { label: 'Next step', action: 'download-next', tone: 'primary' },
        { label: sentence(words('NEXT')), href: 'route:' + manifest.meta.next, tone: 'primary' }
      ] } }, { from: manifest.route });
      var previous = stepper.querySelector('[data-action="download-previous"]'), next = stepper.querySelector('[data-action="download-next"]'), onward = stepper.querySelector('a');
      /* one dot per step, the current one lit; a dot is a button to that step (redesign 2026-10-25) */
      var dots = el('div', 'download-dots'); dots.setAttribute('role', 'group'); dots.setAttribute('aria-label', 'Steps');
      for (var d = 0; d < count; d++) (function (n) {
        var dot = el('button', 'download-dot'); dot.type = 'button'; dot.setAttribute('aria-label', 'Step ' + (n + 1) + ': ' + stepTitle(n));
        dot.addEventListener('click', function () { select(n, true); }); dots.appendChild(dot);
        /* a pointer resting on a dot previews that step's shape in the 3D; leaving returns to the chosen step */
        dot.addEventListener('pointerenter', function () { if (root) showStep(root, n); });
        dot.addEventListener('pointerleave', function () { if (root) showStep(root, active); });
      })(d);
      /* The step player (owner, 2026-10-25: "make sure it does animate through the steps"): it walks the five steps
         with the terminal, the picture and the 3D in step, then comes back to where you were. It plays once on a first
         visit, when the 3D is up; the button plays it again or stops it. Timed step advances, as js/pages/home-flow.js:
         no frame loop, and it stops for good at any choice you make, when the tab hides, or when the page leaves. */
      var TOUR_MS = 3200, tour = { on: false, timer: 0, from: 0 };
      var play = el('button', 'download-play'); play.type = 'button';
      function setPlay(on) {
        tour.on = on; play.setAttribute('aria-pressed', on ? 'true' : 'false');
        play.textContent = on ? 'Stop' : 'Play the five steps';
      }
      function stopTour() { clearTimeout(tour.timer); tour.timer = 0; if (tour.on) setPlay(false); }
      function tourStep(i) {
        if (!tour.on) return;
        select(i, false);
        tour.timer = setTimeout(function () {
          if (!tour.on) return;
          if (i < count - 1) tourStep(i + 1); else { select(tour.from, false); setPlay(false); }
        }, i < count - 1 ? TOUR_MS : TOUR_MS + 800);
      }
      function startTour() { if (!root || !root.isConnected) return; tour.from = active; setPlay(true); tourStep(0); }
      play.addEventListener('click', function () { if (tour.on) stopTour(); else startTour(); });
      document.addEventListener('visibilitychange', function () { if (document.hidden) stopTour(); });
      setPlay(false);
      var dotsRow = el('div', 'download-dots-row'); dotsRow.appendChild(dots); dotsRow.appendChild(play);
      var where = el('div', 'download-where'); where.appendChild(progress); where.appendChild(dotsRow);
      way.appendChild(where); way.appendChild(stepper);
      card.appendChild(way);

      function paint() {
        var t = TERMINAL[active];
        label.textContent = (t.lines ? 'TERMINAL' : t.checks ? 'CHECK' : 'WHAT IT PROVES') + ' · STEP ' + String(active + 1).padStart(2, '0') + ' / ' + String(count).padStart(2, '0');
        cardTitle.textContent = stepTitle(active);
        cardDesc.textContent = words('POINT' + (active + 1) + '.TEXT');
        Array.prototype.forEach.call(dots.children, function (dot, n) { dot.setAttribute('aria-current', n === active ? 'step' : 'false'); });
        screen.textContent = ''; copier.element.hidden = !t.lines; expect.hidden = !t.expect; expect.textContent = t.expect || '';
        if (t.lines) {
          var pre = el('pre', 'download-code'); copier.setName('commands for ' + stepTitle(active));
          /* numbered lines, as an editor shows them (the number is not copied: Copy takes the commands alone) */
          t.lines.forEach(function (line, n) { var row = el('code'); row.appendChild(el('span', 'download-ln', String(n + 1))); row.appendChild(document.createTextNode(line)); pre.appendChild(row); });
          screen.appendChild(pre);
        } else if (t.checks) {
          /* what to look for once it runs: Ark's facts (one record, one pair per line) */
          screen.appendChild(ArkUI.blocks.render({ block: 'facts', props: { label: 'What to check', columns: 1,
            items: t.checks.map(function (pair) { return { term: pair[0], value: pair[1] }; }) } }));
        } else {
          var split = el('div', 'download-proves');
          [['PROVES', t.proves, 'yes'], ['DOES NOT PROVE', t.not, 'no']].forEach(function (group) {
            var col = el('div', 'download-proves-' + group[2]); col.appendChild(ArkUI.blocks.render({ block: 'eyebrow', props: { text: group[0] } }));
            var ul = el('ul'); group[1].forEach(function (item) { ul.appendChild(el('li', '', item)); }); col.appendChild(ul); split.appendChild(col);
          });
          screen.appendChild(split);
        }
        previous.hidden = active === 0; next.hidden = active === count - 1; onward.hidden = active !== count - 1;
        progress.textContent = 'Step ' + (active + 1) + ' of ' + count;
        if (root && !root.downloadMoments) showStep(root, active);
      }
      /* The step tabs of How it works (Ark tabs, as /deploy's), chosen in step with the terminal:
         through the primitive (a click), never by hand. */
      function stepTabs() { return root && root.querySelector('#download-steps'); }
      function tabs() { var t = stepTabs(); return t ? Array.prototype.slice.call(t.querySelector('[data-ark-part="tabs-list"]').querySelectorAll('[data-ark-part="tabs-trigger"]')) : []; }
      function shown() { var list = tabs(); for (var i = 0; i < list.length; i++) if (list[i].getAttribute('aria-selected') === 'true') return i; return 0; }
      function openRow(index) {
        var trigger = tabs()[index];
        if (trigger && trigger.getAttribute('aria-selected') !== 'true') { syncing = true; trigger.click(); syncing = false; }
      }
      function query(view) {
        var v = view || (root && root.story ? root.story.view() : 'focus');
        return (v === 'focus' ? '' : 'view=' + v + '&') + 'step=' + active;
      }
      function select(index, write) {
        if (write) stopTour();   /* a choice you make ends the player */
        active = Math.max(0, Math.min(count - 1, index));
        paint(); openRow(active);
        if (write && root) ArkUI.route.write(ArkUI.pageCatalog.download.path, query(), 'push');
      }
      paint();

      var steps = [];
      for (var i = 0; i < count; i++) steps.push({ value: 'step-' + (i + 1), title: stepTitle(i), content: copy('POINT' + (i + 1) + '.TEXT') });
      var guide = { label: sentence(words('GUIDE')), href: words('GUIDE.HREF') };
      var def = {
        page: 'download', id: 'download', className: 'download-page', titleId: 'download-title', was: WAS, insertWas: WAS.insert,
        crumbs: [{ label: 'Products', href: 'route:resolutions' }, { label: 'FXN Browser' }],
        lede: copy('LEDE'),
        /* no eyebrow: "RUN DEFXN / FROM SOURCE" repeated the breadcrumb above it (first-visit audit 2026-10-22, P2) */
        title: copy('TITLE'),
        /* the one thing a newcomer can do today: the browser has no public download, the FXN ID is made on this site */
        actions: [{ label: guide.label, href: guide.href, tone: 'secondary' }, { label: 'Create your FXN ID', href: 'route:account', tone: 'primary' }],
        depth: {
          /* the apps first (the owner's call 2026-10-22: this is the download page for the CLI, the desktop apps and the
             mobile apps), then running from source. An app's card links its download once DOWNLOAD.APP.<KEY>.URL holds an
             https:// address; until then it says so, never a link that goes nowhere. */
          focus: { text: copy('DECK'), blocks: [
            /* the five step names are How it works' tabs and the terminal's, so this view no longer lists them again:
               the page fits the fold budget with the apps in it (a phone opens them behind one press) */
            { block: 'section-header', props: { title: copy('APPS.TITLE'), level: 3 } },
            { block: 'disclosure', id: 'download-apps-fold', props: { foldBelow: 'phone', more: 'Show the four apps', less: 'Hide the apps', blocks: [
              { block: 'card-grid', id: 'download-apps', props: { label: words('APPS.TITLE'), columns: 4, alignRows: true, items: APPS.map(function (key) {
                /* compact (redesign 2026-10-25): the platform is the name, the app is its line; the long text is gone from the card */
                var url = words('APP.' + key + '.URL'), card = { title: copy('APP.' + key + '.PLATFORMS'), description: copy('APP.' + key + '.NAME') };
                if (/^https:\/\//.test(url)) { card.href = url; card.meta = 'Download'; } else card.status = { label: 'Not published yet', tone: 'drift' };
                return card;
              }) } }] } }] },
          /* the tab names are the step names; the number is the tab's place (a tab name holds 32
             characters, and "02 / Install the trusted checkout" is 33) and the terminal says it */
          context: { blocks: [{ block: 'tabs', id: 'download-steps', was: WAS['download-steps'], props: { label: 'Local setup steps',
            items: steps.map(function (s) { return { value: s.value, label: s.title, content: s.content }; }) } }] },
          reference: { blocks: [
            { block: 'facts', props: { label: 'What a clean local start proves', columns: 1, items: [
              { term: 'Proves', value: TERMINAL[3].proves.join(' · ') }, { term: 'Does not prove', value: TERMINAL[3].not.join(' · ') }] } },
            { block: 'actions', props: { label: 'Go further', items: [{ label: guide.label, href: guide.href, tone: 'link' }, { label: 'Deploy a site with the Bundle Deployer', href: words('ASIDE.HREF'), tone: 'link' }] } }
          ] }
        },
        /* what success proves, in sight in every view; on a phone it folds behind "Show the status" */
        boundary: { tone: 'drift', title: stepTitle(3), body: copy('POINT4.TEXT') }, boundaryFold: 'phone', boundaryAside: true,
        figure: { slot: 'terminal', kind: 'illustration', caption: 'What each step looks like at the terminal: its commands with Copy, and what to expect. Commands and defaults come from the operator guide.',
          more: 'Show the terminal', less: 'Hide the terminal' },
        slots: { terminal: card },
        handlers: { 'download-previous': function () { select(active - 1, true); }, 'download-next': function () { select(active + 1, true); } },
        pager: { label: 'Continue', next: { label: sentence(words('NEXT')), href: 'route:' + manifest.meta.next },
          related: [{ label: 'Deploy a site with the Bundle Deployer', href: words('ASIDE.HREF') }, { label: 'Open the full operator guide', href: guide.href }] },
        query: function (view) { return query(view); },
        onRestore: function (params) { select(Math.max(0, Math.min(count - 1, Number(params.get('step')) || 0)), false); }
      };
      root = ArkUI.story.mount(def, host);
      /* A tab chosen by hand chooses the terminal's step (and its address). The tabs primitive
         handles the press (and Enter / Space); this only follows the result. */
      stepTabs().querySelector('[data-ark-part="tabs-list"]').addEventListener('click', function () {
        if (!syncing && shown() !== active) select(shown(), true);
      });
      var params = root.story.params();
      select(params ? Math.max(0, Math.min(count - 1, Number(params.get('step')) || 0)) : 0, false);
      root.downloadSelect = select;
      dress(root, words);
      if (!root.downloadMoments) showStep(root, active);
      /* the world loads after first paint: once it is up, it takes the chosen step; a view change moves the picture,
         so the world re-frames the window */
      if (window.ArkWorldHost && ArkWorldHost.whenReady) ArkWorldHost.whenReady(function () {
        if (!root.isConnected) return;
        var mo = root.downloadMoments;
        if (mo) mo.show(0); else showStep(root, active);
        /* the first visit in this tab plays the moments once (the steps, on a page without them), unless motion is reduced */
        var addr = root.story && root.story.params(), asked = addr && addr.get('step'), seen = false;
        try { seen = sessionStorage.getItem('defxn-download-tour') === '1'; sessionStorage.setItem('defxn-download-tour', '1'); } catch (e) { seen = false; }
        var still = ArkUI.prefersReducedMotion && ArkUI.prefersReducedMotion();
        if (mo && !seen && !still) setTimeout(function () { if (root.isConnected && !document.hidden && !mo.playing()) mo.start(); }, 1400);
        else if (!mo && !asked && !seen && !still) setTimeout(function () { if (root.isConnected && !document.hidden && !tour.on && active === 0) startTour(); }, 1400);
      });
      root.downloadTour = { start: startTour, stop: stopTour, playing: function () { return tour.on; } };
      stepTabs();
      root.querySelector('[data-story-depth] [data-ark-part="tabs-list"]').addEventListener('click', function () {
        setTimeout(function () { var h = window.ArkWorldHost; if (h && h.ready && h.scene && h.scene.refresh && h.viewFor('download') === 'download') h.scene.refresh(320); }, 30);
      });
      return root;
    }
  };
})();
