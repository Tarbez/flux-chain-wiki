import { decodeArchiveBinary, encodeArchiveBinary, looksLikeFlxArchiveBinary } from "./binary.js";
import { cidForBytes } from "./blake3.js";
import { FLX_ARCHIVE_FORMAT, FLX_ARCHIVE_MAGIC, FLX_ARCHIVE_MAJOR_VERSION, FLX_ARCHIVE_MINOR_VERSION, buildFlxArchiveDictionary, decodePath, decodeRoutePath, decodeStructuredValue, encodePath, encodeRoutePath, encodeStructuredValue, internContentType, internRouteId, internStateScope, internString, } from "./dictionary.js";
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const flxNodeZlib = globalThis.process?.getBuiltinModule?.("node:zlib");
// Feature-detected the same way as `flxNodeZlib` above: Node's global `Buffer` is not present in
// a real browser, so every call site that touched it unconditionally (`assetPayloadBytes`,
// `encodeAssetPayload`, `decodeAssetPayload`) threw a ReferenceError there. `flxNodeBuffer` is
// `undefined` in a browser, which routes those functions to the `atob`/`btoa` + `Uint8Array`
// fallback below instead of assuming Node.
const flxNodeBuffer = globalThis.Buffer;
function gzipAssetSync(input) {
    if (!flxNodeZlib)
        throw new Error("Gzip archive encoding is available in Node.js; browser archives should use identity asset compression");
    return flxNodeZlib.gzipSync(input);
}
function gunzipAssetSync(input) {
    if (!flxNodeZlib)
        throw new Error("Gzip-compressed archive assets require server-side decoding before browser inspection");
    return flxNodeZlib.gunzipSync(input);
}
// DecompressionStream (gzip) is available in Node 18+ and every evergreen browser, but it is a
// stream API with no synchronous form — there is no synchronous gzip decompression available in
// a browser at all (not even via a polyfill without shipping a second gunzip implementation,
// which would be exactly the "second decoder" this workspace's centralize-don't-duplicate law
// warns against). So this is the one piece of the decode path that must become async to be
// browser-safe; `decodeAssetPayloadAsync`/`decodeArchiveAsync` below exist for exactly that case,
// while the synchronous `decodeAssetPayload`/`decodeArchive` keep working unchanged for every
// existing Node caller and for the identity/base64 (non-gzip) case in a browser.
async function gunzipAssetAsync(input) {
    if (flxNodeZlib)
        return flxNodeZlib.gunzipSync(input);
    if (typeof DecompressionStream === "undefined") {
        throw new Error("Gzip-compressed archive assets require either Node's zlib or the browser DecompressionStream API, and neither is available in this runtime");
    }
    // Deliberately avoid Blob/Response here: both exist in Node too, but Node's own lazily-loaded
    // undici implementation of them reaches for the global `Buffer` internally, which defeats the
    // point of this fallback (it exists for runtimes where Buffer is absent). Reading the
    // ReadableStream's own reader keeps this path to Streams/DecompressionStream only, which is
    // the actual browser-native surface this function is for.
    const readable = new ReadableStream({
        start(controller) {
            controller.enqueue(input);
            controller.close();
        },
    }).pipeThrough(new DecompressionStream("gzip"));
    const reader = readable.getReader();
    const chunks = [];
    let totalLength = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done)
            break;
        chunks.push(value);
        totalLength += value.byteLength;
    }
    const output = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        output.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return output;
}
// base64 <-> bytes without Buffer, for browsers. `Uint8Array.fromBase64`/`toBase64` (the new
// TC39/WHATWG proposal) are not yet available in every evergreen browser as of this writing, so
// this uses the long-supported atob/btoa + binary-string approach instead of assuming a runtime
// that may not exist yet — verified against MDN/caniuse before writing this, not assumed.
function bytesFromBase64(value) {
    if (flxNodeBuffer)
        return Uint8Array.from(flxNodeBuffer.from(value, "base64"));
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1)
        bytes[index] = binary.charCodeAt(index);
    return bytes;
}
function bytesToBase64(bytes) {
    if (flxNodeBuffer)
        return flxNodeBuffer.from(bytes).toString("base64");
    let binary = "";
    for (let index = 0; index < bytes.byteLength; index += 1)
        binary += String.fromCharCode(bytes[index]);
    return btoa(binary);
}
const BLOCK_ORDER = {
    dictionary: 1,
    manifest: 2,
    route: 3,
    asset: 4,
    state: 5,
    delta: 6,
    continuation: 7,
    integrity: 8,
};
const MAX_ARCHIVE_BLOCK_COUNT = 1024;
const MAX_ARCHIVE_DICTIONARY_ENTRIES = 4096;
const MAX_ARCHIVE_EXPANSION_RATIO = 64;
const MAX_DELTA_CHAIN_LENGTH = 32;
const MAX_RECOVERY_MATRIX_EXPLICIT_LOSS_COUNT = 4;
const MAX_RECOVERY_MATRIX_EXPLICIT_COMBINATIONS = 4096;
const GF257_MODULUS = 257;
function stableStringify(value) {
    if (value == null || typeof value !== "object")
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(",")}}`;
}
function simpleHash(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return `flx-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
function bytesHash(value) {
    return simpleHash(textDecoder.decode(value));
}
/**
 * Real content-addressing CID for archive/block-level checksums (manifest,
 * route, asset, state, delta, continuation, integrity blocks and the
 * archive/manifest hashes derived from them) — produces the same
 * `flx:<base58>:1` format as `trust-language-models`'
 * `flx-engine::hasher::cid_for_bytes`, verified byte-for-byte identical
 * against that Rust implementation on shared input. Deliberately NOT used
 * for the GF(257)/XOR recovery-shard checksums above (`bytesHash`
 * call sites in the erasure-coding packet builders): those are a fast
 * majority-vote integrity check over many small repair packets, not
 * cross-repo content addressing, so they keep the cheaper `simpleHash`.
 */
