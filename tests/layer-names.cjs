'use strict';
/* The Layers panel's row names (ArkLayout.layerName, js/content/layout.js; used by cmsRealTree in
   js/main.js). Until 2026-10-19 every unrenamed row showed its bare tag, so the home page's tree
   read "div, div, div, div, canvas, canvas, section, section, div, p, svg, h1, span ..." and the
   only way to find the hero heading was to click rows until the canvas outlined it.

   A name is DERIVED from what the element is (its group / block / state, its accessible name, a
   landmark, the heading it owns, its own words, an id/class hint, then the tag) -- never from a
   list of words. Each case below is a structure the derivation must read, with the reason it is
   here. Runs the real layout.js and the real cmsRealTree walk (extracted from js/main.js) in jsdom
   against real markup. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const LAYOUT = fs.readFileSync('js/content/layout.js', 'utf8');
const MAIN = fs.readFileSync('js/main.js', 'utf8');
const start = MAIN.indexOf('  function cmsFrameFor(route, key, element) {');
const end = MAIN.indexOf('  function cmsElementForKey(key) {');
assert(start >= 0 && end > start, 'js/main.js still defines cmsFrameFor .. cmsRealTree before cmsElementForKey');
const WALK = MAIN.slice(start, end);

function page(html, drafts = {}) {
  const dom = new JSDOM('<!doctype html><body><div id="host">' + html + '</div></body>', { url: 'https://defxn.test/', runScripts: 'outside-only' });
  const w = dom.window;
  w.eval(LAYOUT);
  w.cmsLayoutDraft = drafts.layout || { version: 2, routes: {}, groups: {}, labels: {} };
  w.cmsComponentsDraft = drafts.components || { version: 1, masters: {}, routes: {} };
  w.cmsStatesDraft = drafts.states || { version: 1, routes: {} };
  w.cmsRoutePath = () => '/';
  w.eval(WALK + '\nwindow.cmsRealTree = cmsRealTree;');
  const host = w.document.getElementById('host');
  const tree = w.cmsRealTree(host, '/');
  const flat = []; (function walk(rows) { for (const r of rows) { flat.push(r); walk(r.children); } })(tree);
  /* the row for the element `selector` picks */
  const row = (selector) => {
    const el = host.querySelector(selector); assert(el, 'fixture has ' + selector);
    const key = el.getAttribute('data-ark-layout-key'); assert(key, selector + ' was annotated');
    const r = flat.find((x) => x.key === key); assert(r, 'a Layers row for ' + selector);
    return r;
  };
  return { w, host, tree, flat, row };
}

// 1. A heading, a paragraph, a link and a button are named by their own words, truncated.
//    Why: these are what a person looks for in the tree; the tag alone told them nothing.
{
  const { row } = page('<main data-ark-page="home"><h1>Not one chain. A world of them.</h1><p>Your own history. A network of possibilities. DEFXN connects independent identity chains.</p><a href="#/x">Follow the line</a><button type="button">Open menu</button></main>');
  assert.equal(row('h1').label, 'Not one chain. A world of them.');
  assert.equal(row('h1').from, 'text');
  assert.equal(row('h1').tag, 'h1', 'the tag still travels with the row (shown small beside the name)');
  const p = row('p').label;
  assert(p.length <= 40 && p.endsWith('…') && p.startsWith('Your own history.'), 'a long paragraph is truncated with an ellipsis: ' + p);
  assert.equal(row('a').label, 'Follow the line');
  assert.equal(row('button').label, 'Open menu');
  console.log('PASS: text elements are named by their own words, truncated.');
}

// 1b. Words in separate elements stay separate words.
//     Why: textContent glues "<h1>Not one chain.<br>A world</h1>" into "chain.A world" and a list
//     of items into "OneTwo"; an element boundary is a word boundary.
{
  const { row } = page('<h1>Not one chain.<br>A world</h1><ul class="chips"><li>One</li><li>Two</li></ul>');
  assert.equal(row('h1').label, 'Not one chain. A world');
  assert.equal(row('ul').label, 'One Two', 'a list of leaf items is named by its items\' words');
  console.log('PASS: an element boundary is a word boundary.');
}

