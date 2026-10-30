/* =====================================================================
   THREE.JS AGAINST FXN-3D: the measured log, written from the raw sweeps.
   ---------------------------------------------------------------------
   Why: the owner asked (2026-10-30) that every number from Three.js against the grammar world (drawn by the
   fxn-3d engine) is logged before Three.js is removed. After the removal the Three.js side cannot be measured
   again, so these sweeps are the only record. The numbers are never typed into the log: this script reads the
   raw world-parity lines in docs/design/world-grammar/parity/*.txt and writes THREE-VS-FXN3D.md from them.

   Usage:   node scripts/world-parity-log.mjs
   Input:   docs/design/world-grammar/parity/<date>-<name>.txt, one world-parity line per route (key=value, space
            separated; see scripts/world-parity.mjs for the fields). Add a new sweep by saving its output there.
   Output:  docs/design/world-grammar/THREE-VS-FXN3D.md (rewritten each run; the .txt files are the evidence and
            are never rewritten).
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'docs/design/world-grammar/parity');
const OUT = path.join(ROOT, 'docs/design/world-grammar/THREE-VS-FXN3D.md');
const MOTION = path.join(ROOT, 'docs/design/world-grammar/motion');

/* one world-parity line -> its fields; values keep their text, numbers are read where a column needs them */
export function parseLine(line) {
  const f = {};
  /* a box starts at a space before `key=`; error texts hold spaces, so a plain space split would cut them */
  for (const box of line.trim().split(/\s+(?=[a-z0-9_]+=)/i)) {
    const i = box.indexOf('=');
    if (i > 0) f[box.slice(0, i)] = box.slice(i + 1);
  }
  return f.route ? f : null;
}

const num = s => (s == null ? NaN : parseFloat(String(s).replace(/ms$|%$/, '')));
const median = a => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); if (!s.length) return NaN; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const errCount = s => (s == null ? 'not measured' : String(s).split(':')[0]);
const errText = s => { const i = String(s || '').indexOf(':'); return i < 0 ? '' : String(s).slice(i + 1).trim(); };
/* a field the sweep did not write is "removed", never 0: since Three.js left the site (2026-10-30) a frozen-mode sweep has no Three.js first frame, frame time or errors, and 0 would say "measured, and nothing". The frozen-mode names three_mad / three_over24 stand for mad / over24. */
const field = (r, ...names) => { for (const n of names) if (r[n] != null && r[n] !== '') return r[n]; return 'removed'; };
const fmt = (x, d = 0) => (Number.isFinite(x) ? x.toFixed(d) : 'not measured');

export function sweepTable(rows) {
  const out = [];
  out.push('| Route | Camera diff | Pixels over 24 | Mean abs diff | Over 24 against frozen grammar picture | First frame Three.js | First frame fxn-3d | Frame Three.js | Frame fxn-3d | Errors Three.js / fxn-3d |');
  out.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    out.push(`| ${r.route} | ${field(r, 'camdiff')} | ${field(r, 'over24', 'three_over24')} | ${field(r, 'mad', 'three_mad')} | ${field(r, 'gram_over24')} | ${field(r, 'first3')} | ${field(r, 'first2')} | ${field(r, 'med3')} | ${field(r, 'med2')} | ${r.err3 == null ? 'removed' : errCount(r.err3)} / ${errCount(r.err2)} |`);
  }
  return out.join('\n');
}

