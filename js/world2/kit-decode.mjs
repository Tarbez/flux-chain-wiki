/* The Kit's records, read into typed state (docs/design/world-grammar/PORT.md, 2026-10-30 "kit"). world/kit.flx is the Kit's own grammar (scripts/lib/kit-grammar.mjs); this file turns its lines,
   one at a time through the generated reader (kit-reader.mjs), into the plain state the drawing and the pose read. No DOM, no fetch, no absolute import: the encoder's self-check
   (scripts/kit-encode.mjs) loads this same file in Node and checks it against the stage's own source, so what the page decodes is what was proved. No JSON, no library. */
import { readRecord } from './kit-reader.mjs';

/* `m30p5` -> -30.5: the sign is the leading m, the point is p */
export function num(text) {
  const neg = text[0] === 'm', body = neg ? text.slice(1) : text, v = Number(body.replace('p', '.'));
  return neg ? -v : v;
}
const unhex = (h) => { const b = new Uint8Array(h.length / 2); for (let i = 0; i < b.length; i++) b[i] = parseInt(h.substr(i * 2, 2), 16); return new TextDecoder().decode(b); };
const boxes = (line) => { const out = {}; for (const b of readRecord(line)) out[b.label] = b.value; return out; };

export const TINT_SLOTS = ['color', 'emissive', 'ink', 'acc', 'warn'];

export function decodeKit(text) {
  const k = { c: {}, blobs: {}, geo: [], mats: {}, tint: {}, tokens: {}, objects: [], parts: [], rings: [], faces: [], cells: [], knots: {}, views: {}, label: null, sheets: [], lines: 0 };
  for (const raw of text.split('\n')) {
    const line = raw.trim(); if (!line) continue;
    const b = boxes(line); k.lines++;
    switch (b.K) {
      case 'CFG': k.c[b.N] = num(b.V); break;
      case 'BLOB': k.blobs[b.N] = { cid: b.C, bytes: Number(b.A) }; break;
      case 'GEO': k.geo[Number(b.G)] = { offset: Number(b.O), bytes: Number(b.A) }; break;
      case 'MAT': k.mats[b.N] = { draw: Number(b.F), opacity: num(b.V), metal: num(b.W), rough: num(b.U), coat: num(b.T), coatRough: num(b.S), emission: num(b.B), grain: num(b.L), flags: Number(b.J) }; break;
      case 'TINT': { const m = k.tint[b.N] || (k.tint[b.N] = [[], [], [], [], []]); m[Number(b.F)].push({ token: unhex(b.X), w: num(b.V) }); break; }
      case 'TOKEN': k.tokens[unhex(b.X)] = b.N; break;
      case 'OBJ': k.objects[Number(b.I)] = { id: unhex(b.X), parts: [], rings: [] }; break;
      case 'PART': k.objects[Number(b.I)].parts.push({ geo: Number(b.G), mat: b.N, face: Number(b.F) - 1, ring: Number(b.J) - 1, order: Number(b.O), row: Number(b.Q) }); break;
      case 'RING': k.objects[Number(b.I)].rings[Number(b.J)] = { row: Number(b.Q) }; break;
      case 'FACE': k.faces[Number(b.F)] = { w: num(b.V), h: num(b.W), pw: num(b.T), ph: num(b.S), offset: Number(b.O), bytes: Number(b.A) }; break;
      case 'CELL': k.cells[Number(b.I)] = { x: num(b.V), y: num(b.W), z: num(b.U), a: num(b.T), b: num(b.S), pa: num(b.B), pb: num(b.H) }; break;
      case 'KNOT': (k.knots[b.N] || (k.knots[b.N] = [])).push([num(b.V), num(b.W)]); break;
      case 'VIEW': k.views[b.N] = { x: num(b.V), y: num(b.W), z: num(b.U), fitW: num(b.T), fitH: num(b.S), fill: num(b.B), elev: num(b.H), yaw: num(b.D), tilt: num(b.E), back: num(b.P) }; break;
      case 'LABEL': k.label = { dx: num(b.V), dy: num(b.W), dz: num(b.U) }; break;
      case 'SHEET': k.sheets[Number(b.F)] = { geo: Number(b.G), mat: b.N, order: Number(b.O) }; break;
      default: throw new Error('kit.flx holds a record kind this decoder does not read (' + b.K + '). The reader accepted it, so the decoder is behind the grammar: update js/world2/kit-decode.mjs.');
    }
  }
  return k;
}

/* the faces' words, from the words file's bytes: lines of tab-separated words, one call each (`name`, then its arguments). Offsets are bytes: a face's text can hold a non-ASCII character */
export function decodeWords(bytes, face) { return new TextDecoder().decode(bytes.subarray(face.offset, face.offset + face.bytes)).split('\n').filter(Boolean).map((l) => l.split('\t')); }
