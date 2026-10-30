/* Stage rows written as SAMPLES along channels (docs/design/world-grammar/PORT.md batches 2 and 3). Build side, Node built-ins only.
   The identity views (world-id-scene.mjs) and the how-it-works views (world-how-scene.mjs) both write a part's rows at the view's rest and, along each channel the part
   depends on, at the values where the row has a corner. This file is the one copy of that: the knots are DERIVED (a fine grid of the channel is evaluated and a knot is kept
   only where the line between its neighbours would miss a row by more than EPS), so no knot is chosen by hand and the error is bounded; a row the stage hid stands where
   its neighbour is; a part is written as a pool of its distinct rows and a table of 16-bit indexes. Nothing here knows a view. */

export const EPS = 3e-3;   /* a row is within this of the line between its knots, in matrix units, gain and mix */
const key = (r) => r.map((x) => Math.fround(x)).join(',');
export { key };

/* a row the stage hid takes the place of its neighbour at a point's size, so the line between a shown row and a hidden one is a row growing from where it stands */
export const shrunk = (r) => { const o = r.slice(); for (let c = 0; c < 9; c++) o[c] *= 1e-4; return o; };
export function mend(list, fallback) {
  if (!list.length) return;
  for (let r = 0; r < list[0].length; r++) {
    const shown = list.map((rows, k) => (rows[r][15] >= 0 ? k : -1)).filter((k) => k >= 0);
    if (shown.length === 0) {
      if (fallback && fallback[r][15] >= 0) list.forEach((rows, k) => { rows[r] = shrunk(fallback[r]); });
      continue;
    }
    list.forEach((rows, k) => {
      if (rows[r][15] >= 0) return;
      let best = shown[0]; for (const s of shown) if (Math.abs(s - k) < Math.abs(best - k)) best = s;
      rows[r] = shrunk(list[best][r]);
    });
  }
}

/* the derived knots of one part along one channel: frames[k] are the part's rows at grid point k */
export function knotsOf(frames, restIndex) {
  const n = frames.length, flat = frames.map((rows) => rows.map((r) => [...r.slice(0, 12), r[15], r[14]]));
  const tf = frames.map((rows) => rows.map((r) => r[12] + ',' + r[13]).join(';'));
  const dev = (a, b, k) => {
    if (tf[k] !== tf[a] || tf[k] !== tf[b]) return Infinity;
    const u = (k - a) / (b - a); let m = 0;
    for (let r = 0; r < flat[k].length; r++) for (let c = 0; c < 14; c++) m = Math.max(m, Math.abs(flat[k][r][c] - (flat[a][r][c] + (flat[b][r][c] - flat[a][r][c]) * u)));
    return m;
  };
  const keep = new Set([0, n - 1, restIndex]);
  const stack = [];
  const sorted = () => [...keep].sort((x, y) => x - y);
  // a tone change is a knot on each side of it: split wherever the colours of two neighbours differ
  for (let k = 1; k < n; k++) if (tf[k] !== tf[k - 1]) { keep.add(k - 1); keep.add(k); }
  const ks = sorted(); for (let q = 0; q + 1 < ks.length; q++) stack.push([ks[q], ks[q + 1]]);
  while (stack.length) {
    const [a, b] = stack.pop(); if (b - a < 2) continue;
    let worst = -1, wd = EPS;
    for (let k = a + 1; k < b; k++) { const d = dev(a, b, k); if (d > wd) { wd = d; worst = k; } }
    if (worst >= 0) { keep.add(worst); stack.push([a, worst], [worst, b]); }
  }
  return sorted();
}

/* every listed part's frames for one view: [{ axis, value, rows }] with the base (axis null) first.
   pose(values) returns { part: rows } for the channel values it is given; chans: { name: { lo, hi, rest, N } } */
