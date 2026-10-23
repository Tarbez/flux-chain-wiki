/* =====================================================================
   FOLD + CONTRAST SWEEP -- the owner's fold rule and three legibility
   floors, measured at rest on every catalog route and on the CMS editor.

   Why this exists: no test in the repo asserted a fold ratio or a contrast;
   every such row of docs/ux-audit/ledger.md was UNVERIFIED because the only
   evidence was an agent's report in a test header. Conversion to Ark blocks
   made the structure plausible; only measuring the rendered box tells.

   For each route in ArkUI.pageCatalog (read off the live page, never a hand
   list) at 1440x900 and 390x844, once the router is idle:
   (a) fold      page height / viewport height <= 1.6 (the owner's rule: a page
                 is at most 1.6x the viewport at rest; content a reader opens on
                 purpose may exceed it). Page height is the scroll height of the
                 mounted [data-ark-page] element (the page scrolls inside its
                 scene, not the document) or of the document, whichever is larger.
   (b) text      WCAG contrast of every visible text node against its effective
                 background: the element's ancestors are composited from the
                 first opaque background down (a gradient counts as every one of
                 its colour stops: the worst stop decides). >= 4.5:1, or >= 3:1
                 for large text (>= 24px, or >= 18.66px and bold).
   (c) controls  WCAG 1.4.11: a button / input / select / textarea / tab / toggle
                 that draws a boundary (border, ring shadow or fill) must have
                 that boundary at >= 3:1 against the background beside it; the
                 best of border / ring / fill counts. A text field or select with
                 NO boundary at all is a violation; a button with none is
                 borderless (its text identifies it, and (b) holds that text).
   (d) font size the smallest RENDERED size (computed size x the scale of every
                 transformed ancestor) of any text: floor 12px, except inside SVG
                 drawings and aria-hidden decoration.
   The CMS editor (/admin -> admin-app.html, through harness gotoEditor/appFrame)
   gets (b)-(d) at 1440x900 and 390x844 in three states of its chrome: at rest,
   with the rail open on Pages, and with the More menu open.

   RULES. A route that fails to load is reported NOT LOADED and fails the run: absent
   is not a pass. A text run drawn over an image background cannot be computed;
   it is counted "not measurable", never as a pass or a failure. Every reading goes
   to docs/ux-audit/fold-contrast-readings.tsv (evidence: regenerate only by
   running this driver; a filtered run writes nowhere unless FOLD_SWEEP_TSV names a file).
   The run PASSES when no violation is left outside
   docs/ux-audit/fold-contrast-allowlist.tsv (check, route, viewport, selector, reason;
   it starts empty, a row without a reason is refused).

   Run by hand (needs Chromium; not part of scripts/run-tests.mjs), ONE test at a time:
     node tests/browser/fold-contrast-sweep.mjs
   FOLD_SWEEP_ONLY=stats,zero limits it to some catalog ids; FOLD_SWEEP_EDITOR=0 skips the editor.
   ===================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { copySite, startHost, routeSettled, scaled, gotoEditor, appFrame, openRailTab, openAccountMenu, animationsSettled, nextFrames } from './harness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AUDIT = path.resolve(HERE, '..', '..', 'docs', 'ux-audit');
export const TSV_PATH = path.join(AUDIT, 'fold-contrast-readings.tsv');
export const ALLOWLIST_PATH = path.join(AUDIT, 'fold-contrast-allowlist.tsv');

export const VIEWPORTS = [[1440, 900], [390, 844]];
export const THRESHOLDS = Object.freeze({ fold: 1.6, text: 4.5, large: 3, control: 3, font: 12 });
const CONCURRENCY = 2;
const COLUMNS = ['check', 'status', 'route', 'viewport', 'selector', 'measured', 'threshold', 'count', 'detail'];

/* ---------------------------------------------------------------------------------------------
   The in-page measurement. It is serialised into the page (and into the editor frame), so it
   closes over nothing: every helper is inside. Returns plain data.
   --------------------------------------------------------------------------------------------- */
