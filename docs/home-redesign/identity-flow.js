/* DEFXN mockup app: the identity flow (2026-10-23).

   Owner, with the identity board: "when you click Create your identity it leads to this: 1, 2, 3,
   the entire UX." Nine steps, one after the other, with the camera moving forward through them:
     1 #/idstart        your FXN ID: one key file for every network, and what it opens
     2 #/idsign?s=1..3  signing in: an app asks, you approve, the key is never uploaded
     3 #/idsafe?s=0..2  security: local by design; what is built and what is partial
     4 #/idyou          your identity: a sample name and devices, your key's state
     5 #/chain          your chain                  (the existing page)
     6 #/record         its revisions               (the existing page)
     7 #/open           one record                  (the existing page)
     8 #/links          its connections             (the existing page)
     9 #/idvalue        one identity, many chains: what the network holds today
   Every "Create your identity" leads to step 1. Each step shows where it is in the nine, with the
   way back and forward. The words are the brief's (concept-data.js) wherever the brief has them;
   the name and devices are the owner's board's, marked as a sample (identity-sample.js). The 3D
   of steps 1-4 and 9 is identity-stages.js.

   Loaded after concept-views.js and before app.js; it adds its views to the app's list.

   REDUCTION TESTS
   idstart  1 one key file for every network. 2 How signing in works. 3 the file stays on your
            device; what it opens. 4 the other steps. 5 nothing. 6 nothing. 7 nothing. 8-9 the
            step rides in the address. 10 the words read with no 3D.
   idsign   1 how a sign-in works. 2 Next step, then Security. 3 the step. 4 the other steps.
            5 nothing. 6 nothing. 7 nothing. 8-9 the address. 10 the words read alone.
   idsafe   1 what keeps the key safe today. 2 See your identity. 3 each safeguard and its state.
            4 nothing. 5 nothing. 6 nothing. 7 nothing. 8-9 the address. 10 Partial is said.
   idyou    1 your identity at a glance. 2 See your chain. 3 name, devices, the key's state, your
            records. 4 your chain (step 5). 5 nothing. 6 nothing. 7 nothing. 8-9 the address.
            10 it says it is a sample.
   idvalue  1 one identity reaches many chains. 2 Start building. 3 what the network holds, counted
            from the data files. 4 nothing. 5 nothing. 6 nothing. 7 nothing. 8-9 the address.
            10 every count names where it comes from. */
