/* World grammar, the decoder's read side (docs/design/world-grammar/CONTRACT.md, "decoder").

   One request fetches world/world.flx: every record of the world, one per line. Each line goes through the
   generated reader (world-reader.mjs, the encoder regenerates it; nothing here parses a box by hand) and lands
   in typed state: rings, cubes, labels, knobs, views, exits, the mark's cid, the chain marks' cids (LOGO, one per
   marked ring, in record order: the j-th LOGO is the j-th instance of the `mark` part), and each view's frame blob
   with its parts. The frame blob is fetched by content id (world/<cid>.bin) and handed to the renderer as bytes; the
   renderer uploads it once and addresses every part by byte offset (CONTRACT.md "The frame blob").

   Why the records are read into state and not kept as rows: the host asks typed questions ("the camera of view
   intro", "the fog knobs") many times a frame; the grammar is the wire, not the working set.

   Numbers are text on the wire: `m` is minus, `p` is the point (README.md "The laws of this grammar"), so
   decoding is text to number with no float formatting trusted. No JSON anywhere (workspace law). */
import { readRecord } from './world-reader.mjs';

/* the owner's picture (601 x 436): RING, CUBE and LABEL coordinates are in it. Only the host's home frame needs
   it (the hub's share of the picture), as the Three.js host read it from network-data.js N.W / N.H. */
export const PICTURE = { w: 601, h: 436 };

/* `m30p5` -> -30.5. Deterministic text to number: the sign is the leading m, the point is p. */
export function num(text) {
  if (text == null) return 0;
  const neg = text[0] === 'm', body = neg ? text.slice(1) : text;
  const value = Number(body.replace('p', '.'));
  return neg ? -value : value;
}

/* one record -> { label: value } so a record kind can pick its boxes by label */
function boxes(line) {
  const out = {};
  for (const box of readRecord(line)) out[box.label] = box.value;
  return out;
}

/* a path on this origin: the site is served from its root, and a route like /stats/now must still find
   world/world.flx at the root (a path from the site root) */
export function worldPath(name) { return (location.protocol === 'file:' ? '' : '/') + 'world/' + name; }

/* The typed state of the world. views[name] carries the camera as the record spells it: aim (x, y, z), fit
   (width, height, fill) when J is present or dist when it is not, elev and yaw in degrees, tilt, back. */
export function emptyWorld() {
  return { rings: [], cubes: [], labels: [], knobs: { look: {}, motion: {}, story: {} }, views: {}, exits: {}, mark: null, logos: [], frames: {}, parts: {}, groups: {}, lines: 0, stage: emptyStage() };
}
/* The stage records (STAGE.md), keyed by the view that owns them: states by name and index, the settled value of a channel in a
   state, a channel's timing keys and real duration, the items over a part's instances, how a part folds to its unbuilt pose, the
   tags' anchors, the text blob of the items' words, and a camera arrival. */
export function emptyStage() { return { states: {}, set: {}, chan: {}, span: {}, items: {}, fold: {}, spots: {}, names: {}, cam: {}, pose: {}, drv: {}, rows: {}, attach: {}, shape: {}, text: {} }; }
const into = (obj, ...path) => path.reduce((o, k) => o[k] || (o[k] = {}), obj);