export function sweepSummary(rows) {
  const f3 = median(rows.map(r => num(r.first3))), f2 = median(rows.map(r => num(r.first2)));
  const m3 = median(rows.map(r => num(r.med3))), m2 = median(rows.map(r => num(r.med2)));
  const ov = median(rows.map(r => num(r.over24 != null ? r.over24 : r.three_over24)));
  const camZero = rows.filter(r => num(r.camdiff) === 0).length;
  const errFree = rows.filter(r => num(r.err2) === 0).length;
  return [
    `- Routes: ${rows.length}. Camera diff 0 on ${camZero} of ${rows.length}.`,
    `- Median first frame: Three.js ${Number.isFinite(f3) ? fmt(f3) + ' ms' : 'removed'}, fxn-3d ${fmt(f2)} ms.`,
    `- Median frame time: Three.js ${Number.isFinite(m3) ? fmt(m3) + ' ms' : 'removed'}, fxn-3d ${fmt(m2)} ms.`,
    `- Median share of pixels over 24 (fxn-3d against Three.js): ${Number.isFinite(ov) ? fmt(ov, 2) + '%' : 'removed'}.`,
    `- Routes with 0 page errors on the fxn-3d side: ${errFree} of ${rows.length}.`,
    ...rows.filter(r => num(r.camdiff) !== 0).map(r => `- Camera diff not 0: ${r.route} (${r.camdiff}).`),
    ...rows.filter(r => num(r.err2) !== 0 || (r.err3 != null && num(r.err3) !== 0)).map(r => `- Errors on ${r.route}: Three.js "${r.err3 == null ? 'removed' : errText(r.err3)}"; fxn-3d "${errText(r.err2)}".`),
  ].join('\n');
}

/* one world-motion line (scripts/world-motion.mjs) -> its fields. The two sides are written three:[...] and fxn3d:[...], so each bracket is read as its own set of keys. */
export function parseMotionLine(line) {
  const head = line.match(/^page=(\S+) seg=(\d+) action=(\S+) at=(\S+) three:\[([^\]]*)\] fxn3d:\[([^\]]*)\] flag=(\S+)/);
  if (!head) return null;
  const side = (t) => Object.fromEntries(t.trim().split(/\s+/).map(kv => kv.split('=')));
  return { page: head[1], seg: Number(head[2]), action: head[3], at: head[4], three: side(head[5]), fxn3d: side(head[6]), flag: head[7] };
}

/* the gate (scripts/threejs-gate.mjs): the newest <date>-gate-<n>.txt, its summary and the pages and files that still use Three.js */
export function gateSection(dir) {
  const files = fs.readdirSync(dir).filter(n => /-gate-\d+\.txt$/.test(n)).sort();
  if (!files.length) return ['## Three.js gate', '', 'No gate run saved yet. Run `node scripts/threejs-gate.mjs`.'];
  const name = files[files.length - 1];
  const lines = fs.readFileSync(path.join(dir, name), 'utf8').split('\n').filter(Boolean);
  const out = ['## Three.js gate', '', `Newest run: \`${name}\` (${files.length} run(s) saved). Written by \`scripts/threejs-gate.mjs\`; it exits 1 while anything uses Three.js.`, ''];
  out.push(...lines.filter(l => l.startsWith('gate=')).map(l => `- \`${l}\``));
  const uses = lines.filter(l => l.startsWith('page=') && l.includes('verdict=USES-THREE')).map(l => l.split(' ')[0].slice(5));
  const fileUses = lines.filter(l => l.startsWith('file=') && l.includes('kind=use')).map(l => l.split(' ')[0].slice(5));
  out.push('', `Pages that load Three.js (${uses.length}): ${uses.length ? uses.map(u => '`' + u + '`').join(', ') : 'none'}.`);
  out.push('', `Files that use Three.js (${fileUses.length}): ${fileUses.length ? fileUses.map(u => '`' + u + '`').join(', ') : 'none'}.`);
  return out;
}

