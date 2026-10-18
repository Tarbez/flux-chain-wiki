'use strict';
/* "Make into component" -- a component made from a real selection -- and the starter content
   of a new state, both through js/content/components.js against real markup in jsdom, the real
   atomizer/runtime/ArkLayout and the real RBLOCK_CAPTURED_V1 resolver.

   Why this exists:
   1. The Library could only create typed blocks from a form; there was no way to turn
      something already on the page into a reusable component. A capture has to keep the
      selection's real structure and look (its atom classes are re-minted from their
      declarations, since an atom's rule only exists on a page that atomized it), derive its
      editable props from its own text nodes and images (not a hand-written list), and an
      instance has to stand in for the original selection -- hiding it, not destroying it, so
      removing the instance brings it back. Editing the definition must reach every instance;
      an override must stay on one; Detach must freeze one.
   2. A new state's starter was a fixed big Text heading: in a nav bar it looked like a page
      title dropped into the menu. It is now derived from state 0's own markup -- for a nav of
      links, ONE link (icon and all) carrying the state's label, with the original's href and
      router hook stripped so it opens nothing nobody chose. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
/* values made inside the jsdom realm, compared structurally from this one */
const plain = (x) => JSON.parse(JSON.stringify(x));

function boot(html) {
  const dom = new JSDOM('<!doctype html><html><head></head><body>' + html + '</body></html>');
  const w = dom.window;
  w.ArkCopy = { isKey: () => false, resolve: (v) => v };
  w.matchMedia = () => ({ matches: false });
  const context = vm.createContext(w);
  for (const file of ['js/ark/atomizer.js', 'js/ark/flux.js', 'js/ark/runtime.js', 'js/ark/dash-kit.js', 'js/content/layout.js', 'js/content/components.js', 'js/resolvers/blocks/rblock-text-v1.js', 'js/resolvers/blocks/rblock-captured-v1.js']) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  }
  /* page markup styled the way the site styles it: atom classes minted by the atomizer */
  const atom = (styles) => vm.runInContext('ArkUI.atomize(' + JSON.stringify(styles) + ')', context);
  return { w, doc: w.document, C: vm.runInContext('ArkComponents', context), L: vm.runInContext('ArkLayout', context), atom };
}

/* ---- 1. capture: structure, look, derived props, what never travels */
{
  const { doc, C, atom } = boot('<main id="host"><section class="intro"><h2 id="title"></h2><p></p><div data-ark-insert="main"></div></section></main>');
  const h2 = doc.querySelector('h2'), p = doc.querySelector('p');
  h2.className = atom({ fontSize: '32px', color: 'hsl(var(--text-strong))' }) + ' intro-title';
  h2.setAttribute('data-ark-layout-key', 'k-h2'); h2.setAttribute('onclick', 'alert(1)');
  h2.textContent = 'Run a node';
  p.setAttribute('data-ark-layout-key', 'k-p');
  p.innerHTML = 'Start <a href="/download" data-scene-link="download">here</a> today. <img src="assets/node.png" alt="A node"> <a href="javascript:alert(1)">bad</a>';
  const captured = C.capture([h2, p]);
  assert(captured, 'a heading + paragraph selection captures');
  assert.deepEqual(plain(C.propsOf({ resolver: C.CAPTURED, tree: captured.tree })), ['heading', 'paragraph', 'link', 'paragraph2', 'image', 'imageAlt', 'link2'],
    'props are derived from the selection\'s own text nodes and image, named by the element holding each one');
  assert.equal(captured.props.heading, 'Run a node');
  assert.equal(captured.props.link, 'here');
  assert.equal(captured.props.image, 'assets/node.png');
  assert.equal(captured.props.imageAlt, 'A node');
  const [h2Node, pNode] = captured.tree;
  assert.equal(h2Node.t, 'h2');
  assert.equal(h2Node.c, 'intro-title', 'a plain stylesheet class travels as a class');
  assert.deepEqual(plain(h2Node.s), ['font-size:32px;color:hsl(var(--text-strong))'], 'an atom class travels as its declarations, so any page can re-mint it');
  assert(!h2Node.a, 'id (would collide with the original), on* handlers and data-ark-* bookkeeping never travel: ' + JSON.stringify(h2Node.a));
  const link = pNode.k.find((n) => n.t === 'a');
  assert.deepEqual(plain(link.a), { href: '/download', 'data-scene-link': 'download' }, 'markup and the router\'s own delegated hook travel, so a captured link still navigates');
  const bad = pNode.k.filter((n) => n.t === 'a')[1];
  assert(!bad.a || !bad.a.href, 'a javascript: URL is dropped');
  assert.equal(C.capture([doc.createElement('script')]), null, 'nothing rebuildable, nothing captured');
  console.log('PASS: capture keeps structure and look, derives props from text/images, drops what must not travel.');
}

