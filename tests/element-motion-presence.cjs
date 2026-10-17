/* Proves the critical regression bar for Part H: an element with NO stored
   ArkElementMotion override gets EXACTLY today's existing createPresence computation
   (byte-for-byte unchanged delay/duration/translate/easing), while an element WITH a
   stored override gets that override's values instead -- a concrete before/after
   comparison against the real extracted ArkUI.createPresence, not a mock of it. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Item {
  constructor(parent, key) {
    this.parentElement = parent; this.hidden = false; this.style = {}; this._attrs = {};
    this.animations = [];
    if (key) this._attrs['data-ark-layout-key'] = key;
  }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this._attrs, name) ? this._attrs[name] : null; }
  setAttribute(name, value) { this._attrs[name] = value; }
  contains(other) { return other === this; }
  animate(frames, options) {
    const animation = { frames, options, cancelled: false, finished: Promise.resolve(), cancel() { this.cancelled = true; } };
    this.animations.push(animation); return animation;
  }
}
class Page {
  constructor(items, pageKey) {
    this.hidden = false; this.style = {}; this._attrs = {}; this.dataset = { arkPage: pageKey };
    this.animations = []; this._items = items; items.forEach((item) => { item.parentElement = this; });
  }
  querySelectorAll() { return this._items.slice(); }
  querySelector() { return null; }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this._attrs, name) ? this._attrs[name] : null; }
  setAttribute(name, value) { this._attrs[name] = value; }
  getAnimations() { return this.animations.filter((a) => !a.cancelled); }
  animate(frames, options) {
    const animation = { frames, options, cancelled: false, finished: Promise.resolve(), cancel() { this.cancelled = true; } };
    this.animations.push(animation); return animation;
  }
}

function buildContext() {
  const sandbox = {
    console,
    ArkUI: { pageCatalog: { about: { path: '/about' } } },
    getComputedStyle: (el) => ({ opacity: el.style.opacity || '1', transform: el.style.transform || 'none' })
  };
  sandbox.window = sandbox; // window === the vm context's own global object, so window.ArkElementMotion
                            // resolves to the SAME binding `var ArkElementMotion = ...` creates below --
                            // the real relationship in a browser, where window === globalThis.
  const context = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('js/content/element-motion.js', 'utf8'), context);
  // scene-state.js's own module-load tail unconditionally calls
  // ArkUI.createSceneState(), which needs ArkEngines.FluxMemoryStore to exist -- the
  // same dependency tests/scene-state.cjs already loads first for the same reason.
  vm.runInContext(fs.readFileSync('js/ark/vendor/engines.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('js/ark/scene-state.js', 'utf8'), context);
  return context;
}

(async () => {
  // ---- Case 1: no stored override anywhere -- every item keeps today's exact
  // existing computed delay/duration/translate/easing. This is the critical
  // regression bar for this whole part. ----
  {
    const context = buildContext();
    const page = new Page([], 'about');
    const items = [new Item(page, 'copy:about.A'), new Item(page, 'copy:about.B'), new Item(page, 'copy:about.C')];
    page._items = items;
    const presence = context.ArkUI.createPresence({ about: page });
    await presence.show('about', false); // reveal -- entering, not immediate
    // maxDelay = min(80, (3-1)*16) = 32; step = 32/2 = 16; delay = step*index
    const expectedDelay = [0, 16, 32];
    items.forEach((item, index) => {
      const animation = item.animations.at(-1);
      assert.equal(animation.options.delay, expectedDelay[index], `item ${index}: default entering delay is unchanged (today's exact stagger)`);
      assert.equal(animation.options.duration, 260, `item ${index}: default entering duration is unchanged (260ms)`);
      assert.equal(animation.options.easing, 'cubic-bezier(.2,.65,.2,1)', `item ${index}: default entering easing is unchanged`);
      assert.equal(animation.frames[0].transform, 'translate3d(0,8px,0)', `item ${index}: default entering translate is unchanged (today's exact +8px)`);
    });
    await presence.hide('about', false); // hide -- exiting, not immediate
    // Exiting uses its OWN smaller maxDelay (48 active-80 split: min(48,(3-1)*8)=16,
    // step=8) -- today's existing asymmetry between entering and exiting, unchanged.
    const expectedExitDelay = [16, 8, 0]; // step * (items.length - index - 1)
    items.forEach((item, index) => {
      const animation = item.animations.at(-1);
      assert.equal(animation.options.delay, expectedExitDelay[index], `item ${index}: default exiting delay is unchanged`);
      assert.equal(animation.options.duration, 160, `item ${index}: default exiting duration is unchanged (160ms)`);
      assert.equal(animation.options.easing, 'linear', `item ${index}: default exiting easing is unchanged`);
      assert.equal(animation.frames[1].transform, 'translate3d(0,-6px,0)', `item ${index}: default exiting translate is unchanged (today's exact -6px)`);
    });
  }

  // ---- Case 2: a missing ArkElementMotion script degrades to the exact same default
  // behavior, never a throw -- the same defensive guarantee fadeCanvas() already has. ----
  {
    const sandbox = { console, ArkUI: { pageCatalog: { about: { path: '/about' } } }, getComputedStyle: (el) => ({ opacity: el.style.opacity || '1', transform: el.style.transform || 'none' }) };
    sandbox.window = sandbox; // no ArkElementMotion defined at all
    const context = vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync('js/ark/vendor/engines.js', 'utf8'), context);
    vm.runInContext(fs.readFileSync('js/ark/scene-state.js', 'utf8'), context);
    const page = new Page([], 'about');
    const items = [new Item(page, 'copy:about.A')];
    page._items = items;
    const presence = context.ArkUI.createPresence({ about: page });
    await assert.doesNotReject(presence.show('about', false), 'show() must not throw when window.ArkElementMotion does not exist at all');
    const animation = items[0].animations.at(-1);
    assert.equal(animation.options.delay, 0, 'with no ArkElementMotion script, the default computation runs exactly as before');
    assert.equal(animation.frames[0].transform, 'translate3d(0,8px,0)');
  }

  // ---- Case 3: ONE item carries a key with a stored override; its siblings (no key,
  // or a key with no stored entry) keep EXACTLY the default values from Case 1, proving
  // the override is additive per-item, never a restructure of the surrounding
  // computation. ----
  {
    const context = buildContext();
    const ArkElementMotion = vm.runInContext('ArkElementMotion', context);
    ArkElementMotion.define(ArkElementMotion.set(ArkElementMotion.defaults(), '/about', 'copy:about.B', {
      direction: 'down', distance: 20, duration: 500, delay: 111, easing: 'ease-out'
    }));
    const page = new Page([], 'about');
    const items = [new Item(page, 'copy:about.A'), new Item(page, 'copy:about.B'), new Item(page, 'copy:about.NOTSTORED')];
    page._items = items;
    const presence = context.ArkUI.createPresence({ about: page });

    await presence.show('about', false); // entering
    // item 0 (no override): exactly Case 1's values for index 0 of a 3-item list.
    const a0 = items[0].animations.at(-1);
    assert.equal(a0.options.delay, 0, 'sibling with no key/override keeps the default entering delay');
    assert.equal(a0.options.duration, 260, 'sibling with no key/override keeps the default entering duration');
    assert.equal(a0.frames[0].transform, 'translate3d(0,8px,0)', 'sibling with no key/override keeps the default entering translate');
    // item 1 (overridden): direction 'down' -> vectorFor('down') = [0,-1]; distance 20;
    // entering sign = +1 -> oy = -20 -> translate3d(0px,-20px,0). duration/delay/easing
    // come straight from the stored entry, not the computed stagger.
    const a1 = items[1].animations.at(-1);
    assert.equal(a1.options.delay, 111, 'overridden item uses the stored delay, not the computed stagger delay');
    assert.equal(a1.options.duration, 500, 'overridden item uses the stored duration');
    assert.equal(a1.options.easing, 'ease-out', 'overridden item uses the stored easing');
    assert.equal(a1.frames[0].transform, 'translate3d(0px,-20px,0)', "overridden item's entering translate comes from direction 'down' + distance 20, not the default +8px");
    // item 2 (key present but nothing stored for it): exactly Case 1's values for index 2.
    const a2 = items[2].animations.at(-1);
    assert.equal(a2.options.delay, 32, 'a key with no stored entry keeps the default entering delay');
    assert.equal(a2.frames[0].transform, 'translate3d(0,8px,0)', 'a key with no stored entry keeps the default entering translate');

    await presence.hide('about', false); // exiting
    const b1 = items[1].animations.at(-1);
    assert.equal(b1.options.delay, 111, 'the override applies identically on the exit path -- same stored entry, no active-specific override values');
    assert.equal(b1.options.duration, 500);
    // exiting sign = -1 -> oy = -1 * (-20) = 20 -> translate3d(0px,20px,0)
    assert.equal(b1.frames[1].transform, 'translate3d(0px,20px,0)', "the override's exiting translate flips sign from its entering translate, the same up/down relationship today's hardcoded 8px/-6px default already has");
    const b0 = items[0].animations.at(-1);
    assert.equal(b0.options.duration, 160, 'the unoverridden sibling still exits with the exact default duration');
    assert.equal(b0.frames[1].transform, 'translate3d(0,-6px,0)', 'the unoverridden sibling still exits with the exact default translate');
  }

  // ---- Case 4: a stored override for a key that is not on the current page (a
  // different route, or a key string that never matches any mounted item) is a safe
  // no-op -- entryFor() only ever matches the page's OWN dataset.arkPage -> route ->
  // key triple, so a stale entry for a route that has since changed can never bleed
  // into a page it does not belong to. ----
  {
    const context = buildContext();
    const ArkElementMotion = vm.runInContext('ArkElementMotion', context);
    ArkElementMotion.define(ArkElementMotion.set(ArkElementMotion.defaults(), '/elsewhere', 'copy:about.A', { direction: 'left', distance: 40 }));
    const page = new Page([], 'about');
    const items = [new Item(page, 'copy:about.A')];
    page._items = items;
    const presence = context.ArkUI.createPresence({ about: page });
    await presence.show('about', false);
    const animation = items[0].animations.at(-1);
    assert.equal(animation.frames[0].transform, 'translate3d(0,8px,0)', 'an override stored for a different route never applies to this page, even with a matching key');
  }

  console.log('PASS: createPresence keeps today\'s exact default stagger unchanged with no override, applies a stored per-element override additively, degrades safely with no ArkElementMotion script, and ignores an override for a route that does not match the current page.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
