/* The world's palette: the 22 tones the fxn-3d world look lights by (WORLD.tones), read from the live theme tokens, and one token as a linear
   colour for a part that names its role. Moved out of world2-host.mjs on 2026-11-05 so the host and the object previews (previews/) read the
   theme the same way, from one copy. HSL channels on the box ("210 18% 72%"), to sRGB, to linear; a missing token draws its fallback.
   Laws 71-77 (docs/PRODUCT-DESIGN-LAWS.md): a part's colour is a role (base --primary, its neighbour steps, the complement once, a meaning
   token), never a colour of its own, so a theme change repaints every object. */

/* in the palette order of CONTRACT.md. Tone 7, the hub, is identity leaned to strong by .25. */
export const TOKENS = [['--chain-identity', '#bcc3c8'], ['--chain-resolver', '#667e88'], ['--chain-token', '#525a5d'], ['--chain-pool', '#8e8a9f'], ['--chain-network', '#378f7c'], ['--chain-ledger', '#3aa88a'], ['--chain-other', '#525a5d'], null,
  ['--signal', '#3fd1a8'], ['--text-muted', '#9aa3a8'], ['--canvas', '#0a100d'], ['--record', '#e6e1d8'], ['--text-strong', '#f3f8f4'], ['--text', '#c3cdd6'], ['--net-fxn', '#3d8f7c'], ['--net-deark', '#b5764a'], ['--net-cr3tv', '#b07890'], ['--ember', '#f7752a'],
  /* 18 and 19, the halo's glass (glass-kit.js color(): the base and its deep tone, laws 71-74) */
  ['--primary', '#ff8e59'], ['--primary-300', '#5a3424'],
  /* 20, the auth stage's warning (auth-stage.js: the glow and a bead turn to --danger as a state goes bad) */
  ['--danger', '#d26a5f'],
  /* 21, the identity steps' Partial: a dashed honey edge, never solid (the SDK token --drift, honey, review) */
  ['--drift', '#e8b55a']];

export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) / 360; s /= 100; l /= 100;
  const f = (n) => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return [f(0), f(8), f(4)];
}
const hexToRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
export const toLinear = (c) => (c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4));

/* one token as a linear colour; fallback is a #rrggbb drawn when the theme does not define the token */
export function tokenLinear(box, name, fallback) {
  const v = getComputedStyle(box).getPropertyValue(name).trim();
  const p = v ? v.split(/\s+/) : null;
  const rgb = p && p.length >= 3 && Number.isFinite(parseFloat(p[0])) ? hslToRgb(parseFloat(p[0]), parseFloat(p[1]), parseFloat(p[2])) : hexToRgb(fallback || '#888888');
  return rgb.map(toLinear);
}

/* the 22 tones, 66 floats, for R.setPalette */
export function readPalette(box) {
  const out = new Float32Array(66), tok = (i) => tokenLinear(box, TOKENS[i][0], TOKENS[i][1]);
  for (let i = 0; i < 22; i++) {
    let c;
    if (i === 7) { const a = tok(0), b = tok(12); c = [a[0] + (b[0] - a[0]) * .25, a[1] + (b[1] - a[1]) * .25, a[2] + (b[2] - a[2]) * .25]; } else c = tok(i);
    out[i * 3] = c[0]; out[i * 3 + 1] = c[1]; out[i * 3 + 2] = c[2];
  }
  return out;
}
