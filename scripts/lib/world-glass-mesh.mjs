/* A plate with holes as one extruded polygon (docs/design/world-grammar/PORT.md batches 1 and 4: the auth status panels, the download lens). Build side, Node built-ins only.
   outline: the plate's counter-clockwise loop of [x, y]; loops: each hole's loop, clockwise. The caps are triangulated with the holes bridged in; the walls of the outline and of every hole are flat quads
   with their own normals. The plate runs from z = -depth / 2 to +depth / 2. Returns the shaded stream a blob is written from. */
import { triangulate, signedArea } from '../../../fxn-3d/scripts/lib/mesh/outline.mjs';   /* TODO(door): the engine's one door (fxn-3d.mjs) does not name the triangulator yet */

export function extrudeLoops(outline, loops, depth) {
  if (signedArea(outline) < 0) outline.reverse();
  const pos = [], nrm = [], uv = [], idx = [], z1 = depth / 2, z0 = -depth / 2;
  const tri = triangulate(outline, loops);
  for (const [z, nz] of [[z1, 1], [z0, -1]]) {
    const base = pos.length / 3;
    for (const p of tri.ring) { pos.push(p[0], p[1], z); nrm.push(0, 0, nz); uv.push(0, 0); }
    for (const t of tri.tris) idx.push(base + t[0], base + t[nz > 0 ? 1 : 2], base + t[nz > 0 ? 2 : 1]);
  }
  const wall = (loop, outward) => {
    const n = loop.length;
    for (let i = 0; i < n; i++) {
      const p = loop[i], q = loop[(i + 1) % n], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, nx = dy / l * outward, ny = -dx / l * outward, b = pos.length / 3;
      pos.push(p[0], p[1], z0, q[0], q[1], z0, q[0], q[1], z1, p[0], p[1], z1); for (let k = 0; k < 4; k++) { nrm.push(nx, ny, 0); uv.push(0, 0); }
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
  };
  wall(outline, 1);   /* counter-clockwise outline: the right of each edge is outward */
  loops.forEach(l => wall(l, 1));   /* clockwise holes: the right of each edge points into the hole, which is away from the plate */
  return { pos: Float32Array.from(pos), nrm: Float32Array.from(nrm), uv: Float32Array.from(uv), idx: Uint32Array.from(idx) };
}

/* the loop of a flattened path (world-stage-eval.mjs PathRec): its moves, lines, quadratic curves and arcs as points. A curve is walked in `steps` straight pieces. */
export function flatten(path, steps = 10, arcSteps = 24) {
  const pts = []; let cx = 0, cy = 0;
  for (const op of path.ops) {
    if (op[0] === 'M' || op[0] === 'L') { pts.push([op[1], op[2]]); cx = op[1]; cy = op[2]; }
    else if (op[0] === 'Q') { for (let i = 1; i <= steps; i++) { const t = i / steps, u = 1 - t; pts.push([u * u * cx + 2 * u * t * op[1] + t * t * op[3], u * u * cy + 2 * u * t * op[2] + t * t * op[4]]); } cx = op[3]; cy = op[4]; }
    else if (op[0] === 'A') { const [, x, y, r, a0, a1, cw] = op; let d = a1 - a0; if (cw && d > 0) d -= Math.PI * 2; if (!cw && d < 0) d += Math.PI * 2; const n = Math.max(3, Math.round(arcSteps * Math.abs(d) / (Math.PI * 2))); for (let i = 0; i < n; i++) pts.push([x + Math.cos(a0 + d * i / n) * r, y + Math.sin(a0 + d * i / n) * r]); }
  }
  return pts;
}
