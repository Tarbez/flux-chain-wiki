/* The fold rule is met by structure, never by deleting content on phones.

   Named regression (UX audit 2026-10-19, docs/ux-audit/pages-ux-b.md cross-page finding 2):
   pages that measured "1.0x viewport" got there by `display:none` under a breakpoint and by
   line-clamps with no way to expand. On a phone /lifecycle/<stage> had no illustration at all
   (css/lifecycle.css `.stage-scene{display:none}`), /what-is-a-resolver hid its one-sentence
   definition, kicker, policy address, breadcrumb and spec link (about ten rules in
   css/resolver-lab.css), /resolutions ended its deck and status note in "..." and showed the
   domain tabs as bare numbers, and every /resolutions/<slug> dropped its lede, Problem row,
   primary action, legend and "All 20" link and cut product lines to one line. Every sample
   screenshot still "looked fine" -- the content was simply not there.

   This test reads the stylesheets as rules (selector + media + declarations), so a plausible
   "tidy-up" that re-adds `display:none` on one of these elements fails here with the reason.
   What may still be hidden, and why:
   - a closed fold drawn by Ark's `disclosure` block (css/ark-blocks.css), because the block renders
     the button that opens it -- asserted below by rendering the real block (it replaced the local
     ArkUI.dash.foldToggle on 2026-10-19, W2-ADAPTER);
   - a resolver law's body while its row is closed: the laws are an Ark accordion (2026-10-19),
     whose own trigger opens it (the resolver demo's phone-only label hiding went with the
     conversion: its labels show at 12px). */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');

/* ---- a stylesheet as rules ------------------------------------------------------------- */
function rules(file) {
  const css = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  (function walk(text, media) {
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf('{', i);
      if (open < 0) break;
      const head = text.slice(i, open).trim();
      let depth = 1, j = open + 1;
      while (j < text.length && depth) { if (text[j] === '{') depth++; else if (text[j] === '}') depth--; j++; }
      const body = text.slice(open + 1, j - 1);
      if (head.startsWith('@media') || head.startsWith('@supports')) walk(body, (media ? media + ' and ' : '') + head.replace(/^@\w+\s*/, ''));
      else if (!head.startsWith('@')) for (const selector of head.split(/,(?![^()]*\))/)) out.push({ file, media: media || '', selector: selector.trim(), body });
      i = j;
    }
  })(css, '');
  return out;
}
const hides = (r) => /(^|;)\s*display\s*:\s*none/.test(r.body);
const clamps = (r) => /line-clamp\s*:\s*\d/.test(r.body);
const where = (r) => `${r.file} ${r.media ? '@media ' + r.media + ' ' : ''}${r.selector}`;

/* ---- /lifecycle: the illustration is folded on phones, never removed -------------------- */
const lifecycleCss = rules('css/lifecycle.css');
for (const r of lifecycleCss.filter(hides)) {
  if (!/stage-scene|lifecycle-object|ark-disclosure/.test(r.selector)) continue;
  if (/^\.stage-scene-/.test(r.selector.split(' ').pop())) continue; // a part of the scene, not the scene
  assert.fail(`${where(r)} hides the lifecycle illustration; only the disclosure block's own closed state may fold it`);
}
/* Since 2026-10-19 the lifecycle is on the story template (js/pages/story.js), which puts every
   story page's figure in Ark's disclosure: folded at 900px and narrower behind "Show the
   illustration", in full beside the depth control wider. */
