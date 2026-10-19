/* LAW: a live doc must not carry blockchain vocabulary.
 *
 * `docs/deprecated.md` is the ledger; this is its enforcement. It exists
 * because the work kept circling back to blockchain thinking while the
 * docs still carried blockchain words. Removing the vocabulary removes
 * the gravity, and a test is what keeps it removed.
 *
 * `docs/deprecated.md` itself is NOT scanned: naming the forbidden terms
 * is its entire function, and tokening all 37 of them would make the
 * ledger unreadable for no gain.
 *
 * Scope: the LIVE doc set declared below — the docs that describe what
 * the system is now. Frozen evidence records are deliberately out of
 * scope: BENCH-004 has to be able to say what it measured, and rewriting
 * a frozen record would destroy the evidence for the deprecation itself.
 *
 * If this fails: rewrite the sentence to the shard model. Do not reach
 * for the token unless the line is a historical statement about
 * something already retired.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

const ROOT = path.resolve(__dirname, '..');

/* Docs that describe the system as it is NOW. A new doc of this kind
 * belongs in this list; that is the point of the list being explicit
 * rather than a glob. */
const LIVE_DOCS = [
  'docs/fleet-plan-2026-10-10.md',
  'docs/resolver-audit.md',
  'docs/resolver-math.md',
  'docs/whitepaper.md',
  'docs/status.md',
  'docs/overview.md',
  'docs/glossary.md',
  'docs/explorer-local.md',
  'docs/finance-ledger-design.md',
  'docs/protocol/agreements.md',
  'docs/prototype-to-production.md',
  'docs/ux-storytelling-redesign-audit.md',
];

/* Deliberately NOT live, and each says so in its own first lines:
 *   docs/whitepaper-chain-era.md  — the previous edition, unedited
 *   docs/mainnet-readiness.md     — readiness inventory of the retired direction
 *   docs/evidence/*               — frozen records; BENCH-004 must be able to
 *                                   say what it measured
 * Rewriting a frozen record would destroy the evidence for the
 * deprecation itself. */

/* Terms are matched case-insensitively as whole words. Each carries the
 * replacement, because a refusal must name the remedy — "don't say TPS"
 * sends the reader nowhere. */
const FORBIDDEN = [
  ['committee', 'one shard signs; say "resolver shard"'],
  ['consensus', 'there is no agreement step; the shard signs'],
  ['validator', 'a replica STORES; an auditor judges later'],
  ['quorum', 'no agreement step; one shard signature is the result'],
  // TPS is the CORRECT unit for a transfer and always was. What is wrong
  // is TPS detached from transfers — used as a universal headline, or
  // applied to a swap. A swap is verify + auction + AMM + signature; a
  // transfer is one or two records. They are not comparable, so a rate
  // must say which operation it counts.
  //
  // Mechanically: TPS is allowed on a line that names the transfer it
  // counts, and flagged when it floats free.
  ['\\bTPS\\b(?![^\\n]*transfer)(?<![tT]ransfers?[^\\n]{0,40})', 'name the operation: "transfers/s" for a transfer; a swap is measured in swaps per batch auction'],
  ['accepted/s', 'swaps per batch auction, and batches/s'],
  ['admissions?/s', 'swaps per batch auction, and batches/s'],
  ['replica apps?\\b', 'a replica stores; it applies nothing'],
  ['replica applications?', 'a replica stores; it applies nothing'],
  ['segment shipping', 'a feed carries signed results'],
  ['durability layer', 'the signed result is the unit'],
  ['block time', 'batch latency'],
  ['finality', 'the shard signature IS the truth, at the moment it is made'],
  ['proof-of-work', 'not used'],
  ['proof-of-stake', 'Proof of Support, for storage allocation only'],
  ['gas fee', 'not used'],
  ['block reward', 'not used'],
];

const ALLOW = 'ALLOW-DEPRECATED-TERM';

/* A fenced code block or an inline backtick span may legitimately quote a
 * deprecated identifier that still exists in code (an env var, a struct
 * name). The law is about PROSE: prose asserts, code names. */
