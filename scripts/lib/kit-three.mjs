/* The Three.js calls the Kit's three source files make, answered in Node by the engine's own geometry (docs/design/world-grammar/PORT.md, 2026-10-30 "kit").
   Why this file exists. The /kit page's 3D (js/world/object-kit.js, glass-kit.js, kit-stage.js) builds 36 objects from Three.js shapes, materials and a 2D canvas.
   The owner's law (2026-10-30) is that Three.js is deprecated and every animation is rebuilt in fxn-3d. The objects are not retyped: the encoder
   (scripts/lib/kit-scene.mjs) RUNS those source files as they are, with this file in place of Three.js, and reads back what they built. A shape a source
   file asks for is realised here by the generators of flux/fxn-3d (engine/authoring/geom.mjs, engine/render/shapes.mjs roundedBox, earcut) through the one door
   scripts/lib/fxn-3d.mjs, so no shape is written twice and no Three.js code runs. Build side, Node only; nothing here is served to a page.
   What is answered, and where it differs from Three.js:
     shapes      Torus, Cylinder, Capsule, Sphere, Circle, Plane, Octahedron (flat shaded, as Three's detail 0), ShapeGeometry (earcut, as Three), ExtrudeGeometry (the engine's bevelled
                 extrusion, faceted as Three's), TubeGeometry along a cubic Bezier (Three's Frenet frames and arc-length steps), the rounded box k.bevel (RoundedBoxGeometry's
                 rounded corners with the radius kept at any size, the same shape world2-pieces.mjs boxShape builds for the site's tiles). A call this file does not know stops the
                 encoder with its name, so a changed source cannot be half read.
     materials   each constructor's options are kept, and colours are SYMBOLIC: a colour is a weight on each theme tone (primary, deep, canvas, strong, muted, warning, danger, live,
                 other), lerp and multiplyScalar are linear, so the encoder writes how every material is tinted, never a colour: a skin repaints with no new file.
     the page    a 2D canvas that RECORDS its calls (the faces' words and marks), document, window and getComputedStyle answered by markers. */
import { geom, earcut, roundedBox } from './fxn-3d.mjs';

const { Vec3, Quat, Euler, Mat4, Geo } = geom;
const PI = Math.PI, TAU = PI * 2;

/* ---------- vectors, turns, matrices ---------- */
export class V3 extends Vec3 {
  clone() { return new V3(this.x, this.y, this.z); }
  fromArray(a) { return this.set(a[0], a[1], a[2]); }
  setScalar(s) { return this.set(s, s, s); }
  toArray() { return [this.x, this.y, this.z]; }
}
export class M4 extends Mat4 {
  clone() { const m = new M4(); m.e.set(this.e); return m; }
  compose(p, q, s) { return super.compose(p, q, s); }
}
export { Quat, Euler };

/* ---------- colours as weights on the theme's tones ---------- */
export class Col {
  constructor(w) { this.w = w ? { ...w } : {}; }
  set(v) { return typeof v === 'string' ? this.setStyle(v) : this; }
  setStyle(s) {
    if (s[0] === '@') { this.w = { [s.slice(1)]: 1 }; return this; }
    throw new Error('the kit encoder cannot read the colour "' + s + '": a source colour must come from the theme (a token), so it can follow a skin. Fix: read the token through getComputedStyle, as object-kit.js tones() does.');
  }
  copy(c) { this.w = { ...c.w }; return this; }
  clone() { return new Col(this.w); }
  lerp(c, t) { const o = {}; for (const k of new Set([...Object.keys(this.w), ...Object.keys(c.w)])) o[k] = (this.w[k] || 0) * (1 - t) + (c.w[k] || 0) * t; this.w = o; return this; }
  multiplyScalar(s) { for (const k of Object.keys(this.w)) this.w[k] *= s; return this; }
  setHex() { return this; }
  get r() { return 0; } get g() { return 0; } get b() { return 0; }
}

