/* The two radio.fxn site panes of home, as rows (docs/design/world-grammar/PORT.md, "home causes": the panes were the one part of home the grammar world did not draw).
   Build side, Node built-ins only; no Three.js, no library.

   scripts/lib/stage-src/home-sites.js draws each pane with Three.js: a bevelled block of glass, four edge bars of light, a canvas of words, a line of light from the pane's foot to its ring with a bead
   at each end, a rise out of the ring, a lift under the pointer and a click. None of its maths is restated here. world-stage-eval.mjs runs the file's own text with recorders in place of
   Three.js (the same way the how-it-works views are read), and this file reads back what the file placed. A pane is a function of two numbers, both the file's own:
     rise<j>   how far pane j has come out of its ring, 0 to 1 (the file's `ru`, the share of its RISE time gone); the file turns it into scale, place, bar length and line length itself.
     hov<j>    how far the pointer has lifted pane j (the file's `panes.hov[j]`), 0 to 1.
   The rows are SAMPLES along those two channels, written by world-samples.mjs exactly as the identity and how-it-works views are: the knots are derived from the file's own answers.
   What the file does that is not a row is written as records and words, each read from the file's text or from running it:
     the words on a pane's canvas, as the canvas calls the file's own draw function makes (recorded, then replayed by the page); free text enters a record as hex of UTF-8;
     the words under the pointer (panes.label) and the ring a click goes to (panes.onPick), asked of the file's own functions;
     the rise's length, the stagger between panes, the sink's length, and the moment a ring has built (read from the file's text, with the text that must still be there checked).
   What the page must do, because it depends on the page and not on the data: the pane slides along the screen until it stands clear of the words and the side column (home-sites.js fit()).
   That measures the page's own boxes, so it cannot be a row; world2-sites.mjs does it and moves a pane's rows by the slide.
   Two Three.js facts the recorders did not carry, added here and nowhere else: Euler order 'YXZ' (the file turns a pane by yaw then tilt), and the quaternion that turns y onto a direction
   (the line's cylinders). Both are Three.js's own formulas. Not written, because the site's law is that animations settle: nothing loops. */
import fs from 'node:fs';
import path from 'node:path';
import { TONES, row, RX, S, chain } from './world-rows.mjs';
import { createHarness, V3, M4, Quat, Euler, opsToWords } from './world-stage-eval.mjs';
import { sampleParts, partRecords } from './world-samples.mjs';
import { stageSrc } from './stage-src.mjs';

export const SITES_VIEW = 'sites';
const PI = Math.PI, r4 = (x) => Math.round(x * 1e4) / 1e4;
const clean = (s) => String(s == null ? '' : s).replace(/[\t\r\n]+/g, ' ').trim();

/* ---------- the two Three.js facts the recorders lacked ---------- */
class SiteEuler extends Euler { set(x, y, z, order) { this.x = x; this.y = y; this.z = z; this.order = order || 'XYZ'; return this; } }
class SiteQuat extends Quat {
  /* Three.js Quaternion.setFromEuler for the two orders a stage file uses: XYZ (the recorder's own) and YXZ (home-sites.js frame()) */
  setFromEuler(e) {
    if (e.order !== 'YXZ') return super.setFromEuler(e);
    const c1 = Math.cos(e.x / 2), c2 = Math.cos(e.y / 2), c3 = Math.cos(e.z / 2), s1 = Math.sin(e.x / 2), s2 = Math.sin(e.y / 2), s3 = Math.sin(e.z / 2);
    this.x = s1 * c2 * c3 + c1 * s2 * s3; this.y = c1 * s2 * c3 - s1 * c2 * s3; this.z = c1 * c2 * s3 - s1 * s2 * c3; this.w = c1 * c2 * c3 + s1 * s2 * s3; return this;
  }
  /* Three.js Quaternion.setFromUnitVectors: the turn that takes unit vector a onto unit vector b */
  setFromUnitVectors(a, b) {
    let r = a.x * b.x + a.y * b.y + a.z * b.z + 1;
    if (r < 1e-8) { r = 0; if (Math.abs(a.x) > Math.abs(a.z)) { this.x = -a.y; this.y = a.x; this.z = 0; this.w = r; } else { this.x = 0; this.y = -a.z; this.z = a.y; this.w = r; } }
    else { this.x = a.y * b.z - a.z * b.y; this.y = a.z * b.x - a.x * b.z; this.z = a.x * b.y - a.y * b.x; this.w = r; }
    const l = Math.hypot(this.x, this.y, this.z, this.w) || 1; this.x /= l; this.y /= l; this.z /= l; this.w /= l; return this;
  }
}
class SiteV3 extends V3 {
  subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
  length() { return Math.hypot(this.x, this.y, this.z); }
}

