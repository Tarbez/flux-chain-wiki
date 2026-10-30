#!/usr/bin/env node
/* The world encoder (docs/design/world-grammar/CONTRACT.md, "encoder"). Build side, Node built-ins only.
   It reads the owner's picture data (js/content/network-data.js), the knob file (js/content/world-data.js through
   js/content/world.js) and the mark (js/ark/mark-data.js) once, and derives:
     1. the grammar's labels, audited through flux-grammar-atlas, and the reader the atlas generates from them;
     2. one record per fact of the world: rings, cubes, callouts, knobs, views, exits, the mark, the frame and its parts;
     3. one frame blob: the settled network as instance matrices, placed with the same maths as js/world/*
        (ring-kit.js place and k.at, chains-scene.js ring cast, floating heights, children, dots, the floor grid and
        its rings, the kernel's floor glow, the chain marks laid into the grid, the shadow catcher, the glass halo over the
        kernel with its ports), content-addressed;
     4. the chain marks (scripts/lib/stage-src/chain-marks.js: the ARK polygon and the CR3TV stand-in letters) as content-addressed
        SVG masks, one per marked ring, named by a WLOGO record;
     5. world/world.flx, written only after every record has been read back through the generated reader.
   Nothing here is hand-authored: a change to the picture or a knob is a rerun. Rerunning on the same data writes the
   same bytes: every order comes from data order, every name from the content.
   Slice 1 was confirmed on screen 2026-10-29 ("we are good to go"); tests/world-grammar.cjs locks it (workspace law:
   tests lock a confirmed design). Nothing is committed. The Three.js world stays live beside this. No JSON is written
   here except world-grammar.labels.json, which is the atlas designer's own input shape.
   WORLD_OUT=<dir> in the environment writes every output under that directory instead of the site (the test runs the
   encoder twice into temp dirs and compares the bytes with what is checked in); the inputs are always read from the site. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadAtlas, audit, sample, TONE } from './lib/fxn-3d.mjs';
import { chainScene, chainRecords, ringRecords, PARTS as CHAIN_PARTS } from './lib/world-chain-scene.mjs';
import { idScene, idRecords, ID_PARTS, ID_VIEWS } from './lib/world-id-scene.mjs';
import { howScene, howRecords } from './lib/world-how-scene.mjs';
import { sitesScene, sitesRecords, SITES_VIEW } from './lib/world-sites-scene.mjs';
import { helixScene, helixRecords } from './lib/world-helix-scene.mjs';
import { authScene, authRecords, AUTH_PARTS } from './lib/world-auth-scene.mjs';   /* the atlas loader and the audit live in fxn-3d (scripts/lib/atlas.mjs); re-exported below so the world's test keeps importing them from here */
import { stageSrc, stageSrcLabel } from './lib/stage-src.mjs';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.WORLD_OUT ? path.resolve(process.env.WORLD_OUT) : SITE;
const DOCS = path.join(OUT, 'docs', 'design', 'world-grammar');
const WORLD = path.join(OUT, 'world');
const READER_SITE = path.join(OUT, 'js', 'world2', 'world-reader.mjs');
const READER_DOCS = path.join(DOCS, 'world-reader.mjs');
const SAMPLE = 'WRING-I0-Khub-X300-Y185-D200-Q16-SH';

/* ---------- the maths the live world uses, restated without Three.js ----------
   Camera: FOV 12, the picture's aspect, placed by place(aim 0, dist 99, elev 24, yaw 0) (chains-scene.js base(),
   ring-kit.js place). Ring cast: three passes (chains-scene.js 53-61). Floating: hoverOf by rank (62-71). */
const FOV = 12, TAN = Math.tan(FOV / 2 * Math.PI / 180), HOME_ELEV = 24, HOME_DIST = 99;
const SLOT = 1.28, HALF_D = .15, LIFT = .16, MID = LIFT + .5, TAU = Math.PI * 2, D2R = Math.PI / 180;
const HOVER = 1.7;
const hoverOf = rank => HOVER * (.62 + .76 * ((rank * .618034) % 1));

/* number text: m is minus, p is the point; m30p5 is -30.5. The shortest round-trip text of the double, so the same
   number always writes the same text. Exponent forms (1e-7) are refused: the grammar has no letter for them. */
function num(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('number text needs a finite number, got ' + String(v));
  const s = String(v);
  if (!/^-?\d+(\.\d+)?$/.test(s)) throw new Error('number text cannot carry "' + s + '": it is not plain digits with one point');
  return s.replace('-', 'm').replace('.', 'p');
}
const two = v => Math.round(v * 100) / 100;   /* a projected picture coordinate, to the hundredth of a pixel */

/* ---------- loading the owner's data: read once, never rewritten (future law) ---------- */
function loadNetwork() {
  const ctx = { window: {} }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(SITE, 'js/content/network-data.js'), 'utf8'), ctx);
  return ctx.window.DEFXN_NETWORK;
}
function loadMark() {
  const ctx = { window: {} }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(SITE, 'js/ark/mark-data.js'), 'utf8'), ctx);
  const uri = String(ctx.window.DEFXN_MARK || '');
  const m = /^data:([a-z]+\/[a-z0-9.+-]+);base64,(.*)$/s.exec(uri);
  if (!m) throw new Error('js/ark/mark-data.js: DEFXN_MARK is not a base64 data URI, so the mark cannot be written as a file');
  const ext = { 'image/png': 'png', 'image/svg+xml': 'svg' }[m[1]];
  if (!ext) throw new Error('mark-data.js: the mark is ' + m[1] + '; the decoder tries .png then .svg, so only those can be written');
  return { bytes: Buffer.from(m[2], 'base64'), ext };
}
/* the chain marks (scripts/lib/stage-src/chain-marks.js): the ARK polygon as that file holds it (the owner's docs/design/chains/ARK.svg,
   one polygon placed twice, the second mirrored) and the CR3TV stand-in letters on their 4 x 6 grid. The literals are
   lifted out of the file's text and evaluated on their own, so the one source the live world draws from is the one
   source here; the file itself runs only inside a Three.js scene. Each mark becomes a white SVG mask centred on 0, 0,
   SVG y down = toward the camera (+Z), so the decoder's quad, whose image top lies toward -Z, shows it the way
   the inlay's ShapeGeometry rotated flat does. Colour never enters the image: the mark's instance carries its
   network's tone and the decoder tints the mask. */
function loadMarks(N) {
  const src = fs.readFileSync(stageSrc('chain-marks.js'), 'utf8');
  const lift = (name, re) => { const m = re.exec(src); if (!m) throw new Error('scripts/lib/stage-src/chain-marks.js: ' + name + ' was not found, so the marks cannot be derived'); return vm.runInNewContext('(' + m[1] + ')'); };
  const ARK = lift('ARK_POINTS', /var ARK_POINTS = (\[[^\]]*\]);/), LETTERS = lift('CR3TV_LETTERS', /var CR3TV_LETTERS = (\[[\s\S]*?\n  \]);/);
  const adv = lift('the letter advance', /var adv = ([0-9.]+),/);
  const PX = 1024;   /* the mask's raster width; the decoder rasterizes the SVG at its own width and height */
  const f = v => String(Math.round(v * 1e4) / 1e4);
  const poly = pts => { let d = ''; for (let i = 0; i < pts.length; i += 2) d += (i ? ' L' : 'M') + f(pts[i]) + ' ' + f(-pts[i + 1]); return d + ' Z'; };   /* shape y up -> SVG y down */
  const svg = (w, h, paths) => `<svg xmlns="http://www.w3.org/2000/svg" width="${PX}" height="${Math.round(PX * h / w)}" viewBox="${f(-w / 2)} ${f(-h / 2)} ${f(w)} ${f(h)}"><path fill="#fff" fill-rule="evenodd" d="${paths.join(' ')}"/></svg>\n`;
  /* ARK, as chain-marks.js arkShapes(): translate(282, 130) and the mirror about x = 146.5 after translate(50, 130),
     the 525 frame centred on 0, 0 with SVG's down turned up */
  const C = 262.5, right = [], left = [];
  for (let i = 0; i < ARK.length; i += 2) { const x = ARK[i], y = ARK[i + 1] + 130; right.push(x + 282 - C, C - y); left.push(2 * 146.5 - (x + 50) - C, C - y); }
  const arkW = Math.max(...right.filter((_, i) => i % 2 === 0)) * 2, arkH = Math.max(...right.filter((_, i) => i % 2 === 1)) * 2;
  /* CR3TV, as wordShapes(): each letter advanced by adv, the word centred, the baseline lowered by 3 */
  const total = LETTERS.length * adv - 1, place = (pts, n) => pts.map((v, i) => i % 2 ? v - 3 : v + n * adv - total / 2);
  const word = [];
  LETTERS.forEach((L, n) => { word.push(poly(place(L.out, n))); if (L.hole) word.push(poly(place(L.hole, n))); });
  /* the MARKS table of chain-marks.js: the ring's id and the share of its radius the mark spans */
  const table = [...src.matchAll(/\{ id: '([a-z0-9]+)',.*?span: ([0-9.]+),/g)].map(m => ({ id: m[1], span: Number(m[2]) }));
  if (table.length !== 2) throw new Error('scripts/lib/stage-src/chain-marks.js: expected the two MARKS rows, found ' + table.length);
  const IMAGE = { deark: { w: arkW, h: arkH, text: svg(arkW, arkH, [poly(right), poly(left)]) }, cr3tv: { w: total, h: 6, text: svg(total, 6, word) } };
  return table.map(mk => {
    const img = IMAGE[mk.id], ring = N.IDS.indexOf(mk.id);
    if (!img) throw new Error('chain-marks.js names a mark (' + mk.id + ') this encoder has no shape for');
    if (ring < 0) throw new Error('chain-marks.js marks ring "' + mk.id + '", which network-data.js does not name');
    return { id: mk.id, ring, span: mk.span, w: img.w, h: img.h, bytes: Buffer.from(img.text, 'utf8') };
  });
}
/* the knobs: world-data.js is one ArkWorld.define("<FLX records>") call; run it against a stub that keeps the text,
   then decode and sanitize it with the site's own reader (js/content/world.js), so every knob is clamped to its schema */
function loadWorld() {
  const require = createRequire(import.meta.url);
  const ArkWorld = require(path.join(SITE, 'js/content/world.js'));
  let text = null;
  const ctx = { ArkWorld: { define(t) { text = t; } } }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(SITE, 'js/content/world-data.js'), 'utf8'), ctx);
  if (typeof text !== 'string') throw new Error('js/content/world-data.js did not call ArkWorld.define with the FLX text');
  return { ArkWorld, world: ArkWorld.decode(text) };
}

