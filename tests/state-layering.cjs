const assert = require('node:assert/strict');
const fs = require('node:fs');

const doctrine = fs.readFileSync('docs/ui-state-system.md', 'utf8');
for (const phrase of ['Focus', 'Context', 'Inner detail', 'Only one semantic layer may be readable and interactive at a time']) {
  assert(doctrine.includes(phrase), 'state contract defines ' + phrase);
}

const sheet = fs.readFileSync('js/pages/sheet.js', 'utf8');
const about = fs.readFileSync('js/pages/about.js', 'utf8');
assert(sheet.includes("'01 / Operating model'"), 'mechanism pages expose their parent layer');
assert(sheet.includes("'02 / ' + manifest.title"), 'mechanism pages identify the current context layer');
assert(sheet.includes("ArkUI.el('details', 'content-layer content-layer-context')"), 'supporting mechanics use progressive disclosure');
assert(sheet.includes("ArkUI.el('details', 'content-layer content-layer-reference')"), 'limits and evidence use a distinct reference layer');
assert(about.includes("contextLayer.className = 'content-layer content-layer-context'") && about.includes("ArkCopy.text('ABOUT.CONTEXT')"), 'overview supporting points yield to a named context layer');
assert(sheet.indexOf("'STATUS.TEXT'") < sheet.indexOf('content-layer-reference'), 'current status remains visible before optional reference detail');

const lifecycle = fs.readFileSync('js/pages/lifecycle.js', 'utf8');
assert(lifecycle.includes("'02 / Agreement lifecycle'"), 'lifecycle overview is layer two');
assert(lifecycle.includes("'03 / ' + id.charAt(0).toUpperCase()"), 'stage route is layer three');
assert(lifecycle.includes("if (id) {\n          section.appendChild"), 'full stage anatomy renders only on the inner stage route');
assert(lifecycle.includes("'Open this stage ↗'"), 'overview advances explicitly to inner detail');

const lifecycleCss = fs.readFileSync('css/lifecycle.css', 'utf8');
assert(/data-page="lifecycle"\] \.lattice-activity,[\s\S]*?opacity:0;[\s\S]*?pointer-events:none;/.test(lifecycleCss), 'steady reading state disables the transition canvas');
assert(/is-lifecycle-transition \.lattice-activity \{[\s\S]*?opacity:0;[\s\S]*?pointer-events:none;/.test(lifecycleCss), 'transition state cannot paint legacy labels over the route page');
const experienceCss = fs.readFileSync('css/experience.css', 'utf8');
assert(/grid-template-columns:minmax\(0,1fr\) minmax\(280px,340px\)/.test(experienceCss), 'desktop home reserves a right column for the lifecycle preview');
assert(/#scene \.home-lifecycle \{[^}]*grid-column:2; grid-row:1;/.test(experienceCss), 'lifecycle preview sits beside the primary hero on desktop');
assert(/@media\(max-width:900px\)[\s\S]*?#scene \.home-lifecycle \{ order:3;/.test(experienceCss), 'narrow screens keep the lifecycle preview after the primary content');

console.log('PASS: Focus, Context, and inner-detail layers use progressive disclosure and prevent transition/read-state overlap.');
