/* =====================================================================
   RESOLVER PAGE PARTS -- what the resolver pages share (W4-S13, 2026-10-20)

   1. MANIFEST FIGURES. The content audit (docs/ux-audit/resolvers-content.md section 4) specified
      five diagrams. Each one is DATA in its page's manifest (`meta.diagrams[]`: ids, stations,
      bands, frames, flows) and this file only draws what the data says:

        resolver-layers        js/content/manifests/resolver.js   /what-is-a-resolver, How it works
        launched-vs-served     js/content/manifests/resolver.js   /what-is-a-resolver, Evidence
        deploy-flow            js/content/manifests/deployment.js /how-deployment-works, Evidence
        upgrade-supersedes     js/content/manifests/dao.js        /dao, "Who can change a resolver?"
        swap-signed-resolution js/content/manifests/chain.js      /chain, the Swaps case (see below)

      Every label on a figure is a string of that manifest (or, for the layers, a row of the dated
      registry snapshot), so the picture cannot name a station, a refusal or a capability the data
      does not hold. No raster image and no SVG: the figure is Ark's own parts (card-grid, card with a
      status chip, eyebrow, steps, facts) in Ark's `figure` frame, whose `data-ark-label` rule holds a
      label at 12px or more on a phone. Only the layer band and the launched chain's lane are this
      file's (Ark has no line-diagram part: reported as missing). It never moves, so there is
      no loop to settle. `ArkUI.manifestFigure(manifestId, diagramId)` returns { slot, node,
      caption, description }; `ArkUI.resolverPageParts.figureBlock` wraps it in the story
      template's fold (Ark's disclosure + figure) and names the slot the page must register.
      /chain's figure is built here too; js/pages/chain.js (another slice's file) places it.

   2. The derived onward links ("More in <journey>") are not here: they are ArkUI.journeyPages and
      ArkUI.journeyPageBlocks in js/ark/page-kit.js, beside nextSteps and journeyLead, which read the
      same journey table (js/content/site-pages.js).

   Regression: tests/resolver-page-parts.cjs.
   ===================================================================== */
