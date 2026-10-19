'use strict';
/* The word geometry the particle title once used on the notes (js/halo/words.js), exercised
   against a deterministic raster fixture. The notes themselves (/learnings and each article) are
   pages of Ark blocks since 2026-10-19 (W3-LEARN) and are held by tests/learnings-blocks.cjs; the
   hand-built reader this file used to drive (js/resolvers/learnings.js) is gone. */
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const context = vm.createContext({});
for (const file of ['js/content/learnings.js', 'js/content/article-index.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), context);
assert(context.LearningContent.articles.every((article) => !article.sections), 'the shared index must not load article bodies');
assert(context.LearningContent.articles.every((article) => /^\d{4}-\d{2}-\d{2}$/.test(article.reviewed) && /^\d+ MIN READ$/.test(article.minutes)), 'every index entry carries its review date and a derived read time');
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
context.document = { createElement: () => ({ getContext: () => { drawn = []; return raster; } }) };
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
console.log('PASS: the notes index carries derived read times and review dates; word geometry fixture remains covered.');