/* ---------- 2D shapes: the calls a Shape and a Path record, flattened as Three's getPoints does ---------- */
export class Path {
  constructor() { this.ops = []; this.holes = []; }
  moveTo(x, y) { this.ops.push(['M', x, y]); this.at = [x, y]; return this; }
  lineTo(x, y) { this.ops.push(['L', this.at, [x, y]]); this.at = [x, y]; return this; }
  quadraticCurveTo(cx, cy, x, y) { this.ops.push(['Q', this.at, [cx, cy], [x, y]]); this.at = [x, y]; return this; }
  bezierCurveTo(ax, ay, bx, by, x, y) { this.ops.push(['C', this.at, [ax, ay], [bx, by], [x, y]]); this.at = [x, y]; return this; }
  absarc(cx, cy, r, a0, a1, cw) {
    const first = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)];
    if (this.at && (first[0] !== this.at[0] || first[1] !== this.at[1])) this.lineTo(first[0], first[1]);   /* Three: a line from where the path stands to the arc's start */
    this.ops.push(['A', cx, cy, r, a0, a1, !!cw]);
    let d = a1 - a0; const same = Math.abs(d) < Number.EPSILON;
    while (d < 0) d += TAU; while (d > TAU) d -= TAU;
    if (d < Number.EPSILON) d = same ? 0 : TAU;
    if (cw && !same) d = d === TAU ? -TAU : d - TAU;
    this.at = [cx + r * Math.cos(a0 + d), cy + r * Math.sin(a0 + d)];
    return this;
  }
  closePath() { return this; }
  /* Path.getPoints(divisions): a line is one step, a curve `divisions`, an arc twice that; a point equal to the last is dropped */
  getPoints(divisions = 12) {
    const out = [], push = (p) => { const l = out[out.length - 1]; if (!l || l[0] !== p[0] || l[1] !== p[1]) out.push(p); };
    for (const o of this.ops) {
      if (o[0] === 'M') { push([o[1], o[2]]); continue; }
      const n = o[0] === 'L' ? 1 : o[0] === 'A' ? divisions * 2 : divisions;
      for (let i = 0; i <= n; i++) push(this.pointOn(o, i / n));
    }
    if (out.length > 1 && out[0][0] === out[out.length - 1][0] && out[0][1] === out[out.length - 1][1]) out.pop();
    return out;
  }
  pointOn(o, t) {
    const u = 1 - t;
    if (o[0] === 'L') return [o[1][0] + (o[2][0] - o[1][0]) * t, o[1][1] + (o[2][1] - o[1][1]) * t];
    if (o[0] === 'Q') return [u * u * o[1][0] + 2 * u * t * o[2][0] + t * t * o[3][0], u * u * o[1][1] + 2 * u * t * o[2][1] + t * t * o[3][1]];
    if (o[0] === 'C') return [u * u * u * o[1][0] + 3 * u * u * t * o[2][0] + 3 * u * t * t * o[3][0] + t * t * t * o[4][0], u * u * u * o[1][1] + 3 * u * u * t * o[2][1] + 3 * u * t * t * o[3][1] + t * t * t * o[4][1]];
    let d = o[5] - o[4]; const same = Math.abs(d) < Number.EPSILON;
    while (d < 0) d += TAU; while (d > TAU) d -= TAU;
    if (d < Number.EPSILON) d = same ? 0 : TAU;
    if (o[6] && !same) d = d === TAU ? -TAU : d - TAU;
    const a = o[4] + t * d; return [o[1] + o[3] * Math.cos(a), o[2] + o[3] * Math.sin(a)];
  }
}
export class Shape extends Path {
  extractPoints(div) { return { shape: this.getPoints(div), holes: this.holes.map((h) => h.getPoints(div)) }; }
}

/* ---------- geometry: a Geo with the in-place calls Three's BufferGeometry has ---------- */
export class G3 {
  constructor(geo, extra) { this.geo = geo; Object.assign(this, extra); }
  rotateX(a) { this.geo.rotateX(a); return this; } rotateY(a) { this.geo.rotateY(a); return this; } rotateZ(a) { this.geo.rotateZ(a); return this; }
  translate(x, y, z) { this.geo.translate(x, y, z); return this; } scale(x, y, z) { this.geo.scale(x, y, z); return this; }
  clone() { const c = new G3(this.geo.clone(), {}); if (this.plane) c.plane = { ...this.plane }; return c; }
  dispose() {}
}
const geoOf = (g) => { if (!(g instanceof G3)) throw new Error('a mesh was given a geometry the kit encoder does not know (' + (g && g.constructor && g.constructor.name) + '). Fix: add it to scripts/lib/kit-three.mjs.'); return g.geo; };

