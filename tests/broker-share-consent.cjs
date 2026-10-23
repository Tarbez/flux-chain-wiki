'use strict';
/* The identity broker shares a public key and name only after the person says yes to that exact
   origin (js/broker/broker.js, SHARING).

   Why this exists (2026-10-23): the broker answered `flux-broker:request-identity` from any
   allowlisted origin with no prompt. The allowlist holds every <label>.defxn.com, and the gateway
   serves other people's sites there. Any such page could learn who the visitor is. Each case names
   the defect it catches. Runs the real broker.html and broker.js in jsdom, with the Auth Kit
   bundle stood in by a recorder of its onChange (the bundle opens a file only through its own UI). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

function boot() {
  const html = fs.readFileSync('broker.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://defxn.com/broker.html' });
  const w = dom.window;
  let auth = null;
  w.ArkAdminAuth = { create(options) { auth = options; } };
  w.eval(fs.readFileSync('js/broker/broker.js', 'utf8'));
  const replies = [];
  function ask(origin, data = { type: 'flux-broker:request-identity' }) {
    const event = new w.Event('message');
    const source = { postMessage(message, target) { replies.push({ origin, target, message }); } };
    Object.defineProperties(event, { origin: { value: origin }, data: { value: data }, source: { value: source } });
    w.dispatchEvent(event);
  }
  const box = () => w.document.getElementById('brokerShare');
  const button = (text) => [...box().querySelectorAll('button')].find((b) => b.textContent.startsWith(text));
  const status = () => w.document.getElementById('brokerStatus').textContent;
  return { w, ask, replies, box, button, status, unlock: (id) => auth.onChange(id) };
}

const A = 'https://alice-site.defxn.com', B = 'https://genesis.defxn.com';
const K1 = { publicKeyB64: 'K1', displayName: 'one', sign() {} }, K2 = { publicKeyB64: 'K2', displayName: 'two', sign() {} };

{ /* The defect itself: an identity request was answered with no prompt. */
  const t = boot();
  t.unlock(K1);
  t.ask(A);
  assert.equal(t.replies.length, 0, 'no identity leaves before the person says yes');
  assert.equal(t.box().hidden, false, 'the share prompt is shown');
  assert.match(t.box().textContent, /alice-site\.defxn\.com asks for your public key and name/, 'the prompt names the exact origin');
  t.button('Share with').click();
  assert.equal(t.replies.length, 1);
  assert.deepEqual({ ...t.replies[0].message.identity }, { publicKeyB64: 'K1', displayName: 'one' }, 'only the public fields are shared');
  assert.equal(t.replies[0].target, A, 'the reply goes to the asking origin only');
  assert.equal(t.box().hidden, true, 'the prompt closes after the answer');
  /* A yes lasts for this tab and identity, so one site does not ask twice. */
  t.ask(A);
  assert.equal(t.replies.length, 2, 'the same origin is answered again without a second prompt');
  assert.equal(t.box().hidden, true);
}

{ /* A request made before unlock waits, then still asks: unlocking is not consent. */
  const t = boot();
  t.ask(A);
  assert.equal(t.replies.length, 0);
  t.unlock(K1);
  assert.equal(t.replies.length, 0, 'unlocking alone shares nothing');
  assert.equal(t.box().hidden, false);
}

{ /* A no answers every waiting request from that origin, and names who was refused. */
  const t = boot();
  t.unlock(K1);
  t.ask(A); t.ask(A); t.ask(B);
  assert.match(t.box().textContent, /alice-site/);
  t.button('Don').click();
  const toA = t.replies.filter((r) => r.origin === A);
  assert.equal(toA.length, 2, 'both requests from the refused origin are answered');
  for (const r of toA) assert.deepEqual([r.message.identity, r.message.error], [null, 'denied']);
  assert.match(t.status(), /did not share your identity with https:\/\/alice-site\.defxn\.com/);
  assert.match(t.box().textContent, /genesis\.defxn\.com asks/, 'the next origin is asked on its own');
  assert.equal(t.replies.filter((r) => r.origin === B).length, 0, 'a no to one origin shares nothing with another');
}

{ /* Unlocking a different identity forgets every yes: the person agreed to share ONE key. */
  const t = boot();
  t.unlock(K1);
  t.ask(A); t.button('Share with').click();
  t.unlock(K2);
  t.ask(A);
  assert.equal(t.replies.length, 1, 'a yes for K1 does not share K2');
  assert.equal(t.box().hidden, false);
  t.button('Share with').click();
  assert.equal(t.replies[1].message.identity.publicKeyB64, 'K2');
}

{ /* Signed out while the prompt is open: a late yes shares nothing, and the request waits. */
  const t = boot();
  t.unlock(K1);
  t.ask(A);
  t.unlock(null);
  t.button('Share with').click();
  assert.equal(t.replies.length, 0, 'no identity is sent after sign-out');
  t.unlock(K1);
  assert.equal(t.box().hidden, false, 'the waiting request is asked again after unlock');
}

{ /* The allowlist still holds: a foreign origin is never answered or prompted for. */
  const t = boot();
  t.unlock(K1);
  t.ask('https://defxn.com.evil.example');
  t.ask('null');
  assert.equal(t.replies.length, 0);
  assert.equal(t.box().hidden, true);
}

console.log('broker share consent: ok');
