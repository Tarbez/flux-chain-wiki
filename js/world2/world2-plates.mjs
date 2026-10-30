/* World grammar, the words on a face (docs/design/world-grammar/STAGE.md, PORT.md batch 1).

   A plate is a canvas of words laid on a tile's face as a textured quad (renderer part kind `text`). The words are the sample's own,
   named in the group's NAMES blob (`plate <part> <kind> ...`): a record's revision, title, date and whether it is signed; an earlier
   version's revision; the person of your key. This file only draws them, in the sizes and fonts of scripts/lib/stage-src/chains-scene.js drawRecord
   and its pane plates, with the live theme's colours, so one repaint (a theme change, a font landing) draws them again. The canvases are
   handed to the renderer by id (R.setTexture), one upload each. */
const MONO = '"JetBrains Mono", ui-monospace, monospace', SANS = '"Inter Tight", Inter, system-ui, sans-serif';

/* a theme colour as the world reads it: HSL channels on body ("210 18% 72%") become a CSS colour */
function token(name, fallback) {
  const v = getComputedStyle(document.body || document.documentElement).getPropertyValue(name).trim();
  return v ? 'hsl(' + v.split(/\s+/).join(', ') + ')' : fallback;
}
function canvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
function wrapWords(g, text, maxW, maxLines) {
  const words = String(text).split(' '), out = []; let line = '';
  words.forEach((w) => { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; });
  if (line) out.push(line);
  return out.slice(0, maxLines);
}

