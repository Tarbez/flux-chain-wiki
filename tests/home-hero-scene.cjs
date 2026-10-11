/* The hero illustration: one record, five steps, one panel at a time.
 *
 * It is the first thing anyone sees, and it makes claims — this is the
 * real wire grammar, the checks pass together before anything is stored,
 * nothing is durable until peers hold it, only a resolver says what a
 * record means. A screenshot cannot check any of that, and the headless
 * browser reports the tab as hidden so the scene correctly refuses to
 * advance. So the scene is driven here instead, step by step, and read
 * back.
 *
 * Named regressions:
 *   - only the current step's panel may be active (the ending was once
 *     visible from step one, because a dim panel still read);
 *   - the new chain position must be absent until it is extended;
 *   - partial replication must look partial;
 *   - paused, hidden and reduced-motion states must not schedule a timer.
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const NS = 'http://www.w3.org/2000/svg';

class Node {
  constructor(tag) {
    this.tagName = tag; this.className = ''; this.children = []; this.dataset = {};
    this.attrs = {}; this.listeners = {}; this.style = { }; this._text = ''; this.hidden = false;
  }
  appendChild(c) { this.children.push(c); c.parent = this; return c; }
  insertBefore(c) { this.children.unshift(c); return c; }
  setAttribute(k, v) {
    this.attrs[k] = String(v);
    if (k === 'class') this.className = String(v);
    if (k.startsWith('data-')) this.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(v);
  }
  getAttribute(k) { return this.attrs[k]; }
  toggleAttribute(k, on) { if (on) this.setAttribute(k, ''); else delete this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
  removeEventListener() {}
  set textContent(v) { this._text = v == null ? '' : String(v); this.children = []; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(' '); }
  get offsetWidth() { return 1; }
  closest() { return null; }
  all() { return [this].concat(...this.children.map((c) => c.all())); }
  byClass(cls) { return this.all().filter((n) => String(n.className).split(' ').includes(cls)); }
  get classList() {
    const self = this;
    return {
      add(...n) { self.className = (self.className + ' ' + n.join(' ')).trim(); },
      remove(...n) { self.className = self.className.split(' ').filter((c) => !n.includes(c)).join(' '); },
      contains(n) { return self.className.split(' ').includes(n); }
    };
  }
}

const timers = new Map();
let nextTimer = 0;
const doc = {
  hidden: false,
  createElement: (t) => new Node(t),
  createElementNS: (_ns, t) => new Node(t),
  addEventListener() {}, removeEventListener() {}
};

const sandbox = {
  document: doc, console, Math, Date, String, Number,
  setTimeout: (fn, ms) => { const id = ++nextTimer; timers.set(id, { fn, ms }); return id; },
  clearTimeout: (id) => timers.delete(id),
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  ArkUI: { sceneState: { get: () => ({ paused: false }), subscribe: () => () => {} } }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('js/pages/home-flow.js', 'utf8'), sandbox);

assert(sandbox.ArkUI.buildChainFlow, 'home-flow.js must register ArkUI.buildChainFlow');
const flow = sandbox.ArkUI.buildChainFlow({ hrefFor: (k) => '/' + k });
const root = flow.element;

const panel = (id) => root.all().find((n) => n.dataset.panel === id);
const on = (n) => n.getAttribute('data-on') === 'true';
const active = (n) => n.className.split(' ').includes('flow-panel-active');

/* The step links are the accessible content and drive the scene. */
const links = root.byClass('flow-record');
assert.equal(links.length, 5, 'five steps, named in the DOM, each linking to the page that shows it for real');
function goto(i) { links[i].listeners.focus[0](); }

/* ---- band 1: the record is the real wire grammar --------------------- */

const blocks = root.byClass('flow-block');
assert.equal(blocks.length, 7, 'the record shows all seven blocks');
const grammar = blocks.map((b) => b.byClass('flow-block-text')[0].textContent);
assert.deepEqual(
  grammar.map((g) => g[0]), ['G', 'Y', 'V', 'M', 'J', 'C', 'S'],
  'the blocks must be real role letters in record order (G Y V M J C S). A stylised card ' +
    'would be easier to draw and would teach nobody the grammar.'
);
assert(grammar[1].startsWith('YLEDGERENTRY'), 'Y carries the manifest type');
assert(grammar[6].startsWith('S'), 'the signature is the last block — it covers everything before it');
for (const b of blocks) {
  assert(b.byClass('flow-block-under')[0].textContent.trim(), 'every block names its field in plain words');
}

