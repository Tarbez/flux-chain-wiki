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
/* 2026-11-05: twelve hashes re-taken after the type-scale change (owner ruling: every size a --fs-* step,
   laws 78-83). The legacy resolvers' raw px sizes became var(--fs-*); content and structure are unchanged. */
const PINNED = {
  'text-full': 'd4c5078e6c67877236c1ee002228beb8954df95caca8415e2abc8253403eed96',
  'text-center-h3': '4d398b9549f889700622bf401fbc54e738bd54bf386b58768b586125755c5d03',
  'text-heading-only': '9cfbe27aec078a0605d3a48a23db5402c6b07683aa60b4a169d8f23f1612f6ce',
  'text-body-only': 'f5a4acf44ea02a9e792f45f6edc26c2daac3f73a383c079ebf9b439b22363395',
  'text-empty': '1d5075192b37e428d0a06e5745266c34b70df71df74f2204baf5561f02f124c5',
  'cta-route': '9478ba66164443018a47eafd2823130207cc1f9d05417142b58d11d29e10d50a',
  'cta-secondary-url': 'a4d872f2c95ba6036bb8dc18a6e26305251dafc618add41852ab71c44bfcb10c',
  'cta-doc': '8f9e9248ddaab5e6a577cb8b37884e27dcbc6a9360d8eb7d7ba8f6af8fd6e728',
  'cta-empty': '3f39babd1ca44aa0a01fe8e449584d2be623920912e48ddf78a67ee27d639f9e',
  'image-captioned': '8037faf6169a90f2626cf8bd216be09e25f12399a42e0c0acecc2b14ccd0279c',
  'image-bare': '3c01769522a7c7fe137c91fc42f6e01cdb95c34d89d8f7a9cf623d989abf8c47',
  'card-icon': 'e58f38c26c35bd741e2e316efd266febca589a7770ba8b78d7fad309cc3f2d08',
  'card-plain': '76eb4eee448d8abb66a699884595a31f752f41f44c336d118ab00fcefc904015',
  'quote-attributed': '664a00c6a7898148b9e385a383f0d1c5c49a0b73355ac2a7fb8700bbe6f70f87',
  'quote-bare': '71ab17738baef6332c08d99ebb60e2ee8bdce8e55599660132ca74d5e5728351',
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
