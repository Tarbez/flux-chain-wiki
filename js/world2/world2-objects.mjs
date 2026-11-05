/* World grammar, the built world and its intro film (owner, 2026-11-05: "merge to the site", "redesign the entire intro", "give them
   space, make the grid much bigger, and each chain create and expand the chain"). Layer: app.

   The objects are fxn-3d's (js/render/world2-<id>.mjs on the object kit, previewed one by one at previews/object.html?o=<id>). This file
   lays them out with room between them, draws them through the mesh pass in place of the frame's own parts, and plays the intro film.

   THE LAYOUT (derived from the frame, nothing typed by hand)
     the kernel          at the hub ring's place (the ring whose tiles carry tone 7), sized to it
     the networks        each on a wide circle round the kernel (NET_R kernel radii), in the direction it stood from the hub in the frame;
                         a node cube lit in the network's own token (--net-*, the tiles' second tone channel: a meaning token, law 77),
                         its network card beside it in the same token
     the chains          each identity or resolver ring belongs to the network it stood nearest in the frame; a network's chains stand
                         in a fan on its far side (CHAIN_R from it, CHAIN_SPREAD apart), each a chain drum striped in its kind's token
     the traces          dashed light on the floor from the kernel to each network and from each network to each of its chains
     the floor grid      a grid GRID_SPAN wide, much bigger than the frame's
   Every part of the frame itself is taken out of the picture (its tiles, drums, plate, mark, dots, rings, logos, small cubes, its grid):
   the built world replaces it. R.showPlate(false) turns the kernel plate's own drawing off. ?objects=off keeps the old world.

   THE FILM (four chapters, about fourteen seconds; FILM.chapters)
     1 One kernel      the camera low and close; the kernel comes down out of the sky, alone, lands and builds; its beam lights
     2 Many networks   the camera cranes up and swings out; light runs out along a trace to each network, which comes down and builds
     3 Signed chains   each network expands its chains: one by one a chain slides out from under its network along its own trace, then builds
     4 The grid        the camera settles into the hero pose: the kernel right of the middle, the whole grid in frame
   An object is not in the world before its turn: it comes down from above or slides out of its network, never grows from nothing.
   The camera follows one smooth path through key poses (a Catmull-Rom curve over each number), and after the film it holds the hero
   pose; it never goes back to the old intro frame. Played once a session on a fresh /intro (FILM_KEY); skip and replay are the page's
   (js/pages/intro.js), through ArkWorldHost.film(). Reduced motion: no film, the world stands built and the camera at the hero pose.

   LIGHT. A glow part shines at SITE_GLOW here, not the previews' 4.4 (owner: "insane amount of glow"); hovered, at HOVER_GLOW.
   TOUCH. Each object is its ring's: it carries the ring's item, so a pointer over it shows the ring's words and a click opens the ring's
   page, as the ring did (world2-host.mjs hitAt). */
import { tokenLinear, TOKENS } from './world2-palette.mjs';

const OBJECTS = ['kernel', 'core', 'node', 'drum', 'card', 'record', 'link'];
/* spare objects a page's show calls into the world (world2-space.mjs play: spawn), waiting out of the picture until then: how many of each */
const POOL = { record: 8, link: 4, card: 2, node: 2 };
const SPAWN_STEP_S = .4;   /* a spawned object's build, per step */
/* parts that belong to a preview's stage, not to the object */
const STAGE = new Set(['floor', 'grid', 'grid-nodes', 'peers', 'peer-rings', 'peer-pads', 'traces', 'dashes', 'orbit-in', 'orbit-out', 'motes']);
/* an object's own parts that give way to another object in the world: the chain kernel core stands in the kernel's well and carries the mark
   and the beam, so the kernel platform's own mark and beam leave the picture (owner, 2026-11-05: the armoured "CHAIN KERNEL" core) */
/* 2026-11-05 later: the platform gave way entirely ('*'), because the tower in its well was half its width and the dark disc around it hid it;
   the tower now IS the kernel at the platform's full size. Only when the tower loaded: without it the platform stays. */
const GIVE_WAY = { kernel: '*' };
const givesWay = (id, name, hasCore) => !!GIVE_WAY[id] && hasCore && (GIVE_WAY[id] === '*' || GIVE_WAY[id].has(name));
/* the kernel platform shows no light of its own in the world: its rings, slots, orbits and beam all leave, so the tower is the one lit thing
   at the middle (owner, 2026-11-05: "remove that glowing lights") */
