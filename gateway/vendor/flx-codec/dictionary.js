export const FLX_ARCHIVE_MAGIC = "FLX2";
export const FLX_ARCHIVE_FORMAT = "flx-archive";
export const FLX_ARCHIVE_MAJOR_VERSION = 2;
export const FLX_ARCHIVE_MINOR_VERSION = 2;
export const FLX_DEFAULT_CONTENT_TYPES = [
    "text/html",
    "text/css",
    "application/javascript",
    "application/json",
    "image/svg+xml",
    "font/woff2",
];
export const FLX_CANONICAL_KEYS = [
    "path",
    "entry",
    "routes",
    "files",
    "contentType",
    "size",
    "payload",
    "hash",
    "scope",
    "guards",
    "restorePaths",
    "title",
    "description",
    "routeId",
    "stateId",
    "layout",
    "schema",
    "rootPath",
    "snapshotVersion",
    "generatedBy",
    "sourceFormat",
    "rawByteLength",
    "compressedByteLength",
    "parentArchiveId",
    "operations",
    "op",
    "blockId",
    "blockType",
    "deltaKind",
    "chunkIndex",
    "chunkCount",
    "byteOffset",
    "totalBytes",
    "resumeToken",
    "chunkChecksum",
    "dependencyGraph",
    "route",
    "relation",
    "phase",
    "required",
    "receivedBlocks",
    "receiptState",
];
function pushUnique(values, value) {
    if (!value)
        return;
    if (!values.includes(value))
        values.push(value);
}
function pushManyUnique(values, source) {
    for (const entry of source)
        pushUnique(values, entry);
}
function splitPathLike(value) {
    return value
        .split("/")
        .map((segment) => segment.trim())
        .filter(Boolean);
}
function collectPayloadStrings(value, strings, keys) {
    if (typeof value === "string") {
        pushUnique(strings, value);
        return;
    }
    if (typeof value === "number" || typeof value === "boolean" || value == null)
        return;
    if (Array.isArray(value)) {
        for (const item of value)
            collectPayloadStrings(item, strings, keys);
        return;
    }
    if (typeof value === "object") {
        for (const [key, entry] of Object.entries(value)) {
            pushUnique(keys, key);
            collectPayloadStrings(entry, strings, keys);
        }
    }
}
export function createFlxDictionaryState(dictionary) {
    const normalized = {
        strings: [...(dictionary?.strings || [])],
        paths: [...(dictionary?.paths || [])],
        contentTypes: [...(dictionary?.contentTypes || [])],
        routeIds: [...(dictionary?.routeIds || [])],
        stateScopes: [...(dictionary?.stateScopes || [])],
        routeTokens: [...(dictionary?.routeTokens || [])],
        keys: [...(dictionary?.keys || [])],
    };
    return {
        dictionary: normalized,
        stringIndex: new Map(normalized.strings.map((value, index) => [value, index])),
        pathIndex: new Map(normalized.paths.map((value, index) => [value, index])),
        contentTypeIndex: new Map(normalized.contentTypes.map((value, index) => [value, index])),
        routeIdIndex: new Map(normalized.routeIds.map((value, index) => [value, index])),
        stateScopeIndex: new Map(normalized.stateScopes.map((value, index) => [value, index])),
        routeIndex: new Map(normalized.routeTokens.map((value, index) => [value, index])),
        keyIndex: new Map(normalized.keys.map((value, index) => [value, index])),
    };
}
export function mergeFlxArchiveDictionaries(dictionaries) {
    const merged = createFlxDictionaryState();
    const append = (values, index, value) => {
        if (!value || index.has(value))
            return;
        index.set(value, values.length);
        values.push(value);
    };
    for (const dictionary of dictionaries) {
        if (!dictionary)
            continue;
        for (const value of dictionary.strings || [])
            append(merged.dictionary.strings, merged.stringIndex, value);
        for (const value of dictionary.paths || [])
            append(merged.dictionary.paths, merged.pathIndex, value);
        for (const value of dictionary.contentTypes || [])
            append(merged.dictionary.contentTypes, merged.contentTypeIndex, value);
        for (const value of dictionary.routeIds || [])
            append(merged.dictionary.routeIds, merged.routeIdIndex, value);
        for (const value of dictionary.stateScopes || [])
            append(merged.dictionary.stateScopes, merged.stateScopeIndex, value);
        for (const value of dictionary.routeTokens || [])
            append(merged.dictionary.routeTokens, merged.routeIndex, value);
        for (const value of dictionary.keys || [])
            append(merged.dictionary.keys, merged.keyIndex, value);
    }
    return merged.dictionary;
}
export function buildFlxArchiveDictionary(input) {
    const baseDictionary = mergeFlxArchiveDictionaries([
        {
            contentTypes: [...FLX_DEFAULT_CONTENT_TYPES],
            keys: [...FLX_CANONICAL_KEYS],
        },
        input.baseDictionary || null,
    ]);
    const strings = [...baseDictionary.strings];
    const paths = [...baseDictionary.paths];
    const contentTypes = [...baseDictionary.contentTypes];
    const routeIds = [...baseDictionary.routeIds];
    const stateScopes = [...baseDictionary.stateScopes];
    const routeTokens = [...baseDictionary.routeTokens];
    const keys = [...baseDictionary.keys];
    pushManyUnique(paths, splitPathLike(input.entry));
    pushManyUnique(strings, [input.generatedBy, input.sourceFormat]);
    for (const route of input.routes || []) {
        pushUnique(routeIds, route.routeId);
        pushManyUnique(strings, [route.title, route.description, route.layout]);
        pushManyUnique(strings, route.guards || []);
        pushManyUnique(paths, splitPathLike(route.path));
        pushManyUnique(routeTokens, splitPathLike(route.path));
        for (const dependency of route.dependencyGraph || []) {
            pushManyUnique(routeTokens, splitPathLike(dependency.route));
            pushManyUnique(strings, [dependency.relation, dependency.phase]);
        }
        for (const restorePath of route.restorePaths || []) {
            pushManyUnique(paths, splitPathLike(restorePath));
            pushManyUnique(routeTokens, splitPathLike(restorePath));
        }
        collectPayloadStrings(route.payload, strings, keys);
    }
    for (const asset of input.assets || []) {
        pushManyUnique(paths, splitPathLike(asset.path));
        pushUnique(contentTypes, asset.contentType);
        pushUnique(strings, asset.hash);
        collectPayloadStrings(asset.payload, strings, keys);
    }
    for (const state of input.states || []) {
        pushUnique(stateScopes, state.scope);
        pushManyUnique(strings, [state.stateId, state.schema, state.rootPath]);
        if (state.rootPath)
            pushManyUnique(paths, splitPathLike(state.rootPath));
        collectPayloadStrings(state.payload, strings, keys);
    }
    if (input.delta) {
        pushManyUnique(strings, [input.delta.parentArchiveId, input.delta.baseIntegrity, input.delta.deltaKind]);
        collectPayloadStrings(input.delta.operations, strings, keys);
    }
    if (input.continuation) {
        pushManyUnique(strings, [
            input.continuation.parentArchiveId,
            input.continuation.resumeToken,
            input.continuation.chunkChecksum,
            input.continuation.receiptState,
        ]);
        pushManyUnique(strings, input.continuation.receivedBlocks || []);
    }
    return createFlxDictionaryState({ strings, paths, contentTypes, routeIds, stateScopes, routeTokens, keys });
}
export function internString(state, value) {
    const index = state.stringIndex.get(value);
    if (index === undefined)
        return value;
    return { kind: "string", index };
}
export function internContentType(state, value) {
    const index = state.contentTypeIndex.get(value);
    if (index === undefined)
        return value;
    return { kind: "contentType", index };
}
export function internRouteId(state, value) {
    const index = state.routeIdIndex.get(value);
    if (index === undefined)
        return value;
    return { kind: "routeId", index };
}
export function internStateScope(state, value) {
    const index = state.stateScopeIndex.get(value);
    if (index === undefined)
        return value;
    return { kind: "stateScope", index };
}
export function internKey(state, value) {
    const index = state.keyIndex.get(value);
    if (index === undefined)
        return value;
    return { kind: "key", index };
}
function encodeSegments(value, index) {
    return splitPathLike(value).map((segment) => {
        const token = index.get(segment);
        if (token === undefined)
            return { kind: "literal", value: segment };
        return { kind: "token", index: token };
    });
}
function decodeSegments(segments, values) {
    return segments
        .map((segment) => (segment.kind === "token" ? values[segment.index] || "" : segment.value))
        .filter(Boolean)
        .join("/");
}
export function encodePath(value, state) {
    return { kind: "path", segments: encodeSegments(value, state.pathIndex) };
}
export function decodePath(value, dictionary) {
    return decodeSegments(value.segments, dictionary.paths);
}
export function encodeRoutePath(value, state) {
    return { kind: "route", segments: encodeSegments(value, state.routeIndex) };
}
export function decodeRoutePath(value, dictionary) {
    const restored = decodeSegments(value.segments, dictionary.routeTokens);
    return restored ? `/${restored.replace(/^\/+/, "")}` : "/";
}
function normalizeStringRef(value) {
    return value;
}
function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
export function encodeStructuredValue(value, state, hint = "string") {
    if (value === undefined)
        return null;
    if (typeof value === "string") {
        if (hint === "path")
            return encodePath(value, state);
        if (hint === "route")
            return encodeRoutePath(value, state);
        if (hint === "contentType")
            return internContentType(state, value);
        if (hint === "routeId")
            return internRouteId(state, value);
        if (hint === "stateScope")
            return internStateScope(state, value);
        return internString(state, value);
    }
    if (typeof value === "number" || typeof value === "boolean" || value == null)
        return value;
    if (Array.isArray(value)) {
        return {
            kind: "array",
            items: value.map((item) => encodeStructuredValue(item, state, hint)),
        };
    }
    if (!isPlainObject(value))
        return internString(state, normalizeStringRef(String(value)));
    return {
        kind: "object",
        entries: Object.entries(value).map(([key, entry]) => {
            let nextHint = "string";
            if (key === "path" || key === "entry" || key === "rootPath" || key === "asset")
                nextHint = "path";
            else if (key === "contentType")
                nextHint = "contentType";
            else if (key === "restorePaths" || key === "dependsOn" || key === "prefetch" || key === "route")
                nextHint = "route";
            else if (key === "routeId")
                nextHint = "routeId";
            else if (key === "scope")
                nextHint = "stateScope";
            return [internKey(state, key), encodeStructuredValue(entry, state, nextHint)];
        }),
    };
}
export function decodeStructuredValue(value, dictionary) {
    if (value == null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean")
        return value;
    if (value.kind === "string")
        return dictionary.strings[value.index] || "";
    if (value.kind === "contentType")
        return dictionary.contentTypes[value.index] || "";
    if (value.kind === "routeId")
        return dictionary.routeIds[value.index] || "";
    if (value.kind === "stateScope")
        return dictionary.stateScopes[value.index] || "";
    if (value.kind === "path")
        return decodePath(value, dictionary);
    if (value.kind === "route")
        return decodeRoutePath(value, dictionary);
    if (value.kind === "array")
        return value.items.map((item) => decodeStructuredValue(item, dictionary));
    const objectValue = {};
    for (const [key, entry] of value.entries) {
        const decodedKey = typeof key === "string" ? key : dictionary.keys[key.index] || "";
        objectValue[decodedKey] = decodeStructuredValue(entry, dictionary);
    }
    return objectValue;
}
