'use strict';
/* Every class css/studio-embed.css styles is one the editor can actually produce.

   Why this exists: the stylesheet was ported verbatim from the old standalone
   admin-studio.html (2026-10-17), and the features behind a third of it never came along --
   the theme token rows, palettes, font pairs, the version and op logs, the SERP preview, the
   modal "ask" sheet, the Library tiles, the component note. 112 lines of rules (.tokrow, .pal,
   .fontpairs, .vers, .oplog, .serp, .modal/.sheet/.ask*, .libtile, .compnote, .rst, .rng,
   .pwmeter and more) styled nothing, and every reader of the file had to rediscover that.
   One was found only by this test's own stricter rule: .ratio, the 60-30-10 colour bar --
   the design check still computes `ratio` but nothing has drawn the bar since the merge (the
   word "ratio" occurs in admin.js only as a property name and in prose).
   Removed 2026-10-18 after checking each name against admin-app.html, js/admin/ and every
   other script, including names built by concatenation.

   The rule: a class named in a selector here must appear as a class token inside a string
   literal or a class="..." attribute in admin-app.html or js/admin/*.js (the only documents
   that load this sheet). A plain word in prose does not count -- "on" or "live" in a sentence
   would make the check pass vacuously. A class that is only ever assembled from pieces
   ('drop-' + where) cannot be found that way; it goes in DYNAMIC with the reason. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

/* class -> why it cannot be found as a literal token. Keep this small and every entry real. */
const DYNAMIC = {};

const SOURCES = ['admin-app.html', ...fs.readdirSync('js/admin').filter((f) => f.endsWith('.js')).map((f) => path.join('js/admin', f))];

function selectorClasses(css) {
  const out = new Set();
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of text.matchAll(/([^{}]+)\{/g)) {
    const prelude = m[1].trim();
    if (prelude.startsWith('@')) continue;
    /* attribute values and strings are not class names ([href$=".css"]) */
    for (const c of prelude.replace(/\[[^\]]*\]/g, '').replace(/"[^"]*"|'[^']*'/g, '').matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) out.add(c[1]);
  }
  return out;
}
/* the text of every string literal (', ", `) and class="..." attribute -- where a class token lives */
function stringContents(source) {
  const parts = [];
  for (const m of source.matchAll(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g)) parts.push(m[0].slice(1, -1));
  return parts.join('\n');
}
function unreferenced(css, sources) {
  const haystack = sources.map(stringContents).join('\n');
  return [...selectorClasses(css)].filter((name) => !DYNAMIC[name]
    && !new RegExp('(^|[^\\w-])' + name.replace(/[-]/g, '\\-') + '($|[^\\w-])').test(haystack));
}

const sources = SOURCES.map((file) => fs.readFileSync(file, 'utf8'));

/* the checker itself: it must see a dead class, and must not accept prose as a reference */
assert.deepEqual(unreferenced('#studioRoot .tb-btn{} #studioRoot .definitely-unused-x{}', sources), ['definitely-unused-x'], 'the checker flags a class nothing produces');
assert.deepEqual(unreferenced('.ghost{}', ['// a ghost of a rule\nconst x = 1;']), ['ghost'], 'a word in a comment is not a reference');
assert.deepEqual(unreferenced('.ghost{}', ["el.className = 'row ghost';"]), [], 'a class token in a string literal is a reference');

const css = fs.readFileSync('css/studio-embed.css', 'utf8');
const dead = unreferenced(css, sources);
assert.deepEqual(dead, [], 'css/studio-embed.css styles classes nothing in admin-app.html or js/admin/ produces: ' + dead.map((c) => '.' + c).join(', ') + ' -- delete their rules, or (only for a name assembled at run time) add it to DYNAMIC with the reason');
Object.keys(DYNAMIC).forEach((name) => assert(selectorClasses(css).has(name), `DYNAMIC lists .${name}, which css/studio-embed.css no longer styles -- remove the entry`));
console.log(`PASS: all ${selectorClasses(css).size} classes css/studio-embed.css styles are produced by admin-app.html or js/admin/.`);
