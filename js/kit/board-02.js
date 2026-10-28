/* =====================================================================
   KIT BOARD 02 · PANELS & DATA (js/kit/board-02.js)
   ---------------------------------------------------------------------
   One renderer per element of board 02, registered in DefxnKit. Built with the helpers board 01 defines
   (DefxnKitA, js/kit/board-01.js, which the 'kit' route loads first): the same Ark blocks and light-DOM
   primitives, the same part names for skins, the same sizing (css/kit-boards-a.css).

   Data: every value is a sample from the site's own files, read here, never typed in:
     DEFXN_IDENTITY (js/content/identity-sample.js)       the FXN ID alex.fxn and its two devices
     DEFXN_RECORDS (js/content/records-sample.js)         the sample chain's records, revisions, dates, history
     DEFXN_RESOLVERS (js/content/resolvers-data.js)       the resolver table (commands, signed commands, price)
     DEFXN_CAPABILITIES (js/content/capabilities-data.js) the fleet run BENCH-013 and its figures, with their source
     DEFXN_NETWORK (js/content/network-data.js)           the chain kinds of the network picture
   Where a sample has no value (a wallet balance), the element says so instead of showing a number.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.DefxnKitA;
  if (!A) throw new Error('js/kit/board-02.js refused: DefxnKitA is missing. Needs: js/kit/board-01.js loaded first. Remedy: list board-01.js before board-02.js in the kit route (js/pages/catalog.js).');
  var h = A.h, icon = A.icon, reg = A.reg;

  function identity() { return A.sample('DEFXN_IDENTITY', 'js/content/identity-sample.js'); }
  function records() { return A.sample('DEFXN_RECORDS', 'js/content/records-sample.js').records; }
  function resolvers() { return A.sample('DEFXN_RESOLVERS', 'js/content/resolvers-data.js').resolvers; }
  function network() { return A.sample('DEFXN_NETWORK', 'js/content/network-data.js'); }
  function fleet() { return A.sample('DEFXN_CAPABILITIES', 'js/content/capabilities-data.js').fleet; }
  function cap(w) { return w.charAt(0).toUpperCase() + w.slice(1); }
  /* the sample chain oldest first, as a series: revision by record */
  function revisions() { return records().slice().reverse().map(function (r) { return { label: r.date, short: r.date.slice(0, 6), value: r.revision }; }); }
  /* chain kinds of the network picture, counted (the kernel hub is not a kind of chain) */
  function kinds() {
    var n = {}, order = [];
    network().KIND.forEach(function (k) { if (k === 'hub') return; if (!n[k]) { n[k] = 0; order.push(k); } n[k]++; });
    return order.map(function (k) { return { kind: k, n: n[k] }; }).sort(function (a, b) { return b.n - a.n; });
  }
  /* one block in its own root */
  function blockEl(kind, name, props, mods) { return function (host) { A.root(host, kind, mods).appendChild(A.block(name, typeof props === 'function' ? props() : props)); }; }

  /* ---------- stats ---------- */
  reg('02-stat-card', blockEl('stat', 'stat', function () {
    var f = fleet(), fig = f.figures[0];
    return { label: fig.name, value: fig.value, unit: fig.unit, format: 'grouped', detail: 'Run ' + f.run + ', ' + f.nodes + ' nodes at once' };
  }, 'kit-a--tall'), { uses: ['stat block'] });

  reg('02-metric-card', function (host) {
    var r = A.root(host, 'metric'), H = A.host(), res = resolvers().filter(function (x) { return x.signedCommands > 1; })[0] || resolvers()[0];
    var bar = h('span', { class: 'kit-a-meter__fill', part: 'PROGRESSINDICATOR' });
    var track = h('span', { class: 'kit-a-meter', part: 'PROGRESS' }, [bar]);
    var label = h('span', { class: 'kit-a-stat__label', part: 'STATLABEL', text: 'Signed commands' });
    r.appendChild(h('div', { class: 'kit-a-stat', part: 'STAT' }, [
      h('div', { class: 'kit-a-row kit-a-row--split' }, [label, h('span', { class: 'kit-a-tag', part: 'META|TEXT', text: res.name + ' resolver' })]),
      h('span', { class: 'kit-a-stat__value', part: 'STATVALUE' }, [String(res.signedCommands), h('span', { class: 'kit-a-stat__unit', text: ' of ' + res.commands })]),
      track]));
    A.prim('createArkProgress')(H, { rootRef: H.bind(track, 'metric-bar'), indicatorRef: H.bind(bar, 'metric-fill'), labelRef: H.bind(label, 'metric-label'), min: 0, max: res.commands, value: res.signedCommands });
  }, { uses: ['STAT', 'STATLABEL', 'STATVALUE', 'createArkProgress'] });

  reg('02-summary-row', blockEl('summary', 'stats', function () {
    var rs = records(), signed = rs.filter(function (x) { return x.state === 'Signed'; }).length;
    return { label: 'Your chain', columns: 3, items: [{ label: 'Records', value: rs.length }, { label: 'Signed', value: signed }, { label: 'Devices', value: identity().devices.length }] };
  }, 'kit-a--tall'), { uses: ['stats block'] });

  /* ---------- cards ---------- */
  reg('02-identity-card', blockEl('card', 'card', function () {
    var id = identity();
    return { eyebrow: 'FXN ID', title: id.name, description: id.devices.map(function (d) { return d.name; }).join(' and ') + ' can sign for it.', meta: id.devices.length + ' devices', badge: { label: 'Owner', meaning: 'identity' } };
  }, 'kit-a--tall'), { uses: ['card block', 'badge (identity)'] });

  reg('02-wallet-card', function (host) {
    var r = A.root(host, 'wallet'), id = identity();
    r.appendChild(h('div', { class: 'kit-a-panel', part: 'CARD' }, [
      h('div', { class: 'kit-a-row kit-a-row--split', part: 'CARDHEADER' }, [h('span', { class: 'kit-a-eyebrow', part: 'CAPTION|TEXT', text: 'Wallet' }), h('span', { class: 'ark-status', 'data-tone': 'live', part: 'STATUS', text: 'Devnet' })]),
      h('div', { class: 'kit-a-wallet__name', part: 'CARDTITLE', text: id.name }),
      h('div', { class: 'kit-a-row kit-a-row--split' }, [h('span', { class: 'kit-a-stat__label', part: 'STATLABEL', text: 'FXN balance' }), h('span', { class: 'kit-a-absent', part: 'EMPTY|TEXT', text: 'Not read on this page' })])]));
  }, { uses: ['CARD', 'CARDHEADER', 'CARDTITLE', '.ark-status', 'EMPTY|TEXT'], partial: 'Ark UI has no wallet card, so this is an Ark card with a balance line. It reads no wallet, so the balance stays empty.' });

  reg('02-note-card', blockEl('card', 'card', function () {
    var n = records()[0];
    return { eyebrow: n.type, title: n.title, description: n.about, meta: 'Rev ' + n.revision + ' · ' + n.date, status: n.state ? { label: n.state, tone: 'trust' } : undefined };
  }, 'kit-a--tall'), { uses: ['card block', 'status'] });

  reg('02-resolver-card', blockEl('card', 'card', function () {
    var x = resolvers()[0];
    return { eyebrow: 'Resolver', title: x.name, description: x.line, meta: x.commands + ' commands · price: ' + x.price, status: x.grammar === 'checked' ? { label: 'Grammar checked', tone: 'trust' } : undefined };
  }, 'kit-a--tall'), { uses: ['card block', 'status'], partial: "Ark UI has no resolver card, so this is Ark's card filled from the resolver table." });

  reg('02-network-card', blockEl('card', 'card', function () {
    var named = network().NAMED, fxn = Object.keys(named).map(function (k) { return named[k]; }).filter(function (c) { return c.first; })[0];
    var others = Object.keys(named).map(function (k) { return named[k]; }).filter(function (c) { return c.coin && !c.first && !/ledger$/.test(c.name); });
    return { eyebrow: 'Network chain', title: fxn.name, description: 'The first chain. Its coin is ' + fxn.coin + '.', meta: 'Beside it: ' + others.map(function (c) { return c.name + ' (' + c.coin + ')'; }).join(', '), status: { label: 'Devnet', tone: 'live' } };
  }, 'kit-a--tall'), { uses: ['card block', 'status'], partial: "Ark UI has no network card, so this is Ark's card filled from the network sample." });

  reg('02-chain-card', function (host) {
    var r = A.root(host, 'chain', 'kit-a--tall'), rs = records();
    var card = A.block('card', { eyebrow: 'Identity chain', title: identity().name, meta: rs.length + ' records, newest rev ' + rs[0].revision });
    card.insertBefore(A.block('lane', { label: 'The chain of ' + rs.length + ' records, running on its own', outline: 'solid', links: rs.length }), card.lastChild);
    r.appendChild(card);
  }, { uses: ['card block', 'lane block'], partial: "Ark UI has no chain card, so Ark's lane block sits inside Ark's card." });

  reg('02-resource-card', blockEl('card', 'card', { eyebrow: 'Doc', title: 'One name system', description: 'How .fxn names are claimed, moved and read.', meta: 'docs/DEFXN-NAMES-ONE-SYSTEM.md' }, 'kit-a--tall'), { uses: ['card block'] });

  /* ---------- panels and callouts ---------- */
  reg('02-info-panel', blockEl('callout', 'callout', { tone: 'info', title: 'Names are flat', body: 'A name is one word and .fxn, like radio.fxn.' }, 'kit-a--tall'), { uses: ['callout block (info)', 'createArkAlert'] });

  reg('02-alert-panel', function (host) {
    var r = A.root(host, 'callout', 'kit-a--tall');
    r.appendChild(A.block('callout', { tone: 'drift', title: 'Needs your signature', body: 'Project notes has a change that is not signed.', actions: [{ label: 'Sign it', tone: 'primary', action: 'sign' }] }));
  }, { uses: ['callout block (drift)', 'actions'] });

  /* ---------- disclosure ---------- */
  reg('02-expandable-accordion', blockEl('accordion', 'accordion', {
    label: 'Names', defaultOpen: ['what'], items: [
      { value: 'what', title: 'What is a flat name?', content: 'One word and .fxn, like radio.fxn.' },
      { value: 'who', title: 'Who can claim one today?', content: 'Only the genesis key. A public way in is not built yet.' },
      { value: 'where', title: 'Where do names live?', content: "In dense-wire's signed records." }]
  }, 'kit-a--tall'), { uses: ['accordion block', 'createArkAccordion'] });

  reg('02-collapsible-section', blockEl('disclosure', 'disclosure', function () {
    var n = records()[0];
    return { content: n.content.map(function (c) { return c.head + ': ' + c.items.join(', ') + '.'; }).join('\n\n'), more: 'Show the notes', less: 'Hide the notes', preview: 1 };
  }, 'kit-a--tall'), { uses: ['disclosure block', 'createArkDisclosure'] });

  reg('02-details-summary-block', function (host) {
    var r = A.root(host, 'details'), H = A.host(), n = records()[0];
    var trigger = h('button', { type: 'button', class: 'kit-a-summary', part: 'SUMMARY' }, [
      h('span', { class: 'kit-a-summary__title', part: 'TITLE|TEXT', text: n.title }), h('span', { class: 'kit-a-tag', part: 'META|TEXT', text: 'Rev ' + n.revision }), icon('chevron-down')]);
    var content = h('div', { class: 'kit-a-summary__body', part: 'DETAIL' });
    content.appendChild(A.block('facts', { label: n.title, columns: 2, items: [{ term: 'Type', value: n.type }, { term: 'Signed by', value: n.signedBy || 'Nobody yet' }, { term: 'Date', value: n.date, mono: true }, { term: 'State', value: n.state || 'Draft' }] }));
    r.appendChild(h('div', { class: 'kit-a-panel kit-a-panel--flush', part: 'COLLAPSIBLE' }, [trigger, content]));
    A.prim('createArkCollapsible')(H, { triggerRef: H.bind(trigger, 'details-trigger'), contentRef: H.bind(content, 'details-content'), defaultOpen: false });
  }, { uses: ['createArkCollapsible', 'COLLAPSIBLE', 'SUMMARY', 'DETAIL', 'facts block'] });

  /* ---------- records as data ---------- */
  reg('02-key-value-module', blockEl('facts', 'facts', function () {
    var id = identity(), n = records()[0];
    return { label: 'FXN ID', columns: 2, items: [{ term: 'Name', value: id.name, mono: true }, { term: 'Network', value: 'Devnet' }, { term: 'Devices', value: String(id.devices.length) }, { term: 'Last record', value: 'Rev ' + n.revision, mono: true }] };
  }, 'kit-a--tall'), { uses: ['facts block'] });

  reg('02-table-row-module', blockEl('table', 'table', function () {
    return { caption: 'Sample chain', maxHeight: 'compact', columns: [{ key: 'title', label: 'Record' }, { key: 'rev', label: 'Rev', numeric: true, mono: true }, { key: 'date', label: 'Date', mono: true }],
      rows: records().slice(0, 3).map(function (x) { return { title: x.title, rev: x.revision, date: x.date }; }) };
  }, 'kit-a--tall'), { uses: ['table block'] });

  reg('02-list-cell', function (host) {
    var r = A.root(host, 'items'), H = A.host(), list = h('div', { class: 'kit-a-stack', part: 'LIST' }), collection = 'kit-a-cells';
    var refs = records().slice(0, 2).map(function (x) {
      var row = h('div', { class: 'kit-a-item', part: 'ITEM' }, [
        h('span', { class: 'kit-a-item__lead', part: 'ITEMLEADING' }, [icon('document')]),
        h('span', { class: 'kit-a-item__main', part: 'ITEMCONTENT' }, [h('span', { class: 'kit-a-item__title', part: 'TITLE|TEXT', text: x.title }), h('span', { class: 'kit-a-tag', part: 'META|TEXT', text: 'Rev ' + x.revision + ' · ' + x.date })]),
        h('span', { class: 'kit-a-item__trail', part: 'ITEMTRAILING' }, [icon('chevron-right')])]);
      list.appendChild(row);
      var ref = H.bind(row, 'cell');
      A.prim('createArkItem')(H, { itemRef: ref, collection: collection, onSelect: function () {
        Array.prototype.forEach.call(list.children, function (c) { c.toggleAttribute('data-selected', c === row); });
      } });
      return ref;
    });
    H.createRovingFocusGroup(collection, { refs: refs, orientation: 'vertical', loop: true });
    r.appendChild(list);
  }, { uses: ['createArkItem', 'ITEM', 'ITEMLEADING', 'ITEMCONTENT', 'ITEMTRAILING'] });

  reg('02-data-block', function (host) {
    var r = A.root(host, 'data'), n = records()[0];
    r.appendChild(h('div', { class: 'kit-a-panel', part: 'PANEL' }, [
      h('div', { class: 'kit-a-row kit-a-row--split' }, [h('span', { class: 'kit-a-eyebrow', part: 'CAPTION|TEXT', text: 'Title, as stored' }), h('span', { class: 'kit-a-tag', part: 'META|TEXT', text: 'hex of UTF-8' })]),
      h('code', { class: 'kit-a-hex', part: 'CODE|TEXT', text: A.hex(n.title) }),
      h('span', { class: 'kit-a-help', part: 'HELPER|TEXT', text: n.title })]));
  }, { uses: ['PANEL', 'CODE|TEXT', 'CAPTION|TEXT'], partial: 'Ark UI has no data block, so a panel holds the code text. The hex is derived from the sample title.' });

  /* ---------- code: createArkCodeBlock, with its copy; the terminal is Ark's terminal block ---------- */
  function codeBlock(o) {
    var H = A.host();
    var label = h('span', { class: 'kit-a-eyebrow', part: 'CAPTION|TEXT', text: o.label });
    var toggle = A.btn('', 'ghost', { 'class': 'kit-a-code__toggle' });
    var copy = A.btn('', 'ghost', { 'class': 'kit-a-code__toggle' });
    var code = h('code', { class: 'kit-a-code__text', part: 'CODEBLOCKCODE', text: o.code });
    var content = h('pre', { class: 'kit-a-code__body', part: 'CODEBLOCKCONTENT' }, [code]);
    var wrap = h('div', { class: 'kit-a-code', part: 'CODEBLOCK' }, [
      h('div', { class: 'kit-a-row kit-a-row--split' }, [label, h('span', { class: 'kit-a-row' }, [toggle, copy])]),
      content]);
    A.prim('createArkCodeBlock')(H, { triggerRef: A.live(H, toggle, 'code-toggle'), contentRef: H.bind(content, 'code'), codeRef: H.bind(code, 'code-text'), labelRef: H.bind(label, 'code-label'),
      copyTriggerRef: A.live(H, copy, 'code-copy'), defaultOpen: true, collapsedLabel: 'Show', expandedLabel: 'Hide', copyLabel: 'Copy', copiedLabel: 'Copied', copyUnavailableLabel: 'Copy blocked here' });
    toggle.textContent = 'Hide';
    return wrap;
  }
  reg('02-code-snippet', function (host) {
    A.root(host, 'code').appendChild(codeBlock({ label: 'Check the name writers', code: 'npm run names:check' }));
  }, { uses: ['createArkCodeBlock', 'CODEBLOCK', 'CODEBLOCKCONTENT', 'CODEBLOCKCODE'] });
  reg('02-terminal-block', blockEl('code', 'terminal', { title: 'Terminal', copy: true, lines: [
    { kind: 'command', text: 'npm run workspace:route -- "kit"' }, { kind: 'command', text: 'npm run copy:check -- js/kit/board-02.js' }] }, 'kit-a--tall'), { uses: ['terminal block'] });

  /* ---------- charts: Ark's chart blocks (spark, donut), static markup the light-DOM host can draw ---------- */
  reg('02-chart-frame', blockEl('chart', 'spark', function () {
    return { label: 'Revisions in the sample chain', area: true, axis: true, points: revisions().map(function (p) { return { label: p.short, value: p.value }; }) };
  }, 'kit-a--tall'), { uses: ['spark block'] });

  reg('02-mini-graph-card', blockEl('mini', 'spark', function () {
    return { label: 'Newest revision', compact: true, points: revisions().map(function (p) { return { label: p.short, value: p.value }; }) };
  }), { uses: ['spark block (compact)'] });

  reg('02-donut-chart-module', blockEl('donut', 'donut', function () {
    return { label: 'Chains by kind', centerLabel: 'chains', items: kinds().map(function (k) { return { label: cap(k.kind), value: k.n }; }) };
  }, 'kit-a--tall'), { uses: ['donut block'] });

  reg('02-bar-chart-module', blockEl('meter', 'meter', function () {
    return { label: 'Commands per resolver', unit: 'commands', items: resolvers().slice(0, 4).map(function (x) { return { label: x.name, value: x.commands }; }) };
  }, 'kit-a--tall'), { uses: ['meter block (bar list)'] });

  /* ---------- time ---------- */
  reg('02-timeline-module', blockEl('steps', 'steps', function () {
    var n = records()[0], p = n.provenance || [];
    return { label: 'History of ' + n.title, mode: 'progress', items: p.map(function (e, i) { return { title: e.what, body: e.date + ' · ' + e.by, state: i < p.length - 1 ? 'done' : 'current' }; }) };
  }, 'kit-a--tall'), { uses: ['steps block (progress)'] });

  reg('02-activity-feed-tile', blockEl('list', 'list', function () {
    return { label: 'Recent records', empty: { reason: 'No records in this chain yet.' },
      items: records().slice(0, 3).map(function (x) { return { id: x.id, title: x.title, meta: 'Rev ' + x.revision + ' · ' + x.date, status: x.state ? { label: x.state, tone: 'trust' } : { label: 'Not signed', tone: 'drift' } }; }) };
  }, 'kit-a--tall'), { uses: ['list block', 'status'] });

  /* ---------- surfaces that open ---------- */
  reg('02-drawer-preview-tile', function (host) {
    var r = A.root(host, 'drawer'), H = A.host(), n = records()[0];
    var open = A.btn('Open details', 'secondary');
    var close = h('button', { type: 'button', class: 'kit-a-drawer__x', part: 'GHOST|BUTTON', 'aria-label': 'Close details' }, [icon('close')]);
    var panel = h('div', { class: 'kit-a-drawer__panel', part: 'DRAWER' }, [
      h('div', { class: 'kit-a-row kit-a-row--split' }, [h('span', { class: 'kit-a-summary__title', part: 'TITLE|TEXT', text: n.title }), close]),
      h('span', { class: 'kit-a-tag', part: 'META|TEXT', text: 'Rev ' + n.revision + ' · ' + n.date }),
      h('p', { class: 'kit-a-help', part: 'BODY|TEXT', text: n.about })]);
    r.appendChild(h('div', { class: 'kit-a-drawer', part: 'SHEET' }, [h('div', { class: 'kit-a-drawer__page' }, [open]), panel]));
    var d = A.prim('createArkDisclosure')(H, { triggerRef: H.bind(open, 'drawer-open'), contentRef: H.bind(panel, 'drawer'), defaultOpen: true,
      onOpenChange: function (on) { if (on) close.focus(); else open.focus(); } });
    close.addEventListener('click', function () { d.close(); });
  }, { uses: ['createArkDisclosure', 'SHEET', 'DRAWER'], partial: "createArkDrawer is modal and needs Ark's runtime focus trap, so this preview opens its DRAWER panel inside the tile with Ark's disclosure." });

  reg('02-modal-card', function (host) {
    var r = A.root(host, 'modal');
    var line = h('p', { class: 'kit-a-help', part: 'BODY|TEXT', text: 'iPhone 15 can no longer sign for alex.fxn.' });
    var card = h('div', { class: 'kit-a-panel kit-a-modal', part: 'MODAL', role: 'group', 'aria-label': 'Remove this device?' }, [
      h('span', { class: 'kit-a-summary__title', part: 'TITLE|TEXT', text: 'Remove this device?' }), line,
      A.block('actions', { align: 'end', items: [{ label: 'Keep it', tone: 'secondary', action: 'keep' }, { label: 'Open as a dialog', tone: 'danger', action: 'open' }] })]);
    r.appendChild(card);
    A.onAction(r, {
      keep: function () { line.textContent = 'Kept. iPhone 15 can still sign.'; },
      open: function () {
        A.kit().arkConfirm({ title: 'Remove this device?', message: 'iPhone 15 can no longer sign for alex.fxn. This is a sample: nothing changes.', confirmLabel: 'Remove', cancelLabel: 'Keep it', tone: 'danger' })
          .then(function (yes) { line.textContent = yes ? 'Removed in this sample only. No key changed.' : 'Kept. iPhone 15 can still sign.'; },
            function (err) { line.textContent = 'The dialog did not open: ' + (err && err.message || err); });
      }
    });
  }, { uses: ['MODAL', 'actions block', 'arkConfirm'], partial: "Drawn in place: a modal needs Ark's runtime focus trap, which the light-DOM host refuses. The second button opens Ark's real confirm dialog." });

  reg('02-inspector-panel', function (host) {
    var r = A.root(host, 'inspector', 'kit-a--tall'), n = records()[0], id = identity();
    r.appendChild(h('div', { class: 'kit-a-panel kit-a-panel--flush', part: 'PANEL' }, [
      h('div', { class: 'kit-a-row kit-a-row--split kit-a-inspector__head' }, [h('span', { class: 'kit-a-eyebrow', part: 'CAPTION|TEXT', text: 'Inspector' }), h('span', { class: 'kit-a-tag', part: 'META|TEXT', text: n.id })]),
      A.block('tabs', { label: 'Inspect', variant: 'segmented', items: [
        { value: 'record', label: 'Record', blocks: [{ block: 'facts', props: { columns: 2, items: [{ term: 'Rev', value: String(n.revision), mono: true }, { term: 'Date', value: n.date, mono: true }] } }] },
        { value: 'owner', label: 'Owner', blocks: [{ block: 'facts', props: { columns: 2, items: [{ term: 'FXN ID', value: id.name, mono: true }, { term: 'Signed by', value: n.signedBy || 'Nobody yet' }] } }] }] })]));
  }, { uses: ['PANEL', 'tabs block (segmented)', 'facts block', 'createArkTabs'] });
})();
