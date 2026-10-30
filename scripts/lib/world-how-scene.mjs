/* The how-it-works views as rows (docs/design/world-grammar/PORT.md batch 3: movie, resolve, layers, life, trace). Build side, Node built-ins only.
   scripts/lib/stage-src/minute-experience.js (the minute's nine beats), stages.js (how a result is made), concept-stages.js (three layers, life of a resolver) and home-descent.js (the record
   descent) draw with Three.js. None of their maths is restated here: world-stage-eval.mjs runs each stage's own text with recorders in place of Three.js (a form placed, a colour
   tinted, a line of beads drawn) and this file reads the frames back. A view is a function of its channels (the step clock `t`, the followers of the chosen layer, the entry `open`,
   the stage weight `present`); the rows are sampled along each channel by the one sampler (world-samples.mjs: knots derived to a tolerance, never chosen) and written as a group for each
   view (named by the view): a blob of rows, a words file and the records that name them. The browser plays them with js/world2/world2-idrig.mjs, as it plays the identity steps.
   What a stage does that is not a row: its camera at each state (a WVIEW record per state, the distance fitted to the page's aspect as the stage's own W.fit does), the rings it lights
   (focus), the labels it hangs (spots), the point its page opens from (WSET ax ay az size). All are read by calling the stage's own target, anchor and tags.
   Not written, because the site's law is that animations settle: nothing loops. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { TONES, T, S, RX, RZ, chain, mul, row } from './world-rows.mjs';
import { createHarness, M4, Col, Quat, opsToWords, sourceGuard } from './world-stage-eval.mjs';
import { sampleParts, partRecords } from './world-samples.mjs';
import { extrudeLoops, flatten } from './world-glass-mesh.mjs';
import { writeBlob, boundsOf, sha as shaOfBytes } from './fxn-3d.mjs';
import { stageSrc, stageSrcLabel } from './stage-src.mjs';
import { BOARD_VIEWS, BOARD_CODE, BOARD_REGIONS, boardSpecs } from './world-board-specs.mjs';   /* the design board's own views (docs/design/world-grammar/BOARD-GAPS.md) */

let shapesOut = [];
export const HOW_VIEWS = ['movie', 'resolve', 'layers', 'life', 'trace', 'resolvers', 'fxn', 'stats', 'download', ...BOARD_VIEWS];
const CODE = { movie: 'mv', resolve: 'rv', layers: 'ly', life: 'lf', trace: 'tr', resolvers: 'rs', fxn: 'fx', stats: 'st', download: 'dl', ...BOARD_CODE };
/* ring-kit.js blockSet's own text: the default lift of a block under the pointer, and the share of the way to its target a block's hover moves each frame (60 per second) */
const _kit = fs.readFileSync(stageSrc('ring-kit.js'), 'utf8');
const BLOCK_LIFT = +(/pickable: null, onPick: null, liftable: null, label: null, lift: ([0-9.]+)/.exec(_kit) || [])[1], HOVER_RATE = +(/s\.hov\[j\] \+= d \* ([0-9.]+)/.exec(_kit) || [])[1];
if (!(BLOCK_LIFT >= 0) || !(HOVER_RATE > 0)) throw new Error('scripts/lib/stage-src/ring-kit.js no longer holds blockSet\'s lift or its hover step, so the hover lift of the how-it-works views cannot be written. Re-read the file and update scripts/lib/world-how-scene.mjs.');
/* the glyph bars of a tile, from ring-kit.js's own text (the table, the colour, the bar's depth and the tile's half depth) */
/* EDGE_SEEN: how much of the emissive reaches the eye through the .34 glass (measured against Three.js crops of the resolve view: the first try at 1 was far brighter) */ const EDGE_SEEN = .36, EDGE_W = 7 / 256, EDGE_GAIN = +/m\.emissive\.copy\(m\.color\); m\.emissiveIntensity = ([0-9.]+);/.exec(_kit)[1];   /* the glass edge map's outer line (ring-kit.js k.glassEdge: lineWidth 7 of 256) and the emissive strength */
const GLYPH_BARS = vm.runInNewContext('(' + /var GLYPH = (\{[\s\S]*?\n    \});/.exec(_kit)[1] + ')'), GLYPH_MIX = +/glyphMat\.color\.copy\(mix\('canvas', 'other', ([0-9.]+)\)\)/.exec(_kit)[1], GLYPH_DEPTH = +/makeScale\(b\[2\], b\[3\], ([0-9.]+)\)/.exec(_kit)[1], HALF_D_G = +/var LIFT = [0-9.]+, HALF_D = ([0-9.]+);/.exec(_kit)[1];
const LIFT = .16, MID = LIFT + .5, TAN = Math.tan(6 * Math.PI / 180), PI = Math.PI;
const r4 = (x) => Math.round(x * 1e4) / 1e4;

/* the text each view is run from: [file, the marker its own block starts at, the marker the next block starts at, the marker where the file's shared helpers end] */
const REGIONS = {
  resolve: ['stages.js', '/* ---------- how a result is made ---------- */', '/* ---------- the resolvers, and the capabilities each one names ---------- */', null],
  layers: ['concept-stages.js', '/* Three layers: three plates, the base chain at the bottom */', '/* Life of a resolver: one resolver from build to inspect */', '/* In one minute: the network itself; each idea lights what it names */'],
  life: ['concept-stages.js', '/* Life of a resolver: one resolver from build to inspect */', '/* Products: seven groups as seven shelves', '/* In one minute: the network itself; each idea lights what it names */'],
  movie: ['minute-experience.js', null, null, null],
  /* the descent's own stage and everything it stands on: the file from its top to where home's labels begin */
  trace: ['home-descent.js', null, "/* ---------- home's labels (.tags[data-for=\"home\"]): the ground logo and two networks ---------- */", null],
  /* batch 4: stages.js's resolvers block and its FXN block (the file's header is what both stand on: the helpers, the scratch objects, the tones), and the stats and download files whole */
  resolvers: ['stages.js', '/* ---------- the resolvers, and the capabilities each one names ---------- */', '/* ---------- measured: one column per capability, one cube per checked case, tallest first ---------- */', '/* ---------- how a result is made ---------- */'],
  fxn: ['stages.js', '/* ---------- FXN: the starting supply round the mark, one tile per 1% ---------- */', 'END', '/* ---------- how a result is made ---------- */'],
  stats: ['stats-stage.js', null, null, null],
  download: ['download-stage.js', null, null, null],
  ...BOARD_REGIONS
};
/* the minute's stage continues inside the function the clock file opens (it uses BEATS), so the movie view's text is the clock file up to its closing, then the stage */
const CLOCK_FILE = 'js/pages/world-minute-clock.js';
function minuteText(site, stage) {
  const clock = fs.readFileSync(path.join(site, CLOCK_FILE), 'utf8'), end = clock.lastIndexOf('})();');
  if (end < 0) throw new Error(CLOCK_FILE + ' no longer ends with the closing of its outer function, so the movie view cannot be joined to the clock it shares names with. Re-read the file and update minuteText in scripts/lib/world-how-scene.mjs.');
  return clock.slice(0, end) + stage;
}
function regionText(site, view) {
  const [file, from, to, headEnd] = REGIONS[view], label = stageSrcLabel(file);
  let src = fs.readFileSync(stageSrc(file), 'utf8');
  if (view === 'movie') src = minuteText(site, src);
  if (view === 'trace') {
    const end = src.indexOf(to);
    if (end < 0) throw new Error(label + ' no longer holds the marker where home\'s labels begin, so the trace view cannot be cut out of it. Re-read the file, update REGIONS in scripts/lib/world-how-scene.mjs, and run the encoder again.');
    /* the pick weights (stepPick) are followers: a channel of the sampler stands in for each, through one named hook the recorder sets */
    const call = '      stepPick(now);\n';
    if (!src.includes(call)) throw new Error(label + ' no longer calls stepPick(now) in the trace pose, so the chosen block\'s weight cannot be sampled as a channel. Re-read the file and update scripts/lib/world-how-scene.mjs.');
    src = src.slice(0, end).replace(call, call + '      if (window.__stubPick) pick.set(window.__stubPick);\n') + '\n})();';
    return src;
  }
  if (!from) return src;
  const need = (m) => { const i = src.indexOf(m); if (i < 0) throw new Error(label + ' no longer holds the marker "' + m + '", so the ' + view + ' view cannot be cut out of it. Re-read the file, update REGIONS in scripts/lib/world-how-scene.mjs, and run the encoder again.'); return i; };
  const a = need(from), b = to === 'END' ? src.lastIndexOf('\n})();') : need(to), h = headEnd ? need(headEnd) : a;
  if (b < 0) throw new Error(label + ' no longer ends with the closing of its outer function, so the ' + view + ' view cannot be cut out of it. Re-read the file, update REGIONS in scripts/lib/world-how-scene.mjs, and run the encoder again.');
  let text = src.slice(0, h) + src.slice(a, b) + '\n})();';
  /* stages.js keeps a follower of its own (one weight for each item that eases toward its target by the clock). The harness's follower answers with the value a channel sets, so the source's
     own line is swapped for it and the rest of the stage runs as it is */
  const own = 'function follower(n) {';
  if (path.basename(file) === 'stages.js') { if (!text.includes(own)) throw new Error(label + ' no longer defines "function follower(n) {", so the ' + view + ' view\'s chosen weights cannot be sampled as channels. Re-read the file and update scripts/lib/world-how-scene.mjs.'); text = text.replace(own, 'function follower(n) { return W.follower(n); }\n  function ownFollower(n) {'); }
  return text;
}

/* the page's data files the stage files read, run once in a sandbox as the encoder reads the identity sample */
export function loadData(site) {
  const get = (f, g) => { const c = { window: {} }; vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(site, f), 'utf8'), c); return c.window[g]; };
  return { DEFXN_RESOLVERS: get('js/content/resolvers-data.js', 'DEFXN_RESOLVERS'), DEFXN_CAPABILITIES: get('js/content/capabilities-data.js', 'DEFXN_CAPABILITIES'), DEFXN_RECORDS: get('js/content/records-sample.js', 'DEFXN_RECORDS'), DEFXN_CONCEPT: get('js/content/concept-data.js', 'DEFXN_CONCEPT'),
    DEFXN_FXN: get('js/content/fxn-data.js', 'DEFXN_FXN'), ArkStatsHighlights: get('js/content/stats-highlights.js', 'ArkStatsHighlights'), ArkStatsScale: get('js/content/stats-scale.js', 'ArkStatsScale') };
}

