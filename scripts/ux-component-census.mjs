#!/usr/bin/env node
/* =====================================================================
   UI COMPONENT CENSUS -- how much hand-built UI the site still carries.
   ---------------------------------------------------------------------
     node scripts/ux-component-census.mjs            print the table
     node scripts/ux-component-census.mjs --check    exit 1 if any count is ABOVE
                                                     docs/ux-audit/component-census-baseline.tsv
     node scripts/ux-component-census.mjs --ratchet  lower baseline values that went down;
                                                     never raises one
     node scripts/ux-component-census.mjs --init-baseline
                                                     write the baseline only if none exists
                                                     (first written 2026-10-19, Wave 0)

   Derives the pattern table of docs/ux-audit/components.md §2 instead of having it typed out:
   the audit's two scratch scans (pattern-family use counts, and distinct visual signatures per
   family) made repeatable, so each migration wave can prove it REDUCED duplication. The
   baseline only moves down. A wave that has a real reason to add a family member edits the
   TSV by hand and says why in the same change; --ratchet will not do it, because a regenerator
   that can raise a frozen number destroys the evidence it was frozen to keep.

   How to read the numbers (components.md §0):
     - uses are LOWER BOUNDS: a class counts only when it appears as a whole token inside a
       string literal (or an index.html class="") AND a css/*.css selector defines it; classes
       built by concatenation are missed.
     - signatures: distinct sets of visual declarations among a family's rules across css/,
       a proxy for how many different-looking versions of the pattern exist. A family with no
       signature definition reports "-" (not measured), never 0.
   Generated stylesheets are not hand-built UI and are skipped: css/themes.css and
   css/flux-themes.css for signatures (as in the audit), css/ark-blocks.css everywhere
   (Ark's own static block CSS, components.md §5 line 2).
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(SITE, 'docs', 'ux-audit', 'component-census-baseline.tsv');
const GENERATED_CSS = new Set(['ark-blocks.css']);
const SIGNATURE_SKIP_CSS = new Set(['themes.css', 'flux-themes.css', ...GENERATED_CSS]);

/* The audit's scan scope (components.md §0, "Use counts"). */
const JS_DIRS = ['js/pages', 'js/resolvers'];
const JS_FILES = ['js/ark/dash-kit.js', 'js/ark/story-diagrams.js', 'js/ark/reference-docs.js', 'js/main.js',
  'js/content/learnings.js', 'js/content/resolutions.js', 'js/content/resolver-block.js', 'api/lib/render-core.mjs'];
const HTML_FILES = ['index.html'];

/* Pattern families by class-name shape (use counts). */
export const USE_FAMILIES = {
  hero: /(^|-)hero($|-)|intro$|-lede|lead$/,
  eyebrow: /eyebrow|kicker|(^|-)label$|overline/,
  pill: /pill|chip|(^|-)tag($|-)|badge/,
  button: /(^|-)btn|button|(^|-)cta($|-)|(^|-)action($|s$)/,
  card: /card|tile(?!d)|(^|-)panel($|-)/,
  stat: /stat(?!e|us|ic)|metric|figure-value|(^|-)kpi|-num($|-)/,
  step: /step|stage(?!-)/,
  table: /table/,
  code: /(^|-)code($|-)|(^|-)pre($|-)|snippet|(^|-)kbd/,
  diagram: /diagram|(^|-)svg|figure|illustration|scene-frame/,
  tabs: /tab(s|list)?($|-)|(^|-)case($|s$)|picker|segmented/,
  accordion: /accordion|details|disclosure|faq|summary/,
  callout: /callout|(^|-)note($|-)|warning|notice|caution|aside|alert/,
  ctaRow: /actions($|-)|cta-row|button-row|-links$/,
  sectionHead: /section-(head|title|header|label|note|plain)|(^|-)heading($|-)/,
  breadcrumb: /breadcrumb|(^|-)back($|-)|crumb/,
  nextLinks: /(^|-)next($|-)|footer-links|(^|-)more($|-)|continue|(^|-)return$/,
  field: /field|input|(^|-)form($|-)|select/,
  toggle: /toggle|switch/,
  toast: /toast|snackbar/,
  modal: /modal|dialog|sheet|drawer|popover/,
  empty: /empty|skeleton|loading|spinner/,
};