function proseLines(markdown) {
  const out = [];
  let inFence = false;
  markdown.split('\n').forEach((line, index) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    if (line.includes(ALLOW)) return;
    // Strip inline code spans before matching.
    out.push({ n: index + 1, text: line.replace(/`[^`]*`/g, '') });
  });
  return out;
}

/* The UI is the surface a visitor actually reads, so it is enforced too.
 * `reference-text.js` is EXCLUDED: it is generated, and it carries the
 * historical docs verbatim by design.
 *
 * Two JS-specific rules:
 *   - `//` comment lines are skipped. A comment explaining that a term was
 *     retired is the opposite of asserting it.
 *   - a slug or identifier may legitimately contain a retired word (a live
 *     published URL cannot be renamed without breaking inbound links), so
 *     those lines carry the ALLOW token and say why. */
const LIVE_UI = [
  'js/content/stats-highlights.js',
  'js/content/resolver-block.js',
  'js/content/resolver-algebra.js',
  'js/pages/resolver-math.js',
  'js/ark/dash-kit.js',
  'js/pages/stats.js',
  'js/pages/stats-ledger.js',
  'js/pages/stats-gpu.js',
  'js/pages/lifecycle.js',
];

function jsLines(source) {
  const out = [];
  let inBlock = false;
  source.split('\n').forEach((line, index) => {
    const trimmed = line.trim();
    // Track /* */ properly: a continuation line of a block comment does
    // not necessarily start with `*`, and an earlier version of this
    // function missed exactly that case.
    const opens = line.includes('/*');
    const closes = line.includes('*/');
    if (inBlock) {
      if (closes) inBlock = false;
      return;
    }
    if (opens && !closes) {
      inBlock = true;
      return;
    }
    if (opens && closes) return;
    if (trimmed.startsWith('//')) return;
    if (line.includes(ALLOW)) return;
    out.push({ n: index + 1, text: line });
  });
  return out;
}

/* HTML that carries prose directly. `index.html`'s <noscript>/fallback copy
 * is real, indexed, reader-facing text that no js/pages module covers, so it
 * would otherwise be the one live surface nobody scans.
 *
 * `resolver-math.html` was here until 2026-10-10, when that page became a
 * route of the site (js/pages/resolver-math.js, now in LIVE_UI). Standalone
 * pages are the exception; this list exists so the exception is still
 * covered. */
const LIVE_HTML = [
  'index.html',
];

/* Strip tags, HTML comments, and the inline <script>/<style> bodies. A
 * comment or a code literal naming a retired term is not an assertion;
 * rendered text is. Entities are left alone — a term written as an
 * entity would be a deliberate evasion, and none exists. */
function htmlLines(source) {
  const out = [];
  let inSkip = false;
  source.split('\n').forEach((line, index) => {
    if (/<(script|style)\b/i.test(line)) inSkip = true;
    const closing = /<\/(script|style)>/i.test(line);
    if (inSkip) {
      if (closing) inSkip = false;
      return;
    }
    if (line.includes(ALLOW)) return;
    const text = line
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]*>/g, ' ');
    if (text.trim()) out.push({ n: index + 1, text });
  });
  return out;
}

const findings = [];
let scanned = 0;

for (const relative of LIVE_DOCS) {
  const file = path.join(ROOT, relative);
  if (!fs.existsSync(file)) {
    findings.push(`${relative}: declared LIVE but missing — add it or remove it from the list`);
    continue;
  }
  scanned += 1;
  const lines = proseLines(fs.readFileSync(file, 'utf8'));
  for (const { n, text } of lines) {
    for (const [pattern, remedy] of FORBIDDEN) {
      const re = new RegExp(pattern, 'i');
      if (re.test(text)) {
        findings.push(`${relative}:${n}: "${re.exec(text)[0]}" — ${remedy}\n      ${text.trim().slice(0, 110)}`);
      }
    }
  }
}

for (const relative of LIVE_UI) {
  const file = path.join(ROOT, relative);
  if (!fs.existsSync(file)) {
    findings.push(`${relative}: declared LIVE UI but missing`);
    continue;
  }
  scanned += 1;
  for (const { n, text } of jsLines(fs.readFileSync(file, 'utf8'))) {
    for (const [pattern, remedy] of FORBIDDEN) {
      const re = new RegExp(pattern, 'i');
      if (re.test(text)) {
        findings.push(`${relative}:${n}: "${re.exec(text)[0]}" — ${remedy}\n      ${text.trim().slice(0, 110)}`);
      }
    }
  }
}

for (const relative of LIVE_HTML) {
  const file = path.join(ROOT, relative);
  if (!fs.existsSync(file)) {
    findings.push(`${relative}: declared LIVE HTML but missing`);
    continue;
  }
  scanned += 1;
  for (const { n, text } of htmlLines(fs.readFileSync(file, 'utf8'))) {
    for (const [pattern, remedy] of FORBIDDEN) {
      const re = new RegExp(pattern, 'i');
      if (re.test(text)) {
        findings.push(`${relative}:${n}: "${re.exec(text)[0]}" — ${remedy}\n      ${text.trim().slice(0, 110)}`);
      }
    }
  }
}

/* ---------------------------------------------------------------------------------------
 * RENDERED COPY (added 2026-10-19).
 *
 * Why: the lists above are files someone remembered to name. The banned words that survived
 * on the site -- "quorum" on /how-deployment-works and /dao, "validator.fxn" on /chain,
 * "finality" and "accepted ops/s" in five articles and in llms.txt -- were all in files no
 * list named (docs/ux-audit/resolvers-content.md §0). So this half does not take a list of
 * files: it reads every source a visitor's words come from, by kind, and scans the WORDS:
 *
 *   - every page manifest (js/content/manifests/*.js): title, every field value, and meta
 *     (diagram specs are rendered copy too) -- read through ArkManifest, not as text;
 *   - every article and the article index (js/content/articles/*.js, article-index.js);
 *   - the SEO data (js/content/seo-data.js) and the generated llms.txt;
 *   - every string literal that reads as prose in the page modules and shell resolvers
 *     (js/pages/*.js, js/resolvers/*.js) and the content data modules (js/content/*.js).
 *
 * Two structural exemptions, decided by shape, never by a list of words:
 *   - an identifier is not prose. A string with no whitespace (a key, a field name, a CSS
 *     class, a URL slug such as the published /learnings/governance-without-a-validator-set,
 *     which cannot be renamed without a redirect -- owner question Q7) asserts nothing;
 *   - a URL inside llms.txt is an address, not a sentence.
 * js/content/reference-text.js stays out: it is generated, and carries the frozen historical
 * docs verbatim by design (see LIVE_UI above).
 *
 * The term list is FORBIDDEN above -- one list, for docs and rendered copy alike. */
const vm = require('node:vm');
const isIdentifier = (text) => !/\s/.test(text.trim());
function scanText(where, text) {
  if (typeof text !== 'string' || isIdentifier(text)) return;
  for (const [pattern, remedy] of FORBIDDEN) {
    const re = new RegExp(pattern, 'i');
    if (re.test(text)) findings.push(`${where}: "${re.exec(text)[0]}" — ${remedy}\n      ${text.trim().slice(0, 110)}`);
  }
}
function walk(where, value) {
  if (typeof value === 'string') return scanText(where, value);
  if (Array.isArray(value)) return value.forEach((item, i) => walk(`${where}[${i}]`, item));
  if (value && typeof value === 'object') for (const key of Object.keys(value)) walk(`${where}.${key}`, value[key]);
}
let rendered = 0;

// Manifests: read through the same ArkManifest the site uses, so a field is scanned as its value.
const manifestContext = vm.createContext({ document: { write() {} } });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/content/manifest.js'), 'utf8'), manifestContext);
for (const name of fs.readdirSync(path.join(ROOT, 'js/content/manifests')).filter((f) => f.endsWith('.js') && f !== 'index.js')) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/content/manifests', name), 'utf8'), manifestContext);
  const manifest = JSON.parse(JSON.stringify(vm.runInContext(`ArkManifest.get(${JSON.stringify(name.slice(0, -3))})`, manifestContext)));
  walk(`js/content/manifests/${name} title`, manifest.title);
  for (const [role, field] of Object.entries(manifest.fields)) walk(`js/content/manifests/${name} ${role}`, field.value);
  walk(`js/content/manifests/${name} meta`, manifest.meta);
  rendered += 1;
}

// Articles and their index.
const articleList = [];
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/content/article-index.js'), 'utf8'), { LearningContent: { define: (list) => articleList.push(...list) } });
walk('js/content/article-index.js', articleList);
for (const name of fs.readdirSync(path.join(ROOT, 'js/content/articles')).filter((f) => f.endsWith('.js'))) {
  let body = null;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/content/articles', name), 'utf8'), { LearningContent: { load: (_slug, b) => { body = b; } } });
  walk(`js/content/articles/${name}`, body);
  rendered += 1;
}
assert(articleList.length > 0 && rendered > articleList.length, 'the rendered-copy scan read no articles -- it would pass vacuously');

// SEO data (titles, descriptions, AI summaries) and the llms.txt generated from it.
let seo = null;
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/content/seo-data.js'), 'utf8'), { ArkSEO: { define: (whole) => { seo = whole; } } });
walk('js/content/seo-data.js', seo);
rendered += 1;
fs.readFileSync(path.join(ROOT, 'llms.txt'), 'utf8').split('\n').forEach((line, i) => scanText(`llms.txt:${i + 1}`, line.replace(/\(https?:\/\/[^)\s]*\)/g, '')));
rendered += 1;

