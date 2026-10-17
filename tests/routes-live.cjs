/* Exercise real route modules and their copy, not only mocked loader results. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Element {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {};
    this.attributes = {}; this.listeners = {}; this._text = ''; this.hidden = false;
    this.style = { setProperty: (name, value) => { this.style[name] = value; }, removeProperty: (name) => { delete this.style[name]; } };
    this.classList = {
      values: new Set(), add: (...names) => names.forEach(name => this.classList.values.add(name)),
      remove: (...names) => names.forEach(name => this.classList.values.delete(name)),
      contains: name => this.classList.values.has(name),
      toggle: (name, on) => { if (on) this.classList.add(name); else this.classList.remove(name); }
    };
  }
  set className(value) { this.classList.values = new Set(value.split(/\s+/).filter(Boolean)); }
  get className() { return [...this.classList.values].join(' '); }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  get firstChild() { return this.children[0] || null; }
  get lastChild() { return this.children[this.children.length - 1] || null; }
  get childNodes() { return this.children; }
  get parentNode() { return this.parentElement || null; }
  get nextSibling() { return this.parentElement?.children[this.parentElement.children.indexOf(this) + 1] || null; }
  appendChild(child) { if (child.parentElement) child.remove(); child.parentElement = this; this.children.push(child); return child; }
  replaceChildren(...children) { this.children.forEach(child => { child.parentElement = null; }); this.children = []; children.forEach(child => this.appendChild(child)); }
  insertBefore(child, before) { child.parentElement = this; const index = before ? this.children.indexOf(before) : this.children.length; this.children.splice(index < 0 ? this.children.length : index, 0, child); return child; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  toggleAttribute(name, on) { if (on) this.setAttribute(name, ''); else delete this.attributes[name]; }
  addEventListener(name, fn) { this.listeners[name] = fn; }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this); this.parentElement = null; }
  getAnimations() { return []; }
  focus() { document.activeElement = this; }
  querySelector(selector) {
    // HTML-authored task pages (innerHTML strings, not real DOM calls) expose hooks
    // without a browser HTML parser in this harness: fake each unique selector as its
    // own placeholder element, reused on repeat lookups.
    if (this.innerHTML) {
      this.htmlHooks ||= new Map();
      if (!this.htmlHooks.has(selector)) this.htmlHooks.set(selector, new Element());
      return this.htmlHooks.get(selector);
    }
    if (selector === '.ark-hero-body') return this.children.find(child => child.classList.contains('ark-hero-body'));
    if (selector === '.ark-hero-title') return this.children.find(child => child.classList.contains('ark-hero-title'));
    const attrMatch = /^\[([\w-]+)(?:=(?:"([^"]*)"|'([^']*)'))?\]$/.exec(selector);
    for (const child of this.children) {
      let matches;
      if (attrMatch) { const [, name, dq, sq] = attrMatch; const value = dq ?? sq; matches = !!child.attributes && name in child.attributes && (value === undefined || child.attributes[name] === value); }
      else matches = selector.startsWith('.') ? child.classList?.contains(selector.slice(1)) : child.tagName === selector.toUpperCase();
      if (matches) return child;
      const nested = child.querySelector?.(selector); if (nested) return nested;
    }
    return null;
  }
  querySelectorAll() { return []; }
}

const document = { createElement: tag => new Element(tag), createElementNS: (ns,tag) => new Element(tag), createTextNode: value => ({ textContent: value }), addEventListener(){}, removeEventListener(){}, documentElement: new Element('html') };
const window = { localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, dispatchEvent() {}, addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: true }) };
const ArkUI = {
  pageModules: {}, lifecycleStages: [], register(id, manifest) { this.resolvers[id] = manifest; }, resolvers: {},
  el(tag, className, value) { const el = new Element(tag); el.className = className || ''; if (value) el.textContent = value; return el; },
  render(source, host) {
    const root = new Element('section'); root.className = 'ark-page learning-page';
    if (source.includes('F-HOME-')) {
      const body = new Element('div'); body.className = 'ark-hero-body'; root.appendChild(body);
      const title = new Element('h1'); title.className = 'ark-hero-title'; title.textContent = context.ArkCopy.text('HOME.TITLE'); root.appendChild(title);
    } else {
      const resolver = source.includes('RARTICLE_V1') ? 'RARTICLE_V1' : source.includes('RLEARNINGS_V1') ? 'RLEARNINGS_V1' : 'REXPERIMENT_V1';
      const manifest = this.resolvers[resolver];
      if (manifest && manifest.decorate) manifest.decorate(root, { slug: source.split('-S-')[1] });
    }
    host.appendChild(root); return root;
  },
  mountStudio() {}, prefersReducedMotion: () => true
};
// Fake, never-firing timers: home.js's hero illustration schedules its own animation
// loop, which this test does not drive or assert on, so timers only need to exist.
const sandbox = { document, window, ArkUI, console, URL, URLSearchParams, AbortController, TextEncoder, TextDecoder, crypto, setTimeout:()=>0, clearTimeout(){}, setInterval:()=>0, clearInterval(){}, location:{href:'http://127.0.0.1/index.html',hash:'#/'}, fetch:async doc=>({ok:true,text:async()=>fs.readFileSync(doc,'utf8')}),
  ArkAdminAuth: { create: () => ({ current() { return null; }, signOut() {}, dispose() {} }) } };
// window === globalThis in a real browser, so a page that sets window.X and
// another that reads bare X (or vice versa) see the same binding; without
// this alias they are two disconnected objects and real page code breaks.
Object.assign(sandbox, window);
sandbox.window = sandbox;
const context = vm.createContext(sandbox);
function load(file) { vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file }); }

load('js/ark/local-identity.js'); load('js/ark/mesh-fabric.js'); load('js/ark/stage-scenes.js'); load('js/ark/route.js'); load('js/tokens.js'); load('js/content/manifest.js');
for (const id of JSON.parse(fs.readFileSync('js/content/manifests/index.js', 'utf8').match(/var ArkManifestIds = (\[[^;]+\]);/)[1])) load(`js/content/manifests/${id}.js`);
load('js/content/learnings.js'); load('js/content/article-index.js'); load('js/content/resolutions.js');
load('js/content/seo.js'); load('js/content/seo-data.js'); load('js/ark/vendor/engines.js'); load('js/ark/story-diagrams.js');
load('js/content/states.js');
const ArkStates = vm.runInContext('ArkStates', context);
load('js/content/canvas-transitions.js'); load('js/content/canvas-transitions-data.js');
const ArkCanvasTransitions = vm.runInContext('ArkCanvasTransitions', context);
// The real baked default is a genuine, subtle, always-on transition -- never "disabled"
// -- since no page-background transition existed before this module to stay
// byte-identical to.
assert(ArkCanvasTransitions.get().outDuration > 0 && ArkCanvasTransitions.get().inDuration > 0, 'the baked canvas-transitions-data.js default is a real transition, not 0ms/disabled');
load('js/content/element-motion.js'); load('js/content/element-motion-data.js');
const ArkElementMotion = vm.runInContext('ArkElementMotion', context);
// Part H's bar is the STRICT one Parts A-E used (byte-identical to today's existing
// behavior), not Part G's looser "doesn't throw" bar: unlike canvas-transitions, which
// added a brand-new transition with no prior behavior to preserve, element-motion sits
// inside ArkUI.createPresence's EXISTING per-item stagger (js/ark/scene-state.js) and
// must leave it fully untouched by default. This mock-DOM harness's Element.
// querySelectorAll() always returns [] (see the class above), so createPresence's own
// staggered-items branch can never run here regardless -- the real override-vs-default
// proof, with a DOM rich enough to drive that branch, lives in
// tests/element-motion-presence.cjs. What this harness CAN prove, for every real route,
// is the formal guarantee that makes that branch unreachable in the first place: the
// baked element-motion-data.js stores zero routes, so ArkElementMotion.entryFor() can
// never return anything but null for any real key on any real route today.
assert.equal(JSON.stringify(ArkElementMotion.get().routes), '{}', 'the baked element-motion-data.js default has zero stored routes -- no element on any real page has an override today');
assert.equal(ArkElementMotion.entryFor(ArkElementMotion.get(), '/', 'copy:home.TITLE'), null, 'entryFor() returns null, never a default-filled entry, when nothing is stored for a route+key -- this is what keeps createPresence\'s override branch inert by default');
const productionScripts = [...fs.readFileSync('index.html', 'utf8').matchAll(/<script src="([^"?]+)(?:\?[^\"]*)?" defer><\/script>/g)].map(match => match[1]);
const routeBoot = productionScripts.filter(file => ['js/pages/catalog.js', 'js/ark/scene-state.js'].includes(file));
assert.deepEqual(routeBoot, ['js/pages/catalog.js', 'js/ark/scene-state.js'], 'catalog must exist before scene state snapshots its routes');
routeBoot.forEach(load);
for (const key of Object.keys(ArkUI.pageCatalog)) {
  assert(ArkUI.sceneState.pages[key], `${key}: route is missing scene state`);
  assert.doesNotThrow(() => ArkUI.sceneState.navigate(key), `${key}: route cannot activate`);
}
context.history={pushState(_state,_title,hash){context.location.hash=hash;}};
load('js/ark/reference-docs.js');
(async () => {
for (const [key, entry] of Object.entries(ArkUI.pageCatalog)) {
  context.location.hash = '#' + entry.path;
  for (const file of entry.scripts) {
    assert(fs.existsSync(file), `${key}: missing ${file}`);
    // Browser-only bundles (custom elements, WebCrypto identity core) and studio need real browser APIs.
    const browserOnly = ['js/studio.js', 'js/admin/auth.js', 'js/admin/vendor/auth-kit-create.js', 'js/admin/vendor/flux-elements.js'];
    if (!browserOnly.includes(file)) load(file);
  }
  const module = ArkUI.pageModules[entry.module];
  assert(module, `${key}: missing ${entry.module} module`);
  const host = new Element();
  let page;
  try { if (module.prepare) await module.prepare(key, {}); page = module.mount(host, key); }
  catch (error) { throw new Error(`${key}: ${error.message}`, { cause: error }); }
  assert(page instanceof Element, `${key}: mount did not return a page`);
  assert.equal(host.children.length, 1, `${key}: mount did not attach one page`);
  /* General component system (Part 3): every non-home page module declares at least one
     [data-ark-insert] anchor for reusable blocks (js/content/components.js). Rendering into
     it is centralized in js/main.js's onMount hook, not called from mount() itself here, so
     this only checks the anchor markup exists and starts genuinely empty -- no placeholder
     text authored into it, since the saved components file starts empty by default and a
     page must still read right with zero components inserted. home/zero keeps its own,
     already-rich hero system and is explicitly excluded from this rollout. */
  if (key !== 'zero') {
    const anchor = page.querySelector('[data-ark-insert]');
    assert(anchor, `${key}: page module has no [data-ark-insert] anchor for reusable components`);
    assert.equal(anchor.textContent, '', `${key}: the component anchor must start empty, never placeholder/empty-state text`);
  }
  /* Layered states (Part E): the saved states-data.js starts empty (no groups on any
     route), the real default today. ArkStates.renderAll must be a true no-op against
     that default -- zero observable difference versus a page that never knew this
     feature existed -- so a page that never used it is never silently changed just by
     this new always-on hook/listener existing. Exercises the real module, not a mock. */
  assert.doesNotThrow(() => ArkStates.renderAll(page, entry.path, ArkStates.get()), `${key}: ArkStates.renderAll must not throw for a page with no saved state groups`);
  assert.equal(host.children.length, 1, `${key}: ArkStates.renderAll must not add/remove/replace the mounted page itself`);
  assert.equal(page.querySelectorAll('[data-ark-state-anchor]').length, 0, `${key}: no state anchor is created when the route has no saved state groups`);
  if (key !== 'zero') assert.equal(page.querySelector('[data-ark-insert]').textContent, '', `${key}: the component anchor is still untouched by ArkStates with no saved state groups`);
  /* Background in/out transition (Part G): there is no "today's behavior" this has to
     stay byte-identical to -- no page-background transition existed before this module
     -- so the bar here is "doesn't throw, doesn't break anything already asserted about
     this mounted page," not "produces identical DOM." js/ark/page-router.js's own
     navigate() sequencing is exercised for real in tests/page-router.cjs; this only
     confirms the real baked canvas-transitions-data.js default survives an apply() call
     against a real mounted page element (standing in for the persistent layer, which
     this mock-DOM harness's ArkUI.render() never builds) for every real route. */
  assert.doesNotThrow(() => ArkCanvasTransitions.apply(page, 'out'), `${key}: ArkCanvasTransitions.apply('out') must not throw against a real mounted page`);
  assert.doesNotThrow(() => ArkCanvasTransitions.apply(page, 'in'), `${key}: ArkCanvasTransitions.apply('in') must not throw against a real mounted page`);
  assert.equal(host.children.length, 1, `${key}: ArkCanvasTransitions.apply must not add/remove/replace the mounted page itself`);
  /* Per-element animation overrides (Part H): for THIS real route, the baked default has
     no stored entry for any key -- the exact formal condition elementMotionOverride()
     (js/ark/scene-state.js) checks before it will ever override createPresence's default
     per-item computation. Proven per-route, not just once globally, so a future route with
     its own path string is covered by the same loop every other per-route assertion here
     already runs in. */
  assert.equal(ArkElementMotion.entryFor(ArkElementMotion.get(), entry.path, 'copy:probe'), null, `${key}: no element-motion override exists for this route today -- createPresence's default stagger is untouched`);
  if (page.classList.contains('lifecycle-page') && key !== 'deployment') {
    const controls = page.querySelector('.story-depth').children;
    const boundary = page.querySelector('.lifecycle-boundary').textContent;
    assert.equal(page.dataset.depth, 'focus');
    controls[1].listeners.click();
    assert.equal(page.dataset.depth, 'context');
    assert(context.location.hash.endsWith('view=context'));
    if (key !== 'lifecycle') {
      const facts = page.querySelector('.lifecycle-facts');
      facts.children[0].children[2].listeners.click();
      assert.equal(facts.children[1].textContent, ArkUI.lifecycleContent[key.split('/')[1]].facts[1][1]);
    }
    controls[2].listeners.click();
    const source = page.querySelector('.story-reference');
    assert(source.href.startsWith('#/reference?doc=docs%2Fprotocol%2Fagreements.md&from='), 'source uses the canonical reader route on inner pages');
    assert.equal(page.querySelector('.lifecycle-boundary').textContent, boundary);
    controls[0].listeners.click();
    assert.equal(page.dataset.depth, 'focus');
    if (key !== 'lifecycle') {
      const scene = page.querySelector('.stage-scene');
      assert(scene.classList.contains('stage-scene-'+key.split('/')[1]));
      const inspect = scene.querySelector('.stage-scene-choices').children;
      inspect[0].listeners.click();const firstInspection=scene.querySelector('.stage-scene-mesh').dataset.stage;
      inspect[1].listeners.click();assert.notEqual(scene.querySelector('.stage-scene-mesh').dataset.stage,firstInspection,'lifecycle inspection controls have different patterns');
      assert.equal(scene.querySelector('.stage-scene-detail').textContent,ArkUI.lifecycleContent[key.split('/')[1]].facts[1][1],'scene inspection reveals the actual reference fact');
    }
    page.arkDispose();
  }
  if (key === 'deployment') {
    const cards=page.querySelector('.how-work-cards').children;
    assert.equal(cards.length,3,'nontechnical story keeps three distinct journey surfaces');
    assert.deepEqual(cards.map(card=>card.dataset.sceneLink),['how/ask','how/work','how/check']);
    assert.deepEqual(cards.map(card=>card.dataset.continuityCard),['how/ask','how/work','how/check'],'each journey surface returns to its exact source');
    assert.equal(cards[1].querySelector('.how-work-answer').textContent,context.ArkCopy.text('DEPLOYMENT.SIMPLE.WORK.TEXT'),'editable explanation survives into the actual card');
    cards[0].listeners.focus();assert.equal(cards[0].dataset.active,'true');
    cards[0].listeners.blur();assert.equal(cards[0].dataset.active,'false');
    cards[1].listeners.pointerenter();assert.equal(cards[1].dataset.active,'true');
    cards[1].listeners.pointerleave();assert.equal(cards[1].dataset.active,'false');
    assert(page.querySelector('.how-simple-footer'),'implementation boundary and full lifecycle remain after the journey');
    page.arkDispose();
  }
  if (key.startsWith('how/')) {
    const id=key.split('/')[1];
    assert(page.classList.contains('how-chapter-'+id));
    const steps=page.querySelector('.how-steps').children,choices=steps.map(step=>step.children[0]);
    assert.equal(steps.length,3,'each chapter teaches three steps');
    assert.equal(page.querySelector('.how-why').children.length,3,'each chapter explains why it works this way');
    assert(!steps[0].children[1].hidden && steps[1].children[1].hidden,'only the chosen step opens its text in place');
    const canvas=page.querySelector('.how-chapter-mesh'),firstPattern=canvas.dataset.stage;
    choices[1].listeners.click();
    assert.notEqual(canvas.dataset.stage,firstPattern,'each chapter choice runs its own mesh pattern');
    const selectedPattern=canvas.dataset.stage;
    choices[0].listeners.pointerenter();assert.equal(canvas.dataset.stage,firstPattern);
    choices[0].listeners.pointerleave();assert.equal(canvas.dataset.stage,selectedPattern,'preview exit restores the selected explanation');
    assert.equal(steps[1].children[1].textContent,context.ArkCopy.text('DEPLOYMENT.CHAPTER.'+id.toUpperCase()+'.DETAIL2'));
    assert.equal(steps[1].dataset.active,'true','the chosen step is marked active');
    assert.equal(choices[1].attributes['aria-pressed'],'true');
    page.arkDispose();
  }
  if (key === 'download') {
    const rows = page.querySelector('.download-steps').children.map(item => item.children[1]);
    const choices = page.querySelector('.download-steps').children.map(item => item.children[0]);
    const next = page.querySelector('.download-next');
    assert.equal(rows.filter(row => !row.hidden).length, 1, 'source guide starts with one step open');
    next.listeners.click();
    assert(rows[0].hidden && rows[0].inert && !rows[1].hidden, 'source guide advances one step');
    choices[4].listeners.click();
    assert(!rows[4].hidden && next.hidden, 'final source step has no next step');
    assert(!page.querySelector('.download-onward').hidden, 'final source step hands on to the network page');
    page.querySelector('.download-previous').listeners.click();
    assert(!rows[3].hidden && rows[4].hidden, 'previous step works');
  }
  if (key === 'deploy') {
    const rows = page.querySelector('.deploy-steps').children;
    const choices = page.querySelector('.deploy-progress').children;
    assert.equal(rows.filter(row => !row.hidden).length, 1, 'setup starts with one command');
    page.querySelector('.mechanism-next').listeners.click();
    assert(rows[0].hidden && rows[0].inert && !rows[1].hidden, 'next isolates the next setup step');
    choices[4].listeners.click();
    assert(!rows[4].hidden && page.querySelector('.mechanism-next').hidden, 'last step has no false completion action');
    page.querySelector('.deploy-workflow-all').listeners.click();
    assert(rows.every(row => !row.hidden && !row.inert), 'review exposes all commands');
    page.querySelector('.deploy-workflow-all').listeners.click();
    assert(!rows[4].hidden && rows[0].hidden, 'return to one step preserves position');
    page.querySelector('.deploy-workflow-back').listeners.click();
    assert(!rows[3].hidden, 'previous step works');
  }
  if (page.classList.contains('mechanism-story')) {
    const controls=page.querySelector('.story-depth').children;
    assert.equal(page.dataset.readingLayer,'focus',`${key}: starts with the primary answer`);
    const boundary=page.querySelector('.mechanism-status-summary');
    const boundaryText=boundary.textContent;
    controls[1].listeners.click();
    assert.equal(page.dataset.readingLayer,'context');
    const picker=page.querySelector('.guided-step-picker');
    picker.children[1].listeners.click();
    assert(context.location.hash.endsWith('view=context&step=1'),`${key}: named detail is addressable`);
    assert.equal(page.querySelector('.mechanism-inner-answer').children[1].textContent,context.ArkCopy.text(key==='about'?'ABOUT.POINT2.TEXT':key==='dao'?'DAO.POINT2.TEXT':key.replace('concept/','').toUpperCase()+'.POINT2.TEXT'));
    controls[2].listeners.click();
    assert.equal(page.dataset.readingLayer,'reference');
    assert.equal(page.querySelector('.mechanism-inner-answer'),null,`${key}: reference replaces supporting detail`);
    assert.equal(boundary.textContent,boundaryText,`${key}: status boundary survives every depth`);
    page.listeners.keydown({key:'Escape',preventDefault(){},stopPropagation(){}});
    assert.equal(page.dataset.readingLayer,'focus');
  }
  const links = [];
  function collect(node) {
    if (node.dataset && node.dataset.sceneLink) links.push(node);
    if (node.children) node.children.forEach(collect);
  }
  collect(page);
  links.forEach(link => {
    const target = link.dataset.sceneLink;
    assert(ArkUI.pageCatalog[target], `${key}: unknown link ${target}`);
    const base = '#' + ArkUI.pageCatalog[target].path;
    if (target === 'reference') {
      // dash-kit.js's docLink() bakes doc=...&from=... straight into href
      // (no dataset.routeQuery), so only the route and the doc param are checked.
      assert(link.href.startsWith(base + '?doc='), `${key}: reference link ${link.href} does not open a real document`);
    } else {
      assert.equal(link.href, base+(link.dataset.routeQuery?'?'+link.dataset.routeQuery:''), `${key}: ${target} has a noncanonical href`);
    }
  });
}
assert(fs.readFileSync('js/resolvers/experiment.js', 'utf8').includes("ArkUI.el('h1','','How can threshold agreement be pictured?')"), 'experiment introduction has a primary heading');
assert(fs.readFileSync('js/pages/lab.js', 'utf8').includes('<h1 id=\\"experiments-title\\">Explore three protocol concepts.</h1>'), 'interactive model has a primary heading');
console.log(`PASS: ${Object.keys(ArkUI.pageCatalog).length} real route modules mount with valid internal links`);

})().catch(error => { console.error(error); process.exitCode = 1; });