/* a rounded box w x h x d whose corners are spheres of radius r (RoundedBoxGeometry, segments 4): the unit box's core stretched, its rounded band kept at r. Positions in the box's own units */
export function bevelGeo(w, h, d, r) {
  const rel = .14, g = roundedBox(rel, 4), inner = .5 - rel, dim = [w, h, d], pos = [];
  for (let i = 0; i < g.pos.length; i += 3) for (let c = 0; c < 3; c++) {
    const q = Math.max(-inner, Math.min(inner, g.pos[i + c])), band = g.pos[i + c] - q;
    pos.push(q / inner * (dim[c] / 2 - r) + band / rel * r);
  }
  return new Geo(pos, g.nrm.slice(), g.uv.slice(), g.idx.slice());
}
/* OctahedronGeometry(r, 0): eight flat faces */
function octahedron(r) {
  const v = [[r, 0, 0], [-r, 0, 0], [0, r, 0], [0, -r, 0], [0, 0, r], [0, 0, -r]], f = [[0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2], [1, 2, 5], [1, 5, 3], [1, 3, 4], [1, 4, 2]], pos = [], nrm = [], idx = [];
  for (const t of f) {
    const a = v[t[0]], b = v[t[1]], c = v[t[2]], ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const base = pos.length / 3; for (const p of [a, b, c]) { pos.push(...p); nrm.push(nx, ny, nz); } idx.push(base, base + 1, base + 2);
  }
  return new Geo(pos, nrm, new Array(pos.length / 3 * 2).fill(0), idx);
}
/* ShapeGeometry(shape, curveSegments): the outline and its holes triangulated by earcut, flat, facing +z */
function shapeGeo(shape, segs) {
  const { shape: outer, holes } = shape.extractPoints(segs), area = (p) => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; } return a / 2; };
  let ring = outer.slice(); if (area(ring) < 0) ring.reverse();
  const hs = holes.map((h) => { const c = h.slice(); if (area(c) > 0) c.reverse(); return c; });
  const flat = [], holeAt = []; ring.forEach((p) => flat.push(p[0], p[1]));
  hs.forEach((h) => { holeAt.push(flat.length / 2); h.forEach((p) => flat.push(p[0], p[1])); });
  const tri = earcut(flat, holeAt, 2), pos = [], nrm = [];
  for (let i = 0; i < flat.length; i += 2) { pos.push(flat[i], flat[i + 1], 0); nrm.push(0, 0, 1); }
  return new Geo(pos, nrm, new Array(pos.length / 3 * 2).fill(0), tri);
}
/* a cubic Bezier through four points, read by arc length as Three's getPointAt (200 divisions) */
export class CubicBezierCurve3 {
  constructor(a, b, c, d) { this.p = [a, b, c, d]; this.table = null; }
  getPoint(t) {
    const u = 1 - t, [a, b, c, d] = this.p, f = (k) => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k];
    return new V3(f('x'), f('y'), f('z'));
  }
  lengths() { if (!this.table) { const c = [0]; let last = this.getPoint(0), sum = 0; for (let i = 1; i <= 200; i++) { const cur = this.getPoint(i / 200); sum += cur.distanceTo(last); c.push(sum); last = cur; } this.table = c; } return this.table; }
  getPointAt(u) {
    const al = this.lengths(), il = al.length, target = u * al[il - 1]; let lo = 0, hi = il - 1, i = 0;
    while (lo <= hi) { i = Math.floor(lo + (hi - lo) / 2); const cmp = al[i] - target; if (cmp < 0) lo = i + 1; else if (cmp > 0) hi = i - 1; else { hi = i; break; } }
    i = hi; const t = al[i] === target ? i / (il - 1) : (i + (target - al[i]) / (al[i + 1] - al[i])) / (il - 1);
    return this.getPoint(t);
  }
  getTangentAt(u) { const d = 1e-4, a = this.getPointAt(Math.max(0, u - d)), b = this.getPointAt(Math.min(1, u + d)); return b.sub(a).normalize(); }
}
/* TubeGeometry(curve, tubularSegments, radius, radialSegments, closed): Frenet frames along the curve (Three's computeFrenetFrames), a ring of vertices at each step */
function tubeGeo(curve, segs, radius, radial) {
  const T = [], N = [], B = [];
  for (let i = 0; i <= segs; i++) T.push(curve.getTangentAt(i / segs));
  let min = Number.MAX_VALUE, tx = Math.abs(T[0].x), ty = Math.abs(T[0].y), tz = Math.abs(T[0].z), nv = new V3();
  if (tx <= min) { min = tx; nv.set(1, 0, 0); } if (ty <= min) { min = ty; nv.set(0, 1, 0); } if (tz <= min) nv.set(0, 0, 1);
  let vec = new V3().crossVectors(T[0], nv).normalize(); N[0] = new V3().crossVectors(T[0], vec); B[0] = new V3().crossVectors(T[0], N[0]);
  for (let i = 1; i <= segs; i++) {
    N[i] = N[i - 1].clone(); B[i] = B[i - 1].clone(); vec = new V3().crossVectors(T[i - 1], T[i]);
    if (vec.length() > Number.EPSILON) { vec.normalize(); const th = Math.acos(Math.max(-1, Math.min(1, T[i - 1].dot(T[i])))); N[i].applyQuaternion(new Quat().setFromAxisAngle(vec, th)); }
    B[i].crossVectors(T[i], N[i]);
  }
  const pos = [], nrm = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const P = curve.getPointAt(i / segs);
    for (let j = 0; j <= radial; j++) {
      const v = j / radial * TAU, s = Math.sin(v), c = -Math.cos(v);
      let x = c * N[i].x + s * B[i].x, y = c * N[i].y + s * B[i].y, z = c * N[i].z + s * B[i].z; const l = Math.hypot(x, y, z) || 1; x /= l; y /= l; z /= l;
      nrm.push(x, y, z); pos.push(P.x + radius * x, P.y + radius * y, P.z + radius * z); uv.push(i / segs, j / radial);
    }
  }
  for (let j = 1; j <= segs; j++) for (let i = 1; i <= radial; i++) { const a = (radial + 1) * (j - 1) + (i - 1), b = (radial + 1) * j + (i - 1), c = (radial + 1) * j + i, d = (radial + 1) * (j - 1) + i; idx.push(a, b, d, b, c, d); }
  return new Geo(pos, nrm, uv, idx);
}
/* ExtrudeGeometry(shape, { depth, bevel... }) through the engine's extrude: it takes any object that answers points(divisions) */
function extrudeGeo(shape, o) {
  if (shape.holes.length) throw new Error('an extrusion with holes is not built by the engine (geom.extrude has no holes). Fix: build the hole as a second shape, or extend geom.extrude.');
  const outline = { points: (div) => shape.getPoints(div) };
  return geom.extrude(outline, { depth: o.depth, bevelEnabled: o.bevelEnabled, bevelThickness: o.bevelThickness, bevelSize: o.bevelSize, bevelSegments: o.bevelSegments, curveSegments: o.curveSegments });
}

