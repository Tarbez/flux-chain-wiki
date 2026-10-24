/* Writes resolvers-data.js for the mockup's resolver screens, derived from the first-party resolvers.

   A resolver composes capabilities and accepts the records its grammar defines
   (flux/defxn-defi-rs/dense-wire/resolvers/<name>/). Nothing in the list is written by hand:
     id, name, line   the table "The first-party resolvers" in defxn-concept.html, in its order:
                      `name` is the table's display name, `line` its plain sentence, and `id` the
                      resolver folder the name lowercases to ("Service pool" -> servicepool)
     composes         composition.txt `composes` lines (`-` means none)
     commands         composition.txt `command` lines; `signedCommands` counts the signed-record ones
     offers           offer-manifest.txt (FLX-RESOLVER-OFFER-V2) `offer` names, sentence-cased with
                      hyphens as spaces; a name the site's banned vocabulary forbids is left out
                      (tests/no-deprecated-vocabulary.cjs). The older one-line V1 form has no offers
     price            the decoded `price` field: "none today ..." -> 'None today', "free" -> 'Free'
     grammar          grammar-manifest.txt first line: FLX-RESOLVER-GRAMMAR-V2 is derived and checked;
                      V1 (compute, storage) is 'not specified' (docs/STATUS.md, CAP-012)
   The offers' hex `summary` fields are left out on purpose: they carry internal record codes and
   words the site does not show.

   Run from this folder:  node make-resolvers.mjs
   Run it again when a resolver's composition, offer or grammar manifest is re-derived. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { bannedWords } from './make-capabilities.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const RESOLVERS = join(HERE, '../../../defxn-defi-rs/dense-wire/resolvers');
const CONCEPT = join(HERE, 'defxn-concept.html');
const CAPABILITIES = join(HERE, '../../js/content/capabilities-data.js');
const OUT = join(HERE, '../../js/content/resolvers-data.js');

function sentence(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function unhex(h) { return Buffer.from(h, 'hex').toString('utf8'); }
function plain(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘').replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
}

/* the concept doc's table, in its order: [{ id, name, line }] */
export function conceptTable(html) {
  const at = html.indexOf('The first-party resolvers');
  if (at < 0) throw new Error('defxn-concept.html has no "The first-party resolvers" table; the names and lines come from it');
  const body = html.slice(html.indexOf('<tbody>', at), html.indexOf('</tbody>', at));
  return [...body.matchAll(/<tr>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/g)].map((m) => {
    const name = plain(m[1]);
    return { id: name.toLowerCase().replace(/\s+/g, ''), name, line: plain(m[2]) };
  });
}

export function parseComposition(text) {
  const out = { composes: [], commands: 0, signedCommands: 0 };
  for (const line of text.split('\n')) {
    const f = line.split('\t');
    if (f[0] === 'composes' && f[1] && f[1] !== '-') out.composes.push(f[1]);
    else if (f[0] === 'command') { out.commands++; if (f[2] === 'signed-record') out.signedCommands++; }
  }
  return out;
}

export function priceOf(raw) {
  const p = (raw || '').trim().toLowerCase();
  if (p.startsWith('none today')) return 'None today';
  if (p === 'free') return 'Free';
  return null;
}

/* V2: one field per line. V1: one line of key/value pairs, offers none */
export function parseOffer(text) {
  const lines = text.split('\n');
  const head = lines[0].split('\t');
  if (head[0] === 'FLX-RESOLVER-OFFER-V1') {
    const i = head.indexOf('price');
    return { version: 1, offers: [], price: priceOf(i >= 0 ? head[i + 1] : '') };
  }
  const out = { version: 2, offers: [], price: null };
  for (const line of lines) {
    const f = line.split('\t');
    if (f[0] === 'offer') out.offers.push(sentence(f[1].replace(/-/g, ' ')));
    else if (f[0] === 'price') out.price = priceOf(unhex(f[1]));
  }
  return out;
}

export function grammarOf(text) {
  const tag = text.split(/[\t\n]/)[0];
  return tag === 'FLX-RESOLVER-GRAMMAR-V2' ? 'checked' : 'not specified';
}

function capabilityIds() {
  if (!existsSync(CAPABILITIES)) return null;
  const m = readFileSync(CAPABILITIES, 'utf8').match(/window\.DEFXN_CAPABILITIES\s*=\s*([\s\S]*);\s*$/);
  return m ? new Set(JSON.parse(m[1]).capabilities.map((c) => c.id)) : null;
}

export function build() {
  const banned = bannedWords();
  const clean = (s) => !banned.some((re) => re.test(s));
  const caps = capabilityIds();
  const warnings = [];
  if (!caps) warnings.push('capabilities-data.js not readable: composes ids not checked (run make-capabilities.mjs)');
  const resolvers = [];
  for (const row of conceptTable(readFileSync(CONCEPT, 'utf8'))) {
    const dir = join(RESOLVERS, row.id);
    if (!existsSync(join(dir, 'composition.txt'))) { warnings.push(row.name + ': no resolver folder ' + dir); continue; }
    const c = parseComposition(readFileSync(join(dir, 'composition.txt'), 'utf8'));
    const o = existsSync(join(dir, 'offer-manifest.txt')) ? parseOffer(readFileSync(join(dir, 'offer-manifest.txt'), 'utf8')) : { offers: [], price: null };
    const g = existsSync(join(dir, 'grammar-manifest.txt')) ? grammarOf(readFileSync(join(dir, 'grammar-manifest.txt'), 'utf8')) : 'not specified';
    if (caps) for (const id of c.composes) if (!caps.has(id)) warnings.push(row.id + ' composes "' + id + '", which capabilities-data.js does not list');
    if (o.price === null) warnings.push(row.id + ': price not recognised');
    resolvers.push({ id: row.id, name: row.name, line: row.line, composes: c.composes, offers: o.offers.filter(clean),
      commands: c.commands, signedCommands: c.signedCommands, price: o.price, grammar: g });
  }
  return { data: { derived: new Date().toISOString().slice(0, 10), resolvers }, warnings };
}

function main() {
  const { data, warnings } = build();
  for (const w of warnings) console.warn('warning: ' + w);
  const text = '/* GENERATED by make-resolvers.mjs from flux/defxn-defi-rs/dense-wire/resolvers/<name>/\n' +
    '   (composition.txt, offer-manifest.txt, grammar-manifest.txt) and the resolver table in defxn-concept.html.\n' +
    '   Do not edit by hand: run `node make-resolvers.mjs` in this folder. */\n' +
    'window.DEFXN_RESOLVERS = ' + JSON.stringify(data, null, 1) + ';\n';
  writeFileSync(OUT, text);
  console.log('wrote ' + OUT + ': ' + data.resolvers.length + ' resolvers, ' + warnings.length + ' warnings');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