export function decodeText(text) { return decodeInto(emptyWorld(), text); }
/* more records into a world that exists: a group's file (world.flx names it with WGROUP) is read the same way when its first view is flown to */
export function decodeInto(w, text) {
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const b = boxes(line);
    w.lines++;
    switch (b.W) {
      case 'RING':
        w.rings.push({ i: Number(b.I), kind: b.K, x: num(b.X), y: num(b.Y), width: num(b.D), tiles: Number(b.Q), tone: b.S, parent: b.P == null ? null : Number(b.P) });
        break;
      case 'CUBE':
        w.cubes.push({ x: num(b.X), y: num(b.Y), tone: b.S });
        break;
      case 'LABEL':
        w.labels.push({ kind: b.F, x: num(b.X), y: num(b.Y) });
        break;
      case 'KNOB':
        (w.knobs[b.G] || (w.knobs[b.G] = {}))[b.N] = num(b.V);
        break;
      case 'VIEW': {
        const view = { aim: [num(b.X), num(b.Y), num(b.Z)], elev: num(b.H), yaw: num(b.U), tilt: num(b.T), back: num(b.B) };
        /* J present: D and J are the box the camera fits, V the fill. J absent: D is the camera distance itself. */
        if (b.J != null) { view.fit = { w: num(b.D), h: num(b.J), fill: b.V != null ? num(b.V) : .86 }; } else view.dist = num(b.D);
        w.views[b.R] = view;
        break;
      }
      case 'EXIT':
        w.exits[b.R] = b.E;
        break;
      case 'MARK':
        w.mark = b.C;
        break;
      case 'LOGO':
        w.logos.push({ ring: Number(b.I), cid: b.C });
        break;
      case 'FRAME':
        w.frames[b.R] = { cid: b.C, bytes: Number(b.A) };
        break;
      case 'PART':
        (w.parts[b.R] || (w.parts[b.R] = [])).push({ part: b.M, offset: Number(b.O), count: Number(b.A), pick: !!(Number(b.L) & 1), glassRows: !!(Number(b.L) & 2) });
        break;
      case 'STATE':
        (w.stage.states[b.R] || (w.stage.states[b.R] = [])).push({ index: Number(b.I), name: b.N });
        break;
      case 'SET':
        into(w.stage.set, b.R, b.I)[b.N] = num(b.V);
        break;
      case 'CHAN': {
        /* I present: a channel that grows (1) and shrinks (0) in windows of its own, stored as "<name>.in" and "<name>.out" */
        const key = b.N + (b.I == null ? '' : b.I === '1' ? '.in' : '.out');
        (into(w.stage.chan, b.R)[key] || (w.stage.chan[b.R][key] = [])).push({ frame: Number(b.A), p: num(b.V), curve: Number(b.L) });
        break;
      }
      case 'GROUP':
        w.groups[b.R] = { cid: b.C, bytes: Number(b.A) };
        break;
      case 'POSE':
        (w.stage.pose[b.R] || (w.stage.pose[b.R] = [])).push({ part: b.M || null, first: Number(b.I), count: Number(b.A), axis: b.N || null, value: b.X == null ? 0 : num(b.X) });
        break;
      case 'DRV':
        (w.stage.drv[b.M] || (w.stage.drv[b.M] = [])).push({ at: Number(b.I), channel: b.N, gain: num(b.V), step: num(b.T), curve: Number(b.L), stagger: b.BS });
        break;
      case 'SHAPE':
        w.stage.shape[b.M] = { cid: b.C, bytes: Number(b.A) };
        break;
      case 'ATTACH':
        w.stage.attach[b.M] = b.N;
        break;
      case 'TEXT':   /* free text: the hex of its UTF-8, by group, part and which of the part's words */
        into(w.stage.text, b.R, b.M)[b.I] = b.HX;
        break;
      case 'ROWS':
        (w.stage.rows[b.M] || (w.stage.rows[b.M] = [])).push([Number(b.O), Number(b.A)]);
        break;
      case 'SPAN':
        into(w.stage.span, b.R)[b.N] = num(b.D);
        break;
      case 'ITEM':
        (w.stage.items[b.R] || (w.stage.items[b.R] = [])).push({ id: Number(b.I), part: b.M, first: Number(b.O), count: Number(b.A), parent: b.P == null ? null : Number(b.P),
          at: b.D == null ? 0 : num(b.D), stagger: b.T == null ? 0 : num(b.T), dur: b.V == null ? 0 : num(b.V) });
        break;
      case 'FOLD':
        into(w.stage.fold, b.R)[b.M] = num(b.V);
        break;
      case 'SPOT':
        into(w.stage.spots, b.R)[b.N] = [num(b.X), num(b.Y), num(b.Z)];
        break;
      case 'NAMES':
        w.stage.names[b.R] = { cid: b.C, bytes: Number(b.A) };
        break;
      case 'CAM':
        (w.stage.cam[b.R] || (w.stage.cam[b.R] = [])).push({ frame: Number(b.A), dist: num(b.D), elev: num(b.H), yaw: num(b.U) });
        break;
      default:
        /* the reader accepted the kind, so this is a record kind newer than this decoder: it is kept out of the
           typed state rather than guessed at */
        break;
    }
  }
  for (const list of Object.values(w.stage.drv)) list.sort((x, y) => x.at - y.at);
  return w;
}

