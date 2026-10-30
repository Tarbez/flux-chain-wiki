/* =====================================================================
   UNUSED WORLD FILES: one local page with a card for every file in world/ that nothing loads any more.
   ---------------------------------------------------------------------
   Why: each run of the encoders (scripts/world-encode.mjs, kit-encode.mjs, world-encode-card.mjs) writes files
   named by their content id. A changed view gets new ids, and the old files stay in world/. The owner asked
   (2026-10-30) to see them before deciding to delete them.
   What counts as used is derived, never listed: start at world.flx, kit.flx and card.flx, follow every 64-hex id
   named in a .flx or .txt file, and keep what is reached. Everything else is unused.
   Each card says what the file is (from its own text), which view it belongs to, which file named it, and the
   file that holds that view now.

   Usage:   node scripts/world-unused-page.mjs
   Output:  docs/design/world-grammar/unused-world.html. Open it through the site server, so it can read the
            files: http://127.0.0.1:3438/docs/design/world-grammar/unused-world.html
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = path.join(ROOT, 'world');
const OUT = path.join(ROOT, 'docs/design/world-grammar/unused-world.html');
const HEX = /[0-9a-f]{64}/g;
const ROOTS = ['world.flx', 'kit.flx', 'card.flx'];
const SHOTS = path.join(ROOT, 'docs/design/world-grammar/unused-shots');
const SITE = process.env.SITE || 'http://127.0.0.1:3438';

/* one browser, one page at a time (each page holds one WebGL context): the old group through ?wswap, then the view now */
async function shoot(list) {
  const { createRequire } = await import('node:module');
  const dir = process.env.PLAYWRIGHT_DIR;
  if (!dir) throw new Error('world-unused-page --shots: PLAYWRIGHT_DIR is not set. It must name a folder whose node_modules holds Playwright. Set it and run again.');
  const { chromium } = createRequire(path.join(path.resolve(dir), 'package.json'))('playwright');
  fs.mkdirSync(SHOTS, { recursive: true });
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal'] });
  const snap = async (url, file) => {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }), p = await ctx.newPage(), notes = [];
    p.on('console', m => { if (/world2|error/i.test(m.type() + m.text()) && m.type() !== 'log' && !/wss:|fleet-pulse/.test(m.text())) notes.push(m.text().slice(0, 200)); });
    p.on('pageerror', e => notes.push(e.message.slice(0, 200)));
    await p.goto(url).catch(e => notes.push(e.message)); await p.waitForTimeout(7000);
    await p.screenshot({ path: path.join(SHOTS, file) });
    fs.writeFileSync(path.join(SHOTS, file + '.txt'), notes.join('\n'));
    await ctx.close();
    console.log(file, notes.length ? 'notes: ' + notes[0] : 'ok');
  };
  const done = new Set();
  for (const c of list) {
    const s = c.shot;
    if (!done.has(s.now)) { done.add(s.now); await snap(SITE + s.route + s.hash, s.now); }
    await snap(SITE + s.route + '?wswap=' + s.swap + s.hash, s.old);
  }
  await b.close();
}

const isText = (f) => /\.(flx|txt)$/.test(f);
const read = (f) => fs.readFileSync(path.join(W, f), 'utf8');

/* every file reached from the roots, and for each id the files that name it */
export function walk(files) {
  const byId = new Map();
  for (const f of files) { const m = f.match(/^([0-9a-f]{64})\./); if (m) (byId.get(m[1]) || byId.set(m[1], []).get(m[1])).push(f); }
  const used = new Set(files.filter(f => !/^[0-9a-f]{64}\./.test(f))), todo = ROOTS.filter(f => files.includes(f)), seen = new Set();
  while (todo.length) {
    const f = todo.pop(); if (seen.has(f)) continue; seen.add(f); used.add(f);
    if (isText(f)) for (const id of new Set(read(f).match(HEX) || [])) for (const g of byId.get(id) || []) todo.push(g);
  }
  return { used, byId };
}

/* the views a world text names: -R<view> boxes in records, the second column of a words line */
function viewsIn(text) {
  const v = new Set();
  for (const m of text.matchAll(/-R([a-z][a-z0-9]*)/g)) v.add(m[1]);
  for (const line of text.split('\n').slice(0, 400)) { const c = line.split('\t'); if (c.length > 2 && /^(pview|statekey|beat|spot|view|set)$/.test(c[0]) && /^[a-z][a-z0-9]*$/.test(c[1])) v.add(c[1]); }
  return [...v];
}