/* ---------- the views' own numbers: its stage, its channels, its states. Everything else is read from the stage ---------- */
const PRESENT = { lo: 0, hi: 1, rest: 1, N: 100 };
const SPEC = {
  resolve: {
    stage: 'resolve', key: 'step', chans: { t: { lo: 0, hi: 5, rest: 1, N: 250 }, present: PRESENT },
    states: [1, 2, 3, 4, 5].map((n) => ({ name: 's' + n, arg: { step: n }, set: { t: n }, from: { t: Math.max(0, n - 1) } })),
    /* resolve's st.go(to, 700 + 520 * |to - st.to|): the span of the first step and 520 for each step more; it waits 1150 ms for the camera when it arrives */
    span: { t: 1220 }, step: { t: 520 }, lead: 1150, tween: (v) => ({ tweens: { 0: v.t } })
  },
  layers: {
    stage: 'layers', key: 's', chans: { u0: { lo: 0, hi: 1, rest: 1, N: 40 }, u1: { lo: 0, hi: 1, rest: 0, N: 40 }, u2: { lo: 0, hi: 1, rest: 0, N: 40 }, open: { lo: 0, hi: 1, rest: 1, N: 60 }, present: PRESENT },
    states: [0, 1, 2].map((n) => ({ name: 's' + n, arg: { s: n }, set: { u0: n === 0 ? 1 : 0, u1: n === 1 ? 1 : 0, u2: n === 2 ? 1 : 0, open: 1 }, from: { open: 0 } })),
    span: { open: 900 }, lead: 700, follow: ['u0', 'u1', 'u2'], tween: (v) => ({ followers: { 0: [v.u0, v.u1, v.u2] }, tweens: { 0: v.open } })
  },
  life: {
    stage: 'life', key: 's', chans: { t: { lo: 0, hi: 5, rest: 1, N: 250 }, present: PRESENT },
    states: [1, 2, 3, 4, 5].map((n) => ({ name: 's' + n, arg: { s: n }, set: { t: n }, from: { t: Math.max(0, n - 1) } })),
    /* life's st.go(to, 650 + 450 * |to - st.to|); it waits 800 ms for the camera */
    span: { t: 1100 }, step: { t: 450 }, lead: 800, tween: (v) => ({ tweens: { 0: v.t } })
  },
  movie: {
    stage: 'movie', key: 's', chans: { t4: { lo: 0, hi: 1, rest: 0, N: 60 }, t5: { lo: 0, hi: 1, rest: 0, N: 60 }, t9: { lo: 0, hi: 1, rest: 0, N: 60 }, present: PRESENT },
    states: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ name: 's' + n, arg: { s: n }, set: { t4: n === 4 ? 1 : 0, t5: n === 5 ? 1 : 0, t9: n === 9 ? 1 : 0 }, from: n === 4 ? { t4: 0 } : n === 5 ? { t5: 0 } : n === 9 ? { t9: 0 } : {} })),
    /* trace.go(1, step === 5 ? 1500 : 1200, now, 500): the line runs for 1200 ms (1500 for the mesh) after 500 ms; a beat that is left snaps its line to nothing */
    span: { t4: 1200, t5: 1500, t9: 1200 }, delay: { t4: 500, t5: 500, t9: 500 }, fall: { t4: 0, t5: 0, t9: 0 }, lead: 500
  },
  trace: null
};

/* the length of the camera flight that opens each beat of the minute (minute-experience.js FLIGHT, read from its text): the state of beat 0 has none */
function minuteFlights(site, states) {
  const src = fs.readFileSync(path.join(site, CLOCK_FILE), 'utf8'), m = /var FLIGHT = (\[[0-9, ]+\]);/.exec(src);
  if (!m) throw new Error(CLOCK_FILE + ' no longer holds "var FLIGHT = [...]", so the beats\' flights cannot be read. Re-read it and update scripts/lib/world-how-scene.mjs.');
  const list = vm.runInNewContext(m[1]);
  if (list.length !== states - 1) throw new Error('the minute has ' + list.length + ' flights for ' + (states - 1) + ' beats');
  return [0, ...list];
}

