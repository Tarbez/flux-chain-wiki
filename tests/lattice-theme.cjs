const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const tokens = {
  'text-strong': '215 34% 95%',
  'text-muted': '216 16% 52%',
  accent: '38 90% 64%',
  primary: '183 75% 62%'
};
const mounted = [];
let themeChanged;
let paintedLines = [];
let paintedPaths = [];
let activityStrokes = 0;
let homeMarkerBorders = 0;
let reduced = true;
let motionChanged;
let canvasCount = 0;
let currentPage = 'zero';
let syncState;
const staticLabels = [];
const activeLabels = [];
const activityPaints = [];
const timers = [];

function canvas() {
  const kind = canvasCount++;
  const context = {
    globalAlpha: 1,
    setTransform() {}, clearRect() {}, beginPath() { this.path = []; }, moveTo(x,y) { this.path.push([x,y]); }, lineTo() {}, rect() {}, clip() {},
    save() { (this.alphaStack ||= []).push(this.globalAlpha); }, restore() { this.globalAlpha = this.alphaStack.pop(); }, translate() {},
    stroke() { if (kind === 0) { paintedLines.push(this.strokeStyle); paintedPaths.push({ style:this.strokeStyle, path:this.path }); } else activityStrokes++; }, fillRect() {},
    fillText(label, x, y) {
      if (kind === 0) staticLabels.push([label, x, y]);
      else { activeLabels.push([label, x, y]); activityPaints.push({ label, alpha: this.globalAlpha }); }
    },
    strokeRect() { if (kind === 0) homeMarkerBorders++; }
  };
  return {
    classList: { values: new Set(), toggle(name, on) { if (on) this.values.add(name); else this.values.delete(name); }, contains(name) { return this.values.has(name); } }, dataset: {}, style: {}, listeners: {}, attrs: {},
    setAttribute(name, value) { this.attrs[name] = value; }, addEventListener(name, callback) { this.listeners[name] = callback; },
    getBoundingClientRect() { return { left: 0, top: 0 }; },
    getContext() { return context; }
  };
}

const persistent = {
  querySelector() { return null; },
  insertBefore(element) { mounted.push(element); }
};
const scene = {
  addEventListener() {},
  querySelector(selector) { return selector === '[data-ark-layer="persistent"]' ? persistent : null; },
  getBoundingClientRect() { return { width: 320, height: 240 }; }
};
const state = {
  get() { return { page: currentPage, paused: false }; },
  subscribe(listener) { syncState = listener; listener(this.get()); }
};
const document = {
  documentElement: {}, hidden: false,
  querySelector() { return scene; },
  createElement(tag) { return tag === 'canvas' ? canvas() : { classList: { toggle() {} }, setAttribute() {} }; },
  addEventListener() {}
};
const window = {
  ArkUI: { sceneState: state, lifecycleTransition: {
    zoomMs: 500, fadeMs: 180, enterMs: 644, totalMs: 854, elementDelayMs: 6, elementGroups: 6,
    opacityOut(elapsed,index) {
      const delay = (5-index)*6;
      return Math.max(0,Math.min(1,1-(elapsed-500-delay)/(180-delay/.8)));
    },
    opacityIn(elapsed,index) { return Math.max(0,Math.min(1,(elapsed-644-index*6)/180)); }
  } }, devicePixelRatio: 1,
  matchMedia() { return { get matches() { return reduced; }, addEventListener(name, listener) { motionChanged = listener; } }; },
  addEventListener() {}, clearTimeout() {},
  setTimeout(listener) { timers.push(listener); return timers.length; }
};
const context = vm.createContext({
  document, window, ArkUI: window.ArkUI,
  performance: { now() { return 0; } },
  getComputedStyle() { return { getPropertyValue(name) { return tokens[name.slice(2)] || ''; } }; },
  MutationObserver: class {
    constructor(listener) { themeChanged = listener; }
    observe() {}
  }
});

vm.runInContext(fs.readFileSync('js/lattice.js', 'utf8'), context);
assert.equal(mounted.filter(element => typeof element.getContext === 'function').length, 2);
assert(paintedLines.includes('hsl(215 34% 95% / 0.11)'));
assert.equal(homeMarkerBorders, 0, 'home grid has no outlined lifecycle boxes');

tokens['text-strong'] = '218 38% 17%';
tokens['text-muted'] = '210 18% 44%';
tokens.accent = '38 88% 43%';
paintedLines = [];
themeChanged();
assert(paintedLines.includes('hsl(218 38% 17% / 0.11)'), 'theme change repaints the grid');
assert(!paintedLines.includes('hsl(215 34% 95% / 0.11)'), 'old ink is not retained');

