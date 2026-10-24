/* ArkWorld (js/content/world.js): the 3D world's editable settings, stored as FLX.
   What this pins, and why each case exists:
   - The data file the site loads is exactly what serialize(defaults()) writes, so a hand edit or a
     drifted default is caught (the CMS writes the same bytes).
   - The stored form is FLX records, never a JSON object (workspace law: stored state is FLX). A JSON
     object hiding inside the JS call would pass a "loads fine" check, so the records are checked.
   - The round trip is exact: decoding what encode wrote and encoding again gives the same records.
     An inexact round trip would rewrite the file on every Save with nothing changed.
   - sanitize clamps every knob to its schema, keeps only real view overrides, and drops routes that are
     not routes. An unclamped CMS value could put the camera inside the floor.
   - knobs() is derived from SCHEMA, so the CMS panel cannot drift from what the world reads. */
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const context = vm.createContext({ console, TextEncoder, TextDecoder });
vm.runInContext(fs.readFileSync('js/vendor/flx-state-grammar.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/content/world.js', 'utf8'), context);
const W = vm.runInContext('ArkWorld', context);
const plain = (x) => JSON.parse(JSON.stringify(x));   /* compare across the vm realm by value */

// 1. the data file is the serializer's own output for the defaults
assert.equal(fs.readFileSync('js/content/world-data.js', 'utf8'), W.serialize(W.defaults()), 'js/content/world-data.js is serialize(defaults()) byte for byte; regenerate it from the module, never by hand');

// 2. it loads, and what it defines is the defaults
vm.runInContext(fs.readFileSync('js/content/world-data.js', 'utf8'), context);
assert.deepEqual(plain(W.get()), plain(W.defaults()), 'loading world-data.js defines exactly the defaults');

// 3. the stored text is FLX records, one leaf each, not a JSON object
const text = W.encode(W.defaults());
assert.ok(!/[{}"]/.test(text), 'the stored form has no JSON braces or quotes: it is FLX records');
text.trim().split('\n').forEach((line) => assert.match(line, /^(?:[KI][0-9a-f]*-)+(?:S[0-9a-f]*|N[0-9a-f]+|B[01]|Z0|O0|A0)$/, 'each record is path boxes then one typed value box: ' + line));

// 4. exact round trip, also for a busy value with views and exits
const busy = W.sanitize({ look: { exposure: 1.4, keyX: -12.5 }, motion: { flight: 2100 }, story: { on: false },
  views: { '/': { elev: 38, aimX: 1.25 }, '/chain': { dist: 44 } }, exits: { '/intro': { words: 'zoom' }, '/chain': { words: 'side' } } });
assert.equal(W.encode(W.decode(W.encode(busy))), W.encode(busy), 'decode then encode gives the same records');
assert.deepEqual(plain(W.decode(W.encode(busy))), plain(busy), 'decode(encode(x)) is x');

// 5. clamping and cleaning
const odd = W.sanitize({ look: { exposure: 99, contrast: -3, keyX: 'abc' }, story: { on: 'yes' },
  views: { '/': { elev: 200, dist: '', tilt: null }, 'javascript:alert(1)': { elev: 10 }, '/empty': {} }, exits: { '/x': { words: 'spin' } } });
assert.equal(odd.look.exposure, W.SCHEMA.look.exposure[1], 'a number above its range is clamped to the max');
assert.equal(odd.look.contrast, W.SCHEMA.look.contrast[0], 'a number below its range is clamped to the min');
assert.equal(odd.look.keyX, W.SCHEMA.look.keyX[2], 'a non-number falls back to the default');
assert.equal(odd.story.on, true, 'a toggle accepts only true or false');
assert.deepEqual(plain(odd.views), { '/': { elev: 89 } }, 'a view keeps only real overrides, clamped; a non-route and an empty view are dropped');
assert.deepEqual(plain(odd.exits), {}, 'an unknown exit choice falls back to the default, and a default exit is not stored');

// 6. the CMS panel's rows are the schema
const rows = W.knobs();
const count = Object.keys(W.SCHEMA).reduce((n, g) => n + Object.keys(W.SCHEMA[g]).length, 0);
assert.equal(rows.length, count, 'knobs() has one row per schema entry');
assert.ok(rows.every((r) => r.label && r.group && r.key), 'every row has a label, a group and a key');

// 7. a change reaches the world: define() calls its listeners with the new value
let seen = null; const stop = W.onChange((v) => { seen = v; });
W.define({ look: { exposure: 0.9 } });
assert.equal(seen && seen.look.exposure, 0.9, 'onChange listeners get the defined value');
stop(); W.define(W.defaults());
console.log('world-content: ok (' + rows.length + ' knobs, ' + text.trim().split('\n').length + ' FLX records in the defaults)');
