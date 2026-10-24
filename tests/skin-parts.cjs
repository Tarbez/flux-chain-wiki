/* DefxnSkinParts (js/ark/skin-parts.js): which Ark UI part each hand-built site piece is, so an NFT skin
   reaches the navbar, its Products mega dropdown and the redesign's panels (docs/home-redesign/SKIN-CONTRACT.md).
   Why each case exists:
   - Every class the map names must still exist in the site's code. A renamed class would silently
     drop a piece out of every skin, and nothing but a pixel check would notice.
   - A part Ark UI already named is never renamed by the map.
   - Undo removes only what the map added, so a skin's exact-undo invariant holds for the whole page.
   - Parts that mount later (the mega dropdown and the popovers build on first press) are named too,
     and stop being watched when the skin leaves.
   - The lock list keeps meaning, chain kinds, networks and the record light out of every skin. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');
const P = require('../js/ark/skin-parts.js');

// 1. every class the map names exists in the site's code (header, nav, CTA resolvers, pages, the redesign)
const sources = ['js/resolvers', 'js/pages', 'js/world', 'docs/home-redesign', 'css'].flatMap((dir) => {
  const abs = path.join(root, dir); if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs).filter((f) => /\.(js|css|html)$/.test(f)).map((f) => fs.readFileSync(path.join(abs, f), 'utf8'));
}).join('\n');
const classes = new Set(P.PARTS.flatMap(([sel]) => (sel.match(/\.[a-z][a-z0-9-]*/g) || []).map((c) => c.slice(1))));
classes.forEach((c) => assert.ok(new RegExp('[\'" .]' + c + '[\'" ,:{)]').test(sources), `the part map names .${c}, but no site source uses that class any more: update js/ark/skin-parts.js`));

// 2-4. naming, never renaming, exact undo, late parts
const dom = new JSDOM(`<body><header class="ark-header"><nav><a class="ark-link">A</a></nav>
  <button class="header-products-toggle">Products</button><div class="x" data-ark-part="POPOVER" id="own"></div></header>
  <aside class="rail"><section class="rx-fleet"></section></aside><a class="cta quiet">Go</a></body>`);
