/* The card rebuilt as at most nine clean parts (docs/design/world-grammar/MESH.md, "The fourth cut").

   The owner's step: "reduce the details: there are many parts; remove some and recreate them in a unified clean
   way. It should not have more than 9 parts." So nothing here is a decimation. From the voxel solid the encoder
   already builds (world-encode-card.mjs voxelSolid), the card's front is read as a height map (the top solid cell
   of every column along the thickness axis), the heights cluster into a few levels (body, panel, rails, tabs, the
   groove of the diagonal stripe), each level's region is cleaned by a majority filter that drops screws, slots and
   engraved lines, its outline is traced, simplified (Douglas-Peucker) and snapped to the card's own directions
   (0, 90 and the diagonal measured from the outlines), and each region becomes one extruded polygon between its
   floor and its level with a chamfer of the size the model's own rim chamfer measures. Faces hidden by another
   part are not written (a part below keeps no top under the one above, a raised part has no bottom, a wall stops
   where the neighbour's body begins), so the parts butt and never overlap. Each part takes the majority material
   of the original skin under it and is one draw. Everything is derived from the grid and walked in index order:
   deterministic. The proof (one component, no open or non-manifold edge) is taken on each part as a closed solid
   (bottom and full walls included) before the hidden faces are dropped, and printed every run.
   Node built-ins only, no JSON, no WASM. */

const PARTS_MAX = 9;         /* parts in all, the slab included */
const FILTER_R = 2;          /* the majority filter's radius in cells: features narrower than about 2r + 1 go */
const FILTER_PASSES = 3;
const PEAK_SHARE = .02;      /* a height is a level when at least this share of the columns sit within 1 cell of it */
const LEVEL_MERGE = 3;       /* levels closer than this many cells merge into the stronger one */
const MIN_REGION = 40;       /* cells: smaller regions are never parts */
const DP_TOL = [1, 1.5, 2, 3];   /* Douglas-Peucker tolerances in cells, tried in order until the mesh fits */
const DIAG_MIN_SHARE = .05;  /* the diagonal is a card direction when at least this share of outline length runs along it */
const BYTES_MAX = 60 * 1024, TRIS_MAX = 4000;

/* ---------- 1 levels: the front height map's plateaus ---------- */
function heightMap(G) {
  const { nx, ny, nz, at, solid } = G, front = new Int16Array(nx * ny).fill(-1), back = new Int16Array(nx * ny).fill(-1);
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    for (let k = nz - 1; k >= 0; k--) if (solid[at(i, j, k)]) { front[i * ny + j] = k; break; }
    for (let k = 0; k < nz; k++) if (solid[at(i, j, k)]) { back[i * ny + j] = k; break; }
  }
  return { front, back };
}
/* the plateaus: heights whose smoothed count is a local maximum with at least PEAK_SHARE of the columns, strongest
   first, merged when closer than LEVEL_MERGE cells. Returns the levels ascending and each column's level index. */
function levels(map, nz) {
  const hist = new Float64Array(nz); let total = 0;
  for (const v of map) if (v >= 0) { hist[v]++; total++; }
  const smooth = new Float64Array(nz);
  for (let k = 0; k < nz; k++) smooth[k] = (hist[k - 1] || 0) + 2 * hist[k] + (hist[k + 1] || 0);
  const peaks = [];
  for (let k = 0; k < nz; k++) if (smooth[k] >= (smooth[k - 1] || 0) && smooth[k] > (smooth[k + 1] || 0) && smooth[k] / 4 >= PEAK_SHARE * total) peaks.push({ k, w: smooth[k] });
  peaks.sort((a, b) => b.w - a.w || a.k - b.k);
  const kept = [];
  for (const p of peaks) if (!kept.some(q => Math.abs(q.k - p.k) < LEVEL_MERGE)) kept.push(p);
  const L = kept.map(p => p.k).sort((a, b) => a - b);
  const label = new Int8Array(map.length).fill(-1);
  for (let c = 0; c < map.length; c++) {
    const v = map[c]; if (v < 0) continue;
    let best = 0; for (let l = 1; l < L.length; l++) if (Math.abs(L[l] - v) < Math.abs(L[best] - v)) best = l;
    label[c] = best;
  }
  return { L, label, total, hist };
}
/* a majority filter over a (2r + 1) square, FILTER_PASSES times: screws, slots and engraved lines vanish into
   the level around them; the card's outline (label -1) is kept as it is */
