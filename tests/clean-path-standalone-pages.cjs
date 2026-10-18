/* LAW: a standalone page must answer on its clean path, in BOTH servers.
 *
 * Why this test exists: /resolver-math.html rendered perfectly while
 * /resolver-math served the app shell instead. Nothing failed — the
 * shell is a valid page — so it read as "the page does not load", and
 * every test passed the whole time. The same defect was live in
 * production Caddy, because its try_files had the same gap.
 *
 * That page has since become a route (js/pages/resolver-math.js) and is no
 * longer standalone, which is why it does not appear in the list below.
 * The rule outlived its first example on purpose: broker.html needs it
 * today, and PAGES is read from the directory so the next standalone page
 * is covered without anyone remembering this file.
 *
 * serve-site.mjs's own header says the gateway in front of a published
 * copy must apply the same rules. A comment is a convention; this is the
 * enforcement. Both files are checked, because fixing one and not the
 * other is exactly how this reached production.
 *
 * The second half matters as much as the first: resolving <path>.html
 * must NOT apply to a private page, or /admin starts serving admin.html
 * out of the static root and bypasses the private check completely.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

const ROOT = path.resolve(__dirname, '..');
const SERVER = fs.readFileSync(path.join(ROOT, 'scripts', 'serve-site.mjs'), 'utf8');
const CADDY = fs.readFileSync(path.join(ROOT, 'ops', 'caddy', 'defxn-site.caddy'), 'utf8');

/* Pages that live as their own .html at the site root. Derived from the
 * directory rather than listed, so a new standalone page is covered the
 * day it is added instead of the day somebody remembers this file. */
const PAGES = fs
  .readdirSync(ROOT)
  .filter((f) => f.endsWith('.html') && f !== 'index.html')
  .map((f) => f.replace(/\.html$/, ''));

/* The private ones must stay unreachable by any path. They are not
 * "pages with a clean path"; they are pages the public server refuses. */
const PRIVATE_PAGES = ['admin', 'admin-app'];
/* Private pages that were deleted from the repo. Deleting a file here does not
 * delete it from a node's static root, so Caddy must keep routing the retired
 * name to the admin host (which no longer serves it) or a stale copy would be
 * served publicly by the {path}.html rule. admin-studio merged into admin-app
 * on 2026-10-18. */
const RETIRED_PRIVATE_PAGES = ['admin-studio'];
for (const page of RETIRED_PRIVATE_PAGES) {
  /* PAGES is read from the directory, so a recreated retired page would be
   * counted as PUBLIC below and served by serve-site.mjs's clean-path rule. */
  assert.ok(!PAGES.includes(page), `${page}.html is retired but exists at the site root again; serve-site.mjs would serve it publicly`);
}
const PUBLIC_PAGES = PAGES.filter((p) => !PRIVATE_PAGES.includes(p));

let checks = 0;
const check = (fn) => { fn(); checks += 1; };

check(() => {
  assert.ok(
    PUBLIC_PAGES.length > 0,
    'no standalone public pages found at the site root — this test would pass vacuously'
  );
});

/* ---- serve-site.mjs ------------------------------------------------- */

check(() => {
  assert.ok(
    /\+ '\.html'/.test(SERVER),
    'scripts/serve-site.mjs no longer resolves an extension-less path to <path>.html.\n' +
      '  symptom: a standalone page\'s clean path serves index.html, so the page looks\n' +
      '           like it does not load while returning 200.\n' +
      '  remedy: try `pathname + ".html"` BEFORE the index.html fallback.'
  );
});

check(() => {
  /* Order is the whole fix: after the index.html fallback it is dead code. */
  const htmlCandidate = SERVER.indexOf("+ '.html'");
  const shellFallback = SERVER.indexOf("file = join(ROOT, 'index.html');", htmlCandidate - 2000 > 0 ? 0 : 0);
  const lastShell = SERVER.lastIndexOf("if (!file && !extname(pathname)) file = join(ROOT, 'index.html');");
  assert.ok(htmlCandidate > 0 && lastShell > 0, 'cannot locate both branches in serve-site.mjs');
  assert.ok(
    htmlCandidate < lastShell,
    'serve-site.mjs tries index.html before <path>.html, so the clean-path rule never runs. ' +
      'The app shell is a valid response, which is why this fails silently.'
  );
  void shellFallback;
});

check(() => {
  assert.ok(
    /PRIVATE\.test\(candidate\)/.test(SERVER),
    'the <path>.html candidate is not re-checked against PRIVATE.\n' +
      '  consequence: /admin resolves to admin.html from the static root and the private ' +
      'check is bypassed. This is a worse bug than the one being fixed.'
  );
});

check(() => {
  assert.ok(
    /pathname === '\/admin' \|\| pathname === '\/admin\/'/.test(SERVER) && /ADMIN_ORIGIN/.test(SERVER),
    'the public preview /admin path must redirect to the separate protected CMS host instead of falling through to index.html'
  );
});

