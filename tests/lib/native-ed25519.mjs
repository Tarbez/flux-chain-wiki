// Native Ed25519 for the wallet tests (owner law: tweetnacl is replaced by native crypto). The shape the tests used from
// tweetnacl's nacl.sign: a 32-byte public key and a 64-byte secret key (the 32-byte seed, then the public key), so a
// secret a test hands to the code under test reads the same. Node's built-in Ed25519 signs, RFC 8032 deterministic.
import { createPrivateKey, createPublicKey, generateKeyPairSync, randomBytes as nodeRandomBytes, sign, verify } from 'node:crypto';

const PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');
const SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

function privateOf(secretKey) {
  const seed = Buffer.from(secretKey).subarray(0, 32);
  return createPrivateKey({ key: Buffer.concat([PKCS8_PREFIX, seed]), format: 'der', type: 'pkcs8' });
}

function publicBytes(keyObject) {
  return new Uint8Array(createPublicKey(keyObject).export({ format: 'der', type: 'spki' }).subarray(-32));
}

/** A fresh key pair: `{ publicKey, secretKey }`, 32 and 64 bytes. */
export function keyPair() {
  const { privateKey } = generateKeyPairSync('ed25519');
  const seed = privateKey.export({ format: 'der', type: 'pkcs8' }).subarray(-32);
  const publicKey = publicBytes(privateKey);
  return { publicKey, secretKey: new Uint8Array(Buffer.concat([seed, Buffer.from(publicKey)])) };
}

/** The key pair of a 64-byte secret key (its seed decides it; the stored public half is not trusted). */
export function keyPairFromSecretKey(secretKey) {
  const publicKey = publicBytes(privateOf(secretKey));
  return { publicKey, secretKey: new Uint8Array(Buffer.concat([Buffer.from(secretKey).subarray(0, 32), Buffer.from(publicKey)])) };
}

/** A detached signature of `message` (64 bytes). */
export function signDetached(message, secretKey) {
  return new Uint8Array(sign(null, Buffer.from(message), privateOf(secretKey)));
}

/** Does `signature` verify over `message` under the 32-byte `publicKey`? */
export function verifyDetached(message, signature, publicKey) {
  const key = createPublicKey({ key: Buffer.concat([SPKI_PREFIX, Buffer.from(publicKey)]), format: 'der', type: 'spki' });
  return verify(null, Buffer.from(message), key, Buffer.from(signature));
}

export const randomBytes = (n) => new Uint8Array(nodeRandomBytes(n));