/* Visual-signature families: which classes, and which declarations make two rules look different. */
export const SIGNATURE_FAMILIES = {
  eyebrow: { re: /(eyebrow|kicker|-label|section-label|chapter-label)$/, props: ['font-size', 'letter-spacing', 'text-transform', 'font-family', 'font-weight', 'color'] },
  pill: { re: /(pill|chip|-tag|badge)$/, props: ['border-radius', 'padding', 'font-size', 'background', 'background-color', 'border', 'font-family'] },
  card: { re: /(card|tile|-panel)$/, props: ['border-radius', 'padding', 'background', 'background-color', 'border', 'box-shadow'] },
  stat: { re: /(stat|metric|-stat-value|-metric-value|-num|-number)$/, props: ['font-size', 'font-family', 'font-weight', 'color', 'letter-spacing'] },
  sectionHead: { re: /(section-head|section-title|-heading|section-header)$/, props: ['font-size', 'font-family', 'font-weight', 'margin', 'letter-spacing'] },
  hero: { re: /(-hero|hero-copy|-intro|-lede)$/, props: ['padding', 'min-height', 'max-width', 'font-size', 'margin'] },
  step: { re: /(-step|-steps|-stage)$/, props: ['display', 'grid-template-columns', 'gap', 'padding', 'border', 'counter-increment'] },
  callout: { re: /(-note|-warning|callout|notice|aside)$/, props: ['font-size', 'color', 'border-left', 'border', 'background', 'background-color', 'padding'] },
  breadcrumb: { re: /(-back)$/, props: ['font-size', 'color', 'font-family', 'text-transform', 'letter-spacing', 'padding'] },
  nextLinks: { re: /(-next|-more|next-link|footer-links|-return)$/, props: ['font-size', 'padding', 'border', 'border-top', 'background', 'display'] },
  tabs: { re: /(-tabs|-tab|-picker|-cases|-case)$/, props: ['border-radius', 'padding', 'background', 'border', 'font-size', 'gap'] },
  table: { re: /(table)$/, props: ['border-collapse', 'font-size', 'font-family', 'width'] },
};

function walk(dir, ext, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir).sort()) {
    if (name === 'node_modules' || name === 'vendor' || name.startsWith('.')) continue;
    const file = path.join(dir, name);
    if (fs.statSync(file).isDirectory()) walk(file, ext, acc);
    else if (name.endsWith(ext)) acc.push(file);
  }
  return acc;
}

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Pure over the site directory: every measure as [measure, family, value]; value null = not measured. */
export function census(site = SITE) {
  const cssFiles = walk(path.join(site, 'css'), '.css').filter((file) => !GENERATED_CSS.has(path.basename(file)));
  const cssDefs = new Map(); // class -> css files defining it
  for (const file of cssFiles) {
    for (const m of stripComments(fs.readFileSync(file, 'utf8')).matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)) {
      if (!cssDefs.has(m[1])) cssDefs.set(m[1], new Set());
      cssDefs.get(m[1]).add(path.basename(file));
    }
  }
  const sources = [...JS_DIRS.flatMap((dir) => walk(path.join(site, dir), '.js')),
    ...JS_FILES.map((file) => path.join(site, file)).filter((file) => fs.existsSync(file))];
  const html = HTML_FILES.map((file) => path.join(site, file)).filter((file) => fs.existsSync(file));
  const uses = new Map(); // class -> use count
  const count = (token) => { if (cssDefs.has(token)) uses.set(token, (uses.get(token) || 0) + 1); };
  for (const file of [...sources, ...html]) {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      for (const m of line.matchAll(/(['"`])((?:(?!\1).){1,200})\1/g)) for (const token of m[2].split(/[\s.]+/)) count(token);
      if (file.endsWith('.html')) for (const m of line.matchAll(/class="([^"]+)"/g)) for (const token of m[1].split(/\s+/)) count(token);
    }
  }
  const rows = [];
  for (const [family, re] of Object.entries(USE_FAMILIES)) {
    const classes = [...cssDefs.keys()].filter((cls) => re.test(cls));
    const used = classes.filter((cls) => uses.get(cls));
    rows.push(['classes', family, classes.length]);
    rows.push(['used-classes', family, used.length]);
    rows.push(['uses', family, used.reduce((sum, cls) => sum + uses.get(cls), 0)]);
    rows.push(['css-files', family, new Set(classes.flatMap((cls) => [...cssDefs.get(cls)])).size]);
  }
  const signatureCss = cssFiles.filter((file) => !SIGNATURE_SKIP_CSS.has(path.basename(file)));
  const rules = signatureCss.map((file) => [path.basename(file), stripComments(fs.readFileSync(file, 'utf8')).replace(/@media[^{]*\{/g, '')]);
  for (const family of Object.keys(USE_FAMILIES)) {
    const def = SIGNATURE_FAMILIES[family];
    if (!def) { rows.push(['signatures', family, null]); continue; }
    const signatures = new Map();
    for (const [file, css] of rules) {
      for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const hit = m[1].split(',').map((s) => (s.trim().match(/\.([a-zA-Z][\w-]*)\s*$/) || [])[1]).filter((cls) => cls && def.re.test(cls));
        if (!hit.length) continue;
        const decl = {};
        for (const d of m[2].split(';')) {
          const i = d.indexOf(':');
          if (i < 0) continue;
          const key = d.slice(0, i).trim();
          if (def.props.includes(key)) decl[key] = d.slice(i + 1).trim().replace(/\s*!important/, '');
        }
        if (!Object.keys(decl).length) continue;
        const sig = def.props.filter((p) => decl[p]).map((p) => p + ':' + decl[p]).join('; ');
        if (!signatures.has(sig)) signatures.set(sig, new Set());
        signatures.get(sig).add(file);
      }
    }
    rows.push(['signatures', family, signatures.size]);
  }
  // Scale lines of §2 (hand-written css only): uppercase rules, and the distinct px values that
  // appear anywhere inside a *radius / font-size declaration (clamp() and multi-value shorthands
  // included). Defined here because the audit did not record its method: this definition gives
  // 117 / 17 / 66 on 2026-10-19 where the audit text says 117 / 27 / 64.
  const handCss = signatureCss.map((file) => stripComments(fs.readFileSync(file, 'utf8'))).join('\n');
  const pxValues = (re) => new Set([...handCss.matchAll(re)].flatMap((m) => [...m[1].matchAll(/([\d.]+)px/g)].map((x) => x[1]))).size;
  rows.push(['uppercase-rules', 'css', (handCss.match(/text-transform\s*:\s*uppercase/g) || []).length]);
  rows.push(['px-radius-values', 'css', pxValues(/radius\s*:\s*([^;}]+)/g)]);
  rows.push(['px-font-sizes', 'css', pxValues(/font-size\s*:\s*([^;}]+)/g)]);
  return rows;
}

const key = (measure, family) => measure + '\t' + family;

export function readBaseline(file = BASELINE) {
  const map = new Map();
  if (!fs.existsSync(file)) return map;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line || line.startsWith('#') || line.startsWith('measure\t')) continue;
    const [measure, family, value] = line.split('\t');
    map.set(key(measure, family), value === '-' ? null : Number(value));
  }
  return map;
}

