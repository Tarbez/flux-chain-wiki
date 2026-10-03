import { FLX_ARCHIVE_FORMAT, FLX_ARCHIVE_MAGIC } from "./dictionary.js";
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);
const BLOCK_TYPE_TOKEN = {
    dictionary: 1,
    manifest: 2,
    route: 3,
    asset: 4,
    state: 5,
    delta: 6,
    continuation: 7,
    integrity: 8,
};
const TOKEN_BLOCK_TYPE = new Map(Object.entries(BLOCK_TYPE_TOKEN).map(([type, token]) => [token, type]));
function encodeText(value) {
    return textEncoder.encode(String(value));
}
function byteLengthOfText(value) {
    return encodeText(value).byteLength;
}
function writeU8(chunks, value) {
    chunks.push(Uint8Array.of(value & 0xff));
}
function writeU16LE(chunks, value) {
    const buffer = new Uint8Array(2);
    new DataView(buffer.buffer).setUint16(0, value, true);
    chunks.push(buffer);
}
function writeU32LE(chunks, value) {
    const buffer = new Uint8Array(4);
    new DataView(buffer.buffer).setUint32(0, value, true);
    chunks.push(buffer);
}
function writeU64LE(chunks, value) {
    const buffer = new Uint8Array(8);
    new DataView(buffer.buffer).setBigUint64(0, BigInt(value), true);
    chunks.push(buffer);
}
function writeBytes(chunks, bytes) {
    chunks.push(bytes);
}
function writeTextU16(chunks, value) {
    const bytes = encodeText(value);
    writeU16LE(chunks, bytes.byteLength);
    writeBytes(chunks, bytes);
}
function concatChunks(chunks) {
    const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const output = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        output.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return output;
}
class BinaryReader {
    constructor(bytes) {
        this.bytes = bytes;
        this.offset = 0;
    }
    ensure(length) {
        if (this.offset + length > this.bytes.byteLength) {
            throw new Error(`Unexpected end of FLX archive at byte ${this.offset}`);
        }
    }
    readU8() {
        this.ensure(1);
        const value = this.bytes[this.offset];
        this.offset += 1;
        return value;
    }
    readU16LE() {
        this.ensure(2);
        const value = new DataView(this.bytes.buffer, this.bytes.byteOffset + this.offset, 2).getUint16(0, true);
        this.offset += 2;
        return value;
    }
    readU32LE() {
        this.ensure(4);
        const value = new DataView(this.bytes.buffer, this.bytes.byteOffset + this.offset, 4).getUint32(0, true);
        this.offset += 4;
        return value;
    }
    readU64LE() {
        this.ensure(8);
        const value = new DataView(this.bytes.buffer, this.bytes.byteOffset + this.offset, 8).getBigUint64(0, true);
        this.offset += 8;
        if (value > MAX_SAFE_BIGINT)
            throw new Error(`FLX numeric field exceeds JS safe integer range: ${value.toString()}`);
        return Number(value);
    }
    readBytes(length) {
        this.ensure(length);
        const value = this.bytes.slice(this.offset, this.offset + length);
        this.offset += length;
        return value;
    }
    readTextU16() {
        const length = this.readU16LE();
        return textDecoder.decode(this.readBytes(length));
    }
}
function payloadBytes(payload) {
    return encodeText(JSON.stringify(payload));
}
function createdAtToEpochMillis(value) {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed))
        throw new Error(`Invalid FLX archive createdAt timestamp: ${value}`);
    return parsed;
}
function epochMillisToCreatedAt(value) {
    return new Date(value).toISOString();
}
function usesWideCounters(wire) {
    return Number(wire.header.major) > 2 || (Number(wire.header.major) === 2 && Number(wire.header.minor) >= 2);
}
export function looksLikeFlxArchiveBinary(bytes) {
    if (bytes.byteLength < 4)
        return false;
    return textDecoder.decode(bytes.slice(0, 4)) === FLX_ARCHIVE_MAGIC;
}
export function encodeArchiveBinary(wire) {
    const chunks = [];
    writeBytes(chunks, encodeText(FLX_ARCHIVE_MAGIC));
    writeTextU16(chunks, wire.header.format || FLX_ARCHIVE_FORMAT);
    writeU16LE(chunks, wire.header.major);
    writeU16LE(chunks, wire.header.minor);
    const wideCounters = usesWideCounters(wire);
    if (wideCounters)
        writeU64LE(chunks, wire.header.flags.length);
    else
        writeU32LE(chunks, wire.header.flags.length);
    for (const flag of wire.header.flags)
        writeTextU16(chunks, flag);
    writeTextU16(chunks, wire.header.archiveId);
    writeU64LE(chunks, createdAtToEpochMillis(wire.header.createdAt));
    if (wideCounters)
        writeU64LE(chunks, wire.header.blockCount);
    else
        writeU32LE(chunks, wire.header.blockCount);
    for (const block of wire.blocks) {
        const token = BLOCK_TYPE_TOKEN[block.type];
        if (!token)
            throw new Error(`Unsupported FLX block type: ${block.type}`);
        const payload = payloadBytes(block.payload);
        writeU8(chunks, token);
        writeTextU16(chunks, block.id);
        if (wideCounters)
            writeU64LE(chunks, block.index);
        else
            writeU32LE(chunks, block.index);
        writeU64LE(chunks, block.length);
        writeTextU16(chunks, block.encoding);
        writeTextU16(chunks, block.checksum);
        writeU64LE(chunks, payload.byteLength);
        writeBytes(chunks, payload);
    }
    return concatChunks(chunks);
}
export function decodeArchiveBinary(bytes) {
    const reader = new BinaryReader(bytes);
    const magic = textDecoder.decode(reader.readBytes(4));
    if (magic !== FLX_ARCHIVE_MAGIC)
        throw new Error(`Invalid FLX archive magic: ${magic}`);
    const format = reader.readTextU16();
    const major = reader.readU16LE();
    const minor = reader.readU16LE();
    const wideCounters = major > 2 || (major === 2 && minor >= 2);
    const flagCount = wideCounters ? reader.readU64LE() : reader.readU32LE();
    const flags = [];
    for (let index = 0; index < flagCount; index += 1)
        flags.push(reader.readTextU16());
    const archiveId = reader.readTextU16();
    const createdAt = epochMillisToCreatedAt(reader.readU64LE());
    const blockCount = wideCounters ? reader.readU64LE() : reader.readU32LE();
    const blocks = [];
    for (let index = 0; index < blockCount; index += 1) {
        const token = reader.readU8();
        const type = TOKEN_BLOCK_TYPE.get(token);
        if (!type)
            throw new Error(`Unsupported FLX block token: ${token}`);
        const id = reader.readTextU16();
        const blockIndex = wideCounters ? reader.readU64LE() : reader.readU32LE();
        const length = reader.readU64LE();
        const encoding = reader.readTextU16();
        const checksum = reader.readTextU16();
        const payloadLength = reader.readU64LE();
        const payload = JSON.parse(textDecoder.decode(reader.readBytes(payloadLength)));
        blocks.push({
            id,
            type,
            index: blockIndex,
            length,
            encoding,
            checksum,
            payload,
        });
    }
    const header = {
        magic,
        format: format,
        major,
        minor,
        archiveId,
        createdAt,
        flags,
        blockCount,
    };
    return { header, blocks };
}
