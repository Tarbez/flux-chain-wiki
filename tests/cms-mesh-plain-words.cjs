'use strict';
/* Regression: docs/ux-audit/cms.md P1-2 (ledger PARTIAL until 2026-10-20). The Mesh / Publishing
   sheet still spoke the code's words to a person who only wants to know whether the site is live:
   a fieldset called "Deployment status", rows "Address (CID)" and "Owner key", a head reading
   "P2P deployment", and "Reachable: Yes". The editor's pattern for names the code uses is
   Developer details (js/admin/controls.js devDetails), closed, so nothing is lost and nothing
   shouts. Held here, for a host that answers and has a published version:
     - none of "Deployment status", "P2P deployment", "Address (CID)", "Owner key" is visible text
       outside Developer details;
     - the address and the owner key are still on the sheet, inside a closed Developer details;
     - the visible rows say live version / last published / publishing service, in plain words;
     - the account menu's publish line no longer prints the abbreviated address.
   Runs the real mesh.js in jsdom (tests/lib/admin-forms-dom.cjs). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { bootForms } = require('./lib/admin-forms-dom.cjs');

(async function main() {
  const { window, document, A } = bootForms();
  const tick = () => new Promise((r) => setTimeout(r, 0));
  for (const [id, tag] of [['publish', 'button'], ['meshRefresh', 'button'], ['meshNav', 'button'], ['meshState', 'p'], ['meshOwner', 'p'], ['mesh', 'details'], ['who', 'span']]) {
    const el = document.createElement(tag); el.id = id; document.body.appendChild(el);
  }
  const sheet = document.createElement('aside'); sheet.id = 'sheet'; sheet.hidden = true; document.body.appendChild(sheet);
  const CID = 'bafyexampleaddress0000000000000000000000000000000000000';
  const KEY = 'ownerkeyexample00000000000000000000000000=';
  const info = { ok: true, reachable: true, name: 'defxn.com', miner: { label: 'Ark Miner', networkId: 'dev' }, current: { version: 3, cid: CID, ownerPublicKey: KEY, updatedAt: '2026-10-20 03:30' } };
  window.ArkPublish = { create: (env) => ({ identity: () => null, status: async () => info,
    pullSite: async () => ({ site: { manifests: [], articles: [], assets: [], secrets: [] } }), publishSite: async () => { throw new Error('must not publish'); } }) };
  A.provide({ selectMesh: () => {}, openMeshSheet: () => {} });
  window.eval(fs.readFileSync('js/admin/mesh.js', 'utf8') + '\n//# sourceURL=js/admin/mesh.js');
  await A.refreshMesh();
  /* the account menu's second "Publishing service" block is gone (cms.md P2-9, 2026-10-21): the sheet below is the
     one place the service's state is said */
  assert(!fs.readFileSync('admin-app.html', 'utf8').includes('id="meshState"'), 'the account menu no longer repeats the publishing state');

  const box = document.createElement('div'); document.body.appendChild(box);
  A.renderMeshEditor(box);
  for (let i = 0; i < 80 && !box.querySelector('.mesh-dev .dev-details'); i++) await tick();
  const dev = box.querySelector('.mesh-dev .dev-details');
  assert(dev, 'the status fieldset carries a Developer details disclosure');
  assert.match(dev.textContent, /Address \(CID\)/); assert(dev.textContent.includes(CID), 'the address is still on the sheet, inside Developer details');
  assert.match(dev.textContent, /Owner key/); assert(dev.textContent.includes(KEY), 'and so is the owner key');
  assert.equal(dev.getAttribute('data-state'), 'closed', 'Developer details starts closed');

  const clone = box.cloneNode(true); clone.querySelectorAll('.dev-details, details.mesh-security').forEach((el) => el.remove());
  const visible = clone.textContent;
  for (const word of ['Deployment status', 'P2P deployment', 'Address (CID)', 'Owner key', 'Reachable', 'Published through', 'network dev']) assert(!visible.includes(word), `"${word}" is jargon outside Developer details: ${visible.slice(0, 200)}`);
  assert(dev.textContent.includes('Published through'), 'the miner the site goes through is a Developer detail, not lost');
  /* the security notes say it plainly; their technical names (IPFS, AES-GCM, the key's file) are their own Developer details */
  const essay = box.querySelector('details.mesh-security').cloneNode(true); essay.querySelectorAll('.dev-details').forEach((el) => el.remove());
  for (const word of ['IPFS', 'AES-GCM', 'content-addressed', 'js/admin/auth.js', 'flux-chain.ark']) assert(!essay.textContent.includes(word), `the security notes say "${word}" outside Developer details`);
  assert(box.querySelector('details.mesh-security .dev-details'), 'and keep those names under Developer details');
  for (const word of ['Publishing status', 'Live version', 'Last published', 'Publishing service', 'Answering']) assert(visible.includes(word), `the sheet says "${word}"`);

  /* the warning that lived only in the removed menu block: an identity that does not own the name is told so on the
     sheet, first among what stops a publish, with the way to fix it (cms.md P2-9, 2026-10-21) */
  const second = bootForms();
  for (const [id, tag] of [['publish', 'button'], ['meshNav', 'button'], ['who', 'span']]) { const el = second.document.createElement(tag); el.id = id; second.document.body.appendChild(el); }
  const sheet2 = second.document.createElement('aside'); sheet2.id = 'sheet'; sheet2.hidden = true; second.document.body.appendChild(sheet2);
  second.window.ArkPublish = { create: (env) => ({ identity: () => ({ publicKeyB64: 'someoneelse0000000000000000000000000000000=', displayName: 'Other' }), status: async () => info,
    pullSite: async () => ({ site: { manifests: [], articles: [], assets: [], secrets: [] } }), publishSite: async () => { throw new Error('must not publish'); } }) };
  second.A.provide({ selectMesh: () => {}, openMeshSheet: () => {} });
  second.window.eval(fs.readFileSync('js/admin/mesh.js', 'utf8') + '\n//# sourceURL=js/admin/mesh.js');
  const other = second.document.createElement('div'); second.document.body.appendChild(other);
  second.A.renderMeshEditor(other);
  for (let i = 0; i < 80 && !other.querySelector('#meshReadiness .notice'); i++) await tick();
  /* the account menu's chip names who is signed in; their signing key is not printed there (P1-2) */
  const chip = second.document.getElementById('who');
  await second.A.refreshMesh();
  assert.equal(chip.textContent, 'Other', 'the chip shows the name only: ' + chip.textContent);
  const blocker = other.querySelector('#meshReadiness .notice');
  assert(blocker && /does not own the site's name/.test(blocker.textContent) && /Sign in/.test(blocker.textContent), 'another identity is told it does not own the name, with Sign in: ' + (blocker && blocker.textContent.slice(0, 160)));
  console.log('PASS: the Publishing sheet speaks plainly; the address and owner key live under Developer details; it is the one place the state is said, owner mismatch included.');
})().catch((error) => { console.error(error); process.exit(1); });