const lifecycleJs = fs.readFileSync('js/pages/lifecycle.js', 'utf8');
const storyJs = fs.readFileSync('js/pages/story.js', 'utf8');
assert(/block\('disclosure', 'figure', \{\s*foldBelow: 'tablet', more: def\.figure\.more \|\| 'Show the illustration'/.test(storyJs),
  'js/pages/story.js folds a story page\'s figure in an Ark disclosure (foldBelow tablet, "Show the illustration")');
assert(/figure: \{ slot: 'illustration', caption: id \? picture\.title : picture\.caption \}/.test(lifecycleJs) && /var picture = id \? ArkUI\.createStageScene\(id, copy\) : trailFigure\(\);/.test(lifecycleJs),
  'both illustrations -- the stage scene and the overview figure -- go through the template\'s figure, so through the fold');

/* ---- /what-is-a-resolver: nothing on the page is display:none at any width ----------------- */
/* Since 2026-10-19 (W3-GUIDE) the page is the story template (js/pages/resolver-lab.js builds its
   def): the definition (the lede), the eyebrow, the breadcrumb, the spec and status links and the
   four laws are Ark blocks with no page CSS, and the illustration -- its policy address, track,
   stage and labels -- is the figure, folded below 900px behind "Show the illustration" by the
   template. css/resolver-lab.css owns only the illustration's insides: it hides nothing that has
   words, at any width (the phone-only canvas labels it used to hide show at 12px). The laws open
   one at a time as an Ark accordion (its closed state is the block's, hidden="until-found"). */
const labCss = rules('css/resolver-lab.css');
for (const r of labCss.filter(hides)) {
  // the step controls the run itself hides at its ends (no "back" on the first step, no "next" on the last)
  if (/^#scene \.resolver-lab-(again|prev|next)\[hidden\]$/.test(r.selector)) continue;
  assert.fail(`${where(r)} hides part of /what-is-a-resolver -- content must stay reachable on every width`);
}
const labJs = fs.readFileSync('js/pages/resolver-lab.js', 'utf8');
assert(/ArkUI\.resolverLabDef = function/.test(labJs) && /block: 'accordion', props: \{ label: words\('LAWS'\)/.test(labJs), 'the laws are an Ark accordion in the Evidence view');
assert(/figure: \{ slot: 'lab', kind: 'live'/.test(labJs), 'the illustration goes through the template\'s figure, so through the fold');

/* ---- /resolutions and /resolutions/<slug> --------------------------------------------------- */
/* Since 2026-10-19 (W3-GUIDE) both are pages of Ark blocks with no page CSS of their own: the
   hand-built clamps and display:none rules on the deck, the note, the brief, the legend, the main
   action and the product lines are gone with css/resolutions.css's page rules, and every word is
   in the page at every width (tests/resolutions-blocks.cjs checks each against the old pages'
   frozen censuses). What remains to hold here: nothing in that sheet clamps or hides page words. */
const resCss = rules('css/resolutions.css');
for (const r of resCss.filter((x) => hides(x) || clamps(x))) {
  assert(/header-products|products-mega/.test(r.selector), `${where(r)} ${hides(r) ? 'hides' : 'clamps'} resolution page content with no way to read it`);
}
// The deck and the status note are Ark disclosures: whole from 601px up, and on a phone they keep
// their first line in view and offer "More" -- the clamp and its open state are the block's
// (css/ark-blocks.css), not this page's.
const resJs = fs.readFileSync('js/pages/resolutions.js', 'utf8');
assert(/id:\s*'resolutions-deck',[^\n]*props:\s*\{\s*content:\s*'copy:RESOLUTIONS\.DECK',\s*foldBelow:\s*'phone',\s*preview:\s*1/.test(resJs), 'the deck keeps a line and a "More" on a phone (Ark disclosure)');
assert(/id:\s*'resolutions-note-text',[^\n]*props:\s*\{\s*content:\s*'copy:RESOLUTIONS\.NOTE',\s*foldBelow:\s*'phone',\s*preview:\s*1/.test(resJs), 'the status note keeps a line and a "More" on a phone (Ark disclosure)');
// The brief (who it is for, the problem) folds only on a phone, behind a button that names it.
assert(/id:\s*id \+ '-brief',[^\n]*props:\s*\{\s*foldBelow:\s*'phone',\s*more:\s*'Who it is for, and the problem'/.test(resJs), 'the brief is one press away on a phone, never display:none');

/* ---- the control itself: Ark's disclosure block, rendered for real --------------------------- */
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window;
w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
const observed = [];
w.ResizeObserver = class { constructor(fn) { this.fn = fn; } observe(el) { observed.push({ el, fn: this.fn }); } };
w.eval('var ArkCopy = { isKey: function () { return false; }, resolve: function (v) { return v; }, text: function (k) { return k; } };');
for (const file of ['js/ark/atomizer.js', 'js/ark/flux.js', 'js/ark/runtime.js', 'js/ark/vendor/engines.js']) w.eval(fs.readFileSync(file, 'utf8'));
w.eval('ArkUI.pageCatalog = {}; ArkUI.blockScripts = [];');
for (const file of ['js/ark/dash-kit.js', 'js/ark/vendor/ark-kit-public.js', 'js/ark/blocks.js']) w.eval(fs.readFileSync(file, 'utf8'));
assert.equal(w.eval('typeof ArkUI.dash.foldToggle'), 'undefined', 'the local stand-in is gone: one disclosure, Ark\'s');
const render = (spec, options) => { const el = w.ArkUI.blocks.render(spec, options || {}); w.document.body.appendChild(el); return el; };

const figure = w.document.createElement('figure'); figure.textContent = 'the illustration';
const fold = render({ block: 'disclosure', props: { slot: 'illustration', foldBelow: 'tablet', more: 'Show the illustration', less: 'Hide the illustration' } }, { slots: { illustration: figure } });
const trigger = fold.querySelector('.ark-disclosure__trigger'), panel = fold.querySelector('.ark-disclosure__panel');
assert.equal(trigger.tagName, 'BUTTON'); assert.equal(trigger.getAttribute('type'), 'button');
assert.equal(fold.getAttribute('data-state'), 'closed', 'starts closed unless asked');
assert.equal(trigger.getAttribute('aria-expanded'), 'false');
assert.equal(trigger.textContent.trim(), 'Show the illustration');
assert(panel.contains(figure), 'the page\'s own illustration is inside the panel');
assert(!panel.hasAttribute('hidden'), 'a fold below a width is never marked hidden: wider screens show it');
trigger.click();
assert.equal(fold.getAttribute('data-state'), 'open'); assert.equal(trigger.getAttribute('aria-expanded'), 'true'); assert.equal(trigger.textContent.trim(), 'Hide the illustration');
trigger.click();
assert.equal(fold.getAttribute('data-state'), 'closed', 'and closes again');

// A clamp that cuts nothing offers no "More"; one that cuts does.
const fits = render({ block: 'disclosure', props: { content: 'Short.', preview: 1, more: 'More', less: 'Less' } });
const cut = render({ block: 'disclosure', props: { content: 'Long enough to wrap.', preview: 2, more: 'More', less: 'Less' } });
const size = (el, scroll, client) => { Object.defineProperty(el, 'scrollHeight', { value: scroll }); Object.defineProperty(el, 'clientHeight', { value: client }); };
size(fits.querySelector('.ark-disclosure__panel'), 40, 40); size(cut.querySelector('.ark-disclosure__panel'), 66, 44);
observed.forEach((entry) => entry.fn([]));
assert.equal(fits.querySelector('.ark-disclosure__trigger').hidden, true, 'a clamp that fits hides its "More"');
assert.equal(cut.querySelector('.ark-disclosure__trigger').hidden, false, 'a clamp that cuts shows its "More"');
assert.equal(cut.querySelector('.ark-disclosure__trigger').textContent.trim(), 'More');

// The block's sheet: closed folds only at its width, the button exists only where it folds, the
// clamp lifts when open (it applies to [data-state='closed'] only), and the button keeps the page font.
const blocksCss = rules('css/ark-blocks.css');
assert(blocksCss.some((r) => /max-width:\s*900px/.test(r.media) && r.selector.includes("[data-fold-below='tablet'][data-state='closed'][data-preview='0'][data-hidden-by='state']") && hides(r)), 'a tablet fold closes only at 900px and narrower');
assert(blocksCss.some((r) => /min-width:\s*901px/.test(r.media) && r.selector.includes("[data-fold-below='tablet'] > .ark-disclosure__trigger") && hides(r)), 'wider, there is no button to press');
assert(blocksCss.every((r) => !clamps(r) || r.selector.includes("[data-state='closed']")), 'every clamp is a closed state, so opening lifts it');
assert(blocksCss.some((r) => r.selector === '.ark-block :where(button, input, select, textarea)' && /font\s*:\s*inherit/.test(r.body)), 'block controls inherit the page font');

console.log('PASS: no fold is met by deletion -- lifecycle illustration, resolver lede/address/spec/laws, resolutions deck/note/brief/legend/products all reachable on phones.');