// 2. A link whose words sit in child spans (each a layer of its own) is still named by its words.
//    Why: the header's links are <a><span icon/><span>Overview</span></a>; "own text node" alone
//    missed them and they fell through to a class hint. Every layer under it being a leaf is the
//    structural signal that its words are its name.
{
  const { row } = page('<header class="site-header"><nav class="header-core-links"><a href="#/o" class="nav-link"><span class="ic"></span><span>Overview</span></a></nav></header>');
  assert.equal(row('a').label, 'Overview');
  console.log('PASS: a link of spans is named by its words.');
}

// 3. Images and other media are named by their accessible name: alt, aria-label, an SVG <title>.
//    Why: an image has no words of its own; the alt text is the name a screen reader uses.
{
  const { row } = page('<div><img src="a.png" alt="The mesh at night"><canvas aria-label="Lattice background"></canvas><svg viewBox="0 0 4 4"><title>Chain diagram</title><path d="M0 0h4"></path></svg><img src="b.png" alt=""></div>');
  assert.equal(row('img').label, 'The mesh at night');
  assert.equal(row('img').from, 'aria');
  assert.equal(row('canvas').label, 'Lattice background');
  assert.equal(row('svg').label, 'Chain diagram');
  /* aria-labelledby reads its targets' words with element boundaries as spaces (the home hero's
     section read "Not one chain.A worldof them." through textContent) */
  const lb = page('<section aria-labelledby="t"><h1 id="t"><span>Not one chain.</span><span>A world</span></h1></section>');
  assert.equal(lb.row('section').label, 'Not one chain. A world');
  /* alt="" says "decorative": no name from it -- the tag, not an empty row */
  assert.equal(row('img[alt=""]').label, 'img');
  console.log('PASS: media are named by alt / aria-label / <title>; decorative alt="" falls back.');
}

// 4. A section is named by the first heading it OWNS (HTML's rule: a heading titles its nearest
//    sectioning ancestor), not by a heading inside a nested section; a plain container by a
//    heading that is its direct child.
//    Why: the first heading anywhere inside named every wrapper on the page after the page's h1.
{
  const { row } = page('<section class="outer"><div class="inner"><section class="nested"><h2>Nested title</h2></section><h2>Outer title</h2></div></section><div class="card"><h3>Card title</h3><p>Body</p></div><div class="wrap"><div><h3>Deep</h3></div></div>');
  assert.equal(row('section.outer').label, 'Outer title', 'the nested section\'s heading does not title the outer one');
  assert.equal(row('section.outer').from, 'heading');
  assert.equal(row('section.nested').label, 'Nested title');
  assert.equal(row('div.card').label, 'Card title', 'a container is named by its direct child heading');
  assert.equal(row('div.wrap').label, 'Wrap', 'a heading two levels down does not name a plain container: its hint does');
  console.log('PASS: sections are named by the heading they own; containers by a child heading.');
}

// 5. Landmarks name themselves, with a class hint to tell two of a kind apart.
{
  const { row } = page('<header class="site-header"><nav class="header-core-links"><a href="#/a">A</a></nav><nav aria-label="Account"><a href="#/b">B</a></nav></header><footer class="site-footer"><p>© FLX</p></footer><div role="dialog" class="settings-panel"><p>x</p></div>');
  assert.equal(row('header').label, 'Header · site header');
  assert.equal(row('nav.header-core-links').label, 'Nav · header core links');
  assert.equal(row('nav[aria-label]').label, 'Account', 'an aria-label is the landmark\'s own name');
  assert.equal(row('footer').label, 'Footer · site footer');
  assert.equal(row('[role="dialog"]').label, 'Dialog · settings panel');
  assert.equal(row('[role="dialog"]').from, 'role');
  console.log('PASS: landmarks and roles name themselves, told apart by their class.');
}

