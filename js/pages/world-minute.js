/* HOW IT WORKS on the 3D world: the one page (docs/home-redesign/MINUTE-EXPERIENCE.md). It is registered as
   worldMinuteMovie. Layer: app (a page of the site); it learns no chain word beyond what its manifest says.

   ONE PAGE ON THE HUD (css/space-frame.css, docs/design/space/SPACE.md "The page layout"). The left column holds the kicker,
   the answer and this beat's sentence, then the three closer looks as tabs and the open one. The dock holds the beat ticks,
   Back / Play / Skip, the last beat's Create your identity and the one dominant action, Play the show, which plays
   js/space/shows/works.mjs in the space. The middle is the 3D's. The three closer looks (a result, the layers, a resolver's life) opens one at a time. Their step names are read
   from the worldworks manifest (WORLDWORKS.RESOLVE.STEPn.NAME, WORLDWORKS.LIFE.STEPn.LEAD), so the old chapter pages
   and this row say the same steps from one place. ?s=resolve|layers|life opens that look (the retired chapter routes
   redirect here with it); any other ?s= that is not a beat number is ignored.

   READER AND JOB. A visitor who has never seen DEFXN wants to know what it does. The page tells it in nine beats over
   60 seconds, one sentence each, while the camera flies through the real grid (the stage `movie` in
   js/world/minute-experience.js lights what the sentence names). The visitor can pause, step back and forward, skip to
   the end or leave at any time.

   WHAT THE WORLD IS TOLD  state { view:'movie', s:'1'..'9' } while mounting, select on every beat; DEFXNScene.refresh(ms)
   gives each beat's flight its length. The beat rides in the address (?s=), so a link opens the same beat, paused.

   THE CARD (beats 7 and 8) is the NFT engine's, in a layer of this page over the right of the stage, never in the canvas
   and never over the grid: DefxnSkinSite.art() loads the engine, DefxnScene.cardArt paints each art layer, DefxnSkin.recipe
   gives the chrome pieces, DefxnSkinSite.preview dresses one small sample site pane. It is review sample 263 and says so.
   The grid keeps its own look.

   MOTION. Camera flights, transforms and clips; nothing fades. The clock is one timer per beat (DEFXNMinute.clock) and the
   progress line is a CSS animation that pauses with it: a paused or finished sequence asks for no frame. Reduced motion:
   no autoplay, no flights (the kit snaps), the card shown assembled, the same nine beats stepped by hand.

   WORDS. js/content/manifests/worldminute.js, read by ArkCopy (WORLDMINUTE.*). This file writes none.

   REDUCTION TEST (docs/PRODUCT-DESIGN-LAWS.md)
   1 what happens when you ask DEFXN for something, in one line. 2 Play the show; Create your identity at the end. 3 the answer, the sentence of this beat and the part of the grid it lights. 4 the three closer looks, shut until
   asked. 5 the kicker, the beat counter and the key hint (the ticks name each beat; the keys still work). 6 nothing:
   every beat is a claim in a file. 7 beat 8, if fewer beats are wanted. 8-9 the beat or the open look rides in the
   address. 10 with no 3D the sentences, ticks, controls and looks work; if the card art fails, the pieces are listed. */
