/* The intro's new objects in the hall (docs/brand/DEFXN.md "Direction and the claim check", section 5, the seven beats; docs/design/space/SPACE.md
   "Scene redesign plan", the shape list). Layer: app. Six kinds, each a place the visitor and the intro can press:
     id-card       beat 2  the visitor's FXN ID: a card on a stand beside their chain's drum. Hover turns it to the camera and lifts it; wake lights its face.
     keeper-desk   beat 3  a bonded keeper's desk beside the network's machine: a stamp on an arm, a receipt tray, a bond lamp. stamp: the arm drops once,
                           a receipt rises out of the tray and lands on the desk.
     lane          beat 4  seven plinths round the kernel, one per product lane (DefxnKit.LANES); on each, one token per product (DefxnKit.PRODUCTS) that
                           rises on hover or rise, its base light in its catalog status (ready: the network's colour; building: honey, review).
     tower         beat 5  copy towers (pinners) on the network's rim: copy lights one slot a step from the base to the top lamp.
     rack          beat 6  the road of machines: 20 racks in two rows at the hall's edge; light-rack n lights the first n (at most 16) one after another.
     book          a key's records as numbered pages beside the drum: hover lifts the cover, pages turns n pages one after another.
   Drawn as instanced unit boxes in five shared pieces (steel, chrome, glow, crystal, page), so the six kinds cost five draws in the lit pass. Every motion is a spring
   or a clock that ends: at rest nothing asks for a frame. Reduced motion: every state is placed at once. */

const ITEM0 = 1000;   /* a prop's item: ITEM0 + its index, never a ring item */
const CHROME = { metal: 1, rough: .1, coat: 1, coatRough: .03 };
const STEEL = { metal: .6, rough: .34, coat: .45, coatRough: .1 };
const GLOW = { metal: 0, rough: 1, emission: .75 };
const CRYSTAL = { metal: 0, rough: .04, coat: 1, coatRough: .02, opacity: .55, v2: { ch: { 6: [.85, 1.5, 1.45, 1, 1, 1], 9: [.5, 250, 650], 15: [1, 1, 1, .6, 3, 0] }, maps: {}, pattern: null, mix: null, graph: null } };
const PAGE = { metal: 0, rough: .62, coat: .25, coatRough: .3 };
import { SPRING, stepped } from './world2-gl.mjs';   /* the one seam to fxn-3d */
const { ui: UI, heavy: HEAVY } = SPRING;   /* the house springs (fxn-3d engine/runtime/spring.mjs) */
const RACKS = 20, RACK_LIT_MAX = 16, RACK_STEP_MS = 120, COPY_STEP_MS = 60, SLOTS = 8, PAGES = 12, PAGE_STEP_MS = 140;

