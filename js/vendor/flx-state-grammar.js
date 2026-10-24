// ARK's structured-state grammar: how ARK stores nested state (identity, trust store,
// permissions, vault, chat and notification logs, caches, tab library...) as FLX records.
//
// FLX is defined by its grammar, for its resolver. This is the grammar of ARK's local state
// resolver -- not the network registry -- so nothing in it is reserved by anyone else. It is
// read the way flux-grammar-atlas reads any own grammar: split a record on "-", give each
// box the LONGEST label it starts with, check the value against that label's payload rule.
//
// The records are DERIVED from the value's own shape rather than authored per store: a
// document becomes one record per leaf, the leaf's path written as boxes, then one typed
// value box. So 25 different stores need no 25 hand-written grammars, and a field added to
// any of them needs no grammar change.
//
//   path boxes   K<hex key>   object key (hex of UTF-8; may be empty: the key "")
//                I<digits>    array index
//   value box    S<hex>       string (hex of UTF-8; may be empty)
//                N<hex>       number, as the hex of its shortest round-trip text
//                B0 / B1      boolean
//                Z0           null
//                O0 / A0      empty object / empty array (a leaf with no children)
//
// Free text is hex because "-" is the only delimiter and must never occur in a value --
// the registry's own convention for arbitrary strings.
//
// EXACT round trip is a hard requirement, not a nicety: several of these documents are
// signed, and signatures/CIDs are computed over their JSON serialization (AGENTS.md,
// "JSON is the hashing form"). Records are written in the value's own key order and read
// back in file order, so the rebuilt value re-serializes byte-identically. Encoding mirrors
// JSON.stringify's value semantics exactly (toJSON, dropped undefined/functions/symbols in
// objects, null for them in arrays, null for non-finite numbers), which is what keeps that
// equality true for every input, not just the tidy ones.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory()
  } else {
    root.ARK_FLX_STATE = factory()
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const LABELS = [
    { label: 'K', name: 'object key', payload: 'hex-or-empty' },
    { label: 'I', name: 'array index', payload: 'digits' },
    { label: 'S', name: 'string', payload: 'hex-or-empty' },
    { label: 'N', name: 'number', payload: 'lowercase-hex' },
    { label: 'B', name: 'boolean', payload: 'closed-set', values: ['0', '1'] },
    { label: 'Z', name: 'null', payload: 'closed-set', values: ['0'] },
    { label: 'O', name: 'empty object', payload: 'closed-set', values: ['0'] },
    { label: 'A', name: 'empty array', payload: 'closed-set', values: ['0'] }
  ]

  const RULES = {
    'hex-or-empty': (v) => /^(?:[0-9a-f]{2})*$/.test(v),
    'lowercase-hex': (v) => /^(?:[0-9a-f]{2})+$/.test(v),
    digits: (v) => /^(?:0|[1-9][0-9]*)$/.test(v),
    'closed-set': (v, l) => l.values.includes(v)
  }

  const BY_LENGTH = LABELS.slice().sort((a, b) => b.label.length - a.label.length)
  const PATH_LABELS = new Set(['K', 'I'])

  function readBox(box) {
    const label = BY_LENGTH.find((l) => box.startsWith(l.label))
    if (!label) throw new Error(`no label in the ARK state grammar starts "${box}"`)
    const value = box.slice(label.label.length)
    if (!RULES[label.payload](value, label)) throw new Error(`${label.label}: "${value}" is not a valid ${label.name}`)
    return { label: label.label, value }
  }

  // UTF-8 <-> hex without Buffer, so the same file runs in the renderer.
  //
  // Exact, not lenient (2026-10-21 review, M1): a string JSON.stringify keeps must come back unchanged
  // or be refused, never silently altered. TextEncoder turns a lone surrogate into U+FFFD, so such a
  // string is refused here by name (UTF-8 cannot hold it). TextDecoder's default drops a leading BOM
  // and replaces invalid bytes, so it runs with ignoreBOM (keep U+FEFF) and fatal (refuse bad bytes).
  const WELL_FORMED = (text) => (typeof text.isWellFormed === 'function' ? text.isWellFormed() : !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(text))
  function toHex(text) {
    text = String(text)
    if (!WELL_FORMED(text)) throw new TypeError('a string with a lone surrogate cannot be stored: UTF-8 cannot hold it (JSON.stringify would write it as a \\u escape)')
    const bytes = new TextEncoder().encode(text)
    let out = ''
    for (const byte of bytes) out += byte.toString(16).padStart(2, '0')
    return out
  }

  function fromHex(hex) {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
    try {
      return new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }).decode(bytes)
    } catch {
      throw new Error(`"${hex.slice(0, 32)}" is not the hex of UTF-8 text`)
    }
  }

  // JSON.stringify's view of a value, so storage keeps exactly what JSON would have kept.
  function normalize(value, key, holder) {
    if (value !== null && typeof value === 'object' && typeof value.toJSON === 'function') value = value.toJSON(key)
    void holder
    return value
  }

  function encodeValue(value, records, path) {
    if (value === null) { records.push(path.concat('Z0').join('-')); return }
    switch (typeof value) {
      case 'string': records.push(path.concat('S' + toHex(value)).join('-')); return
      case 'number':
        records.push(path.concat(Number.isFinite(value) ? 'N' + toHex(String(value)) : 'Z0').join('-'))
        return
      case 'boolean': records.push(path.concat(value ? 'B1' : 'B0').join('-')); return
      case 'bigint': throw new TypeError('BigInt cannot be stored (JSON could not store it either)')
      default: break
    }

    if (Array.isArray(value)) {
      if (!value.length) { records.push(path.concat('A0').join('-')); return }
      // By index, not forEach: forEach skips holes, and JSON.stringify writes a hole as null.
      for (let index = 0; index < value.length; index++) {
        const v = normalize(value[index], String(index), value)
        const storable = v !== undefined && typeof v !== 'function' && typeof v !== 'symbol'
        encodeValue(storable ? v : null, records, path.concat('I' + index))
      }
      return
    }

    // Object: own enumerable string keys, in insertion order -- JSON.stringify's order.
    const keys = Object.keys(value).filter((k) => {
      const v = normalize(value[k], k, value)
      return v !== undefined && typeof v !== 'function' && typeof v !== 'symbol'
    })
    if (!keys.length) { records.push(path.concat('O0').join('-')); return }
    for (const k of keys) encodeValue(normalize(value[k], k, value), records, path.concat('K' + toHex(k)))
  }

  // Value -> document text (one record per line). Returns "" for an undefined top level,
  // as JSON.stringify returns undefined there.
  function encodeState(value) {
    const top = normalize(value, '', { '': value })
    if (top === undefined || typeof top === 'function' || typeof top === 'symbol') return ''
    const records = []
    encodeValue(top, records, [])
    return records.join('\n') + '\n'
  }

  function leafValue({ label, value }) {
    switch (label) {
      case 'S': return fromHex(value)
      case 'N': return Number(fromHex(value))
      case 'B': return value === '1'
      case 'Z': return null
      case 'O': return {}
      case 'A': return []
      default: throw new Error(`a record must end in a value box, not ${label}`)
    }
  }

  // Own-property assignment. Plain `obj[key] = v` with key "__proto__" would set the
  // prototype instead of storing a property -- JSON.parse stores it as an own property, so
  // this must too, or a crafted document could change an object's prototype.
  function setOwn(holder, key, value) {
    if (key === '__proto__') Object.defineProperty(holder, key, { value, writable: true, enumerable: true, configurable: true })
    else holder[key] = value
  }

  // Document text -> value. Throws on any record the grammar cannot read: a damaged file is
  // reported, never half-loaded.
  //
  // And on any body encodeState could not have written (2026-10-22 review, row 18): a duplicate path
  // (the later record silently won), a leaf and a container at one path, a root leaf after records,
  // sparse or out-of-order array indices (I5 alone read as five nulls and "a"), number text that is
  // not the shortest round-trip form ("0x10" read as 16, "abc" as null, " 7 " as 7), an empty line.
  // One structural rule covers them all, with no list of cases to keep complete: the value read back
  // must encode to exactly the records it was read from, in the same order.
  function decodeState(text) {
    const lines = String(text).split('\n')
    if (lines[lines.length - 1] === '') lines.pop()
    if (!lines.length) return undefined
    const empty = lines.indexOf('')
    if (empty !== -1) throw new Error(`record ${empty + 1} is an empty line (encodeState never writes one)`)
    const rootBox = {}
    for (const line of lines) {
      const boxes = line.split('-').map(readBox)
      const leaf = boxes.pop()
      if (boxes.some((b) => !PATH_LABELS.has(b.label))) throw new Error(`record "${line}" has a value box before its end`)
      if (!boxes.length) { rootBox.v = leafValue(leaf); continue }

      // Walk/create containers along the path; the next box decides object vs array.
      let holder = rootBox
      let key = 'v'
      for (let i = 0; i < boxes.length; i++) {
        const box = boxes[i]
        if (!Object.prototype.hasOwnProperty.call(holder, key)) setOwn(holder, key, box.label === 'I' ? [] : {})
        const container = holder[key]
        if (box.label === 'I' ? !Array.isArray(container) : (Array.isArray(container) || typeof container !== 'object' || container === null)) {
          throw new Error(`record "${line}" disagrees with an earlier record about the shape at box ${i + 1}`)
        }
        holder = container
        key = box.label === 'I' ? Number(box.value) : fromHex(box.value)
      }
      setOwn(holder, key, leafValue(leaf))
    }
    const value = rootBox.v
    // The canonical check. encodeState refuses nothing decodeState can build (no lone surrogate
    // survives fromHex, no BigInt is built), so any difference is the body's, never the encoder's.
    const again = encodeState(value).split('\n')
    again.pop()
    const at = lines.findIndex((line, i) => line !== again[i])
    if (at !== -1 || again.length !== lines.length) {
      const where = at === -1 ? lines.length : at
      throw new Error(`record ${where + 1} ("${String(lines[where] ?? '').slice(0, 48)}") is not what encodeState writes for the value these records describe (a duplicate or conflicting path, a sparse or out-of-order index, or non-canonical number text)`)
    }
    return value
  }

  return { LABELS, readBox, encodeState, decodeState }
})
