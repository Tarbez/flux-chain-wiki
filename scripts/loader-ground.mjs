#!/usr/bin/env node
/* THE LOADER'S FIRST PAINT, derived (2026-11-11; fxn-3d docs/design/direction/portal-101/NOTES.md "The load board and the home hero": "The first paint
   needs no 3D engine: frame 1 drawn in inline CSS and SVG from the plaza camera's own projection, with no layout shift"). Layer: app (a build step of the
   site's shell).

   What it does. It reads the load camera (LOAD_CAM) and the plaza's centre from fxn-3d world/portal101/geometry.mjs, projects the empty ground through
   that camera the way the studio does (engine/render/math.mjs eyeOf and view; engine/runtime/anim-sample.mjs fovOf: a 24 mm tall film), and writes the
   result into index.html between <!-- loader-ground:begin --> and <!-- loader-ground:end -->: one inline SVG (the floor rings, the floor lines, the low
   disc) and one inline style with the bar's place. Nothing is typed by hand in index.html: change the camera or the ground there and run this again.

   The picture's units. The studio's camera keeps its vertical angle, and world/site-view draws a view narrower than MIN_ASPECT at that aspect, scaled to
   the width. So the SVG's viewBox is MIN_ASPECT x 1 of the frame's height, centred, with preserveAspectRatio "xMidYMid meet" and overflow visible: at
   every window size a point lands where the studio draws it, and a resize needs no script.

   The ground's measures. geometry.mjs may export LOAD_GROUND = { rings: [radius m, ...], disc: { r, h }, lines: [[[x, z], ...], ...] } (metres from
   the plaza's centre on the floor). Until it does, GROUND_DEFAULT below stands in: it is read off world/portal101/plaza.mjs (RINGS, DAIS) and the
   approved load board, and the hand-off's measured difference says how far it is from the frame the studio draws.

   Run: node scripts/loader-ground.mjs [--check]   (--check writes nothing and fails when index.html differs) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const GEOMETRY = path.resolve(ROOT, '../fxn-3d/world/portal101/geometry.mjs');
const BEGIN = '<!-- loader-ground:begin -->', END = '<!-- loader-ground:end -->';
/* the floor ring's band, read off the studio's LOADSTART frame against this drawing (2026-11-11, 1440 x 900): .035 m wide, its middle .008 m outside
   the stated radius. geometry.mjs LOAD_GROUND may state `ringWidth`; the mesh's own measures would be better still */
const D2R = Math.PI / 180, RING_BAND = .035, RING_OUT = .008;
const GROUND_DEFAULT = (S) => ({
  rings: [3.55 * S, 4.6 * S, 6.2 * S],
  disc: { r: 1.82 * S, h: .1 * S },
  /* the two floor lines of the board: each leaves the outer ring's side, jogs, and runs off the frame */
  lines: [[[-6.2 * S, -1.2 * S], [-8.4 * S, -3.2 * S], [-30 * S, -3.2 * S]], [[6.2 * S, -1.2 * S], [8.4 * S, -3.2 * S], [30 * S, -3.2 * S]]],
});

/* a camera { aim, dist, elev, yaw, lens } to a function from a world point to [x, y] in frame heights from the frame's centre (x right, y down) */
export function projector(cam) {
  const e = cam.elev * D2R, w = cam.yaw * D2R, a = cam.aim;
  const eye = [a[0] + cam.dist * Math.cos(e) * Math.sin(w), a[1] + cam.dist * Math.sin(e), a[2] + cam.dist * Math.cos(e) * Math.cos(w)];
  let z = [eye[0] - a[0], eye[1] - a[1], eye[2] - a[2]]; const zl = Math.hypot(...z) || 1; z = z.map((v) => v / zl);
  let x = [z[2], 0, -z[0]]; const xl = Math.hypot(...x) || 1; x = x.map((v) => v / xl);
  const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
  const f = cam.lens / 12;   /* 1 / tan(fov / 2), fov = 2 atan(12 / lens) */
  return (p) => { const d = [p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]], dot = (u) => d[0] * u[0] + d[1] * u[1] + d[2] * u[2], depth = -dot(z); return depth > .05 ? [f * dot(x) / (2 * depth), -f * dot(y) / (2 * depth)] : null; };
}

