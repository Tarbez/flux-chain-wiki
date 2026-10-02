const assert = require('node:assert/strict');
const fs = require('node:fs');

const doctrine = fs.readFileSync('docs/ui-state-system.md', 'utf8');
for (const phrase of ['Focus', 'Context', 'Inner detail', 'Only one semantic layer may be readable and interactive at a time']) {
  assert(doctrine.includes(phrase), 'state contract defines ' + phrase);
}

const sheet = fs.readFileSync('js/pages/sheet.js', 'utf8');
const about = fs.readFileSync('js/pages/about.js', 'utf8');
assert(sheet.includes("'← Operating model'"), 'mechanism pages name their actual parent');
assert(sheet.includes("'story-depth'"), 'the same frame owns depth choices');
assert(sheet.includes("copy.replaceChildren()"), 'requesting detail replaces the answer surface');
assert(sheet.includes("'mechanism-status-summary'"), 'current status stays outside the replaceable surface');
assert(sheet.includes("'?view='") && sheet.includes("'&step='"), 'mechanism depth and detail are addressable');
assert(about.includes("ArkUI.sheet('about','about')"), 'overview uses the shared guided reading contract');

const lifecycle = fs.readFileSync('js/pages/lifecycle.js', 'utf8');
assert(lifecycle.includes("'02 / Agreement lifecycle'"), 'lifecycle overview is layer two');
assert(lifecycle.includes("'03 / ' + id.charAt(0).toUpperCase()"), 'stage route is layer three');
assert(lifecycle.includes("'lifecycle-trail'"), 'the overview exposes a compact route trail instead of stacked stage detail');
assert(lifecycle.includes("'Understand why'") && lifecycle.includes("'Evidence'"), 'stage anatomy is a requested inner explanation');
assert(lifecycle.includes("'Continue to '") && lifecycle.includes("'lifecycle/' + nextStage.id"), 'Continue opens a real next-stage route');
assert(lifecycle.includes("new URLSearchParams") && lifecycle.includes("'popstate'"), 'depth is addressable and restored by history');
assert(lifecycle.includes("'lifecycle-boundary'"), 'essential limits remain outside the replaced answer contents');

const lifecycleCss = fs.readFileSync('css/lifecycle.css', 'utf8');
assert(/data-page="lifecycle"\] \.lattice-activity,[\s\S]*?opacity:0;[\s\S]*?pointer-events:none;/.test(lifecycleCss), 'steady reading state disables the transition canvas');
assert(/is-lifecycle-transition \.lattice-activity \{[\s\S]*?opacity:0;[\s\S]*?pointer-events:none;/.test(lifecycleCss), 'transition state cannot paint legacy labels over the route page');
const experienceCss = fs.readFileSync('css/experience.css', 'utf8');
assert(/grid-template-columns:minmax\(0,1fr\) minmax\(280px,340px\)/.test(experienceCss), 'desktop home reserves a right column for the lifecycle preview');
assert(/#scene \.home-lifecycle \{[^}]*grid-column:2; grid-row:1;/.test(experienceCss), 'lifecycle preview sits beside the primary hero on desktop');
assert(/@media\(max-width:900px\)[\s\S]*?#scene \.home-lifecycle \{ order:3;/.test(experienceCss), 'narrow screens keep the lifecycle preview after the primary content');

console.log('PASS: Focus, Context, and inner-detail layers use progressive disclosure and prevent transition/read-state overlap.');
