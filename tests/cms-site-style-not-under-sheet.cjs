'use strict';
/* Choosing Site style never opens it UNDER a docked overlay (js/admin/sitemap.js setView).

   Why this exists (2026-10-19): Site style (the Theme view, #themeView) docks on the editor's right
   edge -- the same edge Page settings, Publishing status and Version history (overlay level
   'sheet', js/admin/overlay.js) float over, above it. Chosen while Version history was open, the
   dock [1060,1500] lay beneath the panel [1080,1500] at a 1500px window: a 20px sliver, so choosing
   Site style seemed to do nothing, and its tabs could not be clicked (tests/browser/versions.mjs
   timed out on "Visitor defaults" behind `header.versions-head`). Page settings covered it the same
   way. The rule: what the person just chose is the one on top -- choosing Site style closes the
   docked overlays, exactly as their close button would. The canvas and the Site map have no dock of
   their own on that edge, so choosing them leaves an open docked panel where it is.
   The geometry itself is measured in the real browser by tests/browser/versions.mjs. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<body><div id="shell"></div><div id="designView"></div><div id="mapView" hidden></div><div id="themeView" hidden></div><div id="worldView" hidden></div><div id="skinView" hidden></div><div id="kitView" hidden></div>'
  + '<aside id="versionsPanel"></aside><aside id="sheet"></aside><div id="pop"></div></body>', { runScripts: 'outside-only' });
const w = dom.window, doc = w.document;
const calls = [];
const A = w.ArkAdmin = {
  state: { view: 'design', cmsCurrentRoute: '/', cmsRoutes: [] },
  $: (id) => doc.getElementById(id),
  h: (tag, props) => { const n = doc.createElement(tag); Object.entries(props || {}).forEach(([k, v]) => { if (k === 'class') n.className = v; else n.setAttribute(k, v); }); return n; },
  ic: (name) => `<svg class="ic"><use href="#i-${name}"/></svg>`,
  realLinkIndex: () => [], openRoute: () => {},
  layoutStage: () => calls.push('layoutStage'), syncHeader: () => calls.push('syncHeader'), schedule: () => {},
  mountThemeView: () => calls.push('mountThemeView'),
  provide(names) { Object.assign(this, names); },
  later(name) { return (...args) => A[name](...args); },
};
w.eval(fs.readFileSync('js/admin/overlay.js', 'utf8'));
w.eval(fs.readFileSync('js/admin/sitemap.js', 'utf8'));
const { overlay, setView } = A, $ = A.$, closed = [];
const open = (id, level) => overlay.open($(id), { level, onClose: (reason) => { closed.push(id + ':' + reason); $(id).hidden = true; } });
const show = (id) => { $(id).hidden = false; };

/* Version history open, then Site style chosen: Version history closes, Site style shows */
show('versionsPanel'); open('versionsPanel', 'sheet');
setView('theme');
assert.deepEqual(closed.splice(0), ['versionsPanel:view'], 'choosing Site style closes Version history, which would cover its dock');
assert.equal($('themeView').hidden, false, 'Site style is shown');
assert.equal(A.state.view, 'theme');
assert(calls.includes('mountThemeView'), 'Site style is drawn');

/* Page settings opened over Site style, then Site style chosen again (More -> Site style): it was
   chosen, so it is the one on top again */
show('sheet'); open('sheet', 'sheet');
setView('theme');
assert.deepEqual(closed.splice(0), ['sheet:view'], 'choosing Site style again closes Page settings opened over it');

/* a popover is not a docked panel: it is not this rule's to close (its own outside press does) */
open('pop', 'popover');
setView('theme');
assert.deepEqual(closed.splice(0), [], 'a popover is left to its own dismissal');
overlay.close($('pop')); closed.splice(0);

/* the canvas and the Site map have no dock on that edge: an open docked panel stays */
show('versionsPanel'); open('versionsPanel', 'sheet');
setView('design');
setView('map');
assert.deepEqual(closed.splice(0), [], 'choosing the page or the Site map leaves Version history open');
assert(overlay.isOpen($('versionsPanel')));
assert.equal($('themeView').hidden, true, 'leaving Site style hides it');
console.log('PASS: choosing Site style closes the docked overlays that would cover it; the page and the Site map leave them open.');
