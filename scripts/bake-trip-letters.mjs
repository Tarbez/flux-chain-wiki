/* Bakes the 3D lockup words of the cinematic trips into world/trip-letters.bin (binary "TLB1", no JSON), because textMesh needs node:zlib
   and cannot run in a browser. Layer: app (site asset). Reads every js/space/cinematic/<role>.mjs, takes each beat's title.text (and the intro's lockup, wordsOfIntro), builds the
   word with textMesh perLetter (each letter already in its place in the word, so the word's layout survives), over Albert Sans (variable,
   weight 700) from fxn-3d's world/edit store (read only).
   File: "TLB1" | u32 words | per word: u8 nameLen, name bytes (UTF-8), u16 letters | per letter: u32 nv, u32 ni, f32 pos[nv*3], f32 nrm[nv*3],
   f32 uv[nv*2], u32 idx[ni]. Little endian. Read by js/world2/world2-letters.mjs. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), SITE = path.resolve(HERE, '..');
const FX3D = process.env.FXN3D || path.resolve(SITE, '..', 'fxn-3d');
const FONT_CID = 'acf304385d0648fd9377eff186c269f2802a5311d3ae62dca46683b05c9c2b48';   /* Albert Sans, wght 100..900 */

export async function wordsOfRoles(dir) {
  const words = new Set();
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.mjs')).sort()) {
    const role = (await import(pathToFileURL(path.join(dir, f)).href)).default;
    for (const b of role.beats || []) if (b.title && typeof b.title.text === 'string') words.add(b.title.text);
  }
  return [...words];
}

/* the intro's lockup words (js/space/intro.mjs): every title whose text is a copy key, C('KEY', 'default'), takes the manifest's value for
   HOME.LANDING.KEY (js/content/manifests/home.js), the word a visitor sees; the default only when the manifest has none */
export function wordsOfIntro(site) {
  const src = fs.readFileSync(path.join(site, 'js/space/intro.mjs'), 'utf8'), man = fs.readFileSync(path.join(site, 'js/content/manifests/home.js'), 'utf8'), out = [];
  for (const m of src.matchAll(/title:\s*\{\s*text:\s*C\('([A-Z0-9_.]+)',\s*'([^']+)'\)/g)) {
    const at = man.indexOf('"LANDING.' + m[1] + '"'), v = at >= 0 ? /"value":\s*"([^"]*)"/.exec(man.slice(at, at + 400)) : null;
    out.push(v && v[1] ? v[1] : m[2]);
  }
  return out;
}

export function encode(table) {
  const parts = [], u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; }, u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
  const raw = (ta) => Buffer.from(ta.buffer, ta.byteOffset, ta.byteLength);
  parts.push(Buffer.from('TLB1'), u32(table.length));
  for (const [word, streams] of table) {
    const nm = Buffer.from(word, 'utf8');
    parts.push(Buffer.from([nm.length]), nm, u16(streams.length));
    for (const s of streams) parts.push(u32(s.pos.length / 3), u32(s.idx.length), raw(s.pos), raw(s.nrm), raw(s.uv), raw(s.idx));
  }
  return Buffer.concat(parts);
}

async function main() {
  const { textMesh, fontOf } = await import(pathToFileURL(path.join(FX3D, 'scripts/lib/mesh/text.mjs')).href);
  const font = fontOf(fs.readFileSync(path.join(FX3D, 'world/edit', FONT_CID + '.font')), FONT_CID);
  const words = [...new Set((await wordsOfRoles(path.join(SITE, 'js/space/cinematic'))).concat(wordsOfIntro(SITE)))];
  const table = [], letters = new Set();
  for (const w of words) {
    const t = textMesh(font, w, { size: 1, depth: .22, bevel: .12, tracking: .04, weight: 700, perLetter: true });
    table.push([w, t.streams]); for (const c of t.chars) letters.add(c);
  }
  const out = path.join(SITE, 'world/trip-letters.bin'), buf = encode(table);
  fs.writeFileSync(out, buf);
  console.log('words ' + words.join(' ') + '; unique letters ' + [...letters].sort().join('') + '; ' + buf.length + ' bytes -> ' + out);
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e.message); process.exit(1); });