/* ---------- the labels: the README table plus J (fit height); V is reused on a VIEW as the fill ---------- */
const NUM = '^m?[0-9]+(p[0-9]+)?$';
/* the contract's parts, in blob order: the network's solids and lights first, then the floor layers the owner asked
   for after slice 1 (grid, orbit rings, the kernel's glow pool, the chain marks, the shadow catcher) */
/* the stage's record kinds (STAGE.md): a view's states, their settled channel values, a channel's timing keys and real
   duration, the items (ids over a part's instances), how an item folds to its unbuilt pose, a tag's anchor, the text of
   the items' names, and a camera arrival */
export const STAGE_KINDS = ['STATE', 'SET', 'CHAN', 'SPAN', 'ITEM', 'FOLD', 'SPOT', 'NAMES', 'CAM', 'POSE', 'DRV', 'GROUP', 'ROWS', 'ATTACH', 'SHAPE', 'TEXT'];
/* the home blob's parts, in blob order; the chain views' parts (scripts/lib/world-chain-scene.mjs) are the records' other parts, so M names both */
export const HOME_PARTS = ['tile', 'link', 'cube', 'slot', 'dot', 'ring', 'shade', 'ground', 'beam', 'grid', 'orbit', 'pool', 'mark', 'catch', 'halo', 'port', 'glyph', 'hubdisc', 'hubrim', 'hubface', 'pearl'];
export const PARTS = [...HOME_PARTS, ...CHAIN_PARTS, ...AUTH_PARTS, ...ID_PARTS];
/* the how-it-works views' parts are named by running their stages (world-how-scene.mjs), and the reader's mesh-part set must hold the names before anything reads or generates it: so the first call that
   needs the labels runs the scene once and adds its part names to PARTS. The scene is kept for the encoder to write. */
/* ring-kit.js o.end: the build clock's length in ms; chains-scene.js passes end: 4700. The stage's records and the views that hold the clock at a point of it (download.js) read this one number */
export const BUILD_END = 4700;
let howMemo = null;
export function howScn() {
  if (!howMemo) {
    const { N, cast, frame } = derive();
    howMemo = howScene({ N, cast, cubes: frame.cubes, site: SITE, END: BUILD_END });
    for (const name of Object.keys(howMemo.parts)) if (!PARTS.includes(name)) PARTS.push(name);
  }
  return howMemo;
}
/* the two radio.fxn panes of home (scripts/lib/world-sites-scene.mjs): their part names join the reader's mesh-part set the same way, and the scene is kept for the encoder to write */
let sitesMemo = null;
export function sitesScn() {
  if (!sitesMemo) {
    const { N, cast, frame } = derive();
    sitesMemo = sitesScene({ N, cast, cubes: frame.cubes, site: SITE, elev: HOME_ELEV });
    for (const name of Object.keys(sitesMemo.parts)) if (!PARTS.includes(name)) PARTS.push(name);
  }
  return sitesMemo;
}
export function labels(N) {
  howScn(); sitesScn();
  const CALLOUTS = [...new Set(N.LABELS.map(l => String(l[0]).toLowerCase().replace(/[^a-z0-9]/g, '')))].sort();   /* derived from the data */
  const n = (letter, name, example) => ({ letter, name, payload: 'lowercase-alphanumeric', pattern: NUM, example });
  return [
    /* the world's own kinds only. The card's MESH, TEX and PLACE rode here until 2026-10-29; the owner then ruled "do not
       compound on one grammar only; build a grammar for each thing in isolation to maintain speed", so the card reads
       world/card.flx through its own reader (scripts/lib/card-grammar.mjs -> js/world2/card-reader.mjs) and the editor
       through its own (scripts/lib/edit-grammar.mjs -> js/editor/edit-reader.mjs). This set stays the world's. */
    { letter: 'W', name: 'record kind', payload: 'closed-set', values: ['RING', 'CUBE', 'LABEL', 'KNOB', 'VIEW', 'EXIT', 'MARK', 'LOGO', 'FRAME', 'PART', ...STAGE_KINDS], example: 'RING' },
    { letter: 'I', name: 'ring index', payload: 'digits', example: '0' },
    { letter: 'K', name: 'chain kind', payload: 'closed-set', values: ['hub', 'identity', 'resolver', 'token', 'pool', 'network', 'ledger', 'other'], example: 'hub' },
    n('X', 'x', '300'), n('Y', 'y', '185'), n('Z', 'z', '0'),
    n('D', 'width or distance', '200'),
    n('J', 'fit height', '70p5'),
    { letter: 'Q', name: 'tile count', payload: 'digits', example: '16' },
    { letter: 'P', name: 'parent ring', payload: 'digits', example: '0' },
    { letter: 'S', name: 'picture tone', payload: 'closed-set', values: ['H', 'T', 'L', 'M', 'D'], example: 'H' },
    { letter: 'G', name: 'knob group', payload: 'closed-set', values: ['look', 'motion', 'story'], example: 'look' },
    { letter: 'N', name: 'knob name', payload: 'lowercase-alphanumeric', example: 'exposure' },
    n('V', 'value or fill', '1p12'),
    { letter: 'R', name: 'view', payload: 'lowercase-alphanumeric', example: 'intro' },
    n('H', 'height angle', '72'), n('U', 'turn', 'm16'), n('T', 'tilt', '1p4'), n('B', 'step back', '0p6'),
    { letter: 'E', name: 'exit of the words', payload: 'closed-set', values: ['up', 'side', 'zoom'], example: 'up' },
    { letter: 'M', name: 'mesh part', payload: 'closed-set', values: PARTS, example: PARTS[0] },
    { letter: 'F', name: 'callout kind', payload: 'closed-set', values: CALLOUTS, example: CALLOUTS[0] },
    /* free text: the words a person reads, as hex of their UTF-8 (WTEXT: a part, which of its words, the hex). A name of two letters: the longest label a box starts with wins */
    { letter: 'HX', name: 'hex of UTF-8 words', payload: 'lowercase-hex', evenLength: true, example: '72616469' },
    { letter: 'C', name: 'content id', payload: 'lowercase-hex', evenLength: true, minLength: 64, example: 'a'.repeat(64) },
    { letter: 'O', name: 'byte offset', payload: 'digits', example: '0' },
    { letter: 'A', name: 'count, frame or permille of a track', payload: 'digits', example: '16' },
    /* the one letter left: a small whole number. On CHAN it is the key's curve (animate grammar: 0 linear, 1 in, 2 out, 3 in-out, 4 step); on PART it is the pick flag (1: the part's instances can be touched; the item's NAMES line names the hook) */
    { letter: 'L', name: 'curve, or pick flag', payload: 'digits', example: '2' },
    /* a name of two letters: the longest label a box starts with wins, so this one cannot take a box that is an S (picture tone) */
    { letter: 'BS', name: 'stagger of a blend', payload: 'closed-set', values: ['none', 'fromend', 'fromsel', 'absend', 'abssel', 'abslink'], example: 'none' }
  ];
}
/* ---------- camera and ray cast, as ring-kit.js place and k.at ---------- */
const v3 = (x, y, z) => ({ x, y, z });
const sub = (a, b) => v3(a.x - b.x, a.y - b.y, a.z - b.z);
const cross = (a, b) => v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const norm = a => { const l = Math.hypot(a.x, a.y, a.z); return v3(a.x / l, a.y / l, a.z / l); };
const dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
/* place(cam, aim, dist, elev, yaw) then lookAt(aim) with up +Y: Three.js Matrix4.lookAt gives z = eye - target,
   x = up × z, y = z × x; the camera looks down -z */
function camera(aim, dist, elevDeg, yawDeg, aspect) {
  const elev = elevDeg * D2R, yaw = yawDeg * D2R;
  const pos = v3(aim.x + dist * Math.cos(elev) * Math.sin(yaw), aim.y + dist * Math.sin(elev), aim.z + dist * Math.cos(elev) * Math.cos(yaw));
  const z = norm(sub(pos, aim)), x = norm(cross(v3(0, 1, 0), z)), y = cross(z, x);
  return { pos, x, y, z, aspect };
}
/* the ray through design-frame point (u, v) (0..1, top left) meets the plane y = h: Raycaster.setFromCamera then
   Ray.intersectPlane. The direction through NDC (u·2-1, 1-v·2) is (nx·TAN·aspect, ny·TAN, -1) in camera space. */
function at(cam, u, v, h) {
  const nx = u * 2 - 1, ny = 1 - v * 2, a = nx * TAN * cam.aspect, b = ny * TAN;
  const d = v3(a * cam.x.x + b * cam.y.x - cam.z.x, a * cam.x.y + b * cam.y.y - cam.z.y, a * cam.x.z + b * cam.y.z - cam.z.z);
  const t = (h - cam.pos.y) / d.y;
  if (!(t > 0)) throw new Error('the ray through picture point (' + u + ', ' + v + ') never meets the plane y = ' + h + ' in front of the camera');
  return v3(cam.pos.x + d.x * t, h, cam.pos.z + d.z * t);
}
/* the inverse: a world point to design-frame (u, v), for a ring the picture never drew (a chain inside a network) */
function project(cam, p) {
  const d = sub(p, cam.pos), cx = dot(d, cam.x), cy = dot(d, cam.y), cz = dot(d, cam.z);
  if (!(cz < 0)) throw new Error('a world point behind the design camera cannot be given a picture coordinate');
  return { u: ((cx / -cz) / (TAN * cam.aspect) + 1) / 2, v: (1 - (cy / -cz) / TAN) / 2 };
}

