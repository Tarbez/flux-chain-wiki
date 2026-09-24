/* =====================================================================
   ADMIN STORE: what the host must remember about who signs in
   ---------------------------------------------------------------------
   Per identity (keyed by its public key):
     the authenticator secret and the last code step accepted (replay protection)
     failed-attempt counters and lockouts, so they survive a restart
     the last successful sign-in, shown to the person at their next one

   plus an append-only audit log of sign-in events.

   It lives in ~/.flux-chain-admin (folder 0700, files 0600), outside the project, so
   it is never published, committed or served. With no folder it is memory only,
   which is what the tests use.

   An authenticator secret has to be readable by the host to verify a code, so this
   file is only as safe as the account that owns it. It is not a place for anything
   else: no keys, no recovery phrases, no PINs are ever written here.

   If the file exists and cannot be read, the store REFUSES to open. Treating an
   unreadable file as "nobody is enrolled" would let the next person to sign in
   enroll their own authenticator: a silent downgrade.
   ===================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const defaultDataDir = () => path.join(os.homedir(), '.flux-chain-admin');

export const LOCK_POLICY = Object.freeze({ threshold: 5, baseMs: 5 * 60_000, capMs: 60 * 60_000 });

export function createAdminStore({ dir = null, now = () => Date.now(), policy = LOCK_POLICY } = {}) {
  const file = dir ? path.join(dir, 'otp.json') : null;
  const auditFile = dir ? path.join(dir, 'audit.log') : null;
  let state = { version: 1, identities: {} };
  const tail = [];

  if (dir) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.chmodSync(dir, 0o700);
    if (fs.existsSync(file)) {
      try { state = JSON.parse(fs.readFileSync(file, 'utf8')); }
      catch (error) { throw new Error(`Refusing to start: ${file} exists but cannot be read (${error.message}). Restore it, or delete it to enroll authenticators again. It was not treated as empty.`); }
      if (!state || state.version !== 1 || typeof state.identities !== 'object') throw new Error(`Refusing to start: ${file} is not a version 1 admin store. It was not treated as empty.`);
    }
  }

  function persist() {
    if (!file) return;
    const temporary = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(state, null, 2), { mode: 0o600 });
    fs.renameSync(temporary, file);
  }
  const entry = (key) => (state.identities[key] ||= {});

  return {
    dir,
    /* { secret, lastStep, enrolledAt } or null when this identity has no authenticator yet */
    getOtp(key) {
      const e = state.identities[key];
      return e && e.secret ? { secret: e.secret, lastStep: Number.isSafeInteger(e.lastStep) ? e.lastStep : -1, enrolledAt: e.enrolledAt || null } : null;
    },
    setOtp(key, { secret, lastStep, enrolledAt }) {
      const e = entry(key);
      e.secret = secret; e.lastStep = lastStep;
      if (enrolledAt) e.enrolledAt = enrolledAt;
      persist();
    },
    setLastStep(key, lastStep) { entry(key).lastStep = lastStep; persist(); },

    /* records a successful sign-in and returns the one before it (or null) */
    touchSignIn(key, at) {
      const e = entry(key); const previous = e.lastSignIn || null;
      e.lastSignIn = at; persist();
      return previous;
    },

    /* { locked, retryAfterMs } */
    lockState(key, t = now()) {
      const e = state.identities[key];
      if (e && e.lockedUntil && e.lockedUntil > t) return { locked: true, retryAfterMs: e.lockedUntil - t };
      return { locked: false, retryAfterMs: 0 };
    },
    /* one more wrong code. At the threshold the identity is locked, for longer each time it happens again. */
    noteFailure(key, t = now()) {
      const e = entry(key);
      e.failures = (e.failures || 0) + 1;
      if (e.failures >= policy.threshold) {
        e.lockouts = (e.lockouts || 0) + 1;
        const ms = Math.min(policy.capMs, policy.baseMs * 2 ** (e.lockouts - 1));
        e.lockedUntil = t + ms; e.failures = 0;
        persist();
        return { locked: true, retryAfterMs: ms, failures: 0 };
      }
      persist();
      return { locked: false, retryAfterMs: 0, failures: e.failures };
    },
    clearFailures(key) {
      const e = state.identities[key];
      if (e && (e.failures || e.lockouts || e.lockedUntil)) { e.failures = 0; e.lockouts = 0; e.lockedUntil = 0; persist(); }
    },

    /* one line per event, oldest first; never contains a code, a secret, a PIN or a key beyond the public key */
    audit(event) {
      const line = { at: new Date(now()).toISOString(), ...event };
      tail.push(line); if (tail.length > 200) tail.shift();
      if (auditFile) fs.appendFileSync(auditFile, JSON.stringify(line) + '\n', { mode: 0o600 });
    },
    recent: (n = 20) => tail.slice(-n),
  };
}
