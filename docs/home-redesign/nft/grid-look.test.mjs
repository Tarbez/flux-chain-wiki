/* Regression cases for js/nft/grid-look.js (docs/home-redesign/GRID-LOOK.md). Run: node grid-look.test.mjs
   Each case names the reason it exists: the wrong version looked right until it was measured. */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NFT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'js', 'nft');
globalThis.window = globalThis;
globalThis.document = { currentScript: null };
const require = createRequire(import.meta.url);
for (const f of ['skin-bundle.js', 'cards-data.js', 'traits.js', 'grid-look.js']) require(join(NFT, f));
const T = globalThis.DEFXN_TRAITS, G = globalThis.DefxnGridLook;

let failed = 0;
function check(name, why, ok, detail) {
  console.log((ok ? 'pass  ' : 'FAIL  ') + name + (ok ? '' : '\n      why it exists: ' + why + '\n      got: ' + detail));
  if (!ok) failed++;
}
const wear = (n, skin) => { const r = T.sampleRecord(n); if (skin) r.skin = skin; return G.derive(T.pick(r)); };

// the samples the site reviews (009 is never a sample: it carries a .eth name)
const s263 = wear(263, 'palette:Copper|aura:Orbit|corner:Bevel');

check('the same card gives the same grid', 'the look is a pure function: a page that re-derives it must get the same grid',
  JSON.stringify(wear(263, 'palette:Copper|aura:Orbit|corner:Bevel')) === JSON.stringify(s263), 'two derivations differ');

const mono = wear(40, 'palette:Mono');
check('a Mono card gives vivid 0.2', 'a grey palette must not paint the grid in colour (GRID-LOOK.md, regression 1)',
  mono.params.vivid === 0.2, JSON.stringify(mono.params.vivid));

const ember = wear(41, 'palette:Ember');
check('an Ember card sends its accent\'s own edge hue', 'the ring kit, not the recipe, moves the edge out of the ember band; a recipe that clamped too would move it twice',
  ember.params.edgeHue === 10, JSON.stringify(ember.params.edgeHue));

const bare = wear(42, 'particles:None');
check('a card with no particles gives particles 0', 'a layer that builds nothing must show nothing, not a default (GRID-LOOK.md, regression 3)',
  bare.params.particles === 0, JSON.stringify(bare.params.particles));

const amber = wear(43, 'palette:Amber');
check('Amber\'s one-hue spread stays warm', 'the fixed +28 put light B at yellow-green 66; the spread now follows the accent, which leans red',
  amber.params.lightBHue === 10 && amber.params.lightCHue === 24, `B ${amber.params.lightBHue}, C ${amber.params.lightCHue}, ${amber.why.spread}`);

check('no card sets kindTint', 'a cube\'s kind colour is meaning; a card never reaches it',
  ![s263, mono, ember, bare, amber].some((x) => 'kindTint' in x.params), 'kindTint present');

// a layer without a census leaves its knobs at the site's value, and says so
const t = T.pick(T.sampleRecord(44)), picks = Object.assign({}, t.picks);
picks.signal = Object.assign({}, picks.signal); delete picks.signal.census;
const gap = G.derive(Object.assign({}, t, { picks }));
check('a missing census is left out, never read as 0', 'zero means measured and empty; a census not yet run is absent (workspace law)',
  !('edgeGlow' in gap.params) && !('detail' in gap.params) && gap.notes.some((n) => /signal/.test(n)), JSON.stringify({ params: Object.keys(gap.params), notes: gap.notes }));

// the texture tie: two scores within 0.05 resolve by the card's own layer order
const tie = { picks: { palette: { attrs: { a: '0 0% 100%', b: '200 80% 60%', c: '260 80% 60%' } },
  backdrop: { name: 'B', census: { cubes: 0, glass: 0, pts: 0, thin: 300 } }, aura: { name: 'A', census: { cubes: 0, glass: 0, pts: 0, thin: 0 } },
  mark: { name: 'M', census: { cubes: 500, glass: 0, pts: 0, thin: 0 } }, signal: { name: 'S', census: { cubes: 0, glass: 0, pts: 0, thin: 0 } },
  particles: { name: 'P', census: { cubes: 0, glass: 0, pts: 2700, thin: 0 } } } };
const tl = G.derive(tie);
check('a texture tie resolves by layer order and says so', 'card 27 scored dots 0.79 and scan 0.75: a thin margin must not flip on a rounding change',
  tl.params.texture === 'scan' && /within 0.05/.test(tl.why.tie || ''), JSON.stringify({ texture: tl.params.texture, why: tl.why }));

console.log(failed ? `${failed} failed` : 'all passed');
process.exit(failed ? 1 : 0);