function majorityFilter(label, nx, ny) {
  let cur = label;
  for (let pass = 0; pass < FILTER_PASSES; pass++) {
    const next = new Int8Array(cur.length);
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      const c = i * ny + j; if (cur[c] < 0) { next[c] = -1; continue; }
      const tally = new Map();
      for (let di = -FILTER_R; di <= FILTER_R; di++) for (let dj = -FILTER_R; dj <= FILTER_R; dj++) {
        const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
        const l = cur[ii * ny + jj]; if (l < 0) continue; tally.set(l, (tally.get(l) || 0) + 1);
      }
      let bestL = cur[c], bestC = 0; for (const [l, n] of tally) if (n > bestC || (n === bestC && l < bestL)) { bestL = l; bestC = n; }
      next[c] = bestL;
    }
    cur = next;
  }
  return cur;
}
/* 4-connected components of equal label; each gets an id, its cells counted */
function components(label, nx, ny) {
  const comp = new Int32Array(label.length).fill(-1), list = [], queue = new Int32Array(label.length);
  for (let s = 0; s < label.length; s++) {
    if (label[s] < 0 || comp[s] >= 0) continue;
    const id = list.length, l = label[s]; let head = 0, tail = 0, n = 0; comp[s] = id; queue[tail++] = s;
    while (head < tail) {
      const c = queue[head++]; n++; const i = (c / ny) | 0, j = c % ny;
      const go = d => { if (label[d] === l && comp[d] < 0) { comp[d] = id; queue[tail++] = d; } };
      if (i > 0) go(c - ny); if (i < nx - 1) go(c + ny); if (j > 0) go(c - 1); if (j < ny - 1) go(c + 1);
    }
    list.push({ id, level: l, cells: n });
  }
  return { comp, list };
}

/* ---------- 2 outlines: traced, simplified, snapped ---------- */
/* the boundary of a set of columns as closed loops of grid nodes, counter-clockwise round the material (holes
   turn clockwise). Each column side that faces a column outside the set is one unit edge; the edges link head
   to tail. Node (i, j) is the corner at the low side of column (i, j). */
function traceLoops(inSet, nx, ny) {
  const next = new Map();   /* from node key -> [to node key, ...] (a node can carry two outgoing edges at a pinch) */
  const key = (i, j) => i * (ny + 1) + j;
  const add = (a, b) => { const l = next.get(a); if (l) l.push(b); else next.set(a, [b]); };
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    if (!inSet(i, j)) continue;
    /* counter-clockwise: bottom edge runs +i, right edge +j, top edge -i, left edge -j */
    if (!inSet(i, j - 1)) add(key(i, j), key(i + 1, j));
    if (!inSet(i + 1, j)) add(key(i + 1, j), key(i + 1, j + 1));
    if (!inSet(i, j + 1)) add(key(i + 1, j + 1), key(i, j + 1));
    if (!inSet(i - 1, j)) add(key(i, j + 1), key(i, j));
  }
  const loops = [];
  const keys = [...next.keys()].sort((a, b) => a - b);
  for (const start of keys) {
    while (next.get(start) && next.get(start).length) {
      const loop = []; let cur = start;
      do {
        const l = next.get(cur); if (!l || !l.length) break;
        /* at a pinch (two ways out) take the lower key: deterministic, and both loops close in the end */
        l.sort((a, b) => a - b); const to = l.shift();
        loop.push(cur); cur = to;
      } while (cur !== start);
      if (loop.length >= 4) loops.push(loop.map(k => [Math.floor(k / (ny + 1)), k % (ny + 1)]));
    }
  }
  return loops;
}
const signedArea = p => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; } return a / 2; };
/* Douglas-Peucker on a closed loop: the two farthest-apart points start it, both halves simplify */
function simplify(loop, tol) {
  const n = loop.length; let a = 0, b = 0, best = -1;
  for (let i = 0; i < n; i++) { const d = Math.hypot(loop[i][0] - loop[0][0], loop[i][1] - loop[0][1]); if (d > best) { best = d; b = i; } }
  const keep = new Uint8Array(n); keep[a] = keep[b] = 1;
  const segDist = (p, u, v) => { const dx = v[0] - u[0], dy = v[1] - u[1], l2 = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((p[0] - u[0]) * dx + (p[1] - u[1]) * dy) / l2)); return Math.hypot(u[0] + dx * t - p[0], u[1] + dy * t - p[1]); };
  const stack = [[a, b], [b, a + n]];
  while (stack.length) {
    const [s, e] = stack.pop(); if (e - s < 2) continue;
    let far = -1, fi = -1;
    for (let i = s + 1; i < e; i++) { const d = segDist(loop[i % n], loop[s % n], loop[e % n]); if (d > far) { far = d; fi = i; } }
    if (far > tol) { keep[fi % n] = 1; stack.push([s, fi], [fi, e]); }
  }
  const out = []; for (let i = 0; i < n; i++) if (keep[i]) out.push(loop[i]);
  return out;
}
/* the card's directions: 0 and 90 degrees always; the diagonal when enough outline runs along one off-axis angle */
function directions(loops) {
  const bins = new Float64Array(180); let total = 0;
  for (const p of loops) for (let i = 0; i < p.length; i++) {
    const q = p[i], r = p[(i + 1) % p.length], dx = r[0] - q[0], dy = r[1] - q[1], l = Math.hypot(dx, dy); if (l < 1e-9) continue;
    let ang = Math.atan2(dy, dx) * 180 / Math.PI; ang = ((ang % 180) + 180) % 180; total += l;
    const a = Math.round(ang) % 180; if (Math.min(a % 90, 90 - a % 90) < 8) continue;   /* near an axis */
    bins[a] += l;
  }
  let best = -1, bw = 0; for (let a = 0; a < 180; a++) { const w = (bins[(a + 179) % 180] + bins[a] + bins[(a + 1) % 180]); if (w > bw) { bw = w; best = a; } }
  const dirs = [0, 90]; let diag = null;
  if (best >= 0 && bw / total >= DIAG_MIN_SHARE) { diag = best; dirs.push(best, (best + 90) % 180); }
  return { dirs, diag, share: total ? bw / total : 0 };
}
/* every edge takes the nearest card direction; consecutive edges meet where their lines cross; parallel
   neighbours merge. Edges too short to matter (under half a cell) are dropped first. */
