/* Small things the guided pages share, written once (law: centralize, don't duplicate).
   Loaded by the routes that use them, after the block scripts (js/pages/catalog.js lists it).

   ArkUI.copyCommand(options)   the one Copy control of the site. /deploy and /download each drew
                                their own (two classes, two clipboard fallbacks, one with a spoken
                                result and one without: docs/ux-audit/ledger.md /deploy P2). It is
                                Ark's `actions` button (secondary), the clipboard write with the
                                legacy fallback, the label that says "Copied", and a polite status
                                line that also says when copying was refused and what to do.
   ArkUI.sentenceCase(text)     the one case rule for a label a manifest authored in capitals
                                (a button's words from a copy key): sentence case, keeping a token
                                the site itself spells in capitals (DEFXN, FXN, CID).
   ArkUI.journeyLead(key)       the page its own journey starts at (the pager's "the whole journey" link)
   ArkUI.nextSteps(key)         the ways on from a page, derived from its journey in
                                js/content/site-pages.js (ArkSitePages): the lead page of each of
                                the next two journeys, and of the last one (the model you can
                                try), as Ark action items. Nothing here names a page.
   ArkUI.journeyPages(key, o)   the same table read sideways (W4-S13): the other pages of the page's OWN
                                journey (or of the journeys o.journeys names), minus the page itself,
                                o.exclude (what it already links), Home, and a page that is only a
                                chapter of another (its path sits under that page's path).
                                Groups of { journey, title, links }.
   ArkUI.journeyPageBlocks(key, o)  those groups as Ark blocks: an eyebrow, then actions rows of four.

   Regression: tests/page-kit.cjs. */