/* spec: [kind, ...words] */
export function paintPlate(spec) {
  const kind = spec[0], ink = token('--text-strong', '#f3f8f4'), mute = token('--text-muted', '#9aa3a8'), sig = token('--signal', '#3fd1a8');
  if (kind === 'record') {
    const [, rev, title, date, signed] = spec, w = 512, h = 512, pad = 40, cv = canvas(w, h), g = cv.getContext('2d');
    g.fillStyle = mute; g.font = '500 30px ' + MONO; if ('letterSpacing' in g) g.letterSpacing = '5px';
    g.fillText(rev, pad, pad + 26);
    g.globalAlpha = .5; g.fillRect(pad, pad + 48, w - pad * 2, 2); g.globalAlpha = 1;
    if ('letterSpacing' in g) g.letterSpacing = '-1px';
    g.fillStyle = ink; g.font = '700 66px ' + SANS;
    wrapWords(g, title, w - pad * 2, 3).forEach((l, i) => g.fillText(l, pad, pad + 140 + i * 74));
    if ('letterSpacing' in g) g.letterSpacing = '3px';
    g.fillStyle = mute; g.font = '500 28px ' + MONO; g.fillText(date, pad, h - pad);
    if (signed) { g.fillStyle = sig; g.fillText(signed, w - pad - g.measureText(signed).width, h - pad); }
    return cv;
  }
  if (kind === 'rev') {
    const w = 512, h = Math.round(512 * .22 / .84), cv = canvas(w, h), g = cv.getContext('2d');
    if (!spec[1]) return cv;
    g.fillStyle = ink; g.font = '600 64px ' + MONO; if ('letterSpacing' in g) g.letterSpacing = '8px';
    g.fillText(spec[1], 24, h * .7);
    return cv;
  }
  /* person: your key's face, a head and shoulders in the signal tone (chains-scene.js kFace) */
  const cv = canvas(128, 128), g = cv.getContext('2d');
  g.strokeStyle = sig; g.lineWidth = 8; g.lineCap = 'round';
  g.beginPath(); g.arc(64, 44, 18, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(30, 104); g.bezierCurveTo(35, 80, 48, 71, 64, 71); g.bezierCurveTo(80, 71, 93, 80, 98, 104); g.stroke();
  return cv;
}

/* ---------- the identity steps' plates (scripts/lib/stage-src/identity-stages.js textPlate): the key file's name, the app's lines, the signing request, the vault's three icons,
   the person mark, the name, a device's screen. spec: [kind, w, h, ...words]; w and h are the plate's size in the world, its canvas is 512 wide ---------- */
function mono(g, px, sp, wt) { g.font = (wt || 500) + ' ' + px + 'px "JetBrains Mono", ui-monospace, monospace'; if ('letterSpacing' in g) g.letterSpacing = (sp == null ? 3 : sp) + 'px'; }
function sans(g, px, wt) { g.font = (wt || 700) + ' ' + px + 'px "Inter Tight", Inter, system-ui, sans-serif'; if ('letterSpacing' in g) g.letterSpacing = '-1px'; }
export function paintIdPlate(spec) {
  const kind = spec[0], pw = Number(spec[1]), ph = Number(spec[2]), words = spec.slice(3), cv = canvas(512, Math.round(512 * ph / pw)), g = cv.getContext('2d'), w = cv.width, h = cv.height;
  const strong = token('--text-strong', '#f3f8f4'), muted = token('--text-muted', '#9aa3a8'), signal = token('--signal', '#3fd1a8'), honey = token('--state-partial', '#e8b55a');
  const TAU = Math.PI * 2, PI = Math.PI;
  if (kind === 'chip') { mono(g, 112, 6, 600); g.fillStyle = strong; g.fillText(words[0], 6, h * .45); g.fillText(words[1], 6, h * .92); }
  else if (kind === 'applines') { g.fillStyle = 'rgba(255,255,255,.16)'; [0, 1, 2].forEach((i) => g.fillRect(24, 34 + i * 52, (w - 48) * [1, .8, .55][i], 16)); }
  else if (kind === 'request' || kind === 'share') {
    g.fillStyle = 'rgba(232,228,218,.96)'; g.fillRect(0, 0, w, h);
    mono(g); g.fillStyle = '#3d4743'; g.fillText(words[0], 30, 50);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(30, 70, w - 60, 2);
    if (kind === 'request') { sans(g, 34, 600); g.fillStyle = '#121a17'; words.slice(1).forEach((l, i) => g.fillText(l, 30, 128 + i * 52)); }
    else {
      sans(g, 34, 600); g.fillStyle = '#121a17'; g.fillText(words[1], 30, 128);
      const bw = (w - 84) / 2, by = h - 112;
      g.fillStyle = '#121a17'; g.fillRect(30, by, bw, 66); g.strokeStyle = '#121a17'; g.lineWidth = 3; g.strokeRect(54 + bw, by + 1.5, bw, 63);
      sans(g, 30, 600); g.fillStyle = 'rgba(232,228,218,.96)'; g.fillText(words[2], 54, by + 44); g.fillStyle = '#121a17'; g.fillText(words[3], 78 + bw, by + 44);
    }
  } else if (kind === 'icon') {
    const n = Number(words[0]), tone = n === 0 ? signal : honey, x = w * (n === 1 ? .8 : .2), y = h * .2, s = w * .13;
    const gr = g.createRadialGradient(x, y, 0, x, y, w * .9); gr.addColorStop(0, n === 0 ? 'rgba(63,209,168,.18)' : 'rgba(232,181,90,.16)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = tone; g.lineWidth = 9; g.lineJoin = 'round'; g.lineCap = 'round';
    if (n === 0) { g.strokeRect(x - s, y - s * .7, s * 2, s * 1.3); g.beginPath(); g.moveTo(x - s * 1.4, y + s * .85); g.lineTo(x + s * 1.4, y + s * .85); g.stroke(); }
    else if (n === 1) { g.strokeRect(x - s * .8, y - s * .1, s * 1.6, s * 1.1); g.beginPath(); g.arc(x, y - s * .1, s * .55, PI, 0); g.stroke(); }
    else { g.beginPath(); g.arc(x - s * .7, y, s * .38, 0, TAU); g.moveTo(x - s * .3, y); g.lineTo(x + s * .25, y); g.moveTo(x + s * .05, y - s * .25); g.lineTo(x + s * .3, y); g.lineTo(x + s * .05, y + s * .25); g.stroke(); g.beginPath(); g.arc(x + s * .78, y, s * .38, 0, TAU); g.stroke(); }
  } else if (kind === 'person') {
    g.strokeStyle = signal; g.lineWidth = 22; g.lineCap = 'round';
    g.beginPath(); g.arc(w / 2, h * .37, w * .12, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(w * .25, h * .8); g.bezierCurveTo(w * .28, h * .6, w * .38, h * .55, w / 2, h * .55); g.bezierCurveTo(w * .62, h * .55, w * .72, h * .6, w * .75, h * .8); g.stroke();
  } else if (kind === 'name') {
    sans(g, 92); g.fillStyle = strong; g.fillText(words[0], 26, h * .7);
    mono(g, 30, 5, 600); g.fillStyle = muted; const sw = g.measureText(words[1]).width; g.fillText(words[1], w - sw - 26, h * .64);
  } else if (kind === 'ops') {
    paintOps(g, w, h, words);
  } else if (kind === 'screen') {
    g.fillStyle = 'rgba(8,16,14,.94)'; g.fillRect(0, 0, w, h);
    const x = w / 2, y = h * .42, r = Math.min(w, h) * .14;
    g.strokeStyle = signal; g.lineWidth = 6; g.beginPath();
    for (let i = 0; i <= 6; i++) { const a = PI / 2 + i * TAU / 6; if (i) g.lineTo(x + Math.cos(a) * r, y - Math.sin(a) * r); else g.moveTo(x + Math.cos(a) * r, y - Math.sin(a) * r); }
    g.stroke(); mono(g, Math.round(w * .065), 2); g.fillStyle = muted; const tw = g.measureText(words[0]).width; g.fillText(words[0], x - tw / 2, y + r + w * .12);
  }
  return cv;
}

/* ---------- plates drawn by the stage's own 2D calls (docs/design/world-grammar/PORT.md batch 3) ----------
   The how-it-works stages draw a face's lines or a card's fields with canvas calls. The encoder runs the stage and keeps the calls as words (world-stage-eval.mjs recordingContext, opsToWords):
   each is a name, how many arguments, then the arguments. Only the calls the recorder writes are replayed here. A colour written `@tone` is that tone of the page's theme.
   words: [mode, toneA, toneB, mix, sourceWidth, ...calls]. mode `plain` keeps the calls' own colours; mode `alpha` reads the calls as a mask (white on black, as a three.js alphaMap) and
   fills it with the lerp of two tones by mix. */
const TONE_VAR = { identity: ['--chain-identity', '#bcc3c8'], resolver: ['--chain-resolver', '#667e88'], token: ['--chain-token', '#525a5d'], pool: ['--chain-pool', '#8e8a9f'], network: ['--chain-network', '#378f7c'],
  ledger: ['--chain-ledger', '#3aa88a'], other: ['--chain-other', '#525a5d'], signal: ['--signal', '#3fd1a8'], muted: ['--text-muted', '#9aa3a8'], canvas: ['--canvas', '#0a100d'], record: ['--record', '#e6e1d8'],
  strong: ['--text-strong', '#f3f8f4'], text: ['--text', '#c3cdd6'], ember: ['--ember', '#f7752a'], primary: ['--primary', '#ff8e59'], danger: ['--danger', '#d26a5f'], honey: ['--state-partial', '#e8b55a'] };
const toneCss = (name) => { const t = TONE_VAR[name]; if (!t) throw new Error('plate: no theme token is known for the tone "' + name + '"'); return token(t[0], t[1]); };
const STYLE_PROPS = new Set(['fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'font', 'letterSpacing', 'globalAlpha']);
const DRAW_CALLS = new Set(['fillRect', 'strokeRect', 'clearRect', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'arcTo', 'stroke', 'fill', 'fillText', 'bezierCurveTo', 'rect']);
function replay(g, tokens) {
  const grads = {};   /* a linear gradient is `linearGradient` (its number and ends), then a `colorStop` each; a fill that uses it is written `grad:<number>` (the site panes' sheen) */
  for (let i = 0; i < tokens.length;) {
    const name = tokens[i], argc = Number(tokens[i + 1]), args = tokens.slice(i + 2, i + 2 + argc); i += 2 + argc;
    if (name === 'linearGradient') { grads[args[0]] = g.createLinearGradient(...args.slice(1).map(Number)); continue; }
    if (name === 'colorStop') { grads[args[0]].addColorStop(Number(args[1]), args[2]); continue; }
    if (name === 'fillStyle' && args[0].slice(0, 5) === 'grad:') { g.fillStyle = grads[args[0].slice(5)]; continue; }
    if (argc === 1 && STYLE_PROPS.has(name)) {
      if (name === 'letterSpacing' && !('letterSpacing' in g)) continue;
      g[name] = name === 'lineWidth' || name === 'globalAlpha' ? Number(args[0]) : (args[0][0] === '@' ? toneCss(args[0].slice(1)) : args[0]);
    } else if (DRAW_CALLS.has(name)) g[name](...(name === 'fillText' ? [args[0], ...args.slice(1).map(Number)] : args.map(Number)));
  }
}
/* a theme colour as rgb 0..255 (a 1 x 1 canvas reads back what the browser makes of the CSS) */
function rgbOf(css) { const c = canvas(1, 1), g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = css; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; }
function paintOps(g, w, h, words) {
  const [mode, a, b, mix, srcW] = words, tokens = words.slice(5);
  g.save(); g.scale(w / Number(srcW), w / Number(srcW));
  replay(g, tokens); g.restore();
  if (mode !== 'alpha') return;
  const ca = rgbOf(toneCss(a)), cb = rgbOf(toneCss(b)), m = Number(mix), img = g.getImageData(0, 0, w, h), d = img.data;
  const rgb = ca.map((x, i) => x + (cb[i] - x) * m);
  for (let i = 0; i < d.length; i += 4) { const lum = d[i]; d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = lum; }
  g.putImageData(img, 0, 0);
}