function flxCid(value) {
    return cidForBytes(textEncoder.encode(value));
}
function xorBytesInto(target, source) {
    for (let index = 0; index < source.byteLength; index += 1) {
        target[index] ^= source[index];
    }
}
function mod257(value) {
    const normalized = value % GF257_MODULUS;
    return normalized < 0 ? normalized + GF257_MODULUS : normalized;
}
function mod257Inverse(value) {
    const normalized = mod257(value);
    if (normalized === 0)
        throw new Error("Cannot invert zero in GF(257)");
    for (let candidate = 1; candidate < GF257_MODULUS; candidate += 1) {
        if (mod257(normalized * candidate) === 1)
            return candidate;
    }
    throw new Error(`No GF(257) inverse for ${value}`);
}
function encodeUint16Symbols(values) {
    const bytes = new Uint8Array(values.length * 2);
    for (let index = 0; index < values.length; index += 1) {
        bytes[index * 2] = values[index] & 0xff;
        bytes[index * 2 + 1] = (values[index] >>> 8) & 0xff;
    }
    return bytes;
}
function decodeUint16Symbols(bytes) {
    if (bytes.byteLength % 2 !== 0)
        throw new Error("GF(257) repair packet length must be even");
    const values = [];
    for (let index = 0; index < bytes.byteLength; index += 2) {
        values.push(bytes[index] | (bytes[index + 1] << 8));
    }
    return values;
}
function recoverShardBytesFromGroup(group, groupIndex) {
    if (!group.length)
        throw new Error(`Recovery shard group ${groupIndex} is missing`);
    const shardLength = Math.max(...group.map((shard) => shard.bytes.byteLength));
    const recovered = new Uint8Array(shardLength);
    for (let byteIndex = 0; byteIndex < shardLength; byteIndex += 1) {
        const counts = new Map();
        for (const shard of group) {
            const value = shard.bytes[byteIndex] ?? -1;
            counts.set(value, (counts.get(value) || 0) + 1);
        }
        const ranked = Array.from(counts.entries()).sort((left, right) => right[1] - left[1]);
        if (!ranked.length || ranked[0][0] < 0 || ranked[0][1] < 2) {
            throw new Error(`Recovery shard group ${groupIndex} has no byte majority at offset ${byteIndex}`);
        }
        recovered[byteIndex] = ranked[0][0];
    }
    return recovered;
}
function createRecoveryRepairPacketsFromGroups(groups, groupsPerPacket, packetClass = "primary", groupStride = 1, packetIndexOffset = 0) {
    const safeGroupsPerPacket = Math.max(2, Math.floor(groupsPerPacket));
    const safeGroupStride = Math.max(1, Math.floor(groupStride));
    const packets = [];
    for (let packetIndex = 0, start = 0; start < groups.length; packetIndex += 1, start += 1) {
        const packetGroups = [];
        for (let offset = 0; offset < safeGroupsPerPacket; offset += 1) {
            const groupIndex = start + (offset * safeGroupStride);
            if (groupIndex >= groups.length)
                break;
            packetGroups.push({ groupIndex, bytes: groups[groupIndex] });
        }
        if (packetGroups.length < 2)
            break;
        const byteLength = Math.max(...packetGroups.map((entry) => entry.bytes.byteLength));
        const bytes = new Uint8Array(byteLength);
        for (const entry of packetGroups)
            xorBytesInto(bytes, entry.bytes);
        packets.push({
            packetIndex: packetIndexOffset + packetIndex,
            parityType: "xor",
            packetClass,
            groupIndexes: packetGroups.map((entry) => entry.groupIndex),
            byteLength,
            checksum: bytesHash(bytes),
            bytes,
            coefficientScheme: "unit-sum",
            symbolWidth: 1,
        });
    }
    return packets;
}
function gf257PacketPower(packet) {
    if (packet.packetClass === "primary")
        return 0;
    if (packet.packetClass === "weighted")
        return 1;
    if (packet.packetClass === "quadratic")
        return 2;
    if (packet.packetClass === "cubic")
        return 3;
    return 0;
}
function createParityRepairPacketsFromGroups(groups, groupsPerPacket, parityOrder = 2, packetIndexOffset = 0) {
    const safeGroupsPerPacket = Math.max(2, Math.floor(groupsPerPacket));
    const safeParityOrder = Math.max(2, Math.min(4, Math.floor(parityOrder)));
    const packets = [];
    for (let packetIndex = 0, start = 0; start < groups.length; packetIndex += 1, start += 1) {
        const packetGroups = [];
        for (let offset = 0; offset < safeGroupsPerPacket; offset += 1) {
            const groupIndex = start + offset;
            if (groupIndex >= groups.length)
                break;
            packetGroups.push({ groupIndex, bytes: groups[groupIndex] });
        }
        if (packetGroups.length < 2)
            break;
        const symbolCount = Math.max(...packetGroups.map((entry) => entry.bytes.byteLength));
        const equationSymbols = Array.from({ length: safeParityOrder }, () => Array.from({ length: symbolCount }, () => 0));
        for (const [offset, entry] of packetGroups.entries()) {
            const coefficient = offset + 1;
            for (let byteIndex = 0; byteIndex < symbolCount; byteIndex += 1) {
                const value = entry.bytes[byteIndex] ?? 0;
                for (let power = 0; power < safeParityOrder; power += 1) {
                    const scaled = power === 0 ? value : mod257(Math.pow(coefficient, power) * value);
                    equationSymbols[power][byteIndex] = mod257(equationSymbols[power][byteIndex] + scaled);
                }
            }
        }
        const groupIndexes = packetGroups.map((entry) => entry.groupIndex);
        const packetClasses = [
            { packetClass: "primary", coefficientScheme: "unit-sum" },
            { packetClass: "weighted", coefficientScheme: "position-weighted" },
            { packetClass: "quadratic", coefficientScheme: "position-squared" },
            { packetClass: "cubic", coefficientScheme: "position-cubed" },
        ];
        for (let power = 0; power < safeParityOrder; power += 1) {
            const bytes = encodeUint16Symbols(equationSymbols[power]);
            packets.push({
                packetIndex: packetIndexOffset + (packetIndex * safeParityOrder) + power,
                parityType: "gf257",
                packetClass: packetClasses[power].packetClass,
                groupIndexes,
                byteLength: bytes.byteLength,
                checksum: bytesHash(bytes),
                bytes,
                coefficientScheme: packetClasses[power].coefficientScheme,
                symbolWidth: 2,
            });
        }
    }
    return packets;
}
function buildRecoveryReadiness(repairPolicy) {
    if (repairPolicy.kind === "parity") {
        return {
            grade: "experimental",
            notes: [
                "weighted GF(257) repair is stronger than XOR stripes but still newly introduced",
                "manifest quorum validation remains production-grade even when repair math is experimental",
            ],
        };
    }
    return {
        grade: repairPolicy.layout === "dual-xor-stripe" ? "experimental" : "production-grade",
        notes: repairPolicy.layout === "dual-xor-stripe"
            ? ["dual-lane XOR coverage is explicit but still topology-sensitive under wider distributed loss"]
            : ["manifest quorum validation and bounded single-step reconstruction are considered production-grade"],
    };
}
function buildRecoveryRepairInventory(groupCount, repairPolicy, packets) {
    if (!repairPolicy || !packets?.length)
        return undefined;
    const coverageByGroup = Array.from({ length: groupCount }, () => 0);
    const packetClassCounts = {};
    for (const packet of packets) {
        packetClassCounts[packet.packetClass] = (packetClassCounts[packet.packetClass] || 0) + 1;
        for (const groupIndex of packet.groupIndexes) {
            if (coverageByGroup[groupIndex] != null)
                coverageByGroup[groupIndex] += 1;
        }
    }
    const matrix = buildRecoveryRecoverabilityMatrix(groupCount, repairPolicy, packets);
    const guarantees = repairPolicy.layout === "vandermonde-parity-stripe"
        ? {
            guaranteedPatterns: repairPolicy.reconstructionLimit && repairPolicy.reconstructionLimit >= 4
                ? ["single-group-loss", "parity-two-group-loss", "parity-three-group-loss", "parity-four-group-loss"]
                : ["single-group-loss", "parity-two-group-loss", "parity-three-group-loss"],
            bestEffortPatterns: ["distributed-multi-loss"],
            requiresAtLeastOneIntactGroup: true,
            matrix,
        }
        : repairPolicy.layout === "weighted-parity-stripe"
            ? {
                guaranteedPatterns: ["single-group-loss", "parity-two-group-loss"],
                bestEffortPatterns: ["distributed-multi-loss"],
                requiresAtLeastOneIntactGroup: true,
                matrix,
            }
            : repairPolicy.layout === "dual-xor-stripe"
                ? {
                    guaranteedPatterns: ["single-group-loss", "contiguous-edge-loss", "two-group-loss"],
                    bestEffortPatterns: ["chained-stripe-loss", "distributed-multi-loss"],
                    requiresAtLeastOneIntactGroup: true,
                    matrix,
                }
                : repairPolicy.layout === "iterative-xor-stripe"
                    ? {
                        guaranteedPatterns: ["single-group-loss", "contiguous-edge-loss"],
                        bestEffortPatterns: ["chained-stripe-loss", "distributed-multi-loss"],
                        requiresAtLeastOneIntactGroup: true,
                        matrix,
                    }
                    : {
                        guaranteedPatterns: ["single-group-loss"],
                        bestEffortPatterns: [],
                        requiresAtLeastOneIntactGroup: true,
                        matrix,
                    };
    return {
        packetCount: packets.length,
        layout: repairPolicy.layout,
        packetClasses: repairPolicy.packetClasses,
        groupsPerPacket: repairPolicy.groupsPerPacket,
        maxMissingGroupsPerPacket: repairPolicy.maxMissingGroupsPerPacket,
        coverageByGroup,
        packetGroupIndexes: packets.map((packet) => [...packet.groupIndexes]),
        packetClassCounts,
        maxSequentialRepairs: packets.length,
        reconstructionLimit: repairPolicy.reconstructionLimit ?? repairPolicy.maxMissingGroupsPerPacket,
        readiness: buildRecoveryReadiness(repairPolicy),
        guarantees,
    };
}
function enumerateRecoveryLossSets(groupCount, lossCount) {
    const results = [];
    const current = [];
    function visit(next) {
        if (current.length === lossCount) {
            results.push([...current]);
            return;
        }
        for (let index = next; index < groupCount; index += 1) {
            current.push(index);
            if (results.length > MAX_RECOVERY_MATRIX_EXPLICIT_COMBINATIONS) {
                current.pop();
                return;
            }
            visit(index + 1);
            current.pop();
            if (results.length > MAX_RECOVERY_MATRIX_EXPLICIT_COMBINATIONS)
                return;
        }
    }
    visit(0);
    return results;
}
function canRecoverLossSetFromPackets(groupCount, packets, lossSet) {
    const missing = new Set(lossSet);
    const available = new Set();
    for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
        if (!missing.has(groupIndex))
            available.add(groupIndex);
    }
    const packetSets = new Map();
    for (const packet of packets) {
        const key = packet.groupIndexes.join(",");
        const entry = packetSets.get(key) || {
            groupIndexes: [...packet.groupIndexes],
            xorPackets: [],
            gf257Packets: [],
        };
        if (packet.parityType === "xor")
            entry.xorPackets.push(packet);
        if (packet.parityType === "gf257")
            entry.gf257Packets.push(packet);
        packetSets.set(key, entry);
    }
    let progressed = true;
    while (progressed) {
        progressed = false;
        for (const entry of packetSets.values()) {
            for (const packet of entry.xorPackets) {
                const unresolved = packet.groupIndexes.filter((groupIndex) => !available.has(groupIndex));
                if (unresolved.length !== 1)
                    continue;
                available.add(unresolved[0]);
                progressed = true;
            }
            const unresolved = entry.groupIndexes.filter((groupIndex) => !available.has(groupIndex));
            if (!unresolved.length || !entry.gf257Packets.length)
                continue;
            const equationCount = entry.gf257Packets.length;
            if (unresolved.length <= equationCount) {
                for (const groupIndex of unresolved)
                    available.add(groupIndex);
                progressed = true;
            }
        }
    }
    return lossSet.every((groupIndex) => available.has(groupIndex));
}
function buildRecoveryRecoverabilityMatrix(groupCount, repairPolicy, packets) {
    const rows = [{ lossCount: 1, coverage: "all-combinations", proofMode: "symbolic" }];
    if (repairPolicy.layout === "iterative-xor-stripe" || repairPolicy.layout === "dual-xor-stripe") {
        for (let lossCount = 2; lossCount < groupCount; lossCount += 1) {
            rows.push({ lossCount, coverage: "contiguous-edge", proofMode: "symbolic" });
        }
    }
    if (repairPolicy.layout === "dual-xor-stripe") {
        const existing = rows.find((row) => row.lossCount === 2);
        if (existing) {
            existing.coverage = "all-combinations";
            existing.proofMode = "symbolic";
        }
        else
            rows.push({ lossCount: 2, coverage: "all-combinations", proofMode: "symbolic" });
    }
    if (repairPolicy.layout === "weighted-parity-stripe") {
        const existing = rows.find((row) => row.lossCount === 2);
        if (!existing)
            rows.push({ lossCount: 2, coverage: "explicit", proofMode: "symbolic" });
    }
    if (repairPolicy.layout === "vandermonde-parity-stripe") {
        const loss2 = rows.find((row) => row.lossCount === 2);
        if (!loss2)
            rows.push({ lossCount: 2, coverage: "explicit", proofMode: "symbolic" });
        const loss3 = rows.find((row) => row.lossCount === 3);
        if (!loss3)
            rows.push({ lossCount: 3, coverage: "explicit", proofMode: "symbolic" });
        if ((repairPolicy.reconstructionLimit || 0) >= 4) {
            const loss4 = rows.find((row) => row.lossCount === 4);
            if (!loss4)
                rows.push({ lossCount: 4, coverage: "explicit", proofMode: "symbolic" });
        }
    }
    const maxLossCount = Math.min(MAX_RECOVERY_MATRIX_EXPLICIT_LOSS_COUNT, Math.max(1, groupCount - 1));
    for (let lossCount = 2; lossCount <= maxLossCount; lossCount += 1) {
        const combinations = enumerateRecoveryLossSets(groupCount, lossCount);
        if (combinations.length > MAX_RECOVERY_MATRIX_EXPLICIT_COMBINATIONS)
            continue;
        const recoverableSets = combinations.filter((set) => canRecoverLossSetFromPackets(groupCount, packets, set));
        if (!recoverableSets.length)
            continue;
        const existing = rows.find((row) => row.lossCount === lossCount);
        if (recoverableSets.length === combinations.length) {
            if (existing) {
                existing.coverage = "all-combinations";
                existing.proofMode = "enumerated";
                existing.analyzedCombinations = combinations.length;
                delete existing.sets;
            }
            else {
                rows.push({ lossCount, coverage: "all-combinations", proofMode: "enumerated", analyzedCombinations: combinations.length });
            }
            continue;
        }
        const contiguousEdgeOnly = recoverableSets.every((set) => {
            const shape = classifyRecoveryGapShape(groupCount, set);
            return shape.contiguous && (shape.touchesStart || shape.touchesEnd) && set.length < groupCount;
        });
        if (contiguousEdgeOnly) {
            if (existing) {
                existing.coverage = "contiguous-edge";
                existing.proofMode = "enumerated";
                existing.analyzedCombinations = combinations.length;
                delete existing.sets;
            }
            else {
                rows.push({ lossCount, coverage: "contiguous-edge", proofMode: "enumerated", analyzedCombinations: combinations.length });
            }
            continue;
        }
        if (existing) {
            existing.coverage = "explicit";
            existing.proofMode = "enumerated";
            existing.analyzedCombinations = combinations.length;
            existing.sets = recoverableSets;
        }
        else {
            rows.push({ lossCount, coverage: "explicit", proofMode: "enumerated", analyzedCombinations: combinations.length, sets: recoverableSets });
        }
    }
    return rows.sort((left, right) => left.lossCount - right.lossCount);
}
function classifyRecoveryGapShape(groupCount, groupIndexes) {
    if (!groupIndexes.length) {
        return {
            contiguous: true,
            touchesStart: false,
            touchesEnd: false,
        };
    }
    const sorted = [...groupIndexes].sort((left, right) => left - right);
    let contiguous = true;
    for (let index = 1; index < sorted.length; index += 1) {
        if (sorted[index] !== sorted[index - 1] + 1) {
            contiguous = false;
            break;
        }
    }
    return {
        contiguous,
        touchesStart: sorted[0] === 0,
        touchesEnd: sorted[sorted.length - 1] === groupCount - 1,
    };
}
function isRecoveryPolicySatisfied(manifest, degradedGroups) {
    if (!degradedGroups.length)
        return { satisfied: true, basis: "explicit" };
    if (!manifest.repairInventory)
        return { satisfied: false, basis: "none" };
    const rows = manifest.repairInventory.guarantees.matrix || [];
    for (const row of rows) {
        if (row.lossCount !== degradedGroups.length)
            continue;
        if (row.coverage === "all-combinations")
            return { satisfied: true, basis: "all-combinations" };
        if (row.coverage === "contiguous-edge") {
            const shape = classifyRecoveryGapShape(manifest.groupCount, degradedGroups);
            if (shape.contiguous && (shape.touchesStart || shape.touchesEnd) && degradedGroups.length < manifest.groupCount) {
                return { satisfied: true, basis: "contiguous-edge" };
            }
            continue;
        }
        if (row.coverage === "explicit" && row.sets?.some((set) => set.length === degradedGroups.length && set.every((value, index) => [...degradedGroups].sort((a, b) => a - b)[index] === value))) {
            return { satisfied: true, basis: "explicit" };
        }
    }
    return { satisfied: false, basis: "none" };
}
function repairMissingRecoveryGroups(manifest, groupBytes) {
    const errors = [];
    const warnings = [];
    let repairedGroups = 0;
    if (!manifest.repair || !manifest.repairPackets?.length) {
        return { repairedGroups, errors, warnings };
    }
    const packetSets = new Map();
    for (const packet of manifest.repairPackets) {
        const key = packet.groupIndexes.join(",");
        const entry = packetSets.get(key) || {
            groupIndexes: [...packet.groupIndexes],
            xorPackets: [],
            gf257Packets: [],
        };
        if (packet.parityType === "xor")
            entry.xorPackets.push(packet);
        if (packet.parityType === "gf257")
            entry.gf257Packets.push(packet);
        packetSets.set(key, entry);
    }
    let progressed = true;
    const rebuiltGroups = new Set();
    while (progressed) {
        progressed = false;
        for (const entry of packetSets.values()) {
            for (const packet of entry.xorPackets) {
                const missing = packet.groupIndexes.filter((groupIndex) => !groupBytes.has(groupIndex));
                if (!missing.length || missing.length > manifest.repair.maxMissingGroupsPerPacket || missing.length !== 1)
                    continue;
                const recovered = packet.bytes.slice();
                let blocked = false;
                for (const groupIndex of packet.groupIndexes) {
                    if (groupIndex === missing[0])
                        continue;
                    const bytes = groupBytes.get(groupIndex);
                    if (!bytes) {
                        blocked = true;
                        break;
                    }
                    xorBytesInto(recovered, bytes);
                }
                if (blocked)
                    continue;
                if (!groupBytes.has(missing[0])) {
                    groupBytes.set(missing[0], recovered);
                    repairedGroups += 1;
                    rebuiltGroups.add(missing[0]);
                    warnings.push(`recovery repair packet ${packet.packetIndex} rebuilt missing group ${missing[0]}`);
                    progressed = true;
                }
            }
            const recovered = recoverGf257GroupsFromPackets(entry.groupIndexes, entry.gf257Packets, groupBytes);
            for (const [groupIndex, bytes] of recovered.entries()) {
                if (groupBytes.has(groupIndex))
                    continue;
                groupBytes.set(groupIndex, bytes);
                repairedGroups += 1;
                rebuiltGroups.add(groupIndex);
                warnings.push(`recovery weighted parity rebuilt missing group ${groupIndex}`);
                progressed = true;
            }
        }
    }
    for (const packet of manifest.repairPackets) {
        const missing = packet.groupIndexes.filter((groupIndex) => !groupBytes.has(groupIndex));
        if (!missing.length)
            continue;
        if (missing.length > manifest.repair.maxMissingGroupsPerPacket) {
            errors.push(`recovery repair packet ${packet.packetIndex} exceeds repair budget with ${missing.length} missing groups`);
            continue;
        }
        for (const groupIndex of missing) {
            if (!rebuiltGroups.has(groupIndex)) {
                errors.push(`recovery repair packet ${packet.packetIndex} is missing dependency group ${groupIndex}`);
            }
        }
    }
    return { repairedGroups, errors, warnings };
}
function solveLinearSystemMod257(matrix, vector) {
    const size = matrix.length;
    const augmented = matrix.map((row, rowIndex) => [...row.map((value) => mod257(value)), mod257(vector[rowIndex])]);
    for (let pivot = 0; pivot < size; pivot += 1) {
        let pivotRow = pivot;
        while (pivotRow < size && mod257(augmented[pivotRow][pivot]) === 0)
            pivotRow += 1;
        if (pivotRow >= size)
            return null;
        if (pivotRow !== pivot) {
            const temp = augmented[pivot];
            augmented[pivot] = augmented[pivotRow];
            augmented[pivotRow] = temp;
        }
        const pivotInverse = mod257Inverse(augmented[pivot][pivot]);
        for (let column = pivot; column <= size; column += 1)
            augmented[pivot][column] = mod257(augmented[pivot][column] * pivotInverse);
        for (let row = 0; row < size; row += 1) {
            if (row === pivot)
                continue;
            const factor = augmented[row][pivot];
            if (factor === 0)
                continue;
            for (let column = pivot; column <= size; column += 1) {
                augmented[row][column] = mod257(augmented[row][column] - (factor * augmented[pivot][column]));
            }
        }
    }
    return augmented.map((row) => mod257(row[size]));
}
function recoverGf257GroupsFromPackets(groupIndexes, gf257Packets, groupBytes) {
    const recovered = new Map();
    if (!gf257Packets.length)
        return recovered;
    const missing = groupIndexes.filter((groupIndex) => !groupBytes.has(groupIndex));
    if (!missing.length || missing.length > gf257Packets.length)
        return recovered;
    const sortedPackets = [...gf257Packets].sort((left, right) => gf257PacketPower(left) - gf257PacketPower(right)).slice(0, missing.length);
    const decodedPackets = sortedPackets.map((packet) => decodeUint16Symbols(packet.bytes));
    if (!decodedPackets.length)
        return recovered;
    const symbolCount = decodedPackets[0].length;
    if (decodedPackets.some((entry) => entry.length !== symbolCount))
        return recovered;
    const byteArrays = missing.map(() => new Uint8Array(symbolCount));
    const positionByGroup = new Map(groupIndexes.map((groupIndex, index) => [groupIndex, index + 1]));
    for (let byteIndex = 0; byteIndex < symbolCount; byteIndex += 1) {
        const matrix = [];
        const rhs = [];
        for (const [packetIndex, packet] of sortedPackets.entries()) {
            const power = gf257PacketPower(packet);
            let knownContribution = 0;
            for (const groupIndex of groupIndexes) {
                if (missing.includes(groupIndex))
                    continue;
                const coefficient = mod257(Math.pow(positionByGroup.get(groupIndex) || 1, power));
                knownContribution = mod257(knownContribution + (coefficient * (groupBytes.get(groupIndex)?.[byteIndex] ?? 0)));
            }
            rhs.push(mod257(decodedPackets[packetIndex][byteIndex] - knownContribution));
            matrix.push(missing.map((groupIndex) => mod257(Math.pow(positionByGroup.get(groupIndex) || 1, power))));
        }
        const solution = solveLinearSystemMod257(matrix, rhs);
        if (!solution || solution.some((value) => value > 255))
            return new Map();
        for (let index = 0; index < solution.length; index += 1)
            byteArrays[index][byteIndex] = solution[index];
    }
    for (const [index, groupIndex] of missing.entries())
        recovered.set(groupIndex, byteArrays[index]);
    return recovered;
}
function classifyRecoveryManifestState(groupCount, repairedGroups, missingGroups) {
    if (missingGroups.length === 0)
        return repairedGroups > 0 ? "repairable" : "complete";
    return "unrecoverable";
}
function byteLength(value) {
    return textEncoder.encode(typeof value === "string" ? value : stableStringify(value)).length;
}
function normalizeWireValue(value) {
    if (value === undefined)
        return null;
    if (value == null || typeof value !== "object")
        return value;
    if (Array.isArray(value))
        return value.map((entry) => normalizeWireValue(entry));
    const normalized = {};
    for (const [key, entry] of Object.entries(value)) {
        if (entry === undefined)
            continue;
        normalized[key] = normalizeWireValue(entry);
    }
    return normalized;
}
function normalizeContinuationReceiptGraph(graph) {
    if (!Array.isArray(graph) || !graph.length)
        return undefined;
    return graph.map((entry) => ({
        blockId: entry.blockId,
        blockType: entry.blockType,
        routeId: entry.routeId,
        path: entry.path,
        stateScope: entry.stateScope,
        status: entry.status,
        logicalStart: entry.logicalStart,
        logicalEnd: entry.logicalEnd,
        chunkIndexes: entry.chunkIndexes ? [...entry.chunkIndexes].sort((left, right) => left - right) : undefined,
    }));
}
function summarizeContinuationReceiptGraph(graph, chunkIndex) {
    if (!graph?.length)
        return undefined;
    let receivedBlockCount = 0;
    let pendingBlockCount = 0;
    let acknowledgedBlockCount = 0;
    for (const entry of graph) {
        if (entry.status === "acknowledged")
            acknowledgedBlockCount += 1;
        else if (entry.status === "received")
            receivedBlockCount += 1;
        else
            pendingBlockCount += 1;
    }
    return {
        receivedBlockCount,
        pendingBlockCount,
        acknowledgedBlockCount,
        lastChunkIndex: chunkIndex,
    };
}
function buildChunkReceiptGraph(decoded, chunkIndex, chunkCount) {
    const logicalTotal = decoded.blocks.reduce((sum, block) => sum + Math.max(1, Number(block.length || 0)), 0);
    const logicalChunkSize = Math.max(1, Math.ceil(logicalTotal / Math.max(1, chunkCount)));
    const logicalEnd = Math.min(logicalTotal, (chunkIndex + 1) * logicalChunkSize);
    let cursor = 0;
    const routeByBlockId = new Map(decoded.routes.map((route) => [route.blockId, route]));
    const stateByBlockId = new Map(decoded.states.map((state) => [state.blockId, state]));
    const assetByBlockId = new Map(decoded.assets.map((asset) => [asset.blockId, asset]));
    return decoded.blocks
        .filter((block) => block.type !== "dictionary" && block.type !== "integrity")
        .map((block) => {
        const start = cursor;
        const end = cursor + Math.max(1, Number(block.length || 0));
        cursor = end;
        const route = routeByBlockId.get(block.id);
        const state = stateByBlockId.get(block.id);
        const asset = assetByBlockId.get(block.id);
        return {
            blockId: block.id,
            blockType: block.type,
            routeId: route?.routeId,
            path: route?.path || asset?.path,
            stateScope: state?.scope,
            status: end <= logicalEnd ? "received" : "pending",
            logicalStart: start,
            logicalEnd: end,
            chunkIndexes: [chunkIndex],
        };
    });
}
function blockChecksum(type, payload) {
    return simpleHash(`${type}:${stableStringify(payload)}`);
}
function assetPayloadBytes(payload, encoding = "utf8") {
    return encoding === "base64" ? bytesFromBase64(payload) : textEncoder.encode(payload);
}
function encodeAssetPayload(payload, encoding = "utf8", requestedCompression = "identity") {
    // Encode-side stays Node-only by design (publishing happens from the publish host, never a
    // stranger's browser) — `gzipAssetSync` already throws a clear error off-Node, so this
    // function is intentionally not using the async/browser-safe helpers below.
    const rawBytes = assetPayloadBytes(payload, encoding);
    if (requestedCompression === "gzip") {
        const gzipped = gzipAssetSync(rawBytes);
        if (gzipped.byteLength < rawBytes.byteLength) {
            return {
                payload: bytesToBase64(gzipped),
                encoding,
                compression: "gzip",
                rawByteLength: rawBytes.byteLength,
                compressedByteLength: gzipped.byteLength,
            };
        }
    }
    return {
        payload,
        encoding,
        compression: "identity",
        rawByteLength: rawBytes.byteLength,
        compressedByteLength: rawBytes.byteLength,
    };
}
// Synchronous decode: browser-safe for "identity" and "base64" (non-gzip) assets, which covers
// every asset the defxn site archive (`flux-chain-site/1`, route-based manifest/article/asset
// payloads) actually produces today — see site-bundle.mjs: it never calls encodeAssetPayload with
// compression "gzip". Kept synchronous (unchanged signature/behavior for existing Node callers,
// so flx-codec's own test suite and every current consumer keep working with zero ripple) by
// refusing loudly, naming the remedy, instead of letting Buffer throw a ReferenceError, when a
// caller in a non-Node runtime actually hits a gzip-compressed asset it cannot decode
// synchronously there.
function decodeAssetPayload(payload, encoding = "utf8", compression = "identity") {
    if (compression === "gzip") {
        if (!flxNodeZlib) {
            throw new Error("This asset is gzip-compressed, which has no synchronous decoder outside Node.js. Use decodeArchiveAsync/decodeAssetPayloadAsync instead of decodeArchive/decodeAssetPayload to decode it in a browser.");
        }
        const decompressed = gunzipAssetSync(bytesFromBase64(payload));
        return encoding === "base64" ? bytesToBase64(decompressed) : textDecoder.decode(decompressed);
    }
    return payload;
}
// Async counterpart used by decodeArchiveAsync: identical result to decodeAssetPayload, but
// supports gzip-compressed assets in a real browser via DecompressionStream (see
// gunzipAssetAsync above for why this must be async rather than a browser polyfill).
async function decodeAssetPayloadAsync(payload, encoding = "utf8", compression = "identity") {
    if (compression === "gzip") {
        const decompressed = await gunzipAssetAsync(bytesFromBase64(payload));
        return encoding === "base64" ? bytesToBase64(decompressed) : textDecoder.decode(decompressed);
    }
    return payload;
}
function makeBlockId(type, semanticKey) {
    if (type === "dictionary" || type === "manifest" || type === "delta" || type === "continuation" || type === "integrity") {
        return type;
    }
    return `${type}:${semanticKey || "unknown"}`;
}
function blockChecksumWithId(type, id, payload) {
    return flxCid(`${id}:${type}:${stableStringify(payload)}`);
}
function decodeRequiredStringRef(value, dictionary) {
    return decodeStringRef(value, dictionary) || "";
}
function canonicalBlockId(type, payload, dictionary) {
    if (type === "dictionary" || type === "manifest" || type === "delta" || type === "continuation" || type === "integrity") {
        return makeBlockId(type);
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload))
        return makeBlockId(type, "unknown");
    const blockPayload = payload;
    if (type === "route") {
        const routeId = dictionary
            ? decodeRequiredStringRef(blockPayload.routeId, dictionary)
            : typeof blockPayload.routeId === "string" ? blockPayload.routeId : "";
        return makeBlockId(type, routeId || "unknown");
    }
    if (type === "asset") {
        const assetPath = dictionary && blockPayload.path
            ? decodePath(blockPayload.path, dictionary)
            : typeof blockPayload.path === "string" ? blockPayload.path : "";
        return makeBlockId(type, assetPath || "unknown");
    }
    if (type === "state") {
        const stateId = dictionary
            ? decodeRequiredStringRef(blockPayload.stateId, dictionary)
            : typeof blockPayload.stateId === "string" ? blockPayload.stateId : "";
        return makeBlockId(type, stateId || "unknown");
    }
    return makeBlockId(type, "unknown");
}
function createBlock(type, id, index, payload) {
    const normalizedPayload = normalizeWireValue(payload);
    return {
        id,
        type,
        index,
        length: byteLength(normalizedPayload),
        encoding: "tokenized-json",
        checksum: blockChecksumWithId(type, id, normalizedPayload),
        payload: normalizedPayload,
    };
}
function archiveHashFromParts(header, blocks, integrity) {
    return flxCid(stableStringify({ header, blocks, integrity }));
}
function encodeStringArray(values, dictionary) {
    if (!values?.length)
        return undefined;
    const state = buildFlxArchiveDictionary({ entry: "placeholder" }).dictionary;
    void state;
    return values.map((value) => {
        const index = dictionary.strings.indexOf(value);
        return index === -1 ? value : { kind: "string", index };
    });
}
function deltaOperationCategory(operation) {
    if (operation.op === "replace-entry")
        return "entry";
    if ("blockType" in operation)
        return operation.blockType;
    if (operation.op === "add-route"
        || operation.op === "replace-route"
        || operation.op === "remove-route")
        return "route";
    if (operation.op === "add-asset"
        || operation.op === "replace-asset"
        || operation.op === "remove-asset")
        return "asset";
    return "state";
}
function deltaOperationMode(operation) {
    if (operation.op === "replace-entry")
        return "entry";
    if (operation.op === "add-route" || operation.op === "add-asset" || operation.op === "add-state")
        return "add";
    if (operation.op === "replace-route" || operation.op === "replace-asset" || operation.op === "replace-state")
        return "replace";
    if (operation.op === "remove-route" || operation.op === "remove-asset" || operation.op === "remove-state")
        return "remove";
    return operation.op === "remove-block" ? "remove" : "replace";
}
function deltaOperationSemanticKey(operation) {
    if (operation.op === "replace-entry")
        return operation.entry;
    if ("routeId" in operation)
        return operation.routeId;
    if ("path" in operation)
        return operation.path;
    if ("stateId" in operation)
        return operation.stateId;
    return null;
}
function decodeStringRef(value, dictionary) {
    if (!value)
        return undefined;
    if (typeof value === "string")
        return value;
    if (value.kind === "string")
        return dictionary.strings[value.index] || "";
    if (value.kind === "routeId")
        return dictionary.routeIds[value.index] || "";
    if (value.kind === "stateScope")
        return dictionary.stateScopes[value.index] || "";
    return "";
}
function decodeContentTypeRef(value, dictionary) {
    return typeof value === "string" ? value : dictionary.contentTypes[value.index] || "";
}
function requireObject(value, label, errors) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        errors.push(`${label} must be an object`);
        return null;
    }
    return value;
}
function parseArchiveInput(input) {
    if (input instanceof Uint8Array) {
        if (looksLikeFlxArchiveBinary(input))
            return decodeArchiveBinary(input);
        return JSON.parse(textDecoder.decode(input));
    }
    if (typeof input === "string")
        return JSON.parse(input);
    return input;
}
function archiveToInput(decoded) {
    return {
        archiveId: decoded.header.archiveId,
        createdAt: decoded.header.createdAt,
        flags: decoded.header.flags.filter((flag) => flag !== "delta" && flag !== "continuation"),
        baseDictionary: decoded.dictionary,
        entry: decoded.manifest.entry,
        generatedBy: decoded.manifest.generatedBy,
        sourceFormat: decoded.manifest.sourceFormat,
        syncSources: decoded.manifest.syncSources,
        routes: decoded.routes.map((route) => ({
            routeId: route.routeId,
            path: route.path,
            payload: route.payload,
            title: route.title,
            description: route.description,
            dependsOn: route.dependsOn,
            dependencyGraph: route.dependencyGraph,
            guards: route.guards,
            restorePaths: route.restorePaths,
            layout: route.layout,
        })),
        assets: decoded.assets.map((asset) => ({
            path: asset.path,
            contentType: asset.contentType,
            payload: asset.payload,
            encoding: asset.encoding,
            compression: asset.compression,
            hash: asset.hash,
        })),
        states: decoded.states.map((state) => ({
            stateId: state.stateId,
            scope: state.scope,
            payload: state.payload,
            schema: state.schema,
            rootPath: state.rootPath,
            snapshotVersion: state.snapshotVersion,
        })),
        continuation: decoded.continuation,
    };
}
function normalizeComparable(value) {
    return JSON.parse(JSON.stringify(value ?? null));
}
function areEqual(left, right) {
    return stableStringify(normalizeComparable(left)) === stableStringify(normalizeComparable(right));
}
function toDecodedArchive(input) {
    if (input?.header && input?.manifest && input?.blocks) {
        return input;
    }
    return decodeArchive(input);
}
function encodeInputToWire(input) {
    return parseArchiveInput(encodeArchive(input));
}
function decodeRouteDependencyGraph(value, dictionary) {
    const decoded = value ? decodeStructuredValue(value, dictionary) : undefined;
    return Array.isArray(decoded) ? decoded : undefined;
}
function canonicalArchiveBytes(input) {
    if (input instanceof Uint8Array && looksLikeFlxArchiveBinary(input))
        return input;
    if (input?.header && input?.manifest && input?.blocks) {
        return encodeArchive(archiveToInput(input));
    }
    return encodeArchiveBinary(parseArchiveInput(input));
}
function buildManifestPayload(input, dictionary) {
    const state = buildFlxArchiveDictionary(input);
    const rawByteLength = byteLength({
        entry: input.entry,
        routes: input.routes || [],
        assets: input.assets || [],
        states: input.states || [],
        syncSources: input.syncSources || [],
        delta: input.delta || null,
        continuation: input.continuation || null,
    });
    return {
        entry: encodePath(input.entry, state),
        routes: (input.routes || []).map((route) => ({
            routeId: internRouteId(state, route.routeId),
            path: encodeRoutePath(route.path, state),
            title: route.title ? internString(state, route.title) : undefined,
            description: route.description ? internString(state, route.description) : undefined,
            dependsOn: route.dependsOn?.map((dependency) => encodeRoutePath(dependency, state)),
            dependencyGraph: route.dependencyGraph?.length ? encodeStructuredValue(route.dependencyGraph, state) : undefined,
        })),
        files: (input.assets || []).map((asset) => ({
            path: encodePath(asset.path, state),
            contentType: internContentType(state, asset.contentType),
            size: assetPayloadBytes(asset.payload, asset.encoding).byteLength,
            hash: asset.hash ? internString(state, asset.hash) : undefined,
        })),
        generatedBy: input.generatedBy ? internString(state, input.generatedBy) : undefined,
        sourceFormat: input.sourceFormat ? internString(state, input.sourceFormat) : undefined,
        syncSources: input.syncSources?.length ? encodeStructuredValue(input.syncSources, state) : undefined,
        rawByteLength,
        compressedByteLength: 0,
    };
}
function buildArchiveWire(input) {
    const dictionaryState = buildFlxArchiveDictionary(input);
    const dictionaryBlock = createBlock("dictionary", makeBlockId("dictionary"), 0, dictionaryState.dictionary);
    const manifestPayload = buildManifestPayload(input, dictionaryState.dictionary);
    const blocks = [
        dictionaryBlock,
        createBlock("manifest", makeBlockId("manifest"), 1, manifestPayload),
        ...(input.routes || []).map((route, offset) => createBlock("route", makeBlockId("route", route.routeId), offset + 2, {
            routeId: internRouteId(dictionaryState, route.routeId),
            path: encodeRoutePath(route.path, dictionaryState),
            payload: encodeStructuredValue(route.payload, dictionaryState),
            title: route.title ? internString(dictionaryState, route.title) : undefined,
            description: route.description ? internString(dictionaryState, route.description) : undefined,
            dependsOn: route.dependsOn?.map((dependency) => encodeRoutePath(dependency, dictionaryState)),
            dependencyGraph: route.dependencyGraph?.length ? encodeStructuredValue(route.dependencyGraph, dictionaryState) : undefined,
            guards: route.guards?.map((guard) => internString(dictionaryState, guard)),
            restorePaths: route.restorePaths?.map((restorePath) => encodeRoutePath(restorePath, dictionaryState)),
            layout: route.layout ? internString(dictionaryState, route.layout) : undefined,
        })),
        ...(input.assets || []).map((asset, offset) => (() => {
            const encodedAsset = encodeAssetPayload(asset.payload, asset.encoding, asset.compression || "gzip");
            return createBlock("asset", makeBlockId("asset", asset.path), offset + 2 + (input.routes || []).length, {
                path: encodePath(asset.path, dictionaryState),
                contentType: internContentType(dictionaryState, asset.contentType),
                payload: encodedAsset.payload,
                encoding: encodedAsset.encoding,
                compression: encodedAsset.compression,
                rawByteLength: encodedAsset.rawByteLength,
                compressedByteLength: encodedAsset.compressedByteLength,
                hash: asset.hash ? internString(dictionaryState, asset.hash) : undefined,
            });
        })()),
        ...(input.states || []).map((state, offset) => createBlock("state", makeBlockId("state", state.stateId), offset + 2 + (input.routes || []).length + (input.assets || []).length, {
            stateId: internString(dictionaryState, state.stateId),
            scope: internStateScope(dictionaryState, state.scope),
            payload: encodeStructuredValue(state.payload, dictionaryState),
            schema: state.schema ? internString(dictionaryState, state.schema) : undefined,
            rootPath: state.rootPath ? encodePath(state.rootPath, dictionaryState) : undefined,
            snapshotVersion: state.snapshotVersion,
        })),
    ];
    if (input.delta) {
        blocks.push(createBlock("delta", makeBlockId("delta"), blocks.length, {
            parentArchiveId: internString(dictionaryState, input.delta.parentArchiveId),
            operations: encodeStructuredValue(input.delta.operations, dictionaryState),
            baseIntegrity: input.delta.baseIntegrity ? internString(dictionaryState, input.delta.baseIntegrity) : undefined,
            deltaKind: input.delta.deltaKind ? internString(dictionaryState, input.delta.deltaKind) : undefined,
            nextArchiveId: input.delta.nextArchiveId ? internString(dictionaryState, input.delta.nextArchiveId) : undefined,
            nextCreatedAt: input.delta.nextCreatedAt ? internString(dictionaryState, input.delta.nextCreatedAt) : undefined,
        }));
    }
    if (input.continuation) {
        const receiptGraph = normalizeContinuationReceiptGraph(input.continuation.receiptGraph);
        const receiptSummary = input.continuation.receiptSummary || summarizeContinuationReceiptGraph(receiptGraph, input.continuation.chunkIndex);
        blocks.push(createBlock("continuation", makeBlockId("continuation"), blocks.length, {
            parentArchiveId: internString(dictionaryState, input.continuation.parentArchiveId),
            chunkIndex: input.continuation.chunkIndex,
            chunkCount: input.continuation.chunkCount,
            byteOffset: input.continuation.byteOffset,
            totalBytes: input.continuation.totalBytes,
            resumeToken: input.continuation.resumeToken ? internString(dictionaryState, input.continuation.resumeToken) : undefined,
            chunkChecksum: input.continuation.chunkChecksum ? internString(dictionaryState, input.continuation.chunkChecksum) : undefined,
            receivedBlocks: input.continuation.receivedBlocks?.map((blockId) => internString(dictionaryState, blockId)),
            receiptState: input.continuation.receiptState ? internString(dictionaryState, input.continuation.receiptState) : undefined,
            receiptGraph: receiptGraph?.length ? encodeStructuredValue(receiptGraph, dictionaryState) : undefined,
            receiptSummary: receiptSummary ? encodeStructuredValue(receiptSummary, dictionaryState) : undefined,
        }));
    }
    const archiveId = input.archiveId || flxCid(stableStringify({
        entry: input.entry,
        routes: input.routes || [],
        assets: input.assets || [],
        states: input.states || [],
        syncSources: input.syncSources || [],
        delta: input.delta || null,
        continuation: input.continuation || null,
    }));
    const header = {
        magic: FLX_ARCHIVE_MAGIC,
        format: FLX_ARCHIVE_FORMAT,
        major: FLX_ARCHIVE_MAJOR_VERSION,
        minor: FLX_ARCHIVE_MINOR_VERSION,
        archiveId,
        createdAt: input.createdAt || new Date().toISOString(),
        flags: [
            ...(input.flags || []),
            ...(input.delta ? ["delta"] : []),
            ...(input.continuation ? ["continuation"] : []),
        ].filter((value, index, list) => Boolean(value) && list.indexOf(value) === index),
        blockCount: 0,
    };
    const nonIntegrityHashes = blocks.map((block) => block.checksum);
    const manifestBlock = blocks.find((block) => block.type === "manifest");
    const integrityBase = {
        blockHashes: nonIntegrityHashes,
        manifestHash: manifestBlock?.checksum || "",
        parentArchiveHash: input.delta?.baseIntegrity,
    };
    const archiveHash = archiveHashFromParts(header, blocks, integrityBase);
    const integrityBlock = createBlock("integrity", makeBlockId("integrity"), blocks.length, {
        archiveHash,
        blockHashes: nonIntegrityHashes,
        manifestHash: manifestBlock?.checksum || "",
        parentArchiveHash: input.delta?.baseIntegrity,
    });
    blocks.push(integrityBlock);
    header.blockCount = blocks.length;
    const manifestPayloadBlock = blocks.find((block) => block.type === "manifest");
    manifestPayloadBlock.payload.compressedByteLength = blocks.reduce((total, block) => total + block.length, 0) + byteLength(header);
    manifestPayloadBlock.length = byteLength(manifestPayloadBlock.payload);
    manifestPayloadBlock.checksum = blockChecksumWithId("manifest", manifestPayloadBlock.id, manifestPayloadBlock.payload);
    const updatedIntegrity = blocks[blocks.length - 1];
    updatedIntegrity.payload.manifestHash = manifestPayloadBlock.checksum;
    updatedIntegrity.payload.blockHashes = blocks.slice(0, -1).map((block) => block.checksum);
    updatedIntegrity.payload.archiveHash = archiveHashFromParts(header, blocks.slice(0, -1), {
        blockHashes: updatedIntegrity.payload.blockHashes,
        manifestHash: updatedIntegrity.payload.manifestHash,
        parentArchiveHash: updatedIntegrity.payload.parentArchiveHash,
    });
    updatedIntegrity.length = byteLength(updatedIntegrity.payload);
    updatedIntegrity.checksum = blockChecksumWithId("integrity", updatedIntegrity.id, updatedIntegrity.payload);
    return { header, blocks };
}
export function encodeArchive(input) {
    return encodeArchiveBinary(buildArchiveWire(input));
}
/**
 * Debug-only wire encoding for tooling and tests: emits the semantic wire object as
 * pretty-printed JSON instead of the binary `FLX2` framing. Never treat this as the
 * canonical archive artifact format — use `encodeArchive` for real archive bytes.
 */
