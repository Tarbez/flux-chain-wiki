'use strict';
/* The content forms are panels: each draws into whatever container it is handed and edits the
   same drafts the old Content layout's centre column did.

   Why this test exists: until 2026-10-18 every content form (page, article, image, encrypted
   item, page shapes, Theme & defaults) drew itself into ONE fixed element, #editor, chosen by a
   dispatcher reading state.kind. The one-workspace merge deleted that column; the forms now
   open in a sheet, the rail's Media and Vault tabs and the Theme view. A form that still
   reached for #editor would draw nothing there and no test of the store would notice -- so
   each panel here is mounted in a detached (or a plain) container and edited through its own
   controls, and the draft is asserted, not the DOM. Also held here:
     - typing never rebuilds the form under the caret (the canvas now updates on every
       keystroke, and the shell re-mounts panels on preview messages);
     - an inline edit made on the canvas (setItemField with {canvas:false}) reaches the draft
       and the open form without remounting the canvas;
     - a refused field write says what it needs;
     - "Clean text fields" cleans (it compared each field OBJECT to a string and cleaned
       nothing), and the Code tab's outline shows values, not "[object Object]";
     - the data-driven selects (routes, reference docs, shape pages) write the value their
       label names (tests/admin-control-labels.cjs leaves contentChoices lists to this file);
     - shapes stay reachable for pages with no manifest (Demo, Lab).
   Runs the real editor modules in jsdom (tests/lib/admin-forms-dom.cjs). */
const assert = require('node:assert/strict');
const { bootForms, type, choose } = require('./lib/admin-forms-dom.cjs');

