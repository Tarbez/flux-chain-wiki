'use strict';
/* run-tests-timeout-ms: 180000 */
/* /account's session and state, in a real DOM (jsdom, the page's real scripts: the Ark kit, the blocks
   adapter, local-identity). It was a toy-DOM test of the hand-built page (a fake Element that answered any
   selector); /account is Ark blocks since 2026-10-20 (W4-S2), so it reads the page the way a visitor does.

   Named regressions it holds (each was a real defect, or would reintroduce one):
   - Account metadata and nav must survive reload without persisting signing authority: the public pointer
     keeps six public fields, never the signer, the mnemonic or the PIN; a reload shows the identity
     "remembered" with no signer; closing the document disposes the signer; leaving the route does not.
   - Another tab replacing or clearing the public pointer cannot leave a stale signer unlocked.
   - Blocked storage must not erase the working in-memory identity, and the page says storage is unavailable.
   - The Keys view reads the SIGNER's wallet list and lifecycle methods, never the public pointer's: the
     pointer has six frozen fields, so reading `walletAddresses` off it left the whole view inert in a real
     browser (found by tests/browser/account-flows.mjs; the old jsdom test stubbed the pointer with a
     pass-through of the full object, which is why it passed). Here the pointer is the real one.
   - Layout keys for the signed-in page (the server render is always signed out, so tests/account-blocks.cjs
     cannot see them): the tab strip and its buttons are pinned to the old strip's keys, each view to its old
     section's key, per state (saved: Session, Wallet, Network; unlocked: all five).
   - The vault may name one signing wallet twice (a rotated-from address): Ark's list refuses two rows with one key and
     replaces itself with its refusal callout, so the page shows each address once (found by the browser driver, step 9).
   - Ark's patch keeps a control's generated id but rewrites its label's `for`: a patched form's labels named nothing.
     The page points each label back at its control (relabel()); tests/browser/account-flows.mjs step 8 checks it on
     the real patch (Send enabled once the wallet loads); here every label must at least name an existing control.
   - Signed out, nothing queries an identity (the Network check is a no-op); signed in, the page says the
     identity is verified once the explorer says so. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
// Was 'defxn-local-identity-v1' (the old hand-written IIFE's own key) until js/ark/local-identity.js was
// rebuilt from the canonical @deadark/ark-ui/flux-auth-session module, which keys storage as
// `ark-local-identity.<scope>.v1`.
const KEY = 'ark-local-identity.defxn.v1';
const html = read('index.html');
assert(html.indexOf('js/ark/local-identity.js') < html.indexOf('js/resolvers/header.js'), 'public identity restore must load before navigation renders');
const catalog = read('js/pages/catalog.js');
const blockScripts = JSON.parse(/ArkUI\.blockScripts = (\[[^\]]+\]);/.exec(catalog)[1].replace(/'/g, '"'));
const values = new Map();

function browser({ blocked = false } = {}) {
  const dom = new JSDOM('<!doctype html><html><body><div id="scene"></div></body></html>', { url: 'https://defxn.com/account', runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  Object.defineProperty(window, 'localStorage', { configurable: true, value: {
    getItem(k) { if (blocked) throw Error('Storage blocked'); return values.get(k) ?? null; },
    setItem(k, v) { if (blocked) throw Error('Storage blocked'); values.set(k, v); },
    removeItem(k) { if (blocked) throw Error('Storage blocked'); values.delete(k); }
  } });
  const run = (file) => window.eval(read(file) + '\n//# sourceURL=' + file);
  window.eval(`var ArkCopy = { isKey: function () { return false; }, resolve: function (v) { return v; }, text: function (k) { throw new Error('no copy key ' + k); } };`);
  for (const file of ['js/ark/atomizer.js', 'js/ark/flux.js', 'js/ark/runtime.js', 'js/ark/vendor/engines.js']) run(file);
  window.eval(`ArkUI.pageCatalog = { account: { path: '/account' }, 'account/domains': { path: '/account/domains' }, bundledeployer: { path: '/bundle-deployer' }, explorer: { path: '/explore' }, zero: { path: '/' } };
    ArkUI.route = { href: function (p) { return p; } };`);
  // the live chunk (the first ArkUI.blocks.update loads it) the way js/ark/page-loader.js does
  window.eval('ArkUI.loadScript = function (src) { return Promise.resolve().then(function () { (0, eval)(__chunk[src]); }); };');
  window.__chunk = { 'js/ark/vendor/ark-kit-live.js': read('js/ark/vendor/ark-kit-live.js') };
  // js/ark/account-session.js: the one sign-in session, moved out of js/pages/account.js on 2026-10-25 (catalog.js loads it before the page).
  for (const file of blockScripts.concat(['js/ark/vendor/ark-kit-forms.js', 'js/ark/local-identity.js', 'js/ark/local-domains.js', 'js/ark/account-session.js'])) run(file);
  let signer = null, created = 0, disposed = 0, locks = 0, onChange;
  window.ArkAdminAuth = { create(options) {
    created++; onChange = options.onChange;
    return { current: () => signer, signOut() { locks++; signer = null; onChange(null); }, dispose() { disposed++; signer = null; onChange(null); } };
  } };
  const reads = [];
  window.fetch = async (url, options) => {
    reads.push(String(url));
    const body = JSON.parse(options.body);
    return { ok: true, json: async () => ({ apiVersion: 'explorer-api-v1', data: { record: { id: body.recordId, verification: { state: 'verified' }, updatedAt: '2026-10-02T00:00:00Z', provenance: { source: 'fixture' }, fields: { sourceRecord: {} } } } }) };
  };
  window.eval('ArkUI.pageModules = ArkUI.pageModules || {};');
  window.eval(read('js/pages/account.js') + '\n//# sourceURL=js/pages/account.js');
  const { ArkUI } = window;
  return { ArkUI, window, reads,
    mount() { const host = window.document.createElement('div'); window.document.body.appendChild(host); return ArkUI.pageModules.account.mount(host); },
    unlock(who) { signer = who; onChange(who); },
    created: () => created, disposed: () => disposed, locks: () => locks,
    async settled() { for (let i = 0; i < 6; i++) { await ArkUI.blocks.whenLive(); await new Promise((resolve) => setTimeout(resolve, 0)); } } };
}
const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
const tabs = (page) => [...page.querySelectorAll('[data-ark-block="tabs"] [data-ark-part="tabs-trigger"]')].map(text);
const selected = (page) => text(page.querySelector('[data-ark-block="tabs"] [data-ark-part="tabs-trigger"][aria-selected="true"]'));
const pins = (page) => [...page.querySelectorAll('[data-ark-block="tabs"] [data-ark-part="tabs-trigger"]')].map((el) => el.getAttribute('data-ark-layout-pin'));
const CARD = 'page:/div:1/section:1';
const who = { displayName: 'preview-user', identityId: 'identity-test', publicKeyB64: 'public-test', walletAddress: 'wallet-test', securityProfile: 'hybrid-pq', rootVerified: true,
  /* the signer's wallet list is a live getter, the pointer never has one */
  walletAddresses: ['wallet-test', 'wallet-second', 'wallet-test'], walletDelegations: { 'wallet-second': { revoked: false } },
  sign() { throw Error('Never serialize the signer'); }, mnemonic: 'secret', pin: '12345678', handle: { secretKey: 'secret' } };

