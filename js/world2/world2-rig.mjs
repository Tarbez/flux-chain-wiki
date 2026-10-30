/* World grammar, the auth stage's moving rows (docs/design/world-grammar/PORT.md batch 1, STAGE.md).

   /auth draws the owner's card on the kernel's beam, and round it a glow, two orbit rings, twelve loose cubes, fourteen pieces that leave the card's corner, and two glass
   status panels with a round port and a lit bead for each status line. None of it is drawn by code written for the view. The encoder (scripts/lib/world-auth-scene.mjs)
   evaluated auth-stage.js's placement maths and wrote every part's rows as SAMPLES: a part's base frame (every channel at 0) and, for each channel the part depends on, frames at
   the values where its rows have a corner. Here a row is its base plus, for each channel, what that channel adds: the part's frame at the channel's live value (the line between the two
   nearest samples) less the base. The channels (lift tip glow orbit gather broken loose bad, and the stage's own present) are the stage's, played by the one sampler.
   A part written in the card's own units (WATTACH: the glow, the loose pieces) is laid on the card as it stands: its lift, its lean and its size (the host's cardFrame()). The beads are
   a frame per state; the words of the panels are painted from the state's own lines, once per state, and handed to the renderer by id. Nothing here schedules a frame. No JSON. */
import { torus } from '/fxn-3d/js/render/world2-shapes.mjs';
import { loadPart, resolveRow } from './world2-rows.mjs';

/* how each part is drawn. like: the renderer's kind; shape: its unit shape; attach: written in the card's units; piece: drawn through the mesh pass (world2-pieces.mjs) */
const PART = {
  aglow: { like: 'glow', shape: 'cube', glow: [1, 0, 1], attach: true },
  aorbit0: { like: 'glow', shape: 'orbit0', glow: [1, 0, 1] }, aorbit1: { like: 'glow', shape: 'orbit1', glow: [1, 0, 1] },
  acube: { like: 'cube', pass: 'blend', piece: { kind: 'cube', mat: { metal: .2, rough: .3, coat: .8, coatRough: .1, env: 1, opacity: .999 } } },
  abits: { like: 'cube', attach: true },
  apanel0: { like: null, piece: { mesh: 'apanel0', mat: { metal: .15, rough: .25, coat: .8, coatRough: .15, env: 1, opacity: .999 } } },
  apanel1: { like: null, piece: { mesh: 'apanel1', mat: { metal: .15, rough: .25, coat: .8, coatRough: .15, env: 1, opacity: .999 } } },
  abead: { like: 'dot' }, atop: { like: 'glow', shape: 'cube', glow: [1, 0, 1] }, atext0: { like: 'text' }, atext1: { like: 'text' }
};
const CHANNELS = ['lift', 'tip', 'glow', 'orbit', 'gather', 'broken', 'loose', 'bad', 'cspin'];
const TAU = Math.PI * 2;
const MONO = '"JetBrains Mono", ui-monospace, monospace';