function writeBaseline(rows, file = BASELINE) {
  const header = '# defxn hand-built UI census baseline -- scripts/ux-component-census.mjs --check fails if a value rises.\n' +
    '# Values only go down (--ratchet). "-" = not measured for that family. See docs/ux-audit/components.md §2.\n' +
    'measure\tfamily\tvalue\n';
  fs.writeFileSync(file, header + rows.map(([m, f, v]) => m + '\t' + f + '\t' + (v === null ? '-' : v)).join('\n') + '\n');
}

function printTable(rows) {
  const byFamily = new Map();
  for (const [measure, family, value] of rows) {
    if (!byFamily.has(family)) byFamily.set(family, {});
    byFamily.get(family)[measure] = value;
  }
  const cols = ['classes', 'used-classes', 'uses', 'css-files', 'signatures'];
  console.log(['family'.padEnd(12), ...cols.map((c) => c.padStart(12))].join(' '));
  for (const [family, m] of byFamily) {
    if (family === 'css') continue;
    console.log([family.padEnd(12), ...cols.map((c) => String(m[c] === null ? '-' : m[c]).padStart(12))].join(' '));
  }
  const css = byFamily.get('css') || {};
  console.log('\ncss: ' + css['uppercase-rules'] + ' text-transform:uppercase rules, ' + css['px-radius-values'] + ' distinct px border-radius values, ' + css['px-font-sizes'] + ' distinct px font sizes');
}

function main() {
  const args = process.argv.slice(2);
  const rows = census();
  if (args.includes('--init-baseline')) {
    if (fs.existsSync(BASELINE)) { console.error('[census] ' + path.relative(SITE, BASELINE) + ' exists; refusing to overwrite a frozen baseline (use --ratchet to lower it)'); process.exit(1); }
    writeBaseline(rows);
    console.log('[census] wrote ' + path.relative(SITE, BASELINE));
    return;
  }
  printTable(rows);
  if (!args.includes('--check') && !args.includes('--ratchet')) return;
  const baseline = readBaseline();
  if (!baseline.size) { console.error('[census] no baseline at ' + path.relative(SITE, BASELINE)); process.exit(1); }
  const grew = [], fell = [], unknown = [];
  for (const [measure, family, value] of rows) {
    const k = key(measure, family);
    if (!baseline.has(k)) { unknown.push(k.replace('\t', ' ')); continue; }
    const was = baseline.get(k);
    if (value === null || was === null) { if (value !== was) unknown.push(k.replace('\t', ' ') + ' (measured: ' + value + ', baseline: ' + was + ')'); continue; }
    if (value > was) grew.push(measure + ' ' + family + ': ' + was + ' -> ' + value);
    else if (value < was) fell.push([measure, family, value, was]);
  }
  if (args.includes('--ratchet')) {
    if (grew.length || unknown.length) { console.error('[census] refusing to ratchet while counts grew or measures changed:\n  ' + [...grew, ...unknown].join('\n  ')); process.exit(1); }
    const lowered = rows.map(([m, f, v]) => [m, f, v]);
    writeBaseline(lowered);
    console.log('[census] ratcheted ' + fell.length + ' value(s) down:\n  ' + fell.map(([m, f, v, was]) => m + ' ' + f + ': ' + was + ' -> ' + v).join('\n  '));
    return;
  }
  for (const [m, f, v, was] of fell) console.log('[census] down ' + m + ' ' + f + ': ' + was + ' -> ' + v + ' (run --ratchet to lock it in)');
  if (unknown.length) console.error('[census] measures differ from the baseline\'s set:\n  ' + unknown.join('\n  '));
  if (grew.length) console.error('[census] hand-built UI grew past the baseline:\n  ' + grew.join('\n  '));
  if (grew.length || unknown.length) process.exit(1);
  console.log('[census] ok: no count above ' + path.relative(SITE, BASELINE));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