(function () {
  'use strict';

  function el(tag, cls, text) { return ArkUI.el(tag, cls, text); }
  /* A figure is a small tree: plain layout elements ({ tag, cls, text, attrs, children }) around Ark
     blocks ({ block, props }) -- the cards, status chips, eyebrows, steps and facts are Ark's own parts,
     rendered by the adapter (ArkUI.blocks.render), never a second set of classes drawn here. Only the
     lane of a launched chain and the band that groups a layer are this file's, because Ark has no
     part for a line diagram (named in the W4-S13 report as missing). */
  function h(tag, cls, children, attrs) { return { tag: tag, cls: cls, text: typeof children === 'string' ? children : undefined, children: Array.isArray(children) ? children : undefined, attrs: attrs }; }
  function b(block, props) { return { block: block, props: props }; }
  function make(node) {
    if (node.block) return ArkUI.blocks.render({ block: node.block, props: node.props });
    var e = el(node.tag, node.cls, node.text);
    Object.keys(node.attrs || {}).forEach(function (k) { e.setAttribute(k, node.attrs[k]); });
    (node.children || []).forEach(function (c) { if (c) e.appendChild(make(c)); });
    return e;
  }
  /* Inside Ark's figure frame a marked label is held at 12px or more whatever the width. */
  function markLabels(root) {
    Array.prototype.forEach.call(root.querySelectorAll('*'), function (n) {
      if (n.children.length === 0 && n.textContent.trim() && !n.closest('[aria-hidden="true"]')) n.setAttribute('data-ark-label', '');
    });
  }

  function find(manifestId, diagramId) {
    var manifest = ArkManifest.get(manifestId), all = manifest && manifest.meta && manifest.meta.diagrams || [];
    for (var i = 0; i < all.length; i++) if (all[i].id === diagramId) return all[i];
    throw new Error('ArkUI.manifestFigure: the manifest "' + manifestId + '" has no diagram "' + diagramId + '". Needs: an entry with that id in its meta.diagrams. Remedy: add it, or name one that exists.');
  }

  /* "sourceHash" -> "source hash": a label derived from the data's own key, never typed */
  function words(key) { return String(key).replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase(); }
  function snapshot() { return typeof window !== 'undefined' && window.ArkRegistrySnapshot || null; }
  function byId(rows, key, id) { for (var i = 0; rows && i < rows.length; i++) if (rows[i][key] === id) return rows[i]; return null; }

  /* ---- 1. the layers: base chain -> capabilities -> resolver chains -------------------------- */
  function layers(d) {
    var snap = snapshot(), absent = false, bands = [];
    d.bands.slice().reverse().forEach(function (band) {
      var body;
      if (band.marks) {
        body = h('ul', 'mfig-row', band.marks.map(function (mark) { return h('li', 'mfig-tick', mark); }));
      } else if (band.id === 'capabilities') {
        var caps = (snap && snap.capabilities) || [];
        if (!caps.length) absent = true;
        body = caps.length ? b('card-grid', { label: band.label, columns: 2, items: caps.map(function (cap) {
          var n = cap[band.badge], item = { title: cap.id, headingLevel: 6 };
          if (cap[band.stub]) item.description = words(band.stub) + ' ' + String(cap[band.stub]).slice(0, 8);
          if (n != null) item.status = { label: n + ' ' + band.badge, tone: 'reference' };
          return item;
        }) }) : null;
      } else {
        var items = (band.show || []).map(function (id) {
          var chain = byId(snap && snap.resolvers, 'chainId', id), composes = chain && chain.composes;
          if (!chain) absent = true;
          return { title: id, headingLevel: 6, description: band.lines + ' \u00b7 ' + (composes ? (composes.length ? composes.join(' + ') : 'none') : '\u2014') };
        });
        if (band.plus) items.push({ title: band.plus, headingLevel: 6 });
        body = b('card-grid', { label: band.label, columns: 2, items: items });
      }
      bands.push(h('section', 'mfig-band', [b('eyebrow', { text: band.label }), h('p', 'mfig-rule', band.rule), body], { 'data-band': band.id, 'aria-label': band.label }));
    });
    /* A refusal names what it needs: without the snapshot the band cannot be drawn from data. */
    bands.push(h('p', 'mfig-source', snap && snap.source
      ? 'Listed in the dated registry snapshot of ' + snap.source.commitDate + ' (commit ' + String(snap.source.commit).slice(0, 7) + '). It is a read of the source, not of a live network.'
      : 'Not shown: the dated registry snapshot did not load, and the capabilities and chains are drawn only from it.', absent ? { 'data-absent': '' } : undefined));
    var summary = d.bands.slice().reverse().map(function (x) { return x.label + ' (' + x.rule + ')'; }).join('; ') + '.';
    return { tree: h('div', 'mfig mfig-layers', bands), summary: summary, description: 'From the top: ' + summary };
  }

  /* ---- 2. launched, then served ------------------------------------------------------------ */
  function states(d) {
    var frames = d.frames.map(function (frame) {
      var lane = [1, 2, 3, 4, 5].map(function () { return h('span', 'mfig-lane-tick', ''); });
      if (frame.provider) lane.push(h('span', 'mfig-provider', ''));
      var card = { title: frame.state, description: frame.note, headingLevel: 6 };
      if (frame.provider && frame.badge) card.status = { label: frame.badge, tone: 'trust' };
      return h('div', 'mfig-state', [h('div', 'mfig-lane', lane, { 'aria-hidden': 'true', 'data-outline': frame.outline }), b('card', card)], { 'data-state': frame.state, 'data-outline': frame.outline });
    });
    var summary = d.frames.map(function (f) { return f.state + ': ' + f.note; }).join('. ') + '.';
    return { tree: h('div', 'mfig mfig-states', frames), summary: summary, description: summary };
  }

  /* ---- 3. the deploy flow: stations, one fork, two refusals --------------------------------- */
  function flow(d) {
    var items = d.stations.map(function (name) {
      var parts = [];
      if (d.fork && d.fork.at === name) parts.push(d.fork.branches.join(' or '));
      if (d.badges && d.badges[name]) parts.push('badge: ' + d.badges[name]);
      var step = { title: name };
      if (parts.length) step.body = parts.join(' \u00b7 ');
      return step;
    });
    var tree = [b('steps', { label: 'Stations', items: items })];
    if ((d.refusals || []).length) tree.push(b('facts', { label: 'Refusals', columns: 1, items: d.refusals.map(function (r) { return { term: r.at + ' \u00b7 ' + r.when, value: r.name, mono: true }; }) }));
    var summary = d.stations.join(' \u2192 ') + '.';
    var refused = (d.refusals || []).map(function (r) { return 'At ' + r.at + ', ' + r.when + ': ' + r.name + '.'; }).join(' ');
    return { tree: h('div', 'mfig mfig-flow', tree), summary: summary, description: summary + (refused ? ' ' + refused : '') };
  }

  /* ---- 4. an upgrade supersedes, it never rewrites ------------------------------------------ */
  function upgrade(d) {
    var variants = d.variants.map(function (v) {
      var line = [];
      for (var i = 0; i < v.shows; i++) line.push({ name: d.declarations[i], head: i === v.shows - 1 });
      /* steps need two or more; one declaration (an immutable launch) is a single fact */
      var body = line.length > 1
        ? b('steps', { label: v.label, mode: 'progress', items: line.map(function (x) { return { title: x.name, body: x.head ? d.head : d.superseded, state: x.head ? 'current' : 'done' }; }) })
        : b('facts', { label: v.label, columns: 1, items: line.map(function (x) { return { term: x.name, value: d.head }; }) });
      return h('div', 'mfig-variant', [b('eyebrow', { text: v.mark }), h('p', 'mfig-rule', v.label), body], { 'data-control': v.control });
    });
    var summary = d.line.charAt(0).toUpperCase() + d.line.slice(1) + '.';
    return { tree: h('div', 'mfig mfig-upgrade', variants), summary: summary, description: summary + ' ' + d.variants.map(function (v) { return v.label + '.'; }).join(' ') };
  }

  /* ---- 5. a swap is one signed resolution --------------------------------------------------- */
  function swap(d) {
    var tree = [b('steps', { label: 'One swap', items: d.flow.map(function (step) { return { title: step }; }) }),
      b('facts', { label: 'Refusal', columns: 1, items: [{ term: d.refusal.from, value: d.refusal.tag, mono: true }] })];
    var summary = d.flow.join(' \u2192 ') + '. ' + d.refusal.from + ': ' + d.refusal.tag + '.';
    return { tree: h('div', 'mfig mfig-swap', tree), summary: summary, description: summary };
  }

  var DRAW = { 'resolver-layers': layers, 'launched-vs-served': states, 'deploy-flow': flow, 'upgrade-supersedes': upgrade, 'swap-signed-resolution': swap };

  /* ArkUI.manifestFigure('dao', 'upgrade-supersedes') -> { slot, node, caption, description, tree } */
  function manifestFigure(manifestId, diagramId) {
    var data = find(manifestId, diagramId), draw = DRAW[diagramId];
    if (!draw) throw new Error('ArkUI.manifestFigure: no drawing for "' + diagramId + '". Needs: a builder in js/pages/resolver-page-parts.js for this diagram id. Remedy: add one, or remove the entry from the manifest.');
    var built = draw(data), node = make(built.tree);
    node.setAttribute('data-manifest-figure', diagramId);
    markLabels(node);
    return { id: diagramId, slot: 'mfig-' + diagramId, node: node, tree: built.tree, caption: data.caption + ': ' + built.summary, description: built.description };
  }

  /* The story template's fold around one figure: Ark's disclosure (never display:none) holding
     Ark's figure frame. Returns { slot, node, spec }; the page registers slots[slot] = node. */
  function figureBlock(manifestId, diagramId, options) {
    options = options || {};
    var figure = manifestFigure(manifestId, diagramId);
    var frame = { block: 'figure', id: options.fold === false ? options.id : undefined,
      props: { kind: 'illustration', slot: figure.slot, caption: figure.caption, description: figure.description } };
    /* fold: false -- the figure sits where the reader already opened something (an accordion row) */
    if (options.fold === false) return { slot: figure.slot, node: figure.node, spec: frame };
    var props = { foldBelow: options.foldBelow || 'tablet', more: options.more || 'Show the illustration', less: options.less || 'Hide the illustration', blocks: [frame] };
    if (options.lead) props.content = options.lead;
    return { slot: figure.slot, node: figure.node, spec: { block: 'disclosure', id: options.id || 'mfig-' + diagramId, props: props } };
  }

  ArkUI.manifestFigure = manifestFigure;
  ArkUI.resolverPageParts = { manifestFigure: manifestFigure, figureBlock: figureBlock };
})();
