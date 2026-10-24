/* The How it works pages and /trace on the 3D world. Ported from docs/home-redesign (concept-views.js, app.js, trace-view.js,
   home-mockup.html) on the shared frame js/pages/world-sheet.js. How it works is one sequence in space: four chapters in
   order (/how-it-works, /how-it-works/resolve, /how-it-works/layers, /how-it-works/life); the camera pans from one to
   the next and the words are meant to leave and arrive sideways in the same direction (docs/home-redesign/app.js
   dirOf, MOTION-SPEC.md). Each page names its place in the sequence with data-chapter and data-chapter-index on the
   page element, so the host can pick the direction; this file moves no camera.

   Words: the worldworks manifest (WORLDWORKS.*, read by ArkCopy); the shared chrome is WORLDMEASURE.COMMON.*. Numbers and
   names: the data files (js/content/capabilities-data.js and resolvers-data.js for the counts on Three layers,
   js/content/records-sample.js for the records on /trace). Nothing here is live.

   WHAT THE WORLD IS TOLD (see world-sheet.js: state() while mounting, select() on a choice, on() for 3D clicks)
     minute   state { view:'minute',  s:'1'..'5' }  select on a new idea
     resolve  state { view:'resolve', step:1..5 }   select on a new step                   arrow keys move the step
     layers   state { view:'layers',  s:'0'..'2' }  select on a new layer
     life     state { view:'life',    s:'1'..'5' }  select on a new step
     trace    state { view:'trace',   s:<record id> } select on a new record               on('pick'): a record in 3D

   REDUCTION TEST (from docs/home-redesign/concept-views.js, app.js and trace-view.js, kept)
   minute  1 what DEFXN is. 2 Next idea, then See how a result is made. 3 the five ideas, one at a time. 4 the closing line
     (FXN, DAOs). 5 nothing. 6 nothing. 7 nothing. 8-9 the idea rides in the address. 10 the words read alone; the network
     only lights what they say.
   resolve 1 how one signed result is made. 2 Next step, then Create your identity. 3 the step in front of you, and that you
     choose whom to trust before you send. 4 the other steps, one line each. 5 nothing. 6 nothing. 7 nothing. 8-9 the step
     rides in the address. 10 an illustration: it says so, and the steps read with no 3D.
   layers  1 the three layers and their one rule each. 2 See the life of a resolver. 3 what each layer holds. 4 the
     capability and resolver counts, from their data files. 5 nothing. 6 nothing. 7 nothing. 8-9 the layer rides in the
     address. 10 an illustration: it says so.
   life    1 a resolver's path from build to inspect. 2 Next step, then See the resolvers. 3 the step, and that launched is
     not served. 4 the other steps. 5 nothing. 6 nothing. 7 nothing. 8-9 the step rides in the address. 10 an
     illustration: it says so.
   trace   1 where one record leads. 2 Open this record. 3 the chain's records from newest to first, each with the record it
     links to. 4 the record's links (a second choice). 5 nothing. 6 nothing. 7 nothing more. 8-9 the record rides in the
     address. 10 a record missing a field says "Not signed in this sample"; the list reads with no 3D. */