/* the scene: for each view, its function of channels (pose), its cameras, anchors, labels and lit rings, and the parts it is made of */
export function howScene(o) {
  const { N, cast, cubes, site } = o;
  const data = loadData(site);
  /* the descent: one state for each record of the sample chain (its id is the page's key), the entry `intro` of the line (1.5 s after 450 ms), and the pick weights as followers (tau 160 ms) */
  const recs = data.DEFXN_RECORDS.records, ups = recs.map((_, i) => 'u' + i);
  SPEC.trace = {
    stage: 'trace', key: 's', chans: { intro: { lo: 0, hi: 1, rest: 1, N: 60 }, ...Object.fromEntries(ups.map((u, i) => [u, { lo: 0, hi: 1, rest: i === 0 ? 1 : 0, N: 30 }])), present: PRESENT },
    states: recs.map((r, i) => ({ name: 's' + i, id: r.id, arg: { s: r.id }, set: { intro: 1, ...Object.fromEntries(ups.map((u, j) => [u, i === j ? 1 : 0])) }, from: { intro: 0 } })),
    span: { intro: 1500 }, lead: 450, follow: ups, tween: (v) => ({ tweens: { 0: v.intro }, pick: ups.map((u) => v[u]) })
  };
  shapesOut = [];
  Object.assign(SPEC, batch4Specs(data, o), boardSpecs(data, o));
  const views = {}, parts = {}, plateList = new Map();   /* parts: name -> { view, kind, args, count }; plateList: part -> the words of its plate */
  let base = 22;

  for (const view of HOW_VIEWS.filter((v) => SPEC[v])) {
    const spec = SPEC[view], code = CODE[view];
    if (view === 'movie') spec.flight = minuteFlights(site, spec.states.length);
    const h = createHarness({ site, N, cast, cubes, data, END: o.END });
    h.k.knobs.emberLight = 1;   /* the light's strength is recorded as a share of the look's emberlight */
    h.run(view, regionText(site, view));   /* the file name is the view's own: a call site reads `stage:<view>:<line>:<column>` */
    const def = h.stages[spec.stage]; if (!def) throw new Error('the ' + view + ' source did not register a stage named ' + spec.stage);
    base = h.BASE;
    if (spec.prepare) spec.prepare({ h, def, spec });

    /* ---- one evaluation: the stage at a state and at the values of its channels, read back as rows ---- */
    const cache = new Map(), dead = new Set();
    const setStage = (st) => (spec.setStage ? spec.setStage(def, st) : def.set(st.arg, 1));
    function snapshot(values, stateIdx) {
      const k = JSON.stringify([values, stateIdx]);
      if (cache.has(k)) return cache.get(k);
      const out = { fixed: new Map(), lines: [] };
      /* what a run of the stage placed, read back as rows: the sets, the plates, the meshes */
      const collect = () => { for (const s of h.sets) rowsOfSet(h, s, code, out.fixed, parts, view); h.plates.forEach((p) => rowsOfPlate(p, code, out.fixed, parts, view, h, plateList)); rowsOfMeshes(h, code, out.fixed, parts, view, plateList); };
      /* a line call as the layout names it: the call site's own name (or the one a view gives it) and its place among that site's calls */
      const lineEntry = (c, siteName, at) => { const kind = c.tone === 'signal' ? 'lit' : 'dots', tone = kind === 'lit' ? [TONES.signal, 0, 0] : [TONES.muted, TONES.canvas, .25]; return { key: siteName + ':' + kind, kind, at, count: c.count, cap: c.n, row: [c.a.x, c.a.y, c.a.z, c.c.x, c.c.y, c.c.z, c.count, c.r, 0, 0, 0, 0, ...tone, c.reveal] }; };
      /* a view that reads its rows another way than one run of its stage (the resolvers' lines hang on a pair of weights; the supply tiles each at their own moment) says how */
      if (spec.snap) spec.snap({ h, def, values, out, collect, lineEntry, setStage, stateIdx, parts });
      const runs = spec.snap ? [] : view === 'movie' ? [4, 5, 9] : [null];
      for (const beat of runs) {
        const st = beat == null ? spec.states[stateIdx] : spec.states[beat];
        setStage(st);
        const ov = view === 'movie' ? { tweens: { 0: values['t' + beat] } } : spec.tween(values);
        h.evaluate(spec.stage, { ...ov, w: values.present });
        for (const s of h.sets) rowsOfSet(h, s, code, out.fixed, parts, view);
        h.plates.forEach((p) => rowsOfPlate(p, code, out.fixed, parts, view, h, plateList));
        rowsOfMeshes(h, code, out.fixed, parts, view, plateList);
        /* a line is ONE row per call (ring-kit.js k.beads line(a, c, count, reveal, r)): the ends, the count, the bead's radius, and the reveal in the alpha slot. The page lays the beads along it
           and grows them by the reveal as k.beads does, so only the reveal is sampled and a line costs a row a frame, not a bead a frame */
        const occ = new Map();
        for (const c of h.lineCalls) {
          const kind = c.tone === 'signal' ? 'lit' : 'dots', key = c.site + ':' + kind, at = occ.get(key) || 0, tone = kind === 'lit' ? [TONES.signal, 0, 0] : [TONES.muted, TONES.canvas, .25];
          occ.set(key, at + 1);
          out.lines.push({ key, kind, at, count: c.count, cap: c.n, row: [c.a.x, c.a.y, c.a.z, c.c.x, c.c.y, c.c.z, c.count, c.r, 0, 0, 0, 0, ...tone, c.reveal] });
        }
        if (view !== 'movie') break;
      }
      for (const d of dead) { out.fixed.delete(d); delete parts[d]; }
      cache.set(k, out);
      return out;
    }

    /* ---- the layout of the line parts: every callsite's occurrences, at their most, over every point the sampler will evaluate ---- */
    const rest = Object.fromEntries(Object.entries(spec.chans).map(([c, d]) => [c, d.rest]));
    snapshot(rest, 0);   /* the first frame read is the settled one: what it shows is what the view is made of */
    const layout = new Map();   /* key -> { kind, counts: [per occurrence] } */
    const grid = (c) => { const d = spec.chans[c]; return [...Array(d.N + 1).keys()].map((q) => d.lo + (d.hi - d.lo) * q / d.N); };
    const seen = (values) => { for (const l of snapshot(values, 0).lines) { const e = layout.get(l.key) || { kind: l.kind, cap: l.cap, counts: [] }; e.counts[l.at] = Math.max(e.counts[l.at] || 0, l.count); layout.set(l.key, e); } };
    for (const c of Object.keys(spec.chans)) for (const v of grid(c)) seen({ ...rest, [c]: v });
    /* the states' own rest values are frames too: a beat's line is at its end when the beat is settled */
    for (let i = 0; i < spec.states.length; i++) seen({ ...rest, ...spec.states[i].set });
    const at2 = (key) => { const m = /:(\d+):(\d+):(?:lit|dots)$/.exec(key); return [Number(m[1]), Number(m[2])]; };
    const lineNames = [...layout.keys()].sort((a, b) => { const x = at2(a), y = at2(b); return x[0] - y[0] || x[1] - y[1] || (a < b ? -1 : 1); });
    lineNames.forEach((key, n) => { const e = layout.get(key), cap = e.cap; e.name = code + 'n' + n; parts[e.name] = { view, kind: 'beads', args: [e.kind, cap, ...e.counts.map((c) => c || 0)], count: e.counts.length }; });

    /* the colours: every tinted row's colour over every frame, as weights on the tones. A row whose colour never moves is that colour; one that moves along a line (a scalar times a tone, a lerp
       of two) is a lerp between its two ends by a mix, and the mix is what the sampler follows. The ends are palette entries: a tone, or a derived entry (weights on tones) after the base. */
    const first = snapshot(rest, 0), derived = [], derivedAt = new Map(), vecs = new Map();
    /* a set the stage makes and never places in any frame (the descent's file also builds the home logo's plate) is not a part of the view */
    const fixedNames = [...first.fixed.keys()].filter((name) => { const live = [...cache.values()].some((sn) => sn.fixed.get(name) && sn.fixed.get(name).rows.some((r) => r[15] >= 0)); if (!live) { delete parts[name]; dead.add(name); } return live; });
    const KEYS = Object.keys(TONES), vecOf = (col) => { const p = col.parts(); for (const k of Object.keys(p)) if (!(k in TONES)) throw new Error('a colour is made of a tone the grammar has no index for: ' + k); return KEYS.map((k) => p[k] || 0); };
    const indexOfVec = (v) => {
      const nz = v.map((x, i) => [i, x]).filter(([, x]) => Math.abs(x) > 1e-9);
      if (nz.length === 1 && Math.abs(nz[0][1] - 1) < 1e-9) return TONES[KEYS[nz[0][0]]];
      const key = nz.map(([i, x]) => i + ':' + x.toFixed(6)).join(' ');
      if (!derivedAt.has(key)) { derivedAt.set(key, h.BASE + derived.length); derived.push({ index: h.BASE + derived.length, weights: nz.map(([i, x]) => [TONES[KEYS[i]], Math.round(x * 1e6) / 1e6]) }); }
      return derivedAt.get(key);
    };
    for (const snap of cache.values()) for (const [name, { cols }] of snap.fixed) cols.forEach((c, i) => { if (c) { const k = name + ':' + i, l = vecs.get(k) || []; l.push(vecOf(c)); vecs.set(k, l); } });
    const fits = new Map();
    /* exactColours (a view whose rows are tinted by two weights, so no row's colours lie on one line): each frame of a row carries its own colour as a palette entry, and the page blends the frames
       it is sampled between in linear colour, channel by channel. The entries are the distinct colours the sampler reads, never typed. */
    if (!spec.exactColours) for (const [k, list] of vecs) {
      const ref = list[0], dist = (a) => Math.hypot(...a.map((x, i) => x - ref[i]));
      let far = list[0]; for (const v of list) if (dist(v) > dist(far)) far = v;
      const d = far.map((x, i) => x - ref[i]), dd = d.reduce((a, x) => a + x * x, 0);
      if (dd < 1e-18) { fits.set(k, { A: indexOfVec(ref), B: 0, line: null }); continue; }
      let tmin = 0, tmax = 0;
      const tOf = (v) => v.reduce((a, x, i) => a + (x - ref[i]) * d[i], 0) / dd;
      for (const v of list) {
        const t = tOf(v); tmin = Math.min(tmin, t); tmax = Math.max(tmax, t);
        /* a tint made of two lerps by one weight (the nodes' forms: dark to graphite, then toward teal) bends a little off the line between its ends: a view may say how far it accepts (colourTol, in tone weights), and the miss is measured here, never assumed */
        const miss = Math.hypot(...v.map((x, i) => x - ref[i] - t * d[i]));
        if (miss > (spec.colourTol || 1e-6)) throw new Error('the row ' + k + ' of the ' + view + ' view is tinted by colours that do not lie on one line (it moves with two channels in two directions, the miss is ' + miss.toFixed(4) + '), so it cannot be a lerp between two fixed colours');
      }
      const at = (t) => ref.map((x, i) => x + d[i] * t);
      fits.set(k, { A: indexOfVec(at(tmin)), B: indexOfVec(at(tmax)), line: { tOf, tmin, tmax } });
    }
    const tinted = (name, snap) => { if (!snap.fixed.get(name)) throw new Error('the ' + view + ' view has a part ' + name + ' that one of its frames does not hold (' + [...snap.fixed.keys()].join(',') + ')'); return tintedRows(name, snap); };
    const tintedRows = (name, snap) => snap.fixed.get(name).rows.map((r, i) => {
      const o = r.slice(), c = snap.fixed.get(name).cols[i];
      if (!c) return o;
      if (spec.exactColours) { o[12] = indexOfVec(vecOf(c)); o[13] = 0; o[14] = 0; return o; }
      const f = fits.get(name + ':' + i), v = vecOf(c);
      o[12] = f.A; o[13] = f.B; o[14] = f.line ? (f.line.tOf(v) - f.line.tmin) / (f.line.tmax - f.line.tmin) : 0;
      return o;
    });
    /* pose(values) -> { part: rows } for the sampler */
    const pose = (values) => {
      const snap = snapshot(values, 0), out = {};
      for (const name of fixedNames) out[name] = tinted(name, snap);
      for (const key of lineNames) { const e = layout.get(key); out[e.name] = Array.from({ length: parts[e.name].count }, () => h.NULL()); }
      for (const l of snap.lines) out[layout.get(l.key).name][l.at] = l.row;
      return out;
    };

    /* ---- a part whose every row grows with the stage's weight by one scale (stats: cubes of a base) is not sampled along the weight: the one scale is derived, with the plane it grows from ---- */
    const gates = [];
    for (const name of spec.gated || []) {
      const ws = grid('present'), at1 = pose(rest)[name], frames = ws.map((w) => pose({ ...rest, present: w })[name]);
      let ref = -1, size = 0; at1.forEach((r, i) => { const z = Math.hypot(r[0], r[1], r[2]); if (r[15] >= 0 && z > size) { size = z; ref = i; } });
      const g = frames.map((fr) => Math.hypot(fr[ref][0], fr[ref][1], fr[ref][2]) / size);
      const mid = g.findIndex((x) => x > .4 && x < .6), piv = mid < 0 ? 0 : (frames[mid][ref][10] - g[mid] * at1[ref][10]) / (1 - g[mid]);
      let dev = 0;
      frames.forEach((fr, q) => fr.forEach((r, i) => {
        if (fr[ref][15] < 0) { g[q] = 0; return; }   /* the stage is not shown at this weight (a weight of nothing hides every form) */
        const b = at1[i]; if (b[15] < 0 && r[15] < 0) return;
        if ((b[15] < 0) !== (r[15] < 0)) { dev = Infinity; return; }
        for (let c = 0; c < 9; c++) dev = Math.max(dev, Math.abs(r[c] - b[c] * g[q]));
        dev = Math.max(dev, Math.abs(r[9] - b[9]), Math.abs(r[11] - b[11]), Math.abs(r[10] - (piv + (b[10] - piv) * g[q])));
      }));
      if (!(dev < 3e-3)) throw new Error('the part ' + name + ' of the ' + view + ' view does not grow with the stage weight by one scale about one plane (the largest miss is ' + dev + '), so it cannot be written as one frame and a gate. Sample it along the weight instead.');
      /* the keys of the scale: a point is kept where the line between its neighbours would miss it by more than 1e-3 */
      const keep = [0, ws.length - 1], need = (a, b) => { let w = -1, wd = 1e-3; for (let k = a + 1; k < b; k++) { const d = Math.abs(g[k] - (g[a] + (g[b] - g[a]) * (k - a) / (b - a))); if (d > wd) { wd = d; w = k; } } if (w >= 0) { keep.push(w); need(a, w); need(w, b); } };
      need(0, ws.length - 1);
      gates.push({ part: name, pivot: Math.round(piv * 1e4) / 1e4, keys: keep.sort((a, b) => a - b).map((k) => [ws[k], Math.round(g[k] * 1e5) / 1e5]) });
    }

    /* ---- cameras, anchors, labels, focus: read from the stage at each state ---- */
    const cams = [], anchors = [], focus = [], spots = [], plateVars = [], picks = [], builds = [];
    spec.states.forEach((st, i) => {
      setStage(st);
      /* a plate whose words depend on the state (the record descent's card shows the chosen record): the calls it draws in each state */
      if (view === 'trace') h.plates.forEach((p) => plateVars.push(plateWords(code + 'p' + p.id + '@' + st.name, p.w, p.h, p.ops, null, 512)));
      if (view === 'trace' || spec.openPicks) {
        /* what a touch on each block says and does in this state: the stage's own label and onPick, asked of each block with its `open` recorded */
        const ps = h.sets.find((q) => typeof q.onPick === 'function' && q.n > 1);
        for (let j = 0; ps && j < ps.n; j++) {
          const lab = ps.label(j), at = h.opens.length; ps.onPick(j); const o = h.opens[at];
          if (!o) throw new Error('the block ' + j + ' of the ' + view + ' view does nothing when touched, so no touch word can be written for it');
          const [key, value] = Object.entries(o.state)[0] || ['', ''];
          picks.push(['pick', view, st.name, j, lab.name, lab.act, o.view, key, value, o.opts.replace ? 1 : 0]);
        }
      }
      /* a stage that keeps its anchor or its touch words from its last pose (the resolvers' chosen cube) is posed once at this state's settled values first */
      if (spec.settled) h.evaluate(spec.stage, { ...spec.settled({ ...rest, ...st.set }), w: 1 });
      cams[i] = cameraOf(h, spec.stage, TAN, spec.frameOf);
      const a = h.anchorOf(spec.stage); anchors[i] = { at: [r4(a.pos.x), r4(a.pos.y), r4(a.pos.z)], size: r4(a.s) };
      /* what a touch on each instance of a touchable set says and does in this state: the stage's own label and onPick, with the hook it calls recorded */
      if (spec.settled) pickLines(h, code, view, st, picks);
      if (spec.beats) {
        /* what the step lights (the stage's own focusOn, called as the step is chosen) and the point of the network's build-up it holds the clock at */
        focus[i] = W_focus(h, cast, N);
        const ck = h.clockCalls[h.clockCalls.length - 1]; builds[i] = ck && ck.ms != null ? ck : null;
      }
      if (view === 'movie' || spec.focusAt) {
        /* the beat's label and the rings it lights: called as the beat's pose is first drawn (a pose at full weight) */
        h.evaluate(spec.stage, { tweens: { 0: 0 }, w: 1 });
        const f = W_focus(h, cast, N);
        focus[i] = f;
        for (const t of h.tagsOf(spec.stage, {})) spots.push({ id: t.id, p: [r4(t.p.x), r4(t.p.y), r4(t.p.z)], channel: '', min: 0, state: st.name, on: t.on });
      }
    });
    if (spec.spots) {
      spec.states.forEach((st) => { setStage(st); for (const sp of spec.spots({ h, st, state: { ...rest, ...st.set } })) spots.push({ ...sp, p: sp.p.map(r4), state: sp.state != null ? sp.state : '' }); });
      setStage(spec.states[0]);
    } else if (view !== 'movie' && !spec.focusAt) {
      setStage(spec.states[0]);
      const ch = Object.keys(spec.chans).filter((c) => c !== 'present')[0], d = spec.chans[ch];
      const tagsAt = (v) => h.tagsOf(spec.stage, view === 'layers' ? { followers: { 0: [1, 0, 0] }, tweens: { 0: 1 } } : { tweens: { 0: v } });
      const end = tagsAt(d.hi), none = tagsAt(d.lo);
      end.forEach((t, i) => {
        let min = 0;
        if (!none[i].on) { let lo = d.lo, hi = d.hi; if (!t.on) { return; } for (let q = 0; q < 40; q++) { const mid = (lo + hi) / 2; if (tagsAt(mid)[i].on) hi = mid; else lo = mid; } min = r4((lo + hi) / 2); }
        spots.push({ id: t.id, p: [r4(t.p.x), r4(t.p.y), r4(t.p.z)], channel: none[i].on ? '' : ch, min, state: '', on: true });
      });
    }
    /* a camera that fits the page's box less the page's own top and bottom (stats): the gap the stage keeps besides them, read by asking it at a narrow box and no padding */
    if (spec.padgap) spec.gap = spec.padgap(h, def, cams[0]);
    views[view] = { spec, builds, gates, pose, cams, anchors, focus, spots, chans: spec.chans, rest, code, derived, plateVars, picks };
  }
  return { views, parts, base, plates: [...plateList.values()], shapes: shapesOut };
}

