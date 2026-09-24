/* The admin store on real disk: file modes, refusing an unreadable/corrupt file rather than treating it as empty,
   lockout doubling, and the audit log. In-memory behaviour (no dir) is exercised by admin-session.test.mjs. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createAdminStore, LOCK_POLICY } from '../scripts/lib/admin-store.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flux-chain-admin-store-'));
const KEY = 'k1', KEY2 = 'k2';
let clock = 1_000_000;

try {
  // A fresh folder is created private, and stores nothing until something is written.
  const store = createAdminStore({ dir, now: () => clock });
  assert.equal(fs.statSync(dir).mode & 0o777, 0o700);
  assert.equal(store.getOtp(KEY), null);
  assert.deepEqual(store.lockState(KEY), { locked: false, retryAfterMs: 0 });

  // Writing an authenticator creates a private file, and it is readable back, including by a second handle on the same folder.
  store.setOtp(KEY, { secret: 'ABCDEFGHIJKLMNOP', lastStep: 5, enrolledAt: '2026-01-01T00:00:00.000Z' });
  const file = path.join(dir, 'otp.json');
  assert(fs.existsSync(file)); assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  const reopened = createAdminStore({ dir, now: () => clock });
  assert.deepEqual(reopened.getOtp(KEY), { secret: 'ABCDEFGHIJKLMNOP', lastStep: 5, enrolledAt: '2026-01-01T00:00:00.000Z' });

  // setLastStep updates only that field (replay protection surviving a restart) and nothing else about the identity.
  reopened.setLastStep(KEY, 9);
  assert.equal(createAdminStore({ dir, now: () => clock }).getOtp(KEY).lastStep, 9);

  // touchSignIn returns the PREVIOUS sign-in (or null the first time), and persists the new one for the next caller.
  const s3 = createAdminStore({ dir, now: () => clock });
  assert.equal(s3.touchSignIn(KEY, '2026-01-02T00:00:00.000Z'), null);
  assert.equal(createAdminStore({ dir, now: () => clock }).touchSignIn(KEY, '2026-01-03T00:00:00.000Z'), '2026-01-02T00:00:00.000Z');

  // Lockout: policy.threshold wrong attempts locks; the store computes and persists the countdown, doubling each repeat, capped.
  const s4 = createAdminStore({ dir, now: () => clock });
  let outcome;
  for (let i = 0; i < LOCK_POLICY.threshold - 1; i += 1) { outcome = s4.noteFailure(KEY2, clock); assert.equal(outcome.locked, false); }
  outcome = s4.noteFailure(KEY2, clock);
  assert.equal(outcome.locked, true); assert.equal(outcome.retryAfterMs, LOCK_POLICY.baseMs);
  assert.deepEqual(s4.lockState(KEY2, clock), { locked: true, retryAfterMs: LOCK_POLICY.baseMs });
  // Persisted: a fresh store handle still sees the lock, and for exactly this long, not "forever" and not "reset".
  const s5 = createAdminStore({ dir, now: () => clock + LOCK_POLICY.baseMs - 1 });
  assert.equal(s5.lockState(KEY2, clock + LOCK_POLICY.baseMs - 1).locked, true);
  assert.equal(s5.lockState(KEY2, clock + LOCK_POLICY.baseMs + 1).locked, false, 'and it lifts on its own after the wait');
  // A second lockout for the same identity is longer (doubled), and KEY (a different identity) is unaffected throughout.
  const afterFirst = clock + LOCK_POLICY.baseMs + 1;
  const s6 = createAdminStore({ dir, now: () => afterFirst });
  for (let i = 0; i < LOCK_POLICY.threshold; i += 1) outcome = s6.noteFailure(KEY2, afterFirst);
  assert.equal(outcome.retryAfterMs, LOCK_POLICY.baseMs * 2);
  assert.equal(s6.lockState(KEY, afterFirst).locked, false, 'KEY was never touched by KEY2\'s failures');
  // clearFailures ends a lock immediately, for use right after a correct code.
  s6.clearFailures(KEY2);
  assert.equal(s6.lockState(KEY2, afterFirst).locked, false);

  // Lockout duration is capped, however many times it repeats.
  const s7 = createAdminStore({ dir, now: () => afterFirst });
  for (let round = 0; round < 8; round += 1) for (let i = 0; i < LOCK_POLICY.threshold; i += 1) outcome = s7.noteFailure(KEY2, afterFirst);
  assert(outcome.retryAfterMs <= LOCK_POLICY.capMs);

  // Refusing an unreadable or foreign file: NOT treated as "nobody enrolled yet", which would let the next visitor enroll their own authenticator.
  const badDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flux-chain-admin-store-bad-'));
  fs.writeFileSync(path.join(badDir, 'otp.json'), 'not json at all', { mode: 0o600 });
  assert.throws(() => createAdminStore({ dir: badDir }), /Refusing to start/);
  fs.writeFileSync(path.join(badDir, 'otp.json'), JSON.stringify({ version: 99, identities: {} }), { mode: 0o600 });
  assert.throws(() => createAdminStore({ dir: badDir }), /Refusing to start/);
  fs.rmSync(badDir, { recursive: true, force: true });

  // Audit: append-only, one line of JSON per event, oldest first, and it names no code, secret, PIN or private key.
  const auditDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flux-chain-admin-audit-'));
  const s8 = createAdminStore({ dir: auditDir, now: () => clock });
  s8.audit({ event: 'proof-ok', key: KEY }); s8.audit({ event: 'enrolled', key: KEY }); s8.audit({ event: 'signed-in', key: KEY });
  const lines = fs.readFileSync(path.join(auditDir, 'audit.log'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual(lines.map((l) => l.event), ['proof-ok', 'enrolled', 'signed-in']);
  assert(lines.every((l) => l.at && l.key === KEY));
  assert(!/secret|code|pin|totp/i.test(fs.readFileSync(path.join(auditDir, 'audit.log'), 'utf8')), 'no secret material reaches the audit file');
  assert.deepEqual(s8.recent(2).map((l) => l.event), ['enrolled', 'signed-in']);
  assert.equal(fs.statSync(path.join(auditDir, 'audit.log')).mode & 0o777, 0o600);
  fs.rmSync(auditDir, { recursive: true, force: true });

  // With no dir at all (the test-suite default), everything works in memory and persists nothing to disk.
  const mem = createAdminStore({ dir: null, now: () => clock });
  mem.setOtp(KEY, { secret: 'X', lastStep: 1 });
  assert.deepEqual(mem.getOtp(KEY), { secret: 'X', lastStep: 1, enrolledAt: null });
  mem.audit({ event: 'signed-in', key: KEY });
  assert.equal(mem.recent(1)[0].event, 'signed-in');

  console.log('admin store ok: private files, unreadable-file refusal, persisted lockout with doubling and cap, audit log carries no secrets');
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