export function measureDocument(opts) {
  const T = opts.thresholds;
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'OPTION', 'TITLE', 'HEAD']);
  /* ---- colour ---- */
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const pcache = new Map();
  function parse(str) {
    if (pcache.has(str)) return pcache.get(str);
    let v;
    const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(str);
    if (m) v = [+m[1], +m[2], +m[3], m[4] == null ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])];
    else if (str === 'transparent' || str === '') v = [0, 0, 0, 0];
    else {
      cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = str; cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data; v = [d[0], d[1], d[2], d[3] / 255];
    }
    pcache.set(str, v); return v;
  }
  const over = (top, a, bottom) => [top[0] * a + bottom[0] * (1 - a), top[1] * a + bottom[1] * (1 - a), top[2] * a + bottom[2] * (1 - a)];
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const dedupe = (list) => { const seen = new Set(), out = []; for (const c of list) { const k = c.map(Math.round).join(','); if (!seen.has(k)) { seen.add(k); out.push(c); } } return out.slice(0, 12); };
  const worst = (fgs, bgs) => { let min = Infinity, at = null; for (const f of fgs) for (const b of bgs) { const r = ratio(f, b); if (r < min) { min = r; at = [f, b]; } } return { r: min, fg: at[0], bg: at[1] }; };

  /* ---- what is painted behind an element's content: a list of candidate opaque colours ----
     (one, or one per colour stop of a gradient); img = a url() image sits in the stack and
     the colour cannot be computed. Opacity scales an element's own background. */
  const paints = new Map();
  function paint(el) {
    if (paints.has(el)) return paints.get(el);
    const parent = el.parentElement;
    const base = parent ? paint(parent) : { cands: [[255, 255, 255]], img: false };
    const cs = getComputedStyle(el);
    const op = parseFloat(cs.opacity); const opacity = Number.isNaN(op) ? 1 : op;
    let cands = base.cands, img = base.img;
    const bg = parse(cs.backgroundColor), a = bg[3] * opacity;
    if (a > 0) cands = dedupe(cands.map((c) => over(bg, a, c)));
    const bi = cs.backgroundImage;
    if (bi && bi !== 'none') {
      const stops = bi.match(/(?:rgba?|hsla?|color|oklch|oklab|lab|lch)\([^()]*(?:\([^()]*\)[^()]*)*\)/g);
      if (/gradient\(/.test(bi) && stops) {
        const next = [];
        for (const s of stops) { const c = parse(s), ca = c[3] * opacity; for (const b of cands) next.push(ca > 0 ? over(c, ca, b) : b); }
        cands = dedupe(next.concat(cands));
      }
      if (/url\(/.test(bi)) img = true;
    }
    const out = { cands, img }; paints.set(el, out); return out;
  }
  const opacities = new Map();
  function groupOpacity(el) {
    if (!el) return 1;
    if (opacities.has(el)) return opacities.get(el);
    const o = parseFloat(getComputedStyle(el).opacity), v = (Number.isNaN(o) ? 1 : o) * groupOpacity(el.parentElement);
    opacities.set(el, v); return v;
  }
  const scales = new Map();
  function scaleOf(el) {
    if (!el) return 1;
    if (scales.has(el)) return scales.get(el);
    let s = scaleOf(el.parentElement);
    const t = getComputedStyle(el).transform;
    if (t && t !== 'none') { try { const m = new DOMMatrix(t); const d = Math.abs(m.m11 * m.m22 - m.m12 * m.m21); if (d > 0) s *= Math.sqrt(d); } catch { /* unparsable transform: leave the scale alone */ } }
    scales.set(el, s); return s;
  }
  /* the rectangle overflow:hidden/clip ancestors leave visible (null = unbounded) */
  const clips = new Map();
  function clipOf(el) {
    if (!el || el === document.documentElement) return null;
    if (clips.has(el)) return clips.get(el);
    const up = clipOf(el.parentElement);
    const cs = getComputedStyle(el);
    const hides = (v) => v === 'hidden' || v === 'clip';
    let box = up;
    if (hides(cs.overflowX) || hides(cs.overflowY)) {
      const r = el.getBoundingClientRect();
      const mine = { l: hides(cs.overflowX) ? r.left : -Infinity, r: hides(cs.overflowX) ? r.right : Infinity, t: hides(cs.overflowY) ? r.top : -Infinity, b: hides(cs.overflowY) ? r.bottom : Infinity };
      box = up ? { l: Math.max(up.l, mine.l), r: Math.min(up.r, mine.r), t: Math.max(up.t, mine.t), b: Math.min(up.b, mine.b) } : mine;
    }
    clips.set(el, box); return box;
  }
  const clippedAway = (el, r) => { const c = clipOf(el); return !!c && (Math.min(r.right, c.r) - Math.max(r.left, c.l) < 1 || Math.min(r.bottom, c.b) - Math.max(r.top, c.t) < 1); };
  const shown = (el) => { try { return el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }); } catch { return true; } };
  const inactive = (el) => !!el.closest('[disabled],[aria-disabled="true"],fieldset:disabled,[inert]');
  function sel(el) {
    const parts = [];
    for (let n = el, i = 0; n && n.nodeType === 1 && i < 3; n = n.parentElement, i++) {
      let s = n.tagName.toLowerCase();
      if (n.id && !/\d{3,}/.test(n.id)) { parts.unshift(s + '#' + n.id); break; }
      const cls = [...n.classList].filter((c) => !/\d/.test(c)).slice(0, 2);
      if (cls.length) s += '.' + cls.join('.');
      parts.unshift(s);
      if (n.parentElement === document.body || n.parentElement === document.documentElement) break;
    }
    return parts.join(' > ');
  }

  const out = { fold: null, text: { n: 0, notMeasurable: 0, ariaHidden: 0, min: null, rows: [] }, font: { n: 0, min: null, rows: [] }, controls: { n: 0, borderless: 0, native: 0, min: null, rows: [] } };

  /* ---- (a) fold ---- */
  if (opts.fold) {
    const el = document.querySelector(`[data-ark-page="${CSS.escape(opts.fold)}"]`);
    if (el) {
      const vh = innerHeight, h = Math.max(el.scrollHeight, document.documentElement.scrollHeight);
      out.fold = { ratio: Math.round(h / vh * 100) / 100, height: h, client: el.clientHeight, vh };
    }
  }

  /* ---- (b) + (d): every visible text node ---- */
  const byEl = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node; (node = walker.nextNode());) {
    const txt = node.nodeValue.trim(); if (!txt) continue;
    const el = node.parentElement; if (!el || SKIP.has(el.tagName)) continue;
    if (!shown(el)) continue;
    if (el.closest('[aria-hidden="true"]')) { out.text.ariaHidden++; continue; }
    if (inactive(el)) continue;
    const range = document.createRange(); range.selectNodeContents(node);
    const r = range.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    if (clippedAway(el, r)) continue;
    const rec = byEl.get(el);
    if (rec) { rec.count++; continue; }
    byEl.set(el, { count: 1, sample: txt.slice(0, 28) });
  }
  const textGroups = new Map(), fontGroups = new Map();
  for (const [el, rec] of byEl) {
    const cs = getComputedStyle(el), inSvg = !!el.closest('svg');
    const size = parseFloat(cs.fontSize), weight = parseInt(cs.fontWeight, 10) || 400;
    const rendered = size * scaleOf(el);
    out.text.n += rec.count;
    /* (d) font size: SVG drawings are exempt */
    if (!inSvg) {
      out.font.n += rec.count;
      if (out.font.min == null || rendered < out.font.min.size) out.font.min = { size: Math.round(rendered * 100) / 100, selector: sel(el) };
      if (rendered < T.font - 0.005) {
        const key = sel(el) + '|' + rendered.toFixed(2);
        const g = fontGroups.get(key) || { selector: sel(el), size: Math.round(rendered * 100) / 100, computed: size, count: 0, sample: rec.sample };
        g.count += rec.count; fontGroups.set(key, g);
      }
    }
    /* (b) contrast */
    let fgStr = inSvg ? cs.fill : (cs.webkitTextFillColor || cs.color);
    const clipText = (cs.webkitBackgroundClip || cs.backgroundClip) === 'text';
    const paintBox = paint(el);
    if (clipText || paintBox.img || !fgStr || fgStr === 'none' || /^url\(/.test(fgStr)) { out.text.notMeasurable += rec.count; continue; }
    const fg = parse(fgStr), alpha = fg[3] * groupOpacity(el);
    const fgs = paintBox.cands.map((b) => over(fg, alpha, b));
    const { r: ratioV, fg: fgW, bg: bgW } = worst(fgs, paintBox.cands);
    if (out.text.min == null || ratioV < out.text.min.ratio) out.text.min = { ratio: Math.round(ratioV * 100) / 100, selector: sel(el) };
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? T.large : T.text;
    if (ratioV < need - 0.005) {
      const key = sel(el) + '|' + hex(fgW) + '|' + hex(bgW);
      const g = textGroups.get(key) || { selector: sel(el), ratio: Math.round(ratioV * 100) / 100, need, large, fg: hex(fgW), bg: hex(bgW), size, weight, count: 0, sample: rec.sample };
      g.count += rec.count; textGroups.set(key, g);
    }
  }
  out.text.rows = [...textGroups.values()]; out.font.rows = [...fontGroups.values()];

  /* ---- (c) interactive control boundaries ---- */
  const CONTROLS = 'button,input,select,textarea,summary,[role="button"],[role="tab"],[role="switch"],[role="checkbox"],[role="radio"],[role="combobox"],a.btn,a[class*="btn"],a[class*="button"]';
  const FIELD = (el) => el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || (el.tagName === 'INPUT' && !/^(button|submit|reset|image|checkbox|radio|range|file|color|hidden)$/.test(el.type));
  const groups = new Map();
  for (const el of document.querySelectorAll(CONTROLS)) {
    if (el.tagName === 'INPUT' && el.type === 'hidden') continue;
    if (!shown(el) || el.closest('[aria-hidden="true"]') || inactive(el)) continue;
    const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || clippedAway(el, r)) continue;
    const cs = getComputedStyle(el);
    if (el.tagName === 'INPUT' && /^(checkbox|radio|range|file|color)$/.test(el.type) && cs.appearance !== 'none') { out.controls.native++; continue; }
    out.controls.n++;
    const parent = el.parentElement, adj = parent ? paint(parent) : { cands: [[255, 255, 255]], img: false };
    const own = paint(el);
    if (adj.img || own.img) { out.text.notMeasurable += 0; out.controls.native++; continue; }
    const op = groupOpacity(el);
    const indicators = [];
    /* fill: the control's own background against the one beside it (worst pair) */
    const fillDiffers = own.cands.length !== adj.cands.length || own.cands.some((c, i) => Math.abs(c[0] - adj.cands[i][0]) + Math.abs(c[1] - adj.cands[i][1]) + Math.abs(c[2] - adj.cands[i][2]) > 3);
    if (fillDiffers) { const w = worst(own.cands, adj.cands); indicators.push({ kind: 'fill', r: w.r, a: hex(w.fg), b: hex(w.bg) }); }
    /* border: the widest-contrast visible side, painted over the fill */
    let bestBorder = null;
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      const w = parseFloat(cs['border' + side + 'Width']), style = cs['border' + side + 'Style'];
      if (!(w >= 0.5) || style === 'none' || style === 'hidden') continue;
      const c = parse(cs['border' + side + 'Color']), a = c[3] * op; if (a <= 0) continue;
      const under = own.cands.length ? own.cands : adj.cands;
      const painted = under.map((b) => over(c, a, b));
      const k = worst(painted, adj.cands);
      if (!bestBorder || k.r > bestBorder.r) bestBorder = { kind: 'border', r: k.r, a: hex(k.fg), b: hex(k.bg) };
    }
    if (bestBorder) indicators.push(bestBorder);
    /* ring: a non-blurred box-shadow of >= 1px spread */
    if (cs.boxShadow && cs.boxShadow !== 'none') {
      for (const part of cs.boxShadow.split(/,(?![^(]*\))/)) {
        const col = part.match(/(?:rgba?|hsla?|color|oklch|oklab)\([^()]*(?:\([^()]*\)[^()]*)*\)/); if (!col) continue;
        const nums = part.replace(col[0], '').match(/-?[\d.]+px/g) || [];
        const [, , blur = '0px', spread = '0px'] = nums;
        if (parseFloat(blur) > 1 || parseFloat(spread) < 1) continue;
        const c = parse(col[0]), a = c[3] * op; if (a <= 0) continue;
        const k = worst(adj.cands.map((b) => over(c, a, b)), adj.cands);
        indicators.push({ kind: 'ring', r: k.r, a: hex(k.fg), b: hex(k.bg) });
      }
    }
    const best = indicators.length ? indicators.reduce((x, y) => (y.r > x.r ? y : x)) : null;
    if (!best) {
      if (FIELD(el)) {
        const key = sel(el) + '|none';
        const g = groups.get(key) || { selector: sel(el), ratio: 1, kind: 'none', count: 0, sample: (el.getAttribute('aria-label') || el.placeholder || el.textContent || '').trim().slice(0, 28), a: '', b: hex(adj.cands[0]) };
        g.count++; groups.set(key, g);
        if (out.controls.min == null || 1 < out.controls.min.ratio) out.controls.min = { ratio: 1, selector: sel(el) };
      } else out.controls.borderless++;
      continue;
    }
    if (out.controls.min == null || best.r < out.controls.min.ratio) out.controls.min = { ratio: Math.round(best.r * 100) / 100, selector: sel(el) };
    if (best.r < T.control - 0.005) {
      const key = sel(el) + '|' + best.kind + '|' + best.a + '|' + best.b;
      const g = groups.get(key) || { selector: sel(el), ratio: Math.round(best.r * 100) / 100, kind: best.kind, count: 0, sample: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 28), a: best.a, b: best.b };
      g.count++; groups.set(key, g);
    }
  }
  out.controls.rows = [...groups.values()];
  return out;
}