export function build(g) {
  if (!g.LOAD_CAM) throw new Error('fxn-3d world/portal101/geometry.mjs exports no LOAD_CAM. Needed: the load camera { aim, dist, elev, yaw, lens }. Remedy: export it there (r110, "THE LOAD AS STOPS").');
  const S = g.S, PC = [g.C[0] * S, 0, g.C[2] * S], G = g.LOAD_GROUND || GROUND_DEFAULT(S), to = projector(g.LOAD_CAM), ASPECT = Number(g.MIN_ASPECT) || 1.6;
  const U = 1000, n1 = (v) => String(Math.round(v * U * 10) / 10), pt = (p) => { const q = to(p); if (!q) throw new Error('a ground point lies behind the load camera: ' + p.join(', ') + '. Remedy: check LOAD_CAM and the ground\'s measures.'); return q; };
  const circle = (r, y, n = 96) => 'M' + Array.from({ length: n }, (_, i) => { const t = i / n * 2 * Math.PI; return pt([PC[0] + Math.cos(t) * r, y, PC[2] + Math.sin(t) * r]).map(n1).join(' '); }).join('L') + 'Z';
  /* a floor ring is a flat band, so it is drawn as one: its outer and inner edge, filled between (even-odd). The band then thins with distance as
     the studio's does (measured on portal101r110 LOADSTART at 1440 x 900: 4 px at the near edge, 1 px at the far one). RING_BAND metres wide unless
     the ground states `ringWidth` */
  const band = Number(G.ringWidth) || RING_BAND;
  /* the ground may state each ring's true band, `bands`: [inner, outer] in metres (geometry.mjs LOAD_GROUND, from the part's own mesh: the band grows
     with its ring's radius). The measured stand-in above is used only when it does not */
  const rings = G.rings.map((r, i) => { const b = Array.isArray(G.bands) && G.bands[i] ? G.bands[i] : [r + RING_OUT - band / 2, r + RING_OUT + band / 2]; return `<path d="${circle(b[1], 0)}${circle(b[0], 0)}"/>`; }).join('');
  /* a floor line: each stretch is walked in short steps, and a step that lies behind the camera or far off the frame ends the stroke there (a long
     trace runs on under the camera, where a projection has no meaning) */
  const lineD = (pts) => { let d = '', open = false;
    for (let i = 0; i + 1 < pts.length; i++) for (let k = i ? 1 : 0; k <= 16; k++) { const u = k / 16, x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, z = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u, q = to([PC[0] + x, 0, PC[2] + z]);
      if (!q || Math.abs(q[0]) > 3 || Math.abs(q[1]) > 3) { open = false; continue; } d += (open ? 'L' : 'M') + q.map(n1).join(' '); open = true; }
    return d; };
  const lineOf = (l) => Array.isArray(l) ? { lit: true, pts: l } : l;
  const lines = (G.lines || []).map(lineOf).map((l) => `<path${l.lit ? '' : ' class="g"'} d="${lineD(l.pts)}"/>`).join('');
  /* the disc: one low cylinder, or several stacked (the dais and the plinth on it). Each has its foot, its wall (the foot's and the top's widest
     points joined) and its top */
  let foot = 0; const disc = (Array.isArray(G.disc) ? G.disc : [G.disc]).map((c, i) => {
    const side = (y) => [pt([PC[0] - c.r, y, PC[2]]), pt([PC[0] + c.r, y, PC[2]])], [fl, fr] = side(foot), [tl, tr] = side(foot + c.h);
    const wall = `M${[tl, tr, fr, fl].map((q) => q.map(n1).join(' ')).join('L')}Z`, out = `<path class="w w${i}" d="${circle(c.r, foot, 72)}${wall}"/><path class="t t${i}" d="${circle(c.r, foot + c.h, 72)}"/>`;
    foot += c.h; return out; }).join('');
  /* the bar: under the outer ring's near edge, on the plaza's centre line; both as shares of the frame's height from its centre */
  const near = pt([PC[0], 0, PC[2] + Math.max(...G.rings)]), barY = Math.min(.44, near[1] + .07), cx = pt(PC)[0];
  const svg = `<svg class="plaza-ground" viewBox="${-ASPECT * U / 2} ${-U / 2} ${ASPECT * U} ${U}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><g class="r">${rings}</g><g class="l">${lines}</g><g class="d">${disc}</g></svg>`;
  /* the colours the studio draws LOADSTART in (geometry.mjs LOAD_GROUND.drawn, 2026-11-11): the rings' core and soft edge, each disc's lit top and
     wall. They come after index.html's own first-paint rules and have the same weight, so they stand; a ground without `drawn` keeps those rules */
  const D = G.drawn, rgb = (c) => `rgb(${c.map((v) => Math.round(v)).join(' ')})`, P = '#world-loader.plaza>.plaza-ground ';
  const look = !D ? '' : `${P}.r{fill:${rgb(D.ring)}${D.soft ? `;filter:drop-shadow(0 0 ${D.soft.px}px rgb(${D.ring.join(' ')} / ${D.soft.alpha}))` : ''}}${P}.l{stroke:${rgb(D.ring)}}`
    + (D.top || []).map((c, i) => `${P}.d .t${i}{fill:${rgb(c)}}`).join('') + (D.wall || []).map((c, i) => `${P}.d .w${i}{fill:${rgb(c)}}`).join('');
  const style = `<style>#world-loader.plaza{--plaza-x:${(cx * 100).toFixed(2)};--plaza-bar-y:${(barY * 100).toFixed(2)};--plaza-aspect:${ASPECT}}${look}</style>`;
  return `${BEGIN}\n<!-- Generated by scripts/loader-ground.mjs from fxn-3d world/portal101/geometry.mjs (LOAD_CAM${g.LOAD_GROUND ? ', LOAD_GROUND' : '; the ground\'s measures are the script\'s stand-in'}). Do not edit: run the script. -->\n${style}\n${svg}\n${END}`;
}

async function main() {
  const check = process.argv.includes('--check');
  if (!fs.existsSync(GEOMETRY)) throw new Error('missing ' + GEOMETRY + '. Needed: the fxn-3d tree beside this one. Remedy: check out flux/fxn-3d, or keep the region already in index.html (the build does not need this step to pass).');
  const made = build(await import(pathToFileURL(GEOMETRY).href)), html = fs.readFileSync(INDEX, 'utf8'), a = html.indexOf(BEGIN), b = html.indexOf(END);
  if (a < 0 || b < a) throw new Error('index.html has no ' + BEGIN + ' ... ' + END + ' region. Remedy: add the two markers inside #world-loader, before its bar.');
  const next = html.slice(0, a) + made + html.slice(b + END.length);
  if (next === html) { console.log('[loader-ground] index.html is current'); return; }
  if (check) { console.error('[loader-ground] DRIFT: index.html\'s loader ground differs from geometry.mjs. Remedy: node scripts/loader-ground.mjs'); process.exitCode = 1; return; }
  fs.writeFileSync(INDEX, next); console.log('[loader-ground] rewrote the loader ground in index.html (' + made.length + ' bytes)');
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main().catch((e) => { console.error('[loader-ground] ' + e.message); process.exitCode = 1; });
