/* World grammar, parts drawn through the mesh pass (docs/design/world-grammar/PORT.md batch 1, "glass clearcoat on world parts").

   Why this file exists. The renderer's lit program is Lambert with one flat room term: no specular, no clearcoat, no baked room. The
   Three.js world lights every record tile, link, glass pane and card with MeshPhysicalMaterial: satin roughness, a clear coat, and
   the room's reflection (ring-kit.js tileMaterial, blockSet). That light lives in fxn-3d's mesh pass (world2-mesh.mjs: GGX, clearcoat, the baked
   room world/room-env.bin, instanced, sorted glass). A part the stage flags `piece` is therefore drawn there instead of in the lit
   program: its rows (the renderer's own instance layout: a 3x4 matrix, a linear colour, an alpha) are uploaded as one instanced
   mesh, and the renderer calls draw() once between its opaque parts and its translucent ones. The rows stay what the stage writes;
   nothing here knows a view. Shadows still come from the lit depth pass (the part keeps its `like` shape there), and the pieces read
   the renderer's shadow map through R.meshLight().shadow.

   The shapes are the mesh pass's own generator (world2-shapes.mjs roundedBox) with the box's size and corner radius applied
   to the unit box's core, as the Three.js card's vertex shader does: a rounded corner keeps its radius at any size. No JSON, no WASM. */
import { roundedBox, prism } from '/fxn-3d/js/render/world2-shapes.mjs';

/* a hexagon with a corner on +z, radius 1, from y -.5 to +.5: your key's disc (CylinderGeometry radial 6) */
const HEX = [0, 1, 2, 3, 4, 5].map((i) => [Math.sin(i * Math.PI / 3), Math.cos(i * Math.PI / 3)]);

const IDENTITY = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

/* a w x h x d box whose corners are spheres of radius r (three RoundedBoxGeometry(w, h, d, seg, r)): the unit rounded box's core is
   stretched to the box's core and its rounded band keeps the absolute radius. Positions in the box's own units. */
export function boxShape(w, h, d, r, seg = 4) {
  const rel = .14, g = roundedBox(rel, seg), inner = .5 - rel, dim = [w, h, d], pos = [];
  for (let i = 0; i < g.pos.length; i += 3) for (let c = 0; c < 3; c++) {
    const q = Math.max(-inner, Math.min(inner, g.pos[i + c])), band = g.pos[i + c] - q;
    pos.push(q / inner * (dim[c] / 2 - r) + band / rel * r);
  }
  return { pos, nrm: g.nrm, uv: g.uv, idx: g.idx };
}

/* mesh: the module world2-mesh.mjs (the host imports it once, when the first piece is needed); env: its baked room or null */
export function createPieces(R, mesh, env) {
  const gl = R.gl, prog = mesh.createCardProgram(gl), ups = new Map(), list = [], room = env ? mesh.uploadEnvironment(gl, env) : null;
  /* the shapes a part may name: size (w, h, d) and corner radius, from ring-kit.js and chains-scene.js */
  const SHAPES = { tile: [1, 1, .28, .028], link: [1, .24, .12, .012], pane: [1, 1, .03, .003], shell: [1.03, 1.03, .31, .031], sheet: [1, 1, .1, .01], cube: [1, 1, 1, .12] };
  /* a box of its own size (w, h, d, corner radius), as ring-kit.js k.bevel builds a block: the identity views' forms */
  function boxUp(b) {
    const key = 'box:' + b.join(',');
    if (ups.has(key)) return ups.get(key);
    const g = boxShape(b[0], b[1], b[2], b[3]), parsed = mesh.quantizedShape(g.pos, g.nrm, g.idx, [255, 255, 255, 255], Math.max(b[0], b[1], b[2]) / 2 + 1e-3), up = mesh.uploadMesh(gl, parsed);
    ups.set(key, up); return up;
  }
  function upOf(kind) {
    if (ups.has(kind)) return ups.get(kind);
    const s = SHAPES[kind]; if (!s && kind !== 'hex') throw new Error('pieces: no shape named ' + kind + ' (world2-pieces.mjs SHAPES), so the part cannot be drawn through the mesh pass');
    const g = kind === 'hex' ? prism(HEX) : boxShape(s[0], s[1], s[2], s[3]), half = kind === 'hex' ? 1 : Math.max(s[0], s[1], s[2]) / 2 + 1e-3;
    const parsed = mesh.quantizedShape(g.pos, g.nrm, g.idx, [255, 255, 255, 255], half), up = mesh.uploadMesh(gl, parsed);
    ups.set(kind, up); return up;
  }
  /* a piece: one part of the stage drawn as one instanced mesh. spec: { kind, mat: { metal, rough, coat, coatRough, env, opacity, emission }, glass } */
  function add(name, spec, rows) {
    const up = spec.box ? boxUp(spec.box) : upOf(spec.kind), data = new Float32Array(rows), glass = (spec.mat.opacity == null ? 1 : spec.mat.opacity) < 1;
    const inst = mesh.uploadInstances(gl, up, data, glass);
    const p = { name, up, inst, data, count: 0, o: { mode: 0, post: 0, inst, mat: Object.assign({ rgb: [1, 1, 1] }, spec.mat), faces: spec.faces } };
    list.push(p); return p;
  }
  /* a piece whose mesh is a blob the encoder wrote (a plate with holes): mesh is the parsed blob (world2-mesh.mjs fetchMesh) */
  function addMesh(name, parsed, spec, rows) {
    const up = mesh.uploadMesh(gl, parsed), data = new Float32Array(rows), glass = (spec.mat.opacity == null ? 1 : spec.mat.opacity) < 1;
    const inst = mesh.uploadInstances(gl, up, data, glass);
    const p = { name, up, inst, data, count: 0, o: { mode: 0, post: 0, inst, mat: Object.assign({ rgb: [1, 1, 1] }, spec.mat), faces: spec.faces } };
    list.push(p); return p;
  }
  /* new rows for a piece (the stage rewrote its part); count 0 takes it out of the picture */
  function write(p, rows, count) {
    p.count = count;
    if (!count) return;
    p.data.set(rows);
    if (!p.inst.scratch) { gl.bindBuffer(gl.ARRAY_BUFFER, p.inst.buf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, p.data); }   /* a glass piece is written sorted at its draw */
  }
  const lightOf = () => {
    const L = R.meshLight();
    /* the baked room replaces the flat room term (Three's scene.environmentIntensity is the look's envStrength) */
    return room ? Object.assign({}, L, { env: 0, envMap: room, envInt: L.env }) : L;
  };
  /* one draw: the opaque pieces, then the glass sorted far to near. The caller has depth test on and blend off. */
  function draw(proj, vw, eye, fogDist) {
    const items = [];
    for (const p of list) if (p.count) { p.o.fogDist = fogDist; items.push({ up: p.up, model: IDENTITY, o: p.o }); }
    if (!items.length) return 0;
    mesh.drawPieces(gl, prog, items, proj, vw, eye, lightOf());
    return items.length;
  }
  return { add, addMesh, write, draw, list };
}