// 6. An unnamed container falls back to an id/class hint, skipping atom classes the runtime minted
//    (ArkAtomizer: they name a declaration, not a thing), and to its tag last.
{
  const { w, row } = page('<div class="k1f3a9c hero-copy"><span class="dot"></span></div><div id="hl-wrap"><i></i></div><div class="k77aa01"></div><div class="" data-bare></div><ol><li><button><span>01</span><span>Sign</span></button></li></ol>');
  /* an item with no hint and no own words is named by the words it holds: "li" said nothing */
  assert.equal(row('li').label, '01 Sign');
  assert.equal(row('.hero-copy').label, 'Hero copy');
  assert.equal(row('.hero-copy').from, 'hint');
  assert.equal(row('#hl-wrap').label, 'Hl wrap', 'an id is a hint too');
  /* with an atomizer that minted k77aa01, that class is no hint */
  w.ArkAtomizer = { declaration: (c) => (c === 'k77aa01' || c === 'k1f3a9c' ? 'color:red' : '') };
  const tree = w.cmsRealTree(w.document.getElementById('host'), '/');
  const flat = []; (function walk(rows) { for (const r of rows) { flat.push(r); walk(r.children); } })(tree);
  const atomOnly = flat.find((r) => r.key === w.document.querySelector('.k77aa01').getAttribute('data-ark-layout-key'));
  assert.equal(atomOnly.label, 'div', 'an atom class is not a hint: the tag is the honest fallback');
  const bare = flat.find((r) => r.key === w.document.querySelector('[data-bare]').getAttribute('data-ark-layout-key'));
  assert.equal(bare.label, 'div');
  assert.equal(bare.from, 'tag');
  console.log('PASS: the hint skips atom classes; the tag is the last resort.');
}

// 7. Identity from the drafts: a group's name, a component instance's block label, a state's label.
{
  const html = '<div data-ark-layout-group="g1"><p>One</p><p>Two</p></div>'
    + '<div data-ark-component-key="i1" data-ark-component-anchor="a1" data-ark-component-master="m1"><p>Inside</p></div>'
    + '<div data-ark-state-anchor="" data-ark-state-group="s1" data-ark-state-index="1"><p>Shown</p></div>';
  const { host, flat } = page(html, {
    layout: { version: 2, routes: {}, groups: { '/': { g1: { members: ['x', 'y'], label: 'Hero links' } } }, labels: {} },
    components: { version: 1, masters: { m1: { resolver: 'RBLOCK_CARD_V1', props: {}, label: 'Pricing card' } }, routes: {} },
    states: { version: 1, routes: { '/': { s1: { trigger: 'self', current: 0, states: [{ label: 'Default', members: ['x'] }, { label: 'Expanded', members: [] }] } } } },
  });
  const byEl = (sel) => flat.find((r) => r.key === host.querySelector(sel).getAttribute('data-ark-layout-key'));
  assert.equal(byEl('[data-ark-layout-group]').label, 'Hero links');
  assert.equal(byEl('[data-ark-layout-group]').from, 'group');
  assert.equal(byEl('[data-ark-component-master]').label, 'Pricing card');
  assert.equal(byEl('[data-ark-state-index]').label, 'Expanded');
  console.log('PASS: groups, component instances and states are named from the drafts.');
}

// 8. A stored name (Rename) wins over every derived one, and says so.
{
  const probe = page('<h1>Derived words</h1>');
  const key = probe.host.querySelector('h1').getAttribute('data-ark-layout-key');
  const { row } = page('<h1>Derived words</h1>', { layout: { version: 2, routes: {}, groups: {}, labels: { '/': { [key]: 'Hero heading' } } } });
  assert.equal(row('h1').label, 'Hero heading');
  assert.equal(row('h1').named, true);
  assert.equal(row('h1').from, 'label');
  assert.equal(probe.row('h1').named, false);
  console.log('PASS: a stored name overrides the derived one.');
}

// 9. The row tree is still a plain, cloneable value (it crosses postMessage to the editor): no
//    element reference, no function.
{
  const { tree } = page('<section><h2>T</h2><p>x</p></section>');
  const json = JSON.stringify(tree);
  assert.deepEqual(JSON.parse(json), JSON.parse(JSON.stringify(tree)));
  assert(!/\[object /.test(json));
  console.log('PASS: the named tree stays a plain value.');
}
