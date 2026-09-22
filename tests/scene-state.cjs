const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let reduced = false;
class Element {
  constructor(hidden = false) { this.hidden = hidden; this.style = {}; this.attrs = {}; this.animations = []; }
  setAttribute(key, value) { this.attrs[key] = value; if (key === 'hidden') this.hidden = true; }
  removeAttribute(key) { delete this.attrs[key]; if (key === 'hidden') this.hidden = false; }
  getAnimations() { return this.animations.filter(a => !a.cancelled); }
  animate(frames) {
    let resolve, reject;
    const animation = { cancelled: false, finished: new Promise((yes, no) => { resolve = yes; reject = no; }),
      cancel() { this.cancelled = true; const error = new Error('Cancelled'); error.name = 'AbortError'; reject(error); },
      finish: () => { Object.assign(this.style, frames.at(-1)); resolve(); } };
    this.animations.push(animation); return animation;
  }
}
const context = vm.createContext({ console, ArkUI: {}, window: { matchMedia: () => ({ matches: reduced }) },
  document: { querySelector: () => null, createElement: () => new Element() },
  getComputedStyle: el => ({ opacity: el.style.opacity || '1', transform: el.style.transform || 'none' }) });
for (const file of ['js/ark/vendor/engines.js', 'js/content/learnings.js','js/content/article-index.js', 'js/ark/scene-state.js', 'js/ark/flux.js', 'js/scene.flux.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), context);
(async () => {
  const state = context.ArkUI.sceneState;
  state.selectShape('orb'); state.navigate('proximity');
  assert.equal(state.mesh(state.get()).shape, 'proximity');
  assert.equal(state.mesh(state.get()).dissolve, .5);
  state.selectShape('knot'); assert.equal(state.get().shape, 'orb');
  state.navigate('zero'); assert.equal(state.mesh(state.get()).shape, 'orb');
  assert.equal(state.mesh(state.get()).dissolve, 0);
  assert.throws(() => state.navigate('missing'));
  state.navigate('learnings'); assert.equal(state.mesh(state.get()).shape, 'zero');
  context.LearningContent.articles.forEach(article => {
    state.navigate('article/' + article.slug);
    assert.equal(state.mesh(state.get()).text, article.title);
    state.setWord('  My   title  '); assert.equal(state.mesh(state.get()).text, 'My title');
    state.setWord(''); assert.equal(state.mesh(state.get()).text, article.title);
  });
  state.rotate(1, 900); assert.equal(state.get().rotation[1], 180);
  state.rotate(0, -900); assert.equal(state.get().rotation[0], -90);
  state.setWord('<script>alert(1)</script>'); assert.equal(state.mesh(state.get()).text, '<script>alert(1)</script>');
  state.navigate('zero'); assert.equal(state.mesh(state.get()).shape, 'orb');
  const home = new Element(), experiment = new Element(true);
  const presence = context.ArkUI.createPresence({ zero: home, proximity: experiment });
  const first = presence.show('proximity');
  assert(home.inert && !experiment.inert, 'incoming page is interactive during its reveal');
  const reverse = presence.show('zero');
  home.animations.at(-1).finish(); experiment.animations.at(-1).finish();
  await Promise.all([first, reverse]);
  assert.equal(home.hidden, false); assert.equal(home.inert, false);
  assert.equal(experiment.hidden, true); assert.equal(experiment.inert, true);
  // Stale cancelled exits cannot hide a page even if their old callback settles later.
  for (let i = 0; i < 10; i++) {
    const a = presence.show('proximity'); const b = presence.show('zero');
    home.animations.at(-1).finish(); experiment.animations.at(-1).finish(); await Promise.all([a, b]);
    assert.equal(home.hidden, false);
  }
  reduced = true; await presence.show('proximity');
  assert.equal(home.hidden, true); assert.equal(experiment.hidden, false); assert.equal(experiment.inert, false);
  const tree = context.ArkFlux.parse(context.F_SCENE_RZERO_V0);
  const persistent = tree.children.find(n => n.props.N === 'persistent');
  const page = tree.children.find(n => n.props.N === 'outlet');
  assert(persistent && page && persistent !== page);
  assert.equal(persistent.children[0].resolver, 'RRING_V1');
  assert.equal(page.children.length, 0);
  assert(!tree.children.some(n => n.props.N === 'zero'), 'Home is a separately loaded page');
  assert(!page.children.some(n => /RING|HALO/.test(n.resolver)));
  console.log('PASS: actual Flux store, page-owned mesh, retained home choice, cancelled exit races, repeated reversal, inert/ARIA, reduced motion, persistent ARK topology.');
})().catch(error => { console.error(error); process.exitCode = 1; });
