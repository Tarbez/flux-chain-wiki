/* The home helix as numbers (docs/design/world-grammar/PORT.md, 2026-10-30 lane B: "THREEJS IS DEPRECATED, all animations and work have to be recreated in FXN3D").
   Build side, Node built-ins only; no Three.js, no library.

   scripts/lib/stage-src/home-helix.js is the Three.js helix of the identity card: 36 blocks of smoky glass on a coil of two and a half turns that narrows into the lit person block,
   a proof line up its axis, a plate behind it and a build, a wind-down and a half-turn on hover. js/world2/world2-helix.mjs draws it in the grammar world. What the file says in
   numbers is LIFTED from its text here, never typed again: the form (blocks, turns, pitch, sizes, tilt, taper, back-pass dim), the build's timing, the proof line's radii, the half-turn's
   length, the glyph of the person block (from ring-kit.js), and the bevel share of a block. A file that no longer holds the text for one of them stops the encoder with the file's name.
   What the browser must still do, because it reads the page: stand the form in the identity card's box (the file's frameFor) and follow the camera. The colour coefficients of the file
   (the pale rim, the back pass, the lit glass) are restated in world2-helix.mjs and guarded here by the text that holds each of them, the way world-chain-scene.mjs guards its maths. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { stageSrc } from './stage-src.mjs';

export const HELIX_VIEW = 'helix';
const num = (x) => String(+(+x).toFixed(6));

function lift(file, src, re, what) {
  const m = re.exec(src);
  if (!m) throw new Error(path.basename(file) + ' no longer holds the text for ' + what + ', so the helix cannot be written from it. Re-read ' + path.basename(file) + ', update scripts/lib/world-helix-scene.mjs to the new text, and run the encoder again.');
  return m;
}

export function helixScene() {
  const file = stageSrc('home-helix.js'), src = fs.readFileSync(file, 'utf8'), L = (re, what) => lift(file, src, re, what);
  const [, NB, TURNS, BW, BH, BD, PITCH] = L(/var NB = (\d+), TURNS = ([\d.]+), BW = ([\d.]+), BH = ([\d.]+), BD = ([\d.]+), PITCH = ([\d.]+), RISE = TURNS \* PITCH;/, 'the form (blocks, turns, block size, pitch)');
  const [, PS, TILT, PTK] = L(/var PS = ([\d.]+), TILT = ([\d.]+), PT = TILT \* ([\d.]+);/, 'the person block and the tilt');
  const [, TAPER, BACK] = L(/var TAPER = ([\d.]+), BACK = ([\d.]+);/, 'the taper and the back pass');
  const [, stepMs, pop, p0, p1, l0, l1, end] = L(/var BUILD = \{ step: (\d+) \/ \(NB - 1\), pop: (\d+), person: \[(\d+), (\d+)\], lit: \[(\d+), (\d+)\] \}, BUILD_END = (\d+);/, 'the build\'s timing');
  const [, glyphScale] = L(/var GLYPH_SCALE = ([\d.]+);/, 'the person glyph\'s size');
  const [, lineR, glowR] = L(/var LINE_R = ([\d.]+), GLOW_R = ([\d.]+);/, 'the proof line\'s radii');
  const [, margin] = L(/var MARGIN = ([\d.]+)/, 'the margin round the helix in its box');
  const [, dist] = L(/var D = (\d+);/, 'how far in front of the camera the helix stands');
  const [, spinMs] = L(/spin\.go\(spin\.to \+ PI, (\d+), now\)/, 'the half-turn on hover');
  const [, plateOpacity] = L(/opacity: ([\d.]+), depthWrite: true, toneMapped: false/, 'the plate behind the helix');
  const [, bevel] = lift(stageSrc('ring-kit.js'), fs.readFileSync(stageSrc('ring-kit.js'), 'utf8'), /var BEVEL = ([\d.]+);/, 'the bevel share of a block');
  /* the person glyph, bars of x, y, width, height (and a turn) */
  const kit = fs.readFileSync(stageSrc('ring-kit.js'), 'utf8'), gm = lift(stageSrc('ring-kit.js'), kit, /person: (\[\[[^\n]*?\]\]),/, 'the person glyph');
  const glyph = vm.runInNewContext(gm[1]);   /* the kit's own array literal, read as numbers */
  /* the colour and motion expressions the browser restates, guarded by their text */
  for (const needle of [
    'glass.copy(k.mix(\'canvas\', \'muted\', .15))', 'tealGlass.copy(k.mix(\'canvas\', \'signal\', .1))',
    'col.copy(glass).multiplyScalar(BACK + (1 - BACK) * depth)', 'col.copy(ember).multiplyScalar(.1 * (BACK + (1 - BACK) * depth) * up)',
    'col.copy(ember).lerp(WHITE, .22).multiplyScalar(.62 * (BACK + (1 - BACK) * depth) * up), .32)', 'col.copy(glass).lerp(tealGlass, lit)', 'col.copy(teal).multiplyScalar(.05 + .17 * lit)',
    'col.copy(ember).lerp(teal, lit).multiplyScalar(1.1 + .9 * lit), .45)', 'col.copy(teal).lerp(WHITE, .25 * lit).multiplyScalar(.4 + 2.2 * lit)',
    'smoothstep(.86, 1., vY)', 'head = smoothstep(reveal - .08, reveal, vY) * step(reveal, .999)', 'gl_FragColor = vec4(c * gain * (1. + head * 1.6), alpha)',
    'lineMesh(1, 1.35, 1, .3), lineGlow = lineMesh(1, 1, .22, 0)', 'var front = hw * (NB + 4) - 1;', 'gl = clamp01((front - i) / 3)', 'ease.back(gp)', 'var gpl = clamp01((front - NB) / 3)',
    'm.opacity = .62; m.depthWrite = false; m.roughness = .3; m.metalness = .1;', 'm.clearcoat = .7; m.clearcoatRoughness = .22;', 'm.envMapIntensity = 1.2'
  ]) if (!src.includes(needle)) throw new Error('home-helix.js no longer holds "' + needle + '", so js/world2/world2-helix.mjs no longer matches it. Re-read the file, update world2-helix.mjs and the needles in scripts/lib/world-helix-scene.mjs, and run the encoder again.');
  const lines = [
    ['num', 'nb', NB], ['num', 'turns', TURNS], ['num', 'bw', BW], ['num', 'bh', BH], ['num', 'bd', BD], ['num', 'pitch', PITCH], ['num', 'ps', PS], ['num', 'tilt', TILT], ['num', 'ptk', PTK],
    ['num', 'taper', TAPER], ['num', 'back', BACK], ['num', 'stepms', num(+stepMs / (+NB - 1))], ['num', 'pop', pop], ['num', 'person0', p0], ['num', 'person1', p1], ['num', 'lit0', l0], ['num', 'lit1', l1], ['num', 'buildend', end],
    ['num', 'glyphscale', glyphScale], ['num', 'liner', lineR], ['num', 'glowr', glowR], ['num', 'margin', margin], ['num', 'dist', dist], ['num', 'spinms', spinMs], ['num', 'plate', plateOpacity], ['num', 'bevel', bevel],
    ...glyph.map((g, i) => ['glyph', i, ...g.map(num)])
  ];
  return { lines, view: HELIX_VIEW };
}

export function helixRecords(scene, { sha }) {
  const names = Buffer.from(scene.lines.map((l) => l.join('\t')).join('\n') + '\n', 'utf8'), cid = sha(names);
  const rec = [`WNAMES-R${scene.view}-C${cid}-A${names.length}`];
  return { view: scene.view, rec, files: [{ name: cid + '.txt', bytes: names }] };
}