/* ---------- batch 4: the resolvers, the FXN supply, the stats canyon, the download window ----------
   Each is a stage file run as it is (world-stage-eval.mjs). What a view adds here is only how its channels are named and read: the weights that follow a choice are channels (one for each item), and a line
   that hangs on a choice is a row that depends on that choice's weight. */
const FOLLOW_TAU = 130;   /* stages.js follower(): 1 - exp(-dt / 130) a frame */
function batch4Specs(data, o) {
  const out = {};
  const RES = data.DEFXN_RESOLVERS.resolvers, CAPS = data.DEFXN_CAPABILITIES.capabilities;
  /* ---- resolvers: a cube for each resolver, a small cube for each capability, a dotted line from the chosen cube to each capability it names ---- */
  {
    const fcs = RES.map((_, i) => 'fc' + i), fks = CAPS.map((_, c) => 'fk' + c), names = RES.map((r) => r.composes);
    const on = (i, c) => names[i].indexOf(CAPS[c].id) >= 0;
    const arr = (v, list) => list.map((n) => v[n] || 0);
    const stateSet = (i) => ({ ...Object.fromEntries(fcs.map((n, j) => [n, i === j ? 1 : 0])), ...Object.fromEntries(fks.map((n, c) => [n, on(i, c) ? 1 : 0])) });
    let pairs = null;
    out.resolvers = {
      stage: 'resolvers', key: 'id',
      chans: { ...Object.fromEntries(fcs.map((n, i) => [n, { lo: 0, hi: 1, rest: i === 0 ? 1 : 0, N: 24 }])), ...Object.fromEntries(fks.map((n, c) => [n, { lo: 0, hi: 1, rest: on(0, c) ? 1 : 0, N: 24 }])), present: PRESENT },
      states: RES.map((r, i) => ({ name: 's' + i, id: r.id, arg: { id: r.id }, set: stateSet(i), from: {} })),
      follow: [...fcs, ...fks], tau: FOLLOW_TAU, lead: 0,
      tween: (v) => ({ followers: { 0: arr(v, fcs), 1: arr(v, fks) } }),
      settled: (v) => ({ followers: { 0: arr(v, fcs), 1: arr(v, fks) } }),
      /* a line hangs from the chosen cube to a capability it names: the pairs are the lines the stage draws when the choice is whole; a pair's row depends on the choice's weight (the cube's, and the capability's follows it) */
      snap({ h, def, values, out: o_, collect, lineEntry, setStage }) {
        const st0 = out.resolvers.states[0];
        setStage(st0); h.evaluate('resolvers', { ...out.resolvers.tween(values), w: values.present }); collect();
        if (!pairs) {
          pairs = [];
          RES.forEach((r, i) => CAPS.forEach((_, c) => {
            if (!on(i, c)) return;   /* a resolver names its capabilities in its data (composes): the stage draws a line to a capability only while that choice's weight for it is up */
            def.set({ id: r.id }, 1);
            h.evaluate('resolvers', { followers: { 0: RES.map((__, j) => (j === i ? 1 : 0)), 1: CAPS.map((__, q) => (q === c ? 1 : 0)) }, w: 1 });
            if (h.lineCalls.length) pairs.push([i, c]);
          }));
        }
        pairs.forEach(([i, c], p) => {
          const x = values['fc' + i];
          def.set({ id: RES[i].id }, 1);
          h.evaluate('resolvers', { followers: { 0: RES.map((__, j) => (j === i ? x : 0)), 1: CAPS.map((__, q) => (q === c ? x : 0)) }, w: values.present });
          if (h.lineCalls.length) o_.lines.push(lineEntry(h.lineCalls[0], 'stage:resolvers:0:0', p));
        });
        setStage(st0);
      },
      /* a capability's name shows once its cube has risen to .6 of the way */
      spots: ({ h, state }) => labelsByChannel(h, 'resolvers', fks, (ch, v) => ({ followers: { 0: arr(state, fcs), 1: CAPS.map((_, c) => (ch === 'fk' + c ? v : 0)) } }), state).map((t) => ({ ...t, min: t.channel ? t.min : 0 })),
      pairCount: () => pairs && pairs.length
    };
  }
  /* the entry sweep's numbers, read from stages.js's own text: it starts when the stage weight passes `at`, tile i waits (99 - i) x step ms and rises over dur ms */
  const SWEEP = (() => {
    const src = fs.readFileSync(stageSrc('stages.js'), 'utf8'), m = /arrived < 0 && w > ([0-9.]+)\)/.exec(src), q = /clamp01\(\(now - arrived - \(99 - i\) \* (\d+)\) \/ (\d+)\)/.exec(src);
    if (!m || !q) throw new Error('scripts/lib/stage-src/stages.js no longer holds the entry sweep of the FXN tiles (arrived, the stagger and its length), so it cannot be written. Re-read it and update SWEEP in scripts/lib/world-how-scene.mjs.');
    const step = +q[1], dur = +q[2];
    return { at: +m[1], step, dur, d0: 99 * step, T: 99 * step + dur };
  })();
  /* ---- fxn: 100 supply tiles round the mark, one for each 1%. A tile's weight follows the chosen part; the tab swaps the layout (the channel ft) ---- */
  {
    const D = data.DEFXN_FXN, supply = D.groups.flatMap((g) => g.parts.map((p) => p.id)), fees = D.fees.parts.map((p) => p.id);
    const us = Array.from({ length: 100 }, (_, i) => 'u' + i), SETTLED = 1e5;
    /* which part a tile stands for in a layout: the stage's own onPick says it (the layout is the tab the stage was last set to) */
    let probe = null;
    const partsOf = (h, def, g, tab) => { def.set({ g, tab }, 1); const tiles = h.sets.find((q) => q.n === 100 && typeof q.onPick === 'function'), ids = []; for (let i = 0; i < 100; i++) { const at = h.stagePicks.length; tiles.onPick(i); ids.push(h.stagePicks[at].id); } return ids; };
    const stateList = [...supply.map((g) => ({ g, tab: null })), ...fees.map((g) => ({ g, tab: 'fees' }))];
    out.fxn = {
      stage: 'fxn', key: 'g',
      chans: { ft: { lo: 0, hi: 1, rest: 0, N: 48 }, sw: { lo: 0, hi: 1, rest: 1, N: 40 }, ...Object.fromEntries(us.map((n) => [n, { lo: 0, hi: 1, rest: 0, N: 2 }])), present: PRESENT },
      states: stateList.map((q, i) => ({ name: 's' + i, id: q.g, arg: { g: q.g, tab: q.tab }, set: { ft: q.tab ? 1 : 0 }, from: {}, tab: q.tab })),
      span: { ft: 1300, sw: SWEEP.T }, linear: ['sw'], follow: us, tau: FOLLOW_TAU, lead: 0, swat: SWEEP.at,
      /* the entry sweep (stages.js fxn pose): from the moment the stage weight passes .7 the tiles rise one after another, clockwise, tile i at (99 - i) x 6 ms for 380 ms. `sw` is that clock (SWEEP.T ms);
         a tile's own progress is what its rows are sampled along, and the stagger maps one to the other */
      staggers: [{ part: 'fx0', axis: 'sw', T: SWEEP.T, dur: SWEEP.dur, d0: SWEEP.d0, step: -SWEEP.step, curve: 0 }],
      prepare({ h, def, spec }) {
        probe = { supply: partsOf(h, def, 'mining', null), fees: partsOf(h, def, 'computers', 'fees') };
        spec.states.forEach((st) => { const ids = st.tab ? probe.fees : probe.supply; us.forEach((n, i) => { st.set[n] = ids[i] === st.id ? 1 : 0; }); });
        def.set({ g: 'mining', tab: null }, 1);
        spec.chans.u0.rest = spec.states[0].set.u0;   // rest = state 0's weights
        us.forEach((n) => { spec.chans[n].rest = spec.states[0].set[n]; });
      },
      tween: (v) => ({ tweens: { 0: v.ft }, followers: { 0: us.map((n) => v[n] || 0) }, now: SETTLED }),
      /* a tile at its own progress a of the sweep: the stage is run at the clock where tile i has that progress, and only tile i's row is kept */
      snap({ h, def, values, out, collect, setStage, stateIdx, parts }) {
        const ov = this.tween(values);
        setStage(this.states[stateIdx]); h.state.clock = 0;
        h.evaluate('fxn', { ...ov, w: values.present });
        collect();
        const a = values.sw == null ? 1 : values.sw;
        if (a >= 1 - 1e-9) return;
        const name = [...out.fixed.keys()].find((k) => out.fixed.get(k).rows.length === 100 && parts[k] && parts[k].kind === 'block');
        if (!name) throw new Error('the supply tiles are not one block part of 100 rows, so their entry sweep cannot be written. Re-read stages.js fxn and update scripts/lib/world-how-scene.mjs.');
        const rows = out.fixed.get(name).rows.slice(), cols = out.fixed.get(name).cols.slice();
        for (let i = 0; i < 100; i++) {
          h.state.clock = 0;
          h.evaluate('fxn', { ...ov, w: values.present, now: SWEEP.d0 - SWEEP.step * i + a * SWEEP.dur });
          const tmp = new Map(); const set = h.sets.find((q) => q.n === 100 && typeof q.onPick === 'function');
          rowsOfSet(h, set, CODE.fxn, tmp, {}, 'fxn');
          const one = [...tmp.values()][0]; rows[i] = one.rows[i]; cols[i] = one.cols[i];
        }
        out.fixed.set(name, { rows, cols });
      },
      settled: (v) => ({ tweens: { 0: v.ft }, followers: { 0: us.map((n) => v[n] || 0) }, now: SETTLED }),
      spots: ({ h, st, state }) => {
        const ov = { tweens: { 0: state.ft }, followers: { 0: us.map((n) => state[n] || 0) }, now: SETTLED };
        const here = h.tagsOf('fxn', ov), up = h.tagsOf('fxn', { ...ov, tweens: { 0: 1 - state.ft } });
        /* a label that shows with the layout it belongs to: on at this state's tab and off at the other's (the stage's own rule: ft under .5 for the supply, over it for the fees) */
        return here.map((t) => { const o2 = up.find((q) => q.id === t.id), both = t.on || (o2 && o2.on); return { id: t.id, p: [t.p.x, t.p.y, t.p.z], channel: both ? 'ft' : '', min: both ? .5 : 0, dir: t.on ? (state.ft ? 'gt' : 'lt') : (state.ft ? 'lt' : 'gt'), on: !!both }; });
      }
    };
  }
  /* ---- stats: one pool of cubes on one base; each state is a formation, the cubes fly between them. The formations are weights (w1, w2), a cube flies at its own moment (a stagger), the chosen group's weight is g0..g3 ---- */
  {
    const GROUPS = data.ArkStatsScale.operations(data.ArkStatsHighlights.operations.rows), gs = GROUPS.map((_, i) => 'g' + i);
    const sKeys = [{ s: 'now', c: '' }, ...GROUPS.map((g) => ({ s: 'capabilities', c: g.id })), { s: 'ceiling', c: '' }];
    const stateOf = (v) => (v.w2 > .5 ? 'ceiling' : v.w1 > .5 ? 'capabilities' : 'now');
    const rowOf = (q, i) => ({ name: 's' + i, id: q.s + '|' + q.c, arg: { s: q.s, c: q.c }, set: { w1: q.s === 'capabilities' ? 1 : 0, w2: q.s === 'ceiling' ? 1 : 0, ...Object.fromEntries(gs.map((g, j) => [g, q.s === 'capabilities' && GROUPS[j].id === q.c ? 1 : 0])) }, from: {} });
    const TAUP = 140, sunk = {};
    const ov = (v) => ({ followers: { 0: gs.map((g) => v[g] || 0) } });
    out.stats = {
      stage: 'stats', key: 's', key2: 'c', gated: ['st0'],
      chans: { w1: { lo: 0, hi: 1, rest: 0, N: 1 }, w2: { lo: 0, hi: 1, rest: 0, N: 1 }, ...Object.fromEntries(gs.map((g) => [g, { lo: 0, hi: 1, rest: 0, N: 2 }])), present: PRESENT },
      states: sKeys.map((q, i) => ({ ...rowOf(q, i), alias: q.s === 'capabilities' && q.c === GROUPS[0].id ? ['capabilities|'] : [] })), follow: gs, tau: TAUP, lead: 0, span: { w1: 1530, w2: 1530 }, linear: ['w1', 'w2'],
      /* the stage is read at rest: a state's formation is taken at once (the stage's own snap, a weight of nothing), then drawn at the weight */
      setStage: (def, st) => def.set({ ...st.arg, pt: 56, pb: 0 }, 0),
      frameOf: (asp) => ({ w: asp * 1000, h: 1112 }),
      prepare({ h, spec }) {
        h.k.reduced = true;   /* a settled stage: the labels are up and the cubes stand (stats-stage.js arrived() and the flight both read k.reduced) */
        sourceGuard(stageSrc('stats-stage.js'), ['DUR = 1150', 'delay[q] = snap || q === BASE ? 0 : 60 + (q / N) * 320;', 'var g = grow(w, .05, .7);'], 'the cubes\' flight');
        const n = h.sets[0].n - 1;
        spec.staggers = ['w1', 'w2'].map((axis) => ({ part: 'st0', axis, T: 60 + 320 + 1150, dur: 1150, d0: 60, step: 320 / n, curve: 5 }));
        /* the camera's padding gap: the stage fits the page's box less the page's own top and bottom plus a gap of its own; read by asking at two paddings */
      },
      snap({ h, def, values, out: o_, collect, lineEntry }) {
        const st = stateOf(values), q = sKeys.find((k) => k.s === st && (st !== 'capabilities' || true));
        def.set({ s: st, c: st === 'capabilities' ? (GROUPS[gs.findIndex((g) => values[g] > .5)] || GROUPS[0]).id : '', pt: 56, pb: 0 }, 0);
        h.evaluate('stats', { ...ov(values), w: values.present });
        collect();
        /* a cube the formation does not need sinks to nothing (a size of 1e-4): it is a hidden row, so the rows around it fill in its place and it shrinks where it stands */
        const part = o_.fixed.get('st0'), key = st + (values.g0 > .5 ? 'a' : '');
        if (values.present > .99) sunk[key] = part.rows.map((r) => Math.hypot(r[0], r[1], r[2]) < 5e-4);
        if (!sunk[key]) { h.evaluate('stats', { ...ov(values), w: 1 }); const full = []; for (const q of h.sets) if (q.id === 0) for (let j = 0; j < q.n; j++) full.push(!q.placed[j] || Math.hypot(q.base[j].e[0], q.base[j].e[1], q.base[j].e[2]) < 5e-4); sunk[key] = full; }
        part.rows.forEach((r, i) => { if (sunk[key][i]) { part.rows[i] = h.NULL(); part.cols[i] = null; } });
        const occ = new Map();
        for (const c of h.lineCalls) { const key = c.site, at = occ.get(key) || 0; occ.set(key, at + 1); o_.lines.push(lineEntry(c, c.site, at)); }
      },
      settled: ov,
      padgap(h, def, cam) {
        def.set({ s: 'now', c: '', pt: 0, pb: 0 }, 0);
        const t = h.target('stats', 1, { w: 200, h: 1000 }), A = cam.fit.w / (2 * TAN), ph = 200 * t.dist / A;
        if (Math.abs(A / (200 / ph) - t.dist) > 1e-6 * t.dist) throw new Error('the stats camera is not width limited at a box 200 wide, so its gap cannot be read');
        return r4(1000 - ph);
      },
      spots: ({ h, st, state }) => {
        def_set(h, st);
        h.evaluate('stats', { ...ov(state), w: 1 });
        return h.tagsOf('stats', ov(state)).filter((t) => t.on).map((t) => ({ id: t.id, p: [t.p.x, t.p.y, t.p.z], channel: '', min: 0, on: true }));
      }
    };
    const def_set = (h, st) => h.stages.stats.set({ ...st.arg, pt: 56, pb: 0 }, 0);
  }
  /* ---- download: the network re-posed for each of five steps (the rise of each ring, the build clock held at a point, the rings lit), and one glass lens over the kernel ---- */
  {
    const rings = o.cast.rings.filter((r) => r.kind !== 'hub' && o.N.KIND[r.i] !== 'hub').map((r) => r.i), rr = rings.map((i) => 'rr' + i);
    const steps = [0, 1, 2, 3, 4], lens = { k: { lo: 0, hi: 4, rest: 0, N: 4 } };
    let rises = null, delays = null, riseh = null;
    out.download = {
      stage: 'download', key: 's', stateView: 'download',
      chans: { ...lens, ...Object.fromEntries(rr.map((n) => [n, { lo: 0, hi: 1, rest: 0, N: 1 }])), present: PRESENT },
      states: steps.map((n) => ({ name: 's' + n, arg: { s: n }, set: { k: n }, from: {} })),
      span: { k: 1500 }, follow: rr, tau: 220, lead: 0, beats: true, spots: () => [],   /* the window names nothing in 3D */
      /* the lens at a step (its height and size settle by the stage's own approach), read once the stage has rested there */
      snap({ h, def, values, out: o_, collect, parts }) {
        const k = Math.round(values.k); def.set({ s: k }, 1);
        h.evaluate('download', { w: values.present, view: 'download', settle: 6000, now: 0 });
        collect();
        /* the plate fades with the view's weight (glass-kit.js show: its opacity follows the view) */
        for (const [name, q] of o_.fixed) if (parts[name] && parts[name].kind === 'glassmesh') q.rows.forEach((r) => { if (r[15] >= 0) r[15] *= values.present; });
      },
      prepare({ h, def, spec }) {
        /* every step's rise of each ring, once the stage has rested at it; the stage's own wait for each ring (its rank in the wave) from the first moment the ring moves */
        rises = []; riseh = {};
        steps.forEach((n) => { def.set({ s: n }, 1); h.evaluate('download', { w: 1, view: 'download', settle: 8000, now: 0 }); rises[n] = rings.map((i) => Math.round(h.W.ringRise[i] * 1e4) / 1e4); });
        rings.forEach((i, q) => { riseh[i] = Math.round(h.W.riseH(h.W.ringList[i]) * 1e4) / 1e4; });
        def.set({ s: 0 }, 1); h.evaluate('download', { w: 1, view: 'download', settle: 8000, now: 0 });
        h.state.clock += 1000; def.set({ s: 4 }, 1);   /* the step is chosen at this moment: each ring waits its own number of ms from here */
        const t0 = h.state.clock; delays = {}; const first = {};
        for (let t = 1; t <= 1200; t++) { h.evaluate('download', { w: 1, view: 'download', now: t0 + t }); rings.forEach((i, q) => { if (first[i] == null && Math.abs(h.W.ringRise[i]) > 1e-9) first[i] = t - 1; }); }
        rings.forEach((i, q) => { delays['rr' + i] = first[i] == null ? 0 : first[i]; });
        spec.delay = delays;
        spec.states.forEach((st, n) => { rings.forEach((i, q) => { st.set['rr' + i] = rises[n][q]; }); });
        spec.chans.k.rest = 0; rr.forEach((nm) => { spec.chans[nm].rest = spec.states[0].set[nm]; });
        spec.extraSet = (n) => Object.fromEntries(rings.map((i) => ['rh' + i, riseh[i]]));
        def.set({ s: 0 }, 1);
      }
    };
  }
  return out;
}