/* the file builds one camera to measure the page's boxes with (fit()); the encoder never runs fit, so the camera only has to exist */
class SiteCam { constructor() { this.position = new SiteV3(); this.quaternion = new SiteQuat(); this.projectionMatrix = new M4(); this.projectionMatrixInverse = new M4(); } lookAt() {} updateMatrixWorld() {} }

/* a plate's 2D context that also keeps the two calls the recorder drops, a rounded corner (arcTo) and a linear gradient: home-sites.js draws its panes' rounded squares and its sheen with them.
   world-stage-eval.mjs recordingContext keeps the calls that every stage file's plates make; these two are kept here so the other views' bytes do not move. A gradient is `linearGradient`
   (its number and its two ends), each `colorStop` (its number, where, colour), and a fill that uses it writes `grad:<number>`; world2-plates.mjs replays them. */
function withArcs(g) {
  const ops = g.ops; let n = 0;
  return new Proxy(g, {
    get(t, k) {
      if (k === 'arcTo') return (...a) => { ops.push(['arcTo', ...a]); };
      if (k === 'createLinearGradient') return (...a) => { const id = n++; ops.push(['linearGradient', id, ...a]); return { gradient: id, addColorStop: (at, c) => { ops.push(['colorStop', id, at, c]); } }; };
      return t[k];
    },
    set(t, k, v) { if (k === 'fillStyle' && v && typeof v === 'object' && 'gradient' in v) { ops.push(['fillStyle', 'grad:' + v.gradient]); return true; } t[k] = v; return true; }
  });
}

/* what home-sites.js says in its own text that a run of it cannot say: how long its rise, its sink and the stagger between panes are; how long after its ring a pane waits; how fast a pane follows
   the pointer (ring-kit.js's hover rule, which blockSet uses). Each is lifted with the text around it, and a file that no longer holds it stops the encoder with the file's name. */
function lift(file, src, re, what) {
  const m = re.exec(src);
  if (!m) throw new Error(path.basename(file) + ' no longer holds the text for ' + what + ', so the panes cannot be written from it. Re-read ' + path.basename(file) + ', update scripts/lib/world-sites-scene.mjs to the new text, and run the encoder again.');
  return m;
}

