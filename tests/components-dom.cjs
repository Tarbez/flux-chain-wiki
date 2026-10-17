'use strict';
/* render()'s real DOM output, through the real ArkUI.build() (js/ark/runtime.js) and the
   real block resolvers (js/resolvers/blocks/*.js) -- not a mocked builder. A hand-rolled
   element stub, in the style of tests/layout-dom-grouping.cjs, since this project carries
   no jsdom dependency. */
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
    this._text = '';
    this.classList = { set: new Set(), add(name) { if (name) this.set.add(name); }, contains(name) { return this.set.has(name); } };
  }
  set className(value) { this.classList.set = new Set(String(value || '').split(/\s+/).filter(Boolean)); }
  get className() { return [...this.classList.set].join(' '); }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map((child) => child.textContent).join(''); }
  get firstChild() { return this.children[0] || null; }
  appendChild(node) { if (node.parentNode) node.remove(); node.parentNode = this; this.children.push(node); return node; }
  remove() { if (this.parentNode) { this.parentNode.children = this.parentNode.children.filter((child) => child !== this); this.parentNode = null; } }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null; }
  hasAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attrs, name); }
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
load('js/resolvers/blocks/rblock-cta-v1.js');
load('js/resolvers/blocks/rblock-divider-v1.js');
const ArkComponents = vm.runInContext('ArkComponents', context);

/* --- master + instance + override, rendered into a real anchor element --- */
(function rendersMasterInstanceOverride() {
  let v = ArkComponents.sanitize({ version: 1, masters: {}, routes: {} });
  v = ArkComponents.createMaster(v, 'm1', 'RBLOCK_TEXT_V1', { heading: 'Original heading', body: 'Original body' }, 'Intro');
  v = ArkComponents.insertInstance(v, '/about', 'main', 'i1', 'm1');
  v = ArkComponents.setOverride(v, '/about', 'main', 'i1', 'heading', 'Overridden heading');

  const host = new FakeElement('div'); host.setAttribute('data-ark-insert', 'main');
  const built = ArkComponents.render(host, '/about', 'main', v);

  assert.equal(built.length, 1, 'one instance renders one element');
  assert.equal(host.children.length, 1, 'that element is appended into the anchor host');
  const section = host.children[0];
  assert.equal(section.tagName, 'SECTION', 'RBLOCK_TEXT_V1 builds through the real resolver registry, not a stub');
  const heading = section.children.find((c) => c.tagName === 'H2');
  const body = section.children.find((c) => c.tagName === 'P');
  assert.equal(heading.textContent, 'Overridden heading', 'an instance override wins over the master\'s own prop value');
  assert.equal(body.textContent, 'Original body', 'a prop with no override still reads straight from the master');

  console.log('PASS: render() builds a real master+instance+override combination through ArkUI.build.');
})();

/* --- updateMaster propagates to every instance's next render, with no resync step --- */
(function masterEditPropagatesOnNextRender() {
  let v = ArkComponents.sanitize({ version: 1, masters: {}, routes: {} });
  v = ArkComponents.createMaster(v, 'm1', 'RBLOCK_TEXT_V1', { heading: 'v1', body: 'v1 body' }, 'Intro');
  v = ArkComponents.insertInstance(v, '/a', 'main', 'i1', 'm1');
  v = ArkComponents.insertInstance(v, '/b', 'main', 'i2', 'm1');

  const hostA = new FakeElement('div'); hostA.setAttribute('data-ark-insert', 'main');
  ArkComponents.render(hostA, '/a', 'main', v);
  assert.equal(hostA.children[0].children.find((c) => c.tagName === 'H2').textContent, 'v1');

  v = ArkComponents.updateMaster(v, 'm1', { props: { heading: 'v2', body: 'v1 body' } });

  const hostA2 = new FakeElement('div'); hostA2.setAttribute('data-ark-insert', 'main');
  const hostB = new FakeElement('div'); hostB.setAttribute('data-ark-insert', 'main');
  ArkComponents.render(hostA2, '/a', 'main', v);
  ArkComponents.render(hostB, '/b', 'main', v);
  assert.equal(hostA2.children[0].children.find((c) => c.tagName === 'H2').textContent, 'v2', 'route /a\'s instance sees the master edit on its next render');
  assert.equal(hostB.children[0].children.find((c) => c.tagName === 'H2').textContent, 'v2', 'route /b\'s instance sees the exact same edit, with no per-instance resync call of any kind');

  console.log('PASS: a master edit reaches every one of its instances on their next render.');
})();

