'use strict';
/* layout-content.cjs covers the pure data model (sanitize/set/merged) for the new
   spacing/typography/fill/effects properties; this covers the DOM-writing half --
   applyFrame() actually producing the real CSS the live site's tokens expect, and
   resetElement() actually clearing it. Same hand-rolled element stub as
   tests/layout-dom-grouping.cjs (this project carries no jsdom dependency). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

/* A real CSSStyleDeclaration reads '' for any property nobody set. ArkLayout's reset now
   restores only what it wrote (js/content/layout.js resetElement), so an untouched property
   is no longer blanked to '' as a side effect -- the stub has to answer '' itself. */
function cssDeclaration() { return new Proxy({}, { get: (target, name) => (name in target ? target[name] : typeof name === 'string' ? '' : undefined) }); }
class FakeElement {
  constructor(tagName) { this.tagName = tagName.toUpperCase(); this.nodeType = 1; this.namespaceURI = 'http://www.w3.org/1999/xhtml'; this.attrs = {}; this.children = []; this.parentNode = null; this.id = ''; this.style = cssDeclaration(); }
  setAttribute(name, value) { if (name === 'id') this.id = String(value); this.attrs[name] = String(value); }
  getAttribute(name) { return name === 'id' ? (this.id || null) : (Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null); }
  hasAttribute(name) { return name === 'id' ? !!this.id : Object.prototype.hasOwnProperty.call(this.attrs, name); }
  removeAttribute(name) { delete this.attrs[name]; if (name === 'id') this.id = ''; }
  querySelectorAll() { return []; }
}

const context = vm.createContext({ document: { createElementNS: (ns, tag) => new FakeElement(tag) } });
vm.runInContext(fs.readFileSync('js/content/layout.js', 'utf8'), context);
const ArkLayout = vm.runInContext('ArkLayout', context);

const el = new FakeElement('div');
ArkLayout.applyFrame(el, {
  pt: 24, pr: 16, pb: 24, pl: 16, mt: 8, mb: -4,
  font: 'display', textSize: 'h2', color: 'text-strong', bg: 'surface', radius: 'card', border: 'thin', borderColor: 'border-default',
  op: 80, overflow: 'hidden',
});
assert.equal(el.style.paddingTop, '24px');
assert.equal(el.style.paddingRight, '16px');
assert.equal(el.style.paddingBottom, '24px');
assert.equal(el.style.paddingLeft, '16px');
assert.equal(el.style.marginTop, '8px');
assert.equal(el.style.marginBottom, '-4px');
assert.equal(el.style.fontFamily, 'var(--font-display)', 'font writes the real site\'s own font-slot token, not a literal font name');
assert.equal(el.style.fontSize, 'var(--type-h2)', 'text size writes the real site\'s own type-role token');
assert.equal(el.style.color, 'hsl(var(--text-strong))', 'color writes the real HSL-channel token the way the site\'s own CSS consumes it');
assert.equal(el.style.backgroundColor, 'hsl(var(--surface))');
assert.equal(el.style.borderRadius, 'var(--size-card-radius)', 'radius writes the real site\'s own radius token, not an invented px value');
assert.equal(el.style.borderWidth, '1px');
assert.equal(el.style.borderStyle, 'solid');
assert.equal(el.style.borderColor, 'hsl(var(--border-default))');
assert.equal(el.style.opacity, '0.8');
assert.equal(el.style.overflow, 'hidden');
console.log('PASS: spacing/typography/fill/effects apply as the real site\'s own CSS custom properties.');

/* 'none' fill must paint transparent, not fall through to "no background set". */
const bgEl = new FakeElement('div');
ArkLayout.applyFrame(bgEl, { bg: 'none' });
assert.equal(bgEl.style.backgroundColor, 'transparent');
console.log('PASS: an explicit none fill clears the background rather than leaving it unset.');

/* border: 'none' must not draw a border, even though a borderColor could still be present
   in the stored frame (e.g. from a prior edit that was then switched back to none). */
const borderEl = new FakeElement('div');
ArkLayout.applyFrame(borderEl, { border: 'none', borderColor: 'border-strong' });
assert.equal(borderEl.style.borderWidth, '', 'no width is written when border is none');
assert.equal(borderEl.style.borderStyle, '', 'no style is written when border is none');
console.log('PASS: border none draws no border even when a border color is still stored.');

/* resetElement (via a second applyFrame with an empty frame) clears every new style
   property the same way it already clears geometry -- a changed selection must not leak
   the previous element's padding/color/etc. onto the next one. */
const reuse = new FakeElement('div');
ArkLayout.applyFrame(reuse, { pt: 40, color: 'text-strong', bg: 'primary', radius: 'panel', op: 40 });
ArkLayout.applyFrame(reuse, {});
for (const prop of ['paddingTop', 'color', 'backgroundColor', 'borderRadius', 'opacity']) assert.equal(reuse.style[prop], '', `${prop} is cleared when the new frame carries nothing`);
console.log('PASS: reapplying an empty frame clears every style property, not just geometry.');

/* Layout (flex/grid container), the remaining typography properties, and max/min size --
   same real-CSS-write contract as the first batch above. */
const layoutEl = new FakeElement('div');
ArkLayout.applyFrame(layoutEl, { display: 'row', gap: 12, align: 'center', justify: 'between', wrap: 'yes', fw: 600, lh: 'snug', ta: 'center', maxw: 640, minh: 80 });
assert.equal(layoutEl.style.display, 'flex');
assert.equal(layoutEl.style.flexDirection, 'row');
assert.equal(layoutEl.style.gap, '12px');
assert.equal(layoutEl.style.alignItems, 'center');
assert.equal(layoutEl.style.justifyContent, 'space-between');
assert.equal(layoutEl.style.flexWrap, 'wrap');
assert.equal(layoutEl.style.fontWeight, '600');
assert.equal(layoutEl.style.lineHeight, '1.3');
assert.equal(layoutEl.style.textAlign, 'center');
assert.equal(layoutEl.style.maxWidth, '640px');
assert.equal(layoutEl.style.minHeight, '80px');
console.log('PASS: layout, font weight/line height/text align, and max/min size apply as real CSS.');

const hiddenEl = new FakeElement('div');
ArkLayout.applyFrame(hiddenEl, { display: 'hide' });
assert.equal(hiddenEl.style.display, 'none', "the 'hide' display option actually removes the element from layout");
console.log('PASS: the hide display option writes display:none.');

/* Group wrappers: a freshly built group gets a flex-column default even with no stored
   frame at all for its own key (applyFrame is never called on it in that case) -- that
   default is buildGroups()/apply()'s job, covered in tests/layout-dom-grouping.cjs. What
   belongs here is the other half: applyFrame() itself must not erase that default when a
   stored frame for the group's own key exists but never mentions display. */
const groupEl = new FakeElement('div');
groupEl.setAttribute('data-ark-layout-group', 'g1');
ArkLayout.applyGroupDefault(groupEl);
assert.equal(groupEl.style.display, 'flex', 'applyGroupDefault establishes the group default directly');
ArkLayout.applyFrame(groupEl, { color: 'text-strong' });
assert.equal(groupEl.style.display, 'flex', "applyFrame() re-establishes the group's flex default before applying an unrelated property");
assert.equal(groupEl.style.flexDirection, 'column');
ArkLayout.applyFrame(groupEl, { display: 'row' });
assert.equal(groupEl.style.flexDirection, 'row', 'an explicit display on the group itself still overrides the default');
console.log('PASS: applyFrame never erases a group wrapper\'s flex default, and an explicit override still wins.');