/* ---------- the scene graph ---------- */
export class Object3D {
  constructor(type) {
    this.type = type; this.children = []; this.position = new V3(); this.scale = new V3(1, 1, 1); this.visible = true; this.userData = {}; this.renderOrder = 0; this.parent = null;
    this.quaternion = new Quat(); this.rotation = new Euler(); let lock = false;
    this.rotation.onChange = () => { if (!lock) { lock = true; this.quaternion.setFromEuler(this.rotation); lock = false; } };
    this.quaternion.onChange = () => { if (!lock) { lock = true; this.rotation.setFromQuaternion(this.quaternion); lock = false; } };
  }
  add(o) { o.parent = this; this.children.push(o); return this; }
  get matrix() { return new M4().compose(this.position, this.quaternion, this.scale); }
  traverse(fn) { fn(this); this.children.forEach((c) => c.traverse(fn)); }
}
class MeshObj extends Object3D {
  constructor(geometry, material) { super('Mesh'); this.geometry = geometry; this.material = material; this.isMesh = true; }
}
class InstancedObj extends MeshObj {
  constructor(geometry, material, count) { super(geometry, material); this.type = 'InstancedMesh'; this.count = count; this.matrices = []; this.instanceMatrix = { needsUpdate: false }; this.isInstancedMesh = true; }
  setMatrixAt(i, m) { this.matrices[i] = m.clone(); return m; }
}

