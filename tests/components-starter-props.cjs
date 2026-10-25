'use strict';
/* Regression: a block created with nothing typed in rendered as NOTHING. The editor's state
   "+ Add content block" created its master with props {} -- a Text block with no heading and
   no body is an empty <section> of zero size. Added as a new state's content it was
   invisible ("I added a state and nothing happened"), and with the default 'self' trigger it
   was also unclickable, so the group could never be clicked past it. Found in Chromium
   (tests/browser/studio-flows.mjs): the state's anchor measured 0 x 0.
   ArkComponents.starterProps(resolver, text) puts the text into the one prop each resolver
   shows as visible text; every such prop must be one the resolver really declares, or
   sanitize() would silently drop it and the block would be empty again. Rendered through the
   real ArkUI builder and the real block resolvers to prove the text actually shows. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<body></body>');
/* the same sandbox shape tests/components-dom.cjs uses, with a real (jsdom) document */
const context = { document: dom.window.document, console, ArkCopy: { isKey: () => false }, matchMedia: () => ({ matches: false }) };
context.window = context;
vm.createContext(context);
for (const file of ['js/ark/atomizer.js', 'js/ark/flux.js', 'js/ark/runtime.js', 'js/ark/dash-kit.js', 'js/content/components.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
const C = context.ArkComponents;
assert.equal(typeof C.starterProps, 'function', 'ArkComponents exposes starterProps');

for (const resolver of C.resolvers) {
  const props = C.starterProps(resolver, 'State 1');
  const keys = Object.keys(props);
  if (resolver === 'RBLOCK_DIVIDER_V1') { assert.equal(keys.length, 0, 'a divider has no text and needs none'); continue; }
  /* a block with no text prop at all (the card slot draws the visitor's card) gets no starter text: decided by its
     props' kinds, not by a list of names */
  const fields = C.fieldsOf({ resolver, props: {} });
  if (fields.length && !fields.some((f) => f.kind === 'line' || f.kind === 'text')) { assert.equal(keys.length, 0, resolver + ' has no text prop, so it gets no starter text'); continue; }
  /* a captured component has no fixed prop list -- its slots come from its own tree, and its
     starter text is derived from real markup by ArkComponents.starterFrom (tests/components-capture.cjs) */
  if (resolver === C.CAPTURED) { assert.equal(keys.length, 0, 'starterProps never invents a slot for a captured tree'); continue; }
  assert.equal(keys.length, 1, resolver + ' gets exactly one starter prop');
  assert(C.resolverProps[resolver].includes(keys[0]), resolver + ': the starter prop "' + keys[0] + '" is one the resolver declares');
  const draft = C.createMaster({}, 'm1', resolver, props, 'Starter');
  assert.equal(draft.masters.m1.props[keys[0]], 'State 1', resolver + ': the starter text survives sanitize()');
}
assert.equal(Object.keys(C.starterProps('RBLOCK_TEXT_V1', '')).length, 0, 'no text, no prop');

/* the real Text block renders the starter heading as visible text */
{
  vm.runInContext(fs.readFileSync('js/resolvers/blocks/rblock-text-v1.js', 'utf8'), context);
  const host = dom.window.document.createElement('div'); host.setAttribute('data-ark-insert', 'a1'); dom.window.document.body.appendChild(host);
  let draft = C.createMaster({}, 'm1', 'RBLOCK_TEXT_V1', C.starterProps('RBLOCK_TEXT_V1', 'State 1'), 'S');
  draft = C.insertInstance(draft, '/', 'a1', 'i1', 'm1');
  C.render(host, '/', 'a1', draft);
  assert.match(host.textContent, /State 1/, 'a Text block made from starter props renders its text');
  const empty = dom.window.document.createElement('div'); empty.setAttribute('data-ark-insert', 'a2'); dom.window.document.body.appendChild(empty);
  let bare = C.createMaster({}, 'm2', 'RBLOCK_TEXT_V1', {}, 'S');
  bare = C.insertInstance(bare, '/', 'a2', 'i2', 'm2');
  C.render(empty, '/', 'a2', bare);
  assert.equal(empty.textContent.trim(), '', 'for contrast: the old props {} block renders no text at all');
  console.log('PASS: starter props render as visible text through the real Text block resolver.');
}
console.log('PASS: every text-bearing block resolver gets one declared, sanitize-proof starter prop.');
