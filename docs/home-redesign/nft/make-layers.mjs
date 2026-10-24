/* Writes layers-bundle.js from the layer folders in layers/. Nothing in the bundle is written by hand.

   The folders are the art's layers, back to front:  layers/<NN>-<key>/<Name>#<weight>.<svg|css>
     NN        the layer's place in the DNA (01 first). The key names the layer (backdrop, palette...).
     Name      the element's name, shown on the card page and in the rarity table.
     weight    how often the element is picked, against the other weights in its folder. A weight of
               10 in a folder whose weights sum to 100 is picked for 10 cards in 100.
   An .svg element says how it is built in 3D on its root:  data-build="<builder>" plus data-<param>.
   With data-build="extrude" the SVG's own drawing is the element: every filled cell becomes a block,
   a glass cube or a point (data-as). A part marked data-sketch is only a preview and is not built.
   A .css element is a palette: --a tints the blocks, --b the light, --c the glow and the accents.
   An .svg element with data-slot="<slot>" on its root is CHROME: a flat drawing on the card itself
   (a corner, the frame, a tag, an ornament, the divider, the footer emblem). Its viewBox is the
   slot's box (SLOTS below); layers/README.md says where each slot sits and which colours and record
   fields a drawing may use.

   A layer folder may hold sub-folders (layers/03-aura/sheet-4/Ring#3.svg): they are read as part of
   the layer, so each contributor keeps their own files. Names stay unique across the whole layer.
   Builders other than art3d.js's own live in builders/*.js; this script joins them into
   builders-bundle.js, and refuses an element that names a builder no file registers.

   The owner's review (layers/review.flx, written by review.html in the grammar of review-record.js)
   is read into the bundle as window.DEFXN_REVIEW: held elements and clashing pairs, which traits.js
   keeps out of every new card. A review line that names an element no folder has any more is reported
   and dropped, so a rename never stops the build.

   The bundle is what the card reads (traits.js picks one element per layer; art3d.js builds it).
   The number of different mixes is the product of the folders' element counts. Adding one file to
   any folder raises it. Run from this folder:  node make-layers.mjs
   Run it again after any change in layers/. */
