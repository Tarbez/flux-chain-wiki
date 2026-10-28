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

// 1. every class the map names exists in the site's code (header, nav, CTA resolvers, pages, the redesign, and the
//    kit's Products switcher in assets/kit, which the map has named since the skin audit of 2026-10-25). A class is
//    read whole, BEM element included: the switcher's preview has only element classes (.dx-preview__line), no block.
const sources = ['js/resolvers', 'js/pages', 'js/world', 'docs/home-redesign', 'css', 'assets/kit'].flatMap((dir) => {
  const abs = path.join(root, dir); if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs).filter((f) => /\.(js|css|html)$/.test(f)).map((f) => fs.readFileSync(path.join(abs, f), 'utf8'));
}).join('\n');
const classes = new Set(P.PARTS.flatMap(([sel]) => (sel.match(/\.[a-z][a-z0-9_-]*/g) || []).map((c) => c.slice(1))));
classes.forEach((c) => assert.ok(new RegExp('[\'" .]' + c + '[\'" ,:{)]').test(sources), `the part map names .${c}, but no site source uses that class any more: update js/ark/skin-parts.js`));

// 2-4. naming, never renaming, exact undo, late parts
const dom = new JSDOM(`<body><header class="ark-header"><nav class="dx-bar__nav"><a class="ark-link">A</a></nav>
  <button class="header-products-toggle">Products</button><div class="x" data-ark-part="POPOVER" id="own"></div></header>
  <aside class="rail"><section class="rx-fleet"></section></aside><a class="cta quiet">Go</a></body>`);
global.MutationObserver = dom.window.MutationObserver;
const doc = dom.window.document, before = doc.body.innerHTML;
const stop = P.watch(doc.body);
assert.equal(doc.querySelector('header').getAttribute('data-ark-part'), 'MENUBAR', 'the header bar is a MENUBAR');
assert.equal(doc.querySelector('nav').getAttribute('data-ark-part'), 'NAVMENU', 'the header nav is a NAVMENU');
assert.equal(doc.querySelector('.ark-link').getAttribute('data-ark-part'), 'LINK', 'a nav link is a LINK');
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
  // 6. The card dresses the site by its own rules (the owner, 2026-10-24): every part takes what the card sends, less what
  //    is switched off. The code switches a rule off only for a reason measured on the real page and written beside it
  //    (skin gate and site pass, 2026-10-25); the owner confirmed this list on 2026-10-27. Anything else is switched off
  //    in the CMS. (A table here had listed what each part MAY take, and kept most parts bare.)
  assert.deepEqual(JSON.parse(JSON.stringify(P.OFF)), {
    THEAD: ['frame'], TBODY: ['frame'], ROW: ['frame'], CARDHEADER: ['frame'], CARDFOOTER: ['frame'],
    MENUBAR: ['density'], NAVMENU: ['density'], TABSTRIGGER: ['button'], HERO: ['ornament'], ACCORDIONTRIGGER: ['button'],
    DISCLOSUREPANEL: ['ornament', 'frame'], TABSCONTENT: ['ornament'], DISCLOSURE: ['ornament', 'frame']
  }, 'the code switches off exactly the measured, owner-confirmed list: each one has its reason beside it in js/ark/skin-parts.js');
  {
    // every switched-off rule is one the skin policy knows, or the policy drops the switch (REGRESSION 2026-10-27: it knew
    // only the seven structure rules and dropped `button`, so tab and accordion triggers kept a button outline)
    const rules = JSON.parse(/var RULES = (\[[^\]]*\])/.exec(fs.readFileSync('js/content/skin-policy.js', 'utf8'))[1].replace(/'/g, '"').replace(/\s+/g, ' '));
    Object.entries(P.OFF).forEach(([part, list]) => list.forEach((rule) => assert.ok(rules.includes(rule), part + ' switches off ' + rule + ', which js/content/skin-policy.js RULES lacks')));
  }
  assert.ok(!('ALLOW' in P) && !('rulesFor' in P) && !('limit' in P), 'the retired allow table is gone, so nothing can read it by mistake');
  const sent = { CARD: { frame: 'full', edge: 'cut', header: 'tag' }, 'section-header': { ornament: 'strip' }, 'PRIMARY|BUTTON': { edge: 'cut' } };
  assert.deepEqual(JSON.parse(JSON.stringify(P.switchOff(sent, {}))), sent, 'with nothing switched off, every part keeps every rule');
  assert.deepEqual(JSON.parse(JSON.stringify(P.switchOff(sent, { CARD: ['header'], SECTIONHEADER: ['ornament'] }))), { CARD: { frame: 'full', edge: 'cut' }, 'PRIMARY|BUTTON': { edge: 'cut' } },
    'a switch takes its rule away; a part left with none is dropped; the site\'s spelling (SECTIONHEADER) reaches Ark UI\'s block part (section-header)');
  //    a switch only takes away: the policy's and the family's lists are added to the code's, never put back
  const off = P.policy({ off: { CARD: ['edge'] }, families: { Arcade: { off: { CARD: ['frame'] } } } }, 'Arcade').off;
  assert.deepEqual([...off.CARD].sort(), ['edge', 'frame'], 'the family\'s switches add to every card\'s');
  assert.deepEqual(JSON.parse(JSON.stringify(P.policy({ off: { CARD: ['edge'] } }, 'Other').off)), Object.assign(JSON.parse(JSON.stringify(P.OFF)), { CARD: ['edge'] }),
    'another family keeps only the code\'s switches and every card\'s');
  assert.ok(!P.PARTS.some(([sel]) => /products-mega-(chips|rows?)\b/.test(sel)), 'the mega dropdown\'s link chips and rows are not lists or items: a marker there crowds the navbar');
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
