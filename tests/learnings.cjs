const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.attrs = {}; this.dataset = {}; this.classList = { add() {} }; }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute(key, value) { this.attrs[key] = value; }
  addEventListener() {}
}
const registry = {};
const context = vm.createContext({ document: { createElement: tag => new Element(tag) }, ArkUI: { register: (id, manifest) => registry[id] = manifest } });
for (const file of ['js/ark/flux.js', 'js/content/learnings.js', 'js/resolvers/learnings.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), context);
function descendants(el) { return [el, ...el.children.flatMap(descendants)]; }
assert(context.LearningContent.articles.every(article => !article.sections), 'Shared index must not load article bodies');
context.LearningContent.articles.forEach(article => vm.runInContext(fs.readFileSync('js/content/articles/' + article.slug + '.js', 'utf8'), context));
const patterns = ['F-LEARNINGS-RLEARNINGS_V1', ...context.LearningContent.articles.map(article => 'F-ARTICLE-RARTICLE_V1\n-S-' + article.slug)];
const pages = patterns.map(pattern => {
  const parsed = context.ArkFlux.parse(pattern), manifest = registry[parsed.resolver];
  const props = {}; for (const key in parsed.props) props[(manifest.schema || {})[key] || key] = parsed.props[key];
  const el = new Element(manifest.tag); Object.assign(el.attrs, manifest.attrs(props)); manifest.decorate(el, props); return el;
});
assert.equal(pages.length, 4);
assert.equal(descendants(pages[0]).filter(el => el.dataset.sceneLink).length, 3);
pages.slice(1).forEach((page, index) => {
  const all = descendants(page), article = context.LearningContent.articles[index];
  assert.equal(all.find(el => el.tagName === 'h1').textContent, article.title);
  assert.equal(all.filter(el => el.tagName === 'section').length, article.sections.length);
  assert(all.some(el => el.dataset.wordInput !== undefined && el.maxLength === 72));
  assert.equal(page.attrs['data-ark-page'], 'article/' + article.slug);
  assert(all.filter(el => el.tagName === 'p').length > 10);
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
console.log('PASS: Dense Flux → three full articles, three preview links, unique sections, title controls, word wrapping/sampling, missing Canvas2D fallback. Raster fixture, not browser font rendering.');
