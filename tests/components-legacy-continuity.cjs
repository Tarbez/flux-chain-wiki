'use strict';
/* Saved-data continuity for the CMS Library's move onto the Ark block registry (Wave 2,
   W2-LIBRARY; docs/ux-audit/components.md §5 line 7, risk R5).

   Why this test exists: the Library's insertable blocks became the Ark registry
   (ArkKit.describeArkBlocks), and the six hand-built typed blocks it used to offer --
   RBLOCK_TEXT_V1, CTA, IMAGE, CARD, QUOTE, DIVIDER -- plus RBLOCK_CAPTURED_V1 are now READ
   ALIASES: kept registered, kept as-is, never rewritten (future law: a saved master is never
   migrated in place). sanitize() drops any master whose resolver it does not recognise, so a
   whitelist change that "only renamed things" would silently delete every saved component; and
   a resolver change that "only tidied styles" would re-render every saved page differently.
   Both look right in review. So the rendered bytes of every legacy block -- the instance's
   whole outerHTML, atom class names included (an atom class is a hash of its declarations, so
   equal names mean equal styling) -- are pinned here by sha256, taken BEFORE the Library
   change (git 3462ab4, 2026-10-19). Any intended visual change to a legacy block must update a
   hash here AND say why in the same change.

   The fixture is every legacy resolver with every prop it reads (and each enum's both sides),
   plus every RBLOCK master shape the repo's own fixtures use (js/content/components-data.js is
   empty as of 2026-10-19; tests/*.cjs carry the rest), rendered through the real ArkUI.build
   and the real resolver files -- not a stub. */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const dom = new JSDOM('<!doctype html><html><head></head><body><main data-page="x"><div data-ark-insert="main"></div></main></body></html>', { runScripts: 'outside-only', url: 'https://defxn.com/x' });
const w = dom.window;
w.ArkCopy = { isKey: () => false, resolve: (v) => v };
w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;   // the FLX grammar components are stored in turns text into bytes; jsdom has no codec
for (const file of ['js/ark/atomizer.js', 'js/ark/flux.js', 'js/ark/runtime.js', 'js/ark/icons.js', 'js/ark/dash-kit.js', 'js/vendor/flx-state-grammar.js', 'js/content/components.js',
  'js/resolvers/blocks/rblock-text-v1.js', 'js/resolvers/blocks/rblock-cta-v1.js', 'js/resolvers/blocks/rblock-image-v1.js', 'js/resolvers/blocks/rblock-card-v1.js',
  'js/resolvers/blocks/rblock-quote-v1.js', 'js/resolvers/blocks/rblock-divider-v1.js', 'js/resolvers/blocks/rblock-captured-v1.js']) {
  w.eval(fs.readFileSync(path.join(ROOT, file), 'utf8') + '\n//# sourceURL=' + file);
}
const C = w.ArkComponents;

/* name -> [resolver, props, tree?]; one instance each, in this order, at /x main */
const FIXTURE = [
  ['text-full', 'RBLOCK_TEXT_V1', { heading: 'Original heading', body: 'Original body', align: 'left', size: 'h2' }],
  ['text-center-h3', 'RBLOCK_TEXT_V1', { heading: 'A smaller centred heading', body: 'With a body.', align: 'center', size: 'h3' }],
  ['text-heading-only', 'RBLOCK_TEXT_V1', { heading: 'Hello from a block' }],
  ['text-body-only', 'RBLOCK_TEXT_V1', { body: 'Just a paragraph, no heading.' }],
  ['text-empty', 'RBLOCK_TEXT_V1', {}],
  ['cta-route', 'RBLOCK_CTA_V1', { label: 'Read about DEFXN', href: 'route:about', variant: 'primary' }],
  ['cta-secondary-url', 'RBLOCK_CTA_V1', { label: 'Open the explorer', href: 'url:https://explorer.example', variant: 'secondary' }],
  ['cta-doc', 'RBLOCK_CTA_V1', { label: 'Read the spec', href: 'doc:docs/cms-architecture.md' }],
  ['cta-empty', 'RBLOCK_CTA_V1', {}],
  ['image-captioned', 'RBLOCK_IMAGE_V1', { src: '/assets/og.png', alt: 'The DEFXN mark', caption: 'The mark, on dark.' }],
  ['image-bare', 'RBLOCK_IMAGE_V1', { src: '/assets/og.png', alt: 'The DEFXN mark' }],
  ['card-icon', 'RBLOCK_CARD_V1', { icon: 'arrow-right', title: 'A card', text: 'One self-contained item.' }],
  ['card-plain', 'RBLOCK_CARD_V1', { title: 'No icon', text: 'Just words.' }],
  ['quote-attributed', 'RBLOCK_QUOTE_V1', { quote: 'Its signature is its result.', attribution: 'The DEFXN overview' }],
  ['quote-bare', 'RBLOCK_QUOTE_V1', { quote: 'Unattributed words.' }],
  ['divider', 'RBLOCK_DIVIDER_V1', {}],
  ['captured-ssr', 'RBLOCK_CAPTURED_V1', { heading: 'Run DEFXN from source' }, [{ t: 'h1', c: 'captured-title', k: [{ p: 'heading' }] }]],
  ['captured-nav-link', 'RBLOCK_CAPTURED_V1', { link: 'Docs', image: '/assets/og.png', imageAlt: 'icon' },
    [{ t: 'a', c: 'nav-link', a: { href: '/docs', 'data-scene-link': 'docs' }, s: ['color:hsl(var(--text))'], x: 'font-weight:600', k: [{ t: 'img', ps: { src: 'image', alt: 'imageAlt' } }, ' ', { t: 'span', k: [{ p: 'link' }] }] }]],
];