/* ---------- the rings, cast from the picture (chains-scene.js 39-80) ---------- */
function castRings(N, cam) {
  const rings = N.RINGS.map((r, i) => {
    const w = r[2], n = r[3];
    let h = .5, c, R, t;
    for (let q = 0; q < 3; q++) {
      const a = at(cam, (r[0] - w / 2) / N.W, r[1] / N.H, h), b = at(cam, (r[0] + w / 2) / N.W, r[1] / N.H, h);
      c = v3(a.x + (b.x - a.x) * .5, a.y + (b.y - a.y) * .5, a.z + (b.z - a.z) * .5);
      R = dist3(a, b) / 2 / (1 + TAU * HALF_D / (SLOT * n));
      t = TAU * R / (SLOT * n);
      h = t * MID;
    }
    c.y = 0;
    return { i, c, R, t, n, kind: N.KIND[i], outer: R + HALF_D * t, parent: null, castH: h };
  });
  const HUB = rings[N.HUB];
  /* rank by distance from the kernel; the sort is stable, so equal distances keep index order */
  const order = rings.map((r, i) => i).sort((a, b) => dist3(rings[a].c, HUB.c) - dist3(rings[b].c, HUB.c));
  rings.forEach(r => { if (r !== HUB) r.c.y = hoverOf(order.indexOf(r.i)); });
  (N.CHILDREN || []).forEach(ch => {
    const p = rings[ch[0]], a = ch[2] * D2R, R = p.R * ch[4], n = ch[5], t = TAU * R / (SLOT * n), ri = rings.length;
    const c = v3(p.c.x + Math.cos(a) * p.R * ch[3], p.c.y, p.c.z + Math.sin(a) * p.R * ch[3]);
    rings.push({ i: ri, c, R, t, n, kind: N.KIND[ri], outer: R + HALF_D * t, parent: p });
    order.push(ri);
  });
  return { rings, order, HUB };
}

/* ---------- tones: indices into the contract's palette, never RGB ---------- */
const FAMILY = { fxn: 14, deark: 15, cr3tv: 16 };   /* the net-* tokens of the three network chains; the kernel has none */
const CUBE_TONE = { L: TONE.identity, T: TONE.signal, D: TONE.other };   /* chains-scene.js cubeTone */
function familyOf(N, r) { let n = r; while (n.parent) n = n.parent; return FAMILY[N.IDS[n.i]] || 0; }

/* ---------- the frame: every part's instances, 16 Float32 each ---------- */
class Part {
  constructor(name) { this.name = name; this.rows = []; }
  /* columns of the 3x4 affine, then tone, family, mix, alpha */
  push(c0, c1, c2, tr, tone, family, mix, alpha) { this.rows.push([c0.x, c0.y, c0.z, c1.x, c1.y, c1.z, c2.x, c2.y, c2.z, tr.x, tr.y, tr.z, tone, family, mix, alpha]); }
  /* translation and a uniform or per-axis scale, no turn */
  box(p, sx, sy, sz, tone, family, mix, alpha) { this.push(v3(sx, 0, 0), v3(0, sy, 0), v3(0, 0, sz), p, tone, family, mix, alpha); }
}
/* the glyph bars engraved on a network tile (ring-kit.js tileSet glyphParts: each bar x, y from the face centre, width, height and a turn, drawn on both faces at +-HALF_D, .03 thick, in the canvas
   leaned to `other` by .12). The bars of each chain kind and which kind has which glyph are read from the stage files' own text, so no glyph is typed here. */
const GLYPHS = (() => {
  const kit = fs.readFileSync(stageSrc('ring-kit.js'), 'utf8'), scene = fs.readFileSync(stageSrc('chains-scene.js'), 'utf8');
  const g = /var GLYPH = (\{[\s\S]*?\n    \});/.exec(kit), k = /var KIND_GLYPH = (\{[^}]*\});/.exec(scene), c = /glyphMat\.color\.copy\(mix\('canvas', 'other', ([0-9.]+)\)\)/.exec(kit), t = /out\.push\(local\(b\[0\], LIFT \+ \.48 \+ b\[1\], z\)\.multiply\(M4\(\)\.makeRotationZ\(b\[4\] \|\| 0\)\)\.multiply\(M4\(\)\.makeScale\(b\[2\], b\[3\], ([0-9.]+)\)\)\)/.exec(kit);
  if (!g || !k || !c || !t) throw new Error('scripts/lib/stage-src/ring-kit.js or chains-scene.js no longer holds the glyph table, the kind-to-glyph table, the glyph colour or the bar placement, so the tile glyphs cannot be written. Re-read both files and update GLYPHS in scripts/world-encode.mjs.');
  return { bars: vm.runInNewContext('(' + g[1] + ')'), kind: vm.runInNewContext('(' + k[1] + ')'), mix: +c[1], depth: +t[1] };
})();

/* the pearls: a white clear-coated sphere (r .09) at the middle of every dotted line and a sphere at the foot of every cube's stem (r .07, lit for a teal computer), each grown in on its own moment
   (chains-scene.js line(), the stems, k.balls: ring-kit.js poseBalls grows each over 380 ms). The lines' own start is read from the file. */
const PEARLS = (() => {
  const scene = fs.readFileSync(stageSrc('chains-scene.js'), 'utf8'), kit = fs.readFileSync(stageSrc('ring-kit.js'), 'utf8');
  const l = /var LINES_AT = (\d+)/.exec(scene), m = /balls\.push\(\{ p: a\.clone\(\)\.lerp\(b, \.5\), r: ([0-9.]+), lit: false, at: at \+ (\d+) \}\)/.exec(scene), st = /balls\.push\(\{ p: V\(c\.p\.x, 0, c\.p\.z\), r: ([0-9.]+), lit: c\.tone === 'T', at: c\.at - (\d+) \}\)/.exec(scene), g = /var a = clamp01\(\(ms - \(b\.at \|\| 0\)\) \/ (\d+)\)/.exec(kit), c = /pearlMat\.color\.copy\(mix\('strong', 'muted', ([0-9.]+)\)\)/.exec(kit);
  if (!l || !m || !st || !g || !c) throw new Error('chains-scene.js or ring-kit.js no longer holds the pearls (line midpoints, stem feet, their moments, their grow time or colour), so they cannot be written. Re-read both files and update PEARLS in scripts/world-encode.mjs.');
  return { linesAt: +l[1], r: +m[1], after: +m[2], rStem: +st[1], before: +st[2], grow: +g[1], mix: +c[1] };
})();

/* the hub's round mark (chains-scene.js "the mark at the hub": a disc, a rim and a face with the kernel's mark, tilted back by the home elevation) and where the FXN view lifts it to (stages.js fxn
   pose: mark.position.y = lerp(MARK_Y, FY + .3, inOut(w)), FY = HUB.t * 3.6 + .4). The sizes are read from the files' own text. */
const HUBMARK = (() => {
  const scene = fs.readFileSync(stageSrc('chains-scene.js'), 'utf8'), st = fs.readFileSync(stageSrc('stages.js'), 'utf8');
  const need = (re, what) => { const m = re.exec(scene) || re.exec(st); if (!m) throw new Error('chains-scene.js or stages.js no longer holds ' + what + ', so the hub mark cannot be written. Re-read both files and update HUBMARK in scripts/world-encode.mjs.'); return m; };
  const mr = need(/MR = HUB\.R \* ([0-9.]+);/, 'the mark radius'), dh = need(/CylinderGeometry\(MR, MR, MR \* ([0-9.]+), 48\)/, 'the disc height'), rim = need(/TorusGeometry\(MR \* ([0-9.]+), MR \* ([0-9.]+), 12, 64\)/, 'the rim'), face = need(/PlaneGeometry\(MR \* ([0-9.]+), MR \* ([0-9.]+)\)/, 'the face'),
    z = need(/face\.position\.z = MR \* ([0-9.]+); rim\.position\.z = MR \* ([0-9.]+);/, 'the face and rim depth'), gain = need(/rim\.material\.color\.copy\(C\.signal\)\.multiplyScalar\(([0-9.]+)\);\s*face\.material\.color\.copy\(C\.signal\)\.multiplyScalar\(([0-9.]+)\)/, 'the rim and face gains'),
    disc = need(/disc\.material\.color\.copy\(k\.mix\('canvas', 'other', ([0-9.]+)\)\)/, 'the disc colour'), lift = need(/FY = HUB\.t \* ([0-9.]+) \+ ([0-9.]+), mark = W\.mark/, 'FY'), up = need(/mark\.position\.y = lerp\(MARK_Y, FY \+ ([0-9.]+), ease\.inOut\(clamp01\(w\)\)\)/, 'the mark lift');
  return { mr: +mr[1], dh: +dh[1], rim: +rim[1], tube: +rim[2], face: +face[1], fz: +z[1], rz: +z[2], rimGain: +gain[1], faceGain: +gain[2], mix: +disc[1], fyK: +lift[1], fyC: +lift[2], upC: +up[1] };
})();

/* the kernel's plate on home (home-descent.js): what it says under the pointer and where a click goes */
const LOGO_PICK = (() => {
  const src = fs.readFileSync(stageSrc('home-descent.js'), 'utf8'), l = /plate\.label = function \(\) \{ return \{ name: '([^']+)', act: '([^']+)' \}; \};/.exec(src), o = /plate\.onPick = function \(\) \{ S\.open\('([a-z]+)', \{ ([a-z]+): (\d+) \}\); \};/.exec(src);
  if (!l || !o) throw new Error('scripts/lib/stage-src/home-descent.js no longer holds the kernel plate\'s label and click (plate.label, plate.onPick), so its hover and click cannot be written. Re-read it and update LOGO_PICK in scripts/world-encode.mjs.');
  return [l[1], l[2], 'open', 0, o[1], o[2], o[3]];
})();

/* the tile frame on a ring (ring-kit.js k.ringFrame, built = 1): bx = (sin θ, 0, -cos θ), by = +Y, bz = (cos θ, 0, sin θ),
   scaled by s, at c + (R cos θ, 0, R sin θ) */
function ringFrame(c, R, theta, s) {
  const co = Math.cos(theta), si = Math.sin(theta);
  return { bx: v3(si * s, 0, -co * s), by: v3(0, s, 0), bz: v3(co * s, 0, si * s), pos: v3(c.x + R * co, c.y, c.z + R * si) };
}
const addScaled = (p, d, k) => v3(p.x + d.x * k, p.y + d.y * k, p.z + d.z * k);

/* dotted lines (ring-kit.js k.dots): a dot every `step` world units along the path, y + .02, lit per dot */
function dots(part, paths, step, size, tone) {
  paths.forEach((p, n) => {
    const pts = p.pts, segs = []; let L = 0;
    for (let i = 1; i < pts.length; i++) { const d = dist3(pts[i], pts[i - 1]); segs.push(d); L += d; }
    const m = Math.max(2, Math.floor(L / step));
    for (let q = 0; q <= m; q++) {
      let want = L * q / m, s = 0;
      while (s < segs.length - 1 && want > segs[s]) { want -= segs[s]; s++; }
      const u = segs[s] ? Math.min(1, want / segs[s]) : 0, a = pts[s], b = pts[s + 1] || a;
      const lit = (p.lit || .55) + .2 * Math.abs(Math.sin(n * 12.9898 + q * 78.233));
      part.box(v3(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u + .02, a.z + (b.z - a.z) * u), size, size, size, tone, 0, 0, lit);
    }
  });
}