const DARK = { kernel: true };
/* the tower stands on the floor where the kernel was, as wide as the kernel platform: its ring (radius about 1.07) times 2.15 is the
   platform's 2.3 (owner, 2026-11-05: "that tower needs to be bigger"; the platform gives way, GIVE_WAY above) */
const CORE_IN_WELL = { scale: 2.15, well: 0 };
const RADIUS = { kernel: 2.3, node: .72, drum: .62 };          /* each object's radius on the floor at scale 1 */
const REACH = { kernel: [1.6, 2.3], node: [.7, .72], drum: [.3, .62], card: [1.7, .85] };   /* half height, radius: a pointer's reach */
const HUB_TONE = 7, NETWORK_TONE = 4;
const tokenOf = (tone) => (TOKENS[Math.round(tone)] || [null])[0];

/* the layout, in kernel radii (the hub ring's radius) */
const NET_R = 5.6, NODE_R = .62, CHAIN_R = 3, CHAIN_SPREAD = .6,   /* 2026-11-05: chains 1.8 kernel radii apart (were 1.3), so their tags fit side by side */
  DRUM_R = .34, GRID_SPAN = 26, GRID_STEP = 1;
/* the film's clock, in seconds */
const ARRIVE_S = 1.1, DROP = 14;                 /* coming down: how long, and from how high (its own sizes) */
const KERNEL_STEP_S = .6, NODE_STEP_S = .5, DRUM_STEP_S = .45;
const TRACE_S = 1;                               /* light running the length of a trace */
const NET_GAP_S = .45, CHAIN_GAP_S = .3, NET_CHAINS_GAP_S = .5, SLIDE_S = 1.2;
const DASH = .9, DASH_GAP = .7;                  /* a trace's dashes, in world units */
const SITE_GLOW = .75, HOVER_GLOW = 1.5;   /* the card's rule: light is a detail (owner, 2026-11-05: "less glow and lights") */
export const FILM_KEY = 'defxn-intro-film-v1';

