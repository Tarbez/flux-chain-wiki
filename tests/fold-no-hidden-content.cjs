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
   - a closed fold (`[data-fold="closed"]`), because ArkUI.dash.foldToggle (js/ark/dash-kit.js)
     renders the button that opens it -- asserted below by running the builder;
   - a resolver law's body while its card is closed, because the card's own toggle opens it and
     now draws a visible +/- mark;
   - the resolver demo's doc / sign / accept canvas labels on phones, because the narration line
     says the same words (asserted against js/pages/resolver-lab.js narrate()). */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

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
  if (!/stage-scene|lifecycle-object/.test(r.selector)) continue;
  if (/^\.stage-scene-/.test(r.selector.split(' ').pop())) continue; // a part of the scene, not the scene
  assert(r.selector.includes('[data-fold="closed"]'), `${where(r)} hides the lifecycle illustration with no way to open it`);
}
assert(lifecycleCss.some((r) => hides(r) && r.selector.includes('[data-fold="closed"]') && r.selector.includes('.stage-scene') && r.selector.includes('.lifecycle-object')),
  'phones fold both the stage scene and the overview figure behind the toggle');
const lifecycleJs = fs.readFileSync('js/pages/lifecycle.js', 'utf8');
assert(/ArkUI\.dash\.foldToggle\(\{\s*host:\s*body,\s*more:\s*'Show the illustration'/.test(lifecycleJs),
  'js/pages/lifecycle.js renders the "Show the illustration" toggle on the dashboard body the fold rule reads');
assert(lifecycleCss.some((r) => hides(r) && /min-width:\s*901px/.test(r.media) && r.selector.includes('.lifecycle-dashboard-body > button')),
  'desktop shows the figure beside the answer, so the toggle exists only on phones');

/* ---- /what-is-a-resolver: nothing on the page is display:none at any width ----------------- */
const labCss = rules('css/resolver-lab.css');
const LAB_CONTENT = ['.resolver-lab-lede', '.resolver-lab-kicker', '.resolver-lab-address', '.content-layer-path',
  '.resolver-lab-spec', '.resolver-lab-laws-source', '.resolver-mesh-label-rule', '.resolver-track-label small'];
for (const r of labCss.filter(hides)) {
  for (const part of LAB_CONTENT) {
    if (!r.selector.includes(part)) continue;
    // The one dedup: on the Laws step the laws panel carries its own spec + status links.
    if (part === '.resolver-lab-spec' && r.selector.includes('[data-step="laws"]') && !r.media) continue;
    // The laws source is only shown on the Laws step; elsewhere there are no laws to source.
    if (part === '.resolver-lab-laws-source' && !r.media && r.selector === '.resolver-lab-laws-source') continue;
    assert.fail(`${where(r)} hides ${part} -- content on /what-is-a-resolver must stay reachable on every width`);
  }
}
// A closed law body is allowed only where the card opens it and shows that it does.
for (const r of labCss.filter((x) => hides(x) && x.selector.endsWith('.resolver-lab-law p'))) {
  assert(labCss.some((x) => x.media === r.media && x.selector.includes('.resolver-lab-law[data-open="true"] p') && /display\s*:\s*block/.test(x.body)), `${where(r)}: no open state for the law body`);
  assert(labCss.some((x) => x.media === r.media && x.selector === '.resolver-lab-law-toggle' && /display\s*:\s*block/.test(x.body)), `${where(r)}: the law toggle is not shown where bodies close`);
}
assert(labCss.some((r) => r.selector === '.resolver-lab-law-toggle::after' && /content\s*:\s*"\+"/.test(r.body)) &&
  labCss.some((r) => r.selector === '.resolver-lab-law-toggle[aria-expanded="true"]::after'),
  'a closed law shows a visible +/- mark, so a closed body does not read as missing');
const labJs = fs.readFileSync('js/pages/resolver-lab.js', 'utf8');
assert(labJs.includes("toggle.setAttribute('aria-expanded'"), 'the law toggle announces its state');
// The canvas labels phones still hide must be said by the narration line instead.
// The pairing is explicit: each hidden label's text, and the visible line that says it on a phone.
// Change a label's words and this fails, so the phone copy is re-checked rather than drifting apart.
const hiddenLabels = labCss.filter((r) => hides(r) && /resolver-mesh-label/.test(r.selector)).map((r) => r.selector).join(' ');
const narrate = labJs.slice(labJs.indexOf('function narrate('), labJs.indexOf('function at('));
const resolverManifest = fs.readFileSync('js/content/manifests/resolver.js', 'utf8');
const checkCaption = (resolverManifest.match(/"CHECK\.BODY"[\s\S]*?"value":\s*"([^"]*)"/) || [])[1] || '';
for (const [label, labelText, carrier, carrierName, words] of [
  ['sign', "labels.sign.textContent = 'signed · provider P-3'", narrate, 'narrate()', 'provider P-3'],
  ['accept', "'same input · same claim'", narrate, 'narrate()', 'same claim'],
  ['accept', "'trust · decided before sending'", checkCaption, 'the Check step caption (RESOLVER.CHECK.BODY)', 'trust question comes first: before you send'],
  ['doc', "labels.doc.textContent = 'doc:' + input.id", narrate, 'narrate()', "'doc:' + input.id"]
]) {
  if (!hiddenLabels.includes('resolver-mesh-label-' + label)) continue;
  assert(labJs.includes(labelText), `the ${label} label no longer reads ${labelText}: re-check what a phone shows in its place, then update this pairing`);
  assert(carrier.includes(words), `the ${label} label (${labelText}) is hidden on phones, so ${carrierName} must say "${words}"`);
}

/* ---- /resolutions and /resolutions/<slug> --------------------------------------------------- */
const resCss = rules('css/resolutions.css');
const RES_CONTENT = ['.resolution-detail-deck', '.resolution-detail-actions', '.resolution-brief', '.resolution-legend span',
  '.resolution-next-all', '.resolution-entry-copy > span', '.resolutions-domain-tab-name', '.resolutions-domain-tab-count',
  '.resolutions-note p', '.resolution-product-open', '.resolution-level-tab span', '.resolution-detail-index',
  '.resolution-idea-audience', '.resolution-how-shift p', '.resolution-idea-builds', '.resolutions-domain-head > p',
  '.resolution-product-line', '.resolution-idea-pick strong'];
for (const r of resCss.filter((x) => hides(x) || clamps(x))) {
  const part = RES_CONTENT.find((p) => r.selector.includes(p));
  if (!part) continue;
  if (part === '.resolutions-note p' && clamps(r) && !hides(r)) continue; // clamped, with "More" (below)
  assert.fail(`${where(r)} ${hides(r) ? 'hides' : 'clamps'} ${part} with no way to read it`);
}
// The two clamps that remain each have an open state, and the page renders the control.
for (const [clamped, open] of [['.resolutions-deck', '.resolutions-hero-copy[data-fold="open"] .resolutions-deck'], ['.resolutions-note p', '.resolutions-note[data-fold="open"] p']]) {
  assert(resCss.some((r) => clamps(r) && r.selector.endsWith(clamped)), `${clamped} is still clamped (if not, drop its toggle)`);
  assert(resCss.some((r) => r.selector.includes(open) && /line-clamp\s*:\s*none/.test(r.body)), `${clamped} has no open state that lifts the clamp`);
}
const resJs = fs.readFileSync('js/pages/resolutions.js', 'utf8');
assert(/foldToggle\(\{\s*host:\s*heroCopy,\s*clamp:\s*deck/.test(resJs), 'the clamped deck renders a "More" toggle');
assert(/foldToggle\(\{\s*host:\s*note,\s*clamp:\s*noteText/.test(resJs), 'the clamped status note renders a "More" toggle');
// Phones read every domain by name; the strip scrolls sideways instead of shrinking to numbers.
assert(resCss.some((r) => /max-width:\s*700px/.test(r.media) && r.selector === '.resolutions-domains' && /overflow-x\s*:\s*auto/.test(r.body)), 'phone domain tabs scroll and keep their names');
// With nothing cut, a phone page scrolls instead of clipping what no longer fits.
assert(resCss.some((r) => /max-width:\s*760px/.test(r.media) && r.selector === '#scene .resolution-detail' && /overflow-y\s*:\s*auto/.test(r.body)), 'a resolution page scrolls on phones');

/* ---- the control itself: ArkUI.dash.foldToggle -------------------------------------------- */
class Element {
  constructor(tag) { this.tagName = tag; this.className = ''; this.children = []; this.dataset = {}; this.attrs = {}; this.listeners = {}; this.textContent = ''; this.hidden = false; this.isConnected = true; this.scrollHeight = 0; this.clientHeight = 0; }
  appendChild(c) { this.children.push(c); return c; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(k, fn) { this.listeners[k] = fn; }
}
const frames = [];
const context = { console, document: { createElement: (t) => new Element(t) }, requestAnimationFrame: (fn) => frames.push(fn) };
context.window = context;
vm.createContext(context);
vm.runInContext('var ArkUI = {};', context);
vm.runInContext(fs.readFileSync('js/ark/dash-kit.js', 'utf8'), context);
const foldToggle = vm.runInContext('ArkUI.dash.foldToggle', context);

const host = new Element('div');
const button = foldToggle({ host, more: 'Show the illustration', less: 'Hide the illustration' });
assert.equal(button.tagName, 'button'); assert.equal(button.type, 'button');
assert.equal(host.dataset.fold, 'closed', 'starts closed unless asked');
assert.equal(button.attrs['aria-expanded'], 'false');
assert.equal(button.textContent, 'Show the illustration');
button.listeners.click();
assert.equal(host.dataset.fold, 'open'); assert.equal(button.attrs['aria-expanded'], 'true'); assert.equal(button.textContent, 'Hide the illustration');
button.listeners.click();
assert.equal(host.dataset.fold, 'closed', 'and closes again');

// A clamp that cuts nothing offers no "More"; one that cuts does.
const fits = new Element('p'); fits.scrollHeight = 40; fits.clientHeight = 40;
const quiet = foldToggle({ host: new Element('div'), clamp: fits });
const cut = new Element('p'); cut.scrollHeight = 66; cut.clientHeight = 44;
const loud = foldToggle({ host: new Element('div'), clamp: cut });
frames.splice(0).forEach((fn) => fn());
assert.equal(quiet.hidden, true, 'a clamp that fits hides its toggle');
assert.equal(loud.hidden, false, 'a clamp that cuts shows its toggle');
assert.equal(loud.textContent, 'More');

// The toggle inherits the page font and has a visible focus ring (components.css owns its paint).
const components = rules('css/components.css');
const paint = components.find((r) => r.selector === '#scene .fold-toggle');
assert(paint && /font\s*:\s*inherit/.test(paint.body), '.fold-toggle inherits the page font');
assert(components.some((r) => r.selector === '#scene .fold-toggle:focus-visible' && /outline\s*:\s*2px solid hsl\(var\(--reference\)\)/.test(r.body)), '.fold-toggle has a visible focus ring');
assert(components.some((r) => r.selector === '#scene .fold-toggle[hidden]' && hides(r)), 'a hidden toggle stays hidden despite its inline-flex display');

console.log('PASS: no fold is met by deletion -- lifecycle illustration, resolver lede/address/spec/laws, resolutions deck/note/brief/legend/products all reachable on phones.');