const signedAreaOf = (l) => l.reduce((a, p, i) => { const q = l[(i + 1) % l.length]; return a + (p[0] * q[1] - q[0] * p[1]) / 2; }, 0);

/* what a touch on each instance of a touchable set says and does in a state: the stage's own label and its onPick, asked of each instance with the hook it calls recorded (stagePick(kind, id)).
   An instance whose onPick calls nothing is not touchable in this state: it has no line, and the page's touch does nothing on it. */
function pickLines(h, code, view, st, picks) {
  for (const s of h.sets) {
    if (typeof s.onPick !== 'function' || s.n < 2) continue;
    for (let j = 0; j < s.n; j++) {
      const lab = typeof s.label === 'function' ? s.label(j) : { name: '', act: '' }, at = h.stagePicks.length;
      s.onPick(j);
      if (h.stagePicks.length > at) { const q = h.stagePicks[at]; picks.push(['pickp', view, st.name, code + s.id, j, lab.name, lab.act, 'stagePick', q.kind, q.id, 0]); }
    }
  }
}

/* the labels of a stage that wait for a channel: each tag is on or off at the channel's rest; a tag that comes on as a channel rises is written with that channel and the value it passes
   (found by halving, 40 times). probe(name, value) is the stage's overrides with that one channel at the value and every other at nothing */
