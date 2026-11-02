/* World grammar, the network's rings as solid drums (owner, 2026-10-31: "no more hollow or transparent", the rings in the FXN ID card's language).
   Layer: app. Design note: docs/design/auth/FXN-ID-CARD.md ("Every element of the world").

   A ring used to be a circle of small glass tiles with gaps, which read as hollow and see-through. It is now one solid, opaque object: a squat
   drum of stacked plates in the card's metal (fxn-3d engine/render/world.mjs drawDrum, world-shaders.mjs ground mode's lit branch), with
   recessed gaps between the plates, a bright bevel line on every edge in the theme's hue, engraved tick marks round its wall, a closed lid with
   the card's printed face (an inner disc, an engraved ring, a band of ticks), and the kind's colour only as an inlaid stripe round the wall.
   Every ring is the same object; a kind differs by its stripe alone.

   The drums are derived from the frame's own tiles, never authored: each ring's tiles (world.rings, in order, `tiles` each) give its centre,
   radius, height and depth, and its kind's tone. A ring inside another (a ring with a parent) stands on its parent's lid. The kernel's own ring
   (kind hub) is not drawn: the kernel's stack is its object. The tiles, the links between them and the slots are then taken out of the picture.

   Built once, from the frame's rest pose. Not yet carried: the stage's per-ring dimming, the first visit's build-up and the frame morphs move
   the old tiles' streams, which the drums do not follow. */

/* the layers bottom up, as shares of the ring's height and its outer radius, and which layer they are (0 plate, 1 gap, 2 top plate, 3 stripe) */
const STACK = [[.36, 1, 0], [.07, .9, 1], [.1, .996, 3], [.3, .985, 0], [.06, .9, 1], [.11, .97, 2]];
const LAYER_PART = ['drumplate', 'drumgap', 'drumlid', 'drumstripe'];

/* R: the renderer; world: the decoded world (rings); parts: the frame's part list (the host's draw list); blob: the frame's instance buffer */
export function mountDrums(R, world, parts, blob, plate) {
  const tile = parts.find((p) => p.part === 'tile');
  if (!tile || !tile.count) return null;
  const f = new Float32Array(blob, tile.offset, tile.count * 16), n = tile.count, len = (a, b, c) => Math.hypot(a, b, c);
  /* the rings, found from the tiles themselves: a ring's tiles stand side by side, so two tiles closer than their widths belong to one ring (a
     union of neighbours); the blob's order is not the rings' order, so the order is not read */
  const W = new Float32Array(n), up = Array.from({ length: n }, (_, i) => i), find = (i) => (up[i] === i ? i : (up[i] = find(up[i])));
  for (let i = 0; i < n; i++) W[i] = len(f[i * 16], f[i * 16 + 1], f[i * 16 + 2]);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const d = Math.hypot(f[i * 16 + 9] - f[j * 16 + 9], f[i * 16 + 10] - f[j * 16 + 10], f[i * 16 + 11] - f[j * 16 + 11]);
    if (d < .75 * (W[i] + W[j]) * 1.35 && Math.abs(W[i] - W[j]) < .25 * Math.max(W[i], W[j])) up[find(i)] = find(j);
  }
  const groups = new Map(); for (let i = 0; i < n; i++) { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(i); }
  const geo = [];
  groups.forEach((rows) => {
    if (rows.length < 3) return;
    let cx = 0, cy = 0, cz = 0, h = 0, d = 0;
    rows.forEach((j) => { const o = j * 16; cx += f[o + 9]; cy += f[o + 10]; cz += f[o + 11]; h += len(f[o + 3], f[o + 4], f[o + 5]); d += len(f[o + 6], f[o + 7], f[o + 8]) * .28; });
    const k = rows.length; cx /= k; cy /= k; cz /= k; h /= k; d /= k;
    let rad = 0; rows.forEach((j) => { const o = j * 16; rad += Math.hypot(f[o + 9] - cx, f[o + 11] - cz); }); rad /= k;
    const o0 = rows[0] * 16;
    geo.push({ x: cx, y: cy, z: cz, H: h, R: rad + d / 2, tone: [f[o0 + 12], f[o0 + 13], f[o0 + 14]] });
  });
  /* the kernel's own ring (round the plate) is the kernel's stack; a ring whose centre lies inside a bigger one stands on that one's lid */
  const hubAt = plate ? [plate.x, plate.z] : null;
  geo.forEach((g) => { g.hub = !!hubAt && Math.hypot(g.x - hubAt[0], g.z - hubAt[1]) < g.R * .3 && g.R > (plate.scale || 0) * .8; });
  geo.forEach((g) => { g.parent = geo.filter((q) => q !== g && !q.hub && q.R > g.R * 1.3 && Math.hypot(g.x - q.x, g.z - q.z) < q.R)[0] || null; });
  const place = (g) => {
    if (g.placed) return g;
    g.y0 = g.parent ? place(g.parent).y0 + g.parent.H + .02 : g.y - g.H / 2;
    g.placed = true; return g;
  };
  geo.forEach(place);
  /* the instances, one list per layer kind */
  const lists = [[], [], [], []];
  geo.forEach((g) => {
    if (g.hub) return;
    let y = g.y0;
    STACK.forEach(([hs, rs, kind]) => {
      const hh = g.H * hs, r = g.R * rs;
      lists[kind].push(r, 0, 0, 0, hh / .06, 0, 0, 0, r, g.x, y + hh / 2, g.z, g.tone[0], g.tone[1], g.tone[2], 1);
      y += hh;
    });
  });
  const made = lists.map((rows, kind) => {
    const data = new Float32Array(rows);
    return { part: LAYER_PART[kind], like: 'solid', shape: 'ground', drumLayer: kind, buffer: R.buffer(data), offset: 0, count: rows.length / 16, cpu: data.buffer };
  });
  made.forEach((p) => parts.push(p));
  /* the old lattice leaves the picture: its tiles, the links between them, the slots and the glyphs on the tiles */
  const gone = parts.filter((p) => p.part === 'tile' || p.part === 'link' || p.part === 'slot' || p.part === 'glyph');   /* glyph: the bars engraved on the tiles' faces, which would float without them */
  function hide() { gone.forEach((p) => { p.count = 0; }); }
  hide();
  return { hide, parts: made, geo };
}

