'use strict';
/* A refused Publish says why where the person looks, and a click on it opens the reason and its
   remedy; the Publish sheet never prints "undefined".

   Why this exists (docs/ux-audit/cms.md P0-4): with no miner running, Publish was a teal button
   with a faint disabled tint whose reason lived only in a hover tooltip -- a click did nothing at
   all -- and the Mesh sheet's head read "undefined — P2P deployment" (js/admin/mesh.js
   concatenated info.name when the host reported none), then a long security essay, and never
   said how to start the miner. Held here:
     - refuse(button, reason, explain) (js/admin/core.js) keeps the button clickable: marked
       unavailable (aria-disabled, the reason as its tooltip), a click runs explain(reason)
       INSTEAD of the button's own action, and enabling it again restores both;
     - Publish refused for an unreachable miner: a click opens the Publish sheet;
     - the sheet, for a host that names no site and no miner: no "undefined" anywhere, the
       blocking reason first with how to start Ark Miner (Desktop app, or `npm start` in
       ark-miner-cli) and a Check again button; the security notes folded under a disclosure.
   Runs the real core.js / notice.js / mesh.js in jsdom (tests/lib/admin-forms-dom.cjs) with a
   publish client whose host answers like the browser harness's: {} (no name, not reachable). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { bootForms } = require('./lib/admin-forms-dom.cjs');

(async function main() {
  const { window, document, A } = bootForms();
  const tick = () => new Promise((r) => setTimeout(r, 0));

  /* ---- refuse(button, reason, explain) ---- */
  const button = document.createElement('button'); button.title = 'Do the thing'; document.body.appendChild(button);
  let ran = 0, explained = [];
  button.addEventListener('click', () => { ran += 1; });
  A.refuse(button, 'Cannot do the thing: the service is not running. Start it, then Refresh.', (reason) => explained.push(reason));
  assert.equal(button.disabled, false, 'a refusal with an explanation stays clickable');
  assert.equal(button.getAttribute('aria-disabled'), 'true', 'and reads as unavailable');
  assert.match(button.title, /^Cannot do the thing: /, 'the reason is its tooltip');
  button.click();
  assert.equal(ran, 0, 'a click on a refused button does not run its action');
  assert.deepEqual(explained, ['Cannot do the thing: the service is not running. Start it, then Refresh.'], 'a click opens the reason instead');
  A.refuse(button, '', (reason) => explained.push(reason));
  assert.equal(button.hasAttribute('aria-disabled'), false);
  assert.equal(button.title, 'Do the thing', 'enabling restores the button\'s own tooltip');
  button.click();
  assert.equal(ran, 1, 'an enabled button runs its action again');
  const plain = document.createElement('button'); document.body.appendChild(plain);
  A.refuse(plain, 'Nothing to save: every draft matches its saved copy.');
  assert.equal(plain.disabled, true, 'without an explanation, refuse() still disables (the old contract)');

  /* ---- mesh.js: Publish, refused, explains itself; the sheet says why and how ---- */
  for (const [id, tag] of [['publish', 'button'], ['meshRefresh', 'button'], ['meshNav', 'button'], ['meshState', 'p'], ['meshOwner', 'p'], ['mesh', 'details'], ['who', 'span']]) {
    const el = document.createElement(tag); el.id = id; document.body.appendChild(el);
  }
  const sheet = document.createElement('aside'); sheet.id = 'sheet'; sheet.hidden = true; document.body.appendChild(sheet);
  let sheetOpened = 0;
  window.ArkPublish = { create: (env) => ({ identity: env.identity, status: async () => ({ ok: true }), pullSite: async () => ({}), publishSite: async () => { throw new Error('must not publish'); } }) };
  A.provide({ selectMesh: () => {}, openMeshSheet: () => { sheetOpened += 1; } });
  window.eval(fs.readFileSync('js/admin/mesh.js', 'utf8') + '\n//# sourceURL=js/admin/mesh.js');
  await A.refreshMesh();
  const publish = document.getElementById('publish');
  assert.equal(publish.disabled, false, 'Publish with no miner is not disabled: a click on it must be able to explain');
  assert.equal(publish.getAttribute('aria-disabled'), 'true', 'Publish with no miner reads as unavailable');
  assert.match(publish.title, /Ark Miner is not reachable/);
  publish.click();
  assert.equal(sheetOpened, 1, 'a click on the refused Publish opens the Publish sheet');

  const box = document.createElement('div'); document.body.appendChild(box);
  A.renderMeshEditor(box);
  for (let i = 0; i < 50 && !box.querySelector('#meshReadiness .notice'); i++) await tick();
  assert(!/undefined/.test(box.textContent), 'the Publish sheet prints "undefined": ' + box.textContent.slice(0, 160));
  assert.match(box.querySelector('.route').textContent, /^This site — Publishing status$/, 'a host that names no site: "This site", never "undefined"');
  const reason = box.querySelector('#meshReadiness .notice');
  assert(reason, 'the sheet does not say what blocks publishing');
  assert.equal(box.firstElementChild.nextElementSibling.id, 'meshReadiness', 'the reason comes first, right under the head');
  assert.match(reason.textContent, /Ark Miner is not running/);
  assert.match(reason.textContent, /Ark Miner Desktop app/, 'the remedy names the app to open');
  assert.match(reason.textContent, /`npm start` in the ark-miner-cli folder/, 'and the command line way');
  const again = [...reason.querySelectorAll('[data-part="alert-action"]')].find((b) => b.textContent === 'Check again');
  assert(again, 'the reason has a Check again button');
  again.click();
  for (let i = 0; i < 50 && !box.querySelector('#meshReadiness .notice'); i++) await tick();
  assert(box.querySelector('#meshReadiness .notice'), 'Check again lost the reason');
  const essay = box.querySelector('details.mesh-security');
  assert(essay && !essay.open, 'the security notes are folded under their own disclosure, closed');
  assert.match(essay.querySelector('summary').textContent, /How publishing keeps things private/);
  const reachRow = () => [...box.querySelectorAll('.mesh-row')].find((r) => r.firstChild.textContent === 'Publishing service');
  for (let i = 0; i < 50 && !reachRow(); i++) await tick();
  const reach = reachRow();
  assert.equal(reach && reach.lastChild.textContent, 'Not answering', 'a service that gives no detail reads "Not answering", not "Not answering —"');

  console.log('PASS: a refused Publish stays clickable and opens its reason; the Publish sheet says what blocks it and how to start Ark Miner, with Check again, and never prints "undefined".');
})().catch((error) => { console.error(error); process.exit(1); });
