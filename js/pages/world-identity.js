/* /identity, /identity/sign, /identity/safe, /identity/you: your FXN ID on the 3D world (js/world/world-host.js).

   The first four steps of the mockup's nine-step identity flow (docs/home-redesign/home-mockup.html #/idstart, #/idsign,
   #/idsafe, #/idyou), each with its own 3D. The flow goes on into /chain, /chain/record, /chain/open and /chain/links
   (js/pages/world-chain.js), and ends on /intro. Every page is built on the frame of world-chain.js (ArkUI.worldFrame): the
   crumbs, the stage the camera fits ([data-stage]), the slab under the words ([data-panel]), the strip that shows where you
   are in the nine, and the controller that keeps a choice in the address and tells the world (ArkWorldHost.state() while
   mounting, ArkWorldHost.select() on a choice). Without the world each page reads and works on its own.

   REDUCTION TEST (one answer for each page, in the mockup's own order)
   1 About. start: one key file for every network. sign: how a sign-in works. safe: what keeps the key safe today.
     you: your identity at a glance.
   2 Dominant action. start: How signing in works. sign: Next step, then See what keeps it safe. safe: See your identity.
     you: See your chain.
   3 Know now. start: the file stays on your device, and what it opens. sign: the step you are on, and that your key never
     leaves your device. safe: each safeguard and its state. you: name, devices, the key's state, how many records you hold.
   4 Hidden until asked. The other steps of a sign-in and the other safeguards open on a pick. The other pages of the flow
     are the strip's arrows.
   5 Repeated elsewhere. Nothing: the brief's sentences are said once, here.
   6 Only because the data has it. The name and the devices are a sample (js/content/identity-sample.js) and say so. The
     record counts come from the sample records. The signer's checked cases come from the capability data when it is loaded.
   7 Removable without changing the decision. Nothing more.
   8 Leaving keeps state. The step of a sign-in and the safeguard in view ride in the address (?s=).
   9 Returning. The address restores the same step.
   10 If WebGL is missing. The words, the picks and the strip all work with no 3D.

   Words: the worldidentity manifest (WORLDIDENTITY.*) and the strip's words in worldchain (WORLDCHAIN.FLOW.*), read by ArkCopy.
   No word is written in this file. Layout: css/world-identity.css (these pages) over css/world-chain.css (the frame).
   Motion: every .rise item rises in and leaves by transform and clip (ArkUI.worldRise). Nothing fades. */