export function labelsByChannel(h, stage, channels, probe, base) {
  const none = h.tagsOf(stage, probe(null, 0, base)), list = none.map((t) => ({ id: t.id, p: [t.p.x, t.p.y, t.p.z], channel: '', min: 0, on: !!t.on }));
  for (const c of channels) {
    const hi = h.tagsOf(stage, probe(c, 1, base));
    hi.forEach((t, i) => {
      if (!t.on || none[i].on) return;
      let lo = 0, up = 1; for (let q = 0; q < 40; q++) { const mid = (lo + up) / 2; if (h.tagsOf(stage, probe(c, mid, base))[i].on) up = mid; else lo = mid; }
      list[i].channel = c; list[i].min = Math.round((lo + up) / 2 * 1e4) / 1e4; list[i].on = true;
    });
  }
  return list;
}

/* the rings a beat lights: the stage's own predicate, asked of every ring, and whether it lights the computers too */
function W_focus(h, cast, N) {
  const f = h.W.focused;
  if (!f) return { rings: null, cubes: false };
  if (!f.which) return { rings: null, cubes: !!f.cubes };
  const rings = cast.rings.filter((r) => f.which(r.i, N.KIND[r.i])).map((r) => r.i);
  return { rings, cubes: !!f.cubes };
}

/* the camera of the stage at its current state, as a view record: the distance model dist = max(A / aspect, B) fitted from the stage's own answers and checked at four more aspects.
   The aim's x may move with the aspect (the movie pushes the grid aside by a share of the half width the camera sees): that share is read the same way. */
function cameraOf(h, name, tan, frameOf) {
  const at = (asp) => h.target(name, asp, frameOf && frameOf(asp)), lo = at(.2), hi = at(20), A = lo.dist * .2, B = hi.dist;
  let push = 0, a0 = hi.aim.x;
  const span = tan * (20 * B - .2 * lo.dist);
  if (Math.abs(hi.aim.x - lo.aim.x) > 1e-9) { push = (hi.aim.x - lo.aim.x) / span; a0 = hi.aim.x - push * tan * 20 * B; }
  for (const asp of [.7, 1, 1.6, 2.4]) {
    const t = at(asp), d = Math.max(A / asp, B), ax = a0 + push * tan * asp * d;
    if (Math.abs(t.dist - d) > 1e-6 * Math.max(1, d) || Math.abs(t.aim.x - ax) > 1e-6 * Math.max(1, Math.abs(ax))) throw new Error('the stage ' + name + ' answers a camera at aspect ' + asp + ' that a distance of max(A / aspect, B) and a push of the aim cannot give (dist ' + t.dist + ' against ' + d + ', aim x ' + t.aim.x + ' against ' + ax + '), so its views cannot be written as fits');
    if (Math.abs(t.aim.y - hi.aim.y) > 1e-9 || Math.abs(t.aim.z - hi.aim.z) > 1e-9 || t.elev !== hi.elev || t.yaw !== hi.yaw || t.tilt !== hi.tilt || t.n !== hi.n) throw new Error('the stage ' + name + ' moves its aim, elevation, yaw, tilt or back with the aspect; a view record cannot say that');
  }
  return { aim: [a0, hi.aim.y, hi.aim.z], fit: { w: A * 2 * tan, h: B * 2 * tan, fill: 1 }, push, elev: hi.elev, yaw: hi.yaw, tilt: hi.tilt, back: hi.n };
}

/* ---------- rows of the recorded forms ----------
   A frame's rows come with the colour each was tinted (weights on the tones, not yet an index): a colour that moves with a channel (the chosen plate's tint, the chosen layer's light) is a
   line through colour space, and the row carries it as a lerp between two fixed colours by a mix the sampler can follow. The ends are found once, over every frame, by fitColours(). */