/* one request for the records. world.flx has a fixed name, so the browser must ask the server each time (no-cache): with force-cache an old copy named blob cids that a later encode had removed, and the world turned itself off (2026-10-30, in the owner's browser only). Blobs named by cid keep force-cache: their bytes never change. */
export async function fetchWorld() {
  const res = await fetch(worldPath('world.flx'), { cache: 'no-cache' });
  if (!res.ok) throw new Error('world.flx: ' + res.status);
  return decodeText(swapGroup(await res.text()));
}
/* a test switch: ?wswap=<group cid now>:<older group cid>:<its bytes> draws an older copy of a view's group in its place.
   It exists so the owner can see what an unused file in world/ looked like (scripts/world-unused-page.mjs); without
   the key the text is unchanged */
function swapGroup(text) {
  const m = typeof location === 'object' && /[?&#]wswap=([0-9a-f]{64}):([0-9a-f]{64}):(\d+)/.exec(location.search + location.hash);
  return m ? text.replace(new RegExp('C' + m[1] + '-A\\d+', 'g'), 'C' + m[2] + '-A' + m[3]) : text;
}

/* a frame blob by content id: immutable by construction, so the cache may keep it for ever */
const blobs = new Map();
export function fetchBlob(cid) {
  if (!blobs.has(cid)) {
    blobs.set(cid, fetch(worldPath(cid + '.bin'), { cache: 'force-cache' }).then((res) => {
      if (!res.ok) throw new Error(cid + '.bin: ' + res.status);
      return res.arrayBuffer();
    }));
  }
  return blobs.get(cid);
}

/* the items' words (a NAMES record's blob, tab separated text, one line per item or tag): the lines parsed into the maps the stage
   asks. item lines are keyed "<item>:<instance or *>"; tag lines by id. */
/* a words file's text by content id, requested once per page: its bytes never change. The board's warm-up asked for every
   loaded group's words again after each group (2026-10-30: the same file 29 times in 6 s). A failed request is
   forgotten, so a later call may try again. Each caller parses its own copy, so no caller sees another's changes. */
const texts = new Map();
function textOf(cid) {
  if (!texts.has(cid)) texts.set(cid, fetch(worldPath(cid + '.txt'), { cache: 'force-cache' }).then((res) => {
    if (!res.ok) throw new Error(cid + '.txt: ' + res.status);
    return res.text();
  }).catch((e) => { texts.delete(cid); throw e; }));
  return texts.get(cid);
}
export async function fetchNames(cid) {
  const items = new Map(), tags = [];
  for (const line of (await textOf(cid)).split('\n')) {
    if (!line) continue;
    const c = line.split('\t');
    if (c[0] === 'item') items.set(c[1] + ':' + c[2], { item: Number(c[1]), name: c[3], act: c[4], hook: c[5], arg: c[6], view: c[7], key: c[8], value: c[9] });
    else if (c[0] === 'tag') tags.push({ id: c[1], title: c[2], sub: c[3], small: c[4] === 'small', at: c[5] });
  }
  return { items, tags };
}

/* a group's records (world/<cid>.flx), read into the world once: the records of the chain views and the ring view. A group is fetched the first time the
   camera flies to one of its views, so the first request stays the size it was. */
const groupsRead = new Map();
export function fetchGroup(w, view) {
  const g = w.groups[view];
  if (!g) return Promise.resolve(false);
  if (!groupsRead.has(g.cid)) groupsRead.set(g.cid, fetch(worldPath(g.cid + '.flx'), { cache: 'force-cache' }).then((res) => {
    if (!res.ok) throw new Error(g.cid + '.flx: ' + res.status);
    return res.text();
  }).then((text) => { decodeInto(w, text); return true; }));
  return groupsRead.get(g.cid);
}
/* a text blob of tab separated lines, as arrays of columns (the chain group's words) */
export async function fetchLines(cid) {
  return (await textOf(cid)).split('\n').filter(Boolean).map((l) => l.split('\t'));
}

/* the instance a part starts with, read from the blob: the host reads the ground plate's centre and radius this
   way (16 floats per instance, the translation in floats 9..11, the x scale in floats 0..2), so nothing about the
   kernel's place is typed into the decoder; with an index, that instance of the part (the marks' quads) */
export function firstInstance(buffer, part, index) {
  const f = new Float32Array(buffer, part.offset + (index || 0) * 64, 16);
  const sx = Math.hypot(f[0], f[1], f[2]);
  return { x: f[9], y: f[10], z: f[11], scale: sx, tone: f[12], family: f[13], mix: f[14], alpha: f[15] };
}