(function () {
  'use strict';
  var W = ArkUI.worldSheet, node = W.node;
  var T = function (key, vars) { return W.text('WORLDWORKS.' + key, vars); };
  var CHAPTERS = [['MINUTE', 'works'], ['RESOLVE', 'works/resolve'], ['LAYERS', 'works/layers'], ['LIFE', 'works/life']];
  var CHECK = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2.5 7.5l3 3 6-7"/></svg>';

  /* the strip of four chapters: where you are, and the way to the next */
  function chapters(f, here) {
    var nav = f.add(node('nav', 'chapters')); nav.setAttribute('aria-label', T('CHAPTER.LABEL'));
    CHAPTERS.forEach(function (c, i) {
      var a = W.link(node('a'), c[1]); a.appendChild(node('span', null, String(i + 1))); a.appendChild(document.createTextNode(T('CHAPTER.' + c[0])));
      if (c[0] === here) a.setAttribute('aria-current', 'page');
      nav.appendChild(a);
    });
    f.page.dataset.chapter = here.toLowerCase(); f.page.dataset.chapterIndex = String(CHAPTERS.map(function (c) { return c[0]; }).indexOf(here));
    return nav;
  }
  function foot(f) {
    var box = node('div', 'wp-foot'), cta = W.cta('small'), more = node('a', 'more');
    box.appendChild(cta); box.appendChild(more); f.add(box); return { box: box, cta: cta, more: more };
  }
  /* a link to the same page with another choice: the page changes it in place; a link out is a router link */
  function inPage(a, key, query, patch) {
    delete a.dataset.sceneLink; a.href = W.href(key, query); a.dataset.patch = JSON.stringify(patch); return a;
  }
  function outLink(a, key, query) { delete a.dataset.patch; return W.link(a, key, query); }
  function onPatch(ctx, root) {
    root.addEventListener('click', function (e) {
      var a = e.target.closest('[data-patch]'); if (!a || !root.contains(a)) return;
      ctx.stay(e, JSON.parse(a.dataset.patch));
    });
  }
  /* the numbered steps: every row stays, the open one shows its words */
  function story(items, at, key, queryOf, patchOf) {
    var ol = node('ol', 'story');
    items.forEach(function (it, i) {
      var n = i + 1, li = node('li'), a = node('a', n < at ? 'done' : '');
      inPage(a, key, queryOf(n), patchOf(n)); if (n === at) a.setAttribute('aria-current', 'step');
      var num = node('span', 'n'); num.appendChild(node('i', null, String(n))); num.insertAdjacentHTML('beforeend', CHECK);
      a.appendChild(num); a.appendChild(node('b', null, it.lead.replace(/\.$/, ''))); var say = node('span', 'say'); say.appendChild(node('span', null, it.rest)); a.appendChild(say);
      li.appendChild(a); ol.appendChild(li);
    });
    return ol;
  }
  function steps(area, count) {
    var out = [];
    for (var i = 1; i <= count; i++) out.push({ lead: T(area + '.STEP' + i + '.LEAD'), rest: T(area + '.STEP' + i + '.REST') });
    return out;
  }
  function title(h, key, n) { W.title(h, T(key), n ? T(n) : ''); }

  /* ================================================================ /how-it-works: In one minute */
  function minuteDef() {
    var ui = {};
    return {
      view: 'minute', key: 'works', titleId: 'ww-minute-title', here: 'WORLDWORKS.HERE', note: 'WORLDWORKS.MINUTE.NOTE',
      parse: function (q) { return { n: W.clamp(q.get('s'), 1, 5, 1) }; },
      query: function (st) { return st.n > 1 ? 's=' + st.n : ''; },
      world: function (st) { return W.state('minute', { s: String(st.n) }); },
      build: function (ctx) {
        var f = ctx.f;
        f.add(node('p', 'eyebrow-dot mono', T('MINUTE.KICKER')));
        chapters(f, 'MINUTE');
        var h = f.add(node('h1', 'two'), true); h.id = 'ww-minute-title'; W.title(h, T('MINUTE.TITLE'), T('MINUTE.TITLE2'));
        ui.lede = f.add(node('p', 'sheet-lede'), true);
        ui.body = f.add(node('div', 'cbody'), true);
        ui.foot = foot(f); onPatch(ctx, f.sheet);
      },
      render: function (st, ctx) {
        var n = st.n;
        ui.lede.textContent = ''; ui.lede.hidden = n !== 1 && n !== 5;
        if (!ui.lede.hidden) ui.lede.appendChild(node('span', null, T(n === 1 ? 'MINUTE.LEDE.FIRST' : 'MINUTE.LEDE.LAST')));
        ui.body.textContent = ''; ui.body.appendChild(story(steps('MINUTE', 5), n, 'works', function (i) { return i > 1 ? 's=' + i : ''; }, function (i) { return { n: i }; }));
        var cta = ui.foot.cta, more = ui.foot.more;
        if (n < 5) { inPage(cta, 'works', 's=' + (n + 1), { n: n + 1 }); cta.say.textContent = T('MINUTE.CTA.NEXT'); }
        else { W.fieldTo(cta, 'WORLDWORKS.MINUTE.CTA.RESOLVE.HREF'); delete cta.dataset.patch; cta.say.textContent = T('MINUTE.CTA.RESOLVE'); }
        more.hidden = n === 1; more.textContent = T('MINUTE.BACK'); if (n > 1) inPage(more, 'works', n - 1 > 1 ? 's=' + (n - 1) : '', { n: n - 1 });
        W.tags(ctx.f.tags, [{ id: 'focus', name: T('MINUTE.TAG' + n + '.NAME'), sub: T('MINUTE.TAG' + n + '.SUB'), cls: 'hot' }]);
      }
    };
  }

  /* ================================================================ /how-it-works/resolve: How a result is made */
  function resolveDef() {
    var ui = {};
    var TAGS = [['alice', 'ALICE', ''], ['bob', 'BOB', ' below'], ['resolver', 'RESOLVER', ''], ['result', 'RESULT', ''], ['copies', 'COPIES', ''],
      ['c1', 'C1', 'lit below'], ['c2', 'C2', 'lit right'], ['c3', 'C3', 'lit right']];
    return {
      view: 'resolve', key: 'works/resolve', titleId: 'ww-resolve-title', here: 'WORLDWORKS.HERE', note: false,
      parse: function (q) { return { n: W.clamp(q.get('step'), 1, 5, 1) }; },
      query: function (st) { return st.n > 1 ? 'step=' + st.n : ''; },
      world: function (st) { return W.state('resolve', { step: st.n }); },
      keys: function (e, st, ctx) {
        var d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0; if (d) ctx.set({ n: Math.min(5, Math.max(1, st.n + d)) });
      },
      build: function (ctx) {
        var f = ctx.f;
        /* the five segments under the stage: the step, and an illustration's note */
        ui.segs = node('div', 'wp-segs rise'); ui.segs.setAttribute('role', 'group'); ui.segs.setAttribute('aria-label', T('RESOLVE.SEGS'));
        for (var i = 1; i <= 5; i++) { var b = node('button'); b.type = 'button'; b.dataset.seg = i; b.setAttribute('aria-label', T('RESOLVE.SEG', { n: i })); ui.segs.appendChild(b); }
        ui.segs.appendChild(node('span', 'mono', T('RESOLVE.NOTE'))); f.stage.parentNode.appendChild(ui.segs);
        f.add(node('p', 'eyebrow-dot mono', T('RESOLVE.KICKER')));
        chapters(f, 'RESOLVE');
        ui.title = f.add(node('h1', 'two'), true); ui.title.id = 'ww-resolve-title'; ui.title.setAttribute('aria-live', 'polite');
        ui.steps = f.add(node('ol', 'story'));
        for (var s = 1; s <= 5; s++) {
          var li = node('li'), btn = node('button'); btn.type = 'button'; btn.dataset.step = s;
          var num = node('span', 'n'); num.appendChild(node('i', null, String(s))); num.insertAdjacentHTML('beforeend', CHECK);
          btn.appendChild(num); btn.appendChild(node('b', null, T('RESOLVE.STEP' + s + '.NAME'))); var say = node('span', 'say'); say.appendChild(node('span', null, T('RESOLVE.STEP' + s + '.TEXT'))); btn.appendChild(say);
          li.appendChild(btn); ui.steps.appendChild(li);
        }
        var aside = f.add(node('p', 'aside')); aside.appendChild(document.createTextNode(T('RESOLVE.ASIDE') + ' '));
        aside.appendChild(W.field(node('a', null, T('RESOLVE.ASIDE.LINK')), 'WORLDWORKS.RESOLVE.ASIDE.HREF'));
        ui.foot = foot(f);
        ui.steps.addEventListener('click', function (e) { var b = e.target.closest('[data-step]'); if (b) ctx.set({ n: +b.dataset.step }); });
        ui.segs.addEventListener('click', function (e) { var b = e.target.closest('[data-seg]'); if (b) ctx.set({ n: +b.dataset.seg }); });
        ui.foot.cta.addEventListener('click', function (e) { if (ctx.st.n < 5 && W.plainClick(e)) { e.preventDefault(); ctx.set({ n: ctx.st.n + 1 }); } });
        ui.foot.more.addEventListener('click', function (e) { if (W.plainClick(e)) { e.preventDefault(); ctx.set({ n: Math.max(1, ctx.st.n - 1) }); } });
        W.tags(f.tags, TAGS.map(function (t) {
          var cls = t[2].split(' ').filter(function (x) { return x === 'lit'; }).join(' '), at = t[2].split(' ').filter(function (x) { return x && x !== 'lit'; })[0];
          return { id: t[0], name: T('RESOLVE.TAG.' + t[1] + '.NAME'), sub: T('RESOLVE.TAG.' + t[1] + '.SUB'), cls: cls, at: at };
        }));
      },
      render: function (st) {
        var n = st.n;
        W.title(ui.title, T('STEP', { n: n }), T('RESOLVE.STEP' + n + '.NAME') + '.');
        [].slice.call(ui.steps.querySelectorAll('[data-step]')).forEach(function (b, i) {
          b.classList.toggle('done', i + 1 < n);
          if (i + 1 === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
        });
        [].slice.call(ui.segs.querySelectorAll('[data-seg]')).forEach(function (b, i) { b.classList.toggle('on', i < n); b.setAttribute('aria-current', i + 1 === n ? 'step' : 'false'); });
        var cta = ui.foot.cta, last = n === 5;
        if (last) { W.fieldTo(cta, 'WORLDWORKS.RESOLVE.CTA.LAST.HREF'); cta.say.textContent = T('RESOLVE.CTA.LAST'); }
        else { delete cta.dataset.sceneLink; cta.href = W.href('works/resolve', 'step=' + (n + 1)); cta.say.textContent = T('RESOLVE.CTA.NEXT'); }
        var back = ui.foot.more; back.hidden = n === 1; back.textContent = T('RESOLVE.BACK'); back.href = W.href('works/resolve', n - 1 > 1 ? 'step=' + (n - 1) : '');
      }
    };
  }

  /* ================================================================ /how-it-works/layers: Three layers */
  function layersDef() {
    var ui = {};
    return {
      view: 'layers', key: 'works/layers', titleId: 'ww-layers-title', here: 'WORLDWORKS.HERE', note: 'WORLDWORKS.LAYERS.NOTE',
      parse: function (q) { return { n: W.clamp(q.get('s'), 0, 2, 0) }; },
      query: function (st) { return st.n > 0 ? 's=' + st.n : ''; },
      world: function (st) { return W.state('layers', { s: String(st.n) }); },
      build: function (ctx) {
        var f = ctx.f;
        f.add(node('p', 'eyebrow-dot mono', T('LAYERS.KICKER')));
        chapters(f, 'LAYERS');
        var h = f.add(node('h1', 'two'), true); h.id = 'ww-layers-title'; W.title(h, T('LAYERS.TITLE'), T('LAYERS.TITLE2'));
        f.add(node('p', 'sheet-lede', T('LAYERS.LEDE')), true);
        ui.body = f.add(node('div', 'cbody'), true);
        var cs = ((window.DEFXN_CAPABILITIES || {}).capabilities || []).length, rs = ((window.DEFXN_RESOLVERS || {}).resolvers || []).length;
        if (cs && rs) f.add(node('p', 'aside', T('LAYERS.ASIDE', { caps: cs, resolvers: rs })));
        ui.foot = foot(f); W.fieldTo(ui.foot.cta, 'WORLDWORKS.LAYERS.CTA.HREF'); ui.foot.cta.say.textContent = T('LAYERS.CTA');
        ui.foot.more.textContent = T('LAYERS.LINK'); W.fieldTo(ui.foot.more, 'WORLDWORKS.LAYERS.LINK.HREF');
        onPatch(ctx, f.sheet);
      },
      render: function (st, ctx) {
        var ol = node('ol', 'rows-pick');
        [2, 1, 0].forEach(function (i) {
          var li = node('li'), a = node('a'); inPage(a, 'works/layers', i > 0 ? 's=' + i : '', { n: i }); if (i === st.n) a.setAttribute('aria-current', 'true');
          a.appendChild(node('b', null, T('LAYERS.L' + (i + 1) + '.NAME')));
          var say = node('span', 'say'), inner = node('span', null, T('LAYERS.L' + (i + 1) + '.HOLDS')); inner.appendChild(node('em', null, T('LAYERS.RULE', { rule: T('LAYERS.L' + (i + 1) + '.RULE') }))); say.appendChild(inner); a.appendChild(say);
          li.appendChild(a); ol.appendChild(li);
        });
        ui.body.textContent = ''; ui.body.appendChild(ol);
        W.tags(ctx.f.tags, [0, 1, 2].map(function (i) { return { id: 'plate-' + i, name: T('LAYERS.L' + (i + 1) + '.NAME'), at: 'left', cls: i === st.n ? 'hot' : '' }; }));
      }
    };
  }

  /* ================================================================ /how-it-works/life: Life of a resolver */
  function lifeDef() {
    var ui = {};
    return {
      view: 'life', key: 'works/life', titleId: 'ww-life-title', here: 'WORLDWORKS.HERE', note: 'WORLDWORKS.LIFE.NOTE',
      parse: function (q) { return { n: W.clamp(q.get('s'), 1, 5, 1) }; },
      query: function (st) { return st.n > 1 ? 's=' + st.n : ''; },
      world: function (st) { return W.state('life', { s: String(st.n) }); },
      build: function (ctx) {
        var f = ctx.f;
        f.add(node('p', 'eyebrow-dot mono', T('LIFE.KICKER')));
        chapters(f, 'LIFE');
        ui.title = f.add(node('h1', 'two'), true); ui.title.id = 'ww-life-title';
        f.add(node('p', 'sheet-lede', T('LIFE.LEDE')), true);
        ui.body = f.add(node('div', 'cbody'), true);
        ui.foot = foot(f); onPatch(ctx, f.sheet);
      },
      render: function (st, ctx) {
        var n = st.n;
        W.title(ui.title, T('STEP', { n: n }), T('LIFE.STEP' + n + '.LEAD'));
        ui.body.textContent = ''; ui.body.appendChild(story(steps('LIFE', 5), n, 'works/life', function (i) { return i > 1 ? 's=' + i : ''; }, function (i) { return { n: i }; }));
        /* the note on launched and served belongs to the step where the two part: Serve */
        if (n === 4) ui.body.appendChild(node('p', 'aside', T('LIFE.ASIDE')));
        var cta = ui.foot.cta, more = ui.foot.more;
        if (n < 5) { inPage(cta, 'works/life', 's=' + (n + 1), { n: n + 1 }); cta.say.textContent = T('LIFE.CTA.NEXT'); }
        else { W.fieldTo(cta, 'WORLDWORKS.LIFE.CTA.LAST.HREF'); delete cta.dataset.patch; cta.say.textContent = T('LIFE.CTA.LAST'); }
        more.hidden = n === 1; more.textContent = T('LIFE.BACK'); if (n > 1) inPage(more, 'works/life', n - 1 > 1 ? 's=' + (n - 1) : '', { n: n - 1 });
        var served = n >= 4;
        W.tags(ctx.f.tags, [['caps', 'CAPS', ''], ['grammar', 'GRAMMAR', ''], ['chain', 'CHAIN', ''], ['key', 'KEY', ''], ['provider', 'PROVIDER', '']].map(function (t) {
          return { id: t[0], name: T('LIFE.TAG.' + t[1] + '.NAME'), sub: ArkCopy.has('WORLDWORKS.LIFE.TAG.' + t[1] + '.SUB') ? T('LIFE.TAG.' + t[1] + '.SUB') : '' };
        }).concat([{ id: 'state', name: T(served ? 'LIFE.TAG.SERVED.NAME' : 'LIFE.TAG.LAUNCHED.NAME'), sub: T(served ? 'LIFE.TAG.SERVED.SUB' : 'LIFE.TAG.LAUNCHED.SUB'), cls: 'hot' }]));
      }
    };
  }

  /* ================================================================ /trace: Trace a record */
  function traceDef() {
    var R = window.DEFXN_RECORDS, list = R ? R.records : [], ui = {};
    function indexOf(id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return i; return 0; }
    return {
      view: 'trace', key: 'trace', titleId: 'ww-trace-title', here: 'WORLDWORKS.TRACE.HERE', note: 'WORLDWORKS.TRACE.NOTE',
      parse: function (q) { return { i: indexOf(q.get('s')) }; },
      query: function (st) { return st.i > 0 && list[st.i] ? 's=' + encodeURIComponent(list[st.i].id) : ''; },
      world: function (st) { return W.state('trace', { s: list[st.i] ? list[st.i].id : null }); },
      picks: { pick: function (a, b, ctx) { var p = W.picked(a, b); if (p.index != null && list[p.index]) ctx.set({ i: p.index }); } },
      build: function (ctx) {
        var f = ctx.f;
        f.add(node('p', 'eyebrow-dot mono', T('TRACE.KICKER')));
        var h = f.add(node('h1', 'two')); h.id = 'ww-trace-title'; W.title(h, T('TRACE.TITLE'), T('TRACE.TITLE2'));
        f.add(node('p', 'sheet-lede', T('TRACE.LEDE')));
        /* the list is built once; a new choice moves aria-current, so the rows never rebuild under the pointer */
        ui.list = f.add(node('ol', 'trace')); ui.list.setAttribute('aria-label', T('TRACE.LIST'));
        list.forEach(function (r, i) {
          var older = list[i + 1], first = i === list.length - 1, li = node('li'), a = node('a');
          a.href = W.href('trace', i > 0 ? 's=' + encodeURIComponent(r.id) : ''); a.dataset.patch = JSON.stringify({ i: i });
          a.appendChild(node('span', 'n mono', '#' + W.pad(list.length - i)));
          var b = node('b', null, r.title); if (first) { b.appendChild(document.createTextNode(' ')); b.appendChild(W.badge(T('TRACE.GENESIS'))); b.lastChild.dataset.state = 'built'; } a.appendChild(b);
          a.appendChild(node('small', null, (r.revision ? T('TRACE.REV', { n: W.pad(r.revision) }) + ' · ' : '') + r.date + ' · ' + (r.signedBy ? T('TRACE.SIGNED', { who: r.signedBy }) : T('TRACE.UNSIGNED'))));
          a.appendChild(node('small', 'to', older ? T('TRACE.LINKS', { title: older.title }) : T('TRACE.FIRST')));
          li.appendChild(a); ui.list.appendChild(li);
        });
        ui.foot = foot(f); ui.foot.cta.say.textContent = T('TRACE.CTA'); ui.foot.more.textContent = T('TRACE.LINK');
        onPatch(ctx, f.sheet);
      },
      render: function (st, ctx) {
        var r = list[st.i]; if (!r) return;
        [].slice.call(ui.list.querySelectorAll('a')).forEach(function (a, i) { a.setAttribute('aria-current', i === st.i); });
        W.fieldTo(ui.foot.cta, 'WORLDWORKS.TRACE.CTA.HREF', 'r=' + encodeURIComponent(r.id));
        W.fieldTo(ui.foot.more, 'WORLDWORKS.TRACE.LINK.HREF', 'r=' + encodeURIComponent(r.id));
        /* labels for the stage's 3D: the newest record (or the chosen one), the one before it, and the first one */
        W.tags(ctx.f.tags, [{ id: 'newest', name: '#' + W.pad(list.length - st.i) + ' ' + r.title, sub: st.i === 0 ? T('TRACE.TAG.NEWEST') : T('TRACE.TAG.CHOSEN'), cls: 'hot' },
          { id: 'prev', name: T('TRACE.TAG.PREV.NAME'), sub: list[1] ? T('TRACE.TAG.PREV.SUB', { title: list[1].title }) : '' },
          { id: 'genesis', name: T('TRACE.TAG.GENESIS.NAME'), sub: T('TRACE.TAG.GENESIS.SUB', { title: list[list.length - 1].title }) }]);
      }
    };
  }

  function page(def) { return W.page(def); }
  ArkUI.pageModules.worldMinute = page(minuteDef);
  ArkUI.pageModules.worldResolve = page(resolveDef);
  ArkUI.pageModules.worldLayers = page(layersDef);
  ArkUI.pageModules.worldLife = page(lifeDef);
  ArkUI.pageModules.worldTrace = page(traceDef);
})();