function buildFrame(N, cam, cast, marks) {
  const { rings, order, HUB } = cast;
  const parts = Object.fromEntries(HOME_PARTS.map(p => [p, new Part(p)]));
  const OUTER = rings.filter(r => !r.parent), FLOATS = OUTER.filter(r => r !== HUB);
  /* which instances belong to which ring or cube: the stage's items (STAGE.md). first is the index inside the part. */
  const ranges = [];
  const claim = (item, part, count) => ranges.push({ item, part, first: parts[part].rows.length, count });

  /* tiles and links, ring by ring in network order (chains-scene.js net). The hub's own ring is left out: on every
     slice-1 view it has sunk into the ground plate (hubW = 0), so its tiles have no settled place; the kernel is the
     `ground` part. Your ring (N.MINE) takes the same frame as any ring: its settled home pose is ringFrame. */
  order.forEach(ri => {
    const r = rings[ri];   /* the hub's own ring is in the frame too: it stands only on its own page (chains-scene.js hubW) and sinks into the logo elsewhere, which the stage plays */
    /* your ring's tile is its kind's colour leaned to the signal by .4 (chains-scene.js homeTint = identity.lerp(signal, .4); the network's step back darkens it to the canvas) */
    const mine = r.i === N.MINE, tone = TONE[r.kind], fam = mine ? TONE.signal : familyOf(N, r), mix = mine ? .4 : fam ? (r.kind === 'network' ? .9 : .4) : 0, step = TAU / r.n;
    claim(r.i, 'tile', r.n); claim(r.i, 'link', r.n);
    const glyph = (GLYPHS.bars[GLYPHS.kind[r.kind] || 'iii'] || []), bars = r.i === N.MINE ? [] : glyph;   /* your ring's tiles are the chain group's (record glyphs) */
    if (bars.length) claim(r.i, 'glyph', r.n * bars.length * 2);
    /* a network ring's tile is glass (ring-kit.js tone(): every kind but `other`, k.GLASS .34 opaque, no depth written); your ring's tile is satin and opaque. The row's alpha says
       which: the renderer draws a row under 1 in its glass pass (world2-gl.mjs uPassSel). */
    const alpha = r.i !== N.MINE && r.kind !== 'other' ? .34 : 1;
    for (let i = 0; i < r.n; i++) {
      const theta = Math.PI / 2 + i * step;
      const f = ringFrame(r.c, r.R, theta, r.t);   /* body: frame × translate(0, LIFT + .5, 0) in tile units (ring-kit P.body) */
      parts.tile.push(f.bx, f.by, f.bz, addScaled(f.pos, f.by, LIFT + .5), tone, fam, mix, alpha);
      const g = ringFrame(r.c, r.R, theta + step / 2, r.t);   /* link: frame × P.link (0, LIFT + .5, -.03) × scale(.62, 1, 1) */
      parts.link.push(v3(g.bx.x * .62, g.bx.y * .62, g.bx.z * .62), g.by, g.bz, addScaled(addScaled(g.pos, g.by, LIFT + .5), g.bz, -.03), TONE.other, TONE.canvas, .45, 1);
      /* the glyph's bars: in the tile's own frame, translate (x, LIFT + .48 + y, +-HALF_D), turn about z, scale (w, h, depth); the frame's axes already carry the tile's size */
      for (const b of bars) for (const zs of [1, -1]) {
        const rot = b[4] || 0, cr = Math.cos(rot), sr = Math.sin(rot), sx = b[2], sy = b[3], sz = GLYPHS.depth;
        const x0 = v3((f.bx.x * cr + f.by.x * sr) * sx, (f.bx.y * cr + f.by.y * sr) * sx, (f.bx.z * cr + f.by.z * sr) * sx), y0 = v3((-f.bx.x * sr + f.by.x * cr) * sy, (-f.bx.y * sr + f.by.y * cr) * sy, (-f.bx.z * sr + f.by.z * cr) * sy);
        const z0 = v3(f.bz.x * sz, f.bz.y * sz, f.bz.z * sz), at = addScaled(addScaled(addScaled(f.pos, f.bx, b[0]), f.by, LIFT + .48 + b[1]), f.bz, HALF_D * zs);
        parts.glyph.push(x0, y0, z0, at, TONE.canvas, TONE.other, GLYPHS.mix, 1);
      }
    }
  });

  /* cubes on stems (chains-scene.js 243-247): at the picture spot cast at height 1.7 + .25, standing at y 1.7 */
  const CUBE = .5, LIFTC = 1.7;
  const cubes = N.CUBES.map((c, i) => { const p = at(cam, c[0] / N.W, c[1] / N.H, LIFTC + CUBE / 2); return { p: v3(p.x, LIFTC, p.z), tone: c[2], i }; });
  cubes.forEach(c => {
    claim(rings.length + c.i, 'cube', 1);
    const a = .3 * c.i, co = Math.cos(a), si = Math.sin(a);   /* turned a·i about +Y, scale CUBE */
    parts.cube.push(v3(co * CUBE, 0, -si * CUBE), v3(0, CUBE, 0), v3(si * CUBE, 0, co * CUBE), c.p, CUBE_TONE[c.tone], 0, 0, 1);
  });

  /* logo slots on the outer rings (chains-scene.js 200-201, 869-872): the decoder turns them to the camera */
  OUTER.forEach(r => {
    if (r === HUB) return;
    const sr = r.kind === 'network' ? r.R * .17 : Math.min(r.R * .42, r.t * 1.1);
    claim(r.i, 'slot', 1);
    parts.slot.box(v3(r.c.x, r.c.y + r.t * MID, r.c.z), sr, sr, sr, TONE.canvas, 0, 0, .62);
  });

  /* the hub's mark: three rows, a disc, a rim and a face, standing at the hub's height and turned back by the home elevation (the group's rotation.x = -HOME_ELEV). A disc is the unit prism turned to face z. */
  {
    const MR = HUB.R * HUBMARK.mr, el = -HOME_ELEV * D2R, th = el + Math.PI / 2, cs = Math.cos(th), sn = Math.sin(th), ce = Math.cos(el), se = Math.sin(el), at0 = v3(HUB.c.x, HUB.t * MID, HUB.c.z);
    const item = rings.length + N.CUBES.length, dz = (z) => v3(at0.x, at0.y - z * se, at0.z + z * ce);   /* the group's own turn about x applied to (0, 0, z) */
    const rot = (sx, sy, sz) => [v3(sx, 0, 0), v3(0, cs * sy, sn * sy), v3(0, -sn * sz, cs * sz)];
    claim(item, 'hubdisc', 1); parts.hubdisc.push(...rot(MR, MR * HUBMARK.dh, MR), at0, TONE.canvas, TONE.other, HUBMARK.mix, 1);
    claim(item, 'hubrim', 1); parts.hubrim.push(...rot(MR * HUBMARK.rim, MR * HUBMARK.rim, MR * HUBMARK.rim), dz(MR * HUBMARK.rz), TONE.signal, 0, 0, HUBMARK.rimGain);
    claim(item, 'hubface', 1); parts.hubface.push(...rot(MR * HUBMARK.face, 1, MR * HUBMARK.face), dz(MR * HUBMARK.fz), TONE.signal, 0, 0, HUBMARK.faceGain);
  }

  /* dotted lines (chains-scene.js 275-325): spokes, nearest neighbours, stems in one set; the two orbits; the joins
     inside each network. The lit noise restarts per set, as each k.dots call did. */
  const segDist = (c, a, b) => {
    const abx = b.x - a.x, abz = b.z - a.z, l2 = abx * abx + abz * abz;
    const u = l2 ? Math.min(1, Math.max(0, ((c.x - a.x) * abx + (c.z - a.z) * abz) / l2)) : 0;
    return Math.hypot(a.x + abx * u - c.x, a.z + abz * u - c.z);
  };
  const clear = (a, b, skipA, skipB) => rings.every((r, i) => i === skipA || i === skipB || segDist(r.c, a, b) >= r.outer + .2);
  const rim2 = (r, toward, pad) => { const d = norm(v3(toward.x - r.c.x, 0, toward.z - r.c.z)); return addScaled(r.c, d, r.outer + (pad || .15)); };
  const paths = [], seen = {}, balls = [];
  OUTER.forEach(r => {
    if (r === HUB) return;
    const a = rim2(HUB, r.c), b = rim2(r, HUB.c);
    if (clear(a, b, HUB.i, r.i)) { seen[HUB.i + '-' + r.i] = 1; paths.push({ pts: [a, b] }); balls.push({ p: v3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2), r: PEARLS.r, lit: false, at: PEARLS.linesAt + flat(a, HUB.c) * 40 + PEARLS.after }); }
  });
  OUTER.forEach(r => {
    if (r === HUB) return;
    OUTER.filter(s => s !== r && s !== HUB).sort((s1, s2) => flat(r.c, s1.c) - flat(r.c, s2.c)).slice(0, 2).forEach(s => {
      const id = Math.min(r.i, s.i) + '-' + Math.max(r.i, s.i); if (seen[id]) return; seen[id] = 1;
      const a = rim2(r, s.c), b = rim2(s, r.c);
      if (clear(a, b, r.i, s.i)) { paths.push({ pts: [a, b] }); balls.push({ p: v3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2), r: PEARLS.r, lit: false, at: PEARLS.linesAt + 400 + flat(a, HUB.c) * 40 + PEARLS.after }); }
    });
  });
  cubes.forEach(c => paths.push({ pts: [v3(c.p.x, 0, c.p.z), v3(c.p.x, c.p.y, c.p.z)] }));
  /* a pearl at the foot of each stem, grown in just before its cube */
  { const tc = chainTimings(); cubes.forEach(c => balls.push({ p: v3(c.p.x, 0, c.p.z), r: PEARLS.rStem, lit: c.tone === 'T', at: tc.cubeAt + c.i * tc.cubeStep - PEARLS.before })); }
  dots(parts.dot, paths, .17, .055, TONE.muted);
  const orbit = [1.75, 2.6].map(f => {
    const pts = [];
    for (let s = 0; s <= 160; s++) pts.push(v3(HUB.c.x + Math.cos(s / 160 * TAU) * HUB.R * f, 0, HUB.c.z + Math.sin(s / 160 * TAU) * HUB.R * f));
    return { pts, lit: .32 };
  });
  dots(parts.dot, orbit, .3, .045, TONE.muted);
  const inner = new Map();   /* keyed by parent index, in parent index order as the live world's object keys */
  rings.forEach(r => {
    if (!r.parent) return;
    const p = r.parent; if (!inner.has(p.i)) inner.set(p.i, []); const list = inner.get(p.i);
    if (r.kind === 'ledger') [55, 90, 125].forEach(deg => {
      const a = deg * D2R, r0 = r.outer + .1, r1 = p.R - HALF_D * p.t - .15;
      list.push({ pts: [v3(p.c.x + Math.cos(a) * r0, p.c.y, p.c.z + Math.sin(a) * r0), v3(p.c.x + Math.cos(a) * r1, p.c.y, p.c.z + Math.sin(a) * r1)], lit: .8 });
    });
    if (r.kind === 'pool') rings.filter(s => s.parent === p && s.kind === 'token').sort((s1, s2) => flat(s1.c, r.c) - flat(s2.c, r.c)).slice(0, 2)
      .forEach(s => list.push({ pts: [rim2(r, s.c, .06), rim2(s, r.c, .06)], lit: .9 }));
  });
  [...inner.keys()].sort((a, b) => a - b).forEach(pi => dots(parts.dot, inner.get(pi), .1, .045, TONE.signal));
  /* the pearls themselves: one item each, so each grows on its own moment */
  const pearlAt = new Map(), PEARL0 = rings.length + N.CUBES.length + 2;
  balls.forEach((b, i) => { claim(PEARL0 + i, 'pearl', 1); pearlAt.set(PEARL0 + i, Math.round(b.at)); parts.pearl.box(v3(b.p.x, b.p.y + b.r, b.p.z), b.r, b.r, b.r, b.lit ? TONE.signal : TONE.strong, b.lit ? 0 : TONE.muted, b.lit ? 0 : PEARLS.mix, 1); });

  /* under each floating ring: its echo (ring) and shade (chains-scene.js 855-861, settled: h = c.y) */
  FLOATS.forEach(r => {
    const fam = familyOf(N, r);
    claim(r.i, 'ring', 1); claim(r.i, 'shade', 1);
    parts.ring.box(v3(r.c.x, .025, r.c.z), r.outer, 1, r.outer, TONE[r.kind], fam, fam ? (r.kind === 'network' ? .9 : .4) : 0, .4);
    const sw = r.outer * (1.05 + r.c.y * .04);
    parts.shade.box(v3(r.c.x, .02, r.c.z), sw, 1, sw, TONE.canvas, 0, 0, .5);
  });

  /* the kernel plate and the beam at the hub centre (home-descent.js 110, 165) */
  const RP = HUB.R * 1.02, Y0 = .03;
  claim(rings.length + N.CUBES.length + 1, 'ground', 1);   /* the kernel's plate is touchable on home: it names itself and a click opens the base-chain layer (home-descent.js plate.label, plate.onPick) */
  parts.ground.box(v3(HUB.c.x, Y0, HUB.c.z), RP, 1, RP, TONE.canvas, 0, 0, 1);
  parts.beam.box(v3(HUB.c.x, Y0, HUB.c.z), .045, 7.5, .045, TONE.signal, 0, 0, 1);
  parts.beam.box(v3(HUB.c.x, Y0, HUB.c.z), .24, 7.5, .24, TONE.signal, 0, 0, .28);

  /* the floor (ring-kit.js k.floor, called as chains-scene.js 461: k.floor(HUB.c, 46)): one square of 2 x radius at
     y .004 whose lines the decoder draws in world space (every 2 units, .4 strong), fading from .4 R to R, at .2;
     tone muted leaned to signal by .25 (its paint). The rings every 6 units of the same shader are the orbit part:
     one flat ring per radius 6k inside R, each carrying the fade of its own radius (.75 x fade x .2) as its alpha. */
  const FLOOR_R = 46, GRID_FADE = r => { const u = Math.min(1, Math.max(0, (r - FLOOR_R * .4) / (FLOOR_R - FLOOR_R * .4))); return 1 - u * u * (3 - 2 * u); };
  parts.grid.box(v3(HUB.c.x, .004, HUB.c.z), FLOOR_R * 2, 1, FLOOR_R * 2, TONE.muted, TONE.signal, .25, .2);
  for (let k = 1; k * 6 < FLOOR_R; k++) parts.orbit.box(v3(HUB.c.x, .004, HUB.c.z), k * 6, 1, k * 6, TONE.muted, TONE.signal, .25, .75 * GRID_FADE(k * 6) * .2);

  /* the kernel's glow on the floor (home-descent.js floorGlow and line 444): a square of 2 x RP x 2.4 at y .006, its
     radial fall-off drawn by the decoder (full, .467 at .35, gone at the edge), signal x .16 at the settled logo */
  parts.pool.box(v3(HUB.c.x, .006, HUB.c.z), RP * 2.4 * 2, 1, RP * 2.4 * 2, TONE.signal, 0, 0, .16);

  /* the chain marks laid into the grid under their rings (chain-marks.js): the quad spans R x span across and keeps the
     mask's aspect; at y .006 at the ring's floor centre; its network's tone, which the decoder tints the mask with */
  marks.forEach(mk => {
    const r = rings[mk.ring], sc = r.R * mk.span / mk.w;
    parts.mark.box(v3(r.c.x, .006, r.c.z), mk.w * sc, 1, mk.h * sc, FAMILY[mk.id] || TONE.signal, 0, 0, 1);
  });

  /* the shadow catcher (chains-scene.js 365: k.shadow(HUB.c, 120, .38)): a 120-wide square at y .003 that darkens by
     .38 where the key light's shadow falls; the decoder draws it only when it has a shadow map */
  parts.catch.box(v3(HUB.c.x, .003, HUB.c.z), 120, 1, 120, TONE.canvas, 0, 0, .38);

  /* the halo over the kernel (glass-kit.js "the halo over the kernel"): two rings of glass at y 1.1 round the hub,
     R = the hub's outer radius. The back ring first (outer 2.25 R, inner 1.85 R, the base's deep tone --primary-300 at
     .32, shifted by (.12 R, -.08, .06 R)), then the front (outer 1.95 R, inner 1.16 R, --primary at .2). A flat ring
     has no height of its own, so the instance's y column carries the INNER radius and the x and z columns the outer:
     the decoder reads inner / outer from the matrix and nothing is typed into it. Its port holes, one per network
     chain on the line from the kernel to that chain (DERIVED from KIND and the ring centres), are the port part: a
     disc of .24 R at 1.58 R along that line, which the decoder cuts out of the front ring with the stencil. The halo
     is shown at 1 on intro and .6 on home, 0 elsewhere; slice 1 serves every view from one blob, so that fade waits
     for per-view blobs (reported). */
  const HR = HUB.outer, HALO_Y = 1.1;
  parts.halo.push(v3(HR * 2.25, 0, 0), v3(0, HR * 1.85, 0), v3(0, 0, HR * 2.25), v3(HUB.c.x + HR * .12, HALO_Y - .08, HUB.c.z + HR * .06), TONE.primary300, 0, 0, .32);
  parts.halo.push(v3(HR * 1.95, 0, 0), v3(0, HR * 1.16, 0), v3(0, 0, HR * 1.95), v3(HUB.c.x, HALO_Y, HUB.c.z), TONE.primary, 0, 0, .2);
  rings.forEach(r => {
    if (r.kind !== 'network' || r.parent) return;
    const a = Math.atan2(-(r.c.z - HUB.c.z), r.c.x - HUB.c.x);   /* the shape's angle: its +y is the world's -z */
    parts.port.box(v3(HUB.c.x + Math.cos(a) * HR * 1.58, HALO_Y, HUB.c.z - Math.sin(a) * HR * 1.58), HR * .24, 1, HR * .24, TONE.canvas, 0, 0, 1);
  });

  /* one blob, parts in draw order, little-endian Float32 */
  const total = HOME_PARTS.reduce((n, p) => n + parts[p].rows.length, 0), buf = Buffer.alloc(total * 64);
  const layout = []; let at64 = 0;
  for (const name of HOME_PARTS) {
    layout.push({ name, offset: at64 * 64, count: parts[name].rows.length });
    for (const row of parts[name].rows) { for (let k = 0; k < 16; k++) buf.writeFloatLE(row[k], at64 * 64 + k * 4); at64++; }
  }
  return { bytes: buf, layout, cubes, ranges, pearlAt };
}

