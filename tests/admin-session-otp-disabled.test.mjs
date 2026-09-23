/* otpEnabled: false is how scripts/publish-host.mjs runs today (see the constant there): the Ark Pin
   browser extension has no OTP support yet, so step 3 is bypassed rather than blocking sign-in outright.
   This proves the bypass does what it claims -- a proven, authorized identity gets a session immediately,
   with no ticket and no way to reach the OTP endpoints -- and that a refused identity is refused exactly
   as before, so the flag only removes step 3, not steps 1 and 2. */
import assert from 'node:assert/strict';
import { createSessions } from '../scripts/lib/admin-session.mjs';
import { createAdminStore } from '../scripts/lib/admin-store.mjs';
import { PublishRefusal } from '../scripts/lib/publisher.mjs';
import { createFluxRootHandle } from '../../flux-auth/src/rootFromMnemonic.mjs';

const PHRASES = {
  owner: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  stranger: 'legal winner thank year wave sausage worth useful legal winner thank yellow',
};
const identity = async (name) => {
  const handle = await createFluxRootHandle(PHRASES[name]);
  return { publicKeyB64: handle.publicKeyB64, sign: (text) => Buffer.from(handle.sign(new TextEncoder().encode(text))).toString('base64') };
};
const owner = await identity('owner'), stranger = await identity('stranger');

let clock = 1_000_000;
const store = createAdminStore({ dir: null, now: () => clock });
const fakeOwner = owner.publicKeyB64;
const authorize = async (key) => { if (key !== fakeOwner) throw new PublishRefusal('not the owner', 'the owner key', 'sign in as the owner', 403); };
const sessions = createSessions({ authorize, store, now: () => clock, otpEnabled: false });

async function signedLogin(who) {
  const { message, nonce } = sessions.challenge('127.0.0.1:1');
  return sessions.login({ publicKeyB64: who.publicKeyB64, nonce, signatureB64: await who.sign(message), label: 'test' });
}

// A proven, authorized identity gets a session on the spot: no ticket, no OTP step to complete.
const made = await signedLogin(owner);
assert.equal(made.done, true, 'login() reports the sign-in as finished, not pending a ticket');
assert.equal(made.ticket, undefined, 'no ticket is issued when OTP is disabled');
assert.equal(made.otp, undefined, 'no otp info is issued when OTP is disabled');
assert(made.session && made.session.token, 'a session token is issued directly');
assert.equal(made.session.publicKeyB64, owner.publicKeyB64);
assert.equal(sessions.get(made.session.token).publicKeyB64, owner.publicKeyB64, 'the token is immediately a live session');

// Steps 1 and 2 are unaffected: a bad signature or the wrong owner is still refused, before any session exists.
{
  const { message, nonce } = sessions.challenge('127.0.0.1:1');
  const signatureB64 = await stranger.sign(message);
  await assert.rejects(
    () => sessions.login({ publicKeyB64: stranger.publicKeyB64, nonce, signatureB64, label: 'test' }),
    /identity is not the owner|not the owner/,
    'an unauthorized identity is still refused with OTP disabled'
  );
}
{
  const { nonce } = sessions.challenge('127.0.0.1:1');
  const signatureB64 = await stranger.sign('not the real message');
  await assert.rejects(
    () => sessions.login({ publicKeyB64: owner.publicKeyB64, nonce, signatureB64, label: 'test' }),
    /does not prove that identity/,
    'a signature over the wrong message is still refused with OTP disabled'
  );
}

console.log('otp-disabled ok: a proven, authorized identity gets a session with no ticket or OTP step; steps 1 and 2 still refuse exactly as before.');