(function () {
  'use strict';

  /* ---- copy ------------------------------------------------------------------------------ */
  function legacy(value) {
    return new Promise(function (resolve, reject) {
      var field = document.createElement('textarea');
      field.value = value; field.setAttribute('readonly', '');
      field.style.position = 'fixed'; field.style.opacity = '0';
      document.body.appendChild(field); field.select();
      try { if (document.execCommand('copy')) resolve(); else reject(new Error('copy refused')); } catch (error) { reject(error); } finally { field.remove(); }
    });
  }
  /* The Clipboard API where the page may use it (a secure context); where it refuses, the legacy selection copy. */
  function write(value) {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(value).catch(function () { return legacy(value); });
    return legacy(value);
  }

  /* options: { text: string | () => string, name: 'command for Check discovery' | () => string, noun: 'command' }.
     Returns { element, status, setName(name) }: the button row and its polite status line, which the page places
     (the status needs room the button's row may not have); `element.hidden = true` hides the control. */
  function copyCommand(options) {
    var noun = options.noun || 'command', timer = 0, name = options.name;
    var row = ArkUI.blocks.render({ block: 'actions', props: { label: 'Copy', items: [{ label: 'Copy', action: 'copy-command', tone: 'secondary' }] } });
    row.classList.add('copy-command');
    var status = ArkUI.el('span', 'copy-command-status'); status.setAttribute('role', 'status');
    var button = row.querySelector('[data-ark-part="button"]'), label = button.querySelector('.ark-btn__label');
    function paintName() {
      var n = typeof name === 'function' ? name() : name;
      button.setAttribute('aria-label', n ? 'Copy ' + n : 'Copy ' + noun);
    }
    /* "Copied" is shown by the button's own label (and said to a screen reader by the status line); only a refusal is shown in words. */
    function settle(text, said, state) {
      label.textContent = text; status.textContent = said; status.setAttribute('data-state', state);
      window.clearTimeout(timer);
      if (text !== 'Copy') timer = window.setTimeout(function () { label.textContent = 'Copy'; if (text === 'Copied') status.textContent = ''; }, 1400);
    }
    row.addEventListener('ark:action', function (event) {
      if (!event.detail || event.detail.action !== 'copy-command') return;
      var value = typeof options.text === 'function' ? options.text() : options.text;
      if (!value) return;
      write(value).then(function () { settle('Copied', 'The ' + noun + ' was copied.', 'done'); },
        function () { settle('Copy', 'Copy is unavailable here. Select the ' + noun + ' text and copy it by hand.', 'refused'); });
    });
    paintName();
    return { element: row, status: status, setName: function (next) { name = next; paintName(); } };
  }

  /* ---- case ------------------------------------------------------------------------------ */
  /* The tokens the site spells in capitals inside mixed-case words of its own: page labels
     (js/content/site-pages.js) and glossary terms. Read, never listed here. */
  function capitals() {
    var seen = {}, strings = [];
    if (typeof ArkSitePages !== 'undefined') ArkSitePages.pages().forEach(function (p) { strings.push(p.label, p.short || ''); });
    if (typeof ArkGlossary !== 'undefined' && ArkGlossary.map) Object.keys(ArkGlossary.map).forEach(function (k) { strings.push(ArkGlossary.map[k].term); });
    strings.forEach(function (s) {
      if (!s || s === s.toUpperCase()) return;
      (s.match(/\b[A-Z][A-Z0-9]+\b/g) || []).forEach(function (token) { seen[token] = true; });
    });
    return seen;
  }
  /* A label already in mixed case was authored in its case and is left alone. */
  function sentenceCase(text) {
    text = String(text == null ? '' : text);
    if (!text || text !== text.toUpperCase() || !/[A-Z]/.test(text)) return text;
    var keep = capitals(), first = true;
    return text.replace(/[A-Z0-9][A-Z0-9'’-]*/g, function (word) {
      if (keep[word]) { first = false; return word; }
      var out = first ? word.charAt(0) + word.slice(1).toLowerCase() : word.toLowerCase();
      first = false;
      return out;
    });
  }

  /* ---- ways on --------------------------------------------------------------------------- */
  function leadOf(journeyId, key) {
    var lead = ArkSitePages.pages().filter(function (p) { return p.journey === journeyId && p.lead; })[0];
    return lead && lead.key !== key ? { label: lead.label, href: 'route:' + lead.key, tone: 'link' } : null;
  }
  /* The page a journey starts at, for any page in that journey (null for the lead itself): "the way back up to the start". */
  function journeyLead(key) {
    return typeof ArkSitePages === 'undefined' || !ArkSitePages.journeyOf(key) ? null : leadOf(ArkSitePages.journeyOf(key), key);
  }
  function nextSteps(key) {
    if (typeof ArkSitePages === 'undefined') return [];
    var journeys = ArkSitePages.journeys();
    var at = journeys.map(function (j) { return j.id; }).indexOf(ArkSitePages.journeyOf(key));
    if (at < 0) return [];
    var ahead = journeys.slice(at + 1, at + 3), last = journeys[journeys.length - 1];
    if (at < journeys.length - 1 && ahead.indexOf(last) < 0) ahead.push(last);
    return ahead.map(function (journey) { return leadOf(journey.id, key); }).filter(Boolean);
  }

  function journeyPages(key, options) {
    options = options || {};
    if (typeof ArkSitePages === 'undefined') return [];
    var rows = ArkSitePages.pages(), me = null, skip = {};
    rows.forEach(function (r) { if (r.key === key) me = r; });
    if (!me || !me.journey) return [];
    skip[key] = true;
    (options.exclude || []).forEach(function (k) { skip[k] = true; });
    function chapter(r) { return rows.some(function (p) { return p.key !== r.key && p.path !== '/' && r.path.indexOf(p.path + '/') === 0; }); }
    var catalog = ArkUI.pageCatalog || {};
    return (options.journeys || [me.journey]).map(function (id) {
      var journey = ArkSitePages.journeys().filter(function (j) { return j.id === id; })[0];
      var links = rows.filter(function (r) { return r.journey === id && !skip[r.key] && r.path !== '/' && !chapter(r) && catalog[r.key]; })
        .map(function (r) { return { key: r.key, label: r.short || r.label, href: 'route:' + r.key }; });
      return { journey: id, title: journey ? journey.title : id, links: links };
    }).filter(function (group) { return group.links.length; });
  }
  function journeyPageBlocks(key, options) {
    var out = [];
    journeyPages(key, options).forEach(function (group) {
      out.push({ block: 'eyebrow', props: { text: 'More in ' + group.title } });
      /* Ark's actions row holds four at most: the rest go on the next row */
      for (var at = 0; at < group.links.length; at += 4) {
        out.push({ block: 'actions', props: { label: 'More in ' + group.title, items: group.links.slice(at, at + 4).map(function (l) { return { label: l.label, href: l.href, tone: 'link' }; }) } });
      }
    });
    return out;
  }

  ArkUI.copyCommand = copyCommand;
  ArkUI.sentenceCase = sentenceCase;
  ArkUI.nextSteps = nextSteps;
  ArkUI.journeyLead = journeyLead;
  ArkUI.journeyPages = journeyPages;
  ArkUI.journeyPageBlocks = journeyPageBlocks;
})();
