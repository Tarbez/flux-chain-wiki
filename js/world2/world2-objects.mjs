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
import { createProps } from './world2-props.mjs';
import { SPRING, stepped, engine, orbitTurn } from './world2-gl.mjs';   /* the one seam to fxn-3d */

const OBJECTS = ['kernel', 'core', 'node', 'drum', 'card', 'record', 'link'];
/* spare objects a page's show calls into the world (world2-space.mjs play: spawn), waiting out of the picture until then: how many of each */
const POOL = { record: 8, link: 4, card: 2, node: 5 };   /* node 5: the intro's shot 4 calls four pinner nodes round a network, shot 2 one more */
const SPAWN_STEP_S = .4;   /* a spawned object's build, per step */
/* parts that belong to a preview's stage, not to the object */
const STAGE = new Set(['floor', 'grid', 'grid-nodes', 'peers', 'peer-rings', 'peer-pads', 'traces', 'dashes', 'orbit-in', 'orbit-out', 'motes',
  /* the light columns and their motes over every drum and cube read as static, not light: retired in the world, the previews keep theirs (scene plan, phase 1) */
  'beam', 'beam-dots', 'beam-dashes',
  /* the drums' dashed orbit circles: 1,045 rows that read as noise round every drum (law 75), and the instance budget */
  'orbit-1', 'orbit-2',
  /* the drums' wall and face ticks (968 rows of 2 px marks at the hero), for the same budget */
  'wall-ticks', 'face-ticks']);
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
/* the pointer's answers (docs/design/space/SPACE.md, interaction map): lift in the object's own radius R, turn in degrees, on the style guide's springs */
const LIFT_R = { kernel: .02, node: .08, drum: .12, card: 0 }, NEAR_LIFT_R = .01, NEAR_GLOW = .3, DRUM_TURN = 20, TRIP_TURN = 8, CORE_BACK = .35;
const { ui: UI, heavy: HEAVY } = SPRING;   /* the house springs (fxn-3d engine/runtime/spring.mjs). ui: .37 s, 3% overshoot. heavy: .63 s */
const GRID_REST = .2, GRID_DRAG = .3;
const HERO_YAW = 6;   /* the hall's camera turn at the hero pose, degrees */
const SITE_GLOW = .75, HOVER_GLOW = 1.5;   /* the card's rule: light is a detail (owner, 2026-11-05: "less glow and lights") */
export const FILM_KEY = 'defxn-intro-film-v1';

/* ---------- the scene's ground and light (docs/design/space/SPACE.md "Scene redesign plan", phase 1) ----------
   The material pass on the objects that exist, made here at placement, so the object library's files stay as they are: chrome (metal 1,
   rough .08) on the bevels, rings and frames; plated gunmetal on every other steel body; crystal (transmission and iridescence, material v2
   channels 6 and 9) on the tower's crown and the glass. A part is matched by its object and name; anything unnamed keeps its kit material. */
const CHROME = { metal: 1, rough: .1, coat: 1, coatRough: .03 };
const GUNMETAL = { metal: .6, rough: .34, coat: .45, coatRough: .1 };
const v2 = (ch) => ({ ch, maps: {}, pattern: null, mix: null, graph: null });
const CRYSTAL = { metal: 0, rough: .04, coat: 1, coatRough: .02, opacity: .6, v2: v2({ 6: [.9, 2, 1.45, 1, 1, 1], 9: [.55, 250, 650] }) };
const PANE = { metal: .02, rough: .06, coat: .8, coatRough: .04, opacity: .22, v2: v2({ 6: [.6, .5, 1.45, 1, 1, 1], 9: [.25, 250, 650] }) };
const FINISH = {
  core: { chrome: /^(plinth-ring|bevel-h|bevel-v|bolts)$/, crystal: /^shoulders-(low|high)$/ },
  node: { chrome: /^(base-frame|base-bumpers)$/, pane: /^panel-shell$/ },
  card: { chrome: /^(rails|stiles|collar|mast)$/, pane: /^glass$/ },
  link: { chrome: /^rails$/, pane: /^packets$/ }
};
function finish(id, part, mat) {
  if (part.mat === 'glow') return mat;
  const f = FINISH[id] || {};
  if (f.crystal && f.crystal.test(part.name)) return Object.assign({}, mat, CRYSTAL);
  if (f.pane && f.pane.test(part.name) || part.mat === 'glass') return Object.assign({}, mat, PANE);
  if (f.chrome && f.chrome.test(part.name)) return Object.assign({}, mat, CHROME);
  if (part.mat === 'steel') return Object.assign({}, mat, GUNMETAL);
  return mat;
}
/* the deck: one dark coated plate the size of the grid, a little open (opacity under 1) so the objects' mirror twins under it read as a wet floor */
const DECK = { metal: 0, rough: .7, coat: .08, coatRough: .3, env: .05, opacity: .75 };   /* rough and lightly coated: the key light makes a soft lit circle round the kernel, never a beige sheet over half the deck (coordinator, 2026-11-07) */
/* the hour of the hall, read from the visitor's clock at load and at every flight, never on a timer: the key light's height and strength, the
   sky's share and the exposure. Night when the clock is unavailable. The key's colour and the fog's are the palette's (no engine knob for them) */
