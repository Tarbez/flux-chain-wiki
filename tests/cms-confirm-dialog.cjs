'use strict';
/* Regression: docs/ux-audit/cms.md P2-11 (ledger OPEN until 2026-10-20). Delete, Restore, Publish-that-removes
   and Sign out asked with the browser's window.confirm: unstyled, worded one line long, no tone, English-only
   per browser, and invisible to a driver that does not listen for native dialogs. They now ask with Ark's
   AlertDialog (ArkKit.arkConfirm, @deadark/ark-ui 0.2.8), through ONE helper (js/admin/core.js confirmDialog),
   and the CALLER words every part: what will happen and whether it can be undone.
   Held here:
     - no editor file calls window.confirm except the helper's own no-kit fallback (core.js) and the locked
       page's (gate.js, which loads no Ark kit and is handed the editor's dialog through ArkGate.useConfirm);
     - confirmDialog goes to ArkKit.arkConfirm when the kit is there, else to window.confirm with the same words;
     - Delete (page) asks with tone 'danger', names the item, says Versions can bring a saved one back and that an
       unsaved one cannot come back, labels its buttons for what they do ("Delete page" / "Keep it"); answering
       No deletes nothing and Yes deletes;
     - an unconfirmed Restore over unsaved changes asks, and answers by Promise (No: nothing changes);
     - Publish-that-removes returns the dialog's Promise to ArkPublish, which awaits it. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { bootForms } = require('./lib/admin-forms-dom.cjs');

/* no native confirm left in the editor, bar the two fallbacks */
const adminDir = 'js/admin';
const offenders = [];
for (const f of fs.readdirSync(adminDir)) {
  if (!f.endsWith('.js') || f === 'auth.js') continue;
  const text = fs.readFileSync(path.join(adminDir, f), 'utf8');
  const n = (text.match(/window\.confirm\(/g) || []).length;
  const allowed = f === 'core.js' || f === 'gate.js' ? 1 : 0;
  if (n !== allowed) offenders.push(`${f}: ${n} window.confirm( (allowed ${allowed})`);
}
assert.deepEqual(offenders, [], 'the editor asks through confirmDialog, not window.confirm');

(async function main() {
  const { window, document, A, state } = bootForms();
  ['recordVersion', 'writeSearchFiles', 'removeRestoredExtras', 'writeRestoredOrder', 'restoreRemovalsPending', 'restoreReorderPending'].forEach((n) => { delete A[n]; });
  const run = (rel) => window.eval(fs.readFileSync(rel, 'utf8') + '\n//# sourceURL=' + rel);
  A.provide({ renderInspector: () => {}, renderStatus: () => {}, postCmsLayoutUndo: () => {}, postCmsLayoutRedo: () => {}, selectStudio: () => {}, renderList: () => {} });
  run('js/admin/history.js'); run('js/admin/versions-glue.js');

  /* no kit: window.confirm answers, with the same words */
  let native = null;
  window.confirm = (text) => { native = text; return false; };
  assert.equal(await A.confirmDialog({ title: 'Title?', message: 'Body.', confirmLabel: 'Go' }), false, 'without ArkKit the browser box answers');
  assert.equal(native, 'Title?\n\nBody.', 'with the dialog\'s own title and message');

  /* with the kit: arkConfirm, scripted */
  const asked = []; let answer = false;
  window.ArkKit = { arkConfirm: async (options) => { asked.push(options); return answer; } };
  window.confirm = () => { throw new Error('the native confirm must not be reached when the kit is loaded'); };

  /* Delete a page: the words, then No / Yes */
  const made = A.createPage('askme', { title: 'Ask me' });
  assert(made.ok && state.drafts.askme);
  answer = false; await A.deleteItem('page', 'askme');
  assert(state.drafts.askme, 'No: nothing was deleted');
  const q = asked[asked.length - 1];
  assert.equal(q.tone, 'danger', 'a delete is a destructive action');
  assert.equal(q.title, 'Delete the page “Ask me”?', 'the title names the item');
  assert.equal(q.confirmLabel, 'Delete page'); assert.equal(q.cancelLabel, 'Keep it', 'the buttons say what they do');
  assert.match(q.message, /not been saved yet, so this cannot be undone/, 'a page never saved cannot come back, and the dialog says so');
  answer = true; await A.deleteItem('page', 'askme');
  assert(!state.drafts.askme, 'Yes: the page is deleted');
  const saved = await (async () => { let got; window.ArkKit.arkConfirm = async (o) => { got = o; return false; }; await A.confirmDelete('article', 'A note', 'This removes its file and its card on the Learnings page.', false); return got; })();
  assert.match(saved.message, /bring it back from Versions/, 'a saved item\'s dialog says Versions brings it back');
  assert.match(saved.message, /^This removes its file and its card/, 'after what goes');

  /* an unconfirmed Restore over unsaved changes asks; the answer is a Promise */
  window.ArkKit.arkConfirm = async (o) => { asked.push(o); return answer; };
  A.setItemField('page', 'home', 'EYEBROW', 'Unsaved edit');
  const before = state.drafts.home.fields.EYEBROW.value;
  const version = A.siteFromState(); version.manifests.find((m) => m.id === 'home').fields.EYEBROW.value = 'From the version';
  answer = false;
  const pending = A.restoreVersion({ hash: 'h1', record: { seq: 3 } }, version, { removeExtras: false });
  assert(pending && typeof pending.then === 'function', 'an unconfirmed restore answers by Promise');
  assert.equal(await pending, false, 'No: the restore does not run');
  assert.equal(state.drafts.home.fields.EYEBROW.value, before, 'and nothing changed');
  assert.match(asked[asked.length - 1].title, /Restore version #3\?/); assert.match(asked[asked.length - 1].message, /Nothing is written until you Save/);
  answer = true;
  assert.equal(await A.restoreVersion({ hash: 'h1', record: { seq: 3 } }, version, { removeExtras: false }), true, 'Yes: it restores');
  assert.equal(state.drafts.home.fields.EYEBROW.value, 'From the version');

  /* the Publish removal question is the Promise ArkPublish awaits */
  const meshSource = fs.readFileSync('js/admin/mesh.js', 'utf8');
  assert(/return A\.confirmDialog\(\{ title: 'Publish and take these off the live site\?'/.test(meshSource) && /tone: 'danger'/.test(meshSource.slice(meshSource.indexOf("title: 'Publish and take these off"), meshSource.indexOf("title: 'Publish and take these off") + 900)), 'Publish that removes asks in a danger dialog and returns its Promise');
  assert(/confirmRemoval && !\(await confirmRemoval\(removes\)\)/.test(fs.readFileSync('js/admin/publish.js', 'utf8')), 'and ArkPublish awaits it');
  /* the locked page (gate.js) has no Ark kit: the editor hands it its dialog, and Sign out / Unlock ask through it, async */
  const gateSource = fs.readFileSync('js/admin/gate.js', 'utf8');
  assert(/useConfirm: function \(fn\)/.test(gateSource) && /signOut: async function \(\)/.test(gateSource) && /async function reauthenticate\(\)/.test(gateSource), 'ArkGate.useConfirm exists and signOut / reauthenticate wait for the answer');
  assert(/await ask\(\{ title: 'Sign out\?'/.test(gateSource) && /tone: 'danger'/.test(gateSource), 'Sign out over unsaved work asks in a danger dialog');
  assert(/gate\.useConfirm\(confirmDialog\)/.test(fs.readFileSync('js/admin/core.js', 'utf8')), 'the editor registers its dialog with the gate');
  console.log('PASS: Delete, Restore, Publish-that-removes and Sign out ask with Ark\'s AlertDialog through one helper, in the caller\'s words, danger-toned where destructive; No changes nothing.');
})().catch((error) => { console.error(error); process.exit(1); });
