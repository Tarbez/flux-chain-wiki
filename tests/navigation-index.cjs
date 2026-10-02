const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Element {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.className = '';
    this.listeners = {};
    this.classList = {
      add: (...names) => { this.className += ' ' + names.join(' '); },
      remove: (...names) => { this.className = this.className.split(' ').filter((name) => !names.includes(name)).join(' '); }
    };
  }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return this.attributes[name]; }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  focus() { this.focused = true; }
  querySelector(selector) {
    const all = this.children.flatMap((child) => [child, ...child.descendants()]);
    if (selector === 'a') return all.find((child) => child.tagName === 'A');
    const target = selector.match(/^\[data-nav-target="([^"]+)"\]$/);
    return target ? all.find((child) => child.dataset.navTarget === target[1]) : null;
  }
  descendants() { return this.children.flatMap((child) => [child, ...child.descendants()]); }
  querySelectorAll(selector) {
    return this.descendants().filter((child) => selector === 'a' ? child.tagName === 'A' : false);
  }
}

const ids = [
  'zero', 'resolver', 'references', 'deployment', 'explorer', 'account', 'treasury', 'deposits', 'deploy', 'about',
  'concept', 'proximity', 'lab', 'dao', 'download', 'learnings',
  'lifecycle', ...['intent', 'offer', 'agreement', 'fulfillment', 'receipt'].map((id) => 'lifecycle/' + id),
  ...['network', 'agreement', 'authority', 'governance', 'register', 'measured'].map((id) => 'concept/' + id),
  ...['chain', 'substrate', 'validators'].map((id) => 'article/' + id)
];
const catalog = Object.fromEntries(ids.map((id) => [id, { path: '/' + id, title: id }]));
let header;
let clockId = 0;
const timers = new Map();
function nextAnimationPhase() {
  const [id, callback] = timers.entries().next().value;
  timers.delete(id);
  callback();
}
vm.runInNewContext(fs.readFileSync('js/resolvers/header.js', 'utf8'), {
  Tokens: { u: () => '1px' },
  ArkUI: {
    pageCatalog: catalog,
    lifecycleStages: ['intent', 'offer', 'agreement', 'fulfillment', 'receipt'].map((id) => ({ id, title: id })),
    register: (_name, definition) => { header = definition; }
  },
  ArkCopy: { text: (value) => value },
  LearningContent: { find: (id) => ({ title: id }) },
  document: { createElement: (tag) => new Element(tag) },
  window: {
    matchMedia: () => ({ matches: false }),
    setTimeout: (fn) => { const id = ++clockId; timers.set(id, fn); return id; },
    clearTimeout: (id) => { timers.delete(id); }
  }
});

const menu = new Element('nav');
const host = { querySelector: () => menu };
header.onMount(host);
const layers = menu.children;
const layer = (name) => layers.find((item) => item.dataset.navLayer === name);
assert.equal(menu.dataset.pageCount, '31');
assert.equal(menu.querySelectorAll('a').length, 31, 'every page remains in navigation');
assert.equal(layers.length, 5, 'index and four intent-based category layers');
assert.equal(layer('index').hidden, false);
for (const name of ['understand', 'evaluate', 'run', 'read']) {
  assert.equal(layer(name).hidden, true, name + ' starts hidden');
}
assert.equal(layer('understand').querySelectorAll('a').length, 10, 'overview and all lifecycle stages remain directly reachable');
layer('index').querySelector('[data-nav-target="understand"]').listeners.click();
assert.equal(menu.navLayers.current(), 'understand');
assert.equal(layer('index').hidden, false, 'first layer stays until its exit finishes');
assert.equal(layer('understand').hidden, true, 'second layer does not enter early');
nextAnimationPhase();
assert.equal(layer('index').hidden, true);
assert.equal(layer('understand').hidden, false);
nextAnimationPhase();
menu.navLayers.back();
nextAnimationPhase();
nextAnimationPhase();
assert.equal(menu.navLayers.current(), 'index');
menu.navLayers.reset();
assert.equal(menu.navLayers.current(), 'index');
assert.equal(layer('index').hidden, false);
layer('index').querySelector('[data-nav-target="evaluate"]').listeners.click();
assert.equal(timers.size, 1);
menu.navLayers.reset();
assert.equal(timers.size, 0, 'closing during an exit cancels the transition');
assert.equal(layer('evaluate').hidden, true);
console.log('PASS: all 31 routes remain linked across four intent-based animated navigation layers.');
