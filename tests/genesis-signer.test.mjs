// The genesis key in the real sign-in bundle (owner, 2026-10-25): js/admin/auth.js, signed in through its own panel with
// a real v9 file, gives `genesisSigner()`. Genesis pages (flux/genesis) sign every genesis record with it.
//
// Why this exists: the bundle derives the key itself, from the recovery phrase it unseals. If its derivation ever
// differs from fxn-auth's (src/rootKeys.mjs, the one place), a page signs network and mint records with a key the
// network does not name, and the owner's `fxn-id genesis-key` would print a different key than the page uses. The test
// compares the two, and checks the key is neither the root nor the public id the page signs as.
// Fixture: flux-launchpad's real v9 kit (disposable test credentials, no value behind it), as account-keys-dom.mjs uses.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';
import { JSDOM } from '/Volumes/PortableSSD/flux/flux-launchpad/node_modules/jsdom/lib/api.js';
import { unlockPortableAuthKit } from '../../fxn-auth/src/authKitMigration.mjs';
import { fluxRootFromMnemonic } from '../../fxn-auth/src/rootFromMnemonic.mjs';
import { genesisKeyFromRoot } from '../../fxn-auth/src/rootKeys.mjs';
import { verifyDetached } from '../../fxn-auth/src/ed25519.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUNDLE_SOURCE = fs.readFileSync(path.join(HERE, '..', 'js', 'admin', 'auth.js'), 'utf8');
const KIT_TEXT = fs.readFileSync('/Volumes/PortableSSD/flux/flux-launchpad/js/fixtures/real-auth-kit-v9.flx', 'utf8');
const KIT_PIN = '13572468';
const KIT_PASSWORD = 'launchpad-test';
const fromHex = (h) => Uint8Array.from(h.match(/../g), (x) => parseInt(x, 16));

async function until(read, what, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = read();
    if (value) return value;
    if (Date.now() > deadline) throw new Error(`timed out after ${timeoutMs} ms waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

async function signIn() {
  const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', { url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true });
  Object.defineProperty(dom.window.crypto, 'subtle', { value: webcrypto.subtle, configurable: true });
  dom.window.structuredClone = structuredClone;
  const script = dom.window.document.createElement('script');
  script.textContent = BUNDLE_SOURCE;
  dom.window.document.body.appendChild(script);
  const container = dom.window.document.getElementById('app');
  const changes = [];
  dom.window.ArkAdminAuth.create({ container, product: 'Genesis test', onChange: (who) => changes.push(who) });
  const input = container.querySelector('input[type="file"]');
  Object.defineProperty(input, 'files', { value: [new dom.window.File([KIT_TEXT], 'real.flx')], configurable: true });
  input.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await until(() => container.querySelector('[data-ark-auth="field-pin"]'), 'the unlock form');
  const set = (name, value) => {
    const field = container.querySelector(`[data-ark-auth="field-${name}"]`);
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(field, value);
    field.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  };
  set('pin', KIT_PIN);
  set('password', KIT_PASSWORD);
  container.querySelector('[data-ark-auth="form"]').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  return until(() => changes.find(Boolean), 'sign-in');
}

test('the bundle signs genesis records with the key fxn-auth derives, not the root and not a public id', async () => {
  const who = await signIn();
  const opened = await unlockPortableAuthKit({ authKit: KIT_TEXT, pin: KIT_PIN, password: KIT_PASSWORD });
  const root = await fluxRootFromMnemonic(opened.secret.mnemonic);
  const expected = (await genesisKeyFromRoot(root.secretKey)).pubHex;
  const rootHex = Buffer.from(root.publicKey).toString('hex');

  assert.equal(who.genesisKeyHex, expected, 'the bundle and fxn-auth make the same genesis key');
  const signer = who.genesisSigner();
  assert.equal(signer.pubHex, expected);
  assert.equal(signer.keyName, 'Your genesis key', 'a review can name the key it signs with');
  assert.notEqual(signer.pubHex, rootHex, 'the genesis key is not the root');
  if (who.publicKeyB64) assert.notEqual(signer.pubHex, Buffer.from(who.publicKeyB64, 'base64').toString('hex'), 'nor the public id the page signs as');

  const text = 'G-YLEDGERENTRY-V1-genesis-test';
  const sig = await signer.signText(text);
  assert.ok(await verifyDetached(new TextEncoder().encode(text), fromHex(sig), fromHex(expected)), 'it signs as the genesis key');
  assert.ok(!(await verifyDetached(new TextEncoder().encode(text), fromHex(sig), root.publicKey)), 'the root did not sign');
  const bytes = new Uint8Array([7, 8, 9]);
  assert.ok(await verifyDetached(bytes, fromHex(await signer.signBytes(bytes)), fromHex(expected)));
});
