/* The object preview's host (previews/object.html?o=<id>). It draws one of fxn-3d's world objects (js/render/world2-<id>.mjs, each
   built on world2-object-kit.mjs and exporting OBJECT) with the site's own
   world look and mesh pass, so the object looks here as it will in the world: the same renderer (world2-gl.mjs), the same pieces
   (world2-pieces.mjs), the same palette (world2-palette.mjs), the same bloom and edge fade.
   Draw on demand: a frame is drawn while the build plays, while the camera eases, and once after a drag, a zoom, a resize or a
   theme change. Nothing runs at rest. */
import { createRenderer } from '../js/world2/world2-gl.mjs';
import { createPieces } from '../js/world2/world2-pieces.mjs';
import { readPalette, tokenLinear } from '../js/world2/world2-palette.mjs';

const root = document.documentElement, canvas = document.getElementById('scene');
const say = (id, text) => { document.getElementById(id).textContent = text; };
function fail(why) { const el = document.getElementById('fail'); el.textContent = 'The object cannot be drawn: ' + why + '.'; el.style.display = 'grid'; }
/* which object: ?o=<id>, the file fxn-3d js/render/world2-<id>.mjs; lowercase letters, digits and dashes only */
const ID = (new URLSearchParams(location.search).get('o') || 'node').toLowerCase();

const R = createRenderer(canvas);
if (!/^[a-z0-9-]+$/.test(ID)) fail('the object name "' + ID + '" has a character other than a-z, 0-9 and -');
else if (!R) fail('this browser gave no WebGL2 context. It needs WebGL2');
else start().catch((e) => fail(e.message));

async function start() {
  const O = (await import('/fxn-3d/js/render/world2-' + ID + '.mjs').catch(() => { throw new Error('there is no object named "' + ID + '" (fxn-3d js/render/world2-' + ID + '.mjs)'); })).OBJECT;
  const NODE_PARTS = O.parts, NODE_STEPS = O.steps, NODE_MATERIALS = O.materials, LAST = O.last;
  document.title = O.title + ' preview'; say('title', O.title);
  const mesh = await import('/fxn-3d/js/render/world2-mesh.mjs');
  const env = await mesh.fetchEnvironment().catch(() => null);
  const pieces = createPieces(R, mesh, env);
  R.setPieces(pieces);

  /* one piece per part, added in NODE_PARTS order (the floor first: see-through pieces draw in that order); its rows are 16 floats each
     (the matrix, the role's colour times k, the alpha), sized once for the part's rows and their mirror twins */
  const counts = O.counts(), rows = counts.map((n) => new Float32Array(16 * n));
  const { paintTexture } = await import('/fxn-3d/js/render/world2-textures.mjs');
  const made = NODE_PARTS.map((p, i) => {
    const pc = pieces.add('node-' + p.name, { box: p.box, mat: O.materialOf(p), plated: p.mat === 'steel' && !p.tex }, rows[i]);
    /* a part that names an image wears it (world2-textures.mjs): the mesh pass multiplies the role colour by it */
    if (p.tex) { const cv = paintTexture(p.tex); if (cv) pc.o.matTex = mesh.uploadTexture(R.gl, cv); }
    return pc;
  });
  let colours = {};
  function readColours() {
    R.setPalette(readPalette(document.body));
    colours = {};
    for (const p of NODE_PARTS) if (!colours[p.role]) colours[p.role] = tokenLinear(document.body, p.role, '#888888');
  }

  /* ---------- the build's time ---------- */
  let T = 0, goal = 0, frame = null, last = 0, raf = 0;
  const SPEED = 1 / 1.6;   /* a step takes 1.6 s: the modules are heavy, and the four of a kind start one after another */
  function write() {
    frame = O.frame(T, frame);
    frame.forEach((f, i) => {
      const r = rows[i], c = colours[f.part.role];
      for (let j = 0; j < f.count; j++) {
        r.set(f.m.subarray(j * 12, j * 12 + 12), j * 16);
        const k = f.k[j]; r[j * 16 + 12] = c[0] * k; r[j * 16 + 13] = c[1] * k; r[j * 16 + 14] = c[2] * k; r[j * 16 + 15] = 1;
      }
      pieces.write(made[i], r, f.count);
    });
  }

  /* ---------- the camera: a three-quarter view from above, as the board shows it ---------- */
  const cam = Object.assign({ tilt: 0 }, O.camera, { aim: O.camera.aim.slice() });
  let W = 0, H = 0;
  function resize() {
    W = innerWidth; H = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2.6e6 / (W * H)));
    canvas.width = Math.round(W * ratio); canvas.height = Math.round(H * ratio);
    R.resize(W * ratio, H * ratio, 4);
    R.setFrame({ x: 0, y: 0, w: W, h: H }, W, H);
  }
  const draw = () => R.render(cam, cam.dist);

  function tick(now) {
    raf = 0;
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
    if (T !== goal) { const d = goal - T, step = SPEED * dt * (Math.abs(d) > 1.5 ? 2 : 1); T = Math.abs(d) <= step ? goal : T + Math.sign(d) * step; }
    write(); draw(); show();
    if (T !== goal) raf = requestAnimationFrame(tick); else last = 0;
  }
  const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };
  const redraw = () => { if (!raf) { write(); draw(); } };

  /* ---------- the page around it ---------- */
  const nav = document.getElementById('steps');
  const buttons = NODE_STEPS.map((s, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'step';
    b.innerHTML = '<b class="mono"></b><span></span>'; b.querySelector('b').textContent = s.n; b.querySelector('span').textContent = s.name;
    b.addEventListener('click', () => { goal = i; wake(); });
    nav.appendChild(b); return b;
  });
  const play = document.createElement('button'); play.type = 'button'; play.id = 'play'; play.textContent = 'Play the build';
  play.addEventListener('click', () => { if (T >= LAST && goal >= LAST) T = 0; goal = LAST; wake(); });
  nav.appendChild(play);
  let shown = -1;
  function show() {
    const i = O.stepAt(T); if (i === shown) return; shown = i;
    const s = NODE_STEPS[i];
    say('stepNo', 'Step ' + s.n + ' of ' + NODE_STEPS[LAST].n); say('stepName', s.name); say('stepLine', s.line);
    buttons.forEach((b, j) => (j === i ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
  }

  /* the theme: the object re-reads every role, so Ember shows orange and Moss green */
  const themes = [...document.querySelectorAll('#themes button')];
  function theme(id) {
    root.dataset.theme = id;
    themes.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeId === id)));
    try { localStorage.setItem('defxn-node-preview-theme', id); } catch {}
    readColours(); redraw();
  }
  themes.forEach((b) => b.addEventListener('click', () => theme(b.dataset.themeId)));

  /* drag to turn, scroll to zoom */
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, yaw: cam.yaw, elev: cam.elev }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('drag'); });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    cam.yaw = drag.yaw - (e.clientX - drag.x) * .006;
    cam.elev = Math.max(.06, Math.min(1.35, drag.elev + (e.clientY - drag.y) * .004));
    redraw();
  });
  const end = () => { drag = null; canvas.classList.remove('drag'); };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); cam.dist = Math.max(9, Math.min(60, cam.dist * Math.exp(e.deltaY * .001))); redraw(); }, { passive: false });
  addEventListener('resize', () => { resize(); redraw(); });

  let saved = 'ember'; try { saved = localStorage.getItem('defxn-node-preview-theme') || 'ember'; } catch {}
  resize(); theme(themes.some((b) => b.dataset.themeId === saved) ? saved : 'ember');
  /* the page opens on step 01 and plays the build once */
  show(); goal = LAST; wake();
}
