'use strict';
/* render()/advance()/findTriggerMatch()'s real DOM output, through the real ArkUI.build()
   (js/ark/runtime.js) and a real block resolver -- not a mocked builder, same convention as
   tests/components-dom.cjs. A hand-rolled element stub, since this project carries no jsdom
   dependency, extended with addEventListener/dispatchEvent/contains/nextSibling so a real
   simulated click can be driven through the same delegated-listener shape js/main.js uses. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class FakeElement {
  constructor(tagName) {
    this.tagName = String(tagName).toUpperCase();
    this.nodeType = 1;
    this.attrs = {};
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.listeners = {};
    this._text = '';
  }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map((child) => child.textContent).join(''); }
  get firstChild() { return this.children[0] || null; }
  get nextSibling() { if (!this.parentNode) return null; const i = this.parentNode.children.indexOf(this); return i >= 0 ? this.parentNode.children[i + 1] || null : null; }
  appendChild(node) { if (node.parentNode) node.remove(); node.parentNode = this; this.children.push(node); return node; }
  insertBefore(node, ref) {
    if (node.parentNode) node.parentNode.children.splice(node.parentNode.children.indexOf(node), 1);
    node.parentNode = this;
    const idx = ref ? this.children.indexOf(ref) : -1;
    if (idx < 0) this.children.push(node); else this.children.splice(idx, 0, node);
    return node;
  }
  remove() { if (this.parentNode) { this.parentNode.children = this.parentNode.children.filter((child) => child !== this); this.parentNode = null; } }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null; }
  hasAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attrs, name); }
  removeAttribute(name) { delete this.attrs[name]; }
  contains(other) { for (let node = other; node; node = node.parentNode) if (node === this) return true; return false; }
  querySelectorAll(selector) {
    const match = /^\[([\w-]+)\]$/.exec(selector);
    const out = [];
    const walk = (node) => node.children.forEach((child) => {
      if (match ? child.hasAttribute(match[1]) : child.tagName === selector.toUpperCase()) out.push(child);
      walk(child);
    });
    walk(this);
    return out;
  }
  addEventListener(type, fn) { (this.listeners[type] || (this.listeners[type] = [])).push(fn); }
  /* Bubbles from this element up through parentNode, invoking every listener registered
     for the event type along the way -- enough to exercise a delegated listener sitting
     at a shared ancestor, the exact shape js/main.js's own click-to-cycle listener uses. */
  dispatchEvent(event) {
    event.target = event.target || this;
    event.preventDefault = event.preventDefault || (() => {});
    for (let node = this; node; node = node.parentNode) (node.listeners[event.type] || []).forEach((fn) => fn(event));
    return true;
  }
}

const document = {
  createElement: (tag) => new FakeElement(tag),
  createElementNS: (_ns, tag) => new FakeElement(tag),
  createTextNode: (value) => ({ textContent: value }),
  documentElement: new FakeElement('html')
};
const window = { matchMedia: () => ({ matches: false }), console };
const sandbox = { document, window, console, ArkCopy: { isKey: () => false } };
sandbox.window = sandbox; Object.assign(sandbox, window);
const context = vm.createContext(sandbox);
function load(file) { vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file }); }

load('js/ark/atomizer.js');
load('js/ark/flux.js');
load('js/ark/runtime.js');
load('js/ark/dash-kit.js');
load('js/content/components.js');
load('js/resolvers/blocks/rblock-text-v1.js');
load('js/resolvers/blocks/rblock-divider-v1.js');
load('js/content/states.js');
const ArkComponents = vm.runInContext('ArkComponents', context);
const ArkStates = vm.runInContext('ArkStates', context);

/* A small real page: a host containing two "state zero" buttons, annotated the same
   way ArkLayout.annotate() would (data-ark-layout-key), inside a shared container. */