// Page modules, shell resolvers and content data modules: string literals that read as prose.
const LITERAL = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g;
const moduleFiles = ['js/pages', 'js/resolvers', 'js/content'].flatMap((dir) =>
  fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.js')).map((f) => `${dir}/${f}`))
  .filter((file) => file !== 'js/content/reference-text.js');
for (const file of moduleFiles) {
  for (const { n, text } of jsLines(fs.readFileSync(path.join(ROOT, file), 'utf8'))) {
    for (const literal of text.match(LITERAL) || []) scanText(`${file}:${n}`, literal.slice(1, -1));
  }
  rendered += 1;
}
assert(rendered > 40, `expected to scan the site's rendered copy, scanned only ${rendered} sources`);
scanned += rendered;

assert(scanned >= 3, `expected to scan the live doc set, scanned only ${scanned} — the list is wrong and this test would pass vacuously`);

assert.equal(
  findings.length,
  0,
  `Deprecated blockchain vocabulary in live docs (see docs/deprecated.md).\n\n  ` +
    findings.join('\n  ') +
    `\n\nThe one path: two parties sign -> a resolver shard resolves -> the shard signs the result -> replicas store -> anyone audits.\n`,
);

console.log(
  `PASS: ${scanned} live docs, UI files and rendered-copy sources (manifests, articles, SEO data, llms.txt, page modules) carry no deprecated blockchain vocabulary; ${FORBIDDEN.length} terms enforced.`,
);
