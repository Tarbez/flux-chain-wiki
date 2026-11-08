#!/usr/bin/env node
/* The fxn-3d seam gate (audit 2026-11-08, finding 12): js/world2/world2-gl.mjs is the ONLY file under js/ that imports from /fxn-3d/,
   so an engine path changes in one place. This walks every .js and .mjs file under js/ (no hand list: it finds its subjects), finds each
   static import, export-from and dynamic import() whose path starts with /fxn-3d/, and fails naming every other file that has one.
   Exit 0: one seam. Exit 1: a file bypasses the seam (move its names to a re-export in world2-gl.mjs). */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SEAM = 'js/world2/world2-gl.mjs';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
/* `from '/fxn-3d/`, `import '/fxn-3d/` and `import('/fxn-3d/`, with any quote */
const IMPORT = /(?:\bfrom|\bimport)\s*\(?\s*['"`]\/fxn-3d\//g;

export function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.m?js$/.test(e.name)) yield p;
  }
}

export function scan(root = ROOT) {
  const hits = [];
  let files = 0;
  for (const p of walk(join(root, 'js'))) {
    files++;
    const text = readFileSync(p, 'utf8'), rel = relative(root, p).split('\\').join('/');
    const n = (text.match(IMPORT) || []).length;
    if (n) hits.push({ file: rel, imports: n });
  }
  return { files, hits };
}

function main() {
  const { files, hits } = scan();
  const bad = hits.filter((h) => h.file !== SEAM);
  if (!hits.some((h) => h.file === SEAM)) console.log('note: ' + SEAM + ' imports nothing from /fxn-3d/ (the seam is unused)');
  if (bad.length) {
    for (const h of bad) console.error('seam broken: ' + h.file + ' imports /fxn-3d/ ' + h.imports + ' time(s); import those names from ' + SEAM + ' instead');
    process.exit(1);
  }
  console.log('fxn-3d seam: ' + files + ' files under js/ walked, only ' + SEAM + ' imports /fxn-3d/');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