reduced = false;
motionChanged();
for (let i = 0; i < 5; i++) timers[i]();
assert(activeLabels.length > 0, 'a route lights visible labels');
const labelKeys = new Set(staticLabels.map(parts => parts.join('|')));
assert(activeLabels.every(parts => labelKeys.has(parts.join('|'))), 'routes only visit populated nodes');
assert.equal(activityStrokes, 0, 'activity paints nodes without laser lines');
currentPage = 'about';
syncState(state.get());
assert(mounted[0].classList.contains('lattice-active'), 'the static grid remains on inner pages');
assert(!mounted[1].classList.contains('lattice-active'), 'signal activity stops on inner pages');
currentPage = 'article/why-the-chain-was-retired';
syncState(state.get());
assert(mounted[0].classList.contains('lattice-reading'), 'article routes switch the persistent canvas into reading mode');
const readingPath = paintedPaths.filter(item => item.style === 'hsl(218 38% 17% / 0.11)').at(-1).path;
const readingColumns = readingPath.filter(point => point[1] === 0).map(point => point[0]);
assert(readingColumns[1] - readingColumns[0] > 35, 'article grid cells widen rather than only fading');
currentPage = 'about';
syncState(state.get());
assert(!mounted[0].classList.contains('lattice-reading'), 'leaving an article restores the regular field');

const stages = ['intent','offer','agreement','fulfillment','receipt'];
let navigated;
window.ArkUI.lifecycleStages = stages.map(id => ({ id, title: id.toUpperCase() }));
window.ArkUI.lifecycleContent = Object.fromEntries(stages.map(id => [id, {
  heading: id, lead: id, body: id, note: id,
  facts: [['Input','input'],['Record','record'],['Next','next']]
}]));
window.ArkUI.pageRouter = { navigate(page) { navigated = page; } };
currentPage = 'lifecycle';
syncState(state.get());
const majorLine = 'hsl(218 38% 17% / 0.31)';
const majorSpacing = () => {
  const path = paintedPaths.filter(item => item.style === majorLine).at(-1).path;
  const vertical = path.filter(point => point[1] === 0).map(point => point[0]);
  return vertical[1] - vertical[0];
};
const overviewSpacing = majorSpacing();
assert(mounted[1].classList.contains('lattice-active') === false, 'home signal activity stays off in lifecycle');
assert(activeLabels.some(parts => parts[0] === 'AGREEMENT'), 'the five stage nodes are painted on the activity canvas');
mounted[1].listeners.click({ clientX: 160, clientY: 150 });
assert.equal(navigated, 'lifecycle/intent', 'a painted canvas node navigates directly to its stage');
assert.equal(mounted[1].attrs.role, 'application');
currentPage = 'lifecycle/offer';
const labelsBeforeStage = staticLabels.length;
syncState(state.get());
assert(majorSpacing() > overviewSpacing * 2, 'stage enlarges grid cells instead of only translating them');
assert.equal(mounted[0].style.transform, 'none', 'zoomed grid is rendered at screen resolution');
assert.equal(mounted[0].style.opacity, undefined, 'the grid remains visible behind transparent stage content');
assert(staticLabels.length - labelsBeforeStage > 100, 'zoomed field retains populated names and symbols');
assert.equal(activityStrokes, 0, 'stage content has no stroked panel or box layer');
paintedLines = [];
themeChanged();
assert(paintedLines.includes('hsl(218 38% 17% / 0.31)'), 'theme change keeps the zoomed field rendered');
mounted[1].listeners.keydown({ key: 'ArrowRight', preventDefault() {} });
assert(mounted[1].attrs['aria-label'].includes('Record: record'), 'keyboard navigation changes the focused canvas detail');

const frames=[];
window.requestAnimationFrame=frame=>{frames.push(frame);return frames.length;};
window.cancelAnimationFrame=()=>{};
window.ArkUI.lifecycleContent.agreement.heading='Stage headline';
currentPage='lifecycle/agreement';
syncState(state.get());
frames.shift()(100);
activityPaints.length=0;
frames.shift()(100+window.ArkUI.lifecycleTransition.enterMs+10);
const alphaFor=label=>activityPaints.filter(paint=>paint.label===label).at(-1)?.alpha;
assert(alphaFor('AGREEMENT LIFECYCLE.')>alphaFor('AGREEMENT'),'canvas header enters before the stage title');
assert(alphaFor('AGREEMENT')>alphaFor('STAGE HEADLINE'),'stage title enters before the detail copy');

const home = fs.readFileSync('css/home.css', 'utf8');
assert(home.includes('background:hsl(var(--canvas)) !important;'));
assert(home.includes('-webkit-text-stroke:1px hsl(var(--text-strong));'));
console.log('PASS: home theme colors, canvas repaint, and routes through populated nodes.');