/* ---------------------------------------------------------------------------------------------
   Self-test: the instrument is proven on a page whose answers are known BEFORE it measures the
   site (a gate that has never been shown a failure measures nothing). Each fixture element has
   an id; EXPECT names what the measurement must say about it.
   --------------------------------------------------------------------------------------------- */
const FIXTURE = `<body style="margin:0;background:#fff;font:16px/1.4 sans-serif">
<p id="t-fail" style="color:#777">fails 4.5</p>
<p id="t-pass" style="color:#767676">passes 4.5</p>
<p id="t-large" style="color:#777;font-size:24px">large passes 3</p>
<p id="t-alpha" style="color:rgba(0,0,0,.4)">alpha fails</p>
<div style="background:#000"><div style="background:rgba(255,255,255,.1)"><p id="t-dark" style="color:#777">on dark</p></div></div>
<p id="t-grad" style="color:#888;background:linear-gradient(90deg,#fff,#000)">gradient worst stop</p>
<p id="t-op" style="color:#000;opacity:.3">dimmed by opacity</p>
<p id="t-hidden" style="color:#eee;display:none">not drawn</p>
<div style="overflow:hidden;height:0"><p id="t-clip" style="color:#eee">clipped away</p></div>
<p id="f-small" style="font-size:11px;color:#000">small</p>
<p id="f-ok" style="font-size:12px;color:#000">twelve</p>
<div style="transform:scale(.5);transform-origin:0 0"><p id="f-scaled" style="font-size:20px;color:#000;margin:0">scaled</p></div>
<svg width="100" height="30"><text id="f-svg" x="0" y="20" font-size="9" fill="#000">svg</text></svg>
<p aria-hidden="true"><span id="f-deco" style="font-size:9px;color:#eee">decor</span></p>
<button id="c-faint" style="border:1px solid #ddd;background:#fff;color:#000">faint</button>
<button id="c-strong" style="border:1px solid #767676;background:#fff;color:#000">strong</button>
<button id="c-bare" style="border:0;background:transparent;color:#000">bare</button>
<button id="c-fill" style="border:0;background:#222;color:#fff">fill</button>
<button id="c-ring" style="border:0;background:#fff;box-shadow:0 0 0 1px #767676;color:#000">ring</button>
<input id="c-field" style="border:0;background:transparent" aria-label="field">
</body>`;
const EXPECT = {
  'text-contrast': { violate: ['p#t-fail', 'p#t-alpha', 'p#t-dark', 'p#t-grad', 'p#t-op'], clean: ['p#t-pass', 'p#t-large', 'p#t-hidden', 'p#t-clip'] },
  'font-size': { violate: ['p#f-small', 'p#f-scaled'], clean: ['p#f-ok', 'text#f-svg', 'span#f-deco'] },
  'control-contrast': { violate: ['button#c-faint', 'input#c-field'], clean: ['button#c-strong', 'button#c-bare', 'button#c-fill', 'button#c-ring'] },
};
export async function selfTest(page) {
  await page.setContent(FIXTURE);
  const m = await page.evaluate(measureDocument, { thresholds: THRESHOLDS, fold: null });
  const got = { 'text-contrast': m.text.rows.map((g) => g.selector), 'font-size': m.font.rows.map((g) => g.selector), 'control-contrast': m.controls.rows.map((g) => g.selector) };
  const problems = [];
  for (const [check, want] of Object.entries(EXPECT)) {
    for (const s of want.violate) if (!got[check].some((g) => g === s || g.endsWith(s))) problems.push(`${check}: ${s} should violate and did not`);
    for (const s of want.clean) if (got[check].some((g) => g === s || g.endsWith(s))) problems.push(`${check}: ${s} should be clean and violated`);
  }
  if (m.controls.borderless !== 1) problems.push(`controls: expected exactly 1 borderless control, found ${m.controls.borderless}`);
  return problems;
}