/* ---- ops/caddy/defxn-site.caddy ------------------------------------- */

check(() => {
  const m = CADDY.match(/try_files\s+([^\n]+)/);
  assert.ok(m, 'ops/caddy/defxn-site.caddy has no try_files directive');
  const parts = m[1].trim().split(/\s+/);
  assert.ok(
    parts.includes('{path}.html'),
    'production Caddy does not try {path}.html, so a standalone page on defxn.com serves ' +
      'the app shell even though the local server gets it right.\n' +
      '  remedy: try_files {path} {path}.html {path}/ /index.html'
  );
  assert.ok(
    parts.indexOf('{path}.html') < parts.indexOf('/index.html'),
    'Caddy tries /index.html before {path}.html, so the rule never fires'
  );
});

check(() => {
  /* Caddy matches @adminProxy before the final handle block, so the clean
   * path of every private page has to be listed there or the new rule
   * serves it from the static root. */
  const admin = CADDY.match(/@adminProxy path ([^\n]+)/);
  assert.ok(admin, 'no @adminProxy matcher in defxn-site.caddy');
  for (const page of [...PRIVATE_PAGES, ...RETIRED_PRIVATE_PAGES]) {
    assert.ok(
      admin[1].split(/\s+/).includes('/' + page) && admin[1].split(/\s+/).includes('/' + page + '.html'),
      `@adminProxy does not match the clean path /${page}. With {path}.html in try_files, ` +
        `/${page} would be served from the static root instead of the admin host.`
    );
  }
});

/* ---- the two must agree --------------------------------------------- */

check(() => {
  /* serve-site.mjs's header states the gateway applies the same rules.
   * Both now implement three: asset-under-route rewrite, <path>.html,
   * and the extension-less shell fallback. */
  const rules = [
    ['asset-under-route rewrite', /assetPath/.test(SERVER), /assetUnderRoute/.test(CADDY)],
    ['clean path to <path>.html', /\+ '\.html'/.test(SERVER), /\{path\}\.html/.test(CADDY)],
    ['shell fallback for routed paths', /join\(ROOT, 'index\.html'\)/.test(SERVER), /\/index\.html/.test(CADDY)]
  ];
  for (const [name, inNode, inCaddy] of rules) {
    assert.equal(
      inNode,
      inCaddy,
      `"${name}" is implemented in only one of the two servers (node: ${inNode}, ` +
        `caddy: ${inCaddy}). They must stay equivalent — a rule in one and not the other ` +
        'means local and production disagree about what loads.'
    );
  }
});


/* ---- one copy of the site block, not two --------------------------- */

check(() => {
  /* A second copy of defxn-site.caddy lived in ark-miner-cli/ops/caddy and
   * went three days stale, still lacking the @fleetStatus and @fleetPulse
   * blocks. Running the installer would have reverted two live API routes.
   * The installer now reads this repo's copy; nothing may reintroduce a
   * duplicate for it to ship instead. */
  const sibling = path.resolve(ROOT, '..', 'ark-miner-cli', 'ops', 'caddy');
  if (!fs.existsSync(sibling)) return; // not checked out; nothing to assert
  const dupe = path.join(sibling, 'defxn-site.caddy');
  assert.ok(
    !fs.existsSync(dupe),
    'a second copy of defxn.com\'s site block exists at ' + dupe + '.\n' +
      '  consequence: install-defxn-site.sh ships whichever copy sits beside it, so the two\n' +
      '  drift and a deploy silently reverts whatever the stale one is missing. This has\n' +
      '  already happened once (the fleet API routes).\n' +
      '  remedy: delete it; the installer reads defxn/ops/caddy/defxn-site.caddy.'
  );

  const installer = path.join(sibling, 'install-defxn-site.sh');
  if (!fs.existsSync(installer)) return;
  const text = fs.readFileSync(installer, 'utf8');
  assert.ok(
    /defxn\/ops\/caddy/.test(text),
    'install-defxn-site.sh does not read defxn/ops/caddy/defxn-site.caddy. It must ship ' +
      'the canonical file, not a copy of its own.'
  );
  assert.ok(
    !/scp[^\n]*\$DIR\/defxn-site\.caddy/.test(text),
    'install-defxn-site.sh still scps $DIR/defxn-site.caddy — that is the copy-beside-the-' +
      'installer pattern this check exists to prevent.'
  );
});

console.log(
  `PASS: clean paths for ${PUBLIC_PAGES.length} standalone pages (${PUBLIC_PAGES.join(', ')}) ` +
    `are served by both serve-site.mjs and defxn-site.caddy; ${PRIVATE_PAGES.join(', ')} stay ` +
    `private (retired: ${RETIRED_PRIVATE_PAGES.join(', ')}); ` +
    `private; ${checks} checks.`
);
