'use strict';
/* The editor's ONE overlay stack (js/admin/overlay.js).

   Why this exists (docs/ux-audit/cms.md P1-12, and the "4 close-button styles" of section (c)):
   six overlay kinds each carried their own open/close rules. The account menu closed on a press in
   the editor only, so it stayed open over the canvas; Versions docked beside the sheet and both
   covered each other on a narrow screen; the sheet's Esc had to know about every other overlay to
   stay out of their way; and there were four different close buttons. Now each overlay registers
   with one stack: one per level, Esc closes the topmost only, a press outside or on the canvas
   closes the popovers but never a docked sheet, and there is one close button. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<body><button id="anchor"></button><div id="menu"></div><div id="pop"></div><div id="sheet"><input id="field"></div><div id="versions"></div><p id="elsewhere"></p></body>', { runScripts: 'outside-only' });
const w = dom.window, doc = w.document;
w.ArkAdmin = {
  h: (tag, props) => { const n = doc.createElement(tag); Object.entries(props || {}).forEach(([k, v]) => { if (k === 'class') n.className = v; else n.setAttribute(k, v); }); return n; },
  ic: (name) => `<svg class="ic"><use href="#i-${name}"/></svg>`,
  provide(names) { Object.assign(this, names); },
};
w.eval(fs.readFileSync('js/admin/overlay.js', 'utf8'));
const overlay = w.ArkAdmin.overlay, $ = (id) => doc.getElementById(id), closed = [];
const open = (id, opts) => overlay.open($(id), Object.assign({ onClose: (reason) => closed.push(id + ':' + reason) }, opts));
const press = (id) => $(id).dispatchEvent(new w.Event('pointerdown', { bubbles: true }));
const esc = () => doc.body.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));

open('menu', { anchor: $('anchor') });
assert.equal($('anchor').getAttribute('aria-expanded'), 'true', 'the anchor says its overlay is open');
open('pop');
assert.deepEqual(closed.splice(0), ['menu:replaced'], 'one popover at a time: opening another closes the first');
assert.equal($('anchor').getAttribute('aria-expanded'), 'false');

open('sheet', { level: 'sheet' });
press('pop');
assert(overlay.isOpen($('pop')), 'a press inside a popover keeps it');
press('elsewhere');
assert.deepEqual(closed.splice(0), ['pop:outside'], 'a press outside closes the popover, never the docked sheet');
assert(overlay.isOpen($('sheet')));

open('pop');
esc();
assert.deepEqual(closed.splice(0), ['pop:escape'], 'Esc closes the topmost overlay only');
esc();
assert.deepEqual(closed.splice(0), ['sheet:escape'], 'the next Esc closes the sheet under it');

open('sheet', { level: 'sheet' });
open('versions', { level: 'sheet' });
assert.deepEqual(closed.splice(0), ['sheet:replaced'], 'the sheet and Versions share one docked slot');

open('pop');
overlay.closeCanvas();   /* what a press on the canvas does (the canvas reports it: js/admin/bridge.js) */
assert.deepEqual(closed.splice(0), ['pop:canvas'], 'a press on the canvas closes the popovers, not the docked panel');
assert(overlay.isOpen($('versions')));
const bridge = fs.readFileSync('js/admin/bridge.js', 'utf8'), main = fs.readFileSync('js/main.js', 'utf8');
assert(/'defxn-cms-preview-pointerdown'[\s\S]{0,200}overlay\.closeCanvas\(\)/.test(bridge) && /postMessage\(\{ type: 'defxn-cms-preview-pointerdown' \}/.test(main), 'the canvas reports a press, and the editor closes its popovers on it -- not on losing focus, which the canvas also takes by itself');

overlay.forget($('versions'));
assert(!overlay.isOpen($('versions')) && closed.length === 0, 'an overlay that closed itself leaves the stack without its onClose');

const button = overlay.closeButton(() => closed.push('x'));
assert.equal(button.className, 'ov-close');
assert.equal(button.getAttribute('aria-label'), 'Close');
assert.match(button.getAttribute('title'), /Esc/);
button.click();
assert.deepEqual(closed.splice(0), ['x'], 'the one close button runs what it was given');

/* every close button in the editor is that one */
const sources = ['admin-app.html', 'js/admin/toolbar.js', 'js/admin/header.js', 'js/admin/versions-panel.js'].map((f) => fs.readFileSync(f, 'utf8')).join('\n');
assert(!/class="ibtn" id="sheetClose"/.test(sources) && /class="ov-close" id="sheetClose"/.test(sources), 'the sheet uses the one close button');
assert(!/class="tb-pop-x" aria-label="Close"/.test(sources) && !/class: 'versions-close'/.test(sources), 'no second close-button style is left');
console.log('PASS: one overlay stack: one per level, Esc closes the topmost, outside/canvas presses close popovers only, one close button.');
