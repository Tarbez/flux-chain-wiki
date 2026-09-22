/* TOTP against the RFCs' own published vectors, so this proves agreement with every authenticator app, not with itself. */
import assert from 'node:assert/strict';
import { base32Decode, base32Encode, hotp, newSecret, otpauthUri, stepAt, totpAt, verifyTotp } from '../scripts/lib/totp.mjs';

const SECRET = new TextEncoder().encode('12345678901234567890');   // the RFC's ASCII secret, used by both RFCs

// RFC 4226 Appendix D: HOTP for counters 0..9
['755224', '287082', '359152', '969429', '338314', '254676', '287922', '162583', '399871', '520489'].forEach((code, counter) => assert.equal(hotp(SECRET, counter), code, `HOTP counter ${counter}`));

// RFC 6238 Appendix B (SHA-1, 8 digits) at the published times, and the 6-digit truncation authenticator apps show
for (const [time, eight] of [[59, '94287082'], [1111111109, '07081804'], [1111111111, '14050471'], [1234567890, '89005924'], [2000000000, '69279037'], [20000000000, '65353130']]) {
  assert.equal(totpAt(SECRET, time * 1000, { digits: 8 }), eight, `TOTP ${time}`);
  assert.equal(totpAt(SECRET, time * 1000), eight.slice(-6), `6-digit TOTP ${time}`);
}

// RFC 4648 base32 vectors (unpadded, as authenticator apps take them), both directions
for (const [plain, encoded] of [['', ''], ['f', 'MY'], ['fo', 'MZXQ'], ['foo', 'MZXW6'], ['foob', 'MZXW6YQ'], ['fooba', 'MZXW6YTB'], ['foobar', 'MZXW6YTBOI']]) {
  assert.equal(base32Encode(new TextEncoder().encode(plain)), encoded);
  assert.equal(new TextDecoder().decode(base32Decode(encoded)), plain);
}
assert.equal(new TextDecoder().decode(base32Decode('mzxw 6ytb-oi==')), 'foobar', 'lowercase, spaces, dashes and padding are tolerated on input');
assert.throws(() => base32Decode('MZXW1'), /base32/, 'a character outside the alphabet is refused');

// A fresh secret is 160 bits of base32, and different every time.
const a = newSecret(), b = newSecret();
assert.match(a, /^[A-Z2-7]{32}$/); assert.notEqual(a, b);
assert.equal(base32Decode(a).length, 20);

// The URI an authenticator reads carries the secret, the issuer, and the parameters it must use.
const uri = otpauthUri({ secret: a, issuer: 'SUBZERO admin', account: 'Founding browser 1' });
assert(uri.startsWith('otpauth://totp/SUBZERO%20admin:Founding%20browser%201?')); assert(uri.includes(`secret=${a}`)); assert(/digits=6&period=30/.test(uri));

// Verification: current step and one either side; nothing further; and never twice.
const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';                  // the RFC secret in base32
const now = 1111111109 * 1000, step = stepAt(now);
const code = (s) => hotp(SECRET, s);
assert.equal(verifyTotp({ secretBase32: secret, code: code(step), nowMs: now }), step);
assert.equal(verifyTotp({ secretBase32: secret, code: code(step - 1), nowMs: now }), step - 1, 'one step early (clock drift) is accepted');
assert.equal(verifyTotp({ secretBase32: secret, code: code(step + 1), nowMs: now }), step + 1, 'one step late is accepted');
assert.equal(verifyTotp({ secretBase32: secret, code: code(step + 2), nowMs: now }), null, 'two steps away is refused');
assert.equal(verifyTotp({ secretBase32: secret, code: code(step - 2), nowMs: now }), null);
// Reason this case exists: without replay protection a code seen once (over a shoulder, in a log) works for the next 90 seconds.
assert.equal(verifyTotp({ secretBase32: secret, code: code(step), nowMs: now, lastStep: step }), null, 'a code already accepted is refused');
assert.equal(verifyTotp({ secretBase32: secret, code: code(step - 1), nowMs: now, lastStep: step }), null, 'and so is any older one');
assert.equal(verifyTotp({ secretBase32: secret, code: code(step + 1), nowMs: now, lastStep: step }), step + 1, 'a newer step still works');
// Shape: only exactly six digits, whatever else is typed.
for (const bad of ['', '12345', '1234567', 'abcdef', '12 34 5x', null, undefined, 123456.5]) assert.equal(verifyTotp({ secretBase32: secret, code: bad, nowMs: now }), null, 'refuses ' + JSON.stringify(bad));
assert.equal(verifyTotp({ secretBase32: secret, code: ` ${code(step).slice(0, 3)} ${code(step).slice(3)} `, nowMs: now }), step, 'spaces inside a code are ignored (apps show "123 456")');
console.log('totp ok: RFC 4226 and RFC 6238 vectors, RFC 4648 base32, drift window, no replay');