export function sitesScene({ N, cast, cubes, site, elev }) {
  const file = stageSrc('home-sites.js'), src = fs.readFileSync(file, 'utf8');
  const [, rise, stagger] = lift(file, src, /var RISE = (\d+), STAGGER = (\d+);/, 'the rise and the stagger between panes'), [, sink] = lift(file, src, /var SINK = (\d+);/, 'the sink');
  const [, builtAfter] = lift(file, src, /built: \(r\.at \|\| 0\) \+ (\d+)/, 'how long after its ring starts a pane waits');
  const kitFile = stageSrc('ring-kit.js'), kit = fs.readFileSync(kitFile, 'utf8'), [, hovStep] = lift(kitFile, kit, /s\.hov\[j\] \+= d \* ([0-9.]+)/, 'the pointer follower of a block set');
  const chainsFile = stageSrc('chains-scene.js'), [, ringLag] = lift(chainsFile, fs.readFileSync(chainsFile, 'utf8'), /var RING_LAG = (\d+)/, 'the wait between rings');
  const RISE = +rise, SINK = +sink;

  const h = createHarness({ site, N, cast, cubes, data: {}, END: 4700 });
  /* the recorders' classes, with the two missing facts */
  Object.assign(h.THREE, { Vector3: SiteV3, Quaternion: SiteQuat, Euler: SiteEuler, PerspectiveCamera: SiteCam });
  const afters = []; let clock = 0;
  h.W.after = (fn) => { afters.push(fn); };
  h.k.time = () => clock;
  h.k.cam = { elev: elev * PI / 180, aim: new V3(), dist: 99, yaw: 0 };
  h.ctx.document.addEventListener = () => {};
  h.W.ringList.forEach((r) => { if (!r.parent) r.at = cast.order.indexOf(r.i) * +ringLag; });
  const plateOf = h.k.textPlate; h.k.textPlate = (w, hh, draw) => plateOf(w, hh, (g, cw, ch) => draw(withArcs(g), cw, ch));
  const picked = []; h.ctx.DEFXNScene.hooks.pickRing = (i) => { picked.push(i); };
  h.run('sites', src);
  const api = h.ctx.DEFXNScene.sites, after = afters[0];
  if (!api || !api.ids || !after) throw new Error('home-sites.js ran but left no S.sites or no after() callback, so its panes cannot be read. Re-read the file: it must offer S.sites.show(id, on) and register one W.after.');
  const ids = api.ids, nPane = ids.length;

  /* the sets the file made, found by what they are: one block set (the glass), one edge light, three instanced light sets (core and halo of the line, then the beads), and the canvases */
  const blocks = h.sets.filter((s) => s.kind === 'block'), edges = h.sets.filter((s) => s.kind === 'edge'), inst = h.sets.filter((s) => s.kind === 'instanced');
  const cyl = inst.filter((s) => s.geo && s.geo.type === 'CylinderGeometry'), sph = inst.filter((s) => s.geo && s.geo.type === 'SphereGeometry');
  if (blocks.length !== 1 || edges.length !== 1 || cyl.length !== 2 || sph.length !== 1 || h.plates.length !== nPane) throw new Error('home-sites.js now builds ' + [blocks.length + ' block sets', edges.length + ' edge sets', cyl.length + ' cylinder sets', sph.length + ' sphere sets', h.plates.length + ' plates'].join(', ') + ' where the encoder reads one glass set, one edge set, two cylinder sets, one sphere set and one plate for each pane. Update scripts/lib/world-sites-scene.mjs to the new shape.');
  const [glass] = blocks, [edge] = edges, [bead] = sph, rods = cyl.slice().sort((a, b) => (b.mat.opacity == null ? 1 : b.mat.opacity) - (a.mat.opacity == null ? 1 : a.mat.opacity)), [core, halo] = rods;   /* the line's solid core first, its soft halo second */
  if (glass.geo.type !== 'bevel') throw new Error('the panes\' glass is a ' + glass.geo.type + ', not the bevelled block the encoder reads');
  const opac = (s) => (s.mat && s.mat.opacity != null ? s.mat.opacity : 1);

  /* ---------- the questions the file answers itself: which ring a pane belongs to, what the pointer says, where a click goes ---------- */
  const ringOf = [], words = [];
  for (let j = 0; j < nPane; j++) {
    const at = picked.length; glass.onPick(j);
    if (picked.length !== at + 1) throw new Error('pane ' + j + ' of home-sites.js does nothing when touched, so no ring can be written for it');
    ringOf[j] = picked[at];
    const lab = glass.label(j); words[j] = [lab.name, lab.act];
  }
  const built = ringOf.map((ri) => Math.round(h.W.ringList[ri].at + +builtAfter));

  /* ---------- one evaluation: the file's own after(), at the values of the channels, read back as rows ---------- */
  const MS = 1e6, ends = {};
  let learn = true;
  const NULL = () => h.NULL();
  const colourRow = (m, col, alpha) => { const [t, f, mx] = h.colourOf(col); return row(m, t, f, mx, alpha); };
  const geoBox = glass.geo, plate = (j) => h.plates[j];
  function evaluate(v) {
    for (let j = 0; j < nPane; j++) { clock = MS - v['rise' + j] * RISE; api.show(ids[j], true); glass.hov[j] = v['hov' + j]; }
    afters.forEach((fn) => fn(MS));
    const out = {};
    for (let j = 0; j < nPane; j++) {
      const live = (s, i) => s.shown !== false && s.visible !== false && s.placed[i];
      /* the glass: the block's own matrix, tinted by the stage */
      out['s' + j + 'b'] = [live(glass, j) ? colourRow(glass.base[j].e, glass.color[j], 1) : NULL()];
      /* the four bars of light that edge it: a gain on the signal tone */
      out['s' + j + 'e'] = [0, 1, 2, 3].map((q) => (live(edge, j * 4 + q) ? row(edge.base[j * 4 + q].e, TONES[edge.tone], 0, 0, edge.gain) : NULL()));
      /* the canvas of words: a unit quad laid in the pane's plane, the plate's size */
      const p = plate(j);
      out['s' + j + 't'] = [p.m ? row(chain(p.m.e, RX(PI / 2), S(p.w, 1, p.h)), TONES.text, 0, 0, 1) : NULL()];
      /* the line: its two ends and its radius (the cylinder the file laid between them), a row for the core and one for the halo */
      /* a line the file has not laid yet (a radius of nothing) keeps the ends it has at rest and a radius of 0, so the line between two knots grows from where it stands */
      const rod = (s) => {
        const e = live(s, j) ? s.base[j].e : null, rad = e ? Math.hypot(e[0], e[1], e[2]) : 0, len = e ? Math.hypot(e[4], e[5], e[6]) : 0;
        const [t, f, mx] = h.colourOf(s.color[j]);
        if (rad < 1e-3 || len < 1e-3) { const at = ends[s.id + ':' + j]; return at ? [...at, 0, 0, 0, 0, 0, 0, t, f, mx, opac(s)] : null; }
        const a = [e[12], e[13], e[14]], c = [a[0] + e[4], a[1] + e[5], a[2] + e[6]];
        return [a[0], a[1], a[2], c[0], c[1], c[2], rad, 0, 0, 0, 0, 0, t, f, mx, opac(s)];
      };
      out['s' + j + 'r'] = [rod(core), rod(halo)].map((r) => r || NULL());
      if (learn) [core, halo].forEach((s, q) => { const r = out['s' + j + 'r'][q]; if (r[15] >= 0) ends[s.id + ':' + j] = r.slice(0, 6); });
      /* the two beads: one on the ring, one at the pane's foot */
      out['s' + j + 'f'] = [live(bead, j * 2) ? colourRow(bead.base[j * 2].e, bead.color[j * 2], 1) : NULL()];
      out['s' + j + 'd'] = [live(bead, j * 2 + 1) ? colourRow(bead.base[j * 2 + 1].e, bead.color[j * 2 + 1], 1) : NULL()];
    }
    return out;
  }

  /* ---------- the channels and where they rest: a pane is out of its ring and not lifted ---------- */
  const chans = {}, rest = {};
  for (let j = 0; j < nPane; j++) { chans['rise' + j] = { lo: 0, hi: 1, rest: 1, N: 24 }; chans['hov' + j] = { lo: 0, hi: 1, rest: 0, N: 8 }; rest['rise' + j] = 1; rest['hov' + j] = 0; }

  /* the rest picture first: where each pane stands and where its line starts, for the page's slide */
  const restRows = evaluate(rest); learn = false;
  /* the share of the way out of its ring a pane has come, read from where its glass is: the file puts the pane at foot + (place - foot) x u, so u is that vector's share along (place - foot). A part
     whose rows are `none` stay where they are; `end` moves the line's far end; `all` moves a whole row. The page slides a pane by u x slide. */
  const mkParts = () => {
    const parts = {};
    for (let j = 0; j < nPane; j++) {
      const n = 's' + j, boxArgs = [geoBox.w, geoBox.h, geoBox.d, r4(geoBox.r)], m = glass.mesh.material;
      parts[n + 'b'] = { kind: 'pane', args: [...boxArgs, m.opacity, m.metalness, m.roughness, m.clearcoat, m.clearcoatRoughness, m.envMapIntensity], shift: 'all', pane: j, count: 1 };
      parts[n + 'e'] = { kind: 'glowcube', args: [], shift: 'all', pane: j, count: 4 };
      parts[n + 't'] = { kind: 'text', args: [], shift: 'all', pane: j, count: 1 };
      parts[n + 'r'] = { kind: 'rod', args: [8], shift: 'end', pane: j, count: 2 };
      parts[n + 'f'] = { kind: 'glowsphere', args: [], shift: 'none', pane: j, count: 1 };
      parts[n + 'd'] = { kind: 'glowsphere', args: [], shift: 'all', pane: j, count: 1 };
    }
    return parts;
  };
  const parts = mkParts();
  /* the share u(rise) of each pane, sampled like a part: a row whose first number is u */
  const share = (j) => (values) => {
    const here = evaluate({ ...values, ['hov' + j]: 0 }), restHere = evaluate({ ...values, ['rise' + j]: 1, ['hov' + j]: 0 });
    const g = here['s' + j + 'b'][0], g1 = restHere['s' + j + 'b'][0], foot = [restHere['s' + j + 'r'][0][0], restHere['s' + j + 'r'][0][1], restHere['s' + j + 'r'][0][2]];
    const at = [g1[9], g1[10], g1[11]], d = [at[0] - foot[0], at[1] - foot[1], at[2] - foot[2]], dd = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
    if (g[15] < 0) return [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]];   /* hidden at this value (the file shrinks the pane to a point): the share is still the file's rise */
    const u = ((g[9] - foot[0]) * d[0] + (g[10] - foot[1]) * d[1] + (g[11] - foot[2]) * d[2]) / dd;
    return [[u, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]];
  };
  for (let j = 0; j < nPane; j++) parts['s' + j + 'c'] = { kind: 'ctl', args: [], shift: 'none', pane: j, count: 1 };

  const pose = (values) => {
    const all = evaluate(values), out = { ...all };
    for (let j = 0; j < nPane; j++) out['s' + j + 'c'] = share(j)(values);
    return out;
  };

  const sampled = {};
  for (let j = 0; j < nPane; j++) {
    const mine = Object.keys(parts).filter((n) => parts[n].pane === j), own = { ['rise' + j]: chans['rise' + j], ['hov' + j]: chans['hov' + j] };
    const poseJ = (values) => { const o = {}, all = pose(values); for (const n of mine) o[n] = all[n]; return o; };
    /* the other pane's channels stay at rest: a part is a function of its own pane's two channels */
    Object.assign(sampled, sampleParts((vals) => poseJ({ ...rest, ...vals }), own, rest, mine));
  }
  /* the rest rows at full rise, for the page's slide: the glass's place and the line's first end */
  const spots = ids.map((id, j) => {
    const g = restRows['s' + j + 'b'][0], r0 = restRows['s' + j + 'r'][0];
    return { id, ring: ringOf[j], at: [r4(g[9]), r4(g[10]), r4(g[11])], foot: [r4(r0[0]), r4(r0[1]), r4(r0[2])] };
  });

  /* the canvas calls of each pane's plate, the plate's size, and the words under the pointer */
  const plateText = h.plates.map((p) => ['ops', r4(p.w), r4(p.h), 'plain', '-', '-', 0, p.cv.width, ...opsToWords(p.ops)]);
  return { ids, ringOf, built, words, parts, sampled, chans, rest, rise: RISE, stagger: +stagger, sink: SINK, hovStep: +hovStep, spots, derived: h.derived, plateText, base: h.BASE, nPane };
}

