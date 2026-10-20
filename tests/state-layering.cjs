const assert = require('node:assert/strict');
const fs = require('node:fs');

const doctrine = fs.readFileSync('docs/ui-state-system.md', 'utf8');
for (const phrase of ['Focus', 'Context', 'Inner detail', 'Only one semantic layer may be readable and interactive at a time']) {
  assert(doctrine.includes(phrase), 'state contract defines ' + phrase);
}

const sheet = fs.readFileSync('js/pages/sheet.js', 'utf8');
const about = fs.readFileSync('js/pages/about.js', 'utf8');
const deployment = fs.readFileSync('js/pages/deployment.js', 'utf8');
const continuity = fs.readFileSync('js/ark/panel-continuity.js', 'utf8');
/* Since 2026-10-19 the mechanism sheets, the agreement chapters and the lifecycle are one story
   template (js/pages/story.js): the same layers, with one depth control for all of them. */
const story = fs.readFileSync('js/pages/story.js', 'utf8');
assert(sheet.includes("{ label: 'Operating model', href: 'route:concept' }"), 'mechanism pages name their actual parent');
assert(sheet.includes('ArkUI.story.mount(') && /block\('tabs', 'depth', \{\s*label: 'Explanation depth', variant: 'segmented'/.test(story), 'the same frame owns depth choices: one Ark tabs block');
assert(/\{ value: 'focus', label: 'The idea' \},\s*\{ value: 'context', label: 'How it works' \},\s*\{ value: 'reference', label: 'Evidence' \}/.test(story), 'one depth vocabulary on every story page');
assert(/main\.appendChild\(depth\);[\s\S]*?def\.boundary/.test(story), 'current status stays outside the replaceable surface (beside the tabs, not in a panel)');
assert(sheet.includes("'view=context&step='") && story.includes("'view=' + now"), 'mechanism depth and detail are addressable');
/* Since 2026-10-19 /about is a page of Ark blocks (js/pages/about.js, tests/about-page.cjs): its
   context is ONE tabs control, the three layers its first view. */
assert(/block: 'tabs', id: 'about-views'/.test(about) && /value: 'layers', label: copy\('MODEL\.TITLE'\)/.test(about), 'overview keeps the three-layer model as the first requested context');
assert.equal((about.match(/tone: 'primary'/g) || []).length, 1, 'overview exposes one dominant next movement');
assert(/value: 'evidence', label: copy\('REFERENCE'\)/.test(about), 'overview keeps evidence and verification behind a named view');
assert(/block: 'callout', id: 'about-boundary'[^\n]*body: copy\('BOUNDARY\.TITLE'\)/.test(about) && about.indexOf("id: 'about-boundary'") < about.indexOf("id: 'about-views'"), 'overview keeps the essential source boundary visible before (outside) the views');
assert(/block: 'steps', props: \{ label: 'Three stages'/.test(deployment), 'how it works retains its own three-part journey composition');
assert(deployment.includes("'how-deploy-mesh'") && deployment.includes('fabrics.push'), 'each stage of how it works owns a mesh illustration');
assert(deployment.includes("title: 'Current implementation'"), 'how it works keeps its implementation boundary visible');
// 2026-10-19 (W3-GUIDE): the audit found three different page-frame widths (pages-ux-b.md cross-page #4).
// /explore now sits in the standard 1080 frame (its views measure <=1.22x the viewport there); only the
// deployment walkthrough and /account keep the wide 1600 canvas.
assert(continuity.includes("panelPage === 'deployment' || panelPage === 'account' ? 1600 : 1080"), 'only the deployment walkthrough and /account receive the wide desktop canvas; every other page uses the one standard frame');

const explorer = fs.readFileSync('js/pages/explorer.js', 'utf8');
assert(explorer.includes('mesh-observatory'), 'explorer renders a dedicated observatory surface');
assert(explorer.includes('data-explorer-source-field'), 'explorer renders the catalog as a source field');
assert(explorer.includes('sourceAccess'), 'explorer derives access states from the real catalog');
/* Since 2026-10-20 (W4-S3) the dock's layers are Ark `popover` blocks, not hand-built <details>: the
   same contract, held by Ark -- dense detail stays behind a press, and one shared `group` makes opening
   a layer close the others (the old `other.open = false` loop is gone with the <details>). Behaviour is
   driven in tests/browser/explore-flows.mjs (ten-step switching, one open at a time). */
assert(/block: 'popover'/.test(explorer) && (explorer.match(/side: 'top', dock: true/g) || []).length === 4, 'explorer keeps dense operational detail behind disclosure: four dock layers are Ark popovers');
assert(explorer.includes('mesh-observatory-dock'), 'explorer keeps secondary observation layers in a compact interactive dock');
assert(explorer.includes("group: 'explore-raw'"), 'opening one observatory layer closes the others (one Ark popover group)');

const lifecycle = fs.readFileSync('js/pages/lifecycle.js', 'utf8');
// The layers stay (Home > Agreement lifecycle > stage), but the breadcrumb carries no ordinals since
// 2026-10-19: "02 / Agreement lifecycle > 03 / Intent" sat right above the kicker "01 / INTENT" and
// a 01-05 trail, three numberings for one stage (docs/ux-audit/pages-ux-b.md /lifecycle P1).
assert(lifecycle.includes("{ label: 'Agreement lifecycle', href: 'route:lifecycle' }, { label: stage.title }"), 'lifecycle overview is layer two of the breadcrumb, the stage layer three, named by its stage');
assert(!/label: '0\d \//.test(lifecycle), 'no ordinal numbers in the breadcrumb (the eyebrow carries the position)');
assert(lifecycle.includes("ArkUI.story.position('Agreement lifecycle', index, stages.length)"), 'one numbering: the eyebrow says "Agreement lifecycle · n of 5"');
assert(lifecycle.includes("relatedLabel: id ? 'The other stages' : 'The five stages'"), 'every stage stays one press away (the old trail, in the pager)');
assert(lifecycle.includes("'Continue to ' + stages[index + 1].title") && lifecycle.includes("'route:lifecycle/' + stages[index + 1].id"), 'Continue opens a real next-stage route');
assert(story.includes('new URLSearchParams') && story.includes("'popstate'"), 'depth is addressable and restored by history');
assert(/boundary: id\s*\? \{ tone: 'info', title: 'Not yet established'/.test(lifecycle), 'essential limits remain outside the replaced answer contents');

const lifecycleCss = fs.readFileSync('css/lifecycle.css', 'utf8');
assert(/data-page="lifecycle"\] \.lattice-activity,[\s\S]*?opacity:0;[\s\S]*?pointer-events:none;/.test(lifecycleCss), 'steady reading state disables the transition canvas');
assert(/is-lifecycle-transition \.lattice-activity \{[\s\S]*?opacity:0;[\s\S]*?pointer-events:none;/.test(lifecycleCss), 'transition state cannot paint legacy labels over the route page');
const experienceCss = fs.readFileSync('css/experience.css', 'utf8');
assert(/grid-template-columns:minmax\(0,1fr\) minmax\(280px,340px\)/.test(experienceCss), 'desktop home reserves a right column for the lifecycle preview');
assert(/#scene \.home-lifecycle \{[^}]*grid-column:2; grid-row:1;/.test(experienceCss), 'lifecycle preview sits beside the primary hero on desktop');
assert(/@media\(max-width:900px\)[\s\S]*?#scene \.home-lifecycle \{ order:3;/.test(experienceCss), 'narrow screens keep the lifecycle preview after the primary content');

console.log('PASS: Focus, Context, and inner-detail layers use progressive disclosure and prevent transition/read-state overlap.');