/* ---------- the records ---------- */
function viewRecords(N, world, cast) {
  /* slice 1: intro, introtall, home, calm, with the stages' own numbers (CONTRACT.md "Views in slice 1"). introtall is
     the intro at dist × .62: fit is linear in width and height, so the .62 is folded into D and J. */
  const SIN72 = Math.sin(72 * D2R), introH = 72 * SIN72 + 2;
  const fitView = (view, aimZ, w, h) => `WVIEW-R${view}-X0-Y0-Z${num(aimZ)}-D${num(w)}-J${num(h)}-V0p96-H72-U0-T1p4-B0`;
  /* auth (scripts/lib/stage-src/auth-stage.js target(), the card standing on the kernel): aim at the kernel's cast centre, CY x .55
     up (CY = CH / 2 + RH / 2, CH = RH x 1.32, RH the hub's cast radius), fit RH x 4.3 by RH x 3.1 at .96 (RH x 3.2
     wide when tall), elev 22, yaw -14, tilt 1.1, stepped back .6. Four places, as card.flx writes the same centre. */
  const HUB = cast.HUB, RH = HUB.R, CY = RH * 1.32 * .5 + RH * .5, r4 = v => Math.round(v * 1e4) / 1e4;
  const authView = (view, w) => `WVIEW-R${view}-X${num(r4(HUB.c.x))}-Y${num(r4(CY * .55))}-Z${num(r4(HUB.c.z))}-D${num(r4(w))}-J${num(r4(RH * 3.1))}-V0p96-H22-Um14-T1p1-B0p6`;
  const rec = [
    fitView('intro', 9, 66, introH),
    fitView('introtall', 24, 66 * .62, introH * .62),
    `WVIEW-Rhome-X0-Y0-Z0-D${num(HOME_DIST)}-H${num(HOME_ELEV)}-U0-T2p4-B0`,
    'WVIEW-Rcalm-X0-Y0-Z0-D135-H30-U0-T1p2-B0p6',
    authView('auth', RH * 4.3),
    authView('authtall', RH * 3.2)
  ];
  /* the CMS's per-route camera overrides (ArkWorld views): a field it names, written as that view's box */
  const MAP = { aimX: 'X', aimY: 'Y', aimZ: 'Z', dist: 'D', elev: 'H', yaw: 'U', tilt: 'T', dim: 'B' };
  for (const [route, v] of Object.entries(world.views || {})) {
    const boxes = Object.entries(MAP).filter(([k]) => v[k] != null).map(([k, c]) => c + num(v[k]));
    if (boxes.length) rec.push(`WVIEW-R${viewName(route)}-${boxes.join('-')}`);
  }
  return rec;
}
/* a route as the page table writes it ("/", "/intro") to a view name: lowercase alphanumeric, "/" is home */
const viewName = route => route.replace(/[^a-z0-9]/g, '') || 'home';
function exitRecords(ArkWorld, world) {
  /* how each slice-1 view's words leave, through the site's own reader (the schema default when the CMS set nothing) */
  const ROUTE = { intro: '/intro', introtall: '/intro', home: '/', calm: '/', auth: '/auth', authtall: '/auth' };
  const rec = Object.entries(ROUTE).map(([view, route]) => `WEXIT-R${view}-E${ArkWorld.forRoute(route).exit.words}`);
  for (const [route, e] of Object.entries(world.exits || {})) { const v = viewName(route); if (!ROUTE[v]) rec.push(`WEXIT-R${v}-E${e.words}`); }
  return rec;
}