function snap(loop, dirs) {
  let pts = loop.slice();
  for (let round = 0; round < 3; round++) {
    const edges = [];
    for (let i = 0; i < pts.length; i++) {
      const q = pts[i], r = pts[(i + 1) % pts.length], dx = r[0] - q[0], dy = r[1] - q[1], l = Math.hypot(dx, dy); if (l < 1e-9) continue;
      let ang = Math.atan2(dy, dx) * 180 / Math.PI; const a180 = ((ang % 180) + 180) % 180;
      let bd = dirs[0], bdd = 999; for (const d of dirs) { const diff = Math.min(Math.abs(a180 - d), 180 - Math.abs(a180 - d)); if (diff < bdd) { bdd = diff; bd = d; } }
      /* the snapped direction keeps the edge's sense (forward or back along the card direction) */
      let sa = bd; if (Math.abs(((ang - sa) % 360 + 540) % 360 - 180) < 90) sa += 180;
      const rad = sa * Math.PI / 180;
      edges.push({ mx: (q[0] + r[0]) / 2, my: (q[1] + r[1]) / 2, ux: Math.cos(rad), uy: Math.sin(rad), dir: bd, l });
    }
    /* merge runs of the same direction into one line through their length-weighted midpoint */
    const merged = [];
    for (const e of edges) {
      const last = merged[merged.length - 1];
      if (last && last.dir === e.dir && (last.ux * e.ux + last.uy * e.uy) > 0) { const w = last.l + e.l; last.mx = (last.mx * last.l + e.mx * e.l) / w; last.my = (last.my * last.l + e.my * e.l) / w; last.l = w; }
      else merged.push(Object.assign({}, e));
    }
    if (merged.length > 1) { const f = merged[0], l = merged[merged.length - 1]; if (f.dir === l.dir && (f.ux * l.ux + f.uy * l.uy) > 0) { const w = f.l + l.l; f.mx = (f.mx * f.l + l.mx * l.l) / w; f.my = (f.my * f.l + l.my * l.l) / w; f.l = w; merged.pop(); } }
    if (merged.length < 3) return null;
    const out = [];
    for (let i = 0; i < merged.length; i++) {
      const a = merged[i], b = merged[(i + 1) % merged.length];
      const den = a.ux * b.uy - a.uy * b.ux;
      if (Math.abs(den) < 1e-9) { out.push([a.mx + a.ux * a.l / 2, a.my + a.uy * a.l / 2]); continue; }
      const t = ((b.mx - a.mx) * b.uy - (b.my - a.my) * b.ux) / den;
      out.push([a.mx + a.ux * t, a.my + a.uy * t]);
    }
    /* vertices out of the edge's order (a crossing) or edges under half a cell: drop and go round again */
    const cleaned = [];
    for (let i = 0; i < out.length; i++) { const q = out[i], r = out[(i + 1) % out.length]; if (Math.hypot(r[0] - q[0], r[1] - q[1]) >= .5) cleaned.push(q); }
    if (cleaned.length === out.length || cleaned.length < 3) { pts = out; break; }
    pts = cleaned;
  }
  return pts.length >= 3 ? pts : null;
}
/* the polygon moved inward by c (to the left of each edge, which is into the material for both outer loops and
   holes); null when an edge would reverse, which means the loop is too small for the chamfer */
function inset(loop, c) {
  const n = loop.length, lines = [];
  for (let i = 0; i < n; i++) { const q = loop[i], r = loop[(i + 1) % n], dx = r[0] - q[0], dy = r[1] - q[1], l = Math.hypot(dx, dy) || 1; lines.push({ x: q[0] - dy / l * c, y: q[1] + dx / l * c, ux: dx / l, uy: dy / l }); }
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = lines[(i + n - 1) % n], b = lines[i], den = a.ux * b.uy - a.uy * b.ux;
    if (Math.abs(den) < 1e-9) { out.push([b.x, b.y]); continue; }
    const t = ((b.x - a.x) * b.uy - (b.y - a.y) * b.ux) / den; out.push([a.x + a.ux * t, a.y + a.uy * t]);
  }
  for (let i = 0; i < n; i++) { const q = out[i], r = out[(i + 1) % n], dx = r[0] - q[0], dy = r[1] - q[1]; if (dx * lines[i].ux + dy * lines[i].uy <= 0) return null; }
  return out;
}

