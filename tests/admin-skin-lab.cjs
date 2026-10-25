'use strict';
/* The skin policy is an editor draft: Save writes it, Publish carries it, versions record it, the canvas previews it
   by its own message, and More > Skin lab edits it.

   Why this test exists (2026-10-24, skin lab): which rules a card skin may put on which part of the site is
   owner-editable content (js/content/skin-policy.js). A draft the editor lists but Save, Publish or the version
   history do not reach is the defect that once dropped 5 of 13 drafts from every publish, so each way a draft is
   reached is asked of this one. Each block names the defect it catches.

     1. the row: DRAFTS lists 'skinPolicy' with the fields the other single drafts have, and the editor has handles
     2. Save: saveSkinPolicy writes exactly ArkSkinPolicy.serialize(draft) to js/content/skin-policy-data.js, as FLX
     3. Publish: the site bundle carries it and writes the file back byte-identically
     4. Preview: the sender posts the sanitized policy as defxn-cms-preview-skin, a skin edit never re-sends (remounts)
        the whole site, and the canvas handler checks origin and source, applies with the DRAFT policy, relays the report
     5. The panel: rows are the canvas's report, a switch edits the draft and previews it, a rule taken back stands out,
        a family scope writes families[family].off, a part's row asks the canvas to outline it. Since the owner's decision
        (2026-10-24) a card dresses the site by its own rules, so every switch starts on and switching one off is the edit. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ADMIN } = require('./lib/admin-source.cjs');
const { bootForms } = require('./lib/admin-forms-dom.cjs');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const ArkSkinPolicy = require('../js/content/skin-policy.js');
const Parts = require('../js/ark/skin-parts.js');
const clone = (v) => JSON.parse(JSON.stringify(v));

class FakeFile { constructor() { this.text = ''; } async createWritable() { const f = this; let buf = ''; return { async write(t) { buf += t; }, async close() { f.text = buf; } }; } }
class FakeDir { constructor() { this.files = new Map(); }
  async getFileHandle(n, o) { if (!this.files.has(n)) { if (!(o && o.create)) throw new Error('NotFound'); this.files.set(n, new FakeFile()); } return this.files.get(n); } }

(async () => {
  /* ---- 1. the row ---- */
  const storeContext = vm.createContext({ ArkSkinPolicy, ArkWorld: require('../js/content/world.js') });
  vm.runInContext(read('js/admin/store.js'), storeContext);
  const Store = vm.runInContext('ArkAdminStore', storeContext);
  const row = clone(Store.drafts().find((d) => d.key === 'skinPolicy'));
  assert.deepEqual(row, { key: 'skinPolicy', kind: 'single', global: 'ArkSkinPolicy', label: 'Skin policy', file: 'skin-policy', title: 'Skin policy', needs: ['js/vendor/flx-state-grammar.js'] }, 'DRAFTS lists the skin policy with the fields the other single drafts have');
  assert(fs.existsSync(path.join(ROOT, row.needs[0])), 'its need exists');
  assert(fs.existsSync(path.join(ROOT, 'js/content/skin-policy.js')) && fs.existsSync(path.join(ROOT, 'js/content/skin-policy-data.js')), 'its module and its data file exist');
  const handleBody = ADMIN.slice(ADMIN.indexOf('function singleDraftHandle(key)'), ADMIN.indexOf('async function saveEverything()'));
  assert(/\n\s+skinPolicy: \{ draft: function \(\) \{ return state\.skinPolicyDraft; \}/.test(handleBody) && handleBody.includes('dirty: skinPolicyDirty') && handleBody.includes('ArkAdminStore.saveSkinPolicy(state.cdirs.content, state.skinPolicyDraft)'), 'the editor reaches the skin policy draft through singleDraftHandle: draft, set, saved, dirty, save');
  assert(ADMIN.includes('function skinPolicyDirty()') && ADMIN.includes('state.skinPolicyDraft = ') && ADMIN.includes('worldDirty: worldDirty, skinPolicyDirty: skinPolicyDirty'), 'the editor keeps a skin policy draft and its dirty check');
  assert(read('js/admin/versions-panel.js').includes("skinPolicy: 'Skin policy'"), 'the version history names the draft in words');
  const html = read('admin-app.html');
  const order = ['js/vendor/flx-state-grammar.js', 'js/content/skin-policy.js', 'js/content/skin-policy-data.js', 'js/admin/state.js'].map((s) => html.indexOf('<script src="' + s + '"'));
  assert(order.every((i) => i > 0) && order.every((v, i) => !i || v > order[i - 1]), 'admin-app.html loads the FLX grammar, then the module, then its data file (which decodes FLX when it loads), then the editor state');
  assert(!/skin-policy/.test(read('index.html')), 'the public page does not load the policy (the site loads it itself when a skin is applied)');

  /* ---- 2. Save ---- */
  const draft = ArkSkinPolicy.sanitize({ off: { CARD: ['edge'], 'PRIMARY|BUTTON': ['frame'] }, families: { Arcade: { off: { CARD: ['frame', 'edge'] } } },
    contrast: [{ fg: ['--text-faint'], bg: ['--canvas'], min: 6 }] });
  const dir = new FakeDir();
  await Store.saveSkinPolicy(dir, draft);
  const text = dir.files.get('skin-policy-data.js').text;
  assert.equal(text, ArkSkinPolicy.serialize(draft), 'saveSkinPolicy writes exactly ArkSkinPolicy.serialize(draft)');
  const records = JSON.parse(/ArkSkinPolicy\.define\(("[^"]*")\);/.exec(text)[1]);
  assert(!/^\s*[{[]/.test(records) && records.includes('-'), 'the stored text is FLX records split on -, never a JSON object (workspace law: stored state is FLX)');
  const back = vm.createContext({ TextEncoder, TextDecoder });
  vm.runInContext(read('js/vendor/flx-state-grammar.js'), back); vm.runInContext(read('js/content/skin-policy.js'), back); vm.runInContext(text, back);
  assert.deepEqual(clone(vm.runInContext('ArkSkinPolicy.get()', back)), draft, 'what Save wrote reads back as the same policy');

  /* ---- 3. Publish ---- */
  const bundle = await import('../scripts/lib/site-bundle.mjs');
  assert(bundle.siteDrafts().some((d) => d.key === 'skinPolicy'), 'the site bundle reads the draft list from store.js and so lists the skin policy');
  const site = bundle.readProject();
  assert.deepEqual(clone(site.skinPolicy), ArkSkinPolicy.defaults(), 'the bundle loads js/content/skin-policy.js with its needs and reads the saved (empty) policy');
  site.skinPolicy = draft;
  assert.deepEqual(bundle.siteProblems(site), [], 'a site with a skin policy is publishable');
  assert.equal(bundle.projectFiles(site)['js/content/skin-policy-data.js'], ArkSkinPolicy.serialize(draft), 'the bundle includes js/content/skin-policy-data.js, the bytes Save writes');
  assert.equal(JSON.stringify(bundle.decodeSite(bundle.encodeSite(site)).skinPolicy), JSON.stringify(draft), 'the policy survives the archive byte-identically under JSON.stringify (the hashing form)');

  /* ---- 4. the preview ---- */
  const bridge = read('js/admin/bridge.js');
  assert(bridge.includes("type: 'defxn-cms-preview-skin', sample, policy"), 'the editor posts defxn-cms-preview-skin with the sample and the policy');
  assert(bridge.includes('ArkSkinPolicy.sanitize(value'), 'it posts the sanitized value, not text');
  assert(bridge.includes("type: 'defxn-cms-preview-skin-focus', selector"), 'the editor posts defxn-cms-preview-skin-focus with a selector');
  assert(bridge.includes("const LIVE_ONLY = new Set(['world', 'skinPolicy'])") && bridge.includes('if (CANVAS_OWNED.has(key) || LIVE_ONLY.has(key)) return;'), 'a skin policy edit is not part of the content signature, so it never re-sends the whole site (a remount) under a switch');
  assert(bridge.includes('postWorldNow(); postSkinNow(); layoutStage();') && /postWorldNow\(\);[^\n]*\n\s*postSkinNow\(\);/.test(bridge), 'the skin is sent again on load and after every ready (a remount drops it on the canvas)');
  assert(bridge.includes("event.data.type === 'defxn-cms-skin-report'") && bridge.includes('A.skinReport(event.data)'), 'the report that comes back reaches the lab');
  assert(/if \(event\.source !== cmsPreview\.contentWindow\) return;[\s\S]*defxn-cms-skin-report/.test(bridge), 'and only from the canvas frame, same origin');
  assert(bridge.includes('if (!sample && !force) return;'), 'with no sample picked and nothing to take off, the editor sends nothing');
  const main = read('js/main.js');
  const handler = /if \(data\.type === 'defxn-cms-preview-skin' [^\n]*\n/.exec(main);
  assert(handler && /event\.source === window\.parent && cmsPreviewQuery/.test(handler[0]), 'js/main.js handles defxn-cms-preview-skin, only from the parent, only in a preview iframe');
  assert(/defxn-cms-preview-skin-focus' && event\.source === window\.parent && cmsPreviewQuery/.test(main), 'and so is the outline request');
  assert(/function cmsOnMessage\(event\) \{\s*if \(event\.origin !== location\.origin\) return;/.test(main), 'and only from this origin (the guard every preview message passes first)');
  const apply = main.slice(main.indexOf('function cmsPreviewSkin(data)'), main.indexOf('/* named so a state held back'));
  assert(apply.includes('site.sample(sample)') && apply.includes('site.apply(record, { policy: policy })') && apply.includes('site.remove()'), 'it asks DefxnSkinSite for the sample, applies it with the DRAFT policy, or removes the skin');
  assert(apply.includes("document.addEventListener('ark:skin-report'") && apply.includes('cmsSkinRelay()'), 'it relays the report on every ark:skin-report and once after the apply');
  const relay = main.slice(main.indexOf('function cmsSkinRelay'), main.indexOf('function cmsSkinFocus'));
  assert(relay.includes("type: 'defxn-cms-skin-report'") && relay.includes('window.parent.postMessage(') && relay.includes(', location.origin)'), 'the report goes to the parent, to this origin only');
  const focus = main.slice(main.indexOf('function cmsSkinFocus'), main.indexOf('function cmsPreviewSkin'));
  assert(focus.includes("classList.add('defxn-skin-focus')") && focus.includes("classList.remove('defxn-skin-focus')") && !/\.style\./.test(focus) && !/setAttribute\('style'/.test(focus), 'the outline is one class added and later removed, no inline style');
  assert(!/requestAnimationFrame/.test(relay + focus + apply), 'and no idle animation frame');

  /* ---- 5. the panel ---- */
  const app = bootForms();
  const { window, document, A, state, calls } = app;
  state.cmsCurrentRoute = '/'; state.view = 'skin';
  const mount = document.createElement('div'); mount.id = 'skinPanel'; document.body.appendChild(mount);
  A.renderSkinLabPanel(mount);
  const sentFor = (name) => calls.filter((c) => c.name === name);
  assert.deepEqual([...mount.querySelectorAll('#skin-pick option')].map((o) => [o.value, o.textContent]), [['', 'Site’s own look'], ['27', 'Sample card 27'], ['263', 'Sample card 263'], ['512', 'Sample card 512']], 'the picker offers the site\'s own look and the three review samples, and no other card');
  assert(!/009/.test(mount.textContent), 'record 009 appears nowhere in the panel');
  assert(/Pick a sample card/.test(mount.textContent), 'with nothing picked, the panel says what to do');
  assert.equal(A.skinPolicyDirty(), false, 'clean at the start');

  const pick = mount.querySelector('#skin-pick');
  pick.value = '263'; pick.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(state.skinChoice, '263', 'a pick is held for the bridge');
  assert(sentFor('notifyPreviewSkin').length >= 1, 'and sent to the canvas');
  assert(/Applying sample card 263/.test(mount.textContent), 'until the canvas answers, the panel says it is applying');

  /* what the canvas answers: a report in Ark UI's shape (js/ark/skin-site.js report()) */
  const part = (key, count, applied, skipped, reverted) => ({ key, family: 'surface', selector: 'div.' + key.toLowerCase(), count, rules: { applied: applied || {}, skipped: skipped || [], reverted: reverted || [] }, themed: false });
  const message = (extra) => Object.assign({ type: 'defxn-cms-skin-report', sample: '263', on: true, family: null, error: '',
    codeOff: clone(Parts.OFF), offered: { frame: 'full', edge: 'cut', ornament: 'strip', marker: 'emblem', header: 'tag' },
    report: { name: 'defxn-card-test', parts: [
      part('CARD', 5, { edge: 'cut', frame: 'full' }),
      part('LIST', 12, { marker: 'emblem' }),
      part('MEGAMENUPANEL', 1, { edge: 'cut' }, [], [{ rule: 'frame', why: 'it grows the part\'s box' }]),
      part('card', 6, { edge: 'cut' }),
      part('PANEL', 2, {}, [{ rule: 'ornament', why: 'text parts do not take ornament' }], [{ rule: 'colours', why: 'text contrast 2.1:1 is below 4.5:1', contrast: 2.1 }]),
      part('ASIDE', 3), part('SECTION', 9)
    ], tokens: { applied: ['--canvas'], skipped: [], adjusted: [{ token: '--text-faint', from: '180 2% 40%', to: '180 1.7% 47.5%', why: 'contrast 3.42:1 raised to 4.50:1 (product rule 4.5:1)' }] } } }, extra);
  A.skinReport(message({ sample: '27' }));
  assert(/Applying sample card 263/.test(mount.textContent), 'an answer to a sample that is no longer picked is ignored');
  A.skinReport(message());
  const rowsOf = () => [...mount.querySelectorAll('.skin-part')].map((el) => el.dataset.part);
  assert.deepEqual(rowsOf(), ['CARD', 'LIST', 'MEGAMENUPANEL', 'card', 'PANEL'], 'one row per part that has rules applied, skipped or taken back (or that the card sends rules to); parts with none are hidden');
  assert(/5 parts wear rules from sample card 263/.test(mount.textContent) && /2 have a rule or a colour taken back/.test(mount.textContent), 'the summary counts the parts and the ones that had something taken back');
  assert(/2 other parts took no rule on this page/.test(mount.textContent), 'the hidden parts are counted');
  const sw = (partKey, rule) => mount.querySelector(`input[data-part="${partKey}"][data-rule="${rule}"]`);
  assert.equal(mount.querySelector('.skin-part[data-part="CARD"] .skin-part-count').textContent, '5 elements', 'a row shows its count');
  assert.deepEqual([...mount.querySelectorAll('.skin-part[data-part="CARD"] .skin-rule')].map((r) => r.dataset.ruleRow), ['frame', 'edge', 'ornament', 'marker', 'header'], 'a row lists the rules the card sends, in the contract order, and each switch says whether the part may wear it');
  assert.deepEqual(['frame', 'edge', 'ornament', 'marker', 'header'].map((r) => sw('CARD', r).checked), [true, true, true, true, true], 'every switch starts on: the card\'s own rules reach every part until one is switched off');
  assert.equal(mount.querySelector('.skin-part[data-part="CARD"] [data-rule-row="frame"] .skin-rule-state').textContent, 'full', 'an applied rule shows its value');
  assert.match(mount.querySelector('.skin-part[data-part="CARD"] [data-rule-row="ornament"] .skin-rule-state').textContent, /^On, but this page did not take it\./, 'a rule that is on but not taken here says so');
  /* the breaks stand out */
  assert.equal(mount.querySelector('.skin-part[data-part="MEGAMENUPANEL"]').dataset.broken, 'true', 'a part with a rule taken back is marked');
  assert.equal(mount.querySelector('.skin-part[data-part="MEGAMENUPANEL"] [data-rule-row="frame"]').dataset.tone, 'taken', 'the rule taken back has its own tone');
  assert.match(mount.querySelector('.skin-part[data-part="MEGAMENUPANEL"] [data-rule-row="frame"] .skin-rule-state').textContent, /^Taken back: it grows the part's box/, 'and says why');
  assert.equal(mount.querySelector('.skin-part[data-part="PANEL"] [data-rule-row="colours"]').dataset.tone, 'colours', 'a colour taken back is its own line');
  assert.match(mount.querySelector('.skin-part[data-part="PANEL"] [data-rule-row="ornament"] .skin-rule-state').textContent, /^Not taken: text parts do not take ornament/, 'a rule Ark UI skipped says why');
  assert.equal(mount.querySelector('.skin-part[data-part="CARD"]').dataset.broken, 'false', 'a part with nothing taken back is not marked');
  const css = read('css/admin.css');
  assert(/\.skin-part\[data-broken="true"\][^}]*--drift/.test(css) && /data-tone="taken"\][^}]*--drift/.test(css) && /data-tone="colours"\][^}]*--danger/.test(css), 'taken-back rules use --drift (review) and a taken-back colour --danger');
  assert(sw('card', 'edge').disabled && sw('card', 'edge').title.length > 20, 'a lower-case part is Ark UI\'s own: its switches are off limits and say why');
  assert(/moved for contrast/.test(mount.querySelector('.skin-tokens summary').textContent) && /1 colour moved/.test(mount.querySelector('.skin-tokens summary').textContent), 'colours the contrast rules moved are counted');
  assert(mount.querySelector('.skin-tokens').textContent.includes('--text-faint') && mount.querySelector('.skin-tokens').textContent.includes('180 2% 40% to 180 1.7% 47.5%') && mount.querySelector('.skin-tokens').textContent.includes('product rule 4.5:1'), 'and listed with from, to and why');

  /* the filter */
  const filter = (name) => mount.querySelector(`[data-filter="${name}"]`);
  filter('problems').click();
  assert.deepEqual(rowsOf(), ['MEGAMENUPANEL', 'PANEL'], 'Taken back lists only the parts with a rule or a colour taken back');
  filter('all').click();
  assert.deepEqual(rowsOf(), ['ASIDE', 'CARD', 'LIST', 'MEGAMENUPANEL', 'PANEL', 'SECTION', 'card'].sort((a, b) => ['CARD', 'LIST', 'MEGAMENUPANEL', 'card', 'PANEL', 'ASIDE', 'SECTION'].indexOf(a) - ['CARD', 'LIST', 'MEGAMENUPANEL', 'card', 'PANEL', 'ASIDE', 'SECTION'].indexOf(b)), 'All parts lists every part in the report as a candidate, including the ones that wear nothing');
  filter('rules').click();

  /* a switch edits the draft, previews it at once, and is one undoable step */
  const before = sentFor('notifyPreviewSkin').length;
  sw('CARD', 'frame').checked = false; sw('CARD', 'frame').dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.deepEqual(clone(state.skinPolicyDraft.off), { CARD: ['frame'] }, 'switching frame off for CARD writes it in the off list');
  A.skinReport(message());   /* the canvas answers the preview; its report may still be the last one */
  assert.match(mount.querySelector('.skin-part[data-part="CARD"] [data-rule-row="frame"] .skin-rule-state').textContent, /^Switched off\. The card sends full\./, 'a rule switched off says so, and what the card sends, even before a fresh report drops it');
  assert.equal(A.skinPolicyDirty(), true, 'and marks the draft dirty');
  assert(sentFor('notifyPreviewSkin').length > before, 'and previews it live');
  assert.equal(A.singleDraftHandle('skinPolicy').dirty(), true, 'Save sees it');
  assert.equal(sw('CARD', 'frame').checked, false, 'the switch shows it off');
  sw('CARD', 'ornament').checked = false; sw('CARD', 'ornament').dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.deepEqual(clone(state.skinPolicyDraft.off), { CARD: ['frame', 'ornament'] }, 'a second rule switched off joins the list, in the contract\'s order');
  sw('CARD', 'ornament').checked = true; sw('CARD', 'ornament').dispatchEvent(new window.Event('change', { bubbles: true }));
  sw('CARD', 'frame').checked = true; sw('CARD', 'frame').dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.deepEqual(clone(state.skinPolicyDraft.off), {}, 'switching every rule back on removes the part\'s entry, so the policy holds only what differs');
  assert.equal(A.skinPolicyDirty(), false, 'and the draft is clean again');
  /* a part nobody switched anything off on wears every rule the card sends */
  assert.equal(Parts.OFF.ASIDE, undefined, 'ASIDE has no code list (fixture check)');
  A.skinReport(message({ report: Object.assign(message().report, { parts: [part('ASIDE', 3)] }) }));
  mount.querySelector('[data-filter="all"]').click();
  assert.deepEqual(['frame', 'edge'].map((r) => sw('ASIDE', r).checked), [true, true], 'a part with no list wears every rule');
  sw('ASIDE', 'edge').checked = false; sw('ASIDE', 'edge').dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.deepEqual(clone(state.skinPolicyDraft.off), { ASIDE: ['edge'] }, 'switching edge off writes off[PART] = [edge]');
  sw('ASIDE', 'edge').checked = true; sw('ASIDE', 'edge').dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.deepEqual(clone(state.skinPolicyDraft.off), {}, 'and switching it on again removes the entry');
  mount.querySelector('[data-filter="rules"]').click();

  /* a lower-case block part takes the switches of its rules name, which the canvas resolves (DefxnSkinSite.ruleKey:
     card -> CARD). Without it, Ark UI's block parts (alert, tabs-list...) could never be given a rule from here. */
  A.skinReport(message({ ruleKeys: { card: 'CARD', alert: 'ALERT', hero: null }, report: Object.assign(message().report, { parts: [part('card', 6), part('alert', 1), part('hero', 1)] }) }));
  filter('all').click();
  const inRow = (row, rule) => mount.querySelector(`.skin-part[data-part="${row}"] input[data-rule="${rule}"]`);
  assert.ok(!inRow('card', 'frame').disabled && inRow('card', 'frame').dataset.part === 'CARD', 'the card block part takes CARD\'s switches');
  assert.ok(inRow('hero', 'frame').disabled && /no rules name/.test(inRow('hero', 'frame').title), 'a part with no rules name keeps its switches off, and says why');
  assert.ok(inRow('alert', 'header').checked, 'the alert block takes every rule until one is switched off');
  inRow('alert', 'ornament').checked = false; inRow('alert', 'ornament').dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.deepEqual(clone(state.skinPolicyDraft.off), { ALERT: ['ornament'] }, 'switching a rule off for the alert block writes ALERT in the draft');
  inRow('alert', 'ornament').checked = true; inRow('alert', 'ornament').dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.deepEqual(clone(state.skinPolicyDraft.off), {}, 'and on again removes it');
  mount.querySelector('[data-filter="rules"]').click();

  /* the family scope */
  assert.equal(mount.querySelector('#skin-scope'), null, 'a card with no set offers no family scope');
  A.skinReport(message({ family: 'Arcade' }));
  const scope = mount.querySelector('#skin-scope');
  assert(scope && [...scope.options].map((o) => o.textContent).join('|') === 'Every card|Only cards of the set Arcade', 'a card that wears a set offers "only for this family"');
  scope.value = 'family'; scope.dispatchEvent(new window.Event('change', { bubbles: true }));
  sw('CARD', 'frame').checked = false; sw('CARD', 'frame').dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.deepEqual(clone(state.skinPolicyDraft), { version: 2, off: {}, families: { Arcade: { off: { CARD: ['frame'] } } }, contrast: [] }, 'with the family scope a switch writes families[family].off and nothing site-wide');
  assert.equal(sw('CARD', 'frame').checked, false, 'the switch shows the family\'s list for this card');
  scope.value = 'site'; scope.dispatchEvent(new window.Event('change', { bubbles: true }));
  /* switching it back on for the set removes the family entry */
  const scoped = mount.querySelector('#skin-scope'); scoped.value = 'family'; scoped.dispatchEvent(new window.Event('change', { bubbles: true }));
  sw('CARD', 'frame').checked = true; sw('CARD', 'frame').dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.deepEqual(clone(state.skinPolicyDraft.families), {}, 'switching it back on for the set leaves the family entry out');
  /* a switch only takes away: what every card has off cannot be switched on for one set, so that switch is locked and says why */
  scoped.value = 'site'; scoped.dispatchEvent(new window.Event('change', { bubbles: true }));
  sw('CARD', 'edge').checked = false; sw('CARD', 'edge').dispatchEvent(new window.Event('change', { bubbles: true }));
  const fam2 = mount.querySelector('#skin-scope'); fam2.value = 'family'; fam2.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.ok(sw('CARD', 'edge').disabled && !sw('CARD', 'edge').checked && /every card/.test(sw('CARD', 'edge').title), 'in the set scope, a rule every card has off is shown off, locked, and says where to change it');
  const site2 = mount.querySelector('#skin-scope'); site2.value = 'site'; site2.dispatchEvent(new window.Event('change', { bubbles: true }));
  sw('CARD', 'edge').checked = true; sw('CARD', 'edge').dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.deepEqual(clone(state.skinPolicyDraft.off), {}, 'and under every card it switches on again');

  /* pressing a row outlines the part on the canvas */
  mount.querySelector('.skin-part[data-part="LIST"] .skin-part-head').click();
  assert.deepEqual(clone(sentFor('postSkinFocus').pop().args), ['div.list'], 'pressing a part row asks the canvas to outline its first element, by the selector the report gave');

  /* an error from the canvas is shown, named, with what stays */
  A.skinReport(message({ report: null, on: false, error: 'the skin needs js/nft/skin-recipe.js; one did not load' }));
  assert(/The sample did not apply: the skin needs js\/nft\/skin-recipe\.js/.test(mount.textContent) && /The page keeps its own look\./.test(mount.textContent), 'an apply that failed says what failed and what the page does instead');

  /* picking the site's own look sends the removal and clears the rows */
  const p2 = mount.querySelector('#skin-pick'); p2.value = ''; p2.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(state.skinChoice, '', 'the site\'s own look is an empty choice');
  assert.equal(mount.querySelectorAll('.skin-part').length, 0, 'and no rows');

  /* Revert: the draft goes back to what is saved; leaving the lab takes the skin off the canvas */
  A.skinReport(message({ sample: '' }));
  state.skinPolicyDraft = ArkSkinPolicy.sanitize({ off: { CARD: ['frame'] } });
  assert.equal(A.skinPolicyDirty(), true);
  A.revertSkinPolicy();
  assert.equal(A.skinPolicyDirty(), false, 'Revert puts the draft back to the saved policy');
  assert.deepEqual(clone(state.skinPolicyDraft), ArkSkinPolicy.defaults(), 'which is the shipped, empty one');
  state.skinChoice = '27'; const sent = sentFor('notifyPreviewSkin').length;
  A.skinLabLeave();
  assert.equal(state.skinChoice, '', 'closing the lab drops the choice');
  assert(sentFor('notifyPreviewSkin').length > sent, 'and tells the canvas to take the skin off');
  console.log('PASS: admin-skin-lab: the skin policy is listed, saved as FLX, published, previewed by its own message and edited from the canvas\'s report');
})().catch((e) => { console.error(e); process.exit(1); });