export function createProps({ pieces, KR, K, floor, nets, drum, colour, reduced, catalog }) {
  const unit = [1, 1, 1, .04];
  const P = {
    steel: pieces.add('obj-prop-steel', { box: unit, mat: STEEL, plated: false }, new Float32Array(16 * 400)),
    chrome: pieces.add('obj-prop-chrome', { box: unit, mat: CHROME, plated: false }, new Float32Array(16 * 400)),
    glow: pieces.add('obj-prop-glow', { box: [1, 1, 1, .02], mat: GLOW, plated: false }, new Float32Array(16 * 600)),
    crystal: pieces.add('obj-prop-crystal', { box: unit, mat: CRYSTAL, plated: false }, new Float32Array(16 * 200)),
    page: pieces.add('obj-prop-page', { box: [1, 1, 1, .01], mat: PAGE, plated: false }, new Float32Array(16 * 100))
  };
  const W = { steel: 0, chrome: 0, glow: 0, crystal: 0, page: 0 };

  /* ---------- the places ---------- */
  const props = [];
  const add = (o) => { o.item = ITEM0 + props.length; o.sp = { u: [0, 0], n: [0, 0], lit: [0, 0], turn: [0, 0] }; o.nearK = 0; o.litT = 0; props.push(o); return o; };
  const n0 = nets[0], node = n0.node, side = n0.a + Math.PI / 2, out = n0.a;
  const at = (x, z, a, r) => [x + Math.cos(a) * r, z + Math.sin(a) * r];
  const facing = (x, z) => Math.atan2(K[0] - x, K[2] - z);   /* a yaw that turns the prop's front (+z) to the kernel */
  const d0 = drum || node;
  let [cx, cz] = at(d0.x, d0.z, side, KR * .62);
  add({ kind: 'id-card', id: 'id-card', name: 'Your FXN ID', line: 'Only your key writes to your chain.', x: cx, z: cz, s: KR * .5, yaw: facing(cx, cz), r: .5, h: .9, parent: drum ? 'chain:' + drum.item : 'net:' + node.item });
  [cx, cz] = at(d0.x, d0.z, side + Math.PI, KR * .62);
  add({ kind: 'book', id: 'book', name: 'Your chain as a book', line: 'Each record is a numbered page. Only your key adds one.', x: cx, z: cz, s: KR * .5, yaw: facing(cx, cz), r: .5, h: .3, parent: drum ? 'chain:' + drum.item : 'net:' + node.item });   /* no typed facts (CLAIMS-AUDIT-2026-11-10) */
  [cx, cz] = at(node.x, node.z, side + Math.PI, KR * 1.35);
  add({ kind: 'keeper-desk', id: 'keeper-desk', name: 'A keeper', line: 'Bonded. Signs your receipt. No vote.', x: cx, z: cz, s: KR * .6, yaw: facing(cx, cz), r: .8, h: 1.2, parent: 'net:' + node.item });
  [-1.25, -.85, .85].forEach((da, i) => {   /* pinners on the network's rim, on the kernel's side of its fan of chains */
    const [x, z] = at(node.x, node.z, out + Math.PI + da, KR * 1.9);
    add({ kind: 'tower', id: 'tower:' + (i + 1), name: 'Pinner ' + (i + 1), line: 'Keeps a copy of every page, apart from the original.', x, z, s: KR * .45, yaw: facing(x, z), r: .3, h: 2.5, parent: 'net:' + node.item });
  });
  /* the lanes: round the kernel, in the gaps between the networks' traces */
  const lanes = (catalog && catalog.LANES) || [], prods = (catalog && catalog.PRODUCTS) || [];
  const netA = nets.map((n) => n.a).sort((a, b) => a - b), gaps = netA.map((a, i) => { const b = i + 1 < netA.length ? netA[i + 1] : netA[0] + 2 * Math.PI; return [a, b]; });
  const share = gaps.map(([a, b]) => b - a), total = share.reduce((x, y) => x + y, 0);
  let left = lanes.length; const per = gaps.map((g, i) => { const n = i === gaps.length - 1 ? left : Math.round(lanes.length * share[i] / total); left -= n; return n; });
  let li = 0;
  gaps.forEach(([a, b], gi) => { for (let j = 0; j < per[gi] && li < lanes.length; j++, li++) {
    const ln = lanes[li], ang = a + (b - a) * (j + 1) / (per[gi] + 1), [x, z] = at(K[0], K[2], ang, KR * 2.9);
    const toks = prods.filter((p) => p.lane === ln.id).sort((p, q) => (p.order || 0) - (q.order || 0)).slice(0, 6);
    const lane = add({ kind: 'lane', id: 'lane:' + ln.id, name: ln.name, line: ln.line, x, z, s: KR * .5, yaw: facing(x, z), r: .7, h: .6, parent: 'kernel',
      tokens: toks.map((p, k) => ({ p, rise: [0, 0], k })) });
    lane.tokens.forEach((t) => { t.status = t.p.status || 'ready'; });
  } });
  /* the road of machines: two rows of ten at the hall's edge, in the widest gap */
  const wide = gaps[share.indexOf(Math.max(...share))], roadA = (wide[0] + wide[1]) / 2, [rx, rz] = at(K[0], K[2], roadA, KR * 9.2);
  const road = add({ kind: 'rack', id: 'racks', name: 'The machines', line: 'The machines that will keep the devnet. A count shows once a node reports it.', x: rx, z: rz, s: KR * .5, yaw: facing(rx, rz), r: 3.6, h: 1.2, parent: 'kernel',
    /* 2026-11-10 (owner, CLAIMS-AUDIT-2026-11-10): no typed machine count; a count comes back only from PEER_COUNT */
    racks: Array.from({ length: RACKS }, () => ({ k: [0, 0], at: 0 })) });

  /* ---------- rows ---------- */
  let yaw0 = 0, ox = 0, oz = 0, oy = 0, sc = 1;
  function frame(pr) { yaw0 = pr.yaw + (pr.sp.turn[0] || 0); ox = pr.x; oz = pr.z; oy = floor; sc = pr.s; }
  /* one box in the prop's frame: centre (x, y, z) and size in prop units, its own turns (yaw about y, rz about z, rx about x), colour role and light */
  function B(piece, x, y, z, sx, sy, sz, o) {
    o = o || {};
    const n = W[piece]; if (n * 16 >= P[piece].data.length) return;
    const yw = yaw0 + (o.yaw || 0), c = Math.cos(yw), s = Math.sin(yw), cz = Math.cos(o.rz || 0), szn = Math.sin(o.rz || 0), cx2 = Math.cos(o.rx || 0), sx2 = Math.sin(o.rx || 0);
    /* M = Ry(yaw) Rz(rz) Rx(rx) S */
    const RzRx = [[cz, -szn * cx2, szn * sx2], [szn, cz * cx2, -cz * sx2], [0, sx2, cx2]];
    const Ry = [[c, 0, s], [0, 1, 0], [-s, 0, c]];
    const M = [0, 1, 2].map((r) => [0, 1, 2].map((k) => Ry[r][0] * RzRx[0][k] + Ry[r][1] * RzRx[1][k] + Ry[r][2] * RzRx[2][k]));
    const d = P[piece].data, q = n * 16, S = [sx * sc, sy * sc, sz * sc];
    for (let col = 0; col < 3; col++) for (let r = 0; r < 3; r++) d[q + col * 3 + r] = M[r][col] * S[col];
    const c0 = Math.cos(yaw0), s0 = Math.sin(yaw0);
    d[q + 9] = ox + (c0 * x + s0 * z) * sc; d[q + 10] = oy + y * sc; d[q + 11] = oz + (-s0 * x + c0 * z) * sc;
    const rgb = colour(o.role || '--nested'), k = o.k == null ? 1 : o.k;
    d[q + 12] = rgb[0] * k; d[q + 13] = rgb[1] * k; d[q + 14] = rgb[2] * k; d[q + 15] = o.a == null ? 1 : o.a;
    W[piece] = n + 1;
  }
  const spring = stepped;
  const sp = (s, target, Pp, dt, rm) => { if (rm) { s[0] = target; s[1] = 0; return false; } return spring(s, target, Pp, dt); };
  const clock = (t0, now, ms) => (t0 ? Math.min(1, (now - t0) / ms) : 0);
  const ease = (x) => x * x * (3 - 2 * x);

  let hovered = -1, camYaw = 0, last = 0;
  const DRAW = {
    'id-card'(pr, now, rm) {
      const u = pr.sp.u[0], L = pr.sp.lit[0];
      B('chrome', 0, .03, 0, .5, .06, .3);
      B('chrome', 0, .2, 0, .06, .3, .06);
      const lift = .12 * u * (rm ? 0 : 1) + .06 * L, y = .62 + lift;
      B('steel', 0, y, 0, .86, .54, .04, { rx: -.12 });
      B('crystal', 0, y, .026, .8, .48, .012, { rx: -.12, role: '--text-strong', a: .6 });
      B('glow', -.26, y + .08, .04, .12, .09, .01, { rx: -.12, role: '--primary', k: 1 + 1.5 * L });
      B('glow', .06, y - .1, .04, .5, .025, .01, { rx: -.12, role: '--text-strong', k: .6 + 1.2 * L });
      B('glow', 0, y - .28, .03, .86, .012, .012, { role: '--primary', k: .5 + 2 * L + .6 * u });
    },
    book(pr, now, rm) {
      const u = pr.sp.u[0], turn = pr.pageAt ? (now - pr.pageAt) / PAGE_STEP_MS : 0, nTurn = Math.min(pr.pageN || 0, PAGES);
      B('steel', 0, .03, 0, .72, .04, .52);
      for (let i = 0; i < PAGES; i++) {
        /* a page turned: rotated about the spine (the box's left edge, x = -.35) to the left stack */
        const k = rm ? (i < nTurn ? 1 : 0) : Math.max(0, Math.min(1, turn - i)), fl = i < nTurn ? ease(k) : 0, a = Math.PI * fl;
        const y0 = .06 + i * .012, hx = .34;
        const px = -.35 + Math.cos(a) * hx, py = y0 + Math.sin(a) * hx * .25;
        B('page', px, py, 0, .68, .008, .48, { rz: a, role: '--text-strong', k: .55 });
        if (i % 3 === 0) B('glow', px + Math.cos(a) * .3, py + .006, .2, .05, .004, .04, { rz: a, role: '--primary', k: .7 });   /* the page's number mark */
      }
      /* the cover lifts a little toward the visitor on hover */
      const ca = -.35 * u - (nTurn ? Math.PI : 0) * 0;
      B('steel', -.35 + Math.cos(-ca) * .36, .06 + PAGES * .012 + .02 + Math.sin(-ca) * .36, 0, .72, .04, .52, { rz: -ca, role: '--nested' });
      B('chrome', -.36, .14, 0, .04, .22, .52);
    },
    'keeper-desk'(pr, now, rm) {
      const u = pr.sp.u[0], st = clock(pr.stampAt, now, 900), rc = clock(pr.stampAt && now - pr.stampAt > 300 ? pr.stampAt + 300 : 0, now, 900);
      const drop = st <= 0 ? 0 : st < .28 ? ease(st / .28) : Math.max(0, 1 - ease((st - .28) / .72));
      B('steel', 0, .7, 0, 1.2, .08, .6);
      [[-.54, -.24], [.54, -.24], [-.54, .24], [.54, .24]].forEach(([x, z]) => B('chrome', x, .33, z, .05, .66, .05));
      B('glow', 0, .745, .3, 1.2, .012, .012, { role: '--primary', k: .5 + .5 * u });
      /* the stamp: a post at the back, an arm over the desk, the head with its lit face */
      B('chrome', -.3, .98, -.22, .05, .5, .05);
      const armY = 1.2 - .32 * drop;
      B('chrome', -.15, armY, -.05, .34, .04, .04, { rz: -.4 * drop });
      B('steel', 0, armY - .1, .1, .16, .14, .16);
      B('glow', 0, armY - .175, .1, .14, .012, .14, { role: '--primary', k: 1 + 3 * drop });
      /* the tray, and the receipt that rises out of it and lands on the desk */
      B('chrome', .36, .77, .08, .3, .05, .38);
      const ry = rm ? (pr.stampAt ? 1 : 0) : ease(rc), lift = Math.sin(Math.PI * ry) * .25;
      if (pr.stampAt) B('page', .36 - .32 * ry, .8 + lift, .08 + .02 * ry, .24, .006, .32, { role: '--text-strong', k: .9, rz: -.2 * Math.sin(Math.PI * ry) });
      /* the bond lamp: posted bond, lit */
      B('chrome', .5, .9, -.22, .03, .32, .03);
      B('glow', .5, 1.08, -.22, .08, .08, .08, { role: '--trust', k: 1.2 + .8 * u });
    },
    lane(pr, now, rm, dt) {
      const u = pr.sp.u[0], L = Math.max(u, pr.sp.lit[0]);
      B('steel', 0, .09, 0, .9, .18, .9);
      B('glow', 0, .185, .45, .9, .012, .012, { role: '--primary-300', k: .4 + 1.6 * L });
      B('glow', 0, .185, -.45, .9, .012, .012, { role: '--primary-300', k: .4 + 1.6 * L });
      pr.tokens.forEach((t, i) => {
        const target = L > .5 ? 1 : 0, gx = (i % 3 - 1) * .27, gz = (Math.floor(i / 3) - .5) * .3;
        const busy = rm ? (t.rise[0] = target, t.rise[1] = 0, false) : (now - (pr.riseAt || 0) > i * 80 || !target ? spring(t.rise, target, UI, dt) : true);
        if (busy) pr.moving = true;
        const y = .2 + .06 + t.rise[0] * .32;
        B('crystal', gx, y, gz, .14, .14, .14, { yaw: t.rise[0] * .6, role: '--text-strong', a: .7 });
        B('glow', gx, .19, gz, .16, .01, .16, { role: t.status === 'ready' ? '--primary' : '--drift', k: .5 + 1.2 * t.rise[0] });
      });
    },
    tower(pr, now, rm) {
      const c = pr.copyAt ? (now - pr.copyAt) / COPY_STEP_MS : -1, done = c > SLOTS + 16;
      if (done) pr.copyAt = 0;
      B('steel', 0, 1.2, 0, .22, 2.4, .22);
      B('chrome', 0, .03, 0, .36, .06, .36);
      for (let i = 0; i < SLOTS; i++) {
        const on = !rm && c >= i && !done ? Math.max(0, 1 - Math.max(0, c - SLOTS - 4) / 12) : 0;
        B('glow', 0, .25 + i * .26, .13, .14, .05, .02, { role: '--primary-300', k: .25 + 2 * on + .3 * pr.sp.u[0] });
      }
      B('glow', 0, 2.47, 0, .12, .08, .12, { role: '--live', k: 1 + .8 * pr.sp.u[0] + (c >= SLOTS && !done ? 2 : 0) });
      if (pr.copyAt) pr.moving = true;
    },
    rack(pr, now, rm, dt) {
      const n = Math.min(RACK_LIT_MAX, pr.litN || 0);
      pr.racks.forEach((r, i) => {
        const row = i < RACKS / 2 ? 0 : 1, col = i % (RACKS / 2), x = (col - (RACKS / 2 - 1) / 2) * .7, z = row ? .55 : -.55;
        const target = i < n ? 1 : 0;
        if (rm) { r.k[0] = target; r.k[1] = 0; }
        else if (!target || now - (pr.litAt || 0) > i * RACK_STEP_MS) { if (spring(r.k, target, UI, dt)) pr.moving = true; }
        else pr.moving = true;
        B('steel', x, .55, z, .5, 1.1, .4);
        B('glow', x, .55, z + (row ? -.205 : .205), .04, .9, .01, { role: i >= RACK_LIT_MAX ? '--text-faint' : '--primary', k: .15 + 1.6 * r.k[0] + .2 * pr.sp.u[0] });
      });
    }
  };

  /* write every prop's rows for `now`; true while anything still moves */
  function flush(now, cyaw, shown) {
    if (shown === false) { for (const k in P) pieces.write(P[k], P[k].data, 0); return false; }
    camYaw = cyaw || 0;
    const rm = reduced(), dt = last ? Math.max(.001, Math.min(.05, (now - last) / 1000)) : 1 / 60;
    last = now;
    for (const k in W) W[k] = 0;
    let moving = false;
    for (const pr of props) {
      pr.moving = false;
      const hov = pr.item === hovered ? 1 : 0;
      if (sp(pr.sp.u, hov, UI, dt, rm)) moving = true;
      if (sp(pr.sp.lit, pr.litT, HEAVY, dt, rm)) moving = true;
      if (pr.kind === 'id-card') {   /* hover turns the card's face to the camera, on the heavy spring */
        let a = camYaw * Math.PI / 180 - pr.yaw; a -= Math.round(a / (2 * Math.PI)) * 2 * Math.PI;
        if (sp(pr.sp.turn, hov * a, HEAVY, dt, rm)) moving = true;
      }
      if (pr.kind === 'keeper-desk' && pr.stampAt && now - pr.stampAt < 1300) moving = true;
      if (pr.kind === 'book' && pr.pageAt && now - pr.pageAt < (pr.pageN + 2) * PAGE_STEP_MS) moving = true;
      frame(pr);
      DRAW[pr.kind](pr, now, rm, dt);
      if (pr.moving) moving = true;
    }
    for (const k in P) pieces.write(P[k], P[k].data, W[k]);
    if (!moving) last = 0;
    return moving;
  }

  /* the prop under a page point (d < 1 of its screen radius): its item, else -1; with track, the nearest prop's proximity */
  function pick(px, py, cam, project, track, coarse) {
    let best = -1, score = Infinity, near = null;
    for (const pr of props) {
      if (track) pr.nearK = 0;
      const mid = [pr.x, floor + pr.h * pr.s * .5, pr.z], a = project(mid, cam), b = project([pr.x + pr.r * pr.s, mid[1], pr.z], cam);
      if (!a || !b) continue;
      const rad = Math.max(coarse ? 22 : 8, Math.hypot(b[0] - a[0], b[1] - a[1])), d = Math.hypot(px - a[0], py - a[1]) / rad;
      if (d < score) { score = d; near = pr; if (d < 1) best = pr.item; }
    }
    if (track && near) near.nearK = Math.max(0, Math.min(1, 2 - score));
    return { item: best, score };
  }
  function hover(item) { if (item === hovered) return false; hovered = item; const pr = byItem(item); if (pr && pr.kind === 'lane') pr.riseAt = performance.now(); return true; }
  const byItem = (item) => props.find((p) => p.item === item) || null;
  const byId = (id) => props.find((p) => p.id === id) || null;
  /* the intro's calls (world2-space.mjs step): stamp, pages, rise, copy, lightRack, wake, lit */
  function step(st) {
    const now = performance.now();
    if (st.stamp) { const d = byId(typeof st.stamp === 'string' ? st.stamp : 'keeper-desk'); if (d) d.stampAt = now; }
    if (st.pages != null) { const b = byId('book'); if (b) { b.pageN = Math.max(0, Math.min(PAGES, +st.pages || 0)); b.pageAt = now; } }
    if (st.rise) { for (const pr of props) if (pr.kind === 'lane' && (st.rise === '*' || st.rise === pr.id || (Array.isArray(st.rise) && st.rise.includes(pr.id)))) { pr.litT = 1; pr.riseAt = now; } }
    if (st.rise === null) for (const pr of props) if (pr.kind === 'lane') pr.litT = 0;
    if (st.copy) for (const pr of props) if (pr.kind === 'tower' && (st.copy === '*' || st.copy === pr.id || (Array.isArray(st.copy) && st.copy.includes(pr.id)))) pr.copyAt = now;
    if (st.lightRack != null) { road.litN = Math.max(0, Math.min(RACK_LIT_MAX, +st.lightRack || 0)); road.litAt = now; }
    if (st.wake) { const c = byId('id-card'); if (c) c.litT = 1; }
    if (st.wake === false) { const c = byId('id-card'); if (c) c.litT = 0; }
  }
  /* a press on a prop answers in its own way before the camera flies: the card wakes, the desk stamps, a lane rises, a tower copies, the road lights, the book turns */
  function press(item) {
    const pr = byItem(item); if (!pr) return;
    const now = performance.now();
    if (pr.kind === 'id-card') pr.litT = 1;
    else if (pr.kind === 'keeper-desk') pr.stampAt = now;
    else if (pr.kind === 'lane') { pr.litT = pr.litT ? 0 : 1; pr.riseAt = now; }
    else if (pr.kind === 'tower') pr.copyAt = now;
    else if (pr.kind === 'rack') { pr.litN = RACK_LIT_MAX; pr.litAt = now; }
    else if (pr.kind === 'book') { pr.pageN = (pr.pageN || 0) + 1 > PAGES ? 0 : (pr.pageN || 0) + 1; pr.pageAt = now - (pr.pageN - 1) * PAGE_STEP_MS; }
  }
  /* the places, in the space's shape (world2-space.mjs attachSpace) */
  const places = () => props.map((p) => ({ id: p.id, kind: p.kind, name: p.name, line: p.line, facts: (p.facts || []).slice(), parent: p.parent, at: [p.x, floor, p.z], radius: p.r * p.s, item: p.item, mid: p.h * .5 * p.s, height: p.h * p.s,
    tokens: p.tokens ? p.tokens.map((t) => ({ name: t.p.name, status: t.status })) : undefined }));
  return { flush, pick, hover, step, press, places, isProp: (item) => item >= ITEM0 && item < ITEM0 + props.length };
}