const HOURS = [
  { from: 5, to: 10, name: 'morning', keyy: 18, key: .95, sky: 1.25, exp: 1 },
  { from: 10, to: 17, name: 'day', keyy: 34, key: 1.05, sky: 1.1, exp: 1.04 },
  { from: 17, to: 21, name: 'evening', keyy: 14, key: .9, sky: .8, exp: .96 }
];
const NIGHT = { name: 'night', keyy: 22, key: .8, sky: .6, exp: .92 };
function hourNow() { let h = NaN; try { h = new Date().getHours(); } catch (e) {} return HOURS.find((x) => h >= x.from && h < x.to) || NIGHT; }
/* the mirror twins the kit builds under every part (world2-object-kit.mjs MIRROR): drawn here for the lit edges only, so the wet deck
   reflects the light and the instance count stays inside the budget (bodies' twins would double it and read as black under the deck) */
/* the drum's upper bevels and ticks and a record's ledger lines stand high or many: their twins add 2,200 rows for light the deck hardly shows */
const NO_TWIN = new Set(['foot-bevel', 'plate-bevels', 'lid-bevels', 'wall-ticks', 'chain-ledger', 'ledger', 'chain-bevels', 'panel-x']);
const TWIN_OF = { kernel: 1, core: 1, node: 1 };
const twinOf = (p) => p.mirror !== false && p.mat === 'glow' && !NO_TWIN.has(p.name);
const DECK_SPAN = 1.8;   /* the deck runs on well past the grid, so its edge is never in frame: the edge fade and the fog take it */
const POOL_LIGHT = 1.6, POOL_REACH = 3;   /* the kernel pool's light and reach caps, in the look's units (the records carry 22 and 16) */
const EXPO_MS = 1200, RIPPLE_MS = 1000, RIPPLE_SEGS = 28;

