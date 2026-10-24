/* Writes concept-data.js: the words of the designer brief (defxn-concept.html), read from its own
   markup so the mockup says what the concept says and nothing is retyped (2026-10-23, owner: "our
   mockup does not really have our concept").

   What it reads, section by section (the brief's own ids):
     minute     the opening line, the five steps (bold lead + the rest), and the closing line
     words      the glossary table: word, what it means, how to draw it
     layers     the three layers: name, what it holds, its one rule
     life       the five steps of a resolver's life, and the design note
     products   the seven lanes (name, slug, line) and their products (name, address or stage, line),
                the five resolvers that power products
     identity   FXN ID and .fxn names: each paragraph, with its state tag and its data-k key if it has them
     nodes      the three ways to run a node, the roles line, the state line
     money      the three kinds of money
     state      what exists today: part, state, boundary
   Inline markup (<b>, <code>) is kept as plain text. A section that is missing gives null, and the
   page that needs it says so rather than inventing words.

   Run from this folder:  node make-concept.mjs
   Run it again whenever defxn-concept.html changes. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BRIEF = join(HERE, 'defxn-concept.html');
const OUT = join(HERE, '../../js/content/concept-data.js');

const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ', '&middot;': '·' };
export function text(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/gi, (e) => ENT[e] || e).replace(/\s+/g, ' ').trim();
}
export function section(html, id) {
  const at = html.indexOf('<section id="' + id + '"');
  if (at < 0) return null;
  return html.slice(at, html.indexOf('</section>', at));
}
function all(re, s) { return [...s.matchAll(re)]; }
function rows(s) {
  const body = s.slice(s.indexOf('<tbody>'), s.indexOf('</tbody>'));
  return all(/<tr>([\s\S]*?)<\/tr>/g, body).map((m) => all(/<td[^>]*>([\s\S]*?)<\/td>/g, m[1]).map((c) => text(c[1])));
}
function paras(s) { return all(/<p(?: [^>]*)?>([\s\S]*?)<\/p>/g, s).map((m) => m[1]); }
/* a paragraph with a state tag: { state: 'Partial', text } */
function tagged(p) {
  const t = p.match(/<span class="tag (\w+)">([^<]+)<\/span>/);
  return { state: t ? t[2] : null, text: text(t ? p.replace(t[0], '') : p) };
}
/* a paragraph with a key: <p data-k="kit"> gives { key: 'kit', state, text }, so a page quotes it by name, not by place */
function keyed(m) { const k = m[0].match(/^<p[^>]*\bdata-k="([\w-]+)"/); return Object.assign({ key: k ? k[1] : null }, tagged(m[1])); }
/* "<b>Lead.</b> rest" */
function lead(li) {
  const b = li.match(/<b>([\s\S]*?)<\/b>/);
  return { lead: b ? text(b[1]) : null, rest: text(b ? li.replace(b[0], '') : li) };
}