function buildHost() {
  const host = new FakeElement('div');
  const container = host.appendChild(new FakeElement('div'));
  const buttonA = container.appendChild(new FakeElement('button')); buttonA.setAttribute('data-ark-layout-key', 'keyA'); buttonA.textContent = 'A';
  const buttonB = container.appendChild(new FakeElement('button')); buttonB.setAttribute('data-ark-layout-key', 'keyB'); buttonB.textContent = 'B';
  return { host, container, buttonA, buttonB };
}

/* --- render() shows exactly state 0's real members when current is 0, and hides them
       in favor of a real ArkComponents-rendered anchor for any state i >= 1 --- */
(function rendersExactlyOneStateAtATime() {
  const { host, buttonA, buttonB } = buildHost();
  let states = ArkStates.sanitize({});
  states = ArkStates.createStateGroup(states, '/x', 'g1', ['keyA', 'keyB'], 'self');
  states = ArkStates.addState(states, '/x', 'g1', 'Headline');

  let components = ArkComponents.sanitize({});
  components = ArkComponents.createMaster(components, 'm1', 'RBLOCK_TEXT_V1', { heading: 'New state content', body: 'body' }, 'Intro');
  components = ArkComponents.insertInstance(components, '/x', ArkStates.anchorId('g1', 1), 'i1', 'm1');

  ArkStates.render(host, '/x', 'g1', states, components);
  assert.equal(buttonA.style.display, '', 'state 0 is current: member A is visible');
  assert.equal(buttonB.style.display, '', 'state 0 is current: member B is visible');
  assert.equal(host.querySelectorAll('[data-ark-insert]').length, 0, 'no anchor exists yet for a state that has never been current');

  states = ArkStates.setCurrent(states, '/x', 'g1', 1);
  ArkStates.render(host, '/x', 'g1', states, components);
  assert.equal(buttonA.style.display, 'none', 'state 1 is current: member A is hidden, never destroyed');
  assert.equal(buttonB.style.display, 'none', 'state 1 is current: member B is hidden, never destroyed');
  const anchor = host.querySelectorAll('[data-ark-insert]')[0];
  assert(anchor, 'render() creates state 1\'s own anchor on demand');
  assert.equal(anchor.getAttribute('data-ark-insert'), 'state-g1-1', 'the anchor id is the deterministic groupId/index form');
  assert.equal(anchor.style.display, '', 'the active anchor is visible');
  assert.equal(anchor.children.length, 1, 'ArkComponents.render() filled the anchor wholesale, through the real builder');
  const heading = anchor.children[0].children.find((c) => c.tagName === 'H2');
  assert.equal(heading.textContent, 'New state content', 'the new state\'s real content came from the real block resolver, not a stub');

  states = ArkStates.setCurrent(states, '/x', 'g1', 0);
  ArkStates.render(host, '/x', 'g1', states, components);
  assert.equal(buttonA.style.display, '', 'back to state 0: member A is visible again');
  assert.equal(anchor.style.display, 'none', 'back to state 0: state 1\'s anchor is hidden, not removed');

  console.log('PASS: render() shows exactly one state\'s content at a time and correctly hides the others.');
})();

/* --- advance() cycles in fixed order and wraps past the last state back to 0 --- */
(function advanceCyclesAndWraps() {
  let states = ArkStates.sanitize({});
  states = ArkStates.createStateGroup(states, '/x', 'g1', ['keyA'], 'self');
  states = ArkStates.addState(states, '/x', 'g1', 'B');
  states = ArkStates.addState(states, '/x', 'g1', 'C');

  states = ArkStates.advance(states, '/x', 'g1'); assert.equal(states.routes['/x'].g1.current, 1);
  states = ArkStates.advance(states, '/x', 'g1'); assert.equal(states.routes['/x'].g1.current, 2);
  states = ArkStates.advance(states, '/x', 'g1'); assert.equal(states.routes['/x'].g1.current, 0, 'wraps back to state 0 after the last state');

  console.log('PASS: advance() cycles in fixed order and wraps past the last state back to 0.');
})();

