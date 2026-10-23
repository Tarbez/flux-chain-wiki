'use strict';
/* A site that asks for the identity and hears "no" says so (js/ark/broker-client.js).

   Why this exists (2026-10-23): the broker began asking the person before it shares a public key
   (tests/broker-share-consent.cjs). A "no" came back as `identity: null`, which the client resolved
   like "nobody is signed in", so every site said "sign in and try again" to a person who was signed
   in and had chosen not to share. Runs the REAL broker (broker.html, js/broker/broker.js) and the REAL
   client in two jsdom windows, joined by a stand-in for the popup's postMessage channel. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const SITE = 'https://genesis.defxn.com', BROKER = 'https://defxn.com';

function message(w, origin, data, source) {
  const event = new w.Event('message');
  Object.defineProperties(event, { origin: { value: origin }, data: { value: data }, source: { value: source } });
  w.dispatchEvent(event);
}

function boot() {
  const brokerHtml = fs.readFileSync('broker.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
  const broker = new JSDOM(brokerHtml, { runScripts: 'outside-only', url: BROKER + '/broker.html' }).window;
  let auth = null;
  broker.ArkAdminAuth = { create(options) { auth = options; } };
  broker.eval(fs.readFileSync('js/broker/broker.js', 'utf8'));

  const site = new JSDOM('<body></body>', { runScripts: 'outside-only', url: SITE + '/' }).window;
  const backToSite = { postMessage(data, target) { assert.equal(target, SITE); setTimeout(() => message(site, BROKER, data, popup), 0); } };
  const popup = {
    closed: false,
    focus() {},
    postMessage(data, target) { assert.equal(target, BROKER); setTimeout(() => message(broker, SITE, data, backToSite), 0); },
  };
  site.open = () => popup;
  site.eval(fs.readFileSync('js/ark/broker-client.js', 'utf8'));
  const shareBox = () => broker.document.getElementById('brokerShare');
  const click = (text) => [...shareBox().querySelectorAll('button')].find((b) => b.textContent.startsWith(text)).click();
  const until = async (check) => { for (let i = 0; i < 200 && !check(); i++) await new Promise((r) => setTimeout(r, 10)); assert.ok(check(), 'timed out'); };
  return { site, broker, unlock: (id) => auth.onChange(id), shareBox, click, until };
}

const K1 = { publicKeyB64: 'K1', displayName: 'one', sign() {} };

(async () => {
  { /* The defect: a "no" read as "not signed in". */
    const t = boot();
    t.unlock(K1);
    const asked = t.site.ArkBroker.getIdentity();
    await t.until(() => !t.shareBox().hidden);
    t.click('Don');
    await assert.rejects(asked, (error) => {
      assert.equal(error.code, 'denied');
      assert.match(error.message, /You chose not to share your identity with this site/);
      assert.doesNotMatch(error.message, /try again\.$/, 'not the old "sign in and try again" line');
      return true;
    });
  }
  { /* A "yes" still resolves the public fields, as before. */
    const t = boot();
    t.unlock(K1);
    const asked = t.site.ArkBroker.getIdentity();
    await t.until(() => !t.shareBox().hidden);
    t.click('Share with');
    const identity = await asked;
    assert.deepEqual({ ...identity }, { publicKeyB64: 'K1', displayName: 'one' });
  }
  console.log('broker client share denied: ok');
  process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
