/* /learn: the one place to learn (owner, 2026-11-09, design P05). Layer: app (the site). It replaces How it works, Notes and the
   stats pages (js/content/site-pages.js RETIRED). Three tabs, one screen each, no scroll (?t=words|speed|topics opens one):
   - Words: what a record is, the way the whole site teaches it: three parts, two rules, and the fixed words record, signature,
     list, head, keeper, receipt, final (docs/design/space/intro-story/10-direction.md section 5, facts only).
   - Speed: every row of ArkUI.speedFacts (js/content/speed-facts.js) grouped by topic, with its conditions, and the
     not-measured list. Nothing is invented here: no file, no rows, and the tab says so.
   - Topics: the twelve stones, one line each, linking to /fxn/<slug> (js/content/topics.js).
   No filled button: a tab is the page's action, and the chip row at the foot (ArkTopics.jumpBar, the same row as on a topic page) leads on.
   Layout: css/world-pages.css "learn page": the home's left column (pill, headline, line, the tabs as chips), the panel right of it. */
(function () {
  'use strict';
  function node(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }
  function link(key, className, text) {
    var a = node('a', className, text), entry = ArkUI.pageCatalog[key];
    a.href = entry ? entry.path : '/'; a.setAttribute('data-scene-link', key);
    return a;
  }
  var PARTS = [
    ['What happened', 'The data: who, what, how much, when.'],
    ['Who said it', 'A signature from the person\'s key. Nobody else can make it.'],
    ['Where it sits', 'Its place on the list. It names the record before it.']
  ];
  var RULES = [
    ['Nobody can change a record.', 'An edited record breaks its link to the next one, and everyone sees the break.'],
    ['A mistake is fixed by a new record.', 'The new record says it replaces the old one. The old one stays.']
  ];
  var WORDS = [
    ['record', 'One entry on a list. It carries its result, such as the new balance.'],
    ['signature', 'Proof from your key that you made the record.'],
    ['list', 'Every key has its own list of records.'],
    ['head', 'The newest record on your list. It says where you stand now.'],
    ['keeper', 'A machine that puts your record in order.'],
    ['receipt', 'What the keeper signs and returns.'],
    ['final', 'A record whose receipt is back. Nothing changes it after that.']
  ];
  var wantTab = 'words', showTab = null;
  function tabOf(query) { var t = new URLSearchParams(query || '').get('t'); return /^(words|speed|topics)$/.test(t || '') ? t : 'words'; }

  function words(p) {
    var cols = node('div', 'learn-cols');
    var a = node('div', 'learn-col');
    a.appendChild(node('p', 'learn-label mono', 'A record has three parts'));
    var ol = node('ol', 'learn-parts');
    PARTS.forEach(function (x) { var li = node('li'); li.append(node('p', 'learn-part-name', x[0]), node('p', 'learn-part-text', x[1])); ol.appendChild(li); });
    a.appendChild(ol);
    a.appendChild(node('p', 'learn-label mono', 'Two rules'));
    RULES.forEach(function (x) { var r = node('div', 'learn-rule'); r.append(node('p', 'learn-part-name', x[0]), node('p', 'learn-part-text', x[1])); a.appendChild(r); });
    var b = node('div', 'learn-col');
    b.appendChild(node('p', 'learn-label mono', 'Seven words, one meaning each'));
    var dl = node('dl', 'learn-words');
    WORDS.forEach(function (x) { dl.append(node('dt', 'mono', x[0]), node('dd', null, x[1])); });
    b.appendChild(dl);
    cols.append(a, b); p.appendChild(cols);
  }
  function speed(p) {
    p.textContent = '';
    var F = ArkUI.speedFacts;
    if (!F) { p.appendChild(node('p', 'learn-none', 'The speed table has not loaded. No number is shown until it does.')); return; }
    /* 2026-11-10 (owner): only the devnet release's own measurements show. With no row, the tab is that one line (F.note) */
    if (!(F.rows || []).length) { p.appendChild(node('p', 'learn-none', F.note || 'Not measured yet on the devnet release. Measured after devnet starts.')); return; }
    var head = node('p', 'learn-speed-note', 'Measured' + (F.asOf ? ', as of ' + F.asOf : '') + (F.note ? '. ' + F.note : ''));
    /* depth, not length: one topic's rows at a time, picked by its chip; the last chip is the not-measured list */
    var groups = {}, order = [];
    (F.rows || []).forEach(function (r) { if (!groups[r.topic]) { groups[r.topic] = []; order.push(r.topic); } groups[r.topic].push(r); });
    var chips = node('div', 'learn-speed-chips'), grid = node('div', 'learn-speed');
    function cond(text) { var c = node('p', 'learn-speed-cond', text); c.title = text; return c; }
    function name(topic) { var t = ArkTopics.bySlug(topic); return t ? ArkTopics.words(t.n).name : topic; }
    function pick(topic) {
      Array.prototype.forEach.call(chips.children, function (c) { c.classList.toggle('is-on', c.dataset.topic === topic); });
      grid.textContent = '';
      if (topic === '-') {
        (F.notMeasured || []).forEach(function (r) {
          var row = node('div', 'learn-speed-row is-absent');
          row.append(node('p', 'learn-speed-action', name(r.topic) + ': ' + (r.action || '')), node('p', 'learn-speed-none', 'Not measured yet'), cond(r.why || ''));
          if (r.toMeasure) row.appendChild(cond('To measure: ' + r.toMeasure));
          grid.appendChild(row);
        });
        return;
      }
      groups[topic].forEach(function (r) {
        var row = node('div', 'learn-speed-row');
        var big = node('p', 'learn-speed-big'); big.append(node('span', 'learn-speed-value', String(r.value)), node('span', 'learn-speed-unit', ' ' + (r.unit || '')));
        row.append(node('p', 'learn-speed-action', r.action || ''), big);
        if (r.stat) row.appendChild(cond(r.stat));
        row.appendChild(cond([r.conditions, r.device, r.status, r.date].filter(Boolean).join(' · ')));
        /* the source as its heading; the file path is internal language and stays in the title */
        if (r.source) { var src = cond('Source: ' + (r.heading || r.source)); src.title = r.source; row.appendChild(src); }
        grid.appendChild(row);
      });
    }
    order.concat((F.notMeasured || []).length ? ['-'] : []).forEach(function (topic) {
      var c = node('button', 'learn-speed-chip mono', topic === '-' ? 'Not measured yet' : name(topic) + ' ' + groups[topic].length); c.type = 'button'; c.dataset.topic = topic;
      c.addEventListener('click', function () { pick(topic); });
      chips.appendChild(c);
    });
    p.append(head, chips, grid);
    if (order.length) pick(order[0]); else if ((F.notMeasured || []).length) pick('-');
  }
  function topics(p) {
    var grid = node('div', 'learn-topics');
    ArkTopics.all().forEach(function (t) {
      var w = ArkTopics.words(t.n), a = link(t.key, 'learn-topic');
      a.append(node('span', 'learn-topic-name', w.name), node('span', 'learn-topic-line', t.what), node('span', 'learn-topic-status mono is-' + ArkTopics.statusKind(w.status), ArkTopics.chipWords(w.status)));
      grid.appendChild(a);
    });
    p.appendChild(grid);
  }

  function mount(host) {
    var page = node('section', 'world-page learn-page'); page.setAttribute('aria-labelledby', 'learn-title');
    /* THE WORDS COLUMN (owner, 2026-11-11: "follow the same UI as the new home page"): the home's left column in the home's own classes
       (css/world-pages.css): the pill (the home's own tag), the headline, the line (this page's note in the page table, typed once) and the
       three tabs as the home's chips. The open tab's panel stands right of it, where a topic page's object stands */
    var head = node('div', 'learn-left intro-portal-words');
    var pill = node('p', 'intro-portal-eyebrow mono', ArkCopy.text('HOME.LANDING.PORTAL.EYEBROW'));
    var title = node('h1', 'learn-title intro-portal-headline', ArkCopy.text('HOME.LANDING.TOPIC.JUMP.LEARN')); title.id = 'learn-title';
    var row = ArkSitePages.pages().filter(function (p) { return p.key === 'learn'; })[0];
    var line = node('p', 'intro-portal-line', row && row.note ? row.note + '.' : '');
    var tabs = node('div', 'learn-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-labelledby', 'learn-title');
    head.append(pill, title, line, tabs);
    var panels = node('div', 'learn-panels');
    var made = {};
    [['words', 'Words', words], ['speed', 'Speed', speed], ['topics', 'Topics', topics]].forEach(function (x) {
      var b = node('button', 'learn-tab intro-chip', x[1]); b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.tab = x[0];
      var p = node('div', 'learn-panel'); p.setAttribute('role', 'tabpanel'); p.dataset.tab = x[0]; p.hidden = true;
      made[x[0]] = function () { if (!p.dataset.built) { p.dataset.built = '1'; x[2](p); } };
      b.addEventListener('click', function () { show(x[0]); });
      tabs.appendChild(b); panels.appendChild(p);
    });
    function show(id) {
      made[id]();
      Array.prototype.forEach.call(tabs.children, function (b) { var on = b.dataset.tab === id; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.classList.toggle('is-on', on); });
      Array.prototype.forEach.call(panels.children, function (p) { p.hidden = p.dataset.tab !== id; });
    }
    showTab = show;
    /* the chip row stands where it stands on every topic page; its Home chip is the way back (the filled "Home" button left: audit F32) */
    var dock = node('div', 'topic-dock intro-dock'); dock.appendChild(ArkTopics.jumpBar(link, 'learn'));
    page.append(head, panels, dock);
    show(wantTab);
    ArkTopics.loadSpeed().then(function () { var p = panels.querySelector('[data-tab="speed"]'); if (p.dataset.built) speed(p); });
    host.appendChild(page);
    return page;
  }
  ArkUI.pageModules.learn = {
    prepare: function (_page, settings) { wantTab = tabOf(settings && settings.query || ArkUI.route.search()); if (showTab) showTab(wantTab); },
    mount: mount
  };
})();