(function () {
  'use strict';
  var W = ArkUI.worldSheet, node = W.node;
  var T = function (key, vars) { return W.text('WORLDMINUTE.' + key, vars); };
  var KEY = 'works';                      /* the route this page takes over */
  var SAMPLE = '263';                     /* the NFT session's review sample the card is drawn from */
  var SEEN = 'defxn-minute-seen';
  var BEATS = 9;
  var PIECES = ['frame', 'corner', 'tag', 'ornament', 'divider', 'emblem'];
  var PARTS = ['resolve', 'layers', 'life'];
  var LAYERS = ['backdrop', 'aura', 'mark', 'signal', 'particles'];
  var SVGNS = 'http://www.w3.org/2000/svg';

  function reduced() { return ArkUI.prefersReducedMotion ? ArkUI.prefersReducedMotion() : !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function seenBefore() { try { return !!sessionStorage.getItem(SEEN); } catch (e) { return false; } }
  function markSeen() { try { sessionStorage.setItem(SEEN, '1'); } catch (e) { /* private window: the sequence plays each time */ } }
  function icon(d) { var s = document.createElementNS(SVGNS, 'svg'); s.setAttribute('viewBox', '0 0 16 16'); s.setAttribute('fill', 'currentColor'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = d; return s; }
  var PLAY = '<path d="M4 2.5v11l9-5.5z"/>', PAUSE = '<path d="M4 2.5h3v11H4zM9 2.5h3v11H9z"/>';

  /* ================================================================ the card layer */
  /* A drawing from the recipe is first-party markup. It is parsed as SVG and stripped of anything that runs, belt and braces */
  function drawing(markup) {
    var doc = new DOMParser().parseFromString(markup, 'image/svg+xml'), svg = doc.documentElement;
    if (!svg || svg.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) return null;
    [].slice.call(svg.querySelectorAll('script,foreignObject,iframe,object,embed')).forEach(function (n) { n.remove(); });
    [svg].concat([].slice.call(svg.querySelectorAll('*'))).forEach(function (n) {
      [].slice.call(n.attributes).forEach(function (a) { if (/^on/i.test(a.name) || /^(javascript:|data:)/i.test(String(a.value).trim())) n.removeAttribute(a.name); });
    });
    var out = document.importNode(svg, true); out.setAttribute('aria-hidden', 'true'); out.setAttribute('focusable', 'false');
    return out;
  }
  function makeCard(stage) {
    var box = node('div', 'wm-card'), stack = node('div', 'wm-stack'), art = node('div', 'wm-art'), chrome = node('div', 'wm-chrome');
    var cap = node('p', 'wm-cap mono', T('CARD.SAMPLE')), words = node('p', 'wm-pieces', T('CARD.PIECES'));
    var pane = node('div', 'wm-site');
    box.setAttribute('role', 'group'); box.setAttribute('aria-label', T('CARD.LABEL')); box.dataset.shown = 'false';
    pane.setAttribute('role', 'group'); pane.setAttribute('aria-label', T('SITE.LABEL'));
    pane.appendChild(node('h3', null, T('SITE.NAME'))); pane.appendChild(node('p', null, T('SITE.TEXT')));
    var open = node('button', null, T('SITE.BUTTON')); open.type = 'button'; open.tabIndex = -1; pane.appendChild(open);
    stack.appendChild(art); stack.appendChild(chrome);
    box.appendChild(stack); box.appendChild(cap); box.appendChild(pane); box.appendChild(words);
    stage.appendChild(box);
    var st = { ready: null, failed: false, shown: false, site: false, undress: null, dressing: 0, dead: false, record: null, timer: 0 };

    /* the engine and the five art layers and six pieces, loaded once */
    function load() {
      if (st.ready) return st.ready;
      st.ready = Promise.resolve().then(function () {
        if (!window.DefxnSkinSite) throw new Error('js/ark/skin-site.js is not loaded');
        return DefxnSkinSite.art();
      }).then(function () { return ArkUI.loadScript('js/nft/scene.js'); })
        .then(function () { return DefxnSkinSite.sample(SAMPLE); })
        .then(function (rec) {
          st.record = rec;
          return Promise.all([DefxnSkin.recipe(rec, {}), Promise.all(LAYERS.map(function (layer) { return DefxnScene.cardArt(rec, null, [layer], 760); }))]);
        }).then(function (got) {
          var recipe = got[0], canvases = got[1];
          if (st.dead) return;
          Object.keys(recipe.tokens || {}).forEach(function (name) { if (/^--w-/.test(name)) stack.style.setProperty(name, recipe.tokens[name]); });
          canvases.forEach(function (cv, i) {
            var layer = node('div', 'wm-l'); layer.dataset.layer = LAYERS[i]; layer.style.setProperty('--i', i);
            cv.setAttribute('aria-hidden', 'true'); layer.appendChild(cv); art.appendChild(layer);
          });
          PIECES.forEach(function (name, i) {
            var piece = recipe.chrome && recipe.chrome[name], svg = piece && piece.svg && drawing(piece.svg); if (!svg) return;
            var cell = node('div', 'wm-p'); cell.dataset.piece = name; cell.style.setProperty('--i', i);
            if (piece.mirror) cell.dataset.mirror = '';
            if (piece.viewBox) svg.setAttribute('viewBox', piece.viewBox);
            svg.setAttribute('preserveAspectRatio', name === 'frame' || name === 'divider' ? 'none' : 'xMidYMid meet');
            cell.appendChild(svg); chrome.appendChild(cell);
            if (name === 'corner') [['tr', 'x'], ['bl', 'y'], ['br', 'xy']].forEach(function (m) {
              var c2 = cell.cloneNode(true); c2.dataset.piece = 'corner-' + m[0]; c2.dataset.flip = m[1]; chrome.appendChild(c2);
            });
          });
          box.dataset.ready = 'true';
        });
      st.ready.catch(function (e) {
        st.failed = true; box.dataset.failed = 'true'; words.textContent = T('CARD.FAILED') + ' ' + T('CARD.PIECES');
        console.error('The card layer of In one minute could not draw (' + (e && e.message) + '). The sentences and the grid go on.');
      });
      return st.ready;
    }
    /* the pieces fly in, then the art layers settle into their depth: transforms only, with the layer's clip opening first */
    function join() {
      box.classList.remove('joined'); void box.offsetWidth;
      requestAnimationFrame(function () { box.classList.add('joined'); });   /* one frame, to start the transitions from the apart pose */
    }
    function dress() {
      if (!st.record || st.undress || !pane.isConnected) return;
      var token = ++st.dressing;
      DefxnSkinSite.preview(st.record, pane).then(function (undo) {
        if (st.dead || token !== st.dressing || !st.site) { undo(); return; }
        st.undress = undo;
      }).catch(function (e) { console.error('The sample site pane kept its own look (' + (e && e.message) + ').'); });
    }
    function undress() { st.dressing++; if (st.undress) { var undo = st.undress; st.undress = null; undo(); } }
    st.show = function (n) {
      var want = n === 7 || n === 8, site = n === 8;
      if (want && !st.shown) { load().then(function () { if (st.shown && !st.dead) { if (reduced()) box.classList.add('joined'); else join(); } }, function () {}); }
      st.shown = want; box.dataset.shown = String(want);
      if (want && reduced()) box.classList.add('joined');
      if (!want) box.classList.remove('joined');
      st.site = site; box.dataset.site = String(site);
      if (site) load().then(dress, function () {}); else undress();
    };
    /* the card tilts with the pointer: a transform set by an event, no loop */
    box.addEventListener('pointermove', function (e) {
      if (reduced()) return;
      var r = box.getBoundingClientRect();
      stack.style.setProperty('--ry', (((e.clientX - r.left) / r.width - .5) * 16).toFixed(1) + 'deg');
      stack.style.setProperty('--rx', ((.5 - (e.clientY - r.top) / r.height) * 12).toFixed(1) + 'deg');
    });
    box.addEventListener('pointerleave', function () { stack.style.removeProperty('--ry'); stack.style.removeProperty('--rx'); });
    st.preload = function () { st.timer = setTimeout(function () { if (!st.dead) load().catch(function () {}); }, 1500); };
    st.dispose = function () { st.dead = true; clearTimeout(st.timer); undress(); box.remove(); };
    return st;
  }

  /* ================================================================ the page */
  var WW = function (key) { return W.text('WORLDWORKS.' + key); };
  /* the lines of one closer look: its step names, read from the chapter pages' manifest, or the three layers */
  function partLines(p) {
    var out = [], i;
    if (p === 'layers') for (i = 1; i <= 3; i++) out.push(T('PART.LAYERS.L' + i));
    else for (i = 1; i <= 5; i++) out.push(p === 'resolve' ? WW('RESOLVE.STEP' + i + '.NAME') : WW('LIFE.STEP' + i + '.LEAD').replace(/\.$/, ''));
    return out;
  }
  function minuteDef() {
    var ui = {}, clock = null, card = null, ctxRef = null, first = true, asked = false;
    function renderPart(p) {
      ui.tabs.forEach(function (b) { b.setAttribute('aria-expanded', String(b.dataset.part === p)); });
      ui.panel.hidden = !p; ui.panel.textContent = ''; if (!p) return;
      ui.panel.appendChild(node('p', 'wo-line', T('PART.' + p.toUpperCase() + '.LINE')));
      var ol = node(p === 'layers' ? 'ul' : 'ol', 'wo-list');
      partLines(p).forEach(function (line) { ol.appendChild(node('li', null, line)); });
      ui.panel.appendChild(ol);
    }
    function toggle() { if (clock.playing()) clock.pause(); else clock.play(); }
    function go(n) {
      n = DEFXNMinute.clamp(n); clock.pause();
      if (n === ui.n) return;
      ctxRef.set({ n: n });
    }
    function paint() {
      var playing = clock.playing();
      ui.ticks.dataset.state = playing ? 'playing' : 'paused';
      ui.toggle.textContent = ''; ui.toggle.appendChild(icon(playing ? PAUSE : PLAY)); ui.toggle.appendChild(document.createTextNode(playing ? T('PAUSE') : (clock.ended() ? T('RESTART') : T('PLAY'))));
      ui.toggle.setAttribute('aria-pressed', String(playing));
      ui.toggle.hidden = reduced() && !clock.ended();
    }
    return {
      view: 'movie', key: KEY, titleId: 'wm-title', here: 'WORLDMINUTE.HERE', note: 'WORLDMINUTE.NOTE',
      /* ?s= is a beat number or the name of a closer look; a look opens with the sequence paused at beat 1 */
      parse: function (q) {
        var s = q.get('s'), part = PARTS.indexOf(s) >= 0 ? s : '';
        asked = q.has('s'); return { n: part ? 1 : W.clamp(s, 1, BEATS, 1), part: part };
      },
      query: function (st) { return st.part ? 's=' + st.part : st.n > 1 ? 's=' + st.n : ''; },
      world: function (st) { return W.state('movie', { s: String(st.n) }); },
      build: function (ctx) {
        ctxRef = ctx; var f = ctx.f;
        ui.n = 0;
        f.page.classList.add('wp-minute');
        card = makeCard(f.stage); card.preload();
        ArkUI.loadStyles({ styles: ['css/works-one.css'] }).catch(function (e) { console.error('css/works-one.css did not load (' + (e && e.message) + '), so the closer looks show unstyled.'); });
        /* THE HUD (css/space-frame.css): words on the left, the sequence in the dock, the middle left to the 3D */
        f.page.classList.add('hud');
        var left = f.page.appendChild(node('div', 'hud-left')), dock = f.page.appendChild(node('div', 'hud-dock'));
        left.appendChild(node('p', 'hud-kicker', T('KICKER')));
        var h = left.appendChild(node('h1', 'hud-title')); h.id = 'wm-title'; h.textContent = T('ANSWER');
        ui.say = left.appendChild(node('p', 'hud-answer wm-say')); ui.say.setAttribute('aria-live', 'polite');
        ui.ticks = dock.appendChild(node('ol', 'wm-ticks')); ui.ticks.setAttribute('aria-label', T('BEATS.LABEL'));
        ui.fills = [];
        for (var i = 1; i <= BEATS; i++) {
          var li = node('li'), b = node('button'), fill = node('i'); b.type = 'button'; b.dataset.n = String(i); b.appendChild(fill);
          b.setAttribute('aria-label', T('TICK.LABEL', { n: i, name: T('BEAT' + i + '.NAME') })); b.title = T('BEAT' + i + '.NAME');
          li.appendChild(b); ui.ticks.appendChild(li); ui.fills.push(b);
        }
        ui.ticks.addEventListener('click', function (e) { var b = e.target.closest('button[data-n]'); if (b) go(+b.dataset.n); });
        function chip(text) { var c = node('button', 'hud-chip', text); c.type = 'button'; return dock.appendChild(c); }
        ui.back = chip(T('BACK')); ui.back.addEventListener('click', function () { go(ui.n - 1); });
        ui.toggle = chip(); ui.toggle.addEventListener('click', toggle);
        ui.skip = chip(T('SKIP')); ui.skip.addEventListener('click', function () { go(BEATS); });
        /* the last beat's one way on is a chip, so the show stays the dominant action */
        ui.end = dock.appendChild(node('a', 'hud-chip', T('END.CTA'))); W.fieldTo(ui.end, 'WORLDMINUTE.END.CTA.HREF');
        var show = dock.appendChild(node('button', 'hud-go', T('SHOW.GO'))); show.type = 'button';
        show.addEventListener('click', function () {
          clock.pause();
          import('/js/space/shows/works.mjs').then(function (m) {
            if (!window.ArkSpace) throw new Error('window.ArkSpace is missing, so the 3D space never loaded');
            ArkSpace.whenReady(function (space) { space.play(m.SHOW); });
          }).catch(function (e) { console.error('The show did not play (' + (e && e.message) + '). The nine beats still work.'); });
        });
        /* the closer looks: disclosure buttons, one open at a time; opening one pauses the sequence so the words hold still */
        var row = left.appendChild(node('div', 'hud-tabs')); row.setAttribute('role', 'group'); row.setAttribute('aria-label', T('PARTS.LABEL'));
        ui.tabs = PARTS.map(function (p) {
          var b = node('button', 'wo-tab', T('PART.' + p.toUpperCase() + '.NAME')); b.type = 'button'; b.dataset.part = p; b.setAttribute('aria-controls', 'wo-panel');
          row.appendChild(b); return b;
        });
        row.addEventListener('click', function (e) {
          var b = e.target.closest('button[data-part]'); if (!b) return;
          var p = ctxRef.st.part === b.dataset.part ? '' : b.dataset.part; if (p) clock.pause(); ctxRef.set({ part: p });
        });
        ui.panel = left.appendChild(node('div', 'hud-body wo-panel')); ui.panel.id = 'wo-panel';
        clock = DEFXNMinute.clock({
          start: ctx.st.n, reduced: reduced(),
          onBeat: function (n) { ctx.set({ n: n }); },
          onEnd: function () { paint(); },
          onState: function () { paint(); }
        });
        ctx.dispose = function () { clock.stop(); card.dispose(); };
      },
      render: function (st, ctx) {
        var n = st.n, was = ui.n; ui.n = n;
        clock.sync(n);
        renderPart(st.part);
        ui.say.textContent = ''; ui.say.appendChild(node('span', null, T('BEAT' + n + '.SAY')));
        ui.fills.forEach(function (b, i) {
          var m = i + 1; b.classList.toggle('done', m < n); b.classList.toggle('on', m === n);
          if (m === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
          var fill = b.firstChild;
          if (m === n && was !== n) { fill.style.animation = 'none'; void fill.offsetWidth; fill.style.animation = ''; }
          fill.style.setProperty('--beat', DEFXNMinute.SECONDS[i] + 's');
        });
        ui.back.disabled = n === 1;
        ui.end.hidden = n !== BEATS;
        paint();
        W.tags(ctx.f.tags, [{ id: 'focus', name: T('BEAT' + n + '.TAG.NAME'), sub: T('BEAT' + n + '.TAG.SUB'), cls: 'hot' }]);
        card.show(n);
        /* each beat's flight has its own length; the first draw is the mount, whose pose the world takes by itself */
        if (!first && window.DEFXNScene && DEFXNScene.refresh && DEFXNScene.debug && DEFXNScene.debug().view === 'movie') DEFXNScene.refresh(reduced() ? 0 : DEFXNMinute.flight(n));
        if (first) {
          first = false; markSeen();
          /* a link with ?s= opens that beat paused; a first visit plays; a return visit waits for Play; reduced motion never plays */
          if (!asked && !reduced() && !ctx.def.returning) clock.play();
        }
      },
      keys: function (e, st, ctx) {
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        var k = e.key, onControl = e.target && e.target.closest && e.target.closest('button,a');
        if (k === 'ArrowRight') { e.preventDefault(); go(st.n + 1); }
        else if (k === 'ArrowLeft') { e.preventDefault(); go(st.n - 1); }
        else if (k === 'Home') { e.preventDefault(); go(1); }
        else if (k === 'End') { e.preventDefault(); go(BEATS); }
        else if (k === 'Escape') clock.pause();
        else if ((k === ' ' && !onControl) || k === 'k' || k === 'K') { e.preventDefault(); toggle(); }
      }
    };
  }

  /* a return visit in the same session waits for Play: the flag is read before this mount sets it */
  var base = W.page(function () { var d = minuteDef(); d.returning = seenBefore(); return d; });
  ArkUI.pageModules.worldMinuteMovie = base;
})();
