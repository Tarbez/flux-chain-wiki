/* The Three.js stages, run as they are and recorded (docs/design/world-grammar/PORT.md batch 3). Build side, Node built-ins only; no Three.js, no library.
   scripts/lib/stage-src/stages.js, concept-stages.js, minute-experience.js and home-descent.js place their forms with a handful of calls: a vector, a matrix, a colour, a set of blocks or tiles
   that are placed and tinted, a line of beads, a plate of words. Batch 2 restated each stage's maths by hand beside its source and guarded it with needles. This file does not restate
   a stage: it runs the stage's own text, with these calls answered by recorders, and reads back what was placed. A stage evaluated at a state and at the values of its channels
   (the step clock `t`, the followers, the weight `w`) is a frame of rows: the same rows the encoder writes, so no stage's maths exists twice.
   What a recorder answers:
     V3, M4, Quat, Euler   the vector and matrix maths the stages call, with Three.js's own layouts (a column-major matrix, Euler order XYZ).
     Col                   a colour is a weight on each theme tone (k.C.signal is 1 on `signal`; lerp and multiplyScalar are linear). It stays symbolic: the theme is read in the page.
     sets                  blockSet, tileSet, edgeLight, textPlate, instanced meshes: every place() and tint() is kept; a form never placed in a frame is hidden in that frame.
     lines                 W.lit.line and W.dots.line: each call is a run of beads whose rows follow ring-kit.js k.beads (the reveal, ease.back), capped as its n (200 lit, 240 dots).
     meshes                a Mesh in a Group at the group's position, turn and scale (the resolve stage's cube with its four rule faces).
   Where a recorder restates a line of ring-kit.js (the tile's body at LIFT + .5, ringFrame, the beads' growth) it names the line, and sourceGuard() refuses to run when that line has changed. */
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { TONES, ease, clamp01, row, mul, T, S, RX, RY, RZ } from './world-rows.mjs';
import { stageSrc } from './stage-src.mjs';

const LIFT = .16, HALF_D = .15, MID = LIFT + .5;
const NAME_OF = Object.fromEntries(Object.entries(TONES).map(([n, i]) => [i, n]));

/* ---------- vectors, matrices, turns ---------- */
export class V3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  setScalar(s) { this.x = this.y = this.z = s; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new V3(this.x, this.y, this.z); }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  lerp(v, t) { this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; this.z += (v.z - this.z) * t; return this; }
  distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
  applyMatrix4(m) { const e = m.e, x = this.x, y = this.y, z = this.z; this.x = e[0] * x + e[4] * y + e[8] * z + e[12]; this.y = e[1] * x + e[5] * y + e[9] * z + e[13]; this.z = e[2] * x + e[6] * y + e[10] * z + e[14]; return this; }
}
export class Euler { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; } set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } }
export class Quat {
  constructor() { this.x = 0; this.y = 0; this.z = 0; this.w = 1; }
  identity() { this.x = this.y = this.z = 0; this.w = 1; return this; }
  copy(q) { this.x = q.x; this.y = q.y; this.z = q.z; this.w = q.w; return this; }
  /* Three.js Quaternion.setFromEuler, order XYZ */
  setFromEuler(e) {
    const c1 = Math.cos(e.x / 2), c2 = Math.cos(e.y / 2), c3 = Math.cos(e.z / 2), s1 = Math.sin(e.x / 2), s2 = Math.sin(e.y / 2), s3 = Math.sin(e.z / 2);
    this.x = s1 * c2 * c3 + c1 * s2 * s3; this.y = c1 * s2 * c3 - s1 * c2 * s3; this.z = c1 * c2 * s3 + s1 * s2 * c3; this.w = c1 * c2 * c3 - s1 * s2 * s3; return this;
  }
}
export class M4 {
  constructor() { this.e = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
  static of(a) { const m = new M4(); m.e = a.slice(); return m; }
  identity() { this.e = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; return this; }
  copy(m) { this.e = m.e.slice(); return this; }
  clone() { return M4.of(this.e); }
  makeScale(x, y, z) { this.e = [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1]; return this; }
  makeTranslation(x, y, z) { if (x && x.x != null) ({ x, y, z } = x); this.e = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]; return this; }
  makeRotationX(a) { this.e = RX(a); return this; }
  makeRotationY(a) { this.e = RY(a); return this; }
  makeRotationZ(a) { this.e = RZ(a); return this; }
  makeBasis(x, y, z) { this.e = [x.x, x.y, x.z, 0, y.x, y.y, y.z, 0, z.x, z.y, z.z, 0, 0, 0, 0, 1]; return this; }
  compose(p, q, s) {
    const { x, y, z, w } = q, x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
    this.e = [(1 - (yy + zz)) * s.x, (xy + wz) * s.x, (xz - wy) * s.x, 0, (xy - wz) * s.y, (1 - (xx + zz)) * s.y, (yz + wx) * s.y, 0, (xz + wy) * s.z, (yz - wx) * s.z, (1 - (xx + yy)) * s.z, 0, p.x, p.y, p.z, 1];
    return this;
  }
  multiply(m) { this.e = mul(this.e, m.e); return this; }
  premultiply(m) { this.e = mul(m.e, this.e); return this; }
  scale(v) { for (let i = 0; i < 3; i++) { this.e[i] *= v.x; this.e[4 + i] *= v.y; this.e[8 + i] *= v.z; } return this; }
  setPosition(x, y, z) { if (x && x.x != null) ({ x, y, z } = x); this.e[12] = x; this.e[13] = y; this.e[14] = z; return this; }
}