let draft = { version: 1, masters: {}, routes: {} };
FIXTURE.forEach(([name, resolver, props, tree], i) => {
  const id = 'm' + i, key = 'i' + i;
  draft = C.createMaster(draft, id, resolver, props, name, tree);
  assert(draft.masters[id], `the legacy master "${name}" (${resolver}) is still accepted by createMaster/sanitize`);
  draft = C.insertInstance(draft, '/x', 'main', key, id);
});
/* an instance override on a legacy block keeps working the same way */
draft = C.setOverride(draft, '/x', 'main', 'i0', 'heading', 'Overridden heading');
/* the sanitized draft itself is unchanged by a round trip: nothing is rewritten */
assert.equal(JSON.stringify(C.sanitize(JSON.parse(JSON.stringify(draft)))), JSON.stringify(draft), 'sanitize() rewrites no legacy master or instance');

/* The file Save writes for it. Its BYTES changed once, on purpose, on 2026-10-24: the store moved from a JSON literal to FLX records
   (workspace law, "stored state is FLX"; ArkComponents.encode). What must not change is the CONTENT: every legacy master and
   instance reads back exactly as sanitize() holds it (a saved master is never migrated in place), a file written in the old JSON form
   still loads to the same draft (read once, written forward), and a second write is byte-identical. The pin below holds the FLX bytes. */
const SERIALIZED = '39442a873bdc7e475236cd21711800349125053c945b4dc78b7b25289da3ac62';
const text = C.encode(draft);
assert.equal(JSON.stringify(C.decode(text)), JSON.stringify(C.sanitize(draft)), 'the FLX records read back as exactly the sanitized draft: no legacy master or instance changes');
assert.equal(C.encode(C.decode(text)), text, 'and the round trip is byte-exact');
C.define(JSON.parse(JSON.stringify(draft)));
const fromOldJson = JSON.stringify(C.get());
C.define(text);
assert.equal(JSON.stringify(C.get()), fromOldJson, 'a data file written before the move (a JSON literal) loads to the same draft as its FLX successor');
const serialized = crypto.createHash('sha256').update(C.serialize(draft)).digest('hex');
if (!process.argv.includes('--print')) assert.equal(serialized, SERIALIZED, 'components-data.js for legacy masters is written differently than before');
else console.log('serialized', serialized);

const host = w.document.querySelector('[data-ark-insert="main"]');
const built = C.render(host, '/x', 'main', draft);
assert.equal(built.length, FIXTURE.length, 'every legacy master renders an element');

/* sha256 of each instance's outerHTML, taken at git 3462ab4 (before the Library change). */
const PINNED = {
  'text-full': '583567a27a78946e0f6bc63ebfeaa28db1c95229234dd99589e94b2a86b35ab5',
  'text-center-h3': 'aee8f999d58d9645d21b47ee7066687ddaef36ce686ceff2048846135dcd2128',
  'text-heading-only': '9cfbe27aec078a0605d3a48a23db5402c6b07683aa60b4a169d8f23f1612f6ce',
  'text-body-only': 'd3ce3b141bf7d2a3f32775062a3e2f7334d50b39446be35f9eda76759f1b3e4a',
  'text-empty': '1d5075192b37e428d0a06e5745266c34b70df71df74f2204baf5561f02f124c5',
  'cta-route': 'c3258f1cf4a973d6f46d327e013677de44836e5def02d66900737353e473764d',
  'cta-secondary-url': '620f037d032ce0607091dc3fbe726653fda24f4b1e8bed7dc6d39d073dd64b66',
  'cta-doc': 'ddf2ce40efbe4595923480d067cbd633474381e2cb7253167ed8508319f2819a',
  'cta-empty': '17a2333886e7cf9be8ace5b1b3eec3ac3aa948554d1f6a876c02f1a0439cd53a',
  'image-captioned': '92be54e0a55e10d3f7e75c9b3eb42faf87394853c8fb4bb23bd57cea2d5f5e0f',
  'image-bare': '3c01769522a7c7fe137c91fc42f6e01cdb95c34d89d8f7a9cf623d989abf8c47',
  'card-icon': 'eb31b247a256873c9b5e4b8f7e29719fd3d9ae794ba6543cec2bbd2ea695c300',
  'card-plain': 'c3e1985ea7303a5bc0a21b16858226a66e84dc5eccd23df0175ded2e66150bae',
  'quote-attributed': 'b80b031ffbed836f156da64dc4973e11e40d677ae44afb3b6ed6ef965f2401f2',
  'quote-bare': '4fecc89242902b526a2b9fbe557e03ed45d26a2d9358543ff97d6c4060f5a4a3',
  'divider': 'ca1183d90273bf3f35778de9aa6a201511321e3bc53622a4219d0e7170a190b8',
  'captured-ssr': '6d5f0a7f742510f2187a26d9c6b3a7196cbe82fc267bc6e0e625c8991caa899a',
  'captured-nav-link': '8f91f686007cd651273ce948f41fc1b6e02d7ce253975b0fac5c2c685b179d25',
};
const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
const got = {};
built.forEach((el, i) => { got[FIXTURE[i][0]] = sha(el.outerHTML); });
if (process.argv.includes('--print')) { built.forEach((el, i) => console.log(FIXTURE[i][0], got[FIXTURE[i][0]], el.outerHTML)); process.exit(0); }
const changed = Object.keys(PINNED).filter((name) => got[name] !== PINNED[name]);
assert.deepEqual(changed, [], 'legacy blocks render differently than before the Library change (run with --print to see the HTML):\n  ' +
  changed.map((name) => name + ' ' + got[name]).join('\n  '));
console.log('PASS: every legacy RBLOCK_*_V1 / RBLOCK_CAPTURED_V1 master is still accepted, never rewritten, and renders byte-identically (' + FIXTURE.length + ' fixtures).');