(function () {
  'use strict';
  var C = window.DEFXN_CONCEPT || {}, I = window.DEFXN_IDENTITY, N = window.DEFXN_NETWORK, main = document.querySelector('main.views');
  if (!main || !I) return;
  var esc = window.DEFXNKitUI.esc, REC = window.DEFXN_RECORDS, CAPS = (window.DEFXN_CAPABILITIES || { capabilities: [] }).capabilities;
  var RES = (window.DEFXN_RESOLVERS || { resolvers: [] }).resolvers;
  /* home's identity card names the sample identity (record descent, 2026-10-24) */
  var idName = document.querySelector('[data-id-name]'); if (idName) idName.textContent = I.name;
  var ARROW = '<svg viewBox="0 0 26 20" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M1 10h23M15 1l9 9-9 9"/></svg>';
  var ARROW_L = '<svg viewBox="0 0 16 14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 7H2M7.5 1.5L2 7l5.5 5.5"/></svg>';
  var ARROW_R = '<svg viewBox="0 0 16 14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 7h13M8.5 1.5L14 7l-5.5 5.5"/></svg>';

  /* the nine steps, in order */
  var FLOW = [['idstart', 'Your FXN ID'], ['idsign', 'Signing in'], ['idsafe', 'Security'], ['idyou', 'Your identity'], ['chain', 'Your chain'],
    ['record', 'Revisions'], ['open', 'Record'], ['links', 'Connections'], ['idvalue', 'One identity, many chains']];
  window.DEFXN_FLOW = FLOW.map(function (f) { return f[0]; });
  var VIEWS = {
    idstart: { title: 'Your FXN ID', note: 'Your key file, and what it opens. An illustration: it shows no live state.' },
    idsign: { title: 'Signing in', note: 'An illustration of one sign-in. It shows no live state.' },
    idsafe: { title: 'Security', note: 'What keeps the key safe today, with its state.' },
    idyou: { title: 'Your identity', note: 'A sample identity from the owner’s board.' },
    idvalue: { title: 'One identity, many chains', note: 'Your chain, joined to the networks. Counts come from the data files.' }
  };
  window.DEFXN_EXTRA_VIEWS = window.DEFXN_EXTRA_VIEWS || {};
  Object.keys(VIEWS).forEach(function (v) { window.DEFXN_EXTRA_VIEWS[v] = { title: VIEWS[v].title }; });

  /* the step strip: where you are in the nine, and the way back and forward */
  function strip(v) {
    var i = FLOW.findIndex(function (f) { return f[0] === v; }); if (i < 0) return '';
    var prev = FLOW[i - 1], next = FLOW[i + 1];
    return (prev ? '<a class="fl-step" href="#/' + prev[0] + '" aria-label="Back: ' + esc(prev[1]) + '">' + ARROW_L + '</a>' : '<span class="fl-step" aria-hidden="true"></span>') +
      '<span class="fl-segs">' + FLOW.map(function (f, j) { return '<a href="#/' + f[0] + '" class="' + (j < i ? 'done' : '') + '"' + (j === i ? ' aria-current="step"' : '') + ' aria-label="Step ' + (j + 1) + ': ' + esc(f[1]) + '"></a>'; }).join('') + '</span>' +
      '<span class="fl-where mono">Step ' + (i + 1) + ' of 9 · ' + esc(FLOW[i][1]) + '</span>' +
      (next ? '<a class="fl-step" href="#/' + next[0] + '" aria-label="Next: ' + esc(next[1]) + '">' + ARROW_R + '</a>' : '<span class="fl-step" aria-hidden="true"></span>');
  }

  /* the new steps are the app's page shape: the stage on the left, the page on the right */
  var minimap = (document.querySelector('[data-kit="minimap"]') || {}).innerHTML || '';
  main.insertAdjacentHTML('beforeend', Object.keys(VIEWS).map(function (v) {
    return '<section class="view page cview idview" data-view="' + v + '" aria-labelledby="' + v + '-title">' +
      '<div class="page-top"><nav class="crumbs" aria-label="Where you are"><span class="path"><b>DEFXN</b> / Your identity</span>' +
      '<a class="back" href="#/">' + ARROW_L + 'Back to network</a></nav><a class="minimap" href="#/" aria-label="Back to the network">' + minimap + '</a></div>' +
      '<div class="chain-body"><div class="stage-col"><div class="stage" data-stage></div><p class="stage-note mono">' + esc(VIEWS[v].note) + '</p></div>' +
      '<div class="sheet-slot" data-panel><div class="sheet">' +
      '<nav class="flow" data-flow="' + v + '" aria-label="Your identity, in nine steps"></nav>' +
      '<p class="eyebrow-dot mono" data-if="kicker"></p>' +
      '<h1 id="' + v + '-title" class="two" data-if="title" data-sw></h1>' +
      '<p class="sheet-lede" data-if="lede" data-sw></p>' +
      '<div class="cbody" data-if="body" data-sw></div>' +
      '<div class="sheet-foot"><a class="cta small" data-if="cta"><span class="say"><span data-if="cta-say"></span> ' + ARROW + '</span></a>' +
      '<a class="more" data-if="more"></a></div>' +
      '</div></div></div><span></span></section>';
  }).join(''));
  document.body.insertAdjacentHTML('beforeend', Object.keys(VIEWS).map(function (v) { return '<div class="tags" data-for="' + v + '" aria-hidden="true"></div>'; }).join(''));
  /* steps 5 to 8 are pages that exist: they get the same strip at their top */
  [['chain', '.sheet'], ['record', '.sheet'], ['links', '.sheet'], ['open', '.card']].forEach(function (p) {
    var host = main.querySelector('.view[data-view="' + p[0] + '"] ' + p[1]); if (!host) return;
    var nav = document.createElement('nav'); nav.className = 'flow'; nav.dataset.flow = p[0]; nav.setAttribute('aria-label', 'Your identity, in nine steps');
    host.prepend(nav);
  });
  document.querySelectorAll('.flow[data-flow]').forEach(function (n) { n.innerHTML = strip(n.dataset.flow); });

  function $(v, name) { return main.querySelector('.view[data-view="' + v + '"] [data-if="' + name + '"]'); }
  /* the app keeps hold of each label element, so the same labels are updated in place, never rebuilt
     (rebuilt ones went blank after a choice inside a step) */
  function tags(v, list) {
    var layer = document.querySelector('.tags[data-for="' + v + '"]'), have = [].slice.call(layer.children);
    var same = have.length === list.length && have.every(function (el, i) { return el.dataset.tag === list[i].id; });
    if (same) {
      list.forEach(function (t, i) { var seen = have[i].classList.contains('seen'); have[i].className = 'tag' + (t.cls ? ' ' + t.cls : '') + (seen ? ' seen' : ''); have[i].innerHTML = '<b>' + esc(t.name) + '</b>' + esc(t.sub || ''); });
      return;
    }
    layer.innerHTML = list.map(function (t) { return '<span class="tag' + (t.cls ? ' ' + t.cls : '') + '" data-tag="' + t.id + '"' + (t.at ? ' data-at="' + t.at + '"' : '') + '><b>' + esc(t.name) + '</b>' + esc(t.sub || '') + '</span>'; }).join('');
  }
  function foot(v, cta, more) { $(v, 'cta').href = cta[1]; $(v, 'cta-say').textContent = cta[0]; var m = $(v, 'more'); m.hidden = !more; if (more) { m.href = more[1]; m.textContent = more[0]; } }
  function current() { var h = location.hash.replace(/^#\/?/, '').split('?'), q = new URLSearchParams(h[1] || ''); return { view: h[0], s: q.get('s') }; }
  function num(s, lo, hi) { var n = parseInt(s, 10); return isNaN(n) ? lo : Math.min(hi, Math.max(lo, n)); }
  function stateTag(s) { return s ? '<span class="state" data-state="' + esc(s.toLowerCase().replace(/\s+/g, '-')) + '">' + esc(s) + '</span>' : ''; }
  function rows(v, list, at, start) {
    return '<ol class="rows-pick">' + list.map(function (r, i) {
      var n = i + start;
      return '<li><a href="#/' + v + '?s=' + n + '" data-stay' + (n === at ? ' aria-current="true"' : '') + '><b>' + esc(r[0]) + (r[2] ? ' ' + stateTag(r[2]) : '') + '</b><span class="say"><span>' + esc(r[1]) + '</span></span></a></li>';
    }).join('') + '</ol>';
  }
  /* the brief's own sentences */
  var FXNID = C.identity && C.identity[0] ? C.identity[0].paras : [], NAMES = C.identity && C.identity[1] ? C.identity[1].paras : [];
  /* the brief's FXN ID paragraphs by key (data-k in defxn-concept.html): file, sign, share, secret, factors, kit, memory, nobody, gate */
  var ID = {}; FXNID.forEach(function (p) { if (p.key) ID[p.key] = p; });
  function idText(k, n) { return ID[k] ? (n ? sentence(ID[k].text, n) : ID[k].text) : ''; }
  function sentence(text, n) { return (text || '').split(/(?<=\.)\s+/).slice(n[0], n[1]).join(' '); }
  var WORD = {}; (C.words || []).forEach(function (w) { WORD[w.word.toLowerCase()] = w.means; });
  var signer = CAPS.filter(function (c) { return c.id === 'signer'; })[0];
  var signed = REC.records.filter(function (r) { return r.signedBy; }).length;

  var FILL = {
    idstart: function () {
      $('idstart', 'kicker').textContent = 'Your identity';
      $('idstart', 'title').innerHTML = esc('FXN ID.') + ' <span>' + esc('One key file for every network.') + '</span>';
      $('idstart', 'lede').textContent = idText('file');
      var opens = [['Apps', idText('sign', [0, 2])], ['Your chain', WORD.identity || ''], ['Resolvers', WORD.resolver || ''],
        ['Products', (C.products ? C.products.lanes.reduce(function (a, l) { return a + l.items.length; }, 0) : 26) + ' products, in 7 groups. No product is public yet.']];
      $('idstart', 'body').innerHTML = '<ul class="opens">' + opens.map(function (o) { return '<li><b>' + esc(o[0]) + '</b><span>' + esc(o[1]) + '</span></li>'; }).join('') + '</ul>';
      foot('idstart', ['How signing in works', '#/idsign'], ['Skip to your identity', '#/idyou']);
      tags('idstart', [{ id: 'key', name: '.auth.fxn', sub: 'Your one key file', cls: 'hot' }, { id: 'apps', name: 'Apps', sub: 'Sign in the browser' },
        { id: 'chains', name: 'Your chain', sub: 'One for each identity' }, { id: 'resolvers', name: 'Resolvers', sub: 'Read your signed records' }, { id: 'products', name: 'Products', sub: 'Not public yet' }]);
    },
    idsign: function (s) {
      /* the broker's real order (js/broker/broker.js): a site asks who you are, you choose; then each signature opens the full review */
      var n = num(s, 1, 3), steps = [
        { lead: 'A site asks who you are', rest: idText('share', [0, 3]) },
        { lead: 'You review each signature', rest: idText('sign', [0, 1]) + ' ' + idText('share', [3, 4]) },
        { lead: 'The server checks', rest: idText('sign', [1, 2]) + ' It checks your signature, and nothing more.' }];
      $('idsign', 'kicker').textContent = 'Your identity · signing in';
      $('idsign', 'title').innerHTML = esc('Step ' + n + ' of 3.') + ' <span>' + esc(steps[n - 1].lead + '.') + '</span>';
      $('idsign', 'lede').textContent = 'Your key never leaves your device.';
      $('idsign', 'body').innerHTML = '<ol class="story">' + steps.map(function (it, i) {
        var on = i + 1 === n;
        return '<li><a href="#/idsign?s=' + (i + 1) + '" data-stay class="' + (i + 1 < n ? 'done' : '') + '"' + (on ? ' aria-current="step"' : '') + '><span class="n">' + (i + 1) + '</span><b>' + esc(it.lead) + '</b><span class="say"><span>' + esc(it.rest) + '</span></span></a></li>';
      }).join('') + '</ol>';
      foot('idsign', n < 3 ? ['Next step', '#/idsign?s=' + (n + 1)] : ['See what keeps it safe', '#/idsafe'], n > 1 ? ['Step back', '#/idsign?s=' + (n - 1)] : ['Back: your FXN ID', '#/idstart']);
      tags('idsign', [{ id: 'request', name: 'The site asks', sub: 'Share or Don’t share', cls: n === 1 ? 'hot' : '' },
        { id: 'key', name: 'You review', sub: 'The exact site and the exact bytes', cls: n === 2 ? 'hot' : '' }, { id: 'server', name: 'The server', sub: 'Checks the signature. Never holds the key.', cls: n === 3 ? 'hot' : '' }]);
    },
    idsafe: function (s) {
      /* the order matches the vault's faces in identity-stages.js: one built, then two Partial */
      var n = num(s, 0, 2);
      var list = [['The file alone is useless', idText('secret'), null],
        ['The gate and its lock', idText('factors', [2, 3]) + ' ' + idText('gate', [0, 1]), ID.gate ? ID.gate.state : null],
        ['Hand over to a new key', signer ? (signer.plain || signer.line) + ' Checked against ' + signer.count + ' cases.' : '', 'Partial']];
      $('idsafe', 'kicker').textContent = 'Your identity · security';
      $('idsafe', 'title').innerHTML = esc('Local by design.') + ' <span>' + esc('Your key stays with you.') + '</span>';
      $('idsafe', 'lede').hidden = true;   /* the rows' state tags already say what is partial; the room goes to what the person does */
      /* what the person does: the brief's own safety lines, one idea each */
      var tips = [idText('nobody', [0, 1]) + ' ' + idText('nobody', [2, 3]), 'Keep your Emergency Kit offline. Never photograph or paste it.', idText('session', [5, 6])];   /* one line each where it can: the panel fits 1280x720 */   /* the tab-memory line is on the next step, Your identity */
      $('idsafe', 'body').innerHTML = rows('idsafe', list, n, 0) + '<section class="tips"><h3 class="mono">Keep in mind</h3><ul>' +
        tips.filter(function (t) { return t.trim(); }).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></section>';
      foot('idsafe', ['See your identity', '#/idyou'], ['Back: signing in', '#/idsign']);
      tags('idsafe', list.map(function (r, i) { return { id: 'facet-' + i, name: r[0], sub: r[2] || '', cls: i === n ? 'hot' : '' }; }));
    },
    idyou: function () {
      var gate = NAMES.filter(function (p) { return p.state; })[0];
      $('idyou', 'kicker').textContent = 'Your identity · sample';
      $('idyou', 'title').innerHTML = esc(I.name + '.') + ' <span>' + esc('Your identity.') + '</span>';
      $('idyou', 'lede').textContent = 'A sample identity from the owner’s board. Nothing here is live.';
      $('idyou', 'body').innerHTML = '<dl class="strip"><div><dt>Records</dt><dd>' + REC.records.length + '</dd></div><div><dt>Signed</dt><dd>' + signed + ' of ' + REC.records.length + '</dd></div><div><dt>Names</dt><dd>1</dd></div></dl>' +
        '<div class="you"><section><h3 class="mono">Name</h3><p><b>' + esc(I.name) + '</b> <span class="state" data-state="built">Primary</span></p>' +
        (gate ? '<p class="small">' + stateTag(gate.state) + ' ' + esc(gate.text) + '</p>' : '') + '</section>' +
        '<section><h3 class="mono">Devices</h3>' + I.devices.map(function (d) { return '<p><b>' + esc(d.name) + '</b> <small>' + esc(d.note) + '</small></p>'; }).join('') + '</section>' +
        '<section class="wide"><h3 class="mono">Your key</h3><p>' + esc(idText('file', [2, 3]) + ' ' + idText('memory', [4, 6])) + '</p></section></div>';
      foot('idyou', ['See your chain', '#/chain'], ['Back: security', '#/idsafe']);
      tags('idyou', [{ id: 'badge', name: I.name, sub: 'Sample', cls: 'hot' }].concat(I.devices.map(function (d, i) { return { id: 'device-' + i, name: d.name, sub: d.note }; })));
    },
    idvalue: function () {
      var nets = Object.keys(N.NAMED).filter(function (i) { return N.KIND[i] === 'network'; }).length;   /* DEFXN is the kernel, not a network chain */
      var prods = C.products ? C.products.lanes.reduce(function (a, l) { return a + l.items.length; }, 0) : 0;
      $('idvalue', 'kicker').textContent = 'Your identity · the bigger picture';
      $('idvalue', 'title').innerHTML = esc('One identity.') + ' <span>' + esc('Many chains.') + '</span>';
      $('idvalue', 'lede').textContent = C.minute ? C.minute.after : '';
      $('idvalue', 'body').innerHTML = '<dl class="strip four"><div><dt>Network chains</dt><dd>' + nets + '</dd></div><div><dt>Capabilities</dt><dd>' + CAPS.length + '</dd></div>' +
        '<div><dt>Resolvers</dt><dd>' + RES.length + '</dd></div><div><dt>Products</dt><dd>' + prods + '</dd></div></dl>' +
        '<p class="aside">Counted from the data files: the network’s map, the capability manifests, the resolver files and the brief’s products. All on a devnet. No product is public yet.</p>';
      foot('idvalue', ['Start building', '#/life'], ['Back to network', '#/']);
      tags('idvalue', [{ id: 'you', name: 'Your chain', sub: 'One key, every network', cls: 'hot' }]);
    }
  };
  /* a choice inside a step replaces the entry, so Back leaves the step */
  main.addEventListener('click', function (e) { var a = e.target.closest('.idview [data-stay]'); if (!a) return; e.preventDefault(); location.replace(a.getAttribute('href')); });
  function fill() { var c = current(); if (FILL[c.view]) FILL[c.view](c.s); }
  window.addEventListener('hashchange', fill);
  Object.keys(FILL).forEach(function (v) { FILL[v](null); });
  fill();
})();
