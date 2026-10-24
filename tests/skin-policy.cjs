'use strict';
/* ArkSkinPolicy (js/content/skin-policy.js): the skin policy the CMS Skin lab edits. It is content, not code: which
   rules a card skin may put on which part of the site, and the extra contrast floors a skin is held to.
   Why each case exists is written beside it. The family of defect: a policy value the site's skin code would
   refuse (an unknown rule, a lower-case part, a bad token) must never reach DefxnSkinParts.policy(), and an
   empty policy must change nothing. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const P = require('../js/content/skin-policy.js');
const Parts = require('../js/ark/skin-parts.js');
const F = require('../js/vendor/flx-state-grammar.js');
const clone = (v) => JSON.parse(JSON.stringify(v));
const mentions = (list, ...words) => list.some((p) => words.every((w) => p.sentence.includes(w)));

/* ---- sanitize: what is kept ---- */
assert.deepEqual(P.defaults(), { version: 1, allow: {}, families: {}, contrast: [] }, 'the default policy is empty: the site behaves as the code defaults say');
assert.deepEqual(P.sanitize(undefined), P.defaults(), 'no input is the empty policy (a missing draft must not throw)');
assert.deepEqual(P.sanitize('CARD'), P.defaults(), 'a string is not a policy: it is the empty policy, never a half-read one');
assert.deepEqual(P.RULES, ['frame', 'edge', 'ornament', 'density', 'marker', 'header', 'layout'], 'the seven rule keys of docs/home-redesign/SKIN-CONTRACT.md, section 3, in its order');

const good = P.sanitize({ allow: { 'PRIMARY|BUTTON': ['edge'], MEGAMENUPANEL: ['frame', 'edge'], CARD: [] }, families: { Arcade: { allow: { CARD: ['frame'] } } },
  contrast: [{ fg: ['--text-faint'], bg: ['--canvas', '--surface'], min: 7 }] });
assert.deepEqual(clone(good.allow), { CARD: [], MEGAMENUPANEL: ['frame', 'edge'], 'PRIMARY|BUTTON': ['edge'] }, 'an upper-case schema key, with a | for a variant, is a part; an empty list is kept (it means "no rule on this part")');
assert.deepEqual(clone(good.families), { Arcade: { allow: { CARD: ['frame'] } } }, 'a family keeps its own allow map');
assert.deepEqual(clone(good.contrast), [{ fg: ['--text-faint'], bg: ['--canvas', '--surface'], min: 7 }], 'a contrast rule keeps tokens and a ratio');

/* ---- sanitize: what is refused, each with the reason it exists ---- */
// a rule the contract does not have would be dropped by Ark UI at apply time; the CMS must not store it
assert.deepEqual(clone(P.sanitize({ allow: { CARD: ['frame', 'shadow', 'Edge'] } }).allow), { CARD: ['frame'] }, 'unknown rule keys are dropped, and case matters (Edge is not edge)');
// lower-case keys are Ark UI's own primitive names (button, card, popover); the site policy keys the schema's upper-case parts
assert.deepEqual(P.sanitize({ allow: { card: ['frame'], Card: ['frame'], 'CARD|': ['frame'], '|CARD': ['frame'], 'CARD-X': ['frame'], '': ['frame'], 'CARD X': ['frame'] } }).allow, {}, 'part keys that are not upper-case schema keys are dropped');
// a token written without the leading -- or with upper case would never match a CSS custom property
assert.deepEqual(P.sanitize({ contrast: [{ fg: ['text-faint'], bg: ['--canvas'], min: 4.5 }] }).contrast, [], 'a token without -- is refused, and a rule with no valid fg is dropped whole');
assert.deepEqual(P.sanitize({ contrast: [{ fg: ['--Text'], bg: ['--canvas'], min: 4.5 }, { fg: ['--text_faint'], bg: ['--canvas'], min: 4.5 }, { fg: ['--text faint'], bg: ['--canvas'], min: 4.5 }] }).contrast, [], 'upper case, underscore and space are not token characters');
assert.deepEqual(clone(P.sanitize({ contrast: [{ fg: ['--text', 'bad', '--text'], bg: ['--canvas'], min: 4.5 }] }).contrast), [{ fg: ['--text'], bg: ['--canvas'], min: 4.5 }], 'a bad token is dropped from a list that still has a good one, and a repeat is kept once');
// Ark UI's applyArkSkin refuses a ratio outside 1..21 for the whole skin, so one bad rule would take every skin down
[0.5, 0, -3, 21.01, 22, 100, NaN, Infinity, 'x', '4.5x', null, undefined, {}].forEach((min) => {
  assert.deepEqual(P.sanitize({ contrast: [{ fg: ['--text'], bg: ['--canvas'], min }] }).contrast, [], 'a contrast min of ' + String(min) + ' is outside 1..21 and the rule is dropped');
});
[1, 21, 4.5, '4.5'].forEach((min) => assert.equal(P.sanitize({ contrast: [{ fg: ['--text'], bg: ['--canvas'], min }] }).contrast.length, 1, 'a contrast min of ' + min + ' is inside 1..21 and kept'));
assert.equal(P.sanitize({ contrast: [{ fg: ['--text'], bg: ['--canvas'], min: 4.567 }] }).contrast[0].min, 4.57, 'a ratio is held to two decimals so the FLX number text stays short');
// a family with nothing in it says nothing: it must not survive as an empty shell the CMS shows as a change
assert.deepEqual(P.sanitize({ families: { Arcade: { allow: {} }, Neon: {}, Bad: 4 } }).families, {}, 'a family with no allow entry is dropped');
assert.deepEqual(P.sanitize({ families: { '': { allow: { CARD: [] } }, '<b>': { allow: { CARD: [] } }, ['x'.repeat(41)]: { allow: { CARD: [] } } } }).families, {}, 'a family name that is empty, has markup characters or is over 40 characters is dropped');
// shapes that are not what they say: never throw, never half-read
['a', 1, null, [], true].forEach((v) => {
  assert.deepEqual(P.sanitize({ allow: v, families: v, contrast: v }), P.defaults(), 'allow, families and contrast given as ' + JSON.stringify(v) + ' read as empty');
});
assert.deepEqual(clone(P.sanitize({ allow: { CARD: 'frame' } }).allow), { CARD: [] }, 'a rule list given as a string reads as no rule (and problems() says so)');