async function main() {
  const files = fs.readdirSync(W).filter(f => fs.statSync(path.join(W, f)).isFile());
  const { used } = walk(files);
  const unused = files.filter(f => !used.has(f)).sort();
  /* who names each id, among all text files (used or not) */
  const namers = new Map();
  for (const f of files.filter(isText)) for (const id of new Set(read(f).match(HEX) || [])) (namers.get(id) || namers.set(id, []).get(id)).push(f);
  /* the file that holds a view now: world.flx's WGROUP lines */
  const current = new Map();
  for (const m of read('world.flx').matchAll(/^WGROUP-R([a-z0-9]+)-C([0-9a-f]{64})/gm)) current.set(m[1], m[2]);
  const cards = unused.map(f => {
    const id = f.slice(0, 64), ext = f.slice(65), st = fs.statSync(path.join(W, f));
    const by = (namers.get(id) || []).filter(g => g !== f);
    let views = isText(f) ? viewsIn(read(f)) : [];
    if (!views.length) for (const g of by) views.push(...viewsIn(read(g)));
    views = [...new Set(views)];
    const now = [...new Set(views.map(v => current.get(v)).filter(Boolean))];
    const what = ext === 'flx' ? 'View records: the parts, rows and poses of a view'
      : ext === 'txt' ? 'View words: kinds, labels, steps and places of a view'
      : ext === 'mesh' ? 'A mesh shape (vertices and triangles)'
      : ext === 'bin' ? 'Number data: the rows and poses a view file names'
      : 'A file named by its content';
    return { f, id, ext, size: st.size, mtime: st.mtime.toISOString().slice(0, 16).replace('T', ' '), what, views, by: by.map(g => ({ f: g, used: used.has(g) })), now };
  });
  /* the picture of each old view group, beside the view as it is now (--shots; real Chrome through PLAYWRIGHT_DIR) */
  const groupOf = new Map(cards.filter(c => c.ext === 'flx').map(c => [c.f, c]));
  for (const c of cards) {
    const g = c.ext === 'flx' ? c : c.by.map(b => groupOf.get(b.f)).find(Boolean);
    if (!g || !g.now.length || !g.views.length) continue;
    const base = g.views.map(v => v.replace(/\d+$/, '')).find(v => v && v !== 'dyn' && v !== 'rig') || g.views[0];
    const route = /^(auth|rig)$/.test(base) ? '/auth' : '/docs/home-redesign/home-mockup.html';
    const hash = route === '/auth' ? '' : '#/' + (base === 'home' ? 'chain' : base);
    c.shot = { group: g.f, old: 'old-' + g.id.slice(0, 16) + '.png', now: 'now-' + base + '.png', route, hash, swap: g.now[0] + ':' + g.id + ':' + g.size, view: base };
  }
  if (process.argv.includes('--shots')) await shoot(cards.filter(c => c.ext === 'flx' && c.shot));
  for (const c of cards) if (c.shot) { c.shot.hasOld = fs.existsSync(path.join(SHOTS, c.shot.old)); c.shot.hasNow = fs.existsSync(path.join(SHOTS, c.shot.now)); const n = path.join(SHOTS, c.shot.old + '.txt'); c.shot.note = fs.existsSync(n) ? fs.readFileSync(n, 'utf8').trim() : ''; }
  const total = cards.reduce((a, c) => a + c.size, 0);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unused world files</title>
<style>
:root{--canvas:#0d0f0e;--surface:#151817;--nested:#1b1f1d;--text:#e6e8e7;--muted:#8c9490;--line:#262b29;--accent:#5fd39a;--warn:#e2b450}
@media (prefers-color-scheme: light){:root:not([data-theme="dark"]){--canvas:#f6f7f6;--surface:#fff;--nested:#f0f2f1;--text:#161a18;--muted:#5b625f;--line:#dde1df;--accent:#16794a;--warn:#8a6100}}
:root[data-theme="dark"]{--canvas:#0d0f0e;--surface:#151817;--nested:#1b1f1d;--text:#e6e8e7;--muted:#8c9490;--line:#262b29;--accent:#5fd39a;--warn:#e2b450}
*{box-sizing:border-box}body{background:var(--canvas);color:var(--text);font:14px/1.5 system-ui,sans-serif;margin:0;padding:24px 16px}
main{max-width:1200px;margin:0 auto}h1{font-size:29px;margin:0 0 4px}p{color:var(--muted);margin:4px 0}
.bar{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}.bar button{background:var(--surface);color:var(--text);border:1px solid var(--line);border-radius:6px;padding:4px 10px;font:inherit;cursor:pointer}.bar button[aria-pressed=true]{border-color:var(--accent);color:var(--accent)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:6px;min-width:0}
.k{font:11px/1.4 ui-monospace,monospace;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
.id{font:12px ui-monospace,monospace;word-break:break-all}.views b{color:var(--accent);font-weight:600}
pre{background:var(--nested);border-radius:6px;padding:8px;margin:0;font:11px/1.45 ui-monospace,monospace;max-height:180px;overflow:auto;white-space:pre}
canvas{width:100%;height:200px;background:var(--nested);border-radius:6px;display:block}
.now{color:var(--warn)}.pair{display:grid;grid-template-columns:1fr 1fr;gap:6px}figure{margin:0}figure img{width:100%;border-radius:6px;display:block;border:1px solid var(--line);cursor:zoom-in}figcaption{font:11px ui-monospace,monospace;color:var(--muted);margin-top:2px}summary{cursor:pointer;color:var(--muted)}a{color:inherit}
</style></head><body><main>
<h1>Unused world files</h1>
<p>${cards.length} files in <code>flux/defxn/world/</code>, ${(total / 1e6).toFixed(2)} MB. Nothing the site loads names them. They are older copies that an encoder run replaced. Each card shows the file, its view and the file that holds that view now.</p>
<p>Built ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC by <code>node scripts/world-unused-page.mjs</code>. A new encoder run can change this list: build the page again before deleting.</p>
<div class="bar" id="bar"></div>
<div class="grid" id="grid"></div>
</main>
<script type="module">
const CARDS = ${JSON.stringify(cards)};
const grid = document.getElementById('grid'), bar = document.getElementById('bar');
const kinds = ['all', ...new Set(CARDS.map(c => c.ext))];
let pick = 'all';
for (const k of kinds) { const b = document.createElement('button'); b.textContent = k === 'all' ? 'All ' + CARDS.length : '.' + k + ' ' + CARDS.filter(c => c.ext === k).length; b.onclick = () => { pick = k; draw(); }; b.dataset.k = k; bar.append(b); }
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const short = id => id.slice(0, 12) + '…';
/* measured0..measured35 are the steps of one view: show the view once, with its number of steps */
const fold = vs => { const n = new Map(); for (const v of vs) { const b = v.replace(/[0-9]+$/, '') || v; n.set(b, (n.get(b) || 0) + (b === v ? 0 : 1)); } return [...n].map(([b, k]) => k ? b + ' (' + k + ' steps)' : b); };
function card(c) {
  const el = document.createElement('article'); el.className = 'card';
  el.innerHTML = '<div class="k">.' + c.ext + ' · ' + (c.size / 1024).toFixed(1) + ' KB · written ' + c.mtime + '</div>'
    + '<div class="id"><a href="/world/' + c.f + '" target="_blank">' + esc(c.f) + '</a></div>'
    + '<div>' + esc(c.what) + '</div>'
    + '<div class="views">View: ' + (c.views.length ? fold(c.views).map(v => '<b>' + esc(v) + '</b>').join(', ') : 'not named') + '</div>'
    + '<div>Named by: ' + (c.by.length ? c.by.map(b => short(b.f) + (b.used ? ' (in use)' : ' (also unused)')).join(', ') : 'no file') + '</div>'
    + (c.now.length ? '<div class="now">That view now: ' + c.now.map(short).join(', ') + '</div>' : '')
    + (c.shot && (c.shot.hasOld || c.shot.hasNow) ? '<div class="pair">' + (c.shot.hasOld ? '<figure><img loading="lazy" src="unused-shots/' + c.shot.old + '" alt=""><figcaption>Old: ' + esc(c.shot.view) + (c.ext === 'flx' ? '' : ', from ' + short(c.shot.group)) + '</figcaption></figure>' : '') + (c.shot.hasNow ? '<figure><img loading="lazy" src="unused-shots/' + c.shot.now + '" alt=""><figcaption>Now</figcaption></figure>' : '') + '</div>' + (c.shot.note ? '<div class="k">Old view reported: ' + esc(c.shot.note.split('\\n')[0]) + '</div>' : '') : '')
    + '<details><summary>Grammar text</summary><div class="pv"></div></details>';
  return el;
}
async function preview(c, box) {
  const url = '/world/' + c.f;
  if (c.ext !== 'txt' && c.ext !== 'flx') box.closest('details').open = true;
  if (c.ext === 'txt' || c.ext === 'flx') {
    const t = await fetch(url).then(r => r.text()); const lines = t.split('\\n');
    const pre = document.createElement('pre'); pre.textContent = lines.slice(0, 40).join('\\n') + (lines.length > 40 ? '\\n… ' + (lines.length - 40) + ' more lines' : ''); box.append(pre);
  } else if (c.ext === 'mesh') {
    const { readMesh, meshFloats } = await import('/fxn-3d/engine/formats/mesh.mjs');
    const buf = new Uint8Array(await fetch(url).then(r => r.arrayBuffer()));
    const m = readMesh(buf), g = meshFloats(m, { unitNormals: true });
    const cv = document.createElement('canvas'); box.append(cv); drawMesh(cv, g, m);
    const k = document.createElement('div'); k.className = 'k'; k.textContent = m.verts + ' vertices · ' + (m.indices / 3) + ' triangles · drag to turn'; box.append(k);
  } else {
    const b = await fetch(url).then(r => r.arrayBuffer()); const f = new Float32Array(b, 0, Math.min(24, b.byteLength >> 2));
    const pre = document.createElement('pre'); pre.textContent = 'First numbers (float32):\\n' + Array.from(f, x => +x.toFixed(4)).join('  '); box.append(pre);
  }
}
/* a shaded drawing in 2D: triangles sorted far to near, lit from the upper left. Draws once, and again only while dragged. */
function drawMesh(cv, g, m) {
  let yaw = .7, pitch = .45;
  const paint = () => {
    const r = cv.getBoundingClientRect(), dpr = devicePixelRatio || 1; cv.width = r.width * dpr; cv.height = r.height * dpr;
    const x = cv.getContext('2d'), P = g.pos, N = g.nrm, I = g.idx, s = Math.max(...m.half) || 1;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const rot = (a, b, c) => { const X = a * cy - c * sy, Z = a * sy + c * cy; return [X, b * cp - Z * sp, b * sp + Z * cp]; };
    const k = Math.min(cv.width, cv.height) * .42 / s, ox = cv.width / 2, oy = cv.height / 2, tris = [];
    for (let t = 0; t < I.length; t += 3) {
      const v = [0, 1, 2].map(j => { const i = I[t + j] * 3; return rot(P[i] - m.centre[0], P[i + 1] - m.centre[1], P[i + 2] - m.centre[2]); });
      const i0 = I[t] * 3, n = rot(N[i0], N[i0 + 1], N[i0 + 2]);
      tris.push({ v, z: (v[0][2] + v[1][2] + v[2][2]) / 3, l: Math.max(.15, -.45 * n[0] + .65 * n[1] - .6 * n[2]) });
    }
    tris.sort((a, b) => b.z - a.z);
    x.clearRect(0, 0, cv.width, cv.height);
    for (const t of tris) { const c = Math.round(60 + 170 * t.l); x.fillStyle = 'rgb(' + c + ',' + c + ',' + c + ')'; x.beginPath(); t.v.forEach((p, j) => x[j ? 'lineTo' : 'moveTo'](ox + p[0] * k, oy - p[1] * k)); x.closePath(); x.fill(); }
  };
  paint();
  cv.onpointerdown = e => { const sx = e.clientX, sy0 = e.clientY, y0 = yaw, p0 = pitch; cv.setPointerCapture(e.pointerId); cv.onpointermove = ev => { yaw = y0 + (ev.clientX - sx) * .01; pitch = Math.max(-1.5, Math.min(1.5, p0 + (ev.clientY - sy0) * .01)); paint(); }; cv.onpointerup = () => { cv.onpointermove = null; }; };
}
function draw() {
  for (const b of bar.children) b.setAttribute('aria-pressed', b.dataset.k === pick);
  grid.textContent = '';
  for (const c of CARDS.filter(c => pick === 'all' || c.ext === pick)) { const el = card(c); grid.append(el); preview(c, el.querySelector('.pv')).catch(e => { el.querySelector('.pv').textContent = 'Could not read it: ' + e.message; }); }
}
draw();
grid.addEventListener('click', e => { if (e.target.tagName === 'IMG') window.open(e.target.src, '_blank'); });
</script></body></html>
`;
  fs.writeFileSync(OUT, html);
  console.log(`wrote ${path.relative(ROOT, OUT)}: ${cards.length} unused files, ${(total / 1e6).toFixed(2)} MB`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e.message); process.exit(1); });