export async function mountObjects({ R, pieces, geo, parts, body, reduced, itemOfTile, aspect, film: wantFilm, onFilm }) {
  const mods = {};
  const { paintTexture } = await import('/fxn-3d/js/render/world2-textures.mjs').catch(() => ({}));
  const { uploadTexture } = await import('/fxn-3d/js/render/world2-mesh.mjs');
  await Promise.all(OBJECTS.map((id) => import('/fxn-3d/js/render/world2-' + id + '.mjs').then((m) => { mods[id] = m.OBJECT; })));

  /* ---------- what the frame says ---------- */
  const itemOfGeo = (g) => {
    if (!itemOfTile || !g.rows) return -1;
    const n = new Map(); for (const r of g.rows) { const it = itemOfTile(r); if (it >= 0) n.set(it, (n.get(it) || 0) + 1); }
    let best = -1, c = 0; n.forEach((v, k) => { if (v > c) { c = v; best = k; } }); return best;
  };
  const top = geo.filter((g) => !g.parent);
  const hubGeo = top.find((g) => Math.round(g.tone[0]) === HUB_TONE) || top.find((g) => g.hub);
  if (!hubGeo) return null;
  const KR = hubGeo.R, K = [hubGeo.x, hubGeo.y0, hubGeo.z], floor = hubGeo.y0;
  const nets = top.filter((g) => Math.round(g.tone[0]) === NETWORK_TONE);
  const chains = top.filter((g) => g !== hubGeo && Math.round(g.tone[0]) !== NETWORK_TONE);
  if (!nets.length) return null;

  /* ---------- the layout ---------- */
  const at = [], traces = [];
  const angleOf = (g) => Math.atan2(g.z - K[2], g.x - K[0]);
  const ring = (a, r, from = K) => [from[0] + Math.cos(a) * r, from[2] + Math.sin(a) * r];
  const kernel = { id: 'kernel', x: K[0], y: floor, z: K[2], s: KR / RADIUS.kernel, yaw: 0, roles: {}, item: itemOfGeo(hubGeo), mode: 'drop' };
  at.push(kernel);
  const core = mods.core ? { id: 'core', x: K[0], y: floor + CORE_IN_WELL.well * kernel.s, z: K[2], s: kernel.s * CORE_IN_WELL.scale, yaw: 0, roles: {}, item: -1, mode: 'drop' } : null;
  if (core) at.push(core);
  const netList = nets.map((g) => ({ g, a: angleOf(g), chains: [] })).sort((p, q) => p.a - q.a);
  for (const c of chains) {   /* each chain to the network it stood nearest */
    let best = netList[0], d = Infinity;
    for (const n of netList) { const e = Math.hypot(c.x - n.g.x, c.z - n.g.z); if (e < d) { d = e; best = n; } }
    best.chains.push(c);
  }
  netList.forEach((n) => {
    const [nx, nz] = ring(n.a, NET_R * KR), s = NODE_R * KR / RADIUS.node, net = tokenOf(n.g.tone[1]), roles = net ? { '--primary': net } : {}, item = itemOfGeo(n.g);
    n.node = { id: 'node', x: nx, y: floor, z: nz, s, yaw: 0, roles, item, mode: 'drop' };
    at.push(n.node);
    /* the card beside its network, on the network's left as the kernel sees it, turned to face the kernel's side; its tether ends on the network */
    const cs = s * .75, side = n.a + Math.PI / 2, cx = nx + Math.cos(side) * 2.2 * cs, cz = nz + Math.sin(side) * 2.2 * cs, face = Math.atan2(K[0] - cx, K[2] - cz);
    n.card = { id: 'card', x: cx, y: floor, z: cz, s: cs, yaw: face, roles, item, mode: 'drop' };
    at.push(n.card);
    traces.push({ from: [K[0], K[2]], to: [nx, nz], r0: KR * 1.05, r1: s * RADIUS.node * 1.2, role: net || '--primary', key: 'net', n });
    /* its chains: a fan on its far side, ordered round it, each sliding out from under the network along its own trace */
    n.chains.sort((p, q) => angleOf(p) - angleOf(q));
    n.chains.forEach((c, j) => {
      const a = n.a + (j - (n.chains.length - 1) / 2) * CHAIN_SPREAD, [cx2, cz2] = ring(a, CHAIN_R * KR, [nx, floor, nz]), kind = tokenOf(c.tone[0]);
      const drum = { id: 'drum', x: cx2, y: floor, z: cz2, s: DRUM_R * KR / RADIUS.drum, yaw: 0, roles: kind ? { '--chain-network': kind } : {}, item: itemOfGeo(c), mode: 'slide', from: [nx, nz], j, netItem: item };
      at.push(drum);
      traces.push({ from: [nx, nz], to: [cx2, cz2], r0: s * RADIUS.node * 1.2, r1: 0, role: net || '--primary', key: 'chain', n, drum });
    });
  });
  /* a network's reach: its node and its fan of chains, for the camera's view of the network (world2-space.mjs) */
  netList.forEach((n) => { n.node.groupR = (CHAIN_R + DRUM_R) * KR + KR * .2; });
  const reach = Math.max(...at.map((p) => Math.hypot(p.x - K[0], p.z - K[2]) + (RADIUS[p.id] || 1) * p.s));

  /* ---------- the clock: when each thing starts ---------- */
  const kernelEnd = ARRIVE_S + mods.kernel.last * KERNEL_STEP_S;
  kernel.delay = ARRIVE_S; kernel.step = KERNEL_STEP_S;
  /* the core drops into the well once the kernel's tiers stand, and is built by the end of the kernel's chapter */
  if (core) { core.delay = ARRIVE_S + 2 * KERNEL_STEP_S + ARRIVE_S; core.step = (kernelEnd - core.delay) / mods.core.last; }
  netList.forEach((n, i) => {
    n.lightAt = kernelEnd + .2 + i * NET_GAP_S;
    n.node.delay = n.card.delay = n.lightAt + TRACE_S + ARRIVE_S; n.node.step = NODE_STEP_S; n.card.step = NODE_STEP_S;
  });
  const chainsAt = kernelEnd + 3.2;
  netList.forEach((n, i) => n.chains.length && traces.filter((t) => t.n === n && t.drum).forEach((t) => {
    const d = t.drum; d.slideAt = chainsAt + i * NET_CHAINS_GAP_S + d.j * CHAIN_GAP_S; d.delay = d.slideAt + SLIDE_S; d.step = DRUM_STEP_S;
  }));
  traces.forEach((t) => { t.at = t.drum ? t.drum.slideAt : t.n.lightAt; t.dur = t.drum ? SLIDE_S : TRACE_S; });
  const ends = at.map((p) => p.delay + mods[p.id].last * p.step);
  const filmEnd = Math.max(...ends) + .6;
  const CHAPTERS = [0, kernelEnd, chainsAt, filmEnd - 1.6];
  /* the spares, after the film's clock is set (they have no turn in it) */
  for (const id in POOL) if (mods[id]) for (let i = 0; i < POOL[id]; i++) at.push({ id, pool: true, x: K[0], y: floor, z: K[2], s: KR * .3, yaw: 0, roles: {}, item: -1, mode: 'spawn', spawnAt: 0, step: SPAWN_STEP_S, delay: 0 });

  /* ---------- pieces: one per object part, its rows for every placement of that object; the traces; the floor grid ---------- */
  const lists = {};
  for (const id of OBJECTS) {
    const O = mods[id], places = at.filter((p) => p.id === id);
    if (!places.length) continue;
    const keep = O.parts.map((p, i) => [p, i]).filter(([p]) => !STAGE.has(p.name) && !givesWay(id, p.name, !!mods.core) && !(DARK[id] && p.mat === 'glow'));
    lists[id] = { O, places, frames: places.map(() => null), keep: keep.map(([p, i]) => {
      const n = p.inst.length * places.length, rows = new Float32Array(16 * n);
      const mat = O.materialOf(p); if (mat.emission) mat.emission = SITE_GLOW;
      const piece = pieces.add('obj-' + id + '-' + p.name, { box: p.box, mat, plated: p.mat === 'steel' && !p.tex }, rows);
      if (p.tex && paintTexture) { const cv = paintTexture(p.tex); if (cv) piece.o.matTex = uploadTexture(R.gl, cv); }   /* the part's image (world2-textures.mjs) */
      return { part: p, index: i, rows, piece };
    }) };
  }
  /* the traces' dashes, laid once along each trace (a dash lights when the light running the trace has passed it) */
  const dashes = [];
  traces.forEach((t) => {
    const dx = t.to[0] - t.from[0], dz = t.to[1] - t.from[1], len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len, run = len - t.r0 - t.r1;
    for (let u = 0; u + DASH <= run; u += DASH + DASH_GAP) {
      const mid = t.r0 + u + DASH / 2;
      dashes.push({ t, share: (u + DASH) / run, x: t.from[0] + ux * mid, z: t.from[1] + uz * mid, rot: Math.atan2(-uz, ux) });
    }
  });
  const glowMat = { metal: 0, rough: 1, emission: SITE_GLOW };
  const dashRows = new Float32Array(16 * Math.max(1, dashes.length));
  const dashPiece = pieces.add('obj-traces', { box: [DASH, .02, .09, .01], mat: glowMat, plated: false }, dashRows);
  const lines = [];
  for (let v = -GRID_SPAN / 2; v <= GRID_SPAN / 2 + 1e-6; v += GRID_STEP) lines.push([v, 0], [v, 1]);
  const gridRows = new Float32Array(16 * lines.length);
  const gridPiece = pieces.add('obj-grid', { box: [GRID_SPAN * KR, .004, .03, .002], mat: glowMat, plated: false }, gridRows);

  /* ---------- the theme ---------- */
  let colours = {};
  const colour = (role) => colours[role] || (colours[role] = tokenLinear(body, role, '#888888'));
  function repaint() { colours = {}; gridDirty = true; }

  /* ---------- the frame's own parts leave the picture ---------- */
  const hide = () => { for (const p of parts) if (p.count) p.count = 0; };

  /* ---------- the film's clock ---------- */
  let start = 0, hovered = -1, playing = !!wantFilm && !reduced(), gridDirty = true, lastChapter = -1, told = false;
  const filmT = (now) => (playing && start ? (now - start) / 1000 : 1e9);
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (x * 6 - 15) + 10));
  const say = (now) => {
    if (!onFilm) return;
    const t = filmT(now), done = t >= filmEnd, ch = done ? CHAPTERS.length : CHAPTERS.filter((c) => t >= c).length - 1;
    if (ch !== lastChapter || (done && !told)) { lastChapter = ch; if (done) told = true; onFilm({ chapter: Math.min(ch, CHAPTERS.length - 1), done, playing: playing && !done, length: filmEnd, chapters: CHAPTERS.slice() }); }
  };

  /* write every row for the time `now`; true while anything still moves */
  /* shown: false on a page that draws a scene of its own (the sign-in card, the Kit...): the built world steps out of its picture */
  function flush(now, shown) {
    if (shown === false) { for (const id in lists) for (const k of lists[id].keep) pieces.write(k.piece, k.rows, 0); pieces.write(dashPiece, dashRows, 0); pieces.write(gridPiece, gridRows, 0); gridDirty = true; return false; }
    if (!start) start = now;
    hide();
    const t = filmT(now);
    let moving = t < filmEnd;
    const POP_MS = 520;
    /* the objects */
    for (const id in lists) {
      const L = lists[id], O = L.O, total = O.last;
      L.places.forEach((pl, j) => {
        const tb = t - pl.delay, T = Math.max(0, Math.min(total, tb / pl.step));
        if (pl.mode === 'spawn') {
          /* a show's spare: away until called; then it comes down where the show put it and builds on its own clock */
          pl.away = !pl.spawnAt;
          if (pl.away) return;
          const sb = (now - pl.spawnAt) / 1000 - ARRIVE_S, x = Math.max(0, Math.min(1, 1 + sb / ARRIVE_S)), Ts = Math.max(0, Math.min(total, sb / pl.step));
          pl.drop = sb < 0 ? DROP * .5 * pl.s * Math.pow(1 - x, 3) : 0; pl.px = pl.x; pl.pz = pl.z;
          if (Ts < total) moving = true;
          L.frames[j] = O.frame(Ts, L.frames[j]);
          return;
        }
        if (pl.mode === 'slide') {
          /* out from under its network along its trace, then it builds where it lands */
          pl.away = t < pl.slideAt;
          const k = ease((t - pl.slideAt) / SLIDE_S);
          pl.px = pl.from[0] + (pl.x - pl.from[0]) * k; pl.pz = pl.from[1] + (pl.z - pl.from[1]) * k; pl.drop = 0;
        } else {
          /* down out of the sky: not in the world before its turn, then it slows and lands */
          pl.away = tb < -ARRIVE_S;
          const x = Math.max(0, Math.min(1, 1 + tb / ARRIVE_S));
          pl.drop = tb < 0 ? DROP * pl.s * Math.pow(1 - x, 3) : 0; pl.px = pl.x; pl.pz = pl.z;
        }
        if (pl.popAt) { const u = (now - pl.popAt) / POP_MS; if (u >= 1) pl.popAt = 0; else { pl.drop += .22 * pl.s * Math.sin(Math.PI * u) * (1 - u * .4); moving = true; } }
        L.frames[j] = O.frame(T, L.frames[j]);
      });
      for (const k of L.keep) {
        const p = k.part, n = p.inst.length, out = k.rows;
        let w = 0;
        L.places.forEach((pl, j) => {
          if (pl.away) return;
          const f = L.frames[j][k.index], c = Math.cos(pl.yaw), sn = Math.sin(pl.yaw), s = pl.s;
          const rgb = colour(pl.roles[p.role] || p.role), lit = pl.item >= 0 && (pl.item === hovered || litSet.has(pl.item)) && p.mat === 'glow' ? HOVER_GLOW : 1;
          for (let i = 0; i < n; i++) {
            const m = f.m, o = i * 12, r = w * 16;
            /* place: Ry(yaw) x scale(s), then the object's foot */
            for (let col = 0; col < 3; col++) {
              const x = m[o + col * 3], y = m[o + col * 3 + 1], z = m[o + col * 3 + 2];
              out[r + col * 3] = (c * x + sn * z) * s; out[r + col * 3 + 1] = y * s; out[r + col * 3 + 2] = (-sn * x + c * z) * s;
            }
            const px = m[o + 9], py = m[o + 10], pz = m[o + 11];
            out[r + 9] = pl.px + (c * px + sn * pz) * s; out[r + 10] = pl.y + pl.drop + py * s; out[r + 11] = pl.pz + (-sn * px + c * pz) * s;
            const kk = f.k[i] * lit;
            out[r + 12] = rgb[0] * kk; out[r + 13] = rgb[1] * kk; out[r + 14] = rgb[2] * kk; out[r + 15] = 1;
            w++;
          }
        });
        pieces.write(k.piece, out, w);
      }
    }
    /* the traces: a dash is drawn once the light running its trace has passed it (light arriving, never a part growing) */
    let w = 0;
    for (const d of dashes) {
      const run = (t - d.t.at) / d.t.dur;
      if (run < d.share) continue;
      const rgb = colour(d.t.role), k = .55 * (run < d.share + .25 ? 1.8 : 1), r = w * 16, c = Math.cos(d.rot), sn = Math.sin(d.rot);
      dashRows.set([c, 0, -sn, 0, 1, 0, sn, 0, c, d.x, floor + .02, d.z, rgb[0] * k, rgb[1] * k, rgb[2] * k, 1], r);
      w++;
    }
    pieces.write(dashPiece, dashRows, w);
    /* the floor grid: written again only when the theme changes */
    if (gridDirty) {
      const rgb = colour('--primary-300'), k = .2;   /* the floor is a quiet surface (law 75): a faint grid, never louder than the words over it */
      lines.forEach(([v, axis], i) => {
        const off = v * KR, o = i * 16;
        if (axis === 0) gridRows.set([1, 0, 0, 0, 1, 0, 0, 0, 1, K[0], floor + .005, K[2] + off, rgb[0] * k, rgb[1] * k, rgb[2] * k, 1], o);
        else gridRows.set([0, 0, -1, 0, 1, 0, 1, 0, 0, K[0] + off, floor + .005, K[2], rgb[0] * k, rgb[1] * k, rgb[2] * k, 1], o);
      });
      pieces.write(gridPiece, gridRows, lines.length);
      gridDirty = false;
    }
    say(now);
    if (playing && t >= filmEnd) playing = false;
    return moving;
  }

  /* ---------- touch ---------- */
  function pick(px, py, cam, project) {
    let best = -1, score = Infinity;
    for (const pl of at) {
      if (pl.item < 0 || pl.away) continue;
      const r = REACH[pl.id], mid = [pl.x, pl.y + r[0] * pl.s, pl.z], a = project(mid, cam), b = project([pl.x + r[1] * pl.s, mid[1], pl.z], cam);
      if (!a || !b) continue;
      const rad = Math.max(8, Math.hypot(b[0] - a[0], b[1] - a[1])), d = Math.hypot(px - a[0], py - a[1]) / rad;
      if (d < 1 && d < score) { score = d; best = pl.item; }
    }
    return best;
  }
  function hover(item) { if (item === hovered) return false; hovered = item; return true; }
  /* ---------- a show's tools (world2-space.mjs play) ---------- */
  let litSet = new Set();
  /* light these ring items as the pointer does */
  function highlight(items) { litSet = new Set(items || []); }
  /* call a spare into the world: type, where (world x, z), its turn, its size, its roles; returns false when none is free */
  function spawn(type, o) {
    const free = at.filter((p) => p.pool && p.id === type && !p.spawnAt), pl = free[0] || at.filter((p) => p.pool && p.id === type).sort((a, b) => a.spawnAt - b.spawnAt)[0];
    if (!pl) return false;
    /* a spare never lands on a built object (owner, 2026-11-05: "total chaos", a show's record sat in a network's chains): while its
       footprint meets one, it steps out along the line from the kernel, a fifth of the kernel's radius a step */
    const foot = (p) => (RADIUS[p.id] || .6) * p.s, mine = (RADIUS[type] || .6) * (o.s || KR * .3);
    let x = o.x, z = o.z;
    const out = Math.atan2(z - K[2], x - K[0]);
    for (let k = 0; k < 40 && at.some((p) => p !== pl && !(p.pool && !p.spawnAt) && Math.hypot(p.x - x, p.z - z) < foot(p) + mine + KR * .08); k++) {
      x += Math.cos(out) * KR * .2; z += Math.sin(out) * KR * .2;
    }
    Object.assign(pl, { x, z, y: o.y == null ? floor : o.y, yaw: o.yaw || 0, s: o.s || KR * .3, roles: o.roles || {}, spawnAt: performance.now() + (o.delay || 0) * 1000 });
    return true;
  }
  function clearSpawns() { for (const p of at) if (p.pool) p.spawnAt = 0; litSet = new Set(); }
  /* the camera to a shot of a show: { aim, h, elev, yaw } in world units and degrees */
  let shot = 0;
  function flyPose(pose) { focusOn(pose ? { id: 'shot:' + (++shot), kind: 'shot', pose } : null); }

  /* ---------- the camera ----------
     Key poses: aim (world), dist (as the height of the picture it covers, in world units), elev and yaw (degrees). One Catmull-Rom curve
     runs through them over the film; the last is the hero pose the intro then holds. */
  const TAN = 2 * Math.tan(6 * Math.PI / 180);   /* the world look's 12 degree field: a picture `h` high needs a distance h / TAN */
  const netMid = [K[0] + netList.reduce((a, n) => a + n.node.x - K[0], 0) / netList.length * .5, K[1], K[2] + netList.reduce((a, n) => a + n.node.z - K[2], 0) / netList.length * .5];
  function hero() {
    /* the whole grid in frame, standing in the free space between the page's words (bottom left), its doors (top right) and its counts
       (bottom right): the aim moves left (the world shows right of the middle) and toward the camera (the world shows higher) */
    const yaw = 6, y = yaw * Math.PI / 180, right = [Math.cos(y), 0, -Math.sin(y)], toward = [Math.sin(y), 0, Math.cos(y)], asp = Math.max(.6, aspect ? aspect() : 1.6);
    const h = Math.max(2.9 * reach / asp, 2.2 * reach), sx = reach * .04, sz = reach * .55;
    return { t: filmEnd + .8, aim: [K[0] - right[0] * sx + toward[0] * sz, floor, K[2] - right[2] * sx + toward[2] * sz], h, elev: 44, yaw };
  }
  function keys() {
    const up = KR * .35;
    return [
      { t: 0, aim: [K[0], floor + up, K[2]], h: KR * 2.6, elev: 7, yaw: -62 },
      { t: kernelEnd, aim: [K[0], floor + up, K[2]], h: KR * 3.2, elev: 15, yaw: -30 },
      { t: chainsAt, aim: [netMid[0], floor, netMid[2]], h: reach * 1.25, elev: 27, yaw: 14 },
      { t: filmEnd - 1.6, aim: [K[0], floor, K[2]], h: reach * 1.7, elev: 42, yaw: -10 },
      hero()
    ];
  }
  const cr = (p0, p1, p2, p3, u) => .5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
  function poseAt(t) {
    const K_ = keys(), n = K_.length;
    if (t <= 0) return K_[0];
    if (t >= K_[n - 1].t) return K_[n - 1];
    let i = 0; while (i < n - 2 && t > K_[i + 1].t) i++;
    const a = K_[Math.max(0, i - 1)], b = K_[i], c = K_[i + 1], d = K_[Math.min(n - 1, i + 2)], u = (t - b.t) / (c.t - b.t);
    const f = (g) => cr(g(a), g(b), g(c), g(d), u);
    return { aim: [0, 1, 2].map((k) => f((p) => p.aim[k])), h: Math.exp(f((p) => Math.log(p.h))), elev: f((p) => p.elev), yaw: f((p) => p.yaw) };
  }
  /* ---------- the space's camera (world2-space.mjs): the ONE owner of the camera once the objects stand ----------
     Every move is one timed flight (the motion audit, 2026-11-05: two owners wrote the camera in the same frame and moves jittered, kinked
     and never settled). A flight starts from wherever the camera is (the visitor's own orbit and zoom folded in, so they unwind inside the
     move), lasts FLY_MIN..FLY_MAX by its length, follows one curve (smootherstep), and after it the camera holds the wanted pose exactly.
     The wanted pose: the film's path while it plays; else the focused place's pose; else the grid's hero pose. The visitor's orbit and zoom
     are added on top at once (they follow the hand). Reduced motion: no flight, the pose is placed at once. */
  const FLY_MIN = .8, FLY_MAX = 1.7;
  let focusT = null, yawOff = 0, elevOff = 0, zoomMul = 1, arrived = true, arriveFns = [], cameraFns = [], lastCam = '';
  let flight = null, wantKey = '';
  /* the pose for a place: framed by its own reach, seen from the kernel's side so the kernel stands behind it, a little above */
  function focusPose(t) {
    /* the kernel is framed close and low, so the chain kernel core in its well is the hero */
    const r = t.kind === 'network' ? t.radius : t.kind === 'kernel' ? t.radius * .62 : t.radius * 3.2;
    const away = t.kind === 'kernel' ? 6 : Math.atan2(t.at[0] - K[0], t.at[2] - K[2]) * 180 / Math.PI;
    /* the aim moves a little toward the camera, so the place stands above the middle and clear of the focus card at the foot */
    const y = away * Math.PI / 180, nudge = r * .32;
    return { aim: [t.at[0] + Math.sin(y) * nudge, floor + r * (t.kind === 'kernel' ? .45 : .12), t.at[2] + Math.cos(y) * nudge], h: r * 2.6, elev: t.kind === 'chain' ? 30 : t.kind === 'kernel' ? 22 : 36, yaw: away };
  }
  function focusOn(t) {
    focusT = t; arrived = false;
    /* the place answers the click: a short hop (POP_MS), then the camera's flight lands on it */
    if (t && t.place && !reduced()) t.place.popAt = performance.now();
    if (playing) film.skip();   /* a visitor who picks a place has seen enough of the film */
  }
  function orbit(dy, de) { yawOff += dy || 0; elevOff = Math.max(-25, Math.min(30, elevOff + (de || 0))); arrived = false; }
  function zoom(f) { zoomMul = Math.max(.45, Math.min(2.2, zoomMul * (f || 1))); arrived = false; }
  const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (x * 6 - 15) + 10));
  const wrap = (a, near) => { while (a - near > 180) a -= 360; while (a - near < -180) a += 360; return a; };
  function camera(now, cam) {
    const t = filmT(now);
    /* the film owns the camera while it plays and nothing is focused */
    if (t < filmEnd + .8 && !focusT) {
      const p = t < 1e8 ? poseAt(t) : hero();
      cam.aim = p.aim.slice(); cam.dist = p.h / TAN * zoomMul; cam.elev = p.elev + elevOff; cam.yaw = p.yaw + yawOff;
      flight = null; wantKey = 'film'; tell(cam); return true;
    }
    const p = focusT ? (focusT.pose || focusPose(focusT)) : hero(), key = focusT ? focusT.id : 'grid';
    const want = { aim: p.aim, dist: p.h / TAN, elev: p.elev, yaw: p.yaw };
    if (key !== wantKey) {
      /* a new place: one flight from where the camera is, the visitor's offsets folded into its start */
      wantKey = key;
      const from = { aim: cam.aim.slice(), dist: cam.dist, elev: cam.elev, yaw: cam.yaw };
      yawOff = 0; elevOff = 0; zoomMul = 1;
      const travel = Math.hypot(from.aim[0] - want.aim[0], from.aim[2] - want.aim[2]) / reach + Math.abs(Math.log(from.dist / want.dist)) * .5 + Math.abs(wrap(want.yaw, from.yaw) - from.yaw) / 180;
      flight = reduced() ? null : { from, t0: now, dur: 1000 * Math.max(FLY_MIN, Math.min(FLY_MAX, FLY_MIN + travel * .9)) };
    }
    let out, moving = false;
    if (flight) {
      const u = smooth((now - flight.t0) / flight.dur), f = flight.from, y0 = f.yaw, y1 = wrap(want.yaw, y0);
      out = { aim: f.aim.map((v, i) => v + (want.aim[i] - v) * u), dist: Math.exp(Math.log(f.dist) + (Math.log(want.dist) - Math.log(f.dist)) * u), elev: f.elev + (want.elev - f.elev) * u, yaw: y0 + (y1 - y0) * u };
      if (u >= 1) flight = null; else moving = true;
    } else out = { aim: want.aim.slice(), dist: want.dist, elev: want.elev, yaw: wrap(want.yaw, cam.yaw) };
    cam.aim = out.aim; cam.dist = out.dist * zoomMul; cam.elev = Math.max(4, Math.min(80, out.elev + elevOff)); cam.yaw = out.yaw + yawOff;
    tell(cam);
    if (!moving && !arrived) { arrived = true; arriveFns.forEach((fn) => fn(focusT)); }
    return moving;
  }
  function tell(cam) {
    const key = cam.yaw.toFixed(2) + ',' + cam.elev.toFixed(2) + ',' + cam.dist.toFixed(2);
    if (key === lastCam) return; lastCam = key;
    const c = { yaw: cam.yaw, elev: cam.elev, dist: cam.dist }; cameraFns.forEach((fn) => fn(c));
  }

  /* ---------- the film's controls (the page's skip, replay and chapter rail) ---------- */
  const film = {
    chapters: CHAPTERS.slice(), length: filmEnd,
    state: () => ({ playing, t: filmT(performance.now()), chapter: lastChapter }),
    skip() { if (!playing) return; start = performance.now() - filmEnd * 1000; },
    replay() { playing = !reduced(); start = performance.now(); lastChapter = -1; told = false; },
    seek(i) { playing = !reduced(); start = performance.now() - (CHAPTERS[i] || 0) * 1000; lastChapter = -1; told = false; }
  };

  R.showPlate(false);
  /* the old plate's own point light (the look's logoLight: the glow pool at the kernel) leaves with the plate: the tower carries no glow */
  R.setLook({ logolight: 0 });
  hide();
  return { flush, repaint, pick, hover, camera, film, placements: at, focusOn, orbit, zoom, focused: () => focusT, highlight, spawn, clearSpawns, flyPose, kernelR: KR, floor,
    onArrive: (fn) => arriveFns.push(fn), onCamera: (fn) => cameraFns.push(fn) };
}
