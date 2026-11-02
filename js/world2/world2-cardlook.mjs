/* World grammar, the world's materials and type, taken from the FXN ID card (owner, 2026-10-31: "raise the illustration to the card's level").
   Layer: app. The visual rules are written down in docs/design/auth/FXN-ID-CARD.md ("The card's visual rules"); this file is where the world
   reads them, once, so every view that draws through the mesh pass (the chain views' tiles and links, the identity steps' blocks and glass,
   the auth stage's cubes and status panels) takes the same surfaces. A material is the mesh pass's own (fxn-3d engine/render/pieces.mjs:
   metal, rough, coat, coatRough, env, opacity); nothing here is a shader.

   Why these numbers. The card is satin metal with a clear coat: its plates catch the key on their bevels as a thin bright line and
   reflect the room, instead of the flat matte the world's tiles had (metal .08, rough .6). Its glass is clear with a tight coat. Its
   accents are light, never paint, so no material here carries a colour: colour comes from the theme through the palette, as the card's
   accent does. Kit and Sites panes keep the numbers their own records carry (world/kit.flx MAT, the sites' pane records). */

/* the card's plates: satin metal under a clear coat (record tiles, identity blocks) */
export const SATIN = Object.freeze({ metal: .35, rough: .42, coat: .5, coatRough: .12, env: 1 });
/* the card's rails and pins: brighter metal, a tighter highlight (links between records) */
export const RAIL = Object.freeze({ metal: .55, rough: .34, coat: .2, coatRough: .2, env: 1 });
/* the card's stamp: a darker, harder metal (your key's hex) */
export const STAMP = Object.freeze({ metal: .6, rough: .32, coat: .45, coatRough: .14, env: 1 });
/* loose metal cubes round the card (the auth stage's cubes): polished, the room in them, see-through only at the edge of the pass */
export const CUBE = Object.freeze({ metal: .7, rough: .28, coat: .35, coatRough: .1, env: 1, opacity: .999 });
/* clear glass with a tight coat (earlier versions' panes, an identity step's glass) */
export const GLASS = Object.freeze({ metal: .04, rough: .14, coat: .5, coatRough: .08, env: .45, opacity: .999 });
/* the record's black shell: a near-mirror coat over black */
export const SHELL = Object.freeze({ metal: 0, rough: .06, coat: 1, coatRough: .02, env: .45, opacity: .999 });
/* a glass status panel with ports (the auth stage's panels, an identity step's glass plate): crisp coat, the room on its face */
export const PANEL = Object.freeze({ metal: .1, rough: .18, coat: .9, coatRough: .06, env: .9, opacity: .999 });
/* the page slab and its rim: matte, so the words on it read; the rim a satin line */
export const SLAB = Object.freeze({ metal: .08, rough: .72, coat: .15, coatRough: .45, env: .35 });
export const SLAB_RIM = Object.freeze({ metal: .3, rough: .36, coat: .2, coatRough: .2, env: .8 });

/* The card's type: the site's own three font slots (docs/PRODUCT-DESIGN-LAWS.md 78-83), read from the theme so a canvas the world paints
   (a status panel, a record plate) sets its words in the same faces as the page and the card's prints. The fallbacks are what the slots
   resolve to when a page has no theme yet. */
const SLOT_FALLBACK = { mono: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace', sans: 'system-ui, sans-serif', display: 'Georgia, serif' };
export function fontOf(slot) {
  const v = typeof document !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue('--font-' + slot).trim() : '';
  return v || SLOT_FALLBACK[slot];
}
/* a theme token (HSL channels) as a CSS colour for a canvas, with its alpha */
export function inkOf(name, alpha, fallback) {
  const v = typeof document !== 'undefined' ? getComputedStyle(document.body || document.documentElement).getPropertyValue(name).trim() : '';
  if (!v) return fallback;
  const p = v.split('/')[0].trim().split(/\s+/);
  return 'hsla(' + p[0] + ', ' + p[1] + ', ' + p[2] + ', ' + (alpha == null ? 1 : alpha) + ')';
}
/* the card's label: mono, upper case, tracked .14em, in the accent, with a short rule under it (fxn-id-card.css .fxn-idc-label, .fxn-idc-rule) */
export function paintLabel(g, text, x, y, px, accent) {
  g.font = '600 ' + px + 'px ' + fontOf('mono');
  if ('letterSpacing' in g) g.letterSpacing = (px * .14).toFixed(1) + 'px';
  g.fillStyle = accent; g.textBaseline = 'middle';
  g.fillText(String(text).toUpperCase(), x, y);
  g.fillRect(x, y + px * .85, px * 1.6, Math.max(2, px * .09));
}

/* The network's own parts (the frame blob every view draws: the rings' tiles, the links between rings, the floating cubes) as the lit
   program draws them with a surface (fxn-3d engine/render/world.mjs p.mat, world-shaders.mjs shineOf, 2026-10-31): roughness, clear coat,
   metalness, the bevel line (the part's own colour a third of the way to the theme's hue) and, on the links, the light that travels along
   them. The host gives each frame part its entry once, when the frame is mounted (world2-host.mjs start). A part not named here keeps the
   engine's plain look. */
export const FRAME = Object.freeze({
  /* a ring's tiles drawn as the card's plates: wider, taller and thicker than the unit tile (box), so the ring reads as plates at home's distance */
  tile: Object.freeze({ rough: .28, coat: .6, metal: .5, edge: 1, box: Object.freeze([1.22, 1.12, 1.7]) }),
  link: Object.freeze({ rough: .3, coat: .3, metal: .6, edge: .5, flow: 1 }),
  cube: Object.freeze({ rough: .28, coat: .5, metal: .6, edge: .8 }),
  line: Object.freeze({ flow: .8 }),
  /* the dotted links between the rings: light runs along them (world-shaders.mjs DOT_VERT uFlowD) */
  dot: Object.freeze({ flow: 1 }),
  /* the round mark's disc (world2-hubmark.mjs): the same plate, with no box bevel */
  solid: Object.freeze({ rough: .34, coat: .7, metal: .55, edge: 0 })
});
/* how bright a view's edges and travelling light run (the look's edgeGain times this): /auth's card is the hero, so the rings round it are calmer */
export const EDGE_OF_VIEW = Object.freeze({ auth: .35 });
/* the kernel's stacked plates per view (the look's hubStack times this): on /auth the FXN ID card stands on the kernel and is the hero, so the kernel stays the flat plate there */
export const HUB_OF_VIEW = Object.freeze({ auth: 0 });
/* the light along the links runs when a view arrives and then settles (workspace law: animations settle): in over FLOW_IN ms, held, and out
   over FLOW_OUT ms, FLOW_MS after the arrival. The world asks for no frame once it is out. */
export const FLOW_MS = 9000, FLOW_IN = 600, FLOW_OUT = 1600;
