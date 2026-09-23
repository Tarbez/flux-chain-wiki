/* The site as one archive must give back exactly what went in, on the real content, not a fixture.
   Each case names the defect it guards: a plausible simplification would reintroduce it and still look right. */
import assert from 'node:assert/strict';
import { readProject, encodeSite, decodeSite, projectFiles, planWrite, siteProblems } from '../scripts/lib/site-bundle.mjs';
import { cidForBytes } from '../../../flx/flx-codec/src/blake3.js';

const site = readProject();
const clone = (v) => JSON.parse(JSON.stringify(v));

// Real content: every page, every article and every image asset, not a sample.
assert(site.manifests.length >= 9, 'reads every manifest the index lists');
assert(site.articles.length >= 3 && site.articles.every((a) => Array.isArray(a.sections)), 'reads every article body, not only the index');
assert(site.assets.length >= 1 && site.assets.every((a) => typeof a.dataBase64 === 'string' && a.dataBase64), 'reads every image asset the index lists');
assert.deepEqual(siteProblems(site), [], 'the project content is itself publishable');

// extract(parse(render(x))) == extract(x): the archive is a VIEW of the source, so prove the reader.
const bytes = encodeSite(site);
assert.deepEqual(decodeSite(bytes), site, 'decoded site equals the project content, order included');

// The curly quotes and dashes in the articles survive: a codec that folded them would still "look right".
const text = JSON.stringify(site);
assert(/[’“”–—]/.test(text), 'the fixture really contains non-ASCII punctuation');
assert.equal(JSON.stringify(decodeSite(bytes)), text, 'non-ASCII text survives byte for byte');

// Same content, same address; different content, different address. A publish that changed nothing must not mint a new CID.
assert.equal(cidForBytes(encodeSite(site)), cidForBytes(bytes), 'encoding is deterministic');
const edited = clone(site);
edited.manifests[1].fields[Object.keys(edited.manifests[1].fields)[0]].value += ' Edited.';
assert.notEqual(cidForBytes(encodeSite(edited)), cidForBytes(bytes), 'an edit changes the address');
assert.deepEqual(decodeSite(encodeSite(edited)), edited, 'and the edit round-trips');

// Order is content: reordering articles must be a different site, not a lookup that hides it.
const reordered = clone(site); reordered.articles.reverse();
assert.deepEqual(decodeSite(encodeSite(reordered)).articles.map((a) => a.slug), reordered.articles.map((a) => a.slug));

// Re-rendering the project's own files from the site must reproduce every byte on disk, or an admin save would churn them.
assert.deepEqual(planWrite(site), [], 'writing the site back to the project changes nothing');
assert(Object.keys(projectFiles(site)).length === site.manifests.length + site.articles.length + site.assets.length + 4,
  'one file per manifest, article and asset, plus the three indexes and the single mesh-settings file');

// An asset round-trips through the archive and through the address the same way a manifest does.
const editedAsset = clone(site); editedAsset.assets[0].label += ' (edited)';
assert.notEqual(cidForBytes(encodeSite(editedAsset)), cidForBytes(bytes), 'editing an asset changes the address');
assert.deepEqual(decodeSite(encodeSite(editedAsset)), editedAsset, 'and the edit round-trips');
const droppedAsset = clone(site); const goneAsset = droppedAsset.assets.pop();
const dropAssetPlan = planWrite(droppedAsset);
assert(dropAssetPlan.some((c) => c.action === 'remove' && c.relative === `js/content/assets/${goneAsset.id}.js`), 'a removed asset is planned for deletion');
assert(dropAssetPlan.some((c) => c.relative === 'js/content/assets/index.js' && c.action === 'update'), 'and the asset index is rewritten');

// A pulled edit reaches the files: the plan names it, and only it.
const plan = planWrite(edited);
assert.equal(plan.length, 1); assert.equal(plan[0].action, 'update');
// A deleted article is removed from disk, not left as an orphan the index no longer names.
const dropped = clone(site); const gone = dropped.articles.pop();
const dropPlan = planWrite(dropped);
assert(dropPlan.some((c) => c.action === 'remove' && c.relative === `js/content/articles/${gone.slug}.js`), 'a removed article is planned for deletion');
assert(dropPlan.some((c) => c.relative === 'js/content/article-index.js' && c.action === 'update'), 'and the index is rewritten');

// Refusals name what is wrong, before anything is encoded.
for (const [label, mutate, pattern] of [
  ['a field without a value', (s) => { delete s.manifests[0].fields[Object.keys(s.manifests[0].fields)[0]].value; }, /has no value/],
  ['a manifest with a bad id', (s) => { s.manifests[0].id = 'Bad Id'; }, /id must be lowercase/],
  ['an article with an empty section', (s) => { s.articles[0].sections[0] = ['only a heading']; }, /needs a heading and a paragraph/],
  ['an article with a bad slug', (s) => { s.articles[0].slug = 'Not A Slug'; }, /slug must be lowercase/],
  ['an article missing its body', (s) => { delete s.articles[0].sections; delete s.articles[0].numbers; }, /no body/],
  ['a duplicated slug', (s) => { s.articles[1].slug = s.articles[0].slug; }, /appears twice/],
  ['an asset with a bad id', (s) => { s.assets[0].id = 'Bad Id'; }, /id must be lowercase/],
  ['an asset with an unsupported mime', (s) => { s.assets[0].mime = 'image/gif'; }, /mime must be one of/],
]) {
  const bad = clone(site); mutate(bad);
  assert.throws(() => encodeSite(bad), pattern, label);
}
// A foreign archive is refused with the reason, not decoded into garbage.
assert.throws(() => decodeSite(new Uint8Array([1, 2, 3])), /./);

const json = Buffer.byteLength(JSON.stringify(site));
console.log(`site bundle ok: ${site.manifests.length} manifests, ${site.articles.length} articles, ${site.assets.length} assets; ${bytes.length} bytes as .flx vs ${json} as JSON (this content, encodeArchive, nothing else compared)`);
