/* World grammar, a part's rows as the encoder wrote them (docs/design/world-grammar/PORT.md batch 1, "frame size").

   The chain views' rows (world2-dyn.mjs) and the auth stage's (world2-rig.mjs) are written the same way, so they are read the same way, here. A part in a group's
   blob is a pool of its distinct rows (WPART: the offset and the number of rows, 64 bytes each) and, right after the pool, a table of 16-bit indexes into it, one for
   each kept row of each frame. WROWS names the ranges of the part's original rows that are kept: a row no frame shows is not written, and reads as a hidden row.
   WPOSE with the part names its frames per view (first frame, how many, and an axis with its value when the frames are samples along something).
   A row is 16 floats: a 3x4 matrix, then tone, family and mix (palette indexes and a share, resolved here to a linear colour), then alpha. */
export const HIDE_ROW = new Float32Array(16); HIDE_ROW[0] = HIDE_ROW[4] = HIDE_ROW[8] = 1e-4;

/* the part p of group `group` (its WPART record) from the group's blob. cfg: how the stage draws and blends it. Returns the part's state, rows indexed as the stage knows them
   (the original row i): out and cur are arrays of the original rows, kept lists the ones the blob holds. */
export function loadPart(S, group, p, blob, cfg) {
  const ranges = S.rows[p.part] || [], kept = [], rowOf = [];
  for (const [first, n] of ranges) for (let k = 0; k < n; k++) { rowOf[first + k] = kept.length; kept.push(first + k); }
  const perOrig = rowOf.length, per = kept.length, entries = {};   /* view -> this part's frame entries */
  for (const view of Object.keys(S.pose)) { const own = S.pose[view].filter((q) => q.part === p.part); if (own.length) entries[view] = own; }
  const frames = Math.max(1, ...Object.values(entries).flat().map((q) => q.first + q.count));
  const table = new Uint16Array(blob, p.offset + p.count * 64, frames * per);
  return { name: p.part, cfg, base: p.offset / 4, per: perOrig, kept, rowOf, perKept: per, table, entries, out: new Float32Array(perOrig * 16), cur: new Float32Array(perOrig * 16), f32: new Float32Array(blob) };
}
/* frame `frame` of the part, its original row i, into dst (16 floats) with the colour resolved through the palette (linear r g b, 3 per tone) */
export function resolveRow(e, frame, i, dst, pal) {
  const li = e.rowOf[i];
  if (li == null) { for (let c = 0; c < 16; c++) dst[c] = HIDE_ROW[c]; return; }   /* a row no frame shows: hidden, as it is in every frame */
  const f32 = e.f32, o = e.base + e.table[frame * e.perKept + li] * 16;
  for (let c = 0; c < 12; c++) dst[c] = f32[o + c];
  const a = (f32[o + 12] | 0) * 3, b = (f32[o + 13] | 0) * 3, mix = f32[o + 14];
  for (let c = 0; c < 3; c++) dst[12 + c] = pal[a + c] + (pal[b + c] - pal[a + c]) * mix;
  dst[15] = f32[o + 15];
}

/* the part's row i along one channel at value v. pts: the frames sampled along the channel, [{ value, first }] sorted by value, a line between the two nearest and the end
   frames beyond the ends. Used by every stage that is written as samples (the identity views: world2-idrig.mjs). */
export function alongPts(e, pts, v, i, dst, pal, lo, hi) {
  let k = 0; while (k + 2 < pts.length && pts[k + 1].value <= v) k++;
  const a = pts[k], b = pts[Math.min(pts.length - 1, k + 1)], t = b.value > a.value ? Math.min(1, Math.max(0, (v - a.value) / (b.value - a.value))) : 0;
  resolveRow(e, a.first, i, lo, pal); resolveRow(e, b.first, i, hi, pal);
  for (let c = 0; c < 16; c++) dst[c] = lo[c] + (hi[c] - lo[c]) * t;
}