const BLOCK_SHADOW = (s) => (s.opts && s.opts.shadow === false ? 0 : 1);
function setPart(parts, name, view, kind, args, count) {
  const was = parts[name];
  if (was && (was.kind !== kind || was.args.join() !== args.join() || was.count !== count)) throw new Error('part ' + name + ' is drawn as two different things (' + was.kind + ' and ' + kind + '), so its rows cannot be one list');
  parts[name] = { view, kind, args, count };
}
/* a stored part: rows[i] with slots 12..14 empty where cols[i] holds the colour, or filled where cols[i] is null */
const keep = (fixed, name, rows, cols) => fixed.set(name, { rows, cols });
const bare = (m, alpha) => row(m, 0, 0, 0, alpha);
function rowsOfSet(h, s, code, fixed, parts, view) {
  const name = code + s.id;
  if (s.kind === 'block') {
    const g = h.geoOf(s.geo);
    let kind, args, xf = (m) => m;
    if (g && g.type === 'bevel') {
      kind = 'block'; args = [g.w, g.h, g.d, r4(g.r), BLOCK_SHADOW(s)];
      /* a set whose stage gave its material numbers (stats: matte) carries them: metal, rough, coat, coat roughness, environment */
      const mt = s.mesh && s.mesh.material;
      if (mt && mt.roughness != null) args.push(mt.metalness || 0, mt.roughness, mt.clearcoat || 0, .14, mt.envMapIntensity == null ? .75 : mt.envMapIntensity);
    }
    else if (g && g.type === 'CylinderGeometry') {
      /* CylinderGeometry(r, r, height, segments) turned by its ops: the unit prism has radius 1 and height 1 along y, so the row is the set's matrix, the turn, and (r, height, r) */
      const [rt, , ht, seg] = g.args; kind = 'cyl'; args = [seg];
      let turn = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
      for (const op of g.ops) { if (op[0] === 'rotateX') turn = mul(RX(op[1]), turn); else throw new Error('a cylinder is turned by ' + op[0] + ', which the grammar rows do not carry'); }
      xf = (m) => chain(m, turn, S(rt, ht, rt));
    } else if (g && g.type === 'SphereGeometry') {
      /* a small lit sphere (the nodes' status lights, concept-stages.js lights): a lit unit sphere under the set's matrix (the glow spheres of the identity steps are another kind: additive, unlit) */
      kind = 'sphere'; args = [];
    } else throw new Error('the set ' + name + ' is a block of a geometry (' + (g && g.type) + ') the recorder cannot write');
    /* a set the stage made translucent (home-descent.js glassSet: transparent, opacity .78, a full clear coat) is glass: its rows carry the opacity */
    const m = s.mesh && s.mesh.material, opacity = m && m.transparent && m.opacity != null && m.opacity < 1 ? m.opacity : 1;
    if (opacity < 1) { if (kind !== 'block') throw new Error('the set ' + name + ' is a translucent ' + kind + ', which only a block can be'); kind = 'glass'; args = args.slice(0, 4); }
    const rows = [], cols = [];
    for (let j = 0; j < s.n; j++) {
      if (!s.shown || s.visible === false || !s.placed[j]) { rows.push(h.NULL()); cols.push(null); continue; }
      rows.push(bare(xf(s.base[j].e), opacity)); cols.push(s.color[j] || Col.tone('strong'));
    }
    setPart(parts, name, view, kind, args, s.n); keep(fixed, name, rows, cols);
    if (typeof s.onPick === 'function' && s.n > 1) parts[name].pick = true;
    if (parts[name].pick) parts[name].lift = s.opts && s.opts.lift != null ? s.opts.lift : BLOCK_LIFT;   /* the hover rule of ring-kit.js blockSet: a block lifts by `lift` of its own height under the pointer */   /* the stage lets the pointer touch this set (cubes.onPick): its instances are pickable */
  } else if (s.kind === 'tile') {
    const kinds = new Set(s.list.map((t) => t.kind));
    if (kinds.size !== 1) throw new Error('the tile set ' + name + ' holds tiles of more than one kind (' + [...kinds].join(',') + '), so its body cannot be one part');
    const kind = [...kinds][0], glass = h.NODE.has(kind), bodyTone = Col.tone(kind);
    const shadow = s.opts && s.opts.noShadow ? 0 : 1, body = [], bcols = [], links = [], lcols = [];
    for (let j = 0; j < s.n; j++) {
      if (!s.shown || !s.placed[j]) { body.push(h.NULL()); bcols.push(null); } else {
        body.push(bare(chain(s.base[j].e, T(0, MID, 0), S(s.stretch[j], 1, 1)), glass ? .34 : 1)); bcols.push(s.color[j] || bodyTone);
      }
      if (s.list[j].link) {
        if (!s.shown || !s.linkPlaced[j] || s.linkLen[j] <= .01) { links.push(h.NULL()); lcols.push(null); }
        else { links.push(row(chain(s.linkBase[j].e, T(0, MID, -.03), S(s.linkLen[j], 1, 1)), TONES.other, TONES.canvas, .45, 1)); lcols.push(null); }   /* the link: other, leaned to canvas by .45, as the home frame's links */
      }
    }
    setPart(parts, name, view, glass ? 'glass' : 'block', [1, 1, .28, .028, shadow], s.n); keep(fixed, name, body, bcols);
    if (links.length) { setPart(parts, name + 'l', view, 'block', [1, .24, .12, .012, 1], links.length); keep(fixed, name + 'l', links, lcols); }
    /* a glass tile's lit edge (ring-kit.js tone(): the emissive map is white where a face meets its edge, 7 of 256 wide, and the material's emissive is the kind's own colour at 1.5): four bars round each
       of the two faces, in the kind's colour, added to the glass. The tile's panel is 1 x 1 x .28 (half depth .14 on each face). */
    if (glass) {
      const EW = EDGE_W, rows = [], ecols = [];
      for (let j = 0; j < s.n; j++) {
        for (const z of [HALF_D_G, -HALF_D_G]) for (let q = 0; q < 4; q++) {
          if (!s.shown || !s.placed[j]) { rows.push(h.NULL()); ecols.push(null); continue; }
          const vert = q > 1, off = (q % 2 ? -1 : 1) * (.5 - EW / 2);
          rows.push(row(chain(s.base[j].e, T(0, MID, 0), S(s.stretch[j], 1, 1), T(vert ? off : 0, vert ? 0 : off, z), S(vert ? EW / s.stretch[j] : 1, vert ? 1 : EW, .004)), 0, 0, 0, EDGE_GAIN * EDGE_SEEN)); ecols.push(bodyTone);
        }
      }
      setPart(parts, name + 'e', view, 'glowcube', [], rows.length); keep(fixed, name + 'e', rows, ecols);
    }
    /* the glyph engraved on each tile (ring-kit.js tileSet commit: bars on both faces, scaled by the tile's glyph weight g in height and depth, hidden under .01): dark bars, canvas leaned to other by .12 */
    const gl = [], gcols = [], dark = Col.tone('canvas').lerp(Col.tone('other'), GLYPH_MIX), per = s.list.map((t) => (GLYPH_BARS[t.glyph || 'iii'] || []).length * 2), total = per.reduce((x, y) => x + y, 0);
    if (total) {
      for (let j = 0; j < s.n; j++) {
        const bars = GLYPH_BARS[s.list[j].glyph || 'iii'] || [], g = s.glyph[j];
        for (const b of bars) for (const z of [HALF_D_G, -HALF_D_G]) {
          if (!s.shown || !s.placed[j] || g < .01) { gl.push(h.NULL()); gcols.push(null); continue; }
          gl.push(bare(chain(s.base[j].e, T(b[0], LIFT + .48 + b[1], z), RZ(b[4] || 0), S(b[2], b[3] * g, GLYPH_DEPTH * g)), 1)); gcols.push(dark);
        }
      }
      setPart(parts, name + 'g', view, 'block', [1, 1, 1, .005, 0], total); keep(fixed, name + 'g', gl, gcols);
    }
  } else if (s.kind === 'edge') {
    const rows = [], tone = TONES[s.tone] == null ? TONES.signal : TONES[s.tone];
    for (let j = 0; j < s.n; j++) rows.push(!s.shown || !s.placed[j] ? h.NULL() : row(s.base[j].e, tone, 0, 0, s.gain));
    setPart(parts, name, view, 'glowcube', [], s.n); keep(fixed, name, rows, rows.map(() => null));
  } else if (s.kind === 'instanced') {
    /* light that is drawn, not lit (home-descent.js lightSet): additive boxes (the edges, and the shell of a block whose back faces glow) and spheres (beads) */
    const g = h.geoOf(s.geo), kind = g && g.type === 'SphereGeometry' ? 'glowsphere' : g && (g.type === 'BoxGeometry' || g.type === 'bevel') ? 'glowcube' : null;
    if (!kind) throw new Error('the instanced set ' + name + ' is a geometry (' + (g && g.type) + ') the recorder cannot write');
    const rows = [], cols = [];
    for (let j = 0; j < s.n; j++) {
      /* a light the stage hid is placed as nothing and never tinted in that frame: it is not a white light, it is no light */
      if (!s.shown || s.visible === false || !s.placed[j] || !s.color[j]) { rows.push(h.NULL()); cols.push(null); continue; }
      rows.push(bare(s.base[j].e, 1)); cols.push(s.color[j]);
    }
    /* a shell drawn on its back faces only (home-descent.js lightSet(geo, n, THREE.BackSide): the glow inside a glass block) says so; the renderer culls the front faces */
    setPart(parts, name, view, kind, s.mat && s.mat.side === 1 ? ['back'] : [], s.n); keep(fixed, name, rows, cols);
  }
}
const plateRowOf = (m, w, h) => row(chain(m.e, RX(PI / 2), S(w, 1, h)), TONES.text, 0, 0, 1);
/* the words of a plate: its size, how its canvas is tinted (a face's alpha map is lines in one tone or a lerp of two; a plate keeps its own colours) and the 2D calls that draw it, for the page to replay */
function plateWords(part, w, h, ops, tint, srcW) {
  const t = tint ? Object.entries(tint.parts()) : [];
  if (tint && (t.length > 2 || Math.abs(t.reduce((a, [, x]) => a + x, 0) - 1) > 1e-9)) throw new Error('the alpha-map plate ' + part + ' is tinted by a colour that is not one tone or a lerp of two, which a plate line cannot say');
  const a = t[0], b = t[1] || t[0];
  return ['plate', part, 'ops', r4(w), r4(h), tint ? 'alpha' : 'plain', a ? a[0] : '-', b ? b[0] : '-', b && t[1] ? r4(b[1]) : 0, srcW, ...opsToWords(ops)];
}
function rowsOfPlate(p, code, fixed, parts, view, h, plateList) {
  const name = code + 'p' + p.id;
  setPart(parts, name, view, 'text', [], 1);
  keep(fixed, name, [p.m ? plateRowOf(p.m, p.w, p.h) : h.NULL()], [null]);
  plateList.set(name, plateWords(name, p.w, p.h, p.ops, null, 512));
}
/* meshes the stage put in the scene (the resolve stage's cube and its four rule faces): at their group's place, turn and size */
function rowsOfMeshes(h, code, fixed, parts, view, plateList) {
  let n = 0;
  const world = (obj, parentM) => {
    const m = new M4().compose(obj.position, new Quat().setFromEuler(obj.rotation), obj.scale);
    return parentM ? new M4().copy(parentM).multiply(m) : m;
  };
  const walk = (obj, parentM, vis) => {
    const m = world(obj, parentM), on = vis && obj.visible;
    if (obj.type === 'LineSegments' && obj.geometry && obj.geometry.type === 'EdgesGeometry') {
      /* the outline of a box (resolvers.js: a resolver whose grammar is not specified yet stands hollow): the edges of a unit box at the stage's own matrix, in the material's colour and opacity */
      const name = code + 'm' + n++, mat = obj.matrixAutoUpdate === false ? obj.matrix : m;
      if (!on && !parts[name]) return;
      setPart(parts, name, view, 'wire', [], 1);
      keep(fixed, name, [on ? bare(mat.e, obj.material.opacity == null ? 1 : obj.material.opacity) : h.NULL()], [on ? obj.material.color.clone() : null]);
      return;
    }
    if (obj.type === 'Mesh') {
      const name = code + 'm' + n++, g = obj.geometry;
      /* a mesh that is not shown in the first frame read, and was never written, is one the view never shows (the home logo's rings, the beam, the dust, which a stage draws from another file's clock) */
      if (!on && !parts[name]) { for (const c of obj.children) walk(c, m, on); return; }
      if (g && g.type === 'bevel') {
        /* a mesh with a material of its own (stages.js resBody: roughness .45, clear coat .35 at .3, environment .8) is drawn with it, as the blocks of the identity views are */
        const mt = obj.material || {}, own = mt.roughness != null ? [mt.metalness || 0, mt.roughness, mt.clearcoat || 0, mt.clearcoatRoughness || 0, mt.envMapIntensity == null ? 1 : mt.envMapIntensity] : [];
        setPart(parts, name, view, 'block', [g.w, g.h, g.d, r4(g.r), 1, ...own], 1);
        keep(fixed, name, [on ? bare(m.e, 1) : h.NULL()], [on ? obj.material.color.clone() : null]);
      } else if (g && g.type === 'PlaneGeometry' && obj.material.alphaMap && obj.material.blending !== 2) {
        const [w, hh] = g.args, cv = obj.material.alphaMap.args[0], ops = cv._g ? cv._g.ops : [];
        setPart(parts, name, view, 'text', [], 1);
        keep(fixed, name, [on ? plateRowOf(m, w, hh) : h.NULL()], [null]);
        plateList.set(name, plateWords(name, w, hh, ops, obj.material.color, cv.width));
      } else if (g && g.type === 'TubeGeometry' && obj.material.uniforms && obj.material.uniforms.reveal) {
        /* the proof line: a tube along a curve whose shader draws it up to `reveal`. One control row carries the reveal; one row follows for each straight piece of the curve, with the share of the
           line it spans, its colour (green where it leaves the logo, ember along the chain, a white core) and its size. The page cuts each piece to the reveal. */
        const [curve, segs, radius] = g.args, U = obj.material.uniforms, pts = Array.from({ length: segs + 1 }, (_, i) => curve.getPointAt(i / segs));
        const white = new Col(1, 1, 1), sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
        const colourAt = (u) => { const c = U.cA.value.clone().lerp(U.cB.value, sm(.04, .16, u)).lerp(white, U.core.value); return c.multiplyScalar(U.gain.value * U.alpha.value); };   /* the shader: mix(mix(cA, cB, smoothstep(.04, .16, u)), white, core) x gain, blended by alpha */
        const pieces = [];   /* [a, c, u0, u1, colourKey] with collinear neighbours of one colour joined */
        for (let i = 0; i < segs; i++) {
          const a = pts[i], c = pts[i + 1], u0 = i / segs, u1 = (i + 1) / segs, key = JSON.stringify(colourAt((u0 + u1) / 2).w), last = pieces[pieces.length - 1];
          const d = [c.x - a.x, c.y - a.y, c.z - a.z], len = Math.hypot(...d);
          if (len < 1e-9) continue;
          if (last && last.key === key) { const e = last.dir, dot = (d[0] * e[0] + d[1] * e[1] + d[2] * e[2]) / len; if (dot > 1 - 1e-9) { last.c = c; last.u1 = u1; continue; } }
          pieces.push({ a, c, u0, u1, key, dir: d.map((x) => x / len), col: colourAt((u0 + u1) / 2) });
        }
        /* a row is the piece's two ends in the matrix slots, then the share of the line it starts and ends at, and its width; the colour comes from the fit */
        const rows = [on ? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, U.reveal.value] : h.NULL()], cols = [null];
        for (const q of pieces) { rows.push([q.a.x, q.a.y, q.a.z, q.c.x, q.c.y, q.c.z, q.u0, q.u1, radius * 2, 0, 0, 0, 0, 0, 0, 1]); cols.push(q.col); }
        setPart(parts, name, view, 'trail', [], rows.length); keep(fixed, name, rows, cols);
      } else if (g && g.type === 'glassplate') {
        /* glass-kit.js plate: a shape with holes extruded and laid flat (rotateX -90 degrees), centred; its colour and opacity are the stage's, the fade with the view's weight is the stage weight's */
        setPart(parts, name, view, 'glassmesh', [], 1);
        keep(fixed, name, [on ? row(chain(m.e, RX(-PI / 2)), TONES.canvas, 0, 0, obj.material.opacity) : h.NULL()], [on ? obj.material.color.clone() : null]);
        if (!shapesOut.some((q) => q.part === name)) shapesOut.push({ view, part: name, shape: g.shape });
      } else if (g && g.type === 'PlaneGeometry' && obj.material.blending === 2) {
        /* a glow laid on the floor (home-descent.js floorGlow): the kernel's pool kind, a square of its width, tinted by the material's colour */
        const w = g.args[0];
        setPart(parts, name, view, 'pool', [], 1);
        keep(fixed, name, [on ? bare(chain(T(obj.position.x, obj.position.y, obj.position.z), S(w, 1, w)), 1) : h.NULL()], [on ? obj.material.color.clone() : null]);
      } else throw new Error('the mesh ' + name + ' has a geometry (' + (g && g.type) + ') the recorder cannot write');
    }
    for (const c of obj.children) walk(c, m, on);
  };
  for (const root of h.sceneObjs) walk(root, null, true);
  /* the trace's ember: a point light under the lit record block (home-descent.js k.lights.ember). The row is the light's place; its alpha is the light's strength as a share of the look's emberlight
     (the harness runs with the knob at 1), its colour the ember tone. The look's own number and reach are read by the renderer. */
  const em = h.k.lights && h.k.lights.ember;
  if (em && view === 'trace') {
    const name = code + 'light', on = em.intensity > 1e-6;
    setPart(parts, name, view, 'plight', [], 1);
    keep(fixed, name, [on ? bare([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, em.position.x, em.position.y, em.position.z, 1], em.intensity) : h.NULL()], [on ? Col.tone('ember') : null]);
  }
}