/* ---------------------------------------------------------------------------------------------
   Rows, allowlist, TSV
   --------------------------------------------------------------------------------------------- */
const clean = (v) => String(v == null ? '' : v).replace(/[\t\r\n]+/g, ' ').trim();
const f2 = (n) => (Math.round(n * 100) / 100).toFixed(2);

/* Turn one page's raw measurement into TSV rows: a summary row per check (pass/violation/not measured, with the
   worst reading and how many things were measured) and one row per violating selector. */
export function rowsFor(route, vp, m, { withFold }) {
  const rows = [], T = THRESHOLDS;
  const add = (check, status, selector, measured, threshold, count, detail) => rows.push({ check, status, route, viewport: vp, selector, measured, threshold, count, detail });
  if (withFold) {
    if (!m.fold) add('fold', 'not-measured', '[data-ark-page]', '', '<=' + T.fold, '', 'the mounted page element was not found');
    else add('fold', m.fold.ratio > T.fold ? 'violation' : 'pass', '[data-ark-page]', f2(m.fold.ratio), '<=' + T.fold, '', `scrollHeight ${m.fold.height}px / viewport ${m.fold.vh}px (client ${m.fold.client}px)`);
  }
  const nViol = (list) => list.reduce((a, g) => a + 1, 0);
  add('text-contrast', m.text.rows.length ? 'summary-violation' : 'summary-pass', '*', m.text.min ? f2(m.text.min.ratio) : '', `>=${T.text} (large ${T.large})`, m.text.rows.length, `${m.text.n} text runs measured, ${m.text.notMeasurable} not measurable (image or gradient-clip background), ${m.text.ariaHidden} aria-hidden skipped; lowest at ${m.text.min ? m.text.min.selector : 'n/a'}`);
  for (const g of m.text.rows) add('text-contrast', 'violation', g.selector, f2(g.ratio), '>=' + g.need, g.count, `${g.large ? 'large ' : ''}text "${g.sample}" ${g.size}px/${g.weight} fg ${g.fg} on bg ${g.bg}`);
  add('control-contrast', m.controls.rows.length ? 'summary-violation' : 'summary-pass', '*', m.controls.min ? f2(m.controls.min.ratio) : '', '>=' + T.control, m.controls.rows.length, `${m.controls.n} controls measured, ${m.controls.borderless} borderless (text identifies them), ${m.controls.native} native or image-backed skipped; lowest at ${m.controls.min ? m.controls.min.selector : 'n/a'}`);
  for (const g of m.controls.rows) add('control-contrast', 'violation', g.selector, f2(g.ratio), '>=' + T.control, g.count, g.kind === 'none' ? `field "${g.sample}" draws no border, ring or fill (beside ${g.b})` : `${g.kind} ${g.a} against ${g.b} on "${g.sample}"`);
  add('font-size', m.font.rows.length ? 'summary-violation' : 'summary-pass', '*', m.font.min ? f2(m.font.min.size) : '', '>=' + T.font, m.font.rows.length, `${m.font.n} text runs outside SVG measured; smallest at ${m.font.min ? m.font.min.selector : 'n/a'}`);
  for (const g of m.font.rows) add('font-size', 'violation', g.selector, f2(g.size), '>=' + T.font, g.count, `text "${g.sample}" rendered ${f2(g.size)}px (computed ${f2(g.computed)}px)`);
  void nViol;
  return rows;
}

