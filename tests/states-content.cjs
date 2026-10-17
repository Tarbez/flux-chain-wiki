const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = vm.createContext({});
vm.runInContext(fs.readFileSync('js/content/states.js', 'utf8'), context);
const ArkStates = vm.runInContext('ArkStates', context);

/* ---- sanitize: whitelist/clamp, the same discipline ArkLayout/ArkComponents apply ---- */
let draft = ArkStates.sanitize({ version: 1, routes: {} });
assert.deepEqual(draft, { version: 1, routes: {} }, 'an empty draft sanitizes to the empty default shape');

assert.deepEqual(
  ArkStates.sanitize({ routes: { 'not-a-route': {} } }).routes, {},
  'a route key must start with / (the same keying ArkLayout.routes/ArkComponents.routes already use)');

assert.deepEqual(
  ArkStates.sanitize({ routes: { '/x': { g1: { trigger: 'self', current: 0, states: [{ label: 'Default', members: [] }] } } } }).routes, {},
  'a group whose state-0 has no real members is meaningless and is dropped entirely');

draft = ArkStates.sanitize({ routes: { '/x': {
  g1: { trigger: 'self', current: 0, states: [{ label: 'Default', members: ['a', 'a', 'b'] }, { label: 'Two' }] },
  'bad id!': { trigger: 'self', current: 0, states: [{ label: 'Default', members: ['a'] }] }
} } });
assert.deepEqual(draft.routes['/x'].g1.states[0].members, ['a', 'b'], 'state-0 members are de-duplicated');
assert.equal(draft.routes['/x'].g1.states.length, 2, 'a second, content-only state keeps only its label');
assert.deepEqual(draft.routes['/x'].g1.states[1], { label: 'Two', members: [] }, 'a state after 0 carries no member keys -- its content lives in ArkComponents, addressed by anchorId()');
assert(!draft.routes['/x']['bad id!'], 'a group id outside the ID pattern is dropped, never written as an invented id');

assert.equal(
  ArkStates.sanitize({ routes: { '/x': { g1: { trigger: 'self', current: 99, states: [{ label: 'D', members: ['a'] }, { label: 'B' }] } } } }).routes['/x'].g1.current,
  0, 'an out-of-range current clamps back to 0 rather than pointing at nothing');

assert.equal(
  ArkStates.sanitize({ routes: { '/x': { g1: { trigger: 'nonsense but a string', current: 0, states: [{ label: 'D', members: ['a'] }] } } } }).routes['/x'].g1.trigger,
  'nonsense but a string', 'any non-empty string is accepted as an explicit trigger element key');

/* ---- mutators: pure, draft-in draft-out, exactly like ArkLayout.set/group/ungroup ---- */
let v = ArkStates.sanitize({ version: 1, routes: {} });
v = ArkStates.createStateGroup(v, '/about', 'g1', ['keyA', 'keyB'], 'self');
assert.deepEqual(v.routes['/about'].g1, { trigger: 'self', current: 0, states: [{ label: 'Default', members: ['keyA', 'keyB'] }] }, 'createStateGroup writes state 0 with the given members, current 0');
assert.deepEqual(ArkStates.createStateGroup(v, '/about', 'g2', [], 'self').routes['/about'].g2, undefined, 'createStateGroup refuses an empty member list');
assert.deepEqual(ArkStates.createStateGroup(v, 'not-a-route', 'g2', ['x'], 'self').routes['not-a-route'], undefined, 'createStateGroup refuses a bad route');

v = ArkStates.addState(v, '/about', 'g1', 'Headline + CTA');
assert.equal(v.routes['/about'].g1.states.length, 2, 'addState appends one state slot');
assert.deepEqual(v.routes['/about'].g1.states[1], { label: 'Headline + CTA', members: [] }, 'the new state carries only a label; its real content is an ArkComponents anchor, not stored here');

v = ArkStates.addState(v, '/about', 'g1', 'Third');
assert.equal(v.routes['/about'].g1.states.length, 3, 'a group can hold more than two states');

assert.deepEqual(ArkStates.removeState(v, '/about', 'g1', 0), v, 'removeState refuses to remove state 0 -- it is the real original content, never deletable');

