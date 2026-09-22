/* =====================================================================
   TOTP: the one-time code from an authenticator app (RFC 6238 over RFC 4226)
   ---------------------------------------------------------------------
   HMAC-SHA1, 30-second steps, 6 digits: the parameters every authenticator app
   (Google Authenticator, 1Password, Authy, Aegis...) implements. No dependency
   beyond node:crypto. Checked against the RFCs' own published vectors in
   tests/totp.test.mjs, not against this file's own output.

   A code is accepted for the current step and one either side (clock drift), and
   never twice: the caller keeps the last step it accepted and passes it back, so a
   code that was seen once (shoulder-surfed, or replayed) is worth nothing.
   ===================================================================== */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/* RFC 4648 base32, no padding: the form authenticator apps take */
export function base32Encode(bytes) {
  let bits = 0, value = 0, out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text) {
  const clean = String(text).toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0, value = 0; const out = [];
  for (const char of clean) {
    const index = ALPHABET.indexOf(char);
    if (index < 0) throw new Error('Not a base32 secret.');
    value = (value << 5) | index; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Uint8Array.from(out);
}

/* RFC 4226 HOTP: the code for one counter value */
export function hotp(secretBytes, counter, digits = 6) {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const mac = createHmac('sha1', Buffer.from(secretBytes)).update(message).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const binary = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(binary % 10 ** digits).padStart(digits, '0');
}

export const STEP_SECONDS = 30;
export const stepAt = (timeMs, period = STEP_SECONDS) => Math.floor(timeMs / 1000 / period);
export const totpAt = (secretBytes, timeMs, { period = STEP_SECONDS, digits = 6 } = {}) => hotp(secretBytes, stepAt(timeMs, period), digits);

/* A fresh 160-bit secret, as base32 */
export const newSecret = () => base32Encode(randomBytes(20));

/* The URI an authenticator app reads (from a QR code, or pasted as a link) */
export function otpauthUri({ secret, issuer, account }) {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`;
}

/* Is `code` right for this secret now? Returns the step it matched, or null. `lastStep` is the newest step already accepted:
   a code for that step or an older one is refused, so no code works twice. */
export function verifyTotp({ secretBase32, code, nowMs, lastStep = -1, window = 1, digits = 6, period = STEP_SECONDS }) {
  const given = String(code || '').replace(/\s+/g, '');
  if (!/^\d+$/.test(given) || given.length !== digits) return null;
  const secret = base32Decode(secretBase32);
  const current = stepAt(nowMs, period);
  let matched = null;
  // Look at every step in the window (no early exit), so the time taken does not say which one was close.
  for (let step = current - window; step <= current + window; step += 1) {
    const expected = Buffer.from(hotp(secret, step, digits));
    if (timingSafeEqual(expected, Buffer.from(given)) && step > lastStep) matched = matched === null || step > matched ? step : matched;
  }
  return matched;
}
