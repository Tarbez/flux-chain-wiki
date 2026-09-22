/* =====================================================================
   ADMIN SESSIONS: who may see and use the admin
   ---------------------------------------------------------------------
   The admin is locked until an identity proves itself, in three steps. Each one
   must pass before the next is offered, and only the last one issues a session:

     1  PROVE     challenge -> the identity signs it with its root key (in the
                  browser, from the unlocked Auth Kit). The host builds the message
                  itself: what it verifies is what it sent, not what the caller says
                  it signed. Domain-separated (`subzero-admin-login/v1|<host>|<nonce>`),
                  so it can never be replayed as a name record, nor a name record as
                  a login. Single use, 60 seconds.
     2  AUTHORIZE `authorize(key)` says whether this identity may administer the site
                  (the name's owner). Asked only after the proof, and a failure to
                  answer (the miner is down) is a refusal, never a pass.
     3  VERIFY    a one-time code from the identity's authenticator app (TOTP). The
                  first time an identity signs in it has no authenticator yet: it is
                  ENROLLED, which also needs a code printed in the host's own terminal,
                  so stealing a recovery file and PIN is not enough to enroll someone
                  else's authenticator from elsewhere.

   Steps 1 and 2 yield a short-lived TICKET, not a session. Only a correct code turns
   a ticket into a session: an unguessable token in an HttpOnly, SameSite=Strict
   cookie that idles out, has an absolute limit, and dies on sign-out.

   Wrong codes are counted per IDENTITY (not per ticket), so starting over does not
   reset the count: five wrong codes lock that identity out for five minutes, doubling
   each time it happens again. A code that was accepted is never accepted twice.
   ===================================================================== */
import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { verifyEd25519RawB64 } from '../../../ark-miner-cli/src/state/ed25519-verify.js';
import { newSecret, otpauthUri, verifyTotp } from './totp.mjs';

export const LOGIN_PREFIX = 'subzero-admin-login/v1|';
export const SESSION_COOKIE = 'subzero_admin';

export class SessionRefusal extends Error {
  constructor(failure, missing, remedy, status = 401, extra = {}) {
    super(`${failure} Missing: ${missing} To fix: ${remedy}`);
    this.name = 'SessionRefusal';
    this.failure = failure; this.missing = missing; this.remedy = remedy; this.status = status; this.extra = extra;
  }
}

const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
const cleanLabel = (text) => String(text || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 40);
const minutes = (ms) => Math.max(1, Math.ceil(ms / 60_000));