/* docs/ux-audit/fold-contrast-allowlist.tsv: check<TAB>route<TAB>viewport<TAB>selector<TAB>reason.
   '*' matches anything in route / viewport / selector. A row with no reason is refused. */
export function loadAllowlist(file = ALLOWLIST_PATH) {
  if (!fs.existsSync(file)) return [];
  const entries = [];
  fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (!line.trim() || line.trimStart().startsWith('#')) return;
    const [check, route, viewport, selector, ...reason] = line.split('\t');
    if (!check || !route || !viewport || !selector || !reason.join('\t').trim()) throw new Error(`${path.basename(file)}:${i + 1}: an allowlist row needs check, route, viewport, selector and a reason`);
    entries.push({ check: check.trim(), route: route.trim(), viewport: viewport.trim(), selector: selector.trim(), reason: reason.join('\t').trim(), used: 0 });
  });
  return entries;
}
export function allowed(entries, row) {
  const hit = entries.find((e) => e.check === row.check && (e.route === '*' || e.route === row.route) && (e.viewport === '*' || e.viewport === String(row.viewport)) && (e.selector === '*' || e.selector === row.selector));
  if (hit) hit.used++;
  return hit || null;
}
export const toTsv = (rows) => [COLUMNS.join('\t'), ...rows.map((r) => COLUMNS.map((c) => clean(r[c])).join('\t'))].join('\n') + '\n';

