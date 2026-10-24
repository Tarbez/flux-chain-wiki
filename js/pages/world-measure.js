/* The measure pages on the 3D world: /resolvers, /measured, /fxn and /ring. Ported from docs/home-redesign (app.js,
   ring-view.js, home-mockup.html) on the shared frame js/pages/world-sheet.js; each page stands on its own 3D view
   (js/world/world-host.js) and carries only the words, the pickers and the panel.

   Words: the worldmeasure manifest (WORLDMEASURE.*, read by ArkCopy). Numbers and names: the data files, never typed
   here: js/content/resolvers-data.js, capabilities-data.js (with its two dated runs), fxn-data.js and network-data.js.
   Nothing is live (devnet), so no page says "Live" and a fact the data does not give says "Not in its manifest".

   WHAT THE WORLD IS TOLD (see world-sheet.js: state() while mounting, select() on a choice, on() for 3D clicks)
     resolvers  state { view:'resolvers', id }              select on a new resolver       on('pick'): a resolver cube picks it
     measured   state { view:'measured', c, tab }           select on a capability or tab  on('pick'): a capability column
     fxn        state { view:'fxn', g, tab }                select on a part or tab        on('pick'): a supply tile
     ring       state { view:'ring', i }                    select on a new ring           on('pickRing'): a ring of the network

   REDUCTION TEST (from docs/home-redesign/app.js and ring-view.js, kept)
   resolvers 1 what one resolver is built from. 2 See its capabilities. 3 its grammar, its capabilities, its price, who
     can change it. 4 the other resolvers (chips). 5 nothing. 6 the command count: left out. 7 nothing more. 8-9 the
     address holds the resolver. 10 a fact the manifest does not give says "Not in its manifest"; the words read with no 3D.
   measured  1 what is measured today. 2 See resolvers that use it. 3 a capability's checked cases, and that its speed is
     not measured yet. 4 the benchmark runs (tab). 5 nothing. 6 nothing. 7 nothing more. 8-9 the address holds the
     capability and the tab. 10 the runs name their records, dates and sources; the words read with no 3D.
   fxn       1 the starting supply, as decisions. 2 Create your identity (the sale is per identity). 3 the parts and the
     rule for the chosen part. 4 fees and money (tabs). 5 nothing. 6 nothing. 7 nothing more. 8-9 the address holds the
     part and the tab. 10 the page says these are decisions, mostly not in code.
   ring      1 what one kind of chain is. 2 the kind's next step. 3 the kind, its coin if it has one, what it holds.
     4 the other kinds (chips). 5 nothing. 6 nothing. 7 nothing more. 8-9 the address holds the ring. 10 every ring but
     the named networks says it shows a kind, not a live chain; the page reads with no 3D. */
