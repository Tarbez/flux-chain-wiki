/* /identity: your FXN ID on one page, on the 3D world (js/world2/world2-host.mjs draws the identity scene itself).

   Layer: app (a page of the DEFXN site). It reads no chain state; the identity it shows is a sample.

   On the game layout since 2026-11-05 (K.hud in js/pages/world-chain.js, docs/design/space/SPACE.md "The page layout").
   Left: kicker, title, the answer, three pill tabs, the open section. Right: records, signed, devices (the sample's
   numbers), and the note that the 3D is an illustration. Dock: See your chain, the one action. The nine-step flow strip
   was removed: the space's path does that job. Show: js/space/shows/identity.mjs (captions only: this view draws its own
   scene). One page, owner-approved 2026-11-05: the answer in one line, then three sections as pill tabs (Sign in, Keep it safe,
   You), one open at a time, Arrow keys move between them (ArkUI.worldFrame K.tabs). The open section rides in the address
   as ?s=sign|safe|you, so the old /identity/sign, /identity/safe and /identity/you can redirect here with that query. No
   query shows the answer's own scene (idstart) with Sign in open. Each section tells the world its view through the frame's
   controller: ArkWorldHost.state() while mounting, ArkWorldHost.select() on a pick (idsign, idsafe, idyou in VIEW_OF).

   REDUCTION TEST
   1 About. What an FXN ID is.
   2 Dominant action. See your chain.
   3 Know now. The answer, and the three lines of the open section.
   4 Hidden until asked. The other two sections, one tab away.
   5 Repeated elsewhere. Nothing: "the key stays on your device" is said once, in Sign in.
   6 Only because the data has it. The name is a sample (js/content/identity-sample.js) and says so. Record counts come
     from the sample records. The signer's checked cases come from the capability data when it is loaded.
   7 Removable without changing the decision. Nothing more.
   8 Leaving keeps state. The open section is in the address (?s=).
   9 Returning. The address reopens the same section.
   10 If WebGL is missing. The words and the tabs work with no 3D.

   Words: the worldidentity manifest (WORLDIDENTITY.*), read by ArkCopy. No word is written in this file.
   Layout: css/space-frame.css (.hud*), css/world-identity.css (.wi-body, .wi-opens), css/world-chain.css (.wc-tabs, .wc-strip). */
