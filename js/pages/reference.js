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
  function referenceUrl(doc, from) { return '#/reference?' + new URLSearchParams({doc:doc, from:from}).toString(); }
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
          link.href = doc && ArkUI.referenceDocs.indexOf(doc)>=0 ? referenceUrl(doc,current.from) : url.href;
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
      // The reader owns one h1; canonical title remains verbatim as h2.
      var block=ArkUI.el(heading?'h'+Math.min(6,heading[1].length+1):'p','');inline(block,heading?heading[2]:line,current);article.appendChild(block);
    }); return article;
  }
  function populate(el, current) {
    el.replaceChildren();el.dataset.referenceDoc=current.doc;
    var top=ArkUI.el('nav','reference-orientation');top.setAttribute('aria-label','Reference return');
    var back=ArkUI.el('a','','← Return to the explanation');back.href='#'+current.from;top.appendChild(back);
    var source=ArkUI.el('a','story-reference','Original Markdown ↗');source.href=current.doc;source.dataset.referenceOriginal='true';source.dataset.icon='open';top.appendChild(source);el.appendChild(top);
    var title=(documents.get(current.doc).match(/^#\s+(.+)$/m)||[])[1]||'Reference';
    current.title = title;
    el.appendChild(ArkUI.el('p','story-kicker','Canonical reference / '+current.doc));
    el.appendChild(ArkUI.el('h1','',title));
    el.appendChild(ArkUI.el('p','reference-provenance','This source provides the detailed contract. Opening it does not establish a live observation or verification result.'));
    el.appendChild(render(documents.get(current.doc),current));if(ArkUI.decorateActionIcons)ArkUI.decorateActionIcons(el);
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
