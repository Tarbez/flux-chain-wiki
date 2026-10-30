#!/usr/bin/env node
/* The Kit encoder (docs/design/world-grammar/PORT.md, 2026-10-30 "kit"). Runs the Kit's three Three.js source files in a VM (scripts/lib/kit-scene.mjs), reads back what they built and
   wrote it as the Kit's own grammar (scripts/lib/kit-grammar.mjs):
     world/kit.flx             the records: the stage's numbers, the materials and how a skin tints them, the parts of each object, the cells, the curves, the cameras
     world/<cid>.bin           the shapes: each distinct shape once, as a MESH blob (the engine's own format), end to end
     world/<cid>.bin           the matrices of every part, then of every orbit ring (Float32)
     world/<cid>.txt           the words of every face: the 2D calls object-kit.js made, one call a line, tab separated
   Nothing is typed by hand: a change to object-kit.js, glass-kit.js or kit-stage.js is a rerun. Before anything is kept every record is read back through the generated reader, and the pose
   (js/world2/kit-pose.mjs, which the page runs) is PROVED against the stage's own pose(), cameras, labels and state rules on a grid of channel values and every state. A proof that fails writes nothing.
   No JSON on any wire or store; no WASM; Node built-ins only plus the engine's modules through scripts/lib/fxn-3d.mjs. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readKit } from './lib/kit-scene.mjs';
import { derive } from './world-encode.mjs';
import { textOf, writeBlob, sha, sample } from './lib/fxn-3d.mjs';
import { readRecord } from '../js/world2/kit-reader.mjs';
import { decodeKit } from '../js/world2/kit-decode.mjs';
import { createKitPose } from '../js/world2/kit-pose.mjs';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORLD = process.env.KIT_OUT || path.join(SITE, 'world');
const T = (v) => textOf(Math.abs(v) < 1e-9 ? 0 : v);
/* a material's name as the grammar spells a name: lowercase letters and digits (the source's glassDim is glassdim) */
const lc = (n) => String(n).toLowerCase();
const hex = (s) => Buffer.from(String(s), 'utf8').toString('hex');
const CH = { '255,0,0': 'ink', '0,255,0': 'acc', '0,0,255': 'warn' };

/* a colour a face wrote (a channel of the mask object-kit.js paints: red ink, green accent, blue warning) as the channel and its strength */
function colour(v) {
  const m = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/.exec(v);
  if (!m) throw new Error('a face painted a colour that is not one of its three channels: ' + v + '. Re-read object-kit.js rgba() and update scripts/kit-encode.mjs.');
  const ch = CH[m[1] + ',' + m[2] + ',' + m[3]];
  if (!ch) throw new Error('a face painted the channel ' + m[1] + ',' + m[2] + ',' + m[3] + ', which is not red, green or blue');
  return 'c:' + ch + ':' + m[4];
}
const round4 = (x) => String(Math.round(Number(x) * 1e4) / 1e4);
/* a face's calls as words: a call is its name then its arguments; a colour becomes its channel, a number is rounded to the 4th decimal (these are pixels) */
function wordsOf(ops) {
  return ops.map((op) => {
    const [name, ...args] = op;
    const out = args.map((a, i) => {
      if ((name === 'fillStyle' || name === 'strokeStyle') && i === 0) return colour(a);
      if (name === 'mark' && i === 0) return colour(a);
      if (name === 'fillText' && i === 0) return String(a);
      if (name === 'font' || name === 'letterSpacing' || name === 'lineCap' || name === 'lineJoin' || name === 'textAlign' || name === 'textBaseline' || name === 'globalCompositeOperation') return String(a);
      if (name === 'setLineDash') return String(a).split(',').map(round4).join(',');
      return round4(a);
    });
    for (const a of out) if (/[\t\n]/.test(a)) throw new Error('a face call carries a tab or a newline (' + name + '), which the words file cannot hold');
    return [name, ...out].join('\t');
  }).join('\n') + '\n';
}

