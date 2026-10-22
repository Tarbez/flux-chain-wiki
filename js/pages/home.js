/* /: the family home, as a page of Ark blocks (DEFXN polish Wave 3).

   It used to be a hero followed by ONE closed "More" disclosure holding everything else
   (find-your-place, the architecture, the evidence, the fleet signal, the FAQ) -- 2.53x the
   viewport closed and 4.95x open on a desktop, 6.88x open on a phone
   (docs/ux-audit/pages-ux-a.md /). It is organised by the visitor's next question now, each
   view short enough for the fold rule (<= 1.6 screens) on its own:

     hero        what DEFXN is, in its own words, and the one primary action (See how DEFXN works)
     questions   ONE control, Ark tabs: Where do I start? · See it work · How it fits together ·
                 What is measured? · Questions. The first view under the hero is the way in -- the
                 three paths a first-time visitor chooses from -- and the scene is one press away
                 (it was the first view, with the paths second: docs/ux-audit/ledger.md, "promote
                 Explore / Build / Operate"; the order of the five views changes no layout key, every
                 `was` pin below follows its element)
       Where do I start?      the three paths (Explore / Build / Operate) and the way on
       See it work            the hero scene (js/pages/home-flow.js): pick an example, then a step
                              (Ark tabs inside the scene's frame), watch one record join your chain;
                              it plays once and settles. The step picker replaced the hand-built
                              `home-cycle-step` buttons (ArkUI.buildChainSteps)
       How it fits together   your chain among the others (the transit map) and the three parts
       What is measured?      benchmark figures FROM THE EVIDENCE REGISTRY, and the live fleet
       Questions              the FAQ
     anchor      the CMS insertion point

   Numbers: a benchmark tile shows a figure only when a VERIFIED record in the evidence registry
   (docs/evidence/registry.md, generated into js/content/evidence-registry.js) carries it. The
   tiles used to show the ten-node fleet figures as "BENCH-013", whose registry row is one
   machine and carries none of them, which /concept/spec -- built from the registry -- then
   seemed to contradict. A figure the registry does not verify is shown absent, "Not verified",
   with what would verify it: never a number.

   Words: the manifest's (copy:HOME.*) where it has them, literal where the old page wrote them.
   Layout keys: every element of the old page with words keeps the key it had (the `was` pins,
   derived by tests/lib/layout-continuity.cjs from the frozen census
   tests/fixtures/layout-keys/home.tsv). Regression: tests/home-blocks.cjs. */