export function createSessions({
  authorize, store, now = () => Date.now(), onNotice = () => {}, issuer = 'SUBZERO admin',
  challengeTtlMs = 60_000, ticketTtlMs = 5 * 60_000, idleMs = 30 * 60_000, absoluteMs = 12 * 60 * 60_000,
  maxChallenges = 64, maxTickets = 64, maxOtpAttempts = 5,
} = {}) {
  if (typeof authorize !== 'function') throw new TypeError('createSessions needs an authorize(publicKeyB64) function');
  if (!store) throw new TypeError('createSessions needs a store (createAdminStore) to hold authenticators and lockouts');
  const challenges = new Map();   // nonce -> { message, expiresAt }
  const tickets = new Map();      // ticket -> { key, mode, secret?, hostCode?, attempts, expiresAt }
  const sessions = new Map();     // token -> { publicKeyB64, createdAt, lastSeen }

  function sweep() {
    const t = now();
    for (const [nonce, c] of challenges) if (c.expiresAt <= t) challenges.delete(nonce);
    for (const [id, k] of tickets) if (k.expiresAt <= t) tickets.delete(id);
    for (const [token, s] of sessions) if (t - s.lastSeen > idleMs || t - s.createdAt > absoluteMs) sessions.delete(token);
  }

  const lockedRefusal = (state) => new SessionRefusal(
    'Too many wrong codes for this identity.', 'a wait.', `try again in ${minutes(state.retryAfterMs)} minute${minutes(state.retryAfterMs) === 1 ? '' : 's'}.`,
    429, { retryAfterSeconds: Math.ceil(state.retryAfterMs / 1000) });

  /* `host` is the loopback host:port this request arrived on, so a login made for one origin is worth nothing at another */
  function challenge(host) {
    sweep();
    if (challenges.size >= maxChallenges) throw new SessionRefusal('Too many sign-in attempts are waiting.', 'a moment.', 'wait a minute and try again.', 429);
    const nonce = randomBytes(24).toString('base64url');
    const message = `${LOGIN_PREFIX}${host}|${nonce}`;
    challenges.set(nonce, { message, expiresAt: now() + challengeTtlMs });
    return { nonce, message };
  }

  /* steps 1 and 2. Returns a ticket for step 3, never a session. */
  async function login({ publicKeyB64, nonce, signatureB64, label }) {
    sweep();
    // Single use, consumed before anything else can fail, so a bad guess cannot be retried on the same nonce.
    const pending = challenges.get(nonce);
    challenges.delete(nonce);
    if (!pending) throw new SessionRefusal('That sign-in challenge is unknown, used, or expired.', 'a fresh challenge.', 'start the sign-in again.');
    if (typeof publicKeyB64 !== 'string' || Buffer.from(publicKeyB64, 'base64').length !== 32) {
      throw new SessionRefusal('The identity key is not an Ed25519 public key.', 'a 32-byte base64 public key.', 'sign in with your recovery file again.', 400);
    }
    const proven = verifyEd25519RawB64({ messageBytes: new TextEncoder().encode(pending.message), signatureB64: String(signatureB64 || ''), publicKeyB64 });
    if (!proven) { store.audit({ event: 'proof-refused', key: publicKeyB64 }); throw new SessionRefusal('The signature does not prove that identity.', 'a signature by that key over the challenge.', 'sign in with your recovery file again.', 403); }
    try { await authorize(publicKeyB64); }
    catch (error) { store.audit({ event: 'owner-refused', key: publicKeyB64 }); throw error; }
    const lock = store.lockState(publicKeyB64, now());
    if (lock.locked) { store.audit({ event: 'locked-out', key: publicKeyB64 }); throw lockedRefusal(lock); }
    if (tickets.size >= maxTickets) throw new SessionRefusal('Too many sign-ins are in progress.', 'a moment.', 'wait a minute and try again.', 429);

    const id = randomBytes(24).toString('base64url');
    const existing = store.getOtp(publicKeyB64);
    store.audit({ event: 'proof-ok', key: publicKeyB64, next: existing ? 'verify' : 'enroll' });
    if (existing) {
      tickets.set(id, { key: publicKeyB64, mode: 'verify', attempts: 0, expiresAt: now() + ticketTtlMs });
      return { ticket: id, otp: { mode: 'verify' } };
    }
    const secret = newSecret();
    const hostCode = String(randomInt(0, 100_000_000)).padStart(8, '0');
    tickets.set(id, { key: publicKeyB64, mode: 'enroll', secret, hostCode, attempts: 0, expiresAt: now() + ticketTtlMs });
    // Out of band: this line appears in the host's own terminal window, not in anything the browser can read.
    onNotice({ kind: 'enroll', publicKeyB64, hostCode, message: `Authenticator setup for ${cleanLabel(label) || publicKeyB64.slice(0, 12)}: enter the setup code ${hostCode} in the sign-in page.` });
    return { ticket: id, otp: { mode: 'enroll', secret, uri: otpauthUri({ secret, issuer, account: cleanLabel(label) || publicKeyB64.slice(0, 12) }), hostCodeRequired: true } };
  }

  /* step 3. The only thing that issues a session. */
  function verifyOtp({ ticket, code, hostCode }) {
    sweep();
    const k = tickets.get(ticket);
    if (!k) throw new SessionRefusal('That sign-in has expired or was already used.', 'a fresh sign-in.', 'start again with your recovery file.');
    const lock = store.lockState(k.key, now());
    if (lock.locked) { tickets.delete(ticket); throw lockedRefusal(lock); }

    let step = null;
    if (k.mode === 'verify') {
      const record = store.getOtp(k.key);
      step = record ? verifyTotp({ secretBase32: record.secret, code, nowMs: now(), lastStep: record.lastStep }) : null;
    } else {
      const codeStep = verifyTotp({ secretBase32: k.secret, code, nowMs: now() });
      const hostOk = same(String(hostCode || '').replace(/\s+/g, ''), k.hostCode);
      step = hostOk ? codeStep : null;   // both are checked either way, and the refusal never says which was wrong
    }

    if (step === null) {
      k.attempts += 1;
      const outcome = store.noteFailure(k.key, now());
      store.audit({ event: 'otp-refused', key: k.key, mode: k.mode, attempts: k.attempts });
      if (outcome.locked) { tickets.delete(ticket); store.audit({ event: 'locked-out', key: k.key }); throw lockedRefusal({ retryAfterMs: outcome.retryAfterMs }); }
      if (k.attempts >= maxOtpAttempts) { tickets.delete(ticket); throw new SessionRefusal('Too many wrong codes on this sign-in.', 'a fresh sign-in.', 'start again with your recovery file.', 403); }
      throw new SessionRefusal('That code is not right.', k.mode === 'enroll' ? 'the setup code from the host window and a current code from your authenticator.' : 'a current code from your authenticator.',
        'enter the next code your authenticator shows.', 403, { attemptsLeft: Math.max(0, maxOtpAttempts - k.attempts) });
    }

    tickets.delete(ticket);
    const iso = new Date(now()).toISOString();
    if (k.mode === 'enroll') { store.setOtp(k.key, { secret: k.secret, lastStep: step, enrolledAt: iso }); store.audit({ event: 'enrolled', key: k.key }); }
    else store.setLastStep(k.key, step);
    store.clearFailures(k.key);
    const previous = store.touchSignIn(k.key, iso);
    const token = randomBytes(32).toString('base64url');
    sessions.set(token, { publicKeyB64: k.key, createdAt: now(), lastSeen: now() });
    store.audit({ event: 'signed-in', key: k.key });
    return { token, publicKeyB64: k.key, lastSignIn: previous, enrolled: k.mode === 'enroll' };
  }

  /* the live session for a token, sliding its idle clock, or null */
  function get(token) {
    if (!token) return null;
    sweep();
    const s = sessions.get(token);
    if (!s) return null;
    s.lastSeen = now();
    return { publicKeyB64: s.publicKeyB64 };
  }

  function end(token) {
    const s = token ? sessions.get(token) : null;
    if (s) store.audit({ event: 'signed-out', key: s.publicKeyB64 });
    sessions.delete(token);
  }
  return { challenge, login, verifyOtp, get, end, size: () => sessions.size };
}

/* the session token in a Cookie header, or null */
export function readSessionToken(cookieHeader) {
  for (const part of String(cookieHeader || '').split(';')) {
    const at = part.indexOf('=');
    if (at > 0 && part.slice(0, at).trim() === SESSION_COOKIE) return part.slice(at + 1).trim() || null;
  }
  return null;
}

export const sessionCookie = (token, maxAgeSeconds) => `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`;
export const clearedSessionCookie = () => `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