/* ---- 2. make into component: the instance stands in for the selection; definition, override, detach, remove */
{
  const { w, doc, C, atom } = boot('<main id="host"><section class="intro"><h2>Run a node</h2><p>Start here.</p><aside>after</aside></section><div data-ark-insert="main"></div></main>');
  const host = doc.getElementById('host'), h2 = doc.querySelector('h2'), p = doc.querySelector('p');
  const cls = atom({ fontSize: '32px' }); h2.className = cls;
  w.ArkLayout.annotate(host);
  const keys = [h2, p].map((el) => el.getAttribute('data-ark-layout-key'));
  const captured = C.capture([h2, p]);
  let v = C.createMaster({}, 'm1', C.CAPTURED, captured.props, 'Run a node + 1 more', captured.tree);
  v = C.placeInstance(v, '/', 'spot-a', keys[1], keys, 'i1', 'm1');
  assert.deepEqual(plain(v.spots['/']['spot-a']), { after: keys[1], replaces: keys }, 'the spot records where it stands and what it stands in for');
  v = C.insertInstance(v, '/', 'main', 'i2', 'm1');          /* a second instance elsewhere */
  C.renderAll(host, '/', v);
  const spot = doc.querySelector('[data-ark-spot]');
  assert(spot && spot.previousElementSibling === p, 'the spot is placed right after the last selected element');
  assert.equal(spot.style.display, 'contents', 'and lays out transparently, so the copy sits in the original flow');
  assert.equal(h2.getAttribute('data-ark-component-replaced'), 'spot-a', 'the originals are hidden, not removed');
  assert.equal(p.getAttribute('data-ark-component-replaced'), 'spot-a');
  assert(doc.querySelector('style[data-ark-components]').textContent.includes('[data-ark-component-replaced]{display:none!important}'), 'by an attribute rule that ArkLayout\'s inline-style reset cannot undo');
  const copies = () => [...doc.querySelectorAll('[data-ark-component-key]')].map((el) => [...el.children].map((c) => c.textContent.trim()).join(' '));
  assert.deepEqual(plain(copies()), ['Run a node Start here.', 'Run a node Start here.'], 'both instances render the captured content');
  const rebuiltH2 = spot.querySelector('h2');
  assert.equal(rebuiltH2.className, cls, 'the atom class is re-minted byte-identical, so it looks the same');
  assert.equal(spot.querySelector('[data-ark-component-key]').getAttribute('data-ark-component-master'), 'm1');

  v = C.updateMaster(v, 'm1', { props: Object.assign({}, v.masters.m1.props, { heading: 'Operate a node' }) });
  C.renderAll(host, '/', v);
  assert.deepEqual(plain(copies()), ['Operate a node Start here.', 'Operate a node Start here.'], 'editing the definition updates every instance');
  v = C.setOverride(v, '/', 'main', 'i2', 'heading', 'Just this one');
  C.renderAll(host, '/', v);
  assert.deepEqual(plain(copies()), ['Operate a node Start here.', 'Just this one Start here.'], 'an override stays on its own instance');
  v = C.detachInstance(v, '/', 'main', 'i2', 'm2');
  assert.equal(v.masters.m2.detached, true, 'detach makes a private, flagged copy');
  assert.equal(v.masters.m2.props.heading, 'Just this one', 'carrying what the instance showed (definition + its overrides)');
  assert.deepEqual(plain(v.routes['/'].main[0]), { key: 'i2', masterId: 'm2', overrides: {} });
  v = C.updateMaster(v, 'm1', { props: Object.assign({}, v.masters.m1.props, { heading: 'Third edit' }) });
  C.renderAll(host, '/', v);
  assert.deepEqual(plain(copies()), ['Third edit Start here.', 'Just this one Start here.'], 'a detached instance no longer follows the definition');

  v = C.removeInstance(v, '/', 'spot-a', 'i1');
  assert(!(v.spots && v.spots['/']), 'a spot with nothing left in it is dropped');
  C.renderAll(host, '/', v);
  assert(!doc.querySelector('[data-ark-spot]'), 'its anchor is taken back out of the page');
  assert(!h2.hasAttribute('data-ark-component-replaced') && !p.hasAttribute('data-ark-component-replaced'), 'removing the instance that replaced the selection brings the originals back');
  v = C.removeInstance(v, '/', 'main', 'i2');
  assert(!v.masters.m2, 'a detached copy nothing points at any more is dropped');
  assert(v.masters.m1, 'the shared definition stays in the Library');

  /* the round trip a Save makes */
  const saved = C.sanitize(JSON.parse(JSON.stringify(C.placeInstance(C.createMaster({}, 'm1', C.CAPTURED, captured.props, 'x', captured.tree), '/', 'spot-a', keys[1], keys, 'i1', 'm1'))));
  assert.equal(C.serialize(saved), C.serialize(C.sanitize(saved)), 'serialize() is stable for a captured component');
  console.log('PASS: an instance replaces the selection; definition edits reach every instance, overrides one, detach freezes one; removal restores the originals.');
}