/* the group's records and files: a blob of rows (the pool of distinct rows and a table of 16-bit indexes for each frame), the records that name them, one hex record for each free text,
   and the words file that says what each part is (kind lines) and the colours that are mixes of tones (mixtone lines). R is the group's own name, `sites`. */
export function sitesRecords(scene, { num, sha }) {
  const G = SITES_VIEW, rec = [], buf = [], layout = [], files = [], lines = [];
  let atByte = 0;
  const hex = (text) => Buffer.from(String(text), 'utf8').toString('hex');
  for (const name of Object.keys(scene.parts)) {
    const list = scene.sampled[name] || null;
    if (!list) continue;
    const pr = partRecords(G, G, name, list, atByte, num, 0);
    rec.push(...pr.rec); buf.push(pr.rows, pr.idx); atByte += pr.bytes;
    layout.push({ view: G, name, pool: pr.pool, frames: pr.frames, bytes: pr.bytes });
  }
  const bytes = Buffer.concat(buf), cid = sha(bytes);
  files.push({ name: cid + '.bin', bytes });
  rec.unshift(`WFRAME-R${G}-C${cid}-A${bytes.length}`);
  /* the numbers the file's text gave: how long a rise, a sink and the stagger take, how fast a pane follows the pointer */
  rec.push(`WSET-R${G}-I0-Nrise-V${num(scene.rise)}`, `WSET-R${G}-I0-Nsink-V${num(scene.sink)}`, `WSET-R${G}-I0-Nstagger-V${num(scene.stagger)}`, `WSET-R${G}-I0-Nhovstep-V${num(scene.hovStep)}`);
  scene.ids.forEach((id, j) => { rec.push(`WSET-R${G}-I${j}-Nring-V${scene.ringOf[j]}`, `WSET-R${G}-I${j}-Nbuilt-V${num(scene.built[j])}`); });
  /* the free text: what the pointer says over each pane, and the canvas calls of each pane's words, as hex of UTF-8 */
  scene.ids.forEach((id, j) => {
    scene.words[j].forEach((w, k) => rec.push(`WTEXT-R${G}-Ms${j}b-I${k}-HX${hex(w)}`));
    /* a pane whose canvas calls are the same as an earlier pane's says so in the words file and writes no second copy */
    const text = scene.plateText[j].map(clean).join('\t'), twin = scene.plateText.findIndex((q, i) => i < j && q.map(clean).join('\t') === text);
    if (twin >= 0) lines.push(['same', 's' + j + 't', 's' + twin + 't']); else rec.push(`WTEXT-R${G}-Ms${j}t-I0-HX${hex(text)}`);
  });
  for (const [name, p] of Object.entries(scene.parts)) { lines.push(['kind', name, p.kind, ...p.args]); lines.push(['site', name, p.pane, p.shift]); }
  scene.derived.forEach((d) => lines.push(['mixtone', d.index, ...d.weights.flatMap(([n, w]) => [TONES[n], w])]));
  const names = Buffer.from(lines.map((l) => l.map(clean).join('\t')).join('\n') + '\n', 'utf8'), namesCid = sha(names);
  files.push({ name: namesCid + '.txt', bytes: names });
  rec.push(`WNAMES-R${G}-C${namesCid}-A${names.length}`);
  return { view: G, group: G, rec, files, layout, bytes };
}
