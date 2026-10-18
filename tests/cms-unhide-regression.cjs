'use strict';
/* Regression: un-hiding an element whose ONLY stored override was display:'hide' used to
   throw inside setCmsElementFrame (js/main.js) before the live DOM update ever ran, leaving
   the element visually stuck hidden even though the underlying draft was already correct
   (sanitize() drops an emptied key, and sometimes the whole route, so reading
   cmsLayoutDraft.routes[route][key] directly threw on the very next line). Extracted
   verbatim against the REAL ArkLayout module, not a stub, since the bug is specifically in
   how js/main.js reads ArkLayout's own output -- a fake merge would hide the defect. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const src = fs.readFileSync('js/main.js', 'utf8');
const start = src.indexOf('  function setCmsElementFrame(element, frame, commit) {');
const end = src.indexOf('  function setCmsLayoutFrame(frame, commit) {');
assert(start >= 0 && end > start, 'js/main.js still defines setCmsElementFrame right before setCmsLayoutFrame');
/* setCmsElementFrame applies the frame that applies to the element (cmsFrameFor, right above it) */
const frameFor = src.slice(src.indexOf('  function cmsFrameFor(route, key, element) {'), src.indexOf('  function cmsLayoutEntry('));
assert(frameFor.length > 0, 'js/main.js still defines cmsFrameFor right before cmsLayoutEntry');
const extracted = frameFor + src.slice(start, end);

class FakeElement {
  constructor(key) { this.tagName = 'DIV'; this.nodeType = 1; this.namespaceURI = 'http://www.w3.org/1999/xhtml'; this.attrs = { 'data-ark-layout-key': key }; this.children = []; this.parentNode = null; this.id = ''; this.style = {}; }
  setAttribute(name, value) { if (name === 'id') this.id = String(value); this.attrs[name] = String(value); }
  getAttribute(name) { return name === 'id' ? (this.id || null) : (Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null); }
  hasAttribute(name) { return name === 'id' ? !!this.id : Object.prototype.hasOwnProperty.call(this.attrs, name); }
  removeAttribute(name) { delete this.attrs[name]; if (name === 'id') this.id = ''; }
  querySelectorAll() { return []; }
}

function run() {
  const layoutSrc = fs.readFileSync('js/content/layout.js', 'utf8');
  const context = {
    window: { innerWidth: 1280 },
    cmsLayoutDraft: null,
    cmsRoutePath: () => '/',
    cmsSelectionInfo: (element) => ({ route: '/', key: element.getAttribute('data-ark-layout-key'), breakpoint: 'desktop' }),
  };
  vm.createContext(context);
  vm.runInContext(layoutSrc, context);
  context.window.ArkLayout = context.ArkLayout;
  context.cmsLayoutDraft = context.ArkLayout.sanitize({});
  vm.runInContext(extracted, context);
  return vm.runInContext('setCmsElementFrame', context);
}

// The ONLY stored property for this key is the hide toggle -- the exact shape that used to crash.
{
  const setCmsElementFrame = run();
  const element = new FakeElement('k-only-hidden');
  assert.doesNotThrow(() => setCmsElementFrame(element, { display: 'hide' }, false), 'hiding does not throw');
  assert.equal(element.style.display, 'none', 'element is actually hidden');
  assert.doesNotThrow(() => setCmsElementFrame(element, { display: null }, false), 'un-hiding the LAST stored property does not throw (this is the bug: it used to)');
  assert.equal(element.style.display, '', 'element is visually restored, not stuck hidden');
  console.log('PASS: un-hiding an element with no other stored overrides restores it instead of throwing.');
}

// Same case, but the key had other real overrides too -- must keep working as it already did.
{
  const setCmsElementFrame = run();
  const element = new FakeElement('k-has-other');
  setCmsElementFrame(element, { bg: 'surface' }, false);
  setCmsElementFrame(element, { display: 'hide' }, false);
  assert.equal(element.style.display, 'none');
  assert.doesNotThrow(() => setCmsElementFrame(element, { display: null }, false));
  assert.equal(element.style.display, '', 'un-hidden');
  assert.equal(element.style.backgroundColor, 'hsl(var(--surface))', 'the other override survives the un-hide');
  console.log('PASS: un-hiding leaves other stored overrides on the same key untouched.');
}