/* ---- 3. a new state's starter is derived from state 0 */
{
  const { doc, C, atom } = boot('<header><nav class="header-core-links"></nav><h2>Big title</h2><figure><img src="x.png" alt=""></figure></header>');
  const nav = doc.querySelector('nav'), linkCls = atom({ fontSize: '12px', letterSpacing: '.04em' });
  ['Overview', 'How it works', 'Stats'].forEach((text, i) => {
    const a = doc.createElement('a'); a.href = '/p' + i; a.setAttribute('data-scene-link', 'p' + i); a.setAttribute('aria-current', i ? 'false' : 'page'); a.className = linkCls + ' has-native-icon';
    a.innerHTML = '<svg class="native-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M1 1h14"/></svg><span></span>';
    a.querySelector('span').textContent = text; nav.appendChild(a);
  });
  const fromNav = C.starterFrom([nav], 'State 1');
  assert.equal(fromNav.tree.length, 1);
  assert.equal(fromNav.tree[0].t, 'a', 'for a nav of links, the starter is ONE link -- not a big heading');
  assert.equal(fromNav.tree[0].c, 'has-native-icon');
  assert.deepEqual(plain(fromNav.tree[0].s), ['font-size:12px;letter-spacing:.04em'], 'with the link\'s own look');
  assert(fromNav.tree[0].k.some((n) => n.t === 'svg' && n.a && n.a.viewBox), 'icon included: SVG keeps its geometry');
  assert(!fromNav.tree[0].a, 'but not the original\'s href, router hook or aria-current: a starter opens nothing nobody chose');
  assert.deepEqual(plain(fromNav.props), { link: 'State 1' }, 'its text is the state\'s label');
  const fromLinks = C.starterFrom([...nav.children], 'State 2');
  assert.equal(fromLinks.tree[0].t, 'a', 'three selected links give the same: one link');
  const fromHeading = C.starterFrom([doc.querySelector('h2')], 'State 1');
  assert.equal(fromHeading.tree[0].t, 'h2', 'a heading gives a heading');
  assert.equal(C.starterFrom([doc.querySelector('figure')], 'State 1'), null, 'no text in state 0 -> null, and the caller falls back to a typed block');
  /* and it renders */
  let v = C.createMaster({}, 'm1', C.CAPTURED, fromNav.props, 'State 1', fromNav.tree);
  v = C.insertInstance(v, '/', 'state-st1-1', 'i1', 'm1');
  const anchor = doc.createElement('div'); anchor.setAttribute('data-ark-insert', 'state-st1-1'); nav.appendChild(anchor);
  C.render(anchor, '/', 'state-st1-1', v);
  assert.equal(anchor.querySelector('a').textContent, 'State 1');
  assert.deepEqual(anchor.querySelector('a').className.split(' ').sort(), [linkCls, 'has-native-icon'].sort(), 'rendered as a nav link, styled like its neighbours');
  console.log('PASS: a new state\'s starter is one unit of state 0 (a nav link for a nav), labelled, with its look and none of its behaviour.');
}

/* ---- 4. js/main.js wires both: the context-menu item and the state seed */
{
  const main = fs.readFileSync('js/main.js', 'utf8');
  assert(/add\('Make into component', cmsMakeComponent, !!componentRefusal, componentRefusal\)/.test(main), 'the right-click menu offers Make into component, and a disabled one says what it needs');
  assert(/ArkComponents\.starterFrom\(members, label\)/.test(main), 'a new state is seeded from its state-0 members');
  console.log('PASS: js/main.js offers Make into component and seeds new states from state 0.');
}