/* ---------- the groups' blobs and records (PORT.md batch 3), as the identity group writes its own (world-id-scene.mjs idRecords). One group for each view, named by the view, so a visit fetches the rows of the one view it opens ---------- */
export function howRecords(scene, o) {
  const { num, sha: shaOf } = o, clean = (s) => String(s == null ? '' : s).replace(/[\t\r\n]+/g, ' ').trim();
  const camText = (name, c) => `WVIEW-R${name}-X${num(r4(c.aim[0]))}-Y${num(r4(c.aim[1]))}-Z${num(r4(c.aim[2]))}-D${num(r4(c.fit.w))}-J${num(r4(c.fit.h))}-V${num(c.fit.fill)}-H${num(c.elev)}-U${num(c.yaw)}-T${num(c.tilt)}-B${num(c.back)}`;
  const out = [];
  for (const view of HOW_VIEWS.filter((x) => scene.views[x])) {
    const v = scene.views[view], spec = v.spec, G = view, rec = [], buf = [], layout = [], files = [], lines = [];   /* the group's records live under the view's own name */
    let atByte = 0;
    const mine = Object.keys(scene.parts).filter((p) => scene.parts[p].view === view);
    const gated = new Set(v.gates.map((q) => q.part)), { present: _p, ...noWeight } = v.chans;
    const sampled = { ...sampleParts(v.pose, v.chans, v.rest, mine.filter((m) => !gated.has(m))), ...(gated.size ? sampleParts(v.pose, noWeight, v.rest, mine.filter((m) => gated.has(m))) : {}) };
    for (const name of mine) {
      const list = sampled[name];
      const pr = partRecords(G, view, name, list, atByte, num, scene.parts[name].pick ? 1 : 0);
      rec.push(...pr.rec); buf.push(pr.rows, pr.idx); atByte += pr.bytes;
      layout.push({ view, name, pool: pr.pool, frames: pr.frames, bytes: pr.bytes });
    }
    /* the views: one record when every state has the same camera, else one per state named by the state's number (`movie4`) and the first as the view's own */
    const same = v.cams.every((c) => JSON.stringify(c) === JSON.stringify(v.cams[0]));
    rec.push(camText(view, v.cams[0]));
    if (!same) spec.states.forEach((st, i) => rec.push(camText(view + st.name.slice(1), v.cams[i])));
    v.cams.forEach((c, i) => { if (c.push) rec.push(`WSET-R${view}${spec.states[i].name.slice(1)}-I0-Npush-V${num(r4(c.push))}`); });
    spec.states.forEach((st, i) => {
      rec.push(`WSTATE-R${view}-I${i}-N${st.name}`);
      rec.push(`WSET-R${view}-I${i}-Nn-V${num(v.cams[i].back)}`, `WSET-R${view}-I${i}-Np-V1`, `WSET-R${view}-I${i}-Nlead-V${spec.lead || 0}`);
      if (spec.flight) rec.push(`WSET-R${view}-I${i}-Nflight-V${spec.flight[i]}`);
      for (const [c, d] of Object.entries(v.chans)) if (c !== 'present') rec.push(`WSET-R${view}-I${i}-N${c}-V${num(st.set[c] != null ? st.set[c] : d.rest)}`);
      if (spec.extraSet) for (const [nm, x] of Object.entries(spec.extraSet(i))) rec.push(`WSET-R${view}-I${i}-N${nm}-V${num(x)}`);
      if (v.builds[i]) rec.push(`WSET-R${view}-I${i}-Nbuildms-V${num(v.builds[i].ms)}`, `WSET-R${view}-I${i}-Nbuilddur-V${num(v.builds[i].dur)}`);
      if (spec.swat != null) rec.push(`WSET-R${view}-I${i}-Nswat-V${num(spec.swat)}`);   /* the stage weight at which an entry sweep starts */
      if (spec.gap != null) rec.push(`WSET-R${view}-I${i}-Npad-V1`, `WSET-R${view}-I${i}-Npadgap-V${num(spec.gap)}`);
      for (const [c, x] of Object.entries(st.from || {})) rec.push(`WSET-R${view}-I${i}-N${c}from-V${num(x)}`);
      for (const c of spec.once || []) rec.push(`WSET-R${view}-I${i}-N${c}once-V1`);   /* a channel that plays on the first visit only */
      for (const [c, ms] of Object.entries(spec.step || {})) rec.push(`WSET-R${view}-I${i}-N${c}step-V${ms}`);
      for (const [c, ms] of Object.entries(spec.delay || {})) rec.push(`WSET-R${view}-I${i}-N${c}delay-V${ms}`);
      for (const [c, ms] of Object.entries(spec.fall || {})) rec.push(`WSET-R${view}-I${i}-N${c}fall-V${ms}`);
      const a = v.anchors[i];
      rec.push(`WSET-R${view}-I${i}-Nax-V${num(a.at[0])}`, `WSET-R${view}-I${i}-Nay-V${num(a.at[1])}`, `WSET-R${view}-I${i}-Naz-V${num(a.at[2])}`, `WSET-R${view}-I${i}-Nsize-V${num(a.size)}`);
    });
    for (const [c, ms] of Object.entries(spec.span || {})) rec.push(`WSPAN-R${view}-N${c}-D${ms}`);
    for (const c of Object.keys(v.chans)) {
      if (c === 'present') continue;
      if ((spec.follow || []).includes(c)) {   /* a follower of the chosen layer: an exponential approach, tau 160 ms (concept-stages.js follower(3, 160)) */
        rec.push(`WSPAN-R${view}-N${c}-D${Math.round(6.3 * (spec.tau || 160))}`);
        for (let q = 0; q <= 12; q++) { const u = q / 12; rec.push(`WCHAN-R${view}-N${c}-A${Math.round(u * 1000)}-V${q === 12 ? 1 : num(Math.round((1 - Math.exp(-6.3 * u)) * 1e4) / 1e4)}-L0`); }
      } else if ((spec.linear || []).includes(c)) rec.push(`WCHAN-R${view}-N${c}-A0-V0-L0`, `WCHAN-R${view}-N${c}-A1000-V1-L0`);   /* a clock the rows ease for themselves (a stagger) */
      else rec.push(`WCHAN-R${view}-N${c}-A0-V0-L0`, `WCHAN-R${view}-N${c}-A1000-V1-L5`);   /* a tween eases in and out (ring-kit.js ease.inOut) */
    }
    rec.push(`WCHAN-R${view}-Npresent-A0-V0-L0`, `WCHAN-R${view}-Npresent-A1000-V1-L5`, `WSPAN-R${view}-Npresent-D1000`);
    for (const [dir, a, b] of [[1, .35, 1], [0, 0, .7]]) rec.push(`WCHAN-R${view}-Np-I${dir}-A0-V0-L0`, `WCHAN-R${view}-Np-I${dir}-A${Math.round(a * 1000)}-V0-L0`, `WCHAN-R${view}-Np-I${dir}-A${Math.round(b * 1000)}-V1-L5`, `WCHAN-R${view}-Np-I${dir}-A1000-V1-L0`);
    /* the plates with holes: each shape the stage made, flattened into its outline and holes and pulled into one mesh, centred (glass-kit.js plate, then geometry.center()) */
    for (const sh of scene.shapes.filter((q) => q.view === view)) {
      const outline = flatten(sh.shape), loops = sh.shape.holes.map((hl) => { const l = flatten(hl); return signedAreaOf(l) > 0 ? l.reverse() : l; });
      const st = extrudeLoops(outline, loops, .12 + .06), b = writeBlob(st, boundsOf(st.pos), [{ first: 0, count: st.idx.length, rgba: [255, 255, 255, 255], slot: 255, metal: 0, rough: 255 }]), mcid = shaOfBytes(b.bytes);
      files.push({ name: mcid + '.mesh', bytes: b.bytes }); rec.push(`WSHAPE-R${view}-M${sh.part}-C${mcid}-A${b.bytes.length}`);
    }
    const bytes = Buffer.concat(buf), cid = shaOf(bytes);
    files.push({ name: cid + '.bin', bytes });
    rec.unshift(`WFRAME-R${G}-C${cid}-A${bytes.length}`);
    /* the words: what each part is, the colours that are mixes of tones, the plates' calls, the beats' lit rings, the labels, the key of the view's state */
    for (const name of mine) { const p = scene.parts[name]; lines.push(['kind', name, p.kind, ...p.args]); lines.push(['pview', name, view]); }
    for (const name of mine) { const p = scene.parts[name]; if (p.pick && p.lift) lines.push(['lift', name, String(p.lift), String(HOVER_RATE)]); }
    for (const hg of spec.hoverGroups || []) { lines.push(['rowgroup', hg.part, ...hg.groups]); lines.push(['liftgroup', hg.part, String(hg.frac), String(hg.rate), hg.off]); }   /* blocks that lift together under the pointer */
    v.derived.forEach((d) => lines.push(['mixtone', d.index, ...d.weights.flat()]));
    for (const pl of scene.plates) if (mine.includes(pl[1])) lines.push(pl);
    for (const pl of v.plateVars) lines.push(pl);
    for (const pk of v.picks) lines.push(pk);
    for (const q of v.gates) lines.push(['gatekeys', q.part, q.pivot, ...q.keys.flat()]);
    for (const sg of spec.staggers || []) lines.push(['stagger', sg.part, sg.axis, sg.T, sg.dur, sg.d0, sg.step, sg.curve]);
    lines.push(['statekey', view, spec.key2 ? spec.key + '|' + spec.key2 : spec.key]);
    for (const st of spec.states) if (st.id != null) { lines.push(['stateid', view, st.name, st.id]); for (const a of st.alias || []) lines.push(['stateid', view, st.name, a]); }
    v.focus.forEach((f, i) => lines.push(['beat', view, spec.states[i].name, f.cubes ? 1 : 0, ...(f.rings || ['-'])]));
    for (const sp of v.spots) lines.push(['spot', view, sp.id, sp.p[0], sp.p[1], sp.p[2], sp.channel, sp.min, sp.state, sp.on === false ? 0 : 1, sp.dir || 'gt']);
    const names = Buffer.from(lines.map((l) => l.map(clean).join('\t')).join('\n') + '\n', 'utf8'), namesCid = shaOf(names);
    files.push({ name: namesCid + '.txt', bytes: names });
    rec.push(`WNAMES-R${G}-C${namesCid}-A${names.length}`);
    out.push({ view, group: G, rec, files, layout, bytes });
  }
  return out;
}