(function () {
  'use strict';
  var K = ArkUI.worldFrame;
  if (!K) return;
  var area = 'WORLDIDENTITY.';
  var t = K.words(area);
  var IDS = ['sign', 'safe', 'you'];
  /* the scene each section asks the host for; the s values are the ones each view already reads */
  var WORLD = { sign: { view: 'idsign', s: 1 }, safe: { view: 'idsafe', s: 0 }, you: { view: 'idyou' } };
  function sample() { return window.DEFXN_IDENTITY || { name: '', devices: [] }; }
  function records() { return (window.DEFXN_RECORDS && DEFXN_RECORDS.records) || []; }
  function partial() { return K.state(t('COMMON.PARTIAL'), 'partial'); }

  /* a lead and its line, with an optional state label after the line */
  function rows(ul, list) {
    ul.textContent = '';
    list.forEach(function (r) {
      var li = K.node('li'); li.appendChild(K.node('b', null, r.lead));
      var say = K.node('span', null, r.text); if (r.state) { say.appendChild(document.createTextNode(' ')); say.appendChild(r.state); }
      li.appendChild(say); ul.appendChild(li);
    });
  }

  var sections = {
    sign: function (s) {
      var list = [1, 2, 3].map(function (i) { return { lead: t('SIGN.S' + i), text: t('SIGN.S' + i + '.TEXT') }; });
      var ul = K.node('ul', 'wi-opens'); rows(ul, list); s.panel.appendChild(ul);
      K.tags('idsign', [
        { id: 'request', name: t('SIGN.TAG.REQUEST'), sub: t('SIGN.TAG.REQUESTSUB'), cls: 'hot' },
        { id: 'key', name: t('SIGN.TAG.KEY'), sub: t('SIGN.TAG.KEYSUB') },
        { id: 'server', name: t('SIGN.TAG.SERVER'), sub: t('SIGN.TAG.SERVERSUB') }
      ]);
    },
    safe: function (s) {
      var caps = (window.DEFXN_CAPABILITIES || {}).capabilities || [], signer = caps.filter(function (x) { return x.id === 'signer'; })[0];
      var list = [
        { lead: t('SAFE.R0'), text: t('SAFE.R0.TEXT') },
        { lead: t('SAFE.R1'), text: t('SAFE.R1.TEXT'), state: partial() },
        { lead: t('SAFE.R2'), text: t('SAFE.R2.TEXT') + (signer && signer.count ? ' ' + t('SAFE.R2.CHECKED', { n: signer.count }) : ''), state: partial() }
      ];
      var ul = K.node('ul', 'wi-opens'); rows(ul, list); s.panel.appendChild(ul);
      K.tags('idsafe', list.map(function (r, i) { return { id: 'facet-' + i, name: r.lead, sub: r.state ? r.state.textContent : '', cls: i === 0 ? 'hot' : '' }; }));
    },
    you: function (s) {
      var who = sample();
      var strip = K.node('dl', 'wc-strip');
      K.cells(strip, [[t('YOU.CELL.NAME'), who.name]]);   /* the record counts stand in the right column, said once */
      s.panel.appendChild(strip);
      s.panel.appendChild(K.node('p', 'wc-note mono', t('YOU.SAMPLE')));
      var tags = [{ id: 'badge', name: who.name, sub: t('YOU.TAG.BADGE'), cls: 'hot' }];
      (who.devices || []).forEach(function (d, i) { tags.push({ id: 'device-' + i, name: d.name, sub: d.note }); });
      K.tags('idyou', tags);
    }
  };

  var page = {
    mount: function (hostEl) {
      var id = 'wi-one-title';
      return K.mount(hostEl, {
        view: 'idstart', key: 'identity', area: area, titleId: id,
        /* no query: the answer's scene with Sign in open; an unknown s reads as no query */
        parse: function (params) { var s = params.get('s'); return { s: IDS.indexOf(s) >= 0 ? s : '' }; },
        query: function (st) { return st.s ? 's=' + st.s : ''; },
        world: function (st) { return st.s ? WORLD[st.s] : { view: 'idstart' }; },
        hud: true,
        build: function (c) {
          var f = c.f, s = c.refs = {};
          f.kicker.textContent = t('KICKER');
          s.h1 = f.title; K.title(s.h1, t('TITLE'));
          f.answer.textContent = t('ANSWER');
          s.tabs = K.tabs(t('TABS'), IDS.map(function (k) { return { id: k, tab: 'wi-tab-' + k, panel: 'wi-panel', text: t('TAB.' + k.toUpperCase()) }; }),
            function (k) { c.set({ s: k }); });
          f.tabs.appendChild(s.tabs.bar);
          if (s.tabs.stop) c.stops.push(s.tabs.stop);
          s.panel = f.add(K.node('div', 'wi-body'), true); s.panel.id = 'wi-panel'; s.panel.setAttribute('role', 'tabpanel');
          /* the right column: the sample's own numbers, and the note that the 3D is an illustration */
          var all = records(), who = sample();
          K.stats(f.stats, [[all.length, t('YOU.CELL.RECORDS')], [all.filter(function (r) { return r.signedBy; }).length, t('YOU.CELL.SIGNED')],
            [(who.devices || []).length, t('STAT.DEVICES')]], t('COMMON.MISSING'));
          f.actions.appendChild(K.node('p', 'wc-note mono', t('NOTE')));
          s.cta = K.cta(); K.link(s.cta, 'chain'); s.cta.say.textContent = t('CTA');
          f.go(s.cta);
        },
        render: function (st, c) {
          var s = c.refs, open = st.s || 'sign';
          s.tabs.select(open); s.panel.setAttribute('aria-labelledby', 'wi-tab-' + open);
          s.panel.textContent = ''; sections[open](s);
          if (!st.s) K.tags('idstart', [
            { id: 'key', name: t('START.TAG.KEY'), sub: t('START.TAG.KEYSUB'), cls: 'hot' },
            { id: 'apps', name: t('START.TAG.APPS'), sub: t('START.TAG.APPSSUB') },
            { id: 'chains', name: t('START.TAG.CHAINS'), sub: t('START.TAG.CHAINSSUB') },
            { id: 'resolvers', name: t('START.TAG.RESOLVERS'), sub: t('START.TAG.RESOLVERSSUB') },
            { id: 'products', name: t('START.TAG.PRODUCTS'), sub: t('START.TAG.PRODUCTSSUB') }
          ]);
        }
      });
    }
  };

  ArkUI.pageModules.worldIdentity = page;
  /* the old three routes mount the same page until routing redirects them to /identity?s= */
  ArkUI.pageModules.worldIdentitySign = page;
  ArkUI.pageModules.worldIdentitySafe = page;
  ArkUI.pageModules.worldIdentityYou = page;
})();