/* ---------- colours: a weight on each theme tone ---------- */
const REG = new Map(), REG_OF = new Map();
const regOf = (c) => { const key = JSON.stringify(Object.entries(c.w).filter(([, v]) => Math.abs(v) > 1e-12).sort()); if (!REG_OF.has(key)) { const id = REG.size + 1; REG_OF.set(key, id); REG.set(id, { ...c.w }); } return REG_OF.get(key); };
export class Col {
  constructor(a, b, c) { this.w = {}; if (typeof a === 'number' && b === undefined) { if (a) this.w.white = 1; } else if (a !== undefined) this.w.white = (a + b + c) / 3; }
  /* a stage that keeps its colours as numbers (stats-stage.js writes tone.r, .g, .b into arrays and reads them back with setRGB) gets, from each channel, the colour's number in a table: the same colour is the same
     whole number in all three, a lerp of two equal numbers is that number, and setRGB of a number that is in the table gives the colour back. It holds wherever the stage does not blend two colours by a clock. */
  get r() { return regOf(this); } get g() { return regOf(this); } get b() { return regOf(this); }
  static tone(name) { const c = new Col(); c.w[name] = 1; return c; }
  copy(c) { this.w = { ...c.w }; return this; }
  clone() { return new Col().copy(this); }
  lerp(c, t) { const o = {}; for (const k of new Set([...Object.keys(this.w), ...Object.keys(c.w)])) o[k] = (this.w[k] || 0) * (1 - t) + (c.w[k] || 0) * t; this.w = o; return this; }
  multiplyScalar(s) { for (const k of Object.keys(this.w)) this.w[k] *= s; return this; }
  set() { return this; }
  setRGB(r, g, b) { if (r === g && g === b && REG.has(r)) this.w = { ...REG.get(r) }; else this.w = { white: (r + g + b) / 3 }; return this; }
  /* a plate's canvas takes its colours from the page's theme by name (js/world2/world2-plates.mjs, `@name`) */
  getHexString() { const ks = Object.keys(this.w).filter((k) => this.w[k] > 1e-9); if (ks.length === 1 && Math.abs(this.w[ks[0]] - 1) < 1e-9) return '@' + ks[0]; throw new Error('a plate colour that is a mix of tones (' + JSON.stringify(this.w) + ') cannot be written as a theme name'); }
  /* the tones the colour is made of, white standing as the text-strong tone (a theme's near white) */
  parts() { const o = {}; for (const [k, v] of Object.entries(this.w)) if (Math.abs(v) > 1e-9) o[k === 'white' ? 'strong' : k] = (o[k === 'white' ? 'strong' : k] || 0) + v; return o; }
}

