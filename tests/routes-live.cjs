/* Exercise real route modules and their copy, not only mocked loader results. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Element {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {};
    this.attributes = {}; this.listeners = {}; this._text = ''; this.hidden = false;
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
  get parentNode() { return this.parentElement || null; }
  get nextSibling() { return this.parentElement?.children[this.parentElement.children.indexOf(this) + 1] || null; }
  appendChild(child) { if (child.parentElement) child.remove(); child.parentElement = this; this.children.push(child); return child; }
  insertBefore(child, before) { child.parentElement = this; const index = before ? this.children.indexOf(before) : this.children.length; this.children.splice(index < 0 ? this.children.length : index, 0, child); return child; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(name, fn) { this.listeners[name] = fn; }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this); this.parentElement = null; }
  getAnimations() { return []; }
  focus() { document.activeElement = this; }
  querySelector(selector) {
    if (selector === '.ark-hero-body') return this.children.find(child => child.classList.contains('ark-hero-body'));
    if (selector === '.ark-hero-title') return this.children.find(child => child.classList.contains('ark-hero-title'));
    for (const child of this.children) {
      if (selector.startsWith('.') ? child.classList?.contains(selector.slice(1)) : child.tagName === selector.toUpperCase()) return child;
      const nested = child.querySelector?.(selector); if (nested) return nested;
    }
    return null;
  }
  querySelectorAll() { return []; }
}

const document = { createElement: tag => new Element(tag), createTextNode: value => ({ textContent: value }) };
const window = { addEventListener() {}, matchMedia: () => ({ matches: true }) };
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
const context = vm.createContext({ document, window, ArkUI, console, URLSearchParams,
  ArkAdminAuth: { create: () => ({ dispose() {} }) } });
function load(file) { vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file }); }

load('js/tokens.js'); load('js/content/manifest.js');
for (const id of JSON.parse(fs.readFileSync('js/content/manifests/index.js', 'utf8').match(/var ArkManifestIds = (\[[^;]+\]);/)[1])) load(`js/content/manifests/${id}.js`);
load('js/content/learnings.js'); load('js/content/article-index.js');
load('js/content/seo.js'); load('js/content/seo-data.js'); load('js/ark/vendor/engines.js');
const productionScripts = [...fs.readFileSync('index.html', 'utf8').matchAll(/<script src="([^"?]+)(?:\?[^\"]*)?" defer><\/script>/g)].map(match => match[1]);
const routeBoot = productionScripts.filter(file => ['js/pages/catalog.js', 'js/ark/scene-state.js'].includes(file));
assert.deepEqual(routeBoot, ['js/pages/catalog.js', 'js/ark/scene-state.js'], 'catalog must exist before scene state snapshots its routes');
routeBoot.forEach(load);
for (const key of Object.keys(ArkUI.pageCatalog)) {
  assert(ArkUI.sceneState.pages[key], `${key}: route is missing scene state`);
  assert.doesNotThrow(() => ArkUI.sceneState.navigate(key), `${key}: route cannot activate`);
}
for (const [key, entry] of Object.entries(ArkUI.pageCatalog)) {
  for (const file of entry.scripts) {
    assert(fs.existsSync(file), `${key}: missing ${file}`);
    if (file !== 'js/studio.js' && file !== 'js/admin/auth.js') load(file); // Browser-only bundle and studio need browser APIs.
  }
  const module = ArkUI.pageModules[entry.module];
  assert(module, `${key}: missing ${entry.module} module`);
  const host = new Element();
  let page;
  try { page = module.mount(host, key); }
  catch (error) { throw new Error(`${key}: ${error.message}`, { cause: error }); }
  assert(page instanceof Element, `${key}: mount did not return a page`);
  assert.equal(host.children.length, 1, `${key}: mount did not attach one page`);
  if (key === 'download') {
    const rows = page.querySelector('.concept-principles').children;
    const choices = page.querySelector('.source-step-picker').children;
    const controls = page.querySelector('.source-step-controls').children;
    assert.equal(rows.filter(row => !row.hidden).length, 1, 'source guide starts with one step');
    controls[1].listeners.click();
    assert(rows[0].hidden && rows[0].inert && !rows[1].hidden, 'source guide advances one step');
    choices[4].listeners.click();
    assert(!rows[4].hidden && controls[1].hidden, 'final source step has no next action');
    controls[2].listeners.click();
    assert(rows.every(row => !row.hidden && !row.inert), 'source guide review reveals all steps');
    controls[2].listeners.click();
    assert(!rows[4].hidden && rows[0].hidden, 'source guide restores the selected step');
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
  if (page.classList.contains('mechanism-explorer')) {
    const controls = page.querySelector('.mechanism-depth').children;
    const contextPanel = page.querySelector('.mechanism-inner');
    assert(contextPanel.hidden, `${key}: supporting details start outside the focus layer`);
    controls[1].listeners.click();
    assert(!contextPanel.hidden && !contextPanel.inert, `${key}: context becomes readable and interactive`);
    const rows = page.querySelector('.concept-principles').children;
    assert.equal(rows.filter(row => !row.hidden).length, 1, `${key}: one detail at a time`);
    page.querySelector('.mechanism-next').listeners.click();
    assert(!rows[1].hidden && rows[0].hidden, `${key}: next advances the selected detail`);
    controls[2].listeners.click();
    assert(contextPanel.hidden && contextPanel.inert, `${key}: context yields to reference`);
    page.listeners.keydown({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
    assert.equal(page.dataset.readingLayer, 'focus', `${key}: Escape returns to focus`);
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
    assert.equal(link.href, '#' + ArkUI.pageCatalog[target].path, `${key}: ${target} has a noncanonical href`);
  });
}
assert(fs.readFileSync('js/resolvers/experiment.js', 'utf8').includes('<h1>THRESHOLD</h1>'), 'experiment introduction has a primary heading');
assert(fs.readFileSync('js/pages/lab.js', 'utf8').includes('<h1 id=\\"experiments-title\\">Explore three protocol concepts.</h1>'), 'interactive model has a primary heading');
console.log(`PASS: ${Object.keys(ArkUI.pageCatalog).length} real route modules mount with valid internal links`);
