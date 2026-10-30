/* The design board's own views as rows (docs/design/world-grammar/BOARD-GAPS.md, lane A, 2026-10-30). Build side, Node built-ins only.
   The board (docs/home-redesign/home-mockup.html) has six views the site never carried: the minute, status, nodes, products, identity and measured. Their stages are the old Three.js files'
   own text (scripts/lib/stage-src/concept-stages.js and stages.js), run by world-stage-eval.mjs with recorders in place of Three.js, exactly as the how-it-works views are
   (world-how-scene.mjs). Nothing of a stage's maths is restated here. What this file adds is only what the stage cannot say for itself: how its channels are named (the weights that
   follow a choice are channels), the states the board's address can name (?s=, ?c=&tab=) and the text region of the file each view is cut from.
   The view names are the board's own (`minute`, not the site's `movie`: the board's minute lights five ideas, the site's movie plays nine beats of another stage), so one world holds both. */

export const BOARD_VIEWS = ['minute', 'status', 'nodes', 'products', 'identity', 'measured'];
export const BOARD_CODE = { minute: 'bm', status: 'bs', nodes: 'bn', products: 'bp', identity: 'bi', measured: 'bq' };

/* [file, the marker this view's block starts at, the marker the next block starts at (END: the file's last closing), the marker where the file's shared helpers end (null: the block's own start)] */
const CS = 'concept-stages.js';
export const BOARD_REGIONS = {
  minute: [CS, '/* In one minute: the network itself; each idea lights what it names */', '/* Three layers: three plates, the base chain at the bottom */', null],
  products: [CS, '/* Products: seven groups as seven shelves', '/* Identity and names: your key file on your device; a flat name on the Domain resolver */', '/* In one minute: the network itself; each idea lights what it names */'],
  identity: [CS, '/* Identity and names: your key file on your device; a flat name on the Domain resolver */', '/* Nodes: a browser tab, a phone, a server; the roles gather round the chosen one */', '/* In one minute: the network itself; each idea lights what it names */'],
  nodes: [CS, '/* Nodes: a browser tab, a phone, a server; the roles gather round the chosen one */', '/* Status: the network seen whole, behind the page */', '/* In one minute: the network itself; each idea lights what it names */'],
  status: [CS, '/* Status: the network seen whole, behind the page */', 'END', '/* In one minute: the network itself; each idea lights what it names */'],
  measured: ['stages.js', '/* ---------- measured: one column per capability, one cube per checked case, tallest first ---------- */', '/* ---------- FXN: the starting supply round the mark, one tile per 1% ---------- */', '/* ---------- how a result is made ---------- */']
};

const PRESENT = { lo: 0, hi: 1, rest: 1, N: 100 };
const FOLLOW_TAU = 130;   /* stages.js follower(n): 1 - exp(-dt / 130) a frame */
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');   /* concept-stages.js slug(): the product named after the dot of ?s= */