/* a material keeps the options it was made with and the colours the look paints it with */
function material(kind) {
  return class {
    constructor(opts) { this.kind = kind; this.opts = { ...(opts || {}) }; this.color = new Col(); this.emissive = new Col(); this.userData = {}; this.uniforms = (opts && opts.uniforms) || null; if (this.uniforms) for (const k of Object.keys(this.uniforms)) { /* values stay as made */ } this.opacity = this.opts.opacity == null ? 1 : this.opts.opacity; }
    set needsUpdate(v) { /* a Three program flag: nothing to do */ }
  };
}

/* the namespace the sources read as THREE */
export function createThree() {
  const T = {
    Vector3: V3, Matrix4: M4, Quaternion: Quat, Euler, Color: Col, Group: class extends Object3D { constructor() { super('Group'); } }, Mesh: MeshObj, InstancedMesh: InstancedObj,
    Shape, Path, CubicBezierCurve3,
    MeshPhysicalMaterial: material('physical'), MeshStandardMaterial: material('standard'), MeshBasicMaterial: material('basic'), ShaderMaterial: material('shader'),
    CanvasTexture: class { constructor(cv) { this.image = cv; this.anisotropy = 1; } },
    TorusGeometry: class extends G3 { constructor(r, t, rad, tub, arc) { super(geom.torus(r, t, rad, tub, arc == null ? TAU : arc)); } },
    CylinderGeometry: class extends G3 { constructor(rt, rb, h, rad, hs) { super(geom.cylinder(rt, rb, h, rad, hs || 1)); } },
    CapsuleGeometry: class extends G3 { constructor(r, len, caps, rad) { super(geom.capsule(r, len, caps, rad)); } },
    SphereGeometry: class extends G3 { constructor(r, w, h) { super(geom.sphere(r, w, h)); } },
    CircleGeometry: class extends G3 { constructor(r, s) { super(geom.circle(r, s)); } },
    OctahedronGeometry: class extends G3 { constructor(r, detail) { if (detail) throw new Error('OctahedronGeometry detail above 0 is not built by the kit encoder'); super(octahedron(r)); } },
    ShapeGeometry: class extends G3 { constructor(shape, segs) { super(shapeGeo(shape, segs || 12)); } },
    ExtrudeGeometry: class extends G3 { constructor(shape, o) { super(extrudeGeo(shape, o)); } },
    TubeGeometry: class extends G3 { constructor(curve, segs, r, rad) { super(tubeGeo(curve, segs, r, rad)); } },
    PlaneGeometry: class extends G3 {
      constructor(w, h) {
        super(geom.plane(w, h), { plane: { w, h } });
        const g = this.geo, self = this, uv = g.uv;
        /* object-kit.js face() rewrites the plane's uv into its atlas rectangle: the encoder reads the rectangle back from the four corners */
        this.attributes = { uv: { get count() { return uv.length / 2; }, getX: (i) => uv[i * 2], getY: (i) => uv[i * 2 + 1], setXY: (i, x, y) => { uv[i * 2] = x; uv[i * 2 + 1] = y; self.rewritten = true; } } };
      }
    },
    BufferGeometry: class extends G3 {
      constructor() { super(new Geo([], null, null, null)); this.attributes = {}; }
      setAttribute(name, a) { this.attributes[name] = a; if (name === 'position') { this.geo.pos = Array.from(a.array); this.geo.idx = Array.from({ length: this.geo.pos.length / 3 }, (_, i) => i); this.geo.nrm = new Array(this.geo.pos.length).fill(0); this.geo.uv = new Array(this.geo.pos.length / 3 * 2).fill(0); } return this; }
    },
    Float32BufferAttribute: class { constructor(a, n) { this.array = a; this.itemSize = n; } },
    AdditiveBlending: 2, DoubleSide: 2, FrontSide: 0, BackSide: 1, NormalBlending: 1, CustomBlending: 5, SRGBColorSpace: 'srgb'
  };
  return T;
}

/* the world matrix of a node inside its group, as 12 floats (three columns, then the place) */
export function rows12(m) { const e = m.e; return [e[0], e[1], e[2], e[4], e[5], e[6], e[8], e[9], e[10], e[12], e[13], e[14]]; }
export function mul(a, b) { return new M4().multiplyMatrices(a, b); }
export { Geo, geoOf, PI, TAU };