export function sampleParts(pose, chans, rest, partNames) {
  const out = {}, grids = {};
  for (const [c, d] of Object.entries(chans)) {
    const vals = [...Array(d.N + 1).keys()].map((k) => d.lo + (d.hi - d.lo) * k / d.N);
    grids[c] = { vals, rest: Math.round((d.rest - d.lo) / (d.hi - d.lo) * d.N), all: vals.map((v) => pose({ ...rest, [c]: v })) };
  }
  for (const p of partNames) {
    const lists = {};
    for (const [c, g] of Object.entries(grids)) lists[c] = g.all.map((all) => all[p].map((r) => r.slice()));
    const first = Object.keys(lists)[0], rows0 = lists[first][grids[first].rest].map((r) => r.slice());
    for (const list of Object.values(lists)) mend(list, rows0);
    const frames = [{ axis: null, value: 0, rows: lists[first][grids[first].rest] }];
    for (const [c, list] of Object.entries(lists)) {
      const g = grids[c], ks = knotsOf(list, g.rest);
      if (list.every((rows) => rows.every((r, i) => key(r) === key(list[0][i])))) continue;   /* the part does not depend on this channel */
      for (const k of ks) frames.push({ axis: c, value: g.vals[k], rows: list[k] });
    }
    /* a row some frame shows is a row every frame holds: where a frame hid it, it stands as a point where the nearest frame has it */
    for (let r = 0; r < frames[0].rows.length; r++) {
      const shown = frames.find((fr) => fr.rows[r][15] >= 0);
      if (shown) for (const fr of frames) if (fr.rows[r][15] < 0) fr.rows[r] = shrunk(shown.rows[r]);
    }
    out[p] = frames;
  }
  return out;
}

/* one part's records and bytes for one view (a pool of the distinct rows, then a table of 16-bit indexes into it for each frame's kept rows).
   group: the R value of the group (id, mv); at: the byte offset the part starts at in the group's blob. Returns { rec, rows, idx, pool, frames } */
export function partRecords(group, view, name, list, at, num, flags) {
  const rows0 = list[0].rows.length, kept = [...Array(rows0).keys()].filter((i) => list.some((fr) => fr.rows[i][15] >= 0));
  const shown = kept.length ? kept : [0], pool = [], seen = new Map(), table = [], rec = [];
  const rangesOf = (ks) => { const o = []; ks.forEach((i) => { const l = o[o.length - 1]; if (l && l[0] + l[1] === i) l[1]++; else o.push([i, 1]); }); return o; };
  for (const fr of list) for (const i of shown) {
    const r = fr.rows[i], k = key(r);
    if (!seen.has(k)) { seen.set(k, pool.length); pool.push(r); }
    table.push(seen.get(k));
  }
  if (pool.length > 65535) throw new Error('part ' + name + ' has more distinct rows than a 16-bit index holds');
  const rows = Buffer.alloc(pool.length * 64), idx = Buffer.alloc(Math.ceil(table.length * 2 / 64) * 64);
  pool.forEach((r, i) => { for (let k = 0; k < 16; k++) { if (!Number.isFinite(r[k])) throw new Error('part ' + name + ' of view ' + view + ' holds a row that is not a number: ' + r.join(',')); rows.writeFloatLE(r[k], i * 64 + k * 4); } });
  table.forEach((v, i) => idx.writeUInt16LE(v, i * 2));
  rec.push(`WPART-R${group}-M${name}-O${at}-A${pool.length}` + (flags ? `-L${flags}` : ''));   /* L: 1 the instances can be touched */
  for (const [a, n] of rangesOf(shown)) rec.push(`WROWS-R${group}-M${name}-O${a}-A${n}`);
  list.forEach((fr, k) => rec.push(`WPOSE-R${view}-M${name}-I${k}-A1` + (fr.axis ? `-N${fr.axis}-X${num(fr.value)}` : '')));
  return { rec, rows, idx, pool: pool.length, frames: list.length, bytes: rows.length + idx.length };
}