/* --- re-rendering the same anchor is idempotent, never appends on top of stale content --- */
(function renderReplacesNotAppends() {
  let v = ArkComponents.sanitize({ version: 1, masters: {}, routes: {} });
  v = ArkComponents.createMaster(v, 'm1', 'RBLOCK_DIVIDER_V1', {}, 'Divider');
  v = ArkComponents.insertInstance(v, '/x', 'main', 'i1', 'm1');
  v = ArkComponents.insertInstance(v, '/x', 'main', 'i2', 'm1');

  const host = new FakeElement('div'); host.setAttribute('data-ark-insert', 'main');
  ArkComponents.render(host, '/x', 'main', v);
  assert.equal(host.children.length, 2, 'two instances render two elements, in order');
  ArkComponents.render(host, '/x', 'main', v);
  assert.equal(host.children.length, 2, 'rendering the same anchor again replaces its content instead of accumulating duplicates');

  v = ArkComponents.removeInstance(v, '/x', 'main', 'i1');
  ArkComponents.render(host, '/x', 'main', v);
  assert.equal(host.children.length, 1, 'removing an instance and re-rendering drops it from the anchor');

  console.log('PASS: render() replaces an anchor\'s content on every call, never accumulates stale children.');
})();

/* --- zero saved components, and a corrupted/dangling pointer, both render nothing and never throw --- */
(function emptyAndDanglingRenderSafely() {
  const host = new FakeElement('div'); host.setAttribute('data-ark-insert', 'main');
  assert.doesNotThrow(() => ArkComponents.render(host, '/anything', 'main', ArkComponents.sanitize({})), 'the default empty draft renders nothing and never throws');
  assert.equal(host.children.length, 0);

  const corrupt = { version: 1, masters: {}, routes: { '/x': { main: [{ key: 'ghost', masterId: 'no-such-master', overrides: {} }] } } };
  assert.doesNotThrow(() => ArkComponents.render(host, '/x', 'main', corrupt), 'a dangling master pointer is dropped (by sanitize(), which render() always runs first) instead of throwing');
  assert.equal(host.children.length, 0, 'the dangling instance renders no element');

  console.log('PASS: an empty draft and a dangling master pointer both render safely.');
})();

/* --- renderAll discovers every [data-ark-insert] anchor under a root and fills each --- */
(function renderAllFillsEveryAnchor() {
  let v = ArkComponents.sanitize({ version: 1, masters: {}, routes: {} });
  v = ArkComponents.createMaster(v, 'm1', 'RBLOCK_DIVIDER_V1', {}, 'Divider');
  v = ArkComponents.insertInstance(v, '/page', 'main', 'i1', 'm1');
  v = ArkComponents.insertInstance(v, '/page', 'aside', 'i2', 'm1');

  const root = new FakeElement('section');
  const main = root.appendChild(new FakeElement('div')); main.setAttribute('data-ark-insert', 'main');
  const aside = root.appendChild(new FakeElement('div')); aside.setAttribute('data-ark-insert', 'aside');

  const ids = Array.from(ArkComponents.renderAll(root, '/page', v));
  assert.deepEqual(ids.sort(), ['aside', 'main'], 'renderAll reports every anchor id it found');
  assert.equal(main.children.length, 1, 'the main anchor was filled');
  assert.equal(aside.children.length, 1, 'the aside anchor was filled');

  console.log('PASS: renderAll finds and fills every anchor under a root in one call.');
})();

console.log('PASS: reusable components render through the real ArkUI builder and block resolvers.');