global.MutationObserver = dom.window.MutationObserver;
const doc = dom.window.document, before = doc.body.innerHTML;
const stop = P.watch(doc.body);
assert.equal(doc.querySelector('header').getAttribute('data-ark-part'), 'MENUBAR', 'the header bar is a MENUBAR');
assert.equal(doc.querySelector('nav').getAttribute('data-ark-part'), 'NAVMENU', 'the header nav is a NAVMENU');
assert.equal(doc.querySelector('.ark-link').getAttribute('data-ark-part'), 'LINK', 'a nav link is a LINK');
assert.equal(doc.querySelector('.header-products-toggle').getAttribute('data-ark-part'), 'BUTTON', 'the Products trigger is a BUTTON');
assert.equal(doc.querySelector('.cta').getAttribute('data-ark-part'), 'SECONDARY|BUTTON', 'an outline CTA is a SECONDARY|BUTTON');
assert.equal(doc.querySelector('.rx-fleet').getAttribute('data-ark-part'), 'CARD', 'a rail card is a CARD');
assert.equal(doc.getElementById('own').getAttribute('data-ark-part'), 'POPOVER', 'a part Ark UI named keeps its name');
const mega = doc.createElement('div'); mega.className = 'products-mega';
mega.innerHTML = '<section class="products-mega-primary"><h3 class="products-mega-heading">Ready</h3><a class="products-mega-feature">Site</a></section>';
doc.querySelector('header').appendChild(mega);
return Promise.resolve().then(() => {
  assert.equal(mega.getAttribute('data-ark-part'), 'MEGAMENUPANEL', 'the mega dropdown, mounted later, is a MEGAMENUPANEL');
  assert.equal(mega.querySelector('.products-mega-primary').getAttribute('data-ark-part'), 'MEGAMENUCOLUMN', 'its column is a MEGAMENUCOLUMN');
  assert.equal(mega.querySelector('.products-mega-feature').getAttribute('data-ark-part'), 'CARD', 'its feature is a CARD');
  stop(); mega.remove();
  assert.equal(doc.body.innerHTML, before, 'stop() undoes exactly what the map added; Ark UI names stay');
  // 5. locks
  ['--danger', '--success', '--chain-identity', '--net-fxn', '--ember'].forEach((t) => assert.ok(P.LOCKS.includes(t), t + ' is locked on this site'));
  assert.ok(!P.LOCKS.includes('--reference'), '--reference is a role the SDK derives, not a site lock');
  // 6. the site's own limits: the navbar and its mega dropdown never take strips, tags or list markers
  const cut = P.limit({ MEGAMENUPANEL: { frame: 'full', edge: 'soft', ornament: 'strip', marker: 'emblem' }, CARD: { frame: 'full', header: 'tag', ornament: 'strip' }, MODAL: { header: 'tag' } });
  assert.deepEqual(JSON.parse(JSON.stringify(cut)), { MEGAMENUPANEL: { frame: 'full', edge: 'soft', ornament: 'strip' }, CARD: { frame: 'full' }, MODAL: { header: 'tag' } }, 'limit() drops the marker on the mega panel and the tag and strip on cards, and leaves a part it does not name alone');
  assert.deepEqual(JSON.parse(JSON.stringify(P.limit({ POPOVER: { frame: 'full', edge: 'cut', header: 'tag' } }))), { POPOVER: { frame: 'full', edge: 'cut' } }, 'a popover takes a frame and an edge on its panel, never a tag (Ark UI dresses the panel, not the wrapper, since the #263 clipped-dropdown fix)');
  assert.ok(!P.PARTS.some(([sel]) => /products-mega-(chips|rows?)\b/.test(sel)), 'the mega dropdown\'s link chips and rows are not lists or items: a marker there crowds the navbar');
  // 6b. the site's table is the one source of each part's rules: a card's flat rule set goes to the parts it names, cut to
  //     what each allows; a part it does not name wears nothing; `keep` and `none` are not sent (layout and density stay
  //     the part's own until the owner reviews the sets). Before, the recipe's own part table decided, a second list.
  const card = { frame: 'full', edge: 'cut', ornament: 'strip', marker: 'emblem', header: 'tag', layout: 'keep', density: 'keep' };
  const built = JSON.parse(JSON.stringify(P.rulesFor(card)));
  assert.deepEqual(built.MEGAMENUPANEL, { frame: 'full', edge: 'cut', ornament: 'strip' }, 'the mega dropdown takes its frame, edge and strip, never a marker');
  assert.deepEqual(built.CARD, { frame: 'full', edge: 'cut' }, 'a card takes a frame and an edge');
  assert.deepEqual(built.MODAL, { frame: 'full', edge: 'cut', header: 'tag' }, 'the signing review takes the tag strip');
  assert.ok(!('ITEM' in built) && !('MENUBAR' in built), 'a part the table does not name wears nothing');
  assert.deepEqual(built.ALERT, { frame: 'full', edge: 'cut', header: 'tag' }, 'a callout block wears the frame and the tag strip (Ark UI takes a tag back where it would cover content: it covered the tab strip on /account before)');
  assert.deepEqual([built.HERO, built.TABSLIST, built.LISTROWS], [{ ornament: 'strip' }, { ornament: 'strip' }, { marker: 'emblem' }], 'a title takes the strip, a tab strip the divider on its line, a list one emblem per row');
  Object.keys(P.ALLOW).forEach((k) => assert.match(k, /^[A-Z][A-Z0-9]*(\|[A-Z][A-Z0-9]*)*$/, k + ' is in the site\'s one spelling (upper case, no hyphen), the one the CMS policy holds'));
  assert.ok(!JSON.stringify(built).includes('keep'), 'keep is never sent');
  assert.deepEqual(JSON.parse(JSON.stringify(P.rulesFor(card, { ALERT: ['header', 'layout'] }))), { ALERT: { header: 'tag' } }, 'a policy table names its own parts');
  // 7. the skin is held to the site's own small-text rule, the same one tests/theme-color-contrast.cjs enforces
  const theme = fs.readFileSync(path.join(root, 'tests/theme-color-contrast.cjs'), 'utf8');
  assert.match(theme, /for \(const key of \['text-strong','text','text-muted','text-faint'\]\) for \(const \[where, bg\] of \[\['canvas',canvas\],\['surface',surface\]\]\)/, 'the theme test still checks every text level on canvas and surface; if it changed, change DefxnSkinParts.CONTRAST with it');
  assert.ok(/ratio>=4\.5, `\$\{name\} \$\{key\} on/.test(theme), 'the theme test\'s text minimum is still 4.5');
  assert.deepEqual(JSON.parse(JSON.stringify(P.CONTRAST[0])), { fg: ['--text-strong', '--text', '--text-muted', '--text-faint'], bg: ['--canvas', '--surface'], min: 4.5 }, 'the skin is held to that same rule');
  // 8. the mega dropdown's labels sit on the --primary-100 glow; with only rule 7 they read 4.43 to 4.47:1 there under all three samples (rendered pixels)
  //    and a focused feature card turns --reference-100 (a keyboard user lands there first); 4.47 to 4.50:1 on it before
  const resolutions = fs.readFileSync(path.join(root, 'css/resolutions.css'), 'utf8');
  assert.match(resolutions, /\.products-mega-body \{[^}]*hsl\(var\(--primary-100\)\)/, 'the mega body still paints the --primary-100 glow; if it moved, move CONTRAST[1] with it');
  assert.match(resolutions, /\.products-mega-feature:is\(:hover,:focus-visible\) \{[^}]*background:hsl\(var\(--reference-100\)\)/, 'a focused mega card still turns --reference-100; if it changed, change CONTRAST[1] with it');
  ['--primary-100', '--reference-100'].forEach((bg) => assert.ok(P.CONTRAST.some((r) => r.bg.includes(bg) && r.fg.includes('--text-faint') && r.min >= 4.5), 'faint text is held to 4.5:1 on ' + bg + ' in the mega dropdown'));
  console.log('skin-parts: ok (' + P.PARTS.length + ' rows, ' + classes.size + ' classes found in the site)');
});
