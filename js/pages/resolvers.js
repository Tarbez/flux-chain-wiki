/* /resolvers · Resolvers and capabilities, as a page of Ark blocks.
 *
 * Every fact on this page comes from js/content/registry-snapshot.js, which
 * scripts/snapshot-registry.mjs generates from the code that defines each
 * resolver and capability (defxn-defi-rs), plus the last recorded
 * development-network observation. Nothing here is typed by hand: not the
 * counts, not the chain ids, not what a resolver composes. The words live in
 * js/content/manifests/resolver.js (REGISTRY.*), beside the hub that explains
 * them, and reach the page as copy: values.
 *
 * The snapshot is dated and says so; it is never presented as live. A fact
 * the sources do not hold (a resolver's control key, how many providers
 * announce right now) is shown as absent -- Ark's table says "no value" --
 * and sent to Explore, which reads a node; never as 0.
 *
 * Converted to data in DEFXN polish Wave 3 (W3-STATS): the answer first (what the page is, the
 * three counts, the live view), then one tab per question -- resolver chains, capabilities,
 * bridge chains, deploying your own, and the applications that are not chains yet. It was 2.66x
 * the viewport on a desktop and 3.66x on a phone, with its tables, chips and tiles hand-built
 * (docs/ux-audit/pages-ux-b.md /resolvers); every row and link is still here. Words that the
 * glossary defines are glossed where they first appear (gloss(), below).
 *
 * Until 2026-10-19 this page was a hand-written directory of six
 * applications (js/content/resolver-registry.js). They are not resolver
 * chains; they stay, folded, under their own tab
 * (js/content/resolver-applications.js).
 *
 * Layout keys: tests/resolvers-blocks.cjs holds the continuity of every old key
 * (tests/fixtures/layout-keys/resolvers.tsv). */
