// Pure-TypeScript BLAKE3 (unkeyed, standard 32-byte output), zero runtime
// dependencies -- matches this package's zero-dependency design principle
// (see package.json) and the reference algorithm at
// https://github.com/BLAKE3-team/BLAKE3-specs/blob/master/blake3.pdf.
//
// Exists to give this repo's FLX archive codec (`ark-ui.flx-codec.ts`) the
// same content-addressing algorithm as `trust-language-models`'
// `crates/flx-engine/src/hasher.rs` (`FluxHasher`), so a CID computed here
// and one computed there over the same bytes are identical, not just
// similarly-shaped. `cid_for_bytes` below mirrors `hasher.rs::cid_for_bytes`
// byte-for-byte: domain-separation tag `0xff`, 8-byte little-endian length
// prefix, then the raw content, formatted as `flx:<base58>:1`.
const IV = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);
const MSG_PERMUTATION = [2, 6, 3, 10, 7, 0, 4, 13, 1, 11, 12, 5, 9, 14, 15, 8];
const CHUNK_START = 1;
const CHUNK_END = 2;
const PARENT = 4;
const ROOT = 8;
const BLOCK_LEN = 64;
const CHUNK_LEN = 1024;
function rotr(x, n) {
    return ((x >>> n) | (x << (32 - n))) >>> 0;
}
function add32(...values) {
    let sum = 0;
    for (const value of values)
        sum = (sum + value) >>> 0;
    return sum;
}
function g(state, a, b, c, d, mx, my) {
    state[a] = add32(state[a], state[b], mx);
    state[d] = rotr(state[d] ^ state[a], 16);
    state[c] = add32(state[c], state[d]);
    state[b] = rotr(state[b] ^ state[c], 12);
    state[a] = add32(state[a], state[b], my);
    state[d] = rotr(state[d] ^ state[a], 8);
    state[c] = add32(state[c], state[d]);
    state[b] = rotr(state[b] ^ state[c], 7);
}
function permute(m) {
    const permuted = new Uint32Array(16);
    for (let i = 0; i < 16; i += 1)
        permuted[i] = m[MSG_PERMUTATION[i]];
    return permuted;
}
function compress(chainingValue, blockWords, counter, blockLen, flags) {
    const counterLow = counter >>> 0;
    const counterHigh = Math.floor(counter / 0x100000000) >>> 0;
    const state = new Uint32Array(16);
    state.set(chainingValue, 0);
    state.set(IV.subarray(0, 4), 8);
    state[12] = counterLow;
    state[13] = counterHigh;
    state[14] = blockLen;
    state[15] = flags;
    let m = blockWords;
    for (let round = 0; round < 7; round += 1) {
        g(state, 0, 4, 8, 12, m[0], m[1]);
        g(state, 1, 5, 9, 13, m[2], m[3]);
        g(state, 2, 6, 10, 14, m[4], m[5]);
        g(state, 3, 7, 11, 15, m[6], m[7]);
        g(state, 0, 5, 10, 15, m[8], m[9]);
        g(state, 1, 6, 11, 12, m[10], m[11]);
        g(state, 2, 7, 8, 13, m[12], m[13]);
        g(state, 3, 4, 9, 14, m[14], m[15]);
        if (round < 6)
            m = permute(m);
    }
    for (let i = 0; i < 8; i += 1) {
        state[i] = (state[i] ^ state[i + 8]) >>> 0;
        state[i + 8] = (state[i + 8] ^ chainingValue[i]) >>> 0;
    }
    return state;
}
function firstEightWords(state) {
    return state.subarray(0, 8);
}
function wordsFromLeBytes(bytes, len) {
    const words = new Uint32Array(16);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let i = 0; i * 4 < len; i += 1) {
        words[i] = view.getUint32(i * 4, true);
    }
    return words;
}
function outputChainingValue(output) {
    return firstEightWords(compress(output.inputChainingValue, output.blockWords, output.counter, output.blockLen, output.flags));
}
function outputRootBytes(output, outLen) {
    const result = new Uint8Array(outLen);
    let outputCounter = 0;
    let written = 0;
    while (written < outLen) {
        const words = compress(output.inputChainingValue, output.blockWords, outputCounter, output.blockLen, output.flags | ROOT);
        const bytes = new Uint8Array(64);
        const view = new DataView(bytes.buffer);
        for (let i = 0; i < 16; i += 1)
            view.setUint32(i * 4, words[i], true);
        const take = Math.min(64, outLen - written);
        result.set(bytes.subarray(0, take), written);
        written += take;
        outputCounter += 1;
    }
    return result;
}
class ChunkState {
    constructor(key, chunkCounter, flags) {
        this.block = new Uint8Array(BLOCK_LEN);
        this.blockLen = 0;
        this.blocksCompressed = 0;
        this.chainingValue = key;
        this.chunkCounter = chunkCounter;
        this.flags = flags;
    }
    len() {
        return this.blocksCompressed * BLOCK_LEN + this.blockLen;
    }
    startFlag() {
        return this.blocksCompressed === 0 ? CHUNK_START : 0;
    }
    update(input) {
        let offset = 0;
        while (offset < input.length) {
            if (this.blockLen === BLOCK_LEN) {
                const blockWords = wordsFromLeBytes(this.block, BLOCK_LEN);
                this.chainingValue = firstEightWords(compress(this.chainingValue, blockWords, this.chunkCounter, BLOCK_LEN, this.flags | this.startFlag()));
                this.blocksCompressed += 1;
                this.block = new Uint8Array(BLOCK_LEN);
                this.blockLen = 0;
            }
            const want = BLOCK_LEN - this.blockLen;
            const take = Math.min(want, input.length - offset);
            this.block.set(input.subarray(offset, offset + take), this.blockLen);
            this.blockLen += take;
            offset += take;
        }
    }
    output() {
        const blockWords = wordsFromLeBytes(this.block, this.blockLen);
        return {
            inputChainingValue: this.chainingValue,
            blockWords,
            counter: this.chunkCounter,
            blockLen: this.blockLen,
            flags: this.flags | this.startFlag() | CHUNK_END,
        };
    }
}
function parentOutput(leftCv, rightCv, key, flags) {
    const blockWords = new Uint32Array(16);
    blockWords.set(leftCv, 0);
    blockWords.set(rightCv, 8);
    return { inputChainingValue: key, blockWords, counter: 0, blockLen: BLOCK_LEN, flags: flags | PARENT };
}
function parentCv(leftCv, rightCv, key, flags) {
    return outputChainingValue(parentOutput(leftCv, rightCv, key, flags));
}
class Blake3Hasher {
    constructor() {
        this.cvStack = [];
        this.key = IV;
        this.flags = 0;
        this.chunkState = new ChunkState(this.key, 0, this.flags);
    }
    addChunkChainingValue(newCv, totalChunks) {
        let cv = newCv;
        let chunks = totalChunks;
        while ((chunks & 1) === 0) {
            const left = this.cvStack.pop();
            if (!left)
                break;
            cv = parentCv(left, cv, this.key, this.flags);
            chunks >>>= 1;
        }
        this.cvStack.push(cv);
    }
    update(input) {
        let offset = 0;
        while (offset < input.length) {
            if (this.chunkState.len() === CHUNK_LEN) {
                const chunkCv = outputChainingValue(this.chunkState.output());
                const totalChunks = this.chunkState.chunkCounter + 1;
                this.addChunkChainingValue(chunkCv, totalChunks);
                this.chunkState = new ChunkState(this.key, totalChunks, this.flags);
            }
            const want = CHUNK_LEN - this.chunkState.len();
            const take = Math.min(want, input.length - offset);
            this.chunkState.update(input.subarray(offset, offset + take));
            offset += take;
        }
    }
    finalize(outLen = 32) {
        let output = this.chunkState.output();
        let remaining = this.cvStack.length;
        while (remaining > 0) {
            remaining -= 1;
            output = parentOutput(this.cvStack[remaining], outputChainingValue(output), this.key, this.flags);
        }
        return outputRootBytes(output, outLen);
    }
}
export function blake3(bytes, outLen = 32) {
    const hasher = new Blake3Hasher();
    hasher.update(bytes);
    return hasher.finalize(outLen);
}
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
/** Bitcoin-alphabet base58, matching the Rust `base58` crate's default encoding used by `flx-engine::hasher`. */
export function toBase58(bytes) {
    let zeros = 0;
    while (zeros < bytes.length && bytes[zeros] === 0)
        zeros += 1;
    const digits = [0];
    for (let i = zeros; i < bytes.length; i += 1) {
        let carry = bytes[i];
        for (let j = 0; j < digits.length; j += 1) {
            carry += digits[j] << 8;
            digits[j] = carry % 58;
            carry = Math.floor(carry / 58);
        }
        while (carry > 0) {
            digits.push(carry % 58);
            carry = Math.floor(carry / 58);
        }
    }
    let result = "1".repeat(zeros);
    for (let i = digits.length - 1; i >= 0; i -= 1)
        result += BASE58_ALPHABET[digits[i]];
    return result;
}
const RAW_BYTES_TAG = 0xff;
/**
 * Content-addresses arbitrary bytes exactly like `flx-engine::hasher::cid_for_bytes`:
 * domain-separation tag `0xff`, 8-byte little-endian length prefix, then the
 * bytes themselves, formatted `flx:<base58_digest>:1`. Two implementations
 * (this one and the Rust one) hashing the same bytes produce the same CID.
 */
export function cidForBytes(bytes) {
    const framed = new Uint8Array(1 + 8 + bytes.length);
    framed[0] = RAW_BYTES_TAG;
    const view = new DataView(framed.buffer);
    view.setUint32(1, bytes.length >>> 0, true);
    view.setUint32(5, Math.floor(bytes.length / 0x100000000) >>> 0, true);
    framed.set(bytes, 9);
    const digest = blake3(framed, 32);
    return `flx:${toBase58(digest)}:1`;
}