/* ---- sanitize: one canonical shape, so the saved bytes do not depend on who typed it ---- */
assert.equal(JSON.stringify(P.sanitize({ allow: { PANEL: ['header', 'frame', 'frame'], CARD: ['edge', 'frame'] } })), JSON.stringify(P.sanitize({ allow: { CARD: ['frame', 'edge'], PANEL: ['frame', 'header'] } })), 'rules sit in the contract\'s order, once, and parts sorted: the same policy always serializes the same');
assert.equal(JSON.stringify(P.sanitize(P.sanitize(good))), JSON.stringify(good), 'sanitize is idempotent');

/* ---- problems: a refusal names what is wrong and what would fix it ---- */
assert.deepEqual(P.problems(good), [], 'a well formed policy has no problems');
assert.deepEqual(P.problems(undefined), [], 'no policy is not a problem');
const bad = P.problems({ allow: { CARD: ['shadow'], card: ['frame'], PANEL: 'frame' }, families: { '<b>': { allow: { CARD: [] } } },
  contrast: [{ fg: ['text'], bg: ['--canvas'], min: 4.5 }, { fg: ['--text'], bg: ['--canvas'], min: 30 }, 'x'] });
assert(mentions(bad, 'shadow', 'Use one of', 'frame'), 'an unknown rule is named, and the closed set that would fix it is listed');
assert(mentions(bad, '"card"', 'upper case'), 'a lower-case part is named, and the fix (the part in upper case with no hyphen, the site\'s one spelling) is said');
assert(mentions(bad, 'allow.PANEL', 'list of rule keys'), 'a rule list that is not a list says what it must be');
assert(mentions(bad, '<b>', 'letters, digits'), 'a bad family name is named, with what a family name may use');
assert(mentions(bad, '"text"', 'starts with --'), 'a bad token is named, with how a token is written');
assert(mentions(bad, '30', '1 to 21'), 'a ratio out of range is named, with the range');
assert(mentions(bad, 'contrast[2]', 'fg, bg and min'), 'a rule that is not an object says which one and what it needs');
bad.forEach((p) => assert(p.path !== undefined && p.sentence.length > 25, 'every problem has a path and a full sentence: ' + JSON.stringify(p)));
assert.equal(P.problems('x').length, 1, 'a policy that is not an object is one problem');

/* ---- FLX: stored state, exact against JSON.stringify ---- */
const rich = P.sanitize({ allow: { CARD: ['frame', 'edge'], 'PRIMARY|BUTTON': [], MEGAMENUPANEL: ['frame', 'edge', 'ornament'] },
  families: { Arcade: { allow: { CARD: ['frame'], PANEL: ['edge', 'header'] } }, 'Neon Grid': { allow: { LIST: ['marker'] } } },
  contrast: [{ fg: ['--text-faint', '--text-muted'], bg: ['--canvas'], min: 4.5 }, { fg: ['--text'], bg: ['--surface'], min: 7.25 }] });