(function () {
  'use strict';
  var W = ArkUI.worldSheet, node = W.node;
  var T = function (key, vars) { return W.text('WORLDMEASURE.' + key, vars); };
  function title(id) { return id.charAt(0).toUpperCase() + id.slice(1); }
  function list(data, key) { var d = window[data]; return d && d[key] ? d[key] : []; }
  function resolvers() { return list('DEFXN_RESOLVERS', 'resolvers'); }
  function caps() { return list('DEFXN_CAPABILITIES', 'capabilities'); }
  function dl(cls) { return node('dl', cls); }
  function chipsOf(items) {
    var box = node('span', 'chips');
    items.forEach(function (it) { box.appendChild(it); });
    return box;
  }
  /* the foot of a sheet: the page's one action and one quiet link */
  function foot(f) {
    var box = node('div', 'wp-foot'), cta = W.cta('small'), more = node('a', 'more');
    box.appendChild(cta); box.appendChild(more); f.add(box);
    return { box: box, cta: cta, more: more };
  }
  /* a row of pickers: a pill for each, the chosen one pressed; a long row folds on a short page behind "Show all N" */
  function folding(box, count, fold) {
    box.addEventListener('click', function (e) {
      if (!e.target.closest('.chips-all')) return;
      fold.open = !fold.open; foldButton(box, count(), fold.open);
    });
  }
  function foldButton(box, count, expanded) {
    var b = box.querySelector('.chips-all');
    if (count <= 5) { if (b) b.remove(); return; }
    if (!b) { b = node('button', 'chips-all'); b.type = 'button'; box.appendChild(b); }
    box.classList.toggle('all', !!expanded);
    b.textContent = expanded ? T('COMMON.FEWER') : T('COMMON.ALL', { n: count });
    b.setAttribute('aria-expanded', !!expanded);
  }

  /* ================================================================ /resolvers */
  function resolversDef() {
    var RES = resolvers(), fold = { open: false };
    var ui = {};
    function capLink(c) { var a = W.link(node('a', null, title(c)), 'measured', 'c=' + c); return a; }
    return {
      view: 'resolvers', key: 'resolvers', titleId: 'wm-resolvers-title', here: 'WORLDMEASURE.RESOLVERS.HERE',
      note: function () {
        var prices = {}; RES.forEach(function (x) { prices[x.price || '—'] = (prices[x.price || '—'] || 0) + 1; });
        var usual = Object.keys(prices).sort(function (a, b) { return prices[b] - prices[a]; })[0] || '—';
        ui.usual = usual;
        return RES.length ? T('RESOLVERS.NOTE', { price: usual.toLowerCase(), n: prices[usual], total: RES.length }) : '';
      },
      parse: function (q) { var r = W.pick(RES, q.get('id')); return { id: r ? r.id : null }; },
      query: function (st) { return st.id && RES[0] && st.id !== RES[0].id ? 'id=' + st.id : ''; },
      world: function (st) { return W.state('resolvers', { id: st.id }); },
      picks: { pick: function (a, b, ctx) { var p = W.picked(a, b); if (p.kind === 'resolver' && p.id) ctx.set({ id: p.id }); } },
      keys: function (e, st, ctx) {
        var d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0; if (!d || !RES.length) return;
        var i = RES.findIndex(function (r) { return r.id === st.id; }); ctx.set({ id: RES[(i + d + RES.length) % RES.length].id });
      },
      build: function (ctx) {
        ui.kicker = ctx.f.add(node('p', 'eyebrow-dot mono'));
        ui.title = ctx.f.add(node('h1', 'two'), true); ui.title.id = 'wm-resolvers-title';
        ui.line = ctx.f.add(node('p', 'sheet-lede tight'), true);
        ui.strip = ctx.f.add(dl('strip'), true);
        ui.facts = ctx.f.add(dl('facts plain'), true);
        ui.pick = ctx.f.add(node('div', 'chips')); ui.pick.setAttribute('role', 'group'); ui.pick.setAttribute('aria-label', T('RESOLVERS.PICK'));
        ui.foot = foot(ctx.f);
        ui.pick.addEventListener('click', function (e) { var b = e.target.closest('[data-id]'); if (b) ctx.set({ id: b.dataset.id }); });
        folding(ui.pick, function () { return RES.length; }, fold);
        ctx.f.sheet.addEventListener('click', function (e) {
          var b = e.target.closest('[data-more]'); if (!b) return; b.nextElementSibling.hidden = false; b.hidden = true;
        });
        ui.foot.more.textContent = T('RESOLVERS.LINK'); W.field(ui.foot.more, 'WORLDMEASURE.RESOLVERS.LINK.HREF');
      },
      render: function (st, ctx) {
        var f = ctx.f;
        if (!RES.length) { W.title(ui.title, T('RESOLVERS.EMPTY.TITLE')); ui.line.textContent = T('RESOLVERS.EMPTY.LINE'); ui.kicker.textContent = ''; return; }
        var r = W.pick(RES, st.id), cs = r.composes;
        ui.kicker.textContent = T('RESOLVERS.KICKER', { n: RES.length });
        W.title(ui.title, r.name + '.', cs.length ? T(cs.length === 1 ? 'RESOLVERS.TITLE.ONE' : 'RESOLVERS.TITLE.MANY', { n: cs.length }) : T('RESOLVERS.TITLE.NONE'));
        ui.line.textContent = ''; ui.line.appendChild(node('span', null, r.line || '—'));
        var checked = r.grammar === 'checked';
        W.cells(ui.strip, [[T('RESOLVERS.STRIP.GRAMMAR'), T(checked ? 'RESOLVERS.GRAMMAR.CHECKED' : 'RESOLVERS.GRAMMAR.OPEN'), !checked],
          [T('RESOLVERS.STRIP.CAPS'), String(cs.length)], [T('RESOLVERS.STRIP.OFFERS'), String(r.offers.length), !r.offers.length]]);
        /* an offer name keeps a resolver's own capitals: "Found DAO", not "Found dao" */
        var caps2 = RES.filter(function (x) { return x.name === x.name.toUpperCase(); }).map(function (x) { return x.name; });
        var offers = r.offers.map(function (o) { return caps2.reduce(function (s, n) { return s.replace(new RegExp('\\b' + n + '\\b', 'gi'), n); }, o); });
        ui.facts.textContent = '';
        function row(label, content) { ui.facts.appendChild(node('dt', null, label)); var dd = node('dd'); dd.appendChild(content); ui.facts.appendChild(dd); }
        function muted(text) { return node('span', 'muted', text); }
        row(T('RESOLVERS.FACT.BUILT'), cs.length ? chipsOf(cs.map(capLink)) : muted(T('RESOLVERS.OWNRULES')));
        /* the first three offers, the rest one click deeper */
        var offerCell = node('span');
        if (offers.length) {
          offerCell.appendChild(document.createTextNode(offers.slice(0, 3).join(' · ')));
          if (offers.length > 3) {
            offerCell.appendChild(document.createTextNode(' '));
            var more = node('button', 'more-n', T('RESOLVERS.MORE', { n: offers.length - 3 })); more.type = 'button'; more.setAttribute('data-more', '');
            var rest = node('span', null, ' · ' + offers.slice(3).join(' · ')); rest.hidden = true;
            offerCell.appendChild(more); offerCell.appendChild(rest);
          }
        } else offerCell.appendChild(muted(T('RESOLVERS.UNKNOWN')));
        row(T('RESOLVERS.FACT.OFFERS'), offerCell);
        if ((r.price || '—') !== ui.usual) row(T('RESOLVERS.FACT.PRICE'), document.createTextNode(r.price || '—'));
        row(T('RESOLVERS.FACT.WHO'), muted(T('RESOLVERS.UNKNOWN')));
        /* the pickers; a resolver whose grammar is not specified carries a hollow dot */
        ui.pick.querySelectorAll('[data-id]').forEach(function (b) { b.remove(); });
        var anchor = ui.pick.querySelector('.chips-all');
        RES.forEach(function (x) {
          var b = node('button', x.grammar === 'checked' ? '' : 'open', x.name); b.type = 'button'; b.dataset.id = x.id; b.setAttribute('aria-pressed', x.id === r.id);
          if (x.grammar !== 'checked') b.title = T('RESOLVERS.OPEN');
          ui.pick.insertBefore(b, anchor);
        });
        foldButton(ui.pick, RES.length, fold.open);
        var cta = ui.foot.cta;
        if (cs.length) { W.link(cta, 'measured', 'c=' + cs[0]); cta.say.textContent = T('RESOLVERS.CTA.CAPS'); }
        else { W.link(cta, 'works/resolve'); cta.say.textContent = T('RESOLVERS.CTA.RESOLVE'); }
        W.tags(f.tags, [{ id: 'name', name: r.name, sub: cs.length ? T('RESOLVERS.TAG.NAMES', { n: cs.length }) : T('RESOLVERS.TAG.NONE'), cls: 'hot' }]
          .concat(caps().map(function (c) { return { id: 'cap-' + c.id, name: title(c.id), cls: 'small', at: 'below' }; })));
      }
    };
  }

  /* ================================================================ /measured */
  function measuredDef() {
    var CAPS = caps(), DATA = window.DEFXN_CAPABILITIES || {}, ui = {}, last = null, fold = { open: false };
    function usedBy(id) { return resolvers().filter(function (r) { return r.composes.indexOf(id) >= 0; }); }
    return {
      view: 'measured', key: 'measured', titleId: 'wm-measured-title', here: 'WORLDMEASURE.MEASURED.HERE',
      note: function (st) { return T(st.tab === 'runs' ? 'MEASURED.NOTE.RUNS' : 'MEASURED.NOTE.CAPS'); },
      parse: function (q) { var c = W.pick(CAPS, q.get('c')); return { c: c ? c.id : null, tab: q.get('tab') === 'runs' ? 'runs' : 'caps' }; },
      query: function (st) { var q = []; if (st.c && CAPS[0] && st.c !== CAPS[0].id) q.push('c=' + st.c); if (st.tab === 'runs') q.push('tab=runs'); return q.join('&'); },
      world: function (st) { return W.state('measured', { c: st.c, tab: st.tab }); },
      picks: { pick: function (a, b, ctx) { var p = W.picked(a, b); if (p.kind === 'capability' && p.id) ctx.set({ c: p.id, tab: 'caps' }); } },
      keys: function (e, st, ctx) {
        var d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0; if (!d || st.tab !== 'caps' || !CAPS.length) return;
        var i = CAPS.findIndex(function (c) { return c.id === st.c; }); ctx.set({ c: CAPS[(i + d + CAPS.length) % CAPS.length].id });
      },
      build: function (ctx) {
        var f = ctx.f;
        ui.kicker = f.add(node('p', 'eyebrow-dot mono', T('MEASURED.KICKER')));
        ui.tabs = W.tabs(T('MEASURED.TABS'), [{ id: 'caps', text: T('MEASURED.TAB.CAPS'), tab: 'wm-tab-caps', panel: 'wm-caps' }, { id: 'runs', text: T('MEASURED.TAB.RUNS'), tab: 'wm-tab-runs', panel: 'wm-runs' }],
          function (id) { ctx.set({ tab: id }); });
        f.sheet.appendChild(ui.tabs.bar);
        ui.caps = f.add(node('div', 'panel')); ui.caps.id = 'wm-caps'; ui.caps.setAttribute('role', 'tabpanel'); ui.caps.setAttribute('aria-labelledby', 'wm-tab-caps');
        ui.title = node('h1', 'two'); ui.title.id = 'wm-measured-title'; ui.title.setAttribute('data-sw', '');
        ui.line = node('p', 'sheet-lede tight'); ui.line.setAttribute('data-sw', '');
        ui.strip = dl('strip'); ui.strip.setAttribute('data-sw', '');
        ui.facts = dl('facts plain'); ui.facts.setAttribute('data-sw', '');
        ui.pick = node('div', 'chips'); ui.pick.setAttribute('role', 'group'); ui.pick.setAttribute('aria-label', T('MEASURED.PICK'));
        [ui.title, ui.line, ui.strip, ui.facts, ui.pick].forEach(function (el) { ui.caps.appendChild(el); });
        ui.runs = f.add(node('div', 'panel')); ui.runs.id = 'wm-runs'; ui.runs.setAttribute('role', 'tabpanel'); ui.runs.setAttribute('aria-labelledby', 'wm-tab-runs'); ui.runs.hidden = true;
        ui.foot = foot(f);
        ui.pick.addEventListener('click', function (e) { var b = e.target.closest('[data-c]'); if (b) ctx.set({ c: b.dataset.c }); });
        folding(ui.pick, function () { return CAPS.length; }, fold);
        ui.foot.more.textContent = T('MEASURED.LINK'); W.field(ui.foot.more, 'WORLDMEASURE.MEASURED.LINK.HREF');
        ui.runs.appendChild(runsView());
        ctx.dispose = function () { if (ui.tabs.stop) ui.tabs.stop(); };
      },
      render: function (st, ctx) {
        var c = W.pick(CAPS, st.c); if (!c) return;
        var users = usedBy(c.id), total = CAPS.reduce(function (s, x) { return s + x.count; }, 0), runs = st.tab === 'runs';
        ui.tabs.select(st.tab);
        if (last && last !== st.tab) { slide(runs ? ui.runs : ui.caps, runs ? 'wp-in-right' : 'wp-in-left'); }
        last = st.tab; ui.caps.hidden = runs; ui.runs.hidden = !runs;
        W.title(ui.title, title(c.id) + '.', T('MEASURED.TITLE', { n: c.count }));
        ui.line.textContent = ''; ui.line.appendChild(node('span', null, c.plain || c.line || '—'));
        W.cells(ui.strip, [[T('MEASURED.STRIP.CASES'), T('MEASURED.STRIP.OF', { n: c.count, total: total })], [T('MEASURED.STRIP.SPEED'), T('MEASURED.STRIP.NOSPEED'), true], [T('MEASURED.STRIP.VERSION'), c.version || '—']]);
        ui.facts.textContent = '';
        ui.facts.appendChild(node('dt', null, T('MEASURED.FACT.FOR')));
        var dd = node('dd');
        if (c.cases.length) {
          var cases = node('span', 'cases'); c.cases.slice(0, 3).forEach(function (x) { cases.appendChild(node('q', null, x)); }); dd.appendChild(cases);
          if (c.count > 3) dd.appendChild(node('span', 'muted small', T('MEASURED.FACT.MORE', { n: c.count - 3 })));
        } else dd.textContent = '—';
        ui.facts.appendChild(dd);
        ui.facts.appendChild(node('dt', null, T('MEASURED.FACT.USEDBY')));
        var dd2 = node('dd');
        if (users.length) dd2.appendChild(chipsOf(users.map(function (r) { return W.link(node('a', null, r.name), 'resolvers', 'id=' + r.id); })));
        else dd2.appendChild(node('span', 'muted', T('MEASURED.FACT.NOUSERS')));
        ui.facts.appendChild(dd2);
        ui.pick.querySelectorAll('[data-c]').forEach(function (b) { b.remove(); });
        var anchor = ui.pick.querySelector('.chips-all');
        CAPS.forEach(function (x) {
          var b = node('button', null, title(x.id) + ' '); b.type = 'button'; b.dataset.c = x.id; b.setAttribute('aria-pressed', x.id === c.id);
          b.appendChild(node('small', null, String(x.count))); ui.pick.insertBefore(b, anchor);
        });
        foldButton(ui.pick, CAPS.length, fold.open);
        var cta = ui.foot.cta;
        if (runs) { W.link(cta, 'works/resolve'); cta.say.textContent = T('MEASURED.CTA.RESOLVE'); }
        else if (users.length) { W.link(cta, 'resolvers', 'id=' + users[0].id); cta.say.textContent = T('MEASURED.CTA.USERS'); }
        else { W.link(cta, 'resolvers'); cta.say.textContent = T('MEASURED.CTA.ALL'); }
        ui.foot.more.hidden = runs;
        W.tags(ctx.f.tags, [{ id: 'col', name: title(c.id), sub: T('MEASURED.TAG.CASES', { n: c.count }), cls: 'hot' }]);
      }
    };
    /* the two dated runs, the limit that comes with them, and how to read a number */
    function runsView() {
      var box = node('div', 'runs');
      (DATA.runs || []).forEach(function (run) {
        var s = node('section', 'run'); s.appendChild(node('h3', null, run.what)); s.appendChild(node('span', 'mono', run.id + ' · ' + run.date));
        var d = dl(); (run.figures || []).forEach(function (x) {
          var cell = node('div'); cell.appendChild(node('dt', null, x.name)); var v = node('dd', null, x.value); v.appendChild(node('span', null, x.unit)); cell.appendChild(v); d.appendChild(cell);
        });
        s.appendChild(d); s.appendChild(node('p', null, run.note)); box.appendChild(s);
      });
      if (DATA.limit) box.appendChild(node('p', 'limit', DATA.limit));
      var rules = node('p', 'rules'); rules.appendChild(node('b', null, T('MEASURED.RULES.TITLE'))); rules.appendChild(document.createTextNode(T('MEASURED.RULES.TEXT')));
      box.appendChild(rules);
      return box;
    }
  }
  /* the panel that arrives wipes in from the side of the tab you came from */
  function slide(panel, cls) {
    panel.classList.remove('wp-in-right', 'wp-in-left'); void panel.offsetWidth; panel.classList.add(cls);
  }

  /* ================================================================ /fxn */
  function fxnDef() {
    var FXN = window.DEFXN_FXN, ui = {}, last = null;
    var PARTS = FXN ? FXN.groups.reduce(function (a, g) { return a.concat(g.parts); }, []).concat(FXN.fees.parts) : [];
    var FEES = FXN ? FXN.fees.parts.map(function (p) { return p.id; }) : [];
    var MONEY = [['COINS', true], ['CREDITS', false], ['TOKENS', true]];
    function amount(p) { return W.num(FXN.supply * p.pct / 100); }
    function defaultPart(tab) { return tab === 'fees' ? 'computers' : 'mining'; }
    return {
      view: 'fxn', key: 'fxn', titleId: 'wm-fxn-title', here: 'WORLDMEASURE.FXN.HERE',
      note: function () { return FXN ? T('FXN.NOTE', { unit: W.num(FXN.supply / 100) }) : ''; },
      parse: function (q) {
        var tab = ['supply', 'fees', 'money'].indexOf(q.get('tab')) >= 0 ? q.get('tab') : 'supply';
        var part = PARTS.filter(function (p) { return p.id === q.get('g'); })[0];
        return { tab: tab, g: part && (FEES.indexOf(part.id) >= 0) === (tab === 'fees') ? part.id : defaultPart(tab) };
      },
      query: function (st) { var q = []; if (st.g !== defaultPart(st.tab)) q.push('g=' + st.g); if (st.tab !== 'supply') q.push('tab=' + st.tab); return q.join('&'); },
      world: function (st) { return W.state('fxn', { g: st.g, tab: st.tab }); },
      picks: { pick: function (a, b, ctx, st) {
        var p = W.picked(a, b); if (p.kind !== 'fxn' || !p.id) return;
        var fee = FEES.indexOf(p.id) >= 0; ctx.set({ g: p.id, tab: fee ? 'fees' : st.tab === 'fees' ? 'supply' : st.tab });
      } },
      build: function (ctx) {
        var f = ctx.f;
        f.add(node('p', 'eyebrow-dot mono', T('FXN.KICKER')));
        var h = f.add(node('h1', 'two', FXN ? T('FXN.TITLE', { supply: W.num(FXN.supply) }) : '')); h.id = 'wm-fxn-title';
        f.add(node('p', 'sheet-lede tight', T('FXN.LEDE')));
        ui.tabs = W.tabs(T('FXN.TABS'), ['SUPPLY', 'FEES', 'MONEY'].map(function (k) { return { id: k.toLowerCase(), text: T('FXN.TAB.' + k), tab: 'wm-tab-' + k.toLowerCase(), panel: 'wm-' + k.toLowerCase() }; }),
          function (id) { ctx.set({ tab: id, g: defaultPart(id) }); });
        f.sheet.appendChild(ui.tabs.bar);
        ['supply', 'fees', 'money'].forEach(function (id) {
          var p = f.add(node('div', 'panel')); p.id = 'wm-' + id; p.setAttribute('role', 'tabpanel'); p.setAttribute('aria-labelledby', 'wm-tab-' + id); ui[id] = p;
          p.addEventListener('click', function (e) { var b = e.target.closest('[data-g]'); if (b) ctx.set({ g: b.dataset.g }); });
        });
        var box = node('div', 'wp-foot'), cta = W.cta('small'), more = node('a', 'more');
        cta.say.textContent = T('FXN.CTA'); W.field(cta, 'WORLDMEASURE.FXN.CTA.HREF');
        more.textContent = T('FXN.LINK'); W.field(more, 'WORLDMEASURE.FXN.LINK.HREF');
        box.appendChild(cta); box.appendChild(more); box.appendChild(node('small', 'cta-why', T('FXN.WHY'))); f.add(box);
        ctx.dispose = function () { if (ui.tabs.stop) ui.tabs.stop(); };
      },
      render: function (st, ctx) {
        if (!FXN) return;
        var part = PARTS.filter(function (p) { return p.id === st.g; })[0] || PARTS[0];
        ui.tabs.select(st.tab);
        ['supply', 'fees', 'money'].forEach(function (id) {
          var on = id === st.tab; if (on && last && last !== st.tab) slide(ui[id], ['supply', 'fees', 'money'].indexOf(id) > ['supply', 'fees', 'money'].indexOf(last) ? 'wp-in-right' : 'wp-in-left');
          ui[id].hidden = !on;
        });
        last = st.tab;
        function partButton(p) {
          var b = node('button', null, p.name); b.type = 'button'; b.dataset.g = p.id; b.setAttribute('aria-pressed', p.id === part.id); b.appendChild(node('b', null, p.pct + '%')); return b;
        }
        function rule(head, text, extra) {
          var r = node('div', 'rule'); r.setAttribute('data-sw', ''); r.appendChild(node('p', 'mono', head)); r.appendChild(node('p', null, text)); if (extra) r.appendChild(extra); return r;
        }
        /* supply: the three groups in two columns, the chosen part's rule below */
        ui.supply.textContent = '';
        var parts = node('div', 'parts');
        [[FXN.groups[0]], [FXN.groups[1], FXN.groups[2]]].forEach(function (col) {
          var s = node('section');
          col.forEach(function (g, gi) {
            if (gi) s.appendChild(node('span', 'gap'));
            var sum = g.parts.reduce(function (a, p) { return a + p.pct; }, 0), h3 = node('h3', null, g.name); h3.appendChild(node('span', null, sum + '%')); s.appendChild(h3);
            g.parts.forEach(function (p) { s.appendChild(partButton(p)); });
          });
          parts.appendChild(s);
        });
        ui.supply.appendChild(parts);
        if (part.rule) ui.supply.appendChild(rule(T('FXN.RULE', { name: part.name, pct: part.pct, amount: amount(part) }), part.rule, part.schedule ? schedule(part) : null));
        /* fees */
        ui.fees.textContent = '';
        var fp = node('div', 'parts'), fs = node('section'), fh = node('h3', null, T('FXN.FEES.TITLE')); fh.appendChild(node('span', null, '100%')); fs.appendChild(fh);
        FXN.fees.parts.forEach(function (p) { fs.appendChild(partButton(p)); }); fp.appendChild(fs); ui.fees.appendChild(fp);
        ui.fees.appendChild(rule(T('FXN.FEES.NOPRICE'), FXN.fees.note));
        /* money: the three kinds, and which can move */
        ui.money.textContent = '';
        var ul = node('ul', 'money');
        MONEY.forEach(function (m) {
          var li = node('li'); li.appendChild(node('b', null, T('FXN.MONEY.' + m[0] + '.KIND')));
          var s = W.badge(T(m[1] ? 'FXN.MONEY.MOVES' : 'FXN.MONEY.STAYS')); s.dataset.state = m[1] ? 'built' : 'none'; li.appendChild(s);
          li.appendChild(node('p', null, T('FXN.MONEY.' + m[0] + '.WHAT'))); ul.appendChild(li);
        });
        ui.money.appendChild(ul);
        var tags = [{ id: 'part', name: part.name, sub: part.pct === 1 ? T('FXN.TAG.TILE', { amount: amount(part) }) : T('FXN.TAG.TILES', { pct: part.pct, amount: amount(part) }), cls: 'hot' }];
        FXN.groups.forEach(function (g) {
          var sum = g.parts.reduce(function (a, p) { return a + p.pct; }, 0);
          tags.push({ id: 'g-' + g.id, name: g.name, sub: T('FXN.TAG.PCT', { pct: sum }), cls: g.parts.some(function (p) { return p.id === part.id; }) ? 'hot' : '' });
        });
        FXN.fees.parts.forEach(function (p) { tags.push({ id: 'g-' + p.id, name: T(p.id === 'fund' ? 'FXN.TAG.FUND' : 'FXN.TAG.COMPUTERS'), sub: T('FXN.TAG.PCT', { pct: p.pct }), cls: p.id === part.id ? 'hot' : '' }); });
        W.tags(ctx.f.tags, tags);
      }
    };
    /* a release schedule as a line of steps: one tick for each release, from the first day to the last */
    function schedule(p) {
      var sc = p.schedule, ticks = []; for (var d = sc.first; d <= sc.last; d += sc.every) ticks.push(d);
      var ol = node('ol', 'sched'); ol.setAttribute('aria-label', T('FXN.SCHEDULE'));
      ticks.forEach(function (d, i) {
        var li = node('li'); li.style.setProperty('--h', ((i + 1) / ticks.length * 100).toFixed(1) + '%'); li.appendChild(node('i'));
        if (i === 0 || i === ticks.length - 1) li.appendChild(node('span', null, T('FXN.DAY', { d: d }))); ol.appendChild(li);
      });
      return ol;
    }
  }

  /* ================================================================ /ring */
  function ringDef() {
    var N = window.DEFXN_NETWORK, ui = {};
    var KINDS = ['identity', 'network', 'hub', 'resolver', 'token', 'pool', 'ledger'];
    function K(kd, role) { var key = 'RING.' + kd.toUpperCase() + '.' + role; return ArkCopy.has('WORLDMEASURE.' + key) ? T(key) : ''; }
    function index(id) { var i = N ? N.IDS.indexOf(id) : -1; return i >= 0 && i !== N.MINE ? i : N.IDS.indexOf('deark'); }
    function named(id) { for (var k in N.NAMED) if (N.NAMED[k].id === id) return N.NAMED[k]; return null; }
    var CHIPS = [['identity-1', 'RING.CHIP.IDENTITY'], ['resolver-1', 'RING.CHIP.RESOLVER'], ['token-1', 'RING.CHIP.TOKEN'], ['pool-1', 'RING.CHIP.POOL'],
      ['fxn'], ['deark'], ['cr3tv'], ['defxn', 'RING.CHIP.KERNEL'], ['@fxn', 'RING.CHIP.SUPPLY'], ['@chain', 'RING.CHIP.MINE']];
    return {
      view: 'ring', key: 'ring', titleId: 'wm-ring-title', here: 'WORLDMEASURE.RING.HERE',
      note: false,
      parse: function (q) { return { i: N ? N.IDS[index(q.get('i'))] : 'deark' }; },
      query: function (st) { return st.i && st.i !== 'deark' ? 'i=' + st.i : ''; },
      world: function (st) { return W.state('ring', { i: st.i }); },
      picks: { pickRing: function (ri, b, ctx) {
        var id = N.IDS[typeof ri === 'object' && ri ? ri.index : ri]; if (!id) return;
        if (id === 'fxn-ledger') W.go('fxn'); else if (N.IDS.indexOf(id) === N.MINE) W.go('chain'); else ctx.set({ i: id });
      } },
      build: function (ctx) {
        var f = ctx.f;
        f.note = node('p', 'wp-note mono rise'); f.stage.parentNode.appendChild(f.note);
        ui.kind = f.add(node('p', 'eyebrow-dot mono'), true);
        var head = f.add(node('div', 'ring-head'), true); ui.logo = node('span', 'logo-slot'); ui.logo.setAttribute('role', 'img');
        ui.title = node('h1', 'two'); ui.title.id = 'wm-ring-title'; head.appendChild(ui.logo); head.appendChild(ui.title);
        ui.what = f.add(node('p', 'sheet-lede'), true);
        ui.strip = f.add(dl('strip'), true);
        ui.also = f.add(node('p', 'aside'), true);
        ui.pick = f.add(node('div', 'chips ring-chips')); ui.pick.setAttribute('role', 'group'); ui.pick.setAttribute('aria-label', T('RING.OTHER'));
        ui.foot = foot(f); ui.foot.more.textContent = W.common('BACK'); W.link(ui.foot.more, 'zero');
        ui.pick.addEventListener('click', function (e) { var a = e.target.closest('a[data-ring]'); if (a) ctx.stay(e, { i: a.dataset.ring }); });
      },
      render: function (st, ctx) {
        var ri = index(st.i), kd = N.KIND[ri], nm = N.NAMED[ri], id = N.IDS[ri];
        var pi = N.PARENT ? N.PARENT[ri] : -1, home = pi >= 0 ? N.NAMED[pi] : null, kindName = K(kd, 'KIND');
        ui.kind.textContent = home ? T('RING.INSIDE', { kind: kindName, home: home.name }) : kindName;
        var top0 = ri; while (N.PARENT && N.PARENT[top0] >= 0) top0 = N.PARENT[top0];
        ctx.f.map.textContent = ''; ctx.f.map.appendChild(W.minimap(top0));
        var first, second;
        if (kd === 'ledger') { first = nm.name + '.'; second = T('RING.SUB.INSIDE', { home: home.name }); }
        else if (nm && nm.kernel) { first = K(kd, 'TITLE'); second = K(kd, 'SUB'); }
        else if (nm) { first = nm.name + '.'; second = T(nm.first ? 'RING.SUB.FIRST' : 'RING.SUB.COIN', { coin: nm.coin }); }
        else if (home) { first = K(kd, 'TITLE'); second = T('RING.SUB.INSIDE', { home: home.name }); }
        else { first = K(kd, 'TITLE'); second = K(kd, 'SUB'); }
        W.title(ui.title, first, second);
        ui.what.textContent = ''; ui.what.appendChild(node('span', null, K(kd, 'WHAT')));
        var state = K(kd, 'STATE'), logo = N.LOGOS[id];
        var cells = [[T('RING.STRIP.KIND'), kindName]];
        if (nm) cells.push([T('RING.STRIP.COIN'), nm.coin || T('RING.NONE'), !nm.coin]);
        if (state) cells.push([T('RING.STRIP.STATE'), W.badge(state)]);
        cells.push([T('RING.STRIP.LOGO'), logo ? T('RING.SHOWN') : T('RING.NOTGIVEN'), !logo]);
        W.cells(ui.strip, cells);
        /* what the kind holds, the one line that governs it, where it is used */
        ui.also.textContent = '';
        var also = node('span'); also.appendChild(document.createTextNode(K(kd, 'ALSO')));
        var rule = kd === 'network' ? T('RING.RULE.NETWORK') : kd === 'hub' ? T('RING.RULE.HUB') : '';   /* an emptied field leaves the line out */
        if (rule) { also.appendChild(document.createTextNode(' ')); also.appendChild(node('b', 'rule-line', rule)); }
        if (K(kd, 'USE')) also.appendChild(document.createTextNode(' ' + K(kd, 'USE')));
        if (K(kd, 'MORE')) { var uses = node('span', 'uses'), ma = W.fieldTo(node('a', null, K(kd, 'MORE')), 'WORLDMEASURE.RING.' + kd.toUpperCase() + '.MORE.HREF'); uses.appendChild(ma); also.appendChild(uses); }
        ui.also.appendChild(also);
        ctx.f.note.textContent = ri === N.HUB ? T('RING.NOTE.HUB') : nm ? T('RING.NOTE.NAMED') : T('RING.NOTE.KIND');
        ui.logo.textContent = '';
        if (logo) { var img = node('img'); img.src = logo; img.alt = ''; ui.logo.appendChild(img); } else ui.logo.appendChild(node('span', null, T('RING.LOGO')));
        ui.logo.setAttribute('aria-label', logo ? T('RING.LOGO.OF', { name: nm ? nm.name : kindName }) : T('RING.LOGO.LABEL'));
        /* the rings of this kind, one after another; then the kinds and the named networks as two groups */
        var peers = N.KIND.map(function (k2, i) { return k2 === kd && i !== N.MINE ? i : -1; }).filter(function (i) { return i >= 0; });
        peers.sort(function (a, b) { return (N.NAMED[b] && N.NAMED[b].first ? 1 : 0) - (N.NAMED[a] && N.NAMED[a].first ? 1 : 0); });
        var at = peers.indexOf(ri);
        ui.pick.textContent = '';
        function ringLink(target, label, text) {
          var a = node('a', null, text); a.href = W.href('ring', target === 'deark' ? '' : 'i=' + target); a.dataset.ring = target; if (label) a.setAttribute('aria-label', label); return a;
        }
        if (peers.length > 1) {
          var pr = node('span', 'peers'), prev = ringLink(N.IDS[peers[(at - 1 + peers.length) % peers.length]], T('RING.PEER.PREV', { kind: kindName }), '←'), next = ringLink(N.IDS[peers[(at + 1) % peers.length]], T('RING.PEER.NEXT', { kind: kindName }), '→');
          pr.appendChild(prev); pr.appendChild(node('span', 'mono', T('RING.PEER.OF', { kind: kindName, n: at + 1, total: peers.length }))); pr.appendChild(next); ui.pick.appendChild(pr);
        }
        function group(label, chips) {
          var g = node('span', 'grp'); g.appendChild(node('b', 'mono', label));
          chips.forEach(function (ch) {
            var on = ch[0] === id || (!nm && ch[0] === kd + '-1'), a;
            if (ch[0].charAt(0) === '@') a = W.link(node('a', null, T(ch[1]) ), ch[0] === '@fxn' ? 'fxn' : 'chain');
            else a = ringLink(ch[0], '', ch[1] ? T(ch[1]) : (named(ch[0]) || {}).name || ch[0]);
            a.setAttribute('aria-pressed', on); g.appendChild(a);
          });
          ui.pick.appendChild(g);
        }
        group(T('RING.GROUP.KINDS'), CHIPS.slice(0, 4)); group(T('RING.GROUP.NETWORKS'), CHIPS.slice(4));
        var cta = ui.foot.cta, fxn = (kd === 'ledger' || kd === 'network') && nm && nm.coin === 'FXN';
        if (fxn) { W.fieldTo(cta, 'WORLDMEASURE.RING.CTA.FXN.HREF'); cta.say.textContent = T('RING.CTA.FXN'); }
        else if (kd === 'ledger') { W.fieldTo(cta, 'WORLDMEASURE.RING.CTA.RESOLVE.HREF'); cta.say.textContent = T('RING.CTA.RESOLVE'); }
        else { W.fieldTo(cta, 'WORLDMEASURE.RING.' + kd.toUpperCase() + '.CTA.HREF', kd === 'hub' ? 's=0' : ''); cta.say.textContent = K(kd, 'CTA'); }
        W.tags(ctx.f.tags, [{ id: 'name', name: nm ? nm.name : kindName, sub: nm ? (nm.coin ? T('RING.TAG.COIN', { coin: nm.coin }) : T('RING.TAG.NOCOIN')) : T('RING.TAG.KIND'), cls: 'hot' }]);
      }
    };
  }

  function page(def) { return W.page(def); }
  ArkUI.pageModules.worldResolvers = page(resolversDef);
  ArkUI.pageModules.worldMeasured = page(measuredDef);
  ArkUI.pageModules.worldFxn = page(fxnDef);
  ArkUI.pageModules.worldRing = page(ringDef);
})();