(function () {
  'use strict';

  var EXPLORE = 'https://explore.defxn.com';

  function words(role) { return ArkCopy.text('RESOLVER.' + role); }
  function short(hex, n) { return hex ? String(hex).slice(0, n || 12) : null; }
  /* An empty list is a reading -- this resolver composes nothing -- not a missing one. */
  function list(items) { return items && items.length ? items.join(', ') : 'none'; }
  /* The sources never hold a resolver's control key: say so in the cell rather than leave Ark's
     absent mark there -- whose visually hidden "no value" escapes the table's scroll region
     (an Ark defect reported by W3-STATS) -- and send the reader to Explore, which reads it. */
  var NOT_IN_SOURCES = 'not in the sources';
  function fmt(n) { return Number(n).toLocaleString('en-US'); }
  /* A tab name is at most 32 characters, and Ark measures the value it is given -- a copy: key
     ("copy:RESOLVER.REGISTRY.CHAINS.LABEL" is 35) -- not the words it resolves to, so short
     fields take the manifest's words directly (reported to the coordinator, W3-STATS). */
  /* Glossary terms, marked by hand on their first use ([[word|key]], Ark's term markup). The
     adapter's automatic first-use marking (terms: 'first-use') also glossed "HTTP-served" and
     "signer rotations" in the application notes, where the words mean something else, so this
     page names the words it glosses. Marks the first whole-word occurrence of each key. */
  function gloss(text, keys) {
    keys.forEach(function (key) {
      var re = new RegExp('(^|[^\\w-])(' + key + 's?)(?![\\w-])', 'i');
      text = text.replace(re, function (all, before, word) { return before + '[[' + word + '|' + key + ']]'; });
    });
    return text;
  }
  function grammar(state) { return state === 'enforced' ? 'Grammar enforced' : 'Unspecified (legacy)'; }

  /* `was`: the layout key each element had on the old page, by spec entry. HAND are the pins words
     alone cannot choose (a tile that became a tab panel or an accordion item -- `self`, its inside
     is new -- and each table, whose cells keep their keys by structure); DERIVED is what
     tests/lib/layout-continuity.cjs derived on top of them. tests/resolvers-blocks.cjs lists every
     reshaped or retired key with its reason. */
  var T = 'page:/div:1/div:1';
  var HAND = {
    'registry-hero': {
      ':root': { key: T + '/article:1', self: true }, 'hero-meta': { key: T + '/article:2', self: true },
      ':scope > dl:nth-of-type(1) > div:nth-of-type(1)': { key: T + '/article:2/p:1', self: true }, ':scope > dl:nth-of-type(1) > div:nth-of-type(1) > dt:nth-of-type(1)': T + '/article:2/p:1/span:1',
      ':scope > dl:nth-of-type(1) > div:nth-of-type(2)': { key: T + '/article:2/p:2', self: true },
      ':scope > dl:nth-of-type(1) > div:nth-of-type(3)': { key: T + '/article:2/p:3', self: true }, ':scope > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)': T + '/article:2/p:3/span:1'
    },
    'registry-views': {
      'tabs-content': { key: T + '/article:3', self: true }, 'table-wrap': T + '/article:3/div:1',
      'tabs-trigger#2': 'id:registry-caps-label', 'tabs-content#2': { key: T + '/article:4', self: true }, 'table-wrap#2': T + '/article:4/div:1',
      'tabs-content#3': { key: T + '/article:5', self: true }, 'table-wrap#3': T + '/article:5/details:1/div:1',
      'tabs-content#4': { key: T + '/article:6', self: true }, 'stepper': T + '/article:6/ol:1', 'actions': { key: T + '/article:6/p:2', self: true }, 'button#2': T + '/article:6/p:2/a:2',
      'tabs-content#5': { key: T + '/article:7', self: true }, 'disclosure#5': { key: T + '/article:7/details:1', self: true }, 'accordion#2': { key: T + '/article:7/details:1/ul:1', self: true },
      'accordion-item#2': { key: T + '/article:7/details:1/ul:1/li:1', self: true }, 'accordion-item#3': { key: T + '/article:7/details:1/ul:1/li:2', self: true },
      'accordion-item#4': { key: T + '/article:7/details:1/ul:1/li:3', self: true }, 'accordion-item#5': { key: T + '/article:7/details:1/ul:1/li:4', self: true },
      'accordion-item#6': { key: T + '/article:7/details:1/ul:1/li:5', self: true }, 'accordion-item#7': { key: T + '/article:7/details:1/ul:1/li:6', self: true }
    },
    'registry-source': { ':root': { key: T + '/article:8', self: true } },
    insert: { key: T + '/div:1', self: true }
  };
  var DERIVED = {
    'registry-hero': {
      'hero-title': 'id:resolvers-title',
      'eyebrow': T + '/article:1/p:1',
      'hero-lede': T + '/article:1/p:2',
      ':scope > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)': T + '/article:2/p:1/strong:1',
      ':scope > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)': T + '/article:2/p:2/strong:1',
      ':scope > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)': T + '/article:2/p:2/span:1',
      ':scope > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)': T + '/article:2/p:3/strong:1'
    },
    'registry-views': {
      'tabs-trigger': 'id:registry-chains-label',
      'tabs-trigger#4': 'id:registry-deploy-label',
      ':scope > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': T + '/article:3/p:2',
      ':scope > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': T + '/article:3/p:3',
      ':scope > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': T + '/article:4/p:2',
      ':scope > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)': T + '/article:4/p:3',
      'disclosure-panel#4': T + '/article:6/p:3',
      'disclosure-panel#3': T + '/article:5/details:1/p:1',
      'button': T + '/article:6/p:2/a:1',
      ':scope > div:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': T + '/article:7/details:1/summary:1',
      ':scope > div:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)': T + '/article:7/details:1/p:1',
      ':scope > div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)': T + '/article:7/details:1/ul:1/li:1/p:2',
      ':scope > div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(3)': T + '/article:7/details:1/ul:1/li:1/p:3',
      ':scope > div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(4)': T + '/article:7/details:1/ul:1/li:1/p:4',
      ':scope > div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)': T + '/article:7/details:1/ul:1/li:2/p:2',
      ':scope > div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(3)': T + '/article:7/details:1/ul:1/li:2/p:3',
      ':scope > div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(4)': T + '/article:7/details:1/ul:1/li:2/p:4',
      ':scope > div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)': T + '/article:7/details:1/ul:1/li:3/p:2',
      ':scope > div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(3)': T + '/article:7/details:1/ul:1/li:3/p:3',
      ':scope > div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(4)': T + '/article:7/details:1/ul:1/li:3/p:4',
      ':scope > div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)': T + '/article:7/details:1/ul:1/li:4/p:2',
      ':scope > div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(3)': T + '/article:7/details:1/ul:1/li:4/p:3',
      ':scope > div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(4)': T + '/article:7/details:1/ul:1/li:4/p:4',
      ':scope > div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(5) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)': T + '/article:7/details:1/ul:1/li:5/p:2',
      ':scope > div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(5) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(3)': T + '/article:7/details:1/ul:1/li:5/p:3',
      ':scope > div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(5) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(4)': T + '/article:7/details:1/ul:1/li:5/p:4',
      ':scope > div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)': T + '/article:7/details:1/ul:1/li:6/p:2',
      ':scope > div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(3)': T + '/article:7/details:1/ul:1/li:6/p:3',
      ':scope > div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(4)': T + '/article:7/details:1/ul:1/li:6/p:4',
      ':scope > div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(5)': T + '/article:7/details:1/ul:1/li:6/p:5',
      'fact-value': T + '/article:3/div:1/table:1/tbody:1/tr:1/td:5',
      'fact-value#2': T + '/article:3/div:1/table:1/tbody:1/tr:2/td:5',
      'fact-value#3': T + '/article:3/div:1/table:1/tbody:1/tr:3/td:5',
      'fact-value#4': T + '/article:3/div:1/table:1/tbody:1/tr:4/td:5',
      'fact-value#5': T + '/article:3/div:1/table:1/tbody:1/tr:5/td:5',
      'fact-value#6': T + '/article:3/div:1/table:1/tbody:1/tr:6/td:5',
      'fact-value#7': T + '/article:3/div:1/table:1/tbody:1/tr:7/td:5',
      'fact-value#8': T + '/article:3/div:1/table:1/tbody:1/tr:8/td:5',
      'fact-value#9': T + '/article:3/div:1/table:1/tbody:1/tr:9/td:5',
      'fact-value#10': T + '/article:3/div:1/table:1/tbody:1/tr:10/td:5',
      'fact-value#11': T + '/article:3/div:1/table:1/tbody:1/tr:11/td:5',
      'fact-value#12': T + '/article:3/div:1/table:1/tbody:1/tr:12/td:5',
      'accordion-trigger#2': T + '/article:7/details:1/ul:1/li:1/p:1/strong:1',
      ':scope > div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': T + '/article:7/details:1/ul:1/li:1/p:1/span:1',
      'accordion-trigger#3': T + '/article:7/details:1/ul:1/li:2/p:1/strong:1',
      ':scope > div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': T + '/article:7/details:1/ul:1/li:2/p:1/span:1',
      'accordion-trigger#4': T + '/article:7/details:1/ul:1/li:3/p:1/strong:1',
      ':scope > div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': T + '/article:7/details:1/ul:1/li:3/p:1/span:1',
      'accordion-trigger#5': T + '/article:7/details:1/ul:1/li:4/p:1/strong:1',
      ':scope > div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': T + '/article:7/details:1/ul:1/li:4/p:1/span:1',
      'accordion-trigger#6': T + '/article:7/details:1/ul:1/li:5/p:1/strong:1',
      ':scope > div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(5) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': T + '/article:7/details:1/ul:1/li:5/p:1/span:1',
      'accordion-trigger#7': T + '/article:7/details:1/ul:1/li:6/p:1/strong:1',
      ':scope > div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)': T + '/article:7/details:1/ul:1/li:6/p:1/span:1'
    },
    'registry-source': {
      ':scope > div:nth-of-type(1) > p:nth-of-type(4)': T + '/article:2/p:4',
      ':scope > div:nth-of-type(1) > p:nth-of-type(1)': T + '/article:8/p:1',
      ':scope > div:nth-of-type(1) > p:nth-of-type(2)': T + '/article:1/p:3/span:1',
      ':scope > div:nth-of-type(1) > p:nth-of-type(3)': T + '/article:1/p:3/span:2'
    },
    'registry-onward': {
      ':scope > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(6) > a:nth-of-type(1)': T + '/article:1/p:3/a:1',
      ':scope > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(1) > a:nth-of-type(1)': T + '/article:6/p:2/a:3',
      ':scope > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(2) > a:nth-of-type(1)': T + '/article:6/p:2/a:4',
      ':scope > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(3) > a:nth-of-type(1)': T + '/article:6/p:2/a:5',
      ':scope > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(4) > a:nth-of-type(1)': T + '/article:6/p:2/a:6'
    }
  };
  var WAS = {};
  Object.keys(HAND).concat(Object.keys(DERIVED)).forEach(function (id) { WAS[id] = Object.assign({}, DERIVED[id], HAND[id]); });

  /* No snapshot: a refusal that names what it needs, never an empty table that reads as "no resolvers". */
  function missingSnapshot() {
    return [{ block: 'callout', id: 'registry-missing', props: { tone: 'warning', title: 'No resolver is listed here',
      body: 'The registry snapshot did not load, so no resolver is listed here.',
      missing: 'js/content/registry-snapshot.js.', remedy: 'node scripts/snapshot-registry.mjs --write, or read the live list in Explore.' } }];
  }

  function views(snap, apps) {
    var counts = snap.counts, obs = snap.observation, commit = short(snap.source.commit, 7);
    var items = [
      { value: 'chains', label: words('REGISTRY.CHAINS.LABEL'), blocks: [
        { block: 'disclosure', props: { foldBelow: 'phone', more: 'About these chains, and each one live', less: 'Fold it',
          content: gloss(words('REGISTRY.CHAINS.BODY'), ['launched', 'grammar']),
          blocks: [{ block: 'accordion', props: { label: 'Each chain, live', items: [
            { value: 'explore', title: words('REGISTRY.OPEN') + ' · each chain',
              content: 'Grammar state is the source manifest at ' + commit + '; the development network was launched before it and was not re-read. [[Control key|control key]] and announcing providers are not in the sources: read them in Explore.',
              blocks: [{ block: 'facts', props: { label: words('REGISTRY.OPEN'), columns: 2, items: snap.resolvers.map(function (r) {
                return { term: r.chainId, value: words('REGISTRY.OPEN') + ' ↗', href: EXPLORE + '/#' + encodeURIComponent(r.chainId), mono: true };
              }) } }] }
          ] } }] } },
        { block: 'table', props: { caption: counts.nativeResolverChains + ' first-party resolver chains, each launched by one record', maxHeight: 'compact', rowHeader: true,
          columns: [{ key: 'id', label: 'Chain id', mono: true }, { key: 'name', label: 'Resolver' }, { key: 'composes', label: 'Built from' }, { key: 'grammar', label: 'Grammar' }, { key: 'control', label: 'Control', mono: true }],
          rows: snap.resolvers.map(function (r) { return { id: r.chainId, name: r.name, composes: list(r.composes), grammar: grammar(r.grammar), control: r.control ? short(r.control) : NOT_IN_SOURCES }; }) } }
      ] },
      { value: 'capabilities', label: words('REGISTRY.CAPS.LABEL'), blocks: [
        { block: 'disclosure', props: { foldBelow: 'phone', more: 'What a capability is, and what is launched', less: 'Fold it',
          /* A measured zero is said as a measured zero; only an absent reading would be "no reading". */
          content: gloss(words('REGISTRY.CAPS.BODY'), ['provider']) + '\n\n' + (obs.capabilitiesLaunched === 0 ? words('REGISTRY.CAPS.EMPTY')
            : typeof obs.capabilitiesLaunched === 'number' ? 'Launched on the development network at its last recorded restart: ' + obs.capabilitiesLaunched + '.'
            : 'The development-network observation in the snapshot carries no capability count: read it in Explore.') } },
        { block: 'table', props: { caption: counts.capabilities + ' capability manifests, derived from their crates’ own tests', maxHeight: 'compact', rowHeader: true,
          columns: [{ key: 'id', label: 'Capability', mono: true }, { key: 'version', label: 'Version', mono: true }, { key: 'vectors', label: 'Test vectors', numeric: true }, { key: 'hash', label: 'Source hash', mono: true }, { key: 'usedBy', label: 'Used by' }],
          rows: snap.capabilities.map(function (c) { return { id: c.id, version: c.version, vectors: String(c.vectors), hash: short(c.sourceHash), usedBy: list(c.usedBy) }; }) } }
      ] },
      { value: 'bridges', label: words('REGISTRY.BRIDGES.LABEL'), blocks: [
        { block: 'disclosure', props: { foldBelow: 'phone', more: 'About bridge chains', less: 'Fold it', content: 'copy:RESOLVER.REGISTRY.BRIDGES.BODY' } },
        { block: 'table', props: { caption: words('REGISTRY.BRIDGES.LABEL') + ' · ' + counts.bridgeChains, maxHeight: 'compact', rowHeader: true,
          columns: [{ key: 'id', label: 'Chain id', mono: true }, { key: 'name', label: 'Product' }, { key: 'via', label: 'Through' }, { key: 'records', label: 'Records', mono: true }, { key: 'note', label: 'Note' }],
          rows: snap.bridges.map(function (b) { return { id: b.chainId, name: b.name, via: b.via, records: list(b.records), note: b.note }; }) } }
      ] },
      { value: 'deploy', label: words('REGISTRY.DEPLOY.TITLE'), blocks: [
        { block: 'steps', props: { label: words('REGISTRY.DEPLOY.TITLE'), items: words('REGISTRY.DEPLOY.STEPS').split('\n').filter(Boolean).map(function (line) { return { title: line }; }) } },
        { block: 'actions', props: { label: 'Deploy a resolver', items: [
          { label: 'copy:RESOLVER.REGISTRY.DEPLOY.LINK', href: words('DEPLOY.HREF'), tone: 'primary' },
          { label: 'copy:RESOLVER.DEPLOYER.LINK', href: words('DEPLOYER.HREF'), tone: 'secondary' }
        ] } },
        { block: 'disclosure', props: { foldBelow: 'phone', more: 'Where Explore and Deploy run', less: 'Fold it', content: 'copy:RESOLVER.PRODUCTS.NOTE' } }
      ] }
    ];
    if (apps && apps.applications && apps.applications.length) {
      items.push({ value: 'applications', label: 'Applications', blocks: [
        { block: 'disclosure', props: { foldBelow: 'phone', more: 'Why these are listed apart', less: 'Fold it',
          content: words('REGISTRY.APPS.LABEL') + ' · ' + apps.applications.length + '\n\n' + words('REGISTRY.APPS.BODY') + ' Listed ' + apps.updated + '.' } },
        { block: 'accordion', props: { label: words('REGISTRY.APPS.LABEL') + ' · ' + apps.applications.length, items: apps.applications.map(function (a) {
          var m = a.measured || {};
          var lines = [a.shortSummary];
          if (a.note) lines.push(a.note);
          lines.push((m.label || 'Measured') + ': ' + (m.rate == null ? '— · ' + (m.source || 'no published benchmark') : fmt(m.rate) + ' ' + (m.unit || '') + ' · ' + (m.source || '')));
          if (a.openIssues && a.openIssues.length) lines.push('Open issues: ' + a.openIssues.join('; '));
          return { value: a.slug, title: a.name, content: (a.status === 'deployed' ? 'In service' : 'Draft') + '\n\n' + lines.join('\n\n') };
        }) } }
      ] });
    }
    return items;
  }

  function spec(snap, apps) {
    var commit = snap ? short(snap.source.commit, 7) : null;
    return [
      { block: 'breadcrumb', id: 'registry-crumbs', was: WAS['registry-crumbs'], props: { label: 'Your place', items: [
        { label: 'Home', href: 'route:zero' }, { label: 'copy:RESOLVER.REGISTRY.TITLE' }] } },
      /* The answer: what this is, and the counts that matter (the live view is in the pager). */
      { block: 'hero', id: 'registry-hero', was: WAS['registry-hero'], props: {
        eyebrow: 'copy:RESOLVER.REGISTRY.KICKER', title: 'copy:RESOLVER.REGISTRY.TITLE', lede: gloss(words('REGISTRY.LEDE'), ['resolver', 'capability']), density: 'compact',
        meta: snap ? [
          { label: 'First-party chains', value: String(snap.counts.nativeResolverChains) },
          { label: 'Bridge chains', value: String(snap.counts.bridgeChains) },
          { label: 'Capabilities', value: String(snap.counts.capabilities) },
          { label: 'Launched on devnet', value: typeof snap.observation.capabilitiesLaunched === 'number' ? snap.observation.capabilitiesLaunched + ' · ' + snap.observation.date : 'not in the snapshot' }
        ] : undefined } }
    ].concat(snap ? [
      /* Where every number comes from: open on a desktop, a press away on a phone. */
      { block: 'disclosure', id: 'registry-source', was: WAS['registry-source'], props: { foldBelow: 'phone', more: 'About this snapshot', less: 'Fold it',
        content: words('REGISTRY.BOUNDARY') + '\n\nSnapshot · ' + snap.source.repo.replace(/^flux\//, '') + ' ' + commit + ' · ' + snap.source.commitDate +
          '\n\nDevelopment network · ' + snap.observation.date + '\n\nIn source at ' + commit + '. The development network listed ' + snap.observation.resolverChainsListed + ' resolver chains' + (snap.observation.allNative ? ', all native,' : '') + ' on ' + snap.observation.date + '.' } },
      { block: 'tabs', id: 'registry-views', was: WAS['registry-views'], props: { label: 'Registry views', items: views(snap, apps) } }
    ] : missingSnapshot()).concat([
      { insert: 'main', was: WAS.insert },
      { block: 'pager', id: 'registry-onward', was: WAS['registry-onward'], props: { label: 'Keep going', relatedLabel: 'Keep going', related: [
        { label: 'What is a resolver?', href: 'route:resolver' },
        { label: 'Resolver math', href: 'route:resolver-math' },
        { label: 'Reference resolvers', href: 'route:references' },
        { label: 'Create or join a network', href: 'route:deploy' },
        { label: 'Each resolver’s measured throughput', href: 'route:stats' },
        { label: 'Live view · explore.defxn.com', href: EXPLORE }
      ] } }
    ]);
  }

  ArkUI.pageModules.resolvers = {
    spec: spec,
    mount: function (host) {
      return ArkUI.page(spec(window.ArkRegistrySnapshot, window.ArkResolverApplications), host, { page: 'resolvers', className: 'resolvers-page', titleId: 'resolvers-title' });
    }
  };
})();