export function build() {
  const h = readFileSync(BRIEF, 'utf8'), out = {};
  const minute = section(h, 'minute');
  if (minute) {
    const ps = paras(minute).filter((p) => !/class="num"/.test(p));
    out.minute = {
      line: text(paras(minute.replace(/<p class="num">[^<]*<\/p>/, ''))[0] || ''),
      steps: all(/<li><div>([\s\S]*?)<\/div><\/li>/g, minute).map((m) => lead(m[1])),
      after: text(ps[ps.length - 1] || '')
    };
  }
  const words = section(h, 'words');
  if (words) out.words = rows(words).map((r) => ({ word: r[0], means: r[1], draw: r[2] }));
  const layers = section(h, 'layers');
  if (layers) {
    const first = layers.slice(0, layers.indexOf('</table>'));
    out.layers = rows(first).map((r) => ({ name: r[0], holds: r[1], rule: r[2] }));
  }
  const life = section(h, 'life');
  if (life) {
    out.life = { steps: all(/<li><div>([\s\S]*?)<\/div><\/li>/g, life).map((m) => lead(m[1])) };
    const note = life.match(/<div class="callout">([\s\S]*?)<\/div>/);
    if (note) out.life.note = lead(note[1]);
  }
  const products = section(h, 'products');
  if (products) {
    out.products = {
      lanes: all(/<div class="lane"><h3>([\s\S]*?)<span class="mono">([^<]*)<\/span><\/h3><p>([\s\S]*?)<\/p><ul>([\s\S]*?)<\/ul><\/div>/g, products).map((m) => ({
        name: text(m[1]), slug: text(m[2]), line: text(m[3]),
        items: all(/<li><b>([\s\S]*?)<\/b><em>([\s\S]*?)<\/em><span>([\s\S]*?)<\/span><\/li>/g, m[4]).map((x) => {
          const where = text(x[2]);
          return { name: text(x[1]), address: /\./.test(where) ? where : null, stage: /\./.test(where) || where === '—' ? null : where, line: text(x[3]) };
        })
      })),
      powered: rows(products.slice(products.indexOf('Resolvers that power products'))).map((r) => ({ resolver: r[0], powers: r[1], does: r[2] })),
      networks: text((paras(products).filter((p) => /DeArk/.test(p))[0]) || '')
    };
  }
  const identity = section(h, 'identity');
  if (identity) {
    out.identity = all(/<div>\s*<h3>([\s\S]*?)<\/h3>([\s\S]*?)<\/div>/g, identity).map((m) => ({ name: text(m[1]), paras: all(/<p(?: [^>]*)?>([\s\S]*?)<\/p>/g, m[2]).map(keyed) }));
  }
  const nodes = section(h, 'nodes');
  if (nodes) {
    out.nodes = {
      line: text(paras(nodes.replace(/<p class="num">[^<]*<\/p>/, ''))[0] || ''),
      ways: all(/<div><dt>([\s\S]*?)<\/dt><dd>([\s\S]*?)<small>([\s\S]*?)<\/small><\/dd><\/div>/g, nodes).map((m) => ({ name: text(m[1]), where: text(m[2]), line: text(m[3]) })),
      after: paras(nodes).slice(-2).map(tagged)
    };
  }
  const money = section(h, 'money');
  if (money) {
    const t = money.slice(money.indexOf('Three kinds of money'));
    out.money = rows(t.slice(0, t.indexOf('</table>'))).map((r) => ({ kind: r[0], what: r[1], moves: r[2] }));
  }
  /* the brief's rules for numbers on screens (section 11): the page shows the ones a reader needs */
  const measured = section(h, 'measured');
  if (measured) {
    const r = measured.slice(measured.indexOf('Rules for numbers on screens'));
    out.numberRules = all(/<li>([\s\S]*?)<\/li>/g, r.slice(0, r.indexOf('</ul>'))).map((m) => text(m[1]));
  }
  const state = section(h, 'state');
  if (state) {
    out.state = {
      line: text(paras(state.replace(/<p class="num">[^<]*<\/p>/, ''))[0] || ''),
      rows: rows(state).map((r) => ({ part: r[0], state: r[1], boundary: r[2] }))
    };
  }
  return out;
}

function main() {
  if (!existsSync(BRIEF)) { console.error('no ' + BRIEF); process.exit(2); }
  const data = build();
  writeFileSync(OUT, '/* GENERATED by make-concept.mjs from defxn-concept.html (the designer brief).\n' +
    '   Do not edit by hand: change the brief, then run `node make-concept.mjs` in this folder. */\n' +
    'window.DEFXN_CONCEPT = ' + JSON.stringify(data, null, 1) + ';\n');
  const n = (k) => (data[k] ? (Array.isArray(data[k]) ? data[k].length : 'ok') : 'MISSING');
  console.log('wrote ' + OUT + ': words ' + n('words') + ', layers ' + n('layers') + ', products ' + (data.products ? data.products.lanes.reduce((s, l) => s + l.items.length, 0) : 'MISSING') +
    ', identity ' + n('identity') + ', nodes ' + (data.nodes ? data.nodes.ways.length : 'MISSING') + ', money ' + n('money') + ', state ' + (data.state ? data.state.rows.length : 'MISSING'));
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