export function encodeArchiveDebugJson(input) {
    return JSON.stringify(buildArchiveWire(input), null, 2);
}
/**
 * Debug-only counterpart to `encodeArchiveDebugJson`. Decodes a JSON-framed wire string
 * (rather than binary `FLX2` bytes) into the same semantic archive shape as `decodeArchive`.
 */
export function decodeArchiveDebugJson(source) {
    return decodeArchive(source);
}
export function verifyArchiveStructure(input) {
    const errors = [];
    const warnings = [];
    let parsed = null;
    try {
        parsed = parseArchiveInput(input);
    }
    catch (error) {
        return {
            valid: false,
            status: "structurally-invalid",
            errors: [`failed to parse archive input: ${error instanceof Error ? error.message : String(error)}`],
            warnings,
            summary: {},
        };
    }
    const header = requireObject(parsed.header, "header", errors);
    const blocks = Array.isArray(parsed.blocks) ? parsed.blocks : null;
    if (!blocks)
        errors.push("blocks must be an array");
    let status = "valid";
    if (header) {
        if (header.magic !== FLX_ARCHIVE_MAGIC) {
            errors.push(`invalid archive magic: ${String(header.magic)}`);
            status = "structurally-invalid";
        }
        if (header.format !== FLX_ARCHIVE_FORMAT) {
            errors.push(`invalid archive format: ${String(header.format)}`);
            status = "structurally-invalid";
        }
        if (header.major !== FLX_ARCHIVE_MAJOR_VERSION) {
            errors.push(`unsupported archive major version: ${String(header.major)}`);
            status = "unsupported-version";
        }
        if (typeof header.minor !== "number")
            errors.push("header.minor must be a number");
        if (typeof header.archiveId !== "string" || !header.archiveId)
            errors.push("header.archiveId must be a non-empty string");
        if (typeof header.createdAt !== "string" || !header.createdAt)
            errors.push("header.createdAt must be a non-empty string");
        if (!Array.isArray(header.flags))
            errors.push("header.flags must be an array");
        if (typeof header.blockCount !== "number")
            errors.push("header.blockCount must be a number");
        if (blocks && typeof header.blockCount === "number" && header.blockCount !== blocks.length) {
            errors.push(`header.blockCount mismatch: expected ${header.blockCount}, found ${blocks.length}`);
        }
        if (typeof header.blockCount === "number" && header.blockCount > MAX_ARCHIVE_BLOCK_COUNT) {
            errors.push(`archive block count exceeds limit: ${header.blockCount} > ${MAX_ARCHIVE_BLOCK_COUNT}`);
        }
    }
    const singletonTypes = new Set(["dictionary", "manifest", "delta", "continuation", "integrity"]);
    const seenSingletons = new Set();
    const seenIds = new Set();
    let previousOrder = 0;
    let dictionary = null;
    for (const [index, block] of (blocks || []).entries()) {
        const blockObject = requireObject(block, `blocks[${index}]`, errors);
        if (!blockObject)
            continue;
        const type = blockObject.type;
        if (!(type in BLOCK_ORDER)) {
            errors.push(`unsupported block type at index ${index}: ${String(blockObject.type)}`);
            if (status === "valid")
                status = "unsupported-feature";
            continue;
        }
        if (singletonTypes.has(type)) {
            if (seenSingletons.has(type))
                errors.push(`duplicate singleton block: ${type}`);
            seenSingletons.add(type);
        }
        const order = BLOCK_ORDER[type];
        if (order < previousOrder)
            errors.push(`block ordering violation at index ${index}: ${type}`);
        previousOrder = Math.max(previousOrder, order);
        if (blockObject.index !== index)
            errors.push(`block index mismatch at ${index}: stored ${String(blockObject.index)}`);
        if (typeof blockObject.id !== "string" || !blockObject.id.trim())
            errors.push(`block id missing at index ${index}`);
        else if (seenIds.has(blockObject.id))
            errors.push(`duplicate block id: ${blockObject.id}`);
        else
            seenIds.add(blockObject.id);
        if (typeof blockObject.length !== "number")
            errors.push(`block length must be numeric at index ${index}`);
        if (blockObject.encoding !== "tokenized-json")
            warnings.push(`unexpected block encoding at index ${index}: ${String(blockObject.encoding)}`);
        const expectedLength = byteLength(blockObject.payload);
        if (blockObject.length !== expectedLength)
            errors.push(`block length mismatch at index ${index}: expected ${expectedLength}, found ${String(blockObject.length)}`);
        const expectedChecksum = blockChecksumWithId(type, String(blockObject.id || ""), blockObject.payload);
        if (blockObject.checksum !== expectedChecksum) {
            errors.push(`block checksum mismatch at index ${index}`);
            if (status === "valid")
                status = "integrity-invalid";
        }
        const payload = requireObject(blockObject.payload, `${type} payload`, errors);
        if (!payload)
            continue;
        if (type === "dictionary") {
            for (const field of ["strings", "paths", "contentTypes", "routeIds", "stateScopes", "routeTokens", "keys"]) {
                if (!Array.isArray(payload[field]))
                    errors.push(`dictionary payload missing array field: ${field}`);
            }
            dictionary = payload;
            const dictionaryEntries = ["strings", "paths", "contentTypes", "routeIds", "stateScopes", "routeTokens", "keys"]
                .reduce((sum, field) => sum + (Array.isArray(payload[field]) ? payload[field].length : 0), 0);
            if (dictionaryEntries > MAX_ARCHIVE_DICTIONARY_ENTRIES) {
                errors.push(`dictionary entry count exceeds limit: ${dictionaryEntries} > ${MAX_ARCHIVE_DICTIONARY_ENTRIES}`);
            }
        }
        if (type === "manifest") {
            if (!payload.entry)
                errors.push("manifest payload missing entry");
            if (!Array.isArray(payload.routes))
                errors.push("manifest payload missing routes array");
            if (!Array.isArray(payload.files))
                errors.push("manifest payload missing files array");
            else {
                payload.files.forEach((file, fileIndex) => {
                    if (!file || typeof file !== "object" || Array.isArray(file)) {
                        errors.push(`manifest file ${fileIndex} must be an object`);
                        return;
                    }
                    if ("size" in file && file.size !== undefined) {
                        if (typeof file.size !== "number" || !Number.isInteger(file.size) || file.size < 0) {
                            errors.push(`manifest file ${fileIndex} size must be a non-negative integer`);
                        }
                    }
                });
            }
        }
        if (type === "route") {
            if (!payload.routeId)
                errors.push("route payload missing routeId");
            if (!payload.path)
                errors.push("route payload missing path");
            if (!("payload" in payload))
                errors.push("route payload missing payload");
        }
        if (type === "asset") {
            if (!payload.path)
                errors.push("asset payload missing path");
            if (!payload.contentType)
                errors.push("asset payload missing contentType");
            if (typeof payload.payload !== "string")
                errors.push("asset payload must contain string payload");
            if (payload.compression !== undefined && payload.compression !== "identity" && payload.compression !== "gzip") {
                errors.push(`asset payload has invalid compression method: ${String(payload.compression)}`);
                if (status === "valid")
                    status = "unsupported-feature";
            }
            if (payload.compression === "gzip" && Number(payload.compressedByteLength || 0) > Number(payload.rawByteLength || 0)) {
                warnings.push(`gzip-compressed asset is larger than raw payload at index ${index}`);
            }
        }
        if (type === "state") {
            if (!payload.stateId)
                errors.push("state payload missing stateId");
            if (!payload.scope)
                errors.push("state payload missing scope");
            if (!("payload" in payload))
                errors.push("state payload missing payload");
        }
        if (type === "delta") {
            if (!payload.parentArchiveId)
                errors.push("delta payload missing parentArchiveId");
            if (!payload.operations)
                errors.push("delta payload missing operations");
            else if (dictionary) {
                const decodedOperations = decodeStructuredValue(payload.operations, dictionary);
                if (!Array.isArray(decodedOperations)) {
                    errors.push("delta payload operations must decode to an array");
                }
                else {
                    decodedOperations.forEach((operation, operationIndex) => {
                        if (!operation || typeof operation !== "object") {
                            errors.push(`delta operation ${operationIndex} must be an object`);
                            return;
                        }
                        const record = operation;
                        if (record.op === "replace-entry") {
                            if (typeof record.entry !== "string" || !record.entry) {
                                errors.push(`delta operation ${operationIndex} (replace-entry) missing non-empty entry`);
                            }
                            return;
                        }
                        if (record.op === "add-route"
                            || record.op === "replace-route"
                            || record.op === "remove-route") {
                            if (typeof record.blockId !== "string" || !record.blockId) {
                                errors.push(`delta operation ${operationIndex} (${String(record.op)}) missing non-empty blockId`);
                            }
                            if (typeof record.routeId !== "string" || !record.routeId) {
                                errors.push(`delta operation ${operationIndex} (${String(record.op)}) missing non-empty routeId`);
                            }
                            return;
                        }
                        if (record.op === "add-asset"
                            || record.op === "replace-asset"
                            || record.op === "remove-asset") {
                            if (typeof record.blockId !== "string" || !record.blockId) {
                                errors.push(`delta operation ${operationIndex} (${String(record.op)}) missing non-empty blockId`);
                            }
                            if (typeof record.path !== "string" || !record.path) {
                                errors.push(`delta operation ${operationIndex} (${String(record.op)}) missing non-empty path`);
                            }
                            return;
                        }
                        if (record.op === "add-state"
                            || record.op === "replace-state"
                            || record.op === "remove-state") {
                            if (typeof record.blockId !== "string" || !record.blockId) {
                                errors.push(`delta operation ${operationIndex} (${String(record.op)}) missing non-empty blockId`);
                            }
                            if (typeof record.stateId !== "string" || !record.stateId) {
                                errors.push(`delta operation ${operationIndex} (${String(record.op)}) missing non-empty stateId`);
                            }
                            return;
                        }
                        if (record.op === "upsert-block" || record.op === "remove-block") {
                            if (typeof record.blockId !== "string" || !record.blockId) {
                                errors.push(`delta operation ${operationIndex} (${String(record.op)}) missing non-empty blockId`);
                            }
                            if (record.blockType !== "route" && record.blockType !== "asset" && record.blockType !== "state") {
                                errors.push(`delta operation ${operationIndex} (${String(record.op)}) has invalid blockType: ${String(record.blockType)}`);
                            }
                            return;
                        }
                        errors.push(`delta operation ${operationIndex} has unknown op: ${String(record.op)}`);
                    });
                }
            }
        }
        if (type === "continuation") {
            for (const field of ["parentArchiveId", "chunkIndex", "chunkCount", "byteOffset", "totalBytes"]) {
                if (!(field in payload))
                    errors.push(`continuation payload missing ${field}`);
            }
            const { chunkIndex, chunkCount, byteOffset, totalBytes } = payload;
            if (typeof chunkIndex === "number" && typeof chunkCount === "number") {
                if (!Number.isInteger(chunkIndex) || chunkIndex < 0)
                    errors.push("continuation chunkIndex must be a non-negative integer");
                if (!Number.isInteger(chunkCount) || chunkCount < 1)
                    errors.push("continuation chunkCount must be a positive integer");
                if (Number.isInteger(chunkIndex) && Number.isInteger(chunkCount) && chunkIndex >= chunkCount) {
                    errors.push(`continuation chunkIndex out of range: ${chunkIndex} >= ${chunkCount}`);
                }
            }
            if (typeof byteOffset === "number" && typeof totalBytes === "number") {
                if (!Number.isInteger(byteOffset) || byteOffset < 0)
                    errors.push("continuation byteOffset must be a non-negative integer");
                if (!Number.isInteger(totalBytes) || totalBytes < 0)
                    errors.push("continuation totalBytes must be a non-negative integer");
                if (Number.isInteger(byteOffset) && Number.isInteger(totalBytes) && byteOffset > totalBytes) {
                    errors.push(`continuation byteOffset exceeds totalBytes: ${byteOffset} > ${totalBytes}`);
                }
            }
            if ("receivedBlocks" in payload && !Array.isArray(payload.receivedBlocks)) {
                errors.push("continuation receivedBlocks must be an array when present");
            }
            else if (Array.isArray(payload.receivedBlocks)) {
                const seenBlocks = new Set();
                payload.receivedBlocks.forEach((entry, receivedIndex) => {
                    const decodedEntry = dictionary
                        ? decodeStringRef(entry, dictionary)
                        : typeof entry === "string" ? entry : "";
                    if (typeof decodedEntry !== "string" || !decodedEntry.trim()) {
                        errors.push(`continuation receivedBlocks[${receivedIndex}] must be a non-empty string`);
                        return;
                    }
                    if (seenBlocks.has(decodedEntry))
                        errors.push(`continuation receivedBlocks contains duplicate block id: ${decodedEntry}`);
                    seenBlocks.add(decodedEntry);
                });
            }
            if ("receiptGraph" in payload && payload.receiptGraph != null) {
                try {
                    const decodedGraph = dictionary
                        ? decodeStructuredValue(payload.receiptGraph, dictionary)
                        : payload.receiptGraph;
                    if (!Array.isArray(decodedGraph)) {
                        errors.push("continuation receiptGraph must decode to an array when present");
                    }
                    else {
                        const seenReceiptBlocks = new Set();
                        decodedGraph.forEach((entry, receiptIndex) => {
                            if (!entry || typeof entry !== "object") {
                                errors.push(`continuation receiptGraph[${receiptIndex}] must be an object`);
                                return;
                            }
                            const record = entry;
                            const blockId = typeof record.blockId === "string" ? record.blockId : "";
                            if (!blockId) {
                                errors.push(`continuation receiptGraph[${receiptIndex}] must include a non-empty blockId`);
                                return;
                            }
                            if (seenReceiptBlocks.has(blockId))
                                errors.push(`continuation receiptGraph contains duplicate block id: ${blockId}`);
                            seenReceiptBlocks.add(blockId);
                        });
                    }
                }
                catch (error) {
                    errors.push(`continuation receiptGraph could not be decoded: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }
        if (type === "integrity") {
            if (!payload.archiveHash)
                errors.push("integrity payload missing archiveHash");
            if (!Array.isArray(payload.blockHashes))
                errors.push("integrity payload missing blockHashes");
            if (!payload.manifestHash)
                errors.push("integrity payload missing manifestHash");
            const manifestBlock = (blocks || []).find((entry) => entry?.type === "manifest");
            const expectedBlockHashes = (blocks || []).slice(0, -1).map((entry) => entry?.checksum);
            if (Array.isArray(payload.blockHashes) && stableStringify(payload.blockHashes) !== stableStringify(expectedBlockHashes)) {
                errors.push("integrity payload blockHashes do not match actual block checksums");
                if (status === "valid")
                    status = "integrity-invalid";
            }
            if (manifestBlock?.checksum && payload.manifestHash !== manifestBlock.checksum) {
                errors.push("integrity payload manifestHash does not match manifest block checksum");
                if (status === "valid")
                    status = "integrity-invalid";
            }
            const expectedArchiveHash = archiveHashFromParts(header, (blocks || []).slice(0, -1), {
                blockHashes: expectedBlockHashes,
                manifestHash: manifestBlock?.checksum || String(payload.manifestHash || ""),
                parentArchiveHash: typeof payload.parentArchiveHash === "string" ? payload.parentArchiveHash : undefined,
            });
            if (payload.archiveHash !== expectedArchiveHash) {
                errors.push("integrity payload archiveHash does not match recomputed archive hash");
                if (status === "valid")
                    status = "integrity-invalid";
            }
        }
        const expectedId = canonicalBlockId(type, blockObject.payload, dictionary);
        if (blockObject.id !== expectedId)
            errors.push(`block id does not match payload identity: ${String(blockObject.id)}`);
    }
    if (blocks?.[0]?.type !== "dictionary")
        errors.push("first block must be dictionary");
    if (blocks?.[1]?.type !== "manifest")
        errors.push("second block must be manifest");
    const lastBlock = blocks && blocks.length ? blocks[blocks.length - 1] : null;
    if (lastBlock?.type !== "integrity")
        errors.push("last block must be integrity");
    if (!seenSingletons.has("dictionary"))
        errors.push("archive missing dictionary block");
    if (!seenSingletons.has("manifest"))
        errors.push("archive missing manifest block");
    if (!seenSingletons.has("integrity"))
        errors.push("archive missing integrity block");
    if (blocks) {
        const manifest = blocks.find((entry) => entry?.type === "manifest");
        if (manifest) {
            const compressed = Number(manifest.payload.compressedByteLength || 0);
            const raw = Number(manifest.payload.rawByteLength || 0);
            if (compressed > 0 && raw >= 0) {
                const ratio = raw / compressed;
                if (ratio > MAX_ARCHIVE_EXPANSION_RATIO) {
                    errors.push(`archive expansion ratio exceeds limit: ${ratio.toFixed(2)} > ${MAX_ARCHIVE_EXPANSION_RATIO}`);
                }
            }
        }
    }
    if (status === "valid" && errors.length)
        status = "structurally-invalid";
    return {
        valid: errors.length === 0,
        status,
        errors,
        warnings,
        summary: {
            major: header?.major,
            minor: header?.minor,
            blockCount: header?.blockCount,
            archiveId: header?.archiveId,
        },
    };
}
// `assetPayloadDecoder` is an internal seam, not public API: `decodeArchive` passes the ordinary
// synchronous `decodeAssetPayload` (unchanged behavior for every existing caller, including
// flx-codec's own test suite). `decodeArchiveAsync` below passes a variant that defers gzip
// assets instead of throwing, then resolves them afterward with `decodeAssetPayloadAsync`
// (DecompressionStream) and patches the result — see decodeArchiveAsync for why this is the one
// part of decode that must be async in a browser. Keeping one shared body here (rather than a
// forked copy for the async case) is deliberate: a second decoder is a second place to drift.
function decodeArchiveCore(input, assetPayloadDecoder) {
    const verification = verifyArchiveStructure(input);
    if (!verification.valid) {
        throw new Error(`Invalid FLX archive (${verification.status}): ${verification.errors.join("; ")}`);
    }
    const parsed = parseArchiveInput(input);
    const dictionaryBlock = parsed.blocks.find((block) => block.type === "dictionary");
    const dictionary = dictionaryBlock.payload;
    const manifestBlock = parsed.blocks.find((block) => block.type === "manifest");
    const integrityBlock = parsed.blocks.find((block) => block.type === "integrity");
    return {
        header: parsed.header,
        dictionary,
        manifest: (() => {
            const decodedSyncSources = manifestBlock.payload.syncSources
                ? decodeStructuredValue(manifestBlock.payload.syncSources, dictionary)
                : undefined;
            return {
                entry: decodePath(manifestBlock.payload.entry, dictionary),
                routes: manifestBlock.payload.routes.map((route) => ({
                    routeId: decodeStringRef(route.routeId, dictionary) || "",
                    path: decodeRoutePath(route.path, dictionary),
                    title: decodeStringRef(route.title, dictionary),
                    description: decodeStringRef(route.description, dictionary),
                    dependsOn: route.dependsOn?.map((path) => decodeRoutePath(path, dictionary)),
                    dependencyGraph: decodeRouteDependencyGraph(route.dependencyGraph, dictionary),
                })),
                files: manifestBlock.payload.files.map((file) => ({
                    path: decodePath(file.path, dictionary),
                    contentType: decodeContentTypeRef(file.contentType, dictionary),
                    size: typeof file.size === "number" ? file.size : undefined,
                    hash: decodeStringRef(file.hash, dictionary),
                })),
                generatedBy: decodeStringRef(manifestBlock.payload.generatedBy, dictionary),
                sourceFormat: decodeStringRef(manifestBlock.payload.sourceFormat, dictionary),
                syncSources: Array.isArray(decodedSyncSources) ? decodedSyncSources : undefined,
                rawByteLength: manifestBlock.payload.rawByteLength,
                compressedByteLength: manifestBlock.payload.compressedByteLength,
            };
        })(),
        routes: parsed.blocks
            .filter((block) => block.type === "route")
            .map((block) => ({
            blockId: block.id,
            routeId: decodeStringRef(block.payload.routeId, dictionary) || "",
            path: decodeRoutePath(block.payload.path, dictionary),
            payload: decodeStructuredValue(block.payload.payload, dictionary),
            title: decodeStringRef(block.payload.title, dictionary),
            description: decodeStringRef(block.payload.description, dictionary),
            dependsOn: block.payload.dependsOn?.map((path) => decodeRoutePath(path, dictionary)),
            dependencyGraph: decodeRouteDependencyGraph(block.payload.dependencyGraph, dictionary),
            guards: block.payload.guards?.map((guard) => decodeStringRef(guard, dictionary) || ""),
            restorePaths: block.payload.restorePaths?.map((path) => decodeRoutePath(path, dictionary)),
            layout: decodeStringRef(block.payload.layout, dictionary),
        })),
        assets: parsed.blocks
            .filter((block) => block.type === "asset")
            .map((block) => ({
            blockId: block.id,
            path: decodePath(block.payload.path, dictionary),
            contentType: decodeContentTypeRef(block.payload.contentType, dictionary),
            payload: assetPayloadDecoder(block.payload.payload, block.payload.encoding, block.payload.compression),
            encoding: block.payload.encoding,
            compression: block.payload.compression || "identity",
            rawByteLength: block.payload.rawByteLength,
            compressedByteLength: block.payload.compressedByteLength,
            hash: decodeStringRef(block.payload.hash, dictionary),
        })),
        states: parsed.blocks
            .filter((block) => block.type === "state")
            .map((block) => ({
            blockId: block.id,
            stateId: decodeStringRef(block.payload.stateId, dictionary) || "",
            scope: decodeStringRef(block.payload.scope, dictionary) || "",
            payload: decodeStructuredValue(block.payload.payload, dictionary),
            schema: decodeStringRef(block.payload.schema, dictionary),
            rootPath: block.payload.rootPath ? decodePath(block.payload.rootPath, dictionary) : undefined,
            snapshotVersion: block.payload.snapshotVersion,
        })),
        delta: (() => {
            const block = parsed.blocks.find((entry) => entry.type === "delta");
            if (!block)
                return null;
            return {
                parentArchiveId: decodeStringRef(block.payload.parentArchiveId, dictionary) || "",
                operations: decodeStructuredValue(block.payload.operations, dictionary),
                baseIntegrity: decodeStringRef(block.payload.baseIntegrity, dictionary),
                deltaKind: decodeStringRef(block.payload.deltaKind, dictionary),
                nextArchiveId: decodeStringRef(block.payload.nextArchiveId, dictionary),
                nextCreatedAt: decodeStringRef(block.payload.nextCreatedAt, dictionary),
            };
        })(),
        continuation: (() => {
            const block = parsed.blocks.find((entry) => entry.type === "continuation");
            if (!block)
                return null;
            return {
                parentArchiveId: decodeStringRef(block.payload.parentArchiveId, dictionary) || "",
                chunkIndex: block.payload.chunkIndex,
                chunkCount: block.payload.chunkCount,
                byteOffset: block.payload.byteOffset,
                totalBytes: block.payload.totalBytes,
                resumeToken: decodeStringRef(block.payload.resumeToken, dictionary),
                chunkChecksum: decodeStringRef(block.payload.chunkChecksum, dictionary),
                receivedBlocks: block.payload.receivedBlocks?.map((entry) => decodeStringRef(entry, dictionary) || ""),
                receiptState: decodeStringRef(block.payload.receiptState, dictionary),
                receiptGraph: Array.isArray(block.payload.receiptGraph)
                    ? block.payload.receiptGraph
                    : (block.payload.receiptGraph ? decodeStructuredValue(block.payload.receiptGraph, dictionary) : undefined),
                receiptSummary: block.payload.receiptSummary
                    ? decodeStructuredValue(block.payload.receiptSummary, dictionary)
                    : undefined,
            };
        })(),
        integrity: integrityBlock.payload,
        blocks: parsed.blocks,
    };
}
const ASYNC_ASSET_PENDING = Symbol("flx-codec:pending-gzip-asset");
export function decodeArchive(input) {
    return decodeArchiveCore(input, decodeAssetPayload);
}
/**
 * Browser-safe counterpart to `decodeArchive` for archives that contain gzip-compressed asset
 * blocks (the defxn site archive schema never does — see site-bundle.mjs, which only emits
 * `route` blocks with identity-compressed payloads — so `decodeArchive` is already sufficient,
 * and faster, for that case). Returns a Promise; every other shape of the result is identical to
 * `decodeArchive`. Only exists because real synchronous gzip decompression is not available in a
 * browser (see gunzipAssetAsync's comment) — this is the minimal async surface that follows from
 * that, not a parallel decoder: it reuses `decodeArchiveCore`, the exact same block/dictionary/
 * route handling as the sync path, and only special-cases the one call that cannot be sync there.
 */
export async function decodeArchiveAsync(input) {
    const pending = [];
    const decoded = decodeArchiveCore(input, (payload, encoding, compression) => {
        if (compression === "gzip") {
            const marker = { [ASYNC_ASSET_PENDING]: true, payload, encoding, compression };
            pending.push(marker);
            return marker;
        }
        return decodeAssetPayload(payload, encoding, compression);
    });
    if (pending.length) {
        await Promise.all(pending.map(async (marker) => {
            marker.resolved = await decodeAssetPayloadAsync(marker.payload, marker.encoding, marker.compression);
        }));
        for (const asset of decoded.assets) {
            if (asset.payload && asset.payload[ASYNC_ASSET_PENDING]) {
                asset.payload = asset.payload.resolved;
            }
        }
    }
    return decoded;
}
export { decodeAssetPayloadAsync };
export function diffArchives(baseInput, nextInput) {
    const base = toDecodedArchive(baseInput);
    const next = toDecodedArchive(nextInput);
    const operations = [];
    if (base.manifest.entry !== next.manifest.entry) {
        operations.push({ op: "replace-entry", entry: next.manifest.entry });
    }
    const baseRoutes = new Map(base.routes.map((route) => [route.blockId, route]));
    const nextRoutes = new Map(next.routes.map((route) => [route.blockId, route]));
    const changedRoutes = [];
    for (const route of next.routes) {
        const previous = baseRoutes.get(route.blockId);
        if (!previous || !areEqual(previous, route)) {
            operations.push({
                op: previous ? "replace-route" : "add-route",
                blockId: route.blockId,
                routeId: route.routeId,
            });
            changedRoutes.push({
                routeId: route.routeId,
                path: route.path,
                payload: route.payload,
                title: route.title,
                description: route.description,
                dependsOn: route.dependsOn,
                dependencyGraph: route.dependencyGraph,
                guards: route.guards,
                restorePaths: route.restorePaths,
                layout: route.layout,
            });
        }
    }
    for (const route of base.routes) {
        if (!nextRoutes.has(route.blockId)) {
            operations.push({ op: "remove-route", blockId: route.blockId, routeId: route.routeId });
        }
    }
    const baseAssets = new Map(base.assets.map((asset) => [asset.blockId, asset]));
    const nextAssets = new Map(next.assets.map((asset) => [asset.blockId, asset]));
    const changedAssets = [];
    for (const asset of next.assets) {
        const previous = baseAssets.get(asset.blockId);
        if (!previous || !areEqual(previous, asset)) {
            operations.push({
                op: previous ? "replace-asset" : "add-asset",
                blockId: asset.blockId,
                path: asset.path,
            });
            changedAssets.push({
                path: asset.path,
                contentType: asset.contentType,
                payload: asset.payload,
                encoding: asset.encoding,
                hash: asset.hash,
            });
        }
    }
    for (const asset of base.assets) {
        if (!nextAssets.has(asset.blockId)) {
            operations.push({ op: "remove-asset", blockId: asset.blockId, path: asset.path });
        }
    }
    const baseStates = new Map(base.states.map((state) => [state.blockId, state]));
    const nextStates = new Map(next.states.map((state) => [state.blockId, state]));
    const changedStates = [];
    for (const state of next.states) {
        const previous = baseStates.get(state.blockId);
        if (!previous || !areEqual(previous, state)) {
            operations.push({
                op: previous ? "replace-state" : "add-state",
                blockId: state.blockId,
                stateId: state.stateId,
            });
            changedStates.push({
                stateId: state.stateId,
                scope: state.scope,
                payload: state.payload,
                schema: state.schema,
                rootPath: state.rootPath,
                snapshotVersion: state.snapshotVersion,
            });
        }
    }
    for (const state of base.states) {
        if (!nextStates.has(state.blockId)) {
            operations.push({ op: "remove-state", blockId: state.blockId, stateId: state.stateId });
        }
    }
    return {
        createdAt: next.header.createdAt,
        entry: next.manifest.entry,
        generatedBy: next.manifest.generatedBy,
        sourceFormat: "flx-archive-delta",
        syncSources: [
            {
                kind: "base-archive",
                archiveId: base.header.archiveId,
                archiveHash: base.integrity.archiveHash,
                appliedAt: next.header.createdAt,
            },
            {
                kind: "target-archive",
                archiveId: next.header.archiveId,
                archiveHash: next.integrity.archiveHash,
                appliedAt: next.header.createdAt,
            },
        ],
        routes: changedRoutes,
        assets: changedAssets,
        states: changedStates,
        delta: {
            parentArchiveId: base.header.archiveId,
            baseIntegrity: base.integrity.archiveHash,
            deltaKind: "archive-delta",
            nextArchiveId: next.header.archiveId,
            nextCreatedAt: next.header.createdAt,
            operations,
        },
    };
}
export function verifyArchiveLineage(baseInput, deltaInput) {
    const base = toDecodedArchive(baseInput);
    const delta = toDecodedArchive(deltaInput);
    const errors = [];
    const warnings = [];
    if (!delta.delta) {
        errors.push("archive does not contain a delta block");
    }
    else {
        const baseRouteIds = new Set(base.routes.map((route) => route.blockId));
        const baseAssetIds = new Set(base.assets.map((asset) => asset.blockId));
        const baseStateIds = new Set(base.states.map((state) => state.blockId));
        const deltaRouteMap = new Map(delta.routes.map((route) => [route.blockId, route]));
        const deltaAssetMap = new Map(delta.assets.map((asset) => [asset.blockId, asset]));
        const deltaStateMap = new Map(delta.states.map((state) => [state.blockId, state]));
        if (delta.delta.parentArchiveId !== base.header.archiveId) {
            errors.push(`delta parent archive mismatch: expected ${base.header.archiveId}, found ${delta.delta.parentArchiveId}`);
        }
        if (delta.delta.baseIntegrity && delta.delta.baseIntegrity !== base.integrity.archiveHash) {
            errors.push(`delta base integrity mismatch: expected ${base.integrity.archiveHash}, found ${delta.delta.baseIntegrity}`);
        }
        for (const operation of delta.delta.operations) {
            if (operation.op === "replace-entry")
                continue;
            const category = deltaOperationCategory(operation);
            const mode = deltaOperationMode(operation);
            const semanticKey = deltaOperationSemanticKey(operation);
            const existsInBase = category === "route"
                ? baseRouteIds.has(operation.blockId)
                : category === "asset"
                    ? baseAssetIds.has(operation.blockId)
                    : baseStateIds.has(operation.blockId);
            const payloadExists = category === "route"
                ? deltaRouteMap.has(operation.blockId)
                : category === "asset"
                    ? deltaAssetMap.has(operation.blockId)
                    : deltaStateMap.has(operation.blockId);
            if (mode === "add") {
                if (existsInBase)
                    errors.push(`delta ${operation.op} references an already-existing base block: ${operation.blockId}`);
                if (!payloadExists)
                    errors.push(`delta ${operation.op} missing payload block: ${operation.blockId}`);
            }
            else if (mode === "replace") {
                if (!existsInBase)
                    errors.push(`delta ${operation.op} references missing base block: ${operation.blockId}`);
                if (!payloadExists)
                    errors.push(`delta ${operation.op} missing payload block: ${operation.blockId}`);
            }
            else if (mode === "remove") {
                if (!existsInBase)
                    errors.push(`delta ${operation.op} references missing base block: ${operation.blockId}`);
            }
            if (semanticKey == null || !payloadExists)
                continue;
            if (category === "route") {
                const payload = deltaRouteMap.get(operation.blockId);
                if (payload && payload.routeId !== semanticKey)
                    errors.push(`delta ${operation.op} semantic routeId mismatch for block ${operation.blockId}`);
            }
            else if (category === "asset") {
                const payload = deltaAssetMap.get(operation.blockId);
                if (payload && payload.path !== semanticKey)
                    errors.push(`delta ${operation.op} semantic path mismatch for block ${operation.blockId}`);
            }
            else {
                const payload = deltaStateMap.get(operation.blockId);
                if (payload && payload.stateId !== semanticKey)
                    errors.push(`delta ${operation.op} semantic stateId mismatch for block ${operation.blockId}`);
            }
        }
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        summary: {
            baseArchiveId: base.header.archiveId,
            deltaArchiveId: delta.header.archiveId,
            operationCount: delta.delta?.operations.length || 0,
        },
    };
}
export function maxFlxDeltaChainLength() {
    return MAX_DELTA_CHAIN_LENGTH;
}
export function applyDelta(baseInput, deltaInput) {
    const base = toDecodedArchive(baseInput);
    const delta = toDecodedArchive(deltaInput);
    const lineage = verifyArchiveLineage(base, delta);
    if (!lineage.valid) {
        throw new Error(`Invalid FLX delta lineage: ${lineage.errors.join("; ")}`);
    }
    if (!delta.delta) {
        throw new Error("Cannot apply delta: missing delta block");
    }
    const next = archiveToInput(base);
    const routeMap = new Map(base.routes.map((route) => [route.blockId, {
            routeId: route.routeId,
            path: route.path,
            payload: route.payload,
            title: route.title,
            description: route.description,
            dependsOn: route.dependsOn,
            dependencyGraph: route.dependencyGraph,
            guards: route.guards,
            restorePaths: route.restorePaths,
            layout: route.layout,
        }]));
    const assetMap = new Map(base.assets.map((asset) => [asset.blockId, {
            path: asset.path,
            contentType: asset.contentType,
            payload: asset.payload,
            encoding: asset.encoding,
            hash: asset.hash,
        }]));
    const stateMap = new Map(base.states.map((state) => [state.blockId, {
            stateId: state.stateId,
            scope: state.scope,
            payload: state.payload,
            schema: state.schema,
            rootPath: state.rootPath,
            snapshotVersion: state.snapshotVersion,
        }]));
    const deltaRouteMap = new Map(delta.routes.map((route) => [route.blockId, route]));
    const deltaAssetMap = new Map(delta.assets.map((asset) => [asset.blockId, asset]));
    const deltaStateMap = new Map(delta.states.map((state) => [state.blockId, state]));
    for (const operation of delta.delta.operations) {
        const category = deltaOperationCategory(operation);
        const mode = deltaOperationMode(operation);
        if (operation.op === "replace-entry") {
            next.entry = operation.entry;
            continue;
        }
        if (category === "route" && mode !== "remove") {
            const route = deltaRouteMap.get(operation.blockId);
            if (!route)
                throw new Error(`Delta is missing route payload for ${operation.blockId}`);
            routeMap.set(operation.blockId, {
                routeId: route.routeId,
                path: route.path,
                payload: route.payload,
                title: route.title,
                description: route.description,
                dependsOn: route.dependsOn,
                dependencyGraph: route.dependencyGraph,
                guards: route.guards,
                restorePaths: route.restorePaths,
                layout: route.layout,
            });
            continue;
        }
        if (category === "route" && mode === "remove") {
            routeMap.delete(operation.blockId);
            continue;
        }
        if (category === "asset" && mode !== "remove") {
            const asset = deltaAssetMap.get(operation.blockId);
            if (!asset)
                throw new Error(`Delta is missing asset payload for ${operation.blockId}`);
            assetMap.set(operation.blockId, {
                path: asset.path,
                contentType: asset.contentType,
                payload: asset.payload,
                encoding: asset.encoding,
                hash: asset.hash,
            });
            continue;
        }
        if (category === "asset" && mode === "remove") {
            assetMap.delete(operation.blockId);
            continue;
        }
        if (category === "state" && mode !== "remove") {
            const state = deltaStateMap.get(operation.blockId);
            if (!state)
                throw new Error(`Delta is missing state payload for ${operation.blockId}`);
            stateMap.set(operation.blockId, {
                stateId: state.stateId,
                scope: state.scope,
                payload: state.payload,
                schema: state.schema,
                rootPath: state.rootPath,
                snapshotVersion: state.snapshotVersion,
            });
            continue;
        }
        if (category === "state" && mode === "remove") {
            stateMap.delete(operation.blockId);
        }
    }
    next.archiveId = delta.delta.nextArchiveId;
    next.createdAt = delta.delta.nextCreatedAt || delta.header.createdAt;
    next.routes = Array.from(routeMap.values());
    next.assets = Array.from(assetMap.values());
    next.states = Array.from(stateMap.values());
    next.generatedBy = delta.manifest.generatedBy || next.generatedBy;
    next.sourceFormat = "flx-archive";
    next.syncSources = delta.manifest.syncSources || next.syncSources;
    return next;
}
export function splitArchiveContinuations(input, chunkSize) {
    const decoded = toDecodedArchive(input);
    const wire = parseArchiveInput(input instanceof Uint8Array || typeof input === "string"
        ? input
        : "header" in input
            ? encodeInputToWire(archiveToInput(input))
            : input);
    const bytes = textEncoder.encode(JSON.stringify(wire));
    const parentArchiveId = wire.header.archiveId;
    const totalBytes = bytes.byteLength;
    const safeChunkSize = Math.max(1, Math.floor(chunkSize));
    const chunkCount = Math.ceil(totalBytes / safeChunkSize);
    const chunks = [];
    for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
        const byteOffset = chunkIndex * safeChunkSize;
        const chunkBytes = bytes.slice(byteOffset, Math.min(totalBytes, byteOffset + safeChunkSize));
        const receiptGraph = buildChunkReceiptGraph(decoded, chunkIndex, chunkCount);
        chunks.push({
            parentArchiveId,
            chunkIndex,
            chunkCount,
            byteOffset,
            totalBytes,
            resumeToken: `${parentArchiveId}:${chunkIndex + 1}/${chunkCount}`,
            chunkChecksum: simpleHash(textDecoder.decode(chunkBytes)),
            bytes: chunkBytes,
            receivedBlocks: receiptGraph.filter((entry) => entry.status === "received").map((entry) => entry.blockId),
            receiptGraph,
            receiptSummary: summarizeContinuationReceiptGraph(receiptGraph, chunkIndex),
        });
    }
    return chunks;
}
export function createArchiveRecoveryShards(input, shardSize, replicaCount = 3, sourceIds) {
    const decoded = toDecodedArchive(input);
    const bytes = canonicalArchiveBytes(input);
    const safeShardSize = Math.max(1, Math.floor(shardSize));
    const safeReplicaCount = Math.max(3, Math.floor(replicaCount));
    const normalizedSourceIds = sourceIds?.length
        ? Array.from({ length: safeReplicaCount }, (_, index) => sourceIds[index] || `source-${index + 1}`)
        : Array.from({ length: safeReplicaCount }, (_, index) => `source-${index + 1}`);
    const groupCount = Math.ceil(bytes.byteLength / safeShardSize);
    const shards = [];
    for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
        const byteOffset = groupIndex * safeShardSize;
        const shardBytes = bytes.slice(byteOffset, Math.min(bytes.byteLength, byteOffset + safeShardSize));
        const checksum = simpleHash(textDecoder.decode(shardBytes));
        for (let replicaIndex = 0; replicaIndex < safeReplicaCount; replicaIndex += 1) {
            shards.push({
                parentArchiveId: decoded.header.archiveId,
                archiveHash: decoded.integrity.archiveHash,
                sourceId: normalizedSourceIds[replicaIndex],
                groupIndex,
                groupCount,
                replicaIndex,
                replicaCount: safeReplicaCount,
                byteOffset,
                totalBytes: bytes.byteLength,
                checksum,
                bytes: shardBytes.slice(),
            });
        }
    }
    return shards;
}
export function createRecoveryManifest(shards, quorum = {}, repair) {
    if (!shards.length)
        throw new Error("Cannot create recovery manifest without shards");
    const first = shards[0];
    const sourceMap = new Map();
    const grouped = new Map();
    let shardSize = 0;
    for (const shard of shards) {
        if (shard.parentArchiveId !== first.parentArchiveId)
            throw new Error("Recovery manifest parent archive mismatch");
        if (shard.archiveHash !== first.archiveHash)
            throw new Error("Recovery manifest archive hash mismatch");
        const set = sourceMap.get(shard.sourceId) || new Set();
        set.add(shard.replicaIndex);
        sourceMap.set(shard.sourceId, set);
        const group = grouped.get(shard.groupIndex) || [];
        group.push(shard);
        grouped.set(shard.groupIndex, group);
        shardSize = Math.max(shardSize, shard.bytes.byteLength);
    }
    const availableSources = sourceMap.size;
    const minSources = Math.max(1, Math.min(quorum.minSources ?? Math.min(3, availableSources), availableSources));
    const minMatchingSources = Math.max(1, Math.min(quorum.minMatchingSources ?? Math.min(2, minSources), minSources));
    const canonicalGroups = [];
    for (let groupIndex = 0; groupIndex < first.groupCount; groupIndex += 1) {
        const group = grouped.get(groupIndex) || [];
        if (!group.length)
            throw new Error(`Recovery manifest group ${groupIndex} is missing`);
        canonicalGroups.push(recoverShardBytesFromGroup(group, groupIndex));
    }
    const groupsPerPacket = Math.max(2, Math.floor(repair?.groupsPerPacket || 0));
    const primaryPackets = repair?.groupsPerPacket && repair?.kind !== "parity"
        ? createRecoveryRepairPacketsFromGroups(canonicalGroups, groupsPerPacket, "primary")
        : [];
    const diagonalStride = Math.max(2, Math.floor(repair?.diagonalStride || groupsPerPacket));
    const diagonalPackets = repair?.groupsPerPacket && repair?.kind !== "parity" && repair?.includeDiagonal
        ? createRecoveryRepairPacketsFromGroups(canonicalGroups, groupsPerPacket, "diagonal", diagonalStride, primaryPackets.length)
        : [];
    const parityDepth = repair?.kind === "parity" ? Math.max(2, Math.min(4, Math.floor(repair?.parityDepth || 2))) : 0;
    const weightedPackets = repair?.groupsPerPacket && repair?.kind === "parity"
        ? createParityRepairPacketsFromGroups(canonicalGroups, groupsPerPacket, parityDepth)
        : [];
    const repairPackets = [...primaryPackets, ...diagonalPackets, ...weightedPackets];
    const repairPolicy = repairPackets.length
        ? repair?.kind === "parity"
            ? {
                kind: "parity",
                layout: parityDepth >= 3 ? "vandermonde-parity-stripe" : "weighted-parity-stripe",
                packetClasses: parityDepth >= 4 ? ["primary", "weighted", "quadratic", "cubic"] : (parityDepth >= 3 ? ["primary", "weighted", "quadratic"] : ["primary", "weighted"]),
                groupsPerPacket,
                maxMissingGroupsPerPacket: parityDepth,
                packetCount: repairPackets.length,
                reconstructionLimit: parityDepth,
            }
            : {
                kind: "xor",
                layout: diagonalPackets.length ? "dual-xor-stripe" : "iterative-xor-stripe",
                packetClasses: diagonalPackets.length ? ["primary", "diagonal"] : ["primary"],
                groupsPerPacket,
                maxMissingGroupsPerPacket: 1,
                packetCount: repairPackets.length,
                diagonalStride: diagonalPackets.length ? diagonalStride : undefined,
                reconstructionLimit: 1,
            }
        : undefined;
    return {
        format: "ark-flx-recovery-manifest",
        version: 1,
        parentArchiveId: first.parentArchiveId,
        archiveHash: first.archiveHash,
        totalBytes: first.totalBytes,
        groupCount: first.groupCount,
        shardSize,
        sources: Array.from(sourceMap.entries()).map(([sourceId, replicas]) => ({
            sourceId,
            replicaIndexes: Array.from(replicas.values()).sort((left, right) => left - right),
        })),
        quorum: {
            minSources,
            minMatchingSources,
        },
        replicaInventory: {
            sourceCount: availableSources,
            replicaCount: first.replicaCount,
            groupCount: first.groupCount,
            replicasPerGroup: first.replicaCount,
        },
        repair: repairPolicy,
        repairInventory: buildRecoveryRepairInventory(first.groupCount, repairPolicy, repairPackets),
        repairPackets: repairPackets.length ? repairPackets : undefined,
    };
}
export function recoverArchiveFromShards(shards) {
    const verification = verifyRecoveryShards(shards);
    if (!verification.valid) {
        throw new Error(`Invalid recovery shard set: ${verification.errors.join("; ")}`);
    }
    if (!shards.length)
        throw new Error("No recovery shards provided");
    const first = shards[0];
    const grouped = new Map();
    for (const shard of shards) {
        if (shard.parentArchiveId !== first.parentArchiveId)
            throw new Error("Recovery shard parent archive mismatch");
        if (shard.archiveHash !== first.archiveHash)
            throw new Error("Recovery shard archive hash mismatch");
        if (shard.totalBytes !== first.totalBytes)
            throw new Error("Recovery shard total byte mismatch");
        if (shard.groupCount !== first.groupCount)
            throw new Error("Recovery shard group-count mismatch");
        const group = grouped.get(shard.groupIndex) || [];
        group.push(shard);
        grouped.set(shard.groupIndex, group);
    }
    const output = new Uint8Array(first.totalBytes);
    for (let groupIndex = 0; groupIndex < first.groupCount; groupIndex += 1) {
        const group = grouped.get(groupIndex);
        if (!group || group.length < 3)
            throw new Error(`Recovery shard group ${groupIndex} is incomplete`);
        const recovered = recoverShardBytesFromGroup(group, groupIndex);
        output.set(recovered.slice(0, Math.min(recovered.byteLength, first.totalBytes - group[0].byteOffset)), group[0].byteOffset);
    }
    return output;
}
export function verifyRecoveryShards(shards) {
    const errors = [];
    const warnings = [];
    if (!shards.length) {
        return {
            valid: false,
            errors: ["no recovery shards provided"],
            warnings,
            summary: { groupCount: 0, replicaCount: 0, completeGroups: 0 },
        };
    }
    const first = shards[0];
    const grouped = new Map();
    for (const [index, shard] of shards.entries()) {
        if (shard.parentArchiveId !== first.parentArchiveId)
            errors.push(`recovery shard parent archive mismatch at index ${index}`);
        if (shard.archiveHash !== first.archiveHash)
            errors.push(`recovery shard archive hash mismatch at index ${index}`);
        if (shard.totalBytes !== first.totalBytes)
            errors.push(`recovery shard total byte mismatch at index ${index}`);
        if (shard.groupCount !== first.groupCount)
            errors.push(`recovery shard group-count mismatch at index ${index}`);
        if (shard.replicaCount !== first.replicaCount)
            errors.push(`recovery shard replica-count mismatch at index ${index}`);
        const group = grouped.get(shard.groupIndex) || [];
        group.push(shard);
        grouped.set(shard.groupIndex, group);
    }
    let completeGroups = 0;
    for (let groupIndex = 0; groupIndex < first.groupCount; groupIndex += 1) {
        const group = grouped.get(groupIndex) || [];
        if (!group.length) {
            errors.push(`recovery shard group ${groupIndex} is missing`);
            continue;
        }
        const replicaIndexes = new Set();
        const checksumCounts = new Map();
        for (const shard of group) {
            if (replicaIndexes.has(shard.replicaIndex))
                warnings.push(`recovery shard group ${groupIndex} contains duplicate replica index ${shard.replicaIndex}`);
            replicaIndexes.add(shard.replicaIndex);
            const computedChecksum = simpleHash(textDecoder.decode(shard.bytes));
            if (computedChecksum !== shard.checksum) {
                warnings.push(`recovery shard checksum mismatch in group ${groupIndex} replica ${shard.replicaIndex}`);
            }
            checksumCounts.set(computedChecksum, (checksumCounts.get(computedChecksum) || 0) + 1);
        }
        const majority = Array.from(checksumCounts.values()).sort((left, right) => right - left)[0] || 0;
        if (majority < 2) {
            errors.push(`recovery shard group ${groupIndex} has no checksum majority`);
            continue;
        }
        if (group.length < 3) {
            errors.push(`recovery shard group ${groupIndex} has fewer than 3 replicas`);
            continue;
        }
        completeGroups += 1;
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        summary: {
            parentArchiveId: first.parentArchiveId,
            archiveHash: first.archiveHash,
            groupCount: first.groupCount,
            replicaCount: first.replicaCount,
            completeGroups,
        },
    };
}
export function verifyRecoveryManifest(manifest, shards) {
    const errors = [];
    const warnings = [];
    if (!shards.length) {
        return {
            valid: false,
            errors: ["no recovery shards provided"],
            warnings,
            summary: {
                parentArchiveId: manifest.parentArchiveId,
                archiveHash: manifest.archiveHash,
                groupCount: manifest.groupCount,
                availableSources: 0,
                quorumSources: manifest.quorum.minSources,
                quorumMatches: manifest.quorum.minMatchingSources,
                satisfiedGroups: 0,
                repairedGroups: 0,
                degradedGroups: Array.from({ length: manifest.groupCount }, (_, index) => index),
                missingGroups: Array.from({ length: manifest.groupCount }, (_, index) => index),
                recoverability: "unrecoverable",
                policySatisfied: false,
                policyBasis: "none",
                repairConfidence: "none",
                recoveryReadiness: manifest.repairInventory?.readiness.grade || "production-grade",
            },
        };
    }
    const shardVerification = verifyRecoveryShards(shards);
    warnings.push(...shardVerification.warnings);
    const allowedSources = new Set(manifest.sources.map((source) => source.sourceId));
    const grouped = new Map();
    const availableSources = new Set();
    for (const [index, shard] of shards.entries()) {
        if (shard.parentArchiveId !== manifest.parentArchiveId)
            errors.push(`recovery manifest parent archive mismatch at index ${index}`);
        if (shard.archiveHash !== manifest.archiveHash)
            errors.push(`recovery manifest archive hash mismatch at index ${index}`);
        if (shard.totalBytes !== manifest.totalBytes)
            errors.push(`recovery manifest total byte mismatch at index ${index}`);
        if (shard.groupCount !== manifest.groupCount)
            errors.push(`recovery manifest group-count mismatch at index ${index}`);
        if (!allowedSources.has(shard.sourceId))
            errors.push(`recovery shard source is not declared in manifest: ${shard.sourceId}`);
        availableSources.add(shard.sourceId);
        const group = grouped.get(shard.groupIndex) || [];
        group.push(shard);
        grouped.set(shard.groupIndex, group);
    }
    if (availableSources.size < manifest.quorum.minSources) {
        errors.push(`recovery manifest requires at least ${manifest.quorum.minSources} sources, found ${availableSources.size}`);
    }
    if (manifest.repair) {
        if (manifest.repair.kind !== "xor" && manifest.repair.kind !== "parity")
            errors.push(`recovery manifest uses unsupported repair kind ${manifest.repair.kind}`);
        if (manifest.repair.layout !== "batch-xor" && manifest.repair.layout !== "iterative-xor-stripe" && manifest.repair.layout !== "dual-xor-stripe" && manifest.repair.layout !== "weighted-parity-stripe" && manifest.repair.layout !== "vandermonde-parity-stripe") {
            errors.push(`recovery manifest uses unsupported repair layout ${manifest.repair.layout}`);
        }
        if ((manifest.repairPackets?.length || 0) !== manifest.repair.packetCount) {
            errors.push("recovery manifest repair packet count does not match declared policy");
        }
        if (manifest.repairInventory) {
            if (manifest.repairInventory.packetCount !== (manifest.repairPackets?.length || 0)) {
                errors.push("recovery manifest repair inventory packet count does not match repair packets");
            }
            if (manifest.repairInventory.layout !== manifest.repair.layout) {
                errors.push("recovery manifest repair inventory layout does not match repair policy");
            }
            if (manifest.repairInventory.coverageByGroup.length !== manifest.groupCount) {
                errors.push("recovery manifest repair inventory coverage length does not match group count");
            }
        }
        for (const packet of manifest.repairPackets || []) {
            if (packet.parityType !== "xor" && packet.parityType !== "gf257")
                errors.push(`recovery repair packet ${packet.packetIndex} uses unsupported parity ${packet.parityType}`);
            if (packet.packetClass !== "primary" && packet.packetClass !== "diagonal" && packet.packetClass !== "weighted" && packet.packetClass !== "quadratic" && packet.packetClass !== "cubic") {
                errors.push(`recovery repair packet ${packet.packetIndex} uses unsupported packet class ${String(packet.packetClass)}`);
            }
            if (!packet.groupIndexes.length)
                errors.push(`recovery repair packet ${packet.packetIndex} is empty`);
            if (packet.groupIndexes.some((groupIndex) => groupIndex < 0 || groupIndex >= manifest.groupCount)) {
                errors.push(`recovery repair packet ${packet.packetIndex} references out-of-range groups`);
            }
            if (packet.parityType === "gf257" && packet.symbolWidth !== 2) {
                errors.push(`recovery repair packet ${packet.packetIndex} must use 2-byte GF(257) symbols`);
            }
            if (bytesHash(packet.bytes) !== packet.checksum) {
                errors.push(`recovery repair packet ${packet.packetIndex} checksum mismatch`);
            }
        }
    }
    let satisfiedGroups = 0;
    const canonicalGroups = new Map();
    for (let groupIndex = 0; groupIndex < manifest.groupCount; groupIndex += 1) {
        const group = grouped.get(groupIndex) || [];
        if (!group.length) {
            continue;
        }
        const sourceChecksums = new Map();
        for (const shard of group) {
            if (!sourceChecksums.has(shard.sourceId)) {
                sourceChecksums.set(shard.sourceId, bytesHash(shard.bytes));
            }
        }
        const checksumSourceCounts = new Map();
        for (const [sourceId, checksum] of sourceChecksums.entries()) {
            const set = checksumSourceCounts.get(checksum) || new Set();
            set.add(sourceId);
            checksumSourceCounts.set(checksum, set);
        }
        const bestMatch = Array.from(checksumSourceCounts.values()).sort((left, right) => right.size - left.size)[0];
        if (!bestMatch || bestMatch.size < manifest.quorum.minMatchingSources) {
            errors.push(`recovery manifest group ${groupIndex} failed quorum: requires ${manifest.quorum.minMatchingSources} matching sources`);
            continue;
        }
        canonicalGroups.set(groupIndex, recoverShardBytesFromGroup(group, groupIndex));
        satisfiedGroups += 1;
    }
    const repairResult = repairMissingRecoveryGroups(manifest, canonicalGroups);
    warnings.push(...repairResult.warnings);
    errors.push(...repairResult.errors);
    const degradedGroups = [];
    for (let groupIndex = 0; groupIndex < manifest.groupCount; groupIndex += 1) {
        if (!grouped.get(groupIndex)?.length)
            degradedGroups.push(groupIndex);
    }
    const missingGroups = [];
    for (let groupIndex = 0; groupIndex < manifest.groupCount; groupIndex += 1) {
        if (!canonicalGroups.has(groupIndex)) {
            missingGroups.push(groupIndex);
            errors.push(`recovery manifest group ${groupIndex} is missing`);
        }
    }
    const recoverability = classifyRecoveryManifestState(manifest.groupCount, repairResult.repairedGroups, missingGroups);
    const policyResult = isRecoveryPolicySatisfied(manifest, degradedGroups);
    const policySatisfied = policyResult.satisfied;
    const repairConfidence = repairResult.repairedGroups > 0
        ? (policySatisfied ? "guaranteed" : "best-effort")
        : "none";
    const shardStructuralErrors = shardVerification.errors.filter((entry) => !entry.startsWith("recovery shard group "));
    return {
        valid: errors.length === 0 && shardStructuralErrors.length === 0,
        errors: [...shardStructuralErrors, ...errors],
        warnings,
        summary: {
            parentArchiveId: manifest.parentArchiveId,
            archiveHash: manifest.archiveHash,
            groupCount: manifest.groupCount,
            availableSources: availableSources.size,
            quorumSources: manifest.quorum.minSources,
            quorumMatches: manifest.quorum.minMatchingSources,
            satisfiedGroups,
            repairedGroups: repairResult.repairedGroups,
            degradedGroups,
            missingGroups,
            recoverability,
            policySatisfied,
            policyBasis: policyResult.basis,
            repairConfidence,
            recoveryReadiness: manifest.repairInventory?.readiness.grade || "production-grade",
        },
    };
}
export function recoverArchiveFromManifest(manifest, shards) {
    const verification = verifyRecoveryManifest(manifest, shards);
    if (!verification.valid) {
        throw new Error(`Invalid recovery manifest set: ${verification.errors.join("; ")}`);
    }
    const allowedSourceIds = new Set(manifest.sources.map((source) => source.sourceId));
    const grouped = new Map();
    for (const shard of shards) {
        if (!allowedSourceIds.has(shard.sourceId))
            continue;
        const group = grouped.get(shard.groupIndex) || [];
        group.push(shard);
        grouped.set(shard.groupIndex, group);
    }
    const groupBytes = new Map();
    for (let groupIndex = 0; groupIndex < manifest.groupCount; groupIndex += 1) {
        const group = grouped.get(groupIndex) || [];
        if (!group.length)
            continue;
        groupBytes.set(groupIndex, recoverShardBytesFromGroup(group, groupIndex));
    }
    repairMissingRecoveryGroups(manifest, groupBytes);
    const output = new Uint8Array(manifest.totalBytes);
    for (let groupIndex = 0; groupIndex < manifest.groupCount; groupIndex += 1) {
        const bytes = groupBytes.get(groupIndex);
        if (!bytes)
            throw new Error(`Recovery manifest group ${groupIndex} could not be reconstructed`);
        const byteOffset = groupIndex * manifest.shardSize;
        output.set(bytes.slice(0, Math.min(bytes.byteLength, manifest.totalBytes - byteOffset)), byteOffset);
    }
    return output;
}
export function resumeArchiveContinuations(chunks, existingBytes) {
    if (!chunks.length)
        throw new Error("No continuation chunks provided");
    const sorted = [...chunks].sort((left, right) => left.chunkIndex - right.chunkIndex);
    const first = sorted[0];
    const totalBytes = first.totalBytes;
    const parentArchiveId = first.parentArchiveId;
    const output = new Uint8Array(totalBytes);
    let written = 0;
    if (existingBytes?.length) {
        output.set(existingBytes.slice(0, totalBytes), 0);
        written = existingBytes.length;
    }
    for (const chunk of sorted) {
        if (chunk.parentArchiveId !== parentArchiveId)
            throw new Error("Continuation parent archive mismatch");
        if (chunk.totalBytes !== totalBytes)
            throw new Error("Continuation total byte mismatch");
        if (simpleHash(textDecoder.decode(chunk.bytes)) !== chunk.chunkChecksum) {
            throw new Error(`Continuation checksum mismatch at chunk ${chunk.chunkIndex}`);
        }
        if (chunk.byteOffset < written && existingBytes?.length)
            continue;
        output.set(chunk.bytes, chunk.byteOffset);
        written = Math.max(written, chunk.byteOffset + chunk.bytes.byteLength);
    }
    if (written !== totalBytes)
        throw new Error(`Continuation resume incomplete: expected ${totalBytes} bytes, reconstructed ${written}`);
    return output;
}
