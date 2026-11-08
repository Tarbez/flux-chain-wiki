/* Loads world/trip-letters.bin (scripts/bake-trip-letters.mjs, format "TLB1") once and registers each word with world2-text.mjs, so the
   3D lockup words show without textMesh in the browser. A missing file registers nothing (the trip then has no 3D word, never a fake one). */
let once = null;
export function loadTripLetters(textMod, base = location.protocol === 'file:' ? '' : '/') {   /* the same rule as worldPath() in world2-decode.mjs: no leading slash under file:// */
  if (!textMod || !textMod.registerLetters) return Promise.resolve(0);
  return once || (once = fetch(base + 'world/trip-letters.bin').then((r) => { if (!r.ok) throw new Error('no file'); return r.arrayBuffer(); }).then((ab) => {
    const dv = new DataView(ab), u8 = new Uint8Array(ab); let o = 4, n = dv.getUint32(o, true), words = 0; o += 4;
    if (String.fromCharCode(...u8.subarray(0, 4)) !== 'TLB1') throw new Error('not TLB1');
    const take = (C, len) => { const a = new C(ab.slice(o, o + len * C.BYTES_PER_ELEMENT)); o += len * C.BYTES_PER_ELEMENT; return a; };
    while (n--) {
      const nl = u8[o++], word = new TextDecoder().decode(u8.subarray(o, o + nl)); o += nl;
      let k = dv.getUint16(o, true); o += 2; const streams = [];
      while (k--) {
        const nv = dv.getUint32(o, true), ni = dv.getUint32(o + 4, true); o += 8;
        const pos = take(Float32Array, nv * 3), nrm = take(Float32Array, nv * 3), uv = take(Float32Array, nv * 2), idx = take(Uint32Array, ni);
        streams.push({ pos, nrm, uv, idx, draws: [{ material: 0, first: 0, count: ni }], tris: ni / 3, kind: 'text' });
      }
      textMod.registerLetters(word, streams); words++;
    }
    return words;
  }).catch((e) => { if (window.console) console.warn('[world2-letters] ' + e.message); return 0; }));
}
