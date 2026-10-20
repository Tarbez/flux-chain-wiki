/* A safe, source-owned Markdown reader. HTML is always rendered as text. */
(function () {
  'use strict';
  var documents = new Map(), prepared = null;
  function parameters(settings) { return new URLSearchParams(settings && settings.query || ArkUI.route.search()); }
  function request(settings) {
    var params = parameters(settings), doc = params.get('doc') || 'docs/protocol/agreements.md';
    if (ArkUI.referenceDocs.indexOf(doc) < 0) throw new Error('Document is not an approved public reference');
    var from = params.get('from') || '/';
    if (!Object.keys(ArkUI.pageCatalog).some(function (key) { return key !== 'reference' && ArkUI.pageCatalog[key].path === from.split('?')[0]; })) from = '/';
    return {doc:doc, from:from};
  }
  function referenceUrl(doc, from) { return ArkUI.route.href('/reference?' + new URLSearchParams({doc:doc, from:from}).toString()); }
  /* The catalog key a `from` address names ('/stats?x=1' -> 'stats'); request() has already
     checked that its path is a catalog path. */
  function fromKey(from) {
    var path = from.split('?')[0];
    return Object.keys(ArkUI.pageCatalog).find(function (key) { return key !== 'reference' && ArkUI.pageCatalog[key].path === path; }) || 'zero';
  }
  /* The name of the page a document was opened from: its catalog title without the site suffix. */
  function originName(key) { return key === 'zero' ? 'Home' : String(ArkUI.pageCatalog[key].title || '').split(' — ')[0]; }
  /* The return link is a scene link like every other in-site link, so the router takes it
     (with its query) instead of a '#/path' legacy hash; it is labelled with the page it returns
     to -- "Return to the explanation" said nothing when the reader came from /stats
     (docs/ux-audit/pages-ux-b.md /reference). */
  function backLink(from) {
    var key = fromKey(from), at = from.indexOf('?');
    var name = originName(key);
    var back = ArkUI.el('a', '', '← Return to ' + (name || 'the explanation'));
    back.href = ArkUI.route.href(from);
    back.dataset.sceneLink = key;
    if (at >= 0) back.dataset.routeQuery = from.slice(at + 1);
    return back;
  }
  function inline(host, text, current) {
    var pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g, last = 0, match;
    while ((match = pattern.exec(text))) {
      host.appendChild(document.createTextNode(text.slice(last,match.index)));
      if (match[1]) {
        var url;
        try { url = new URL(match[2], new URL(current.doc,location.href)); } catch (_) {}
        if (url && (url.protocol === 'https:' || url.protocol === 'http:' || url.protocol === 'file:')) {
          var link = ArkUI.el('a','',match[1]);
          var doc = decodeURIComponent(url.pathname).split('/docs/')[1];
          doc = doc && 'docs/'+doc;
          var own = doc && ArkUI.referenceDocs.indexOf(doc)>=0;
          link.href = own ? referenceUrl(doc,current.from) : url.href;
          if (own) link.dataset.sceneLink = 'reference';
          host.appendChild(link);
        } else host.appendChild(document.createTextNode(match[1]));
      } else host.appendChild(ArkUI.el(match[3]?'strong':'code','',match[3]||match[4]));
      last = pattern.lastIndex;
    }
    host.appendChild(document.createTextNode(text.slice(last)));
  }
  function render(text, current) {
    var article = ArkUI.el('article','reference-body'), lines = text.split(/\r?\n/), list = null, code = null, table = null;
    lines.forEach(function (line) {
      if (/^```/.test(line)) {
        if (code) code=null;
        else { var pre=ArkUI.el('pre','');code=ArkUI.el('code','');pre.appendChild(code);article.appendChild(pre); }
        list=null;table=null;return;
      }
      if (code) {code.appendChild(document.createTextNode(line+'\n'));return;}
      if (!line.trim()) {list=null;table=null;return;}
      if (/^\|/.test(line)) {
        if (/^\|[\s:|\-]+\|?$/.test(line)) return;
        if (!table) {table=ArkUI.el('table','');article.appendChild(table);}
        var header = table.children.length === 0;
        var row=ArkUI.el('tr','');line.replace(/^\||\|$/g,'').split('|').forEach(function (cell) {var td=ArkUI.el(header?'th':'td','');if(header)td.setAttribute('scope','col');inline(td,cell.trim(),current);row.appendChild(td);});table.appendChild(row);return;
      }
      table=null;
      var heading=line.match(/^(#{1,6})\s+(.+)/), item=line.match(/^(?:[-*]|\d+\.)\s+(.+)/);
      if (item) {if(!list){list=ArkUI.el(/^\d/.test(line)?'ol':'ul','');article.appendChild(list);}var li=ArkUI.el('li','');inline(li,item[1],current);list.appendChild(li);return;}
      list=null;
      if (heading && heading[1] === '#' && heading[2] === current.title) return;
      /* The reader owns the one h1 (the document's title); a document's `##` is the page's h2, its `###` the h3
         (until 2026-10-20 each was one level too deep, so the outline went h1 -> h3). `legacyTag` is the tag the
         element had then: saved layout keys were made under it and are kept by pin (see pinHeadings). */
      var block=ArkUI.el(heading?'h'+Math.max(2,Math.min(6,heading[1].length)):'p','');
      if(heading)block.legacyTag='h'+Math.min(6,heading[1].length+1);
      inline(block,heading?heading[2]:line,current);article.appendChild(block);
    }); return article;
  }
  /* ---- the document's outline: pins, ids, contents, folds ------------------------------------------------------------
     LAYOUT KEYS. Saved CMS edits are keyed to an element's layout key and are never rewritten, so every node this page
     moves or retags keeps the key it had (data-ark-layout-pin, the pin a block spec's `was` stamps: js/ark/blocks.js,
     js/content/layout.js). A key is `page:/article:1/<tag>:<n>` over the article's direct children, counted by the tag
     each had BEFORE the outline was corrected (`legacyTag`). The nodes inside a pinned node keep their keys below that pin.
     tests/reference-reader.cjs and tests/reference-fold.cjs hold this against the census frozen before the conversion
     (tests/fixtures/layout-keys/reference.tsv). Without Ark's blocks (a reader booted bare) the document is left whole. */
  function hasBlocks() { return !!(ArkUI.blocks && typeof ArkUI.blocks.render === 'function'); }
  function headingLevel(node) { var m = /^H([2-6])$/i.exec(node.tagName || ''); return m ? Number(m[1]) : 0; }
  function legacyKeys(article) {
    var seen = {}, keys = new Map();
    Array.prototype.slice.call(article.children).forEach(function (node) {
      var tag = node.legacyTag || String(node.tagName).toLowerCase();
      seen[tag] = (seen[tag] || 0) + 1;
      keys.set(node, 'page:/article:1/' + tag + ':' + seen[tag]);
    });
    return keys;
  }
  function slug(text) { return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'section'; }
  /* Every heading gets an id (the contents link to it) and keeps the key it had as an h3/h4 before the levels were corrected. */
  function pinHeadings(article, keys) {
    var used = {};
    Array.prototype.forEach.call(article.children, function (node) {
      if (!headingLevel(node)) return;
      var base = 'reference-' + slug(node.textContent), id = base, n = 1;
      while (used[id]) id = base + '-' + (++n);
      used[id] = true; node.id = id;
      node.setAttribute('data-ark-layout-pin', keys.get(node));
    });
  }
  function textLength(nodes) { return nodes.reduce(function (n, node) { return n + String(node.textContent).length; }, 0); }

  /* Contents: a document with more than four headings gets a list of links to them, derived from the headings themselves
     (RF-6). Closed behind Ark's disclosure at every width, so a long list never pushes the document down; a link opens
     its section's fold on a phone and moves focus to the heading. */
  var CONTENTS_AFTER = 4;
  function contents(article) {
    var heads = Array.prototype.filter.call(article.children, headingLevel);
    if (heads.length <= CONTENTS_AFTER) return null;
    var nav = ArkUI.el('nav', 'reference-contents'), list = ArkUI.el('ol', '');
    nav.setAttribute('aria-label', 'Contents of this document');
    var top = Math.min.apply(null, heads.map(headingLevel));
    heads.forEach(function (head) {
      var item = ArkUI.el('li', ''), link = ArkUI.el('a', '', head.textContent);
      item.dataset.level = String(headingLevel(head) - top + 1);
      link.href = '#' + head.id; link.dataset.referenceHeading = head.id;
      item.appendChild(link); list.appendChild(item);
    });
    nav.appendChild(list);
    nav.addEventListener('click', function (event) {
      var link = event.target && event.target.closest ? event.target.closest('a[data-reference-heading]') : null;
      if (!link) return;
      event.preventDefault();
      var head = document.getElementById(link.dataset.referenceHeading);
      if (head) reveal(head);
    });
    var box = ArkUI.blocks.render({block: 'disclosure', props: {slot: 'slot', foldBelow: 'always', more: 'Show contents', less: 'Hide contents'}}, {slots: {slot: nav}, onInvalid: 'throw'});
    box.classList.add('reference-contents-fold');
    return box;
  }
  /* A heading's section may be folded (a phone); open it, then bring the heading into view and focus it. */
  function reveal(head) {
    var section = head.nextElementSibling;
    if (section && section.classList.contains('reference-fold') && section.getAttribute('data-state') === 'closed') {
      var trigger = section.querySelector('.ark-disclosure__trigger');
      /* only on a phone, where the fold is in force (wider, the section is open already and the button is not drawn) */
      if (trigger && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 600px)').matches) trigger.click();
    }
    head.setAttribute('tabindex', '-1');
    if (head.scrollIntoView) head.scrollIntoView({block: 'start'});
    head.focus({preventScroll: true});
  }

  /* Phone fold (fold sweep S0-1: /reference was 1.69x the viewport at 390; the long documents were 4.3x to 4.6x).
     Each section of a document -- the nodes after a top-level heading, up to the next one -- folds behind Ark's
     disclosure (foldBelow 'phone': wider screens show everything, a closed section stays in the DOM). The heading stays
     where it was and names the fold (the button's label is fixed: Ark limits a label to 48 characters and a heading may
     run to 110, which refused the whole page); css/reference.css puts the button on the heading's own row. The
     introduction before the first heading is in sight, and when it is long (more than INTRO_LONG characters: the glossary's
     is 4,400) its first lines stay and the rest folds the same way. */
  var INTRO_LONG = 800;
  function foldSections(article, keys) {
    if (!hasBlocks()) return;
    var kids = Array.prototype.slice.call(article.children);
    var top = Math.min.apply(null, kids.map(headingLevel).filter(Boolean).concat([7]));
    var intro = [], sections = [], open = null;
    kids.forEach(function (node) {
      if (top <= 6 && headingLevel(node) === top) { open = {head: node, body: []}; sections.push(open); }
      else if (open) open.body.push(node);
      else intro.push(node);
    });
    function carry(nodes, host) { nodes.forEach(function (node) { if (!node.hasAttribute('data-ark-layout-pin')) node.setAttribute('data-ark-layout-pin', keys.get(node)); host.appendChild(node); }); }
    function fold(props, slot) { return ArkUI.blocks.render({block: 'disclosure', props: Object.assign({slot: 'slot'}, props)}, {slots: {slot: slot}, onInvalid: 'throw'}); }
    if (intro.length && textLength(intro) > INTRO_LONG) {
      var first = ArkUI.el('div', 'reference-section');
      carry(intro, first);
      var lead = fold({foldBelow: 'phone', preview: 3, more: 'Show the whole introduction', less: 'Hide the introduction'}, first);
      lead.classList.add('reference-intro-fold');
      article.insertAdjacentElement('afterbegin', lead);
    }
    sections.forEach(function (section) {
      if (!section.body.length) return;
      var slot = ArkUI.el('div', 'reference-section');
      carry(section.body, slot);
      var box = fold({foldBelow: 'phone', more: 'Show', less: 'Hide'}, slot);
      box.classList.add('reference-fold');
      var trigger = box.querySelector('.ark-disclosure__trigger');
      if (trigger) trigger.setAttribute('aria-label', 'Show or hide this section: ' + String(section.head.textContent).replace(/\s+/g, ' ').trim());
      section.head.insertAdjacentElement('afterend', box);
    });
  }

  /* Where this document sits: Home, the page it was opened from (when that is not Home), and the document. It replaces the
     raw "Canonical reference / docs/protocol/agreements.md" line (RF-3) and takes over the key that line had. */
  function clamp(text, max) { text = String(text).replace(/\s+/g, ' ').trim(); return text.length > max ? text.slice(0, max - 1) + '…' : text; }
  function breadcrumb(current) {
    if (!hasBlocks()) return null;
    var key = fromKey(current.from), items = [{label: 'Home', href: 'route:zero'}];
    if (key !== 'zero') items.push({label: clamp(originName(key), 48), href: 'route:' + key});
    items.push({label: clamp(current.title, 48)});
    try {
      var crumbs = ArkUI.blocks.render({block: 'breadcrumb', props: {label: 'Where this document sits', items: items}}, {onInvalid: 'throw'});
      crumbs.setAttribute('data-ark-layout-pin', 'page:/p:1');
      return crumbs;
    } catch (error) { if (typeof console !== 'undefined') console.warn('/reference: breadcrumb refused: ' + error.message); return null; }
  }
  function populate(el, current) {
    el.replaceChildren();el.dataset.referenceDoc=current.doc;
    var top=ArkUI.el('nav','reference-orientation');top.setAttribute('aria-label','Reference return');
    top.appendChild(backLink(current.from));
    var source=ArkUI.el('a','story-reference','Original Markdown ↗');source.href=current.doc;source.dataset.referenceOriginal='true';source.dataset.icon='open';top.appendChild(source);el.appendChild(top);
    var title=(documents.get(current.doc).match(/^#\s+(.+)$/m)||[])[1]||'Reference';
    current.title = title;
    var crumbs = breadcrumb(current);
    if (crumbs) el.appendChild(crumbs);
    el.appendChild(ArkUI.el('h1','',title));
    var provenance = ArkUI.el('p','reference-provenance','This source provides the detailed contract. Opening it does not establish a live observation or verification result.');
    /* the provenance note was the second paragraph (the path line was the first): it keeps its key */
    if (crumbs) provenance.setAttribute('data-ark-layout-pin', 'page:/p:2');
    el.appendChild(provenance);
    var article=render(documents.get(current.doc),current), keys = legacyKeys(article);
    pinHeadings(article, keys);
    var toc = hasBlocks() ? contents(article) : null;
    if (toc) el.appendChild(toc);
    el.appendChild(article);
    foldSections(article, keys);
    if(ArkUI.decorateActionIcons)ArkUI.decorateActionIcons(el);
    var components=ArkUI.el('div','');components.setAttribute('data-ark-insert','main');
    /* the CMS insertion anchor was the page's first div; the contents (a div) now stands before it */
    components.setAttribute('data-ark-layout-pin', 'page:/div:1');
    el.appendChild(components);
  }

  ArkUI.pageModules.reference = {
    prepare: async function (_page,settings) {
      var current=request(settings);
      if (!documents.has(current.doc)) {
        var snapshot = ArkUI.referenceText && ArkUI.referenceText[current.doc];
        if (!snapshot || typeof snapshot.text !== 'string') throw new Error('Reference could not load');
        documents.set(current.doc,snapshot.text);
      }
      prepared=current;
    },
    mount: function (host) {
      var el=ArkUI.el('section','ark-page reference-page');populate(el,prepared);host.appendChild(el);return el;
    },
    update: function (el) {populate(el,prepared);el.scrollTop=0;}
  };
  ArkUI.referenceUrl = referenceUrl;
})();