/* the motion recordings (scripts/world-motion.mjs): per page, how many segments moved on each side and every flagged segment */
export function motionSection(dir) {
  if (!fs.existsSync(dir)) return ['## Motion, Three.js against fxn-3d', '', 'No motion recording saved yet. Run `node scripts/world-motion.mjs <path>`.'];
  const out = ['## Motion, Three.js against fxn-3d', '',
    'Written by `scripts/world-motion.mjs` from `motion/<date>-<name>/motion.txt`. Real Chrome, 1440x900, video analysed at 12 frames per second; a frame moves when more than 0.2% of its pixels change by more than 12 grey levels. Start and stop are milliseconds from the start of the segment. The video clock starts when the page opens, so a segment edge can be 0.3 s off.', ''];
  for (const run of fs.readdirSync(dir).sort()) {
    const f = path.join(dir, run, 'motion.txt');
    if (!fs.existsSync(f)) continue;
    const rows = fs.readFileSync(f, 'utf8').split('\n').map(parseMotionLine).filter(Boolean);
    const mv = (m) => Number(m.frames) >= 3;
    const flagged = rows.filter(r => r.flag !== 'none');
    out.push(`### ${run}`, '', `Page ${rows[0] ? rows[0].page : '?'}: ${rows.length} segments; moving on Three.js ${rows.filter(r => mv(r.three)).length}, on fxn-3d ${rows.filter(r => mv(r.fxn3d)).length}; flagged ${flagged.length}.`, '');
    if (flagged.length) {
      out.push('| Seg | Action | At (s) | Three.js start/stop/moving ms | fxn-3d start/stop/moving ms | Flag |', '|---|---|---|---|---|---|');
      for (const r of flagged) out.push(`| ${r.seg} | \`${r.action}\` | ${r.at} | ${r.three.start}/${r.three.stop}/${r.three.ms} | ${r.fxn3d.start}/${r.fxn3d.stop}/${r.fxn3d.ms} | ${r.flag} |`);
      out.push('');
    }
  }
  return out;
}

function main() {
  const files = fs.readdirSync(DIR).filter(n => n.endsWith('.txt')).sort();
  const parts = [];
  parts.push('# Three.js against fxn-3d: measured');
  parts.push('');
  parts.push('This file is written by `node scripts/world-parity-log.mjs` from the raw sweeps in `parity/`. Do not edit it by hand. To add a sweep, save the output of `scripts/world-parity.mjs` in `parity/<date>-<name>.txt` and run the script again.');
  parts.push('');
  parts.push('How each sweep was measured:');
  parts.push('- The machine: this Mac (8 GB), loopback to `scripts/serve-site.mjs`.');
  parts.push('- The browser: WebKit in Playwright, with software GL, at 1440x900.');
  parts.push('- Held constant: the same site files and the same machine. Both sides run in the same sweep.');
  parts.push('- Frame time is the median of 40 forced redraws, each ended by gl.finish and a one-pixel readback. It is the draw cost, not the display\'s refresh.');
  parts.push('- First frame is the time from navigation start until the canvas shows.');
  parts.push('- Pixels over 24 is the share of pixels whose largest channel differs by more than 24 of 255.');
  parts.push('- Other jobs on the machine change the speed numbers. Compare the two sides from the same sweep only.');
  parts.push('');
  parts.push('Pictures for each route are in the `parity/png-<date>-<name>/` folder of the same sweep (`<route>-three.png` and `<route>-grammar.png`). After Three.js is removed, these pictures are the only reference.');
  for (const name of files) {
    const rows = fs.readFileSync(path.join(DIR, name), 'utf8').split('\n').map(parseLine).filter(Boolean);
    if (!rows.length) continue;   /* a gate file has no parity rows; it is read by gateSection */
    parts.push('');
    parts.push(`## ${name.replace(/\.txt$/, '')}`);
    parts.push('');
    parts.push(sweepSummary(rows));
    parts.push('');
    parts.push(sweepTable(rows));
  }
  parts.push(''); parts.push(...gateSection(DIR));
  parts.push(''); parts.push(...motionSection(MOTION));
  const notes = path.join(DIR, 'NOTES.md');
  if (fs.existsSync(notes)) { parts.push(''); parts.push(fs.readFileSync(notes, 'utf8').trim()); }
  fs.writeFileSync(OUT, parts.join('\n') + '\n');
  console.log(`wrote ${path.relative(ROOT, OUT)} from ${files.length} sweep(s)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
