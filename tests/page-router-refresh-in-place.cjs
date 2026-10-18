'use strict';
/* Same route => no transition: the page router's refresh({ inPlace: true }) (js/ark/page-router.js).

   Why this exists: the editor's canvas re-renders the route it shows whenever a draft changes
   (js/main.js, 'defxn-cms-preview-state' -> ArkUI.pageRouter.refresh). refresh() used to remove
   the page first and then NAVIGATE to it again -- an exit, a module reload, an entrance and a
   background fade, the full route-change transition -- so every committed inline edit and every
   Page fields keystroke flashed the canvas blank. A re-render of the same route is not a
   navigation. In place, the page showing stays up until its rebuilt replacement is mounted and
   shown in the same task: no frame without a page, no exit or entrance animation, no background
   fade, no 'running' transition state, the scroll position kept; and a rebuild that fails puts
   the old page back. Plain refresh() keeps its transition (asserted too, so the difference is
   the option, not an accident). */
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');

const animations = [];
class Element {
  constructor() { this.children = []; this.dataset = {}; this.attrs = {}; this.style = {}; this.scrollTop = 0; this.hidden = false;
    this.classList = { values: new Set(), add(n) { this.values.add(n); }, remove(n) { this.values.delete(n); }, contains(n) { return this.values.has(n); }, toggle(n, on) { if (on) this.add(n); else this.remove(n); } }; }
  appendChild(el) { el.parent = this; this.children.push(el); return el; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((el) => el !== this); this.parent = null; }
  setAttribute(k, v) { this.attrs[k] = v; } removeAttribute(k) { delete this.attrs[k]; }
  getAnimations() { return []; } contains(el) { return this === el || this.children.some((c) => c.contains(el)); }
  focus() {} querySelector() { return null; } querySelectorAll() { return []; }
  animate(frames, timing) { animations.push({ el: this, frames, timing }); return { finished: Promise.resolve(), cancel() {} }; }
}
const document = { head: new Element(), documentElement: new Element(), createElement: () => new Element(), querySelector: () => null, activeElement: null };
const fades = [];
const window = { scrollY: 0, scrollTo(x, y) { this.scrollY = y; }, matchMedia: () => ({ matches: false }), dispatchEvent() {},
  ArkCanvasTransitions: { apply: (el, phase) => fades.push(phase) } };
const context = vm.createContext({ console, document, window, location: { protocol: 'https:', pathname: '/', search: '', hash: '', origin: 'https://defxn.test' }, history: { pushState() {}, replaceState() {} }, Event: class { constructor(t) { this.type = t; } },
  getComputedStyle: () => ({ opacity: '1', transform: 'none' }), ArkUI: { prefersReducedMotion: () => false } });
for (const file of ['js/ark/vendor/engines.js', 'js/content/learnings.js', 'js/content/article-index.js', 'js/ark/scene-state.js', 'js/pages/catalog.js', 'js/ark/route.js', 'js/ark/page-router.js'])
  vm.runInContext(fs.readFileSync(file, 'utf8'), context);

(async () => {
  const scene = new Element(), persistent = new Element(), outlet = new Element();
  scene.appendChild(persistent); scene.appendChild(outlet);
  scene.querySelector = (selector) => (selector === '[data-ark-layer="persistent"]' ? persistent : null);
  /* every value the router writes to scene.dataset.transition, in order */
  const transitions = [];
  let transition = 'idle';
  Object.defineProperty(scene.dataset, 'transition', { get: () => transition, set: (v) => { transition = v; transitions.push(v); }, enumerable: true });
  let gate = null, fail = false, built = 0;
  const disposed = [];
  const module = { mount(host) { built += 1; const el = host.appendChild(new Element()); el.build = built; return el; } };
  const router = context.ArkUI.createPageRouter({ scene, outlet, state: context.ArkUI.sceneState, writeHistory: () => {},
    load: async () => { if (gate) await gate.promise; if (fail) throw new Error('fixture: the rebuild fails'); return module; } });
  router.onMount((el) => () => disposed.push(el.build));
  const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };

  assert(await router.navigate('about'));
  const first = router.pages.about;
  first.scrollTop = 240;
  transitions.length = 0; fades.length = 0; animations.length = 0;

  /* in place: the old page stays up, visible, until its replacement exists */
  gate = deferred();
  const pending = router.refresh({ inPlace: true });
  await Promise.resolve();
  assert.deepEqual(outlet.children, [first], 'while the rebuild loads, the page showing is still the only page in the outlet');
  assert.equal(first.hidden, false, 'and it is still visible: no frame without a page');
  gate.resolve(); gate = null;
  assert.equal(await pending, true);
  const second = router.pages.about;
  assert.notEqual(second, first, 'the route was rebuilt from the registries (a new page element)');
  assert.deepEqual(outlet.children, [second], 'the old page is gone once the new one shows');
  assert.equal(second.hidden, false);
  assert.deepEqual(disposed, [first.build], 'the old page\'s cleanups ran once');
  assert.equal(transitions.includes('running'), false, 'no route-change transition state: ' + transitions.join(','));
  assert.deepEqual(fades, [], 'no background fade out/in');
  assert.equal(animations.length, 0, 'no exit or entrance animation');
  assert.equal(second.scrollTop, 240, 'the scroll position is kept');
  assert.equal(router.active, 'about');

  /* a failed in-place rebuild puts the page that was showing back */
  fail = true;
  assert.equal(await router.refresh({ inPlace: true }), false);
  assert.equal(router.active, 'about', 'the route is still active');
  assert.equal(router.pages.about, second, 'the page that was showing is back');
  assert.deepEqual(outlet.children, [second]);
  assert.equal(second.hidden, false);
  fail = false;

  /* plain refresh() still plays the transition: the in-place rule is the option, not an accident */
  transitions.length = 0; fades.length = 0;
  assert(await router.refresh());
  assert(transitions.includes('running'), 'plain refresh() is a navigation, with its transition');
  assert.deepEqual(fades, ['out', 'in']);

  /* the editor's canvas uses the in-place form for every draft re-sent to the route it shows */
  const main = fs.readFileSync('js/main.js', 'utf8');
  assert(/defxn-cms-preview-state[\s\S]*ArkUI\.pageRouter\.refresh\(\{ inPlace: true \}\)/.test(main), 'js/main.js re-renders a draft in place');
  console.log('PASS: refresh({ inPlace }) rebuilds the same route with no transition and no blank frame');
})().catch((error) => { console.error(error); process.exit(1); });