export async function encodeKit({ write = true } = {}) {
  const d = derive(), K = readKit({ hubC: d.cast.HUB.c }), st = K.stage, c = st.consts, lines = [];
  const add = (line) => { readRecord(line); lines.push(line); };   /* a record the reader refuses is never written */

  /* ---------- the shapes: each as a MESH blob, end to end ---------- */
  const geoBytes = [], geoRec = []; let at = 0;
  for (const g of K.geos) {
    let h = 0; for (const v of g.pos) h = Math.max(h, Math.abs(v)); h = (h || 1) * (1 + 1e-6);
    const b = writeBlob({ pos: g.pos, nrm: g.nrm, uv: new Array(g.pos.length / 3 * 2).fill(0), idx: g.idx }, { min: [-h, -h, -h], max: [h, h, h] }, [{ first: 0, count: g.idx.length, rgba: [255, 255, 255, 255], slot: 255, metal: 0, rough: 255 }]);
    if (b.bytes.length % 4) throw new Error('a shape blob is not a multiple of 4 bytes, so the next could not be read aligned');
    geoRec.push({ g: g.id, o: at, a: b.bytes.length }); geoBytes.push(b.bytes); at += b.bytes.length;
  }
  const geoFile = Buffer.concat(geoBytes), geoCid = sha(geoFile);

  /* ---------- the matrices: the parts, then the rings ---------- */
  const partRows = [], ringRows = []; let row = 0;
  const partRecs = [], ringRecs = [];
  K.objects.forEach((o, oi) => {
    o.parts.forEach((p) => { partRows.push(...p.m); partRecs.push(`KPART-I${oi}-G${p.geo}-N${lc(p.mat)}-F${p.face + 1}-J${p.ring + 1}-O${p.order}-Q${row}`); row++; });
    o.rings.forEach((r, ri) => { if (!r) return; ringRecs.push(`KRING-I${oi}-J${ri}-Q${ringRows.length / 20}`); ringRows.push(...r.parent, ...r.pos, r.rx, r.ry, r.rz, r.s, 0); });
  });
  const rowsFile = Buffer.from(new Float32Array([...partRows, ...ringRows]).buffer), rowsCid = sha(rowsFile);

  /* ---------- the words of the faces ---------- */
  const wordParts = [], faceRecs = []; let wat = 0;
  K.faces.forEach((f) => { const buf = Buffer.from(wordsOf(f.ops), 'utf8'); faceRecs.push(`KFACE-F${f.id}-V${T(f.w)}-W${T(f.h)}-T${T(f.pw)}-S${T(f.ph)}-O${wat}-A${buf.length}`); wordParts.push(buf); wat += buf.length; });
  const wordsFile = Buffer.concat(wordParts), wordsCid = sha(wordsFile);

  /* ---------- the pose: gains read from the stage's own pose() ---------- */
  const rest = c.REST_YAW, G0 = 1e-4;
  const withRings = st.pose.ids.findIndex((id, i) => K.K.items[i].rings.length > 0);
  const cell = (i) => st.cells[K.K.items[i].cell];
  const p1 = K.poseAt(1, 0, rest, 0), p0 = K.poseAt(0, 0, rest, 0), pl = K.poseAt(1, 1, rest, 0);
  const ybase = p1.pos[1] - cell(0).pos[1], fall = (p1.pos[1] - p0.pos[1]) / (1 - G0), liftgain = pl.pos[1] - p1.pos[1];
  const r1 = K.poseAt(1, 0, rest, withRings), r0 = K.poseAt(0, 0, rest, withRings);
  const ringtilt = (r0.rings[0].rx - r1.rings[0].rx) / (1 - G0), ringshrink = (r1.rings[0].s - r0.rings[0].s) / (1 - G0);
  /* the plates: probe at a weight where cell 0's plate is half grown */
  const wHalf = (st.cells[0].pa + st.cells[0].pb) / 2, ph = K.poseAt(1, 0, rest, 0, wHalf), pf = K.poseAt(1, 0, rest, 0, 1);
  const f0 = ph.plates[0].s, platefall = (cell(0).pos[1] - ph.plates[0].p[1]) / (1 - f0), rimlift = pf.rims[0].p[1] - pf.plates[0].p[1];
  /* where the stage hides an object: the weight below which `visible` is false */
  let lo = 0, hi = 1; for (let n = 0; n < 40; n++) { const m = (lo + hi) / 2, s = K.poseAt(m, 0, rest, 0); (s.visible ? (hi = m) : (lo = m)); }
  const visU = hi, visat = K.poseAt(visU, 0, rest, 0).s / c.SC;
  /* the weight below which the stage hides every mesh (`vis <= .001`: no draw call at all) */
  let wl = 0, wh = 1; for (let n = 0; n < 40; n++) { const m = (wl + wh) / 2; (K.poseAt(1, 0, rest, 0, m).shown ? (wh = m) : (wl = m)); }
  const minvis = wh;
  const ms = Object.fromEntries(Object.entries(st.follow).map(([n, v]) => [n, v.ms]));

  /* ---------- the records ---------- */
  const cfg = { cols: c.COLS, rows: c.ROWS, per: c.PER, sp: c.SP, rise: c.RISE, depth: c.DEPTH, sc: c.SC, restyaw: c.REST_YAW, elev: c.ELEV, ox: st.O[0], oy: st.O[1], oz: st.O[2],
    ybase, fall, liftgain, ringtilt, ringshrink, visat, minvis, platefall, rimlift, rowsparts: partRows.length / 12,
    tauboard: st.taus.board, taupage: st.taus.page, taulift: st.taus.lift, tauturn: st.taus.turn };
  for (const [n, v] of Object.entries(cfg)) add(`KCFG-N${n}-V${T(v)}`);
  add(`KBLOB-Ngeo-C${geoCid}-A${geoFile.length}`); add(`KBLOB-Nrows-C${rowsCid}-A${rowsFile.length}`); add(`KBLOB-Nwords-C${wordsCid}-A${wordsFile.length}`);
  for (const g of geoRec) add(`KGEO-G${g.g}-O${g.o}-A${g.a}`);
  /* the materials: how each draws, and what tints it */
  for (const [name, m] of Object.entries(K.mats)) {
    const o = m.opts, draw = m.kind === 'shader' ? 2 : m.kind === 'basic' ? (o.blending === 2 ? 1 : 0) : 0;
    if (m.kind === 'basic' && o.blending !== 2) throw new Error('the material ' + name + ' is a plain basic material, which the Kit has no draw for. Update scripts/kit-encode.mjs.');
    const flags = (o.side === 2 ? 1 : 0) | (o.depthWrite === false ? 2 : 0);
    /* an emissive tint in proportion to the colour is the mesh pass's `emission` (it adds base x emission); one that is not (the glass's tiny warm glow) is left out and reported */
    let emission = 0, emissionLeft = false;
    const ce = m.emissive, cc = m.color, ek = Object.keys(ce).filter((k) => Math.abs(ce[k]) > 1e-9), ck = Object.keys(cc).filter((k) => Math.abs(cc[k]) > 1e-9);
    if (ek.length && m.kind !== 'shader') {
      const ratio = ce[ek[0]] / (cc[ek[0]] || 1e-9), same = ek.length === ck.length && ek.every((k) => Math.abs(ce[k] - cc[k] * ratio) < 1e-6);
      if (same) emission = ratio * (o.emissiveIntensity == null ? 1 : o.emissiveIntensity); else emissionLeft = true;
    }
    add(`KMAT-N${lc(name)}-F${draw}-V${T(o.opacity == null ? 1 : o.opacity)}-W${T(o.metalness == null ? 0 : o.metalness)}-U${T(o.roughness == null ? 1 : o.roughness)}-T${T(o.clearcoat || 0)}-S${T(o.clearcoatRoughness || 0)}-B${T(emission)}-L${T(m.grain || 0)}-J${flags}`);
    /* an emissive tint that is not in proportion to the colour (the glass's warm glow) is its own slot: the page draws it as light that adds over the glass */
    const slots = m.kind === 'shader' ? [[2, m.channels.ink], [3, m.channels.acc], [4, m.channels.warn]] : [[0, m.color]].concat(emissionLeft ? [[1, m.emissive]] : []);
    if (emissionLeft) K.emissionLeft = (K.emissionLeft || []).concat(name);
    for (const [slot, w] of slots) for (const [tk, v] of Object.entries(w)) if (Math.abs(v) > 1e-9) add(`KTINT-N${lc(name)}-X${hex(tk)}-V${T(v)}-F${slot}`);
  }
  for (const [tk, where] of Object.entries(K.tokens)) add(`KTOKEN-X${hex(tk)}-N${where === 'both' ? 'body' : where}`);
  K.objects.forEach((o, i) => add(`KOBJ-I${i}-X${hex(o.id)}`));
  partRecs.forEach(add); ringRecs.forEach(add); faceRecs.forEach(add);
  st.cells.forEach((q, i) => add(`KCELL-I${i}-V${T(q.pos[0])}-W${T(q.pos[1])}-U${T(q.pos[2])}-T${T(q.a)}-S${T(q.b)}-B${T(q.pa)}-H${T(q.pb)}`));
  for (const [t, v] of st.grow) add(`KKNOT-Ngrow-V${T(t)}-W${T(v)}`);
  /* the cameras: the grid's, and the chosen object's as an offset from its cell (the same for every cell: proved below) */
  const g = st.camGrid, s0 = st.camSel[0], c0 = st.cells[s0.cell].pos;
  for (const s of st.camSel) { const q = st.cells[s.cell].pos; if (Math.abs((s.aim[0] - q[0]) - (s0.aim[0] - c0[0])) > 1e-9 || Math.abs((s.aim[1] - q[1]) - (s0.aim[1] - c0[1])) > 1e-9 || Math.abs((s.aim[2] - q[2]) - (s0.aim[2] - c0[2])) > 1e-9 || JSON.stringify(s.fit) !== JSON.stringify(s0.fit)) throw new Error('the camera on a chosen object is not the same offset from every cell; the record (an offset from the cell) cannot hold it. Re-read kit-stage.js target().'); }
  add(`KVIEW-Ngrid-V${T(g.aim[0])}-W${T(g.aim[1])}-U${T(g.aim[2])}-T${T(g.fit.w)}-S${T(g.fit.h)}-B${T(g.fit.fill)}-H${T(g.elev)}-D${T(g.yaw)}-E${T(g.tilt)}-P${T(g.n)}`);
  add(`KVIEW-Nsel-V${T(s0.aim[0] - c0[0])}-W${T(s0.aim[1] - c0[1])}-U${T(s0.aim[2] - c0[2])}-T${T(s0.fit.w)}-S${T(s0.fit.h)}-B${T(s0.fit.fill)}-H${T(s0.elev)}-D${T(s0.yaw)}-E${T(s0.tilt)}-P${T(s0.n)}`);
  /* the labels hang at one offset from the cell */
  const lab = st.labels.map((l) => { const o = K.K.byId[l.id]; const q = st.cells[o.cell].pos; return [l.p[0] - q[0], l.p[1] - q[1], l.p[2] - q[2]]; });
  for (const l of lab) if (Math.abs(l[0] - lab[0][0]) + Math.abs(l[1] - lab[0][1]) + Math.abs(l[2] - lab[0][2]) > 1e-9) throw new Error('the labels do not hang at one offset from their cell; the record (one offset) cannot hold them. Re-read kit-stage.js labelAt().');
  add(`KLABEL-V${T(lab[0][0])}-W${T(lab[0][1])}-U${T(lab[0][2])}`);
  add(`KSHEET-F0-G${st.plate.geo}-N${lc(st.plate.mat)}-O${st.plate.order}`); add(`KSHEET-F1-G${st.rim.geo}-N${lc(st.rim.mat)}-O${st.rim.order}`);
  const text = lines.join('\n') + '\n';

  /* ---------- the pose proof: the records, decoded as the page decodes them, against the stage's own pose() ---------- */
  const dec = decodeKit(text), P = createKitPose(dec, sample), proof = { checks: 0, worst: 0 };
  const eq = (what, a, b, tol = 4e-4) => { proof.checks++; const d = Math.abs(a - b); proof.worst = Math.max(proof.worst, d); if (!(d <= tol)) throw new Error('the pose proof failed: ' + what + ' is ' + a + ' from the records and ' + b + ' from kit-stage.js (difference ' + d + '). Re-read kit-stage.js pose() and update js/world2/kit-pose.mjs.'); };
  const ids = K.order, items = K.K.items, ringItems = items.map((it, i) => (it.rings.length ? i : -1)).filter((i) => i >= 0);
  for (const i of [0, 1, 4, 8, withRings, ringItems[ringItems.length - 1]]) for (let u = 0; u <= 1.0001; u += 1 / 40) for (const lift of [0, .5, 1]) for (const turn of [rest, -.1, 0]) {
    const a = K.poseAt(u, lift, turn, i), b = P.item(items[i].cell, u, lift, turn);
    eq('visible of ' + ids[i] + ' at u ' + u.toFixed(3), a.visible ? 1 : 0, b.visible ? 1 : 0, 0.5 * 1e-9 + (Math.abs(b.g - dec.c.visat) < 2e-3 ? 1 : 0));
    if (!a.visible) continue;
    for (let q = 0; q < 3; q++) eq('position ' + 'xyz'[q] + ' of ' + ids[i] + ' u ' + u.toFixed(3), a.pos[q], b.pos[q]);
    eq('scale of ' + ids[i], a.s, b.s); eq('yaw', a.yaw, b.yaw);
    a.rings.forEach((r, ri) => { eq('ring tilt of ' + ids[i], r.rx, items[i].rings[ri].rx + b.ringTilt); eq('ring size of ' + ids[i], r.s, b.ringScale); });
  }
  for (let w = 0; w <= 1.0001; w += 1 / 40) {
    const a = K.poseAt(1, 0, rest, 0, w);
    eq('hidden at weight ' + w.toFixed(3), a.shown ? 1 : 0, w > dec.c.minvis ? 1 : 0, Math.abs(w - dec.c.minvis) < 1e-3 ? 1 : 0);
    if (!a.shown) continue;
    for (let n = 0; n < c.PER; n++) {
      const pl = P.plate(n, w, true), shown = a.plates[n].s > 1e-3;
      eq('plate ' + n + ' shown at weight ' + w.toFixed(3), shown ? 1 : 0, pl ? 1 : 0, Math.abs(a.plates[n].s - dec.c.visat) < 2e-3 ? 1 : 0);
      if (!pl || !shown) continue;
      eq('plate size', a.plates[n].s, pl.s); for (let q = 0; q < 3; q++) { eq('plate place', a.plates[n].p[q], pl.plate[q]); eq('rim place', a.rims[n].p[q], pl.rim[q]); }
    }
  }
  /* the state: for each state the page can send, what the stage's followers want against what the records say */
  const board05 = K.K.items.map((it) => it.id), pageOf = (id) => Math.floor(board05.indexOf(id) / c.PER);
  const F = K.followers, cellOf = (id) => items[board05.indexOf(id)].cell, total = ids.length;
  let prev = { board: '05', sel: '', page: 0 };
  const states = [{ b: '01' }, { b: '05', s: '' }, { b: '05', p: 2 }, { b: '05', p: '3' }, { b: '05', s: ids[4] }, { b: '05', s: ids[17] }, { b: '05', s: ids[29] }, { b: '05', s: 'nothing' }, { b: '02', s: ids[4], p: 1 }, { b: '05', s: '', p: 99 }, { view: 'kit' }];
  for (const stt of states) {
    K.def.set(stt, 1, false);
    const mine = P.state(stt, prev, ids, ids); prev = mine;
    F.boardF.forced = F.pageF.forced = F.liftF.forced = F.turnF.forced = null; K.K.pose(1, 100000, 0);
    const w0 = P.wants(mine, '', -1);
    eq('board want in ' + JSON.stringify(stt), F.boardF.v[0], w0.board);
    /* the stage steps its page, lift and turn followers only while it draws (vis over .001): on another board they keep what they had, so nothing is asked of them there */
    if (mine.board === '05') ids.forEach((id, i) => { const w = P.wants(mine, id, pageOf(id)); eq('page want of ' + id + ' in ' + JSON.stringify(stt), F.pageF.v[i], w.page); eq('lift want', F.liftF.v[i], w.lift); eq('turn want', F.turnF.v[i], w.turn); });
    eq('cells on the page', ((P.cellsOnPage(total, mine.page))), Math.max(0, Math.min(c.PER, total - mine.page * c.PER)));
    const cam = P.camera(mine, cellOf), src = K.def.target({}, 1.6);
    if (mine.board === '05') {
      for (let q = 0; q < 3; q++) eq('camera aim', src.aim['xyz'[q]], cam.aim[q]);
      eq('camera fit w', src.dist.fit.w, cam.fitW); eq('camera fit h', src.dist.fit.h, cam.fitH); eq('camera fill', src.dist.fit.fill, cam.fill); eq('elev', src.elev, cam.elev); eq('yaw', src.yaw, cam.yaw); eq('tilt', src.tilt, cam.tilt); eq('back', src.n, cam.back);
    } else if (cam !== null) throw new Error('the camera of a board other than 05 is the calm pose, but the records gave a view');
    const tg = K.def.tags();
    tg.forEach((t) => { const l = P.label(cellOf(t.id)); for (let q = 0; q < 3; q++) eq('label of ' + t.id, t.p['xyz'[q]], l[q]); eq('label on', t.on ? 1 : 0, mine.board === '05' && pageOf(t.id) === mine.page && !!mine.sel && mine.sel === t.id ? 1 : 0); });
  }

  const report = { records: lines.length, bytes: Buffer.byteLength(text), shapes: K.geos.length, shapeBytes: geoFile.length, rowsBytes: rowsFile.length, wordsBytes: wordsFile.length, objects: K.objects.length, parts: partRows.length / 12, rings: ringRows.length / 20, faces: K.faces.length, proof, emissionLeft: K.emissionLeft || [], geoCid, rowsCid, wordsCid };
  if (write) {
    fs.mkdirSync(WORLD, { recursive: true });
    fs.writeFileSync(path.join(WORLD, geoCid + '.bin'), geoFile); fs.writeFileSync(path.join(WORLD, rowsCid + '.bin'), rowsFile); fs.writeFileSync(path.join(WORLD, wordsCid + '.txt'), wordsFile);
    fs.writeFileSync(path.join(WORLD, 'kit.flx'), text);
  }
  return { text, report };
}

async function main() {
  const { report: r } = await encodeKit();
  console.log(`kit-encode: ${r.records} records (${r.bytes} bytes), ${r.objects} objects, ${r.parts} parts, ${r.rings} rings, ${r.faces} faces, ${r.shapes} shapes (${r.shapeBytes} bytes), rows ${r.rowsBytes} bytes, words ${r.wordsBytes} bytes; pose proof ${r.proof.checks} checks, worst difference ${r.proof.worst.toExponential(2)}${r.emissionLeft.length ? '; the emissive tint of ' + r.emissionLeft.join(', ') + ' is drawn as added light' : ''}`);
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error('kit-encode: ' + e.message); process.exit(1); });