import { readFileSync, readdirSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const LAYERS = join(HERE, 'layers');
const OUT = join(HERE, 'layers-bundle.js');
const BUILDERS = join(HERE, 'builders');
const BUILDERS_OUT = join(HERE, 'builders-bundle.js');

// a drawing as the card needs it: no comments, titles, preview-only parts or spare spaces, and no
// more than two decimals. The file on disk stays as written; only the bundle is squeezed.
// Neighbouring plain dots or plain boxes of the same paint become one filled path: a dot is two
// arcs ("M x-r y a r r 0 1 0 2r 0 a r r 0 1 0 -2r 0"), a box is "M x y h w v h h-w z". Only neighbours are
// joined, so the drawing order never changes; a dot matrix shrinks to about a quarter. Only plain
// shapes are joined (a fill, maybe an opacity; no stroke, transform, id or class); anything else
// stays exactly as written. Measured: every drawing renders the same (see NOTES.md).
function attrsIn(text) { const a = {}; for (const m of text.matchAll(/([a-zA-Z:-]+)="([^"]*)"/g)) a[m[1]] = m[2]; return a; }
const PLAIN = new Set(['fill', 'opacity', 'fill-opacity', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height']);
function shapeOf(tag, body) {
  const a = attrsIn(body), plain = Object.keys(a).every((k) => PLAIN.has(k)) && a.fill && a.fill !== 'none';
  const paint = `${a.fill}|${a.opacity || ''}|${a['fill-opacity'] || ''}`;
  const n = (v) => String(+(+v).toFixed(2));
  if (plain && tag === 'circle' && a.r) { const r = +a.r; return { key: `c|${paint}`, a, piece: `M${n((+a.cx || 0) - r)} ${n(+a.cy || 0)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0` }; }
  if (plain && tag === 'rect' && a.width && a.height) return { key: `r|${paint}`, a, piece: `M${a.x || 0} ${a.y || 0}h${a.width}v${a.height}h-${a.width}z` };
  return null;
}
function joined(g) {
  if (g.pieces.length < 3) return g.raw.join('');
  const op = (g.a.opacity ? ` opacity="${g.a.opacity}"` : ''), fo = g.a['fill-opacity'];
  return `<path d="${g.pieces.join('')}" fill="${g.a.fill}"${op}${fo ? ` fill-opacity="${fo}"` : ''}/>`;
}
function dense(svg) {
  let out = '', g = null, last = 0;
  for (const m of svg.matchAll(/<(circle|rect)\b([^>]*)\/>/g)) {
    const between = svg.slice(last, m.index), sh = shapeOf(m[1], m[2]);
    if (g && (between.trim() || !sh || sh.key !== g.key)) { out += joined(g); g = null; }
    out += between;
    if (sh) { if (!g) g = { key: sh.key, a: sh.a, pieces: [], raw: [] }; g.pieces.push(sh.piece); g.raw.push(m[0]); }
    else out += m[0];
    last = m.index + m[0].length;
  }
  if (g) out += joined(g);
  return out + svg.slice(last);
}
export function squeeze(svg) {
  return dense(svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<title>[\s\S]*?<\/title>/g, '')
    .replace(/<([a-z]+)\b[^>]*\bdata-sketch(="[^"]*")?[^>]*\/>/g, '')
    .replace(/\d+\.\d{3,}/g, (n) => String(+(+n).toFixed(2)))
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim());
}

function fail(file, problem, remedy) {
  throw new Error(`${file}: ${problem}. ${remedy}`);
}

// the chrome slots: each slot's box in card units (the card is 1000 x 700)
export const SLOTS = { corner: [120, 120], frame: [1000, 700], tag: [360, 50], ornament: [360, 80], divider: [360, 24], emblem: [30, 34] };
const FIELDS = ['genesisId', 'identity', 'name', 'status', 'role', 'network', 'joined', 'serial', 'tagline1', 'tagline2', 'dna', 'number', 'mark', 'palette'];

function attrsOf(svg, file) {
  const root = svg.match(/<svg\b([^>]*)>/);
  if (!root) fail(file, 'no <svg> root', 'Save the element as an SVG file.');
  const attrs = {};
  for (const m of root[1].matchAll(/data-([a-z][a-z0-9-]*)="([^"]*)"/g)) attrs[m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = m[2];
  if (attrs.slot) {
    const box = SLOTS[attrs.slot];
    if (!box) fail(file, `data-slot="${attrs.slot}" is not a slot`, `Use one of: ${Object.keys(SLOTS).join(', ')}.`);
    if (!new RegExp(`viewBox="0 0 ${box[0]} ${box[1]}"`).test(root[1])) fail(file, `the viewBox is not "0 0 ${box[0]} ${box[1]}"`, `Draw a ${attrs.slot} on its slot's ${box[0]} x ${box[1]} box.`);
    for (const m of svg.matchAll(/data-field="([^"]*)"/g)) if (!FIELDS.includes(m[1])) fail(file, `data-field="${m[1]}" is not a record field`, `Show only: ${FIELDS.join(', ')}. A card never shows a value the record does not hold.`);
    return attrs;
  }
  if (!/viewBox="0 0 1000 700"/.test(root[1])) fail(file, 'the viewBox is not "0 0 1000 700"', 'Draw the element on the card\'s 1000 x 700 box, so its place on the card is its place in the file.');
  if (!attrs.build) fail(file, 'no data-build or data-slot on the <svg> root', 'Add data-build="extrude" to build the drawing in 3D, a builder name, or data-slot for chrome (see layers/README.md).');
  return attrs;
}

function paletteOf(css, file) {
  const out = {};
  for (const slot of ['a', 'b', 'c']) {
    const m = css.match(new RegExp(`--${slot}\\s*:\\s*([^;]+);`));
    if (!m) fail(file, `no --${slot} colour`, 'A palette gives three HSL channel colours: --a, --b and --c, as "200 80% 60%".');
    out[slot] = m[1].trim();
  }
  return out;
}

export function build() {
  const layers = [];
  for (const folder of readdirSync(LAYERS).sort()) {
    const dir = join(LAYERS, folder);
    if (!statSync(dir).isDirectory()) continue;
    const fm = folder.match(/^(\d\d)-([a-z]+)$/);
    if (!fm) fail(folder, 'the folder name is not <NN>-<key>', 'Name it like "07-glow": two digits for its place, then a lower-case key.');
    const elements = [];
    const files = [];
    for (const f of readdirSync(dir).sort()) {
      if (f.startsWith('.')) continue;
      if (statSync(join(dir, f)).isDirectory()) { for (const g of readdirSync(join(dir, f)).sort()) if (!g.startsWith('.')) files.push(f + '/' + g); }
      else files.push(f);
    }
    for (const file of files) {
      const m = file.split('/').pop().match(/^(.+)#(\d+)\.(svg|css)$/);
      if (!m) fail(`${folder}/${file}`, 'the file name is not <Name>#<weight>.svg or .css', 'Rename it, for example "Ring#9.svg".');
      const [, name, w, ext] = m, weight = Number(w);
      if (!(weight > 0)) fail(`${folder}/${file}`, 'the weight is 0', 'Give it a weight of 1 or more, or move the file out of the folder.');
      const twin = elements.find((e) => e.name.toLowerCase() === name.toLowerCase());
      if (twin) fail(`${folder}/${file}`, `${folder}/${twin.file} already has the name ${twin.name}`, 'Give each element in a layer its own name: rename the newer file.');
      const text = readFileSync(join(dir, file), 'utf8');
      if (ext === 'css') elements.push({ name, weight, file, kind: 'palette', attrs: paletteOf(text, `${folder}/${file}`) });
      else {
        const attrs = attrsOf(text, `${folder}/${file}`);
        const el = { name, weight, file, kind: attrs.slot ? 'chrome' : 'build', attrs };
        if (attrs.slot || attrs.build === 'extrude') el.svg = squeeze(text);   // only a drawing that is drawn needs its body
        elements.push(el);
      }
    }
    if (!elements.length) fail(folder, 'the folder is empty', 'Add at least one element file, or remove the folder.');
    const kinds = new Set(elements.map((e) => e.kind === 'chrome' ? 'chrome:' + e.attrs.slot : e.kind));
    if (kinds.size > 1) fail(folder, `the folder mixes kinds of element (${[...kinds].join(', ')})`, 'Keep palettes, 3D elements and each chrome slot in their own folder.');
    const key = fm[2];
    layers.push({ key, name: key[0].toUpperCase() + key.slice(1), folder, elements });
  }
  if (!layers.length) fail('layers/', 'no layer folders', 'Add a folder such as layers/01-backdrop with one element file in it.');
  return layers;
}

// the builder names art3d.js and builders/*.js register, read from their register('name', ...) calls
export function builderNames() {
  const names = new Map(), sources = [['art3d.js', readFileSync(join(HERE, 'art3d.js'), 'utf8')]];
  for (const f of readdirSync(BUILDERS).sort()) if (f.endsWith('.js')) sources.push(['builders/' + f, readFileSync(join(BUILDERS, f), 'utf8')]);
  for (const [file, text] of sources) for (const m of text.matchAll(/register\(\s*'([^']+)'/g)) {
    if (names.has(m[1])) fail(file, `the builder "${m[1]}" is also registered in ${names.get(m[1])}`, 'Give each builder its own name, starting with your sheet\'s prefix.');
    names.set(m[1], file);
  }
  return { names, sources: sources.slice(1) };
}

// the layer table's version: the first 8 hex of SHA-256 over "folder/name" lines, in DNA order
export function tableVersion(layers) {
  return createHash('sha256').update(layers.map((l) => l.elements.map((e) => l.folder + '/' + e.name).join('\n')).join('\n')).digest('hex').slice(0, 8);
}

// the owner's review, checked against the elements that exist
export function readReview(layers) {
  const file = join(LAYERS, 'review.flx');
  if (!existsSync(file)) return { hold: [], clash: [], dropped: [] };
  createRequire(import.meta.url)('./review-record.js');
  const review = globalThis.DefxnReviewRecord.decode(readFileSync(file, 'utf8'));
  const ids = new Set();
  for (const l of layers) for (const e of l.elements) ids.add(l.key + '/' + e.name);
  const dropped = [];
  const hold = review.hold.filter((id) => ids.has(id) || (dropped.push(id), false));
  const clash = review.clash.filter((p) => (ids.has(p[0]) && ids.has(p[1])) || (dropped.push(p.join(' + ')), false));
  return { hold, clash, dropped };
}

function main() {
  const layers = build();
  const review = readReview(layers);
  const { names, sources } = builderNames();
  for (const l of layers) for (const e of l.elements) {
    if (e.kind === 'build' && !names.has(e.attrs.build)) fail(`${l.folder}/${e.file}`, `data-build="${e.attrs.build}" names no builder`, 'Register it with Art3D.register in a builders/*.js file, or use data-build="extrude".');
  }
  writeFileSync(BUILDERS_OUT, '/* GENERATED by make-layers.mjs: builders/*.js joined in name order. Do not edit by hand. */\n' +
    sources.map(([file, text]) => `/* ---- ${file} ---- */\n${text}\n`).join(''));
  const mixes = layers.reduce((p, l) => p * l.elements.length, 1);
  const count = layers.reduce((s, l) => s + l.elements.length, 0);
  const text = '/* GENERATED by make-layers.mjs from the folders in layers/. Do not edit by hand: change the\n' +
    '   files in layers/ and run `node make-layers.mjs` in this folder. */\n' +
    'window.DEFXN_LAYERS = ' + JSON.stringify(layers) + ';\n' +
    '/* the table version: SHA-256 of every layer and element name in order. A stored DNA names it. */\n' +
    `window.DEFXN_LAYERS_TABLE = '${tableVersion(layers)}';\n` +
    '/* the owner\'s review (layers/review.flx): held elements and clashing pairs, as "layer/Name" */\n' +
    'window.DEFXN_REVIEW = ' + JSON.stringify({ hold: review.hold, clash: review.clash }) + ';\n';
  writeFileSync(OUT, text);
  console.log(`wrote ${OUT}: ${layers.length} layers, ${count} elements, ${mixes.toLocaleString('en-US')} different mixes`);
  console.log(`wrote ${BUILDERS_OUT}: ${sources.length} builder files, ${names.size} builders in all`);
  console.log(`review: ${review.hold.length} held, ${review.clash.length} clashing pairs` + (review.dropped.length ? `; dropped (no such element now): ${review.dropped.join(', ')}` : ''));
  for (const l of layers) console.log(`  ${l.folder.padEnd(14)} ${String(l.elements.length).padStart(2)}  ${l.elements.map((e) => e.name + ' ' + e.weight).join(', ')}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