(async function main() {
  const { window, document, A, state, calls } = bootForms();
  window.confirm = () => true;
  const posted = () => calls.filter((c) => c.name === 'notifyPreviewState').length;
  const detached = () => document.createElement('div');

  /* ---- page fields: every manifest field of every page, in a detached container ---- */
  for (const id of state.ids) {
    const box = A.renderPageFields(detached(), id);
    const m = state.drafts[id];
    for (const role of Object.keys(m.fields)) {
      const fid = 'f-' + id + '-' + role.replace(/\./g, '-');
      const control = m.fields[role].kind === 'link' ? box.querySelector('#lp-type-' + fid) : box.querySelector('#' + fid);
      assert(control, `page ${id}: field ${role} has its control`);
      if (m.fields[role].kind !== 'link') assert.equal(control.value, m.fields[role].value, `page ${id}: ${role} shows its draft value`);
    }
    const tabs = [...box.querySelectorAll('[role="tab"]')].map((t) => t.textContent);
    assert(tabs.includes('Content') && tabs.includes('SEO') && tabs.includes('Code'), `page ${id}: Content / SEO / Code tabs (${tabs})`);
    assert(!box.querySelector('#editor'), 'nothing is drawn into a fixed #editor');
  }
  assert(!document.getElementById('editor'), 'the forms never needed an #editor element');
  const homeTabs = [...A.renderPageFields(detached(), 'home').querySelectorAll('[role="tab"]')].map((t) => t.textContent);
  assert(homeTabs.includes('Shape'), 'a page with a background shape keeps its Shape tab');

  /* ---- typing: the draft changes, the canvas is asked, the form is not rebuilt ---- */
  const mount = document.getElementById('mount');
  A.renderPageFields(mount, 'home');
  const eyebrow = mount.querySelector('#f-home-EYEBROW');
  const before = posted();
  type(window, eyebrow, 'Typed live');
  assert.equal(state.drafts.home.fields.EYEBROW.value, 'Typed live', 'a keystroke writes the manifest field draft');
  assert.equal(posted(), before + 1, 'and asks the bridge to send the drafts to the canvas');
  assert.equal(mount.querySelector('#f-home-EYEBROW'), eyebrow, 'the form was not rebuilt under the caret');
  assert.equal(document.activeElement, eyebrow, 'the field keeps focus');
  assert(A.anyDirty() && !document.getElementById('save').disabled, 'Save is enabled by the edit');
  type(window, eyebrow, '');
  assert(eyebrow.closest('.row').classList.contains('empty'), 'an emptied page field is marked empty');
  type(window, eyebrow, 'Typed live');

  /* ---- a repaint (structural edit, a shell refresh) keeps focus and caret ---- */
  eyebrow.setSelectionRange(2, 5);
  A.repaintPanels('page', 'home');
  const again = mount.querySelector('#f-home-EYEBROW');
  assert.notEqual(again, eyebrow, 'the panel was really redrawn');
  assert.equal(document.activeElement, again, 'the redrawn field has focus');
  assert.deepEqual([again.selectionStart, again.selectionEnd], [2, 5], 'and the same selection');

  /* ---- the canvas's inline edit: draft + open form, no remount ---- */
  state.cmsSourceSite = A.siteFromState();
  again.blur();
  const beforeInline = posted();
  const r = A.setItemField('page', 'home', 'TITLE', 'Edited on the canvas', { canvas: false });
  assert.deepEqual({ ...r }, { ok: true, changed: true });
  assert.equal(state.drafts.home.fields.TITLE.value, 'Edited on the canvas');
  assert.equal(mount.querySelector('#f-home-TITLE').value, 'Edited on the canvas', 'the open form shows the canvas edit');
  assert.equal(posted(), beforeInline, 'an edit made on the canvas does not remount it');
  assert.equal(state.cmsSourceSite.manifests.find((m) => m.id === 'home').fields.TITLE.value, 'Edited on the canvas', "the canvas's copy of the site carries it for the next remount");
  /* the focused control is never overwritten under the person typing in it */
  const TEXT = Object.keys(state.drafts.home.fields).find((k) => state.drafts.home.fields[k].kind === 'text');
  const deck = mount.querySelector('#f-home-' + TEXT.replace(/\./g, '-')); deck.focus(); deck.value = 'mine';
  A.setItemField('page', 'home', TEXT, 'theirs', { canvas: false });
  assert.equal(deck.value, 'mine', 'a focused field keeps what is being typed');

  /* ---- refusals name what they need ---- */
  let no = A.setItemField('page', 'home', 'NOPE', 'x');
  assert(!no.ok && /no field "NOPE"/.test(no.refusal) && /js\/content\/manifests\/home\.js/.test(no.refusal), 'an unknown field is refused, naming the fields and where a field is added');
  no = A.setItemField('page', 'nosuchpage', 'TITLE', 'x');
  assert(!no.ok && /No page "nosuchpage"/.test(no.refusal), 'an unknown page is refused');
  no = A.setItemField('page', 'home', 'TITLE', 42);
  assert(!no.ok && /takes text/.test(no.refusal), 'a non-string value is refused');
  no = A.setItemField('asset', 'x', 'label', 'x');
  assert(!no.ok && /Media and Vault/.test(no.refusal), 'a kind it does not edit is refused with where that kind is edited');

  /* ---- Revert: says why when disabled; puts the saved copy back ---- */
  const revert = mount.querySelector('[data-revert="page:home"]');
  assert(!revert.disabled, 'Revert is enabled on a dirty page');
  revert.click();
  assert.equal(JSON.stringify(state.drafts.home), state.saved.home, 'Revert restored the saved page');
  const revert2 = mount.querySelector('[data-revert="page:home"]');
  assert(revert2.disabled && /Nothing to revert/.test(revert2.title), 'a clean page refuses Revert with the reason');

  /* ---- Add a point: structure changes, the form redraws ---- */
  const pointPage = state.ids.find((id) => state.drafts[id].fields['POINT1.TITLE']);
  if (pointPage) {
    const box = A.renderPageFields(detached(), pointPage);
    const n = window.ArkManifest.points(state.drafts[pointPage]);
    [...box.querySelectorAll('button')].find((b) => b.textContent === 'Add a point').click();
    assert.equal(window.ArkManifest.points(state.drafts[pointPage]), n + 1, 'Add a point adds one');
    assert(box.querySelector('#f-' + pointPage + '-POINT' + (n + 1) + '-TITLE'), 'and the detached form shows it');
  }

  /* ---- the Code tab: clean, outline ---- */
  A.setItemField('page', 'home', TEXT, 'Two  \nlines\n\n\n\nend  ');
  const code = A.renderPageFields(detached(), 'home', { tab: 'code' });
  assert(!/\[object Object\]/.test(code.querySelector('.code-view').value), 'the outline shows field values');
  [...code.querySelectorAll('button')].find((b) => b.textContent === 'Clean text fields').click();
  assert.equal(state.drafts.home.fields[TEXT].value, 'Two\nlines\n\nend', 'Clean text fields trims trailing spaces and blank-line runs');
  A.revertItem('page', 'home');

  /* ---- data-driven selects write the value their label names ---- */
  const nav = A.renderPageFields(detached(), state.ids.find((id) => state.drafts[id].meta.next) || 'home');
  const next = nav.querySelector('#m-the-onward-link-opens');
  if (next) for (const o of [...next.options]) assert.equal(o.textContent, (window.ArkUI.pageCatalog[o.value].title.replace(' — Flux Protocol', '') + '  ' + window.ArkUI.pageCatalog[o.value].path), 'a route option shows its own route');

  /* ---- articles ---- */
  const slug = state.slugs[0];
  const art = A.renderArticleFields(detached(), slug);
  for (const key of ['title', 'category', 'minutes', 'summary', 'core', 'relevance', 'reviewed', 'evidenceLabel', 'actionLabel']) assert(art.querySelector('#a-' + slug + '-' + key), 'article field ' + key);
  for (const key of ['evidenceHref', 'relatedPage', 'actionPage']) assert(art.querySelector('#lp-type-a-' + slug + '-' + key), 'article link ' + key);
  type(window, art.querySelector('#a-' + slug + '-title'), 'Panel title');
  assert.equal(state.aDrafts[slug].title, 'Panel title');
  const hadQuestions = !!state.aDrafts[slug].questions;
  type(window, art.querySelector('#a-' + slug + '-s0-question'), 'Asked here?');
  assert.equal(state.aDrafts[slug].questions[0], 'Asked here?');
  if (!hadQuestions) assert.equal(state.aDrafts[slug].questions.length, state.aDrafts[slug].sections.length, 'the first question fills the rest from the headings');
  type(window, art.querySelector('#a-' + slug + '-s0-p1'), 'A new first paragraph.');
  assert.equal(state.aDrafts[slug].sections[0][1], 'A new first paragraph.');
  const linkType = art.querySelector('#lp-type-a-' + slug + '-evidenceHref');
  choose(window, linkType, 'doc');
  assert.equal(state.aDrafts[slug].evidenceHref, 'doc:', 'changing a link type writes the bare tag');
  const docSelect = art.querySelector('#lp-value-a-' + slug + '-evidenceHref');
  assert.equal(docSelect.options[0].textContent, 'Not set', 'a blank link says Not set, not a value it does not have');
  choose(window, docSelect, docSelect.options[1].value);
  assert.equal(state.aDrafts[slug].evidenceHref, 'doc:' + docSelect.options[1].value);
  assert.equal(docSelect.options[1].textContent, docSelect.options[1].value, 'a doc option shows its own path');
  const sections = state.aDrafts[slug].sections.length;
  [...art.querySelectorAll('button')].find((b) => b.textContent === 'Add a section').click();
  assert.equal(state.aDrafts[slug].sections.length, sections + 1, 'Add a section');
  assert(art.querySelector('#a-' + slug + '-s' + sections + '-p0'), 'the new section is drawn');
  const numbers = art.querySelector('#a-' + slug + '-numbers');
  numbers.checked = !state.aDrafts[slug].numbers; numbers.dispatchEvent(new window.Event('change'));
  assert.equal(state.aDrafts[slug].numbers, numbers.checked, 'the numbers switch');
  A.revertItem('article', slug);
  assert.equal(JSON.stringify(state.aDrafts[slug]), state.aSaved[slug], 'article Revert');

  /* ---- create: refusals, then a real item through the delegated New forms ---- */
  assert(!A.createPage('Bad Name').ok && !A.createPage('home').ok, 'createPage refuses a bad or taken name');
  const form = document.createElement('form'); form.id = 'newForm';
  const input = document.createElement('input'); input.id = 'newId'; input.value = 'panelpage';
  form.appendChild(input); document.body.appendChild(form);
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  assert(state.drafts.panelpage && state.saved.panelpage === null && state.current === 'panelpage', 'New page made an unsaved draft and opened it');
  assert(A.renderPageFields(detached(), 'panelpage').querySelector('#f-panelpage-TITLE'), 'the new page renders');
  form.remove();
  const ca = A.createArticle('panel-note');
  assert(ca.ok && state.aSaved['panel-note'] === null && A.renderArticleFields(detached(), 'panel-note').querySelector('#a-panel-note-title'), 'createArticle');
  assert(!A.createArticle('panel-note').ok, 'createArticle refuses a taken slug');

  /* ---- delete: an unsaved page goes, and a canvas showing it moves to Home ---- */
  state.cmsCurrentRoute = state.drafts.panelpage.route;
  await A.deleteItem('page', 'panelpage');
  assert(!state.drafts.panelpage && state.ids.indexOf('panelpage') < 0, 'deleteItem removed the page draft');
  assert.equal(state.cmsCurrentRoute, '/', 'the canvas left the deleted route before anything was posted to it');
  await A.deleteItem('article', 'panel-note');
  assert(!state.aDrafts['panel-note'], 'deleteItem removed the article draft');

  /* ---- Media: list, open, label, create, replace ---- */
  const media = A.renderMediaPanel(mount);
  assert.equal(media.querySelectorAll('[data-cms-item^="asset:"]').length, state.assetIds.length, 'one row per image');
  const firstAsset = state.assetIds[0];
  media.querySelector('[data-cms-item="asset:' + firstAsset + '"]').click();
  const label = media.querySelector('#as-' + firstAsset + '-label');
  assert(label, 'opening an image shows its detail inline');
  type(window, label, 'Panel label');
  assert.equal(state.assetDrafts[firstAsset].label, 'Panel label', 'the label edit reaches the draft');
  assert.equal(media.querySelector('[data-cms-item="asset:' + firstAsset + '"] .media-name').textContent, 'Panel label', 'and the row');
  assert(media.querySelector('[data-cms-item="asset:' + firstAsset + '"] .dot'), 'the row has its unsaved dot');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const file = new window.File([png], 'Panel Dot.png', { type: 'image/png' });
  const fileInput = media.querySelector('#newAssetFile');
  Object.defineProperty(fileInput, 'files', { value: [file] });
  fileInput.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise((resolve) => { const t = setInterval(() => { if (!media.querySelector('#newAssetPreview').hidden) { clearInterval(t); resolve(); } }, 5); });
  assert.equal(media.querySelector('#newAssetId').value, 'panel-dot', 'choosing a file previews it and fills its name');
  media.querySelector('#newAssetForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  assert(state.assetDrafts['panel-dot'] && state.assetSaved['panel-dot'] === null && state.assetDrafts['panel-dot'].mime === 'image/png', 'New image made an unsaved image draft');
  assert(mount.querySelector('#as-panel-dot-label'), 'the new image opens in the Media panel');
  await A.deleteItem('asset', 'panel-dot');
  assert(!state.assetDrafts['panel-dot'], 'deleteItem removed the image draft');
  A.revertItem('asset', firstAsset);

  /* ---- Vault: create, encrypt, decrypt ---- */
  const vault = A.renderVaultPanel(mount);
  vault.querySelector('#newSecretId').value = 'panel-secret';
  vault.querySelector('#newSecretForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  assert(state.secretDrafts['panel-secret'], 'New encrypted item made a draft');
  [...mount.querySelectorAll('button')].find((b) => b.textContent === 'Add my own key').click();
  type(window, mount.querySelector('textarea[placeholder="The content to encrypt"]'), 'the panel plaintext');
  [...mount.querySelectorAll('button')].find((b) => b.textContent === 'Encrypt & lock').click();
  await new Promise((resolve) => { const t = setInterval(() => { if (state.secretDrafts['panel-secret'].ciphertextBase64) { clearInterval(t); resolve(); } }, 5); });
  assert.equal(state.secretPlaintext['panel-secret'], '', 'the plaintext is dropped once encrypted');
  assert(!JSON.stringify(state.secretDrafts['panel-secret']).includes('the panel plaintext'), 'the draft holds ciphertext only');
  [...mount.querySelectorAll('button')].find((b) => b.textContent === 'Decrypt to check').click();
  await new Promise((resolve) => { const t = setInterval(() => { if (state.secretDecrypted['panel-secret'] !== undefined) { clearInterval(t); resolve(); } }, 5); });
  assert([...mount.querySelectorAll('textarea[readonly]')].some((t) => t.value === 'the panel plaintext'), 'Decrypt to check shows the plaintext');
  await A.deleteItem('secret', 'panel-secret');
  assert(!state.secretDrafts['panel-secret'], 'deleteItem removed the encrypted item');

  /* ---- Shapes: site-wide tuning + every shape page reachable ---- */
  const shapes = A.renderShapesPanel(detached());
  assert(shapes.querySelector('input[type="range"][id^="relief-"]'), 'the shared tuning is there');
  const pick = shapes.querySelector('#shapes-page');
  assert.deepEqual([...pick.options].map((o) => o.value), [...state.shapeIds], 'every shape page, including the ones with no manifest, is offered');
  for (const o of pick.options) assert.equal(o.textContent, state.shapeLabels[o.value] || o.value, 'a shape page option shows its own label');
  const orphan = A.orphanShapeIds()[0];
  if (orphan) {
    choose(window, pick, orphan);
    const mode = shapes.querySelector('#shape-' + orphan + '-primary-mode');
    assert(mode, 'an orphan shape page (no Page fields) is editable here');
    choose(window, mode, 'none');
    assert.equal(state.meshDraft.pages[orphan].primaryMode, 'none', 'its shape mode reaches the mesh draft');
    assert(calls.some((c) => c.name === 'notifyPreviewMesh'), 'and the canvas is told');
  }

  /* one home per control: a shape page that has Page fields links there instead of a second editor */
  choose(window, pick, 'zero');
  assert(!shapes.querySelector('#shape-zero-primary-mode'), "Home's shapes are not drawn a second time in the Theme view");
  assert.equal(shapes.querySelector('[data-shape-owner]').dataset.shapeOwner, 'home', 'it links to the page whose Page fields hold them');

  /* ---- every surface open at once (the Theme view, Media, Vault, a page's sheet on its Shape
     tab): no id appears twice in the document ---- */
  document.body.textContent = '';
  for (const [name, args] of [['renderThemePanel', []], ['renderShapesPanel', []], ['renderMediaPanel', []], ['renderVaultPanel', []], ['renderPageFields', ['home', { tab: 'shape' }]]]) {
    const box = document.createElement('div'); document.body.appendChild(box); A[name].apply(null, [box].concat(args));
  }
  A.setItemField('page', 'home', 'TITLE', state.drafts.home.fields.TITLE.value);
  const seen = {}, twice = [];
  for (const el of document.querySelectorAll('[id]')) { if (seen[el.id]) twice.push(el.id); seen[el.id] = true; }
  assert.deepEqual(twice, [], 'ids are unique with every form surface open together');
  assert(document.querySelector('#shape-zero-primary-mode'), "Home's Shape tab is the one place its shapes are edited");

  /* ---- Theme & defaults ---- */
  const theme = A.renderThemePanel(detached());
  assert(theme.querySelector('#siteSeo') && theme.querySelector('#theme-active'), 'Theme & defaults draws the theme and the site-wide SEO');
  assert.equal(A.renderThemePanel, A.renderDesignEditor, 'one function under both names');

  console.log('PASS: every content form draws into a given container and edits the same drafts; typing never rebuilds a form; canvas edits reach the draft without a remount; refusals name what they need.');
})().catch((error) => { console.error(error); process.exit(1); });