/* ---------- the stage: what moves, and what can be touched (docs/design/world-grammar/STAGE.md) ----------
   Everything below is read out of the Three.js stage files once, as loadMarks reads chain-marks.js: the numbers are the
   stages' own, the encoder only writes them as records. A restated formula carries a check that its source text still
   holds it, so a changed stage file fails here and is not silently written from stale numbers. */
function liftSource(file, name, re) {
  const src = fs.readFileSync(stageSrc(file), 'utf8'), m = re.exec(src);
  if (!m) throw new Error(stageSrcLabel(file) + ': ' + name + ' was not found, so the stage records cannot be derived from it');
  return vm.runInNewContext('(' + m[1] + ')');
}
function loadRecords() {
  const ctx = { window: {} }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(SITE, 'js/content/records-sample.js'), 'utf8'), ctx);
  return ctx.window.DEFXN_RECORDS;
}
/* the timings of chains-scene.js: RING_LAG, RING_FOR, TILE_FOR, and the cubes' "at: 2600 + i * 60" */
function chainTimings() {
  const src = fs.readFileSync(stageSrc('chains-scene.js'), 'utf8');
  const m = /var RING_LAG = (\d+), RING_FOR = (\d+), TILE_FOR = (\d+);/.exec(src), c = /at: (\d+) \+ i \* (\d+) \}/.exec(src);
  if (!m || !c) throw new Error('scripts/lib/stage-src/chains-scene.js: RING_LAG / RING_FOR / TILE_FOR or the cubes\' "at: N + i * M" were not found, so the build-up times cannot be derived');
  return { lag: +m[1], ring: +m[2], tile: +m[3], cubeAt: +c[1], cubeStep: +c[2] };
}
const clean = s => String(s == null ? '' : s).replace(/[\t\r\n]+/g, ' ').trim();

/* the words a pointer meets, per item: chains-scene.js netSet.label / ySet.label and ring-stage.js ringTarget. One line per
   item (inst *) or per instance of your ring, tab separated:
     item  <item> <inst> <name> <act> <hook> <arg> <view> <key> <value>
     tag   <id> <title> <sub> <small> <side> */
function namesBlob(N, cast, recs) {
  const rows = [], { rings, HUB } = cast, MINE = N.MINE, nY = rings[MINE].n, nR = recs.records.length;
  const slotOf = recs.records.map((r, j) => Math.round(j * nY / nR));
  rings.forEach(r => {
    if (r.parent || r === HUB) return;   /* home: a chain inside a network and the kernel's ring take no touch (netSet.liftable / pickable) */
    const id = N.IDS[r.i], named = N.NAMED[r.i], kd = N.KIND[r.i];
    const target = id === 'fxn-ledger' ? { view: 'fxn', key: '', value: '' } : r.i === MINE ? { view: 'chain', key: '', value: '' } : { view: 'ring', key: 'i', value: id };
    if (r.i === MINE) {
      for (let q = 0; q < nY; q++) {
        const j = slotOf.indexOf(q);
        if (j < 0) continue;   /* a filler slot: lifts with the ring, picks nothing */
        rows.push(['item', r.i, q, recs.records[j].title, 'Open your chain', 'pick', j, target.view, target.key, target.value]);
      }
      return;
    }
    const name = named ? named.name + ' · ' + (named.first ? 'The first chain' : named.coin) : N.NAMES[kd].replace(/s$/, '');
    rows.push(['item', r.i, '*', name, 'Open', 'pickRing', r.i, target.view, target.key, target.value]);
  });
  /* the kernel's plate: its hover name and the page a click opens, read from home-descent.js's own plate.label and plate.onPick */
  rows.push(['item', rings.length + N.CUBES.length + 1, '*', ...LOGO_PICK]);
  [['logo', 'DEFXN', 'The base chain kernel', '', 'above'], ...['deark', 'cr3tv'].map(id => {
    const ring = Object.keys(N.NAMED).find(i => N.NAMED[i].id === id);
    return [id, ring != null ? N.NAMED[ring].name : '', '', ' small', 'above'];
  })].forEach(t => rows.push(['tag', ...t]));
  return Buffer.from(rows.map(r => r.map(clean).join('\t')).join('\n') + '\n', 'utf8');
}

function stageRecords(N, cast, frame) {
  const rec = [], { rings, order, HUB } = cast;
  /* ---- auth: the eleven states and their settled channels (auth-stage.js POSE), plus the create wizard's seven steps ---- */
  const STATES = liftSource('auth-stage.js', 'STATES', /var STATES = (\[[^\]]*\]);/);
  const POSE = liftSource('auth-stage.js', 'POSE', /var POSE = (\{[\s\S]*?\n  \});/);
  const BUILD = liftSource('auth-stage.js', 'the create wizard\'s build steps', /build: (\[[^\]]*\])\[Math\.min\(6, cb\)\]/);
  const authSrc = fs.readFileSync(stageSrc('auth-stage.js'), 'utf8');
  for (const expr of ['lift: .1 + cb * .06', 'glow: .45 + cb * .09', 'gather: .8 - cb * .08', 'orbit: cb >= 6 ? 1 : 0'])
    if (!authSrc.includes(expr)) throw new Error('scripts/lib/stage-src/auth-stage.js no longer holds "' + expr + '" for the create wizard, so the seven create steps cannot be written from it');
  /* two channels the port adds to the stage's nine: loose, the pieces' share (auth-stage.js: max(broken, 1 - build)), and present, the stage's own fade in and out of the view (glass-kit.js
     show(): the glass comes in as the camera does and goes as it leaves, on a 320 ms tau) */
  const CHANNELS = [...Object.keys(POSE.none), 'loose', 'present'];
  const states = STATES.map(s => ({ name: s, pose: POSE[s] }));
  BUILD.forEach((b, cb) => states.push({ name: 'create' + cb, pose: Object.assign({}, POSE.create, { build: b, lift: .1 + cb * .06, glow: .45 + cb * .09, gather: .8 - cb * .08, orbit: cb >= 6 ? 1 : 0 }) }));
  states.forEach(s => { s.pose = Object.assign({}, s.pose, { loose: Math.max(s.pose.broken, 1 - s.pose.build), present: 1 }); });
  const r4 = v => Math.round(v * 1e4) / 1e4;
  states.forEach((s, i) => {
    rec.push(`WSTATE-Rauth-I${i}-N${s.name}`);
    CHANNELS.forEach(ch => rec.push(`WSET-Rauth-I${i}-N${ch}-V${num(r4(s.pose[ch]))}`));
  });
  /* a channel moves as the follower of auth-stage.js pose() did (tau 260 ms): an ease-out over one second */
  CHANNELS.forEach(ch => rec.push(`WSPAN-Rauth-N${ch}-D${ch === 'present' ? 1000 : 1000}`, `WCHAN-Rauth-N${ch}-A0-V0-L0`, `WCHAN-Rauth-N${ch}-A1000-V1-L2`));
  rec.push(`WITEM-Rauth-I0-Mbeam-O0-A${frame.layout.find(p => p.name === 'beam').count}`, 'WFOLD-Rauth-Mbeam-V0');

  /* ---- home: the build-up, the hover lift, the focus dim (chains-scene.js pose()) ---- */
  const t = chainTimings();
  const END = BUILD_END;
  const at = new Map();
  order.forEach((ri, rank) => { if (!rings[ri].parent) at.set(ri, rank * t.lag); });
  (N.CHILDREN || []).forEach((ch, j) => { const ri = N.RINGS.length + j; at.set(ri, at.get(ch[0]) + 380 + j % 5 * 90); });
  const win = { tile: [0, t.ring, t.tile], glyph: [0, t.ring, t.tile], link: [140, t.ring, t.tile], slot: [Math.round(t.ring * .6), 0, t.tile], ring: [0, 0, t.ring + 300], shade: [0, 0, t.ring + 300] };
  frame.ranges.forEach(g => {
    const base = `WITEM-Rhome-I${g.item}-M${g.part}-O${g.first}-A${g.count}`;
    if (g.part.startsWith('hub') || g.part === 'ground') { rec.push(base); return; }
    if (g.part === 'pearl') { rec.push(`${base}-D${frame.pearlAt.get(g.item)}-V${PEARLS.grow}`); return; }   /* each pearl on its own moment (ring-kit.js poseBalls) */   /* the hub's mark follows the home weight and the FXN view's, not a ring's build */
    if (g.part === 'cube') { rec.push(`${base}-D${t.cubeAt + (g.item - rings.length) * t.cubeStep}-V${t.tile}`); return; }
    const w = win[g.part], p = rings[g.item].parent;
    rec.push(base + (p ? `-P${p.i}` : '') + `-D${at.get(g.item) + w[0]}` + (w[1] ? `-T${w[1]}` : '') + `-V${w[2]}`);
  });
  /* the unbuilt pose of a part: a tile drops 1.4 of its size (ring-kit.js ringFrame), a cube .8 of the .5 unit; others only shrink */
  rec.push('WFOLD-Rhome-Mtile-V1p4', 'WFOLD-Rhome-Mglyph-V1p4', 'WFOLD-Rhome-Mhubdisc-V0', 'WFOLD-Rhome-Mhubrim-V0', 'WFOLD-Rhome-Mhubface-V0', 'WFOLD-Rhome-Mpearl-V0', 'WFOLD-Rhome-Mlink-V1p4', 'WFOLD-Rhome-Mcube-V1p6', 'WFOLD-Rhome-Mslot-V0', 'WFOLD-Rhome-Mring-V0', 'WFOLD-Rhome-Mshade-V0');
  /* the channels of home. lift and focus are per ring; build is one clock. Gains in tile sizes (ringUp: t .32 hover, t .5 focus); dim .6 (dimF) */
  rec.push('WSET-Rhome-I0-Nlift-V0p32', 'WSET-Rhome-I0-Nfocus-V0p5', 'WSET-Rhome-I0-Ndim-V0p6', 'WSET-Rhome-I0-Nbuild-V1');
  /* how far the FXN view lifts the hub's mark: from its height (HUB.t x MID) to FY + .3, in world units */
  rec.push(`WSET-Rhome-I0-Nhubtube-V${num(Math.round(HUBMARK.tube / HUBMARK.rim * 1e6) / 1e6)}`);
  rec.push(`WSET-Rhome-I0-Nmarklift-V${num(Math.round(((cast.HUB.t * HUBMARK.fyK + HUBMARK.fyC + HUBMARK.upC) - cast.HUB.t * MID) * 1e4) / 1e4)}`);
  rec.push('WSPAN-Rhome-Nlift-D330', 'WCHAN-Rhome-Nlift-A0-V0-L0', 'WCHAN-Rhome-Nlift-A1000-V1-L2');       /* ringLift follower, tau 110 ms */
  rec.push('WSPAN-Rhome-Nfocus-D540', 'WCHAN-Rhome-Nfocus-A0-V0-L0', 'WCHAN-Rhome-Nfocus-A1000-V1-L2');   /* ringFocus follower, tau 180 ms */
  rec.push(`WSPAN-Rhome-Nbuild-D${END}`, 'WCHAN-Rhome-Nbuild-A0-V0-L0', 'WCHAN-Rhome-Nbuild-A1000-V1-L0');
  /* tags: the clock at which they may show (home-descent.js: built = span(ms, T.beam, T.beam + 900)), and where the three hang (homeTags) */
  const tt = /var T = \{ logo: (\d+), beam: (\d+),/.exec(fs.readFileSync(stageSrc('home-descent.js'), 'utf8'));
  if (!tt) throw new Error('scripts/lib/stage-src/home-descent.js: the storyboard "var T = { logo: N, beam: N," was not found, so the labels\' time cannot be derived');
  rec.push(`WSET-Rhome-I0-Ntagsat-V${+tt[2] + 900}`);
  const RP = HUB.R * 1.02, Y0 = .03;
  const ringOf = id => rings[Object.keys(N.NAMED).find(i => N.NAMED[i].id === id)];
  const d = ringOf('deark'), c3 = ringOf('cr3tv');
  const spot = (id, x, y, z) => rec.push(`WSPOT-Rhome-N${id}-X${num(r4(x))}-Y${num(r4(y))}-Z${num(r4(z))}`);
  spot('logo', HUB.c.x - RP * .98, Y0, HUB.c.z - RP * .15);
  spot('deark', d.c.x - d.R * .2, d.c.y + d.t * 1.6, d.c.z - d.R);
  spot('cr3tv', c3.c.x, c3.c.y + c3.t * 1.5, c3.c.z - c3.R * .4);
  /* the intro's arrival (chains-scene.js WELCOME): 1.7 x the distance, 12 degrees higher, turned -16, over 3.2 s; the words at .45 */
  const W = liftSource('chains-scene.js', 'WELCOME', /var WELCOME = (\{[^}]*\});/);
  rec.push(`WSPAN-Rintro-Ncamera-D${W.fly}`, `WCAM-Rintro-A0-D${num(W.dist)}-H${num(W.elev)}-U${num(W.yaw)}`, 'WCAM-Rintro-A1000-D1-H0-U0', `WSET-Rintro-I0-Nwords-V${num(.45)}`);
  return rec;
}