/* ---------- 3 triangulation: ear clipping with holes bridged in ---------- */
function triangulate(outer, holes) {
  /* outer counter-clockwise, holes clockwise; each hole is bridged to the outer ring at the outer vertex visible
     from the hole's rightmost vertex (Eberly), then ears are clipped */
  let ring = outer.map(p => [p[0], p[1]]);
  const hs = holes.map(h => h.map(p => [p[0], p[1]])).sort((a, b) => Math.max(...b.map(p => p[0])) - Math.max(...a.map(p => p[0])));
  const inTri = (p, a, b, c) => { const s = (a[0] - c[0]) * (p[1] - c[1]) - (a[1] - c[1]) * (p[0] - c[0]), t = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]); if ((s < 0) !== (t < 0) && s !== 0 && t !== 0) return false; const d = (c[0] - b[0]) * (p[1] - b[1]) - (c[1] - b[1]) * (p[0] - b[0]); return d === 0 || (d < 0) === (s + t <= 0); };
  for (const h of hs) {
    let mi = 0; for (let i = 1; i < h.length; i++) if (h[i][0] > h[mi][0] || (h[i][0] === h[mi][0] && h[i][1] < h[mi][1])) mi = i;
    const M = h[mi];
    /* the ray +x from M: the nearest ring edge it meets, then the visible vertex */
    let bestT = Infinity, bestI = -1, I = null;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      if ((a[1] > M[1]) === (b[1] > M[1])) continue;
      const x = a[0] + (M[1] - a[1]) * (b[0] - a[0]) / (b[1] - a[1]);
      if (x >= M[0] && x < bestT) { bestT = x; bestI = i; I = [x, M[1]]; }
    }
    if (bestI < 0) continue;   /* a hole the ray never leaves: ignored rather than guessed */
    const a = ring[bestI], b = ring[(bestI + 1) % ring.length];
    let P = a[0] > b[0] ? bestI : (bestI + 1) % ring.length;
    /* a reflex vertex inside triangle M, I, P that makes a smaller angle with +x wins */
    let bestAng = Infinity, bestP = P;
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i]; if (i === P || !inTri(p, M, I, ring[P])) continue;
      const prev = ring[(i + ring.length - 1) % ring.length], nxt = ring[(i + 1) % ring.length];
      const cross = (p[0] - prev[0]) * (nxt[1] - p[1]) - (p[1] - prev[1]) * (nxt[0] - p[0]); if (cross >= 0) continue;
      const ang = Math.abs(Math.atan2(p[1] - M[1], p[0] - M[0])); if (ang < bestAng) { bestAng = ang; bestP = i; }
    }
    P = bestP;
    const spliced = ring.slice(0, P + 1).concat(h.slice(mi), h.slice(0, mi + 1), ring.slice(P));
    ring = spliced;
  }
  /* ear clipping on the bridged ring; vertices carry their index for the caller */
  const idx = ring.map((_, i) => i), tris = [];
  const convex = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) > 1e-12;
  let guard = 0;
  while (idx.length > 3 && guard++ < 100000) {
    let clipped = false;
    for (let i = 0; i < idx.length; i++) {
      const i0 = idx[(i + idx.length - 1) % idx.length], i1 = idx[i], i2 = idx[(i + 1) % idx.length], a = ring[i0], b = ring[i1], c = ring[i2];
      if (!convex(a, b, c)) continue;
      let empty = true;
      for (const k of idx) { if (k === i0 || k === i1 || k === i2) continue; const p = ring[k]; if ((p[0] === a[0] && p[1] === a[1]) || (p[0] === b[0] && p[1] === b[1]) || (p[0] === c[0] && p[1] === c[1])) continue; if (inTri(p, a, b, c)) { empty = false; break; } }
      if (!empty) continue;
      tris.push([i0, i1, i2]); idx.splice(i, 1); clipped = true; break;
    }
    if (!clipped) {
      /* no ear: a collinear or degenerate corner; clip the flattest one so the loop still closes */
      let fi = 0, fa = Infinity;
      for (let i = 0; i < idx.length; i++) { const a = ring[idx[(i + idx.length - 1) % idx.length]], b = ring[idx[i]], c = ring[idx[(i + 1) % idx.length]]; const ar = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])); if (ar < fa) { fa = ar; fi = i; } }
      tris.push([idx[(fi + idx.length - 1) % idx.length], idx[fi], idx[(fi + 1) % idx.length]]); idx.splice(fi, 1);
    }
  }
  if (idx.length === 3) tris.push([idx[0], idx[1], idx[2]]);
  return { ring, tris };
}

