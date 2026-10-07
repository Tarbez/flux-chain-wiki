const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.attrs = {}; this.dataset = {}; this.listeners = {}; this.classes = new Set(); this.classList = {
    add: name => this.classes.add(name), toggle: (name, active) => active ? this.classes.add(name) : this.classes.delete(name)
  }; }
  appendChild(child) { this.children.push(child); return child; }
  focus() { this.focused=true; }
  setAttribute(key, value) { this.attrs[key] = value; }
  addEventListener(name, listener) { this.listeners[name] = listener; }
}
const registry = {};
const context = vm.createContext({ document: { createElement: tag => new Element(tag) }, ArkUI: { register: (id, manifest) => registry[id] = manifest } });
for (const file of ['js/ark/flux.js', 'js/content/learnings.js','js/content/article-index.js', 'js/ark/route.js', 'js/resolvers/learnings.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), context);
function descendants(el) { return [el, ...el.children.flatMap(descendants)]; }
assert(context.LearningContent.articles.every(article => !article.sections), 'Shared index must not load article bodies');
context.LearningContent.articles.forEach(article => vm.runInContext(fs.readFileSync('js/content/articles/' + article.slug + '.js', 'utf8'), context));
context.ArkUI.pageCatalog = Object.fromEntries(context.LearningContent.articles.flatMap(article => [article.relatedPage,article.actionPage]).map(key => [key,{path:'/'+key}]));
const patterns = ['F-LEARNINGS-RLEARNINGS_V1', ...context.LearningContent.articles.map(article => 'F-ARTICLE-RARTICLE_V1\n-S-' + article.slug)];
const pages = patterns.map(pattern => {
  const parsed = context.ArkFlux.parse(pattern), manifest = registry[parsed.resolver];
  const props = {}; for (const key in parsed.props) props[(manifest.schema || {})[key] || key] = parsed.props[key];
  const el = new Element(manifest.tag); Object.assign(el.attrs, manifest.attrs(props)); manifest.decorate(el, props); return el;
});
assert.equal(pages.length, context.LearningContent.articles.length + 1);
assert.equal(descendants(pages[0]).filter(el => el.dataset.sceneLink).length, context.LearningContent.articles.length);
pages.slice(1).forEach((page, index) => {
  const all = descendants(page), article = context.LearningContent.articles[index];
  assert.equal(all.find(el => el.tagName === 'h1').textContent, article.title);
  assert.equal(all.filter(el => el.tagName === 'section').length, article.sections.length);
  assert(!all.some(el => el.dataset.wordInput !== undefined), 'reading pages no longer mount the particle-title playground');
  assert.equal(all.filter(el => el.className === 'article-section-index').length, article.sections.length);
  assert(all.some(el => el.className === 'article-contents'), 'every article keeps section navigation');
  assert(all.some(el => el.className === 'article-next'), 'every article links to the next note');
  const choices = all.filter(el => el.className === 'article-choice');
  const panels = all.filter(el => el.tagName === 'section');
  const next = all.find(el => el.className === 'article-next');
  assert.equal(choices.length, article.sections.length);
  assert(all.some(el => el.className === 'article-core-text' && el.textContent === article.core), 'core claim is visible before a choice');
  assert(all.some(el => el.className === 'article-relevance' && el.textContent === article.relevance), 'each article states its relevance');
  assert(all.some(el => el.className === 'article-sources'), 'each article has an evidence disclosure');
  assert(all.some(el => el.className === 'article-reviewed' && el.textContent.includes(article.reviewed)), 'each article shows its editorial review date');
  assert(all.some(el => el.className === 'article-evidence-link' && el.href === article.evidenceHref), 'each article links to its evidence context');
  assert(all.some(el => el.className === 'article-related' && el.dataset.sceneLink === article.relatedPage), 'each article links a related mechanism');
  assert(all.some(el => el.className === 'article-action' && el.dataset.sceneLink === article.actionPage), 'each article offers a next action');
  assert.equal(panels.filter(el => !el.hidden).length, 0, 'no answer is exposed before a choice');
  assert.equal(all.find(el => el.className === 'article-reading').hidden, true, 'the answer region starts hidden');
  assert.equal(next.hidden, true, 'the next article waits until the final answer');
  choices.at(-1).listeners.click();
  assert.equal(panels.filter(el => !el.hidden).length, 1, 'choosing an answer keeps all other chunks hidden');
  assert.equal(panels.at(-1).hidden, false);
  assert.equal(choices.at(-1).attrs['aria-pressed'], 'true');
  assert.equal(next.hidden, false, 'the final answer opens the next note');
  all.find(el => el.className === 'article-core-return').listeners.click();
  assert.equal(panels.filter(el => !el.hidden).length, 0, 'core command restores the question map');
  assert.equal(page.dataset.articleChoice, '-1');
  const key = value => ({ key: value, target: page, preventDefault() {} });
  page.listeners.keydown(key('ArrowRight'));
  assert.equal(page.dataset.articleChoice, '0', 'Right arrow opens the first answer from the intro');
  page.listeners.keydown(key('ArrowRight'));
  assert.equal(page.dataset.articleChoice, '1', 'Right arrow advances to the next answer');
  page.listeners.keydown(key('ArrowLeft'));
  page.listeners.keydown(key('ArrowLeft'));
  assert.equal(page.dataset.articleChoice, '-1', 'Left arrow returns to the intro from the first answer');
  page.listeners.keydown({ ...key('ArrowRight'), altKey: true });
  assert.equal(page.dataset.articleChoice, '-1', 'modified arrow keys keep their native behavior');
  page.listeners.keydown({ ...key('ArrowRight'), target: { closest: () => ({}) } });
  assert.equal(page.dataset.articleChoice, '-1', 'arrow keys in editable controls do not navigate questions');
  assert.equal(all.find(el => el.className === 'article-answer-count').attrs['aria-live'], 'polite');
  assert.equal(page.attrs['data-ark-page'], 'article/' + article.slug);
  assert(all.filter(el => el.tagName === 'p').length >= article.sections.reduce((count, section) => count + section.length - 1, 0),
    'every source paragraph remains in the article');
});
const ids = pages.flatMap(descendants).map(el => el.id).filter(Boolean);
assert.equal(ids.length, new Set(ids).size, 'Article headings need unique navigation targets');
// Exercise the real wrapping/sampling algorithm against a deterministic raster fixture.
let drawn = [];
const raster = {
  font: '', measureText(text) { return { width: Array.from(text).length * parseFloat(this.font.split(' ')[1]) * .55 }; },
  fillText(text, x, y) { drawn.push({ text, x, y, size: parseFloat(this.font.split(' ')[1]) }); },
  getImageData() {
    const data = new Uint8ClampedArray(960 * 500 * 4);
    for (const line of drawn) {
      const width = line.text.length * line.size * .55;
      for (let y = Math.max(0, Math.floor(line.y - line.size * .3)); y < Math.min(500, line.y + line.size * .3); y++)
        for (let x = Math.max(0, Math.floor(line.x - width / 2)); x < Math.min(960, line.x + width / 2); x++) data[(y * 960 + x) * 4 + 3] = 255;
    }
    return { data };
  }
};
context.document.createElement = () => ({ getContext: () => { drawn = []; return raster; } });
vm.runInContext(fs.readFileSync('js/halo/words.js', 'utf8'), context);
for (const text of ['', 'FORM', 'From points to form', 'W'.repeat(72), 'Learning belongs to everyone, not only people who know the tools.']) {
  const points = context.WordGeometry.create(text, 3000);
  assert.equal(points.length, 9000);
  assert(Array.from(points).every(Number.isFinite));
  assert(Array.from(points).every(n => Math.abs(n) <= 1));
  assert(drawn.length <= 4);
}
context.document.createElement = () => ({ getContext: () => null });
assert.equal(context.WordGeometry.create('FORM', 100), null);
console.log('PASS: three complete reading pages, index links, unique sections and navigation; word geometry fixture remains covered.');
