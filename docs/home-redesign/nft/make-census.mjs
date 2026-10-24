/* Writes layers/census.flx: what every 3D element builds, counted in a browser. Run from this folder:
     node make-census.mjs [seeds]        (default 4 seeds)
   then node make-layers.mjs, which reads the census into both bundles.

   Why a table: a site derives a worn card's grid look from these counts (docs/home-redesign/GRID-LOOK.md).
   Counting at runtime took 36 to 229 ms of a page's main thread per card, so it is measured once here.
   Each element is built alone, over several seeded card keys, and the counts are averaged, so the census
   describes the element and not one card. Each record carries the hash of what built it (its builder file
   and its own settings); make-layers.mjs drops a record whose hash no longer matches, and says so.
   Needs Playwright and Google Chrome (the same as every screenshot check in this folder). */
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, extname, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build, builderNames, sourceHash } from './make-layers.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, '..', '..', '..');
const OUT = join(HERE, 'layers', 'census.flx');
const ART = ['backdrop', 'aura', 'mark', 'signal', 'particles'];
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };

function serve() {
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    const file = join(SITE, path);
    if (!file.startsWith(SITE) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

async function main() {
  const seeds = Math.max(1, parseInt(process.argv[2], 10) || 4);
  const layers = build(), { names } = builderNames();
  const want = [];
  for (const l of layers) if (ART.includes(l.key)) for (const e of l.elements) want.push({ layer: l.key, name: e.name, hash: sourceHash(e, names) });
  const server = await serve(), port = server.address().port;
  const { chromium } = createRequire(join(SITE, 'package.json'))('playwright');
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/docs/home-redesign/nft/engine-demo.html`, { waitUntil: 'load' });
  const t0 = Date.now();
  const counted = await page.evaluate(async ({ want, seeds }) => {
    const T = window.DEFXN_TRAITS, A = window.Art3D, mark = await A.loadMark(), out = [];
    const palette = T.LAYERS.find((l) => l.key === 'palette').elements[0];
    for (const w of want) {
      const el = T.LAYERS.find((l) => l.key === w.layer).elements.find((e) => e.name === w.name);
      const sum = { cubes: 0, glass: 0, pts: 0, thin: 0 };
      for (let s = 0; s < seeds; s++) {
        const picks = { palette }; picks[w.layer] = el;
        const m = await A.build(mark, T.keyOfString('census|' + s), picks);
        sum.cubes += m.cubes.length; sum.glass += m.glasses.length + m.spheres.length; sum.pts += m.points.length;
        sum.thin += m.lines.length + m.quads.length + m.bars.length;
      }
      out.push({ layer: w.layer, name: w.name, hash: w.hash, seeds, cubes: Math.round(sum.cubes / seeds), glass: Math.round(sum.glass / seeds), pts: Math.round(sum.pts / seeds), thin: Math.round(sum.thin / seeds) });
    }
    return out;
  }, { want, seeds });
  await browser.close(); server.close();
  if (errors.length) throw new Error('The census page reported errors, so no census was written: ' + errors.slice(0, 3).join(' / '));
  createRequire(import.meta.url)('./census-record.js');
  writeFileSync(OUT, globalThis.DefxnCensusRecord.encode(counted));
  const by = {};
  counted.forEach((r) => { (by[r.layer] = by[r.layer] || []).push(r); });
  console.log(`wrote ${OUT}: ${counted.length} elements, ${seeds} seeds each, in ${Math.round((Date.now() - t0) / 1000)} s`);
  for (const k of ART) {
    const rows = by[k] || [], tot = (r) => r.cubes + r.glass + r.pts + r.thin, empty = rows.filter((r) => !tot(r)).length;
    console.log(`  ${k.padEnd(10)} ${String(rows.length).padStart(3)} elements, ${empty} build nothing, largest ${Math.max(...rows.map(tot))} parts`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e.message); process.exit(1); });
