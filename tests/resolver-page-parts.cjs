'use strict';
/* run-tests-timeout-ms: 900000 -- the unit half is instant; the page half boots the real site once per route. */
/* The content audit's five diagrams and the derived onward links (W4-S13, 2026-10-20;
   js/pages/resolver-page-parts.js). Run alone (owner test law); `node tests/resolver-page-parts.cjs
   /dao` checks one page, `node tests/resolver-page-parts.cjs units` only the unit half.

   Named regressions it holds:
   - docs/ux-audit/resolvers-content.md section 4 specified five diagrams (layers, launched versus
     served, deploy flow, upgrade supersedes, swap as one signed resolution); four were only a spec
     in a manifest and nothing drew them (ledger rows 4.1-4.5). Each is drawn from its manifest's
     meta.diagrams: change the data and the figure changes (a station added below shows up), and no
     label exists that the data does not hold. No raster image and no SVG.
   - The layers figure is the one place a picture could claim a capability that is not launched: its
     capability tiles are the registry snapshot's rows and nothing else, and without the snapshot it
     says what it needs instead of drawing an empty band.
   - chain, dao and the bundle deployer had no way in (ledger P3 /chain, 5.b, 5.c, A8). The onward
     links are derived from the journey table, not listed: a page added to a journey appears, a
     chapter of another page (how/ask, lifecycle/intent), Home and the page itself never do.
   - A resolution that starts at a page is found from that page (ArkResolutions.startingFrom), so
     /dao leads to /resolutions/governance without anyone listing it twice. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const checks = require('./lib/block-page-checks.cjs');

const ROOT = checks.ROOT;
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const arg = process.argv[2];

/* ---------------------------------------------------------------- units --------------------- */
function sandbox({ snapshot = true } = {}) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' });
  const w = dom.window;
  w.eval('window.ArkUI = { pageCatalog: {}, el: function (tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; },' +
    ' blocks: { render: function (spec) { var e = document.createElement("div"); e.setAttribute("data-ark-block", spec.block); e.setAttribute("data-props", JSON.stringify(spec.props)); return e; } } };');
  for (const file of ['js/content/manifest.js', 'js/content/manifests/resolver.js', 'js/content/manifests/deployment.js', 'js/content/manifests/dao.js', 'js/content/manifests/chain.js', 'js/content/site-pages.js']) w.eval(read(file));
  if (snapshot) w.eval(read('js/content/registry-snapshot.js'));
  w.eval('ArkSitePages.pages().forEach(function (r) { ArkUI.pageCatalog[r.key] = { path: r.path, journey: r.journey }; });');
  w.eval(read('js/ark/page-kit.js'));
  w.eval(read('js/pages/resolver-page-parts.js'));
  return w;
}
const strings = (value, out = []) => {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out));
  return out;
};
const texts = (node) => [...node.querySelectorAll('*')].filter((e) => e.children.length === 0).map((e) => e.textContent.trim()).filter(Boolean);