(async () => {
  const b = browser();
  const first = b.mount();
  assert.equal(first.dataset.session, 'signed-out');
  assert.equal(first.querySelectorAll('h1').length, 1, 'one h1');
  assert.equal(text(first.querySelector('#account-title')), 'Sign in to DEFXN');
  assert.deepEqual(tabs(first), ['Sign in', 'Create identity']);
  assert.equal(first.querySelector('.account-rail').hidden, true, 'no glance rail while signed out');
  assert(first.querySelector('#account-send-form') && first.querySelector('#account-contacts-search') && first.querySelector('#account-keys-list'), 'the send form, the contacts search and the signing-wallet list are Ark blocks (form, list)');

  /* an unlock: the public pointer keeps public fields only */
  b.unlock(who);
  assert.equal(first.dataset.session, 'verified-local');
  const saved = JSON.parse(values.get(KEY));
  assert.deepEqual(Object.keys(saved).sort(), ['version', 'identityId', 'displayName', 'publicKeyB64', 'walletAddress', 'securityProfile'].sort());
  assert(!values.get(KEY).includes('secret'), 'root material must not survive into storage');
  await b.settled();
  assert.equal(text(first.querySelector('#account-title')), 'preview-user', 'the hero shows the name (patched in place)');
  assert.deepEqual(tabs(first), ['Session', 'Wallet', 'Signing keys', 'Contacts', 'Network'], 'unlocked, the card has the five views');
  assert.equal(selected(first), 'Wallet', 'a new unlock opens the wallet');
  assert.equal(first.querySelector('.account-rail').hidden, false, 'the glance rail is there once there is an identity');
  /* layout keys of a signed-in page: each tab pinned to the old strip's button */
  assert.deepEqual(pins(first), [1, 2, 3, 4, 5].map((n) => CARD + '/nav:1/button:' + n), 'the five tabs keep the old strip\'s five button keys');
  assert.equal(first.querySelector('[data-ark-part="tabs-list"]').getAttribute('data-ark-layout-pin'), CARD + '/nav:1', 'the tab list keeps the old strip\'s key');
  for (const [view, key] of [['session', '/section:1'], ['defi', '/section:2'], ['contacts', '/section:3'], ['mesh', '/section:4'], ['keys', '/section:5']]) {
    assert.equal(first.querySelector(`[data-account-panel="${view}"]`).getAttribute('data-ark-layout-pin'), CARD + key, `the ${view} view keeps the old section's key`);
  }
  assert.equal(first.querySelector('.account-offstage').children.length, 1, 'only the create view waits offstage once signed in');

  /* the Keys view reads the signer, not the pointer (regression: it was inert in a real browser) */
  const keys = text(first.querySelector('#account-keys-list'));
  assert(keys.includes('wallet-test') && /wallet-test\s*Default/.test(keys) && keys.includes('wallet-second'), `the Keys list shows the signer's wallets, the default marked (${keys})`);
  assert(/delegated to identity/.test(keys), 'and the delegation');
  assert.equal(first.querySelectorAll('#account-keys-list .ark-list__row').length, 2, 'a wallet the vault names twice is one row');
  assert.equal(first.querySelectorAll('[data-ark-block-refused]').length, 0, 'no block was replaced by its refusal');
  for (const label of first.querySelectorAll('#account-send-form label')) assert(first.ownerDocument.getElementById(label.getAttribute('for')), 'a patched form\'s label still names its control');

  first.arkDispose();
  assert.equal(b.disposed(), 0, 'changing routes preserves the signer');
  const second = b.mount();
  assert.equal(b.created(), 1, 'returning to account reuses the auth panel');
  assert.equal(text(second.querySelector('#account-title')), 'preview-user');
  assert.equal(second.dataset.session, 'verified-local');
  b.window.dispatchEvent(new b.window.Event('pagehide'));
  assert.equal(b.disposed(), 1, 'document exit destroys the signer');
  assert(values.has(KEY), 'document exit must preserve public identity');

  /* a reload: the shell restores the identity before the page opens */
  const reloaded = browser();
  assert.equal(reloaded.ArkUI.localIdentity.current().displayName, 'preview-user', 'the shell restores the identity before opening Account');
  assert.equal(reloaded.created(), 0, 'restoring the shell does not instantiate a signing panel');
  const restored = reloaded.mount();
  assert.equal(restored.dataset.session, 'remembered');
  assert.equal(text(restored.querySelector('#account-title')), 'preview-user');
  const factValues = [...restored.querySelectorAll('#account-identity [data-ark-part="fact-value"]')].map(text);
  assert.deepEqual(factValues, ['identity-test', 'wallet-test'], 'the identity details are Ark facts: identity ID and wallet address');
  assert.equal(text(restored.querySelector('#account-developer-facts [data-ark-part="fact-value"]')), 'public-test', 'the root key is under Developer details');
  assert.equal(reloaded.ArkUI.accountSession.current(), null, 'restored display metadata grants no signing authority');
  assert.equal(reloaded.ArkUI.accountSession.isUnlocked(), false);
  assert.match(text(restored.querySelector('#account-headline')), /not signed in/);
  assert.match(text(restored.querySelector('#account-headline')), /FXN ID file is not kept on this device/);
  assert.equal(text(restored.querySelector('#account-session-head [data-ark-part="alert-title"]')), 'Choose your FXN ID file again');
  assert.deepEqual(tabs(restored), ['Session', 'Wallet', 'Network'], 'a saved identity has the views it can know: Keys and Contacts need the unlocked key');
  assert.deepEqual(pins(restored), [CARD + '/nav:1/button:1', CARD + '/nav:1/button:2', CARD + '/nav:1/button:5'], 'Wallet and Network keep their old buttons\' keys');
  assert.equal(selected(restored), 'Session');
  reloaded.unlock(who);
  assert.equal(restored.dataset.session, 'verified-local');
  assert.deepEqual(tabs(restored), ['Session', 'Wallet', 'Signing keys', 'Contacts', 'Network'], 'unlocking a saved identity brings the five views');

  /* the Network check: nothing signed out, the explorer's word once signed in */
  const count = reloaded.reads.length;
  restored.dispatchEvent(new reloaded.window.CustomEvent('ark:action', { bubbles: true, detail: { action: 'mesh-verify' } }));
  await reloaded.settled();
  assert(reloaded.reads.length > count, 'signed in, "Verify identity" asks the explorer');
  assert.match(text(restored.querySelector('#account-mesh-stats')), /Identity verified/, 'the Network view says so once the explorer does');
  assert.match(text(restored.querySelector('#account-rail-stats')), /Status.{0,3}Not linked/, 'the rail\'s Status tile says the standing: verified, no linked account');

  /* forgetting a saved identity */
  const gone = restored.querySelector('[data-account-forget]');
  gone.click();
  assert.equal(reloaded.ArkUI.localIdentity.current(), null);
  assert(!values.has(KEY));
  assert.equal(browser().ArkUI.localIdentity.current(), null, 'sign-out stays signed out after reload');
  assert.equal(restored.dataset.session, 'signed-out');
  assert.deepEqual(tabs(restored), ['Sign in', 'Create identity'], 'signed out again: the sign-in pair');
  assert.equal(first.dataset.session, 'verified-local', 'a disposed view has unsubscribed');
  const verifyReads = reloaded.reads.length;
  restored.dispatchEvent(new reloaded.window.CustomEvent('ark:action', { bubbles: true, detail: { action: 'mesh-verify' } }));
  await reloaded.settled();
  assert.equal(reloaded.reads.length, verifyReads, 'signed out, the Network check cannot query an identity');

  /* another tab replaces the public pointer: the old signing handle must not survive */
  values.set(KEY, JSON.stringify(saved));
  const live = browser(); const view = live.mount(); live.unlock(who);
  values.set(KEY, JSON.stringify({ ...saved, identityId: 'other-identity', displayName: 'Other' }));
  const event = new live.window.StorageEvent('storage', { key: KEY }); live.window.dispatchEvent(event);
  assert.equal(live.locks(), 1);
  assert.equal(live.ArkUI.accountSession.current(), null);
  await live.settled();
  assert.equal(text(view.querySelector('#account-title')), 'Other');
  assert.equal(view.dataset.session, 'remembered');
  values.delete(KEY); live.window.dispatchEvent(new live.window.Event('focus'));
  assert.equal(view.dataset.session, 'signed-out', 'focus reconciles a sign-out in another tab');
  for (const raw of ['null', '[]', '{', '{"version":1,"identityId":3}', '{"version":1,"identityId":"a b"}', '{"version":1,"identityId":" "}', JSON.stringify({ ...saved, version: 2 })]) {
    values.set(KEY, raw); assert.equal(browser().ArkUI.localIdentity.current(), null, 'invalid storage fails closed');
  }
  values.set(KEY, JSON.stringify({ ...saved, rootVerified: true, sign: 'fake', mnemonic: 'secret' }));
  assert.equal(browser().ArkUI.localIdentity.current().rootVerified, undefined, 'cached verification claims are discarded');
  values.clear();

  /* blocked storage: the working in-memory identity stays, and the page says storage is unavailable */
  const noStorage = browser({ blocked: true }); const transient = noStorage.mount(); noStorage.unlock(who);
  assert.equal(transient.dataset.session, 'verified-local');
  await noStorage.settled();
  assert.match(text(transient.querySelector('[data-account-notices]')), /unavailable/, 'the notice is a callout in the session view');
  assert(transient.querySelector('[data-account-notices] [data-ark-block="callout"]'), 'the storage notice is Ark\'s callout');
  noStorage.window.dispatchEvent(new noStorage.window.Event('focus'));
  assert.equal(transient.dataset.session, 'verified-local', 'blocked storage must not erase the working in-memory identity');
  noStorage.ArkUI.accountSession.signOut();
  assert.equal(transient.dataset.session, 'signed-out');

  /* publishing: each launch attaches to the current account tab, and a locked identity is sent to unlock first */
  const accountSource = read('js/pages/account.js');
  assert(/window\.open\(link\.href, '_blank'\)/.test(accountSource) && !/target: '_blank'/.test(accountSource), 'each CMS launch must attach to the current account tab (window.open keeps its opener; Ark\'s target=_blank link always adds noopener)');
  values.set(KEY, JSON.stringify(saved));
  const lockedBrowser = browser();
  lockedBrowser.window.eval("window.__local = true; ArkUI.cmsSession = { isLocalDevelopment: function () { return window.__local; }, isAuthenticated: function () { return false; }, status: function () { return ''; }, connect: function () { return Promise.resolve(); }, revoke: function () {} };");
  const locked = lockedBrowser.mount();
  const open = locked.querySelector('a[href="/admin"]');
  assert.equal(open.getAttribute('rel'), null, 'the publishing link is Ark\'s actions link; it carries no noopener because it opens by window.open');
  const opened = []; lockedBrowser.window.open = (url, target, features) => { opened.push([url, target, features]); };
  const allowed = new lockedBrowser.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
  open.dispatchEvent(allowed);
  assert(allowed.defaultPrevented && opened.length === 1 && opened[0][1] === '_blank' && opened[0][2] === undefined, 'in local development a plain press opens the publishing tools in a window that keeps its opener (no noopener feature)');
  lockedBrowser.window.__local = false; // the host stops saying "local development" after the link was drawn: the guard must still send the person to unlock first
  const click = new locked.ownerDocument.defaultView.MouseEvent('click', { bubbles: true, cancelable: true });
  open.dispatchEvent(click);
  assert(click.defaultPrevented, 'remembered metadata must direct the user to unlock instead of opening an unusable CMS gate');
  values.clear();

  console.log('PASS: reload preserves public identity, root authority locks, sign-out clears storage, cross-tab changes revoke stale signers, invalid/blocked storage is handled, the Keys view reads the signer, the signed-in layout keys are pinned, and the Network check never queries signed out.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