(function () {
  'use strict';

  var AUDIENCES = [
    { value: 'explore', name: 'Explore', forWho: 'For the curious', title: 'See what makes DEFXN different.', text: 'Start with the idea. Follow a record, see what a resolver does, and explore the network at your own pace.', action: 'Explore the protocol', route: 'about', refs: [['Walk the chain', 'chain'], ['Inspect the evidence', 'stats']] },
    { value: 'build', name: 'Build', forWho: 'For developers & founders', title: 'Give your application a signed foundation.', text: 'Explore the resolver model, inspect the available definitions, and see what it takes to run from source.', action: 'Understand resolvers', route: 'resolver', refs: [['Browse resolvers', 'resolvers'], ['Run from source', 'download']] },
    { value: 'operate', name: 'Operate', forWho: 'For operators & partners', title: 'Put your infrastructure to work.', text: 'Inspect fleet measurements, review the source prerequisites, and understand the steps to create or join a network.', action: 'Read the operator path', route: 'download', refs: [['Create or join a network', 'deploy'], ['Review fleet measurements', 'stats']] }
  ];
  var PRINCIPLES = [
    ['Identity', 'A history with an author.', 'Each identity has its own signed records. Authorship can be checked without treating every record as the same kind of work.'],
    ['Resolution', 'Rules that do useful work.', 'Transfers, swaps and governance have different rules. Resolvers make those rules explicit and attach a signature to the result.'],
    ['Evidence', 'A claim you can inspect.', 'The signed result links back to its inputs. Auditing makes the resolver’s decisions inspectable; it does not remove the need to trust its authority.']
  ];
  var QUESTIONS = [
    ['What is a “chain of chains”?', 'It is the identity model: each identity has its own signed history. Applications connect those histories through records and references. The current execution model is signed resolution: a resolver processes signed inputs and signs its result.'],
    ['What can I do today?', 'Explore the protocol, inspect published measurements and resolver definitions, and follow the instructions to run from source. Availability and deployment requirements differ by capability; the operator and resolver pages describe those boundaries.'],
    ['Does a signature guarantee a correct result?', 'A signature proves who signed a result. Correctness depends on the resolver’s rules and checks. Audits can expose a wrong resolution; they do not prevent every bad decision in advance.']
  ];
  /* What each benchmark tile quotes: an operation as the registry names it in a record's evidence
     (`measure`), or a figure published elsewhere on the site (`figure`, from js/content/
     stats-highlights.js) that is shown only if a verified registry record carries it too. */
  var TILES = [
    { label: 'Swap resolution', record: 'BENCH-013', measure: 'swap batched auction', note: 'Network transport excluded.' },
    { label: 'Transfer resolution', record: 'BENCH-013', measure: 'Transfer same-shard atomic', note: 'Network transport excluded.' },
    { label: 'Signed-result storage', record: 'BENCH-013', measure: 'replica store', note: 'Replicas store the signed result without repeating the resolution.' },
    { label: 'All ten nodes at once', figure: 0 }
  ];
  var FOOTER = [['Protocol', 'FOOTER.PROTOCOL.HREF'], ['Resolvers', 'FOOTER.RESOLVERS.HREF'], ['Explorer', 'FOOTER.EXPLORER.HREF'], ['Run from source', 'FOOTER.DOWNLOAD.HREF'], ['Governance', 'FOOTER.DAO.HREF']];

  /* `was`: the old page's layout key for each element that carries its words now, by spec entry
     id, so a CMS edit saved against the hand-built home still lands. Derived by
     tests/lib/layout-continuity.cjs (derive /, with the reshaped and retired keys of
     tests/home-blocks.cjs set aside), plus the reshaped ones, each with its reason in that test.
     Part refs count in document order within the entry ('stat#2' = the second stat tile); the
     two drawings (the map, the Transfers scene) are pinned at their roots and keep every key
     inside them. */
  var WAS = {
    'home-hero': {
      'hero-title': 'id:hl-title',
      'eyebrow': 'page:/section:1/div:1/p:1',
      'hero-lede': 'page:/section:1/div:1/p:2',
      ':root': { key: 'page:/section:1/div:1', self: true },
      'actions': 'page:/section:1/div:1/div:1',
      'button': 'page:/section:1/div:1/div:1/a:1',
      ':scope > div:nth-of-type(2) > a:nth-of-type(1) > span:nth-of-type(1)': 'page:/section:1/div:1/div:1/a:1/span:3/strong:1'
    },
    'home-questions': {
      'eyebrow#4': 'page:/footer:1/div:2/p:1',
      'section-title#2': 'page:/footer:1/div:2/h2:1',
      '[data-ark-slot="world"]': 'page:/section:1/section:1/div:1/svg:1',
      '[data-ark-slot="scene-transfers"]': 'page:/section:1/section:1/div:2/div:1',
      'section-title': 'page:/section:2/div:1/details:1/div:1/section:1/h3:1',
      'section-lede': 'page:/section:2/div:1/details:1/div:1/section:1/p:1',
      'section-title#3': 'page:/section:2/div:1/details:1/div:1/section:2/h3:1',
      /* (since 2026-10-22 See it work's "Deploy a resolver" link to /how-deployment-works is button #10, so the ones after it count on) */
      'button#11': 'page:/section:2/div:1/details:1/div:1/section:2/a:1',
      'section-title#4': 'page:/section:2/div:1/details:1/div:1/section:3/h3:1',
      'stat-label#4': 'page:/section:2/div:1/details:1/div:1/div:1/p:1',
      'button#12': 'page:/section:2/div:1/details:1/div:1/div:1/a:1',
      'section-title#5': 'page:/section:2/div:1/details:1/div:1/section:4/h3:1',
      'accordion-item#5': 'page:/section:2/div:1/details:1/div:1/section:4/div:1/details:2',
      'accordion-item#6': 'page:/section:2/div:1/details:1/div:1/section:4/div:1/details:3',
      'accordion-content': 'page:/section:2/div:1/details:1/div:1/section:2/div:1/article:1/p:2',
      'accordion-content#2': 'page:/section:2/div:1/details:1/div:1/section:2/div:1/article:2/p:2',
      'accordion-content#3': 'page:/section:2/div:1/details:1/div:1/section:2/div:1/article:3/p:2',
      'stat-label': 'page:/section:2/div:1/details:1/div:1/section:3/div:1/article:1/p:1',
      'stat-unit': 'page:/section:2/div:1/details:1/div:1/section:3/div:1/article:1/span:1',
      'accordion-trigger#4': 'page:/section:2/div:1/details:1/div:1/section:4/div:1/details:1/summary:1',
      'accordion-content#4': 'page:/section:2/div:1/details:1/div:1/section:4/div:1/details:1/p:1',
      'accordion-trigger#5': 'page:/section:2/div:1/details:1/div:1/section:4/div:1/details:2/summary:1',
      'accordion-content#5': 'page:/section:2/div:1/details:1/div:1/section:4/div:1/details:2/p:1',
      'accordion-trigger#6': 'page:/section:2/div:1/details:1/div:1/section:4/div:1/details:3/summary:1',
      'accordion-content#6': 'page:/section:2/div:1/details:1/div:1/section:4/div:1/details:3/p:1',
      'eyebrow': 'page:/section:2/div:1/details:1/div:1/section:1/div:1/div:2/div:1/p:1',
      'card-title': 'page:/section:2/div:1/details:1/div:1/section:1/div:1/div:2/div:1/h3:1',
      'card-description': 'page:/section:2/div:1/details:1/div:1/section:1/div:1/div:2/div:1/p:2',
      'button': 'page:/section:2/div:1/details:1/div:1/section:1/div:1/div:2/div:2/a:1',
      'button#2': 'page:/section:2/div:1/details:1/div:1/section:1/div:1/div:2/div:2/nav:1/a:1',
      'button#3': 'page:/section:2/div:1/details:1/div:1/section:1/div:1/div:2/div:2/nav:1/a:2',
      'button#13': 'page:/section:2/div:1/details:1/div:1/section:3/div:2/details:1/div:1/div:2/a:1',
      'stat-label#2': 'page:/section:2/div:1/details:1/div:1/section:3/div:2/details:1/div:1/div:1/article:1/p:1',
      'stat-unit#2': 'page:/section:2/div:1/details:1/div:1/section:3/div:2/details:1/div:1/div:1/article:1/span:1',
      'stat-label#3': 'page:/section:2/div:1/details:1/div:1/section:3/div:2/details:1/div:1/div:1/article:2/p:1',
      ':root': { key: 'page:/section:2/div:1/details:1', self: true },
      '[data-ark-slot="scene-transfers"] .flow-now': 'page:/section:1/section:1/div:2/div:1/div:1',   /* the step picker now stands before the scene's tile (as the list did), so the tile is pinned, not counted */
      'tabs-list': { key: 'page:/section:2/div:1/details:1/summary:1', self: true },
      'tabs-content#6': { key: 'page:/section:1/section:1', self: true },
      'tabs#3': { key: 'page:/section:1/section:1/div:1/div:1', self: true },
      'tabs-list#3': 'page:/section:1/section:1/div:1/div:1/div:1',
      'figure-frame#2': { key: 'page:/section:1/section:1/div:2', self: true },
      'figure-caption#2': { key: 'page:/section:1/section:1/div:1/div:1/p:1', self: true },
      ':scope > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > figure:nth-of-type(1) > figcaption:nth-of-type(1) > p:nth-of-type(1)': 'page:/section:1/div:1/div:1/a:1/span:3/small:1',
      'tabs-content': { key: 'id:hl-start', self: true },
      'tabs#2': { key: 'page:/section:2/div:1/details:1/div:1/section:1/div:1', self: true },
      'tabs-list#2': { key: 'page:/section:2/div:1/details:1/div:1/section:1/div:1/div:1', self: true },
      'tabs-trigger#6': 'id:hl-audience-0',
      'tabs-trigger#7': 'id:hl-audience-1',
      'tabs-trigger#8': 'id:hl-audience-2',
      'tabs-content#2': { key: 'id:hl-audience-panel', self: true },
      'card': { key: 'page:/section:2/div:1/details:1/div:1/section:1/div:1/div:2/div:1', self: true },
      'actions': { key: 'page:/section:2/div:1/details:1/div:1/section:1/div:1/div:2/div:2', self: true },
      'tabs-content#5': { key: 'page:/footer:1/div:2', self: true },
      'pager-next': { key: 'page:/footer:1/div:2/a:1', self: true },
      ':scope > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(5) > nav:nth-of-type(1) > div:nth-of-type(1) > a:nth-of-type(1) > span:nth-of-type(2)': 'page:/footer:1/div:2/a:1/span:3/strong:1',
      ':scope > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(5) > nav:nth-of-type(1) > div:nth-of-type(1) > a:nth-of-type(1) > span:nth-of-type(3)': 'page:/footer:1/div:2/a:1/span:3/small:1',
      ':scope > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(5) > nav:nth-of-type(1) > div:nth-of-type(2) > ul:nth-of-type(1)': { key: 'page:/footer:1/nav:1', self: true },
      ':scope > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(5) > nav:nth-of-type(1) > div:nth-of-type(2) > ul:nth-of-type(1) > li:nth-of-type(1) > a:nth-of-type(1)': 'page:/footer:1/nav:1/a:1',
      ':scope > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(5) > nav:nth-of-type(1) > div:nth-of-type(2) > ul:nth-of-type(1) > li:nth-of-type(2) > a:nth-of-type(1)': 'page:/footer:1/nav:1/a:2',
      ':scope > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(5) > nav:nth-of-type(1) > div:nth-of-type(2) > ul:nth-of-type(1) > li:nth-of-type(3) > a:nth-of-type(1)': 'page:/footer:1/nav:1/a:3',
      ':scope > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(5) > nav:nth-of-type(1) > div:nth-of-type(2) > ul:nth-of-type(1) > li:nth-of-type(4) > a:nth-of-type(1)': 'page:/footer:1/nav:1/a:4',
      ':scope > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(5) > nav:nth-of-type(1) > div:nth-of-type(2) > ul:nth-of-type(1) > li:nth-of-type(5) > a:nth-of-type(1)': 'page:/footer:1/nav:1/a:5',
      'tabs-content#31': { key: 'page:/section:2/div:1/details:1/div:1/section:2', self: true },
      ':scope > div:nth-of-type(4) > figure:nth-of-type(1) > figcaption:nth-of-type(1) > p:nth-of-type(1)': 'page:/section:2/div:1/details:1/div:1/section:2/p:1',
      'accordion': { key: 'page:/section:2/div:1/details:1/div:1/section:2/div:1', self: true },
      'accordion-item': { key: 'page:/section:2/div:1/details:1/div:1/section:2/div:1/article:1', self: true },
      'accordion-item#2': { key: 'page:/section:2/div:1/details:1/div:1/section:2/div:1/article:2', self: true },
      'accordion-item#3': { key: 'page:/section:2/div:1/details:1/div:1/section:2/div:1/article:3', self: true },
      'accordion-trigger': 'page:/section:2/div:1/details:1/div:1/section:2/div:1/article:1/h3:1',
      'accordion-trigger#2': 'page:/section:2/div:1/details:1/div:1/section:2/div:1/article:2/h3:1',
      'accordion-trigger#3': 'page:/section:2/div:1/details:1/div:1/section:2/div:1/article:3/h3:1',
      'tabs-content#32': { key: 'page:/section:2/div:1/details:1/div:1/section:3', self: true },
      ':scope > div:nth-of-type(5) > div:nth-of-type(2) > div:nth-of-type(4) > p:nth-of-type(1)': 'page:/section:2/div:1/details:1/div:1/section:3/p:1',
      'stats': { key: 'page:/section:2/div:1/details:1/div:1/section:3/div:1', self: true },
      'stat': { key: 'page:/section:2/div:1/details:1/div:1/section:3/div:1/article:1', self: true },
      ':scope > div:nth-of-type(5) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)': 'page:/section:2/div:1/details:1/div:1/section:3/div:1/article:1/strong:1',
      'stat-detail': 'page:/section:2/div:1/details:1/div:1/section:3/div:1/article:1/p:2',
      'stat#2': { key: 'page:/section:2/div:1/details:1/div:1/section:3/div:2/details:1/div:1/div:1/article:1', self: true },
      ':scope > div:nth-of-type(5) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(2) > span:nth-of-type(1)': 'page:/section:2/div:1/details:1/div:1/section:3/div:2/details:1/div:1/div:1/article:1/strong:1',
      'stat-detail#2': 'page:/section:2/div:1/details:1/div:1/section:3/div:2/details:1/div:1/div:1/article:1/p:2',
      'stat#3': { key: 'page:/section:2/div:1/details:1/div:1/section:3/div:2/details:1/div:1/div:1/article:2', self: true },
      ':scope > div:nth-of-type(5) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > p:nth-of-type(2) > span:nth-of-type(1)': 'page:/section:2/div:1/details:1/div:1/section:3/div:2/details:1/div:1/div:1/article:2/strong:1',
      'stat-unit#3': 'page:/section:2/div:1/details:1/div:1/section:3/div:2/details:1/div:1/div:1/article:2/span:1',
      'stat-detail#3': 'page:/section:2/div:1/details:1/div:1/section:3/div:2/details:1/div:1/div:1/article:2/p:2',
      'tabs-content#33': { key: 'page:/section:2/div:1/details:1/div:1/section:3/div:2/details:1/div:1/div:2', self: true },
      ':scope > div:nth-of-type(5) > div:nth-of-type(2) > div:nth-of-type(2) > p:nth-of-type(1)': 'page:/section:2/div:1/details:1/div:1/section:3/div:2/details:1/div:1/div:2/p:1',
      'stat#4': { key: 'page:/section:2/div:1/details:1/div:1/div:1', self: true },
      ':scope > div:nth-of-type(5) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': 'page:/section:2/div:1/details:1/div:1/div:1/span:1',
      'tabs-content#36': { key: 'page:/section:2/div:1/details:1/div:1/section:4', self: true },
      'accordion#2': 'page:/section:2/div:1/details:1/div:1/section:4/div:1',
      'accordion-item#4': 'page:/section:2/div:1/details:1/div:1/section:4/div:1/details:1'
    }
  };

  /* The old step list of the Transfers scene (ol > li > button > number, icon, name) is the step
     picker's tab list and tabs now: the list and each button keep their keys (the button's words lost
     the number and the icon: one label, "Sign"). */
  var STEPS_WAS = (function () {
    var base = 'page:/section:1/section:1/div:2/div:1/ol:1', was = { 'tabs-list': { key: base, self: true } };
    for (var k = 1; k <= 5; k++) was['tabs-trigger' + (k > 1 ? '#' + k : '')] = { key: base + '/li:' + k + '/button:1', self: true };
    /* the quote under the scene (strong.flow-says) was captured at the Resolve step: it is that tab's panel now */
    was['[data-value="resolve"] > p'] = { key: 'page:/section:1/section:1/div:2/div:1/div:1/strong:1', self: true };
    return was;
  })();

  /* A home manifest link field holds a tagged value (route:...): the block resolves it. */
  function link(role) { return ArkCopy.text('HOME.' + role); }
  function escape(text) { return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* A verified registry record's figure for `measure`: "<measure> <number> <unit>[ per <scope>]". */
  function registryFigure(id, measure) {
    var record = typeof ArkEvidence !== 'undefined' && ArkEvidence.benchmarks[id];
    if (!record || !record.verified) return null;
    var m = new RegExp(escape(measure) + '\\s+(\\d[\\d,]*(?:\\.\\d+)?)\\s+([^;.]+)', 'i').exec(record.evidence);
    if (!m) return null;
    var unit = m[2].trim().split(' per ');
    return { id: id, record: record, value: m[1], unit: unit[0], scope: unit.length > 1 ? 'per ' + unit.slice(1).join(' per ') : '' };
  }
  /* The verified record, if any, that carries a figure published elsewhere. */
  function verifiedCarrier(figure) {
    if (typeof ArkEvidence === 'undefined' || !figure) return null;
    var ids = Object.keys(ArkEvidence.benchmarks);
    for (var i = 0; i < ids.length; i++) {
      var record = ArkEvidence.benchmarks[ids[i]];
      if (record.verified && record.evidence.indexOf(figure.value) >= 0) return { id: ids[i], record: record, value: figure.value, unit: figure.unit, scope: '' };
    }
    return null;
  }
  function benchmarkTile(t) {
    var published = t.figure != null && typeof ArkStatsHighlights !== 'undefined' ? ArkStatsHighlights.items[t.figure] : null;
    var found = t.record ? registryFigure(t.record, t.measure) : verifiedCarrier(published);
    if (found) {
      var tileFound = { label: t.label, value: found.value, unit: found.unit, format: 'plain' };
      var detail = [found.scope ? found.scope.charAt(0).toUpperCase() + found.scope.slice(1) + '.' : '', t.note || ''].filter(Boolean).join(' ');
      if (detail) tileFound.detail = detail;
      return tileFound;
    }
    return { label: t.label, absent: { kind: 'unavailable',
      reason: 'Not verified: no verified record in the evidence registry carries ' + (published ? 'the ten-node concurrent run /stats publishes' : 'this figure') + ' yet.',
      remedy: 'Its raw result and conditions go in the evidence registry; this tile then shows the figure.' } };
  }

  /* The live fleet signal: a measurement to check, absent (never 0) until it arrives. */
  function fleetStat(state) {
    var base = { label: 'A network you can inspect' };
    if (state && state.data) {
      var data = state.data;
      var alive = data.nodes.filter(function (n) { return !n.error && n.qps > 0; }).length;
      base.value = Math.round(data.aggregate_qps);
      base.unit = 'ops/s';
      base.detail = alive + '/' + data.nodes.length + ' nodes reporting · Synthetic capacity · ' +
        new Date(data.measured_at_ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) +
        '. Hourly synthetic capacity, not cumulative ledger growth or live user traffic.';
      return base;
    }
    base.absent = state && state.failed
      ? { kind: 'unavailable', reason: 'Live fleet measurement unavailable. Dated benchmark evidence above remains available.' }
      : { kind: 'unavailable', reason: 'Fleet measurement loading · Hourly synthetic capacity test.' };
    return base;
  }

  /* Where each verified figure comes from, said once for the row: "BENCH-013 · Local, verified ·
     Every operation in its own unit" -- derived from the records the tiles found. */
  function provenance(tiles) {
    var seen = [];
    tiles.forEach(function (t) {
      var found = t.record && registryFigure(t.record, t.measure);
      if (found && seen.indexOf(found.id) < 0) seen.push(found.id);
    });
    return seen.map(function (id) { var r = ArkEvidence.benchmarks[id]; return id + ' · ' + r.status + ' · ' + r.claim; }).join('; ');
  }

  function spec(audience) {
    var bench = TILES.filter(function (t) { return t.record; }), fleet = TILES.filter(function (t) { return !t.record; });
    var source = provenance(bench);
    return [
      { block: 'hero', id: 'home-hero', was: WAS['home-hero'], props: {
        eyebrow: 'copy:HOME.EYEBROW', title: 'copy:HOME.TITLE', lede: 'copy:HOME.INTRO', density: 'compact',
        /* the owner's call 2026-10-22 (first-visit audit P1): the one action names where it goes and opens the plain
           overview, not the most technical page (it was "Follow the line" to /how-deployment-works) */
        actions: [{ label: 'See how DEFXN works', href: link('LEARN.HREF'), tone: 'primary' }]
      } },
      { block: 'tabs', id: 'home-questions', was: WAS['home-questions'], props: { label: 'Your next question', items: [
        /* Where do I start: the three paths, and -- for anyone not sure yet -- the way on. */
        { value: 'start', label: 'Where do I start?', blocks: [
          { block: 'section-header', props: { title: 'Different ambitions. Common ground.', lede: 'Explore the idea, build with it, or help run it. Choose your way into DEFXN.', level: 3 } },
          { block: 'tabs', props: { label: 'Choose your path', variant: 'segmented', defaultValue: audience, items: AUDIENCES.map(function (a) {
            return { value: a.value, label: a.name, blocks: [
              { block: 'card', props: { eyebrow: a.forWho, title: a.title, description: a.text, headingLevel: 3 } },
              { block: 'actions', props: { label: a.name + ' resources', items: [{ label: a.action, href: 'route:' + a.route, tone: 'secondary' }].concat(a.refs.map(function (r) { return { label: r[0], href: 'route:' + r[1], tone: 'ghost' }; })) } }
            ] };
          }).concat([{ value: 'unsure', label: 'Not sure yet', blocks: [
            { block: 'section-header', props: { eyebrow: 'DEFXN / Independent histories. Connected possibilities.', title: 'Start with the idea. Follow the evidence.', level: 3 } },
            { block: 'pager', props: { label: 'More about DEFXN', relatedLabel: 'More about DEFXN',
              next: { label: 'Explore DEFXN', href: link('CLOSING.HREF'), summary: 'Every possibility starts with a history' },
              related: FOOTER.map(function (f) { return { label: f[0], href: link(f[1]) }; }) } }
          ] }]) } }
        ] },
        /* See it work: the hero scene. The example picker is Ark's segmented tabs, one scene each;
           only the shown one runs. "Your history begins here" -- the old call to action's kicker --
           introduces the scene it always pointed at. */
        { value: 'walk', label: 'See it work', blocks: [
          { block: 'tabs', props: { label: 'Choose an illustrated example', variant: 'segmented', defaultValue: 'transfers', items: ArkUI.chainCases.map(function (c) {
            return { value: c.id, label: c.label, blocks: [{ block: 'figure', props: { kind: 'illustration', slot: 'scene-' + c.id,
              caption: 'Your history begins here: one record joins your chain, you.fxn, in five steps. Illustrative / not live traffic; only what the resolver reads at the end changes between examples.' } }] };
          }) } },
          /* the technical walkthrough the hero used to open, one step later: beside the scene it explains, under the page's one name (js/content/site-pages.js) */
          { block: 'actions', props: { items: [{ label: ArkSitePages.row('deployment').label, href: 'route:deployment', tone: 'ghost' }] } }
        ] },
        /* How it fits together: your chain among the others (the transit map), and the three parts. */
        { value: 'model', label: 'How it fits together', blocks: [
          { block: 'section-header', props: { title: 'Independent histories. Shared possibilities.', level: 3 } },
          { block: 'figure', props: { kind: 'illustration', slot: 'world', caption: 'Identity, execution and evidence are distinct parts of the same story. Your chain is the heavy line; the others cross it at your records.' } },
          { block: 'accordion', props: { label: 'Three parts of one story', defaultOpen: ['identity'], items: PRINCIPLES.map(function (p) { return { value: p[0].toLowerCase(), title: p[0] + ' · ' + p[1], content: p[2] }; }) } },
          { block: 'actions', props: { items: [{ label: 'Go deeper into the resolver model', href: link('PRESSURETEST.HREF'), tone: 'ghost' }] } }
        ] },
        /* What is measured: figures FROM THE EVIDENCE REGISTRY, the fleet as it runs now, and how to
           read both. A figure the registry does not verify is absent ("Not verified"), never a number. */
        { value: 'evidence', label: 'What is measured?', blocks: [
          { block: 'section-header', props: { title: 'Put the claims under a microscope.', level: 3 } },
          { block: 'tabs', props: { label: 'Evidence', variant: 'segmented', items: [
            { value: 'benchmarks', label: 'Benchmarks', content: (source ? source + '. ' : '') + 'These are resolution and storage benchmarks, not end-to-end transaction rates.', blocks: [
              { block: 'stats', props: { label: 'Benchmarks, as the evidence registry records them', columns: 3, items: bench.map(benchmarkTile) } }
            ] },
            { value: 'fleet', label: 'The fleet now', blocks: [
              { block: 'stats', props: { label: 'The fleet', columns: 2, items: [fleetStat(null)].concat(fleet.map(benchmarkTile)) } },
              { block: 'actions', props: { items: [{ label: 'Open the explorer', href: link('OBSERVATORY.HREF'), tone: 'ghost' }] } }
            ] },
            { value: 'method', label: 'How to read them', content: 'Published results from the DEFXN evidence registry. The conditions matter as much as the numbers.', blocks: [
              { block: 'actions', props: { items: [
                { label: 'Read methodology & limits', href: link('METHODOLOGY.HREF'), tone: 'secondary' },
                { label: 'Read the evidence registry', href: 'doc:docs/evidence/registry.md', tone: 'ghost' }
              ] } }
            ] }
          ] } }
        ] },
        { value: 'faq', label: 'Questions', blocks: [
          { block: 'section-header', props: { title: 'Clarity comes first.', level: 3 } },
          { block: 'accordion', props: { label: 'Questions', items: QUESTIONS.map(function (q, i) { return { value: 'q' + (i + 1), title: q[0], content: q[1] }; }) } }
        ] }
      ] } },
      { insert: 'main', was: WAS.insert }
    ];
  }

  ArkUI.pageModules.zero = {
    spec: spec,
    mount: function (host) {
      var world = ArkUI.buildChainWorld ? ArkUI.buildChainWorld({ caseId: 'transfers' }) : null;
      var scenes = {}, slots = { world: function () { return world ? world.element : null; } };
      ArkUI.chainCases.forEach(function (c) {
        slots['scene-' + c.id] = function () {
          var flow = scenes[c.id] = ArkUI.buildChainFlow({ caseId: c.id, rich: true });
          /* the five steps at the top of the scene's frame (Ark tabs; the open one says its step) */
          ArkUI.buildChainSteps(flow, c.id, { id: 'home-steps-' + c.id, was: c.id === 'transfers' ? STEPS_WAS : undefined });
          return flow.element;
        };
      });
      var remembered = ArkUI.pageModules.zero.selectedAudience || 'explore';
      var page = ArkUI.page(spec(remembered), host, { page: 'zero', terms: 'first-use', className: 'home-page', titleId: 'hl-title', slots: slots });

      /* Which tab of a tabs block shows now (its value, by position). */
      function selected(tabs, values) {
        var list = tabs.querySelector(':scope > [data-ark-part="tabs-list"]');
        var on = list && list.querySelector('[role="tab"][aria-selected="true"]');
        return on ? values[Array.prototype.indexOf.call(list.children, on)] : values[0];
      }
      /* The path picker is the "Where do I start?" view's own tabs; the example picker, "See it work"'s. (The
         steps inside each example are tabs too, deeper down.) */
      var order = spec(remembered)[1].props.items.map(function (item) { return item.value; });
      function viewTabs(value) {
        var view = page.querySelectorAll('#home-questions > [data-ark-part="tabs-content"]')[order.indexOf(value)];
        return view && view.querySelector(':scope > [data-ark-block="tabs"]');
      }
      var caseTabs = viewTabs('walk'), pathTabs = viewTabs('start');
      var caseIds = ArkUI.chainCases.map(function (c) { return c.id; });
      function shownScene() { return caseTabs ? scenes[selected(caseTabs, caseIds)] : null; }
      /* The example chosen in the scene is the line drawn in full ink on the map; only the shown
         scene runs (a hidden one schedules nothing), so a choice starts it again. */
      function follow() {
        var scene = shownScene();
        if (scene) scene.restore();
        if (world && caseTabs) world.select(selected(caseTabs, caseIds));
      }
      page.addEventListener('click', function (event) {
        if (!event.target.closest || !event.target.closest('[role="tab"]')) return;
        follow();
        if (pathTabs) ArkUI.pageModules.zero.selectedAudience = selected(pathTabs, AUDIENCES.map(function (a) { return a.value; }));
      });

      /* The fleet signal, when it arrives, replaces its absent tile in place (same block). */
      var disposed = false;
      /* The reading patches the fleet row IN PLACE (ArkUI.blocks.update, Ark's patchArkBlock): an
         element whose shape did not change keeps its identity, so a pin or a saved CMS frame on the
         tile survives a reading that arrives after the page settled. */
      function paintFleet(state) {
        var row = page.querySelectorAll('#home-questions [data-ark-block="stats"]')[1];
        if (!row || disposed) return;
        ArkUI.blocks.update(row, { label: 'The fleet', columns: 2, items: [fleetStat(state)].concat(TILES.filter(function (t) { return !t.record; }).map(benchmarkTile)) }, { from: '/' });
      }
      if (window.ArkPulse) ArkPulse.get().then(function (result) { paintFleet({ data: result.data }); }).catch(function () { paintFleet({ failed: true }); });

      page.arkRestore = follow;
      page.arkDispose = function () { disposed = true; if (world && world.dispose) world.dispose(); Object.keys(scenes).forEach(function (id) { scenes[id].dispose(); }); };
      return page;
    }
  };
})();
