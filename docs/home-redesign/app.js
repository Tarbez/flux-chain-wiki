/* DEFXN mockup app: the views, their words and the address (2026-10-23).

   The address holds everything a view needs, so Back, Forward and links work and nothing is
   lost on the way (law 21, rule R05):
     #/                      home: the network
     #/chain?r=              your chain
     #/record?r=             one record, its versions and the chain's timeline
     #/open?r=&tab=          the record opened into its card (content, details, signature, history)
     #/links?r=              what the record links to, and what links to it
     #/resolve?step=         how a result is made, step 1 to 5
     #/resolvers?id=         the first-party resolvers, and what each is built from
     #/measured?c=&tab=      every capability's checked cases, and the two benchmark runs
     #/fxn?g=&tab=           FXN's starting supply and its fee split
   A new view: the old view's words wipe up and out, the camera flies (chains-scene.js and
   stages.js), and the new view's words wipe up into place on the way in. A new choice in the same
   view: the 3D moves to it and the words wipe in again. Nothing fades and nothing reloads.

   Every view works without the 3D: the words, actions, pickers and card do not depend on it.

   REDUCTION TESTS
   chain     1 your chain and the record you look at. 2 View record. 3 how many records, the
             newest, how many are signed, the next in chain; that your key signs each record and
             each links to the one before it. 4 the activity (tab), the text, history, connections.
             5 nothing; "Personal chain" is said once, in the crumbs. 6 nothing. 7 nothing more.
             8-9 the record and tab ride in the address. 10 arrows, rows and words work with no 3D.
   record    1 one record, its versions, its place in time. 2 Open record. 3 name, revision, date,
             signer; a first line of what it says; earlier versions (hover names each); what comes
             next; where it sits on the timeline. 4 the full text, connections, history. 5 nothing. 6 nothing. 7 nothing more. 8-9 the address.
             10 a field missing from the sample shows a dash.
   open      1 the content of one record. 2 See connections. 3 what it says; beside it its type,
             state, signer and next record. 4 details, signature and history (tabs). 5 nothing;
             connections live on their own page, the path lives in the card's top line.
             6 nothing. 7 nothing more. 8-9 the record and tab ride in the address.
             10 the card takes a flat fill with no 3D; a missing field says so.
   links     1 what one record is linked to. 2 Open record. 3 the record before it, the one after
             it, its earlier versions, its related records, its signer. 4 the record's text.
             5 nothing; the 3D draws the same links the list names. 6 nothing. 7 nothing more.
             8-9 the address. 10 the list carries every link with no 3D.
   resolve   1 how one signed result is made. 2 Next step, then Create your identity. 3 the step
             in front of you, and that you choose whom to trust before you send. 4 the other steps,
             one line each. 5 nothing. 6 nothing. 7 nothing more. 8-9 the step rides in the
             address. 10 an illustration: it says so, and the steps read with no 3D.
   resolvers 1 what one resolver is built from. 2 See its capabilities. 3 its grammar, its
             capabilities, its price, who can change it. 4 the other resolvers (chips). 5 nothing.
             6 the command count: no, it is left out. 7 nothing more. 8-9 the address. 10 a fact
             the manifest does not give says "not in its manifest".
   measured  1 what is measured today. 2 See resolvers that use it. 3 a capability's checked cases,
             and that its speed is not measured yet. 4 the benchmark runs (tab). 5 nothing.
             6 nothing. 7 nothing more. 8-9 the address. 10 the runs name their records.
   fxn       1 the starting supply, as decisions. 2 Create your identity (the sale is per
             identity). 3 the parts and the rule for the chosen part. 4 fees (tab). 5 nothing.
             6 nothing. 7 nothing more. 8-9 the address. 10 the page says these are decisions,
             mostly not in code. */