function units() {
  const w = sandbox();
  const fig = (m, d) => w.ArkUI.manifestFigure(m, d);
  const meta = (m, d) => JSON.parse(JSON.stringify(w.ArkManifest.get(m).meta.diagrams.find((x) => x.id === d)));
  /* the Ark blocks a figure holds: [{ block, props }], read from the stub renderer's data-props */
  const blocks = (f, name) => [...f.node.querySelectorAll('[data-ark-block]')].map((n) => ({ block: n.getAttribute('data-ark-block'), props: JSON.parse(n.getAttribute('data-props')) })).filter((x) => !name || x.block === name);
  const plain = (f) => [...f.node.querySelectorAll('*')].filter((e) => !e.closest('[data-ark-block]') && e.children.length === 0 && e.textContent.trim()).map((e) => e.textContent.trim());

  // 1. all five draw, from their manifest; built of Ark parts (no hand-built card, chip, eyebrow or step list), no raster, no SVG
  const five = [['resolver', 'resolver-layers'], ['resolver', 'launched-vs-served'], ['deployment', 'deploy-flow'], ['dao', 'upgrade-supersedes'], ['chain', 'swap-signed-resolution']];
  for (const [m, d] of five) {
    const f = fig(m, d);
    assert.equal(f.node.getAttribute('data-manifest-figure'), d);
    assert(!f.node.querySelector('img, svg, canvas, picture'), d + ': no raster image, no SVG, no canvas');
    assert(f.caption.startsWith(meta(m, d).caption), d + ': the caption opens with the manifest\'s own "' + meta(m, d).caption + '"');
    assert(f.description.length > 20 && f.slot === 'mfig-' + d, d + ': a long description in words, and a named slot');
    assert(blocks(f).length > 0, d + ': drawn from Ark blocks');
    const classes = [...f.node.querySelectorAll('[class]')].flatMap((n) => n.getAttribute('class').split(/\s+/));
    assert.deepEqual(classes.filter((c) => /card|tile|badge|pill|chip|label|step|stage|eyebrow|note/.test(c)), [], d + ': no hand-built card, tile, badge, label or step class (the component census)');
  }

  // 2. every label is the data's: strings of the manifest entry, or (the layers) of the dated snapshot / the figure's own source line
  const snapJson = JSON.parse(JSON.stringify(w.ArkRegistrySnapshot));
  for (const [m, d] of five) {
    const allowed = new Set(strings(meta(m, d)));
    const stray = [];
    const f = fig(m, d);
    const shown = (v) => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(shown) : v && typeof v === 'object' ? Object.entries(v).filter(([k]) => !['tone', 'mode', 'state', 'meaning'].includes(k)).flatMap(([, x]) => shown(x)) : []);
    for (const x of blocks(f)) for (const t of shown(x.props)) {
      if (allowed.has(t) || t === x.props.label) continue;
      // a derived label: parts joined by the figure's own separators out of manifest strings, snapshot values or numbers
      const pieces = t.split(/ \u00b7 | or | \+ |: |, | /).filter(Boolean);
      const known = (piece) => allowed.has(piece) || /^\d+$|^[0-9a-f]{8}$/.test(piece) || /^(source|hash|badge|vectors|none|\u2014)$/.test(piece) || strings(snapJson).includes(piece) || [...allowed].some((a) => a.includes(piece));
      if (!pieces.every(known)) stray.push(t);
    }
    for (const t of plain(f)) if (!allowed.has(t) && !/^Listed in the dated registry snapshot|^Not shown: the dated/.test(t)) stray.push(t);
    assert.deepEqual(stray, [], d + ': every label on the figure is a string of its manifest entry');
  }

  // 3. the deploy flow shows what the spec names: six stations in order, the fork on control, the proof badge, both refusals by their exact names
  const flow = fig('deployment', 'deploy-flow'), steps = blocks(flow, 'steps')[0].props.items;
  assert.deepEqual(steps.map((x) => x.title), meta('deployment', 'deploy-flow').stations, 'the stations, in order');
  assert.equal(steps.find((x) => x.title === 'control').body, 'immutable or one control key', 'the fork sits at control');
  assert.equal(steps.find((x) => x.title === 'serve').body, 'badge: proof', 'serve carries the proof badge');
  const refusals = blocks(flow, 'facts')[0].props.items;
  assert.deepEqual(refusals.map((x) => x.value), ['grammar does not compile', 'CapabilityNotLaunched'], 'both refusals are named exactly');
  assert(refusals[0].term.includes('grammar') && refusals[0].term.includes('before signing') && refusals[1].term.includes('at the node') && refusals.every((x) => x.mono), 'each says where it happens');
  assert(flow.description.includes('before signing') && flow.description.includes('at the node'), 'the description says where each refusal happens');

  // 4. data-driven: a station added to the manifest is on the figure
  w.ArkManifest.get('deployment').meta.diagrams[0].stations.push('watch');
  assert.equal(blocks(fig('deployment', 'deploy-flow'), 'steps')[0].props.items.length, 7, 'change the manifest and the figure changes');
  w.ArkManifest.get('deployment').meta.diagrams[0].stations.pop();

  // 5. the layers: three bands, base at the bottom; capability cards are the snapshot's rows and nothing else
  const layers = fig('resolver', 'resolver-layers');
  assert.deepEqual([...layers.node.querySelectorAll('.ark-band')].map((x) => x.dataset.band), ['resolvers', 'capabilities', 'base'], 'resolver chains on top, the base chain at the bottom');
  const caps = layers.node.querySelector('[data-band="capabilities"] [data-ark-block="card-grid"]');
  const capItems = JSON.parse(caps.getAttribute('data-props')).items;
  assert.deepEqual(capItems.map((c) => c.title), snapJson.capabilities.map((c) => c.id), 'the capability cards are the snapshot\'s rows, no more, no fewer');
  assert.deepEqual(capItems.map((c) => c.status.label), snapJson.capabilities.map((c) => c.vectors + ' vectors'), 'each shows its count of vectors in an Ark status chip');
  assert(capItems.every((c, i) => c.description.endsWith(snapJson.capabilities[i].sourceHash.slice(0, 8))), 'and a stub of its source hash');
  const chains = JSON.parse(layers.node.querySelector('[data-band="resolvers"] [data-ark-block="card-grid"]').getAttribute('data-props')).items;
  assert(chains.find((c) => c.title === 'dao').description.includes(snapJson.resolvers.find((r) => r.chainId === 'dao').composes.join(' + ')), 'dao shows what it composes, from the snapshot');
  assert.equal(chains[chains.length - 1].title, 'your-resolver', 'and the reader\'s own resolver closes the row');
  assert.deepEqual([...layers.node.querySelectorAll('[data-band="base"] .ark-band__mark')].map((x) => x.textContent), meta('resolver', 'resolver-layers').bands[0].marks, 'the base chain\'s four kinds of record');
  assert(layers.node.querySelector('.mfig-source').textContent.includes(snapJson.source.commitDate), 'the figure says it is a dated read of the source, with the date');
  assert(!/\u2713|verified|launched on/i.test(layers.node.textContent), 'the layers never draw a tick or claim a capability is launched: the snapshot holds a count of vectors, not a pass');
  const bare = sandbox({ snapshot: false }).ArkUI.manifestFigure('resolver', 'resolver-layers').node;
  assert.equal(bare.querySelectorAll('[data-band="capabilities"] [data-ark-block="card-grid"]').length, 0, 'without the snapshot no capability is drawn');
  assert(bare.querySelector('.mfig-source[data-absent]') && /did not load/.test(bare.querySelector('.mfig-source').textContent), 'and the figure says what it needs, not an empty band');

  // 6. launched versus served; the upgrade keeps the old declaration on the line
  const states = fig('resolver', 'launched-vs-served').node;
  assert.equal(states.querySelector('[data-state="launched"] .ark-lane').dataset.outline, 'dashed');
  assert(!states.querySelector('[data-state="launched"] .ark-lane__provider') && states.querySelector('[data-state="served"] .ark-lane__provider'), 'only the served chain has a provider');
  assert.deepEqual(JSON.parse(states.querySelector('[data-state="served"] [data-ark-block="card"]').getAttribute('data-props')).status, { label: 'proof', tone: 'trust' }, 'the proof is an Ark status chip');
  assert(!JSON.parse(states.querySelector('[data-state="launched"] [data-ark-block="card"]').getAttribute('data-props')).status, 'a launched chain has no proof');
  const up = fig('dao', 'upgrade-supersedes').node;
  const key = up.querySelector('[data-control="key"]'), lock = up.querySelector('[data-control="immutable"]');
  const keySteps = JSON.parse(key.querySelector('[data-ark-block="steps"]').getAttribute('data-props'));
  assert.equal(keySteps.mode, 'progress'); assert.deepEqual(keySteps.items.map((x) => x.state), ['done', 'done', 'current'], 'an upgrade adds a head; the old declarations stay on the line');
  assert.equal(JSON.parse(key.querySelector('[data-ark-block="eyebrow"]').getAttribute('data-props')).text, 'key');
  assert.equal(lock.querySelectorAll('[data-ark-block="steps"]').length, 0); assert.equal(JSON.parse(lock.querySelector('[data-ark-block="facts"]').getAttribute('data-props')).items.length, 1, 'an immutable launch has one declaration and no upgrade');
  assert.equal(JSON.parse(lock.querySelector('[data-ark-block="eyebrow"]').getAttribute('data-props')).text, 'lock');
  const swap = fig('chain', 'swap-signed-resolution');
  assert.deepEqual(blocks(swap, 'steps')[0].props.items.map((x) => x.title), meta('chain', 'swap-signed-resolution').flow, 'the swap flow');
  assert.deepEqual(blocks(swap, 'facts')[0].props.items[0], { term: 'A second node', value: 'resolved by <signer>', mono: true }, 'the second node\'s refusal tag');

  // 7. figureBlock: the story template's fold around Ark's figure, or the bare figure inside an opened row
  const folded = w.ArkUI.resolverPageParts.figureBlock('dao', 'upgrade-supersedes', { id: 'x', lead: 'copy:DAO.DECK' });
  assert.equal(folded.spec.block, 'disclosure'); assert.equal(folded.spec.props.foldBelow, 'tablet');
  assert.equal(folded.spec.props.blocks[0].block, 'figure'); assert.equal(folded.spec.props.blocks[0].props.slot, folded.slot); assert.equal(folded.spec.props.content, 'copy:DAO.DECK');
  assert.equal(w.ArkUI.resolverPageParts.figureBlock('dao', 'upgrade-supersedes', { fold: false }).spec.block, 'figure');
  assert.throws(() => fig('dao', 'nope'), /has no diagram "nope"[\s\S]*Needs:[\s\S]*Remedy:/, 'a refusal names the failure, what it needs and the remedy');

  // 8. onward links: derived from the journey table
  const parts = { onwardGroups: w.ArkUI.journeyPages, onwardBlocks: w.ArkUI.journeyPageBlocks }, keys = (groups) => groups.map((g) => g.links.map((l) => l.key));
  const understand = parts.onwardGroups('dao', { exclude: ['concept'] });
  assert.equal(understand.length, 1); assert.equal(understand[0].journey, 'understand');
  const got = understand[0].links.map((l) => l.key);
  for (const want of ['chain', 'deployment', 'about']) assert(got.includes(want), 'dao leads to ' + want + ' (same journey): ' + got.join(', '));
  for (const never of ['dao', 'zero', 'concept', 'how/ask', 'lifecycle/intent', 'stats']) assert(!got.includes(never), 'dao never lists ' + never);
  assert(understand[0].links.every((l) => l.href === 'route:' + l.key), 'the links are route: links');
  const both = parts.onwardGroups('deployment', { journeys: ['understand', 'build'], exclude: ['lifecycle', 'resolver', 'resolvers'] });
  assert(keys(both).flat().includes('chain') && keys(both).flat().includes('dao') && keys(both).flat().includes('bundledeployer'), 'Deploy a resolver leads to chain, dao and the bundle deployer');
  assert(!keys(both).flat().some((k) => ['lifecycle', 'resolver', 'resolvers', 'account/domains', 'how/work'].includes(k)), 'but not to what it already links, nor to a chapter of another page');
  // derive, don't author: a new page in the journey table is a new link, with no list to edit
  w.eval("ArkUI.pageCatalog.fresh = { path: '/fresh-page', journey: 'understand' };");
  const rows = w.ArkSitePages.pages;
  w.ArkSitePages.pages = () => rows().concat([{ key: 'fresh', path: '/fresh-page', label: 'A fresh page', journey: 'understand' }]);
  assert(parts.onwardGroups('dao').flatMap((g) => g.links.map((l) => l.label)).includes('A fresh page'), 'a page added to the journey table appears on every page that asks');
  const onward = parts.onwardBlocks('dao');
  assert.equal(onward[0].block, 'eyebrow'); assert.equal(onward[1].block, 'actions'); assert.equal(onward[0].props.text, 'More in Understand');

  // 9. resolutions that start at a page
  const rctx = new JSDOM('', { runScripts: 'outside-only' }).window; rctx.eval("window.ArkCopy = { text: function (k) { return k; } };"); rctx.eval(read('js/content/resolutions.js'));
  const from = (page) => Array.from(rctx.ArkResolutions.startingFrom(page)).map((r) => r.slug).sort();
  assert.deepEqual(from('dao'), ['governance'], '/dao begins the governance resolution');
  assert.deepEqual(from('bundledeployer'), ['deployments', 'website'], 'the bundle deployer begins website and deployments');
  assert.deepEqual(from('resolver-math'), ['algorithms', 'rules'], 'and `also` counts');
  assert.deepEqual(from('resolvers'), ['algorithms'], '`alsoMore` counts: /resolvers is where algorithms lead on');
  assert.deepEqual(from('nowhere'), []);
}