/* ---- the five steps, one panel at a time ------------------------------ */

goto(0);
assert(active(panel('sign')), 'the sign panel is active on the first step');
assert(
  !active(panel('check')) && !active(panel('extend')) && !active(panel('replicate')) && !active(panel('resolve')),
  'only the current step\'s panel may show -- a later step is not readable before it happens'
);
assert.equal(
  root.byClass('flow-lamp').filter((l) => on(l)).length, 0,
  'no check may be lit before the check step'
);
const chainNodes = root.byClass('flow-node');
const newNode = chainNodes[chainNodes.length - 1];
assert(!on(newNode), 'position 42 must not exist before the record extends the chain');
assert.equal(
  root.byClass('flow-peer').filter((p) => on(p)).length, 0,
  'no peer holds it before replication'
);

goto(1);
assert(active(panel('check')), 'the check panel lights on its step');
const lit1 = root.byClass('flow-lamp').filter((l) => on(l));
assert.equal(lit1.length, 4, 'all four checks pass together before anything is stored');
assert.deepEqual(lit1.map((l) => l.dataset.mark), ['G', 'S', 'C', 'K'], 'grammar, signature, head, peers');

goto(2);
assert(active(panel('extend')), 'the extend panel lights on its step');
assert(on(newNode), 'position 42 arrives when the chain is extended');
assert.equal(newNode.getAttribute('data-new'), 'true', 'and it is marked as the new position, not just another node');

goto(3);
assert(active(panel('replicate')), 'the replicate panel lights on its step');
const held = root.byClass('flow-peer').filter((p) => on(p));
const allPeers = root.byClass('flow-peer');
assert(held.length > 0, 'peers must hold it');
assert(
  held.length < allPeers.length,
  `partial replication must look partial: ${held.length} of ${allPeers.length} are filled. ` +
    'A full row would claim every peer acknowledged, which is a different and stronger claim.'
);

goto(4);
assert(active(panel('resolve')), 'the resolve panel lights on its step');
assert(
  root.byClass('flow-meaning-text')[0].textContent.trim(),
  'the resolved meaning must actually say something'
);
assert.equal(root.dataset.complete, 'true', 'the last step is the finished state');

/* ---- the ending is not readable before it happens -------------------- */

goto(0);
assert(
  !active(panel('resolve')),
  'stepping back must hide the resolve panel again — a panel that stays shown tells the story backwards'
);

/* ---- the tracker moves ------------------------------------------------ */

goto(0);
assert(links[0].getAttribute('data-current') !== undefined, 'the tracker marks the current step');
goto(4);
assert(
  links[4].getAttribute('data-current') !== undefined && links[0].getAttribute('data-current') === undefined,
  'the tracker must move as the step advances — it is the chain, drawn once, and doubles as the accessible content'
);

/* ---- stillness: no timer while paused, hidden or reduced ------------- */

function pendingAfter(fn) { timers.clear(); fn(); return timers.size; }

links[0].listeners.pointerleave[0]();            // release the hold
assert(pendingAfter(() => flow.restore()) > 0, 'playing schedules the next step');

doc.hidden = true;
assert.equal(pendingAfter(() => flow.restore()), 0, 'a hidden tab schedules nothing');
doc.hidden = false;

sandbox.ArkUI.sceneState.get = () => ({ paused: true });
assert.equal(pendingAfter(() => flow.restore()), 0, 'a paused scene schedules nothing');
sandbox.ArkUI.sceneState.get = () => ({ paused: false });

const toggle = root.byClass('flow-toggle')[0];
toggle.listeners.click[0]();
assert.equal(pendingAfter(() => flow.restore()), 0, 'the pause button stops the scene');
toggle.listeners.click[0]();

flow.dispose();
assert.equal(pendingAfter(() => flow.restore()), 0, 'a disposed scene never schedules again');

console.log('PASS: hero scene — 7 real grammar blocks, one panel active per step, ' +
  'checks pass together, partial replication reads partial, the ending stays hidden ' +
  'until it happens, and the scene is still when paused, hidden or disposed.');
