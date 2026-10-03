/* Regression: account metadata and nav must survive reload without persisting signing authority. */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const values = new Map();
const KEY = 'defxn-local-identity-v1';
const html = fs.readFileSync('index.html', 'utf8');
assert(html.indexOf('js/ark/local-identity.js') < html.indexOf('js/resolvers/header.js'), 'public identity restore must load before navigation renders');
class Element {
  constructor() { this.dataset = {}; this.hooks = new Map(); this.children = []; this.isConnected = true; this.events = {}; }
  setAttribute() {}
  appendChild(child) { this.children.push(child); }
  remove() { this.isConnected = false; }
  querySelector(selector) { if (!this.hooks.has(selector)) this.hooks.set(selector, new Element()); return this.hooks.get(selector); }
  addEventListener(name, fn) { this.events[name] = fn; }
}
function browser(blocked = false) {
  const target = new EventTarget();
  const window = Object.assign(target, {localStorage: {
    getItem(k) { if (blocked) throw Error('Storage blocked'); return values.get(k) ?? null; },
    setItem(k, v) { if (blocked) throw Error('Storage blocked'); values.set(k, v); },
    removeItem(k) { if (blocked) throw Error('Storage blocked'); values.delete(k); }
  }});
  let signer = null, created = 0, disposed = 0, locks = 0, onChange;
  const ArkUI = {pageModules: {}, refreshAccountNav() {}};
  const context = vm.createContext({ArkUI, Event, document: {createElement: () => new Element()}, window,
    ArkAdminAuth: {create(options) {
      created++; onChange = options.onChange;
      return {current: () => signer, signOut() { locks++; signer = null; onChange(null); }, dispose() { disposed++; signer = null; onChange(null); }};
    }}, console, AbortController});
  for (const file of ['js/ark/local-identity.js', 'js/pages/account.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  return {ArkUI, window, mount: () => ArkUI.pageModules.account.mount(new Element()),
    unlock(who) { signer = who; onChange(who); }, created: () => created, disposed: () => disposed, locks: () => locks};
}
const who = {displayName:'preview-user',identityId:'identity-test',publicKeyB64:'public-test',walletAddress:'wallet-test',securityProfile:'hybrid-pq',rootVerified:true,
  sign() { throw Error('Never serialize the signer'); }, mnemonic:'secret', pin:'12345678', handle:{secretKey:'secret'}};
const b = browser();
const first = b.mount();
assert.equal(first.dataset.session, 'signed-out');
b.unlock(who);
assert.equal(first.dataset.session, 'verified-local');
const saved = JSON.parse(values.get(KEY));
assert.deepEqual(Object.keys(saved).sort(), ['version','identityId','displayName','publicKeyB64','walletAddress','securityProfile'].sort());
assert(!values.get(KEY).includes('secret'), 'root material must not survive into storage');
first.arkDispose();
assert.equal(b.disposed(), 0, 'changing routes preserves the signer');
const second = b.mount();
assert.equal(b.created(), 1, 'returning to account reuses the auth panel');
assert.equal(second.querySelector('#account-title').textContent, 'preview-user');
b.window.dispatchEvent(new Event('pagehide'));
assert.equal(b.disposed(), 1, 'document exit destroys the signer');
assert(values.has(KEY), 'document exit must preserve public identity');
const reloaded = browser();
assert.equal(reloaded.ArkUI.localIdentity.current().displayName, 'preview-user', 'the shell restores the identity before opening Account');
assert.equal(reloaded.created(), 0, 'restoring the shell does not instantiate a signing panel');
const restored = reloaded.mount();
assert.equal(restored.dataset.session, 'remembered');
assert.equal(restored.querySelector('#account-title').textContent, 'preview-user');
assert.equal(restored.querySelector('[data-account-id]').textContent, 'identity-test');
assert.equal(restored.querySelector('[data-account-root]').textContent, 'public-test');
assert.equal(restored.querySelector('[data-account-wallet]').textContent, 'wallet-test');
assert.equal(reloaded.ArkUI.accountSession.current(), null, 'restored display metadata grants no signing authority');
assert.equal(reloaded.ArkUI.accountSession.isUnlocked(), false);
assert.match(restored.querySelector('[data-account-status]').textContent, /not signed in/);
assert.match(restored.querySelector('[data-account-intro]').textContent, /Auth Kit is not saved/);
assert.equal(restored.querySelector('[data-account-session-title]').textContent, 'Select your Auth Kit again');
reloaded.unlock(who);
assert.equal(restored.dataset.session, 'verified-local');
restored.querySelector('[data-account-forget]').events.click();
assert.equal(reloaded.ArkUI.localIdentity.current(), null);
assert(!values.has(KEY));
assert.equal(browser().ArkUI.localIdentity.current(), null, 'sign-out stays signed out after reload');
assert.equal(restored.dataset.session, 'signed-out');
assert.equal(first.dataset.session, 'verified-local', 'disposed view has unsubscribed');

// Replacing the public pointer in another tab cannot retain the old signing handle.
const live = browser(); const view = live.mount(); live.unlock(who);
values.set(KEY, JSON.stringify({...saved, identityId:'other-identity', displayName:'Other'}));
const event = new Event('storage'); Object.defineProperty(event, 'key', {value:KEY}); live.window.dispatchEvent(event);
assert.equal(live.locks(), 1);
assert.equal(live.ArkUI.accountSession.current(), null);
assert.equal(view.querySelector('#account-title').textContent, 'Other');
assert.equal(view.dataset.session, 'remembered');
values.delete(KEY); live.window.dispatchEvent(new Event('focus'));
assert.equal(view.dataset.session, 'signed-out', 'focus reconciles a sign-out in another tab');
for (const raw of ['null', '[]', '{', '{"version":1,"identityId":3}', '{"version":1,"identityId":"a b"}', '{"version":1,"identityId":" "}', JSON.stringify({...saved,version:2})]) {
  values.set(KEY, raw); assert.equal(browser().ArkUI.localIdentity.current(), null, 'invalid storage fails closed');
}
values.set(KEY,JSON.stringify({...saved,rootVerified:true,sign:'fake',mnemonic:'secret'}));
assert.equal(browser().ArkUI.localIdentity.current().rootVerified, undefined, 'cached verification claims are discarded');
values.clear();
const noStorage = browser(true); const transient = noStorage.mount(); noStorage.unlock(who);
assert.equal(transient.dataset.session,'verified-local');
assert.match(transient.querySelector('[data-account-storage-notice]').textContent, /unavailable/);
assert.equal(transient.querySelector('[data-account-storage-notice]').hidden,false);
noStorage.window.dispatchEvent(new Event('focus'));
assert.equal(transient.dataset.session,'verified-local', 'blocked storage must not erase the working in-memory identity');
noStorage.ArkUI.accountSession.signOut();
assert.equal(transient.dataset.session,'signed-out');
console.log('PASS: reload preserves public identity, root authority locks, sign-out clears storage, cross-tab changes revoke stale signers, invalid/blocked storage is handled.');

const accountSource = fs.readFileSync('js/pages/account.js', 'utf8');
assert(accountSource.includes('target="_blank" rel="opener"'), 'each CMS launch must attach to the current account tab, not reuse a stale named window');
const lockedClick = restored.querySelector('[data-account-cms-open]').events.click;
let prevented = false;
lockedClick({preventDefault(){prevented=true;}});
assert(prevented, 'remembered metadata must direct the user to unlock instead of opening an unusable CMS gate');