/* every channel's keys, read back through the one sampler before anything is written: a track must start at 0, end at 1 and never leave 0..1
   (a track the sampler cannot play to its settled value would leave a channel stuck half way) */
function checkTracks(rec) {
  const groups = new Map();
  for (const line of rec) {
    const m = /^WCHAN-R([a-z0-9]+)-N([a-z0-9]+)(?:-I(\d))?-A(\d+)-V([0-9mp]+)-L(\d)$/.exec(line);
    if (!m) continue;
    const id = m[1] + '/' + m[2] + (m[3] ? '/' + m[3] : ''), list = groups.get(id) || [];
    list.push({ frame: +m[4], value: [Number(m[5].replace('m', '-').replace('p', '.')), 0, 0], ease: +m[6], hold: 0 }); groups.set(id, list);
  }
  for (const [id, keys] of groups) {
    const anim = { scene: { rate: 1000 }, tracks: { x: { alive: true, pos: keys, rot: [], scl: [] } }, camera: [], lens: [] };
    const at = f => sample(anim, f).pieces.x.pos[0];
    if (at(0) !== 0 || at(1000) !== 1) throw new Error('channel ' + id + ' does not run from 0 to 1: the sampler reads ' + at(0) + ' at frame 0 and ' + at(1000) + ' at frame 1000, so the stage would leave it part way');
    for (let f = 0; f <= 1000; f += 25) { const v = at(f); if (v < 0 || v > 1) throw new Error('channel ' + id + ' leaves 0..1 at frame ' + f + ' (' + v + ')'); }
  }
  return groups.size;
}

/* the auth group: the card's measured size, the parts' rows as samples, the two panel plates as mesh blobs, and the state's words (world-auth-scene.mjs) */
function authGroup({ N, cast, sha }) {
  const unnum = t => { const neg = t[0] === 'm'; const v = Number((neg ? t.slice(1) : t).replace('p', '.')); return neg ? -v : v; };
  const cardText = fs.readFileSync(path.join(SITE, 'world', 'card.flx'), 'utf8'), place = /WPLACE-Rauth-X(\S+?)-Y(\S+?)-Z(\S+?)-D(\S+?)-U(\S+)/.exec(cardText), mesh = /WMESH-Rauth-C([0-9a-f]{64})/.exec(cardText);
  if (!place || !mesh) throw new Error('world/card.flx names no auth place or mesh, so the auth glow cannot be sized to the card; run scripts/world-encode-card.mjs first');
  const head = fs.readFileSync(path.join(SITE, 'world', mesh[1] + '.mesh')), half = [head.readFloatLE(32), head.readFloatLE(36), head.readFloatLE(40)];
  const card = { x: unnum(place[1]), y: unnum(place[2]), z: unnum(place[3]), height: unnum(place[4]), yaw: unnum(place[5]), half };
  const scene = authScene({ cast, site: SITE, card });
  const stateNames = [...scene.STATES, ...scene.BUILD.map((_, cb) => 'create' + cb)];
  const out = authRecords(scene, { num, stateNames });
  const cid = sha(out.bytes), rec = [`WFRAME-Rrig-C${cid}-A${out.bytes.length}`, ...out.rec], files = [{ name: cid + '.bin', bytes: out.bytes }];
  for (const sh of scene.shapes) { files.push({ name: sh.cid + '.mesh', bytes: sh.bytes }); rec.push(`WSHAPE-Rrig-M${sh.part}-C${sh.cid}-A${sh.bytes.length}`); }
  /* the words: the panels' titles and, per state, what each status line says and how lit it is (the page names the network; its row is the page's) */
  const lines = [['title', '0', 'FXN ID'], ['title', '1', 'DEFXN network'], ['network', 'Network'], ['signer', 'Signing as you', 'No signer'], ...scene.PANELS.map((q, k) => ['panel', String(k), String(q.w), String(q.h)])];
  /* the view's clock (auth-stage.js: the spin that runs while the file opens, the pulse of a running bead): numbers lifted from the file */
  lines.push(['clock', String(scene.clock.rate), String(scene.clock.cubeK), String(scene.clock.pulseMean), String(scene.clock.pulseAmp), String(scene.clock.pulsePeriod), ...scene.clock.spinStates]);
  stateNames.forEach((n, i) => { const b = n.replace(/\d$/, ''); lines.push(['words', String(i), n, ...(scene.SAY[b] || scene.SAY.none).flat(), scene.NET[b]]); });
  const names = Buffer.from(lines.map(l => l.map(clean).join('\t')).join('\n') + '\n', 'utf8'), namesCid = sha(names);
  files.push({ name: namesCid + '.txt', bytes: names }); rec.push(`WNAMES-Rauth-C${namesCid}-A${names.length}`);
  return { rec, files };
}

/* the identity group (PORT.md batch 2): the five identity steps' rows as samples, their cameras, channels, labels and the words of their plates (world-id-scene.mjs) */
function idGroup({ N, cast, sha }) {
  const ctx = { window: {} }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(SITE, 'js/content/identity-sample.js'), 'utf8'), ctx);
  const scene = idScene({ N, cast, site: SITE, identity: ctx.window.DEFXN_IDENTITY });
  const out = idRecords(scene, { num, sha, N });
  return { rec: out.rec, files: out.files, layout: out.layout };
}

/* the how-it-works groups (PORT.md batch 3): one for each of the five views, its rows sampled from the stage run as it is (world-how-scene.mjs) */
function howGroups({ scene, sha }) { return howRecords(scene, { num, sha }); }