export function createRig(o) {
  const { world, R, blob, lines, palette, wake, pieces, meshes } = o;
  const reduced = o.reduced || (() => false);
  const S = world.stage, parts = world.parts.rig || [];
  /* two torus shapes for the rings: the tube's share of each ring's radius (auth-stage.js: tube o[1] x CW / 2.5 on radius o[0], so .028 / (2.5 x .92) and .02 / (2.5 x 1.05)) */
  R.addShape('orbit0', torus(.028 / (2.5 * .92), 96, 8)); R.addShape('orbit1', torus(.02 / (2.5 * 1.05), 96, 8));

  /* ---------- the words ---------- */
  const title = [], panel = [], words = new Map();
  let network = 'Network', signer = ['Signing as you', 'No signer'], clock = null;
  for (const c of lines) {
    if (c[0] === 'title') title[Number(c[1])] = c[2];
    else if (c[0] === 'panel') panel[Number(c[1])] = { w: Number(c[2]), h: Number(c[3]) };
    else if (c[0] === 'network') network = c[1];
    else if (c[0] === 'clock') clock = { rate: Number(c[1]), cubeK: Number(c[2]), mean: Number(c[3]), amp: Number(c[4]), period: Number(c[5]), states: c.slice(6) };
    else if (c[0] === 'signer') signer = [c[1], c[2]];
    else if (c[0] === 'words') words.set(Number(c[1]), { name: c[2], rows: [[c[3], c[4]], [c[5], c[6]], [c[7], c[8]]], net: c[9] });
  }
  const nStates = words.size;

  /* ---------- the parts ---------- */
  const P = {}, order = [];
  for (const p of parts) {
    const cfg = PART[p.part]; if (!cfg) throw new Error('rig: part ' + p.part + ' has no kind in the auth stage\'s part table (world2-rig.mjs PART), so the renderer cannot draw it');
    const e = loadPart(S, 'rig', p, blob, cfg);
    e.buf = R.buffer(e.out); e.part = null; e.samples = {}; e.local = new Float32Array(e.out.length);
    const own = (e.entries.auth || []), baseEntry = own.find((q) => !q.axis);
    e.baseFrame = baseEntry ? baseEntry.first : 0;
    for (const q of own) if (q.axis) (e.samples[q.axis] || (e.samples[q.axis] = [])).push(q);
    for (const list of Object.values(e.samples)) list.sort((a, b) => a.value - b.value);
    if (cfg.like) {
      e.part = { part: p.part, like: cfg.like, shape: cfg.shape, buffer: e.buf, offset: 0, count: 0, direct: true, pass: cfg.pass, glow: cfg.glow, noShadow: true, cpu: e.out.buffer };
      if (cfg.like === 'dot') e.part.soft = 0;
    }
    if (pieces && cfg.piece) {   /* the mesh pass; a part it cannot take is drawn by the lit program when it has a kind there, else not drawn */
      try { e.piece = cfg.piece.mesh ? pieces.addMesh(p.part, meshes[cfg.piece.mesh], cfg.piece, e.out) : pieces.add(p.part, cfg.piece, e.out); if (e.part) e.part.piece = true; }
      catch (err) { if (window.console) console.warn('[world2] ' + p.part + ' is not drawn by the mesh pass (' + err.message + ')'); }
    }
    P[p.part] = e; order.push(e);
  }
  const drawn = order.filter((e) => e.part).map((e) => e.part);

  /* ---------- rows: base plus what each channel adds ---------- */
  const B0 = new Float32Array(16), B = new Float32Array(16), LO = new Float32Array(16), HI = new Float32Array(16), pal = () => palette();
  const resolve = (e, frame, i, dst) => resolveRow(e, frame, i, dst, pal());
  /* the part's row i along a channel at value v: the base (value 0) and the samples, a line between the two nearest, a line beyond the ends as the first and last pieces run on */
  function along(e, list, v, i, dst) {
    const pts = [{ value: 0, first: e.baseFrame }].concat(list);
    let k = 0; while (k + 2 < pts.length && pts[k + 1].value <= v) k++;
    const lo = pts[k], hi = pts[k + 1], t = (v - lo.value) / (hi.value - lo.value || 1);
    resolve(e, lo.first, i, LO); resolve(e, hi.first, i, HI);
    for (let c = 0; c < 16; c++) dst[c] = LO[c] + (HI[c] - LO[c]) * t;
  }
  /* the part's rows for the live channels, in the part's own units (e.local); present fades every row */
  function evaluate(e, live, key, present) {
    const local = e.local, SM = new Float32Array(16);
    for (let n = 0; n < e.kept.length; n++) {
      const i = e.kept[n], o = i * 16;
      if (e.name === 'abead') {
        const ent = (e.entries.auth || []).filter((q) => q.axis === 'state'), hit = ent.find((q) => q.value === key) || ent[0];
        resolve(e, hit ? hit.first : 0, i, B);
        if (i < 3 && pulseRun(i)) B[15] *= pulse[i];   /* a running status bead on the FXN ID panel: its light moves as .7 + .3 sin(now / 220 + line) about the mean the frame holds */
      } else {
        resolve(e, e.baseFrame, i, B0); for (let k = 0; k < 16; k++) B[k] = B0[k];
        for (const c of CHANNELS) {
          const list = e.samples[c]; if (!list) continue;
          along(e, list, live[c] || 0, i, SM);
          for (let k = 0; k < 16; k++) B[k] += SM[k] - B0[k];
        }
      }
      B[15] *= present;
      for (let k = 0; k < 16; k++) local[o + k] = B[k];
    }
  }
  /* local rows to the rows drawn: a part written in the card's units is laid on the card (its turn and size, then its centre); the rest are the world's already */
  let attachFn = o.cardFrame || (() => null);
  function finish(e) {
    const local = e.local, cur = e.cur;
    if (!e.cfg.attach) { cur.set(local); return; }
    const f = attachFn();
    for (let n = 0; n < e.kept.length; n++) {
      const o2 = e.kept[n] * 16;
      for (let k = 0; k < 16; k++) cur[o2 + k] = local[o2 + k];
      if (!f) { cur[o2 + 15] = 0; continue; }
      const m = f.rot, k = f.k;
      for (let c = 0; c < 4; c++) {
        const x = local[o2 + c * 3] * k, y = local[o2 + c * 3 + 1] * k, z = local[o2 + c * 3 + 2] * k;
        cur[o2 + c * 3] = m[0] * x + m[3] * y + m[6] * z + (c === 3 ? f.c[0] : 0); cur[o2 + c * 3 + 1] = m[1] * x + m[4] * y + m[7] * z + (c === 3 ? f.c[1] : 0); cur[o2 + c * 3 + 2] = m[2] * x + m[5] * y + m[8] * z + (c === 3 ? f.c[2] : 0);
      }
    }
  }

  /* ---------- the words, painted once per state ---------- */
  let themeKey = 0, shown = '';
  function token(name, fallback) { const v = getComputedStyle(document.body || document.documentElement).getPropertyValue(name).trim(); return v ? 'hsl(' + v.split(/\s+/).join(', ') + ')' : fallback; }
  function paintWords(stateIndex, net) {
    const id = stateIndex + '|' + net + '|' + themeKey; if (id === shown) return; shown = id;
    const w = words.get(stateIndex) || words.get(0), on = !!net, connected = w && w.name === 'connected';
    const sheets = [
      { title: title[0], rows: w.rows },
      { title: title[1], rows: [[net || network, on ? 'on' : 'dim'], [w.net, connected ? 'on' : 'dim'], [connected ? signer[0] : signer[1], connected ? 'on' : 'dim']] }
    ];
    sheets.forEach((sh, k) => {
      const e = P['atext' + k]; if (!e || !e.part) return;
      const q = panel[k], cv = document.createElement('canvas'); cv.width = 512; cv.height = Math.round(512 * q.h / q.w);
      const g = cv.getContext('2d'), u = cv.width / q.w;
      g.font = '500 34px ' + MONO; if ('letterSpacing' in g) g.letterSpacing = '3px'; g.fillStyle = token('--primary', '#ff8e59'); g.textBaseline = 'middle'; g.fillText(sh.title.toUpperCase(), u * .2, u * .3);
      sh.rows.forEach((r, i) => { g.font = '500 29px ' + MONO; g.fillStyle = r[1] === 'dim' ? 'rgba(220,214,210,.55)' : 'rgba(246,242,238,1)'; g.fillText(String(r[0]).toUpperCase(), u * .2, u * (.62 + i * .34)); });
      if (e.part.tex) R.dropTexture(e.part.tex);
      e.part.tex = 'rig' + k + ':' + id; R.setTexture(e.part.tex, cv);
    });
  }

  /* ---------- the clock: what runs while its cause runs (auth-stage.js pose()) ----------
     While the file opens (state verify, or the create wizard's last step) the stage keeps drawing: the cubes turn by cubeK x spin and the running beads pulse. The page asks for no frame
     otherwise; a state that stops the clock keeps the last pulse it drew, as the Three.js stage did. The rings turn too in that file, about their own axis, which a torus shows no change for. */
  const pulse = [1, 1, 1];
  let spin = 0, lastAt = 0, spinning = false, runRows = null;
  const pulseRun = (i) => !!runRows && runRows[i] === 'run';
  function tick(now, name, rows) {
    runRows = rows ? rows.map((r) => r[1]) : null;
    spinning = !!clock && !reduced() && clock.states.indexOf(name) >= 0;
    const dt = lastAt ? Math.min(64, now - lastAt) : 16; lastAt = now;
    if (!spinning) { lastAt = 0; return; }
    spin += dt * clock.rate;
    for (let l = 0; l < 3; l++) pulse[l] = (clock.mean + clock.amp * Math.sin(now / clock.period + l)) / clock.mean;
  }

  /* ---------- step and flush ---------- */
  function step(live, stateIndex, net, now) {
    const present = live.present == null ? 1 : live.present, key = stateIndex + nStates * (net ? 1 : 0), w0 = words.get(stateIndex) || words.get(0);
    tick(now == null ? performance.now() : now, w0 && w0.name, w0 && w0.rows);
    live = Object.assign({}, live, { cspin: clock ? (spin * clock.cubeK) % TAU : 0 });
    paintWords(stateIndex, net);
    for (const e of order) { evaluate(e, live, key, present); finish(e); }
    return present > 1e-3;
  }
  function upload(e, on) {
    let any = false;
    if (on) for (let i = 0; i < e.per; i++) if (e.cur[i * 16 + 15] > 1e-4) { any = true; break; }
    e.out.set(e.cur);
    if (e.part) { e.part.count = any ? e.per : 0; e.part.c = null; R.updateBuffer(e.buf, e.out, 0); }
    if (e.piece) pieces.write(e.piece, e.out, any ? e.per : 0);
  }
  function flush(on) { for (const e of order) upload(e, on); }
  /* the card's frame follows the camera as drawn (the pointer's lean turns the card): the parts in its units are laid again before each draw */
  function place(on) { for (const e of order) if (e.cfg.attach) { finish(e); upload(e, on); } }
  function repaint() { themeKey++; shown = ''; }
  return { P, order, drawn, running: () => spinning, step, flush, place, repaint, setCardFrame(fn) { attachFn = fn; } };
}