/* -------------------------------------------------------------- source ---------------------- */
function sources() {
  const catalog = read('js/pages/catalog.js');
  for (const line of catalog.split('\n').filter((l) => /^\s*(resolver|deployment|dao):/.test(l))) assert(line.includes('js/pages/resolver-page-parts.js'), 'the route loads the parts: ' + line.trim().slice(0, 40));
  assert(/resolver: \{[^\n]*registry-snapshot\.js[^\n]*resolver-page-parts\.js/.test(catalog), '/what-is-a-resolver also loads the snapshot its layers are drawn from, before the parts');
  assert(!/resolver-page-parts/.test(catalog.split('\n').filter((l) => /^\s*(stats|zero|bundledeployer|explorer):/.test(l)).join('\n')), 'and no other route pays for them');
  assert(/figureBlock\('resolver', 'resolver-layers'/.test(read('js/pages/resolver-guide.js')) && /figureBlock\('resolver', 'launched-vs-served'/.test(read('js/pages/resolver-guide.js')), '/what-is-a-resolver draws both of its diagrams');
  for (const file of ['js/pages/deployment.js', 'js/pages/dao.js']) { assert(/ArkUI\.journeyPageBlocks/.test(read(file)), file + ' takes its onward links from page-kit.js'); }
  assert(!/onwardGroups|onwardBlocks/.test(read('js/pages/resolver-page-parts.js').replace(/\/\*[\s\S]*?\*\//g, '')), 'and the parts file keeps no second copy of the journey helper');
  assert(/deployment: \{[^\n]*page-kit\.js[^\n]*resolver-page-parts\.js/.test(catalog), '/how-deployment-works loads page-kit.js before the parts');
  assert(/figureBlock\('deployment', 'deploy-flow'/.test(read('js/pages/deployment.js')), '/how-deployment-works draws the deploy flow');
  assert(/figureBlock\('dao',\s*'upgrade-supersedes'/.test(read('js/pages/dao.js')), '/dao draws the upgrade figure');
  /* W5-PAGES (ledger 4.5): the swap as signed resolution stands in the Swaps tab of /chain, behind a disclosure, drawn by the parts */
  assert(/chain: \{[^\n]*home-flow\.js[^\n]*resolver-page-parts\.js[^\n]*chain\.js/.test(catalog), '/chain loads the parts after the scene and before its module');
  assert(/figureBlock\('chain',\s*'swap-signed-resolution',\s*\{[^}]*foldBelow: 'always'/.test(read('js/pages/chain.js')), '/chain draws the swap figure behind an always-closed disclosure');
  assert(!/swapDiagram|diagram:/.test(read('js/pages/home-flow.js')), 'and the scene keeps no second copy of the swap diagram');
  assert(!/<svg|createElementNS/.test(read('js/pages/resolver-page-parts.js').replace(/\/\*[\s\S]*?\*\//g, '')), 'the parts draw no SVG');
}

/* -------------------------------------------------------------- pages ----------------------- */
const PAGES = {
  '/what-is-a-resolver': { figures: ['resolver-layers', 'launched-vs-served'] },
  '/how-deployment-works': { figures: ['deploy-flow'], links: ['/chain', '/dao', '/bundle-deployer'] },
  '/dao': { figures: ['upgrade-supersedes'], links: ['/resolutions/governance', '/how-deployment-works', '/chain'] },
  '/chain': { figures: ['swap-signed-resolution'], links: ['/resolvers', '/what-is-a-resolver'] }
};
async function pages() {
  for (const [route, want] of Object.entries(PAGES)) {
    if (arg && arg !== route && arg !== 'all') continue;
    const seen = await checks.visit(route, (window, page) => {
      const d = window.document;
      const figures = want.figures.map((id) => {
        const node = d.querySelector('[data-manifest-figure="' + id + '"]');
        const frame = node && node.closest('figure');
        return { id, there: !!node, framed: !!frame && !!frame.querySelector('figcaption'), caption: frame && frame.querySelector('figcaption') ? frame.querySelector('figcaption').textContent : '',
          folded: !!(node && node.closest('[data-ark-block="disclosure"]')) || !!(node && node.closest('[data-ark-part="accordion-content"]')) };
      });
      const hrefs = [...page.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
      return { figures, hrefs, svg: page.querySelectorAll('[data-manifest-figure] svg, [data-manifest-figure] img').length };
    });
    assert.deepEqual(seen.refused, [], route + ': no block refused');
    for (const f of seen.figures) {
      assert(f.there, route + ': the ' + f.id + ' figure is on the page');
      assert(f.framed && /^Illustration · relationships, not live state/.test(f.caption), route + ': ' + f.id + ' sits in Ark\'s figure frame, captioned "Illustration · relationships, not live state"');
      assert(f.folded, route + ': ' + f.id + ' is behind a disclosure or an opened row (a press away), never in the way of the fold');
    }
    assert.equal(seen.svg, 0, route + ': no SVG or raster image in a manifest figure');
    for (const href of want.links || []) assert(seen.hrefs.some((h) => h === href || h.endsWith(href)), route + ' leads to ' + href + ' (hrefs: ' + seen.hrefs.filter((h) => h.startsWith('/')).slice(0, 40).join(' ') + ')');
    console.log('ok ' + route);
  }
}

(async () => {
  if (!arg || arg === 'units' || arg === 'all') { units(); sources(); console.log('ok units'); }
  if (arg !== 'units') await pages();
  console.log('PASS: the content audit\'s five diagrams are drawn from their manifests (no label the data does not hold, no raster, no SVG), and the onward links are derived from the journey table.');
})().catch((e) => { console.error(e); process.exit(1); });
