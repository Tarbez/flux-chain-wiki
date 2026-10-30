/* =====================================================================
   BEFORE AND AFTER: one local page with every page of the site twice, Three.js (before) and fxn-3d (after).
   ---------------------------------------------------------------------
   Why: the owner approves the Three.js removal by testing every page himself (2026-10-30). The list is derived,
   never typed: the pages the Three.js gate loaded (the newest docs/design/world-grammar/parity/*-gate-*.txt with
   page= lines), the board app's own views (the #/ links in docs/home-redesign/kit-ui.js and app.js, plus the
   views its stage names), and /kit, which the gate does not load.
   Before = http://127.0.0.1:3499 (a copy of git HEAD, Three.js). After = http://127.0.0.1:3438 (the working copy).

   Usage:   node scripts/before-after-page.mjs
   Output:  docs/design/world-grammar/before-after.html
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PARITY = path.join(ROOT, 'docs/design/world-grammar/parity');
const OUT = path.join(ROOT, 'docs/design/world-grammar/before-after.html');
const BEFORE = 'http://127.0.0.1:3499', AFTER = 'http://127.0.0.1:3438';
const BOARD = '/docs/home-redesign/home-mockup.html';

/* the newest gate file that holds page lines, and its lines by page */
function gatePages() {
  const files = fs.readdirSync(PARITY).filter(n => /-gate-\d+\.txt$/.test(n))
    .sort((a, b) => fs.statSync(path.join(PARITY, b)).mtimeMs - fs.statSync(path.join(PARITY, a)).mtimeMs);
  for (const n of files) {
    const lines = fs.readFileSync(path.join(PARITY, n), 'utf8').split('\n').filter(l => /(^|\s)page=/.test(l));
    if (lines.length < 50) continue;
    const by = new Map();
    for (const l of lines) {
      const f = {}; for (const box of l.trim().split(/\s+(?=[a-z0-9_]+=)/i)) { const i = box.indexOf('='); if (i > 0) f[box.slice(0, i)] = box.slice(i + 1); }
      by.set(f.page, f);
    }
    return { file: n, by };
  }
  throw new Error('before-after: no gate file with page lines in ' + PARITY + '. Run node scripts/threejs-gate.mjs first.');
}

/* the board app's views: every #/name link its scripts write, and the views its stage text names */
function boardViews() {
  const dir = path.join(ROOT, 'docs/home-redesign'), set = new Set();
  for (const n of ['kit-ui.js', 'app.js', 'concept-views.js', 'identity-flow.js', 'intro-view.js', 'ring-view.js', 'trace-view.js']) {
    const f = path.join(dir, n); if (!fs.existsSync(f)) continue;
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/#\/([a-z][a-z0-9]*)/g)) set.add(m[1]);
  }
  for (const m of fs.readFileSync(path.join(dir, 'home-mockup.html'), 'utf8').matchAll(/data-(?:view|for)="([a-z][a-z0-9]*)"/g)) if (m[1] !== 'x') set.add(m[1]);
  return [...set].sort();
}

function group(p) {
  if (p.startsWith('/docs/home-redesign/nft/')) return 'NFT boards';
  if (p.startsWith('/docs/home-redesign/')) return 'Design boards';
  if (p.startsWith(BOARD + '#')) return 'Board app views';
  if (p.startsWith('/kit')) return '3D builder';
  if (p.startsWith('/docs/') || p.startsWith('/world/') || p.startsWith('/gateway/') || p.startsWith('/legacy/')) return 'Other pages';
  return 'Site pages';
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function main() {
  const { file, by } = gatePages();
  const pages = [...by.keys()];
  pages.push('/kit?cms-preview=1');
  for (const v of boardViews()) pages.push(BOARD + '#/' + v);
  const order = ['Board app views', 'Design boards', 'NFT boards', '3D builder', 'Site pages', 'Other pages'];
  const rows = order.map(g => ({ g, list: pages.filter(p => group(p) === g) })).filter(x => x.list.length);
  const state = p => { const f = by.get(p); if (!f) return ''; return f.verdict || (Number(f.three_requests) > 0 ? 'threejs' : 'clean'); };
  const body = rows.map(({ g, list }) => `<h2>${esc(g)} <small>${list.length}</small></h2>
<table><thead><tr><th>Page</th><th>Before (Three.js)</th><th>After (fxn-3d)</th><th>Gate</th><th>OK</th></tr></thead><tbody>
${list.map(p => `<tr><td><code>${esc(p)}</code></td><td><a href="${esc(BEFORE + p)}" target="before">before</a></td><td><a href="${esc(AFTER + p)}" target="after">after</a></td><td class="g ${esc(state(p))}">${esc(state(p) || 'not loaded by gate')}</td><td><input type="checkbox" data-p="${esc(p)}"></td></tr>`).join('\n')}
</tbody></table>`).join('\n');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Before and after</title>
<style>
:root{--canvas:#0d0f0e;--surface:#151817;--text:#e6e8e7;--muted:#8c9490;--line:#262b29;--ok:#5fd39a;--bad:#ff8a8a}
@media (prefers-color-scheme: light){:root:not([data-theme="dark"]){--canvas:#f6f7f6;--surface:#fff;--text:#161a18;--muted:#5b625f;--line:#dde1df;--ok:#16794a;--bad:#b3261e}}
body{background:var(--canvas);color:var(--text);font:14px/1.5 system-ui,sans-serif;margin:0;padding:24px 16px;max-width:1100px;margin-inline:auto}
h1{font-size:29px;margin:0 0 4px}h2{font-size:18px;margin:32px 0 8px}small{color:var(--muted);font-weight:400}
p{color:var(--muted);margin:4px 0}table{width:100%;border-collapse:collapse;background:var(--surface)}
th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--muted);font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.08em}
td code{font-size:12px;word-break:break-all}a{color:inherit}.g.clean{color:var(--ok)}.g.threejs{color:var(--bad)}
#count{font-weight:600}
</style></head><body>
<h1>Before and after</h1>
<p>Open each page twice: before runs Three.js, after runs fxn-3d. Tick OK when the after page draws and moves the same. Ticks are kept in this browser only.</p>
<p>Before: ${BEFORE} (git HEAD). After: ${AFTER} (working copy). Gate column: ${esc(file)}. Ticked: <span id="count">0</span> of ${pages.length}.</p>
<p>Each link opens in one shared before tab or one shared after tab. Chrome keeps only about 16 pages with live 3D, so many open tabs blank the oldest. For a first-visit build-up, open the page in a private window.</p>
${body}
<script>
var K='before-after-ok',ok={};try{ok=JSON.parse(localStorage.getItem(K)||'{}')}catch(e){}
var boxes=document.querySelectorAll('input[data-p]'),c=document.getElementById('count');
function n(){var t=0;boxes.forEach(function(b){if(b.checked)t++});c.textContent=t}
boxes.forEach(function(b){b.checked=!!ok[b.dataset.p];b.addEventListener('change',function(){ok[b.dataset.p]=b.checked;try{localStorage.setItem(K,JSON.stringify(ok))}catch(e){}n()})});n();
</script></body></html>
`;
  fs.writeFileSync(OUT, html);
  console.log(`wrote ${path.relative(ROOT, OUT)}: ${pages.length} pages (gate file ${file})`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
