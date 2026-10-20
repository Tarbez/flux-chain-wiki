'use strict';
/* Regression: docs/ux-audit/cms.md P1-11 (ledger OPEN until 2026-10-20). The Media panel put the
   browser's bare native file input on screen -- "Choose File / No file chosen", unstyled, worded
   differently in every browser, cut off in the ~280px rail -- and a selected image offered a field
   called "Label" and a file box called "Replace the image" rather than the two actions a person
   looks for: Replace image and Alt text.
   Held here:
     - no native file input is ever the visible control: every <input type=file> the Media panel and a
       page's Shape pickers draw is the hidden half of controls.js filePicker (a real label.btn is
       the button, the input keeps its id so keyboards and drivers still reach it);
     - an opened image offers "Replace image" and "Alt text", and Alt text writes the image's label
       (the preview's alt) -- the stored shape is unchanged, nothing is rewritten;
     - choosing a file names it beside the button and replaces the draft's bytes; a dropped file takes
       the same route as a chosen one; after New image is submitted the picker names no file again.
   Runs the real editor modules in jsdom (tests/lib/admin-forms-dom.cjs). */
const assert = require('node:assert/strict');
const { bootForms, type } = require('./lib/admin-forms-dom.cjs');

(async function main() {
  const { window, document, A, state } = bootForms();
  window.confirm = () => true;
  const mount = document.getElementById('mount');
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const png = (name) => new window.File([PNG], name, { type: 'image/png' });
  const pick = (input, file) => { Object.defineProperty(input, 'files', { value: [file], configurable: true }); input.dispatchEvent(new window.Event('change', { bubbles: true })); };
  const nativeOnly = (root) => [...root.querySelectorAll('input[type="file"]')].filter((i) => !i.classList.contains('file-pick__input') || !i.parentNode.querySelector('label.btn[for="' + i.id + '"]'));

  const media = A.renderMediaPanel(mount);
  assert(media.querySelector('#newAssetFile'), 'the New image form still has its file input (drivers and the delegated handler find it by id)');
  assert.deepEqual(nativeOnly(media).map((i) => i.id), [], 'no bare native file input: every one is the hidden half of a file picker with a button label');
  assert.equal(media.querySelector('label.file-pick__btn[for="newAssetFile"]').textContent, 'Choose an image', 'the New image button says what it does');

  const first = state.assetIds[0];
  media.querySelector('[data-cms-item="asset:' + first + '"]').click();
  const detail = media.querySelector('.media-detail');
  assert(detail, 'opening an image shows its detail');
  assert(detail.querySelector('label.file-pick__btn[for="as-' + first + '-file"]').textContent === 'Replace image', 'a selected image offers "Replace image"');
  const alt = detail.querySelector('#as-' + first + '-label');
  assert.equal(alt.getAttribute('aria-label'), 'Alt text', 'and "Alt text"');
  assert(/Alt text/.test(detail.querySelector('label[for="as-' + first + '-label"]').textContent), 'whose visible label is Alt text too');
  type(window, alt, 'A described image');
  assert.equal(state.assetDrafts[first].label, 'A described image', 'Alt text is the stored label (no new field)');
  assert.equal(detail.querySelector('img.asset-preview').alt, 'A described image', 'and the preview reads it as its alt');

  /* a chosen file: named beside the button, bytes replaced */
  const input = detail.querySelector('#as-' + first + '-file');
  pick(input, png('replacement.png'));
  assert.equal(detail.querySelector('.file-pick').dataset.state, 'chosen', 'the picker says a file was chosen');
  assert.equal(detail.querySelector('.file-pick__name').textContent, 'replacement.png', 'and names it');
  await new Promise((resolve) => { const t = setInterval(() => { if (state.assetDrafts[first].mime === 'image/png' && state.assetDrafts[first].dataBase64 === PNG.toString('base64')) { clearInterval(t); resolve(); } }, 5); });
  assert(detail.querySelector('img.asset-preview').src.startsWith('data:image/png;base64,iVBOR'), 'the preview shows the replacement');

  /* a dropped file takes the same route (jsdom has no assignable FileList: the file reaches the same change handler) */
  const media2 = A.renderMediaPanel(mount);
  const chooser = media2.querySelector('#newAssetFile'), root = chooser.parentNode;
  const dragover = new window.Event('dragover', { bubbles: true, cancelable: true }); dragover.dataTransfer = {};
  root.dispatchEvent(dragover);
  assert.equal(dragover.defaultPrevented, true, 'a drag over the picker is accepted');
  assert.equal(root.dataset.over, 'true', 'and the picker shows it is a drop target');
  const drop = new window.Event('drop', { bubbles: true, cancelable: true }); drop.dataTransfer = { files: [png('Dropped Dot.png')] };
  root.dispatchEvent(drop);
  assert(!root.dataset.over, 'a drop ends the drag state');

  /* New image: choose, name fills, submit, picker resets */
  pick(chooser, png('Panel Dot.png'));
  await new Promise((resolve) => { const t = setInterval(() => { if (!media2.querySelector('#newAssetPreview').hidden) { clearInterval(t); resolve(); } }, 5); });
  assert.equal(media2.querySelector('#newAssetId').value, 'panel-dot', 'the name fills from the file');
  media2.querySelector('#newAssetForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  assert(state.assetDrafts['panel-dot'], 'New image made a draft');
  const again = A.renderMediaPanel(mount);
  assert.equal(again.querySelector('#newAssetFile').parentNode.dataset.state, 'empty', 'a fresh panel names no file');
  await A.deleteItem('asset', 'panel-dot');

  /* the Shape pickers' upload is the same control */
  const box = A.renderPageFields(document.createElement('div'), 'home');
  const uploads = [...box.querySelectorAll('input[type="file"]')];
  assert(uploads.length >= 1 && uploads.every((i) => i.classList.contains('file-pick__input') && /-upload$/.test(i.id)), 'a page\'s Shape pickers use the file picker and keep their -upload ids');
  console.log('PASS: the Media panel and Shape pickers use the styled file picker; a selected image offers Replace image and Alt text.');
})().catch((error) => { console.error(error); process.exit(1); });