/* ---------- the same drum for the groups' rings (how-it-works's rings, the identity steps, the chain views): built from the rows a group writes each
   frame, so a drum follows its ring as the stage moves it ----------
   rows: a part's rows (16 floats each: a 3x4 matrix, a linear colour, an alpha), count: how many; box: the block's own size [w, h, d] (the matrix scales
   it). Returns the drum layers' rows (direct colour) and which rows they replace. A ring is five or more blocks of one size standing round a centre. */
/* opts.pedestal: the ring keeps its blocks (they carry words: the chain's records) and the drum is the solid plinth they stand on, closing the ring */
export function drumsOfRows(rows, count, box, opts) {
  const pedestal = !!(opts && opts.pedestal);
  const lists = [[], [], [], []], used = new Set(), rings = [], len = (a, b, c) => Math.hypot(a, b, c);
  const live = []; for (let i = 0; i < count; i++) if (rows[i * 16 + 15] > 1e-3) live.push(i);
  if (live.length < 5) return { lists, used, rings };
  const W = new Map(), up = new Map(), find = (i) => (up.get(i) === i ? i : (up.set(i, find(up.get(i))), up.get(i)));
  live.forEach((i) => { W.set(i, len(rows[i * 16], rows[i * 16 + 1], rows[i * 16 + 2]) * box[0]); up.set(i, i); });
  for (let a = 0; a < live.length; a++) for (let b = a + 1; b < live.length; b++) {
    const i = live[a], j = live[b], d = Math.hypot(rows[i * 16 + 9] - rows[j * 16 + 9], rows[i * 16 + 10] - rows[j * 16 + 10], rows[i * 16 + 11] - rows[j * 16 + 11]);
    if (d < .75 * (W.get(i) + W.get(j)) * 1.6) up.set(find(i), find(j));
  }
  const groups = new Map(); live.forEach((i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(i); });
  groups.forEach((g) => {
    if (g.length < 5) return;
    let cx = 0, cy = 0, cz = 0, h = 0, d = 0;
    g.forEach((j) => { const o = j * 16; cx += rows[o + 9]; cy += rows[o + 10]; cz += rows[o + 11]; h += len(rows[o + 3], rows[o + 4], rows[o + 5]) * box[1]; d += len(rows[o + 6], rows[o + 7], rows[o + 8]) * box[2]; });
    const k = g.length; cx /= k; cy /= k; cz /= k; h /= k; d /= k;
    let rad = 0, spread = 0; g.forEach((j) => { const o = j * 16; rad += Math.hypot(rows[o + 9] - cx, rows[o + 11] - cz); }); rad /= k;
    g.forEach((j) => { const o = j * 16; spread = Math.max(spread, Math.abs(Math.hypot(rows[o + 9] - cx, rows[o + 11] - cz) - rad)); });
    if (rad < 1e-3 || spread > rad * .25) return;   /* not a ring: a row or a grid of blocks keeps its blocks */
    const o0 = g[0] * 16, colour = [rows[o0 + 12], rows[o0 + 13], rows[o0 + 14]], R = rad + d / 2 + (pedestal ? d : 0);
    const H = pedestal ? h * .22 : h;
    let y = pedestal ? cy - h / 2 - H - .02 : cy - h / 2;
    STACK.forEach(([hs, rs, kind]) => {
      const hh = H * hs, r = R * rs;
      lists[kind].push(r, 0, 0, 0, hh / .06, 0, 0, 0, r, cx, y + hh / 2, cz, colour[0], colour[1], colour[2], 1);
      y += hh;
    });
    if (!pedestal) g.forEach((j) => used.add(j));
    rings.push({ x: cx, z: cz, R, y0: pedestal ? cy - h / 2 - H : cy - h / 2, y1: cy + h / 2 });
  });
  return { lists, used, rings };
}
/* four drum parts with room for `cap` drums each, direct colour, written each frame by write(lists) */
export function createDrumParts(R, list, cap, name) {
  const made = LAYER_PART.map((part, kind) => {
    const data = new Float32Array(cap * 16);
    const p = { part: name + part, like: 'solid', shape: 'ground', drumLayer: kind, direct: true, buffer: R.buffer(data), offset: 0, count: 0, cpu: data.buffer, data };
    list.push(p); return p;
  });
  function write(lists) {
    made.forEach((p, kind) => {
      const rows = lists ? lists[kind] : [], n = Math.min(cap, rows.length / 16);
      p.count = n; if (!n) return;
      p.data.set(rows.slice(0, n * 16)); R.updateBuffer(p.buffer, p.data, 0);
    });
  }
  return { write, parts: made };
}