export function boardSpecs(data, o) {
  const out = {};
  const arr = (v, list) => list.map((n) => v[n] || 0);

  /* ---- the minute: the network itself, each idea lights what it names (concept-stages.js minute). Idea 5 draws a lit line from the nearest computer to the resolver ring and to yours;
     the line is the channel t5 (trace.go(1, 1100, now, 900 on arrival, 200 within the view). The rings each idea lights and its one label are read from the stage at each state. ---- */
  out.minute = {
    stage: 'minute', key: 's', focusAt: true,
    chans: { t5: { lo: 0, hi: 1, rest: 0, N: 60 }, present: PRESENT },
    states: [1, 2, 3, 4, 5].map((n) => ({ name: 's' + n, arg: { s: n }, set: { t5: n === 5 ? 1 : 0 }, from: n === 5 ? { t5: 0 } : {} })),
    span: { t5: 1100 }, delay: { t5: 200 }, fall: { t5: 0 }, lead: 900, tween: (v) => ({ tweens: { 0: v.t5 } }),
    /* the line is drawn by idea 5 only, and in the other ideas the stage draws none: that is the same as a line whose reveal (the channel t5) is nothing, so the rows are read with the stage at idea 5 for every value of t5 */
    snap({ h, values, out: o_, lineEntry, setStage }) {
      setStage(out.minute.states[4]);
      h.evaluate('minute', { tweens: { 0: values.t5 }, w: values.present });
      const occ = new Map();
      for (const c of h.lineCalls) { const at = occ.get(c.site) || 0; occ.set(c.site, at + 1); o_.lines.push(lineEntry(c, c.site, at)); }
    }
  };

  /* ---- status: the network seen whole, behind the page. The stage draws nothing of its own: its view is a camera over the network ---- */
  out.status = {
    stage: 'status', key: 's', chans: { present: PRESENT },
    states: [{ name: 's0', arg: {}, set: {}, from: {} }],
    lead: 700, spots: () => [], tween: () => ({})
  };

  /* ---- nodes: a browser tab, a phone, a server; the roles gather round the chosen one. One follower weight for each way (the chosen one's rises) ---- */
  {
    const us = [0, 1, 2].map((i) => 'u' + i);
    out.nodes = {
      stage: 'nodes', key: 's',
      chans: { ...Object.fromEntries(us.map((n, i) => [n, { lo: 0, hi: 1, rest: i === 0 ? 1 : 0, N: 24 }])), present: PRESENT },
      states: [0, 1, 2].map((n) => ({ name: 's' + n, arg: { s: n }, set: Object.fromEntries(us.map((u, i) => [u, i === n ? 1 : 0])), from: {} })),
      follow: us, tau: 170, lead: 700, exactColours: true,   /* the forms' tint is two lerps by one weight: it does not lie on one line */
      tween: (v) => ({ followers: { 0: arr(v, us) } }),
      settled: (v) => ({ followers: { 0: arr(v, us) } }),
      spots: ({ h, st, state }) => h.tagsOf('nodes', { followers: { 0: arr(state, us) } }).map((t) => ({ id: t.id, p: [t.p.x, t.p.y, t.p.z], channel: '', min: 0, state: st.name, on: t.on !== false }))
    };
  }

  /* ---- products: seven groups as seven shelves of tiles. The chosen group's shelf comes forward (a follower weight for each group); ?s=<group>.<product> lights one tile's edge ---- */
  {
    const lanes = data.DEFXN_CONCEPT.products.lanes, ls = lanes.map((_, i) => 'l' + i);
    const states = [];
    lanes.forEach((l, li) => {
      states.push({ lane: li, id: l.slug, arg: { s: l.slug } });
      l.items.forEach((it) => states.push({ lane: li, id: l.slug + '.' + slug(it.name), arg: { s: l.slug + '.' + slug(it.name) } }));
    });
    out.products = {
      stage: 'products', key: 's', openPicks: true,
      chans: { ...Object.fromEntries(ls.map((n, i) => [n, { lo: 0, hi: 1, rest: i === 0 ? 1 : 0, N: 24 }])), present: PRESENT },
      states: states.map((q, i) => ({ name: 's' + i, id: q.id, arg: q.arg, set: Object.fromEntries(ls.map((n, j) => [n, j === q.lane ? 1 : 0])), from: {} })),
      follow: ls, tau: 170, lead: 700,
      tween: (v) => ({ followers: { 0: arr(v, ls) } }),
      settled: (v) => ({ followers: { 0: arr(v, ls) } }),
      spots: ({ h, st, state }) => h.tagsOf('products', { followers: { 0: arr(state, ls) } }).map((t) => ({ id: t.id, p: [t.p.x, t.p.y, t.p.z], channel: '', min: 0, state: st.name, on: t.on !== false }))
    };
  }

  /* ---- identity and names: the two faces of one stage; the tab turns it half a circle (the tween `tab`, 1000 ms) ---- */
  out.identity = {
    stage: 'identity', key: 's',
    chans: { tb: { lo: 0, hi: 1, rest: 0, N: 100 }, present: PRESENT },
    states: [{ name: 's0', id: 'id', arg: { s: 'id' }, set: { tb: 0 }, from: { tb: 1 } }, { name: 's1', id: 'names', arg: { s: 'names' }, set: { tb: 1 }, from: { tb: 0 } }],
    span: { tb: 1000 }, lead: 1100, tween: (v) => ({ tweens: { 0: v.tb } }),
    spots: ({ h, state }) => [0, 1].flatMap((face) => h.tagsOf('identity', { tweens: { 0: face } }).filter((t) => t.on).map((t) => ({ id: t.id, p: [t.p.x, t.p.y, t.p.z], channel: 'tb', min: face ? .95 : .05, on: true, dir: face ? 'gt' : 'lt' })))
  };

  /* ---- measured: one column per capability, one cube per checked case, tallest first. The chosen column's weight follows the choice; the Runs tab steps the columns back (the tween `back`, 700 ms).
     The columns' first-visit build (a clock for each cube) is read settled: the stage is run with its reduced-motion flag, as the stats canyon is ---- */
  {
    const CAPS = data.DEFXN_CAPABILITIES.capabilities, fs = CAPS.map((_, i) => 'c' + i), tabs = ['caps', 'runs'];
    const states = []; CAPS.forEach((c, ci) => tabs.forEach((tab) => states.push({ ci, tab })));
    /* the columns' first-visit build and their hover lift are read from the stage itself, in prepare(): the build is one clock `bd` (ms of the stage's own `now`) that every cube follows at its own
       delay (rank x 45 + layer x 38, then 420 ms), so the clock's length is the moment the last cube has stopped; the hover lift is the stage's follower for the column under the pointer (`fh`), read as a
       share of a cube's own height, and the groups are the capability each cube is a case of (asked of the stage's own onPick). */
    let TT = 0;
    out.measured = {
      stage: 'measured', key: 'c', key2: 'tab',
      chans: { bk: { lo: 0, hi: 1, rest: 0, N: 40 }, bd: { lo: 0, hi: 1, rest: 1, N: 120 }, ...Object.fromEntries(fs.map((n, i) => [n, { lo: 0, hi: 1, rest: i === 0 ? 1 : 0, N: 4 }])), present: PRESENT },
      states: states.map((q, i) => ({ name: 's' + i, id: CAPS[q.ci].id + '|' + q.tab, arg: { c: CAPS[q.ci].id, tab: q.tab }, set: { bk: q.tab === 'runs' ? 1 : 0, bd: 1, ...Object.fromEntries(fs.map((n, j) => [n, j === q.ci ? 1 : 0])) }, from: { bd: 0 }, alias: q.tab === 'caps' ? [CAPS[q.ci].id + '|'] : [] })),
      span: { bk: 700 }, follow: fs, tau: FOLLOW_TAU, linear: ['bd'], once: ['bd'], lead: 800, exactColours: true,   /* a column's tint moves with two weights (chosen, stepped back toward the canvas): each frame carries its colour */
      tween: (v) => ({ tweens: { 0: v.bk }, followers: { 0: arr(v, fs) }, now: v.bd * TT, rewind: true }),
      settled: (v) => ({ tweens: { 0: v.bk }, followers: { 0: arr(v, fs) }, now: v.bd * TT, rewind: true }),
      prepare({ h, def, spec }) {
        def.set({ c: CAPS[0].id, tab: 'caps' }, 1);
        const cubes = () => h.sets.find((q) => typeof q.onPick === 'function' && q.n > 100);
        const rowsAt = (now, fh, bk) => { h.evaluate('measured', { tweens: { 0: bk || 0 }, followers: { 0: fs.map((_, i) => (i === 0 ? 1 : 0)), 1: CAPS.map(() => fh || 0) }, w: 1, now, rewind: true }); return cubes().base.map((b) => Array.from(b.e)); };
        const miss = (a, b) => a.reduce((m, r, j) => Math.max(m, ...r.map((x, c) => Math.abs(x - b[j][c]))), 0);
        const full = rowsAt(1e6);
        for (TT = 0; TT < 20000 && miss(rowsAt(TT), full) > 1e-6; TT += 10);
        if (TT >= 20000) throw new Error('the measured columns never stop building, so the build clock has no length');
        spec.span.bd = TT;
        /* the hover lift: a share of each cube's own height, the same for every cube, and gone when the columns step back */
        const up = rowsAt(1e6, 1), off = rowsAt(1e6, 1, 1), at0 = rowsAt(1e6, 0, 1);
        const fr = up.map((r, j) => (r[13] - full[j][13]) / Math.hypot(full[j][4], full[j][5], full[j][6])).filter((x, j) => Math.abs(up[j][13] - full[j][13]) > 1e-9);
        const frac = Math.round(fr[0] * 1e5) / 1e5;
        if (!fr.length || fr.some((x) => Math.abs(x - fr[0]) > 1e-6)) throw new Error('the measured columns do not lift by one share of a cube\'s height under the pointer, so the hover lift is not one number');
        if (miss(off, at0) > 1e-9 && off.some((r, j) => Math.abs(r[13] - at0[j][13]) > 1e-9)) throw new Error('the measured columns still lift under the pointer on the Runs tab, so the lift is not switched off by the tab');
        const s0 = cubes(), groups = [];
        for (let j = 0; j < s0.n; j++) { const at = h.stagePicks.length; s0.onPick(j); groups.push(h.stagePicks[at].id); }
        spec.hoverGroups = [{ part: 'bq' + s0.id, groups, frac, rate: Math.round((1 - Math.exp(-16.667 / FOLLOW_TAU)) * 1e5) / 1e5, off: 'bk' }];
      },
      spots: ({ h, st, state }) => h.tagsOf('measured', { tweens: { 0: state.bk }, followers: { 0: arr(state, fs) } }).map((t) => ({ id: t.id, p: [t.p.x, t.p.y, t.p.z], channel: 'bk', min: .5, state: st.name, on: t.on !== false, dir: 'lt' }))
    };
  }
  return out;
}