/* ---------- a recording 2D canvas: the calls a plate or a face texture makes, kept as text for the page to replay ---------- */
const CANVAS_PROPS = new Set(['fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'font', 'letterSpacing', 'globalAlpha', 'filter', 'globalCompositeOperation']);
const CANVAS_CALLS = new Set(['fillRect', 'strokeRect', 'clearRect', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'stroke', 'fill', 'fillText', 'bezierCurveTo', 'rect']);
export function recordingContext(w, h) {
  const ops = [], g = { canvas: { width: w, height: h }, ops, letterSpacing: '0px', filter: 'none' };
  for (const p of CANVAS_PROPS) { let v = g[p]; Object.defineProperty(g, p, { get: () => v, set: (x) => { v = x; if (p !== 'canvas') ops.push([p, String(x)]); }, enumerable: true }); }
  for (const c of CANVAS_CALLS) g[c] = (...a) => { ops.push([c, ...a]); };
  g.measureText = (t) => ({ width: String(t).length * 11 });   /* the stages draw underlines by a measured width; the page measures its own */
  /* a call the recorder does not keep (a gradient, an image, a transform) does nothing: only the calls above are replayed by the page */
  return new Proxy(g, { get: (t, k) => (k in t || typeof k !== 'string' ? t[k] : (...a) => (/^create/.test(k) ? { addColorStop() {} } : undefined)), set: (t, k, v) => { t[k] = v; return true; } });
}

/* ---------- the stub of the page and of three ---------- */
/* THREE.Shape and THREE.Path as a record of their calls: glass-kit.js roundRect and circle, the lens's holes, the badge's quadratic curves. The encoder flattens the record into an outline and its holes */
class PathRec {
  constructor() { this.ops = []; this.holes = []; }
  moveTo(x, y) { this.ops.push(['M', x, y]); return this; } lineTo(x, y) { this.ops.push(['L', x, y]); return this; } quadraticCurveTo(cx, cy, x, y) { this.ops.push(['Q', cx, cy, x, y]); return this; }
  absarc(cx, cy, r, a0, a1, cw) { this.ops.push(['A', cx, cy, r, a0, a1, !!cw]); return this; } closePath() { return this; }
}
class Obj {
  constructor(type, args) { this.type = type; this.args = args || []; this.children = []; this.position = new V3(); this.scale = new V3(1, 1, 1); this.rotation = new Euler(); this.visible = true; this.material = { color: new Col() }; this.userData = {}; this.ops = []; this.attributes = {}; this.matrix = new M4(); this.matrixAutoUpdate = true; }
  add(o) { this.children.push(o); o.parent = this; return this; }
  updateMatrix() { return this; }   /* the recorder composes a mesh's matrix from its position, turn and size when it reads it (measured's plate calls this each frame) */
  rotateX(a) { this.ops.push(['rotateX', a]); return this; } rotateY(a) { this.ops.push(['rotateY', a]); return this; } rotateZ(a) { this.ops.push(['rotateZ', a]); return this; }
  translate(x, y, z) { this.ops.push(['translate', x, y, z]); return this; }
  setAttribute(name, a) { this.attributes[name] = a; return this; } setDrawRange() { return this; } setIndex() { return this; }
  dispose() {}
}
/* CatmullRomCurve3 through points with the stage's tension 0: a cubic Hermite with no tangents, so each run between two points is a straight line walked with a smooth start and stop. Its
   arc-length parameter is three's getPointAt (200 divisions, a binary search of the cumulative lengths), restated here because the tube follows it */
class Curve3 extends Obj {
  constructor(...a) { super('CatmullRomCurve3', a); this.points = a[0]; this.closed = !!a[1]; this.tension = a[3] == null ? .5 : a[3]; this.cache = null; }
  getPoint(t) {
    const pts = this.points, l = pts.length, p = (l - (this.closed ? 0 : 1)) * t;
    let i = Math.floor(p), w = p - i;
    if (this.closed) i += i > 0 ? 0 : (Math.floor(Math.abs(i) / l) + 1) * l; else if (w === 0 && i === l - 1) { i = l - 2; w = 1; }
    const p0 = this.closed || i > 0 ? pts[(i - 1) % l] : new V3().copy(pts[0]).sub(pts[1]).add(pts[0]), p1 = pts[i % l], p2 = pts[(i + 1) % l];
    const p3 = this.closed || i + 2 < l ? pts[(i + 2) % l] : new V3().copy(pts[l - 1]).sub(pts[l - 2]).add(pts[l - 1]), T_ = this.tension;
    const f = (x0, x1, x2, x3) => { const c1 = T_ * (x2 - x0), c2 = -3 * x1 + 3 * x2 - 2 * T_ * (x2 - x0) - T_ * (x3 - x1), c3 = 2 * x1 - 2 * x2 + T_ * (x2 - x0) + T_ * (x3 - x1); return x1 + c1 * w + c2 * w * w + c3 * w * w * w; };
    return new V3(f(p0.x, p1.x, p2.x, p3.x), f(p0.y, p1.y, p2.y, p3.y), f(p0.z, p1.z, p2.z, p3.z));
  }
  lengths() {
    if (this.cache) return this.cache;
    const c = [0]; let last = this.getPoint(0), sum = 0;
    for (let i = 1; i <= 200; i++) { const cur = this.getPoint(i / 200); sum += cur.distanceTo(last); c.push(sum); last = cur; }
    return (this.cache = c);
  }
  getPointAt(u) {
    const al = this.lengths(), il = al.length, target = u * al[il - 1];
    let lo = 0, hi = il - 1, i = 0;
    while (lo <= hi) { i = Math.floor(lo + (hi - lo) / 2); const cmp = al[i] - target; if (cmp < 0) lo = i + 1; else if (cmp > 0) hi = i - 1; else { hi = i; break; } }
    i = hi;
    const t = al[i] === target ? i / (il - 1) : (i + (target - al[i]) / (al[i + 1] - al[i])) / (il - 1);
    return this.getPoint(t);
  }
}
function threeStub() {
  const make = (type) => class extends Obj { constructor(...a) { super(type, a); if (type === 'Mesh' || type === 'LineSegments') { this.geometry = a[0]; this.material = a[1] || { color: new Col() }; } if (/Material$/.test(type)) { Object.assign(this, a[0] || {}); this.color = this.color instanceof Col ? this.color : new Col(); } } };
  const T3 = { Vector3: V3, Matrix4: M4, Quaternion: Quat, Euler, Color: Col };
  T3.CatmullRomCurve3 = Curve3; T3.Shape = PathRec; T3.Path = PathRec;
  for (const n of ['Group', 'Mesh', 'MeshBasicMaterial', 'MeshStandardMaterial', 'MeshPhysicalMaterial', 'ShaderMaterial', 'BoxGeometry', 'PlaneGeometry', 'CylinderGeometry', 'SphereGeometry', 'RingGeometry', 'EdgesGeometry', 'TubeGeometry', 'CanvasTexture', 'LineBasicMaterial', 'LineSegments', 'InstancedMesh', 'Raycaster', 'Vector2', 'RoundedBoxGeometry', 'BufferGeometry', 'BufferAttribute', 'Float32BufferAttribute', 'Points', 'PointsMaterial']) T3[n] = make(n);
  Object.assign(T3, { AdditiveBlending: 2, BackSide: 1, FrontSide: 0, DoubleSide: 2, SRGBColorSpace: 'srgb' });
  return T3;
}

/* sourceGuard: the text a recorder restates must still be in the file it names */
export function sourceGuard(file, needles, what) {
  const src = fs.readFileSync(file, 'utf8');
  for (const n of needles) if (!src.includes(n)) throw new Error(path.basename(file) + ' no longer holds "' + n + '", so ' + what + ' cannot be recorded from it. Re-read ' + path.basename(file) + ', update scripts/lib/world-stage-eval.mjs to the new text, and run the encoder again.');
  return src;
}

/* a harness: the world a stage file finds (DEFXNScene, its world, its kit), answered by recorders. cast: the encoder's ring cast; cubes: the frame's cubes; data: the page globals
   the stage files read (DEFXN_NETWORK, DEFXN_RESOLVERS, DEFXN_CAPABILITIES, DEFXN_RECORDS, DEFXN_CONCEPT) */
export function createHarness({ site, N, cast, cubes, data, END }) {
  const o_END = END;
  const ringKit = sourceGuard(stageSrc('ring-kit.js'), [
    'var LIFT = .16, HALF_D = .15;', "var P = { body: local(0, LIFT + .5, 0), pin: local(0, LIFT + 1.08, 0), post: local(0, LIFT / 2, -.08),", "bead: local(0, .045, -.1), link: local(0, LIFT + .5, -.03) };",
    'k.bevel = function (w, h, d, share) { return new RoundedBoxGeometry(w, h, d, 4, (share == null ? BEVEL : share) * Math.min(w, h, d)); };', 'var BEVEL = .1;',
    'bx.set(si, 0, -co); bz.set(co, 0, si);', 'sc = e <= 0 || s <= 0 ? 1e-4 : s * k.ease.back(clamp01(e));', 'out.setPosition(c.x + R * co, c.y + (1 - k.ease.out(clamp01(e))) * 1.4 * s, c.z + R * si);',
    'g = clamp01((reveal * (count + 2) - q) / 2), s = g <= 0 ? 1e-4 : (r || .05) * k.ease.back(g);', "var c = b.tone === 'signal' ? k.C.signal : mix('muted', 'canvas', .25);",
    "var bodyGeo = new RoundedBoxGeometry(1, 1, .28, 4, .028);", 'var linkGeo = new RoundedBoxGeometry(1, .24, .12, 4, .012);',
    "else if (kind === 'record') m.color.copy(k.C.record);", "var NODE = { hub: 1, identity: 1, resolver: 1, token: 1, pool: 1, network: 1, ledger: 1 };", 'k.GLASS = .34;',
    'bezier(.22, .7, .18, 1)'
  ], 'the stages\' tiles, rings and beads');
  void ringKit;

  const sets = [], paints = [], lineCalls = [], stages = {}, plates = [], sceneObjs = [], clockCalls = [], stagePicks = [];
  const state = { evals: 0, lineUsed: { lit: 0, dots: 0 }, view: null, clock: 0 };
  const white = () => new Col(1, 1, 1);
  const ringsList = cast.rings.map((r) => ({ i: r.i, c: new V3(r.c.x, r.c.y, r.c.z), R: r.R, t: r.t, n: r.n, kind: N.KIND[r.i], outer: r.outer, parent: null }));
  cast.rings.forEach((r) => { if (r.parent) ringsList[r.i].parent = ringsList[r.parent.i]; });
  const NODE = new Set(['hub', 'identity', 'resolver', 'token', 'pool', 'network', 'ledger']);
  const ZERO = () => new M4().makeScale(1e-4, 1e-4, 1e-4);

  /* a set of placed forms. kind: block (a bevelled box of its geo's size), tile (a body, and a link for a tile that has one), cyl, edge, plate, instanced */
  function makeSet(kind, n, extra) {
    const s = Object.assign({ id: sets.length, kind, n, shown: true, base: [], color: [], placed: [], hov: new Float32Array(n), stretch: new Float32Array(n).fill(1), glyph: new Float32Array(n).fill(1), force: -1, mesh: { material: {}, visible: true } }, extra);
    s.reset = () => { for (let j = 0; j < n; j++) { s.base[j] = ZERO(); s.placed[j] = false; s.color[j] = null; } s.shown = true; if (s.reset2) s.reset2(); };
    s.place = (j, m) => { s.base[j] = m ? m.clone() : ZERO(); s.placed[j] = !!m; };
    s.tint = (j, c) => { s.color[j] = c.clone(); };
    s.show = (on) => { s.shown = !!on; };
    s.repaint = () => {}; s.commit = () => {};
    s.reset(); sets.push(s); return s;
  }
  const geoOf = (g) => (g && g.args ? g : g);

  const k = {
    LIFT, HALF_D, SLOT: 1.28, reduced: false, GLASS: .34, ease: null, C: null, knobs: { emberLight: 0, logoLight: 0 }, lights: { logo: { position: new V3(), intensity: 0 }, ember: { position: new V3(), intensity: 0 } },
    scene: { add(o) { sceneObjs.push(o); } }, onLook(fn) { fn({ dust: 150, beam: 1 }); }, sets: [], onPaint(fn) { paints.push(fn); fn(); }, wake() {}, moved() {}, redraw() {}, skipBuild() {},
    /* ring-kit.js k.clockTo(ms, dur): a view that holds the build clock at a point of the network's build-up. The calls are kept: the encoder writes the point and the time it takes */
    END: o_END, clockTo(ms, dur) { clockCalls.push({ ms, dur }); }, clockRelease() { clockCalls.push({ ms: null, dur: 0 }); },
    mix(a, b, t) { return k.C[a].clone().lerp(k.C[b], t); },
    bevel(w, h, d, share) { return { type: 'bevel', w, h, d, r: (share == null ? .1 : share) * Math.min(w, h, d) }; },
    blockSet(n, geo, opts) { const g = geoOf(geo); return makeSet('block', n, { geo: g, opts: opts || {}, list: Array.from({ length: n }, () => ({ kind: 'block' })) }); },
    tileSet(list, opts) {
      const s = makeSet('tile', list.length, { list, opts: opts || {}, linkBase: [], linkLen: new Float32Array(list.length), linkPlaced: [] });
      s.reset2 = () => { for (let j = 0; j < s.n; j++) { s.linkBase[j] = ZERO(); s.linkPlaced[j] = false; s.linkLen[j] = 0; } };
      s.placeLink = (j, m, len) => { s.linkBase[j] = m.clone(); s.linkLen[j] = len; s.linkPlaced[j] = true; };
      s.reset2(); return s;
    },
    edgeLight(n, tone, gain) { const s = makeSet('edge', n * 4, { tone: tone || 'signal', gain: gain || 1.7 }); s.set = (i, m, w, h, amt, t) => { t = t || .018; for (let q = 0; q < 4; q++) { if (!(amt > .01)) { s.base[i * 4 + q] = ZERO(); s.placed[i * 4 + q] = false; continue; } const b = [[0, h / 2, w * amt, t], [0, -h / 2, w * amt, t], [-w / 2, 0, t, h * amt], [w / 2, 0, t, h * amt]][q]; s.base[i * 4 + q] = M4.of(mul(m.e, mul(T(b[0], b[1], 0), S(b[2], b[3], t)))); s.placed[i * 4 + q] = true; } }; return s; },
    textPlate(w, h, draw) {
      const px = 512, cv = { width: px, height: Math.round(px * h / w) }, tp = { w, h, draw, cv, m: null, ops: null, id: plates.length };
      tp.redraw = () => { const g = recordingContext(cv.width, cv.height); draw(g, cv.width, cv.height); tp.ops = g.ops; };
      tp.place = (m) => { tp.m = m ? m.clone() : null; };
      tp.mesh = { renderOrder: 0 };
      tp.redraw(); plates.push(tp); return tp;
    },
    beads(n, tone) { return { n, tone, line(a, c, count, reveal, r) { lineCalls.push({ tone, n, a: a.clone(), c: c.clone(), count, reveal: reveal == null ? 1 : reveal, r: r || .05, site: callsite(), set: this }); }, begin() {}, end() {} }; },
    ringFrame(c, R, theta, s, a, out) {
      out = out || new M4();
      const co = Math.cos(theta), si = Math.sin(theta), bx = new V3(si, 0, -co), bz = new V3(co, 0, si), by = new V3(0, 1, 0);
      out.makeBasis(bx, by, bz);
      const e = a == null ? 1 : a, sc = e <= 0 || s <= 0 ? 1e-4 : s * ease.back(clamp01(e));
      out.scale(new V3(sc, sc, sc));
      out.setPosition(c.x + R * co, c.y + (1 - ease.out(clamp01(e))) * 1.4 * s, c.z + R * si);
      return out;
    },
    instanced(geo, mat, n) {
      const s = makeSet('instanced', n, { geo, mat });
      s.setMatrixAt = (j, m) => { s.base[j] = m ? m.clone() : ZERO(); s.placed[j] = !!m; };
      s.setColorAt = (j, c) => { s.color[j] = c.clone(); };
      s.instanceColor = { needsUpdate: false }; s.userData = {}; s.count = n;
      return s;
    }
  };
  /* glide is the CSS curve cubic-bezier(.22,.7,.18,1) (ring-kit.js bezier), restated once */
  const bezier = (x1, y1, x2, y2) => {
    const at = (a, b, t) => ((1 - 3 * b + 3 * a) * t + (3 * b - 6 * a)) * t * t + 3 * a * t, slope = (a, b, t) => 3 * (1 - 3 * b + 3 * a) * t * t + 2 * (3 * b - 6 * a) * t + 3 * a;
    return (x) => { x = clamp01(x); if (x === 0 || x === 1) return x; let t = x; for (let i = 0; i < 6; i++) { const d = slope(x1, x2, t); if (Math.abs(d) < 1e-6) break; t -= (at(x1, x2, t) - x) / d; } return at(y1, y2, clamp01(t)); };
  };
  const E = { clamp01, out: ease.out, inOut: ease.inOut, back: ease.back, glide: bezier(.22, .7, .18, 1) };
  k.ease = E;
  k.C = new Proxy({}, { get: (_, name) => (TONES[name] == null ? undefined : Col.tone(name)) });
  k.sets = sets;

  /* the call site of a bead line: the stage file's own line and column, so the n-th call of a loop is the same row in every frame */
  function callsite() {
    const st = new Error().stack.split('\n');
    for (const l of st) { const m = /(stage:[A-Za-z0-9_.-]+:\d+:\d+)/.exec(l); if (m) return m[1]; }
    return 'unknown';
  }

  const tweens = [], followers = [];
  const W = {
    k, THREE: null, V: (x, y, z) => new V3(x, y, z), N, ease: E, D2R: Math.PI / 180, TAN: Math.tan(6 * Math.PI / 180), MID,
    HUB: ringsList[N.HUB], rings: ringsList, ringList: ringsList, cubes: cubes.map((c) => new V3(c.p.x, c.p.y, c.p.z)),
    mark: { position: new V3(ringsList[N.HUB].c.x, ringsList[N.HUB].t * MID, ringsList[N.HUB].c.z) },
    fit: (w, h, asp, fill) => { fill = fill || .86; const TAN = Math.tan(6 * Math.PI / 180); return Math.max(w / (fill * 2 * TAN * asp), h / (fill * 2 * TAN)); },
    lerp: (a, b, u) => a + (b - a) * u, win: (u, a, b) => E.inOut(clamp01((u - a) / (b - a))),
    grow: (w, a, b) => { const u = clamp01((w - a) / (b - a)); return u <= 0 ? 1e-4 : u < 1 ? E.out(u) : 1; },
    num: (s, lo, hi) => { const n = parseInt(s, 10); return isNaN(n) ? lo : Math.min(hi, Math.max(lo, n)); },
    anchorAt: (out, x, y, z, s) => { out.pos.set(x, y - (LIFT + .5) * s, z); out.quat.identity(); out.s = s; },
    view: () => state.view, cur: () => null, homeW: () => 1, after() {},
    /* chains-scene.js ringApi: the rise of each ring (a stage writes it, the scene lifts the ring by it x riseH) and the height one unit of it is */
    ringRise: new Float32Array(ringsList.length), riseH: (r) => (r.parent ? r.parent.t * 2.6 + r.R * 1.8 : r.R * .9 + 1.6),
    lit: k.beads(200, 'signal'), dots: k.beads(240, 'muted'),
    tween(v) {
      const tw = { from: v, to: v, t0: 0, dur: 1, index: tweens.length, override: null };
      tw.get = () => (tw.override != null ? tw.override : tw.to); tw.go = (v2) => { tw.to = v2; }; tw.snap = (v2) => { tw.to = tw.from = v2; };
      tweens.push(tw); return tw;
    },
    follower(n) { const f = { v: new Float32Array(n), last: 0, override: null }; f.step = (now, want) => { for (let i = 0; i < n; i++) f.v[i] = f.override ? f.override[i] : want(i); }; followers.push(f); return f; },
    focusOn(which, cubesOn) { W.focused = { which, cubes: !!cubesOn }; },
    stage(def) { stages[def.name] = def; },
    hooks: {}
  };
  const lit = W.lit, dotsB = W.dots; lit.set = lit; dotsB.set = dotsB;
  W.lit.tone = 'signal'; W.dots.tone = 'muted';
  const opens = [];
  const S_ = { ok: true, world: W, stage: W.stage, hooks: { stagePick(kind, id) { stagePicks.push({ kind, id }); } }, open(view, st, o) { opens.push({ view, state: st || {}, opts: o || {} }); }, debug: () => ({}) };
  const THREE = threeStub(); W.THREE = THREE;
  /* the removed glass-kit.js (Three.js, git history) S.glass: a plate with real holes. The stage names the shape and the plate's colour and opacity; the plate keeps both, the group it is shown in keeps the views it fades in on */
  const rect = (path, x, y, w, h, r) => { path.rect = { x, y, w, h, r }; return path.moveTo(x + r, y).lineTo(x + w - r, y).quadraticCurveTo(x + w, y, x + w, y + r).lineTo(x + w, y + h - r).quadraticCurveTo(x + w, y + h, x + w - r, y + h).lineTo(x + r, y + h).quadraticCurveTo(x, y + h, x, y + h - r).lineTo(x, y + r).quadraticCurveTo(x, y, x + r, y); };
  S_.glass = {
    roundRect: rect, circle(cx, cy, r) { const p = new PathRec(); p.absarc(cx, cy, r, 0, Math.PI * 2, true); return p; },
    plate(shape, opts) { const geo = { type: 'glassplate', shape, depth: (opts && opts.depth) || .12, center() { return this; } }, m = new THREE.Mesh(geo, { color: opts.color, opacity: opts.opacity, transparent: true }); return m; },
    show(group, views) { group.userData.views = views; sceneObjs.push(group); },
    color(token) { return Col.tone(TONES[token] != null ? token : 'strong'); }
  };
  /* the window the stage files find. They are plain browser scripts: an IIFE that reads window.DEFXNScene and the page's data */
  const ctxObj = {
    window: null, document: { createElement: () => { const cv = { width: 0, height: 0, getContext() { return cv._g || (cv._g = recordingContext(cv.width || 128, cv.height || 128)); } }; return cv; }, fonts: null, querySelector: () => null, querySelectorAll: () => [], documentElement: {} },
    performance: { now: () => state.clock }, console, Math, Number, String, Array, Object, parseInt, isNaN, Float32Array, Uint8Array, JSON, Image: function () {}, localStorage: { getItem: () => null, setItem() {} },
    getComputedStyle: () => ({ getPropertyValue: () => '' }), innerWidth: 1440, addEventListener() {}, location: { hash: '' }, NodeFilter: {}
  };
  ctxObj.window = Object.assign(ctxObj, { DEFXNScene: S_, DEFXN_NETWORK: N, DEFXNDependencies: { RoundedBoxGeometry: THREE.RoundedBoxGeometry }, ArkWorld: { get: () => ({ story: { on: true, step1: 600, step4: 3900, skipOnReturn: true } }) } }, data);
  vm.createContext(ctxObj);
  /* run a region of a stage file (its header helpers, then one stage's own block) under a name that keeps the call sites apart */
  function run(label, text) { vm.runInContext(text, ctxObj, { filename: 'stage:' + label }); }

  /* ---------- evaluating a frame and reading it back ---------- */
  const paletteDerived = [];   /* the colours that are not one tone or a straight mix of two: weights on tones, written as `mixtone` lines */
  const derivedKey = new Map();
  const BASE = 22;
  /* a colour as the row carries it: [tone, family, mix] indexes for one tone or a lerp of two, else a derived entry after the base palette (weights on tones) */
  function colourOf(c) {
    const p = c.parts(), names = Object.keys(p).filter((n) => TONES[n] != null);
    if (names.length !== Object.keys(p).length) throw new Error('a colour is made of a tone the grammar has no index for: ' + Object.keys(p).join(','));
    const sum = names.reduce((a, n) => a + p[n], 0);
    if (names.length === 1 && Math.abs(p[names[0]] - 1) < 1e-9) return [TONES[names[0]], 0, 0];
    if (names.length === 2 && Math.abs(sum - 1) < 1e-9 && names.every((n) => p[n] > 0)) { const [a, b] = names.sort((x, y) => TONES[x] - TONES[y]); return [TONES[a], TONES[b], Math.round(p[b] * 1e6) / 1e6]; }
    const key = names.sort().map((n) => n + ':' + p[n].toFixed(6)).join(' ');
    if (!derivedKey.has(key)) { derivedKey.set(key, BASE + paletteDerived.length); paletteDerived.push({ index: BASE + paletteDerived.length, weights: names.map((n) => [n, Math.round(p[n] * 1e6) / 1e6]) }); }
    return [derivedKey.get(key), 0, 0];
  }
  const WHITE = Col.tone('strong');
  const NULL = () => { const r = row(ZERO().e, TONES.canvas, 0, 0, 0); r[15] = -1; return r; };
  const rowOf = (m, col, alpha) => { const [t, f, mx] = colourOf(col || WHITE); return row(m.e || m, t, f, mx, alpha == null ? 1 : alpha); };

  /* set the stage's channels: tweens and followers answer with the value this frame is evaluated at */
  function applyOverrides(o) {
    tweens.forEach((t) => { t.override = null; }); followers.forEach((f) => { f.override = null; });
    for (const [i, v] of Object.entries(o.tweens || {})) tweens[Number(i)].override = v;
    for (const [i, v] of Object.entries(o.followers || {})) followers[Number(i)].override = v;
  }
  function evaluate(name, o) {
    const def = stages[name]; if (!def) throw new Error('the stage ' + name + ' was not registered by its file');
    sets.forEach((s) => s.reset()); plates.forEach((p) => p.m = null); lineCalls.length = 0; W.focused = undefined;
    applyOverrides(o);
    ctxObj.__stubPick = o.pick || null;
    state.evals++;
    state.view = o.view || null;
    /* a stage that eases toward its target by the clock the host gives it (download.js: each ring follows with tau 220 ms after its own wait) is run frame by frame until it rests */
    /* a view that gives a time keeps one clock that only goes forward (the stage's own `last` and `changedAt` read it): the page's performance.now() is that clock */
    const now0 = o.now != null ? (o.rewind ? o.now : Math.max(o.now, state.clock)) : 0;   /* rewind: a view whose clock is a channel (measured's build) is read at any moment, in any order */
    if (o.settle) { for (let t = 0; t <= o.settle; t += (o.step || 16)) { def.pose(o.w == null ? 1 : o.w, o.ms || 100000, now0 + t); if (o.now != null) state.clock = now0 + t; } }
    else { def.pose(o.w == null ? 1 : o.w, o.ms || 100000, now0); if (o.now != null) state.clock = now0; }
  }
  /* the stage's camera at an aspect, its anchor, its labels */
  const target = (name, asp, fr) => stages[name].target(fr || {}, asp);
  const anchorOf = (name) => { const out = { pos: new V3(), quat: new Quat(), s: 1 }; stages[name].anchor(out); return out; };
  const tagsOf = (name, o) => { applyOverrides(o || {}); return stages[name].tags(); };

  return { W, k, state, run, stages, sets, plates, sceneObjs, lineCalls, opens, clockCalls, stagePicks, tweens, followers, evaluate, target, anchorOf, tagsOf, colourOf, derived: paletteDerived, BASE, NODE, rowOf, NULL, ZERO, THREE, ctx: ctxObj, state, geoOf };
}

/* the 2D calls of a plate as words: each call is its name, how many arguments, then the arguments (a text, a number, a theme colour as `@tone`). The page replays only the calls this file records */
export function opsToWords(ops) { const out = []; for (const op of ops) { out.push(op[0], String(op.length - 1)); for (const a of op.slice(1)) out.push(String(a).replace(/^#@/, '@')); } return out; }   /* a stage writes a colour as '#' + hex: a theme name has no hash */