/* ---------- 4 the rebuild ---------- */
export function rebuild(body, G, materialOf, log) {
  const { nx, ny, nz, size, ox, oy, oz, at, solid, skinCell, count, bucket } = G;
  const { front, back } = heightMap(G);
  const F = levels(front, nz), B = levels(back, nz);
  const backK = B.L.length ? B.L.reduce((best, k) => (B.hist[k] > B.hist[best] ? k : best), B.L[0]) : 0;   /* the back is one flat level: its strongest */
  const label = majorityFilter(F.label, nx, ny);
  const { comp, list } = components(label, nx, ny);
  const allCols = []; for (let c = 0; c < nx * ny; c++) if (label[c] >= 0) allCols.push(c);
  /* the floor: the lowest level with a region big enough to be a part; its regions are the slab's own top and
     cost no part. The other regions, named by where they sit, rank by area; corner caps at one level count as
     ONE part (four solids), and the slab plus the top-ranked fill PARTS_MAX. */
  const big = list.filter(r => r.cells >= MIN_REGION).sort((a, b) => b.cells - a.cells || a.id - b.id);
  const floorLevelIdx = Math.min(...big.map(r => r.level));
  const preName = new Map();
  for (const r of big) { if (r.level === floorLevelIdx) continue; const loops = traceLoops((i, j) => i >= 0 && j >= 0 && i < nx && j < ny && comp[i * ny + j] === r.id, nx, ny).map(l => simplify(l, DP_TOL[0])).filter(l => l && l.length >= 3); preName.set(r.id, nameOfRegion(r.id, loops, c => comp[c] === r.id)); }
  const groups = [];
  for (const r of big) {
    if (r.level === floorLevelIdx) continue;
    const name = preName.get(r.id);
    if (name === 'cap') { let g = groups.find(x => x.name === 'caps' && x.level === r.level); if (!g) { g = { name: 'caps', level: r.level, ids: [], cells: 0 }; groups.push(g); } g.ids.push(r.id); g.cells += r.cells; }
    else groups.push({ name, level: r.level, ids: [r.id], cells: r.cells });
  }
  groups.sort((a, b) => b.cells - a.cells || a.ids[0] - b.ids[0]);
  const keptGroups = groups.slice(0, PARTS_MAX - 1);
  const keptIds = new Set(); for (const g of keptGroups) for (const id of g.ids) keptIds.add(id);
  for (const r of big) if (r.level === floorLevelIdx) keptIds.add(r.id);   /* floor regions stay as the slab's top */
  const groupOf = new Map(); for (const g of keptGroups) for (const id of g.ids) groupOf.set(id, g);
  /* every dropped column joins the nearest kept region (a flood from the kept regions outward, 4-connected) */
  const owner = new Int32Array(nx * ny).fill(-1), queue = new Int32Array(nx * ny); let head = 0, tail = 0;
  for (let c = 0; c < nx * ny; c++) if (comp[c] >= 0 && keptIds.has(comp[c])) { owner[c] = comp[c]; queue[tail++] = c; }
  while (head < tail) {
    const c = queue[head++], i = (c / ny) | 0, j = c % ny;
    const go = d => { if (label[d] >= 0 && owner[d] < 0) { owner[d] = owner[c]; queue[tail++] = d; } };
    if (i > 0) go(c - ny); if (i < nx - 1) go(c + ny); if (j > 0) go(c - 1); if (j < ny - 1) go(c + 1);
  }
  const dropped = list.filter(r => !keptIds.has(r.id)).reduce((s, r) => s + r.cells, 0);
  const regions = big.filter(r => keptIds.has(r.id)).map(r => ({ id: r.id, level: F.L[r.level], k: r.level, cells: 0, group: groupOf.get(r.id) || null }));
  const byId = new Map(regions.map(r => [r.id, r]));
  for (let c = 0; c < nx * ny; c++) if (owner[c] >= 0) byId.get(owner[c]).cells++;
  const levelOfCol = c => owner[c] < 0 ? -1 : byId.get(owner[c]).level;
  const floorK = Math.min(...regions.map(r => r.level));
  /* the rim chamfer, measured: from each column on the card's outline, walk inward along the axis it faces until
     the raw height reaches its region's level; the median run is the chamfer's width, the median height drop at
     the rim its height */
  const widths = [], drops = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const c = i * ny + j; if (owner[c] < 0) continue;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [di, dj] of dirs) {
      const ii = i - di, jj = j - dj; if (ii >= 0 && jj >= 0 && ii < nx && jj < ny && owner[ii * ny + jj] >= 0) continue;   /* not a rim column on this side */
      const L = levelOfCol(c); let w = 0;
      for (let s = 0; s < 12; s++) { const x = i + di * s, y = j + dj * s; if (x < 0 || y < 0 || x >= nx || y >= ny) break; if (front[x * ny + y] >= L - 1) break; w++; }
      if (w > 0 && w < 12) { widths.push(w); drops.push(Math.max(0, L - front[c])); }
    }
  }
  const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
  const chamferW = median(widths), chamferH = Math.min(median(drops), chamferW || 0);
  /* outlines per region and the card's outline (the slab) */
  const dirInfo = { dirs: [0, 90], diag: null, share: 0 };
  function outlines(inSet, tol) {
    const loops = traceLoops(inSet, nx, ny).map(l => simplify(l, tol)).filter(l => l && l.length >= 3);
    return loops;
  }
  /* the diagonal: measured once from the simplified outlines of every region at the smallest tolerance */
  const rawLoops = []; for (const r of regions) rawLoops.push(...outlines((i, j) => i >= 0 && j >= 0 && i < nx && j < ny && owner[i * ny + j] === r.id, DP_TOL[0]));
  Object.assign(dirInfo, directions(rawLoops));
  /* material per region: the majority over the skin faces in each column's top cell */
  function majorityMaterial(cols, useBack) {
    const tally = new Map();
    for (const c of cols) {
      const i = (c / ny) | 0, j = c % ny, k = useBack ? back[c] : front[c]; if (k < 0) continue;
      const cell = at(i, j, k); if (!skinCell[cell]) continue;
      for (let t = count[cell]; t < count[cell + 1]; t++) { const mi = body.fm[bucket[t]]; tally.set(mi, (tally.get(mi) || 0) + 1); }
    }
    let best = -1, bc = 0; for (const [mi, n] of tally) if (n > bc || (n === bc && mi < best)) { best = mi; bc = n; }
    return best < 0 ? 0 : best;
  }
  const colsOf = id => { const out = []; for (let c = 0; c < nx * ny; c++) if (owner[c] === id) out.push(c); return out; };
  /* names from what each region is, by where it sits and how it is shaped */
  function nameOfRegion(id, loops, member) {
    const cols = []; for (let c = 0; c < nx * ny; c++) if (member(c)) cols.push(c);
    let minI = nx, maxI = 0, minJ = ny, maxJ = 0;
    for (const c of cols) { const i = (c / ny) | 0, j = c % ny; if (i < minI) minI = i; if (i > maxI) maxI = i; if (j < minJ) minJ = j; if (j > maxJ) maxJ = j; }
    let cMinI = nx, cMaxI = 0, cMinJ = ny, cMaxJ = 0; for (const c of allCols) { const i = (c / ny) | 0, j = c % ny; if (i < cMinI) cMinI = i; if (i > cMaxI) cMaxI = i; if (j < cMinJ) cMinJ = j; if (j > cMaxJ) cMaxJ = j; }
    const wShare = (maxI - minI) / (cMaxI - cMinI), hShare = (maxJ - minJ) / (cMaxJ - cMinJ), holes = loops.filter(l => signedArea(l) < 0).length;
    let diagLen = 0, total = 0;
    for (const l of loops) for (let i = 0; i < l.length; i++) { const q = l[i], p = l[(i + 1) % l.length], dx = p[0] - q[0], dy = p[1] - q[1], len = Math.hypot(dx, dy); total += len; const a = ((Math.atan2(dy, dx) * 180 / Math.PI % 180) + 180) % 180; if (Math.min(a % 90, 90 - a % 90) >= 8) diagLen += len; }
    const cy = (minJ + maxJ) / 2, cx = (minI + maxI) / 2;
    const nearSide = cx < cMinI + (cMaxI - cMinI) * .25 || cx > cMinI + (cMaxI - cMinI) * .75;
    if (wShare > .8 && hShare > .8 && holes) return 'frame';
    if (wShare > .5 && hShare > .5) return 'panel';
    if (cy > cMinJ + (cMaxJ - cMinJ) * .85) return nearSide ? 'cap' : 'tab';
    if (cy < cMinJ + (cMaxJ - cMinJ) * .15) return nearSide ? 'cap' : 'foot';
    if (cx < cMinI + (cMaxI - cMinI) * .2 || cx > cMinI + (cMaxI - cMinI) * .8) return 'rail';
    if (total && diagLen / total > .5) return 'stripe';
    return 'plate';
  }
  /* the geometry, at one tolerance: faces as polygons with a normal; vertices split per face (flat shading) */
  function build(tol) {
    const parts = [];   /* { name, level, k, tris, verts, material, closed: stats-ready arrays, faces } */
    const zTop = k => oz + (k + 1) * size, X = i => ox + i * size, Y = j => oy + j * size;
    function emptyPart(name, level, material) { return { name, level, material, pos: [], nrm: [], idx: [], closedPos: [], closedIdx: [], cells: 0 }; }
    function face(part, poly3, normal, hidden) {
      /* a planar polygon: a fan of triangles over split vertices; the closed proof keeps every face, the written
         mesh only the ones that show */
      const n = poly3.length, base = part.closedPos.length / 3;
      for (const p of poly3) part.closedPos.push(p[0], p[1], p[2]);
      for (let i = 1; i < n - 1; i++) part.closedIdx.push(base, base + i, base + i + 1);
      if (hidden) return;
      const b2 = part.pos.length / 3;
      for (const p of poly3) { part.pos.push(p[0], p[1], p[2]); part.nrm.push(normal[0], normal[1], normal[2]); }
      for (let i = 1; i < n - 1; i++) part.idx.push(b2, b2 + i, b2 + i + 1);
    }
    function polyFace(part, outer, holes, z, up, mode) {
      /* a top or bottom face with holes, triangulated; up = +1 faces +z, -1 faces -z (reversed winding).
         mode: 'both' (proof and written), 'closed' (the proof's solid only: a hidden face), 'written' (shown only:
         the slab's top where the floor level shows, which the proof already has as the whole outline) */
      const { ring, tris } = triangulate(up > 0 ? outer : outer.slice().reverse(), up > 0 ? holes : holes.map(h => h.slice().reverse()));
      const closed = mode !== 'written', written = mode !== 'closed';
      const base = part.closedPos.length / 3, b2 = part.pos.length / 3;
      for (const p of ring) { if (closed) part.closedPos.push(X(p[0]), Y(p[1]), z); if (written) { part.pos.push(X(p[0]), Y(p[1]), z); part.nrm.push(0, 0, up); } }
      for (const t of tris) { if (closed) part.closedIdx.push(base + t[0], base + t[1], base + t[2]); if (written) part.idx.push(b2 + t[0], b2 + t[1], b2 + t[2]); }
    }
    function wall(part, q, r, z0, z1, hidden) {
      if (z1 <= z0 + 1e-9) return;
      const dx = r[0] - q[0], dy = r[1] - q[1], l = Math.hypot(dx, dy) || 1;
      /* the loop runs counter-clockwise round the material, so the outward normal is to the right of the edge */
      face(part, [[X(q[0]), Y(q[1]), z0], [X(r[0]), Y(r[1]), z0], [X(r[0]), Y(r[1]), z1], [X(q[0]), Y(q[1]), z1]], [dy / l, -dx / l, 0], hidden);
    }
    /* neighbour level outside an edge: sampled at the edge's midpoint one half cell to the right (outward) */
    function outsideLevel(q, r) {
      const dx = r[0] - q[0], dy = r[1] - q[1], l = Math.hypot(dx, dy) || 1, mx = (q[0] + r[0]) / 2 + dy / l * .5, my = (q[1] + r[1]) / 2 - dx / l * .5;
      const i = Math.floor(mx), j = Math.floor(my); if (i < 0 || j < 0 || i >= nx || j >= ny) return -1;
      return levelOfCol(i * ny + j);
    }
    /* the slab: the card's outline from the back to the floor; its top shows only where the floor level is */
    const slab = emptyPart('slab', floorK, majorityMaterial(allCols, true)); slab.cells = allCols.length;
    const cardLoops = outlines((i, j) => i >= 0 && j >= 0 && i < nx && j < ny && owner[i * ny + j] >= 0, tol).map(l => snap(l, dirInfo.dirs)).filter(Boolean);
    const cardOuter = cardLoops.filter(l => signedArea(l) > 0).sort((a, b) => signedArea(b) - signedArea(a)), cardHoles = cardLoops.filter(l => signedArea(l) < 0);
    if (!cardOuter.length) throw new Error('the card has no outline on the grid');
    const zBack = oz + backK * size, zFloor = zTop(floorK);
    polyFace(slab, cardOuter[0], cardHoles, zBack, -1, 'both');
    for (const l of cardLoops) for (let i = 0; i < l.length; i++) wall(slab, l[i], l[(i + 1) % l.length], zBack, zFloor, false);
    parts.push(slab);
    const partOfGroup = new Map();
    for (const r of regions) {
      const loops = outlines((i, j) => i >= 0 && j >= 0 && i < nx && j < ny && owner[i * ny + j] === r.id, tol).map(l => snap(l, dirInfo.dirs)).filter(Boolean);
      const outer = loops.filter(l => signedArea(l) > 0).sort((a, b) => signedArea(b) - signedArea(a)), holes = loops.filter(l => signedArea(l) < 0);
      if (!outer.length) continue;
      if (r.level === floorK) {
        /* the floor level is the slab's own top where it shows: written only, the proof has the whole outline */
        polyFace(slab, outer[0], holes, zFloor, 1, 'written');
        continue;
      }
      r.name = r.group ? r.group.name : 'plate';
      /* a group (the corner caps) is one part with several solids; a region alone is its own part */
      let part = partOfGroup.get(r.group);
      if (!part) { part = emptyPart(r.name, r.level, majorityMaterial(r.group.ids.flatMap(colsOf), false)); part.cells = r.group.cells; part.k = r.level; part.solids = 0; partOfGroup.set(r.group, part); parts.push(part); }
      part.solids++;
      const z1 = zTop(r.level);
      /* the chamfer: the top polygon moved in by its width, a bevel band down to the wall's top; loops too small
         for it keep a square edge */
      const cw = chamferW, ch = chamferH, zBevel = z1 - ch * size;
      const topLoops = [], bevel = [], wallTopOf = new Map();
      for (const l of [outer[0], ...holes]) { const ins = cw > 0 ? inset(l, cw) : null; if (ins) { topLoops.push(ins); bevel.push([l, ins]); wallTopOf.set(l, zBevel); } else { topLoops.push(l); wallTopOf.set(l, z1); } }
      polyFace(part, topLoops[0], topLoops.slice(1), z1, 1, 'both');
      for (const [l, ins] of bevel) for (let i = 0; i < l.length; i++) {
        const q = l[i], rr = l[(i + 1) % l.length], q2 = ins[i], r2 = ins[(i + 1) % l.length];
        const p0 = [X(q[0]), Y(q[1]), zBevel], p1 = [X(rr[0]), Y(rr[1]), zBevel], p2 = [X(r2[0]), Y(r2[1]), z1], p3 = [X(q2[0]), Y(q2[1]), z1];
        const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2], bx = p3[0] - p0[0], by = p3[1] - p0[1], bz = p3[2] - p0[2];
        const n = [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx], nl = Math.hypot(...n) || 1;
        face(part, [p0, p1, p2, p3], [n[0] / nl, n[1] / nl, n[2] / nl], false);
      }
      /* walls: from the floor (the closed proof) and, written, from where the neighbour's body ends */
      for (const l of [outer[0], ...holes]) for (let i = 0; i < l.length; i++) {
        const wallTop = wallTopOf.get(l), q = l[i], rr = l[(i + 1) % l.length], nl = outsideLevel(q, rr);
        const z0 = nl < 0 ? zFloor : Math.max(zFloor, zTop(Math.min(nl, r.level)));
        /* the closed solid has the whole wall; the written mesh the part above the neighbour only */
        const n = (() => { const dx = rr[0] - q[0], dy = rr[1] - q[1], ll = Math.hypot(dx, dy) || 1; return [dy / ll, -dx / ll, 0]; })();
        const whole = [[X(q[0]), Y(q[1]), zFloor], [X(rr[0]), Y(rr[1]), zFloor], [X(rr[0]), Y(rr[1]), wallTop], [X(q[0]), Y(q[1]), wallTop]];
        const base = part.closedPos.length / 3; for (const p of whole) part.closedPos.push(p[0], p[1], p[2]); part.closedIdx.push(base, base + 1, base + 2, base, base + 2, base + 3);
        if (wallTop > z0 + 1e-9) {
          const b2 = part.pos.length / 3; for (const p of [[X(q[0]), Y(q[1]), z0], [X(rr[0]), Y(rr[1]), z0], [X(rr[0]), Y(rr[1]), wallTop], [X(q[0]), Y(q[1]), wallTop]]) { part.pos.push(p[0], p[1], p[2]); part.nrm.push(n[0], n[1], n[2]); }
          part.idx.push(b2, b2 + 1, b2 + 2, b2, b2 + 2, b2 + 3);
        }
      }
      /* the bottom, for the proof only: a raised part sits on the slab */
      polyFace(part, outer[0], holes, zFloor, -1, 'closed');
    }
    /* the slab's closed proof needs its top everywhere: the card outline at the floor, hidden in the written mesh */
    polyFace(slab, cardOuter[0], cardHoles, zFloor, 1, 'closed');
    return parts;
  }
  let parts = null, tolUsed = DP_TOL[0];
  for (const tol of DP_TOL) {
    parts = build(tol); tolUsed = tol;
    const tris = parts.reduce((s, p) => s + p.idx.length / 3, 0), verts = parts.reduce((s, p) => s + p.pos.length / 3, 0);
    if (tris <= TRIS_MAX && 48 + verts * 16 + tris * 6 + parts.length * 16 <= BYTES_MAX) break;
  }
  /* the proof per part: welded by exact position, the closed solid's topology */
  function closedStats(part) {
    const key = new Map(), remap = new Int32Array(part.closedPos.length / 3), X = [], Y = [], Z = [];
    for (let i = 0; i < remap.length; i++) { const k = part.closedPos[i * 3].toFixed(9) + ',' + part.closedPos[i * 3 + 1].toFixed(9) + ',' + part.closedPos[i * 3 + 2].toFixed(9); let id = key.get(k); if (id == null) { id = X.length; key.set(k, id); X.push(part.closedPos[i * 3]); Y.push(part.closedPos[i * 3 + 1]); Z.push(part.closedPos[i * 3 + 2]); } remap[i] = id; }
    const n = X.length, parent = new Int32Array(n); for (let i = 0; i < n; i++) parent[i] = i;
    const find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
    const edges = new Map(); let faces = 0;
    for (let f = 0; f < part.closedIdx.length; f += 3) {
      const a = remap[part.closedIdx[f]], b = remap[part.closedIdx[f + 1]], c = remap[part.closedIdx[f + 2]]; if (a === b || b === c || a === c) continue; faces++;
      for (const [p, q] of [[a, b], [b, c], [c, a]]) { const k = p < q ? p * n + q : q * n + p; edges.set(k, (edges.get(k) || 0) + 1); const rp = find(p), rq = find(q); if (rp !== rq) parent[rp] = rq; }
    }
    let open = 0, nonManifold = 0; for (const v of edges.values()) { if (v === 1) open++; else if (v > 2) nonManifold++; }
    const comps = new Set(); for (let i = 0; i < n; i++) comps.add(find(i));
    return { faces, vertices: n, components: comps.size, open, nonManifold };
  }
  const table = parts.map(p => Object.assign({ name: p.name, level: p.level, cells: p.cells, material: p.material, solids: p.solids || 1, tris: p.idx.length / 3, verts: p.pos.length / 3 }, closedStats(p)));
  const totalCols = allCols.length;
  const droppedList = list.filter(r => !keptIds.has(r.id) && r.cells >= MIN_REGION / 4).sort((a, b) => b.cells - a.cells).slice(0, 12).map(r => ({ name: preName.get(r.id) || 'speck', level: F.L[r.level], cells: r.cells, share: r.cells / totalCols }));
  const merged = { pos: [], nrm: [], uv: [], idx: [], draws: [], tris: 0 };
  let base = 0;
  for (const p of parts) {
    merged.draws.push({ material: p.material, first: merged.idx.length, count: p.idx.length, name: p.name });
    merged.pos.push(...p.pos); merged.nrm.push(...p.nrm); for (let i = 0; i < p.pos.length / 3; i++) merged.uv.push(0, 0);
    for (const i of p.idx) merged.idx.push(i + base); base += p.pos.length / 3;
  }
  merged.tris = merged.idx.length / 3;
  log(`  levels: front ${F.L.join(', ')} (cells; the slab's floor ${floorK}), back ${B.L.join(', ')} (flat at ${backK}); ${list.length} regions, ${regions.length} kept, ${dropped} of ${totalCols} columns (${(dropped / totalCols * 100).toFixed(1)}%) of dropped features joined their neighbours; chamfer ${chamferW} x ${chamferH} cells; directions ${dirInfo.dirs.join(', ')} degrees (diagonal share ${(dirInfo.share * 100).toFixed(1)}%); tolerance ${tolUsed} cell(s)`);
  return { mesh: merged, parts: table, dropped: droppedList, levels: F.L, floorK, backK, chamfer: [chamferW, chamferH], dirs: dirInfo.dirs, tol: tolUsed, cellSize: size };
}