[P.defaults(), good, rich].forEach((value, i) => {
  const text = P.encode(value);
  assert(!/^\s*[{[]/.test(text), 'the stored text is FLX records, never a JSON object (workspace law: stored state is FLX), case ' + i);
  assert.equal(JSON.stringify(P.decode(text)), JSON.stringify(value), 'the FLX round trip re-serializes byte-identically under JSON.stringify (the hashing form), case ' + i);
  assert.equal(JSON.stringify(F.decodeState(text)), JSON.stringify(value), 'the grammar alone reads the same value, case ' + i);
  assert.equal(P.encode(P.decode(text)), text, 'decode then encode returns the same records, case ' + i);
});
assert.notEqual(JSON.stringify(rich), JSON.stringify(P.defaults()), 'the fixture is not the empty policy (an empty round trip proves little)');
// "-" is the grammar's one delimiter: free text enters as hex, so a part key with | and a family with a space and - survive
assert.deepEqual(clone(P.decode(P.encode({ allow: { 'PRIMARY|BUTTON': ['edge'] }, families: { 'Neon-Grid x': { allow: { CARD: [] } } } }))), { version: 1, allow: { 'PRIMARY|BUTTON': ['edge'] }, families: { 'Neon-Grid x': { allow: { CARD: [] } } }, contrast: [] }, 'keys with | - and a space come back exactly');

/* ---- the file text, and define() reading it back ---- */
const text = P.serialize(rich);
assert(/ArkSkinPolicy\.define\("[^"]*"\);\n$/.test(text), 'the file text is one define() call holding one string');
const box = vm.createContext({ TextEncoder, TextDecoder });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/vendor/flx-state-grammar.js'), 'utf8'), box);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/content/skin-policy.js'), 'utf8'), box);
assert.deepEqual(clone(vm.runInContext('ArkSkinPolicy.get()', box)), P.defaults(), 'before a data file loads, the policy is empty');
vm.runInContext(text, box);
assert.equal(JSON.stringify(vm.runInContext('ArkSkinPolicy.get()', box)), JSON.stringify(rich), 'what serialize wrote reads back as the same policy');
assert.equal(P.serialize(rich), P.serialize(clone(rich)), 'the same policy always writes the same bytes');
assert.equal(fs.readFileSync(path.join(ROOT, 'js/content/skin-policy-data.js'), 'utf8'), P.serialize(P.defaults()), 'the published policy starts empty, written the same way, so the site behaves exactly as before');

/* define/get/onChange */
const heard = [];
const stop = P.onChange((v) => heard.push(v));
P.define({ allow: { CARD: ['edge'] } });
assert.deepEqual(clone(P.get().allow), { CARD: ['edge'] }, 'define takes a plain value (the CMS preview)');
assert.equal(heard.length, 1, 'and tells a listener');
P.get().allow.CARD.push('frame');
assert.deepEqual(clone(P.get().allow), { CARD: ['edge'] }, 'get returns a copy: nobody edits the held policy by editing what they were given');
P.define(P.encode({ allow: { PANEL: ['frame'] } }));
assert.deepEqual(clone(P.get().allow), { PANEL: ['frame'] }, 'define takes FLX text too (the data file)');
stop(); P.define({});
assert.equal(heard.length, 2, 'a stopped listener hears nothing more');

/* ---- the site's side: DefxnSkinParts.policy() ---- */
const codeOnly = Parts.policy(null, null);
assert.deepEqual(Parts.policy(P.defaults(), null), codeOnly, 'an empty policy leaves DefxnSkinParts.policy(...) equal to the code defaults');
assert.deepEqual(Parts.policy(P.defaults(), 'Arcade'), Parts.policy(null, 'Arcade'), 'and for a card family too');
assert.deepEqual(clone(codeOnly.allow), clone(Parts.ALLOW), 'the code defaults are DefxnSkinParts.ALLOW');
assert.deepEqual(clone(codeOnly.contrast), clone(Parts.CONTRAST), 'and its CONTRAST');
const merged = Parts.policy(rich, 'Arcade');
assert.deepEqual(clone(merged.allow.CARD), ['frame'], 'a family list replaces both the code default and the policy list for that family\'s cards');
assert.deepEqual(clone(Parts.policy(rich, null).allow.CARD), ['frame', 'edge'], 'a policy list replaces the code default');
assert.equal(merged.contrast.length, Parts.CONTRAST.length + 2, 'contrast rules are ADDED to the site\'s own');
assert.deepEqual(clone(merged.contrast.slice(0, Parts.CONTRAST.length)), clone(Parts.CONTRAST), 'and the site\'s own come first and stay');

/* the CMS computes the allow list itself before the canvas answers; it must equal what the site computes */
[null, good, rich, P.sanitize({ allow: { LIST: [], CARD: ['marker'] } })].forEach((policy, i) => {
  [null, 'Arcade', 'Neon Grid', 'Other'].forEach((family) => {
    assert.deepEqual(P.effectiveAllow(Parts.ALLOW, policy, family), clone(Parts.policy(policy ? P.sanitize(policy) : null, family).allow), 'effectiveAllow equals DefxnSkinParts.policy().allow (policy ' + i + ', family ' + family + ')');
  });
});
assert.deepEqual(P.effectiveAllow({ CARD: ['frame'] }, {}, null), { CARD: ['frame'] }, 'it reads the defaults it is given, not a copy of its own');

console.log('PASS: skin-policy: sanitize refuses what the site\'s skin code would refuse, FLX round trip is exact, and an empty policy changes nothing');
