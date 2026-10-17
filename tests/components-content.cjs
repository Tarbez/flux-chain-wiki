const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = vm.createContext({});
vm.runInContext(fs.readFileSync('js/content/components.js', 'utf8'), context);
const ArkComponents = vm.runInContext('ArkComponents', context);

/* ---- sanitize: whitelist/clamp, the same discipline ArkLayout.sanitize() applies ---- */
let draft = ArkComponents.sanitize({ version: 1, masters: {}, routes: {} });
assert.deepEqual(draft, { version: 1, masters: {}, routes: {} }, 'an empty draft sanitizes to the empty default shape');

assert.deepEqual(
  ArkComponents.sanitize({ masters: { bad: { resolver: 'RBLOCK_NOT_REAL', props: {} } } }).masters,
  {}, 'a master naming an unregistered resolver is dropped, never written as an invented resolver id');

assert.deepEqual(
  ArkComponents.sanitize({ masters: { m1: { resolver: 'RBLOCK_TEXT_V1', props: { heading: 'Hi', notARealProp: 'x' }, label: 'Intro' } } }).masters,
  { m1: { resolver: 'RBLOCK_TEXT_V1', props: { heading: 'Hi' }, label: 'Intro' } },
  'a prop name outside the resolver\'s own declared props is dropped silently');

assert.deepEqual(
  ArkComponents.sanitize({ routes: { 'not-a-route': { main: [] } } }).routes, {},
  'a route key must start with / (the same keying ArkLayout.routes already uses)');

draft = ArkComponents.sanitize({
  masters: { m1: { resolver: 'RBLOCK_TEXT_V1', props: { heading: 'Hi' }, label: 'Intro' } },
  routes: { '/about': { main: [{ key: 'i1', masterId: 'm1', overrides: { heading: 'Override', ghost: 'drop-me' } }, { key: 'i2', masterId: 'missing-master' }] } }
});
assert.deepEqual(draft.routes['/about'].main, [{ key: 'i1', masterId: 'm1', overrides: { heading: 'Override' } }],
  'an instance pointing at a real master keeps only its resolver\'s own override keys; an instance pointing at no master is dropped entirely');

/* ---- mutators: pure, draft-in draft-out, exactly like ArkLayout.set/group/ungroup ---- */
let v = ArkComponents.sanitize({ version: 1, masters: {}, routes: {} });
v = ArkComponents.createMaster(v, 'm1', 'RBLOCK_TEXT_V1', { heading: 'Hello', body: 'World' }, 'Intro block');
assert.deepEqual(v.masters.m1, { resolver: 'RBLOCK_TEXT_V1', props: { heading: 'Hello', body: 'World' }, label: 'Intro block' }, 'createMaster writes a clean master');
assert.deepEqual(ArkComponents.createMaster(v, 'm2', 'RBLOCK_NOT_REAL', {}, 'x').masters.m2, undefined, 'createMaster refuses an unregistered resolver');

v = ArkComponents.insertInstance(v, '/about', 'main', 'i1', 'm1');
assert.deepEqual(v.routes['/about'].main, [{ key: 'i1', masterId: 'm1', overrides: {} }], 'insertInstance appends a thin pointer, not a content copy');
assert.deepEqual(ArkComponents.insertInstance(v, '/about', 'main', 'i2', 'ghost-master').routes['/about'].main.length, 1, 'insertInstance refuses an unknown masterId');

v = ArkComponents.setOverride(v, '/about', 'main', 'i1', 'heading', 'Changed heading');
assert.deepEqual(v.routes['/about'].main[0].overrides, { heading: 'Changed heading' }, 'setOverride writes one override without touching the master');
v = ArkComponents.setOverride(v, '/about', 'main', 'i1', 'heading', null);
assert.deepEqual(v.routes['/about'].main[0].overrides, {}, 'setting an override to null/undefined resets it back to the master\'s own value');

v = ArkComponents.updateMaster(v, 'm1', { label: 'Renamed', props: { heading: 'New heading', body: 'New body' } });
assert.deepEqual(v.masters.m1, { resolver: 'RBLOCK_TEXT_V1', props: { heading: 'New heading', body: 'New body' }, label: 'Renamed' },
  'updateMaster replaces the master\'s own label/props; every instance sees the change on its next render, by construction -- there is no separate resync step to get wrong');

v = ArkComponents.insertInstance(v, '/about', 'main', 'i2', 'm1');
assert.equal(v.routes['/about'].main.length, 2, 'a second instance of the same master is independent');
v = ArkComponents.removeInstance(v, '/about', 'main', 'i1');
assert.deepEqual(v.routes['/about'].main.map((item) => item.key), ['i2'], 'removeInstance removes exactly the named instance');
v = ArkComponents.removeInstance(v, '/about', 'main', 'i2');
assert(!v.routes['/about'], 'removing the last instance at an anchor cleans up the now-empty route entry entirely');

/* ---- serialize: the same "generated static file calling .define()" shape as layout-data.js ---- */
assert(ArkComponents.serialize(v).includes('ArkComponents.define('), 'components serialize as a loadable content module');
assert(ArkComponents.serialize(v).startsWith('/*'), 'the generated file opens with an explanatory comment, like every other generated content file');

/* ---- clamping: counts are bounded the same way ArkLayout.sanitize() bounds routes/groups ---- */
const manyMasters = {};
for (let i = 0; i < 310; i++) manyMasters['m' + i] = { resolver: 'RBLOCK_DIVIDER_V1', props: {}, label: 'x' };
assert(Object.keys(ArkComponents.sanitize({ masters: manyMasters }).masters).length <= 300, 'the master count is clamped');

console.log('PASS: reusable component masters/instances sanitize, mutate, and serialize.');