/* --- a real simulated click on the trigger advances the state and re-renders --- */
(function clickAdvancesAndRerenders() {
  const { host, container, buttonA, buttonB } = buildHost();
  let states = ArkStates.sanitize({});
  states = ArkStates.createStateGroup(states, '/x', 'g1', ['keyA', 'keyB'], 'self');
  states = ArkStates.addState(states, '/x', 'g1', 'Headline');
  let components = ArkComponents.sanitize({});
  components = ArkComponents.createMaster(components, 'm1', 'RBLOCK_DIVIDER_V1', {}, 'Divider');
  components = ArkComponents.insertInstance(components, '/x', ArkStates.anchorId('g1', 1), 'i1', 'm1');
  ArkStates.render(host, '/x', 'g1', states, components);

  /* The exact delegated-listener shape js/main.js registers at its host root for every
     real visitor: resolve which group (if any) a click belongs to, advance it, re-render
     just that group. Registered on `host` here since this stub has no `document`. */
  host.addEventListener('click', (event) => {
    const groupId = ArkStates.findTriggerMatch(host, '/x', states, event.target);
    if (!groupId) return;
    event.preventDefault();
    states = ArkStates.define(ArkStates.advance(states, '/x', groupId));
    ArkStates.render(host, '/x', groupId, states, components);
  });

  assert.equal(states.routes['/x'].g1.current, 0, 'starts on state 0');
  buttonA.dispatchEvent({ type: 'click' });
  assert.equal(states.routes['/x'].g1.current, 1, 'a real click on a state-0 member (the self trigger) advanced the group');
  assert.equal(buttonA.style.display, 'none', 'state 0\'s members are hidden after advancing away from it');
  const anchor = host.querySelectorAll('[data-ark-insert]')[0];
  assert(anchor && anchor.style.display === '', 'the new state\'s anchor is now visible');

  /* Once state 1 is current, 'self' resolves to the now-visible anchor, not the hidden
     buttons -- clicking the (invisible) button must not advance a second time. */
  buttonB.dispatchEvent({ type: 'click' });
  assert.equal(states.routes['/x'].g1.current, 1, 'clicking a hidden state-0 member does not advance the group');
  anchor.dispatchEvent({ type: 'click' });
  assert.equal(states.routes['/x'].g1.current, 0, 'clicking the active anchor advances/wraps the group back to state 0');

  /* A click entirely outside any group must never throw or do anything. */
  const stray = container.appendChild(new FakeElement('span'));
  assert.doesNotThrow(() => stray.dispatchEvent({ type: 'click' }));
  assert.equal(states.routes['/x'].g1.current, 0, 'an unrelated click leaves every group untouched');

  console.log('PASS: a real simulated click on the trigger advances the state and re-renders.');
})();

/* --- a group with only one state is a safe no-op on click --- */
(function singleStateGroupIsNoOpOnClick() {
  const { host, buttonA } = buildHost();
  let states = ArkStates.sanitize({});
  states = ArkStates.createStateGroup(states, '/x', 'g1', ['keyA', 'keyB'], 'self');
  ArkStates.render(host, '/x', 'g1', states, ArkComponents.sanitize({}));

  host.addEventListener('click', (event) => {
    const groupId = ArkStates.findTriggerMatch(host, '/x', states, event.target);
    if (!groupId) return;
    states = ArkStates.define(ArkStates.advance(states, '/x', groupId));
    ArkStates.render(host, '/x', groupId, states, ArkComponents.sanitize({}));
  });

  assert.doesNotThrow(() => buttonA.dispatchEvent({ type: 'click' }));
  assert.equal(states.routes['/x'].g1.current, 0, 'a group with nothing to cycle to stays on state 0, never throws');
  assert.equal(buttonA.style.display, '', 'its sole state keeps its real content visible');

  console.log('PASS: a group with only one state is a safe no-op on click.');
})();

console.log('PASS: layered states render through the real ArkUI builder/ArkComponents and cycle via real simulated clicks.');