(function () {
  'use strict';
  var R = window.DEFXN_RECORDS, S = window.DEFXNScene || { ok: false, hooks: {}, to: function () {}, select: function () {}, go: function () {} };
  var RES = (window.DEFXN_RESOLVERS || { resolvers: [] }).resolvers, CAP = (window.DEFXN_CAPABILITIES || { capabilities: [] });
  var CAPS = CAP.capabilities, FXN = window.DEFXN_FXN;
  var list = R.records;
  var VIEWS = ['home', 'chain', 'record', 'open', 'links', 'resolve', 'resolvers', 'measured', 'fxn', 'ring'];   /* ring: one chain of the network (ring-view.js) */
  /* the concept's own pages (concept-views.js) add themselves here, with their titles; they keep
     their choice in ?s= (audit 4, owner: "the mockup does not have our concept") */
  var EXTRA = window.DEFXN_EXTRA_VIEWS || {};
  VIEWS = VIEWS.concat(Object.keys(EXTRA));
  var TABS = { chain: ['records', 'activity'], open: ['content', 'details', 'signature', 'history'], measured: ['caps', 'runs'], fxn: ['supply', 'fees', 'money'] };   /* money: the brief's three kinds (audit 4, fix 213) */
  var TITLES = { home: 'DEFXN home mockup', chain: 'Personal chain', record: 'Record', open: 'Open record', links: 'Connections',
    resolve: 'How a result is made', resolvers: 'Resolvers', measured: 'Measured', fxn: 'FXN supply', ring: 'A chain of the network' };
  Object.keys(EXTRA).forEach(function (v) { TITLES[v] = EXTRA[v].title; });
  var esc = window.DEFXNKitUI.esc;
  function $$(sel, root) { return [].slice.call((root || document).querySelectorAll(sel)); }
  var viewEl = {}; $$('.view').forEach(function (el) { viewEl[el.dataset.view] = el; });
  function f(view, name) { return viewEl[view].querySelector('[data-f="' + name + '"]'); }
  var pad = function (v) { return String(v).padStart(2, '0'); };
  function title(id) { return id.charAt(0).toUpperCase() + id.slice(1); }
  var ARROW = '<svg viewBox="0 0 16 14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 7h13M8.5 1.5L14 7l-5.5 5.5"/></svg>';
  /* the record icons, drawn like the glyphs on the tiles */
  var GLYPH = {
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4.5" y="3" width="15" height="18" rx="2"/><path d="M8 8h8M8 11.5h8M8 15h5"/></svg>',
    img: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M6 17l4.5-5 3 3 2-2 3 4"/><circle cx="15.5" cy="9" r="1.2"/></svg>',
    iii: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M9 8v8M12 8v8M15 8v8"/></svg>',
    key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.9-3.6 3.6-5.6 7-5.6s6.1 2 7 5.6"/></svg>',
    ghost: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2.5 2"><rect x="4.5" y="3" width="15" height="18" rx="2"/></svg>'
  };

  /* ---------- address ---------- */
  function pickOf(arr, id, key) { for (var i = 0; i < arr.length; i++) if (arr[i][key || 'id'] === id) return arr[i]; return arr[0] || null; }
  var PARTS = FXN ? FXN.groups.reduce(function (a, g) { return a.concat(g.parts); }, []).concat(FXN.fees.parts) : [];
  function parse() {
    var h = location.hash.replace(/^#\/?/, ''), parts = h.split('?'), v = parts[0] || 'home', q = new URLSearchParams(parts[1] || '');
    if (VIEWS.indexOf(v) < 0) v = 'home';
    var tab = q.get('tab');
    /* the card's Connections tab grew into its own page */
    if (v === 'open' && tab === 'connections') { v = 'links'; tab = null; }
    var tabs = TABS[v] || [], st = { view: v, r: R.byId(q.get('r')).record.id, tab: tabs.indexOf(tab) >= 0 ? tab : tabs[0] || null };
    st.step = Math.min(5, Math.max(1, parseInt(q.get('step'), 10) || 1));
    var res = pickOf(RES, q.get('id')); st.id = res ? res.id : null;
    var cap = pickOf(CAPS, q.get('c')); st.c = cap ? cap.id : null;
    var defaultPart = st.tab === 'fees' ? 'computers' : 'mining', part = PARTS.filter(function (p) { return p.id === q.get('g'); })[0];
    var feeIds = FXN ? FXN.fees.parts.map(function (p) { return p.id; }) : [];
    st.g = part && (feeIds.indexOf(part.id) >= 0) === (st.tab === 'fees') ? part.id : defaultPart;
    var N0 = window.DEFXN_NETWORK, ri = N0 ? N0.IDS.indexOf(q.get('i')) : -1;
    st.i = ri >= 0 && ri !== N0.MINE ? q.get('i') : 'deark';   /* the ring: any ring but yours, which has a page of its own */
    st.s = EXTRA[v] && q.get('s') != null ? q.get('s') : null;
    return st;
  }
  function href(st) {
    var v = st.view, q = [];
    if (v === 'home') return '#/';
    if (v === 'chain' || v === 'record' || v === 'open' || v === 'links') q.push('r=' + st.r);
    if (v === 'resolve' && st.step > 1) q.push('step=' + st.step);
    if (v === 'resolvers' && st.id) q.push('id=' + st.id);
    if (v === 'measured' && st.c) q.push('c=' + st.c);
    if (v === 'fxn' && st.g) q.push('g=' + st.g);
    if (v === 'ring' && st.i) q.push('i=' + st.i);
    if (EXTRA[v] && st.s != null) q.push('s=' + encodeURIComponent(st.s));
    if (TABS[v] && st.tab && st.tab !== TABS[v][0]) q.push('tab=' + st.tab);
    return '#/' + v + (q.length ? '?' + q.join('&') : '');
  }
  function go(st) { location.hash = href(st); }                  /* a new entry: Back returns here */
  function stay(st) { location.replace(href(st)); }              /* the same view, a new choice or tab */
  function at(st, patch) { return Object.assign({}, st, patch); }
  function base(view) { return at(state || parse(), { view: view }); }

  /* ---------- words that rise ---------- */
  /* the controls under a stage rise with their backing, so the backing never cuts in (audit 3) */
  var PAGE = '.page-top > *, .sheet > *, .stage-note, .timeline, .legend, .turns, .segs';
  var RISE = { home: '.copy > *, .rail', chain: PAGE, record: PAGE, open: '.page-top > *, .card', links: PAGE,
    resolve: PAGE, resolvers: PAGE, measured: PAGE, fxn: PAGE, ring: PAGE };
  Object.keys(EXTRA).forEach(function (v) { RISE[v] = PAGE; });
  /* a stagger never runs longer than 400 ms in all: 7 steps of 55 ms, then the rest together (fix 31) */
  Object.keys(RISE).forEach(function (v) { $$(RISE[v], viewEl[v]).forEach(function (el, i) { el.classList.add('rise'); el.style.setProperty('--i', Math.min(i, 7)); }); });
  function swap(v) {
    $$('[data-sw], .panel:not([hidden])', viewEl[v]).forEach(function (el, i) {
      el.classList.remove('swap'); void el.offsetWidth; el.style.setProperty('--i', Math.min(i, 6)); el.classList.add('swap');
    });
  }

  /* ---------- the record pages ---------- */
  /* metadata the kit way: mono, upper case, a dash for anything the sample does not give */
  function facts(r) {
    return [r.revision ? 'Rev ' + pad(r.revision) : null, r.date, r.signedBy ? 'Signed by ' + r.signedBy : null].filter(Boolean).map(esc).join(' · ');
  }
  function two(main, rest) { return esc(main) + (rest ? ' <span>' + esc(rest) + '</span>' : ''); }
  function row(x, to, note) {
    return '<a href="' + to + '" data-j="' + list.indexOf(x) + '"><span class="mk">' + GLYPH[x.glyph || 'doc'] + '</span><span><b>' + esc(x.title) + '</b><small>' + esc(note || facts(x)) + '</small></span></a>';
  }
  function fillRecords(st) {
    var found = R.byId(st.r), r = found.record, idx = found.index, next = list[idx + 1] || null, newer = list[idx - 1] || null;
    var signed = list.filter(function (x) { return x.signedBy; }).length;
    /* chain: every record, newest first; the chosen one is marked */
    f('chain', 'sub').textContent = list.length + ' records.';
    f('chain', 'strip').innerHTML = [['Records', list.length], ['Newest', list[0].date], ['Signed', signed + ' of ' + list.length]]
      .map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join('');
    /* (fix 66) it names what the chosen record links to: the record before it */
    f('chain', 'nextrow').innerHTML = '<span class="mono">Links to</span>' + (next ? '<a href="' + href({ view: 'record', r: next.id }) + '">' + esc(next.title) + ' →</a>' : '<span>— It is the first record.</span>');
    f('chain', 'count').textContent = (idx + 1) + ' of ' + list.length;
    var countTag = document.querySelector('[data-f-tag="count"]'); if (countTag) countTag.textContent = list.length + ' records';
    f('chain', 'recs').innerHTML = list.map(function (x, i) {
      return '<li><a href="' + href({ view: 'chain', r: x.id }) + '" data-pick="' + x.id + '" data-j="' + i + '" aria-current="' + (i === idx) + '">' +
        '<span class="mk">' + GLYPH[x.glyph || 'doc'] + '</span>' +
        '<span><b>' + esc(x.title) + '</b><small>' + facts(at(x, { signedBy: null })) + '</small></span>' +
        (x.signedBy ? '<span class="st">Signed</span>' : '<span class="st none">Not signed</span>') +
        '<svg class="go" viewBox="0 0 16 14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 7h13M8.5 1.5L14 7l-5.5 5.5"/></svg></a></li>';
    }).join('');
    /* activity: the sample's history steps across the chain, newest first (fix 16) */
    var acts = []; list.forEach(function (x) { (x.provenance || []).forEach(function (p, k) { acts.push({ x: x, p: p, k: k }); }); });
    acts.sort(function (a, b) { return (R.day(b.x) - R.day(a.x)) || b.k - a.k; });
    document.getElementById('activity').innerHTML = acts.length ? acts.map(function (a) {
      return '<li><span class="mk">' + GLYPH[a.x.glyph || 'doc'] + '</span><span><b>' + esc(a.p.what) + '</b><small>' + esc(a.x.title + ' · by ' + a.p.by) + '</small></span><time>' + esc(a.p.date) + '</time></li>';
    }).join('') : '<li class="none">No activity in this sample.</li>';
    f('chain', 'next').href = href({ view: 'record', r: r.id });
    f('chain', 'history').href = href({ view: 'open', r: r.id, tab: 'history' });
    f('chain', 'links').href = href({ view: 'links', r: r.id });
    /* record: the page slab holds what the record is; the timeline under the 3D places it in time */
    f('record', 'kind').textContent = (r.type || 'Record') + ' · ' + R.chain;
    f('record', 'title').innerHTML = two(r.title + '.', r.revision ? 'Revision ' + pad(r.revision) + '.' : null);
    f('record', 'meta').textContent = facts(r);
    f('record', 'about').textContent = r.about || 'No description in this sample.';
    f('record', 'about').classList.toggle('none', !r.about);
    f('record', 'facts').innerHTML = [['Type', esc(r.type || '—')], ['State', esc(r.state || 'Not signed')], ['Signed by', esc(r.signedBy || '—')],
      ['Earlier', r.earlier ? 'Revisions ' + pad(r.earlier[0]) + '–' + pad(r.earlier[1]) + ', kept on file' : '—'],
      ['Next in chain', next ? '<a href="' + href({ view: 'record', r: next.id }) + '">' + esc(next.title) + '</a>' : '—']]
      .map(function (x) { return '<dt>' + x[0] + '</dt><dd>' + x[1] + '</dd>'; }).join('');
    f('record', 'next').href = href({ view: 'open', r: r.id });
    f('record', 'history').href = href({ view: 'open', r: r.id, tab: 'history' });
    f('record', 'links').href = href({ view: 'links', r: r.id });
    var days = list.map(R.day), lo = Math.min.apply(null, days), hi = Math.max.apply(null, days);
    /* built once; a new choice slides the highlight from the old dot to the new one (fix 86) */
    var tl = f('record', 'timeline'), lefts = list.map(function (x, j) { return hi > lo ? (days[j] - lo) / (hi - lo) * 100 : 50; });
    if (!tl.children.length) tl.innerHTML = '<b class="tl-hi" aria-hidden="true"></b>' + list.slice().reverse().map(function (x, i) {
      var j = list.length - 1 - i;
      return '<a href="' + href({ view: 'record', r: x.id }) + '" data-pick="' + x.id + '" data-j="' + j + '" style="left:' + lefts[j].toFixed(2) + '%" class="' + (i % 2 ? 'low' : '') + '" aria-label="' + esc(x.title + ', ' + x.date) + '">' +
        '<i></i><span>' + (x.revision ? 'Rev ' + pad(x.revision) + '<br>' : '') + esc(x.date.slice(0, 6)) + '</span></a>';
    }).join('');
    $$('a[data-j]', tl).forEach(function (a) { a.setAttribute('aria-current', +a.dataset.j === idx); });
    tl.firstChild.style.left = lefts[idx].toFixed(2) + '%';
    /* a preview of what the record says (fix 87) */
    var pv = f('record', 'preview');
    pv.innerHTML = r.content ? '<span class="mono">' + esc(r.content[0].head) + '</span>' + esc(r.content[0].items[0]) + (r.content[0].items.length > 1 ? ' · ' + esc(r.content[0].items[1]) : '') + '…' : '';
    pv.hidden = !r.content;
    var rtags = document.querySelector('.tags[data-for="record"]');
    rtags.innerHTML = (r.earlier ? [0, 1, 2].slice(0, Math.min(3, r.earlier[1] - r.earlier[0] + 1)).map(function (i) {
      return '<span class="tag small" data-tag="g' + i + '" data-at="above"><b>Rev ' + pad(r.earlier[1] - i) + '</b></span>';
    }).join('') : '') + (next ? '<span class="tag" data-tag="next" data-at="above"><b>Next in chain</b>' + esc(next.title) + '</span>' : '');
    tagEls.record = null;
    /* open: the card */
    f('open', 'kind').textContent = (r.type || 'Record') + ' · ' + R.chain;
    f('open', 'title').innerHTML = two(r.title + '.', r.revision ? 'Revision ' + pad(r.revision) + '.' : null);
    f('open', 'meta').textContent = facts(r);
    f('open', 'back').href = href({ view: 'chain', r: r.id });
    f('open', 'path').innerHTML = esc(R.chain) + ' / <b>' + esc(r.title) + '</b>';
    f('open', 'facts').innerHTML = [['Type', esc(r.type || '—')], ['State', esc(r.state || 'Not signed')], ['Signed by', esc(r.signedBy || '—')],
      ['Next in chain', next ? '<a href="' + href({ view: 'open', r: next.id }) + '">' + esc(next.title) + '</a>' : '—']]
      .map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + x[1] + '</dd></div>'; }).join('');
    f('open', 'links').href = href({ view: 'links', r: r.id });
    document.getElementById('content').innerHTML = r.content ? '<div class="cols">' + r.content.map(function (c) {
      return '<section><h3>' + esc(c.head) + '</h3><ul>' + c.items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></section>';
    }).join('') + '</div>' : '<div class="details"><p class="none">No content in this sample.' + (r.about ? '' : '') + '</p></div>';
    document.getElementById('details').innerHTML = '<div class="details">' +
      (r.about ? '<p>' + esc(r.about) + '</p>' : '<p class="none">No description in this sample.</p>') +
      '<dl class="facts">' + [['Chain', R.chain], ['Revision', r.revision ? pad(r.revision) : null],
        ['Earlier', r.earlier ? pad(r.earlier[0]) + '–' + pad(r.earlier[1]) : null]].map(function (x) {
        return '<dt>' + x[0] + '</dt><dd>' + esc(x[1] || '—') + '</dd>';
      }).join('') + '</dl></div>';
    /* how the record is built: its fields in order, the signature last (fix 104, the brief's word "Record") */
    var recWord = ((window.DEFXN_CONCEPT || {}).words || []).filter(function (w) { return w.word === 'Record'; })[0];
    var anat = '<figure class="anat"><ol>' + [['Type', r.type || '—'], ['Title', r.title], ['Date', r.date],
      ['Links to', next ? next.title : 'Nothing: it is first'], ['Signature', r.signedBy ? 'Your key' : 'Not signed']].map(function (x, i, a) {
      return '<li' + (i === a.length - 1 ? ' class="last"' : '') + ' style="--i:' + i + '"><span>' + (i === a.length - 1 ? GLYPH.key : String(i + 1)) + '</span><b>' + esc(x[0]) + '</b><small>' + esc(x[1]) + '</small></li>';
    }).join('') + '</ol>' + (recWord ? '<figcaption>' + esc(recWord.means) + '</figcaption>' : '') + '</figure>';
    document.getElementById('signature').innerHTML = anat + (r.signedBy ? '<div class="sig"><span class="seal">' + GLYPH.key + '</span><div>' +
      '<p>Signed by ' + esc(r.signedBy) + ', on ' + esc(r.date) + '. The signature is the last field of the record. Anyone can check it against your key, at any time.</p>' +
      '<p>A signature shows who signed. It does not show that the words are right.</p></div></div>'
      : '<p class="none">Not signed in this sample. A record counts once its key signs it.</p>');
    document.getElementById('history').innerHTML = r.provenance ? '<ol class="steps">' + r.provenance.map(function (p) {
      return '<li><span><b>' + esc(p.what) + '</b> by ' + esc(p.by) + '</span><time>' + esc(p.date) + '</time></li>';
    }).join('') + (r.earlier ? '<li><span><b>Revisions ' + pad(r.earlier[0]) + '–' + pad(r.earlier[1]) + '</b> kept on file. Nothing is rewritten.</span><time></time></li>' : '') + '</ol>'
      : '<p class="none">No history in this sample.</p>';
    /* links: the record's neighbours on the chain, its versions, its related records, its signer */
    f('links', 'title').innerHTML = two(r.title + '.', 'What it links to.');
    var g = [];
    g.push(['Links to', next ? row(next, href({ view: 'links', r: next.id }), 'The record before it') : '<p class="none">Nothing. It is the first record.</p>']);
    g.push(['Linked from', newer ? row(newer, href({ view: 'links', r: newer.id }), 'The record after it') : '<p class="none">Nothing yet. It is the newest record.</p>']);
    g.push(['Earlier', r.earlier ? '<span class="row"><span class="mk">' + GLYPH.ghost + '</span><span><b>Revisions ' + pad(r.earlier[0]) + '–' + pad(r.earlier[1]) + '</b><small>Kept on file. Nothing is rewritten.</small></span></span>' : '<p class="none">No earlier versions in this sample.</p>']);
    g.push(['Related', r.links ? r.links.map(function (l) { return '<span class="row"><span class="mk">' + GLYPH.doc + '</span><span><b>' + esc(l.title) + '</b><small>' + esc(l.note) + ' · sample</small></span></span>'; }).join('') : '<p class="none">No related records in this sample.</p>']);   /* the boards' placeholders say so (fix 119) */
    g.push(['Signed by', r.signedBy ? '<span class="row"><span class="mk">' + GLYPH.key + '</span><span><b>Your key</b><small>Signed ' + esc(r.date) + '</small></span></span>' : '<p class="none">Not signed in this sample.</p>']);
    /* each group says how many links it holds (fix 128) */
    var nOf = { 'Links to': next ? 1 : 0, 'Linked from': newer ? 1 : 0, 'Earlier': r.earlier ? r.earlier[1] - r.earlier[0] + 1 : 0, 'Related': (r.links || []).length, 'Signed by': r.signedBy ? 1 : 0 };
    f('links', 'groups').innerHTML = g.map(function (x) { return '<dt>' + x[0] + ' <span class="n">· ' + nOf[x[0]] + '</span></dt><dd>' + x[1] + '</dd>'; }).join('');
    f('links', 'next').href = href({ view: 'open', r: r.id });
    f('links', 'chain').href = href({ view: 'chain', r: r.id });
    /* the way back keeps the record chosen */
    ['record', 'links'].forEach(function (v) { var back = viewEl[v].querySelector('.crumbs .back'); if (back) back.href = href({ view: v === 'links' ? 'record' : 'chain', r: r.id }); });
    /* labels on the links scene: one per record, the versions, the related records, the key */
    var tags = document.querySelector('.tags[data-for="links"]');
    tags.innerHTML = list.map(function (x, i) {
      return '<span class="tag' + (i === idx ? ' hot" data-at="right' : ' small" data-at="below') + '" data-tag="rec-' + x.id + '"><b>' + esc(x.title) + '</b>' + (x.revision ? 'Rev ' + pad(x.revision) : '') + '</span>';
    }).join('') + '<span class="tag" data-tag="ghosts"><b>Earlier versions</b>Kept on file</span>' +
      '<span class="tag lit" data-tag="key" data-at="right"><b>Your key</b>' + (r.signedBy ? 'Signed it' : 'Has not signed it') + '</span>' +
      (r.links || []).map(function (l, i) { return '<span class="tag small" data-tag="rel-' + i + '" data-at="below"><b>' + esc(l.title) + '</b>' + esc(l.note) + '</span>'; }).join('');
    tagEls.links = null;
  }

  /* ---------- how a result is made: the five steps (designer brief, section 3) ---------- */
  var STEPS = [
    ['Two sign', 'Alice and Bob each sign what they want: a swap of one token for another. Each intent is a record, and its last field is the signature.'],
    ['A resolver resolves', 'It checks every signature in one batch and refuses replays. It clears every swap in the batch at one price, so your place in the batch does not change your price.'],
    ['It signs the result', 'That signature is the result. Nothing has to happen later to make it true.'],
    ['Copies are stored', 'Other computers keep the signed result as it is. They do not check it again or redo the work.'],
    ['Anyone checks', 'Follow the signatures back to the start. For a swap that takes three signature checks.']
  ];
  function fillResolve(st) {
    var n = st.step;
    f('resolve', 'title').innerHTML = two('Step ' + n + ' of 5.', STEPS[n - 1][0] + '.');
    /* the rows are built once and then only change state, so the open row can open and close in
       place while the others keep their height (fix 48); a done step shows a check (fix 47) */
    var list = f('resolve', 'steps');
    if (!list.children.length) list.innerHTML = STEPS.map(function (s, i) {
      return '<li><button type="button" data-step="' + (i + 1) + '"><span class="n"><i>' + (i + 1) + '</i><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2"><path d="M2.5 7.5l3 3 6-7"/></svg></span><b>' + esc(s[0]) + '</b><span class="say"><span>' + esc(s[1]) + '</span></span></button></li>';
    }).join('');
    $$('[data-step]', list).forEach(function (b, i) {
      b.classList.toggle('done', i + 1 < n);
      if (i + 1 === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    /* the bar under the stage: five segments, set by the step (fix 42) */
    $$('[data-seg]', viewEl.resolve).forEach(function (b, i) { b.classList.toggle('on', i < n); b.setAttribute('aria-current', i + 1 === n ? 'step' : 'false'); });
    var last = n === 5;
    f('resolve', 'next').href = last ? '#/idstart' : href(at(st, { step: n + 1 }));   /* Create your identity: the identity flow */
    f('resolve', 'next-say').textContent = last ? 'Create your identity' : 'Next step';
    f('resolve', 'prev').href = href(at(st, { step: Math.max(1, n - 1) }));
    f('resolve', 'prev').hidden = n === 1;   /* no way back from the first step, so no link (fix 49) */
  }
  f('resolve', 'steps').addEventListener('click', function (e) {
    var b = e.target.closest('[data-step]'); if (b) stay(at(state, { step: +b.dataset.step }));
  });
  viewEl.resolve.addEventListener('click', function (e) { var b = e.target.closest('[data-seg]'); if (b) stay(at(state, { step: +b.dataset.seg })); });
  /* the step buttons move within the view, so they replace the entry: Back leaves the page */
  ['next', 'prev'].forEach(function (k) {
    f('resolve', k).addEventListener('click', function (e) {
      if (state.step === 5 && k === 'next') return;
      e.preventDefault(); stay(at(state, { step: Math.min(5, Math.max(1, state.step + (k === 'next' ? 1 : -1))) }));
    });
  });

  /* ---------- resolvers ---------- */
  function capName(id) { return title(id); }
  function usedBy(cap) { return RES.filter(function (r) { return r.composes.indexOf(cap) >= 0; }); }
  function fillResolvers(st) {
    if (!RES.length) { f('resolvers', 'title').textContent = 'Resolvers.'; f('resolvers', 'line').textContent = 'The resolver list is not built yet: run node make-resolvers.mjs in this folder.'; return; }
    var r = pickOf(RES, st.id), caps = r.composes;
    f('resolvers', 'kicker').textContent = 'Resolvers · ' + RES.length;
    /* the price is the same for most resolvers, so it is said once here and only the exceptions say it again (fix 188) */
    var prices = {}; RES.forEach(function (x) { prices[x.price || '—'] = (prices[x.price || '—'] || 0) + 1; });
    var usual = Object.keys(prices).sort(function (a, b) { return prices[b] - prices[a]; })[0];
    f('resolvers', 'note').textContent = 'Each cube is a resolver. The blocks below are the capabilities they name. Price: ' + usual.toLowerCase() + ' for ' + prices[usual] + ' of ' + RES.length + '.';
    f('resolvers', 'title').innerHTML = two(r.name + '.', caps.length ? 'Built from ' + caps.length + (caps.length === 1 ? ' capability.' : ' capabilities.') : 'Built on no shared capability.');
    f('resolvers', 'line').textContent = r.line || '—';
    f('resolvers', 'strip').innerHTML = [['Grammar', r.grammar === 'checked' ? 'Checked' : 'Not specified', r.grammar !== 'checked'],
      ['Capabilities', String(caps.length), false], ['Offers', String(r.offers.length), !r.offers.length]]
      .map(function (x) { return '<div><dt>' + x[0] + '</dt><dd' + (x[2] ? ' class="muted"' : '') + '>' + esc(x[1]) + '</dd></div>'; }).join('');
    /* an offer name keeps the resolver's own capitals: "Found DAO", not "Found dao" */
    var caps2 = RES.filter(function (x) { return x.name === x.name.toUpperCase(); }).map(function (x) { return x.name; });
    var offers = r.offers.map(function (o) { return caps2.reduce(function (s, n) { return s.replace(new RegExp('\\b' + n + '\\b', 'gi'), n); }, o); });
    f('resolvers', 'facts').innerHTML = '<dt>Built from</dt><dd>' + (caps.length ? '<span class="chips">' + caps.map(function (c) {
      return '<a href="' + href(at(base('measured'), { c: c, tab: 'caps' })) + '">' + esc(capName(c)) + '</a>';
    }).join('') + '</span>' : '<span class="muted">Its own rules only</span>') + '</dd>' +
      /* the first three offers, the rest one click deeper (fix 64); who can change it last (fix 65) */
      '<dt>Offers</dt><dd>' + (offers.length ? esc(offers.slice(0, 3).join(' · ')) + (offers.length > 3 ? ' <button type="button" class="more-n" data-more>+' + (offers.length - 3) + ' more</button><span class="rest" hidden> · ' + esc(offers.slice(3).join(' · ')) + '</span>' : '') : '<span class="muted">Not in its manifest</span>') + '</dd>' +
      ((r.price || '—') !== usual ? '<dt>Price</dt><dd>' + esc(r.price || '—') + '</dd>' : '') +
      '<dt>Who can change it</dt><dd class="muted">Not in its manifest</dd>';
    /* a chip whose resolver's grammar is not specified carries a hollow dot (fix 66) */
    f('resolvers', 'pick').innerHTML = RES.map(function (x) { return '<button type="button" data-id="' + x.id + '" aria-pressed="' + (x.id === r.id) + '"' + (x.grammar === 'checked' ? '' : ' class="open" title="Grammar not specified yet"') + '>' + esc(x.name) + '</button>'; }).join('');
    var nx = f('resolvers', 'next');
    nx.href = caps.length ? href(at(base('measured'), { c: caps[0], tab: 'caps' })) : href(at(base('resolve'), { step: 1 }));
    f('resolvers', 'next-say').textContent = caps.length ? 'See its capabilities' : 'How a result is made';
    var tags = document.querySelector('.tags[data-for="resolvers"]');
    tags.innerHTML = '<span class="tag hot" data-tag="name"><b>' + esc(r.name) + '</b>' + esc(caps.length ? 'Names ' + caps.length + ' of the blocks below' : 'Names no shared block') + '</span>' +
      CAPS.map(function (c) { return '<span class="tag small" data-tag="cap-' + c.id + '" data-at="below"><b>' + esc(capName(c.id)) + '</b></span>'; }).join('');
    tagEls.resolvers = null;
  }
  f('resolvers', 'pick').addEventListener('click', function (e) { var b = e.target.closest('[data-id]'); if (b) stay(at(state, { id: b.dataset.id })); });
  f('resolvers', 'facts').addEventListener('click', function (e) {
    var b = e.target.closest('[data-more]'); if (!b) return;
    b.nextElementSibling.hidden = false; b.hidden = true;
  });

  /* ---------- measured ---------- */
  function fillMeasured(st) {
    var c = pickOf(CAPS, st.c); if (!c) return;
    var users = usedBy(c.id), total = CAPS.reduce(function (s, x) { return s + x.count; }, 0);
    f('measured', 'title').innerHTML = two(capName(c.id) + '.', c.count + ' checked cases.');
    f('measured', 'line').textContent = c.plain || c.line || '—';
    f('measured', 'strip').innerHTML = [['Checked cases', c.count + ' of ' + total, false], ['Speed', 'No run of its own yet', true], ['Version', c.version || '—', false]]
      .map(function (x) { return '<div><dt>' + x[0] + '</dt><dd' + (x[2] ? ' class="muted"' : '') + '>' + esc(x[1]) + '</dd></div>'; }).join('');
    f('measured', 'facts').innerHTML = '<dt>Checked for</dt><dd>' + (c.cases.length ? '<span class="cases">' + c.cases.slice(0, 3).map(function (x) { return '<q>' + esc(x) + '</q>'; }).join('') + '</span>' + (c.count > 3 ? '<span class="muted small">+' + (c.count - 3) + ' more cases</span>' : '') : '—') + '</dd>' +
      '<dt>Used by</dt><dd>' + (users.length ? '<span class="chips">' + users.map(function (r) {
        return '<a href="' + href(at(base('resolvers'), { id: r.id })) + '">' + esc(r.name) + '</a>';
      }).join('') + '</span>' : '<span class="muted">No first-party resolver yet</span>') + '</dd>';
    f('measured', 'pick').innerHTML = CAPS.map(function (x) {
      return '<button type="button" data-c="' + x.id + '" aria-pressed="' + (x.id === c.id) + '">' + esc(capName(x.id)) + ' <small>' + x.count + '</small></button>';
    }).join('');
    document.getElementById('runs').innerHTML = '<div class="runs">' + (CAP.runs || []).map(function (run) {
      return '<section class="run"><h3>' + esc(run.what) + '</h3><span class="mono">' + esc(run.id + ' · ' + run.date) + '</span><dl>' +
        run.figures.map(function (x) { return '<div><dt>' + esc(x.name) + '</dt><dd>' + esc(x.value) + '<span>' + esc(x.unit) + '</span></dd></div>'; }).join('') +
        '</dl><p>' + esc(run.note) + '</p></section>';
    }).join('') + (CAP.limit ? '<p class="limit">' + esc(CAP.limit) + '</p>' : '') +
      /* how to read them: of the brief's four rules for numbers on screens, the 1st and 4th tell the designer
         what not to draw and the 2nd is the fleet run's own note, so the reader gets the 3rd (fix 203) */
      (((window.DEFXN_CONCEPT || {}).numberRules || [])[2] ? '<p class="rules"><b>How to read these numbers</b>' + esc(window.DEFXN_CONCEPT.numberRules[2]) + '</p>' : '') + '</div>';
    var nx = f('measured', 'next'), runs = st.tab === 'runs';
    nx.href = runs ? href(at(base('resolve'), { step: 1 })) : users.length ? href(at(base('resolvers'), { id: users[0].id })) : href(base('resolvers'));
    f('measured', 'next-say').textContent = runs ? 'How a result is made' : users.length ? 'See resolvers that use it' : 'See all resolvers';
    nx.nextElementSibling.hidden = runs;
    var col = document.querySelector('.tags[data-for="measured"] [data-tag="col"]');
    col.className = 'tag hot'; col.innerHTML = '<b>' + esc(capName(c.id)) + '</b>' + c.count + ' checked cases';
    var note = viewEl.measured.querySelector('.stage-note');
    note.textContent = runs ? 'Runs measure the whole fleet, not one capability.' : 'One column per capability. One cube per checked case.';
    tagEls.measured = null;
  }
  f('measured', 'pick').addEventListener('click', function (e) { var b = e.target.closest('[data-c]'); if (b) stay(at(state, { c: b.dataset.c })); });

  /* ---------- FXN ---------- */
  /* a release schedule as a line of steps: one tick per release, from the first day to the last (fix 82) */
  function schedule(p) {
    var sc = p.schedule; if (!sc) return '';
    var ticks = []; for (var d = sc.first; d <= sc.last; d += sc.every) ticks.push(d);
    return '<ol class="sched" aria-label="Release days">' + ticks.map(function (d, i) {
      return '<li style="--h:' + ((i + 1) / ticks.length * 100).toFixed(1) + '%"><i></i>' + (i === 0 || i === ticks.length - 1 ? '<span>Day ' + d + '</span>' : '') + '</li>';
    }).join('') + '</ol>';
  }
  function fillFxn(st) {
    if (!FXN) return;
    var part = PARTS.filter(function (p) { return p.id === st.g; })[0] || PARTS[0];
    document.getElementById('supply').innerHTML = '<div class="parts">' + [[FXN.groups[0]], [FXN.groups[1], FXN.groups[2]]].map(function (col) {
      return '<section>' + col.map(function (g, gi) {
        var sum = g.parts.reduce(function (s, p) { return s + p.pct; }, 0);
        return (gi ? '<span class="gap"></span>' : '') + '<h3>' + esc(g.name) + '<span>' + sum + '%</span></h3>' + g.parts.map(function (p) {
          return '<button type="button" data-g="' + p.id + '" aria-pressed="' + (p.id === part.id) + '">' + esc(p.name) + '<b>' + p.pct + '%</b></button>';
        }).join('');
      }).join('') + '</section>';
    }).join('') + '</div>' +
      (part.rule ? '<div class="rule" data-sw><p class="mono">' + esc(part.name) + ' · ' + part.pct + '% · ' + (part.pct * 10).toLocaleString('en-US') + ',000,000 FXN</p><p>' + esc(part.rule) + '</p>' + schedule(part) + '</div>' : '');
    /* the chosen part, named on its arc (fix 78) */
    var pt = document.querySelector('.tags[data-for="fxn"]');
    document.getElementById('fees').innerHTML = '<div class="parts"><section><h3>The cost of running work<span>100%</span></h3>' + FXN.fees.parts.map(function (p) {
      return '<button type="button" data-g="' + p.id + '" aria-pressed="' + (p.id === part.id) + '">' + esc(p.name) + '<b>' + p.pct + '%</b></button>';
    }).join('') + '</section></div><div class="rule"><p class="mono">No price is set yet</p><p>' + esc(FXN.fees.note) + '</p></div>';
    /* the brief's three kinds of money, read from it (concept-data.js); which ones can move */
    var MONEY = (window.DEFXN_CONCEPT || {}).money || [], moneyEl = document.getElementById('money');
    if (moneyEl) moneyEl.innerHTML = MONEY.length ? '<ul class="money">' + MONEY.map(function (m) {
      var moves = /^Yes/.test(m.moves);
      return '<li><b>' + esc(m.kind) + '</b><span class="state" data-state="' + (moves ? 'built' : 'none') + '">' + (moves ? 'Moves' : 'Stays') + '</span>' +
        '<p>' + esc(m.what) + ' ' + esc(m.moves.replace(/^(Yes|No)\.\s*/, '')) + '</p></li>';
    }).join('') + '</ul>' : '<p class="none">The brief has no money table.</p>';
    var tags = pt;
    tags.innerHTML = '<span class="tag hot" data-tag="part"><b>' + esc(part.name) + '</b>' + part.pct + (part.pct === 1 ? ' tile' : ' tiles') + ' · ' + (part.pct * 10).toLocaleString('en-US') + ',000,000 FXN</span>' + FXN.groups.map(function (g) {
      var sum = g.parts.reduce(function (s, p) { return s + p.pct; }, 0), on = g.parts.some(function (p) { return p.id === part.id; });
      return '<span class="tag' + (on ? ' hot' : '') + '" data-tag="g-' + g.id + '"><b>' + esc(g.name) + '</b>' + sum + '%</span>';
    }).join('') + FXN.fees.parts.map(function (p) {
      return '<span class="tag' + (p.id === part.id ? ' hot' : '') + '" data-tag="g-' + p.id + '"><b>' + esc(p.id === 'fund' ? 'Network fund' : 'Computers') + '</b>' + p.pct + '%</span>';
    }).join('');
    tagEls.fxn = null;
  }
  ['supply', 'fees'].forEach(function (id) {
    document.getElementById(id).addEventListener('click', function (e) { var b = e.target.closest('[data-g]'); if (b) stay(at(state, { g: b.dataset.g })); });
  });

  function fill(st) { fillRecords(st); fillResolve(st); fillResolvers(st); fillMeasured(st); fillFxn(st); polish(); }

  /* ---------- audit 3: what the layout needs after the words change or the window resizes ----------
     A picker that folds on a short page gets a "Show all" chip (fix 6); it keeps the choice to
     show all while you stay. The flat page (no 3D) takes the 3D page's corners: the slab's corner
     is 3.5% of its width across and 3.5% of its height down (fix 17). Timeline labels on the same
     side that would touch shorten to the revision (fix 22). */
  var allChips = {};
  function polish() {
    $$('.chips[data-f="pick"]').forEach(function (c) {
      var key = c.closest('.view').dataset.view, n = $$(':scope > :not(.chips-all)', c).length;
      if (n <= 5) return;
      var b = c.querySelector('.chips-all');
      if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = 'chips-all'; c.appendChild(b); }
      c.classList.toggle('all', !!allChips[key]);
      b.textContent = allChips[key] ? 'Show fewer' : 'Show all ' + n;
      b.setAttribute('aria-expanded', !!allChips[key]);
    });
    requestAnimationFrame(layoutPolish);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.chips-all'); if (!b) return;
    var key = b.closest('.view').dataset.view; allChips[key] = !allChips[key]; polish();
  });
  function layoutPolish() {
    var sc = scaleNow();
    $$('.sheet').forEach(function (sh) {
      var r = rect(sh.closest('[data-panel]') || sh);
      if (!r.width) return;
      /* the flat page's corner equals the 3D slab's: 0.028 of each side (the bevel rule, 2026-10-23) */
      sh.style.setProperty('--rx', (.028 * r.width / sc).toFixed(1) + 'px'); sh.style.setProperty('--ry', (.028 * r.height / sc).toFixed(1) + 'px');
    });
    var tl = f('record', 'timeline'); if (!tl || !tl.offsetWidth) return;
    var links = $$('a[data-j]', tl);
    links.forEach(function (a) { var sp = a.querySelector('span'); if (sp && sp.dataset.full) sp.innerHTML = sp.dataset.full; });
    [false, true].forEach(function (low) {
      var row = links.filter(function (a) { return a.classList.contains('low') === low; }).sort(function (x, y) { return parseFloat(x.style.left) - parseFloat(y.style.left); });
      for (var i = 1; i < row.length; i++) {
        var a = row[i - 1].querySelector('span').getBoundingClientRect(), b = row[i].querySelector('span').getBoundingClientRect();
        if (b.left < a.right + 8) [row[i - 1], row[i]].forEach(function (x) {
          var sp = x.querySelector('span'); if (!sp.dataset.full) sp.dataset.full = sp.innerHTML;
          sp.innerHTML = sp.dataset.full.split('<br>')[0];
        });
      }
    });
  }
  var polishT = 0;
  window.addEventListener('resize', function () { clearTimeout(polishT); polishT = setTimeout(layoutPolish, 200); });

  /* ---------- tabs: one behaviour for every tab list ---------- */
  /* one pill slides behind the chosen tab (fix 22); the new panel wipes in from the side of the
     tab you came from (fix 23) */
  function placePill(bar) {
    var pill = bar.querySelector('.tab-pill'), b = bar.querySelector('[aria-selected="true"]');
    if (!pill || !b || !b.offsetWidth) return;
    bar.classList.add('slides');
    pill.style.width = b.offsetWidth + 'px'; pill.style.transform = 'translateX(' + b.offsetLeft + 'px)';
  }
  function chooseTab(v, name, focus, animate) {
    var bar = document.querySelector('[data-tabs="' + v + '"]'); if (!bar) return;
    var tabs = $$('[role="tab"]', bar), was = tabs.map(function (t) { return t.getAttribute('aria-controls'); }).indexOf(bar.dataset.cur || name);
    var now = tabs.map(function (t) { return t.getAttribute('aria-controls'); }).indexOf(name);
    tabs.forEach(function (t) {
      var on = t.getAttribute('aria-controls') === name, panel = document.getElementById(t.getAttribute('aria-controls'));
      t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
      panel.hidden = !on;
      panel.classList.remove('in-right', 'in-left');
      if (on && animate && was >= 0 && was !== now) { void panel.offsetWidth; panel.classList.add(now > was ? 'in-right' : 'in-left'); }
      if (on && focus) t.focus();
    });
    bar.dataset.cur = name;
    placePill(bar);
  }
  /* only the shown view's pills: measuring every view's tabs forced a layout in the flight's first
     frame (audit 4, 33 ms at a 4x slower CPU). A view's pill is placed when that view is shown. */
  function placePills() { $$('.view.on [data-tabs]').forEach(placePill); }
  window.addEventListener('resize', placePills);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placePills);
  $$('[data-tabs]').forEach(function (bar) {
    var v = bar.dataset.tabs, tabs = $$('[role="tab"]', bar);
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { stay(at(state, tabPatch(v, t.getAttribute('aria-controls')))); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { var n = tabs[(i + d + tabs.length) % tabs.length].getAttribute('aria-controls'); stay(at(state, tabPatch(v, n))); chooseTab(v, n, true); }
      });
    });
  });
  /* switching FXN's tab also switches the chosen part to one that tab has */
  function tabPatch(v, tab) { return v === 'fxn' ? { tab: tab, g: tab === 'fees' ? 'computers' : 'mining' } : { tab: tab }; }

  /* ---------- pick on the page, or turn with the arrows ---------- */
  ['chain', 'record'].forEach(function (v) {
    viewEl[v].addEventListener('click', function (e) {
      var a = e.target.closest('[data-pick]'); if (!a) return;
      e.preventDefault(); stay(at(state, { r: a.dataset.pick }));
    });
  });
  function turn(d) { var i = R.byId(state.r).index; stay(at(state, { r: list[(i + d + list.length) % list.length].id })); }
  function cycle(arr, key, d) { var i = arr.findIndex(function (x) { return x.id === state[key]; }), p = {}; p[key] = arr[(i + d + arr.length) % arr.length].id; stay(at(state, p)); }
  $$('[data-turn]').forEach(function (b) { b.addEventListener('click', function () { turn(+b.dataset.turn); }); });
  document.addEventListener('keydown', function (e) {
    if (e.target.closest && e.target.closest('input,textarea,select,[role="tab"]')) return;
    var d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0; if (!d) return;
    var v = state.view;
    if (v === 'chain' || v === 'links') turn(v === 'links' ? -d : d);
    else if (v === 'resolve') stay(at(state, { step: Math.min(5, Math.max(1, state.step + d)) }));
    else if (v === 'resolvers') cycle(RES, 'id', d);
    else if (v === 'measured' && state.tab === 'caps') cycle(CAPS, 'c', d);
  });

  /* ---------- show a view ---------- */
  var state = null, timers = {};
  var CHAPTER = ['minute', 'resolve', 'layers', 'life'];   /* How it works, in order (left to right in space) */
  /* which way a move goes in a sequence: How it works, or the identity flow's nine steps
     (identity-flow.js). The open record is left out: its card grows out of its tile, a zoom. */
  function dirOf(a, b) {
    var ci = CHAPTER.indexOf(a), cj = CHAPTER.indexOf(b);
    if (ci >= 0 && cj >= 0) return cj > ci ? 'next' : 'back';
    var F = window.DEFXN_FLOW || [], fi = F.indexOf(a), fj = F.indexOf(b);
    return fi >= 0 && fj >= 0 && a !== 'open' && b !== 'open' ? (fj > fi ? 'next' : 'back') : null;
  }
  function show(v) {
    /* a new address in the middle of a flight: only the view that is leaving now keeps its way out (fix 36) */
    Object.keys(timers).forEach(function (key) { clearTimeout(timers[key]); });
    Object.keys(viewEl).forEach(function (key) {
      var el = viewEl[key];
      if (key === v) { el.classList.remove('out'); el.classList.add('on'); el.removeAttribute('aria-hidden'); }
      else if (!el.classList.contains('on')) el.classList.remove('out');
      if (key === v) return;
      if (el.classList.contains('on')) {
        /* a word that wiped in after a new choice holds its place by animation; let go of it so it can leave */
        $$('.swap', el).forEach(function (x) { x.classList.remove('swap'); });
        el.classList.remove('on'); el.classList.add('out'); el.setAttribute('aria-hidden', 'true');
        timers[key] = setTimeout(function () { el.classList.remove('out'); }, 900);
      } else el.setAttribute('aria-hidden', 'true');
    });
    document.body.dataset.view = v;
    document.title = TITLES[v] + (v === 'home' ? '' : ' · DEFXN mockup');
    /* a nav item may stand for several views: How it works is four chapters (data-views) */
    $$('.nav [data-nav]').forEach(function (a) { if ((a.dataset.views || a.dataset.nav).split(' ').indexOf(v) >= 0) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    $$('.tags').forEach(function (t) { t.classList.toggle('here', t.dataset.for === v); });
  }
  function route(first) {
    var st = parse(), prev = state;
    state = st;
    if (href(st) !== (location.hash || '#/') && location.hash) { location.replace(href(st)); }
    fill(st);
    Object.keys(TABS).forEach(function (v) { chooseTab(v, v === st.view ? st.tab : (prevTab[v] || TABS[v][0]), false, !!prev && prev.view === v && v === st.view); });
    if (TABS[st.view]) prevTab[st.view] = st.tab;
    tagCtx = {}; measured = false;
    if (first || !prev || prev.view !== st.view) {
      if (first) {
        /* first paint: the words start below their place, then rise in */
        document.body.dataset.view = st.view; document.title = TITLES[st.view];
        requestAnimationFrame(function () { requestAnimationFrame(function () { show(st.view); }); });
        S.to(st, first);
      } else {
        /* the words come in as the page opens or arrives, not after a fixed wait (fix 29). The scene is
           asked first: it reads the page's box, and a box read after "on" would start the words with
           the old wait. */
        var tm = S.to(st, first);
        viewEl[st.view].style.setProperty('--d', ((tm && tm.words || 600) / 1000).toFixed(2) + 's');
        /* How it works is one sequence in space (MOTION-SPEC.md): between two of its chapters the
           camera pans, and the words leave and arrive sideways in the same direction */
        var dir = dirOf(prev.view, st.view);
        if (dir) document.body.dataset.dir = dir; else delete document.body.dataset.dir;
        void viewEl[st.view].offsetWidth;   /* the words take their sideways start before they move */
        show(st.view);
      }
      requestAnimationFrame(placePills);
    } else if (href(prev) !== href(st)) {
      S.select(st);
      swap(st.view);
    }
  }
  var prevTab = {};
  window.addEventListener('hashchange', function () { document.body.classList.remove('first'); route(false); });

  /* ---------- the 3D world's questions ---------- */
  function rect(el) { return el.getBoundingClientRect(); }
  /* the page scale (kit-ui.js): 1 up to 1440x900; screen px divided by it are the page's own px */
  function scaleNow() { return window.DEFXNKitUI && window.DEFXNKitUI.scale ? window.DEFXNKitUI.scale() : 1; }
  function textRight(el) {
    var right = 0, walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), r = document.createRange(), n;
    while ((n = walk.nextNode())) { if (!n.textContent.trim()) continue; r.selectNodeContents(n); right = Math.max(right, r.getBoundingClientRect().right); }
    return right;
  }
  var N = window.DEFXN_NETWORK, DESIGN = N.W / N.H, top = document.querySelector('.top'), foot = document.querySelector('.foot');
  var copyRight = 0, railLeft = 0, topY = 0, footY = 0, blockers = [];
  /* the boxes a label must never cover: each line of words, each action, the rail */
  function lineBoxes(el) {
    var out = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), r = document.createRange(), n;
    while ((n = walk.nextNode())) { if (!n.textContent.trim()) continue; r.selectNodeContents(n); [].push.apply(out, [].slice.call(r.getClientRects())); }
    return out;
  }
  function measure() {
    var home = viewEl.home;
    copyRight = Math.max(textRight(home.querySelector('h1')), textRight(home.querySelector('.lede')));
    /* a hidden rail (a phone layout, or a page with no rail) leaves the whole width open */
    var rl = home.querySelector('.rail'), rr = rl ? rect(rl) : null;
    railLeft = rr && rr.width ? rr.left : innerWidth; topY = rect(top).bottom; footY = rect(foot).top;
    blockers = [].concat(lineBoxes(home.querySelector('.eyebrow')), lineBoxes(home.querySelector('h1')), lineBoxes(home.querySelector('.lede')),
      lineBoxes(home.querySelector('.paths')), [rect(home.querySelector('.copy .cta'))]);
  }
  /* home's identity card: where its helix window is, so the card's glass can leave that box clear */
  function helixHole() {
    var card = viewEl.home.querySelector('.idcard'), box = card && card.querySelector('[data-helix]');
    if (!box) return;
    var c = card.getBoundingClientRect(), b = box.getBoundingClientRect(), z = window.DEFXNKitUI && window.DEFXNKitUI.scale ? window.DEFXNKitUI.scale() : 1;
    [['--hx', b.left - c.left], ['--hy', b.top - c.top], ['--hw', b.width], ['--hh', b.height]].forEach(function (v) { card.style.setProperty(v[0], (v[1] / z).toFixed(1) + 'px'); });
  }
  helixHole(); window.addEventListener('resize', helixHole);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(helixHole);
  function covers(x, y, w, h) {
    for (var i = 0; i < blockers.length; i++) {
      var b = blockers[i];
      if (x < b.right + 14 && x + w > b.left - 14 && y < b.bottom + 10 && y + h > b.top - 10) return true;
    }
    return false;
  }
  /* The scene asks for a view's boxes before the view is shown, so the words can start on time.
     A view that is not shown is held to one screen's height, which squeezes its layout on a tablet
     or phone; it is measured as it will stand once shown (audit 3, fix 16: the page tile sat 181px
     above its words at 820x1180 after a flight). */
  function asShown(v, fn) {
    var el = viewEl[v], hidden = el && !el.classList.contains('on') && !el.classList.contains('out');
    if (hidden) el.classList.add('measuring');
    try { return fn(); } finally { if (hidden) el.classList.remove('measuring'); }
  }
  S.hooks.frame = function (v) { return asShown(v, function () { return frameOf(v); }); };
  function frameOf(v) {
    var W = innerWidth, H = innerHeight;
    if (v === 'home') {
      measure();
      var hx = N.RINGS[N.HUB][0] / N.W, hy = N.RINGS[N.HUB][1] / N.H;
      if (W <= 900) { var hp = Math.max(H * .5, W / DESIGN); return { x: W / 2 - hp * DESIGN * hx, y: topY, w: hp * DESIGN, h: hp, cx: W / 2 }; }
      /* the network fits the open room between the words and the side cards; its far rings may run under the cards,
         which are near-solid glass (record descent, 2026-10-24); it never grows past the full-height size */
      var room = railLeft - copyRight, w = Math.min((footY - topY) * .86 * DESIGN, room * 1.6), h = w / DESIGN, open = (copyRight + railLeft) / 2;
      return { x: open - w * hx, y: topY + ((footY - topY) * .86 - h) / 2 + h * (.5 - hy) * .5, w: w, h: h, cx: open };
    }
    if (v === 'open') { var c = rect(viewEl.open.querySelector('[data-card]')); return { x: c.left, y: c.top, w: c.width, h: c.height }; }
    var s = rect(viewEl[v].querySelector('[data-stage]'));
    if (v !== 'record') return { x: s.left, y: s.top, w: Math.max(1, s.width), h: Math.max(1, s.height) };
    var A = 1.5, sw = Math.min(s.width, s.height * A), sh = sw / A;
    return { x: s.left + (s.width - sw) / 2, y: s.top + (s.height - sh) / 2, w: sw, h: sh };
  }
  S.hooks.pick = function (v, j) {
    if (j < 0) return;
    var id = list[j].id, i = R.byId(state.r).index;
    if (v === 'home') go(at(state, { view: 'chain', r: id }));
    else if (v === 'chain') { if (j === i) go(at(state, { view: 'record', r: id })); else stay(at(state, { r: id })); }
    else if (v === 'record') go(at(state, { view: j === i ? 'open' : 'record', r: id }));
    else if (v === 'links') { if (j === i) go(at(state, { view: 'open' })); else stay(at(state, { r: id })); }
    else if (v === 'open' && j !== i) go(at(state, { r: id }));
  };
  /* a click on a stage's 3D: a resolver cube, a capability block or column, a supply tile */
  S.hooks.stagePick = function (kind, id) {
    var v = state.view;
    if (kind === 'resolver') stay(at(state, { id: id }));
    else if (kind === 'capability') { if (v === 'measured') stay(at(state, { c: id, tab: 'caps' })); else go(at(state, { view: 'measured', c: id, tab: 'caps' })); }
    else if (kind === 'fxn') stay(at(state, { g: id }));
  };
  /* the box the page sits in: the opened tile is laid over it */
  S.hooks.panel = function (v) {
    var el = viewEl[v] && viewEl[v].querySelector('[data-panel]'); if (!el) return null;
    var r = asShown(v, function () { return rect(el); }); return { x: r.left, y: r.top, w: r.width, h: r.height };
  };
  var callouts = {}; $$('.callout').forEach(function (el) { callouts[el.dataset.kind] = el; });
  var measured = false;
  S.hooks.labels = function (spots) {
    if (state && state.view !== 'home' && !viewEl.home.classList.contains('out')) return;
    if (!measured) { measure(); measured = true; }
    spots.forEach(function (p) {
      var el = callouts[p.kind]; if (!el) return;
      /* a label shows only in the open part of the screen: not under the copy, the rail, the header or the footer */
      var x0 = p.kind === 'fxn' ? p.x - 50 : p.x - 8, y0 = p.kind === 'fxn' ? p.y - 30 : p.y - 8;   /* the FXN label sits centred above its point */
      var lw = (el._w || (el._w = el.offsetWidth + 14 || 150)) * scaleNow();   /* the label's own width, read once (2026-10-23) */
      var ok = x0 > 8 && x0 + lw < railLeft - 8 && y0 > topY + 6 && y0 + 40 < footY && !covers(x0, y0, p.kind === 'fxn' ? 100 : lw, 36);
      el.classList.toggle('seen', ok);
      /* the page is zoomed by its scale (kit-ui.js): a screen point is divided by it */
      var sc = scaleNow();
      el.style.left = p.x / sc + 'px'; el.style.top = p.y / sc + 'px';
    });
  };
  /* labels on a stage: each placed on its point, never over the page, the header or the footer */
  var tagEls = {};
  /* Sizes and boxes are read once per view and on resize, never each frame (fix 88). The square at
     the leader's end sits on the point (fix 34); tags that come on together come on in story
     order, 80 ms apart, 400 ms at most (fixes 33, 31).
     Collisions (audit 3, fix 19): a stage lists its labels in story order, which is their priority.
     A label that would cover one placed before it, or the page, tries its other side; if that is
     taken too, it wipes out. On a small stage a label shows its title only (compact).
     Everything here is in the page's own px: a screen point is divided by the page scale. */
  var tagCtx = {}, FLIP = { above: 'below', below: 'above', left: 'right', right: 'left' };
  function box(r, sc) { return r ? { left: r.left / sc, top: r.top / sc, right: r.right / sc, bottom: r.bottom / sc, width: r.width / sc } : null; }
  function tagBoxes(v, layer) {
    var sc = scaleNow(), panel = viewEl[v].querySelector('[data-panel]'), stage = viewEl[v].querySelector('[data-stage]');
    var st = box(stage ? rect(stage) : null, sc);
    layer.classList.toggle('compact', !!st && st.width < 620);
    return { sc: sc, pr: box(panel ? rect(panel) : null, sc), st: st, tY: rect(top).bottom / sc, fY: rect(foot).top / sc, W: innerWidth / sc };
  }
  window.addEventListener('resize', function () { tagCtx = {}; tagEls = {}; measured = false; });
  function placeTag(at2, small, px, py, w, h) {
    var x = at2 === 'left' ? px - 16.5 - w : at2 === 'right' ? px + 16.5 : small ? px - w / 2 : px;
    var y = at2 === 'below' ? py + (small ? 13.5 : 15.5) : at2 === 'above' ? py - (small ? 13.5 : 15.5) - h : py - h / 2;
    return { x: x, y: y, r: x + w, b: y + h };
  }
  function hits(a, b, m) { return a.x < b.r + m && a.r > b.x - m && a.y < b.b + m && a.b > b.y - m; }
  S.hooks.tags = function (v, spots) {
    var layer = document.querySelector('.tags[data-for="' + v + '"]'); if (!layer) return;
    var c = tagCtx[v] || (tagCtx[v] = tagBoxes(v, layer)), pr = c.pr, order = 0, placed = [];
    if (!tagEls[v]) {
      tagEls[v] = {};
      $$('[data-tag]', layer).forEach(function (el) {
        el.dataset.home = el.dataset.home || el.dataset.at || 'above'; el.dataset.at = el.dataset.home;
        tagEls[v][el.dataset.tag] = { el: el, w: el.offsetWidth, h: el.offsetHeight, seen: el.classList.contains('seen') };
      });
    }
    var pb = pr ? { x: pr.left, y: pr.top, r: pr.right, b: pr.bottom } : null;
    function free(q) {
      if (q.x < 8 || q.r > c.W - 8 || q.y < c.tY + 4 || q.b > c.fY - 4) return false;
      if (pb && hits(q, pb, 8)) return false;
      for (var i = 0; i < placed.length; i++) if (hits(q, placed[i], 6)) return false;
      return true;
    }
    spots.forEach(function (p) {
      var t = tagEls[v][p.id]; if (!t) return;
      var el = t.el, home = el.dataset.home, small = el.classList.contains('small'), px = p.x / c.sc, py = p.y / c.sc;
      var side = home, q = placeTag(side, small, px, py, t.w, t.h), ok = p.on && free(q);
      if (p.on && !ok) { var alt = placeTag(FLIP[home], small, px, py, t.w, t.h); if (free(alt)) { side = FLIP[home]; q = alt; ok = true; } }
      if (ok) placed.push(q);
      /* a label that is out keeps its last side, so it wipes out where it was */
      if (ok && el.dataset.at !== side) el.dataset.at = side;
      if (ok !== t.seen) { el.style.transitionDelay = ok ? Math.min(400, order++ * 80) + 'ms' : '0ms'; el.classList.toggle('seen', ok); t.seen = ok; }
      if (ok || !t.seen) el.style.transform = 'translate(' + Math.round(q.x) + 'px,' + Math.round(q.y) + 'px)';
    });
  };
  /* the hover tag, and the row that goes with a tile (fixes 12, 13, 40) */
  var hoverTag = document.querySelector('.hover-tag'), hoverRow = null;
  S.hooks.hover = function (lab, x, y) {
    if (!hoverTag) return;
    hoverTag.classList.toggle('on', !!lab);
    if (lab) {
      var sc = scaleNow();
      hoverTag.firstChild.textContent = lab.name; hoverTag.lastChild.textContent = lab.act;
      hoverTag.style.transform = 'translate(' + Math.round(x / sc + 16) + 'px,' + Math.round(y / sc + 18) + 'px)';
    }
    var row = lab && lab.rec != null && state && state.view === 'chain' ? viewEl.chain.querySelector('.recs a[data-j="' + lab.rec + '"]') : null;
    if (row !== hoverRow) { if (hoverRow) hoverRow.classList.remove('hot'); if (row) row.classList.add('hot'); hoverRow = row; }
  };
  /* a row in the chain's list or the links page lifts its tile in 3D (fixes 12, 56) */
  ['chain', 'links'].forEach(function (v) {
    viewEl[v].addEventListener('mouseover', function (e) { var a = e.target.closest('.recs a[data-j], .groups a[data-j]'); if (S.hoverRecord) S.hoverRecord(a ? +a.dataset.j : -1); });
    viewEl[v].addEventListener('mouseleave', function () { if (S.hoverRecord) S.hoverRecord(-1); });
  });
  /* ---------- the mockup bar's scene switch ---------- */
  var toggle = document.getElementById('toggle-scene');
  if (toggle) toggle.addEventListener('click', function () {
    var off = !document.body.classList.contains('no-scene');
    document.body.classList.toggle('no-scene', off);
    toggle.textContent = 'Scene: ' + (off ? 'off' : 'on');
  });
  if (new URLSearchParams(location.search).get('scene') === 'off' && toggle) toggle.click();
  if (!S.ok) document.body.classList.add('no-webgl');

  window.addEventListener('scroll', function () { if (S.nudge) S.nudge(); }, { passive: true });

  /* ---------- start ---------- */
  if (S.go) S.go();
  route(true);
  requestAnimationFrame(function () { requestAnimationFrame(function () { setTimeout(function () { document.body.classList.remove('first'); }, 4000); }); });
})();