(function () {
  'use strict';
  var K = ArkUI.worldFrame;
  if (!K) return;
  var area = 'WORLDIDENTITY.';
  var t = K.words(area);
  function sample() { return window.DEFXN_IDENTITY || { name: '', devices: [] }; }
  function records() { return (window.DEFXN_RECORDS && DEFXN_RECORDS.records) || []; }

  /* the page's address state: ?s= is a step or a safeguard, inside a range, with a default that needs no query */
  function choice(view, lo, hi) {
    return {
      parse: function (params) { return { s: K.clamp(params.get('s'), lo, hi, lo) }; },
      query: function (st) { return st.s === lo ? '' : 's=' + st.s; },
      world: function (st) { return { view: view, s: st.s }; }
    };
  }
  var NONE = {
    parse: function () { return {}; },
    query: function () { return ''; },
    world: function (view) { return function () { return { view: view }; }; }
  };

  /* one page of the flow: the frame, the strip, the eyebrow, the heading, the lede, the body, the foot */
  function page(o) {
    return {
      mount: function (hostEl) {
        var id = 'wi-' + o.id + '-title';
        return K.mount(hostEl, {
          first: o.first, view: o.view, key: o.key, area: area, titleId: id, here: t('COMMON.HERE'), back: { key: 'zero', text: t('COMMON.BACK') },
          parse: o.parse, query: o.query, world: o.world,
          build: function (c) {
            var f = c.f, s = c.refs = {};
            s.note = K.node('p', 'wc-note mono rise'); f.col.appendChild(s.note);
            f.add(K.flow(o.step));
            s.kicker = f.add(K.node('p', 'wc-eyebrow mono'));
            s.h1 = f.add(K.node('h1', 'wc-two'), true); s.h1.id = id;
            s.lede = f.add(K.node('p', 'wc-lede'), true);
            s.body = f.add(K.node('div', 'wi-body'), true);
            s.cta = K.cta(); s.more = K.node('a');
            f.add(K.foot(s.cta, [s.more]));
            if (o.build) o.build(c);
          },
          render: function (st, c) { o.render(st, c, c.refs); },
          picks: o.picks
        });
      }
    };
  }
  /* the foot: the one action and a quiet link. A target is another page ({ key, query }) or another choice on this page ({ stay: n }). */
  function aim(c, a, target) {
    a.onclick = null; a.removeAttribute('data-scene-link');
    if (target.stay != null) {
      K.stayLink(a, c.def.key, target.stay === c.def.first ? '' : 's=' + target.stay);
      a.onclick = function (e) { c.stay(e, { s: target.stay }); };
    } else K.link(a, target.key, target.query);
  }
  function foot(s, c, cta, ctaTarget, more, moreTarget) {
    s.cta.say.textContent = cta; aim(c, s.cta, ctaTarget);
    s.more.hidden = !more;
    if (more) { s.more.textContent = more; aim(c, s.more, moreTarget); }
  }
  /* a state label: Partial for what is built in part */
  function partial() { return K.state(t('COMMON.PARTIAL'), 'partial'); }

  /* ---------- /identity: your FXN ID ---------- */
  var start = page({
    id: 'start', view: 'idstart', key: 'identity', step: 0, parse: NONE.parse, query: NONE.query, world: NONE.world('idstart'),
    render: function (st, c, s) {
      s.note.textContent = t('START.NOTE');
      s.kicker.textContent = t('START.KICKER'); K.title(s.h1, t('START.TITLE'), t('START.SUB')); s.lede.textContent = t('START.LEDE');
      /* what one key opens */
      s.body.textContent = '';
      var ul = K.node('ul', 'wi-opens');
      ['APPS', 'CHAIN', 'RESOLVERS', 'PRODUCTS'].forEach(function (k) {
        var li = K.node('li'); li.appendChild(K.node('b', null, t('START.OPENS.' + k))); li.appendChild(K.node('span', null, t('START.OPENS.' + k + '.TEXT'))); ul.appendChild(li);
      });
      s.body.appendChild(ul);
      foot(s, c, t('START.CTA'), { key: 'identity/sign' }, t('START.MORE'), { key: 'identity/you' });
      K.tags('idstart', [
        { id: 'key', name: t('START.TAG.KEY'), sub: t('START.TAG.KEYSUB'), cls: 'hot' },
        { id: 'apps', name: t('START.TAG.APPS'), sub: t('START.TAG.APPSSUB') },
        { id: 'chains', name: t('START.TAG.CHAINS'), sub: t('START.TAG.CHAINSSUB') },
        { id: 'resolvers', name: t('START.TAG.RESOLVERS'), sub: t('START.TAG.RESOLVERSSUB') },
        { id: 'products', name: t('START.TAG.PRODUCTS'), sub: t('START.TAG.PRODUCTSSUB') }
      ]);
    }
  });

  /* a list of choices inside a page: each a link that keeps the address, one open at a time */
  function picker(s, c, name, key, items, at, first) {
    s.body.textContent = '';
    var ol = K.node('ol', name);
    items.forEach(function (it, i) {
      var n = i + first, li = K.node('li'), a = K.stayLink(K.node('a'), key, n === first ? '' : 's=' + n);
      a.dataset.pick = String(n); if (n === at) a.setAttribute('aria-current', name === 'wi-story' ? 'step' : 'true');
      if (name === 'wi-story') { if (n < at) a.className = 'done'; a.appendChild(K.node('span', 'n', String(i + 1))); }
      var head = K.node('b', null, it.lead); if (it.state) head.appendChild(it.state);
      a.appendChild(head);
      var say = K.node('span', 'say'); say.appendChild(K.node('span', null, it.text)); a.appendChild(say);
      li.appendChild(a); ol.appendChild(li);
    });
    ol.addEventListener('click', function (e) { var a = e.target.closest('[data-pick]'); if (a) c.stay(e, { s: +a.dataset.pick }); });
    s.body.appendChild(ol);
    return ol;
  }
  function keepPick(s, fn) {
    var was = document.activeElement && s.body.contains(document.activeElement) ? document.activeElement.getAttribute('data-pick') : null;
    fn();
    if (was) { var again = s.body.querySelector('[data-pick="' + was + '"]'); if (again) again.focus({ preventScroll: true }); }
  }

  /* ---------- /identity/sign: how a sign-in works, three steps ---------- */
  var sign = choice('idsign', 1, 3);
  var signPage = page({
    id: 'sign', first: 1, view: 'idsign', key: 'identity/sign', step: 1, parse: sign.parse, query: sign.query, world: sign.world,
    render: function (st, c, s) {
      var n = st.s, steps = [1, 2, 3].map(function (i) { return { lead: t('SIGN.S' + i), text: t('SIGN.S' + i + '.TEXT') }; });
      s.note.textContent = t('SIGN.NOTE');
      s.kicker.textContent = t('SIGN.KICKER'); K.title(s.h1, t('SIGN.TITLE', { n: n }), steps[n - 1].lead + '.'); s.lede.textContent = t('SIGN.LEDE');
      keepPick(s, function () { picker(s, c, 'wi-story', 'identity/sign', steps, n, 1); });
      if (n < 3) foot(s, c, t('SIGN.NEXT'), { stay: n + 1 }, n > 1 ? t('SIGN.BACKSTEP') : t('SIGN.BACKSTART'), n > 1 ? { stay: n - 1 } : { key: 'identity' });
      else foot(s, c, t('SIGN.TOSAFE'), { key: 'identity/safe' }, t('SIGN.BACKSTEP'), { stay: 2 });
      K.tags('idsign', [
        { id: 'request', name: t('SIGN.TAG.REQUEST'), sub: t('SIGN.TAG.REQUESTSUB'), cls: n === 1 ? 'hot' : '' },
        { id: 'key', name: t('SIGN.TAG.KEY'), sub: t('SIGN.TAG.KEYSUB'), cls: n === 2 ? 'hot' : '' },
        { id: 'server', name: t('SIGN.TAG.SERVER'), sub: t('SIGN.TAG.SERVERSUB'), cls: n === 3 ? 'hot' : '' }
      ]);
    }
  });

  /* ---------- /identity/safe: what keeps the key safe today ---------- */
  var safe = choice('idsafe', 0, 2);
  var safePage = page({
    id: 'safe', first: 0, view: 'idsafe', key: 'identity/safe', step: 2, parse: safe.parse, query: safe.query, world: safe.world,
    render: function (st, c, s) {
      var n = st.s, caps = (window.DEFXN_CAPABILITIES || {}).capabilities || [], signer = caps.filter(function (x) { return x.id === 'signer'; })[0];
      var rows = [
        { lead: t('SAFE.R0'), text: t('SAFE.R0.TEXT') },
        { lead: t('SAFE.R1'), text: t('SAFE.R1.TEXT'), state: partial() },
        { lead: t('SAFE.R2'), text: t('SAFE.R2.TEXT') + (signer && signer.count ? ' ' + t('SAFE.R2.CHECKED', { n: signer.count }) : ''), state: partial() }
      ];
      s.note.textContent = t('SAFE.NOTE');
      s.kicker.textContent = t('SAFE.KICKER'); K.title(s.h1, t('SAFE.TITLE'), t('SAFE.SUB'));
      /* the rows' state labels already say what is partial, so the room goes to what the person does */
      s.lede.hidden = true;
      keepPick(s, function () {
        picker(s, c, 'wi-rows', 'identity/safe', rows, n, 0);
        var tips = K.node('section', 'wi-tips'); tips.appendChild(K.node('h3', 'mono', t('SAFE.TIPS')));
        var ul = K.node('ul'); [1, 2, 3].forEach(function (i) { ul.appendChild(K.node('li', null, t('SAFE.TIP' + i))); }); tips.appendChild(ul); s.body.appendChild(tips);
      });
      foot(s, c, t('SAFE.CTA'), { key: 'identity/you' }, t('SAFE.MORE'), { key: 'identity/sign', query: 's=3' });
      K.tags('idsafe', rows.map(function (r, i) { return { id: 'facet-' + i, name: r.lead, sub: r.state ? r.state.textContent : '', cls: i === n ? 'hot' : '' }; }));
    }
  });

  /* ---------- /identity/you: your identity at a glance ---------- */
  var you = page({
    id: 'you', view: 'idyou', key: 'identity/you', step: 3, parse: NONE.parse, query: NONE.query, world: NONE.world('idyou'),
    render: function (st, c, s) {
      var who = sample(), all = records(), signed = all.filter(function (r) { return r.signedBy; }).length;
      s.note.textContent = t('YOU.NOTE');
      s.kicker.textContent = t('YOU.KICKER'); K.title(s.h1, who.name + '.', t('YOU.TITLE')); s.lede.textContent = t('YOU.LEDE'); s.lede.hidden = false;
      s.body.textContent = '';
      var strip = K.node('dl', 'wc-strip');
      K.cells(strip, [[t('YOU.CELL.RECORDS'), all.length], [t('YOU.CELL.SIGNED'), t('YOU.OF', { n: signed, total: all.length })], [t('YOU.CELL.NAMES'), who.name ? 1 : 0]]);
      s.body.appendChild(strip);
      var grid = K.node('div', 'wi-you');
      function section(cls, head) { var sec = K.node('section', cls); sec.appendChild(K.node('h3', 'mono', head)); grid.appendChild(sec); return sec; }
      var name = section('', t('YOU.NAME')), p = K.node('p'); p.appendChild(K.node('b', null, who.name)); p.appendChild(document.createTextNode(' ')); p.appendChild(K.state(t('COMMON.PRIMARY'), 'built')); name.appendChild(p);
      var rule = K.node('p', 'small'); rule.appendChild(partial()); rule.appendChild(document.createTextNode(' ' + t('YOU.NAMENOTE'))); name.appendChild(rule);
      var devices = section('', t('YOU.DEVICES'));
      (who.devices || []).forEach(function (d) { var q = K.node('p'); q.appendChild(K.node('b', null, d.name)); q.appendChild(document.createTextNode(' ')); q.appendChild(K.node('small', null, d.note)); devices.appendChild(q); });
      section('wide', t('YOU.KEY')).appendChild(K.node('p', null, t('YOU.KEYTEXT')));
      s.body.appendChild(grid);
      foot(s, c, t('YOU.CTA'), { key: 'chain' }, t('YOU.MORE'), { key: 'identity/safe' });
      var tags = [{ id: 'badge', name: who.name, sub: t('YOU.TAG.BADGE'), cls: 'hot' }];
      (who.devices || []).forEach(function (d, i) { tags.push({ id: 'device-' + i, name: d.name, sub: d.note }); });
      K.tags('idyou', tags);
    }
  });

  ArkUI.pageModules.worldIdentity = start;
  ArkUI.pageModules.worldIdentitySign = signPage;
  ArkUI.pageModules.worldIdentitySafe = safePage;
  ArkUI.pageModules.worldIdentityYou = you;
})();