async function pool(items, size, fn) {
  const results = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) { const i = next++; results[i] = await fn(items[i], i); }
  }));
  return results;
}
const firstLine = (error) => String((error && error.message) || error).split('\n')[0];

async function main() {
  const only = process.env.FOLD_SWEEP_ONLY ? process.env.FOLD_SWEEP_ONLY.split(',') : null;
  const withEditor = process.env.FOLD_SWEEP_EDITOR !== '0' && !only;
  const filtered = !!only || !withEditor;
  const outFile = process.env.FOLD_SWEEP_TSV || (filtered ? null : TSV_PATH);
  const allowlist = loadAllowlist();
  const root = copySite(fs.mkdtempSync(path.join(os.tmpdir(), 'defxn-fold-contrast-')));
  const server = await startHost(root);
  const base = server.origin;
  const browser = await chromium.launch();
  const rows = [];
  try {
    /* the catalog as the live page builds it (articles, resolutions, theory sheets included) */
    const probe = await browser.newPage();
    await probe.goto(base + '/', { waitUntil: 'domcontentloaded' });
    await probe.waitForFunction(() => window.ArkUI && ArkUI.pageCatalog && ArkUI.pageRouter, null, { timeout: scaled(20000) });
    let routes = await probe.evaluate(() => Object.keys(ArkUI.pageCatalog).map((id) => ({ id, path: ArkUI.pageCatalog[id].path })));
    const bad = await selfTest(probe);
    if (bad.length) { console.log('SELF-TEST FAILED: the instrument is wrong, no site reading means anything:\n  ' + bad.join('\n  ')); process.exit(2); }
    console.log('self-test passed: the instrument flags the known failures and clears the known passes');
    await probe.close();
    if (only) routes = routes.filter((r) => only.includes(r.id));
    console.log(`${routes.length} catalog routes x ${VIEWPORTS.length} viewports${withEditor ? ' + the CMS editor' : ''}`);

    const jobs = [];
    for (const [width, height] of VIEWPORTS) for (const route of routes) jobs.push({ width, height, route });
    const done = await pool(jobs, CONCURRENCY, async ({ width, height, route }) => {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      try {
        await page.goto(base + route.path, { waitUntil: 'domcontentloaded' });
        await routeSettled(page, route.id);
        const m = await page.evaluate(measureDocument, { thresholds: THRESHOLDS, fold: route.id });
        const mine = rowsFor(route.path, width, m, { withFold: true });
        console.log(`ok   ${width} ${route.path} fold ${m.fold ? f2(m.fold.ratio) : 'n/a'}`);
        return mine;
      } catch (error) {
        console.log(`NOT LOADED ${width} ${route.path}: ${firstLine(error)}`);
        return [{ check: 'load', status: 'not-loaded', route: route.path, viewport: width, selector: '', measured: '', threshold: '', count: '', detail: firstLine(error) }];
      } finally { await context.close(); }
    });
    done.forEach((list, i) => { void i; rows.push(...list); });

    if (withEditor) {
      for (const [width, height] of VIEWPORTS) {
        const context = await browser.newContext({ viewport: { width, height } });
        const page = await context.newPage();
        const states = [['editor:rest', async () => {}], ['editor:rail', async (app) => { await openRailTab(app, 'pages'); }], ['editor:more', async (app) => { await openAccountMenu(app); }]];
        let app = null;
        try {
          await gotoEditor(page, base);
          app = await appFrame(page);
        } catch (error) {
          for (const [name] of states) rows.push({ check: 'load', status: 'not-loaded', route: name, viewport: width, selector: '', measured: '', threshold: '', count: '', detail: firstLine(error) });
          console.log(`NOT LOADED ${width} editor: ${firstLine(error)}`);
          await context.close(); continue;
        }
        for (const [name, open] of states) {
          try {
            await open(app);
            await animationsSettled(app); await nextFrames(app, 2);
            const m = await app.evaluate(measureDocument, { thresholds: THRESHOLDS, fold: null });
            rows.push(...rowsFor(name, width, m, { withFold: false }));
            console.log(`ok   ${width} ${name}`);
          } catch (error) {
            rows.push({ check: 'load', status: 'not-loaded', route: name, viewport: width, selector: '', measured: '', threshold: '', count: '', detail: firstLine(error) });
            console.log(`NOT LOADED ${width} ${name}: ${firstLine(error)}`);
          }
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(root, { recursive: true, force: true });
  }

  /* deterministic order: check family, then viewport (wide first), then route, summaries before their rows */
  const order = { fold: 0, 'text-contrast': 1, 'control-contrast': 2, 'font-size': 3, load: 4 };
  const rank = (r) => (r.status.startsWith('summary') ? 0 : 1);
  const routeIndex = new Map();
  rows.forEach((r) => { if (!routeIndex.has(r.route)) routeIndex.set(r.route, routeIndex.size); });
  rows.forEach((r, i) => { r._i = i; });
  rows.sort((a, b) => (order[a.check] - order[b.check]) || (VIEWPORTS.findIndex(([w]) => w === a.viewport) - VIEWPORTS.findIndex(([w]) => w === b.viewport)) || (routeIndex.get(a.route) - routeIndex.get(b.route)) || (rank(a) - rank(b)) || (a._i - b._i));
  rows.forEach((r) => { delete r._i; });

  /* allowlist */
  for (const r of rows) if (r.status === 'violation') { const hit = allowed(allowlist, r); if (hit) { r.status = 'allowed'; r.detail += ` [allowlisted: ${hit.reason}]`; } }
  if (outFile) { fs.writeFileSync(outFile, toTsv(rows)); console.log(`\nwrote ${rows.length} readings to ${path.relative(process.cwd(), outFile) || outFile}`); }
  else console.log('\nfiltered run: no TSV written (set FOLD_SWEEP_TSV to keep one)');

  /* report */
  const violations = rows.filter((r) => r.status === 'violation');
  const notLoaded = rows.filter((r) => r.status === 'not-loaded');
  const notMeasured = rows.filter((r) => r.status === 'not-measured');
  for (const r of violations) console.log(`VIOLATION ${r.check} ${r.viewport} ${r.route} [${r.selector}] measured ${r.measured} (threshold ${r.threshold})${r.count > 1 ? ` x${r.count}` : ''}: ${r.detail}`);
  for (const r of notLoaded) console.log(`NOT LOADED ${r.viewport} ${r.route}: ${r.detail}`);
  for (const r of notMeasured) console.log(`NOT MEASURED ${r.check} ${r.viewport} ${r.route}: ${r.detail}`);
  console.log('\n--- counts ---');
  for (const check of ['fold', 'text-contrast', 'control-contrast', 'font-size']) {
    const mine = rows.filter((r) => r.check === check && !r.status.startsWith('summary'));
    const v = mine.filter((r) => r.status === 'violation'), a = mine.filter((r) => r.status === 'allowed');
    const routesHit = new Set(v.map((r) => r.viewport + ' ' + r.route)).size;
    console.log(`${check.padEnd(17)} violations ${String(v.length).padStart(5)} (in ${routesHit} route-viewports), allowlisted ${a.length}`);
  }
  console.log(`not loaded ${notLoaded.length}, not measured ${notMeasured.length}`);
  for (const e of allowlist) if (!e.used) console.log(`unused allowlist row: ${e.check} ${e.route} ${e.viewport} ${e.selector}`);
  if (violations.length || notLoaded.length || notMeasured.length) {
    console.log(`\nFAIL: ${violations.length} violations outside the allowlist, ${notLoaded.length} not loaded, ${notMeasured.length} not measured.`);
    process.exit(1);
  }
  console.log('\nPASS: no fold, contrast or font-size violation outside the allowlist.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { console.error(error); process.exit(1); });