async function main() {
  const { GC, REG } = loadAtlas();
  const N = loadNetwork();
  const { ArkWorld, world } = loadWorld();
  const mark = loadMark();
  const marks = loadMarks(N);

  /* the geometry, first (the labels call below runs the how-it-works scene, whose part names the reader's mesh-part set must hold) */
  const cam = camera(v3(0, 0, 0), HOME_DIST, HOME_ELEV, 0, N.W / N.H);
  const cast = castRings(N, cam);
  const frame = buildFrame(N, cam, cast, marks);

  /* 1 labels, audit, reader */
  const L = labels(N);
  audit(GC, REG, L);
  const readerText = GC.readerModule('WORLD', L, SAMPLE);
  fs.mkdirSync(path.dirname(READER_SITE), { recursive: true }); fs.mkdirSync(DOCS, { recursive: true }); fs.mkdirSync(WORLD, { recursive: true });
  fs.writeFileSync(READER_SITE, readerText); fs.writeFileSync(READER_DOCS, readerText);
  fs.writeFileSync(path.join(DOCS, 'world-grammar.labels.json'), JSON.stringify(L, null, 2) + '\n');   /* the atlas designer's input shape */

  /* 2 the frame's blob and the files beside it */
  const sha = b => crypto.createHash('sha256').update(b).digest('hex');
  const cid = sha(frame.bytes), markCid = sha(mark.bytes);
  fs.writeFileSync(path.join(WORLD, cid + '.bin'), frame.bytes);
  fs.writeFileSync(path.join(WORLD, markCid + '.' + mark.ext), mark.bytes);
  marks.forEach(mk => { mk.cid = sha(mk.bytes); fs.writeFileSync(path.join(WORLD, mk.cid + '.svg'), mk.bytes); });
  /* the words of the items (hover names, the open target, the tags): text, content-addressed, named by a WNAMES record */
  const names = namesBlob(N, cast, loadRecords()), namesCid = sha(names);
  fs.writeFileSync(path.join(WORLD, namesCid + '.txt'), names);

  /* 3 the records, in the contract's order */
  const rec = [];
  cast.rings.forEach(r => {
    if (!r.parent) { const d = N.RINGS[r.i]; rec.push(`WRING-I${r.i}-K${r.kind}-X${num(d[0])}-Y${num(d[1])}-D${num(d[2])}-Q${d[3]}-S${d[4]}`); return; }
    /* a chain inside a network has no spot in the picture: its centre is projected back into it through the design
       camera at its parent's cast height, and its width is its parent's picture width scaled by the outer radii */
    const p = r.parent, pd = N.RINGS[p.i], uv = project(cam, v3(r.c.x, p.castH, r.c.z));
    rec.push(`WRING-I${r.i}-K${r.kind}-X${num(two(uv.u * N.W))}-Y${num(two(uv.v * N.H))}-D${num(two(pd[2] * r.outer / p.outer))}-Q${r.n}-S${pd[4]}-P${p.i}`);
  });
  N.CUBES.forEach(c => rec.push(`WCUBE-X${num(c[0])}-Y${num(c[1])}-S${c[2]}`));
  N.LABELS.forEach(l => rec.push(`WLABEL-F${String(l[0]).toLowerCase().replace(/[^a-z0-9]/g, '')}-X${num(l[1])}-Y${num(l[2])}`));
  for (const grp of ['look', 'motion', 'story']) for (const [k, v] of Object.entries(world[grp] || {})) {
    if (typeof v === 'number') rec.push(`WKNOB-G${grp}-N${k.toLowerCase()}-V${num(v)}`);
    else if (typeof v === 'boolean') rec.push(`WKNOB-G${grp}-N${k.toLowerCase()}-V${v ? 1 : 0}`);
  }
  rec.push(...viewRecords(N, world, cast));
  rec.push(...exitRecords(ArkWorld, world));
  rec.push(`WMARK-C${markCid}`);
  /* one LOGO per marked ring, in the order of chain-marks.js MARKS, which is the order of the mark part's instances:
     the decoder pairs instance j with the j-th LOGO record */
  marks.forEach(mk => rec.push(`WLOGO-I${mk.ring}-C${mk.cid}`));
  const VIEWS = ['intro', 'introtall', 'home', 'calm'];   /* one settled frame serves all four; content addressing dedupes */
  VIEWS.forEach(v => rec.push(`WFRAME-R${v}-C${cid}-A${frame.bytes.length}`));
  /* pickable: on home the network's tiles and links (the pick flag, STAGE.md); the other views draw the same blob and take no touch */
  const PICKABLE = { home: ['tile', 'link', 'ground'] };
  /* L is a number of flags on a PART: 1 the instances can be touched, 2 a row with an alpha under 1 is glass (the network's tiles) */
  VIEWS.forEach(v => frame.layout.forEach(p => { const flags = ((PICKABLE[v] || []).includes(p.name) ? 1 : 0) | (p.name === 'tile' ? 2 : 0); rec.push(`WPART-R${v}-M${p.name}-O${p.offset}-A${p.count}` + (flags ? `-L${flags}` : '')); }));
  rec.push(...stageRecords(N, cast, frame));
  rec.push(`WNAMES-Rhome-C${namesCid}-A${names.length}`);
  /* batch 1 (PORT.md): your chain's four views and the ring view, as frames of their own and the records that blend them */
  const sampleRecords = loadRecords().records;
  const chainScn = chainScene({ N, cast, recs: sampleRecords, site: SITE });
  const chainOut = chainRecords(chainScn, { num, sha, site: SITE, recs: sampleRecords, mine: N.MINE });
  chainOut.files.forEach(f => fs.writeFileSync(path.join(WORLD, f.name), f.bytes));
  /* the chain group's records are a file of their own, read through the same reader and fetched with its blob on the first flight to one of its views,
     so the first request stays the size it was: world.flx only says which views belong to the group and which file holds their records */
  const group = [...chainOut.rec, ...ringRecords({ N, cast, num, site: SITE }).rec], groupText = Buffer.from(group.join('\n') + '\n', 'utf8'), groupCid = sha(groupText);
  fs.writeFileSync(path.join(WORLD, groupCid + '.flx'), groupText);
  ['chain', 'record', 'links', 'open', 'ring'].forEach(v => rec.push(`WGROUP-R${v}-C${groupCid}-A${groupText.length}`));
  /* batch 1: the auth stage's glow, rings, cubes, loose pieces and status panels, as the group of the auth view (fetched on the first flight to /auth) */
  const authOut = authGroup({ N, cast, sha });
  authOut.files.forEach(f => fs.writeFileSync(path.join(WORLD, f.name), f.bytes));
  const authText = Buffer.from(authOut.rec.join('\n') + '\n', 'utf8'), authCid = sha(authText);
  fs.writeFileSync(path.join(WORLD, authCid + '.flx'), authText);
  rec.push(`WGROUP-Rauth-C${authCid}-A${authText.length}`);

  /* batch 2: the identity steps, as the group of their five views (fetched on the first flight to /identity or /account) */
  const idOut = idGroup({ N, cast, sha });
  idOut.files.forEach(f => fs.writeFileSync(path.join(WORLD, f.name), f.bytes));
  const idText = Buffer.from(idOut.rec.join('\n') + '\n', 'utf8'), idCid = sha(idText);
  fs.writeFileSync(path.join(WORLD, idCid + '.flx'), idText);
  ID_VIEWS.forEach(v => rec.push(`WGROUP-R${v}-C${idCid}-A${idText.length}`));

  /* batch 3: the five how-it-works views, each the group of its own view (fetched on the first flight to /works, /works/resolve, /works/layers, /works/life or /trace) */
  const howOut = howGroups({ scene: howScn(), sha });
  for (const g of howOut) {
    g.files.forEach(f => fs.writeFileSync(path.join(WORLD, f.name), f.bytes));
    g.text = Buffer.from(g.rec.join('\n') + '\n', 'utf8'); g.cid = sha(g.text);
    fs.writeFileSync(path.join(WORLD, g.cid + '.flx'), g.text);
    rec.push(`WGROUP-R${g.view}-C${g.cid}-A${g.text.length}`);
  }
  const howRec = howOut.flatMap(g => g.rec);

  /* home's two site panes (home-sites.js): the group of the view `sites`, fetched after home's first frame (js/world2/world2-sites.mjs) */
  const sitesOut = sitesRecords(sitesScn(), { num, sha });
  sitesOut.files.forEach(f => fs.writeFileSync(path.join(WORLD, f.name), f.bytes));
  const sitesText = Buffer.from(sitesOut.rec.join('\n') + '\n', 'utf8'), sitesCid = sha(sitesText);
  fs.writeFileSync(path.join(WORLD, sitesCid + '.flx'), sitesText);
  rec.push(`WGROUP-R${SITES_VIEW}-C${sitesCid}-A${sitesText.length}`);

  /* the home helix (home-helix.js): its numbers as a words file, a group of the view `helix`, fetched when a page has an identity card box (js/world2/world2-helix.mjs) */
  const helixOut = helixRecords(helixScene(), { sha });
  helixOut.files.forEach(f => fs.writeFileSync(path.join(WORLD, f.name), f.bytes));
  const helixText = Buffer.from(helixOut.rec.join('\n') + '\n', 'utf8'), helixCid = sha(helixText);
  fs.writeFileSync(path.join(WORLD, helixCid + '.flx'), helixText);
  rec.push(`WGROUP-R${helixOut.view}-C${helixCid}-A${helixText.length}`);

  const tracks = checkTracks(rec.concat(group, authOut.rec, idOut.rec, howRec, sitesOut.rec, helixOut.rec));

  /* 4 every record through the freshly generated reader before anything is written: an unreadable record is never written */
  const reader = await import(pathToFileURL(READER_SITE).href + '?v=' + crypto.createHash('sha256').update(readerText).digest('hex').slice(0, 16));
  for (const r of rec) {
    if (!/^[\x21-\x7e]+$/.test(r)) throw new Error('a record must be printable ASCII with no spaces: ' + r);
    try { reader.readRecord(r); } catch (e) { throw new Error('the reader refuses a derived record, so world.flx is not written: ' + r + ' (' + e.message + ')'); }
  }
  for (const r of group.concat(authOut.rec, idOut.rec, howRec, sitesOut.rec, helixOut.rec)) {
    if (!/^[\x21-\x7e]+$/.test(r)) throw new Error('a record must be printable ASCII with no spaces: ' + r);
    try { reader.readRecord(r); } catch (e) { throw new Error('the reader refuses a derived chain record, so the group file is not written: ' + r + ' (' + e.message + ')'); }
  }
  const flx = rec.join('\n') + '\n';
  fs.writeFileSync(path.join(WORLD, 'world.flx'), flx);

  /* 5 the report */
  const counts = frame.layout.map(p => p.name + '=' + p.count).join(' ');
  console.log(`world-encode: ${rec.length} records, world.flx ${Buffer.byteLength(flx)} bytes, ${tracks} channel tracks, names ${names.length} bytes, instances ${counts}, blob ${frame.bytes.length} bytes, cid ${cid}, mark ${markCid}.${mark.ext}, logos ${marks.map(mk => mk.id + '=' + mk.cid.slice(0, 12)).join(' ')}`);
  return { rec, cast, frame, cid };
}

/* the cast and the frame, for a check that compares them with the live world (no side effects) */
export function derive() {
  const N = loadNetwork(), cam = camera(v3(0, 0, 0), HOME_DIST, HOME_ELEV, 0, N.W / N.H);
  const cast = castRings(N, cam);
  return { N, cam, cast, frame: buildFrame(N, cam, cast, loadMarks(N)) };
}
/* the encoder as a function, for the test: runs the whole encode into WORLD_OUT (or the site) and reports */
export { main as encode, loadNetwork, loadAtlas, audit };

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error('world-encode: ' + e.message); process.exit(1); });