export async function mountObjects({ R, pieces, geo, parts, body, reduced, itemOfTile, aspect, film: wantFilm, onFilm, look: lookOf }) {
  const mods = {};
  const { paintTexture } = await engine('js/render/world2-textures.mjs').catch(() => ({}));
  const meshMod = await engine('js/render/world2-mesh.mjs'), { uploadTexture } = meshMod;
  const textMod = await engine('js/render/world2-text.mjs').catch(() => null);
  /* the baked 3D lockup words (1.1 MB) are off the first paint: fetched on the first pointer intent or the first trip start (prepareLetters),
     and a lockup waits for them, so a trip that starts cold still shows its word, only later */
  let lettersP = null;
  const prepareLetters = () => lettersP || (lettersP = import('./world2-letters.mjs').then((m) => m.loadTripLetters(textMod)).catch(() => 0));
  await Promise.all(OBJECTS.map((id) => engine('js/render/world2-' + id + '.mjs').then((m) => { mods[id] = m.OBJECT; })));

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
    const cs = s * .75, side = n.a + Math.PI / 2, cx = nx + Math.cos(side) * 2.2 * cs, cz = nz + Math.sin(side) * 2.2 * cs, face = HERO_YAW * Math.PI / 180;   /* the sign pose: its face to the hall's camera, never edge-on from the hero */
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
      const tw = twinOf(p), n = p.inst.length * places.length * (tw ? 2 : 1), rows = new Float32Array(16 * n);
      const mat = finish(id, p, O.materialOf(p)); if (mat.emission) mat.emission = SITE_GLOW;
      const piece = pieces.add('obj-' + id + '-' + p.name, { box: p.box, mat, plated: p.mat === 'steel' && !p.tex }, rows);
      if (p.tex && paintTexture) { const cv = paintTexture(p.tex); if (cv) piece.o.matTex = uploadTexture(R.gl, cv); }   /* the part's image (world2-textures.mjs) */
      return { part: p, index: i, rows, piece, twin: tw };
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
  /* the deck under the seams (the grid's lines are its engraved seams now), and the press ripple: a ring of short glow bars that opens on the floor */
  /* the deck in DECK_N x DECK_N plates, each darker with its distance from the kernel, so the floor fades into the hall's dark and its edge is never a line */
  const DECK_N = 10, deckStep = DECK_SPAN * GRID_SPAN * KR / DECK_N;
  const deckRows = new Float32Array(16 * DECK_N * DECK_N), deckPiece = pieces.add('obj-deck', { box: [deckStep, .02, deckStep, 0], mat: DECK, plated: false }, deckRows);
  const rippleRows = new Float32Array(16 * RIPPLE_SEGS), ripplePiece = pieces.add('obj-ripple', { box: [1, .004, .05, .002], mat: glowMat, plated: false }, rippleRows);
  let ripple = null;

  /* the intro's new objects (world2-props.mjs): the FXN ID card, the keeper's desk, the lanes, the copy towers, the road of machines, the book */
  const props = createProps({ pieces, KR, K, floor, nets: netList, drum: at.find((p) => p.id === 'drum' && p.netItem === netList[0].node.item) || null,
    colour: (role) => colour(role), reduced, catalog: typeof window !== 'undefined' ? window.DefxnKit : null });
  const kText = textMod ? textMod.createText({ pieces, mesh: meshMod }) : null;   /* the one 3D lockup of a trip (world2-text.mjs) */

  /* ---------- the theme ---------- */
  let colours = {};
  const colour = (role) => colours[role] || (colours[role] = tokenLinear(body, role, '#888888'));
  function repaint() { colours = {}; gridDirty = true; }

  /* ---------- the frame's own parts leave the picture ---------- */
  const hide = () => { for (const p of parts) if (p.count) p.count = 0; };

  /* ---------- the film's clock ---------- */
  let start = 0, hovered = -1, lastNow = 0, wasMoving = false, camYaw = 0, ptrX = 0, gridK = GRID_REST, aimOff = [0, 0], playing = false, gridDirty = true, lastChapter = -1, told = false;
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
    if (shown === false) { props.flush(now, 0, false); for (const id in lists) for (const k of lists[id].keep) pieces.write(k.piece, k.rows, 0); pieces.write(dashPiece, dashRows, 0); pieces.write(gridPiece, gridRows, 0); pieces.write(deckPiece, deckRows, 0); pieces.write(ripplePiece, rippleRows, 0); gridDirty = true; return false; }
    if (!start) start = now;
    hide();
    const t = filmT(now);
    let moving = t < filmEnd;
    const POP_MS = 520, dt = wasMoving ? Math.max(.001, Math.min(.05, (now - lastNow) / 1000)) : 1 / 60, rm = reduced();
    lastNow = now;
    const kernelR = RADIUS.kernel * kernel.s;
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
        /* the pointer's answers: hover and proximity ride the ui spring, a turn the heavy one. reduced motion: the light follows at once, no lift, no turn */
        const hid = pl.id === 'core' ? kernel.item : pl.item, hov = hid >= 0 && hid === hovered ? 1 : 0, S = pl.sp || (pl.sp = { u: [0, 0], n: [0, 0], tr: [0, 0] });
        const litNow = litSet.size && isLit(pl) && (pl.id === 'node' || pl.id === 'drum' || pl.id === 'card');
        let turnT = 0;
        if (!rm) {
          if (pl.id === 'drum') turnT = hov * DRUM_TURN * Math.PI / 180;
          else if (pl.id === 'card') { let a = camYaw * Math.PI / 180 - pl.yaw; a -= Math.round(a / (2 * Math.PI)) * 2 * Math.PI; turnT = hov * a; }
          if (litNow) turnT += TRIP_TURN * Math.PI / 180 * ptrX;
        }
        if (rm) { S.u[0] = hov; S.n[0] = pl.nearK || 0; S.u[1] = S.n[1] = S.tr[0] = S.tr[1] = 0; }
        else if (stepped(S.u, hov, UI, dt) | stepped(S.n, pl.nearK || 0, UI, dt) | stepped(S.tr, turnT, HEAVY, dt)) moving = true;
        const ref = pl.id === 'core' ? kernelR : (RADIUS[pl.id] || 1) * pl.s;
        pl.lift = rm || pl.id === 'card' ? 0 : (LIFT_R[pl.id === 'core' ? 'kernel' : pl.id] * S.u[0] + NEAR_LIFT_R * S.n[0]) * (pl.id === 'core' ? kernelR : ref);
        pl.tw = S.tr[0];
        if (pl.id === 'drum' && pl.netItem != null) { const nd = nodeOf.get(pl.netItem); pl.fam = nd && nd.sp ? nd.sp.u[0] : 0; }
        if (pl.popAt) { const u = (now - pl.popAt) / POP_MS; if (u >= 1) pl.popAt = 0; else { pl.drop += .22 * pl.s * Math.sin(Math.PI * u) * (1 - u * .4); moving = true; } }
        L.frames[j] = O.frame(pl.id === 'node' && T >= total ? total - CORE_BACK * Math.max(pl.sp.u[0], pl.sp.n[0]) : T, L.frames[j]);
      });
      for (const k of L.keep) {
        const p = k.part, n = p.inst.length, nn = k.twin ? 2 * n : n, out = k.rows;
        let w = 0;
        L.places.forEach((pl, j) => {
          if (pl.away) return;
          const yw = pl.yaw + (pl.tw || 0), f = L.frames[j][k.index], c = Math.cos(yw), sn = Math.sin(yw), s = pl.s, S = pl.sp;
          const rgb = colour(pl.roles[p.role] || p.role), glow = p.mat === 'glow';
          /* the hover and proximity light, applied AFTER the lit set's rule so a trip's hover shows (one lit subject stays the rule for the lit set) */
          const gl = glow && S ? (1 + (HOVER_GLOW - 1) * S.u[0]) * (1 + NEAR_GLOW * S.n[0]) * (1 + .15 * (pl.fam || 0)) : 1;
          const split = glow && litSet.size && isLit(pl) && (pl.id === 'kernel' || pl.id === 'core');
          for (let i = 0; i < nn; i++) {
            const m = f.m, o = i * 12, r = w * 16, under = i >= n;
            if (under && (!f.k[i] || !TWIN_OF[pl.id] || pl.pool)) continue;   /* twins under the kernel and the networks' machines only (the lit subjects), never the spares: the instance budget */   /* a twin whose row stands below the floor has none (the kit zeroes it) */
            /* place: Ry(yaw) x scale(s), then the object's foot */
            for (let col = 0; col < 3; col++) {
              const x = m[o + col * 3], y = m[o + col * 3 + 1], z = m[o + col * 3 + 2];
              out[r + col * 3] = (c * x + sn * z) * s; out[r + col * 3 + 1] = y * s; out[r + col * 3 + 2] = (-sn * x + c * z) * s;
            }
            const px = m[o + 9], py = m[o + 10], pz = m[o + 11];
            out[r + 9] = pl.px + (c * px + sn * pz) * s; out[r + 10] = pl.y + (under ? -1 : 1) * (pl.drop + (pl.lift || 0)) + py * s; out[r + 11] = pl.pz + (-sn * px + c * pz) * s;
            let kk = f.k[i] * (litSet.size && glow ? (isLit(pl) ? 2.2 : .45) : 1) * gl;
            if (split) { const wx = (c * m[o + 9] + sn * m[o + 11]) * s, wz = (-sn * m[o + 9] + c * m[o + 11]) * s, cy = camYaw * Math.PI / 180; kk *= 1 + .3 * ptrX * Math.sign(wx * Math.cos(cy) - wz * Math.sin(cy)); }
            if (pulses.size && p.mat === 'glow' && (pl.item >= 0 || pl.id === 'core') && pulses.has(pl.id === 'core' ? kernel.item : pl.item)) { const pk = pl.id === 'core' ? kernel.item : pl.item, u = (now - pulses.get(pk)) / PULSE_MS; if (u >= 1) pulses.delete(pk); else { kk *= 1 + (rm ? .6 : 1.6) * Math.sin(Math.PI * u); moving = true; } }
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
      let k = .55 * (run < d.share + .25 ? 1.8 : 1), sc = 1;
      if (d.t.runP != null) {   /* a run held at a progress (the visitor's drag): the head stands where the hand is, nothing moves on its own */
        const sh = d.t.runBack ? 1 - d.share : d.share, hd = d.t.runP;
        k = hd < sh ? .2 : 1.1 * (1 + 3 * Math.exp(-(hd - sh) * 4)); sc = hd < sh ? 1 : 1.8;
      } else if (d.t.runAt) {   /* a trip's light running this trace (run()): dashes ahead of the head dim, the head and the dashes it just passed light */
        const hd = (now - d.t.runAt) / d.t.runMs, sh = d.t.runBack ? 1 - d.share : d.share;
        if (hd > 1.5) d.t.runAt = 0; else { moving = true; k = hd < sh ? .2 : 1.1 * (1 + 3 * Math.exp(-(hd - sh) * 4)); sc = hd < sh ? 1 : 1.8; }
      }
      const rgb = colour(d.t.role), r = w * 16, c = Math.cos(d.rot), sn = Math.sin(d.rot);
      dashRows.set([c * sc, 0, -sn * sc, 0, sc, 0, sn * sc, 0, c * sc, d.x, floor + .02, d.z, rgb[0] * k, rgb[1] * k, rgb[2] * k, 1], r);
      w++;
    }
    pieces.write(dashPiece, dashRows, w);
    if (kText && kText.frame(now)) moving = true;
    if (props.flush(now, camYaw)) moving = true;
    /* the floor grid: written again only when the theme changes */
    if (gridDirty) {
      const rgb = colour('--primary-300'), k = gridK;   /* the floor is a quiet surface (law 75): a faint grid, never louder than the words over it */
      lines.forEach(([v, axis], i) => {
        const off = v * KR, o = i * 16;
        if (axis === 0) gridRows.set([1, 0, 0, 0, 1, 0, 0, 0, 1, K[0], floor + .005, K[2] + off, rgb[0] * k, rgb[1] * k, rgb[2] * k, 1], o);
        else gridRows.set([0, 0, -1, 0, 1, 0, 1, 0, 0, K[0] + off, floor + .005, K[2], rgb[0] * k, rgb[1] * k, rgb[2] * k, 1], o);
      });
      pieces.write(gridPiece, gridRows, lines.length);
      const dk = colour('--nested');
      for (let i = 0; i < DECK_N; i++) for (let j = 0; j < DECK_N; j++) {
        /* the plate's own alpha falls with its distance (the instance colour's alpha multiplies the material's opacity), so far plates leave the picture */
        const x = (i - (DECK_N - 1) / 2) * deckStep, z = (j - (DECK_N - 1) / 2) * deckStep, d = Math.min(1, Math.max(0, Math.hypot(x, z) / (GRID_SPAN * KR * .85) - .45) / .55), a = 1 - d * d * (3 - 2 * d), k = .2;   /* full over the middle of the hall, the fade only in the outer ring where the floor is already dark: no steps where the eye rests */
        deckRows.set([1, 0, 0, 0, 1, 0, 0, 0, 1, K[0] + x, floor - .011, K[2] + z, dk[0] * k, dk[1] * k, dk[2] * k, a], (i * DECK_N + j) * 16);
      }
      pieces.write(deckPiece, deckRows, DECK_N * DECK_N);
      gridDirty = false;
    }
    /* the press ripple: opens to 1.2 kernel radii and fades in RIPPLE_MS, then leaves */
    if (ripple) {
      const u = (now - ripple.at) / RIPPLE_MS;
      if (u >= 1) { ripple = null; pieces.write(ripplePiece, rippleRows, 0); }
      else {
        const e = 1 - Math.pow(1 - u, 3), r = KR * (.15 + 1.05 * e), len = 2 * Math.PI * r / RIPPLE_SEGS * .6, rgb = colour('--primary-300'), k = .9 * (1 - u);
        for (let i = 0; i < RIPPLE_SEGS; i++) {
          const a = i / RIPPLE_SEGS * 2 * Math.PI, c = Math.cos(a + Math.PI / 2), sn = Math.sin(a + Math.PI / 2);
          rippleRows.set([c * len, 0, -sn * len, 0, 1, 0, sn, 0, c, ripple.x + Math.cos(a) * r, floor + .006, ripple.z - Math.sin(a) * r, rgb[0] * k, rgb[1] * k, rgb[2] * k, 1], i * 16);
        }
        pieces.write(ripplePiece, rippleRows, RIPPLE_SEGS); moving = true;
      }
    }
    /* the exposure's move (ArkSpace.exposure): one smooth rise, then it rests */
    if (expo) {
      const u = rm ? 1 : Math.min(1, (now - expo.at) / EXPO_MS), e = u * u * (3 - 2 * u);
      expK = expo.from + (expo.to - expo.from) * e; relook();
      if (u >= 1) expo = null; else moving = true;
    }
    wasMoving = moving;
    say(now);
    if (playing && t >= filmEnd) playing = false;
    return moving;
  }

  /* ---------- touch ---------- */
  /* nearest object to a point: the item it hits (d < 1 of its screen radius), else -1. With `track` (a pointer move: the host's hoverAt) the
     nearest object's proximity k = clamp(2 - d, 0, 1) is written on its placement, once per move and never per frame. A touch has a 22 px floor. */
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  function pick(px, py, cam, project, track) {
    let best = -1, score = Infinity, near = null;
    if (track) for (const pl of at) pl.nearK = 0;
    for (const pl of at) {
      if (pl.item < 0 || pl.away) continue;
      const r = REACH[pl.id], mid = [pl.x, pl.y + r[0] * pl.s, pl.z], a = project(mid, cam), b = project([pl.x + r[1] * pl.s, mid[1], pl.z], cam);
      if (!a || !b) continue;
      const rad = Math.max(coarse ? 22 : 8, Math.hypot(b[0] - a[0], b[1] - a[1])), d = Math.hypot(px - a[0], py - a[1]) / rad;
      if (d < score) { score = d; near = pl; if (d < 1) best = pl.item; }
    }
    if (track && near) near.nearK = Math.max(0, Math.min(1, 2 - score));
    const pp = props.pick(px, py, cam, project, track, coarse);   /* a prop nearer than every object takes the point */
    if (pp.item >= 0 && pp.score < score) return pp.item;
    return best;
  }
  function clearNear() { let any = false; for (const pl of at) if (pl.nearK) { pl.nearK = 0; any = true; } return any; }
  const nodeOf = new Map(at.filter((p) => p.id === 'node').map((p) => [p.item, p]));
  /* a hovered place: its lamp pulses once and the trace that leads to it runs (kernel: every trace out of it). reduced motion: the state only */
  function hover(item) {
    if (item >= 0) prepareLetters();   /* pointer intent: start the lockup words now, so the first trip shows them with no gap */
    const ph = props.hover(props.isProp(item) ? item : -1);
    if (props.isProp(item)) { const was = hovered; hovered = -1; return ph || was !== -1; }
    if (item === hovered) return ph;
    hovered = item;
    if (item >= 0 && !reduced()) {
      const pl = at.find((p) => p.item === item && p.id !== 'card');
      if (pl && pl.id === 'kernel') { pulse(item); run(item, '*', 1200); }
      else if (pl && pl.id === 'node') run(kernel.item, item, 1200);
      else if (pl && pl.id === 'drum') run(pl.netItem, item, 1200);
    }
    return true;
  }
  /* ---------- a show's tools (world2-space.mjs play) ---------- */
  let litSet = new Set();
  /* light these ring items as the pointer does */
  /* the core stands for the kernel: lighting the kernel lights its tower */
  const isLit = (pl) => litSet.has(pl.item) || (pl.id === 'core' && litSet.has(at[0].item));
  /* '*' lights every network (the operator's downbeat) */
  function highlight(items) { litSet = new Set((items || []).flatMap((x) => (x === '*' ? at.filter((p) => p.id === 'node').map((p) => p.item) : [x]))); }
  const PULSE_MS = 700, pulses = new Map();
  /* a lamp pulse on a place's glow parts (item = its ring item) */
  function pulse(item) { if (item != null && item >= 0) pulses.set(item, performance.now()); }
  /* a light running one trace, from a place to a neighbour (either way), or every trace out of `from` when to is '*'; ms the run takes */
  /* p (0..1, optional): the head held at that share of the trace (the visitor's drag), no clock; p >= 1 lets it finish on the clock from the
     end, p <= 0 clears it. Absent: the time-based run. */
  function run(fromItem, toItem, ms, p) {
    const ends = (t) => [t.drum ? t.drum.netItem : kernel.item, t.drum ? t.drum.item : t.n.node.item], now = performance.now();
    let hit = 0;
    for (const t of traces) {
      const [a, b] = ends(t), fwd = a === fromItem && (toItem === '*' || b === toItem), back = b === fromItem && a === toItem;
      if (!(fwd || back)) continue;
      t.runBack = back; t.runMs = ms || 1200; hit++;
      if (p == null) { t.runP = null; t.runAt = now; }
      else if (p >= 1) { t.runP = null; t.runAt = now - t.runMs; }
      else if (p <= 0) { t.runP = null; t.runAt = 0; }
      else { t.runP = p; t.runAt = 0; }
    }
    return hit > 0;
  }
  /* ---------- the light: the hour and the exposure (the look's own numbers times these; re-applied after the host sets the look) ---------- */
  let hour = hourNow(), expK = 1, expo = null;
  function relook() {
    const b = (lookOf && lookOf()) || {}, n = (k, d) => (typeof b[k] === 'number' ? b[k] : d);
    /* the kernel's lamp pool (the look's logoLight) stays, capped: a lit circle on dark metal, never a sheet over half the deck; the kernel stays the brightest thing */
    R.setLook({ exposure: n('exposure', 1.12) * hour.exp * expK, keyy: hour.keyy, keystrength: n('keystrength', 2.3) * hour.key, skystrength: n('skystrength', .22) * hour.sky,
      logolight: Math.min(POOL_LIGHT, n('logolight', 0)), logoreach: Math.min(POOL_REACH, n('logoreach', POOL_REACH)) });
  }
  /* v: the exposure as a share of the look's (1 = the look's own); placed at once with reduced motion */
  function exposure(v) { const to = Math.max(0, +v || 0); if (Math.abs(to - expK) < 1e-4 && !expo) return; expo = { from: expK, to, at: performance.now() }; }
  /* the press ripple on the floor at world (x, z) */
  function rippleAt(x, z) { if (reduced()) return; ripple = { x, z, at: performance.now() }; }
  /* the one 3D lockup: { text, x, y, z, s, yaw, delay, gap, hold, rgb } (world2-text.mjs show); leave(delay) sinks it */
  const lockup = (o) => (kText ? prepareLetters().then(() => (o.alive && !o.alive() ? false : kText.show(Object.assign({ word: o.text }, o)))) : Promise.resolve(false));   /* alive(): false when the show stopped while the letters loaded */
  const lockupLeave = (d) => kText && kText.leave(d);
  const lockupRgb = () => colour('--text-strong');
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
  function clearSpawns() { if (kText) kText.hide(); for (const p of at) if (p.pool) p.spawnAt = 0; litSet = new Set(); }
  /* the camera to a shot of a show: { aim, h, elev, yaw } in world units and degrees */
  let shot = 0;
  function flyPose(pose) { focusOn(pose ? { id: 'shot:' + (++shot), kind: 'shot', pose } : null); }
  /* one path through a trip's waypoints (the cinematic): waypoints are { t seconds from now, pose | 'hero' }. The camera starts from where it is and
     never rests between waypoints: each tangent is the slope between its two neighbours (Catmull-Rom on uneven spacing), so velocity carries through. */
  function flyPath(wps) { if (!wps || !wps.length) return focusOn(null); focusOn({ id: 'path:' + (++shot), kind: 'shot', path: { wps, t0: performance.now(), keys: null } }); }
  function pathPose(path, now, cam) {
    if (!path.keys) {
      zoomMul = 1; yawOff = 0; elevOff = 0; aimOff = [0, 0];
      const h = (q) => (q === 'hero' ? hero() : q);
      let yaw = cam.yaw;
      path.keys = [{ t: 0, aim: cam.aim.slice(), lh: Math.log(cam.dist * TAN), elev: cam.elev, yaw }].concat(path.wps.map((w) => { const q = h(w.pose); yaw = wrap(q.yaw, yaw); return { t: w.t, aim: q.aim, lh: Math.log(q.h), elev: q.elev, yaw }; }));
      path.keys.sort((a, b) => a.t - b.t);
      path.keys = path.keys.filter((k, i, a) => i === a.length - 1 || a[i + 1].t - k.t > 1e-3);   /* a duplicate time would divide by zero: the later waypoint wins */
    }
    const K_ = path.keys, n = K_.length, t = Math.max(0, (now - path.t0) / 1000), end = K_[n - 1].t;
    if (t >= end) { const e = K_[n - 1]; return { aim: e.aim, h: Math.exp(e.lh), elev: e.elev, yaw: e.yaw, done: true }; }
    let i = 0; while (i < n - 2 && t > K_[i + 1].t) i++;
    const b = K_[i], c = K_[i + 1], dt = c.t - b.t, u = (t - b.t) / dt;
    const slope = (j, g) => { if (j <= 0 || j >= n - 1) return 0; const a = K_[j - 1], m = K_[j], d = K_[j + 1]; if (m.t - a.t <= 0 || d.t - m.t <= 0 || d.t - a.t <= 0) return 0; const cl = (g(m) - g(a)) / (m.t - a.t), cr = (g(d) - g(m)) / (d.t - m.t); if (cl * cr <= 0) return 0; const s = (g(d) - g(a)) / (d.t - a.t), lim = Math.min(Math.abs(cl), Math.abs(cr)); return Math.sign(s) * Math.min(Math.abs(s), lim); };   /* rest at the start; each tangent capped by the shorter chord, so near-identical waypoints never backswing */
    const f = (g) => { const m0 = slope(i, g) * dt, m1 = slope(i + 1, g) * dt, u2 = u * u, u3 = u2 * u; return (2 * u3 - 3 * u2 + 1) * g(b) + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * g(c) + (u3 - u2) * m1; };
    return { aim: [0, 1, 2].map((k) => f((p) => p.aim[k])), h: Math.exp(f((p) => p.lh)), elev: f((p) => p.elev), yaw: f((p) => p.yaw), done: false };
  }

  /* ---------- the camera ----------
     Key poses: aim (world), dist (as the height of the picture it covers, in world units), elev and yaw (degrees). One Catmull-Rom curve
     runs through them over the film; the last is the hero pose the intro then holds. */
  const TAN = 2 * Math.tan(6 * Math.PI / 180);
  const MAX_DIST = 400;   /* the engine's far plane is 500 (fxn-3d WORLD.far): a pose further out draws nothing, so every pose stays inside it with room for the hall's depth */   /* the world look's 12 degree field: a picture `h` high needs a distance h / TAN */
  const netMid = [K[0] + netList.reduce((a, n) => a + n.node.x - K[0], 0) / netList.length * .5, K[1], K[2] + netList.reduce((a, n) => a + n.node.z - K[2], 0) / netList.length * .5];
  function hero() {
    /* the whole grid in frame, standing in the free space between the page's words (bottom left), its doors (top right) and its counts
       (bottom right): the aim moves left (the world shows right of the middle) and toward the camera (the world shows higher) */
    const yaw = HERO_YAW, y = yaw * Math.PI / 180, right = [Math.cos(y), 0, -Math.sin(y)], toward = [Math.sin(y), 0, Math.cos(y)], asp = Math.max(.6, aspect ? aspect() : 1.6);
    /* portrait (a phone): the whole grid cannot fit the narrow frame inside the far plane (2.9 reach / .6 put the camera 800 units out, past
       the engine's far 500, and the picture went black), so it frames the middle of the hall, 1.35 x the desktop's height, held under MAX_DIST */
    const tall = aspect && aspect() < 1, h = tall ? 2.2 * reach * 1.35 : Math.max(2.9 * reach / asp, 2.2 * reach), sx = tall ? 0 : reach * .04, sz = reach * .55;
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
    if (t.height) {   /* one of the intro's objects (world2-props.mjs): framed by its own height and footprint, a little above, seen from the kernel's side */
      const tall = aspect && aspect() < 1 ? 1.35 : 1, r = Math.max(t.radius * 1.5, t.height * .8), away = Math.atan2(t.at[0] - K[0], t.at[2] - K[2]) * 180 / Math.PI;
      return { aim: [t.at[0], floor + t.height * .4, t.at[2]], h: r * 2.6 * tall, elev: 24, yaw: away };
    }
    /* the kernel is framed close and low, so the chain kernel core in its well is the hero */
    const r = t.kind === 'network' ? t.radius : t.kind === 'kernel' ? t.radius * .62 : t.radius * 3.2;
    const away = t.kind === 'kernel' ? 6 : Math.atan2(t.at[0] - K[0], t.at[2] - K[2]) * 180 / Math.PI;
    /* the aim moves a little toward the camera, so the place stands above the middle and clear of the focus card at the foot */
    const y = away * Math.PI / 180, nudge = r * .32;
    const tall = aspect && aspect() < 1 ? 1.35 : 1;   /* portrait: 1.35 x the distance (the intro plan's phone rule), the place stays at the aim */
    return { aim: [t.at[0] + Math.sin(y) * nudge, floor + r * (t.kind === 'kernel' ? .45 : .12), t.at[2] + Math.cos(y) * nudge], h: r * 2.6 * tall, elev: t.kind === 'chain' ? 30 : t.kind === 'kernel' ? 22 : 36, yaw: away };
  }
  function focusOn(t) {
    focusT = t; arrived = false;
    const h = hourNow(); if (h !== hour) { hour = h; relook(); }   /* the hour is read again at every flight, never on a timer */
    /* the place answers the click: a short hop (POP_MS), then the camera's flight lands on it */
    if (t && t.place && !reduced()) { t.place.popAt = performance.now(); pulse(t.place.item); }
    if (playing) film.skip();   /* a visitor who picks a place has seen enough of the film */
  }
  /* the visitor's orbit, in degrees on top of the pose, turned by the engine's orbit camera (fxn-3d engine/runtime/orbit-camera.mjs turn) with the site's pitch bounds */
  const ORBIT_ELEV = { min: -25, max: 30 };
  function orbit(dy, de) { const o = orbitTurn({ yaw: yawOff, pitch: elevOff }, dy || 0, de || 0, ORBIT_ELEV); yawOff = o.yaw; elevOff = o.pitch; arrived = false; }
  const off = (a) => [a[0] + aimOff[0], a[1], a[2] + aimOff[1]];
  /* zoom by f; (dx, dz) is the pointer's floor point from the aim, in world units: the aim moves 15% of the step toward it, held inside the grid's reach */
  function zoom(f, dx, dz) {
    const z0 = zoomMul; zoomMul = Math.max(.45, Math.min(2.2, zoomMul * (f || 1))); arrived = false;
    if (dx != null && dz != null && z0 !== zoomMul) {
      const step = (z0 - zoomMul) / z0 * .15, lim = reach * .35;
      let x = aimOff[0] + dx * step, z = aimOff[1] + dz * step; const n = Math.hypot(x, z); if (n > lim) { x *= lim / n; z *= lim / n; }
      aimOff = [x, z];
    }
  }
  /* the floor while a drag runs reads louder (.2 to .3): one rewrite at each end */
  function dragging(on) { const g = on && !reduced() ? GRID_DRAG : GRID_REST; if (g !== gridK) { gridK = g; gridDirty = true; } }
  function pointerX(x) { ptrX = Math.max(-1, Math.min(1, x || 0)); }
  const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (x * 6 - 15) + 10));
  const wrap = (a, near) => { while (a - near > 180) a -= 360; while (a - near < -180) a += 360; return a; };
  function camera(now, cam) {
    const t = filmT(now);
    /* the film owns the camera while it plays and nothing is focused */
    if (t < filmEnd + .8 && !focusT) {
      const p = t < 1e8 ? poseAt(t) : hero();
      cam.aim = off(p.aim); cam.dist = Math.min(MAX_DIST * 1.2, p.h / TAN * zoomMul); cam.elev = p.elev + elevOff; cam.yaw = p.yaw + yawOff; camYaw = cam.yaw;
      flight = null; wantKey = 'film'; tell(cam); return true;
    }
    if (focusT && focusT.path) {
      const p = pathPose(focusT.path, now, cam);
      cam.aim = off(p.aim); cam.dist = Math.min(MAX_DIST * 1.2, p.h / TAN * zoomMul); cam.elev = Math.max(4, Math.min(80, p.elev + elevOff)); cam.yaw = p.yaw + yawOff; camYaw = cam.yaw;
      flight = null; wantKey = focusT.id; tell(cam);
      if (p.done && !arrived) { arrived = true; arriveFns.forEach((fn) => fn(focusT)); }
      return !p.done;
    }
    const p = focusT ? (focusT.pose || focusPose(focusT)) : hero(), key = focusT ? focusT.id : 'grid';
    const want = { aim: p.aim, dist: Math.min(MAX_DIST, p.h / TAN), elev: p.elev, yaw: p.yaw };
    if (key !== wantKey) {
      /* a new place: one flight from where the camera is, the visitor's offsets folded into its start */
      wantKey = key;
      const from = { aim: cam.aim.slice(), dist: cam.dist, elev: cam.elev, yaw: cam.yaw };
      yawOff = 0; elevOff = 0; zoomMul = 1; aimOff = [0, 0];
      const travel = Math.hypot(from.aim[0] - want.aim[0], from.aim[2] - want.aim[2]) / reach + Math.abs(Math.log(from.dist / want.dist)) * .5 + Math.abs(wrap(want.yaw, from.yaw) - from.yaw) / 180;
      flight = reduced() ? null : { from, t0: now, dur: p.dur ? p.dur * 1000 : 1000 * Math.max(FLY_MIN, Math.min(FLY_MAX, FLY_MIN + travel * .9)) };
    }
    let out, moving = false;
    if (flight) {
      const u = smooth((now - flight.t0) / flight.dur), f = flight.from, y0 = f.yaw, y1 = wrap(want.yaw, y0);
      out = { aim: f.aim.map((v, i) => v + (want.aim[i] - v) * u), dist: Math.exp(Math.log(f.dist) + (Math.log(want.dist) - Math.log(f.dist)) * u), elev: f.elev + (want.elev - f.elev) * u, yaw: y0 + (y1 - y0) * u };
      if (u >= 1) flight = null; else moving = true;
    } else out = { aim: want.aim.slice(), dist: want.dist, elev: want.elev, yaw: wrap(want.yaw, cam.yaw) };
    cam.aim = off(out.aim); cam.dist = Math.min(MAX_DIST * 1.2, out.dist * zoomMul); cam.elev = Math.max(4, Math.min(80, out.elev + elevOff)); cam.yaw = out.yaw + yawOff; camYaw = cam.yaw;
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
    /* the four-chapter film is retired (intro plan, lane 1 row 4): the world stands built at once and reports done; the intro's shots play on it */
    skip() {}, replay() {}, seek() {}
  };

  R.showPlate(false);
  /* the old plate's own point light (the look's logoLight: the glow pool at the kernel) leaves with the plate: the tower carries no glow */
  relook();
  hide();
  return { flush, repaint, pick, hover, camera, film, placements: at, focusOn, orbit, zoom, dragging, pointerX, clearNear, aimOff: () => aimOff.slice(), focused: () => focusT, highlight, spawn, clearSpawns, flyPose, flyPath, pulse, run, exposure, relook, ripple: rippleAt, lockup, lockupLeave, lockupRgb, prepareLetters, kernelR: KR, floor,
    props,
    flightState: () => (flight ? { age: performance.now() - flight.t0, dur: flight.dur, key: wantKey } : { key: wantKey }),   /* read by scripts that check the camera settles */
    onArrive: (fn) => arriveFns.push(fn), onCamera: (fn) => cameraFns.push(fn) };
}