v = ArkStates.setCurrent(v, '/about', 'g1', 2);
assert.equal(v.routes['/about'].g1.current, 2, 'setCurrent moves to a valid index');
assert.equal(ArkStates.setCurrent(v, '/about', 'g1', 99).routes['/about'].g1.current, 2, 'setCurrent clamps an out-of-range index to the last real state');

v = ArkStates.removeState(v, '/about', 'g1', 1);
assert.equal(v.routes['/about'].g1.states.length, 2, 'removeState removes exactly the named state');
assert.equal(v.routes['/about'].g1.states[1].label, 'Third', 'the remaining states keep their relative order');
assert.equal(v.routes['/about'].g1.current, 1, 'current shifts down by one when a state before it is removed, so it still points at the same logical state');

v = ArkStates.setCurrent(v, '/about', 'g1', 1);
v = ArkStates.removeState(v, '/about', 'g1', 1);
assert.equal(v.routes['/about'].g1.current, 0, 'removing the exact state that was current falls back to state 0, never an invalid index');

v = ArkStates.setTrigger(v, '/about', 'g1', 'keyA');
assert.equal(v.routes['/about'].g1.trigger, 'keyA', 'setTrigger writes an explicit element key');
v = ArkStates.setTrigger(v, '/about', 'g1', 'self');
assert.equal(v.routes['/about'].g1.trigger, 'self', 'setTrigger can switch back to self');

/* ---- advance: the one real-visitor mutation ---- */
v = ArkStates.addState(v, '/about', 'g1', 'B');
v = ArkStates.addState(v, '/about', 'g1', 'C');
assert.equal(v.routes['/about'].g1.states.length, 3, '3 states ready for a wrap test');
assert.equal(v.routes['/about'].g1.current, 0);
v = ArkStates.advance(v, '/about', 'g1'); assert.equal(v.routes['/about'].g1.current, 1, 'advance moves to the next state');
v = ArkStates.advance(v, '/about', 'g1'); assert.equal(v.routes['/about'].g1.current, 2, 'advance moves to the next state again');
v = ArkStates.advance(v, '/about', 'g1'); assert.equal(v.routes['/about'].g1.current, 0, 'advance wraps back to state 0 after the last state');

let single = ArkStates.createStateGroup(ArkStates.sanitize({}), '/x', 'g9', ['a'], 'self');
assert.deepEqual(ArkStates.advance(single, '/x', 'g9'), single, 'advance is a safe no-op on a group with only one state -- nothing to cycle to');

v = ArkStates.removeGroup(v, '/about', 'g1');
assert(!v.routes['/about'], 'removeGroup removes the whole group and cleans up the now-empty route entry');

/* ---- anchorId: the deterministic key into ArkComponents's own storage ---- */
assert.equal(ArkStates.anchorId('g1', 1), 'state-g1-1', 'anchorId is deterministic from groupId + index, using only characters ArkComponents\'s own anchor-id validation accepts');

/* ---- serialize: the same "generated static file calling .define()" shape ---- */
const serialized = ArkStates.serialize(ArkStates.sanitize({}));
assert(serialized.includes('ArkStates.define('), 'states serialize as a loadable content module');
assert(serialized.startsWith('/*'), 'the generated file opens with an explanatory comment, like every other generated content file');

/* ---- clamping: counts are bounded the same way ArkLayout/ArkComponents bound theirs ---- */
let manyGroups = {};
for (let i = 0; i < 210; i++) manyGroups['g' + i] = { trigger: 'self', current: 0, states: [{ label: 'D', members: ['a'] }] };
assert(Object.keys(ArkStates.sanitize({ routes: { '/x': manyGroups } }).routes['/x']).length <= 200, 'the group count per route is clamped');

let manyStates = [{ label: 'D', members: ['a'] }];
for (let i = 0; i < 25; i++) manyStates.push({ label: 'S' + i });
assert(ArkStates.sanitize({ routes: { '/x': { g1: { trigger: 'self', current: 0, states: manyStates } } } }).routes['/x'].g1.states.length <= 20, 'the state count per group is clamped');

console.log('PASS: layered-state groups sanitize, mutate, and serialize.');
