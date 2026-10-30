/* The browser files the site takes from the 3D engine (the sibling repo flux/fxn-3d), derived, never listed: the
   renderer's modules (js/render/*.mjs) and the animation sampler (scripts/lib/anim-sample.mjs), followed through
   every relative import. serve-site.mjs mounts exactly these under /fxn-3d/ and pack-fxn-site.mjs ships exactly these,
   so a module the renderer gains (2026-10-30: engine/formats/mesh.mjs, the one MESH reader) is served and shipped
   without a second list. Names only: nothing here does work on import. */
import fs from 'node:fs';
import path from 'node:path';

export const engineDir = (root) => path.resolve(process.env.FXN_3D_DIR || path.join(root, '..', 'fxn-3d'));

/* the set of paths relative to the engine folder, with / separators; throws, naming the file, when an entry or an
   import is missing, because the world cannot load without it */
export function engineBrowserFiles(engine) {
  const render = path.join(engine, 'js', 'render');
  if (!fs.existsSync(render)) throw new Error(`the 3D renderer is missing at ${render}: clone flux/fxn-3d next to defxn, or set FXN_3D_DIR; the ?world=2 world cannot load without it`);
  const todo = [...fs.readdirSync(render).filter((f) => f.endsWith('.mjs')).map((f) => 'js/render/' + f), 'scripts/lib/anim-sample.mjs'], seen = new Set();
  while (todo.length) {
    const rel = todo.pop(); if (seen.has(rel)) continue;
    const file = path.join(engine, rel);
    if (!fs.existsSync(file)) throw new Error(`the engine file ${rel} is missing at ${file}; the world imports it`);
    seen.add(rel);
    const src = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');   /* an import named in a comment is not an import */
    for (const m of src.matchAll(/(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+\.m?js)['"]/g)) todo.push(path.posix.normalize(path.posix.join(path.posix.dirname(rel), m[1])));
  }
  return seen;
}
